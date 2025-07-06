#!/usr/bin/env tsx

/**
 * Test script to verify the image block fix works
 */

import { ArenaClient } from '../src/lib/arena';
import { config } from 'dotenv';

// Load environment variables
config();

async function testImageFix() {
  const client = new ArenaClient();
  
  const channelSlug = process.argv[2] || 'obj-landscape-nature';
  
  console.log('🧪 Testing image block processing fix...');
  console.log(`📋 Channel: ${channelSlug}`);
  console.log('');
  
  try {
    // Get all blocks from the channel
    const allBlocks = await client.getAllChannelContents(channelSlug);
    console.log(`📊 Total blocks in channel: ${allBlocks.length}`);
    
    // Filter image blocks
    const imageBlocks = allBlocks.filter(block => block.class === 'Image');
    console.log(`🖼️ Image blocks found: ${imageBlocks.length}`);
    
    if (imageBlocks.length === 0) {
      console.log('❌ No image blocks found in this channel');
      return;
    }
    
    // Test the detailed image block processing
    console.log('\n🔧 Testing getDetailedImageBlocks...');
    const detailedImageBlocks = await client.getDetailedImageBlocks(imageBlocks);
    
    console.log(`✅ Detailed image blocks processed: ${detailedImageBlocks.length}/${imageBlocks.length}`);
    
    if (detailedImageBlocks.length > 0) {
      console.log('\n📋 Sample processed image blocks:');
      detailedImageBlocks.slice(0, 3).forEach((block, i) => {
        console.log(`[${i + 1}] ID: ${block.id}, URL: ${block.source_url}`);
      });
    }
    
    // Test full processable blocks
    console.log('\n🔧 Testing getDetailedProcessableBlocks...');
    const { imageBlocks: processableImages, allBlocks: allProcessable } = await client.getDetailedProcessableBlocks(allBlocks);
    
    console.log(`✅ All processable blocks: ${allProcessable.length}`);
    console.log(`✅ Processable image blocks: ${processableImages.length}`);
    
    if (processableImages.length === imageBlocks.length) {
      console.log('🎉 SUCCESS: All image blocks are now processable!');
    } else {
      console.log(`⚠️  ${imageBlocks.length - processableImages.length} image blocks still not processable`);
    }
    
  } catch (error) {
    console.error('❌ Error testing image fix:', error);
  }
}

// Run the test
testImageFix();