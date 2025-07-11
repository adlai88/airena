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
            Turn your{' '}
            <Link
              href="https://www.are.na/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 no-underline hover:no-underline transition-colors"
            >
              Are.na
            </Link>{' '}
            channels into a personal intelligence agent
          </h1>
          <p className="text-xl mb-12 text-foreground">
            Airena transforms your curated inspiration into actionable insights, answers, and content—powered by your unique taste.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-16">
            <Button variant="outline" size="lg" className="font-medium min-h-[52px] px-8" asChild>
              <Link href="/setup">Try Demo</Link>
            </Button>
          </div>

          <div className="mb-16">
            <h2 className="text-2xl font-bold mb-4 text-foreground">Features</h2>
            <ul className="list-disc pl-6 space-y-2 text-foreground">
              <li>Chat with your Are.na channels to surface hidden connections and patterns</li>
              <li>Generate newsletters, summaries, and reports from your saved content</li>
              <li>Unlock a knowledge base that thinks like you do</li>
            </ul>
          </div>

          <div className="border-t border-border pt-8">
            <p className="text-foreground">Airena is:</p>
            <ol className="list-decimal pl-6 space-y-2 mt-4 text-foreground">
              <li>software 3.0 for transforming your curated content into AI insights</li>
              <li>a toolkit for generating new knowledge from the scraps of your Are.na world</li>
            </ol>

            <p className="mt-8 text-foreground">
              People describe Airena as <span className="font-bold">&ldquo;your personal research assistant&rdquo;</span> or an <span className="font-bold">&ldquo;intelligence amplifier.&rdquo;</span>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
