import { Ragwalla } from '../src';

// Example: Basic SDK usage
async function basicExample() {
  // Initialize the client
  const ragwalla = new Ragwalla({
    apiKey: process.env.RAGWALLA_API_KEY!,
    baseURL: 'https://api.ragwalla.com' // Optional, defaults to this
  });

  try {
    // Create a new agent
    const agent = await ragwalla.agents.create({
      name: 'Customer Support Agent',
      description: 'An AI agent for handling customer support inquiries',
      model: 'gpt-4',
      instructions: 'You are a helpful customer support representative. Be polite and professional.',
      metadata: {
        department: 'support',
        version: '1.0'
      }
    });

    console.log('Created agent:', agent);

    // List all agents
    const agentsList = await ragwalla.agents.list();
    console.log('All agents:', agentsList.data);

    // Send a message to the agent (non-streaming)
    const response = await ragwalla.agents.createChatCompletion(agent.id, {
      messages: [
        {
          role: 'user',
          content: 'Hello, I need help with my order.'
        }
      ],
      max_tokens: 150,
      temperature: 0.7
    });

    console.log('Agent response:', response.choices[0].message.content);

    // Clean up - delete the agent
    await ragwalla.agents.delete(agent.id);
    console.log('Agent deleted');

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the example
if (require.main === module) {
  basicExample();
}