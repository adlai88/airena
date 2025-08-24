'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Layout } from '@/components/layout';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useUser } from '@/components/auth-provider';
import { CheckoutModal } from '@/components/checkout-modal';

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  popular: boolean;
  comingSoon: boolean;
  limitedOffer?: boolean;
  spotsAvailable?: number;
  futurePrice?: boolean;
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for exploring Are.na intelligence',
    features: [
      '50 blocks lifetime limit',
      'Public channels only',
      'Chat with your channels',
      'Generate content',
      'Spatial canvas view'
    ],
    cta: 'Get Started',
    popular: false,
    comingSoon: false
  },
  {
    id: 'founding',
    name: 'Founding Member',
    price: '$7',
    period: 'per month forever',
    description: 'Limited to first 100 members',
    features: [
      'Unlimited blocks',
      'Private channels access',
      'Priority support',
      'Early access to features'
    ],
    cta: 'Join Now',
    popular: true,
    comingSoon: false,
    limitedOffer: true,
    spotsAvailable: 100
  }
];

// Helper function to determine tier priority for upgrade/downgrade logic
const getTierPriority = (tier: string): number => {
  const priorities = { free: 0, founding: 1, starter: 1, pro: 2 };
  return priorities[tier as keyof typeof priorities] || 0;
};

function PricingContent() {
  const isAnnual = false; // Annual billing not implemented yet
  const [currentTier, setCurrentTier] = useState<string>('free');
  const [showSuccess, setShowSuccess] = useState(false);
  const [checkoutModal, setCheckoutModal] = useState<{
    isOpen: boolean;
    planName: string;
    planPrice: string;
    tier: string;
    billing: string;
  }>({
    isOpen: false,
    planName: '',
    planPrice: '',
    tier: '',
    billing: 'monthly'
  });
  const user = useUser();
  const isSignedIn = !!user;
  const isLoaded = user !== undefined;
  const searchParams = useSearchParams();

  // Fetch current user tier
  useEffect(() => {
    if (isLoaded) {
      fetchCurrentTier();
    }
  }, [isLoaded]);

  // Handle success message from checkout
  useEffect(() => {
    const success = searchParams.get('success');
    const tier = searchParams.get('tier');
    
    if (success === 'true' && tier) {
      setShowSuccess(true);
      // Hide success message after 5 seconds
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

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
      if (currentTier === 'free') {
        console.log('🔍 Redirecting to home (free plan)');
        window.location.href = '/';
        return;
      }
      // For downgrades to free, still use checkout for consistency
      // Polar will handle this as a $0 subscription change
    }

    // Find the plan details for the modal
    const plan = plans.find(p => p.id === planId);
    if (!plan) {
      console.error('❌ Plan not found:', planId);
      return;
    }

    // Open the checkout modal
    console.log('🔍 Opening checkout modal for:', plan.name, 'billing:', isAnnual ? 'annual' : 'monthly');
    
    // Calculate the correct price based on billing period
    const displayPrice = isAnnual && plan.id === 'starter' ? '45' : 
                        isAnnual && plan.id === 'pro' ? '99' : 
                        plan.price.replace('$', '');
    
    setCheckoutModal({
      isOpen: true,
      planName: plan.name,
      planPrice: displayPrice,
      tier: planId,
      billing: isAnnual ? 'annual' : 'monthly'
    });
  };


  return (
    <Layout>
      <div className="min-h-screen pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <PageHeader
            title="AI intelligence for Are.na"
            subtitle="Starting at $7/month."
          />

          {/* Success Message */}
          {showSuccess && (
            <div className="max-w-md mx-auto mb-8">
              <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
                <CardContent className="flex items-center space-x-3 pt-6">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Subscription updated successfully! Your plan change is now active.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Current Plan Display */}
          {/* Removed badge display here as it's redundant with the plan card indicator */}

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 max-w-4xl mx-auto">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative ${
                  plan.popular && !plan.futurePrice
                    ? 'border-primary shadow-lg scale-105'
                    : plan.futurePrice
                    ? 'border-border opacity-60'
                    : 'border-border'
                }`}
              >
                {plan.limitedOffer && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
                    Limited: 100 spots only
                  </Badge>
                )}
                
                <CardHeader className="text-center">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">
                      {plan.price}
                    </span>
                    <span className="text-muted-foreground ml-1">
                      {plan.period}
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
                    {isSignedIn && currentTier === plan.id ? 'Current Plan' :
                     plan.comingSoon ? 'Coming Soon' : 
                     isSignedIn && currentTier !== 'free' && plan.id === 'free' ? 'Downgrade' :
                     isSignedIn && currentTier !== 'free' && plan.id !== 'free' ? 
                       (getTierPriority(plan.id) > getTierPriority(currentTier) ? 'Upgrade' : 'Downgrade') :
                     plan.cta}
                    {!plan.comingSoon && plan.id !== 'free' && !(isSignedIn && currentTier === plan.id) && (
                      <ArrowRight className="h-4 w-4 ml-1" />
                    )}
                  </Button>
                  {/* Show manage subscription link for current plan */}
                  {isSignedIn && currentTier === plan.id && plan.id !== 'free' && (
                    <p className="mt-2 text-xs text-muted-foreground text-center">
                      <a
                        href="/api/customer-portal"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-primary"
                      >
                        Manage subscription
                      </a>
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Comparison Section */}
          {/* Removed 'Why choose Airena?' section and its columns */}
        </div>
      </div>

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={checkoutModal.isOpen}
        onClose={() => setCheckoutModal(prev => ({ ...prev, isOpen: false }))}
        planName={checkoutModal.planName}
        planPrice={checkoutModal.planPrice}
        tier={checkoutModal.tier}
        billing={checkoutModal.billing}
      />
    </Layout>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <Layout>
        <div className="min-h-screen pt-20 pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <PageHeader
              title="AI intelligence for Are.na"
              subtitle="Starting at $7/month."
            />
            <div className="flex justify-center mt-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </div>
        </div>
      </Layout>
    }>
      <PricingContent />
    </Suspense>
  );
}