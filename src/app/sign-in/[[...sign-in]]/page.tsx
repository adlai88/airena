'use client';

import { SignIn } from '@clerk/nextjs';
import BetterAuthSignIn from './better-auth-signin';
import { useNewAuth } from '@/lib/feature-flags';

export default function SignInPage() {
  const isNewAuth = useNewAuth();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back to Airena</h1>
          <p className="text-muted-foreground">
            Sign in to access your Are.na intelligence
          </p>
        </div>
        {isNewAuth ? (
          <BetterAuthSignIn />
        ) : (
          <SignIn 
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "shadow-lg",
              }
            }}
          />
        )}
      </div>
    </div>
  );
}