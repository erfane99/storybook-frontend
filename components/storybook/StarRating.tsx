'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
  description?: string;
  icon?: React.ReactNode;
}

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = 'md',
  className,
  label,
  description,
  icon,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  const handleClick = (rating: number) => {
    if (!readonly && onChange) {
      onChange(rating);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, rating: number) => {
    if (!readonly && onChange) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onChange(rating);
      } else if (event.key === 'ArrowLeft' && rating > 1) {
        event.preventDefault();
        onChange(rating - 1);
      } else if (event.key === 'ArrowRight' && rating < 5) {
        event.preventDefault();
        onChange(rating + 1);
      }
    }
  };

  const displayValue = hoverValue !== null ? hoverValue : value;

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <div className="flex items-center gap-2">
          {icon && <div className="text-muted-foreground">{icon}</div>}
          <div className="flex-1">
            <label className="text-sm font-medium leading-none">{label}</label>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        </div>
      )}
      <div
        className="flex items-center gap-1"
        onMouseLeave={() => !readonly && setHoverValue(null)}
        role="radiogroup"
        aria-label={label || 'Star rating'}
      >
        {[1, 2, 3, 4, 5].map((rating) => {
          const isFilled = rating <= displayValue;
          return (
            <button
              key={rating}
              type="button"
              onClick={() => handleClick(rating)}
              onMouseEnter={() => !readonly && setHoverValue(rating)}
              onKeyDown={(e) => handleKeyDown(e, rating)}
              disabled={readonly}
              className={cn(
                'transition-all duration-200 ease-in-out',
                !readonly && 'hover:scale-110 cursor-pointer',
                readonly && 'cursor-default',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded'
              )}
              aria-label={`${rating} star${rating !== 1 ? 's' : ''}`}
              aria-checked={rating === value}
              role="radio"
              tabIndex={readonly ? -1 : 0}
            >
              <Star
                className={cn(
                  sizeClasses[size],
                  'transition-all duration-200',
                  isFilled
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'fill-transparent text-gray-300 dark:text-gray-600',
                  !readonly && 'hover:text-yellow-300'
                )}
              />
            </button>
          );
        })}
        {value > 0 && (
          <span className="ml-2 text-sm font-medium text-muted-foreground">
            {value.toFixed(1)}
          </span>
        )}
      </div>
    </div>
  );
}
