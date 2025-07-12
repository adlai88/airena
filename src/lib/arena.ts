// Are.na API client for fetching channels and blocks
import axios from 'axios';

const BASE_URL = 'https://api.are.na/v2';

export interface ArenaBlock {
  id: number;
  title: string | null;
  description: string | null;
  content: string | null;
  source_url: string | null;
  source?: {
    url: string;
    provider?: {
      name: string;
      url: string;
    };
  };
  image?: {
    thumb?: {
      url: string;
    };
    square?: {
      url: string;
    };
    display?: {
      url: string;
    };
    original?: {
      url: string;
    };
  };
  class: 'Link' | 'Text' | 'Image' | 'Media' | 'Attachment';
  created_at: string;
  updated_at: string;
  user: {
    id: number;
    username: string;
    full_name: string;
  };
}

export interface ArenaChannel {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  length: number;
  created_at: string;
  updated_at: string;
  thumbnail_url?: string;
  user: {
    id: number;
    username: string;
    full_name: string;
  };
  contents?: ArenaBlock[];
}

export interface ArenaChannelWithContents extends ArenaChannel {
  contents: ArenaBlock[];
}

export class ArenaClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ARENA_API_KEY || '';
  }

  private async request<T>(endpoint: string): Promise<T> {
    try {
      const response = await axios.get(`${BASE_URL}${endpoint}`, {
        headers: this.apiKey ? {
          'Authorization': `Bearer ${this.apiKey}`,
        } : {},
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Are.na API error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get channel by slug (without contents)
   */
  async getChannel(slug: string): Promise<ArenaChannel> {
    return this.request<ArenaChannel>(`/channels/${slug}`);
  }

  /**
   * Get channel with all contents
   */
  async getChannelWithContents(slug: string): Promise<ArenaChannelWithContents> {
    return this.request<ArenaChannelWithContents>(`/channels/${slug}?per=100`);
  }

  /**
   * Get channel contents with pagination
   */
  async getChannelContents(
    channelId: number, 
    page: number = 1, 
    per: number = 50
  ): Promise<ArenaBlock[]> {
    const response = await this.request<{ contents: ArenaBlock[] }>(
      `/channels/${channelId}/contents?page=${page}&per=${per}`
    );
    return response.contents;
  }

  /**
   * Get all contents from a channel (handles pagination)
   */
  async getAllChannelContents(slug: string): Promise<ArenaBlock[]> {
    const channel = await this.getChannel(slug);
    const totalBlocks = channel.length;
    const perPage = 100;
    const totalPages = Math.ceil(totalBlocks / perPage);
    
    const allContents: ArenaBlock[] = [];
    
    for (let page = 1; page <= totalPages; page++) {
      const contents = await this.getChannelContents(channel.id, page, perPage);
      allContents.push(...contents);
      
      // Rate limiting: wait 100ms between requests
      if (page < totalPages) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return allContents;
  }

  /**
   * Get detailed block information including source URL
   */
  async getBlock(blockId: number): Promise<ArenaBlock> {
    return this.request<ArenaBlock>(`/blocks/${blockId}`);
  }

  /**
   * Filter blocks by type and get detailed info for Link blocks (optimized with batch processing)
   */
  async getDetailedLinkBlocks(blocks: ArenaBlock[]): Promise<ArenaBlock[]> {
    const linkBlocks = blocks.filter(block => block.class === 'Link');
    const detailedBlocks: ArenaBlock[] = [];
    const BATCH_SIZE = 5;
    const BATCH_DELAY = 800; // 800ms between batches
    const INTRA_BATCH_DELAY = 150; // 150ms stagger within batch

    console.log(`Fetching detailed info for ${linkBlocks.length} link blocks in batches of ${BATCH_SIZE}...`);

    for (let i = 0; i < linkBlocks.length; i += BATCH_SIZE) {
      const batch = linkBlocks.slice(i, i + BATCH_SIZE);
      console.log(`Processing link batch ${Math.floor(i / BATCH_SIZE) + 1}: blocks ${i + 1}-${Math.min(i + BATCH_SIZE, linkBlocks.length)}`);
      
      // Process batch in parallel with staggered delays
      const batchPromises = batch.map(async (block, batchIndex) => {
        // Stagger requests within batch to avoid exact simultaneity
        await new Promise(resolve => setTimeout(resolve, batchIndex * INTRA_BATCH_DELAY));
        
        try {
          const detailedBlock = await this.getBlock(block.id);
          
          // Check if block has a source URL (either in source_url or source.url)
          const hasUrl = detailedBlock.source_url || detailedBlock.source?.url;
          
          if (hasUrl) {
            // Normalize the source_url field
            if (!detailedBlock.source_url && detailedBlock.source?.url) {
              detailedBlock.source_url = detailedBlock.source.url;
            }
            return detailedBlock;
          }
          return null;
        } catch (error) {
          console.warn(`Failed to get details for block ${block.id}:`, error);
          return null;
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Collect successful results
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          detailedBlocks.push(result.value);
        }
      });
      
      // Delay between batches
      if (i + BATCH_SIZE < linkBlocks.length) {
        console.log(`Link batch complete. Waiting ${BATCH_DELAY}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }

    console.log(`✅ Found ${detailedBlocks.length}/${linkBlocks.length} link blocks with URLs`);
    return detailedBlocks;
  }

  /**
   * Filter blocks by type and get detailed info for Image blocks (optimized with batch processing)
   */
  async getDetailedImageBlocks(blocks: ArenaBlock[]): Promise<ArenaBlock[]> {
    const imageBlocks = blocks.filter(block => block.class === 'Image');
    const detailedBlocks: ArenaBlock[] = [];
    const BATCH_SIZE = 5;
    const BATCH_DELAY = 800; // 800ms between batches
    const INTRA_BATCH_DELAY = 150; // 150ms stagger within batch

    console.log(`Fetching detailed info for ${imageBlocks.length} image blocks in batches of ${BATCH_SIZE}...`);

    for (let i = 0; i < imageBlocks.length; i += BATCH_SIZE) {
      const batch = imageBlocks.slice(i, i + BATCH_SIZE);
      console.log(`Processing image batch ${Math.floor(i / BATCH_SIZE) + 1}: blocks ${i + 1}-${Math.min(i + BATCH_SIZE, imageBlocks.length)}`);
      
      // Process batch in parallel with staggered delays
      const batchPromises = batch.map(async (block, batchIndex) => {
        // Stagger requests within batch to avoid exact simultaneity
        await new Promise(resolve => setTimeout(resolve, batchIndex * INTRA_BATCH_DELAY));
        
        try {
          const detailedBlock = await this.getBlock(block.id);
          
          // For Image blocks, check both external links (source_url) and uploaded images (image.original.url)
          const externalImageUrl = detailedBlock.source_url || detailedBlock.source?.url;
          const uploadedImageUrl = detailedBlock.image?.original?.url;
          const hasImageUrl = externalImageUrl || uploadedImageUrl;
          
          if (hasImageUrl) {
            // Normalize the source_url field - prefer external URL, fallback to uploaded URL
            if (!detailedBlock.source_url) {
              if (detailedBlock.source?.url) {
                detailedBlock.source_url = detailedBlock.source.url;
              } else if (uploadedImageUrl) {
                detailedBlock.source_url = uploadedImageUrl;
              }
            }
            return detailedBlock;
          }
          return null;
        } catch (error) {
          console.warn(`Failed to get details for image block ${block.id}:`, error);
          return null;
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Collect successful results
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          detailedBlocks.push(result.value);
        }
      });
      
      // Delay between batches
      if (i + BATCH_SIZE < imageBlocks.length) {
        console.log(`Image batch complete. Waiting ${BATCH_DELAY}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }

    console.log(`✅ Found ${detailedBlocks.length}/${imageBlocks.length} image blocks with URLs`);
    return detailedBlocks;
  }

  /**
   * Filter blocks by type and get detailed info for Media blocks (videos) (optimized with batch processing)
   */
  async getDetailedMediaBlocks(blocks: ArenaBlock[]): Promise<ArenaBlock[]> {
    const mediaBlocks = blocks.filter(block => block.class === 'Media');
    const detailedBlocks: ArenaBlock[] = [];
    const BATCH_SIZE = 5;
    const BATCH_DELAY = 800; // 800ms between batches
    const INTRA_BATCH_DELAY = 150; // 150ms stagger within batch

    console.log(`Fetching detailed info for ${mediaBlocks.length} media blocks in batches of ${BATCH_SIZE}...`);

    for (let i = 0; i < mediaBlocks.length; i += BATCH_SIZE) {
      const batch = mediaBlocks.slice(i, i + BATCH_SIZE);
      console.log(`Processing media batch ${Math.floor(i / BATCH_SIZE) + 1}: blocks ${i + 1}-${Math.min(i + BATCH_SIZE, mediaBlocks.length)}`);
      
      // Process batch in parallel with staggered delays
      const batchPromises = batch.map(async (block, batchIndex) => {
        // Stagger requests within batch to avoid exact simultaneity
        await new Promise(resolve => setTimeout(resolve, batchIndex * INTRA_BATCH_DELAY));
        
        try {
          const detailedBlock = await this.getBlock(block.id);
          
          // For Media blocks, the URL is typically in source.url, not source_url
          const hasMediaUrl = detailedBlock.source_url || detailedBlock.source?.url;
          
          if (hasMediaUrl) {
            // Normalize the source_url field for consistency
            if (!detailedBlock.source_url && detailedBlock.source?.url) {
              detailedBlock.source_url = detailedBlock.source.url;
            }
            return detailedBlock;
          }
          return null;
        } catch (error) {
          console.warn(`Failed to get details for media block ${block.id}:`, error);
          return null;
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Collect successful results
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          detailedBlocks.push(result.value);
        }
      });
      
      // Delay between batches
      if (i + BATCH_SIZE < mediaBlocks.length) {
        console.log(`Media batch complete. Waiting ${BATCH_DELAY}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }

    console.log(`✅ Found ${detailedBlocks.length}/${mediaBlocks.length} media blocks with URLs`);
    return detailedBlocks;
  }

  /**
   * Filter blocks by type and get detailed info for Attachment blocks (PDFs, documents) (optimized with batch processing)
   */
  async getDetailedAttachmentBlocks(blocks: ArenaBlock[]): Promise<ArenaBlock[]> {
    const attachmentBlocks = blocks.filter(block => block.class === 'Attachment');
    const detailedBlocks: ArenaBlock[] = [];
    const BATCH_SIZE = 5;
    const BATCH_DELAY = 800; // 800ms between batches
    const INTRA_BATCH_DELAY = 150; // 150ms stagger within batch

    console.log(`Fetching detailed info for ${attachmentBlocks.length} attachment blocks in batches of ${BATCH_SIZE}...`);

    for (let i = 0; i < attachmentBlocks.length; i += BATCH_SIZE) {
      const batch = attachmentBlocks.slice(i, i + BATCH_SIZE);
      console.log(`Processing attachment batch ${Math.floor(i / BATCH_SIZE) + 1}: blocks ${i + 1}-${Math.min(i + BATCH_SIZE, attachmentBlocks.length)}`);
      
      // Process batch in parallel with staggered delays
      const batchPromises = batch.map(async (block, batchIndex) => {
        // Stagger requests within batch to avoid exact simultaneity
        await new Promise(resolve => setTimeout(resolve, batchIndex * INTRA_BATCH_DELAY));
        
        try {
          const detailedBlock = await this.getBlock(block.id);
          
          // For Attachment blocks, check both source_url and source.url
          const hasAttachmentUrl = detailedBlock.source_url || detailedBlock.source?.url;
          
          if (hasAttachmentUrl) {
            // Normalize the source_url field for consistency
            if (!detailedBlock.source_url && detailedBlock.source?.url) {
              detailedBlock.source_url = detailedBlock.source.url;
            }
            return detailedBlock;
          }
          return null;
        } catch (error) {
          console.warn(`Failed to get details for attachment block ${block.id}:`, error);
          return null;
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Collect successful results
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          detailedBlocks.push(result.value);
        }
      });
      
      // Delay between batches
      if (i + BATCH_SIZE < attachmentBlocks.length) {
        console.log(`Attachment batch complete. Waiting ${BATCH_DELAY}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }

    console.log(`✅ Found ${detailedBlocks.length}/${attachmentBlocks.length} attachment blocks with URLs`);
    return detailedBlocks;
  }

  /**
   * Get detailed text blocks
   */
  async getDetailedTextBlocks(blocks: ArenaBlock[]): Promise<ArenaBlock[]> {
    const textBlocks = blocks.filter(block => block.class === 'Text');
    console.log(`Processing ${textBlocks.length} text blocks`);
    
    const detailedBlocks: ArenaBlock[] = [];
    
    for (const block of textBlocks) {
      try {
        // Text blocks already have content, just need to ensure they have the data we need
        if (block.content) {
          detailedBlocks.push(block);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.warn(`Failed to process text block ${block.id}:`, error);
      }
    }

    console.log(`Found ${detailedBlocks.length} text blocks with content`);
    return detailedBlocks;
  }

  /**
   * Get detailed blocks for Link, Image, Media, Attachment, and Text types
   */
  async getDetailedProcessableBlocks(
    blocks: ArenaBlock[], 
    progressCallback?: (message: string, progress: number) => void
  ): Promise<{
    linkBlocks: ArenaBlock[];
    imageBlocks: ArenaBlock[];
    mediaBlocks: ArenaBlock[];
    attachmentBlocks: ArenaBlock[];
    textBlocks: ArenaBlock[];
    allBlocks: ArenaBlock[];
  }> {
    // Count blocks by type for progress reporting
    const linkCount = blocks.filter(b => b.class === 'Link').length;
    const imageCount = blocks.filter(b => b.class === 'Image').length;
    const mediaCount = blocks.filter(b => b.class === 'Media').length;
    const attachmentCount = blocks.filter(b => b.class === 'Attachment').length;
    const textCount = blocks.filter(b => b.class === 'Text').length;

    // Track completion for progress reporting
    let completed = 0;
    const total = 5; // 5 block types to process
    
    const updateProgress = (blockType: string, count: number) => {
      completed++;
      const progress = 10 + Math.round((completed / total) * 10); // Progress from 10% to 20%
      const message = count > 0 ? 
        `Analyzing ${blockType} (${count} found)...` : 
        `Checking for ${blockType}...`;
      progressCallback?.(message, progress);
    };

    // Process each block type and report progress
    const linkBlocksPromise = this.getDetailedLinkBlocks(blocks).then(result => {
      updateProgress('links', linkCount);
      return result;
    });

    const imageBlocksPromise = this.getDetailedImageBlocks(blocks).then(result => {
      updateProgress('images', imageCount);
      return result;
    });

    const mediaBlocksPromise = this.getDetailedMediaBlocks(blocks).then(result => {
      updateProgress('videos', mediaCount);
      return result;
    });

    const attachmentBlocksPromise = this.getDetailedAttachmentBlocks(blocks).then(result => {
      updateProgress('documents', attachmentCount);
      return result;
    });

    const textBlocksPromise = this.getDetailedTextBlocks(blocks).then(result => {
      updateProgress('text blocks', textCount);
      return result;
    });

    const [linkBlocks, imageBlocks, mediaBlocks, attachmentBlocks, textBlocks] = await Promise.all([
      linkBlocksPromise,
      imageBlocksPromise,
      mediaBlocksPromise,
      attachmentBlocksPromise,
      textBlocksPromise
    ]);

    return {
      linkBlocks,
      imageBlocks,
      mediaBlocks,
      attachmentBlocks,
      textBlocks,
      allBlocks: [...linkBlocks, ...imageBlocks, ...mediaBlocks, ...attachmentBlocks, ...textBlocks]
    };
  }

  /**
   * Filter blocks by type - for MVP we only want Link blocks (websites)
   */
  filterLinkBlocks(blocks: ArenaBlock[]): ArenaBlock[] {
    return blocks.filter(block => 
      block.class === 'Link' && 
      (block.source_url || block.source?.url) && 
      (block.source_url?.startsWith('http') || block.source?.url?.startsWith('http'))
    );
  }

  /**
   * Get channel info and stats
   */
  async getChannelInfo(slug: string): Promise<{
    channel: ArenaChannel;
    totalBlocks: number;
    linkBlocks: number;
  }> {
    const channel = await this.getChannel(slug);
    const contents = await this.getAllChannelContents(slug);
    const linkBlocks = this.filterLinkBlocks(contents);
    
    return {
      channel,
      totalBlocks: contents.length,
      linkBlocks: linkBlocks.length,
    };
  }
}

// Export singleton instance
export const arenaClient = new ArenaClient();