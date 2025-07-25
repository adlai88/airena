# Clerk Cleanup TODO

This document tracks the remaining Clerk imports and code that need to be cleaned up after the migration to Better Auth is complete.

## Status
- **Migration Complete**: ✅ Better Auth is fully functional
- **Critical Path Clear**: ✅ Build succeeds without Clerk dependencies
- **Feature Flag Active**: ✅ `NEXT_PUBLIC_USE_BETTER_AUTH=true`

## Remaining Clerk Code Locations

### 1. Components with Conditional Clerk Usage
These components still import Clerk but use feature flags to conditionally use Better Auth:

- `/src/components/auth-provider.tsx` - Contains `useClerkUser` and `useClerkAuth` imports
- `/src/components/navigation.tsx` - Imports `ClerkUserButton`, `SignInButton`, `SignUpButton`
- `/src/components/hamburger-menu.tsx` - Imports Clerk components for mobile navigation
- `/src/components/better-auth-user-button.tsx` - Contains `useClerkAuth` import

### 2. API Routes with Conditional Auth
These API routes still have Clerk imports but check the feature flag:

- `/src/app/api/user-settings/route.ts`
- `/src/app/api/chat/route.ts`
- `/src/app/api/user-tier/route.ts`
- `/src/app/api/large-channel-check/route.ts`
- `/src/app/api/channel-limits/route.ts`
- `/src/app/api/usage-stats/route.ts`
- `/src/app/api/generate/route.ts`
- `/src/app/api/checkout/route.ts` (also imports `clerkClient`)
- `/src/app/api/sync/route.ts`
- `/src/app/api/force-tier-update/route.ts`
- `/src/app/api/customer-portal/route.ts` (also imports `clerkClient`)

### 3. Service Files
- `/src/lib/user-service.ts` - Imports `clerkClient` from server

## Cleanup Tasks

### Phase 1: Remove Conditional Logic from Components
1. Remove all Clerk imports from components
2. Remove `useNewAuth()` checks
3. Simplify components to only use Better Auth

### Phase 2: Clean Up API Routes
1. Remove Clerk auth imports
2. Remove conditional auth checks
3. Ensure all routes use Better Auth session handling

### Phase 3: Clean Up Services
1. Update `user-service.ts` to remove Clerk client
2. Remove the entire `UserService` class (Clerk version)
3. Rename `UserServiceV2` to `UserService`

### Phase 4: Final Cleanup
1. Remove `useNewAuth` hook from `/src/lib/feature-flags.ts`
2. Remove `NEXT_PUBLIC_USE_BETTER_AUTH` environment variable
3. Update `user-service-unified.ts` to directly use Better Auth service

## Environment Variables to Remove

After all code cleanup is complete, remove these from all environments:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
CLERK_WEBHOOK_SECRET
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL
NEXT_PUBLIC_USE_BETTER_AUTH (after cleanup)
```

## Notes

- All critical paths have been cleared - the app builds and runs without Clerk
- The remaining code is safely behind feature flags
- This cleanup can be done incrementally without breaking functionality
- Consider doing this cleanup after confirming Better Auth is stable in production