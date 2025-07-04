// Sync service to orchestrate the entire content processing pipeline
import { supabase } from './supabase';
import { arenaClient, ArenaChannel } from './arena';
import { contentExtractor, ProcessedBlock } from './extraction';
import { embeddingService } from './embeddings';

export interface SyncProgress {
  stage: 'fetching' | 'extracting' | 'embedding' | 'storing' | 'complete' | 'error';
  message: string;
  progress: number; // 0-100
  totalBlocks?: number;
  processedBlocks?: number;
  errors?: string[];
}

export interface SyncResult {
  success: boolean;
  channelId: number;
  totalBlocks: number;
  processedBlocks: number;
  skippedBlocks: number;
  errors: string[];
  duration: number; // milliseconds
}

export class SyncService {
  private onProgress?: (progress: SyncProgress) => void;

  constructor(onProgress?: (progress: SyncProgress) => void) {
    this.onProgress = onProgress;
  }

  private reportProgress(progress: SyncProgress) {
    if (this.onProgress) {
      this.onProgress(progress);
    }
    console.log(`[${progress.stage.toUpperCase()}] ${progress.message} (${progress.progress}%)`);
  }

  /**
   * Store or update channel in database
   */
  private async upsertChannel(channel: ArenaChannel): Promise<void> {
    const { error } = await supabase
      .from('channels')
      .upsert({
        arena_id: channel.id,
        title: channel.title,
        slug: channel.slug,
        user_id: null, // TODO: Add user management later
        last_sync: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'arena_id'
      });

    if (error) {
      throw new Error(`Failed to store channel: ${error.message}`);
    }
  }

  /**
   * Get existing blocks from database to avoid re-processing
   */
  private async getExistingBlocks(channelId: number): Promise<Set<number>> {
    const { data, error } = await supabase
      .from('blocks')
      .select('arena_id')
      .eq('channel_id', channelId) as { data: { arena_id: number }[] | null; error: any };

    if (error) {
      throw new Error(`Failed to get existing blocks: ${error.message}`);
    }

    return new Set(data?.map(block => block.arena_id) || []);
  }

  /**
   * Sync a single channel by slug
   */
  async syncChannel(channelSlug: string): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let processedBlocks = 0;
    let skippedBlocks = 0;

    try {
      // Stage 1: Fetch channel and contents
      this.reportProgress({
        stage: 'fetching',
        message: `Fetching channel "${channelSlug}"...`,
        progress: 10,
      });

      const channel = await arenaClient.getChannel(channelSlug);
      await this.upsertChannel(channel);

      const allBlocks = await arenaClient.getAllChannelContents(channelSlug);
      
      // Get detailed info for link blocks to access source URLs
      const linkBlocks = await arenaClient.getDetailedLinkBlocks(allBlocks);

      this.reportProgress({
        stage: 'fetching',
        message: `Found ${linkBlocks.length} link blocks out of ${allBlocks.length} total blocks`,
        progress: 20,
        totalBlocks: linkBlocks.length,
      });

      if (linkBlocks.length === 0) {
        return {
          success: true,
          channelId: channel.id,
          totalBlocks: allBlocks.length,
          processedBlocks: 0,
          skippedBlocks: allBlocks.length,
          errors: ['No link blocks found to process'],
          duration: Date.now() - startTime,
        };
      }

      // Get existing blocks to avoid re-processing
      const existingBlocks = await this.getExistingBlocks(channel.id);
      const newBlocks = linkBlocks.filter(block => !existingBlocks.has(block.id));

      if (newBlocks.length === 0) {
        return {
          success: true,
          channelId: channel.id,
          totalBlocks: linkBlocks.length,
          processedBlocks: 0,
          skippedBlocks: linkBlocks.length,
          errors: ['All blocks already processed'],
          duration: Date.now() - startTime,
        };
      }

      this.reportProgress({
        stage: 'extracting',
        message: `Processing ${newBlocks.length} new blocks...`,
        progress: 30,
        totalBlocks: newBlocks.length,
      });

      // Stage 2: Extract content from new blocks
      const processedBlocksList: ProcessedBlock[] = [];

      for (let i = 0; i < newBlocks.length; i++) {
        const block = newBlocks[i];
        
        try {
          const processedBlock = await contentExtractor.processBlock(block);
          
          if (processedBlock) {
            processedBlocksList.push(processedBlock);
            processedBlocks++;
          } else {
            skippedBlocks++;
            errors.push(`Failed to extract content from block ${block.id}: ${block.source_url}`);
          }

          // Report progress
          const progress = 30 + (i + 1) / newBlocks.length * 40; // 30-70% for extraction
          this.reportProgress({
            stage: 'extracting',
            message: `Processed ${i + 1}/${newBlocks.length} blocks`,
            progress,
            totalBlocks: newBlocks.length,
            processedBlocks: processedBlocks,
          });

        } catch (error) {
          skippedBlocks++;
          const errorMsg = `Error processing block ${block.id}: ${error}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      if (processedBlocksList.length === 0) {
        return {
          success: false,
          channelId: channel.id,
          totalBlocks: newBlocks.length,
          processedBlocks: 0,
          skippedBlocks: newBlocks.length,
          errors: ['No blocks could be processed successfully'],
          duration: Date.now() - startTime,
        };
      }

      // Stage 3: Create embeddings and store
      this.reportProgress({
        stage: 'embedding',
        message: `Creating embeddings for ${processedBlocksList.length} blocks...`,
        progress: 70,
        totalBlocks: processedBlocksList.length,
      });

      for (let i = 0; i < processedBlocksList.length; i++) {
        const processedBlock = processedBlocksList[i];

        try {
          // Create embedding (using first chunk for simplicity in MVP)
          const embeddingChunks = await embeddingService.createBlockEmbedding(processedBlock);
          
          if (embeddingChunks.length > 0) {
            // Use the first chunk's embedding for the block
            await embeddingService.storeBlock(
              processedBlock,
              channel.id,
              embeddingChunks[0].embedding
            );
          }

          // Report progress
          const progress = 70 + (i + 1) / processedBlocksList.length * 25; // 70-95% for embedding
          this.reportProgress({
            stage: 'embedding',
            message: `Embedded ${i + 1}/${processedBlocksList.length} blocks`,
            progress,
            totalBlocks: processedBlocksList.length,
            processedBlocks: i + 1,
          });

        } catch (error) {
          const errorMsg = `Error creating embedding for block ${processedBlock.arenaId}: ${error}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      // Update channel sync timestamp
      await this.upsertChannel(channel);

      this.reportProgress({
        stage: 'complete',
        message: `Sync complete! Processed ${processedBlocks}/${newBlocks.length} blocks`,
        progress: 100,
        totalBlocks: newBlocks.length,
        processedBlocks: processedBlocks,
        errors: errors.length > 0 ? errors : undefined,
      });

      return {
        success: true,
        channelId: channel.id,
        totalBlocks: newBlocks.length,
        processedBlocks,
        skippedBlocks,
        errors,
        duration: Date.now() - startTime,
      };

    } catch (error) {
      const errorMsg = `Sync failed: ${error}`;
      errors.push(errorMsg);

      this.reportProgress({
        stage: 'error',
        message: errorMsg,
        progress: 0,
        errors,
      });

      return {
        success: false,
        channelId: 0,
        totalBlocks: 0,
        processedBlocks,
        skippedBlocks,
        errors,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Get sync status for a channel
   */
  async getChannelSyncStatus(channelSlug: string): Promise<{
    channel: ArenaChannel | null;
    lastSync: string | null;
    stats: {
      totalBlocks: number;
      embeddedBlocks: number;
      lastUpdated: string | null;
    };
  }> {
    try {
      // Get channel info
      const channel = await arenaClient.getChannel(channelSlug);
      
      // Get database info
      const { data: dbChannel } = await supabase
        .from('channels')
        .select('last_sync')
        .eq('arena_id', channel.id)
        .single() as { data: { last_sync: string } | null; error: any };

      // Get embedding stats
      const stats = await embeddingService.getChannelStats(channel.id);

      return {
        channel,
        lastSync: dbChannel?.last_sync || null,
        stats,
      };
    } catch (error) {
      console.error('Failed to get sync status:', error);
      return {
        channel: null,
        lastSync: null,
        stats: {
          totalBlocks: 0,
          embeddedBlocks: 0,
          lastUpdated: null,
        },
      };
    }
  }
}

// Export singleton instance
export const syncService = new SyncService();