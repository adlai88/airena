import { contentExtractor } from '../src/lib/extraction';
import { ArenaBlock } from '../src/lib/arena';

async function testVideoIntegration() {
  console.log('🎬 Testing video integration in content extraction pipeline...\n');

  // Create a test Are.na block representing a YouTube video
  const testVideoBlock: ArenaBlock = {
    id: 12345,
    title: 'Test Video',
    description: 'A test YouTube video for transcript extraction',
    content: null,
    source_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Rick Roll - reliable test video
    class: 'Link',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    user: {
      id: 1,
      username: 'testuser',
      full_name: 'Test User'
    }
  };

  // Create a regular website block for comparison
  const testWebsiteBlock: ArenaBlock = {
    id: 12346,
    title: 'Test Website',
    description: 'A test website block',
    content: null,
    source_url: 'https://example.com',
    class: 'Link',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    user: {
      id: 1,
      username: 'testuser',
      full_name: 'Test User'
    }
  };

  try {
    console.log('📹 Testing video block processing...');
    const processedVideo = await contentExtractor.processBlock(testVideoBlock);
    
    if (processedVideo) {
      console.log('✅ Video processing successful!');
      console.log('Title:', processedVideo.title);
      console.log('Block Type:', processedVideo.blockType);
      
      // Handle different URL property names
      if (processedVideo.blockType === 'Image') {
        console.log('URL:', (processedVideo as any).imageUrl);
      } else {
        console.log('URL:', (processedVideo as any).url);
      }
      
      if (processedVideo.blockType === 'Video') {
        console.log('Has Transcript:', (processedVideo as any).hasTranscript);
        console.log('Video ID:', (processedVideo as any).videoId);
      }
      
      // Handle different content property names
      const content = processedVideo.blockType === 'Image' 
        ? (processedVideo as any).processedContent 
        : (processedVideo as any).content;
      console.log('Content Preview:', content.substring(0, 200) + '...\n');
    } else {
      console.log('❌ Video processing failed\n');
    }

    console.log('🌐 Testing website block processing...');
    const processedWebsite = await contentExtractor.processBlock(testWebsiteBlock);
    
    if (processedWebsite) {
      console.log('✅ Website processing successful!');
      console.log('Title:', processedWebsite.title);
      console.log('Block Type:', processedWebsite.blockType);
      
      // Handle different content property names
      const content = processedWebsite.blockType === 'Image' 
        ? (processedWebsite as any).processedContent 
        : (processedWebsite as any).content;
      console.log('Content Preview:', content.substring(0, 200) + '...\n');
    } else {
      console.log('❌ Website processing failed\n');
    }

    console.log('📊 Testing batch processing...');
    const allBlocks = [testVideoBlock, testWebsiteBlock];
    const processedBlocks = await contentExtractor.processBlocks(allBlocks);
    
    console.log(`\n🎉 Batch processing complete: ${processedBlocks.length} blocks processed`);
    processedBlocks.forEach((block, index) => {
      console.log(`  ${index + 1}. ${block.blockType}: ${block.title}`);
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
  }
}

// Run the test
testVideoIntegration().catch(console.error);