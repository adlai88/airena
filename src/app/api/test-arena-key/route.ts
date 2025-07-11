import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    // Test the API key by making a request to Are.na
    try {
      // Try to get user info to test the key
      const response = await fetch('https://api.are.na/v2/me', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          return NextResponse.json(
            { error: 'Invalid API key' },
            { status: 400 }
          );
        }
        throw new Error(`API request failed: ${response.status}`);
      }

      const userData = await response.json();
      
      return NextResponse.json({
        valid: true,
        username: userData.username || userData.slug || 'Unknown user'
      });

    } catch (apiError) {
      console.error('Are.na API error:', apiError);
      return NextResponse.json(
        { error: 'Failed to validate API key with Are.na' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error testing API key:', error);
    return NextResponse.json(
      { error: 'Failed to test API key' },
      { status: 500 }
    );
  }
}