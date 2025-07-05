import { YoutubeTranscript } from 'youtube-transcript';

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
      const videoId = this.extractVideoId(url);
      return {
        title: `YouTube Video (${videoId})`,
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

  static async extractVideo(url: string): Promise<string> {
    try {
      if (!this.isYouTubeUrl(url)) {
        return 'Video transcript unavailable (non-YouTube video)';
      }

      const videoId = this.extractVideoId(url);
      const metadata = await this.getVideoMetadata(url);
      
      // Fetch transcript from YouTube captions
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      
      // Convert transcript items to clean text
      const text = transcript
        .map(item => item.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Format the content with metadata
      const content = [
        `Title: ${metadata.title}`,
        `Video ID: ${videoId}`,
        `Source: ${url}`,
        '',
        `Transcript: ${text}`
      ].join('\n');
      
      return content;
      
    } catch (error) {
      console.warn('Video transcript extraction failed:', error);
      
      // Fallback: return basic metadata
      const metadata = await this.getVideoMetadata(url);
      return [
        `Title: ${metadata.title}`,
        `Video ID: ${metadata.videoId}`,
        `Source: ${url}`,
        '',
        'Transcript: Video transcript unavailable (no captions or private video)'
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