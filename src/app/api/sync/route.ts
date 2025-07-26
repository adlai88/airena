// API route for channel synchronization with streaming progress
import { NextRequest } from 'next/server';
import { SyncService, SyncProgress } from '@/lib/sync';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { channelSlug, blockLimit } = await req.json();

    if (!channelSlug) {
      return Response.json({ error: 'Channel slug is required' }, { status: 400 });
    }

    // Authentication is now required
    const session = await auth.api.getSession({
      headers: await headers()
    });
    
    if (!session?.user?.id) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

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

          // Start sync process (userId is now required)
          const result = await syncService.syncChannel(
            channelSlug,
            userId, // sessionId parameter removed
            ipAddress,
            userId, // userId is no longer optional
            blockLimit
          );

          // Send final result
          const finalData = `data: ${JSON.stringify({ 
            type: 'complete', 
            result
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