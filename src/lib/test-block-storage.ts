// Test block storage functionality
import { config } from 'dotenv';
import { embeddingService } from './embeddings';
import { supabase } from './supabase';

config({ path: '.env.local' });

async function testBlockStorage() {
  console.log('🧪 Testing block storage...\n');

  try {
    // Check if web-design-advanced channel exists
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('*')
      .eq('arena_id', 1262597)
      .single();

    if (channelError) {
      console.log('❌ Channel not found:', channelError.message);
      return false;
    }

    console.log('✅ Channel found:', {
      dbId: channel.id,
      arenaId: channel.arena_id,
      slug: channel.slug
    });

    // Create a test block
    const testBlock = {
      id: 999999,
      arenaId: 999999,
      title: 'Test Block for Storage',
      content: 'This is test content to verify block storage is working correctly.',
      url: 'https://example.com/test',
      blockType: 'Website' as const
    };

    console.log('2. Creating embedding for test block...');
    const embeddingChunks = await embeddingService.createBlockEmbedding(testBlock);
    console.log(`✅ Created ${embeddingChunks.length} embedding chunks`);

    if (embeddingChunks.length > 0) {
      console.log('3. Storing block in database...');
      await embeddingService.storeBlock(
        testBlock,
        channel.id, // Use database channel ID
        embeddingChunks[0].embedding
      );
      console.log('✅ Block stored successfully');

      // Verify the block was stored
      const { data: storedBlocks, error: fetchError } = await supabase
        .from('blocks')
        .select('*')
        .eq('arena_id', 999999);

      if (fetchError) {
        console.log('❌ Error checking stored block:', fetchError);
        return false;
      }

      console.log(`✅ Found ${storedBlocks.length} stored test blocks`);
      
      // Clean up test block
      await supabase.from('blocks').delete().eq('arena_id', 999999);
      console.log('✅ Cleaned up test block');

      return true;
    } else {
      console.log('❌ No embedding chunks created');
      return false;
    }

  } catch (error) {
    console.log('❌ Test failed:', error);
    return false;
  }
}

testBlockStorage().then(success => {
  console.log(success ? '\n🎉 Block storage test passed!' : '\n💥 Block storage test failed!');
  process.exit(success ? 0 : 1);
});