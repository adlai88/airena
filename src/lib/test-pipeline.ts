// Test script for the complete pipeline
import { config } from 'dotenv';
import { SyncService, syncService } from './sync';
import { embeddingService } from './embeddings';

// Load environment variables
config({ path: '.env.local' });

async function testFullPipeline() {
  console.log('🧪 Testing complete Airena pipeline...\n');

  // Test with a channel that likely has link blocks
  const testChannels = [
    'are-na-blog', // Are.na's own blog channel
    'reading-2023', // Common channel name
    'links', // Generic links channel
    'bookmarks', // Generic bookmarks channel
  ];

  let testChannel = '';
  
  // Find a channel with link blocks
  console.log('1. Finding a suitable test channel...');
  for (const channel of testChannels) {
    try {
      const status = await syncService.getChannelSyncStatus(channel);
      if (status.channel) {
        console.log(`✅ Found channel: ${status.channel.title} (${status.channel.length} blocks)`);
        testChannel = channel;
        break;
      }
    } catch (error) {
      console.log(`⚠️  Channel "${channel}" not found`);
    }
  }

  if (!testChannel) {
    console.log('❌ No suitable test channel found. Please provide a channel slug manually.');
    console.log('Usage: Replace "are-na-blog" in the code with your desired channel slug');
    return false;
  }

  console.log(`\n2. Testing full sync pipeline with "${testChannel}"...`);
  
  // Set up progress tracking
  const progressCallback = (progress: any) => {
    console.log(`📊 [${progress.stage.toUpperCase()}] ${progress.message} (${progress.progress}%)`);
  };

  const syncServiceWithProgress = new SyncService(progressCallback);

  try {
    const result = await syncServiceWithProgress.syncChannel(testChannel);
    
    console.log('\n📋 Sync Results:');
    console.log(`   ✅ Success: ${result.success}`);
    console.log(`   📊 Total blocks: ${result.totalBlocks}`);
    console.log(`   ✅ Processed: ${result.processedBlocks}`);
    console.log(`   ⏭️  Skipped: ${result.skippedBlocks}`);
    console.log(`   ⏱️  Duration: ${(result.duration / 1000).toFixed(2)}s`);
    
    if (result.errors.length > 0) {
      console.log(`   ⚠️  Errors: ${result.errors.length}`);
      result.errors.forEach(error => console.log(`      - ${error}`));
    }

    if (result.processedBlocks === 0) {
      console.log('\n⚠️  No blocks were processed. This might be because:');
      console.log('   - Channel has no link blocks (only images/text)');
      console.log('   - All blocks were already processed');
      console.log('   - Content extraction failed');
      return false;
    }

  } catch (error) {
    console.log(`❌ Sync failed: ${error}`);
    return false;
  }

  console.log('\n3. Testing vector search...');
  try {
    const searchResults = await embeddingService.searchSimilar(
      'artificial intelligence', 
      3, 
      0.5 // Lower threshold for testing
    );

    console.log(`✅ Vector search returned ${searchResults.length} results`);
    
    if (searchResults.length > 0) {
      console.log('   📝 Sample results:');
      searchResults.forEach((result: any, i) => {
        console.log(`      ${i + 1}. ${result.title} (similarity: ${result.similarity?.toFixed(3)})`);
      });
    } else {
      console.log('   ℹ️  No results found - try different search terms or lower threshold');
    }

  } catch (error) {
    console.log(`❌ Vector search failed: ${error}`);
    return false;
  }

  console.log('\n4. Testing channel statistics...');
  try {
    const status = await syncService.getChannelSyncStatus(testChannel);
    
    console.log('✅ Channel statistics:');
    console.log(`   📊 Total blocks: ${status.stats.totalBlocks}`);
    console.log(`   🔗 Embedded blocks: ${status.stats.embeddedBlocks}`);
    console.log(`   🕐 Last sync: ${status.lastSync || 'Never'}`);
    console.log(`   📅 Last updated: ${status.stats.lastUpdated || 'Never'}`);

  } catch (error) {
    console.log(`❌ Stats query failed: ${error}`);
    return false;
  }

  console.log('\n🎉 Full pipeline test completed successfully!');
  console.log('\n📝 Next steps:');
  console.log('   1. Try searching with different terms');
  console.log('   2. Test with your own Are.na channel');
  console.log('   3. Ready to build Phase 4 (AI Generation)');
  
  return true;
}

// Manual channel test function
export async function testSpecificChannel(channelSlug: string) {
  console.log(`🧪 Testing pipeline with channel: ${channelSlug}\n`);
  
  const progressCallback = (progress: any) => {
    console.log(`📊 [${progress.stage.toUpperCase()}] ${progress.message} (${progress.progress}%)`);
  };

  const syncServiceWithProgress = new SyncService(progressCallback);

  const result = await syncServiceWithProgress.syncChannel(channelSlug);
  
  console.log('\n📋 Results:', result);
  return result;
}

// Run test if called directly
if (require.main === module) {
  testFullPipeline().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { testFullPipeline };