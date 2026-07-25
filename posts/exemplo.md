---
title: Título do artigo
date: 2026-07-25
tags: ia, programação
refs:
  - https://www.akitaonrails.com/2026/05/24/dicas-e-toolkit-de-ia-do-akita-ai-jail-ai-memory-ai-usagebar/
  - https://exemplo.com/algo-que-nao-esta-no-logbook
draft: true
---

Este arquivo é o modelo. Copie para `posts/2026-08-10-meu-artigo.md`, tire o
`draft: true` e rode `./build.sh`.

O nome do arquivo vira a URL: o prefixo de data sai e o resto virou o slug, então
`2026-08-10-meu-artigo.md` fica em `#/p/meu-artigo`.

## Referências

Em `refs` você lista o que leu para escrever. Cole a **URL** da entrada como ela
está no logbook — a build resolve para a entrada e o artigo ganha o link interno,
além de aparecer um "Citado em" na ficha do material. URL que ainda não está no
logbook vira link externo normal, sem drama. Se você escrever algo que não é URL
nem id, a build avisa no terminal em vez de engolir em silêncio.

Markdown normal funciona: **negrito**, *itálico*, `código`, listas, citação,
títulos e [links](https://example.com).
