import { NextResponse } from 'next/server';
import { SimpleUsageTracker } from '@/lib/simple-usage';
import { supabaseServiceRole } from '@/lib/supabase';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    console.log('[usage-stats] Starting request');
    
    let session;
    let userId;
    
    try {
      const headersList = await headers();
      session = await auth.api.getSession({
        headers: headersList,
      });
      userId = session?.user?.id;
      console.log('[usage-stats] Session retrieved, User ID:', userId ? 'found' : 'not found');
    } catch (sessionError) {
      console.error('[usage-stats] Session retrieval error:', sessionError);
      return NextResponse.json(
        { error: 'Failed to authenticate user' },
        { status: 401 }
      );
    }
    
    if (!userId) {
      console.log('[usage-stats] No user ID found in session');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('[usage-stats] Getting user stats...');
    // Get user stats from SimpleUsageTracker
    const simpleStats = await SimpleUsageTracker.getUserStats(userId);
    console.log('[usage-stats] User stats retrieved:', simpleStats.tier);
    
    console.log('[usage-stats] Getting channel usage data...');
    // Get channel usage data with channels
    const { data: channelUsage, error: usageError } = await supabaseServiceRole
      .from('channel_usage')
      .select('*')
      .eq('user_id', userId)
      .order('last_processed_at', { ascending: false });
    
    if (usageError) {
      console.error('[usage-stats] Channel usage query error:', usageError);
    }
    console.log('[usage-stats] Channel usage retrieved:', (channelUsage || []).length, 'records');
    
    // Get channel details for each usage record
    const channelIds = (channelUsage || []).map(usage => usage.channel_id);
    console.log('[usage-stats] Getting channel details for', channelIds.length, 'channels...');
    
    const { data: channelsData, error: channelsError } = await supabaseServiceRole
      .from('channels')
      .select('id, title, slug, thumbnail_url')
      .in('id', channelIds);
    
    if (channelsError) {
      console.error('[usage-stats] Channels query error:', channelsError);
    }
    console.log('[usage-stats] Channel details retrieved:', (channelsData || []).length, 'channels');
    
    // Create a map for quick lookup
    const channelMap = new Map((channelsData || []).map(ch => [ch.id, ch]));
    
    // Merge the data
    const channels = (channelUsage || []).map(usage => {
      const channel = channelMap.get(usage.channel_id) || {};
      return {
        ...usage,
        channels: channel
      };
    });

    // Flatten channel data
    interface ChannelUsageRecord {
      channels: {
        title?: string;
        slug?: string;
        thumbnail_url?: string;
      };
      [key: string]: unknown;
    }
    
    const processedChannels = (channels as ChannelUsageRecord[] || []).map((record) => ({
      ...record,
      channel_title: record.channels?.title,
      channel_slug: record.channels?.slug,
      channel_thumbnail_url: record.channels?.thumbnail_url,
      channels: undefined
    }));

    // Calculate totals
    const totalChannelsProcessed = processedChannels.length;
    // Sum up blocks from all channel usage records for accurate total
    const totalBlocksFromChannels = processedChannels.reduce((sum, ch) => sum + (ch.total_blocks_processed || 0), 0);
    const totalBlocksProcessed = totalBlocksFromChannels;
    
    console.log('[usage-stats] Final stats:', {
      tier: simpleStats.tier,
      blocksUsed: simpleStats.blocksUsed,
      channelsFound: totalChannelsProcessed,
      blocksFromChannels: processedChannels.reduce((sum, ch) => sum + (ch.total_blocks_processed || 0), 0)
    });

    // Get tier info based on user's tier
    const tierInfo = getTierInfo(simpleStats.tier);
    
    // Calculate monthly usage (blocks processed this month)
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    const monthlyBlocks = processedChannels
      .filter(ch => ch.last_processed_at && ch.last_processed_at.startsWith(currentMonth))
      .reduce((sum, ch) => sum + (ch.total_blocks_processed || 0), 0);
    
    // Format response for usage page
    const stats = {
      tier: simpleStats.tier,
      monthly: {
        current: monthlyBlocks,
        limit: simpleStats.tier === 'free' ? 50 : -1,
        remaining: simpleStats.tier === 'free' ? Math.max(0, 50 - monthlyBlocks) : 999999,
        month: currentMonth
      },
      channels: processedChannels,
      totalChannelsProcessed,
      totalBlocksProcessed,
      tierInfo
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error getting usage stats:', error);
    return NextResponse.json(
      { error: 'Failed to get usage statistics' },
      { status: 500 }
    );
  }
}

function getTierInfo(tier: string): {
  name: string;
  blocks: number;
  type: string;
  price?: string;
  features: string[];
} {
  switch (tier) {
    case 'free':
      return {
        name: 'Free',
        blocks: 50,
        type: 'lifetime',
        features: [
          '50 blocks lifetime limit',
          'Public channels only',
          'Chat with your channels',
          'Generate content',
          'Spatial canvas view'
        ]
      };
    case 'founding':
      return {
        name: 'Founding Member',
        blocks: -1,
        type: 'unlimited',
        price: '$5/month forever',
        features: [
          'Everything unlimited forever',
          'Private channels access',
          'Priority support',
          'All future features',
          '70%+ savings vs future pricing',
          'Limited to first 100 members'
        ]
      };
    default:
      return {
        name: 'Free',
        blocks: 50,
        type: 'lifetime',
        features: []
      };
  }
}