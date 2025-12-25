'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Printer, Loader2, Star, MessageSquare, BookOpen } from 'lucide-react';
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
import { BookViewer } from '@/components/storybook/BookViewer';
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
  // NEW: Spiegelman emotional weight for dynamic panel sizing (1-10 scale)
  emotionalWeight?: number;
  // NEW: Silent panel flag - panel has no text
  isSilent?: boolean;
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
  cover_image?: string;
  is_paid: boolean;
}

const audienceLabels = {
  children: 'For Children',
  young_adults: 'For Young Adults',
  adults: 'For Adults'
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
  const [bookViewerOpen, setBookViewerOpen] = useState(false);
  const readingStartTimeRef = useRef<number>(Date.now());
  const supabase = getClientSupabase();

  // Check if storybook is complete (all panels generated)
  const isComplete = storybook?.pages?.every((page: Page) => 
    page.scenes?.every((scene: Scene) => scene.generatedImage)
  );

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

  // Auto-open BookViewer when storybook is complete
  useEffect(() => {
    if (!loading && storybook && isComplete && !bookViewerOpen) {
      setBookViewerOpen(true);
    }
  }, [loading, storybook, isComplete]);

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

            {/* Hero Card - Primary Storybook Experience */}
            <Card className="overflow-hidden border-2 shadow-lg">
              {/* Cover Image or Gradient Placeholder */}
              <div className="relative h-64 sm:h-80 lg:h-96 overflow-hidden">
                {storybook.cover_image ? (
                  <img
                    src={storybook.cover_image}
                    alt={storybook.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/80 via-primary to-primary/60" />
                )}
                {/* Overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                
                {/* Title and Badge positioned over image */}
                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                  <Badge className="mb-3 bg-white/90 text-primary hover:bg-white">
                    {audienceLabels[storybook.audience as keyof typeof audienceLabels]}
                  </Badge>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white drop-shadow-lg">
                    {storybook.title}
                  </h2>
                  <p className="text-white/80 mt-2 text-sm sm:text-base">
                    {storybook.pages.length} Pages • {storybook.pages.flatMap(page => page.scenes).length} Panels
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  {isComplete && (
                    <>
                      <Button
                        size="lg"
                        onClick={() => setBookViewerOpen(true)}
                        className="w-full sm:w-auto text-lg px-8 py-6"
                      >
                        <BookOpen className="h-5 w-5 mr-2" />
                        📖 Read Your Story
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => setPrintDialogOpen(true)}
                        className="w-full sm:w-auto"
                      >
                        <Printer className="h-5 w-5 mr-2" />
                        Print Professionally ($40)
                      </Button>
                    </>
                  )}
                  {!isComplete && (
                    <div className="text-center text-muted-foreground">
                      <p className="text-lg font-medium">Your storybook is still being generated...</p>
                      <p className="text-sm mt-1">Come back soon to read the complete story!</p>
                    </div>
                  )}
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

      {/* Book Viewer Modal */}
      {bookViewerOpen && storybook && (
        <BookViewer
          storybook={{
            id: storybook.id,
            title: storybook.title,
            coverImage: storybook.cover_image,
            pages: storybook.pages,
            audience: storybook.audience,
          }}
          onClose={() => setBookViewerOpen(false)}
          onRate={() => setRatingModalOpen(true)}
        />
      )}
    </div>
  );
}