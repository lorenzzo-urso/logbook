# LogBook

Logbook pessoal de conhecimento. Captura artigos, vídeos, livros e cursos enquanto navega, enriquece com IA e publica automaticamente no seu site via GitHub Pages.

---

## Como funciona

```
Você navega e acha algo interessante
        ↓
Abre a extensão do Chrome
        ↓
Ela scrapa a página (título, autor, URL, tipo)
        ↓
IA sugere tags, notas e conexões com entradas anteriores
        ↓
Você revisa, edita e adiciona à fila
        ↓
Push → extensão escreve data.json direto no GitHub via API
        ↓
GitHub Pages atualiza o site automaticamente
```

Sem backend. Sem banco de dados. O `data.json` no repositório é o único storage — lido pelo site e escrito pela extensão.

---

## Estrutura do repositório

```
/
├── index.html          # Casca da página (meta tags, fontes, scripts)
├── src/app.jsx         # Fonte do site — edite aqui
├── app.js              # Gerado por ./build.sh (commitado)
├── styles.css          # Tokens de design + componentes
├── vendor/             # React 18 de produção (UMD), sem CDN
├── posts/*.md          # Seus artigos (markdown + front matter)
├── posts.json          # Gerado por ./build.sh — não edite
├── p/<slug>/           # Página real de cada artigo (SEO e preview de link)
├── og/<slug>.png       # Imagem de compartilhamento, gerada na build
├── archive/<id>.md     # Texto do material salvo no dia da captura
├── data.json           # Todas as entradas (gerenciado pela extensão)
├── aliases.json        # Sinônimos de tag ("ia" → "inteligência artificial")
├── feed.xml            # RSS de artigos + materiais
├── build.sh            # JSX → app.js, artigos, imagens e feed
├── tools/
│   ├── build_posts.py  # posts/*.md → posts.json + páginas + og:image
│   ├── gen_feed.py     # Gerador do RSS
│   ├── import_kindle.py# My Clippings.txt → entradas com trechos
│   ├── import_csv.py   # Export do Goodreads/Skoob → entradas
│   ├── issue_to_entry.py # Issue rotulada `captura` → entrada (usado pela Action)
│   ├── status_report.py  # Corpo da issue semanal
│   ├── check_links.py    # Caça links quebrados (mensal)
│   └── selftest.mjs      # Checagem de dedupe, posts, feed e páginas
└── extension/
    ├── manifest.json
    ├── background.js
    ├── popup/
    │   ├── popup.html
    │   ├── popup.js
    │   └── popup.css
    └── utils/
        ├── schema.js   # Estrutura de uma entrada
        ├── storage.js  # Fila local e configurações
        ├── github.js   # Leitura e escrita no GitHub via API
        └── ai.js       # Integração Claude / OpenAI
```

### Mexendo no site

```bash
./build.sh
```

Transpila `src/app.jsx` → `app.js` (esbuild via `npx`, sem `node_modules`) e regenera o `feed.xml`. Commite os dois. Para testar local: `python3 -m http.server` e abra `localhost:8000`.

O `feed.xml` também é regenerado sozinho pelo GitHub Actions sempre que a extensão altera o `data.json`.

---

## Configuração

### 1. Fork / clone do repositório

```bash
git clone https://github.com/seu-usuario/logbook.git
cd logbook
```

### 2. Ativar o GitHub Pages

No repositório no GitHub:
- **Settings → Pages**
- Source: `Deploy from a branch`
- Branch: `master` / `main`, pasta `/` (root)
- Salvar

O site ficará disponível em `https://seu-usuario.github.io/logbook`.

### 3. Criar um GitHub Personal Access Token (PAT)

Em [github.com/settings/tokens](https://github.com/settings/tokens):

**Fine-grained token (recomendado):**
- Repository access: apenas o repositório `logbook`
- Permissions → Repository permissions → **Contents: Read and Write**

**Classic token (alternativa):**
- Escopo: `public_repo`

Guarde o token — ele só aparece uma vez.

### 4. Instalar a extensão no Chrome

1. Abra `chrome://extensions/`
2. Ative o **Modo do desenvolvedor** (canto superior direito)
3. Clique em **Carregar sem compactação**
4. Selecione a pasta `extension/` do repositório

### 5. Configurar a extensão

Clique no ícone da extensão → botão **⚙** → preencha:

| Campo | Valor |
|---|---|
| AI Provider | `Claude` ou `OpenAI` (opcional — pode deixar `Sem AI`) |
| Claude API Key | `sk-ant-...` (se usar Claude) |
| OpenAI API Key | `sk-...` (se usar OpenAI) |
| GitHub Token | O PAT criado no passo 3 |
| Repositório | `seu-usuario/logbook` |
| Branch | `master` ou `main` |

Salve. Pronto.

---

## Usando

### Capturar uma página
1. Navegue até um artigo, vídeo, livro (Amazon, Goodreads) ou curso
2. Clique no ícone 📖 da extensão
3. A extensão preenche título, URL, autor e tipo automaticamente
4. A IA sugere tags, notas e conexões com entradas anteriores
5. Edite à vontade → **+ Adicionar à fila**
6. Na view **Fila** → **↑ Push GitHub**

Capturar duas vezes a mesma URL não duplica: o push ignora o que já está no `data.json` e avisa.

### Adicionar livro manualmente
Clique em 📚 no header da extensão para abrir o formulário de livro sem precisar de uma URL.

### Guardar trechos

No campo **Trechos** da extensão, um por linha. Terminando com `— p. 42` a localização é separada do texto. Os trechos aparecem na ficha do material e alimentam o rascunho de artigo.

### Capturar várias URLs de uma vez

Botão **⿻** no header: cole uma URL por linha, escolha status e tags comuns. Sem abrir cada página não dá para raspar título, então fica a URL — você ajusta depois pelo 🗂.

### Rascunho de artigo com IA

Botão **✦**: marque os materiais que embasam o texto, opcionalmente diga o ângulo, e a IA devolve um `.md` em `posts/` já com título, tags e `refs` preenchidos, marcado como `draft: true`. É ponto de partida, não texto pronto — ele inclui uma seção "A desenvolver" com as lacunas.

Usa a mesma chave configurada em ⚙.

### Entradas privadas

A caixa **Privado** na captura faz a entrada **nunca** ir para o repositório: ela fica no armazenamento local da extensão, e a fila mostra quantas existem, com botão **Exportar**.

Isso é uma limitação honesta, não uma escolha: num repositório público, qualquer coisa commitada é pública — inclusive no histórico. Se você precisa de notas privadas de verdade, o caminho é outro repositório, privado.

### Marcar como lido / editar uma entrada publicada
Clique em 🗂 no header → busque pelo título → **✎**. Dá para mudar status, nota, avaliação, tags e a data de consumo; **Salvar no GitHub** grava direto no `data.json`. É por aqui que um "quero ler" vira "consumido" — sem isso a fila nunca anda.

🗑 no mesmo lugar deleta.

### Escrever um artigo

O ciclo fecha aqui: você junta material, escreve, e referencia o que leu.

1. Crie `posts/2026-08-10-titulo-do-artigo.md` (o prefixo de data sai do slug — a URL vira `#/p/titulo-do-artigo`). Copie [posts/exemplo.md](posts/exemplo.md) como modelo.
2. Front matter:

```markdown
---
title: Como agentes de código falham na prática
date: 2026-08-10
tags: ia, programação
refs:
  - https://www.akitaonrails.com/2026/05/24/dicas-e-toolkit-de-ia-do-akita-ai-jail-ai-memory-ai-usagebar/
draft: true
---

Texto em markdown normal.
```

3. `./build.sh` e commite. Tire o `draft: true` quando quiser publicar.

Em `refs` você cola a **URL** do material como ela está no logbook. A build resolve para a entrada: o artigo ganha o card com título, notas e avaliação, e a ficha do material passa a mostrar **"Citado em"** apontando de volta. URL que ainda não está no logbook vira link externo; referência que não bate com nada gera aviso no terminal em vez de sumir calada.

O markdown vira HTML durante a build (`npx marked`), então o site não carrega parser nenhum — e como o HTML é o seu próprio texto, não há sanitização: não cole HTML de terceiros dentro de um post.

Escritos entram no feed RSS junto com os materiais, ordenados pela mesma linha do tempo.

### Capturar pelo celular (sem token no aparelho)

A extensão é Chrome desktop. No celular, a captura vai por **issue**: você abre uma issue com o rótulo `captura` e uma Action escreve no `data.json` e fecha a issue. Nenhum token fica no telefone.

O caminho manual: no repositório → **Issues → New issue → Capturar link**, cola a URL, envia. Funciona do navegador do celular.

Para virar um toque só, crie um Atalho no iOS (app Atalhos) que recebe URLs da folha de compartilhamento e abre:

```
https://github.com/SEU-USUARIO/logbook/issues/new?labels=captura&template=captura.yml&title=captura:%20&url-do-atalho
```

Basta o atalho concatenar a URL compartilhada no fim do título. O formulário abre já preenchido; você confirma e pronto.

A Action só aceita issue aberta pelo dono do repositório — issue de terceiro é ignorada.

### Trazer o histórico que já existe

```bash
python3 tools/import_kindle.py "/Volumes/Kindle/documents/My Clippings.txt" --dry-run
```

Cada livro vira uma entrada e cada grifo vira um **trecho** (`quotes`). Casa com livros que já estão no logbook por prefixo de título, então rodar de novo não duplica.

```bash
python3 tools/import_csv.py goodreads_library_export.csv --dry-run
```

Aceita o export do Goodreads e o do Skoob (detecta pelas colunas). Dedupe por título+autor. Use `--so-lidos` para trazer só o que já foi lido.

Os dois escrevem no `data.json` local — rode `--dry-run` primeiro, confira o diff, depois commite.

---

## Tipos de entrada

| Tipo | Subtipos |
|---|---|
| Conteúdo | artigo, notícia, vídeo, livro, curso, treinamento |
| Projeto | projeto |

---

## Detecção automática de sites

A extensão reconhece automaticamente:
- **Amazon, Goodreads, Skoob, Google Books** → tipo `livro`
- **YouTube, Vimeo, Twitch** → tipo `vídeo`
- **Udemy, Coursera, Alura, Pluralsight** → tipo `curso`
- Sites de notícias (TechCrunch, Reuters, G1) → tipo `notícia`
- Todo o resto → tipo `artigo`

---

## Rotinas automáticas

| Quando | O quê |
|---|---|
| Issue com rótulo `captura` | Vira entrada no `data.json` e a issue fecha sozinha |
| `data.json` ou `posts/` mudam | Regenera feed, `posts.json`, páginas em `p/` e imagens `og/` |
| Segunda, 08:00 | Abre uma issue com o estado do logbook: o que entrou, o que parou, o que está esperando há mais tempo |
| Dia 1º, 09:00 | Testa todas as URLs e abre issue com as quebradas (se todas falharem, entende como problema de rede e não abre) |

As duas últimas podem ser disparadas à mão em **Actions → manutenção → Run workflow**.

## Tags: sinônimos

`aliases.json` mapeia sinônimo → tag canônica, aplicado na leitura do site (o `data.json` não é reescrito):

```json
{ "ia": "inteligência artificial", "dev": "desenvolvimento" }
```

Tag com uma entrada só não vira "tema" — fica na lista **Outras tags**. Mesma regra para autores.

## Limitações

- O site é **público** — qualquer um com o link vê as entradas, e o histórico do git guarda o que já foi commitado
- O token PAT fica em `chrome.storage.local` (não sincroniza para outros dispositivos)
- `./build.sh` e o workflow precisam de rede na primeira execução (`npx` baixa `marked` e `resvg`); sem isso a build segue, só não gera as imagens `og/`
- O HTML dos artigos não é sanitizado — é o seu próprio markdown. Não cole HTML de terceiros dentro de um post
- Escrita concorrente no `data.json` tenta de novo uma vez em caso de conflito; na segunda falha, o erro aparece e nada é perdido
- Sem busca no servidor: o site carrega o `data.json` inteiro. Suficiente até uns poucos milhares de entradas

## Verificação

```bash
node tools/selftest.mjs
```
