'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { X, ChevronLeft, ChevronRight, Share2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BookPage } from './BookPage';
import { BookCover } from './BookCover';
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
  const [currentPage, setCurrentPage] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);

  // Get cover image (handle both naming conventions)
  const coverImage = storybook.coverImage || storybook.cover_image;

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
  }, []);

  const onChangeState = useCallback((e: any) => {
    setIsFlipping(e.data === 'flipping');
  }, []);

  // Calculate display page number (accounting for cover and title)
  const displayPageNumber = Math.max(1, currentPage - 1);
  const displayTotalPages = totalPages - 2; // Exclude cover and title from count

  // Determine book dimensions based on screen size
  const getBookDimensions = () => {
    if (isMobile) {
      return {
        width: Math.min(window.innerWidth - 32, 400),
        height: Math.min(window.innerHeight - 120, 600),
      };
    }
    return {
      width: Math.min(window.innerWidth * 0.35, 450),
      height: Math.min(window.innerHeight - 120, 650),
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
          <ChevronLeft className="h-8 w-8" />
        </Button>

        {/* FlipBook */}
        <HTMLFlipBook
          ref={bookRef}
          width={dimensions.width}
          height={dimensions.height}
          size="stretch"
          minWidth={300}
          maxWidth={500}
          minHeight={400}
          maxHeight={700}
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
          <ChevronRight className="h-8 w-8" />
        </Button>
      </div>

      {/* Bottom Controls */}
      <div className={cn(
        'absolute bottom-4 left-1/2 -translate-x-1/2',
        'flex items-center gap-4 px-6 py-3',
        'bg-black/50 backdrop-blur-sm rounded-full',
        'text-white/90'
      )}>
        {/* Page Indicator */}
        <span className="text-sm font-medium">
          {currentPage === 0 ? 'Cover' : 
           currentPage === 1 ? 'Title' :
           currentPage >= totalPages - 1 ? 'The End' :
           `Page ${displayPageNumber} of ${displayTotalPages}`}
        </span>

        {/* Divider */}
        <div className="w-px h-4 bg-white/30" />

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {onRate && (
            <Button
              variant="ghost"
              size="sm"
              className="text-white/80 hover:text-white hover:bg-white/10"
              onClick={() => {
                onClose();
                onRate();
              }}
            >
              <Star className="h-4 w-4 mr-1" />
              Rate
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-white/80 hover:text-white hover:bg-white/10"
            onClick={() => {
              // Share functionality
              if (navigator.share) {
                navigator.share({
                  title: storybook.title,
                  text: `Check out "${storybook.title}" - A StoryCanvas Creation`,
                  url: window.location.href,
                });
              } else {
                // Fallback: copy to clipboard
                navigator.clipboard.writeText(window.location.href);
              }
            }}
          >
            <Share2 className="h-4 w-4 mr-1" />
            Share
          </Button>
        </div>
      </div>

      {/* Touch/Swipe hints for mobile */}
      {isMobile && currentPage === 0 && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-white/60 text-sm animate-pulse">
          Swipe or tap edges to turn pages
        </div>
      )}
    </div>
  );
}

export default BookViewer;
