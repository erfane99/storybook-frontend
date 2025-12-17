'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SpeechBubbleProps {
  dialogue: string;
  style?: 'speech' | 'thought' | 'shout' | 'whisper' | 'narrative';
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center';
  speakerPosition?: 'left' | 'center' | 'right';  // NEW: Where the speaker is in the panel
  className?: string;
}

/**
 * Determines the tail direction based on bubble position and speaker position
 * Professional comic convention: tail points TOWARD the speaker
 */
function getTailConfig(
  bubblePosition: string,
  speakerPosition?: string,
  style?: string
): {
  containerClass: string;
  tailClass: string;
  thoughtBubblesClass: string;
} {
  // For speech/shout bubbles - triangular tail
  // For thought bubbles - floating circles
  
  // Default: tail points toward center of panel (into the image)
  let tailDirection: 'left' | 'right' | 'center' | 'down' = 'center';
  
  // If speaker position is provided, tail points toward speaker
  if (speakerPosition) {
    if (speakerPosition === 'left') {
      tailDirection = 'left';
    } else if (speakerPosition === 'right') {
      tailDirection = 'right';
    } else {
      tailDirection = 'down'; // center speaker = tail points down
    }
  } else {
    // Fallback: infer from bubble position (tail points into panel)
    if (bubblePosition.includes('left')) {
      tailDirection = 'right'; // bubble on left, tail points right (into panel)
    } else if (bubblePosition.includes('right')) {
      tailDirection = 'left'; // bubble on right, tail points left (into panel)
    } else {
      tailDirection = 'down'; // center bubble, tail points down
    }
  }
  
  // Position classes for the tail container based on bubble position
  const isTop = bubblePosition.includes('top');
  const isBottom = bubblePosition.includes('bottom');
  const isLeft = bubblePosition.includes('left');
  const isRight = bubblePosition.includes('right');
  const isCenter = bubblePosition.includes('center');
  
  // Tail container positioning
  let containerClass = 'absolute ';
  if (isTop) {
    containerClass += '-bottom-2 ';
  } else if (isBottom) {
    containerClass += '-top-2 ';
  }
  
  // Horizontal positioning of tail
  if (tailDirection === 'left' || (isRight && !speakerPosition)) {
    containerClass += 'left-4';
  } else if (tailDirection === 'right' || (isLeft && !speakerPosition)) {
    containerClass += 'right-4';
  } else if (tailDirection === 'down' || isCenter) {
    containerClass += 'left-1/2 -translate-x-1/2';
  }
  
  // Tail CSS for speech bubble (triangular pointer)
  let tailClass = 'w-0 h-0 ';
  
  if (isTop) {
    // Tail at bottom of bubble, pointing down toward speaker
    if (tailDirection === 'left') {
      // Point down-left toward speaker on left
      tailClass += 'border-l-[6px] border-l-transparent border-r-[10px] border-r-transparent border-t-[12px] border-t-gray-800 transform -rotate-12';
    } else if (tailDirection === 'right') {
      // Point down-right toward speaker on right
      tailClass += 'border-l-[10px] border-l-transparent border-r-[6px] border-r-transparent border-t-[12px] border-t-gray-800 transform rotate-12';
    } else {
      // Point straight down
      tailClass += 'border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[12px] border-t-gray-800';
    }
  } else if (isBottom) {
    // Tail at top of bubble, pointing up toward speaker
    if (tailDirection === 'left') {
      tailClass += 'border-l-[6px] border-l-transparent border-r-[10px] border-r-transparent border-b-[12px] border-b-gray-800 transform rotate-12';
    } else if (tailDirection === 'right') {
      tailClass += 'border-l-[10px] border-l-transparent border-r-[6px] border-r-transparent border-b-[12px] border-b-gray-800 transform -rotate-12';
    } else {
      tailClass += 'border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[12px] border-b-gray-800';
    }
  }
  
  // Thought bubble circles positioning
  let thoughtBubblesClass = 'absolute flex gap-1 ';
  if (isTop) {
    thoughtBubblesClass += '-bottom-4 ';
  } else {
    thoughtBubblesClass += '-top-4 ';
  }
  
  if (tailDirection === 'left') {
    thoughtBubblesClass += 'left-4 flex-row-reverse';
  } else if (tailDirection === 'right') {
    thoughtBubblesClass += 'right-4';
  } else {
    thoughtBubblesClass += 'left-1/2 -translate-x-1/2';
  }
  
  return { containerClass, tailClass, thoughtBubblesClass };
}

export function SpeechBubble({ 
  dialogue, 
  style = 'speech', 
  position = 'top-right',
  speakerPosition,
  className 
}: SpeechBubbleProps) {
  if (!dialogue) return null;

  const positionClasses: Record<string, string> = {
    'top-left': 'top-2 left-2',
    'top-right': 'top-2 right-2',
    'top-center': 'top-2 left-1/2 -translate-x-1/2',
    'bottom-left': 'bottom-2 left-2',
    'bottom-right': 'bottom-2 right-2'
  };

  const styleClasses: Record<string, string> = {
    'speech': 'bg-white border-2 border-gray-800 rounded-2xl',
    'thought': 'bg-gray-100 border-2 border-gray-400 rounded-full',
    'shout': 'bg-yellow-100 border-[3px] border-red-600 rounded-lg font-bold uppercase',
    'whisper': 'bg-blue-50 border border-dashed border-gray-400 rounded-xl italic text-sm',
    'narrative': 'bg-amber-50 border border-amber-300 rounded-sm'
  };

  const tailConfig = getTailConfig(position, speakerPosition, style);

  return (
    <div 
      className={cn(
        'absolute z-20 max-w-[60%] px-3 py-2 text-sm shadow-lg',
        positionClasses[position] || positionClasses['top-right'],
        styleClasses[style],
        className
      )}
    >
      <p className="text-gray-900 leading-tight">{dialogue}</p>
      
      {/* Speech bubble tail - triangular pointer toward speaker */}
      {style === 'speech' && (
        <div className={tailConfig.containerClass}>
          <div className={tailConfig.tailClass} />
        </div>
      )}
      
      {/* Shout bubble tail - similar to speech but more aggressive */}
      {style === 'shout' && (
        <div className={tailConfig.containerClass}>
          <div className={cn(tailConfig.tailClass, 'border-t-red-600')} />
        </div>
      )}
      
      {/* Thought bubble tail - floating circles toward speaker */}
      {style === 'thought' && (
        <div className={tailConfig.thoughtBubblesClass}>
          <div className="w-3 h-3 bg-gray-100 border-2 border-gray-400 rounded-full" />
          <div className="w-2 h-2 bg-gray-100 border border-gray-400 rounded-full" />
          <div className="w-1.5 h-1.5 bg-gray-100 border border-gray-400 rounded-full" />
        </div>
      )}
      
      {/* Whisper bubble - subtle indicator */}
      {style === 'whisper' && (
        <div className={cn(tailConfig.containerClass, 'opacity-50')}>
          <div className="w-2 h-2 bg-blue-50 border border-dashed border-gray-400 rounded-full" />
        </div>
      )}
    </div>
  );
}
