import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Check which schemas have user-related tables
    const schemaCheck = await pool.query(`
      SELECT 
        table_schema,
        table_name
      FROM information_schema.tables
      WHERE table_name IN ('users', 'user', 'sessions', 'session', 'accounts', 'account')
      ORDER BY table_schema, table_name
    `);
    
    // Check if Better Auth specific tables exist in public schema
    const betterAuthCheck = await pool.query(`
      SELECT 
        EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'user'
        ) as public_user_exists,
        EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'session'
        ) as public_session_exists,
        EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'account'
        ) as public_account_exists,
        EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'verification'
        ) as public_verification_exists
    `);
    
    await pool.end();
    
    return NextResponse.json({
      success: true,
      schemas: schemaCheck.rows,
      betterAuthTables: betterAuthCheck.rows[0],
      message: 'Run the new migration (20250725_add_better_auth_tables_v2.sql) to create Better Auth tables'
    });
  } catch (error) {
    await pool.end();
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}