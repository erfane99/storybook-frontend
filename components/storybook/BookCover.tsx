'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface BookCoverProps {
  title: string;
  coverImage?: string;
  audience: 'children' | 'young_adults' | 'adults';
  className?: string;
}

const audienceLabels = {
  children: 'For Children',
  young_adults: 'For Young Adults',
  adults: 'For Adults'
};

/**
 * BookCover Component
 * Displays the front cover of the storybook with optional cover image
 * Falls back to a generated cover design if no cover image is provided
 */
export function BookCover({ title, coverImage, audience, className }: BookCoverProps) {
  // Audience-specific styling
  const audienceStyles = {
    children: {
      gradient: 'from-purple-400 via-pink-400 to-orange-300',
      titleFont: 'font-comic text-4xl md:text-5xl',
      decoration: 'before:content-["✨"] after:content-["✨"]',
      border: 'border-4 border-yellow-300',
    },
    young_adults: {
      gradient: 'from-indigo-600 via-purple-600 to-pink-500',
      titleFont: 'font-bold text-3xl md:text-4xl',
      decoration: '',
      border: 'border-2 border-indigo-400/50',
    },
    adults: {
      gradient: 'from-slate-800 via-slate-700 to-slate-600',
      titleFont: 'font-serif text-3xl md:text-4xl tracking-wide',
      decoration: '',
      border: 'border border-slate-500/30',
    },
  };

  const style = audienceStyles[audience] || audienceStyles.children;

  return (
    <div 
      className={cn(
        'relative w-full h-full overflow-hidden',
        'bg-gradient-to-br',
        style.gradient,
        style.border,
        'rounded-r-lg shadow-xl',
        className
      )}
    >
      {/* Cover Image or Fallback */}
      {coverImage ? (
        <div className="absolute inset-0">
          <img
            src={coverImage}
            alt={`Cover for ${title}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to gradient if image fails
              e.currentTarget.style.display = 'none';
            }}
          />
          {/* Gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
        </div>
      ) : (
        /* Fallback cover design */
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
          {/* Decorative elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 left-4 w-20 h-20 rounded-full bg-white/30" />
            <div className="absolute bottom-8 right-8 w-32 h-32 rounded-full bg-white/20" />
            <div className="absolute top-1/3 right-12 w-16 h-16 rounded-full bg-white/25" />
          </div>
        </div>
      )}

      {/* Title and Attribution */}
      <div className="absolute inset-0 flex flex-col items-center justify-between p-6 md:p-10">
        {/* Top section - Title */}
        <div className="flex-1 flex items-center justify-center text-center">
          <h1 
            className={cn(
              style.titleFont,
              'text-white drop-shadow-lg',
              'max-w-[90%] leading-tight',
              style.decoration,
              'before:mr-2 after:ml-2'
            )}
          >
            {title}
          </h1>
        </div>

        {/* Bottom section - Attribution */}
        <div className="text-center space-y-2">
          <div className={cn(
            'inline-block px-4 py-1 rounded-full',
            'bg-white/20 backdrop-blur-sm',
            'text-white/90 text-sm'
          )}>
            {audienceLabels[audience]}
          </div>
          <p className="text-white/70 text-xs font-medium tracking-wider">
            A StoryCanvas Creation
          </p>
        </div>
      </div>

      {/* Gloss/sheen effect overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
        }}
      />
    </div>
  );
}

export default BookCover;
