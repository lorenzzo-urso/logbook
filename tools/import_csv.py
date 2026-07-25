#!/usr/bin/env python3
"""Export CSV do Goodreads ou do Skoob -> entradas no data.json.

    python3 tools/import_csv.py goodreads_library_export.csv --dry-run
    python3 tools/import_csv.py minha-estante.csv

Detecta o formato pelas colunas. Dedupe por título+autor: rodar duas vezes
não duplica, e livro que já está no logbook é preservado como está.
"""
import argparse
import csv
import json
import re
import sys
import uuid
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'data.json'

# Goodreads: Exclusive Shelf | Skoob: coluna de situação em pt.
STATUS_MAP = {
    'read': 'consumido', 'currently-reading': 'em andamento', 'to-read': 'quero ler',
    'lido': 'consumido', 'lendo': 'em andamento', 'vou ler': 'quero ler',
    'quero ler': 'quero ler', 'abandonado': 'abandonado', 'abandonei': 'abandonado',
    'relendo': 'em andamento',
}


def pega(linha, *nomes):
    """Primeira coluna que existir, comparando sem caixa nem acento de sobra."""
    achatado = {re.sub(r'[^a-z]', '', k.lower()): v for k, v in linha.items() if k}
    for n in nomes:
        v = achatado.get(re.sub(r'[^a-z]', '', n.lower()))
        if v and v.strip():
            return v.strip()
    return ''


def nota(valor):
    try:
        n = int(float(valor))
        return n if 0 <= n <= 5 else 0
    except (TypeError, ValueError):
        return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('arquivo')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--so-lidos', action='store_true',
                    help='importa apenas o que já foi lido')
    args = ap.parse_args()

    origem = Path(args.arquivo)
    if not origem.exists():
        sys.exit(f'não achei: {origem}')

    with origem.open(encoding='utf-8-sig', newline='') as f:
        amostra = f.read(4096)
        f.seek(0)
        try:
            dialeto = csv.Sniffer().sniff(amostra, delimiters=',;\t')
        except csv.Error:
            dialeto = csv.excel
        linhas = list(csv.DictReader(f, dialect=dialeto))

    if not linhas:
        sys.exit('CSV vazio')

    data = json.loads(DATA.read_text(encoding='utf-8'))
    entries = data['entries']
    vistos = {(e.get('title', '').strip().lower(), (e.get('author') or '').strip().lower())
              for e in entries}

    hoje = date.today().isoformat()
    novos, pulados = [], 0
    for linha in linhas:
        titulo = pega(linha, 'Title', 'Titulo', 'Título', 'Livro')
        if not titulo:
            continue
        autor = pega(linha, 'Author', 'Autor', 'Authorlf')
        bruto = pega(linha, 'Exclusive Shelf', 'Bookshelves', 'Situacao', 'Situação',
                     'Estante', 'Status').lower()
        status = STATUS_MAP.get(bruto, 'quero ler')
        if args.so_lidos and status != 'consumido':
            continue

        chave = (titulo.strip().lower(), autor.strip().lower())
        if chave in vistos:
            pulados += 1
            continue
        vistos.add(chave)

        isbn = re.sub(r'[^0-9Xx]', '', pega(linha, 'ISBN13', 'ISBN'))
        lido_em = pega(linha, 'Date Read', 'Data de Leitura', 'DataLeitura')[:10]
        novos.append({
            'id': str(uuid.uuid4()), 'type': 'conteudo', 'subtype': 'livro',
            'title': titulo,
            'url': f'https://www.google.com/books/edition/_/?q=isbn:{isbn}' if isbn else '',
            'author': autor, 'source': pega(linha, 'Publisher', 'Editora') or 'importado',
            'image': '', 'tags': [], 'status': status,
            'rating': nota(pega(linha, 'My Rating', 'Minha Nota', 'Nota')),
            'notes': pega(linha, 'My Review', 'Resenha', 'Comentario', 'Comentário'),
            'related': [], 'quotes': [],
            'dates': {'captured': hoje,
                      'consumed': (lido_em or hoje) if status == 'consumido' else None,
                      'start': None, 'end': None, 'idea': None,
                      'started': None, 'launched': None},
            'createdAt': hoje + 'T00:00:00.000Z', 'captureVia': 'csv',
        })

    print(f'{len(linhas)} linha(s) · {len(novos)} nova(s) · {pulados} já existia(m)')
    if args.dry_run:
        for e in novos[:10]:
            print(f"  + [{e['status']}] {e['title']} — {e['author'] or 'sem autor'}")
        if len(novos) > 10:
            print(f'  ... e mais {len(novos) - 10}')
        print('(--dry-run: nada foi gravado)')
        return
    if not novos:
        print('nada a fazer')
        return

    entries.extend(novos)
    data['lastUpdated'] = hoje
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('data.json atualizado — confira o diff antes de commitar')


if __name__ == '__main__':
    main()
