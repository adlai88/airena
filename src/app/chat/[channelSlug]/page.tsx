'use client';

import React from "react";
import { useState, useEffect, useRef, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Layout } from '@/components/layout';
import { PromptTemplates } from '@/lib/templates';
import { useParams } from 'next/navigation';
import { AutoTextarea } from '@/components/ui/auto-textarea';
import { ArrowUpIcon } from 'lucide-react';

// Optimized component to render text with clickable links
const MessageContent = React.memo(({ content }: { content: string }) => {
  // Combined regex that handles both URLs and markdown links
  // Improved URL regex that excludes trailing punctuation
  const combinedRegex = /(\[([^\]]+)\]\(([^)]+)\))|(https?:\/\/[^\s).,;!?]+)/g;
  
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  
  while ((match = combinedRegex.exec(content)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    
    if (match[1]) {
      // This is a markdown link [text](url)
      const linkText = match[2];
      const linkUrl = match[3];
      parts.push(
        <a
          key={match.index}
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline hover:no-underline transition-colors"
        >
          {linkText}
        </a>
      );
    } else if (match[4]) {
      // This is a plain URL
      const url = match[4];
      parts.push(
        <a
          key={match.index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline hover:no-underline transition-colors"
        >
          {url}
        </a>
      );
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text after the last match
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }
  
  return (
    <div className="whitespace-pre-wrap break-all text-sm sm:text-base leading-relaxed">
      {parts.map((part, index) => (
        <span key={index}>{part}</span>
      ))}
    </div>
  );
});

MessageContent.displayName = 'MessageContent';

function ChatContent() {
  const params = useParams();
  const channelSlug = params.channelSlug as string;
  const [username, setUsername] = useState<string>('');
  const [, setChannelTitle] = useState<string>('');
  const [previousChannelSlug, setPreviousChannelSlug] = useState<string | null>(null);

  const [messages, setMessages] = useState<Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
  }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isRestoringMessages, setIsRestoringMessages] = useState(true);
  
  // Refs for mobile keyboard optimization
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Handle mobile keyboard appearance
  useEffect(() => {
    const handleResize = () => {
      // On mobile, when keyboard appears, scroll input into view
      if (typeof window !== 'undefined' && inputRef.current && window.innerHeight < 500) {
        setTimeout(() => {
          inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Restore chat messages from session storage on load
  useEffect(() => {
    if (!channelSlug) {
      setIsRestoringMessages(false);
      return;
    }
    
    const storageKey = `airena-chat-messages-${channelSlug}`;
    const savedMessages = sessionStorage.getItem(storageKey);
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      } catch (error) {
        console.log('Failed to restore chat messages:', error);
        // Clear corrupted data
        sessionStorage.removeItem(storageKey);
      }
    }
    setIsRestoringMessages(false);
  }, [channelSlug]);

  // Save messages to session storage whenever messages change
  useEffect(() => {
    if (!channelSlug) return;
    
    const storageKey = `airena-chat-messages-${channelSlug}`;
    if (messages.length > 0) {
      sessionStorage.setItem(storageKey, JSON.stringify(messages));
    } else {
      // Clear storage if no messages (user might have cleared chat)
      sessionStorage.removeItem(storageKey);
    }
  }, [messages, channelSlug]);

  // Clear chat history when channel changes (but not on initial load)
  useEffect(() => {
    // Don't clear on initial load or when restoring messages
    if (isRestoringMessages) return;
    
    // If we have a previous channel and it's different from current, clear current messages
    // (but don't remove from storage - let the restoration effect handle loading new channel's messages)
    if (previousChannelSlug && channelSlug && channelSlug !== previousChannelSlug) {
      console.log(`Chat: Channel switched from ${previousChannelSlug} to ${channelSlug} - clearing current messages`);
      setMessages([]);
      setError(null);
    }
    
    // Always update previousChannelSlug after restoration is complete
    if (channelSlug && !isRestoringMessages) {
      console.log(`Chat: Setting previousChannelSlug to ${channelSlug}`);
      setPreviousChannelSlug(channelSlug);
    }
  }, [channelSlug, previousChannelSlug, isRestoringMessages]);

  const clearChat = () => {
    setMessages([]);
    setError(null);
    if (channelSlug) {
      const storageKey = `airena-chat-messages-${channelSlug}`;
      sessionStorage.removeItem(storageKey);
    }
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


  // Determine if the user has sent a message (wait for restoration to complete)
  const hasUserMessage = !isRestoringMessages && messages.some(m => m.role === 'user');


  // Dynamic suggested questions based on channel content
  const suggestedQuestions = PromptTemplates.getSuggestedQuestions();

  const [suggestionsCollapsed, setSuggestionsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Fetch channel information based on URL parameter
  useEffect(() => {
    const fetchChannelInfo = async () => {
      if (!channelSlug) return;
      
      try {
        const response = await fetch(`/api/channel-info?slug=${channelSlug}`);
        if (response.ok) {
          const data = await response.json();
          setUsername(data.username || '');
          setChannelTitle(data.title || channelSlug);
        }
      } catch (error) {
        console.error('Error fetching channel info:', error);
        setChannelTitle(channelSlug);
      }
    };

    fetchChannelInfo();
  }, [channelSlug]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Show loading state while restoring messages
  if (isRestoringMessages) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading chat...</p>
          </div>
        </div>
      </Layout>
    );
  }

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
                  🔗 Connected to: <a 
                    href={username ? `https://www.are.na/${username.toLowerCase().replace(/[^a-z0-9]/g, '')}/${channelSlug}` : `https://www.are.na/${channelSlug}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:no-underline transition-all"
                  >
                    {channelSlug}
                  </a>
                </Badge>
              </div>
            </div>

            {/* Chat Input Form */}
            <form onSubmit={handleChatSubmit} className="mb-8">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="relative flex-1">
                  <AutoTextarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Ask about your channel... (e.g., 'What are the key insights?')"
                    disabled={isLoading}
                    className="pr-10 min-h-[44px] text-base"
                    maxRows={isMobile ? 4 : 6}
                    autoComplete="off"
                    autoCapitalize="sentences"
                    autoCorrect="on"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        const form = (e.target as HTMLTextAreaElement).form;
                        if (form) form.dispatchEvent(new Event('submit', { bubbles: true }));
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim() || !channelSlug.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-primary transition disabled:opacity-50"
                    tabIndex={0}
                  >
                    <ArrowUpIcon className="w-5 h-5" />
                  </button>
                </div>
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

            {/* Suggestions */}
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-4">
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
      </Layout>
    );
  }

  // After first user message: Full chat view
  return (
    <Layout>
      {/* Messages Area - with bottom padding for fixed input */}
      <div className="w-full py-6 pb-32">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] sm:max-w-3xl ${message.role === 'user' ? '' : 'space-y-2'}`}>
                  <div
                    className={`px-4 py-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <MessageContent content={message.content} />
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
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Fixed Input Area - always visible above footer */}
      <div className="w-full fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
          {/* Error Display */}
          {error && (
            <div className="mb-4">
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-destructive text-sm">{error.message}</p>
              </div>
            </div>
          )}

          {/* Compact Suggested Questions for Chat Session */}
          {messages.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 gap-2" style={{ minHeight: 32 }}>
                <div className="flex items-center gap-2">
                  <span style={{ lineHeight: 1.5, display: 'inline-block' }}>Try asking:</span>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-primary px-2 py-1 rounded"
                    onClick={() => setSuggestionsCollapsed(!suggestionsCollapsed)}
                    style={{ lineHeight: 1.5 }}
                  >
                    {suggestionsCollapsed ? 'Show' : 'Hide'}
                  </button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearChat}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center"
                  style={{ lineHeight: 1.5 }}
                >
                  Clear Chat
                </Button>
              </div>
              {!suggestionsCollapsed && (
                <div className="flex flex-wrap gap-2">
                  {suggestedQuestions.slice(0, 3).map((question, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary/10 transition text-xs px-2 py-1"
                      onClick={() => {
                        setInput(question);
                        setTimeout(() => {
                          const form = document.querySelector('form');
                          if (form) {
                            form.dispatchEvent(new Event('submit', { bubbles: true }));
                          }
                        }, 100);
                      }}
                    >
                      {question}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleChatSubmit} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <AutoTextarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about your channel..."
                disabled={isLoading}
                className="pr-10 min-h-[44px] text-base"
                maxRows={isMobile ? 4 : 6}
                autoComplete="off"
                autoCapitalize="sentences"
                autoCorrect="on"
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const form = (e.target as HTMLTextAreaElement).form;
                    if (form) form.dispatchEvent(new Event('submit', { bubbles: true }));
                  }
                }}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim() || !channelSlug.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-primary transition disabled:opacity-50"
                tabIndex={0}
              >
                <ArrowUpIcon className="w-5 h-5" />
              </button>
            </div>
          </form>
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