"""Écrit les 2 modèles du lot 17 du CM2 (symétrique, patron du pavé) dans scripts/questions/cm2-17/.

Phase 0 validée par David le 2026-11-19 (§ 25 du journal `docs/archive/wip/questions-cm2-progress.md`,
« je te suis ») : 095 reste D (outils manquants n° 45) ; 2 modèles ; 097 V1 à V3 sur une
diagonale du quadrillage, V4 tous axes ; niveaux : Symétrie axiale 4, patrons 7 ; faux patrons du
pavé = les 8 faux du cube en rectangles.

Bornes (`cycle3.json`) : 097, papier quadrillé, axe vertical, horizontal ou diagonale du
quadrillage, axe qui ne coupe pas la figure ; 102, aucune borne propre.

Gabarits : `lot-cm1-8d.py` (02, symétrique sur quadrillage, CM1-108 `452b9a91`) et
`lot-cm1-8f.py` (08, 09, patrons du cube, CM1-100 `0da1780b`). La réponse du geste
`designer: opposee` est calculée par le pliage (`patron-sonde.ts`, à côté de ce script).

Pièges : `i` et `e` jamais comme variables ; dans une variable, `eval:` sans `==` ; la case
choix répond par l'indice d'origine ; aucun `|` dans un texte placé dans un `{{if:}}`.

    python3 docs/wip/questions/lot-cm2-17.py scripts/questions/cm2-17   (depuis la racine)
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]
SONDE = 'docs/wip/questions/patron-sonde.ts'
MODELES = {}

# ---- Gabarits ----


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(enonce, variables, etapes, reponses=None):
    v = {'statement': enonce, 'variables': variables}
    if reponses is not None:
        v['blanks'] = [{'expectedAnswer': r} for r in reponses]
    v['correction'] = {'steps': etapes}
    return v


def modele(title, description, niveau, variations, specs, delay):
    # ni theme, ni domain, ni subdomain (ADR 0035) : le rangement est posé par la migration
    return {'title': title, 'description': description, 'grades': ['CM2'], 'level': niveau,
            'delay': delay, 'status': 'draft', 'variations': variations, 'testSpecs': specs}


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(x) for k, x in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def selon(k, textes, n=1):
    """`{{if:k==1|…|{{if:k==2|…|…}}}}` : le texte numéro k (à partir de 1) ; aucun « | »."""
    textes = [str(t) for t in textes]
    for t in textes:
        assert '|' not in t, t
    if len(textes) == 1:
        return textes[0]
    return ('{{if:' + k + '==' + str(n) + '|' + textes[0] + '|' + selon(k, textes[1:], n + 1)
            + '}}')


def col(x):
    return '$\\textcolor{{{color:primary.0}}}{\\text{' + x + '}}$'


def bloc(nom, *lignes):
    return '\n\n```' + nom + '\n' + '\n'.join(x for x in lignes if x) + '\n```'


def sonde(items):
    sortie = subprocess.run(['pnpm', 'exec', 'tsx', SONDE], input=json.dumps(items),
                            capture_output=True, text=True, check=True)
    return json.loads(sortie.stdout)


def num(x):
    return str(int(x)) if x == int(x) else str(x)


def point_txt(p):
    return f'point({num(p[0])};{num(p[1])})'


def seg_txt(a, b):
    return f'segment({num(a[0])};{num(a[1])};{num(b[0])};{num(b[1])})'


def polyligne_reponse(pts):
    return '|'.join(seg_txt(pts[j], pts[j + 1]) for j in range(len(pts) - 1))


def polygone_reponse(pts):
    return polyligne_reponse(pts + [pts[0]])


# ============================================================================
# 01 — CM2-097 : le symétrique, axe sur une diagonale du quadrillage
# ============================================================================

FEN = (0, 12, 0, 12)
# Axes : ('V', c) x = c ; ('H', c) y = c ; ('/', c) y = x + c ; ('\\', c) x + y = c


def miroir(p, axe):
    sens, c = axe
    x, y = p
    if sens == 'V':
        return (2 * c - x, y)
    if sens == 'H':
        return (x, 2 * c - y)
    if sens == '/':
        return (y - c, x + c)
    return (c - y, c - x)


def ecart(p, axe):
    """Écart signé à l'axe, en carreaux (diagonale : y - x - c ou x + y - c)."""
    sens, c = axe
    x, y = p
    return {'V': x - c, 'H': y - c, '/': y - x - c, '\\': x + y - c}[sens]


def dans(p):
    return FEN[0] <= p[0] <= FEN[1] and FEN[2] <= p[1] <= FEN[3]


def bouts_axe(axe):
    """Les deux bouts de l'axe sur le bord de la fenêtre, le second en haut ou à droite."""
    sens, c = axe
    x0, x1, y0, y1 = FEN
    if sens == 'V':
        return (c, y0), (c, y1)
    if sens == 'H':
        return (x0, c), (x1, c)
    if sens == '/':
        return (max(x0, y0 - c), max(y0, x0 + c)), (min(x1, y1 - c), min(y1, x1 + c))
    return (max(x0, c - y1), min(y1, c - x0)), (min(x1, c - y0), max(y0, c - x1))


def axe_figure(axe):
    """Axe d en tirets rouges, nommé près de son bout haut (ou droit, s'il est horizontal)."""
    m, n = bouts_axe(axe)
    sens = axe[0]
    if sens == 'V':
        haut = n
        lx, ly = haut[0] + 0.4, haut[1] - 0.4
    elif sens == 'H':
        lx, ly = n[0] - 0.5, n[1] + 0.4
    elif sens == '/':
        haut = n
        lx, ly = haut[0] - 0.9, haut[1] - 0.3
    else:
        haut = m if m[1] > n[1] else n
        lx, ly = haut[0] + 0.9, haut[1] - 0.3
    return (f'm = point({num(m[0])}, {num(m[1])}, visible=faux)\n'
            f'n = point({num(n[0])}, {num(n[1])}, visible=faux)\n'
            f'texte({num(lx)}, {num(ly)}, "d")\n'
            'd = droite(m, n, trait="tirets", couleur="rouge")\n')


def traits(pts, ferme=False):
    lignes = [f'p{j} = point({num(p[0])}, {num(p[1])}, visible=faux)' for j, p in enumerate(pts)]
    n = len(pts)
    paires = [(j, j + 1) for j in range(n - 1)] + ([(n - 1, 0)] if ferme else [])
    lignes += [f's{j} = segment(p{a}, p{b}, epaisseur=3)' for j, (a, b) in enumerate(paires)]
    return '\n'.join(lignes)


def verifie_cas(axe, pts):
    image = [miroir(p, axe) for p in pts]
    ecarts = [ecart(p, axe) for p in pts]
    assert all(x > 0 for x in ecarts) or all(x < 0 for x in ecarts), (axe, pts)
    # sur une diagonale, un écart de 1 ne laisse qu'un demi-carreau entre la figure et l'axe
    assert min(abs(x) for x in ecarts) >= (2 if axe[0] in '/\\' else 1), (axe, pts)
    for p in pts + image:
        assert dans(p), (axe, p)
    return image


def imbrique(branches):
    for b in branches:
        assert '|' not in b, b
    texte = branches[-1]
    for j in range(len(branches) - 1, 0, -1):
        texte = '{{if:k==' + str(j) + '|' + branches[j - 1] + '|' + texte + '}}'
    return texte


ENTETE = f'fenetre: {FEN[0]} ; {FEN[1]} ; {FEN[2]} ; {FEN[3]}\ngrille: 1\n'
ETAPES_DIAG = [
    'Chaque point et son symétrique sont de part et d\'autre de l\'axe $d$, '
    + col('à la même distance') + ', sur une droite perpendiculaire à $d$ : ici, une '
    'diagonale des carreaux.',
    'On suit la diagonale des carreaux de chaque sommet jusqu\'à l\'axe, en comptant les carreaux '
    'traversés en biais, puis on en compte autant de l\'autre côté. On relie les points obtenus '
    'dans le même ordre : la figure est retournée, pas glissée.',
]
ETAPES_TOUS = [
    'Chaque point et son symétrique sont de part et d\'autre de l\'axe $d$, '
    + col('à la même distance') + ', sur une droite perpendiculaire à $d$ : une ligne du '
    'quadrillage si l\'axe est vertical ou horizontal, une diagonale des carreaux si l\'axe est en '
    'biais.',
    'On compte les carreaux de chaque sommet jusqu\'à l\'axe, puis autant de l\'autre côté, et '
    'on relie les points obtenus dans le même ordre : la figure est retournée, pas glissée.',
]

# V1 — un point : (axe, A, étiquette)
POINTS = [
    (('/', 0), (8, 3), 'droite'), (('/', 0), (4, 9), 'gauche'), (('/', 2), (9, 4), 'droite'),
    (('\\', 12), (3, 5), 'gauche'), (('\\', 12), (9, 8), 'droite'), (('\\', 10), (2, 3), 'gauche'),
]
# V2 — un segment ; V3 — un triangle ; V4 — un quadrilatère (tous axes)
SEGMENTS = [
    (('/', 0), [(6, 1), (10, 4)]), (('/', 0), [(2, 6), (5, 11)]), (('/', 2), [(6, 3), (9, 5)]),
    (('\\', 12), [(1, 3), (5, 2)]), (('\\', 12), [(9, 6), (11, 10)]),
    (('\\', 10), [(1, 2), (4, 1)]),
]
TRIANGLES = [
    (('/', 0), [(5, 1), (10, 2), (8, 5)]), (('/', 0), [(1, 4), (3, 10), (5, 8)]),
    (('/', 2), [(6, 2), (9, 4), (8, 6)]), (('\\', 12), [(1, 2), (5, 1), (3, 5)]),
    (('\\', 12), [(8, 7), (11, 9), (10, 11)]), (('\\', 10), [(1, 1), (4, 2), (2, 5)]),
]
QUADRILATERES = [
    (('V', 6), [(1, 2), (4, 1), (5, 5), (2, 6)]), (('H', 6), [(2, 8), (7, 9), (9, 11), (3, 11)]),
    (('/', 0), [(5, 1), (10, 1), (11, 4), (7, 4)]), (('\\', 12), [(1, 1), (5, 2), (6, 4), (2, 4)]),
    (('V', 6), [(8, 3), (11, 2), (11, 7), (9, 8)]), (('H', 5), [(2, 1), (8, 2), (10, 4), (4, 3)]),
]

branches, cas1 = [], []
for axe, a, etiq in POINTS:
    image = verifie_cas(axe, [a])[0]
    branches.append(axe_figure(axe) + f'A = point({a[0]}, {a[1]}, etiquette="{etiq}")')
    cas1.append((axe, a, image))
V1 = variation(
    'Place le point $A\'$, symétrique du point $A$ par rapport à la droite $d$.\n\n'
    '```figure-a-completer\n' + ENTETE + 'outils: point\n'
    'verifier: point A\' = symetrie(A, axe=d)\n---\n' + imbrique(branches) + '\n```',
    [var('k', f'1..{len(POINTS)}')],
    [
        'L\'axe $d$ suit les diagonales des carreaux. On part de $A$ en suivant l\'autre '
        'diagonale des carreaux, celle qui coupe $d$ à angle droit, et on compte les carreaux '
        'traversés jusqu\'à $d$.',
        'On en compte ' + col('autant') + ' de l\'autre côté de $d$, dans le même '
        'alignement : c\'est le point $A\'$.'])


def variation_figure(enonce, catalogue, ferme, etapes):
    branches, cas = [], []
    for axe, pts in catalogue:
        image = verifie_cas(axe, pts)
        branches.append(axe_figure(axe) + traits(pts, ferme))
        cas.append((axe, pts, image))
    v = variation(
        enonce + '\n\n```figure-a-completer\n' + ENTETE + 'verifier: symetrique par d\n---\n'
        + imbrique(branches) + '\n```',
        [var('k', f'1..{len(catalogue)}')], etapes)
    return v, cas


V2, cas2 = variation_figure('Construis le symétrique du segment par rapport à la droite $d$.',
                            SEGMENTS, False, ETAPES_DIAG)
V3, cas3 = variation_figure('Construis le symétrique du triangle par rapport à la droite $d$.',
                            TRIANGLES, True, ETAPES_DIAG)
V4, cas4 = variation_figure(
    'Construis le symétrique du quadrilatère par rapport à la droite $d$.',
    QUADRILATERES, True, ETAPES_TOUS)
assert {axe[0] for axe, _ in QUADRILATERES} == {'V', 'H', '/', '\\'}


def horizontal_au_lieu_de_diagonale(p, axe):
    """Erreur typique : les carreaux comptés à l'horizontale jusqu'à l'axe en biais."""
    sens, c = axe
    x, y = p
    xa = y - c if sens == '/' else c - y
    return (2 * xa - x, y)


specs = []
for k, (axe, a, image) in enumerate(cas1, start=1):
    specs.append(spec(f'V1 point {k} : juste', 0, {'k': k}, point_txt(image), 'correct'))
for k in (1, 4):
    axe, a, image = cas1[k - 1]
    faux = horizontal_au_lieu_de_diagonale(a, axe)
    assert faux != image, faux
    specs.append(spec(f'Erreur V1 ({k}) : compté à l\'horizontale', 0, {'k': k}, point_txt(faux),
                      'incorrect'))
    decale = (image[0] + 1, image[1])
    specs.append(spec(f'Erreur V1 ({k}) : un carreau à côté', 0, {'k': k}, point_txt(decale),
                      'incorrect'))
for vi, cas, rep in [(1, cas2, polyligne_reponse), (2, cas3, polygone_reponse),
                     (3, cas4, polygone_reponse)]:
    for k, (axe, pts, image) in enumerate(cas, start=1):
        specs.append(spec(f'V{vi + 1} figure {k} : juste', vi, {'k': k}, rep(image), 'correct'))
    axe, pts, image = cas[0]
    # Glissée : recopiée de l'autre côté sans être retournée (même vecteur pour tous les sommets)
    dx, dy = image[0][0] - pts[0][0], image[0][1] - pts[0][1]
    glissee = [(p[0] + dx, p[1] + dy) for p in pts]
    assert glissee != image
    specs.append(spec(f'Erreur V{vi + 1} : figure glissée', vi, {'k': 1}, rep(glissee),
                      'incorrect'))
    if axe[0] in '/\\':
        horiz = [horizontal_au_lieu_de_diagonale(p, axe) for p in pts]
        specs.append(spec(f'Erreur V{vi + 1} : compté à l\'horizontale', vi, {'k': 1}, rep(horiz),
                          'incorrect'))

MODELES['01-le-symetrique-axe-en-diagonale'] = modele(
    'Le symétrique, axe sur une diagonale',
    'Sur quadrillage, axe sur une diagonale des carreaux qui ne touche pas la figure : symétrique'
    ' d\'un point, d\'un segment, d\'un triangle ; quadrilatère, axe vertical, horizontal ou en'
    ' diagonale',
    4, [V1, V2, V3, V4], specs, delay=240)

# ============================================================================
# 02 — CM2-102 : reconnaître le patron d'un pavé
# ============================================================================

# Pavés l × p × h, trois mesures différentes (V1, V2, V4)
PAVES = ['4 2 3', '5 3 2', '5 2 4', '4 3 2', '3 2 5']
PAVE = 'pave ' + selon('d', PAVES)
# V2 : le même pavé, une mesure changée (son patron est le leurre)
AUTRES = ['4 2 5', '5 3 4', '3 2 4', '4 3 4', '3 4 5']
assert all(a != p for a, p in zip(AUTRES, PAVES))

PLIER = 'On imagine une face posée au sol, puis on relève les autres autour d\'elle.'

V1P = variation(
    'On découpe cet assemblage de $6$ rectangles et on le plie le long des traits. Obtient-on'
    ' un pavé ?'
    + bloc('patron', 'solide: ' + PAVE, 'forme: {{if:v==1|{{k}}|faux {{j}}}}',
           'tourner: {{eval:90*t}}', 'retourner: {{if:r==1|oui|non}}')
    + '\n\n```choix\nmelanger: non\n- Oui, il se plie en pavé.\n'
    '- Non, il ne se plie pas en pavé.\n```',
    [var('d', f'1..{len(PAVES)}'), var('v', '0..1'), var('k', '1..11'), var('j', '1..8'),
     var('t', '0..3'), var('r', '0..1')],
    [PLIER, '{{if:v==1|Chaque rectangle vient sur une face différente, sans trou ni face en '
     'double : ' + col('oui') + ', c\'est un patron de pavé.|Deux rectangles arrivent au même '
     'endroit, et il reste un trou : ' + col('non') + ', ce n\'est pas un patron de pavé.}}'],
    ['{{eval:1-v}}'])

V2P = variation(
    'Voici un pavé.'
    + bloc('solide', 'forme: ' + PAVE, 'cotes: cm')
    + '\n\nLequel de ces assemblages est un patron de ce pavé ?\n\n'
    '````choix\n'
    '- ```patron\n  solide: ' + PAVE + '\n  forme: {{k}}\n  ```\n'
    '- ```patron\n  solide: pave ' + selon('d', AUTRES) + '\n  forme: {{a}}\n  ```\n'
    '- ```patron\n  solide: ' + PAVE + '\n  forme: faux {{j}}\n  ```\n'
    '````',
    [var('d', f'1..{len(PAVES)}'), var('k', '1..11'), var('a', '1..11'), var('j', '1..8')],
    ['Un patron de ce pavé a $6$ faces, deux à deux identiques, ' + col('de la forme des faces')
     + ' du pavé : un rectangle long et fin reste long et fin sur le patron.',
     'Un des assemblages a des faces d\'une autre forme : c\'est le patron d\'un autre pavé ; '
     'un autre ne se plie pas : deux faces arriveraient au même endroit. Il reste ' + col('le patron du pavé') + '.'],
    ['0'])

# V3 — patron coté : combien de faces mesurent a cm sur b cm ? Les 4 premiers cas : 4 faces
# (base carrée, faces latérales) ; les suivants : 2 faces.
FACES = [  # (pavé, a, b, réponse)
    ('3 3 5', 3, 5, 4), ('2 2 4', 2, 4, 4), ('4 4 2', 4, 2, 4), ('5 5 3', 5, 3, 4),
    ('3 3 5', 3, 3, 2), ('4 2 3', 4, 3, 2), ('5 3 2', 3, 2, 2), ('4 4 2', 4, 4, 2),
]
assert [n for *_, n in FACES] == [4, 4, 4, 4, 2, 2, 2, 2]
V3P = variation(
    'Cet assemblage se plie en pavé.'
    + bloc('patron', 'solide: pave ' + selon('q', [p for p, *_ in FACES]), 'forme: {{k}}',
           'cotes: cm', 'tourner: {{eval:90*t}}')
    + '\n\nCombien de faces de ce pavé mesurent ' + selon('q', [f'${a}$ cm sur ${b}$ cm'
                                                            for _, a, b, _ in FACES]) + ' ? $?$',
    [var('q', f'1..{len(FACES)}'), var('k', '1..11'), var('t', '0..3'),
     var('n', 'eval:2+2*floor((8-q)/4)')],
    ['Un pavé a $6$ faces rectangulaires, ' + col('deux à deux identiques') + ' : le dessus et '
     'le dessous, le devant et le derrière, la gauche et la droite.',
     '{{if:n==4|Ici, deux mesures du pavé sont égales : quatre faces ont la même forme. On en '
     'compte $\\textcolor{{{color:primary.0}}}{4}$.|On repère les faces de ces mesures sur le '
     'patron : il y en a $\\textcolor{{{color:primary.0}}}{2}$, l\'une en face de l\'autre une '
     'fois le pavé fermé.}}'],
    ['{{n}}'])

V4P = variation(
    'On plie ce patron pour fabriquer un pavé. Touche la face qui sera **en face** de la face '
    'grise, une fois le pavé fermé.'
    + bloc('patron', 'solide: ' + PAVE, 'forme: {{k}}', 'marquer: face {{m}}',
           'designer: opposee', 'tourner: {{eval:90*t}}'),
    [var('d', f'1..{len(PAVES)}'), var('k', '1..11'), var('m', '1..6'), var('t', '0..3')],
    ['Une fois le pavé fermé, la face opposée à la face grise ne la touche pas, même par un '
     'coin.',
     'Elle a ' + col('la même forme et les mêmes mesures') + ' que la face grise.'])

# Gestes et blocs vérifiés par le pliage (sonde)
essais = [(d, k, m) for d, k, m in [(1, 1, 2), (2, 7, 1), (3, 11, 4), (4, 4, 6), (5, 9, 3)]]
reponses = sonde([{'src': f'solide: pave {PAVES[d - 1]}\nforme: {k}\nmarquer: face {m}\n'
                   'designer: opposee'} for d, k, m in essais])
toutes = sonde([{'src': f'solide: pave {p}\nforme: {f}\ncotes: cm'}
                for p in PAVES + AUTRES + [x for x, *_ in FACES]
                for f in [str(n) for n in range(1, 12)]]
               + [{'src': f'solide: pave {p}\nforme: faux {n}'} for p in PAVES for n in range(1, 9)])
assert all(o.get('errors') == ['pas de geste'] for o in toutes), \
    [o for o in toutes if o.get('errors') != ['pas de geste']][:3]

specsp = [
    spec('Vrai patron : oui', 0, {'d': 1, 'v': 1, 'k': 1, 'j': 1, 't': 0, 'r': 0}, ['0'], 'correct'),
    spec('Patron 11 tourné, retourné : oui', 0, {'d': 3, 'v': 1, 'k': 11, 'j': 2, 't': 1, 'r': 1},
         ['0'], 'correct'),
    spec('Faux patron : non', 0, {'d': 2, 'v': 0, 'k': 3, 'j': 4, 't': 2, 'r': 0}, ['1'], 'correct'),
    spec('Erreur : faux patron pris pour un patron', 0,
         {'d': 2, 'v': 0, 'k': 3, 'j': 4, 't': 2, 'r': 0}, ['0'], 'incorrect'),
    spec('Erreur : patron tourné refusé', 0, {'d': 4, 'v': 1, 'k': 8, 'j': 1, 't': 3, 'r': 0},
         ['1'], 'incorrect'),
    spec('Le patron du pavé', 1, {'d': 1, 'k': 2, 'a': 5, 'j': 3}, ['0'], 'correct'),
    spec('Erreur : le patron d\'un autre pavé', 1, {'d': 1, 'k': 2, 'a': 5, 'j': 3}, ['1'],
         'incorrect'),
    spec('Erreur : le faux patron', 1, {'d': 5, 'k': 9, 'a': 1, 'j': 6}, ['2'], 'incorrect'),
]
for q in (1, 3, 5, 6):
    n = FACES[q - 1][3]
    variables = {'q': q, 'k': 7, 't': 0, 'n': n}
    specsp.append(spec(f'Faces {FACES[q - 1][1]} sur {FACES[q - 1][2]} : {n}', 2, variables,
                       [str(n)], 'correct'))
    faux = '2' if n == 4 else '4'
    specsp.append(spec(f'Erreur : {faux} au lieu de {n}', 2, variables, [faux], 'incorrect'))
specsp.append(spec('Erreur : une seule face comptée', 2, {'q': 6, 'k': 7, 't': 0, 'n': 2}, ['1'],
                   'incorrect'))
for (d, k, m), r in zip(essais, reponses):
    assert 'errors' not in r, r
    bon = r['answer']
    variables = {'d': d, 'k': k, 'm': m, 't': 0}
    specsp.append(spec(f'Pavé {PAVES[d - 1]}, patron {k}, face {m} : la face {bon}', 3, variables,
                       [bon], 'correct'))
    specsp.append(spec('Erreur : la face grise elle-même', 3, variables, [str(m)], 'incorrect'))
    voisine = next(str(f) for f in range(1, 7) if str(f) not in (bon, str(m)))
    specsp.append(spec(f'Erreur : une autre face ({voisine})', 3, variables, [voisine],
                       'incorrect'))

MODELES['02-reconnaitre-le-patron-d-un-pave'] = modele(
    'Reconnaître le patron d\'un pavé',
    'Se plie-t-il en pavé ? (11 patrons, 8 faux) ; le patron d\'un pavé coté parmi trois ; combien'
    ' de faces de ces mesures ? ; la face opposée',
    7, [V1P, V2P, V3P, V4P], specsp, delay=60)

# ============================================================================

os.makedirs(DOSSIER, exist_ok=True)
for nom, mod in MODELES.items():
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(mod, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
