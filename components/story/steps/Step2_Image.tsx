'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Upload, History, Loader2, X, Calendar, Palette, RefreshCw, Search } from 'lucide-react';
import { StoryFormData } from '../MultiStepStoryFormWithJobs';
import { getClientSupabase } from '@/lib/supabase/client';
import { api } from '@/lib/api-client';
import type { CartoonItem, PreviousCartoonsRequest } from '@/lib/api-client';

interface Step2_ImageProps {
  formData: StoryFormData;
  updateFormData: (data: Partial<StoryFormData>) => void;
}

export function Step2_Image({ formData, updateFormData }: Step2_ImageProps) {
  const [usePreviousImage, setUsePreviousImage] = useState(false);
  const [previousCartoons, setPreviousCartoons] = useState<CartoonItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);
  const [selectedCartoon, setSelectedCartoon] = useState<CartoonItem | null>(null);
  const [loadingCharacterDescription, setLoadingCharacterDescription] = useState(false);
  const [availableStyles, setAvailableStyles] = useState<string[]>([]);
  const [selectedStyleFilter, setSelectedStyleFilter] = useState<string>('all');
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const supabase = getClientSupabase();

  // Load previous cartoons when toggle is switched on
  useEffect(() => {
    if (usePreviousImage) {
      fetchPreviousCartoons();
    } else {
      // Clear previous cartoon data when switching back to upload
      setPreviousCartoons([]);
      setSelectedCartoon(null);
      setAvailableStyles([]);
      setSelectedStyleFilter('all');
    }
  }, [usePreviousImage]);

  // Load more cartoons when style filter changes
  useEffect(() => {
    if (usePreviousImage && selectedStyleFilter !== 'all') {
      fetchPreviousCartoons(true); // Reset to first page
    }
  }, [selectedStyleFilter]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const file = e.target.files[0];
    setIsLoading(true);

    try {
      const formDataToUpload = new FormData();
      formDataToUpload.append('image', file);

      console.log('🖼️ Uploading new image...');
      const { secure_url } = await api.uploadImage(formDataToUpload);

      updateFormData({
        characterImage: file,
        imageUrl: secure_url,
        // Clear any previous cartoonized data when uploading new image
        cartoonizedUrl: undefined,
        characterDescription: undefined,
        cartoonSaveId: undefined,
        isPermanentlySaved: false,
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

  const handleSelectPrevious = async (cartoon: CartoonItem) => {
    console.log('📸 Selected previous cartoonized image:', cartoon);
    
    setSelectedCartoon(cartoon);
    setLoadingCharacterDescription(true);

    try {
      // Load character description if not already available
      let characterDescription = cartoon.characterDescription;
      
      if (!characterDescription) {
        console.log('🔍 Loading character description for selected cartoon...');
        const describeResponse = await api.describeCharacter({
          imageUrl: cartoon.cartoonUrl, // ✅ FIXED: Use cartoonUrl (matches API response)
          options: {
            detailLevel: 'detailed',
            includeStyle: true,
            includeColors: true,
            includeExpression: true,
          }
        });
        characterDescription = describeResponse.characterDescription;
      }

      updateFormData({
        imageUrl: cartoon.originalUrl, // ✅ FIXED: Use originalUrl (matches API response)
        cartoonizedUrl: cartoon.cartoonUrl, // ✅ FIXED: Use cartoonUrl (matches API response)
        characterDescription: characterDescription,
        cartoonStyle: cartoon.style, // ✅ FIXED: Use style (matches API response)
        characterImage: null, // Clear file since we're using URL
        cartoonSaveId: cartoon.id,
        isPermanentlySaved: true,
      });

      toast({
        title: 'Previous Character Selected',
        description: `Using your ${cartoon.style} style character from ${new Date(cartoon.createdAt).toLocaleDateString()}.`,
      });

    } catch (error: any) {
      console.error('❌ Failed to load character description:', error);
      toast({
        variant: 'destructive',
        title: 'Warning',
        description: 'Selected cartoon but failed to load character description. You can still continue.',
      });
      
      // Still update form data even if description fails
      updateFormData({
        imageUrl: cartoon.originalUrl, // ✅ FIXED: Use originalUrl
        cartoonizedUrl: cartoon.cartoonUrl, // ✅ FIXED: Use cartoonUrl
        characterDescription: cartoon.characterDescription || 'Character description unavailable',
        cartoonStyle: cartoon.style, // ✅ FIXED: Use style
        characterImage: null,
        cartoonSaveId: cartoon.id,
        isPermanentlySaved: true,
      });
    } finally {
      setLoadingCharacterDescription(false);
    }
  };

  const handleClearSelection = () => {
    updateFormData({
      characterImage: null,
      imageUrl: undefined,
      cartoonizedUrl: undefined,
      characterDescription: undefined,
      cartoonStyle: '',
      cartoonSaveId: undefined,
      isPermanentlySaved: false,
    });
    setSelectedCartoon(null);
  };

  const fetchPreviousCartoons = async (resetPage = false) => {
    setIsLoadingPrevious(true);
    
    try {
      console.log('🔍 Fetching previous cartoonized images from API...');
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        toast({
          variant: 'destructive',
          title: 'Authentication Required',
          description: 'Please sign in to access your previous images.',
        });
        return;
      }

      const page = resetPage ? 1 : currentPage;
      const request: PreviousCartoonsRequest = {
        page,
        limit: 12,
        sortBy: 'created_at',
        sortOrder: 'desc',
      };

      // Add style filter if selected
      if (selectedStyleFilter !== 'all') {
        request.filter = {
          artStyle: selectedStyleFilter,
        };
      }

      const response = await api.getPreviousCartoons(request);

      console.log('✅ Found previous cartoons:', response.cartoons.length);
      // ✅ FIXED: Use correct API response structure
      console.log('📊 Available styles:', response.statistics?.availableStyles);

      if (resetPage || page === 1) {
        setPreviousCartoons(response.cartoons);
        setCurrentPage(1);
      } else {
        setPreviousCartoons(prev => [...prev, ...response.cartoons]);
      }

      setHasMore(response.pagination?.hasMore || false);
      // ✅ FIXED: Access availableStyles from statistics, not filters, with proper fallback
      setAvailableStyles(response.statistics?.availableStyles || []);
      
      if (resetPage) {
        setCurrentPage(1);
      }

      if (response.cartoons.length === 0 && page === 1) {
        toast({
          title: 'No Previous Images',
          description: selectedStyleFilter === 'all' 
            ? "You haven't created any cartoonized characters yet."
            : `No ${selectedStyleFilter} style characters found.`,
        });
      }

    } catch (error: any) {
      console.error('❌ Error fetching previous cartoons:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load previous images. Please try again.',
      });
    } finally {
      setIsLoadingPrevious(false);
    }
  };

  const loadMoreCartoons = () => {
    if (!isLoadingPrevious && hasMore) {
      setCurrentPage(prev => prev + 1);
      fetchPreviousCartoons();
    }
  };

  const retryFetchCartoons = () => {
    setCurrentPage(1);
    fetchPreviousCartoons(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'premium': return 'bg-purple-100 text-purple-800';
      case 'high': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
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
          {/* Style Filter */}
          {availableStyles.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filter by style:</span>
              <Button
                variant={selectedStyleFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStyleFilter('all')}
              >
                All Styles
              </Button>
              {availableStyles.map(style => (
                <Button
                  key={style}
                  variant={selectedStyleFilter === style ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedStyleFilter(style)}
                >
                  {style.charAt(0).toUpperCase() + style.slice(1)}
                </Button>
              ))}
            </div>
          )}

          {/* Loading State */}
          {isLoadingPrevious && previousCartoons.length === 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading your previous images...</span>
              </div>
              {/* Loading Skeletons */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Card key={i}>
                    <CardContent className="p-3">
                      <Skeleton className="aspect-square w-full mb-2" />
                      <Skeleton className="h-4 w-3/4 mb-1" />
                      <Skeleton className="h-3 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : previousCartoons.length > 0 ? (
            <div className="space-y-4">
              {/* Cartoons Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {previousCartoons.map((cartoon) => (
                  <Card
                    key={cartoon.id}
                    className={`cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${
                      selectedCartoon?.id === cartoon.id ? 'ring-2 ring-primary bg-primary/5' : ''
                    }`}
                    onClick={() => handleSelectPrevious(cartoon)}
                  >
                    <CardContent className="p-3">
                      <div className="aspect-square relative rounded overflow-hidden mb-3">
                        <img
                          src={cartoon.cartoonUrl} // ✅ FIXED: Use cartoonUrl (matches API response)
                          alt={`${cartoon.style} character from ${formatDate(cartoon.createdAt)}`} // ✅ FIXED: Use style
                          className="absolute inset-0 w-full h-full object-cover"
                          loading="lazy"
                        />
                        {/* Quality Badge */}
                        {cartoon.quality && (
                          <div className="absolute top-2 right-2">
                            <Badge className={`text-xs ${getQualityColor(cartoon.quality)}`}>
                              {cartoon.quality}
                            </Badge>
                          </div>
                        )}
                        {/* Selected Indicator */}
                        {selectedCartoon?.id === cartoon.id && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <div className="bg-primary text-primary-foreground rounded-full p-2">
                              ✓
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Metadata */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Palette className="h-3 w-3" />
                          <span className="font-medium">{cartoon.style}</span> {/* ✅ FIXED: Use style */}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(cartoon.createdAt)}</span>
                        </div>
                        {cartoon.tags && cartoon.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {cartoon.tags.slice(0, 2).map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs px-1 py-0">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="text-center">
                  <Button
                    variant="outline"
                    onClick={loadMoreCartoons}
                    disabled={isLoadingPrevious}
                  >
                    {isLoadingPrevious ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* Empty State */
            <div className="text-center py-12">
              <History className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h4 className="text-lg font-medium mb-2">No Previous Characters Found</h4>
              <p className="text-muted-foreground mb-4">
                {selectedStyleFilter === 'all' 
                  ? "You haven't created any cartoonized characters yet."
                  : `No ${selectedStyleFilter} style characters found.`
                }
              </p>
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setUsePreviousImage(false)}
                >
                  Upload New Image
                </Button>
                {selectedStyleFilter !== 'all' && (
                  <Button
                    variant="outline"
                    onClick={() => setSelectedStyleFilter('all')}
                  >
                    Show All Styles
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={retryFetchCartoons}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          )}

          {/* Selected Cartoon Preview */}
          {selectedCartoon && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-medium text-green-800">Selected Character</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSelection}
                    className="text-green-700 hover:text-green-900"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Character Image */}
                  <div className="aspect-square relative rounded overflow-hidden">
                    <img
                      src={selectedCartoon.cartoonUrl} // ✅ FIXED: Use cartoonUrl
                      alt="Selected character"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Character Details */}
                  <div className="md:col-span-2 space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-green-800">Style:</span>
                        <p className="text-green-700">{selectedCartoon.style}</p> {/* ✅ FIXED: Use style */}
                      </div>
                      {selectedCartoon.quality && (
                        <div>
                          <span className="font-medium text-green-800">Quality:</span>
                          <p className="text-green-700">{selectedCartoon.quality}</p>
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-green-800">Created:</span>
                        <p className="text-green-700">{formatDate(selectedCartoon.createdAt)}</p>
                      </div>
                      {selectedCartoon.metadata?.processingTime && (
                        <div>
                          <span className="font-medium text-green-800">Processing:</span>
                          <p className="text-green-700">{selectedCartoon.metadata.processingTime}ms</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Character Description */}
                    {loadingCharacterDescription ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-green-700">Loading character description...</span>
                      </div>
                    ) : (
                      <div>
                        <span className="font-medium text-green-800">Description:</span>
                        <p className="text-green-700 text-sm mt-1">
                          {formData.characterDescription || selectedCartoon.characterDescription || 'No description available'}
                        </p>
                      </div>
                    )}
                    
                    {/* Tags */}
                    {selectedCartoon.tags && selectedCartoon.tags.length > 0 && (
                      <div>
                        <span className="font-medium text-green-800">Tags:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedCartoon.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="bg-green-100 p-3 rounded-lg">
                      <p className="text-sm text-green-800">
                        ✅ This character is already cartoonized and ready to use! 
                        You can skip the cartoonization step and proceed directly to story creation.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        /* Upload Section */
        <div className="space-y-4">
          <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors">
            {isLoading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Uploading image...</span>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Click to upload an image</span>
                <span className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</span>
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

          {/* Selected Upload Preview */}
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
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      📝 This image will be cartoonized in the next step using AI to match your chosen art style.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}