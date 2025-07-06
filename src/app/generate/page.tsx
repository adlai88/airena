'use client';

import React, { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PromptTemplates, type NewsletterOptions } from '@/lib/templates';
import { Layout } from '@/components/layout';
import { PageHeader } from '@/components/page-header';
import { useChannel } from '@/hooks/useChannel';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';

type GenerationStage = 'template-selection' | 'customization' | 'generation' | 'result';

// Import the same MessageContent component we use in chat for consistent link parsing
const MessageContent = React.memo(({ content }: { content: string }) => {
  // Combined regex that handles both URLs and markdown links
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
          className="text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 underline hover:no-underline transition-colors"
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
          className="text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 underline hover:no-underline transition-colors"
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
    <div className="whitespace-pre-wrap break-all leading-relaxed">
      {parts.map((part, index) => (
        <span key={index}>{part}</span>
      ))}
    </div>
  );
});

MessageContent.displayName = 'MessageContent';

function GenerateContent() {
  const router = useRouter();
  const { channelSlug, username } = useChannel();
  const [stage, setStage] = useState<GenerationStage>('template-selection');
  const [selectedTemplate, setSelectedTemplate] = useState<{id: string; name: string; description: string} | null>(null);
  const [options, setOptions] = useState<NewsletterOptions>({
    tone: 'professional',
    length: 'standard',
    focus: 'insights',
  });
  
  const [completion, setCompletion] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const handleTemplateSelect = (template: {id: string; name: string; description: string}) => {
    setSelectedTemplate(template);
    setOptions({
      tone: 'professional',
      length: 'standard',
      focus: 'insights'
    });
    setStage('customization');
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) {
      alert('Please select a template first');
      return;
    }

    setError(null);
    setCompletion('');
    setStage('generation');

    try {
      // Build the prompt using the template
      const prompt = PromptTemplates.newsletter([], channelSlug, options);
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelSlug,
          customPrompt: prompt,
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
      
      setStage('result');
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Generation failed'));
      setStage('customization');
    } finally {
      // Generation complete
    }
  };

  const handleStartOver = () => {
    setStage('template-selection');
    setSelectedTemplate(null);
    setCompletion('');
    setError(null);
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
  };

  const handleShare = async () => {
    // Check if Web Share API is supported (mainly mobile browsers)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${selectedTemplate?.name} from Airena`,
          text: completion,
          url: window.location.href
        });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch (err) {
        // User cancelled sharing or error occurred
        console.log('Share cancelled or failed:', err);
      }
    } else {
      // Fallback: copy to clipboard for desktop
      await handleCopyToClipboard();
    }
  };

  // Template Selection Stage
  if (stage === 'template-selection') {
    return (
      <Layout>
        <PageHeader 
          title="Generate content with this channel"
          subtitle="Select a template to structure the AI-generated content"
        />
        <div className="max-w-4xl mx-auto pb-8 sm:pb-16 px-4 sm:px-6">
          {/* Connected Channel Badge */}
          <div className="flex justify-center mb-8">
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

          <div className="space-y-6">
            {[{
              id: 'newsletter',
              name: 'Newsletter',
              description: 'A roundup of key insights and actionable takeaways from this are.na channel'
            }].map((template) => (
              <Card key={template.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-2xl">{template.name}</CardTitle>
                  <CardDescription className="text-base">{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => handleTemplateSelect(template)}
                    className="w-full min-h-[48px] sm:min-h-auto"
                    size="lg"
                  >
                    Use This Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  // Customization Stage
  if (stage === 'customization') {
    return (
      <Layout>
        <PageHeader 
          title={`Customize This ${selectedTemplate?.name}`}
          subtitle="Fine-tune the generation options"
        />
        <div className="max-w-4xl mx-auto pb-8 sm:pb-16 px-4 sm:px-6">
          {/* Connected Channel Badge */}
          <div className="flex justify-center mb-8">
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

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Generation Options</CardTitle>
              <CardDescription>Customize how the newsletter will be generated</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Tone
                  </label>
                  <Select value={options.tone} onValueChange={(value) => setOptions({...options, tone: value as NewsletterOptions['tone']})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="analytical">Analytical</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Length
                  </label>
                  <Select value={options.length} onValueChange={(value) => setOptions({...options, length: value as NewsletterOptions['length']})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="brief">Brief</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="detailed">Detailed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Focus
                  </label>
                  <Select value={options.focus} onValueChange={(value) => setOptions({...options, focus: value as NewsletterOptions['focus']})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="insights">Key Insights</SelectItem>
                      <SelectItem value="resources">Resources</SelectItem>
                      <SelectItem value="trends">Trends</SelectItem>
                      <SelectItem value="actionable">Actionable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                <Button onClick={handleGenerate} className="flex-1 min-h-[48px] sm:min-h-auto" size="lg">
                  Generate Newsletter
                </Button>
                <Button variant="outline" onClick={() => setStage('template-selection')} className="min-h-[48px] sm:min-h-auto">
                  Change Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Generation Stage
  if (stage === 'generation') {
    return (
      <Layout>
        <PageHeader 
          title="Generating Your Newsletter"
          subtitle="Processing the curated research..."
        />
        <div className="flex flex-col items-center justify-center" style={{ minHeight: 'calc(100vh - 200px)' }}>
          <Badge variant="secondary" className="px-3 py-1 mb-8">
            📊 Connected to: {channelSlug}
          </Badge>
          <div className="flex flex-col items-center text-center">
            <div className="mb-6"><Spinner size={48} /></div>
            <p className="text-lg text-muted-foreground">
              Please wait while we analyze your content...
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  // Result Stage
  return (
    <Layout>
      <PageHeader 
        title={`Your ${selectedTemplate?.name} ✨`}
        subtitle="Generated from the curated research"
      />
      <div className="max-w-4xl mx-auto pb-8 sm:pb-16 px-4 sm:px-6">
        {/* Connected Channel Badge */}
        <div className="flex justify-center mb-8">
          <Badge variant="secondary" className="px-3 py-1">
            📊 Generated from: {channelSlug}
          </Badge>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle>Generated Content</CardTitle>
              {completion && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button variant="outline" onClick={handleCopyToClipboard} className="min-h-[44px] sm:min-h-auto">
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                  <Button variant="outline" onClick={handleShare} className="min-h-[44px] sm:min-h-auto">
                    {shared ? 'Shared!' : 'Share'}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-destructive text-sm">{error.message}</p>
              </div>
            )}
            
            <div className="min-h-[400px] text-foreground leading-relaxed max-w-none">
              {completion ? <MessageContent content={completion} /> : 'No content generated'}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center gap-4">
          <Button onClick={handleStartOver}>
            Generate New Newsletter
          </Button>
          <Button variant="ghost" onClick={() => router.push('/setup')}>
            Sync Different Channel
          </Button>
        </div>
      </div>
    </Layout>
  );
}

export default function GeneratePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4"><Spinner size={32} /></div>
          <p className="text-muted-foreground">Loading generate page...</p>
        </div>
      </div>
    }>
      <GenerateContent />
    </Suspense>
  );
}