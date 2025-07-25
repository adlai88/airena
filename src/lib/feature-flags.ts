/**
 * Feature flag system for gradual migration from Clerk to Better Auth
 * This allows running both auth systems in parallel during migration
 */

export const useNewAuth = (): boolean => {
  return process.env.NEXT_PUBLIC_USE_BETTER_AUTH === 'true';
};

export const getAuthMode = (): 'clerk' | 'better-auth' => {
  return useNewAuth() ? 'better-auth' : 'clerk';
};

// Helper for logging during migration
export const logAuthMode = (context: string) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Auth Mode - ${getAuthMode()}] ${context}`);
  }
};