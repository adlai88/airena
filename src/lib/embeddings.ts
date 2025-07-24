// Embedding service for creating and managing vector embeddings
import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';
import { supabase, Block } from './supabase';
import { ProcessedAnyBlock, ProcessedBlock } from './extraction';
import { ProcessedImageBlock } from './vision';
import { embeddingCache } from './embedding-cache';

export interface EmbeddingChunk {
  text: string;
  embedding: number[];
  chunkIndex: number;
  totalChunks: number;
}

export class EmbeddingService {
  private readonly maxTokens = 8000; // Conservative limit for text-embedding-3-small
  private readonly model = 'text-embedding-3-small';

  /**
   * Create embedding for a text string with caching
   */
  async createEmbedding(text: string): Promise<number[]> {
    // Check cache first
    const cached = embeddingCache.get(text);
    if (cached) {
      return cached;
    }

    try {
      const { embedding } = await embed({
        model: openai.textEmbedding(this.model),
        value: text,
      });

      // Cache the result
      embeddingCache.set(text, embedding);
      return embedding;
    } catch (error) {
      console.error('Failed to create embedding:', error);
      throw new Error(`Embedding creation failed: ${error}`);
    }
  }

  /**
   * Split long text into chunks suitable for embedding
   */
  private chunkText(text: string, maxLength: number = this.maxTokens): string[] {
    if (!text || text.length === 0) {
      return [];
    }

    // If text is short enough, return as single chunk
    if (text.length <= maxLength) {
      return [text];
    }

    const chunks: string[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      const potentialChunk = currentChunk 
        ? `${currentChunk}. ${trimmedSentence}`
        : trimmedSentence;

      if (potentialChunk.length <= maxLength) {
        currentChunk = potentialChunk;
      } else {
        // Save current chunk if it has content
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        
        // If single sentence is too long, truncate it
        if (trimmedSentence.length > maxLength) {
          chunks.push(trimmedSentence.substring(0, maxLength));
          currentChunk = '';
        } else {
          currentChunk = trimmedSentence;
        }
      }
    }

    // Add remaining chunk
    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks.length > 0 ? chunks : [text.substring(0, maxLength)];
  }

  /**
   * Create embeddings for a processed block with chunking
   */
  async createBlockEmbedding(block: ProcessedAnyBlock): Promise<EmbeddingChunk[]> {
    // Get the content to embed based on block type
    let contentToEmbed: string;
    
    if (block.blockType === 'Image') {
      // For images, use the processed content from vision analysis
      const imageBlock = block as ProcessedImageBlock;
      contentToEmbed = [
        block.title,
        'description' in block ? block.description : null,
        imageBlock.processedContent
      ].filter(Boolean).join('\n\n');
    } else if (block.blockType === 'Text') {
      // For text blocks, just use title and content
      contentToEmbed = [
        block.title,
        block.content
      ].filter(Boolean).join('\n\n');
    } else {
      // For links, videos, attachments, use the original content structure
      const linkBlock = block as ProcessedBlock;
      contentToEmbed = [
        block.title,
        'description' in block ? block.description : null,
        linkBlock.content
      ].filter(Boolean).join('\n\n');
    }

    const fullText = contentToEmbed;

    if (!fullText.trim()) {
      throw new Error('No text content to embed');
    }

    const chunks = this.chunkText(fullText);
    const embeddings: EmbeddingChunk[] = [];

    console.log(`Creating embeddings for ${chunks.length} chunks...`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        const embedding = await this.createEmbedding(chunk);
        
        embeddings.push({
          text: chunk,
          embedding,
          chunkIndex: i,
          totalChunks: chunks.length,
        });

        console.log(`✅ Embedded chunk ${i + 1}/${chunks.length}`);

        // Rate limiting between embeddings
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Failed to embed chunk ${i + 1}:`, error);
        throw error;
      }
    }

    return embeddings;
  }

  /**
   * Store a block with its embeddings in the database
   */
  async storeBlock(
    block: ProcessedAnyBlock, 
    channelId: number,
    embedding: number[]
  ): Promise<void> {
    try {
      // Prepare data based on block type
      const url = block.blockType === 'Image' ? (block as ProcessedImageBlock).imageUrl : (block as ProcessedBlock).url;
      const content = block.blockType === 'Image' ? (block as ProcessedImageBlock).processedContent : (block as ProcessedBlock).content;
      
      // Extract thumbnail URL from original Arena block
      let thumbnailUrl: string | null = null;
      if ('originalBlock' in block && block.originalBlock) {
        const arenaBlock = block.originalBlock;
        
        // Debug log for blocks without thumbnails
        if (!arenaBlock.image?.thumb?.url && !arenaBlock.image?.display?.url) {
          console.log(`🔍 Block ${arenaBlock.id} (${arenaBlock.class}) needs thumbnail extraction:`, {
            sourceUrl: arenaBlock.source_url || arenaBlock.source?.url,
            hasProvider: !!arenaBlock.source?.provider,
          });
        }
        
        // Try to get thumbnail from various sources
        thumbnailUrl = arenaBlock.image?.thumb?.url || 
                      arenaBlock.image?.square?.url ||
                      arenaBlock.image?.display?.url ||
                      null;
                      
        // For Media/Video blocks, check provider thumbnail or generate from YouTube
        if (!thumbnailUrl && (arenaBlock.class === 'Media' || arenaBlock.class === 'Link')) {
          // Check if it's a YouTube video
          const sourceUrl = arenaBlock.source_url || arenaBlock.source?.url || '';
          const youtubeMatch = sourceUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
          
          if (youtubeMatch) {
            // Use YouTube's thumbnail service
            const videoId = youtubeMatch[1];
            thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            console.log(`🎥 Generated YouTube thumbnail for video ${videoId}`);
          } else if ((arenaBlock.source?.provider as any)?.image) {
            // Check for provider image (some embeds provide this)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            thumbnailUrl = (arenaBlock.source!.provider as any).image;
          }
        }
                      
        // For non-image blocks, check if there's an attachment thumbnail
        if (!thumbnailUrl && arenaBlock.class === 'Attachment' && arenaBlock.source?.url) {
          // Attachments might have their URL as thumbnail
          thumbnailUrl = arenaBlock.source.url;
        }
      }

      const { error } = await supabase
        .from('blocks')
        .upsert({
          arena_id: 'arenaId' in block ? block.arenaId : block.id,
          channel_id: channelId,
          title: block.title,
          description: 'description' in block ? block.description : null,
          content: content,
          url: url,
          thumbnail_url: thumbnailUrl,
          block_type: block.blockType,
          embedding: embedding,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'arena_id'
        });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      console.log(`✅ Stored block ${'arenaId' in block ? block.arenaId : block.id} in database${thumbnailUrl ? ' with thumbnail' : ''}`);
    } catch (error) {
      console.error(`Failed to store block ${'arenaId' in block ? block.arenaId : block.id}:`, error);
      throw error;
    }
  }

  /**
   * Vector similarity search
   */
  async searchSimilar(
    queryText: string,
    limit: number = 5,
    similarityThreshold: number = 0.7
  ): Promise<Block[]> {
    try {
      // Create embedding for query
      const queryEmbedding = await this.createEmbedding(queryText);

      // Perform vector similarity search
      const { data, error } = await supabase.rpc('search_blocks', {
        query_embedding: queryEmbedding,
        similarity_threshold: similarityThreshold,
        match_count: limit
      }) as { data: Block[] | null; error: unknown };

      if (error) {
        throw new Error(`Search error: ${String(error)}`);
      }

      return data || [];
    } catch (error) {
      console.error('Vector search failed:', error);
      throw error;
    }
  }

  /**
   * Get embedding stats for a channel
   */
  async getChannelStats(channelId: number): Promise<{
    totalBlocks: number;
    embeddedBlocks: number;
    lastUpdated: string | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('blocks')
        .select('id, embedding, updated_at')
        .eq('channel_id', channelId) as { data: { id: number; embedding: number[] | null; updated_at: string }[] | null; error: unknown };

      if (error) {
        throw new Error(`Stats query error: ${String(error)}`);
      }

      const totalBlocks = data?.length || 0;
      const embeddedBlocks = data?.filter(block => block.embedding).length || 0;
      const lastUpdated = data && data.length > 0 
        ? Math.max(...data.map(b => new Date(b.updated_at).getTime()))
        : null;

      return {
        totalBlocks,
        embeddedBlocks,
        lastUpdated: lastUpdated ? new Date(lastUpdated).toISOString() : null,
      };
    } catch (error) {
      console.error('Failed to get channel stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const embeddingService = new EmbeddingService();