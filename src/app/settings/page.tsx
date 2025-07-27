'use client';

import { Layout } from '@/components/layout';
import { PageHeader } from '@/components/page-header';
import { useUser } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  const user = useUser();
  const isSignedIn = !!user;

  if (!isSignedIn) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Please sign in to access settings</p>
            <Button onClick={() => window.location.href = '/sign-in'}>
              Sign In
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <PageHeader
            title="Settings"
            subtitle="Manage your account and preferences"
          />
          
          <div className="mt-8 space-y-4">
            <p className="text-muted-foreground">
              Settings page is under development. For now, you can:
            </p>
            
            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={() => window.location.href = '/usage'}
                className="w-full sm:w-auto"
              >
                View Usage & API Settings
              </Button>
              
              <Button
                variant="outline"
                onClick={() => window.location.href = '/api/customer-portal'}
                className="w-full sm:w-auto ml-0 sm:ml-2"
              >
                Manage Subscription
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}