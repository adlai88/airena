import { betterAuth } from "better-auth";
import { Pool } from 'pg';

// Create PostgreSQL pool for Better Auth
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected successfully at:', res.rows[0].now);
  }
});

// Minimal Better Auth configuration without plugins
export const authMinimal = betterAuth({
  database: pool,
  
  // Secret for session encryption
  secret: process.env.BETTER_AUTH_SECRET || "test-secret-for-development",
  
  // Base URL for auth endpoints - must match the route
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  basePath: "/api/auth-minimal",
  
  // Enable debug logging
  logger: {
    verboseLogging: true,
    disabled: false
  },
  
  // Email/password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false
  },
  
  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24 // Update session every 24 hours
  },
  
  // Map Better Auth field names to your existing database column names
  user: {
    fields: {
      emailVerified: "email_verified",
      createdAt: "created_at", 
      updatedAt: "updated_at"
    }
  },
  
  session: {
    fields: {
      userId: "user_id",
      expiresAt: "expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
      ipAddress: "ip_address",
      userAgent: "user_agent"
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
  }
});

// Log available endpoints
console.log('Better Auth initialized');
console.log('Auth methods:', Object.keys(authMinimal));

// Export type for use in other files
export type { Session, User } from "better-auth/types";