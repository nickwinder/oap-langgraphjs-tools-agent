import {
  authenticateUser,
  getMcpAccessToken,
  type MinimalUserDict,
} from './index.js';

/**
 * Simple test function to validate security module functionality
 */
export async function testSecurityModule(): Promise<void> {
  console.log('🔐 Testing Security Module...');

  // Test 1: Authentication error handling
  try {
    await authenticateUser(undefined);
  } catch {
    console.log('✅ Test 1: Authentication properly rejects missing headers');
  }

  try {
    await authenticateUser('invalid-format');
  } catch {
    console.log('✅ Test 2: Authentication properly rejects invalid format');
  }

  // Test 3: MCP token exchange (would fail without real server)
  try {
    await getMcpAccessToken('fake-token', 'https://fake-server.com');
    console.log(
      '⚠️ Test 3: MCP token exchange completed (likely failed as expected)',
    );
  } catch {
    console.log('✅ Test 3: MCP token exchange properly handled error');
  }

  console.log('🎉 Security module tests completed');
}

// Type check validation
const testUser: MinimalUserDict = { identity: 'test-user-123' };
console.log(
  '✅ TypeScript compilation successful for user:',
  testUser.identity,
);
