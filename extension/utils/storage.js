export async function getQueue() {
  const { queue = [] } = await chrome.storage.local.get('queue');
  return queue;
}

export async function addToQueue(entry) {
  const queue = await getQueue();
  queue.push(entry);
  await chrome.storage.local.set({ queue });
  return queue;
}

export async function removeFromQueue(id) {
  const queue = await getQueue();
  const updated = queue.filter(e => e.id !== id);
  await chrome.storage.local.set({ queue: updated });
  return updated;
}

export async function updateInQueue(entry) {
  const queue = await getQueue();
  const idx = queue.findIndex(e => e.id === entry.id);
  if (idx !== -1) queue[idx] = entry;
  await chrome.storage.local.set({ queue });
  return queue;
}

export async function clearQueue() {
  await chrome.storage.local.set({ queue: [] });
}

// Entradas privadas nunca vão para o repositório: num repo público, "privado"
// dentro do data.json seria mentira. Ficam aqui, e você exporta se quiser.
export async function getPrivateEntries() {
  const { privateEntries = [] } = await chrome.storage.local.get('privateEntries');
  return privateEntries;
}

export async function addPrivateEntries(entries) {
  const atuais = await getPrivateEntries();
  const merged = [...atuais, ...entries];
  await chrome.storage.local.set({ privateEntries: merged });
  return merged;
}

const DEFAULTS = {
  aiProvider: 'claude',
  claudeKey: '',
  openaiKey: '',
  githubToken: '',
  githubOwner: '',
  githubRepo: '',
  githubBranch: 'main',
};

// storage.local, não sync: token do GitHub e chaves de API não devem ser
// replicados em texto plano para todo dispositivo logado na conta Google.
export async function getSettings() {
  const { settings } = await chrome.storage.local.get('settings');
  if (settings) return { ...DEFAULTS, ...settings };

  // Migração única do storage.sync antigo — move e apaga a cópia sincronizada.
  const { settings: synced } = await chrome.storage.sync.get('settings');
  if (synced) {
    await chrome.storage.local.set({ settings: synced });
    await chrome.storage.sync.remove('settings');
    return { ...DEFAULTS, ...synced };
  }
  return { ...DEFAULTS };
}

export async function saveSettings(settings) {
  await chrome.storage.local.set({ settings });
}
