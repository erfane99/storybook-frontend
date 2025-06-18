'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Step1_Title } from './steps/Step1_Title';
import { Step2_Image } from './steps/Step2_Image';
import { Step3_Style } from './steps/Step3_Style';
import { Step4_ConfirmImage } from './steps/Step4_ConfirmImage';
import { Step4_Audience } from './steps/Step4_Audience';
import { Step5_Story } from './steps/Step5_Story';
import { Step6_ConfirmationWithJobs } from './steps/Step6_ConfirmationWithJobs';
import { useToast } from '@/hooks/use-toast';
import { useJobPolling } from '@/hooks/use-job-polling';
import { ProgressTracker } from '@/components/ui/progress-tracker';
import { AnimatePresence, motion } from 'framer-motion';
import { getClientSupabase } from '@/lib/supabase/client';
import { api } from '@/lib/api-client';

export interface StoryFormData {
  title: string;
  characterImage: File | null;
  cartoonStyle: string;
  audience: 'children' | 'young_adults' | 'adults';
  story: string;
  imageUrl?: string;
  cartoonizedUrl?: string;
  characterDescription?: string;
  storyMode: 'manual' | 'auto';
  selectedGenre?: string;
}

export function MultiStepStoryFormWithJobs() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [pollingUrl, setPollingUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState<StoryFormData>({
    title: '',
    characterImage: null,
    cartoonStyle: '',
    audience: 'children',
    story: '',
    storyMode: 'manual',
  });

  const router = useRouter();
  const { toast } = useToast();
  const supabase = getClientSupabase();

  // Job polling hook
  const {
    data: jobData,
    isPolling,
    error: pollingError,
    stopPolling,
  } = useJobPolling(jobId, pollingUrl, {
    onComplete: (result) => {
      toast({
        title: 'Success!',
        description: 'Your comic book storybook has been created successfully.',
      });

      // Redirect to the completed storybook
      if (result.storybook_id) {
        router.push(`/storybook/${result.storybook_id}`);
      } else {
        router.push('/storybook/library');
      }
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: error,
      });
      setIsSubmitting(false);
      setJobId(null);
      setPollingUrl(null);
    },
  });

  const updateFormData = (data: Partial<StoryFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const handleNext = () => {
    if (currentStep < 7) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    console.log('🚀 DEBUG: handleSubmit called');
    console.log('🚀 DEBUG: currentStep:', currentStep);
    console.log('🚀 DEBUG: formData:', formData);
    console.log('🚀 DEBUG: storyMode:', formData.storyMode);
    console.log('🚀 DEBUG: selectedGenre:', formData.selectedGenre);
    console.log('🚀 DEBUG: characterDescription:', formData.characterDescription);
    console.log('🚀 DEBUG: cartoonizedUrl:', formData.cartoonizedUrl);
    
    setIsSubmitting(true);
    
    try {
      console.log('🚀 DEBUG: Getting session...');
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🚀 DEBUG: session:', session?.user?.id ? 'User logged in' : 'No session');
      
      if (formData.storyMode === 'auto') {
        console.log('🚀 DEBUG: Auto story mode selected');
        
        // AUTO STORY: Generate complete comic book storybook from genre + character
        if (!session?.user) {
          console.log('🚀 DEBUG: No user session - showing auth error');
          toast({
            variant: 'destructive',
            title: 'Authentication Required',
            description: 'Please sign in to generate an automatic story.',
          });
          setIsSubmitting(false);
          return;
        }

        // Validate auto story requirements
        if (!formData.selectedGenre) {
          console.log('🚀 DEBUG: No genre selected - showing error');
          toast({
            variant: 'destructive',
            title: 'Missing Information',
            description: 'Please select a genre for your auto story.',
          });
          setIsSubmitting(false);
          return;
        }

        if (!formData.characterDescription) {
          console.log('🚀 DEBUG: No character description - showing error');
          toast({
            variant: 'destructive',
            title: 'Missing Information',
            description: 'Character description is required. Please ensure cartoonization completed successfully.',
          });
          setIsSubmitting(false);
          return;
        }

        if (!formData.cartoonizedUrl) {
          console.log('🚀 DEBUG: No cartoonized URL - showing error');
          toast({
            variant: 'destructive',
            title: 'Missing Information',
            description: 'Cartoonized character image is required.',
          });
          setIsSubmitting(false);
          return;
        }

        console.log('🤖 Starting auto story generation with comic book layout...');
        console.log('🎨 Character art style:', formData.cartoonStyle);
        console.log('🚀 DEBUG: About to call api.startAutoStoryJob...');
        
        // ENHANCED: Pass complete context for comic book generation
        const { jobId: newJobId, pollingUrl: newPollingUrl } = await api.startAutoStoryJob({
          genre: formData.selectedGenre,
          characterDescription: formData.characterDescription,
          cartoonImageUrl: formData.cartoonizedUrl,
          audience: formData.audience,
          characterArtStyle: formData.cartoonStyle, // NEW: Character art style
          layoutType: 'comic-book-panels', // NEW: Always comic book layout
        });

        console.log('🚀 DEBUG: API call successful, jobId:', newJobId);
        
        setJobId(newJobId);
        setPollingUrl(newPollingUrl);

        toast({
          title: 'Auto Story Generation Started',
          description: `Creating your ${formData.selectedGenre} story in comic book format with ${formData.cartoonStyle} style character.`,
        });

      } else {
        console.log('🚀 DEBUG: Manual story mode selected');
        
        // MANUAL STORY: Transform user's story into comic book style storybook
        
        // Validate manual story requirements
        if (!formData.story?.trim()) {
          console.log('🚀 DEBUG: No story text - showing error');
          toast({
            variant: 'destructive',
            title: 'Missing Information',
            description: 'Please write your story before creating the storybook.',
          });
          setIsSubmitting(false);
          return;
        }

        if (!formData.cartoonizedUrl) {
          console.log('🚀 DEBUG: No cartoonized URL for manual story - showing error');
          toast({
            variant: 'destructive',
            title: 'Missing Information',
            description: 'Cartoonized character image is required.',
          });
          setIsSubmitting(false);
          return;
        }

        console.log('📖 Starting manual story transformation to comic book format...');
        console.log('🎨 Character art style:', formData.cartoonStyle);
        console.log('🚀 DEBUG: About to call api.startStorybookJob...');

        // ENHANCED: Pass complete context for comic book generation
        const { jobId: newJobId, pollingUrl: newPollingUrl } = await api.startStorybookJob({
          title: formData.title,
          story: formData.story,
          characterImage: formData.cartoonizedUrl,
          pages: [], // Empty - worker will generate comic book pages with panels
          audience: formData.audience,
          isReusedImage: true,
          characterDescription: formData.characterDescription, // NEW: Character description
          characterArtStyle: formData.cartoonStyle, // NEW: Character art style
          layoutType: 'comic-book-panels', // NEW: Always comic book layout
        });

        console.log('🚀 DEBUG: Manual story API call successful, jobId:', newJobId);
        
        setJobId(newJobId);
        setPollingUrl(newPollingUrl);

        toast({
          title: 'Story Processing Started',
          description: `Transforming your story into comic book format with ${formData.cartoonStyle} style character.`,
        });
      }

      console.log('🚀 DEBUG: Moving to step 7');
      // Move to progress screen
      setCurrentStep(7);

    } catch (error: any) {
      console.error('❌ Story creation failed:', error);
      console.log('🚀 DEBUG: Error details:', error.message, error.stack);
      toast({
        variant: 'destructive',
        title: 'Creation Failed',
        description: error.message || 'Failed to start storybook creation. Please try again.',
      });
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (jobId) {
      try {
        await api.cancelJob(jobId);
        stopPolling();
        setJobId(null);
        setPollingUrl(null);
        setIsSubmitting(false);
        
        toast({
          title: 'Cancelled',
          description: 'Storybook creation has been cancelled.',
        });
      } catch (error) {
        console.error('Failed to cancel job:', error);
      }
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1_Title value={formData.title} onChange={(title) => updateFormData({ title })} />;
      case 2:
        return <Step2_Image formData={formData} updateFormData={updateFormData} />;
      case 3:
        return (
          <Step3_Style
            value={formData.cartoonStyle}
            onChange={(style) => updateFormData({ cartoonStyle: style })}
          />
        );
      case 4:
        return (
          <Step4_ConfirmImage
            imageUrl={formData.imageUrl!}
            cartoonStyle={formData.cartoonStyle}
            cartoonizedUrl={formData.cartoonizedUrl}
            updateFormData={updateFormData}
          />
        );
      case 5:
        return <Step4_Audience value={formData.audience} onChange={(audience) => updateFormData({ audience })} />;
      case 6:
        return (
          <Step5_Story
            value={formData.story}
            onChange={(story) => updateFormData({ story })}
            storyMode={formData.storyMode}
            selectedGenre={formData.selectedGenre}
            onModeChange={(mode) => updateFormData({ storyMode: mode })}
            onGenreChange={(genre) => updateFormData({ selectedGenre: genre })}
          />
        );
      case 7:
        return (
          <Step6_ConfirmationWithJobs
            formData={formData}
            isSubmitting={isSubmitting}
            jobData={jobData}
            isPolling={isPolling}
            pollingError={pollingError}
            onCancel={handleCancel}
          />
        );
      default:
        return null;
    }
  };

  const isNextDisabled = () => {
    switch (currentStep) {
      case 1:
        return !formData.title.trim();
      case 2:
        return !formData.characterImage && !formData.imageUrl;
      case 3:
        return !formData.cartoonStyle;
      case 4:
        return !formData.cartoonizedUrl;
      case 5:
        return !formData.audience;
      case 6:
        return formData.storyMode === 'manual' 
          ? !formData.story.trim() 
          : !formData.selectedGenre;
      default:
        return false;
    }
  };

  // Show progress tracker if job is running
  if (currentStep === 7 && (isSubmitting || isPolling)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-2xl mx-auto">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Creating Your Comic Book Storybook</h2>
              <p className="text-muted-foreground">
                Please wait while we generate your personalized comic book with panel layouts
              </p>
            </div>

            {jobData && (
              <ProgressTracker
                jobId={jobData.jobId}
                jobType={formData.storyMode === 'auto' ? 'auto-story' : 'storybook'}
                status={jobData.status}
                progress={jobData.progress}
                currentStep={jobData.currentStep}
                currentPhase={jobData.currentPhase}
                estimatedTimeRemaining={jobData.estimatedTimeRemaining}
                error={jobData.error}
                onCancel={handleCancel}
                showDetails={true}
              />
            )}

            {pollingError && (
              <div className="mt-6 text-center">
                <p className="text-destructive mb-4">{pollingError}</p>
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  Refresh Page
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md mx-auto rounded-2xl shadow-xl">
        <CardContent className="p-6">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-center mb-2">Create Your Comic Book Story</h2>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Step {currentStep} of 7
            </p>
            <div className="w-full h-3 bg-gray-200 rounded-full">
              <div
                className="bg-primary h-3 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / 7) * 100}%` }}
              />
            </div>
          </div>

          <div className="min-h-[400px] flex flex-col justify-center px-2 md:px-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex justify-between mt-6 space-x-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1 || isSubmitting}
              className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl border"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            {currentStep < 6 ? (
              <Button
                onClick={handleNext}
                disabled={isNextDisabled() || isSubmitting}
                className="w-full bg-black text-white font-semibold py-3 rounded-xl"
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : currentStep === 6 ? (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-black text-white font-semibold py-3 rounded-xl"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  'Create Comic Book'
                )}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}