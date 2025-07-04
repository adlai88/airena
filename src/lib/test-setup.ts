// Test script to verify all integrations work
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: '.env.local' });

export async function testSetup() {
  console.log('🧪 Testing Airena setup...\n');
  
  // Test 1: Environment variables
  console.log('1. Testing environment variables...');
  const requiredEnvVars = [
    'ARENA_API_KEY',
    'OPENAI_API_KEY', 
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'JINA_API_KEY'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.log('❌ Missing environment variables:', missingVars);
    return false;
  }
  console.log('✅ All environment variables set\n');
  
  // Test 2: Supabase connection
  console.log('2. Testing Supabase connection...');
  try {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
    const { data, error } = await supabase.from('channels').select('count').limit(1);
    if (error) {
      console.log('❌ Supabase connection failed:', error.message);
      return false;
    }
    console.log('✅ Supabase connection successful\n');
  } catch (err) {
    console.log('❌ Supabase connection error:', err);
    return false;
  }
  
  // Test 3: Are.na API (basic test)
  console.log('3. Testing Are.na API connection...');
  try {
    const response = await fetch('https://api.are.na/v2/channels/arena-influences');
    if (!response.ok) {
      console.log('❌ Are.na API connection failed:', response.status);
      return false;
    }
    console.log('✅ Are.na API connection successful\n');
  } catch (err) {
    console.log('❌ Are.na API connection error:', err);
    return false;
  }
  
  // Test 4: OpenAI API (basic test) 
  console.log('4. Testing OpenAI API connection...');
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    });
    if (!response.ok) {
      console.log('❌ OpenAI API connection failed:', response.status);
      return false;
    }
    console.log('✅ OpenAI API connection successful\n');
  } catch (err) {
    console.log('❌ OpenAI API connection error:', err);
    return false;
  }
  
  // Test 5: Jina AI API (basic test)
  console.log('5. Testing Jina AI API connection...');
  try {
    const response = await fetch('https://r.jina.ai/https://example.com', {
      headers: {
        'Authorization': `Bearer ${process.env.JINA_API_KEY}`,
      },
    });
    if (!response.ok) {
      console.log('❌ Jina AI API connection failed:', response.status);
      return false;
    }
    console.log('✅ Jina AI API connection successful\n');
  } catch (err) {
    console.log('❌ Jina AI API connection error:', err);
    return false;
  }
  
  console.log('🎉 All tests passed! Setup is complete.\n');
  return true;
}

// Run tests if called directly
if (require.main === module) {
  testSetup().then(success => {
    process.exit(success ? 0 : 1);
  });
}