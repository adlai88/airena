import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const DEFAULT_CHANNEL = 'r-startups-founder-mode';

export async function GET() {
  try {
    // Get the most recently used channel from the database
    const { data: channels, error } = await supabase
      .from('channels')
      .select('slug, username')
      .order('last_sync', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching channel info:', error);
      // Return default channel if database error
      return NextResponse.json({ channelSlug: DEFAULT_CHANNEL, isDefault: true });
    }

    if (channels && channels.length > 0) {
      console.log('Channel-info API: Returning channel:', channels[0].slug);
      return NextResponse.json({ 
        channelSlug: channels[0].slug, 
        username: channels[0].username,
        isDefault: false 
      });
    }

    // Return default channel if no channels found
    return NextResponse.json({ channelSlug: DEFAULT_CHANNEL, isDefault: true });
  } catch (error) {
    console.error('Error in channel-info API:', error);
    // Return default channel if any error occurs
    return NextResponse.json({ channelSlug: DEFAULT_CHANNEL, isDefault: true });
  }
}