'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Layout } from '@/components/layout';
import { PageHeader } from '@/components/page-header';

function ChatContent() {
  const searchParams = useSearchParams();
  const [channelSlug, setChannelSlug] = useState('r-startups-founder-mode'); // fallback

  // Get actual connected channel on mount
  useEffect(() => {
    const getConnectedChannel = async () => {
      try {
        const response = await fetch('/api/channel-info');
        if (response.ok) {
          const data = await response.json();
          if (data.channelSlug) {
            setChannelSlug(data.channelSlug);
          }
        }
      } catch {
        console.log('Using fallback channel');
      }
    };

    // Check URL params first, then database
    const urlChannel = searchParams.get('channel');
    if (urlChannel) {
      setChannelSlug(urlChannel);
    } else {
      getConnectedChannel();
    }
  }, [searchParams]);

  const [messages, setMessages] = useState<Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
  }>>([
    {
      id: 'welcome',
      role: 'assistant' as const,
      content: `Hi! I'm Airena. Ask me anything about your Are.na content.`,
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
        title="Chat with Your Channel"
        subtitle="Jam with your Are.na content"
      />
      <div className="max-w-4xl mx-auto pb-8 sm:pb-12 px-4 sm:px-6">
        {/* Connected Channel Badge */}
        <div className="flex justify-center mb-6">
          <Badge variant="secondary" className="px-3 py-1">
            🔗 Connected to: {channelSlug}
          </Badge>
        </div>

        {/* Chat Container */}
        <Card>
          {/* Messages */}
          <div className="h-64 sm:h-96 overflow-y-scroll p-4 sm:p-6 space-y-3 sm:space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-3xl px-3 sm:px-4 py-2 sm:py-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed">{message.content}</div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted text-muted-foreground px-3 sm:px-4 py-2 sm:py-3 rounded-lg">
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
          <div className="border-t border-border p-4 sm:p-6">
            <form onSubmit={handleChatSubmit} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Input
                type="text"
                value={input}
                onChange={handleInputChange}
                placeholder="Ask about your channel... (e.g., 'What are the key insights?')"
                disabled={isLoading}
                className="flex-1 min-h-[44px]"
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim() || !channelSlug.trim()}
                className="min-h-[44px] sm:min-h-auto px-6 sm:px-4"
              >
                Send
              </Button>
            </form>
          </div>
        </Card>

        {/* Suggested Questions */}
        <div className="mt-8">
          <div className="mb-2 text-sm text-muted-foreground font-medium">Suggested Questions</div>
          <div className="flex flex-wrap gap-2">
            {[
              "What are the main themes in this channel?",
              "Summarize the key insights",
              "What tools or resources are mentioned?",
              "What are the practical takeaways?",
              "How do these ideas connect together?",
              "What trends are emerging?"
            ].map((question, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setInput(question)}
                className="rounded-full bg-muted px-4 py-2 text-sm text-foreground hover:bg-primary/10 transition cursor-pointer border border-border"
              >
                {question}
              </button>
            ))}
          </div>
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