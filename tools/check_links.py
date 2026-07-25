#!/usr/bin/env python3
"""Testa as URLs do data.json e lista as quebradas. Stdlib apenas.

Acervo de links vira cemitério em silêncio — melhor descobrir em 30 dias.
Sai com código 1 se achou link morto (a Action usa isso para abrir issue).
"""
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UA = 'Mozilla/5.0 (compatible; LogBookLinkCheck/1.0)'
TIMEOUT = 15


def testar(url):
    """(ok, detalhe). HEAD primeiro; muito site responde 405 e aceita GET."""
    for metodo in ('HEAD', 'GET'):
        req = urllib.request.Request(url, method=metodo, headers={'User-Agent': UA})
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
                if r.status < 400:
                    return True, r.status
        except urllib.error.HTTPError as e:
            # 403/429 costumam ser antibot, não link morto: não vale acusar.
            if e.code in (403, 405, 429, 999):
                if metodo == 'GET':
                    return True, f'{e.code} (provável antibot)'
                continue
            if metodo == 'GET':
                return False, f'HTTP {e.code}'
        except Exception as e:
            if metodo == 'GET':
                return False, type(e).__name__
    return False, 'sem resposta'


def main():
    entries = json.loads((ROOT / 'data.json').read_text(encoding='utf-8'))['entries']
    alvos = [e for e in entries if str(e.get('url', '')).startswith('http')]
    quebrados = []
    for e in alvos:
        ok, detalhe = testar(e['url'])
        if not ok:
            quebrados.append((e, detalhe))
            print(f'✗ {detalhe} · {e["title"][:60]}', file=sys.stderr)

    print(f'{len(alvos)} link(s) testado(s), {len(quebrados)} quebrado(s)', file=sys.stderr)
    if not quebrados:
        return

    # Todos falharem é sintoma de rede/certificado do ambiente, não de link morto.
    # Sem esta guarda, um runner sem CA abriria uma issue acusando o acervo inteiro.
    if len(quebrados) == len(alvos) and len(alvos) > 3:
        print('todos falharam — provável problema de rede, não abrindo issue', file=sys.stderr)
        return

    print(f'Encontrei **{len(quebrados)}** link(s) quebrado(s) de {len(alvos)}:\n')
    for e, detalhe in quebrados:
        arquivo = f' — [texto arquivado](archive/{e["id"]}.md)' if e.get('archived') else ''
        print(f'- [{e["title"][:80]}]({e["url"]}) · `{detalhe}`{arquivo}')
    print('\n> Link morto com texto arquivado não é perda: o conteúdo continua no repo.')
    sys.exit(1)


if __name__ == '__main__':
    main()
