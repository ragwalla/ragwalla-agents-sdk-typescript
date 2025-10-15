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
  apiKey: process.env.RAGWALLA_API_KEY!
});

// Create an agent
const agent = await ragwalla.agents.create({
  name: 'My Assistant',
  instructions: 'You are a helpful AI assistant.'
});

// Chat with the agent
const response = await ragwalla.agents.createChatCompletion(agent.id, {
  messages: [{ role: 'user', content: 'Hello!' }]
});

console.log(response.choices[0].message.content);
```

## Features

- ✅ **Agent Management** - Create, update, and manage AI agents
- ✅ **Chat Completions** - Both streaming and non-streaming
- ✅ **Real-time WebSocket** - Live chat with automatic reconnection
- ✅ **Vector Search** - Semantic search across knowledge bases
- ✅ **Tool Management** - Attach functions and assistants to agents
- ✅ **Quota Management** - Track usage and limits
- ✅ **TypeScript Native** - Full type safety and IntelliSense
- ✅ **Error Handling** - Comprehensive error types
- ✅ **Automatic Retries** - Built-in retry logic for failed requests

## Configuration

```typescript
const ragwalla = new Ragwalla({
  apiKey: 'your-api-key',           // Required
  baseURL: 'https://api.ragwalla.com', // Optional, defaults to this
  timeout: 30000                    // Optional, request timeout in ms
});
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

## Chat Completions

### Non-streaming Chat

```typescript
const response = await ragwalla.agents.createChatCompletion(agent.id, {
  messages: [
    { role: 'user', content: 'What is the weather like?' }
  ],
  max_tokens: 150,
  temperature: 0.7
});

console.log(response.choices[0].message.content);
```

### Streaming Chat

```typescript
const stream = await ragwalla.agents.createChatCompletionStream(agent.id, {
  messages: [
    { role: 'user', content: 'Write a story about AI' }
  ],
  stream: true,
  max_tokens: 500
});

const reader = stream.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  if (value.choices?.[0]?.message?.content) {
    process.stdout.write(value.choices[0].message.content);
  }
}
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

- `connected` - Successfully connected to agent
- `message` - New message from agent
- `tokenUsage` - Token usage information
- `error` - Error occurred
- `disconnected` - Connection closed
- `reconnectFailed` - Reconnection attempts failed

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

## Examples

Check the `examples/` directory for complete usage examples:

- `basic-usage.ts` - Basic agent operations
- `streaming-chat.ts` - Streaming chat completions
- `websocket-chat.ts` - Real-time WebSocket communication
- `vector-search.ts` - Vector store search examples

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