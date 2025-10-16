import { Ragwalla } from '../src';

// Example: Streaming chat completion
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

    // Create streaming chat completion
    const stream = await ragwalla.agents.createChatCompletionStream(agent.id, {
      messages: [
        {
          role: 'user',
          content: 'Write a short poem about artificial intelligence.'
        }
      ],
      stream: true,
      max_tokens: 200,
      temperature: 0.8
    });

    console.log('Streaming response:');
    console.log('---');

    // Read the stream
    const reader = stream.getReader();
    let fullResponse = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        if (value.choices && value.choices[0].message) {
          const content = value.choices[0].message.content;
          if (content) {
            process.stdout.write(content);
            fullResponse += content;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    console.log('\n---');
    console.log('Full response:', fullResponse);

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the example
if (require.main === module) {
  streamingExample();
}