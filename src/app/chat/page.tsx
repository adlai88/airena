'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';

export default function ChatRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to default channel
    router.replace('/chat/r-startups-founder-mode');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4"><Spinner size={32} /></div>
        <p className="text-muted-foreground">Redirecting to chat...</p>
      </div>
    </div>
  );
}