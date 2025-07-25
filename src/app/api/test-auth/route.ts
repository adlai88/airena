import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAuthMode } from '@/lib/feature-flags';
import { Pool } from 'pg';

// Test endpoint to verify Better Auth setup
export async function GET(request: NextRequest) {
  try {
    const authMode = getAuthMode();
    
    // Basic info
    const response: any = {
      authMode,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    };
    
    if (authMode === 'better-auth') {
      // Test Better Auth session
      try {
        const session = await auth.api.getSession({
          headers: request.headers
        });
        
        response.betterAuth = {
          hasSession: !!session,
          userId: session?.user?.id || null,
          userEmail: session?.user?.email || null,
          tier: session?.user?.tier || 'free'
        };
      } catch (error) {
        response.betterAuth = {
          error: error instanceof Error ? error.message : 'Unknown error',
          hasSession: false
        };
      }
      
      // Test database connection
      try {
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        
        // Check if Better Auth tables exist
        const tableCheck = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'users'
          ) as users_table_exists,
          EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'sessions'
          ) as sessions_table_exists,
          EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'accounts'
          ) as accounts_table_exists
        `);
        
        response.database = {
          connected: true,
          tables: tableCheck.rows[0]
        };
        
        // Count users if table exists
        if (tableCheck.rows[0].users_table_exists) {
          const userCount = await pool.query('SELECT COUNT(*) FROM users');
          response.database.userCount = parseInt(userCount.rows[0].count);
        }
        
        await pool.end();
      } catch (error) {
        response.database = {
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
      
      // Check environment variables
      response.envVars = {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasPolarApiKey: !!process.env.POLAR_API_KEY,
        hasBetterAuthSecret: !!process.env.BETTER_AUTH_SECRET,
        appUrl: process.env.NEXT_PUBLIC_APP_URL || 'not set'
      };
    } else {
      response.message = 'Clerk auth mode active. Set NEXT_PUBLIC_USE_BETTER_AUTH=true to test Better Auth.';
    }
    
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Test auth error:', error);
    return NextResponse.json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      authMode: getAuthMode()
    }, { status: 500 });
  }
}