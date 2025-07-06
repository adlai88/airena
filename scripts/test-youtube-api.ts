// Test script for YouTube Data API v3
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from .env.local
config({ path: join(process.cwd(), '.env.local') });

async function testYouTubeAPI() {
  const API_KEY = process.env.YOUTUBE_API_KEY;
  
  if (!API_KEY) {
    console.error('❌ YOUTUBE_API_KEY not found in environment variables');
    return;
  }
  
  console.log('🔑 API Key found, testing YouTube API...');
  
  // Test with a simple video metadata request
  const testVideoId = '0lJKucu6HJc'; // Sam Altman video
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${testVideoId}&key=${API_KEY}`;
  
  try {
    console.log('📡 Making API request...');
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`❌ API request failed: ${response.status} - ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return;
    }
    
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      console.error('❌ No video data returned');
      console.log('Response:', data);
      return;
    }
    
    const video = data.items[0].snippet;
    console.log('✅ API is working! Video metadata:');
    console.log(`   Title: ${video.title}`);
    console.log(`   Channel: ${video.channelTitle}`);
    console.log(`   Description: ${video.description.substring(0, 100)}...`);
    console.log(`   Tags: ${video.tags?.slice(0, 3).join(', ') || 'None'}`);
    
    // Test captions endpoint
    console.log('\n📝 Testing captions endpoint...');
    const captionsUrl = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${testVideoId}&key=${API_KEY}`;
    const captionsResponse = await fetch(captionsUrl);
    
    if (captionsResponse.ok) {
      const captionsData = await captionsResponse.json();
      console.log(`✅ Captions endpoint accessible. Found ${captionsData.items?.length || 0} caption tracks`);
      
      if (captionsData.items?.length > 0) {
        console.log('   Available languages:', captionsData.items.map((item: any) => item.snippet.language).join(', '));
      }
    } else {
      console.log('⚠️  Captions endpoint returned:', captionsResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testYouTubeAPI().catch(console.error);