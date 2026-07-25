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
├── data.json           # Todas as entradas (gerenciado pela extensão)
├── feed.xml            # RSS, gerado do data.json
├── build.sh            # JSX → app.js + regenera o feed
├── tools/
│   ├── gen_feed.py     # Gerador do RSS
│   └── selftest.mjs    # Checagem de dedupe de URL e do feed
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

### Marcar como lido / editar uma entrada publicada
Clique em 🗂 no header → busque pelo título → **✎**. Dá para mudar status, nota, avaliação, tags e a data de consumo; **Salvar no GitHub** grava direto no `data.json`. É por aqui que um "quero ler" vira "consumido" — sem isso a fila nunca anda.

🗑 no mesmo lugar deleta.

### Capturar pelo celular

A extensão é Chrome desktop. Para capturar do iPhone, um Atalho (app Atalhos) resolve sem código:

1. Novo atalho → ação **Obter conteúdo da URL**
2. URL: `https://api.github.com/repos/SEU-USUARIO/logbook/contents/data.json`
3. Método `GET`, cabeçalho `Authorization: Bearer SEU_TOKEN` → guarde `content` e `sha`
4. Segunda ação: decodifique o base64, insira a entrada nova no array `entries`, recodifique
5. `PUT` na mesma URL com `{"message": "add via celular", "content": ..., "sha": ...}`
6. Marque **Mostrar na Folha de Compartilhamento**

Aí é só compartilhar qualquer página do Safari para o atalho. Alternativa mais preguiçosa: mandar o link para si mesmo e capturar depois no desktop.

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

## Limitações

- O site é **público** — qualquer um com o link vê as entradas
- O token PAT fica em `chrome.storage.local` (não sincroniza para outros dispositivos)
- Escrita concorrente no `data.json` tenta de novo uma vez em caso de conflito; na segunda falha, o erro aparece e nada é perdido
- Sem busca no servidor: o site carrega o `data.json` inteiro. Suficiente até uns poucos milhares de entradas

## Verificação

```bash
node tools/selftest.mjs
```
