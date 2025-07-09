import '@langchain/langgraph/zod';
import { z } from 'zod';

export const MCPConfigSchema = z.object({
  /**
   * The MCP server URL.
   */
  url: z.string(),
  /**
   * The list of tools to provide to the LLM.
   */
  tools: z.array(z.string()),
  /**
   * Whether or not the MCP server requires authentication.
   * This is a field which is set on the client whenever a
   * user creates a new agent. It will be set to true if the
   * `NEXT_PUBLIC_MCP_AUTH_REQUIRED` environment variable is set to `true`,
   * and false otherwise.
   * @default false
   */
  auth_required: z.boolean().optional(),
});

export const GraphConfigSchema = z.object({
  /**
   * The model ID to use for the generation.
   * Should be in the format `provider/model_name`.
   * Defaults to `openai/gpt-4.1-mini`.
   */
  modelName: z
    .string()
    .optional()
    .langgraph.metadata({
      x_oap_ui_config: {
        type: 'select',
        default: 'openai/gpt-4.1',
        description: 'The model to use in all generations',
        options: [
          {
            label: 'GPT-4.1',
            value: 'openai/gpt-4.1',
          },
          {
            label: 'GPT-4.1 mini',
            value: 'openai/gpt-4.1-mini',
          },
          {
            label: 'GPT-4.5',
            value: 'openai/gpt-4.5',
          },
          {
            label: 'o3',
            value: 'openai/o3',
          },
          {
            label: 'o4-mini',
            value: 'openai/o4-mini',
          },
          {
            label: 'GPT-4o',
            value: 'openai/gpt-4o',
          },
          {
            label: 'GPT-4o mini',
            value: 'openai/gpt-4o-mini',
          },
          {
            label: 'Claude Opus 4',
            value: 'anthropic/claude-opus-4',
          },
          {
            label: 'Claude Sonnet 4',
            value: 'anthropic/claude-sonnet-4',
          },
          {
            label: 'Claude 3.7 Sonnet',
            value: 'anthropic/claude-3-7-sonnet-latest',
          },
          {
            label: 'Claude 3.5 Sonnet',
            value: 'anthropic/claude-3-5-sonnet-latest',
          },
          {
            label: 'Claude 3.5 Haiku',
            value: 'anthropic/claude-3-5-haiku-latest',
          },
          {
            label: 'Gemini 2.5 Pro',
            value: 'google/gemini-2.5-pro',
          },
          {
            label: 'Gemini 2.5 Flash',
            value: 'google/gemini-2.5-flash',
          },
          {
            label: 'Gemini 2.0 Flash',
            value: 'google/gemini-2.0-flash',
          },
          {
            label: 'Gemini 2.0 Pro',
            value: 'google/gemini-2.0-pro',
          },
        ],
      },
    }),
  /**
   * The temperature to use for the generation.
   * Defaults to `0.7`.
   */
  temperature: z
    .number()
    .optional()
    .langgraph.metadata({
      x_oap_ui_config: {
        type: 'slider',
        default: 0.7,
        min: 0,
        max: 1,
        step: 0.1,
        description: 'Controls randomness (0 = deterministic, 1 = creative)',
      },
    }),
  /**
   * The maximum number of tokens to generate.
   * Defaults to `4000`.
   */
  maxTokens: z
    .number()
    .optional()
    .langgraph.metadata({
      x_oap_ui_config: {
        type: 'number',
        default: 4000,
        min: 1,
        description: 'The maximum number of tokens to generate',
      },
    }),
  /**
   * System prompt for the assistant
   */
  systemPrompt: z
    .string()
    .optional()
    .langgraph.metadata({
      x_oap_ui_config: {
        type: 'textarea',
        placeholder: 'Enter a system prompt...',
        default:
          'You are a helpful assistant that has access to a variety of tools.',
        description: 'The system prompt to use in all generations',
      },
    }),
  /**
   * MCP configuration for tool selection. The key (in this case it's `mcpConfig`)
   * can be any value you want.
   */
  mcpConfig: z
    .lazy(() => MCPConfigSchema)
    .optional()
    .langgraph.metadata({
      x_oap_ui_config: {
        // Ensure the type is `mcp`
        type: 'mcp',
        // Add custom tools to default to here:
        // default: {
        //   tools: ["Math_Divide", "Math_Mod"]
        // }
      },
    }),
});

export type MCPConfig = z.infer<typeof MCPConfigSchema>;
export type GraphConfig = z.infer<typeof GraphConfigSchema>;

export interface RunnableConfig {
  configurable?: {
    [key: string]: unknown;
    thread_id?: string;
    apiKeys?: {
      OPENAI_API_KEY?: string;
      ANTHROPIC_API_KEY?: string;
      GOOGLE_API_KEY?: string;
    };
    'x-supabase-access-token'?: string;
    mcpConfig?: MCPConfig;
    modelName?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  };
  metadata?: {
    owner?: string;
    [key: string]: unknown;
  };
}
