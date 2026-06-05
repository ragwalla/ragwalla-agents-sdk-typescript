import assert from 'node:assert/strict';

const main = await import('../dist/index.js');
const workers = await import('../dist/workers.js');
const packageMain = await import('@ragwalla/agents-sdk');
const packageWorkers = await import('@ragwalla/agents-sdk/workers');

assert.equal(typeof main.Ragwalla, 'function', 'dist/index.js must export Ragwalla');
assert.equal(typeof main.RagwallaWebSocket, 'function', 'dist/index.js must export RagwallaWebSocket');
assert.equal(typeof workers.Ragwalla, 'function', 'dist/workers.js must export Ragwalla');
assert.equal(typeof workers.RagwallaWebSocket, 'function', 'dist/workers.js must export RagwallaWebSocket');
assert.equal(typeof packageMain.Ragwalla, 'function', 'package root must export Ragwalla');
assert.equal(typeof packageWorkers.Ragwalla, 'function', 'package workers export must export Ragwalla');

console.log('Built package import smoke test passed');
