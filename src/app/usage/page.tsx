'use client';

import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { UsageTracker, UserTier, UsageRecord } from '@/lib/usage-tracking';
import { useUser } from '@clerk/nextjs';

interface UsageStats {
  tier: UserTier;
  monthly: {
    current: number;
    limit: number;
    remaining: number;
    month: string;
  };
  channels: UsageRecord[];
  totalChannelsProcessed: number;
  totalBlocksProcessed: number;
}

export default function UsagePage() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isSignedIn, user } = useUser();

  // Fetch usage stats
  useEffect(() => {
    const fetchStats = async () => {
      if (!isSignedIn || !user) return;

      try {
        setIsLoading(true);
        const response = await fetch('/api/usage-stats');
        
        if (!response.ok) {
          throw new Error('Failed to fetch usage statistics');
        }

        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load usage statistics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [isSignedIn, user]);

  const tierInfo = stats ? UsageTracker.getTierInfo(stats.tier) : null;
  const progressPercentage = stats ? Math.min((stats.monthly.current / stats.monthly.limit) * 100, 100) : 0;

  if (!isSignedIn) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Please sign in to view your usage statistics</p>
            <Button onClick={() => window.location.href = '/sign-in'}>
              Sign In
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="flex justify-center mx-auto mb-4"><Spinner size={32} /></div>
            <p className="text-muted-foreground">Loading usage statistics...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!stats || !tierInfo) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">No usage data available</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <PageHeader
            title="Usage Dashboard"
            subtitle="Monitor your block processing and subscription limits"
          />

          <div className="space-y-6 mt-8">
            {/* Current Plan */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Current Plan</span>
                  <Badge variant="secondary" className="text-sm">
                    {tierInfo.name}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.tier === 'free' ? (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {tierInfo.blocks} blocks per channel limit
                      </p>
                      <div className="space-y-2">
                        {tierInfo.features.map((feature, index) => (
                          <div key={index} className="flex items-center text-sm">
                            <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
                            {feature}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          Monthly Usage ({stats.monthly.month})
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {stats.monthly.current} / {stats.monthly.limit} blocks
                        </span>
                      </div>
                      <Progress value={progressPercentage} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {stats.monthly.remaining} blocks remaining this month
                      </p>
                      <div className="space-y-2 mt-4">
                        {tierInfo.features.map((feature, index) => (
                          <div key={index} className="flex items-center text-sm">
                            <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
                            {feature}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Usage Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Channels</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalChannelsProcessed}</div>
                  <p className="text-xs text-muted-foreground">Channels processed</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Blocks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalBlocksProcessed}</div>
                  <p className="text-xs text-muted-foreground">All time</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">This Month</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.monthly.current}</div>
                  <p className="text-xs text-muted-foreground">Blocks processed</p>
                </CardContent>
              </Card>
            </div>

            {/* Channel Details */}
            {stats.channels.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Channel Processing History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.channels.map((channel) => (
                      <div
                        key={channel.id}
                        className="flex items-center justify-between p-3 border rounded-md"
                      >
                        <div>
                          <p className="font-medium text-sm">Channel #{channel.channel_id}</p>
                          <p className="text-xs text-muted-foreground">
                            Last processed: {new Date(channel.last_processed_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{channel.total_blocks_processed} blocks</p>
                          <Badge variant={channel.is_free_tier ? "secondary" : "default"} className="text-xs">
                            {channel.is_free_tier ? "Free" : "Paid"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Upgrade CTA for Free Users */}
            {stats.tier === 'free' && (
              <Card className="border-primary/50 bg-primary/5">
                <CardHeader>
                  <CardTitle>Ready to Process More?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upgrade to Starter for 200 blocks per month across unlimited channels.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
                      200 blocks per month (8x more than free)
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
                      Process unlimited channels
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
                      Email support
                    </div>
                  </div>
                  <Button className="mt-4" disabled>
                    Upgrade to Starter - $5/month
                    <span className="ml-2 text-xs">(Coming Soon)</span>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}