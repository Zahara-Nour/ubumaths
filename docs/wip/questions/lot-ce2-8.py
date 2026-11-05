"""Écrit les 9 modèles du lot 8 du CE2 (figures planes et symétrie) dans scripts/questions/ce2-8/.

Phase 0 validée par David le 2026-11-05 (§ 14 du journal `docs/wip/questions-ce2-progress.md`,
« je te suis »). Bornes `cycle2.json` : CE2-067 (vocabulaire : polygone, quadrilatère, pentagone,
hexagone, losange, diagonale, rayon, diamètre, longueur et largeur du rectangle), CE2-068 et 095
(carré, rectangle, triangle, triangle rectangle, losange), CE2-069 (carrés, rectangles, losanges :
angles et longueurs), CE2-071 (code de l'angle droit), CE2-081 (code des longueurs égales : côtés
opposés d'un rectangle), CE2-072 (axes : cerf-volant, carreau, rectangle, lettres, panneaux ; un ou
plusieurs), CE2-073 (quadrillage, axe vertical ou horizontal). Décisions :

1. Seul le nom le plus précis est juste ; « rectangle » et « losange » restent des leurres d'un
   carré ; jamais « triangle » avec « triangle rectangle » quand la figure est un triangle rectangle.
2. 072 et 073 rangés sur la notion « Symétrie axiale » (niveaux 1 à 3), sans sous-notion.
3. Quadrillage seul (pas de papier pointé).
4. Figures à côtés droits seulement (ni cœur, ni pique, ni trèfle).

Gabarit : `lot-ce1-9.py` (figures précalculées, tirées par une variable). Fenêtre 0 ; 10 ; 0 ; 7
pour les figures, 0 ; 12 ; 0 ; 8 pour le quadrillage. Variables à une lettre ; jamais `e` ni `i` ;
points nommés `abcdfghj` (jamais `e`).

    python3 docs/wip/questions/lot-ce2-8.py scripts/questions/ce2-8
"""
import json
import math
import sys

DOSSIER = sys.argv[1]
W, H = 10, 7  # fenêtre des figures
NOMS = 'abcdfghjkmn'  # noms internes des points (jamais e ni i)

# ---- Gabarits ----


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(x) for k, x in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(title, description, level, variations, specs, delay=120):
    # ni theme, ni domain, ni subdomain (ADR 0035) : le rangement est posé par la migration
    return {'title': title, 'description': description, 'grades': ['CE2'], 'level': level,
            'delay': delay, 'status': 'draft', 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, reponses, variables, etapes, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    if reponses is not None:
        v['blanks'] = [{'expectedAnswer': r} for r in reponses]
    v['correction'] = {'steps': etapes}
    return v


def choix(lignes, melanger=True, plusieurs=False):
    tete = ('' if melanger else 'melanger: non\n') + ('plusieurs: oui\n' if plusieurs else '')
    return '\n\n```choix\n' + tete + ''.join('- ' + c + '\n' for c in lignes) + '```'


def choix_dessins(blocs):
    """Choix dont chaque option est une figure (clôture ```` autour)."""
    items = []
    for lignes in blocs:
        items.append('- ```figure\n' + ''.join('  ' + x + '\n' for x in lignes) + '  ```')
    return '\n\n````choix\n' + '\n'.join(items) + '\n````'


def selon(k, textes, n=1):
    """`{{if:k==1|…|{{if:k==2|…|…}}}}` : le texte numéro k (à partir de 1)."""
    textes = [str(t) for t in textes]
    if len(textes) == 1:
        return textes[0]
    return ('{{if:' + k + '==' + str(n) + '|' + textes[0] + '|' + selon(k, textes[1:], n + 1)
            + '}}')


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def colt(x, k=0):
    """Mot coloré en plein texte : toujours dans une formule (`\\textcolor` hors `$…$` reste brut)."""
    return '$' + col('\\text{' + x + '}', k) + '$'


# ---- Géométrie : figures précalculées ----


def tourne(pts, angle):
    a = math.radians(angle)
    return [(x * math.cos(a) - y * math.sin(a), x * math.sin(a) + y * math.cos(a)) for x, y in pts]


def centre(pts, cx=W / 2, cy=H / 2):
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    dx, dy = cx - (min(xs) + max(xs)) / 2, cy - (min(ys) + max(ys)) / 2
    out = [(round(x + dx, 2), round(y + dy, 2)) for x, y in pts]
    for x, y in out:  # la figure tient dans la fenêtre, avec une marge pour les lettres
        assert 0.7 <= x <= W - 0.7 and 0.7 <= y <= H - 0.7, (pts, out)
    return out


def angle_en(pts, s):
    """Angle intérieur (degrés) au sommet s d'un polygone."""
    p, v, q = pts[s - 1], pts[s], pts[(s + 1) % len(pts)]
    a = math.atan2(p[1] - v[1], p[0] - v[0]) - math.atan2(q[1] - v[1], q[0] - v[0])
    a = abs(math.degrees(a)) % 360
    return min(a, 360 - a)


def carre(c, rot):
    return centre(tourne([(0, 0), (c, 0), (c, c), (0, c)], rot))


def rect(lg, la, rot):
    return centre(tourne([(0, 0), (lg, 0), (lg, la), (0, la)], rot))


def losange(d1, d2, rot):
    return centre(tourne([(d1 / 2, 0), (0, d2 / 2), (-d1 / 2, 0), (0, -d2 / 2)], rot))


def tri_rect(a, b, rot):
    return centre(tourne([(0, 0), (a, 0), (0, b)], rot))


def tri_iso(base, ang, rot):
    h = base / 2 * math.tan(math.radians(ang))
    return centre(tourne([(0, 0), (base, 0), (base / 2, h)], rot))


def coords(k, presets):
    """Pour chaque sommet, `x, y` en `{{if:k==…}}` selon la position tirée."""
    n = len(presets[0])
    assert all(len(p) == n for p in presets)
    return [(selon(k, [p[s][0] for p in presets]), selon(k, [p[s][1] for p in presets]))
            for s in range(n)]


def points(k, presets, visible=False):
    style = '' if visible else ', visible=faux'
    return [f'{nom} = point({x}, {y}{style})' for nom, (x, y) in zip(NOMS, coords(k, presets))]


COULEUR = 'couleur="{{if:c==1|bleu|{{if:c==2|rouge|{{if:c==3|vert|orange}}}}}}"'
VAR_COULEUR = var('c', '1..4')


def codes_droits(n, sommets, extra=''):
    """Code de l'angle droit aux sommets donnés d'un polygone à n sommets (`abcd…`) ; `extra` :
    `, arcRadiusPx=…` pour un dessin rapetissé dans un choix."""
    return [f'g{s} = angle({NOMS[(s - 1) % n]}, {NOMS[s]}, {NOMS[(s + 1) % n]}, marque="carre",'
            f' couleur="noir"{extra})' for s in sommets]


def codes_cotes(n, traits):
    """Code des longueurs : `traits[s]` petits traits sur le côté s (0 = aucun)."""
    out = []
    for s, t in enumerate(traits):
        if t:
            extra = '' if t == 1 else f', traits={t}'
            out.append(f'm{s} = marque_segment({NOMS[s]}, {NOMS[(s + 1) % n]}{extra})')
    return out


def serree(*jeux, marge=0.6):
    """`fenetre:` serrée autour des points (un dessin dans un choix est petit : pas de vide)."""
    xs = [x for pts in jeux for x, _ in pts]
    ys = [y for pts in jeux for _, y in pts]
    return (f'fenetre: {round(min(xs) - marge, 2)} ; {round(max(xs) + marge, 2)} ; '
            f'{round(min(ys) - marge, 2)} ; {round(max(ys) + marge, 2)}')



def figure(description, lignes, fenetre='0 ; 10 ; 0 ; 7', grille=False):
    tete = f'fenetre: {fenetre}\n' + ('grille: oui\n' if grille else '')
    return ('```figure\n' + tete + 'description: ' + description + '\n---\n' + '\n'.join(lignes)
            + '\n```')


def polygone(k, presets, description, extra=()):
    n = len(presets[0])
    return figure(description, points(k, presets)
                  + [f'q = polygone({", ".join(NOMS[:n])}, {COULEUR}, epaisseur=2)'] + list(extra))


def etiquettes(k, presets, lettres, ecart=0.5):
    """`texte()` des lettres, poussées hors de la figure depuis son centre."""
    lignes = []
    for s, lettre in enumerate(lettres):
        xs, ys = [], []
        for p in presets:
            gx, gy = sum(q[0] for q in p) / len(p), sum(q[1] for q in p) / len(p)
            x, y = p[s]
            n = math.hypot(x - gx, y - gy)
            xs.append(round(x + ecart * (x - gx) / n, 2))
            ys.append(round(y + ecart * (y - gy) / n - 0.15, 2))
        lignes.append(f'texte({selon(k, xs)}, {selon(k, ys)}, "{lettre}")')
    return lignes


CARRES = [carre(3.8, r) for r in (0, 15, 45, 30, 60, 45)]
RECTANGLES = [rect(5.6, 2.8, 0), rect(5.2, 2.6, 20), rect(5.4, 3, 90), rect(5.2, 2.8, 150),
              rect(4.8, 2.6, 120), rect(6, 2.4, 0)]
# losanges : diagonales dans un rapport ≤ 0,7, angles à 20° au moins de l'angle droit
LOSANGES = [losange(5.6, 3.4, 0), losange(5.6, 3.6, 90), losange(5.4, 3.6, 30),
            losange(5.2, 3.4, 45), losange(5.6, 3.2, 120), losange(5.2, 3.6, 15)]
TRI_RECTS = [tri_rect(4.5, 3, 0), tri_rect(4.2, 3.2, 30), tri_rect(4.5, 2.8, 90),
             tri_rect(4, 3, 135), tri_rect(4.4, 3, 200), tri_rect(4.2, 3.4, 300)]
TRI_ISOS = [tri_iso(4.6, 60, 0), tri_iso(4.6, 55, 25), tri_iso(4.4, 65, 160),
            tri_iso(4.8, 58, 200), tri_iso(4.6, 62, 290), tri_iso(4.4, 56, 100)]

for f in LOSANGES:
    assert all(abs(angle_en(f, s) - 90) >= 20 for s in range(4)), [angle_en(f, s) for s in range(4)]
for t in TRI_ISOS:
    assert all(angle_en(t, s) <= 70 for s in range(3)), t
for t in TRI_RECTS:
    assert abs(angle_en(t, 0) - 90) < 0.5 and all(angle_en(t, s) <= 70 for s in (1, 2)), t

# ---- 01. Quelle est cette figure ? (CE2-068) ----

QUELLE = 'Quelle est cette figure ?\n\n'
C_CARRE, C_RECT, C_LOS = 'C\'est un carré.', 'C\'est un rectangle.', 'C\'est un losange.'
C_TRI, C_TRI_RECT = 'C\'est un triangle.', 'C\'est un triangle rectangle.'
DROITS4 = codes_droits(4, range(4))

F_CARRE = variation(
    QUELLE + polygone('k', CARRES, 'Une figure à quatre côtés, angles droits codés.', DROITS4)
    + choix([C_CARRE, C_RECT, C_LOS, C_TRI]),
    ['0'], [VAR_COULEUR, var('k', '1..6')],
    ['Les petits carrés codent $4$ angles droits, et les $4$ côtés ont la même longueur : c\'est un '
     + colt('carré') + '.',
     '{{if:k==3|Il est posé sur la pointe, mais ses angles sont droits : ce n\'est pas un losange'
     ' quelconque, c\'est un carré.|Un rectangle a deux grands côtés et deux petits ; un losange n\'a'
     ' pas d\'angle droit.}}'])

F_RECT = variation(
    QUELLE + polygone('k', RECTANGLES, 'Une figure à quatre côtés, angles droits codés.', DROITS4)
    + choix([C_CARRE, C_RECT, C_LOS, C_TRI_RECT]),
    ['1'], [VAR_COULEUR, var('k', '1..6')],
    ['Les petits carrés codent $4$ angles droits ; deux côtés sont longs, deux sont courts : c\'est'
     ' un ' + colt('rectangle') + '.'])

F_LOS = variation(
    QUELLE + polygone('k', LOSANGES, 'Une figure à quatre côtés.')
    + choix([C_CARRE, C_RECT, C_LOS, C_TRI]),
    ['2'], [VAR_COULEUR, var('k', '1..6')],
    ['Les $4$ côtés ont la même longueur, mais aucun angle n\'est droit : c\'est un '
     + colt('losange') + '.',
     'Un carré aussi a $4$ côtés de la même longueur, mais il a $4$ angles droits.'])

F_TRI_RECT = variation(
    QUELLE + polygone('k', TRI_RECTS, 'Une figure à trois côtés, un angle droit codé.',
                      codes_droits(3, [0]))
    + choix([C_RECT, C_TRI_RECT, C_CARRE, C_LOS]),
    ['1'], [VAR_COULEUR, var('k', '1..6')],
    ['Elle a $3$ côtés et un angle droit codé : c\'est un ' + colt('triangle rectangle') + '.',
     'Un rectangle a $4$ côtés : ce n\'est pas un rectangle.'])

F_TRI = variation(
    QUELLE + polygone('k', TRI_ISOS, 'Une figure à trois côtés.')
    + choix([C_CARRE, C_TRI, C_TRI_RECT, C_LOS]),
    ['1'], [VAR_COULEUR, var('k', '1..6')],
    ['Elle a $3$ côtés et aucun angle droit : c\'est un ' + colt('triangle') + '.'])

SPECS_QUELLE = [
    spec('Carré', 0, {'c': 1, 'k': 2}, '0', 'correct'),
    spec('Carré sur la pointe', 0, {'c': 2, 'k': 3}, '0', 'correct'),
    spec('Erreur : carré sur la pointe pris pour un losange', 0, {'c': 2, 'k': 3}, '2', 'incorrect'),
    spec('Rectangle', 1, {'c': 3, 'k': 4}, '1', 'correct'),
    spec('Erreur : rectangle pris pour un carré', 1, {'c': 3, 'k': 4}, '0', 'incorrect'),
    spec('Losange', 2, {'c': 1, 'k': 1}, '2', 'correct'),
    spec('Losange presque carré', 2, {'c': 4, 'k': 4}, '2', 'correct'),
    spec('Erreur : losange pris pour un carré', 2, {'c': 4, 'k': 4}, '0', 'incorrect'),
    spec('Triangle rectangle', 3, {'c': 2, 'k': 5}, '1', 'correct'),
    spec('Erreur : « rectangle » lu dans le nom', 3, {'c': 2, 'k': 5}, '0', 'incorrect'),
    spec('Triangle', 4, {'c': 3, 'k': 2}, '1', 'correct'),
    spec('Erreur : triangle pris pour un triangle rectangle', 4, {'c': 3, 'k': 2}, '2',
         'incorrect'),
]

# ---- 02. Décrire la figure (CE2-095) ----

QUADRIS = [CARRES[0], CARRES[3], RECTANGLES[0], RECTANGLES[1], LOSANGES[0], LOSANGES[2]]
NOM_QUADRI = '{{if:k<=2|carré|{{if:k<=4|rectangle|losange}}}}'

ANGLES_DROITS = variation(
    'Combien d\'angles droits a ce ' + NOM_QUADRI + ' ?\n\n'
    + polygone('k', QUADRIS, 'Un carré, un rectangle ou un losange.') + '\n\n$?$',
    ['{{a}}'], [VAR_COULEUR, var('k', '1..6'), var('a', '{{if:k<=4|4|0}}')],
    ['{{if:k<=4|Un ' + NOM_QUADRI + ' a $4$ angles droits, un à chaque sommet : $' + col('4')
     + '$.|Un losange n\'a aucun angle droit : $' + col('0') + '$. Ses $4$ côtés ont la même'
     ' longueur, mais ses angles ne sont pas droits.}}'])

C_DESCRIPTIONS = ['$4$ côtés de la même longueur et $4$ angles droits',
                  '$4$ angles droits ; deux côtés longs et deux côtés courts',
                  '$4$ côtés de la même longueur et aucun angle droit',
                  '$3$ côtés et un angle droit']
DESCRIPTION = variation(
    'Quelle phrase décrit cette figure ?\n\n'
    + polygone('k', QUADRIS, 'Un carré, un rectangle ou un losange.')
    + choix(['Elle a ' + d + '.' for d in C_DESCRIPTIONS], melanger=False),
    ['{{w}}'], [VAR_COULEUR, var('k', '1..6'), var('w', '{{if:k<=2|0|{{if:k<=4|1|2}}}}')],
    ['C\'est un ' + NOM_QUADRI + ' : il a ' + selon('w', C_DESCRIPTIONS[:3], 0) + '.'])

DEVINETTES = ['J\'ai $4$ côtés de la même longueur, mais aucun angle droit.',
              'J\'ai $4$ côtés de la même longueur et $4$ angles droits.',
              'J\'ai $4$ angles droits, mais mes côtés ne sont pas tous de la même longueur.',
              'J\'ai $3$ côtés et un angle droit.',
              'J\'ai $3$ côtés et aucun angle droit.']
QUI_SUIS_JE = variation(
    'Qui suis-je ?\n\n_' + selon('q', DEVINETTES) + '_'
    + choix(['Je suis un losange.', 'Je suis un carré.', 'Je suis un rectangle.',
             'Je suis un triangle rectangle.', 'Je suis un triangle.'], melanger=False),
    ['{{w}}'], [var('q', '1..5'), var('w', 'eval:q-1')],
    [selon('q', ['C\'est un ' + colt('losange') + ' : un carré aurait aussi $4$ angles droits.',
                 'C\'est un ' + colt('carré') + ' : $4$ côtés de la même longueur, $4$ angles'
                 ' droits.',
                 'C\'est un ' + colt('rectangle') + '.',
                 'C\'est un ' + colt('triangle rectangle') + '.',
                 'C\'est un ' + colt('triangle') + ', qui n\'est pas rectangle.'])])

SPECS_DECRIRE = [
    spec('Carré : 4', 0, {'c': 1, 'k': 1}, '4', 'correct'),
    spec('Rectangle : 4', 0, {'c': 2, 'k': 3}, '4', 'correct'),
    spec('Erreur : rectangle, 2 (les grands côtés)', 0, {'c': 2, 'k': 3}, '2', 'incorrect'),
    spec('Losange : 0', 0, {'c': 3, 'k': 5}, '0', 'correct'),
    spec('Erreur : losange, 4 (pris pour un carré)', 0, {'c': 3, 'k': 5}, '4', 'incorrect'),
    spec('Description du carré', 1, {'c': 1, 'k': 2}, '0', 'correct'),
    spec('Description du rectangle', 1, {'c': 2, 'k': 4}, '1', 'correct'),
    spec('Description du losange', 1, {'c': 3, 'k': 6}, '2', 'correct'),
    spec('Erreur : losange décrit comme un carré', 1, {'c': 3, 'k': 6}, '0', 'incorrect'),
    spec('Devinette du losange', 2, {'q': 1}, '0', 'correct'),
    spec('Erreur : losange pris pour un carré', 2, {'q': 1}, '1', 'incorrect'),
    spec('Devinette du triangle', 2, {'q': 5}, '4', 'correct'),
]

# ---- 03. Carré, rectangle, losange : propriétés (CE2-069) ----

PHRASES = {
    1: ['Un carré a $4$ côtés de la même longueur et $4$ angles droits.',
        'Un carré a $4$ côtés de la même longueur, mais aucun angle droit.',
        'Un carré a $2$ angles droits.',
        'Un carré a deux côtés longs et deux côtés courts.'],
    2: ['Les côtés opposés d\'un rectangle ont la même longueur.',
        'Les $4$ côtés d\'un rectangle ont toujours la même longueur.',
        'Un rectangle a $2$ angles droits.',
        'Un rectangle n\'a aucun angle droit.'],
    3: ['Les $4$ côtés d\'un losange ont la même longueur.',
        'Un losange a $4$ angles droits.',
        'Un losange a deux côtés longs et deux côtés courts.',
        'Un losange a $3$ côtés.'],
}
PHRASE = variation(
    'Quelle phrase est vraie ?'
    + choix([selon('f', [PHRASES[f][j] for f in (1, 2, 3)]) for j in range(4)]),
    ['0'], [var('f', '1..3')],
    [selon('f', ['Un ' + colt('carré') + ' a $4$ côtés de la même longueur et $4$ angles droits.',
                 'Un ' + colt('rectangle') + ' a $4$ angles droits, et ses côtés opposés ont la'
                 ' même longueur.',
                 'Un ' + colt('losange') + ' a $4$ côtés de la même longueur. Ses angles ne sont pas'
                 ' droits (sinon, c\'est un carré).'])])

# figure codée : 2 positions par figure (k = 2f − 1 ou 2f)
CODEES = [CARRES[1], CARRES[4], RECTANGLES[1], RECTANGLES[3], LOSANGES[2], LOSANGES[4]]
CODES_F = [codes_cotes(4, [1, 1, 1, 1]) + DROITS4,
           codes_cotes(4, [1, 2, 1, 2]) + DROITS4,
           codes_cotes(4, [1, 1, 1, 1])]
CODEE = variation(
    'D\'après les codes, quelle est cette figure ?\n\n'
    + figure('Une figure à quatre côtés, avec ses codes.',
             points('k', CODEES) + [f'q = polygone(a, b, c, d, {COULEUR}, epaisseur=2)']
             + [selon('f', ['\n'.join(x) for x in CODES_F])])
    + choix([C_CARRE, C_RECT, C_LOS], melanger=False),
    ['{{w}}'], [VAR_COULEUR, var('k', '1..6'), var('f', 'eval:floor((k+1)/2)'), var('w', 'eval:f-1')],
    [selon('f', ['Les petits traits disent que les $4$ côtés ont la même longueur, les petits carrés'
                 ' que les $4$ angles sont droits : c\'est un ' + colt('carré') + '.',
                 'Les petits carrés codent $4$ angles droits ; les côtés opposés ont le même code (un'
                 ' trait, deux traits) : c\'est un ' + colt('rectangle') + '.',
                 'Les $4$ côtés ont le même code, et aucun angle n\'est codé droit : c\'est un '
                 + colt('losange') + '.'])])

MANQUE = variation(
    'Que manque-t-il à ce ' + selon('q', ['losange', 'rectangle']) + ' pour être un carré ?\n\n'
    + figure('Un ' + selon('q', ['losange', 'rectangle']) + ' avec ses codes.',
             points('q', [LOSANGES[0], RECTANGLES[0]])
             + [f'p = polygone(a, b, c, d, {COULEUR}, epaisseur=2)']
             + [selon('q', ['\n'.join(codes_cotes(4, [1, 1, 1, 1])),
                            '\n'.join(codes_cotes(4, [1, 2, 1, 2]) + DROITS4)])])
    + choix(['$4$ angles droits', '$4$ côtés de la même longueur', 'un côté de plus',
             'des côtés plus longs'], melanger=False),
    ['{{w}}'], [VAR_COULEUR, var('q', '1..2'), var('w', 'eval:q-1')],
    [selon('q', ['Le losange a déjà $4$ côtés de la même longueur ; il lui manque '
                 + colt('4 angles droits') + '.',
                 'Le rectangle a déjà $4$ angles droits ; il lui manque '
                 + colt('4 côtés de la même longueur') + '.'])])

SPECS_PROPRIETES = [
    spec('Carré : phrase vraie', 0, {'f': 1}, '0', 'correct'),
    spec('Erreur : carré sans angle droit', 0, {'f': 1}, '1', 'incorrect'),
    spec('Rectangle : côtés opposés', 0, {'f': 2}, '0', 'correct'),
    spec('Erreur : rectangle à 2 angles droits', 0, {'f': 2}, '2', 'incorrect'),
    spec('Losange : 4 côtés égaux', 0, {'f': 3}, '0', 'correct'),
    spec('Erreur : losange à 4 angles droits', 0, {'f': 3}, '1', 'incorrect'),
    spec('Codes du carré', 1, {'c': 1, 'k': 2, 'f': 1, 'w': 0}, '0', 'correct'),
    spec('Codes du rectangle', 1, {'c': 2, 'k': 3, 'f': 2, 'w': 1}, '1', 'correct'),
    spec('Codes du losange', 1, {'c': 3, 'k': 6, 'f': 3, 'w': 2}, '2', 'correct'),
    spec('Erreur : losange codé pris pour un carré', 1, {'c': 3, 'k': 6, 'f': 3, 'w': 2}, '0',
         'incorrect'),
    spec('Au losange il manque les angles droits', 2, {'c': 1, 'q': 1, 'w': 0}, '0', 'correct'),
    spec('Au rectangle il manque les côtés égaux', 2, {'c': 2, 'q': 2, 'w': 1}, '1', 'correct'),
    spec('Erreur : rectangle, angles droits', 2, {'c': 2, 'q': 2, 'w': 1}, '0', 'incorrect'),
]

# ---- 04. Le bon mot (CE2-067) ----

ELEMENTS = ['une diagonale', 'un rayon', 'un diamètre', 'la longueur du rectangle',
            'la largeur du rectangle']
# rectangle ABCD fixe (fenêtre 10 × 7), cercle de centre O
RECT_FIXE = ['a = point(2, 1.5, visible=faux)', 'b = point(8, 1.5, visible=faux)',
             'c = point(8, 5.5, visible=faux)', 'd = point(2, 5.5, visible=faux)',
             'q = polygone(a, b, c, d, couleur="noir", epaisseur=2)',
             'texte(1.6, 1.1, "A")', 'texte(8.4, 1.1, "B")', 'texte(8.4, 5.7, "C")',
             'texte(1.6, 5.7, "D")']
CERCLE_FIXE = ['o = point(5, 3.5, couleur="noir", etiquette="aucune")', 'texte(4.75, 3.05, "O")',
               'r = cercle(o, rayon=2.8, couleur="noir", epaisseur=2)']
ROUGE = 'couleur="rouge", epaisseur=4'
FIGURES_MOT = [
    RECT_FIXE + [f's = segment({{{{if:t==1|a|b}}}}, {{{{if:t==1|c|d}}}}, {ROUGE})'],
    CERCLE_FIXE + ['p = point(o, longueur=2.8, angle={{eval:30+40*t}}, visible=faux)',
                   f's = segment(o, p, {ROUGE})'],
    CERCLE_FIXE + ['p = point(o, longueur=2.8, angle={{eval:20+50*t}}, visible=faux)',
                   'm = point(o, longueur=2.8, angle={{eval:200+50*t}}, visible=faux)',
                   f's = segment(p, m, {ROUGE})'],
    RECT_FIXE + [f's = segment({{{{if:t==1|a|c}}}}, {{{{if:t==1|b|d}}}}, {ROUGE})'],
    RECT_FIXE + [f's = segment({{{{if:t==1|b|d}}}}, {{{{if:t==1|c|a}}}}, {ROUGE})'],
]
MOT = variation(
    'Le trait rouge est …\n\n'
    + '```figure\nfenetre: 0 ; 10 ; 0 ; 7\ndescription: Une figure et un trait rouge.\n---\n'
    + selon('u', ['\n'.join(f) for f in FIGURES_MOT]) + '\n```'
    + choix(ELEMENTS, melanger=False),
    ['{{w}}'], [var('u', '1..5'), var('t', '1..2'), var('w', 'eval:u-1')],
    [selon('u', ['Le trait va d\'un sommet au sommet opposé du rectangle : c\'est '
                 + colt('une diagonale') + '.',
                 'Le trait va du centre $O$ à un point du cercle : c\'est ' + colt('un rayon') + '.',
                 'Le trait va d\'un point du cercle à un autre en passant par le centre : c\'est '
                 + colt('un diamètre') + ' (deux rayons bout à bout).',
                 'C\'est le grand côté du rectangle : ' + colt('la longueur') + '.',
                 'C\'est le petit côté du rectangle : ' + colt('la largeur') + '.'])])

# polygones à n côtés (3 à 6), deux dessins chacun, sans angle droit apparent
POLYS = {}
for n in (3, 4, 5, 6):
    rayons = [[2.7, 2.3, 2.6, 2.5, 2.7, 2.2], [2.4, 2.7, 2.6, 2.3, 2.7, 2.5]]
    POLYS[n] = [centre([(r * math.cos(math.radians(d0 + 360 * s / n + 9 * (s % 2))),
                         r * math.sin(math.radians(d0 + 360 * s / n + 9 * (s % 2))))
                        for s, r in zip(range(n), rr)])
                for rr, d0 in zip(rayons, (90, 15))]
BLOCS_POLY = []
for n in (3, 4, 5, 6):
    for p in POLYS[n]:
        BLOCS_POLY.append('\n'.join(
            [f'{nom} = point({x}, {y}, visible=faux)' for nom, (x, y) in zip(NOMS, p)]
            + [f'q = polygone({", ".join(NOMS[:n])}, {COULEUR}, epaisseur=2)']))
NOMS_POLY = ['un triangle', 'un quadrilatère', 'un pentagone', 'un hexagone']
POLYGONE = variation(
    'Cette figure est …\n\n'
    + '```figure\nfenetre: 0 ; 10 ; 0 ; 7\ndescription: Un polygone.\n---\n'
    + selon('k', BLOCS_POLY) + '\n```' + choix(NOMS_POLY, melanger=False),
    ['{{w}}'], [VAR_COULEUR, var('k', '1..8'), var('w', 'eval:floor((k-1)/2)'),
                var('n', 'eval:w+3')],
    ['On compte les côtés : $' + col('{{n}}') + '$. ' + selon('w', [
        'Un polygone à $3$ côtés est ' + colt('un triangle') + '.',
        'Un polygone à $4$ côtés est ' + colt('un quadrilatère') + '.',
        'Un polygone à $5$ côtés est ' + colt('un pentagone') + '.',
        'Un polygone à $6$ côtés est ' + colt('un hexagone') + '.'], 0)])

SPECS_MOT = [
    spec('Diagonale', 0, {'u': 1, 't': 1, 'w': 0}, '0', 'correct'),
    spec('Erreur : diagonale prise pour la longueur', 0, {'u': 1, 't': 1, 'w': 0}, '3',
         'incorrect'),
    spec('Rayon', 0, {'u': 2, 't': 2, 'w': 1}, '1', 'correct'),
    spec('Erreur : rayon pris pour un diamètre', 0, {'u': 2, 't': 2, 'w': 1}, '2', 'incorrect'),
    spec('Diamètre', 0, {'u': 3, 't': 1, 'w': 2}, '2', 'correct'),
    spec('Erreur : diamètre pris pour un rayon', 0, {'u': 3, 't': 1, 'w': 2}, '1', 'incorrect'),
    spec('Longueur', 0, {'u': 4, 't': 2, 'w': 3}, '3', 'correct'),
    spec('Largeur', 0, {'u': 5, 't': 1, 'w': 4}, '4', 'correct'),
    spec('Erreur : largeur prise pour la longueur', 0, {'u': 5, 't': 1, 'w': 4}, '3',
         'incorrect'),
    spec('Triangle', 1, {'c': 1, 'k': 1, 'w': 0, 'n': 3}, '0', 'correct'),
    spec('Quadrilatère', 1, {'c': 2, 'k': 4, 'w': 1, 'n': 4}, '1', 'correct'),
    spec('Pentagone', 1, {'c': 3, 'k': 5, 'w': 2, 'n': 5}, '2', 'correct'),
    spec('Erreur : pentagone pris pour un hexagone', 1, {'c': 3, 'k': 5, 'w': 2, 'n': 5}, '3',
         'incorrect'),
    spec('Hexagone', 1, {'c': 4, 'k': 8, 'w': 3, 'n': 6}, '3', 'correct'),
]

# ---- 05. Le code des longueurs (CE2-081) ----

RECT_NOMMES = [RECTANGLES[0], RECTANGLES[1], RECTANGLES[3]]
MESURE = variation(
    'Les codes disent quels côtés ont la même longueur. La figure n\'est pas en vraie grandeur.\n\n'
    + '$' + selon('t', ['[AB]', '[BC]']) + '$ mesure $' + selon('t', ['{{a}}', '{{b}}'])
    + '$ cm. Combien mesure $' + selon('t', ['[CD]', '[DA]']) + '$ ?\n\n'
    + figure('Un rectangle ABCD, côtés codés.',
             points('k', RECT_NOMMES)
             + ['q = polygone(a, b, c, d, couleur="noir", epaisseur=2)']
             + codes_cotes(4, [1, 2, 1, 2]) + DROITS4 + etiquettes('k', RECT_NOMMES, 'ABCD'))
    + '\n\n$' + selon('t', ['[CD]', '[DA]']) + '$ mesure $?$ cm.',
    ['{{if:t==1|{{a}}|{{b}}}}'], [var('k', '1..3'), var('t', '1..2'), var('a', '6..12'),
                                  var('b', '2..5')],
    ['$' + selon('t', ['[AB]', '[BC]']) + '$ et $' + selon('t', ['[CD]', '[DA]'])
     + '$ ont le même code ' + selon('t', ['(un trait)', '(deux traits)']) + ' : ils ont la même'
     ' longueur. $' + selon('t', ['[CD]', '[DA]']) + '$ mesure $' + col(
         '{{if:t==1|{{a}}|{{b}}}}') + '$ cm.'])

# cerf-volant ABCD : AB = AD (un trait), CB = CD (deux traits) ; triangle ABC : AB = AC
CERF = centre([(0, 3), (1.8, 1.5), (0, -2.4), (-1.8, 1.5)])
CERFS = [CERF, centre(tourne([(0, 3), (1.8, 1.5), (0, -2.4), (-1.8, 1.5)], 90)),
         centre(tourne([(0, 3), (1.8, 1.5), (0, -2.4), (-1.8, 1.5)], 200))]
MEME_COTE = variation(
    'D\'après les codes, quel côté a la même longueur que $[AB]$ ?\n\n'
    + figure('Un quadrilatère ABCD, côtés codés.',
             points('k', CERFS) + [f'q = polygone(a, b, c, d, {COULEUR}, epaisseur=2)']
             + codes_cotes(4, [1, 2, 2, 1]) + etiquettes('k', CERFS, 'ABCD'))
    + choix(['$[AD]$', '$[BC]$', '$[CD]$'], melanger=False),
    ['0'], [VAR_COULEUR, var('k', '1..3')],
    ['$[AB]$ porte un trait ; le seul autre côté à un trait est $' + col('[AD]') + '$.',
     '$[BC]$ et $[CD]$ portent deux traits : ils ont la même longueur, entre eux.'])

L4 = LOSANGES[0]
R4 = RECTANGLES[5]
Q4 = centre([(0, 0), (5, 0), (4.1, 3.2), (0.9, 3.2)])  # trapèze aux côtés obliques égaux


def dessin(pts, codes):
    return ([serree(pts), 'taille: grande', 'description: Une figure codée.', '---']
            + [f'{nom} = point({x}, {y}, visible=faux)' for nom, (x, y) in zip(NOMS, pts)]
            + ['q = polygone(a, b, c, d, couleur="noir", epaisseur=2)'] + codes)


BIEN_CODE = variation(
    'Sur quel dessin les codes disent-ils que les $4$ côtés ont la même longueur ?'
    + choix_dessins([dessin(L4, codes_cotes(4, [1, 1, 1, 1])),
                     dessin(R4, codes_cotes(4, [1, 2, 1, 2])),
                     dessin(Q4, codes_cotes(4, [0, 1, 0, 1]))]),
    ['0'], [],
    ['Les $4$ côtés portent ' + colt('le même code') + ' (un trait) : ils ont la même longueur.',
     'Deux codes différents (un trait, deux traits) disent deux longueurs différentes.'])

SPECS_LONGUEURS = [
    spec('[CD] = [AB]', 0, {'k': 1, 't': 1, 'a': 8, 'b': 3}, '8', 'correct'),
    spec('Erreur : la largeur prise', 0, {'k': 1, 't': 1, 'a': 8, 'b': 3}, '3', 'incorrect'),
    spec('[DA] = [BC]', 0, {'k': 3, 't': 2, 'a': 10, 'b': 4}, '4', 'correct'),
    spec('Erreur : la longueur prise', 0, {'k': 3, 't': 2, 'a': 10, 'b': 4}, '10', 'incorrect'),
    spec('[AD] a le même code', 1, {'c': 1, 'k': 2}, '0', 'correct'),
    spec('Erreur : le côté voisin [BC]', 1, {'c': 1, 'k': 2}, '1', 'incorrect'),
    spec('Le losange codé', 2, {}, '0', 'correct'),
    spec('Erreur : le rectangle codé', 2, {}, '1', 'incorrect'),
]

# ---- 06. Utiliser le code de l'angle droit (CE2-071) ----

TRAPEZE = [(0, 0), (5, 0), (3.2, 3), (0, 3)]
assert [round(angle_en(TRAPEZE, s)) for s in range(4)].count(90) == 2
TRAPEZES = [centre(tourne(TRAPEZE, r)) for r in (0, 20, 180, 200)]
QUELS_DROITS = variation(
    'Quels angles de la figure $ABCD$ sont droits ? Coche toutes les bonnes réponses.\n\n'
    + figure('Un quadrilatère ABCD, des angles codés.',
             points('k', TRAPEZES) + [f'q = polygone(a, b, c, d, {COULEUR}, epaisseur=2)']
             + codes_droits(4, [0, 3]) + etiquettes('k', TRAPEZES, 'ABCD'))
    + choix(['l\'angle en $A$', 'l\'angle en $B$', 'l\'angle en $C$', 'l\'angle en $D$'],
            melanger=False, plusieurs=True),
    ['0;3'], [VAR_COULEUR, var('k', '1..4')],
    ['Les petits carrés sont en $' + col('A') + '$ et en $' + col('D') + '$ : ces deux angles sont'
     ' droits.', 'Les angles en $B$ et en $C$ ne sont pas codés : ils ne sont pas droits.'])

def place_tri(pts, cx, cy):
    """Triangle centré en (cx, cy), sans la garde de la fenêtre 10 × 7."""
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    dx, dy = cx - (min(xs) + max(xs)) / 2, cy - (min(ys) + max(ys)) / 2
    return [(round(x + dx, 2), round(y + dy, 2)) for x, y in pts]


# trois triangles côte à côte (fenêtre 0 ; 15 ; 0 ; 6) : le rectangle à la place k, codé
T_RECT = tourne([(0, 0), (3.6, 0), (0, 2.6)], 20)
T_AUTRES = [tourne([(0, 0), (3.6, 0), (1.8, 1.8 * math.tan(math.radians(58)))], 10),
            tourne([(0, 0), (4, 0), (2, 2 * math.tan(math.radians(35)))], 160)]
ORDRES = [[T_RECT] + T_AUTRES, [T_AUTRES[0], T_RECT, T_AUTRES[1]], T_AUTRES + [T_RECT]]
NOMS_PLACE = ['abc', 'dfg', 'hjm']
LIGNES_TRI = []
for place in range(3):
    pts_k = [place_tri(ordre[place], 2.5 + 5 * place, 3.4) for ordre in ORDRES]
    for pts in pts_k:
        assert all(0.3 <= x <= 14.7 and 0.9 <= y <= 5.8 for x, y in pts), pts
    noms = NOMS_PLACE[place]
    for v, nom in enumerate(noms):
        LIGNES_TRI.append(f'{nom} = point({selon("k", [p[v][0] for p in pts_k])}, '
                          f'{selon("k", [p[v][1] for p in pts_k])}, visible=faux)')
    LIGNES_TRI.append(f'q{place} = polygone({", ".join(noms)}, {COULEUR}, epaisseur=2)')
    LIGNES_TRI.append(f'texte({2.5 + 5 * place - 0.15}, 0.5, "{place + 1}")')
LIGNES_TRI.append(selon('k', [f'g = angle({n[2]}, {n[0]}, {n[1]}, marque="carre", couleur="noir")'
                              for n in NOMS_PLACE]))
assert abs(angle_en(T_RECT, 0) - 90) < 1e-6
assert all(abs(angle_en(t, s) - 90) >= 20 for t in T_AUTRES for s in range(3))

QUEL_TRIANGLE = variation(
    'Quel triangle est rectangle ?\n\n'
    + figure('Trois triangles numérotés 1, 2 et 3 ; un angle codé.', LIGNES_TRI,
             fenetre='0 ; 15 ; 0 ; 6')
    + choix(['le triangle $1$', 'le triangle $2$', 'le triangle $3$'], melanger=False),
    ['{{w}}'], [VAR_COULEUR, var('k', '1..3'), var('w', 'eval:k-1')],
    ['Le petit carré est dans le triangle $' + col('{{k}}') + '$ : il code ' + colt('un angle droit')
     + ', ce triangle est rectangle.',
     'Les deux autres n\'ont aucun angle codé : on ne peut pas dire qu\'ils sont rectangles.'])

RECT_UN_CODE = variation(
    'Cette figure est un rectangle. Un seul de ses angles droits est codé. Combien d\'angles droits'
    ' a-t-elle ?\n\n'
    + polygone('k', RECTANGLES[:4], 'Un rectangle, un angle codé.', codes_droits(4, [1]))
    + '\n\n$?$',
    ['4'], [VAR_COULEUR, var('k', '1..4')],
    ['Un rectangle a toujours $' + col('4') + '$ angles droits, même quand un seul est codé.'])

SPECS_CODE_DROIT = [
    spec('A et D', 0, {'c': 1, 'k': 2}, '0;3', 'correct'),
    spec('Erreur : B et C', 0, {'c': 1, 'k': 2}, '1;2', 'incorrect'),
    spec('Erreur : tous les angles', 0, {'c': 1, 'k': 2}, '0;1;2;3', 'incorrect'),
    spec('Le triangle codé, place 2', 1, {'c': 1, 'k': 2, 'w': 1}, '1', 'correct'),
    spec('Erreur : un triangle sans code', 1, {'c': 1, 'k': 2, 'w': 1}, '0', 'incorrect'),
    spec('Le triangle codé, place 3', 1, {'c': 3, 'k': 3, 'w': 2}, '2', 'correct'),
    spec('Rectangle : 4', 2, {'c': 2, 'k': 3}, '4', 'correct'),
    spec('Erreur : 1 (le seul codé)', 2, {'c': 2, 'k': 3}, '1', 'incorrect'),
]

# ---- 07. Est-ce un axe de symétrie ? (CE2-072) ----

AXE = 'trait="tirets", couleur="rouge", epaisseur=2'


def poly_fixe(pts, ferme=True):
    lignes = [f'{nom} = point({x}, {y}, visible=faux)' for nom, (x, y) in zip(NOMS, pts)]
    if ferme:
        lignes.append(f'q = polygone({", ".join(NOMS[:len(pts)])}, {COULEUR}, epaisseur=2)')
    else:
        lignes += [f's{s} = segment({NOMS[s]}, {NOMS[s + 1]}, {COULEUR}, epaisseur=4)'
                   for s in range(len(pts) - 1)]
    return lignes


def axe(x1, y1, x2, y2):
    return [f'u = point({x1}, {y1}, visible=faux)', f'v = point({x2}, {y2}, visible=faux)',
            f'l = droite(u, v, {AXE})']


LOS_V = [(5, 0.8), (7.2, 3.5), (5, 6.2), (2.8, 3.5)]
RECT_V = [(2, 1.5), (8, 1.5), (8, 5.5), (2, 5.5)]
CARRE_V = [(2.5, 1), (7.5, 1), (7.5, 6), (2.5, 6)]
CERF_V = [(5, 6.3), (7, 4.5), (5, 0.7), (3, 4.5)]
ISO_V = [(3, 1), (7, 1), (5, 6.3)]
PARA_V = [(1.5, 1.5), (6.5, 1.5), (8.5, 5.5), (3.5, 5.5)]
LETTRE_A = [[(2.5, 1), (5, 6.2), (7.5, 1)], [(3.6, 3.3), (6.4, 3.3)]]
LETTRE_N = [[(3, 1), (3, 6), (7, 1), (7, 6)]]


def lettre(traits):
    lignes = []
    for t, pts in enumerate(traits):
        noms = [f'p{t}{s}' for s in range(len(pts))]
        lignes += [f'{n} = point({x}, {y}, visible=faux)' for n, (x, y) in zip(noms, pts)]
        lignes += [f'w{t}{s} = segment({noms[s]}, {noms[s + 1]}, {COULEUR}, epaisseur=6)'
                   for s in range(len(pts) - 1)]
    return lignes


# (figure, axe, oui ?, explication)
CAS_AXE = [
    (poly_fixe(LOS_V) + axe(5, 0, 5, 7), True,
     'On plie le losange le long de sa diagonale : les deux moitiés se superposent.'),
    (poly_fixe(RECT_V) + axe(2, 1.5, 8, 5.5), False,
     'On plie le rectangle le long de sa diagonale : les deux moitiés ne se superposent pas. La'
     ' diagonale d\'un rectangle n\'est pas un axe de symétrie.'),
    (poly_fixe(RECT_V) + axe(5, 0, 5, 7), True,
     'La droite passe par les milieux des deux grands côtés : en pliant, les deux moitiés se'
     ' superposent.'),
    (poly_fixe(CARRE_V) + axe(2.5, 1, 7.5, 6), True,
     'La diagonale d\'un carré est un axe de symétrie : en pliant, les deux moitiés se superposent.'),
    (poly_fixe(CERF_V) + axe(5, 0, 5, 7), True,
     'On plie le cerf-volant le long de sa grande diagonale : les deux moitiés se superposent.'),
    (poly_fixe(CERF_V) + axe(0, 4.5, 10, 4.5), False,
     'Au-dessus de la droite, la partie est petite ; en dessous, elle est grande : en pliant, elles'
     ' ne se superposent pas.'),
    (poly_fixe(ISO_V) + axe(5, 0, 5, 7), True,
     'Le triangle a deux côtés de la même longueur ; en pliant le long de la droite, les deux'
     ' moitiés se superposent.'),
    (poly_fixe(PARA_V) + axe(5, 0, 5, 7), False,
     'En pliant le long de la droite, une moitié penche d\'un côté, l\'autre de l\'autre : elles ne'
     ' se superposent pas.'),
    (lettre(LETTRE_A) + axe(5, 0, 5, 7), True,
     'La lettre A plie en deux moitiés qui se superposent.'),
    (lettre(LETTRE_N) + axe(5, 0, 5, 7), False,
     'Plions le N le long de la droite : le trait penché ne retombe pas sur lui-même. Le N n\'a'
     ' pas d\'axe de symétrie.'),
]
EST_AXE = variation(
    'La droite rouge est-elle un axe de symétrie de la figure ?\n\n'
    + '```figure\nfenetre: 0 ; 10 ; 0 ; 7\ndescription: Une figure et une droite en tirets.\n---\n'
    + selon('s', ['\n'.join(f) for f, _, _ in CAS_AXE]) + '\n```'
    + choix(['Oui', 'Non'], melanger=False),
    ['{{w}}'], [VAR_COULEUR, var('s', '1..' + str(len(CAS_AXE))),
                var('w', selon('s', ['0' if oui else '1' for _, oui, _ in CAS_AXE]))],
    [selon('s', [('Oui. ' if oui else 'Non. ') + t for _, oui, t in CAS_AXE])])

QUELCONQUE = [(2, 1.2), (8, 1.8), (6.8, 5.8), (3, 4.8)]
SCALENE = [(1.5, 1), (8.5, 1.8), (4, 6)]
PARA_D = [(1.5, 1.5), (6.5, 1.5), (8.5, 5.5), (3.5, 5.5)]


def dessin_fixe(pts, description):
    return ([serree(pts), 'taille: grande', 'description: ' + description, '---']
            + [f'{nom} = point({x}, {y}, visible=faux)' for nom, (x, y) in zip(NOMS, pts)]
            + [f'q = polygone({", ".join(NOMS[:len(pts)])}, couleur="noir", epaisseur=2)'])


SYMETRIQUES = [(CERF_V, 'un cerf-volant'), (ISO_V, 'un triangle à deux côtés égaux'),
               (LOS_V, 'un losange')]
QUELLE_A_UN_AXE = variation(
    'Quelle figure a un axe de symétrie ?'
    + choix_dessins([
        [serree(*[p for p, _ in SYMETRIQUES]), 'taille: grande', 'description: Une figure.', '---',
         selon('k', ['\n  '.join(dessin_fixe(p, '')[4:]) for p, _ in SYMETRIQUES])],
        dessin_fixe(QUELCONQUE, 'Une figure.'), dessin_fixe(SCALENE, 'Une figure.'),
        dessin_fixe(PARA_D, 'Une figure.')]),
    ['0'], [var('k', '1..3')],
    ['C\'est ' + selon('k', [colt(n) for _, n in SYMETRIQUES]) + ' : en le pliant en deux, les'
     ' deux moitiés se superposent.',
     'Les autres figures ont des côtés et des angles tous différents (ou penchés) : aucun pliage ne'
     ' superpose leurs deux moitiés.'])

SPECS_AXE = [
    spec('Losange et sa diagonale : oui', 0, {'c': 1, 's': 1, 'w': 0}, '0', 'correct'),
    spec('Erreur : losange, non', 0, {'c': 1, 's': 1, 'w': 0}, '1', 'incorrect'),
    spec('Rectangle et sa diagonale : non', 0, {'c': 2, 's': 2, 'w': 1}, '1', 'correct'),
    spec('Erreur : diagonale du rectangle prise pour un axe', 0, {'c': 2, 's': 2, 'w': 1}, '0',
         'incorrect'),
    spec('Rectangle et sa médiane : oui', 0, {'c': 3, 's': 3, 'w': 0}, '0', 'correct'),
    spec('Cerf-volant, petite diagonale : non', 0, {'c': 4, 's': 6, 'w': 1}, '1', 'correct'),
    spec('Parallélogramme : non', 0, {'c': 1, 's': 8, 'w': 1}, '1', 'correct'),
    spec('Lettre A : oui', 0, {'c': 2, 's': 9, 'w': 0}, '0', 'correct'),
    spec('Lettre N : non', 0, {'c': 3, 's': 10, 'w': 1}, '1', 'correct'),
    spec('Le cerf-volant a un axe', 1, {'k': 1}, '0', 'correct'),
    spec('Erreur : le parallélogramme', 1, {'k': 1}, '3', 'incorrect'),
    spec('Le losange a un axe', 1, {'k': 3}, '0', 'correct'),
]

# ---- 08. Combien d'axes de symétrie ? (CE2-072) ----

EQUI = [(2.5, 1), (7.5, 1), (5, 1 + 5 * math.sqrt(3) / 2)]
CAS_NOMBRE = [
    (CARRE_V, 4, 'Le carré a $4$ axes : ses $2$ diagonales et les $2$ droites qui passent par les'
     ' milieux de ses côtés opposés.'),
    (RECT_V, 2, 'Le rectangle a $2$ axes : les droites qui passent par les milieux de ses côtés'
     ' opposés. Ses diagonales ne sont pas des axes.'),
    (LOS_V, 2, 'Le losange a $2$ axes : ses $2$ diagonales.'),
    (CERF_V, 1, 'Le cerf-volant a $1$ axe : sa grande diagonale.'),
    (ISO_V, 1, 'Ce triangle a deux côtés de la même longueur : $1$ axe, qui passe par le sommet'
     ' entre ces deux côtés.'),
    (EQUI, 3, 'Ce triangle a ses trois côtés de la même longueur : $3$ axes, un par sommet.'),
    (PARA_V, 0, 'Aucun pliage ne superpose les deux moitiés : $0$ axe.'),
]
NOMBRE_AXES = variation(
    'Combien d\'axes de symétrie a cette figure ?\n\n'
    + '```figure\nfenetre: 0 ; 10 ; 0 ; 7\ndescription: Une figure.\n---\n'
    + selon('k', ['\n'.join(poly_fixe([(round(x, 2), round(y, 2)) for x, y in p]))
                  for p, _, _ in CAS_NOMBRE]) + '\n```\n\n$?$',
    ['{{n}}'], [VAR_COULEUR, var('k', '1..' + str(len(CAS_NOMBRE))),
                var('n', selon('k', [str(n) for _, n, _ in CAS_NOMBRE]))],
    [selon('k', [t for _, _, t in CAS_NOMBRE])])

SPECS_NOMBRE = [
    spec('Carré : 4', 0, {'c': 1, 'k': 1, 'n': 4}, '4', 'correct'),
    spec('Erreur : carré, 2 (médianes seules)', 0, {'c': 1, 'k': 1, 'n': 4}, '2', 'incorrect'),
    spec('Rectangle : 2', 0, {'c': 2, 'k': 2, 'n': 2}, '2', 'correct'),
    spec('Erreur : rectangle, 4 (diagonales comptées)', 0, {'c': 2, 'k': 2, 'n': 2}, '4',
         'incorrect'),
    spec('Losange : 2', 0, {'c': 3, 'k': 3, 'n': 2}, '2', 'correct'),
    spec('Cerf-volant : 1', 0, {'c': 4, 'k': 4, 'n': 1}, '1', 'correct'),
    spec('Triangle à deux côtés égaux : 1', 0, {'c': 1, 'k': 5, 'n': 1}, '1', 'correct'),
    spec('Triangle à trois côtés égaux : 3', 0, {'c': 2, 'k': 6, 'n': 3}, '3', 'correct'),
    spec('Parallélogramme : 0', 0, {'c': 3, 'k': 7, 'n': 0}, '0', 'correct'),
    spec('Erreur : parallélogramme, 2', 0, {'c': 3, 'k': 7, 'n': 0}, '2', 'incorrect'),
]

# ---- 09. Compléter une figure par symétrie (CE2-073) ----

# moitiés contre l'axe vertical x = 6 (quadrillage 12 × 8) : lignes brisées sur les nœuds
MOITIES_V = [
    ('une maison', [(6, 1), (3, 1), (3, 4), (2, 4), (6, 7)]),
    ('un sapin', [(6, 7), (3, 4), (4, 4), (2, 2), (5, 2), (5, 1), (6, 1)]),
    ('une flèche', [(6, 7), (2, 4), (4, 4), (4, 1), (6, 1)]),
    ('un vase', [(6, 1), (4, 1), (3, 3), (4, 5), (3, 7), (6, 7)]),
]
# moitiés contre l'axe horizontal y = 4
MOITIES_H = [
    ('une flèche', [(1, 4), (1, 6), (7, 6), (7, 7), (10, 4)]),
    ('un poisson', [(2, 4), (4, 6), (8, 6), (9, 5), (11, 7), (11, 4)]),
    ('un château', [(1, 4), (1, 7), (3, 7), (3, 6), (5, 6), (5, 7), (7, 7), (7, 6), (9, 6),
                    (9, 7), (11, 7), (11, 4)]),
]
# figures écartées de l'axe vertical x = 6
ECARTEES = [
    ('un triangle', [(1, 2), (4, 2), (4, 6), (1, 2)]),
    ('un drapeau', [(2, 1), (2, 7), (5, 6), (2, 5)]),
    ('un L', [(2, 1), (4, 1), (4, 2), (3, 2), (3, 6), (2, 6), (2, 1)]),
]


def image(pts, vertical):
    return [(12 - x, y) if vertical else (x, 8 - y) for x, y in pts]


def segments(pts):
    return '|'.join(f'segment({x1};{y1};{x2};{y2})'
                    for (x1, y1), (x2, y2) in zip(pts, pts[1:]))


def glissee(pts, vertical):
    """Erreur typique : la moitié recopiée en glissant, sans la retourner."""
    return [(x + 6, y) if vertical else (x, y - 4) for x, y in pts]


for _, p in MOITIES_V + ECARTEES:
    assert all(0 <= x <= 6 and 0 <= y <= 8 for x, y in p) and all(
        0 <= x <= 12 for x, _ in image(p, True))
for _, p in MOITIES_H:
    assert all(0 <= x <= 12 and 4 <= y <= 8 for x, y in p)


def bloc_completer(cas, vertical):
    blocs = []
    for _, pts in cas:
        lignes = [f'{n} = point({x}, {y}, visible=faux)'
                  for n, (x, y) in zip([f'p{s}' for s in range(len(pts))], pts)]
        lignes += [f's{s} = segment(p{s}, p{s + 1}, epaisseur=3)' for s in range(len(pts) - 1)]
        blocs.append('\n'.join(lignes))
    a = ['m = point(6, 0, visible=faux)', 'n = point(6, 8, visible=faux)', 'texte(6.3, 7.6, "d")'] \
        if vertical else ['m = point(0, 4, visible=faux)', 'n = point(12, 4, visible=faux)',
                          'texte(11.5, 4.4, "d")']
    return ('```figure-a-completer\nfenetre: 0 ; 12 ; 0 ; 8\ngrille: 1\nverifier: symetrique par d'
            '\n---\n' + '\n'.join(a) + '\nd = droite(m, n, trait="tirets", couleur="rouge")\n'
            + selon('k', blocs) + '\n```')


ETAPES_SYM = ['Chaque sommet a son symétrique de l\'autre côté de l\'axe $d$, '
              + colt('à la même distance') + ' : on compte les carreaux jusqu\'à l\'axe, puis autant'
              ' de l\'autre côté.', 'On relie les points dans le même ordre : la figure est '
              + colt('retournée') + ', pas glissée.']

COMPLETE_V = variation(
    'Complète la figure pour qu\'elle soit symétrique par rapport à la droite $d$.\n\n'
    + bloc_completer(MOITIES_V, True),
    None, [var('k', '1..' + str(len(MOITIES_V)))], ETAPES_SYM)
COMPLETE_H = variation(
    'Complète la figure pour qu\'elle soit symétrique par rapport à la droite $d$.\n\n'
    + bloc_completer(MOITIES_H, False),
    None, [var('k', '1..' + str(len(MOITIES_H)))], ETAPES_SYM)
COMPLETE_ECART = variation(
    'Trace le symétrique de la figure par rapport à la droite $d$.\n\n'
    + bloc_completer(ECARTEES, True),
    None, [var('k', '1..' + str(len(ECARTEES)))], ETAPES_SYM)

SPECS_SYM = []
for vi, (cas, vertical) in enumerate([(MOITIES_V, True), (MOITIES_H, False), (ECARTEES, True)]):
    for k, (nom, pts) in enumerate(cas, start=1):
        SPECS_SYM.append(spec(f'{nom} : symétrique juste', vi, {'k': k},
                              segments(image(pts, vertical)), 'correct'))
        if k == 1:
            SPECS_SYM.append(spec(f'Erreur : {nom} glissée', vi, {'k': k},
                                  segments(glissee(pts, vertical)), 'incorrect'))
            SPECS_SYM.append(spec(f'Erreur : {nom}, symétrique incomplet', vi, {'k': k},
                                  segments(image(pts, vertical)[:-1]), 'incorrect'))

# ---- Fichiers ----

MODELES = {
    '01-quelle-est-cette-figure': modele(
        'Quelle est cette figure ? Carré, rectangle, losange, triangles',
        'Nommer un carré (sur la pointe aussi), un rectangle, un losange, un triangle rectangle, un'
        ' triangle ; angles droits codés', 6,
        [F_CARRE, F_RECT, F_LOS, F_TRI_RECT, F_TRI], SPECS_QUELLE),
    '02-decrire-la-figure': modele(
        'Décrire le carré, le rectangle, le losange : côtés et angles droits',
        'Combien d\'angles droits ; la phrase qui décrit la figure ; qui suis-je ?', 7,
        [ANGLES_DROITS, DESCRIPTION, QUI_SUIS_JE], SPECS_DECRIRE),
    '03-carre-rectangle-losange': modele(
        'Propriétés du carré, du rectangle et du losange',
        'Phrase vraie ; nommer d\'après les codes ; ce qui manque pour être un carré', 8,
        [PHRASE, CODEE, MANQUE], SPECS_PROPRIETES),
    '04-le-bon-mot': modele(
        'Le bon mot : diagonale, rayon, diamètre, longueur, largeur ; polygones',
        'Nommer un trait montré sur un rectangle ou un cercle ; triangle, quadrilatère, pentagone,'
        ' hexagone', 9, [MOT, POLYGONE], SPECS_MOT),
    '05-le-code-des-longueurs': modele(
        'Le code des longueurs égales',
        'Longueur d\'un côté lue par son code ; côté de même code ; le dessin bien codé', 10,
        [MESURE, MEME_COTE, BIEN_CODE], SPECS_LONGUEURS),
    '06-utiliser-le-code-angle-droit': modele(
        'Utiliser le code de l\'angle droit',
        'Quels angles sont droits ; quel triangle est rectangle ; un rectangle codé une fois', 3,
        [QUELS_DROITS, QUEL_TRIANGLE, RECT_UN_CODE], SPECS_CODE_DROIT),
    '07-est-ce-un-axe': modele(
        'Est-ce un axe de symétrie ?',
        'Une figure et une droite : axe ou non (losange, rectangle, cerf-volant, lettres) ; la'
        ' figure qui a un axe', 1, [EST_AXE, QUELLE_A_UN_AXE], SPECS_AXE),
    '08-combien-d-axes': modele(
        'Combien d\'axes de symétrie ?',
        'Carré, rectangle, losange, cerf-volant, triangles, parallélogramme', 2,
        [NOMBRE_AXES], SPECS_NOMBRE),
    '09-complete-par-symetrie': modele(
        'Compléter une figure par symétrie sur quadrillage',
        'Tracer l\'autre moitié (axe vertical ou horizontal) ; symétrique d\'une figure écartée de'
        ' l\'axe', 3, [COMPLETE_V, COMPLETE_H, COMPLETE_ECART], SPECS_SYM, delay=240),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
