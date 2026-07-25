// Checagem mínima do que quebra em silêncio: dedupe de URL e geração do feed.
// Rodar: node tools/selftest.mjs
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { normUrl, normTag, createEntry } from '../extension/utils/schema.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// ── dedupe: o que a fila considera "a mesma página" ──────────────────────────
const same = (a, b) => assert.equal(normUrl(a), normUrl(b), `${a} != ${b}`);
same('https://x.com/a/', 'https://x.com/a');
same('https://x.com/a?utm_source=n', 'https://x.com/a');
same('https://X.com/A', 'https://x.com/A');          // host normalizado
same('https://x.com/a#secao', 'https://x.com/a');
assert.notEqual(normUrl('https://x.com/a'), normUrl('https://x.com/b'));
assert.notEqual(normUrl('https://x.com/a?p=1'), normUrl('https://x.com/a'));  // query real conta
assert.equal(normUrl(''), '');
assert.equal(normUrl('não é url'), 'não é url');     // não explode em lixo

assert.equal(normTag('  IA '), 'ia');

// ── schema: nada de data de consumo inventada ────────────────────────────────
const e = createEntry();
assert.equal(e.dates.consumed, null);
assert.equal(e.status, 'quero ler');
assert.deepEqual(e.related, []);
assert.ok(!('changelog' in e) && !('links' in e));

// ── feed: gera e confere contra o data.json ──────────────────────────────────
execFileSync('python3', [join(root, 'tools/gen_feed.py')], { cwd: root });
const feed = readFileSync(join(root, 'feed.xml'), 'utf8');
const data = JSON.parse(readFileSync(join(root, 'data.json'), 'utf8'));
const items = feed.match(/<item>/g)?.length ?? 0;
assert.equal(items, Math.min(30, data.entries.length));
assert.ok(feed.startsWith('<?xml'));
assert.ok(!/&(?!amp;|lt;|gt;|quot;|apos;|#)/.test(feed), 'XML com & não escapado');
// item mais recente primeiro
const first = feed.slice(feed.indexOf('<item>'), feed.indexOf('</item>'));
const newest = [...data.entries].sort((a, b) =>
  String((b.dates?.consumed || b.dates?.captured || '')).localeCompare(
    String(a.dates?.consumed || a.dates?.captured || '')))[0];
assert.ok(first.includes(newest.id), 'feed não está ordenado por data desc');

console.log('selftest ok');
