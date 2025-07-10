import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    // Get recent channels with block count stats
    const { data: channels, error } = await supabase
      .from('channels')
      .select(`
        id,
        slug,
        title,
        last_sync,
        created_at,
        arena_id,
        blocks!inner(count)
      `)
      .order('last_sync', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching recent channels:', error);
      return NextResponse.json({ channels: [] });
    }

    // Format the response to include block counts
    const formattedChannels = await Promise.all(
      (channels || []).map(async (channel) => {
        // Get block count for this channel (using the correct channel.id for foreign key)
        const { count: blockCount, error: countError } = await supabase
          .from('blocks')
          .select('*', { count: 'exact', head: true })
          .eq('channel_id', channel.id);
        
        if (countError) {
          console.error(`Error counting blocks for channel ${channel.slug}:`, countError);
        }
        console.log(`Channel ${channel.slug} (arena_id: ${channel.arena_id}) has ${blockCount} blocks`);

        return {
          slug: channel.slug,
          title: channel.title,
          lastSync: channel.last_sync,
          createdAt: channel.created_at,
          blockCount: blockCount || 0,
        };
      })
    );

    // Filter out channels with 0 blocks - they're not useful for generation/chat
    const channelsWithContent = formattedChannels.filter(channel => channel.blockCount > 0);

    return NextResponse.json({ channels: channelsWithContent });
  } catch (error) {
    console.error('Error in recent-channels API:', error);
    return NextResponse.json({ channels: [] });
  }
}