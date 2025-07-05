import ytdl from '@distube/ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath.path);

export class AudioExtractor {
  
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

  static async extractAudioFromYouTube(url: string): Promise<Buffer> {
    try {
      // Get audio stream from YouTube
      const audioStream = ytdl(url, {
        filter: 'audioonly',
        quality: 'highestaudio',
      });

      // Convert to audio buffer using FFmpeg
      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        
        ffmpeg(audioStream)
          .audioCodec('libmp3lame')
          .format('mp3')
          .audioBitrate(128) // Optimize for transcription, not quality
          .on('error', (err) => {
            console.error('FFmpeg error:', err);
            reject(err);
          })
          .pipe()
          .on('data', (chunk) => chunks.push(chunk))
          .on('end', () => {
            console.log('Audio extraction completed, buffer size:', Buffer.concat(chunks).length);
            resolve(Buffer.concat(chunks));
          })
          .on('error', (err) => {
            console.error('Stream error:', err);
            reject(err);
          });
      });
    } catch (error) {
      console.error('YouTube audio extraction failed:', error);
      throw new Error(`Failed to extract audio: ${error}`);
    }
  }

  static async getVideoInfo(url: string) {
    try {
      if (this.isYouTubeUrl(url)) {
        const info = await ytdl.getInfo(url);
        return {
          title: info.videoDetails.title,
          duration: parseInt(info.videoDetails.lengthSeconds),
          description: info.videoDetails.description || '',
          author: info.videoDetails.author?.name || '',
          viewCount: parseInt(info.videoDetails.viewCount) || 0,
        };
      }
      
      // For non-YouTube videos, return basic info
      return {
        title: 'Video',
        duration: 0,
        description: '',
        author: '',
        viewCount: 0,
      };
    } catch (error) {
      console.warn('Could not get video info:', error);
      return {
        title: 'Video',
        duration: 0,
        description: '',
        author: '',
        viewCount: 0,
      };
    }
  }

  static async validateVideoForProcessing(url: string): Promise<{ valid: boolean; reason?: string; duration?: number }> {
    try {
      const info = await this.getVideoInfo(url);
      
      // Check duration limits (max 30 minutes for now)
      const maxDuration = 30 * 60; // 30 minutes in seconds
      if (info.duration > maxDuration) {
        return {
          valid: false,
          reason: `Video too long (${Math.round(info.duration / 60)} minutes). Maximum: ${maxDuration / 60} minutes.`,
          duration: info.duration
        };
      }

      // Check if video is accessible
      if (!info.title || info.title === 'Video') {
        return {
          valid: false,
          reason: 'Video is not accessible or private',
          duration: info.duration
        };
      }

      return {
        valid: true,
        duration: info.duration
      };
      
    } catch (error) {
      return {
        valid: false,
        reason: `Failed to validate video: ${error}`,
        duration: 0
      };
    }
  }
}