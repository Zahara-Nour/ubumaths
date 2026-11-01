"""Écrit les 9 modèles du lot 9 du CE1 (fractions dessinées et géométrie) dans scripts/questions/ce1-9/.

Phase 0 validée par David le 2026-11-01 (§ 16 du journal `docs/wip/questions-ce1-progress.md`,
« je suis tes recos »). Bornes `cycle2.json` : CE1-095 à 098 (dénominateurs 2, 3, 4, 5, 6, 8, 10,
fraction ≤ 1 ; partages de disques, carrés, bandes), CE1-069, 070, 105 (cercle, carré, rectangle,
triangle, triangle rectangle ; côté, sommet, angle, centre, milieu, droite, segment ; ni losange,
ni rayon, ni diamètre), CE1-075 (code de l'angle droit), CE1-087 (droit, aigu, obtus). Décisions :

1. Fractions : « Fractions · Apprivoiser · Partage » 5 à 8 (1 à 4 = CM1, publiés, non touchés).
2. Pas d'hexagone (absent du bloc ```partage) ; autant de parts que le dénominateur (4/8 = CE2).
3. Pas d'équerre à l'écran : 087 à l'œil sur quadrillage, angles à 20° au moins de l'angle droit,
   angle droit tourné compris.
4. Jamais « triangle » et « triangle rectangle » ensemble quand la figure est un triangle
   rectangle ; de même jamais « rectangle » quand la figure est un carré (aucun piège sur le nom
   le plus précis).
5. CE1-073 : brouillon CP `a7dfe502` repris par la migration du lot (pas de fichier ici).
6. Sous-notion neuve « Géométrie · Figures planes · Angles » (075, 087).

Figures : sommets calculés ici (positions précalculées, tirées par une variable `k`), centrés
dans la fenêtre 0 ; 10 ; 0 ; 7. Variables à une lettre ; jamais `e` ni `i`.

    python3 docs/wip/questions/lot-ce1-9.py scripts/questions/ce1-9
"""
import json
import math
import sys

DOSSIER = sys.argv[1]
FRACTIONS = {'constraints': {'reducedFractions': 'off'}}
W, H = 10, 7  # fenêtre de toutes les figures

# ---- Gabarits ----


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(x) for k, x in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(title, description, theme, domain, subdomain, level, variations, specs, options=None,
           delay=90):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (sous-notion du point) est posé par la migration
    m = {'title': title, 'description': description, 'grades': ['CE1'], 'theme': theme,
         'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': delay,
         'status': 'draft'}
    if options:
        m['options'] = options
    m['variations'] = variations
    m['testSpecs'] = specs
    return m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, reponses, variables, etapes, conditions=None, forme=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    if reponses is not None:
        v['blanks'] = [dict({'expectedAnswer': r}, **({'requiredForm': forme} if forme else {}))
                       for r in reponses]
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
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def frac(n, d):
    return '\\frac{' + n + '}{' + d + '}'


# ---- Fractions ----

DENOMS = [2, 3, 4, 5, 6, 8, 10]
D_DE_J = selon('j', DENOMS)  # j de 1 à 7
NOMS_PART = {2: 'demi', 3: 'tiers', 4: 'quart', 5: 'cinquième', 6: 'sixième', 8: 'huitième',
             10: 'dixième'}


def nom_part(d):
    """« quart » pour d = 4 (d est un nom de variable)."""
    return selon_valeur(d, [(x, NOMS_PART[x]) for x in DENOMS])


def selon_valeur(x, paires):
    """`{{if:x==2|demi|{{if:x==3|tiers|…}}}}`."""
    (v, t), reste = paires[0], paires[1:]
    if not reste:
        return t
    return '{{if:' + x + '==' + str(v) + '|' + t + '|' + selon_valeur(x, reste) + '}}'


FORME_BD = 'forme: {{if:k==0|bande|disque}} {{d}}'
VARS_BD = [var('k', '0..1'), var('j', '1..7'), var('d', D_DE_J)]
FORME_GRILLE = 'forme: grille 2×{{c}}'
VARS_GRILLE = [var('c', '2..5'), var('d', 'eval:2*c')]
PARTAGEE = '**La figure est partagée en ${{d}}$ parts égales** : une part, c\'est $\\frac{1}{{{d}}}$ de la figure, un ' + nom_part('d') + '.'
PARTAGEE_GRILLE = ('**La figure est partagée en $2 \\times {{c}} = {{d}}$ parts égales** : une'
                   ' part, c\'est $\\frac{1}{{{d}}}$ de la figure, un ' + nom_part('d') + '.')
QUELLE_PART = 'Quelle fraction de la figure est coloriée ?'


def eparpillees(g, n):
    """`gris:` de g parts éparpillées sur n (`mod(s + t*p, n) + 1`, p premier avec n)."""
    def liste(m):
        return ', '.join('{{eval:mod(s+' + str(t) + '*p,' + n + ')+1}}' for t in range(m))
    return selon_valeur(g, [(m, liste(m)) for m in range(2, 10)])


# 01. Quelle part est coloriée ? (CE1-096, fraction unitaire)

UNE_PART_BD = variation(
    QUELLE_PART + bloc('partage', FORME_BD, 'gris: {{r}},') + '\n\n$$?$$',
    ['\\frac{1}{{{d}}}'], VARS_BD + [var('r', '1..{{d}}')],
    [PARTAGEE, 'Une seule part est coloriée : $' + col('\\frac{1}{{{d}}}') + '$.'], forme='fraction')

UNE_PART_GRILLE = variation(
    QUELLE_PART + bloc('partage', FORME_GRILLE, 'gris: {{r}},') + '\n\n$$?$$',
    ['\\frac{1}{{{d}}}'], VARS_GRILLE + [var('r', '1..{{d}}')],
    [PARTAGEE_GRILLE, 'Une seule part est coloriée : $' + col('\\frac{1}{{{d}}}') + '$.'],
    forme='fraction')

UNE_PART_CARRE = variation(
    QUELLE_PART + bloc('partage', 'forme: carre-diagonales', 'gris: {{r}},') + '\n\n$$?$$',
    ['\\frac{1}{4}'], [var('r', '1..4')],
    ['**Le carré est partagé en $4$ triangles égaux** : un triangle, c\'est $\\frac{1}{4}$ du'
     ' carré, un quart.', 'Un seul triangle est colorié : $' + col('\\frac{1}{4}') + '$.'],
    forme='fraction')

SPECS_UNE_PART = [
    spec('Bande de 4, une part : 1/4', 0, {'k': 0, 'j': 3, 'r': 2}, '\\frac{1}{4}', 'correct'),
    spec('Erreur : 1/3 (coloriée sur les blanches)', 0, {'k': 0, 'j': 3, 'r': 2}, '\\frac{1}{3}',
         'incorrect'),
    spec('Erreur : 4/1 (renversée)', 0, {'k': 0, 'j': 3, 'r': 2}, '\\frac{4}{1}', 'incorrect'),
    spec('Erreur : 3/4 (les blanches)', 0, {'k': 0, 'j': 3, 'r': 2}, '\\frac{3}{4}', 'incorrect'),
    spec('Disque de 10 : 1/10', 0, {'k': 1, 'j': 7, 'r': 6}, '\\frac{1}{10}', 'correct'),
    spec('Grille 2×3 : 1/6', 1, {'c': 3, 'r': 5}, '\\frac{1}{6}', 'correct'),
    spec('Erreur : 1/5 (lignes plus colonnes)', 1, {'c': 3, 'r': 5}, '\\frac{1}{5}', 'incorrect'),
    spec('Forme : 0,25 refusé', 2, {'r': 3}, '0.25', 'bad_form'),
    spec('Carré en 4 triangles : 1/4', 2, {'r': 3}, '\\frac{1}{4}', 'correct'),
]
SPECS_UNE_PART[7]['expected']['constraintViolations'] = ['form']

# 02. Quelle fraction est coloriée ? (CE1-098, fraction ≤ 1)

FORMES_EPARPILLEES = ['bande 5', 'bande 6', 'bande 8', 'bande 10', 'grille 2×3', 'grille 2×4',
                      'grille 2×5', 'disque 8']
N_EPARPILLEES = [5, 6, 8, 10, 6, 8, 10, 8]

PLUSIEURS_BD = variation(
    QUELLE_PART + bloc('partage', FORME_BD, 'gris: {{n}}') + '\n\n$$?$$',
    ['\\frac{{{n}}}{{{d}}}'], VARS_BD + [var('n', '2..{{eval:d-1}}')],
    [PARTAGEE, '${{n}}$ parts sont coloriées : $' + col('\\frac{{{n}}}{{{d}}}') + '$.'],
    ['d >= 3'], forme='fraction')

PLUSIEURS_EPARPILLEES = variation(
    QUELLE_PART + bloc('partage', 'forme: ' + selon('f', FORMES_EPARPILLEES),
                       'gris: ' + eparpillees('n', 'd')) + '\n\n$$?$$',
    ['\\frac{{{n}}}{{{d}}}'],
    [var('f', '1..8'), var('d', selon('f', N_EPARPILLEES)), var('n', '2..{{eval:d-1}}'),
     var('p', '2..{{eval:d-2}}'), var('s', '0..{{eval:d-1}}')],
    ['**La figure est partagée en ${{d}}$ parts égales** : une part, c\'est $\\frac{1}{{{d}}}$'
     ' de la figure.',
     'Les parts coloriées ne se suivent pas : on les compte une par une. Il y en a ${{n}}$ : $'
     + col('\\frac{{{n}}}{{{d}}}') + '$.'],
    ['gcd(p,d) == 1'], forme='fraction')

TOUTE = variation(
    QUELLE_PART + bloc('partage', FORME_BD, 'gris: {{d}}') + '\n\n$$?$$',
    ['\\frac{{{d}}}{{{d}}}'], VARS_BD,
    [PARTAGEE, 'Les ${{d}}$ parts sont coloriées : $' + col('\\frac{{{d}}}{{{d}}}') + '$.',
     'Toute la figure est coloriée : $\\frac{{{d}}}{{{d}}} = 1$.'])

SPECS_PLUSIEURS = [
    spec('Bande de 8, 3 parts : 3/8', 0, {'k': 0, 'j': 6, 'n': 3}, '\\frac{3}{8}', 'correct'),
    spec('Erreur : 5/8 (les blanches)', 0, {'k': 0, 'j': 6, 'n': 3}, '\\frac{5}{8}', 'incorrect'),
    spec('Erreur : 3/5 (coloriées sur blanches)', 0, {'k': 0, 'j': 6, 'n': 3}, '\\frac{3}{5}',
         'incorrect'),
    spec('Erreur : 8/3 (renversée)', 0, {'k': 0, 'j': 6, 'n': 3}, '\\frac{8}{3}', 'incorrect'),
    spec('Disque de 6, 2 parts : 2/6', 0, {'k': 1, 'j': 5, 'n': 2}, '\\frac{2}{6}', 'correct'),
    spec('2/6 = 1/3, même valeur : juste', 0, {'k': 1, 'j': 5, 'n': 2}, '\\frac{1}{3}', 'correct'),
    spec('Éparpillées, bande de 10, 3 parts : 3/10', 1,
         {'f': 4, 'n': 3, 'p': 3, 's': 0}, '\\frac{3}{10}', 'correct'),
    spec('Erreur : 1/10 (un seul bloc compté)', 1, {'f': 4, 'n': 3, 'p': 3, 's': 0},
         '\\frac{1}{10}', 'incorrect'),
    spec('Toute la bande de 5 : 5/5', 2, {'k': 0, 'j': 4}, '\\frac{5}{5}', 'correct'),
    spec('Toute la bande de 5 : 1 accepté', 2, {'k': 0, 'j': 4}, '1', 'correct'),
    spec('Erreur : 0/5', 2, {'k': 0, 'j': 4}, '\\frac{0}{5}', 'incorrect'),
]

# 03. Colorie une part (CE1-095)

COLORIE_UNE_BD = variation(
    'Colorie $\\frac{1}{{{d}}}$ de la figure.' + bloc('partage', FORME_BD, 'colorier: 1/{{d}}'),
    None, VARS_BD,
    [PARTAGEE, 'On colorie $' + col('1') + '$ part, n\'importe laquelle.'])

COLORIE_UNE_GRILLE = variation(
    'Colorie $\\frac{1}{{{d}}}$ de la figure.' + bloc('partage', FORME_GRILLE,
                                                       'colorier: 1/{{d}}'),
    None, VARS_GRILLE,
    [PARTAGEE_GRILLE, 'On colorie $' + col('1') + '$ part, n\'importe laquelle.'])

SPECS_COLORIE_UNE = [
    spec('1/5 : une part', 0, {'k': 0, 'j': 4}, '3', 'correct'),
    spec('Erreur : 4 parts (les autres)', 0, {'k': 0, 'j': 4}, '1, 2, 3, 4', 'incorrect'),
    spec('Erreur : 5 parts (toute la figure)', 0, {'k': 0, 'j': 4}, '1, 2, 3, 4, 5', 'incorrect'),
    spec('Rien colorié : case vide', 0, {'k': 0, 'j': 4}, '', 'empty'),
    spec('1/8 sur une grille 2×4 : une part', 1, {'c': 4}, '6', 'correct'),
    spec('Erreur : 2 parts (une par ligne)', 1, {'c': 4}, '1, 5', 'incorrect'),
]

# 04. Colorie la fraction (CE1-097)

COLORIE_BD = variation(
    'Colorie $\\frac{{{n}}}{{{d}}}$ de la figure.' + bloc('partage', FORME_BD,
                                                           'colorier: {{n}}/{{d}}'),
    None, VARS_BD + [var('n', '2..{{d}}')],
    [PARTAGEE, '$\\frac{{{n}}}{{{d}}}$, c\'est ${{n}}$ fois $\\frac{1}{{{d}}}$ : on colorie $'
     + col('{{n}}') + '$ parts, n\'importe lesquelles.'])

COLORIE_GRILLE = variation(
    'Colorie $\\frac{{{n}}}{{{d}}}$ de la figure.' + bloc('partage', FORME_GRILLE,
                                                           'colorier: {{n}}/{{d}}'),
    None, VARS_GRILLE + [var('n', '2..{{eval:d-1}}')],
    [PARTAGEE_GRILLE, '$\\frac{{{n}}}{{{d}}}$, c\'est ${{n}}$ fois $\\frac{1}{{{d}}}$ : on'
     ' colorie $' + col('{{n}}') + '$ parts, n\'importe lesquelles.'])

SPECS_COLORIE = [
    spec('3/8 : 3 parts', 0, {'k': 0, 'j': 6, 'n': 3}, '1, 2, 3', 'correct'),
    spec('3/8 : 3 parts quelconques', 0, {'k': 0, 'j': 6, 'n': 3}, '2, 5, 8', 'correct'),
    spec('Erreur : 5 parts (les blanches)', 0, {'k': 0, 'j': 6, 'n': 3}, '1, 2, 3, 4, 5',
         'incorrect'),
    spec('Erreur : 8 parts (le dénominateur)', 0, {'k': 0, 'j': 6, 'n': 3},
         '1, 2, 3, 4, 5, 6, 7, 8', 'incorrect'),
    spec('3/3 : toute la figure', 0, {'k': 1, 'j': 2, 'n': 3}, '1, 2, 3', 'correct'),
    spec('7/10 sur une grille 2×5 : 7 parts', 1, {'c': 5, 'n': 7},
         '1, 2, 3, 4, 6, 8, 10', 'correct'),
    spec('Erreur : 3 parts (les blanches)', 1, {'c': 5, 'n': 7}, '5, 7, 9', 'incorrect'),
]

# ---- Géométrie : figures précalculées ----


def tourne(pts, angle):
    a = math.radians(angle)
    return [(x * math.cos(a) - y * math.sin(a), x * math.sin(a) + y * math.cos(a)) for x, y in pts]


def centre(pts, cx=W / 2, cy=H / 2):
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    dx, dy = cx - (min(xs) + max(xs)) / 2, cy - (min(ys) + max(ys)) / 2
    out = [(round(x + dx, 2), round(y + dy, 2)) for x, y in pts]
    for x, y in out:  # la figure tient dans la fenêtre, avec une marge
        assert 0.5 <= x <= W - 0.5 and 0.5 <= y <= H - 0.5, (pts, out)
    return out


def angle_en(pts, i):
    """Angle intérieur (degrés) au sommet i d'un polygone."""
    p, v, q = pts[i - 1], pts[i], pts[(i + 1) % len(pts)]
    a = math.atan2(p[1] - v[1], p[0] - v[0]) - math.atan2(q[1] - v[1], q[0] - v[0])
    a = abs(math.degrees(a)) % 360
    return min(a, 360 - a)


def carre(c, rot):
    return centre(tourne([(0, 0), (c, 0), (c, c), (0, c)], rot))


def rect(lg, la, rot):
    return centre(tourne([(0, 0), (lg, 0), (lg, la), (0, la)], rot))


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


def points(k, presets, noms='abcdefgh', visible=False):
    lignes = []
    for nom, (x, y) in zip(noms, coords(k, presets)):
        style = '' if visible else ', visible=faux'
        lignes.append(f'{nom} = point({x}, {y}{style})')
    return lignes


COULEUR = 'couleur="{{if:c==1|bleu|{{if:c==2|rouge|{{if:c==3|vert|orange}}}}}}"'
VAR_COULEUR = var('c', '1..4')


def polygone(k, presets, description):
    n = len(presets[0])
    noms = 'abcdefgh'[:n]
    return ('```figure\nfenetre: 0 ; 10 ; 0 ; 7\ndescription: ' + description + '\n---\n'
            + '\n'.join(points(k, presets)) + '\n'
            + f'q = polygone({", ".join(noms)}, {COULEUR}, epaisseur=2)\n```')


CARRES = [carre(3.6, r) for r in (15, 30, 45, 60, 75, 0)]
RECTANGLES = [rect(5.5, 2.8, 0), rect(5, 2.5, 20), rect(5.5, 3, 35), rect(5, 2.8, 90),
              rect(5.2, 2.6, 150), rect(5, 2.6, 110)]
TRI_RECTS = [tri_rect(4.5, 3, 0), tri_rect(4.2, 3.2, 30), tri_rect(4.5, 2.8, 90),
             tri_rect(4, 3, 135), tri_rect(4.4, 3, 200), tri_rect(4.2, 3.4, 300)]
TRI_ISOS = [tri_iso(4.6, 60, 0), tri_iso(4.6, 55, 25), tri_iso(4.4, 65, 160),
            tri_iso(4.8, 58, 200), tri_iso(4.6, 62, 290), tri_iso(4.4, 56, 100)]

for t in TRI_ISOS:  # triangles quelconques : aucun angle à moins de 20° de l'angle droit
    assert all(angle_en(t, s) <= 70 for s in range(3)), t
for t in TRI_RECTS:
    assert abs(angle_en(t, 0) - 90) < 0.5
    assert all(angle_en(t, s) <= 70 for s in (1, 2)), t

# 05. Quelle est cette figure ? (CE1-070)

QUELLE_FIGURE = 'Quelle est cette figure ?\n\n'
C_CERCLE, C_CARRE, C_RECT = 'C\'est un cercle.', 'C\'est un carré.', 'C\'est un rectangle.'
C_TRI, C_TRI_RECT = 'C\'est un triangle.', 'C\'est un triangle rectangle.'

CERCLE = variation(
    QUELLE_FIGURE + '```figure\nfenetre: 0 ; 10 ; 0 ; 7\ndescription: Une figure à nommer.\n---\n'
    'o = point({{if:x==1|4|{{if:x==2|5|6}}}}, 3.5, visible=faux)\n'
    'r = cercle(o, rayon={{if:r==1|2|{{if:r==2|2.5|2.8}}}}, ' + COULEUR + ', epaisseur=2)\n```'
    + choix([C_CERCLE, C_CARRE, C_RECT, C_TRI]),
    ['0'], [VAR_COULEUR, var('x', '1..3'), var('r', '1..3')],
    ['C\'est un ' + col('cercle') + ' : il est tout rond, il n\'a ni côté ni sommet.'])

CARRE = variation(
    QUELLE_FIGURE + polygone('k', CARRES, 'Une figure à nommer.')
    + choix([C_CERCLE, C_CARRE, C_TRI, C_TRI_RECT]),
    ['1'], [VAR_COULEUR, var('k', '1..6')],
    ['C\'est un ' + col('carré') + ' : il a $4$ côtés de la même longueur et $4$ angles droits.'
     '{{if:k==6|| Il est penché, mais c\'est toujours un carré.}}'])

RECTANGLE = variation(
    QUELLE_FIGURE + polygone('k', RECTANGLES, 'Une figure à nommer.')
    + choix([C_CERCLE, C_CARRE, C_RECT, C_TRI]),
    ['2'], [VAR_COULEUR, var('k', '1..6')],
    ['C\'est un ' + col('rectangle') + ' : il a $4$ angles droits, deux grands côtés et deux'
     ' petits côtés.'])

TRI_RECT = variation(
    QUELLE_FIGURE + polygone('k', TRI_RECTS, 'Une figure à nommer.')
    + choix([C_RECT, C_TRI_RECT, C_CARRE, C_CERCLE]),
    ['1'], [VAR_COULEUR, var('k', '1..6')],
    ['C\'est un ' + col('triangle rectangle') + ' : il a $3$ côtés et un angle droit.',
     'Un rectangle a $4$ côtés : ce n\'est pas un rectangle.'])

TRIANGLE = variation(
    QUELLE_FIGURE + polygone('k', TRI_ISOS, 'Une figure à nommer.')
    + choix([C_CERCLE, C_CARRE, C_TRI, C_TRI_RECT]),
    ['2'], [VAR_COULEUR, var('k', '1..6')],
    ['C\'est un ' + col('triangle') + ' : il a $3$ côtés et $3$ sommets.',
     'Aucun de ses angles n\'est droit : ce n\'est pas un triangle rectangle.'])

SPECS_FIGURE = [
    spec('Cercle', 0, {'c': 1, 'x': 2, 'r': 2}, '0', 'correct'),
    spec('Erreur : cercle pris pour un carré', 0, {'c': 1, 'x': 2, 'r': 2}, '1', 'incorrect'),
    spec('Carré penché', 1, {'c': 2, 'k': 3}, '1', 'correct'),
    spec('Erreur : carré sur la pointe pris pour un triangle rectangle', 1, {'c': 2, 'k': 3}, '3',
         'incorrect'),
    spec('Rectangle', 2, {'c': 3, 'k': 2}, '2', 'correct'),
    spec('Erreur : rectangle pris pour un carré', 2, {'c': 3, 'k': 2}, '1', 'incorrect'),
    spec('Triangle rectangle', 3, {'c': 4, 'k': 4}, '1', 'correct'),
    spec('Erreur : « rectangle » lu dans le nom', 3, {'c': 4, 'k': 4}, '0', 'incorrect'),
    spec('Triangle', 4, {'c': 1, 'k': 5}, '2', 'correct'),
    spec('Erreur : triangle pris pour un triangle rectangle', 4, {'c': 1, 'k': 5}, '3',
         'incorrect'),
]

# 06. Le bon mot (CE1-069)


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


def figure_nommee(k, presets, lettres, description, extra=()):
    n = len(presets[0])
    noms = 'abcdefgh'[:n]
    pts = [f'{nom} = point({x}, {y}, couleur="noir", etiquette="aucune")'
           for nom, (x, y) in zip(noms, coords(k, presets))]
    return ('```figure\nfenetre: 0 ; 10 ; 0 ; 7\ndescription: ' + description + '\n---\n'
            + '\n'.join(pts) + '\n'
            + f'q = polygone({", ".join(noms)}, couleur="noir", epaisseur=2)\n'
            + '\n'.join(etiquettes(k, presets, lettres)) + ('\n' if extra else '')
            + '\n'.join(extra) + '\n```')


TRIS_NOMMES = TRI_ISOS[:3] + TRI_RECTS[:3]
RECTS_NOMMES = RECTANGLES[:4]

SOMMET = variation(
    'Le point ${{if:v==1|A|{{if:v==2|B|C}}}}$ est … du triangle $ABC$.\n\n'
    + figure_nommee('k', TRIS_NOMMES, 'ABC', 'Un triangle ABC.')
    + choix(['un sommet', 'un côté', 'un centre', 'un milieu']),
    ['0'], [var('k', '1..6'), var('v', '1..3')],
    ['Les côtés du triangle se rejoignent en ${{if:v==1|A|{{if:v==2|B|C}}}}$ : c\'est un '
     + col('sommet') + '. Un triangle a $3$ sommets.'])

COTES = [('a', 'b'), ('b', 'c'), ('c', 'd'), ('d', 'a')]

COTE = variation(
    'Le trait de couleur est … du rectangle $ABCD$.\n\n'
    + figure_nommee('k', RECTS_NOMMES, 'ABCD', 'Un rectangle ABCD, un trait en couleur.',
                    ['s = segment(' + selon('t', [u for u, _ in COTES]) + ', '
                     + selon('t', [w for _, w in COTES]) + ', couleur="rouge", epaisseur=4)'])
    + choix(['un côté', 'un sommet', 'un angle', 'un centre']),
    ['0'], [var('k', '1..4'), var('t', '1..4')],
    ['Le trait va d\'un sommet à l\'autre, il borde le rectangle : c\'est un ' + col('côté')
     + ', le côté $' + selon('t', ['[AB]', '[BC]', '[CD]', '[DA]']) + '$.'])

CENTRE = variation(
    'Le point $O$ est … du cercle.\n\n'
    '```figure\nfenetre: 0 ; 10 ; 0 ; 7\ndescription: Un cercle et un point O.\n---\n'
    'o = point({{if:x==1|4|{{if:x==2|5|6}}}}, 3.5, couleur="noir", etiquette="aucune")\n'
    'texte({{if:x==1|4.35|{{if:x==2|5.35|6.35}}}}, 3.75, "O")\n'
    'r = cercle(o, rayon={{if:r==1|2|{{if:r==2|2.5|2.8}}}}, couleur="noir", epaisseur=2)\n```'
    + choix(['le centre', 'le milieu', 'un sommet', 'un côté']),
    ['0'], [var('x', '1..3'), var('r', '1..3')],
    ['Tous les points du cercle sont à la même distance de $O$ : $O$ est le ' + col('centre')
     + ' du cercle.'])

def au_dessus(k, presets, lettres, ecart=0.55):
    """Lettres posées au-dessus du trait (normale vers le haut) : points 0, 1, puis milieu."""
    lignes = []
    for s, lettre in enumerate(lettres):
        xs, ys = [], []
        for (x0, y0), (x1, y1) in presets:
            dx, dy = x1 - x0, y1 - y0
            n = math.hypot(dx, dy)
            nx, ny = -dy / n, dx / n
            if ny < 0:
                nx, ny = -nx, -ny
            x, y = [(x0, y0), (x1, y1), ((x0 + x1) / 2, (y0 + y1) / 2)][s]
            xs.append(round(x + ecart * nx, 2))
            ys.append(round(y + ecart * ny - 0.1, 2))
        lignes.append(f'texte({selon(k, xs)}, {selon(k, ys)}, "{lettre}")')
    return lignes


SEGMENTS = [centre([(0, 0), (6, 0)]), centre(tourne([(0, 0), (6, 0)], 20)),
            centre(tourne([(0, 0), (5.6, 0)], 145)), centre(tourne([(0, 0), (5, 0)], 60))]

MILIEU = variation(
    'Le point $M$ est … du segment $[AB]$.\n\n'
    '```figure\nfenetre: 0 ; 10 ; 0 ; 7\ndescription: Un segment AB et un point M codé.\n---\n'
    + '\n'.join(f'{nom} = point({x}, {y}, couleur="noir", etiquette="aucune")'
                for nom, (x, y) in zip('ab', coords('k', SEGMENTS)))
    + '\nm = milieu(a, b, couleur="noir", etiquette="aucune")\n'
    's = segment(a, b, couleur="noir", epaisseur=2)\n'
    'marque_segment(a, m)\nmarque_segment(m, b)\n'
    + '\n'.join(au_dessus('k', SEGMENTS, 'ABM'))
    + '\n```' + choix(['le milieu', 'un sommet', 'une droite']),
    ['0'], [var('k', '1..4')],
    ['Les petits traits disent que $AM$ et $MB$ ont la même longueur, et $M$ est sur le segment :'
     ' $M$ est le ' + col('milieu') + ' de $[AB]$.'])

DROITES = [centre(tourne([(0, 0), (4, 0)], r)) for r in (10, 35, 150, 70)]

DROITE_OU_SEGMENT = variation(
    'Le trait qui passe par $A$ et $B$ est …\n\n'
    '```figure\nfenetre: 0 ; 10 ; 0 ; 7\ndescription: Deux points A et B et un trait.\n---\n'
    + '\n'.join(f'{nom} = point({x}, {y}, couleur="noir", etiquette="aucune")'
                for nom, (x, y) in zip('ab', coords('k', DROITES)))
    + '\nl = {{if:s==0|segment|droite}}(a, b, couleur="noir", epaisseur=2)\n'
    + '\n'.join(au_dessus('k', DROITES, 'AB'))
    + '\n```' + choix(['un segment', 'une droite'], melanger=False),
    ['{{s}}'], [var('k', '1..4'), var('s', '0..1')],
    ['{{if:s==0|Le trait s\'arrête en $A$ et en $B$ : c\'est un segment, on écrit $[AB]$.'
     '|Le trait ne s\'arrête pas en $A$ ni en $B$, il continue des deux côtés : c\'est une'
     ' droite, on écrit $(AB)$.}}'])

SPECS_MOT = [
    spec('Sommet', 0, {'k': 1, 'v': 2}, '0', 'correct'),
    spec('Erreur : sommet pris pour un côté', 0, {'k': 1, 'v': 2}, '1', 'incorrect'),
    spec('Côté', 1, {'k': 2, 't': 3}, '0', 'correct'),
    spec('Erreur : côté pris pour un angle', 1, {'k': 2, 't': 3}, '2', 'incorrect'),
    spec('Centre', 2, {'x': 2, 'r': 1}, '0', 'correct'),
    spec('Erreur : centre pris pour le milieu', 2, {'x': 2, 'r': 1}, '1', 'incorrect'),
    spec('Milieu', 3, {'k': 3}, '0', 'correct'),
    spec('Erreur : milieu pris pour un sommet', 3, {'k': 3}, '1', 'incorrect'),
    spec('Segment', 4, {'k': 1, 's': 0}, '0', 'correct'),
    spec('Erreur : segment pris pour une droite', 4, {'k': 1, 's': 0}, '1', 'incorrect'),
    spec('Droite', 4, {'k': 2, 's': 1}, '1', 'correct'),
    spec('Erreur : droite prise pour un segment', 4, {'k': 2, 's': 1}, '0', 'incorrect'),
]

# 07. Décrire la figure (CE1-105)

NOMS_FIG = ['carré', 'rectangle', 'triangle rectangle', 'triangle']

QUADRIS_DECRITS = [CARRES[2], CARRES[0], CARRES[3], RECTANGLES[1], RECTANGLES[2],
                   RECTANGLES[4]]
TRIS_DECRITS = TRI_RECTS[:3] + TRI_ISOS[:3]

ANGLES_DROITS_QUADRI = variation(
    'Combien d\'angles droits a ce {{if:k<=3|carré|rectangle}} ?\n\n'
    + polygone('k', QUADRIS_DECRITS, 'Un carré ou un rectangle.') + '\n\n$?$',
    ['4'], [VAR_COULEUR, var('k', '1..6')],
    ['Un {{if:k<=3|carré|rectangle}} a $4$ sommets, et en chacun un angle droit : $'
     + col('4') + '$ angles droits.'])

ANGLES_DROITS_TRI = variation(
    'Combien d\'angles droits a ce {{if:k<=3|triangle rectangle|triangle}} ?\n\n'
    + polygone('k', TRIS_DECRITS, 'Un triangle.') + '\n\n$?$',
    ['{{a}}'], [VAR_COULEUR, var('k', '1..6'), var('a', '{{if:k<=3|1|0}}')],
    ['{{if:k<=3|Un triangle rectangle a un seul angle droit : $' + col('1') + '$.'
     '|Ce triangle n\'a aucun angle droit : $' + col('0') + '$. Ce n\'est pas un triangle'
     ' rectangle.}}'])

QUI_SUIS_JE = variation(
    'Qui suis-je ?\n\n_'
    + selon('q', ['J\'ai $4$ côtés et $4$ angles droits. Mes côtés ne sont pas tous de la même'
                  ' longueur.',
                  'J\'ai $3$ côtés et un angle droit.',
                  'J\'ai $4$ côtés de la même longueur et $4$ angles droits.',
                  'Je n\'ai ni côté ni sommet. Tous mes points sont à la même distance de mon'
                  ' centre.'])
    + '_' + choix(['Je suis un rectangle.', 'Je suis un triangle rectangle.', 'Je suis un carré.',
                   'Je suis un cercle.']),
    ['{{w}}'], [var('q', '1..4'), var('w', 'eval:q-1')],
    [selon('q', ['C\'est un ' + col('rectangle') + ' : $4$ angles droits, deux grands côtés et'
                 ' deux petits.',
                 'C\'est un ' + col('triangle rectangle') + ' : $3$ côtés, un angle droit.',
                 'C\'est un ' + col('carré') + ' : $4$ côtés de la même longueur, $4$ angles'
                 ' droits.',
                 'C\'est un ' + col('cercle') + '.'])])

SPECS_DECRIRE = [
    spec('Carré : 4 angles droits', 0, {'c': 1, 'k': 2}, '4', 'correct'),
    spec('Rectangle : 4 angles droits', 0, {'c': 2, 'k': 5}, '4', 'correct'),
    spec('Erreur : 2 (les grands côtés)', 0, {'c': 2, 'k': 5}, '2', 'incorrect'),
    spec('Triangle rectangle : 1', 1, {'c': 3, 'k': 2}, '1', 'correct'),
    spec('Erreur : 3 (les sommets comptés)', 1, {'c': 3, 'k': 2}, '3', 'incorrect'),
    spec('Triangle : 0', 1, {'c': 4, 'k': 5}, '0', 'correct'),
    spec('Rectangle', 2, {'q': 1}, '0', 'correct'),
    spec('Erreur : rectangle pris pour un carré', 2, {'q': 1}, '2', 'incorrect'),
    spec('Triangle rectangle', 2, {'q': 2}, '1', 'correct'),
    spec('Cercle', 2, {'q': 4}, '3', 'correct'),
]

# 08. Le code de l'angle droit (CE1-075)

SIGNIFIE = variation(
    'Que veut dire le petit carré dessiné dans un coin de ce triangle ?\n\n'
    '```figure\nfenetre: 0 ; 10 ; 0 ; 7\ndescription: Un triangle, un coin codé.\n---\n'
    + '\n'.join(points('k', TRI_RECTS)) + '\n'
    + f'q = polygone(a, b, c, {COULEUR}, epaisseur=2)\n'
    + 'g = angle(b, a, c, marque="carre", couleur="noir")\n```'
    + choix(['L\'angle est droit.', 'Les deux côtés ont la même longueur.',
             'L\'angle est aigu.', 'Le coin est le milieu du triangle.']),
    ['0'], [VAR_COULEUR, var('k', '1..6')],
    ['Le petit carré est le ' + col('code de l\'angle droit') + ' : il dit que l\'angle est'
     ' droit, sans avoir à le vérifier avec l\'équerre.'])

# quadrilatère à un seul angle droit (en p0), les autres à 20° au moins de l'angle droit
QUADRI = [(0, 0), (4.5, 0), (3, 2.2), (0, 3.5)]
assert abs(angle_en(QUADRI, 0) - 90) < 1e-6
assert all(abs(angle_en(QUADRI, s) - 90) >= 20 for s in (1, 2, 3)), [angle_en(QUADRI, s)
                                                                      for s in range(4)]
QUADRIS = [centre(tourne(QUADRI, r)) for r in (0, 70, 160, 250)]
LETTRES = 'ABCD'
# position k : l'angle droit porte la lettre LETTRES[k-1] ; lettres dans le sens du tracé
QUEL_SOMMET = variation(
    'Sur cette figure, un angle droit est codé. À quel sommet ?\n\n'
    '```figure\nfenetre: 0 ; 10 ; 0 ; 7\ndescription: Un quadrilatère ABCD, un angle codé.\n---\n'
    + '\n'.join(f'{nom} = point({x}, {y}, couleur="noir", etiquette="aucune")'
                for nom, (x, y) in zip('abcd', coords('k', QUADRIS)))
    + f'\nq = polygone(a, b, c, d, {COULEUR}, epaisseur=2)\n'
    + 'g = angle(d, a, b, marque="carre", couleur="noir")\n'
    + '\n'.join(
        f'texte({x}, {y}, "{selon("k", [LETTRES[(s - k) % 4] for k in range(4)])}")'
        for s, (x, y) in enumerate(
            (lambda L: [(selon('k', [t[s][0] for t in L]), selon('k', [t[s][1] for t in L]))
                        for s in range(4)])(
                [[(round(x + 0.5 * (x - sum(q[0] for q in p) / 4)
                        / math.hypot(x - sum(q[0] for q in p) / 4, y - sum(q[1] for q in p) / 4),
                        2),
                   round(y + 0.5 * (y - sum(q[1] for q in p) / 4)
                         / math.hypot(x - sum(q[0] for q in p) / 4,
                                      y - sum(q[1] for q in p) / 4) - 0.15, 2))
                  for x, y in p] for p in QUADRIS])))
    + '\n```' + choix(['Au sommet $A$.', 'Au sommet $B$.', 'Au sommet $C$.', 'Au sommet $D$.'],
                      melanger=False),
    ['{{w}}'], [VAR_COULEUR, var('k', '1..4'), var('w', 'eval:mod(4-(k-1),4)')],
    ['Le petit carré est dans le coin du sommet $' + col(
        selon('k', [LETTRES[(0 - k) % 4] for k in range(4)])) + '$ : c\'est là que l\'angle est'
     ' droit.'])

# combien d'angles droits codés : trapèze rectangle (2), pentagone « rectangle coupé » (3)
TRAPEZE = [(0, 0), (5, 0), (3.2, 3), (0, 3)]
COUPE = [(0, 0), (5, 0), (5, 2), (3.2, 3.5), (0, 3.5)]
assert [round(angle_en(TRAPEZE, s)) for s in range(4)].count(90) == 2
assert [round(angle_en(COUPE, s)) for s in range(5)].count(90) == 3
assert all(abs(angle_en(COUPE, s) - 90) >= 20 for s in (2, 3))
TRAPEZES = [centre(tourne(TRAPEZE, r)) for r in (0, 40, 180, 300)]
COUPES = [centre(tourne(COUPE, r)) for r in (0, 30, 200, 160)]


def codes(noms, droits):
    n = len(noms)
    return '\n'.join(f'g{s} = angle({noms[s - 1]}, {noms[s]}, {noms[(s + 1) % n]}, '
                     'marque="carre", couleur="noir")' for s in droits)


COMBIEN_TRAPEZE = variation(
    'Combien d\'angles droits sont codés sur cette figure ?\n\n'
    '```figure\nfenetre: 0 ; 10 ; 0 ; 7\ndescription: Une figure à quatre côtés, des angles codés.'
    '\n---\n' + '\n'.join(points('k', TRAPEZES)) + '\n'
    + f'q = polygone(a, b, c, d, {COULEUR}, epaisseur=2)\n' + codes('abcd', [0, 3]) + '\n```'
    + '\n\n$?$',
    ['2'], [VAR_COULEUR, var('k', '1..4')],
    ['On compte les petits carrés : il y en a $' + col('2') + '$. Les deux autres angles ne sont'
     ' pas codés : ils ne sont pas droits.'])

COMBIEN_COUPE = variation(
    'Combien d\'angles droits sont codés sur cette figure ?\n\n'
    '```figure\nfenetre: 0 ; 10 ; 0 ; 7\ndescription: Une figure à cinq côtés, des angles codés.'
    '\n---\n' + '\n'.join(points('k', COUPES)) + '\n'
    + f'q = polygone(a, b, c, d, f, {COULEUR}, epaisseur=2)\n'
    + codes('abcdf', [0, 1, 4]) + '\n```' + '\n\n$?$',
    ['3'], [VAR_COULEUR, var('k', '1..4')],
    ['On compte les petits carrés : il y en a $' + col('3') + '$.'])

SPECS_CODE = [
    spec('Angle droit', 0, {'c': 1, 'k': 3}, '0', 'correct'),
    spec('Erreur : côtés de même longueur', 0, {'c': 1, 'k': 3}, '1', 'incorrect'),
    spec('Code au sommet A (k = 1)', 1, {'c': 2, 'k': 1}, '0', 'correct'),
    spec('Code au sommet D (k = 2)', 1, {'c': 2, 'k': 2}, '3', 'correct'),
    spec('Erreur : sommet voisin', 1, {'c': 2, 'k': 2}, '0', 'incorrect'),
    spec('Code au sommet B (k = 4)', 1, {'c': 3, 'k': 4}, '1', 'correct'),
    spec('Trapèze : 2 codés', 2, {'c': 3, 'k': 2}, '2', 'correct'),
    spec('Erreur : 4 (tous les coins)', 2, {'c': 3, 'k': 2}, '4', 'incorrect'),
    spec('Rectangle coupé : 3 codés', 3, {'c': 4, 'k': 1}, '3', 'correct'),
    spec('Erreur : 5 (tous les coins)', 3, {'c': 4, 'k': 1}, '5', 'incorrect'),
]

# 09. Droit, aigu ou obtus ? (CE1-087) — sommets et extrémités sur les nœuds du quadrillage

DIRS = [(4, 0), (0, 4), (3, 3), (-3, 3), (4, 1), (1, 4), (-1, 4), (-4, 1), (4, 2), (2, 4),
        (-2, 4), (-4, 2), (4, -1), (4, -2), (3, -3), (1, -4), (-4, 0), (0, -4)]


def ecart(u, v):
    a = math.degrees(math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1]))
    return abs(a)


def place(u, v):
    """Sommet entier tel que les trois points tiennent dans la fenêtre, figure centrée."""
    xs, ys = [0, u[0], v[0]], [0, u[1], v[1]]
    vx = round(W / 2 - (min(xs) + max(xs)) / 2)
    vy = round(H / 2 - (min(ys) + max(ys)) / 2)
    pts = [(vx, vy), (vx + u[0], vy + u[1]), (vx + v[0], vy + v[1])]
    assert all(1 <= x <= W - 1 and 1 <= y <= H - 1 for x, y in pts), pts
    return pts


def angles_de(classe):
    out = []
    for u in DIRS:
        for v in DIRS:
            a = ecart(u, v)
            ok = {'droit': abs(a - 90) < 1e-9, 'aigu': 25 <= a <= 70,
                  'obtus': 110 <= a <= 155}[classe]
            hauteur = max(0, u[1], v[1]) - min(0, u[1], v[1])
            largeur = max(0, u[0], v[0]) - min(0, u[0], v[0])
            if ok and hauteur <= 5 and largeur <= 8 and (v, u) not in [(p[1], p[0]) for p in out]:
                out.append((u, v))
    return out


def choisis(classe, nombre):
    tous = angles_de(classe)
    pas = max(1, len(tous) // nombre)
    return [place(u, v) for u, v in tous[::pas][:nombre]]


DROITS = choisis('droit', 8)
AIGUS = choisis('aigu', 8)
OBTUS = choisis('obtus', 8)
for groupe, test in ((DROITS, lambda a: abs(a - 90) < 1e-9), (AIGUS, lambda a: a <= 70),
                     (OBTUS, lambda a: a >= 110)):
    assert len(groupe) == 8
    for vv, p, q in groupe:
        assert test(ecart((p[0] - vv[0], p[1] - vv[1]), (q[0] - vv[0], q[1] - vv[1])))
# au moins un angle droit tourné (côtés hors des lignes du quadrillage)
assert any(p[0] != vv[0] and p[1] != vv[1] for vv, p, q in DROITS)


def angle_quadrillage(presets):
    return ('```figure\nfenetre: 0 ; 10 ; 0 ; 7\ngrille: oui\ndescription: Un angle tracé sur'
            ' un quadrillage.\n---\n' + '\n'.join(points('k', presets, 'vpq')) + '\n'
            + f's1 = segment(v, p, {COULEUR}, epaisseur=2)\n'
            + f's2 = segment(v, q, {COULEUR}, epaisseur=2)\n'
            + 'g = angle(p, v, q, couleur="noir")\n```')


CHOIX_ANGLE = choix(['L\'angle est droit.', 'L\'angle est aigu.', 'L\'angle est obtus.'],
                    melanger=False)


def angle_variation(presets, reponse, etape):
    return variation('Cet angle est-il droit, aigu ou obtus ?\n\n' + angle_quadrillage(presets)
                     + CHOIX_ANGLE, [reponse], [VAR_COULEUR, var('k', '1..8')], [etape])


ANGLE_DROIT = angle_variation(
    DROITS, '0', 'L\'angle est ' + col('droit') + ' : le coin de l\'équerre s\'y pose juste'
    ' (les côtés suivent les carreaux, ou leurs diagonales).')
ANGLE_AIGU = angle_variation(
    AIGUS, '1', 'L\'angle est ' + col('aigu') + ' : il est plus fermé que le coin de l\'équerre.')
ANGLE_OBTUS = angle_variation(
    OBTUS, '2', 'L\'angle est ' + col('obtus') + ' : il est plus ouvert que le coin de'
    ' l\'équerre.')

SPECS_ANGLE = [
    spec('Droit', 0, {'c': 1, 'k': 1}, '0', 'correct'),
    spec('Erreur : droit pris pour aigu', 0, {'c': 1, 'k': 1}, '1', 'incorrect'),
    spec('Aigu', 1, {'c': 2, 'k': 3}, '1', 'correct'),
    spec('Erreur : aigu pris pour obtus', 1, {'c': 2, 'k': 3}, '2', 'incorrect'),
    spec('Obtus', 2, {'c': 3, 'k': 5}, '2', 'correct'),
    spec('Erreur : obtus pris pour droit', 2, {'c': 3, 'k': 5}, '0', 'incorrect'),
]

# ---- Fichiers ----

FR, APP, PARTAGE = 'Fractions', 'Apprivoiser', 'Partage'
GEO, FIG = 'Géométrie', 'Figures planes'

MODELES = {
    '01-quelle-part-unitaire': modele(
        'Quelle part de la figure est coloriée ? Fractions unitaires',
        'Une part coloriée d\'une bande, d\'un disque, d\'une grille ou d\'un carré en quatre'
        ' triangles ; dénominateurs 2, 3, 4, 5, 6, 8, 10', FR, APP, PARTAGE, 5,
        [UNE_PART_BD, UNE_PART_GRILLE, UNE_PART_CARRE], SPECS_UNE_PART, FRACTIONS),
    '02-quelle-part': modele(
        'Quelle fraction de la figure est coloriée ? Jusqu\'à 1',
        'Plusieurs parts coloriées, à la suite ou éparpillées ; toute la figure (d/d ou 1)',
        FR, APP, PARTAGE, 6, [PLUSIEURS_BD, PLUSIEURS_EPARPILLEES, TOUTE], SPECS_PLUSIEURS,
        FRACTIONS),
    '03-colorie-une-part': modele(
        'Colorie une fraction unitaire de la figure',
        'Colorier 1/2 à 1/10 d\'une bande, d\'un disque ou d\'une grille', FR, APP, PARTAGE, 7,
        [COLORIE_UNE_BD, COLORIE_UNE_GRILLE], SPECS_COLORIE_UNE, FRACTIONS),
    '04-colorie-la-fraction': modele(
        'Colorie une fraction de la figure, jusqu\'à 1',
        'Colorier n/d (n ≤ d) d\'une bande, d\'un disque ou d\'une grille', FR, APP, PARTAGE, 8,
        [COLORIE_BD, COLORIE_GRILLE], SPECS_COLORIE, FRACTIONS),
    '05-quelle-est-cette-figure': modele(
        'Quelle est cette figure ? Cercle, carré, rectangle, triangles',
        'Nommer un cercle, un carré penché, un rectangle, un triangle rectangle tourné, un'
        ' triangle', GEO, FIG, 'Reconnaître et nommer des formes', 3,
        [CERCLE, CARRE, RECTANGLE, TRI_RECT, TRIANGLE], SPECS_FIGURE),
    '06-le-bon-mot': modele(
        'Le bon mot : sommet, côté, centre, milieu, droite, segment',
        'Nommer un élément montré sur une figure', GEO, FIG, 'Propriétés', 4,
        [SOMMET, COTE, CENTRE, MILIEU, DROITE_OU_SEGMENT], SPECS_MOT),
    '07-decrire-la-figure': modele(
        'Décrire une figure : côtés et angles droits',
        'Combien d\'angles droits a un carré, un rectangle, un triangle rectangle, un triangle ;'
        ' qui suis-je ?', GEO, FIG, 'Propriétés', 5,
        [ANGLES_DROITS_QUADRI, ANGLES_DROITS_TRI, QUI_SUIS_JE], SPECS_DECRIRE),
    '08-le-code-de-l-angle-droit': modele(
        'Le code de l\'angle droit',
        'Ce que veut dire le petit carré ; à quel sommet ; combien d\'angles droits codés',
        GEO, FIG, 'Angles', 1, [SIGNIFIE, QUEL_SOMMET, COMBIEN_TRAPEZE, COMBIEN_COUPE],
        SPECS_CODE),
    '09-droit-aigu-obtus': modele(
        'Angle droit, aigu ou obtus ?',
        'Un angle sur quadrillage, droit (aussi tourné), aigu ou obtus, loin de l\'angle droit',
        GEO, FIG, 'Angles', 2, [ANGLE_DROIT, ANGLE_AIGU, ANGLE_OBTUS], SPECS_ANGLE),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
