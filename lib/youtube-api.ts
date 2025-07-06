// Official YouTube Data API v3 integration
export interface YouTubeVideoData {
  title: string;
  description: string;
  channelTitle: string;
  tags: string[];
  videoId: string;
  url: string;
}

export class YouTubeOfficialAPI {
  
  static extractVideoId(url: string): string {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\n?#]+)/;
    const match = url.match(regex);
    if (!match) throw new Error('Invalid YouTube URL');
    return match[1];
  }

  static async getVideoMetadata(videoUrl: string): Promise<YouTubeVideoData> {
    const API_KEY = process.env.YOUTUBE_API_KEY;
    if (!API_KEY) {
      throw new Error('YOUTUBE_API_KEY not configured');
    }

    const videoId = this.extractVideoId(videoUrl);
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${API_KEY}`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status} - ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        throw new Error('Video not found or unavailable');
      }
      
      const video = data.items[0].snippet;
      
      return {
        title: video.title || 'YouTube Video',
        description: video.description || '',
        channelTitle: video.channelTitle || 'Unknown Channel',
        tags: video.tags || [],
        videoId,
        url: videoUrl
      };
      
    } catch (error) {
      console.error(`Failed to get YouTube metadata for ${videoId}:`, error);
      throw error;
    }
  }

  static async getVideoTranscript(videoUrl: string): Promise<string | null> {
    const API_KEY = process.env.YOUTUBE_API_KEY;
    if (!API_KEY) {
      throw new Error('YOUTUBE_API_KEY not configured');
    }

    const videoId = this.extractVideoId(videoUrl);
    
    try {
      // Step 1: Get available captions
      const captionsUrl = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${API_KEY}`;
      const captionsResponse = await fetch(captionsUrl);
      
      if (!captionsResponse.ok) {
        console.warn(`Captions API error: ${captionsResponse.status}`);
        return null;
      }
      
      const captionsData = await captionsResponse.json();
      
      if (!captionsData.items || captionsData.items.length === 0) {
        console.log(`No captions available for video ${videoId}`);
        return null;
      }
      
      // Step 2: Try to download transcript content
      // Note: The YouTube API requires OAuth2 for caption downloads in most cases
      // For now, we'll just return null and rely on descriptions
      console.log(`Found ${captionsData.items.length} caption tracks for ${videoId}, but transcript download requires additional auth`);
      return null;
      
    } catch (error) {
      console.warn(`Transcript extraction failed for ${videoId}:`, error);
      return null;
    }
  }

  static async extractVideoContent(videoUrl: string): Promise<string> {
    try {
      // Always get metadata (reliable)
      const metadata = await this.getVideoMetadata(videoUrl);
      
      // Build rich content from metadata
      const contentSections = [
        `Title: ${metadata.title}`,
        `Channel: ${metadata.channelTitle}`,
        `Video ID: ${metadata.videoId}`,
        `Source: ${metadata.url}`,
        ''
      ];

      // Add description if available (often contains valuable content)
      if (metadata.description && metadata.description.length > 20) {
        contentSections.push(`Description: ${metadata.description}`);
        contentSections.push('');
      }

      // Add tags if available
      if (metadata.tags && metadata.tags.length > 0) {
        contentSections.push(`Tags: ${metadata.tags.join(', ')}`);
        contentSections.push('');
      }

      // Try to get transcript (bonus if it works)
      try {
        const transcript = await this.getVideoTranscript(videoUrl);
        if (transcript && transcript.length > 50) {
          contentSections.push(`Transcript: ${transcript}`);
        } else {
          contentSections.push('Transcript: Not available (using description and metadata as content)');
        }
      } catch {
        contentSections.push('Transcript: Not available (using description and metadata as content)');
      }

      return contentSections.join('\n');
      
    } catch (error) {
      console.error('YouTube content extraction failed:', error);
      
      // Fallback: basic structure
      const videoId = this.extractVideoId(videoUrl);
      return [
        `Title: YouTube Video (${videoId})`,
        `Video ID: ${videoId}`,
        `Source: ${videoUrl}`,
        '',
        'Content: YouTube API extraction failed'
      ].join('\n');
    }
  }

  static async getTitle(videoUrl: string): Promise<string> {
    try {
      const metadata = await this.getVideoMetadata(videoUrl);
      return metadata.title;
    } catch (error) {
      console.warn('Failed to get YouTube title:', error);
      const videoId = this.extractVideoId(videoUrl);
      return `YouTube Video (${videoId})`;
    }
  }
}