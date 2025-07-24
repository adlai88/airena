// Vision service for analyzing images using OpenAI GPT-4V
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

// Schema for structured image analysis
const ImageAnalysisSchema = z.object({
  description: z.string().describe('Detailed description of the image content'),
  style: z.string().describe('Visual style (e.g., minimalist, brutalist, organic, modernist)'),
  colors: z.array(z.string()).describe('Primary colors present in the image'),
  elements: z.array(z.string()).describe('Key visual elements (typography, layout, composition)'),
  mood: z.string().describe('Overall mood or feeling conveyed'),
  category: z.string().describe('Category (portfolio, design, photography, artwork, etc.)'),
  tags: z.array(z.string()).describe('Relevant tags for search and categorization')
});

export type ImageAnalysis = z.infer<typeof ImageAnalysisSchema>;

import { ArenaBlock } from './arena';

export interface ProcessedImageBlock {
  arenaId: number;
  title: string;
  description: string;
  imageUrl: string;
  analysis: ImageAnalysis;
  processedContent: string; // Formatted text for embedding
  blockType: 'Image';
  originalBlock: ArenaBlock;
}

export class VisionService {
  /**
   * Analyze an image using GPT-4V and extract structured insights
   */
  async analyzeImage(imageUrl: string, title?: string, description?: string): Promise<ImageAnalysis> {
    try {
      console.log(`Analyzing image: ${imageUrl}`);

      const { object: analysis } = await generateObject({
        model: openai('gpt-4o'),
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this image and provide structured insights. ${title ? `Title: "${title}"` : ''} ${description ? `Description: "${description}"` : ''}`
              },
              {
                type: 'image',
                image: imageUrl
              }
            ]
          }
        ],
        schema: ImageAnalysisSchema,
        temperature: 0.1, // Low temperature for consistent analysis
      });

      console.log(`Image analysis completed for: ${imageUrl}`);
      return analysis;

    } catch (analysisError) {
      console.error(`Failed to analyze image ${imageUrl}:`, analysisError);
      
      // Fallback analysis if GPT-4V fails
      return {
        description: title || description || 'Image content could not be analyzed',
        style: 'unknown',
        colors: [],
        elements: [],
        mood: 'neutral',
        category: 'image',
        tags: title ? [title.toLowerCase()] : []
      };
    }
  }

  /**
   * Process an Arena Image block into structured content
   */
  async processImageBlock(block: {
    id: number;
    title: string | null;
    description: string | null;
    source_url: string;
  }): Promise<ProcessedImageBlock | null> {
    try {
      if (!block.source_url) {
        console.warn(`Image block ${block.id} has no source URL`);
        return null;
      }

      // Analyze the image
      const analysis = await this.analyzeImage(
        block.source_url,
        block.title || undefined,
        block.description || undefined
      );

      // Create structured text content for embedding
      const processedContent = this.formatImageContent(
        block.title || 'Untitled Image',
        block.description,
        analysis
      );

      return {
        arenaId: block.id,
        title: block.title || 'Untitled Image',
        description: block.description || '',
        imageUrl: block.source_url,
        analysis,
        processedContent,
        blockType: 'Image',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        originalBlock: block as any
      };

    } catch (error) {
      console.error(`Failed to process image block ${block.id}:`, error);
      return null;
    }
  }

  /**
   * Format image analysis into searchable text content
   */
  private formatImageContent(
    title: string,
    description: string | null,
    analysis: ImageAnalysis
  ): string {
    const sections = [
      `Title: ${title}`,
      description ? `Description: ${description}` : '',
      `Visual Analysis: ${analysis.description}`,
      `Style: ${analysis.style}`,
      `Colors: ${analysis.colors.join(', ')}`,
      `Elements: ${analysis.elements.join(', ')}`,
      `Mood: ${analysis.mood}`,
      `Category: ${analysis.category}`,
      `Tags: ${analysis.tags.join(', ')}`
    ].filter(Boolean);

    return sections.join('\n');
  }

  /**
   * Check if URL is a supported image format
   */
  isImageUrl(url: string): boolean {
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
    const arenaImagePattern = /d2w9rnfh332o.cloudfront.net/;
    
    return imageExtensions.test(url) || arenaImagePattern.test(url);
  }

  /**
   * Get basic image info without full analysis (for quick checks)
   */
  async getImageInfo(imageUrl: string): Promise<{
    isValid: boolean;
    dimensions?: { width: number; height: number };
    format?: string;
  }> {
    try {
      // For now, just validate it's an image URL
      // Could extend with actual image metadata fetching
      return {
        isValid: this.isImageUrl(imageUrl),
        format: imageUrl.split('.').pop()?.toLowerCase()
      };
    } catch {
      return { isValid: false };
    }
  }
}

// Export singleton instance
export const visionService = new VisionService();