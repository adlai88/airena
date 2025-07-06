// API route for streaming chat with vector search
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { supabase } from '@/lib/supabase';
import { EmbeddingService } from '@/lib/embeddings';
import { PromptTemplates, ContextBlock } from '@/lib/templates';

export async function POST(req: Request) {
  try {
    const { messages, channelSlug } = await req.json();

    if (!messages || messages.length === 0) {
      return new Response('Messages are required', { status: 400 });
    }

    if (!channelSlug) {
      return new Response('Channel slug is required', { status: 400 });
    }

    // Get the latest user message
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'user') {
      return new Response('Last message must be from user', { status: 400 });
    }

    // Get channel info with block count in single query
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('arena_id, title, slug')
      .eq('slug', channelSlug)
      .single() as { data: { arena_id: number; title: string; slug: string } | null; error: unknown };

    if (channelError || !channel) {
      return new Response('Channel not found', { status: 404 });
    }

    // Perform optimized vector search
    let relevantBlocks: ContextBlock[] = [];
    try {
      // Create embedding for user query with caching potential
      const embeddingService = new EmbeddingService();
      const queryEmbedding = await embeddingService.createEmbedding(lastMessage.content);

      // Search for similar blocks within the specific channel - include block_type for image identification
      const { data: searchResults, error: searchError } = await supabase.rpc('search_blocks', {
        query_embedding: queryEmbedding,
        channel_filter: channel.arena_id,
        similarity_threshold: 0.3,
        match_count: 5
      }) as { data: (ContextBlock & { block_type?: string })[] | null; error: unknown };

      if (searchError || !searchResults || searchResults.length === 0) {
        // Optimized fallback query - include block_type to identify images
        const { data: fallbackBlocks } = await supabase
          .from('blocks')
          .select('title, url, content, block_type')
          .eq('channel_id', channel.arena_id)
          .not('embedding', 'is', null)
          .order('created_at', { ascending: false })
          .limit(5);
        
        relevantBlocks = (fallbackBlocks || []).map(block => ({
          title: String(block.title || 'Untitled'),
          url: String(block.url || ''),
          content: String(block.content || '').substring(0, 1000), // Truncate for performance
          similarity: 0,
          image_url: block.block_type === 'Image' ? String(block.url || '') : undefined
        }));
      } else {
        relevantBlocks = (searchResults || []).map(block => ({
          ...block,
          content: block.content.substring(0, 1000), // Truncate long content
          image_url: block.block_type === 'Image' ? String(block.url || '') : undefined
        }));
      }
    } catch {
      // Simplified error fallback - include block_type to identify images
      const { data: fallbackBlocks } = await supabase
        .from('blocks')
        .select('title, url, content, block_type')
        .eq('channel_id', channel.arena_id)
        .not('embedding', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5);
      
      relevantBlocks = (fallbackBlocks || []).map(block => ({
        title: String(block.title || 'Untitled'),
        url: String(block.url || ''),
        content: String(block.content || '').substring(0, 1000),
        similarity: 0,
        image_url: block.block_type === 'Image' ? String(block.url || '') : undefined
      }));
    }

    // Prepare optimized context (limit conversation history for performance)
    const conversationHistory = messages.slice(-4).map((msg: { role: string; content: string }) => ({
      role: msg.role,
      content: msg.content.substring(0, 500) // Truncate long messages
    }));

    // Generate optimized prompt
    const systemPrompt = PromptTemplates.chat(
      lastMessage.content,
      relevantBlocks,
      channel.title,
      conversationHistory.slice(0, -1)
    );

    // Stream optimized response
    const result = await streamText({
      model: openai('gpt-4o-mini'),
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user', 
          content: lastMessage.content
        }
      ],
      temperature: 0.7,
      maxTokens: 800, // Reduced for faster responses
    });

    // Filter images from context (only include images that have image_url)
    const contextImages = relevantBlocks
      .filter(block => block.image_url)
      .map(block => ({
        title: block.title,
        url: block.url,
        image_url: block.image_url
      }))
      .slice(0, 4); // Limit to 4 images max

    // Create a streaming response that includes both text and image context
    const stream = new ReadableStream({
      async start(controller) {
        // Stream text chunks
        for await (const chunk of result.textStream) {
          const data = JSON.stringify({ type: 'text', content: chunk });
          controller.enqueue(new TextEncoder().encode(data + '\n'));
        }
        
        // Send image context at the end if we have images
        if (contextImages.length > 0) {
          const imageData = JSON.stringify({ type: 'images', content: contextImages });
          controller.enqueue(new TextEncoder().encode(imageData + '\n'));
        }
        
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/json',
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (error) {
    console.error('Chat error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}