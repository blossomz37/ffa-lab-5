import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';

interface BookCoverProps {
  coverUrl?: string;
  title: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

/**
 * BookCover component for displaying book cover images with fallback
 * - Renders Amazon cover images with error handling
 * - Shows placeholder with book icon for missing/broken images
 * - Supports multiple sizes for different use cases
 * - Lazy loading for performance
 */
export default function BookCover({ 
  coverUrl, 
  title, 
  size = 'medium',
  className = '' 
}: BookCoverProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const sizeConfig = {
    small: { height: '60px', width: '45px' },
    medium: { height: '80px', width: '60px' },
    large: { height: '120px', width: '90px' }
  };

  const { height, width } = sizeConfig[size];

  const handleImageError = () => {
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  // Show placeholder if no URL, error, or still loading
  const showPlaceholder = !coverUrl || !coverUrl.startsWith('http') || imageError;

  return (
    <div 
      className={`relative overflow-hidden rounded-md shadow-sm bg-muted flex items-center justify-center ${className}`}
      style={{ height, width }}
    >
      {!showPlaceholder && (
        <>
          {/* Loading skeleton */}
          {!imageLoaded && (
            <div className="absolute inset-0 bg-muted animate-pulse" />
          )}
          
          {/* Actual image */}
          <img
            src={coverUrl}
            alt={`Cover of ${title}`}
            className={`h-full w-full object-cover transition-opacity duration-200 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            loading="lazy"
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
        </>
      )}
      
      {/* Placeholder - shown when no image or error */}
      {showPlaceholder && (
        <div className="flex flex-col items-center justify-center text-muted-foreground p-2">
          <BookOpen 
            className={`${size === 'small' ? 'h-4 w-4' : size === 'large' ? 'h-8 w-8' : 'h-6 w-6'} mb-1`} 
          />
          <span className="text-xs text-center leading-tight">
            {size === 'small' ? 'No Cover' : 'No Cover Available'}
          </span>
        </div>
      )}
    </div>
  );
}