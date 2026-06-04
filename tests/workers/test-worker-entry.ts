/**
 * Test worker for the real-workerd transport test. It is BOTH the pool's main worker and
 * the WebSocket server the SDK connects to: on an Upgrade request it returns a real
 * WebSocketPair, sends a `connected` frame on accept, and echoes anything it receives.
 *
 * The test routes the SDK's outbound `fetch(url, { Upgrade })` here via SELF, so the
 * createWorkersSocket() path (fetch + Upgrade + accept + synthesized open) runs against
 * genuine workerd WebSocket primitives.
 */
export default {
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      server.accept();
      // Greet on connect so the client observes an inbound frame immediately.
      server.send(JSON.stringify({ type: 'connected', currentThreadId: 'thr_workerd' }));
      server.addEventListener('message', (event: MessageEvent) => {
        server.send(JSON.stringify({ type: 'echo', received: event.data }));
      });
      return new Response(null, { status: 101, webSocket: client });
    }
    return new Response('expected a websocket upgrade', { status: 426 });
  },
};
