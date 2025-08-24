'use client';

import { useState } from 'react';
import { authClient } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function BetterAuthSignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const { error } = await authClient.signIn.email({
        email,
        password,
      });
      
      if (error) {
        setError(error.message || 'Invalid email or password');
        return;
      }
      
      // Get redirect URL from query params or default to channels
      const searchParams = new URLSearchParams(window.location.search);
      const redirectUrl = searchParams.get('redirect_url') || '/channels';
      
      // Poll for session cookie before redirecting
      const checkSessionAndRedirect = () => {
        const hasSessionCookie = document.cookie.includes('better-auth.session_token');
        if (hasSessionCookie) {
          window.location.href = redirectUrl;
        } else {
          // Check again in 50ms, max 10 attempts (500ms total)
          const attempts = parseInt(sessionStorage.getItem('auth-attempts') || '0');
          if (attempts < 10) {
            sessionStorage.setItem('auth-attempts', (attempts + 1).toString());
            setTimeout(checkSessionAndRedirect, 50);
          } else {
            // Fallback: force redirect after max attempts
            sessionStorage.removeItem('auth-attempts');
            window.location.href = redirectUrl;
          }
        }
      };
      
      // Reset attempts counter and start checking
      sessionStorage.removeItem('auth-attempts');
      checkSessionAndRedirect();
    } catch (err) {
      console.error('Sign in error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
        <CardDescription className="text-center">
          Sign in to your account to continue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link 
                href="/forgot-password" 
                className="text-sm text-muted-foreground hover:text-primary"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete="current-password"
            />
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign In
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <p className="text-center text-sm text-muted-foreground w-full">
          Don&apos;t have an account?{' '}
          <Link href="/sign-up" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}