'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DIGEST_TEMPLATES, buildPrompt, type DigestTemplate } from '@/lib/digest-templates';
import { Layout } from '@/components/layout';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';

type GenerationStage = 'template-selection' | 'customization' | 'generation' | 'result';

function GenerateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
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
  const [stage, setStage] = useState<GenerationStage>('template-selection');
  const [selectedTemplate, setSelectedTemplate] = useState<DigestTemplate | null>(null);
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
  const [error, setError] = useState<Error | null>(null);
  const [copied, setCopied] = useState(false);

  const handleTemplateSelect = (template: DigestTemplate) => {
    setSelectedTemplate(template);
    setOptions(template.defaultOptions);
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
      const prompt = buildPrompt(selectedTemplate, channelSlug, 0, options);
      
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

  // Template Selection Stage
  if (stage === 'template-selection') {
    return (
      <Layout>
        <PageHeader 
          title="Generate content with your channel"
          subtitle="Select a template to structure your AI-generated content"
        />
        <div className="max-w-4xl mx-auto pb-8 sm:pb-16 px-4 sm:px-6">
          {/* Connected Channel Badge */}
          <div className="flex justify-center mb-8">
            <Badge variant="secondary" className="px-3 py-1">
              🔗 Connected to: {channelSlug}
            </Badge>
          </div>

          <div className="space-y-6">
            {DIGEST_TEMPLATES.map((template) => (
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
          title={`Customize Your ${selectedTemplate?.name}`}
          subtitle="Fine-tune the generation options"
        />
        <div className="max-w-4xl mx-auto pb-8 sm:pb-16 px-4 sm:px-6">
          {/* Connected Channel Badge */}
          <div className="flex justify-center mb-8">
            <Badge variant="secondary" className="px-3 py-1">
              🔗 Connected to: {channelSlug}
            </Badge>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Generation Options</CardTitle>
              <CardDescription>Customize how your digest will be generated</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Tone
                  </label>
                  <Select value={options.tone} onValueChange={(value) => setOptions({...options, tone: value as typeof options.tone})}>
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
                  <Select value={options.length} onValueChange={(value) => setOptions({...options, length: value as typeof options.length})}>
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
                  <Select value={options.focus} onValueChange={(value) => setOptions({...options, focus: value as typeof options.focus})}>
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
                  Generate Digest
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
          title="Generating Your Digest"
          subtitle="Processing your curated research..."
        />
        <div className="flex justify-center mb-8">
          <Badge variant="secondary" className="px-3 py-1">
            📊 Connected to: {channelSlug}
          </Badge>
        </div>
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-6"></div>
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
        subtitle="Generated from your curated research"
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
            <div className="flex justify-between items-center">
              <CardTitle>Generated Content</CardTitle>
              {completion && (
                <Button variant="outline" onClick={handleCopyToClipboard}>
                  {copied ? 'Copied!' : 'Copy to Clipboard'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-destructive text-sm">{error.message}</p>
              </div>
            )}
            
            <div className="min-h-[400px] whitespace-pre-wrap text-foreground leading-relaxed">
              {completion || 'No content generated'}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center gap-4">
          <Button onClick={handleStartOver}>
            Generate New Digest
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading generate page...</p>
        </div>
      </div>
    }>
      <GenerateContent />
    </Suspense>
  );
}