'use client';

import BetterAuthSignIn from './better-auth-signin';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <BetterAuthSignIn />
      </div>
    </div>
  );
}