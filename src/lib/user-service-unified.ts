/**
 * Unified UserService that now directly uses UserService (Better Auth)
 * Since Clerk has been removed, this is now a simple re-export
 */

import { UserService } from './user-service';
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
    return UserService.getUserTier(userId);
  }
  
  static async getUserSubscription(userId: string): Promise<UserSubscription> {
    return UserService.getUserSubscription(userId);
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
    return UserService.updateUserTier(userId, tier, subscriptionData);
  }
  
  static async hasActiveSubscription(userId: string): Promise<boolean> {
    return UserService.hasActiveSubscription(userId);
  }
  
  static async getUserByEmail(email: string) {
    return UserService.getUserByEmail(email);
  }
  
  static async updateUserSettings(
    userId: string,
    settings: { arenaApiKey?: string | null }
  ): Promise<void> {
    return UserService.updateUserSettings(userId, settings);
  }
  
  static async getArenaApiKey(userId: string): Promise<string | null> {
    return UserService.getArenaApiKey(userId);
  }
}