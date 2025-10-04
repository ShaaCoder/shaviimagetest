import { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { headers } from 'next/headers';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BrandCard } from '@/components/brand-card';
import { TrendingUp, Star, Package, Award } from 'lucide-react';

export const metadata: Metadata = {
  title: 'All Brands - Premium Beauty & Personal Care Brands',
  description: 'Discover all our premium beauty and personal care brands. Shop authentic products from top brands with fast delivery and great prices.',
  keywords: ['brands', 'beauty brands', 'personal care', 'authentic products', 'premium brands'],
};

// Force this page to be dynamically rendered
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
  isGenerated?: boolean;
}

interface BrandsResponse {
  data: {
    brands: Brand[];
    total: number;
    managed: number;
    generated: number;
    featured: number;
  };
  success: boolean;
  message: string;
}

async function getBrands(): Promise<BrandsResponse> {
  try {
    // Build absolute same-origin URL using incoming request headers
    const h = headers();
    const proto = h.get('x-forwarded-proto') || 'https';
    const host = h.get('host');
    const baseUrl = `${proto}://${host}`;
    const res = await fetch(`${baseUrl}/api/brands?limit=100`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch brands');
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching brands:', error);
    return {
      data: {
        brands: [],
        total: 0,
        managed: 0,
        generated: 0,
        featured: 0
      },
      success: false,
      message: 'Failed to load brands'
    };
  }
}


function BrandsGrid({ brands }: { brands: Brand[] }) {
  if (brands.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border">
        <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
          <Package className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No brands available</h3>
        <p className="text-gray-500 mb-6">We're working on adding more brands. Check back soon!</p>
        <Link href="/">
          <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50">
            Continue Shopping
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {brands.map((brand) => (
        <BrandCard key={brand.id} brand={brand} />
      ))}
    </div>
  );
}

function BrandStats({ data }: { data: BrandsResponse['data'] }) {
  return (
    <div className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-lg border p-6 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-rose-600" />
        <h2 className="text-lg font-semibold text-gray-900">Brand Overview</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-white rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-rose-600 mb-1">{data.total}</div>
          <div className="text-sm text-gray-600">Total Brands</div>
        </div>
        <div className="text-center p-4 bg-white rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-yellow-600 mb-1">{data.featured}</div>
          <div className="text-sm text-gray-600">Featured</div>
        </div>
        <div className="text-center p-4 bg-white rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-green-600 mb-1">{data.managed}</div>
          <div className="text-sm text-gray-600">Managed</div>
        </div>
        <div className="text-center p-4 bg-white rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-blue-600 mb-1">{data.generated}</div>
          <div className="text-sm text-gray-600">Auto-Generated</div>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border overflow-hidden">
            <div className="aspect-square bg-gray-200"></div>
            <div className="p-4 space-y-3">
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              <div className="flex items-center justify-between">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function BrandsPage() {
  const brandsResponse = await getBrands();

  if (!brandsResponse.success) {
    return (
      <div>
        <Header />
        <main className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Package className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load brands</h3>
            <p className="text-gray-500 mb-6">There was an error loading the brands. Please try again later.</p>
            <Link href="/">
              <Button className="bg-rose-600 hover:bg-rose-700">
                Back to Home
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const { brands, total, featured } = brandsResponse.data;

  // Separate featured and regular brands
  const featuredBrands = brands.filter(brand => brand.isFeatured);
  const regularBrands = brands.filter(brand => !brand.isFeatured);

  return (
    <div>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-8">
          <Link href="/" className="hover:text-rose-600 transition-colors">Home</Link>
          <span>/</span>
          <span className="text-gray-900">Brands</span>
        </nav>

        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-rose-100 text-rose-800 px-3 py-1 rounded-full text-sm font-medium mb-4">
            <Award className="w-4 h-4" />
            Premium Brands Collection
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Shop by <span className="text-rose-600">Brand</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover premium beauty and personal care brands. We partner with trusted manufacturers 
            to bring you authentic, high-quality products at competitive prices.
          </p>
        </div>

        {/* Brand Statistics */}
        <BrandStats data={brandsResponse.data} />

        {/* Featured Brands */}
        {featuredBrands.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Star className="w-6 h-6 text-yellow-500" />
                <h2 className="text-2xl font-bold text-gray-900">Featured Brands</h2>
              </div>
              <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">
                {featured} Featured
              </Badge>
            </div>
            
            <Suspense fallback={<LoadingSkeleton />}>
              <BrandsGrid brands={featuredBrands} />
            </Suspense>
          </section>
        )}

        {/* All Brands */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6 text-rose-600" />
              <h2 className="text-2xl font-bold text-gray-900">
                {featuredBrands.length > 0 ? 'All Brands' : 'Browse Brands'}
              </h2>
            </div>
            <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
              {total} {total === 1 ? 'brand' : 'brands'}
            </span>
          </div>
          
          <Suspense fallback={<LoadingSkeleton />}>
            <BrandsGrid brands={featuredBrands.length > 0 ? regularBrands : brands} />
          </Suspense>
        </section>

        {/* Call to Action */}
        {brands.length > 0 && (
          <div className="mt-16">
            <div className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-2xl p-8 text-center border border-rose-100">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Can't find your favorite brand?
              </h3>
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                We're constantly expanding our brand portfolio. Let us know which brands you'd like to see, 
                and we'll do our best to bring them to you.
              </p>
              <div className="flex items-center justify-center gap-4">
                <Link href="/contact">
                  <Button className="bg-rose-600 hover:bg-rose-700">
                    Request a Brand
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50">
                    Continue Shopping
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
