'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Layout } from '@/components/layout';

export default function HomePage() {
  const router = useRouter();

  return (
    <Layout>
      <div className="max-w-6xl mx-auto py-16 px-4">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-foreground mb-6">
            Airena
          </h1>
          <p className="text-2xl text-muted-foreground mb-4 max-w-3xl mx-auto">
            Turn your are.na channels into a personal intelligence agent
          </p>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Generate newsletters and insights from your curated research. 
            This is software 3.0 – generating knowledge from your curation.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <Button 
            size="lg" 
            onClick={() => router.push('/generate?channel=r-startups-founder-mode')}
            className="text-lg px-8 py-4 h-12"
          >
            Try Demo
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            onClick={() => router.push('/setup')}
            className="text-lg px-8 py-4 h-12"
          >
            Get Started
          </Button>
        </div>
        
        <div className="text-center mb-16">
          <p className="text-sm text-muted-foreground">
            Try with our demo channel:{' '}
            <button
              onClick={() => router.push('/generate?channel=r-startups-founder-mode')}
              className="text-primary hover:underline font-medium"
            >
              r-startups-founder-mode
            </button>
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Extract Content</CardTitle>
              <CardDescription>
                From websites, PDFs, videos, and more
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Connect your Are.na channel and we&apos;ll automatically extract and process content from all your curated links.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Generate AI Newsletters</CardTitle>
              <CardDescription>
                From your are.na channels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Transform your research into professional newsletters, summaries, and insights with AI-powered generation.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Chat with Your Research</CardTitle>
              <CardDescription>
                Real-time streaming responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Ask questions about your curated content and get contextual answers with source attribution.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Navigation */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-6">
            Ready to transform your curation into intelligence?
          </p>
          <div className="flex justify-center space-x-6 text-sm">
            <Button
              variant="ghost"
              onClick={() => router.push('/setup')}
            >
              Setup Channel
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push('/generate')}
            >
              Generate Digest
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push('/chat')}
            >
              Chat Interface
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
