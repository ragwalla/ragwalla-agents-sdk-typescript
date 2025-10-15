import { Ragwalla, RagwallaWebSocket } from '@ragwalla/agents-sdk/workers';

// Cloudflare Workers example
export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    // Initialize the Ragwalla client with environment variables
    const ragwalla = new Ragwalla({
      apiKey: env.RAGWALLA_API_KEY, // Set this in your Worker environment
    });

    try {
      // Example 1: Create an agent
      const agent = await ragwalla.agents.create({
        name: 'Customer Support Agent',
        description: 'AI assistant for customer support',
        instructions: 'You are a helpful customer support agent. Be polite and helpful.',
        model: 'gpt-4',
        tools: []
      });

      // Example 2: Chat with the agent
      const chatResponse = await ragwalla.agents.createChatCompletion(agent.id, {
        messages: [
          { role: 'user', content: 'Hello, I need help with my order.' }
        ],
        max_tokens: 150,
      });

      // Example 3: Streaming chat (for real-time responses)
      const streamResponse = await ragwalla.agents.createChatCompletionStream(agent.id, {
        messages: [
          { role: 'user', content: 'What are your business hours?' }
        ],
        max_tokens: 100,
      });

      // Example 4: Vector search
      const searchResults = await ragwalla.vectorStores.search('your-vector-store-id', {
        query: 'product documentation',
        limit: 5
      });

      return new Response(JSON.stringify({
        agent: agent,
        chatResponse: chatResponse,
        searchResults: searchResults,
        success: true
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({
        error: error.message,
        success: false
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },

  // WebSocket example for real-time chat
  async webSocketHandler(request: Request, env: any): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected websocket', { status: 400 });
    }

    const [client, server] = Object.values(new WebSocketPair());

    // Initialize Ragwalla WebSocket client
    const ragwalla = new Ragwalla({
      apiKey: env.RAGWALLA_API_KEY,
    });

    // Get connection token
    const tokenResponse = await ragwalla.agents.getToken({
      agent_id: 'your-agent-id' // Replace with actual agent ID
    });

    // Connect to Ragwalla WebSocket
    const ws = new RagwallaWebSocket({
      baseURL: 'wss://api.ragwalla.com'
    });

    // Set up event handlers
    ws.on('connected', () => {
      console.log('Connected to Ragwalla');
    });

    ws.on('message', (message) => {
      // Forward messages from Ragwalla to the client
      server.send(JSON.stringify(message));
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      server.close();
    });

    // Handle messages from the client
    server.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);
        ws.sendMessage(message);
      } catch (error) {
        console.error('Failed to parse client message:', error);
      }
    });

    server.addEventListener('close', () => {
      ws.disconnect();
    });

    // Connect to Ragwalla
    await ws.connect('your-agent-id', 'main', tokenResponse.token);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }
};