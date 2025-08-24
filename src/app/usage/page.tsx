'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Layout } from '@/components/layout';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Check, Key } from 'lucide-react';
import { UserTier, UsageRecord } from '@/lib/usage-tracking';
import { useUser } from '@/components/auth-provider';

interface UsageStats {
  tier: UserTier;
  monthly: {
    current: number;
    limit: number;
    remaining: number;
    month: string;
  };
  lifetime?: {
    blocksUsed: number;
    blocksRemaining: number;
    percentUsed: number;
    limit: number;
  };
  channels: UsageRecord[];
  totalChannelsProcessed: number;
  totalBlocksProcessed: number;
  tierInfo: {
    name: string;
    blocks: number;
    type: string;
    price?: string;
    features: string[];
  };
}

interface ApiKeyStatus {
  isValid: boolean;
  message: string;
  testing: boolean;
}

export default function UsagePage() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [currentApiKey, setCurrentApiKey] = useState('');
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus>({
    isValid: false,
    message: '',
    testing: false
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const user = useUser();
  const isSignedIn = !!user;

  // Fetch usage stats and API key data
  useEffect(() => {
    console.log('[usage-page] useEffect triggered:', { 
      isSignedIn, 
      userExists: !!user, 
      userId: user?.id,
      isLoading 
    });

    const fetchData = async () => {
      if (!isSignedIn || !user) {
        console.log('[usage-page] User not signed in, skipping fetch');
        return;
      }

      // Only prevent duplicate requests if we already have data
      if (isLoading && stats) {
        console.log('[usage-page] Already loading and have data, skipping fetch');
        return;
      }

      console.log('[usage-page] Starting data fetch for user:', user.id);

      try {
        setIsLoading(true);
        
        // Fetch usage stats with longer timeout for slow queries
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        console.log('[usage-page] Fetching usage stats...');
        const statsResponse = await fetch('/api/usage-stats', {
          signal: controller.signal
        });
        console.log('[usage-page] Usage stats response:', statsResponse.status);
        
        clearTimeout(timeoutId);
        
        if (!statsResponse.ok) {
          const errorData = await statsResponse.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch usage statistics (${statsResponse.status})`);
        }
        const statsData = await statsResponse.json();
        console.log('[usage-page] Stats data received:', {
          tier: statsData.tier,
          channelsCount: statsData.channels?.length
        });
        
        // For free tier, also fetch lifetime usage
        if (statsData.tier === 'free') {
          console.log('[usage-page] Fetching lifetime usage...');
          const lifetimeResponse = await fetch('/api/lifetime-usage');
          if (lifetimeResponse.ok) {
            const lifetimeData = await lifetimeResponse.json();
            statsData.lifetime = {
              blocksUsed: lifetimeData.blocksUsed,
              blocksRemaining: lifetimeData.blocksRemaining,
              percentUsed: lifetimeData.percentUsed,
              limit: lifetimeData.limit
            };
            console.log('[usage-page] Lifetime data added');
          }
        }
        
        console.log('[usage-page] Setting stats data...');
        setStats(statsData);

        // Fetch API key status
        const keyResponse = await fetch('/api/user-settings');
        if (keyResponse.ok) {
          const keyData = await keyResponse.json();
          setCurrentApiKey(keyData.hasApiKey ? '•••••••••••••••' : '');
          if (keyData.hasApiKey) {
            setApiKeyStatus({
              isValid: true,
              message: 'API key is configured and working',
              testing: false
            });
          }
        }
      } catch (err) {
        console.error('[usage-page] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        console.log('[usage-page] Setting loading to false');
        setIsLoading(false);
      }
    };

    console.log('[usage-page] Calling fetchData...');
    fetchData().catch(err => {
      console.error('[usage-page] fetchData error:', err);
      setError(err.message);
      setIsLoading(false);
    });
  }, [isSignedIn, user?.id, isLoading, stats, user]);

  // Get tier info from the stats response instead of UsageTracker
  const tierInfo = stats?.tierInfo || null;

  // API Key management functions
  const testApiKey = async (key: string) => {
    if (!key) {
      setApiKeyStatus({
        isValid: false,
        message: 'Please enter an API key',
        testing: false
      });
      return;
    }

    setApiKeyStatus({ isValid: false, message: '', testing: true });

    try {
      const response = await fetch('/api/test-arena-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key })
      });

      const result = await response.json();

      if (response.ok) {
        setApiKeyStatus({
          isValid: true,
          message: `✓ Connected as ${result.username}`,
          testing: false
        });
      } else {
        setApiKeyStatus({
          isValid: false,
          message: result.error || 'Invalid API key',
          testing: false
        });
      }
    } catch {
      setApiKeyStatus({
        isValid: false,
        message: 'Failed to test API key',
        testing: false
      });
    }
  };

  const saveApiKey = async () => {
    if (!apiKey) return;

    setSaving(true);
    try {
      const response = await fetch('/api/user-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arenaApiKey: apiKey })
      });

      if (response.ok) {
        setSaved(true);
        setCurrentApiKey('•••••••••••••••');
        setApiKey('');
        setTimeout(() => setSaved(false), 3000);
      } else {
        throw new Error('Failed to save API key');
      }
    } catch (error) {
      console.error('Error saving API key:', error);
    } finally {
      setSaving(false);
    }
  };

  const removeApiKey = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/user-settings', {
        method: 'DELETE'
      });

      if (response.ok) {
        setCurrentApiKey('');
        setApiKey('');
        setApiKeyStatus({
          isValid: false,
          message: '',
          testing: false
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Error removing API key:', error);
    } finally {
      setSaving(false);
    }
  };

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
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
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
                      {stats.lifetime && (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">
                              Lifetime Block Usage
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {stats.lifetime.blocksUsed} / {stats.lifetime.limit} blocks
                            </span>
                          </div>
                          <Progress value={stats.lifetime.percentUsed} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">
                            {stats.lifetime.blocksRemaining} blocks remaining
                            {stats.lifetime.blocksRemaining <= 10 && stats.lifetime.blocksRemaining > 0 && (
                              <span className="text-orange-500 ml-2 font-medium">⚠️ Running low!</span>
                            )}
                          </p>
                        </>
                      )}
                      <div className="space-y-2 mt-4">
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
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium">Block Usage</span>
                        <span className="text-sm text-muted-foreground">Unlimited blocks</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center text-sm">
                          <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
                          Limited to first 100 members
                        </div>
                        <div className="flex items-center text-sm">
                          <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
                          Private channels access
                        </div>
                        <div className="flex items-center text-sm">
                          <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
                          Priority support
                        </div>
                        <div className="flex items-center text-sm">
                          <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
                          Early access to features
                        </div>
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
                  <CardTitle className="text-sm font-medium">
                    {stats.tier === 'free' ? 'Lifetime Used' : 'This Month'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.tier === 'free' && stats.lifetime ? stats.lifetime.blocksUsed : stats.monthly.current}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats.tier === 'free' ? 'Total blocks used' : 'Blocks processed'}
                  </p>
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
                        <div className="flex items-center flex-1 min-w-0 pr-2">
                          {/* Thumbnail */}
                          {channel.channel_thumbnail_url ? (
                            <div className="relative w-10 h-10 flex-shrink-0 mr-3">
                              <Image 
                                src={channel.channel_thumbnail_url} 
                                alt={`${channel.channel_title || channel.channel_slug} thumbnail`}
                                fill
                                className="rounded-md object-cover"
                                onError={(e) => {
                                  // Hide image on load error
                                  const target = e.target as HTMLImageElement;
                                  target.style.visibility = 'hidden';
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0 mr-3">
                              <span className="text-xs text-muted-foreground font-medium">
                                {(channel.channel_title || channel.channel_slug || `Channel ${channel.channel_id}`).charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {channel.channel_title || channel.channel_slug || `Channel #${channel.channel_id}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Last processed: {new Date(channel.last_processed_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
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

            {/* Private Channel Access */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  <CardTitle>Private Channel Access</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {stats?.tier === 'free' ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Private channel access requires a Founding Member plan. 
                      <Button 
                        variant="link" 
                        className="p-0 h-auto font-semibold text-primary ml-1"
                        onClick={() => window.location.href = '/pricing'}
                      >
                        Upgrade to access your private channels.
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="api-key">Are.na API Key</Label>
                      <p className="text-sm text-muted-foreground">
                        Configure your personal Are.na API key to access private channels
                      </p>
                      <div className="flex gap-2">
                        <Input
                          id="api-key"
                          type="password"
                          placeholder={currentApiKey || 'Enter your Are.na API key'}
                          value={apiKey}
                          onChange={(e) => {
                            setApiKey(e.target.value);
                            if (apiKeyStatus.message && !apiKeyStatus.testing) {
                              setApiKeyStatus({ isValid: false, message: '', testing: false });
                            }
                          }}
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          onClick={() => testApiKey(apiKey)}
                          disabled={!apiKey || apiKeyStatus.testing}
                        >
                          {apiKeyStatus.testing ? 'Testing...' : 'Test'}
                        </Button>
                      </div>
                      
                      {apiKeyStatus.message && (
                        <p className={`text-sm ${apiKeyStatus.isValid ? 'text-green-600' : 'text-red-600'}`}>
                          {apiKeyStatus.message}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={saveApiKey}
                        disabled={!apiKey || !apiKeyStatus.isValid || saving}
                        className="flex items-center gap-2"
                      >
                        {saved ? <Check className="h-4 w-4" /> : null}
                        {saving ? 'Saving...' : saved ? 'Saved!' : 'Save API Key'}
                      </Button>
                      
                      {currentApiKey && (
                        <Button
                          variant="outline"
                          onClick={removeApiKey}
                          disabled={saving}
                        >
                          Remove Key
                        </Button>
                      )}
                    </div>

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>How to get your API key:</strong>
                        <br />
                        1. Go to{' '}
                        <a 
                          href="https://dev.are.na" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          dev.are.na
                        </a>
                        <br />
                        2. Sign in with your Are.na account
                        <br />
                        3. Create a new application or use an existing one
                        <br />
                        4. Copy your Personal Access Token
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upgrade CTA for Free Users */}
            {stats.tier === 'free' && (
              <Card className="border-primary/50 bg-primary/5">
                <CardHeader>
                  <CardTitle>Ready to Go Unlimited?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upgrade to Founding Member for unlimited blocks forever at an exclusive price.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
                      Everything unlimited forever
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
                      Private channels access
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
                      All future features included
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
                      70%+ savings vs future pricing
                    </div>
                  </div>
                  <Button 
                    className="mt-4" 
                    onClick={() => window.location.href = '/pricing'}
                  >
                    Become a Founding Member - $7/month forever
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