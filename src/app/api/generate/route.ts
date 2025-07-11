// API route for streaming newsletter generation
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { supabase } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';
import { UsageTracker } from '@/lib/usage-tracking';

export async function POST(req: Request) {
  try {
    const { channelSlug, customPrompt, sessionId } = await req.json();

    if (!channelSlug) {
      return new Response('Channel slug is required', { status: 400 });
    }

    // Get authentication info (optional for free users)
    let userId: string | null = null;
    try {
      const authResult = await auth();
      userId = authResult.userId;
    } catch {
      // No authentication required for free users
      userId = null;
    }
    const userSessionId = sessionId || UsageTracker.generateSessionId();

    // Get channel info
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('*')
      .eq('slug', channelSlug)
      .single() as { data: { id: number; arena_id: number; title: string } | null; error: unknown };

    if (channelError || !channel) {
      return new Response('Channel not found', { status: 404 });
    }

    // Check generation limits for free tier users
    const generationLimitCheck = await UsageTracker.checkChatGenerationLimits(
      channel.id,
      userSessionId,
      userId || undefined,
      'generation'
    );

    if (!generationLimitCheck.canGenerate) {
      return new Response(
        JSON.stringify({
          error: 'Generation limit exceeded',
          message: generationLimitCheck.message,
          limitInfo: {
            used: generationLimitCheck.generationsUsed,
            limit: generationLimitCheck.generationsRemaining + generationLimitCheck.generationsUsed,
            tier: generationLimitCheck.tier
          }
        }),
        { 
          status: 429, 
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get all blocks for this channel for context
    const { data: blocks, error: blocksError } = await supabase
      .from('blocks')
      .select('title, url, content, description')
      .eq('channel_id', channel.id)
      .not('embedding', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10) as { data: { title: string; url: string; content: string; description: string }[] | null; error: unknown }; // Use most recent blocks for newsletter

    if (blocksError) {
      return new Response('Failed to fetch blocks', { status: 500 });
    }

    if (!blocks || blocks.length === 0) {
      return new Response('No content found for this channel', { status: 404 });
    }

    // Prepare context from blocks for the template
    const contextText = blocks.map(block => {
      const title = block.title || 'Untitled';
      const content = block.content || block.description || '';
      const url = block.url || '';
      
      return `**${title}**${url ? ` (${url})` : ''}\n${content}`;
    }).join('\n\n---\n\n');

    // If we have a custom prompt (from newsletter templates), use it with proper context
    let prompt: string;
    if (customPrompt) {
      // Replace template variables with actual data
      prompt = customPrompt
        .replace('{channel_title}', channel.title)
        .replace('{block_count}', blocks.length.toString());
      
      // Add the actual content context
      prompt += `\n\nContext from ${channel.title} channel (${blocks.length} sources):\n\n${contextText}`;
    } else {
      // Fallback to a simple prompt if no custom template
      prompt = `Create a research newsletter from the following curated content from the "${channel.title}" channel:\n\n${contextText}`;
    }

    // Stream the response
    const result = await streamText({
      model: openai('gpt-4o-mini'),
      prompt,
      temperature: 0.7,
      maxTokens: 2000,
    });

    // Create a simple text stream
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of result.textStream) {
          controller.enqueue(new TextEncoder().encode(chunk));
        }
        controller.close();
      },
    });

    // Record generation usage for free tier users (async, don't await)
    UsageTracker.recordChatGenerationUsage(
      channel.id,
      userSessionId,
      'generation',
      userId || undefined
    ).catch(error => {
      console.error('Failed to record generation usage:', error);
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (error) {
    console.error('Newsletter generation error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}