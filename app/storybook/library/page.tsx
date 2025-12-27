'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { Book, ChevronRight, PlusCircle, Trash2, Share2, RefreshCw } from 'lucide-react';
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
}

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
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full" />
                </CardContent>
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
            {storybooks.map((storybook) => (
              <Card key={storybook.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{storybook.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleShare(storybook.id)}
                              className="hover:bg-secondary"
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
                              onClick={() => setDeleteId(storybook.id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Created on {formatDate(storybook.created_at)}
                  </p>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button 
                    variant="outline"
                    onClick={() => router.push(`/storybook/${storybook.id}`)}
                  >
                    View Storybook
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
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