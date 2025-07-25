/**
 * Cleanup script to run after successful migration from Clerk to Better Auth
 * This finalizes the migration by updating column names and removing temporary columns
 * 
 * ⚠️  WARNING: Only run this after verifying the migration was successful!
 * 
 * Usage: npx tsx scripts/cleanup-after-migration.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize Supabase client with service role
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false
    }
  }
);

async function cleanupMigration() {
  console.log('🧹 Starting post-migration cleanup...\n');
  
  try {
    // Step 1: Update channels table
    console.log('📁 Updating channels table...');
    
    // Copy new_user_id to user_id where new_user_id is not null
    const { error: channelUpdateError } = await supabase.rpc('execute_sql', {
      sql: `
        UPDATE channels 
        SET user_id = new_user_id 
        WHERE new_user_id IS NOT NULL;
      `
    });
    
    if (channelUpdateError) {
      console.error('Failed to update channels:', channelUpdateError);
      throw channelUpdateError;
    }
    
    console.log('✅ Updated user_id in channels table');
    
    // Step 2: Update usage tables
    const usageTables = ['channel_usage', 'monthly_usage', 'channel_limits'];
    
    for (const table of usageTables) {
      console.log(`📊 Updating ${table} table...`);
      
      const { error } = await supabase.rpc('execute_sql', {
        sql: `
          UPDATE ${table} 
          SET user_id = new_user_id 
          WHERE new_user_id IS NOT NULL;
        `
      });
      
      if (error) {
        console.error(`Failed to update ${table}:`, error);
        throw error;
      }
      
      console.log(`✅ Updated user_id in ${table} table`);
    }
    
    // Step 3: Drop temporary columns (OPTIONAL - uncomment when ready)
    console.log('\n⚠️  Temporary columns are still present for safety.');
    console.log('To remove them, uncomment the drop column section in the script.');
    
    /*
    // UNCOMMENT THIS SECTION WHEN READY TO FULLY COMMIT
    console.log('\n🗑️  Dropping temporary columns...');
    
    const dropCommands = [
      'ALTER TABLE channels DROP COLUMN IF EXISTS new_user_id;',
      'ALTER TABLE channel_usage DROP COLUMN IF EXISTS new_user_id;',
      'ALTER TABLE monthly_usage DROP COLUMN IF EXISTS new_user_id;',
      'ALTER TABLE channel_limits DROP COLUMN IF EXISTS new_user_id;'
    ];
    
    for (const sql of dropCommands) {
      const { error } = await supabase.rpc('execute_sql', { sql });
      if (error) {
        console.error('Failed to drop column:', error);
        throw error;
      }
    }
    
    console.log('✅ Dropped all temporary columns');
    */
    
    // Step 4: Verify data integrity
    console.log('\n🔍 Verifying data integrity...');
    
    // Check for orphaned records
    const { data: orphanedChannels } = await supabase
      .from('channels')
      .select('id, slug')
      .is('user_id', null);
    
    if (orphanedChannels && orphanedChannels.length > 0) {
      console.warn(`⚠️  Found ${orphanedChannels.length} orphaned channels without user_id`);
      console.log('   These channels:', orphanedChannels.map(c => c.slug).join(', '));
    } else {
      console.log('✅ No orphaned channels found');
    }
    
    // Summary
    console.log('\n✨ Cleanup complete!');
    console.log('\nNext steps:');
    console.log('1. Remove Clerk dependencies from package.json');
    console.log('2. Delete Clerk-related files and components');
    console.log('3. Remove Clerk environment variables');
    console.log('4. Update documentation');
    
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error);
    console.log('\nPlease fix the error and try again.');
    process.exit(1);
  }
}

// Add confirmation prompt
console.log('⚠️  WARNING: This script will modify your database!');
console.log('Only run this after verifying the Better Auth migration was successful.\n');

const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

readline.question('Are you sure you want to proceed? (yes/no): ', (answer: string) => {
  if (answer.toLowerCase() === 'yes') {
    readline.close();
    cleanupMigration()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    console.log('Cleanup cancelled.');
    readline.close();
    process.exit(0);
  }
});