"""Écrit les 3 modèles du lot 10 « solides et fraction d'une fraction » de la 4e dans scripts/questions/4-lot-10/.

Phase 0 validée par David le 2026-11-02 (§ 50 du journal `docs/wip/questions-4-progress.md`), un
point par modèle :

| # | Point | Titre                                   | Catégorie, niveau                                   |
| 1 | 4-027 | Reconnaître une pyramide, un cône       | Géométrie › Solides › Pyramide et cône, 1           |
| 2 | 4-028 | Passer d'une représentation à l'autre   | Géométrie › Solides › Représentations, 1            |
| 3 | 4-074 | Représenter une fraction d'une fraction | Fractions › Calculer › Fraction d'une quantité, 9   |

Bornes (`cycle4.json`) : 027 « pyramide, cône de révolution » ; 028 « pavé droit, cube, cylindre de
révolution, prisme droit, pyramides, cônes de révolution » (BO c4 p. 14) ; 074 « carré unité ou
schéma en barres » (Exemples 2026 p. 16).

Décisions de David (2026-11-02) :
- 027 v5 SANS « le cône a-t-il des arêtes ? » (le BO ne tranche pas) ;
- 074 v1 : le geste `colorier:` juge le NOMBRE de parts coloriées, pas leur place : accepté, la
  correction dessine la bonne disposition (le rectangle) ;
- 028 v2 (un ```patron comme option d'un choix) : écrite, rendu vérifié par David en base locale,
  retirée si le rendu est mauvais.

Écarts d'écriture au § 50.3 (à dire à David) :
- 028 v5 coupée en deux variations (cylindre : une case ; pavé : deux cases) ;
- 028 v4 : le sommet visé ne peut pas être écrit sur le patron (refus du parseur, ses coins
  donneraient la réponse) : le cube ABCDEFGH est dessiné à côté, le patron n'écrit que A, B, C, D,
  et l'élève touche les faces qui contiennent E, F, G ou H ;
- 074 : la grille `b×d` a des cellules carrées, ce n'est un carré que si b = d (« du rectangle »
  sinon).

Pièges :
- case choix : la bonne réponse est écrite en premier (indice 0), le bloc mélange ;
- un bloc d'espace dans un choix : clôture à 4 accents graves (```` ````choix ````) ;
- π s'écrit « \\pi » dans un eval ; arrondi au dixième = round(10*(x))/10;d ;
- les cases d'un geste (```partage colorier:, ```patron designer:) ne s'écrivent pas dans blanks[] ;
- jamais de variable `e` ni `i`.

    python3 docs/wip/questions/lot-4-10.py scripts/questions/4-lot-10
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
    # theme, domain, subdomain : gardés en paramètres pour mémoire de la catégorie, mais pas écrits
    # dans le fichier (ADR 0035 : refusés à la lecture ; la place du modèle = son nœud).
    m = {'title': title, 'description': description, 'grades': ['4'], 'level': level,
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
    if answers:
        v['blanks'] = [{'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def ev(x):
    return '{{eval:' + x + '}}'


def frac(n, d):
    return '\\frac{ ' + n + ' }{ ' + d + ' }'


def selon(nom, valeurs):
    """Texte choisi par la variable nom ({{if}} mis bout à bout, jamais imbriqués)."""
    return ''.join('{{if:' + nom + '==' + str(j) + '|' + str(v) + '|}}' for j, v in enumerate(valeurs))


def choix(lignes):
    return '\n\n```choix\n' + ''.join('- ' + l + '\n' for l in lignes) + '```'


def bloc(genre, lignes):
    return '\n\n```' + genre + '\n' + '\n'.join(lignes) + '\n```\n\n'


def choix_blocs(genre, options):
    """Choix dont chaque option est un bloc d'espace (lignes du bloc par option)."""
    corps = ''
    for lignes in options:
        corps += '- ```' + genre + '\n' + ''.join('  ' + l + '\n' for l in lignes) + '  ```\n'
    return '\n\n````choix\n' + corps + '````'


MODELES = []

# --- 1. 4-027 : reconnaître une pyramide, un cône ----------------------------------------------

PYRAMIDE = ('**Pyramide** : une base qui est un **polygone**, et des faces latérales **triangulaires**'
            ' qui se rejoignent en un même point, le **sommet** de la pyramide.')
CONE = ('**Cône de révolution** : une base qui est un **disque**, et une surface **courbe** qui monte'
        ' jusqu\'à un point, le **sommet** du cône.')

# k = 0 pyramide à base carrée, 1 rectangle, 2 triangle, 3 cône
NOMMER = variation(
    'Comment s\'appelle ce solide ?'
    + bloc('solide', ['forme: ' + selon('k', ['pyramide carree {{a}} {{h}}',
                                              'pyramide rectangle {{a}} 2 {{h}}',
                                              'pyramide triangle {{a}} {{h}}',
                                              'cone {{r}} {{h}}'])])
    + choix(['{{if:k==3|un cône|une pyramide}}', '{{if:k==3|une pyramide|un prisme droit}}',
             '{{if:k==3|un cylindre|un cône}}', '{{if:k==3|un prisme droit|un cylindre}}']),
    [var('k', '0..3'), var('a', '3..5'), var('r', '2..3'), var('h', '4..6')], ['0'],
    ['{{if:k==3|' + CONE + '|' + PYRAMIDE + '}}',
     '{{if:k==3|Sa base est un disque et il n\'a qu\'un sommet : c\'est $' + col('\\text{un cône}')
     + '$. Un cylindre a **deux** disques.|Sa base est un'
     + selon('k', [' carré', ' rectangle', ' triangle', '']) + ' et ses faces latérales sont des'
     ' triangles : c\'est $' + col('\\text{une pyramide}') + '$. Un prisme droit a **deux** bases'
     ' et des faces latérales **rectangulaires**.}}'])

# t = 1 : trouver la pyramide ; t = 2 : trouver le cône ; q = base de la pyramide
TROUVER = variation(
    'Lequel de ces solides est {{if:t==1|une pyramide|un cône}} ?'
    + choix_blocs('solide', [
        ['forme: {{if:t==1|pyramide {{if:q==1|carree 3 4|triangle 3.5 4}}|cone 1.5 4}}'],
        ['forme: {{if:t==1|prisme triangle 3 3 4|cylindre 1.5 4}}'],
        ['forme: {{if:t==1|cone 1.5 4|pyramide carree 3 4}}'],
        ['forme: {{if:t==1|pave 3 3 4|boule 2}}']]),
    [var('t', '1|2'), var('q', '1|2')], ['0'],
    ['{{if:t==1|' + PYRAMIDE + '|' + CONE + '}}',
     '{{if:t==1|Le prisme a aussi des triangles, mais **deux** (ses bases), reliées par des'
     ' rectangles : il n\'a pas de sommet où tout se rejoint.|Le cylindre a aussi une base en'
     ' disque, mais **deux** bases, et pas de sommet.}}'])

# Pyramide SABCD : q = 1 sommet, 2 base, 3 faces latérales
SABCD = variation(
    'Voici la pyramide $SABCD$.'
    + bloc('solide', ['forme: {{if:k==0|pyramide carree 4 4|pyramide rectangle 5 3 4}}',
                      'sommets: S A B C D'])
    + selon('q', ['', 'Quel est le sommet de cette pyramide ?', 'Quelle est la base de cette pyramide ?',
                  'Quelle est la nature des faces latérales de cette pyramide ?'])
    + choix([selon('q', ['', 'le point $S$', 'la face $ABCD$', 'des triangles']),
             selon('q', ['', 'le point $A$', 'la face $SAB$', 'des rectangles']),
             selon('q', ['', 'le point $C$', 'la face $SBC$', 'des {{if:k==0|carrés|trapèzes}}']),
             selon('q', ['', 'la face $ABCD$', 'le point $S$', 'des parallélogrammes'])]),
    [var('k', '0..1'), var('q', '1..3')], ['0'],
    [PYRAMIDE,
     'Dans le nom $SABCD$, on écrit d\'abord le sommet $' + col('S') + '$, puis les sommets de la'
     ' base $ABCD$.',
     'La base $ABCD$ est un {{if:k==0|carré|rectangle}} ; les faces latérales $SAB$, $SBC$, $SCD$'
     ' et $SDA$ sont des triangles.'])

NOMS_BASE = ['', '', '', 'triangle', 'carré', 'pentagone', 'hexagone', 'heptagone', 'octogone']
COMPTER = variation(
    'La base d\'une pyramide est un ' + selon('n', NOMS_BASE) + ' : un polygone à ${{n}}$ côtés.'
    '{{if:n==3|' + bloc('solide', ['forme: pyramide triangle 4 4']) + '|}}'
    '{{if:n==4|' + bloc('solide', ['forme: pyramide carree 4 4']) + '|}}'
    '\n\nNombre de faces : $?$\n\nNombre d\'arêtes : $?$\n\nNombre de sommets : $?$',
    [var('n', '3..8')], [ev('n+1'), ev('2*n'), ev('n+1')],
    ['**Faces** : une face latérale par côté de la base, ${{n}}$, **plus la base** :'
     ' ${{n}} + 1 = ' + col(ev('n+1')) + '$.',
     '**Arêtes** : ${{n}}$ autour de la base, et ${{n}}$ qui montent au sommet :'
     ' ${{n}} + {{n}} = ' + col(ev('2*n'), 1) + '$.',
     '**Sommets** : les ${{n}}$ sommets de la base, **plus le sommet** de la pyramide :'
     ' ${{n}} + 1 = ' + col(ev('n+1'), 2) + '$.'])

# Cône : q = 1 nature de la base, 2 sommet (sans « a-t-il des arêtes ? », David 2026-11-02)
CONE_SO = variation(
    'Voici un cône de révolution.'
    + bloc('solide', ['forme: cone {{r}} {{h}}', 'sommets: S O'])
    + '{{if:q==1|Quelle est la nature de sa base ?|Quel est son sommet ?}}'
    + choix(['{{if:q==1|un disque|le point $S$}}', '{{if:q==1|un cercle|le point $O$}}',
             '{{if:q==1|un triangle|le cercle de la base}}',
             '{{if:q==1|un rectangle|il n\'a pas de sommet}}']),
    [var('q', '1|2'), var('r', '2..3'), var('h', '4..6')], ['0'],
    [CONE,
     '{{if:q==1|La base est la surface **pleine** : $' + col('\\text{un disque}') + '$. Le cercle'
     ' n\'en est que le bord.|Le sommet est le point $' + col('S') + '$, où la surface courbe se'
     ' referme. $O$ est le centre de la base.}}'])

MODELES.append(modele(
    '01-reconnaitre-pyramide-cone', 'Reconnaître une pyramide, un cône',
    'Reconnaître et nommer une pyramide ou un cône de révolution en perspective ; sommet, base et'
    ' faces latérales d\'une pyramide SABCD ; compter faces, arêtes et sommets d\'une pyramide ;'
    ' base et sommet d\'un cône',
    'Géométrie', 'Solides', 'Pyramide et cône', 1,
    [NOMMER, TROUVER, SABCD, COMPTER, CONE_SO],
    [spec('Pyramide à base carrée', 0, {'k': 0, 'a': 4, 'r': 2, 'h': 5}, '0', 'correct'),
     spec('Erreur : la pyramide prise pour un prisme', 0, {'k': 0, 'a': 4, 'r': 2, 'h': 5}, '1',
          'incorrect'),
     spec('Cône', 0, {'k': 3, 'a': 4, 'r': 2, 'h': 5}, '0', 'correct'),
     spec('Erreur : le cône pris pour un cylindre', 0, {'k': 3, 'a': 4, 'r': 2, 'h': 5}, '2',
          'incorrect'),
     spec('La pyramide parmi 4 solides', 1, {'t': 1, 'q': 1}, '0', 'correct'),
     spec('Erreur : le prisme pris pour une pyramide', 1, {'t': 1, 'q': 2}, '1', 'incorrect'),
     spec('Le cône parmi 4 solides', 1, {'t': 2, 'q': 1}, '0', 'correct'),
     spec('Erreur : le cylindre pris pour le cône', 1, {'t': 2, 'q': 1}, '1', 'incorrect'),
     spec('Sommet S', 2, {'k': 0, 'q': 1}, '0', 'correct'),
     spec('Erreur : A pris pour le sommet', 2, {'k': 0, 'q': 1}, '1', 'incorrect'),
     spec('Base ABCD', 2, {'k': 1, 'q': 2}, '0', 'correct'),
     spec('Erreur : une face latérale prise pour la base', 2, {'k': 1, 'q': 2}, '1', 'incorrect'),
     spec('Faces latérales : des triangles', 2, {'k': 0, 'q': 3}, '0', 'correct'),
     spec('Erreur : des rectangles (prisme)', 2, {'k': 0, 'q': 3}, '1', 'incorrect'),
     spec('Base pentagone : 6, 10, 6', 3, {'n': 5}, ['6', '10', '6'], 'correct'),
     spec('Erreur : base oubliée (5 faces)', 3, {'n': 5}, ['5', '10', '6'], 'incorrect'),
     spec('Erreur : n + 1 arêtes', 3, {'n': 5}, ['6', '6', '6'], 'incorrect'),
     spec('Base triangle, dessinée : 4, 6, 4', 3, {'n': 3}, ['4', '6', '4'], 'correct'),
     spec('Base du cône : un disque', 4, {'q': 1, 'r': 2, 'h': 5}, '0', 'correct'),
     spec('Erreur : un cercle', 4, {'q': 1, 'r': 2, 'h': 5}, '1', 'incorrect'),
     spec('Sommet du cône : S', 4, {'q': 2, 'r': 2, 'h': 5}, '0', 'correct'),
     spec('Erreur : le centre O', 4, {'q': 2, 'r': 2, 'h': 5}, '1', 'incorrect')],
    delay=60))

# --- 2. 4-028 : passer d'une représentation à l'autre ------------------------------------------

# Solides : 0 cube, 1 pavé, 2 prisme, 3 pyramide, 4 cylindre
SOLIDES = ['cube', 'pave 4 2 3', 'prisme triangle 3 2 4', 'pyramide carree 3 3', 'cylindre 1 3']
SOLIDES_3D = ['cube 3', 'pave 4 2 3', 'prisme triangle 3 2 4', 'pyramide carree 3 3', 'cylindre 1 3']
FORMES = ['{{f}}', '{{f}}', '{{g}}', '1', '1']
NOMS = ['un cube', 'un pavé droit', 'un prisme droit', 'une pyramide', 'un cylindre', 'un cône']
# Leurres par solide (indices dans NOMS ; 5 = cône)
LEURRES_NOM = [[0, 1, 3, 2], [1, 0, 2, 3], [2, 3, 1, 4], [3, 2, 5, 0], [4, 5, 2, 1]]
# Patrons proposés par solide (indices dans SOLIDES), le bon en premier
LEURRES_PATRON = [[0, 1, 3], [1, 0, 2], [2, 3, 1], [3, 2, 0], [4, 2, 1]]

PATRON_DEF = ('Un **patron** est un dessin à plat qui, plié le long des traits, forme le solide'
              ' sans recouvrement ni trou.')
INDICES = ('Indices : **6 faces** carrées → cube ; 6 faces rectangulaires → pavé droit ; **2'
           ' triangles** et des rectangles → prisme droit ; un polygone entouré de **triangles** →'
           ' pyramide ; **2 disques** et un rectangle → cylindre.')

PATRON_VERS_SOLIDE = variation(
    'On plie ce patron. Quel solide obtient-on ?'
    + bloc('patron', ['solide: ' + selon('k', SOLIDES), 'forme: ' + selon('k', FORMES)])
    + choix([selon('k', [NOMS[LEURRES_NOM[k][j]] for k in range(5)]) for j in range(4)]),
    [var('k', '0..4'), var('f', '1..11'), var('g', '1..2')], ['0'],
    [PATRON_DEF, INDICES,
     'Ce patron donne $' + col('\\text{' + selon('k', NOMS[:5]) + '}') + '$.'])

SOLIDE_VERS_PATRON = variation(
    'Lequel de ces patrons est celui de ce solide ?'
    + bloc('solide', ['forme: ' + selon('k', SOLIDES_3D)])
    + choix_blocs('patron', [
        ['solide: ' + selon('k', [SOLIDES[LEURRES_PATRON[k][j]] for k in range(5)]),
         'forme: ' + selon('k', [FORMES[LEURRES_PATRON[k][j]] for k in range(5)])]
        for j in range(3)]),
    [var('k', '0..4'), var('f', '1..11'), var('g', '1..2')], ['0'],
    [PATRON_DEF, INDICES,
     'Le solide est $' + col('\\text{' + selon('k', NOMS[:5]) + '}') + '$ : on cherche le patron'
     ' qui a les mêmes faces.'])

# Face opposée : c = 1 cube, 2 pavé ; f = forme ; m = face marquée
OPPOSEE = variation(
    'Ce patron se plie en {{if:c==1|un cube|un pavé droit}}. Touche la face qui sera **opposée** à'
    ' la face grise (la face d\'en face, qui ne la touche pas).'
    + bloc('patron', ['solide: {{if:c==1|cube|pave 4 2 3}}', 'forme: {{f}}', 'marquer: face {{m}}',
                      'designer: opposee']),
    [var('c', '1|2'), var('f', '1..11'), var('m', '1..6')], [],
    ['Une face a **4 voisines** (une arête commune) et **une seule** face opposée, qui ne la touche'
     ' pas une fois le patron plié.',
     'Sur le patron, deux faces séparées par une seule face, dans une même rangée, sont opposées :'
     ' on plie en pensée autour de la face grise.'])

# Faces qui contiennent un sommet : s = 0 E, 1 F, 2 G, 3 H
SOMMET = variation(
    'Voici le cube $ABCDEFGH$ et un de ses patrons, où l\'on a écrit les sommets $A$, $B$, $C$,'
    ' $D$.'
    + bloc('solide', ['forme: cube 3', 'sommets: A B C D E F G H'])
    + bloc('patron', ['solide: cube', 'forme: {{f}}', 'sommets: A B C D - - - -',
                      'designer: sommet ' + selon('s', 'EFGH')])
    + 'Touche les faces du patron qui contiennent le sommet $' + selon('s', 'EFGH') + '$.',
    [var('f', '1..11'), var('s', '0..3')], [],
    ['Un sommet du cube appartient à **3 faces**.',
     'Sur le cube, $' + selon('s', 'EFGH') + '$ est au-dessus de $' + selon('s', 'ABCD') + '$ : il'
     ' est sur la face du dessus $EFGH$ et sur les deux faces latérales qui contiennent $'
     + selon('s', 'ABCD') + '$.',
     'Sur le patron, on les repère en pliant en pensée autour de la face $ABCD$.'])

CYLINDRE = variation(
    'Voici le patron d\'un cylindre de révolution de rayon ${{r}}~\\unit{cm}$ et de hauteur'
    ' ${{h}}~\\unit{cm}$.'
    + bloc('patron', ['solide: cylindre {{r}} {{h}}', 'cotes: cm'])
    + 'Quelle est la longueur du rectangle, au dixième de centimètre ?\n\n$L \\approx ?~\\unit{cm}$',
    [var('r', '2..10'), var('h', '2..10')], [ev('round(10*(2*\\pi*r))/10;d')],
    ['Plié, le rectangle fait le tour du disque : sa longueur est le **périmètre** du cercle de'
     ' rayon ${{r}}~\\unit{cm}$.',
     '$$L = 2 \\times \\pi \\times {{r}} \\approx ' + col(ev('round(10*(2*\\pi*r))/10;d') + '~\\unit{cm}')
     + '$$'],
    ['abs(10*(2*\\pi*r) - round(10*(2*\\pi*r))) < 0.4'])

# Pavé l × p × h (l > p > h) ; w = 0 dessus (l × p), 1 devant (l × h), 2 droite (p × h)
PAVE = variation(
    'Voici un pavé droit et un de ses patrons.'
    + bloc('solide', ['forme: pave {{l}} {{p}} {{h}}', 'cotes: cm'])
    + bloc('patron', ['solide: pave {{l}} {{p}} {{h}}', 'forme: {{f}}',
                      'marquer: face ' + selon('w', ['dessus', 'devant', 'droite'])])
    + 'Quelles sont les dimensions de la face grise du patron ?\n\nLongueur : $?~\\unit{cm}$\n\n'
    'Largeur : $?~\\unit{cm}$',
    [var('l', '5..8'), var('p', '3..4'), var('h', '1..2'), var('f', '1..11'), var('w', '0..2')],
    [selon('w', ['{{l}}', '{{l}}', '{{p}}']), selon('w', ['{{p}}', '{{h}}', '{{h}}'])],
    ['Chaque face du patron est une face du pavé : elle a les dimensions d\'une face du solide.',
     'La face grise touche des faces de même longueur qu\'elle ; on compare ses côtés à ceux du'
     ' pavé : $' + col(selon('w', ['{{l}}', '{{l}}', '{{p}}'])) + '~\\unit{cm}$ sur $'
     + col(selon('w', ['{{p}}', '{{h}}', '{{h}}']), 1) + '~\\unit{cm}$.'])

MODELES.append(modele(
    '02-passer-representation-solide', 'Passer d\'une représentation à l\'autre',
    'Passer du patron au solide et du solide au patron : nommer le solide d\'un patron, choisir le'
    ' patron d\'un solide, désigner la face opposée ou les faces qui contiennent un sommet,'
    ' longueur du rectangle du patron d\'un cylindre, dimensions d\'une face du patron d\'un pavé',
    'Géométrie', 'Solides', 'Représentations', 1,
    [PATRON_VERS_SOLIDE, SOLIDE_VERS_PATRON, OPPOSEE, SOMMET, CYLINDRE, PAVE],
    [],  # complétées plus bas (faces attendues calculées par le parseur)
    delay=90))

# Faces attendues des gestes (calculées par le pliage, vérifiées par la simulation) :
# (numéros des faces à partir de 1, ordre de lecture) :
#   cube forme 1 (la croix), face 3 marquée → opposée 5, voisines 1, 2, 4, 6
#   pavé 4 2 3 forme 5, face 2 → opposée 4
#   cube forme 7, sommet G → faces 2, 4, 5 ; sommet C (au-dessous de G) → faces 1, 2, 5
SPECS_028 = [
    spec('Patron du cube', 0, {'k': 0, 'f': 3, 'g': 1}, '0', 'correct'),
    spec('Patron du pavé', 0, {'k': 1, 'f': 7, 'g': 1}, '0', 'correct'),
    spec('Erreur : le pavé pris pour un cube', 0, {'k': 1, 'f': 7, 'g': 1}, '1', 'incorrect'),
    spec('Patron de la pyramide', 0, {'k': 3, 'f': 1, 'g': 1}, '0', 'correct'),
    spec('Erreur : la pyramide prise pour un prisme', 0, {'k': 3, 'f': 1, 'g': 1}, '1', 'incorrect'),
    spec('Patron du cylindre', 0, {'k': 4, 'f': 1, 'g': 1}, '0', 'correct'),
    spec('Erreur : le cylindre pris pour un cône', 0, {'k': 4, 'f': 1, 'g': 1}, '1', 'incorrect'),
    spec('Le patron du prisme', 1, {'k': 2, 'f': 1, 'g': 2}, '0', 'correct'),
    spec('Erreur : le patron de la pyramide', 1, {'k': 2, 'f': 1, 'g': 2}, '1', 'incorrect'),
    spec('Le patron du cube', 1, {'k': 0, 'f': 4, 'g': 1}, '0', 'correct'),
    spec('Erreur : le patron du pavé pour le cube', 1, {'k': 0, 'f': 4, 'g': 1}, '1', 'incorrect'),
    spec('Face opposée à la face 3 de la croix : 5', 2, {'c': 1, 'f': 1, 'm': 3}, '5', 'correct'),
    spec('Erreur : la face voisine sur la bande', 2, {'c': 1, 'f': 1, 'm': 3}, '4', 'incorrect'),
    spec('Erreur : la face voisine du bas', 2, {'c': 1, 'f': 1, 'm': 3}, '6', 'incorrect'),
    spec('Pavé, forme 5, face 2 : opposée 4', 2, {'c': 2, 'f': 5, 'm': 2}, '4', 'correct'),
    spec('Faces qui contiennent G (forme 7) : 2, 4, 5', 3, {'f': 7, 's': 2}, '2,4,5', 'correct'),
    spec('Erreur : une seule face', 3, {'f': 7, 's': 2}, '2', 'incorrect'),
    spec('Erreur : les faces de C (au-dessous de G)', 3, {'f': 7, 's': 2}, '1,2,5', 'incorrect'),
    spec('Cylindre r = 3 : 18,8', 4, {'r': 3, 'h': 5}, '18{,}8', 'correct'),
    spec('Erreur : π × r', 4, {'r': 3, 'h': 5}, '9{,}4', 'incorrect'),
    spec('Erreur : 2 × r', 4, {'r': 3, 'h': 5}, '6', 'incorrect'),
    spec('Face du dessus 7 × 3', 5, {'l': 7, 'p': 3, 'h': 2, 'f': 2, 'w': 0}, ['7', '3'], 'correct'),
    spec('Erreur : la face de devant (7 × 2)', 5, {'l': 7, 'p': 3, 'h': 2, 'f': 2, 'w': 0},
         ['7', '2'], 'incorrect'),
    spec('Face de droite 3 × 2', 5, {'l': 7, 'p': 3, 'h': 2, 'f': 9, 'w': 2}, ['3', '2'], 'correct'),
]
MODELES[-1][1]['testSpecs'] = SPECS_028

# --- 3. 4-074 : représenter une fraction d'une fraction ----------------------------------------

def rectangle_gris(lignes_max=4, colonnes_max=4):
    """Rangs (grille b×d, ligne par ligne) du rectangle a lignes × c colonnes en haut à gauche."""
    rangs = '1'
    for r in range(1, lignes_max + 1):
        for k in range(1, colonnes_max + 1):
            if (r, k) == (1, 1):
                continue
            rangs += '{{if:a>=' + str(r) + ' && c>=' + str(k) + '|, ' + ev(str(r - 1) + '*d+' + str(k)) + '|}}'
    return rangs


FIG = '{{if:b==d|carré|rectangle}}'
GRILLE_JUSTE = bloc('partage', ['forme: grille {{b}}x{{d}}', 'gris: ' + rectangle_gris()])
LECTURE_GRILLE = ['**Les $' + frac('{{c}}', '{{d}}') + '$ du ' + FIG + '** : ${{c}}$ colonnes sur'
                  ' ${{d}}$.',
                  '**Les $' + frac('{{a}}', '{{b}}') + '$ de cette partie** : dans ces colonnes, ${{a}}$'
                  ' lignes sur ${{b}}$. On obtient un rectangle de ${{a}} \\times {{c}} = '
                  + col(ev('a*c')) + '$ cases sur ${{b}} \\times {{d}} = ' + ev('b*d') + '$.'
                  + GRILLE_JUSTE,
                  '$$' + frac('{{a}}', '{{b}}') + ' \\times ' + frac('{{c}}', '{{d}}') + ' = '
                  + col(frac(ev('a*c'), ev('b*d'))) + '$$']
VARS_GRILLE = [var('b', '2..5'), var('d', '2..5'), var('a', '1..{{eval:b-1}}'),
               var('c', '1..{{eval:d-1}}')]

COLORIER = variation(
    'Colorie les $' + frac('{{a}}', '{{b}}') + '$ des $' + frac('{{c}}', '{{d}}') + '$ du ' + FIG + '.'
    + bloc('partage', ['forme: grille {{b}}x{{d}}', 'colorier: ' + ev('a*c') + '/' + ev('b*d')]),
    VARS_GRILLE, [],
    LECTURE_GRILLE[:2] + ['Le geste juge le nombre de cases coloriées ; la disposition en rectangle'
                          ' ci-dessus montre pourquoi il en faut $' + ev('a*c') + '$.'])

LIRE = variation(
    'On a colorié les $' + frac('{{a}}', '{{b}}') + '$ des $' + frac('{{c}}', '{{d}}') + '$ du ' + FIG
    + '.' + GRILLE_JUSTE + 'Quelle fraction du ' + FIG + ' est coloriée ?\n\n$?$',
    VARS_GRILLE, [frac(ev('a*c'), ev('b*d'))],
    LECTURE_GRILLE[:1] + ['**Les $' + frac('{{a}}', '{{b}}') + '$ de cette partie** : ${{a}}$ lignes'
                          ' sur ${{b}}$ dans ces colonnes, soit ${{a}} \\times {{c}} = ' + ev('a*c')
                          + '$ cases sur ${{b}} \\times {{d}} = ' + ev('b*d') + '$.',
                          LECTURE_GRILLE[2],
                          'Ce n\'est pas une somme : on prend une partie **d\'une partie**.'])

# s = 1 : cagnotte en euros ; s = 2 : élèves
BANDE = variation(
    '{{if:s==1|Cette bande représente une cagnotte de ${{Q}}~\\unit{€}$|Cette bande représente les'
    ' ${{Q}}$ élèves inscrits à un tournoi}}.'
    + bloc('partage', ['forme: bande {{b}}', 'gris: {{a}}'])
    + '{{if:s==1|Combien d\'euros représente la partie grise ?|Combien d\'élèves représente la partie'
    ' grise ?}}\n\n$?~{{if:s==1|\\unit{€}|\\text{ élèves}}}$',
    [var('s', '1|2'), var('b', '2..5'), var('a', '1..{{eval:b-1}}'), var('m', '4..40'),
     var('Q', 'eval:b*m')],
    [ev('a*m')],
    ['La bande a ${{b}}$ parts égales : une part vaut ${{Q}} \\div {{b}} = {{m}}$.',
     'La partie grise est faite de ${{a}}$ parts : ${{a}} \\times {{m}} = ' + col(ev('a*m')) + '$'
     '{{if:s==1|~\\unit{€}|}}.'],
    ['b*m <= 200'])

GATEAU = variation(
    'Il reste {{if:c==1 && d==2|la moitié|les $' + frac('{{c}}', '{{d}}') + '$}} d\'un gâteau. Léa'
    ' mange $' + frac('{{a}}', '{{b}}') + '$ de ce reste. La bande représente le gâteau entier.'
    + bloc('partage', ['forme: bande ' + ev('b*d'), 'colorier: ' + ev('a*c') + '/' + ev('b*d')])
    + 'Colorie ce que mange Léa, puis écris la fraction du gâteau qu\'elle a mangée.\n\n$?$',
    VARS_GRILLE, [frac(ev('a*c'), ev('b*d'))],
    ['La bande a ${{b}} \\times {{d}} = ' + ev('b*d') + '$ parts. Le reste, $' + frac('{{c}}', '{{d}}')
     + '$ du gâteau, fait ${{c}} \\times {{b}} = ' + ev('b*c') + '$ parts.',
     'Léa en mange $' + frac('{{a}}', '{{b}}') + '$ : ${{a}}$ paquets de ${{c}}$ parts, soit ${{a}}'
     ' \\times {{c}} = ' + col(ev('a*c')) + '$ parts.'
     + bloc('partage', ['forme: bande ' + ev('b*d'), 'gris: ' + ev('a*c') + '{{if:a*c==1|,|}}']),
     '$$' + frac('{{a}}', '{{b}}') + ' \\times ' + frac('{{c}}', '{{d}}') + ' = '
     + col(frac(ev('a*c'), ev('b*d'))) + '$$'],
    ['b*d <= 12'])

MODELES.append(modele(
    '03-representer-fraction-d-une-fraction', 'Représenter une fraction d\'une fraction',
    'Représenter les a/b des c/d dans un carré unité ou sur un schéma en barres : colorier,'
    ' lire la fraction coloriée, valeur d\'une partie d\'une quantité, fraction d\'un reste',
    'Fractions', 'Calculer', 'Fraction d\'une quantité', 9,
    [COLORIER, LIRE, BANDE, GATEAU],
    [spec('2/3 des 3/4 : 6 cases', 0, {'b': 3, 'd': 4, 'a': 2, 'c': 3}, '1, 2, 3, 5, 6, 7', 'correct'),
     spec('6 cases ailleurs', 0, {'b': 3, 'd': 4, 'a': 2, 'c': 3}, '4, 8, 9, 10, 11, 12', 'correct'),
     spec('Erreur : les 2/3 de la figure entière (8 cases)', 0, {'b': 3, 'd': 4, 'a': 2, 'c': 3},
          '1, 2, 3, 4, 5, 6, 7, 8', 'incorrect'),
     spec('Erreur : les 3/4 seulement (9 cases)', 0, {'b': 3, 'd': 4, 'a': 2, 'c': 3},
          '1, 2, 3, 5, 6, 7, 9, 10, 11', 'incorrect'),
     spec('Lire 2/3 des 3/4 : 6/12', 1, {'b': 3, 'd': 4, 'a': 2, 'c': 3}, '\\frac{6}{12}', 'correct'),
     spec('Lire réduit : 1/2', 1, {'b': 3, 'd': 4, 'a': 2, 'c': 3}, '\\frac{1}{2}', 'correct'),
     spec('Erreur : somme 1/2 + 1/3 = 5/6', 1, {'b': 2, 'd': 3, 'a': 1, 'c': 1}, '\\frac{5}{6}',
          'incorrect'),
     spec('Erreur : les a/b de la figure entière', 1, {'b': 3, 'd': 4, 'a': 2, 'c': 3},
          '\\frac{8}{12}', 'incorrect'),
     spec('3/5 de 200 € : 120', 2, {'s': 1, 'b': 5, 'a': 3, 'm': 40, 'Q': 200}, '120', 'correct'),
     spec('Erreur : Q ÷ b sans × a', 2, {'s': 1, 'b': 5, 'a': 3, 'm': 40, 'Q': 200}, '40',
          'incorrect'),
     spec('2/3 de 60 élèves : 40', 2, {'s': 2, 'b': 3, 'a': 2, 'm': 20, 'Q': 60}, '40', 'correct'),
     spec('Léa : 1/3 des 3/4, 3 parts et 3/12', 3, {'b': 3, 'd': 4, 'a': 1, 'c': 3},
          ['1, 2, 3', '\\frac{3}{12}'], 'correct'),
     spec('Léa : fraction réduite 1/4', 3, {'b': 3, 'd': 4, 'a': 1, 'c': 3},
          ['4, 6, 8', '\\frac{1}{4}'], 'correct'),
     spec('Erreur : 1/3 + 3/4', 3, {'b': 3, 'd': 4, 'a': 1, 'c': 3},
          ['1, 2, 3', '\\frac{13}{12}'], 'incorrect'),
     spec('Erreur : 1/3 du gâteau entier (4 parts)', 3, {'b': 3, 'd': 4, 'a': 1, 'c': 3},
          ['1, 2, 3, 4', '\\frac{4}{12}'], 'incorrect')],
    delay=90,
    options={'constraints': {'reducedFractions': 'off'}}))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
