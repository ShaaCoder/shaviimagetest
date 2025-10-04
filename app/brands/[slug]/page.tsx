import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/brand-logo';
import { ExternalLink, ArrowLeft, Package } from 'lucide-react';
import { SortDropdown } from './sort-dropdown';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  description: string;
  images: string[];
  category: {
    id: string;
    name: string;
    slug: string;
  };
  brand: string;
  stock: number;
  rating: number;
  reviewCount: number;
  isFeatured: boolean;
  isNew: boolean;
  isBestseller: boolean;
}

interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  isActive: boolean;
  isFeatured: boolean;
  productCount: number;
  metaTitle?: string;
  metaDescription?: string;
}

interface BrandPageProps {
  params: {
    slug: string;
  };
  searchParams: {
    page?: string;
    sort?: string;
  };
}

async function getBrandBySlug(slug: string): Promise<Brand | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/brands?limit=100`,
      { cache: 'no-store' }
    );

    if (!res.ok) return null;

    const data = await res.json();
    const brand = data.data?.brands?.find((b: Brand) => b.slug === slug);
    return brand || null;
  } catch (error) {
    console.error('Error fetching brand:', error);
    return null;
  }
}

async function getBrandProducts(
  brandName: string,
  page: number = 1,
  sort: string = 'featured'
): Promise<{ products: Product[]; total: number; pagination: any }> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/products?brand=${encodeURIComponent(brandName)}&page=${page}&limit=20&sort=${sort}`,
      { cache: 'no-store' }
    );

    if (!res.ok) {
      throw new Error('Failed to fetch products');
    }

    const data = await res.json();
    return {
      products: data.data || [],
      total: data.pagination?.total || 0,
      pagination: data.pagination
    };
  } catch (error) {
    console.error('Error fetching brand products:', error);
    return { products: [], total: 0, pagination: null };
  }
}

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const brand = await getBrandBySlug(params.slug);

  if (!brand) {
    return {
      title: 'Brand Not Found',
      description: 'The requested brand could not be found.',
    };
  }

  return {
    title: brand.metaTitle || `${brand.name} - Premium Products & Best Deals`,
    description: brand.metaDescription || `Shop ${brand.name} products. ${brand.description || 'Discover quality products at great prices.'} ✓ Authentic ✓ Fast Delivery`,
    keywords: [`${brand.name}`, `${brand.name} products`, 'authentic products', 'beauty products', 'personal care'],
    openGraph: {
      title: brand.metaTitle || `${brand.name} Products`,
      description: brand.metaDescription || `Shop authentic ${brand.name} products`,
      images: brand.logo ? [{ url: brand.logo, alt: `${brand.name} logo` }] : [],
    },
  };
}

function ProductCard({ product }: { product: Product }) {
  const discountPercentage = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
    >
      {/* Product Image */}
      <div className="aspect-square relative overflow-hidden bg-gray-50">
        {product.images && product.images.length > 0 ? (
          <Image
            src={product.images[0]}
            alt={product.name}
            width={300}
            height={300}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            unoptimized={product.images[0].startsWith('http')}
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.isNew && (
            <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
              NEW
            </span>
          )}
          {product.isBestseller && (
            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">
              BESTSELLER
            </span>
          )}
          {discountPercentage > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
              -{discountPercentage}%
            </span>
          )}
        </div>

        {/* Stock Status */}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="bg-red-500 text-white font-bold px-3 py-1 rounded">
              OUT OF STOCK
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>

        {/* Category */}
        <p className="text-sm text-gray-500">
          {product.category.name}
        </p>

        {/* Rating */}
        {product.rating > 0 && (
          <div className="flex items-center gap-1">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.floor(product.rating) ? 'text-yellow-400' : 'text-gray-200'
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-sm text-gray-500">({product.reviewCount})</span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-gray-900">
            ₹{product.price.toLocaleString()}
          </span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-sm text-gray-500 line-through">
              ₹{product.originalPrice.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function ProductsGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
        <p className="text-gray-500">This brand doesn't have any products yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="aspect-square bg-gray-200"></div>
            <div className="p-4 space-y-2">
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


export default async function BrandPage({ params, searchParams }: BrandPageProps) {
  const brand = await getBrandBySlug(params.slug);

  if (!brand) {
    notFound();
  }

  const page = parseInt(searchParams.page || '1', 10);
  const sort = searchParams.sort || 'featured';
  const { products, total, pagination } = await getBrandProducts(brand.name, page, sort);

  return (
    <div>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
          <Link href="/" className="hover:text-rose-600 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/brands" className="hover:text-rose-600 transition-colors">Brands</Link>
          <span>/</span>
          <span className="text-gray-900">{brand.name}</span>
        </nav>

        {/* Brand Header */}
        <div className="bg-white rounded-lg border p-8 mb-8 shadow-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Brand Logo */}
            <BrandLogo
              src={brand.logo || '/placeholder-image.svg'}
              alt={`${brand.name} logo`}
              brandName={brand.name}
              width={120}
              height={120}
              className="w-24 h-24 object-contain rounded-lg border border-gray-100 p-2"
            />

            {/* Brand Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                <h1 className="text-3xl font-bold text-gray-900">{brand.name}</h1>
                <div className="flex items-center gap-2">
                  {brand.isFeatured && (
                    <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">
                      Featured Brand
                    </Badge>
                  )}
                </div>
              </div>

              {brand.description && (
                <p className="text-gray-600 mb-4 max-w-3xl leading-relaxed">{brand.description}</p>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Package className="w-4 h-4" />
                  <span className="font-medium text-gray-900">{brand.productCount}</span> Products Available
                </div>

                {brand.website && (
                  <a
                    href={brand.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-rose-600 hover:text-rose-700 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Visit Website
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-900">
            {brand.name} Products {total > 0 && `(${total})`}
          </h2>
          
          {products.length > 0 && (
            <SortDropdown currentSort={sort} brandSlug={brand.slug} />
          )}
        </div>

        {/* Products Grid */}
        <Suspense fallback={<LoadingSkeleton />}>
          <ProductsGrid products={products} />
        </Suspense>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <div className="flex items-center gap-2">
              {pagination.hasPrevPage && (
                <Link
                  href={`?page=${pagination.prevPage}${sort !== 'featured' ? `&sort=${sort}` : ''}`}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Previous
                </Link>
              )}

              <span className="px-3 py-2 text-sm text-gray-700">
                Page {pagination.page} of {pagination.totalPages}
              </span>

              {pagination.hasNextPage && (
                <Link
                  href={`?page=${pagination.nextPage}${sort !== 'featured' ? `&sort=${sort}` : ''}`}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Back to Brands */}
        <div className="mt-12 text-center">
          <Link href="/brands">
            <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50">
              <ArrowLeft className="w-4 h-4 mr-2" />
              View All Brands
            </Button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
