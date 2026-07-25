export async function enrichEntry(entry, pageContent, existingEntries, settings) {
  const { aiProvider, claudeKey, openaiKey } = settings;
  if (aiProvider === 'none') return null;
  if (aiProvider === 'claude' && !claudeKey) return null;
  if (aiProvider === 'openai' && !openaiKey) return null;

  const existingTags = [...new Set(existingEntries.flatMap(e => e.tags || []))].slice(0, 60);
  const recentEntries = existingEntries.slice(-30).map(e => ({
    id: e.id,
    title: e.title,
    subtype: e.subtype,
    tags: e.tags,
  }));

  const prompt = `Você é um assistente de curadoria para um logbook pessoal de conhecimento chamado LogBook (pt-BR).

Dados da página capturada:
Título: ${entry.title}
URL: ${entry.url}
Autor: ${entry.author || 'desconhecido'}
Descrição: ${entry.description || ''}
Conteúdo (trecho): ${pageContent.slice(0, 1500)}

Tags existentes no logbook: ${existingTags.join(', ') || 'nenhuma ainda'}
Últimas entradas: ${JSON.stringify(recentEntries)}

Responda APENAS com JSON válido, sem markdown:
{
  "subtype": "artigo|notícia|livro|curso|treinamento|vídeo",
  "tags": ["tag1", "tag2"],
  "notes_draft": "rascunho em pt-BR, tom objetivo e neutro (sem primeira pessoa), máx 200 chars, o que é relevante neste conteúdo e por que importa",
  "connections": ["id_entrada_relacionada"],
  "connection_reasons": {"id": "por que se relaciona"}
}

Regras:
- subtype: detecte a partir da URL, conteúdo e contexto
- tags: prefira tags existentes; sugira novas se necessário (máx 4, pt-BR, minúsculas)
- notes_draft: seja direto e pessoal, como uma nota rápida de leitura
- connections: máx 2 IDs de entradas existentes que se relacionam diretamente`;

  try {
    if (aiProvider === 'claude') return await callClaude(prompt, claudeKey);
    if (aiProvider === 'openai') return await callOpenAI(prompt, openaiKey);
  } catch (e) {
    throw new Error(`AI (${aiProvider}): ${e.message}`);
  }
  return null;
}

/**
 * Rascunho de artigo a partir de materiais já consumidos. A parte difícil de
 * "depois escrevo" é começar; isso devolve título, tags e um corpo em markdown
 * com as referências já resolvidas por quem chamou.
 */
export async function draftArticle(entries, angle, settings) {
  const { aiProvider, claudeKey, openaiKey } = settings;
  if (aiProvider === 'none') throw new Error('nenhum provedor de IA configurado em ⚙');
  const key = aiProvider === 'claude' ? claudeKey : openaiKey;
  if (!key) throw new Error(`falta a chave do ${aiProvider} em ⚙`);

  const material = entries.map((e, i) => [
    `[${i + 1}] ${e.title}${e.author ? ` — ${e.author}` : ''}`,
    e.notes ? `Nota: ${e.notes}` : '',
    (e.quotes || []).length ? 'Trechos: ' + e.quotes.map(q => `"${q.text}"`).join(' | ') : '',
    (e.tags || []).length ? `Tags: ${e.tags.join(', ')}` : '',
  ].filter(Boolean).join('\n')).join('\n\n');

  const prompt = `Você ajuda a escrever um artigo para o LogBook, um logbook pessoal de conhecimento em pt-BR.

Materiais que a pessoa leu e anotou:
${material}

${angle ? `Ângulo desejado: ${angle}` : 'Encontre o fio condutor entre os materiais.'}

Responda APENAS com JSON válido, sem markdown:
{
  "title": "título direto, sem subtítulo, máx 70 chars",
  "tags": ["tag1", "tag2"],
  "body": "corpo em markdown, 400-700 palavras"
}

Regras do corpo:
- primeira pessoa, tom de quem estudou o assunto, sem jargão de LinkedIn
- estruture com 2 ou 3 subtítulos ## quando fizer sentido
- use os trechos como citação em blockquote quando ajudarem o argumento
- cite os materiais no texto pelo título, nunca pelo número [1]
- é um RASCUNHO: deixe claro onde falta desenvolver, com um parágrafo final "A desenvolver:" listando as lacunas
- não invente fatos que não estão nas notas ou trechos`;

  if (aiProvider === 'claude') return callClaude(prompt, claudeKey, 2048);
  return callOpenAI(prompt, openaiKey, 2048);
}

async function callClaude(prompt, apiKey, maxTokens = 512) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return JSON.parse(data.content[0].text);
}

async function callOpenAI(prompt, apiKey, maxTokens = 512) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}
