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
   * Filter blocks by type and get detailed info for Link blocks
   */
  async getDetailedLinkBlocks(blocks: ArenaBlock[]): Promise<ArenaBlock[]> {
    const linkBlocks = blocks.filter(block => block.class === 'Link');
    const detailedBlocks: ArenaBlock[] = [];

    console.log(`Fetching detailed info for ${linkBlocks.length} link blocks...`);

    for (const block of linkBlocks) {
      try {
        const detailedBlock = await this.getBlock(block.id);
        
        // Check if block has a source URL (either in source_url or source.url)
        const hasUrl = detailedBlock.source_url || detailedBlock.source?.url;
        
        if (hasUrl) {
          // Normalize the source_url field
          if (!detailedBlock.source_url && detailedBlock.source?.url) {
            detailedBlock.source_url = detailedBlock.source.url;
          }
          detailedBlocks.push(detailedBlock);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.warn(`Failed to get details for block ${block.id}:`, error);
      }
    }

    console.log(`Found ${detailedBlocks.length} link blocks with URLs`);
    return detailedBlocks;
  }

  /**
   * Filter blocks by type and get detailed info for Image blocks
   */
  async getDetailedImageBlocks(blocks: ArenaBlock[]): Promise<ArenaBlock[]> {
    const imageBlocks = blocks.filter(block => block.class === 'Image');
    const detailedBlocks: ArenaBlock[] = [];

    console.log(`Fetching detailed info for ${imageBlocks.length} image blocks...`);

    for (const block of imageBlocks) {
      try {
        const detailedBlock = await this.getBlock(block.id);
        
        // For Image blocks, we need the image URL which is typically in source_url
        const hasImageUrl = detailedBlock.source_url || detailedBlock.source?.url;
        
        if (hasImageUrl) {
          // Normalize the source_url field
          if (!detailedBlock.source_url && detailedBlock.source?.url) {
            detailedBlock.source_url = detailedBlock.source.url;
          }
          detailedBlocks.push(detailedBlock);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.warn(`Failed to get details for image block ${block.id}:`, error);
      }
    }

    console.log(`Found ${detailedBlocks.length} image blocks with URLs`);
    return detailedBlocks;
  }

  /**
   * Filter blocks by type and get detailed info for Media blocks (videos)
   */
  async getDetailedMediaBlocks(blocks: ArenaBlock[]): Promise<ArenaBlock[]> {
    const mediaBlocks = blocks.filter(block => block.class === 'Media');
    const detailedBlocks: ArenaBlock[] = [];

    console.log(`Fetching detailed info for ${mediaBlocks.length} media blocks...`);

    for (const block of mediaBlocks) {
      try {
        const detailedBlock = await this.getBlock(block.id);
        
        // For Media blocks, the URL is typically in source.url, not source_url
        const hasMediaUrl = detailedBlock.source_url || detailedBlock.source?.url;
        
        if (hasMediaUrl) {
          // Normalize the source_url field for consistency
          if (!detailedBlock.source_url && detailedBlock.source?.url) {
            detailedBlock.source_url = detailedBlock.source.url;
          }
          detailedBlocks.push(detailedBlock);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.warn(`Failed to get details for media block ${block.id}:`, error);
      }
    }

    console.log(`Found ${detailedBlocks.length} media blocks with URLs`);
    return detailedBlocks;
  }

  /**
   * Filter blocks by type and get detailed info for Attachment blocks (PDFs, documents)
   */
  async getDetailedAttachmentBlocks(blocks: ArenaBlock[]): Promise<ArenaBlock[]> {
    const attachmentBlocks = blocks.filter(block => block.class === 'Attachment');
    const detailedBlocks: ArenaBlock[] = [];

    console.log(`Fetching detailed info for ${attachmentBlocks.length} attachment blocks...`);

    for (const block of attachmentBlocks) {
      try {
        const detailedBlock = await this.getBlock(block.id);
        
        // For Attachment blocks, check both source_url and source.url
        const hasAttachmentUrl = detailedBlock.source_url || detailedBlock.source?.url;
        
        if (hasAttachmentUrl) {
          // Normalize the source_url field for consistency
          if (!detailedBlock.source_url && detailedBlock.source?.url) {
            detailedBlock.source_url = detailedBlock.source.url;
          }
          detailedBlocks.push(detailedBlock);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.warn(`Failed to get details for attachment block ${block.id}:`, error);
      }
    }

    console.log(`Found ${detailedBlocks.length} attachment blocks with URLs`);
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
  async getDetailedProcessableBlocks(blocks: ArenaBlock[]): Promise<{
    linkBlocks: ArenaBlock[];
    imageBlocks: ArenaBlock[];
    mediaBlocks: ArenaBlock[];
    attachmentBlocks: ArenaBlock[];
    textBlocks: ArenaBlock[];
    allBlocks: ArenaBlock[];
  }> {
    const [linkBlocks, imageBlocks, mediaBlocks, attachmentBlocks, textBlocks] = await Promise.all([
      this.getDetailedLinkBlocks(blocks),
      this.getDetailedImageBlocks(blocks),
      this.getDetailedMediaBlocks(blocks),
      this.getDetailedAttachmentBlocks(blocks),
      this.getDetailedTextBlocks(blocks)
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