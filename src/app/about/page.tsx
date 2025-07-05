'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/layout';
import { PageHeader } from '@/components/page-header';

export default function AboutPage() {
  const router = useRouter();
  return (
    <Layout>
      <PageHeader 
        title="About Airena"
        subtitle="Your curation advantage becomes your intelligence advantage"
        variant="narrow"
      />
      <div className="max-w-2xl mx-auto pb-8 sm:pb-12 px-4 sm:px-0">
        <Button variant="ghost" size="sm" className="mb-6 flex items-center gap-2" onClick={() => router.back()}>
          <span aria-hidden="true">←</span> Back
        </Button>
      <h2 className="text-xl font-bold mb-2 mt-8">The Vision</h2>
      <p className="mb-4">We believe the future of knowledge work isn&apos;t about consuming more information—it&apos;s about thinking better with what you&apos;ve already chosen to save.</p>
      <p className="mb-4">Are.na users are natural researchers. You collect not just for aesthetic inspiration, but because each saved piece contains an idea worth remembering. Yet that intelligence remains trapped, unsearchable, disconnected from your thinking process.</p>
      <p className="mb-4">Airena transforms your visual curation into conversational intelligence. Instead of manually browsing through bookmarks, you can now generate insights, explore patterns, and have conversations with your own research.</p>
      <h2 className="text-xl font-bold mb-2 mt-8">A New Kind of Intelligence</h2>
      <p className="mb-4">This isn&apos;t another AI tool trained on generic web data. It&apos;s intelligence built from <em>your taste</em>—the articles you found compelling, the designs that caught your eye, the ideas you deemed worth saving.</p>
      <p className="mb-4">While others search through noise, you query signal. While others get generic outputs, you get insights grounded in your own curatorial judgment.</p>
      <h2 className="text-xl font-bold mb-2 mt-8">Why This Matters</h2>
      <p className="mb-4">We&apos;re creating a new category that sits between visual inspiration and knowledge intelligence. Your are.na channels become more than mood boards—they become thinking partners.</p>
      <p className="mb-4">Every piece you&apos;ve curated is a vote for what matters. Airena turns those votes into a knowledge base that thinks like you do.</p>
      <p className="mt-8 font-semibold">Start exploring with the research others have curated, then connect your own channels to unlock the intelligence in your collection.</p>
      </div>
    </Layout>
  );
} 