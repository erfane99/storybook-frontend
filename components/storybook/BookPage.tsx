'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface Scene {
  description: string;
  narration?: string;
  emotion: string;
  generatedImage: string;
  dialogue?: string;
  hasSpeechBubble?: boolean;
  emotionalWeight?: number;
  isSilent?: boolean;
}

interface PageData {
  pageNumber: number;
  scenes: Scene[];
}

interface BookPageProps {
  /** The page type - determines layout and styling */
  type: 'cover' | 'title' | 'content' | 'end';
  /** Page data for content pages */
  pageData?: PageData;
  /** Storybook title (for title/end pages) */
  title?: string;
  /** Cover image URL (for cover page) */
  coverImage?: string;
  /** Author/creator name */
  author?: string;
  /** Target audience */
  audience: 'children' | 'young_adults' | 'adults';
  /** Current page number (for content pages) */
  pageNumber?: number;
  /** Total pages */
  totalPages?: number;
  /** Class name for styling */
  className?: string;
}

// Calculate panels per page based on audience
const getPanelsPerPage = (audience: string): number => {
  switch (audience) {
    case 'children': return 2;
    case 'young_adults': return 3;
    case 'adults': return 4;
    default: return 2;
  }
};

// Audience-specific styling configurations
const audiencePageStyles = {
  children: {
    pageBackground: 'bg-[#FFF8E7]',
    paperTexture: 'bg-gradient-to-br from-[#FFFCF5] to-[#FFF5DC]',
    panelBorder: 'border-4 border-amber-200 rounded-2xl',
    narrationBox: 'bg-black rounded-xl px-4 py-3 border-2 border-yellow-400/80',
    narrationText: 'text-white text-base leading-relaxed font-medium',
    panelGap: 'gap-4',
    cornerRadius: 'rounded-3xl',
    shadowStyle: 'shadow-lg',
    animation: 'transition-all duration-500 ease-out',
  },
  young_adults: {
    pageBackground: 'bg-[#FEFCF8]',
    paperTexture: 'bg-gradient-to-br from-[#FEFEFE] to-[#F5F3EE]',
    panelBorder: 'border-2 border-gray-200 rounded-lg',
    narrationBox: 'bg-gray-900 rounded-lg px-3 py-2 border border-gray-600',
    narrationText: 'text-white text-sm leading-snug font-medium',
    panelGap: 'gap-3',
    cornerRadius: 'rounded-xl',
    shadowStyle: 'shadow-md',
    animation: 'transition-all duration-400 ease-in-out',
  },
  adults: {
    pageBackground: 'bg-[#FDFDFB]',
    paperTexture: 'bg-gradient-to-br from-white to-[#F8F7F4]',
    panelBorder: 'border border-gray-300 rounded-md',
    narrationBox: 'bg-gray-800 rounded px-2 py-1.5 border border-gray-500',
    narrationText: 'text-white text-xs leading-tight font-serif',
    panelGap: 'gap-2',
    cornerRadius: 'rounded-lg',
    shadowStyle: 'shadow-sm',
    animation: 'transition-all duration-300 ease-linear',
  },
};

/**
 * BookPage Component
 * Renders different types of book pages with audience-appropriate styling
 */
export function BookPage({
  type,
  pageData,
  title,
  coverImage,
  author,
  audience,
  pageNumber,
  totalPages,
  className,
}: BookPageProps) {
  const styles = audiencePageStyles[audience] || audiencePageStyles.children;
  const panelsPerPage = getPanelsPerPage(audience);

  // Render Cover Page
  if (type === 'cover') {
    return (
      <div 
        className={cn(
          'w-full h-full',
          'relative overflow-hidden',
          styles.cornerRadius,
          styles.shadowStyle,
          className
        )}
      >
        {coverImage ? (
          <>
            <img
              src={coverImage}
              alt={`Cover for ${title}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          </>
        ) : (
          <div className={cn(
            'w-full h-full',
            'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500',
            'flex items-center justify-center'
          )}>
            <div className="text-center text-white p-8">
              <h1 className="text-4xl md:text-5xl font-bold drop-shadow-lg mb-4">{title}</h1>
              <p className="text-lg opacity-80">A StoryCanvas Creation</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render Title Page
  if (type === 'title') {
    return (
      <div 
        className={cn(
          'w-full h-full',
          styles.pageBackground,
          styles.paperTexture,
          styles.cornerRadius,
          styles.shadowStyle,
          'flex flex-col items-center justify-center p-8 md:p-12',
          className
        )}
      >
        {/* Decorative line top */}
        <div className="w-24 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent mb-8" />
        
        {/* Title */}
        <h1 className={cn(
          'text-center mb-6',
          audience === 'children' ? 'text-3xl md:text-4xl font-comic' : 
          audience === 'adults' ? 'text-2xl md:text-3xl font-serif' : 
          'text-2xl md:text-3xl font-bold'
        )}>
          {title}
        </h1>

        {/* Author */}
        {author && (
          <p className="text-muted-foreground text-lg mb-8">
            Story by {author}
          </p>
        )}

        {/* Audience Badge */}
        <div className={cn(
          'px-6 py-2 rounded-full',
          'bg-primary/10 text-primary',
          'text-sm font-medium'
        )}>
          {audience === 'children' ? '📚 For Children' : 
           audience === 'young_adults' ? '📖 For Young Adults' : 
           '📕 For Adults'}
        </div>

        {/* Decorative line bottom */}
        <div className="w-24 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent mt-8" />
      </div>
    );
  }

  // Render End Page
  if (type === 'end') {
    return (
      <div 
        className={cn(
          'w-full h-full',
          styles.pageBackground,
          styles.paperTexture,
          styles.cornerRadius,
          styles.shadowStyle,
          'flex flex-col items-center justify-center p-8 md:p-12',
          className
        )}
      >
        {/* The End text */}
        <div className={cn(
          'text-center mb-8',
          audience === 'children' ? 'text-5xl md:text-6xl font-comic text-amber-600' :
          audience === 'adults' ? 'text-4xl md:text-5xl font-serif italic text-gray-700' :
          'text-4xl md:text-5xl font-bold text-indigo-600'
        )}>
          {audience === 'children' ? '🌟 The End 🌟' : 'The End'}
        </div>

        {/* Decorative element */}
        <div className="w-32 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-30 mb-8" />

        {/* Call to action */}
        <p className="text-muted-foreground text-center max-w-xs">
          Thank you for reading!
        </p>
        <p className="text-muted-foreground/70 text-sm mt-2">
          Created with ❤️ by StoryCanvas
        </p>
      </div>
    );
  }

  // Render Content Page with panels
  if (type === 'content' && pageData) {
    const scenes = pageData.scenes || [];
    const sceneCount = scenes.length;
    
    // Calculate panel height based on number of scenes to prevent overflow
    // Each panel gets equal share of available height minus padding and page number
    const getPanelHeightClass = () => {
      if (sceneCount === 1) return 'h-[85%]';
      if (sceneCount === 2) return 'h-[46%]';
      if (sceneCount === 3) return 'h-[30%]';
      return 'h-[22%]'; // 4 panels
    };
    
    return (
      <div 
        className={cn(
          'w-full h-full',
          styles.pageBackground,
          styles.paperTexture,
          styles.cornerRadius,
          styles.shadowStyle,
          'flex flex-col p-3 md:p-4 overflow-hidden',
          className
        )}
      >
        {/* Page content area - overflow hidden to prevent content escaping */}
        <div className={cn(
          'flex-1 flex flex-col overflow-hidden',
          styles.panelGap
        )}>
          {scenes.map((scene, index) => (
            <div 
              key={index}
              className={cn(
                'flex flex-col min-h-0',
                getPanelHeightClass(),
                styles.animation
              )}
            >
              {/* Panel Image - constrained height */}
              <div className={cn(
                'flex-1 relative overflow-hidden min-h-0',
                styles.panelBorder,
                styles.shadowStyle
              )}>
                {scene.generatedImage ? (
                  <img
                    src={scene.generatedImage}
                    alt={`Panel ${index + 1}`}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <span className="text-muted-foreground text-sm">Panel not available</span>
                  </div>
                )}
              </div>

              {/* Narration Caption - constrained with ellipsis for overflow */}
              {scene.narration && !scene.isSilent && (
                <div className={cn(
                  styles.narrationBox,
                  'mt-1 flex-shrink-0 max-h-16 overflow-hidden'
                )}>
                  <p className={cn(
                    styles.narrationText,
                    'text-center line-clamp-2'
                  )}>
                    {scene.narration}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Page Number - always visible at bottom */}
        {pageNumber !== undefined && (
          <div className="text-center pt-2 text-muted-foreground text-xs flex-shrink-0">
            {pageNumber}
          </div>
        )}
      </div>
    );
  }

  // Fallback empty page
  return (
    <div 
      className={cn(
        'w-full h-full',
        styles.pageBackground,
        styles.paperTexture,
        styles.cornerRadius,
        className
      )}
    />
  );
}

export default BookPage;
