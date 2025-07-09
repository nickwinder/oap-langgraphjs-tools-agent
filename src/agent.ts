import '@langchain/langgraph/zod';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { wrapMcpAuthenticateTool } from './utils/tools.js';
import { GraphConfigSchema, type RunnableConfig } from './types/config.js';
import { fetchTokens } from './security';
import { env } from './env.js';
import type { StructuredTool } from '@langchain/core/tools';
import { StateGraph, MessagesAnnotation } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type { AIMessage } from '@langchain/core/messages';
import { SystemMessage } from '@langchain/core/messages';

const UNEDITABLE_SYSTEM_PROMPT =
  '\nIf the tool throws an error requiring authentication, provide the user with a Markdown link to the authentication page and prompt them to authenticate.';

function getApiKeyForModel(
  modelName: string,
  config: RunnableConfig,
): string | undefined {
  const lowerModelName = modelName.toLowerCase();

  const modelToKey: Record<string, string> = {
    'openai/': 'OPENAI_API_KEY',
    'anthropic/': 'ANTHROPIC_API_KEY',
    'google/': 'GOOGLE_API_KEY',
  };

  const keyName = Object.entries(modelToKey).find(([prefix]) =>
    lowerModelName.startsWith(prefix),
  )?.[1];

  if (!keyName) {
    return undefined;
  }

  const apiKeys = config.configurable?.apiKeys;
  if (
    apiKeys &&
    keyName in apiKeys &&
    apiKeys[keyName as keyof typeof apiKeys]
  ) {
    return apiKeys[keyName as keyof typeof apiKeys];
  }

  const envKeys = {
    OPENAI_API_KEY: env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
    GOOGLE_API_KEY: env.GOOGLE_API_KEY,
  };
  return envKeys[keyName as keyof typeof envKeys];
}

export async function graph(config: RunnableConfig) {
  const cfg = GraphConfigSchema.parse(config.configurable ?? {});
  const tools: StructuredTool[] = [];

  if (cfg.mcpConfig?.url && cfg.mcpConfig?.tools) {
    const serverUrl = `${cfg.mcpConfig.url.replace(/\/$/, '')}/mcp`;

    let mcpTokens = null;
    if (cfg.mcpConfig.auth_required) {
      mcpTokens = await fetchTokens(config);
    }

    const headers: Record<string, string> = {};
    if (mcpTokens && cfg.mcpConfig.auth_required) {
      headers['Authorization'] = `Bearer ${mcpTokens.access_token}`;
    }

    try {
      const mcpClient = new MultiServerMCPClient({
        mcpServers: {
          server: {
            url: serverUrl,
            headers: Object.keys(headers).length > 0 ? headers : undefined,
          },
        },
      });

      const mcpTools = await mcpClient.getTools();

      for (const toolName of cfg.mcpConfig.tools) {
        const mcpTool = mcpTools.find(
          (t: StructuredTool) => t.name.includes(toolName),
        );
        if (mcpTool) {
          tools.push(wrapMcpAuthenticateTool(mcpTool));
        }
      }
    } catch (error) {
      console.error('Failed to fetch MCP tools:', error);
    }
  }

  const modelName = cfg.modelName ?? 'openai/gpt-4.1';
  const apiKey = getApiKeyForModel(modelName, config) ?? 'No token found';

  const model = (() => {
    if (modelName.startsWith('openai/')) {
      return new ChatOpenAI({
        model: modelName.replace('openai/', ''),
        temperature: cfg.temperature ?? 0.7,
        maxTokens: cfg.maxTokens ?? 4000,
        apiKey,
      });
    } else if (modelName.startsWith('anthropic/')) {
      return new ChatAnthropic({
        model: modelName.replace('anthropic/', ''),
        temperature: cfg.temperature ?? 0.7,
        maxTokens: cfg.maxTokens ?? 4000,
        apiKey,
      });
    } else if (modelName.startsWith('google/')) {
      return new ChatGoogleGenerativeAI({
        model: modelName.replace('google/', ''),
        temperature: cfg.temperature ?? 0.7,
        maxOutputTokens: cfg.maxTokens ?? 4000,
        apiKey,
      });
    } else {
      // Default to OpenAI
      return new ChatOpenAI({
        model: 'gpt-4.1',
        temperature: cfg.temperature ?? 0.7,
        maxTokens: cfg.maxTokens ?? 4000,
        apiKey,
      });
    }
  })();

  const modelWithTools = model.bindTools(tools);

  const systemPrompt =
    (cfg.systemPrompt ??
      'You are a helpful assistant that has access to a variety of tools.') +
    UNEDITABLE_SYSTEM_PROMPT;

  function shouldContinue({ messages }: typeof MessagesAnnotation.State) {
    const lastMessage = messages[messages.length - 1] as AIMessage;

    if (lastMessage.tool_calls?.length) {
      return 'tools';
    }
    return '__end__';
  }

  async function callModel(state: typeof MessagesAnnotation.State) {
    const messages = [...state.messages];
    if (messages.length === 0 || messages[0]?.content !== systemPrompt) {
      messages.unshift(new SystemMessage(systemPrompt));
    }

    const response = await modelWithTools.invoke(messages);

    return { messages: [response] };
  }

  const toolNode = new ToolNode(tools);

  // @ts-expect-error TODO For now, the zod schema produced don't see to be compatible with State configuration schema, but they do work. Once zod 4 is release, revisit the langgraphRegistry and reimplement.
  const workflow = new StateGraph(MessagesAnnotation, GraphConfigSchema)
    .addNode('agent', callModel)
    .addEdge('__start__', 'agent')
    .addNode('tools', toolNode)
    .addEdge('tools', 'agent')
      // @ts-expect-error See TODO above.
    .addConditionalEdges('agent', shouldContinue);

  // Compile and return the workflow
  return workflow.compile();
}
