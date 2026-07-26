// LogBook — fonte do site. Transpilado por ./build.sh (esbuild, só JSX).
// React de produção vem de vendor/. Sem bundler, sem npm.
//
// Redesign 2026-07: navegação em três grupos (Consumo / Produção / Descobrir),
// marca minúscula, registro rápido em ⌘K e conexões explícitas entre o que eu
// li e o que produzi.
//
// O design de origem especifica a paleta crua (--sand-200 etc.). Aqui usamos os
// tokens semânticos equivalentes — mesmo valor em claro, e o modo escuro
// continua funcionando.

// ── DADOS ────────────────────────────────────────────────────────────────────
// ponytail: globais preenchidas pelo fetch antes do primeiro render (App só
// renderiza depois de _loaded). Vira context se algum dia houver escrita no client.
let ENTRIES = [];
let CONTENT = [];
let PROJECTS = [];
let POSTS = [];
let ALIASES = {};

// O repositório é público e estático: nada aqui escreve. As ações de escrita
// abrem uma issue pré-preenchida, que uma Action converte em commit.
const REPO_PADRAO = 'lorenzzo-urso/logbook';
function repoSlug() {
  const m = location.hostname.match(/^([^.]+)\.github\.io$/);
  if (m) {
    const repo = location.pathname.split('/').filter(Boolean)[0];
    if (repo) return `${m[1]}/${repo}`;
  }
  return REPO_PADRAO;
}
function issueUrl(template, params = {}) {
  const qs = new URLSearchParams();
  qs.set('template', template);
  Object.entries(params).forEach(([k, v]) => { if (v || v === 0) qs.set(k, String(v)); });
  return `https://github.com/${repoSlug()}/issues/new?${qs}`;
}
const abrirIssue = (template, params) => window.open(issueUrl(template, params), '_blank', 'noopener');

// As ações de escrita (Começar, Terminei, progresso, trecho) só o dono usa — a
// Action recusa issue de terceiro. Ficam escondidas até você ligar o modo edição
// visitando #/editor neste aparelho. Não é segurança, é não mostrar botão que o
// visitante não pode usar.
let MODO_EDICAO = false;
function lerModoEdicao() {
  try { return localStorage.getItem('logbook:editor') === '1'; } catch { return false; }
}
function alternarModoEdicao() {
  const novo = !lerModoEdicao();
  try { localStorage.setItem('logbook:editor', novo ? '1' : '0'); } catch { /* modo privado */ }
  MODO_EDICAO = novo;
  return novo;
}

// Quem cita esta entrada — fecha o ciclo leitura → produção.
const citedIn = (id) => POSTS.filter(p => (p.refs || []).some(r => r.id === id));

const TYPE_META = [
  { key: 'artigo', label: 'Artigos' },
  { key: 'livro', label: 'Livros' },
  { key: 'vídeo', label: 'Vídeos' },
  { key: 'curso', label: 'Cursos' },
  { key: 'treinamento', label: 'Treinamentos' },
  { key: 'notícia', label: 'Notícias' },
];
const ABBR = {
  artigo: 'ART', livro: 'LIV', 'vídeo': 'VID', curso: 'CUR',
  treinamento: 'TRE', 'notícia': 'NOT', projeto: 'PRJ', escrito: 'ESC',
};

// Tag só vira "tema" com 2+ entradas — a maioria das tags aparece uma vez só.
const THEME_MIN = 2;
function themeCounts() {
  const m = {};
  ENTRIES.forEach(e => (e.tags || []).forEach(t => { m[t] = (m[t] || 0) + 1; }));
  return Object.entries(m).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
const mainThemes = () => themeCounts().filter(([, n]) => n >= THEME_MIN);
const minorThemes = () => themeCounts().filter(([, n]) => n < THEME_MIN);

// ── DATAS ────────────────────────────────────────────────────────────────────
// A data que importa é quando aconteceu, não quando foi clipado.
function entryDate(e) {
  const d = e.dates || {};
  return d.consumed || d.launched || d.started || d.end || d.captured
    || (e.createdAt || '').slice(0, 10) || null;
}
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MES_CURTO = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function monthLabel(iso) {
  if (!iso) return 'sem data';
  const [y, m] = iso.split('-');
  return `${MESES[Number(m) - 1] || '?'} de ${y}`;
}
function shortDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y.slice(2)}`;
}
// "18 JUN" + "qui" — as duas linhas da coluna de data do log.
function dayParts(iso) {
  if (!iso) return { dia: '—', semana: '' };
  const [y, m, d] = iso.split('-').map(Number);
  return { dia: `${String(d).padStart(2, '0')} ${MES_CURTO[m - 1]}`, semana: SEMANA[new Date(y, m - 1, d).getDay()] };
}
const byDateDesc = (a, b) => String(entryDate(b) || '').localeCompare(String(entryDate(a) || ''));

function daysSince(iso) {
  if (!iso) return null;
  const d = Math.floor((Date.now() - new Date(iso + 'T00:00:00').getTime()) / 86400000);
  return d >= 0 ? d : null;
}
function relTime(iso) {
  const d = daysSince(iso);
  if (d == null) return null;
  if (d === 0) return 'hoje';
  if (d === 1) return 'ontem';
  if (d < 30) return `há ${d} dias`;
  const m = Math.round(d / 30);
  return m <= 1 ? 'há 1 mês' : `há ${m} meses`;
}
// Quanto tempo um item está parado na fila. Fila sem pressão vira depósito.
function waitingDays(e) {
  return daysSince((e.dates || {}).captured || (e.createdAt || '').slice(0, 10));
}
// "dia N do log": derivado da primeira captura. Sem entradas, não existe.
function dayOfLog() {
  const datas = ENTRIES.map(e => (e.dates || {}).captured).filter(Boolean).sort();
  if (!datas.length) return null;
  const d = daysSince(datas[0]);
  return d == null ? null : d + 1;
}
function hojeLabel() {
  const agora = new Date();
  const base = `${SEMANA[agora.getDay()].toUpperCase()} · ${agora.getDate()} ${MES_CURTO[agora.getMonth()]} ${agora.getFullYear()}`;
  const n = dayOfLog();
  return n ? `${base} · dia ${n} do log` : base;
}

// Progresso de leitura. Só existe quando pages foi preenchido.
function progresso(e) {
  const total = Number(e.pages) || 0;
  if (total <= 0) return null;
  const lidas = Math.max(0, Math.min(Number(e.pagesRead) || 0, total));
  return { lidas, total, pct: Math.round((lidas / total) * 100) };
}

const authorsOf = (e) => String(e.author || '').split(/,| e |&/).map(a => a.trim()).filter(a => a.length > 2);
const authorSlug = (a) => a.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function authorCounts() {
  const m = {};
  ENTRIES.forEach(e => authorsOf(e).forEach(a => {
    const k = authorSlug(a);
    if (!k) return;
    m[k] = m[k] || { name: a, n: 0 };
    m[k].n++;
  }));
  return Object.entries(m).sort((x, y) => y[1].n - x[1].n || x[1].name.localeCompare(y[1].name));
}

// ── CONSUMO / PRODUÇÃO ───────────────────────────────────────────────────────
const lendo = () => ENTRIES.filter(e => e.status === 'em andamento' && e.type !== 'projeto');
const naFila = () => ENTRIES.filter(e => e.status === 'quero ler' || e.status === 'na fila')
  .sort((a, b) => (waitingDays(b) || 0) - (waitingDays(a) || 0));
const consumidos = () => ENTRIES.filter(e => e.status === 'consumido');

// Projetos e escritos numa lista só: é o que a aba Produção mostra.
function producaoItems() {
  const projetos = PROJECTS.map(p => ({ kind: 'projeto', id: p.id, entry: p, date: entryDate(p) }));
  const escritos = POSTS.map(p => ({ kind: 'escrito', id: 'post:' + p.slug, post: p, date: p.date }));
  return [...projetos, ...escritos].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
}
// Procedência: de onde este item de produção veio.
function procedencia(item) {
  const ids = item.kind === 'projeto'
    ? (item.entry.related || []).map(r => r.id)
    : (item.post.refs || []).filter(r => r.id).map(r => r.id);
  return ids.map(id => ENTRIES.find(e => e.id === id)).filter(Boolean);
}
function itemTags(item) {
  return item.kind === 'projeto' ? (item.entry.tags || []) : (item.post.tags || []);
}
// Quanto de cada tema virou produção — alimenta a barra amber↔slate.
function themeStats(tag) {
  const consumo = ENTRIES.filter(e => e.type !== 'projeto' && (e.tags || []).includes(tag));
  const producao = producaoItems().filter(i => itemTags(i).includes(tag));
  return {
    consumo, producao,
    projetos: producao.filter(i => i.kind === 'projeto').length,
    escritos: producao.filter(i => i.kind === 'escrito').length,
    fila: consumo.filter(e => e.status === 'quero ler' || e.status === 'na fila').length,
  };
}

// ── ÍCONES ───────────────────────────────────────────────────────────────────
const IcoPlus = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
const IcoSearch = () => <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true"><circle cx="5.8" cy="5.8" r="4.2" stroke="currentColor" strokeWidth="1.5" /><path d="M9.2 9.2 12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;
const IcoArrow = () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M2 6.5h9M7 2.5l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const IcoClock = () => <svg width="14" height="14" viewBox="0 0 15 15" fill="none" aria-hidden="true"><circle cx="7.5" cy="7.5" r="5.8" stroke="currentColor" strokeWidth="1.4" /><path d="M7.5 4.2v3.6l2.3 1.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const IcoBook = () => <svg width="14" height="14" viewBox="0 0 15 15" fill="none" aria-hidden="true"><rect x="2" y="1.5" width="8" height="11" rx="1" stroke="currentColor" strokeWidth="1.4" /><path d="M10 3.5h1.4A1.4 1.4 0 0 1 12.8 5v7.1a1.4 1.4 0 0 1-1.4 1.4H10" stroke="currentColor" strokeWidth="1.3" /></svg>;
const IcoLayers = () => <svg width="14" height="14" viewBox="0 0 15 15" fill="none" aria-hidden="true"><rect x="1.5" y="2" width="12" height="2.6" rx="1" fill="currentColor" /><rect x="1.5" y="6.2" width="12" height="2.6" rx="1" fill="currentColor" opacity=".6" /><rect x="1.5" y="10.4" width="12" height="2.6" rx="1" fill="currentColor" opacity=".3" /></svg>;
const IcoGrid = () => <svg width="14" height="14" viewBox="0 0 15 15" fill="none" aria-hidden="true"><rect x="1.5" y="1.5" width="5" height="5" rx="1.4" fill="currentColor" /><rect x="8.5" y="1.5" width="5" height="5" rx="1.4" fill="currentColor" opacity=".55" /><rect x="1.5" y="8.5" width="5" height="5" rx="1.4" fill="currentColor" opacity=".55" /><rect x="8.5" y="8.5" width="5" height="5" rx="1.4" fill="currentColor" opacity=".25" /></svg>;
const IcoPencil = () => <svg width="14" height="14" viewBox="0 0 15 15" fill="none" aria-hidden="true"><path d="M10.5 1.8l2.7 2.7-7.4 7.4-3.4.7.7-3.4 7.4-7.4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><path d="M9.2 3.1l2.7 2.7" stroke="currentColor" strokeWidth="1.2" /></svg>;
const IcoUser = () => <svg width="14" height="14" viewBox="0 0 15 15" fill="none" aria-hidden="true"><circle cx="7.5" cy="4.8" r="2.6" stroke="currentColor" strokeWidth="1.4" /><path d="M2.6 13c0-2.5 2.2-4.2 4.9-4.2s4.9 1.7 4.9 4.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>;
const IcoTheme = () => <svg width="14" height="14" viewBox="0 0 15 15" fill="none" aria-hidden="true"><circle cx="4" cy="4" r="2.5" fill="currentColor" /><circle cx="11" cy="4" r="2.5" fill="currentColor" opacity=".6" /><circle cx="4" cy="11" r="2.5" fill="currentColor" opacity=".6" /><circle cx="11" cy="11" r="2.5" fill="currentColor" opacity=".3" /></svg>;

// ── MARCA ────────────────────────────────────────────────────────────────────
// As três barras são a legenda de cor do app: entrada, fila, o que virou projeto.
function MarcaIcone({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden="true" style={{ flexShrink: 0, display: 'block' }}>
      <rect width="26" height="26" rx="7" fill="var(--sand-900)" />
      <rect x="6" y="7" width="14" height="2.4" rx="1.2" fill="var(--amber-400)" />
      <rect x="6" y="12" width="9" height="2.4" rx="1.2" fill="var(--sand-400)" />
      <rect x="6" y="17" width="5" height="2.4" rx="1.2" fill="var(--slate-300)" />
    </svg>
  );
}
function Marca({ size = 17, iconSize = 26, onClick }) {
  const conteudo = (
    <>
      <MarcaIcone size={iconSize} />
      <span style={{ fontFamily: 'var(--font-display)', fontSize: size, fontWeight: 600, letterSpacing: '-0.04em', color: 'var(--fg-primary)' }}>logbook</span>
    </>
  );
  if (!onClick) return <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>{conteudo}</span>;
  return (
    <button onClick={onClick} title="Hoje"
      style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
      {conteudo}
    </button>
  );
}

// ── PRIMITIVAS ───────────────────────────────────────────────────────────────
const _TYPE_STYLES = {
  artigo: 'artigo', livro: 'livro', 'vídeo': 'video', curso: 'curso',
  treinamento: 'treinamento', 'notícia': 'noticia', projeto: 'projeto', escrito: 'escrito',
};
const _STATUS_STYLES = {
  consumido: 'consumed', 'em andamento': 'progress', 'em progresso': 'progress',
  abandonado: 'abandoned', ideia: 'idea', iniciado: 'started', 'lançado': 'launched',
  pausado: 'paused', arquivado: 'archived', 'quero ler': 'idea', 'na fila': 'idea',
  rascunho: 'started', publicado: 'launched',
};
function tipoToken(chave, campo) {
  const k = _TYPE_STYLES[chave];
  return k ? `var(--type-${k}-${campo})` : `var(--${campo === 'bg' ? 'bg-elevated' : campo === 'fg' ? 'fg-muted' : 'border-subtle'})`;
}
function statusToken(chave, campo) {
  const k = _STATUS_STYLES[String(chave || '').toLowerCase()];
  return k ? `var(--status-${k}-${campo})` : `var(--${campo === 'bg' ? 'bg-elevated' : campo === 'fg' ? 'fg-muted' : 'border-subtle'})`;
}

// Badge de 3 letras (ART/LIV/PRJ/ESC) — a marcação do log e da timeline.
function TypeTag({ tipo }) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.06em', padding: '2px 5px',
      borderRadius: 3, background: tipoToken(tipo, 'bg'), color: tipoToken(tipo, 'fg'),
      border: `1px solid ${tipoToken(tipo, 'border')}`, flexShrink: 0, lineHeight: 1.3,
    }}>{ABBR[tipo] || String(tipo || '').slice(0, 3).toUpperCase()}</span>
  );
}
function Badge({ subtype, status, dot = false }) {
  const isStatus = status !== undefined;
  const chave = isStatus ? status : subtype;
  const bg = isStatus ? statusToken(chave, 'bg') : tipoToken(chave, 'bg');
  const fg = isStatus ? statusToken(chave, 'fg') : tipoToken(chave, 'fg');
  const bd = isStatus ? statusToken(chave, 'border') : tipoToken(chave, 'border');
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: dot ? 5 : 0, padding: '2px 8px',
      fontFamily: 'var(--font-body)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.05em',
      textTransform: 'uppercase', lineHeight: 1.5, borderRadius: 'var(--radius-full)',
      background: bg, color: fg, border: `1px solid ${bd}`, whiteSpace: 'nowrap',
    }}>
      {dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: fg, opacity: 0.75 }} />}
      {chave || '—'}
    </span>
  );
}
function Tag({ children, onClick, active = false }) {
  const [hov, setHov] = React.useState(false);
  return (
    <span onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-block', padding: '3px 9px', fontSize: 11.5, fontFamily: 'var(--font-body)',
        borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap', userSelect: 'none',
        cursor: onClick ? 'pointer' : 'default', transition: 'background 0.12s ease, border-color 0.12s ease',
        background: active ? 'var(--accent-content-subtle)' : (hov && onClick ? 'var(--bg-elevated)' : 'var(--bg-surface)'),
        color: active ? 'var(--accent-content-hover)' : 'var(--fg-secondary)',
        border: `1px solid ${active ? 'var(--accent-content-border)' : 'var(--border-subtle)'}`,
      }}>{children}</span>
  );
}
// Pill de ação: neutra, amber, verde ou vermelha.
function Pill({ children, onClick, tom = 'neutro', style }) {
  const [hov, setHov] = React.useState(false);
  const tons = {
    neutro: { bg: 'var(--bg-base)', fg: 'var(--fg-secondary)', bd: 'var(--border-default)', hover: 'var(--bg-elevated)' },
    amber: { bg: 'var(--accent-content-subtle)', fg: 'var(--accent-content-hover)', bd: 'var(--amber-300)', hover: 'var(--accent-content-light)' },
    verde: { bg: 'var(--green-50)', fg: 'var(--green-700)', bd: 'var(--green-200)', hover: 'var(--green-100)' },
    vermelho: { bg: 'var(--red-50)', fg: 'var(--red-700)', bd: 'var(--red-200)', hover: 'var(--red-100)' },
    slate: { bg: 'var(--accent-project-subtle)', fg: 'var(--accent-project-hover)', bd: 'var(--accent-project-border)', hover: 'var(--accent-project-light)' },
  };
  const t = tons[tom] || tons.neutro;
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: 11.5,
        fontFamily: 'var(--font-body)', cursor: 'pointer', whiteSpace: 'nowrap',
        background: hov ? t.hover : t.bg, color: t.fg, border: `1px solid ${t.bd}`,
        transition: 'background 0.12s ease, border-color 0.12s ease', ...style,
      }}>{children}</button>
  );
}
function Chip({ label, count, active, onClick, tom = 'amber' }) {
  const cor = tom === 'slate' ? 'var(--accent-project-hover)' : 'var(--accent-content-hover)';
  const bg = tom === 'slate' ? 'var(--accent-project-subtle)' : 'var(--accent-content-subtle)';
  const bd = tom === 'slate' ? 'var(--accent-project-border)' : 'var(--amber-300)';
  return (
    <button onClick={onClick} aria-pressed={active}
      style={{
        display: 'flex', alignItems: 'center', gap: 5, padding: '5px 13px',
        borderRadius: 'var(--radius-full)', fontSize: 13, fontFamily: 'var(--font-body)',
        fontWeight: active ? 600 : 400, cursor: 'pointer',
        background: active ? bg : 'transparent', color: active ? cor : 'var(--fg-secondary)',
        border: `1px solid ${active ? bd : 'var(--border-default)'}`,
        transition: 'background 0.12s ease, border-color 0.12s ease',
      }}>
      {label}
      {count != null && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, opacity: 0.7 }}>{count}</span>}
    </button>
  );
}
function Dots({ value, max = 5, size = 5 }) {
  if (!(value > 0)) return null;
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center', flexShrink: 0 }}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} style={{ width: size, height: size, borderRadius: '50%', background: i < value ? 'var(--accent-content)' : 'var(--border-default)' }} />
      ))}
    </span>
  );
}
// Label de seção: mono em caixa alta + régua ocupando o resto da linha.
function SectionLabel({ children, tom = 'sand', acao }) {
  const cor = tom === 'amber' ? 'var(--accent-content-hover)' : tom === 'slate' ? 'var(--accent-project-hover)' : 'var(--fg-muted)';
  const regua = tom === 'amber' ? 'var(--accent-content-border)' : tom === 'slate' ? 'var(--accent-project-border)' : 'var(--border-subtle)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: cor, whiteSpace: 'nowrap' }}>{children}</span>
      <span style={{ flex: 1, height: 1, background: regua }} />
      {acao}
    </div>
  );
}
function PageHead({ titulo, meta, sub, tomMeta = 'sand' }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--fg-primary)', margin: 0 }}>{titulo}</h1>
        {meta && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: tomMeta === 'slate' ? 'var(--accent-project-hover)' : 'var(--fg-muted)' }}>{meta}</span>}
      </div>
      {sub && <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--fg-secondary)', fontFamily: 'var(--font-body)' }}>{sub}</p>}
    </div>
  );
}
const Vazio = ({ children }) => (
  <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontStyle: 'italic', color: 'var(--fg-muted)', margin: '10px 0' }}>{children}</p>
);
function Progresso({ dados, mostrarTexto = true }) {
  if (!dados) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--border-subtle)', overflow: 'hidden' }}>
        <div style={{ width: `${dados.pct}%`, height: '100%', background: 'var(--accent-content)', borderRadius: 2 }} />
      </div>
      {mostrarTexto && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg-muted)', flexShrink: 0 }}>{dados.lidas}/{dados.total}</span>}
    </div>
  );
}
let _onDetail = null;
const abrirFicha = (e) => { if (e) location.hash = hashFor('e', e.id); };

// ── TELA: HOJE ───────────────────────────────────────────────────────────────
// Em cinco segundos: o que estou lendo e o que fiz com isso.
function HojeView({ prefs }) {
  const abertos = lendo();
  const fila = naFila();
  const temas = mainThemes();
  const producao = producaoItems();
  const lidos = consumidos().length;

  return (
    <div className="lb-hoje">
      <div>
        <header className="lb-hoje-head" style={{ borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--fg-primary)', margin: 0 }}>Hoje</h1>
          <span className="lb-so-desktop" style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--fg-muted)', letterSpacing: '0.04em' }}>{hojeLabel()}</span>
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--fg-muted)' }}>
            {lidos} consumidos · {fila.length} na fila · {temas.length} temas
          </span>
        </header>

        <div className="lb-hoje-corpo">
          <section style={{ marginBottom: 34 }}>
            <SectionLabel tom="amber">Lendo agora</SectionLabel>
            {abertos.length === 0
              ? <Vazio>Nada em andamento. Puxe um item da fila para começar.</Vazio>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {abertos.map(e => <CardLendo key={e.id} entry={e} />)}
                </div>}
          </section>

          <section>
            <SectionLabel acao={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg-disabled)' }}>últimos 30 dias</span>}>O log</SectionLabel>
            <LogDias dias={30} />
          </section>

          <footer style={{ marginTop: 40, paddingTop: 16, borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 14, alignItems: 'center' }}>
            <a href="./feed.xml" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-disabled)', textDecoration: 'none' }}>rss</a>
            <button onClick={() => { location.hash = hashFor('editor'); }}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-disabled)' }}>
              modo edição
            </button>
          </footer>
        </div>
      </div>

      <aside className="lb-hoje-aside" style={{ padding: '24px 24px 32px', display: 'flex', flexDirection: 'column', gap: 26 }}>
        {prefs.showConexoes && (
          <section>
            <SectionLabel tom="slate">Deu em algo</SectionLabel>
            {producao.length === 0
              ? <Vazio>Nada produzido ainda. Quando um projeto ou escrito citar uma leitura, ele aparece aqui.</Vazio>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {producao.slice(0, 3).map(i => <CardProducao key={i.id} item={i} compacto />)}
                </div>}
          </section>
        )}

        {prefs.showFila && fila.length > 0 && (
          <section>
            <SectionLabel tom="amber">A fila pressiona</SectionLabel>
            <p style={{ fontSize: 12.5, color: 'var(--fg-secondary)', margin: '0 0 12px', fontFamily: 'var(--font-body)' }}>
              {fila.length} esperando. O mais antigo há{' '}
              <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-content-hover)', fontWeight: 400 }}>{waitingDays(fila[0])} dias</strong>.
            </p>
            <div style={{ marginBottom: 12 }}>
              {fila.slice(0, 3).map(e => {
                const d = waitingDays(e);
                return (
                  <button key={e.id} onClick={() => abrirFicha(e)}
                    style={{ display: 'flex', alignItems: 'baseline', gap: 10, width: '100%', textAlign: 'left', padding: '8px 0', background: 'none', border: 'none', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
                    <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 13.5, color: 'var(--fg-primary)', lineHeight: 1.35 }}>{tituloCurto(e.title, 46)}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: d > 30 ? 'var(--accent-content-hover)' : 'var(--fg-muted)', flexShrink: 0 }}>{d}d</span>
                  </button>
                );
              })}
            </div>
            <Pill onClick={() => { location.hash = hashFor('consumo', 'fila'); }} style={{ width: '100%', padding: '7px 10px', fontSize: 12.5, background: 'var(--bg-surface)' }}>
              Puxar um para «lendo»
            </Pill>
          </section>
        )}

        {temas.length > 0 && (
          <section>
            <SectionLabel>Temas do mês</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {temas.slice(0, 8).map(([t, n], i) => (
                <Tag key={t} active={i === 0} onClick={() => { location.hash = hashFor('temas', t); }}>{t} · {n}</Tag>
              ))}
            </div>
          </section>
        )}
      </aside>
    </div>
  );
}

const tituloCurto = (t, n) => (String(t || '').length > n ? String(t).slice(0, n).trim() + '…' : String(t || ''));

// Card de "lendo agora": capa, progresso e as ações que reduzem fricção.
// Anotar/atualizar abrem um campo aqui mesmo; salvar vai por issue, porque o
// site é estático e não tem como escrever no repositório.
function CardLendo({ entry, compacto = false }) {
  const [modo, setModo] = React.useState(null);   // null | 'pagina' | 'trecho'
  const [valor, setValor] = React.useState('');
  const p = progresso(entry);
  const capa = compacto ? { w: 40, h: 58 } : { w: 52, h: 74 };

  const enviar = () => {
    if (!valor.trim()) return;
    abrirIssue('atualizar.yml', {
      title: `atualizar: ${tituloCurto(entry.title, 50)}`,
      id: entry.id,
      acao: modo === 'pagina' ? 'progresso' : 'trecho',
      pagina: modo === 'pagina' ? valor.trim() : '',
      texto: modo === 'trecho' ? valor.trim() : '',
    });
    setModo(null); setValor('');
  };

  return (
    <article style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
      borderLeft: '3px solid var(--accent-content)', borderRadius: 'var(--radius-lg)',
      padding: compacto ? '13px 15px' : '16px 18px', boxShadow: 'var(--shadow-sm)',
      display: 'flex', gap: compacto ? 12 : 16, flex: compacto ? 1 : undefined, minWidth: 0,
    }}>
      {entry.image && <img src={entry.image} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }}
        style={{ width: capa.w, height: capa.h, objectFit: 'cover', borderRadius: 3, flexShrink: 0, boxShadow: 'var(--shadow-sm)' }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
          <button onClick={() => abrirFicha(entry)}
            style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: compacto ? 15 : 16.5, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--fg-primary)', lineHeight: 1.3 }}>
            {tituloCurto(entry.title, compacto ? 40 : 70)}
          </button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg-disabled)', flexShrink: 0 }}>
            {compacto ? (p ? `${p.pct}%` : '') : relTime((entry.dates || {}).started || (entry.dates || {}).captured)}
          </span>
        </div>
        {!compacto && (
          <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--fg-secondary)', fontFamily: 'var(--font-body)' }}>
            {[entry.author, entry.subtype, entry.source].filter(Boolean).join(' · ')}
          </p>
        )}
        {p && <div style={{ marginBottom: compacto ? 0 : 12 }}><Progresso dados={p} mostrarTexto={!compacto} /></div>}

        {!compacto && MODO_EDICAO && modo === null && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Pill onClick={() => { setModo('trecho'); setValor(''); }}>Anotar trecho</Pill>
            <Pill onClick={() => { setModo('pagina'); setValor(p ? String(p.lidas) : ''); }}>Atualizar página</Pill>
            <Pill tom="verde" onClick={() => abrirIssue('atualizar.yml', { title: `atualizar: ${tituloCurto(entry.title, 50)}`, id: entry.id, acao: 'terminei' })}>Terminei</Pill>
            {p && p.pct < 25 && (
              <Pill tom="vermelho" onClick={() => { if (confirm(`Abandonar "${tituloCurto(entry.title, 40)}"?`)) abrirIssue('atualizar.yml', { title: `atualizar: ${tituloCurto(entry.title, 50)}`, id: entry.id, acao: 'abandonei' }); }}>Abandonar</Pill>
            )}
          </div>
        )}

        {!compacto && MODO_EDICAO && modo !== null && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            {modo === 'pagina'
              ? <input autoFocus type="number" min="0" value={valor} onChange={e => setValor(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') enviar(); if (e.key === 'Escape') setModo(null); }}
                  placeholder="página atual"
                  style={{ width: 110, padding: '5px 9px', fontSize: 12.5, fontFamily: 'var(--font-body)', background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--fg-primary)' }} />
              : <textarea autoFocus rows={2} value={valor} onChange={e => setValor(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Escape') setModo(null); }}
                  placeholder="o trecho que vale guardar"
                  style={{ flex: 1, padding: '6px 9px', fontSize: 13, fontFamily: 'var(--font-display)', background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--fg-primary)', resize: 'vertical' }} />}
            <Pill tom="amber" onClick={enviar}>Salvar</Pill>
            <Pill onClick={() => setModo(null)}>Cancelar</Pill>
          </div>
        )}
      </div>
    </article>
  );
}

// O log: um bloco por dia, coluna de data à esquerda.
function LogDias({ dias = 30, escopo = 'tudo', densidade = 'confortavel' }) {
  const registros = [];
  ENTRIES.forEach(e => {
    if (escopo === 'producao' && e.type !== 'projeto') return;
    if (escopo === 'consumo' && e.type === 'projeto') return;
    registros.push({ date: entryDate(e), kind: e.type === 'projeto' ? 'projeto' : 'consumo', entry: e });
  });
  if (escopo !== 'consumo') {
    POSTS.forEach(p => registros.push({ date: p.date, kind: 'escrito', post: p }));
  }

  const limite = dias ? Date.now() - dias * 86400000 : null;
  const validos = registros.filter(r => r.date && (!limite || new Date(r.date + 'T00:00:00').getTime() >= limite));
  if (!validos.length) return <Vazio>Nada registrado neste período.</Vazio>;

  const porDia = {};
  validos.forEach(r => { (porDia[r.date] = porDia[r.date] || []).push(r); });
  const ordenados = Object.entries(porDia).sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <div>
      {ordenados.map(([data, itens]) => {
        const { dia, semana } = dayParts(data);
        return (
          <div key={data} className="lb-log-dia" style={{ padding: densidade === 'compacta' ? '9px 0 8px' : '14px 0 12px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em' }}>
              <div style={{ color: 'var(--fg-muted)' }}>{dia}</div>
              <div style={{ color: 'var(--fg-disabled)' }}>{semana}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: densidade === 'compacta' ? 8 : 14, minWidth: 0 }}>
              {itens.map((r, i) => <LinhaLog key={i} reg={r} densidade={densidade} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LinhaLog({ reg, densidade = 'confortavel' }) {
  const compacta = densidade === 'compacta';
  if (reg.kind === 'escrito') {
    const p = reg.post;
    return (
      <div style={{ display: 'flex', gap: 9, minWidth: 0 }}>
        <TypeTag tipo="escrito" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <button onClick={() => { location.hash = hashFor('p', p.slug); }}
            style={{ textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 15, letterSpacing: '-0.015em', color: 'var(--fg-primary)', lineHeight: 1.35 }}>
            {p.title}
          </button>
          {!compacta && (p.refs || []).length > 0 && (
            <div style={{ marginTop: 4, paddingLeft: 8, borderLeft: '2px solid var(--accent-project-border)', fontSize: 12.5, color: 'var(--accent-project-hover)', fontFamily: 'var(--font-body)' }}>
              ↳ cita {p.refs.length} {p.refs.length === 1 ? 'leitura' : 'leituras'}
            </div>
          )}
        </div>
      </div>
    );
  }

  const e = reg.entry;
  const tipo = e.type === 'projeto' ? 'projeto' : e.subtype;
  const proc = e.type === 'projeto' ? procedencia({ kind: 'projeto', entry: e }) : [];
  return (
    <div style={{ display: 'flex', gap: 9, minWidth: 0, alignItems: 'flex-start' }}>
      <TypeTag tipo={tipo} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <button onClick={() => abrirFicha(e)}
          style={{ textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 15, letterSpacing: '-0.015em', color: 'var(--fg-primary)', lineHeight: 1.35 }}>
          {e.title}
        </button>
        <div style={{ fontSize: 12.5, color: 'var(--fg-muted)', fontFamily: 'var(--font-body)', marginTop: 2 }}>
          {[e.author, e.source].filter(Boolean).join(' · ')}
        </div>
        {!compacta && e.notes && (
          <p style={{ margin: '6px 0 0', paddingLeft: 10, borderLeft: '2px solid var(--accent-content-border)', fontFamily: 'var(--font-display)', fontSize: 13, fontStyle: 'italic', color: 'var(--fg-secondary)', lineHeight: 1.55 }}>
            {e.notes}
          </p>
        )}
        {!compacta && proc.length > 0 && (
          <div style={{ marginTop: 4, paddingLeft: 8, borderLeft: '2px solid var(--accent-project-border)', fontSize: 12.5, color: 'var(--accent-project-hover)' }}>
            ↳ nasceu de {proc.map(x => tituloCurto(x.title, 30)).join(' e ')}
          </div>
        )}
        {!compacta && (e.tags || []).length > 0 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
            {e.tags.slice(0, 4).map(t => <Tag key={t} onClick={() => { location.hash = hashFor('temas', t); }}>{t}</Tag>)}
          </div>
        )}
      </div>
      <Dots value={e.rating} />
    </div>
  );
}

// ── TELA: CONSUMO ────────────────────────────────────────────────────────────
// Junta o que era Backlog + Por tipo + Agora. O objetivo é a fila andar.
function ConsumoView({ arg }) {
  const [tipo, setTipo] = React.useState('all');
  const foco = arg === 'fila' || arg === 'lendo' ? arg : null;
  const abertos = lendo();
  const fila = naFila();
  const lidos = consumidos();
  const todos = ENTRIES.filter(e => e.type !== 'projeto');

  const filtra = (lista) => (tipo === 'all' ? lista : lista.filter(e => e.subtype === tipo));
  const filaFiltrada = filtra(fila);
  const parados = filaFiltrada.filter(e => (waitingDays(e) || 0) > 30).length;

  return (
    <div className="lb-tela" style={{ maxWidth: 900 }}>
      <PageHead
        titulo="Consumo"
        meta={`${todos.length} materiais · ${lidos.length} lidos · ${abertos.length} abertos · ${fila.length} esperando`}
        sub="A fila só faz sentido se andar. O que está parado há mais tempo sobe."
      />

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 26 }}>
        <Chip label="Tudo" count={todos.length} active={tipo === 'all'} onClick={() => setTipo('all')} />
        {TYPE_META.map(t => {
          const n = todos.filter(e => e.subtype === t.key).length;
          if (!n) return null;
          return <Chip key={t.key} label={t.label} count={n} active={tipo === t.key} onClick={() => setTipo(t.key)} />;
        })}
        <span style={{ marginLeft: 'auto', padding: '4px 11px', borderRadius: 'var(--radius-full)', border: '1px dashed var(--border-default)', fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg-muted)' }}>
          ordenar: mais parado primeiro
        </span>
      </div>

      {foco !== 'fila' && (
        <section style={{ marginBottom: 32 }}>
          <SectionLabel tom="amber">Abertos · {abertos.length}</SectionLabel>
          {abertos.length === 0
            ? <Vazio>Nada em andamento. Comece um item da fila abaixo.</Vazio>
            : <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {filtra(abertos).map(e => <CardLendo key={e.id} entry={e} compacto />)}
              </div>}
        </section>
      )}

      <section style={{ marginBottom: 32 }}>
        <SectionLabel acao={parados > 0 ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--accent-content-hover)' }}>{parados} parados há mais de 30 dias</span> : undefined}>
          Esperando · {filaFiltrada.length}
        </SectionLabel>
        {filaFiltrada.length === 0
          ? <Vazio>Fila vazia — adicione materiais com status "quero ler".</Vazio>
          : filaFiltrada.map((e, i) => <LinhaFila key={e.id} entry={e} destaque={i === 0} />)}
      </section>

      {foco !== 'fila' && (
        <section>
          <SectionLabel>Já li · {filtra(lidos).length}</SectionLabel>
          {filtra(lidos).length === 0
            ? <Vazio>Nada consumido ainda.</Vazio>
            : filtra(lidos).sort(byDateDesc).map(e => <LinhaBiblioteca key={e.id} entry={e} />)}
        </section>
      )}
    </div>
  );
}

function LinhaFila({ entry, destaque }) {
  const d = waitingDays(entry) || 0;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr auto auto', gap: 14, alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: d > 30 ? 'var(--accent-content-hover)' : 'var(--fg-muted)' }}>{d}d</span>
      <div style={{ minWidth: 0 }}>
        <button onClick={() => abrirFicha(entry)}
          style={{ textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 15, letterSpacing: '-0.015em', color: 'var(--fg-primary)', lineHeight: 1.35 }}>
          {entry.title}
        </button>
        <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2, fontFamily: 'var(--font-body)' }}>
          {[entry.author, entry.source].filter(Boolean).join(' · ')}
          {(entry.tags || []).length > 0 && ` · ${entry.tags.slice(0, 3).join(', ')}`}
        </div>
      </div>
      <TypeTag tipo={entry.subtype} />
      {MODO_EDICAO
        ? <Pill tom={destaque ? 'amber' : 'neutro'} style={{ padding: '7px 13px' }}
            onClick={() => abrirIssue('atualizar.yml', { title: `atualizar: ${tituloCurto(entry.title, 50)}`, id: entry.id, acao: 'comecei' })}>
            Começar
          </Pill>
        : <span />}
    </div>
  );
}

function LinhaBiblioteca({ entry }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr auto auto', gap: 14, alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)' }}>{shortDate(entryDate(entry))}</span>
      <div style={{ minWidth: 0 }}>
        <button onClick={() => abrirFicha(entry)}
          style={{ textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 15, letterSpacing: '-0.015em', color: 'var(--fg-primary)', lineHeight: 1.35 }}>
          {entry.title}
        </button>
        <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2, fontFamily: 'var(--font-body)' }}>
          {[entry.author, entry.source].filter(Boolean).join(' · ')}
        </div>
      </div>
      <TypeTag tipo={entry.subtype} />
      <Dots value={entry.rating} />
    </div>
  );
}

// ── TELA: PRODUÇÃO ───────────────────────────────────────────────────────────
// Cada item mostra de onde veio — é o que separa isto de uma lista de links.
function ProducaoView() {
  const itens = producaoItems();
  const projetos = itens.filter(i => i.kind === 'projeto').length;
  const escritos = itens.filter(i => i.kind === 'escrito').length;

  return (
    <div className="lb-tela" style={{ maxWidth: 760 }}>
      <PageHead
        titulo="Produção"
        tomMeta="slate"
        meta={`${projetos} ${projetos === 1 ? 'projeto' : 'projetos'} · ${escritos} ${escritos === 1 ? 'escrito' : 'escritos'}`}
        sub="Cada item mostra de onde veio. É o que separa isto de uma lista de links."
      />
      {itens.length === 0
        ? <Vazio>Nada produzido ainda. Registre um projeto na extensão ou escreva um artigo em posts/.</Vazio>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {itens.map(i => <CardProducao key={i.id} item={i} />)}
          </div>}
    </div>
  );
}

// A borda esquerda codifica o que é: sólida = projeto, tracejada = escrito.
function CardProducao({ item, compacto = false }) {
  const [hov, setHov] = React.useState(false);
  const escrito = item.kind === 'escrito';
  const status = escrito ? (item.post.draft ? 'rascunho' : 'publicado') : item.entry.status;
  const titulo = escrito ? item.post.title : item.entry.title;
  const resumo = escrito ? item.post.excerpt : (item.entry.pitch || item.entry.notes || '');
  const proc = procedencia(item);
  const borda = escrito
    ? '3px dashed var(--accent-project)'
    : `3px solid ${status === 'ideia' ? 'var(--slate-300)' : 'var(--accent-project)'}`;

  const abrir = () => { if (escrito) location.hash = hashFor('p', item.post.slug); else abrirFicha(item.entry); };

  return (
    <article onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: 'var(--bg-surface)', border: '1px solid var(--accent-project-border)', borderLeft: borda,
        borderRadius: 'var(--radius-lg)', padding: compacto ? '13px 15px' : '16px 18px',
        boxShadow: hov ? 'var(--card-hover-shadow)' : 'var(--shadow-sm)',
        transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7, flexWrap: 'wrap' }}>
        {compacto
          ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.06em', color: 'var(--accent-project-hover)', textTransform: 'lowercase' }}>
              {escrito ? 'Escrito' : 'Projeto'} · {status}
            </span>
          : <>
              <Badge subtype={escrito ? 'escrito' : 'projeto'} />
              {status && <Badge status={status} dot />}
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg-muted)' }}>{shortDate(item.date)}</span>
            </>}
      </div>

      <button onClick={abrir}
        style={{ display: 'block', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: compacto ? 14.5 : 17, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--fg-primary)', lineHeight: 1.3, marginBottom: resumo ? 6 : 0 }}>
        {titulo}
      </button>

      {!compacto && resumo && (
        <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--fg-secondary)', fontFamily: 'var(--font-body)', lineHeight: 1.5 }}>{tituloCurto(resumo, 180)}</p>
      )}

      {proc.length > 0 && (
        <div style={{ marginTop: 10, paddingTop: 9, borderTop: '1px dashed var(--border-default)', fontSize: 12.5, color: 'var(--fg-muted)', fontFamily: 'var(--font-body)' }}>
          ↳ {escrito ? 'cita' : 'nasceu de'}{' '}
          {proc.slice(0, 2).map((x, i) => (
            <React.Fragment key={x.id}>
              {i > 0 && ' e '}
              <button onClick={() => abrirFicha(x)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--accent-project-hover)', fontWeight: 500, fontFamily: 'inherit', fontSize: 'inherit' }}>
                {tituloCurto(x.title, 34)}
              </button>
            </React.Fragment>
          ))}
          {proc.length > 2 && ` e mais ${proc.length - 2}`}
        </div>
      )}
    </article>
  );
}

// ── TELA: TIMELINE ───────────────────────────────────────────────────────────
// O que entrou e o que saiu, na mesma coluna do tempo.
function TimelineView({ prefs, setPrefs }) {
  const [escopo, setEscopo] = React.useState('tudo');
  const densidade = prefs.density === 'compacta' ? 'compacta' : 'confortavel';

  const registros = [];
  ENTRIES.forEach(e => registros.push({ date: entryDate(e), kind: e.type === 'projeto' ? 'projeto' : 'consumo', entry: e }));
  POSTS.forEach(p => registros.push({ date: p.date, kind: 'escrito', post: p }));
  const visiveis = registros.filter(r => {
    if (!r.date) return false;
    if (escopo === 'consumo') return r.kind === 'consumo';
    if (escopo === 'producao') return r.kind !== 'consumo';
    return true;
  });

  const meses = {};
  visiveis.forEach(r => { (meses[r.date.slice(0, 7)] = meses[r.date.slice(0, 7)] || []).push(r); });
  const ordenados = Object.entries(meses).sort((a, b) => b[0].localeCompare(a[0]));
  const periodo = ordenados.length
    ? `${monthLabel(ordenados[ordenados.length - 1][0] + '-01')} → hoje · ${visiveis.length} registros`
    : 'nada registrado';

  return (
    <div className="lb-tela" style={{ maxWidth: 820 }}>
      <PageHead titulo="Timeline" meta={periodo} sub="O que entrou e o que saiu, lado a lado. Marcas em slate são coisas que eu produzi." />

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 24 }}>
        <button onClick={() => setEscopo('tudo')} aria-pressed={escopo === 'tudo'}
          style={{ padding: '5px 13px', borderRadius: 'var(--radius-full)', fontSize: 12.5, fontFamily: 'var(--font-body)', cursor: 'pointer', fontWeight: escopo === 'tudo' ? 600 : 400, background: escopo === 'tudo' ? 'var(--fg-primary)' : 'transparent', color: escopo === 'tudo' ? 'var(--bg-base)' : 'var(--fg-secondary)', border: `1px solid ${escopo === 'tudo' ? 'var(--fg-primary)' : 'var(--border-default)'}` }}>
          Tudo
        </button>
        <Chip label="Só consumo" active={escopo === 'consumo'} onClick={() => setEscopo('consumo')} />
        <Chip label="Só produção" tom="slate" active={escopo === 'producao'} onClick={() => setEscopo('producao')} />
        <button onClick={() => setPrefs({ density: densidade === 'compacta' ? 'confortavel' : 'compacta' })}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg-muted)' }}>
          densidade: {densidade === 'compacta' ? 'compacta' : 'confortável'}
        </button>
      </div>

      {ordenados.length === 0
        ? <Vazio>Nada registrado ainda.</Vazio>
        : ordenados.map(([mes, itens]) => (
            <div key={mes} style={{ marginBottom: 30 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--fg-primary)', margin: 0 }}>{monthLabel(mes + '-01')}</h2>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg-disabled)' }}>{itens.length} registros</span>
                <span style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
              </div>
              <DiasDoMes itens={itens} densidade={densidade} />
            </div>
          ))}
    </div>
  );
}

function DiasDoMes({ itens, densidade }) {
  const porDia = {};
  itens.forEach(r => { (porDia[r.date] = porDia[r.date] || []).push(r); });
  return (
    <div>
      {Object.entries(porDia).sort((a, b) => b[0].localeCompare(a[0])).map(([data, lista]) => {
        const { dia, semana } = dayParts(data);
        return (
          <div key={data} className="lb-log-dia" style={{ padding: densidade === 'compacta' ? '10px 0 4px' : '16px 0 6px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em' }}>
              <div style={{ color: 'var(--fg-muted)' }}>{dia}</div>
              <div style={{ color: 'var(--fg-disabled)' }}>{semana}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: densidade === 'compacta' ? 8 : 14, minWidth: 0 }}>
              {lista.map((r, i) => <LinhaLog key={i} reg={r} densidade={densidade} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── TELA: TEMAS ──────────────────────────────────────────────────────────────
// A barra mostra a proporção entre o que eu li e o que eu construí sobre o tema.
function TemasView({ tema }) {
  const principais = mainThemes();
  const avulsas = minorThemes();

  if (tema) {
    const st = themeStats(tema);
    return (
      <div className="lb-tela" style={{ maxWidth: 820 }}>
        <button onClick={() => { location.hash = hashFor('temas'); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', fontFamily: 'var(--font-body)', fontSize: 13, marginBottom: 14 }}>
          <span style={{ transform: 'rotate(180deg)', display: 'flex' }}><IcoArrow /></span> Todos os temas
        </button>
        <PageHead titulo={tema} meta={`${st.consumo.length} de consumo · ${st.producao.length} de produção`} />
        {st.producao.length > 0 && (
          <section style={{ marginBottom: 28 }}>
            <SectionLabel tom="slate">Deu em</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {st.producao.map(i => <CardProducao key={i.id} item={i} />)}
            </div>
          </section>
        )}
        <section>
          <SectionLabel>O que eu li</SectionLabel>
          {st.consumo.sort(byDateDesc).map(e => <LinhaBiblioteca key={e.id} entry={e} />)}
        </section>
      </div>
    );
  }

  return (
    <div className="lb-tela" style={{ maxWidth: 820 }}>
      <PageHead
        titulo="Temas"
        meta={`${principais.length} recorrentes · ${themeCounts().length} tags no total`}
        sub="A barra mostra a proporção entre o que eu li e o que eu construí sobre o tema."
      />
      {principais.length === 0
        ? <Vazio>Nenhum tema com duas entradas ainda.</Vazio>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {principais.map(([t, n]) => <CardTema key={t} tema={t} n={n} />)}
          </div>}
      {avulsas.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <SectionLabel>Tags com uma entrada · {avulsas.length}</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {avulsas.map(([t]) => <Tag key={t} onClick={() => { location.hash = hashFor('temas', t); }}>{t}</Tag>)}
          </div>
        </div>
      )}
    </div>
  );
}

function CardTema({ tema, n }) {
  const [hov, setHov] = React.useState(false);
  const st = themeStats(tema);
  const total = st.consumo.length + st.producao.length || 1;
  const pctConsumo = (st.consumo.length / total) * 100;
  const pctProducao = (st.producao.length / total) * 100;

  const ultimo = [...st.consumo].sort(byDateDesc)[0];
  const diagnostico = st.fila > st.consumo.length - st.fila
    ? `${st.fila} dos ${st.consumo.length} ainda na fila — tema mais acumulado que digerido`
    : ultimo ? `último: ${tituloCurto(ultimo.title, 52)} · ${shortDate(entryDate(ultimo))}` : null;

  const gerou = st.projetos || st.escritos
    ? [st.projetos && `${st.projetos} ${st.projetos === 1 ? 'projeto' : 'projetos'}`, st.escritos && `${st.escritos} ${st.escritos === 1 ? 'escrito' : 'escritos'}`].filter(Boolean).join(' · ')
    : 'nada ainda';

  return (
    <button onClick={() => { location.hash = hashFor('temas', tema); }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        textAlign: 'left', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)',
        border: `1px solid ${hov ? 'var(--border-default)' : 'var(--border-subtle)'}`,
        padding: '15px 17px', cursor: 'pointer', boxShadow: hov ? 'var(--card-hover-shadow)' : 'var(--shadow-sm)',
        transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
      }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginBottom: 10 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--fg-primary)' }}>{tema}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-disabled)' }}>{n} entradas</span>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-body)', fontSize: 12, color: gerou === 'nada ainda' ? 'var(--fg-disabled)' : 'var(--accent-project-hover)' }}>{gerou}</span>
      </div>
      <div style={{ display: 'flex', height: 5, borderRadius: 3, overflow: 'hidden', background: 'var(--border-subtle)', marginBottom: 9 }}>
        <div style={{ width: `${pctConsumo}%`, background: 'var(--accent-content)' }} />
        <div style={{ width: `${pctProducao}%`, background: 'var(--accent-project)' }} />
      </div>
      {diagnostico && <div style={{ fontSize: 12, color: 'var(--fg-secondary)', fontFamily: 'var(--font-body)' }}>{diagnostico}</div>}
    </button>
  );
}

// ── TELA: AUTORES ────────────────────────────────────────────────────────────
function AutoresView({ slug }) {
  const todos = authorCounts();

  if (slug) {
    const hit = todos.find(([k]) => k === slug);
    const itens = ENTRIES.filter(e => authorsOf(e).some(a => authorSlug(a) === slug)).sort(byDateDesc);
    return (
      <div className="lb-tela" style={{ maxWidth: 820 }}>
        <button onClick={() => { location.hash = hashFor('autores'); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', fontFamily: 'var(--font-body)', fontSize: 13, marginBottom: 14 }}>
          <span style={{ transform: 'rotate(180deg)', display: 'flex' }}><IcoArrow /></span> Todos os autores
        </button>
        <PageHead titulo={hit ? hit[1].name : slug} meta={`${itens.length} ${itens.length === 1 ? 'entrada' : 'entradas'}`} />
        {itens.map(e => <LinhaBiblioteca key={e.id} entry={e} />)}
      </div>
    );
  }

  const recorrentes = todos.filter(([, v]) => v.n >= 2);
  const avulsos = todos.filter(([, v]) => v.n < 2).sort((a, b) => a[1].name.localeCompare(b[1].name));

  return (
    <div className="lb-tela" style={{ maxWidth: 820 }}>
      <PageHead titulo="Autores" meta={`${todos.length} no total`} sub="Quem escreveu o que passou por aqui." />
      {recorrentes.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10, marginBottom: 28 }}>
          {recorrentes.map(([k, { name, n }]) => (
            <button key={k} onClick={() => { location.hash = hashFor('autores', k); }}
              style={{ textAlign: 'left', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--fg-primary)', marginBottom: 4 }}>{name}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)' }}>{n} entradas</div>
            </button>
          ))}
        </div>
      )}
      {avulsos.length > 0 && (
        <div>
          <SectionLabel>Com uma entrada · {avulsos.length}</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {avulsos.map(([k, { name }]) => <Tag key={k} onClick={() => { location.hash = hashFor('autores', k); }}>{name}</Tag>)}
          </div>
        </div>
      )}
      {todos.length === 0 && <Vazio>Nenhum autor registrado ainda.</Vazio>}
    </div>
  );
}

// ── TELA: ESCRITOS ───────────────────────────────────────────────────────────
function EscritosView() {
  if (!POSTS.length) return (
    <div className="lb-tela" style={{ maxWidth: 760 }}>
      <PageHead titulo="Escritos" sub="O que sai da leitura: artigos escritos a partir do que está aqui." />
      <Vazio>Nada publicado ainda. Escreva um .md em posts/ e rode ./build.sh.</Vazio>
    </div>
  );
  return (
    <div className="lb-tela" style={{ maxWidth: 760 }}>
      <PageHead titulo="Escritos" tomMeta="slate" meta={`${POSTS.length} ${POSTS.length === 1 ? 'artigo' : 'artigos'}`}
        sub="O que sai da leitura: artigos escritos a partir do que está aqui." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {POSTS.map(p => <CardProducao key={p.slug} item={{ kind: 'escrito', id: 'post:' + p.slug, post: p, date: p.date }} />)}
      </div>
    </div>
  );
}

function PostView({ slug }) {
  const post = POSTS.find(p => p.slug === slug);
  React.useEffect(() => { document.querySelector('.lb-main')?.scrollTo(0, 0); }, [slug]);
  if (!post) return (
    <div style={{ padding: '60px 32px', textAlign: 'center', color: 'var(--fg-muted)', fontFamily: 'var(--font-body)', fontSize: 13 }}>
      Artigo não encontrado. <a href="#/escritos" style={{ color: 'var(--accent-content)' }}>Ver todos</a>.
    </div>
  );

  return (
    <article className="lb-tela" style={{ maxWidth: 680 }}>
      <button onClick={() => { location.hash = hashFor('escritos'); }}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', fontFamily: 'var(--font-body)', fontSize: 13, marginBottom: 16 }}>
        <span style={{ transform: 'rotate(180deg)', display: 'flex' }}><IcoArrow /></span> Escritos
      </button>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.2, color: 'var(--fg-primary)', margin: '0 0 10px' }}>{post.title}</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 28, paddingBottom: 18, borderBottom: '1px solid var(--border-subtle)' }}>
        {post.date && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)' }}>{shortDate(post.date)}</span>}
        {(post.tags || []).map(t => <Tag key={t} onClick={() => { location.hash = hashFor('temas', t); }}>{t}</Tag>)}
      </div>

      <div className="cb-prose" dangerouslySetInnerHTML={{ __html: post.html }} />

      {(post.refs || []).length > 0 && (
        <section style={{ marginTop: 40, paddingTop: 22, borderTop: '1px solid var(--border-subtle)' }}>
          <SectionLabel tom="slate">Referências · {post.refs.length}</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {post.refs.map((r, i) => {
              const e = r.id && ENTRIES.find(x => x.id === r.id);
              if (e) return <LinhaBiblioteca key={e.id} entry={e} />;
              return (
                <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                  style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--accent-content)', wordBreak: 'break-all', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  {r.url}
                </a>
              );
            })}
          </div>
        </section>
      )}
    </article>
  );
}

// ── BUSCA ────────────────────────────────────────────────────────────────────
function SearchView({ query }) {
  const q = query.toLowerCase().trim();
  const resultados = q.length < 2 ? [] : ENTRIES.filter(e =>
    [e.title, e.author, e.notes, e.source, ...(e.tags || [])].join(' ').toLowerCase().includes(q)
  ).sort(byDateDesc);
  const posts = q.length < 2 ? [] : POSTS.filter(p =>
    [p.title, p.excerpt, ...(p.tags || [])].join(' ').toLowerCase().includes(q));

  // Texto guardado na captura: índice carregado só quando alguém busca de verdade.
  const [fullText, setFullText] = React.useState(null);
  React.useEffect(() => {
    if (q.length < 3 || fullText !== null) return;
    fetch('./search.json').then(r => r.ok ? r.json() : {}).then(setFullText).catch(() => setFullText({}));
  }, [q.length >= 3]);

  const achados = React.useMemo(() => {
    if (q.length < 3 || !fullText) return [];
    const listados = new Set(resultados.map(e => e.id));
    const out = [];
    for (const [id, texto] of Object.entries(fullText)) {
      if (listados.has(id)) continue;
      const pos = texto.toLowerCase().indexOf(q);
      if (pos === -1) continue;
      const entry = ENTRIES.find(e => e.id === id);
      if (entry) out.push({ entry, trecho: texto.slice(Math.max(0, pos - 90), pos + 160).trim() });
    }
    return out;
  }, [q, fullText, resultados.length]);

  if (q.length < 2) return (
    <div style={{ padding: '60px 32px', textAlign: 'center', color: 'var(--fg-disabled)', fontFamily: 'var(--font-body)', fontSize: 13 }}>
      Digite ao menos 2 caracteres para buscar.
    </div>
  );
  if (!resultados.length && !posts.length && !achados.length) return (
    <div style={{ padding: '60px 32px', textAlign: 'center', color: 'var(--fg-muted)', fontFamily: 'var(--font-body)', fontSize: 13 }}>
      Nenhum resultado para <strong>"{query}"</strong>.
    </div>
  );

  return (
    <div className="lb-tela" style={{ maxWidth: 820 }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)', marginBottom: 24 }}>
        {resultados.length + posts.length} resultado{resultados.length + posts.length !== 1 ? 's' : ''} para <strong style={{ color: 'var(--fg-primary)' }}>"{query}"</strong>
        {achados.length > 0 && ` · ${achados.length} no texto guardado`}
      </p>

      {posts.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <SectionLabel tom="slate">Escritos · {posts.length}</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {posts.map(p => <CardProducao key={p.slug} item={{ kind: 'escrito', id: 'post:' + p.slug, post: p, date: p.date }} />)}
          </div>
        </section>
      )}

      {resultados.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <SectionLabel>Materiais · {resultados.length}</SectionLabel>
          {resultados.map(e => <LinhaBiblioteca key={e.id} entry={e} />)}
        </section>
      )}

      {achados.length > 0 && (
        <section>
          <SectionLabel tom="amber">No texto guardado · {achados.length}</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {achados.map(({ entry, trecho }) => (
              <button key={entry.id} onClick={() => abrirFicha(entry)}
                style={{ textAlign: 'left', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '14px 17px', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <TypeTag tipo={entry.subtype} />
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--fg-primary)' }}>{entry.title}</span>
                </div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--fg-secondary)', lineHeight: 1.6, margin: 0 }}>…{destacar(trecho, q)}…</p>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// Mostra por que casou: sem o trecho, o resultado parece adivinhação.
function destacar(texto, termo) {
  const i = texto.toLowerCase().indexOf(termo);
  if (i === -1) return texto;
  return (
    <>
      {texto.slice(0, i)}
      <mark style={{ background: 'var(--accent-content-light)', color: 'var(--fg-primary)', padding: '0 2px', borderRadius: 2 }}>{texto.slice(i, i + termo.length)}</mark>
      {texto.slice(i + termo.length)}
    </>
  );
}

// ── FICHA DA ENTRADA ─────────────────────────────────────────────────────────
// As conexões ficam no fim do fluxo de leitura: nota → trechos → o que isso gerou.
function FichaModal({ entry, onClose }) {
  React.useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, []);
  if (!entry) return null;

  const projeto = entry.type === 'projeto';
  const tipo = projeto ? 'projeto' : (entry.subtype || 'artigo');
  const p = progresso(entry);
  const relacionadas = (entry.related || [])
    .map(r => ({ entry: ENTRIES.find(e => e.id === r.id), why: r.why }))
    .filter(r => r.entry);
  const citam = citedIn(entry.id);
  const secao = { marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' };
  const labelSecao = { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 8 };

  return (
    <div className="lb-sheet-bd" onClick={onClose}>
      <div className="lb-sheet" onClick={e => e.stopPropagation()} style={{ maxWidth: 620 }}>
        <div style={{ display: 'flex', gap: 16, padding: '22px 22px 0' }}>
          {entry.image && <img src={entry.image} alt="" onError={e => { e.currentTarget.style.display = 'none'; }}
            style={{ width: 74, height: 106, objectFit: 'cover', borderRadius: 4, flexShrink: 0, boxShadow: 'var(--shadow-sm)' }} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, flexWrap: 'wrap' }}>
              <Badge subtype={tipo} />
              {entry.status && <Badge status={p && entry.status === 'em andamento' ? `${entry.status} · ${p.pct}%` : entry.status} dot />}
              {entryDate(entry) && <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg-muted)' }}>{shortDate(entryDate(entry))}</span>}
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 23, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--fg-primary)', margin: 0, lineHeight: 1.25 }}>{entry.title}</h2>
            <p style={{ margin: '7px 0 0', fontSize: 13, color: 'var(--fg-muted)', fontFamily: 'var(--font-body)' }}>
              {authorsOf(entry).map((a, i) => (
                <React.Fragment key={a}>
                  {i > 0 && ', '}
                  <button onClick={() => { onClose(); location.hash = hashFor('autores', authorSlug(a)); }}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--accent-content-hover)', fontFamily: 'inherit', fontSize: 'inherit' }}>{a}</button>
                </React.Fragment>
              ))}
              {entry.source && (entry.author ? ' · ' : '') + entry.source}
              {p && ` · ${p.total} páginas`}
            </p>
          </div>
          <button onClick={onClose} aria-label="Fechar"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', fontSize: 18, lineHeight: 1, padding: 4, alignSelf: 'flex-start' }}>✕</button>
        </div>

        <div style={{ padding: '14px 22px 26px' }}>
          {MODO_EDICAO && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Pill onClick={() => abrirIssue('atualizar.yml', { title: `atualizar: ${tituloCurto(entry.title, 50)}`, id: entry.id, acao: 'progresso' })}
              style={{ background: 'var(--fg-primary)', color: 'var(--bg-base)', borderColor: 'var(--fg-primary)' }}>
              Atualizar progresso
            </Pill>
            <Pill onClick={() => abrirIssue('atualizar.yml', { title: `atualizar: ${tituloCurto(entry.title, 50)}`, id: entry.id, acao: 'trecho' })}>Anotar trecho</Pill>
            <Pill tom="slate" onClick={() => abrirIssue('atualizar.yml', { title: `atualizar: ${tituloCurto(entry.title, 50)}`, id: entry.id, acao: 'ligar' })}>Ligar a um projeto</Pill>
          </div>}

          {p && <div style={{ ...secao }}><div style={labelSecao}>Progresso</div><Progresso dados={p} /></div>}

          {(entry.tags || []).length > 0 && (
            <div style={secao}>
              <div style={labelSecao}>Temas</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {entry.tags.map(t => <Tag key={t} onClick={() => { onClose(); location.hash = hashFor('temas', t); }}>{t}</Tag>)}
              </div>
            </div>
          )}

          {entry.rating > 0 && (
            <div style={secao}><div style={labelSecao}>Avaliação</div><Dots value={entry.rating} size={8} /></div>
          )}

          {entry.notes && (
            <div style={secao}>
              <div style={labelSecao}>Minhas notas</div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 14.5, lineHeight: 1.65, color: 'var(--fg-secondary)', margin: 0, whiteSpace: 'pre-wrap' }}>{entry.notes}</p>
            </div>
          )}

          {(entry.quotes || []).length > 0 && (
            <div style={secao}>
              <div style={labelSecao}>Trechos · {entry.quotes.length}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {entry.quotes.map((q, i) => (
                  <blockquote key={i} style={{ margin: 0, paddingLeft: 12, borderLeft: '2px solid var(--amber-300)' }}>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: 13.5, lineHeight: 1.6, color: 'var(--fg-primary)', margin: 0 }}>{q.text}</p>
                    {q.page && <cite style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg-disabled)', fontStyle: 'normal' }}>{q.page}</cite>}
                  </blockquote>
                ))}
              </div>
            </div>
          )}

          {entry.description && (
            <div style={secao}><div style={labelSecao}>Descrição</div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 14, lineHeight: 1.6, color: 'var(--fg-secondary)', margin: 0, whiteSpace: 'pre-wrap' }}>{entry.description}</p>
            </div>
          )}

          {(relacionadas.length > 0 || citam.length > 0) && (
            <div style={secao}>
              <div style={{ ...labelSecao, color: 'var(--accent-project-hover)' }}>Isso me levou a</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {citam.map(post => (
                  <button key={post.slug} onClick={() => { onClose(); location.hash = hashFor('p', post.slug); }}
                    style={{ textAlign: 'left', background: 'var(--accent-project-subtle)', border: '1px solid var(--accent-project-border)', borderRadius: 'var(--radius-md)', padding: '10px 12px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                      <TypeTag tipo="escrito" />
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--fg-primary)' }}>{post.title}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>Cita este material.</div>
                  </button>
                ))}
                {relacionadas.map(({ entry: r, why }) => (
                  <button key={r.id} onClick={() => abrirFicha(r)}
                    style={{ textAlign: 'left', background: r.type === 'projeto' ? 'var(--accent-project-subtle)' : 'var(--bg-elevated)', border: `1px solid ${r.type === 'projeto' ? 'var(--accent-project-border)' : 'var(--border-subtle)'}`, borderRadius: 'var(--radius-md)', padding: '10px 12px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: why ? 3 : 0 }}>
                      <TypeTag tipo={r.type === 'projeto' ? 'projeto' : r.subtype} />
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--fg-primary)' }}>{tituloCurto(r.title, 52)}</span>
                    </div>
                    {why && <div style={{ fontSize: 12.5, color: 'var(--fg-muted)', lineHeight: 1.5 }}>{why}</div>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {entry.archived && (
            <div style={secao}>
              <a href={`./archive/${entry.id}.md`} target="_blank" rel="noopener noreferrer"
                style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--accent-content)' }}>↓ Trecho do texto guardado na captura</a>
            </div>
          )}

          {entry.url && (
            <div style={secao}>
              <a href={entry.url} target="_blank" rel="noopener noreferrer"
                style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--accent-content)', wordBreak: 'break-all' }}>{entry.url}</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ROTAS ────────────────────────────────────────────────────────────────────
// #/consumo/fila, #/temas/gestão, #/e/<id>, #/p/<slug> — tudo linkável.
const TABS = ['hoje', 'consumo', 'producao', 'escritos', 'timeline', 'temas', 'autores', 'editor'];
// Rotas da versão anterior continuam funcionando.
const LEGADO = { inicio: 'hoje', agora: 'consumo/lendo', backlog: 'consumo/fila', tipos: 'consumo', projetos: 'producao' };

function parseHash() {
  const cru = location.hash.replace(/^#\/?/, '');
  const partes = cru.split('/').map(p => { try { return decodeURIComponent(p); } catch { return p; } });
  const seg = partes[0] || 'hoje';
  const arg = partes.slice(1).join('/');
  if (seg === 'e') return { tab: null, entryId: arg, arg: '' };
  if (seg === 'p') return { tab: 'escritos', postSlug: arg, arg: '', entryId: null };
  if (LEGADO[seg]) return { redirect: LEGADO[seg] + (arg ? '/' + arg : '') };
  return { tab: TABS.includes(seg) ? seg : 'hoje', arg, entryId: null };
}
const hashFor = (to, arg) => '#/' + to + (arg ? '/' + encodeURIComponent(arg) : '');

// ── MODO EDIÇÃO ──────────────────────────────────────────────────────────────
function EditorView() {
  const [ligado, setLigado] = React.useState(lerModoEdicao());
  return (
    <div className="lb-tela" style={{ maxWidth: 560 }}>
      <PageHead titulo="Modo edição" sub="Liga as ações que alteram o log neste aparelho." />
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--fg-secondary)', lineHeight: 1.6, marginBottom: 18 }}>
        Com ele ligado aparecem <em>Começar</em>, <em>Terminei</em>, <em>Atualizar página</em> e
        <em> Anotar trecho</em>. Cada uma abre uma issue já preenchida no GitHub, e uma Action
        aplica a mudança — o site é estático e não escreve sozinho.
      </p>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--fg-muted)', lineHeight: 1.6, marginBottom: 18 }}>
        Só serve para você: a Action recusa issue de quem não é dono do repositório.
        Captura de material novo continua sendo pela extensão, ou pela issue de captura no celular.
      </p>
      <Pill tom={ligado ? 'verde' : 'amber'} style={{ padding: '9px 16px', fontSize: 13 }}
        onClick={() => setLigado(alternarModoEdicao())}>
        {ligado ? 'Ligado neste aparelho — desligar' : 'Ligar neste aparelho'}
      </Pill>
    </div>
  );
}

// ── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar({ tab, arg, onBuscar, query }) {
  const grupos = [
    { titulo: 'Consumo', itens: [
      { id: 'consumo/lendo', label: 'Lendo', n: lendo().length, ico: IcoClock },
      { id: 'consumo/fila', label: 'Fila', n: naFila().length, ico: IcoLayers },
      { id: 'consumo', label: 'Biblioteca', n: ENTRIES.filter(e => e.type !== 'projeto').length, ico: IcoBook },
    ] },
    { titulo: 'Produção', itens: [
      { id: 'producao', label: 'Projetos', n: PROJECTS.length, ico: IcoGrid },
      { id: 'escritos', label: 'Escritos', n: POSTS.length, ico: IcoPencil },
    ] },
    { titulo: 'Descobrir', itens: [
      { id: 'timeline', label: 'Timeline', ico: IcoLayers },
      { id: 'temas', label: 'Temas', n: mainThemes().length, ico: IcoTheme },
      { id: 'autores', label: 'Autores', ico: IcoUser },
    ] },
  ];
  const atual = tab + (arg ? '/' + arg : '');

  return (
    <aside className="lb-side">
      <div style={{ padding: '0 4px 18px' }}>
        <Marca onClick={() => { location.hash = hashFor('hoje'); }} />
      </div>

      {/* Captura é da extensão (desktop) e da issue (celular): só elas têm acesso
          à página para raspar título, autor, capa e texto. Um formulário aqui
          criaria entrada pobre — e seria UI de admin num site público. */}

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {grupos.map(g => (
          <div key={g.titulo}>
            <div className="lb-group-label">{g.titulo}</div>
            {g.itens.map(it => (
              <button key={it.id} className="lb-nav-item"
                aria-current={atual === it.id ? 'page' : undefined}
                onClick={() => { location.hash = '#/' + it.id; }}>
                <span style={{ display: 'flex', opacity: 0.75 }}><it.ico /></span>
                {it.label}
                {it.n != null && <span className="lb-nav-count">{it.n}</span>}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div style={{ marginTop: 'auto', paddingTop: 14 }}>
        <button onClick={onBuscar}
          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12.5, color: query ? 'var(--fg-primary)' : 'var(--fg-muted)', textAlign: 'left' }}>
          <span style={{ display: 'flex' }}><IcoSearch /></span>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{query || 'Buscar no que eu li'}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-disabled)' }}>/</span>
        </button>
      </div>
    </aside>
  );
}

// ── BARRA DE BUSCA (aparece quando ativada) ──────────────────────────────────
function BarraBusca({ query, onChange, onClose }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 32px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', position: 'sticky', top: 0, zIndex: 15 }}>
      <span style={{ color: 'var(--fg-muted)', display: 'flex' }}><IcoSearch /></span>
      <input autoFocus value={query} onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
        placeholder="Buscar no que eu li"
        style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--fg-primary)' }} />
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', fontSize: 14 }}>✕</button>
    </div>
  );
}

// ── MOBILE ───────────────────────────────────────────────────────────────────
function TabBar({ tab, onBuscar }) {
  const tabs = [
    { id: 'hoje', label: 'Hoje' },
    { id: 'consumo', label: 'Consumo' },
  ];
  const tabsDir = [
    { id: 'producao', label: 'Produção', prod: true },
    { id: 'buscar', label: 'Buscar' },
  ];
  const botao = (t) => (
    <button key={t.id} className={`lb-tab${t.prod ? ' lb-tab-prod' : ''}`}
      aria-current={tab === t.id ? 'page' : undefined}
      onClick={() => { if (t.id === 'buscar') onBuscar(); else location.hash = hashFor(t.id); }}>
      {t.label}
    </button>
  );
  return (
    <nav className="lb-tabbar">
      {tabs.map(botao)}
      {tabsDir.map(botao)}
    </nav>
  );
}

// ── APP ──────────────────────────────────────────────────────────────────────
const PREFS_PADRAO = { showConexoes: true, showFila: true, density: 'confortavel' };
function lerPrefs() {
  try { return { ...PREFS_PADRAO, ...JSON.parse(localStorage.getItem('logbook:prefs') || '{}') }; }
  catch { return { ...PREFS_PADRAO }; }
}

function App() {
  const [route, setRoute] = React.useState(parseHash);
  MODO_EDICAO = lerModoEdicao();
  const [query, setQuery] = React.useState('');
  const [buscando, setBuscando] = React.useState(false);
  const [prefs, setPrefsState] = React.useState(lerPrefs);
  const [carregado, setCarregado] = React.useState(false);
  const ultimaTab = React.useRef(route.tab || 'hoje');
  const entrouDireto = React.useRef(!!route.entryId);

  const setPrefs = (parcial) => {
    setPrefsState(atual => {
      const novo = { ...atual, ...parcial };
      try { localStorage.setItem('logbook:prefs', JSON.stringify(novo)); } catch { /* modo privado */ }
      return novo;
    });
  };

  React.useEffect(() => {
    // posts.json e aliases.json são opcionais: podem simplesmente não existir.
    Promise.all([
      fetch('./posts.json').then(r => r.ok ? r.json() : { posts: [] }).catch(() => ({ posts: [] })),
      fetch('./aliases.json').then(r => r.ok ? r.json() : {}).catch(() => ({})),
    ])
      .then(([p, a]) => { POSTS = p.posts || []; ALIASES = a || {}; })
      .then(() => fetch('./data.json'))
      .then(r => r.ok ? r.json() : { entries: [] })
      .then(d => {
        ENTRIES = d.entries || [];
        // Normaliza caixa/espaço e aplica aliases.json. Sinônimo exige julgamento
        // humano; o mapa é manual de propósito.
        const canon = (t) => {
          const k = String(t).trim().toLowerCase();
          return (ALIASES[k] || k).trim().toLowerCase();
        };
        ENTRIES.forEach(e => { e.tags = [...new Set((e.tags || []).map(canon).filter(Boolean))]; });
        POSTS.forEach(p => { p.tags = [...new Set((p.tags || []).map(canon).filter(Boolean))]; });
        CONTENT = ENTRIES.filter(e => e.type === 'conteudo');
        PROJECTS = ENTRIES.filter(e => e.type === 'projeto');
        setCarregado(true);
      })
      .catch(() => setCarregado(true));
  }, []);

  React.useEffect(() => {
    const on = () => {
      const r = parseHash();
      if (r.redirect) { location.replace('#/' + r.redirect); return; }
      setRoute(r);
      setBuscando(false);
    };
    on();
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  // ⌘K e "/" abrem a busca — é a única ação global que o site tem.
  React.useEffect(() => {
    const fn = (e) => {
      const digitando = /^(INPUT|TEXTAREA)$/.test(e.target.tagName);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setBuscando(true); return; }
      if (e.key === '/' && !digitando) { e.preventDefault(); setBuscando(true); }
    };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, []);

  if (!carregado) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'var(--font-body)', color: 'var(--fg-muted)', fontSize: 14 }}>
      Carregando o log...
    </div>
  );

  const entradaAberta = route.entryId ? ENTRIES.find(e => e.id === route.entryId) : null;
  const tab = route.tab || ultimaTab.current;
  if (route.tab) ultimaTab.current = route.tab;
  _onDetail = abrirFicha;

  const fecharFicha = () => {
    if (entrouDireto.current) { entrouDireto.current = false; location.hash = hashFor(ultimaTab.current); }
    else history.back();
  };
  const fecharBusca = () => { setBuscando(false); setQuery(''); };

  return (
    <div className="lb-app">
      <Sidebar tab={tab} arg={route.arg} query={query} onBuscar={() => setBuscando(true)} />

      <div className="lb-mobile-top">
        <Marca size={16} iconSize={22} onClick={() => { location.hash = hashFor('hoje'); }} />
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg-muted)' }}>{hojeLabel()}</span>
      </div>

      <main className="lb-main">
        {buscando && <BarraBusca query={query} onChange={setQuery} onClose={fecharBusca} />}
        {buscando && query
          ? <SearchView query={query} />
          : <>
              {tab === 'editor' && <EditorView />}
              {tab === 'hoje' && <HojeView prefs={prefs} />}
              {tab === 'consumo' && <ConsumoView arg={route.arg} />}
              {tab === 'producao' && <ProducaoView />}
              {tab === 'escritos' && (route.postSlug ? <PostView slug={route.postSlug} /> : <EscritosView />)}
              {tab === 'timeline' && <TimelineView prefs={prefs} setPrefs={setPrefs} />}
              {tab === 'temas' && <TemasView tema={route.arg || null} />}
              {tab === 'autores' && <AutoresView slug={route.arg || null} />}
            </>}
      </main>

      <TabBar tab={buscando ? 'buscar' : tab} onBuscar={() => setBuscando(true)} />

      {entradaAberta && <FichaModal entry={entradaAberta} onClose={fecharFicha} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
