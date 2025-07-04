// API route for streaming newsletter generation
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { supabase } from '@/lib/supabase';
import { PromptTemplates, NewsletterOptions, ContextBlock } from '@/lib/templates';

export async function POST(req: Request) {
  try {
    const { channelSlug, options = {}, customPrompt } = await req.json();

    if (!channelSlug) {
      return new Response('Channel slug is required', { status: 400 });
    }

    // Get channel info
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('*')
      .eq('slug', channelSlug)
      .single() as { data: { arena_id: number; title: string } | null; error: any };

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
      .limit(10) as { data: { title: string; url: string; content: string; description: string }[] | null; error: any }; // Use most recent blocks for newsletter

    if (blocksError) {
      return new Response('Failed to fetch blocks', { status: 500 });
    }

    if (!blocks || blocks.length === 0) {
      return new Response('No content found for this channel', { status: 404 });
    }

    // Prepare context blocks
    const contextBlocks: ContextBlock[] = blocks.map(block => ({
      title: block.title || 'Untitled',
      url: block.url || '',
      content: block.content || block.description || '',
    }));

    // Generate prompt
    const prompt = customPrompt || PromptTemplates.newsletter(
      contextBlocks,
      channel.title,
      options as NewsletterOptions
    );

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