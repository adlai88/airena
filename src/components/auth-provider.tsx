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
  
  if (isNewAuth) {
    const { data: session } = authClient.useSession();
    if (!session?.user) return null;
    
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
      arenaApiKey: session.user.arenaApiKey,
      tier: session.user.tier || 'free',
      polarCustomerId: session.user.polarCustomerId
    };
  } else {
    const clerkUser = useClerkUser();
    if (!clerkUser.user) return null;
    
    const metadata = clerkUser.user.privateMetadata as any || {};
    
    return {
      id: clerkUser.user.id,
      email: clerkUser.user.emailAddresses?.[0]?.emailAddress,
      name: `${clerkUser.user.firstName || ''} ${clerkUser.user.lastName || ''}`.trim() || null,
      image: clerkUser.user.imageUrl,
      arenaApiKey: metadata.arenaApiKey,
      tier: metadata.subscriptionTier || 'free',
      polarCustomerId: metadata.polarCustomerId
    };
  }
}

/**
 * Unified useAuth hook that works with both Clerk and Better Auth
 * Returns consistent AuthState interface regardless of auth provider
 */
export function useAuth(): AuthState {
  const isNewAuth = useNewAuth();
  
  if (isNewAuth) {
    const { data: session, isPending } = authClient.useSession();
    
    return {
      userId: session?.user?.id,
      isSignedIn: !!session,
      isLoaded: !isPending
    };
  } else {
    const clerkAuth = useClerkAuth();
    
    return {
      userId: clerkAuth.userId,
      isSignedIn: clerkAuth.isSignedIn || false,
      isLoaded: clerkAuth.isLoaded
    };
  }
}

/**
 * Sign out function that works with both auth providers
 */
export async function signOut() {
  const isNewAuth = useNewAuth();
  
  if (isNewAuth) {
    await authClient.signOut();
  } else {
    const { signOut: clerkSignOut } = useClerkAuth();
    await clerkSignOut();
  }
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