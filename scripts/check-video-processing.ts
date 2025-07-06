import { VideoExtractor } from '../lib/video-extraction';

async function checkVideoProcessing() {
  console.log('🔍 Checking video processing details...\n');

  // Test with a few different video URLs
  const testVideos = [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Rick Roll
    'https://www.youtube.com/watch?v=9bZkp7q19f0', // PSY - Gangnam Style (has captions)
    'https://youtu.be/kJQP7kiw5Fk',  // Luis Fonsi - Despacito (has captions)
    'https://www.youtube.com/watch?v=dHVMujryp40' // User's video
  ];

  for (const url of testVideos) {
    console.log(`📹 Testing: ${url}`);
    
    try {
      // 1. Check URL detection
      const isVideo = VideoExtractor.isVideoUrl(url);
      console.log(`  ✅ Detected as video: ${isVideo}`);
      
      if (!isVideo) {
        console.log(`  ❌ URL not detected as video - skipping\n`);
        continue;
      }

      // 2. Check validation
      const validation = await VideoExtractor.validateVideoForProcessing(url);
      console.log(`  📋 Valid: ${validation.valid}`);
      console.log(`  📄 Has transcript: ${validation.hasTranscript}`);
      if (validation.reason) {
        console.log(`  ⚠️  Reason: ${validation.reason}`);
      }

      // 3. Try content extraction
      if (validation.valid) {
        const content = await VideoExtractor.extractVideo(url);
        const preview = content.substring(0, 200) + '...';
        console.log(`  📝 Content preview: ${preview}`);
        
        // Check if content is meaningful
        const hasTranscriptContent = content.includes('Transcript:') && 
                                   !content.includes('Video transcript unavailable');
        console.log(`  💬 Has transcript content: ${hasTranscriptContent}`);
      }

    } catch (error) {
      console.log(`  ❌ Error: ${error}`);
    }
    
    console.log(''); // Empty line between videos
  }
}

checkVideoProcessing().catch(console.error);