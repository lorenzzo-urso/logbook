// Checagem do que quebra em silêncio: dedupe de URL, validação do data.json,
// índice de busca, posts e feed.
// Rodar: node tools/selftest.mjs
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
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

// A normalização de URL existe em dois runtimes; divergir quebra o dedupe da
// captura por issue sem ninguém perceber.
const normPy = (u) => execFileSync('python3', ['-c',
  'import sys;sys.path.insert(0,"tools");from issue_to_entry import norm_url;print(norm_url(sys.argv[1]),end="")',
  u], { cwd: root, encoding: 'utf8' });
for (const u of ['https://X.com/a/', 'https://x.com/a?utm_source=n&p=1', 'https://x.com/a#b']) {
  assert.equal(normPy(u), normUrl(u), `normUrl divergente para ${u}`);
}

// ── schema: nada de data de consumo inventada ────────────────────────────────
const e = createEntry();
assert.equal(e.dates.consumed, null);
assert.equal(e.status, 'quero ler');
assert.deepEqual(e.related, []);
assert.ok(!('changelog' in e) && !('links' in e));

// ── validação: o data.json tem quatro escritores, um write ruim é silencioso ──
const validar = (obj) => {
  const f = join(root, 'tmp-validate.json');
  writeFileSync(f, JSON.stringify(obj));
  try {
    execFileSync('python3', [join(root, 'tools/validate_data.py'), f], { cwd: root, stdio: 'pipe' });
    return true;
  } catch { return false; } finally { rmSync(f); }
};
const entradaBoa = () => ({
  id: 'a1', type: 'conteudo', subtype: 'artigo', title: 'X', status: 'quero ler',
  tags: ['ia'], rating: 0, url: 'https://x.com/a', related: [], quotes: [],
  dates: { captured: '2026-07-01', consumed: null }, createdAt: '2026-07-01T00:00:00Z',
});
assert.ok(validar({ entries: [entradaBoa()] }), 'entrada válida foi recusada');
assert.ok(!validar({ entries: [entradaBoa(), { ...entradaBoa() }] }), 'id repetido passou');
assert.ok(!validar({ entries: [{ ...entradaBoa(), status: 'lido' }] }), 'status inválido passou');
assert.ok(!validar({ entries: [{ ...entradaBoa(), subtype: 'podcast' }] }), 'subtype inválido passou');
assert.ok(!validar({ entries: [{ ...entradaBoa(), rating: 9 }] }), 'rating fora da faixa passou');
assert.ok(!validar({ entries: [{ ...entradaBoa(), private: true }] }), 'entrada privada publicada passou');
assert.ok(!validar({ entries: [{ ...entradaBoa(), url: 'x.com' }] }), 'url sem protocolo passou');
assert.ok(!validar({ entries: [{ ...entradaBoa(), dates: { captured: '01/07/2026' } }] }), 'data fora do ISO passou');
assert.ok(!validar({ entries: [{ ...entradaBoa(), dates: { captured: '2026-07-01', consumed: '2026-07-02' } }] }),
  'consumed em item não consumido passou');
const { tags, ...semTags } = entradaBoa();
assert.ok(!validar({ entries: [semTags] }), 'entrada sem campo obrigatório passou');
// E o data.json de verdade precisa estar válido.
execFileSync('python3', [join(root, 'tools/validate_data.py')], { cwd: root, stdio: 'pipe' });

// ── atualização por issue: é o que faz as ações do site funcionarem ──────────
{
  const orig = readFileSync(join(root, 'data.json'), 'utf8');
  const alvo = JSON.parse(orig).entries[0];
  const corpo = join(root, 'tmp-issue.txt');
  const aplicar = (campos) => {
    writeFileSync(corpo, Object.entries(campos).map(([k, v]) => `### ${k}\n\n${v}\n`).join('\n'));
    execFileSync('python3', [join(root, 'tools/issue_update.py'), corpo], { cwd: root, stdio: 'pipe' });
    return JSON.parse(readFileSync(join(root, 'data.json'), 'utf8')).entries.find(e => e.id === alvo.id);
  };
  try {
    let e = aplicar({ 'ID da entrada': alvo.id, 'Ação': 'comecei', 'Total de páginas': '288', 'Página atual': '40' });
    assert.equal(e.status, 'em andamento');
    assert.equal(e.pages, 288);
    assert.equal(e.pagesRead, 40);
    assert.ok(e.dates.started, 'dates.started tem de ser preenchido (setdefault não serve: a chave já existe com null)');
    assert.equal(e.dates.consumed, null);

    e = aplicar({ 'ID da entrada': alvo.id, 'Ação': 'trecho', 'Trecho ou nota': 'frase guardada', 'Página atual': '42' });
    assert.deepEqual(e.quotes.at(-1), { text: 'frase guardada', page: 'p. 42' });

    e = aplicar({ 'ID da entrada': alvo.id, 'Ação': 'terminei' });
    assert.equal(e.status, 'consumido');
    assert.ok(e.dates.consumed, 'terminei precisa datar o consumo');
    assert.equal(e.pagesRead, e.pages, 'terminei fecha o progresso');

    // Ação inválida e id inexistente têm de falhar em vez de gravar lixo.
    for (const ruim of [{ 'ID da entrada': alvo.id, 'Ação': 'inventada' }, { 'ID da entrada': 'nao-existe', 'Ação': 'terminei' }]) {
      writeFileSync(corpo, Object.entries(ruim).map(([k, v]) => `### ${k}\n\n${v}\n`).join('\n'));
      assert.throws(() => execFileSync('python3', [join(root, 'tools/issue_update.py'), corpo], { cwd: root, stdio: 'pipe' }));
    }
    execFileSync('python3', [join(root, 'tools/validate_data.py')], { cwd: root, stdio: 'pipe' });
  } finally {
    writeFileSync(join(root, 'data.json'), orig);
    rmSync(corpo, { force: true });
  }
}

// ── busca no texto guardado ──────────────────────────────────────────────────
{
  const dir = join(root, 'archive');
  const alvo = JSON.parse(readFileSync(join(root, 'data.json'), 'utf8')).entries[0];
  const f = join(dir, `${alvo.id}.md`);
  const orfao = join(dir, 'nao-existe-no-data.md');
  mkdirSync(dir, { recursive: true });
  writeFileSync(f, `# ${alvo.title}\n\n> Arquivado em 2026-01-01 de ${alvo.url}\n\n---\n\npalavraunicaparaoteste no corpo.\n`);
  writeFileSync(orfao, '---\n\nlixo de entrada apagada\n');
  try {
    execFileSync('python3', [join(root, 'tools/build_search.py')], { cwd: root, stdio: 'pipe' });
    const idx = JSON.parse(readFileSync(join(root, 'search.json'), 'utf8'));
    assert.ok(idx[alvo.id]?.includes('palavraunicaparaoteste'), 'texto não entrou no índice');
    assert.ok(!idx[alvo.id].includes('Arquivado em'), 'cabeçalho do arquivo vazou para o índice');
    assert.ok(!('nao-existe-no-data' in idx), 'texto órfão não pode entrar no índice');
  } finally {
    rmSync(f); rmSync(orfao);
    execFileSync('python3', [join(root, 'tools/build_search.py')], { cwd: root, stdio: 'pipe' });
  }
}

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

  // ── página estática do artigo: rota em hash não carrega meta tag ──────────
  const pagina = readFileSync(join(root, 'p/teste-selftest/index.html'), 'utf8');
  assert.ok(pagina.includes('<meta property="og:title" content="Teste">'), 'og:title ausente');
  assert.ok(pagina.includes('rel="canonical"'), 'canonical ausente');
  assert.ok(pagina.includes('<strong>negrito</strong>'), 'corpo não foi pré-renderizado');
  assert.ok(pagina.includes(cited.title.slice(0, 20)), 'referência sem título na página');
} finally {
  rmSync(tmp);
  execFileSync('python3', [join(root, 'tools/build_posts.py')], { cwd: root });
  execFileSync('python3', [join(root, 'tools/gen_feed.py')], { cwd: root });
}

console.log('selftest ok');
