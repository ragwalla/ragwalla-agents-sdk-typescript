import { Ragwalla } from '../src';

// Example: Advanced WebSocket with all event types
async function advancedWebSocketExample() {
  const ragwalla = new Ragwalla({
    apiKey: process.env.RAGWALLA_API_KEY!,
    baseURL: 'https://example.ai.ragwalla.com/v1', // Replace with your organization's URL
    debug: true // Enable debug logging
  });

  try {
    // Get an agent
    const agents = await ragwalla.agents.list();
    const agent = agents.data[0];

    if (!agent) {
      console.log('No agents available. Create one first.');
      return;
    }

    // Get connection token
    const tokenResponse = await ragwalla.agents.getToken({
      agent_id: agent.id,
      expires_in: 3600
    });

    console.log(`Connecting to agent: ${agent.name}`);

    // Create WebSocket connection
    const ws = ragwalla.createWebSocket({
      reconnectAttempts: 3,
      reconnectDelay: 1000
      // Note: Debug logging is controlled by the Ragwalla client config
    });

    let fullResponse = '';

    // Connection events
    ws.on('connected', () => {
      console.log('✅ Connected to agent');
      
      ws.sendMessage({
        role: 'user',
        content: 'Tell me about artificial intelligence in 2-3 sentences.'
      });
    });

    ws.on('disconnected', ({ code, reason }) => {
      console.log(`❌ Disconnected: ${code} - ${reason}`);
    });

    // Agent state updates (Cloudflare-specific)
    ws.on('agentState', (state) => {
      console.log('🔄 Agent state updated:', {
        siteName: state.state?.siteName,
        agentId: state.state?.agentDefinition?.id,
        defaultAssistantId: state.state?.defaultAssistantId
      });
    });

    // Connection status
    ws.on('connectionStatus', (status) => {
      console.log('📡 Connection status:', status);
    });

    // Thread information
    ws.on('threadInfo', (info) => {
      console.log('🧵 Thread info:', {
        threadId: info.threadId,
        assistantId: info.assistantId,
        isNewThread: info.isNewThread
      });
    });

    // Typing indicators
    ws.on('typing', (status) => {
      if (status.isTyping) {
        process.stdout.write('💭 Agent is typing...\r');
      } else {
        process.stdout.write('                    \r'); // Clear typing indicator
      }
    });

    // Tool usage information
    ws.on('toolUse', (tools) => {
      console.log('🔧 Tools available:', tools.tools);
    });

    // Message lifecycle events
    ws.on('messageCreated', (info) => {
      console.log(`📝 New message created: ${info.messageId} (${info.role})`);
    });

    // Streaming chunks (recommended for real-time display)
    ws.on('chunk', (chunk) => {
      if (chunk.content) {
        process.stdout.write(chunk.content);
        fullResponse += chunk.content;
      }
    });

    // Message completion
    ws.on('complete', (info) => {
      console.log(`\n✅ Message ${info.messageId} completed`);
      console.log('\n📊 Full response:', fullResponse);
      
      // Send another message
      setTimeout(() => {
        ws.sendMessage({
          role: 'user',
          content: 'Thank you!'
        });
      }, 2000);
    });

    // Generic message event (receives all message types)
    ws.on('message', (message) => {
      // This receives chunks as well, but 'chunk' event is more specific
      // Use this if you want to handle all messages in one place
    });

    // Token usage tracking
    ws.on('tokenUsage', (usage) => {
      console.log('📊 Token usage:', usage);
    });

    // Error handling
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });

    // Reconnection events
    ws.on('reconnectFailed', ({ attempts }) => {
      console.log(`❌ Reconnection failed after ${attempts} attempts`);
    });

    // Raw message event (for debugging)
    ws.on('rawMessage', (message) => {
      // Receives any message type not handled by specific events
      console.log('🔍 Raw message:', message.type);
    });

    // Connect to the agent
    await ws.connect(agent.id, 'advanced-session', tokenResponse.token);

    console.log('\n🚀 WebSocket session started. Press Ctrl+C to exit.\n');
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n\n👋 Disconnecting...');
      ws.disconnect();
      process.exit(0);
    });

    // Keep the process running
    await new Promise(() => {});

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  advancedWebSocketExample();
}
