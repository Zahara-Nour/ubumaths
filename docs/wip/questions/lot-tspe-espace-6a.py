"""Écrit les 9 modèles du lot 6a « vecteurs, orthogonalité et distances » de la terminale spécialité
dans scripts/questions/tspe-6a-orthogonalite-distances/.

Phase 0 validée par David le 2026-11-02 (« je valide », recos Q1-Q4, journal
« docs/wip/questions-tspe-espace-progress.md » § « Lot 6a »), un point par modèle :

| # | Point    | Titre                                          | Catégorie, niveau                                       |
| 1 | TSPE-549 | Translations de l'espace                       | Vecteurs, droites et plans de l'espace › Translations, 1 |
| 2 | TSPE-555 | Bilinéarité du produit scalaire                | Orthogonalité… › Produit scalaire, 3                    |
| 3 | TSPE-556 | Symétrie du produit scalaire                   | Orthogonalité… › Produit scalaire, 4                    |
| 4 | TSPE-347 | Développer ‖u + v‖²                            | Orthogonalité… › Produit scalaire, 5                    |
| 5 | TSPE-344 | La base est-elle orthonormée ?                 | Orthogonalité… › Base orthonormée, 1                    |
| 6 | TSPE-355 | Calculer une longueur avec le produit scalaire | Orthogonalité… › Norme et distance, 3                   |
| 7 | TSPE-356 | Distance d'un point à une droite               | Orthogonalité… › Projeté orthogonal, 5                  |
| 8 | TSPE-625 | Aire et volume en repère                       | Orthogonalité… › Grandeurs, 1                           |
| 9 | TSPE-357 | Deux droites orthogonales ?                    | Orthogonalité… › Orthogonalité, 1                       |

Décisions : niveau `T_SPE` seul ; aucune sous-notion neuve ; repère orthonormé dès qu'il y a
produit scalaire ; réponse en case ou en case choix, jamais les deux.

    python3 docs/wip/questions/lot-tspe-espace-6a.py scripts/questions/tspe-6a-orthogonalite-distances
"""
import json
import os
import subprocess
import sys
from fractions import Fraction

DOSSIER = sys.argv[1]
GEO = 'Géométrie'
VDP = 'Vecteurs, droites et plans de l\'espace'
ORTHO = 'Orthogonalité et distances dans l\'espace'
RON = 'Dans l\'espace muni d\'un repère orthonormé'


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(nom, title, description, domain, subdomain, level, variations, specs, delay=90):
    return nom, {'title': title, 'description': description, 'grades': ['T_SPE'],
                 'theme': GEO, 'domain': domain, 'subdomain': subdomain,
                 'level': level, 'delay': delay, 'status': 'draft',
                 'shared': {'blankDefaults': {'acceptDecimal': True}},
                 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None):
    v = {'statement': statement, 'blanks': [{'expectedAnswer': a} for a in answers],
         'correction': {'steps': steps}}
    if variables:
        v['variables'] = variables
    if conditions:
        v['conditions'] = conditions
    return v


def col(x):
    return '\\textcolor{{{color:primary.0}}}{ ' + x + ' }'


def choix(*items):
    """Bloc choix, dans l'ordre de la source : la réponse attendue est l'index de l'item."""
    return '```choix\n' + '\n'.join('- ' + i for i in items) + '\n```'


def coef(E, m):
    """Premier terme E·m : 1·m → m, −1·m → −m."""
    return ('{{if:' + E + '==1|' + m + '}}{{if:' + E + '==-1|-' + m + '}}{{if:' + E + '!=1 && ' + E
            + '!=-1|{{eval:' + E + '}}' + m + '}}')


def terme(E, m):
    """Terme suivant, signe écrit : +m, −m, +3m, −3m ; constante signée si m est vide (E ≠ 0)."""
    if m == '':
        return '{{if:' + E + '>0|+}}{{eval:' + E + '}}'
    return ('{{if:' + E + '==1|+' + m + '}}{{if:' + E + '==-1|-' + m + '}}{{if:' + E + '>1|+{{eval:' + E
            + '}}' + m + '}}{{if:' + E + '< -1|{{eval:' + E + '}}' + m + '}}')


def pt(nom, x, y, z):
    return nom + '(' + x + '\\,;\\,' + y + '\\,;\\,' + z + ')'


def vcol(nom, x, y, z):
    return nom + '\\begin{pmatrix}' + x + '\\\\' + y + '\\\\' + z + '\\end{pmatrix}'


def ev(e):
    return '{{eval:' + e + '}}'


def pa(e):
    """Valeur entre parenthèses si négative."""
    return '{{eval:' + e + ';()}}'


U, V, W = '\\vec{u}', '\\vec{v}', '\\vec{w}'


def n(x):
    return '\\|' + x + '\\|'


MODELES = []

# --- 1. TSPE-549 : translations ------------------------------------------------------------------

AB = ['bx-ax', 'by-ay', 'bz-az']
V549_AB = variation(
    'Dans l\'espace muni d\'un repère, on considère les points $' + pt('A', '{{ax}}', '{{ay}}', '{{az}}')
    + '$, $' + pt('B', '{{bx}}', '{{by}}', '{{bz}}') + '$ et $' + pt('C', '{{cx}}', '{{cy}}', '{{cz}}')
    + '$.\n\nOn note $t$ la translation qui transforme $A$ en $B$. Donne les coordonnées de l\'image $C\'$ '
    'de $C$ par $t$.\n\n$C\'(?\\,;\\,?\\,;\\,?)$',
    [var('ax', '-5..5'), var('ay', '-5..5'), var('az', '-5..5'), var('bx', '-5..5'), var('by', '-5..5'),
     var('bz', '-5..5'), var('cx', '-5..5'), var('cy', '-5..5'), var('cz', '-5..5')],
    [ev('cx+bx-ax'), ev('cy+by-ay'), ev('cz+bz-az')],
    ['$t$ est la translation de vecteur $\\overrightarrow{AB}$ : $C\'=t(C)$ signifie '
     '$\\overrightarrow{CC\'}=\\overrightarrow{AB}$.',
     '$' + vcol('\\overrightarrow{AB}', ev(AB[0]), ev(AB[1]), ev(AB[2])) + '$, donc $x_{C\'}={{cx}}+'
     + pa(AB[0]) + '$, $y_{C\'}={{cy}}+' + pa(AB[1]) + '$, $z_{C\'}={{cz}}+' + pa(AB[2]) + '$.',
     'Donc $' + col(pt('C\'', ev('cx+bx-ax'), ev('cy+by-ay'), ev('cz+bz-az'))) + '$.'],
    ['abs(bx-ax)+abs(by-ay)+abs(bz-az) > 0', 'abs(cx-ax)+abs(cy-ay)+abs(cz-az) > 0'])

V549_COMPOSEE = variation(
    'Dans l\'espace muni d\'un repère, on considère le point $' + pt('A', '{{ax}}', '{{ay}}', '{{az}}')
    + '$ et les vecteurs $' + vcol(U, '{{u1}}', '{{u2}}', '{{u3}}') + '$ et $' + vcol(V, '{{v1}}', '{{v2}}', '{{v3}}')
    + '$.\n\nLe point $M$ est l\'image de $A$ par la translation de vecteur $' + U + '$, puis $N$ est l\'image '
    'de $M$ par la translation de vecteur $' + V + '$. Donne les coordonnées de $N$.\n\n$N(?\\,;\\,?\\,;\\,?)$',
    [var('ax', '-5..5'), var('ay', '-5..5'), var('az', '-5..5'), var('u1', '-4..4'), var('u2', '-4..4'),
     var('u3', '-4..4'), var('v1', '-4..4'), var('v2', '-4..4'), var('v3', '-4..4')],
    [ev('ax+u1+v1'), ev('ay+u2+v2'), ev('az+u3+v3')],
    ['Enchaîner la translation de vecteur $' + U + '$ puis celle de vecteur $' + V + '$ revient à appliquer '
     'la translation de vecteur $' + U + '+' + V + '$ : $\\overrightarrow{AN}=\\overrightarrow{AM}'
     '+\\overrightarrow{MN}=' + U + '+' + V + '$.',
     '$' + vcol(U + '+' + V, ev('u1+v1'), ev('u2+v2'), ev('u3+v3')) + '$, donc $x_N={{ax}}+' + pa('u1+v1')
     + '$, $y_N={{ay}}+' + pa('u2+v2') + '$, $z_N={{az}}+' + pa('u3+v3') + '$.',
     'Donc $' + col(pt('N', ev('ax+u1+v1'), ev('ay+u2+v2'), ev('az+u3+v3'))) + '$.'],
    ['abs(u1)+abs(u2)+abs(u3) > 0', 'abs(v1)+abs(v2)+abs(v3) > 0',
     'abs(u1+v1)+abs(u2+v2)+abs(u3+v3) > 0'])

MODELES.append(modele(
    '1-translations', 'Espace : translations',
    'Image d\'un point par la translation qui transforme A en B, image par deux translations '
    'enchaînées (pièges : vecteur BA, M donné à la place de N, un seul vecteur ajouté)',
    VDP, 'Translations', 1, [V549_AB, V549_COMPOSEE],
    [spec('v0 : C\'(4 ; 1 ; -1)', 0, {'ax': 1, 'ay': -2, 'az': 3, 'bx': 3, 'by': 1, 'bz': 0, 'cx': 2,
                                      'cy': -2, 'cz': 2}, ['4', '1', '-1'], 'correct'),
     spec('v0 : vecteur BA (piège)', 0, {'ax': 1, 'ay': -2, 'az': 3, 'bx': 3, 'by': 1, 'bz': 0, 'cx': 2,
                                         'cy': -2, 'cz': 2}, ['0', '-5', '5'], 'incorrect'),
     spec('v0 : AB donné à la place de C\'', 0, {'ax': 1, 'ay': -2, 'az': 3, 'bx': 3, 'by': 1, 'bz': 0,
                                                 'cx': 2, 'cy': -2, 'cz': 2}, ['2', '3', '-3'], 'incorrect'),
     spec('v1 : N(3 ; 0 ; 2)', 1, {'ax': 1, 'ay': 2, 'az': -1, 'u1': 3, 'u2': -1, 'u3': 2, 'v1': -1,
                                   'v2': -1, 'v3': 1}, ['3', '0', '2'], 'correct'),
     spec('v1 : M donné à la place de N', 1, {'ax': 1, 'ay': 2, 'az': -1, 'u1': 3, 'u2': -1, 'u3': 2,
                                              'v1': -1, 'v2': -1, 'v3': 1}, ['4', '1', '1'], 'incorrect'),
     spec('v1 : u - v (piège)', 1, {'ax': 1, 'ay': 2, 'az': -1, 'u1': 3, 'u2': -1, 'u3': 2, 'v1': -1,
                                    'v2': -1, 'v3': 1}, ['5', '2', '0'], 'incorrect')]))

# --- 2. TSPE-555 : bilinéarité -------------------------------------------------------------------

DONNE_UV = 'Dans l\'espace, $' + U + '$, $' + V + '$ et $' + W + '$ sont trois vecteurs tels que '
V555_DROITE = variation(
    DONNE_UV + '$' + U + '\\cdot' + V + '={{p}}$ et $' + U + '\\cdot' + W + '={{q}}$.\n\nCalcule $' + U
    + '\\cdot\\left(' + coef('a', V) + terme('b', W) + '\\right)$.\n\n$' + U + '\\cdot\\left(' + coef('a', V)
    + terme('b', W) + '\\right)=?$',
    [var('a', '2..4;±'), var('b', '1..3;±'), var('p', '1..6;±'), var('q', '1..6;±')], [ev('a*p+b*q')],
    ['Le produit scalaire est **bilinéaire** : $' + U + '\\cdot\\left(a' + V + '+b' + W + '\\right)=a\\,(' + U
     + '\\cdot' + V + ')+b\\,(' + U + '\\cdot' + W + ')$.',
     '$' + U + '\\cdot\\left(' + coef('a', V) + terme('b', W) + '\\right)={{a}}\\times' + pa('p')
     + '+' + pa('b') + '\\times' + pa('q') + '=' + col(ev('a*p+b*q')) + '$'])

V555_SCAL = variation(
    'Dans l\'espace, $' + U + '$ et $' + V + '$ sont deux vecteurs tels que $' + U + '\\cdot' + V
    + '={{p}}$.\n\nCalcule $\\left({{a}}' + U + '\\right)\\cdot\\left({{b}}' + V + '\\right)$.\n\n'
    '$\\left({{a}}' + U + '\\right)\\cdot\\left({{b}}' + V + '\\right)=?$',
    [var('a', '2..5;±'), var('b', '2..5;±'), var('p', '1..6;±')], [ev('a*b*p')],
    ['Par **bilinéarité**, les coefficients sortent du produit scalaire : $\\left(a' + U + '\\right)\\cdot'
     '\\left(b' + V + '\\right)=ab\\,(' + U + '\\cdot' + V + ')$.',
     '$\\left({{a}}' + U + '\\right)\\cdot\\left({{b}}' + V + '\\right)={{a}}\\times' + pa('b') + '\\times'
     + pa('p') + '=' + col(ev('a*b*p')) + '$'])

V555_GAUCHE = variation(
    DONNE_UV + '$' + U + '\\cdot' + W + '={{p}}$ et $' + V + '\\cdot' + W + '={{q}}$.\n\nCalcule $\\left('
    + coef('a', U) + terme('b', V) + '\\right)\\cdot' + W + '$.\n\n$\\left(' + coef('a', U) + terme('b', V)
    + '\\right)\\cdot' + W + '=?$',
    [var('a', '2..4;±'), var('b', '1..3;±'), var('p', '1..6;±'), var('q', '1..6;±')], [ev('a*p+b*q')],
    ['Le produit scalaire est **bilinéaire** : $\\left(a' + U + '+b' + V + '\\right)\\cdot' + W + '=a\\,('
     + U + '\\cdot' + W + ')+b\\,(' + V + '\\cdot' + W + ')$.',
     '$\\left(' + coef('a', U) + terme('b', V) + '\\right)\\cdot' + W + '={{a}}\\times' + pa('p') + '+'
     + pa('b') + '\\times' + pa('q') + '=' + col(ev('a*p+b*q')) + '$'])

MODELES.append(modele(
    '2-bilinearite', 'Espace : bilinéarité du produit scalaire',
    'Produit scalaire d\'une combinaison linéaire, à droite et à gauche, et de deux vecteurs multipliés '
    'par des réels (pièges : coefficient oublié, coefficients additionnés)',
    ORTHO, 'Produit scalaire', 3, [V555_DROITE, V555_SCAL, V555_GAUCHE],
    [spec('v0 : 2×3 + (-1)×4 = 2', 0, {'a': 2, 'b': -1, 'p': 3, 'q': 4}, '2', 'correct'),
     spec('v0 : b oublié', 0, {'a': 2, 'b': -1, 'p': 3, 'q': 4}, '10', 'incorrect'),
     spec('v0 : coefficients oubliés', 0, {'a': 2, 'b': -1, 'p': 3, 'q': 4}, '7', 'incorrect'),
     spec('v1 : 3×(-2)×5 = -30', 1, {'a': 3, 'b': -2, 'p': 5}, '-30', 'correct'),
     spec('v1 : coefficients additionnés', 1, {'a': 3, 'b': -2, 'p': 5}, '5', 'incorrect'),
     spec('v1 : un seul coefficient', 1, {'a': 3, 'b': -2, 'p': 5}, '15', 'incorrect'),
     spec('v2 : -3×2 + 2×(-5) = -16', 2, {'a': -3, 'b': 2, 'p': 2, 'q': -5}, '-16', 'correct'),
     spec('v2 : a oublié', 2, {'a': -3, 'b': 2, 'p': 2, 'q': -5}, '-8', 'incorrect')]))

# --- 3. TSPE-556 : symétrie ----------------------------------------------------------------------

V556_DIFF = variation(
    'Dans l\'espace, $' + U + '$ et $' + V + '$ sont deux vecteurs tels que $' + n(U) + '={{a}}$ et $' + n(V)
    + '={{b}}$.\n\nCalcule $\\left(' + U + '+' + V + '\\right)\\cdot\\left(' + U + '-' + V + '\\right)$.\n\n'
    '$\\left(' + U + '+' + V + '\\right)\\cdot\\left(' + U + '-' + V + '\\right)=?$',
    [var('a', '1..9'), var('b', '1..9')], [ev('a^2-b^2')],
    ['On développe : $\\left(' + U + '+' + V + '\\right)\\cdot\\left(' + U + '-' + V + '\\right)=' + U
     + '\\cdot' + U + '-' + U + '\\cdot' + V + '+' + V + '\\cdot' + U + '-' + V + '\\cdot' + V + '$.',
     'Le produit scalaire est **symétrique** : $' + V + '\\cdot' + U + '=' + U + '\\cdot' + V + '$, donc les '
     'deux termes du milieu s\'annulent, et $' + U + '\\cdot' + U + '=' + n(U) + '^2$.',
     '$\\left(' + U + '+' + V + '\\right)\\cdot\\left(' + U + '-' + V + '\\right)=' + n(U) + '^2-' + n(V)
     + '^2={{a}}^2-{{b}}^2=' + col(ev('a^2-b^2')) + '$'],
    ['a != b'])

V556_SCAL = variation(
    'Dans l\'espace, $' + U + '$ et $' + V + '$ sont deux vecteurs tels que $' + U + '\\cdot' + V
    + '={{p}}$.\n\nCalcule $' + V + '\\cdot\\left({{k}}' + U + '\\right)$.\n\n$' + V + '\\cdot\\left({{k}}'
    + U + '\\right)=?$',
    [var('k', '2..6;±'), var('p', '1..9;±')], [ev('k*p')],
    ['Le coefficient sort du produit scalaire : $' + V + '\\cdot\\left({{k}}' + U + '\\right)={{k}}\\,(' + V
     + '\\cdot' + U + ')$.',
     'Le produit scalaire est **symétrique** : $' + V + '\\cdot' + U + '=' + U + '\\cdot' + V + '={{p}}$.',
     '$' + V + '\\cdot\\left({{k}}' + U + '\\right)={{k}}\\times' + pa('p') + '=' + col(ev('k*p')) + '$'])

MODELES.append(modele(
    '3-symetrie', 'Espace : symétrie du produit scalaire',
    '(u + v)·(u − v) = ‖u‖² − ‖v‖² (les termes u·v et v·u s\'annulent par symétrie), v·(ku) connaissant '
    'u·v (pièges : normes non élevées au carré, signe, coefficient oublié)',
    ORTHO, 'Produit scalaire', 4, [V556_DIFF, V556_SCAL],
    [spec('v0 : 5² - 3² = 16', 0, {'a': 5, 'b': 3}, '16', 'correct'),
     spec('v0 : a - b (piège)', 0, {'a': 5, 'b': 3}, '2', 'incorrect'),
     spec('v0 : a² + b² (piège)', 0, {'a': 5, 'b': 3}, '34', 'incorrect'),
     spec('v0 : 2² - 7² = -45', 0, {'a': 2, 'b': 7}, '-45', 'correct'),
     spec('v1 : -3 × 4 = -12', 1, {'k': -3, 'p': 4}, '-12', 'correct'),
     spec('v1 : coefficient oublié', 1, {'k': -3, 'p': 4}, '4', 'incorrect'),
     spec('v1 : signe changé (piège)', 1, {'k': -3, 'p': 4}, '12', 'incorrect')]))

# --- 4. TSPE-347 : ‖u + v‖² ----------------------------------------------------------------------

DONNE_N = ('Dans l\'espace, $' + U + '$ et $' + V + '$ sont deux vecteurs tels que $' + n(U) + '={{a}}$, $'
           + n(V) + '={{b}}$ et $' + U + '\\cdot' + V + '={{p}}$.\n\n')
VARS_N = [var('a', '1..6'), var('b', '1..6'), var('p', '-12..12')]
DEV_PLUS = ('$' + n(U + '+' + V) + '^2=\\left(' + U + '+' + V + '\\right)\\cdot\\left(' + U + '+' + V
            + '\\right)=' + n(U) + '^2+2\\,' + U + '\\cdot' + V + '+' + n(V) + '^2$.')
V347_PLUS = variation(
    DONNE_N + 'Calcule $' + n(U + '+' + V) + '^2$.\n\n$' + n(U + '+' + V) + '^2=?$', VARS_N,
    [ev('a^2+2*p+b^2')],
    [DEV_PLUS,
     '$' + n(U + '+' + V) + '^2={{a}}^2+2\\times' + pa('p') + '+{{b}}^2=' + col(ev('a^2+2*p+b^2')) + '$'],
    ['abs(p) < a*b'])
V347_MOINS = variation(
    DONNE_N + 'Calcule $' + n(U + '-' + V) + '^2$.\n\n$' + n(U + '-' + V) + '^2=?$', VARS_N,
    [ev('a^2-2*p+b^2')],
    ['$' + n(U + '-' + V) + '^2=\\left(' + U + '-' + V + '\\right)\\cdot\\left(' + U + '-' + V + '\\right)='
     + n(U) + '^2-2\\,' + U + '\\cdot' + V + '+' + n(V) + '^2$.',
     '$' + n(U + '-' + V) + '^2={{a}}^2-2\\times' + pa('p') + '+{{b}}^2=' + col(ev('a^2-2*p+b^2')) + '$'],
    ['abs(p) < a*b'])
V347_NORME = variation(
    DONNE_N + 'Calcule $' + n(U + '+' + V) + '$ (valeur exacte).\n\n$' + n(U + '+' + V) + '=?$', VARS_N,
    [ev('sqrt(a^2+2*p+b^2)')],
    [DEV_PLUS,
     '$' + n(U + '+' + V) + '^2={{a}}^2+2\\times' + pa('p') + '+{{b}}^2=' + ev('a^2+2*p+b^2') + '$.',
     'Une norme est positive : $' + n(U + '+' + V) + '=\\sqrt{' + ev('a^2+2*p+b^2') + '}='
     + col(ev('sqrt(a^2+2*p+b^2)')) + '$'],
    ['abs(p) < a*b'])

MODELES.append(modele(
    '4-developper-norme-somme', 'Espace : développer ‖u + v‖²',
    '‖u + v‖², ‖u − v‖² et ‖u + v‖ connaissant ‖u‖, ‖v‖ et u·v ; données possibles (|u·v| < ‖u‖‖v‖) '
    '(pièges : facteur 2 oublié, double produit oublié, racine oubliée)',
    ORTHO, 'Produit scalaire', 5, [V347_PLUS, V347_MOINS, V347_NORME],
    [spec('v0 : 9 + 2×(-2) + 16 = 21', 0, {'a': 3, 'b': 4, 'p': -2}, '21', 'correct'),
     spec('v0 : facteur 2 oublié', 0, {'a': 3, 'b': 4, 'p': -2}, '23', 'incorrect'),
     spec('v0 : double produit oublié', 0, {'a': 3, 'b': 4, 'p': -2}, '25', 'incorrect'),
     spec('v1 : 9 - 2×(-2) + 16 = 29', 1, {'a': 3, 'b': 4, 'p': -2}, '29', 'correct'),
     spec('v1 : signe du double produit', 1, {'a': 3, 'b': 4, 'p': -2}, '21', 'incorrect'),
     spec('v2 : √21', 2, {'a': 3, 'b': 4, 'p': -2}, '\\sqrt{21}', 'correct'),
     spec('v2 : racine oubliée', 2, {'a': 3, 'b': 4, 'p': -2}, '21', 'incorrect'),
     spec('v2 : 4 + 2×2 + 4 = 12 → 2√3', 2, {'a': 2, 'b': 2, 'p': 2}, '2\\sqrt{3}', 'correct')]))

# --- 5. TSPE-344 : base orthonormée ? ------------------------------------------------------------
# Deux familles orthonormées de vecteurs à coordonnées rationnelles ; le cas s :
#   0 orthonormée ; 1 orthogonale mais pas normée (vecteurs ×3 ou ×5) ; 2 normée mais pas orthogonale.

F = Fraction
FAMILLES = [
    [(F(1, 3), F(2, 3), F(2, 3)), (F(2, 3), F(1, 3), F(-2, 3)), (F(2, 3), F(-2, 3), F(1, 3))],
    [(F(3, 5), F(4, 5), F(0)), (F(-4, 5), F(3, 5), F(0)), (F(0), F(0), F(1))],
]


def cas_344(k, s):
    """Trois vecteurs du cas (famille k // 2, signe de w selon k % 2, cas s)."""
    fam = [list(x) for x in FAMILLES[k // 2]]
    if k % 2:
        fam[2] = [-c for c in fam[2]]
    if s == 1:  # orthogonale, pas normée : on multiplie le 2e vecteur
        m = 3 if k // 2 == 0 else 5
        fam[1] = [c * m for c in fam[1]]
    if s == 2:  # normée, pas orthogonale : on échange deux coordonnées du 2e vecteur
        fam[1] = [fam[1][1], fam[1][0], fam[1][2]]
        if fam[1] == [c for c in fam[0]] or sum(a * b for a, b in zip(fam[0], fam[1])) == 0:
            fam[1] = [-fam[1][0], fam[1][1], fam[1][2]]
    return fam


def tex(c):
    if c.denominator == 1:
        return str(c.numerator)
    signe = '-' if c < 0 else ''
    return signe + '\\dfrac{' + str(abs(c.numerator)) + '}{' + str(c.denominator) + '}'


def ps(x, y):
    return sum(a * b for a, b in zip(x, y))


def par2(fn):
    """Un texte par couple (k, s), en ifs à plat."""
    return ''.join('{{if:k==' + str(k) + ' && s==' + str(s) + '|' + fn(k, s) + '}}'
                   for k in range(4) for s in range(3))


NOMS = [U, V, W]


def enonce_344(k, s):
    f = cas_344(k, s)
    return ',\\quad '.join(vcol(NOMS[i], *(tex(c) for c in f[i])) for i in range(3))


def produits_344(k, s):
    f = cas_344(k, s)
    paires = [(0, 1), (0, 2), (1, 2)]
    return ' ; '.join('$' + NOMS[i] + '\\cdot' + NOMS[j] + '=' + tex(ps(f[i], f[j])) + '$' for i, j in paires)


def normes_344(k, s):
    f = cas_344(k, s)
    return ' ; '.join('$' + n(NOMS[i]) + '^2=' + tex(ps(f[i], f[i])) + '$' for i in range(3))


CONCL_344 = ['les trois vecteurs sont orthogonaux deux à deux et de norme $1$ : la base est orthonormée',
             'les vecteurs sont orthogonaux deux à deux, mais $' + n(NOMS[1]) + '\\neq 1$ : la base n\'est pas '
             'orthonormée',
             'les vecteurs sont de norme $1$, mais $' + NOMS[0] + '\\cdot' + NOMS[1] + '\\neq 0$ : la base '
             'n\'est pas orthonormée']

# Vérification, à l'écriture, que chaque cas est bien ce qu'il dit
for k in range(4):
    for s in range(3):
        f = cas_344(k, s)
        orth = all(ps(f[i], f[j]) == 0 for i, j in [(0, 1), (0, 2), (1, 2)])
        norm = all(ps(f[i], f[i]) == 1 for i in range(3))
        assert (orth, norm) == [(True, True), (True, False), (False, True)][s], (k, s, f)

V344 = variation(
    RON + ', on considère les vecteurs\n\n$$' + par2(enonce_344)
    + '$$\n\nLa base $(' + U + ',' + V + ',' + W + ')$ est-elle orthonormée ?\n\n'
    + choix('Oui, elle est orthonormée.',
            'Non : les vecteurs sont orthogonaux deux à deux, mais pas tous de norme $1$.',
            'Non : les vecteurs sont de norme $1$, mais pas orthogonaux deux à deux.'),
    [var('k', '0..3'), var('s', '0..2')], ['{{s}}'],
    ['Une base est **orthonormée** quand ses trois vecteurs sont orthogonaux deux à deux (produits scalaires '
     'nuls) **et** de norme $1$.',
     'Produits scalaires, en repère orthonormé ($xx\'+yy\'+zz\'$) : ' + par2(produits_344) + '.',
     'Normes au carré ($x^2+y^2+z^2$) : ' + par2(normes_344) + '.',
     'Conclusion : ' + par2(lambda k, s: '$' + col('\\text{' + ['oui', 'non', 'non'][s] + '}') + '$, '
                            + CONCL_344[s]) + '.'])

MODELES.append(modele(
    '5-base-orthonormee', 'Espace : la base est-elle orthonormée ?',
    'Trois vecteurs à coordonnées fractionnaires : orthogonaux deux à deux et de norme 1 ? (pièges : base '
    'orthogonale mais pas normée, vecteurs normés mais pas orthogonaux)',
    ORTHO, 'Base orthonormée', 1, [V344],
    [spec('v0 : orthonormée', 0, {'k': 0, 's': 0}, '0', 'correct'),
     spec('v0 : orthogonale non normée, répondu « oui » (piège)', 0, {'k': 0, 's': 1}, '0', 'incorrect'),
     spec('v0 : orthogonale non normée', 0, {'k': 1, 's': 1}, '1', 'correct'),
     spec('v0 : normée non orthogonale', 0, {'k': 2, 's': 2}, '2', 'correct'),
     spec('v0 : normée non orthogonale, répondu « oui »', 0, {'k': 3, 's': 2}, '0', 'incorrect')],
    delay=150))

# --- 6. TSPE-355 : longueur par le produit scalaire ----------------------------------------------

AB_, AD_, AE_, AG_ = ('\\overrightarrow{AB}', '\\overrightarrow{AD}', '\\overrightarrow{AE}',
                      '\\overrightarrow{AG}')
V355_PAVE = variation(
    '$ABCDEFGH$ est un pavé droit : $ABCD$ et $EFGH$ sont deux faces opposées, $[AE]$, $[BF]$, $[CG]$, $[DH]$ '
    'des arêtes. On donne $AB={{a}}$, $AD={{b}}$ et $AE={{c}}$, et on admet que $' + AG_ + '=' + AB_ + '+' + AD_
    + '+' + AE_ + '$.\n\nCalcule la longueur $AG$ (valeur exacte).\n\n$AG=?$',
    [var('a', '1..6'), var('b', '1..6'), var('c', '1..6')], [ev('sqrt(a^2+b^2+c^2)')],
    ['$AG^2=' + AG_ + '\\cdot' + AG_ + '=\\left(' + AB_ + '+' + AD_ + '+' + AE_ + '\\right)\\cdot\\left(' + AB_
     + '+' + AD_ + '+' + AE_ + '\\right)$. En développant : $AG^2=AB^2+AD^2+AE^2+2\\left(' + AB_ + '\\cdot' + AD_
     + '+' + AB_ + '\\cdot' + AE_ + '+' + AD_ + '\\cdot' + AE_ + '\\right)$.',
     'Les arêtes $[AB]$, $[AD]$, $[AE]$ d\'un pavé droit sont deux à deux perpendiculaires : les trois produits '
     'scalaires sont nuls.',
     '$AG^2={{a}}^2+{{b}}^2+{{c}}^2=' + ev('a^2+b^2+c^2') + '$, donc $AG=\\sqrt{' + ev('a^2+b^2+c^2') + '}='
     + col(ev('sqrt(a^2+b^2+c^2)')) + '$'],
    ['a <= b', 'b <= c'])

OA_, OB_ = '\\overrightarrow{OA}', '\\overrightarrow{OB}'
V355_TRI = variation(
    'Dans l\'espace, $O$, $A$ et $B$ sont trois points tels que $OA={{a}}$, $OB={{b}}$ et $' + OA_ + '\\cdot'
    + OB_ + '={{p}}$.\n\nCalcule la longueur $AB$ (valeur exacte).\n\n$AB=?$',
    [var('a', '1..6'), var('b', '1..6'), var('p', '-12..12')], [ev('sqrt(a^2-2*p+b^2)')],
    ['$\\overrightarrow{AB}=' + OB_ + '-' + OA_ + '$, donc $AB^2=\\left(' + OB_ + '-' + OA_ + '\\right)\\cdot'
     '\\left(' + OB_ + '-' + OA_ + '\\right)=OB^2-2\\,' + OA_ + '\\cdot' + OB_ + '+OA^2$.',
     '$AB^2={{b}}^2-2\\times' + pa('p') + '+{{a}}^2=' + ev('a^2-2*p+b^2') + '$.',
     'Une longueur est positive : $AB=\\sqrt{' + ev('a^2-2*p+b^2') + '}=' + col(ev('sqrt(a^2-2*p+b^2)')) + '$'],
    ['abs(p) < a*b'])

MODELES.append(modele(
    '6-longueur-produit-scalaire', 'Espace : calculer une longueur avec le produit scalaire',
    'Diagonale d\'un pavé droit par AG = AB + AD + AE, longueur AB connaissant OA, OB et OA·OB (pièges : '
    'racine oubliée, double produit oublié ou de mauvais signe)',
    ORTHO, 'Norme et distance', 3, [V355_PAVE, V355_TRI],
    [spec('v0 : √(4 + 9 + 36) = 7', 0, {'a': 2, 'b': 3, 'c': 6}, '7', 'correct'),
     spec('v0 : AG² donné', 0, {'a': 2, 'b': 3, 'c': 6}, '49', 'incorrect'),
     spec('v0 : somme des arêtes', 0, {'a': 2, 'b': 3, 'c': 6}, '11', 'incorrect'),
     spec('v0 : √14', 0, {'a': 1, 'b': 2, 'c': 3}, '\\sqrt{14}', 'correct'),
     spec('v1 : 9 - 2×2 + 16 = 21', 1, {'a': 3, 'b': 4, 'p': 2}, '\\sqrt{21}', 'correct'),
     spec('v1 : double produit oublié', 1, {'a': 3, 'b': 4, 'p': 2}, '5', 'incorrect'),
     spec('v1 : signe du double produit', 1, {'a': 3, 'b': 4, 'p': 2}, '\\sqrt{29}', 'incorrect')]))

# --- 7. TSPE-356 : distance d'un point à une droite ----------------------------------------------
# Construction de eae25eba : H = A + s·u, M = H + w avec w orthogonal à u.

VARS_PROJ = [var('ax', '-3..3'), var('ay', '-3..3'), var('az', '-3..3'), var('u1', '1..3;±'), var('u2', '-2..2'),
             var('u3', '-2..2'), var('s', '1..2;±'), var('r', '1..2;±'), var('sel', '0..1'),
             var('w1', '{{eval:r*(1-sel)*u2}}'), var('w2', '{{eval:r*((sel-1)*u1+sel*u3)}}'),
             var('w3', '{{eval:-r*sel*u2}}'), var('hx', '{{eval:ax+s*u1}}'), var('hy', '{{eval:ay+s*u2}}'),
             var('hz', '{{eval:az+s*u3}}'), var('mx', '{{eval:hx+w1}}'), var('my', '{{eval:hy+w2}}'),
             var('mz', '{{eval:hz+w3}}')]
COND_PROJ = ['abs(w1)+abs(w2)+abs(w3) > 0']
UD = vcol(U, '{{u1}}', '{{u2}}', '{{u3}}')
V356 = variation(
    RON + ', on considère la droite $d$ passant par $' + pt('A', '{{ax}}', '{{ay}}', '{{az}}') + '$ et de '
    'vecteur directeur $' + UD + '$, et le point $' + pt('M', '{{mx}}', '{{my}}', '{{mz}}') + '$.\n\nCalcule '
    'la distance du point $M$ à la droite $d$ (valeur exacte).\n\nDistance : $?$',
    VARS_PROJ, [ev('sqrt(w1^2+w2^2+w3^2)')],
    ['La distance de $M$ à $d$ est la distance $MH$, où $H$ est le **projeté orthogonal** de $M$ sur $d$ : '
     '$H=A+t' + U + '$ pour un réel $t$, avec $\\overrightarrow{HM}\\cdot' + U + '=0$.',
     '$\\overrightarrow{HM}=\\overrightarrow{AM}-t' + U + '$, donc la condition s\'écrit $\\overrightarrow{AM}'
     '\\cdot' + U + '-t' + n(U) + '^2=0$ ; ici $\\overrightarrow{AM}\\cdot' + U + '='
     + ev('(mx-ax)*u1+(my-ay)*u2+(mz-az)*u3') + '$ et $' + n(U) + '^2=' + ev('u1^2+u2^2+u3^2') + '$, donc '
     '$t={{s}}$ et $' + pt('H', '{{hx}}', '{{hy}}', '{{hz}}') + '$.',
     '$' + vcol('\\overrightarrow{HM}', '{{w1}}', '{{w2}}', '{{w3}}') + '$, donc $MH=\\sqrt{' + pa('w1') + '^2+'
     + pa('w2') + '^2+' + pa('w3') + '^2}=' + col(ev('sqrt(w1^2+w2^2+w3^2)')) + '$'],
    COND_PROJ)

ESSAI = {'ax': 1, 'ay': 0, 'az': -1, 'u1': 1, 'u2': 2, 'u3': -1, 's': 1, 'r': 1, 'sel': 0}
# w = (2, -1, 0), H(2 ; 2 ; -2), M(4 ; 1 ; -2) ; AM = (3, 1, -1), ‖AM‖ = √11 ; MH = √5
MODELES.append(modele(
    '7-distance-point-droite', 'Espace : distance d\'un point à une droite',
    'Distance de M à une droite (point, vecteur directeur) par le projeté orthogonal H = A + t u (pièges : '
    'distance AM, carré de la distance)',
    ORTHO, 'Projeté orthogonal', 5, [V356],
    [spec('v0 : √5', 0, ESSAI, '\\sqrt{5}', 'correct'),
     spec('v0 : distance AM (piège)', 0, ESSAI, '\\sqrt{11}', 'incorrect'),
     spec('v0 : MH² donné', 0, ESSAI, '5', 'incorrect')],
    delay=240))

# --- 8. TSPE-625 : aire et volume en repère ------------------------------------------------------

V625_AIRE = variation(
    RON + ', on considère les points $' + pt('A', '{{ax}}', '{{ay}}', '{{az}}') + '$, $'
    + pt('B', ev('ax+u1'), ev('ay+u2'), ev('az+u3')) + '$ et $' + pt('C', ev('ax+w1'), ev('ay+w2'), ev('az+w3'))
    + '$.\n\nMontre que le triangle $ABC$ est rectangle en $A$, puis calcule son aire (valeur exacte).\n\n'
    'Aire : $?$',
    [var('ax', '-3..3'), var('ay', '-3..3'), var('az', '-3..3'), var('u1', '1..3;±'), var('u2', '-2..2'),
     var('u3', '-2..2'), var('r', '1..2;±'), var('sel', '0..1'), var('w1', '{{eval:r*(1-sel)*u2}}'),
     var('w2', '{{eval:r*((sel-1)*u1+sel*u3)}}'), var('w3', '{{eval:-r*sel*u2}}')],
    [ev('sqrt((u1^2+u2^2+u3^2)*(w1^2+w2^2+w3^2))/2')],
    ['$' + vcol(AB_, '{{u1}}', '{{u2}}', '{{u3}}') + '$ et $' + vcol('\\overrightarrow{AC}', '{{w1}}', '{{w2}}',
                                                                      '{{w3}}') + '$.',
     '$' + AB_ + '\\cdot\\overrightarrow{AC}={{u1}}\\times' + pa('w1') + '+' + pa('u2') + '\\times' + pa('w2')
     + '+' + pa('u3') + '\\times' + pa('w3') + '=0$ : les vecteurs sont orthogonaux, le triangle est rectangle '
     'en $A$.',
     '$AB=\\sqrt{' + ev('u1^2+u2^2+u3^2') + '}$ et $AC=\\sqrt{' + ev('w1^2+w2^2+w3^2') + '}$, donc l\'aire vaut '
     '$\\dfrac{AB\\times AC}{2}=\\dfrac{\\sqrt{' + ev('(u1^2+u2^2+u3^2)*(w1^2+w2^2+w3^2)') + '}}{2}='
     + col(ev('sqrt((u1^2+u2^2+u3^2)*(w1^2+w2^2+w3^2))/2')) + '$'],
    ['abs(w1)+abs(w2)+abs(w3) > 0'])

V625_VOLUME = variation(
    RON + ', on considère les points $' + pt('D', '{{dx}}', '{{dy}}', '{{dz}}') + '$, $'
    + pt('A', ev('dx+a'), '{{dy}}', '{{dz}}') + '$, $' + pt('B', '{{dx}}', ev('dy+b'), '{{dz}}') + '$ et $'
    + pt('C', '{{dx}}', '{{dy}}', ev('dz+c')) + '$.\n\nCalcule le volume du tétraèdre $DABC$.\n\nVolume : $?$',
    [var('dx', '-3..3'), var('dy', '-3..3'), var('dz', '-3..3'), var('a', '1..6'), var('b', '1..6'),
     var('c', '1..6')], [ev('a*b*c/6')],
    ['$' + vcol('\\overrightarrow{DA}', '{{a}}', '0', '0') + '$, $' + vcol('\\overrightarrow{DB}', '0', '{{b}}', '0')
     + '$, $' + vcol('\\overrightarrow{DC}', '0', '0', '{{c}}') + '$ : leurs produits scalaires deux à deux sont '
     'nuls, ces trois vecteurs sont orthogonaux deux à deux.',
     'Le triangle $DAB$ est rectangle en $D$, d\'aire $\\dfrac{DA\\times DB}{2}=\\dfrac{{{a}}\\times{{b}}}{2}$ ; '
     'la droite $(DC)$ est orthogonale à deux droites sécantes du plan $(DAB)$, donc à ce plan : $DC={{c}}$ est '
     'la hauteur.',
     '$V=\\dfrac{1}{3}\\times\\text{aire de la base}\\times\\text{hauteur}=\\dfrac{1}{3}\\times'
     '\\dfrac{{{a}}\\times{{b}}}{2}\\times{{c}}=' + col(ev('a*b*c/6')) + '$'])

MODELES.append(modele(
    '8-aire-volume-repere', 'Espace : aire et volume en repère',
    'Aire d\'un triangle rectangle (orthogonalité vérifiée par le produit scalaire), volume d\'un tétraèdre '
    'trirectangle (pièges : division par 2 oubliée, 1/3 oublié)',
    ORTHO, 'Grandeurs', 1, [V625_AIRE, V625_VOLUME],
    [spec('v0 : √6 × √5 / 2 = √30/2', 0, {'ax': 1, 'ay': 0, 'az': -1, 'u1': 1, 'u2': 2, 'u3': -1, 'r': 1,
                                           'sel': 0}, '\\frac{\\sqrt{30}}{2}', 'correct'),
     spec('v0 : division par 2 oubliée', 0, {'ax': 1, 'ay': 0, 'az': -1, 'u1': 1, 'u2': 2, 'u3': -1, 'r': 1,
                                             'sel': 0}, '\\sqrt{30}', 'incorrect'),
     spec('v1 : 2×3×4/6 = 4', 1, {'dx': 1, 'dy': -1, 'dz': 0, 'a': 2, 'b': 3, 'c': 4}, '4', 'correct'),
     spec('v1 : 1/3 oublié', 1, {'dx': 1, 'dy': -1, 'dz': 0, 'a': 2, 'b': 3, 'c': 4}, '12', 'incorrect'),
     spec('v1 : produit seul', 1, {'dx': 1, 'dy': -1, 'dz': 0, 'a': 2, 'b': 3, 'c': 4}, '24', 'incorrect'),
     spec('v1 : 1×1×5/6', 1, {'dx': 0, 'dy': 0, 'dz': 0, 'a': 1, 'b': 1, 'c': 5}, '\\frac{5}{6}', 'correct')],
    delay=180))

# --- 9. TSPE-357 : deux droites orthogonales ? ---------------------------------------------------
# u directeur de la première, w orthogonal à u (construction de eae25eba), puis w1 + o : o = 1 casse
# l'orthogonalité (le produit scalaire change de u1 ≠ 0).

VARS_ORTH = [var('u1', '1..3;±'), var('u2', '-2..2'), var('u3', '-2..2'), var('r', '1..2;±'), var('sel', '0..1'),
             var('o', '0..1'), var('w1', '{{eval:r*(1-sel)*u2+o}}'), var('w2', '{{eval:r*((sel-1)*u1+sel*u3)}}'),
             var('w3', '{{eval:-r*sel*u2}}')]
COND_ORTH = ['abs(w1)+abs(w2)+abs(w3) > 0']
CHOIX_ORTH = choix('Oui, elles sont orthogonales.', 'Non, elles ne sont pas orthogonales.')
PS_ORTH = ('{{u1}}\\times' + pa('w1') + '+' + pa('u2') + '\\times' + pa('w2') + '+' + pa('u3') + '\\times'
           + pa('w3') + '=' + ev('u1*w1+u2*w2+u3*w3'))
FIN_ORTH = ('{{if:o==0|Le produit scalaire est nul : $' + col('\\text{les droites sont orthogonales}')
            + '$ (orthogonales ne veut pas dire sécantes : dans l\'espace, deux droites orthogonales peuvent ne '
            'pas se couper).}}{{if:o==1|Le produit scalaire n\'est pas nul : $'
            + col('\\text{les droites ne sont pas orthogonales}') + '$.}}')

V357_POINTS = variation(
    RON + ', on considère les points $' + pt('A', '{{ax}}', '{{ay}}', '{{az}}') + '$, $'
    + pt('B', ev('ax+u1'), ev('ay+u2'), ev('az+u3')) + '$, $' + pt('C', '{{cx}}', '{{cy}}', '{{cz}}') + '$ et $'
    + pt('D', ev('cx+w1'), ev('cy+w2'), ev('cz+w3')) + '$.\n\nLes droites $(AB)$ et $(CD)$ sont-elles '
    'orthogonales ?\n\n' + CHOIX_ORTH,
    [var('ax', '-3..3'), var('ay', '-3..3'), var('az', '-3..3'), var('cx', '-3..3'), var('cy', '-3..3'),
     var('cz', '-3..3')] + VARS_ORTH, ['{{o}}'],
    ['Deux droites sont orthogonales si et seulement si leurs vecteurs directeurs sont orthogonaux.',
     '$' + vcol(AB_, '{{u1}}', '{{u2}}', '{{u3}}') + '$ et $' + vcol('\\overrightarrow{CD}', '{{w1}}', '{{w2}}',
                                                                      '{{w3}}') + '$ : $' + AB_
     + '\\cdot\\overrightarrow{CD}=' + PS_ORTH + '$.',
     FIN_ORTH],
    COND_ORTH)


V357_PARAM = variation(
    RON + ', on considère les droites $d$ et $d\'$ de représentations paramétriques\n\n$$d : \\begin{cases} x='
    '{{ax}}' + terme('u1', 't') + '\\\\ y={{ay}}' + terme('u2', 't') + '\\\\ z={{az}}' + terme('u3', 't')
    + '\\end{cases},\\ t\\in\\mathbb{R}$$\n\n$$d\' : \\begin{cases} x={{cx}}' + terme('w1', 's') + '\\\\ y={{cy}}'
    + terme('w2', 's') + '\\\\ z={{cz}}' + terme('w3', 's') + '\\end{cases},\\ s\\in\\mathbb{R}$$\n\n'
    'Les droites $d$ et $d\'$ sont-elles orthogonales ?\n\n' + CHOIX_ORTH,
    [var('ax', '1..3;±'), var('ay', '1..3;±'), var('az', '1..3;±'), var('cx', '1..3;±'), var('cy', '1..3;±'),
     var('cz', '1..3;±')] + VARS_ORTH, ['{{o}}'],
    ['Deux droites sont orthogonales si et seulement si leurs vecteurs directeurs sont orthogonaux.',
     'On lit les coefficients de $t$ et de $s$ : $' + UD + '$ dirige $d$, $' + vcol(V, '{{w1}}', '{{w2}}', '{{w3}}')
     + '$ dirige $d\'$ ; $' + U + '\\cdot' + V + '=' + PS_ORTH + '$.',
     FIN_ORTH],
    COND_ORTH)

ESSAI9 = {'ax': 1, 'ay': 0, 'az': -1, 'cx': 2, 'cy': 1, 'cz': 0, 'u1': 1, 'u2': 2, 'u3': -1, 'r': 1, 'sel': 0}
MODELES.append(modele(
    '9-droites-orthogonales', 'Espace : deux droites orthogonales ?',
    'Décider si deux droites (par deux points chacune, ou par représentation paramétrique) sont orthogonales, '
    'par le produit scalaire de leurs vecteurs directeurs (orthogonales n\'est pas sécantes)',
    ORTHO, 'Orthogonalité', 1, [V357_POINTS, V357_PARAM],
    [spec('v0 : orthogonales', 0, dict(ESSAI9, o=0), '0', 'correct'),
     spec('v0 : orthogonales, répondu « non »', 0, dict(ESSAI9, o=0), '1', 'incorrect'),
     spec('v0 : non orthogonales', 0, dict(ESSAI9, o=1), '1', 'correct'),
     spec('v1 : orthogonales', 1, dict(ESSAI9, o=0, sel=1), '0', 'correct'),
     spec('v1 : non orthogonales, répondu « oui »', 1, dict(ESSAI9, o=1), '0', 'incorrect')]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True, stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
