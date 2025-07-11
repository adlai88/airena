'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Layout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function SuccessPage() {
  const { user, isLoaded } = useUser();
  const [userTier, setUserTier] = useState<string>('free');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && user) {
      // Check user tier from Clerk metadata
      const tier = user.publicMetadata?.tier as string || 'free';
      setUserTier(tier);
      setIsLoading(false);
    }
  }, [isLoaded, user]);

  if (!isLoaded || isLoading) {
    return (
      <Layout>
        <div className="min-h-screen pt-20 pb-16 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your account...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const tierInfo = {
    starter: {
      name: 'Starter',
      price: '$5/month',
      blocks: 200,
      features: [
        'Private channels access',
        'Unlimited chat & generations',
        'Advanced templates',
        'Export content',
        'Email support'
      ]
    },
    pro: {
      name: 'Pro',
      price: '$14/month',
      blocks: 500,
      features: [
        'Everything in Starter',
        'MCP server generation',
        'API access',
        'Priority processing',
        'Priority support'
      ]
    }
  };

  const currentTier = tierInfo[userTier as keyof typeof tierInfo];

  return (
    <Layout>
      <div className="min-h-screen pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-4">
              <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2">Welcome to Airena {currentTier?.name}!</h1>
            <p className="text-muted-foreground">
              Your subscription is now active. Start building intelligence from your Are.na channels.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Plan Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Sparkles className="h-5 w-5 mr-2 text-primary" />
                  Your Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{currentTier?.name}</span>
                  <Badge variant="secondary">{currentTier?.price}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {currentTier?.blocks} blocks per month
                </div>
                <ul className="space-y-2">
                  {currentTier?.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 mr-2 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card>
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start">
                    <div className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full text-xs font-semibold mr-3 mt-0.5">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Start with your first channel</p>
                      <p className="text-sm text-muted-foreground">
                        Process any Are.na channel to create your intelligence base
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full text-xs font-semibold mr-3 mt-0.5">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Chat with your content</p>
                      <p className="text-sm text-muted-foreground">
                        Ask questions and get insights from your curated research
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full text-xs font-semibold mr-3 mt-0.5">
                      3
                    </div>
                    <div>
                      <p className="font-medium">Generate content</p>
                      <p className="text-sm text-muted-foreground">
                        Create newsletters, reports, and summaries from your channels
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 space-y-2">
                  <Link href="/">
                    <Button className="w-full">
                      Start Processing Channels
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                  <Link href="/usage">
                    <Button variant="outline" className="w-full">
                      View Usage Dashboard
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Support Info */}
          <Card className="mt-8">
            <CardContent className="pt-6">
              <div className="text-center">
                <h3 className="font-semibold mb-2">Need Help?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  We're here to help you get the most out of Airena. Reach out if you have any questions.
                </p>
                <div className="flex justify-center space-x-4">
                  <Button variant="outline" size="sm">
                    View Documentation
                  </Button>
                  <Button variant="outline" size="sm">
                    Contact Support
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}