'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, History, Loader2, X } from 'lucide-react';
import { StoryFormData } from '../MultiStepStoryForm';
import { getClientSupabase } from '@/lib/supabase/client';
import { api } from '@/lib/api-client';

interface Step2_ImageProps {
  formData: StoryFormData;
  updateFormData: (data: Partial<StoryFormData>) => void;
}

interface PreviousImage {
  original_url: string;
  generated_url: string;
  created_at: string;
}

export function Step2_Image({ formData, updateFormData }: Step2_ImageProps) {
  const [usePreviousImage, setUsePreviousImage] = useState(false);
  const [previousImages, setPreviousImages] = useState<PreviousImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);
  const { toast } = useToast();
  const supabase = getClientSupabase();

  // FIXED: Load previous images when toggle is switched on
  useEffect(() => {
    if (usePreviousImage) {
      fetchPreviousImages();
    }
  }, [usePreviousImage]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const file = e.target.files[0];
    setIsLoading(true);

    try {
      const formDataToUpload = new FormData();
      formDataToUpload.append('image', file);

      console.log('🖼️ Uploading image...');
      const { secure_url } = await api.uploadImage(formDataToUpload);

      updateFormData({
        characterImage: file,
        imageUrl: secure_url,
        // Clear any previous cartoonized data when uploading new image
        cartoonizedUrl: undefined,
        characterDescription: undefined,
      });

      toast({
        title: 'Success',
        description: 'Image uploaded successfully',
      });
    } catch (error: any) {
      console.error('❌ Image upload failed:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to upload image',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPrevious = (image: PreviousImage) => {
    console.log('📸 Selected previous cartoonized image:', image.generated_url);
    
    updateFormData({
      imageUrl: image.original_url,
      cartoonizedUrl: image.generated_url,
      // When reusing cartoonized image, we need to get character description
      // This will be handled in Step4_ConfirmImage or we can fetch it here
      characterImage: null, // Clear file since we're using URL
    });

    toast({
      title: 'Previous Image Selected',
      description: 'Using your previously cartoonized character image.',
    });
  };

  const handleClearSelection = () => {
    updateFormData({
      characterImage: null,
      imageUrl: undefined,
      cartoonizedUrl: undefined,
      characterDescription: undefined,
    });
  };

  const fetchPreviousImages = async () => {
    setIsLoadingPrevious(true);
    
    try {
      console.log('🔍 Fetching previous cartoonized images...');
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        toast({
          variant: 'destructive',
          title: 'Authentication Required',
          description: 'Please sign in to access your previous images.',
        });
        return;
      }

      const { data, error } = await supabase
        .from('cartoon_images')
        .select('original_url, generated_url, created_at')
        .eq('user_id', session.user.id) // Only get user's own images
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) {
        console.error('❌ Failed to fetch previous images:', error);
        throw error;
      }

      console.log('✅ Found previous images:', data?.length || 0);
      setPreviousImages(data || []);

      if (!data || data.length === 0) {
        toast({
          title: 'No Previous Images',
          description: 'You haven\'t created any cartoonized characters yet.',
        });
      }

    } catch (error: any) {
      console.error('❌ Error fetching previous images:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load previous images. Please try again.',
      });
    } finally {
      setIsLoadingPrevious(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Upload a Character Image</h3>
        <p className="text-muted-foreground mb-4">
          Upload a photo of your character or choose from your previous cartoonized images.
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          checked={usePreviousImage}
          onCheckedChange={setUsePreviousImage}
          id="use-previous"
        />
        <Label htmlFor="use-previous" className="cursor-pointer">
          <History className="h-4 w-4 inline mr-2" />
          Use a previous cartoonized image
        </Label>
      </div>

      {usePreviousImage ? (
        <div className="space-y-4">
          {isLoadingPrevious ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading your previous images...</span>
            </div>
          ) : previousImages.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {previousImages.map((image, index) => (
                <Card
                  key={index}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    formData.imageUrl === image.original_url ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleSelectPrevious(image)}
                >
                  <CardContent className="p-3">
                    <div className="aspect-square relative rounded overflow-hidden mb-2">
                      <img
                        src={image.generated_url} // Show the cartoonized version
                        alt={`Previous cartoonized character ${index + 1}`}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      {new Date(image.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No previous cartoonized images found.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Create your first character to see it here next time!
              </p>
            </div>
          )}

          {formData.imageUrl && (
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium">Selected Previous Image</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSelection}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="aspect-video relative rounded overflow-hidden">
                  <img
                    src={formData.cartoonizedUrl || formData.imageUrl}
                    alt="Selected character"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
                {formData.cartoonizedUrl && (
                  <p className="text-sm text-green-600 mt-2">
                    ✅ This character is already cartoonized and ready to use!
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-secondary/50">
            {isLoading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Click to upload an image</span>
              </>
            )}
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={isLoading}
            />
          </label>

          {formData.imageUrl && (
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium">Selected Image</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSelection}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="aspect-video relative rounded overflow-hidden">
                  <img
                    src={formData.imageUrl}
                    alt="Selected character"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
                {!formData.cartoonizedUrl && (
                  <p className="text-sm text-muted-foreground mt-2">
                    This image will be cartoonized in the next step.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}