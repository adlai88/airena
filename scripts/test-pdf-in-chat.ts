// Test if the PDF is now searchable via chat
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from .env.local
config({ path: join(process.cwd(), '.env.local') });

async function testPDFInChat() {
  console.log('💬 Testing PDF searchability in chat...\n');
  
  // Test chat query about the PDF content
  const testQuery = 'What is the AI crypto buildathon about?';
  
  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: testQuery
          }
        ]
      })
    });
    
    if (response.ok) {
      console.log('✅ Chat API responded successfully');
      const reader = response.body?.getReader();
      let fullResponse = '';
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = new TextDecoder().decode(value);
          fullResponse += chunk;
        }
      }
      
      console.log('🤖 Chat Response:');
      console.log(fullResponse);
      
      // Check if response mentions PDF content
      const mentionsPDF = fullResponse.toLowerCase().includes('buildathon') || 
                         fullResponse.toLowerCase().includes('crypto') ||
                         fullResponse.toLowerCase().includes('ai');
      
      console.log(`\n📊 Analysis:`);
      console.log(`   Mentions PDF content: ${mentionsPDF ? '✅ Yes' : '❌ No'}`);
      console.log(`   Response length: ${fullResponse.length} characters`);
      
    } else {
      console.log(`❌ Chat API failed: ${response.status} - ${response.statusText}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing chat:', error);
    console.log('\n💡 Note: Make sure the dev server is running with "npm run dev"');
  }
}

testPDFInChat().catch(console.error);