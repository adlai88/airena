#!/usr/bin/env tsx

/**
 * Test script to sync the landscape channel to populate image data
 */

import { SyncService } from '../src/lib/sync';
import { config } from 'dotenv';

// Load environment variables
config();

async function testSyncLandscape() {
  console.log('🚀 Testing sync for landscape channel...');
  
  const syncService = new SyncService((progress) => {
    console.log(`[${progress.stage.toUpperCase()}] ${progress.message} (${progress.progress}%)`);
  });

  try {
    const result = await syncService.syncChannel('obj-landscape-nature', 'test_session', '127.0.0.1');
    
    console.log('\n📊 Sync Results:');
    console.log(`✅ Success: ${result.success}`);
    console.log(`📁 Channel ID: ${result.channelId}`);
    console.log(`📦 Total blocks: ${result.totalBlocks}`);
    console.log(`✅ Processed: ${result.processedBlocks}`);
    console.log(`⏭️  Skipped: ${result.skippedBlocks}`);
    console.log(`🗑️  Deleted: ${result.deletedBlocks}`);
    console.log(`⏱️  Duration: ${result.duration}ms`);
    
    if (result.errors.length > 0) {
      console.log(`❌ Errors: ${result.errors.length}`);
      result.errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
  }
}

// Run the test
testSyncLandscape();