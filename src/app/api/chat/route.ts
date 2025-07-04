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

    // Get channel info
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('*')
      .eq('slug', channelSlug)
      .single() as { data: { arena_id: number; title: string } | null; error: any };

    if (channelError || !channel) {
      console.error('Channel not found:', channelError);
      return new Response('Channel not found', { status: 404 });
    }

    console.log('Found channel:', channel);

    // First check if we have any blocks with embeddings
    const { data: allBlocks, error: blocksError } = await supabase
      .from('blocks')
      .select('id, title')
      .eq('channel_id', channel.arena_id)
      .not('embedding', 'is', null);
    
    console.log('Total blocks with embeddings:', allBlocks?.length || 0);
    if (blocksError) console.error('Error fetching blocks:', blocksError);

    // Perform vector search for relevant content
    let relevantBlocks: any[] = [];
    try {
      // Create embedding for user query
      const embeddingService = new EmbeddingService();
      const queryEmbedding = await embeddingService.createEmbedding(lastMessage.content);

      // Search for similar blocks
      const { data: searchResults, error: searchError } = await supabase.rpc('search_blocks', {
        query_embedding: queryEmbedding,
        similarity_threshold: 0.3, // Lower threshold to get more results
        match_count: 5
      }) as { data: any[] | null; error: any };

      console.log('Query embedding length:', queryEmbedding.length);

      if (searchError) {
        console.error('Vector search error:', searchError);
        // Fall back to recent blocks if vector search fails
        const { data: fallbackBlocks, error: fallbackError } = await supabase
          .from('blocks')
          .select('title, url, content, description')
          .eq('channel_id', channel.arena_id)
          .not('embedding', 'is', null)
          .order('created_at', { ascending: false })
          .limit(3);
        
        console.log('Fallback blocks:', fallbackBlocks, 'Error:', fallbackError);
        relevantBlocks = fallbackBlocks || [];
      } else {
        console.log('Vector search results:', searchResults);
        relevantBlocks = searchResults || [];
      }
    } catch (error) {
      console.error('Search failed, using fallback:', error);
      // Fallback to recent blocks
      const { data: fallbackBlocks } = await supabase
        .from('blocks')
        .select('title, url, content, description')
        .eq('channel_id', channel.arena_id)
        .not('embedding', 'is', null)
        .order('created_at', { ascending: false })
        .limit(3);
      
      relevantBlocks = fallbackBlocks || [];
    }

    // Prepare context blocks
    const contextBlocks: ContextBlock[] = relevantBlocks.map(block => ({
      title: block.title || 'Untitled',
      url: block.url || '',
      content: block.content || block.description || '',
      similarity: block.similarity
    }));

    console.log('Context blocks prepared:', contextBlocks.length, 'blocks');
    console.log('Context sample:', contextBlocks.slice(0, 2));

    // Prepare conversation history (limit to last 6 messages for context)
    const conversationHistory = messages.slice(-6).map((msg: any) => ({
      role: msg.role,
      content: msg.content
    }));

    // Generate prompt with context
    const systemPrompt = PromptTemplates.chat(
      lastMessage.content,
      contextBlocks,
      channel.title,
      conversationHistory.slice(0, -1) // Exclude the current message
    );

    console.log('Generated system prompt length:', systemPrompt.length);
    console.log('System prompt preview:', systemPrompt.substring(0, 500) + '...');

    // Stream the response
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
      maxTokens: 1000,
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
    console.error('Chat error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}