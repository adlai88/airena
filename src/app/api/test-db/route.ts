import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Test basic connection
    await pool.query('SELECT NOW()');
    
    // Check if users table exists
    const tableCheck = await pool.query(`
      SELECT 
        EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'users'
        ) as users_exists,
        EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'sessions'
        ) as sessions_exists
    `);
    
    // Check users table structure
    let columns = [];
    if (tableCheck.rows[0].users_exists) {
      const columnCheck = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `);
      columns = columnCheck.rows;
    }
    
    await pool.end();
    
    return NextResponse.json({
      success: true,
      connection: 'Database connected',
      tables: {
        users: tableCheck.rows[0].users_exists,
        sessions: tableCheck.rows[0].sessions_exists
      },
      userColumns: columns,
      env: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasBetterAuthSecret: !!process.env.BETTER_AUTH_SECRET,
        hasSupabaseServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    });
  } catch (error) {
    await pool.end();
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}