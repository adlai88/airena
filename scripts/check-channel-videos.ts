import { arenaClient } from '../src/lib/arena';
import { VideoExtractor } from '../lib/video-extraction';

async function checkChannelVideos() {
  console.log('🔍 Checking r-startups-founder-mode channel...');
  
  try {
    const channel = await arenaClient.getChannel('r-startups-founder-mode');
    console.log('Channel found:', channel.title);
    console.log('Total blocks:', channel.contents.length);
    
    // First, let's see ALL blocks and their types
    console.log('\n📋 ALL blocks in channel by type:');
    const blocksByType = channel.contents.reduce((acc, block) => {
      acc[block.class] = (acc[block.class] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(blocksByType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} blocks`);
    });
    
    // Show recent blocks (last 10) with their details
    console.log('\n🕐 Most recent blocks:');
    const recentBlocks = channel.contents.slice(-10);
    recentBlocks.forEach((block, i) => {
      console.log(`${i + 1}. [${block.class}] ${block.title || 'No title'}`);
      if (block.source_url) {
        console.log(`   URL: ${block.source_url}`);
      }
      console.log(`   ID: ${block.id}, Created: ${block.created_at}`);
      console.log('');
    });
    
    // Get detailed blocks (this fetches source_url for Link/Image blocks)
    console.log('\n🔍 Fetching detailed block information...');
    const detailedBlocks = await arenaClient.getDetailedProcessableBlocks(channel.contents);
    console.log('Detailed blocks fetched - links:', detailedBlocks.linkBlocks.length, 'images:', detailedBlocks.imageBlocks.length);
    
    // Use the detailed blocks
    const linkBlocks = detailedBlocks.linkBlocks;
    const imageBlocks = detailedBlocks.imageBlocks;
    
    console.log('Link blocks with URLs:', linkBlocks.length);
    console.log('Image blocks with URLs:', imageBlocks.length);
    
    // Check Media blocks separately (videos might be stored as Media, not Link!)
    const mediaBlocks = channel.contents.filter(block => block.class === 'Media');
    console.log('Media blocks found:', mediaBlocks.length);
    
    if (mediaBlocks.length > 0) {
      console.log('\n📺 Checking Media blocks for videos:');
      for (const block of mediaBlocks) {
        console.log(`Media Block ID: ${block.id}`);
        console.log(`Title: ${block.title || 'No title'}`);
        console.log(`Source URL: ${block.source_url || 'No source_url'}`);
        console.log(`Description: ${block.description || 'No description'}`);
        console.log(`Created: ${block.created_at}`);
        
        // Get detailed info for this Media block
        try {
          const detailedMediaBlock = await arenaClient.getBlock(block.id);
          console.log('Detailed source_url:', detailedMediaBlock.source_url);
          console.log('Detailed source:', detailedMediaBlock.source);
          
          // Check if it's a video URL
          const sourceUrl = detailedMediaBlock.source_url || detailedMediaBlock.source?.url;
          if (sourceUrl && VideoExtractor.isVideoUrl(sourceUrl)) {
            console.log('🎯 FOUND VIDEO IN MEDIA BLOCK!');
          }
        } catch (error) {
          console.log('Error getting detailed Media block:', error);
        }
        console.log('---');
      }
    }
    
    // Check for video URLs in link blocks
    const videoBlocks = linkBlocks.filter(b => b.source_url && VideoExtractor.isVideoUrl(b.source_url));
    console.log('Video URLs found in Link blocks:', videoBlocks.length);
    
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