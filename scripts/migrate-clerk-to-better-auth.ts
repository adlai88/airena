/**
 * Migration script to move users from Clerk to Better Auth
 * Run this script to migrate your existing user data
 * 
 * Usage: npx tsx scripts/migrate-clerk-to-better-auth.ts
 */

import { clerkClient } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';
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

interface MigrationResult {
  success: boolean;
  userId?: string;
  email?: string;
  error?: string;
}

async function migrateUser(clerkUserId?: string): Promise<MigrationResult> {
  try {
    console.log('🚀 Starting user migration from Clerk to Better Auth...\n');
    
    // Get Clerk client
    const clerk = await clerkClient();
    
    // Get user(s) from Clerk
    let users;
    if (clerkUserId) {
      // Migrate specific user
      const user = await clerk.users.getUser(clerkUserId);
      users = [user];
    } else {
      // Migrate all users
      const userList = await clerk.users.getUserList({ limit: 100 });
      users = userList.data;
    }
    
    console.log(`Found ${users.length} user(s) to migrate\n`);
    
    const results: MigrationResult[] = [];
    
    for (const clerkUser of users) {
      const email = clerkUser.emailAddresses[0]?.emailAddress;
      if (!email) {
        results.push({
          success: false,
          error: `No email found for user ${clerkUser.id}`
        });
        continue;
      }
      
      console.log(`📧 Migrating user: ${email}`);
      
      // Check if user already exists in Better Auth
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();
      
      if (existingUser) {
        console.log(`⚠️  User ${email} already exists in Better Auth, skipping...`);
        results.push({
          success: true,
          userId: existingUser.id,
          email,
          error: 'User already exists'
        });
        continue;
      }
      
      // Extract metadata from Clerk
      const metadata = clerkUser.privateMetadata as any || {};
      
      // Generate a temporary password
      const tempPassword = crypto.randomUUID();
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      
      // Create user in Better Auth database
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email,
          email_verified: true,
          name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || null,
          image: clerkUser.imageUrl || null,
          arena_api_key: metadata.arenaApiKey || null,
          tier: metadata.subscriptionTier || 'free',
          polar_customer_id: metadata.polarCustomerId || null,
          password_hash: passwordHash,
          created_at: new Date(clerkUser.createdAt).toISOString(),
          updated_at: new Date(clerkUser.updatedAt).toISOString()
        })
        .select()
        .single();
      
      if (createError) {
        console.error(`❌ Failed to create user ${email}:`, createError);
        results.push({
          success: false,
          email,
          error: createError.message
        });
        continue;
      }
      
      console.log(`✅ Successfully migrated user: ${email}`);
      console.log(`   New user ID: ${newUser.id}`);
      console.log(`   Tier: ${newUser.tier}`);
      console.log(`   Temporary password: ${tempPassword}`);
      
      // Update channel ownership
      if (newUser) {
        const { data: channels, error: channelError } = await supabase
          .from('channels')
          .update({ new_user_id: newUser.id })
          .eq('user_id', clerkUser.id)
          .select();
        
        if (channelError) {
          console.error(`⚠️  Failed to update channels:`, channelError);
        } else if (channels && channels.length > 0) {
          console.log(`   Updated ${channels.length} channel(s)`);
        }
        
        // Update usage records
        const tables = ['channel_usage', 'monthly_usage', 'channel_limits'];
        for (const table of tables) {
          const { error: updateError } = await supabase
            .from(table)
            .update({ new_user_id: newUser.id })
            .eq('user_id', clerkUser.id);
          
          if (updateError) {
            console.error(`⚠️  Failed to update ${table}:`, updateError);
          }
        }
      }
      
      results.push({
        success: true,
        userId: newUser.id,
        email
      });
      
      console.log('\n' + '='.repeat(50) + '\n');
    }
    
    // Summary
    console.log('📊 Migration Summary:');
    console.log(`   Total users: ${results.length}`);
    console.log(`   Successful: ${results.filter(r => r.success).length}`);
    console.log(`   Failed: ${results.filter(r => !r.success).length}`);
    
    if (results.some(r => !r.success)) {
      console.log('\n❌ Failed migrations:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`   - ${r.email || 'Unknown'}: ${r.error}`);
      });
    }
    
    console.log('\n📝 Next steps:');
    console.log('1. Users will need to reset their passwords');
    console.log('2. Set NEXT_PUBLIC_USE_BETTER_AUTH=true to enable Better Auth');
    console.log('3. Test login with the migrated user(s)');
    console.log('4. Once verified, run the cleanup script to finalize migration');
    
    return results[0] || { success: true };
    
  } catch (error) {
    console.error('Migration failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Run migration
const clerkUserId = process.argv[2]; // Optional: pass specific user ID
migrateUser(clerkUserId)
  .then(result => {
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });