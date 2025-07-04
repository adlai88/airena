// Embedding service for creating and managing vector embeddings
import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';
import { supabase, Block } from './supabase';
import { ProcessedBlock } from './extraction';

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
   * Create embedding for a text string
   */
  async createEmbedding(text: string): Promise<number[]> {
    try {
      const { embedding } = await embed({
        model: openai.textEmbedding(this.model),
        value: text,
      });

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
  async createBlockEmbedding(block: ProcessedBlock): Promise<EmbeddingChunk[]> {
    // Combine title, description, and content for embedding
    const fullText = [
      block.title,
      block.description,
      block.content
    ].filter(Boolean).join('\n\n');

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
    block: ProcessedBlock, 
    channelId: number,
    embedding: number[]
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('blocks')
        .upsert({
          arena_id: block.arenaId,
          channel_id: channelId,
          title: block.title,
          description: block.description,
          content: block.content,
          url: block.url,
          block_type: block.blockType,
          embedding: embedding,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'arena_id'
        });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      console.log(`✅ Stored block ${block.arenaId} in database`);
    } catch (error) {
      console.error(`Failed to store block ${block.arenaId}:`, error);
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
      }) as { data: Block[] | null; error: any };

      if (error) {
        throw new Error(`Search error: ${error.message}`);
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
        .eq('channel_id', channelId) as { data: { id: number; embedding: any; updated_at: string }[] | null; error: any };

      if (error) {
        throw new Error(`Stats query error: ${error.message}`);
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