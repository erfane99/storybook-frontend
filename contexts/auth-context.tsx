'use client';

import { createContext, useContext, useEffect, useState } from 'react';
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
  }, []);

  const refreshProfile = async (client = supabase, userId = user?.id): Promise<void> => {
    if (!client || !userId) {
      console.log('🔐 Skipping profile refresh - missing client or userId');
      return;
    }

    try {
      console.log('👤 Refreshing profile for user:', userId);
      // FIXED: Use user_id instead of id to match database schema
      const { data: profileData, error: profileError } = await client
        .from('profiles')
        .select('*')
        .eq('user_id', userId) // Changed from 'id' to 'user_id'
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
  };

  const createProfileIfNotExists = async (client: SupabaseClient<Database>, user: User): Promise<void> => {
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
  };

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

    // Set up profile refresh interval
    const refreshInterval = setInterval(() => {
      if (user) {
        console.log('🔄 Periodic profile refresh...');
        refreshProfile();
      }
    }, PROFILE_REFRESH_INTERVAL);

    return () => {
      console.log('🔐 Cleaning up auth listeners...');
      subscription.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, [supabase, user, router]);

  const updateOnboardingStep = async (step: Profile['onboarding_step']): Promise<void> => {
    if (!user?.id || !supabase) {
      console.error('👤 Cannot update onboarding step - missing user or supabase');
      return;
    }

    try {
      console.log('👤 Updating onboarding step to:', step);
      // FIXED: Use user_id instead of id in where clause
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_step: step })
        .eq('user_id', user.id); // Changed from 'id' to 'user_id'

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
  };

  const saveAnonymousProgress = async (): Promise<void> => {
    if (!user || !progress || !supabase) {
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
          user_id: user.id,
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
  };

  const signOut = async (): Promise<void> => {
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
  };

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
    refreshProfile: () => refreshProfile(),
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