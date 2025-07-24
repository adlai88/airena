import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { channelSlug } = await request.json();
    
    if (!channelSlug) {
      return NextResponse.json({ error: 'Channel slug required' }, { status: 400 });
    }
    
    // Get channel ID
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('id')
      .eq('slug', channelSlug)
      .single() as { data: { id: number } | null; error: any };
      
    if (channelError || !channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }
    
    // Clear all thumbnails for this channel
    const { error: updateError } = await supabase
      .from('blocks')
      .update({ thumbnail_url: null })
      .eq('channel_id', channel.id);
      
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, message: 'Thumbnails cleared. Re-sync to extract thumbnails.' });
  } catch (error) {
    console.error('Error clearing thumbnails:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}