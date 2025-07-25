'use client';

import { createAuthClient } from "better-auth/react";
import { polarClient } from "@polar-sh/better-auth";

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
 * Unified useUser hook that uses Better Auth
 * Returns consistent User interface
 */
export function useUser(): User | null {
  const { data: session } = authClient.useSession();
  
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
}

/**
 * Unified useAuth hook that uses Better Auth
 * Returns consistent auth state
 */
export function useAuth(): AuthState {
  const { data: session, isPending } = authClient.useSession();
  
  return {
    userId: session?.user?.id || null,
    isSignedIn: !!session?.user,
    isLoaded: !isPending
  };
}