import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    // Get session ID from headers
    const sessionId = req.headers.get('x-session-id') || 'no-session-id';
    
    // Get all channel usage records for debugging
    const { data: allUsage, error } = await supabase
      .from('channel_usage')
      .select(`
        id,
        channel_id,
        user_id,
        session_id,
        total_blocks_processed,
        created_at,
        channels!inner(
          title,
          slug
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    // Also get records that match this session ID
    const { data: sessionUsage, error: sessionError } = await supabase
      .from('channel_usage')
      .select(`
        id,
        channel_id,
        user_id,
        session_id,
        total_blocks_processed,
        created_at,
        channels!inner(
          title,
          slug
        )
      `)
      .eq('session_id', sessionId)
      .is('user_id', null);

    if (sessionError) {
      throw sessionError;
    }

    return NextResponse.json({
      currentSessionId: sessionId,
      totalRecords: allUsage?.length || 0,
      sessionRecords: sessionUsage?.length || 0,
      allUsage: allUsage || [],
      sessionUsage: sessionUsage || []
    });
  } catch (error) {
    console.error('Debug channels error:', error);
    return NextResponse.json(
      { error: 'Debug failed', details: String(error) },
      { status: 500 }
    );
  }
}