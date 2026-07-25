#!/usr/bin/env python3
"""My Clippings.txt do Kindle -> entradas com trechos no data.json.

    python3 tools/import_kindle.py "/Volumes/Kindle/documents/My Clippings.txt" --dry-run
    python3 tools/import_kindle.py "/Volumes/Kindle/documents/My Clippings.txt"

Um livro vira uma entrada; cada grifo vira um item em `quotes`. Rodar de novo
com o mesmo arquivo não duplica: trecho já presente é ignorado.
"""
import argparse
import json
import re
import sys
import uuid
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'data.json'
SEP = '=========='


def parse_clippings(text):
    """{(titulo, autor): [ {text, page} ]} — formato é o mesmo em pt e en."""
    livros = {}
    for bloco in text.replace('﻿', '').split(SEP):
        linhas = [l.strip() for l in bloco.strip().splitlines() if l.strip()]
        if len(linhas) < 2:
            continue
        cabecalho, meta, corpo = linhas[0], linhas[1], ' '.join(linhas[2:]).strip()
        if not corpo:
            continue                      # marcador de página, sem texto
        if re.search(r'(Nota|Note)\b', meta) and not re.search(r'(Destaque|Highlight)', meta):
            pass                          # nota escrita por você também interessa

        m = re.match(r'^(.*?)\s*\(([^()]+)\)\s*$', cabecalho)
        titulo, autor = (m.group(1), m.group(2)) if m else (cabecalho, '')
        pos = re.search(r'(?:página|page|posição|location|Loc\.)\s*([\d\-]+)', meta, re.I)
        pagina = f'p. {pos.group(1)}' if pos else ''
        livros.setdefault((titulo.strip(), autor.strip()), []).append(
            {'text': corpo, 'page': pagina})
    return livros


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('arquivo', help='caminho do My Clippings.txt')
    ap.add_argument('--dry-run', action='store_true', help='mostra o que faria e sai')
    ap.add_argument('--status', default='consumido', help='status das entradas novas')
    args = ap.parse_args()

    origem = Path(args.arquivo)
    if not origem.exists():
        sys.exit(f'não achei: {origem}')

    livros = parse_clippings(origem.read_text(encoding='utf-8', errors='replace'))
    if not livros:
        sys.exit('nenhum grifo encontrado — o arquivo é mesmo o My Clippings.txt?')

    data = json.loads(DATA.read_text(encoding='utf-8'))
    entries = data['entries']
    livros_existentes = [e for e in entries if e.get('subtype') == 'livro']

    def achar(titulo):
        """O Kindle usa o título curto ('Negocie sem medo') e a livraria o longo
        ('Negocie sem medo: os cinco pilares...'). Casa por prefixo nos dois sentidos."""
        t = titulo.strip().lower()
        for e in livros_existentes:
            outro = e.get('title', '').strip().lower()
            if outro == t or (len(t) > 12 and (outro.startswith(t) or t.startswith(outro))):
                return e
        return None

    novos = trechos_novos = 0
    hoje = date.today().isoformat()
    for (titulo, autor), quotes in sorted(livros.items()):
        alvo = achar(titulo)
        if not alvo:
            alvo = {
                'id': str(uuid.uuid4()), 'type': 'conteudo', 'subtype': 'livro',
                'title': titulo, 'url': '', 'author': autor, 'source': 'Kindle',
                'image': '', 'tags': [], 'status': args.status, 'rating': 0,
                'notes': '', 'related': [], 'quotes': [],
                'dates': {'captured': hoje,
                          'consumed': hoje if args.status == 'consumido' else None,
                          'start': None, 'end': None, 'idea': None,
                          'started': None, 'launched': None},
                'createdAt': hoje + 'T00:00:00.000Z', 'captureVia': 'kindle',
            }
            entries.append(alvo)
            livros_existentes.append(alvo)
            novos += 1

        existentes = {q['text'] for q in alvo.get('quotes', [])}
        for q in quotes:
            if q['text'] not in existentes:
                alvo.setdefault('quotes', []).append(q)
                existentes.add(q['text'])
                trechos_novos += 1

    print(f'{len(livros)} livro(s) no arquivo · {novos} entrada(s) nova(s) · '
          f'{trechos_novos} trecho(s) novo(s)')
    if args.dry_run:
        for (t, a) in sorted(livros)[:10]:
            print(f'  - {t} ({a}) · {len(livros[(t, a)])} trechos')
        print('(--dry-run: nada foi gravado)')
        return

    data['lastUpdated'] = hoje
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('data.json atualizado — confira o diff antes de commitar')


if __name__ == '__main__':
    main()
