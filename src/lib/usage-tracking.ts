import { supabaseServiceRole } from './supabase';

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
  // Channel information (from join)
  channel_title?: string;
  channel_slug?: string;
  channel_thumbnail_url?: string;
}

export interface MonthlyUsageRecord {
  id: number;
  user_id: string;
  session_id?: string;
  month: string; // YYYY-MM format
  total_blocks_processed: number;
  tier: 'free' | 'starter' | 'pro';
  limit: number;
  created_at: string;
  updated_at: string;
}

export type UserTier = 'free' | 'starter' | 'pro';

export interface TierLimits {
  free: { blocks: 25; type: 'per_channel'; chatMessages: 10; generations: 2 };
  starter: { blocks: 200; type: 'per_month'; chatMessages: -1; generations: -1 }; // -1 = unlimited
  pro: { blocks: 500; type: 'per_month'; chatMessages: -1; generations: -1 };
}

export interface UsageCheckResult {
  canProcess: boolean;
  blocksProcessed: number;
  blocksRemaining: number;
  isFirstTime: boolean;
  blocksToProcess?: number; // How many blocks will be processed this time
  message?: string;
  tier?: UserTier;
  monthlyUsage?: {
    current: number;
    limit: number;
    remaining: number;
  };
  overage?: {
    blocks: number;
    cost: number; // in dollars
    perBlockCost: number;
  };
}

export interface ChannelLimitsRecord {
  id: number;
  channel_id: number;
  user_id?: string;
  session_id?: string;
  month: string;
  chat_messages_used: number;
  generations_used: number;
  chat_messages_limit: number;
  generations_limit: number;
  created_at: string;
  updated_at: string;
}

export interface ChatGenerationCheckResult {
  canChat: boolean;
  canGenerate: boolean;
  chatMessagesUsed: number;
  chatMessagesRemaining: number;
  generationsUsed: number;
  generationsRemaining: number;
  isFirstTime: boolean;
  tier: UserTier;
  message?: string;
}

export class UsageTracker {
  private static readonly FREE_TIER_LIMIT = 25;
  private static readonly OVERAGE_COST_PER_BLOCK = 0.15; // $0.15 per block
  
  // Tier configuration with monthly limits
  private static readonly TIER_LIMITS: TierLimits = {
    free: { blocks: 25, type: 'per_channel', chatMessages: 10, generations: 2 },
    starter: { blocks: 200, type: 'per_month', chatMessages: -1, generations: -1 },
    pro: { blocks: 500, type: 'per_month', chatMessages: -1, generations: -1 }
  };

  /**
   * Get current month in YYYY-MM format
   */
  private static getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Get user tier from API route (for server-side usage)
   */
  static async getUserTier(userId?: string): Promise<UserTier> {
    if (!userId) {
      return 'free';
    }

    try {
      // For server-side usage, we'll need to import UserService dynamically
      // This avoids client-side import issues
      const { UserService } = await import('./user-service');
      return await UserService.getUserTier(userId);
    } catch (error) {
      console.error('Error getting user tier:', error);
      return 'free';
    }
  }

  /**
   * Calculate overage cost for blocks exceeding monthly limit
   */
  private static calculateOverage(
    currentUsage: number,
    limit: number,
    additionalBlocks: number
  ): { blocks: number; cost: number; perBlockCost: number } | null {
    const totalUsage = currentUsage + additionalBlocks;
    const overageBlocks = Math.max(0, totalUsage - limit);
    
    if (overageBlocks === 0) {
      return null;
    }

    return {
      blocks: overageBlocks,
      cost: overageBlocks * this.OVERAGE_COST_PER_BLOCK,
      perBlockCost: this.OVERAGE_COST_PER_BLOCK
    };
  }

  /**
   * Generate a session ID for anonymous users
   */
  static generateSessionId(): string {
    return `anon_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
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
   * Get monthly usage for a user
   */
  private static async getMonthlyUsage(
    userId: string,
    sessionId?: string,
    month: string = this.getCurrentMonth()
  ): Promise<MonthlyUsageRecord | null> {
    try {
      const query = supabaseServiceRole
        .from('monthly_usage')
        .select('*')
        .eq('month', month);

      if (userId) {
        query.eq('user_id', userId);
      } else if (sessionId) {
        query.eq('session_id', sessionId).is('user_id', null);
      }

      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error getting monthly usage:', error);
        throw new Error(`Failed to get monthly usage: ${error.message}`);
      }

      return data ? (data as unknown as MonthlyUsageRecord) : null;
    } catch (error) {
      console.error('Error in getMonthlyUsage:', error);
      throw error;
    }
  }

  /**
   * Update or create monthly usage record
   */
  private static async updateMonthlyUsage(
    userId: string,
    sessionId: string,
    blocksProcessed: number,
    tier: UserTier,
    month: string = this.getCurrentMonth()
  ): Promise<void> {
    try {
      const existingUsage = await this.getMonthlyUsage(userId, sessionId, month);
      const tierConfig = this.TIER_LIMITS[tier];

      if (existingUsage) {
        // Update existing record
        const newTotal = existingUsage.total_blocks_processed + blocksProcessed;
        
        const { error } = await supabaseServiceRole
          .from('monthly_usage')
          .update({
            total_blocks_processed: newTotal,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingUsage.id);

        if (error) {
          console.error('Error updating monthly usage:', error);
          throw new Error(`Failed to update monthly usage: ${error.message}`);
        }
      } else {
        // Create new record
        const insertData = {
          user_id: userId || null,
          session_id: userId ? null : sessionId,
          month,
          total_blocks_processed: blocksProcessed,
          tier,
          limit: tierConfig.blocks
        };

        const { error } = await supabaseServiceRole
          .from('monthly_usage')
          .insert(insertData);

        if (error) {
          console.error('Error creating monthly usage:', error);
          throw new Error(`Failed to create monthly usage: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('Error in updateMonthlyUsage:', error);
      throw error;
    }
  }

  /**
   * Check if a channel can be processed by this user/session
   */
  static async checkUsageLimit(
    channelId: number,
    sessionId: string,
    userId?: string,
    blocksToProcess?: number
  ): Promise<UsageCheckResult> {
    try {
      const userTier = await this.getUserTier(userId);
      const tierConfig = this.TIER_LIMITS[userTier];
      const currentMonth = this.getCurrentMonth();

      // For free tier, use per-channel limits
      if (userTier === 'free') {
        return this.checkChannelUsageLimit(channelId, sessionId, userId, blocksToProcess);
      }

      // For paid tiers, check monthly usage limits
      const monthlyUsage = await this.getMonthlyUsage(userId || sessionId, sessionId, currentMonth);
      const currentMonthlyBlocks = monthlyUsage ? monthlyUsage.total_blocks_processed : 0;
      const monthlyRemaining = Math.max(0, tierConfig.blocks - currentMonthlyBlocks);

      // Also check channel-specific usage for this session
      const channelUsageResult = await this.checkChannelUsageLimit(channelId, sessionId, userId, blocksToProcess, false);

      // Calculate potential overage
      const overage = blocksToProcess ? this.calculateOverage(currentMonthlyBlocks, tierConfig.blocks, blocksToProcess) : null;

      if (blocksToProcess && blocksToProcess > monthlyRemaining) {
        if (monthlyRemaining === 0) {
          return {
            canProcess: false,
            blocksProcessed: channelUsageResult.blocksProcessed,
            blocksRemaining: 0,
            isFirstTime: channelUsageResult.isFirstTime,
            blocksToProcess: blocksToProcess,
            tier: userTier,
            monthlyUsage: {
              current: currentMonthlyBlocks,
              limit: tierConfig.blocks,
              remaining: monthlyRemaining
            },
            overage: overage || undefined,
            message: `Monthly limit reached (${currentMonthlyBlocks}/${tierConfig.blocks} blocks processed this month). ${overage ? `Processing ${blocksToProcess} blocks would cost $${overage.cost.toFixed(2)} in overage fees.` : 'Your plan resets next month.'}`
          };
        } else {
          return {
            canProcess: true,
            blocksProcessed: channelUsageResult.blocksProcessed,
            blocksRemaining: monthlyRemaining,
            isFirstTime: channelUsageResult.isFirstTime,
            blocksToProcess: monthlyRemaining,
            tier: userTier,
            monthlyUsage: {
              current: currentMonthlyBlocks,
              limit: tierConfig.blocks,
              remaining: monthlyRemaining
            },
            overage: overage || undefined,
            message: `Processing limited to ${monthlyRemaining} blocks (${currentMonthlyBlocks}/${tierConfig.blocks} monthly limit). ${overage ? `Processing all ${blocksToProcess} blocks would incur $${overage.cost.toFixed(2)} in overage fees.` : ''}`
          };
        }
      }

      return {
        canProcess: true,
        blocksProcessed: channelUsageResult.blocksProcessed,
        blocksRemaining: monthlyRemaining,
        isFirstTime: channelUsageResult.isFirstTime,
        blocksToProcess: blocksToProcess,
        tier: userTier,
        monthlyUsage: {
          current: currentMonthlyBlocks,
          limit: tierConfig.blocks,
          remaining: monthlyRemaining
        },
        overage: overage || undefined
      };

    } catch (error) {
      console.error('Error in checkUsageLimit:', error);
      throw error;
    }
  }

  /**
   * Check channel-specific usage limits (used for free tier)
   */
  private static async checkChannelUsageLimit(
    channelId: number,
    sessionId: string,
    userId?: string,
    blocksToProcess?: number,
    enforceLimit: boolean = true
  ): Promise<UsageCheckResult> {
    try {
      // Query for existing usage record
      const query = supabaseServiceRole
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

      if (!existingUsage) {
        // First time processing this channel
        if (enforceLimit && blocksToProcess && blocksToProcess > this.FREE_TIER_LIMIT) {
          // Limit first-time processing to the free tier limit
          return {
            canProcess: true,
            blocksProcessed: 0,
            blocksRemaining: this.FREE_TIER_LIMIT,
            isFirstTime: true,
            blocksToProcess: this.FREE_TIER_LIMIT,
            message: `Processing limited to ${this.FREE_TIER_LIMIT} blocks (free tier limit). Upgrade for more processing.`
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
      if (enforceLimit && usage.is_free_tier) {
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
              message: `Processing limited to ${blocksRemaining} blocks (${blocksProcessed}/${this.FREE_TIER_LIMIT} lifetime limit). Upgrade for more processing.`
            };
          }
        }
      }

      return {
        canProcess: true,
        blocksProcessed: blocksProcessed,
        blocksRemaining: this.FREE_TIER_LIMIT - blocksProcessed,
        isFirstTime: false,
        blocksToProcess: blocksToProcess
      };

    } catch (error) {
      console.error('Error in checkChannelUsageLimit:', error);
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
      const query = supabaseServiceRole
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

      // Also update monthly usage for paid tiers
      const userTier = await this.getUserTier(userId);
      if (userTier !== 'free') {
        await this.updateMonthlyUsage(userId || sessionId, sessionId, blocksProcessed, userTier);
      }

      if (existingUsage) {
        // Update existing record by adding new blocks to the total
        const updateQuery = supabaseServiceRole
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
          is_free_tier: userTier === 'free', // Set based on actual user tier
          first_processed_at: new Date().toISOString(),
          last_processed_at: new Date().toISOString()
        };

        const { data: insertResult, error: insertError } = await supabaseServiceRole
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
      const query = supabaseServiceRole
        .from('channel_usage')
        .select(`
          *,
          channels!inner(
            title,
            slug,
            thumbnail_url
          )
        `)
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
      
      // Flatten the channel data from the join
      return (data || []).map((record: Record<string, unknown>) => {
        const channels = record.channels as { title?: string; slug?: string; thumbnail_url?: string } | undefined;
        return {
          ...record,
          channel_title: channels?.title,
          channel_slug: channels?.slug,
          channel_thumbnail_url: channels?.thumbnail_url,
          channels: undefined // Remove the nested object
        } as unknown as UsageRecord;
      });

    } catch (error) {
      console.error('Error in getUserUsage:', error);
      throw error;
    }
  }

  /**
   * Count the number of channels a user has synced
   */
  static async getUserChannelCount(
    sessionId: string,
    userId?: string
  ): Promise<number> {
    try {
      // For authenticated users, use the standard logic
      if (userId) {
        const usage = await this.getUserUsage(sessionId, userId);
        return usage.length;
      }
      
      // For unauthenticated users, try multiple approaches to get accurate count
      // 1. First try exact session ID match
      let usage = await this.getUserUsage(sessionId, userId);
      
      // 2. If no results and session ID looks like our pattern, try fuzzy matching
      if (usage.length === 0 && sessionId.startsWith('anon_')) {
        // Extract timestamp from session ID for fuzzy matching
        const timestampMatch = sessionId.match(/anon_(\d+)_/);
        if (timestampMatch) {
          const timestamp = timestampMatch[1];
          
          // Look for session IDs with the same timestamp (likely from same browser session)
          const { data: fuzzyData, error: fuzzyError } = await supabaseServiceRole
            .from('channel_usage')
            .select(`
              *,
              channels!inner(
                title,
                slug,
                thumbnail_url
              )
            `)
            .like('session_id', `anon_${timestamp}_%`)
            .is('user_id', null)
            .order('last_processed_at', { ascending: false });

          if (!fuzzyError && fuzzyData && fuzzyData.length > 0) {
            // Flatten the channel data from the join
            usage = fuzzyData.map((record: Record<string, unknown>) => {
              const channels = record.channels as { title?: string; slug?: string; thumbnail_url?: string } | undefined;
              return {
                ...record,
                channel_title: channels?.title,
                channel_slug: channels?.slug,
                channel_thumbnail_url: channels?.thumbnail_url,
                channels: undefined // Remove the nested object
              } as unknown as UsageRecord;
            });
          }
        }
      }
      
      return usage.length;
    } catch (error) {
      console.error('Error getting user channel count:', error);
      return 0;
    }
  }

  /**
   * Check for large channel warnings on paid tiers
   */
  static async checkLargeChannelWarning(
    channelBlocks: number,
    sessionId: string,
    userId?: string
  ): Promise<{
    showWarning: boolean;
    monthlyUsed: number;
    monthlyLimit: number;
    monthlyRemaining: number;
    wouldExceedLimit: boolean;
    overageBlocks?: number;
    message?: string;
  }> {
    try {
      const userTier = await this.getUserTier(userId);
      
      // Handle free tier users with lifetime limits
      if (userTier === 'free') {
        // Import SimpleUsageTracker for free tier
        const { SimpleUsageTracker } = await import('./simple-usage');
        const stats = await SimpleUsageTracker.getUserStats(userId!);
        
        // Show warning for channels > 25 blocks when user has limited lifetime blocks
        const showWarning = channelBlocks > 25 && stats.blocksRemaining < 50;
        const wouldExceedLimit = channelBlocks > stats.blocksRemaining;
        
        let message = '';
        if (stats.blocksRemaining === 0) {
          message = `You've used all 50 free blocks. Upgrade to Starter for unlimited processing.`;
        } else if (wouldExceedLimit) {
          message = `This channel has ${channelBlocks} blocks. You have ${stats.blocksRemaining} blocks remaining (${stats.blocksUsed}/50 lifetime limit).`;
        } else if (channelBlocks > stats.blocksRemaining * 0.5) {
          message = `This channel has ${channelBlocks} blocks, which would use most of your ${stats.blocksRemaining} remaining lifetime blocks.`;
        } else {
          message = `This channel has ${channelBlocks} blocks. You have ${stats.blocksRemaining}/50 lifetime blocks remaining.`;
        }
        
        return {
          showWarning,
          monthlyUsed: stats.blocksUsed,
          monthlyLimit: 50, // Lifetime limit for free tier
          monthlyRemaining: stats.blocksRemaining,
          wouldExceedLimit,
          overageBlocks: wouldExceedLimit ? channelBlocks - stats.blocksRemaining : undefined,
          message
        };
      }

      const tierConfig = this.TIER_LIMITS[userTier];
      const currentMonth = this.getCurrentMonth();
      
      // Get current monthly usage
      const monthlyUsage = await this.getMonthlyUsage(userId || sessionId, sessionId, currentMonth);
      const monthlyUsed = monthlyUsage ? monthlyUsage.total_blocks_processed : 0;
      const monthlyRemaining = Math.max(0, tierConfig.blocks - monthlyUsed);
      
      // Determine if we should show warning
      const wouldExceedLimit = channelBlocks > monthlyRemaining;
      const showWarning = channelBlocks > 50; // Show warning for channels > 50 blocks
      
      let message = '';
      if (wouldExceedLimit) {
        const overageBlocks = channelBlocks - monthlyRemaining;
        message = `This channel has ${channelBlocks} blocks. You only have ${monthlyRemaining} blocks remaining this month, so ${overageBlocks} blocks won't be processed.`;
      } else if (channelBlocks > monthlyRemaining * 0.8) {
        message = `This channel has ${channelBlocks} blocks, which will use most of your remaining ${monthlyRemaining} blocks this month.`;
      } else {
        message = `This channel has ${channelBlocks} blocks. You have ${monthlyRemaining} blocks remaining this month.`;
      }

      return {
        showWarning,
        monthlyUsed,
        monthlyLimit: tierConfig.blocks,
        monthlyRemaining,
        wouldExceedLimit,
        overageBlocks: wouldExceedLimit ? channelBlocks - monthlyRemaining : undefined,
        message
      };
    } catch (error) {
      console.error('Error checking large channel warning:', error);
      return {
        showWarning: false,
        monthlyUsed: 0,
        monthlyLimit: 0,
        monthlyRemaining: 0,
        wouldExceedLimit: false,
        message: 'Error checking usage limits'
      };
    }
  }

  /**
   * Check if user has reached their channel limit based on tier
   */
  static async checkChannelLimit(
    channelSlug: string,
    sessionId: string,
    userId?: string
  ): Promise<{
    canAddChannel: boolean;
    channelCount: number;
    channelLimit: number;
    isNewChannel: boolean;
    message?: string;
  }> {
    try {
      const userTier = await this.getUserTier(userId);
      
      // Paid tiers have unlimited channels
      if (userTier !== 'free') {
        return {
          canAddChannel: true,
          channelCount: 0,
          channelLimit: -1, // unlimited
          isNewChannel: false
        };
      }

      // Free tier has 3 channel limit
      const channelLimit = 3;
      
      // Check if this channel already exists for the user
      const existingChannels = await this.getUserUsage(sessionId, userId);
      const isExistingChannel = existingChannels.some(
        channel => channel.channel_slug === channelSlug
      );

      if (isExistingChannel) {
        // Existing channel - can always re-sync
        return {
          canAddChannel: true,
          channelCount: existingChannels.length,
          channelLimit,
          isNewChannel: false
        };
      }

      // New channel - check if under limit
      const channelCount = existingChannels.length;
      const canAddChannel = channelCount < channelLimit;

      return {
        canAddChannel,
        channelCount,
        channelLimit,
        isNewChannel: true,
        message: canAddChannel 
          ? undefined 
          : `Free tier is limited to ${channelLimit} channels. You have ${channelCount}/${channelLimit} channels. Upgrade to Starter for unlimited channels.`
      };
    } catch (error) {
      console.error('Error checking channel limit:', error);
      return {
        canAddChannel: false,
        channelCount: 0,
        channelLimit: 3,
        isNewChannel: true,
        message: 'Error checking channel limits'
      };
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

  /**
   * Get comprehensive usage stats for a user (for dashboard)
   */
  static async getUserStats(
    sessionId: string,
    userId?: string
  ): Promise<{
    tier: UserTier;
    monthly: {
      current: number;
      limit: number;
      remaining: number;
      month: string;
    };
    channels: UsageRecord[];
    totalChannelsProcessed: number;
    totalBlocksProcessed: number;
  }> {
    try {
      const userTier = await this.getUserTier(userId);
      const tierConfig = this.TIER_LIMITS[userTier];
      const currentMonth = this.getCurrentMonth();

      // Get monthly usage
      const monthlyUsage = await this.getMonthlyUsage(userId || sessionId, sessionId, currentMonth);
      const currentMonthlyBlocks = monthlyUsage ? monthlyUsage.total_blocks_processed : 0;
      const monthlyRemaining = Math.max(0, tierConfig.blocks - currentMonthlyBlocks);

      // Get channel usage
      const channels = await this.getUserUsage(sessionId, userId);
      const totalBlocksProcessed = channels.reduce((sum, channel) => sum + channel.total_blocks_processed, 0);

      return {
        tier: userTier,
        monthly: {
          current: currentMonthlyBlocks,
          limit: tierConfig.blocks,
          remaining: monthlyRemaining,
          month: currentMonth
        },
        channels,
        totalChannelsProcessed: channels.length,
        totalBlocksProcessed
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }

  /**
   * Get tier information for display
   */
  static getTierInfo(tier: UserTier): {
    name: string;
    blocks: number;
    type: string;
    price?: string;
    features: string[];
  } {
    const config = this.TIER_LIMITS[tier];
    
    switch (tier) {
      case 'free':
        return {
          name: 'Free',
          blocks: config.blocks,
          type: config.type,
          features: [
            '25 blocks per channel',
            '3 channels maximum',
            '10 chat messages per channel/month',
            '2 generations per channel/month',
            'Public channels only',
            'Complete multimodal intelligence'
          ]
        };
      case 'starter':
        return {
          name: 'Starter',
          blocks: config.blocks,
          type: config.type,
          price: '$5/month',
          features: [
            '200 blocks per month',
            'Unlimited chat & generations',
            'Private channels access',
            'Unlimited channels',
            'Advanced templates',
            'Export generated content'
          ]
        };
      case 'pro':
        return {
          name: 'Pro',
          blocks: config.blocks,
          type: config.type,
          price: '$14/month',
          features: [
            '500 blocks per month',
            'Everything in Starter',
            'MCP server generation',
            'API access',
            'Webhook support',
            'Priority processing',
            'Channel isolation'
          ]
        };
      default:
        return {
          name: 'Unknown',
          blocks: 0,
          type: 'unknown',
          features: []
        };
    }
  }

  /**
   * Get or create channel limits record for current month
   */
  private static async getChannelLimits(
    channelId: number,
    sessionId: string,
    userId?: string,
    month: string = this.getCurrentMonth()
  ): Promise<ChannelLimitsRecord | null> {
    try {
      const query = supabaseServiceRole
        .from('channel_limits')
        .select('*')
        .eq('channel_id', channelId)
        .eq('month', month);

      if (userId) {
        query.eq('user_id', userId);
      } else if (sessionId) {
        query.eq('session_id', sessionId).is('user_id', null);
      }

      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error getting channel limits:', error);
        throw new Error(`Failed to get channel limits: ${error.message}`);
      }

      return data ? (data as unknown as ChannelLimitsRecord) : null;
    } catch (error) {
      console.error('Error in getChannelLimits:', error);
      throw error;
    }
  }

  /**
   * Check chat and generation limits for free tier users
   */
  static async checkChatGenerationLimits(
    channelId: number,
    sessionId: string,
    userId?: string,
    actionType: 'chat' | 'generation' = 'chat'
  ): Promise<ChatGenerationCheckResult> {
    try {
      const userTier = await this.getUserTier(userId);
      const tierConfig = this.TIER_LIMITS[userTier];
      const currentMonth = this.getCurrentMonth();

      // Paid tiers have unlimited chat and generations
      if (userTier !== 'free') {
        return {
          canChat: true,
          canGenerate: true,
          chatMessagesUsed: 0,
          chatMessagesRemaining: -1, // unlimited
          generationsUsed: 0,
          generationsRemaining: -1, // unlimited
          isFirstTime: false,
          tier: userTier
        };
      }

      // Get current channel limits
      const channelLimits = await this.getChannelLimits(channelId, sessionId, userId, currentMonth);

      if (!channelLimits) {
        // First time for this channel this month
        return {
          canChat: true,
          canGenerate: true,
          chatMessagesUsed: 0,
          chatMessagesRemaining: tierConfig.chatMessages,
          generationsUsed: 0,
          generationsRemaining: tierConfig.generations,
          isFirstTime: true,
          tier: userTier
        };
      }

      const chatRemaining = Math.max(0, channelLimits.chat_messages_limit - channelLimits.chat_messages_used);
      const generationsRemaining = Math.max(0, channelLimits.generations_limit - channelLimits.generations_used);

      const canChat = chatRemaining > 0;
      const canGenerate = generationsRemaining > 0;

      let message: string | undefined;
      if (actionType === 'chat' && !canChat) {
        message = `Chat limit reached (${channelLimits.chat_messages_used}/${channelLimits.chat_messages_limit} messages this month). Upgrade to Starter for unlimited chat.`;
      } else if (actionType === 'generation' && !canGenerate) {
        message = `Generation limit reached (${channelLimits.generations_used}/${channelLimits.generations_limit} generations this month). Upgrade to Starter for unlimited generations.`;
      }

      return {
        canChat,
        canGenerate,
        chatMessagesUsed: channelLimits.chat_messages_used,
        chatMessagesRemaining: chatRemaining,
        generationsUsed: channelLimits.generations_used,
        generationsRemaining: generationsRemaining,
        isFirstTime: false,
        tier: userTier,
        message
      };

    } catch (error) {
      console.error('Error in checkChatGenerationLimits:', error);
      throw error;
    }
  }

  /**
   * Record chat or generation usage
   */
  static async recordChatGenerationUsage(
    channelId: number,
    sessionId: string,
    actionType: 'chat' | 'generation',
    userId?: string
  ): Promise<void> {
    try {
      const userTier = await this.getUserTier(userId);
      
      // Skip recording for paid tiers (unlimited)
      if (userTier !== 'free') {
        return;
      }

      const currentMonth = this.getCurrentMonth();
      const tierConfig = this.TIER_LIMITS[userTier];

      // Get existing record or create new one
      const existingLimits = await this.getChannelLimits(channelId, sessionId, userId, currentMonth);

      if (existingLimits) {
        // Update existing record
        const updates: Record<string, unknown> = {
          updated_at: new Date().toISOString()
        };

        if (actionType === 'chat') {
          updates.chat_messages_used = existingLimits.chat_messages_used + 1;
        } else {
          updates.generations_used = existingLimits.generations_used + 1;
        }

        const { error } = await supabaseServiceRole
          .from('channel_limits')
          .update(updates)
          .eq('id', existingLimits.id);

        if (error) {
          console.error('Error updating channel limits:', error);
          throw new Error(`Failed to update channel limits: ${error.message}`);
        }
      } else {
        // Create new record
        const insertData = {
          channel_id: channelId,
          user_id: userId || null,
          session_id: userId ? null : sessionId,
          month: currentMonth,
          chat_messages_used: actionType === 'chat' ? 1 : 0,
          generations_used: actionType === 'generation' ? 1 : 0,
          chat_messages_limit: tierConfig.chatMessages,
          generations_limit: tierConfig.generations
        };

        const { error } = await supabaseServiceRole
          .from('channel_limits')
          .insert(insertData);

        if (error) {
          console.error('Error creating channel limits:', error);
          throw new Error(`Failed to create channel limits: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('Error in recordChatGenerationUsage:', error);
      throw error;
    }
  }
}