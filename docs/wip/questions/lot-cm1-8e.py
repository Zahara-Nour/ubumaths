"""Écrit les 5 modèles du lot 8e du CM1 (solides) dans scripts/questions/cm1-8e/.

Phase 0 validée par David le 2026-11-18 (§ 25, 25 bis du journal
`docs/archive/wip/questions-cm1-progress.md`, « je valide »). Exemples de mise en œuvre CM1 p. 20 :
nommer les sept solides, prisme droit compris ; décrire par le nombre et la nature des faces, les
sommets, les arêtes ; faces d'une pyramide (triangles qui se rejoignent au sommet + une base qui
est un polygone de 3 côtés ou plus) ; faces d'un prisme droit (2 bases superposables + faces
latérales rectangles).

Règles d'écriture :

1. Un cube et un pavé SONT des prismes droits : jamais un cube ni un pavé à nommer quand
   « prisme droit » est parmi les choix (la réponse « prisme droit » serait juste aussi).
2. Comme au CE2 (`lot-ce2-10.py`) : jamais « rectangle » à côté d'une face carrée.
3. Arêtes cachées toujours en tirets.
4. Niveaux : suite du nœud Solides › propriétés (le CE2 s'arrête à 13) → 14 à 18.

Gabarit : `lot-ce2-10.py`. Variables à une lettre ; jamais `e` ni `i`.

    python3 docs/wip/questions/lot-cm1-8e.py scripts/questions/cm1-8e
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


def modele(title, description, grades, level, variations, specs, delay=60):
    # ni theme, ni domain, ni subdomain (ADR 0035) : le rangement est posé par la migration
    return {'title': title, 'description': description, 'grades': grades, 'level': level,
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


CM = ['CM1', 'CM2']
CM1 = ['CM1']

# Prismes : base triangle isocèle (b, h, L) ou triangle rectangle (a, b, L), face de devant.
# Longueur L jamais égale à un côté de la base : aucune face latérale carrée.
F_PRISME = 'forme: prisme ' + selon('o', ['triangle 3 2.5 4', 'triangle-rectangle 3 2 4.5',
                                         'triangle 4 2 3'])

# ---- 01. Nommer un solide, prisme droit compris (CM1-109, CM2-098) ----

NOMS = ['cube', 'pavé', 'boule', 'cône', 'pyramide', 'cylindre', 'prisme droit']
UNE = ('boule', 'pyramide')


def un(nom):
    return ('une ' if nom in UNE else 'un ') + nom


C_NOMS = ['C\'est ' + un(n) + '.' for n in NOMS]
P = NOMS.index('prisme droit')

DIT_PRISME = ('Il a deux faces pareilles, face à face : ce sont des triangles, ses '
              + colt('bases') + '. Ses autres faces, les faces latérales, sont des rectangles.')

PRISME_DEBOUT = variation(
    'Comment s\'appelle ce solide ?' + bloc('solide', F_PRISME) + choix(C_NOMS),
    [str(P)], [var('o', '1..3')],
    [DIT_PRISME, 'C\'est ' + colt('un prisme droit') + '.'])

# Piège : la pyramide à base triangle a aussi des triangles, mais ils se rejoignent en un sommet.
PYRAMIDE_TRIANGLE = variation(
    'Comment s\'appelle ce solide ?'
    + bloc('solide', 'forme: pyramide triangle ' + selon('o', ['3.5 3.5', '4 3', '3 4']))
    + choix(C_NOMS),
    [str(NOMS.index('pyramide'))], [var('o', '1..3')],
    ['Toutes ses faces sont des triangles, et trois d\'entre eux se rejoignent en un même sommet,'
     ' en haut.',
     'Un prisme droit aurait deux triangles face à face, reliés par des rectangles.',
     'C\'est ' + colt('une pyramide') + '.'])

# Règle 1 : ni cube ni pavé. s : 1 boule, 2 cône, 3 pyramide carrée, 4 pyramide rectangle,
# 5 cylindre.
F_AUTRE = 'forme: ' + selon('s', ['boule 2', 'cone 1.5 3.5', 'pyramide carree 3 3.5',
                                  'pyramide rectangle 4 2.5 3.5', 'cylindre 1.5 3'])
R_AUTRE = selon('s', [NOMS.index('boule'), NOMS.index('cône'), NOMS.index('pyramide'),
                      NOMS.index('pyramide'), NOMS.index('cylindre')])
DIT_AUTRE = selon('s', [
    'Elle est toute ronde : ni face plane, ni sommet, ni arête. C\'est ' + colt('une boule') + '.',
    'Une base ronde, un disque, et une face courbe qui finit en pointe : c\'est '
    + colt('un cône') + '.',
    'Une base carrée et quatre triangles qui se rejoignent en un sommet : c\'est '
    + colt('une pyramide') + '.',
    'Une base rectangle et quatre triangles qui se rejoignent en un sommet : c\'est '
    + colt('une pyramide') + '.',
    'Deux disques face à face, reliés par une face courbe. Ses bases ne sont pas des polygones :'
    ' ce n\'est pas un prisme droit, c\'est ' + colt('un cylindre') + '.'])

AUTRE = variation(
    'Comment s\'appelle ce solide ?' + bloc('solide', F_AUTRE) + choix(C_NOMS),
    ['{{r}}'], [var('s', '1..5'), var('r', R_AUTRE)],
    [DIT_AUTRE])

LEQUEL_PRISME = variation(
    'Lequel de ces solides est un prisme droit ?'
    + choix_dessins([
        ('solide', [F_PRISME]),
        ('solide', ['forme: pyramide triangle 3.5 3.5']),
        ('solide', ['forme: cylindre 1.5 3']),
        ('solide', ['forme: cone 1.5 3.5']),
    ]),
    ['0'], [var('o', '1..3')],
    ['Un prisme droit a deux bases pareilles, des polygones, face à face, reliées par des'
     ' rectangles.',
     'La pyramide finit en pointe ; le cylindre et le cône ont des bases rondes.',
     'C\'est ' + colt('le solide aux deux triangles face à face') + '.'])

V1 = {'o': 1}
SPECS_NOMME = [
    spec('Prisme à base isocèle', 0, V1, str(P), 'correct'),
    spec('Prisme couché, base triangle rectangle', 0, {'o': 2}, str(P), 'correct'),
    spec('Erreur : prisme pris pour une pyramide', 0, V1, '4', 'incorrect'),
    spec('Erreur : prisme pris pour un pavé', 0, {'o': 3}, '1', 'incorrect'),
    spec('Pyramide à base triangle', 1, V1, '4', 'correct'),
    spec('Erreur : pyramide à base triangle prise pour un prisme', 1, {'o': 2}, str(P),
         'incorrect'),
    spec('Boule', 2, {'s': 1, 'r': 2}, '2', 'correct'),
    spec('Cône', 2, {'s': 2, 'r': 3}, '3', 'correct'),
    spec('Pyramide à base rectangle', 2, {'s': 4, 'r': 4}, '4', 'correct'),
    spec('Cylindre', 2, {'s': 5, 'r': 5}, '5', 'correct'),
    spec('Erreur : cylindre pris pour un prisme droit', 2, {'s': 5, 'r': 5}, str(P), 'incorrect'),
    spec('Erreur : cône pris pour une pyramide', 2, {'s': 2, 'r': 3}, '4', 'incorrect'),
    spec('Le prisme parmi quatre solides', 3, V1, '0', 'correct'),
    spec('Erreur : la pyramide à base triangle', 3, V1, '1', 'incorrect'),
    spec('Erreur : le cylindre', 3, {'o': 2}, '2', 'incorrect'),
]

# ---- 02. Le portrait d'un solide (CM1-110, CM2-099) ----

# p : 1 prisme à base triangle, 2 prisme à base pentagone, 3 pyramide à base carrée,
# 4 pyramide à base triangle, 5 prisme à base hexagone.
PORTRAIT = selon('p', [
    'J\'ai $5$ faces : $2$ triangles pareils, face à face, et $3$ rectangles.',
    'J\'ai $7$ faces : $2$ pentagones pareils, face à face, et $5$ rectangles.',
    'J\'ai $5$ faces : $1$ carré, et $4$ triangles qui se rejoignent en un même sommet.',
    'J\'ai $4$ faces, toutes des triangles ; trois d\'entre eux se rejoignent en un même sommet.',
    'J\'ai $8$ faces : $2$ hexagones pareils, face à face, et $6$ rectangles.'])
R_PORTRAIT = selon('p', [P, P, NOMS.index('pyramide'), NOMS.index('pyramide'), P])
DIT_PORTRAIT = selon('p', [
    'Deux bases pareilles face à face, reliées par des rectangles : c\'est '
    + colt('un prisme droit') + ', à base triangulaire.',
    'Deux bases pareilles face à face, reliées par des rectangles : c\'est '
    + colt('un prisme droit') + ', à base pentagonale ($5$ côtés, donc $5$ rectangles).',
    'Des triangles qui se rejoignent en un sommet, sur une base : c\'est ' + colt('une pyramide')
    + ', à base carrée.',
    'Des triangles qui se rejoignent en un sommet : c\'est ' + colt('une pyramide')
    + ', dont la base est elle aussi un triangle.',
    'Deux bases pareilles face à face, reliées par des rectangles : c\'est '
    + colt('un prisme droit') + ', à base hexagonale ($6$ côtés, donc $6$ rectangles).'])

QUI_SUIS_JE = variation(
    PORTRAIT + ' Qui suis-je ?' + choix(C_NOMS),
    ['{{r}}'], [var('p', '1..5'), var('r', R_PORTRAIT)],
    [DIT_PORTRAIT])

# Règle 1 : cube et pavé, sans « prisme droit » parmi les choix.
C_QUATRE = ['C\'est un cube.', 'C\'est un pavé.', 'C\'est une pyramide.', 'C\'est un cylindre.']
CUBE_PAVE = variation(
    selon('c', ['J\'ai $6$ faces, toutes des carrés pareils ; $8$ sommets et $12$ arêtes.',
                'J\'ai $6$ faces rectangulaires, qui ne sont pas toutes des carrés ; $8$ sommets'
                ' et $12$ arêtes.'])
    + ' Qui suis-je ?' + choix(C_QUATRE),
    ['{{eval:c-1}}'], [var('c', '1..2')],
    [selon('c', ['Six faces carrées toutes pareilles : c\'est ' + colt('un cube') + '.',
                 'Six faces rectangulaires, pas toutes carrées : c\'est ' + colt('un pavé')
                 + '.'])])

SOMMETS_ARETES = variation(
    'Combien ce prisme droit a-t-il de sommets, et combien d\'arêtes ?'
    + bloc('solide', F_PRISME) + '\n\n[_] sommets et [_] arêtes',
    ['6', '9'], [var('o', '1..3')],
    ['Les traits en pointillés sont les arêtes cachées : elles comptent aussi.',
     'Sommets : $3$ sur la base de devant et $3$ sur celle de derrière, ' + nb(6) + '.',
     'Arêtes : $3$ autour de chaque base, et $3$ qui les relient : $3 + 3 + 3 = '
     + col('9') + '$.'])

SPECS_PORTRAIT = [
    spec('Prisme à base triangle', 0, {'p': 1, 'r': P}, str(P), 'correct'),
    spec('Erreur : prisme pris pour une pyramide', 0, {'p': 1, 'r': P}, '4', 'incorrect'),
    spec('Prisme à base pentagone', 0, {'p': 2, 'r': P}, str(P), 'correct'),
    spec('Pyramide à base carrée', 0, {'p': 3, 'r': 4}, '4', 'correct'),
    spec('Erreur : pyramide prise pour un prisme', 0, {'p': 3, 'r': 4}, str(P), 'incorrect'),
    spec('Pyramide à base triangle', 0, {'p': 4, 'r': 4}, '4', 'correct'),
    spec('Prisme à base hexagone', 0, {'p': 5, 'r': P}, str(P), 'correct'),
    spec('Cube', 1, {'c': 1}, '0', 'correct'),
    spec('Erreur : cube pris pour un pavé', 1, {'c': 1}, '1', 'incorrect'),
    spec('Pavé', 1, {'c': 2}, '1', 'correct'),
    spec('Erreur : pavé pris pour un cube', 1, {'c': 2}, '0', 'incorrect'),
    spec('Prisme : 6 sommets, 9 arêtes', 2, V1, ['6', '9'], 'correct'),
    spec('Erreur : arêtes cachées oubliées', 2, V1, ['6', '7'], 'incorrect'),
    spec('Erreur : sommets et arêtes échangés', 2, {'o': 2}, ['9', '6'], 'incorrect'),
    spec('Erreur : compté comme un pavé', 2, {'o': 3}, ['8', '12'], 'incorrect'),
]

# ---- 03. Les faces d'un cube et d'un pavé : mesures (CM1-111) ----

# Pavés aux trois dimensions différentes : seule la face opposée est pareille à la face grisée.
# o : dimensions (longueur devant, largeur en fuyante, hauteur) ; m : 1 dessus, 2 devant, 3 droite.
DIMS = [(5, 3, 2), (6, 2, 4), (4, 3, 5)]
F_PAVE = 'forme: pave ' + selon('o', [' '.join(str(x) for x in d) for d in DIMS])
OPPOSEE = selon('m', ['le dessous', 'la face de derrière', 'la face de gauche'])

PAREILLES = variation(
    'Combien de faces de ce pavé sont exactement pareilles à la face grisée, la face grisée'
    ' comprise ?' + bloc('solide', F_PAVE, 'marquer: face ' + selon('m', ['dessus', 'devant',
                                                                        'droite']), 'cotes: cm')
    + '\n\n[_] faces',
    ['2'], [var('o', '1..3'), var('m', '1..3')],
    ['Dans un pavé, deux faces face à face sont pareilles. La face grisée a sa jumelle : '
     + OPPOSEE + '.',
     'Les trois longueurs du pavé sont différentes : les autres faces ont d\'autres mesures.',
     'Il y a ' + nb(2) + ' faces pareilles.'])


def mesures(d, m):
    """(longueur, largeur) de la face m d'un pavé d = (l, p, h)."""
    l, p, h = d
    cotes = {1: (l, p), 2: (l, h), 3: (p, h)}[m]
    return max(cotes), min(cotes)


LONG = selon('o', [selon('m', [mesures(d, m)[0] for m in (1, 2, 3)]) for d in DIMS])
LARG = selon('o', [selon('m', [mesures(d, m)[1] for m in (1, 2, 3)]) for d in DIMS])

MESURES = variation(
    'La face grisée de ce pavé est un rectangle. Quelles sont ses mesures ?'
    + bloc('solide', F_PAVE, 'marquer: face ' + selon('m', ['dessus', 'devant', 'droite']),
           'cotes: cm')
    + '\n\nLongueur : [_] cm\n\nLargeur : [_] cm',
    ['{{a}}', '{{b}}'], [var('o', '1..3'), var('m', '1..3'), var('a', LONG), var('b', LARG)],
    ['Chaque côté de la face grisée est une arête du pavé : on lit sa mesure sur l\'arête'
     ' pareille qui porte une cote.',
     'La face grisée mesure ' + nb('{{a}}') + ' cm sur ' + nb('{{b}}') + ' cm.'])

# s : 1 cube, 2 pavé à base carrée, 3 pavé sans face carrée
F_CARRES = 'forme: ' + selon('s', ['cube 3', 'pave 3 3 5', 'pave 5 3 2'])
CARRES = variation(
    'Parmi les $6$ faces de ' + selon('s', ['ce cube', 'ce pavé', 'ce pavé']) + ', combien sont des'
    ' carrés, et combien sont des rectangles qui ne sont pas des carrés ?'
    + bloc('solide', F_CARRES, 'cotes: cm')
    + '\n\n[_] carrés et [_] rectangles non carrés',
    ['{{c}}', '{{eval:6-c}}'], [var('s', '1..3'), var('c', selon('s', ['6', '2', '0']))],
    [selon('s', [
        'Toutes les arêtes mesurent $3$ cm : les $6$ faces sont des carrés.',
        'Le dessus et le dessous mesurent $3$ cm sur $3$ cm : $2$ carrés. Les $4$ faces debout'
        ' mesurent $3$ cm sur $5$ cm : des rectangles qui ne sont pas des carrés.',
        'Les arêtes mesurent $5$, $3$ et $2$ cm : aucune face n\'a quatre côtés égaux.']),
     nb('{{c}}') + ' carré' + selon('s', ['s', 's', '']) + ' et ' + nb('{{eval:6-c}}')
     + ' rectangle' + selon('s', ['', 's', 's']) + ' non carré' + selon('s', ['', 's', 's'])
     + '.'])

SPECS_CUBE_PAVE = [
    spec('Face du dessus : 2 pareilles', 0, {'o': 1, 'm': 1}, '2', 'correct'),
    spec('Face de droite : 2 pareilles', 0, {'o': 3, 'm': 3}, '2', 'correct'),
    spec('Erreur : la face grisée seule', 0, {'o': 2, 'm': 2}, '1', 'incorrect'),
    spec('Erreur : les 4 faces debout', 0, {'o': 1, 'm': 2}, '4', 'incorrect'),
    spec('Dessus du pavé 5 3 2 : 5 sur 3', 1, {'o': 1, 'm': 1, 'a': 5, 'b': 3}, ['5', '3'],
         'correct'),
    spec('Devant du pavé 6 2 4 : 6 sur 4', 1, {'o': 2, 'm': 2, 'a': 6, 'b': 4}, ['6', '4'],
         'correct'),
    spec('Droite du pavé 4 3 5 : 5 sur 3', 1, {'o': 3, 'm': 3, 'a': 5, 'b': 3}, ['5', '3'],
         'correct'),
    spec('Erreur : longueur et largeur échangées', 1, {'o': 1, 'm': 1, 'a': 5, 'b': 3},
         ['3', '5'], 'incorrect'),
    spec('Erreur : la hauteur prise pour la largeur', 1, {'o': 1, 'm': 1, 'a': 5, 'b': 3},
         ['5', '2'], 'incorrect'),
    spec('Cube : 6 et 0', 2, {'s': 1, 'c': 6}, ['6', '0'], 'correct'),
    spec('Pavé à base carrée : 2 et 4', 2, {'s': 2, 'c': 2}, ['2', '4'], 'correct'),
    spec('Erreur : le dessus seul compté', 2, {'s': 2, 'c': 2}, ['1', '5'], 'incorrect'),
    spec('Pavé sans carré : 0 et 6', 2, {'s': 3, 'c': 0}, ['0', '6'], 'correct'),
    spec('Erreur : cube jugé sans carré', 2, {'s': 1, 'c': 6}, ['0', '6'], 'incorrect'),
]

# ---- 04. Les faces d'une pyramide : base et faces latérales (CM1-112) ----

# q : 1 base carrée, 2 base rectangle, 3 base triangle
F_PYR = 'forme: pyramide ' + selon('q', ['carree 3 3.5', 'rectangle 4 2.5 3.5', 'triangle 3.5 3.5'])

LATERALES_PYR = variation(
    'Combien cette pyramide a-t-elle de faces latérales, et combien de faces en tout ?'
    + bloc('solide', F_PYR, 'marquer: face dessous')
    + '\n\nLa base est grisée.\n\n[_] faces latérales et [_] faces en tout',
    ['{{n}}', '{{eval:n+1}}'], [var('q', '1..3'), var('n', selon('q', ['4', '4', '3']))],
    ['Chaque côté de la base porte une face latérale, un triangle qui monte jusqu\'au sommet.',
     'La base a ' + nb('{{n}}') + ' côtés : ' + nb('{{n}}') + ' faces latérales, et avec la base, '
     + nb('{{eval:n+1}}') + ' faces en tout.'])

# n = 7 : pas de nom courant, rien entre parenthèses
POLYGONE = selon('n', ['', '', '', '', ' (un pentagone)', ' (un hexagone)', '',
                       ' (un octogone)'])

SANS_DESSIN_PYR = variation(
    'La base d\'une pyramide a ${{n}}$ côtés' + POLYGONE + '. Combien cette'
    ' pyramide a-t-elle de faces latérales, et combien de faces en tout ?'
    + '\n\n[_] faces latérales et [_] faces en tout',
    ['{{n}}', '{{eval:n+1}}'], [var('n', '5..8')],
    ['Chaque côté de la base porte une face latérale, un triangle qui monte jusqu\'au sommet :'
     ' ' + nb('{{n}}') + ' faces latérales.',
     'Avec la base : ${{n}} + 1 = ' + col('{{eval:n+1}}') + '$ faces en tout.'])

VRAIE = variation(
    'Quelle phrase est vraie pour toutes les pyramides ?'
    + choix(['Ses faces latérales sont des triangles qui se rejoignent en un même sommet.',
             'Toutes ses faces sont des triangles.',
             'Sa base est un carré.',
             'Elle a $5$ faces.']),
    ['0'], [],
    ['Une pyramide peut avoir une base carrée, rectangle, triangulaire ou à plus de côtés : ni sa'
     ' base, ni son nombre de faces ne sont toujours les mêmes, et sa base n\'est un triangle que'
     ' parfois.',
     'Ce qui est toujours vrai : ses faces latérales sont des ' + colt('triangles')
     + ' qui se rejoignent au sommet.'])

SPECS_PYR = [
    spec('Base carrée : 4 et 5', 0, {'q': 1, 'n': 4}, ['4', '5'], 'correct'),
    spec('Erreur : base oubliée', 0, {'q': 1, 'n': 4}, ['4', '4'], 'incorrect'),
    spec('Base rectangle : 4 et 5', 0, {'q': 2, 'n': 4}, ['4', '5'], 'correct'),
    spec('Base triangle : 3 et 4', 0, {'q': 3, 'n': 3}, ['3', '4'], 'correct'),
    spec('Erreur : base triangle comptée parmi les faces latérales', 0, {'q': 3, 'n': 3},
         ['4', '4'], 'incorrect'),
    spec('Base à 5 côtés : 5 et 6', 1, {'n': 5}, ['5', '6'], 'correct'),
    spec('Base à 8 côtés : 8 et 9', 1, {'n': 8}, ['8', '9'], 'correct'),
    spec('Erreur : comme un prisme (deux bases)', 1, {'n': 6}, ['6', '8'], 'incorrect'),
    spec('Erreur : base oubliée', 1, {'n': 7}, ['7', '7'], 'incorrect'),
    spec('La phrase vraie', 2, {}, '0', 'correct'),
    spec('Erreur : toutes les faces sont des triangles', 2, {}, '1', 'incorrect'),
    spec('Erreur : toujours 5 faces', 2, {}, '3', 'incorrect'),
]

# ---- 05. Les faces d'un prisme droit (CM1-113) ----

# Seules les faces latérales dont les DEUX côtés sont cotés : le dessous (base b, longueur L) ;
# pour la base en triangle rectangle, aussi la face de gauche (côté vertical b, longueur L). Le
# côté oblique n'est jamais coté : une face qui le porte ne se tranche pas entre carré et
# rectangle (4 2 3 : 2,8 cm sur 3 cm, vu à l'aperçu).
FACE_LATERALE = selon('o', ['dessous', selon('m', ['dessous', 'gauche']), 'dessous'])

LATERALE = variation(
    'Quelle est la forme de la face grisée de ce prisme droit ?'
    + bloc('solide', F_PRISME, 'marquer: face ' + FACE_LATERALE, 'cotes: cm')
    + choix(['C\'est un rectangle.', 'C\'est un triangle.', 'C\'est un carré.']),
    ['0'], [var('o', '1..3'), var('m', '1..2')],
    ['La face grisée relie la base de devant à celle de derrière : c\'est une face latérale.',
     'En perspective, elle est dessinée penchée ; dans le vrai prisme, ses angles sont droits et'
     ' ses côtés n\'ont pas tous la même longueur (voir les cotes).',
     'Les faces latérales d\'un prisme droit sont des ' + colt('rectangles') + '.'])

BASE_PRISME = variation(
    'Quelle est la forme de la face grisée de ce prisme droit ?'
    + bloc('solide', F_PRISME, 'marquer: face ' + selon('m', ['devant', 'derriere'])
           )
    + choix(['C\'est un triangle.', 'C\'est un rectangle.', 'C\'est un carré.']),
    ['0'], [var('o', '1..3'), var('m', '1..2')],
    ['La face grisée est ' + selon('m', ['devant', 'derrière'])
     + ' : c\'est une des deux bases du prisme. Elle a $3$ côtés.',
     'Les bases de ce prisme sont des ' + colt('triangles') + ', pareils et face à face.'])

COMPTE_PRISME = variation(
    'Combien ce prisme droit a-t-il de faces ? Combien de bases, combien de faces latérales ?'
    + bloc('solide', F_PRISME)
    + '\n\n[_] faces : [_] bases et [_] faces latérales',
    ['5', '2', '3'], [var('o', '1..3')],
    ['Les $2$ bases sont les triangles de devant et de derrière.',
     'Chaque côté de la base porte une face latérale, un rectangle : $3$ faces latérales.',
     '$2 + 3 = ' + col('5') + '$ faces.'])

SANS_DESSIN_PRISME = variation(
    'Les bases d\'un prisme droit sont des polygones à ${{n}}$ côtés. Combien ce prisme'
    ' a-t-il de faces latérales, et combien de faces en tout ?'
    + '\n\n[_] faces latérales et [_] faces en tout',
    ['{{n}}', '{{eval:n+2}}'], [var('n', '5..8')],
    ['Chaque côté d\'une base porte une face latérale, un rectangle : ' + nb('{{n}}')
     + ' faces latérales.',
     'Avec les $2$ bases : ${{n}} + 2 = ' + col('{{eval:n+2}}') + '$ faces en tout.'])

SPECS_PRISME = [
    spec('Face latérale du dessous : rectangle', 0, {'o': 1, 'm': 1}, '0', 'correct'),
    spec('Face latérale de gauche : rectangle', 0, {'o': 2, 'm': 2}, '0', 'correct'),
    spec('Erreur : face latérale prise pour un triangle', 0, {'o': 3, 'm': 2}, '1', 'incorrect'),
    spec('Erreur : face latérale prise pour un carré', 0, {'o': 1, 'm': 2}, '2', 'incorrect'),
    spec('Base de devant : triangle', 1, {'o': 1, 'm': 1}, '0', 'correct'),
    spec('Base de derrière : triangle', 1, {'o': 2, 'm': 2}, '0', 'correct'),
    spec('Erreur : base prise pour un rectangle', 1, {'o': 3, 'm': 1}, '1', 'incorrect'),
    spec('5 faces : 2 bases, 3 latérales', 2, V1, ['5', '2', '3'], 'correct'),
    spec('Erreur : une seule base', 2, V1, ['4', '1', '3'], 'incorrect'),
    spec('Erreur : compté comme un pavé', 2, {'o': 2}, ['6', '2', '4'], 'incorrect'),
    spec('Bases à 5 côtés : 5 et 7', 3, {'n': 5}, ['5', '7'], 'correct'),
    spec('Bases à 8 côtés : 8 et 10', 3, {'n': 8}, ['8', '10'], 'correct'),
    spec('Erreur : une seule base', 3, {'n': 6}, ['6', '7'], 'incorrect'),
    spec('Erreur : bases oubliées', 3, {'n': 7}, ['7', '7'], 'incorrect'),
]

MODELES = {
    '01-nommer-un-solide-prisme': modele(
        'Nommer un solide, prisme droit compris',
        'Sept noms : prisme droit debout ou couché, pyramide à base triangle (piège), boule,'
        ' cône, pyramide, cylindre ; lequel est un prisme droit parmi quatre solides',
        CM, 14, [PRISME_DEBOUT, PYRAMIDE_TRIANGLE, AUTRE, LEQUEL_PRISME], SPECS_NOMME, delay=30),
    '02-le-portrait-d-un-solide': modele(
        'Le portrait d\'un solide',
        'Retrouver un solide d\'après ses faces (prismes à base triangle, pentagone, hexagone ;'
        ' pyramides ; cube, pavé) ; sommets et arêtes d\'un prisme (6, 9)',
        CM, 15, [QUI_SUIS_JE, CUBE_PAVE, SOMMETS_ARETES], SPECS_PORTRAIT, delay=60),
    '03-faces-cube-pave-mesures': modele(
        'Les faces d\'un cube et d\'un pavé : mesures',
        'Faces opposées pareilles ; mesures d\'une face d\'après les cotes ; combien de carrés et'
        ' de rectangles non carrés (6 et 0, 2 et 4, 0 et 6)',
        CM1, 16, [PAREILLES, MESURES, CARRES], SPECS_CUBE_PAVE, delay=60),
    '04-faces-pyramide-base-laterales': modele(
        'Les faces d\'une pyramide : base et faces latérales',
        'Faces latérales et faces en tout (base à 3, 4, puis 5 à 8 côtés, sans dessin) ; ce qui'
        ' est vrai pour toutes les pyramides',
        CM1, 17, [LATERALES_PYR, SANS_DESSIN_PYR, VRAIE], SPECS_PYR, delay=60),
    '05-faces-d-un-prisme-droit': modele(
        'Les faces d\'un prisme droit',
        'Faces latérales rectangles, bases triangles ; 5 faces = 2 bases + 3 faces latérales ;'
        ' bases à 5 à 8 côtés, sans dessin',
        CM1, 18, [LATERALE, BASE_PRISME, COMPTE_PRISME, SANS_DESSIN_PRISME], SPECS_PRISME,
        delay=60),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
