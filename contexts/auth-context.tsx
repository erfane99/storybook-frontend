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
      console.log('🔐 Skipping profile refresh - missing client or userId');
      return;
    }

    try {
      console.log('👤 Refreshing profile for user:', targetUserId);
      // FIXED: Use user_id instead of id to match database schema
      const { data: profileData, error: profileError } = await client
        .from('profiles')
        .select('*')
        .eq('user_id', targetUserId) // Changed from 'id' to 'user_id'
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('👤 Profile fetch error:', profileError);
        throw profileError;
      }

      if (profileData) {
        console.log('👤 Profile loaded successfully');
        setProfile(profileData as Profile);
      } else {
        console.log('👤 No profile found for user');
        setProfile(null);
      }
    } catch (error) {
      console.error('👤 Error refreshing profile:', error);
      // Don't throw - allow app to continue without profile
    }
  }, [supabase]);

  const createProfileIfNotExists = useCallback(async (client: SupabaseClient<Database>, user: User): Promise<void> => {
    try {
      console.log('👤 Checking if profile exists for user:', user.id);
      
      // FIXED: Check if profile already exists using user_id
      const { data: existingProfile, error: profileCheckError } = await client
        .from('profiles')
        .select('user_id') // Changed from 'id' to 'user_id'
        .eq('user_id', user.id) // Changed from 'id' to 'user_id'
        .single();

      // If profile doesn't exist (PGRST116 = no rows returned), create it
      if (profileCheckError && profileCheckError.code === 'PGRST116') {
        console.log('👤 Creating new profile for user:', user.id);
        const currentTime = new Date().toISOString();
        
        // FIXED: Insert using user_id instead of id
        const { error: insertError } = await client
          .from('profiles')
          .insert({
            user_id: user.id, // Changed from 'id' to 'user_id'
            email: user.email || '',
            user_type: 'user',
            onboarding_step: 'not_started',
            full_name: user.user_metadata?.full_name || '',
            avatar_url: user.user_metadata?.avatar_url || '',
            created_at: currentTime,
          })
          .single();

        if (insertError) {
          console.error('👤 Error creating user profile:', insertError);
          if (toast) {
            toast({
              variant: 'destructive',
              title: 'Profile Creation Warning',
              description: 'Account verified but profile setup incomplete. Please contact support if issues persist.',
            });
          }
        } else {
          console.log('✅ User profile created successfully');
        }
      } else if (profileCheckError) {
        console.error('👤 Error checking user profile:', profileCheckError);
        if (toast) {
          toast({
            variant: 'destructive',
            title: 'Profile Check Warning',
            description: 'Account verified but profile check failed. Please contact support if issues persist.',
          });
        }
      } else {
        console.log('✅ User profile already exists');
      }
    } catch (error) {
      console.error('👤 Error in createProfileIfNotExists:', error);
    }
  }, [toast]);

  // Initialize Supabase client (only runs once)
  useEffect(() => {
    const initSupabase = async () => {
      try {
        console.log('🔐 Initializing Supabase client...');
        const { getUniversalSupabase } = await import('@/lib/supabase/universal');
        const client = await getUniversalSupabase();
        setSupabase(client);

        console.log('🔐 Getting initial session...');
        const { data: { session }, error: sessionError } = await client.auth.getSession();
        
        if (sessionError) {
          console.error('🔐 Session error:', sessionError);
          setInitializationError(sessionError.message);
        } else if (session?.user) {
          console.log('🔐 Found existing session for user:', session.user.id);
          setUser(session.user);
          await refreshProfile(client, session.user.id);
        } else {
          console.log('🔐 No existing session found');
        }
      } catch (error) {
        console.error('🔐 Failed to initialize Supabase:', error);
        setInitializationError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setIsLoading(false);
        console.log('🔐 Auth initialization complete');
      }
    };

    initSupabase();
  }, []); // Only run once on mount

  // Set up auth listener (only when supabase is ready)
  useEffect(() => {
    if (!supabase) return;

    console.log('🔐 Setting up auth state listener...');
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state changed:', event, session?.user?.id);
      
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        
        // Create profile if it doesn't exist (for Google sign-in)
        await createProfileIfNotExists(supabase, session.user);
        
        // Then refresh the profile data
        await refreshProfile(supabase, session.user.id);
        
        // Redirect to home page after successful sign-in
        console.log('🔐 Redirecting to home page after successful sign-in');
        router.push('/');
      } else if (event === 'SIGNED_OUT') {
        console.log('🔐 User signed out');
        setUser(null);
        setProfile(null);
      }
    });

    return () => {
      console.log('🔐 Cleaning up auth listeners...');
      subscription.unsubscribe();
    };
  }, [supabase, router, createProfileIfNotExists, refreshProfile]); // Remove 'user' dependency

  // Set up profile refresh interval (separate effect)
  useEffect(() => {
    // Clear existing interval
    if (profileRefreshIntervalRef.current) {
      clearInterval(profileRefreshIntervalRef.current);
    }

    // Only set up interval if we have a user
    if (user) {
      console.log('🔄 Setting up profile refresh interval...');
      profileRefreshIntervalRef.current = setInterval(() => {
        console.log('🔄 Periodic profile refresh...');
        refreshProfile();
      }, PROFILE_REFRESH_INTERVAL);
    }

    return () => {
      if (profileRefreshIntervalRef.current) {
        clearInterval(profileRefreshIntervalRef.current);
        profileRefreshIntervalRef.current = null;
      }
    };
  }, [user, refreshProfile]); // This is safe because refreshProfile is memoized

  const updateOnboardingStep = useCallback(async (step: Profile['onboarding_step']): Promise<void> => {
    if (!currentUserRef.current?.id || !supabase) {
      console.error('👤 Cannot update onboarding step - missing user or supabase');
      return;
    }

    try {
      console.log('👤 Updating onboarding step to:', step);
      // FIXED: Use user_id instead of id in where clause
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_step: step })
        .eq('user_id', currentUserRef.current.id); // Changed from 'id' to 'user_id'

      if (error) throw error;
      await refreshProfile();
      console.log('✅ Onboarding step updated successfully');
    } catch (error: unknown) {
      console.error('👤 Failed to update onboarding step:', error);
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
      console.log('📝 Skipping anonymous progress save - missing requirements');
      return;
    }

    try {
      console.log('📝 Saving anonymous progress...');
      const { data: storyData, error: storyError } = await supabase
        .from('stories')
        .insert({
          title: progress.title,
          raw_text: progress.story,
          user_id: currentUserRef.current.id,
        })
        .select()
        .single();

      if (storyError) throw storyError;

      if (progress.scenes?.length > 0) {
        const scenesData = progress.scenes.map((scene, index) => ({
          story_id: storyData.id,
          scene_number: index + 1,
          scene_text: scene.description,
          generated_image_url: scene.generatedImage,
        }));

        const { error: scenesError } = await supabase
          .from('story_scenes')
          .insert(scenesData);

        if (scenesError) throw scenesError;
      }

      await updateOnboardingStep('story_created');
      clearProgress();

      console.log('✅ Anonymous progress saved successfully');
      if (toast) {
        toast({
          title: 'Success',
          description: 'Your story has been saved to your account!',
        });
      }
    } catch (error: unknown) {
      console.error('📝 Failed to save story progress:', error);
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
      console.error('🔐 Cannot sign out - no supabase client');
      return;
    }
    
    try {
      console.log('🔐 Signing out user...');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      console.log('✅ Sign out successful');
      if (router) {
        router.replace('/');
      }
    } catch (error: unknown) {
      console.error('🔐 Sign out failed:', error);
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
    console.error('🔐 Auth initialization failed:', initializationError);
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