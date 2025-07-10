// Sync service to orchestrate the entire content processing pipeline
import { supabase } from './supabase';
import { arenaClient, ArenaChannel } from './arena';
import { contentExtractor, ProcessedAnyBlock } from './extraction';
import { embeddingService } from './embeddings';
import { UsageTracker, UsageCheckResult } from './usage-tracking';

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
  channelTitle?: string;
  totalBlocks: number;
  processedBlocks: number;
  skippedBlocks: number;
  deletedBlocks: number; // blocks removed from Are.na
  errors: string[];
  duration: number; // milliseconds
  usageInfo?: UsageCheckResult;
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
   * Check if a URL is a video URL
   */
  private isVideoUrl(url: string): boolean {
    const videoPatterns = [
      /youtube\.com\/watch\?v=/,
      /youtu\.be\//,
      /vimeo\.com/,
      /dailymotion\.com/,
      /twitch\.tv/
    ];
    return videoPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Store or update channel in database
   */
  private async upsertChannel(channel: ArenaChannel): Promise<number> {
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
      return existingChannel.id as number;
    } else {
      // Insert new channel
      console.log(`Inserting new channel ${channel.slug} with username: ${channel.user.username}`);
      const { data: insertedChannel, error } = await supabase
        .from('channels')
        .insert({
          arena_id: channel.id,
          title: channel.title,
          slug: channel.slug,
          username: channel.user.username,
          user_id: null,
          last_sync: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        console.error(`Failed to insert channel ${channel.slug}:`, error);
        throw new Error(`Failed to insert channel: ${error.message}`);
      }
      console.log(`Successfully inserted new channel ${channel.slug} with username: ${channel.user.username}`);
      return insertedChannel.id as number;
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
  async syncChannel(
    channelSlug: string,
    sessionId: string,
    ipAddress: string,
    userId?: string
  ): Promise<SyncResult> {
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
      const dbChannelId = await this.upsertChannel(channel);

      const allBlocks = await arenaClient.getAllChannelContents(channelSlug);
      
      // Get detailed info for link, image, media, attachment, and text blocks
      const { linkBlocks, imageBlocks, mediaBlocks, attachmentBlocks, textBlocks, allBlocks: processableBlocks } = await arenaClient.getDetailedProcessableBlocks(allBlocks);

      // Create non-zero block type message
      const blockTypes = [];
      if (linkBlocks.length > 0) blockTypes.push(`${linkBlocks.length} websites`);
      if (mediaBlocks.length > 0) blockTypes.push(`${mediaBlocks.length} videos`);
      if (imageBlocks.length > 0) blockTypes.push(`${imageBlocks.length} images`);
      if (attachmentBlocks.length > 0) blockTypes.push(`${attachmentBlocks.length} attachments`);
      if (textBlocks.length > 0) blockTypes.push(`${textBlocks.length} text blocks`);
      
      const blockTypeMessage = blockTypes.length > 0 ? ` (${blockTypes.join(', ')})` : '';

      this.reportProgress({
        stage: 'fetching',
        message: `Found ${processableBlocks.length} processable blocks${blockTypeMessage} out of ${allBlocks.length} total blocks`,
        progress: 20,
        totalBlocks: processableBlocks.length,
      });

      // Stage 1.5: Delete orphaned blocks (blocks removed from Are.na)
      const currentArenaBlockIds = new Set(processableBlocks.map(block => block.id));
      deletedBlocks = await this.deleteOrphanedBlocks(dbChannelId, currentArenaBlockIds);
      
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
          channelId: dbChannelId,
          totalBlocks: allBlocks.length,
          processedBlocks: 0,
          skippedBlocks: allBlocks.length,
          deletedBlocks,
          errors: ['No processable blocks found (no links or images with URLs)'],
          duration: Date.now() - startTime,
        };
      }

      // Get existing blocks to avoid re-processing
      const existingBlocks = await this.getExistingBlocks(dbChannelId);
      console.log(`Found ${existingBlocks.size} existing blocks in database:`, Array.from(existingBlocks));
      console.log(`Arena channel has ${processableBlocks.length} processable blocks:`, processableBlocks.map(b => b.id));
      let newBlocks = processableBlocks.filter(block => !existingBlocks.has(block.id));
      console.log(`Filtered to ${newBlocks.length} new blocks:`, newBlocks.map(b => b.id));

      // Check usage limits now that we know how many blocks will be processed
      const usageInfo = await UsageTracker.checkUsageLimit(
        dbChannelId,
        sessionId,
        ipAddress,
        userId,
        newBlocks.length
      );

      if (!usageInfo.canProcess) {
        return {
          success: false,
          channelId: dbChannelId,
          totalBlocks: processableBlocks.length,
          processedBlocks: 0,
          skippedBlocks: processableBlocks.length,
          deletedBlocks,
          errors: [usageInfo.message || 'Usage limit exceeded'],
          duration: Date.now() - startTime,
          usageInfo
        };
      }

      // If usage info suggests limiting blocks, apply that limit
      if (usageInfo.blocksToProcess && usageInfo.blocksToProcess < newBlocks.length) {
        newBlocks = newBlocks.slice(0, usageInfo.blocksToProcess);
        if (usageInfo.message) {
          errors.push(usageInfo.message);
        }
      }


      if (newBlocks.length === 0) {
        return {
          success: true,
          channelId: dbChannelId,
          totalBlocks: processableBlocks.length,
          processedBlocks: 0,
          skippedBlocks: processableBlocks.length,
          deletedBlocks,
          errors: ['All blocks already processed'],
          duration: Date.now() - startTime,
        };
      }

      // Create non-zero block type message for new blocks
      const newWebsites = newBlocks.filter(b => b.class === 'Link' && !this.isVideoUrl(b.source_url || '')).length;
      const newVideos = newBlocks.filter(b => (b.class === 'Link' || b.class === 'Media') && this.isVideoUrl(b.source_url || '')).length;
      const newImages = newBlocks.filter(b => b.class === 'Image').length;
      const newAttachments = newBlocks.filter(b => b.class === 'Attachment').length;
      const newTextBlocks = newBlocks.filter(b => b.class === 'Text').length;
      
      const newBlockTypes = [];
      if (newWebsites > 0) newBlockTypes.push(`${newWebsites} websites`);
      if (newVideos > 0) newBlockTypes.push(`${newVideos} videos`);
      if (newImages > 0) newBlockTypes.push(`${newImages} images`);
      if (newAttachments > 0) newBlockTypes.push(`${newAttachments} attachments`);
      if (newTextBlocks > 0) newBlockTypes.push(`${newTextBlocks} text blocks`);
      
      const newBlockTypeMessage = newBlockTypes.length > 0 ? ` (${newBlockTypes.join(', ')})` : '';

      this.reportProgress({
        stage: 'extracting',
        message: `Processing ${newBlocks.length} new blocks${newBlockTypeMessage}...`,
        progress: 35,
        totalBlocks: newBlocks.length,
      });

      // Stage 2: Extract content from new blocks
      const processedBlocksList: ProcessedAnyBlock[] = [];
      const detailedErrors: Array<{blockId: number, stage: string, error: string, url?: string}> = [];

      for (let i = 0; i < newBlocks.length; i++) {
        const block = newBlocks[i];
        
        try {
          console.log(`Processing block ${block.id} (${block.class}): ${block.source_url}`);
          const processedBlock = await contentExtractor.processBlock(block);
          
          if (processedBlock) {
            processedBlocksList.push(processedBlock);
            processedBlocks++;
            console.log(`✅ Successfully processed block ${block.id}`);
          } else {
            skippedBlocks++;
            const errorMsg = `Failed to extract content from block ${block.id}: ${block.source_url}`;
            errors.push(errorMsg);
            detailedErrors.push({
              blockId: block.id,
              stage: 'extraction',
              error: 'Content extraction returned null',
              url: block.source_url || undefined
            });
            console.error(`❌ ${errorMsg}`);
          }

          // Report progress with detailed info
          const progress = 35 + (i + 1) / newBlocks.length * 35; // 35-70% for extraction
          this.reportProgress({
            stage: 'extracting',
            message: `Processed ${i + 1}/${newBlocks.length} blocks (${processedBlocks} successful, ${skippedBlocks} failed)`,
            progress,
            totalBlocks: newBlocks.length,
            processedBlocks: processedBlocks,
          });

        } catch (error) {
          skippedBlocks++;
          const errorMsg = `Error processing block ${block.id}: ${error}`;
          errors.push(errorMsg);
          detailedErrors.push({
            blockId: block.id,
            stage: 'extraction',
            error: String(error),
            url: block.source_url || undefined
          });
          console.error(`❌ ${errorMsg}`);
        }
      }

      if (processedBlocksList.length === 0) {
        return {
          success: false,
          channelId: dbChannelId,
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

      let embeddedBlocks = 0;
      let embeddingErrors = 0;

      for (let i = 0; i < processedBlocksList.length; i++) {
        const processedBlock = processedBlocksList[i];
        const blockId = 'arenaId' in processedBlock ? processedBlock.arenaId : processedBlock.id;

        try {
          console.log(`Creating embedding for block ${blockId}...`);
          
          // Create embedding (using first chunk for simplicity in MVP)
          const embeddingChunks = await embeddingService.createBlockEmbedding(processedBlock);
          
          if (embeddingChunks.length > 0) {
            console.log(`Storing block ${blockId} in database...`);
            // Use the first chunk's embedding for the block
            await embeddingService.storeBlock(
              processedBlock,
              dbChannelId,
              embeddingChunks[0].embedding
            );
            embeddedBlocks++;
            console.log(`✅ Successfully embedded and stored block ${blockId}`);
          } else {
            embeddingErrors++;
            const errorMsg = `No embedding chunks created for block ${blockId}`;
            errors.push(errorMsg);
            detailedErrors.push({
              blockId: Number(blockId),
              stage: 'embedding',
              error: 'No embedding chunks created'
            });
            console.error(`❌ ${errorMsg}`);
          }

          // Report progress with detailed status
          const progress = 70 + (i + 1) / processedBlocksList.length * 25; // 70-95% for embedding
          this.reportProgress({
            stage: 'embedding',
            message: `Embedded ${i + 1}/${processedBlocksList.length} blocks (${embeddedBlocks} stored, ${embeddingErrors} failed)`,
            progress,
            totalBlocks: processedBlocksList.length,
            processedBlocks: embeddedBlocks,
          });

        } catch (error) {
          embeddingErrors++;
          const errorMsg = `Error creating embedding for block ${blockId}: ${error}`;
          errors.push(errorMsg);
          detailedErrors.push({
            blockId: Number(blockId),
            stage: 'embedding',
            error: String(error)
          });
          console.error(`❌ ${errorMsg}`);
        }
      }

      // Update channel sync timestamp
      await this.upsertChannel(channel);

      // Verify blocks were actually stored in database
      const { count: actualStoredCount, error: countError } = await supabase
        .from('blocks')
        .select('*', { count: 'exact', head: true })
        .eq('channel_id', dbChannelId);

      if (countError) {
        console.error('Error verifying stored blocks:', countError);
      }

      const actuallyStoredBlocks = actualStoredCount || 0;
      console.log(`Verification: ${actuallyStoredBlocks} blocks actually stored in database (expected: ${embeddedBlocks})`);

      // Check for discrepancy between expected and actual
      if (embeddedBlocks > 0 && actuallyStoredBlocks !== embeddedBlocks) {
        const discrepancyError = `Storage verification failed: Expected ${embeddedBlocks} blocks, but database contains ${actuallyStoredBlocks}`;
        errors.push(discrepancyError);
        console.error(discrepancyError);
      }
      
      // Report detailed completion status
      if (actuallyStoredBlocks === 0 && processedBlocksList.length > 0) {
        // All blocks failed during embedding/storage phase
        this.reportProgress({
          stage: 'error',
          message: `Sync failed! All ${processedBlocksList.length} blocks failed during embedding/storage`,
          progress: 0,
          totalBlocks: newBlocks.length,
          processedBlocks: 0,
          errors: errors.length > 0 ? errors.slice(0, 5) : ['Unknown embedding/storage failure'], // Limit error list
        });

        return {
          success: false,
          channelId: dbChannelId,
          channelTitle: channel.title,
          totalBlocks: newBlocks.length,
          processedBlocks: 0,
          skippedBlocks: newBlocks.length,
          deletedBlocks,
          errors: errors.length > 0 ? errors : ['All blocks failed during embedding/storage'],
          duration: Date.now() - startTime,
          usageInfo
        };
      }

      this.reportProgress({
        stage: 'complete',
        message: `Sync complete! Successfully stored ${actuallyStoredBlocks}/${newBlocks.length} blocks`,
        progress: 100,
        totalBlocks: newBlocks.length,
        processedBlocks: actuallyStoredBlocks,
        errors: errors.length > 0 ? errors.slice(0, 5) : undefined, // Limit error list for UI
      });

      // Record usage after successful processing (use actually stored blocks)
      if (actuallyStoredBlocks > 0) {
        await UsageTracker.recordUsage(
          dbChannelId,
          actuallyStoredBlocks,
          sessionId,
          ipAddress,
          userId
        );
      }

      return {
        success: actuallyStoredBlocks > 0,
        channelId: dbChannelId,
        channelTitle: channel.title,
        totalBlocks: newBlocks.length,
        processedBlocks: actuallyStoredBlocks,
        skippedBlocks: newBlocks.length - actuallyStoredBlocks,
        deletedBlocks,
        errors,
        duration: Date.now() - startTime,
        usageInfo
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