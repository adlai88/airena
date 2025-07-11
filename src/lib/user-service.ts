import { clerkClient } from '@clerk/nextjs/server';
import { UserTier } from './usage-tracking';

export interface UserSubscription {
  tier: UserTier;
  polarCustomerId?: string;
  subscriptionId?: string;
  status: 'active' | 'inactive' | 'cancelled' | 'past_due';
  currentPeriodEnd?: Date;
}

export class UserService {
  /**
   * Get user subscription tier from Clerk metadata
   */
  static async getUserTier(userId: string): Promise<UserTier> {
    try {
      const user = await (await clerkClient()).users.getUser(userId);
      const privateMetadata = user.privateMetadata as Record<string, unknown>;
      
      // Check for subscription tier in private metadata
      const tier = privateMetadata?.subscriptionTier as UserTier;
      return tier || 'free';
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
      const user = await (await clerkClient()).users.getUser(userId);
      const privateMetadata = user.privateMetadata as Record<string, unknown>;
      
      return {
        tier: (privateMetadata?.subscriptionTier as UserTier) || 'free',
        polarCustomerId: privateMetadata?.polarCustomerId as string,
        subscriptionId: privateMetadata?.subscriptionId as string,
        status: (privateMetadata?.subscriptionStatus as 'active' | 'inactive' | 'cancelled' | 'past_due') || 'inactive',
        currentPeriodEnd: privateMetadata?.currentPeriodEnd 
          ? new Date(privateMetadata.currentPeriodEnd as string)
          : undefined
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
   * Update user subscription tier
   */
  static async updateUserTier(
    userId: string,
    tier: UserTier,
    subscriptionData?: {
      polarCustomerId?: string;
      subscriptionId?: string;
      status?: string;
      currentPeriodEnd?: Date;
    }
  ): Promise<void> {
    try {
      const updateData: Record<string, unknown> = {
        subscriptionTier: tier,
        subscriptionStatus: subscriptionData?.status || 'active',
        updatedAt: new Date().toISOString()
      };

      if (subscriptionData?.polarCustomerId) {
        updateData.polarCustomerId = subscriptionData.polarCustomerId;
      }

      if (subscriptionData?.subscriptionId) {
        updateData.subscriptionId = subscriptionData.subscriptionId;
      }

      if (subscriptionData?.currentPeriodEnd) {
        updateData.currentPeriodEnd = subscriptionData.currentPeriodEnd.toISOString();
      }

      await (await clerkClient()).users.updateUserMetadata(userId, {
        privateMetadata: updateData
      });
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
  static async getUserByEmail(email: string) {
    try {
      const users = await (await clerkClient()).users.getUserList({
        emailAddress: [email]
      });
      
      return users.data[0] || null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }
}