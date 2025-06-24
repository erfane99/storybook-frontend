'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useStoryProgress } from '@/hooks/use-story-progress';
import { User, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

interface Profile {
  user_id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  onboarding_step: 'not_started' | 'profile_completed' | 'story_created' | 'paid';
  user_type: 'user' | 'admin';
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  saveAnonymousProgress: () => Promise<void>;
  updateOnboardingStep: (step: Profile['onboarding_step']) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PROFILE_REFRESH_INTERVAL = 60000;
const MAX_RETRY_ATTEMPTS = 2;

// Export the AuthProvider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [supabase, setSupabase] = useState<SupabaseClient<Database> | null>(null);
  const { progress, clearProgress } = useStoryProgress();
  const { toast } = useToast();
  const router = useRouter();

  const currentUserRef = useRef<User | null>(null);
  const profileRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);
  const authInitializedRef = useRef<boolean>(false);

  useEffect(() => {
    currentUserRef.current = user;
  }, [user]);

  // Production-standard: Clean up OAuth parameters after successful authentication
  const cleanupOAuthParams = useCallback(() => {
    try {
      const currentUrl = window.location;
      const hasOAuthParams = currentUrl.search.includes('code=') || 
                            currentUrl.search.includes('error=') || 
                            currentUrl.hash.includes('access_token=');
      
      if (hasOAuthParams) {
        console.log('🔐 [AuthProvider] 🧹 Cleaning up OAuth parameters...');
        const cleanUrl = `${currentUrl.origin}${currentUrl.pathname}`;
        window.history.replaceState({}, document.title, cleanUrl);
        console.log('🔐 [AuthProvider] ✅ OAuth parameters cleaned');
      }
    } catch (error) {
      console.error('🔐 [AuthProvider] OAuth cleanup error (non-critical):', error);
    }
  }, []);

  const getRetryDelay = useCallback((attempt: number): number => {
    return Math.min(1000 * Math.pow(2, attempt), 5000);
  }, []);

  const refreshProfile = useCallback(async (client = supabase, userId?: string): Promise<void> => {
    const targetUserId = userId || currentUserRef.current?.id;

    if (!client || !targetUserId) return;

    const attemptRefresh = async (attempt: number = 0): Promise<void> => {
      try {
        const { data: profileData, error: profileError } = await client
          .from('profiles')
          .select('*')
          .eq('user_id', targetUserId)
          .single();

        retryCountRef.current = 0;

        if (profileError && profileError.code !== 'PGRST116') throw profileError;

        setProfile(profileData ? (profileData as Profile) : null);
      } catch (error) {
        const isRetryableError = (error as any)?.code === 'PGRST301';

        if (isRetryableError && attempt < MAX_RETRY_ATTEMPTS) {
          const retryDelay = getRetryDelay(attempt);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return attemptRefresh(attempt + 1);
        }

        setProfile(null);

        if (retryCountRef.current >= 2 && toast) {
          toast({
            variant: 'destructive',
            title: 'Connection Issue',
            description: 'Profile loading is slow. App will continue without profile data.',
          });
        }
      }
    };

    await attemptRefresh();
  }, [supabase, getRetryDelay, toast]);

  const createProfileIfNotExists = useCallback(async (client: SupabaseClient<Database>, user: User): Promise<void> => {
    try {
      const { data: existingProfile, error: profileCheckError } = await client
        .from('profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .single();

      if (profileCheckError && profileCheckError.code === 'PGRST116') {
        const currentTime = new Date().toISOString();
        const profileData = {
          user_id: user.id,
          email: user.email || '',
          user_type: 'user' as const,
          onboarding_step: 'not_started' as const,
          full_name: user.user_metadata?.full_name || '',
          avatar_url: user.user_metadata?.avatar_url || '',
          created_at: currentTime,
        };

        const { error: insertError } = await client
          .from('profiles')
          .insert(profileData)
          .single();

        if (insertError && toast) {
          toast({
            variant: 'destructive',
            title: 'Profile Creation Warning',
            description: 'Account verified but profile setup incomplete. Please contact support if issues persist.',
          });
        }
      }
    } catch (error) {
      console.error('🔐 [AuthProvider] Profile creation error (non-critical):', error);
      if (toast) {
        toast({
          variant: 'destructive',
          title: 'Profile Setup Delayed',
          description: 'Profile creation is taking longer than expected. You can continue using the app.',
        });
      }
    }
  }, [toast]);

  // Production-standard: Supabase client initialization
  useEffect(() => {
    const initSupabase = async () => {
      console.log('🔐 [AuthProvider] Starting Supabase initialization...');
      console.log('🔐 [AuthProvider] Current URL:', window.location.href);
      
      try {
        console.log('🔐 [AuthProvider] Importing Supabase client...');
        const { getUniversalSupabase } = await import('@/lib/supabase/universal');
        
        console.log('🔐 [AuthProvider] Creating Supabase client...');
        const client = await getUniversalSupabase();
        
        console.log('🔐 [AuthProvider] ✅ Supabase client created successfully');
        setSupabase(client);
        
        // Production pattern: Try to get initial session but don't depend on it
        try {
          console.log('🔐 [AuthProvider] Checking for existing session...');
          const { data: sessionData } = await client.auth.getSession();
          
          if (sessionData?.session?.user) {
            console.log('🔐 [AuthProvider] ✅ Found existing session');
            setUser(sessionData.session.user);
            // Don't set loading false here - auth events will handle it
          } else {
            console.log('🔐 [AuthProvider] ℹ️ No existing session found');
          }
        } catch (sessionError) {
          console.log('🔐 [AuthProvider] ℹ️ Session check failed (non-critical) - will rely on auth events');
        }
        
      } catch (error) {
        console.error('🔐 [AuthProvider] ❌ Critical initialization error:', error);
        // Still set loading to false so app doesn't hang
        setIsLoading(false);
      }
    };

    initSupabase();
  }, []);

  // Production-standard: Event-driven authentication (primary mechanism)
  useEffect(() => {
    if (!supabase) return;

    console.log('🔐 [AuthProvider] Setting up auth state change listener...');

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 [AuthProvider] 🔄 Auth event:', event);
      console.log('🔐 [AuthProvider] Session details:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        userEmail: session?.user?.email
      });

      // Production pattern: Set loading false on any auth event (prevents infinite loading)
      if (!authInitializedRef.current) {
        console.log('🔐 [AuthProvider] ✅ Auth system initialized - setting loading false');
        setIsLoading(false);
        authInitializedRef.current = true;
      }

      if (event === 'SIGNED_IN' && session?.user) {
        console.log('🔐 [AuthProvider] ✅ User signed in successfully');
        setUser(session.user);
        
        // Clean up OAuth parameters immediately
        cleanupOAuthParams();
        
        // Background operations (non-blocking)
        console.log('🔐 [AuthProvider] Starting background profile operations...');
        createProfileIfNotExists(supabase, session.user)
          .then(() => {
            console.log('🔐 [AuthProvider] ✅ Profile operations completed');
            return refreshProfile(supabase, session.user.id);
          })
          .catch((error) => {
            console.error('🔐 [AuthProvider] ⚠️ Background profile operations failed (non-critical):', error);
          });
        
        // Stay on current page - don't redirect for existing sessions
        console.log('🔐 [AuthProvider] User authenticated - staying on current page');
        
      } else if (event === 'SIGNED_OUT') {
        console.log('🔐 [AuthProvider] 🚪 User signed out');
        setUser(null);
        setProfile(null);
        retryCountRef.current = 0;
        
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        console.log('🔐 [AuthProvider] 🔄 Token refreshed');
        setUser(session.user);
        
      } else {
        console.log('🔐 [AuthProvider] ℹ️ Other auth event:', event);
      }
    });

    console.log('🔐 [AuthProvider] ✅ Auth state listener ready');

    return () => {
      console.log('🔐 [AuthProvider] 🧹 Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, [supabase, router, createProfileIfNotExists, refreshProfile, cleanupOAuthParams]);

  // Profile refresh interval
  useEffect(() => {
    if (profileRefreshIntervalRef.current) {
      clearInterval(profileRefreshIntervalRef.current);
    }

    if (user) {
      profileRefreshIntervalRef.current = setInterval(() => {
        refreshProfile();
      }, PROFILE_REFRESH_INTERVAL);
    }

    return () => {
      if (profileRefreshIntervalRef.current) {
        clearInterval(profileRefreshIntervalRef.current);
        profileRefreshIntervalRef.current = null;
      }
    };
  }, [user, refreshProfile]);

  const updateOnboardingStep = useCallback(async (step: Profile['onboarding_step']): Promise<void> => {
    if (!currentUserRef.current?.id || !supabase) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_step: step })
        .eq('user_id', currentUserRef.current.id);

      if (error) throw error;

      await refreshProfile();
    } catch (error) {
      if (toast) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to update onboarding progress',
        });
      }
    }
  }, [supabase, refreshProfile, toast]);

  const saveAnonymousProgress = useCallback(async (): Promise<void> => {
    if (!currentUserRef.current || !progress || !supabase) return;

    try {
      const { data: storyData } = await supabase
        .from('stories')
        .insert({
          title: progress.title,
          raw_text: progress.story,
          user_id: currentUserRef.current.id,
        })
        .select()
        .single();

      if (progress.scenes?.length > 0) {
        const scenesData = progress.scenes.map((scene, index) => ({
          story_id: storyData.id,
          scene_number: index + 1,
          scene_text: scene.description,
          generated_image_url: scene.generatedImage,
        }));

        await supabase
          .from('story_scenes')
          .insert(scenesData);
      }

      await updateOnboardingStep('story_created');
      clearProgress();

      if (toast) {
        toast({
          title: 'Success',
          description: 'Your story has been saved to your account!',
        });
      }
    } catch (error) {
      if (toast) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to save story progress',
        });
      }
    }
  }, [supabase, progress, updateOnboardingStep, clearProgress, toast]);

  const signOut = useCallback(async (): Promise<void> => {
    if (!supabase) return;

    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      retryCountRef.current = 0;

      if (router) {
        router.replace('/');
      }
    } catch (error) {
      setUser(null);
      setProfile(null);
      retryCountRef.current = 0;

      if (router) {
        router.replace('/');
      }

      if (toast) {
        toast({
          title: 'Signed Out',
          description: 'You have been signed out locally. Server sync may be delayed.',
        });
      }
    }
  }, [supabase, router, toast]);

  const contextValue: AuthContextType = {
    user,
    profile,
    isLoading,
    signOut,
    saveAnonymousProgress,
    updateOnboardingStep,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Export the useAuth hook with explicit typing
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}