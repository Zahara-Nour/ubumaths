"""Écrit les 4 modèles du lot 2 « limites : capacités » de la terminale spécialité dans
scripts/questions/tspe-2-limites/.

Phase 0 validée par David le 2026-11-01 (« go » sur les recos, § 15 du journal
« docs/wip/questions-tspe-progress.md »), un point par modèle :

| # | Point    | Titre                                                  | Catégorie, niveau                                     |
| 1 | TSPE-402 | Limites usuelles d'une suite                           | Suites › Limites de suites › limites usuelles, 1       |
| 2 | TSPE-576 | Croissances comparées : suites                         | Suites › Limites de suites › croissances comparées, 1  |
| 3 | TSPE-403 | Limites usuelles d'une fonction                        | Fonctions › Limites de fonctions › limites usuelles, 1 |
| 4 | TSPE-582 | Limite d'une fonction par comparaison ou encadrement   | Fonctions › Limites de fonctions › comparaison et encadrement, 1 |

Décisions : trois sous-notions neuves (limites usuelles × 2, croissances comparées des suites),
créées par la migration de rangement ; sin et cos exclus (lts-5 : limites des seules fonctions de
1re) ; encadrements DONNÉS dans l'énoncé ; niveau `T_SPE` seul.

Voisins à ne pas répéter : 94e4d691 et 806c10f4 (sommes, opérations), c611f92b (formes
indéterminées des suites), b97dabe1 (croissances comparées des fonctions), 98ba277c (gendarmes,
suites), 7063979e (comparaison, suites).

Bornes : « lycee/tspe.json » (402, 576, 403, 582 : cas simples ; puissances entières, racine
carrée, exponentielle).

    python3 docs/wip/questions/lot-tspe-limites.py scripts/questions/tspe-2-limites
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]

PINF = '+\\infty'
MINF = '-\\infty'


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(nom, title, description, theme, domain, subdomain, level, variations, specs, delay=60):
    return nom, {'title': title, 'description': description, 'grades': ['T_SPE'],
                 'theme': theme, 'domain': domain, 'subdomain': subdomain,
                 'level': level, 'delay': delay, 'status': 'draft',
                 'shared': {'blankDefaults': {'acceptDecimal': True}, 'cleanCoefficients': True},
                 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps):
    return {'statement': statement, 'variables': variables,
            'blanks': [{'expectedAnswer': a} for a in answers],
            'correction': {'steps': steps}}


def col(x):
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


def si(cond, alors, sinon):
    return '{{if:' + cond + '|' + alors + '|' + sinon + '}}'


def infini(cond):
    """+∞ si la condition est vraie, −∞ sinon."""
    return si(cond, PINF, MINF)


def puiss(base, p):
    """base^p, sans exposant 1."""
    return si(p + '==1', base, base + '^{ {{' + p + '}} }')


def coef(k):
    """Coefficient devant un terme : rien pour 1, « − » pour −1."""
    return si(k + '==1', '', si(k + '==-1', '-', '{{' + k + '}}'))


def lim(var_, en):
    return '\\displaystyle\\lim_{' + var_ + '\\to' + en + '}'


LIM_N = lim('n', '+\\infty')
QUESTION_SUITE = 'Détermine la limite de la suite $(u_n)$.\n\n$' + LIM_N + 'u_n=?$'


def question_f(en, precision=''):
    return ('Détermine la limite de $f$ en $' + en + '$' + precision + '.\n\n$' + lim('x', en)
            + 'f(x)=?$')


MODELES = []

# --- 1. TSPE-402 : limites usuelles d'une suite ----------------------------------------------

K = var('k', '2..9;±')
P4 = var('p', '1..4')
S = var('s', '0..1')

V402_PUISSANCE = variation(
    'Pour tout entier naturel $n$, on pose $u_n={{k}}' + puiss('n', 'p') + '$.\n\n' + QUESTION_SUITE,
    [K, P4], [infini('k>0')],
    ['$' + LIM_N + puiss('n', 'p') + '=+\\infty$ (limite usuelle).',
     'On multiplie par ${{k}}$, ' + si('k>0', 'un nombre positif : le signe ne change pas.',
                                       'un nombre négatif : le signe change.'),
     '$$' + LIM_N + 'u_n=' + col(infini('k>0')) + '$$'])
V402_INVERSE = variation(
    'Pour tout entier $n\\geqslant1$, on pose $u_n=\\dfrac{ {{k}} }{' + puiss('n', 'p') + '}$.\n\n'
    + QUESTION_SUITE,
    [var('k', '1..9;±'), var('p', '1..3')], ['0'],
    ['$' + LIM_N + puiss('n', 'p') + '=+\\infty$, donc $' + LIM_N + '\\dfrac{1}{' + puiss('n', 'p')
     + '}=0$ (limite usuelle).',
     'Multiplier par ${{k}}$ ne change pas une limite nulle.',
     '$$' + LIM_N + 'u_n=' + col('0') + '$$'])
V402_RACINE = variation(
    'Pour tout entier $n\\geqslant1$, on pose $u_n='
    + si('s==0', coef('k') + '\\sqrt{n}', '\\dfrac{ {{k}} }{\\sqrt{n}}') + '$.\n\n' + QUESTION_SUITE,
    [K, S], [si('s==0', infini('k>0'), '0')],
    ['$' + LIM_N + '\\sqrt{n}=+\\infty$ (limite usuelle)'
     + si('s==0', '.', ', donc $' + LIM_N + '\\dfrac{1}{\\sqrt{n}}=0$.'),
     si('s==0', 'On multiplie par ${{k}}$ : ' + si('k>0', 'le signe ne change pas.', 'le signe change.'),
        'Multiplier par ${{k}}$ ne change pas une limite nulle.'),
     '$$' + LIM_N + 'u_n=' + col(si('s==0', infini('k>0'), '0')) + '$$'])
V402_EXP = variation(
    'Pour tout entier naturel $n$, on pose $u_n=' + coef('k') + si('s==0', 'e^{n}', 'e^{-n}') + '$.\n\n'
    + QUESTION_SUITE,
    [K, S], [si('s==0', infini('k>0'), '0')],
    [si('s==0', '$' + LIM_N + 'e^{n}=+\\infty$ (limite usuelle).',
        '$e^{-n}=\\dfrac{1}{e^{n}}$ et $' + LIM_N + 'e^{n}=+\\infty$, donc $' + LIM_N
        + 'e^{-n}=0$.'),
     si('s==0', 'On multiplie par ${{k}}$ : ' + si('k>0', 'le signe ne change pas.', 'le signe change.'),
        'Multiplier par ${{k}}$ ne change pas une limite nulle.'),
     '$$' + LIM_N + 'u_n=' + col(si('s==0', infini('k>0'), '0')) + '$$'])

MODELES.append(modele(
    '1-limites-usuelles-suite', 'Limites usuelles d\'une suite',
    'Limite de k·nᵖ, k/nᵖ, k√n, k/√n, k·eⁿ, k·e⁻ⁿ (pièges : signe de k, k/nᵖ → +∞, e⁻ⁿ → +∞)',
    'Suites', 'Limites de suites', 'Limites usuelles', 1,
    [V402_PUISSANCE, V402_INVERSE, V402_RACINE, V402_EXP],
    [spec('v0 : 3n² → +∞', 0, {'k': 3, 'p': 2}, PINF, 'correct'),
     spec('v0 : −4n³ → −∞', 0, {'k': -4, 'p': 3}, MINF, 'correct'),
     spec('v0 : signe oublié', 0, {'k': -4, 'p': 3}, PINF, 'incorrect'),
     spec('v1 : 5/n² → 0', 1, {'k': 5, 'p': 2}, '0', 'correct'),
     spec('v1 : +∞', 1, {'k': 5, 'p': 2}, PINF, 'incorrect'),
     spec('v1 : k', 1, {'k': 5, 'p': 2}, '5', 'incorrect'),
     spec('v2 : −3√n → −∞', 2, {'k': -3, 's': 0}, MINF, 'correct'),
     spec('v2 : 7/√n → 0', 2, {'k': 7, 's': 1}, '0', 'correct'),
     spec('v2 : 7/√n, +∞', 2, {'k': 7, 's': 1}, PINF, 'incorrect'),
     spec('v3 : 2eⁿ → +∞', 3, {'k': 2, 's': 0}, PINF, 'correct'),
     spec('v3 : −5e⁻ⁿ → 0', 3, {'k': -5, 's': 1}, '0', 'correct'),
     spec('v3 : e⁻ⁿ pris pour +∞', 3, {'k': -5, 's': 1}, MINF, 'incorrect')]))

# --- 2. TSPE-576 : croissances comparées, suites ---------------------------------------------

P5 = var('p', '1..5')
RAPPEL_CC = ('Croissances comparées : pour tout entier $p\\geqslant1$, $' + LIM_N
             + '\\dfrac{e^{n}}{n^{p}}=+\\infty$ et $' + LIM_N + '\\dfrac{n^{p}}{e^{n}}=0$'
             ' : l\'exponentielle l\'emporte sur toute puissance.')

V576_QUOTIENT = variation(
    'Pour tout entier naturel $n$, on pose $u_n=\\dfrac{' + coef('k') + puiss('n', 'p')
    + '}{e^{n}}$.\n\n' + QUESTION_SUITE,
    [var('k', '1..9'), P5], ['0'],
    ['Numérateur et dénominateur tendent vers $+\\infty$ : forme indéterminée'
     ' « $\\dfrac{\\infty}{\\infty}$ ».',
     RAPPEL_CC,
     '$$' + LIM_N + 'u_n=' + col('0') + '$$'])
V576_INVERSE = variation(
    'Pour tout entier $n\\geqslant1$, on pose $u_n=\\dfrac{e^{n}}{' + coef('k') + puiss('n', 'p')
    + '}$.\n\n' + QUESTION_SUITE,
    [var('k', '1..9;±'), P5], [infini('k>0')],
    ['Forme indéterminée « $\\dfrac{\\infty}{\\infty}$ ». On écrit $u_n='
     + si('k==1', '', si('k==-1', '-', si('k>0', '\\dfrac{1}{ {{k}} }', '-\\dfrac{1}{ {{eval:-k}} }')))
     + '\\dfrac{e^{n}}{' + puiss('n', 'p') + '}$.',
     RAPPEL_CC,
     si('k>0', 'Le facteur devant le quotient est positif : le signe ne change pas.',
        'Le facteur devant le quotient est négatif : le signe change.'),
     '$$' + LIM_N + 'u_n=' + col(infini('k>0')) + '$$'])
V576_PRODUIT = variation(
    'Pour tout entier naturel $n$, on pose $u_n=' + coef('k') + puiss('n', 'p') + 'e^{-n}$.\n\n'
    + QUESTION_SUITE,
    [var('k', '1..9;±'), P5], ['0'],
    ['Forme indéterminée « $\\infty\\times0$ ». On écrit $u_n=' + coef('k') + '\\dfrac{'
     + puiss('n', 'p') + '}{e^{n}}$.',
     RAPPEL_CC,
     '$$' + LIM_N + 'u_n=' + col('0') + '$$'])
V576_DIFFERENCE = variation(
    'Pour tout entier naturel $n$, on pose $u_n=e^{n}-' + coef('k') + puiss('n', 'p') + '$.\n\n'
    + QUESTION_SUITE,
    [var('k', '1..9'), P5], [PINF],
    ['Forme indéterminée « $\\infty-\\infty$ ». On factorise par $e^{n}$ : $u_n=e^{n}\\left(1-'
     + coef('k') + '\\dfrac{' + puiss('n', 'p') + '}{e^{n}}\\right)$.',
     RAPPEL_CC + ' La parenthèse tend vers $1$.',
     '$$' + LIM_N + 'u_n=' + col(PINF) + '$$'])

MODELES.append(modele(
    '2-croissances-comparees-suite', 'Croissances comparées : suites',
    'Limite de k·nᵖ/eⁿ, eⁿ/(k·nᵖ), k·nᵖe⁻ⁿ, eⁿ − k·nᵖ (pièges : ∞/∞ = 1, limite d\'un seul'
    ' facteur, ∞ − ∞ = 0)',
    'Suites', 'Limites de suites', 'Croissances comparées', 1,
    [V576_QUOTIENT, V576_INVERSE, V576_PRODUIT, V576_DIFFERENCE],
    [spec('v0 : 3n²/eⁿ → 0', 0, {'k': 3, 'p': 2}, '0', 'correct'),
     spec('v0 : +∞ (la puissance l\'emporterait)', 0, {'k': 3, 'p': 2}, PINF, 'incorrect'),
     spec('v0 : ∞/∞ = 1', 0, {'k': 3, 'p': 2}, '1', 'incorrect'),
     spec('v1 : eⁿ/(2n³) → +∞', 1, {'k': 2, 'p': 3}, PINF, 'correct'),
     spec('v1 : eⁿ/(−2n³) → −∞', 1, {'k': -2, 'p': 3}, MINF, 'correct'),
     spec('v1 : 0', 1, {'k': 2, 'p': 3}, '0', 'incorrect'),
     spec('v2 : 4n⁵e⁻ⁿ → 0', 2, {'k': 4, 'p': 5}, '0', 'correct'),
     spec('v2 : +∞ (limite de n⁵ seule)', 2, {'k': 4, 'p': 5}, PINF, 'incorrect'),
     spec('v3 : eⁿ − 6n⁴ → +∞', 3, {'k': 6, 'p': 4}, PINF, 'correct'),
     spec('v3 : −∞', 3, {'k': 6, 'p': 4}, MINF, 'incorrect'),
     spec('v3 : ∞ − ∞ = 0', 3, {'k': 6, 'p': 4}, '0', 'incorrect')]))

# --- 3. TSPE-403 : limites usuelles d'une fonction -------------------------------------------

# Côté c : 0 → x > 0 (ou +∞), 1 → x < 0 (ou −∞)
C = var('c', '0..1')
# Signe de k/xⁿ près de 0 du côté c : sg = signe(k) × (±1)ⁿ
SG = var('sg', '{{eval:sign(k)*(1-2*c)^n}}')

V403_PUISSANCE = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)={{k}}' + puiss('x', 'n') + '$.\n\n'
    + question_f('-\\infty'),
    [K, var('n', '1..5'), var('sg', '{{eval:sign(k)*(-1)^n}}')], [infini('sg>0')],
    [si('n%2==0', 'L\'exposant ${{n}}$ est pair : $' + lim('x', '-\\infty') + puiss('x', 'n')
        + '=+\\infty$.',
        'L\'exposant ${{n}}$ est impair : $' + lim('x', '-\\infty') + puiss('x', 'n')
        + '=-\\infty$.'),
     'On multiplie par ${{k}}$ : ' + si('k>0', 'le signe ne change pas.', 'le signe change.'),
     '$$' + lim('x', '-\\infty') + 'f(x)=' + col(infini('sg>0')) + '$$'])
V403_INVERSE_EN_0 = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}^*$ par $f(x)=\\dfrac{ {{k}} }{' + puiss('x', 'n')
    + '}$.\n\n' + question_f('0', ' (on a $x' + si('c==0', '>', '<') + '0$)'),
    [var('k', '1..9;±'), var('n', '1..4'), C, SG], [infini('sg>0')],
    ['Quand $x$ tend vers $0$, $' + puiss('x', 'n') + '$ tend vers $0$ '
     + si('c==0', 'en restant positif (car $x>0$)',
          si('n%2==0', 'en restant positif (exposant pair)', 'en restant négatif (exposant impair, $x<0$)'))
     + ' : $\\dfrac{1}{' + puiss('x', 'n') + '}$ tend vers '
     + si('c==0', '$+\\infty$', si('n%2==0', '$+\\infty$', '$-\\infty$')) + '.',
     'On multiplie par ${{k}}$ : ' + si('k>0', 'le signe ne change pas.', 'le signe change.'),
     '$$' + lim('x', '0') + 'f(x)=' + col(infini('sg>0')) + '$$'])
V403_INVERSE_EN_INFINI = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}^*$ par $f(x)=\\dfrac{ {{k}} }{' + puiss('x', 'n')
    + '}$.\n\n' + question_f(si('c==0', '+\\infty', '-\\infty')),
    [var('k', '1..9;±'), var('n', '1..4'), C], ['0'],
    ['$' + puiss('x', 'n') + '$ tend vers l\'infini, donc $\\dfrac{1}{' + puiss('x', 'n')
     + '}$ tend vers $0$.',
     'Multiplier par ${{k}}$ ne change pas une limite nulle.',
     '$$' + lim('x', si('c==0', '+\\infty', '-\\infty')) + 'f(x)=' + col('0') + '$$'])
V403_RACINE = variation(
    si('s==0', 'Soit $f$ la fonction définie sur $\\left[0\\,;+\\infty\\right[$ par $f(x)='
       + coef('k') + '\\sqrt{x}$.\n\n' + question_f('+\\infty'),
       'Soit $f$ la fonction définie sur $\\left]0\\,;+\\infty\\right[$ par $f(x)=\\dfrac{ {{k}} }'
       '{\\sqrt{x}}$.\n\n' + question_f('0', ' (on a $x>0$)')),
    [K, S], [infini('k>0')],
    [si('s==0', '$' + lim('x', '+\\infty') + '\\sqrt{x}=+\\infty$ (limite usuelle).',
        'Quand $x$ tend vers $0$ avec $x>0$, $\\sqrt{x}$ tend vers $0$ en restant positif : $'
        + lim('x', '0') + '\\dfrac{1}{\\sqrt{x}}=+\\infty$.'),
     'On multiplie par ${{k}}$ : ' + si('k>0', 'le signe ne change pas.', 'le signe change.'),
     '$$' + lim('x', si('s==0', '+\\infty', '0')) + 'f(x)=' + col(infini('k>0')) + '$$'])
V403_EXP = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=' + coef('k') + 'e^{x}$.\n\n'
    + question_f(si('c==0', '+\\infty', '-\\infty')),
    [K, C], [si('c==0', infini('k>0'), '0')],
    [si('c==0', '$' + lim('x', '+\\infty') + 'e^{x}=+\\infty$ (limite usuelle).',
        '$' + lim('x', '-\\infty') + 'e^{x}=0$ (limite usuelle).'),
     si('c==0', 'On multiplie par ${{k}}$ : ' + si('k>0', 'le signe ne change pas.', 'le signe change.'),
        'Multiplier par ${{k}}$ ne change pas une limite nulle.'),
     '$$' + lim('x', si('c==0', '+\\infty', '-\\infty')) + 'f(x)='
     + col(si('c==0', infini('k>0'), '0')) + '$$'])

MODELES.append(modele(
    '3-limites-usuelles-fonction', 'Limites usuelles d\'une fonction',
    'Limite de k·xⁿ en −∞, de k/xⁿ en 0 (à droite ou à gauche) et en ±∞, de k√x en +∞, de k/√x en 0,'
    ' de k·eˣ en ±∞ (pièges : parité de n, côté de 0, signe de k, eˣ → 0 en −∞)',
    'Fonctions', 'Limites de fonctions', 'Limites usuelles', 1,
    [V403_PUISSANCE, V403_INVERSE_EN_0, V403_INVERSE_EN_INFINI, V403_RACINE, V403_EXP],
    [spec('v0 : 3x² en −∞ → +∞', 0, {'k': 3, 'n': 2, 'sg': 1}, PINF, 'correct'),
     spec('v0 : 3x³ en −∞ → −∞', 0, {'k': 3, 'n': 3, 'sg': -1}, MINF, 'correct'),
     spec('v0 : 3x³, parité oubliée', 0, {'k': 3, 'n': 3, 'sg': -1}, PINF, 'incorrect'),
     spec('v0 : −2x⁵ en −∞ → +∞', 0, {'k': -2, 'n': 5, 'sg': 1}, PINF, 'correct'),
     spec('v1 : 4/x³, x < 0 → −∞', 1, {'k': 4, 'n': 3, 'c': 1, 'sg': -1}, MINF, 'correct'),
     spec('v1 : 4/x³, x < 0, côté oublié', 1, {'k': 4, 'n': 3, 'c': 1, 'sg': -1}, PINF, 'incorrect'),
     spec('v1 : −4/x², x < 0 → −∞', 1, {'k': -4, 'n': 2, 'c': 1, 'sg': -1}, MINF, 'correct'),
     spec('v1 : −4/x, x > 0 → −∞', 1, {'k': -4, 'n': 1, 'c': 0, 'sg': -1}, MINF, 'correct'),
     spec('v1 : 0', 1, {'k': 4, 'n': 3, 'c': 1, 'sg': -1}, '0', 'incorrect'),
     spec('v2 : 5/x² en +∞ → 0', 2, {'k': 5, 'n': 2, 'c': 0}, '0', 'correct'),
     spec('v2 : −5/x³ en −∞ → 0', 2, {'k': -5, 'n': 3, 'c': 1}, '0', 'correct'),
     spec('v2 : +∞', 2, {'k': 5, 'n': 2, 'c': 0}, PINF, 'incorrect'),
     spec('v3 : −3√x en +∞ → −∞', 3, {'k': -3, 's': 0}, MINF, 'correct'),
     spec('v3 : 2/√x en 0 → +∞', 3, {'k': 2, 's': 1}, PINF, 'correct'),
     spec('v3 : 2/√x en 0, 0', 3, {'k': 2, 's': 1}, '0', 'incorrect'),
     spec('v4 : −2eˣ en +∞ → −∞', 4, {'k': -2, 'c': 0}, MINF, 'correct'),
     spec('v4 : 6eˣ en −∞ → 0', 4, {'k': 6, 'c': 1}, '0', 'correct'),
     spec('v4 : eˣ en −∞ pris pour −∞', 4, {'k': 6, 'c': 1}, MINF, 'incorrect')]))

# --- 4. TSPE-582 : comparaison et encadrement, fonctions -------------------------------------

L = var('L', '1..9;±')
LIM_X = lim('x', '+\\infty')

V582_ENCADREMENT = variation(
    'Une fonction $f$ vérifie, pour tout réel $x>0$ :\n\n$${{L}}-\\dfrac{ {{a}} }{x}\\leqslant f(x)'
    '\\leqslant{{L}}+\\dfrac{ {{b}} }{x^{2}}$$\n\n' + question_f('+\\infty'),
    [L, var('a', '1..9'), var('b', '1..9')], ['{{L}}'],
    ['$' + LIM_X + '\\dfrac{ {{a}} }{x}=0$ et $' + LIM_X + '\\dfrac{ {{b}} }{x^{2}}=0$ : les deux'
     ' membres de l\'encadrement tendent vers ${{L}}$.',
     'D\'après le théorème des gendarmes, $f(x)$ tend aussi vers ${{L}}$.',
     '$$' + LIM_X + 'f(x)=' + col('{{L}}') + '$$'])
V582_MINORATION = variation(
    'Une fonction $f$ vérifie, pour tout réel $x>0$ :\n\n$$f(x)\\geqslant '
    + si('s==0', coef('k') + 'x^{2}', coef('k') + '\\sqrt{x}') + '$$\n\n' + question_f('+\\infty'),
    [var('k', '1..9'), S], [PINF],
    ['$' + LIM_X + si('s==0', coef('k') + 'x^{2}', coef('k') + '\\sqrt{x}') + '=+\\infty$.',
     '$f(x)$ est minorée par une fonction qui tend vers $+\\infty$ : par comparaison, $f(x)$ tend'
     ' aussi vers $+\\infty$.',
     '$$' + LIM_X + 'f(x)=' + col(PINF) + '$$'])
V582_MAJORATION = variation(
    'Une fonction $f$ vérifie, pour tout réel $x$ :\n\n$$f(x)\\leqslant ' + coef('k') + 'x{{c;+}}$$'
    '\n\n' + question_f('-\\infty'),
    [var('k', '1..9'), var('c', '1..9;±')], [MINF],
    ['$' + lim('x', '-\\infty') + '\\left(' + coef('k') + 'x{{c;+}}\\right)=-\\infty$ (le'
     ' coefficient ${{k}}$ est positif).',
     '$f(x)$ est majorée par une fonction qui tend vers $-\\infty$ : par comparaison, $f(x)$ tend'
     ' aussi vers $-\\infty$.',
     '$$' + lim('x', '-\\infty') + 'f(x)=' + col(MINF) + '$$'])
V582_BORNEE = variation(
    'Une fonction $g$ vérifie, pour tout réel $x$ : $-{{m}}\\leqslant g(x)\\leqslant{{m}}$.\n\n'
    'Soit $f$ la fonction définie sur $\\mathbb{R}^*$ par $f(x)={{L}}+\\dfrac{g(x)}{x^{2}}$.\n\n'
    + question_f('+\\infty'),
    [L, var('m', '1..9')], ['{{L}}'],
    ['On divise l\'encadrement de $g(x)$ par $x^{2}>0$ et on ajoute ${{L}}$ : ${{L}}-\\dfrac{ {{m}} }'
     '{x^{2}}\\leqslant f(x)\\leqslant{{L}}+\\dfrac{ {{m}} }{x^{2}}$.',
     'Les deux membres tendent vers ${{L}}$ : d\'après le théorème des gendarmes, $f(x)$ aussi.',
     '$$' + LIM_X + 'f(x)=' + col('{{L}}') + '$$'])

MODELES.append(modele(
    '4-comparaison-encadrement-fonction', 'Limite d\'une fonction par comparaison ou encadrement',
    'Encadrement, minoration ou majoration donnés ; fonction bornée divisée par x² (pièges : limite'
    ' d\'un seul membre, L ± m, sens de la comparaison)',
    'Fonctions', 'Limites de fonctions', 'Comparaison et encadrement', 1,
    [V582_ENCADREMENT, V582_MINORATION, V582_MAJORATION, V582_BORNEE],
    [spec('v0 : L = 3', 0, {'L': 3, 'a': 2, 'b': 5}, '3', 'correct'),
     spec('v0 : L − a (limite d\'un seul membre, mal prise)', 0, {'L': 3, 'a': 2, 'b': 5}, '1',
          'incorrect'),
     spec('v0 : 0', 0, {'L': 3, 'a': 2, 'b': 5}, '0', 'incorrect'),
     spec('v1 : f ⩾ 4x² → +∞', 1, {'k': 4, 's': 0}, PINF, 'correct'),
     spec('v1 : f ⩾ √x → +∞', 1, {'k': 1, 's': 1}, PINF, 'correct'),
     spec('v1 : k', 1, {'k': 4, 's': 0}, '4', 'incorrect'),
     spec('v2 : f ⩽ 2x − 3 en −∞ → −∞', 2, {'k': 2, 'c': -3}, MINF, 'correct'),
     spec('v2 : +∞', 2, {'k': 2, 'c': -3}, PINF, 'incorrect'),
     spec('v3 : L = −5', 3, {'L': -5, 'm': 2}, '-5', 'correct'),
     spec('v3 : L + m', 3, {'L': -5, 'm': 2}, '-3', 'incorrect'),
     spec('v3 : 0', 3, {'L': -5, 'm': 2}, '0', 'incorrect')]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
