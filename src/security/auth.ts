import { Auth, HTTPException } from '@langchain/langgraph-sdk/auth';
import {
  createClient,
  type SupabaseClient,
  type User,
} from '@supabase/supabase-js';
import { env } from '../env.js';

export interface MinimalUserDict {
  identity: string;
}

export class AuthenticationError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = 'AuthenticationError';
    this.status = status;
    this.detail = detail;
  }
}

// Supabase client setup
let supabase: SupabaseClient | null = null;

if (env.SUPABASE_URL && env.SUPABASE_KEY) {
  supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
}

/**
 * Check if the user's JWT token is valid using Supabase.
 */
export async function authenticateUser(
  authorization?: string,
): Promise<MinimalUserDict> {
  // Ensure we have authorization header
  if (!authorization) {
    throw new AuthenticationError(401, 'Authorization header missing');
  }

  // Parse the authorization header
  let scheme: string;
  let token: string;
  try {
    const parts = authorization.split(' ');
    if (parts.length !== 2) {
      throw new Error('Invalid format');
    }
    scheme = parts[0] ?? '';
    token = parts[1] ?? '';
    if (scheme.toLowerCase() !== 'bearer') {
      throw new Error('Invalid scheme');
    }
  } catch {
    throw new AuthenticationError(401, 'Invalid authorization header format');
  }

  // Ensure Supabase client is initialized
  if (!supabase) {
    throw new AuthenticationError(500, 'Supabase client not initialized');
  }

  try {
    // Verify the JWT token with Supabase
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      throw new AuthenticationError(401, 'Invalid token or user not found');
    }

    const user: User = data.user;

    // Return user info if valid
    return {
      identity: user.id,
    };
  } catch (error) {
    // Handle any errors from Supabase
    if (error instanceof AuthenticationError) {
      throw error;
    }
    throw new AuthenticationError(
      401,
      `Authentication error: ${String(error)}`,
    );
  }
}

// Create and export the Auth instance using LangGraph SDK
export const auth = new Auth().authenticate(async (request: Request) => {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    throw new HTTPException(401, { message: 'Authorization header missing' });
  }

  try {
    const user = await authenticateUser(authHeader);

    return {
      identity: user.identity,
      permissions: [], // Add permissions as needed
      is_authenticated: true,
      // Add custom fields for your auth patterns
    };
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw new HTTPException(error.status, { message: error.detail });
    }
    throw new HTTPException(401, { message: 'Authentication failed' });
  }
});
