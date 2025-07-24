import { createClient } from '@supabase/supabase-js';

// Create supabase client lazily to allow for environment variable loading
let _supabase: ReturnType<typeof createClient> | null = null;
let _supabaseServiceRole: ReturnType<typeof createClient> | null = null;

export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(target, prop) {
    if (!_supabase) {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables');
      }
      
      _supabase = createClient(supabaseUrl, supabaseAnonKey);
    }
    
    return (_supabase as unknown as Record<string, unknown>)[prop as string];
  }
});

// Service role client for usage tracking and admin operations
export const supabaseServiceRole = new Proxy({} as ReturnType<typeof createClient>, {
  get(target, prop) {
    if (!_supabaseServiceRole) {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!supabaseUrl || !supabaseServiceRoleKey) {
        throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables');
      }
      
      _supabaseServiceRole = createClient(supabaseUrl, supabaseServiceRoleKey);
    }
    
    return (_supabaseServiceRole as unknown as Record<string, unknown>)[prop as string];
  }
});

// Database types
export interface Channel {
  id: number;
  arena_id: number;
  title: string;
  slug: string;
  user_id: string | null;
  last_sync: string | null;
  created_at: string;
  updated_at: string;
}

export interface Block {
  id: number;
  arena_id: number;
  channel_id: number;
  title: string | null;
  description: string | null;
  content: string | null;
  url: string | null;
  thumbnail_url: string | null;
  block_type: string | null;
  created_at: string;
  updated_at: string;
  embedding: number[] | null;
}

export interface BlockWithSimilarity extends Block {
  similarity: number;
}