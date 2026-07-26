export function createEntry(overrides = {}) {
  const today = new Date().toISOString().split('T')[0];
  return {
    id: crypto.randomUUID(),
    type: 'conteudo',
    subtype: 'artigo',
    title: '',
    url: '',
    author: '',
    source: '',
    image: '',
    tags: [],
    status: 'quero ler',
    rating: 0,
    notes: '',
    // Progresso de leitura. 0 = sem controle de páginas; a barra só aparece
    // no site quando pages > 0.
    pages: 0,
    pagesRead: 0,
    // Conexões com outras entradas: [{ id, why }]. A IA sugere, você confirma.
    related: [],
    dates: {
      captured: today,
      // consumed só é preenchido quando o item é de fato marcado como consumido.
      consumed: null,
      start: null,
      end: null,
      idea: null,
      started: null,
      launched: null,
    },
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// pitch e description existem só em projetos (ver readForm no popup).
// changelog e links foram removidos: nada nunca escreveu neles.

export const SUBTYPES = {
  conteudo: ['artigo', 'notícia', 'livro', 'curso', 'treinamento', 'vídeo'],
  projeto: ['projeto'],
};

export const STATUS = {
  conteudo: ['quero ler', 'em andamento', 'consumido', 'abandonado'],
  projeto: ['ideia', 'iniciado', 'em andamento', 'pausado', 'lançado', 'arquivado'],
};

// Normaliza tag para comparação/dedupe — o site faz o mesmo na leitura.
export const normTag = (t) => String(t).trim().toLowerCase();

// Duas URLs iguais a menos de tracking/barra final são a mesma página.
export function normUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    u.hash = '';
    [...u.searchParams.keys()]
      .filter(k => /^(utm_|fbclid|gclid|ref|si$)/i.test(k))
      .forEach(k => u.searchParams.delete(k));
    return (u.origin + u.pathname.replace(/\/$/, '') + u.search).toLowerCase();
  } catch {
    return String(url).trim().toLowerCase();
  }
}
