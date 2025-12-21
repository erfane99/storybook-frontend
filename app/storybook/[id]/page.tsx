'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Printer, Loader2, Star, MessageSquare } from 'lucide-react';
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
import { RatingModal, RatingData } from '@/components/storybook/RatingModal';
import { FeedbackModal } from '@/components/storybook/FeedbackModal';
import { ExistingRating } from '@/components/storybook/ExistingRating';
// DEPRECATED: Speech bubbles are now generated directly by Gemini in panel images
// import { SpeechBubble } from '@/components/storybook/SpeechBubble';

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
  speechBubbleStyle?: 'speech' | 'thought' | 'shout' | 'whisper' | 'narrative';
  // NEW: AI-driven speech bubble positioning
  speakerName?: string;
  speakerPosition?: 'left' | 'center' | 'right';
  bubblePosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center';
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
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [existingRating, setExistingRating] = useState<RatingData | null>(null);
  const readingStartTimeRef = useRef<number>(Date.now());
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

  // Fetch existing rating after storybook loads
  useEffect(() => {
    if (!storybook || !user) return;

    async function fetchRating() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const storybookId = Array.isArray(params.id) ? params.id[0] : params.id;
        const response = await api.getStorybookRating(storybookId, session.access_token);
        if (response.rating) {
          setExistingRating(response.rating);
        }
      } catch (error: any) {
        // 404 is expected when no rating exists
        if (error.status !== 404) {
          console.error('Failed to fetch rating:', error);
        }
      }
    }

    fetchRating();
  }, [storybook, user, params.id, supabase]);

  const handleRatingSubmit = async (ratingData: RatingData) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No access token available');
      }

      const storybookId = Array.isArray(params.id) ? params.id[0] : params.id;
      await api.rateStorybook(storybookId, ratingData, session.access_token);

      // Refresh rating after submission
      const response = await api.getStorybookRating(storybookId, session.access_token);
      if (response.rating) {
        setExistingRating(response.rating);
      }

      toast({
        title: 'Thank you for your feedback!',
        description: 'Your rating helps improve our AI generation.',
      });
    } catch (error: any) {
      throw new Error(error.message || 'Failed to submit rating');
    }
  };

  const handleRatingModalClose = (open: boolean) => {
    setRatingModalOpen(open);
  };

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
      <div className="container max-w-7xl 2xl:max-w-[1600px]">
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
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
              {page.scenes.map((scene: Scene, sceneIndex: number) => {
                // Calculate global panel number across all pages
                const globalPanelNumber = storybook.pages
                  .slice(0, pageIndex)
                  .reduce((sum, p) => sum + p.scenes.length, 0) + sceneIndex + 1;
                
                return (
                  <div key={sceneIndex} className="flex flex-col gap-2 sm:gap-3">
  {/* Panel Image Container - Responsive sizing */}
  <div className="relative aspect-[4/3] sm:aspect-[4/3] lg:aspect-[16/10] xl:aspect-[4/3] rounded-lg overflow-hidden border-2 border-primary/20 hover:border-primary/40 transition-all shadow-sm hover:shadow-md">
    {/* Panel number badge - Responsive sizing */}
    <div className="absolute top-2 left-2 z-10 bg-primary text-primary-foreground text-xs sm:text-sm font-bold rounded-full w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 flex items-center justify-center shadow-lg">
      {globalPanelNumber}
    </div>
    
    {/* Panel image - FULL visibility, no overlay */}
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
          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="18" fill="%23999"%3EPanel Not Available%3C/text%3E%3C/svg%3E';
        }}
      />
    ) : (
      <div className="w-full h-full bg-muted flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Panel not generated</p>
      </div>
    )}

    {/* REMOVED: Speech bubbles are now rendered directly in panel images by Gemini */}
    {/* This eliminates duplicate bubbles (one in image, one as HTML overlay) */}
  </div>
  
  {/* Narration Caption - BELOW image, professional comic book style, responsive */}
{scene.narration && (
  <div className="bg-black rounded-md p-2 sm:p-3 lg:p-4 border-2 border-yellow-400/80">
    <p className="text-white text-xs sm:text-sm lg:text-base leading-relaxed text-center font-medium">
      {(() => {
        // Strip dialogue from narration if it's already in a speech bubble
        if (scene.hasSpeechBubble && scene.dialogue) {
          // Remove the dialogue and any surrounding quotes/attribution
          let cleanedNarration = scene.narration;
          
          // Remove exact dialogue match (with or without quotes)
          cleanedNarration = cleanedNarration
            .replace(new RegExp(`["']${scene.dialogue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'gi'), '')
            .replace(new RegExp(`${scene.dialogue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi'), '');
          
          // Clean up common dialogue attribution patterns
          cleanedNarration = cleanedNarration
            .replace(/\s*,?\s*(she|he|they|it)\s+(said|says|shouted|shouts|whispered|whispers|thought|thinks|asked|asks|exclaimed|exclaims|replied|replies|responded|responds|declared|declares|called|calls)\.?\s*/gi, '')
            .replace(/\s*,?\s*with\s+(determination|excitement|fear|joy|sadness|concern|hope|wonder|curiosity|confidence)\s*/gi, '');
          
          // Clean up extra spaces, punctuation
          cleanedNarration = cleanedNarration
            .replace(/\s+/g, ' ')
            .replace(/\s+([.,!?])/g, '$1')
            .replace(/^\s*[.,!?]\s*/g, '')
            .trim();
          
          // If cleaning removed everything, hide narration entirely
          if (cleanedNarration.length < 10) {
            return null;
          }
          
          return cleanedNarration;
        }
        
        // No speech bubble, return narration as-is
        return scene.narration;
      })()}
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

            {/* Rating & Feedback Section */}
            {isComplete && (
              <div className="space-y-6">
                {existingRating ? (
                  <>
                    <ExistingRating
                      rating={existingRating}
                      onUpdateClick={() => setRatingModalOpen(true)}
                    />
                    <div className="flex justify-center">
                      <Button
                        variant="outline"
                        onClick={() => setFeedbackModalOpen(true)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Suggest Improvements
                      </Button>
                    </div>
                  </>
                ) : (
                  <Card>
                    <CardContent className="py-8">
                      <div className="text-center space-y-4">
                        <h3 className="text-xl font-semibold">How was your storybook?</h3>
                        <p className="text-muted-foreground">
                          Your feedback helps us create better stories for you
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          <Button
                            size="lg"
                            onClick={() => setRatingModalOpen(true)}
                          >
                            <Star className="h-5 w-5 mr-2 fill-current" />
                            Rate This Storybook
                          </Button>
                          <Button
                            size="lg"
                            variant="outline"
                            onClick={() => setFeedbackModalOpen(true)}
                          >
                            <MessageSquare className="h-5 w-5 mr-2" />
                            Suggest Improvements
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

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

      {/* Rating Modal */}
      <RatingModal
        open={ratingModalOpen}
        onOpenChange={handleRatingModalClose}
        storybookId={Array.isArray(params.id) ? params.id[0] : params.id}
        existingRating={existingRating}
        onSubmit={handleRatingSubmit}
        readingStartTime={readingStartTimeRef.current}
      />

      {/* Feedback Modal */}
      <FeedbackModal
        open={feedbackModalOpen}
        onOpenChange={setFeedbackModalOpen}
        storybookId={Array.isArray(params.id) ? params.id[0] : params.id}
        onSubmitSuccess={() => {
          toast({
            title: 'Feedback Received',
            description: "Thank you! We'll use this to improve your next storybook.",
          });
        }}
      />
    </div>
  );
}