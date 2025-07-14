'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Star, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UpgradePromptProps {
  type: 'blocks' | 'chat' | 'generation';
  currentUsage: number;
  limit: number;
  onDismiss?: () => void;
  className?: string;
}

export function UpgradePrompt({ type, currentUsage, limit, onDismiss, className }: UpgradePromptProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const router = useRouter();

  const handleUpgrade = () => {
    router.push('/pricing');
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  if (isDismissed) return null;

  const getPromptContent = () => {
    switch (type) {
      case 'blocks':
        return {
          title: 'Processing limit reached',
          description: `You've used ${currentUsage}/${limit} blocks this month. Upgrade to continue processing channels.`,
          benefit: '8x more blocks (200/month)',
          cta: 'Upgrade to Starter'
        };
      case 'chat':
        return {
          title: 'Chat limit reached',
          description: `You've used ${currentUsage}/${limit} chat messages this month. Upgrade for unlimited chat.`,
          benefit: 'Unlimited chat messages',
          cta: 'Upgrade to Starter'
        };
      case 'generation':
        return {
          title: 'Generation limit reached',
          description: `You've used ${currentUsage}/${limit} generations this month. Upgrade for unlimited generations.`,
          benefit: 'Unlimited content generation',
          cta: 'Upgrade to Starter'
        };
      default:
        return {
          title: 'Upgrade needed',
          description: 'You\'ve reached your usage limit. Upgrade to continue.',
          benefit: 'Unlimited usage',
          cta: 'Upgrade Now'
        };
    }
  };

  const content = getPromptContent();

  return (
    <Card className={`border-border ${className}`} style={{ backgroundColor: '#5E6DEE10' }}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Badge className="border-border" style={{ backgroundColor: '#5E6DEE20', color: '#5E6DEE' }}>
              <Star className="h-3 w-3 mr-1" />
              Upgrade
            </Badge>
            <CardTitle className="text-sm font-medium">{content.title}</CardTitle>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <CardDescription className="text-xs">
          {content.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            <span className="font-medium" style={{ color: '#5E6DEE' }}>{content.benefit}</span>
            <span className="ml-1">• $5/month</span>
          </div>
          <Button
            onClick={handleUpgrade}
            size="sm"
            className="h-7 px-3 text-xs" style={{ backgroundColor: '#5E6DEE' }} onMouseEnter={(e) => { (e.target as HTMLElement).style.backgroundColor = '#4A5BDB'; }} onMouseLeave={(e) => { (e.target as HTMLElement).style.backgroundColor = '#5E6DEE'; }}
          >
            {content.cta}
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}