'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Layout } from '@/components/layout';
import { PageHeader } from '@/components/page-header';

function OptionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const channelSlug = searchParams.get('channel') || 'r-startups-founder-mode';

  const handleGenerateMode = () => {
    router.push(`/generate?channel=${channelSlug}`);
  };

  const handleChatMode = () => {
    router.push(`/chat?channel=${channelSlug}`);
  };

  return (
    <Layout>
      <PageHeader 
        title="Channel Synced Successfully! ✨"
        subtitle={`Your channel ${channelSlug} is ready • Choose how you'd like to interact with your research`}
      />
      <div className="max-w-4xl mx-auto pb-16 px-4">

        {/* Mode Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Generate Mode */}
          <Card className="relative cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl mb-2">📝 Generate Digest</CardTitle>
              <CardDescription className="text-base">
                Create structured content from your research
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-2">
                <p>• Generate newsletters and summaries</p>
                <p>• Template-driven content creation</p>
                <p>• Professional formatting</p>
                <p>• Export and share easily</p>
              </div>
              <Button 
                className="w-full" 
                size="lg"
                onClick={handleGenerateMode}
              >
                Start Generating
              </Button>
            </CardContent>
          </Card>

          {/* Chat Mode */}
          <Card className="relative cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl mb-2">💬 Chat with Research</CardTitle>
              <CardDescription className="text-base">
                Interactive Q&A with your curated content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-2">
                <p>• Ask questions about your research</p>
                <p>• Get contextual answers</p>
                <p>• Source attribution included</p>
                <p>• Real-time streaming responses</p>
              </div>
              <Button 
                variant="outline" 
                className="w-full" 
                size="lg"
                onClick={handleChatMode}
              >
                Start Chatting
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground mb-4">
            Not sure which to choose? You can always switch between modes later.
          </p>
          <div className="flex justify-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={() => router.push('/setup')}
            >
              ← Sync Different Channel
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => router.push('/')}
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default function OptionsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading options...</p>
        </div>
      </div>
    }>
      <OptionsContent />
    </Suspense>
  );
}