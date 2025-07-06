// Sync service to orchestrate the entire content processing pipeline
import { supabase } from './supabase';
import { arenaClient, ArenaChannel } from './arena';
import { contentExtractor, ProcessedAnyBlock } from './extraction';
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
  deletedBlocks: number; // blocks removed from Are.na
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
    // First try to update existing record
    const { data: existingChannel } = await supabase
      .from('channels')
      .select('id')
      .eq('arena_id', channel.id)
      .single();

    if (existingChannel) {
      // Update existing channel with all fields including username
      console.log(`Updating existing channel ${channel.slug} with username: ${channel.user.username}`);
      const { error } = await supabase
        .from('channels')
        .update({
          title: channel.title,
          slug: channel.slug,
          username: channel.user.username,
          last_sync: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('arena_id', channel.id);

      if (error) {
        console.error(`Failed to update channel ${channel.slug}:`, error);
        throw new Error(`Failed to update channel: ${error.message}`);
      }
      console.log(`Successfully updated channel ${channel.slug} with username: ${channel.user.username}`);
    } else {
      // Insert new channel
      console.log(`Inserting new channel ${channel.slug} with username: ${channel.user.username}`);
      const { error } = await supabase
        .from('channels')
        .insert({
          arena_id: channel.id,
          title: channel.title,
          slug: channel.slug,
          username: channel.user.username,
          user_id: null,
          last_sync: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error(`Failed to insert channel ${channel.slug}:`, error);
        throw new Error(`Failed to insert channel: ${error.message}`);
      }
      console.log(`Successfully inserted new channel ${channel.slug} with username: ${channel.user.username}`);
    }
  }

  /**
   * Get existing blocks from database to avoid re-processing
   */
  private async getExistingBlocks(channelId: number): Promise<Set<number>> {
    const { data, error } = await supabase
      .from('blocks')
      .select('arena_id')
      .eq('channel_id', channelId) as { data: { arena_id: number }[] | null; error: unknown };

    if (error) {
      throw new Error(`Failed to get existing blocks: ${String(error)}`);
    }

    return new Set(data?.map(block => block.arena_id) || []);
  }

  /**
   * Delete blocks that are no longer in the Are.na channel
   */
  private async deleteOrphanedBlocks(channelId: number, currentArenaBlocks: Set<number>): Promise<number> {
    try {
      // Get all existing blocks for this channel
      const { data: existingBlocks, error: fetchError } = await supabase
        .from('blocks')
        .select('arena_id, title')
        .eq('channel_id', channelId) as { data: { arena_id: number; title: string }[] | null; error: unknown };

      if (fetchError) {
        throw new Error(`Failed to fetch existing blocks: ${String(fetchError)}`);
      }

      if (!existingBlocks || existingBlocks.length === 0) {
        return 0;
      }

      // Find blocks that exist in database but not in current Are.na channel
      const blocksToDelete = existingBlocks.filter(block => !currentArenaBlocks.has(block.arena_id));

      if (blocksToDelete.length === 0) {
        console.log('No orphaned blocks to delete');
        return 0;
      }

      console.log(`Deleting ${blocksToDelete.length} orphaned blocks:`, blocksToDelete.map(b => `${b.arena_id} (${b.title})`));

      // Delete orphaned blocks
      const { error: deleteError } = await supabase
        .from('blocks')
        .delete()
        .eq('channel_id', channelId)
        .in('arena_id', blocksToDelete.map(b => b.arena_id));

      if (deleteError) {
        throw new Error(`Failed to delete orphaned blocks: ${deleteError.message}`);
      }

      console.log(`✅ Successfully deleted ${blocksToDelete.length} orphaned blocks`);
      return blocksToDelete.length;
    } catch (error) {
      console.error('Error deleting orphaned blocks:', error);
      throw error;
    }
  }

  /**
   * Sync a single channel by slug
   */
  async syncChannel(channelSlug: string): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let processedBlocks = 0;
    let skippedBlocks = 0;
    let deletedBlocks = 0;

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
      
      // Get detailed info for link, image, media, attachment, and text blocks
      const { linkBlocks, imageBlocks, mediaBlocks, attachmentBlocks, textBlocks, allBlocks: processableBlocks } = await arenaClient.getDetailedProcessableBlocks(allBlocks);

      this.reportProgress({
        stage: 'fetching',
        message: `Found ${processableBlocks.length} processable blocks (${linkBlocks.length} links, ${imageBlocks.length} images, ${mediaBlocks.length} media, ${attachmentBlocks.length} attachments, ${textBlocks.length} text) out of ${allBlocks.length} total blocks`,
        progress: 20,
        totalBlocks: processableBlocks.length,
      });

      // Stage 1.5: Delete orphaned blocks (blocks removed from Are.na)
      const currentArenaBlockIds = new Set(processableBlocks.map(block => block.id));
      deletedBlocks = await this.deleteOrphanedBlocks(channel.id, currentArenaBlockIds);
      
      if (deletedBlocks > 0) {
        this.reportProgress({
          stage: 'fetching',
          message: `Removed ${deletedBlocks} blocks that were deleted from Are.na`,
          progress: 25,
        });
      }

      if (processableBlocks.length === 0) {
        return {
          success: true,
          channelId: channel.id,
          totalBlocks: allBlocks.length,
          processedBlocks: 0,
          skippedBlocks: allBlocks.length,
          deletedBlocks,
          errors: ['No processable blocks found (no links or images with URLs)'],
          duration: Date.now() - startTime,
        };
      }

      // Get existing blocks to avoid re-processing
      const existingBlocks = await this.getExistingBlocks(channel.id);
      console.log(`Found ${existingBlocks.size} existing blocks in database:`, Array.from(existingBlocks));
      console.log(`Arena channel has ${processableBlocks.length} processable blocks:`, processableBlocks.map(b => b.id));
      let newBlocks = processableBlocks.filter(block => !existingBlocks.has(block.id));
      console.log(`Filtered to ${newBlocks.length} new blocks:`, newBlocks.map(b => b.id));

      // Enforce a 50-block processing limit for all users (feature gate for future premium users)
      const BLOCK_LIMIT = 50;
      if (newBlocks.length > BLOCK_LIMIT) {
        newBlocks = newBlocks.slice(0, BLOCK_LIMIT);
        errors.push(`Block limit reached: Only the first ${BLOCK_LIMIT} blocks will be processed.`);
      }

      if (newBlocks.length === 0) {
        return {
          success: true,
          channelId: channel.id,
          totalBlocks: linkBlocks.length,
          processedBlocks: 0,
          skippedBlocks: linkBlocks.length,
          deletedBlocks,
          errors: ['All blocks already processed'],
          duration: Date.now() - startTime,
        };
      }

      this.reportProgress({
        stage: 'extracting',
        message: `Processing ${newBlocks.length} new blocks...`,
        progress: 35,
        totalBlocks: newBlocks.length,
      });

      // Stage 2: Extract content from new blocks
      const processedBlocksList: ProcessedAnyBlock[] = [];

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
          const progress = 35 + (i + 1) / newBlocks.length * 35; // 35-70% for extraction
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
          deletedBlocks,
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
        deletedBlocks,
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
        deletedBlocks: 0,
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
        .single() as { data: { last_sync: string } | null; error: unknown };

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