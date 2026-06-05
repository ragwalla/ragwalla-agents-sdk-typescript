import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

// Real-workerd test project for the Cloudflare Workers WebSocket transport. Runs under
// @cloudflare/vitest-pool-workers (workerd), so the SDK's createWorkersSocket() path
// (fetch + Upgrade + accept) executes against genuine Workers WebSocket primitives.
// Separate from the jest unit suite; run with `npm run test:workers`.
export default defineWorkersConfig({
  test: {
    include: ['tests/workers/**/*.workers.test.ts'],
    poolOptions: {
      workers: {
        main: './tests/workers/test-worker-entry.ts',
        miniflare: {
          compatibilityDate: '2024-09-23',
          compatibilityFlags: ['nodejs_compat'],
        },
      },
    },
  },
});
