"""Écrit les modèles du lot 11 du CE1 (points oubliés du découpage).

Phase 0 validée par David le 2026-11-02 (§ 18 du journal `docs/wip/questions-ce1-progress.md`,
« je suis tes recos »). Bornes `cycle2.json` : CE1-023 (« × » lu « fois » ; 7 × 20 biscuits),
CE1-066 (cube, pavé, pyramide à base carrée : faces, arêtes, sommets), CE1-067 (faces du cube et du
pavé : carrés ou rectangles), CE1-071 (carré, rectangle : angles droits, côtés égaux), CE1-072
(reproduire ou construire ; côtés sur les lignes ou obliques). Décisions :

1. Publication en deux fois : 01 à 04 (`ce1-11/`), puis 05 et `a7dfe502` (`ce1-11-figure/`)
   après l'essai sur tablette des cases « figure ».
2. 067 : le pavé à deux faces carrées (2 carrés, 4 rectangles), cotes écrites.
3. Niveaux : premiers libres (Sens 6 ; Reconnaître et décrire 9, 10 ; Propriétés 6 ; Carrés et
   rectangles 2), relevés de nouveau avant la publication.

Réponse d'un choix : rang de la bonne option dans la liste écrite (mélangée à l'affichage).
Variables à une lettre ; jamais `e` ni `i` ; points de figure `a b c d`, lettres en `texte()`.

    python3 docs/wip/questions/lot-ce1-11.py scripts/questions/ce1-11 scripts/questions/ce1-11-figure
"""
import json
import sys

DOSSIER, DOSSIER_FIGURE = sys.argv[1], sys.argv[2]

# ---- Gabarits (comme lot-ce1-10.py) ----


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(x) for k, x in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(title, description, theme, domain, subdomain, level, variations, specs, delay=90):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (sous-notion du point) est posé par la migration
    return {'title': title, 'description': description, 'grades': ['CE1'], 'theme': theme,
            'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': delay,
            'status': 'draft', 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, reponses, variables, etapes, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    if reponses is not None:  # case « figure » : pas de case à remplir
        v['blanks'] = [{'expectedAnswer': r} for r in reponses]
    v['correction'] = {'steps': etapes}
    return v


def bloc(nom, *lignes):
    return '\n\n```' + nom + '\n' + '\n'.join(lignes) + '\n```'


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + c + '\n' for c in lignes) + '```'


def selon(k, textes, n=1):
    """`{{if:k==1|…|{{if:k==2|…|…}}}}` : le texte numéro k (à partir de 1)."""
    textes = [str(t) for t in textes]
    if len(textes) == 1:
        return textes[0]
    return ('{{if:' + k + '==' + str(n) + '|' + textes[0] + '|' + selon(k, textes[1:], n + 1)
            + '}}')


def col(x, k=0):
    """Couleur DANS une formule (entre `$…$`)."""
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def colt(x, k=0):
    """Mots en couleur dans le texte : une formule à part (hors `$…$`, `\\textcolor` resterait brut)."""
    return '$' + col('\\text{' + x + '}', k) + '$'


# ---- 01. Le signe × (CE1-023) ----

# addition de g fois n, g de 3 à 5
SOMME = selon('g', ['{{n}} + {{n}} + {{n}}', '{{n}} + {{n}} + {{n}} + {{n}}',
                    '{{n}} + {{n}} + {{n}} + {{n}} + {{n}}'], 3)

ADDITION_EN_FOIS = variation(
    'Quelle écriture veut dire la même chose que $' + SOMME + '$ ?'
    + choix(['${{g}} \\times {{n}}$', '${{g}} + {{n}}$', '${{n}} \\times {{n}}$',
             '${{g}}{{n}}$']),
    ['0'], [var('g', '3..5'), var('n', '2..9')],
    ['On ajoute ${{g}}$ fois le nombre ${{n}}$.',
     '« ${{g}}$ fois ${{n}}$ » s\'écrit $' + col('{{g}} \\times {{n}}') + '$ : le signe $\\times$'
     ' se lit « fois ».'],
    ['g != n'])

LIRE_FOIS = variation(
    'Comment se lit $' + '{{a}} \\times {{b}}' + '$ ?'
    + choix(['« {{a}} fois {{b}} »', '« {{a}} plus {{b}} »', '« {{a}} moins {{b}} »',
             '« {{a}}{{b}} »']),
    ['0'], [var('a', '2..9'), var('b', '2..9')],
    ['Le signe $\\times$ se lit ' + colt('« fois »') + ' : $\\times$ n\'est pas $+$.',
     '${{a}} \\times {{b}}$ se lit « {{a}} fois {{b}} ».'])

FOIS_EN_ADDITION = variation(
    'Quelle addition est égale à ${{g}} \\times {{n}}$ ?'
    + choix(['$' + SOMME + '$', '${{g}} + {{n}}$', '${{n}} + {{n}}$',
             '$' + selon('g', ['{{n}} + {{n}} + {{n}} + {{n}}',
                               '{{n}} + {{n}} + {{n}} + {{n}} + {{n}}',
                               '{{n}} + {{n}} + {{n}} + {{n}} + {{n}} + {{n}}'], 3) + '$']),
    ['0'], [var('g', '3..5'), var('n', '2..9')],
    ['${{g}} \\times {{n}}$, c\'est « ${{g}}$ fois ${{n}}$ » : on ajoute ${{g}}$ fois le nombre'
     ' ${{n}}$.',
     '$' + col(SOMME) + '$.'],
    ['g != n'])

PAQUETS = variation(
    'Il y a ${{g}}$ paquets de ${{n}}$ biscuits.\n\n'
    'Nombre de biscuits : ${{g}} \\times {{n}} = ?$',
    ['{{eval:g*n}}'], [var('g', '2..9'), var('m', '1..2'), var('n', 'eval:10*m')],
    ['${{g}}$ paquets de ${{n}}$ biscuits, c\'est ${{g}}$ fois ${{n}}$ biscuits : '
     '${{g}} \\times {{n}}$.',
     '${{g}} \\times {{n}} = ' + col('{{eval:g*n}}') + '$ : il y a ${{eval:g*n}}$ biscuits.'])

SPECS_FOIS = [
    spec('4 + 4 + 4 = 3 × 4', 0, {'g': 3, 'n': 4}, '0', 'correct'),
    spec('Erreur : 3 + 4', 0, {'g': 3, 'n': 4}, '1', 'incorrect'),
    spec('Erreur : 4 × 4 (le nombre répété, deux fois)', 0, {'g': 3, 'n': 4}, '2', 'incorrect'),
    spec('Erreur : 34 (les chiffres collés)', 0, {'g': 3, 'n': 4}, '3', 'incorrect'),
    spec('7 × 3 se lit « 7 fois 3 »', 1, {'a': 7, 'b': 3}, '0', 'correct'),
    spec('Erreur : « 7 plus 3 »', 1, {'a': 7, 'b': 3}, '1', 'incorrect'),
    spec('5 × 4 = 4 + 4 + 4 + 4 + 4', 2, {'g': 5, 'n': 4}, '0', 'correct'),
    spec('Erreur : 5 + 4', 2, {'g': 5, 'n': 4}, '1', 'incorrect'),
    spec('Erreur : une fois de trop', 2, {'g': 5, 'n': 4}, '3', 'incorrect'),
    spec('7 paquets de 20 : 140', 3, {'g': 7, 'm': 2, 'n': 20}, '140', 'correct'),
    spec('5 paquets de 10 : 50', 3, {'g': 5, 'm': 1, 'n': 10}, '50', 'correct'),
    spec('Erreur : 7 + 20 = 27', 3, {'g': 7, 'm': 2, 'n': 20}, '27', 'incorrect'),
    spec('Erreur : 720 (les nombres collés)', 3, {'g': 7, 'm': 2, 'n': 20}, '720', 'incorrect'),
]

# ---- 02, 03. Solides (CE1-066, CE1-067) ----

F_CUBE = 'forme: cube 3'
F_PAVE = 'forme: pave {{if:o==1|5 2.5 2|2.5 2 4.5}}'  # couché ou debout, comme le lot 10
F_PYRAMIDE = 'forme: pyramide carree 3 3.5'
O_VAR = var('o', '1..2')

NOM_SOLIDE = {'cube': 'ce cube', 'pavé': 'ce pavé', 'pyramide': 'cette pyramide'}
FORME = {'cube': F_CUBE, 'pavé': F_PAVE, 'pyramide': F_PYRAMIDE}
COMPTE = {  # faces, arêtes, sommets
    'cube': (6, 12, 8), 'pavé': (6, 12, 8), 'pyramide': (5, 8, 5)}
# (vus seuls, la base et les arêtes cachées oubliées) : erreur typique
VUS = {'cube': (3, 9, 7), 'pavé': (3, 9, 7), 'pyramide': (2, 7, 5)}
POURQUOI = {
    ('cube', 0): ['On voit $3$ faces : devant, dessus, à droite. Il y en a $3$ cachées : derrière,'
                  ' dessous, à gauche.', '$3 + 3 = 6$ faces.'],
    ('cube', 1): ['Une ' + colt('arête') + ' est un bord, là où deux faces se touchent.',
                  '$4$ arêtes en bas, $4$ en haut, $4$ debout : $4 + 4 + 4 = 12$ arêtes.'],
    ('cube', 2): ['Un ' + colt('sommet') + ' est un coin, là où les arêtes se rejoignent.',
                  '$4$ sommets en bas, $4$ en haut : $4 + 4 = 8$ sommets.'],
    ('pavé', 0): ['Comme le cube, le pavé a $3$ faces vues et $3$ cachées : $3 + 3 = 6$ faces.'],
    ('pavé', 1): ['Une ' + colt('arête') + ' est un bord, là où deux faces se touchent.',
                  '$4$ arêtes en bas, $4$ en haut, $4$ qui les relient : $4 + 4 + 4 = 12$'
                  ' arêtes.'],
    ('pavé', 2): ['Un ' + colt('sommet') + ' est un coin, là où les arêtes se rejoignent.',
                  '$4$ sommets en bas, $4$ en haut : $4 + 4 = 8$ sommets.'],
    ('pyramide', 0): ['La base est un carré : $1$ face.',
                      'Sur chaque côté du carré, une face en triangle monte jusqu\'à la pointe :'
                      ' $4$ faces.', '$1 + 4 = 5$ faces.'],
    ('pyramide', 1): ['Une ' + colt('arête') + ' est un bord, là où deux faces se touchent.',
                      '$4$ arêtes autour de la base carrée, $4$ qui montent vers la pointe :'
                      ' $4 + 4 = 8$ arêtes.'],
    ('pyramide', 2): ['Un ' + colt('sommet') + ' est un coin, là où les arêtes se rejoignent.',
                      '$4$ sommets au coin de la base, plus la pointe : $4 + 1 = 5$ sommets.'],
}
MOTS = ['faces', 'arêtes', 'sommets']

DECRIRE = []
SPECS_DECRIRE = []
for s in ('cube', 'pavé', 'pyramide'):
    for q in range(3):
        vi = len(DECRIRE)
        DECRIRE.append(variation(
            'Combien ' + NOM_SOLIDE[s] + ' a-t-' + ('elle' if s == 'pyramide' else 'il')
            + ' de ' + MOTS[q] + ' ?\n\nLes arêtes cachées sont en pointillés.'
            + bloc('solide', FORME[s]) + '\n\n$?$ ' + MOTS[q],
            [str(COMPTE[s][q])], [O_VAR], POURQUOI[(s, q)]))
        SPECS_DECRIRE.append(spec(f'{s} : {COMPTE[s][q]} {MOTS[q]}', vi, {'o': 1},
                                  str(COMPTE[s][q]), 'correct'))
        if VUS[s][q] != COMPTE[s][q]:
            SPECS_DECRIRE.append(spec(f'Erreur : {s}, seulement les {MOTS[q]} qu\'on voit', vi, {'o': 2},
                                      str(VUS[s][q]), 'incorrect'))

DECRIRE.append(variation(
    'Combien de faces de cette pyramide sont des triangles ?'
    + bloc('solide', F_PYRAMIDE) + '\n\n$?$ faces en triangle',
    ['4'], [],
    ['La base est un carré : ce n\'est pas un triangle.',
     'Sur chaque côté du carré, une face en triangle monte jusqu\'à la pointe : $4$ triangles.']))
SPECS_DECRIRE += [
    spec('Pyramide : 4 triangles', len(DECRIRE) - 1, {}, '4', 'correct'),
    spec('Erreur : la base comptée (5)', len(DECRIRE) - 1, {}, '5', 'incorrect'),
    spec('Erreur : les triangles vus seuls (2)', len(DECRIRE) - 1, {}, '2', 'incorrect'),
]
# mélange cube / pyramide pris l'un pour l'autre
SPECS_DECRIRE.append(spec('Erreur : les sommets du cube pour la pyramide', 8, {'o': 1}, '8',
                          'incorrect'))

# 03. Les faces du cube et du pavé
CUBE_CARREES = variation(
    'Combien de faces de ce cube sont des carrés ?' + bloc('solide', F_CUBE, 'cotes: cm')
    + '\n\n$?$ faces carrées',
    ['6'], [],
    ['Toutes les arêtes du cube ont la même longueur : chacune de ses faces a $4$ côtés égaux et'
     ' $4$ angles droits.', 'Les $6$ faces du cube sont des ' + colt('carrés') + '.'])

PAVE_NATURE = variation(
    'Les faces de ce pavé sont…' + bloc('solide', F_PAVE)
    + choix(['… des rectangles.', '… des triangles.', '… des disques.', '… des cercles.']),
    ['0'], [O_VAR],
    ['Chaque face du pavé a $4$ côtés et $4$ angles droits.',
     'Les faces du pavé sont des ' + colt('rectangles') + '.'])

PAVE_SANS_CARRE = variation(
    'Combien de faces de ce pavé sont des carrés ?'
    + bloc('solide', 'forme: pave {{l}} {{p}} {{h}}', 'cotes: cm') + '\n\n$?$ faces carrées',
    ['0'], [var('l', '4..6'), var('p', '2..3'), var('h', '1..3')],
    ['Les faces ont pour côtés ${{l}}$ cm et ${{p}}$ cm, ${{l}}$ cm et ${{h}}$ cm, ${{p}}$ cm et'
     ' ${{h}}$ cm.', 'Aucune n\'a ses $4$ côtés de la même longueur : ' + colt('aucune') + ' n\'est'
     ' un carré. Ce sont des rectangles.'],
    ['p != h', 'l != p', 'l != h'])

PAVE_DEUX_CARRES = variation(
    'Ce pavé a des faces carrées et des faces rectangulaires (qui ne sont pas des carrés).'
    + bloc('solide', 'forme: pave {{if:k==1|{{l}} 3 3|3 3 {{l}}}}', 'cotes: cm')
    + '\n\nFaces carrées : $?$\n\nFaces rectangulaires : $?$',
    ['2', '4'], [var('k', '1..2'), var('l', '4..6')],
    ['Les deux faces de $3$ cm sur $3$ cm sont des ' + colt('carrés') + ' : '
     '{{if:k==1|à gauche et à droite|en haut et en bas}}.',
     'Les $4$ autres faces mesurent ${{l}}$ cm sur $3$ cm : ce sont des ' + colt('rectangles', 1)
     + '.', '$2 + 4 = 6$ faces.'])

SPECS_FACES = [
    spec('Cube : 6 carrés', 0, {}, '6', 'correct'),
    spec('Erreur : les carrés vus seuls (3)', 0, {}, '3', 'incorrect'),
    spec('Pavé : des rectangles', 1, {'o': 1}, '0', 'correct'),
    spec('Erreur : triangles', 1, {'o': 2}, '1', 'incorrect'),
    spec('Pavé 5 × 3 × 2 : aucun carré', 2, {'l': 5, 'p': 3, 'h': 2}, '0', 'correct'),
    spec('Erreur : 6 (pavé pris pour un cube)', 2, {'l': 5, 'p': 3, 'h': 2}, '6', 'incorrect'),
    spec('Pavé couché : 2 carrés, 4 rectangles', 3, {'k': 1, 'l': 5}, ['2', '4'], 'correct'),
    spec('Pavé debout : 2 carrés, 4 rectangles', 3, {'k': 2, 'l': 4}, ['2', '4'], 'correct'),
    spec('Erreur : 0 et 6 (« un pavé n\'a que des rectangles »)', 3, {'k': 1, 'l': 5},
         ['0', '6'], 'incorrect'),
    spec('Erreur : le carré vu seul, 1 et 5', 3, {'k': 1, 'l': 5}, ['1', '5'], 'incorrect'),
    spec('Erreur : 4 et 2 (inversés)', 3, {'k': 2, 'l': 6}, ['4', '2'], 'incorrect'),
]

# ---- 04. Carré et rectangle (CE1-071) ----

COULEUR = 'couleur="{{if:c==1|bleu|{{if:c==2|rouge|{{if:c==3|vert|orange}}}}}}"'
VAR_COULEUR = var('c', '1..4')


def figure_quadri(description, pts, cotes):
    """Quadrilatère ABCD (A en bas à gauche, sens direct), 4 angles droits codés, cotes."""
    lignes = [f'{n} = point({x}, {y}, visible=faux)' for n, (x, y) in zip('abcd', pts)]
    lignes.append(f'q = polygone(a, b, c, d, {COULEUR}, epaisseur=2)')
    for s in range(4):
        lignes.append(f'g{s} = angle({"abcd"[s - 1]}, {"abcd"[s]}, {"abcd"[(s + 1) % 4]}, '
                      'marque="carre", couleur="noir")')
    decal = [(-0.35, -0.35), (0.35, -0.35), (0.35, 0.35), (-0.35, 0.35)]
    for (x, y), (dx, dy), lettre in zip(pts, decal, 'ABCD'):
        lignes.append(f'texte({round(x + dx, 2)}, {round(y + dy, 2)}, "{lettre}")')
    for x, y, t in cotes:
        lignes.append(f'texte({x}, {y}, "{t}")')
    return ('```figure\nfenetre: 0 ; 10 ; 0 ; 6\ndescription: ' + description + '\n---\n'
            + '\n'.join(lignes) + '\n```')


RECT = [(1.5, 1.5), (8.5, 1.5), (8.5, 4.5), (1.5, 4.5)]
CARRE = [(3.25, 0.9), (6.75, 0.9), (6.75, 4.4), (3.25, 4.4)]

RECT_COTE_OPPOSE = variation(
    '$ABCD$ est un rectangle. Combien mesure le côté $[{{if:k==1|CD|DA}}]$ ?\n\n'
    + figure_quadri('Le rectangle ABCD, AB et BC écrits, quatre angles droits codés.', RECT,
                    [(5, 1.05, '{{u}} cm'), (9.35, 3, '{{w}} cm')])
    + '\n\n$[{{if:k==1|CD|DA}}]$ mesure $?$ cm.',
    ['{{a}}'], [VAR_COULEUR, var('k', '1..2'), var('u', '5..9'), var('w', '2..4'),
                 var('a', 'eval:u*(2-k) + w*(k-1)')],
    ['Dans un rectangle, les côtés qui se font face ont la ' + colt('même longueur') + '.',
     '$[{{if:k==1|CD|DA}}]$ est en face de $[{{if:k==1|AB|BC}}]$ : il mesure $'
     + col('{{a}}') + '$ cm.'])

CARRE_COTE = variation(
    '$ABCD$ est un carré. Combien mesure le côté $[{{if:k==1|BC|{{if:k==2|CD|DA}}}}]$ ?\n\n'
    + figure_quadri('Le carré ABCD, AB écrit, quatre angles droits codés.', CARRE,
                    [(5, 0.45, '{{n}} cm')])
    + '\n\n$[{{if:k==1|BC|{{if:k==2|CD|DA}}}}]$ mesure $?$ cm.',
    ['{{n}}'], [VAR_COULEUR, var('k', '1..3'), var('n', '2..9')],
    ['Un carré a ses $4$ côtés de la ' + colt('même longueur') + '.',
     'Tous ses côtés mesurent, comme $[AB]$, $' + col('{{n}}') + '$ cm.'])

VRAI_RECTANGLE = variation(
    'Quelle phrase est vraie pour tous les rectangles ?'
    + choix(['Ils ont $4$ angles droits.', 'Ils ont $4$ côtés de la même longueur.',
             'Ils ont $2$ angles droits seulement.',
             'Leurs côtés qui se font face n\'ont pas la même longueur.']),
    ['0'], [],
    ['Un rectangle a ' + colt('$4$ angles droits') + ', et ses côtés qui se font face ont la'
     ' même longueur.', 'Ses $4$ côtés n\'ont pas toujours la même longueur : un long, un court.'])

VRAI_CARRE = variation(
    'Quelle phrase est vraie pour tous les carrés ?'
    + choix(['Ils ont $4$ côtés de la même longueur et $4$ angles droits.',
             'Ils ont $4$ côtés de la même longueur, mais pas d\'angle droit.',
             'Ils ont $4$ angles droits, deux côtés longs et deux côtés courts.',
             'Ils ont $3$ côtés de la même longueur.']),
    ['0'], [],
    ['Un carré a ' + colt('$4$ côtés de la même longueur') + ' et '
     + colt('$4$ angles droits', 1) + '.'])

SPECS_PROPRIETES = [
    spec('CD = AB = 7', 0, {'c': 1, 'k': 1, 'u': 7, 'w': 3, 'a': 7}, '7', 'correct'),
    spec('DA = BC = 3', 0, {'c': 2, 'k': 2, 'u': 7, 'w': 3, 'a': 3}, '3', 'correct'),
    spec('Erreur : le côté voisin (CD pris pour BC)', 0, {'c': 1, 'k': 1, 'u': 7, 'w': 3, 'a': 7}, '3',
         'incorrect'),
    spec('Erreur : le côté voisin (DA pris pour AB)', 0, {'c': 2, 'k': 2, 'u': 7, 'w': 3, 'a': 3}, '7',
         'incorrect'),
    spec('Carré : BC = 5', 1, {'c': 3, 'k': 1, 'n': 5}, '5', 'correct'),
    spec('Carré : DA = 8', 1, {'c': 4, 'k': 3, 'n': 8}, '8', 'correct'),
    spec('Erreur : le tour (20)', 1, {'c': 3, 'k': 1, 'n': 5}, '20', 'incorrect'),
    spec('Rectangle : 4 angles droits', 2, {}, '0', 'correct'),
    spec('Erreur : 4 côtés égaux (le carré)', 2, {}, '1', 'incorrect'),
    spec('Carré : côtés égaux et angles droits', 3, {}, '0', 'correct'),
    spec('Erreur : sans angle droit', 3, {}, '1', 'incorrect'),
]

# ---- 05. Terminer un carré ou un rectangle, côtés obliques (CE1-072) ----

W, H = 12, 8


def dedans(*pts):
    return all(1 <= x <= W - 1 and 1 <= y <= H - 1 for x, y in pts)


def gauche(v):
    """v tourné d'un quart de tour vers la gauche."""
    return (-v[1], v[0])


def plus(p, v, k=1):
    return (p[0] + k * v[0], p[1] + k * v[1])


# côté [AB] oblique ; les deux carrés possibles (à gauche et à droite de AB) tiennent dans la
# fenêtre
CARRES = [((5, 3), (7, 4)), ((5, 3), (6, 5)), ((5, 4), (7, 3)), ((5, 5), (6, 3)),
          ((5, 2), (6, 5))]
for a, b in CARRES:
    v = (b[0] - a[0], b[1] - a[1])
    assert v[0] != 0 and v[1] != 0, 'côté oblique'
    for s in (1, -1):
        w = gauche(v) if s == 1 else (-gauche(v)[0], -gauche(v)[1])
        assert dedans(a, b, plus(b, w), plus(a, w)), (a, b, s)

# rectangle A, B, C donnés ([AB] et [BC] tracés), côtés obliques, AB ≠ BC
RECTS = []
for a, u, k1, k2 in [((2, 2), (2, 1), 2, 1), ((3, 1), (1, 1), 4, 2), ((7, 1), (1, 2), 2, 1),
                     ((2, 3), (2, -1), 2, 1), ((5, 1), (1, 1), 2, 3), ((2, 2), (3, 1), 2, 1)]:
    b = plus(a, u, k1)
    c = plus(b, gauche(u), k2)
    d = plus(a, gauche(u), k2)
    assert dedans(a, b, c, d), (a, u, k1, k2)
    RECTS.append((a, b, c, d))


def seg(p, q):
    return f'segment({p[0]};{p[1]};{q[0]};{q[1]})'


def figure_a_completer(verifier, points_, traces):
    lignes = [f'{n} = point({selon("k", [p[0] for p in pts])}, '
              f'{selon("k", [p[1] for p in pts])}, visible=faux)'
              for n, pts in points_]
    return ('```figure-a-completer\nfenetre: 0 ; 12 ; 0 ; 8\ngrille: 1\noutils: segment\n'
            'verifier: ' + verifier + '\n---\n' + '\n'.join(lignes + traces) + '\n```')


def carreaux(n):
    return f'${n}$ carreau' + ('x' if n > 1 else '')


def pas(v):
    """« 1 carreau en largeur et 2 carreaux en hauteur » (sans sens : les points ne sont pas
    nommés à l'écran)."""
    return carreaux(abs(v[0])) + ' en largeur et ' + carreaux(abs(v[1])) + ' en hauteur'


def vecteur(a, b):
    return (b[0] - a[0], b[1] - a[1])


TERMINE_CARRE = variation(
    'Termine le carré.\n\n'
    + figure_a_completer('carre A ; B', [('A', [a for a, _ in CARRES]),
                                         ('B', [b for _, b in CARRES])], ['ab = segment(A, B)']),
    None, [var('k', f'1..{len(CARRES)}')],
    ['Un carré a $4$ côtés de la même longueur et $4$ angles droits.',
     'Le côté tracé avance de ' + selon('k', [pas(vecteur(a, b)) for a, b in CARRES]) + '.',
     'Le côté suivant tourne d\'un angle droit : il ' + colt('échange les deux nombres') + ', '
     + selon('k', [pas(gauche(vecteur(a, b))) for a, b in CARRES]) + '.',
     'On trace ainsi les trois côtés qui manquent, d\'un côté ou de l\'autre du côté tracé ; la'
     ' figure se ferme.'])

TERMINE_RECT = variation(
    'Termine le rectangle.\n\n'
    + figure_a_completer('rectangle A ; B ; C',
                         [('A', [r[0] for r in RECTS]), ('B', [r[1] for r in RECTS]),
                          ('C', [r[2] for r in RECTS])],
                         ['ab = segment(A, B)', 'bc = segment(B, C)']),
    None, [var('k', f'1..{len(RECTS)}')],
    ['Dans un rectangle, les côtés qui se font face ont la même longueur, et les $4$ angles sont'
     ' droits.',
     'Les deux côtés tracés se touchent en un angle droit. En face de chacun, on trace un côté'
     ' ' + colt('pareil') + ' : le même nombre de carreaux en largeur et en hauteur.',
     'Ici : ' + selon('k', [pas(vecteur(r[0], r[1])) for r in RECTS]) + ' pour l\'un, '
     + selon('k', [pas(vecteur(r[1], r[2])) for r in RECTS]) + ' pour l\'autre. La figure se'
     ' ferme.'])

SPECS_TRACER = []
for k, (a, b) in enumerate(CARRES[:3], start=1):
    v = (b[0] - a[0], b[1] - a[1])
    w = gauche(v)
    c1, d1 = plus(b, w), plus(a, w)
    c2, d2 = plus(b, w, -1), plus(a, w, -1)
    SPECS_TRACER += [
        spec(f'carré {k}, à gauche de AB', 0, {'k': k}, f'{seg(b, c1)}|{seg(c1, d1)}|{seg(d1, a)}',
             'correct'),
        spec(f'carré {k}, à droite de AB', 0, {'k': k}, f'{seg(b, c2)}|{seg(c2, d2)}|{seg(d2, a)}',
             'correct'),
        spec(f'Erreur : carré {k}, un côté manque', 0, {'k': k}, f'{seg(b, c1)}|{seg(c1, d1)}',
             'incorrect'),
        # le côté suivant pris sur les lignes du quadrillage : un parallélogramme
        spec(f'Erreur : carré {k}, côtés suivants à la verticale', 0, {'k': k},
             f'{seg(b, plus(b, (0, 2)))}|{seg(plus(b, (0, 2)), plus(a, (0, 2)))}|'
             f'{seg(plus(a, (0, 2)), a)}', 'incorrect'),
    ]
for k, (a, b, c, d) in enumerate(RECTS[:3], start=1):
    faux = plus(d, (1, 0))
    SPECS_TRACER += [
        spec(f'rectangle {k}', 1, {'k': k}, f'{seg(c, d)}|{seg(d, a)}', 'correct'),
        spec(f'rectangle {k}, dans l\'autre sens', 1, {'k': k}, f'{seg(a, d)}|{seg(d, c)}',
             'correct'),
        spec(f'Erreur : rectangle {k}, un côté manque', 1, {'k': k}, seg(c, d), 'incorrect'),
        spec(f'Erreur : rectangle {k}, quatrième sommet décalé', 1, {'k': k},
             f'{seg(c, faux)}|{seg(faux, a)}', 'incorrect'),
    ]

# ---- Fichiers ----

GEO = 'Géométrie'

MODELES = {
    '01-le-signe-fois': modele(
        'Le signe × : « fois »',
        'Écrire une addition répétée avec ×, lire ×, et le calcul d\'une situation (paquets de 10'
        ' ou 20)', 'Entiers', 'Multiplier', 'Sens', 6,
        [ADDITION_EN_FOIS, LIRE_FOIS, FOIS_EN_ADDITION, PAQUETS], SPECS_FOIS),
    '02-faces-sommets-aretes': modele(
        'Faces, arêtes et sommets : cube, pavé, pyramide',
        'Compter les faces, les arêtes, les sommets d\'un cube, d\'un pavé, d\'une pyramide à base'
        ' carrée', GEO, 'Solides', 'Reconnaître et décrire', 9, DECRIRE, SPECS_DECRIRE),
    '03-les-faces-du-cube-et-du-pave': modele(
        'Les faces du cube et du pavé : carrés ou rectangles',
        'Nombre et forme des faces ; pavé à deux faces carrées', GEO, 'Solides',
        'Reconnaître et décrire', 10,
        [CUBE_CARREES, PAVE_NATURE, PAVE_SANS_CARRE, PAVE_DEUX_CARRES], SPECS_FACES),
    '04-carre-et-rectangle': modele(
        'Carré et rectangle : angles droits et côtés',
        'Longueur d\'un côté d\'après les propriétés ; phrases vraies pour tous les carrés, tous'
        ' les rectangles', GEO, 'Figures planes', 'Propriétés', 6,
        [RECT_COTE_OPPOSE, CARRE_COTE, VRAI_RECTANGLE, VRAI_CARRE], SPECS_PROPRIETES),
}

MODELES_FIGURE = {
    '05-termine-carre-rectangle-obliques': modele(
        'Termine le carré ou le rectangle aux côtés obliques',
        'Sur quadrillage, compléter un carré (un côté oblique tracé) ou un rectangle (deux côtés'
        ' obliques tracés)', GEO, 'Tracés', 'Carrés et rectangles', 2,
        [TERMINE_CARRE, TERMINE_RECT], SPECS_TRACER),
}

for dossier, modeles in ((DOSSIER, MODELES), (DOSSIER_FIGURE, MODELES_FIGURE)):
    for nom, m in modeles.items():
        with open(f'{dossier}/{nom}.json', 'w') as f:
            json.dump(m, f, ensure_ascii=False, indent='\t')
            f.write('\n')
print(len(MODELES) + len(MODELES_FIGURE), 'modèles écrits')
