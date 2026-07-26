// ── INLINED DESIGN SYSTEM COMPONENTS ────────────────────────────────────────
// (Self-contained copies of components/core/* so this prototype runs standalone.)

const _BTN_VARIANTS = {
  primary:   { background:'var(--accent-content)', color:'#fff', border:'1px solid transparent', hover:'var(--accent-content-hover)' },
  secondary: { background:'var(--bg-surface)', color:'var(--fg-primary)', border:'1px solid var(--border-default)', hover:'var(--bg-elevated)' },
  ghost:     { background:'transparent', color:'var(--fg-secondary)', border:'1px solid transparent', hover:'var(--bg-elevated)' },
  project:   { background:'var(--accent-project)', color:'#fff', border:'1px solid transparent', hover:'var(--accent-project-hover)' },
  danger:    { background:'var(--red-50)', color:'var(--red-700)', border:'1px solid var(--red-200)', hover:'var(--red-100)' },
};
const _BTN_SIZES = {
  sm: { padding:'5px 12px', fontSize:'var(--text-xs)', borderRadius:'var(--radius-md)', gap:'var(--space-1_5)' },
  md: { padding:'7px 16px', fontSize:'var(--text-sm)', borderRadius:'var(--radius-md)', gap:'var(--space-2)' },
  lg: { padding:'10px 20px', fontSize:'var(--text-base)', borderRadius:'var(--radius-lg)', gap:'var(--space-2_5)' },
};
function Button({ children, variant='primary', size='md', disabled=false, fullWidth=false, onClick, type='button', icon, iconEnd, style }) {
  const [hov, setHov] = React.useState(false);
  const v = _BTN_VARIANTS[variant] || _BTN_VARIANTS.primary;
  const s = _BTN_SIZES[size] || _BTN_SIZES.md;
  return (
    <button type={type} disabled={disabled} onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:s.gap, padding:s.padding, fontSize:s.fontSize, fontFamily:'var(--font-body)', fontWeight:'var(--weight-medium)', lineHeight:'var(--leading-none)', borderRadius:s.borderRadius, border:v.border, background: hov && !disabled ? v.hover : v.background, color:v.color, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1, transition:'background 0.14s ease, opacity 0.14s ease', width: fullWidth ? '100%' : undefined, whiteSpace:'nowrap', ...style }}>
      {icon && <span style={{ display:'flex', alignItems:'center', lineHeight:1 }}>{icon}</span>}
      {children}
      {iconEnd && <span style={{ display:'flex', alignItems:'center', lineHeight:1 }}>{iconEnd}</span>}
    </button>
  );
}

const _TYPE_STYLES = {
  artigo:{bg:'var(--type-artigo-bg)',fg:'var(--type-artigo-fg)',border:'var(--type-artigo-border)'},
  livro:{bg:'var(--type-livro-bg)',fg:'var(--type-livro-fg)',border:'var(--type-livro-border)'},
  'vídeo':{bg:'var(--type-video-bg)',fg:'var(--type-video-fg)',border:'var(--type-video-border)'},
  curso:{bg:'var(--type-curso-bg)',fg:'var(--type-curso-fg)',border:'var(--type-curso-border)'},
  treinamento:{bg:'var(--type-treinamento-bg)',fg:'var(--type-treinamento-fg)',border:'var(--type-treinamento-border)'},
  'notícia':{bg:'var(--type-noticia-bg)',fg:'var(--type-noticia-fg)',border:'var(--type-noticia-border)'},
  projeto:{bg:'var(--type-projeto-bg)',fg:'var(--type-projeto-fg)',border:'var(--type-projeto-border)'},
  escrito:{bg:'var(--type-escrito-bg)',fg:'var(--type-escrito-fg)',border:'var(--type-escrito-border)'},
};
const _STATUS_STYLES = {
  consumido:{bg:'var(--status-consumed-bg)',fg:'var(--status-consumed-fg)',border:'var(--status-consumed-border)'},
  'em andamento':{bg:'var(--status-progress-bg)',fg:'var(--status-progress-fg)',border:'var(--status-progress-border)'},
  'em progresso':{bg:'var(--status-progress-bg)',fg:'var(--status-progress-fg)',border:'var(--status-progress-border)'},
  abandonado:{bg:'var(--status-abandoned-bg)',fg:'var(--status-abandoned-fg)',border:'var(--status-abandoned-border)'},
  ideia:{bg:'var(--status-idea-bg)',fg:'var(--status-idea-fg)',border:'var(--status-idea-border)'},
  iniciado:{bg:'var(--status-started-bg)',fg:'var(--status-started-fg)',border:'var(--status-started-border)'},
  'lançado':{bg:'var(--status-launched-bg)',fg:'var(--status-launched-fg)',border:'var(--status-launched-border)'},
  pausado:{bg:'var(--status-paused-bg)',fg:'var(--status-paused-fg)',border:'var(--status-paused-border)'},
  arquivado:{bg:'var(--status-archived-bg)',fg:'var(--status-archived-fg)',border:'var(--status-archived-border)'},
};
const _BADGE_FALLBACK = { bg:'var(--bg-elevated)', fg:'var(--fg-muted)', border:'var(--border-subtle)' };
function Badge({ subtype, status, size='md', dot=false }) {
  const isStatus = status !== undefined;
  const key = (isStatus ? (status||'') : (subtype||'')).toLowerCase();
  const st = isStatus ? (_STATUS_STYLES[key] || _BADGE_FALLBACK) : (_TYPE_STYLES[key] || _BADGE_FALLBACK);
  const label = subtype || status || '—';
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap: dot ? 'var(--space-1_5)' : 0, padding: size==='sm' ? '2px 7px' : '3px 9px', fontSize: size==='sm' ? 'var(--text-2xs)' : 'var(--text-xs)', fontFamily:'var(--font-body)', fontWeight:'var(--weight-semibold)', letterSpacing:'var(--tracking-wider)', textTransform:'uppercase', lineHeight:1, borderRadius:'var(--radius-full)', background:st.bg, color:st.fg, border:`1px solid ${st.border}`, whiteSpace:'nowrap' }}>
      {dot && <span style={{ width:5, height:5, borderRadius:'50%', background:st.fg, opacity:0.7, flexShrink:0 }} />}
      {label}
    </span>
  );
}

function Tag({ children, onClick, active=false, size='md' }) {
  const [hov, setHov] = React.useState(false);
  const interactive = !!onClick;
  return (
    <span onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display:'inline-block', padding: size==='sm' ? '2px 8px' : '3px 10px', fontSize: size==='sm' ? 'var(--text-2xs)' : 'var(--text-xs)', fontFamily:'var(--font-body)', fontWeight:'var(--weight-medium)', lineHeight:'var(--leading-normal)', borderRadius:'var(--radius-full)', background: active ? 'var(--accent-content-light)' : (hov && interactive ? 'var(--sand-200)' : 'var(--bg-elevated)'), color: active ? 'var(--accent-content-hover)' : 'var(--fg-secondary)', border: active ? '1px solid var(--accent-content-border)' : '1px solid var(--border-subtle)', cursor: interactive ? 'pointer' : 'default', transition:'background 0.12s ease, color 0.12s ease', whiteSpace:'nowrap', userSelect:'none' }}>
      {children}
    </span>
  );
}

const _ENTRY_TYPE_LABELS = { artigo:'Artigo', livro:'Livro', 'vídeo':'Vídeo', curso:'Curso', treinamento:'Treinamento', 'notícia':'Notícia', projeto:'Projeto' };
function _RatingDots({ value, max=5 }) {
  return <span style={{ display:'inline-flex', gap:3, alignItems:'center' }}>{Array.from({length:max}).map((_, i) => <span key={i} style={{ width:6, height:6, borderRadius:'50%', background: i < value ? 'var(--amber-500)' : 'var(--sand-300)' }} />)}</span>;
}
function EntryCard({ type='content', subtype, title, author, source, date, status, tags=[], rating, notesExcerpt, relatedCount, image, onClick, compact=false }) {
  const [hov, setHov] = React.useState(false);
  const isProject = type === 'projeto';
  const subtypeKey = isProject ? 'projeto' : (subtype || 'artigo');
  const displayLabel = _ENTRY_TYPE_LABELS[subtypeKey] || subtypeKey;
  const interactive = !!onClick;
  return (
    <article onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background:'var(--bg-surface)', border:`1px solid ${hov && interactive ? 'var(--border-default)' : 'var(--border-subtle)'}`, borderRadius:'var(--radius-lg)', padding: compact ? 'var(--space-4) var(--space-5)' : 'var(--space-5) var(--space-6)', cursor: interactive ? 'pointer' : 'default', transition:'box-shadow 0.15s ease, border-color 0.15s ease', boxShadow: hov && interactive ? 'var(--card-hover-shadow)' : 'var(--shadow-sm)', position:'relative', fontFamily:'var(--font-body)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'var(--space-2)', marginBottom:'var(--space-2_5)', flexWrap:'wrap' }}>
        <Badge subtype={displayLabel.toLowerCase()} size="sm" />
        {status && <Badge status={status} size="sm" dot />}
        {date && <span style={{ marginLeft:'auto', fontSize:'var(--text-xs)', color:'var(--fg-muted)', fontFamily:'var(--font-mono)', letterSpacing:'var(--tracking-wide)', flexShrink:0 }}>{date}</span>}
      </div>
      <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>{image && !compact && <img src={image} alt='' loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} style={{ width:52, height:72, objectFit:'cover', borderRadius:4, flexShrink:0, marginTop:2 }} />}<div style={{ flex:1, minWidth:0 }}><h3 style={{ fontFamily:'var(--font-display)', fontSize: compact ? 'var(--text-base)' : 'var(--text-lg)', fontWeight:'var(--weight-medium)', color:'var(--fg-primary)', margin:'0 0 var(--space-1) 0', lineHeight:'var(--leading-snug)', letterSpacing:'var(--tracking-tight)' }}>{title}</h3>
      {(author || source) && <p style={{ fontSize:'var(--text-sm)', color:'var(--fg-muted)', margin:`0 0 ${tags.length || rating || notesExcerpt || relatedCount ? 'var(--space-3)' : '0'} 0`, lineHeight:'var(--leading-normal)' }}>{[author, source].filter(Boolean).join(' · ')}</p>}
      {(tags.length > 0 || rating > 0) && (
        <div style={{ display:'flex', alignItems:'center', gap:'var(--space-1_5)', flexWrap:'wrap', marginBottom: notesExcerpt || relatedCount ? 'var(--space-3)' : 0 }}>
          {rating > 0 && <_RatingDots value={rating} />}
          {tags.map((t, i) => <Tag key={i} size="sm">{t}</Tag>)}
        </div>
      )}
      {notesExcerpt && <p style={{ fontSize:'var(--text-sm)', color:'var(--fg-secondary)', margin:0, lineHeight:'var(--leading-relaxed)', fontFamily:'var(--font-display)', fontStyle:'italic', borderLeft:'2px solid var(--border-subtle)', paddingLeft:'var(--space-3)' }}>{notesExcerpt}</p>}
      {relatedCount > 0 && <p style={{ fontSize:'var(--text-xs)', color: isProject ? 'var(--accent-project)' : 'var(--accent-content)', fontWeight:'var(--weight-medium)', margin: notesExcerpt ? 'var(--space-3) 0 0 0' : 0 }}>↗ {isProject ? 'Inspirado por' : 'Conecta com'} {relatedCount} {relatedCount === 1 ? 'entrada' : 'entradas'}</p>}
    </div></div></article>
  );
}

// ── DADOS ────────────────────────────────────────────────────────────────────
// ponytail: globais preenchidas pelo fetch antes do primeiro render (App só
// renderiza depois de _loaded). Vira context se algum dia houver escrita no client.
let ENTRIES = [];
let CONTENT = [];
let PROJECTS = [];
let POSTS = [];   // escritos: posts/*.md compilados por tools/build_posts.py
let ALIASES = {}; // aliases.json: sinônimo -> tag canônica

// Quem cita esta entrada. É o que fecha o ciclo: junta material, escreve, referencia.
const citedIn = (id) => POSTS.filter(p => (p.refs || []).some(r => r.id === id));

const TYPE_META = [
  { key:'artigo',      label:'Artigos' },
  { key:'livro',       label:'Livros' },
  { key:'vídeo',       label:'Vídeos' },
  { key:'curso',       label:'Cursos' },
  { key:'treinamento', label:'Treinamentos' },
  { key:'notícia',     label:'Notícias' },
];

// Tag só vira "tema" com 2+ entradas — 2/3 das tags aparecem uma vez só.
const THEME_MIN = 2;

// Contagem de temas. Era um IIFE no topo do módulo, que rodava com ENTRIES=[]
// e deixava a aba Temas permanentemente vazia. Agora é chamada no render.
function themeCounts() {
  const m = {};
  ENTRIES.forEach(e => (e.tags||[]).forEach(t => { m[t] = (m[t]||0) + 1; }));
  return Object.entries(m).sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0]));
}
const mainThemes  = () => themeCounts().filter(([, n]) => n >= THEME_MIN);
const minorThemes = () => themeCounts().filter(([, n]) => n <  THEME_MIN);

// ── DATAS ────────────────────────────────────────────────────────────────────
// A data que importa é quando aconteceu, não quando foi clipado.
function entryDate(e) {
  const d = e.dates || {};
  return d.consumed || d.launched || d.started || d.end || d.captured
      || (e.createdAt || '').slice(0, 10) || null;
}
const MONTHS = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
function monthLabel(iso) {
  if (!iso) return 'sem data';
  const [y, m] = iso.split('-');
  return `${MONTHS[Number(m) - 1] || '?'} de ${y}`;
}
function shortDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y.slice(2)}`;
}
const byDateDesc = (a, b) => String(entryDate(b) || '').localeCompare(String(entryDate(a) || ''));

// Dias desde a data que importa. Base de "Revisitar" e do tempo na fila.
function daysSince(iso) {
  if (!iso) return null;
  const d = Math.floor((Date.now() - new Date(iso + 'T00:00:00').getTime()) / 86400000);
  return d >= 0 ? d : null;
}

// Autores vêm como "Fulano, Beltrano" numa string só (é o que a Amazon devolve).
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

// ── ICONS ──────────────────────────────────────────────────────────────────
const IcoHome     = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 6.5L7.5 2L13 6.5V13H9.5V9H5.5V13H2V6.5Z" fill="currentColor"/></svg>;
const IcoTimeline = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="2.5" width="13" height="2" rx="1" fill="currentColor"/><rect x="1" y="6.5" width="9" height="2" rx="1" fill="currentColor" opacity=".65"/><rect x="1" y="10.5" width="5.5" height="2" rx="1" fill="currentColor" opacity=".35"/></svg>;
const IcoType     = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="1.5" width="12" height="3" rx="1" fill="currentColor"/><rect x="1" y="6" width="12" height="3" rx="1" fill="currentColor" opacity=".6"/><rect x="1" y="10.5" width="12" height="3" rx="1" fill="currentColor" opacity=".3"/></svg>;
const IcoTheme    = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="4" cy="4" r="2.5" fill="currentColor"/><circle cx="11" cy="4" r="2.5" fill="currentColor" opacity=".6"/><circle cx="4" cy="11" r="2.5" fill="currentColor" opacity=".6"/><circle cx="11" cy="11" r="2.5" fill="currentColor" opacity=".3"/></svg>;
const IcoProject  = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="1" width="5.5" height="5.5" rx="1.5" fill="currentColor"/><rect x="8.5" y="1" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity=".55"/><rect x="1" y="8.5" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity=".55"/><rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity=".25"/></svg>;
const IcoBook     = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2" y="1" width="8" height="11" rx="1" stroke="currentColor" strokeWidth="1.5"/><path d="M2 10.5h8" stroke="currentColor" strokeWidth="1.2"/><path d="M10 3h1.5A1.5 1.5 0 0 1 13 4.5v8A1.5 1.5 0 0 1 11.5 14H10" stroke="currentColor" strokeWidth="1.3"/></svg>;
const IcoArrow    = () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5h9M7 2.5l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IcoWrite    = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M10.5 1.8l2.7 2.7-7.4 7.4-3.4.7.7-3.4 7.4-7.4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M9.2 3.1l2.7 2.7" stroke="currentColor" strokeWidth="1.2"/></svg>;
const IcoNow      = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="5.8" stroke="currentColor" strokeWidth="1.4"/><path d="M7.5 4.2v3.6l2.3 1.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IcoAuthor   = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="4.8" r="2.6" stroke="currentColor" strokeWidth="1.4"/><path d="M2.6 13c0-2.5 2.2-4.2 4.9-4.2s4.9 1.7 4.9 4.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>;

// ── SHARED ───────────────────────────────────────────────────────────────────
function SectionHeader({ children, count, action }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
      <h2 style={{ fontFamily:'var(--font-display)', fontSize:'var(--text-lg)', fontWeight:500, color:'var(--fg-primary)', letterSpacing:'var(--tracking-tight)', whiteSpace:'nowrap' }}>{children}</h2>
      {count != null && <span style={{ fontFamily:'var(--font-mono)', fontSize:'var(--text-xs)', color:'var(--fg-disabled)' }}>{count}</span>}
      <div style={{ flex:1, height:1, background:'var(--border-subtle)' }} />
      {action}
    </div>
  );
}
function PageTitle({ children, sub }) {
  return (
    <div style={{ marginBottom:28 }}>
      <h1 style={{ fontFamily:'var(--font-display)', fontSize:'var(--text-2xl)', fontWeight:500, color:'var(--fg-primary)', letterSpacing:'var(--tracking-tight)', marginBottom: sub ? 4 : 0 }}>{children}</h1>
      {sub && <p style={{ fontFamily:'var(--font-body)', fontSize:'var(--text-sm)', color:'var(--fg-muted)' }}>{sub}</p>}
    </div>
  );
}
let _onDetail = null;
const card = (e) => <EntryCard key={e.id} type={e.type} subtype={e.subtype} title={e.title} author={e.author} source={e.source} date={shortDate(entryDate(e))} status={e.status} tags={e.tags||[]} rating={e.rating} notesExcerpt={e.notes} relatedCount={(e.related||[]).length} image={e.image} onClick={_onDetail ? () => _onDetail(e) : undefined} />;
const cardCompact = (e) => <EntryCard key={e.id} compact type={e.type} subtype={e.subtype} title={e.title} author={e.author} source={e.source} date={shortDate(entryDate(e))} status={e.status} tags={[]} rating={e.rating} relatedCount={(e.related||[]).length} />;

// ── VIEW: INÍCIO (elaborate home) ───────────────────────────────────────────
function HomeView({ onNav }) {
  const inProgress = ENTRIES.filter(e => e.status === 'em andamento');
  const recent = [...CONTENT].sort((a,b) => new Date(b.createdAt || (b.dates && b.dates.captured) || 0) - new Date(a.createdAt || (a.dates && a.dates.captured) || 0)).slice(0, 4);
  const launched = PROJECTS.filter(p => p.status === 'lançado');
  const consumedN = CONTENT.filter(c => c.status === 'consumido').length;
  const themes = mainThemes();
  // Nada em andamento? Mostra a fila em vez de uma grade vazia.
  const queued = ENTRIES.filter(e => e.status === 'quero ler' || e.status === 'na fila').slice(0, 3);
  // Consumido há mais de 30 dias e com nota: o que vale ser relembrado.
  // ponytail: corte por data, não repetição espaçada — sem estado de revisão para manter.
  const revisit = ENTRIES
    .filter(e => e.status === 'consumido' && e.notes && (daysSince(entryDate(e)) || 0) >= 30)
    .sort((a, b) => (daysSince(entryDate(b)) || 0) - (daysSince(entryDate(a)) || 0))
    .slice(0, 2);

  return (
    <div style={{ padding:'40px 40px 64px', maxWidth:940, margin:'0 auto' }}>
      {/* Identity */}
      <header style={{ marginBottom:40, paddingBottom:32, borderBottom:'1px solid var(--border-subtle)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:14 }}>
                <h1 style={{ fontFamily:'var(--font-display)', fontSize:'var(--text-4xl)', fontWeight:600, color:'var(--fg-primary)', letterSpacing:'var(--tracking-tight)' }}>
            Log<span style={{ fontFamily:'var(--font-body)', fontWeight:400, color:'var(--fg-muted)' }}>Book</span>
          </h1>
        </div>
        <p style={{ fontFamily:'var(--font-display)', fontSize:'var(--text-lg)', color:'var(--fg-secondary)', lineHeight:'var(--leading-relaxed)', maxWidth:560, marginBottom:18 }}>
          Tudo que eu consumo e produzo em ordem cronológica e por tema. Uma base de conhecimento pública, e a história de como minhas ideias se formam.
        </p>
        <div style={{ display:'flex', gap:28, fontFamily:'var(--font-mono)', fontSize:'var(--text-xs)', color:'var(--fg-muted)', letterSpacing:'var(--tracking-wide)' }}>
          <span><strong style={{ color:'var(--fg-primary)', fontSize:'var(--text-sm)' }}>{consumedN}</strong> consumidos</span>
          <span><strong style={{ color:'var(--fg-primary)', fontSize:'var(--text-sm)' }}>{ENTRIES.length - consumedN}</strong> na fila</span>
          {PROJECTS.length > 0 && <span><strong style={{ color:'var(--fg-primary)', fontSize:'var(--text-sm)' }}>{PROJECTS.length}</strong> projetos</span>}
          {themes.length > 0 && <span><strong style={{ color:'var(--fg-primary)', fontSize:'var(--text-sm)' }}>{themes.length}</strong> temas</span>}
        </div>
      </header>

      {/* Em andamento — ou, se não há nada em andamento, o topo da fila */}
      {(inProgress.length > 0 || queued.length > 0) && (
        <section style={{ marginBottom:40 }}>
          <SectionHeader action={inProgress.length === 0 ? <button onClick={() => onNav('backlog')} style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer', color:'var(--accent-content)', fontFamily:'var(--font-body)', fontSize:'var(--text-xs)', fontWeight:500 }}>Ver backlog <IcoArrow /></button> : undefined}>
            {inProgress.length > 0 ? 'Em andamento agora' : 'Próximos na fila'}
          </SectionHeader>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:10 }}>
            {(inProgress.length > 0 ? inProgress : queued).map(card)}
          </div>
        </section>
      )}

      {/* 2-col: Recent + Explore */}
      <div className="cb-home-split">
        <section>
          <SectionHeader action={<button onClick={() => onNav('timeline')} style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer', color:'var(--accent-content)', fontFamily:'var(--font-body)', fontSize:'var(--text-xs)', fontWeight:500 }}>Ver timeline <IcoArrow /></button>}>Adicionado recentemente</SectionHeader>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>{recent.map(card)}</div>
        </section>

        <aside style={{ display:'flex', flexDirection:'column', gap:28 }}>
          <div>
            <SectionHeader action={<button onClick={() => onNav('tipos')} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--accent-content)', fontFamily:'var(--font-body)', fontSize:'var(--text-xs)', fontWeight:500 }}>Tudo</button>}>Por tipo</SectionHeader>
            <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
              {TYPE_META.map(t => {
                const n = CONTENT.filter(c => c.subtype === t.key).length;
                if (!n) return null;
                return (
                  <button key={t.key} onClick={() => onNav('tipos', { type:t.key })} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 10px', background:'none', border:'none', borderRadius:'var(--radius-md)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'var(--text-sm)', color:'var(--fg-secondary)', transition:'background 0.12s' }} onMouseEnter={e=>e.currentTarget.style.background='var(--bg-elevated)'} onMouseLeave={e=>e.currentTarget.style.background='none'}>
                    <span style={{ display:'flex', alignItems:'center', gap:8 }}><Badge subtype={t.key} size="sm" />{t.label}</span>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:'var(--text-xs)', color:'var(--fg-muted)' }}>{n}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <SectionHeader action={<button onClick={() => onNav('temas')} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--accent-content)', fontFamily:'var(--font-body)', fontSize:'var(--text-xs)', fontWeight:500 }}>Todos</button>}>Temas populares</SectionHeader>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {themes.slice(0, 9).map(([tag, n]) => (
                <Tag key={tag} onClick={() => onNav('temas', { theme:tag })}>{tag} · {n}</Tag>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Revisitar — nota lida há meses é nota perdida */}
      {revisit.length > 0 && (
        <section style={{ marginBottom:40 }}>
          <SectionHeader action={<span style={{ fontFamily:'var(--font-mono)', fontSize:'var(--text-xs)', color:'var(--fg-disabled)' }}>consumido há um tempo</span>}>Revisitar</SectionHeader>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:10 }}>{revisit.map(card)}</div>
        </section>
      )}

      {/* Escritos recentes — o que saiu de tudo isso */}
      {POSTS.length > 0 && (
        <section style={{ marginBottom:40 }}>
          <SectionHeader action={<button onClick={() => onNav('escritos')} style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer', color:'var(--accent-content)', fontFamily:'var(--font-body)', fontSize:'var(--text-xs)', fontWeight:500 }}>Todos os escritos <IcoArrow /></button>}>Escritos recentes</SectionHeader>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {POSTS.slice(0, 3).map(p => <PostCard key={p.slug} post={p} />)}
          </div>
        </section>
      )}

      {/* Projetos lançados — some quando ainda não há projeto nenhum */}
      {launched.length > 0 && (
        <section>
          <SectionHeader action={<button onClick={() => onNav('projetos')} style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer', color:'var(--accent-project)', fontFamily:'var(--font-body)', fontSize:'var(--text-xs)', fontWeight:500 }}>Todos os projetos <IcoArrow /></button>}>Projetos lançados</SectionHeader>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:10 }}>{launched.map(card)}</div>
        </section>
      )}
    </div>
  );
}

// ── VIEW: TIMELINE ──────────────────────────────────────────────────────────
function TimelineView() {
  // Antes agrupava por `e.month`, campo que não existe no schema: tudo caía num
  // único grupo "undefined". Agora deriva do que de fato aconteceu (ver entryDate).
  const groups = {};
  [...ENTRIES].sort(byDateDesc).forEach(e => {
    const k = (entryDate(e) || '').slice(0, 7) || 'sem-data';
    (groups[k] = groups[k] || []).push(e);
  });
  const ordered = Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  return (
    <div style={{ padding:'40px 40px 64px', maxWidth:720, margin:'0 auto' }}>
      <PageTitle sub="Tudo o que aconteceu, em ordem cronológica.">Timeline</PageTitle>
      {ordered.map(([month, items]) => (
        <div key={month} style={{ marginBottom:32 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:'var(--text-xs)', fontWeight:500, color:'var(--fg-muted)', letterSpacing:'var(--tracking-wider)', textTransform:'uppercase', whiteSpace:'nowrap' }}>{month === 'sem-data' ? 'sem data' : monthLabel(month + '-01')}</span>
            <div style={{ flex:1, height:1, background:'var(--border-subtle)' }} />
            <span style={{ fontFamily:'var(--font-mono)', fontSize:'var(--text-xs)', color:'var(--fg-disabled)' }}>{items.length}</span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>{items.map(card)}</div>
        </div>
      ))}
    </div>
  );
}

// ── VIEW: POR TIPO ───────────────────────────────────────────────────────────
function TypeView({ initialType }) {
  // Estado mora na URL (#/tipos/livro), não em useState — assim o filtro é linkável.
  const sel = initialType || 'all';
  const setSel = (t) => { location.hash = hashFor('tipos', t === 'all' ? '' : t); };
  const shown = (sel === 'all' ? CONTENT : CONTENT.filter(c => c.subtype === sel)).slice().sort(byDateDesc);
  return (
    <div style={{ padding:'40px 40px 64px', maxWidth:860, margin:'0 auto' }}>
      <PageTitle sub="Navegue pela biblioteca por formato de material.">Por tipo</PageTitle>
      <div style={{ display:'flex', gap:6, marginBottom:28, flexWrap:'wrap' }}>
        <FilterChip label="Todos" count={CONTENT.length} active={sel==='all'} onClick={() => setSel('all')} accent="content" />
        {TYPE_META.map(t => {
          const n = CONTENT.filter(c => c.subtype === t.key).length;
          if (!n) return null;
          return <FilterChip key={t.key} label={t.label} count={n} active={sel===t.key} onClick={() => setSel(t.key)} accent="content" />;
        })}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:10 }}>{shown.map(card)}</div>
    </div>
  );
}

// ── VIEW: TEMAS ──────────────────────────────────────────────────────────────
function ThemesView({ initialTheme }) {
  const sel = initialTheme || null;
  const setSel = (t) => { location.hash = hashFor('temas', t || ''); };

  if (!sel) {
    const main = mainThemes(), minor = minorThemes();
    return (
      <div style={{ padding:'40px 40px 64px', maxWidth:860, margin:'0 auto' }}>
        <PageTitle sub="Os fios que conectam o que leio ao que construo.">Temas</PageTitle>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:10 }}>
          {main.map(([tag, n]) => {
            const c = ENTRIES.filter(e => (e.tags||[]).includes(tag));
            const hasProj = c.some(e => e.type === 'projeto');
            return (
              <button key={tag} onClick={() => setSel(tag)} style={{ textAlign:'left', background:'var(--bg-surface)', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-lg)', padding:'16px 18px', cursor:'pointer', boxShadow:'var(--shadow-sm)', transition:'box-shadow 0.15s, border-color 0.15s' }} onMouseEnter={e=>{e.currentTarget.style.boxShadow='var(--card-hover-shadow)';e.currentTarget.style.borderColor='var(--border-default)';}} onMouseLeave={e=>{e.currentTarget.style.boxShadow='var(--shadow-sm)';e.currentTarget.style.borderColor='var(--border-subtle)';}}>
                <div style={{ fontFamily:'var(--font-display)', fontSize:'var(--text-lg)', fontWeight:500, color:'var(--fg-primary)', marginBottom:6, letterSpacing:'var(--tracking-tight)' }}>{tag}</div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'var(--text-xs)', color:'var(--fg-muted)' }}>{n} {n===1?'entrada':'entradas'}{hasProj && ' · com projeto'}</div>
              </button>
            );
          })}
        </div>
        {minor.length > 0 && (
          <div style={{ marginTop:32 }}>
            <SectionHeader count={minor.length}>Outras tags</SectionHeader>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {minor.map(([tag]) => <Tag key={tag} size="sm" onClick={() => setSel(tag)}>{tag}</Tag>)}
            </div>
          </div>
        )}
      </div>
    );
  }

  const themeContent = CONTENT.filter(e => (e.tags||[]).includes(sel));
  const themeProjects = PROJECTS.filter(e => (e.tags||[]).includes(sel));
  return (
    <div style={{ padding:'40px 40px 64px', maxWidth:860, margin:'0 auto' }}>
      <button onClick={() => setSel(null)} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', color:'var(--fg-muted)', fontFamily:'var(--font-body)', fontSize:'var(--text-sm)', marginBottom:14 }}>
        <span style={{ transform:'rotate(180deg)', display:'flex' }}><IcoArrow /></span> Todos os temas
      </button>
      <PageTitle sub={`${themeContent.length + themeProjects.length} entradas marcadas com este tema.`}>Tema: {sel}</PageTitle>
      {themeProjects.length > 0 && (
        <div style={{ marginBottom:28 }}>
          <SectionHeader count={themeProjects.length}>Projetos</SectionHeader>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>{themeProjects.map(card)}</div>
        </div>
      )}
      {themeContent.length > 0 && (
        <div>
          <SectionHeader count={themeContent.length}>Conteúdo</SectionHeader>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>{themeContent.map(card)}</div>
        </div>
      )}
    </div>
  );
}

// ── VIEW: PROJETOS ────────────────────────────────────────────────────────────
const PROJ_FILTERS = [['all','Todos'],['ideia','Ideias'],['em andamento','Em andamento'],['lançado','Lançados'],['pausado','Pausados'],['arquivado','Arquivados']];
function ProjectsView() {
  const [filter, setFilter] = React.useState('all');
  const shown = filter === 'all' ? PROJECTS : PROJECTS.filter(e => e.status === filter);
  return (
    <div style={{ padding:'40px 40px 64px', maxWidth:720, margin:'0 auto' }}>
      <PageTitle sub="O portfolio — das faíscas aos lançamentos.">Projetos</PageTitle>
      <div style={{ display:'flex', gap:6, marginBottom:24, flexWrap:'wrap' }}>
        {PROJ_FILTERS.map(([id, label]) => {
          const count = id === 'all' ? PROJECTS.length : PROJECTS.filter(e => e.status === id).length;
          return <FilterChip key={id} label={label} count={count} active={filter===id} onClick={() => setFilter(id)} accent="project" />;
        })}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {shown.length === 0
          ? <p style={{ color:'var(--fg-muted)', fontFamily:'var(--font-body)', fontSize:'var(--text-sm)', padding:'40px 0', textAlign:'center' }}>Nenhum projeto com este status.</p>
          : shown.map(card)}
      </div>
    </div>
  );
}

function FilterChip({ label, count, active, onClick, accent='content' }) {
  const c  = accent === 'content' ? 'var(--accent-content)' : 'var(--accent-project)';
  const bg = accent === 'content' ? 'var(--accent-content-subtle)' : 'var(--accent-project-subtle)';
  return (
    <button onClick={onClick} style={{ padding:'5px 13px', borderRadius:'var(--radius-full)', border:'1px solid', borderColor: active ? c : 'var(--border-subtle)', background: active ? bg : 'transparent', color: active ? c : 'var(--fg-muted)', fontFamily:'var(--font-body)', fontSize:'var(--text-sm)', fontWeight: active ? 600 : 400, cursor:'pointer', transition:'all 0.12s', display:'flex', alignItems:'center', gap:5 }}>
      {label}<span style={{ fontFamily:'var(--font-mono)', fontSize:'var(--text-xs)', opacity:0.65 }}>{count}</span>
    </button>
  );
}

// ── VIEW: BACKLOG DE LEITURA ────────────────────────────────────────────────
// Quanto tempo um item está parado na fila. Fila sem pressão vira depósito.
function waitingDays(e) {
  const c = (e.dates || {}).captured || (e.createdAt || '').slice(0, 10);
  if (!c) return null;
  const d = Math.floor((Date.now() - new Date(c + 'T00:00:00').getTime()) / 86400000);
  return d >= 0 ? d : null;
}

function BacklogView() {
  const books = ENTRIES.filter(e => e.subtype === 'livro');
  const reading   = books.filter(b => b.status === 'em andamento');
  // Fila ordenada pelo que espera há mais tempo — o que apodrece aparece primeiro.
  const queued    = books.filter(b => b.status === 'quero ler' || b.status === 'na fila')
                         .sort((a, b) => (waitingDays(b) || 0) - (waitingDays(a) || 0));
  const done      = books.filter(b => b.status === 'consumido').sort(byDateDesc);
  const abandoned = books.filter(b => b.status === 'abandonado');

  const BookCard = ({ b }) => (
    <div onClick={() => _onDetail && _onDetail(b)} style={{ display:'flex', gap:16, padding:'14px 18px', background:'var(--bg-surface)', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-lg)', boxShadow:'var(--shadow-sm)', alignItems:'flex-start', cursor:'pointer' }}>
      <div style={{ width:4, alignSelf:'stretch', borderRadius:2, background: b.status==='em andamento' ? 'var(--accent-content)' : b.status==='consumido' ? '#22c55e' : 'var(--border-default)', flexShrink:0 }} />
      {b.image && <img src={b.image} alt='' loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} style={{ width:44, height:60, objectFit:'cover', borderRadius:4, flexShrink:0 }} />}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:4 }}>
          <h3 style={{ fontFamily:'var(--font-display)', fontSize:'var(--text-base)', fontWeight:500, color:'var(--fg-primary)', margin:0, lineHeight:'var(--leading-snug)', letterSpacing:'var(--tracking-tight)' }}>{b.title}</h3>
          {b.rating > 0 && <span style={{ display:'inline-flex', gap:2, flexShrink:0, marginTop:2 }}>{Array.from({length:5}).map((_,i) => <span key={i} style={{ width:6,height:6,borderRadius:'50%',background: i<b.rating ? '#f59e0b' : 'var(--sand-300,#d6d3cd)' }} />)}</span>}
        </div>
        {(b.author || b.source) && <p style={{ fontFamily:'var(--font-body)', fontSize:'var(--text-sm)', color:'var(--fg-muted)', margin:'0 0 6px 0' }}>
          {[b.author, b.source].filter(Boolean).join(' · ')}
          {b.status !== 'consumido' && waitingDays(b) != null && <span style={{ fontFamily:'var(--font-mono)', fontSize:'var(--text-xs)', color: waitingDays(b) > 90 ? 'var(--amber-500)' : 'var(--fg-disabled)' }}> · {waitingDays(b)}d na fila</span>}
        </p>}
        {b.notes && <p style={{ fontFamily:'var(--font-display)', fontSize:'var(--text-sm)', color:'var(--fg-secondary)', fontStyle:'italic', margin:'6px 0 0 0', lineHeight:'var(--leading-relaxed)', borderLeft:'2px solid var(--border-subtle)', paddingLeft:10 }}>{b.notes}</p>}
        {(b.tags||[]).length > 0 && <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:8 }}>{b.tags.map((t,i) => <Tag key={i} size="sm">{t}</Tag>)}</div>}
      </div>
    </div>
  );

  const Section = ({ title, items, emptyText, accent }) => (
    <section style={{ marginBottom:36 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:'var(--text-base)', fontWeight:600, color: accent || 'var(--fg-primary)', letterSpacing:'var(--tracking-tight)', whiteSpace:'nowrap', margin:0 }}>{title}</h2>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:'var(--text-xs)', color:'var(--fg-disabled)' }}>{items.length}</span>
        <div style={{ flex:1, height:1, background:'var(--border-subtle)' }} />
      </div>
      {items.length === 0
        ? <p style={{ color:'var(--fg-disabled)', fontFamily:'var(--font-body)', fontSize:'var(--text-sm)', fontStyle:'italic' }}>{emptyText}</p>
        : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>{items.map((b,i) => <BookCard key={b.id||i} b={b} />)}</div>
      }
    </section>
  );

  return (
    <div style={{ padding:'40px 40px 64px', maxWidth:680, margin:'0 auto' }}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:'var(--text-2xl)', fontWeight:500, color:'var(--fg-primary)', letterSpacing:'var(--tracking-tight)', marginBottom:4 }}>Backlog de leitura</h1>
        <p style={{ fontFamily:'var(--font-body)', fontSize:'var(--text-sm)', color:'var(--fg-muted)' }}>{books.length} livros · {done.length} lidos · {reading.length} lendo · {queued.length} na fila</p>
      </div>
      <Section title="Lendo agora" items={reading} emptyText="Nenhum livro em andamento." accent="var(--accent-content)" />
      <Section title="Na fila" items={queued} emptyText="Fila vazia — adicione livros com status 'quero ler'." />
      <Section title="Já li" items={done} emptyText="Nenhum livro concluído ainda." />
      {abandoned.length > 0 && <Section title="Abandonados" items={abandoned} emptyText="" />}
    </div>
  );
}


// ── VIEW: BUSCA ─────────────────────────────────────────────────────────────
function SearchView({ query, onDetail }) {
  const q = query.toLowerCase().trim();
  const results = q.length < 2 ? [] : ENTRIES.filter(e =>
    [e.title, e.author, e.notes, e.source, ...(e.tags||[])].join(' ')
      .toLowerCase().includes(q)
  ).sort(byDateDesc);
  const content = results.filter(e => e.type !== 'projeto');
  const projects = results.filter(e => e.type === 'projeto');

  // Texto guardado na captura: carregado só quando alguém busca de verdade,
  // porque o índice cresce com o acervo e não faz falta em nenhuma outra tela.
  const [fullText, setFullText] = React.useState(null);
  React.useEffect(() => {
    if (q.length < 3 || fullText !== null) return;
    fetch('./search.json').then(r => r.ok ? r.json() : {}).then(setFullText).catch(() => setFullText({}));
  }, [q.length >= 3]);

  const achados = React.useMemo(() => {
    if (q.length < 3 || !fullText) return [];
    const jaListados = new Set(results.map(e => e.id));
    const out = [];
    for (const [id, texto] of Object.entries(fullText)) {
      if (jaListados.has(id)) continue;
      const pos = texto.toLowerCase().indexOf(q);
      if (pos === -1) continue;
      const entry = ENTRIES.find(e => e.id === id);
      if (entry) out.push({ entry, trecho: texto.slice(Math.max(0, pos - 90), pos + 160).trim(), pos });
    }
    return out;
  }, [q, fullText, results.length]);

  if (q.length < 2) return (
    <div style={{ padding:'60px 40px', textAlign:'center', color:'var(--fg-disabled)', fontFamily:'var(--font-body)', fontSize:'var(--text-sm)' }}>
      Digite ao menos 2 caracteres para buscar.
    </div>
  );
  if (!results.length && !achados.length) return (
    <div style={{ padding:'60px 40px', textAlign:'center', color:'var(--fg-muted)', fontFamily:'var(--font-body)', fontSize:'var(--text-sm)' }}>
      Nenhum resultado para <strong>"{query}"</strong>.
    </div>
  );
  return (
    <div style={{ padding:'32px 40px 64px', maxWidth:860, margin:'0 auto' }}>
      <p style={{ fontFamily:'var(--font-mono)', fontSize:'var(--text-xs)', color:'var(--fg-muted)', marginBottom:28 }}>
        {results.length} resultado{results.length !== 1 ? 's' : ''} para <strong style={{ color:'var(--fg-primary)' }}>"{query}"</strong>
        {achados.length > 0 && ` · ${achados.length} no texto guardado`}
      </p>
      {projects.length > 0 && (
        <section style={{ marginBottom:32 }}>
          <SectionHeader count={projects.length}>Projetos</SectionHeader>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>{projects.map(e => card(e))}</div>
        </section>
      )}
      {content.length > 0 && (
        <section>
          <SectionHeader count={content.length}>Conteúdo</SectionHeader>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:10 }}>{content.map(e => card(e))}</div>
        </section>
      )}

      {achados.length > 0 && (
        <section style={{ marginTop:32 }}>
          <SectionHeader count={achados.length}>No texto guardado</SectionHeader>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {achados.map(({ entry, trecho }) => (
              <button key={entry.id} onClick={() => _onDetail && _onDetail(entry)}
                style={{ textAlign:'left', background:'var(--bg-surface)', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-lg)', padding:'14px 18px', cursor:'pointer', boxShadow:'var(--shadow-sm)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                  <Badge subtype={entry.subtype} size="sm" />
                  <span style={{ fontFamily:'var(--font-display)', fontSize:'var(--text-base)', color:'var(--fg-primary)' }}>{entry.title}</span>
                </div>
                <p style={{ fontFamily:'var(--font-body)', fontSize:'var(--text-sm)', color:'var(--fg-secondary)', lineHeight:'var(--leading-relaxed)', margin:0 }}>
                  …{destacar(trecho, q)}…
                </p>
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
      <mark style={{ background:'var(--accent-content-light)', color:'var(--fg-primary)', padding:'0 2px', borderRadius:2 }}>{texto.slice(i, i + termo.length)}</mark>
      {texto.slice(i + termo.length)}
    </>
  );
}

// ── DETAIL MODAL ─────────────────────────────────────────────────────────────
function DetailModal({ entry, onClose }) {
  React.useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, []);

  if (!entry) return null;
  const isProject = entry.type === 'projeto';
  const subtypeKey = isProject ? 'projeto' : (entry.subtype || 'artigo');
  // A IA já sugere conexões na captura; aqui elas finalmente aparecem.
  const related = (entry.related || [])
    .map(r => ({ entry: ENTRIES.find(e => e.id === r.id), why: r.why }))
    .filter(r => r.entry);
  const cited = citedIn(entry.id);
  const ratings = entry.rating > 0 ? Array.from({length:5}).map((_,i) => (
    <span key={i} style={{ width:8,height:8,borderRadius:'50%',display:'inline-block',background: i<entry.rating ? 'var(--amber-500,#f59e0b)' : 'var(--sand-300,#d6d3cd)',marginRight:3 }} />
  )) : null;

  return (
    <div className="cb-modal-bd" onClick={onClose}>
      <div className="cb-modal" onClick={e => e.stopPropagation()}>
        <div className="cb-modal-header">
          {entry.image && <img src={entry.image} alt='' onError={e => { e.currentTarget.style.display = 'none'; }} style={{ width:64, height:88, objectFit:'cover', borderRadius:6, flexShrink:0, marginTop:2 }} />}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8, flexWrap:'wrap' }}>
              <Badge subtype={subtypeKey} size="sm" />
              {entry.status && <Badge status={entry.status} size="sm" dot />}
              {entryDate(entry) && <span style={{ fontFamily:'var(--font-mono)', fontSize:'var(--text-xs)', color:'var(--fg-muted)', marginLeft:'auto' }}>{shortDate(entryDate(entry))}</span>}
            </div>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:'var(--text-xl)', fontWeight:500, color:'var(--fg-primary)', margin:0, lineHeight:'var(--leading-snug)', letterSpacing:'var(--tracking-tight)' }}>{entry.title}</h2>
          </div>
          <button className="cb-modal-close" onClick={onClose} aria-label="Fechar">✕</button>
        </div>

        <div className="cb-modal-body">
          {(entry.author || entry.source) && (
            <p style={{ fontFamily:'var(--font-body)', fontSize:'var(--text-sm)', color:'var(--fg-muted)', marginTop:8, marginBottom:0 }}>
              {authorsOf(entry).map((a, i) => (
                <React.Fragment key={a}>
                  {i > 0 && ', '}
                  <button onClick={() => { onClose(); location.hash = hashFor('autores', authorSlug(a)); }}
                    style={{ background:'none', border:'none', padding:0, cursor:'pointer', color:'var(--accent-content)', fontFamily:'inherit', fontSize:'inherit' }}>{a}</button>
                </React.Fragment>
              ))}
              {entry.source && (entry.author ? ' · ' : '') + entry.source}
            </p>
          )}
          {/* pitch e descrição só existem em projeto */}
          {entry.pitch && (
            <p style={{ fontFamily:'var(--font-display)', fontSize:'var(--text-sm)', color:'var(--fg-secondary)', marginTop:8, fontStyle:'italic' }}>{entry.pitch}</p>
          )}
          {entry.description && (
            <div className="cb-modal-section">
              <div className="cb-modal-label">Descrição</div>
              <p className="cb-modal-notes">{entry.description}</p>
            </div>
          )}

          {(entry.tags||[]).length > 0 && (
            <div className="cb-modal-section">
              <div className="cb-modal-label">Tags</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {(entry.tags||[]).map((t,i) => <Tag key={i} size="sm">{t}</Tag>)}
              </div>
            </div>
          )}

          {ratings && (
            <div className="cb-modal-section">
              <div className="cb-modal-label">Avaliação</div>
              <div style={{ display:'flex', alignItems:'center', gap:3 }}>{ratings}</div>
            </div>
          )}

          {entry.notes && (
            <div className="cb-modal-section">
              <div className="cb-modal-label">Minhas notas</div>
              <p className="cb-modal-notes">{entry.notes}</p>
            </div>
          )}

          {(entry.quotes||[]).length > 0 && (
            <div className="cb-modal-section">
              <div className="cb-modal-label">Trechos ({entry.quotes.length})</div>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {entry.quotes.map((q, i) => (
                  <blockquote key={i} style={{ margin:0, borderLeft:'2px solid var(--accent-content-border)', paddingLeft:12 }}>
                    <p style={{ fontFamily:'var(--font-display)', fontSize:'var(--text-sm)', color:'var(--fg-primary)', lineHeight:'var(--leading-relaxed)', margin:0 }}>{q.text}</p>
                    {q.page && <cite style={{ fontFamily:'var(--font-mono)', fontSize:'var(--text-2xs)', color:'var(--fg-muted)', fontStyle:'normal' }}>{q.page}</cite>}
                  </blockquote>
                ))}
              </div>
            </div>
          )}

          {entry.archived && (
            <div className="cb-modal-section">
              <a href={`./archive/${entry.id}.md`} target="_blank" rel="noopener noreferrer"
                style={{ fontFamily:'var(--font-body)', fontSize:'var(--text-sm)', color:'var(--accent-content)' }}>
                ↓ Texto arquivado no dia da captura
              </a>
            </div>
          )}

          {cited.length > 0 && (
            <div className="cb-modal-section">
              <div className="cb-modal-label">Citado em</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {cited.map(p => (
                  <button key={p.slug} onClick={() => { onClose(); location.hash = hashFor('p', p.slug); }}
                    style={{ textAlign:'left', background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-md)', padding:'10px 12px', cursor:'pointer', fontFamily:'var(--font-body)' }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:'var(--text-sm)', color:'var(--fg-primary)' }}>{p.title}</div>
                    {p.date && <div style={{ fontFamily:'var(--font-mono)', fontSize:'var(--text-xs)', color:'var(--fg-muted)', marginTop:3 }}>{shortDate(p.date)}</div>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {related.length > 0 && (
            <div className="cb-modal-section">
              <div className="cb-modal-label">{isProject ? 'Inspirado por' : 'Isso me levou a'}</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {related.map(({ entry: r, why }) => (
                  <button key={r.id} onClick={() => _onDetail && _onDetail(r)}
                    style={{ textAlign:'left', background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-md)', padding:'10px 12px', cursor:'pointer', fontFamily:'var(--font-body)' }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:'var(--text-sm)', color:'var(--fg-primary)', marginBottom: why ? 3 : 0 }}>{r.title}</div>
                    {why && <div style={{ fontSize:'var(--text-xs)', color:'var(--fg-muted)', lineHeight:'var(--leading-normal)' }}>{why}</div>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {entry.url && (
            <div className="cb-modal-section">
              <a href={entry.url} target="_blank" rel="noopener noreferrer"
                style={{ fontFamily:'var(--font-body)', fontSize:'var(--text-sm)', color:'var(--accent-content)', wordBreak:'break-all' }}>
                {entry.url}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── VIEW: AUTORES ───────────────────────────────────────────────────────────
function AuthorsView({ slug }) {
  const all = authorCounts();

  if (slug) {
    const hit = all.find(([k]) => k === slug);
    const items = ENTRIES.filter(e => authorsOf(e).some(a => authorSlug(a) === slug)).sort(byDateDesc);
    return (
      <div style={{ padding:'40px 40px 64px', maxWidth:860, margin:'0 auto' }}>
        <button onClick={() => { location.hash = hashFor('autores'); }}
          style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', color:'var(--fg-muted)', fontFamily:'var(--font-body)', fontSize:'var(--text-sm)', marginBottom:14 }}>
          <span style={{ transform:'rotate(180deg)', display:'flex' }}><IcoArrow /></span> Todos os autores
        </button>
        <PageTitle sub={`${items.length} ${items.length === 1 ? 'entrada' : 'entradas'}`}>{hit ? hit[1].name : slug}</PageTitle>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>{items.map(card)}</div>
      </div>
    );
  }

  // Paper com 10 coautores enchia a página de gente com 1 entrada só —
  // mesmo critério de Temas: destaque para quem repete, o resto vira lista.
  const recorrentes = all.filter(([, v]) => v.n >= 2);
  const avulsos     = all.filter(([, v]) => v.n < 2).sort((a, b) => a[1].name.localeCompare(b[1].name));

  return (
    <div style={{ padding:'40px 40px 64px', maxWidth:860, margin:'0 auto' }}>
      <PageTitle sub="Quem escreveu o que passou por aqui.">Autores</PageTitle>
      {all.length === 0
        ? <p style={{ color:'var(--fg-muted)', fontFamily:'var(--font-body)', fontSize:'var(--text-sm)', fontStyle:'italic' }}>Nenhum autor registrado ainda.</p>
        : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:10 }}>
            {recorrentes.map(([k, { name, n }]) => (
              <button key={k} onClick={() => { location.hash = hashFor('autores', k); }}
                style={{ textAlign:'left', background:'var(--bg-surface)', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-lg)', padding:'14px 16px', cursor:'pointer', boxShadow:'var(--shadow-sm)' }}>
                <div style={{ fontFamily:'var(--font-display)', fontSize:'var(--text-base)', color:'var(--fg-primary)', marginBottom:4 }}>{name}</div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'var(--text-xs)', color:'var(--fg-muted)' }}>{n} {n === 1 ? 'entrada' : 'entradas'}</div>
              </button>
            ))}
          </div>}
      {avulsos.length > 0 && (
        <div style={{ marginTop: recorrentes.length ? 32 : 0 }}>
          <SectionHeader count={avulsos.length}>Com uma entrada</SectionHeader>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {avulsos.map(([k, { name }]) => (
              <Tag key={k} size="sm" onClick={() => { location.hash = hashFor('autores', k); }}>{name}</Tag>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── VIEW: AGORA ─────────────────────────────────────────────────────────────
// Convenção de blog pessoal (nownownow.com): o que estou fazendo neste momento.
// Deriva inteiramente do que já existe — nenhum dado novo para manter.
function NowView() {
  const reading = ENTRIES.filter(e => e.status === 'em andamento');
  const queued  = ENTRIES.filter(e => e.status === 'quero ler')
                         .sort((a, b) => (waitingDays(b) || 0) - (waitingDays(a) || 0));
  const lastPost = POSTS[0];
  const recent = [...ENTRIES].filter(e => e.status === 'consumido').sort(byDateDesc).slice(0, 3);
  const active = PROJECTS.filter(p => ['em andamento','iniciado'].includes(p.status));

  const Bloco = ({ titulo, children }) => (
    <section style={{ marginBottom:32 }}>
      <SectionHeader>{titulo}</SectionHeader>
      {children}
    </section>
  );
  const vazio = (t) => <p style={{ color:'var(--fg-disabled)', fontFamily:'var(--font-body)', fontSize:'var(--text-sm)', fontStyle:'italic' }}>{t}</p>;

  return (
    <div style={{ padding:'40px 40px 64px', maxWidth:720, margin:'0 auto' }}>
      <PageTitle sub="O que estou lendo e escrevendo neste momento.">Agora</PageTitle>
      <Bloco titulo="Lendo">
        {reading.length ? <div style={{ display:'flex', flexDirection:'column', gap:10 }}>{reading.map(card)}</div>
          : vazio('Nada em andamento — marque um item como "em andamento" na extensão.')}
      </Bloco>
      {active.length > 0 && <Bloco titulo="Construindo"><div style={{ display:'flex', flexDirection:'column', gap:10 }}>{active.map(card)}</div></Bloco>}
      <Bloco titulo="Escrevendo">
        {lastPost ? <PostCard post={lastPost} /> : vazio('Nenhum artigo publicado ainda.')}
      </Bloco>
      <Bloco titulo="Terminei há pouco">
        {recent.length ? <div style={{ display:'flex', flexDirection:'column', gap:10 }}>{recent.map(card)}</div> : vazio('Nada consumido ainda.')}
      </Bloco>
      {queued.length > 0 && (
        <p style={{ fontFamily:'var(--font-body)', fontSize:'var(--text-sm)', color:'var(--fg-muted)' }}>
          E {queued.length} {queued.length === 1 ? 'item esperando' : 'itens esperando'} na fila — o mais antigo há {waitingDays(queued[0])} dias.
        </p>
      )}
    </div>
  );
}

// ── VIEW: ESCRITOS ──────────────────────────────────────────────────────────
function PostsView() {
  if (!POSTS.length) return (
    <div style={{ padding:'40px 40px 64px', maxWidth:720, margin:'0 auto' }}>
      <PageTitle sub="O que sai da leitura: artigos escritos a partir do que está aqui.">Escritos</PageTitle>
      <p style={{ color:'var(--fg-muted)', fontFamily:'var(--font-body)', fontSize:'var(--text-sm)', fontStyle:'italic' }}>
        Nada publicado ainda. Escreva um <code>.md</code> em <code>posts/</code> e rode <code>./build.sh</code>.
      </p>
    </div>
  );
  return (
    <div style={{ padding:'40px 40px 64px', maxWidth:720, margin:'0 auto' }}>
      <PageTitle sub="O que sai da leitura: artigos escritos a partir do que está aqui.">Escritos</PageTitle>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {POSTS.map(p => <PostCard key={p.slug} post={p} />)}
      </div>
    </div>
  );
}

function PostCard({ post }) {
  const [hov, setHov] = React.useState(false);
  return (
    <article onClick={() => { location.hash = hashFor('p', post.slug); }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background:'var(--bg-surface)', border:`1px solid ${hov ? 'var(--border-default)' : 'var(--border-subtle)'}`, borderRadius:'var(--radius-lg)', padding:'var(--space-5) var(--space-6)', cursor:'pointer', boxShadow: hov ? 'var(--card-hover-shadow)' : 'var(--shadow-sm)', transition:'box-shadow 0.15s ease, border-color 0.15s ease' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
        <Badge subtype="escrito" size="sm" />
        {post.date && <span style={{ marginLeft:'auto', fontFamily:'var(--font-mono)', fontSize:'var(--text-xs)', color:'var(--fg-muted)' }}>{shortDate(post.date)}</span>}
      </div>
      <h3 style={{ fontFamily:'var(--font-display)', fontSize:'var(--text-lg)', fontWeight:500, color:'var(--fg-primary)', margin:'0 0 6px 0', lineHeight:'var(--leading-snug)', letterSpacing:'var(--tracking-tight)' }}>{post.title}</h3>
      {post.excerpt && <p style={{ fontFamily:'var(--font-body)', fontSize:'var(--text-sm)', color:'var(--fg-secondary)', margin:'0 0 10px 0', lineHeight:'var(--leading-relaxed)' }}>{post.excerpt}</p>}
      <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
        {(post.tags||[]).map((t,i) => <Tag key={i} size="sm">{t}</Tag>)}
        {(post.refs||[]).length > 0 && <span style={{ marginLeft:'auto', fontSize:'var(--text-xs)', color:'var(--fg-muted)', fontFamily:'var(--font-mono)' }}>{post.refs.length} ref{post.refs.length === 1 ? '' : 's'}</span>}
      </div>
    </article>
  );
}

function PostView({ slug }) {
  const post = POSTS.find(p => p.slug === slug);
  React.useEffect(() => { document.querySelector('.cb-main')?.scrollTo(0, 0); }, [slug]);
  if (!post) return (
    <div style={{ padding:'60px 40px', textAlign:'center', color:'var(--fg-muted)', fontFamily:'var(--font-body)', fontSize:'var(--text-sm)' }}>
      Artigo não encontrado. <a href="#/escritos" style={{ color:'var(--accent-content)' }}>Ver todos</a>.
    </div>
  );

  return (
    <article style={{ padding:'40px 40px 64px', maxWidth:680, margin:'0 auto' }}>
      <button onClick={() => { location.hash = hashFor('escritos'); }}
        style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', color:'var(--fg-muted)', fontFamily:'var(--font-body)', fontSize:'var(--text-sm)', marginBottom:16 }}>
        <span style={{ transform:'rotate(180deg)', display:'flex' }}><IcoArrow /></span> Escritos
      </button>
      <h1 style={{ fontFamily:'var(--font-display)', fontSize:'var(--text-3xl)', fontWeight:600, color:'var(--fg-primary)', letterSpacing:'var(--tracking-tight)', lineHeight:'var(--leading-tight)', marginBottom:10 }}>{post.title}</h1>
      <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:28, paddingBottom:20, borderBottom:'1px solid var(--border-subtle)' }}>
        {post.date && <span style={{ fontFamily:'var(--font-mono)', fontSize:'var(--text-xs)', color:'var(--fg-muted)' }}>{shortDate(post.date)}</span>}
        {(post.tags||[]).map((t,i) => <Tag key={i} size="sm">{t}</Tag>)}
      </div>

      {/* HTML gerado na build a partir do seu próprio markdown */}
      <div className="cb-prose" dangerouslySetInnerHTML={{ __html: post.html }} />

      {(post.refs||[]).length > 0 && (
        <section style={{ marginTop:40, paddingTop:24, borderTop:'1px solid var(--border-subtle)' }}>
          <SectionHeader count={post.refs.length}>Referências</SectionHeader>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {post.refs.map((r, i) => {
              const e = r.id && ENTRIES.find(x => x.id === r.id);
              if (e) return card(e);
              return (
                <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                  style={{ fontFamily:'var(--font-body)', fontSize:'var(--text-sm)', color:'var(--accent-content)', wordBreak:'break-all', padding:'10px 12px', background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-md)' }}>
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

// ── SIDEBAR ────────────────────────────────────────────────────────────────
// Backlog subiu: é o que o logbook mais tem. Projetos só aparece se existir projeto.
const NAV = [['inicio','Início',IcoHome],['agora','Agora',IcoNow],['escritos','Escritos',IcoWrite],['backlog','Backlog',IcoBook],['timeline','Timeline',IcoTimeline],['tipos','Por tipo',IcoType],['temas','Temas',IcoTheme],['autores','Autores',IcoAuthor],['projetos','Projetos',IcoProject]];
function Sidebar({ tab, onTab, open, onClose, searchQuery, onSearch, searchOpen, setSearchOpen }) {
  React.useEffect(() => { if (!searchQuery) setSearchOpen(false); }, [searchQuery]);
  const nav = NAV.filter(([id]) => id !== 'projetos' || PROJECTS.length > 0);
  return (
    <>
      {open && <div className="cb-overlay" onClick={onClose} />}
      <aside className={`cb-sidebar${open ? ' open' : ''}`} style={{ flexShrink:0, display:'flex', flexDirection:'column' }}>
      <button onClick={() => onTab('inicio')} style={{ padding:'18px 16px 14px', borderBottom:'1px solid var(--border-subtle)', display:'flex', alignItems:'center', gap:9, background:'none', border:'none', borderBottomStyle:'solid', cursor:'pointer', width:'100%' }}>
        <span style={{ fontFamily:'var(--font-display)', fontSize:'var(--text-base)', fontWeight:600, color:'var(--fg-primary)', letterSpacing:'-0.01em' }}>
          Log<span style={{ fontFamily:'var(--font-body)', fontWeight:400, color:'var(--fg-muted)' }}>Book</span>
        </span>
      </button>
      <nav style={{ padding:'10px 8px', flex:1 }}>
        {nav.map(([id, label, Ico]) => {
          const active = tab === id;
          return (
            <button key={id} onClick={() => onTab(id)} style={{ display:'flex', alignItems:'center', gap:9, width:'100%', padding:'8px 10px', borderRadius:'var(--radius-md)', background: active ? 'var(--accent-content-subtle)' : 'transparent', color: active ? 'var(--accent-content)' : 'var(--fg-secondary)', border:'none', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'var(--text-sm)', fontWeight: active ? 600 : 400, marginBottom:2, transition:'background 0.12s, color 0.12s', textAlign:'left' }}>
              <Ico />{label}
            </button>
          );
        })}
      </nav>
      <div className="cb-side-search">
        {searchOpen
          ? <div className="cb-side-search-wrap">
              <span className="cb-side-search-ico">🔍</span>
              <input autoFocus className="cb-side-search-input" type="text" value={searchQuery} onChange={e => onSearch(e.target.value)} placeholder="Buscar..." />
              {searchQuery && <button className="cb-side-search-clear" onClick={() => { onSearch(''); }}>✕</button>}
            </div>
          : <button className="cb-search-toggle" onClick={() => setSearchOpen(true)}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.4"/><path d="M9 9l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              Buscar
            </button>
        }
      </div>
    </aside>
    </>
  );
}

// ── ROTAS ──────────────────────────────────────────────────────────────────
// #/timeline, #/temas/ia, #/tipos/livro, #/e/<id> — links compartilháveis e
// botão voltar funcionando, que é o mínimo para um site público.
const TABS = ['inicio','agora','escritos','timeline','tipos','temas','autores','projetos','backlog'];
function parseHash() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').map(p => {
    try { return decodeURIComponent(p); } catch { return p; }
  });
  const seg = parts[0] || 'inicio';
  const arg = parts.slice(1).join('/');
  if (seg === 'e') return { tab: null, entryId: arg, arg: '' };
  if (seg === 'p') return { tab: 'escritos', postSlug: arg, arg: '', entryId: null };
  return { tab: TABS.includes(seg) ? seg : 'inicio', arg, entryId: null };
}
const hashFor = (to, arg) => '#/' + to + (arg ? '/' + encodeURIComponent(arg) : '');

// ── APP ────────────────────────────────────────────────────────────────────
function App() {
  const [route, setRoute] = React.useState(parseHash);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [_loaded, _setLoaded] = React.useState(false);
  const lastTab = React.useRef(route.tab || 'inicio');
  const openedDeep = React.useRef(!!route.entryId);

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
        // Normaliza caixa/espaço e aplica aliases.json ('ia' -> 'inteligência
        // artificial'). Sinônimo exige julgamento humano; o mapa é manual de propósito.
        const canon = (t) => {
          const k = String(t).trim().toLowerCase();
          return (ALIASES[k] || k).trim().toLowerCase();
        };
        ENTRIES.forEach(e => { e.tags = [...new Set((e.tags||[]).map(canon).filter(Boolean))]; });
        POSTS.forEach(p => { p.tags = [...new Set((p.tags||[]).map(canon).filter(Boolean))]; });
        CONTENT = ENTRIES.filter(e => e.type === 'conteudo');
        PROJECTS = ENTRIES.filter(e => e.type === 'projeto');
        _setLoaded(true);
      })
      .catch(() => _setLoaded(true));
  }, []);

  React.useEffect(() => {
    const on = () => { setRoute(parseHash()); setMobileOpen(false); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  if (!_loaded) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
      height:'100vh', fontFamily:'var(--font-body)', color:'var(--fg-muted)', fontSize:'14px' }}>
      Carregando entradas...
    </div>
  );

  const selectedEntry = route.entryId ? ENTRIES.find(e => e.id === route.entryId) : null;
  const tab = route.tab || lastTab.current;
  if (route.tab) lastTab.current = route.tab;

  _onDetail = (e) => { location.hash = hashFor('e', e.id); };
  const closeDetail = () => {
    if (openedDeep.current) { openedDeep.current = false; location.hash = hashFor(lastTab.current); }
    else history.back();
  };
  const nav = (to, args = {}) => {
    setSearchQuery('');
    location.hash = hashFor(to, to === 'tipos' ? (args.type || '') : to === 'temas' ? (args.theme || '') : '');
  };

  return (
    <div className="cb-app" style={{ fontFamily:'var(--font-body)' }}>
      <Sidebar tab={tab} onTab={nav} open={mobileOpen} onClose={() => setMobileOpen(false)} searchQuery={searchQuery} onSearch={setSearchQuery} searchOpen={searchOpen} setSearchOpen={setSearchOpen} />
      <main className="cb-main">
        <div className="cb-topbar">
          <button className="cb-hamburger" onClick={() => setMobileOpen(true)} aria-label="Menu">☰</button>
          <span className="cb-topbar-title">Log<span>Book</span></span>
          <button style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color: searchQuery ? 'var(--accent-content)' : 'var(--fg-muted)', padding:'4px 8px', borderRadius:'var(--radius-md)', fontSize:14 }} onClick={() => { setMobileOpen(true); setSearchOpen(true); }} aria-label="Buscar"><svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5"/><path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></button>
        </div>

        {searchQuery ? <SearchView query={searchQuery} /> : tab === 'inicio'   && <HomeView onNav={nav} />}
        {!searchQuery && tab === 'agora'    && <NowView />}
        {!searchQuery && tab === 'autores'  && <AuthorsView slug={route.arg || null} />}
        {!searchQuery && tab === 'escritos' && (route.postSlug ? <PostView slug={route.postSlug} /> : <PostsView />)}
        {!searchQuery && tab === 'timeline' && <TimelineView />}
        {!searchQuery && tab === 'tipos'    && <TypeView initialType={route.arg || 'all'} />}
        {!searchQuery && tab === 'temas'    && <ThemesView initialTheme={route.arg || null} />}
        {!searchQuery && tab === 'projetos' && <ProjectsView />}
        {!searchQuery && tab === 'backlog'  && <BacklogView />}
      </main>
      {selectedEntry && <DetailModal entry={selectedEntry} onClose={closeDetail} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
