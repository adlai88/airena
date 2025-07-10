// Test sync process with the new PDFs
import { config } from 'dotenv';
import { join } from 'path';
import { SyncService } from '../src/lib/sync';

// Load environment variables from .env.local
config({ path: join(process.cwd(), '.env.local') });

async function testSyncWithPDFs() {
  console.log('🔄 Testing Sync with PDFs...\n');
  
  const syncService = new SyncService((progress) => {
    console.log(`[${progress.stage.toUpperCase()}] ${progress.message} (${progress.progress}%)`);
  });
  
  try {
    console.log('🚀 Starting sync for r-startups-founder-mode...');
    const result = await syncService.syncChannel('r-startups-founder-mode', "test_session", "127.0.0.1");
    
    console.log('\n📊 Sync Results:');
    console.log(`✅ Success: ${result.success}`);
    console.log(`📄 Total blocks: ${result.totalBlocks}`);
    console.log(`✅ Processed: ${result.processedBlocks}`);
    console.log(`⏭️  Skipped: ${result.skippedBlocks}`);
    console.log(`🗑️  Deleted: ${result.deletedBlocks}`);
    console.log(`⏱️  Duration: ${result.duration}ms`);
    
    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach(error => console.log(`   ${error}`));
    }
    
    if (result.processedBlocks > 0) {
      console.log(`\n🎉 Successfully processed ${result.processedBlocks} new blocks!`);
      console.log('This should include the PDF attachment if it worked correctly.');
    } else {
      console.log('\n⚠️  No new blocks were processed.');
      console.log('This could mean:');
      console.log('   1. All blocks were already in the database');
      console.log('   2. The PDF was filtered out during processing');
      console.log('   3. There was an issue with content extraction');
    }
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
  }
}

testSyncWithPDFs().catch(console.error);