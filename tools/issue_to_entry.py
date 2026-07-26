#!/usr/bin/env python3
"""Issue rotulada `captura` -> entrada no data.json.

Roda dentro do GitHub Actions: é o que permite capturar do celular sem guardar
token nenhum no aparelho. O corpo da issue é o formulário (.github/ISSUE_TEMPLATE).

    python3 tools/issue_to_entry.py corpo.txt "Título da issue"
"""
import json
import re
import sys
import uuid
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'data.json'
STATUS_VALIDOS = {'quero ler', 'em andamento', 'consumido', 'abandonado'}
SUBTIPOS = {'artigo', 'notícia', 'livro', 'curso', 'treinamento', 'vídeo'}


def norm_url(url):
    if not url:
        return ''
    m = re.match(r'^(https?://[^/?#]+)([^?#]*)(\?[^#]*)?', url.strip(), re.I)
    if not m:
        return url.strip().lower()
    host, path, query = m.group(1), m.group(2) or '', m.group(3) or ''
    if query:
        kept = [p for p in query[1:].split('&')
                if p and not re.match(r'^(utm_|fbclid|gclid|ref|si=)', p, re.I)]
        query = ('?' + '&'.join(kept)) if kept else ''
    return (host + path.rstrip('/') + query).lower()


def parse_body(corpo):
    """Aceita os dois formatos: `### Campo\\nvalor` do issue form e `campo: valor`."""
    campos = {}
    for bloco in re.split(r'^###\s+', corpo, flags=re.M)[1:]:
        linhas = bloco.strip().split('\n', 1)
        chave = linhas[0].strip().lower()
        valor = (linhas[1].strip() if len(linhas) > 1 else '')
        campos[chave] = '' if valor in ('_No response_', '_Sem resposta_') else valor
    for linha in corpo.splitlines():
        m = re.match(r'^\s*(url|tags|nota|notas|status|tipo|título|titulo)\s*:\s*(.+)$', linha, re.I)
        if m:
            campos.setdefault(m.group(1).strip().lower(), m.group(2).strip())
    return campos


def nota_de(campos):
    """Avaliação vem do Registrar (⌘K) no site; ausente vale 0."""
    bruto = (campos.get('avaliação (0 a 5)') or campos.get('avaliacao') or '').strip()
    m = re.search(r'\d', bruto)
    n = int(m.group(0)) if m else 0
    return n if 0 <= n <= 5 else 0


def main():
    corpo = Path(sys.argv[1]).read_text(encoding='utf-8') if len(sys.argv) > 1 else ''
    titulo_issue = sys.argv[2].strip() if len(sys.argv) > 2 else ''
    campos = parse_body(corpo)

    url = (campos.get('url') or '').strip()
    if not url:
        # A issue pode ter só a URL no título (é o que o atalho do celular manda).
        m = re.search(r'https?://\S+', f'{titulo_issue} {corpo}')
        if not m:
            sys.exit('nenhuma URL na issue')
        url = m.group(0)

    data = json.loads(DATA.read_text(encoding='utf-8'))
    if any(norm_url(e.get('url')) == norm_url(url) for e in data['entries']):
        print(f'já existe: {url}')
        return

    titulo = (campos.get('título') or campos.get('titulo') or '').strip()
    if not titulo:
        titulo = re.sub(r'^\s*(captura|capture)\s*:\s*', '', titulo_issue, flags=re.I).strip()
    if not titulo or titulo.startswith('http'):
        titulo = url

    status = (campos.get('status') or '').strip().lower()
    subtipo = (campos.get('tipo') or '').strip().lower()
    hoje = date.today().isoformat()
    host = re.sub(r'^www\.', '', re.sub(r'^https?://([^/]+).*$', r'\1', url))

    entrada = {
        'id': str(uuid.uuid4()), 'type': 'conteudo',
        'subtype': subtipo if subtipo in SUBTIPOS else 'artigo',
        'title': titulo, 'url': url, 'author': '', 'source': host, 'image': '',
        'tags': [t.strip().lower() for t in (campos.get('tags') or '').split(',') if t.strip()],
        'status': status if status in STATUS_VALIDOS else 'quero ler',
        'rating': nota_de(campos),
        'notes': (campos.get('nota') or campos.get('notas') or '').strip(),
        'related': [], 'quotes': [],
        'dates': {'captured': hoje,
                  'consumed': hoje if status == 'consumido' else None,
                  'start': None, 'end': None, 'idea': None,
                  'started': None, 'launched': None},
        'createdAt': hoje + 'T00:00:00.000Z', 'captureVia': 'issue',
    }
    data['entries'].append(entrada)
    data['lastUpdated'] = hoje
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'adicionado: {titulo}')


if __name__ == '__main__':
    main()
