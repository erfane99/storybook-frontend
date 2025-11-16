'use client';

import { Trophy, Award, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QualityBadgeProps } from '@/types/quality';

const gradeColors = {
  'A+': 'from-yellow-400 to-amber-500 text-yellow-900',
  'A': 'from-green-400 to-emerald-500 text-green-900',
  'A-': 'from-blue-400 to-blue-500 text-blue-900',
  'B+': 'from-blue-400 to-cyan-500 text-blue-900',
  'B': 'from-amber-300 to-yellow-400 text-amber-900',
  'B-': 'from-amber-400 to-orange-400 text-amber-900',
  'C+': 'from-orange-400 to-orange-500 text-orange-900',
  'C': 'from-red-400 to-rose-500 text-red-900',
  'C-': 'from-red-500 to-rose-600 text-red-900',
  'F': 'from-red-600 to-rose-700 text-red-100',
};

const gradeIcons = {
  'A+': Trophy,
  'A': Award,
  'A-': Star,
  'B+': Star,
  'B': null,
  'B-': null,
  'C+': null,
  'C': null,
  'C-': null,
  'F': null,
};

export function QualityBadge({ grade, score }: QualityBadgeProps) {
  const Icon = gradeIcons[grade];
  const isPremium = grade === 'A+' || grade === 'A';

  return (
    <div className="flex justify-center mb-8">
      <div
        className={cn(
          'relative rounded-2xl p-8 md:p-12 shadow-2xl bg-gradient-to-br',
          gradeColors[grade],
          'transform transition-all duration-300 hover:scale-105'
        )}
      >
        {isPremium && Icon && (
          <div className="absolute -top-4 -right-4 bg-white rounded-full p-3 shadow-lg animate-pulse">
            <Icon className="h-8 w-8 text-yellow-500" />
          </div>
        )}

        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-4">
            <div className="text-7xl md:text-8xl font-black leading-none tracking-tight">
              {grade}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-4xl md:text-5xl font-bold">
              {score}%
            </div>
            <div className="text-sm md:text-base font-medium opacity-90">
              Overall Quality Score
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
