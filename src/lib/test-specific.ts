// Test script for a specific channel
import { config } from 'dotenv';
import { syncService, SyncProgress } from './sync';
import { embeddingService } from './embeddings';

// Load environment variables
config({ path: '.env.local' });

async function testSpecificChannel(channelSlug: string) {
  console.log(`🧪 Testing pipeline with channel: ${channelSlug}\n`);

  // Progress tracking
  const progressCallback = (progress: SyncProgress) => {
    console.log(`📊 [${progress.stage.toUpperCase()}] ${progress.message} (${progress.progress}%)`);
    if (progress.errors && progress.errors.length > 0) {
      progress.errors.forEach(error => console.log(`   ⚠️  ${error}`));
    }
  };

  // Create sync service with progress tracking
  const { SyncService } = require('./sync');
  const syncServiceWithProgress = new SyncService(progressCallback);

  try {
    console.log('1. Getting channel status...');
    const status = await syncService.getChannelSyncStatus(channelSlug);
    if (status.channel) {
      console.log(`✅ Channel: ${status.channel.title}`);
      console.log(`   📊 Total blocks: ${status.channel.length}`);
      console.log(`   🕐 Last sync: ${status.lastSync || 'Never'}`);
    }

    console.log('\n2. Starting sync...');
    const result = await syncServiceWithProgress.syncChannel(channelSlug);
    
    console.log('\n📋 Sync Results:');
    console.log(`   ✅ Success: ${result.success}`);
    console.log(`   📊 Total blocks: ${result.totalBlocks}`);
    console.log(`   ✅ Processed: ${result.processedBlocks}`);
    console.log(`   ⏭️  Skipped: ${result.skippedBlocks}`);
    console.log(`   ⏱️  Duration: ${(result.duration / 1000).toFixed(2)}s`);
    
    if (result.errors.length > 0) {
      console.log(`   ⚠️  Errors (${result.errors.length}):`);
      result.errors.slice(0, 3).forEach((error: any) => console.log(`      - ${error}`));
      if (result.errors.length > 3) {
        console.log(`      ... and ${result.errors.length - 3} more`);
      }
    }

    if (result.processedBlocks > 0) {
      console.log('\n3. Testing vector search...');
      const searchQueries = [
        'startup advice',
        'founder mode',
        'business strategy',
        'entrepreneurship'
      ];

      for (const query of searchQueries) {
        try {
          const searchResults = await embeddingService.searchSimilar(query, 2, 0.6);
          console.log(`\n🔍 Search: "${query}"`);
          console.log(`   Found ${searchResults.length} results`);
          
          searchResults.forEach((result: any, i) => {
            console.log(`   ${i + 1}. ${result.title} (${(result.similarity * 100).toFixed(1)}% match)`);
            console.log(`      URL: ${result.url}`);
          });
        } catch (searchError) {
          console.log(`❌ Search for "${query}" failed: ${searchError}`);
        }
      }

      console.log('\n4. Final statistics...');
      const finalStatus = await syncService.getChannelSyncStatus(channelSlug);
      console.log(`✅ Embedded blocks: ${finalStatus.stats.embeddedBlocks}/${finalStatus.stats.totalBlocks}`);
      console.log(`📅 Last updated: ${finalStatus.stats.lastUpdated}`);

      console.log('\n🎉 Pipeline test completed successfully!');
      console.log('✅ Ready to build Phase 4 (AI Generation)');
      return true;
    } else {
      console.log('\n⚠️  No blocks were processed successfully.');
      console.log('   This might indicate an issue with content extraction or API limits.');
      return false;
    }

  } catch (error) {
    console.log(`❌ Test failed: ${error}`);
    return false;
  }
}

// Default to the startup channel, but allow override
const channelSlug = process.argv[2] || 'r-startups-founder-mode';

// Run test
testSpecificChannel(channelSlug).then(success => {
  process.exit(success ? 0 : 1);
});

export { testSpecificChannel };