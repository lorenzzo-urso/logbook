#!/usr/bin/env python3
"""archive/*.md -> search.json.

A busca do site só enxerga título, autor, notas e tags. O texto guardado na
captura estava parado no repositório. Isto o transforma em índice, carregado
sob demanda (só quando alguém digita), para responder "onde eu li sobre X?".
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ARCHIVE = ROOT / 'archive'
OUT = ROOT / 'search.json'
LIMITE = 4000     # por entrada; o scraper já corta em 3000


def limpar(md):
    """Tira o cabeçalho que a extensão escreve e achata o texto."""
    corpo = md.split('\n---\n', 1)[-1]
    corpo = re.sub(r'^#.*$', '', corpo, flags=re.M)
    corpo = re.sub(r'^>.*$', '', corpo, flags=re.M)
    return re.sub(r'\s+', ' ', corpo).strip()[:LIMITE]


def main():
    ids_validos = {e['id'] for e in
                   json.loads((ROOT / 'data.json').read_text(encoding='utf-8'))['entries']}

    docs = {}
    for f in sorted(ARCHIVE.glob('*.md')) if ARCHIVE.exists() else []:
        if f.stem not in ids_validos:
            continue                      # entrada apagada: o texto não interessa mais
        texto = limpar(f.read_text(encoding='utf-8', errors='replace'))
        if texto:
            docs[f.stem] = texto

    OUT.write_text(json.dumps(docs, ensure_ascii=False) + '\n', encoding='utf-8')
    kb = OUT.stat().st_size // 1024
    print(f'search.json: {len(docs)} texto(s), {kb} KB')


if __name__ == '__main__':
    main()
