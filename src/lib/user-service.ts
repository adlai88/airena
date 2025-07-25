import { createClient } from '@supabase/supabase-js';
import { UserTier } from './usage-tracking';
import { Pool } from 'pg';

// Create service role Supabase client for server-side operations
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false
    }
  }
);

// PostgreSQL pool for direct queries when needed
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export interface UserSubscription {
  tier: UserTier;
  polarCustomerId?: string;
  subscriptionId?: string;
  status: 'active' | 'inactive' | 'cancelled' | 'past_due';
  currentPeriodEnd?: Date;
}

export interface User {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  arenaApiKey?: string | null;
  tier: UserTier;
  polarCustomerId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class UserService {
  /**
   * Get user by ID
   */
  static async getUser(userId: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error || !data) return null;
      
      return {
        id: data.id,
        email: data.email,
        name: data.name,
        image: data.image,
        arenaApiKey: data.arena_api_key,
        tier: data.tier || 'free',
        polarCustomerId: data.polar_customer_id,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }
  
  /**
   * Get user subscription tier
   */
  static async getUserTier(userId: string): Promise<UserTier> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('tier')
        .eq('id', userId)
        .single();
      
      if (error || !data) return 'free';
      
      return data.tier || 'free';
    } catch (error) {
      console.error('Error getting user tier:', error);
      return 'free';
    }
  }
  
  /**
   * Get user subscription details
   */
  static async getUserSubscription(userId: string): Promise<UserSubscription> {
    try {
      const user = await this.getUser(userId);
      
      if (!user) {
        return {
          tier: 'free',
          status: 'inactive'
        };
      }
      
      // For now, we determine status based on tier
      // In the future, you might want to store subscription status separately
      const status = user.tier === 'free' ? 'inactive' : 'active';
      
      return {
        tier: user.tier,
        polarCustomerId: user.polarCustomerId || undefined,
        status: status as UserSubscription['status']
      };
    } catch (error) {
      console.error('Error getting user subscription:', error);
      return {
        tier: 'free',
        status: 'inactive'
      };
    }
  }
  
  /**
   * Update user tier and subscription data
   */
  static async updateUserTier(
    userId: string,
    tier: UserTier,
    subscriptionData?: {
      polarCustomerId?: string;
      subscriptionId?: string;
      status?: string;
    }
  ): Promise<void> {
    try {
      const updateData: Record<string, unknown> = {
        tier,
        updated_at: new Date().toISOString()
      };
      
      if (subscriptionData?.polarCustomerId) {
        updateData.polar_customer_id = subscriptionData.polarCustomerId;
      }
      
      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);
      
      if (error) throw error;
      
      console.log(`Updated user ${userId} tier to ${tier}`);
    } catch (error) {
      console.error('Error updating user tier:', error);
      throw error;
    }
  }
  
  /**
   * Check if user has active subscription
   */
  static async hasActiveSubscription(userId: string): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);
      return subscription.status === 'active' && subscription.tier !== 'free';
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }
  
  /**
   * Get user by email (for webhook processing)
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      
      if (error || !data) return null;
      
      return {
        id: data.id,
        email: data.email,
        name: data.name,
        image: data.image,
        arenaApiKey: data.arena_api_key,
        tier: data.tier || 'free',
        polarCustomerId: data.polar_customer_id,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }
  
  /**
   * Update user settings (like Are.na API key)
   */
  static async updateUserSettings(
    userId: string,
    settings: { arenaApiKey?: string | null }
  ): Promise<void> {
    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      };
      
      if (settings.arenaApiKey !== undefined) {
        updateData.arena_api_key = settings.arenaApiKey;
      }
      
      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);
      
      if (error) throw error;
      
      console.log(`Updated settings for user ${userId}`);
    } catch (error) {
      console.error('Error updating user settings:', error);
      throw error;
    }
  }
  
  /**
   * Get Are.na API key for user
   */
  static async getArenaApiKey(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('arena_api_key')
        .eq('id', userId)
        .single();
      
      if (error || !data) return null;
      
      return data.arena_api_key;
    } catch (error) {
      console.error('Error getting Arena API key:', error);
      return null;
    }
  }
  
  /**
   * Create new user (used during Better Auth signup)
   */
  static async createUser(userData: {
    id: string;
    email: string;
    name?: string;
    image?: string;
  }): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: userData.id,
          email: userData.email,
          name: userData.name,
          image: userData.image,
          tier: 'free',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error || !data) {
        console.error('Error creating user:', error);
        return null;
      }
      
      return {
        id: data.id,
        email: data.email,
        name: data.name,
        image: data.image,
        arenaApiKey: data.arena_api_key,
        tier: data.tier || 'free',
        polarCustomerId: data.polar_customer_id,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  }
  
  /**
   * Clean up resources (call when done)
   */
  static async cleanup(): Promise<void> {
    await pool.end();
  }
}