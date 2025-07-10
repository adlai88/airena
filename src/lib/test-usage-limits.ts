// Test script to validate usage limit enforcement
import { config } from 'dotenv';
import { UsageTracker } from './usage-tracking';
import { supabase } from './supabase';

// Load environment variables
config({ path: '.env.local' });

async function testUsageLimits() {
  console.log('🧪 Testing usage limit enforcement...\n');

  // const testChannelId = 12345; // Use a test database channel ID (unused)
  const sessionId = 'test_limits_' + Date.now();
  const ipAddress = '127.0.0.1';

  try {
    // First, create a test channel record in the database so we can test usage tracking
    console.log('1. Creating test channel record...');
    const { data: insertedChannel, error: insertError } = await supabase
      .from('channels')
      .insert({
        arena_id: 99999999, // Fake Arena ID
        title: 'Test Channel for Usage Limits',
        slug: 'test-usage-limits',
        username: 'test-user',
        user_id: null,
      })
      .select('id')
      .single();

    let dbChannelId: number;

    if (insertError) {
      console.log('⚠️ Could not create test channel (might already exist):', insertError.message);
      // Try to get existing record
      const { data: existingChannel } = await supabase
        .from('channels')
        .select('id')
        .eq('arena_id', 99999999)
        .single();
      
      if (!existingChannel) {
        console.log('❌ Cannot proceed without test channel');
        return false;
      }
      console.log('✅ Using existing test channel ID:', existingChannel.id);
      dbChannelId = existingChannel.id as number;
    } else {
      console.log('✅ Created test channel ID:', insertedChannel.id);
      dbChannelId = insertedChannel.id as number;
    }

    // Test 1: First-time processing (should allow)
    console.log('\n2. Testing first-time processing (10 blocks)...');
    const firstCheck = await UsageTracker.checkUsageLimit(
      dbChannelId,
      sessionId,
      ipAddress,
      undefined,
      10
    );
    console.log('Result:', {
      canProcess: firstCheck.canProcess,
      blocksProcessed: firstCheck.blocksProcessed,
      blocksRemaining: firstCheck.blocksRemaining,
      isFirstTime: firstCheck.isFirstTime,
      message: firstCheck.message
    });

    if (!firstCheck.canProcess) {
      console.log('❌ First-time check should allow processing');
      return false;
    }

    // Record some usage
    console.log('\n3. Recording usage (10 blocks processed)...');
    await UsageTracker.recordUsage(dbChannelId, 10, sessionId, ipAddress);
    console.log('✅ Usage recorded successfully');

    // Test 2: Processing more blocks (should still allow)
    console.log('\n4. Testing second processing (30 more blocks)...');
    const secondCheck = await UsageTracker.checkUsageLimit(
      dbChannelId,
      sessionId,
      ipAddress,
      undefined,
      30
    );
    console.log('Result:', {
      canProcess: secondCheck.canProcess,
      blocksProcessed: secondCheck.blocksProcessed,
      blocksRemaining: secondCheck.blocksRemaining,
      blocksToProcess: secondCheck.blocksToProcess,
      message: secondCheck.message
    });

    if (!secondCheck.canProcess) {
      console.log('❌ Second check should allow processing remaining blocks');
      return false;
    }

    // Record more usage (bringing total to 40)
    console.log('\n5. Recording more usage (30 blocks processed)...');
    await UsageTracker.recordUsage(dbChannelId, 30, sessionId, ipAddress);
    console.log('✅ More usage recorded successfully');

    // Test 3: Try to process beyond limit (should limit or deny)
    console.log('\n6. Testing over-limit processing (20 more blocks, but only 10 remaining)...');
    const overLimitCheck = await UsageTracker.checkUsageLimit(
      dbChannelId,
      sessionId,
      ipAddress,
      undefined,
      20 // Want 20 blocks but only 10 remaining
    );
    console.log('Result:', {
      canProcess: overLimitCheck.canProcess,
      blocksProcessed: overLimitCheck.blocksProcessed,
      blocksRemaining: overLimitCheck.blocksRemaining,
      blocksToProcess: overLimitCheck.blocksToProcess,
      message: overLimitCheck.message
    });

    if (overLimitCheck.canProcess && overLimitCheck.blocksToProcess !== 10) {
      console.log('❌ Over-limit check should limit blocks to remaining count');
      return false;
    }

    // Test 4: Try to process when at limit
    console.log('\n7. Recording remaining usage (10 blocks, hitting limit)...');
    await UsageTracker.recordUsage(dbChannelId, 10, sessionId, ipAddress);

    console.log('\n8. Testing at-limit processing (should deny)...');
    const atLimitCheck = await UsageTracker.checkUsageLimit(
      dbChannelId,
      sessionId,
      ipAddress,
      undefined,
      5 // Want 5 more blocks but at limit
    );
    console.log('Result:', {
      canProcess: atLimitCheck.canProcess,
      blocksProcessed: atLimitCheck.blocksProcessed,
      blocksRemaining: atLimitCheck.blocksRemaining,
      message: atLimitCheck.message
    });

    if (atLimitCheck.canProcess) {
      console.log('❌ At-limit check should deny processing');
      return false;
    }

    // Clean up test data
    console.log('\n9. Cleaning up test data...');
    await supabase.from('channel_usage').delete().eq('channel_id', dbChannelId);
    await supabase.from('channels').delete().eq('id', dbChannelId);
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 Usage limit enforcement test completed successfully!');
    console.log('✅ All usage limits are working correctly');
    
    return true;

  } catch (error) {
    console.log(`❌ Usage limit test failed: ${error}`);
    return false;
  }
}

// Run test
testUsageLimits().then(success => {
  process.exit(success ? 0 : 1);
});

export { testUsageLimits };