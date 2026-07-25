import { createEntry, SUBTYPES, STATUS, normUrl, normTag } from '../utils/schema.js';
import { getQueue, addToQueue, removeFromQueue, clearQueue, getSettings, saveSettings, getPrivateEntries, addPrivateEntries } from '../utils/storage.js';
import { enrichEntry, draftArticle } from '../utils/ai.js';
import { getDataJson, updateDataJson, putFile } from '../utils/github.js';

// ── State ──────────────────────────────────────────────────────────────────
let currentEntry = null;
let rating = 0;
let bookRating = 0;
let selectedConnections = new Map();   // id -> motivo da conexão
let existingEntriesCache = [];
let editing = null;                    // entrada do GitHub aberta para edição

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
      image:   scraped.image || '',
      status:  'quero ler',
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
  $('sel-status').value  = e.status  || 'quero ler';
  $('f-title').value     = e.title   || '';
  $('f-url').value       = e.url     || '';
  $('f-author').value    = e.author  || '';
  $('f-pitch').value     = e.pitch   || '';
  $('f-tags').value      = (e.tags || []).join(', ');
  $('f-notes').value     = e.notes   || '';
  $('f-desc').value      = e.description || '';
  $('f-quotes').value  = (e.quotes || []).map(q => q.page ? `${q.text} — ${q.page}` : q.text).join('\n');
  $('f-private').checked = !!e.private;
  setRating(e.rating || 0);
}

function readForm() {
  const type = $('sel-type').value;
  const status = $('sel-status').value;
  const today = new Date().toISOString().split('T')[0];
  const e = {
    ...currentEntry,
    type,
    subtype: $('sel-subtype').value,
    title:   $('f-title').value.trim(),
    url:     $('f-url').value.trim(),
    author:  $('f-author').value.trim(),
    tags:    [...new Set($('f-tags').value.split(',').map(normTag).filter(Boolean))],
    status,
    notes:   $('f-notes').value.trim(),
    rating,
    related: [...selectedConnections].map(([id, why]) => ({ id, why })),
    dates: {
      ...(currentEntry?.dates || {}),
      // Só é "consumido em" se estiver consumido — antes copiava a data de captura sempre.
      consumed: status === 'consumido' ? ((currentEntry?.dates?.consumed) || today) : null,
    },
  };
  if (type === 'projeto') {
    e.pitch = $('f-pitch').value.trim();
    e.description = $('f-desc').value.trim();
  }
  const quotes = parseQuotes($('f-quotes').value);
  if (quotes.length) e.quotes = quotes;
  if ($('f-private').checked) e.private = true;
  return e;
}

// Uma linha = um trecho. "texto — p. 42" separa a localização, se você escrever.
function parseQuotes(raw) {
  return String(raw || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const m = l.match(/^(.*?)\s+[—-]\s*(p\.?\s*[\d\-]+|pos\.?\s*[\d\-]+)$/i);
    return m ? { text: m[1].trim(), page: m[2].trim() } : { text: l, page: '' };
  });
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
    const el = document.createElement('div');
    el.className = 'conn-item';
    el.innerHTML = `
      <input type="checkbox" id="conn-${id}">
      <div>
        <div class="conn-title">${entry.title.slice(0, 55)}</div>
        <div class="conn-reason">${reasons[id] || ''}</div>
      </div>`;
    el.querySelector('input').addEventListener('change', ev => {
      if (ev.target.checked) selectedConnections.set(id, reasons[id] || '');
      else selectedConnections.delete(id);
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

  // Privadas ficam só aqui; sem um jeito de exportar, ficariam presas no navegador.
  const privadas = await getPrivateEntries();
  $('private-row').classList.toggle('hidden', privadas.length === 0);
  $('private-label').textContent = `${privadas.length} privada(s) só neste navegador`;

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

  const tudo = await getQueue();
  // Privadas saem da fila e ficam só no navegador — repo público não guarda segredo.
  const privadas = tudo.filter(e => e.private);
  const queue = tudo.filter(e => !e.private);
  if (privadas.length) await addPrivateEntries(privadas.map(({ _body, _desc, ...e }) => e));

  // Fila vazia não vira commit. O histórico tem dois "add: 0 entradas".
  if (!queue.length) {
    await clearQueue();
    await refreshBadge();
    await renderQueue();
    toast('push-toast', privadas.length
      ? `${privadas.length} privada(s) guardada(s) localmente — nada publicado`
      : 'Fila vazia — nada a publicar', privadas.length ? 'success' : 'error');
    return;
  }

  const btn = $('btn-push');
  btn.disabled = true;
  btn.classList.add('loading');
  btn.textContent = '↑ Enviando...';

  let added = 0, skipped = 0, arquivados = 0;
  try {
    // Arquiva o texto lido antes de publicar. Era scrapado, mandado para a IA e
    // jogado fora — agora sobrevive ao link original sair do ar.
    const { entries: jaLa } = await getDataJson(
      settings.githubToken, settings.githubOwner, settings.githubRepo, settings.githubBranch);
    const conhecidas = new Set(jaLa.map(e => normUrl(e.url)).filter(Boolean));
    for (const item of queue) {
      const key = normUrl(item.url);
      if ((key && conhecidas.has(key)) || !item._body || item._body.length < 400) continue;
      const cabecalho = `# ${item.title}\n\n> Arquivado em ${new Date().toISOString().slice(0, 10)} de ${item.url}\n\n---\n\n`;
      try {
        await putFile(settings, `archive/${item.id}.md`, cabecalho + item._body,
          `archive: "${(item.title || '').slice(0, 50)}"`);
        item.archived = true;
        arquivados++;
      } catch { /* arquivo é bônus: falhar aqui não pode impedir a publicação */ }
    }

    await updateDataJson(settings, (existing) => {
      const seen = new Set(existing.map(e => normUrl(e.url)).filter(Boolean));
      const fresh = [];
      for (const { _body, _desc, ...e } of queue) {
        const key = normUrl(e.url);
        if (key && seen.has(key)) { skipped++; continue; }   // já está no LogBook
        if (key) seen.add(key);
        fresh.push(e);
      }
      added = fresh.length;
      return fresh.length ? [...existing, ...fresh] : null;
    }, () => added === 1
      ? `add: "${queue[queue.length - 1]?.title?.slice(0, 60) || 'entrada'}"`
      : `add: ${added} entradas via extensão`);

    await clearQueue();
    await refreshBadge();
    await renderQueue();
    const msg = added
      ? `✓ ${added} publicada${added === 1 ? '' : 's'}${arquivados ? ` · ${arquivados} texto(s) arquivado(s)` : ''}${skipped ? ` · ${skipped} duplicada(s) ignorada(s)` : ''}`
      : `Nada novo — ${skipped} já estava${skipped === 1 ? '' : 'm'} no LogBook`;
    toast('push-toast', msg, added ? 'success' : 'error');
  } catch (e) {
    toast('push-toast', `Erro: ${e.message}`, 'error');
  } finally {
    btn.classList.remove('loading');
    btn.textContent = '↑ Push GitHub';
    btn.disabled = false;
  }
}

// ── Manage (editar / deletar no GitHub) ────────────────────────────────────
let manageCache = [];

async function renderManage() {
  const settings = await getSettings();

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
    manageCache = entries;
    existingEntriesCache = entries;
    drawManageList(settings, $('manage-search').value);
  } catch (e) {
    $('manage-label').textContent = 'Erro ao carregar';
    toast('manage-toast', `Erro: ${e.message}`, 'error');
  }
}

function drawManageList(settings, filter = '') {
  const q = filter.trim().toLowerCase();
  const shown = q
    ? manageCache.filter(e => `${e.title} ${e.author || ''}`.toLowerCase().includes(q))
    : manageCache;

  $('manage-label').textContent = `${shown.length} de ${manageCache.length} ${manageCache.length === 1 ? 'entrada' : 'entradas'}`;
  const container = $('manage-list');
  container.innerHTML = '';

  if (!shown.length) {
    container.innerHTML = '<div class="empty-queue">Nenhuma entrada</div>';
    return;
  }

  [...shown].reverse().forEach(item => {
    const el = document.createElement('div');
    el.className = 'q-item';
    el.innerHTML = `
      <span class="q-type">${item.status || item.subtype || item.type}</span>
      <span class="q-title" title="${item.title}">${item.title || '(sem título)'}</span>
      <button class="q-edit" title="Editar">✎</button>
      <button class="q-remove" title="Deletar">🗑</button>`;
    el.querySelector('.q-edit').addEventListener('click', () => openEdit(item));
    el.querySelector('.q-remove').addEventListener('click', async () => {
      if (!confirm(`Deletar "${item.title}"?`)) return;
      await deleteEntry(item.id, settings);
    });
    container.appendChild(el);
  });
}

async function deleteEntry(id, settings) {
  try {
    const title = manageCache.find(e => e.id === id)?.title || 'entrada';
    await updateDataJson(settings,
      entries => entries.filter(e => e.id !== id),
      `remove: "${title.slice(0, 60)}"`);
    toast('manage-toast', '✓ Entrada deletada', 'success');
    await renderManage();
  } catch (e) {
    toast('manage-toast', `Erro: ${e.message}`, 'error');
  }
}

// ── Edit (marcar como lido / revisar entrada já publicada) ─────────────────
let editRating = 0;

function openEdit(entry) {
  editing = entry;
  editRating = entry.rating || 0;
  $('edit-title').textContent = entry.title || '(sem título)';
  $('e-status').innerHTML = (STATUS[entry.type] || STATUS.conteudo)
    .map(v => `<option value="${v}">${cap(v)}</option>`).join('');
  $('e-status').value = entry.status || 'quero ler';
  $('e-consumed').value = (entry.dates || {}).consumed || '';
  $('e-tags').value = (entry.tags || []).join(', ');
  $('e-notes').value = entry.notes || '';
  setEditRating(editRating);
  showView('edit');
}

function setEditRating(val) {
  editRating = val;
  document.querySelectorAll('#e-rating span').forEach((s, i) => s.classList.toggle('active', i < val));
}

async function saveEdit() {
  if (!editing) return;
  const settings = await getSettings();
  const status = $('e-status').value;
  const today = new Date().toISOString().split('T')[0];
  const btn = $('btn-edit-save');
  btn.disabled = true;

  try {
    await updateDataJson(settings, (entries) => {
      const i = entries.findIndex(e => e.id === editing.id);
      if (i === -1) throw new Error('entrada não existe mais no data.json');
      entries[i] = {
        ...entries[i],
        status,
        rating: editRating,
        tags: [...new Set($('e-tags').value.split(',').map(normTag).filter(Boolean))],
        notes: $('e-notes').value.trim(),
        dates: {
          ...(entries[i].dates || {}),
          consumed: $('e-consumed').value || (status === 'consumido' ? today : null),
        },
      };
      return entries;
    }, `update: "${(editing.title || '').slice(0, 60)}" → ${status}`);

    toast('edit-toast', '✓ Salvo', 'success');
    editing = null;
    setTimeout(() => showView('manage'), 700);
  } catch (e) {
    toast('edit-toast', `Erro: ${e.message}`, 'error');
  } finally {
    btn.disabled = false;
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
  const today = new Date().toISOString().split('T')[0];
  const base = createEntry();
  const entry = {
    ...base,
    type:    'conteudo',
    subtype: 'livro',
    title,
    author:  $('bk-author').value.trim(),
    tags:    [...new Set($('bk-tags').value.split(',').map(normTag).filter(Boolean))],
    status,
    rating:  bookRating,
    notes:   $('bk-notes').value.trim(),
    url:     $('bk-url').value.trim(),
    dates:   { ...base.dates, consumed: status === 'consumido' ? today : null },
  };

  await addToQueue(entry);
  await refreshBadge();
  resetBookForm();
  showView('capture');
}

async function exportPrivate() {
  const privadas = await getPrivateEntries();
  if (!privadas.length) return;
  const blob = new Blob([JSON.stringify({ entries: privadas }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'logbook-privadas.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── Captura em lote ────────────────────────────────────────────────────────
async function addBulkToQueue() {
  const urls = $('bulk-urls').value.split('\n').map(u => u.trim()).filter(u => /^https?:\/\//i.test(u));
  if (!urls.length) { toast('bulk-toast', 'Cole ao menos uma URL http(s)', 'error'); return; }

  const status = $('bulk-status').value;
  const tags = [...new Set($('bulk-tags').value.split(',').map(normTag).filter(Boolean))];
  const hoje = new Date().toISOString().split('T')[0];
  const naFila = new Set((await getQueue()).map(e => normUrl(e.url)).filter(Boolean));

  let add = 0, dup = 0;
  for (const url of urls) {
    if (naFila.has(normUrl(url))) { dup++; continue; }
    naFila.add(normUrl(url));
    const base = createEntry();
    // Sem abrir cada aba não dá para raspar título: fica o domínio, você edita depois.
    let host = url;
    try { host = new URL(url).hostname.replace(/^www\./, ''); } catch { /* usa a url crua */ }
    await addToQueue({
      ...base, title: url.length > 90 ? url.slice(0, 90) + '…' : url,
      url, source: host, status, tags,
      dates: { ...base.dates, consumed: status === 'consumido' ? hoje : null },
    });
    add++;
  }

  await refreshBadge();
  $('bulk-urls').value = '';
  toast('bulk-toast', `${add} na fila${dup ? ` · ${dup} já estava(m)` : ''}`, add ? 'success' : 'error');
}

// ── Rascunho de artigo com IA ──────────────────────────────────────────────
const draftSelection = new Set();

async function renderDraft() {
  const settings = await getSettings();
  draftSelection.clear();
  $('draft-list').innerHTML = '<div class="empty-queue">Carregando...</div>';

  if (!settings.githubToken || !settings.githubOwner || !settings.githubRepo) {
    $('draft-list').innerHTML = '<div class="empty-queue">Configure o GitHub primeiro</div>';
    return;
  }
  try {
    const { entries } = await getDataJson(
      settings.githubToken, settings.githubOwner, settings.githubRepo, settings.githubBranch);
    existingEntriesCache = entries;
    drawDraftList('');
  } catch (e) {
    toast('draft-toast', `Erro: ${e.message}`, 'error');
  }
}

function drawDraftList(filtro) {
  const q = filtro.trim().toLowerCase();
  // Material sem nota não ajuda a IA a escrever nada — prioriza o que tem.
  const lista = existingEntriesCache
    .filter(e => !q || `${e.title} ${e.author || ''} ${(e.tags || []).join(' ')}`.toLowerCase().includes(q))
    .sort((a, b) => (b.notes || '').length - (a.notes || '').length)
    .slice(0, 40);

  const el = $('draft-list');
  el.innerHTML = '';
  lista.forEach(item => {
    const row = document.createElement('label');
    row.className = 'q-item';
    row.innerHTML = `<input type="checkbox"><span class="q-title" title="${item.title}">${item.title || '(sem título)'}</span>
      <span class="q-type">${(item.quotes || []).length ? `${item.quotes.length} trechos` : item.status}</span>`;
    row.querySelector('input').addEventListener('change', ev => {
      ev.target.checked ? draftSelection.add(item.id) : draftSelection.delete(item.id);
      $('draft-label').textContent = draftSelection.size
        ? `${draftSelection.size} selecionado(s)` : 'Escolha os materiais';
    });
    el.appendChild(row);
  });
  if (!lista.length) el.innerHTML = '<div class="empty-queue">Nada encontrado</div>';
}

async function gerarRascunho() {
  if (!draftSelection.size) { toast('draft-toast', 'Selecione ao menos um material', 'error'); return; }
  const settings = await getSettings();
  const btn = $('btn-draft-gen');
  btn.disabled = true;
  btn.classList.add('loading');
  toast('draft-toast', '✦ Escrevendo...', 'success');

  try {
    const escolhidos = existingEntriesCache.filter(e => draftSelection.has(e.id));
    const rascunho = await draftArticle(escolhidos, $('draft-angle').value.trim(), settings);
    if (!rascunho) throw new Error('a IA não devolveu nada — confira a chave em ⚙');

    const hoje = new Date().toISOString().split('T')[0];
    const slug = (rascunho.title || 'rascunho').toLowerCase().normalize('NFD')
      .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    const md = `---\ntitle: ${rascunho.title}\ndate: ${hoje}\ntags: ${(rascunho.tags || []).join(', ')}\nrefs:\n`
      + escolhidos.map(e => `  - ${e.url || e.id}`).join('\n')
      + `\ndraft: true\n---\n\n${rascunho.body}\n`;

    await putFile(settings, `posts/${hoje}-${slug}.md`, md, `draft: "${rascunho.title}"`);
    toast('draft-toast', `✓ posts/${hoje}-${slug}.md criado (draft) — edite e rode ./build.sh`, 'success');
    draftSelection.clear();
  } catch (e) {
    toast('draft-toast', `Erro: ${e.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.classList.remove('loading');
  }
}

// ── Navigation ─────────────────────────────────────────────────────────────
function showView(name) {
  ['capture', 'queue', 'settings', 'book', 'manage', 'edit', 'bulk', 'draft'].forEach(v => {
    $(`view-${v}`).classList.toggle('hidden', v !== name);
  });
  if (name === 'queue')    renderQueue();
  if (name === 'settings') loadSettings();
  if (name === 'book')     resetBookForm();
  if (name === 'manage')   renderManage();
  if (name === 'draft')    renderDraft();
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

  $('btn-bulk').addEventListener('click', () => showView('bulk'));
  $('btn-draft').addEventListener('click', () => showView('draft'));
  $('btn-bulk-back').addEventListener('click', () => showView('capture'));
  $('btn-draft-back').addEventListener('click', () => showView('capture'));
  $('btn-bulk-add').addEventListener('click', addBulkToQueue);
  $('btn-draft-gen').addEventListener('click', gerarRascunho);
  $('draft-search').addEventListener('input', e => drawDraftList(e.target.value));
  $('btn-export-private').addEventListener('click', exportPrivate);

  $('manage-search').addEventListener('input', async e =>
    drawManageList(await getSettings(), e.target.value));
  $('btn-edit-save').addEventListener('click', saveEdit);
  $('btn-edit-back').addEventListener('click', () => { editing = null; showView('manage'); });
  document.querySelectorAll('#e-rating span').forEach(s =>
    s.addEventListener('click', () => setEditRating(parseInt(s.dataset.v))));
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
  // og:image costuma vir relativo ("/static/logo.png"): sem resolver contra a
  // página, a capa quebra em qualquer lugar que não seja o site de origem.
  const abs = (u) => { try { return u ? new URL(u, location.href).href : ''; } catch { return ''; } };
  const meta = (name) => {
    const s = [name, `og:${name}`, `twitter:${name}`, `article:${name}`];
    for (const n of s) {
      const el = document.querySelector(`meta[name="${n}"], meta[property="${n}"]`);
      if (el?.content) return /image/i.test(n) ? abs(el.content) : el.content;
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

    const image = meta('og:image')
      || document.querySelector('#imgTagWrappingLink img, #landingImage')?.src
      || '';

    return {
      title,
      description,
      author,
      siteName: 'Amazon',
      publisher,
      year,
      url,
      image,
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

    return { title, description, author, image: meta('og:image'), siteName: 'Goodreads', url, detectedType: 'livro', bodyText: description, isBook: true };
  }

  // ── Skoob ────────────────────────────────────────────────────────────────
  if (/skoob\.com\.br/.test(urlL)) {
    const txt = s => s?.textContent?.replace(/\s+/g, ' ').trim() || '';
    const title  = txt(document.querySelector('h1[itemprop="name"], .book-title, h1'))
      || meta('title').replace(/\s*[-|].*Skoob.*$/i, '').trim();
    const author = txt(document.querySelector('[itemprop="author"], .author-name a'));
    const description = document.querySelector('[itemprop="description"], .sinopse')?.innerText?.trim()
      || meta('description');

    return { title, description, author, image: meta('og:image'), siteName: 'Skoob', url, detectedType: 'livro', bodyText: description, isBook: true };
  }

  // ── Google Books ─────────────────────────────────────────────────────────
  if (/books\.google\.com|play\.google\.com\/store\/books/.test(urlL)) {
    const txt = s => s?.textContent?.replace(/\s+/g, ' ').trim() || '';
    const title  = txt(document.querySelector('[itemprop="name"], .gb-volume-header h1'))
      || ld?.name || meta('title');
    const author = ld?.author?.name || txt(document.querySelector('[itemprop="author"]'));
    const description = ld?.description || meta('description');

    return { title, description, author, image: meta('og:image'), siteName: 'Google Books', url, detectedType: 'livro', bodyText: description, isBook: true };
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
    image:       meta('og:image') || meta('twitter:image') || '',
    url,
    detectedType,
    bodyText:    (document.body?.innerText || '').slice(0, 3000),
    isBook:      detectedType === 'livro',
  };
}
