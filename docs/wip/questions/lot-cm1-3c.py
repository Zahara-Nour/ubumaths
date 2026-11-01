"""Écrit les 4 modèles du lot 3c du CM1 (partages) dans scripts/questions/cm1-3c/.

Phase 0 du 2026-11-01 (§ 11 du journal `docs/wip/questions-cm1-progress.md`), suivie par David
(« je te suis ») : sous-domaine neuf « Partage » (Fractions / Apprivoiser) ; parts coloriées
d'affilée, éparpillées dans une variation de plus quand le tirage se fait sans outil neuf ;
« 1 + 3/4 » refusé (`requiredForm: 'fraction'`), entier + fraction est le point 147.
Bornes : `cycle3.json`, CM1 (144, 145 : dénominateur au plus 20 ; 149, 150 : dixièmes ou
centièmes). Un point par modèle ; le nœud et le tag sont posés par la migration de rangement,
après le `--publier`.

Décisions et pièges :
- jumeau des lots 3a et 3b (`lot-cm1-3b.py`) ; `reducedFractions: off` partout (4/8 ou 1/2 :
  juste) ;
- bloc ```partage (`docs/systeme/ubumark.md`) : `gris:` pour lire, `colorier:` pour
  représenter (la case est posée par le générateur, `answers=None`), `unites:` au-delà de 1 ;
- éparpillées : rangs (s + i × p) mod N + 1, i de 0 à g − 1, avec p premier avec N (rangs deux
  à deux distincts) et p ≠ 1, N − 1 (sinon d'affilée) ;
- réponse d'une figure à colorier : les rangs coloriés, `1, 2, 3` ; jugée sur leur NOMBRE.

    python3 docs/wip/questions/lot-cm1-3c.py scripts/questions/cm1-3c
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


def modele(nom, title, description, level, variations, specs, delay=30):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (nœud du point) est posé par la migration
    return nom, {'title': title, 'description': description, 'grades': ['CM1'],
                 'theme': 'Fractions', 'domain': 'Apprivoiser', 'subdomain': 'Partage',
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


def rangs(n):
    return ', '.join(str(i) for i in range(1, n + 1))


MODELES = []
FORME_BD = '{{if:k==0|bande|disque}} {{d}}'
QUELLE = 'Quelle fraction de la figure est coloriée ?'
LIRE_PARTS = ('**La figure est partagée en ${{N}}$ parts égales** : une part, c\'est $'
              + frac('1', '{{N}}') + '$ de la figure.')

# --- 1. CM1-145 : quelle fraction de la figure est coloriée ? ------------------------------
# Grilles de 6 à 20 parts (l × c) ; éparpillées : bandes ou grilles de 5 à 12 parts dont le
# nombre de parts a un pas p ≠ 1, N − 1 premier avec lui.

GRILLES = [(2, 3), (2, 4), (2, 5), (3, 3), (3, 4), (2, 6), (3, 5), (4, 4), (4, 5), (2, 10)]
GRILLES_VARS = [var('j', '0..' + str(len(GRILLES) - 1)),
                var('l', par('j', range(len(GRILLES)), lambda j: str(GRILLES[j][0]))),
                var('c', par('j', range(len(GRILLES)), lambda j: str(GRILLES[j][1]))),
                var('N', 'eval:l*c')]
EPARPILLEES = [('bande 5', 5), ('bande 7', 7), ('bande 8', 8), ('bande 9', 9),
               ('bande 10', 10), ('bande 12', 12), ('grille 3×3', 9), ('grille 2×4', 8),
               ('grille 2×5', 10), ('grille 3×4', 12)]
G_MAX = 11


def rangs_eparpilles(g):
    return ', '.join('{{eval:mod(s+' + str(i) + '*p,N)+1}}' for i in range(g))


INTERPRETER = [
    variation(
        QUELLE + partage('forme: ' + FORME_BD, 'gris: {{g}}') + '\n\n$$?$$',
        [var('k', '0..1'), var('d', '2..12'), var('N', 'eval:d'), var('g', '1..{{eval:d-1}}')],
        [fraction_exigee('\\frac{{{g}}}{{{N}}}')],
        [LIRE_PARTS, '${{g}}$ part{{if:g>1|s sont coloriées|est coloriée}} : $' + col(frac('{{g}}', '{{N}}')) + '$.']),
    variation(
        QUELLE + partage('forme: grille {{l}}×{{c}}', 'gris: {{g}}') + '\n\n$$?$$',
        GRILLES_VARS + [var('g', '1..{{eval:N-1}}')],
        [fraction_exigee('\\frac{{{g}}}{{{N}}}')],
        ['**La figure est partagée en ${{l}} \\times {{c}} = {{N}}$ parts égales** : une part,'
         ' c\'est $' + frac('1', '{{N}}') + '$ de la figure.',
         '${{g}}$ part{{if:g>1|s sont coloriées|est coloriée}} : $' + col(frac('{{g}}', '{{N}}')) + '$.']),
    variation(
        'Chaque bande est une unité. Quelle fraction de l\'unité est coloriée ?'
        + partage('forme: bande {{d}}', 'unites: {{u}}', 'gris: {{g}}') + '\n\n$$?$$',
        [var('d', '2..6'), var('u', '2..3'), var('g', '{{eval:d+1}}..{{eval:u*d-1}}')],
        [fraction_exigee('\\frac{{{g}}}{{{d}}}')],
        ['**Chaque bande est partagée en ${{d}}$ parts égales** : une part, c\'est $'
         + frac('1', '{{d}}') + '$ de l\'unité.',
         'On compte toutes les parts coloriées, sur toutes les bandes : il y en a ${{g}}$.',
         '$$' + col(frac('{{g}}', '{{d}}')) + '$$',
         'La fraction est plus grande que $1$ : plus d\'une bande est coloriée.'],
        ['mod(g,d)!=0']),
    variation(
        QUELLE + partage('forme: ' + par('e', range(len(EPARPILLEES)),
                                         lambda e: EPARPILLEES[e][0]),
                         'gris: ' + par('g', range(2, G_MAX + 1), rangs_eparpilles))
        + '\n\n$$?$$',
        [var('e', '0..' + str(len(EPARPILLEES) - 1)),
         var('N', par('e', range(len(EPARPILLEES)), lambda e: str(EPARPILLEES[e][1]))),
         var('g', '2..{{eval:N-1}}'), var('p', '2..{{eval:N-2}}'), var('s', '0..{{eval:N-1}}')],
        [fraction_exigee('\\frac{{{g}}}{{{N}}}')],
        [LIRE_PARTS,
         'Les parts coloriées ne se suivent pas : on les compte une par une. Il y en a ${{g}}$ :'
         ' $' + col(frac('{{g}}', '{{N}}')) + '$.'],
        ['gcd(p,N)==1']),
]

EX_BANDE = {'k': 0, 'd': 8, 'N': 8, 'g': 3}
EX_MOITIE = {'k': 1, 'd': 8, 'N': 8, 'g': 4}
EX_GRILLE = {'j': 8, 'l': 4, 'c': 5, 'N': 20, 'g': 7}
EX_PLUS = {'d': 4, 'u': 2, 'g': 7}
EX_EPARS = {'e': 4, 'N': 10, 'g': 3, 'p': 3, 's': 0}
MODELES.append(modele(
    '01-quelle-fraction-est-coloriee', 'Quelle fraction de la figure est coloriée ?',
    'Lire une fraction sur une figure partagée en parts égales (bande, disque, grille ; parts'
    ' d\'affilée ou éparpillées), jusqu\'à 20 parts ; plusieurs bandes au-delà de 1 (7/4)',
    1, INTERPRETER,
    [spec('3 parts sur 8 : 3/8', 0, EX_BANDE, '\\frac{3}{8}', 'correct'),
     spec('Erreur : 3/5 (coloriées sur non coloriées)', 0, EX_BANDE, '\\frac{3}{5}',
          'incorrect'),
     spec('Erreur : 8/3 (inversée)', 0, EX_BANDE, '\\frac{8}{3}', 'incorrect'),
     spec('4/8 : juste', 0, EX_MOITIE, '\\frac{4}{8}', 'correct'),
     spec('1/2 : même fraction, juste', 0, EX_MOITIE, '\\frac{1}{2}', 'correct'),
     spec('Forme : 0,5 (écriture à virgule)', 0, EX_MOITIE, '0.5', 'bad_form', ['form']),
     spec('Grille 4×5 : 7/20', 1, EX_GRILLE, '\\frac{7}{20}', 'correct'),
     spec('Erreur : 7/9 (lignes plus colonnes)', 1, EX_GRILLE, '\\frac{7}{9}', 'incorrect'),
     spec('Deux bandes de 4, 7 parts : 7/4', 2, EX_PLUS, '\\frac{7}{4}', 'correct'),
     spec('Erreur : 7/8 (les deux bandes prises pour l\'unité)', 2, EX_PLUS, '\\frac{7}{8}',
          'incorrect'),
     spec('Forme : 1 + 3/4 refusé', 2, EX_PLUS, '1+\\frac{3}{4}', 'bad_form', ['form']),
     spec('Éparpillées, 3 parts sur 10 : 3/10', 3, EX_EPARS, '\\frac{3}{10}', 'correct'),
     spec('Erreur : 1/10 (un seul bloc compté)', 3, EX_EPARS, '\\frac{1}{10}', 'incorrect')]))


# --- 2. CM1-144 : colorier une fraction ----------------------------------------------------

COLORIE = 'Colorie $' + frac('{{n}}', '{{d}}') + '$ de la figure.'
COLORIER = [
    variation(
        COLORIE + partage('forme: ' + FORME_BD, 'colorier: {{n}}/{{d}}'),
        [var('k', '0..1'), var('d', '2..12'), var('n', '1..{{eval:d-1}}')], None,
        ['**La figure est partagée en ${{d}}$ parts égales** : une part, c\'est $'
         + frac('1', '{{d}}') + '$ de la figure.',
         'On colorie ' + '$' + col('{{n}}') + '$ part{{if:n>1|s|}}' + ', n\'importe lesquelles.']),
    variation(
        COLORIE + partage('forme: {{if:k==0|bande|disque}} {{N}}', 'colorier: {{n}}/{{d}}'),
        [var('k', '0..1'), var('d', '2..6'), var('m', '2..3'), var('N', 'eval:m*d'),
         var('n', '1..{{eval:d-1}}')], None,
        ['**La figure a ${{N}}$ parts, pas ${{d}}$** : on les regroupe par ${{m}}$. $${{N}} = {{d}}'
         ' \\times {{m}}$$',
         'Un ' + par('d', range(2, 7), lambda d: ['demi', 'tiers', 'quart', 'cinquième',
                                                    'sixième'][d - 2])
         + ' de la figure, c\'est ${{m}}$ parts : $' + frac('{{n}}', '{{d}}') + ' = '
         + frac('{{eval:n*m}}', '{{N}}') + '$.',
         'On colorie ' + '$' + col('{{eval:n*m}}') + '$ parts' + ', n\'importe lesquelles.'],
        ['N<=12']),
    variation(
        'Chaque bande est une unité. Colorie $' + frac('{{n}}', '{{d}}')
        + '$ de l\'unité.' + partage('forme: bande {{d}}', 'unites: {{u}}',
                                     'colorier: {{n}}/{{d}}'),
        [var('d', '2..6'), var('n', '{{eval:d+1}}..{{eval:3*d-1}}'),
         var('u', 'eval:(n-mod(n,d))/d+1')], None,
        ['**Chaque bande est partagée en ${{d}}$ parts égales** : une part, c\'est $'
         + frac('1', '{{d}}') + '$ de l\'unité.',
         '$' + frac('{{n}}', '{{d}}') + '$, c\'est ${{n}}$ parts : plus d\'une bande. On'
         ' colorie ' + '$' + col('{{n}}') + '$ parts' + ', sur les bandes qu\'il faut.'],
        ['mod(n,d)!=0']),
]

EX_C38 = {'k': 0, 'd': 8, 'n': 3}
EX_C34 = {'k': 0, 'd': 4, 'm': 2, 'N': 8, 'n': 3}
EX_C74 = {'d': 4, 'n': 7, 'u': 2}
MODELES.append(modele(
    '02-colorier-une-fraction', 'Colorier une fraction d\'une figure',
    'Colorier les parts d\'une figure partagée en parts égales pour représenter une fraction :'
    ' 3/8 sur 8 parts, 3/4 sur 8 parts, 7/4 sur deux bandes de 4',
    2, COLORIER,
    [spec('3 parts sur 8', 0, EX_C38, rangs(3), 'correct'),
     spec('3 parts quelconques', 0, EX_C38, '2, 5, 8', 'correct'),
     spec('Erreur : 5 parts (les non coloriées)', 0, EX_C38, rangs(5), 'incorrect'),
     spec('3/4 sur 8 parts : 6 parts', 1, EX_C34, rangs(6), 'correct'),
     spec('Erreur : 3 parts (dénominateur lu comme le nombre de parts)', 1, EX_C34, rangs(3),
          'incorrect'),
     spec('7/4 : 7 parts sur deux bandes', 2, EX_C74, rangs(7), 'correct'),
     spec('Erreur : 3 parts (1 + 3/4 lu 3/4)', 2, EX_C74, rangs(3), 'incorrect'),
     spec('Rien colorié : case vide', 2, EX_C74, '', 'empty')],
    delay=45))


# --- 3. CM1-150 : quelle fraction décimale est coloriée ? ----------------------------------

SENS_DECIMAL = ('Partagée en $10$ parts égales, une part est un **dixième** ; en $100$, un'
                ' **centième**.')
INTERPRETER_DECIMAL = [
    variation(
        QUELLE + ' Écris-la sous la forme d\'une fraction décimale.'
        + partage('forme: {{if:k==0|bande|disque}} 10', 'gris: {{g}}') + '\n\n$$?$$',
        [var('k', '0..1'), var('g', '1..9')],
        [fraction_exigee('\\frac{{{g}}}{10}')],
        [SENS_DECIMAL, 'La figure a $10$ parts, ${{g}}$ {{if:g>1|sont coloriées|est coloriée}} : $'
         + col(frac('{{g}}', '10')) + '$.']),
    variation(
        QUELLE + ' Écris-la sous la forme d\'une fraction décimale.'
        + partage('forme: grille 10×10', 'gris: {{g}}') + '\n\n$$?$$',
        [var('g', '1..99')],
        [fraction_exigee('\\frac{{{g}}}{100}')],
        [SENS_DECIMAL,
         'La grille a $10 \\times 10 = 100$ cases. {{if:g>=10|On compte les lignes entières de'
         ' $10$ cases, puis les cases qui restent : |}}${{g}}$ case{{if:g>1|s sont coloriées|est coloriée}}.',
         '$$' + col(frac('{{g}}', '100')) + '$$'],
        ['mod(g,10)!=0']),
]

MODELES.append(modele(
    '03-quelle-fraction-decimale-est-coloriee',
    'Quelle fraction décimale de la figure est coloriée ?',
    'Lire une fraction décimale sur une figure partagée en 10 parts (bande, disque) ou en 100'
    ' cases (grille 10 × 10) : 7/10, 37/100',
    3, INTERPRETER_DECIMAL,
    [spec('7 parts sur 10 : 7/10', 0, {'k': 0, 'g': 7}, '\\frac{7}{10}', 'correct'),
     spec('Erreur : 7/3 (coloriées sur non coloriées)', 0, {'k': 0, 'g': 7}, '\\frac{7}{3}',
          'incorrect'),
     spec('Forme : 0,7 (écriture à virgule)', 0, {'k': 0, 'g': 7}, '0.7', 'bad_form', ['form']),
     spec('37 cases : 37/100', 1, {'g': 37}, '\\frac{37}{100}', 'correct'),
     spec('Erreur : 37/10', 1, {'g': 37}, '\\frac{37}{10}', 'incorrect'),
     spec('Forme : 0,37 (écriture à virgule)', 1, {'g': 37}, '0.37', 'bad_form', ['form'])]))


# --- 4. CM1-149 : colorier une fraction décimale -------------------------------------------

COLORIER_DECIMAL = [
    variation(
        'Colorie $' + frac('{{n}}', '10') + '$ de la bande.'
        + partage('forme: bande 10', 'colorier: {{n}}/10'),
        [var('n', '1..9')], None,
        ['La bande est partagée en $10$ parts égales : une part, c\'est un dixième.',
         'On colorie ' + '$' + col('{{n}}') + '$ part{{if:n>1|s|}}' + '.']),
    variation(
        'Colorie $' + frac('{{n}}', '100') + '$ de la grille.'
        + partage('forme: grille 10×10', 'colorier: {{n}}/100'),
        [var('n', '1..99')], None,
        ['La grille a $100$ cases : une case, c\'est un centième.',
         'On colorie ' + '$' + col('{{n}}') + '$ case{{if:n>1|s|}}'
         + '{{if:n>=10| : ${{eval:(n-mod(n,10))/10}}$ ligne{{if:n>=20|s|}} de $10$'
           '{{if:mod(n,10)>0|, puis ${{eval:mod(n,10)}}$ case{{if:mod(n,10)>1|s|}}|}}|}}.'],
        ['mod(n,10)!=0']),
    variation(
        'Colorie $' + frac('{{n}}', '10') + '$ de la grille.'
        + partage('forme: grille 10×10', 'colorier: {{n}}/10'),
        [var('n', '1..9')], None,
        ['**Un dixième de la grille, c\'est une ligne de $10$ cases** : $' + frac('1', '10')
         + ' = ' + frac('10', '100') + '$.',
         '$' + frac('{{n}}', '10') + ' = ' + frac('{{eval:10*n}}', '100') + '$ : on colorie '
         + '$' + col('{{eval:10*n}}') + '$ cases' + ', ${{n}}$ ligne{{if:n>1|s|}}.']),
]

MODELES.append(modele(
    '04-colorier-une-fraction-decimale', 'Colorier une fraction décimale d\'une figure',
    'Colorier les parts d\'une bande de 10 ou les cases d\'une grille 10 × 10 pour représenter une'
    ' fraction décimale : 7/10, 37/100, 3/10 = 30 cases',
    4, COLORIER_DECIMAL,
    [spec('7 parts sur 10', 0, {'n': 7}, rangs(7), 'correct'),
     spec('Erreur : 3 parts', 0, {'n': 7}, rangs(3), 'incorrect'),
     spec('37 cases', 1, {'n': 37}, rangs(37), 'correct'),
     spec('Erreur : 73 cases', 1, {'n': 37}, rangs(73), 'incorrect'),
     spec('3/10 de la grille : 30 cases', 2, {'n': 3}, rangs(30), 'correct'),
     spec('Erreur : 3 cases (dixièmes lus comme des centièmes)', 2, {'n': 3}, rangs(3),
          'incorrect')],
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
