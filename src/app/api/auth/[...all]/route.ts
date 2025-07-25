import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest } from "next/server";

// Add debugging
console.log('Auth endpoint loaded');
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('BETTER_AUTH_SECRET exists:', !!process.env.BETTER_AUTH_SECRET);

// Create handlers with error logging
const handlers = toNextJsHandler(auth);

export async function GET(request: NextRequest) {
  try {
    return await handlers.GET(request);
  } catch (error) {
    console.error('Auth GET error:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await handlers.POST(request);
    return result;
  } catch (error) {
    console.error('Auth POST error:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
}