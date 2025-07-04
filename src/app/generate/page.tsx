'use client';

export const dynamic = "force-dynamic";

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function GeneratePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [channelSlug, setChannelSlug] = useState(searchParams.get('channel') || '');
  const [options, setOptions] = useState<{
    tone: 'professional' | 'casual' | 'analytical' | 'personal';
    length: 'brief' | 'standard' | 'detailed';
    focus: 'insights' | 'resources' | 'trends' | 'actionable';
  }>({
    tone: 'professional',
    length: 'standard',
    focus: 'insights',
  });
  
  const [completion, setCompletion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelSlug.trim()) {
      alert('Please enter a channel slug');
      return;
    }

    setIsLoading(true);
    setError(null);
    setCompletion('');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelSlug,
          options,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle the streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let result = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        result += chunk;
        setCompletion(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Generation failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(completion);
      setCopied(true);
      // Reset the copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = completion;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed: ', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Generate Newsletter
          </h1>
          <p className="text-gray-600">
            Create AI-powered insights from your curated Are.na content
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Channel Slug
                </label>
                <input
                  type="text"
                  value={channelSlug}
                  onChange={(e) => setChannelSlug(e.target.value)}
                  placeholder="r-startups-founder-mode"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tone
                </label>
                <select
                  value={options.tone}
                  onChange={(e) => setOptions({...options, tone: e.target.value as 'professional' | 'casual' | 'analytical' | 'personal'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                >
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="analytical">Analytical</option>
                  <option value="personal">Personal</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Length
                </label>
                <select
                  value={options.length}
                  onChange={(e) => setOptions({...options, length: e.target.value as 'brief' | 'standard' | 'detailed'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                >
                  <option value="brief">Brief</option>
                  <option value="standard">Standard</option>
                  <option value="detailed">Detailed</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Focus
                </label>
                <select
                  value={options.focus}
                  onChange={(e) => setOptions({...options, focus: e.target.value as 'insights' | 'resources' | 'trends' | 'actionable'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                >
                  <option value="insights">Key Insights</option>
                  <option value="resources">Resources</option>
                  <option value="trends">Trends</option>
                  <option value="actionable">Actionable</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isLoading || !channelSlug.trim()}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Generating...' : 'Generate Newsletter'}
              </button>
              
              <button
                type="button"
                onClick={() => router.push('/chat')}
                className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Switch to Chat
              </button>
            </div>
          </form>
        </div>

        {/* Output */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Newsletter</h2>
            {completion && (
              <button
                onClick={handleCopyToClipboard}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            )}
          </div>
          
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{error.message}</p>
            </div>
          )}
          
          <div className="prose max-w-none">
            {isLoading && !completion && (
              <div className="flex items-center text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2"></div>
                Generating newsletter...
              </div>
            )}
            
            {completion ? (
              <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                {completion}
              </div>
            ) : !isLoading && (
              <p className="text-gray-500 italic">
                Configure your settings above and click &quot;Generate Newsletter&quot; to create your AI-powered content digest.
              </p>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Need to sync a different channel?{' '}
            <button
              onClick={() => router.push('/setup')}
              className="text-blue-600 hover:text-blue-700"
            >
              Back to Setup
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}