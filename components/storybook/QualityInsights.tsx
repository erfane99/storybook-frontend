'use client';

import { useState } from 'react';
import { ChevronDown, Clock, FileCheck, RefreshCw, CheckCircle2, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { QualityInsightsProps } from '@/types/quality';

function formatTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds} seconds`;
  }
  return `${minutes} minute${minutes !== 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
}

export function QualityInsights({ generationMetrics }: QualityInsightsProps) {
  const [isOpen, setIsOpen] = useState(typeof window !== 'undefined' && window.innerWidth >= 768);

  const validationSuccessRate = generationMetrics.validationAttempts > 0
    ? Math.round((generationMetrics.validationSuccesses / generationMetrics.validationAttempts) * 100)
    : 0;

  const insights = [
    {
      icon: Clock,
      label: 'Processing Time',
      value: formatTime(generationMetrics.totalProcessingTime),
    },
    {
      icon: Layers,
      label: 'Total Panels',
      value: generationMetrics.totalPanels.toString(),
    },
    {
      icon: CheckCircle2,
      label: 'Validation Success Rate',
      value: `${validationSuccessRate}%`,
    },
    {
      icon: FileCheck,
      label: 'Validation Attempts',
      value: generationMetrics.validationAttempts.toString(),
    },
  ];

  if (generationMetrics.regenerationCount > 0) {
    insights.push({
      icon: RefreshCw,
      label: 'Regenerations',
      value: generationMetrics.regenerationCount.toString(),
    });
  }

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <span className="text-lg">Generation Details</span>
              <ChevronDown
                className={cn(
                  'h-5 w-5 transition-transform duration-200',
                  isOpen && 'transform rotate-180'
                )}
              />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent className="transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {insights.map((insight, index) => {
                const Icon = insight.icon;
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg"
                  >
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-muted-foreground">
                        {insight.label}
                      </div>
                      <div className="text-lg font-semibold">
                        {insight.value}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                This storybook was generated using advanced AI patterns with quality validation at each step.
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
