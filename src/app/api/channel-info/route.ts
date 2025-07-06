import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const DEFAULT_CHANNEL = 'r-startups-founder-mode';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (slug) {
      // Get specific channel by slug
      const { data: channel, error } = await supabase
        .from('channels')
        .select('slug, username, title')
        .eq('slug', slug)
        .single();

      if (error) {
        console.error('Error fetching specific channel:', error);
        return NextResponse.json({ channelSlug: slug, title: slug, isDefault: false });
      }

      if (channel) {
        return NextResponse.json({ 
          channelSlug: channel.slug, 
          username: channel.username,
          title: channel.title,
          isDefault: false 
        });
      }
    }

    // Get the most recently used channel from the database
    const { data: channels, error } = await supabase
      .from('channels')
      .select('slug, username, title')
      .order('last_sync', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching channel info:', error);
      // Return default channel if database error
      return NextResponse.json({ channelSlug: DEFAULT_CHANNEL, isDefault: true });
    }

    if (channels && channels.length > 0) {
      console.log('Channel-info API: Returning channel:', channels[0].slug, 'username:', channels[0].username);
      return NextResponse.json({ 
        channelSlug: channels[0].slug, 
        username: channels[0].username,
        title: channels[0].title,
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