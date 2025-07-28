'use client';

import BetterAuthSignIn from './better-auth-signin';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back to Aryn</h1>
          <p className="text-muted-foreground">
            Sign in to access your Are.na intelligence
          </p>
        </div>
        <BetterAuthSignIn />
      </div>
    </div>
  );
}