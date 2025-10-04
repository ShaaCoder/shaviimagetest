'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Star, Package } from 'lucide-react';

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

export function BrandCard({ brand }: { brand: Brand }) {
  const [imgSrc, setImgSrc] = useState(brand.logo);
  const [hasError, setHasError] = useState(false);

  return (
    <Link href={`/brands/${brand.slug}`}>
      <div className="group bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border hover:border-rose-200">
        <div className="relative aspect-square overflow-hidden bg-gray-50">
          {imgSrc && imgSrc !== '/placeholder-image.svg' && !hasError ? (
            <Image
              src={imgSrc}
              alt={`${brand.name} logo`}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              className="object-contain p-6 group-hover:scale-105 transition-transform duration-300"
              unoptimized={imgSrc.startsWith('http')}
              onError={() => {
                setHasError(true);
                setImgSrc('/placeholder-image.svg');
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-20 h-20 bg-gradient-to-br from-rose-100 to-rose-200 rounded-full flex items-center justify-center text-rose-600 text-2xl font-bold shadow-sm">
                {brand.name.charAt(0).toUpperCase()}
              </div>
            </div>
          )}
          
          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {brand.isFeatured && (
              <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">
                <Star className="w-3 h-3 mr-1" />
                Featured
              </Badge>
            )}
            {brand.isGenerated && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Auto
              </Badge>
            )}
          </div>
        </div>
        
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-1 group-hover:text-rose-600 transition-colors">
            {brand.name}
          </h3>
          
          {brand.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">
              {brand.description}
            </p>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Package className="w-4 h-4" />
              <span>{brand.productCount} {brand.productCount === 1 ? 'Product' : 'Products'}</span>
            </div>
            
            <div className="text-xs text-rose-600 font-medium group-hover:text-rose-700">
              Shop Now →
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}