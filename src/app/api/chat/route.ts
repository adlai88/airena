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

    // Check if this is a casual greeting or conversation that doesn't need content search
    const casualPatterns = /^(yo|hey|hi|hello|sup|what's up|thanks|thx|bye|goodbye)$/i;
    const isGreeting = casualPatterns.test(lastMessage.content.trim());

    // Perform optimized vector search
    let relevantBlocks: ContextBlock[] = [];
    
    if (!isGreeting) {
      try {
        // Create embedding for user query with caching potential
        const embeddingService = new EmbeddingService();
        const queryEmbedding = await embeddingService.createEmbedding(lastMessage.content);

      // Dynamic threshold search - start high, gradually lower until we get results
      let searchResults = null;
      let searchError = null;
      const thresholds = [0.7, 0.5, 0.3, 0.1];
      
      for (const threshold of thresholds) {
        const { data, error } = await supabase.rpc('search_blocks', {
          query_embedding: queryEmbedding,
          channel_filter: channel.arena_id,
          similarity_threshold: threshold,
          match_count: 10
        }) as { data: (ContextBlock & { block_type?: string })[] | null; error: unknown };
        
        if (!error && data && data.length > 0) {
          searchResults = data;
          searchError = error;
          break;
        }
      }

      if (searchError || !searchResults || searchResults.length === 0) {
        // Smarter fallback: mix of recent + diverse content
        const [recentData, diverseData] = await Promise.all([
          // Get 3 most recent blocks
          supabase
            .from('blocks')
            .select('id, arena_id, title, url, content, block_type')
            .eq('channel_id', channel.arena_id)
            .not('embedding', 'is', null)
            .order('created_at', { ascending: false })
            .limit(3),
          // Get 3 diverse blocks (different content types, spread across time)
          supabase
            .from('blocks')
            .select('id, arena_id, title, url, content, block_type')
            .eq('channel_id', channel.arena_id)
            .not('embedding', 'is', null)
            .order('updated_at', { ascending: false })
            .limit(10) // Get 10 to pick diverse ones from
        ]);
        
        // Combine recent + diverse, removing duplicates
        const recentBlocks = recentData.data || [];
        const allDiverseBlocks = diverseData.data || [];
        const recentIds = new Set(recentBlocks.map(b => b.id));
        const diverseBlocks = allDiverseBlocks
          .filter(b => !recentIds.has(b.id))
          .slice(0, 2); // Take 2 diverse blocks
        
        const fallbackBlocks = [...recentBlocks, ...diverseBlocks];
        
        relevantBlocks = (fallbackBlocks || []).map(block => ({
          title: String(block.title || 'Untitled'),
          url: String(block.url || ''),
          content: String(block.content || '').substring(0, 1000), // Truncate for performance
          similarity: 0,
          id: Number(block.id),
          arena_id: Number(block.arena_id),
          // For Image blocks, use the stored URL; for others, we'll need to get image data from Are.na API
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
      // Use same smarter fallback strategy for errors
      try {
        const [recentData, diverseData] = await Promise.all([
          supabase
            .from('blocks')
            .select('id, arena_id, title, url, content, block_type')
            .eq('channel_id', channel.arena_id)
            .not('embedding', 'is', null)
            .order('created_at', { ascending: false })
            .limit(3),
          supabase
            .from('blocks')
            .select('id, arena_id, title, url, content, block_type')
            .eq('channel_id', channel.arena_id)
            .not('embedding', 'is', null)
            .order('updated_at', { ascending: false })
            .limit(10)
        ]);
        
        const recentBlocks = recentData.data || [];
        const allDiverseBlocks = diverseData.data || [];
        const recentIds = new Set(recentBlocks.map(b => b.id));
        const diverseBlocks = allDiverseBlocks
          .filter(b => !recentIds.has(b.id))
          .slice(0, 2);
        
        const fallbackBlocks = [...recentBlocks, ...diverseBlocks];
        
        relevantBlocks = fallbackBlocks.map(block => ({
          title: String(block.title || 'Untitled'),
          url: String(block.url || ''),
          content: String(block.content || '').substring(0, 1000),
          similarity: 0,
          id: Number(block.id),
          arena_id: Number(block.arena_id),
          image_url: block.block_type === 'Image' ? String(block.url || '') : undefined
        }));
      } catch (fallbackError) {
        console.error('Fallback strategy also failed:', fallbackError);
        relevantBlocks = [];
      }
    }
    } else {
      // For greetings, skip vector search entirely
      relevantBlocks = [];
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

    // Function to extract mentioned blocks from AI response
    const extractMentionedBlocks = (aiResponse: string, availableBlocks: typeof relevantBlocks) => {
      const mentionedBlocks = [];
      
      for (const block of availableBlocks) {
        // Check if block title is mentioned in the AI response
        const titleWords = block.title.toLowerCase().split(/\s+/).filter(word => word.length > 3);
        const responseText = aiResponse.toLowerCase();
        
        // If at least 2 significant words from the title appear in the response, consider it mentioned
        if (titleWords.length > 0) {
          const matchedWords = titleWords.filter(word => responseText.includes(word));
          if (matchedWords.length >= Math.min(2, titleWords.length)) {
            mentionedBlocks.push(block);
          }
        }
      }
      
      return mentionedBlocks;
    };

    // We'll determine mentioned blocks after getting the AI response
    let contextImages: Array<{ title: string; url: string; image_url: string }> = [];

    // Create a streaming response that includes both text and image context
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = '';
        
        // Stream text chunks and collect full response
        for await (const chunk of result.textStream) {
          fullResponse += chunk;
          const data = JSON.stringify({ type: 'text', content: chunk });
          controller.enqueue(new TextEncoder().encode(data + '\n'));
        }
        
        // After streaming is complete, extract mentioned blocks and get thumbnails
        if (relevantBlocks.length > 0) {
          const mentionedBlocks = extractMentionedBlocks(fullResponse, relevantBlocks);
          
          // Get thumbnails only for mentioned blocks
          for (const block of mentionedBlocks.slice(0, 6)) { // Limit to 6 to prevent too many
            try {
              const response = await fetch(`https://api.are.na/v2/blocks/${block.arena_id || block.id}`);
              if (response.ok) {
                const detailedBlock = await response.json();
                const thumbnailUrl = detailedBlock.image?.thumb?.url || 
                                     detailedBlock.image?.square?.url ||
                                     (detailedBlock.class === 'Image' ? block.image_url : undefined);
                
                if (thumbnailUrl) {
                  contextImages.push({
                    title: block.title,
                    url: `https://www.are.na/block/${detailedBlock.id}`,
                    image_url: thumbnailUrl
                  });
                }
              }
            } catch (error) {
              console.warn(`Failed to fetch thumbnail for mentioned block ${block.arena_id || block.id}:`, error);
            }
          }
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