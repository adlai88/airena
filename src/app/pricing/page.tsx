'use client';

import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { CheckoutModal } from '@/components/checkout-modal';

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
      '3 channels maximum',
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
    cta: 'Subscribe Now',
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
      'Priority support',
      'API access (coming soon)',
      'Webhook support (coming soon)',
      'MCP server generation (coming soon)'
    ],
    cta: 'Subscribe Now',
    popular: false,
    comingSoon: false
  }
];

// Helper function to determine tier priority for upgrade/downgrade logic
const getTierPriority = (tier: string): number => {
  const priorities = { free: 0, starter: 1, pro: 2 };
  return priorities[tier as keyof typeof priorities] || 0;
};

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [currentTier, setCurrentTier] = useState<string>('free');
  const [checkoutModal, setCheckoutModal] = useState<{
    isOpen: boolean;
    planName: string;
    planPrice: string;
    tier: string;
  }>({
    isOpen: false,
    planName: '',
    planPrice: '',
    tier: ''
  });
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

    // Allow subscriptions regardless of current tier (for upgrades/downgrades)
    // if (planId === currentTier) {
    //   console.log('🔍 User already on this tier');
    //   alert('You are already on this plan!');
    //   return;
    // }

    // Find the plan details for the modal
    const plan = plans.find(p => p.id === planId);
    if (!plan) {
      console.error('❌ Plan not found:', planId);
      return;
    }

    // Open the checkout modal
    console.log('🔍 Opening checkout modal for:', plan.name);
    setCheckoutModal({
      isOpen: true,
      planName: plan.name,
      planPrice: plan.price.replace('$', ''),
      tier: planId
    });
  };

  return (
    <Layout>
      <div className="min-h-screen pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <PageHeader
            title="AI intelligence for Are.na"
            subtitle="Starting at $5/month."
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
                    } ${
                      !plan.comingSoon ? 'cursor-pointer' : ''
                    }`}
                    disabled={plan.comingSoon || (isSignedIn && currentTier === plan.id)}
                  >
                    {plan.comingSoon ? 'Coming Soon' : 
                     isSignedIn && currentTier === plan.id ? 'Current Plan' :
                     isSignedIn && currentTier !== 'free' && plan.id !== 'free' ? 
                       (getTierPriority(plan.id) > getTierPriority(currentTier) ? 'Upgrade' : 'Downgrade') :
                     plan.cta}
                    {!plan.comingSoon && plan.id !== 'free' && !(isSignedIn && currentTier === plan.id) && (
                      <ArrowRight className="h-4 w-4 ml-1" />
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Comparison Section */}
          {/* Removed 'Why choose Airena?' section and its columns */}

          {/* Subscription Management */}
          {isSignedIn && currentTier !== 'free' && (
            <div className="mt-12 text-center">
              <Card className="max-w-md mx-auto">
                <CardHeader>
                  <CardTitle className="text-lg">Manage Subscription</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Need to cancel or modify your subscription? Contact our support team.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => window.open('mailto:support@airena.io?subject=Subscription Management', '_blank')}
                    className="w-full"
                  >
                    Contact Support
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Overage Pricing */}
          <div className="mt-12 text-center">
            <h4 className="text-lg font-semibold mb-2">Need more blocks?</h4>
            <p className="text-sm text-muted-foreground">
              Additional blocks are $0.15 each, or save 33% with 100-block packages for $10
            </p>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={checkoutModal.isOpen}
        onClose={() => setCheckoutModal(prev => ({ ...prev, isOpen: false }))}
        planName={checkoutModal.planName}
        planPrice={checkoutModal.planPrice}
        tier={checkoutModal.tier}
      />
    </Layout>
  );
}