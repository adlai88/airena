import { supabase } from './supabase';

export interface UsageRecord {
  id: number;
  channel_id: number;
  user_id?: string;
  session_id?: string;
  ip_address?: string;
  total_blocks_processed: number;
  first_processed_at: string;
  last_processed_at: string;
  is_free_tier: boolean;
  created_at: string;
  updated_at: string;
}

export interface UsageCheckResult {
  canProcess: boolean;
  blocksProcessed: number;
  blocksRemaining: number;
  isFirstTime: boolean;
  blocksToProcess?: number; // How many blocks will be processed this time
  message?: string;
}

export class UsageTracker {
  private static readonly FREE_TIER_LIMIT = 25;

  /**
   * Generate a session ID for anonymous users
   */
  static generateSessionId(): string {
    return `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get IP address from request headers
   */
  static getIpAddress(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfIp = request.headers.get('cf-connecting-ip');
    
    return forwarded?.split(',')[0] || realIp || cfIp || 'unknown';
  }

  /**
   * Check if a channel can be processed by this user/session
   */
  static async checkUsageLimit(
    channelId: number,
    sessionId: string,
    ipAddress: string,
    userId?: string,
    blocksToProcess?: number
  ): Promise<UsageCheckResult> {
    try {
      // Query for existing usage record
      const query = supabase
        .from('channel_usage')
        .select('*')
        .eq('channel_id', channelId);

      if (userId) {
        query.eq('user_id', userId);
      } else {
        query.eq('session_id', sessionId).is('user_id', null);
      }

      const { data: existingUsage, error } = await query.single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error checking usage:', error);
        throw new Error(`Failed to check usage: ${error.message}`);
      }

      // const isFirstTime = !existingUsage; // unused variable

      if (!existingUsage) {
        // First time processing this channel
        if (blocksToProcess && blocksToProcess > this.FREE_TIER_LIMIT) {
          // Limit first-time processing to the free tier limit
          return {
            canProcess: true,
            blocksProcessed: 0,
            blocksRemaining: this.FREE_TIER_LIMIT,
            isFirstTime: true,
            blocksToProcess: this.FREE_TIER_LIMIT,
            message: `Processing limited to ${this.FREE_TIER_LIMIT} blocks (free tier limit). Upgrade for unlimited processing.`
          };
        }
        
        return {
          canProcess: true,
          blocksProcessed: 0,
          blocksRemaining: this.FREE_TIER_LIMIT,
          isFirstTime: true,
          blocksToProcess: blocksToProcess
        };
      }

      // Type assertion for database response
      const usage = existingUsage as unknown as UsageRecord;
      const blocksProcessed = Number(usage.total_blocks_processed) || 0;
      
      // For free tier users, check if they've exceeded the lifetime limit
      if (usage.is_free_tier) {
        const blocksRemaining = Math.max(0, this.FREE_TIER_LIMIT - blocksProcessed);
        
        // If they want to process more blocks than remaining, deny or limit
        if (blocksToProcess && blocksToProcess > blocksRemaining) {
          if (blocksRemaining === 0) {
            return {
              canProcess: false,
              blocksProcessed: blocksProcessed,
              blocksRemaining: 0,
              isFirstTime: false,
              blocksToProcess: blocksToProcess,
              message: `Free tier limit reached (${blocksProcessed}/${this.FREE_TIER_LIMIT} blocks processed). Upgrade to process more content.`
            };
          } else {
            return {
              canProcess: true,
              blocksProcessed: blocksProcessed,
              blocksRemaining: blocksRemaining,
              isFirstTime: false,
              blocksToProcess: blocksRemaining,
              message: `Processing limited to ${blocksRemaining} blocks (${blocksProcessed}/${this.FREE_TIER_LIMIT} lifetime limit). Upgrade for unlimited processing.`
            };
          }
        }
      }

      // For paid users (future implementation)
      // TODO: Add monthly limit checking for paid tiers

      return {
        canProcess: true,
        blocksProcessed: blocksProcessed,
        blocksRemaining: this.FREE_TIER_LIMIT - blocksProcessed,
        isFirstTime: false,
        blocksToProcess: blocksToProcess
      };

    } catch (error) {
      console.error('Error in checkUsageLimit:', error);
      throw error;
    }
  }

  /**
   * Record usage after processing blocks
   */
  static async recordUsage(
    channelId: number,
    blocksProcessed: number,
    sessionId: string,
    ipAddress: string,
    userId?: string
  ): Promise<UsageRecord> {
    try {
      // First, get the existing usage to calculate new total
      const query = supabase
        .from('channel_usage')
        .select('*')
        .eq('channel_id', channelId);

      if (userId) {
        query.eq('user_id', userId);
      } else {
        query.eq('session_id', sessionId).is('user_id', null);
      }

      const { data: existingUsage, error: selectError } = await query.single();

      if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error getting existing usage:', selectError);
        throw new Error(`Failed to get existing usage: ${selectError.message}`);
      }

      const currentTotal = existingUsage ? Number((existingUsage as unknown as UsageRecord).total_blocks_processed) || 0 : 0;
      const newTotal = currentTotal + blocksProcessed;

      if (existingUsage) {
        // Update existing record by adding new blocks to the total
        const updateQuery = supabase
          .from('channel_usage')
          .update({
            total_blocks_processed: newTotal,
            last_processed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('channel_id', channelId);

        if (userId) {
          updateQuery.eq('user_id', userId);
        } else {
          updateQuery.eq('session_id', sessionId).is('user_id', null);
        }

        const { data: updateData, error: updateError } = await updateQuery.select().single();

        if (updateError) {
          console.error('Error updating usage:', updateError);
          throw new Error(`Failed to update usage: ${updateError.message}`);
        }

        return updateData as unknown as UsageRecord;
      } else {
        // Create new record
        const insertData = {
          channel_id: channelId,
          user_id: userId || null,
          session_id: userId ? null : sessionId,
          ip_address: ipAddress,
          total_blocks_processed: blocksProcessed,
          is_free_tier: true, // Default to free tier for now
          first_processed_at: new Date().toISOString(),
          last_processed_at: new Date().toISOString()
        };

        const { data: insertResult, error: insertError } = await supabase
          .from('channel_usage')
          .insert(insertData)
          .select()
          .single();

        if (insertError) {
          console.error('Error recording usage:', insertError);
          throw new Error(`Failed to record usage: ${insertError.message}`);
        }

        return insertResult as unknown as UsageRecord;
      }

    } catch (error) {
      console.error('Error in recordUsage:', error);
      throw error;
    }
  }

  /**
   * Get usage statistics for a user/session
   */
  static async getUserUsage(
    sessionId: string,
    userId?: string
  ): Promise<UsageRecord[]> {
    try {
      const query = supabase
        .from('channel_usage')
        .select('*')
        .order('last_processed_at', { ascending: false });

      if (userId) {
        query.eq('user_id', userId);
      } else {
        query.eq('session_id', sessionId).is('user_id', null);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error getting user usage:', error);
        throw new Error(`Failed to get usage: ${error.message}`);
      }

      return data as unknown as UsageRecord[];

    } catch (error) {
      console.error('Error in getUserUsage:', error);
      throw error;
    }
  }

  /**
   * Check if user has any usage history (for upgrade prompts)
   */
  static async hasUsageHistory(
    sessionId: string,
    userId?: string
  ): Promise<boolean> {
    try {
      const usage = await this.getUserUsage(sessionId, userId);
      return usage.length > 0;
    } catch (error) {
      console.error('Error checking usage history:', error);
      return false;
    }
  }
}