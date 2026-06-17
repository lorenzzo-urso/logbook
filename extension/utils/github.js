function jsonToBase64(obj) {
  const json = JSON.stringify(obj, null, 2);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach(b => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function base64ToJson(b64) {
  const binary = atob(b64.replace(/\n/g, ''));
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };
}

export async function getDataJson(token, owner, repo, branch = 'main') {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/data.json?ref=${branch}`,
    { headers: headers(token) }
  );
  if (res.status === 404) return { entries: [], sha: null };
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub ${res.status}`);
  }
  const file = await res.json();
  const data = base64ToJson(file.content);
  return { entries: data.entries || [], sha: file.sha };
}

export async function putDataJson(token, owner, repo, entries, sha, branch = 'main', addedCount = 0) {
  const payload = {
    version: '1',
    lastUpdated: new Date().toISOString().split('T')[0],
    entries,
  };
  const body = {
    message: addedCount === 1
      ? `add: "${entries[entries.length - 1]?.title?.slice(0, 60) || 'entry'}"`
      : `add: ${addedCount} entr${addedCount === 1 ? 'ada' : 'adas'} via extensão`,
    content: jsonToBase64(payload),
    branch,
  };
  if (sha) body.sha = sha;

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/data.json`,
    { method: 'PUT', headers: headers(token), body: JSON.stringify(body) }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub ${res.status}`);
  }
  return res.json();
}
