"""Écrit les 4 modèles du lot 9 « approfondissements : barycentres et Leibniz » de la terminale
spé dans scripts/questions/tspe-approfondissements-9/.

Phase 0 validée par David le 2026-11-13 (D3 du journal
« docs/wip/questions-tspe-demonstrations-progress.md », § 35), un point par modèle :

| # | Point    | Titre                                                   | Niv. | Nœud du modèle                                  |
| 1 | TSPE-340 | Barycentre de trois ou quatre points de l'espace        | 4    | Vecteurs › combinaison linéaire                  |
| 2 | TSPE-554 | Associativité du barycentre : bimédianes d'un tétraèdre | 5    | Vecteurs › combinaison linéaire                  |
| 3 | TSPE-341 | Fonction vectorielle de Leibniz                         | 6    | Vecteurs › combinaison linéaire                  |
| 4 | TSPE-362 | Fonction scalaire de Leibniz                            | 6    | Orthogonalité et distances › produit scalaire    |

340, 554 et 341 sont posés sur la notion Géométrie › Vecteurs ; leur modèle va sur la sous-notion
« combinaison linéaire » (celle du barycentre de 2de, `6bd8366f`, qui sert de gabarit), au-dessus
du niveau 3 déjà présent. 362 est sur « produit scalaire dans l'espace » (niveau max 5).

Forme (D3, Q2) : 554 est une preuve (cases, case choix à 4 propositions dont la première est la
bonne, variation « étapes à ranger », positions calculées par le générateur, graine 0) ; 340, 341
et 362 sont des applications à valeurs tirées. La formule des coordonnées du barycentre est donnée
dans l'énoncé (approfondissement : le BO ne la demande pas).

    python3 docs/archive/wip/questions-tspe-demonstrations/lot-tspe-approfondissements-9.py scripts/questions/tspe-approfondissements-9
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, answer, status, variables=None):
    expected = {'status': status}
    if status == 'bad_form':
        expected['constraintViolations'] = ['form']
    answers = answer if isinstance(answer, list) else [answer]
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in (variables or {}).items()},
            'answers': answers, 'expected': expected}


def modele(nom, title, description, level, variations, specs):
    return nom, {'title': title, 'description': description, 'grades': ['T_SPE'],
                 'level': level, 'delay': 90, 'status': 'draft',
                 'shared': {},
                 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def ev(x):
    return '{{eval:' + x + '}}'


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def choix(lignes):
    return '\n\n```choix\n' + ''.join('- ' + l + '\n' for l in lignes) + '```'


def case(statement, variables, attendus, steps, conditions=None):
    """Variation à une ou plusieurs cases ouvertes (`?` dans une formule de l'énoncé)."""
    attendus = attendus if isinstance(attendus, list) else [attendus]
    v = {'statement': statement, 'variables': variables,
         'blanks': [{'expectedAnswer': a} for a in attendus],
         'correction': {'steps': steps}}
    if conditions:
        v['conditions'] = conditions
    return v


def justification(statement, variables, bonne, autres, steps, conditions=None):
    """Variation à une case choix : la première proposition est la bonne (index 0)."""
    v = {'statement': statement + choix([bonne] + autres), 'variables': variables,
         'blanks': [{'expectedAnswer': '0'}], 'correction': {'steps': steps}}
    if conditions:
        v['conditions'] = conditions
    return v


def ranger(intro, etapes, steps):
    """Variation « étapes à ranger » : étapes données dans le bon ordre."""
    return {'statement': intro + '\n\nRemets les étapes de la démonstration dans l\'ordre.\n\n'
            '```ranger\nsigne: aucun\n' + ''.join('- ' + e + '\n' for e in etapes) + '```',
            'variables': [], 'correction': {'steps': steps}}


def specs_choix(vi, juste, erreurs, variables=None):
    out = [spec(juste, vi, '0', 'correct', variables)]
    for k, erreur in enumerate(erreurs, start=1):
        out.append(spec('Erreur : ' + erreur, vi, str(k), 'incorrect', variables))
    return out


def vec(ab):
    return '\\overrightarrow{' + ab + '}'


def pt(nom, x, y, z):
    """Point de l'espace à coordonnées tirées : A(x ; y ; z)."""
    return nom + '(' + ev(x) + '\\,;\\,' + ev(y) + '\\,;\\,' + ev(z) + ')'


V0 = '\\vec{0}'
MODELES = []

# --- 1. TSPE-340 : barycentre de trois ou quatre points ----------------------------------------

V340_RELATION = case(
    'Soit $A$, $B$ et $C$ trois points de l\'espace, et $G$ le point tel que $' + ev('a') + '\\,'
    + vec('GA') + '+' + ev('b') + '\\,' + vec('GB') + '+' + ev('c') + '\\,' + vec('GC') + '=' + V0
    + '$ : $G$ est le barycentre de $(A\\,;\\,' + ev('a') + ')$, $(B\\,;\\,' + ev('b') + ')$ et'
    ' $(C\\,;\\,' + ev('c') + ')$.\n\nEn écrivant $' + vec('GB') + '=' + vec('GA') + '+' + vec('AB')
    + '$ et $' + vec('GC') + '=' + vec('GA') + '+' + vec('AC') + '$, complète.\n\n$$' + vec('AG')
    + '=?\\,' + vec('AB') + '+?\\,' + vec('AC') + '$$',
    [var('a', '2..5'), var('b', '2..5'), var('c', '2..5')],
    [ev('b/(a+b+c)'), ev('c/(a+b+c)')],
    ['On remplace : $' + ev('a') + '\\,' + vec('GA') + '+' + ev('b') + '\\left(' + vec('GA') + '+'
     + vec('AB') + '\\right)+' + ev('c') + '\\left(' + vec('GA') + '+' + vec('AC') + '\\right)='
     + V0 + '$.',
     'Soit $' + ev('a+b+c') + '\\,' + vec('GA') + '+' + ev('b') + '\\,' + vec('AB') + '+' + ev('c')
     + '\\,' + vec('AC') + '=' + V0 + '$, donc $' + ev('a+b+c') + '\\,' + vec('AG') + '=' + ev('b')
     + '\\,' + vec('AB') + '+' + ev('c') + '\\,' + vec('AC') + '$.',
     'Donc $' + vec('AG') + '=' + col(ev('b/(a+b+c)')) + '\\,' + vec('AB') + '+'
     + col(ev('c/(a+b+c)')) + '\\,' + vec('AC') + '$.'])

# G est choisi, puis C est calculé pour que G soit le barycentre de (A ; a), (B ; b), (C ; 1).
V_340_COORD = [var('a', '2..3'), var('b', '2..3'),
               var('g1', '-3..3'), var('g2', '-3..3'), var('g3', '-3..3'),
               var('a1', '-3..3'), var('a2', '-3..3'), var('a3', '-3..3'),
               var('b1', '-3..3'), var('b2', '-3..3'), var('b3', '-3..3'),
               var('c1', 'eval:((a)+(b)+1)*(g1)-(a)*(a1)-(b)*(b1)'),
               var('c2', 'eval:((a)+(b)+1)*(g2)-(a)*(a2)-(b)*(b2)'),
               var('c3', 'eval:((a)+(b)+1)*(g3)-(a)*(a3)-(b)*(b3)')]
C_340_COORD = ['abs(c1) <= 12', 'abs(c2) <= 12', 'abs(c3) <= 12',
               'a1 != b1 || a2 != b2 || a3 != b3', 'g1 != 0 || g2 != 0 || g3 != 0']
V340_COORDONNEES = case(
    'Dans un repère de l\'espace, on considère les points $' + pt('A', 'a1', 'a2', 'a3') + '$, $'
    + pt('B', 'b1', 'b2', 'b3') + '$ et $' + pt('C', 'c1', 'c2', 'c3') + '$. Soit $G$ le'
    ' barycentre de $(A\\,;\\,' + ev('a') + ')$, $(B\\,;\\,' + ev('b') + ')$ et $(C\\,;\\,1)$,'
    ' c\'est-à-dire le point tel que $' + ev('a') + '\\,' + vec('GA') + '+' + ev('b') + '\\,'
    + vec('GB') + '+' + vec('GC') + '=' + V0 + '$.\n\nOn admet que ses coordonnées sont les'
    ' moyennes de celles de $A$, $B$ et $C$ pondérées par $' + ev('a') + '$, $' + ev('b') + '$ et'
    ' $1$ : $x_G=\\dfrac{' + ev('a') + 'x_A+' + ev('b') + 'x_B+x_C}{' + ev('a+b+1') + '}$, et de'
    ' même pour $y_G$ et $z_G$.\n\nDonne les coordonnées de $G$.\n\n$$G(?\\,;\\,?\\,;\\,?)$$',
    V_340_COORD, [ev('g1'), ev('g2'), ev('g3')],
    ['$x_G=\\dfrac{' + ev('a') + '\\times' + ev('a1;()') + '+' + ev('b') + '\\times' + ev('b1;()')
     + ev('c1;+') + '}{' + ev('a+b+1') + '}=\\dfrac{' + ev('(a+b+1)*g1') + '}{' + ev('a+b+1')
     + '}=' + ev('g1') + '$.',
     'De même, $y_G=\\dfrac{' + ev('(a+b+1)*g2') + '}{' + ev('a+b+1') + '}=' + ev('g2')
     + '$ et $z_G=\\dfrac{' + ev('(a+b+1)*g3') + '}{' + ev('a+b+1') + '}=' + ev('g3') + '$.',
     'Donc $' + col('G(' + ev('g1') + '\\,;\\,' + ev('g2') + '\\,;\\,' + ev('g3') + ')') + '$.'],
    C_340_COORD)

V340_TETRAEDRE = case(
    'Soit $ABCD$ un tétraèdre, et $G$ le barycentre de $(A\\,;\\,1)$, $(B\\,;\\,1)$, $(C\\,;\\,1)$'
    ' et $(D\\,;\\,' + ev('k') + ')$ : $' + vec('GA') + '+' + vec('GB') + '+' + vec('GC') + '+'
    + ev('k') + '\\,' + vec('GD') + '=' + V0 + '$.\n\nEn exprimant chaque vecteur à l\'aide de $'
    + vec('GA') + '$ (relation de Chasles), complète.\n\n$$' + vec('AG') + '=\\dfrac{1}{?}\\left('
    + vec('AB') + '+' + vec('AC') + '+' + ev('k') + '\\,' + vec('AD') + '\\right)$$',
    [var('k', '2..6')], ev('k+3'),
    ['$' + vec('GB') + '=' + vec('GA') + '+' + vec('AB') + '$, $' + vec('GC') + '=' + vec('GA')
     + '+' + vec('AC') + '$ et $' + vec('GD') + '=' + vec('GA') + '+' + vec('AD') + '$.',
     'On obtient $' + ev('k+3') + '\\,' + vec('GA') + '+' + vec('AB') + '+' + vec('AC') + '+'
     + ev('k') + '\\,' + vec('AD') + '=' + V0 + '$ : le coefficient de $' + vec('GA') + '$ est la'
     ' somme des coefficients, $1+1+1+' + ev('k') + '$.',
     'Donc $' + vec('AG') + '=\\dfrac{1}{' + col(ev('k+3')) + '}\\left(' + vec('AB') + '+'
     + vec('AC') + '+' + ev('k') + '\\,' + vec('AD') + '\\right)$.'])

V340_EXISTENCE = justification(
    'Soit $A$, $B$ et $C$ trois points non alignés de l\'espace, et $k$ un réel. On cherche un'
    ' point $G$ tel que $' + vec('GA') + '+' + vec('GB') + '+k\\,' + vec('GC') + '=' + V0
    + '$.\n\nPour quelles valeurs de $k$ un tel point existe-t-il ?',
    [],
    'Pour $k\\neq -2$',
    ['Pour $k\\neq 0$', 'Pour $k\\neq 2$', 'Pour toute valeur de $k$'],
    ['Par Chasles, la relation s\'écrit $(2+k)\\,' + vec('GA') + '+' + vec('AB') + '+k\\,'
     + vec('AC') + '=' + V0 + '$.',
     'Si $2+k\\neq 0$, elle donne $' + vec('AG') + '=\\dfrac{1}{2+k}\\left(' + vec('AB') + '+k\\,'
     + vec('AC') + '\\right)$ : un seul point $G$.',
     'Si $k=-2$, elle devient $' + vec('AB') + '-2\\,' + vec('AC') + '=' + V0 + '$, fausse car'
     ' $A$, $B$, $C$ ne sont pas alignés : aucun point. Le barycentre existe donc $'
     + col('\\text{pour } k\\neq -2') + '$, quand la somme des coefficients n\'est pas nulle.'])

VARS_340_C = {'a': 2, 'b': 3, 'g1': 1, 'g2': 1, 'g3': 0, 'a1': 1, 'a2': 0, 'a3': 2,
              'b1': -1, 'b2': 2, 'b3': 0, 'c1': 7, 'c2': 0, 'c3': -4}
MODELES.append(modele(
    '01-barycentre-de-trois-ou-quatre-points',
    'Barycentre de trois ou quatre points de l\'espace',
    'Barycentre de (A ; a), (B ; b), (C ; c) : AG en fonction de AB et AC (deux cases),'
    ' coordonnées dans l\'espace (formule donnée, trois cases), barycentre de quatre points'
    ' (case), existence quand la somme des coefficients est non nulle (case choix)',
    4,
    [V340_RELATION, V340_COORDONNEES, V340_TETRAEDRE, V340_EXISTENCE],
    [spec('3/10 et 1/2', 0, ['\\frac{3}{10}', '\\frac{1}{2}'], 'correct',
          {'a': 2, 'b': 3, 'c': 5}),
     spec('Erreur : sans le coefficient de A (3/8 et 5/8)', 0, ['\\frac{3}{8}', '\\frac{5}{8}'],
          'incorrect', {'a': 2, 'b': 3, 'c': 5}),
     spec('Erreur : coefficients échangés', 0, ['\\frac{1}{2}', '\\frac{3}{10}'], 'incorrect',
          {'a': 2, 'b': 3, 'c': 5}),
     spec('G(1 ; 1 ; 0)', 1, ['1', '1', '0'], 'correct', VARS_340_C),
     spec('Erreur : isobarycentre (7/3 ; 2/3 ; −2/3)', 1,
          ['\\frac{7}{3}', '\\frac{2}{3}', '-\\frac{2}{3}'], 'incorrect', VARS_340_C),
     spec('7', 2, '7', 'correct', {'k': 4}),
     spec('Erreur : 4 (les poids de A, B, C oubliés)', 2, '4', 'incorrect', {'k': 4}),
     spec('Erreur : 3', 2, '3', 'incorrect', {'k': 4})]
    + specs_choix(3, 'k ≠ −2', ['k ≠ 0', 'k ≠ 2', 'toute valeur'])))

# --- 2. TSPE-554 : associativité, bimédianes d'un tétraèdre -----------------------------------

INTRO_554 = ('Soit $ABCD$ un tétraèdre, $I$ le milieu de $[AB]$ et $J$ le milieu de $[CD]$ : le'
             ' segment $[IJ]$ est une bimédiane du tétraèdre. Soit $G$ l\'isobarycentre de $A$,'
             ' $B$, $C$ et $D$ : $' + vec('GA') + '+' + vec('GB') + '+' + vec('GC') + '+'
             + vec('GD') + '=' + V0 + '$.\n\n')

V554_MILIEU = case(
    INTRO_554 + 'Complète.\n\n$$' + vec('GA') + '+' + vec('GB') + '=?\\,' + vec('GI') + '$$',
    [], '2',
    ['Par Chasles, $' + vec('GA') + '=' + vec('GI') + '+' + vec('IA') + '$ et $' + vec('GB') + '='
     + vec('GI') + '+' + vec('IB') + '$.',
     '$I$ est le milieu de $[AB]$ : $' + vec('IA') + '+' + vec('IB') + '=' + V0 + '$.',
     'Donc $' + vec('GA') + '+' + vec('GB') + '=' + col('2') + '\\,' + vec('GI') + '$.'])
V554_CONCLUSION = justification(
    INTRO_554 + 'On a obtenu $2\\,' + vec('GI') + '+2\\,' + vec('GJ') + '=' + V0 + '$. Qu\'en'
    ' conclut-on ?',
    [],
    '$G$ est le milieu de $[IJ]$.',
    ['$G$ est confondu avec $I$.',
     '$G$ est sur la droite $(AB)$.',
     '$IJ=\\dfrac{1}{2}CD$.'],
    ['$2\\,' + vec('GI') + '+2\\,' + vec('GJ') + '=' + V0 + '$ donne $' + vec('GI') + '+'
     + vec('GJ') + '=' + V0 + '$.',
     'Donc $' + col('G \\text{ est le milieu de } [IJ]') + '$ : l\'isobarycentre est sur la'
     ' bimédiane $[IJ]$, en son milieu.'])
V554_ASSOCIATIVITE = case(
    'Soit $A$, $B$ et $C$ trois points non alignés, $G$ le barycentre de $(A\\,;\\,' + ev('a')
    + ')$, $(B\\,;\\,' + ev('b') + ')$, $(C\\,;\\,' + ev('c') + ')$, et $H$ le barycentre de'
    ' $(A\\,;\\,' + ev('a') + ')$, $(B\\,;\\,' + ev('b') + ')$.\n\nComme $' + ev('a') + '\\,'
    + vec('GA') + '+' + ev('b') + '\\,' + vec('GB') + '=' + ev('a+b') + '\\,' + vec('GH')
    + '$ (associativité), complète.\n\n$$' + vec('CG') + '=?\\,' + vec('CH') + '$$',
    [var('a', '2..5'), var('b', '2..5'), var('c', '2..5')], ev('(a+b)/(a+b+c)'),
    ['La relation $' + ev('a') + '\\,' + vec('GA') + '+' + ev('b') + '\\,' + vec('GB') + '+'
     + ev('c') + '\\,' + vec('GC') + '=' + V0 + '$ devient $' + ev('a+b') + '\\,' + vec('GH') + '+'
     + ev('c') + '\\,' + vec('GC') + '=' + V0 + '$ : $G$ est le barycentre de $(H\\,;\\,'
     + ev('a+b') + ')$ et $(C\\,;\\,' + ev('c') + ')$.',
     'Par Chasles, $' + vec('GH') + '=' + vec('GC') + '+' + vec('CH') + '$ : $' + ev('a+b+c')
     + '\\,' + vec('GC') + '+' + ev('a+b') + '\\,' + vec('CH') + '=' + V0 + '$.',
     'Donc $' + vec('CG') + '=' + col(ev('(a+b)/(a+b+c)')) + '\\,' + vec('CH') + '$.'],
    ['a != b || b != c'])
V554_PREUVE = ranger(
    'Soit $ABCD$ un tétraèdre. On démontre que ses trois bimédianes (segments qui joignent les'
    ' milieux de deux arêtes opposées) sont concourantes.',
    ['Soit $G$ tel que $' + vec('GA') + '+' + vec('GB') + '+' + vec('GC') + '+' + vec('GD') + '='
     + V0 + '$, $I$ le milieu de $[AB]$ et $J$ celui de $[CD]$.',
     'Par les milieux, $' + vec('GA') + '+' + vec('GB') + '=2\\,' + vec('GI') + '$ et $'
     + vec('GC') + '+' + vec('GD') + '=2\\,' + vec('GJ') + '$.',
     'Donc $2\\,' + vec('GI') + '+2\\,' + vec('GJ') + '=' + V0 + '$ : $G$ est le milieu de'
     ' $[IJ]$.',
     'En groupant $A$ avec $C$, puis avec $D$, $G$ est aussi le milieu des deux autres'
     ' bimédianes : elles sont concourantes en $G$.'],
    ['On nomme $G$, l\'isobarycentre, puis on regroupe les points deux par deux (associativité).',
     'Chaque regroupement place $G$ au milieu d\'une bimédiane : $' + col('G') + '$ est sur les'
     ' trois.'])

MODELES.append(modele(
    '02-associativite-bimedianes-d-un-tetraedre',
    'Associativité du barycentre : bimédianes d\'un tétraèdre',
    'Isobarycentre G d\'un tétraèdre : GA + GB = 2GI (case), G milieu de la bimédiane (case'
    ' choix), associativité CG = (a + b)/(a + b + c) CH (case), concourance des bimédianes'
    ' (étapes à ranger)',
    5,
    [V554_MILIEU, V554_CONCLUSION, V554_ASSOCIATIVITE, V554_PREUVE],
    [spec('2', 0, '2', 'correct'),
     spec('Erreur : 1', 0, '1', 'incorrect'),
     spec('Erreur : 1/2', 0, '\\frac{1}{2}', 'incorrect')]
    + specs_choix(1, 'milieu de [IJ]', ['confondu avec I', 'sur (AB)', 'IJ = CD/2'])
    + [spec('5/8', 2, '\\frac{5}{8}', 'correct', {'a': 2, 'b': 3, 'c': 3}),
       spec('Erreur : 3/8 (c/(a+b+c))', 2, '\\frac{3}{8}', 'incorrect', {'a': 2, 'b': 3, 'c': 3}),
       spec('Erreur : 5/3 ((a+b)/c)', 2, '\\frac{5}{3}', 'incorrect', {'a': 2, 'b': 3, 'c': 3})]
    + ['RANGER:3']))

# --- 3. TSPE-341 : fonction vectorielle de Leibniz --------------------------------------------

INTRO_341 = ('Soit $A$ et $B$ deux points distincts de l\'espace. À tout point $M$, on associe un'
             ' vecteur combinaison linéaire de $' + vec('MA') + '$ et $' + vec('MB') + '$'
             ' (fonction vectorielle de Leibniz).\n\n')

V341_REDUCTION = case(
    INTRO_341 + 'Soit $G$ le barycentre de $(A\\,;\\,' + ev('a') + ')$ et $(B\\,;\\,' + ev('b')
    + ')$. Pour tout point $M$, complète.\n\n$$' + ev('a') + '\\,' + vec('MA') + '+' + ev('b')
    + '\\,' + vec('MB') + '=?\\,' + vec('MG') + '$$',
    [var('a', '2..5'), var('b', '2..5')], ev('a+b'),
    ['Par Chasles, $' + vec('MA') + '=' + vec('MG') + '+' + vec('GA') + '$ et $' + vec('MB') + '='
     + vec('MG') + '+' + vec('GB') + '$.',
     'Donc $' + ev('a') + '\\,' + vec('MA') + '+' + ev('b') + '\\,' + vec('MB') + '=' + ev('a+b')
     + '\\,' + vec('MG') + '+\\left(' + ev('a') + '\\,' + vec('GA') + '+' + ev('b') + '\\,'
     + vec('GB') + '\\right)$.',
     'La parenthèse est nulle, par définition de $G$ : $' + ev('a') + '\\,' + vec('MA') + '+'
     + ev('b') + '\\,' + vec('MB') + '=' + col(ev('a+b')) + '\\,' + vec('MG') + '$.'],
    ['a != b'])
V341_CONSTANTE = justification(
    INTRO_341 + 'On considère, pour tout point $M$, le vecteur $' + vec('MA') + '-' + vec('MB')
    + '$ (somme des coefficients nulle). Que peut-on dire ?',
    [],
    'Il vaut $' + vec('BA') + '$ pour tout point $M$ : il ne dépend pas de $M$.',
    ['Il vaut $' + V0 + '$ pour tout point $M$.',
     'Il vaut $' + vec('AB') + '$ pour tout point $M$.',
     'Il vaut $2\\,' + vec('MI') + '$, où $I$ est le milieu de $[AB]$.'],
    ['Par Chasles, $' + vec('MA') + '-' + vec('MB') + '=' + vec('MA') + '+' + vec('BM') + '='
     + vec('BM') + '+' + vec('MA') + '$.',
     'Donc $' + vec('MA') + '-' + vec('MB') + '=' + col(vec('BA')) + '$ : quand la somme des'
     ' coefficients est nulle, la fonction de Leibniz est constante.'])
V341_SPHERE = case(
    INTRO_341 + 'Soit $G$ le barycentre de $(A\\,;\\,1)$ et $(B\\,;\\,2)$. L\'ensemble des points'
    ' $M$ de l\'espace tels que $\\left\\|' + vec('MA') + '+2\\,' + vec('MB') + '\\right\\|='
    + ev('3*r') + '$ est une sphère de centre $G$. Quel est son rayon ?\n\n$r=?$',
    [var('r', '1..5')], ev('r'),
    ['$G$ est le barycentre de $(A\\,;\\,1)$ et $(B\\,;\\,2)$ : $' + vec('MA') + '+2\\,'
     + vec('MB') + '=3\\,' + vec('MG') + '$ pour tout point $M$.',
     'La condition s\'écrit $3MG=' + ev('3*r') + '$, soit $MG=' + ev('r') + '$.',
     'C\'est la sphère de centre $G$ et de rayon $' + col(ev('r')) + '$.'])
V341_LIEU = justification(
    INTRO_341 + 'Soit $I$ le milieu de $[AB]$. Quel est l\'ensemble des points $M$ de l\'espace'
    ' tels que $\\left\\|' + vec('MA') + '+' + vec('MB') + '\\right\\|=\\left\\|' + vec('MA') + '-'
    + vec('MB') + '\\right\\|$ ?',
    [],
    'La sphère de diamètre $[AB]$',
    ['Le plan médiateur de $[AB]$', 'La droite $(AB)$', 'Le seul point $I$'],
    ['$I$ est le milieu de $[AB]$ : $' + vec('MA') + '+' + vec('MB') + '=2\\,' + vec('MI') + '$.',
     'La somme des coefficients de $' + vec('MA') + '-' + vec('MB') + '$ est nulle : ce vecteur'
     ' vaut $' + vec('BA') + '$ pour tout $M$.',
     'La condition s\'écrit $2MI=AB$, soit $MI=\\dfrac{AB}{2}$ : c\'est $'
     + col('\\text{la sphère de diamètre } [AB]') + '$.'])

MODELES.append(modele(
    '03-fonction-vectorielle-de-leibniz', 'Fonction vectorielle de Leibniz',
    'aMA + bMB = (a + b)MG (case), MA − MB constant quand la somme des coefficients est nulle'
    ' (case choix), rayon de la sphère ‖MA + 2MB‖ = k (case), ‖MA + MB‖ = ‖MA − MB‖ : sphère'
    ' de diamètre [AB] (case choix)',
    6,
    [V341_REDUCTION, V341_CONSTANTE, V341_SPHERE, V341_LIEU],
    [spec('5', 0, '5', 'correct', {'a': 2, 'b': 3}),
     spec('Erreur : 6 (produit)', 0, '6', 'incorrect', {'a': 2, 'b': 3}),
     spec('Erreur : 1', 0, '1', 'incorrect', {'a': 2, 'b': 3})]
    + specs_choix(1, 'BA', ['vecteur nul', 'AB', '2MI'])
    + [spec('4', 2, '4', 'correct', {'r': 4}),
       spec('Erreur : 12 (sans diviser par 3)', 2, '12', 'incorrect', {'r': 4}),
       spec('Erreur : 6 (divisé par 2)', 2, '6', 'incorrect', {'r': 4})]
    + specs_choix(3, 'sphère de diamètre [AB]', ['plan médiateur', '(AB)', 'le point I'])))

# --- 4. TSPE-362 : fonction scalaire de Leibniz -----------------------------------------------

INTRO_362 = ('Soit $A$ et $B$ deux points distincts de l\'espace, et $I$ le milieu de'
             ' $[AB]$.\n\n')

V362_DEVELOPPEMENT = justification(
    INTRO_362 + 'Pour tout point $M$, $MA^2=\\left(' + vec('MI') + '+' + vec('IA') + '\\right)^2'
    '=MI^2+2\\,' + vec('MI') + '\\cdot' + vec('IA') + '+IA^2$, et de même pour $MB^2$. En'
    ' ajoutant, pourquoi les produits scalaires disparaissent-ils ?',
    [],
    'Car $' + vec('IA') + '+' + vec('IB') + '=' + V0 + '$.',
    ['Car $' + vec('MI') + '$ est orthogonal à $' + vec('AB') + '$.',
     'Car $' + vec('MI') + '\\cdot' + vec('IA') + '=MI\\times IA$.',
     'Car un produit scalaire est toujours nul.'],
    ['La somme des deux produits scalaires est $2\\,' + vec('MI') + '\\cdot' + vec('IA') + '+2\\,'
     + vec('MI') + '\\cdot' + vec('IB') + '=2\\,' + vec('MI') + '\\cdot\\left(' + vec('IA') + '+'
     + vec('IB') + '\\right)$ (bilinéarité).',
     '$I$ est le milieu de $[AB]$ : $' + col(vec('IA') + '+' + vec('IB') + '=' + V0) + '$, donc'
     ' cette somme est nulle, quel que soit $M$.',
     'Il reste $MA^2+MB^2=2MI^2+IA^2+IB^2=2MI^2+\\dfrac{AB^2}{2}$.'])
V362_FORMULE = case(
    INTRO_362 + 'On donne $AB=' + ev('2*u') + '$. Pour tout point $M$, complète.\n\n$$MA^2+MB^2'
    '=2MI^2+?$$',
    [var('u', '1..5')], ev('2*u^2'),
    ['$MA^2=MI^2+2\\,' + vec('MI') + '\\cdot' + vec('IA') + '+IA^2$ et $MB^2=MI^2+2\\,' + vec('MI')
     + '\\cdot' + vec('IB') + '+IB^2$.',
     'En ajoutant, les produits scalaires s\'annulent car $' + vec('IA') + '+' + vec('IB') + '='
     + V0 + '$ : $MA^2+MB^2=2MI^2+IA^2+IB^2$.',
     '$IA=IB=' + ev('u') + '$, donc $IA^2+IB^2=' + col(ev('2*u^2')) + '$.'])
V362_SPHERE = case(
    INTRO_362 + 'On donne $AB=' + ev('2*u') + '$, et on admet que $MA^2+MB^2=2MI^2+\\dfrac{AB^2}{2}$'
    ' pour tout point $M$. L\'ensemble des points $M$ tels que $MA^2+MB^2=' + ev('2*r^2+2*u^2')
    + '$ est une sphère de centre $I$. Quel est son rayon ?\n\n$r=?$',
    [var('u', '1..4'), var('r', '1..6')], ev('r'),
    ['La condition s\'écrit $2MI^2+' + ev('2*u^2') + '=' + ev('2*r^2+2*u^2') + '$, soit $2MI^2='
     + ev('2*r^2') + '$.',
     'Donc $MI^2=' + ev('r^2') + '$, et $MI=' + ev('r') + '$ (une distance est positive).',
     'C\'est la sphère de centre $I$ et de rayon $' + col(ev('r')) + '$.'],
    ['r != u'])
V362_PLAN = justification(
    INTRO_362 + 'Pour tout point $M$, $MA^2-MB^2=\\left(' + vec('MA') + '-' + vec('MB')
    + '\\right)\\cdot\\left(' + vec('MA') + '+' + vec('MB') + '\\right)$. Quel est l\'ensemble des'
    ' points $M$ tels que $MA^2-MB^2=' + ev('k') + '$ ?',
    [var('k', '1..20;±')],
    'Un plan orthogonal à la droite $(AB)$',
    ['Une sphère de centre $I$',
     'Une droite parallèle à $(AB)$',
     'Le plan médiateur de $[AB]$'],
    ['$' + vec('MA') + '-' + vec('MB') + '=' + vec('BA') + '$ et $' + vec('MA') + '+' + vec('MB')
     + '=2\\,' + vec('MI') + '$ : $MA^2-MB^2=2\\,' + vec('BA') + '\\cdot' + vec('MI') + '=2\\,'
     + vec('IM') + '\\cdot' + vec('AB') + '$.',
     'La condition s\'écrit $' + vec('IM') + '\\cdot' + vec('AB') + '=' + ev('k/2') + '$ : le'
     ' projeté de $M$ sur $(AB)$ est un point fixe $H$.',
     'C\'est $' + col('\\text{le plan orthogonal à } (AB) \\text{ passant par } H') + '$ ; ce'
     ' n\'est pas le plan médiateur, qui correspond à $MA^2-MB^2=0$.'])

MODELES.append(modele(
    '04-fonction-scalaire-de-leibniz', 'Fonction scalaire de Leibniz',
    'MA² + MB² = 2MI² + AB²/2 : pourquoi les produits scalaires s\'annulent (case choix),'
    ' terme constant (case), rayon de la sphère MA² + MB² = k (case), MA² − MB² = k : un plan'
    ' orthogonal à (AB) (case choix)',
    6,
    [V362_DEVELOPPEMENT, V362_FORMULE, V362_SPHERE, V362_PLAN],
    specs_choix(0, 'IA + IB = 0', ['orthogonal', 'MI × IA', 'toujours nul'])
    + [spec('18', 1, '18', 'correct', {'u': 3}),
       spec('Erreur : 36 (AB²)', 1, '36', 'incorrect', {'u': 3}),
       spec('Erreur : 9 (IA² seul)', 1, '9', 'incorrect', {'u': 3}),
       spec('5', 2, '5', 'correct', {'u': 2, 'r': 5}),
       spec('Erreur : 25 (sans la racine)', 2, '25', 'incorrect', {'u': 2, 'r': 5}),
       spec('Erreur : √29 (AB²/2 oublié)', 2, '\\sqrt{29}', 'incorrect', {'u': 2, 'r': 5})]
    + specs_choix(3, 'plan orthogonal à (AB)', ['sphère', 'droite', 'plan médiateur'],
                  {'k': 6})))


# --- Specs « ranger » : positions affichées calculées par le générateur (graine 0) -------------

def positions(chemin, vi):
    out = subprocess.run(['pnpm', 'exec', 'tsx', 'docs/wip/questions/positions-ranger.ts', chemin, str(vi)],
                         check=True, capture_output=True, text=True).stdout.strip().splitlines()
    return json.loads(out[-1])


os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    chemin = os.path.join(DOSSIER, nom + '.json')
    a_ranger = [s for s in m['testSpecs'] if isinstance(s, str)]
    m['testSpecs'] = [s for s in m['testSpecs'] if not isinstance(s, str)]
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
    for marque in a_ranger:
        vi = int(marque.split(':')[1])
        juste = positions(chemin, vi)
        faux = juste[:]
        faux[1], faux[2] = faux[2], faux[1]
        m['testSpecs'] += [spec('Étapes dans l’ordre', vi, juste, 'correct'),
                           spec('Erreur : deuxième et troisième étapes échangées', vi, faux,
                                'incorrect')]
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
