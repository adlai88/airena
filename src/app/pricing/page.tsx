'use client';

import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ArrowRight, Star } from 'lucide-react';
import { useUser } from '@clerk/nextjs';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for exploring Are.na intelligence',
    features: [
      '25 blocks per channel',
      '10 chat messages per channel/month',
      '2 generations per channel/month',
      'Public channels only',
      'Complete multimodal intelligence',
      'No signup required'
    ],
    cta: 'Get Started',
    popular: false,
    comingSoon: false
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '$5',
    period: 'per month',
    description: 'For serious Are.na curators',
    features: [
      '200 blocks per month',
      'Unlimited chat & generations',
      'Private channels access',
      'Unlimited channels',
      'Advanced templates',
      'Export generated content',
      'Email support'
    ],
    cta: 'Start Free Trial',
    popular: true,
    comingSoon: false
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$14',
    period: 'per month',
    description: 'For power users and developers',
    features: [
      '500 blocks per month',
      'Everything in Starter',
      'MCP server generation',
      'API access',
      'Webhook support',
      'Priority processing',
      'Channel isolation',
      'Priority support'
    ],
    cta: 'Start Free Trial',
    popular: false,
    comingSoon: false
  }
];

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [currentTier, setCurrentTier] = useState<string>('free');
  const [isLoading, setIsLoading] = useState(false);
  const { isSignedIn, isLoaded } = useUser();

  // Fetch current user tier
  useEffect(() => {
    if (isLoaded) {
      fetchCurrentTier();
    }
  }, [isLoaded]);

  const fetchCurrentTier = async () => {
    try {
      const response = await fetch('/api/user-tier');
      if (response.ok) {
        const data = await response.json();
        setCurrentTier(data.tier);
      }
    } catch (error) {
      console.error('Failed to fetch current tier:', error);
      setCurrentTier('free');
    }
  };

  const handleSubscribe = async (planId: string) => {
    console.log('🔍 handleSubscribe called with planId:', planId);
    console.log('🔍 User signed in:', isSignedIn);
    console.log('🔍 Current tier:', currentTier);

    if (!isSignedIn) {
      console.log('🔍 Redirecting to sign-up');
      window.location.href = '/sign-up';
      return;
    }

    if (planId === 'free') {
      console.log('🔍 Redirecting to home (free plan)');
      window.location.href = '/';
      return;
    }

    if (planId === currentTier) {
      console.log('🔍 User already on this tier');
      alert('You are already on this plan!');
      return;
    }

    setIsLoading(true);
    console.log('🔍 Starting checkout process...');

    try {
      console.log('🔍 Calling /api/checkout with tier:', planId);
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tier: planId
        }),
      });

      console.log('🔍 Checkout API response status:', response.status);
      const data = await response.json();
      console.log('🔍 Checkout API response data:', data);
      
      if (response.ok) {
        console.log('🔍 Redirecting to checkout URL:', data.checkoutUrl);
        window.location.href = data.checkoutUrl;
      } else {
        console.error('❌ Checkout error:', data.error);
        alert(`Checkout failed: ${data.error}`);
      }
    } catch (error) {
      console.error('❌ Checkout error:', error);
      alert(`Checkout failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <PageHeader
            title="AI intelligence for Are.na"
            subtitle="Transform your curation into intelligent agents. Starting at $5/month."
          />

          {/* Current Plan Display */}
          {/* Removed badge display here as it's redundant with the plan card indicator */}

          {/* Pricing Toggle */}
          <div className="flex items-center justify-center mt-8 mb-12">
            <div className="flex items-center space-x-3">
              <span className={`text-sm ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
                Monthly
              </span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isAnnual ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                    isAnnual ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
                Annual
              </span>
              {isAnnual && (
                <Badge variant="secondary" className="text-xs">
                  Save up to 41%
                </Badge>
              )}
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative ${
                  plan.popular
                    ? 'border-primary shadow-lg scale-105'
                    : 'border-border'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      <Star className="h-3 w-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">
                      {isAnnual && plan.id === 'starter' ? '$45' : 
                       isAnnual && plan.id === 'pro' ? '$99' : 
                       plan.price}
                    </span>
                    <span className="text-muted-foreground ml-1">
                      {isAnnual && plan.id !== 'free' ? 'per year' : plan.period}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {plan.description}
                  </p>
                </CardHeader>

                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 mr-2 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleSubscribe(plan.id)}
                    className={`w-full ${
                      plan.popular
                        ? 'bg-primary hover:bg-primary/90'
                        : 'bg-secondary hover:bg-secondary/80 text-foreground'
                    }`}
                    disabled={plan.comingSoon || isLoading || (isSignedIn && currentTier === plan.id)}
                  >
                    {plan.comingSoon ? 'Coming Soon' : 
                     isLoading ? 'Loading...' :
                     isSignedIn && currentTier === plan.id ? 'Current Plan' :
                     plan.cta}
                    {!plan.comingSoon && !isLoading && plan.id !== 'free' && !(isSignedIn && currentTier === plan.id) && (
                      <ArrowRight className="h-4 w-4 ml-1" />
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Comparison Section */}
          <div className="mt-16 text-center">
            <h3 className="text-2xl font-bold mb-4">Why choose Airena?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">2x Value</div>
                <p className="text-sm text-muted-foreground">
                  Cheaper than Are.na Premium, with unlimited AI intelligence
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">5 Types</div>
                <p className="text-sm text-muted-foreground">
                  Complete multimodal intelligence: websites, PDFs, images, videos, text
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">No Lock-in</div>
                <p className="text-sm text-muted-foreground">
                  Open source core, export your data, cancel anytime
                </p>
              </div>
            </div>
          </div>

          {/* Overage Pricing */}
          <div className="mt-12 text-center">
            <h4 className="text-lg font-semibold mb-2">Need more blocks?</h4>
            <p className="text-sm text-muted-foreground">
              Additional blocks are $0.15 each, or save 33% with 100-block packages for $10
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}