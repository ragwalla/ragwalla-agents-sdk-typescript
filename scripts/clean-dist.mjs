import { rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = resolve(rootDir, 'dist');

if (distDir === rootDir) {
  throw new Error('Refusing to clean project root');
}

await rm(distDir, { recursive: true, force: true });
