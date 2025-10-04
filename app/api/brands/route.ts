import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Brand from '@/models/Brand';
import Product from '@/models/Product';
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  getPaginationParams,
  createPaginationInfo,
  rateLimit,
  getClientIP,
} from '@/lib/api-helpers';
import { brandValidation, formatValidationErrors } from '@/lib/validations';

// Mark this route as dynamic
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`brands_get_${clientIP}`, 100, 60000);
    
    if (!rateLimitResult.allowed) {
      return createErrorResponse(
        'Too many requests',
        429,
        'Rate limit exceeded'
      );
    }

    const { searchParams } = new URL(request.url);
    const featured = searchParams.get('featured');
    const withProductCount = searchParams.get('productCount') !== 'false';
    const { page, limit, skip } = getPaginationParams(request);

    // Build query for brands
    let brandQuery: any = { isActive: true };
    
    if (featured === 'true') {
      brandQuery.isFeatured = true;
    }

    // Default sort options for brands
    let sortOptions: any;
    if (featured === 'true') {
      sortOptions = { sortOrder: 1, name: 1 };
    } else {
      sortOptions = { name: 1 };
    }

    // Get brands from Brand model
    const brandsFromModel = await Brand.find(brandQuery)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);
    const totalBrands = await Brand.countDocuments(brandQuery);

    // Get all unique brands from products that aren't in the Brand model
    const productBrands = await Product.aggregate([
      { $match: { isActive: true, brand: { $exists: true, $ne: '' } } },
      { $group: { _id: '$brand', productCount: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]) as any[];

    // Create a map of existing brands for quick lookup
    const existingBrandNames = new Set(brandsFromModel.map(b => b.name.toLowerCase()));

    // Filter out brands that already exist in Brand model
    const newBrandsFromProducts = productBrands.filter(
      pb => !existingBrandNames.has(pb._id.toLowerCase())
    );

    // Convert product brands to brand format
    const generatedBrands = newBrandsFromProducts.map(pb => ({
      id: `generated-${pb._id.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name: pb._id,
      slug: pb._id.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-'),
      description: `Products from ${pb._id}`,
      logo: '/placeholder-image.svg',
      isActive: true,
      isFeatured: false,
      productCount: pb.productCount,
      isGenerated: true // Flag to indicate this is auto-generated
    }));

    // Get product counts for brands from model if requested
    let brandsWithCounts: any[] = brandsFromModel;
    if (withProductCount) {
      const brandProductCounts: any[] = [];
      for (const brand of brandsFromModel) {
        const productCount = await Product.countDocuments({
          brand: brand.name,
          isActive: true
        });
        brandProductCounts.push({
          ...brand.toObject(),
          productCount
        });
      }
      brandsWithCounts = brandProductCounts;
    }

    // Format response
    const formattedBrands = brandsWithCounts.map(brand => ({
      id: String(brand._id),
      name: brand.name,
      slug: brand.slug,
      description: brand.description,
      logo: brand.logo || '/placeholder-image.svg',
      website: brand.website,
      isActive: brand.isActive,
      isFeatured: brand.isFeatured,
      productCount: brand.productCount || 0,
      metaTitle: brand.metaTitle,
      metaDescription: brand.metaDescription
    }));

    // Combine managed brands with auto-generated ones if not paginated
    const allBrands = page === 1 && limit >= 100 
      ? [...formattedBrands, ...generatedBrands]
      : formattedBrands;

    // Create pagination info
    const pagination = createPaginationInfo(page, limit, totalBrands);

    return createSuccessResponse({
      brands: allBrands,
      total: allBrands.length,
      managed: formattedBrands.length,
      generated: generatedBrands.length,
      featured: allBrands.filter(b => b.isFeatured).length
    }, 'Brands retrieved successfully', pagination);

  } catch (error) {
    return handleApiError(error, 'GET /api/brands');
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`brands_post_${clientIP}`, 10, 60000);
    
    if (!rateLimitResult.allowed) {
      return createErrorResponse(
        'Too many requests',
        429,
        'Rate limit exceeded'
      );
    }

    const body = await request.json();
    
    // Validate request body using Zod schema
    const validation = brandValidation.create(body);
    if (!validation.isValid) {
      return createErrorResponse(
        'Validation failed',
        400,
        'Invalid brand data',
        formatValidationErrors(validation.errors)
      );
    }

    const brandData = validation.data;
    if (!brandData) {
      return createErrorResponse(
        'Validation failed',
        400,
        'Invalid brand data'
      );
    }

    const {
      name,
      description,
      logo,
      website,
      isFeatured = false,
      sortOrder = 0,
      metaTitle,
      metaDescription
    } = brandData;

    // Check if brand already exists
    const existingBrand = await Brand.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${name}$`, 'i') } },
        { slug: name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-') }
      ]
    });

    if (existingBrand) {
      return createErrorResponse(
        'Brand already exists',
        409,
        'A brand with this name already exists'
      );
    }

    // Create new brand
    const newBrand = new Brand({
      name,
      description,
      logo,
      website,
      isFeatured,
      sortOrder,
      metaTitle: metaTitle || `${name} - Brand Products`,
      metaDescription: metaDescription || `Shop ${name} products. ${description ? description.substring(0, 120) : 'Quality products available.'}`
    });

    await newBrand.save();

    // Get product count
    const productCount = await Product.countDocuments({
      brand: newBrand.name,
      isActive: true
    });

    const response = {
      id: String(newBrand._id),
      name: newBrand.name,
      slug: newBrand.slug,
      description: newBrand.description,
      logo: newBrand.logo,
      website: newBrand.website,
      isActive: newBrand.isActive,
      isFeatured: newBrand.isFeatured,
      sortOrder: newBrand.sortOrder,
      metaTitle: newBrand.metaTitle,
      metaDescription: newBrand.metaDescription,
      productCount,
      createdAt: newBrand.createdAt,
      updatedAt: newBrand.updatedAt
    };

    return createSuccessResponse(
      response,
      'Brand created successfully'
    );

  } catch (error) {
    return handleApiError(error, 'POST /api/brands');
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`brands_put_${clientIP}`, 20, 60000);
    
    if (!rateLimitResult.allowed) {
      return createErrorResponse(
        'Too many requests',
        429,
        'Rate limit exceeded'
      );
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return createErrorResponse(
        'Brand ID is required',
        400,
        'Validation Error'
      );
    }

    // Validate request body using Zod schema
    const validation = brandValidation.update(updateData);
    if (!validation.isValid) {
      return createErrorResponse(
        'Validation failed',
        400,
        'Invalid brand data',
        formatValidationErrors(validation.errors)
      );
    }

    // Find and update brand
    const updatedBrand = await Brand.findByIdAndUpdate(
      id,
      { ...validation.data, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!updatedBrand) {
      return createErrorResponse(
        'Brand not found',
        404,
        'The specified brand does not exist'
      );
    }

    // Get updated product count
    const productCount = await Product.countDocuments({
      brand: updatedBrand.name,
      isActive: true
    });

    const response = {
      id: String(updatedBrand._id),
      name: updatedBrand.name,
      slug: updatedBrand.slug,
      description: updatedBrand.description,
      logo: updatedBrand.logo,
      website: updatedBrand.website,
      isActive: updatedBrand.isActive,
      isFeatured: updatedBrand.isFeatured,
      sortOrder: updatedBrand.sortOrder,
      metaTitle: updatedBrand.metaTitle,
      metaDescription: updatedBrand.metaDescription,
      productCount,
      createdAt: updatedBrand.createdAt,
      updatedAt: updatedBrand.updatedAt
    };

    return createSuccessResponse(
      response,
      'Brand updated successfully'
    );

  } catch (error) {
    return handleApiError(error, 'PUT /api/brands');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`brands_delete_${clientIP}`, 5, 60000);
    
    if (!rateLimitResult.allowed) {
      return createErrorResponse(
        'Too many requests',
        429,
        'Rate limit exceeded'
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return createErrorResponse(
        'Brand ID is required',
        400,
        'Validation Error'
      );
    }

    // Check if brand has products
    const brand = await Brand.findById(id);
    if (!brand) {
      return createErrorResponse(
        'Brand not found',
        404,
        'The specified brand does not exist'
      );
    }

    const productCount = await Product.countDocuments({
      brand: brand.name,
      isActive: true
    });

    if (productCount > 0) {
      // Don't delete, just deactivate
      brand.isActive = false;
      await brand.save();
      
      return createSuccessResponse(
        { deactivated: true, productCount },
        `Brand deactivated instead of deleted because it has ${productCount} active products`
      );
    } else {
      // Safe to delete
      await Brand.findByIdAndDelete(id);
      
      return createSuccessResponse(
        { deleted: true },
        'Brand deleted successfully'
      );
    }

  } catch (error) {
    return handleApiError(error, 'DELETE /api/brands');
  }
}
