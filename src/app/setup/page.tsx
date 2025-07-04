'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Layout } from '@/components/layout';
import { PageHeader } from '@/components/page-header';

export default function SetupPage() {
  const [channelSlug, setChannelSlug] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [syncDetails, setSyncDetails] = useState<{
    channelTitle?: string;
    totalBlocks?: number;
    processedBlocks?: number;
  }>({});
  const router = useRouter();

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
        // Redirect to options page after successful sync
        setTimeout(() => {
          router.push(`/options?channel=${channelSlug}`);
        }, 2000);
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

  return (
    <Layout>
      <PageHeader 
        title="Airena Setup"
        subtitle="Connect your Are.na channel to create an intelligent agent"
        variant="narrow"
      />
      <div className="max-w-md mx-auto pb-12">
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
                  Enter a channel slug (e.g., &quot;r-startups-founder-mode&quot;) or paste the full URL
                </p>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !channelSlug.trim()}
                className="w-full"
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

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Already synced a channel?{' '}
                <Button
                  variant="link"
                  onClick={() => router.push('/generate')}
                  className="p-0 h-auto text-xs"
                >
                  Go to Generate
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}