'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api-client';

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentStatus, setCurrentStatus] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    if (!cartoonizedUrl && imageUrl && cartoonStyle) {
      generateCartoonImage();
    }
  }, []);

  const generateCartoonImage = async () => {
    console.log('🎨 Step4_ConfirmImage: Starting cartoon generation...');
    console.log('🎨 Image URL:', imageUrl);
    console.log('🎨 Cartoon Style:', cartoonStyle);
    
    setIsGenerating(true);
    setError(null);
    setProgress(0);
    setCurrentStatus('Starting...');

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
      updateFormData({ cartoonizedUrl: result.url });

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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Review Cartoon Image</h3>
        <p className="text-muted-foreground mb-4">
          Make sure you're happy with your cartoon image before continuing. You can retry up to 3 times.
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
            <p className="text-center text-sm mt-2 text-muted-foreground">
              Cartoon {isGenerating && `(${Math.round(progress)}%)`}
            </p>
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

      <div className="flex justify-between items-center pt-4">
        <Button
          variant="outline"
          onClick={handleRetry}
          disabled={retryCount >= 3 || isGenerating}
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

        {error && (
          <div className="text-right">
            <p className="text-sm text-destructive">{error}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try regenerating or check your connection
            </p>
          </div>
        )}
      </div>
    </div>
  );
}