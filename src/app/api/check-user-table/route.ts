import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Get column information for the user table
    const columnsQuery = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'user'
      ORDER BY ordinal_position
    `);
    
    // Also check account table columns
    const accountColumnsQuery = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'account'
      ORDER BY ordinal_position
    `);
    
    await pool.end();
    
    return NextResponse.json({
      success: true,
      userTableColumns: columnsQuery.rows,
      accountTableColumns: accountColumnsQuery.rows
    });
  } catch (error) {
    await pool.end();
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}