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

// Industry-standard timeout categories
const TIMEOUTS = {
  AUTH: 15000,        // 15 seconds for authentication operations (session retrieval, auth state changes)
  DATABASE: 8000,     // 8 seconds for database queries (profile queries, updates, inserts)
  BACKGROUND: 5000,   // 5 seconds for non-critical background operations
  CRITICAL: 20000,    // 20 seconds for essential app functions
} as const;

const MAX_RETRY_ATTEMPTS = 2; // Maximum retry attempts for failed queries

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
  const retryCountRef = useRef<number>(0);

  // Update ref when user changes
  useEffect(() => {
    currentUserRef.current = user;
  }, [user]);

  // Enhanced timeout wrapper with categorized timeouts
  const withTimeout = useCallback(<T>(
    promise: Promise<T>, 
    timeoutMs: number,
    operation: string = 'Database operation'
  ): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          console.error(`⏰ [withTimeout] ${operation} timed out after ${timeoutMs}ms`);
          reject(new Error(`${operation} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      })
    ]);
  }, []);

  // Exponential backoff delay calculation
  const getRetryDelay = useCallback((attempt: number): number => {
    return Math.min(1000 * Math.pow(2, attempt), 5000); // Max 5 seconds
  }, []);

  // Enhanced refresh function with DATABASE timeout
  const refreshProfile = useCallback(async (client = supabase, userId?: string): Promise<void> => {
    const targetUserId = userId || currentUserRef.current?.id;
    
    if (!client || !targetUserId) {
      console.log('🔐 [refreshProfile] Skipping profile refresh - missing client or userId');
      console.log('🔐 [refreshProfile] Client exists:', !!client);
      console.log('🔐 [refreshProfile] Target userId:', targetUserId);
      return;
    }

    const attemptRefresh = async (attempt: number = 0): Promise<void> => {
      try {
        console.log(`👤 [refreshProfile] Starting profile refresh attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS + 1} for user:`, targetUserId);
        console.log('👤 [refreshProfile] Client type:', client.constructor.name);
        console.log('👤 [refreshProfile] Client auth exists:', !!client.auth);
        console.log('👤 [refreshProfile] Client from exists:', !!client.from);
        
        // Log when Supabase query starts
        console.log('👤 [refreshProfile] Initiating Supabase query to profiles table...');
        const queryStartTime = Date.now();
        
        // Use DATABASE timeout for profile queries
        const queryPromise = client
          .from('profiles')
          .select('*')
          .eq('user_id', targetUserId)
          .single();

        console.log(`👤 [refreshProfile] Query wrapped with ${TIMEOUTS.DATABASE}ms DATABASE timeout protection`);
        
        // Execute query with DATABASE timeout protection
        const { data: profileData, error: profileError } = await withTimeout(
          queryPromise,
          TIMEOUTS.DATABASE,
          'Profile query'
        );

        const queryEndTime = Date.now();
        console.log(`👤 [refreshProfile] Supabase query completed successfully in ${queryEndTime - queryStartTime}ms`);
        console.log('👤 [refreshProfile] Query result - data exists:', !!profileData);
        console.log('👤 [refreshProfile] Query result - error:', profileError);

        // Reset retry count on successful query
        retryCountRef.current = 0;

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
        const isTimeoutError = error instanceof Error && error.message.includes('timed out');
        const isRetryableError = isTimeoutError || (error as any)?.code === 'PGRST301'; // Connection error
        
        console.error(`👤 [refreshProfile] Error on attempt ${attempt + 1}:`, {
          isTimeoutError,
          isRetryableError,
          attempt,
          maxAttempts: MAX_RETRY_ATTEMPTS,
          errorType: typeof error,
          errorConstructor: error?.constructor?.name,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorCode: (error as any)?.code,
          errorStack: error instanceof Error ? error.stack : 'No stack trace',
        });

        // Handle timeout errors specifically
        if (isTimeoutError) {
          console.error(`⏰ [refreshProfile] Query timeout detected on attempt ${attempt + 1}`);
          console.error(`⏰ [refreshProfile] Timeout frequency: ${retryCountRef.current + 1} consecutive timeouts`);
          
          // Track timeout frequency
          retryCountRef.current++;
          
          // Log timeout patterns for debugging
          if (retryCountRef.current >= 3) {
            console.error('⏰ [refreshProfile] CRITICAL: Multiple consecutive timeouts detected');
            console.error('⏰ [refreshProfile] This may indicate a persistent connectivity issue');
          }
        }

        // Retry logic for retryable errors
        if (isRetryableError && attempt < MAX_RETRY_ATTEMPTS) {
          const retryDelay = getRetryDelay(attempt);
          console.log(`🔄 [refreshProfile] Retrying in ${retryDelay}ms (attempt ${attempt + 2}/${MAX_RETRY_ATTEMPTS + 1})`);
          
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return attemptRefresh(attempt + 1);
        }

        // Final failure handling
        if (isTimeoutError) {
          console.error('⏰ [refreshProfile] FINAL TIMEOUT: Profile query consistently timing out');
          console.error('⏰ [refreshProfile] Implementing graceful fallback - continuing app operation without profile');
          
          // Graceful fallback for timeout errors
          setProfile(null);
          
          // Only show toast for persistent timeouts (not single occurrences)
          if (retryCountRef.current >= 2 && toast) {
            toast({
              variant: 'destructive',
              title: 'Connection Issue',
              description: 'Profile loading is slow. App will continue without profile data.',
            });
          }
        } else {
          console.error('👤 [refreshProfile] NON-TIMEOUT ERROR: Profile query failed with non-retryable error');
          console.error('  - Error type:', typeof error);
          console.error('  - Error constructor:', error?.constructor?.name);
          console.error('  - Error message:', error instanceof Error ? error.message : 'Unknown error');
          console.error('  - Error stack:', error instanceof Error ? error.stack : 'No stack trace');
          console.error('  - Full error object:', error);
          
          // For non-timeout errors, still allow app to continue but don't show toast
          setProfile(null);
        }
      }
    };

    // Start the refresh attempt
    await attemptRefresh();
  }, [supabase, withTimeout, getRetryDelay, toast]);

  const createProfileIfNotExists = useCallback(async (client: SupabaseClient<Database>, user: User): Promise<void> => {
    try {
      console.log('👤 [createProfileIfNotExists] Checking if profile exists for user:', user.id);
      console.log('👤 [createProfileIfNotExists] User email:', user.email);
      console.log('👤 [createProfileIfNotExists] User metadata:', user.user_metadata);
      
      // Use DATABASE timeout for profile existence check
      const checkStartTime = Date.now();
      console.log('👤 [createProfileIfNotExists] Applying DATABASE timeout protection to profile existence check...');
      
      const checkPromise = client
        .from('profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .single();

      const { data: existingProfile, error: profileCheckError } = await withTimeout(
        checkPromise,
        TIMEOUTS.DATABASE,
        'Profile existence check'
      );

      const checkEndTime = Date.now();
      console.log(`👤 [createProfileIfNotExists] Profile check completed in ${checkEndTime - checkStartTime}ms`);
      console.log('👤 [createProfileIfNotExists] Profile check result:');
      console.log('  - Existing profile:', existingProfile);
      console.log('  - Check error:', profileCheckError);

      // If profile doesn't exist (PGRST116 = no rows returned), create it
      if (profileCheckError && profileCheckError.code === 'PGRST116') {
        console.log('👤 [createProfileIfNotExists] Creating new profile for user:', user.id);
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
        
        console.log('👤 [createProfileIfNotExists] Profile data to insert:', profileData);
        
        // Use DATABASE timeout for profile creation
        const insertStartTime = Date.now();
        console.log('👤 [createProfileIfNotExists] Applying DATABASE timeout protection to profile creation...');
        
        const insertPromise = client
          .from('profiles')
          .insert(profileData)
          .single();

        const { error: insertError } = await withTimeout(
          insertPromise,
          TIMEOUTS.DATABASE,
          'Profile creation'
        );

        const insertEndTime = Date.now();
        console.log(`👤 [createProfileIfNotExists] Profile creation completed in ${insertEndTime - insertStartTime}ms`);

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
      const isTimeoutError = error instanceof Error && error.message.includes('timed out');
      
      if (isTimeoutError) {
        console.error('⏰ [createProfileIfNotExists] Profile creation/check timed out');
        console.error('⏰ [createProfileIfNotExists] Continuing with graceful fallback');
        
        if (toast) {
          toast({
            variant: 'destructive',
            title: 'Profile Setup Delayed',
            description: 'Profile creation is taking longer than expected. You can continue using the app.',
          });
        }
      } else {
        console.error('👤 [createProfileIfNotExists] Unexpected error:');
        console.error('  - Error type:', typeof error);
        console.error('  - Error constructor:', error?.constructor?.name);
        console.error('  - Error message:', error instanceof Error ? error.message : 'Unknown error');
        console.error('  - Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        console.error('  - Full error object:', error);
      }
    }
  }, [toast, withTimeout]);

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
        
        // Use AUTH timeout for initial session retrieval
        console.log(`🔐 [initSupabase] Applying ${TIMEOUTS.AUTH}ms AUTH timeout protection to session retrieval...`);
        
        const sessionPromise = client.auth.getSession();
        const { data: sessionData, error: sessionError } = await withTimeout(
          sessionPromise,
          TIMEOUTS.AUTH,
          'Initial session retrieval'
        );
        
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
        const isTimeoutError = error instanceof Error && error.message.includes('timed out');
        
        if (isTimeoutError) {
          console.error(`⏰ [initSupabase] Initialization timed out after ${initEndTime - initStartTime}ms`);
          console.error('⏰ [initSupabase] Continuing with graceful fallback - app will work without initial session');
          setInitializationError('Session loading timed out - continuing without authentication');
        } else {
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
        }
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
        // Reset retry count on sign out
        retryCountRef.current = 0;
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
      console.log('🔄 [profileInterval] Query timeout protection:', TIMEOUTS.DATABASE, 'ms');
      profileRefreshIntervalRef.current = setInterval(() => {
        console.log('🔄 [profileInterval] Executing periodic profile refresh with DATABASE timeout protection...');
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
      
      // Use DATABASE timeout for onboarding step update
      console.log(`👤 [updateOnboardingStep] Applying ${TIMEOUTS.DATABASE}ms DATABASE timeout protection to update...`);
      
      const updatePromise = supabase
        .from('profiles')
        .update({ onboarding_step: step })
        .eq('user_id', currentUserRef.current.id);

      const { error } = await withTimeout(
        updatePromise,
        TIMEOUTS.DATABASE,
        'Onboarding step update'
      );

      if (error) {
        console.error('👤 [updateOnboardingStep] Update error:', error);
        throw error;
      }
      
      console.log('👤 [updateOnboardingStep] Update successful, refreshing profile...');
      await refreshProfile();
      console.log('✅ [updateOnboardingStep] Onboarding step updated successfully');
    } catch (error: unknown) {
      const isTimeoutError = error instanceof Error && error.message.includes('timed out');
      
      if (isTimeoutError) {
        console.error('⏰ [updateOnboardingStep] Onboarding step update timed out');
        console.error('⏰ [updateOnboardingStep] Continuing with graceful fallback');
        
        if (toast) {
          toast({
            variant: 'destructive',
            title: 'Update Delayed',
            description: 'Progress update is taking longer than expected. Changes may appear shortly.',
          });
        }
      } else {
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
    }
  }, [supabase, refreshProfile, toast, withTimeout]);

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
      
      // Use DATABASE timeout for story insertion
      console.log(`📝 [saveAnonymousProgress] Applying ${TIMEOUTS.DATABASE}ms DATABASE timeout protection to story save...`);
      
      const storyPromise = supabase
        .from('stories')
        .insert({
          title: progress.title,
          raw_text: progress.story,
          user_id: currentUserRef.current.id,
        })
        .select()
        .single();

      const { data: storyData, error: storyError } = await withTimeout(
        storyPromise,
        TIMEOUTS.DATABASE,
        'Story save'
      );

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

        // Use DATABASE timeout for scenes insertion
        console.log(`📝 [saveAnonymousProgress] Applying ${TIMEOUTS.DATABASE}ms DATABASE timeout protection to scenes save...`);
        
        const scenesPromise = supabase
          .from('story_scenes')
          .insert(scenesData);

        const { error: scenesError } = await withTimeout(
          scenesPromise,
          TIMEOUTS.DATABASE,
          'Scenes save'
        );

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
      const isTimeoutError = error instanceof Error && error.message.includes('timed out');
      
      if (isTimeoutError) {
        console.error('⏰ [saveAnonymousProgress] Story save timed out');
        console.error('⏰ [saveAnonymousProgress] Progress may be partially saved');
        
        if (toast) {
          toast({
            variant: 'destructive',
            title: 'Save Delayed',
            description: 'Story saving is taking longer than expected. Please check your stories later.',
          });
        }
      } else {
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
    }
  }, [supabase, progress, updateOnboardingStep, clearProgress, toast, withTimeout]);

  const signOut = useCallback(async (): Promise<void> => {
    if (!supabase) {
      console.error('🔐 [signOut] Cannot sign out - no supabase client');
      return;
    }
    
    try {
      console.log('🔐 [signOut] Signing out user...');
      console.log('🔐 [signOut] Current user:', currentUserRef.current?.id);
      
      // Use AUTH timeout for sign out
      console.log(`🔐 [signOut] Applying ${TIMEOUTS.AUTH}ms AUTH timeout protection to sign out...`);
      
      const signOutPromise = supabase.auth.signOut();
      const { error } = await withTimeout(
        signOutPromise,
        TIMEOUTS.AUTH,
        'Sign out'
      );

      if (error) {
        console.error('🔐 [signOut] Sign out error:', error);
        throw error;
      }
      
      // Reset retry count on successful sign out
      retryCountRef.current = 0;
      
      console.log('✅ [signOut] Sign out successful');
      if (router) {
        router.replace('/');
      }
    } catch (error: unknown) {
      const isTimeoutError = error instanceof Error && error.message.includes('timed out');
      
      if (isTimeoutError) {
        console.error('⏰ [signOut] Sign out timed out - forcing local sign out');
        
        // Force local sign out even if server request times out
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
      } else {
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
    }
  }, [supabase, router, toast, withTimeout]);

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
  }
  )
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}