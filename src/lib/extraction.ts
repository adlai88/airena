// Content extraction service for processing Are.na blocks
import axios from 'axios';
import { ArenaBlock } from './arena';
import { visionService, ProcessedImageBlock } from './vision';
import { VideoExtractor } from '../../lib/video-extraction';

export interface ProcessedBlock {
  arenaId: number;
  title: string;
  description: string | null;
  content: string;
  url: string;
  blockType: string;
  originalBlock: ArenaBlock;
}

export interface ProcessedVideoBlock extends ProcessedBlock {
  blockType: 'Video';
  hasTranscript: boolean;
  videoId?: string;
}

export interface ProcessedTextBlock {
  id: number;
  title: string;
  content: string;
  url: string;
  blockType: 'Text';
  source: string;
  originalBlock: ArenaBlock;
}

// Union type for all processed block types
export type ProcessedAnyBlock = ProcessedBlock | ProcessedImageBlock | ProcessedVideoBlock | ProcessedTextBlock;

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
  async processLinkBlock(block: ArenaBlock): Promise<ProcessedBlock | ProcessedVideoBlock | null> {
    if (block.class !== 'Link' || !block.source_url) {
      return null;
    }

    // Skip non-web URLs
    if (!block.source_url.startsWith('http')) {
      return null;
    }

    // Check if this is a video URL
    if (VideoExtractor.isVideoUrl(block.source_url)) {
      return this.processVideoBlock(block);
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

      // Add the original block to the processed image
      const processedImageWithOriginal: ProcessedImageBlock = {
        ...processedImage,
        originalBlock: block
      };

      console.log(`✅ Processed image: ${processedImage.title}`);
      return processedImageWithOriginal;
    } catch (error) {
      console.error(`Failed to process image block ${block.id}:`, error);
      return null;
    }
  }

  /**
   * Process video blocks (YouTube URLs) using transcript extraction
   */
  async processVideoBlock(block: ArenaBlock): Promise<ProcessedVideoBlock | null> {
    if (!block.source_url || !VideoExtractor.isVideoUrl(block.source_url)) {
      return null;
    }

    try {
      // Validate video first
      const validation = await VideoExtractor.validateVideoForProcessing(block.source_url);
      
      // Extract video content
      const rawContent = await VideoExtractor.extractVideo(block.source_url, block.description || undefined);
      const cleanedContent = this.cleanContent(rawContent);

      // Create title from metadata first, then smart fallbacks
      const metadata = await VideoExtractor.getVideoMetadata(block.source_url);
      let title = metadata.title;
      
      // If extraction failed, use description as title source (often has good info)
      if (!title || title.includes('YouTube Video (')) {
        if (block.description && block.description.length > 10) {
          // Use first sentence of description as title
          title = block.description.split('.')[0].trim();
          // Limit length for readability
          if (title.length > 80) {
            title = title.substring(0, 77) + '...';
          }
        } else {
          title = block.title || metadata.title || 'YouTube Video';
        }
      }

      return {
        arenaId: block.id,
        title,
        description: block.description,
        content: cleanedContent,
        url: block.source_url,
        blockType: 'Video',
        hasTranscript: validation.hasTranscript || false,
        videoId: metadata.videoId,
        originalBlock: block,
      };
    } catch (error) {
      console.error(`Failed to process video block ${block.id}:`, error);
      return null;
    }
  }

  /**
   * Process Media blocks (often contain videos from YouTube, Vimeo, etc.)
   */
  async processMediaBlock(block: ArenaBlock): Promise<ProcessedVideoBlock | null> {
    if (block.class !== 'Media' || !block.source_url) {
      return null;
    }

    // Check if this Media block contains a video URL
    if (VideoExtractor.isVideoUrl(block.source_url)) {
      try {
        // Process as video using existing video processing logic
        const validation = await VideoExtractor.validateVideoForProcessing(block.source_url);
        const rawContent = await VideoExtractor.extractVideo(block.source_url, block.description || undefined);
        const cleanedContent = this.cleanContent(rawContent);

        // Create title from metadata first, then smart fallbacks
        const metadata = await VideoExtractor.getVideoMetadata(block.source_url);
        let title = metadata.title;
        
        // If extraction failed, use description as title source (often has good info)
        if (!title || title.includes('YouTube Video (')) {
          if (block.description && block.description.length > 10) {
            // Use first sentence of description as title
            title = block.description.split('.')[0].trim();
            // Limit length for readability
            if (title.length > 80) {
              title = title.substring(0, 77) + '...';
            }
          } else {
            title = block.title || metadata.title || 'YouTube Video';
          }
        }

        return {
          arenaId: block.id,
          title,
          description: block.description,
          content: cleanedContent,
          url: block.source_url,
          blockType: 'Video',
          hasTranscript: validation.hasTranscript || false,
          videoId: metadata.videoId,
          originalBlock: block,
        };
      } catch (error) {
        console.error(`Failed to process media block ${block.id} as video:`, error);
        return null;
      }
    }

    // For non-video Media blocks, skip processing for now
    console.log(`Skipping Media block ${block.id}: not a video URL (${block.source_url})`);
    return null;
  }

  /**
   * Process Attachment blocks (often contain PDFs, documents)
   */
  async processAttachmentBlock(block: ArenaBlock): Promise<ProcessedBlock | null> {
    if (block.class !== 'Attachment' || !block.source_url) {
      return null;
    }

    // Check if this is a PDF or document URL
    const isPdf = block.source_url.toLowerCase().includes('.pdf') || 
                  block.source_url.toLowerCase().includes('pdf');
    
    try {
      // Extract content using Jina AI (works well with PDFs)
      const rawContent = await this.extractWebsite(block.source_url);
      const cleanedContent = this.cleanContent(rawContent);

      // Skip if no meaningful content extracted
      if (!cleanedContent || cleanedContent.length < 100) {
        console.warn(`Insufficient content extracted from attachment ${block.source_url}`);
        return null;
      }

      // Create title from block title, description, or extract from URL
      const title = block.title || 
                   block.description || 
                   this.extractTitleFromUrl(block.source_url);

      // Enhance title to indicate it's a document/PDF
      const enhancedTitle = isPdf && !title.toLowerCase().includes('pdf') 
        ? `${title} (PDF)` 
        : title;

      return {
        arenaId: block.id,
        title: enhancedTitle,
        description: block.description,
        content: cleanedContent,
        url: block.source_url,
        blockType: 'Attachment',
        originalBlock: block,
      };
    } catch (error) {
      console.error(`Failed to process attachment block ${block.id}:`, error);
      return null;
    }
  }

  /**
   * Process Text block
   */
  async processTextBlock(block: ArenaBlock): Promise<ProcessedTextBlock | null> {
    try {
      console.log(`Processing text block: ${block.id}`);
      
      // Text blocks already have content available
      const content = block.content || '';
      const title = block.title || 'Untitled Text';
      
      if (!content.trim()) {
        console.log(`Skipping text block ${block.id} - no content`);
        return null;
      }

      return {
        id: block.id,
        title,
        content,
        url: `https://www.are.na/block/${block.id}`, // Are.na block URL
        blockType: 'Text',
        source: 'arena-text',
        originalBlock: block
      };
    } catch (error) {
      console.error(`Failed to process text block ${block.id}:`, error);
      return null;
    }
  }

  /**
   * Process any Are.na block (Link, Image, Media, Attachment, Text, or Video)
   */
  async processBlock(block: ArenaBlock): Promise<ProcessedAnyBlock | null> {
    if (block.class === 'Link') {
      // processLinkBlock now handles both websites and videos
      return this.processLinkBlock(block);
    } else if (block.class === 'Image') {
      return this.processImageBlock(block);
    } else if (block.class === 'Media') {
      // Media blocks often contain videos (like YouTube embeds)
      return this.processMediaBlock(block);
    } else if (block.class === 'Attachment') {
      // Attachment blocks often contain PDFs and documents
      return this.processAttachmentBlock(block);
    } else if (block.class === 'Text') {
      // Text blocks contain user-written content
      return this.processTextBlock(block);
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
      (block.class === 'Link' || block.class === 'Image' || block.class === 'Media' || block.class === 'Attachment') && block.source_url ||
      block.class === 'Text'
    );

    // Count different types of content
    const linkBlocks = blocks.filter(b => b.class === 'Link' && b.source_url);
    const imageBlocks = blocks.filter(b => b.class === 'Image' && b.source_url);
    const mediaBlocks = blocks.filter(b => b.class === 'Media' && b.source_url);
    const attachmentBlocks = blocks.filter(b => b.class === 'Attachment' && b.source_url);
    const textBlocks = blocks.filter(b => b.class === 'Text');
    const videoBlocks = linkBlocks.filter(b => b.source_url && VideoExtractor.isVideoUrl(b.source_url));
    const mediaVideoBlocks = mediaBlocks.filter(b => b.source_url && VideoExtractor.isVideoUrl(b.source_url));
    const websiteBlocks = linkBlocks.filter(b => b.source_url && !VideoExtractor.isVideoUrl(b.source_url));

    console.log(`Processing ${processableBlocks.length} blocks (${websiteBlocks.length} websites, ${videoBlocks.length} link videos, ${mediaVideoBlocks.length} media videos, ${imageBlocks.length} images, ${attachmentBlocks.length} attachments, ${textBlocks.length} text)...`);

    for (let i = 0; i < processableBlocks.length; i++) {
      const block = processableBlocks[i];
      
      try {
        const processedBlock = await this.processBlock(block);
        if (processedBlock) {
          processedBlocks.push(processedBlock);
          const blockType = processedBlock.blockType === 'Video' ? 'video' : 
                           processedBlock.blockType === 'Image' ? 'image' : 
                           processedBlock.blockType === 'Attachment' ? 'attachment' : 'website';
          console.log(`✅ Processed ${blockType}: ${processedBlock.title}`);
        } else {
          const blockType = block.class === 'Image' ? 'image' : 
                           block.class === 'Attachment' ? 'attachment' :
                           (block.source_url && VideoExtractor.isVideoUrl(block.source_url)) ? 'video' : 'website';
          console.log(`⚠️  Skipped ${blockType}: ${block.source_url}`);
        }
      } catch (error) {
        const blockType = block.class === 'Image' ? 'image' : 
                         block.class === 'Attachment' ? 'attachment' :
                         (block.source_url && VideoExtractor.isVideoUrl(block.source_url)) ? 'video' : 'website';
        console.error(`❌ Failed to process ${blockType} block ${block.id}:`, error);
      }

      // Progress callback
      if (onProgress) {
        onProgress(i + 1, processableBlocks.length);
      }

      // Rate limiting: wait between requests (longer for vision API calls)
      if (i < processableBlocks.length - 1) {
        const isImage = block.class === 'Image';
        const isVideo = block.source_url && VideoExtractor.isVideoUrl(block.source_url);
        const delay = isImage ? 1000 : isVideo ? 750 : 500; // 1s for images, 750ms for videos, 500ms for websites
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    const websiteCount = processedBlocks.filter(b => b.blockType === 'Link').length;
    const videoCount = processedBlocks.filter(b => b.blockType === 'Video').length;
    const imageCount = processedBlocks.filter(b => b.blockType === 'Image').length;
    const attachmentCount = processedBlocks.filter(b => b.blockType === 'Attachment').length;
    
    console.log(`\n📊 Processing complete: ${processedBlocks.length}/${processableBlocks.length} blocks processed successfully (${websiteCount} websites, ${videoCount} videos, ${imageCount} images, ${attachmentCount} attachments)`);
    return processedBlocks;
  }
}

// Export singleton instance
export const contentExtractor = new ContentExtractor();