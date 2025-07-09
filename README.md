# OAP LangGraph.js Tools Agent

A TypeScript implementation of the OAP tools agent using LangGraph.js, providing a clean and type-safe interface for creating AI agents with tool capabilities.

See https://github.com/langchain-ai/open-agent-platform for more information on the Open Agent Platform.

## Features

- **TypeScript Support**: Full type safety and modern TypeScript features
- **LangGraph.js Integration**: Built on the official LangGraph.js framework
- **MCP Support**: Model Context Protocol integration with `@langchain/mcp-adapters`
- **Multi-Model Support**: OpenAI, Anthropic, and Google models
- **Security & Authentication**: Supabase JWT authentication and token management
- **Strict Linting**: ESLint with TypeScript rules and Prettier integration
- **Modern Tooling**: PNPM, and TypeScript 5.x

## Getting Started

```bash
pnpm install
npx @langchain/langgraph-cli dev --no-browser
```

The `--no-browser` flag disables auto-opening LangGraph Studio when the server starts (optional, but recommended since the studio is not needed for this project).

## Development

### Available Scripts

- `pnpm build` - Build the project
- `pnpm dev` - Start development server with watch mode
- `pnpm start` - Run the built project
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Fix linting issues
- `pnpm format` - Format code with Prettier
- `pnpm format:check` - Check formatting
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm clean` - Clean build directory

## License

MIT
