'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { QualityScoreCardProps } from '@/types/quality';

export function QualityScoreCard({
  dimension,
  score,
  description,
  icon,
  index = 0,
}: QualityScoreCardProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const stars = Math.round((score / 100) * 5);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setAnimatedScore(score);
    }, index * 100);

    return () => clearTimeout(timeout);
  }, [score, index]);

  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-lg">
          <div className="p-2 bg-primary/10 rounded-lg">
            {icon}
          </div>
          <div className="flex-1">
            <div className="font-semibold">{dimension}</div>
            <div className="text-xs text-muted-foreground font-normal mt-1">
              {description}
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={cn(
                'h-5 w-5 transition-all duration-300',
                i < stars
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'fill-transparent text-gray-300'
              )}
            />
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Score</span>
            <span className="font-bold text-lg">{score}%</span>
          </div>
          <Progress
            value={animatedScore}
            className="h-2 transition-all duration-300 ease-out"
          />
        </div>
      </CardContent>
    </Card>
  );
}
