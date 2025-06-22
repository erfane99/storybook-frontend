'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useStoryProgress } from '@/hooks/use-story-progress';
import { User, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

interface Profile {
  user_id: string; // Changed from id to user_id to match database schema
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

const PROFILE_REFRESH_INTERVAL = 60000; // 1 minute

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [supabase, setSupabase] = useState<SupabaseClient<Database> | null>(null);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const { progress, clearProgress } = useStoryProgress();
  const { toast } = useToast();
  const router = useRouter();
  
  // Use refs to avoid dependency issues
  const currentUserRef = useRef<User | null>(null);
  const profileRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update ref when user changes
  useEffect(() => {
    currentUserRef.current = user;
  }, [user]);

  // Memoized refresh function to prevent recreation
  const refreshProfile = useCallback(async (client = supabase, userId?: string): Promise<void> => {
    const targetUserId = userId || currentUserRef.current?.id;
    
    if (!client || !targetUserId) {
      console.log('🔐 [refreshProfile] Skipping profile refresh - missing client or userId');
      console.log('🔐 [refreshProfile] Client exists:', !!client);
      console.log('🔐 [refreshProfile] Target userId:', targetUserId);
      return;
    }

    try {
      console.log('👤 [refreshProfile] Starting profile refresh for user:', targetUserId);
      console.log('👤 [refreshProfile] Client type:', client.constructor.name);
      console.log('👤 [refreshProfile] Client auth exists:', !!client.auth);
      console.log('👤 [refreshProfile] Client from exists:', !!client.from);
      
      // Log when Supabase query starts
      console.log('👤 [refreshProfile] Initiating Supabase query to profiles table...');
      const queryStartTime = Date.now();
      
      // FIXED: Use user_id instead of id to match database schema
      const { data: profileData, error: profileError } = await client
        .from('profiles')
        .select('*')
        .eq('user_id', targetUserId) // Changed from 'id' to 'user_id'
        .single();

      const queryEndTime = Date.now();
      console.log(`👤 [refreshProfile] Supabase query completed in ${queryEndTime - queryStartTime}ms`);
      console.log('👤 [refreshProfile] Query result - data exists:', !!profileData);
      console.log('👤 [refreshProfile] Query result - error:', profileError);

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('👤 [refreshProfile] Profile fetch error details:');
        console.error('  - Error code:', profileError.code);
        console.error('  - Error message:', profileError.message);
        console.error('  - Error details:', profileError.details);
        console.error('  - Error hint:', profileError.hint);
        throw profileError;
      }

      if (profileData) {
        console.log('👤 [refreshProfile] Profile loaded successfully');
        console.log('👤 [refreshProfile] Profile data keys:', Object.keys(profileData));
        console.log('👤 [refreshProfile] Profile onboarding_step:', profileData.onboarding_step);
        console.log('👤 [refreshProfile] Profile user_type:', profileData.user_type);
        setProfile(profileData as Profile);
      } else {
        console.log('👤 [refreshProfile] No profile found for user (PGRST116 - no rows returned)');
        setProfile(null);
      }
    } catch (error) {
      console.error('👤 [refreshProfile] Error refreshing profile:');
      console.error('  - Error type:', typeof error);
      console.error('  - Error constructor:', error?.constructor?.name);
      console.error('  - Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('  - Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('  - Full error object:', error);
      // Don't throw - allow app to continue without profile
    }
  }, [supabase]);

  const createProfileIfNotExists = useCallback(async (client: SupabaseClient<Database>, user: User): Promise<void> => {
    try {
      console.log('👤 [createProfileIfNotExists] Checking if profile exists for user:', user.id);
      console.log('👤 [createProfileIfNotExists] User email:', user.email);
      console.log('👤 [createProfileIfNotExists] User metadata:', user.user_metadata);
      
      // FIXED: Check if profile already exists using user_id
      const { data: existingProfile, error: profileCheckError } = await client
        .from('profiles')
        .select('user_id') // Changed from 'id' to 'user_id'
        .eq('user_id', user.id) // Changed from 'id' to 'user_id'
        .single();

      console.log('👤 [createProfileIfNotExists] Profile check result:');
      console.log('  - Existing profile:', existingProfile);
      console.log('  - Check error:', profileCheckError);

      // If profile doesn't exist (PGRST116 = no rows returned), create it
      if (profileCheckError && profileCheckError.code === 'PGRST116') {
        console.log('👤 [createProfileIfNotExists] Creating new profile for user:', user.id);
        const currentTime = new Date().toISOString();
        
        const profileData = {
          user_id: user.id, // Changed from 'id' to 'user_id'
          email: user.email || '',
          user_type: 'user' as const,
          onboarding_step: 'not_started' as const,
          full_name: user.user_metadata?.full_name || '',
          avatar_url: user.user_metadata?.avatar_url || '',
          created_at: currentTime,
        };
        
        console.log('👤 [createProfileIfNotExists] Profile data to insert:', profileData);
        
        // FIXED: Insert using user_id instead of id
        const { error: insertError } = await client
          .from('profiles')
          .insert(profileData)
          .single();

        if (insertError) {
          console.error('👤 [createProfileIfNotExists] Error creating user profile:');
          console.error('  - Insert error code:', insertError.code);
          console.error('  - Insert error message:', insertError.message);
          console.error('  - Insert error details:', insertError.details);
          console.error('  - Insert error hint:', insertError.hint);
          if (toast) {
            toast({
              variant: 'destructive',
              title: 'Profile Creation Warning',
              description: 'Account verified but profile setup incomplete. Please contact support if issues persist.',
            });
          }
        } else {
          console.log('✅ [createProfileIfNotExists] User profile created successfully');
        }
      } else if (profileCheckError) {
        console.error('👤 [createProfileIfNotExists] Error checking user profile:');
        console.error('  - Check error code:', profileCheckError.code);
        console.error('  - Check error message:', profileCheckError.message);
        console.error('  - Check error details:', profileCheckError.details);
        if (toast) {
          toast({
            variant: 'destructive',
            title: 'Profile Check Warning',
            description: 'Account verified but profile check failed. Please contact support if issues persist.',
          });
        }
      } else {
        console.log('✅ [createProfileIfNotExists] User profile already exists');
      }
    } catch (error) {
      console.error('👤 [createProfileIfNotExists] Unexpected error:');
      console.error('  - Error type:', typeof error);
      console.error('  - Error constructor:', error?.constructor?.name);
      console.error('  - Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('  - Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('  - Full error object:', error);
    }
  }, [toast]);

  // Initialize Supabase client (only runs once)
  useEffect(() => {
    const initSupabase = async () => {
      const initStartTime = Date.now();
      console.log('🔐 [initSupabase] ===== STARTING SUPABASE INITIALIZATION =====');
      console.log('🔐 [initSupabase] Timestamp:', new Date().toISOString());
      console.log('🔐 [initSupabase] Environment:', process.env.NODE_ENV);
      console.log('🔐 [initSupabase] Window exists:', typeof window !== 'undefined');
      console.log('🔐 [initSupabase] Document ready state:', typeof document !== 'undefined' ? document.readyState : 'N/A');

      try {
        console.log('🔐 [initSupabase] Step 1: Importing universal Supabase client...');
        const importStartTime = Date.now();
        
        const { getUniversalSupabase } = await import('@/lib/supabase/universal');
        
        const importEndTime = Date.now();
        console.log(`🔐 [initSupabase] Step 1 completed in ${importEndTime - importStartTime}ms`);
        console.log('🔐 [initSupabase] getUniversalSupabase function type:', typeof getUniversalSupabase);

        console.log('🔐 [initSupabase] Step 2: Creating Supabase client instance...');
        const clientStartTime = Date.now();
        
        const client = await getUniversalSupabase();
        
        const clientEndTime = Date.now();
        console.log(`🔐 [initSupabase] Step 2 completed in ${clientEndTime - clientStartTime}ms`);
        
        // Enhanced client validation
        console.log('🔐 [initSupabase] Step 3: Validating client instance...');
        console.log('🔐 [initSupabase] Client exists:', !!client);
        console.log('🔐 [initSupabase] Client type:', typeof client);
        console.log('🔐 [initSupabase] Client constructor:', client?.constructor?.name);
        console.log('🔐 [initSupabase] Client has auth:', !!client?.auth);
        console.log('🔐 [initSupabase] Client has from method:', typeof client?.from === 'function');
        console.log('🔐 [initSupabase] Client auth has getSession:', typeof client?.auth?.getSession === 'function');
        console.log('🔐 [initSupabase] Client auth has onAuthStateChange:', typeof client?.auth?.onAuthStateChange === 'function');

        if (!client) {
          throw new Error('Supabase client creation returned null/undefined');
        }

        if (!client.auth) {
          throw new Error('Supabase client missing auth property');
        }

        if (typeof client.auth.getSession !== 'function') {
          throw new Error('Supabase client auth missing getSession method');
        }

        console.log('✅ [initSupabase] Client validation passed');
        setSupabase(client);

        console.log('🔐 [initSupabase] Step 4: Getting initial session...');
        const sessionStartTime = Date.now();
        
        const { data: sessionData, error: sessionError } = await client.auth.getSession();
        
        const sessionEndTime = Date.now();
        console.log(`🔐 [initSupabase] Step 4 completed in ${sessionEndTime - sessionStartTime}ms`);
        console.log('🔐 [initSupabase] Session data structure:', {
          hasData: !!sessionData,
          hasSession: !!sessionData?.session,
          hasUser: !!sessionData?.session?.user,
          userId: sessionData?.session?.user?.id,
          userEmail: sessionData?.session?.user?.email,
          accessToken: sessionData?.session?.access_token ? '[PRESENT]' : '[MISSING]',
          refreshToken: sessionData?.session?.refresh_token ? '[PRESENT]' : '[MISSING]',
          expiresAt: sessionData?.session?.expires_at,
        });
        
        if (sessionError) {
          console.error('🔐 [initSupabase] Session error details:');
          console.error('  - Error type:', typeof sessionError);
          console.error('  - Error constructor:', sessionError?.constructor?.name);
          console.error('  - Error message:', sessionError.message);
          console.error('  - Error code:', (sessionError as any)?.code);
          console.error('  - Error status:', (sessionError as any)?.status);
          console.error('  - Error stack:', (sessionError as any)?.stack);
          console.error('  - Full error object:', sessionError);
          setInitializationError(sessionError.message);
        } else if (sessionData?.session?.user) {
          console.log('🔐 [initSupabase] Found existing session for user:', sessionData.session.user.id);
          console.log('🔐 [initSupabase] User created at:', sessionData.session.user.created_at);
          console.log('🔐 [initSupabase] User last sign in:', sessionData.session.user.last_sign_in_at);
          console.log('🔐 [initSupabase] Session expires at:', sessionData.session.expires_at);
          
          setUser(sessionData.session.user);
          
          console.log('🔐 [initSupabase] Step 5: Refreshing profile for existing user...');
          await refreshProfile(client, sessionData.session.user.id);
        } else {
          console.log('🔐 [initSupabase] No existing session found');
          console.log('🔐 [initSupabase] Session data keys:', sessionData ? Object.keys(sessionData) : 'No session data');
        }

        const initEndTime = Date.now();
        console.log(`✅ [initSupabase] Initialization completed successfully in ${initEndTime - initStartTime}ms`);

      } catch (error) {
        const initEndTime = Date.now();
        console.error(`❌ [initSupabase] Initialization failed after ${initEndTime - initStartTime}ms`);
        console.error('🔐 [initSupabase] Error details:');
        console.error('  - Error type:', typeof error);
        console.error('  - Error constructor:', error?.constructor?.name);
        console.error('  - Error message:', error instanceof Error ? error.message : 'Unknown error');
        console.error('  - Error code:', (error as any)?.code);
        console.error('  - Error status:', (error as any)?.status);
        console.error('  - Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        console.error('  - Full error object:', error);
        
        setInitializationError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        const finalTime = Date.now();
        console.log(`🔐 [initSupabase] Setting isLoading to false after ${finalTime - initStartTime}ms`);
        setIsLoading(false);
        console.log('🔐 [initSupabase] ===== SUPABASE INITIALIZATION COMPLETE =====');
      }
    };

    initSupabase();
  }, []); // Only run once on mount

  // Set up auth listener (only when supabase is ready)
  useEffect(() => {
    if (!supabase) {
      console.log('🔐 [authListener] Skipping auth listener setup - no supabase client');
      return;
    }

    console.log('🔐 [authListener] Setting up auth state listener...');
    const listenerStartTime = Date.now();
    
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const eventTime = Date.now();
      console.log(`🔐 [authListener] Auth state changed after ${eventTime - listenerStartTime}ms:`, event);
      console.log('🔐 [authListener] Event details:', {
        event,
        hasSession: !!session,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        accessToken: session?.access_token ? '[PRESENT]' : '[MISSING]',
        expiresAt: session?.expires_at,
      });
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('🔐 [authListener] Processing SIGNED_IN event...');
        setUser(session.user);
        
        // Create profile if it doesn't exist (for Google sign-in)
        console.log('🔐 [authListener] Creating profile if not exists...');
        await createProfileIfNotExists(supabase, session.user);
        
        // Then refresh the profile data
        console.log('🔐 [authListener] Refreshing profile data...');
        await refreshProfile(supabase, session.user.id);
        
        // Redirect to home page after successful sign-in
        console.log('🔐 [authListener] Redirecting to home page after successful sign-in');
        router.push('/');
      } else if (event === 'SIGNED_OUT') {
        console.log('🔐 [authListener] Processing SIGNED_OUT event');
        setUser(null);
        setProfile(null);
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('🔐 [authListener] Processing TOKEN_REFRESHED event');
        if (session?.user) {
          setUser(session.user);
        }
      } else {
        console.log('🔐 [authListener] Unhandled auth event:', event);
      }
    });

    console.log('✅ [authListener] Auth listener setup complete');

    return () => {
      console.log('🔐 [authListener] Cleaning up auth listeners...');
      subscription.unsubscribe();
    };
  }, [supabase, router, createProfileIfNotExists, refreshProfile]); // Remove 'user' dependency

  // Set up profile refresh interval (separate effect)
  useEffect(() => {
    // Clear existing interval
    if (profileRefreshIntervalRef.current) {
      console.log('🔄 [profileInterval] Clearing existing profile refresh interval');
      clearInterval(profileRefreshIntervalRef.current);
    }

    // Only set up interval if we have a user
    if (user) {
      console.log('🔄 [profileInterval] Setting up profile refresh interval for user:', user.id);
      console.log('🔄 [profileInterval] Interval duration:', PROFILE_REFRESH_INTERVAL, 'ms');
      profileRefreshIntervalRef.current = setInterval(() => {
        console.log('🔄 [profileInterval] Executing periodic profile refresh...');
        refreshProfile();
      }, PROFILE_REFRESH_INTERVAL);
    } else {
      console.log('🔄 [profileInterval] No user - skipping interval setup');
    }

    return () => {
      if (profileRefreshIntervalRef.current) {
        console.log('🔄 [profileInterval] Cleaning up profile refresh interval');
        clearInterval(profileRefreshIntervalRef.current);
        profileRefreshIntervalRef.current = null;
      }
    };
  }, [user, refreshProfile]); // This is safe because refreshProfile is memoized

  const updateOnboardingStep = useCallback(async (step: Profile['onboarding_step']): Promise<void> => {
    if (!currentUserRef.current?.id || !supabase) {
      console.error('👤 [updateOnboardingStep] Cannot update onboarding step - missing user or supabase');
      console.error('  - User exists:', !!currentUserRef.current?.id);
      console.error('  - Supabase exists:', !!supabase);
      return;
    }

    try {
      console.log('👤 [updateOnboardingStep] Updating onboarding step to:', step);
      console.log('👤 [updateOnboardingStep] For user:', currentUserRef.current.id);
      
      // FIXED: Use user_id instead of id in where clause
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_step: step })
        .eq('user_id', currentUserRef.current.id); // Changed from 'id' to 'user_id'

      if (error) {
        console.error('👤 [updateOnboardingStep] Update error:', error);
        throw error;
      }
      
      console.log('👤 [updateOnboardingStep] Update successful, refreshing profile...');
      await refreshProfile();
      console.log('✅ [updateOnboardingStep] Onboarding step updated successfully');
    } catch (error: unknown) {
      console.error('👤 [updateOnboardingStep] Failed to update onboarding step:');
      console.error('  - Error type:', typeof error);
      console.error('  - Error constructor:', error?.constructor?.name);
      console.error('  - Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('  - Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('  - Full error object:', error);
      if (toast) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to update onboarding progress',
        });
      }
      throw error;
    }
  }, [supabase, refreshProfile, toast]);

  const saveAnonymousProgress = useCallback(async (): Promise<void> => {
    if (!currentUserRef.current || !progress || !supabase) {
      console.log('📝 [saveAnonymousProgress] Skipping anonymous progress save - missing requirements');
      console.log('  - User exists:', !!currentUserRef.current);
      console.log('  - Progress exists:', !!progress);
      console.log('  - Supabase exists:', !!supabase);
      return;
    }

    try {
      console.log('📝 [saveAnonymousProgress] Saving anonymous progress...');
      console.log('📝 [saveAnonymousProgress] Progress title:', progress.title);
      console.log('📝 [saveAnonymousProgress] Progress scenes count:', progress.scenes?.length || 0);
      
      const { data: storyData, error: storyError } = await supabase
        .from('stories')
        .insert({
          title: progress.title,
          raw_text: progress.story,
          user_id: currentUserRef.current.id,
        })
        .select()
        .single();

      if (storyError) {
        console.error('📝 [saveAnonymousProgress] Story insert error:', storyError);
        throw storyError;
      }

      console.log('📝 [saveAnonymousProgress] Story saved with ID:', storyData.id);

      if (progress.scenes?.length > 0) {
        console.log('📝 [saveAnonymousProgress] Saving scenes...');
        const scenesData = progress.scenes.map((scene, index) => ({
          story_id: storyData.id,
          scene_number: index + 1,
          scene_text: scene.description,
          generated_image_url: scene.generatedImage,
        }));

        const { error: scenesError } = await supabase
          .from('story_scenes')
          .insert(scenesData);

        if (scenesError) {
          console.error('📝 [saveAnonymousProgress] Scenes insert error:', scenesError);
          throw scenesError;
        }

        console.log('📝 [saveAnonymousProgress] Scenes saved successfully');
      }

      await updateOnboardingStep('story_created');
      clearProgress();

      console.log('✅ [saveAnonymousProgress] Anonymous progress saved successfully');
      if (toast) {
        toast({
          title: 'Success',
          description: 'Your story has been saved to your account!',
        });
      }
    } catch (error: unknown) {
      console.error('📝 [saveAnonymousProgress] Failed to save story progress:');
      console.error('  - Error type:', typeof error);
      console.error('  - Error constructor:', error?.constructor?.name);
      console.error('  - Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('  - Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('  - Full error object:', error);
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
    if (!supabase) {
      console.error('🔐 [signOut] Cannot sign out - no supabase client');
      return;
    }
    
    try {
      console.log('🔐 [signOut] Signing out user...');
      console.log('🔐 [signOut] Current user:', currentUserRef.current?.id);
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('🔐 [signOut] Sign out error:', error);
        throw error;
      }
      
      console.log('✅ [signOut] Sign out successful');
      if (router) {
        router.replace('/');
      }
    } catch (error: unknown) {
      console.error('🔐 [signOut] Sign out failed:');
      console.error('  - Error type:', typeof error);
      console.error('  - Error constructor:', error?.constructor?.name);
      console.error('  - Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('  - Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('  - Full error object:', error);
      if (toast) {
        toast({
          variant: 'destructive',
          title: 'Sign Out Failed',
          description: 'Failed to sign out',
        });
      }
      throw error;
    }
  }, [supabase, router, toast]);

  // Show error state if initialization failed
  if (initializationError) {
    console.error('🔐 [AuthProvider] Auth initialization failed:', initializationError);
    // Still provide the context but with error state
  }

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

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}