'use client';

import { useEffect, useState } from 'react';
import { Medal, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { QualityCertificateProps } from '@/types/quality';

export function QualityCertificate({ grade, score }: QualityCertificateProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (grade === 'A+' && score >= 90) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [grade, score]);

  if (score < 90) {
    return null;
  }

  return (
    <Card
      className={cn(
        'relative overflow-hidden p-6 md:p-8',
        'bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50',
        'dark:from-yellow-950/20 dark:via-amber-950/20 dark:to-orange-950/20',
        'border-2 border-yellow-400/50',
        'shadow-xl',
        'animate-in fade-in slide-in-from-bottom-4 duration-500'
      )}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-400/20 to-transparent rounded-full -translate-y-16 translate-x-16" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-orange-400/20 to-transparent rounded-full translate-y-12 -translate-x-12" />

      <div className="relative flex items-center gap-6">
        <div className="flex-shrink-0">
          <div
            className={cn(
              'p-4 rounded-full',
              'bg-gradient-to-br from-yellow-400 to-amber-500',
              'shadow-lg',
              showConfetti && 'animate-bounce'
            )}
          >
            <Medal className="h-12 w-12 md:h-16 md:w-16 text-white" />
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <h3 className="text-2xl md:text-3xl font-bold text-yellow-900 dark:text-yellow-100">
              Premium Quality Certified
            </h3>
          </div>
          <p className="text-base md:text-lg text-yellow-800 dark:text-yellow-200">
            This storybook meets our highest professional standards with a score of {score}%
          </p>
          {grade === 'A+' && (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-400/30 rounded-full">
              <Sparkles className="h-4 w-4 text-yellow-700 dark:text-yellow-300" />
              <span className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
                Exceptional Quality
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
