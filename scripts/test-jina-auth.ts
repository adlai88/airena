// Test Jina AI authentication and fallback
import { config } from 'dotenv';
import { join } from 'path';
import axios from 'axios';

// Load environment variables from .env.local
config({ path: join(process.cwd(), '.env.local') });

async function testJinaAuth() {
  console.log('🔑 Testing Jina AI Authentication...\n');
  
  const apiKey = process.env.JINA_API_KEY;
  console.log(`API Key found: ${apiKey ? '✅ Yes' : '❌ No'}`);
  console.log(`API Key length: ${apiKey?.length || 0} characters`);
  console.log(`API Key prefix: ${apiKey?.substring(0, 20) || 'Not found'}...`);
  
  const testUrl = 'https://attachments.are.na/37896811/772e3d784e167f824ef0f1df1c901206.pdf?1751780127';
  
  // Test 1: With API key (authenticated)
  console.log('\n🧪 Test 1: Authenticated request...');
  try {
    const response = await axios.get(`https://r.jina.ai/${testUrl}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
      timeout: 30000,
    });
    
    console.log(`✅ Success! Status: ${response.status}`);
    console.log(`📄 Content length: ${response.data?.length || 'No data'}`);
  } catch (error: any) {
    console.log(`❌ Failed: ${error.response?.status} - ${error.response?.statusText}`);
    console.log(`Error: ${error.response?.data?.message || error.message}`);
  }
  
  // Test 2: Without API key (fallback)
  console.log('\n🧪 Test 2: Fallback request (no auth)...');
  try {
    const response = await axios.get(`https://r.jina.ai/${testUrl}`, {
      timeout: 30000,
    });
    
    console.log(`✅ Success! Status: ${response.status}`);
    console.log(`📄 Content length: ${typeof response.data === 'string' ? response.data.length : 'No data'}`);
    if (typeof response.data === 'string') {
      console.log(`📝 Content preview: ${response.data.substring(0, 200)}...`);
    }
  } catch (error: any) {
    console.log(`❌ Failed: ${error.response?.status} - ${error.response?.statusText}`);
    console.log(`Error: ${error.response?.data?.message || error.message}`);
  }
  
  // Test 3: Direct URL access (baseline)
  console.log('\n🧪 Test 3: Direct URL access...');
  try {
    const response = await axios.get(testUrl, {
      timeout: 30000,
    });
    
    console.log(`✅ Success! Status: ${response.status}`);
    console.log(`📄 Content type: ${response.headers['content-type']}`);
    console.log(`📄 Content length: ${response.headers['content-length']} bytes`);
  } catch (error: any) {
    console.log(`❌ Failed: ${error.response?.status} - ${error.response?.statusText}`);
    console.log(`Error: ${error.message}`);
  }
}

testJinaAuth().catch(console.error);