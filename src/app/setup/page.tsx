'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Layout } from '@/components/layout';
import { PageHeader } from '@/components/page-header';
import { useChannel } from '@/hooks/useChannel';
import { arenaClient } from '@/lib/arena';

export default function SetupPage() {
  const { channelSlug: connectedChannel, username: connectedUsername, isDefault: isDefaultChannel, refresh: refreshChannel } = useChannel();
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [recentChannels, setRecentChannels] = useState<{
    slug: string;
    title: string;
    lastSync: string;
    blockCount: number;
  }[]>([]);
  const [hoveredChannel, setHoveredChannel] = useState<string | null>(null);
  const [blockLimitWarning, setBlockLimitWarning] = useState<string | null>(null);
  const router = useRouter();

  // Load recent channels on mount
  useEffect(() => {
    const loadRecentChannels = async () => {
      try {
        const response = await fetch('/api/recent-channels');
        if (response.ok) {
          const data = await response.json();
          setRecentChannels(data.channels || []);
        }
      } catch {
        console.log('Failed to load recent channels');
      }
    };

    loadRecentChannels();
  }, []);

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelSlug.trim()) return;

    setIsLoading(true);
    setError(null);
    setStatus('Starting sync...');
    setProgress(0);
    setSyncDetails({});

    try {
      // Use EventSource for Server-Sent Events
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelSlug: channelSlug.trim() })
      });

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
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ') && line.length > 6) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'complete' && data.result) {
                // Handle completion
                const result = data.result;
                setProgress(100);
                setSyncDetails({
                  channelTitle: result.channelTitle,
                  totalBlocks: result.totalBlocks,
                  processedBlocks: result.processedBlocks,
                  switchedToChannel: channelSlug
                });
                setStatus(`Success! Processed ${result.processedBlocks} blocks from "${result.channelTitle || channelSlug}".`);
                
                // Refresh the hook to get updated channel info
                refreshChannel();
                
                // Reload recent channels
                const loadRecentChannels = async () => {
                  try {
                    const response = await fetch('/api/recent-channels');
                    if (response.ok) {
                      const data = await response.json();
                      setRecentChannels(data.channels || []);
                    }
                  } catch {
                    console.log('Failed to load recent channels');
                  }
                };
                loadRecentChannels();
                
                // Show success modal
                setTimeout(() => {
                  setShowSuccessModal(true);
                }, 1500);
                
              } else if (data.type === 'error') {
                // Handle error
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
              console.log('Failed to parse SSE data:', parseError);
            }
          }
        }
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
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

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const slug = extractSlugFromUrl(value);
    setChannelSlug(slug);
    setBlockLimitWarning(null);
    if (slug) {
      try {
        // Fetch channel info to get block count
        const info = await arenaClient.getChannel(slug);
        if (info.length > 100) {
          setBlockLimitWarning(`This channel has ${info.length} blocks. Only the first 100 will be processed.`);
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
        router.push(`/chat?channel=${connectedChannel}`);
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
        title="Channel Setup"
        subtitle="Manage your Are.na channel connection"
        variant="standard"
      />
      <div className="max-w-lg sm:max-w-xl md:max-w-2xl mx-auto pb-8 sm:pb-12 px-4 sm:px-6">
        {/* Show current channel if connected */}
        {connectedChannel && (
          <div className="flex justify-center mb-6">
            <Badge variant="secondary" className="px-3 py-1">
              🔗 {isDefaultChannel ? 'Default channel' : 'Connected to'}: <a 
                href={connectedUsername ? `https://are.na/${connectedUsername}/${connectedChannel}` : `https://are.na/${connectedChannel}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:no-underline transition-all"
              >
                {connectedChannel}
              </a>
              {isDefaultChannel && <span className="ml-1 text-xs">(curated)</span>}
            </Badge>
          </div>
        )}
        
        <Card className="p-8">
          <CardContent className="space-y-6 pt-8">

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
                disabled={isLoading || !channelSlug.trim()}
                className="w-full min-h-[48px] sm:min-h-auto"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                    Syncing... <span className="hidden sm:inline">(this might take a few minutes)</span>
                  </>
                ) : (
                  channelSlug && isExistingChannel(channelSlug) 
                    ? 'Refresh Channel' 
                    : (connectedChannel ? 'Add Channel' : 'Add Channel')
                )}
              </Button>
            </form>

            {/* Available Channels Section */}
            {recentChannels.length > 0 && (
              <div className="pt-4 border-t">
                <h3 className="text-sm font-medium text-foreground mb-2">Available Channels</h3>
                <p className="text-xs text-muted-foreground mb-3">Click any channel to switch instantly</p>
                <div className="grid gap-2">
                  {recentChannels.slice(0, 5).map((channel) => (
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
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {channel.title || channel.slug}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {channel.blockCount} blocks • Last synced {new Date(channel.lastSync).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          {connectedChannel === channel.slug ? (
                            <Badge variant="secondary" className="text-xs">
                              Active
                            </Badge>
                          ) : switchingToChannel === channel.slug ? (
                            <Badge variant="outline" className="text-xs">
                              <div className="animate-spin rounded-full h-2 w-2 border-b border-current mr-1"></div>
                              Connecting...
                            </Badge>
                          ) : (
                            hoveredChannel === channel.slug && (
                              <Badge variant="outline" className="text-xs">
                                Switch
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-800 text-sm">{status}</p>
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
          </CardContent>
        </Card>
      </div>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="mx-4 max-w-lg sm:mx-auto">
          <DialogHeader className="text-center">
            <DialogTitle className="text-2xl">
              ✅ {syncDetails.processedBlocks !== undefined ? 'Channel Synced Successfully!' : 'Channel Connected!'}
            </DialogTitle>
            <DialogDescription className="mt-2">
              {syncDetails.processedBlocks !== undefined ? (
                // Syncing flow - show new blocks processed
                <>
                  Your <span className="font-medium">{syncDetails.switchedToChannel || connectedChannel}</span> channel is ready with{' '}
                  <span className="font-medium">{syncDetails.processedBlocks}</span> new blocks processed.
                </>
              ) : (
                // Switching flow - show total blocks
                <>
                  Connected to <span className="font-medium">{syncDetails.switchedToChannel || connectedChannel}</span> channel with{' '}
                  <span className="font-medium">{syncDetails.totalBlocks || 0}</span> total blocks.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-6">
            <p className="text-sm text-muted-foreground text-center">
              What would you like to do next?
            </p>
            
            <div className="space-y-3">
              <Button 
                onClick={() => handleModalAction('chat')}
                className="w-full h-auto p-4 text-left min-h-[56px] sm:min-h-auto cursor-pointer justify-start"
                variant="outline"
              >
                <div className="space-y-1 text-left">
                  <div className="font-medium">Chat with Your Channel</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Ask questions and explore your channel conversationally
                  </div>
                </div>
              </Button>
              
              <Button 
                onClick={() => handleModalAction('generate')}
                className="w-full h-auto p-4 text-left min-h-[56px] sm:min-h-auto cursor-pointer justify-start"
                variant="outline"
              >
                <div className="space-y-1 text-left">
                  <div className="font-medium">Generate Content</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Create newsletters, summaries, and insights from your channel
                  </div>
                </div>
              </Button>
            </div>
            
            <div className="pt-2 border-t">
              <Button 
                onClick={() => handleModalAction('sync-another')}
                className="w-full min-h-[44px] sm:min-h-auto"
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