'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { X, ChevronLeft, ChevronRight, Share2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BookPage } from './BookPage';
import { BookCover } from './BookCover';
import { cn } from '@/lib/utils';
import { useDevice } from '@/hooks/use-device';

interface Scene {
  description: string;
  narration?: string;
  emotion: string;
  generatedImage: string;
  dialogue?: string;
  hasSpeechBubble?: boolean;
  emotionalWeight?: number;
  isSilent?: boolean;
  // Visual storytelling properties from worker
  borderStyle?: 'clean' | 'jagged' | 'wavy' | 'broken' | 'soft' | 'none';
  transitionType?: 'action_to_action' | 'subject_to_subject' | 'scene_to_scene' | 'moment_to_moment' | 'aspect_to_aspect';
}

interface Page {
  pageNumber: number;
  scenes: Scene[];
}

interface Storybook {
  id: string;
  title: string;
  coverImage?: string;
  cover_image?: string;
  pages: Page[];
  audience: 'children' | 'young_adults' | 'adults';
  character_description?: string;
}

interface BookViewerProps {
  storybook: Storybook;
  onClose: () => void;
  onRate?: () => void;
}

// Calculate panels per book page based on audience
const getPanelsPerBookPage = (audience: string): number => {
  switch (audience) {
    case 'children': return 2;
    case 'young_adults': return 3;
    case 'adults': return 4;
    default: return 2;
  }
};

// Audience-specific book styling
const audienceBookStyles = {
  children: {
    pageCurl: 'ease-out',
    animationDuration: 800,
    cornerRadius: 24,
    shadowColor: 'rgba(139, 92, 246, 0.3)',
  },
  young_adults: {
    pageCurl: 'ease-in-out',
    animationDuration: 600,
    cornerRadius: 16,
    shadowColor: 'rgba(79, 70, 229, 0.2)',
  },
  adults: {
    pageCurl: 'ease',
    animationDuration: 400,
    cornerRadius: 8,
    shadowColor: 'rgba(0, 0, 0, 0.15)',
  },
};

// Forward ref wrapper for BookPage to work with react-pageflip
const PageWrapper = React.forwardRef<HTMLDivElement, { children: React.ReactNode }>(
  ({ children }, ref) => {
    return (
      <div ref={ref} className="w-full h-full">
        {children}
      </div>
    );
  }
);
PageWrapper.displayName = 'PageWrapper';

/**
 * BookViewer Component
 * Full-screen modal book reading experience with page-flip animation
 */
export function BookViewer({ storybook, onClose, onRate }: BookViewerProps) {
  const bookRef = useRef<any>(null);
  // Load saved reading progress from localStorage
  const [currentPage, setCurrentPage] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`reading-progress-${storybook.id}`);
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });
  const [isFlipping, setIsFlipping] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);
  const [showHint, setShowHint] = useState(true);
  
  // Use centralized device detection hook
  const { isMobile, isClient } = useDevice();

  // Get cover image (handle both naming conventions)
  const coverImage = storybook.coverImage || storybook.cover_image;

  // Auto-hide swipe hint after 3 seconds
  useEffect(() => {
    if (showHint && currentPage < 3) {
      const timer = setTimeout(() => {
        setShowHint(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showHint, currentPage]);

  // Preload next 2 pages for smoother experience
  useEffect(() => {
    if (!isClient) return;
    
    const allScenes = storybook.pages.flatMap(page => page.scenes);
    const panelsPerPage = getPanelsPerBookPage(storybook.audience);
    
    // Calculate which images to preload based on current page
    const startIndex = currentPage * panelsPerPage;
    const endIndex = Math.min(startIndex + (panelsPerPage * 3), allScenes.length);
    
    for (let i = startIndex; i < endIndex; i++) {
      const scene = allScenes[i];
      if (scene?.generatedImage) {
        const img = new Image();
        img.src = scene.generatedImage;
      }
    }
  }, [currentPage, storybook.pages, storybook.audience, isClient]);

  // Prepare book pages
  const panelsPerPage = getPanelsPerBookPage(storybook.audience);
  const bookStyle = audienceBookStyles[storybook.audience] || audienceBookStyles.children;

  // Flatten all scenes from all pages
  const allScenes = storybook.pages.flatMap((page, pageIdx) => 
    page.scenes.map((scene, sceneIdx) => ({
      ...scene,
      originalPage: pageIdx + 1,
      originalPanel: sceneIdx + 1,
    }))
  );

  // Group scenes into book pages based on panels per page
  const bookPages: Array<{ scenes: typeof allScenes }> = [];
  for (let i = 0; i < allScenes.length; i += panelsPerPage) {
    bookPages.push({
      scenes: allScenes.slice(i, i + panelsPerPage),
    });
  }

  // Total pages: Cover + Title + Content Pages + End
  const totalPages = 2 + bookPages.length + 1;

  // Save reading progress to localStorage when page changes
  useEffect(() => {
    if (storybook.id && currentPage > 0) {
      localStorage.setItem(`reading-progress-${storybook.id}`, currentPage.toString());
    }
  }, [currentPage, storybook.id]);

  // Restore reading position on mount (flip to saved page)
  useEffect(() => {
    const savedPage = localStorage.getItem(`reading-progress-${storybook.id}`);
    if (savedPage && bookRef.current) {
      const pageNum = parseInt(savedPage, 10);
      if (pageNum > 0) {
        setTimeout(() => {
          bookRef.current?.pageFlip()?.turnToPage(pageNum);
        }, 100);
      }
    }
  }, [storybook.id]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        handleNextPage();
      } else if (e.key === 'ArrowLeft') {
        handlePrevPage();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Navigation handlers
  const handleNextPage = useCallback(() => {
    if (bookRef.current && !isFlipping) {
      bookRef.current.pageFlip()?.flipNext();
    }
  }, [isFlipping]);

  const handlePrevPage = useCallback(() => {
    if (bookRef.current && !isFlipping) {
      bookRef.current.pageFlip()?.flipPrev();
    }
  }, [isFlipping]);

  // Page flip event handlers
  const onFlip = useCallback((e: any) => {
    setCurrentPage(e.data);
    // Haptic feedback on mobile devices
    if (isMobile && navigator.vibrate) {
      navigator.vibrate(10);
    }
  }, [isMobile]);

  const onChangeState = useCallback((e: any) => {
    setIsFlipping(e.data === 'flipping');
  }, []);

  // Calculate display page number (accounting for cover and title)
  const displayPageNumber = Math.max(1, currentPage - 1);
  const displayTotalPages = totalPages - 2;

  // ============================================================
  // BOOK DIMENSIONS - FULLY DYNAMIC, NO PIXEL CAPS
  // The book should dominate the screen for immersive reading
  // 
  // CRITICAL: react-pageflip's width/height props are SINGLE PAGE dimensions!
  // - In portrait mode (usePortrait=true): Shows 1 page, width = page width
  // - In spread mode (usePortrait=false): Shows 2 pages, total spread = width * 2
  // 
  // So for desktop spread mode, we pass HALF the desired spread width.
  // ============================================================
  const getBookDimensions = (): { width: number; height: number } => {
    if (!isClient) {
      return { width: 400, height: 600 };
    }
    
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const isLandscape = screenWidth > screenHeight;
    
    // ===================
    // MOBILE DEVICES (Portrait Mode - Single Page)
    // usePortrait={true} means width = actual page width displayed
    // ===================
    if (isMobile) {
      if (isLandscape) {
        // Mobile Landscape: Single page, maximize space
        // Use 90% of screen height, calculate width from single page aspect ratio
        const maxHeight = Math.floor(screenHeight * 0.90);
        const singlePageAspectRatio = 0.75; // Taller than wide (portrait page)
        const widthFromHeight = Math.floor(maxHeight * singlePageAspectRatio);
        const maxWidth = Math.floor(screenWidth * 0.60); // Don't exceed 60% in landscape
        
        if (widthFromHeight > maxWidth) {
          return {
            width: maxWidth,
            height: Math.floor(maxWidth / singlePageAspectRatio),
          };
        }
        return {
          width: widthFromHeight,
          height: maxHeight,
        };
      }
      
      // Mobile Portrait: Single page, nearly full screen
      // 95% width, 82% height (leave room for controls)
      return {
        width: Math.floor(screenWidth * 0.95),
        height: Math.floor(screenHeight * 0.82),
      };
    }
    
    // ===================
    // DESKTOP (Spread Mode - Two Pages Side by Side)
    // usePortrait={false} means the book shows 2 pages
    // Total spread width = width prop * 2
    // So we pass HALF the desired spread width
    // ===================
    
    // Target: Open book spread should be ~78% of screen width
    // For 1920px screen: spread = 1498px (target: 1400-1500px)
    const targetSpreadWidth = Math.floor(screenWidth * 0.78);
    
    // Single page width = half of spread (this is what we pass to the component)
    const singlePageWidth = Math.floor(targetSpreadWidth / 2);
    
    // Single page aspect ratio: width/height
    // For target 1450px spread × 850px height:
    // Single page = 725px × 850px = 0.85 aspect ratio
    const singlePageAspectRatio = 0.85;
    
    // Calculate height from single page width
    const pageHeight = Math.floor(singlePageWidth / singlePageAspectRatio);
    
    // Ensure height doesn't exceed 82% of screen (target: 800-900px for 1080p)
    const maxAllowedHeight = Math.floor(screenHeight * 0.82);
    
    // If calculated height is too tall, constrain by height and recalculate width
    if (pageHeight > maxAllowedHeight) {
      const finalHeight = maxAllowedHeight;
      const finalSinglePageWidth = Math.floor(finalHeight * singlePageAspectRatio);
      return {
        width: finalSinglePageWidth,
        height: finalHeight,
      };
    }
    
    return {
      width: singlePageWidth,
      height: pageHeight,
    };
  };

  const dimensions = getBookDimensions();

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onMouseMove={() => setShowNavigation(true)}
      onMouseLeave={() => setShowNavigation(false)}
    >
      {/* Close Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Book Container */}
      <div className="relative flex items-center justify-center">
        {/* Left Navigation Arrow */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'absolute left-4 md:-left-16 z-40',
            'text-white/70 hover:text-white hover:bg-white/10',
            'transition-opacity duration-300',
            showNavigation || isMobile ? 'opacity-100' : 'opacity-0',
            currentPage === 0 && 'invisible'
          )}
          onClick={handlePrevPage}
          disabled={isFlipping || currentPage === 0}
        >
          <ChevronLeft className="h-12 w-12 md:h-8 md:w-8" />
        </Button>

        {/* FlipBook - NO PIXEL CAPS */}
        <HTMLFlipBook
          ref={bookRef}
          width={dimensions.width}
          height={dimensions.height}
          size="stretch"
          minWidth={280}
          maxWidth={2400}
          minHeight={400}
          maxHeight={1800}
          showCover={true}
          mobileScrollSupport={true}
          onFlip={onFlip}
          onChangeState={onChangeState}
          className="shadow-2xl"
          style={{
            boxShadow: `0 25px 50px -12px ${bookStyle.shadowColor}`,
          }}
          startPage={0}
          drawShadow={true}
          flippingTime={bookStyle.animationDuration}
          usePortrait={isMobile}
          startZIndex={0}
          autoSize={true}
          maxShadowOpacity={0.5}
          showPageCorners={true}
          disableFlipByClick={false}
          swipeDistance={30}
          clickEventForward={true}
          useMouseEvents={true}
        >
          {/* Page 0: Cover */}
          <PageWrapper>
            <BookCover
              title={storybook.title}
              coverImage={coverImage}
              audience={storybook.audience}
            />
          </PageWrapper>

          {/* Page 1: Title Page */}
          <PageWrapper>
            <BookPage
              type="title"
              title={storybook.title}
              audience={storybook.audience}
            />
          </PageWrapper>

          {/* Content Pages */}
          {bookPages.map((pageContent, index) => (
            <PageWrapper key={`content-${index}`}>
              <BookPage
                type="content"
                pageData={{
                  pageNumber: index + 1,
                  scenes: pageContent.scenes,
                }}
                audience={storybook.audience}
                pageNumber={index + 1}
                totalPages={bookPages.length}
              />
            </PageWrapper>
          ))}

          {/* End Page */}
          <PageWrapper>
            <BookPage
              type="end"
              title={storybook.title}
              audience={storybook.audience}
            />
          </PageWrapper>
        </HTMLFlipBook>

        {/* Right Navigation Arrow */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'absolute right-4 md:-right-16 z-40',
            'text-white/70 hover:text-white hover:bg-white/10',
            'transition-opacity duration-300',
            showNavigation || isMobile ? 'opacity-100' : 'opacity-0',
            currentPage >= totalPages - 1 && 'invisible'
          )}
          onClick={handleNextPage}
          disabled={isFlipping || currentPage >= totalPages - 1}
        >
          <ChevronRight className="h-12 w-12 md:h-8 md:w-8" />
        </Button>
      </div>

      {/* Bottom Controls */}
      <div className={cn(
        'absolute bottom-4 left-1/2 -translate-x-1/2',
        'flex items-center',
        'bg-black/50 backdrop-blur-sm rounded-full',
        'text-white/90',
        isMobile ? 'gap-2 px-3 py-2' : 'gap-4 px-6 py-3'
      )}>
        {/* Page Indicator */}
        <span className={cn(
          'font-medium',
          isMobile ? 'text-xs' : 'text-sm'
        )}>
          {currentPage === 0 ? 'Cover' : 
           currentPage === 1 ? 'Title' :
           currentPage >= totalPages - 1 ? 'The End' :
           `Page ${displayPageNumber} of ${displayTotalPages}`}
        </span>

        {/* Divider */}
        <div className="w-px h-4 bg-white/30" />

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {onRate && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'text-white/80 hover:text-white hover:bg-white/10',
                isMobile && 'px-2 py-1 h-7 text-xs'
              )}
              onClick={() => {
                onClose();
                onRate();
              }}
            >
              <Star className={cn('mr-1', isMobile ? 'h-3 w-3' : 'h-4 w-4')} />
              Rate
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'text-white/80 hover:text-white hover:bg-white/10',
              isMobile && 'px-2 py-1 h-7 text-xs'
            )}
            onClick={async () => {
              const shareData = {
                title: storybook.title,
                text: `Check out "${storybook.title}" - A StoryCanvas Creation`,
                url: window.location.href,
              };
              
              try {
                if (navigator.share && navigator.canShare?.(shareData)) {
                  await navigator.share(shareData);
                } else {
                  await navigator.clipboard.writeText(window.location.href);
                  alert('Link copied to clipboard!');
                }
              } catch (err: any) {
                if (err.name !== 'AbortError') {
                  await navigator.clipboard.writeText(window.location.href);
                  alert('Link copied to clipboard!');
                }
              }
            }}
          >
            <Share2 className={cn('mr-1', isMobile ? 'h-3 w-3' : 'h-4 w-4')} />
            Share
          </Button>
        </div>
      </div>

      {/* Touch/Swipe hints for mobile */}
      {isMobile && currentPage < 3 && (
        <div 
          className={cn(
            'absolute bottom-24 left-1/2 -translate-x-1/2 text-white/60 text-sm',
            'transition-opacity duration-500',
            showHint ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
        >
          Swipe or tap edges to turn pages
        </div>
      )}
    </div>
  );
}

export default BookViewer;