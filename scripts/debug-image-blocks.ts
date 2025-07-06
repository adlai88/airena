#!/usr/bin/env tsx

/**
 * Debug script to examine Are.na image block structure
 * and understand the difference between uploaded vs linked images
 */

import { ArenaClient } from '../src/lib/arena';
import { config } from 'dotenv';

// Load environment variables
config();

async function debugImageBlocks() {
  const client = new ArenaClient();
  
  // Get channel from command line argument or use default
  const channelSlug = process.argv[2] || 'r-startups-founder-mode';
  
  console.log('🔍 Debugging Are.na image blocks...');
  console.log(`📋 Channel: ${channelSlug}`);
  console.log('');
  
  try {
    // Get channel with all contents
    const allBlocks = await client.getAllChannelContents(channelSlug);
    console.log(`📊 Total blocks in channel: ${allBlocks.length}`);
    
    // Find all image blocks
    const imageBlocks = allBlocks.filter(block => block.class === 'Image');
    console.log(`🖼️ Image blocks found: ${imageBlocks.length}`);
    
    if (imageBlocks.length === 0) {
      console.log('❌ No image blocks found in this channel');
      return;
    }
    
    // Analyze each image block
    for (let i = 0; i < Math.min(imageBlocks.length, 5); i++) {
      const block = imageBlocks[i];
      console.log(`\n--- Image Block ${i + 1} ---`);
      console.log(`ID: ${block.id}`);
      console.log(`Title: ${block.title || 'NULL'}`);
      console.log(`Description: ${block.description || 'NULL'}`);
      console.log(`Source URL: ${block.source_url || 'NULL'}`);
      
      // Get detailed block info
      try {
        const detailedBlock = await client.getBlock(block.id);
        console.log('\n📝 Detailed block data:');
        console.log(`Class: ${detailedBlock.class}`);
        console.log(`Source URL: ${detailedBlock.source_url || 'NULL'}`);
        console.log(`Source object:`, detailedBlock.source ? JSON.stringify(detailedBlock.source, null, 2) : 'NULL');
        
        // Check for other possible image URL fields
        const blockData = detailedBlock as any;
        console.log('\n🔍 Checking for other image URL fields:');
        console.log(`image: ${blockData.image || 'NULL'}`);
        if (blockData.image) {
          console.log('Image object details:', JSON.stringify(blockData.image, null, 2));
        }
        console.log(`image_url: ${blockData.image_url || 'NULL'}`);
        console.log(`attachment: ${blockData.attachment || 'NULL'}`);
        console.log(`file: ${blockData.file || 'NULL'}`);
        
        // Log full object structure (first 3 levels)
        console.log('\n📋 Full block structure (top-level keys):');
        Object.keys(blockData).forEach(key => {
          const value = blockData[key];
          if (typeof value === 'object' && value !== null) {
            console.log(`${key}: [object] ${JSON.stringify(value).substring(0, 100)}...`);
          } else {
            console.log(`${key}: ${value}`);
          }
        });
        
      } catch (error) {
        console.error(`❌ Failed to get detailed block info for ${block.id}:`, error);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`Total image blocks: ${imageBlocks.length}`);
    
    const blocksWithSourceUrl = imageBlocks.filter(block => block.source_url);
    console.log(`Blocks with source_url: ${blocksWithSourceUrl.length}`);
    console.log(`Blocks WITHOUT source_url: ${imageBlocks.length - blocksWithSourceUrl.length}`);
    
  } catch (error) {
    console.error('❌ Error debugging image blocks:', error);
  }
}

// Run the debug
debugImageBlocks();