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

const getPanelsPerBookPage = (audience: string): number => {
  switch (audience) {
    case 'children': return 4;
    case 'young_adults': return 4;
    case 'adults': return 4;
    default: return 4;
  }
};

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

export function BookViewer({ storybook, onClose, onRate }: BookViewerProps) {
  const bookRef = useRef<any>(null);
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
  
  const { isMobile, isClient } = useDevice();
  const coverImage = storybook.coverImage || storybook.cover_image;

  useEffect(() => {
    if (showHint && currentPage < 3) {
      const timer = setTimeout(() => setShowHint(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showHint, currentPage]);

  useEffect(() => {
    if (!isClient) return;
    const allScenes = storybook.pages.flatMap(page => page.scenes);
    const panelsPerPage = getPanelsPerBookPage(storybook.audience);
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

  const panelsPerPage = getPanelsPerBookPage(storybook.audience);
  const bookStyle = audienceBookStyles[storybook.audience] || audienceBookStyles.children;

  const allScenes = storybook.pages.flatMap((page, pageIdx) => 
    page.scenes.map((scene, sceneIdx) => ({
      ...scene,
      originalPage: pageIdx + 1,
      originalPanel: sceneIdx + 1,
    }))
  );

  const bookPages: Array<{ scenes: typeof allScenes }> = [];
  for (let i = 0; i < allScenes.length; i += panelsPerPage) {
    bookPages.push({ scenes: allScenes.slice(i, i + panelsPerPage) });
  }

  const totalPages = 2 + bookPages.length + 1;

  useEffect(() => {
    if (storybook.id && currentPage > 0) {
      localStorage.setItem(`reading-progress-${storybook.id}`, currentPage.toString());
    }
  }, [currentPage, storybook.id]);

  useEffect(() => {
    const savedPage = localStorage.getItem(`reading-progress-${storybook.id}`);
    if (savedPage && bookRef.current) {
      const pageNum = parseInt(savedPage, 10);
      if (pageNum > 0) {
        setTimeout(() => bookRef.current?.pageFlip()?.turnToPage(pageNum), 100);
      }
    }
  }, [storybook.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNextPage();
      else if (e.key === 'ArrowLeft') handlePrevPage();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleNextPage = useCallback(() => {
    if (bookRef.current && !isFlipping) bookRef.current.pageFlip()?.flipNext();
  }, [isFlipping]);

  const handlePrevPage = useCallback(() => {
    if (bookRef.current && !isFlipping) bookRef.current.pageFlip()?.flipPrev();
  }, [isFlipping]);

  const onFlip = useCallback((e: any) => {
    setCurrentPage(e.data);
    if (isMobile && navigator.vibrate) navigator.vibrate(10);
  }, [isMobile]);

  const onChangeState = useCallback((e: any) => {
    setIsFlipping(e.data === 'flipping');
  }, []);

  const displayPageNumber = Math.max(1, currentPage - 1);
  const displayTotalPages = totalPages - 2;

  // ============================================================
  // BOOK DIMENSIONS - FIXED MODE (NOT STRETCH)
  // ============================================================
  // 
  // KEY: react-pageflip width/height = SINGLE PAGE dimensions
  // - usePortrait={true} (mobile): Shows 1 page
  // - usePortrait={false} (desktop): Shows 2 pages side-by-side
  //
  // With size="fixed", the library uses EXACTLY what we specify
  // ============================================================
  const getBookDimensions = (): { width: number; height: number } => {
    if (!isClient) {
      return { width: 500, height: 700 };
    }
    
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // ===================
    // MOBILE (Single Page View)
    // ===================
    if (isMobile) {
      const isLandscape = screenWidth > screenHeight;
      
      if (isLandscape) {
        const targetHeight = Math.floor(screenHeight * 0.85);
        const singlePageRatio = 0.7;
        const targetWidth = Math.floor(targetHeight * singlePageRatio);
        const maxWidth = Math.floor(screenWidth * 0.50);
        
        if (targetWidth > maxWidth) {
          return {
            width: maxWidth,
            height: Math.floor(maxWidth / singlePageRatio),
          };
        }
        return { width: targetWidth, height: targetHeight };
      }
      
      // Mobile Portrait: Nearly full screen
      return {
        width: Math.floor(screenWidth * 0.94),
        height: Math.floor(screenHeight * 0.78),
      };
    }
    
    // ===================
    // DESKTOP (Two Pages Side by Side)
    // ===================
    // Target: Spread should be ~85% of screen width
    // Each page = half of spread width
    
    const targetSpreadWidth = Math.floor(screenWidth * 0.85);
    const singlePageWidth = Math.floor(targetSpreadWidth / 2);
    
    // Single page aspect ratio (width/height)
    // Book pages are taller than wide, so ratio < 1
    const singlePageRatio = 0.7;
    
    // Calculate height from single page width
    const calculatedHeight = Math.floor(singlePageWidth / singlePageRatio);
    
    // Cap height at 85% of screen
    const maxHeight = Math.floor(screenHeight * 0.85);
    
    if (calculatedHeight > maxHeight) {
      const constrainedPageWidth = Math.floor(maxHeight * singlePageRatio);
      return {
        width: constrainedPageWidth,
        height: maxHeight,
      };
    }
    
    return {
      width: singlePageWidth,
      height: calculatedHeight,
    };
  };

  const dimensions = getBookDimensions();

  // Debug log
  useEffect(() => {
    if (isClient) {
      console.log('📖 BookViewer Dimensions:', {
        screen: `${window.innerWidth}×${window.innerHeight}`,
        singlePage: `${dimensions.width}×${dimensions.height}`,
        spread: `${dimensions.width * 2}×${dimensions.height}`,
        isMobile,
      });
    }
  }, [dimensions, isMobile, isClient]);

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

      {/* Book Container - explicit dimensions for the book */}
      <div 
        className="relative flex items-center justify-center"
        style={{
          width: isMobile ? dimensions.width : dimensions.width * 2,
          height: dimensions.height,
        }}
      >
        {/* Left Navigation Arrow */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'absolute left-0 md:-left-16 z-40',
            'text-white/70 hover:text-white hover:bg-white/10',
            'transition-opacity duration-300',
            showNavigation || isMobile ? 'opacity-100' : 'opacity-0',
            currentPage === 0 && 'invisible'
          )}
          onClick={handlePrevPage}
          disabled={isFlipping || currentPage === 0}
        >
          <ChevronLeft className="h-10 w-10 md:h-8 md:w-8" />
        </Button>

        {/* ============================================================
            HTMLFlipBook - USING size="fixed" FOR RELIABLE SIZING
            ============================================================ */}
        <HTMLFlipBook
          ref={bookRef}
          width={dimensions.width}
          height={dimensions.height}
          size="fixed"
          minWidth={200}
          maxWidth={2000}
          minHeight={200}
          maxHeight={1500}
          showCover={true}
          mobileScrollSupport={true}
          onFlip={onFlip}
          onChangeState={onChangeState}
          className="shadow-2xl"
          style={{ boxShadow: `0 25px 50px -12px ${bookStyle.shadowColor}` }}
          startPage={0}
          drawShadow={true}
          flippingTime={bookStyle.animationDuration}
          usePortrait={isMobile}
          startZIndex={0}
          autoSize={false}
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
            'absolute right-0 md:-right-16 z-40',
            'text-white/70 hover:text-white hover:bg-white/10',
            'transition-opacity duration-300',
            showNavigation || isMobile ? 'opacity-100' : 'opacity-0',
            currentPage >= totalPages - 1 && 'invisible'
          )}
          onClick={handleNextPage}
          disabled={isFlipping || currentPage >= totalPages - 1}
        >
          <ChevronRight className="h-10 w-10 md:h-8 md:w-8" />
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
        <span className={cn('font-medium', isMobile ? 'text-xs' : 'text-sm')}>
          {currentPage === 0 ? 'Cover' : 
           currentPage === 1 ? 'Title' :
           currentPage >= totalPages - 1 ? 'The End' :
           `Page ${displayPageNumber} of ${displayTotalPages}`}
        </span>

        <div className="w-px h-4 bg-white/30" />

        <div className="flex items-center gap-1">
          {onRate && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'text-white/80 hover:text-white hover:bg-white/10',
                isMobile && 'px-2 py-1 h-7 text-xs'
              )}
              onClick={() => { onClose(); onRate(); }}
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

      {/* Mobile swipe hint */}
      {isMobile && currentPage < 3 && (
        <div className={cn(
          'absolute bottom-24 left-1/2 -translate-x-1/2 text-white/60 text-sm',
          'transition-opacity duration-500',
          showHint ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}>
          Swipe or tap edges to turn pages
        </div>
      )}
    </div>
  );
}

export default BookViewer;