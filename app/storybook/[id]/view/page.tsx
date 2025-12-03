'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { ArrowLeft, Download, Lock, Share2, Loader2, Star, User, MapPin, BookOpen, Palette, Zap } from 'lucide-react';
import { getClientSupabase } from '@/lib/supabase/client';
import { api } from '@/lib/api';
import { RatingModal, RatingData } from '@/components/storybook/RatingModal';
import { ExistingRating } from '@/components/storybook/ExistingRating';
import { QualityBadge } from '@/components/storybook/QualityBadge';
import { QualityScoreCard } from '@/components/storybook/QualityScoreCard';
import { QualityInsights } from '@/components/storybook/QualityInsights';
import { QualityCertificate } from '@/components/storybook/QualityCertificate';
import type { QualityData } from '@/types/quality';

interface Scene {
  description: string;
  emotion: string;
  generatedImage: string;
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

export default function StorybookViewPage() {
  const params = useParams();
  const router = useRouter();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [storybook, setStorybook] = useState<Storybook | null>(null);
  const [loading, setLoading] = useState(true);
  const [existingRating, setExistingRating] = useState<RatingData | null>(null);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [loadingRating, setLoadingRating] = useState(false);
  const [qualityData, setQualityData] = useState<QualityData | null>(null);
  const [loadingQuality, setLoadingQuality] = useState(false);
  const [qualityError, setQualityError] = useState(false);
  const readingStartTimeRef = useRef<number>(Date.now());
  const autoShowTimerRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = getClientSupabase();

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (!user.email_confirmed_at) {
      router.push('/auth/verify');
      return;
    }

    async function fetchStorybook() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('No access token available');
        }

        const { storybook: data } = await api.getUserStorybookById(params.id as string, session.access_token);
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

  useEffect(() => {
    if (!storybook || !user) return;

    async function fetchRating() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const response = await api.getStorybookRating(params.id as string, session.access_token);
        if (response.rating) {
          setExistingRating(response.rating);
        }
      } catch (error: any) {
        if (error.status !== 404) {
          console.error('Failed to fetch rating:', error);
        }
      }
    }

    fetchRating();
  }, [storybook, user, params.id, supabase]);

  useEffect(() => {
    if (!storybook || !user) return;

    async function fetchQuality() {
      setLoadingQuality(true);
      setQualityError(false);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const response = await api.getStorybookQuality(params.id as string, session.access_token);
        if (response) {
          setQualityData(response);
        }
      } catch (error: any) {
        if (error.status !== 404) {
          console.error('Failed to fetch quality metrics:', error);
          setQualityError(true);
        }
      } finally {
        setLoadingQuality(false);
      }
    }

    fetchQuality();
  }, [storybook, user, params.id, supabase]);

  useEffect(() => {
    if (!storybook || existingRating) return;

    const hasRatedKey = `rated-storybook-${params.id}`;
    const hasRated = localStorage.getItem(hasRatedKey);

    if (!hasRated) {
      autoShowTimerRef.current = setTimeout(() => {
        setRatingModalOpen(true);
      }, 4000);
    }

    return () => {
      if (autoShowTimerRef.current) {
        clearTimeout(autoShowTimerRef.current);
      }
    };
  }, [storybook, existingRating, params.id]);

  const handleRatingSubmit = async (ratingData: RatingData) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No access token available');
      }

      await api.rateStorybook(params.id as string, ratingData, session.access_token);

      const response = await api.getStorybookRating(params.id as string, session.access_token);
      if (response.rating) {
        setExistingRating(response.rating);
      }

      localStorage.setItem(`rated-storybook-${params.id}`, 'true');

      toast({
        title: 'Thank you for your feedback!',
        description: 'Your rating has been submitted successfully',
      });
    } catch (error: any) {
      throw new Error(error.message || 'Failed to submit rating');
    }
  };

  const handleRatingModalClose = (open: boolean) => {
    if (!open && !existingRating) {
      localStorage.setItem(`rated-storybook-${params.id}`, 'true');
    }
    setRatingModalOpen(open);
  };

  const handleShare = async () => {
    if (!user?.email_confirmed_at) {
      router.push('/auth/verify');
      return;
    }

    if (profile?.onboarding_step !== 'paid') {
      return;
    }

    try {
      const shareUrl = `${window.location.origin}/storybook/${storybook?.id}/view`;
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: 'Link copied',
        description: 'Share link copied to clipboard',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to copy share link',
      });
    }
  };

  const handleDownload = () => {
    if (!user?.email_confirmed_at) {
      router.push('/auth/verify');
      return;
    }

    if (profile?.onboarding_step !== 'paid') {
      return;
    }

    toast({
      title: 'Download started',
      description: 'Your storybook will be downloaded shortly',
    });
    // Implement download logic here
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

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/storybook/library')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Library
            </Button>
            {loading ? (
              <Skeleton className="h-8 w-64" />
            ) : (
              <div>
                <h1 className="text-4xl font-bold">{storybook?.title}</h1>
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <span>{audienceLabels[storybook?.audience || 'children']}</span>
                </div>
              </div>
            )}
          </div>
          
          {!loading && storybook && (
            <div className="flex items-center gap-2">
              {profile?.onboarding_step === 'paid' ? (
                <>
                  <Button variant="outline" onClick={handleShare}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                  <Button variant="outline" onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </>
              ) : (
                <Card className="p-4 bg-muted">
                  <div className="flex items-center gap-3">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                    <div className="flex flex-col">
                      <p className="text-sm font-medium">Unlock sharing and downloading</p>
                      <p className="text-xs text-muted-foreground">Purchase this storybook to access all features</p>
                    </div>
                    <Button variant="default" className="ml-4">
                      Unlock Now
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-8">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[1, 2].map((j) => (
                      <Skeleton key={j} className="h-64" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : storybook ? (
          <div className="space-y-12">
            {loadingQuality ? (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <Skeleton className="h-48 w-64 rounded-2xl" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-40 rounded-lg" />
                  ))}
                </div>
              </div>
            ) : qualityData ? (
              <div className="space-y-8">
                <QualityBadge
                  grade={qualityData.quality_grade}
                  score={qualityData.overall_technical_quality}
                />

                {qualityData.overall_technical_quality >= 90 && (
                  <QualityCertificate
                    grade={qualityData.quality_grade}
                    score={qualityData.overall_technical_quality}
                  />
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <QualityScoreCard
                    dimension="Character Consistency"
                    score={qualityData.automated_scores.character.averageConsistencyScore}
                    description="How consistent your character appears across all panels"
                    icon={<User className="h-5 w-5 text-primary" />}
                    index={0}
                  />
                  <QualityScoreCard
                    dimension="Environmental Coherence"
                    score={qualityData.automated_scores.environmental.worldBuildingCoherence}
                    description="How well backgrounds and settings maintain consistency"
                    icon={<MapPin className="h-5 w-5 text-primary" />}
                    index={1}
                  />
                  <QualityScoreCard
                    dimension="Story & Narrative"
                    score={qualityData.automated_scores.narrative.storyBeatCompletion}
                    description="Story flow and narrative coherence"
                    icon={<BookOpen className="h-5 w-5 text-primary" />}
                    index={2}
                  />
                  <QualityScoreCard
                    dimension="Visual Quality"
                    score={qualityData.automated_scores.visual.artisticExecution}
                    description="Professional quality and visual appeal of artwork"
                    icon={<Palette className="h-5 w-5 text-primary" />}
                    index={3}
                  />
                  <QualityScoreCard
                    dimension="Technical Execution"
                    score={qualityData.automated_scores.technical.generationSuccessRate}
                    description="AI generation quality and success rate"
                    icon={<Zap className="h-5 w-5 text-primary" />}
                    index={4}
                  />
                  <QualityScoreCard
                    dimension="Age Appropriateness"
                    score={qualityData.automated_scores.audience.ageAppropriateness}
                    description="Content suitability for target audience"
                    icon={<Star className="h-5 w-5 text-primary" />}
                    index={5}
                  />
                </div>

                <QualityInsights generationMetrics={qualityData.generation_metrics} />
              </div>
            ) : null}

            {existingRating && (
              <ExistingRating
                rating={existingRating}
                onUpdateClick={() => setRatingModalOpen(true)}
              />
            )}

            {/* Character DNA hidden - used only for AI generation backend */}

            {storybook.pages.map((page, pageIndex) => (
              <Card key={pageIndex}>
                <CardHeader>
                  <CardTitle>Page {pageIndex + 1}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`grid ${getGridCols(page.scenes.length)} gap-6`}>
                    {page.scenes.map((scene, sceneIndex) => (
                      <div key={sceneIndex} className="space-y-4">
                        <div className="aspect-video relative rounded-lg overflow-hidden">
                          <img
                            src={scene.generatedImage}
                            alt={`Scene ${sceneIndex + 1}`}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        </div>
                        <div className="space-y-2">
                          <p className="text-lg">{scene.description}</p>
                          {/* Emotion narration hidden from UI - only used for AI prompts */}
                          {/* <p className="text-sm text-muted-foreground">
                            Emotion: {scene.emotion}
                          </p> */}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            {!existingRating && (
              <div className="flex justify-center py-8">
                <Button
                  size="lg"
                  onClick={() => setRatingModalOpen(true)}
                  className="min-w-[200px]"
                >
                  <Star className="h-5 w-5 mr-2 fill-current" />
                  Rate This Storybook
                </Button>
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

        <RatingModal
          open={ratingModalOpen}
          onOpenChange={handleRatingModalClose}
          storybookId={params.id as string}
          existingRating={existingRating}
          onSubmit={handleRatingSubmit}
          readingStartTime={readingStartTimeRef.current}
        />
      </div>
    </div>
  );
}