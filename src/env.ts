import { config } from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
config();

// Define the environment schema
const envSchema = z.object({
  // Supabase configuration
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_KEY: z.string().optional(),

  // API Keys
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),

  // Node environment
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

// Parse and validate environment variables
const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parseResult.error.format());
  process.exit(1);
}

export const env = parseResult.data;

// Type for the environment variables
export type Env = typeof env;
