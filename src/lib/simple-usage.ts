import { supabaseServiceRole } from './supabase';

export const LIFETIME_BLOCK_LIMIT = 50;

export interface SimpleUsageResult {
  canProcess: boolean;
  blocksUsed: number;
  blocksRemaining: number;
  message?: string;
}

export class SimpleUsageTracker {
  /**
   * Check if user can process more blocks
   */
  static async checkUsage(userId: string): Promise<SimpleUsageResult> {
    try {
      // Get user's current usage
      const { data: user, error } = await supabaseServiceRole
        .from('user')
        .select('lifetime_blocks_used, tier')
        .eq('id', userId)
        .single() as { 
          data: { lifetime_blocks_used: number | null; tier: string | null } | null; 
          error: unknown 
        };

      if (error || !user) {
        console.error('Error fetching user usage:', error);
        
        // If user doesn't exist in users table, create a default free tier user
        if (error && typeof error === 'object' && 'code' in error && error.code === 'PGRST116') {
          // User not found, create default record
          const { error: insertError } = await supabaseServiceRole
            .from('user')
            .insert({
              id: userId,
              tier: 'free',
              lifetime_blocks_used: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            
          if (insertError) {
            console.error('Error creating user record:', insertError);
            return {
              canProcess: false,
              blocksUsed: 0,
              blocksRemaining: 0,
              message: 'Unable to verify usage limits'
            };
          }
          
          // Return default free tier limits
          return {
            canProcess: true,
            blocksUsed: 0,
            blocksRemaining: LIFETIME_BLOCK_LIMIT,
          };
        }
        
        return {
          canProcess: false,
          blocksUsed: 0,
          blocksRemaining: 0,
          message: 'Unable to verify usage limits'
        };
      }

      const blocksUsed = user.lifetime_blocks_used || 0;
      const userTier = user.tier || 'free';

      // Paid tiers have no lifetime limit
      if (userTier !== 'free') {
        return {
          canProcess: true,
          blocksUsed: blocksUsed,
          blocksRemaining: 999999, // Effectively unlimited
        };
      }

      // Free tier: 50 block lifetime limit
      const blocksRemaining = Math.max(0, LIFETIME_BLOCK_LIMIT - blocksUsed);
      const canProcess = blocksRemaining > 0;

      return {
        canProcess,
        blocksUsed,
        blocksRemaining,
        message: canProcess 
          ? undefined 
          : `You've used all ${LIFETIME_BLOCK_LIMIT} free blocks. Upgrade to Starter for unlimited processing.`
      };
    } catch (error) {
      console.error('Error in checkUsage:', error);
      return {
        canProcess: false,
        blocksUsed: 0,
        blocksRemaining: 0,
        message: 'Error checking usage limits'
      };
    }
  }

  /**
   * Record blocks processed by incrementing lifetime usage
   */
  static async recordUsage(userId: string, blocksProcessed: number): Promise<void> {
    try {
      // Increment lifetime blocks used
      const { error } = await supabaseServiceRole.rpc('increment_lifetime_blocks', {
        user_id: userId,
        blocks_to_add: blocksProcessed
      });

      if (error) {
        // Fallback to direct update if RPC doesn't exist
        const { data: currentUser } = await supabaseServiceRole
          .from('user')
          .select('lifetime_blocks_used')
          .eq('id', userId)
          .single() as { 
            data: { lifetime_blocks_used: number | null } | null; 
            error: unknown 
          };

        const currentBlocks = currentUser?.lifetime_blocks_used || 0;
        
        await supabaseServiceRole
          .from('user')
          .update({ 
            lifetime_blocks_used: currentBlocks + blocksProcessed,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
      }

      console.log(`Recorded ${blocksProcessed} blocks for user ${userId}`);
    } catch (error) {
      console.error('Error recording usage:', error);
      // Don't throw - we don't want to break the sync if usage recording fails
    }
  }

  /**
   * Get user's current usage stats
   */
  static async getUserStats(userId: string): Promise<{
    blocksUsed: number;
    blocksRemaining: number;
    percentUsed: number;
    tier: string;
  }> {
    try {
      const { data: user, error } = await supabaseServiceRole
        .from('user')
        .select('lifetime_blocks_used, tier')
        .eq('id', userId)
        .single() as { 
          data: { lifetime_blocks_used: number | null; tier: string | null } | null; 
          error: unknown 
        };

      if (error || !user) {
        // If user doesn't exist, create default record
        if (error && typeof error === 'object' && 'code' in error && error.code === 'PGRST116') {
          const { error: insertError } = await supabaseServiceRole
            .from('user')
            .insert({
              id: userId,
              tier: 'free',
              lifetime_blocks_used: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            
          if (!insertError) {
            // Return default free tier stats
            return {
              blocksUsed: 0,
              blocksRemaining: LIFETIME_BLOCK_LIMIT,
              percentUsed: 0,
              tier: 'free'
            };
          }
        }
        
        return {
          blocksUsed: 0,
          blocksRemaining: LIFETIME_BLOCK_LIMIT,
          percentUsed: 0,
          tier: 'free'
        };
      }

      const blocksUsed = user.lifetime_blocks_used || 0;
      const userTier = user.tier || 'free';

      if (userTier !== 'free') {
        return {
          blocksUsed,
          blocksRemaining: 999999,
          percentUsed: 0,
          tier: userTier
        };
      }

      const blocksRemaining = Math.max(0, LIFETIME_BLOCK_LIMIT - blocksUsed);
      const percentUsed = Math.round((blocksUsed / LIFETIME_BLOCK_LIMIT) * 100);

      return {
        blocksUsed,
        blocksRemaining,
        percentUsed,
        tier: userTier
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return {
        blocksUsed: 0,
        blocksRemaining: LIFETIME_BLOCK_LIMIT,
        percentUsed: 0,
        tier: 'free'
      };
    }
  }
}