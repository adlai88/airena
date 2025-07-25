# Clerk Cleanup TODO

This document tracks the remaining Clerk imports and code that need to be cleaned up after the migration to Better Auth is complete.

## Status
- **Migration Complete**: ✅ Better Auth is fully functional
- **Critical Path Clear**: ✅ Build succeeds without Clerk dependencies
- **Feature Flag Active**: ✅ `NEXT_PUBLIC_USE_BETTER_AUTH=true`
- **Package.json Cleaned**: ✅ Clerk dependencies removed
- **Critical Routes Fixed**: ✅ Build-blocking routes updated (July 25, 2025)

## Completed Cleanup (July 25, 2025)

### ✅ Components Fixed
- `/src/components/auth-provider.tsx` - Removed conditional Clerk imports
- `/src/components/navigation.tsx` - Removed Clerk components, using BetterAuthUserButton
- `/src/components/hamburger-menu.tsx` - Removed Clerk components
- `/src/components/better-auth-user-button.tsx` - Removed `useClerkAuth` import

### ✅ Critical API Routes Fixed (Build-blocking)
- `/src/app/api/chat/route.ts` - Migrated to Better Auth
- `/src/app/api/checkout/route.ts` - Migrated to Better Auth
- `/src/app/api/customer-portal/route.ts` - Migrated to Better Auth
- `/src/app/api/force-tier-update/route.ts` - Migrated to Better Auth
- `/src/app/api/generate/route.ts` - Migrated to Better Auth
- `/src/app/api/channel-limits/route.ts` - Migrated to Better Auth

### ✅ Other Cleanup
- Removed `/src/app/api/webhooks/clerk/route.ts`
- Removed Clerk dependencies from package.json
- Fixed sign-in/sign-up pages
- Fixed layout.tsx (removed ClerkProvider)

## Remaining Clerk Code Locations

### 1. Non-Critical API Routes
These API routes still have Clerk imports but weren't blocking the build:

- `/src/app/api/user-settings/route.ts`
- `/src/app/api/user-tier/route.ts`
- `/src/app/api/large-channel-check/route.ts`
- `/src/app/api/usage-stats/route.ts`
- `/src/app/api/sync/route.ts`

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