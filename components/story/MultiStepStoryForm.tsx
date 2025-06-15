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
import { Step6_Confirmation } from './steps/Step6_Confirmation';
import { useToast } from '@/hooks/use-toast';
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

export function MultiStepStoryForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    setIsSubmitting(true);
    try {
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (formData.storyMode === 'auto') {
        // Check if user is authenticated for auto mode
        if (!session?.user) {
          toast({
            variant: 'destructive',
            title: 'Authentication Required',
            description: 'Please sign in to generate an automatic story.',
          });
          setIsSubmitting(false);
          return;
        }

        // Handle auto story generation
        const { storybookId } = await api.generateAutoStory({
          genre: formData.selectedGenre!,
          characterDescription: formData.characterDescription!,
          cartoonImageUrl: formData.cartoonizedUrl!,
          audience: formData.audience,
          user_id: session.user.id,
        });

        router.push(`/storybook/preview?id=${storybookId}`);
      } else {
        // Handle manual story creation
        const { scenesText } = await api.generateScenes(
          formData.story,
          formData.cartoonizedUrl!,
          formData.audience
        );

        const { pages } = JSON.parse(scenesText);

        const data = await api.createStorybook({
          title: formData.title,
          story: formData.story,
          characterImage: formData.cartoonizedUrl!,
          pages,
          audience: formData.audience,
          isReusedImage: true,
          user_id: session?.user?.id,
        });

        sessionStorage.setItem('storybook-data', JSON.stringify(data));
        router.push('/storybook/preview');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create storybook',
      });
      setIsSubmitting(false);
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
        return <Step6_Confirmation formData={formData} isSubmitting={isSubmitting} />;
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md mx-auto rounded-2xl shadow-xl">
        <CardContent className="p-6">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-center mb-2">Create Your Story</h2>
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

            {currentStep < 7 ? (
              <Button
                onClick={handleNext}
                disabled={isNextDisabled() || isSubmitting}
                className="w-full bg-black text-white font-semibold py-3 rounded-xl"
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-black text-white font-semibold py-3 rounded-xl"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Storybook'
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}