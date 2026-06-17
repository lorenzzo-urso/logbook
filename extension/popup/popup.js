import { createEntry, SUBTYPES, STATUS } from '../utils/schema.js';
import { getQueue, addToQueue, removeFromQueue, clearQueue, getSettings, saveSettings } from '../utils/storage.js';
import { enrichEntry } from '../utils/ai.js';
import { getDataJson, putDataJson } from '../utils/github.js';

// ── State ──────────────────────────────────────────────────────────────────
let currentEntry = null;
let rating = 0;
let bookRating = 0;
let selectedConnections = new Set();
let existingEntriesCache = [];

// ── Boot ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await refreshBadge();
  await initCapture();
  bindAll();
});

// ── Capture init ───────────────────────────────────────────────────────────
async function initCapture() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) { currentEntry = createEntry(); fillForm(currentEntry); return; }

  try {
    const [{ result: scraped }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scrapePage,
    });
    currentEntry = createEntry({
      title:   scraped.title,
      url:     scraped.url,
      author:  scraped.author,
      source:  scraped.siteName,
      subtype: scraped.detectedType,
      // Books default to "quero ler" rather than "consumido"
      status:  scraped.isBook ? 'quero ler' : 'consumido',
      _body:   scraped.bodyText,
      _desc:   scraped.description,
    });
    fillForm(currentEntry);
    autoEnrich(scraped.bodyText);
  } catch {
    currentEntry = createEntry();
    fillForm(currentEntry);
  }
}

// ── Form fill / read ───────────────────────────────────────────────────────
function fillForm(e) {
  $('sel-type').value    = e.type    || 'conteudo';
  updateTypeUI(e.type || 'conteudo');   // populate options before setting values
  $('sel-subtype').value = e.subtype || 'artigo';
  $('sel-status').value  = e.status  || 'consumido';
  $('f-title').value     = e.title   || '';
  $('f-url').value       = e.url     || '';
  $('f-author').value    = e.author  || '';
  $('f-pitch').value     = e.pitch   || '';
  $('f-tags').value      = (e.tags || []).join(', ');
  $('f-notes').value     = e.notes   || '';
  $('f-desc').value      = e.description || '';
  setRating(e.rating || 0);
}

function readForm() {
  const type = $('sel-type').value;
  return {
    ...currentEntry,
    type,
    subtype:     $('sel-subtype').value,
    title:       $('f-title').value.trim(),
    url:         $('f-url').value.trim(),
    author:      $('f-author').value.trim(),
    pitch:       $('f-pitch').value.trim(),
    tags:        $('f-tags').value.split(',').map(t => t.trim()).filter(Boolean),
    status:      $('sel-status').value,
    notes:       $('f-notes').value.trim(),
    description: $('f-desc').value.trim(),
    rating,
    links: [...selectedConnections],
  };
}

// ── Type UI switching ──────────────────────────────────────────────────────
function updateTypeUI(type) {
  const isProject = type === 'projeto';

  // Update subtype options
  const subtypeSel = $('sel-subtype');
  subtypeSel.innerHTML = SUBTYPES[type]
    .map(v => `<option value="${v}">${cap(v)}</option>`)
    .join('');
  subtypeSel.disabled = isProject;

  // Update status options
  const statusSel = $('sel-status');
  statusSel.innerHTML = STATUS[type]
    .map(v => `<option value="${v}">${cap(v)}</option>`)
    .join('');

  // Toggle project-only fields
  toggle('field-pitch',   isProject);
  toggle('field-desc',    isProject);
  toggle('field-rating',  !isProject);
  toggle('field-url',     true);
  toggle('field-author',  !isProject);
}

// ── AI enrichment ──────────────────────────────────────────────────────────
async function autoEnrich(bodyText) {
  const settings = await getSettings();
  if (settings.aiProvider === 'none') return;
  if (!settings.claudeKey && !settings.openaiKey) return;
  triggerEnrich(bodyText, settings, true);
}

async function triggerEnrich(bodyText, settings, auto = false) {
  const aiBtn = $('btn-ai');
  const status = $('ai-status');

  aiBtn.disabled = true;
  aiBtn.classList.add('loading');
  status.textContent = '✦ Consultando AI...';

  try {
    if (!settings) settings = await getSettings();

    // Fetch existing entries for context (cache after first call)
    if (!existingEntriesCache.length && settings.githubToken && settings.githubOwner && settings.githubRepo) {
      try {
        const { entries } = await getDataJson(
          settings.githubToken, settings.githubOwner, settings.githubRepo, settings.githubBranch
        );
        existingEntriesCache = entries;
      } catch { /* no data.json yet is fine */ }
    }

    const partial = readForm();
    const result = await enrichEntry(
      { ...partial, description: currentEntry._desc || '' },
      bodyText || currentEntry._body || '',
      existingEntriesCache,
      settings
    );

    if (!result) { status.textContent = ''; return; }

    // Apply suggestions (don't overwrite if user already typed)
    if (result.subtype && SUBTYPES[partial.type]?.includes(result.subtype)) {
      $('sel-subtype').value = result.subtype;
    }
    if (result.tags?.length) {
      const current = $('f-tags').value.trim();
      if (!current) $('f-tags').value = result.tags.join(', ');
    }
    if (result.notes_draft && !$('f-notes').value.trim()) {
      $('f-notes').value = result.notes_draft;
    }

    // Connections
    if (result.connections?.length) {
      renderConnections(result.connections, result.connection_reasons || {});
    }

    status.textContent = auto ? '✦ Sugestões aplicadas — edite à vontade' : '✦ Feito';
    setTimeout(() => { status.textContent = ''; }, 4000);
  } catch (e) {
    status.textContent = `✦ ${e.message.slice(0, 70)}`;
  } finally {
    aiBtn.disabled = false;
    aiBtn.classList.remove('loading');
  }
}

function renderConnections(ids, reasons) {
  const field = $('field-connections');
  const list  = $('f-connections');
  list.innerHTML = '';
  selectedConnections.clear();

  const relevant = ids
    .map(id => ({ id, entry: existingEntriesCache.find(e => e.id === id) }))
    .filter(({ entry }) => !!entry);

  if (!relevant.length) return;

  for (const { id, entry } of relevant) {
    selectedConnections.add(id);
    const el = document.createElement('div');
    el.className = 'conn-item';
    el.innerHTML = `
      <input type="checkbox" id="conn-${id}" checked>
      <div>
        <div class="conn-title">${entry.title.slice(0, 55)}</div>
        <div class="conn-reason">${reasons[id] || ''}</div>
      </div>`;
    el.querySelector('input').addEventListener('change', ev => {
      ev.target.checked ? selectedConnections.add(id) : selectedConnections.delete(id);
    });
    list.appendChild(el);
  }
  toggle('field-connections', true);
}

// ── Queue ──────────────────────────────────────────────────────────────────
async function refreshBadge() {
  const q = await getQueue();
  const badge = $('badge-count');
  badge.textContent = q.length;
  badge.classList.toggle('hidden', q.length === 0);
}

async function renderQueue() {
  const q = await getQueue();
  $('queue-label').textContent = `${q.length} ${q.length === 1 ? 'item' : 'itens'} na fila`;
  $('btn-push').disabled = q.length === 0;

  const list = $('queue-list');
  list.innerHTML = '';

  if (!q.length) {
    list.innerHTML = '<div class="empty-queue">Fila vazia</div>';
    return;
  }

  q.forEach(item => {
    const el = document.createElement('div');
    el.className = 'q-item';
    el.innerHTML = `
      <span class="q-type">${item.subtype}</span>
      <span class="q-title" title="${item.title}">${item.title || '(sem título)'}</span>
      <button class="q-remove" data-id="${item.id}" title="Remover">✕</button>`;
    el.querySelector('.q-remove').addEventListener('click', async ev => {
      await removeFromQueue(ev.currentTarget.dataset.id);
      await renderQueue();
      await refreshBadge();
    });
    list.appendChild(el);
  });
}

// ── GitHub push ────────────────────────────────────────────────────────────
async function pushToGitHub() {
  const settings = await getSettings();
  if (!settings.githubToken || !settings.githubOwner || !settings.githubRepo) {
    toast('push-toast', 'Configure o GitHub nas configurações', 'error');
    return;
  }

  const btn = $('btn-push');
  btn.disabled = true;
  btn.classList.add('loading');
  btn.textContent = '↑ Enviando...';

  try {
    const queue = await getQueue();
    const { entries: existing, sha } = await getDataJson(
      settings.githubToken, settings.githubOwner, settings.githubRepo, settings.githubBranch
    );

    const clean = queue.map(({ _body, _desc, ...e }) => e);
    const merged = [...existing, ...clean];

    await putDataJson(
      settings.githubToken, settings.githubOwner, settings.githubRepo,
      merged, sha, settings.githubBranch, queue.length
    );

    await clearQueue();
    await refreshBadge();
    await renderQueue();
    toast('push-toast', `✓ ${queue.length} entr${queue.length === 1 ? 'ada' : 'adas'} publicadas!`, 'success');
  } catch (e) {
    toast('push-toast', `Erro: ${e.message}`, 'error');
  } finally {
    btn.classList.remove('loading');
    btn.textContent = '↑ Push GitHub';
    btn.disabled = false;
  }
}

// ── Manage (delete from GitHub) ────────────────────────────────────────────
async function renderManage() {
  const settings = await getSettings();
  const list = $('manage-label');

  if (!settings.githubToken || !settings.githubOwner || !settings.githubRepo) {
    $('manage-label').textContent = 'Configure o GitHub nas configurações';
    $('manage-list').innerHTML = '';
    return;
  }

  $('manage-label').textContent = 'Carregando...';
  $('manage-list').innerHTML = '';

  try {
    const { entries } = await getDataJson(
      settings.githubToken, settings.githubOwner, settings.githubRepo, settings.githubBranch
    );

    $('manage-label').textContent = `${entries.length} ${entries.length === 1 ? 'entrada' : 'entradas'} no LogBook`;

    if (!entries.length) {
      $('manage-list').innerHTML = '<div class="empty-queue">Nenhuma entrada ainda</div>';
      return;
    }

    const container = $('manage-list');
    [...entries].reverse().forEach(item => {
      const el = document.createElement('div');
      el.className = 'q-item';
      el.innerHTML = `
        <span class="q-type">${item.subtype || item.type}</span>
        <span class="q-title" title="${item.title}">${item.title || '(sem título)'}</span>
        <button class="q-remove" data-id="${item.id}" title="Deletar">🗑</button>`;
      el.querySelector('.q-remove').addEventListener('click', async ev => {
        const id = ev.currentTarget.dataset.id;
        if (!confirm(`Deletar "${item.title}"?`)) return;
        await deleteEntry(id, settings);
      });
      container.appendChild(el);
    });
  } catch (e) {
    $('manage-label').textContent = 'Erro ao carregar';
    toast('manage-toast', `Erro: ${e.message}`, 'error');
  }
}

async function deleteEntry(id, settings) {
  try {
    const { entries, sha } = await getDataJson(
      settings.githubToken, settings.githubOwner, settings.githubRepo, settings.githubBranch
    );
    const filtered = entries.filter(e => e.id !== id);
    await putDataJson(
      settings.githubToken, settings.githubOwner, settings.githubRepo,
      filtered, sha, settings.githubBranch, 0
    );
    toast('manage-toast', '✓ Entrada deletada', 'success');
    await renderManage();
  } catch (e) {
    toast('manage-toast', `Erro: ${e.message}`, 'error');
  }
}

// ── Settings ───────────────────────────────────────────────────────────────
async function loadSettings() {
  const s = await getSettings();
  $('s-provider').value   = s.aiProvider;
  $('s-claude-key').value = s.claudeKey;
  $('s-openai-key').value = s.openaiKey;
  $('s-gh-token').value   = s.githubToken;
  $('s-gh-repo').value    = s.githubOwner ? `${s.githubOwner}/${s.githubRepo}` : '';
  $('s-gh-branch').value  = s.githubBranch || 'main';
  updateProviderVisibility(s.aiProvider);
}

function updateProviderVisibility(p) {
  toggle('s-claude-row', p === 'claude');
  toggle('s-openai-row', p === 'openai');
}

async function saveSettingsFromForm() {
  const repoRaw = $('s-gh-repo').value.trim();
  const [owner = '', repo = ''] = repoRaw.includes('/') ? repoRaw.split('/') : ['', repoRaw];
  await saveSettings({
    aiProvider:   $('s-provider').value,
    claudeKey:    $('s-claude-key').value.trim(),
    openaiKey:    $('s-openai-key').value.trim(),
    githubToken:  $('s-gh-token').value.trim(),
    githubOwner:  owner,
    githubRepo:   repo,
    githubBranch: $('s-gh-branch').value.trim() || 'main',
  });
  showView('capture');
}

// ── Manual book form ───────────────────────────────────────────────────────
function resetBookForm() {
  $('bk-title').value  = '';
  $('bk-author').value = '';
  $('bk-tags').value   = '';
  $('bk-notes').value  = '';
  $('bk-url').value    = '';
  $('bk-status').value = 'quero ler';
  setBookRating(0);
}

function setBookRating(val) {
  bookRating = val;
  document.querySelectorAll('#bk-rating span').forEach((s, i) =>
    s.classList.toggle('active', i < val)
  );
}

async function addBookToQueue() {
  const title = $('bk-title').value.trim();
  if (!title) { $('bk-title').focus(); return; }

  const status = $('bk-status').value;
  const entry = createEntry({
    type:    'conteudo',
    subtype: 'livro',
    title,
    author:  $('bk-author').value.trim(),
    tags:    $('bk-tags').value.split(',').map(t => t.trim()).filter(Boolean),
    status,
    rating:  bookRating || null,
    notes:   $('bk-notes').value.trim(),
    url:     $('bk-url').value.trim(),
    dates: {
      captured: new Date().toISOString().split('T')[0],
      consumed: status === 'consumido' ? new Date().toISOString().split('T')[0] : null,
    },
  });

  await addToQueue(entry);
  await refreshBadge();
  resetBookForm();
  showView('capture');
}

// ── Navigation ─────────────────────────────────────────────────────────────
function showView(name) {
  ['capture', 'queue', 'settings', 'book', 'manage'].forEach(v => {
    $(`view-${v}`).classList.toggle('hidden', v !== name);
  });
  if (name === 'queue')    renderQueue();
  if (name === 'settings') loadSettings();
  if (name === 'book')     resetBookForm();
  if (name === 'manage')   renderManage();
}

// ── Event bindings ─────────────────────────────────────────────────────────
function bindAll() {
  $('btn-queue').addEventListener('click', () => showView('queue'));
  $('btn-settings').addEventListener('click', () => showView('settings'));
  $('btn-book').addEventListener('click', () => showView('book'));
  $('btn-manage').addEventListener('click', () => showView('manage'));
  $('btn-back-queue').addEventListener('click', () => showView('capture'));
  $('btn-back-settings').addEventListener('click', () => showView('capture'));
  $('btn-book-back').addEventListener('click', () => showView('capture'));
  $('btn-back-manage').addEventListener('click', () => showView('capture'));
  $('btn-book-add').addEventListener('click', addBookToQueue);
  document.querySelectorAll('#bk-rating span').forEach(s =>
    s.addEventListener('click', () => setBookRating(parseInt(s.dataset.v)))
  );

  $('sel-type').addEventListener('change', e => updateTypeUI(e.target.value));
  $('s-provider').addEventListener('change', e => updateProviderVisibility(e.target.value));

  $('btn-ai').addEventListener('click', () => triggerEnrich(currentEntry?._body || ''));

  $('rating').querySelectorAll('span').forEach(s =>
    s.addEventListener('click', () => setRating(parseInt(s.dataset.v)))
  );

  $('btn-add').addEventListener('click', async () => {
    const e = readForm();
    if (!e.title) { $('f-title').focus(); return; }
    await addToQueue(e);
    await refreshBadge();
    window.close();
  });

  $('btn-discard').addEventListener('click', () => window.close());
  $('btn-push').addEventListener('click', pushToGitHub);
  $('btn-save-settings').addEventListener('click', saveSettingsFromForm);
}

// ── Helpers ────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

function toggle(id, show) {
  document.getElementById(id)?.classList.toggle('hidden', !show);
}

function setRating(val) {
  rating = val;
  document.querySelectorAll('#rating span').forEach((s, i) =>
    s.classList.toggle('active', i < val)
  );
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function toast(containerId, msg, type) {
  const el = $(containerId);
  el.innerHTML = `<div class="toast ${type}">${msg}</div>`;
  if (type === 'success') setTimeout(() => { el.innerHTML = ''; }, 5000);
}

// ── Page scraper (injected into tab) ───────────────────────────────────────
function scrapePage() {
  const meta = (name) => {
    const s = [name, `og:${name}`, `twitter:${name}`, `article:${name}`];
    for (const n of s) {
      const el = document.querySelector(`meta[name="${n}"], meta[property="${n}"]`);
      if (el?.content) return el.content;
    }
    return '';
  };

  const ld = (() => {
    const types = ['Article','NewsArticle','BlogPosting','WebPage','Course','Book','VideoObject'];
    for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const d = JSON.parse(s.textContent);
        if (types.includes(d['@type'])) return d;
        if (Array.isArray(d['@graph'])) {
          const found = d['@graph'].find(n => types.includes(n['@type']));
          if (found) return found;
        }
      } catch {}
    }
    return null;
  })();

  const url = document.querySelector('link[rel="canonical"]')?.href || location.href;
  const urlL = url.toLowerCase();

  // ── Amazon book pages ────────────────────────────────────────────────────
  if (/amazon\.(com\.br|com|co\.uk|de|fr|es|it|ca|co\.jp)(\/.*)?\/dp\//.test(urlL) ||
      /amazon\.(com\.br|com|co\.uk)(\/.*)?\/gp\/product\//.test(urlL)) {
    const txt = s => s?.textContent?.replace(/\s+/g, ' ').trim() || '';

    const title = txt(document.querySelector('#productTitle'))
      || meta('title').replace(/\s*[-|].*Amazon.*$/i, '').trim();

    const authorEls = document.querySelectorAll('#bylineInfo .author .a-link-normal, #bylineInfo .contributorNameID');
    const author = authorEls.length
      ? Array.from(authorEls).map(a => txt(a)).filter(Boolean).join(', ')
      : txt(document.querySelector('#bylineInfo'));

    // Description: try expanded version first, then collapsed
    const descEl = document.querySelector('#bookDescription_feature_div .a-expander-content')
      || document.querySelector('#bookDescription_feature_div span[id]')
      || document.querySelector('#bookDescription_feature_div')
      || document.querySelector('#productDescription');
    const description = descEl?.innerText?.replace(/\s+/g, ' ').trim() || meta('description');

    // Publisher / year from detail bullets
    let publisher = '', year = '';
    document.querySelectorAll('#detailBullets_feature_div li, #productDetails_detailBullets_sections1 tr').forEach(row => {
      const t = row.textContent.replace(/\s+/g, ' ');
      if (/editora|publisher/i.test(t)) publisher = (t.split(':')[1] || '').trim().replace(/;.*/, '').trim();
      if (/data de publicação|publication date|ano/i.test(t)) {
        const m = t.match(/\d{4}/);
        if (m) year = m[0];
      }
    });

    return {
      title,
      description,
      author,
      siteName: 'Amazon',
      publisher,
      year,
      url,
      detectedType: 'livro',
      bodyText: description,
      isBook: true,
    };
  }

  // ── Goodreads ────────────────────────────────────────────────────────────
  if (/goodreads\.com\/book\/show/.test(urlL)) {
    const txt = s => s?.textContent?.replace(/\s+/g, ' ').trim() || '';
    const title  = txt(document.querySelector('h1[data-testid="bookTitle"], h1#bookTitle, [itemprop="name"]'))
      || meta('title').replace(/\s*[-|].*Goodreads.*$/i, '').trim();
    const author = txt(document.querySelector('[data-testid="name"], .authorName, [itemprop="author"] a'));
    const description = document.querySelector('[data-testid="description"] .DetailsLayoutRightParagraph, #description span:last-child')?.innerText?.trim()
      || meta('description');

    return { title, description, author, siteName: 'Goodreads', url, detectedType: 'livro', bodyText: description, isBook: true };
  }

  // ── Skoob ────────────────────────────────────────────────────────────────
  if (/skoob\.com\.br/.test(urlL)) {
    const txt = s => s?.textContent?.replace(/\s+/g, ' ').trim() || '';
    const title  = txt(document.querySelector('h1[itemprop="name"], .book-title, h1'))
      || meta('title').replace(/\s*[-|].*Skoob.*$/i, '').trim();
    const author = txt(document.querySelector('[itemprop="author"], .author-name a'));
    const description = document.querySelector('[itemprop="description"], .sinopse')?.innerText?.trim()
      || meta('description');

    return { title, description, author, siteName: 'Skoob', url, detectedType: 'livro', bodyText: description, isBook: true };
  }

  // ── Google Books ─────────────────────────────────────────────────────────
  if (/books\.google\.com|play\.google\.com\/store\/books/.test(urlL)) {
    const txt = s => s?.textContent?.replace(/\s+/g, ' ').trim() || '';
    const title  = txt(document.querySelector('[itemprop="name"], .gb-volume-header h1'))
      || ld?.name || meta('title');
    const author = ld?.author?.name || txt(document.querySelector('[itemprop="author"]'));
    const description = ld?.description || meta('description');

    return { title, description, author, siteName: 'Google Books', url, detectedType: 'livro', bodyText: description, isBook: true };
  }

  // ── Generic detection ────────────────────────────────────────────────────
  let detectedType = 'artigo';
  if (/youtube\.com|youtu\.be|vimeo\.com|twitch\.tv/.test(urlL))                         detectedType = 'vídeo';
  else if (/udemy|coursera|alura|pluralsight|egghead|linkedin\.com\/learning/.test(urlL)) detectedType = 'curso';
  else if (/\/news\/|\/noticias\/|techcrunch|reuters|cnn|bbc|g1\.globo/.test(urlL))       detectedType = 'notícia';
  else if (ld?.['@type'] === 'Book')        detectedType = 'livro';
  else if (ld?.['@type'] === 'Course')      detectedType = 'curso';
  else if (ld?.['@type'] === 'VideoObject') detectedType = 'vídeo';

  return {
    title:       document.title || meta('title') || ld?.headline || '',
    description: meta('description') || ld?.description || '',
    author:      meta('author') || ld?.author?.name || '',
    siteName:    meta('og:site_name') || document.domain,
    url,
    detectedType,
    bodyText:    (document.body?.innerText || '').slice(0, 3000),
    isBook:      detectedType === 'livro',
  };
}
