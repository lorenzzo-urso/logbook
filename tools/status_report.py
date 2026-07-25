#!/usr/bin/env python3
"""Resumo do estado do logbook, em markdown. Vira o corpo da issue semanal."""
import json
from collections import Counter
from datetime import date, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def dias(iso):
    try:
        return (date.today() - datetime.fromisoformat(iso[:10]).date()).days
    except (ValueError, TypeError):
        return None


def main():
    entries = json.loads((ROOT / 'data.json').read_text(encoding='utf-8'))['entries']
    posts = []
    f = ROOT / 'posts.json'
    if f.exists():
        posts = json.loads(f.read_text(encoding='utf-8')).get('posts', [])

    st = Counter(e.get('status') for e in entries)
    fila = [e for e in entries if e.get('status') in ('quero ler', 'na fila')]
    fila.sort(key=lambda e: (e.get('dates') or {}).get('captured') or '')

    capturados_7d = [e for e in entries
                     if (d := dias((e.get('dates') or {}).get('captured', ''))) is not None and d <= 7]
    consumidos_7d = [e for e in entries
                     if (d := dias((e.get('dates') or {}).get('consumed') or '')) is not None and d <= 7]
    ultima = max((( e.get('dates') or {}).get('captured') or '' for e in entries), default='')
    parado = dias(ultima) if ultima else None

    linhas = [
        f'**{len(entries)}** entradas · **{st.get("consumido", 0)}** consumidas · '
        f'**{len(fila)}** na fila · **{len(posts)}** artigos',
        '',
        f'- Últimos 7 dias: {len(capturados_7d)} capturado(s), {len(consumidos_7d)} consumido(s)',
    ]
    if parado is not None and parado > 7:
        linhas.append(f'- ⚠️ Nada capturado há **{parado} dias**')
    if fila:
        d = dias((fila[0].get('dates') or {}).get('captured', ''))
        linhas.append(f'- O mais antigo da fila espera há **{d} dias**: {fila[0].get("title", "")[:70]}')
    sem_nota = [e for e in entries if e.get('status') == 'consumido' and not e.get('notes')]
    if sem_nota:
        linhas.append(f'- {len(sem_nota)} consumido(s) sem nota — leitura sem registro se perde')

    if len(fila) >= 3:
        linhas += ['', '**Se for ler um esta semana, comece por um destes:**']
        for e in fila[:3]:
            d = dias((e.get('dates') or {}).get('captured', ''))
            linhas.append(f'- {e.get("title", "")[:80]} _(há {d} dias)_')

    print('\n'.join(linhas))


if __name__ == '__main__':
    main()
