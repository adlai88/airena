import { YoutubeTranscript } from 'youtube-transcript';
import { YouTubeOfficialAPI } from './youtube-api';

export class VideoExtractor {
  
  static isYouTubeUrl(url: string): boolean {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)/,
      /(?:youtube\.com\/shorts\/)/,
      /(?:m\.youtube\.com\/watch\?v=)/
    ];
    return patterns.some(pattern => pattern.test(url));
  }

  static isVimeoUrl(url: string): boolean {
    const patterns = [
      /(?:vimeo\.com\/)/,
      /(?:player\.vimeo\.com\/video\/)/
    ];
    return patterns.some(pattern => pattern.test(url));
  }

  static isVideoUrl(url: string): boolean {
    return this.isYouTubeUrl(url) || this.isVimeoUrl(url);
  }

  static extractVideoId(url: string): string {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([^&\n?#]+)/;
    const match = url.match(regex);
    if (!match) throw new Error('Invalid YouTube URL');
    return match[1];
  }

  static async getVideoMetadata(url: string): Promise<{
    title: string;
    videoId: string;
    url: string;
  }> {
    try {
      // Use the reliable YouTube API first
      const title = await YouTubeOfficialAPI.getTitle(url);
      const videoId = YouTubeOfficialAPI.extractVideoId(url);
      
      return {
        title,
        videoId,
        url
      };
    } catch (error) {
      console.warn('YouTube API metadata failed, trying fallback:', error);
      
      // Fallback to old method if API fails
      try {
        const videoId = this.extractVideoId(url);
        const title = await this.extractTitleFromYouTube(url);
        
        return {
          title: title || `YouTube Video (${videoId})`,
          videoId,
          url
        };
      } catch {
        return {
          title: 'Video',
          videoId: 'unknown',
          url
        };
      }
    }
  }

  static async extractTitleFromYouTube(url: string): Promise<string | null> {
    try {
      // Fetch with proper headers to avoid being blocked
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        }
      });
      
      if (!response.ok) {
        console.warn(`HTTP ${response.status} when fetching ${url}`);
        return null;
      }
      
      const html = await response.text();
      
      // Extract title from various possible meta tags and JSON-LD
      const titleMatches = [
        // Primary meta tags
        html.match(/<meta property="og:title" content="([^"]+)"/),
        html.match(/<meta name="title" content="([^"]+)"/),
        // JSON-LD structured data
        html.match(/"name"\s*:\s*"([^"]+)"/),
        // Fallback to page title
        html.match(/<title>([^<]+)<\/title>/)
      ];
      
      for (const match of titleMatches) {
        if (match && match[1]) {
          let title = match[1].trim();
          // Clean up YouTube's title format
          title = title.replace(/ - YouTube$/, '');
          // Decode HTML entities
          title = title.replace(/&quot;/g, '"')
                      .replace(/&#39;/g, "'")
                      .replace(/&amp;/g, '&')
                      .replace(/&lt;/g, '<')
                      .replace(/&gt;/g, '>');
          
          // Skip if it's just the generic title
          if (!title.includes('YouTube') || title.length > 20) {
            return title;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.warn('Failed to extract title from YouTube:', error);
      return null;
    }
  }

  static async extractVideo(url: string, description?: string): Promise<string> {
    try {
      if (!this.isYouTubeUrl(url)) {
        return 'Video transcript unavailable (non-YouTube video)';
      }

      // Use the robust YouTube API extraction first
      try {
        const content = await YouTubeOfficialAPI.extractVideoContent(url);
        
        // If API content looks good, use it
        if (content && content.length > 100 && !content.includes('YouTube API extraction failed')) {
          return content;
        }
      } catch (error) {
        console.warn('YouTube API extraction failed, trying fallback:', error);
      }

      // Fallback: Original approach with description
      const videoId = this.extractVideoId(url);
      const metadata = await this.getVideoMetadata(url);
      
      // Try to fetch transcript from old package (likely to fail but worth trying)
      let transcriptText = '';
      try {
        const transcript = await YoutubeTranscript.fetchTranscript(videoId);
        
        if (transcript && transcript.length > 0) {
          transcriptText = transcript
            .map(item => item.text)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
        }
      } catch (error) {
        console.warn(`Old transcript extraction failed for ${videoId}:`, error);
      }
      
      // Build content with available information
      let contentText = '';
      if (transcriptText && transcriptText.length > 50) {
        contentText = `Transcript: ${transcriptText}`;
      } else if (description && description.length > 20) {
        contentText = `Description: ${description}\n\nNote: Video transcript not available, using description as content.`;
      } else {
        contentText = 'Content: Video transcript and description unavailable';
      }
      
      // Format the content with metadata
      const content = [
        `Title: ${metadata.title}`,
        `Video ID: ${videoId}`,
        `Source: ${url}`,
        '',
        contentText
      ].join('\n');
      
      return content;
      
    } catch (error) {
      console.warn('Video extraction failed completely:', error);
      
      // Final fallback
      const videoId = this.extractVideoId(url);
      const fallbackContent = description && description.length > 20 
        ? `Description: ${description}`
        : 'Content: Video information unavailable';
        
      return [
        `Title: YouTube Video (${videoId})`,
        `Video ID: ${videoId}`,
        `Source: ${url}`,
        '',
        fallbackContent
      ].join('\n');
    }
  }

  static async validateVideoForProcessing(url: string): Promise<{ 
    valid: boolean; 
    reason?: string; 
    hasTranscript?: boolean 
  }> {
    try {
      if (!this.isYouTubeUrl(url)) {
        return {
          valid: false,
          reason: 'Only YouTube videos are currently supported',
          hasTranscript: false
        };
      }

      const videoId = this.extractVideoId(url);
      
      // Try to fetch transcript to check availability
      try {
        const transcript = await YoutubeTranscript.fetchTranscript(videoId);
        return {
          valid: true,
          hasTranscript: transcript.length > 0
        };
      } catch {
        // Video exists but no transcript available
        return {
          valid: true, // Still valid for metadata extraction
          reason: 'No captions available for this video',
          hasTranscript: false
        };
      }
      
    } catch (error) {
      return {
        valid: false,
        reason: `Failed to validate video: ${error}`,
        hasTranscript: false
      };
    }
  }

  static formatTranscriptPreview(content: string, maxLength: number = 200): string {
    const transcriptMatch = content.match(/Transcript: (.+)/);
    if (!transcriptMatch) return 'No transcript available';
    
    const transcript = transcriptMatch[1];
    if (transcript.length <= maxLength) return transcript;
    
    return transcript.substring(0, maxLength) + '...';
  }
}