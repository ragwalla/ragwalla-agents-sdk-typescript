import { Ragwalla } from '../src';

// Example: Vector store search
async function vectorSearchExample() {
  const ragwalla = new Ragwalla({
    apiKey: process.env.RAGWALLA_API_KEY!,
    baseURL: 'https://example.ai.ragwalla.com/v1' // Replace with your organization's URL
  });

  try {
    // Replace with your actual vector store ID
    const vectorStoreId = 'vs_example123';

    // Simple text search
    console.log('Performing simple vector search...');
    const searchResults = await ragwalla.vectorStores.search(vectorStoreId, {
      query: 'How to authenticate with the API?',
      top_k: 5,
      include_metadata: true
    });

    console.log('Search results:');
    searchResults.data.forEach((result, index) => {
      console.log(`${index + 1}. Score: ${result.score}`);
      console.log(`   Content: ${result.content}`);
      console.log(`   Metadata:`, result.metadata);
      console.log('---');
    });

    // Extended search with filters
    console.log('\nPerforming filtered vector search...');
    const filteredResults = await ragwalla.vectorStores.searchExtended(vectorStoreId, {
      query: 'JavaScript SDK examples',
      top_k: 3,
      filter: {
        language: 'javascript',
        category: 'documentation'
      },
      extended_query: 'Find examples of using the JavaScript SDK with authentication',
      search_type: 'similarity_score_threshold',
      search_kwargs: {
        score_threshold: 0.7
      }
    });

    console.log('Filtered search results:');
    filteredResults.data.forEach((result, index) => {
      console.log(`${index + 1}. Score: ${result.score}`);
      console.log(`   Content: ${result.content}`);
      console.log('---');
    });

    if (searchResults.usage) {
      console.log('Token usage:', searchResults.usage);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the example
if (require.main === module) {
  vectorSearchExample();
}