import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { channelSlug } = await req.json();

    if (!channelSlug) {
      return NextResponse.json({ error: 'Channel slug is required' }, { status: 400 });
    }

    // Find the channel in the database
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('*')
      .eq('slug', channelSlug)
      .single();

    if (channelError || !channel) {
      console.error('Channel not found:', channelError);
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Update the last_sync timestamp to make this the "current" channel
    const { error: updateError } = await supabase
      .from('channels')
      .update({ 
        last_sync: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', channel.id);

    if (updateError) {
      console.error('Error updating channel:', updateError);
      return NextResponse.json({ error: 'Failed to switch channel' }, { status: 500 });
    }

    // Get block count for response
    const { count: blockCount } = await supabase
      .from('blocks')
      .select('*', { count: 'exact', head: true })
      .eq('channel_id', channel.id);

    return NextResponse.json({ 
      success: true,
      channelSlug: channel.slug,
      channelTitle: channel.title,
      blockCount: blockCount || 0
    });

  } catch (error) {
    console.error('Switch channel error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}