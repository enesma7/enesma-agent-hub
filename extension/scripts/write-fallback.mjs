import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fallbackFromSources } from '../hub.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const repo = join(root, '..');
const content = readFileSync(join(repo, 'content.js'), 'utf8');
const config = readFileSync(join(repo, 'config.js'), 'utf8');
const fallback = fallbackFromSources(content, config);
const dir = join(root, 'fallback');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'hub.json'), JSON.stringify(fallback, null, 2) + '\n');
console.log('Wrote fallback/hub.json with ' + fallback.home.length + ' home tiles.');
