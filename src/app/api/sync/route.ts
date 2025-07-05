// API route for channel synchronization with streaming progress
import { NextRequest } from 'next/server';
import { SyncService, SyncProgress } from '@/lib/sync';

export async function POST(req: NextRequest) {
  try {
    const { channelSlug } = await req.json();

    if (!channelSlug) {
      return Response.json({ error: 'Channel slug is required' }, { status: 400 });
    }

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

          // Start sync process
          const result = await syncService.syncChannel(channelSlug);

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