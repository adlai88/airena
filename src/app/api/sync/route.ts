// API route for channel synchronization with streaming progress
import { NextRequest } from 'next/server';
import { SyncService, SyncProgress } from '@/lib/sync';
import { UsageTracker } from '@/lib/usage-tracking';
import { auth } from '@clerk/nextjs/server';
import { auth as betterAuth } from '@/lib/auth';
import { headers } from 'next/headers';
import { useNewAuth } from '@/lib/feature-flags';

export async function POST(req: NextRequest) {
  try {
    const { channelSlug, sessionId, blockLimit } = await req.json();

    if (!channelSlug) {
      return Response.json({ error: 'Channel slug is required' }, { status: 400 });
    }

    // Get authentication info (optional for free users)
    let userId: string | null = null;
    const isNewAuth = process.env.NEXT_PUBLIC_USE_BETTER_AUTH === 'true';
    
    try {
      if (isNewAuth) {
        // Use Better Auth
        const session = await betterAuth.api.getSession({
          headers: headers()
        });
        userId = session?.user?.id || null;
      } else {
        // Use Clerk
        const authResult = await auth();
        userId = authResult.userId;
      }
    } catch {
      // No authentication required for free users
      userId = null;
    }
    
    // Get or generate session ID for usage tracking
    const userSessionId = sessionId || UsageTracker.generateSessionId();
    const ipAddress = UsageTracker.getIpAddress(req);

    // Create a readable stream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        // Function to send progress updates to the client
        const sendProgress = (progress: SyncProgress) => {
          const data = `data: ${JSON.stringify(progress)}\n\n`;
          controller.enqueue(encoder.encode(data));
        };

        try {
          // Create sync service instance with progress callback
          const syncService = new SyncService(sendProgress);

          // Start sync process with usage tracking
          const result = await syncService.syncChannel(
            channelSlug,
            userSessionId,
            ipAddress,
            userId || undefined,
            blockLimit
          );

          // Send final result with session ID
          const finalData = `data: ${JSON.stringify({ 
            type: 'complete', 
            result,
            sessionId: userSessionId
          })}\n\n`;
          controller.enqueue(encoder.encode(finalData));
          
        } catch (error) {
          // Send error
          const errorData = `data: ${JSON.stringify({ 
            type: 'error', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
        } finally {
          controller.close();
        }
      }
    });

    // Return SSE response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Sync API error:', error);
    return Response.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}