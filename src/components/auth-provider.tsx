'use client';

import { createAuthClient } from "better-auth/react";
import { polarClient } from "@polar-sh/better-auth";
import { useUser as useClerkUser, useAuth as useClerkAuth } from '@clerk/nextjs';
import { useNewAuth } from '@/lib/feature-flags';

// Create Better Auth client
// Always use window.location.origin in browser for local development
const baseURL = typeof window !== 'undefined' 
  ? window.location.origin 
  : "http://localhost:3000";

// Only include Polar plugin if we have a valid API key
const plugins = process.env.NEXT_PUBLIC_POLAR_ENABLED === 'true' ? [polarClient()] : [];

export const authClient = createAuthClient({
  baseURL: baseURL,
  basePath: "/api/auth",
  plugins
});

// Type definitions for consistency
export interface User {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  arenaApiKey?: string | null;
  tier?: string;
  polarCustomerId?: string | null;
}

export interface AuthState {
  userId?: string | null;
  isSignedIn: boolean;
  isLoaded: boolean;
}

/**
 * Unified useUser hook that works with both Clerk and Better Auth
 * Returns consistent User interface regardless of auth provider
 */
export function useUser(): User | null {
  const isNewAuth = useNewAuth();
  const { data: session } = authClient.useSession();
  const clerkUser = useClerkUser();
  
  if (isNewAuth) {
    if (!session?.user) return null;
    
    // Cast to include our custom fields
    const userWithCustomFields = session.user as typeof session.user & {
      arenaApiKey?: string | null;
      tier?: string;
      polarCustomerId?: string | null;
    };
    
    return {
      id: userWithCustomFields.id,
      email: userWithCustomFields.email,
      name: userWithCustomFields.name,
      image: userWithCustomFields.image,
      arenaApiKey: userWithCustomFields.arenaApiKey,
      tier: userWithCustomFields.tier || 'free',
      polarCustomerId: userWithCustomFields.polarCustomerId
    };
  } else {
    if (!clerkUser.user) return null;
    
    // Clerk client-side user object may have privateMetadata or unsafeMetadata
    const userWithMetadata = clerkUser.user as typeof clerkUser.user & { 
      privateMetadata?: Record<string, unknown>;
    };
    const metadata = userWithMetadata.privateMetadata || clerkUser.user.unsafeMetadata || {};
    
    return {
      id: clerkUser.user.id,
      email: clerkUser.user.emailAddresses?.[0]?.emailAddress,
      name: `${clerkUser.user.firstName || ''} ${clerkUser.user.lastName || ''}`.trim() || null,
      image: clerkUser.user.imageUrl,
      arenaApiKey: metadata.arenaApiKey as string | undefined,
      tier: (metadata.subscriptionTier as string) || 'free',
      polarCustomerId: metadata.polarCustomerId as string | undefined
    };
  }
}

/**
 * Unified useAuth hook that works with both Clerk and Better Auth
 * Returns consistent AuthState interface regardless of auth provider
 */
export function useAuth(): AuthState {
  const isNewAuth = useNewAuth();
  const { data: session, isPending } = authClient.useSession();
  const clerkAuth = useClerkAuth();
  
  if (isNewAuth) {
    return {
      userId: session?.user?.id,
      isSignedIn: !!session,
      isLoaded: !isPending
    };
  } else {
    return {
      userId: clerkAuth.userId,
      isSignedIn: clerkAuth.isSignedIn || false,
      isLoaded: clerkAuth.isLoaded
    };
  }
}

/**
 * Get sign out function based on auth provider
 * This returns a function rather than being a hook itself
 */
export function getSignOutFunction(isNewAuth: boolean, clerkSignOut?: () => Promise<void>) {
  if (isNewAuth) {
    return () => authClient.signOut();
  } else if (clerkSignOut) {
    return clerkSignOut;
  }
  return async () => { console.warn('No sign out function available'); };
}

/**
 * Provider component for Better Auth
 * Only renders when Better Auth is enabled
 */
export function BetterAuthProvider({ children }: { children: React.ReactNode }) {
  // Better Auth client is already initialized above
  // This component is mainly for future extensions if needed
  return <>{children}</>;
}