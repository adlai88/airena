import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import Link from "next/link";

export default function HomePage() {

  return (
    <Layout homeNav>
      {/* Main content */}
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-6 text-foreground">
            AI for{' '}
            <Link
              href="https://www.are.na/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-500 hover:text-indigo-600 no-underline hover:no-underline transition-colors"
            >
              Are.na
            </Link>
          </h1>
          <p className="text-xl mb-12 text-foreground">
            Chat with your channels, generate content, and discover patterns across everything you&apos;ve curated.
          </p>

          <div className="mb-16">
            <div className="inline-flex flex-col w-full sm:w-auto">
              <Button variant="default" size="lg" className="font-medium min-h-[52px] px-8 min-w-[220px] w-full sm:w-auto" asChild>
                <Link href="/sign-up">Get Started Free</Link>
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">50 blocks free • No credit card required</p>
            </div>
          </div>

          <div className="mb-16">
            <h2 className="text-2xl font-bold mb-4 text-foreground">Features</h2>
            <ul className="list-disc pl-6 space-y-2 text-foreground">
              <li>Ask anything about your channels and get intelligent answers with sources</li>
              <li>Generate content in seconds: newsletters, research reports, creative briefs</li>
              <li>Works with everything: websites, PDFs, images, videos, and tweets</li>
            </ul>
          </div>

          {/* Replace 'Airena is:' and numbered list with 'Why Airena?' and new bullets */}
          <div className="border-t border-border pt-8">
            <h2 className="text-2xl font-bold mb-4 text-foreground">Aryn is:</h2>
            <ul className="list-disc pl-6 space-y-2 text-foreground">
              <li>Your taste, amplified: Every answer is informed by your personally curated knowledge</li>
              <li>Simple start: Sign up free and get 50 blocks to explore the power of AI-enhanced curation</li>
              <li>Open source: Self-host for free or upgrade to Starter ($5/month) for 200 blocks monthly</li>
            </ul>
            <p className="mt-6 text-foreground text-base font-medium">
              Join researchers, designers, and strategists who are turning their Are.na channels into spatial intelligence.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
