'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, Loader2, CheckCircle, AlertCircle, Save, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api-client';
import type { CartoonSaveRequest } from '@/lib/api-client';

interface Step4_ConfirmImageProps {
  imageUrl: string;
  cartoonStyle: string;
  cartoonizedUrl?: string;
  updateFormData: (data: any) => void;
}

export function Step4_ConfirmImage({
  imageUrl,
  cartoonStyle,
  cartoonizedUrl,
  updateFormData,
}: Step4_ConfirmImageProps) {
  // Existing state
  const [isGenerating, setIsGenerating] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentStatus, setCurrentStatus] = useState<string>('');

  // NEW: Save functionality state
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [permanentUrl, setPermanentUrl] = useState<string | null>(null);
  const [saveId, setSaveId] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    if (!cartoonizedUrl && imageUrl && cartoonStyle) {
      generateCartoonImage();
    }
  }, []);

  // Check if this is a reused image (already cartoonized)
  const isReusedImage = cartoonizedUrl && !isGenerating && !error;

  const generateCartoonImage = async () => {
    console.log('🎨 Step4_ConfirmImage: Starting cartoon generation...');
    console.log('🎨 Image URL:', imageUrl);
    console.log('🎨 Cartoon Style:', cartoonStyle);
    
    setIsGenerating(true);
    setError(null);
    setProgress(0);
    setCurrentStatus('Starting...');
    // Reset save state when regenerating
    setIsSaved(false);
    setSaveError(null);
    setPermanentUrl(null);
    setSaveId(null);

    try {
      let finalPrompt = prompt;

      // Get image description if not already available
      if (!finalPrompt) {
        setCurrentStatus('Analyzing image...');
        setProgress(10);
        
        console.log('🔍 Calling describeImage API...');
        const { characterDescription } = await api.describeImage(imageUrl);
        finalPrompt = characterDescription;
        setPrompt(characterDescription);
        
        console.log('🔍 Image description received:', characterDescription);
        setProgress(20);
        setCurrentStatus('Description complete');
      }

      // Start cartoonize job
      setCurrentStatus('Starting cartoonization...');
      setProgress(25);

      console.log('🎨 Starting cartoonize job...');
      const result = await api.cartoonizeImage(
        finalPrompt,
        cartoonStyle,
        imageUrl,
        (jobProgress) => {
          console.log(`🎨 Progress update: ${jobProgress}%`);
          const scaledProgress = 25 + (jobProgress * 0.7);
          setProgress(Math.min(scaledProgress, 95));
        },
        (status) => {
          console.log(`🎨 Status update: ${status}`);
          setCurrentStatus(getStatusMessage(status));
        }
      );

      console.log('✅ Cartoonize job completed successfully:', result);
      setProgress(100);
      setCurrentStatus('Complete!');
      updateFormData({ 
        cartoonizedUrl: result.url,
        characterDescription: finalPrompt 
      });

      toast({
        title: 'Success',
        description: 'Cartoon image generated successfully!',
      });

    } catch (error: any) {
      console.error('❌ Cartoonize job failed:', error);
      setError(error.message);
      setProgress(0);
      setCurrentStatus('Failed');
      
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to generate cartoon image',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // NEW: Save cartoon permanently
  const saveCartoonPermanently = async () => {
    if (!cartoonizedUrl || !prompt) {
      toast({
        variant: 'destructive',
        title: 'Cannot Save',
        description: 'Cartoon image and character description are required.',
      });
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      console.log('💾 Saving cartoon permanently...');
      console.log('💾 Original URL:', imageUrl);
      console.log('💾 Cartoon URL:', cartoonizedUrl);
      console.log('💾 Character Description:', prompt);
      console.log('💾 Art Style:', cartoonStyle);

      const saveRequest: CartoonSaveRequest = {
        originalImageUrl: imageUrl,
        cartoonImageUrl: cartoonizedUrl,
        characterDescription: prompt,
        artStyle: cartoonStyle,
        metadata: {
          processingTime: Date.now(), // Could track actual processing time
          modelVersion: '1.0',
          quality: 'high',
          tags: [cartoonStyle, 'character'],
        },
      };

      const saveResponse = await api.saveCartoonImage(saveRequest);

      console.log('✅ Cartoon saved successfully:', saveResponse);

      // Update state
      setIsSaved(true);
      setSaveId(saveResponse.id);
      setPermanentUrl(cartoonizedUrl); // In production, this might be a different permanent URL

      // Update form data with permanent information
      updateFormData({
        cartoonizedUrl: permanentUrl || cartoonizedUrl,
        characterDescription: prompt,
        cartoonSaveId: saveResponse.id,
        isPermanentlySaved: true,
      });

      toast({
        title: 'Cartoon Saved!',
        description: 'Your cartoon character has been saved permanently and will be available for future stories.',
      });

    } catch (error: any) {
      console.error('❌ Failed to save cartoon:', error);
      setSaveError(error.message || 'Failed to save cartoon');
      
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: error.message || 'Failed to save cartoon permanently. You can still continue with the story.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusMessage = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'Queued for processing...';
      case 'processing':
        return 'Creating cartoon image...';
      case 'completed':
        return 'Finalizing...';
      case 'failed':
        return 'Generation failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Processing...';
    }
  };

  const handleRetry = () => {
    if (retryCount >= 3) return;
    setRetryCount(prev => prev + 1);
    generateCartoonImage();
  };

  const getProgressColor = () => {
    if (error) return 'bg-destructive';
    if (progress === 100) return 'bg-green-500';
    return 'bg-primary';
  };

  const getProgressIcon = () => {
    if (error) return <AlertCircle className="h-4 w-4 text-destructive" />;
    if (progress === 100) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (isGenerating) return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    return null;
  };

  // NEW: Determine if save button should be shown
  const showSaveButton = cartoonizedUrl && !isGenerating && !error && !isSaved;
  const canProceed = cartoonizedUrl && !isGenerating;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Review Cartoon Image</h3>
        <p className="text-muted-foreground mb-4">
          {isReusedImage 
            ? "You're using a previously created cartoon character. You can save it again or continue to the next step."
            : "Make sure you're happy with your cartoon image before continuing. You can retry up to 3 times."
          }
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="aspect-square relative rounded-lg overflow-hidden">
              <img
                src={imageUrl}
                alt="Original"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            <p className="text-center text-sm mt-2 text-muted-foreground">Original</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="aspect-square relative rounded-lg overflow-hidden">
              {isGenerating ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm">
                  <div className="w-full max-w-xs space-y-4">
                    <div className="flex items-center justify-center">
                      {getProgressIcon()}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{Math.round(progress)}%</span>
                      </div>
                      <Progress 
                        value={progress} 
                        className="h-2"
                      />
                    </div>
                    
                    <p className="text-sm text-center text-muted-foreground">
                      {currentStatus}
                    </p>
                  </div>
                </div>
              ) : cartoonizedUrl ? (
                <img
                  src={cartoonizedUrl}
                  alt="Cartoon"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                  <p className="text-muted-foreground">Generating cartoon image...</p>
                </div>
              )}
            </div>
            <div className="text-center mt-2">
              <p className="text-sm text-muted-foreground">
                Cartoon {isGenerating && `(${Math.round(progress)}%)`}
              </p>
              {/* NEW: Save status indicator */}
              {isSaved && (
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Check className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">Saved Permanently</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Character description display */}
      {prompt && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <h4 className="font-medium mb-2">Character Description</h4>
            <p className="text-sm text-muted-foreground">{prompt}</p>
          </CardContent>
        </Card>
      )}

      {/* NEW: Save section */}
      {showSaveButton && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <Save className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-blue-800 mb-1">
                  Save Character Permanently
                </h4>
                <p className="text-sm text-blue-700 mb-3">
                  Save this cartoon character to your library for future stories. 
                  You'll be able to reuse it without regenerating.
                </p>
                <Button
                  onClick={saveCartoonPermanently}
                  disabled={isSaving}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save & Continue
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* NEW: Save success message */}
      {isSaved && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-800 mb-1">
                  Character Saved Successfully!
                </h4>
                <p className="text-sm text-green-700">
                  Your cartoon character has been permanently saved to your library. 
                  It will appear in your "Previous Images" for future stories.
                </p>
                {saveId && (
                  <p className="text-xs text-green-600 mt-1">
                    Save ID: {saveId}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* NEW: Save error message */}
      {saveError && (
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-orange-800 mb-1">
                  Save Failed
                </h4>
                <p className="text-sm text-orange-700 mb-2">
                  {saveError}
                </p>
                <p className="text-xs text-orange-600">
                  Don't worry - you can still continue with your story. 
                  The character just won't be saved for future use.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center pt-4">
        <Button
          variant="outline"
          onClick={handleRetry}
          disabled={retryCount >= 3 || isGenerating || isSaving}
          className="flex items-center"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Regenerate Image
          {retryCount > 0 && (
            <span className="ml-2 text-xs text-muted-foreground">
              ({3 - retryCount} tries left)
            </span>
          )}
        </Button>

        <div className="text-right">
          {error && (
            <div>
              <p className="text-sm text-destructive">{error}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try regenerating or check your connection
              </p>
            </div>
          )}
          
          {/* NEW: Proceed status */}
          {canProceed && (
            <div className="text-sm text-green-600">
              ✅ Ready to continue
              {isSaved && (
                <div className="text-xs text-muted-foreground">
                  Character saved permanently
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}