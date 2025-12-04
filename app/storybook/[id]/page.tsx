'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Printer, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { getClientSupabase } from '@/lib/supabase/client';
import { api } from '@/lib/api';

interface Scene {
  description: string;
  narration?: string;           // ✅ ADD: 20-40 word narrative text
  emotion: string;
  generatedImage: string;
  imagePrompt?: string;
  panelNumber?: number;
  pageNumber?: number;
  panelType?: string;
  characterAction?: string;
  narrativePurpose?: string;
  visualPriority?: string;
  dialogue?: string;
  hasSpeechBubble?: boolean;
  environmentalContext?: string;
  professionalStandards?: boolean;
  imageGenerated?: boolean;
  characterDNAUsed?: boolean;
  environmentalDNAUsed?: boolean;
}

interface Page {
  pageNumber: number;
  scenes: Scene[];
}

interface Storybook {
  id: string;
  title: string;
  story: string;
  pages: Page[];
  audience: 'children' | 'young_adults' | 'adults';
  character_description?: string;
  is_paid: boolean;
}

const audienceLabels = {
  children: 'For Children',
  young_adults: 'For Young Adults',
  adults: 'For Adults'
};

const audienceStyles = {
  children: {
    container: 'gap-8 p-8',
    card: 'rounded-3xl shadow-lg border-4',
    image: 'rounded-2xl',
    text: 'text-xl font-comic leading-relaxed',
    emotion: 'text-lg font-medium text-primary',
    grid: 'grid-cols-1 md:grid-cols-2 gap-8',
  },
  young_adults: {
    container: 'gap-6 p-6',
    card: 'rounded-xl shadow-md border-2',
    image: 'rounded-lg',
    text: 'text-base font-medium leading-snug',
    emotion: 'text-sm font-semibold text-muted-foreground',
    grid: 'grid-cols-1 md:grid-cols-3 gap-6',
  },
  adults: {
    container: 'gap-4 p-4',
    card: 'rounded-md shadow-sm border',
    image: 'rounded-sm',
    text: 'text-sm font-serif leading-tight',
    emotion: 'text-xs font-medium text-muted-foreground',
    grid: 'grid-cols-1 md:grid-cols-4 gap-4',
  },
};

export default function StorybookPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [storybook, setStorybook] = useState<Storybook | null>(null);
  const [loading, setLoading] = useState(true);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [submittingPrint, setSubmittingPrint] = useState(false);
  const supabase = getClientSupabase();

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    async function fetchStorybook() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('No access token available');
        }

        const storybookId = Array.isArray(params.id) ? params.id[0] : params.id;
        const { storybook: data } = await api.getUserStorybookById(storybookId, session.access_token);
        setStorybook(data);
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message || 'Failed to load storybook',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchStorybook();
  }, [user, params.id, router, supabase, toast]);

  const handlePrintRequest = async () => {
    if (!user || !storybook) return;
    
    setSubmittingPrint(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No access token available');
      }

      await api.requestPrint(storybook.id, session.access_token);

      toast({
        title: 'Print Request Received',
        description: "We'll contact you shortly to complete the order.",
      });
      setPrintDialogOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to submit print request',
      });
    } finally {
      setSubmittingPrint(false);
    }
  };

  if (!user) {
    return null;
  }

  const getGridCols = (sceneCount: number) => {
    switch (sceneCount) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-1 sm:grid-cols-2';
      case 3:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
      default:
        return 'grid-cols-1';
    }
  };

  const isComplete = storybook?.pages?.every((page: Page) => 
    page.scenes?.every((scene: Scene) => scene.generatedImage)
  );

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/storybook/library')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Library
          </Button>
          <div>
            <h1 className="text-4xl font-bold">
              {loading ? (
                <div className="h-9 w-64 bg-muted animate-pulse rounded" />
              ) : (
                storybook?.title || 'Storybook'
              )}
            </h1>
            {storybook?.audience && (
              <Badge className="mt-2">
                {audienceLabels[storybook.audience as keyof typeof audienceLabels]}
              </Badge>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-8">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="h-6 w-32 bg-muted animate-pulse rounded" />
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[1, 2].map((j) => (
                      <div key={j} className="h-64 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : storybook ? (
          <div className="space-y-12">
            {/* Character DNA hidden - used only for AI generation backend */}

            <Card>
  <CardHeader className="bg-primary text-primary-foreground">
    <CardTitle className="flex items-center justify-between">
      <span>Your Comic Book</span>
      <span className="text-sm font-normal">
        {storybook.pages.length} Pages • {storybook.pages.flatMap(page => page.scenes).length} Panels
      </span>
    </CardTitle>
  </CardHeader>
  <CardContent className="p-6">
    <div className="space-y-8">
      {storybook.pages.map((page: Page, pageIndex: number) => (
        <Card key={pageIndex} className="overflow-hidden border-2">
          <CardHeader className="bg-primary/5 border-b py-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span>Page {pageIndex + 1}</span>
              <Badge variant="outline">{page.scenes.length} Panels</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4">
              {page.scenes.map((scene: Scene, sceneIndex: number) => {
                // Calculate global panel number across all pages
                const globalPanelNumber = storybook.pages
                  .slice(0, pageIndex)
                  .reduce((sum, p) => sum + p.scenes.length, 0) + sceneIndex + 1;
                
                return (
                  <div
                    key={sceneIndex}
                    className="relative aspect-[4/3] rounded-lg overflow-hidden border-2 border-primary/20 hover:border-primary/40 transition-all group"
                  >
                    {/* Panel number badge */}
                    <div className="absolute top-2 left-2 z-10 bg-primary text-primary-foreground text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shadow-lg">
                      {globalPanelNumber}
                    </div>
                    
                    {/* Panel image */}
                    {scene.generatedImage ? (
                      <img
                        src={scene.generatedImage}
                        alt={`Panel ${globalPanelNumber}`}
                        className="w-full h-full object-cover"
                        onLoad={() => console.log('✅ Panel loaded:', globalPanelNumber, scene.generatedImage)}
                        onError={(e) => {
                          console.error('❌ Panel failed to load:', {
                            url: scene.generatedImage,
                            panel: globalPanelNumber,
                            page: pageIndex + 1,
                            scene: sceneIndex + 1
                          });
                          // Show placeholder
                          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="18" fill="%23999"%3EPanel Not Available%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <p className="text-muted-foreground text-sm">Panel not generated</p>
                      </div>
                    )}
                    
                    {/* Narration overlay - appears on hover */}
                    {scene.narration && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <p className="text-white text-sm leading-relaxed">
                          {scene.narration}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </CardContent>
</Card>

            <div className="flex justify-center space-x-4">
              {isComplete && (
                <Button
                  onClick={() => setPrintDialogOpen(true)}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Professionally ($40)
                </Button>
              )}
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Storybook not found</p>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request Professional Print</AlertDialogTitle>
            <AlertDialogDescription>
              We'll print and ship a high-quality version of your storybook. This service costs $40. Would you like to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePrintRequest}
              disabled={submittingPrint}
              className="bg-primary hover:bg-primary/90"
            >
              {submittingPrint ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm Print Request'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}