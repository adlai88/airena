# Clerk to Better Auth + Polar Migration Plan (Supabase Edition) ✅ COMPLETED

## Overview

This document outlines the migration strategy from Clerk + Polar to Better Auth + Polar using your existing Supabase database.

**Status**: ✅ Successfully completed on July 25, 2025

**Key Advantage**: You already have Supabase set up, so we'll use it for Better Auth's database needs instead of adding Prisma.

## Completion Summary

### What Was Completed ✅
1. **Better Auth Tables Created** - Added user, session, account, and verification tables with proper snake_case field mappings
2. **Auth Configuration** - Set up Better Auth with Supabase adapter and Polar integration
3. **Middleware Updated** - Replaced Clerk middleware with Better Auth, maintaining anonymous access
4. **User Migration** - Successfully migrated existing user from Clerk to Better Auth
5. **API Routes Updated** - Critical routes (sync, user-settings) now support both auth systems via feature flag
6. **Anonymous Sync Fixed** - Removed user_id NOT NULL constraint to allow anonymous channel syncing
7. **Polar Integration** - Unified auth/billing working with webhooks and customer portal
8. **Route Rename** - Changed /setup to /channels for better clarity

### Key Deviations from Original Plan ✅
1. **Preserved Anonymous Access** - Instead of requiring auth for all users, maintained "no signup required" functionality
2. **Better Auth Instead of Polar Auth** - Used Better Auth framework with Polar plugin for more flexibility
3. **Feature Flag Approach** - Implemented gradual migration with NEXT_PUBLIC_USE_BETTER_AUTH flag
4. **Singular Table Names** - Used singular names (user, session) instead of plural for Better Auth compatibility

### Remaining Cleanup Tasks (Low Priority) 🔧
- Update remaining API routes to Better Auth
- Remove Clerk webhook endpoint
- Remove Clerk dependencies from package.json
- Clean up Clerk environment variables

### Lessons Learned 📚
1. **Database Constraints Matter** - The user_id NOT NULL check prevented anonymous syncing
2. **Field Mapping Required** - Better Auth uses camelCase, Supabase uses snake_case
3. **Edge Runtime Limitations** - Direct auth imports don't work in middleware
4. **Dynamic Origins** - Use window.location.origin for auth client configuration

## Prerequisites

### 1. Create Users Table in Supabase
```sql
-- Add users table to your existing Supabase database
CREATE TABLE users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    name TEXT,
    image TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Custom fields from your current setup
    arena_api_key TEXT,
    tier TEXT DEFAULT 'free',
    polar_customer_id TEXT,
    
    -- Fields for Better Auth
    password_hash TEXT
);

-- Create sessions table for Better Auth
CREATE TABLE sessions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create accounts table for OAuth providers (if needed later)
CREATE TABLE accounts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);

-- Update channels table to reference new users table
-- First, add a new column for the new user ID
ALTER TABLE channels ADD COLUMN new_user_id TEXT REFERENCES users(id);

-- Note: We'll migrate data later, keeping user_id column for now
```

### 2. Package Installation
```bash
# Remove Clerk packages
npm uninstall @clerk/nextjs @clerk/themes

# Install Better Auth with Supabase adapter
npm install better-auth @better-auth/adapter-supabase @polar-sh/better-auth @polar-sh/sdk
```

## Phase 1: Better Auth Setup with Supabase

### 1.1 Create Auth Configuration
Create `src/lib/auth.ts`:
```typescript
import { betterAuth } from "better-auth";
import { supabaseAdapter } from "@better-auth/adapter-supabase";
import { polar, checkout, portal, usage, webhooks } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { createClient } from '@supabase/supabase-js';

// Use your existing Supabase client configuration
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role for auth operations
);

const polarClient = new Polar({
  accessToken: process.env.POLAR_API_KEY!,
  server: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'
});

export const auth = betterAuth({
  database: supabaseAdapter(supabase),
  
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false // Simplify migration
  },
  
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24 // Update every 24 hours
  },
  
  // Add custom user fields
  user: {
    additionalFields: {
      arenaApiKey: {
        type: "string",
        required: false
      },
      tier: {
        type: "string", 
        defaultValue: "free",
        required: false
      },
      polarCustomerId: {
        type: "string",
        required: false
      }
    }
  },
  
  plugins: [
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      use: [
        checkout({
          products: [
            {
              productId: "2d078db5-1c02-43ae-bf7a-8b763fd26140",
              slug: "starter-monthly"
            },
            {
              productId: "3fff0f35-d90b-4f2d-bad9-6901128e5f28", 
              slug: "starter-annual"
            },
            {
              productId: "bda6be16-5294-4b12-8973-6ccdd0bf05e7",
              slug: "pro-monthly"
            },
            {
              productId: "dc8f5557-4783-4226-970a-7e1f200a1f8c",
              slug: "pro-annual"
            }
          ],
          successUrl: "/channels?checkout_success=true",
          authenticatedUsersOnly: true
        }),
        
        portal(),
        
        usage(), // For block tracking
        
        webhooks({
          secret: process.env.POLAR_WEBHOOK_SECRET!,
          onSubscriptionCreated: async (payload) => {
            // Update user tier in Supabase
            const userId = payload.customer.metadata?.userId;
            if (userId) {
              await supabase
                .from('users')
                .update({ 
                  tier: determineTierFromProduct(payload.subscription.product_id),
                  polar_customer_id: payload.customer.id
                })
                .eq('id', userId);
            }
          },
          onSubscriptionCanceled: async (payload) => {
            // Downgrade to free
            const userId = payload.customer.metadata?.userId;
            if (userId) {
              await supabase
                .from('users')
                .update({ tier: 'free' })
                .eq('id', userId);
            }
          }
        })
      ]
    })
  ]
});

// Helper function to determine tier from product ID
function determineTierFromProduct(productId: string): string {
  const tierMap: Record<string, string> = {
    '2d078db5-1c02-43ae-bf7a-8b763fd26140': 'starter',
    '3fff0f35-d90b-4f2d-bad9-6901128e5f28': 'starter',
    'bda6be16-5294-4b12-8973-6ccdd0bf05e7': 'pro',
    'dc8f5557-4783-4226-970a-7e1f200a1f8c': 'pro'
  };
  return tierMap[productId] || 'free';
}
```

### 1.2 Create Auth API Route
Create `src/app/api/auth/[...all]/route.ts`:
```typescript
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

## Phase 2: Update User Service for Supabase

### 2.1 Create New User Service
Create `src/lib/user-service-v2.ts`:
```typescript
import { createClient } from '@/lib/supabase/server';

export class UserServiceV2 {
  static async getUserTier(userId: string) {
    const supabase = createClient();
    const { data: user } = await supabase
      .from('users')
      .select('tier')
      .eq('id', userId)
      .single();
    
    return user?.tier || 'free';
  }
  
  static async updateUserTier(
    userId: string, 
    tier: string,
    metadata?: {
      polarCustomerId?: string;
      subscriptionId?: string;
      status?: string;
    }
  ) {
    const supabase = createClient();
    const updateData: any = { tier };
    
    if (metadata?.polarCustomerId) {
      updateData.polar_customer_id = metadata.polarCustomerId;
    }
    
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId);
    
    if (error) throw error;
    return data;
  }
  
  static async getArenaApiKey(userId: string) {
    const supabase = createClient();
    const { data: user } = await supabase
      .from('users')
      .select('arena_api_key')
      .eq('id', userId)
      .single();
    
    return user?.arena_api_key;
  }
  
  static async setArenaApiKey(userId: string, apiKey: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('users')
      .update({ arena_api_key: apiKey })
      .eq('id', userId);
    
    if (error) throw error;
    return data;
  }
  
  static async getUserByEmail(email: string) {
    const supabase = createClient();
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    return user;
  }
}
```

## Phase 3: Component Updates

### 3.1 Auth Provider
Create `src/components/auth-provider.tsx`:
```typescript
'use client';

import { createAuthClient } from "better-auth/react";
import { polarClient } from "@polar-sh/better-auth";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  plugins: [polarClient()]
});

// Custom hooks
export function useUser() {
  const { data: session } = authClient.useSession();
  return session?.user || null;
}

export function useAuth() {
  const { data: session } = authClient.useSession();
  return {
    userId: session?.user.id,
    isSignedIn: !!session,
    isLoaded: true // For compatibility with Clerk patterns
  };
}
```

### 3.2 Update Middleware
Replace `src/middleware.ts`:
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  // Check session using Better Auth
  const session = await auth.api.getSession({
    headers: request.headers
  });
  
  // Define protected routes
  const protectedPaths = ['/channels', '/generate', '/usage', '/settings'];
  const authPaths = ['/sign-in', '/sign-up'];
  
  const pathname = request.nextUrl.pathname;
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
  const isAuthPath = authPaths.some(path => pathname.startsWith(path));
  
  // Redirect to sign-in if accessing protected route without session
  if (isProtectedPath && !session) {
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('redirect_url', pathname);
    return NextResponse.redirect(signInUrl);
  }
  
  // Redirect to channels if accessing auth routes with session
  if (isAuthPath && session) {
    return NextResponse.redirect(new URL('/channels', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

## Phase 4: Data Migration Script

### 4.1 Export and Import User Data
Create `scripts/migrate-users.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';
import { clerkClient } from '@clerk/nextjs/server';
import * as bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function migrateUsers() {
  console.log('Starting user migration from Clerk to Supabase...');
  
  // Step 1: Get all users from Clerk
  const clerkUsers = await clerkClient.users.getUserList();
  console.log(`Found ${clerkUsers.length} users in Clerk`);
  
  for (const clerkUser of clerkUsers) {
    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) continue;
    
    // Generate temporary password (user will need to reset)
    const tempPassword = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    
    // Extract metadata
    const metadata = clerkUser.privateMetadata as any;
    
    // Step 2: Create user in Supabase
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email,
        email_verified: true,
        name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
        image: clerkUser.imageUrl,
        arena_api_key: metadata.arenaApiKey,
        tier: metadata.subscriptionTier || 'free',
        polar_customer_id: metadata.polarCustomerId,
        password_hash: passwordHash,
        created_at: new Date(clerkUser.createdAt),
      })
      .select()
      .single();
    
    if (error) {
      console.error(`Failed to migrate user ${email}:`, error);
      continue;
    }
    
    console.log(`Migrated user: ${email} with ID: ${newUser.id}`);
    
    // Step 3: Update channels ownership
    const { error: channelError } = await supabase
      .from('channels')
      .update({ new_user_id: newUser.id })
      .eq('user_id', clerkUser.id);
    
    if (channelError) {
      console.error(`Failed to update channels for user ${email}:`, channelError);
    }
    
    // Store the password reset link info
    console.log(`User ${email} will need to reset password`);
    console.log(`Temporary password: ${tempPassword}`);
  }
  
  console.log('Migration complete!');
}

// Run migration
migrateUsers().catch(console.error);
```

### 4.2 Update Database After Migration
```sql
-- After successful migration, update the channels table
UPDATE channels 
SET user_id = new_user_id 
WHERE new_user_id IS NOT NULL;

-- Then drop the temporary column
ALTER TABLE channels DROP COLUMN new_user_id;

-- Update any other tables that reference user_id
UPDATE channel_usage SET user_id = (SELECT id FROM users WHERE email = 'your-user@email.com');
UPDATE monthly_usage SET user_id = (SELECT id FROM users WHERE email = 'your-user@email.com');
```

## Phase 5: API Route Updates

### 5.1 Update Authentication Checks
Example for `src/app/api/sync/route.ts`:
```typescript
// Before (Clerk)
import { auth } from '@clerk/nextjs/server';
const { userId } = await auth();

// After (Better Auth)
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

const session = await auth.api.getSession({
  headers: headers()
});
const userId = session?.user.id;

// Handle anonymous users (your current bug)
if (!userId) {
  // For sync, you might want to allow anonymous with session ID
  const sessionId = request.headers.get('x-session-id');
  if (sessionId) {
    // Handle anonymous sync with session-based tracking
  }
}
```

### 5.2 Simplify Checkout API
`src/app/api/checkout/route.ts`:
```typescript
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: headers()
  });
  
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { productSlug } = await request.json();
  
  // Better Auth + Polar handles the checkout
  // Just return the checkout URL
  return Response.json({
    checkoutUrl: `/api/auth/checkout?slug=${productSlug}`
  });
}
```

## Phase 6: Critical Updates Based on Review

### 6.1 Enhanced Webhook Handling
Based on the current complex webhook implementation, update the Better Auth webhook handler:

```typescript
// src/lib/auth.ts - Enhanced webhook configuration
webhooks({
  secret: process.env.POLAR_WEBHOOK_SECRET!,
  onSubscriptionCreated: async (payload) => {
    // Extract userId from multiple possible locations (like current implementation)
    const userId = payload.customer?.metadata?.userId || 
                  payload.metadata?.userId || 
                  payload.customer_metadata?.userId;
    
    if (!userId) {
      console.error('No userId found in webhook payload');
      return;
    }
    
    const tier = determineTierFromProduct(payload.subscription.product_id);
    
    // Update user in Supabase
    await supabase
      .from('users')
      .update({ 
        tier,
        polar_customer_id: payload.customer.id
      })
      .eq('id', userId);
  },
  // Similar handlers for other events...
})
```

### 6.2 API Routes Requiring Updates
Complete list of routes that need migration from Clerk auth:

```typescript
// Routes with mandatory auth (must update)
- /api/checkout/route.ts           // Creates checkout sessions
- /api/customer-portal/route.ts    // Customer portal access
- /api/user-settings/route.ts      // Are.na API key management
- /api/force-tier-update/route.ts  // Admin tier updates
- /api/usage-stats/route.ts        // User usage statistics

// Routes with optional auth (need careful handling)
- /api/sync/route.ts              // Allows anonymous, tracks by session
- /api/chat/route.ts              // Falls back to session-based limits
- /api/generate/route.ts          // Uses tier for generation limits
- /api/user-tier/route.ts         // Returns 'free' if not authenticated
- /api/recent-channels/route.ts   // Filters by user or session
- /api/channel-limits/route.ts    // Checks user limits

// Routes needing UserService updates
- /api/webhooks/clerk/route.ts    // Remove entirely
- /api/webhooks/polar/route.ts    // Update to work with Better Auth
```

### 6.3 Feature Flag Implementation

Add feature flags for safer migration:

```typescript
// src/lib/feature-flags.ts
export const useNewAuth = () => {
  return process.env.NEXT_PUBLIC_USE_BETTER_AUTH === 'true';
};

// In components
import { useAuth as useClerkAuth } from '@clerk/nextjs';
import { useAuth as useBetterAuth } from '@/components/auth-provider';
import { useNewAuth } from '@/lib/feature-flags';

export function useAuth() {
  const isNewAuth = useNewAuth();
  const clerkAuth = useClerkAuth();
  const betterAuth = useBetterAuth();
  
  if (isNewAuth) {
    return {
      userId: betterAuth.userId,
      isSignedIn: betterAuth.isSignedIn,
      isLoaded: true
    };
  }
  
  return clerkAuth;
}
```

### 6.4 Anonymous User Transition Strategy

Handle the transition for anonymous sessions:

```typescript
// src/app/api/sync/route.ts - Updated for Better Auth
export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: headers()
  });
  
  let userId = session?.user.id;
  let sessionId = request.headers.get('x-session-id');
  
  // Support anonymous syncing during transition
  if (!userId && sessionId) {
    // Check if this session has been migrated
    const { data: migrationCheck } = await supabase
      .from('session_migrations')
      .select('new_user_id')
      .eq('old_session_id', sessionId)
      .single();
    
    if (migrationCheck?.new_user_id) {
      userId = migrationCheck.new_user_id;
    } else {
      // Continue with session-based tracking
      // Prompt user to create account for better experience
    }
  }
  
  // Rest of sync logic...
}
```

### 6.5 Webhook Integration Testing Strategy

Comprehensive webhook testing plan:

```typescript
// scripts/test-webhooks.ts
import { auth } from '@/lib/auth';

const webhookTestCases = [
  {
    name: 'Subscription Created',
    payload: {
      type: 'subscription.created',
      data: {
        customer_id: 'test_customer',
        product_id: '2d078db5-1c02-43ae-bf7a-8b763fd26140', // Starter
        customer: {
          metadata: { userId: 'test_user_id' }
        }
      }
    }
  },
  // Add test cases for each webhook type
];

async function testWebhooks() {
  for (const testCase of webhookTestCases) {
    console.log(`Testing: ${testCase.name}`);
    
    const response = await fetch('http://localhost:3000/api/webhooks/polar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'polar-signature': 'test_signature'
      },
      body: JSON.stringify(testCase.payload)
    });
    
    console.log(`Result: ${response.status}`);
  }
}
```

## Phase 7: Updated Testing Checklist

### Webhook Testing
- [ ] Test userId extraction from all metadata locations
- [ ] Verify tier determination from product IDs
- [ ] Test all webhook event types (created, updated, canceled, etc.)
- [ ] Confirm signature verification works
- [ ] Test error handling for missing userId

### API Route Testing
- [ ] Test all routes with mandatory auth
- [ ] Verify anonymous sync still works
- [ ] Check session-based fallbacks
- [ ] Confirm UserService calls are updated
- [ ] Test feature flag switching

### Migration Testing
- [ ] Export Clerk user data successfully
- [ ] Import creates user in Supabase
- [ ] Channels ownership transfers correctly
- [ ] Subscription tier preserved
- [ ] Polar customer ID maintained
- [ ] Are.na API key migrated
- [ ] Anonymous sessions handled gracefully

## Key Differences from Original Plan

1. **No Prisma needed** - Using Supabase directly with Better Auth's Supabase adapter
2. **Leverages existing database** - Just adds users/sessions/accounts tables
3. **Simpler configuration** - Uses your existing Supabase client setup
4. **Direct Supabase queries** - UserService uses Supabase client, not Prisma

## Benefits of This Approach

1. **No new dependencies** - Uses your existing Supabase setup
2. **Consistent data layer** - Everything in Supabase
3. **Better performance** - Direct Supabase queries
4. **Easier deployment** - No Prisma migrations to manage
5. **Unified authentication** - Supabase + Better Auth work well together

## Updated Timeline with Feature Flag Approach

### Week 1: Foundation & Parallel Setup
- **Day 1-2**: Set up Better Auth with Supabase tables
- **Day 3**: Implement feature flag system
- **Day 4-5**: Create Better Auth components alongside Clerk

### Week 2: Gradual Migration
- **Day 6-7**: Update API routes with dual auth support
- **Day 8**: Migrate single user data, test thoroughly
- **Day 9-10**: Switch feature flag, monitor, fix issues

### Benefits of Feature Flag Approach:
1. **Zero downtime** - Both systems run in parallel
2. **Instant rollback** - Just flip the flag if issues arise
3. **Gradual testing** - Test with your account before full switch
4. **Safer deployment** - No "big bang" migration

**Total**: ~10 days with safer, more controlled migration