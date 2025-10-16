# Ragwalla Agents SDK - TypeScript

The official TypeScript SDK for the Ragwalla Agents API. Build powerful AI applications with agents, real-time chat, vector search, and more.

## Installation

```bash
npm install @ragwalla/agents-sdk
```

## Quick Start

```typescript
import { Ragwalla } from '@ragwalla/agents-sdk';

const ragwalla = new Ragwalla({
  apiKey: process.env.RAGWALLA_API_KEY!,
  baseURL: 'https://example.ai.ragwalla.com/v1' // Required
});

// Create an agent
const agent = await ragwalla.agents.create({
  name: 'My Assistant',
  instructions: 'You are a helpful AI assistant.'
});

// Get WebSocket token for real-time chat
const tokenResponse = await ragwalla.agents.getToken({
  agent_id: agent.id,
  expires_in: 3600
});

// Create WebSocket connection
const ws = ragwalla.createWebSocket();

ws.on('connected', () => {
  ws.sendMessage({ role: 'user', content: 'Hello!' });
});

ws.on('message', (message) => {
  console.log('Agent:', message.content);
});

await ws.connect(agent.id, 'main', tokenResponse.token);
```

## Features

- ✅ **Agent Management** - Create, update, and manage AI agents
- ✅ **Real-time WebSocket Chat** - Live streaming chat with automatic reconnection
- ✅ **WebSocket-Only Communication** - All agent chat happens via WebSocket (no HTTP chat endpoints)
- ✅ **Vector Search** - Semantic search across knowledge bases
- ✅ **Tool Management** - Attach functions and assistants to agents
- ✅ **Quota Management** - Track usage and limits
- ✅ **TypeScript Native** - Full type safety and IntelliSense
- ✅ **Error Handling** - Comprehensive error types
- ✅ **Automatic Retries** - Built-in retry logic for failed requests
- ✅ **Cloudflare Workers** - Optimized build for serverless environments

## Configuration

```typescript
const ragwalla = new Ragwalla({
  apiKey: 'your-api-key',                        // Required
  baseURL: 'https://example.ai.ragwalla.com/v1', // Required - your custom domain
  timeout: 30000,                                // Optional, request timeout in ms
  debug: false                                   // Optional, enable debug logging
});
```

**Important:** The `baseURL` must follow the pattern `https://[subdomain].ai.ragwalla.com/v1` where `[subdomain]` is your organization's unique identifier.

### Debug Logging

Enable debug logging to troubleshoot connection issues and monitor SDK behavior:

```typescript
const ragwalla = new Ragwalla({
  apiKey: process.env.RAGWALLA_API_KEY!,
  baseURL: 'https://example.ai.ragwalla.com/v1',
  debug: true // Enables detailed logging for HTTP and WebSocket
});

// Debug logs will show:
// - HTTP request/response details
// - WebSocket connection events
// - Message sending/receiving
// - Error details and stack traces
// - Timeout and retry information
```

## Agent Management

### Create an Agent

```typescript
const agent = await ragwalla.agents.create({
  name: 'Customer Support Agent',
  description: 'Handles customer inquiries',
  model: 'gpt-4',
  instructions: 'You are a helpful customer support representative.',
  tools: ['tool_id_1', 'tool_id_2'],
  metadata: {
    department: 'support',
    version: '1.0'
  }
});
```

### List Agents

```typescript
const agents = await ragwalla.agents.list({
  limit: 10,
  order: 'desc'
});

console.log(agents.data); // Array of agents
```

### Update an Agent

```typescript
const updatedAgent = await ragwalla.agents.update(agent.id, {
  instructions: 'Updated instructions for the agent'
});
```

### Delete an Agent

```typescript
await ragwalla.agents.delete(agent.id);
```

## Important: WebSocket-Only Chat

**All agent chat communication happens via WebSocket, not HTTP.** The ragwalla-hono-worker server does not support HTTP chat completion endpoints. You must use WebSocket connections for real-time agent communication.

### Why WebSocket?

- ✅ Real-time streaming responses
- ✅ Bidirectional communication
- ✅ Lower latency
- ✅ Automatic reconnection
- ✅ Connection state management

### Available HTTP Endpoints (CRUD Only)

HTTP endpoints are only for managing agents, not chatting:

```typescript
// ✅ Create agent (HTTP)
await ragwalla.agents.create({ name: 'Agent' });

// ✅ List agents (HTTP)
await ragwalla.agents.list();

// ✅ Update agent (HTTP)
await ragwalla.agents.update(agentId, { instructions: '...' });

// ✅ Delete agent (HTTP)
await ragwalla.agents.delete(agentId);

// ✅ Get WebSocket token (HTTP)
await ragwalla.agents.getToken({ agent_id: agentId });

// ❌ NO HTTP chat endpoints - use WebSocket instead!
```

## Real-time WebSocket Chat

### Basic WebSocket Usage

```typescript
// Get connection token
const tokenResponse = await ragwalla.agents.getToken({
  agent_id: agent.id,
  expires_in: 3600
});

// Create WebSocket connection
const ws = ragwalla.createWebSocket();

// Set up event listeners
ws.on('connected', () => {
  console.log('Connected to agent');
});

ws.on('message', (message) => {
  console.log('Agent:', message.content);
});

ws.on('error', (error) => {
  console.error('Error:', error);
});

// Connect and send message
await ws.connect(agent.id, 'main', tokenResponse.token);
ws.sendMessage({
  role: 'user',
  content: 'Hello via WebSocket!'
});
```

### WebSocket Events

The WebSocket client emits the following events:

#### Connection Events
- `connected` - Successfully connected to agent
- `disconnected` - Connection closed (`{ code, reason }`)
- `reconnectFailed` - Reconnection attempts failed (`{ attempts }`)
- `connectionStatus` - Connection status updates

#### Message Events
- `message` - Generic message event (receives all message types)
- `chunk` - Streaming content chunk (`{ content, messageId }`)
- `complete` - Message completion (`{ messageId }`)
- `messageCreated` - New message started (`{ messageId, role }`)

#### Agent Events
- `agentState` - Agent state updates (Cloudflare-specific)
- `threadInfo` - Thread information (`{ threadId, assistantId, isNewThread }`)
- `typing` - Typing indicator (`{ isTyping }`)
- `toolUse` - Tool usage information (`{ tools }`)

#### Other Events
- `tokenUsage` - Token usage statistics
- `error` - Error occurred
- `rawMessage` - Unhandled message types (for debugging)

### Streaming Response Example

```typescript
const ws = ragwalla.createWebSocket();

let fullResponse = '';

// Listen for streaming chunks (recommended)
ws.on('chunk', (chunk) => {
  process.stdout.write(chunk.content);
  fullResponse += chunk.content;
});

// Listen for completion
ws.on('complete', (info) => {
  console.log('\nMessage completed:', info.messageId);
  console.log('Full response:', fullResponse);
});

// Or use generic 'message' event (also receives chunks)
ws.on('message', (message) => {
  console.log('Received:', message.content);
});

await ws.connect(agent.id, 'session-id', token);
ws.sendMessage({ role: 'user', content: 'Hello!' });
```

## Vector Search

### Simple Search

```typescript
const results = await ragwalla.vectorStores.search('vector_store_id', {
  query: 'How to use the API?',
  top_k: 5,
  include_metadata: true
});

results.data.forEach(result => {
  console.log(`Score: ${result.score}`);
  console.log(`Content: ${result.content}`);
});
```

### Advanced Search with Filters

```typescript
const results = await ragwalla.vectorStores.searchExtended('vector_store_id', {
  query: 'JavaScript examples',
  top_k: 3,
  filter: {
    language: 'javascript',
    category: 'tutorial'
  },
  extended_query: 'Find JavaScript SDK usage examples',
  search_type: 'similarity_score_threshold',
  search_kwargs: {
    score_threshold: 0.8
  }
});
```

## Tool Management

### List Agent Tools

```typescript
const tools = await ragwalla.agents.listTools(agent.id);
console.log(tools.data);
```

### Attach a Tool

```typescript
const tool = await ragwalla.agents.attachTool(agent.id, {
  type: 'function',
  function: {
    name: 'get_weather',
    description: 'Get current weather for a location',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'The city and state'
        }
      },
      required: ['location']
    }
  }
});
```

### Detach a Tool

```typescript
await ragwalla.agents.detachTool(agent.id, tool.id);
```

## Quota Management

### Check Quota

```typescript
const quotaCheck = await ragwalla.quota.check({
  userId: 'user_123',
  action: 'chat_completion'
});

if (quotaCheck.allowed) {
  // Proceed with action
} else {
  console.log('Quota exceeded');
}
```

### Send Quota Event

```typescript
await ragwalla.quota.sendEvent('worker_id', {
  action: 'message_sent',
  metadata: {
    tokens_used: 150,
    model: 'gpt-4'
  }
});
```

## Error Handling

The SDK throws `RagwallaAPIError` for API-related errors:

```typescript
import { RagwallaAPIError } from '@ragwalla/agents-sdk';

try {
  const agent = await ragwalla.agents.retrieve('invalid_id');
} catch (error) {
  if (error instanceof RagwallaAPIError) {
    console.log('API Error:', error.message);
    console.log('Status:', error.status);
    console.log('Type:', error.type);
    console.log('Code:', error.code);
  }
}
```

## Cloudflare Workers Support

The SDK is fully compatible with Cloudflare Workers! Use the Workers-optimized build:

```typescript
import { Ragwalla } from '@ragwalla/agents-sdk/workers';

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const ragwalla = new Ragwalla({
      apiKey: env.RAGWALLA_API_KEY,
      baseURL: env.RAGWALLA_BASE_URL // e.g., 'https://myorg.ai.ragwalla.com/v1'
    });

    const agent = await ragwalla.agents.create({
      name: 'Worker Agent',
      instructions: 'You are an AI assistant running in Cloudflare Workers.'
    });

    // Get WebSocket token for chat
    const tokenResponse = await ragwalla.agents.getToken({
      agent_id: agent.id,
      expires_in: 3600
    });

    return new Response(JSON.stringify({ 
      agent,
      token: tokenResponse.token,
      message: 'Use WebSocket to chat with this agent'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
```

### WebSocket in Workers

```typescript
import { RagwallaWebSocket } from '@ragwalla/agents-sdk/workers';

// In your Workers WebSocket handler
const ws = new RagwallaWebSocket({
  baseURL: 'wss://myorg.ai.ragwalla.com/v1'
});

await ws.connect(agentId, 'main', token);
```

### Key Differences for Workers

- Import from `@ragwalla/agents-sdk/workers` instead of the main package
- Use `env` bindings for environment variables instead of `process.env`
- WebSocket uses native Workers WebSocket API instead of the Node.js `ws` package
- Optimized build excludes Node.js-specific dependencies

## Examples

Check the `examples/` directory for complete usage examples:

- `basic-usage.ts` - Agent CRUD operations and token generation
- `streaming-chat.ts` - Streaming responses via WebSocket
- `websocket-chat.ts` - Real-time WebSocket communication
- `vector-search.ts` - Vector store search examples
- `cloudflare-workers.ts` - Complete Cloudflare Workers implementation
- `debug-websocket.ts` - WebSocket debugging with detailed logging

## Environment Variables

Set your API key as an environment variable:

```bash
export RAGWALLA_API_KEY=your_api_key_here
```

## TypeScript Support

The SDK is written in TypeScript and provides full type definitions. All API responses and request parameters are fully typed for the best development experience.

## Support

For issues and questions:
- GitHub Issues: [ragwalla-agents-sdk issues](https://github.com/ragwalla/agents-sdk/issues)
- Documentation: [Ragwalla Docs](https://docs.ragwalla.com)

## License

MIT License