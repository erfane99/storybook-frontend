'use client';

import { useState, useEffect } from 'react';
import { User, Book, Palette, Image, Heart, Loader2, CheckCircle2, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { StarRating } from './StarRating';
import { cn } from '@/lib/utils';

export interface RatingData {
  character_consistency: number;
  story_flow: number;
  art_quality: number;
  scene_consistency: number;
  overall_experience: number;
  comment?: string;
  would_recommend: boolean;
  time_spent_reading: number;
}

interface RatingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storybookId: string;
  existingRating?: RatingData | null;
  onSubmitSuccess?: () => void;
  onSubmit: (data: RatingData) => Promise<void>;
  readingStartTime: number;
}

export function RatingModal({
  open,
  onOpenChange,
  storybookId,
  existingRating,
  onSubmitSuccess,
  onSubmit,
  readingStartTime,
}: RatingModalProps) {
  const [characterConsistency, setCharacterConsistency] = useState(0);
  const [storyFlow, setStoryFlow] = useState(0);
  const [artQuality, setArtQuality] = useState(0);
  const [sceneConsistency, setSceneConsistency] = useState(0);
  const [overallExperience, setOverallExperience] = useState(0);
  const [comment, setComment] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isUpdate = !!existingRating;

  useEffect(() => {
    if (existingRating) {
      setCharacterConsistency(existingRating.character_consistency);
      setStoryFlow(existingRating.story_flow);
      setArtQuality(existingRating.art_quality);
      setSceneConsistency(existingRating.scene_consistency);
      setOverallExperience(existingRating.overall_experience);
      setComment(existingRating.comment || '');
      setWouldRecommend(existingRating.would_recommend);
    } else {
      setCharacterConsistency(0);
      setStoryFlow(0);
      setArtQuality(0);
      setSceneConsistency(0);
      setOverallExperience(0);
      setComment('');
      setWouldRecommend(false);
    }
    setSubmitSuccess(false);
    setSubmitError(null);
  }, [existingRating, open]);

  const ratings = [
    characterConsistency,
    storyFlow,
    artQuality,
    sceneConsistency,
    overallExperience,
  ];

  const ratedCount = ratings.filter((r) => r > 0).length;
  const averageRating =
    ratedCount > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratedCount : 0;

  const isValid = ratedCount >= 3;
  const characterCount = comment.length;

  useEffect(() => {
    if (averageRating >= 4) {
      setWouldRecommend(true);
    }
  }, [averageRating]);

  const handleSubmit = async () => {
    if (!isValid) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const timeSpentReading = Math.floor((Date.now() - readingStartTime) / 1000);

      const ratingData: RatingData = {
        character_consistency: characterConsistency,
        story_flow: storyFlow,
        art_quality: artQuality,
        scene_consistency: sceneConsistency,
        overall_experience: overallExperience,
        comment: comment.trim() || undefined,
        would_recommend: wouldRecommend,
        time_spent_reading: timeSpentReading,
      };

      await onSubmit(ratingData);

      setSubmitSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        onSubmitSuccess?.();
      }, 1500);
    } catch (error: any) {
      setSubmitError(error.message || 'Failed to submit rating. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <AlertDialogTitle className="text-2xl font-bold">
                {isUpdate ? 'Update Your Rating' : 'Rate This Storybook'}
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-2">
                {isUpdate
                  ? 'Update your feedback to help us improve your experience'
                  : 'Share your feedback to help us create even better storybooks for you'}
              </AlertDialogDescription>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-full p-1 hover:bg-accent transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </AlertDialogHeader>

        {submitSuccess ? (
          <div className="py-12 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto animate-in zoom-in duration-300" />
            <div>
              <h3 className="text-xl font-semibold">Thank you for your feedback!</h3>
              <p className="text-muted-foreground mt-2">
                Your rating has been {isUpdate ? 'updated' : 'submitted'} successfully
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-6 py-4">
              {averageRating > 0 && (
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-2">Your Average Rating</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-3xl font-bold">{averageRating.toFixed(1)}</span>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'h-5 w-5',
                            i < Math.round(averageRating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'fill-transparent text-gray-300'
                          )}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {ratedCount} of 5 categories rated
                  </p>
                </div>
              )}

              <div className="space-y-5">
                <StarRating
                  value={characterConsistency}
                  onChange={setCharacterConsistency}
                  label="Character Consistency"
                  description="Does your character look the same in every panel? (Improves Character DNA)"
                  icon={<User className="h-5 w-5" />}
                />

                <StarRating
                  value={storyFlow}
                  onChange={setStoryFlow}
                  label="Story Flow & Narrative"
                  description="Does the narration match what you see? (Improves story analysis)"
                  icon={<Book className="h-5 w-5" />}
                />

                <StarRating
                  value={artQuality}
                  onChange={setArtQuality}
                  label="Art Quality & Visual Appeal"
                  description="How beautiful are the images? (Improves image generation)"
                  icon={<Palette className="h-5 w-5" />}
                />

                <StarRating
                  value={sceneConsistency}
                  onChange={setSceneConsistency}
                  label="Scene & Background Consistency"
                  description="Are backgrounds consistent? (Improves Environmental DNA)"
                  icon={<Image className="h-5 w-5" />}
                />

                <StarRating
                  value={overallExperience}
                  onChange={setOverallExperience}
                  label="Overall Experience"
                  description="Overall satisfaction? (Improves entire pipeline)"
                  icon={<Heart className="h-5 w-5" />}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment">
                  Tell us more about your experience (optional)
                </Label>
                <Textarea
                  id="comment"
                  placeholder="What did you love? What could be better?"
                  value={comment}
                  onChange={(e) => {
                    if (e.target.value.length <= 1000) {
                      setComment(e.target.value);
                    }
                  }}
                  maxLength={1000}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {characterCount}/1000 characters
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="recommend" className="text-sm font-medium">
                    Would you recommend this to others?
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Help others discover great storybooks
                  </p>
                </div>
                <Switch
                  id="recommend"
                  checked={wouldRecommend}
                  onCheckedChange={setWouldRecommend}
                />
              </div>

              {!isValid && ratedCount > 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400 text-center">
                  Please rate at least 3 categories to submit your feedback
                </p>
              )}

              {submitError && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                  <p className="text-sm text-destructive">{submitError}</p>
                </div>
              )}
            </div>

            <AlertDialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!isValid || isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>{isUpdate ? 'Update Rating' : 'Submit Rating'}</>
                )}
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Star({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}
