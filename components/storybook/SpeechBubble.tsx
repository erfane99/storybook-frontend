'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SpeechBubbleProps {
  dialogue: string;
  style?: 'speech' | 'thought' | 'shout' | 'whisper' | 'narrative';
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
}

export function SpeechBubble({ 
  dialogue, 
  style = 'speech', 
  position = 'top-right',
  className 
}: SpeechBubbleProps) {
  if (!dialogue) return null;

  const positionClasses = {
    'top-left': 'top-2 left-2',
    'top-right': 'top-2 right-2',
    'bottom-left': 'bottom-2 left-2',
    'bottom-right': 'bottom-2 right-2'
  };

  const styleClasses = {
    'speech': 'bg-white border-2 border-gray-800 rounded-2xl',
    'thought': 'bg-gray-100 border-2 border-gray-400 rounded-full',
    'shout': 'bg-yellow-100 border-3 border-red-600 rounded-lg font-bold',
    'whisper': 'bg-blue-50 border border-dashed border-gray-400 rounded-xl italic text-sm',
    'narrative': 'bg-amber-50 border border-amber-300 rounded-sm'
  };

  return (
    <div 
      className={cn(
        'absolute z-20 max-w-[60%] px-3 py-2 text-sm shadow-md',
        positionClasses[position],
        styleClasses[style],
        className
      )}
    >
      <p className="text-gray-900 leading-tight">{dialogue}</p>
      {/* Speech bubble tail */}
      {style === 'speech' && (
        <div className="absolute -bottom-2 left-4 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-gray-800" />
      )}
      {style === 'thought' && (
        <div className="absolute -bottom-3 left-6 flex gap-1">
          <div className="w-2 h-2 bg-gray-100 border border-gray-400 rounded-full" />
          <div className="w-1.5 h-1.5 bg-gray-100 border border-gray-400 rounded-full" />
        </div>
      )}
    </div>
  );
}
