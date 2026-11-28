"""Écrit les 5 modèles du lot 8 du CM2 (restes du calcul : relations entre fractions usuelles,
estimation, opérations posées) dans scripts/questions/cm2-8/.

Phase 0 du 2026-11-17 (§ 13 du journal `docs/archive/wip/questions-cm2-progress.md`), recommandations
suivies par David (§ 13.1) : 056 diviseur dans {2, 4, 5, 6, 8} ; 038 V3 gardée avec 3/4 ; 053 V1
leurres du CM1 (× 10, ÷ 10, + 100) ; un seul lot. Bornes : `cycle3.json`, CM2-038, 053, 055-057.
Un point par modèle ; le nœud et le tag sont posés par la migration de rangement, après le
`--publier`.

Jumeaux du CM1 : `cm1-1/08` (relations), `cm1-6bis/07` (estimation), `cm1-4b/05` (multiplication
posée), `cm1-4b/06` (division posée).

Décisions et pièges :
- opérations posées : bloc ` ```operation ` à remplir, `blanks: []` (la case vient du bloc) ; la
  réponse est lue dans la grille avec la virgule posée par l'élève, jugée à la valeur ;
- division décimale d'un entier : `quotient: décimal` obligatoire (sinon division euclidienne) ;
  diviseur tiré par `k` dans {2, 4, 5, 6, 8} (3, 7, 9 ne s'arrêtent jamais au centième) ; au
  centième, seuls 4 et 8 ;
- estimation : case « choix », la bonne proposition en premier (`expectedAnswer: 0`), mélangée à
  l'affichage ;
- niveaux : max + 1 de chaque nœud, relevés en prod le 2026-11-17 (égalité de fractions 8,
  arrondis 9, multiplication 9, division 8).

    python3 docs/wip/questions/lot-cm2-8.py scripts/questions/cm2-8
"""

import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]
ESPACES = {'constraints': {'spacesFromFourDigits': True}}
VERT = '\\textcolor{{{color:primary.0}}}'


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(nom, title, description, level, delay, variations, specs, options=None):
    m = {'title': title, 'description': description, 'grades': ['CM2'], 'level': level,
         'delay': delay, 'status': 'draft'}
    if options:
        m['options'] = options
    m['variations'] = variations
    m['testSpecs'] = specs
    return nom, m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [{'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def si(nom, valeurs):
    """{{if:nom==1|v1|{{if:nom==2|v2|…vn}}}} : valeur choisie par un indice tiré de 1 à n."""
    expr = valeurs[-1]
    for i in range(len(valeurs) - 1, 0, -1):
        expr = '{{if:' + nom + '==' + str(i) + '|' + valeurs[i - 1] + '|' + expr + '}}'
    return expr


MODELES = []

# ---------------------------------------------------------------- 1. CM2-038 relations
# V1 : 1/2, 1/4, 3/4 en fractions décimales (dénominateur 10, 100, 1 000)
REL_V1 = [  # (p, q, D, réponse, phrase)
    ('1', '2', '10', '5', 'un demi, c\'est cinq dixièmes'),
    ('1', '2', '100', '50', 'un demi, c\'est cinquante centièmes'),
    ('1', '2', '1000', '500', 'un demi, c\'est cinq cents millièmes'),
    ('1', '4', '100', '25', 'un quart, c\'est vingt-cinq centièmes (la moitié de cinquante centièmes)'),
    ('1', '4', '1000', '250', 'un quart, c\'est deux cent cinquante millièmes (la moitié de cinq cents millièmes)'),
    ('3', '4', '100', '75', 'trois quarts, c\'est trois fois vingt-cinq centièmes'),
    ('3', '4', '1000', '750', 'trois quarts, c\'est trois fois deux cent cinquante millièmes'),
]
# V2 : unité, dixième, centième en dixièmes, centièmes, millièmes
REL_V2 = [  # (mot, unité visée, réponse)
    ('une unité', 'dixièmes', '10'),
    ('une unité', 'centièmes', '100'),
    ('une unité', 'millièmes', '1 000'),
    ('un dixième', 'centièmes', '10'),
    ('un dixième', 'millièmes', '100'),
    ('un centième', 'millièmes', '10'),
]
REL_V2_POURQUOI = [
    'Une unité partagée en dix parts égales : dix dixièmes.',
    'Une unité, c\'est dix dixièmes, et chaque dixième, dix centièmes : cent centièmes.',
    'Une unité, c\'est cent centièmes, et chaque centième, dix millièmes : mille millièmes.',
    'Un dixième partagé en dix parts égales : dix centièmes.',
    'Un dixième, c\'est dix centièmes, et chaque centième, dix millièmes : cent millièmes.',
    'Un centième partagé en dix parts égales : dix millièmes.',
]
# V3 : sommes et différences en quarts, résultat en quarts
REL_V3 = [  # (a, b, op, c, d, réponse, phrase)
    ('3', '4', '+', '1', '4', '4', 'Trois quarts et un quart font quatre quarts, c\'est-à-dire une unité.'),
    ('1', '2', '+', '1', '4', '3', 'Un demi, c\'est deux quarts ; deux quarts et un quart font trois quarts.'),
    ('3', '4', '-', '1', '2', '1', 'Un demi, c\'est deux quarts ; trois quarts moins deux quarts, il reste un quart.'),
    ('3', '4', '-', '1', '4', '2', 'Trois quarts moins un quart, il reste deux quarts (un demi).'),
]
# V4 : 1 − 1/4, 1 − 3/4, 1 − 1/2
REL_V4 = [  # (p, q, réponse, dénominateur de la réponse, phrase)
    ('3', '4', '1', '4', 'Une unité, c\'est quatre quarts ; on en enlève trois, il en reste un.'),
    ('1', '4', '3', '4', 'Une unité, c\'est quatre quarts ; on en enlève un, il en reste trois.'),
    ('1', '2', '2', '4', 'Une unité, c\'est quatre quarts, et un demi, deux quarts : il en reste deux.'),
]


def frac(n, d):
    return '\\frac{' + n + '}{' + d + '}'


def espaces(n):
    return n.replace('1000', '1\\,000')


MODELES.append(modele(
    '01-relations-entre-fractions-usuelles', 'Relations entre fractions usuelles',
    'Un demi, un quart, trois quarts en fractions décimales (3/4 = ?/100) ; unité, dixième,'
    ' centième en millièmes ; sommes et différences en quarts (1 − 3/4 = ?/4)',
    9, 20,
    [
        variation(
            'Complète.\n\n$$\\frac{{{p}}}{{{q}}} = \\frac{?}{{{D}}}$$',
            [var('k', '1..7'), var('p', si('k', [r[0] for r in REL_V1])),
             var('q', si('k', [r[1] for r in REL_V1])),
             var('D', si('k', [espaces(r[2]) for r in REL_V1])),
             var('r', si('k', [r[3] for r in REL_V1]))],
            ['{{r}}'],
            [si('k', [r[4][0].upper() + r[4][1:] + ' : $' + frac(r[0], r[1]) + ' = '
                      + frac(VERT + '{' + r[3] + '}', espaces(r[2])) + '$.' for r in REL_V1])]),
        variation(
            'Complète.\n\nDans {{mot}}, il y a $?$ {{vise}}.',
            [var('k', '1..6'), var('mot', si('k', [r[0] for r in REL_V2])),
             var('vise', si('k', [r[1] for r in REL_V2])),
             var('r', si('k', [r[2] for r in REL_V2]))],
            ['{{r}}'],
            [si('k', REL_V2_POURQUOI),
             'Dans {{mot}}, il y a $' + VERT + '{{{r}}}$ {{vise}}.']),
        variation(
            'Complète.\n\n$$\\frac{{{a}}}{{{b}}} {{op}} \\frac{{{c}}}{{{d}}} = \\frac{?}{4}$$',
            [var('k', '1..4'), var('a', si('k', [r[0] for r in REL_V3])),
             var('b', si('k', [r[1] for r in REL_V3])),
             var('op', si('k', [r[2] for r in REL_V3])),
             var('c', si('k', [r[3] for r in REL_V3])),
             var('d', si('k', [r[4] for r in REL_V3])),
             var('r', si('k', [r[5] for r in REL_V3]))],
            ['{{r}}'],
            [si('k', [r[6] for r in REL_V3]),
             '$$\\frac{{{a}}}{{{b}}} {{op}} \\frac{{{c}}}{{{d}}} = \\frac{' + VERT
             + '{{{r}}}}{4}$$']),
        variation(
            'Complète.\n\n$$1 - \\frac{{{p}}}{{{q}}} = \\frac{?}{4}$$',
            [var('k', '1..3'), var('p', si('k', [r[0] for r in REL_V4])),
             var('q', si('k', [r[1] for r in REL_V4])),
             var('r', si('k', [r[2] for r in REL_V4]))],
            ['{{r}}'],
            [si('k', [r[4] for r in REL_V4]),
             '$$1 - \\frac{{{p}}}{{{q}}} = \\frac{' + VERT + '{{{r}}}}{4}$$']),
    ],
    [spec('3/4 = ?/100 : 75', 0, {'k': 6, 'p': 3, 'q': 4, 'D': '100', 'r': 75}, '75', 'correct'),
     spec('Erreur : 3/4 = 34/100 (chiffres recopiés)', 0,
          {'k': 6, 'p': 3, 'q': 4, 'D': '100', 'r': 75}, '34', 'incorrect'),
     spec('1/4 = ?/1 000 : 250', 0, {'k': 5, 'p': 1, 'q': 4, 'D': '1\\,000', 'r': 250}, '250',
          'correct'),
     spec('Erreur : 1/4 = 25/1 000', 0, {'k': 5, 'p': 1, 'q': 4, 'D': '1\\,000', 'r': 250},
          '25', 'incorrect'),
     spec('1/2 = ?/100 : 50', 0, {'k': 2, 'p': 1, 'q': 2, 'D': '100', 'r': 50}, '50', 'correct'),
     spec('Erreur : 1/2 = 5/100', 0, {'k': 2, 'p': 1, 'q': 2, 'D': '100', 'r': 50}, '5',
          'incorrect'),
     spec('Un dixième = 100 millièmes', 1,
          {'k': 5, 'mot': 'un dixième', 'vise': 'millièmes', 'r': 100}, '100', 'correct'),
     spec('Erreur : un dixième = 10 millièmes', 1,
          {'k': 5, 'mot': 'un dixième', 'vise': 'millièmes', 'r': 100}, '10', 'incorrect'),
     spec('Une unité = 1 000 millièmes', 1,
          {'k': 3, 'mot': 'une unité', 'vise': 'millièmes', 'r': '1 000'}, '1 000', 'correct'),
     spec('3/4 − 1/2 = 1/4', 2, {'k': 3, 'a': 3, 'b': 4, 'op': '-', 'c': 1, 'd': 2, 'r': 1},
          '1', 'correct'),
     spec('Erreur : 3/4 − 1/2 = 2/4 (num. soustraits)', 2,
          {'k': 3, 'a': 3, 'b': 4, 'op': '-', 'c': 1, 'd': 2, 'r': 1}, '2', 'incorrect'),
     spec('1/2 + 1/4 = 3/4', 2, {'k': 2, 'a': 1, 'b': 2, 'op': '+', 'c': 1, 'd': 4, 'r': 3},
          '3', 'correct'),
     spec('1 − 3/4 = 1/4', 3, {'k': 1, 'p': 3, 'q': 4, 'r': 1}, '1', 'correct'),
     spec('Erreur : 1 − 3/4 = 3/4', 3, {'k': 1, 'p': 3, 'q': 4, 'r': 1}, '3', 'incorrect')],
    ESPACES))

# ---------------------------------------------------------------- 2. CM2-053 estimation
CONSIGNE_EST = 'Sans poser l\'opération, choisis la meilleure estimation.'


def choix(bonne, autres):
    return '\n\n```choix\n- $' + bonne + '$\n' + ''.join('- $' + a + '$\n' for a in autres) + '```'


EST_V1_VARS = [var('x', '1..9'), var('y', '0..9'), var('z', '1..9'),
               var('ea0', '0..40'), var('ea', 'eval:ea0-20'),
               var('eb0', '0..40'), var('eb', 'eval:eb0-20'),
               var('A', 'eval:1000*x+100*y'), var('B', 'eval:100*z'),
               var('a', 'eval:A+ea'), var('b', 'eval:B+eb'), var('E', 'eval:A-B')]
EST_V2_VARS = [var('x', '2..9'), var('y', '2..9'),
               var('ea0', '0..60'), var('ea', 'eval:ea0-30'),
               var('eb0', '0..6'), var('eb', 'eval:eb0-3'),
               var('a', 'eval:100*x+ea'), var('b', 'eval:10*y+eb'), var('E', 'eval:1000*x*y')]
EST_V3_VARS = [var('d', '2..9'), var('q', '1..10'),
               var('f0', '0..1200'), var('f', 'eval:f0-600'),
               var('N', 'eval:1000*d*q'), var('n', 'eval:N+f'), var('E', 'eval:1000*q')]

MODELES.append(modele(
    '02-estimer-le-resultat-d-une-operation', 'Estimer le résultat d\'une opération',
    'Différence d\'un nombre de 4 chiffres et d\'un nombre de 3 chiffres (1 212 − 496 ≈ 700),'
    ' produit de 3 chiffres par 2 chiffres (724 × 68 ≈ 49 000), quotient d\'un nombre de 5 chiffres'
    ' (59 437 ÷ 6 ≈ 10 000) ; choisir parmi quatre valeurs',
    10, 60,
    [
        variation(
            CONSIGNE_EST + '\n\n$${{a}} - {{b}} \\approx \\ldots$$'
            + choix('{{E}}', ['{{eval:10*E}}', '{{eval:E/10}}', '{{eval:E+100}}']),
            EST_V1_VARS, ['0'],
            ['On arrondit chaque nombre à la centaine la plus proche : ${{a}} \\approx {{A}}$ et'
             ' ${{b}} \\approx {{B}}$.',
             '$${{a}} - {{b}} \\approx {{A}} - {{B}} = ' + VERT + '{{{E}}}$$'],
            ['ea != 0', 'eb != 0', 'b >= 100', 'A - B >= 200']),
        variation(
            CONSIGNE_EST + '\n\n$${{a}} \\times {{b}} \\approx \\ldots$$'
            + choix('{{E}}', ['{{eval:10*E}}', '{{eval:E/10}}', '{{eval:100*E}}']),
            EST_V2_VARS, ['0'],
            ['On arrondit ${{a}}$ à la centaine et ${{b}}$ à la dizaine : ${{a}} \\approx'
             ' {{eval:100*x}}$ et ${{b}} \\approx {{eval:10*y}}$.',
             '$${{a}} \\times {{b}} \\approx {{eval:100*x}} \\times {{eval:10*y}} = ' + VERT
             + '{{{E}}}$$'],
            ['ea != 0', 'eb != 0', 'mod(a,10) != 0']),
        variation(
            CONSIGNE_EST + '\n\n$${{n}} \\div {{d}} \\approx \\ldots$$'
            + choix('{{E}}', ['{{eval:10*E}}', '{{eval:E/10}}', '{{eval:100*E}}']),
            EST_V3_VARS, ['0'],
            ['On remplace ${{n}}$ par un nombre proche facile à diviser par ${{d}}$ : ${{n}}'
             ' \\approx {{N}}$.',
             '$${{n}} \\div {{d}} \\approx {{N}} \\div {{d}} = ' + VERT + '{{{E}}}$$'],
            ['N >= 10000', 'n >= 10000', 'n <= 99999', 'mod(n,10) != 0']),
    ],
    [spec('BO : 1 212 − 496 ≈ 700', 0,
          {'x': 1, 'y': 2, 'z': 5, 'ea0': 32, 'ea': 12, 'eb0': 16, 'eb': -4, 'A': 1200,
           'B': 500, 'a': 1212, 'b': 496, 'E': 700}, '0', 'correct'),
     spec('Erreur : 7 000 (un zéro de trop)', 0,
          {'x': 1, 'y': 2, 'z': 5, 'ea0': 32, 'ea': 12, 'eb0': 16, 'eb': -4, 'A': 1200,
           'B': 500, 'a': 1212, 'b': 496, 'E': 700}, '1', 'incorrect'),
     spec('BO : 724 × 68 ≈ 49 000', 1,
          {'x': 7, 'y': 7, 'ea0': 54, 'ea': 24, 'eb0': 1, 'eb': -2, 'a': 724, 'b': 68,
           'E': 49000}, '0', 'correct'),
     spec('Erreur : 490 000', 1,
          {'x': 7, 'y': 7, 'ea0': 54, 'ea': 24, 'eb0': 1, 'eb': -2, 'a': 724, 'b': 68,
           'E': 49000}, '1', 'incorrect'),
     spec('BO : 59 437 ÷ 6 ≈ 10 000', 2,
          {'d': 6, 'q': 10, 'f0': 37, 'f': -563, 'N': 60000, 'n': 59437, 'E': 10000}, '0',
          'correct'),
     spec('Erreur : 1 000', 2,
          {'d': 6, 'q': 10, 'f0': 37, 'f': -563, 'N': 60000, 'n': 59437, 'E': 10000}, '2',
          'incorrect')],
    ESPACES))

# ---------------------------------------------------------------- 3. CM2-055 multiplication
POSE = 'Pose et calcule.\n\n```operation\ncalcul: '
MODELES.append(modele(
    '03-multiplication-posee-decimal-entier',
    'Poser la multiplication d\'un nombre décimal par un nombre entier',
    'Multiplication posée d\'un décimal par un entier de 2 ou 3 chiffres : 876 × 20,8 ;'
    ' 8,76 × 208',
    10, 180,
    [
        variation(
            POSE + '{{n}} × {{eval:T/10;d}}\n```',
            [var('n', '12..999'), var('T', '101..999')], [],
            ['On pose la multiplication comme avec des nombres entiers, sans s\'occuper de la'
             ' virgule.',
             '${{n}} \\times {{T}} = {{eval:n*T}}$.',
             '${{eval:T/10;d}}$ a un chiffre après la virgule : le produit en a un aussi.',
             '$${{n}} \\times {{eval:T/10;d}} = ' + VERT + '{{{eval:n*T/10;d}}}$$'],
            ['mod(n,10) != 0', 'mod(T,10) != 0', 'mod(n*T,10) != 0']),
        variation(
            POSE + '{{eval:C/100;d}} × {{n}}\n```',
            [var('C', '101..9999'), var('n', '12..999')], [],
            ['On pose la multiplication comme avec des nombres entiers, sans s\'occuper de la'
             ' virgule.',
             '${{C}} \\times {{n}} = {{eval:C*n}}$.',
             '${{eval:C/100;d}}$ a deux chiffres après la virgule : le produit en a deux aussi.',
             '$${{eval:C/100;d}} \\times {{n}} = ' + VERT + '{{{eval:C*n/100;d}}}$$'],
            ['mod(C,10) != 0', 'mod(n,10) != 0', 'mod(C*n,10) != 0']),
    ],
    [spec('BO : 876 × 20,8 = 18 220,8', 0, {'n': 876, 'T': 208}, '18 220,8', 'correct'),
     spec('Erreur : virgule oubliée, 182 208', 0, {'n': 876, 'T': 208}, '182 208', 'incorrect'),
     spec('Erreur : virgule décalée, 1 822,08', 0, {'n': 876, 'T': 208}, '1 822,08',
          'incorrect'),
     spec('BO : 8,76 × 208 = 1 822,08', 1, {'C': 876, 'n': 208}, '1 822,08', 'correct'),
     spec('Erreur : une décimale seulement, 18 220,8', 1, {'C': 876, 'n': 208}, '18 220,8',
          'incorrect')],
    ESPACES))

# ---------------------------------------------------------------- 4. CM2-056 division, dividende entier
DIV = 'Pose et effectue la division. Continue après la virgule jusqu\'à ce que le reste soit nul.'


def bloc_div(dividende):
    return DIV + '\n\n```operation\ncalcul: ' + dividende + ' ÷ {{d}}\nquotient: décimal\n```'


VERIF_ENTIER = 'On vérifie : ${{d}} \\times {{eval:N/d;d}} = {{N}}$.'
MODELES.append(modele(
    '04-division-decimale-dividende-entier',
    'Poser une division décimale : dividende entier',
    'Division posée d\'un entier de 3 à 5 chiffres par 2, 4, 5, 6 ou 8, quotient décimal qui'
    ' s\'arrête au dixième (9 855 ÷ 6) ou au centième (785 ÷ 4)',
    9, 240,
    [
        variation(
            bloc_div('{{N}}'),
            [var('k', '1..5'), var('d', si('k', ['2', '4', '5', '6', '8'])),
             var('N', '100..99999')], [],
            ['Arrivé au chiffre des unités, il reste ${{eval:mod(N,d)}}$ : on écrit la virgule au'
             ' quotient, puis un zéro après la virgule du dividende (${{N}} = {{N}}{,}0$), et on'
             ' continue.',
             'Le reste devient nul au chiffre des dixièmes.',
             '$${{N}} \\div {{d}} = ' + VERT + '{{{eval:N/d;d}}}$$',
             VERIF_ENTIER],
            ['mod(N,d) != 0', 'mod(10*N,d) == 0']),
        variation(
            bloc_div('{{N}}'),
            [var('k', '1..2'), var('d', si('k', ['4', '8'])), var('N', '100..9999')], [],
            ['Arrivé au chiffre des unités, il reste ${{eval:mod(N,d)}}$ : on écrit la virgule au'
             ' quotient, puis des zéros après la virgule du dividende (${{N}} = {{N}}{,}00$), et on'
             ' continue.',
             'Le reste devient nul au chiffre des centièmes.',
             '$${{N}} \\div {{d}} = ' + VERT + '{{{eval:N/d;d}}}$$',
             VERIF_ENTIER],
            ['mod(10*N,d) != 0', 'mod(100*N,d) == 0']),
    ],
    [spec('BO : 9 855 ÷ 6 = 1 642,5', 0, {'k': 4, 'd': 6, 'N': 9855}, '1 642,5', 'correct'),
     spec('Erreur : arrêtée au reste, 1 642', 0, {'k': 4, 'd': 6, 'N': 9855}, '1 642',
          'incorrect'),
     spec('Erreur : virgule oubliée, 16 425', 0, {'k': 4, 'd': 6, 'N': 9855}, '16 425',
          'incorrect'),
     spec('BO : 785 ÷ 4 = 196,25', 1, {'k': 1, 'd': 4, 'N': 785}, '196,25', 'correct'),
     spec('Erreur : arrêtée au dixième, 196,2', 1, {'k': 1, 'd': 4, 'N': 785}, '196,2',
          'incorrect')]))

# ---------------------------------------------------------------- 5. CM2-057 division, dividende décimal
MODELES.append(modele(
    '05-division-decimale-dividende-decimal',
    'Poser une division décimale : dividende décimal',
    'Division posée d\'un décimal d\'au plus cinq chiffres par un nombre à un chiffre, quotient'
    ' qui s\'arrête au centième : 45,36 ÷ 4 ; 2,45 ÷ 7 ; un zéro à ajouter (148,2 ÷ 5)',
    10, 240,
    [
        variation(
            bloc_div('{{eval:M/100;d}}'),
            [var('d', '2..9'), var('M', '100..99999')], [],
            ['On divise d\'abord la partie entière ; quand on abaisse le chiffre des dixièmes, on'
             ' écrit la virgule au quotient.',
             'Le reste devient nul au chiffre des centièmes.',
             '$${{eval:M/100;d}} \\div {{d}} = ' + VERT + '{{{eval:M/d/100;d}}}$$',
             'On vérifie : ${{d}} \\times {{eval:M/d/100;d}} = {{eval:M/100;d}}$.'],
            ['mod(M,d) == 0', 'mod(M,10) != 0']),
        variation(
            bloc_div('{{eval:T/10;d}}'),
            [var('k', '1..5'), var('d', si('k', ['2', '4', '5', '6', '8'])),
             var('T', '101..9999')], [],
            ['On divise d\'abord la partie entière ; quand on abaisse le chiffre des dixièmes, on'
             ' écrit la virgule au quotient.',
             'Après les dixièmes, il reste ${{eval:mod(T,d)}}$ : on ajoute un zéro au dividende'
             ' (${{eval:T/10;d}} = {{eval:T/10;d}}0$) et on continue jusqu\'aux centièmes.',
             '$${{eval:T/10;d}} \\div {{d}} = ' + VERT + '{{{eval:T/d/10;d}}}$$',
             'On vérifie : ${{d}} \\times {{eval:T/d/10;d}} = {{eval:T/10;d}}$.'],
            ['mod(T,10) != 0', 'mod(T,d) != 0', 'mod(10*T,d) == 0']),
    ],
    [spec('45,36 ÷ 4 = 11,34', 0, {'d': 4, 'M': 4536}, '11,34', 'correct'),
     spec('Erreur : virgule oubliée, 1 134', 0, {'d': 4, 'M': 4536}, '1 134', 'incorrect'),
     spec('2,45 ÷ 7 = 0,35', 0, {'d': 7, 'M': 245}, '0,35', 'correct'),
     spec('Erreur : 3,5 (zéro des unités oublié)', 0, {'d': 7, 'M': 245}, '3,5', 'incorrect'),
     spec('BO : 148,2 ÷ 5 = 29,64', 1, {'k': 3, 'd': 5, 'T': 1482}, '29,64', 'correct'),
     spec('Erreur : arrêtée au dixième, 29,6', 1, {'k': 3, 'd': 5, 'T': 1482}, '29,6',
          'incorrect'),
     spec('BO : 986,3 ÷ 5 = 197,26', 1, {'k': 3, 'd': 5, 'T': 9863}, '197,26', 'correct')]))


os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
