/**
 * Feature flag system for gradual migration from Clerk to Better Auth
 * This allows running both auth systems in parallel during migration
 */

export const isNewAuthEnabled = (): boolean => {
  return process.env.NEXT_PUBLIC_USE_BETTER_AUTH === 'true';
};

// For React components, use this hook
export const useNewAuth = (): boolean => {
  return isNewAuthEnabled();
};

export const getAuthMode = (): 'clerk' | 'better-auth' => {
  return isNewAuthEnabled() ? 'better-auth' : 'clerk';
};

// Helper for logging during migration
export const logAuthMode = (context: string) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Auth Mode - ${getAuthMode()}] ${context}`);
  }
};