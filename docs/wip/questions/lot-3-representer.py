"""Écrit le modèle « Représenter les solutions d'une inéquation ax ⩾ b » (3-014, niveau 2) dans
scripts/questions/3-representer/.

Phase 0 validée par David le 2026-11-03 (journal `docs/archive/wip/demi-droite-progress.md` § PR 4) :
- la droite seule (une case, geste `representer:`) : l'inégalité est le niveau 1 (24aff7b0) ;
- fenêtre de 10 unités, borne jamais au milieu (début = k − d, d de 2 à 8) ;
- v1 a > 0, v2 a < 0, v3 borne en fraction avec a = ±3, droite graduée en tiers sur 4 unités,
  entiers seuls étiquetés.

Le côté des solutions, r : 0 <, 1 ⩽, 2 >, 3 ⩾ ; r = s si a > 0, le sens inverse sinon.

    python3 docs/wip/questions/lot-3-representer.py scripts/questions/3-representer
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def ev(x):
    return '{{eval:' + x + '}}'


def col(x):
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


def sens(v):
    """Le signe d'inégalité n° v (LaTeX)."""
    return ('{{if:' + v + '==0|<|{{if:' + v + '==1|\\leqslant |{{if:' + v + '==2|>|\\geqslant }}}}'
            '}}')


def intervalle(v, borne):
    """L'intervalle des solutions de x (signe n° v) borne, écrit pour ` ```line `."""
    return ('{{if:' + v + '==0|]-inf, ' + borne + '[|{{if:' + v + '==1|]-inf, ' + borne + ']|{{if:'
            + v + '==2|]' + borne + ', +inf[|[' + borne + ', +inf[}}}}}}')


def droite(debut, fin, pas, cle, valeur, labels=None):
    lignes = ['```line', 'start: ' + debut, 'end: ' + fin, 'step: ' + pas, 'arrows: true']
    if labels:
        lignes.append('labels: ' + labels)
    lignes.append(cle + ': ' + valeur)
    lignes.append('```')
    return '\n'.join(lignes)


CONSIGNE = 'Résous l\'inéquation $'
CONSIGNE_FIN = '$, puis représente ses solutions sur la droite graduée.\n\n'
POSITIF = ('On divise les deux membres par ${{a}}$, un nombre **positif** : le sens de'
           ' l\'inégalité **ne change pas**.')
NEGATIF = ('On divise les deux membres par ${{a}}$, un nombre **négatif** : le sens de'
           ' l\'inégalité **change**.')
CROCHET = ('{{if:mod(r,2)==0|L\'inégalité est **stricte** : la borne n\'est pas solution, le crochet'
           ' est tourné **vers l\'extérieur**.|L\'inégalité est **large** : la borne est solution, le'
           ' crochet est tourné **vers les solutions**.}} Les solutions sont les nombres'
           ' {{if:r<2|**plus petits**|**plus grands**}} que la borne : on colorie'
           ' {{if:r<2|à gauche|à droite}}.')
# r = s si a > 0, le sens inverse (s + 2 modulo 4) si a < 0
COTE = var('r', ev('mod(s+(abs(a)-a)/abs(a),4)'))


def entiere(a_plage):
    """v1 / v2 : b = a × k, fenêtre de 10 unités, k à d unités du début (d de 2 à 8)."""
    return {
        'statement': CONSIGNE + '{{a}}x' + sens('s') + ev('a*k') + CONSIGNE_FIN
        + droite('{{g}}', ev('g+10'), '1', 'representer', intervalle('r', '{{k}}')),
        'variables': [var('a', a_plage), var('k', '1..9;±'), var('s', '0..3'), COTE,
                      var('d', '2..8'), var('g', ev('k-d'))],
        'blanks': [],
        'correction': {'steps': [
            '{{if:a>0|' + POSITIF + '|' + NEGATIF + '}}',
            '$${{a}}x' + sens('s') + ev('a*k') + ' \\iff x' + sens('r') + '\\dfrac{' + ev('a*k')
            + '}{{{a}}} \\iff ' + col('x' + sens('r') + '{{k}}') + '$$',
            CROCHET,
            droite('{{g}}', ev('g+10'), '1', 'segments', intervalle('r', '{{k}}'))]}}


# v3 : borne n/3, n = 3q + m (m = 1 ou 2) : entre q et q + 1 ; b = a × n / 3
BORNE = '{{n}}/3'
FRACTION = {
    'statement': CONSIGNE + '{{a}}x' + sens('s') + ev('a*n/3') + CONSIGNE_FIN
    + droite('{{g}}', ev('g+4'), '1/3', 'representer', intervalle('r', BORNE),
             '{{g}}, ' + ev('g+1') + ', ' + ev('g+2') + ', ' + ev('g+3') + ', ' + ev('g+4')),
    'variables': [var('a', '-3|3'), var('q', '-5..4'), var('m', '1|2'), var('n', ev('3*q+m')),
                  var('s', '0..3'), COTE, var('d', '1|2'), var('g', ev('q-d'))],
    'blanks': [],
    'correction': {'steps': [
        '{{if:a>0|' + POSITIF + '|' + NEGATIF + '}}',
        '$${{a}}x' + sens('s') + ev('a*n/3') + ' \\iff x' + sens('r') + '\\dfrac{' + ev('a*n/3')
        + '}{{{a}}} \\iff ' + col('x' + sens('r') + ev('n/3')) + '$$',
        'La fraction ne tombe pas juste : la borne est entre deux entiers, sur une graduation en'
        ' tiers. ' + CROCHET,
        droite('{{g}}', ev('g+4'), '1/3', 'segments', intervalle('r', BORNE),
               '{{g}}, ' + ev('g+1') + ', ' + ev('g+2') + ', ' + ev('g+3') + ', ' + ev('g+4'))]}}

V1 = {'a': 3, 'k': 4, 's': 2, 'r': 2, 'd': 5, 'g': -1}
V2 = {'a': -2, 'k': -3, 's': 0, 'r': 2, 'd': 3, 'g': -6}
V2L = {'a': -2, 'k': 3, 's': 3, 'r': 1, 'd': 6, 'g': -3}
V3 = {'a': 3, 'q': 0, 'm': 2, 'n': 2, 's': 3, 'r': 3, 'd': 1, 'g': -1}
V3N = {'a': -3, 'q': -1, 'm': 2, 'n': -1, 's': 0, 'r': 2, 'd': 2, 'g': -3}

MODELE = {
    'title': 'Représenter les solutions d\'une inéquation ax ⩾ b',
    'description': 'Résoudre une inéquation du type ax ⩾ b (a positif ou négatif, les quatre sens,'
    ' borne entière ou en tiers) et représenter ses solutions sur la droite graduée avec un crochet',
    'grades': ['3'], 'theme': 'Calcul littéral', 'domain': 'Inéquations', 'subdomain': 'ax ⩾ b',
    'level': 2, 'delay': 90, 'status': 'draft',
    'variations': [entiere('2..9'), entiere('-9..-2'), FRACTION],
    'testSpecs': [
        spec('3x > 12 : ]4 ; +∞[', 0, V1, ']4 ; +∞[', 'correct'),
        spec('Erreur : crochet fermé [4 ; +∞[', 0, V1, '[4 ; +∞[', 'incorrect'),
        spec('Erreur : mauvais côté ]-∞ ; 4[', 0, V1, ']-∞ ; 4[', 'incorrect'),
        spec('Erreur : soustraction ]9 ; +∞[', 0, V1, ']9 ; +∞[', 'incorrect'),
        spec('Incomplète : borne sans côté', 0, V1, '4 exclue, côté ?', 'incorrect'),
        spec('−2x < 6 : ]−3 ; +∞[', 1, V2, ']-3 ; +∞[', 'correct'),
        spec('Erreur : sens non changé ]-∞ ; −3[', 1, V2, ']-∞ ; -3[', 'incorrect'),
        spec('Erreur : signe perdu ]3 ; +∞[', 1, V2, ']3 ; +∞[', 'incorrect'),
        spec('−2x ⩾ −6 : ]-∞ ; 3]', 1, V2L, ']-∞ ; 3]', 'correct'),
        spec('Erreur : crochet ouvert ]-∞ ; 3[', 1, V2L, ']-∞ ; 3[', 'incorrect'),
        spec('3x ⩾ 2 : [2/3 ; +∞[', 2, V3, '[2/3 ; +∞[', 'correct'),
        spec('Erreur : borne 3/2 (b/a renversé)', 2, V3, '[3/2 ; +∞[', 'incorrect'),
        spec('−3x < 1 : ]−1/3 ; +∞[', 2, V3N, ']-1/3 ; +∞[', 'correct'),
        spec('Erreur : sens non changé ]-∞ ; −1/3[', 2, V3N, ']-∞ ; -1/3[', 'incorrect')]}

os.makedirs(DOSSIER, exist_ok=True)
with open(os.path.join(DOSSIER, '01-representer-solutions-inequation.json'), 'w',
          encoding='utf-8') as f:
    json.dump(MODELE, f, ensure_ascii=False, indent='\t')
    f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'1 modèle écrit dans {DOSSIER}')
