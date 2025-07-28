'use client';

import BetterAuthSignUp from './better-auth-signup';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Join Aryn</h1>
          <p className="text-muted-foreground">
            Transform your Are.na channels into intelligent agents
          </p>
        </div>
        <BetterAuthSignUp />
      </div>
    </div>
  );
}