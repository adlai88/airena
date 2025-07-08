// Debug script to check actual block titles in database
import { supabase } from '@/lib/supabase';

async function debugTitles() {
  console.log('🔍 Checking block titles in database...\n');

  try {
    // Get all block titles that contain "hardware" or "archive"
    const { data: blocks, error } = await supabase
      .from('blocks')
      .select('id, arena_id, title, url, block_type, channel_id')
      .or('title.ilike.%hardware%, title.ilike.%archive%, title.ilike.%overview%')
      .order('title');

    if (error) {
      console.log('❌ Database error:', error);
      return;
    }

    if (!blocks || blocks.length === 0) {
      console.log('⚠️  No blocks found with hardware/archive/overview in title');
      return;
    }

    console.log(`✅ Found ${blocks.length} blocks with relevant titles:\n`);
    
    blocks.forEach((block, index) => {
      console.log(`${index + 1}. Title: "${block.title}"`);
      console.log(`   ID: ${block.id} | Arena ID: ${block.arena_id}`);
      console.log(`   Type: ${block.block_type} | Channel: ${block.channel_id}`);
      console.log(`   URL: ${block.url}`);
      console.log('   ─────────────────────────────────────────');
    });

    // Also test the LIKE logic directly
    console.log('\n🧪 Testing LIKE logic:');
    const testQuery = 'hardware archive';
    console.log(`Query: "${testQuery}"`);
    
    blocks.forEach(block => {
      const titleLower = block.title.toLowerCase();
      const queryLower = testQuery.toLowerCase();
      
      const titleContainsQuery = titleLower.includes(queryLower);
      const queryContainsTitle = queryLower.includes(titleLower);
      
      console.log(`\n"${block.title}"`);
      console.log(`  Title contains query: ${titleContainsQuery}`);
      console.log(`  Query contains title: ${queryContainsTitle}`);
      
      if (titleContainsQuery || queryContainsTitle) {
        console.log(`  ✅ Should match!`);
      }
    });

  } catch (error) {
    console.log('❌ Error:', error);
  }
}

// Run if called directly
if (require.main === module) {
  debugTitles().catch(console.error);
}

export { debugTitles };