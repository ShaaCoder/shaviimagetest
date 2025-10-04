'use client';

import { useState } from 'react';
import Image from 'next/image';

interface BrandLogoProps {
  src: string;
  alt: string;
  brandName: string;
  width?: number;
  height?: number;
  className?: string;
}

export function BrandLogo({ src, alt, brandName, width = 120, height = 120, className = '' }: BrandLogoProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  return (
    <div className="flex-shrink-0">
      {imgSrc && imgSrc !== '/placeholder-image.svg' && !hasError ? (
        <Image
          src={imgSrc}
          alt={alt}
          width={width}
          height={height}
          className={className}
          unoptimized={imgSrc.startsWith('http')}
          onError={() => {
            setHasError(true);
            setImgSrc('/placeholder-image.svg');
          }}
        />
      ) : (
        <div className="w-24 h-24 bg-gradient-to-br from-rose-100 to-rose-200 rounded-lg flex items-center justify-center text-rose-600 text-3xl font-bold flex-shrink-0 shadow-sm">
          {brandName.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}