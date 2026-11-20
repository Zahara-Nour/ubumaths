"""Écrit les 5 modèles du lot 16 du CM2 (angle droit et figures) dans scripts/questions/cm2-16/.

Phase 0 validée par David le 2026-11-19 (§ 24 et 24.1 du journal
`docs/archive/wip/questions-cm2-progress.md`, « je te suis ») : 5 modèles (CM2-081, 088 ×2, 092, 093) ;
niveaux : mesure en degrés 2 ; propriétés 11, 12, 13, 14. Trapèze : `(AB) // (CD)` écrit sous la
figure (pas de code du parallélisme) ; nom le plus précis attendu.

Bornes (`cycle3.json`) : 081, angle droit = 90°, sa moitié 45° par pliage, pas de rapporteur,
angles saillants ; 088, codes des angles droits, des angles égaux, des longueurs égales, symboles
⊥, //, ∈, ∉ ; 092, triangles (rectangle, isocèle, équilatéral), quadrilatère, carré, rectangle,
losange, trapèze, trapèze rectangle, pentagone, hexagone ; 093, mêmes figures sans les polygones.

Patron : `lot-cm1-8c.py` (jumeaux CM1 `6108cc4c`, `273dce6f`, `20907b18` : ```figure codée + case
« choix »), dont les gabarits sont repris ici.

Pièges : `i` et `e` jamais comme variables ; dans une variable, `eval:` sans `==` (indicatrices) ;
la case choix répond par l'indice d'origine ; aucun `|` dans un texte placé dans un `{{if:}}` ;
réponse attendue sans `{{if:}}` (variable calculée) ; un choix multiple qui répète un indice le
compte une fois.

    python3 -I docs/wip/questions/lot-cm2-16.py scripts/questions/cm2-16
"""
import json
import math
import os
import sys

DOSSIER = sys.argv[1]
MODELES = {}

# ---- Gabarits (comme lot-cm1-8c.py) ----


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(enonce, variables, reponses, etapes):
    return {'statement': enonce, 'variables': variables,
            'blanks': [r if isinstance(r, dict) else {'expectedAnswer': r} for r in reponses],
            'correction': {'steps': etapes}}


def modele(title, description, niveau, variations, specs, delay=90):
    return {'title': title, 'description': description, 'grades': ['CM2'], 'level': niveau,
            'delay': delay, 'status': 'draft', 'variations': variations, 'testSpecs': specs}


def ecrire(nom, mod):
    MODELES[nom] = mod


FONCTIONS = {'__builtins__': {}, 'floor': math.floor, 'abs': abs, 'max': max, 'min': min}


def calcule(variables, tirage):
    valeurs = {}
    for v in variables:
        nom, expr = v['name'], v['expression']
        if expr.startswith('eval:') and nom not in tirage:
            x = eval(expr[5:], FONCTIONS, dict(valeurs))
            assert abs(x - round(x)) < 1e-9, (nom, x)
            valeurs[nom] = int(round(x))
        else:
            assert nom in tirage, ('tirage manquant', nom)
            valeurs[nom] = tirage[nom]
    return valeurs


def spec(desc, vi, vs, tirage, answers, status):
    valeurs = calcule(vs[vi]['variables'], tirage)
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(x) for k, x in valeurs.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def ev(x):
    return '{{eval:' + x + '}}'


def col(x):
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


def selon(k, textes, n=1):
    """`{{if:k==n|…|{{if:k==n+1|…|…}}}}` : le texte numéro m pour k == n + m."""
    for t in textes:
        assert '{{' in t or '|' not in t, t
    if len(textes) == 1:
        return textes[0]
    return ('{{if:' + k + '==' + str(n) + '|' + textes[0] + '|' + selon(k, textes[1:], n + 1)
            + '}}')


def ind(k, m):
    """Indicatrice de k == m, en `eval:` (qui ne connaît pas `==`)."""
    return f'(1-min(abs({k}-{m}),1))'


def table(nom, k, valeurs, debut=1):
    """Variable `nom` = valeurs[k - debut], par indicatrices."""
    return var(nom, 'eval:' + '+'.join(f'{ind(k, m)}*{int(v)}'
                                       for m, v in enumerate(valeurs, debut)))


def choix(lignes, melanger=False, plusieurs=False):
    tete = ('plusieurs: oui\n' if plusieurs else '') + ('' if melanger else 'melanger: non\n')
    return '\n\n```choix\n' + tete + ''.join('- ' + c + '\n' for c in lignes) + '```'


def figure(fenetre, description, corps, retrait='', taille=None):
    lignes = ['```figure', 'fenetre: ' + fenetre]
    if taille:
        lignes.append('taille: ' + taille)
    lignes += ['description: ' + description, '---'] + corps.split('\n') + ['```']
    return '\n'.join((retrait + l) if l else l for l in lignes)


def choix_figures(figures):
    """Choix entre dessins (mélangés) ; la bonne réponse est la première (indice 0)."""
    return ('\n\n````choix\n' + ''.join('- ' + figure(*f, retrait='  ', taille='grande')[2:]
                                       + '\n' for f in figures) + '````')


# ---- Formes ----

FEN = '0 ; 10 ; 0 ; 7'
ORIENT = [0, 35, 160]
ABCD = ['A', 'B', 'C', 'D']
ABC = ['A', 'B', 'C']
DEG = '^\\circ'


def rot(pts, deg):
    a = math.radians(deg)
    return [(x * math.cos(a) - y * math.sin(a), x * math.sin(a) + y * math.cos(a)) for x, y in pts]


def cadre(pts, larg=7.6, haut=5.2, cx=5, cy=3.5, echelle_max=1.0):
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    s = min(larg / (max(xs) - min(xs)), haut / (max(ys) - min(ys)), echelle_max)
    mx, my = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2
    return [(round(cx + (x - mx) * s, 2), round(cy + (y - my) * s, 2)) for x, y in pts]


def angle_en(pts, j):
    n = len(pts)
    (ax, ay), (sx, sy), (bx, by) = pts[j - 1], pts[j], pts[(j + 1) % n]
    u, v = (ax - sx, ay - sy), (bx - sx, by - sy)
    c = (u[0] * v[0] + u[1] * v[1]) / math.hypot(*u) / math.hypot(*v)
    return math.degrees(math.acos(max(-1, min(1, c))))


def cote(pts, j):
    (ax, ay), (bx, by) = pts[j], pts[(j + 1) % len(pts)]
    return math.hypot(bx - ax, by - ay)


def direction(pts, j):
    """Direction du côté j, en degrés dans [0 ; 180[."""
    (ax, ay), (bx, by) = pts[j], pts[(j + 1) % len(pts)]
    return math.degrees(math.atan2(by - ay, bx - ax)) % 180


def ecart_dir(a, b):
    d = abs(a - b) % 180
    return min(d, 180 - d)


def place(p, pts):
    cx = sum(q[0] for q in pts) / len(pts)
    cy = sum(q[1] for q in pts) / len(pts)
    dx, dy = p[0] - cx, p[1] - cy
    v = 'haut' if dy > abs(dx) / 2 else 'bas' if dy < -abs(dx) / 2 else ''
    h = 'droite' if dx > abs(dy) / 2 else 'gauche' if dx < -abs(dy) / 2 else ''
    return (v + '-' + h).strip('-') or 'haut'


def dessin(pts, noms=None, traits=None, droits=(), arcs=None, couleur='bleu', prefixe='p',
           extra=''):
    """Polygone ; `noms` : lettres des sommets (sinon cachés) ; `traits` : {côté j : nombre de
    traits} ; `droits` : sommets codés d'un angle droit ; `arcs` : {sommet j : marque}."""
    n = len(pts)
    ids = noms or [f'{prefixe}{j}' for j in range(n)]
    lignes = []
    for j, (x, y) in enumerate(pts):
        if noms:
            lignes.append(f'{ids[j]} = point({x}, {y}, etiquette="{place((x, y), pts)}")')
        else:
            lignes.append(f'{ids[j]} = point({x}, {y}, visible=faux)')
    lignes.append(f'polygone({", ".join(ids)}, couleur="{couleur}", epaisseur=2)')
    for j, t in (traits or {}).items():
        a, b = ids[j], ids[(j + 1) % n]
        lignes.append(f'marque_segment({a}, {b})' if t == 1 else
                      f'marque_segment({a}, {b}, traits={t})')
    for j in droits:
        lignes.append(f'angle({ids[j - 1]}, {ids[j]}, {ids[(j + 1) % n]}, marque="carre",'
                      ' couleur="noir")')
    for j, m in (arcs or {}).items():
        lignes.append(f'angle({ids[j - 1]}, {ids[j]}, {ids[(j + 1) % n]}, marque="{m}",'
                      ' couleur="noir")')
    return '\n'.join(lignes) + ('\n' + extra if extra else '')


def verifie_droits(pts, droits, nom):
    for j in range(len(pts)):
        a = angle_en(pts, j)
        if j in droits:
            assert abs(a - 90) < 0.5, (nom, j, a)
        else:
            assert abs(a - 90) > 14, (nom, 'angle presque droit', j, a)


def regulier(n, r, debut):
    return [(r * math.cos(math.radians(debut + 360 * j / n)),
             r * math.sin(math.radians(debut + 360 * j / n))) for j in range(n)]


# Les 12 figures du point CM2-092 : sommets, côtés codés, angles droits, côtés parallèles.
FIGURES = {
    'triangle': ([(0, 0), (6.4, 0), (-1.0, 3.0)], {}, ()),
    'triangle rectangle': ([(0, 0), (5.6, 0), (0, 3.4)], {}, (0,)),
    'triangle isocèle': ([(-1.9, 0), (1.9, 0), (0, 4.6)], {1: 1, 2: 1}, ()),
    'triangle équilatéral': (regulier(3, 2.7, 90), {0: 1, 1: 1, 2: 1}, ()),
    'quadrilatère': ([(0, 0), (6.6, -0.4), (3.8, 3.3), (1.9, 2.9)], {}, ()),
    'carré': ([(0, 0), (4, 0), (4, 4), (0, 4)], {0: 1, 1: 1, 2: 1, 3: 1}, (0, 1, 2, 3)),
    'rectangle': ([(0, 0), (6.4, 0), (6.4, 3.4), (0, 3.4)], {}, (0, 1, 2, 3)),
    'losange': ([(0, -1.9), (3.2, 0), (0, 1.9), (-3.2, 0)], {0: 1, 1: 1, 2: 1, 3: 1}, ()),
    'trapèze': ([(0, 0), (6.6, 0), (3.6, 3.5), (2.0, 3.5)], {}, ()),
    'trapèze rectangle': ([(0, 0), (6.4, 0), (3.8, 3.4), (0, 3.4)], {}, (0, 3)),
    'pentagone': ([(0, 0), (4.0, 0.2), (5.0, 3.3), (2.8, 4.8), (-0.8, 2.1)], {}, ()),
    'hexagone': ([(0, 0), (4.5, -0.4), (6.1, 2.0), (5.1, 3.6), (2.1, 5.0), (-0.8, 2.3)], {}, ()),
}
NOMS12 = list(FIGURES)
TRAPEZES = ('trapèze', 'trapèze rectangle')
for _nom, (_p, _t, _d) in FIGURES.items():
    verifie_droits(_p, _d, _nom)
    if _t:
        _l = [round(cote(_p, j), 3) for j in _t]
        assert len(set(_l)) == 1, (_nom, _l)
# Sans code de longueur : pas deux côtés de même longueur (à l'œil).
for _nom in ('triangle', 'quadrilatère', 'triangle rectangle', 'trapèze', 'trapèze rectangle',
             'pentagone', 'hexagone'):
    _p = FIGURES[_nom][0]
    _l = sorted(cote(_p, j) for j in range(len(_p)))
    assert all(b - a > 0.3 for a, b in zip(_l, _l[1:])), (_nom, _l)
# Le quadrilatère n'a aucun côté parallèle à un autre ; les trapèzes, seulement [AB] et [CD].
for _nom in ('quadrilatère', 'trapèze', 'trapèze rectangle'):
    _p = FIGURES[_nom][0]
    assert ecart_dir(direction(_p, 1), direction(_p, 3)) > 30, _nom
    if _nom == 'quadrilatère':
        assert ecart_dir(direction(_p, 0), direction(_p, 2)) > 12, _nom
    else:
        assert ecart_dir(direction(_p, 0), direction(_p, 2)) < 1e-9, _nom


def figure_usuelle(nom, angle, codes=True, couleur='bleu', **kw):
    pts, traits, droits = FIGURES[nom]
    pts = cadre(rot(pts, angle), **kw)
    noms = ABCD if nom in TRAPEZES else None
    return dessin(pts, noms=noms, traits=traits if codes else None,
                  droits=droits if codes else (), couleur=couleur)


# ======================================================================================
# 01. L'angle droit mesure 90° (CM2-081)
# ======================================================================================


def angle_dessine(p, t, ecart):
    """Un angle de sommet O, côtés de directions t et t + 90 + écart (expressions `eval`)."""
    return '\n'.join([
        f'{p}O = point(0, 0, visible=faux)',
        f'{p}U = point({p}O, longueur=3, angle=' + ev(t) + ', visible=faux)',
        f'{p}V = point({p}O, longueur=3, angle=' + ev(f'{t}+90+{ecart}') + ', visible=faux)',
        f'demidroite({p}O, {p}U, couleur="bleu", epaisseur=2)',
        f'demidroite({p}O, {p}V, couleur="bleu", epaisseur=2)',
        f'angle({p}U, {p}O, {p}V, marque="arc", couleur="noir")'])


FEN_A = '-4 ; 4 ; -3.6 ; 3.6'
V1 = variation(
    'Lequel de ces angles mesure $90' + DEG + '$ ?'
    + choix_figures([(FEN_A, 'Un angle.', angle_dessine('abc'[n], f't{n}', g))
                     for n, g in enumerate(['0', 'g1', 'g2'])]),
    [var('t0', '0..359'), var('t1', '0..359'), var('t2', '0..359'), var('g1', '22..32'),
     var('g2', '-32..-22')],
    ['0'],
    ['Un **angle droit** mesure $90' + DEG + '$ : c\'est l\'angle du coin de l\'équerre.',
     'On pose le coin de l\'équerre sur le sommet, un bord le long d\'un côté : l\'autre côté doit'
     ' suivre exactement l\'autre bord.',
     'Sur un seul dessin, l\'angle est droit : il mesure $' + col('90' + DEG) + '$. Les deux'
     ' autres sont plus petit (aigu) ou plus grand (obtus) qu\'un angle droit.'])
V2 = variation(
    selon('k', ['On plie un angle droit en deux, bord sur bord. Combien mesure chacun des deux'
                ' angles obtenus ?\n\nChaque angle mesure $?' + DEG + '$.',
                'On plie un angle en deux, bord sur bord, et on obtient deux angles de $45' + DEG
                + '$. Combien mesure l\'angle de départ ?\n\nL\'angle de départ mesure $?' + DEG
                + '$.',
                'Combien d\'angles de $45' + DEG + '$ faut-il mettre côte à côte pour obtenir un'
                ' angle droit ?\n\nIl en faut $?$.']),
    [var('k', '1..3'), table('r', 'k', [45, 90, 2])], ['{{r}}'],
    ['Un angle droit mesure $90' + DEG + '$. Plié en deux, bord sur bord, il donne deux angles'
     ' égaux : $90 \\div 2 = 45$, chacun mesure $45' + DEG + '$.',
     selon('k', ['Chaque angle mesure $' + col('45' + DEG) + '$.',
                 'Deux angles de $45' + DEG + '$ côte à côte : $45 + 45 = 90$. L\'angle de départ'
                 ' était un angle droit, il mesure $' + col('90' + DEG) + '$.',
                 '$45 + 45 = 90$ : il en faut $' + col('2') + '$.'])])
CMP = ['plus petit qu\'un angle droit (aigu)', 'un angle droit',
       'plus grand qu\'un angle droit (obtus)']
V3 = variation(
    'Un angle mesure ${{N}}' + DEG + '$. Comment est-il ?' + choix(CMP),
    [var('c', '0..2'), var('a', '2..17'),
     var('N', 'eval:' + ind('c', 0) + '*5*a+' + ind('c', 1) + '*90+' + ind('c', 2) + '*(90+5*a)')],
    ['{{c}}'],
    ['On compare la mesure à $90' + DEG + '$, la mesure de l\'angle droit.',
     selon('c', ['${{N}} < 90$ : l\'angle est $' + col('\\text{plus petit qu\'un angle droit}')
                 + '$, c\'est un angle aigu.',
                 '$90' + DEG + '$, c\'est $' + col('\\text{un angle droit}') + '$.',
                 '${{N}} > 90$ : l\'angle est $' + col('\\text{plus grand qu\'un angle droit}')
                 + '$, c\'est un angle obtus.'], 0)])
COINS = ['\\widehat{DAB}', '\\widehat{ABC}', '\\widehat{BCD}', '\\widehat{CDA}']
V4 = variation(
    selon('k', ['$ABCD$ est un rectangle. Combien mesure l\'angle $' + selon('s', COINS, 0)
                + '$ ?',
                '$ABCD$ est un carré. Combien mesure l\'angle $' + selon('s', COINS, 0) + '$ ?',
                '$ABC$ est un triangle rectangle en $' + selon('s', ['A', 'B', 'C', 'A'], 0)
                + '$. Combien mesure l\'angle $'
                + selon('s', ['\\widehat{CAB}', '\\widehat{ABC}', '\\widehat{BCA}',
                              '\\widehat{BAC}'], 0) + '$ ?'])
    + '\n\nL\'angle mesure $?' + DEG + '$.',
    [var('k', '1..3'), var('s', '0..3')], ['90'],
    [selon('k', ['Un rectangle a quatre angles droits.', 'Un carré a quatre angles droits.',
                 'Un triangle rectangle a un angle droit, à son sommet « rectangle ».']),
     'Cet angle est donc droit : il mesure $' + col('90' + DEG) + '$.'])
vs = [V1, V2, V3, V4]
ecrire('01-l-angle-droit-mesure-90', modele(
    'L\'angle droit mesure 90°',
    'Reconnaître l\'angle de 90° ; plier un angle droit en deux (45°) ; comparer une mesure à'
    ' 90° ; angles droits du rectangle, du carré, du triangle rectangle',
    2, vs,
    [spec('Le dessin droit', 0, vs, {'t0': 30, 't1': 100, 't2': 250, 'g1': 25, 'g2': -28}, ['0'],
          'correct'),
     spec('Erreur : l\'angle obtus', 0, vs, {'t0': 30, 't1': 100, 't2': 250, 'g1': 25,
                                             'g2': -28}, ['1'], 'incorrect'),
     spec('Moitié de l\'angle droit : 45', 1, vs, {'k': 1}, ['45'], 'correct'),
     spec('Erreur : 90 pour la moitié', 1, vs, {'k': 1}, ['90'], 'incorrect'),
     spec('Angle de départ : 90', 1, vs, {'k': 2}, ['90'], 'correct'),
     spec('Deux angles de 45°', 1, vs, {'k': 3}, ['2'], 'correct'),
     spec('70° : plus petit', 2, vs, {'c': 0, 'a': 14}, ['0'], 'correct'),
     spec('90° : droit', 2, vs, {'c': 1, 'a': 5}, ['1'], 'correct'),
     spec('120° : plus grand', 2, vs, {'c': 2, 'a': 6}, ['2'], 'correct'),
     spec('Erreur : 120° dit plus petit', 2, vs, {'c': 2, 'a': 6}, ['0'], 'incorrect'),
     spec('Rectangle : 90', 3, vs, {'k': 1, 's': 2}, ['90'], 'correct'),
     spec('Erreur : 180 pour l\'angle droit', 3, vs, {'k': 3, 's': 1}, ['180'], 'incorrect'),
     spec('Erreur : 45', 3, vs, {'k': 2, 's': 0}, ['45'], 'incorrect')]))

# ======================================================================================
# 02. Les codes : angles et longueurs égaux (CM2-088)
# ======================================================================================

# Quadrilatère à angles opposés égaux (A = C, B = D) ; trapèze isocèle (A = B, C = D).
PARA = [(0, 0), (5, 0), (6.6, 3.2), (1.6, 3.2)]
TRAP_ISO = [(0, 0), (6.4, 0), (4.6, 3.2), (1.8, 3.2)]
for _p, _eg in ((PARA, [(0, 2), (1, 3)]), (TRAP_ISO, [(0, 1), (2, 3)])):
    verifie_droits(_p, (), 'quad codé')
    for _a, _b in _eg:
        assert abs(angle_en(_p, _a) - angle_en(_p, _b)) < 1e-6
    assert abs(angle_en(_p, 0) - angle_en(_p, 1)) > 20 or _p is TRAP_ISO
ARCS_PARA = {0: 'arc', 2: 'arc', 1: 'arcs2', 3: 'arcs2'}
ARCS_TRAP = {0: 'arc', 1: 'arc', 2: 'arcs2', 3: 'arcs2'}
ROT4 = [0, 30, 150, 250]


def quad_arcs(k, o):
    pts, arcs = (PARA, ARCS_PARA) if k == 1 else (TRAP_ISO, ARCS_TRAP)
    return dessin(cadre(rot(pts, ROT4[o])), noms=ABCD, arcs=arcs)


SOMMETS = ['l\'angle de sommet ' + x for x in ABCD]
V1 = variation(
    'D\'après les codes, quel angle a la même mesure que l\'angle de sommet $'
    + selon('s', ABCD, 0) + '$ ?\n\n'
    + figure(FEN, 'Un quadrilatère ABCD ; ses angles sont codés par des arcs, un ou deux traits.',
             selon('k', [selon('o', [quad_arcs(k, o) for o in range(4)], 0) for k in (1, 2)]))
    + choix(SOMMETS),
    [var('k', '1..2'), var('o', '0..3'), var('s', '0..3'),
     table('zp', 's', [2, 3, 0, 1], 0), table('zt', 's', [1, 0, 3, 2], 0),
     var('z', 'eval:(2-k)*zp+(k-1)*zt')],
    ['{{z}}'],
    ['Des angles codés de la **même marque** (le même nombre d\'arcs) ont la même mesure.',
     'L\'angle de sommet $' + selon('s', ABCD, 0) + '$ porte {{if:k==1|'
     + selon('s', ['un arc', 'deux arcs', 'un arc', 'deux arcs'], 0) + '|'
     + selon('s', ['un arc', 'un arc', 'deux arcs', 'deux arcs'], 0) + '}} ; l\'autre angle qui'
     ' porte la même marque est $' + col('\\text{l\'angle de sommet }'
                                         + '{{if:z==0|A|{{if:z==1|B|{{if:z==2|C|D}}}}}}') + '$.'])
# Triangles codés : 0 deux angles égaux, 1 trois angles égaux, 2 deux côtés égaux, 3 un angle droit.
ISO = [(-1.9, 0), (1.9, 0), (0, 4.6)]
TRI_CODES = [
    (ISO, {}, (), {0: 'arc', 1: 'arc'}),
    (regulier(3, 2.7, 90), {}, (), {0: 'arc', 1: 'arc', 2: 'arc'}),
    (ISO, {1: 1, 2: 1}, (), {}),
    ([(0, 0), (5.6, 0), (0, 3.4)], {}, (0,), {}),
]
PHRASES_TRI = ['Deux angles ont la même mesure.', 'Les trois angles ont la même mesure.',
               'Deux côtés ont la même longueur.', 'Le triangle a un angle droit.']


def tri_code(t, o):
    pts, traits, droits, arcs = TRI_CODES[t]
    return dessin(cadre(rot(pts, ORIENT[o])), traits=traits, droits=droits, arcs=arcs)


V2 = variation(
    'Que disent les codes de ce triangle ?\n\n'
    + figure(FEN, 'Un triangle avec ses codes.',
             selon('t', [selon('o', [tri_code(t, o) for o in range(3)], 0) for t in range(4)], 0))
    + choix(PHRASES_TRI),
    [var('t', '0..3'), var('o', '0..2')], ['{{t}}'],
    ['Les **arcs** dans les coins marquent les angles de même mesure ; les **petits traits** sur'
     ' les côtés, les côtés de même longueur ; le **petit carré**, l\'angle droit.',
     selon('t', ['Deux angles portent un arc : ils ont la même mesure.',
                 'Les trois angles portent un arc : ils ont tous la même mesure.',
                 'Deux côtés portent un petit trait : ils ont la même longueur.',
                 'Un petit carré dans un coin : cet angle est droit.'], 0),
     'Les codes disent : ' + selon('t', ['**' + p + '**' for p in PHRASES_TRI], 0)])
# Deux figures codées : 1 trapèze isocèle (AD = BC, A = B, C = D) ; 2 trapèze rectangle (angles
# droits en A et D, AB = AD).
TRAP_R = [(0, 0), (4, 0), (2.2, 4), (0, 4)]
verifie_droits(TRAP_R, (0, 3), 'trapèze rectangle codé')
assert abs(cote(TRAP_R, 0) - cote(TRAP_R, 3)) < 1e-9
assert abs(cote(TRAP_ISO, 1) - cote(TRAP_ISO, 3)) < 1e-9


def quad_codes(k, o):
    if k == 1:
        return dessin(cadre(rot(TRAP_ISO, ORIENT[o])), noms=ABCD, traits={1: 1, 3: 1},
                      arcs=ARCS_TRAP)
    return dessin(cadre(rot(TRAP_R, ORIENT[o])), noms=ABCD, traits={0: 1, 3: 1}, droits=(0, 3))


PHRASES_Q = ['$[AD]$ et $[BC]$ ont la même longueur.',
             'Les angles $\\widehat{DAB}$ et $\\widehat{ABC}$ ont la même mesure.',
             'L\'angle $\\widehat{DAB}$ est droit.',
             '$[AB]$ et $[AD]$ ont la même longueur.',
             'Les angles $\\widehat{BCD}$ et $\\widehat{CDA}$ ont la même mesure.']
VRAIES_Q = {1: [0, 1, 4], 2: [2, 3, 3]}
V3 = variation(
    'La figure n\'est pas en vraie grandeur. Coche **toutes** les phrases que disent ses codes.\n\n'
    + figure(FEN, 'Un quadrilatère ABCD avec ses codes.',
             selon('k', [selon('o', [quad_codes(k, o) for o in range(3)], 0) for k in (1, 2)]))
    + choix(PHRASES_Q, plusieurs=True),
    [var('k', '1..2'), var('o', '0..2')]
    + [table(n, 'k', [VRAIES_Q[1][m], VRAIES_Q[2][m]]) for m, n in enumerate('uvw')],
    ['{{u}};{{v}};{{w}}'],
    ['On lit chaque code : petits traits (longueurs égales), arcs (angles égaux), petit carré'
     ' (angle droit).',
     '{{if:k==1|$[AD]$ et $[BC]$ portent un trait ; les angles en $A$ et $B$ portent un arc, ceux'
     ' en $C$ et $D$ deux arcs. Aucun petit carré.|Petits carrés en $A$ et en $D$ ; $[AB]$ et'
     ' $[AD]$ portent un trait. Aucun arc.}}',
     'Les phrases vraies : {{if:k==1|**' + PHRASES_Q[0] + '** ; **' + PHRASES_Q[1] + '** ; **'
     + PHRASES_Q[4] + '**|**' + PHRASES_Q[2] + '** ; **' + PHRASES_Q[3] + '**}}'])
vs = [V1, V2, V3]
ecrire('02-les-codes-angles-et-longueurs', modele(
    'Les codes : angles et longueurs égaux',
    'Lire les codes des angles égaux (arcs), des longueurs égales et de l\'angle droit : angle de'
    ' même mesure, ce que disent les codes d\'un triangle, phrases vraies d\'un quadrilatère',
    11, vs,
    [spec('Angles opposés : C pour A', 0, vs, {'k': 1, 'o': 0, 's': 0}, ['2'], 'correct'),
     spec('Trapèze isocèle : A pour B', 0, vs, {'k': 2, 'o': 1, 's': 1}, ['0'], 'correct'),
     spec('Erreur : l\'angle voisin', 0, vs, {'k': 1, 'o': 0, 's': 0}, ['1'], 'incorrect'),
     spec('Trapèze isocèle : D pour C', 0, vs, {'k': 2, 'o': 3, 's': 2}, ['3'], 'correct'),
     spec('Deux angles égaux', 1, vs, {'t': 0, 'o': 1}, ['0'], 'correct'),
     spec('Erreur : arcs lus comme longueurs', 1, vs, {'t': 0, 'o': 1}, ['2'], 'incorrect'),
     spec('Trois angles égaux', 1, vs, {'t': 1, 'o': 2}, ['1'], 'correct'),
     spec('Trapèze isocèle : 0, 1, 4', 2, vs, {'k': 1, 'o': 0}, ['0;1;4'], 'correct'),
     spec('Trapèze rectangle : 2, 3', 2, vs, {'k': 2, 'o': 1}, ['2;3'], 'correct'),
     spec('Une phrase oubliée : partiel', 2, vs, {'k': 1, 'o': 0}, ['0;4'], 'unoptimal_form'),
     spec('Erreur : une phrase de trop', 2, vs, {'k': 2, 'o': 1}, ['2;3;0'], 'incorrect')]))

# ======================================================================================
# 03. Les symboles ⊥, //, ∈, ∉ (CM2-088)
# ======================================================================================

FEN_D = '-5 ; 5 ; -5 ; 5'


def deux_droites(cas):
    """Droites (d) bleue et (d') rouge : 0 perpendiculaires (codées), 1 parallèles, 2 sécantes."""
    if cas == 1:
        lignes = ['O = point(0, 0, visible=faux)',
                  'M = point(O, longueur=1.2, angle=' + ev('t+90') + ', visible=faux)',
                  'N = point(O, longueur=1.2, angle=' + ev('t+270') + ', visible=faux)',
                  'U = point(M, longueur=3, angle={{t}}, visible=faux)',
                  'V = point(N, longueur=3, angle={{t}}, visible=faux)',
                  'droite(M, U, couleur="bleu", epaisseur=2)',
                  'droite(N, V, couleur="rouge", epaisseur=2)',
                  'LU = point(M, longueur=3.3, angle=' + ev('t+15') + ', visible=faux)',
                  'LV = point(N, longueur=3.3, angle=' + ev('t-15') + ', visible=faux)']
    else:
        ecart = '' if cas == 0 else '+g'
        lignes = ['O = point(0, 0, visible=faux)',
                  'U = point(O, longueur=3, angle={{t}}, visible=faux)',
                  'V = point(O, longueur=3, angle=' + ev('t+90' + ecart) + ', visible=faux)',
                  'droite(O, U, couleur="bleu", epaisseur=2)',
                  'droite(O, V, couleur="rouge", epaisseur=2)',
                  'LU = point(O, longueur=3.3, angle=' + ev('t+15') + ', visible=faux)',
                  'LV = point(O, longueur=3.3, angle=' + ev('t+90' + ecart + '+15')
                  + ', visible=faux)']
        if cas == 0:
            lignes.append('angle(U, O, V, marque="carre", couleur="noir")')
    lignes += ['texte(LU, "(d)")', 'texte(LV, "(d\')")']
    return '\n'.join(lignes)


ECRITURES = ['$(d) \\perp (d\')$', '$(d) \\parallel (d\')$', 'aucune des deux']
V1 = variation(
    'Quelle écriture est vraie ?\n\n'
    + figure(FEN_D, 'Une droite (d) bleue et une droite (d\') rouge.',
             selon('c', [deux_droites(c) for c in range(3)], 0))
    + choix(ECRITURES),
    [var('c', '0..2'), var('t', '0..179'), var('s', '0..1'), var('d', '25..35'),
     var('g', 'eval:(2*s-1)*d')],
    ['{{c}}'],
    ['$\\perp$ se lit « est perpendiculaire à » ; $\\parallel$ se lit « est parallèle à ».',
     selon('c', ['Le petit carré code un angle droit : $(d)$ et $(d\')$ sont perpendiculaires.'
                 ' On écrit $' + col('(d) \\perp (d\')') + '$.',
                 'L\'écart entre $(d)$ et $(d\')$ reste le même partout : elles sont parallèles.'
                 ' On écrit $' + col('(d) \\parallel (d\')') + '$.',
                 'Les droites se coupent, mais pas en angle droit : elles ne sont ni'
                 ' perpendiculaires ni parallèles. $' + col('\\text{Aucune des deux}')
                 + '$ écriture n\'est vraie.'], 0)])
SYMBOLES = ['$(d) \\perp (d\')$', '$(d) \\parallel (d\')$', '$A \\in (d)$', '$A \\notin (d)$']
SENS = ['Les droites $(d)$ et $(d\')$ sont perpendiculaires.',
        'Les droites $(d)$ et $(d\')$ sont parallèles.',
        'Le point $A$ est sur la droite $(d)$.',
        'Le point $A$ n\'est pas sur la droite $(d)$.']
V2 = variation(
    'Que veut dire l\'écriture ' + selon('k', SYMBOLES, 0) + ' ?' + choix(SENS, melanger=True),
    [var('k', '0..3')], ['{{k}}'],
    ['$\\perp$ : « est perpendiculaire à » ; $\\parallel$ : « est parallèle à » ; $\\in$ :'
     ' « appartient à » (est sur) ; $\\notin$ : « n\'appartient pas à ».',
     selon('k', SYMBOLES, 0) + ' se lit : **' + selon('k', SENS, 0) + '**'])
# Une droite (d) et trois points A, B, C ; motif p : quels points sont sur la droite.
SUR = [(1, 0, 0), (0, 1, 0), (0, 0, 1), (1, 1, 0), (1, 0, 1), (0, 1, 1)]
DIRS = [10, 35, 150, 165]
ABS = [-2.8, 0.2, 3.0]          # abscisses le long de la droite
DECAL = [1.3, -1.3, 1.3]        # écart des points hors de la droite
FEN_P = '-5 ; 5 ; -4 ; 4'


def huit(angle):
    noms = ['droite', 'haut-droite', 'haut', 'haut-gauche', 'gauche', 'bas-gauche', 'bas',
            'bas-droite']
    return noms[round((angle % 360) / 45) % 8]


def points_droite(o, p):
    a = math.radians(DIRS[o])
    u, n = (math.cos(a), math.sin(a)), (-math.sin(a), math.cos(a))
    lignes = ['P = point(0, 0, visible=faux)',
              f'Q = point({u[0]:.3f}, {u[1]:.3f}, visible=faux)',
              'droite(P, Q, couleur="bleu", epaisseur=2)',
              f'texte({4.2 * u[0] + 0.45 * n[0]:.2f}, {4.2 * u[1] + 0.45 * n[1]:.2f}, "(d)")']
    for j, x in enumerate(ABC):
        h = 0 if SUR[p][j] else DECAL[j]
        px, py = ABS[j] * u[0] + h * n[0], ABS[j] * u[1] + h * n[1]
        assert abs(px) < 4.6 and abs(py) < 3.6, (o, p, x, px, py)
        sens = DIRS[o] + 90 if (h > 0 or (h == 0 and j != 1)) else DIRS[o] - 90
        lignes.append(f'{x} = point({px:.2f}, {py:.2f}, etiquette="{huit(sens)}")')
    return '\n'.join(lignes)


APPART = ['$' + x + ' \\in (d)$' for x in ABC] + ['$' + x + ' \\notin (d)$' for x in ABC]
V3 = variation(
    'Coche **toutes** les écritures vraies.\n\n'
    + figure(FEN_P, 'Une droite (d) et trois points A, B, C ; certains sont sur la droite.',
             selon('o', [selon('p', [points_droite(o, p) for p in range(6)], 0)
                         for o in range(4)], 0))
    + choix(APPART, plusieurs=True),
    [var('o', '0..3'), var('p', '0..5')]
    + [table(n, 'p', [j if s[j] else 3 + j for s in SUR], 0) for j, n in enumerate('uvw')],
    ['{{u}};{{v}};{{w}}'],
    ['$\\in$ : le point est sur la droite ; $\\notin$ : il n\'est pas sur la droite. Pour chaque'
     ' point, une seule des deux écritures est vraie.',
     'Ici : ' + ' ; '.join('${{if:' + n + '==' + str(j) + '|' + x + ' \\in (d)|' + x
                           + ' \\notin (d)}}$' for j, (n, x) in enumerate(zip('uvw', ABC)))
     + '.'])
vs = [V1, V2, V3]
ecrire('03-les-symboles', modele(
    'Les symboles ⊥, //, ∈, ∉',
    'Écrire et lire les symboles : perpendiculaires (⊥) ou parallèles (//) sur une figure, sens'
    ' d\'une écriture, points sur une droite (∈, ∉)',
    12, vs,
    [spec('Perpendiculaires', 0, vs, {'c': 0, 't': 30, 's': 0, 'd': 30}, ['0'], 'correct'),
     spec('Parallèles', 0, vs, {'c': 1, 't': 120, 's': 0, 'd': 30}, ['1'], 'correct'),
     spec('Erreur : parallèles dites ⊥', 0, vs, {'c': 1, 't': 120, 's': 0, 'd': 30}, ['0'],
          'incorrect'),
     spec('Sécantes : aucune', 0, vs, {'c': 2, 't': 60, 's': 1, 'd': 28}, ['2'], 'correct'),
     spec('Erreur : sécantes dites ⊥', 0, vs, {'c': 2, 't': 60, 's': 1, 'd': 28}, ['0'],
          'incorrect'),
     spec('⊥ : perpendiculaires', 1, vs, {'k': 0}, ['0'], 'correct'),
     spec('Erreur : ⊥ lu parallèles', 1, vs, {'k': 0}, ['1'], 'incorrect'),
     spec('∉ : pas sur la droite', 1, vs, {'k': 3}, ['3'], 'correct'),
     spec('A seul sur (d)', 2, vs, {'o': 0, 'p': 0}, ['0;4;5'], 'correct'),
     spec('B et C sur (d)', 2, vs, {'o': 2, 'p': 5}, ['3;1;2'], 'correct'),
     spec('Erreur : ∈ pour un point hors de (d)', 2, vs, {'o': 0, 'p': 0}, ['0;1;5'],
          'incorrect'),
     spec('Une seule écriture : partiel', 2, vs, {'o': 1, 'p': 3}, ['0'], 'unoptimal_form')]))

# ======================================================================================
# 04. Nommer une figure (CM2-092)
# ======================================================================================

DEF12 = ['un polygone qui a trois côtés', 'un triangle qui a un angle droit',
         'un triangle qui a deux côtés de la même longueur',
         'un triangle qui a ses trois côtés de la même longueur', 'un polygone qui a quatre côtés',
         'un quadrilatère qui a quatre angles droits et quatre côtés de la même longueur',
         'un quadrilatère qui a quatre angles droits',
         'un quadrilatère qui a quatre côtés de la même longueur',
         'un quadrilatère qui a deux côtés opposés parallèles',
         'un trapèze qui a un angle droit', 'un polygone qui a cinq côtés',
         'un polygone qui a six côtés']
PARAL = 'On sait que $(AB) \\parallel (CD)$.'


def sous_titre(k):
    """Texte sous la figure : le parallélisme des trapèzes, rien pour les autres."""
    return selon(k, ['\n\n' + PARAL if n in TRAPEZES else '' for n in NOMS12], 0)


V1 = variation(
    'D\'après ses codes, quel est le nom le plus précis de cette figure ?\n\n'
    + figure(FEN, 'Une figure avec ses codes.',
             selon('k', [selon('o', [figure_usuelle(n, a) for a in ORIENT], 0) for n in NOMS12],
                   0))
    + sous_titre('k')
    + choix(NOMS12),
    [var('k', '0..11'), var('o', '0..2')], ['{{k}}'],
    ['On compte les côtés, puis on lit les codes : petits traits (côtés de même longueur),'
     ' petits carrés (angles droits), et ce que dit le texte (côtés parallèles).',
     'C\'est ' + selon('k', DEF12, 0) + ' : $' + col(
         selon('k', ['\\text{' + n + '}' for n in NOMS12], 0)) + '$.'])
V2 = variation(
    'Comment s\'appelle ' + selon('k', DEF12, 0) + ' ?' + choix(NOMS12),
    [var('k', '0..11')], ['{{k}}'],
    ['On relit la définition de chaque figure.',
     selon('k', [d[0].upper() + d[1:] for d in DEF12], 0) + ', c\'est un $'
     + col(selon('k', ['\\text{' + n + '}' for n in NOMS12], 0)) + '$.'])
# Polygones sans code, à compter : 3, 4, 5 ou 6 côtés ; deux formes chacun (une creuse).
POLY = [
    ([(0, 0), (5.5, 1.2), (1.5, 4)], [(0, 0), (6, 0), (-1, 2.5)]),
    ([(0, 0), (3, 1.5), (6, 0), (3, 4.5)], [(0, 0), (5.6, -0.8), (4.6, 3.6), (-0.4, 2.2)]),
    ([(0, 0), (5, 0), (5, 4), (2.5, 1.8), (0, 4)], [(0, 0), (4.2, -0.6), (5.4, 2.8), (2.2, 4.6),
                                                     (-0.8, 2.4)]),
    ([(0, 0), (5, 0), (5, 2), (2.4, 2), (2.4, 4.4), (0, 4.4)],
     [(0, 0), (3.8, -0.8), (6, 1.6), (4.8, 4.2), (1.4, 4.4), (-0.8, 2.0)]),
]
NOMS_POLY = ['triangle', 'quadrilatère', 'pentagone', 'hexagone']
V3 = variation(
    'Combien de côtés a ce polygone ? Quel est son nom ?\n\n'
    + figure(FEN, 'Un polygone sans code.',
             selon('k', [selon('o', [dessin(cadre(rot(POLY[k][o], [15, 200][o])),
                                            couleur='bleu') for o in range(2)], 0)
                         for k in range(4)], 0))
    + choix(NOMS_POLY),
    [var('k', '0..3'), var('o', '0..1'), var('n', 'eval:k+3')], ['{{k}}'],
    ['On compte les côtés un par un, en partant d\'un sommet et en faisant le tour (même quand'
     ' la figure a un creux).',
     'Il a ${{n}}$ côtés : c\'est un $' + col(selon('k', ['\\text{' + n + '}'
                                                         for n in NOMS_POLY], 0)) + '$.'])
vs = [V1, V2, V3]
ecrire('04-nommer-une-figure-cm2', modele(
    'Nommer une figure : du triangle à l\'hexagone',
    'Triangles, quadrilatère, carré, rectangle, losange, trapèze, trapèze rectangle, pentagone,'
    ' hexagone : nom le plus précis d\'après les codes, d\'après la définition ; polygones à'
    ' compter',
    13, vs,
    [spec('Trapèze', 0, vs, {'k': 8, 'o': 1}, ['8'], 'correct'),
     spec('Erreur : trapèze dit quadrilatère', 0, vs, {'k': 8, 'o': 1}, ['4'], 'incorrect'),
     spec('Trapèze rectangle', 0, vs, {'k': 9, 'o': 0}, ['9'], 'correct'),
     spec('Erreur : carré dit rectangle', 0, vs, {'k': 5, 'o': 2}, ['6'], 'incorrect'),
     spec('Hexagone', 0, vs, {'k': 11, 'o': 2}, ['11'], 'correct'),
     spec('Définition du trapèze', 1, vs, {'k': 8}, ['8'], 'correct'),
     spec('Définition du pentagone', 1, vs, {'k': 10}, ['10'], 'correct'),
     spec('Erreur : 5 côtés dit hexagone', 1, vs, {'k': 10}, ['11'], 'incorrect'),
     spec('Pentagone creux', 2, vs, {'k': 2, 'o': 0}, ['2'], 'correct'),
     spec('Erreur : pentagone dit hexagone', 2, vs, {'k': 2, 'o': 0}, ['3'], 'incorrect'),
     spec('Hexagone en L', 2, vs, {'k': 3, 'o': 0}, ['3'], 'correct')]))

# ======================================================================================
# 05. Propriétés des figures usuelles (CM2-093)
# ======================================================================================

PHRASES = [
    ['Les côtés opposés d\'un rectangle sont parallèles.',
     'Les quatre côtés d\'un rectangle ont toujours la même longueur.',
     'Un rectangle a deux angles droits.',
     'Deux côtés qui se suivent dans un rectangle sont parallèles.'],
    ['Les côtés opposés d\'un losange sont parallèles.', 'Un losange a quatre angles droits.',
     'Un losange a seulement deux côtés de la même longueur.',
     'Deux côtés qui se suivent dans un losange sont toujours perpendiculaires.'],
    ['Un carré a ses côtés opposés parallèles, quatre côtés de la même longueur et quatre'
     ' angles droits.', 'Un carré n\'a aucun côté parallèle à un autre.',
     'Un carré a deux côtés longs et deux côtés courts.', 'Un carré a un seul angle droit.'],
    ['Les trois côtés d\'un triangle équilatéral ont la même longueur.',
     'Un triangle équilatéral a un angle droit.',
     'Un triangle équilatéral a deux côtés parallèles.',
     'Un triangle équilatéral a seulement deux côtés de la même longueur.'],
    ['Un triangle isocèle a deux côtés de la même longueur.',
     'Un triangle isocèle a toujours un angle droit.',
     'Un triangle isocèle a deux côtés parallèles.',
     'Les trois côtés d\'un triangle isocèle ont toujours des longueurs différentes.'],
    ['Un triangle rectangle a un angle droit.', 'Un triangle rectangle a deux angles droits.',
     'Un triangle rectangle a deux côtés parallèles.',
     'Les trois côtés d\'un triangle rectangle ont toujours la même longueur.'],
    ['Un trapèze a deux côtés opposés parallèles.', 'Un trapèze a toujours quatre angles droits.',
     'Les quatre côtés d\'un trapèze ont toujours la même longueur.',
     'Un trapèze n\'a aucun côté parallèle à un autre.'],
    ['Un trapèze rectangle a deux angles droits.', 'Un trapèze rectangle a quatre angles droits.',
     'Un trapèze rectangle n\'a aucun côté parallèle à un autre.',
     'Un trapèze rectangle a un seul angle droit.'],
]
RAISONS = ['Un rectangle a quatre angles droits ; ses côtés opposés sont parallèles et de la'
           ' même longueur.',
           'Un losange a quatre côtés de la même longueur ; ses côtés opposés sont parallèles.',
           'Un carré est à la fois un rectangle et un losange.',
           'Un triangle équilatéral a trois côtés de la même longueur.',
           'Un triangle isocèle a (au moins) deux côtés de la même longueur.',
           'Un triangle rectangle a un angle droit, et un seul.',
           'Un trapèze est un quadrilatère qui a deux côtés opposés parallèles.',
           'Un trapèze rectangle est un trapèze qui a un angle droit ; ses deux côtés parallèles'
           ' sont perpendiculaires au même côté, il a donc deux angles droits.']
V1 = variation(
    'Quelle phrase est vraie ?\n\n```choix\n'
    + ''.join('- ' + selon('f', [p[n] for p in PHRASES]) + '\n' for n in range(4)) + '```',
    [var('f', f'1..{len(PHRASES)}')], ['0'],
    [selon('f', RAISONS), 'La phrase vraie : **' + selon('f', [p[0] for p in PHRASES]) + '**'])
# Trapèze ABCD, sommets nommés à partir du rang v ; ses bases sont les côtés 0 et 2 du dessin.
TRAP = FIGURES['trapèze'][0]
COTES4 = ['[AB]', '[BC]', '[CD]', '[DA]']


def trap_nomme(v, o):
    noms = [ABCD[(j + v) % 4] for j in range(4)]
    return dessin(cadre(rot(TRAP, ORIENT[o])), noms=noms)


# c = 2 v + w : v rang des noms, w base demandée (0 ou 1).
V2 = variation(
    '$ABCD$ est un trapèze : deux de ses côtés sont parallèles. Quel côté est parallèle au côté $'
    + selon('q', COTES4, 0) + '$ ?\n\n'
    + figure(FEN, 'Un trapèze ABCD.',
             selon('v', [selon('o', [trap_nomme(v, o) for o in range(3)], 0) for v in range(4)],
                   0))
    + choix(['$' + c + '$' for c in COTES4]),
    [var('c', '0..7'), var('o', '0..2'), table('v', 'c', [c // 2 for c in range(8)], 0),
     table('q', 'c', [(c // 2 + 2 * (c % 2)) % 4 for c in range(8)], 0),
     table('z', 'c', [(c // 2 + 2 + 2 * (c % 2)) % 4 for c in range(8)], 0)],
    ['{{z}}'],
    ['Dans un trapèze, deux côtés **opposés** sont parallèles : l\'écart entre eux reste le même'
     ' partout. Les deux autres se rapprochent.',
     'Le côté parallèle à $' + selon('q', COTES4, 0) + '$ est le côté opposé, $'
     + col(selon('z', COTES4, 0)) + '$.'])
OPTIONS = ['carré', 'rectangle', 'losange', 'trapèze', 'trapèze rectangle', 'quadrilatère']
QUESTIONS = ['ont leurs côtés opposés parallèles deux à deux',
             'ont toujours au moins deux angles droits',
             'ont toujours leurs quatre côtés de la même longueur']
REPONSES = [[0, 1, 2], [0, 1, 4], [0, 2, 2]]
POURQUOI = ['Le carré, le rectangle et le losange ont deux paires de côtés parallèles. Le'
            ' trapèze n\'en a qu\'une à coup sûr.',
            'Le carré et le rectangle ont quatre angles droits ; le trapèze rectangle en a deux.'
            ' Le losange et le trapèze n\'en ont pas forcément.',
            'Le carré et le losange ont quatre côtés de la même longueur ; le rectangle a deux'
            ' longueurs différentes.']
V3 = variation(
    'Coche **toutes** les figures qui ' + selon('k', QUESTIONS, 0) + '.'
    + choix(OPTIONS, plusieurs=True),
    [var('k', '0..2')] + [table(n, 'k', [r[m] for r in REPONSES], 0)
                          for m, n in enumerate('uvw')],
    ['{{u}};{{v}};{{w}}'],
    [selon('k', POURQUOI, 0),
     'Les figures à cocher : ' + selon('k', [' ; '.join('**' + OPTIONS[j] + '**'
                                                        for j in sorted(set(r)))
                                             for r in REPONSES], 0) + '.'])
DROITS = [('un trapèze rectangle', 2), ('un rectangle', 4), ('un carré', 4),
          ('un triangle rectangle', 1), ('un losange qui n\'est pas un carré', 0)]
V4 = variation(
    'Combien d\'angles droits a ' + selon('k', [n for n, _ in DROITS]) + ' ?\n\n'
    'Nombre d\'angles droits : $?$',
    [var('k', f'1..{len(DROITS)}'), table('z', 'k', [x for _, x in DROITS])], ['{{z}}'],
    [selon('k', ['Un trapèze rectangle a un angle droit ; ses deux côtés parallèles sont'
                 ' perpendiculaires au même côté, ce qui fait deux angles droits.',
                 'Un rectangle a quatre angles droits.',
                 'Un carré est un rectangle : quatre angles droits.',
                 'Un triangle rectangle a un angle droit, un seul.',
                 'Un losange qui n\'est pas un carré n\'a aucun angle droit.']),
     'Nombre d\'angles droits : $' + col('{{z}}') + '$.'])
vs = [V1, V2, V3, V4]
ecrire('05-proprietes-des-figures-cm2', modele(
    'Côtés parallèles, côtés égaux, angles droits : les figures usuelles',
    'Propriétés des triangles particuliers, du carré, du rectangle, du losange, du trapèze et du'
    ' trapèze rectangle : phrase vraie, côtés parallèles du trapèze, figures à cocher, angles'
    ' droits',
    14, vs,
    [spec('Phrase vraie du trapèze', 0, vs, {'f': 7}, ['0'], 'correct'),
     spec('Erreur : le trapèze rectangle a 1 angle droit', 0, vs, {'f': 8}, ['3'], 'incorrect'),
     spec('Trapèze : parallèle à [AB] (v = 0)', 1, vs, {'c': 0, 'o': 0}, ['2'], 'correct'),
     spec('Trapèze : parallèle à [DA] (v = 1, w = 1)', 1, vs, {'c': 3, 'o': 1}, ['1'], 'correct'),
     spec('Erreur : côté consécutif', 1, vs, {'c': 0, 'o': 0}, ['1'], 'incorrect'),
     spec('Côtés opposés parallèles deux à deux', 2, vs, {'k': 0}, ['0;1;2'], 'correct'),
     spec('Erreur : le trapèze coché', 2, vs, {'k': 0}, ['0;1;2;3'], 'incorrect'),
     spec('Au moins deux angles droits', 2, vs, {'k': 1}, ['0;1;4'], 'correct'),
     spec('Quatre côtés égaux', 2, vs, {'k': 2}, ['0;2'], 'correct'),
     spec('Trapèze rectangle : 2', 3, vs, {'k': 1}, ['2'], 'correct'),
     spec('Erreur : 1 angle droit au trapèze rectangle', 3, vs, {'k': 1}, ['1'], 'incorrect'),
     spec('Losange : 0', 3, vs, {'k': 5}, ['0'], 'correct')]))

# ============================================================================

os.makedirs(DOSSIER, exist_ok=True)
for nom, mod in MODELES.items():
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(mod, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
