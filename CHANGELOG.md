# Changelog

Registro do que mudou no LogBook. O mais recente em cima.

Este arquivo não aparece no site — é só para quem lê o repositório.

---

## 2026-07-26

Rebranding visual e reorganização da navegação, a partir do handoff de design
(direção "Diário").

### Marca

- Wordmark `logbook`, minúsculo e serifado (Lora 600, tracking −0.04em) no lugar
  do "Log**Book**" anterior.
- Ícone de três barras decrescentes em amber, sand e slate — que são a própria
  legenda de cor do app: entrada, fila, o que virou projeto. Vale para
  `assets/logo*.svg`, o ícone do PWA e o favicon.

### Navegação

- De 9 itens irmãos para **três grupos**: Consumo (Lendo, Fila, Biblioteca),
  Produção (Projetos, Escritos) e Descobrir (Timeline, Temas, Autores).
- Sidebar de 224px com botão **Registrar** no topo e busca no rodapé.
- Rotas antigas (`#/inicio`, `#/agora`, `#/backlog`, `#/tipos`, `#/projetos`)
  redirecionam para as novas.

### Telas

- **Hoje** substitui a home: cabeçalho com data e "dia N do log", cards de
  leitura em andamento com barra de progresso e ações inline, o log por dia, e
  uma coluna lateral com o que a leitura gerou, a pressão da fila e os temas.
- **Consumo** junta Backlog, Por tipo e Agora numa tela só, ordenada pelo que
  está parado há mais tempo, com a pill `Começar` em cada linha.
- **Produção** mostra projetos e escritos juntos, cada um com a procedência
  (`↳ nasceu de` / `↳ cita`). Borda esquerda sólida = projeto, tracejada = escrito.
- **Timeline** ganha filtro de escopo (tudo / só consumo / só produção) e
  controle de densidade, e mostra a conexão na própria linha do tempo.
- **Temas** ganha barra de conversão amber↔slate: quanto do tema foi lido e
  quanto virou produção, com diagnóstico quando o tema acumula sem digerir.
- **Ficha da entrada** reformulada, com progresso, trechos e "Isso me levou a".
- **Mobile**: tab bar com quatro destinos, alvos de toque ≥44px.

### Escrita a partir do site

- **O Registrar via web foi removido** (o handoff pedia; a arquitetura não
  sustenta). O modal só teria a URL colada: sem título, autor, capa, texto
  arquivado ou sugestão da IA — tudo isso depende do acesso à página que só a
  extensão tem. Capturar continua sendo pela extensão (desktop) ou pela issue de
  captura (celular). ⌘K passou a abrir a busca.
- Começar, Terminei, Atualizar página e Anotar trecho abrem uma issue
  pré-preenchida que uma Action aplica — o site é estático e público, e guardar
  um token no navegador seria pior. Os campos inline são digitados no card; só o
  salvar passa pela issue.
- Essas ações ficam **escondidas por padrão**: `#/editor` liga o modo edição no
  aparelho. Só o dono consegue usá-las, então não faz sentido exibi-las a quem
  visita.
- Novo workflow `atualizar` + `tools/issue_update.py`.
- Schema ganha `pages` e `pagesRead` (progresso de leitura), na extensão e no
  validador.

### Notas de implementação

- O design especifica a paleta crua (`--sand-200` etc.); a implementação usa os
  tokens semânticos equivalentes para o modo escuro continuar funcionando. Em
  claro o valor é idêntico.
- Nenhuma cor nova foi inventada: `--type-escrito-*` já existia, dentro da
  família slate.

## 2026-07-25

Reforma grande: o site foi reescrito de um bundle gerado para código editável,
a extensão ganhou o ciclo completo de leitura, e o logbook passou a produzir
artigos além de guardar links.

### Site

- **Sem Babel no navegador.** O `index.html` era um bundle de 2,1 MB que
  descompactava React DEV (1,2 MB) e Babel standalone (3,1 MB) para compilar o
  JSX a cada visita. Agora a fonte vive em `src/app.jsx`, o `./build.sh`
  transpila com esbuild e o React de produção está em `vendor/` (204 KB).
- **Rotas por hash** (`#/temas/gestão`, `#/e/<id>`, `#/p/<slug>`): links
  compartilháveis e botão voltar funcionando.
- **Página real por artigo** em `p/<slug>/`, com meta tags, `canonical` e corpo
  pré-renderizado — rota em hash nunca chega ao servidor, então buscador e
  preview de link não enxergavam nada. Mais um PNG 1200×630 por artigo.
- **Escritos**: artigos em markdown (`posts/*.md`) que referenciam materiais do
  logbook pela URL; a ficha do material mostra "Citado em" apontando de volta.
- **Modo escuro** seguindo o sistema.
- **Páginas novas**: Agora (o que estou lendo/escrevendo), Autores, e a seção
  Revisitar na home (consumido há 30+ dias, com nota).
- **Busca dentro do texto guardado** na captura, a partir de 3 caracteres, com
  o trecho onde casou. Índice baixado só quando você busca.
- **PWA**: instala na tela de início e funciona offline.
- **Feed RSS** com artigos e materiais na mesma linha do tempo.

### Extensão

- **Editar entrada publicada** (status, nota, avaliação, tags, data de
  consumo). Antes só dava para adicionar e deletar — por isso a fila nunca
  andava.
- **Dedupe por URL** normalizada (ignora `utm_*`, hash e barra final).
- **Trechos** (`quotes`) por entrada, com localização opcional.
- **Captura em lote** de várias URLs coladas de uma vez.
- **Arquivo do texto**: o corpo da página era scrapado, mandado para a IA e
  descartado; agora vira `archive/<id>.md`.
- **Rascunho de artigo com IA** a partir de materiais selecionados, commitado
  em `posts/` como `draft`.
- **Entradas privadas** que nunca vão para o repositório.
- **Conexões** sugeridas pela IA agora são gravadas (`related`) — antes iam
  para um campo que nada lia, e o motivo era descartado.

### Automação

- **Captura pelo celular por issue**, sem token no aparelho: issue com rótulo
  `captura` vira entrada e fecha sozinha.
- **Issue semanal** com o estado do logbook (o que entrou, o que parou, o que
  espera há mais tempo).
- **Caça mensal a links quebrados**, com guarda contra falso positivo quando o
  problema é a rede do runner.
- **Rebuild automático** de feed, artigos, imagens e índice quando `data.json`
  ou `posts/` mudam.
- **Validação do `data.json`** no build e na CI: são quatro escritores
  diferentes, e um write malformado quebrava o site em silêncio.

### Importadores

- `tools/import_kindle.py`: `My Clippings.txt` vira entradas com os grifos.
- `tools/import_csv.py`: export do Goodreads e do Skoob.

### Correções

- A aba **Temas** estava permanentemente vazia: a contagem rodava no topo do
  módulo, antes do `fetch`, sempre com zero entradas.
- A **Timeline** agrupava por um campo inexistente (`e.month`) e mostrava tudo
  num único bloco chamado "undefined".
- A **busca** comparava `type !== 'project'` sendo que o valor real é
  `'projeto'`, duplicando projetos nas duas seções.
- O scraper salvava `og:image` **relativo**, que quebra fora do site de origem.
- Push com fila vazia gerava commit assim mesmo (`add: 0 entradas`).
- Token do GitHub e chaves de API saíram de `chrome.storage.sync` para
  `.local`: não devem ser replicados em texto plano para todo dispositivo
  logado na conta Google.
- `dates.consumed` era preenchido com a data de captura mesmo em item não
  consumido, o que tornava a ordem cronológica ficção.
- Avaliação 0 desenhava cinco bolinhas vazias em todo item não lido.
- Grades de 3 colunas fixas estouravam a largura no celular.

### Removido

- `changelog`, `links`, `pitch` e `description` do schema — estavam vazios nas
  28 entradas. `pitch` e `description` sobrevivem apenas em projetos.

---

## Antes disso

O histórico anterior a 2026-07-25 é da fase de teste do projeto: extensão
inicial, primeiro `data.json` e o bundle original do site.
