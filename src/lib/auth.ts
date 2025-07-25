import { betterAuth } from "better-auth";
import { polar, checkout, portal, usage, webhooks } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { Pool } from 'pg';

// Create PostgreSQL pool for Better Auth
// Uses DATABASE_URL which is your Supabase connection string
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.query('SELECT NOW()', (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected successfully');
  }
});

// Initialize Polar client with error handling
let polarClient: Polar | null = null;
try {
  if (process.env.POLAR_API_KEY) {
    polarClient = new Polar({
      accessToken: process.env.POLAR_API_KEY,
      // Use production server since we have production API keys
      server: 'production'
    });
  } else {
    console.warn('POLAR_API_KEY not set - Polar integration disabled');
  }
} catch (error) {
  console.error('Failed to initialize Polar client:', error);
}

export const auth = betterAuth({
  database: pool,
  
  // Secret for session encryption
  secret: process.env.BETTER_AUTH_SECRET,
  
  // Base URL for auth endpoints
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  
  // Trust the proxy headers and origins
  trustedOrigins: [
    "http://localhost:3000", 
    "http://localhost:3001", 
    "http://localhost:3002",
    process.env.BETTER_AUTH_URL || "http://localhost:3000"
  ].filter(Boolean),
  
  // Email/password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false // Simplify for migration
  },
  
  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    // Field mappings for session table
    fields: {
      userId: "user_id",
      expiresAt: "expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
      ipAddress: "ip_address",
      userAgent: "user_agent"
    }
  },
  
  // Map Better Auth field names to your existing database column names
  user: {
    fields: {
      emailVerified: "email_verified",
      createdAt: "created_at", 
      updatedAt: "updated_at"
    }
  },
  
  account: {
    fields: {
      userId: "user_id",
      accountId: "account_id", 
      providerId: "provider_id",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      idToken: "id_token",
      accessTokenExpiresAt: "expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  },
  
  // Polar integration (only if client is available)
  plugins: polarClient ? [
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      onCustomerCreated: async ({ user, customer }: { 
        user: { id: string; email?: string }; 
        customer: { id: string } 
      }) => {
        // Update user with Polar customer ID
        console.log(`Polar customer created: ${customer.id} for user: ${user.id}`);
        await pool.query(
          'UPDATE public."user" SET polar_customer_id = $1, updated_at = NOW() WHERE id = $2',
          [customer.id, user.id]
        );
      },
      use: [
        // Checkout configuration
        checkout({
          products: [
            {
              productId: "2d078db5-1c02-43ae-bf7a-8b763fd26140",
              slug: "starter-monthly"
            },
            {
              productId: "3fff0f35-d90b-4f2d-bad9-6901128e5f28", 
              slug: "starter-annual"
            },
            {
              productId: "bda6be16-5294-4b12-8973-6ccdd0bf05e7",
              slug: "pro-monthly"
            },
            {
              productId: "dc8f5557-4783-4226-970a-7e1f200a1f8c",
              slug: "pro-annual"
            }
          ],
          successUrl: "/channels?checkout_success=true",
          authenticatedUsersOnly: true
        }),
        
        // Customer portal
        portal(),
        
        // Usage tracking for block limits
        usage(),
        
        // Webhook handling
        webhooks({
          secret: process.env.POLAR_WEBHOOK_SECRET!,
          onSubscriptionCreated: async (payload) => {
            // The payload type is WebhookSubscriptionCreatedPayload from @polar-sh/sdk
            const subscription = payload.data;
            const customer = subscription.customer;
            const userId = customer?.metadata?.userId as string | undefined;
            
            if (!userId) {
              console.error('No userId found in subscription created webhook');
              return;
            }
            
            const tier = determineTierFromProduct(subscription.productId);
            console.log(`Subscription created - userId: ${userId}, tier: ${tier}`);
            
            // Update user tier directly in database
            await pool.query(
              'UPDATE users SET tier = $1, polar_customer_id = $2, updated_at = NOW() WHERE id = $3',
              [tier, customer.id, userId]
            );
          },
          
          onSubscriptionUpdated: async (payload) => {
            // The payload type is WebhookSubscriptionUpdatedPayload from @polar-sh/sdk
            const subscription = payload.data;
            const customer = subscription.customer;
            const userId = customer?.metadata?.userId as string | undefined;
            
            if (!userId) {
              console.error('No userId found in subscription updated webhook');
              return;
            }
            
            const tier = determineTierFromProduct(subscription.productId);
            console.log(`Subscription updated - userId: ${userId}, tier: ${tier}`);
            
            await pool.query(
              'UPDATE users SET tier = $1, updated_at = NOW() WHERE id = $2',
              [tier, userId]
            );
          },
          
          onSubscriptionCanceled: async (payload) => {
            // The payload type is WebhookSubscriptionCanceledPayload from @polar-sh/sdk
            const subscription = payload.data;
            const customer = subscription.customer;
            const userId = customer?.metadata?.userId as string | undefined;
            
            if (!userId) {
              console.error('No userId found in subscription canceled webhook');
              return;
            }
            
            console.log(`Subscription canceled - userId: ${userId}, downgrading to free`);
            
            // Downgrade to free tier
            await pool.query(
              'UPDATE users SET tier = $1, updated_at = NOW() WHERE id = $2',
              ['free', userId]
            );
          },
          
          onOrderPaid: async (payload) => {
            // The payload type is WebhookOrderPaidPayload from @polar-sh/sdk
            const order = payload.data;
            const customer = order.customer;
            const userId = customer?.metadata?.userId as string | undefined;
            
            if (!userId) {
              console.error('No userId found in order paid webhook');
              return;
            }
            
            const tier = determineTierFromProduct(order.product.id);
            console.log(`Order paid - userId: ${userId}, tier: ${tier}`);
            
            // Ensure subscription is active
            await pool.query(
              'UPDATE users SET tier = $1, updated_at = NOW() WHERE id = $2',
              [tier, userId]
            );
          },
          
          onOrderRefunded: async (payload) => {
            // The payload type is WebhookOrderRefundedPayload from @polar-sh/sdk
            const order = payload.data;
            const customer = order.customer;
            const userId = customer?.metadata?.userId as string | undefined;
            
            if (!userId) {
              console.error('No userId found in order refunded webhook');
              return;
            }
            
            console.log(`Order refunded - userId: ${userId}, marking as past due`);
            
            // Could optionally downgrade to free or mark as past_due
            // For now, we'll keep their tier but you might want to track payment status
          },
          
          onCustomerUpdated: async (payload) => {
            // The payload type is WebhookCustomerUpdatedPayload from @polar-sh/sdk
            const customer = payload.data;
            const userId = customer.metadata?.userId as string | undefined;
            
            if (!userId) {
              console.error('No userId found in customer updated webhook');
              return;
            }
            
            console.log(`Customer updated - userId: ${userId}`);
            
            // Check if tier is specified in metadata
            const metadata = customer.metadata || {};
            if (metadata.tier) {
              const tier = metadata.tier as string;
              // Clean up tier value (remove any suffixes like "-t")
              const cleanTier = tier.replace(/-.*$/, '') as 'free' | 'starter' | 'pro';
              
              if (['free', 'starter', 'pro'].includes(cleanTier)) {
                console.log(`Updating tier based on customer metadata: ${cleanTier}`);
                
                await pool.query(
                  'UPDATE users SET tier = $1, polar_customer_id = $2, updated_at = NOW() WHERE id = $3',
                  [cleanTier, customer.id, userId]
                );
              }
            }
          }
        })
      ]
    })
  ] : [] // No plugins if Polar client is not available
});

// Helper function to determine tier from product ID
function determineTierFromProduct(productId: string): 'free' | 'starter' | 'pro' {
  const productTierMap: Record<string, 'free' | 'starter' | 'pro'> = {
    '2939287a-ef9c-41de-9d8b-e89dad1be367': 'free',
    '2d078db5-1c02-43ae-bf7a-8b763fd26140': 'starter', // starter monthly
    '3fff0f35-d90b-4f2d-bad9-6901128e5f28': 'starter', // starter annual
    'bda6be16-5294-4b12-8973-6ccdd0bf05e7': 'pro',     // pro monthly
    'dc8f5557-4783-4226-970a-7e1f200a1f8c': 'pro'      // pro annual
  };
  
  return productTierMap[productId] || 'free';
}

// Export type for use in other files
export type { Session, User } from "better-auth/types";