'use client';

import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        {/* Hero Section */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Airena
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Transform your curated Are.na channels into an intelligent agent. 
            Generate newsletters, reports, and insights using AI powered by your own research.
          </p>
          <p className="text-lg text-gray-700 font-medium mb-8">
            Your curation advantage becomes your intelligence advantage.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-4 mb-12">
          <button
            onClick={() => router.push('/setup')}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Get Started
          </button>
          
          <div className="text-sm text-gray-500">
            or try with our demo channel:{' '}
            <button
              onClick={() => router.push('/generate?channel=r-startups-founder-mode')}
              className="text-blue-600 hover:text-blue-700 underline"
            >
              r-startups-founder-mode
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Sync</h3>
            <p className="text-gray-600">
              Connect your Are.na channel and we&apos;ll extract content from all your curated links using AI.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Generation</h3>
            <p className="text-gray-600">
              Generate newsletters, reports, and insights with streaming AI responses powered by your research.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Chat Interface</h3>
            <p className="text-gray-600">
              Ask questions about your curated content and get contextual answers with source attribution.
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-center space-x-6 text-sm">
          <button
            onClick={() => router.push('/setup')}
            className="text-blue-600 hover:text-blue-700"
          >
            Setup Channel
          </button>
          <button
            onClick={() => router.push('/generate')}
            className="text-blue-600 hover:text-blue-700"
          >
            Generate Newsletter
          </button>
          <button
            onClick={() => router.push('/chat')}
            className="text-blue-600 hover:text-blue-700"
          >
            Chat Interface
          </button>
        </div>
      </div>
    </div>
  );
}
