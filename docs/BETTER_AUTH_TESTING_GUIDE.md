# Better Auth Testing Guide

## ✅ Setup Checklist

Before testing, ensure you have:

1. **Run the database migration**
   ```sql
   -- In Supabase SQL editor, run:
   -- supabase/migrations/20250725_add_better_auth_tables.sql
   ```

2. **Installed packages**
   ```bash
   npm install better-auth @polar-sh/better-auth @polar-sh/sdk pg @types/pg bcryptjs @types/bcryptjs
   ```

3. **Updated `.env.local`**
   ```env
   # Keep Better Auth disabled initially
   NEXT_PUBLIC_USE_BETTER_AUTH=false
   
   # Better Auth configuration
   BETTER_AUTH_SECRET=h0nyoEkjbD1Z9BwxZ5HM9hazwPPJjGSs4gDIf0/d0m0=
   BETTER_AUTH_URL=http://localhost:3000
   
   # Make sure you have SUPABASE_SERVICE_ROLE_KEY set
   ```

## 🧪 Phase 1: Test with Clerk (Better Auth Disabled)

1. **Start the dev server**
   ```bash
   npm run dev
   ```

2. **Visit test page**: http://localhost:3000/test-auth
   - Should show "Auth Mode: clerk"
   - Verify existing Clerk auth still works

3. **Test normal flow**
   - Sign in with your existing Clerk account
   - Navigate to channels, chat, generate
   - Everything should work as before

## 🚀 Phase 2: Enable Better Auth

1. **Update `.env.local`**
   ```env
   NEXT_PUBLIC_USE_BETTER_AUTH=true
   ```

2. **Restart the server**
   ```bash
   # Ctrl+C to stop, then:
   npm run dev
   ```

3. **Visit test page**: http://localhost:3000/test-auth
   - Should now show "Auth Mode: better-auth"
   - Check that database tables exist
   - Verify environment variables are set

## 🔐 Phase 3: Test Authentication Flow

### Test Sign Up
1. **Visit**: http://localhost:3000/sign-up
2. **Create a test account**:
   - Use a different email than your Clerk account
   - Password must be 8+ characters
3. **After signup**:
   - Should auto sign in
   - Redirect to /channels
   - Check user appears in Supabase users table

### Test Sign In
1. **Sign out** (click avatar → Sign out)
2. **Visit**: http://localhost:3000/sign-in
3. **Sign in** with test account
4. **Verify**:
   - Session persists on refresh
   - Protected routes work (/channels, /generate, etc.)

### Test Protected Routes
1. **While signed out**, try visiting:
   - /channels → Should redirect to /sign-in
   - /generate → Should redirect to /sign-in
   - /usage → Should redirect to /sign-in

2. **While signed in**, verify access to all protected routes

## 🔄 Phase 4: Migrate Your Existing User

1. **Switch back to Clerk temporarily**
   ```env
   NEXT_PUBLIC_USE_BETTER_AUTH=false
   ```
   Restart server

2. **Run migration script**
   ```bash
   npx tsx scripts/migrate-clerk-to-better-auth.ts
   ```
   
   This will:
   - Export your user from Clerk
   - Create user in Better Auth database
   - Generate temporary password
   - Update channel ownership

3. **Switch back to Better Auth**
   ```env
   NEXT_PUBLIC_USE_BETTER_AUTH=true
   ```
   Restart server

4. **Reset your password**
   - The migration script shows a temporary password
   - Sign in with your email and temp password
   - You'll need to implement password reset later

## 🧩 Phase 5: Test Integration Features

### Test Polar Integration
1. **Check subscription tier**:
   - Visit /test-auth
   - User details should show correct tier

2. **Test checkout** (if on free tier):
   - Visit /pricing
   - Click subscribe
   - Should open Polar checkout

3. **Test customer portal** (if subscribed):
   - Click avatar → should see "Billing Portal"
   - Should open Polar customer portal

### Test Are.na Integration
1. **Visit /settings**
2. **Add Are.na API key**
3. **Sync a private channel**
4. **Verify it works with Better Auth session**

## 🐛 Common Issues & Solutions

### "Invalid email or password"
- Check email is correct
- Password is case-sensitive
- For migrated users, use temporary password from migration script

### Session not persisting
- Check BETTER_AUTH_SECRET is set
- Clear cookies and try again
- Check browser console for errors

### Middleware not protecting routes
- Ensure server was restarted after env change
- Check middleware.ts is using correct auth mode
- Verify NEXT_PUBLIC_USE_BETTER_AUTH value

### Database connection errors
- Verify DATABASE_URL is correct
- Check SUPABASE_SERVICE_ROLE_KEY is set
- Ensure migration was run successfully

## 📊 Verification Checklist

- [ ] Can create new account with Better Auth
- [ ] Can sign in/out successfully
- [ ] Session persists across page refreshes
- [ ] Protected routes redirect when signed out
- [ ] Navigation shows correct auth state
- [ ] UserButton dropdown works
- [ ] Existing Clerk user was migrated
- [ ] Channels still associated with user
- [ ] Polar subscription tier is correct
- [ ] Can access customer portal (if subscribed)

## 🎯 Next Steps

Once everything is verified:

1. **Run cleanup script** (optional):
   ```bash
   npx tsx scripts/cleanup-after-migration.ts
   ```

2. **Remove Clerk code** (when ready):
   - Uninstall @clerk packages
   - Delete Clerk-specific components
   - Remove Clerk env variables
   - Update documentation

3. **Implement additional features**:
   - Password reset flow
   - Email verification
   - OAuth providers (GitHub, Google, etc.)

## 🚨 Rollback Plan

If something goes wrong:

1. **Set in `.env.local`**:
   ```env
   NEXT_PUBLIC_USE_BETTER_AUTH=false
   ```

2. **Restart server**

3. **Everything returns to Clerk auth**

The feature flag system ensures zero downtime and instant rollback capability!