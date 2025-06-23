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

const TIMEOUTS = {
  AUTH: 15000,
  DATABASE: 8000,
  BACKGROUND: 5000,
  CRITICAL: 20000,
} as const;

const MAX_RETRY_ATTEMPTS = 2;

// Export the AuthProvider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [supabase, setSupabase] = useState<SupabaseClient<Database> | null>(null);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const { progress, clearProgress } = useStoryProgress();
  const { toast } = useToast();
  const router = useRouter();

  const currentUserRef = useRef<User | null>(null);
  const profileRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);

  useEffect(() => {
    currentUserRef.current = user;
  }, [user]);

  const withTimeout = useCallback(<TResult,>(
    promise: Promise<TResult>,
    timeoutMs: number,
    operation: string = 'Database operation'
  ): Promise<TResult> => {
    return new Promise<TResult>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        console.error(`⏰ [withTimeout] ${operation} timed out after ${timeoutMs}ms`);
        reject(new Error(`${operation} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }, []);

  const getRetryDelay = useCallback((attempt: number): number => {
    return Math.min(1000 * Math.pow(2, attempt), 5000);
  }, []);

  const refreshProfile = useCallback(async (client = supabase, userId?: string): Promise<void> => {
    const targetUserId = userId || currentUserRef.current?.id;

    if (!client || !targetUserId) return;

    const attemptRefresh = async (attempt: number = 0): Promise<void> => {
      try {
        const queryPromise = client
          .from('profiles')
          .select('*')
          .eq('user_id', targetUserId)
          .single();

        const { data: profileData, error: profileError } = await queryPromise;

        retryCountRef.current = 0;

        if (profileError && profileError.code !== 'PGRST116') throw profileError;

        setProfile(profileData ? (profileData as Profile) : null);
      } catch (error) {
        const isTimeoutError = error instanceof Error && error.message.includes('timed out');
        const isRetryableError = isTimeoutError || (error as any)?.code === 'PGRST301';

        if (isRetryableError && attempt < MAX_RETRY_ATTEMPTS) {
          const retryDelay = getRetryDelay(attempt);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return attemptRefresh(attempt + 1);
        }

        setProfile(null);

        if (isTimeoutError && retryCountRef.current >= 2 && toast) {
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
      const checkPromise = client
        .from('profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .single();

      const { data: existingProfile, error: profileCheckError } = await checkPromise;

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

        const insertPromise = client
          .from('profiles')
          .insert(profileData)
          .single();

        const { error: insertError } = await insertPromise;

        if (insertError && toast) {
          toast({
            variant: 'destructive',
            title: 'Profile Creation Warning',
            description: 'Account verified but profile setup incomplete. Please contact support if issues persist.',
          });
        }
      }
    } catch (error) {
      const isTimeoutError = error instanceof Error && error.message.includes('timed out');

      if (isTimeoutError && toast) {
        toast({
          variant: 'destructive',
          title: 'Profile Setup Delayed',
          description: 'Profile creation is taking longer than expected. You can continue using the app.',
        });
      }
    }
  }, [toast]);

  useEffect(() => {
    const initSupabase = async () => {
      console.log('🔐 [AuthProvider] Starting Supabase initialization...');
      console.log('🔐 [AuthProvider] Current URL:', window.location.href);
      console.log('🔐 [AuthProvider] URL Hash:', window.location.hash);
      console.log('🔐 [AuthProvider] URL Search:', window.location.search);
      
      try {
        console.log('🔐 [AuthProvider] Importing Supabase client...');
        const { getUniversalSupabase } = await import('@/lib/supabase/universal');
        
        console.log('🔐 [AuthProvider] Creating Supabase client...');
        const client = await getUniversalSupabase();
        
        console.log('🔐 [AuthProvider] ✅ Supabase client created successfully');
        console.log('🔐 [AuthProvider] Client URL:', client.supabaseUrl);
        console.log('🔐 [AuthProvider] Client Key (first 10 chars):', client.supabaseKey.substring(0, 10) + '...');
        
        setSupabase(client);

        console.log('🔐 [AuthProvider] Getting current session...');
        const sessionStart = Date.now();
        
        const { data: sessionData, error: sessionError } = await client.auth.getSession();
        
        const sessionDuration = Date.now() - sessionStart;
        console.log('🔐 [AuthProvider] Session retrieval took:', sessionDuration + 'ms');

        if (sessionError) {
          console.error('🔐 [AuthProvider] ❌ Session error:', sessionError);
          console.error('🔐 [AuthProvider] Session error details:', {
            message: sessionError.message,
            status: sessionError.status,
            name: sessionError.name
          });
          setInitializationError(sessionError.message);
        } else {
          console.log('🔐 [AuthProvider] ✅ Session retrieved successfully');
          console.log('🔐 [AuthProvider] Session data structure:', {
            hasSession: !!sessionData?.session,
            hasUser: !!sessionData?.session?.user,
            sessionKeys: sessionData?.session ? Object.keys(sessionData.session) : 'no session'
          });

          if (sessionData?.session) {
            console.log('🔐 [AuthProvider] 📋 Session details:', {
              accessToken: sessionData.session.access_token ? 'present (length: ' + sessionData.session.access_token.length + ')' : 'missing',
              refreshToken: sessionData.session.refresh_token ? 'present (length: ' + sessionData.session.refresh_token.length + ')' : 'missing',
              expiresAt: sessionData.session.expires_at,
              expiresIn: sessionData.session.expires_in,
              tokenType: sessionData.session.token_type,
              providerToken: sessionData.session.provider_token ? 'present' : 'missing',
              providerRefreshToken: sessionData.session.provider_refresh_token ? 'present' : 'missing'
            });

            if (sessionData.session.user) {
              console.log('🔐 [AuthProvider] 👤 User object found:', {
                id: sessionData.session.user.id,
                email: sessionData.session.user.email,
                emailConfirmed: sessionData.session.user.email_confirmed_at ? 'confirmed' : 'not confirmed',
                provider: sessionData.session.user.app_metadata?.provider,
                providers: sessionData.session.user.app_metadata?.providers,
                userMetadata: Object.keys(sessionData.session.user.user_metadata || {}),
                createdAt: sessionData.session.user.created_at,
                lastSignIn: sessionData.session.user.last_sign_in_at
              });

              console.log('🔐 [AuthProvider] Setting user state...');
              setUser(sessionData.session.user);
              console.log('🔐 [AuthProvider] ✅ User state set successfully');

              console.log('🔐 [AuthProvider] Refreshing user profile...');
              await refreshProfile(client, sessionData.session.user.id);
              console.log('🔐 [AuthProvider] ✅ Profile refresh completed');
            } else {
              console.log('🔐 [AuthProvider] ⚠️ Session exists but no user object found');
              console.log('🔐 [AuthProvider] Full session object:', sessionData.session);
            }
          } else {
            console.log('🔐 [AuthProvider] ℹ️ No active session found');
            console.log('🔐 [AuthProvider] This is normal for unauthenticated users');
          }
        }
      } catch (error) {
        console.error('🔐 [AuthProvider] ❌ Initialization failed:', error);
        console.error('🔐 [AuthProvider] Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : 'No stack trace',
          name: error instanceof Error ? error.name : 'Unknown error type'
        });
        setInitializationError((error as Error)?.message ?? 'Initialization failed');
      } finally {
        console.log('🔐 [AuthProvider] Setting loading to false...');
        setIsLoading(false);
        console.log('🔐 [AuthProvider] ✅ Initialization complete');
      }
    };

    initSupabase();
  }, [refreshProfile]);

  useEffect(() => {
    if (!supabase) return;

    console.log('🔐 [AuthProvider] Setting up auth state change listener...');

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 [AuthProvider] 🔄 Auth state change detected:', event);
      console.log('🔐 [AuthProvider] Session in state change:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        userEmail: session?.user?.email
      });

      if (event === 'SIGNED_IN' && session?.user) {
        console.log('🔐 [AuthProvider] ✅ SIGNED_IN event - setting user state');
        setUser(session.user);
        await createProfileIfNotExists(supabase, session.user);
        await refreshProfile(supabase, session.user.id);
        console.log('🔐 [AuthProvider] Redirecting to home page...');
        router.push('/');
      } else if (event === 'SIGNED_OUT') {
        console.log('🔐 [AuthProvider] 🚪 SIGNED_OUT event - clearing user state');
        setUser(null);
        setProfile(null);
        retryCountRef.current = 0;
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        console.log('🔐 [AuthProvider] 🔄 TOKEN_REFRESHED event - updating user state');
        setUser(session.user);
      } else {
        console.log('🔐 [AuthProvider] ℹ️ Other auth event:', event, 'Session present:', !!session);
      }
    });

    console.log('🔐 [AuthProvider] ✅ Auth state change listener set up');

    return () => {
      console.log('🔐 [AuthProvider] 🧹 Cleaning up auth state change listener');
      subscription.unsubscribe();
    };
  }, [supabase, router, createProfileIfNotExists, refreshProfile]);

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
      const updatePromise = supabase
        .from('profiles')
        .update({ onboarding_step: step })
        .eq('user_id', currentUserRef.current.id);

      const { error } = await updatePromise;

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
      const storyPromise = supabase
        .from('stories')
        .insert({
          title: progress.title,
          raw_text: progress.story,
          user_id: currentUserRef.current.id,
        })
        .select()
        .single();

      const { data: storyData } = await storyPromise;

      if (progress.scenes?.length > 0) {
        const scenesData = progress.scenes.map((scene, index) => ({
          story_id: storyData.id,
          scene_number: index + 1,
          scene_text: scene.description,
          generated_image_url: scene.generatedImage,
        }));

        const scenesPromise = supabase
          .from('story_scenes')
          .insert(scenesData);

        await scenesPromise;
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
      const signOutPromise = supabase.auth.signOut();

      const { error } = await signOutPromise;

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