# Changelog

## [Unreleased] - 2025-01-16

### Breaking Changes

#### Removed Invalid HTTP Chat Completion Endpoints

**Removed methods:**
- `AgentsResource.createChatCompletion()` - Invalid endpoint that doesn't exist in ragwalla-hono-worker
- `AgentsResource.createChatCompletionStream()` - Invalid endpoint that doesn't exist in ragwalla-hono-worker

**Reason:**
The ragwalla-hono-worker server does NOT support HTTP-based chat completion endpoints like `/v1/agents/{agentId}/chat/completions`. The server only supports:

1. **WebSocket connections** for real-time agent communication
2. **CRUD operations** for managing agents (create, read, update, delete)

### Fixed

#### Corrected WebSocket Token Endpoint

**Changed:**
- Token endpoint from `/v1/agents/token` to `/v1/agents/auth/websocket`

**Reason:**
The correct endpoint in ragwalla-hono-worker is `/v1/agents/auth/websocket` (line 308 in register-routes.ts)

### Migration Guide

#### Before (Invalid - Will Not Work):

```typescript
// ❌ This endpoint does not exist!
const response = await ragwalla.agents.createChatCompletion(agentId, {
  messages: [{ role: 'user', content: 'Hello' }]
});
```

#### After (Correct - WebSocket-based):

```typescript
// ✅ Get WebSocket token
const tokenResponse = await ragwalla.agents.getToken({
  agent_id: agentId,
  expires_in: 3600
});

// ✅ Create WebSocket connection
const ws = ragwalla.createWebSocket({
  reconnectAttempts: 3,
  reconnectDelay: 1000
});

// ✅ Set up event listeners
ws.on('connected', () => {
  ws.sendMessage({
    role: 'user',
    content: 'Hello'
  });
});

ws.on('message', (message) => {
  console.log('Agent:', message.content);
});

// ✅ Connect
await ws.connect(agentId, 'session-id', tokenResponse.token);
```

### Available Agent Operations

#### HTTP Endpoints (CRUD):
- `POST /v1/agents` - Create agent
- `GET /v1/agents` - List agents
- `GET /v1/agents/:agentId` - Get agent
- `PUT /v1/agents/:agentId` - Update agent
- `DELETE /v1/agents/:agentId` - Delete agent
- `POST /v1/agents/auth/websocket` - Get WebSocket token

#### WebSocket Endpoints (Real-time Chat):
- `wss://*.ai.ragwalla.com/v1/agents/:agentId/:connectionId?token=<jwt>`
- `wss://*.ai.ragwalla.com/v1/agents/:agentId/:connectionId/ws?token=<jwt>`

### Examples Updated

All examples have been updated to use the correct WebSocket-based communication:
- `examples/basic-usage.ts` - Shows agent CRUD and token generation
- `examples/websocket-chat.ts` - Shows real-time WebSocket chat
- `examples/streaming-chat.ts` - Shows streaming responses via WebSocket
