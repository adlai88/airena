'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Layout } from '@/components/layout';
import { PromptTemplates } from '@/lib/templates';

function ChatContent() {
  const searchParams = useSearchParams();
  const [channelSlug, setChannelSlug] = useState('r-startups-founder-mode'); // fallback
  const [previousChannelSlug, setPreviousChannelSlug] = useState<string | null>(null);

  // Get actual connected channel on mount
  useEffect(() => {
    const getConnectedChannel = async () => {
      try {
        const response = await fetch('/api/channel-info');
        if (response.ok) {
          const data = await response.json();
          if (data.channelSlug) {
            console.log('Chat: Got channel from API:', data.channelSlug);
            setChannelSlug(data.channelSlug);
          }
        }
      } catch {
        console.log('Chat: Using fallback channel');
      }
    };

    // Check URL params first, then database
    const urlChannel = searchParams.get('channel');
    if (urlChannel) {
      console.log('Chat: Got channel from URL:', urlChannel);
      setChannelSlug(urlChannel);
    } else {
      console.log('Chat: No URL channel, fetching from API');
      getConnectedChannel();
    }
  }, [searchParams]);

  const [messages, setMessages] = useState<Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
  }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Restore chat messages from session storage on load
  useEffect(() => {
    const savedMessages = sessionStorage.getItem('airena-chat-messages');
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      } catch (error) {
        console.log('Failed to restore chat messages:', error);
        // Clear corrupted data
        sessionStorage.removeItem('airena-chat-messages');
      }
    }
  }, []);

  // Save messages to session storage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem('airena-chat-messages', JSON.stringify(messages));
    } else {
      // Clear storage if no messages (user might have cleared chat)
      sessionStorage.removeItem('airena-chat-messages');
    }
  }, [messages]);

  // Clear chat history when channel changes (but not on initial load)
  useEffect(() => {
    if (previousChannelSlug && channelSlug !== previousChannelSlug) {
      console.log(`Channel switched from ${previousChannelSlug} to ${channelSlug} - clearing chat history`);
      setMessages([]);
      sessionStorage.removeItem('airena-chat-messages');
      setError(null);
    }
    setPreviousChannelSlug(channelSlug);
  }, [channelSlug, previousChannelSlug]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
    sessionStorage.removeItem('airena-chat-messages');
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

  // Determine if the user has sent a message
  const hasUserMessage = messages.some(m => m.role === 'user');

  // Get channel title for better question suggestions
  const [channelTitle, setChannelTitle] = useState('');
  
  // Fetch channel title when channelSlug changes
  useEffect(() => {
    const fetchChannelTitle = async () => {
      try {
        const response = await fetch('/api/channel-info');
        if (response.ok) {
          const data = await response.json();
          setChannelTitle(data.channelTitle || channelSlug);
        }
      } catch {
        setChannelTitle(channelSlug);
      }
    };
    
    fetchChannelTitle();
  }, [channelSlug]);

  // Dynamic suggested questions based on channel content
  const suggestedQuestions = PromptTemplates.getSuggestedQuestions(channelTitle || channelSlug);

  if (!hasUserMessage) {
    // First view: Centered input and suggestions
    return (
      <Layout>
        <div className="min-h-screen flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 -mt-16">
          <div className="w-full max-w-2xl">
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold mb-4">
                Chat with Your Channel
              </h1>
              <p className="text-lg text-muted-foreground mb-4">
                Ask me anything about your Are.na content
              </p>
              <div className="flex justify-center mb-4">
                <Badge variant="secondary" className="px-3 py-1">
                  🔗 Connected to: {channelSlug}
                </Badge>
              </div>
            </div>

            {/* Chat Input Form */}
            <form onSubmit={handleChatSubmit} className="mb-8">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Input
                  type="text"
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Ask about your channel... (e.g., 'What are the key insights?')"
                  disabled={isLoading}
                  className="flex-1 min-h-[44px] text-base"
                />
                <Button
                  type="submit"
                  disabled={isLoading || !input.trim() || !channelSlug.trim()}
                  className="min-h-[44px] sm:min-h-auto px-6 sm:px-4"
                >
                  {isLoading ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </form>

            {/* Error Display */}
            {error && (
              <div className="mb-6">
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-destructive text-sm text-center">{error.message}</p>
                </div>
              </div>
            )}

            {/* Suggested Questions */}
            <div className="text-center">
              <div className="mb-4 text-sm text-muted-foreground font-medium">
                Try asking about:
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestedQuestions.map((question, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary/10 transition px-3 py-1"
                    onClick={() => {
                      setInput(question);
                      // Auto-submit the question
                      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                      handleChatSubmit(fakeEvent);
                    }}
                  >
                    {question}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // After first user message: Full chat view
  return (
    <Layout>
      {/* Messages Area - with bottom padding for fixed input */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 pb-32">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-3xl px-4 py-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed">
                  {message.content}
                </div>
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
      </div>

      {/* Fixed Input Area - always visible above footer */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Error Display */}
          {error && (
            <div className="mb-4">
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-destructive text-sm">{error.message}</p>
              </div>
            </div>
          )}

          {/* Clear Chat Button */}
          <div className="flex justify-end mb-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearChat}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear Chat
            </Button>
          </div>

          {/* Input Form */}
          <form onSubmit={handleChatSubmit} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Ask about your channel..."
              disabled={isLoading}
              className="flex-1 min-h-[44px]"
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim() || !channelSlug.trim()}
              className="min-h-[44px] sm:min-h-auto px-6 sm:px-4"
            >
              {isLoading ? 'Sending...' : 'Send'}
            </Button>
          </form>
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