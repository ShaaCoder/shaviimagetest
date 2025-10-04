import { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { headers } from 'next/headers';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CopyCodeButton } from '@/components/copy-code-button';
import { 
  Clock, 
  Gift, 
  Percent, 
  DollarSign, 
  Truck,
  Tag,
  Star,
  Zap
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Current Offers & Deals - Save Big on Beauty Products',
  description: 'Browse our latest offers and deals. Get discount codes, free shipping offers, and special promotions on beauty and personal care products.',
  keywords: ['offers', 'deals', 'discounts', 'coupons', 'promotions', 'beauty deals'],
};

// Force this page to be dynamically rendered
export const dynamic = 'force-dynamic';
// Ensure Node.js runtime on Vercel (not Edge) for server-side fetch + Mongoose APIs
export const runtime = 'nodejs';

interface Offer {
  id: string;
  title: string;
  description: string;
  code: string;
  type: 'percentage' | 'fixed' | 'shipping' | 'bogo';
  value: number;
  minAmount: number;
  maxDiscount?: number;
  isActive: boolean;
  startDate: string;
  endDate?: string;
  categories: string[];
  brands: string[];
  usageLimit?: number;
  usageCount: number;
  userUsageLimit: number;
  newCustomerOnly: boolean;
  status: string;
  remainingUsage?: number;
  usagePercentage: number;
}

interface OffersResponse {
  data: {
    offers: Offer[];
    stats: {
      total: number;
      active: number;
      expired: number;
      filtered: number;
    };
  };
  success: boolean;
  message: string;
}

async function getOffers(): Promise<OffersResponse> {
  try {
    // Build absolute same-origin URL from request headers to avoid middleware redirects
    const h = headers();
    const proto = h.get('x-forwarded-proto') || 'https';
    const host = h.get('host');
    const baseUrl = `${proto}://${host}`;
    const apiUrl = `${baseUrl}/api/offers?active=true&limit=50`;
    const res = await fetch(apiUrl, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'NextJS-App-Router',
      },
      ...(typeof AbortSignal?.timeout === 'function' ? { signal: AbortSignal.timeout(10000) } : {}),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch offers: ${res.status} ${res.statusText} - ${errorText}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    return {
      data: {
        offers: [],
        stats: { total: 0, active: 0, expired: 0, filtered: 0 }
      },
      success: false,
      message: `Failed to load offers: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

function getOfferIcon(type: string) {
  switch (type) {
    case 'percentage':
      return <Percent className="w-5 h-5 text-orange-600" />;
    case 'fixed':
      return <DollarSign className="w-5 h-5 text-green-600" />;
    case 'shipping':
      return <Truck className="w-5 h-5 text-blue-600" />;
    case 'bogo':
      return <Gift className="w-5 h-5 text-purple-600" />;
    default:
      return <Tag className="w-5 h-5 text-gray-600" />;
  }
}

function getOfferTypeLabel(type: string): string {
  switch (type) {
    case 'percentage':
      return 'Percentage Discount';
    case 'fixed':
      return 'Fixed Amount Off';
    case 'shipping':
      return 'Free Shipping';
    case 'bogo':
      return 'Buy One Get One';
    default:
      return 'Special Offer';
  }
}

function formatDiscount(offer: Offer): string {
  switch (offer.type) {
    case 'percentage':
      return `${offer.value}% OFF`;
    case 'fixed':
      return `₹${offer.value} OFF`;
    case 'shipping':
      return 'FREE SHIPPING';
    case 'bogo':
      return 'BUY 2 GET 1 FREE';
    default:
      return 'SPECIAL OFFER';
  }
}


function OfferCard({ offer }: { offer: Offer }) {
  const isExpiringSoon = offer.endDate && 
    new Date(offer.endDate).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000; // 7 days

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
      {/* Header */}
      <div className="relative p-6 pb-4">
        {/* Background Pattern */}
        <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
          <div className="w-full h-full bg-gradient-to-br from-rose-400 to-pink-400 rounded-full transform rotate-12"></div>
        </div>
        
        {/* Status Badges */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {getOfferIcon(offer.type)}
            <Badge variant="outline" className="text-xs">
              {getOfferTypeLabel(offer.type)}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            {offer.newCustomerOnly && (
              <Badge className="bg-blue-100 text-blue-800 text-xs">
                <Star className="w-3 h-3 mr-1" />
                New Customer
              </Badge>
            )}
            {isExpiringSoon && (
              <Badge className="bg-orange-100 text-orange-800 text-xs">
                <Zap className="w-3 h-3 mr-1" />
                Ending Soon
              </Badge>
            )}
          </div>
        </div>

        {/* Discount Display */}
        <div className="mb-4">
          <div className="text-3xl font-bold text-rose-600 mb-2">
            {formatDiscount(offer)}
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {offer.title}
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            {offer.description}
          </p>
        </div>

        {/* Offer Details */}
        <div className="space-y-2 text-sm text-gray-600">
          {offer.minAmount > 0 && (
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span>Minimum order: ₹{offer.minAmount}</span>
            </div>
          )}
          
          {offer.maxDiscount && offer.type === 'percentage' && (
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              <span>Maximum discount: ₹{offer.maxDiscount}</span>
            </div>
          )}

          {offer.endDate && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Valid until: {new Date(offer.endDate).toLocaleDateString()}</span>
            </div>
          )}

          {offer.usageLimit && (
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4" />
              <span>
                {offer.remainingUsage} of {offer.usageLimit} uses remaining
              </span>
            </div>
          )}
        </div>

        {/* Categories/Brands */}
        {(offer.categories.length > 0 || offer.brands.length > 0) && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            {offer.categories.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                <span className="text-xs text-gray-500 mr-2">Categories:</span>
                {offer.categories.slice(0, 3).map((category, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {category}
                  </Badge>
                ))}
                {offer.categories.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{offer.categories.length - 3} more
                  </Badge>
                )}
              </div>
            )}
            
            {offer.brands.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-gray-500 mr-2">Brands:</span>
                {offer.brands.slice(0, 3).map((brand, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {brand}
                  </Badge>
                ))}
                {offer.brands.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{offer.brands.length - 3} more
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Code: <span className="font-mono font-medium text-gray-700">{offer.code}</span>
          </div>
          <CopyCodeButton code={offer.code} />
        </div>
      </div>
    </div>
  );
}

function OffersGrid({ offers }: { offers: Offer[] }) {
  if (offers.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border">
        <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
          <Gift className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No active offers</h3>
        <p className="text-gray-500 mb-6">Check back later for exciting deals and promotions!</p>
        <Link href="/">
          <Button className="bg-rose-600 hover:bg-rose-700">
            Continue Shopping
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {offers.map((offer) => (
        <OfferCard key={offer.id} offer={offer} />
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-6 bg-gray-200 rounded w-24"></div>
                <div className="h-6 bg-gray-200 rounded w-20"></div>
              </div>
              <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-8 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function OffersPage() {
  const offersResponse = await getOffers();

  if (!offersResponse.success) {
    return (
      <div>
        <Header />
        <main className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Gift className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load offers</h3>
            <p className="text-gray-500 mb-6">There was an error loading the offers. Please try again later.</p>
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

  const { offers, stats } = offersResponse.data;

  return (
    <div>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-8">
          <Link href="/" className="hover:text-rose-600 transition-colors">Home</Link>
          <span>/</span>
          <span className="text-gray-900">Offers</span>
        </nav>

        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium mb-4">
            <Gift className="w-4 h-4" />
            Special Deals & Promotions
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Current <span className="text-rose-600">Offers</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Save big on your favorite beauty and personal care products with our latest offers, 
            discount codes, and exclusive promotions.
          </p>
        </div>

        {/* Stats */}
        <div className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-lg border p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-rose-600" />
            <h2 className="text-lg font-semibold text-gray-900">Offer Overview</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-rose-600 mb-1">{stats.active}</div>
              <div className="text-sm text-gray-600">Active Offers</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {offers.filter(o => o.type === 'percentage').length}
              </div>
              <div className="text-sm text-gray-600">% Discounts</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {offers.filter(o => o.type === 'shipping').length}
              </div>
              <div className="text-sm text-gray-600">Free Shipping</div>
            </div>
          </div>
        </div>

        {/* Offers Grid */}
        <Suspense fallback={<LoadingSkeleton />}>
          <OffersGrid offers={offers} />
        </Suspense>

        {/* Call to Action */}
        {offers.length > 0 && (
          <div className="mt-16">
            <div className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-2xl p-8 text-center border border-rose-100">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Ready to start shopping?
              </h3>
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                Browse our products and apply these offer codes at checkout to save on your purchase.
              </p>
              <div className="flex items-center justify-center gap-4">
                <Link href="/products">
                  <Button className="bg-rose-600 hover:bg-rose-700">
                    Shop Now
                  </Button>
                </Link>
                <Link href="/brands">
                  <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50">
                    Browse Brands
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