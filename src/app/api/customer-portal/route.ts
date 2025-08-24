import { CustomerPortal } from "@polar-sh/nextjs";
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

// Create customer portal route using Polar.sh Next.js SDK
export const GET = CustomerPortal({
  accessToken: process.env.POLAR_API_KEY!,
  getCustomerId: async () => {
    try {
      // Get the authenticated user
      const session = await auth.api.getSession({
        headers: await headers(),
      });
      
      if (!session?.user) {
        throw new Error('User not authenticated');
      }

      // Get user email from session
      const userEmail = session.user.email;
      
      if (!userEmail) {
        throw new Error('User email not found');
      }

      // Search for customer by email in Polar
      const apiUrl = process.env.NODE_ENV === 'development' 
        ? 'https://sandbox-api.polar.sh/v1/customers/' 
        : 'https://api.polar.sh/v1/customers/';
        
      const customersResponse = await fetch(
        `${apiUrl}?email=${encodeURIComponent(userEmail)}&organization_id=${process.env.POLAR_ORGANIZATION_ID}`,
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
  server: process.env.NODE_ENV === 'development' ? 'sandbox' : 'production'
});