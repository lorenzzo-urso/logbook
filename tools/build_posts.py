#!/usr/bin/env python3
"""posts/*.md -> posts.json.

Markdown vira HTML na build (npx marked), então o site não carrega parser
nenhum. As referências são resolvidas contra o data.json: você cita pela URL
que já está no logbook (ou pelo id) e o post ganha o link interno.
"""
import json
import re
import shutil
import subprocess
import sys
from html import escape, unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
POSTS_DIR = ROOT / 'posts'
OUT = ROOT / 'posts.json'
PAGES_DIR = ROOT / 'p'        # p/<slug>/index.html — páginas reais, indexáveis
OG_DIR = ROOT / 'og'          # og/<slug>.png — imagem de compartilhamento


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


def site_url():
    """Mesma derivação do gen_feed: https://<user>.github.io/<repo>/."""
    try:
        r = subprocess.run(['git', 'remote', 'get-url', 'origin'], cwd=ROOT,
                           capture_output=True, text=True, check=True).stdout.strip()
        m = re.search(r'github\.com[:/]([^/]+)/([^/.]+)', r)
        if m:
            return f'https://{m.group(1)}.github.io/{m.group(2)}/'
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass
    return '/'


def wrap_text(text, per_line=26, max_lines=5):
    linhas, atual = [], ''
    for palavra in text.split():
        if len(atual) + len(palavra) + 1 > per_line and atual:
            linhas.append(atual)
            atual = palavra
        else:
            atual = f'{atual} {palavra}'.strip()
        if len(linhas) == max_lines:
            break
    if atual and len(linhas) < max_lines:
        linhas.append(atual)
    if len(linhas) == max_lines:
        linhas[-1] = linhas[-1][:per_line - 1] + '…'
    return linhas


def render_og(post):
    """PNG 1200x630 com o título — é o que aparece quando o link é compartilhado."""
    linhas = wrap_text(post['title'])
    y0 = 315 - (len(linhas) - 1) * 34
    textos = ''.join(
        f'<text x="80" y="{y0 + i * 68}" font-family="Georgia, serif" font-size="56" fill="#F4F3EE">{escape(l)}</text>'
        for i, l in enumerate(linhas))
    tags = ' · '.join(post.get('tags', [])[:4])
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">'
        '<rect width="1200" height="630" fill="#1A1916"/>'
        '<rect x="80" y="72" width="60" height="6" rx="3" fill="#E8A838"/>'
        '<text x="80" y="128" font-family="Helvetica, Arial, sans-serif" font-size="26" fill="#8D897C">LogBook</text>'
        + textos +
        (f'<text x="80" y="546" font-family="Helvetica, Arial, sans-serif" font-size="24" fill="#8D897C">{escape(tags)}</text>' if tags else '')
        + '</svg>'
    )
    OG_DIR.mkdir(exist_ok=True)
    svg_path = OG_DIR / f"{post['slug']}.svg"
    svg_path.write_text(svg, encoding='utf-8')
    try:
        subprocess.run(['npx', '--yes', '@resvg/resvg-js-cli', str(svg_path),
                        str(OG_DIR / f"{post['slug']}.png")],
                       capture_output=True, text=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False          # sem rede/npx: segue sem imagem, não quebra a build
    finally:
        svg_path.unlink(missing_ok=True)


def write_page(post, base, tem_og, by_id):
    """Página real por artigo: rota em hash nunca chega ao servidor, então
    preview de link e buscador não enxergam nada de #/p/<slug>."""
    d = PAGES_DIR / post['slug']
    d.mkdir(parents=True, exist_ok=True)
    url = f"{base}p/{post['slug']}/"
    og = f"{base}og/{post['slug']}.png" if tem_og else ''
    def ref_li(r):
        if r.get('url'):
            return f'<li><a href="{escape(r["url"])}">{escape(r["url"])}</a></li>'
        e = by_id.get(r['id'], {})
        titulo = e.get('title') or 'Material no logbook'
        autor = f" — {escape(e['author'])}" if e.get('author') else ''
        return f'<li><a href="{base}#/e/{escape(r["id"])}">{escape(titulo)}</a>{autor}</li>'

    refs = ('<h2>Referências</h2><ul>' + ''.join(ref_li(r) for r in post['refs']) + '</ul>') if post['refs'] else ''
    d.joinpath('index.html').write_text(f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{escape(post['title'])} — LogBook</title>
<meta name="description" content="{escape(post['excerpt'])}">
<link rel="canonical" href="{escape(url)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="LogBook">
<meta property="og:title" content="{escape(post['title'])}">
<meta property="og:description" content="{escape(post['excerpt'])}">
<meta property="og:url" content="{escape(url)}">
{f'<meta property="og:image" content="{escape(og)}"><meta name="twitter:card" content="summary_large_image">' if og else '<meta name="twitter:card" content="summary">'}
<meta property="article:published_time" content="{escape(post['date'])}">
<link rel="alternate" type="application/rss+xml" title="LogBook" href="{escape(base)}feed.xml">
<link rel="stylesheet" href="{escape(base)}styles.css">
<style>body{{background:var(--bg-base);color:var(--fg-primary);}}
.wrap{{max-width:680px;margin:0 auto;padding:48px 24px 80px;}}
.top{{font-family:var(--font-body);font-size:14px;color:var(--fg-muted);text-decoration:none;}}
h1{{font-family:var(--font-display);font-size:2rem;line-height:1.2;letter-spacing:-0.02em;margin:18px 0 8px;}}
.meta{{font-family:var(--font-mono);font-size:12px;color:var(--fg-muted);margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid var(--border-subtle);}}
h2{{font-family:var(--font-display);font-size:1.25rem;margin-top:2em;}}
ul{{padding-left:1.2em;}} a{{color:var(--accent-content);}}</style>
</head>
<body>
<div class="wrap">
<a class="top" href="{escape(base)}#/escritos">← LogBook</a>
<h1>{escape(post['title'])}</h1>
<div class="meta">{escape(post['date'])}{(' · ' + escape(' · '.join(post['tags']))) if post['tags'] else ''}</div>
<div class="cb-prose">{post['html']}</div>
{refs}
</div>
</body>
</html>
""", encoding='utf-8')


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

    # Regenera do zero: artigo removido ou renomeado não deve deixar página órfã.
    shutil.rmtree(PAGES_DIR, ignore_errors=True)
    shutil.rmtree(OG_DIR, ignore_errors=True)
    base = site_url()
    sem_og = 0
    for p in posts:
        tem_og = render_og(p)
        sem_og += 0 if tem_og else 1
        write_page(p, base, tem_og, by_id)

    for w in warnings:
        print(f'  aviso: {w}', file=sys.stderr)
    if sem_og:
        print(f'  aviso: {sem_og} artigo(s) sem og:image (npx indisponível?)', file=sys.stderr)
    print(f'posts.json: {len(posts)} publicado(s), {len(posts)} página(s) em p/')


if __name__ == '__main__':
    main()
