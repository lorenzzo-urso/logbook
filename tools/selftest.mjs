// Checagem mínima do que quebra em silêncio: dedupe de URL e geração do feed.
// Rodar: node tools/selftest.mjs
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
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

// ── posts: front matter, draft e resolução de referências ────────────────────
execFileSync('python3', [join(root, 'tools/build_posts.py')], { cwd: root });
const data = JSON.parse(readFileSync(join(root, 'data.json'), 'utf8'));
const posts = JSON.parse(readFileSync(join(root, 'posts.json'), 'utf8')).posts;
assert.ok(Array.isArray(posts));
assert.ok(!posts.some(p => p.slug === 'exemplo'), 'draft: true não pode publicar');

// Um post temporário exercita front matter, slug, refs por URL e draft off.
const tmp = join(root, 'posts/9999-01-02-teste-selftest.md');
const cited = data.entries.find(e => e.url);
writeFileSync(tmp, `---\ntitle: Teste\ndate: 9999-01-02\ntags: um, DOIS\nrefs:\n  - ${cited.url}\n  - https://nao-catalogado.example/x\n---\n\nCorpo com **negrito**.\n`);
try {
  execFileSync('python3', [join(root, 'tools/build_posts.py')], { cwd: root });
  const p = JSON.parse(readFileSync(join(root, 'posts.json'), 'utf8')).posts
    .find(x => x.slug === 'teste-selftest');
  assert.ok(p, 'post não foi publicado');
  assert.equal(p.title, 'Teste');
  assert.deepEqual(p.tags, ['um', 'dois']);          // tag normalizada
  assert.ok(p.html.includes('<strong>negrito</strong>'), 'markdown não virou HTML');
  assert.ok(!p.html.includes('title: Teste'), 'front matter vazou para o corpo');
  assert.deepEqual(p.refs[0], { id: cited.id });     // URL resolvida para a entrada
  assert.ok(p.refs[1].url, 'ref externa deve sobreviver como URL');

  // ── feed: escritos e materiais na mesma linha do tempo ────────────────────
  execFileSync('python3', [join(root, 'tools/gen_feed.py')], { cwd: root });
  const feed = readFileSync(join(root, 'feed.xml'), 'utf8');
  assert.ok(feed.startsWith('<?xml'));
  assert.ok(!/&(?!amp;|lt;|gt;|quot;|apos;|#)/.test(feed), 'XML com & não escapado');
  assert.ok(feed.match(/<item>/g).length <= 30);
  const first = feed.slice(feed.indexOf('<item>'), feed.indexOf('</item>'));
  assert.ok(first.includes('post:teste-selftest'), 'feed não está ordenado por data desc');
} finally {
  rmSync(tmp);
  execFileSync('python3', [join(root, 'tools/build_posts.py')], { cwd: root });
  execFileSync('python3', [join(root, 'tools/gen_feed.py')], { cwd: root });
}

console.log('selftest ok');
