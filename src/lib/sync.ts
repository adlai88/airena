// Sync service to orchestrate the entire content processing pipeline
import { supabase } from './supabase';
import { arenaClient, ArenaChannel } from './arena';
import { contentExtractor, ProcessedAnyBlock } from './extraction';
import { embeddingService } from './embeddings';
import { SimpleUsageTracker } from './simple-usage';
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
  blocksUsed?: number;
  blocksRemaining?: number;
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
   * Generate thumbnail from first image block in channel
   */
  private async generateChannelThumbnail(channelSlug: string): Promise<string | null> {
    try {
      // Get channel contents to find first image
      const allBlocks = await arenaClient.getAllChannelContents(channelSlug);
      
      // Find first image block with a valid URL
      const imageBlock = allBlocks.find(block => {
        if (block.class === 'Image') {
          // Check for external image URL or uploaded image
          const hasExternalUrl = block.source_url && block.source_url.startsWith('http');
          const hasUploadedImage = block.image?.original?.url;
          return hasExternalUrl || hasUploadedImage;
        }
        return false;
      });

      if (imageBlock) {
        // Prefer external source URL, fallback to uploaded image
        const thumbnailUrl = imageBlock.source_url || imageBlock.image?.original?.url;
        if (thumbnailUrl) {
          console.log(`Found thumbnail for channel ${channelSlug}: ${thumbnailUrl}`);
          return thumbnailUrl;
        }
      }

      console.log(`No suitable thumbnail found for channel ${channelSlug}`);
      return null;
    } catch (error) {
      console.error(`Error generating thumbnail for channel ${channelSlug}:`, error);
      return null;
    }
  }

  /**
   * Store or update channel in database
   */
  private async upsertChannel(channel: ArenaChannel, userId?: string, thumbnailUrl?: string, isPrivate: boolean = false): Promise<number> {
    // First try to update existing record
    const { data: existingChannel } = await supabase
      .from('channels')
      .select('id')
      .eq('arena_id', channel.id)
      .single();

    if (existingChannel) {
      // Update existing channel with all fields including username and thumbnail
      console.log(`Updating existing channel ${channel.slug} with username: ${channel.user.username}`);
      const updateData: Record<string, unknown> = {
        title: channel.title,
        slug: channel.slug,
        username: channel.user.username,
        last_sync: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Only update thumbnail if provided
      if (thumbnailUrl !== undefined) {
        updateData.thumbnail_url = thumbnailUrl;
      }
      
      const { error } = await supabase
        .from('channels')
        .update(updateData)
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
      const insertData: Record<string, unknown> = {
        arena_id: channel.id,
        title: channel.title,
        slug: channel.slug,
        username: channel.user.username,
        user_id: userId,
        is_private: isPrivate,
        last_sync: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Include thumbnail if provided
      if (thumbnailUrl !== undefined) {
        insertData.thumbnail_url = thumbnailUrl;
      }
      
      const { data: insertedChannel, error } = await supabase
        .from('channels')
        .insert(insertData)
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
    userId: string, // Now required
    ipAddress: string,
    userIdParam?: string, // Keep for compatibility, but not used
    blockLimit?: number
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

      // TEMPORARILY DISABLED: Channel limit check bypassed for testing
      // TODO: Re-enable channel limits after pricing restructure
      /*
      // Stage 1.5: Check channel count limits for free tier users
      this.reportProgress({
        stage: 'fetching',
        message: `Checking channel limits...`,
        progress: 6,
      });

      const channelLimitResult = await UsageTracker.checkChannelLimit(channelSlug, sessionId, userId || undefined);
      
      if (!channelLimitResult.canAddChannel) {
        throw new Error(channelLimitResult.message || 'Channel limit exceeded');
      }
      */

      // Stage 2: Fetch channel and contents
      this.reportProgress({
        stage: 'fetching',
        message: `Fetching channel "${channelSlug}"...`,
        progress: 10,
      });

      // Use appropriate client based on user tier
      const client = ChannelAccessService.getArenaClient(accessResult.userTier);
      const channel = await client.getChannel(channelSlug);
      
      // Generate thumbnail for new or updated channels
      this.reportProgress({
        stage: 'fetching',
        message: `Generating channel thumbnail...`,
        progress: 8,
      });
      
      const thumbnailUrl = await this.generateChannelThumbnail(channelSlug);
      const dbChannelId = await this.upsertChannel(channel, userId, thumbnailUrl || undefined, accessResult.isPrivate);

      // For free users with limited blocks, optimize fetching
      let fetchLimit: number | undefined;
      if (accessResult.userTier === 'free') {
        const usageCheck = await SimpleUsageTracker.checkUsage(userId);
        // For initial estimate, assume some blocks might already be processed
        // Fetch slightly more than needed to account for existing blocks and non-processable blocks
        // This is an optimization to avoid fetching all 1545 blocks for a user with only 50 remaining
        fetchLimit = Math.min(channel.length, usageCheck.blocksRemaining * 2 + 100);
        
        this.reportProgress({
          stage: 'fetching',
          message: `Optimizing fetch for ${usageCheck.blocksRemaining} remaining blocks...`,
          progress: 10,
        });
      }

      const allBlocks = await client.getAllChannelContents(channelSlug, fetchLimit);
      
      // Show channel size and set expectations for large channels
      this.reportProgress({
        stage: 'fetching',
        message: allBlocks.length > 200 ? 
          `Analyzing ${allBlocks.length} blocks${fetchLimit ? ` (optimized from ${channel.length} total)` : ''} (this may take 2-3 minutes for large channels)...` :
          `Analyzing ${allBlocks.length} blocks${fetchLimit ? ` (optimized from ${channel.length} total)` : ''}...`,
        progress: 12,
      });
      
      // Get detailed info for link, image, media, attachment, and text blocks
      const { linkBlocks, imageBlocks, mediaBlocks, attachmentBlocks, textBlocks, allBlocks: processableBlocks } = await client.getDetailedProcessableBlocks(
        allBlocks,
        (message: string, progress: number) => {
          this.reportProgress({
            stage: 'fetching',
            message,
            progress,
          });
        }
      );

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
        // Get current usage stats
        const currentStats = await SimpleUsageTracker.getUserStats(userId);
        return {
          success: true,
          channelId: dbChannelId,
          totalBlocks: allBlocks.length,
          processedBlocks: 0,
          skippedBlocks: allBlocks.length,
          deletedBlocks,
          errors: ['No processable blocks found (no links or images with URLs)'],
          duration: Date.now() - startTime,
          blocksUsed: currentStats.blocksUsed,
          blocksRemaining: currentStats.blocksRemaining
        };
      }

      // Get existing blocks to avoid re-processing
      const existingBlocks = await this.getExistingBlocks(dbChannelId);
      console.log(`Found ${existingBlocks.size} existing blocks in database:`, Array.from(existingBlocks));
      console.log(`Arena channel has ${processableBlocks.length} processable blocks:`, processableBlocks.map(b => b.id));
      
      // Check for existing blocks missing thumbnails
      const { data: blocksWithoutThumbnails, error: thumbCheckError } = await supabase
        .from('blocks')
        .select('arena_id')
        .eq('channel_id', dbChannelId)
        .is('thumbnail_url', null) as { data: { arena_id: number }[] | null; error: unknown };
      
      if (thumbCheckError) {
        console.error('Error checking blocks without thumbnails:', thumbCheckError);
      }
      
      const blocksMissingThumbnails = new Set(blocksWithoutThumbnails?.map(b => b.arena_id) || []);
      console.log(`Found ${blocksMissingThumbnails.size} existing blocks missing thumbnails`);
      
      // Include new blocks AND existing blocks missing thumbnails
      let newBlocks = processableBlocks.filter(block => 
        !existingBlocks.has(block.id) || blocksMissingThumbnails.has(block.id)
      );
      console.log(`Processing ${newBlocks.length} blocks (${newBlocks.filter(b => !existingBlocks.has(b.id)).length} new, ${newBlocks.filter(b => blocksMissingThumbnails.has(b.id)).length} missing thumbnails):`, newBlocks.map(b => b.id));

      // Check usage limits with new simple system
      const usageCheck = await SimpleUsageTracker.checkUsage(userId);
      
      if (!usageCheck.canProcess) {
        return {
          success: false,
          channelId: dbChannelId,
          channelTitle: channel.title,
          totalBlocks: processableBlocks.length,
          processedBlocks: 0,
          skippedBlocks: processableBlocks.length,
          deletedBlocks,
          errors: [usageCheck.message || 'Usage limit exceeded'],
          duration: Date.now() - startTime,
          blocksUsed: usageCheck.blocksUsed,
          blocksRemaining: usageCheck.blocksRemaining
        };
      }
      
      // For free users, limit processing to remaining blocks
      if (usageCheck.blocksRemaining < newBlocks.length) {
        const limitMessage = `Processing limited to ${usageCheck.blocksRemaining} blocks (${usageCheck.blocksUsed}/50 lifetime limit)`;
        errors.push(limitMessage);
        newBlocks = newBlocks.slice(0, usageCheck.blocksRemaining);
      }

      // Apply user-selected block limit if provided (from large channel preset selection)
      if (blockLimit && blockLimit > 0 && blockLimit < newBlocks.length) {
        console.log(`Applying user-selected block limit: ${blockLimit} out of ${newBlocks.length} new blocks`);
        newBlocks = newBlocks.slice(0, blockLimit);
        errors.push(`Processing limited to ${blockLimit} blocks as selected`);
      }

      if (newBlocks.length === 0) {
        // Get current usage stats even if no processing needed
        const currentStats = await SimpleUsageTracker.getUserStats(userId);
        return {
          success: true,
          channelId: dbChannelId,
          totalBlocks: processableBlocks.length,
          processedBlocks: 0,
          skippedBlocks: processableBlocks.length,
          deletedBlocks,
          errors: ['All blocks already processed with thumbnails'],
          duration: Date.now() - startTime,
          blocksUsed: currentStats.blocksUsed,
          blocksRemaining: currentStats.blocksRemaining
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
      
      // Count blocks that need thumbnail updates
      const thumbnailUpdateCount = newBlocks.filter(b => blocksMissingThumbnails.has(b.id)).length;
      const messagePrefix = thumbnailUpdateCount > 0 
        ? `Processing ${newBlocks.length} blocks (${thumbnailUpdateCount} for thumbnail updates)`
        : `Processing ${newBlocks.length} new blocks`;

      this.reportProgress({
        stage: 'extracting',
        message: `${messagePrefix}${newBlockTypeMessage}...`,
        progress: 35,
        totalBlocks: newBlocks.length,
      });

      // Stage 2: Extract content from new blocks (PARALLEL PROCESSING)
      const processedBlocksList: ProcessedAnyBlock[] = [];
      const detailedErrors: Array<{blockId: number, stage: string, error: string, url?: string}> = [];

      // Tier-aware parallel processing configuration
      const userTier = accessResult.userTier || 'free';
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

        // Get current usage stats
        const currentStats = await SimpleUsageTracker.getUserStats(userId);
        return {
          success: false,
          channelId: dbChannelId,
          totalBlocks: newBlocks.length,
          processedBlocks: 0,
          skippedBlocks: newBlocks.length,
          deletedBlocks,
          errors: [errorMessage],
          duration: Date.now() - startTime,
          blocksUsed: currentStats.blocksUsed,
          blocksRemaining: currentStats.blocksRemaining
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

      // Update channel sync timestamp (preserve existing thumbnail)
      await this.upsertChannel(channel, userId, undefined, accessResult.isPrivate);

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
      // Note: We can't directly compare embeddedBlocks with actuallyStoredBlocks because
      // actuallyStoredBlocks includes all blocks for the channel (from previous syncs),
      // while embeddedBlocks only includes blocks from this sync session.
      // For now, we'll just log the counts for monitoring but not fail the sync.
      if (embeddedBlocks > 0) {
        console.log(`✅ Storage verification: Successfully processed ${embeddedBlocks} new blocks. Total channel blocks: ${actuallyStoredBlocks}`);
      }

      console.log(`Preparing completion signal: actuallyStoredBlocks=${actuallyStoredBlocks}, processedBlocksList.length=${processedBlocksList.length}, embeddedBlocks=${embeddedBlocks}`);
      
      // Record usage with new simple system - ONLY count NEW blocks from this sync
      let actualBlocksRecorded = 0;
      if (embeddedBlocks > 0) {
        try {
          actualBlocksRecorded = await SimpleUsageTracker.recordUsage(userId, embeddedBlocks);
          if (actualBlocksRecorded < embeddedBlocks) {
            console.log(`⚠️ Hit usage limit: only ${actualBlocksRecorded} of ${embeddedBlocks} blocks were recorded`);
          }
        } catch (error) {
          console.error('Failed to record usage:', error);
          // Don't fail the sync if usage recording fails
          // The blocks are already stored, so the sync was successful
        }
      }
      
      // Get updated usage stats
      const finalUsageStats = await SimpleUsageTracker.getUserStats(userId);

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
          blocksUsed: finalUsageStats.blocksUsed,
          blocksRemaining: finalUsageStats.blocksRemaining
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
        blocksUsed: finalUsageStats.blocksUsed,
        blocksRemaining: finalUsageStats.blocksRemaining
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

      // Try to get usage stats even on error
      let blocksUsed = 0;
      let blocksRemaining = 0;
      try {
        const stats = await SimpleUsageTracker.getUserStats(userId);
        blocksUsed = stats.blocksUsed;
        blocksRemaining = stats.blocksRemaining;
      } catch (statsError) {
        console.error('Failed to get usage stats:', statsError);
      }

      return {
        success: false,
        channelId: 0,
        totalBlocks: 0,
        processedBlocks,
        skippedBlocks,
        deletedBlocks: 0,
        errors,
        duration: Date.now() - startTime,
        blocksUsed,
        blocksRemaining
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