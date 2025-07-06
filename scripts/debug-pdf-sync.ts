// Debug script to investigate PDF sync issues
import { config } from 'dotenv';
import { join } from 'path';
import { arenaClient } from '../src/lib/arena';

// Load environment variables from .env.local
config({ path: join(process.cwd(), '.env.local') });

async function debugPDFSync() {
  console.log('🔍 Debugging PDF Sync Issue...\n');
  
  const channelSlug = 'r-startups-founder-mode';
  
  try {
    console.log(`📡 Fetching channel: ${channelSlug}`);
    const channel = await arenaClient.getChannel(channelSlug);
    console.log(`✅ Channel found: "${channel.title}" (${channel.length} blocks total)\n`);
    
    console.log('📋 Getting all channel contents...');
    const allBlocks = await arenaClient.getAllChannelContents(channelSlug);
    
    // Analyze block types
    const blockTypes = allBlocks.reduce((acc, block) => {
      acc[block.class] = (acc[block.class] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('📊 Block type breakdown:');
    Object.entries(blockTypes).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} blocks`);
    });
    
    // Look for Attachment blocks specifically
    const attachmentBlocks = allBlocks.filter(block => block.class === 'Attachment');
    console.log(`\n📎 Found ${attachmentBlocks.length} Attachment blocks:`);
    
    if (attachmentBlocks.length > 0) {
      for (const block of attachmentBlocks) {
        console.log(`   Block ${block.id}:`);
        console.log(`     Title: ${block.title || 'No title'}`);
        console.log(`     Description: ${block.description || 'No description'}`);
        console.log(`     Source URL: ${block.source_url || 'No source_url'}`);
        console.log(`     Created: ${block.created_at}`);
        
        // Get detailed block info
        console.log(`     Fetching detailed info...`);
        try {
          const detailedBlock = await arenaClient.getBlock(block.id);
          console.log(`     Detailed source_url: ${detailedBlock.source_url || 'No source_url'}`);
          console.log(`     Detailed source.url: ${detailedBlock.source?.url || 'No source.url'}`);
        } catch (error) {
          console.log(`     Error getting details: ${error}`);
        }
        console.log('');
      }
    } else {
      console.log('   No Attachment blocks found');
    }
    
    // Look for PDF URLs in Link blocks
    const linkBlocks = allBlocks.filter(block => block.class === 'Link');
    const pdfLinks = linkBlocks.filter(block => 
      block.source_url?.toLowerCase().includes('.pdf') || 
      block.title?.toLowerCase().includes('pdf') ||
      block.description?.toLowerCase().includes('pdf')
    );
    
    console.log(`\n🔗 Found ${pdfLinks.length} potential PDF Link blocks:`);
    if (pdfLinks.length > 0) {
      for (const block of pdfLinks) {
        console.log(`   Block ${block.id}:`);
        console.log(`     Title: ${block.title || 'No title'}`);
        console.log(`     Source URL: ${block.source_url || 'No source_url'}`);
        console.log('');
      }
    }
    
    // Test the detailed processable blocks function
    console.log('\n🔄 Testing getDetailedProcessableBlocks...');
    const { linkBlocks: detailedLinks, imageBlocks, mediaBlocks, attachmentBlocks: detailedAttachments, allBlocks: processable } = 
      await arenaClient.getDetailedProcessableBlocks(allBlocks);
    
    console.log(`📋 Processable blocks found:`);
    console.log(`   Links: ${detailedLinks.length}`);
    console.log(`   Images: ${imageBlocks.length}`);
    console.log(`   Media: ${mediaBlocks.length}`);
    console.log(`   Attachments: ${detailedAttachments.length}`);
    console.log(`   Total processable: ${processable.length}`);
    
    if (detailedAttachments.length > 0) {
      console.log(`\n📎 Detailed attachment blocks:`);
      for (const block of detailedAttachments) {
        console.log(`   Block ${block.id}:`);
        console.log(`     Title: ${block.title || 'No title'}`);
        console.log(`     Source URL: ${block.source_url || 'No source_url'}`);
        console.log(`     Has URL: ${!!(block.source_url || block.source?.url)}`);
        console.log('');
      }
    }
    
    // Check recent blocks (might be newly added)
    console.log('\n⏰ Checking most recent blocks (last 5):');
    const recentBlocks = allBlocks
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
    
    for (const block of recentBlocks) {
      console.log(`   Block ${block.id} (${block.class}):`);
      console.log(`     Title: ${block.title || 'No title'}`);
      console.log(`     Created: ${block.created_at}`);
      console.log(`     Source URL: ${block.source_url || 'No source_url'}`);
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error debugging PDF sync:', error);
  }
}

debugPDFSync().catch(console.error);