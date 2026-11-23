"""Écrit les 5 modèles du lot 9 du CM2 (partages) dans scripts/questions/cm2-9/.

Phase 0 du 2026-11-17 (§ 15 du journal `docs/archive/wip/questions-cm2-progress.md`), recommandations
suivies par David (§ 15.1) : grilles à lire jusqu'à 60 parts (lignes de 10 au-delà de 30) ; un
seul lot. Bornes : `cycle3.json`, CM2-131, 132 (dénominateur au plus 60), 136, 137, 143
(dixièmes ou centièmes). Un point par modèle ; le nœud et le tag sont posés par la migration de
rangement, après le `--publier`.

Jumeaux : `cm1-3c` (lire, colorier une fraction, une fraction décimale), `cm1-4/02` (colorier un
nombre décimal). Ce qui distingue le CM2 : grilles jusqu'à 60 parts, fractions plus grandes que
1 sur 2 ou 3 figures, centièmes au-delà de 1.

Décisions et pièges :
- `reducedFractions: off` partout (12/24 ou 1/2 : juste) ; lire : `requiredForm: 'fraction'`
  (virgule et « 1 + 3/4 » refusés) ;
- bloc ```partage (`docs/systeme/ubumark.md`) : `gris:` pour lire, `colorier:` pour représenter
  (la case est posée par le générateur, pas de `blanks`), `unites:` au-delà de 1 ;
- éparpillées : rangs (s + i × p) mod N + 1, i de 0 à g − 1, p premier avec N et p ≠ 1, N − 1 ;
  au plus 12 parts coloriées (au-delà, on ne compte plus des parts éparpillées une à une) ;
- énoncé « Colorie 3/8 de la figure », jamais « les 3/8 » ;
- niveaux : max + 1 de chaque nœud, relevés en prod le 2026-11-17 (« définition » 11,
  « écritures » 13).

    python3 docs/wip/questions/lot-cm2-9.py scripts/questions/cm2-9
"""

import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]
SANS_SIMPLIFIER = {'constraints': {'reducedFractions': 'off'}}


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(v) for k, v in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(nom, title, description, level, variations, specs, delay=45):
    return nom, {'title': title, 'description': description, 'grades': ['CM2'],
                 'level': level, 'delay': delay, 'status': 'draft',
                 'options': SANS_SIMPLIFIER, 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None):
    # Chaque `?` de l'énoncé est une case, dans l'ordre de `answers` ; `answers=None` : la case
    # vient du bloc (figure à colorier), sans `blanks[]`
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    if answers is not None:
        v['blanks'] = [a if isinstance(a, dict) else {'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def par(nom, valeurs, f):
    """f(valeur) selon la valeur tirée de `nom` : {{if:nom==v1|…|{{if:nom==v2|…|…}}}}."""
    valeurs = list(valeurs)
    texte = f(valeurs[-1])
    for x in reversed(valeurs[:-1]):
        texte = '{{if:' + nom + '==' + str(x) + '|' + f(x) + '|' + texte + '}}'
    return texte


def col(x, i=0):
    return '\\textcolor{{{color:primary.' + str(i) + '}}}{' + x + '}'


def frac(n, d):
    return '\\frac{' + n + '}{' + d + '}'


def fraction_exigee(attendue):
    # L'écriture à virgule et « 1 + 3/4 » sont refusées : le point travaillé est la fraction
    return {'expectedAnswer': attendue, 'requiredForm': 'fraction'}


def partage(*lignes):
    return '\n\n```partage\n' + ''.join(l + '\n' for l in lignes) + '```'


def rangs(n, depart=1):
    return ', '.join(str(i) for i in range(depart, depart + n))


def table(nom, index, valeurs):
    """Variable `nom` lue dans `valeurs` selon l'indice `index` tiré de 0 à len − 1."""
    return var(nom, par(index, range(len(valeurs)), lambda i: str(valeurs[i])))


MODELES = []
QUELLE = 'Quelle fraction de la figure est coloriée ?'
UNE_PART = ' : une part, c\'est $' + frac('1', '{{N}}') + '$ de la figure.'
COLORIEES = '${{g}}$ part{{if:g>1|s sont coloriées|est coloriée}} : $'
NOMS_PARTS = {2: 'demi', 3: 'tiers', 4: 'quart', 5: 'cinquième', 6: 'sixième', 8: 'huitième',
              9: 'neuvième', 10: 'dixième', 12: 'douzième'}

# --- 1. CM2-132 : quelle fraction de la figure est coloriée ? ------------------------------
# Grilles de 15 à 60 parts ; au-delà de 30, des lignes de 10 (on compte par dizaines).
GRILLES = [(3, 5), (4, 4), (3, 6), (4, 5), (3, 8), (4, 6), (5, 5), (3, 10), (4, 8), (4, 10),
           (5, 8), (5, 10), (6, 10)]
GRILLES_VARS = [var('j', '0..' + str(len(GRILLES) - 1)),
                table('l', 'j', [l for l, _ in GRILLES]),
                table('c', 'j', [c for _, c in GRILLES]),
                var('N', 'eval:l*c')]
G_MAX = 12


def rangs_eparpilles(g):
    return ', '.join('{{eval:mod(s+' + str(i) + '*p,N)+1}}' for i in range(g))


LIRE_GRILLE = ('**La grille est partagée en ${{l}} \\times {{c}} = {{N}}$ parts égales**'
               + UNE_PART)
INTERPRETER = [
    variation(
        QUELLE + partage('forme: grille {{l}}×{{c}}', 'gris: {{g}}') + '\n\n$$?$$',
        GRILLES_VARS + [var('g', '1..{{eval:N-1}}')],
        [fraction_exigee('\\frac{{{g}}}{{{N}}}')],
        [LIRE_GRILLE,
         '{{if:c==10|On compte les lignes entières de $10$ parts, puis les parts qui restent. |}}'
         + COLORIEES + col(frac('{{g}}', '{{N}}')) + '$.']),
    variation(
        QUELLE + partage('forme: grille {{l}}×{{c}}',
                         'gris: ' + par('g', range(2, G_MAX + 1), rangs_eparpilles))
        + '\n\n$$?$$',
        GRILLES_VARS + [var('g', '2..' + str(G_MAX)), var('p', '2..{{eval:N-2}}'),
                        var('s', '0..{{eval:N-1}}')],
        [fraction_exigee('\\frac{{{g}}}{{{N}}}')],
        [LIRE_GRILLE,
         'Les parts coloriées ne se suivent pas : on les compte une par une. Il y en a ${{g}}$ :'
         ' $' + col(frac('{{g}}', '{{N}}')) + '$.'],
        ['gcd(p,N)==1']),
    variation(
        'Chaque figure est une unité. Quelle fraction de l\'unité est coloriée ?'
        + partage('forme: {{if:k==0|bande|disque}} {{d}}', 'unites: {{u}}', 'gris: {{g}}')
        + '\n\n$$?$$',
        [var('k', '0..1'), var('d', '3..12'), var('u', '2..3'),
         var('g', '{{eval:d+1}}..{{eval:u*d-1}}')],
        [fraction_exigee('\\frac{{{g}}}{{{d}}}')],
        ['**Chaque figure est partagée en ${{d}}$ parts égales** : une part, c\'est $'
         + frac('1', '{{d}}') + '$ de l\'unité.',
         'On compte toutes les parts coloriées, sur toutes les figures : il y en a ${{g}}$.',
         '$$' + col(frac('{{g}}', '{{d}}')) + '$$',
         'La fraction est plus grande que $1$ : plus d\'une figure est coloriée.'],
        ['mod(g,d)!=0']),
]

EX_GRILLE = {'j': 5, 'l': 4, 'c': 6, 'N': 24, 'g': 17}
EX_DIX = {'j': 12, 'l': 6, 'c': 10, 'N': 60, 'g': 30}
EX_EPARS = {'j': 5, 'l': 4, 'c': 6, 'N': 24, 'g': 5, 'p': 5, 's': 0}
EX_PLUS = {'k': 0, 'd': 4, 'u': 3, 'g': 11}
MODELES.append(modele(
    '01-quelle-fraction-est-coloriee', 'Quelle fraction de la figure est coloriée ?',
    'Lire une fraction sur une grille partagée en 15 à 60 parts égales (parts d\'affilée ou'
    ' éparpillées) ; au-delà de 1, sur 2 ou 3 bandes ou disques (11/4)',
    12, INTERPRETER,
    [spec('17 parts sur 24 : 17/24', 0, EX_GRILLE, '\\frac{17}{24}', 'correct'),
     spec('Erreur : 17/7 (coloriées sur non coloriées)', 0, EX_GRILLE, '\\frac{17}{7}',
          'incorrect'),
     spec('Erreur : 17/10 (lignes plus colonnes)', 0, EX_GRILLE, '\\frac{17}{10}', 'incorrect'),
     spec('30 parts sur 60 : 30/60', 0, EX_DIX, '\\frac{30}{60}', 'correct'),
     spec('1/2 : même fraction, juste', 0, EX_DIX, '\\frac{1}{2}', 'correct'),
     spec('Forme : 0,5 (écriture à virgule)', 0, EX_DIX, '0.5', 'bad_form', ['form']),
     spec('Éparpillées, 5 parts sur 24 : 5/24', 1, EX_EPARS, '\\frac{5}{24}', 'correct'),
     spec('Erreur : 1/24 (un seul bloc compté)', 1, EX_EPARS, '\\frac{1}{24}', 'incorrect'),
     spec('Trois bandes de 4, 11 parts : 11/4', 2, EX_PLUS, '\\frac{11}{4}', 'correct'),
     spec('Erreur : 11/12 (les trois bandes prises pour l\'unité)', 2, EX_PLUS,
          '\\frac{11}{12}', 'incorrect'),
     spec('Forme : 2 + 3/4 refusé', 2, EX_PLUS, '2+\\frac{3}{4}', 'bad_form', ['form'])]))


# --- 2. CM2-131 : colorier une fraction d'une figure ----------------------------------------
# V1 : la grille a k × d parts, d ≤ 12 (3/4 sur 24 parts) ; triplets (l, c, d), d divise l × c.
EQUIV = [(4, 6, 3), (4, 6, 4), (4, 6, 8), (3, 8, 4), (3, 8, 6), (4, 5, 4), (4, 5, 5),
         (3, 10, 6), (4, 10, 5), (4, 10, 8), (5, 8, 8), (5, 10, 10), (6, 10, 12), (6, 10, 5),
         (3, 6, 9)]
EQUIV_VARS = [var('j', '0..' + str(len(EQUIV) - 1)),
              table('l', 'j', [t[0] for t in EQUIV]),
              table('c', 'j', [t[1] for t in EQUIV]),
              table('d', 'j', [t[2] for t in EQUIV]),
              var('N', 'eval:l*c'), var('m', 'eval:N/d'), var('n', '1..{{eval:d-1}}')]
COLORIER = [
    variation(
        'Colorie $' + frac('{{n}}', '{{d}}') + '$ de la figure.'
        + partage('forme: grille {{l}}×{{c}}', 'colorier: {{n}}/{{d}}'),
        EQUIV_VARS, None,
        ['**La grille a ${{N}}$ parts, pas ${{d}}$** : on les regroupe par ${{m}}$. $${{N}} = {{d}}'
         ' \\times {{m}}$$',
         'Un ' + par('d', sorted({t[2] for t in EQUIV}), lambda d: NOMS_PARTS[d])
         + ' de la figure, c\'est ${{m}}$ parts : $' + frac('{{n}}', '{{d}}') + ' = '
         + frac('{{eval:n*m}}', '{{N}}') + '$.',
         'On colorie $' + col('{{eval:n*m}}') + '$ part{{if:n*m>1|s|}}, n\'importe lesquelles.']),
    variation(
        'Colorie $' + frac('{{n}}', '{{N}}') + '$ de la figure.'
        + partage('forme: grille {{l}}×{{c}}', 'colorier: {{n}}/{{N}}'),
        GRILLES_VARS + [var('n', '1..{{eval:N-1}}')], None,
        ['**La grille est partagée en ${{l}} \\times {{c}} = {{N}}$ parts égales**'
         + UNE_PART,
         'On colorie $' + col('{{n}}') + '$ part{{if:n>1|s|}}, n\'importe lesquelles.']),
    variation(
        'Chaque bande est une unité. Colorie $' + frac('{{n}}', '{{d}}') + '$ de l\'unité.'
        + partage('forme: bande {{d}}', 'unites: {{u}}', 'colorier: {{n}}/{{d}}'),
        [var('d', '3..8'), var('n', '{{eval:d+1}}..{{eval:3*d-1}}'),
         var('u', 'eval:(n-mod(n,d))/d+1')], None,
        ['**Chaque bande est partagée en ${{d}}$ parts égales** : une part, c\'est $'
         + frac('1', '{{d}}') + '$ de l\'unité.',
         '$' + frac('{{n}}', '{{d}}') + '$, c\'est ${{n}}$ parts : plus d\'une bande. On'
         ' colorie $' + col('{{n}}') + '$ parts, sur les bandes qu\'il faut.'],
        ['mod(n,d)!=0']),
]

EX_C34 = {'j': 1, 'l': 4, 'c': 6, 'd': 4, 'N': 24, 'm': 6, 'n': 3}
EX_C1724 = {'j': 5, 'l': 4, 'c': 6, 'N': 24, 'n': 17}
EX_C114 = {'d': 4, 'n': 11, 'u': 3}
MODELES.append(modele(
    '02-colorier-une-fraction', 'Colorier une fraction d\'une figure',
    'Colorier les parts d\'une grille pour représenter une fraction de dénominateur au plus 60 :'
    ' 3/4 sur 24 parts, 17/24 ; au-delà de 1, sur 2 ou 3 bandes (11/4)',
    13, COLORIER,
    [spec('3/4 sur 24 parts : 18 parts', 0, EX_C34, rangs(18), 'correct'),
     spec('18 parts quelconques', 0, EX_C34, rangs(18, 5), 'correct'),
     spec('Erreur : 3 parts (dénominateur lu comme le nombre de parts)', 0, EX_C34, rangs(3),
          'incorrect'),
     spec('17/24 : 17 parts', 1, EX_C1724, rangs(17), 'correct'),
     spec('Erreur : 7 parts (les non coloriées)', 1, EX_C1724, rangs(7), 'incorrect'),
     spec('11/4 : 11 parts sur trois bandes', 2, EX_C114, rangs(11), 'correct'),
     spec('Erreur : 3 parts (2 + 3/4 lu 3/4)', 2, EX_C114, rangs(3), 'incorrect'),
     spec('Rien colorié : case vide', 2, EX_C114, '', 'empty')],
    delay=60))


# --- 3. CM2-137 : quelle fraction décimale est coloriée ? ----------------------------------

QUELLE_DEC = QUELLE + ' Écris-la sous la forme d\'une fraction décimale.'
INTERPRETER_DECIMAL = [
    variation(
        QUELLE_DEC + partage('forme: grille 10×10', 'gris: {{g}}') + '\n\n$$?$$',
        [var('g', '11..99')],
        [fraction_exigee('\\frac{{{g}}}{100}')],
        ['La grille a $10 \\times 10 = 100$ cases : une case, c\'est un **centième**.',
         'On compte les lignes entières de $10$ cases, puis les cases qui restent : ${{g}}$ cases'
         ' sont coloriées.',
         '$$' + col(frac('{{g}}', '100')) + '$$'],
        ['mod(g,10)!=0']),
    variation(
        'Chaque bande est une unité. Quelle fraction de l\'unité est coloriée ? Écris-la sous la'
        ' forme d\'une fraction décimale.'
        + partage('forme: bande 10', 'unites: {{u}}', 'gris: {{g}}') + '\n\n$$?$$',
        [var('u', '2..3'), var('g', '11..{{eval:10*u-1}}')],
        [fraction_exigee('\\frac{{{g}}}{10}')],
        ['Chaque bande est partagée en $10$ parts égales : une part, c\'est un **dixième**.',
         'On compte toutes les parts coloriées, sur toutes les bandes : il y en a ${{g}}$.',
         '$$' + col(frac('{{g}}', '10')) + '$$'],
        ['mod(g,10)!=0']),
    variation(
        'Chaque grille est une unité. Quelle fraction de l\'unité est coloriée ? Écris-la sous la'
        ' forme d\'une fraction décimale.'
        + partage('forme: grille 10×10', 'unites: 2', 'gris: {{g}}') + '\n\n$$?$$',
        [var('g', '101..199')],
        [fraction_exigee('\\frac{{{g}}}{100}')],
        ['Chaque grille a $100$ cases : une case, c\'est un **centième**.',
         'La première grille est entièrement coloriée : $100$ cases. Sur la deuxième,'
         ' ${{eval:g-100}}$ cases. En tout, ${{g}}$ cases.',
         '$$' + col(frac('{{g}}', '100')) + '$$'],
        ['mod(g,10)!=0']),
]

MODELES.append(modele(
    '03-quelle-fraction-decimale-est-coloriee',
    'Quelle fraction décimale de la figure est coloriée ?',
    'Lire une fraction décimale sur une grille de 100 cases (37/100) ; au-delà de 1, sur 2 ou 3'
    ' bandes de 10 (23/10) ou sur 2 grilles (137/100)',
    14, INTERPRETER_DECIMAL,
    [spec('37 cases : 37/100', 0, {'g': 37}, '\\frac{37}{100}', 'correct'),
     spec('Erreur : 37/10', 0, {'g': 37}, '\\frac{37}{10}', 'incorrect'),
     spec('Forme : 0,37 (écriture à virgule)', 0, {'g': 37}, '0.37', 'bad_form', ['form']),
     spec('Deux bandes, 14 parts : 14/10', 1, {'u': 2, 'g': 14}, '\\frac{14}{10}', 'correct'),
     spec('Erreur : 14/20 (les deux bandes prises pour l\'unité)', 1, {'u': 2, 'g': 14},
          '\\frac{14}{20}', 'incorrect'),
     spec('Forme : 1 + 4/10 refusé', 1, {'u': 2, 'g': 14}, '1+\\frac{4}{10}', 'bad_form',
          ['form']),
     spec('Deux grilles, 137 cases : 137/100', 2, {'g': 137}, '\\frac{137}{100}', 'correct'),
     spec('Erreur : 37/100 (la grille pleine oubliée)', 2, {'g': 137}, '\\frac{37}{100}',
          'incorrect')]))


# --- 4. CM2-136 : colorier une fraction décimale -------------------------------------------

LIGNES = ('{{if:n>=10| : ${{eval:(n-mod(n,10))/10}}$ ligne{{if:n>=20|s|}} de $10$'
          '{{if:mod(n,10)>0|, puis ${{eval:mod(n,10)}}$ case{{if:mod(n,10)>1|s|}}|}}|}}')
COLORIER_DECIMAL = [
    variation(
        'Colorie $' + frac('{{n}}', '100') + '$ de la grille.'
        + partage('forme: grille 10×10', 'colorier: {{n}}/100'),
        [var('n', '11..99')], None,
        ['La grille a $100$ cases : une case, c\'est un centième.',
         'On colorie $' + col('{{n}}') + '$ cases' + LIGNES + '.'],
        ['mod(n,10)!=0']),
    variation(
        'Colorie $' + frac('{{n}}', '10') + '$ de la grille.'
        + partage('forme: grille 10×10', 'colorier: {{n}}/10'),
        [var('n', '1..9')], None,
        ['**Un dixième de la grille, c\'est une ligne de $10$ cases** : $' + frac('1', '10')
         + ' = ' + frac('10', '100') + '$.',
         '$' + frac('{{n}}', '10') + ' = ' + frac('{{eval:10*n}}', '100') + '$ : on colorie $'
         + col('{{eval:10*n}}') + '$ cases, ${{n}}$ ligne{{if:n>1|s|}}.']),
    variation(
        'Chaque bande est une unité. Colorie $' + frac('{{n}}', '10') + '$ de l\'unité.'
        + partage('forme: bande 10', 'unites: {{u}}', 'colorier: {{n}}/10'),
        [var('n', '11..29'), var('u', 'eval:(n-mod(n,10))/10+1')], None,
        ['Chaque bande est partagée en $10$ parts égales : une part, c\'est un dixième.',
         '$' + frac('{{n}}', '10') + '$, c\'est ${{n}}$ dixièmes : plus d\'une bande. On colorie $'
         + col('{{n}}') + '$ parts : ${{eval:(n-mod(n,10))/10}}$ bande{{if:n>=20|s|}} entière'
         '{{if:n>=20|s|}}, puis ${{eval:mod(n,10)}}$ part{{if:mod(n,10)>1|s|}}.'],
        ['mod(n,10)!=0']),
    variation(
        'Chaque grille est une unité. Colorie $' + frac('{{n}}', '100') + '$ de l\'unité.'
        + partage('forme: grille 10×10', 'unites: 2', 'colorier: {{n}}/100'),
        [var('n', '101..199')], None,
        ['Chaque grille a $100$ cases : une case, c\'est un centième.',
         '$' + frac('{{n}}', '100') + ' = ' + frac('100', '100') + ' + '
         + frac('{{eval:n-100}}', '100') + '$ : on colorie $' + col('1') + '$ grille entière,'
         ' puis $' + col('{{eval:n-100}}') + '$ cases de la deuxième.'],
        ['mod(n,10)!=0']),
]

MODELES.append(modele(
    '04-colorier-une-fraction-decimale', 'Colorier une fraction décimale d\'une figure',
    'Colorier une grille de 100 cases ou des bandes de 10 pour représenter une fraction'
    ' décimale : 37/100, 3/10 = 30 cases ; au-delà de 1 : 17/10, 124/100',
    15, COLORIER_DECIMAL,
    [spec('23 cases', 0, {'n': 23}, rangs(23), 'correct'),
     spec('Erreur : 32 cases (chiffres échangés)', 0, {'n': 23}, rangs(32), 'incorrect'),
     spec('3/10 de la grille : 30 cases', 1, {'n': 3}, rangs(30), 'correct'),
     spec('Erreur : 3 cases (dixièmes lus comme des centièmes)', 1, {'n': 3}, rangs(3),
          'incorrect'),
     spec('17/10 : une bande et 7 parts', 2, {'n': 17, 'u': 2}, rangs(17), 'correct'),
     spec('Erreur : 7 parts (l\'unité oubliée)', 2, {'n': 17, 'u': 2}, rangs(7), 'incorrect'),
     spec('124/100 : une grille et 24 cases', 3, {'n': 124}, rangs(124), 'correct'),
     spec('Erreur : 24 cases (la grille entière oubliée)', 3, {'n': 124}, rangs(24),
          'incorrect')],
    delay=90))


# --- 5. CM2-143 : colorier un nombre décimal -----------------------------------------------

COLORIE_X = 'Colorie ce qu\'il faut pour représenter le nombre ${{x}}$.'
COLORIER_NOMBRE = [
    variation(
        COLORIE_X + ' La grille est l\'unité.'
        + partage('forme: grille 10×10', 'colorier: {{n}}/100'),
        [var('n', '11..99'), var('x', 'eval:n/100;d')], None,
        ['La grille a $100$ cases : une case, c\'est un centième ; une ligne de $10$ cases,'
         ' un dixième.',
         '${{x}}$, c\'est ${{n}}$ centièmes : on colorie $' + col('{{n}}') + '$ cases' + LIGNES
         + '.'],
        ['mod(n,10)!=0']),
    variation(
        COLORIE_X + ' La grille est l\'unité.'
        + partage('forme: grille 10×10', 'colorier: {{n}}/10'),
        [var('n', '1..9'), var('x', 'eval:n/10;d')], None,
        ['La grille a $100$ cases : une ligne de $10$ cases, c\'est un dixième.',
         '${{x}} = ' + frac('{{n}}', '10') + ' = ' + frac('{{eval:10*n}}', '100')
         + '$ : on colorie $' + col('{{eval:10*n}}') + '$ cases, ${{n}}$ ligne{{if:n>1|s|}}.']),
    variation(
        COLORIE_X + ' Chaque grille est une unité.'
        + partage('forme: grille 10×10', 'unites: 2', 'colorier: {{eval:100+n}}/100'),
        [var('n', '11..99'), var('x', 'eval:1+n/100;d')], None,
        ['Chaque grille est une unité de $100$ cases : une case, c\'est un centième.',
         '${{x}} = 1 + ' + frac('{{n}}', '100') + '$ : on colorie $' + col('1') + '$ grille'
         ' entière, puis $' + col('{{n}}') + '$ cases de la deuxième.'],
        ['mod(n,10)!=0']),
    variation(
        COLORIE_X + ' Chaque bande est une unité.'
        + partage('forme: bande 10', 'unites: 3', 'colorier: {{eval:20+n}}/10'),
        [var('n', '1..9'), var('x', 'eval:2+n/10;d')], None,
        ['Chaque bande est une unité, partagée en $10$ parts égales : une part, c\'est un'
         ' dixième.',
         '${{x}} = 2 + ' + frac('{{n}}', '10') + '$ : on colorie $' + col('2') + '$ bandes'
         ' entières, puis $' + col('{{n}}') + '$ part{{if:n>1|s|}} de la troisième.']),
]

MODELES.append(modele(
    '05-colorier-un-nombre-decimal', 'Colorier un nombre décimal',
    'Représenter un nombre décimal en coloriant des grilles de 100 cases ou des bandes de 10 :'
    ' 0,37 ; 0,4 = 40 cases ; 1,37 ; 2,6',
    14, COLORIER_NOMBRE,
    [spec('0,37 : 37 cases', 0, {'n': 37, 'x': '0.37'}, rangs(37), 'correct'),
     spec('Erreur : 3 cases (centièmes lus comme des dixièmes)', 0, {'n': 37, 'x': '0.37'},
          rangs(3), 'incorrect'),
     spec('0,4 : 40 cases', 1, {'n': 4, 'x': '0.4'}, rangs(40), 'correct'),
     spec('Erreur : 4 cases', 1, {'n': 4, 'x': '0.4'}, rangs(4), 'incorrect'),
     spec('1,37 : une grille et 37 cases', 2, {'n': 37, 'x': '1.37'}, rangs(137), 'correct'),
     spec('Erreur : 37 cases (unité oubliée)', 2, {'n': 37, 'x': '1.37'}, rangs(37),
          'incorrect'),
     spec('2,6 : deux bandes et 6 parts', 3, {'n': 6, 'x': '2.6'}, rangs(26), 'correct'),
     spec('Erreur : 6 parts (unités oubliées)', 3, {'n': 6, 'x': '2.6'}, rangs(6), 'incorrect')],
    delay=90))


os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
