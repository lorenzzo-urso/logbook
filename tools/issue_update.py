#!/usr/bin/env python3
"""Issue rotulada `atualizar` -> alteração numa entrada do data.json.

O site é estático e público: não pode escrever no repositório. As ações do
redesign (Começar, Terminei, Atualizar página, Anotar trecho) abrem uma issue
pré-preenchida e esta Action aplica a mudança — sem token no aparelho.

    python3 tools/issue_update.py corpo.txt
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'data.json'
ACOES = {'comecei', 'progresso', 'terminei', 'abandonei', 'trecho', 'ligar'}


def parse_body(corpo):
    """`### Campo\\nvalor` do issue form, mais o formato `campo: valor`."""
    campos = {}
    for bloco in re.split(r'^###\s+', corpo, flags=re.M)[1:]:
        linhas = bloco.strip().split('\n', 1)
        chave = linhas[0].strip().lower()
        valor = linhas[1].strip() if len(linhas) > 1 else ''
        campos[chave] = '' if valor in ('_No response_', '_Sem resposta_') else valor
    for linha in corpo.splitlines():
        m = re.match(r'^\s*(id|acao|ação|pagina|página|total|texto|avaliacao|avaliação|alvo)\s*:\s*(.+)$', linha, re.I)
        if m:
            campos.setdefault(m.group(1).strip().lower(), m.group(2).strip())
    return campos


def pega(campos, *nomes):
    for n in nomes:
        for chave, valor in campos.items():
            if chave.startswith(n) and valor:
                return valor.strip()
    return ''


def inteiro(v):
    m = re.search(r'\d+', str(v or ''))
    return int(m.group(0)) if m else None


def main():
    corpo = Path(sys.argv[1]).read_text(encoding='utf-8') if len(sys.argv) > 1 else ''
    campos = parse_body(corpo)

    alvo_id = pega(campos, 'id da entrada', 'id')
    acao = pega(campos, 'ação', 'acao').lower()
    if not alvo_id:
        sys.exit('issue sem id da entrada')
    if acao not in ACOES:
        sys.exit(f'ação "{acao}" desconhecida (esperado: {", ".join(sorted(ACOES))})')

    data = json.loads(DATA.read_text(encoding='utf-8'))
    entrada = next((e for e in data['entries'] if e['id'] == alvo_id), None)
    if entrada is None:
        sys.exit(f'entrada {alvo_id} não existe no data.json')

    hoje = date.today().isoformat()
    datas = entrada.setdefault('dates', {})
    mudancas = []

    total = inteiro(pega(campos, 'total'))
    if total:
        entrada['pages'] = total
        mudancas.append(f'total de páginas = {total}')

    pagina = inteiro(pega(campos, 'página atual', 'pagina', 'página'))
    if pagina is not None and acao in ('progresso', 'terminei', 'comecei'):
        entrada['pagesRead'] = pagina
        mudancas.append(f'página {pagina}' + (f'/{entrada["pages"]}' if entrada.get('pages') else ''))

    nota = inteiro(pega(campos, 'avaliação', 'avaliacao'))
    if nota is not None and 0 <= nota <= 5:
        entrada['rating'] = nota
        mudancas.append(f'avaliação {nota}')

    texto = pega(campos, 'trecho ou nota', 'texto')

    if acao == 'comecei':
        entrada['status'] = 'em andamento'
        # setdefault não serve: o schema já cria a chave com None.
        if not datas.get('started'):
            datas['started'] = hoje
        datas['consumed'] = None
        mudancas.append('status = em andamento')
    elif acao == 'terminei':
        entrada['status'] = 'consumido'
        datas['consumed'] = hoje
        if entrada.get('pages'):
            entrada['pagesRead'] = entrada['pages']
        mudancas.append('status = consumido')
    elif acao == 'abandonei':
        entrada['status'] = 'abandonado'
        datas['consumed'] = None
        mudancas.append('status = abandonado')
    elif acao == 'trecho':
        if not texto:
            sys.exit('ação trecho sem texto')
        pg = pega(campos, 'página atual', 'pagina', 'página')
        entrada.setdefault('quotes', []).append({'text': texto, 'page': f'p. {pg}' if pg else ''})
        mudancas.append(f'{len(entrada["quotes"])} trecho(s)')
        texto = ''                      # já usado; não vira nota
    elif acao == 'ligar':
        alvo = pega(campos, 'ligar a', 'alvo')
        if not alvo:
            sys.exit('ação ligar sem alvo')
        projeto = next((e for e in data['entries']
                        if e['id'] == alvo or e.get('title', '').strip().lower() == alvo.strip().lower()), None)
        if projeto is None:
            sys.exit(f'não achei projeto "{alvo}"')
        rel = projeto.setdefault('related', [])
        if not any(r.get('id') == entrada['id'] for r in rel):
            rel.append({'id': entrada['id'], 'why': texto or ''})
        mudancas.append(f'ligado a "{projeto.get("title", "")[:40]}"')
        texto = ''

    if texto:
        entrada['notes'] = (entrada.get('notes') or '').strip()
        entrada['notes'] = (entrada['notes'] + '\n\n' + texto).strip() if entrada['notes'] else texto
        mudancas.append('nota atualizada')

    if not mudancas:
        sys.exit('nada para aplicar')

    data['lastUpdated'] = hoje
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'"{entrada.get("title", "")[:60]}": ' + ', '.join(mudancas))


if __name__ == '__main__':
    main()
