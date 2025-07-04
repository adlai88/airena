// Debug script to see what's actually in a channel
import { config } from 'dotenv';
import { arenaClient } from './arena';

// Load environment variables
config({ path: '.env.local' });

async function debugChannel(channelSlug: string) {
  console.log(`🔍 Debugging channel: ${channelSlug}\n`);

  try {
    const channel = await arenaClient.getChannel(channelSlug);
    console.log(`📊 Channel: ${channel.title}`);
    console.log(`📊 Total blocks: ${channel.length}\n`);

    const contents = await arenaClient.getAllChannelContents(channelSlug);
    
    console.log('🧱 Block breakdown:');
    const blockTypes: Record<string, number> = {};
    const blockDetails: Array<{type: string, title: string, url: string | null}> = [];

    contents.forEach(block => {
      blockTypes[block.class] = (blockTypes[block.class] || 0) + 1;
      blockDetails.push({
        type: block.class,
        title: block.title || block.description || 'Untitled',
        url: block.source_url
      });
    });

    // Show breakdown
    Object.entries(blockTypes).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });

    console.log('\n📝 Block details:');
    blockDetails.slice(0, 10).forEach((block, i) => {
      console.log(`   ${i + 1}. [${block.type}] ${block.title}`);
      if (block.url) {
        console.log(`      URL: ${block.url}`);
      }
    });

    if (blockDetails.length > 10) {
      console.log(`   ... and ${blockDetails.length - 10} more blocks`);
    }

    // Check specifically for Link blocks and get detailed info
    const linkBlocks = contents.filter(block => block.class === 'Link');
    console.log(`\n🔗 Link blocks: ${linkBlocks.length}`);
    
    if (linkBlocks.length > 0) {
      console.log('\n🔍 Getting detailed block info...');
      const detailedBlocks = await arenaClient.getDetailedLinkBlocks(linkBlocks.slice(0, 3));
      
      detailedBlocks.forEach((block, i) => {
        console.log(`   ${i + 1}. ${block.title || 'Untitled'}`);
        console.log(`      source_url: ${block.source_url}`);
        console.log(`      source.url: ${block.source?.url}`);
        console.log(`      Has content: ${!!block.content}`);
      });
    }

    // Check for any blocks with source_url
    const blocksWithUrls = contents.filter(block => block.source_url);
    console.log(`\n🌐 Blocks with URLs: ${blocksWithUrls.length}`);
    
    if (blocksWithUrls.length > 0) {
      blocksWithUrls.slice(0, 5).forEach((block, i) => {
        console.log(`   ${i + 1}. [${block.class}] ${block.title || 'Untitled'}`);
        console.log(`      URL: ${block.source_url}`);
      });
    }

  } catch (error) {
    console.log(`❌ Debug failed: ${error}`);
  }
}

// Get channel from command line or use default
const channelSlug = process.argv[2] || 'r-startups-founder-mode';

debugChannel(channelSlug);