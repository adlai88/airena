import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({ error: 'Channel slug is required' }, { status: 400 });
    }

    // Get channel by slug
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('id')
      .eq('slug', slug)
      .single();

    if (channelError || !channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Get blocks for the channel - thumbnails now come from database!
    const { data: blocks, error: blocksError } = await supabase
      .from('blocks')
      .select('*')
      .eq('channel_id', channel.id)
      .order('created_at', { ascending: false })
      .limit(50); // Prototype limit

    if (blocksError) {
      console.error('Error fetching blocks:', blocksError);
      return NextResponse.json({ error: 'Failed to fetch blocks' }, { status: 500 });
    }

    // Return blocks directly - thumbnails are already in the database
    return NextResponse.json({ blocks: blocks || [] });
  } catch (error) {
    console.error('Error in canvas-blocks API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}