export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          onboarding_step: 'not_started' | 'profile_completed' | 'story_created' | 'paid'
          user_type: 'user' | 'admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          onboarding_step?: 'not_started' | 'profile_completed' | 'story_created' | 'paid'
          user_type?: 'user' | 'admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          onboarding_step?: 'not_started' | 'profile_completed' | 'story_created' | 'paid'
          user_type?: 'user' | 'admin'
          created_at?: string
          updated_at?: string
        }
      }
      storybook_entries: {
        Row: {
          id: string
          title: string
          story: string
          pages: Json
          audience: 'children' | 'young_adults' | 'adults'
          character_description: string | null
          is_paid: boolean
          user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          story: string
          pages: Json
          audience: 'children' | 'young_adults' | 'adults'
          character_description?: string | null
          is_paid?: boolean
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          story?: string
          pages?: Json
          audience?: 'children' | 'young_adults' | 'adults'
          character_description?: string | null
          is_paid?: boolean
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      print_requests: {
        Row: {
          id: string
          user_id: string
          storybook_id: string
          status: 'pending' | 'approved' | 'shipped' | 'rejected'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          storybook_id: string
          status?: 'pending' | 'approved' | 'shipped' | 'rejected'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          storybook_id?: string
          status?: 'pending' | 'approved' | 'shipped' | 'rejected'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      cartoon_images: {
        Row: {
          id: string
          original_url: string
          generated_url: string
          user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          original_url: string
          generated_url: string
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          original_url?: string
          generated_url?: string
          user_id?: string | null
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          user_type: 'user' | 'admin'
          created_at: string
        }
        Insert: {
          id: string
          email: string
          user_type?: 'user' | 'admin'
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          user_type?: 'user' | 'admin'
          created_at?: string
        }
      }
      stories: {
        Row: {
          id: string
          title: string
          raw_text: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          raw_text: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          raw_text?: string
          user_id?: string
          created_at?: string
        }
      }
      story_scenes: {
        Row: {
          id: string
          story_id: string
          scene_number: number
          scene_text: string
          generated_image_url: string | null
          image_prompt: string | null
          created_at: string
        }
        Insert: {
          id?: string
          story_id: string
          scene_number: number
          scene_text: string
          generated_image_url?: string | null
          image_prompt?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          story_id?: string
          scene_number?: number
          scene_text?: string
          generated_image_url?: string | null
          image_prompt?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}