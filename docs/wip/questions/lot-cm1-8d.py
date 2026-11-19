"""Écrit les 4 modèles du lot 8d du CM1 (figures à compléter) dans scripts/questions/cm1-8d/.

Phase 0 validée par David le 2026-11-18 (§ 24 et 24 bis du journal
`docs/archive/wip/questions-cm1-progress.md`, « je suis tes recos ») : 4 modèles en case « figure »
(` ```figure-a-completer `), tous sur quadrillage ; 107, 108 en CM1 seul (le CM2-097 ajoute l'axe
en diagonale) ; 167, 168 en CM1 et CM2 (jumeaux CM2-154, 155) ; 107 écrit pour le CM1 (pas de CM1
ajouté au modèle CE2 `49b8dc0b`).

Bornes (`cycle3.json`) : 107 axe horizontal ou vertical, quadrillé ; 108 quadrillé, axe H ou V qui
ne coupe pas la figure (point, segment, triangle) ; 167, 168 « à l'équerre » : le juge ne sait
juger une perpendiculaire ou une parallèle par un point que sur quadrillage (`assertLines`), où
l'équerre est proposée sans être exigée.

Patrons : CE2 `ce2-8/09` (compléter par symétrie), 5e `5-symetrie-aires-solides/02` (point à
placer), 5e `5-triangles/08` (droite à l'équerre sur quadrillage).

Le script vérifie chaque figure : nœuds du quadrillage dans la fenêtre, figure d'un seul côté de
l'axe (collée à l'axe au 107, à 1 à 4 carreaux au 108), symétrique dans la fenêtre, droite attendue
par deux nœuds de la fenêtre au moins.

    python3 docs/wip/questions/lot-cm1-8d.py scripts/questions/cm1-8d
"""
import json
import os
import sys

DOSSIER = sys.argv[1]
MODELES = {}

# ---- Gabarits ----


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(enonce, variables, etapes):
    return {'statement': enonce, 'variables': variables, 'correction': {'steps': etapes}}


def modele(title, description, niveau, variations, specs, grades, delay):
    return {'title': title, 'description': description, 'grades': list(grades), 'level': niveau,
            'delay': delay, 'status': 'draft', 'variations': variations, 'testSpecs': specs}


def spec(desc, vi, k, answer, status):
    return {'description': desc, 'variationIndex': vi, 'variables': {'k': str(k)},
            'answers': [answer], 'expected': {'status': status}}


def imbrique(branches):
    """{{if:k==1|b1|{{if:k==2|b2|b3}}}} ; aucun « | » dans une branche."""
    for b in branches:
        assert '|' not in b, b
    if len(branches) == 1:
        return branches[0]
    texte = branches[-1]
    for i in range(len(branches) - 1, 0, -1):
        texte = '{{if:k==' + str(i) + '|' + branches[i - 1] + '|' + texte + '}}'
    return texte


def num(x):
    return str(int(x)) if x == int(x) else str(x)


def seg_txt(a, b):
    return f'segment({num(a[0])};{num(a[1])};{num(b[0])};{num(b[1])})'


def polyligne_reponse(pts):
    return '|'.join(seg_txt(pts[i], pts[i + 1]) for i in range(len(pts) - 1))


def polygone_reponse(pts):
    return polyligne_reponse(pts + [pts[0]])


def dans(p, fen):
    x0, x1, y0, y1 = fen
    return x0 <= p[0] <= x1 and y0 <= p[1] <= y1


def miroir(p, axe):
    sens, c = axe
    return (2 * c - p[0], p[1]) if sens == 'V' else (p[0], 2 * c - p[1])


def distance_axe(p, axe):
    sens, c = axe
    return p[0] - c if sens == 'V' else p[1] - c


def axe_figure(axe, fen):
    """Axe d en tirets rouges, nommé près de son bout haut (V) ou droit (H)."""
    sens, c = axe
    x0, x1, y0, y1 = fen
    if sens == 'V':
        return (f'm = point({c}, {y0}, visible=faux)\nn = point({c}, {y1}, visible=faux)\n'
                f'texte({c + 0.4}, {y1 - 0.4}, "d")\n'
                'd = droite(m, n, trait="tirets", couleur="rouge")\n')
    return (f'm = point({x0}, {c}, visible=faux)\nn = point({x1}, {c}, visible=faux)\n'
            f'texte({x1 - 0.5}, {c + 0.4}, "d")\n'
            'd = droite(m, n, trait="tirets", couleur="rouge")\n')


def traits(pts, ferme=False):
    lignes = [f'p{i} = point({num(p[0])}, {num(p[1])}, visible=faux)' for i, p in enumerate(pts)]
    n = len(pts)
    paires = [(i, i + 1) for i in range(n - 1)] + ([(n - 1, 0)] if ferme else [])
    lignes += [f's{j} = segment(p{a}, p{b}, epaisseur=3)' for j, (a, b) in enumerate(paires)]
    return '\n'.join(lignes)


def place(forme, axe, cote):
    """forme en (u, v) : u = distance à l'axe (≥ 0), v = position le long de l'axe."""
    sens, c = axe
    if sens == 'V':
        return [(c + cote * u, v) for u, v in forme]
    return [(v, c + cote * u) for u, v in forme]


def glisse(pts, axe, cote):
    """Erreur typique : la figure recopiée de l'autre côté sans être retournée."""
    sens, _ = axe
    largeur = max(abs(distance_axe(p, axe)) for p in pts)
    dx = -cote * largeur
    return [(p[0] + dx, p[1]) if sens == 'V' else (p[0], p[1] + dx) for p in pts]


# ============================================================================
# 01 — CM1-107 : compléter une figure pour la rendre symétrique (axe H ou V)
# ============================================================================

# Demi-figures collées à l'axe (premier et dernier sommet sur l'axe), en (u, v)
DEMI = [
    ('une fusée', [(0, 1), (3, 1), (3, 4), (1, 6), (0, 8)]),
    ('un vase', [(0, 1), (2, 2), (4, 2), (4, 5), (2, 6), (0, 9)]),
    ('un papillon', [(0, 2), (4, 1), (3, 4), (5, 6), (2, 7), (0, 9)]),
    ('un château', [(0, 1), (4, 1), (4, 6), (3, 6), (3, 4), (1, 5), (0, 8)]),
    ('une feuille', [(0, 1), (3, 2), (5, 4), (4, 6), (2, 7), (0, 9)]),
]

ENONCE_107 = 'Complète la figure pour qu\'elle soit symétrique par rapport à la droite $d$.'
ETAPES_107 = [
    'Chaque sommet a son symétrique de l\'autre côté de l\'axe $d$, '
    '$\\textcolor{{{color:primary.0}}}{\\text{à la même distance}}$ : on compte les carreaux '
    'jusqu\'à l\'axe, puis autant de l\'autre côté.',
    'Les sommets posés sur l\'axe sont leur propre symétrique. On relie les points dans le même '
    'ordre : la figure est $\\textcolor{{{color:primary.0}}}{\\text{retournée}}$ comme par un '
    'pliage le long de $d$, pas glissée.',
]


def variation_107(fen, axe, placements):
    """placements : liste de (indice de la demi-figure, côté ±1) ; une branche par tirage."""
    branches, cas = [], []
    for i, cote in placements:
        nom, forme = DEMI[i]
        pts = place(forme, axe, cote)
        image = [miroir(p, axe) for p in pts]
        for p in pts + image:
            assert dans(p, fen), (nom, p, fen)
        bouts = [abs(distance_axe(pts[0], axe)), abs(distance_axe(pts[-1], axe))]
        assert bouts == [0, 0], nom
        assert all(cote * distance_axe(p, axe) >= 0 for p in pts), nom
        branches.append(traits(pts))
        cas.append((nom, pts, image))
    enonce = (ENONCE_107 + '\n\n```figure-a-completer\n'
              f'fenetre: {fen[0]} ; {fen[1]} ; {fen[2]} ; {fen[3]}\ngrille: 1\n'
              'verifier: symetrique par d\n---\n' + axe_figure(axe, fen) + imbrique(branches) + '\n```')
    v = variation(enonce, [var('k', f'1..{len(placements)}')], ETAPES_107)
    return v, cas


FEN_V = (0, 14, 0, 10)
FEN_H = (0, 14, 0, 12)
FEN_D = (0, 16, 0, 10)

V1, CAS1 = variation_107(FEN_V, ('V', 7), [(0, -1), (1, 1), (2, -1), (3, 1), (4, -1)])
# Axe horizontal : v devient l'abscisse, décalée de 2 pour centrer la figure
DEMI_H = [(nom, [(u, v + 2) for u, v in forme]) for nom, forme in DEMI]
DEMI_SAUVE = DEMI
DEMI = DEMI_H
V2, CAS2 = variation_107(FEN_H, ('H', 6), [(0, 1), (1, -1), (2, 1), (3, -1), (4, 1)])
DEMI = DEMI_SAUVE
# Axe décalé : à 6 carreaux du bord gauche, la figure à droite, son symétrique à gauche
V3, CAS3 = variation_107(FEN_D, ('V', 6), [(0, 1), (1, 1), (2, 1), (3, 1), (4, 1)])

vs = [V1, V2, V3]
specs = []
for vi, (cas, axe) in enumerate([(CAS1, ('V', 7)), (CAS2, ('H', 6)), (CAS3, ('V', 6))]):
    for k, (nom, pts, image) in enumerate(cas, start=1):
        specs.append(spec(f'V{vi + 1}, {nom} : juste', vi, k, polyligne_reponse(image), 'correct'))
    nom, pts, image = cas[0]
    cote = 1 if distance_axe(max(pts, key=lambda p: abs(distance_axe(p, axe))), axe) > 0 else -1
    specs.append(spec(f'Erreur V{vi + 1} : {nom} glissée', vi, 1,
                      polyligne_reponse(glisse(pts, axe, cote)), 'incorrect'))
    specs.append(spec(f'Erreur V{vi + 1} : {nom}, symétrique incomplet', vi, 1,
                      polyligne_reponse(image[:-1]), 'incorrect'))

MODELES['01-completer-une-figure-symetrique'] = modele(
    'Compléter une figure pour la rendre symétrique',
    'Sur quadrillage, tracer l\'autre moitié d\'une figure collée à un axe vertical ou horizontal,'
    ' aux côtés obliques ; axe au milieu ou décalé',
    1, vs, specs, grades=('CM1',), delay=240)

# ============================================================================
# 02 — CM1-108 : construire le symétrique d'une figure (axe qui ne la coupe pas)
# ============================================================================

FEN = (0, 14, 0, 10)
ETAPES_108 = [
    'Chaque point et son symétrique sont $\\textcolor{{{color:primary.0}}}{\\text{à la même '
    'distance}}$ de l\'axe $d$, de part et d\'autre, sur une même ligne du quadrillage '
    'perpendiculaire à $d$ : on compte les carreaux jusqu\'à l\'axe, puis autant de l\'autre côté.',
    'On relie les symétriques des sommets dans le même ordre : la figure est retournée, pas '
    'glissée.',
]

# V1 — un point : (axe, A, étiquette)
POINTS = [
    (('V', 7), (4, 6), 'gauche'), (('V', 6), (9, 3), 'droite'), (('V', 8), (6, 7), 'gauche'),
    (('H', 5), (5, 8), 'haut'), (('H', 6), (9, 3), 'bas'), (('H', 4), (3, 5), 'haut'),
]
branches, cas1 = [], []
for axe, a, etiq in POINTS:
    image = miroir(a, axe)
    assert 1 <= abs(distance_axe(a, axe)) <= 4 and dans(a, FEN) and dans(image, FEN), (axe, a)
    branches.append(axe_figure(axe, FEN) + f'A = point({a[0]}, {a[1]}, etiquette="{etiq}")')
    cas1.append((axe, a, image))
V1 = variation(
    'Place le point $A\'$, symétrique du point $A$ par rapport à la droite $d$.\n\n'
    '```figure-a-completer\nfenetre: 0 ; 14 ; 0 ; 10\ngrille: 1\noutils: point\n'
    'verifier: point A\' = symetrie(A, axe=d)\n---\n' + imbrique(branches) + '\n```',
    [var('k', f'1..{len(POINTS)}')],
    [
        'On compte les carreaux de $A$ jusqu\'à l\'axe $d$, en allant tout droit vers l\'axe '
        '(perpendiculairement à $d$).',
        'On en compte $\\textcolor{{{color:primary.0}}}{\\text{autant}}$ de l\'autre côté de $d$, '
        'sur la même ligne : c\'est le point $A\'$.'])

# V2 — un segment ; V3 — un triangle : (axe, sommets)
SEGMENTS = [
    (('V', 7), [(2, 2), (5, 7)]), (('V', 6), [(8, 8), (11, 3)]), (('V', 8), [(4, 1), (6, 5)]),
    (('H', 5), [(3, 6), (10, 9)]), (('H', 5), [(4, 3), (11, 1)]), (('H', 6), [(2, 2), (7, 4)]),
]
TRIANGLES = [
    (('V', 7), [(2, 2), (5, 4), (3, 8)]), (('V', 6), [(8, 2), (11, 5), (9, 8)]),
    (('V', 8), [(3, 7), (6, 2), (6, 6)]),
    (('H', 5), [(3, 6), (9, 7), (5, 9)]), (('H', 5), [(4, 1), (11, 2), (8, 3)]),
    (('H', 5), [(2, 7), (6, 9), (10, 6)]),
]


def variation_108(enonce, catalogue, ferme):
    branches, cas = [], []
    for axe, pts in catalogue:
        image = [miroir(p, axe) for p in pts]
        dists = [distance_axe(p, axe) for p in pts]
        assert all(d > 0 for d in dists) or all(d < 0 for d in dists), (axe, pts)
        assert 1 <= min(abs(d) for d in dists) <= 4, (axe, pts)
        for p in pts + image:
            assert dans(p, FEN), (axe, p)
        branches.append(axe_figure(axe, FEN) + traits(pts, ferme))
        cas.append((axe, pts, image))
    v = variation(
        enonce + '\n\n```figure-a-completer\nfenetre: 0 ; 14 ; 0 ; 10\ngrille: 1\n'
        'verifier: symetrique par d\n---\n' + imbrique(branches) + '\n```',
        [var('k', f'1..{len(catalogue)}')], ETAPES_108)
    return v, cas


V2, cas2 = variation_108('Construis le symétrique du segment par rapport à la droite $d$.',
                         SEGMENTS, False)
V3, cas3 = variation_108('Construis le symétrique du triangle par rapport à la droite $d$.',
                         TRIANGLES, True)


def point_txt(p):
    return f'point({num(p[0])};{num(p[1])})'


vs = [V1, V2, V3]
specs = []
for k, (axe, a, image) in enumerate(cas1, start=1):
    specs.append(spec(f'V1 point {k} : juste', 0, k, point_txt(image), 'correct'))
axe, a, image = cas1[0]
# Erreurs : décalé d'un carreau le long de l'axe ; un carreau trop près de l'axe
decale = (image[0], image[1] + 1) if axe[0] == 'V' else (image[0] + 1, image[1])
specs.append(spec('Erreur V1 : décalé le long de l\'axe', 0, 1, point_txt(decale), 'incorrect'))
# un carreau trop près de l'axe : A' recule d'un carreau vers A
vers_a = 1 if (a[0] - image[0] if axe[0] == 'V' else a[1] - image[1]) > 0 else -1
pres = (image[0] + vers_a, image[1]) if axe[0] == 'V' else (image[0], image[1] + vers_a)
specs.append(spec('Erreur V1 : un carreau trop près de l\'axe', 0, 1, point_txt(pres), 'incorrect'))
for vi, cas, rep in [(1, cas2, polyligne_reponse), (2, cas3, polygone_reponse)]:
    for k, (axe, pts, image) in enumerate(cas, start=1):
        specs.append(spec(f'V{vi + 1} figure {k} : juste', vi, k, rep(image), 'correct'))
    axe, pts, image = cas[0]
    cote = 1 if distance_axe(pts[0], axe) > 0 else -1
    # Glissée : recopiée de l'autre côté, à la même distance, sans être retournée
    dmin = min(abs(distance_axe(p, axe)) for p in pts)
    dmax = max(abs(distance_axe(p, axe)) for p in pts)
    pas = -cote * (dmin + dmax)
    glissee = [(p[0] + pas, p[1]) if axe[0] == 'V' else (p[0], p[1] + pas) for p in pts]
    for p in glissee:
        assert dans(p, FEN), ('glissée hors fenêtre', p)
    specs.append(spec(f'Erreur V{vi + 1} : figure glissée', vi, 1, rep(glissee), 'incorrect'))

MODELES['02-construire-le-symetrique'] = modele(
    'Construire le symétrique d\'une figure',
    'Sur quadrillage, axe vertical ou horizontal qui ne touche pas la figure : symétrique d\'un'
    ' point, d\'un segment, d\'un triangle',
    2, vs, specs, grades=('CM1',), delay=240)

# ============================================================================
# 03, 04 — CM1-167, 168 : perpendiculaire et parallèle par un point (quadrillage)
# ============================================================================


def nœuds_sur(a, direction, fen):
    """Nœuds du quadrillage de la fenêtre sur la droite par a de direction donnée."""
    x0, x1, y0, y1 = fen
    dx, dy = direction
    return [(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)
            if (x - a[0]) * dy - (y - a[1]) * dx == 0]


def bouts_droite(a, direction, fen):
    """Les deux nœuds extrêmes de la droite dans la fenêtre (m, n invisibles)."""
    nœuds = sorted(nœuds_sur(a, direction, fen))
    assert len(nœuds) >= 3, (a, direction)
    return nœuds[0], nœuds[-1]


def droite_txt(p, q):
    return f'droite({num(p[0])};{num(p[1])};{num(q[0])};{num(q[1])})'


FEN_L = (0, 14, 0, 10)


def figure_droite(m, n, a, etiq):
    return (f'm = point({m[0]}, {m[1]}, visible=faux)\nn = point({n[0]}, {n[1]}, visible=faux)\n'
            'd = droite(m, n)\n'
            f'texte({n[0] - 0.4 if n[0] >= 13 else n[0] + 0.4}, '
            f'{n[1] - 0.5 if n[1] >= 9 else n[1] + 0.4}, "d")\n'
            f'A = point({a[0]}, {a[1]}, etiquette="{etiq}")')


def variation_tracer(enonce, check, catalogue, etapes, perpendiculaire):
    """catalogue : (point de d, direction de d, A, étiquette de A)."""
    branches, cas = [], []
    for p0, direction, a, etiq in catalogue:
        m, n = bouts_droite(p0, direction, FEN_L)
        dx, dy = direction
        cherchee = (-dy, dx) if perpendiculaire else (dx, dy)
        assert dans(a, FEN_L)
        assert len(nœuds_sur(a, cherchee, FEN_L)) >= 3, ('droite attendue', a, cherchee)
        if not perpendiculaire:
            assert (a[0] - p0[0]) * dy - (a[1] - p0[1]) * dx != 0, ('A sur d', a)
        branches.append(figure_droite(m, n, a, etiq))
        cas.append((p0, direction, a, cherchee))
    v = variation(
        enonce + '\n\n```figure-a-completer\nfenetre: 0 ; 14 ; 0 ; 10\ngrille: 1\n'
        f'outils: droite, equerre\nverifier: {check}\n---\n' + imbrique(branches) + '\n```',
        [var('k', f'1..{len(catalogue)}')], etapes)
    return v, cas


ENONCE_167 = 'Trace la droite $p$, perpendiculaire à la droite $d$ et qui passe par le point $A$.'
CHECK_167 = 'droite p = perpendiculaire(A, d)'
ETAPES_167_HV = [
    'On pose un côté de l\'angle droit de l\'équerre le long de $d$, et on la fait glisser jusqu\'à'
    ' $A$ : l\'autre côté trace la $\\textcolor{{{color:primary.0}}}{\\text{perpendiculaire}}$.',
    'Ici $d$ suit les lignes du quadrillage : la perpendiculaire suit l\'autre sens des lignes,'
    ' et passe par $A$.',
]
ETAPES_167_OBL = [
    'On pose un côté de l\'angle droit de l\'équerre le long de $d$, et on la fait glisser jusqu\'à'
    ' $A$ : l\'autre côté trace la $\\textcolor{{{color:primary.0}}}{\\text{perpendiculaire}}$.',
    'Sur le quadrillage, on peut aussi compter : si $d$ avance de $a$ carreaux et monte de $b$,'
    ' la perpendiculaire $\\textcolor{{{color:primary.0}}}{\\text{avance de } b \\text{ et descend'
    ' de } a}$ (les deux nombres sont échangés).',
]

CAT_167 = [
    # V1 : d horizontale ou verticale, A hors de d
    [((0, 3), (1, 0), (6, 7), 'haut-gauche'), ((4, 0), (0, 1), (9, 6), 'droite'),
     ((0, 6), (1, 0), (8, 2), 'bas-droite'), ((10, 0), (0, 1), (4, 4), 'gauche')],
    # V2 : d en diagonale des carreaux
    [((1, 1), (1, 1), (4, 7), 'haut-gauche'), ((2, 9), (1, -1), (10, 7), 'haut-droite'),
     ((5, 1), (1, 1), (11, 3), 'bas-droite'), ((3, 8), (1, -1), (4, 2), 'bas-gauche')],
    # V3 : d oblique (2 ; 1), (1 ; 2), (3 ; 1), (1 ; -2)
    [((1, 2), (2, 1), (5, 8), 'haut'), ((3, 0), (1, 2), (10, 4), 'droite'),
     ((0, 3), (3, 1), (8, 9), 'haut'), ((5, 10), (1, -2), (11, 6), 'droite')],
    # V4 : A sur d
    [((0, 4), (1, 0), (6, 4), 'bas-gauche'), ((2, 1), (1, 1), (6, 5), 'droite'),
     ((1, 3), (2, 1), (7, 6), 'bas-droite'), ((6, 0), (0, 1), (6, 5), 'gauche')],
]


def verifie_sur_d(cat, sur):
    for p0, (dx, dy), a, _ in cat:
        est_sur = (a[0] - p0[0]) * dy - (a[1] - p0[1]) * dx == 0
        assert est_sur == sur, (p0, a)


for i, cat in enumerate(CAT_167):
    verifie_sur_d(cat, i == 3)

vs, cas_167 = [], []
for i, cat in enumerate(CAT_167):
    etapes = ETAPES_167_HV if i == 0 else ETAPES_167_OBL
    v, cas = variation_tracer(ENONCE_167, CHECK_167, cat, etapes, True)
    vs.append(v)
    cas_167.append(cas)


def a_plus(a, direction, t=1):
    return (a[0] + t * direction[0], a[1] + t * direction[1])


specs = []
for vi, cas in enumerate(cas_167):
    for k, (p0, direction, a, cherchee) in enumerate(cas, start=1):
        specs.append(spec(f'V{vi + 1}, {k} : juste', vi, k,
                          droite_txt(a, a_plus(a, cherchee)), 'correct'))
    p0, direction, a, cherchee = cas[0]
    if vi != 3:
        specs.append(spec(f'Erreur V{vi + 1} : la parallèle par A', vi, 1,
                          droite_txt(a, a_plus(a, direction)), 'incorrect'))
    decale = (a[0] + direction[0], a[1] + direction[1])
    specs.append(spec(f'Erreur V{vi + 1} : perpendiculaire à d, pas par A', vi, 1,
                      droite_txt(decale, a_plus(decale, cherchee)), 'incorrect'))
    if vi == 2:
        # Les deux nombres échangés sans changer de signe : la symétrique de d, pas la perpendiculaire
        faux = (direction[1], direction[0])
        specs.append(spec('Erreur V3 : nombres échangés sans changer le sens', vi, 1,
                          droite_txt(a, a_plus(a, faux)), 'incorrect'))

MODELES['03-tracer-la-perpendiculaire'] = modele(
    'Tracer la perpendiculaire à une droite par un point',
    'Sur quadrillage, à l\'équerre ou en comptant les carreaux : droite horizontale ou verticale,'
    ' en diagonale, oblique ; point hors de la droite ou sur la droite',
    1, vs, specs, grades=('CM1', 'CM2'), delay=180)

ENONCE_168 = 'Trace la droite $p$, parallèle à la droite $d$ et qui passe par le point $A$.'
CHECK_168 = 'droite p = parallele(A, d)'
ETAPES_168_HV = [
    'Deux droites $\\textcolor{{{color:primary.0}}}{\\text{parallèles}}$ ne se coupent jamais :'
    ' elles gardent toujours le même écart.',
    'Ici $d$ suit une ligne du quadrillage : la parallèle suit la ligne du quadrillage qui passe'
    ' par $A$. À l\'équerre : on trace la perpendiculaire à $d$ par $A$, puis la perpendiculaire'
    ' à celle-ci, toujours par $A$.',
]
ETAPES_168_OBL = [
    'Deux droites $\\textcolor{{{color:primary.0}}}{\\text{parallèles}}$ ne se coupent jamais :'
    ' elles gardent toujours le même écart.',
    'Sur le quadrillage, la parallèle fait $\\textcolor{{{color:primary.0}}}{\\text{le même chemin'
    ' de carreaux}}$ que $d$ : si $d$ avance de $a$ carreaux et monte de $b$, on part de $A$ et on'
    ' avance de $a$, on monte de $b$. À l\'équerre : deux perpendiculaires successives.',
]
CAT_168 = [
    [((0, 3), (1, 0), (6, 7), 'haut-gauche'), ((4, 0), (0, 1), (9, 6), 'droite'),
     ((0, 7), (1, 0), (8, 2), 'bas-droite'), ((10, 0), (0, 1), (4, 4), 'gauche')],
    [((1, 1), (1, 1), (3, 7), 'haut-gauche'), ((2, 9), (1, -1), (11, 7), 'haut-droite'),
     ((5, 1), (1, 1), (11, 3), 'bas-droite'), ((3, 8), (1, -1), (2, 2), 'bas-gauche')],
    [((1, 2), (2, 1), (3, 7), 'haut'), ((3, 0), (1, 2), (10, 4), 'droite'),
     ((0, 3), (3, 1), (2, 8), 'haut'), ((5, 10), (1, -2), (11, 7), 'droite')],
]
for cat in CAT_168:
    verifie_sur_d(cat, False)

vs, cas_168 = [], []
for i, cat in enumerate(CAT_168):
    etapes = ETAPES_168_HV if i == 0 else ETAPES_168_OBL
    v, cas = variation_tracer(ENONCE_168, CHECK_168, cat, etapes, False)
    vs.append(v)
    cas_168.append(cas)

specs = []
for vi, cas in enumerate(cas_168):
    for k, (p0, direction, a, cherchee) in enumerate(cas, start=1):
        specs.append(spec(f'V{vi + 1}, {k} : juste', vi, k,
                          droite_txt(a, a_plus(a, cherchee)), 'correct'))
    p0, direction, a, cherchee = cas[0]
    perp = (-direction[1], direction[0])
    specs.append(spec(f'Erreur V{vi + 1} : la perpendiculaire par A', vi, 1,
                      droite_txt(a, a_plus(a, perp)), 'incorrect'))
    decale = a_plus(a, perp)
    specs.append(spec(f'Erreur V{vi + 1} : parallèle à d, pas par A', vi, 1,
                      droite_txt(decale, a_plus(decale, cherchee)), 'incorrect'))
    if vi == 2:
        faux = (direction[0], -direction[1])
        specs.append(spec('Erreur V3 : monte au lieu de descendre', vi, 1,
                          droite_txt(a, a_plus(a, faux)), 'incorrect'))

MODELES['04-tracer-la-parallele'] = modele(
    'Tracer la parallèle à une droite par un point',
    'Sur quadrillage, en suivant le même chemin de carreaux ou à l\'équerre : droite horizontale ou'
    ' verticale, en diagonale, oblique',
    2, vs, specs, grades=('CM1', 'CM2'), delay=180)

# ============================================================================

os.makedirs(DOSSIER, exist_ok=True)
for nom, mod in MODELES.items():
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(mod, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
