import { CustomerPortal } from "@polar-sh/nextjs";
import { auth } from '@clerk/nextjs/server';

// Create customer portal route using Polar.sh Next.js SDK
export const GET = CustomerPortal({
  accessToken: process.env.POLAR_API_KEY!,
  getCustomerId: async () => {
    try {
      // Get the authenticated user
      const { userId } = await auth();
      
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Get user email from Clerk to find their Polar customer ID
      const { clerkClient } = await import('@clerk/nextjs/server');
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      
      if (!user.emailAddresses?.[0]?.emailAddress) {
        throw new Error('User email not found');
      }

      const userEmail = user.emailAddresses[0].emailAddress;

      // Search for customer by email in Polar
      const customersResponse = await fetch(
        `https://api.polar.sh/v1/customers/?email=${encodeURIComponent(userEmail)}&organization_id=${process.env.POLAR_ORGANIZATION_ID}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.POLAR_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!customersResponse.ok) {
        const errorText = await customersResponse.text();
        throw new Error(`Failed to fetch customer: ${customersResponse.status} - ${errorText}`);
      }

      const customersData = await customersResponse.json();
      
      if (!customersData.items || customersData.items.length === 0) {
        throw new Error('Customer not found in Polar');
      }

      // Return the first customer ID found
      return customersData.items[0].id;
      
    } catch (error) {
      console.error('Error getting customer ID for portal:', error);
      throw error;
    }
  },
  server: 'production' // Use 'sandbox' for testing
});