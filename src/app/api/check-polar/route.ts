import { NextRequest, NextResponse } from 'next/server';
import { Polar } from '@polar-sh/sdk';

export async function GET() {
  try {
    const polarClient = new Polar({
      accessToken: process.env.POLAR_API_KEY!,
      server: 'production'
    });
    
    // Test the connection by fetching organization
    const org = await polarClient.organizations.get({
      id: process.env.POLAR_ORGANIZATION_ID!
    });
    
    // Try to list recent customers
    const customers = await polarClient.customers.list({
      organizationId: process.env.POLAR_ORGANIZATION_ID!,
      limit: 5
    });
    
    return NextResponse.json({
      success: true,
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug
      },
      customers: customers.items?.map(c => ({
        id: c.id,
        email: c.email,
        name: c.name,
        createdAt: c.createdAt,
        metadata: c.metadata
      }))
    });
  } catch (error) {
    console.error('Polar check error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}