// Check detailed block info to find PDFs
import { config } from 'dotenv';
import { join } from 'path';
import { arenaClient } from '../src/lib/arena';

// Load environment variables from .env.local
config({ path: join(process.cwd(), '.env.local') });

async function checkDetailedBlocks() {
  console.log('🔍 Checking detailed block information for PDFs...\n');
  
  const channelSlug = 'r-startups-founder-mode';
  
  try {
    const allBlocks = await arenaClient.getAllChannelContents(channelSlug);
    const linkBlocks = allBlocks.filter(block => block.class === 'Link');
    
    console.log(`🔗 Examining ${linkBlocks.length} Link blocks for PDF content...\n`);
    
    for (const block of linkBlocks.slice(0, 5)) { // Check first 5 recent Link blocks
      console.log(`Block ${block.id}:`);
      console.log(`  Title: ${block.title || 'No title'}`);
      console.log(`  Description: ${block.description || 'No description'}`);
      console.log(`  Basic source_url: ${block.source_url || 'No source_url'}`);
      
      try {
        // Get detailed block info
        console.log(`  Fetching detailed info...`);
        const detailedBlock = await arenaClient.getBlock(block.id);
        console.log(`  Detailed source_url: ${detailedBlock.source_url || 'No source_url'}`);
        console.log(`  Detailed source.url: ${detailedBlock.source?.url || 'No source.url'}`);
        
        // Check if this could be a PDF
        const hasUrl = detailedBlock.source_url || detailedBlock.source?.url;
        if (hasUrl) {
          const url = detailedBlock.source_url || detailedBlock.source?.url;
          const isPdf = url?.toLowerCase().includes('.pdf');
          console.log(`  Is PDF URL: ${isPdf ? '✅ YES' : '❌ No'}`);
          if (isPdf) {
            console.log(`  🔥 FOUND PDF: ${url}`);
          }
        }
        
        console.log('');
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.log(`  Error getting details: ${error}`);
        console.log('');
      }
    }
    
    // Also check for any blocks that might be PDFs by content
    console.log('🔍 Checking for PDF keywords in titles/descriptions...');
    const potentialPdfs = allBlocks.filter(block => 
      block.title?.toLowerCase().includes('pdf') ||
      block.description?.toLowerCase().includes('pdf') ||
      block.title?.toLowerCase().includes('.pdf') ||
      block.description?.toLowerCase().includes('.pdf')
    );
    
    if (potentialPdfs.length > 0) {
      console.log(`Found ${potentialPdfs.length} blocks with PDF keywords:`);
      for (const block of potentialPdfs) {
        console.log(`  Block ${block.id} (${block.class}): ${block.title}`);
      }
    } else {
      console.log('No blocks found with PDF keywords.');
    }
    
  } catch (error) {
    console.error('❌ Error checking blocks:', error);
  }
}

checkDetailedBlocks().catch(console.error);