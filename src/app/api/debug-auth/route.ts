import { NextResponse } from 'next/server';
import { authMinimal } from '@/lib/auth-minimal';
import { toNextJsHandler } from "better-auth/next-js";

export async function GET() {
  try {
    // Get the handler
    const handler = toNextJsHandler(authMinimal);
    
    // Check what routes Better Auth exposes
    console.log('Handler object:', {
      hasGET: !!handler.GET,
      hasPOST: !!handler.POST,
      handlerKeys: Object.keys(handler),
    });
    
    // Check auth configuration
    const authConfig = {
      hasEmailPassword: !!authMinimal.options?.emailAndPassword?.enabled,
      emailPasswordConfig: authMinimal.options?.emailAndPassword,
      hasDatabase: !!authMinimal.options?.database,
      baseURL: authMinimal.options?.baseURL,
    };
    
    return NextResponse.json({
      success: true,
      handler: {
        hasGET: !!handler.GET,
        hasPOST: !!handler.POST,
        methods: Object.keys(handler),
      },
      authConfig,
      authMethods: Object.keys(authMinimal),
      message: 'Check console logs for more details'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}