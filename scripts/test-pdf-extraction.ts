// Test script for PDF content extraction
import { config } from 'dotenv';
import { join } from 'path';
import { ContentExtractor } from '../src/lib/extraction';

// Load environment variables from .env.local
config({ path: join(process.cwd(), '.env.local') });

async function testPDFExtraction() {
  console.log('🧪 Testing PDF Content Extraction...\n');
  
  const extractor = new ContentExtractor();
  
  // Test URLs
  const testUrls = [
    'https://dspace.mit.edu/bitstream/handle/1721.1/82272/861188744-MIT.pdf?sequence=2&isAllowed=y',
    'https://arxiv.org/pdf/2301.00001.pdf' // Example arXiv paper
  ];
  
  for (const url of testUrls) {
    console.log(`\n📄 Testing PDF: ${url}`);
    console.log('=' .repeat(80));
    
    try {
      const startTime = Date.now();
      const content = await extractor.extractWebsite(url);
      const duration = Date.now() - startTime;
      
      if (content && content.length > 0) {
        console.log(`✅ Success! Extracted ${content.length} characters in ${duration}ms`);
        console.log(`📝 Content preview (first 500 chars):\n${content.substring(0, 500)}...\n`);
        
        // Test if it looks like meaningful PDF content
        const hasStructure = content.includes('abstract') || 
                            content.includes('introduction') || 
                            content.includes('conclusion') ||
                            content.includes('methodology') ||
                            content.toLowerCase().includes('pdf');
        
        console.log(`🔍 Content analysis:`);
        console.log(`   - Has academic structure: ${hasStructure ? '✅' : '❌'}`);
        console.log(`   - Length suitable for embedding: ${content.length > 100 ? '✅' : '❌'}`);
        console.log(`   - Contains readable text: ${content.length > 500 ? '✅' : '❌'}`);
        
      } else {
        console.log('❌ No content extracted');
      }
      
    } catch (error) {
      console.error(`❌ Error extracting PDF:`, error);
    }
  }
}

testPDFExtraction().catch(console.error);