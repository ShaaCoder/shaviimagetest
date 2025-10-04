import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Offer from '@/models/Offer';
import Product from '@/models/Product';
import Category from '@/models/Category';
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  getPaginationParams,
  createPaginationInfo,
  rateLimit,
  getClientIP,
} from '@/lib/api-helpers';
import { offerValidation, formatValidationErrors } from '@/lib/validations';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Offers API: Starting request');
    await connectDB();
    console.log('📊 Offers API: Database connected');

    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`offers_get_${clientIP}`, 100, 60000);
    
    if (!rateLimitResult.allowed) {
      return createErrorResponse(
        'Too many requests',
        429,
        'Rate limit exceeded'
      );
    }

    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const brand = searchParams.get('brand');
    const newCustomerOnly = searchParams.get('newCustomerOnly');
    const { page, limit, skip } = getPaginationParams(request);

    // Build query
    let query: any = {};

    // Filter by active status
    if (active === 'true') {
      const now = new Date();
      query = {
        isActive: true,
        startDate: { $lte: now },
        $or: [
          { endDate: { $exists: false } },
          { endDate: { $gte: now } }
        ]
      };
    } else if (active === 'false') {
      query.isActive = false;
    }

    // Filter by type
    if (type) {
      query.type = type;
    }

    // Filter by category
    if (category) {
      query.categories = category;
    }

    // Filter by brand
    if (brand) {
      query.brands = brand;
    }

    // Filter by new customer only
    if (newCustomerOnly === 'true') {
      query.newCustomerOnly = true;
    }

    // Use sequential execution to avoid TypeScript union type complexity
    console.log('📊 Offers API: Executing query:', JSON.stringify(query));
    const offers = await Offer.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean() as any[];
    const totalOffers = await Offer.countDocuments(query);
    console.log(`📊 Offers API: Found ${offers.length} offers`);

    // Get stats with better error handling
    let activeCount = 0;
    let expiredCount = 0;
    let totalCount = 0;
    
    try {
      const [activeResult, expiredResult, totalResult] = await Promise.all([
        (Offer as any).findActive().countDocuments(),
        Offer.countDocuments({ isActive: false }),
        Offer.countDocuments()
      ]);
      activeCount = activeResult;
      expiredCount = expiredResult;
      totalCount = totalResult;
    } catch (statsError) {
      console.error('Error getting offer stats:', statsError);
      // Continue with default values
    }

    // Add virtual fields manually since we're using lean()
    const offersWithVirtuals = (offers as any[]).map((offer: any) => ({
      ...offer,
      id: String(offer._id),
      remainingUsage: offer.usageLimit ? Math.max(0, offer.usageLimit - offer.usageCount) : null,
      usagePercentage: offer.usageLimit ? Math.min(100, (offer.usageCount / offer.usageLimit) * 100) : 0,
      status: getOfferStatus(offer)
    }));

    const pagination = createPaginationInfo(page, limit, totalOffers);

    return createSuccessResponse({
      offers: offersWithVirtuals,
      stats: {
        total: totalCount,
        active: activeCount,
        expired: expiredCount,
        filtered: totalOffers
      }
    }, 'Offers retrieved successfully', pagination);

  } catch (error) {
    console.error('❌ Offers API: Error occurred:', error);
    console.error('❌ Offers API: Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return handleApiError(error, 'GET /api/offers');
  }
}

// Helper function to determine offer status
function getOfferStatus(offer: any): string {
  const now = new Date();
  
  if (!offer.isActive) return 'inactive';
  if (offer.startDate > now) return 'scheduled';
  if (offer.endDate && offer.endDate < now) return 'expired';
  if (offer.usageLimit && offer.usageCount >= offer.usageLimit) return 'exhausted';
  
  return 'active';
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`offers_post_${clientIP}`, 10, 60000);
    
    if (!rateLimitResult.allowed) {
      return createErrorResponse(
        'Too many requests',
        429,
        'Rate limit exceeded'
      );
    }

    const body = await request.json();
    
    // Validate request body using Zod schema
    const validation = offerValidation.create(body);
    if (!validation.isValid) {
      return createErrorResponse(
        'Validation failed',
        400,
        'Invalid offer data',
        formatValidationErrors(validation.errors)
      );
    }

    const offerData = validation.data;
    if (!offerData) {
      return createErrorResponse(
        'Validation failed',
        400,
        'Invalid offer data'
      );
    }

    // Check if offer code already exists
    const existingOffer = await Offer.findOne({
      code: offerData.code.toUpperCase()
    });

    if (existingOffer) {
      return createErrorResponse(
        'Offer code already exists',
        409,
        'An offer with this code already exists'
      );
    }

    // Create new offer
    const newOffer = new Offer({
      ...offerData,
      startDate: offerData.startDate ? new Date(offerData.startDate) : new Date(),
      endDate: offerData.endDate ? new Date(offerData.endDate) : undefined,
    });

    await newOffer.save();

    const response = {
      id: String(newOffer._id),
      title: newOffer.title,
      description: newOffer.description,
      code: newOffer.code,
      type: newOffer.type,
      value: newOffer.value,
      minAmount: newOffer.minAmount,
      maxDiscount: newOffer.maxDiscount,
      isActive: newOffer.isActive,
      startDate: newOffer.startDate,
      endDate: newOffer.endDate,
      categories: newOffer.categories,
      brands: newOffer.brands,
      products: newOffer.products,
      usageLimit: newOffer.usageLimit,
      usageCount: newOffer.usageCount,
      userUsageLimit: newOffer.userUsageLimit,
      newCustomerOnly: newOffer.newCustomerOnly,
      applicableUserRoles: newOffer.applicableUserRoles,
      status: getOfferStatus(newOffer),
      remainingUsage: newOffer.usageLimit ? Math.max(0, newOffer.usageLimit - newOffer.usageCount) : null,
      usagePercentage: newOffer.usageLimit ? Math.min(100, (newOffer.usageCount / newOffer.usageLimit) * 100) : 0,
      createdAt: newOffer.createdAt,
      updatedAt: newOffer.updatedAt
    };

    return createSuccessResponse(
      response,
      'Offer created successfully'
    );

  } catch (error) {
    return handleApiError(error, 'POST /api/offers');
  }
}

// Validate offer code
export async function PATCH(request: NextRequest) {
  try {
    await connectDB();

    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`offers_validate_${clientIP}`, 50, 60000);
    
    if (!rateLimitResult.allowed) {
      return createErrorResponse(
        'Too many requests',
        429,
        'Rate limit exceeded'
      );
    }

    const body = await request.json();
    
    // Validate request body
    const validation = offerValidation.validateCode(body);
    if (!validation.isValid) {
      return createErrorResponse(
        'Validation failed',
        400,
        'Invalid request data',
        formatValidationErrors(validation.errors)
      );
    }

    const validationData = validation.data;
    if (!validationData) {
      return createErrorResponse(
        'Validation failed',
        400,
        'Invalid request data'
      );
    }

    const { code, cartTotal, userId, userEmail, cartItems } = validationData;

    // Find the offer by code
    const offer = await Offer.findOne({ 
      code: code.toUpperCase() 
    });

    if (!offer) {
      return createErrorResponse(
        'Invalid offer code',
        404,
        'The offer code you entered is not valid'
      );
    }

    // Check if offer is valid/active
    if (!(offer as any).isValid()) {
      const status = getOfferStatus(offer);
      let message = 'This offer is not available';
      
      switch (status) {
        case 'inactive':
          message = 'This offer has been deactivated';
          break;
        case 'expired':
          message = 'This offer has expired';
          break;
        case 'scheduled':
          message = 'This offer is not yet active';
          break;
        case 'exhausted':
          message = 'This offer has reached its usage limit';
          break;
      }
      
      return createErrorResponse(
        'Offer not available',
        400,
        message
      );
    }

    // Check minimum amount requirement
    if (cartTotal < offer.minAmount) {
      return createErrorResponse(
        'Minimum amount not met',
        400,
        `Minimum order amount is ₹${offer.minAmount}`
      );
    }

    // Check if it's for new customers only
    if (offer.newCustomerOnly && userId) {
      // Here you would check if the user has placed orders before
      // This is a simplified check - implement based on your order history logic
    }

    // Check category/brand/product restrictions
    if (offer.categories.length > 0 || offer.brands.length > 0 || offer.products.length > 0) {
      // Build a map of productId -> { brand, categorySlug, categoryName }
      let productInfoMap: Record<string, { brand?: string; categorySlug?: string; categoryName?: string }> = {};
      try {
        const ids = cartItems.map((i: any) => i.productId).filter(Boolean);
        if (ids.length > 0) {
          const products = await Product.find({ _id: { $in: ids } }).select('brand category').lean();
          const catIds = products.map((p: any) => p.category).filter(Boolean);
          let categories: any[] = [];
          if (catIds.length > 0) {
            categories = await Category.find({ _id: { $in: catIds } }).select('slug name').lean();
          }
          const catMap: Record<string, { slug?: string; name?: string }> = {};
          categories.forEach((c: any) => { catMap[String(c._id)] = { slug: c.slug, name: c.name }; });
          products.forEach((p: any) => {
            const cat = p.category ? catMap[String(p.category)] || {} : {};
            productInfoMap[String(p._id)] = { brand: p.brand, categorySlug: cat.slug, categoryName: cat.name };
          });
        }
      } catch (_) {
        // If enrichment fails, we will rely on provided fields only
      }

      const hasValidItems = cartItems.some((item: any) => {
        const info = productInfoMap[item.productId] || {};
        // Category check: accept either slug or name
        if (offer.categories.length > 0) {
          const itemCat = item.category || info.categorySlug || info.categoryName;
          if (itemCat && offer.categories.includes(itemCat)) return true;
        }
        // Brand check
        if (offer.brands.length > 0) {
          const itemBrand = item.brand || info.brand;
          if (itemBrand && offer.brands.includes(itemBrand)) return true;
        }
        // Product check
        if (offer.products.length > 0 && offer.products.includes(item.productId)) return true;
        return false;
      });

      if (!hasValidItems) {
        return createErrorResponse(
          'Offer not applicable',
          400,
          'This offer is not applicable to items in your cart'
        );
      }
    }

    // Calculate discount
    const discount = (offer as any).calculateDiscount(cartTotal, cartItems);

    const response = {
      offer: {
        id: String(offer._id),
        title: offer.title,
        description: offer.description,
        code: offer.code,
        type: offer.type,
        value: offer.value,
        minAmount: offer.minAmount,
        maxDiscount: offer.maxDiscount
      },
      discount,
      finalAmount: Math.max(0, cartTotal - discount)
    };

    return createSuccessResponse(
      response,
      'Offer code applied successfully'
    );

  } catch (error) {
    return handleApiError(error, 'PATCH /api/offers');
  }
}

// Add PUT method for updating offers
export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`offers_put_${clientIP}`, 20, 60000);
    
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
        'Offer ID is required',
        400,
        'Validation Error'
      );
    }

    // Validate request body
    const validation = offerValidation.update(updateData);
    if (!validation.isValid) {
      return createErrorResponse(
        'Validation failed',
        400,
        'Invalid offer data',
        formatValidationErrors(validation.errors)
      );
    }

    const validatedData = validation.data;
    if (!validatedData) {
      return createErrorResponse(
        'Validation failed',
        400,
        'Invalid offer data'
      );
    }

    // Convert date strings to Date objects
    const updateFields: any = { ...validatedData };
    if (validatedData.startDate) {
      updateFields.startDate = new Date(validatedData.startDate);
    }
    if (validatedData.endDate) {
      updateFields.endDate = new Date(validatedData.endDate);
    }

    // Update offer
    const updatedOffer = await Offer.findByIdAndUpdate(
      id,
      { ...updateFields, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!updatedOffer) {
      return createErrorResponse(
        'Offer not found',
        404,
        'The specified offer does not exist'
      );
    }

    const response = {
      id: String(updatedOffer._id),
      title: updatedOffer.title,
      description: updatedOffer.description,
      code: updatedOffer.code,
      type: updatedOffer.type,
      value: updatedOffer.value,
      minAmount: updatedOffer.minAmount,
      maxDiscount: updatedOffer.maxDiscount,
      isActive: updatedOffer.isActive,
      startDate: updatedOffer.startDate,
      endDate: updatedOffer.endDate,
      categories: updatedOffer.categories,
      brands: updatedOffer.brands,
      products: updatedOffer.products,
      usageLimit: updatedOffer.usageLimit,
      usageCount: updatedOffer.usageCount,
      userUsageLimit: updatedOffer.userUsageLimit,
      newCustomerOnly: updatedOffer.newCustomerOnly,
      applicableUserRoles: updatedOffer.applicableUserRoles,
      status: getOfferStatus(updatedOffer),
      remainingUsage: updatedOffer.usageLimit ? Math.max(0, updatedOffer.usageLimit - updatedOffer.usageCount) : null,
      usagePercentage: updatedOffer.usageLimit ? Math.min(100, (updatedOffer.usageCount / updatedOffer.usageLimit) * 100) : 0,
      createdAt: updatedOffer.createdAt,
      updatedAt: updatedOffer.updatedAt
    };

    return createSuccessResponse(
      response,
      'Offer updated successfully'
    );

  } catch (error) {
    return handleApiError(error, 'PUT /api/offers');
  }
}

// Add DELETE method for deleting offers
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`offers_delete_${clientIP}`, 5, 60000);
    
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
        'Offer ID is required',
        400,
        'Validation Error'
      );
    }

    const deletedOffer = await Offer.findByIdAndDelete(id);

    if (!deletedOffer) {
      return createErrorResponse(
        'Offer not found',
        404,
        'The specified offer does not exist'
      );
    }

    return createSuccessResponse(
      { deleted: true },
      'Offer deleted successfully'
    );

  } catch (error) {
    return handleApiError(error, 'DELETE /api/offers');
  }
}
