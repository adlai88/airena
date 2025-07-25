import { NextRequest, NextResponse } from 'next/server';
import { authMinimal } from '@/lib/auth-minimal';
import { Pool } from 'pg';

export async function POST(request: NextRequest) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    const body = await request.json();
    console.log('Test auth signup request:', body);
    
    // Check auth object structure
    console.log('Auth object structure:', {
      hasApi: !!authMinimal.api,
      hasHandler: !!authMinimal.handler,
      methods: Object.keys(authMinimal),
      apiMethods: authMinimal.api ? Object.keys(authMinimal.api) : []
    });
    
    // Try to create user directly in database to test table structure
    try {
      const testQuery = await pool.query(
        `INSERT INTO public."user" (id, email, name, email_verified, created_at, updated_at) 
         VALUES (gen_random_uuid()::text, $1, $2, false, NOW(), NOW()) 
         RETURNING *`,
        [body.email, body.name]
      );
      
      console.log('Direct database insert successful:', testQuery.rows[0]);
      
      // Clean up test user
      await pool.query('DELETE FROM public."user" WHERE email = $1', [body.email]);
      
      return NextResponse.json({
        success: true,
        message: 'Database structure is correct',
        authInfo: {
          hasApi: !!authMinimal.api,
          apiMethods: authMinimal.api ? Object.keys(authMinimal.api) : [],
          methods: Object.keys(authMinimal)
        }
      });
    } catch (dbError) {
      console.error('Database test error:', dbError);
      return NextResponse.json({
        success: false,
        error: 'Database test failed',
        details: dbError instanceof Error ? dbError.message : 'Unknown error',
        authInfo: {
          hasApi: !!authMinimal.api,
          methods: Object.keys(authMinimal)
        }
      });
    }
  } catch (error) {
    console.error('Test auth signup error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  } finally {
    await pool.end();
  }
}