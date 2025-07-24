import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { channelSlug } = await request.json();
    
    if (!channelSlug) {
      return NextResponse.json({ error: 'Channel slug required' }, { status: 400 });
    }
    
    // Get channel
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('id')
      .eq('slug', channelSlug)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .single() as { data: { id: number } | null; error: any };
      
    if (channelError || !channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }
    
    // Get blocks without thumbnails
    const { data: blocksToFix, error: blocksError } = await supabase
      .from('blocks')
      .select('arena_id, url')
      .eq('channel_id', channel.id)
      .is('thumbnail_url', null);
      
    if (blocksError) {
      return NextResponse.json({ error: blocksError.message }, { status: 500 });
    }
    
    let fixed = 0;
    const updates = [];
    
    // Generate thumbnails for YouTube videos
    for (const block of blocksToFix || []) {
      if (block.url) {
        const youtubeMatch = block.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        
        if (youtubeMatch) {
          const videoId = youtubeMatch[1];
          const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
          
          updates.push({
            arena_id: block.arena_id,
            thumbnail_url: thumbnailUrl
          });
          fixed++;
        }
      }
    }
    
    // Update blocks with thumbnails
    if (updates.length > 0) {
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('blocks')
          .update({ thumbnail_url: update.thumbnail_url })
          .eq('arena_id', update.arena_id);
          
        if (updateError) {
          console.error(`Failed to update block ${update.arena_id}:`, updateError);
        }
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      fixed,
      total: blocksToFix?.length || 0,
      message: `Fixed ${fixed} YouTube video thumbnails. ${(blocksToFix?.length || 0) - fixed} blocks still need manual fixing.`
    });
  } catch (error) {
    console.error('Error fixing thumbnails:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}