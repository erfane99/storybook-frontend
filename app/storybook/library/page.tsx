'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { Book, ChevronRight, PlusCircle, Trash2, Share2, RefreshCw, BookOpen } from 'lucide-react';
import { formatDate } from '@/lib/utils/helpers';
import { getClientSupabase } from '@/lib/supabase/client';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from '@/lib/api';
import { useDevice } from '@/hooks/use-device';
import { cn } from '@/lib/utils';

interface Storybook {
  id: string;
  title: string;
  created_at: string;
  cover_image?: string;
  audience?: 'children' | 'young_adults' | 'adults';
  pages?: { scenes: any[] }[];
}

const audienceLabels = {
  children: '👶 Children',
  young_adults: '🧑 Young Adults',
  adults: '👤 Adults'
};

const getPanelCount = (pages?: { scenes: any[] }[]): number => {
  if (!pages) return 0;
  return pages.reduce((sum, page) => sum + (page.scenes?.length || 0), 0);
};

export const dynamic = 'force-dynamic';

export default function LibraryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [storybooks, setStorybooks] = useState<Storybook[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Pull-to-refresh state
  const { isMobile } = useDevice();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Extract fetchStorybooks to be reusable
  const fetchStorybooks = useCallback(async () => {
    try {
      const supabase = getClientSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No access token available');
      }

      const { storybooks: data } = await api.getUserStorybooks(session.access_token);
      setStorybooks(data);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to load storybooks',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (!user.email_confirmed_at) {
      router.push('/auth/verify');
      return;
    }

    fetchStorybooks();
  }, [user, router, fetchStorybooks]);

  // Pull-to-refresh touch handlers (mobile only)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0 && !isRefreshing) {
      touchStartY.current = e.touches[0].clientY;
    }
  }, [isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current > 0 && !isRefreshing) {
      const distance = e.touches[0].clientY - touchStartY.current;
      if (distance > 0) {
        setPullDistance(Math.min(distance * 0.5, 100)); // Dampen the pull
      }
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > 60 && !isRefreshing) {
      setIsRefreshing(true);
      await fetchStorybooks();
      setIsRefreshing(false);
      toast({
        title: 'Refreshed',
        description: 'Your library has been updated.',
      });
    }
    setPullDistance(0);
    touchStartY.current = 0;
  }, [pullDistance, isRefreshing, fetchStorybooks, toast]);

  const handleDelete = async (id: string) => {
    try {
      const supabase = getClientSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No access token available');
      }

      await api.deleteStorybookById(id, session.access_token);

      setStorybooks(prev => prev.filter(book => book.id !== id));
      toast({
        title: 'Success',
        description: 'Storybook deleted successfully',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete storybook',
      });
    } finally {
      setDeleteId(null);
    }
  };

  const handleShare = async (id: string) => {
    try {
      const shareUrl = `${window.location.origin}/storybook/${id}/view`;
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: 'Link copied',
        description: 'You can now share your storybook with others',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to copy link to clipboard',
      });
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-background py-12 relative"
      onTouchStart={isMobile ? handleTouchStart : undefined}
      onTouchMove={isMobile ? handleTouchMove : undefined}
      onTouchEnd={isMobile ? handleTouchEnd : undefined}
    >
      {/* Pull-to-refresh indicator */}
      {isMobile && (pullDistance > 0 || isRefreshing) && (
        <div 
          className={cn(
            'absolute left-1/2 -translate-x-1/2 flex items-center justify-center',
            'transition-all duration-200'
          )}
          style={{ 
            top: Math.min(pullDistance, 60) + 8,
            opacity: isRefreshing ? 1 : Math.min(pullDistance / 60, 1)
          }}
        >
          <RefreshCw 
            className={cn(
              'h-6 w-6 text-primary',
              isRefreshing && 'animate-spin'
            )} 
          />
        </div>
      )}
      
      <div 
        className="container max-w-4xl transition-transform duration-200"
        style={{ transform: isMobile && pullDistance > 0 ? `translateY(${pullDistance * 0.5}px)` : undefined }}
      >
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Your Stories</h1>
          <Button onClick={() => router.push('/create')}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Create New Story
          </Button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <div className="flex">
                  {/* Cover skeleton */}
                  <div className="flex-shrink-0 w-24 md:w-28">
                    <Skeleton className="aspect-[3/4] w-full" />
                  </div>
                  {/* Content skeleton */}
                  <div className="flex-1 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Skeleton className="h-6 w-48" />
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-8 rounded" />
                        <Skeleton className="h-8 w-8 rounded" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-24 mb-2" />
                    <Skeleton className="h-4 w-40 mb-4" />
                    <div className="flex gap-2 mt-auto">
                      <Skeleton className="h-9 w-24" />
                      <Skeleton className="h-9 w-20" />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : storybooks.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                <Book className="h-12 w-12 text-muted-foreground" />
                <h2 className="text-xl font-semibold">You haven't created any stories yet</h2>
                <p className="text-muted-foreground mb-4">
                  Start creating magical stories with your own photos
                </p>
                <Button onClick={() => router.push('/create')}>
                  Create Your First Story
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {storybooks.map((storybook) => {
              const pageCount = storybook.pages?.length || 0;
              const panelCount = getPanelCount(storybook.pages);
              
              return (
                <Card key={storybook.id} className="hover:shadow-lg transition-shadow overflow-hidden">
                  <div className="flex">
                    {/* Cover image thumbnail */}
                    <div className="flex-shrink-0 w-24 md:w-28">
                      {storybook.cover_image ? (
                        <div className="aspect-[3/4] w-full relative">
                          <Image
                            src={storybook.cover_image}
                            alt={storybook.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 96px, 112px"
                          />
                        </div>
                      ) : (
                        <div className="aspect-[3/4] w-full bg-gradient-to-br from-primary/60 to-primary/90 flex items-center justify-center">
                          <Book className="h-8 w-8 text-primary-foreground/80" />
                        </div>
                      )}
                    </div>
                    
                    {/* Content area */}
                    <div className="flex-1 flex flex-col p-4">
                      {/* Header with title and action buttons */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <CardTitle className="text-lg leading-tight line-clamp-2">
                          {storybook.title}
                        </CardTitle>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-secondary"
                                  onClick={() => handleShare(storybook.id)}
                                >
                                  <Share2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Copy share link</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setDeleteId(storybook.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete storybook</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                      
                      {/* Audience badge */}
                      {storybook.audience && (
                        <div className="mb-2">
                          <Badge variant="secondary" className="text-xs">
                            {audienceLabels[storybook.audience]}
                          </Badge>
                        </div>
                      )}
                      
                      {/* Metadata */}
                      <div className="text-sm text-muted-foreground mb-3">
                        {pageCount > 0 && (
                          <span>{pageCount} {pageCount === 1 ? 'page' : 'pages'}</span>
                        )}
                        {pageCount > 0 && panelCount > 0 && <span className="mx-1">·</span>}
                        {panelCount > 0 && (
                          <span>{panelCount} {panelCount === 1 ? 'panel' : 'panels'}</span>
                        )}
                        {(pageCount > 0 || panelCount > 0) && <span className="mx-1">·</span>}
                        <span>Created {formatDate(storybook.created_at)}</span>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex gap-2 mt-auto">
                        <Button 
                          size="sm"
                          onClick={() => router.push(`/storybook/${storybook.id}?autoRead=true`)}
                        >
                          <BookOpen className="h-4 w-4 mr-1.5" />
                          Read
                        </Button>
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/storybook/${storybook.id}`)}
                        >
                          Details
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your storybook.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteId && handleDelete(deleteId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
