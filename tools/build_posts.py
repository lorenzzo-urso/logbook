#!/usr/bin/env python3
"""posts/*.md -> posts.json.

Markdown vira HTML na build (npx marked), então o site não carrega parser
nenhum. As referências são resolvidas contra o data.json: você cita pela URL
que já está no logbook (ou pelo id) e o post ganha o link interno.
"""
import json
import re
import subprocess
import sys
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
POSTS_DIR = ROOT / 'posts'
OUT = ROOT / 'posts.json'


# ponytail: mesma normalização do normUrl em extension/utils/schema.js.
# Duplicado porque são runtimes diferentes; se divergirem, o selftest acusa.
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


def parse_front_matter(text):
    """Subconjunto de YAML: `chave: valor` e listas com `  - item`."""
    if not text.startswith('---'):
        return {}, text
    end = text.find('\n---', 3)
    if end == -1:
        return {}, text
    raw, body = text[3:end], text[end + 4:]
    meta, key = {}, None
    for line in raw.splitlines():
        if not line.strip() or line.strip().startswith('#'):
            continue
        item = re.match(r'\s+-\s*(.+)', line)
        if item and key:
            meta.setdefault(key, [])
            if isinstance(meta[key], list):
                meta[key].append(item.group(1).strip())
            continue
        kv = re.match(r'([A-Za-z_]+)\s*:\s*(.*)', line)
        if kv:
            key, val = kv.group(1), kv.group(2).strip()
            meta[key] = val if val else []
    return meta, body.lstrip('\n')


def as_list(v):
    if isinstance(v, list):
        return [x.strip() for x in v if x.strip()]
    return [x.strip() for x in str(v).split(',') if x.strip()]


def to_html(markdown):
    """Só o corpo — o front matter já foi consumido antes."""
    return subprocess.run(['npx', '--yes', 'marked@15'], input=markdown,
                          capture_output=True, text=True, check=True).stdout.strip()


def excerpt(html, limit=220):
    first = re.search(r'<p>(.*?)</p>', html, re.S)
    txt = unescape(re.sub(r'<[^>]+>', '', first.group(1) if first else html)).strip()
    txt = re.sub(r'\s+', ' ', txt)
    return txt if len(txt) <= limit else txt[:limit].rsplit(' ', 1)[0] + '…'


def main():
    entries = json.loads((ROOT / 'data.json').read_text(encoding='utf-8'))['entries']
    by_id = {e['id']: e for e in entries}
    by_url = {norm_url(e.get('url')): e for e in entries if e.get('url')}

    posts, warnings = [], []
    for md in sorted(POSTS_DIR.glob('*.md')) if POSTS_DIR.exists() else []:
        meta, body = parse_front_matter(md.read_text(encoding='utf-8'))
        if str(meta.get('draft', '')).lower() in ('true', 'yes', '1'):
            continue
        if not body.strip():
            warnings.append(f'{md.name}: sem conteúdo, ignorado')
            continue

        refs = []
        for r in as_list(meta.get('refs', [])):
            hit = by_id.get(r) or by_url.get(norm_url(r))
            if hit:
                refs.append({'id': hit['id']})
            elif r.startswith('http'):
                refs.append({'url': r})          # fonte externa, não catalogada
            else:
                warnings.append(f'{md.name}: referência não encontrada -> {r}')

        html = to_html(body)
        posts.append({
            'slug': re.sub(r'^\d{4}-\d{2}-\d{2}-', '', md.stem),
            'title': meta.get('title') or md.stem,
            'date': str(meta.get('date') or '')[:10],
            'tags': [t.lower() for t in as_list(meta.get('tags', []))],
            'excerpt': excerpt(html),
            'html': html,
            'refs': refs,
        })

    posts.sort(key=lambda p: p['date'], reverse=True)
    OUT.write_text(json.dumps({'posts': posts}, ensure_ascii=False, indent=2) + '\n',
                   encoding='utf-8')
    for w in warnings:
        print(f'  aviso: {w}', file=sys.stderr)
    print(f'posts.json: {len(posts)} publicado(s)')


if __name__ == '__main__':
    main()
