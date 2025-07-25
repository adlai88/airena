import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth-helpers';
import { createClient } from '@supabase/supabase-js';
import { UserServiceV2 } from '@/lib/user-service-v2';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get user authentication and tier
    const userId = await getCurrentUserId();
    const userTier = userId ? await UserServiceV2.getUserTier(userId) : 'free';
    
    // Parse query params
    const { searchParams } = new URL(request.url);
    const channelType = searchParams.get('type') || 'public'; // 'public' | 'private'
    
    console.log('🔍 Recent channels request:', { userId, userTier, channelType });

    // Build query based on user tier and requested type
    let query = supabase
      .from('channels')
      .select(`
        id,
        slug,
        title,
        thumbnail_url,
        last_sync,
        created_at,
        arena_id,
        is_private,
        user_id
      `)
      .order('last_sync', { ascending: false })
      .limit(10);

    // Apply privacy filters based on user tier and requested type
    if (channelType === 'private') {
      if (userTier === 'free') {
        // Free users can't access private channels - return empty
        return NextResponse.json({ channels: [] });
      } else {
        // Premium users: show their own private channels only
        query = query.eq('is_private', true).eq('user_id', userId);
      }
    } else {
      // Public channels: visible to everyone
      query = query.eq('is_private', false);
    }

    const { data: channels, error } = await query;

    if (error) {
      console.error('Error fetching recent channels:', error);
      return NextResponse.json({ channels: [] });
    }
    
    console.log('📊 Query returned channels:', channels?.length || 0);

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
          thumbnailUrl: channel.thumbnail_url,
          lastSync: channel.last_sync,
          createdAt: channel.created_at,
          blockCount: blockCount || 0,
          isPrivate: channel.is_private || false,
          userId: channel.user_id,
        };
      })
    );

    // Filter out channels with 0 blocks - they're not useful for generation/chat
    const channelsWithContent = formattedChannels.filter(channel => channel.blockCount > 0);
    
    console.log('✅ Returning channels:', channelsWithContent.length);

    return NextResponse.json({ channels: channelsWithContent });
  } catch (error) {
    console.error('Error in recent-channels API:', error);
    return NextResponse.json({ channels: [] });
  }
}