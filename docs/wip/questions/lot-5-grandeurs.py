"""Écrit les 9 modèles du lot 5 « Grandeurs » de la 5e dans scripts/questions/5-grandeurs/.

Phase 0 validée par David le 2026-10-30 (« go » sur les recos) ; un point par modèle :

| #  | Point | Titre | Réponse | Catégorie, niveau |
| 01 | 5-050 | Volume d'un cube ou d'un pavé droit | case, unité après | Grandeurs › Volumes › Volume d'un pavé droit, 1 |
| 02 | 5-108 | Volume d'un prisme droit | case, unité après | Grandeurs › Volumes › Volume d'un prisme droit, 1 |
| 03 | 5-052 | Aire d'un disque : valeur exacte | case (kπ) | Grandeurs › Aires › Aire d'un disque, 1 |
| 04 | 5-052 | Aire d'un disque avec π ≈ 3,14 | case | idem, 2 |
| 05 | 5-053 | Volume d'un cylindre : valeur exacte | case (kπ) | Grandeurs › Volumes › Volume d'un cylindre, 1 |
| 06 | 5-053 | Volume d'un cylindre avec π ≈ 3,14 | case | idem, 2 |
| 07 | 5-056 | Les angles de l'équerre | case, ° / choix | Grandeurs › Angles › Angles de l'équerre, 1 |
| 08 | 5-058 | Le troisième angle d'un triangle | case, ° | Géométrie › Triangles › Somme des angles, 1 |
| 09 | 5-074 | Problèmes de conversions d'aires | case, unité après | Grandeurs › Aires › Conversions, 1 |

Décisions (journal § 16) :
- pas de figure (les solides en perspective sont l'outil C2) : dimensions dans le texte ;
- π : niveau 1 valeur exacte « kπ » (de tête), niveau 2 π ≈ 3,14 avec r ∈ {1, 2, 3, 5, 10} ; pas
  d'arrondi à la calculatrice ;
- prisme : v1 aire de base donnée, v2 base triangle rectangle à calculer ;
- triangle : quelconque, isocèle (sommet donné, puis base donnée), rectangle, équilatéral ;
- valeur exacte : `products: off` (9 × π et π × 9 acceptés comme 9π, mesuré) ; une valeur
  approchée (28,26) y est refusée, 3²π est en `bad_form` (calcul pas fini) ;
- unité écrite après la case : la réponse attendue est le nombre seul ; degrés en `^{\\circ}`
  (collés au nombre, comme 57c73be1) ;
- variables `e` et `i` interdites ; lettres sans sens de probabilité.

    python3 docs/wip/questions/lot-5-grandeurs.py scripts/questions/5-grandeurs
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(v) for k, v in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(nom, title, description, theme, domain, subdomain, level, variations, specs,
           delay=60, options=None):
    m = {'title': title, 'description': description, 'grades': ['5'], 'theme': theme,
         'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': delay,
         'status': 'draft'}
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
    if answers is not None:
        v['blanks'] = [a if isinstance(a, dict) else {'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def choix(lignes, melanger=True):
    return '\n\n```choix\n' + ('' if melanger else 'melanger: non\n') + ''.join(
        '- ' + l + '\n' for l in lignes) + '```'


def u(x, unite):
    # Degrés collés au nombre, comme en prod (57c73be1) : 60°, pas « 60 ° »
    if unite == '°':
        return x + '^{\\circ}'
    return x + '~\\unit{' + unite + '}'


def m(x):
    """Formule mise en couleur, en ligne."""
    return '$' + col(x) + '$'


G = 'Grandeurs'
# Valeur exacte « kπ » : 9 × π et π × 9 valent 9π
EXACT = {'constraints': {'products': 'off'}}
MODELES = []

# --- 1. 5-050 : volume du cube et du pavé droit -------------------------------------------

PAVE_DEF = ('**Volume d\'un pavé droit.** $\\text{Volume} = \\text{longueur} \\times'
            ' \\text{largeur} \\times \\text{hauteur}$. Pour un cube d\'arête $a$ :'
            ' $\\text{Volume} = a \\times a \\times a = a^3$.')

CUBE = variation(
    'Quel est le volume d\'un **cube** d\'arête $' + u('{{a}}', 'cm') + '$ ?\n\n$'
    + u('?', 'cm^3') + '$',
    [var('a', '2..12')], ['{{eval:a^3}}'],
    [PAVE_DEF,
     '$' + u('{{a}}', 'cm') + ' \\times ' + u('{{a}}', 'cm') + ' \\times ' + u('{{a}}', 'cm')
     + ' = ' + col(u('{{eval:a^3}}', 'cm^3')) + '$.'])
PAVE_CM = variation(
    'Quel est le volume d\'un **pavé droit** de longueur $' + u('{{L}}', 'cm') + '$, de largeur $'
    + u('{{l}}', 'cm') + '$ et de hauteur $' + u('{{h}}', 'cm') + '$ ?\n\n$' + u('?', 'cm^3') + '$',
    [var('L', '4..15'), var('l', '2..10'), var('h', '2..12')], ['{{eval:L*l*h}}'],
    [PAVE_DEF,
     '$' + u('{{L}}', 'cm') + ' \\times ' + u('{{l}}', 'cm') + ' \\times ' + u('{{h}}', 'cm')
     + ' = ' + col(u('{{eval:L*l*h}}', 'cm^3')) + '$.'],
    ['l<L'])
PAVE_M = variation(
    'Une piscine a la forme d\'un **pavé droit** : $' + u('{{L}}', 'm') + '$ de long, $'
    + u('{{l}}', 'm') + '$ de large et $' + u('{{h}}', 'm') + '$ de profondeur.\n\nQuel est son'
    ' volume ?\n\n$' + u('?', 'm^3') + '$',
    [var('L', '6..25'), var('l', '3..12'), var('h', '1..3')], ['{{eval:L*l*h}}'],
    [PAVE_DEF,
     '$' + u('{{L}}', 'm') + ' \\times ' + u('{{l}}', 'm') + ' \\times ' + u('{{h}}', 'm')
     + ' = ' + col(u('{{eval:L*l*h}}', 'm^3')) + '$.'],
    ['l<L'])

MODELES.append(modele(
    '01-volume-cube-pave', 'Volume d\'un cube ou d\'un pavé droit',
    'Calculer le volume d\'un cube (arête 4 cm : 64 cm³) ou d\'un pavé droit (5 cm, 3 cm, 2 cm :'
    ' 30 cm³)',
    G, 'Volumes', 'Volume d\'un pavé droit', 1,
    [CUBE, PAVE_CM, PAVE_M],
    [spec('Cube d\'arête 4 : 64', 0, {'a': 4}, '64', 'correct'),
     spec('Erreur : 12 (4 × 3)', 0, {'a': 4}, '12', 'incorrect'),
     spec('Erreur : 16 (une face)', 0, {'a': 4}, '16', 'incorrect'),
     spec('Pavé 5 × 3 × 2 : 30', 1, {'L': 5, 'l': 3, 'h': 2}, '30', 'correct'),
     spec('Erreur : 10 (5 + 3 + 2)', 1, {'L': 5, 'l': 3, 'h': 2}, '10', 'incorrect'),
     spec('Erreur : 15 (aire de la base)', 1, {'L': 5, 'l': 3, 'h': 2}, '15', 'incorrect'),
     spec('Piscine 10 × 4 × 2 : 80', 2, {'L': 10, 'l': 4, 'h': 2}, '80', 'correct'),
     spec('Erreur : 16', 2, {'L': 10, 'l': 4, 'h': 2}, '16', 'incorrect')]))

# --- 2. 5-108 : volume du prisme droit ----------------------------------------------------

PRISME_DEF = ('**Volume d\'un prisme droit.** $\\text{Volume} = \\text{aire de la base} \\times'
              ' \\text{hauteur}$.')

PRISME_BASE = variation(
    'Un **prisme droit** a une base d\'aire $' + u('{{B}}', 'cm^2') + '$ et une hauteur de $'
    + u('{{h}}', 'cm') + '$.\n\nQuel est son volume ?\n\n$' + u('?', 'cm^3') + '$',
    [var('B', '5..60'), var('h', '2..15')], ['{{eval:B*h}}'],
    [PRISME_DEF,
     '$' + u('{{B}}', 'cm^2') + ' \\times ' + u('{{h}}', 'cm') + ' = '
     + col(u('{{eval:B*h}}', 'cm^3')) + '$.'])
PRISME_TRIANGLE = variation(
    'Un **prisme droit** a pour base un **triangle rectangle** dont les côtés de l\'angle droit'
    ' mesurent $' + u('{{a}}', 'cm') + '$ et $' + u('{{b}}', 'cm') + '$. Sa hauteur est $'
    + u('{{h}}', 'cm') + '$.\n\nQuel est son volume ?\n\n$' + u('?', 'cm^3') + '$',
    [var('a', '2..12'), var('b', '2..12'), var('h', '2..12')], ['{{eval:a*b/2*h}}'],
    [PRISME_DEF,
     'Aire de la base : $\\dfrac{' + u('{{a}}', 'cm') + ' \\times ' + u('{{b}}', 'cm') + '}{2} = '
     + u('{{eval:a*b/2}}', 'cm^2') + '$.',
     'Volume : $' + u('{{eval:a*b/2}}', 'cm^2') + ' \\times ' + u('{{h}}', 'cm') + ' = '
     + col(u('{{eval:a*b/2*h}}', 'cm^3')) + '$.'],
    ['mod(a*b,2)==0', 'a!=b'])

MODELES.append(modele(
    '02-volume-prisme-droit', 'Volume d\'un prisme droit',
    'Calculer le volume d\'un prisme droit : aire de la base × hauteur (base 12 cm², hauteur'
    ' 5 cm : 60 cm³), la base pouvant être un triangle rectangle à calculer',
    G, 'Volumes', 'Volume d\'un prisme droit', 1,
    [PRISME_BASE, PRISME_TRIANGLE],
    [spec('Base 12, hauteur 5 : 60', 0, {'B': 12, 'h': 5}, '60', 'correct'),
     spec('Erreur : 17 (12 + 5)', 0, {'B': 12, 'h': 5}, '17', 'incorrect'),
     spec('Triangle 3 et 4, hauteur 10 : 60', 1, {'a': 3, 'b': 4, 'h': 10}, '60', 'correct'),
     spec('Erreur : 120 (oubli de la moitié)', 1, {'a': 3, 'b': 4, 'h': 10}, '120', 'incorrect'),
     spec('Erreur : 6 (aire de la base)', 1, {'a': 3, 'b': 4, 'h': 10}, '6', 'incorrect')],
    delay=90))

# --- 3 et 4. 5-052 : aire du disque -------------------------------------------------------

DISQUE_DEF = ('**Aire d\'un disque.** $\\text{Aire} = \\pi \\times \\text{rayon} \\times'
              ' \\text{rayon} = \\pi r^2$. Le rayon est la moitié du diamètre.')

DISQUE_RAYON = variation(
    'Donne la valeur **exacte** de l\'aire d\'un disque de rayon $' + u('{{r}}', 'cm')
    + '$ (en fonction de $\\pi$).\n\n$' + u('?', 'cm^2') + '$',
    [var('r', '2..10')], ['{{eval:r^2}}\\pi'],
    [DISQUE_DEF,
     '$\\pi \\times {{r}} \\times {{r}} = ' + col(u('{{eval:r^2}}\\pi', 'cm^2')) + '$.'])
DISQUE_DIAMETRE = variation(
    'Donne la valeur **exacte** de l\'aire d\'un disque de diamètre $' + u('{{d}}', 'cm')
    + '$ (en fonction de $\\pi$).\n\n$' + u('?', 'cm^2') + '$',
    [var('r', '2..10'), var('d', 'eval:2*r')], ['{{eval:r^2}}\\pi'],
    [DISQUE_DEF,
     'Le rayon est $' + u('{{d}}', 'cm') + ' \\div 2 = ' + u('{{r}}', 'cm') + '$.',
     '$\\pi \\times {{r}} \\times {{r}} = ' + col(u('{{eval:r^2}}\\pi', 'cm^2')) + '$.'])

MODELES.append(modele(
    '03-aire-disque-exacte', 'Aire d\'un disque : valeur exacte',
    'Donner l\'aire exacte d\'un disque en fonction de π, à partir du rayon (3 cm : 9π cm²) ou'
    ' du diamètre',
    G, 'Aires', 'Aire d\'un disque', 1,
    [DISQUE_RAYON, DISQUE_DIAMETRE],
    [spec('Rayon 3 : 9π', 0, {'r': 3}, '9\\pi', 'correct'),
     spec('Erreur : 6π (périmètre)', 0, {'r': 3}, '6\\pi', 'incorrect'),
     spec('Erreur : 9 (π oublié)', 0, {'r': 3}, '9', 'incorrect'),
     spec('9 × π accepté', 0, {'r': 3}, '9\\times\\pi', 'correct'),
     spec('π × 9 accepté', 0, {'r': 3}, '\\pi\\times9', 'correct'),
     spec('Valeur approchée 28,26 refusée', 0, {'r': 3}, '28,26', 'incorrect'),
     spec('3²π : calcul pas fini', 0, {'r': 3}, '3^2\\pi', 'bad_form', ['form']),
     spec('Diamètre 10 : 25π', 1, {'r': 5, 'd': 10}, '25\\pi', 'correct'),
     spec('Erreur : 100π (diamètre au carré)', 1, {'r': 5, 'd': 10}, '100\\pi', 'incorrect'),
     spec('Erreur : 10π', 1, {'r': 5, 'd': 10}, '10\\pi', 'incorrect')],
    options=EXACT))

PI_DEF = DISQUE_DEF + ' On prend $\\pi \\approx 3{,}14$.'
DISQUE_RAYON_APPROCHE = variation(
    'Calcule l\'aire d\'un disque de rayon $' + u('{{r}}', 'cm') + '$, en prenant $\\pi \\approx'
    ' 3{,}14$.\n\n$' + u('?', 'cm^2') + '$',
    [var('r', '1|2|3|5|10')], ['{{eval:314*r^2/100;d}}'],
    [PI_DEF,
     '$3{,}14 \\times {{r}} \\times {{r}} = ' + col(u('{{eval:314*r^2/100;d}}', 'cm^2')) + '$.'])
DISQUE_DIAMETRE_APPROCHE = variation(
    'Calcule l\'aire d\'un disque de diamètre $' + u('{{d}}', 'cm') + '$, en prenant $\\pi'
    ' \\approx 3{,}14$.\n\n$' + u('?', 'cm^2') + '$',
    [var('r', '1|2|3|5|10'), var('d', 'eval:2*r')], ['{{eval:314*r^2/100;d}}'],
    [PI_DEF,
     'Le rayon est $' + u('{{d}}', 'cm') + ' \\div 2 = ' + u('{{r}}', 'cm') + '$.',
     '$3{,}14 \\times {{r}} \\times {{r}} = ' + col(u('{{eval:314*r^2/100;d}}', 'cm^2')) + '$.'])

MODELES.append(modele(
    '04-aire-disque-approchee', 'Aire d\'un disque avec π ≈ 3,14',
    'Calculer l\'aire d\'un disque en prenant π ≈ 3,14 (rayon 5 cm : 78,5 cm²), à partir du'
    ' rayon ou du diamètre',
    G, 'Aires', 'Aire d\'un disque', 2,
    [DISQUE_RAYON_APPROCHE, DISQUE_DIAMETRE_APPROCHE],
    [spec('Rayon 5 : 78,5', 0, {'r': 5}, '78,5', 'correct'),
     spec('Erreur : 31,4 (périmètre)', 0, {'r': 5}, '31,4', 'incorrect'),
     spec('Erreur : 15,7', 0, {'r': 5}, '15,7', 'incorrect'),
     spec('Diamètre 6 : 28,26', 1, {'r': 3, 'd': 6}, '28,26', 'correct'),
     spec('Erreur : 113,04 (diamètre au carré)', 1, {'r': 3, 'd': 6}, '113,04', 'incorrect')],
    delay=90))

# --- 5 et 6. 5-053 : volume du cylindre ---------------------------------------------------

CYL_DEF = ('**Volume d\'un cylindre.** $\\text{Volume} = \\text{aire de la base} \\times'
           ' \\text{hauteur} = \\pi r^2 \\times h$.')

CYL_EXACT = variation(
    'Donne la valeur **exacte** du volume d\'un cylindre de rayon $' + u('{{r}}', 'cm')
    + '$ et de hauteur $' + u('{{h}}', 'cm') + '$ (en fonction de $\\pi$).\n\n$' + u('?', 'cm^3')
    + '$',
    [var('r', '1..6'), var('h', '2..10')], ['{{eval:r^2*h}}\\pi'],
    [CYL_DEF,
     'Aire de la base : $\\pi \\times {{r}} \\times {{r}} = ' + u('{{eval:r^2}}\\pi', 'cm^2') + '$.',
     'Volume : $' + u('{{eval:r^2}}\\pi', 'cm^2') + ' \\times ' + u('{{h}}', 'cm') + ' = '
     + col(u('{{eval:r^2*h}}\\pi', 'cm^3')) + '$.'],
    ['r!=h', 'r>=2 || h>=3'])
CYL_EXACT_DIAMETRE = variation(
    'Donne la valeur **exacte** du volume d\'un cylindre de diamètre $' + u('{{d}}', 'cm')
    + '$ et de hauteur $' + u('{{h}}', 'cm') + '$ (en fonction de $\\pi$).\n\n$' + u('?', 'cm^3')
    + '$',
    [var('r', '2..6'), var('d', 'eval:2*r'), var('h', '2..10')], ['{{eval:r^2*h}}\\pi'],
    [CYL_DEF,
     'Le rayon est $' + u('{{d}}', 'cm') + ' \\div 2 = ' + u('{{r}}', 'cm') + '$.',
     'Aire de la base : $\\pi \\times {{r}} \\times {{r}} = ' + u('{{eval:r^2}}\\pi', 'cm^2') + '$.',
     'Volume : $' + u('{{eval:r^2}}\\pi', 'cm^2') + ' \\times ' + u('{{h}}', 'cm') + ' = '
     + col(u('{{eval:r^2*h}}\\pi', 'cm^3')) + '$.'],
    ['d!=h'])

MODELES.append(modele(
    '05-volume-cylindre-exact', 'Volume d\'un cylindre : valeur exacte',
    'Donner le volume exact d\'un cylindre en fonction de π (rayon 3 cm, hauteur 5 cm : 45π cm³),'
    ' à partir du rayon ou du diamètre',
    G, 'Volumes', 'Volume d\'un cylindre', 1,
    [CYL_EXACT, CYL_EXACT_DIAMETRE],
    [spec('Rayon 3, hauteur 5 : 45π', 0, {'r': 3, 'h': 5}, '45\\pi', 'correct'),
     spec('Erreur : 30π (2 × 3 × 5)', 0, {'r': 3, 'h': 5}, '30\\pi', 'incorrect'),
     spec('Erreur : 9π (aire de la base)', 0, {'r': 3, 'h': 5}, '9\\pi', 'incorrect'),
     spec('45 × π accepté', 0, {'r': 3, 'h': 5}, '45\\times\\pi', 'correct'),
     spec('9π × 5 : calcul pas fini', 0, {'r': 3, 'h': 5}, '9\\pi\\times5', 'bad_form', ['form']),
     spec('Diamètre 4, hauteur 7 : 28π', 1, {'r': 2, 'd': 4, 'h': 7}, '28\\pi', 'correct'),
     spec('Erreur : 112π (diamètre au carré)', 1, {'r': 2, 'd': 4, 'h': 7}, '112\\pi',
          'incorrect')],
    delay=90, options=EXACT))

CYL_PI = CYL_DEF + ' On prend $\\pi \\approx 3{,}14$.'
CYL_APPROCHE = variation(
    'Calcule le volume d\'un cylindre de rayon $' + u('{{r}}', 'cm') + '$ et de hauteur $'
    + u('{{h}}', 'cm') + '$, en prenant $\\pi \\approx 3{,}14$.\n\n$' + u('?', 'cm^3') + '$',
    [var('r', '1|2|3|5|10'), var('h', '2..10')], ['{{eval:314*r^2*h/100;d}}'],
    [CYL_PI,
     'Aire de la base : $3{,}14 \\times {{r}} \\times {{r}} = ' + u('{{eval:314*r^2/100;d}}', 'cm^2')
     + '$.',
     'Volume : $' + u('{{eval:314*r^2/100;d}}', 'cm^2') + ' \\times ' + u('{{h}}', 'cm') + ' = '
     + col(u('{{eval:314*r^2*h/100;d}}', 'cm^3')) + '$.'])

MODELES.append(modele(
    '06-volume-cylindre-approche', 'Volume d\'un cylindre avec π ≈ 3,14',
    'Calculer le volume d\'un cylindre en prenant π ≈ 3,14 (rayon 10 cm, hauteur 2 cm :'
    ' 628 cm³)',
    G, 'Volumes', 'Volume d\'un cylindre', 2,
    [CYL_APPROCHE],
    [spec('Rayon 10, hauteur 2 : 628', 0, {'r': 10, 'h': 2}, '628', 'correct'),
     spec('Erreur : 314 (aire de la base)', 0, {'r': 10, 'h': 2}, '314', 'incorrect'),
     spec('Erreur : 125,6 (2πrh)', 0, {'r': 10, 'h': 2}, '125,6', 'incorrect'),
     spec('Rayon 3, hauteur 4 : 113,04', 0, {'r': 3, 'h': 4}, '113,04', 'correct')],
    delay=120))

# --- 7. 5-056 : les angles de l'équerre ---------------------------------------------------

EQUERRE_DEF = ('**Les équerres.** Une équerre a toujours un angle droit ($90^\\circ$). Les deux'
               ' autres angles mesurent $30^\\circ$ et $60^\\circ$, ou $45^\\circ$ et $45^\\circ$.')

EQUERRE_ISOCELE = variation(
    'Une équerre a un angle droit et deux autres angles **égaux**.\n\nCombien mesure chacun de ces'
    ' deux angles ?\n\n$' + u('?', '°') + '$',
    [], ['45'],
    [EQUERRE_DEF,
     'Les deux angles égaux mesurent ' + m(u('45', '°')) + ' chacun : $90 + 45 + 45 = 180$.'])
EQUERRE_30 = variation(
    'Une équerre a un angle droit et un angle de $' + u('{{a}}', '°') + '$.\n\nCombien mesure son'
    ' troisième angle ?\n\n$' + u('?', '°') + '$',
    [var('a', '30|60'), var('b', 'eval:90-a')], ['{{b}}'],
    [EQUERRE_DEF,
     'L\'équerre est celle à $30^\\circ$ et $60^\\circ$ : le troisième angle mesure '
     + m(u('{{b}}', '°')) + '.'])
EQUERRE_CHOIX = variation(
    'Avec laquelle de ces équerres peut-on tracer **directement** un angle de $' + u('{{a}}', '°')
    + '$ ?' + choix(['l\'équerre à $45^\\circ$ et $45^\\circ$',
                      'l\'équerre à $30^\\circ$ et $60^\\circ$'], melanger=False),
    [var('a', '30|60')], ['1'],
    [EQUERRE_DEF,
     'L\'angle de $' + u('{{a}}', '°') + '$ est sur ' + col('\\text{l\'équerre à } 30^\\circ'
                                                          ' \\text{ et } 60^\\circ').join('$$')
     + '.'])

MODELES.append(modele(
    '07-angles-equerre', 'Les angles de l\'équerre',
    'Connaître les angles des équerres : 90°, 30° et 60°, ou 90°, 45° et 45°',
    G, 'Angles', 'Angles de l\'équerre', 1,
    [EQUERRE_ISOCELE, EQUERRE_30, EQUERRE_CHOIX],
    [spec('Équerre isocèle : 45', 0, {}, '45', 'correct'),
     spec('Erreur : 90', 0, {}, '90', 'incorrect'),
     spec('Angle de 30 : 60', 1, {'a': 30, 'b': 60}, '60', 'correct'),
     spec('Erreur : 150 (180 − 30)', 1, {'a': 30, 'b': 60}, '150', 'incorrect'),
     spec('Angle de 60 : l\'équerre 30-60', 2, {'a': 60}, '1', 'correct'),
     spec('Erreur : l\'équerre 45-45', 2, {'a': 60}, '0', 'incorrect')],
    delay=20))

# --- 8. 5-058 : somme des angles d'un triangle --------------------------------------------

SOMME_DEF = '**Somme des angles.** Dans un triangle, la somme des trois angles vaut $180^\\circ$.'

TRI_QUELCONQUE = variation(
    'Dans un triangle $ABC$, $\\widehat{A} = ' + u('{{a}}', '°') + '$ et $\\widehat{B} = '
    + u('{{b}}', '°') + '$.\n\nCombien mesure $\\widehat{C}$ ?\n\n$\\widehat{C} = ' + u('?', '°')
    + '$',
    [var('a', '20..110'), var('b', '15..100'), var('c', 'eval:180-a-b')], ['{{c}}'],
    [SOMME_DEF,
     '$\\widehat{C} = 180 - {{a}} - {{b}} = ' + col(u('{{c}}', '°')) + '$.'],
    ['c>=10', 'a!=b', 'b!=c', 'a!=c'])
TRI_ISOCELE_SOMMET = variation(
    'Le triangle $ABC$ est **isocèle** en $A$, et $\\widehat{A} = ' + u('{{s}}', '°')
    + '$.\n\nCombien mesure $\\widehat{B}$ ?\n\n$\\widehat{B} = ' + u('?', '°') + '$',
    [var('s', '20..140'), var('b', 'eval:(180-s)/2')], ['{{b}}'],
    [SOMME_DEF,
     'Le triangle est isocèle en $A$ : ses angles $\\widehat{B}$ et $\\widehat{C}$ sont égaux.',
     'Ensemble, ils mesurent $180 - {{s}} = {{eval:180-s}}$, donc $\\widehat{B} = {{eval:180-s}}'
     ' \\div 2 = ' + col(u('{{b}}', '°')) + '$.'],
    ['mod(s,2)==0', 's!=60'])
TRI_ISOCELE_BASE = variation(
    'Le triangle $ABC$ est **isocèle** en $A$, et $\\widehat{B} = ' + u('{{b}}', '°')
    + '$.\n\nCombien mesure $\\widehat{A}$ ?\n\n$\\widehat{A} = ' + u('?', '°') + '$',
    [var('b', '20..80'), var('s', 'eval:180-2*b')], ['{{s}}'],
    [SOMME_DEF,
     'Le triangle est isocèle en $A$ : $\\widehat{C} = \\widehat{B} = ' + u('{{b}}', '°') + '$.',
     '$\\widehat{A} = 180 - {{b}} - {{b}} = ' + col(u('{{s}}', '°')) + '$.'],
    ['b!=60'])
TRI_RECTANGLE = variation(
    'Le triangle $ABC$ est **rectangle** en $A$, et $\\widehat{B} = ' + u('{{b}}', '°')
    + '$.\n\nCombien mesure $\\widehat{C}$ ?\n\n$\\widehat{C} = ' + u('?', '°') + '$',
    [var('b', '10..80'), var('c', 'eval:90-b')], ['{{c}}'],
    [SOMME_DEF,
     'Rectangle en $A$ : $\\widehat{A} = 90^\\circ$.',
     '$\\widehat{C} = 180 - 90 - {{b}} = ' + col(u('{{c}}', '°')) + '$.'],
    ['b!=45'])
TRI_EQUILATERAL = variation(
    'Le triangle $ABC$ est **équilatéral**.\n\nCombien mesure $\\widehat{A}$ ?\n\n$\\widehat{A} = '
    + u('?', '°') + '$',
    [], ['60'],
    [SOMME_DEF,
     'Ses trois angles sont égaux : $\\widehat{A} = 180 \\div 3 = ' + col(u('60', '°')) + '$.'])

MODELES.append(modele(
    '08-troisieme-angle-triangle', 'Le troisième angle d\'un triangle',
    'Utiliser la somme des angles d\'un triangle (180°) : deux angles de 40° et 65°, le troisième'
    ' mesure 75° ; cas du triangle isocèle, rectangle, équilatéral',
    'Géométrie', 'Triangles', 'Somme des angles', 1,
    [TRI_QUELCONQUE, TRI_ISOCELE_SOMMET, TRI_ISOCELE_BASE, TRI_RECTANGLE, TRI_EQUILATERAL],
    [spec('40 et 65 : 75', 0, {'a': 40, 'b': 65, 'c': 75}, '75', 'correct'),
     spec('Erreur : 105 (40 + 65)', 0, {'a': 40, 'b': 65, 'c': 75}, '105', 'incorrect'),
     spec('Isocèle, sommet 40 : 70', 1, {'s': 40, 'b': 70}, '70', 'correct'),
     spec('Erreur : 140 (sans diviser par 2)', 1, {'s': 40, 'b': 70}, '140', 'incorrect'),
     spec('Erreur : 40 (l\'angle recopié)', 1, {'s': 40, 'b': 70}, '40', 'incorrect'),
     spec('Isocèle, base 50 : 80', 2, {'b': 50, 's': 80}, '80', 'correct'),
     spec('Erreur : 130 (180 − 50)', 2, {'b': 50, 's': 80}, '130', 'incorrect'),
     spec('Rectangle, 35 : 55', 3, {'b': 35, 'c': 55}, '55', 'correct'),
     spec('Erreur : 145 (180 − 35)', 3, {'b': 35, 'c': 55}, '145', 'incorrect'),
     spec('Équilatéral : 60', 4, {}, '60', 'correct'),
     spec('Erreur : 180', 4, {}, '180', 'incorrect')],
    delay=45))

# --- 9. 5-074 : problèmes de conversions de longueurs et d'aires ---------------------------

CONV_DEF = ('**Conversions d\'aires.** $1~\\unit{m^2} = 100~\\unit{dm^2} = 10\\,000~\\unit{cm^2}$ ;'
            ' $1~\\unit{ha} = 10\\,000~\\unit{m^2}$. On convertit les longueurs **avant** de'
            ' calculer l\'aire.')

CONV_CARRELAGE = variation(
    'Une pièce rectangulaire mesure $' + u('{{L}}', 'm') + '$ sur $' + u('{{l}}', 'm') + '$. Un'
    ' carreau est un carré de $' + u('{{c}}', 'cm') + '$ de côté.\n\nCombien de carreaux faut-il'
    ' pour couvrir le sol ?\n\n$?$ carreaux',
    [var('L', '2..8'), var('l', '2..6'), var('c', '20|25|50'),
     var('n', 'eval:(100*L/c)*(100*l/c)')], ['{{n}}'],
    [CONV_DEF,
     'En centimètres, la pièce mesure $' + u('{{eval:100*L}}', 'cm') + '$ sur $'
     + u('{{eval:100*l}}', 'cm') + '$.',
     'Dans la longueur : ${{eval:100*L}} \\div {{c}} = {{eval:100*L/c}}$ carreaux ; dans la'
     ' largeur : ${{eval:100*l}} \\div {{c}} = {{eval:100*l/c}}$ carreaux.',
     'Il faut ${{eval:100*L/c}} \\times {{eval:100*l/c}} = ' + col('{{n}}') + '$ carreaux.'],
    ['l<L', 'mod(100*L,c)==0', 'mod(100*l,c)==0'])
CONV_TERRAIN = variation(
    'Un champ rectangulaire mesure $' + u('{{L}}', 'm') + '$ sur $' + u('{{l}}', 'm')
    + '$.\n\nQuelle est son aire en hectares ?\n\n$' + u('?', 'ha') + '$',
    [var('L', '100|200|250|400|500'), var('l', '50|100|200'),
     var('A', 'eval:L*l/10000;d')], ['{{A}}'],
    [CONV_DEF,
     'Aire : $' + u('{{L}}', 'm') + ' \\times ' + u('{{l}}', 'm') + ' = '
     + u('{{eval:L*l}}', 'm^2') + '$.',
     '$' + u('{{eval:L*l}}', 'm^2') + ' = ' + col(u('{{A}}', 'ha')) + '$ (on divise par'
     ' $10\\,000$).'],
    ['l<L'])
CONV_AFFICHE = variation(
    'Une affiche rectangulaire mesure $' + u('{{L}}', 'cm') + '$ sur $' + u('{{l}}', 'cm')
    + '$.\n\nQuelle est son aire en mètres carrés ?\n\n$' + u('?', 'm^2') + '$',
    [var('L', '50|60|80|100|120|150'), var('l', '20|40|50|60'),
     var('A', 'eval:L*l/10000;d')], ['{{A}}'],
    [CONV_DEF,
     'En mètres : $' + u('{{L}}', 'cm') + ' = ' + u('{{eval:L/100;d}}', 'm') + '$ et $'
     + u('{{l}}', 'cm') + ' = ' + u('{{eval:l/100;d}}', 'm') + '$.',
     '$' + u('{{eval:L/100;d}}', 'm') + ' \\times ' + u('{{eval:l/100;d}}', 'm') + ' = '
     + col(u('{{A}}', 'm^2')) + '$.'],
    ['l<L'])

MODELES.append(modele(
    '09-problemes-conversions-aires', 'Problèmes de conversions d\'aires',
    'Résoudre un problème qui demande de convertir des longueurs ou des aires : carreaux pour un'
    ' sol, aire d\'un champ en hectares, d\'une affiche en m²',
    G, 'Aires', 'Problèmes de conversions', 1,
    [CONV_CARRELAGE, CONV_TERRAIN, CONV_AFFICHE],
    [spec('Pièce 4 × 3, carreaux de 50 : 48', 0, {'L': 4, 'l': 3, 'c': 50, 'n': 48}, '48',
          'correct'),
     spec('Erreur : 12 (aire en m² seule)', 0, {'L': 4, 'l': 3, 'c': 50, 'n': 48}, '12',
          'incorrect'),
     spec('Champ 200 × 100 : 2 ha', 1, {'L': 200, 'l': 100, 'A': 2}, '2', 'correct'),
     spec('Erreur : 20 000 (en m²)', 1, {'L': 200, 'l': 100, 'A': 2}, '20000', 'incorrect'),
     spec('Erreur : 200 (÷ 100)', 1, {'L': 200, 'l': 100, 'A': 2}, '200', 'incorrect'),
     spec('Affiche 80 × 50 : 0,4 m²', 2, {'L': 80, 'l': 50, 'A': '0.4'}, '0,4', 'correct'),
     spec('Erreur : 40 (÷ 100)', 2, {'L': 80, 'l': 50, 'A': '0.4'}, '40', 'incorrect')],
    delay=120))

os.makedirs(DOSSIER, exist_ok=True)
for nom, mod in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(mod, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
