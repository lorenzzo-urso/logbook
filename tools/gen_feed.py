#!/usr/bin/env python3
"""Gera feed.xml a partir do data.json. Stdlib apenas."""
import json
import subprocess
import re
from datetime import datetime, timezone
from email.utils import format_datetime
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
LIMIT = 30


def site_url():
    """https://<user>.github.io/<repo>/, derivado do remote."""
    try:
        r = subprocess.run(['git', 'remote', 'get-url', 'origin'],
                           cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return 'https://example.github.io/logbook/'
    m = re.search(r'github\.com[:/]([^/]+)/([^/.]+)', r)
    if not m:
        return 'https://example.github.io/logbook/'
    return f'https://{m.group(1)}.github.io/{m.group(2)}/'


def entry_date(e):
    d = e.get('dates') or {}
    return (d.get('consumed') or d.get('launched') or d.get('started')
            or d.get('captured') or (e.get('createdAt') or '')[:10] or '')


def as_rfc2822(iso):
    try:
        return format_datetime(datetime.fromisoformat(iso).replace(tzinfo=timezone.utc))
    except ValueError:
        return format_datetime(datetime.now(timezone.utc))


def read_posts():
    """Artigos escritos entram no feed junto com o que foi consumido."""
    f = ROOT / 'posts.json'
    if not f.exists():
        return []
    return json.loads(f.read_text(encoding='utf-8')).get('posts', [])


def main():
    data = json.loads((ROOT / 'data.json').read_text(encoding='utf-8'))
    base = site_url()
    entries = sorted(data.get('entries', []), key=entry_date, reverse=True)[:LIMIT]

    # (data, xml) para ordenar escritos e materiais na mesma linha do tempo.
    items = []
    for p in read_posts():
        items.append((p.get('date', ''),
            '<item>'
            f"<title>{escape(p.get('title', 'sem título'))}</title>"
            f"<link>{escape(base)}#/p/{escape(p['slug'])}</link>"
            f"<guid isPermaLink=\"false\">post:{escape(p['slug'])}</guid>"
            f"<pubDate>{as_rfc2822(p.get('date', ''))}</pubDate>"
            + ''.join(f'<category>{escape(t)}</category>' for t in p.get('tags', []))
            + f"<description>{escape(p.get('excerpt', ''))}</description>"
            '</item>'
        ))

    for e in entries:
        # Link para a entrada no site; a fonte original vai no corpo.
        link = f"{base}#/e/{e['id']}"
        body = e.get('notes') or e.get('description') or ''
        if e.get('url'):
            body += f"\n\nFonte: {e['url']}"
        items.append((entry_date(e),
            '<item>'
            f"<title>{escape(e.get('title', 'sem título'))}</title>"
            f'<link>{escape(link)}</link>'
            f"<guid isPermaLink=\"false\">{escape(e['id'])}</guid>"
            f'<pubDate>{as_rfc2822(entry_date(e))}</pubDate>'
            + ''.join(f'<category>{escape(t)}</category>' for t in e.get('tags', []))
            + f'<description>{escape(body.strip())}</description>'
            '</item>'
        ))

    feed = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>'
        '<title>LogBook</title>'
        f'<link>{escape(base)}</link>'
        '<description>Logbook pessoal de conhecimento.</description>'
        '<language>pt-BR</language>'
        f'<lastBuildDate>{format_datetime(datetime.now(timezone.utc))}</lastBuildDate>'
        f'<atom:link href="{escape(base)}feed.xml" rel="self" type="application/rss+xml"/>'
        + ''.join(xml for _, xml in sorted(items, key=lambda i: i[0], reverse=True)[:LIMIT]) +
        '</channel></rss>\n'
    )
    (ROOT / 'feed.xml').write_text(feed, encoding='utf-8')
    print(f'feed.xml: {min(len(items), LIMIT)} itens')


if __name__ == '__main__':
    main()
