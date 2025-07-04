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

export default function SetupPage() {
  const [channelSlug, setChannelSlug] = useState('');
  const [connectedChannel, setConnectedChannel] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [syncDetails, setSyncDetails] = useState<{
    channelTitle?: string;
    totalBlocks?: number;
    processedBlocks?: number;
  }>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const router = useRouter();

  // Check for existing connected channel on mount
  useEffect(() => {
    const checkConnectedChannel = async () => {
      try {
        // Simple check - try to get channel info from our API
        const response = await fetch('/api/channel-info', {
          method: 'GET',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.channelSlug) {
            setConnectedChannel(data.channelSlug);
          }
        }
      } catch {
        // If no channel info available, that's fine - user hasn't synced yet
        console.log('No existing channel found');
      }
    };

    checkConnectedChannel();
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
      // Call our sync API endpoint (we'll need to create this)
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelSlug: channelSlug.trim() })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Sync failed');
      }

      const result = await response.json();
      
      if (result.success) {
        setProgress(100);
        setSyncDetails({
          channelTitle: result.channelTitle,
          totalBlocks: result.totalBlocks,
          processedBlocks: result.processedBlocks
        });
        setStatus(`Success! Processed ${result.processedBlocks} blocks from "${result.channelTitle || channelSlug}".`);
        // Update connected channel state
        setConnectedChannel(channelSlug);
        // Show success modal instead of redirecting
        setTimeout(() => {
          setShowSuccessModal(true);
        }, 1500);
      } else {
        setError(`Sync failed: ${result.errors?.join(', ') || 'Unknown error'}`);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const slug = extractSlugFromUrl(value);
    setChannelSlug(slug);
  };

  const handleModalAction = (action: 'generate' | 'chat' | 'sync-another') => {
    setShowSuccessModal(false);
    
    switch (action) {
      case 'generate':
        router.push(`/generate?channel=${connectedChannel}`);
        break;
      case 'chat':
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

  return (
    <Layout>
      <PageHeader 
        title="Sync Are.na Channel"
        subtitle="Connect your Are.na channel to start"
        variant="narrow"
      />
      <div className="max-w-md mx-auto pb-8 sm:pb-12 px-4 sm:px-0">
        {/* Show current channel if connected */}
        {connectedChannel && (
          <div className="flex justify-center mb-6">
            <Badge variant="secondary" className="px-3 py-1">
              🔗 Currently connected to: {connectedChannel}
            </Badge>
          </div>
        )}
        
        <Card className="p-8">
          <CardContent className="space-y-6 pt-8">

            <form onSubmit={handleSync} className="space-y-6">
              <div>
                <label htmlFor="channel" className="block text-sm font-medium text-foreground mb-2">
                  Are.na Channel
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
                  {connectedChannel ? 
                    'Enter a different channel slug to switch, or re-sync the current channel' :
                    'Enter a channel slug (e.g., "r-startups-founder-mode") or paste the full URL'
                  }
                </p>
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
                    Syncing...
                  </>
                ) : (
                  'Sync Channel'
                )}
              </Button>
            </form>

            {/* Progress Bar */}
            {isLoading && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Syncing progress...</div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
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
              ✅ Channel Synced Successfully!
            </DialogTitle>
            <DialogDescription className="mt-2">
              Your <span className="font-medium">{connectedChannel}</span> channel is ready with{' '}
              <span className="font-medium">{syncDetails.processedBlocks || 0}</span> curated items processed.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-6">
            <p className="text-sm text-muted-foreground text-center">
              What would you like to do next?
            </p>
            
            <div className="space-y-3">
              <Button 
                onClick={() => handleModalAction('chat')}
                className="w-full h-auto p-4 text-left min-h-[56px] sm:min-h-auto"
                variant="outline"
              >
                <div className="space-y-1">
                  <div className="font-medium flex items-center gap-2">
                    💬 Chat with Research
                  </div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Ask questions and explore your content conversationally
                  </div>
                </div>
              </Button>
              
              <Button 
                onClick={() => handleModalAction('generate')}
                className="w-full h-auto p-4 text-left min-h-[56px] sm:min-h-auto"
                variant="outline"
              >
                <div className="space-y-1">
                  <div className="font-medium flex items-center gap-2">
                    📝 Generate Content
                  </div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Create newsletters, summaries, and insights from your research
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