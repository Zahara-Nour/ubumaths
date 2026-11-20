"""Écrit les modèles du lot 13 du CE1 : CE1-001, 002, 003 (collection à centaines) et CE1-074 (instruments).

Phase 0 validée par David le 2026-11-19 (§ 20 du journal `docs/archive/wip/questions-ce1-progress.md`,
« je te suis »). Bornes `cycle2.json` : CE1-001 à 003 (groupes de dix et de cent ; plus de dix
éléments d'une unité de numération : 17 u, 8 d et 2 c ; 2 c, 27 d et 14 u ; 235 timbres par
plaques de 100, carnets de 10 ou à l'unité), CE1-074 (règle graduée, équerre, compas). Décisions :

1. `aaebfe52` (CE1-001) et `2fafe84d` (CE1-002), du CE2, tagués par la migration : pas de copie ici.
2. Triangle quelconque de 072 : hors du lot (`outils-manquants.md`, ligne 47).
3. 074 en deux modèles : règle graduée ; équerre et compas.

Nombres ≤ 1 000 (bornes du CE1). Variables à une lettre ; jamais `e` ni `i`.

    python3 docs/wip/questions/lot-ce1-13.py scripts/questions/ce1-13
"""
import json
import math
import sys

DOSSIER = sys.argv[1]

# ---- Gabarits (comme lot-ce1-12.py) ----


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(x) for k, x in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(title, description, memo_categorie, level, variations, specs, delay=90):
    # ni theme, ni domain, ni subdomain (ADR 0035) : `memo_categorie` n'est qu'un mémo ;
    # rangement (sous-notion du point) et tag posés par la migration
    del memo_categorie
    return {'title': title, 'description': description, 'grades': ['CE1'], 'level': level,
            'delay': delay, 'status': 'draft', 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, reponses, variables, etapes, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    if reponses is not None:  # case « figure » ou collection à construire : case posée par le générateur
        v['blanks'] = [{'expectedAnswer': r} for r in reponses]
    else:
        v['blanks'] = []
    v['correction'] = {'steps': etapes}
    return v


def bloc(nom, *lignes):
    return '\n\n```' + nom + '\n' + '\n'.join(lignes) + '\n```'


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


def accord(nom, singulier, pluriel):
    return '{{if:' + nom + '<=1|' + singulier + '|' + pluriel + '}}'


# ---- 01. Dénombrer avec plus de dix objets d'un rang (CE1-001) ----

QUESTION_COMPTE = 'Combien de petits cubes y a-t-il en tout ?'


def collection(c, d, u):
    return bloc('collection', 'centaines: ' + c, 'dizaines: ' + d, 'unités: ' + u)


TOTAL = '{{eval:100*c+10*d+u}}'

PLUS_DE_DIX_CUBES = variation(
    QUESTION_COMPTE + collection('{{c}}', '{{d}}', '{{u}}') + '\n\nIl y a $?$ cubes en tout.',
    [TOTAL], [var('c', '1..8'), var('d', '1..8'), var('u', '11..19')],
    ['Il y a ${{c}}$ ' + accord('c', 'plaque', 'plaques') + ', ${{d}}$ '
     + accord('d', 'barre', 'barres') + ' et ${{u}}$ petits cubes seuls.',
     'Avec ' + colt('10 petits cubes seuls') + ', on fait une barre de plus : ${{u}}$ cubes,'
     ' c\'est $1$ dizaine et ${{eval:u-10}}$ ' + accord('u-10', 'unité', 'unités') + '.',
     '${{c}}$ ' + accord('c', 'centaine', 'centaines') + ', ${{eval:d+1}}$ dizaines et'
     ' ${{eval:u-10}}$ ' + accord('u-10', 'unité', 'unités') + ' : il y a $'
     + col(TOTAL) + '$ cubes.'],
    ['100*c+10*d+u <= 999'])

PLUS_DE_DIX_BARRES = variation(
    QUESTION_COMPTE + collection('{{c}}', '{{d}}', '{{u}}') + '\n\nIl y a $?$ cubes en tout.',
    [TOTAL], [var('c', '1..7'), var('d', '11..29'), var('u', '1..9')],
    ['Il y a ${{c}}$ ' + accord('c', 'plaque', 'plaques') + ', ${{d}}$ barres et ${{u}}$ '
     + accord('u', 'petit cube', 'petits cubes') + ' seuls.',
     'Avec ' + colt('10 barres') + ', on fait une plaque : ${{d}}$ dizaines, c\'est'
     ' ${{eval:floor(d/10)}}$ ' + accord('floor(d/10)', 'centaine', 'centaines')
     + ' et ${{eval:d-10*floor(d/10)}}$ '
     + accord('d-10*floor(d/10)', 'dizaine', 'dizaines') + '.',
     '${{eval:c+floor(d/10)}}$ centaines, ${{eval:d-10*floor(d/10)}}$ '
     + accord('d-10*floor(d/10)', 'dizaine', 'dizaines') + ' et ${{u}}$ '
     + accord('u', 'unité', 'unités') + ' : il y a $' + col(TOTAL) + '$ cubes.'],
    ['100*c+10*d+u <= 999', 'd != 20'])

PLUS_DE_DIX_LES_DEUX = variation(
    QUESTION_COMPTE + collection('{{c}}', '{{d}}', '{{u}}') + '\n\nIl y a $?$ cubes en tout.',
    [TOTAL], [var('c', '1..6'), var('d', '11..29'), var('u', '11..19')],
    ['Il y a ${{c}}$ ' + accord('c', 'plaque', 'plaques') + ', ${{d}}$ barres et ${{u}}$'
     ' petits cubes seuls.',
     'On compte par rang : ${{c}}$ ' + accord('c', 'centaine fait', 'centaines font') + ' $'
     + '{{eval:100*c}}' + '$, ${{d}}$ dizaines font ${{eval:10*d}}$ et il reste ${{u}}$ unités.',
     '${{eval:100*c}} + {{eval:10*d}} + {{u}} = ' + col(TOTAL) + '$ : il y a $' + col(TOTAL)
     + '$ cubes.'],
    ['100*c+10*d+u <= 999'])

SPECS_DENOMBRER = [
    spec('2 c, 3 d, 17 u = 247', 0, {'c': 2, 'd': 3, 'u': 17}, '247', 'correct'),
    spec('Erreur : chiffres mis bout à bout (2317)', 0, {'c': 2, 'd': 3, 'u': 17}, '2317',
         'incorrect'),
    spec('Erreur : la dizaine des 17 oubliée (237)', 0, {'c': 2, 'd': 3, 'u': 17}, '237',
         'incorrect'),
    spec('8 c, 8 d, 19 u = 899', 0, {'c': 8, 'd': 8, 'u': 19}, '899', 'correct'),
    spec('2 c, 27 d, 4 u = 474', 1, {'c': 2, 'd': 27, 'u': 4}, '474', 'correct'),
    spec('Erreur : 2274 (bout à bout)', 1, {'c': 2, 'd': 27, 'u': 4}, '2274', 'incorrect'),
    spec('Erreur : 274 (les 20 dizaines oubliées)', 1, {'c': 2, 'd': 27, 'u': 4}, '274',
         'incorrect'),
    spec('2 c, 27 d, 14 u = 484 (exemple du BO)', 2, {'c': 2, 'd': 27, 'u': 14}, '484',
         'correct'),
    spec('Erreur : 274 (plus de dix ignorés)', 2, {'c': 2, 'd': 27, 'u': 14}, '274',
         'incorrect'),
    spec('Erreur : 22714 (bout à bout)', 2, {'c': 2, 'd': 27, 'u': 14}, '22714', 'incorrect'),
    spec('Rien d\'écrit', 2, {'c': 2, 'd': 27, 'u': 14}, '', 'empty'),
]

# ---- 02. Construire une collection d'après une écriture en unités de numération (CE1-002) ----

CONSTRUIS = 'Construis la collection de '


def construire(n):
    return bloc('collection', 'construire: ' + n)


CONS_DIZAINES = variation(
    CONSTRUIS + '$' + col('{{c}}') + '$ ' + accord('c', 'centaine', 'centaines') + ', $'
    + col('{{d}}', 1) + '$ dizaines et ${{u}}$ ' + accord('u', 'unité', 'unités') + '.'
    + construire(TOTAL),
    None, [var('c', '1..8'), var('d', '11..19'), var('u', '1..9')],
    ['${{d}}$ dizaines, c\'est $1$ centaine et ${{eval:d-10}}$ '
     + accord('d-10', 'dizaine', 'dizaines') + '.',
     'La collection vaut $' + col(TOTAL) + '$ : on pose ${{eval:c+1}}$ plaques, ${{eval:d-10}}$ '
     + accord('d-10', 'barre', 'barres') + ' et ${{u}}$ '
     + accord('u', 'petit cube', 'petits cubes') + ' (ou ${{c}}$ '
     + accord('c', 'plaque', 'plaques') + ' et ${{d}}$ barres).'],
    ['100*c+10*d+u <= 999'])

CONS_SANS_CENTAINE = variation(
    CONSTRUIS + '$' + col('{{d}}', 1) + '$ dizaines et ${{u}}$ ' + accord('u', 'unité', 'unités')
    + '.' + construire('{{eval:10*d+u}}'),
    None, [var('d', '11..39'), var('u', '1..19')],
    ['${{d}}$ dizaines font ${{eval:10*d}}$ ; avec ${{u}}$ ' + accord('u', 'unité', 'unités')
     + ', la collection vaut $' + col('{{eval:10*d+u}}') + '$.',
     'On peut poser ${{d}}$ barres et ${{u}}$ ' + accord('u', 'petit cube', 'petits cubes')
     + ', ou remplacer chaque fois $10$ barres par une plaque et $10$ petits cubes par une barre.'],
    ['d != 20', 'd != 30', 'u != 10'])

CONS_MILLE = variation(
    CONSTRUIS + '$' + col('{{c}}') + '$ centaines et $' + col('{{d}}', 1) + '$ dizaines.'
    + construire('{{eval:100*c+10*d}}'),
    None, [var('c', '8..9'), var('d', '10..20')],
    ['${{d}}$ dizaines, c\'est ${{eval:floor(d/10)}}$ '
     + accord('floor(d/10)', 'centaine', 'centaines')
     + '{{if:mod(d,10)!=0| et ${{eval:d-10*floor(d/10)}}$ '
     + accord('d-10*floor(d/10)', 'dizaine', 'dizaines') + '|}}.',
     'La collection vaut $' + col('{{eval:100*c+10*d}}') + '$.'],
    ['100*c+10*d <= 1000'])

SPECS_CONSTRUIRE = [
    spec('2 c, 15 d, 3 u : 353 posé', 0, {'c': 2, 'd': 15, 'u': 3}, '353', 'correct'),
    spec('Erreur : 2153 (bout à bout)', 0, {'c': 2, 'd': 15, 'u': 3}, '2153', 'incorrect'),
    spec('Erreur : 253 (la centaine des 15 dizaines oubliée)', 0, {'c': 2, 'd': 15, 'u': 3},
         '253', 'incorrect'),
    spec('Collection vide', 0, {'c': 2, 'd': 15, 'u': 3}, '', 'empty'),
    spec('8 c, 19 d, 9 u : 999', 0, {'c': 8, 'd': 19, 'u': 9}, '999', 'correct'),
    spec('17 d, 8 u : 178', 1, {'d': 17, 'u': 8}, '178', 'correct'),
    spec('Erreur : 25 (17 + 8)', 1, {'d': 17, 'u': 8}, '25', 'incorrect'),
    spec('23 d, 14 u : 244', 1, {'d': 23, 'u': 14}, '244', 'correct'),
    spec('Erreur : 234 (la dizaine des 14 unités oubliée)', 1, {'d': 23, 'u': 14}, '234',
         'incorrect'),
    spec('9 c, 10 d : 1 000', 2, {'c': 9, 'd': 10}, '1000', 'correct'),
    spec('Erreur : 910', 2, {'c': 9, 'd': 10}, '910', 'incorrect'),
    spec('8 c, 14 d : 940', 2, {'c': 8, 'd': 14}, '940', 'correct'),
]

# ---- 03. Plaques, carnets et timbres (CE1-003, exemple du BO) ----

MARCHAND = ('Au bureau de poste, les timbres se vendent par ' + colt('plaques de 100') + ', par '
            + colt('carnets de 10', 1) + ' ou ' + colt('à l\'unité', 2) + '.\n\n')
COMMANDE = ('Pour ${{n}}$ timbres, une commande est : ${{c}}$ ' + accord('c', 'plaque', 'plaques')
            + ', ${{d}}$ ' + accord('d', 'carnet', 'carnets') + ' et ${{u}}$ '
            + accord('u', 'timbre', 'timbres') + ' à l\'unité.\n\n')
N_TIMBRES = [var('c', '2..9'), var('d', '1..9'), var('u', '1..9'),
             var('n', 'eval:100*c+10*d+u')]

UNE_PLAQUE_DE_MOINS = variation(
    MARCHAND + COMMANDE + 'Une autre commande de ${{n}}$ timbres : ${{eval:c-1}}$ '
    + accord('c-1', 'plaque', 'plaques') + ', $?$ carnets et ${{u}}$ '
    + accord('u', 'timbre', 'timbres') + ' à l\'unité.',
    ['{{eval:d+10}}'], N_TIMBRES,
    ['Une plaque de $100$ timbres, c\'est ' + colt('10 carnets', 1) + ' de $10$.',
     'Une plaque de moins, donc $10$ carnets de plus : ${{d}} + 10 = ' + col('{{eval:d+10}}')
     + '$ carnets.'])

SANS_PLAQUE = variation(
    MARCHAND + COMMANDE + 'Il n\'y a plus de plaques. Une autre commande de ${{n}}$ timbres : $?$'
    ' carnets et ${{u}}$ ' + accord('u', 'timbre', 'timbres') + ' à l\'unité.',
    ['{{eval:10*c+d}}'], N_TIMBRES,
    ['${{c}}$ plaques, c\'est ${{eval:10*c}}$ carnets ; avec les ${{d}}$ '
     + accord('d', 'carnet', 'carnets') + ', cela fait ${{eval:10*c}} + {{d}}$.',
     'Il faut $' + col('{{eval:10*c+d}}') + '$ carnets : dans ${{n}}$, il y a ${{eval:10*c+d}}$'
     ' dizaines.'])

SANS_CARNET = variation(
    MARCHAND + COMMANDE + 'Il n\'y a plus de carnets. Une autre commande de ${{n}}$ timbres :'
    ' ${{c}}$ ' + accord('c', 'plaque', 'plaques') + ' et $?$ timbres à l\'unité.',
    ['{{eval:10*d+u}}'], N_TIMBRES,
    ['${{d}}$ ' + accord('d', 'carnet', 'carnets') + ' de $10$, c\'est ${{eval:10*d}}$ timbres.',
     'Il faut ${{eval:10*d}} + {{u}} = ' + col('{{eval:10*d+u}}') + '$ timbres à l\'unité.'])

SPECS_TIMBRES = [
    spec('235 : 1 plaque, 13 carnets (exemple du BO)', 0, {'c': 2, 'd': 3, 'u': 5, 'n': 235},
         '13', 'correct'),
    spec('Erreur : 3 carnets (rien changé)', 0, {'c': 2, 'd': 3, 'u': 5, 'n': 235}, '3',
         'incorrect'),
    spec('Erreur : 4 carnets (une plaque = un carnet)', 0, {'c': 2, 'd': 3, 'u': 5, 'n': 235}, '4',
         'incorrect'),
    spec('235 : 23 carnets', 1, {'c': 2, 'd': 3, 'u': 5, 'n': 235}, '23', 'correct'),
    spec('Erreur : 5 carnets (2 + 3)', 1, {'c': 2, 'd': 3, 'u': 5, 'n': 235}, '5', 'incorrect'),
    spec('Erreur : 3 carnets (les plaques oubliées)', 1, {'c': 2, 'd': 3, 'u': 5, 'n': 235}, '3',
         'incorrect'),
    spec('235 : 35 timbres à l\'unité', 2, {'c': 2, 'd': 3, 'u': 5, 'n': 235}, '35', 'correct'),
    spec('Erreur : 8 (3 + 5)', 2, {'c': 2, 'd': 3, 'u': 5, 'n': 235}, '8', 'incorrect'),
    spec('908 : 90 carnets', 1, {'c': 9, 'd': 0, 'u': 8, 'n': 908}, '90', 'correct'),
    spec('Rien d\'écrit', 2, {'c': 2, 'd': 3, 'u': 5, 'n': 235}, '', 'empty'),
]

# ---- 04. Tracer à la règle graduée (CE1-074) ----

SEGMENT_LIBRE = variation(
    'Avec la règle graduée, trace un segment $[AB]$ de ' + '$' + col('{{l}}\\text{ cm}') + '$' + ' qui part du'
    ' point $A$. Pose le $0$ de la règle sur $A$.'
    + bloc('figure-a-completer', 'fenetre: 0 ; 14 ; 0 ; 10', 'verifier: segment AB = {{l}} cm',
           '---', selon('k', ['A = point(1, 5)', 'A = point(1, 2)', 'A = point(1, 8)'])),
    None, [var('k', '1..3'), var('l', '3..10')],
    ['On pose la règle graduée, son ' + colt('0') + ' sur le point $A$.',
     'On trace depuis $A$ jusqu\'à la graduation ' + '$' + col('{{l}}\\text{ cm}') + '$' + ' : le segment $[AB]$'
     ' mesure ${{l}}$ cm.'])

# demi-droite [Ax) : A = (1, 2), X = (13, y)
SEGMENT_SUR = variation(
    'Sur la demi-droite $[Ax)$, trace un segment $[AB]$ de ' + '$' + col('{{l}}\\text{ cm}') + '$' + '. Pose le $0$'
    ' de la règle graduée sur $A$, le long de la demi-droite.'
    + bloc('figure-a-completer', 'fenetre: 0 ; 14 ; 0 ; 8',
           'verifier: segment AB = {{l}} cm sur [Ax)', '---',
           'A = point(1, 2, etiquette="bas")', 'X = point(13, {{y}}, visible=faux)',
           'x = demidroite(A, X)', 'texte(13, {{eval:y+0.45;d}}, "x")'),
    None, [var('y', '2..7'), var('l', '3..10')],
    ['On pose la règle graduée le long de la demi-droite, son ' + colt('0') + ' sur $A$.',
     'On marque le point $B$ à la graduation ' + '$' + col('{{l}}\\text{ cm}') + '$' + ', sur la demi-droite, et on'
     ' trace $[AB]$.'])


def sur_demi_droite(y, l):
    dx, dy = 12, y - 2
    n = math.hypot(dx, dy)
    return (1 + l * dx / n, 2 + l * dy / n)


def nb(x):
    return ('%.12f' % x).rstrip('0').rstrip('.')


def seg_sur(y, l):
    bx, by = sur_demi_droite(y, l)
    return f'regle(1;2;13;{y};1)|segment(1;2;{nb(bx)};{nb(by)})'


SPECS_REGLE = [
    spec('6 cm vers la droite', 0, {'k': 1, 'l': 6}, 'regle(1;5;2;5;1)|segment(1;5;7;5)',
         'correct'),
    spec('6 cm en oblique', 0, {'k': 1, 'l': 6}, 'regle(1;5;1.6;5.8;1)|segment(1;5;4.6;9.8)',
         'correct'),
    spec('Erreur : 7 cm pour 6 (une graduation de trop)', 0, {'k': 1, 'l': 6},
         'regle(1;5;2;5;1)|segment(1;5;8;5)', 'incorrect'),
    spec('Erreur : 5 cm (règle partie de 1)', 0, {'k': 1, 'l': 6},
         'regle(1;5;2;5;1)|segment(1;5;6;5)', 'incorrect'),
    spec('Erreur : tracé à l\'œil, sans la règle', 0, {'k': 1, 'l': 6}, 'segment(1;5;7;5)',
         'incorrect'),
    spec('Rien de tracé', 0, {'k': 1, 'l': 6}, '', 'empty'),
    spec('10 cm depuis A en bas', 0, {'k': 2, 'l': 10}, 'regle(1;2;2;2;1)|segment(1;2;11;2)',
         'correct'),
    spec('3 cm depuis A en haut', 0, {'k': 3, 'l': 3}, 'regle(1;8;2;8;1)|segment(1;8;4;8)',
         'correct'),
    spec('Demi-droite horizontale, 6 cm', 1, {'y': 2, 'l': 6}, seg_sur(2, 6), 'correct'),
    spec('Demi-droite oblique, 5 cm', 1, {'y': 6, 'l': 5}, seg_sur(6, 5), 'correct'),
    spec('Demi-droite oblique, 10 cm', 1, {'y': 7, 'l': 10}, seg_sur(7, 10), 'correct'),
    spec('Erreur : 5 cm, mais pas sur la demi-droite', 1, {'y': 6, 'l': 5},
         'regle(1;2;13;2;1)|segment(1;2;6;2)', 'incorrect'),
    spec('Erreur : 4 cm au lieu de 5 sur la demi-droite', 1, {'y': 6, 'l': 5}, seg_sur(6, 4),
         'incorrect'),
]

# ---- 05. L'équerre et le compas (CE1-074) ----

# angle droit en A : [AB] tracé, la droite à l'équerre puis les côtés ; C n'importe où sur la droite.
# La droite de l'équerre s'écrit A puis A + (AB tourné d'un quart de tour) : `perpendicularThrough`.
ANGLES = [((3, 2), (9, 2)), ((2, 3), (8, 3)), ((9, 2), (9, 8)), ((10, 3), (4, 3))]


def pt(nom, p):
    return f'{nom} = point({p[0]}, {p[1]})'


EQUERRE = variation(
    'Le côté $[AB]$ est déjà tracé. Avec l\'' + colt('équerre') + ', trace le triangle $ABC$ qui'
    ' a un angle droit en $A$ : trace l\'angle droit, puis les côtés $[AC]$ et $[BC]$.'
    + bloc('figure-a-completer', 'fenetre: 0 ; 12 ; 0 ; 10', 'verifier: triangle ABC : CAB = 90',
           '---',
           selon('k', [pt('A', a) + '\n' + pt('B', b) for a, b in ANGLES]),
           'ab = segment(A, B, epaisseur=3)'),
    None, [var('k', '1..4')],
    ['On pose l\'équerre le long de $[AB]$, son ' + colt('angle droit') + ' sur $A$, et on trace'
     ' le long de l\'autre côté de l\'équerre.',
     'On choisit le point $C$ sur ce tracé, puis on trace $[AC]$ et $[BC]$ : le triangle a un'
     ' angle droit en $A$.'])

CERCLE_PASSANT = variation(
    'Avec le ' + colt('compas') + ', trace le cercle de centre $O$ qui passe par le point $A$.'
    + bloc('figure-a-completer', 'fenetre: 0 ; 12 ; 0 ; 10',
           'verifier: cercle c = cercle(O, passant=A)', '---', 'O = point(6, 5)',
           selon('k', ['A = point(8.5, 6.5)', 'A = point(3, 7)', 'A = point(7, 1.5)',
                       'A = point(3.5, 3)'])),
    None, [var('k', '1..4')],
    ['On pique la pointe du compas sur le ' + colt('centre') + ' $O$.',
     'On ouvre le compas jusqu\'au point $A$ et on trace le cercle : il passe par $A$.'])

CERCLE_RAYON = variation(
    'Avec la règle graduée et le compas, trace le cercle de ' + colt('centre') + ' $O$ et de '
    + colt('rayon', 1) + ' ' + '$' + col('{{r}}\\text{ cm}', 1) + '$' + '.'
    + bloc('figure-a-completer', 'fenetre: 0 ; 14 ; 0 ; 14',
           'verifier: cercle c = cercle(O, rayon={{r}} cm)', '---', 'O = point(7, 7)'),
    None, [var('r', '2..5')],
    ['On pose la règle graduée, son $0$ sur le ' + colt('centre') + ' $O$.',
     'On pique le compas en $O$ et on l\'ouvre jusqu\'à la graduation ' + '$' + col('{{r}}\\text{ cm}', 1) + '$'
     + ' : c\'est le ' + colt('rayon', 1) + '.',
     'On trace le cercle sans changer l\'écartement.'])

SPECS_EQUERRE_COMPAS = [
    spec('Angle droit 1 : équerre, côtés', 0, {'k': 1},
         'droite(3;2;3;8)|segment(3;2;3;6)|segment(9;2;3;6)', 'correct'),
    spec('Angle droit 1 : autre point C sur la droite', 0, {'k': 1},
         'droite(3;2;3;8)|segment(3;2;3;4)|segment(9;2;3;4)', 'correct'),
    spec('Erreur : sans équerre, angle à l\'œil', 0, {'k': 1},
         'segment(3;2;3.5;6)|segment(9;2;3.5;6)', 'incorrect'),
    spec('Erreur : angle droit en B', 0, {'k': 1},
         'droite(9;2;9;8)|segment(9;2;9;6)|segment(3;2;9;6)', 'incorrect'),
    spec('Erreur : le côté [BC] manque', 0, {'k': 1}, 'droite(3;2;3;8)|segment(3;2;3;6)',
         'incorrect'),
    spec('Angle droit 2', 0, {'k': 2}, 'droite(2;3;2;9)|segment(2;3;2;7)|segment(8;3;2;7)',
         'correct'),
    spec('Angle droit 3 (côté vertical)', 0, {'k': 3},
         'droite(9;2;3;2)|segment(9;2;4;2)|segment(9;8;4;2)', 'correct'),
    spec('Angle droit 4 (vers la gauche)', 0, {'k': 4},
         'droite(10;3;10;-3)|segment(10;3;10;7)|segment(4;3;10;7)', 'correct'),
    spec('Cercle 1 : centre O, ouvert jusqu\'à A', 1, {'k': 1}, 'cercle(6;5;8.5;6.5)', 'correct'),
    spec('Erreur : compas piqué en A', 1, {'k': 1}, 'cercle(8.5;6.5;6;5)', 'incorrect'),
    spec('Erreur : compas trop ouvert', 1, {'k': 1}, 'cercle(6;5;9.5;6.5)', 'incorrect'),
    spec('Rien de tracé', 1, {'k': 1}, '', 'empty'),
    spec('Cercle 2', 1, {'k': 2}, 'cercle(6;5;3;7)', 'correct'),
    spec('Cercle 3', 1, {'k': 3}, 'cercle(6;5;7;1.5)', 'correct'),
    spec('Cercle 4', 1, {'k': 4}, 'cercle(6;5;3.5;3)', 'correct'),
    spec('Rayon 3 cm', 2, {'r': 3}, 'regle(7;7;8;7;1)|cercle(7;7;10;7)', 'correct'),
    spec('Rayon 3 cm, règle vers le haut', 2, {'r': 3}, 'regle(7;7;7;8;1)|cercle(7;7;7;10)',
         'correct'),
    spec('Erreur : compas ouvert à l\'œil, sans la règle', 2, {'r': 3}, 'cercle(7;7;10;7)',
         'incorrect'),
    spec('Erreur : diamètre pris pour le rayon (6 cm)', 2, {'r': 3},
         'regle(7;7;8;7;1)|cercle(7;7;13;7)', 'incorrect'),
    spec('Rayon 5 cm', 2, {'r': 5}, 'regle(7;7;8;7;1)|cercle(7;7;12;7)', 'correct'),
]

# ---- Écriture ----

MODELES = {
    '01-denombrer-plus-de-dix-ce1': modele(
        'Dénombrer quand il y a plus de dix objets d\'un rang',
        'Plaques, barres, cubes jusqu\'à 999 ; plus de dix cubes, plus de dix barres, ou les deux',
        'Entiers · Dénombrer', 12,
        [PLUS_DE_DIX_CUBES, PLUS_DE_DIX_BARRES, PLUS_DE_DIX_LES_DEUX], SPECS_DENOMBRER),
    '02-construis-la-collection': modele(
        'Construire une collection donnée en centaines, dizaines et unités',
        'Construire avec le matériel : plus de dix dizaines, plus de dix unités, jusqu\'à 1 000',
        'Entiers · Dénombrer', 13, [CONS_DIZAINES, CONS_SANS_CENTAINE, CONS_MILLE],
        SPECS_CONSTRUIRE),
    '03-plaques-carnets-timbres': modele(
        'Plaques, carnets et timbres',
        'Une même quantité commandée autrement : 1 plaque = 10 carnets = 100 timbres',
        'Entiers · Décomposition', 14, [UNE_PLAQUE_DE_MOINS, SANS_PLAQUE, SANS_CARNET],
        SPECS_TIMBRES),
    '04-trace-a-la-regle-graduee': modele(
        'Tracer un segment à la règle graduée',
        'Papier uni : segment de 3 à 10 cm depuis A, puis sur une demi-droite donnée',
        'Géométrie · Tracés', 6, [SEGMENT_LIBRE, SEGMENT_SUR], SPECS_REGLE, delay=180),
    '05-equerre-et-compas': modele(
        'Tracer avec l\'équerre et le compas',
        'Papier uni : angle droit à l\'équerre ; cercle de centre donné passant par un point ;'
        ' cercle de rayon donné en cm',
        'Géométrie · Tracés', 7, [EQUERRE, CERCLE_PASSANT, CERCLE_RAYON], SPECS_EQUERRE_COMPAS,
        delay=180),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
