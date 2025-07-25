/**
 * Unified UserService that now directly uses UserServiceV2 (Better Auth)
 * Since Clerk has been removed, this is now a simple re-export
 */

import { UserServiceV2 } from './user-service-v2';
import { UserTier } from './usage-tracking';

export interface UserSubscription {
  tier: UserTier;
  polarCustomerId?: string;
  subscriptionId?: string;
  status: 'active' | 'inactive' | 'cancelled' | 'past_due';
  currentPeriodEnd?: Date;
}

export class UnifiedUserService {
  static async getUserTier(userId: string): Promise<UserTier> {
    return UserServiceV2.getUserTier(userId);
  }
  
  static async getUserSubscription(userId: string): Promise<UserSubscription> {
    return UserServiceV2.getUserSubscription(userId);
  }
  
  static async updateUserTier(
    userId: string,
    tier: UserTier,
    subscriptionData?: {
      polarCustomerId?: string;
      subscriptionId?: string;
      status?: string;
    }
  ): Promise<void> {
    return UserServiceV2.updateUserTier(userId, tier, subscriptionData);
  }
  
  static async hasActiveSubscription(userId: string): Promise<boolean> {
    return UserServiceV2.hasActiveSubscription(userId);
  }
  
  static async getUserByEmail(email: string) {
    return UserServiceV2.getUserByEmail(email);
  }
  
  static async updateUserSettings(
    userId: string,
    settings: { arenaApiKey?: string | null }
  ): Promise<void> {
    return UserServiceV2.updateUserSettings(userId, settings);
  }
  
  static async getArenaApiKey(userId: string): Promise<string | null> {
    return UserServiceV2.getArenaApiKey(userId);
  }
}