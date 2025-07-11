// Sync service to orchestrate the entire content processing pipeline
import { supabase } from './supabase';
import { arenaClient, ArenaChannel } from './arena';
import { contentExtractor, ProcessedAnyBlock } from './extraction';
import { embeddingService } from './embeddings';
import { UsageTracker, UsageCheckResult } from './usage-tracking';
import { ChannelAccessService } from './channel-access';

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
      // Stage 1: Check channel access based on user tier
      this.reportProgress({
        stage: 'fetching',
        message: `Checking access to channel "${channelSlug}"...`,
        progress: 5,
      });

      const accessResult = await ChannelAccessService.checkChannelAccess(channelSlug, userId);
      
      if (!accessResult.canAccess) {
        throw new Error(accessResult.message || 'Channel not accessible');
      }

      // Stage 2: Fetch channel and contents
      this.reportProgress({
        stage: 'fetching',
        message: `Fetching channel "${channelSlug}"...`,
        progress: 10,
      });

      // Use appropriate client based on user tier
      const client = ChannelAccessService.getArenaClient(accessResult.userTier);
      const channel = await client.getChannel(channelSlug);
      const dbChannelId = await this.upsertChannel(channel);

      const allBlocks = await client.getAllChannelContents(channelSlug);
      
      // Get detailed info for link, image, media, attachment, and text blocks
      const { linkBlocks, imageBlocks, mediaBlocks, attachmentBlocks, textBlocks, allBlocks: processableBlocks } = await client.getDetailedProcessableBlocks(allBlocks);

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

      // Stage 2: Extract content from new blocks (PARALLEL PROCESSING)
      const processedBlocksList: ProcessedAnyBlock[] = [];
      const detailedErrors: Array<{blockId: number, stage: string, error: string, url?: string}> = [];

      // Tier-aware parallel processing configuration
      const userTier = usageInfo.tier || 'free';
      let BATCH_SIZE = 5; // Default for free tier
      let BLOCK_TIMEOUT = 45000; // 45 seconds per block
      let BATCH_DELAY = 1000; // 1 second between batches

      // Optimize performance based on user tier
      if (userTier === 'starter') {
        BATCH_SIZE = 7; // Slightly larger batches
        BATCH_DELAY = 800; // Faster processing
      } else if (userTier === 'pro') {
        BATCH_SIZE = 10; // Larger batches for Pro users
        BATCH_DELAY = 600; // Even faster processing
        BLOCK_TIMEOUT = 60000; // More timeout for complex content
      }

      console.log(`Starting parallel processing: ${newBlocks.length} blocks in batches of ${BATCH_SIZE}`);

      // Process blocks in parallel batches
      for (let batchStart = 0; batchStart < newBlocks.length; batchStart += BATCH_SIZE) {
        const batch = newBlocks.slice(batchStart, batchStart + BATCH_SIZE);
        console.log(`Processing batch ${Math.floor(batchStart / BATCH_SIZE) + 1}: blocks ${batchStart + 1}-${Math.min(batchStart + BATCH_SIZE, newBlocks.length)}`);

        // Create promises for parallel processing with individual timeouts and rate limit handling
        const batchPromises = batch.map(async (block, blockIndex) => {
          // Reduced jitter for better responsiveness (0-1000ms + 500ms spacing)
          const jitter = Math.random() * 1000 + (blockIndex * 500);
          await new Promise(resolve => setTimeout(resolve, jitter));

          try {
            console.log(`Processing block ${block.id} (${block.class}): ${block.source_url}`);

            // Add retry logic for rate limit errors
            let retryCount = 0;
            const maxRetries = 3;
            let processedBlock = null;

            while (retryCount <= maxRetries && !processedBlock) {
              try {
                // Race between actual processing and timeout
                processedBlock = await Promise.race([
                  contentExtractor.processBlock(block),
                  new Promise<never>((_, reject) => 
                    setTimeout(() => reject(new Error('Block processing timeout')), BLOCK_TIMEOUT)
                  )
                ]);
                break; // Success, exit retry loop
              } catch (error) {
                const errorStr = String(error);
                
                // Check if it's a rate limit error (429)
                if (errorStr.includes('429') || errorStr.includes('Too Many Requests') || errorStr.includes('rate limit')) {
                  retryCount++;
                  if (retryCount <= maxRetries) {
                    const backoffDelay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000; // Exponential backoff
                    console.log(`⏳ Rate limit hit for block ${block.id}, retrying in ${Math.round(backoffDelay)}ms (attempt ${retryCount}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, backoffDelay));
                  } else {
                    console.log(`❌ Rate limit retries exhausted for block ${block.id}`);
                    throw new Error(`Rate limit exceeded after ${maxRetries} retries: ${errorStr}`);
                  }
                } else {
                  // Non-rate-limit error, don't retry
                  throw error;
                }
              }
            }

            if (processedBlock) {
              console.log(`✅ Successfully processed block ${block.id}`);
              return { success: true as const, block, processedBlock };
            } else {
              const errorMsg = `Failed to extract content from block ${block.id}: ${block.source_url}`;
              console.error(`❌ ${errorMsg}`);
              return { 
                success: false as const, 
                block, 
                error: 'Content extraction returned null',
                stage: 'extraction' as const
              };
            }
          } catch (error) {
            const errorMsg = `Error processing block ${block.id}: ${error}`;
            console.error(`❌ ${errorMsg}`);
            return { 
              success: false as const, 
              block, 
              error: String(error),
              stage: 'extraction' as const
            };
          }
        });

        // Wait for all blocks in this batch to complete
        const batchResults = await Promise.allSettled(batchPromises);

        // Process results
        batchResults.forEach((result, batchIndex) => {
          const globalIndex = batchStart + batchIndex;
          
          if (result.status === 'fulfilled') {
            const blockResult = result.value;
            
            if (blockResult.success && 'processedBlock' in blockResult) {
              processedBlocksList.push(blockResult.processedBlock);
              processedBlocks++;
            } else {
              skippedBlocks++;
              const errorMsg = `Failed to extract content from block ${blockResult.block.id}: ${blockResult.block.source_url}`;
              errors.push(errorMsg);
              detailedErrors.push({
                blockId: blockResult.block.id,
                stage: blockResult.stage,
                error: blockResult.error,
                url: blockResult.block.source_url || undefined
              });
            }
          } else {
            // Promise itself was rejected (shouldn't happen with our error handling, but just in case)
            const block = batch[batchIndex];
            skippedBlocks++;
            const errorMsg = `Batch processing failed for block ${block.id}: ${result.reason}`;
            errors.push(errorMsg);
            detailedErrors.push({
              blockId: block.id,
              stage: 'extraction',
              error: String(result.reason),
              url: block.source_url || undefined
            });
            console.error(`❌ ${errorMsg}`);
          }

          // Report progress after each batch
          const progress = 35 + (globalIndex + 1) / newBlocks.length * 35; // 35-70% for extraction
          this.reportProgress({
            stage: 'extracting',
            message: `Processed ${globalIndex + 1}/${newBlocks.length} blocks (${processedBlocks} successful, ${skippedBlocks} failed)`,
            progress,
            totalBlocks: newBlocks.length,
            processedBlocks: processedBlocks,
          });
        });

        // Brief pause between batches (reduced for better responsiveness)
        if (batchStart + BATCH_SIZE < newBlocks.length) {
          const batchNumber = Math.floor(batchStart / BATCH_SIZE) + 1;
          console.log(`Batch ${batchNumber} complete. Waiting ${BATCH_DELAY}ms before next batch...`);
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
        }
      }

      console.log(`Parallel processing complete: ${processedBlocks} successful, ${skippedBlocks} failed out of ${newBlocks.length} total`);

      if (processedBlocksList.length === 0) {
        // Check if most errors are rate limit related
        const rateLimitErrors = errors.filter(error => 
          error.includes('429') || 
          error.includes('rate limit') || 
          error.includes('Too Many Requests')
        );

        let errorMessage = 'No blocks could be processed successfully';
        if (rateLimitErrors.length > errors.length * 0.5) {
          errorMessage = `Rate limit exceeded. Please wait 5-10 minutes before retrying. Are.na allows limited requests per hour for large channels.`;
        }

        return {
          success: false,
          channelId: dbChannelId,
          totalBlocks: newBlocks.length,
          processedBlocks: 0,
          skippedBlocks: newBlocks.length,
          deletedBlocks,
          errors: [errorMessage],
          duration: Date.now() - startTime,
        };
      }

      // Stage 3: Create embeddings and store (PARALLEL PROCESSING)
      this.reportProgress({
        stage: 'embedding',
        message: `Creating embeddings for ${processedBlocksList.length} blocks...`,
        progress: 70,
        totalBlocks: processedBlocksList.length,
      });

      let embeddedBlocks = 0;
      let embeddingErrors = 0;

      // Tier-aware embedding configuration
      let EMBEDDING_BATCH_SIZE = 5; // Default for free tier
      let EMBEDDING_TIMEOUT = 15000; // 15 seconds per embedding
      let EMBEDDING_DELAY = 300; // 300ms between batches

      // Optimize embedding performance based on user tier
      if (userTier === 'starter') {
        EMBEDDING_BATCH_SIZE = 7;
        EMBEDDING_DELAY = 250;
      } else if (userTier === 'pro') {
        EMBEDDING_BATCH_SIZE = 10;
        EMBEDDING_DELAY = 200;
        EMBEDDING_TIMEOUT = 20000; // More timeout for Pro
      }

      console.log(`Starting parallel embedding: ${processedBlocksList.length} blocks in batches of ${EMBEDDING_BATCH_SIZE}`);

      // Process embeddings in parallel batches
      for (let batchStart = 0; batchStart < processedBlocksList.length; batchStart += EMBEDDING_BATCH_SIZE) {
        const batch = processedBlocksList.slice(batchStart, batchStart + EMBEDDING_BATCH_SIZE);
        console.log(`Embedding batch ${Math.floor(batchStart / EMBEDDING_BATCH_SIZE) + 1}: blocks ${batchStart + 1}-${Math.min(batchStart + EMBEDDING_BATCH_SIZE, processedBlocksList.length)}`);

        // Create promises for parallel embedding with individual timeouts
        const batchPromises = batch.map(async (processedBlock) => {
          const blockId = 'arenaId' in processedBlock ? processedBlock.arenaId : processedBlock.id;
          
          // Small jitter for database writes (0-100ms)
          const jitter = Math.random() * 100;
          await new Promise(resolve => setTimeout(resolve, jitter));

          try {
            console.log(`Creating embedding for block ${blockId}...`);

            // Race between embedding creation and timeout
            const embeddingChunks = await Promise.race([
              embeddingService.createBlockEmbedding(processedBlock),
              new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('Embedding creation timeout')), EMBEDDING_TIMEOUT)
              )
            ]);

            if (embeddingChunks.length > 0) {
              console.log(`Storing block ${blockId} in database...`);
              
              // Store in database with timeout
              await Promise.race([
                embeddingService.storeBlock(
                  processedBlock,
                  dbChannelId,
                  embeddingChunks[0].embedding
                ),
                new Promise<never>((_, reject) => 
                  setTimeout(() => reject(new Error('Database storage timeout')), 10000)
                )
              ]);

              console.log(`✅ Successfully embedded and stored block ${blockId}`);
              return { success: true as const, blockId };
            } else {
              const errorMsg = `No embedding chunks created for block ${blockId}`;
              console.error(`❌ ${errorMsg}`);
              return { 
                success: false as const, 
                blockId, 
                error: 'No embedding chunks created',
                stage: 'embedding' as const
              };
            }
          } catch (error) {
            const errorMsg = `Error creating embedding for block ${blockId}: ${error}`;
            console.error(`❌ ${errorMsg}`);
            return { 
              success: false as const, 
              blockId, 
              error: String(error),
              stage: 'embedding' as const
            };
          }
        });

        // Wait for all embeddings in this batch to complete
        const batchResults = await Promise.allSettled(batchPromises);

        // Process results
        batchResults.forEach((result, batchIndex) => {
          const globalIndex = batchStart + batchIndex;
          
          if (result.status === 'fulfilled') {
            const embeddingResult = result.value;
            
            if (embeddingResult.success) {
              embeddedBlocks++;
            } else {
              embeddingErrors++;
              const errorMsg = `Embedding failed for block ${embeddingResult.blockId}: ${embeddingResult.error}`;
              errors.push(errorMsg);
              detailedErrors.push({
                blockId: Number(embeddingResult.blockId),
                stage: embeddingResult.stage || 'embedding',
                error: embeddingResult.error
              });
            }
          } else {
            // Promise itself was rejected
            const processedBlock = batch[batchIndex];
            const blockId = 'arenaId' in processedBlock ? processedBlock.arenaId : processedBlock.id;
            embeddingErrors++;
            const errorMsg = `Embedding batch failed for block ${blockId}: ${result.reason}`;
            errors.push(errorMsg);
            detailedErrors.push({
              blockId: Number(blockId),
              stage: 'embedding',
              error: String(result.reason)
            });
            console.error(`❌ ${errorMsg}`);
          }

          // Report progress after each batch
          const progress = 70 + (globalIndex + 1) / processedBlocksList.length * 25; // 70-95% for embedding
          this.reportProgress({
            stage: 'embedding',
            message: `Embedded ${globalIndex + 1}/${processedBlocksList.length} blocks (${embeddedBlocks} stored, ${embeddingErrors} failed)`,
            progress,
            totalBlocks: processedBlocksList.length,
            processedBlocks: embeddedBlocks,
          });
        });

        // Brief pause between embedding batches
        if (batchStart + EMBEDDING_BATCH_SIZE < processedBlocksList.length) {
          console.log(`Embedding batch complete. Waiting ${EMBEDDING_DELAY}ms before next batch...`);
          await new Promise(resolve => setTimeout(resolve, EMBEDDING_DELAY));
        }
      }

      console.log(`Parallel embedding complete: ${embeddedBlocks} successful, ${embeddingErrors} failed out of ${processedBlocksList.length} total`);

      // Update channel sync timestamp
      await this.upsertChannel(channel);

      // Verify blocks were actually stored in database
      console.log('Verifying blocks were stored in database...');
      const { count: actualStoredCount, error: countError } = await supabase
        .from('blocks')
        .select('*', { count: 'exact', head: true })
        .eq('channel_id', dbChannelId);

      if (countError) {
        console.error('Error verifying stored blocks:', countError);
        errors.push(`Database verification error: ${countError.message || countError}`);
      }

      const actuallyStoredBlocks = actualStoredCount || 0;
      console.log(`✅ Verification complete: ${actuallyStoredBlocks} blocks actually stored in database (expected: ${embeddedBlocks})`);

      // Check for discrepancy between expected and actual
      if (embeddedBlocks > 0 && actuallyStoredBlocks !== embeddedBlocks) {
        const discrepancyError = `Storage verification failed: Expected ${embeddedBlocks} blocks, but database contains ${actuallyStoredBlocks}`;
        errors.push(discrepancyError);
        console.error(`❌ ${discrepancyError}`);
      }

      console.log(`Preparing completion signal: actuallyStoredBlocks=${actuallyStoredBlocks}, processedBlocksList.length=${processedBlocksList.length}`);
      
      // Report detailed completion status
      if (actuallyStoredBlocks === 0 && processedBlocksList.length > 0) {
        // All blocks failed during embedding/storage phase
        console.log('❌ All blocks failed during embedding/storage - sending error signal');
        this.reportProgress({
          stage: 'error',
          message: `Sync failed! All ${processedBlocksList.length} blocks failed during embedding/storage`,
          progress: 0,
          totalBlocks: newBlocks.length,
          processedBlocks: 0,
          errors: errors.length > 0 ? errors.slice(0, 5) : ['Unknown embedding/storage failure'], // Limit error list
        });

        console.log('❌ Returning failure result');
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

      console.log('✅ Sending completion signal to frontend');
      this.reportProgress({
        stage: 'complete',
        message: `Sync complete! Successfully stored ${actuallyStoredBlocks}/${newBlocks.length} blocks`,
        progress: 100,
        totalBlocks: newBlocks.length,
        processedBlocks: actuallyStoredBlocks,
        errors: errors.length > 0 ? errors.slice(0, 5) : undefined, // Limit error list for UI
      });

      console.log('✅ Completion signal sent successfully');

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