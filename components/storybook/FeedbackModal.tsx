'use client';

import { useState } from 'react';
import { MessageSquare, Image, BookOpen, Loader2, CheckCircle2, X } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storybookId: string;
  onSubmitSuccess?: () => void;
}

// Common issues users might want to flag
const STORY_ISSUES = [
  { id: 'more_dialogue', label: 'Need more dialogue/speech bubbles' },
  { id: 'better_pacing', label: 'Story pacing could be improved' },
  { id: 'unclear_story', label: 'Story was hard to follow' },
  { id: 'ending_rushed', label: 'Ending felt rushed' },
  { id: 'more_emotion', label: 'Need more emotional moments' },
];

const IMAGE_ISSUES = [
  { id: 'character_inconsistent', label: 'Character looks different between panels' },
  { id: 'poses_similar', label: 'Character poses are too similar' },
  { id: 'backgrounds_repetitive', label: 'Backgrounds look the same' },
  { id: 'camera_angles_same', label: 'Camera angles don\'t vary enough' },
  { id: 'art_quality', label: 'Image quality could be better' },
];

export function FeedbackModal({
  open,
  onOpenChange,
  storybookId,
  onSubmitSuccess,
}: FeedbackModalProps) {
  const [storyFeedback, setStoryFeedback] = useState('');
  const [imageFeedback, setImageFeedback] = useState('');
  const [selectedStoryIssues, setSelectedStoryIssues] = useState<string[]>([]);
  const [selectedImageIssues, setSelectedImageIssues] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const toggleStoryIssue = (issueId: string) => {
    setSelectedStoryIssues(prev =>
      prev.includes(issueId)
        ? prev.filter(id => id !== issueId)
        : [...prev, issueId]
    );
  };

  const toggleImageIssue = (issueId: string) => {
    setSelectedImageIssues(prev =>
      prev.includes(issueId)
        ? prev.filter(id => id !== issueId)
        : [...prev, issueId]
    );
  };

  const hasAnyFeedback = 
    storyFeedback.trim() || 
    imageFeedback.trim() || 
    selectedStoryIssues.length > 0 || 
    selectedImageIssues.length > 0;

    const handleSubmit = async () => {
      if (!hasAnyFeedback) return;
  
      setIsSubmitting(true);
      setSubmitError(null);
  
      try {
        // Get auth token from Supabase session
        const { getClientSupabase } = await import('@/lib/supabase/client');
        const supabase = getClientSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          throw new Error('Please sign in to submit feedback');
        }
  
        const response = await fetch(`/api/storybook/${storybookId}/feedback`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            story_feedback: storyFeedback.trim() || null,
            image_feedback: imageFeedback.trim() || null,
            quick_issues: [...selectedStoryIssues, ...selectedImageIssues],
          }),
        });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit feedback');
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        onSubmitSuccess?.();
        // Reset form
        setStoryFeedback('');
        setImageFeedback('');
        setSelectedStoryIssues([]);
        setSelectedImageIssues([]);
        setSubmitSuccess(false);
      }, 1500);
    } catch (error: any) {
      setSubmitError(error.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state on close
    setSubmitError(null);
    setSubmitSuccess(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <AlertDialogTitle className="text-2xl font-bold flex items-center gap-2">
                <MessageSquare className="h-6 w-6 text-primary" />
                Help Us Improve
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-2">
                Tell us what you'd like to see improved. Your feedback directly helps our AI create better storybooks!
              </AlertDialogDescription>
            </div>
            <button
              onClick={handleClose}
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
                We'll use this to make your next storybook even better.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-6 py-4">
              {/* Story & Narration Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <Label className="text-lg font-semibold">Story & Narration</Label>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {STORY_ISSUES.map((issue) => (
                    <div
                      key={issue.id}
                      className={cn(
                        "flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-all",
                        selectedStoryIssues.includes(issue.id)
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-primary/50"
                      )}
                      onClick={() => toggleStoryIssue(issue.id)}
                    >
                      <Checkbox
                        checked={selectedStoryIssues.includes(issue.id)}
                        onCheckedChange={() => toggleStoryIssue(issue.id)}
                      />
                      <span className="text-sm">{issue.label}</span>
                    </div>
                  ))}
                </div>

                <Textarea
                  placeholder="Any other thoughts about the story or narration? What would make it better?"
                  value={storyFeedback}
                  onChange={(e) => setStoryFeedback(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Images Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Image className="h-5 w-5 text-primary" />
                  <Label className="text-lg font-semibold">Images & Illustrations</Label>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {IMAGE_ISSUES.map((issue) => (
                    <div
                      key={issue.id}
                      className={cn(
                        "flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-all",
                        selectedImageIssues.includes(issue.id)
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-primary/50"
                      )}
                      onClick={() => toggleImageIssue(issue.id)}
                    >
                      <Checkbox
                        checked={selectedImageIssues.includes(issue.id)}
                        onCheckedChange={() => toggleImageIssue(issue.id)}
                      />
                      <span className="text-sm">{issue.label}</span>
                    </div>
                  ))}
                </div>

                <Textarea
                  placeholder="Any other thoughts about the images? What would make them better?"
                  value={imageFeedback}
                  onChange={(e) => setImageFeedback(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>

              {submitError && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                  <p className="text-sm text-destructive">{submitError}</p>
                </div>
              )}
            </div>

            <AlertDialogFooter>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!hasAnyFeedback || isSubmitting}
                className="min-w-[140px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Feedback'
                )}
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}