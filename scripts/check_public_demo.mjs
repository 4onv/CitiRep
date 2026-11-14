import { build } from '../frontend/node_modules/esbuild/lib/main.js';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const temporary = await mkdtemp(join(tmpdir(), 'citirep-demo-check-'));
try {
  const output = join(temporary, 'demo.mjs');
  await build({entryPoints:['frontend/src/demo.ts'], bundle:true, format:'esm', platform:'node', outfile:output,
    define:{'import.meta.env.BASE_URL':'"/CitiRep/"','import.meta.env.VITE_PUBLIC_DEMO':'"true"'}});
  globalThis.fetch = async path => {
    try { return new Response(await readFile(resolve('frontend/public', String(path).replace('/CitiRep/', '')))); }
    catch { return new Response('', {status:404}); }
  };
  const {demoApi} = await import(pathToFileURL(output));
  const results = await demoApi('/api/search?q=housing&limit=12');
  assert(results.total > 100);
  assert.equal(results.items.length, 12);
  assert.match(results.items[0].title, /housing/i);
  const bylaws = await demoApi('/api/search?q=housing&kind=bylaw&tag=housing');
  assert(bylaws.items.length > 0 && bylaws.items.every(d=>d.kind==='bylaw' && d.tags.includes('housing')));
  const doc = await demoApi('/api/documents/404');
  assert(doc.body.length > 100 && doc.chunks.length > 0);
  const versions = await demoApi('/api/documents/404/revisions');
  const version = await demoApi(`/api/documents/404/revisions/${versions[0].id}`);
  assert(version.body.length > 100);
  await assert.rejects(demoApi('/api/documents/upload',{method:'POST'}), /disabled/);
  await assert.rejects(demoApi('/api/documents/999999'), /not included/);
  console.log('Public demo checks passed: keyword search, filters, document reader, revision history, and unavailable operations.');
} finally { await rm(temporary,{recursive:true,force:true}); }
