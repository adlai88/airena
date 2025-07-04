import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    // Get the most recent channel from the database
    const { data: channels, error } = await supabase
      .from('channels')
      .select('slug')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching channel info:', error);
      return NextResponse.json({ channelSlug: null });
    }

    if (channels && channels.length > 0) {
      return NextResponse.json({ channelSlug: channels[0].slug });
    }

    return NextResponse.json({ channelSlug: null });
  } catch (error) {
    console.error('Error in channel-info API:', error);
    return NextResponse.json({ channelSlug: null });
  }
}