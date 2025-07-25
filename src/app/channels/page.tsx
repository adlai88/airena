'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge'
import { ChannelBadge } from '@/components/ui/channel-badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layout } from '@/components/layout';
import { PageHeader } from '@/components/page-header';
import { useChannel } from '@/hooks/useChannel';
import { arenaClient } from '@/lib/arena';
import { useAuth } from '@/components/auth-provider';
import { Spinner } from '@/components/ui/spinner';

export default function SetupPage() {
  const { channelSlug: connectedChannel, username: connectedUsername, isDefault: isDefaultChannel, refresh: refreshChannel } = useChannel();
  const { isSignedIn } = useAuth();
  const [channelSlug, setChannelSlug] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [switchingToChannel, setSwitchingToChannel] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [syncDetails, setSyncDetails] = useState<{
    channelTitle?: string;
    totalBlocks?: number;
    processedBlocks?: number;
    switchedToChannel?: string;
  }>({});
  
  // Session management for usage tracking
  const [sessionId, setSessionId] = useState<string>('');
  
  // Initialize session ID on component mount
  useEffect(() => {
    let storedSessionId = typeof window !== 'undefined' ? localStorage.getItem('airena_session_id') : null;
    if (!storedSessionId) {
      storedSessionId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      if (typeof window !== 'undefined') {
        localStorage.setItem('airena_session_id', storedSessionId);
      }
    }
    setSessionId(storedSessionId);
  }, []);
  
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'public' | 'private'>('public');
  const [publicChannels, setPublicChannels] = useState<{
    slug: string;
    title: string;
    thumbnailUrl?: string;
    lastSync: string;
    blockCount: number;
    isPrivate: boolean;
  }[]>([]);
  const [privateChannels, setPrivateChannels] = useState<{
    slug: string;
    title: string;
    thumbnailUrl?: string;
    lastSync: string;
    blockCount: number;
    isPrivate: boolean;
  }[]>([]);
  
  // Legacy compatibility - use activeTab to determine which channels to show
  const recentChannels = activeTab === 'public' ? publicChannels : privateChannels;
  const [hoveredChannel, setHoveredChannel] = useState<string | null>(null);
  const [blockLimitWarning, setBlockLimitWarning] = useState<string | null>(null);
  const [channelLimits, setChannelLimits] = useState<{
    channelCount: number;
    channelLimit: number;
    userTier: string;
    canAddMoreChannels: boolean;
  } | null>(null);
  const [largeChannelWarning, setLargeChannelWarning] = useState<{
    show: boolean;
    channelSlug: string;
    channelBlocks: number;
    monthlyUsed: number;
    monthlyLimit: number;
    monthlyRemaining: number;
    wouldExceedLimit: boolean;
    message: string;
  } | null>(null);
  const [selectedBlockCount, setSelectedBlockCount] = useState<number>(0);
  const [userConfirmedLargeChannel, setUserConfirmedLargeChannel] = useState(false);
  const router = useRouter();

  // Generate smart preset options for block selection
  const getBlockPresets = (maxBlocks: number, remaining: number) => {
    const presets = [];
    
    // Add progressive presets based on remaining blocks
    if (remaining >= 25) presets.push({ count: 25, label: 'Quick sample', description: '25 blocks' });
    if (remaining >= 50) presets.push({ count: 50, label: 'Medium collection', description: '50 blocks' });
    if (remaining >= 100) presets.push({ count: 100, label: 'Large subset', description: '100 blocks' });
    
    // Always add "All remaining" if it's different from the largest preset
    const lastPreset = presets[presets.length - 1];
    if (!lastPreset || lastPreset.count !== remaining) {
      presets.push({ 
        count: remaining, 
        label: 'All remaining', 
        description: `${remaining} blocks` 
      });
    }
    
    return presets;
  };

  // Initialize selected block count when large channel warning is shown
  useEffect(() => {
    if (largeChannelWarning?.show && selectedBlockCount === 0) {
      setSelectedBlockCount(largeChannelWarning.monthlyRemaining);
    }
  }, [largeChannelWarning, selectedBlockCount]);

  // Load recent channels and channel limits on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load public channels
        const publicChannelsResponse = await fetch('/api/recent-channels?type=public');
        if (publicChannelsResponse.ok) {
          const publicChannelsData = await publicChannelsResponse.json();
          setPublicChannels(publicChannelsData.channels || []);
        }

        // Load private channels
        const privateChannelsResponse = await fetch('/api/recent-channels?type=private');
        if (privateChannelsResponse.ok) {
          const privateChannelsData = await privateChannelsResponse.json();
          setPrivateChannels(privateChannelsData.channels || []);
        }

        // Load channel limits
        const limitsResponse = await fetch('/api/channel-limits', {
          headers: {
            'x-session-id': sessionId
          }
        });
        if (limitsResponse.ok) {
          const limitsData = await limitsResponse.json();
          setChannelLimits(limitsData);
        }
      } catch {
        console.log('Failed to load data');
      }
    };

    if (sessionId) {
      loadData();
    }
  }, [sessionId]);

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelSlug.trim()) return;

    // Check if we should show large channel warning first
    if (channelLimits?.userTier !== 'free' && !userConfirmedLargeChannel) {
      // For paid users, check if this might trigger a warning
      try {
        const info = await arenaClient.getChannel(channelSlug);
        if (info.length > 50) {
          const response = await fetch('/api/large-channel-check', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-session-id': sessionId
            },
            body: JSON.stringify({ channelBlocks: info.length })
          });
          
          if (response.ok) {
            const warningData = await response.json();
            if (warningData.showWarning) {
              // Show warning instead of proceeding
              setLargeChannelWarning({
                show: true,
                channelSlug,
                channelBlocks: info.length,
                monthlyUsed: warningData.monthlyUsed,
                monthlyLimit: warningData.monthlyLimit,
                monthlyRemaining: warningData.monthlyRemaining,
                wouldExceedLimit: warningData.wouldExceedLimit,
                message: warningData.message
              });
              // Set default selection to remaining blocks
              setSelectedBlockCount(warningData.monthlyRemaining);
              return; // Stop here, let user confirm
            }
          }
        }
      } catch (error) {
        console.error('Error checking channel size:', error);
        // Continue with sync if check fails
      }
    }

    setIsLoading(true);
    setError(null);
    setStatus('Starting sync...');
    setProgress(0);
    setSyncDetails({});

    // Set up timeout for sync process (10 minutes)
    const syncTimeout = setTimeout(() => {
      setError('Sync timed out. The process took too long. Please check the channel and try again.');
      setIsLoading(false);
    }, 10 * 60 * 1000);

    let hasCompleted = false;

    try {
      // Use EventSource for Server-Sent Events
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000);

      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          channelSlug: channelSlug.trim(),
          sessionId: sessionId,
          blockLimit: userConfirmedLargeChannel && selectedBlockCount > 0 ? selectedBlockCount : undefined
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Sync failed');
      }

      // Read the streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response stream available');
      }

      const decoder = new TextDecoder();
      let lastActivityTime = Date.now();
      
      // Monitor for stuck connections
      const activityTimeout = setInterval(() => {
        if (Date.now() - lastActivityTime > 2 * 60 * 1000) { // 2 minutes without activity
          clearInterval(activityTimeout);
          if (!hasCompleted) {
            setError('Connection timed out. The sync process may still be running in the background.');
            setIsLoading(false);
          }
        }
      }, 30000); // Check every 30 seconds
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        lastActivityTime = Date.now(); // Update activity timestamp
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ') && line.length > 6) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'complete' && data.result) {
                // Handle completion
                hasCompleted = true;
                clearTimeout(syncTimeout);
                clearInterval(activityTimeout);
                
                const result = data.result;
                
                // Check if sync failed due to usage limits
                if (!result.success && result.usageInfo && !result.usageInfo.canProcess) {
                  setError(result.errors?.[0] || 'Channel already processed. Upgrade to re-sync channels.');
                  setIsLoading(false);
                  return;
                }
                
                // Check if sync failed for other reasons
                if (!result.success) {
                  setError(result.errors?.[0] || 'Sync failed for unknown reason.');
                  setIsLoading(false);
                  return;
                }
                
                setProgress(100);
                setSyncDetails({
                  channelTitle: result.channelTitle,
                  totalBlocks: result.totalBlocks,
                  processedBlocks: result.processedBlocks,
                  switchedToChannel: channelSlug
                });
                setStatus(`Success! Processed ${result.processedBlocks} blocks from "${result.channelTitle || channelSlug}".`);
                
                // Update session ID if provided
                if (data.sessionId) {
                  setSessionId(data.sessionId);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('airena_session_id', data.sessionId);
                  }
                }
                
                // Refresh the hook to get updated channel info
                refreshChannel();
                
                // Reload recent channels and channel limits
                const loadData = async () => {
                  try {
                    // Load recent channels
                    // Reload both public and private channels
                    const publicResponse = await fetch('/api/recent-channels?type=public');
                    if (publicResponse.ok) {
                      const publicData = await publicResponse.json();
                      setPublicChannels(publicData.channels || []);
                    }

                    const privateResponse = await fetch('/api/recent-channels?type=private');
                    if (privateResponse.ok) {
                      const privateData = await privateResponse.json();
                      setPrivateChannels(privateData.channels || []);
                    }

                    // Load channel limits
                    const limitsResponse = await fetch('/api/channel-limits', {
                      headers: {
                        'x-session-id': sessionId
                      }
                    });
                    if (limitsResponse.ok) {
                      const limitsData = await limitsResponse.json();
                      setChannelLimits(limitsData);
                    }
                  } catch {
                    console.log('Failed to load data');
                  }
                };
                loadData();
                
                // Show success modal
                setTimeout(() => {
                  setShowSuccessModal(true);
                }, 1500);
                
              } else if (data.type === 'error') {
                // Handle error
                hasCompleted = true;
                clearTimeout(syncTimeout);
                clearInterval(activityTimeout);
                throw new Error(data.error || 'Sync failed');
                
              } else if (data.stage) {
                // Handle progress update
                setProgress(Math.round(data.progress) || 0);
                setStatus(data.message || 'Processing...');
                
                if (data.totalBlocks || data.processedBlocks) {
                  setSyncDetails(prev => ({
                    ...prev,
                    totalBlocks: data.totalBlocks || prev.totalBlocks,
                    processedBlocks: data.processedBlocks || prev.processedBlocks,
                  }));
                }
              }
            } catch (parseError) {
              console.error('Failed to parse SSE data:', parseError, 'Raw line:', line);
            }
          }
        }
      }

      // If we get here without completion, something went wrong
      if (!hasCompleted) {
        throw new Error('Sync completed without sending completion signal');
      }
      
    } catch (err) {
      clearTimeout(syncTimeout);
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Sync was cancelled due to timeout');
      } else {
        setError(err instanceof Error ? err.message : 'Sync failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const extractSlugFromUrl = (input: string): string => {
    // Handle full are.na URLs like https://www.are.na/username/channel-name
    const urlMatch = input.match(/are\.na\/[^/]+\/([^/?]+)/);
    if (urlMatch) {
      return urlMatch[1];
    }
    // Return as-is if it's already a slug
    return input.trim();
  };

  const isExistingChannel = (slug: string): boolean => {
    return recentChannels.some(channel => channel.slug === slug) || slug === connectedChannel;
  };

  const canAddChannel = (slug: string): boolean => {
    // If it's an existing channel, can always refresh
    if (isExistingChannel(slug)) {
      return true;
    }
    
    // If no channel limits data, assume can add
    if (!channelLimits) {
      return true;
    }
    
    // Check if user can add more channels
    return channelLimits.canAddMoreChannels;
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const slug = extractSlugFromUrl(value);
    setChannelSlug(slug);
    setBlockLimitWarning(null);
    setLargeChannelWarning(null);
    setUserConfirmedLargeChannel(false);
    
    if (slug) {
      try {
        // Fetch channel info to get block count
        const info = await arenaClient.getChannel(slug);
        
        // Check for free tier block limit warning
        if (channelLimits?.userTier === 'free' && info.length > 25) {
          setBlockLimitWarning(`This channel has ${info.length} blocks. Only the first 25 will be processed.`);
        }
        
        // Check for paid tier large channel warning
        if (channelLimits?.userTier !== 'free' && info.length > 50) {
          // Call the large channel warning API
          const response = await fetch('/api/large-channel-check', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-session-id': sessionId
            },
            body: JSON.stringify({ channelBlocks: info.length })
          });
          
          if (response.ok) {
            const warningData = await response.json();
            if (warningData.showWarning) {
              setLargeChannelWarning({
                show: true,
                channelSlug: slug,
                channelBlocks: info.length,
                monthlyUsed: warningData.monthlyUsed,
                monthlyLimit: warningData.monthlyLimit,
                monthlyRemaining: warningData.monthlyRemaining,
                wouldExceedLimit: warningData.wouldExceedLimit,
                message: warningData.message
              });
            }
          }
        }
      } catch {
        // Ignore errors for now (invalid slug, etc.)
      }
    }
  };

  const handleModalAction = (action: 'generate' | 'chat' | 'sync-another') => {
    setShowSuccessModal(false);
    
    switch (action) {
      case 'generate':
        console.log('Setup: Navigating to generate with channel:', connectedChannel);
        router.push(`/generate?channel=${connectedChannel}`);
        break;
      case 'chat':
        console.log('Setup: Navigating to chat with channel:', connectedChannel);
        router.push(`/chat/${connectedChannel}`);
        break;
      case 'sync-another':
        // Reset form for new channel
        setChannelSlug('');
        setStatus(null);
        setError(null);
        setSyncDetails({});
        break;
    }
  };

  const handleQuickSwitch = async (slug: string) => {
    setSwitchingToChannel(slug);
    setError(null);
    
    try {
      // Call the switch-channel API to persist the change
      const response = await fetch('/api/switch-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelSlug: slug })
      });

      if (!response.ok) {
        throw new Error('Failed to switch channel');
      }

      const result = await response.json();
      console.log('Setup: Channel switch successful:', result);
      
      // Update local state IMMEDIATELY
      setChannelSlug(slug);
      setStatus(null);
      setSyncDetails({
        channelTitle: result.channelTitle,
        totalBlocks: result.blockCount, // Use totalBlocks for switching
        switchedToChannel: slug, // Store the channel we switched to
      });
      
      // Refresh the hook to get updated channel info
      refreshChannel();
      
      console.log('Setup: Updated connectedChannel state to:', slug);
      
      // Show success modal for quick switching (no delay needed)
      setShowSuccessModal(true);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch channel');
    } finally {
      setSwitchingToChannel(null);
    }
  };


  return (
    <Layout>
      <PageHeader 
        title="Select Channel"
        subtitle={<span>Connect to any public <a href="https://www.are.na/" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-600 no-underline hover:no-underline transition-colors">Are.na</a> channel</span>}
        variant="standard"
      />
      <div className="max-w-lg sm:max-w-xl md:max-w-2xl mx-auto pb-8 sm:pb-12 px-4 sm:px-6">
        {/* Show current channel if connected */}
        {connectedChannel && (
          <div className="flex justify-center mb-6">
            <ChannelBadge 
              variant="connected" 
              channelSlug={connectedChannel} 
              username={connectedUsername} 
              isDefault={isDefaultChannel} 
            />
          </div>
        )}

        {/* Show channel limits for free tier users */}
        {channelLimits && channelLimits.userTier === 'free' && (
          <div className="flex justify-center mb-4">
            <div className="text-sm text-muted-foreground">
              Channels: <span className="font-medium">{channelLimits.channelCount}/{channelLimits.channelLimit}</span>
              {!channelLimits.canAddMoreChannels && (
                <span className="text-indigo-500 ml-2">
                  (<Button 
                    variant="link" 
                    className="p-0 h-auto font-semibold text-indigo-500 hover:text-indigo-600 text-sm"
                    onClick={() => window.location.href = isSignedIn ? '/pricing' : '/sign-up?redirect=/pricing'}
                  >
                    {isSignedIn ? 'Upgrade for unlimited channels' : 'Create account to upgrade'}
                  </Button>)
                </span>
              )}
            </div>
          </div>
        )}
        
        <Card>
          <CardContent className="space-y-6 p-4 sm:p-6">

            <form onSubmit={handleSync} className="space-y-6">
              <div>
                <label htmlFor="channel" className="block text-sm font-medium text-foreground mb-2">
                  Add or Refresh Channel
                </label>
                <Input
                  type="text"
                  id="channel"
                  value={channelSlug}
                  onChange={handleInputChange}
                  placeholder="channel-slug or https://are.na/user/channel-name"
                  disabled={isLoading}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Add a completely new channel or refresh any existing channel
                </p>
                {blockLimitWarning && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-xs">
                    {blockLimitWarning}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading || !channelSlug.trim() || !canAddChannel(channelSlug)}
                className="w-full min-h-[48px] sm:min-h-auto"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <div className="mr-2"><Spinner size={16} /></div>
                    Syncing... <span className="hidden sm:inline">(this might take a few minutes)</span>
                  </>
                ) : (
                  channelSlug && isExistingChannel(channelSlug) 
                    ? 'Refresh Channel' 
                    : (connectedChannel ? 'Add Channel' : 'Add Channel')
                )}
              </Button>

              {/* Channel limit warning */}
              {channelSlug && !canAddChannel(channelSlug) && (
                <div className="mt-2 p-2 bg-indigo-50 border border-indigo-200 rounded text-indigo-800 text-xs">
                  Channel limit reached ({channelLimits?.channelCount}/{channelLimits?.channelLimit}). 
                  {isSignedIn ? (
                    <>
                      <Button 
                        variant="link" 
                        className="p-0 h-auto font-semibold text-indigo-500 hover:text-indigo-600 ml-1"
                        onClick={() => window.location.href = '/pricing'}
                      >
                        Upgrade to Starter
                      </Button> for unlimited channels.
                    </>
                  ) : (
                    <>
                      <Button 
                        variant="link" 
                        className="p-0 h-auto font-semibold text-indigo-500 hover:text-indigo-600 ml-1"
                        onClick={() => window.location.href = '/sign-up?redirect=/pricing'}
                      >
                        Create free account
                      </Button> to upgrade for unlimited channels.
                    </>
                  )}
                </div>
              )}
            </form>

            {/* Progress Bar */}
            {isLoading && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">
                      {status || 'Processing...'}
                    </span>
                    <span className="text-muted-foreground font-medium">
                      {progress}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
                {syncDetails.totalBlocks !== undefined && syncDetails.processedBlocks !== undefined && (
                  <div className="text-xs text-muted-foreground text-center">
                    Processed {syncDetails.processedBlocks} of {syncDetails.totalBlocks} blocks
                  </div>
                )}
              </div>
            )}

            {/* Success Status */}
            {status && !error && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md relative">
                <button
                  onClick={() => setStatus(null)}
                  className="absolute top-2 right-2 p-1 hover:bg-green-100 rounded-full transition-colors"
                  aria-label="Close success message"
                >
                  <svg
                    className="w-4 h-4 text-green-600"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
                <p className="text-green-800 text-sm pr-8">{status}</p>
                {syncDetails.channelTitle && (
                  <div className="mt-2 text-xs text-green-700">
                    <p>Channel: {syncDetails.channelTitle}</p>
                    <p>Processed: {syncDetails.processedBlocks} blocks</p>
                  </div>
                )}
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-destructive text-sm">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setError(null);
                    setStatus(null);
                    setProgress(0);
                  }}
                  className="mt-2"
                >
                  Try Again
                </Button>
              </div>
            )}

            {/* Available Channels Section */}
            {(publicChannels.length > 0 || privateChannels.length > 0) && (
              <div className="pt-4 border-t">
                <h3 className="text-sm font-medium text-foreground mb-2">Available Channels</h3>
                
                <Tabs 
                  value={activeTab} 
                  onValueChange={(value) => setActiveTab(value as 'public' | 'private')}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2 mb-3">
                    <TabsTrigger value="public">Public Channels</TabsTrigger>
                    <TabsTrigger value="private">
                      {channelLimits?.userTier === 'free' ? '🔒 Private' : 'Private Channels'}
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="public" className="mt-0">
                    {publicChannels.length > 0 ? (
                      <>
                        <p className="text-xs text-muted-foreground mb-3">Click any channel to switch instantly</p>
                        <div className="grid gap-2">
                          {publicChannels.slice(0, 10).map((channel) => (
                    <div
                      key={channel.slug}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        switchingToChannel ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50 hover:bg-muted/50'
                      } ${
                        connectedChannel === channel.slug ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                      onClick={() => !switchingToChannel && handleQuickSwitch(channel.slug)}
                      onMouseEnter={() => setHoveredChannel(channel.slug)}
                      onMouseLeave={() => setHoveredChannel(null)}
                      onFocus={() => setHoveredChannel(channel.slug)}
                      onBlur={() => setHoveredChannel(null)}
                      tabIndex={0}
                    >
                      <div className="flex items-center justify-between min-w-0">
                        <div className="flex items-center flex-1 min-w-0 pr-2">
                          {/* Thumbnail */}
                          {channel.thumbnailUrl ? (
                            <div className="relative w-10 h-10 flex-shrink-0 mr-3">
                              <Image 
                                src={channel.thumbnailUrl} 
                                alt={`${channel.title || channel.slug} thumbnail`}
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
                                {(channel.title || channel.slug).charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {channel.title || channel.slug}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {channel.blockCount} blocks
                              <span className="hidden sm:inline"> • Last synced {new Date(channel.lastSync).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {connectedChannel === channel.slug ? (
                            <Badge variant="secondary" className="text-xs px-2 py-1">
                              Active
                            </Badge>
                          ) : switchingToChannel === channel.slug ? (
                            <Badge variant="outline" className="text-xs px-2 py-1">
                              <div className="mr-1"><Spinner size={8} /></div>
                              <span className="hidden sm:inline">Connecting...</span>
                              <span className="sm:hidden">•••</span>
                            </Badge>
                          ) : (
                            hoveredChannel === channel.slug && (
                              <Badge variant="outline" className="text-xs px-2 py-1">
                                Switch
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground py-8 text-center">
                        No public channels available yet
                      </p>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="private" className="mt-0">
                    {channelLimits?.userTier === 'free' ? (
                      <div className="text-center py-8 space-y-4">
                        <div className="text-4xl">🔒</div>
                        <div>
                          <h4 className="font-medium text-foreground mb-2">Private Channels</h4>
                          <p className="text-sm text-muted-foreground mb-4">
                            Access your private Are.na channels with a premium subscription
                          </p>
                          <Button
                            variant="default"
                            onClick={() => window.open('/pricing', '_blank')}
                            className="px-6"
                          >
                            Upgrade to Premium
                          </Button>
                        </div>
                      </div>
                    ) : privateChannels.length > 0 ? (
                      <>
                        <p className="text-xs text-muted-foreground mb-3">Your private channels</p>
                        <div className="grid gap-2">
                          {privateChannels.slice(0, 10).map((channel) => (
                            <div
                              key={channel.slug}
                              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                                switchingToChannel ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50 hover:bg-muted/50'
                              } ${
                                connectedChannel === channel.slug ? 'border-primary bg-primary/5' : 'border-border'
                              }`}
                              onClick={() => !switchingToChannel && handleQuickSwitch(channel.slug)}
                              onMouseEnter={() => setHoveredChannel(channel.slug)}
                              onMouseLeave={() => setHoveredChannel(null)}
                              onFocus={() => setHoveredChannel(channel.slug)}
                              onBlur={() => setHoveredChannel(null)}
                              tabIndex={0}
                            >
                              <div className="flex items-center justify-between min-w-0">
                                <div className="flex items-center flex-1 min-w-0 pr-2">
                                  {/* Thumbnail */}
                                  {channel.thumbnailUrl ? (
                                    <div className="relative w-10 h-10 flex-shrink-0 mr-3">
                                      <Image 
                                        src={channel.thumbnailUrl} 
                                        alt={`${channel.title || channel.slug} thumbnail`}
                                        fill
                                        className="rounded-md object-cover"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.style.visibility = 'hidden';
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0 mr-3">
                                      <span className="text-xs text-muted-foreground font-medium">
                                        {(channel.title || channel.slug).charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                  )}
                                  
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate flex items-center gap-2">
                                      <span className="truncate">{channel.title || channel.slug}</span>
                                      <Badge variant="secondary" className="text-xs flex-shrink-0">Private</Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                      {channel.blockCount} blocks
                                      <span className="hidden sm:inline"> • Last synced {new Date(channel.lastSync).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {connectedChannel === channel.slug ? (
                                    <Badge variant="secondary" className="text-xs px-2 py-1">
                                      Active
                                    </Badge>
                                  ) : switchingToChannel === channel.slug ? (
                                    <Badge variant="outline" className="text-xs px-2 py-1">
                                      <div className="mr-1"><Spinner size={8} /></div>
                                      <span className="hidden sm:inline">Connecting...</span>
                                      <span className="sm:hidden">•••</span>
                                    </Badge>
                                  ) : (
                                    hoveredChannel === channel.slug && (
                                      <Badge variant="outline" className="text-xs px-2 py-1">
                                        Switch
                                      </Badge>
                                    )
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground py-8 text-center">
                        No private channels synced yet
                      </p>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Large Channel Warning Modal */}
      <Dialog open={largeChannelWarning?.show || false} onOpenChange={(open) => {
        if (!open) {
          setLargeChannelWarning(null);
        }
      }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl">
              ⚠️ Large Channel Detected
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm sm:text-base">
              {largeChannelWarning?.message}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="p-3 bg-muted rounded-md text-sm">
              <div className="flex justify-between mb-1">
                <span>Monthly Usage:</span>
                <span className="font-medium">
                  {largeChannelWarning?.monthlyUsed}/{largeChannelWarning?.monthlyLimit} blocks
                </span>
              </div>
              <div className="flex justify-between">
                <span>Remaining:</span>
                <span className="font-medium">
                  {largeChannelWarning?.monthlyRemaining} blocks
                </span>
              </div>
            </div>

            {/* Block Count Selection */}
            <div className="space-y-3">
              <div className="text-sm font-medium">
                How many blocks would you like to sync from this {largeChannelWarning?.channelBlocks}-block channel?
              </div>
              
              <div className="grid gap-2">
                {largeChannelWarning && getBlockPresets(largeChannelWarning.channelBlocks, largeChannelWarning.monthlyRemaining).map((preset) => (
                  <Button
                    key={preset.count}
                    variant={selectedBlockCount === preset.count ? "default" : "outline"}
                    onClick={() => setSelectedBlockCount(preset.count)}
                    className="justify-between h-auto p-3"
                  >
                    <div className="text-left">
                      <div className="font-medium">{preset.description}</div>
                      <div className="text-xs text-muted-foreground">{preset.label}</div>
                    </div>
                    {selectedBlockCount === preset.count && (
                      <div className="text-xs">✓</div>
                    )}
                  </Button>
                ))}
              </div>
            </div>

            {/* Warning if would exceed limit */}
            {selectedBlockCount > (largeChannelWarning?.monthlyRemaining || 0) && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                <strong>Warning:</strong> This would use more blocks than you have remaining this month.
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              {largeChannelWarning?.wouldExceedLimit && selectedBlockCount === largeChannelWarning.monthlyRemaining ? (
                <Button 
                  onClick={() => window.location.href = isSignedIn ? '/pricing' : '/sign-up?redirect=/pricing'}
                  className="w-full"
                  variant="default"
                >
                  {isSignedIn ? 'Upgrade for More Blocks' : 'Create Account'}
                </Button>
              ) : null}
              
              <div className="flex gap-3">
                <Button 
                  onClick={() => {
                    setLargeChannelWarning(null);
                    setUserConfirmedLargeChannel(false);
                    setSelectedBlockCount(0);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    setUserConfirmedLargeChannel(true);
                    setLargeChannelWarning(null);
                    // Proceed with sync using selected block count
                    const form = document.querySelector('form') as HTMLFormElement;
                    if (form) {
                      form.requestSubmit();
                    }
                  }}
                  className="flex-1"
                  disabled={selectedBlockCount === 0}
                  variant={selectedBlockCount > (largeChannelWarning?.monthlyRemaining || 0) ? "destructive" : "default"}
                >
                  {selectedBlockCount > (largeChannelWarning?.monthlyRemaining || 0) 
                    ? `Process ${selectedBlockCount} Anyway` 
                    : `Process ${selectedBlockCount} Blocks`
                  }
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm sm:max-w-lg max-h-[90vh] overflow-y-auto break-words overflow-wrap-anywhere">
          <DialogHeader className="text-center">
            <DialogTitle className="text-xl sm:text-2xl">
              ✅ {syncDetails.processedBlocks !== undefined ? 'Channel Synced Successfully!' : 'Channel Connected!'}
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm sm:text-base break-words">
              {syncDetails.processedBlocks !== undefined ? (
                // Syncing flow - show new blocks processed
                <>
                  The <span className="font-medium break-words">{syncDetails.switchedToChannel || connectedChannel}</span> channel is ready with{' '}
                  <span className="font-medium">{syncDetails.processedBlocks}</span> new blocks processed.
                </>
              ) : (
                // Switching flow - show total blocks
                <>
                  Connected to <span className="font-medium break-words">{syncDetails.switchedToChannel || connectedChannel}</span> channel with{' '}
                  <span className="font-medium">{syncDetails.totalBlocks || 0}</span> total blocks.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 sm:space-y-4 pt-4 sm:pt-6">
            <p className="text-xs sm:text-sm text-muted-foreground text-center">
              What would you like to do next?
            </p>
            
            <div className="space-y-2 sm:space-y-3">
              <Button 
                onClick={() => handleModalAction('chat')}
                className="w-full h-auto p-3 sm:p-4 text-left min-h-[48px] sm:min-h-[56px] cursor-pointer justify-start"
                variant="outline"
              >
                <div className="space-y-1 text-left">
                  <div className="font-medium text-sm sm:text-base">Chat with This Channel</div>
                  <div className="text-xs sm:text-sm text-muted-foreground font-normal">
                    Ask questions about this content
                  </div>
                </div>
              </Button>
              
              <Button 
                onClick={() => handleModalAction('generate')}
                className="w-full h-auto p-3 sm:p-4 text-left min-h-[48px] sm:min-h-[56px] cursor-pointer justify-start"
                variant="outline"
              >
                <div className="space-y-1 text-left">
                  <div className="font-medium text-sm sm:text-base">Generate Content</div>
                  <div className="text-xs sm:text-sm text-muted-foreground font-normal">
                    Create newsletters and insights
                  </div>
                </div>
              </Button>
            </div>
            
            <div className="pt-2 border-t">
              <Button 
                onClick={() => handleModalAction('sync-another')}
                className="w-full min-h-[40px] sm:min-h-[44px] text-sm"
                variant="ghost"
                size="sm"
              >
                ← Sync Different Channel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}