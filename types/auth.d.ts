// Explicit type declarations for auth context to ensure deployment compatibility

declare module '@/contexts/auth-context' {
  import { User } from '@supabase/supabase-js';
  
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

  export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element;
  export function useAuth(): AuthContextType;
}