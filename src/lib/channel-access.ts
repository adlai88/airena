import { UserService } from './user-service';
import { ArenaClient } from './arena';

export interface ChannelAccessResult {
  canAccess: boolean;
  isPrivate: boolean;
  requiresUpgrade: boolean;
  message?: string;
  userTier: string;
}

export class ChannelAccessService {
  /**
   * Check if a user can access a specific channel
   */
  static async checkChannelAccess(
    channelSlug: string,
    userId?: string
  ): Promise<ChannelAccessResult> {
    try {
      // Get user tier
      const userTier = userId ? await UserService.getUserTier(userId) : 'free';
      
      // Try to access the channel without authentication first (public channels)
      const publicClient = new ArenaClient();
      
      try {
        // Try to access as public channel
        await publicClient.getChannel(channelSlug);
        
        // If we get here, channel is public - anyone can access
        return {
          canAccess: true,
          isPrivate: false,
          requiresUpgrade: false,
          userTier
        };
      } catch (publicError) {
        // If public access fails, it might be private
        const errorMessage = publicError instanceof Error ? publicError.message : 'Unknown error';
        
        if (errorMessage.includes('404') || errorMessage.includes('403') || errorMessage.includes('not found')) {
          // Channel is private or doesn't exist
          
          // Check if user has paid tier for private channel access
          if (userTier === 'free') {
            return {
              canAccess: false,
              isPrivate: true,
              requiresUpgrade: true,
              message: 'This channel is private. Upgrade to Starter to access private channels.',
              userTier
            };
          }
          
          // User has paid tier - try with API key authentication
          const privateClient = new ArenaClient(process.env.ARENA_API_KEY);
          
          try {
            await privateClient.getChannel(channelSlug);
            
            return {
              canAccess: true,
              isPrivate: true,
              requiresUpgrade: false,
              userTier
            };
          } catch (privateError) {
            // Even with API key, channel is not accessible
            return {
              canAccess: false,
              isPrivate: true,
              requiresUpgrade: false,
              message: 'Channel not found or not accessible with current API key.',
              userTier
            };
          }
        }
        
        // Other error - treat as inaccessible
        return {
          canAccess: false,
          isPrivate: false,
          requiresUpgrade: false,
          message: 'Channel not accessible.',
          userTier
        };
      }
    } catch (error) {
      console.error('Error checking channel access:', error);
      return {
        canAccess: false,
        isPrivate: false,
        requiresUpgrade: false,
        message: 'Error checking channel access.',
        userTier: 'free'
      };
    }
  }

  /**
   * Get appropriate Arena client for user tier
   */
  static getArenaClient(userTier: string): ArenaClient {
    // Only paid tiers get API key access for private channels
    if (userTier !== 'free') {
      return new ArenaClient(process.env.ARENA_API_KEY);
    }
    
    return new ArenaClient(); // Public access only
  }

  /**
   * Check if channel slug looks like a private channel
   */
  static isPrivateChannelSlug(slug: string): boolean {
    // Private channels often have specific patterns
    // This is a heuristic check - actual privacy is determined by API response
    return slug.includes('private') || slug.includes('secret') || slug.length > 20;
  }
}