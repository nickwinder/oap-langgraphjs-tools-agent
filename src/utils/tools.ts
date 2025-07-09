import type { StructuredTool } from '@langchain/core/tools';
import type { ToolRunnableConfig } from '@langchain/core/tools';

class ToolException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ToolException';
  }
}

export function wrapMcpAuthenticateTool(tool: StructuredTool): StructuredTool {
  const originalInvoke = tool.invoke.bind(tool);

  tool.invoke = async function (
    input: unknown,
    config?: ToolRunnableConfig,
  ): Promise<string> {
    try {
      return (await originalInvoke(input, config)) as string;
    } catch (error) {
      // Handle MCP authentication errors
      if (
        error instanceof Error &&
        error.message.includes('interaction_required')
      ) {
        const urlMatch = error.message.match(/https?:\/\/[^\s]+/);
        const url = urlMatch ? urlMatch[0] : '';
        const errorMessage = url
          ? `Required interaction ${url}`
          : 'Required interaction';
        throw new ToolException(errorMessage);
      }
      throw error;
    }
  };

  return tool;
}
