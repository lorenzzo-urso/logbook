#!/usr/bin/env python3
"""Valida o data.json. Sai com 1 se algo está errado.

O data.json tem quatro escritores (extensão, Action de issue, import do Kindle,
import de CSV). Um write malformado não quebra nada na hora — quebra o site em
silêncio dias depois. Isto roda no build, no selftest e na CI antes de commitar.

    python3 tools/validate_data.py [caminho]
"""
import json
import re
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

TIPOS = {'conteudo', 'projeto'}
SUBTIPOS = {
    'conteudo': {'artigo', 'notícia', 'livro', 'curso', 'treinamento', 'vídeo'},
    'projeto': {'projeto'},
}
STATUS = {
    'conteudo': {'quero ler', 'em andamento', 'consumido', 'abandonado', 'na fila'},
    'projeto': {'ideia', 'iniciado', 'em andamento', 'pausado', 'lançado', 'arquivado'},
}
OBRIGATORIOS = {'id', 'type', 'subtype', 'title', 'status', 'tags', 'dates', 'createdAt'}
CONHECIDOS = OBRIGATORIOS | {
    'url', 'author', 'source', 'image', 'rating', 'notes', 'related', 'quotes',
    'archived', 'captureVia', 'pitch', 'description', 'pages', 'pagesRead',
}
DATA_ISO = re.compile(r'^\d{4}-\d{2}-\d{2}$')


def data_valida(v):
    if not isinstance(v, str) or not DATA_ISO.match(v):
        return False
    try:
        datetime.fromisoformat(v)
        return True
    except ValueError:
        return False


def validar(data):
    erros, avisos = [], []
    if not isinstance(data, dict) or not isinstance(data.get('entries'), list):
        return ['data.json precisa ser um objeto com a lista "entries"'], []

    entries = data['entries']
    ids = {}
    urls = {}

    for i, e in enumerate(entries):
        rot = f'entrada #{i}'
        if not isinstance(e, dict):
            erros.append(f'{rot}: não é um objeto')
            continue
        rot = f'{rot} ({str(e.get("title", ""))[:45] or "sem título"})'

        faltando = OBRIGATORIOS - set(e)
        if faltando:
            erros.append(f'{rot}: faltam campos {sorted(faltando)}')
            continue

        # id único e não vazio — id repetido faz o modal abrir a entrada errada.
        eid = e['id']
        if not isinstance(eid, str) or not eid.strip():
            erros.append(f'{rot}: id vazio')
        elif eid in ids:
            erros.append(f'{rot}: id repetido com a entrada #{ids[eid]}')
        else:
            ids[eid] = i

        tipo = e['type']
        if tipo not in TIPOS:
            erros.append(f'{rot}: type "{tipo}" inválido')
            continue
        if e['subtype'] not in SUBTIPOS[tipo]:
            erros.append(f'{rot}: subtype "{e["subtype"]}" não existe para {tipo}')
        if e['status'] not in STATUS[tipo]:
            erros.append(f'{rot}: status "{e["status"]}" não existe para {tipo}')

        if not str(e['title']).strip():
            erros.append(f'{rot}: título vazio')

        # private nunca pode ser publicado: a extensão devia ter retido a entrada.
        if e.get('private'):
            erros.append(f'{rot}: marcada como private mas está no data.json público')

        tags = e['tags']
        if not isinstance(tags, list) or any(not isinstance(t, str) for t in tags):
            erros.append(f'{rot}: tags precisa ser lista de strings')
        else:
            sujas = [t for t in tags if t != t.strip().lower()]
            if sujas:
                avisos.append(f'{rot}: tags fora do padrão minúsculo/sem espaço: {sujas}')
            if len(set(tags)) != len(tags):
                avisos.append(f'{rot}: tags repetidas')

        r = e.get('rating', 0)
        if not isinstance(r, int) or isinstance(r, bool) or not 0 <= r <= 5:
            erros.append(f'{rot}: rating "{r}" precisa ser inteiro de 0 a 5')

        url = e.get('url', '')
        if url and not str(url).startswith(('http://', 'https://')):
            erros.append(f'{rot}: url "{str(url)[:40]}" não começa com http')
        if url:
            urls.setdefault(str(url).strip().lower(), []).append(i)

        d = e['dates']
        if not isinstance(d, dict) or 'captured' not in d:
            erros.append(f'{rot}: dates precisa ser objeto com "captured"')
        else:
            for chave, valor in d.items():
                if valor is not None and not data_valida(valor):
                    erros.append(f'{rot}: dates.{chave} = "{valor}" não é AAAA-MM-DD')
            # A data de consumo é o que ordena a timeline; inventada, mente.
            if e['status'] == 'consumido' and not d.get('consumed'):
                avisos.append(f'{rot}: consumido sem dates.consumed')
            if e['status'] != 'consumido' and d.get('consumed'):
                erros.append(f'{rot}: tem dates.consumed mas status é "{e["status"]}"')

        pags, lidas = e.get('pages'), e.get('pagesRead')
        for nome, v in (('pages', pags), ('pagesRead', lidas)):
            if v is not None and (not isinstance(v, int) or isinstance(v, bool) or v < 0):
                erros.append(f'{rot}: {nome} = "{v}" precisa ser inteiro >= 0')
        if isinstance(pags, int) and isinstance(lidas, int) and lidas > pags:
            erros.append(f'{rot}: pagesRead ({lidas}) maior que pages ({pags})')
        if lidas and not pags:
            avisos.append(f'{rot}: pagesRead sem pages — a barra de progresso não aparece')

        for q in e.get('quotes', []) or []:
            if not isinstance(q, dict) or not str(q.get('text', '')).strip():
                erros.append(f'{rot}: quote sem texto')

        for r_ in e.get('related', []) or []:
            if not isinstance(r_, dict) or 'id' not in r_:
                erros.append(f'{rot}: related precisa ser lista de {{id, why}}')

        desconhecidos = set(e) - CONHECIDOS
        if desconhecidos:
            avisos.append(f'{rot}: campos desconhecidos {sorted(desconhecidos)}')

    # related órfão some da tela sem avisar ninguém
    for i, e in enumerate(entries):
        if not isinstance(e, dict):
            continue
        for r_ in e.get('related', []) or []:
            if isinstance(r_, dict) and r_.get('id') and r_['id'] not in ids:
                avisos.append(f'entrada #{i}: related aponta para id inexistente {r_["id"]}')

    for url, onde in urls.items():
        if len(onde) > 1:
            avisos.append(f'url repetida em {onde}: {url[:60]}')

    return erros, avisos


def main():
    caminho = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'data.json'
    try:
        data = json.loads(caminho.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError) as e:
        sys.exit(f'não consegui ler {caminho}: {e}')

    erros, avisos = validar(data)
    for a in avisos:
        print(f'aviso: {a}', file=sys.stderr)
    for e in erros:
        print(f'ERRO: {e}', file=sys.stderr)

    total = len(data.get('entries', []))
    if erros:
        sys.exit(f'{len(erros)} erro(s) em {total} entrada(s) — data.json inválido')
    print(f'data.json ok: {total} entrada(s), {len(avisos)} aviso(s)')


if __name__ == '__main__':
    main()
