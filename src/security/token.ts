import type { RunnableConfig } from '../types/config.js';

export interface MCPTokens {
  access_token: string;
  expires_in: number;
  token_type?: string;
  refresh_token?: string;
}

export interface StoredTokenData {
  value: MCPTokens;
  created_at: Date;
}

// Simple in-memory token store (in production, you'd use LangGraph's store)
const tokenStore = new Map<string, StoredTokenData>();

/**
 * Exchange a Supabase token for an MCP access token.
 */
export async function getMcpAccessToken(
  supabaseToken: string,
  baseMcpUrl: string,
): Promise<MCPTokens | null> {
  try {
    const formData = new URLSearchParams({
      client_id: 'mcp_default',
      subject_token: supabaseToken,
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      resource: `${baseMcpUrl.replace(/\/$/, '')}/mcp`,
      subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
    });

    const response = await fetch(
      `${baseMcpUrl.replace(/\/$/, '')}/oauth/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      },
    );

    if (response.ok) {
      return (await response.json()) as MCPTokens;
    } else {
      const responseText = await response.text();
      console.error(`Token exchange failed: ${responseText}`);
    }
  } catch (error) {
    console.error(`Error during token exchange: ${String(error)}`);
  }

  return null;
}

/**
 * Get stored tokens for a user
 */
export function getTokens(config: RunnableConfig): MCPTokens | null {
  const threadId = config.configurable?.thread_id;
  if (!threadId) {
    return null;
  }

  const userId = config.metadata?.owner;
  if (!userId) {
    return null;
  }

  const key = `${userId}:tokens`;
  const storedData = tokenStore.get(key);
  if (!storedData) {
    return null;
  }

  const { value: tokens, created_at: createdAt } = storedData;
  const expiresIn = tokens.expires_in; // seconds until expiration

  const currentTime = new Date();
  const expirationTime = new Date(createdAt.getTime() + expiresIn * 1000);

  if (currentTime > expirationTime) {
    // Tokens have expired, delete them
    tokenStore.delete(key);
    return null;
  }

  return tokens;
}

/**
 * Store tokens for a user
 */
export function setTokens(config: RunnableConfig, tokens: MCPTokens): void {
  const threadId = config.configurable?.thread_id;
  if (!threadId) {
    return;
  }

  const userId = config.metadata?.owner;
  if (!userId) {
    return;
  }

  const key = `${userId}:tokens`;
  tokenStore.set(key, {
    value: tokens,
    created_at: new Date(),
  });
}

/**
 * Fetch MCP access token if it doesn't already exist in the store.
 */
export async function fetchTokens(
  config: RunnableConfig,
): Promise<MCPTokens | null> {
  const currentTokens = getTokens(config);
  if (currentTokens) {
    return currentTokens;
  }

  const supabaseToken = config.configurable?.['x-supabase-access-token'];
  if (!supabaseToken) {
    return null;
  }

  const mcpConfig = config.configurable?.mcpConfig;
  if (!mcpConfig?.url) {
    return null;
  }

  const mcpTokens = await getMcpAccessToken(supabaseToken, mcpConfig.url);
  if (!mcpTokens) {
    return null;
  }

  setTokens(config, mcpTokens);
  return mcpTokens;
}

/**
 * Clear all tokens from the store (for testing/cleanup)
 */
export function clearAllTokens(): void {
  tokenStore.clear();
}

/**
 * Get token store size (for monitoring/debugging)
 */
export function getTokenStoreSize(): number {
  return tokenStore.size;
}
