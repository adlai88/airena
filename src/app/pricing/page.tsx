'use client';

import { useState } from 'react';
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
  const { isSignedIn } = useUser();

  const handleSubscribe = async (planId: string) => {
    if (!isSignedIn) {
      window.location.href = '/sign-up';
      return;
    }

    if (planId === 'free') {
      window.location.href = '/';
      return;
    }


    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tier: planId
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        window.location.href = data.checkoutUrl;
      } else {
        console.error('Checkout error:', data.error);
      }
    } catch (error) {
      console.error('Checkout error:', error);
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
                    disabled={plan.comingSoon}
                  >
                    {plan.comingSoon ? 'Coming Soon' : plan.cta}
                    {!plan.comingSoon && plan.id !== 'free' && (
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