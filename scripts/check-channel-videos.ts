import { arenaClient } from '../src/lib/arena';
import { VideoExtractor } from '../lib/video-extraction';

async function checkChannelVideos() {
  console.log('🔍 Checking r-startups-founder-mode channel...');
  
  try {
    const channel = await arenaClient.getChannel('r-startups-founder-mode');
    console.log('Channel found:', channel.title);
    console.log('Total blocks:', channel.contents.length);
    
    // Get detailed blocks (this fetches source_url)
    console.log('\n🔍 Fetching detailed block information...');
    const detailedBlocks = await arenaClient.getDetailedProcessableBlocks(channel.contents);
    console.log('Detailed blocks fetched:', detailedBlocks.length);
    
    // Count block types
    const linkBlocks = detailedBlocks.filter(b => b.class === 'Link');
    const imageBlocks = detailedBlocks.filter(b => b.class === 'Image');
    const textBlocks = detailedBlocks.filter(b => b.class === 'Text');
    const otherBlocks = detailedBlocks.filter(b => !['Link', 'Image', 'Text'].includes(b.class));
    
    console.log('Link blocks:', linkBlocks.length);
    console.log('Image blocks:', imageBlocks.length); 
    console.log('Text blocks:', textBlocks.length);
    console.log('Other blocks:', otherBlocks.length);
    
    // Check for video URLs in link blocks
    const videoBlocks = linkBlocks.filter(b => b.source_url && VideoExtractor.isVideoUrl(b.source_url));
    console.log('Video URLs found:', videoBlocks.length);
    
    if (videoBlocks.length > 0) {
      console.log('\n📹 Video blocks found:');
      videoBlocks.forEach((block, i) => {
        console.log(`${i + 1}. ${block.source_url}`);
        console.log(`   Title: ${block.title || 'No title'}`);
        console.log(`   Block ID: ${block.id}`);
        console.log('');
      });
    }
    
    // Check if your specific video is there
    const yourVideo = linkBlocks.find(b => b.source_url?.includes('dHVMujryp40'));
    if (yourVideo) {
      console.log('🎯 Your video found in channel:');
      console.log('  URL:', yourVideo.source_url);
      console.log('  Title:', yourVideo.title);
      console.log('  Block ID:', yourVideo.id);
      console.log('  Description:', yourVideo.description);
    } else {
      console.log('❌ Your video (dHVMujryp40) not found in channel');
      
      // Let's see all the URLs to check
      console.log('\n📋 All Link URLs in channel:');
      linkBlocks.forEach((block, i) => {
        if (block.source_url) {
          console.log(`${i + 1}. ${block.source_url}`);
          
          // Test each URL with our video detector
          const isVideo = VideoExtractor.isVideoUrl(block.source_url);
          if (isVideo) {
            console.log(`   ✅ DETECTED AS VIDEO`);
          }
          
          // Check for youtube patterns manually
          if (block.source_url.includes('youtube') || block.source_url.includes('youtu.be')) {
            console.log(`   🎬 Contains YouTube domain`);
          }
        }
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkChannelVideos().catch(console.error);