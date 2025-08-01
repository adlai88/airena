import { NextResponse } from 'next/server';
import { SimpleUsageTracker } from '@/lib/simple-usage';
import { supabaseServiceRole } from '@/lib/supabase';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    console.log('[usage-stats] Starting request');
    
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const userId = session?.user?.id;
    
    console.log('[usage-stats] User ID:', userId ? 'found' : 'not found');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user stats from SimpleUsageTracker
    const simpleStats = await SimpleUsageTracker.getUserStats(userId);
    
    // Get channel usage data with channels
    const { data: channelUsage } = await supabaseServiceRole
      .from('channel_usage')
      .select('*')
      .eq('user_id', userId)
      .order('last_processed_at', { ascending: false });
    
    // Get channel details for each usage record
    const channelIds = (channelUsage || []).map(usage => usage.channel_id);
    const { data: channelsData } = await supabaseServiceRole
      .from('channels')
      .select('id, title, slug, thumbnail_url')
      .in('id', channelIds);
    
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
    const totalBlocksProcessed = simpleStats.blocksUsed;

    // Get tier info based on user's tier
    const tierInfo = getTierInfo(simpleStats.tier);
    
    // Format response for usage page
    const stats = {
      tier: simpleStats.tier,
      monthly: {
        // For free tier, we'll show lifetime usage instead of monthly
        current: simpleStats.tier === 'free' ? simpleStats.blocksUsed : 0,
        limit: simpleStats.tier === 'free' ? 50 : (simpleStats.tier === 'starter' ? 200 : 500),
        remaining: simpleStats.tier === 'free' ? simpleStats.blocksRemaining : 999999,
        month: new Date().toISOString().slice(0, 7)
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
    case 'starter':
      return {
        name: 'Starter',
        blocks: 200,
        type: 'per_month',
        price: '$5/month',
        features: [
          'No lifetime limit',
          'Private channels access',
          'Unlimited channels',
          'Advanced templates',
          'Export generated content'
        ]
      };
    case 'pro':
      return {
        name: 'Pro',
        blocks: 500,
        type: 'per_month',
        price: '$14/month',
        features: [
          'No lifetime limit',
          'Everything in Starter',
          'MCP server generation',
          'API access',
          'Webhook support',
          'Priority processing'
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