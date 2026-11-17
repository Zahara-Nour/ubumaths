"""Écrit les 7 modèles du lot 10 du CE2 (solides) dans scripts/questions/ce2-10/.

Phase 0 validée par David le 2026-11-06 (§ 16 du journal `docs/wip/questions-ce2-progress.md`,
« tes recos ? » puis « je te suis »). Bornes `cycle2.json` : CE2-061 (nommer cube, boule, pavé,
cône, pyramide, cylindre), CE2-062 (décrire cube, pavé, pyramide avec face, sommet, arête ;
perspective, arêtes cachées en pointillés, à identifier), CE2-063 (nombre et nature des faces du
cube et du pavé), CE2-064 (faces latérales triangulaires, base polygone), CE2-066 (dire si un
assemblage est un patron de cube : nombre, nature, position des faces). Décisions :

1. 063 : jamais « combien de rectangles ? » (un carré en est un) ; « combien de carrés ? », et
   « carré ou rectangle ? » sur un pavé sans face carrée seulement. Même règle pour la base d'une
   pyramide : une base carrée n'a jamais « rectangle » à côté d'elle.
2. 066 : oui / non et « lequel ? » ; ni `completer:` ni `designer:`.
3. Arêtes cachées toujours en tirets (jamais `cachees: non`).

Gabarits : `lot-ce1-10.py` (solides en ``solide, choix de dessins), `lot-ce2-9.py`.
Variables à une lettre ; jamais `e` ni `i`.

    python3 docs/wip/questions/lot-ce2-10.py scripts/questions/ce2-10
"""
import json
import sys

DOSSIER = sys.argv[1]

# ---- Gabarits ----


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(x) for k, x in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(title, description, level, variations, specs, delay=60):
    # ni theme, ni domain, ni subdomain (ADR 0035) : le rangement est posé par la migration
    return {'title': title, 'description': description, 'grades': ['CE2'], 'level': level,
            'delay': delay, 'status': 'draft', 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, reponses, variables, etapes, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [{'expectedAnswer': r} for r in reponses]
    v['correction'] = {'steps': etapes}
    return v


def bloc(nom, *lignes):
    return '\n\n```' + nom + '\n' + '\n'.join(x for x in lignes if x) + '\n```'


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + c + '\n' for c in lignes) + '```'


def choix_dessins(blocs):
    """Choix dont chaque option est un bloc dessiné (ouvert sur la ligne de l'item)."""
    items = []
    for nom, lignes in blocs:
        items.append('- ```' + nom + '\n' + ''.join('  ' + x + '\n' for x in lignes) + '  ```')
    return '\n\n````choix\n' + '\n'.join(items) + '\n````'


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
    """Mots en couleur dans le texte : une formule à part."""
    return '$' + col('\\text{' + x + '}', k) + '$'


def nb(x, k=0):
    return '$' + col(str(x), k) + '$'


CUBE_NOMS = 'sommets: A B C D E F G H'
PYR4_NOMS = 'sommets: S A B C D'
PYR3_NOMS = 'sommets: S A B C'

# ---- 01. Nommer un solide (CE2-061) ----

# Les dimensions tirées gardent chaque solide reconnaissable ; le pavé presque cube (o = 3) et le
# cylindre bas (q = 2, une boîte de conserve) sont les pièges.
F_CUBE = 'forme: cube 3'
F_PAVE = 'forme: pave ' + selon('o', ['5 2.5 2', '2.5 2 4.5', '4.5 3 3'])
F_PYRAMIDE = 'forme: pyramide ' + selon('q', ['carree 3 3.5', 'rectangle 4 2.5 3.5',
                                             'triangle 3.5 3.5'])
F_CONE = 'forme: cone 1.5 {{h}}'
F_CYLINDRE = 'forme: cylindre ' + selon('q', ['1.5 {{h}}', '2 1.5', '1 {{h}}'])
F_BOULE = 'forme: boule 2'

SOLIDE_VARS = [var('o', '1..3'), var('q', '1..3'), var('h', '3..4')]

NOMS_061 = ['cube', 'pavé', 'boule', 'cône', 'pyramide', 'cylindre']
UNE = ('boule', 'pyramide')


def un(nom):
    return ('une ' if nom in UNE else 'un ') + nom


C_NOMS = ['C\'est ' + un(n) + '.' for n in NOMS_061]

DIT = {
    'cube': 'Le cube a $6$ faces, toutes des carrés de la même taille.',
    'pavé': 'Le pavé a $6$ faces planes, mais elles ne sont pas toutes des carrés : il est plus'
            ' long dans un sens.',
    'boule': 'La boule est toute ronde : elle n\'a ni face plane, ni sommet, ni arête.',
    'cône': 'Le cône a une base ronde, un disque, et une face courbe qui finit en pointe.',
    'pyramide': 'La pyramide a une base ('
                + selon('q', ['un carré', 'un rectangle', 'un triangle'])
                + ') et des faces en triangles qui se rejoignent en un sommet.',
    'cylindre': 'Le cylindre a deux disques, en haut et en bas, reliés par une face courbe ;'
                ' il n\'a pas de pointe.',
}

FORME = {'cube': F_CUBE, 'pavé': F_PAVE, 'boule': F_BOULE, 'cône': F_CONE,
         'pyramide': F_PYRAMIDE, 'cylindre': F_CYLINDRE}


def nomme(nom):
    return variation(
        'Comment s\'appelle ce solide ?' + bloc('solide', FORME[nom]) + choix(C_NOMS),
        [str(NOMS_061.index(nom))], SOLIDE_VARS,
        [DIT[nom], 'C\'est ' + colt(un(nom)) + '.'])


NOMME = [nomme(n) for n in NOMS_061]

V = {'o': 1, 'q': 1, 'h': 3}
SPECS_NOMME = [
    spec('Cube', 0, V, '0', 'correct'),
    spec('Erreur : cube pris pour un pavé', 0, V, '1', 'incorrect'),
    spec('Pavé presque cube', 1, {'o': 3, 'q': 1, 'h': 3}, '1', 'correct'),
    spec('Erreur : pavé presque cube pris pour un cube', 1, {'o': 3, 'q': 1, 'h': 3}, '0',
         'incorrect'),
    spec('Pavé debout', 1, {'o': 2, 'q': 1, 'h': 3}, '1', 'correct'),
    spec('Boule', 2, V, '2', 'correct'),
    spec('Cône', 3, {'o': 1, 'q': 1, 'h': 4}, '3', 'correct'),
    spec('Erreur : cône pris pour une pyramide', 3, {'o': 1, 'q': 1, 'h': 4}, '4', 'incorrect'),
    spec('Pyramide à base rectangle', 4, {'o': 1, 'q': 2, 'h': 3}, '4', 'correct'),
    spec('Erreur : pyramide à base triangle prise pour un cône', 4, {'o': 1, 'q': 3, 'h': 3},
         '3', 'incorrect'),
    spec('Cylindre bas (boîte de conserve)', 5, {'o': 1, 'q': 2, 'h': 3}, '5', 'correct'),
    spec('Erreur : cylindre pris pour un cône', 5, {'o': 1, 'q': 1, 'h': 4}, '3', 'incorrect'),
    spec('Erreur : cylindre pris pour un pavé', 5, {'o': 1, 'q': 3, 'h': 4}, '1', 'incorrect'),
]

# ---- 02. Face, arête ou sommet (CE2-062) ----

# s : 1 cube, 2 pavé, 3 pyramide à base carrée. Marques sur des éléments VUS (pas en tirets) :
# cube et pavé ABCD en bas (A devant à gauche), D au fond à gauche est caché ; pyramide S A B C D,
# D au fond à gauche caché.
F_S3 = 'forme: ' + selon('s', ['cube 3', 'pave 5 2.5 2.5', 'pyramide carree 3.5 3.5'])
NOMS_S3 = selon('s', ['sommets: A B C D E F G H', 'sommets: A B C D E F G H',
                      'sommets: S A B C D'])
LE_S3 = selon('s', ['ce cube', 'ce pavé', 'cette pyramide'])
S3_VARS = [var('s', '1..3'), var('m', '1..3')]

FACE_MARQUE = selon('s', [selon('m', ['ABFE', 'EFGH', 'BCGF'])] * 2
                    + [selon('m', ['SAB', 'SBC', 'SAB'])])
ARETE_MARQUE = selon('s', [selon('m', ['AE', 'FG', 'BC'])] * 2
                     + [selon('m', ['SA', 'SB', 'BC'])])
SOMMET_MARQUE = selon('s', [selon('m', ['F', 'G', 'E'])] * 2 + [selon('m', ['S', 'B', 'C'])])

C_ELEMENTS = ['C\'est une face.', 'C\'est une arête.', 'C\'est un sommet.']

QUOI = {
    'face': ('face', FACE_MARQUE, 'La partie grisée est une surface plane du solide : c\'est une'
             ' ' + colt('face') + '. Ici, la face ' + '$' + FACE_MARQUE + '$' + '.'),
    'arête': ('arete', ARETE_MARQUE, 'Le trait épais est le bord commun à deux faces : c\'est une '
              + colt('arête') + '. Ici, l\'arête $' + ARETE_MARQUE + '$.'),
    'sommet': ('sommet', SOMMET_MARQUE, 'Le point est un coin où se rejoignent plusieurs arêtes :'
               ' c\'est un ' + colt('sommet') + '. Ici, le sommet $' + SOMMET_MARQUE + '$.'),
}


def element(quoi, k):
    cle = {'face': FACE_MARQUE, 'arête': ARETE_MARQUE, 'sommet': SOMMET_MARQUE}[quoi]
    mot = {'face': 'face', 'arête': 'arete', 'sommet': 'sommet'}[quoi]
    return variation(
        'Sur ' + LE_S3 + ', qu\'est-ce que $' + cle + '$ ? (marqué sur le dessin)'
        + bloc('solide', F_S3, NOMS_S3, 'marquer: ' + mot + ' ' + cle)
        + choix(C_ELEMENTS, melanger=False),
        [str(k)], S3_VARS,
        [QUOI[quoi][2],
         'Une face est plane, une arête est un bord (un trait), un sommet est un coin (un point).'])


ELEMENTS = [element('face', 0), element('arête', 1), element('sommet', 2)]

SPECS_ELEMENTS = [
    spec('Face du cube', 0, {'s': 1, 'm': 1}, '0', 'correct'),
    spec('Face de la pyramide', 0, {'s': 3, 'm': 2}, '0', 'correct'),
    spec('Erreur : face prise pour une arête', 0, {'s': 2, 'm': 3}, '1', 'incorrect'),
    spec('Arête du pavé', 1, {'s': 2, 'm': 1}, '1', 'correct'),
    spec('Arête de la pyramide', 1, {'s': 3, 'm': 1}, '1', 'correct'),
    spec('Erreur : arête prise pour un sommet', 1, {'s': 1, 'm': 2}, '2', 'incorrect'),
    spec('Sommet S de la pyramide', 2, {'s': 3, 'm': 1}, '2', 'correct'),
    spec('Sommet du cube', 2, {'s': 1, 'm': 3}, '2', 'correct'),
    spec('Erreur : sommet pris pour une arête', 2, {'s': 2, 'm': 2}, '1', 'incorrect'),
]

# ---- 03. Compter sommets, arêtes, faces (CE2-062) ----

# s : 1 cube, 2 pavé, 3 pyramide à base carrée, 4 pyramide à base triangle (tétraèdre)
F_S4 = 'forme: ' + selon('s', ['cube 3', 'pave 5 2.5 2', 'pyramide carree 3.5 3.5',
                               'pyramide triangle 3.5 3.5'])
LE_S4 = selon('s', ['ce cube', 'ce pavé', 'cette pyramide', 'cette pyramide'])
COMPTE = {
    'sommets': (['8', '8', '5', '4'],
                selon('s', ['$4$ en bas et $4$ en haut', '$4$ en bas et $4$ en haut',
                            '$4$ autour de la base et le sommet du haut',
                            '$3$ autour de la base et le sommet du haut'])),
    'arêtes': (['12', '12', '8', '6'],
               selon('s', ['$4$ en bas, $4$ en haut et $4$ debout',
                           '$4$ en bas, $4$ en haut et $4$ debout',
                           '$4$ autour de la base et $4$ qui montent au sommet',
                           '$3$ autour de la base et $3$ qui montent au sommet'])),
    'faces': (['6', '6', '5', '4'],
              selon('s', ['devant, derrière, dessus, dessous, à gauche et à droite',
                          'devant, derrière, dessus, dessous, à gauche et à droite',
                          'la base carrée et $4$ triangles',
                          'la base triangulaire et $3$ triangles'])),
}


def compte(quoi):
    valeurs, detail = COMPTE[quoi]
    return variation(
        'Combien ' + LE_S4 + ' a-t-' + selon('s', ['il', 'il', 'elle', 'elle'])
        + ' de ' + quoi + ' ?' + bloc('solide', F_S4) + '\n\n[_] ' + quoi,
        ['{{r}}'], [var('s', '1..4'), var('r', selon('s', valeurs))],
        ['Les traits en pointillés sont les arêtes cachées, derrière le solide : elles comptent'
         ' aussi.',
         'On compte ' + detail + ' : ' + nb('{{r}}') + ' ' + quoi + '.'])


COMPTER = [compte('sommets'), compte('arêtes'), compte('faces')]

SPECS_COMPTER = [
    spec('Sommets du cube', 0, {'s': 1, 'r': 8}, '8', 'correct'),
    spec('Erreur : sommet caché oublié', 0, {'s': 1, 'r': 8}, '7', 'incorrect'),
    spec('Sommets de la pyramide carrée', 0, {'s': 3, 'r': 5}, '5', 'correct'),
    spec('Erreur : pyramide comptée comme un cube', 0, {'s': 3, 'r': 5}, '8', 'incorrect'),
    spec('Sommets du tétraèdre', 0, {'s': 4, 'r': 4}, '4', 'correct'),
    spec('Arêtes du pavé', 1, {'s': 2, 'r': 12}, '12', 'correct'),
    spec('Erreur : arêtes cachées oubliées', 1, {'s': 2, 'r': 12}, '9', 'incorrect'),
    spec('Arêtes de la pyramide carrée', 1, {'s': 3, 'r': 8}, '8', 'correct'),
    spec('Arêtes du tétraèdre', 1, {'s': 4, 'r': 6}, '6', 'correct'),
    spec('Faces du cube', 2, {'s': 1, 'r': 6}, '6', 'correct'),
    spec('Erreur : seules les faces vues comptées', 2, {'s': 1, 'r': 6}, '3', 'incorrect'),
    spec('Faces de la pyramide carrée', 2, {'s': 3, 'r': 5}, '5', 'correct'),
    spec('Erreur : base oubliée', 2, {'s': 3, 'r': 5}, '4', 'incorrect'),
    spec('Faces du tétraèdre', 2, {'s': 4, 'r': 4}, '4', 'correct'),
]

# ---- 04. Les faces du cube et du pavé (CE2-063) ----

# s : 1 cube, 2 pavé sans face carrée, 3 pavé à base carrée (debout : dessus et dessous carrés).
# Les cotes disent quelles faces sont carrées : on raisonne, on ne devine pas sur le dessin.
F_FACES = 'forme: ' + selon('s', ['cube 3', 'pave 5 3 2', 'pave 2 2 4'])
LE_FACES = selon('s', ['ce cube', 'ce pavé', 'ce pavé'])
CARRES = selon('s', [
    'Ses $6$ faces sont des carrés : toutes ses arêtes ont la même longueur.',
    'Ses arêtes mesurent $5$, $3$ et $2$ cm : aucune face n\'a quatre côtés égaux, il n\'y a'
    ' aucun carré.',
    'Le dessous et le dessus ont des côtés de $2$ cm et $2$ cm : ce sont $2$ carrés. Les $4$'
    ' faces debout mesurent $2$ cm sur $4$ cm : ce ne sont pas des carrés.'])

NOMBRE_FACES = variation(
    'Combien ' + LE_FACES + ' a-t-il de faces, et combien de ces faces sont des carrés ?'
    + bloc('solide', F_FACES, 'cotes: cm') + '\n\n[_] faces, dont [_] carrés',
    ['6', '{{c}}'], [var('s', '1..3'), var('c', selon('s', ['6', '0', '2']))],
    ['Un cube et un pavé ont toujours ' + nb(6) + ' faces : devant, derrière, dessus, dessous,'
     ' à gauche et à droite.', CARRES,
     'Il y a ' + nb('{{c}}') + ' carré' + selon('s', ['s', '', 's']) + '.'])

# Un pavé sans face carrée seulement (décision 1) : la face grisée, dessinée penchée, reste un
# rectangle.
FACE_PAVE = variation(
    'Quelle est la forme de la face grisée de ce pavé ?'
    + bloc('solide', 'forme: pave ' + selon('o', ['5 3 2', '4 2.5 1.5', '2 3 4.5']),
           'marquer: face ' + selon('m', ['dessus', 'droite', 'devant']), 'cotes: cm')
    + choix(['C\'est un rectangle.', 'C\'est un carré.', 'C\'est un triangle.']),
    ['0'], [var('o', '1..3'), var('m', '1..3')],
    [selon('m', ['En perspective, la face du dessus est dessinée penchée, mais dans le vrai pavé'
                 ' tous ses angles sont droits.',
                 'En perspective, la face de droite est dessinée penchée, mais dans le vrai pavé'
                 ' tous ses angles sont droits.',
                 'La face de devant est dessinée en vraie grandeur : ses angles sont droits.']),
     'Ses côtés n\'ont pas la même longueur (voir les cotes) : c\'est un ' + colt('rectangle')
     + ', pas un carré.'])

SPECS_FACES = [
    spec('Cube : 6 faces, 6 carrés', 0, {'s': 1, 'c': 6}, ['6', '6'], 'correct'),
    spec('Erreur : faces vues seulement', 0, {'s': 1, 'c': 6}, ['3', '3'], 'incorrect'),
    spec('Pavé sans carré', 0, {'s': 2, 'c': 0}, ['6', '0'], 'correct'),
    spec('Erreur : pavé pris pour un cube', 0, {'s': 2, 'c': 0}, ['6', '6'], 'incorrect'),
    spec('Pavé à base carrée : 2 carrés', 0, {'s': 3, 'c': 2}, ['6', '2'], 'correct'),
    spec('Erreur : seul le dessus compté', 0, {'s': 3, 'c': 2}, ['6', '1'], 'incorrect'),
    spec('Erreur : les faces debout prises pour des carrés', 0, {'s': 3, 'c': 2}, ['6', '6'],
         'incorrect'),
    spec('Face du dessus : rectangle', 1, {'o': 1, 'm': 1}, '0', 'correct'),
    spec('Face de droite : rectangle', 1, {'o': 3, 'm': 2}, '0', 'correct'),
    spec('Erreur : face penchée prise pour un carré', 1, {'o': 2, 'm': 1}, '1', 'incorrect'),
]

# ---- 05. Les faces de la pyramide (CE2-064) ----

# q : 1 base carrée, 2 base rectangle, 3 base triangle
F_PYR = 'forme: pyramide ' + selon('q', ['carree 3 3.5', 'rectangle 4 2.5 3.5', 'triangle 3.5 3.5'])
BASE = selon('q', ['un carré', 'un rectangle', 'un triangle'])

COTES = variation(
    'Les faces qui montent jusqu\'au sommet $S$ de cette pyramide sont des…'
    + bloc('solide', F_PYR, selon('q', [PYR4_NOMS, PYR4_NOMS, PYR3_NOMS]))
    + choix(['triangles.', 'carrés.', 'rectangles.', 'disques.']),
    ['0'], [var('q', '1..3')],
    ['Chaque face de côté a une arête de la base et deux arêtes qui montent jusqu\'au sommet $S$ :'
     ' trois côtés.',
     'Les faces de côté d\'une pyramide sont toujours des ' + colt('triangles') + '.'])

# Décision 1 : à côté d'une base carrée, jamais « rectangle ».
BASE_PYR = variation(
    'La face grisée est la base de cette pyramide. Quelle est sa forme ?'
    + bloc('solide', F_PYR, 'marquer: face dessous', 'cotes: cm')
    + choix(['C\'est ' + BASE + '.',
             'C\'est ' + selon('q', ['un triangle', 'un triangle', 'un carré']) + '.',
             'C\'est un disque.']),
    ['0'], [var('q', '1..3')],
    [selon('q', ['La base a $4$ côtés de même longueur et des angles droits.',
                 'La base a $4$ côtés et des angles droits, mais ses côtés n\'ont pas tous la même'
                 ' longueur (voir les cotes).',
                 'La base a $3$ côtés.']),
     'La base de cette pyramide est ' + colt(BASE) + '.'])

TRIANGLES = variation(
    'Combien cette pyramide a-t-elle de faces en tout, et combien sont des triangles ?'
    + bloc('solide', F_PYR) + '\n\n[_] faces, dont [_] triangles',
    ['{{f}}', '{{t}}'], [var('q', '1..3'), var('f', selon('q', ['5', '5', '4'])), var('t', '4')],
    [selon('q', ['La base est un carré, et $4$ triangles montent jusqu\'au sommet.',
                 'La base est un rectangle, et $4$ triangles montent jusqu\'au sommet.',
                 'La base est elle-même un triangle, et $3$ triangles montent jusqu\'au sommet.']),
     nb('{{f}}') + ' faces, dont ' + nb('{{t}}') + ' triangles.'])

SPECS_PYR = [
    spec('Faces de côté : triangles', 0, {'q': 1}, '0', 'correct'),
    spec('Erreur : faces de côté prises pour des carrés', 0, {'q': 1}, '1', 'incorrect'),
    spec('Faces de côté, base triangle', 0, {'q': 3}, '0', 'correct'),
    spec('Base carrée', 1, {'q': 1}, '0', 'correct'),
    spec('Base rectangle', 1, {'q': 2}, '0', 'correct'),
    spec('Erreur : base prise pour un triangle', 1, {'q': 2}, '1', 'incorrect'),
    spec('Base triangle', 1, {'q': 3}, '0', 'correct'),
    spec('Erreur : base triangle prise pour un carré', 1, {'q': 3}, '1', 'incorrect'),
    spec('Base carrée : 5 faces, 4 triangles', 2, {'q': 1, 'f': 5, 't': 4}, ['5', '4'], 'correct'),
    spec('Erreur : base oubliée', 2, {'q': 1, 'f': 5, 't': 4}, ['4', '4'], 'incorrect'),
    spec('Base triangle : 4 faces, 4 triangles', 2, {'q': 3, 'f': 4, 't': 4}, ['4', '4'],
         'correct'),
    spec('Erreur : base triangle non comptée parmi les triangles', 2, {'q': 3, 'f': 4, 't': 4},
         ['4', '3'], 'incorrect'),
]

# ---- 06. Se plie-t-il en cube ? (CE2-066) ----

PLIER = ('On découpe cet assemblage de $6$ carrés et on le plie le long des traits.'
         ' Obtient-on un cube ?')
C_OUI_NON = ['Oui, il se plie en cube.', 'Non, il ne se plie pas en cube.']
POSE = ['tourner: {{eval:90*t}}', 'retourner: {{if:r==1|oui|non}}']
POSE_VARS = [var('t', '0..3'), var('r', '0..1')]

VRAI = variation(
    PLIER + bloc('patron', 'solide: cube', 'forme: {{k}}', *POSE) + choix(C_OUI_NON, False),
    ['0'], [var('k', '1..11')] + POSE_VARS,
    ['On imagine une face posée au sol, puis on relève les autres autour d\'elle.',
     'Chaque carré vient sur une face différente, sans trou ni carré en double : '
     + colt('oui') + ', c\'est un patron de cube.'])

FAUX = variation(
    PLIER + bloc('patron', 'solide: cube', 'forme: faux {{k}}', *POSE) + choix(C_OUI_NON, False),
    ['1'], [var('k', '1..8')] + POSE_VARS,
    ['On imagine une face posée au sol, puis on relève les autres autour d\'elle.',
     'Deux carrés arrivent au même endroit, et il reste un trou : ' + colt('non') + ', ce n\'est'
     ' pas un patron de cube.'])

SPECS_PLIER = [
    spec('La croix', 0, {'k': 1, 't': 0, 'r': 0}, '0', 'correct'),
    spec('Patron 2-3-1 tourné', 0, {'k': 8, 't': 1, 'r': 0}, '0', 'correct'),
    spec('Patron 3-3 retourné', 0, {'k': 11, 't': 2, 'r': 1}, '0', 'correct'),
    spec('Erreur : vrai patron jugé faux', 0, {'k': 10, 't': 3, 'r': 0}, '1', 'incorrect'),
    spec('Cinq carrés en ligne', 1, {'k': 1, 't': 0, 'r': 0}, '1', 'correct'),
    spec('Deux rangées de trois', 1, {'k': 2, 't': 1, 'r': 0}, '1', 'correct'),
    spec('Erreur : faux patron 1-4-1 décalé jugé bon', 1, {'k': 4, 't': 0, 'r': 1}, '0',
         'incorrect'),
    spec('Faux patron en T', 1, {'k': 8, 't': 2, 'r': 0}, '1', 'correct'),
]

# ---- 07. Lequel se plie en cube ? (CE2-066) ----

LEQUEL = 'Lequel de ces assemblages se plie en cube ?'

DEUX_FAUX = variation(
    LEQUEL + choix_dessins([
        ('patron', ['solide: cube', 'forme: {{k}}', 'tourner: {{eval:90*t}}']),
        ('patron', ['solide: cube', 'forme: faux {{a}}', 'tourner: {{eval:90*t}}']),
        ('patron', ['solide: cube', 'forme: faux {{b}}']),
    ]),
    ['0'], [var('k', '1..11'), var('a', '1..8'), var('b', '1..8'), var('t', '0..3')],
    ['Un patron de cube a $6$ carrés qui, pliés, viennent chacun sur une face différente.',
     'Dans les deux autres, deux carrés arrivent au même endroit en pliant.',
     'C\'est ' + colt('le seul qui se plie en cube') + '.'],
    conditions=['a!=b'])

# Le nombre de faces : 5 ou 7 carrés ne font jamais un cube.
CINQ = ['X X X .', '. X . .', '. X . .']
SEPT = ['X X X X', 'X . . .', 'X . . .', 'X . . .']


def grille(lignes):
    return ['solide: cube', 'forme:'] + ['  ' + x for x in lignes] + ['faux: oui']


NOMBRE = variation(
    LEQUEL + choix_dessins([
        ('patron', ['solide: cube', 'forme: {{k}}']),
        ('patron', grille(CINQ)),
        ('patron', grille(SEPT)),
    ]),
    ['0'], [var('k', '1..11')],
    ['Un cube a $6$ faces : il faut $6$ carrés, ni plus, ni moins.',
     'L\'un a $5$ carrés (il manque une face), l\'autre $7$ (un de trop).',
     'Seul ' + colt('l\'assemblage de 6 carrés') + ' se plie en cube.'])

SPECS_LEQUEL = [
    spec('Le vrai patron', 0, {'k': 1, 'a': 1, 'b': 2, 't': 0}, '0', 'correct'),
    spec('Erreur : faux patron choisi', 0, {'k': 5, 'a': 4, 'b': 6, 't': 1}, '1', 'incorrect'),
    spec('Erreur : l\'autre faux patron', 0, {'k': 9, 'a': 3, 'b': 7, 't': 2}, '2', 'incorrect'),
    spec('Six carrés', 1, {'k': 7}, '0', 'correct'),
    spec('Erreur : cinq carrés', 1, {'k': 7}, '1', 'incorrect'),
    spec('Erreur : sept carrés', 1, {'k': 3}, '2', 'incorrect'),
]

MODELES = {
    '01-nomme-le-solide': modele(
        'Nommer un solide : cube, pavé, boule, cône, pyramide, cylindre',
        'Un solide dessiné en perspective, à nommer parmi six ; pavé presque cube, cylindre bas',
        9, NOMME, SPECS_NOMME, delay=30),
    '02-face-arete-sommet': modele(
        'Face, arête ou sommet ?',
        'Sur un cube, un pavé ou une pyramide, l\'élément marqué : face grisée, arête épaisse,'
        ' sommet pointé',
        10, ELEMENTS, SPECS_ELEMENTS, delay=30),
    '03-compter-faces-aretes': modele(
        'Compter les sommets, les arêtes et les faces d\'un solide',
        'Cube, pavé (8, 12, 6), pyramide à base carrée (5, 8, 5) ou triangulaire (4, 6, 4),'
        ' arêtes cachées comprises',
        11, COMPTER, SPECS_COMPTER, delay=60),
    '04-faces-du-cube-et-du-pave': modele(
        'Les faces d\'un cube et d\'un pavé',
        '6 faces, dont combien de carrés (6, 0 ou 2, d\'après les cotes) ; la face penchée d\'un'
        ' pavé reste un rectangle',
        12, [NOMBRE_FACES, FACE_PAVE], SPECS_FACES, delay=60),
    '05-faces-de-la-pyramide': modele(
        'Les faces d\'une pyramide',
        'Faces de côté triangulaires, base carrée, rectangle ou triangle ; combien de faces et'
        ' de triangles',
        13, [COTES, BASE_PYR, TRIANGLES], SPECS_PYR, delay=60),
    '06-se-plie-en-cube': modele(
        'Cet assemblage se plie-t-il en cube ?',
        'Six carrés : un des 11 patrons du cube ou un des 8 faux, tourné ou retourné → oui / non',
        1, [VRAI, FAUX], SPECS_PLIER, delay=60),
    '07-lequel-est-un-patron': modele(
        'Lequel se plie en cube ?',
        'Trois assemblages : un patron de cube et deux faux ; ou 6, 5 et 7 carrés',
        2, [DEUX_FAUX, NOMBRE], SPECS_LEQUEL, delay=90),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
