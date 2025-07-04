import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import Link from "next/link";

export default function HomePage() {

  return (
    <Layout homeNav>
      {/* Main content */}
      <div className="py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-6 text-foreground">
            Turn your are.na channels into a personal intelligence agent
          </h1>
          <p className="text-xl mb-12 text-foreground">
            Generate newsletters, reports, and insights using AI powered by your own curation
          </p>

          <div className="flex gap-4 mb-16">
            <Button variant="outline" size="sm" className="font-medium" asChild>
              <Link href="/setup">Try Demo</Link>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="font-medium opacity-50" 
              disabled
            >
              Join Waitlist
            </Button>
          </div>

          <div className="mb-16">
            <h2 className="text-2xl font-bold mb-4 text-foreground">Features</h2>
            <ul className="list-disc pl-6 space-y-2 text-foreground">
              <li>Generate AI newsletters from your are.na channel</li>
              <li>Chat with your are.na channel</li>
              <li>Real-time streaming responses</li>
            </ul>
          </div>

          <div className="border-t border-border pt-8">
            <p className="text-foreground">Airena is:</p>
            <ol className="list-decimal pl-6 space-y-2 mt-4 text-foreground">
              <li>software 3.0 for transforming your curated content into AI insights</li>
              <li>a toolkit for generating new knowledge from the scraps of the old</li>
            </ol>

            <p className="mt-8 text-foreground">
              People describe Airena as <span className="font-bold">&ldquo;your personal research assistant&rdquo;</span> or an <span className="font-bold">&ldquo;intelligence amplifier&rdquo;</span>.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
