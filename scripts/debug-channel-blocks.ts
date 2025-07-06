#!/usr/bin/env tsx

/**
 * Debug script to examine block types in Are.na channel
 */

import { ArenaClient } from '../src/lib/arena';
import { config } from 'dotenv';

// Load environment variables
config();

async function debugChannelBlocks() {
  const client = new ArenaClient();
  
  // Get channel from command line argument or use default
  const channelSlug = process.argv[2] || 'r-startups-founder-mode';
  
  console.log('🔍 Debugging Are.na channel blocks...');
  console.log(`📋 Channel: ${channelSlug}`);
  console.log('');
  
  try {
    // Get channel with all contents
    const channel = await client.getChannel(channelSlug);
    console.log(`📊 Total blocks in channel: ${channel.contents.length}`);
    
    // Count block types
    const blockTypeCount: Record<string, number> = {};
    channel.contents.forEach(block => {
      blockTypeCount[block.class] = (blockTypeCount[block.class] || 0) + 1;
    });
    
    console.log('\n📊 Block type distribution:');
    Object.entries(blockTypeCount).forEach(([type, count]) => {
      console.log(`${type}: ${count}`);
    });
    
    // Show first few blocks of each type
    const blockTypes = Object.keys(blockTypeCount);
    for (const blockType of blockTypes) {
      const blocksOfType = channel.contents.filter(block => block.class === blockType);
      console.log(`\n--- ${blockType} blocks (showing first 2) ---`);
      
      for (let i = 0; i < Math.min(blocksOfType.length, 2); i++) {
        const block = blocksOfType[i];
        console.log(`${i + 1}. ID: ${block.id}, Title: ${block.title || 'NULL'}, Source: ${block.source_url ? 'HAS URL' : 'NO URL'}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error debugging channel blocks:', error);
  }
}

// Run the debug
debugChannelBlocks();