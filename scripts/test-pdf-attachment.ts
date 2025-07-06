// Test PDF processing for the specific attachment block
import { config } from 'dotenv';
import { join } from 'path';
import { ContentExtractor } from '../src/lib/extraction';

// Load environment variables from .env.local
config({ path: join(process.cwd(), '.env.local') });

async function testPDFAttachment() {
  console.log('🧪 Testing PDF Attachment Processing...\n');
  
  const extractor = new ContentExtractor();
  
  // Test the PDF URL from the attachment block
  const pdfUrl = 'https://attachments.are.na/37896811/772e3d784e167f824ef0f1df1c901206.pdf?1751780127';
  
  console.log(`📄 Testing PDF: ${pdfUrl}`);
  console.log('=' .repeat(80));
  
  try {
    const startTime = Date.now();
    const content = await extractor.extractWebsite(pdfUrl);
    const duration = Date.now() - startTime;
    
    if (content && content.length > 0) {
      console.log(`✅ Success! Extracted ${content.length} characters in ${duration}ms`);
      console.log(`📝 Content preview (first 500 chars):\n${content.substring(0, 500)}...\n`);
      
      // Test if it looks like meaningful PDF content
      const hasStructure = content.includes('abstract') || 
                          content.includes('introduction') || 
                          content.includes('conclusion') ||
                          content.includes('methodology') ||
                          content.toLowerCase().includes('pdf') ||
                          content.length > 1000;
      
      console.log(`🔍 Content analysis:`);
      console.log(`   - Has document structure: ${hasStructure ? '✅' : '❌'}`);
      console.log(`   - Length suitable for embedding: ${content.length > 100 ? '✅' : '❌'}`);
      console.log(`   - Contains readable text: ${content.length > 500 ? '✅' : '❌'}`);
      
      // Test creating a mock attachment block to process
      const mockBlock = {
        id: 37897999,
        title: "772e3d784e167f824ef0f1df1c901206.pdf?1751780127",
        description: null,
        content: null,
        source_url: pdfUrl,
        source: { url: pdfUrl },
        class: 'Attachment' as const,
        created_at: '2025-07-06T07:09:44.715Z',
        updated_at: '2025-07-06T07:09:44.715Z',
        user: { id: 1, username: 'test', full_name: 'Test User' }
      };
      
      console.log(`\n🧪 Testing processAttachmentBlock...`);
      const processedBlock = await extractor.processAttachmentBlock(mockBlock);
      
      if (processedBlock) {
        console.log(`✅ Processing successful!`);
        console.log(`   Title: ${processedBlock.title}`);
        console.log(`   Block Type: ${processedBlock.blockType}`);
        console.log(`   Content Length: ${processedBlock.content.length}`);
        console.log(`   URL: ${processedBlock.url}`);
      } else {
        console.log(`❌ Processing failed - block was filtered out`);
      }
      
    } else {
      console.log('❌ No content extracted');
    }
    
  } catch (error) {
    console.error(`❌ Error processing PDF:`, error);
  }
}

testPDFAttachment().catch(console.error);