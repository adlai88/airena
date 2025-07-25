/**
 * Unified UserService that works with both Clerk and Better Auth
 * Uses feature flag to determine which implementation to use
 */

import { UserService } from './user-service';
import { UserServiceV2 } from './user-service-v2';
import { isNewAuthEnabled } from './feature-flags';
import { UserTier } from './usage-tracking';

export interface UserSubscription {
  tier: UserTier;
  polarCustomerId?: string;
  subscriptionId?: string;
  status: 'active' | 'inactive' | 'cancelled' | 'past_due';
  currentPeriodEnd?: Date;
}

export class UnifiedUserService {
  private static get isNewAuth(): boolean {
    return isNewAuthEnabled();
  }
  
  static async getUserTier(userId: string): Promise<UserTier> {
    if (this.isNewAuth) {
      return UserServiceV2.getUserTier(userId);
    } else {
      return UserService.getUserTier(userId);
    }
  }
  
  static async getUserSubscription(userId: string): Promise<UserSubscription> {
    if (this.isNewAuth) {
      return UserServiceV2.getUserSubscription(userId);
    } else {
      return UserService.getUserSubscription(userId);
    }
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
    if (this.isNewAuth) {
      return UserServiceV2.updateUserTier(userId, tier, subscriptionData);
    } else {
      return UserService.updateUserTier(userId, tier, subscriptionData);
    }
  }
  
  static async hasActiveSubscription(userId: string): Promise<boolean> {
    if (this.isNewAuth) {
      return UserServiceV2.hasActiveSubscription(userId);
    } else {
      return UserService.hasActiveSubscription(userId);
    }
  }
  
  static async getUserByEmail(email: string) {
    if (this.isNewAuth) {
      return UserServiceV2.getUserByEmail(email);
    } else {
      return UserService.getUserByEmail(email);
    }
  }
  
  static async updateUserSettings(
    userId: string,
    settings: { arenaApiKey?: string | null }
  ): Promise<void> {
    if (this.isNewAuth) {
      return UserServiceV2.updateUserSettings(userId, settings);
    } else {
      return UserService.updateUserSettings(userId, settings);
    }
  }
  
  static async getArenaApiKey(userId: string): Promise<string | null> {
    if (this.isNewAuth) {
      return UserServiceV2.getArenaApiKey(userId);
    } else {
      return UserService.getUserArenaApiKey(userId);
    }
  }
}