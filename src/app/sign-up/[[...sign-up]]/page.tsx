'use client';

import BetterAuthSignUp from './better-auth-signup';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <BetterAuthSignUp />
      </div>
    </div>
  );
}