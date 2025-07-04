'use client';

export const dynamic = "force-dynamic";

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function ChatPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [channelSlug, setChannelSlug] = useState(searchParams.get('channel') || 'r-startups-founder-mode');

  const [messages, setMessages] = useState<Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
  }>>([
    {
      id: 'welcome',
      role: 'assistant' as const,
      content: `Hi! I'm your AI assistant with access to content from the "${channelSlug}" channel. Ask me anything about the curated research, and I'll provide insights based on the embedded content.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelSlug.trim()) {
      alert('Please enter a channel slug');
      return;
    }
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: input.trim(),
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          channelSlug,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Create assistant message for streaming
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: '',
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let assistantContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantContent += chunk;
        
        // Update the assistant message in real-time
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMessage.id 
              ? { ...msg, content: assistantContent }
              : msg
          )
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Chat failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Chat with Your Research
          </h1>
          <p className="text-gray-600">
            Ask questions about your curated Are.na content
          </p>
        </div>

        {/* Channel Selector */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Channel Slug
              </label>
              <input
                type="text"
                value={channelSlug}
                onChange={(e) => setChannelSlug(e.target.value)}
                placeholder="r-startups-founder-mode"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
              />
            </div>
            <button
              onClick={() => router.push('/generate')}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Switch to Generate
            </button>
          </div>
        </div>

        {/* Chat Container */}
        <div className="bg-white rounded-lg shadow-sm">
          {/* Messages */}
          <div className="h-96 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-3xl px-4 py-2 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2"></div>
                    Thinking...
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="px-6 pb-2">
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800 text-sm">{error.message}</p>
              </div>
            </div>
          )}

          {/* Input Form */}
          <div className="border-t border-gray-200 p-6">
            <form onSubmit={handleChatSubmit} className="flex gap-4">
              <input
                type="text"
                value={input}
                onChange={handleInputChange}
                placeholder="Ask about your research... (e.g., 'What are the key insights about founder mode?')"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim() || !channelSlug.trim()}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </form>
          </div>
        </div>

        {/* Suggested Questions */}
        <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Suggested Questions:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              "What are the main themes in this research?",
              "Summarize the key insights",
              "What tools or resources are mentioned?",
              "What are the practical takeaways?",
              "How do these ideas connect together?",
              "What trends are emerging?"
            ].map((question, index) => (
              <button
                key={index}
                onClick={() => setInput(question)}
                className="text-left text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-2 rounded"
              >
                {question}
              </button>
            ))}
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