declare module 'react-pageflip' {
  import { ComponentType, ReactNode, RefObject } from 'react';

  interface PageFlip {
    flip: (pageNum: number, corner?: string) => void;
    flipNext: (corner?: string) => void;
    flipPrev: (corner?: string) => void;
    turnToPage: (pageNum: number) => void;
    turnToNextPage: () => void;
    turnToPrevPage: () => void;
    getPageCount: () => number;
    getCurrentPageIndex: () => number;
    getOrientation: () => string;
    getBoundsRect: () => DOMRect;
  }

  interface IEventObject {
    data: any;
    object: PageFlip;
  }

  interface HTMLFlipBookProps {
    // Size settings
    width: number;
    height: number;
    size?: 'fixed' | 'stretch';
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;

    // Display settings
    showCover?: boolean;
    mobileScrollSupport?: boolean;
    showPageCorners?: boolean;
    disableFlipByClick?: boolean;

    // Animation settings
    flippingTime?: number;
    drawShadow?: boolean;
    maxShadowOpacity?: number;
    swipeDistance?: number;

    // Rendering settings
    startPage?: number;
    startZIndex?: number;
    autoSize?: boolean;
    usePortrait?: boolean;

    // Events
    clickEventForward?: boolean;
    useMouseEvents?: boolean;

    // Callbacks
    onFlip?: (e: IEventObject) => void;
    onChangeOrientation?: (e: IEventObject) => void;
    onChangeState?: (e: IEventObject) => void;
    onInit?: (e: IEventObject) => void;
    onUpdate?: (e: IEventObject) => void;

    // Style
    className?: string;
    style?: React.CSSProperties;

    // Children
    children: ReactNode;
  }

  interface HTMLFlipBookRef {
    pageFlip: () => PageFlip | null;
  }

  const HTMLFlipBook: React.ForwardRefExoticComponent<
    HTMLFlipBookProps & React.RefAttributes<HTMLFlipBookRef>
  >;

  export default HTMLFlipBook;
  export { PageFlip, HTMLFlipBookProps, HTMLFlipBookRef, IEventObject };
}
