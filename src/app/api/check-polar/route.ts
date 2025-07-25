import { NextResponse } from 'next/server';
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
    let customersList: Array<{
      id: string;
      email?: string;
      name?: string;
      createdAt?: string;
      metadata?: unknown;
    }> = [];
    try {
      // The Polar SDK list method returns an async iterator
      // We'll collect up to 5 customers
      const customersIterator = await polarClient.customers.list({
        organizationId: process.env.POLAR_ORGANIZATION_ID!,
        limit: 5
      });
      
      // Iterate through the results
      for await (const customerData of customersIterator) {
        // Each iteration gives us a page of results
        if (customerData && 'items' in customerData && Array.isArray(customerData.items)) {
          customersList = customerData.items.map((c) => ({
            id: c.id,
            email: c.email,
            name: c.name,
            createdAt: c.createdAt,
            metadata: c.metadata
          }));
          break; // Just get the first page
        }
      }
    } catch (customerError) {
      console.error('Error fetching customers:', customerError);
      // Continue without customers data
    }
    
    return NextResponse.json({
      success: true,
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug
      },
      customers: customersList
    });
  } catch (error) {
    console.error('Polar check error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}