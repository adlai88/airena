// API route for streaming newsletter generation
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { channelSlug, customPrompt } = await req.json();

    if (!channelSlug) {
      return new Response('Channel slug is required', { status: 400 });
    }

    // Get channel info
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('*')
      .eq('slug', channelSlug)
      .single() as { data: { arena_id: number; title: string } | null; error: unknown };

    if (channelError || !channel) {
      return new Response('Channel not found', { status: 404 });
    }

    // Get all blocks for this channel for context
    const { data: blocks, error: blocksError } = await supabase
      .from('blocks')
      .select('title, url, content, description')
      .eq('channel_id', channel.arena_id)
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