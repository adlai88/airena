'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupPage() {
  const [channelSlug, setChannelSlug] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelSlug.trim()) return;

    setIsLoading(true);
    setError(null);
    setStatus('Starting sync...');

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
        setStatus(`Success! Processed ${result.processedBlocks} blocks.`);
        // Redirect to generate page after successful sync
        setTimeout(() => {
          router.push(`/generate?channel=${channelSlug}`);
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
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-sm p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Airena Setup
          </h1>
          <p className="text-gray-600">
            Connect your Are.na channel to create an intelligent newsletter
          </p>
        </div>

        <form onSubmit={handleSync} className="space-y-6">
          <div>
            <label htmlFor="channel" className="block text-sm font-medium text-gray-700 mb-2">
              Are.na Channel
            </label>
            <input
              type="text"
              id="channel"
              value={channelSlug}
              onChange={handleInputChange}
              placeholder="channel-slug or https://are.na/user/channel-name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              disabled={isLoading}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter a channel slug (e.g., &quot;r-startups-founder-mode&quot;) or paste the full URL
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading || !channelSlug.trim()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Syncing...' : 'Sync Channel'}
          </button>
        </form>

        {status && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-800 text-sm">{status}</p>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Already synced a channel?{' '}
            <button
              onClick={() => router.push('/generate')}
              className="text-blue-600 hover:text-blue-700"
            >
              Go to Generate
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}