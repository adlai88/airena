// API route for channel synchronization
import { NextRequest } from 'next/server';
import { SyncService } from '@/lib/sync';

export async function POST(req: NextRequest) {
  try {
    const { channelSlug } = await req.json();

    if (!channelSlug) {
      return Response.json({ error: 'Channel slug is required' }, { status: 400 });
    }

    // Create sync service instance
    const syncService = new SyncService();

    // Start sync process
    const result = await syncService.syncChannel(channelSlug);

    return Response.json(result);

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