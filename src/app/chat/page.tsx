'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Layout } from '@/components/layout';
import { PageHeader } from '@/components/page-header';

function ChatContent() {
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
    <Layout>
      <PageHeader 
        title="Chat with Your Research"
        subtitle="Ask questions about your curated Are.na content"
      />
      <div className="max-w-4xl mx-auto pb-12 px-4">

        {/* Channel Selector */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Channel Slug
                </label>
                <Input
                  type="text"
                  value={channelSlug}
                  onChange={(e) => setChannelSlug(e.target.value)}
                  placeholder="r-startups-founder-mode"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => router.push(`/generate?channel=${channelSlug}`)}
              >
                Switch to Generate
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Chat Container */}
        <Card>
          {/* Messages */}
          <div className="h-96 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-3xl px-4 py-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted text-muted-foreground px-4 py-3 rounded-lg">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="px-6 pb-2">
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-destructive text-sm">{error.message}</p>
              </div>
            </div>
          )}

          {/* Input Form */}
          <div className="border-t border-border p-6">
            <form onSubmit={handleChatSubmit} className="flex gap-4">
              <Input
                type="text"
                value={input}
                onChange={handleInputChange}
                placeholder="Ask about your research... (e.g., 'What are the key insights about founder mode?')"
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim() || !channelSlug.trim()}
              >
                Send
              </Button>
            </form>
          </div>
        </Card>

        {/* Suggested Questions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Suggested Questions</CardTitle>
            <CardDescription>Click any question to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                "What are the main themes in this research?",
                "Summarize the key insights",
                "What tools or resources are mentioned?",
                "What are the practical takeaways?",
                "How do these ideas connect together?",
                "What trends are emerging?"
              ].map((question, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  onClick={() => setInput(question)}
                  className="text-left justify-start h-auto p-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  {question}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Need to sync a different channel?{' '}
            <Button
              variant="link"
              onClick={() => router.push('/setup')}
              className="p-0 h-auto text-sm"
            >
              Back to Setup
            </Button>
          </p>
        </div>
      </div>
    </Layout>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading chat interface...</p>
        </div>
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}