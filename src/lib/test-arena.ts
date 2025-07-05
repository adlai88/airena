// Test script for Are.na integration
import { config } from 'dotenv';
import { arenaClient } from './arena';
import { contentExtractor } from './extraction';

// Load environment variables
config({ path: '.env.local' });

async function testArenaIntegration() {
  console.log('🧪 Testing Are.na integration...\n');

  // Test 1: Get channel info
  console.log('1. Testing channel fetching...');
  try {
    const channelInfo = await arenaClient.getChannelInfo('arena-influences');
    console.log('✅ Channel info retrieved:');
    console.log(`   - Title: ${channelInfo.channel.title}`);
    console.log(`   - Total blocks: ${channelInfo.totalBlocks}`);
    console.log(`   - Link blocks: ${channelInfo.linkBlocks}`);
    console.log();
  } catch (error) {
    console.log('❌ Channel fetch failed:', error);
    return false;
  }

  // Test 2: Get channel contents
  console.log('2. Testing content fetching...');
  try {
    const contents = await arenaClient.getAllChannelContents('arena-influences');
    const linkBlocks = arenaClient.filterLinkBlocks(contents);
    
    console.log('✅ Content fetching successful:');
    console.log(`   - Total blocks: ${contents.length}`);
    console.log(`   - Link blocks: ${linkBlocks.length}`);
    
    if (linkBlocks.length > 0) {
      console.log(`   - First link: ${linkBlocks[0].source_url}`);
    }
    console.log();
  } catch (error) {
    console.log('❌ Content fetch failed:', error);
    return false;
  }

  // Test 3: Content extraction (test with one URL)
  console.log('3. Testing content extraction...');
  try {
    const testUrl = 'https://example.com';
    const extractedContent = await contentExtractor.extractWebsite(testUrl);
    
    if (extractedContent && extractedContent.length > 0) {
      console.log('✅ Content extraction successful:');
      console.log(`   - Content length: ${extractedContent.length} characters`);
      console.log(`   - Preview: ${extractedContent.substring(0, 100)}...`);
    } else {
      console.log('⚠️  Content extraction returned empty result');
    }
    console.log();
  } catch (error) {
    console.log('❌ Content extraction failed:', error);
    return false;
  }

  // Test 4: Process a single block
  console.log('4. Testing block processing...');
  try {
    const contents = await arenaClient.getAllChannelContents('arena-influences');
    const linkBlocks = arenaClient.filterLinkBlocks(contents);
    
    if (linkBlocks.length > 0) {
      const firstBlock = linkBlocks[0];
      console.log(`   - Processing: ${firstBlock.source_url}`);
      
      const processedBlock = await contentExtractor.processBlock(firstBlock);
      
      if (processedBlock) {
        console.log('✅ Block processing successful:');
        console.log(`   - Title: ${processedBlock.title}`);
        console.log(`   - Block type: ${processedBlock.blockType}`);
        if (processedBlock.blockType === 'Image') {
          console.log(`   - Image processed with vision analysis`);
        } else {
          console.log(`   - Link content extracted`);
        }
      } else {
        console.log('⚠️  Block processing returned null');
      }
    } else {
      console.log('⚠️  No link blocks found to process');
    }
    console.log();
  } catch (error) {
    console.log('❌ Block processing failed:', error);
    return false;
  }

  console.log('🎉 Are.na integration test completed successfully!\n');
  return true;
}

// Run test if called directly
if (require.main === module) {
  testArenaIntegration().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { testArenaIntegration };