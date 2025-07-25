'use client';

import { SignUp } from '@clerk/nextjs';
import BetterAuthSignUp from './better-auth-signup';
import { useNewAuth } from '@/lib/feature-flags';

export default function SignUpPage() {
  const isNewAuth = useNewAuth();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Join Airena</h1>
          <p className="text-muted-foreground">
            Transform your Are.na channels into intelligent agents
          </p>
        </div>
        {isNewAuth ? (
          <BetterAuthSignUp />
        ) : (
          <SignUp 
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