import { auth as betterAuth } from '@/lib/auth';
import { headers } from 'next/headers';

/**
 * Helper function to get the current user ID from Better Auth
 * Returns null if not authenticated
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const session = await betterAuth.api.getSession({
      headers: headers()
    });
    return session?.user?.id || null;
  } catch (error) {
    console.error('Error getting user session:', error);
    return null;
  }
}

/**
 * Helper function to require authentication
 * Throws an error if not authenticated
 */
export async function requireAuth(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error('Authentication required');
  }
  return userId;
}