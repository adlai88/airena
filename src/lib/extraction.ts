// Content extraction service for processing Are.na blocks
import axios from 'axios';
import { ArenaBlock } from './arena';
import { visionService, ProcessedImageBlock } from './vision';

export interface ProcessedBlock {
  arenaId: number;
  title: string;
  description: string | null;
  content: string;
  url: string;
  blockType: string;
  originalBlock: ArenaBlock;
}

// Union type for all processed block types
export type ProcessedAnyBlock = ProcessedBlock | ProcessedImageBlock;

export class ContentExtractor {
  private jinaApiKey: string;

  constructor(jinaApiKey?: string) {
    this.jinaApiKey = jinaApiKey || process.env.JINA_API_KEY || '';
  }

  /**
   * Extract content from a website URL using Jina AI Reader
   */
  async extractWebsite(url: string): Promise<string> {
    try {
      const response = await axios.get(`https://r.jina.ai/${url}`, {
        headers: {
          'Authorization': `Bearer ${this.jinaApiKey}`,
          'Accept': 'application/json',
        },
        timeout: 30000, // 30 second timeout
      });

      if (response.data && response.data.data) {
        return response.data.data.content || response.data.data.text || '';
      }
      
      // Fallback: try text response
      if (typeof response.data === 'string') {
        return response.data;
      }

      return '';
    } catch (error) {
      console.error(`Failed to extract content from ${url}:`, error);
      
      // Fallback: try without authentication
      try {
        const fallbackResponse = await axios.get(`https://r.jina.ai/${url}`, {
          timeout: 30000,
        });
        return typeof fallbackResponse.data === 'string' ? fallbackResponse.data : '';
      } catch (fallbackError) {
        console.error(`Fallback extraction also failed for ${url}:`, fallbackError);
        return '';
      }
    }
  }

  /**
   * Clean and prepare extracted content
   */
  private cleanContent(content: string): string {
    if (!content) return '';
    
    // Remove excessive whitespace
    const cleaned = content
      .replace(/\n\s*\n/g, '\n\n') // Collapse multiple newlines
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .trim();
    
    // Truncate if too long (for embedding limits)
    const maxLength = 8000; // Conservative limit for OpenAI embeddings
    if (cleaned.length > maxLength) {
      return cleaned.substring(0, maxLength) + '...';
    }
    
    return cleaned;
  }

  /**
   * Process an Are.na block and extract its content (Link blocks)
   */
  async processLinkBlock(block: ArenaBlock): Promise<ProcessedBlock | null> {
    if (block.class !== 'Link' || !block.source_url) {
      return null;
    }

    // Skip non-web URLs
    if (!block.source_url.startsWith('http')) {
      return null;
    }

    try {
      // Extract content using Jina AI
      const rawContent = await this.extractWebsite(block.source_url);
      const cleanedContent = this.cleanContent(rawContent);

      // Skip if no meaningful content extracted
      if (!cleanedContent || cleanedContent.length < 100) {
        console.warn(`Insufficient content extracted from ${block.source_url}`);
        return null;
      }

      // Create title from block title or extract from URL
      const title = block.title || 
                   block.description || 
                   this.extractTitleFromUrl(block.source_url);

      return {
        arenaId: block.id,
        title,
        description: block.description,
        content: cleanedContent,
        url: block.source_url,
        blockType: block.class,
        originalBlock: block,
      };
    } catch (error) {
      console.error(`Failed to process link block ${block.id}:`, error);
      return null;
    }
  }

  /**
   * Process an Are.na Image block using vision analysis
   */
  async processImageBlock(block: ArenaBlock): Promise<ProcessedImageBlock | null> {
    if (block.class !== 'Image' || !block.source_url) {
      return null;
    }

    try {
      const processedImage = await visionService.processImageBlock({
        id: block.id,
        title: block.title,
        description: block.description,
        source_url: block.source_url
      });

      if (!processedImage) {
        console.warn(`Failed to process image block ${block.id}`);
        return null;
      }

      console.log(`✅ Processed image: ${processedImage.title}`);
      return processedImage;
    } catch (error) {
      console.error(`Failed to process image block ${block.id}:`, error);
      return null;
    }
  }

  /**
   * Process any Are.na block (Link or Image)
   */
  async processBlock(block: ArenaBlock): Promise<ProcessedAnyBlock | null> {
    if (block.class === 'Link') {
      return this.processLinkBlock(block);
    } else if (block.class === 'Image') {
      return this.processImageBlock(block);
    }
    
    // Skip other block types for now
    return null;
  }

  /**
   * Extract a readable title from URL
   */
  private extractTitleFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      const path = urlObj.pathname.replace(/^\//, '').replace(/\/$/, '');
      
      if (path) {
        // Convert path to readable title
        const title = path
          .split('/')
          .pop()
          ?.replace(/[-_]/g, ' ')
          .replace(/\.[^/.]+$/, '') // Remove file extension
          .replace(/\b\w/g, l => l.toUpperCase()) || domain;
        
        return `${title} | ${domain}`;
      }
      
      return domain;
    } catch {
      return 'Untitled';
    }
  }

  /**
   * Process multiple blocks with rate limiting
   */
  async processBlocks(blocks: ArenaBlock[], onProgress?: (processed: number, total: number) => void): Promise<ProcessedAnyBlock[]> {
    const processedBlocks: ProcessedAnyBlock[] = [];
    const processableBlocks = blocks.filter(block => 
      (block.class === 'Link' || block.class === 'Image') && block.source_url
    );

    console.log(`Processing ${processableBlocks.length} blocks (${blocks.filter(b => b.class === 'Link').length} links, ${blocks.filter(b => b.class === 'Image').length} images)...`);

    for (let i = 0; i < processableBlocks.length; i++) {
      const block = processableBlocks[i];
      
      try {
        const processedBlock = await this.processBlock(block);
        if (processedBlock) {
          processedBlocks.push(processedBlock);
          console.log(`✅ Processed ${block.class}: ${processedBlock.title}`);
        } else {
          console.log(`⚠️  Skipped ${block.class}: ${block.source_url}`);
        }
      } catch (error) {
        console.error(`❌ Failed to process ${block.class} block ${block.id}:`, error);
      }

      // Progress callback
      if (onProgress) {
        onProgress(i + 1, processableBlocks.length);
      }

      // Rate limiting: wait between requests (longer for vision API calls)
      if (i < processableBlocks.length - 1) {
        const delay = block.class === 'Image' ? 1000 : 500; // 1s for images, 500ms for links
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    const linkCount = processedBlocks.filter(b => b.blockType === 'Link').length;
    const imageCount = processedBlocks.filter(b => b.blockType === 'Image').length;
    
    console.log(`\n📊 Processing complete: ${processedBlocks.length}/${processableBlocks.length} blocks processed successfully (${linkCount} links, ${imageCount} images)`);
    return processedBlocks;
  }
}

// Export singleton instance
export const contentExtractor = new ContentExtractor();