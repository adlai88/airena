import { AudioExtractor } from '../lib/audio-extraction';

async function testVideoExtraction() {
  // Test with a short, popular YouTube video (Rick Roll - should be stable)
  const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  
  console.log('🎬 Testing video extraction...');
  console.log('URL:', testUrl);
  
  try {
    // Test URL detection
    console.log('\n📋 URL Detection:');
    console.log('Is YouTube URL:', AudioExtractor.isYouTubeUrl(testUrl));
    console.log('Is Video URL:', AudioExtractor.isVideoUrl(testUrl));
    
    // Test video info extraction
    console.log('\n📊 Video Info:');
    const videoInfo = await AudioExtractor.getVideoInfo(testUrl);
    console.log('Title:', videoInfo.title);
    console.log('Duration:', `${Math.floor(videoInfo.duration / 60)}:${(videoInfo.duration % 60).toString().padStart(2, '0')}`);
    console.log('Author:', videoInfo.author);
    console.log('Description preview:', videoInfo.description.substring(0, 100) + '...');
    
    // Test validation
    console.log('\n✅ Validation:');
    const validation = await AudioExtractor.validateVideoForProcessing(testUrl);
    console.log('Valid for processing:', validation.valid);
    if (!validation.valid) {
      console.log('Reason:', validation.reason);
      return;
    }
    
    // Test audio extraction (comment out if you want to skip the heavy part)
    console.log('\n🎵 Audio Extraction:');
    console.log('Starting audio extraction... (this may take a moment)');
    
    const startTime = Date.now();
    const audioBuffer = await AudioExtractor.extractAudioFromYouTube(testUrl);
    const endTime = Date.now();
    
    console.log('✅ Audio extraction successful!');
    console.log('Buffer size:', `${(audioBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    console.log('Extraction time:', `${(endTime - startTime) / 1000}s`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}

// Test with different URL types
async function testUrlDetection() {
  console.log('\n🔍 Testing URL Detection:');
  
  const testUrls = [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    'https://vimeo.com/123456789',
    'https://example.com/not-a-video',
    'https://are.na/example-channel'
  ];
  
  testUrls.forEach(url => {
    console.log(`${url}: YouTube=${AudioExtractor.isYouTubeUrl(url)}, Video=${AudioExtractor.isVideoUrl(url)}`);
  });
}

// Run tests
async function runTests() {
  await testUrlDetection();
  await testVideoExtraction();
}

runTests().catch(console.error);