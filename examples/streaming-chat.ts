import { Ragwalla } from '../src';

// Example: Streaming chat via WebSocket
async function streamingExample() {
  const ragwalla = new Ragwalla({
    apiKey: process.env.RAGWALLA_API_KEY!,
    baseURL: 'https://example.ai.ragwalla.com/v1' // Replace with your organization's URL
  });

  try {
    // Get or create an agent
    const agents = await ragwalla.agents.list();
    const agent = agents.data[0]; // Use first available agent

    if (!agent) {
      console.log('No agents available. Create one first.');
      return;
    }

    console.log(`Using agent: ${agent.name}`);

    // Get connection token
    const tokenResponse = await ragwalla.agents.getToken({
      agent_id: agent.id,
      expires_in: 3600 // 1 hour
    });

    // Create WebSocket connection
    const ws = ragwalla.createWebSocket({
      reconnectAttempts: 3,
      reconnectDelay: 1000
    });

    let fullResponse = '';
    let isComplete = false;

    // Set up event listeners
    ws.on('connected', () => {
      console.log('Connected to agent via WebSocket');
      console.log('Streaming response:');
      console.log('---');
      
      // Send message
      ws.sendMessage({
        role: 'user',
        content: 'Write a short poem about artificial intelligence.'
      });
    });

    ws.on('message', (message) => {
      if (message.content) {
        process.stdout.write(message.content);
        fullResponse += message.content;
      }
      
      // Disconnect after receiving response
      if (message.role === 'assistant') {
        isComplete = true;
        setTimeout(() => {
          console.log('\n---');
          console.log('Full response:', fullResponse);
          ws.disconnect();
          process.exit(0);
        }, 1000);
      }
    });

    ws.on('error', (error) => {
      console.error('\nWebSocket error:', error);
      process.exit(1);
    });

    ws.on('disconnected', ({ code, reason }) => {
      if (!isComplete) {
        console.log(`\nDisconnected: ${code} - ${reason}`);
      }
    });

    // Connect to the agent
    await ws.connect(agent.id, 'streaming-session', tokenResponse.token);

    // Keep the process running until complete
    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (isComplete) {
          clearInterval(checkInterval);
          resolve(undefined);
        }
      }, 100);
    });

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  streamingExample();
}