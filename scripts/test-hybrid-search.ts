// Test script to debug hybrid search functionality
import { supabase } from '@/lib/supabase';
import { EmbeddingService } from '@/lib/embeddings';

async function testHybridSearch() {
  console.log('🔍 Testing Hybrid Search...\n');

  // Test queries
  const testQueries = [
    'hardware archive',
    'Overview — hardware archive',
    'overview hardware',
    'toolkitty'
  ];

  const embeddingService = new EmbeddingService();

  for (const query of testQueries) {
    console.log(`\n📝 Testing query: "${query}"`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      // Create embedding
      const queryEmbedding = await embeddingService.createEmbedding(query);

      // Test hybrid search
      const { data: hybridResults, error: hybridError } = await supabase.rpc('search_blocks_hybrid', {
        query_text: query,
        query_embedding: queryEmbedding,
        channel_filter: null, // Test across all channels
        similarity_threshold: 0.3,
        match_count: 10
      });

      if (hybridError) {
        console.log('❌ Hybrid search error:', hybridError);
        continue;
      }

      if (!hybridResults || hybridResults.length === 0) {
        console.log('⚠️  No results found');
        continue;
      }

      console.log(`✅ Found ${hybridResults.length} results:`);
      
      hybridResults.forEach((result: any, index: number) => {
        console.log(`\n${index + 1}. "${result.title}"`);
        console.log(`   Title similarity: ${result.title_similarity?.toFixed(3) || 'N/A'}`);
        console.log(`   Semantic similarity: ${result.semantic_similarity?.toFixed(3) || 'N/A'}`);
        console.log(`   Hybrid score: ${result.hybrid_score?.toFixed(3) || 'N/A'}`);
        console.log(`   URL: ${result.url}`);
      });

    } catch (error) {
      console.log('❌ Error:', error);
    }
  }

  console.log('\n🏁 Test completed!');
}

// Run if called directly
if (require.main === module) {
  testHybridSearch().catch(console.error);
}

export { testHybridSearch };