"""Écrit les 7 modèles du lot 8c du CM1 (géométrie plane) dans scripts/questions/cm1-8c/.

Phase 0 validée par David le 2026-11-18 (§ 23 et 23 bis du journal
`docs/archive/wip/questions-cm1-progress.md`) : 7 modèles (CM1-098 à 103, 106), tout en bloc ```figure ;
niveaux CM1 et CM2 pour 099, 100, 101 (jumeaux CM2-091, 089, 090) ; CM1 seul pour 098, 102,
103, 106 (le CM2 ajoute angles égaux, ⊥, //, trapèze, pentagone, hexagone).

Bornes (`cycle3.json`) : 098 codes de l'angle droit et des longueurs égales ; 099 disque, cercle,
centre, rayon, diamètre, corde, arc ; 102 triangle, triangle rectangle, isocèle, équilatéral,
quadrilatère, carré, rectangle, losange (pas de trapèze, pentagone, hexagone) ; 103 mêmes figures.

Patrons : CE2 `ce2-8/` (codes, figures, axes), 6e `6-distances-cercle-mediatrice/03` (cercle).

Pièges (journal, doc § 9) : `i` et `e` jamais comme variables ; dans une variable, `eval:` sans
`==` (indicatrices) ; la case choix répond par l'indice d'origine ; le corrigé nomme la bonne
réponse, jamais son rang ; aucun `|` dans un texte placé dans un `{{if:}}` ; réponse attendue
sans `{{if:}}` imbriqué (variable calculée, `student-answer-safety`).

    python3 docs/wip/questions/lot-cm1-8c.py scripts/questions/cm1-8c
"""
import json
import math
import os
import sys

DOSSIER = sys.argv[1]
MODELES = {}

# ---- Gabarits ----


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(enonce, variables, reponses, etapes):
    return {'statement': enonce, 'variables': variables,
            'blanks': [r if isinstance(r, dict) else {'expectedAnswer': r} for r in reponses],
            'correction': {'steps': etapes}}


def modele(title, description, niveau, variations, specs, grades=('CM1', 'CM2'), delay=90):
    return {'title': title, 'description': description, 'grades': list(grades), 'level': niveau,
            'delay': delay, 'status': 'draft', 'variations': variations, 'testSpecs': specs}


def ecrire(nom, mod):
    MODELES[nom] = mod


FONCTIONS = {'__builtins__': {}, 'floor': math.floor, 'mod': lambda a, b: a % b, 'abs': abs,
             'max': max, 'min': min}


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


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def selon(k, textes, n=1):
    """`{{if:k==n|…|{{if:k==n+1|…|…}}}}` : le texte numéro m pour k == n + m."""
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


def choix(lignes, melanger=False):
    tete = '' if melanger else 'melanger: non\n'
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


def place(p, pts):
    cx = sum(q[0] for q in pts) / len(pts)
    cy = sum(q[1] for q in pts) / len(pts)
    dx, dy = p[0] - cx, p[1] - cy
    v = 'haut' if dy > abs(dx) / 2 else 'bas' if dy < -abs(dx) / 2 else ''
    h = 'droite' if dx > abs(dy) / 2 else 'gauche' if dx < -abs(dy) / 2 else ''
    return (v + '-' + h).strip('-') or 'haut'


def dessin(pts, noms=None, traits=None, droits=(), couleur='bleu', prefixe='p', extra=''):
    """Polygone ; `noms` : lettres des sommets (sinon cachés) ; `traits` : {côté j : nombre de
    traits} ; `droits` : sommets codés d'un angle droit."""
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
    return '\n'.join(lignes) + ('\n' + extra if extra else '')


def verifie_droits(pts, droits, nom):
    for j in range(len(pts)):
        a = angle_en(pts, j)
        if j in droits:
            assert abs(a - 90) < 0.5, (nom, j, a)
        else:
            assert abs(a - 90) > 14, (nom, 'angle presque droit', j, a)


# Figures usuelles, en coordonnées locales (le nom, les côtés codés, les angles droits).
def regulier(n, r, debut):
    return [(r * math.cos(math.radians(debut + 360 * j / n)),
             r * math.sin(math.radians(debut + 360 * j / n))) for j in range(n)]


FIGURES = {
    'triangle': ([(0, 0), (6.4, 0), (-1.0, 3.0)], {}, ()),
    'triangle rectangle': ([(0, 0), (5.6, 0), (0, 3.4)], {}, (0,)),
    'triangle isocèle': ([(-1.9, 0), (1.9, 0), (0, 4.6)], {1: 1, 2: 1}, ()),
    'triangle équilatéral': (regulier(3, 2.7, 90), {0: 1, 1: 1, 2: 1}, ()),
    'quadrilatère': ([(0, 0), (6.5, 0.5), (3.7, 3.9), (1.0, 3.5)], {}, ()),
    'carré': ([(0, 0), (4, 0), (4, 4), (0, 4)], {0: 1, 1: 1, 2: 1, 3: 1}, (0, 1, 2, 3)),
    'rectangle': ([(0, 0), (6.4, 0), (6.4, 3.4), (0, 3.4)], {}, (0, 1, 2, 3)),
    'losange': ([(0, -1.9), (3.2, 0), (0, 1.9), (-3.2, 0)], {0: 1, 1: 1, 2: 1, 3: 1}, ()),
}
NOMS8 = list(FIGURES)
ARTICLE = {'triangle': 'ce triangle', 'triangle rectangle': 'ce triangle rectangle',
           'triangle isocèle': 'ce triangle isocèle', 'triangle équilatéral':
           'ce triangle équilatéral', 'quadrilatère': 'ce quadrilatère', 'carré': 'ce carré',
           'rectangle': 'ce rectangle', 'losange': 'ce losange'}
for _nom, (_p, _t, _d) in FIGURES.items():
    verifie_droits(_p, _d, _nom)
    if not _t:
        continue
    _l = [round(cote(_p, j), 3) for j in _t]
    assert len(set(_l)) == 1, (_nom, _l)
# Les figures sans code de longueur n'ont pas deux côtés égaux (triangle, quadrilatère).
for _nom in ('triangle', 'quadrilatère', 'triangle rectangle'):
    _p = FIGURES[_nom][0]
    _l = sorted(cote(_p, j) for j in range(len(_p)))
    assert all(b - a > 0.4 for a, b in zip(_l, _l[1:])), (_nom, _l)


def figure_usuelle(nom, angle, codes=True, couleur='bleu', prefixe='p', **kw):
    pts, traits, droits = FIGURES[nom]
    pts = cadre(rot(pts, angle), **kw)
    return dessin(pts, traits=traits if codes else None, droits=droits if codes else (),
                  couleur=couleur, prefixe=prefixe)


ORIENT = [0, 35, 160]

# ======================================================================================
# 01. Lire les codes d'une figure (CM1-098)
# ======================================================================================

ABCD = ['A', 'B', 'C', 'D']
# Quadrilatères à un seul angle droit, au sommet 0 ; les trois autres loin de l'angle droit.
QUADS = [([(0, 0), (5, 0), (2.5, 5.5), (0, 3)], 10),
         ([(0, 0), (5, 0), (7, 5.5), (0, 3)], 200),
         ([(0, 0), (6, 0), (2.5, 4), (0, 3)], 120),
         ([(0, 0), (6, 0), (2.5, 4), (0, 3)], 290)]
for _q, _a in QUADS:
    verifie_droits(_q, (0,), 'quad')


def quad_code(q, v):
    pts, a = QUADS[q]
    pts = cadre(rot(pts, a))
    noms = [ABCD[(j + v) % 4] for j in range(4)]
    return dessin(pts, noms=noms, droits=(0,))


V1 = variation(
    'D\'après les codes, quel angle est droit ?\n\n'
    + figure(FEN, 'Un quadrilatère ABCD ; un de ses angles est codé par un petit carré.',
             selon('k', [selon('v', [quad_code(q, v) for v in range(4)], 0)
                         for q in range(len(QUADS))]))
    + choix(['l\'angle de sommet ' + x for x in ABCD]),
    [var('k', f'1..{len(QUADS)}'), var('v', '0..3')], ['{{v}}'],
    ['Le **petit carré** dans un coin est le code de l\'angle droit.',
     'Il est dessiné au sommet $' + selon('v', ABCD, 0) + '$ : l\'angle de sommet $'
     + col(selon('v', ABCD, 0)) + '$ est droit.',
     'Les autres angles n\'ont pas de code : on ne peut pas dire qu\'ils sont droits.'])

# Cerf-volant : AB = DA (un trait), BC = CD (deux traits).
CERF = [(0, 2.6), (2.2, 0.6), (0, -3.0), (-2.2, 0.6)]
assert abs(cote(CERF, 0) - cote(CERF, 3)) < 1e-9 and abs(cote(CERF, 1) - cote(CERF, 2)) < 1e-9
CERF_ROT = [0, 90, 200, 270]


def cerf(k):
    pts = cadre(rot(CERF, CERF_ROT[k]), haut=5.4)
    return dessin(pts, noms=ABCD, traits={0: 1, 3: 1, 1: 2, 2: 2})


V2 = variation(
    'La figure n\'est pas en vraie grandeur. $[AB]$ mesure ${{a}}~\\unit{cm}$ et $[BC]$ mesure'
    ' ${{b}}~\\unit{cm}$.\n\n'
    + figure(FEN, 'Un quadrilatère ABCD ; [AB] et [DA] codés d\'un trait, [BC] et [CD] de deux'
             ' traits.', selon('k', [cerf(k) for k in range(len(CERF_ROT))]))
    + '\n\nCombien mesure $[{{if:q==1|DA|CD}}]$ ?\n\n$[{{if:q==1|DA|CD}}]$ mesure'
    ' $?~\\unit{cm}$.',
    [var('k', f'1..{len(CERF_ROT)}'), var('q', '1..2'), var('a', '3..6'), var('d', '2..4'),
     var('b', 'eval:a+d'), var('r', 'eval:(2-q)*a+(q-1)*b')],
    ['{{r}}'],
    ['**Même nombre de traits, même longueur.**',
     '{{if:q==1|$[DA]$ a un trait, comme $[AB]$ : il mesure aussi|$[CD]$ a deux traits, comme'
     ' $[BC]$ : il mesure aussi}} $' + col('{{r}}~\\unit{cm}') + '$.'])

# Triangles codés : 0 isocèle, 1 équilatéral, 2 rectangle, 3 rectangle et isocèle.
TRI_CODES = [
    ([(-1.6, 0), (1.6, 0), (0, 4.4)], {1: 1, 2: 1}, ()),
    (regulier(3, 2.7, 90), {0: 1, 1: 1, 2: 1}, ()),
    ([(0, 0), (5.6, 0), (0, 3.4)], {}, (0,)),
    ([(0, 0), (4.4, 0), (0, 4.4)], {0: 1, 2: 1}, (0,)),
]
PHRASES_TRI = ['Deux côtés ont la même longueur.', 'Les trois côtés ont la même longueur.',
               'Le triangle a un angle droit.',
               'Le triangle a un angle droit et deux côtés de la même longueur.']


def tri_code(t, o):
    pts, traits, droits = TRI_CODES[t]
    return dessin(cadre(rot(pts, ORIENT[o])), traits=traits, droits=droits)


V3 = variation(
    'Que disent les codes de ce triangle ?\n\n'
    + figure(FEN, 'Un triangle avec ses codes.',
             selon('t', [selon('o', [tri_code(t, o) for o in range(3)], 0) for t in range(4)], 0))
    + choix(PHRASES_TRI),
    [var('t', '0..3'), var('o', '0..2')], ['{{t}}'],
    ['Les petits traits marquent les côtés de même longueur ; le petit carré marque l\'angle'
     ' droit.',
     selon('t', ['Deux côtés portent un trait, le troisième n\'en a pas, et il n\'y a pas de'
                 ' petit carré.', 'Les trois côtés portent un trait.',
                 'Un petit carré, et aucun trait sur les côtés.',
                 'Un petit carré, et deux côtés portent un trait.'], 0),
     'Les codes disent : ' + selon('t', ['**' + p + '**' for p in PHRASES_TRI], 0)])
vs = [V1, V2, V3]
ecrire('01-lire-les-codes', modele(
    'Lire les codes d\'une figure',
    'Codes de l\'angle droit et des longueurs égales : quel angle est droit, quelle longueur a'
    ' un côté codé, que disent les codes d\'un triangle',
    3, vs,
    [spec('Angle droit en C', 0, vs, {'k': 2, 'v': 2}, ['2'], 'correct'),
     spec('Erreur : angle en A', 0, vs, {'k': 2, 'v': 2}, ['0'], 'incorrect'),
     spec('[DA] = [AB] = 4', 1, vs, {'k': 1, 'q': 1, 'a': 4, 'd': 3}, ['4'], 'correct'),
     spec('[CD] = [BC] = 7', 1, vs, {'k': 3, 'q': 2, 'a': 4, 'd': 3}, ['7'], 'correct'),
     spec('Erreur : [CD] pris égal à [AB]', 1, vs, {'k': 3, 'q': 2, 'a': 4, 'd': 3}, ['4'],
          'incorrect'),
     spec('Équilatéral', 2, vs, {'t': 1, 'o': 1}, ['1'], 'correct'),
     spec('Rectangle et isocèle', 2, vs, {'t': 3, 'o': 0}, ['3'], 'correct'),
     spec('Erreur : rectangle et isocèle dit rectangle', 2, vs, {'t': 3, 'o': 0}, ['2'],
          'incorrect')],
    grades=('CM1',)))

# ======================================================================================
# 02. Cercle, disque, rayon, diamètre, corde, arc (CM1-099 / CM2-091)
# ======================================================================================

ELEMENTS = [
    'A = point(O, longueur=3, angle={{t}}, visible=faux)\n'
    'segment(O, A, couleur="rouge", epaisseur=4)',
    'A = point(O, longueur=3, angle={{t}}, visible=faux)\n'
    'B = point(O, longueur=3, angle=' + ev('t+180') + ', visible=faux)\n'
    'segment(A, B, couleur="rouge", epaisseur=4)',
    'A = point(O, longueur=3, angle={{t}}, visible=faux)\n'
    'B = point(O, longueur=3, angle=' + ev('t+100') + ', visible=faux)\n'
    'segment(A, B, couleur="rouge", epaisseur=4)',
    'arc(O, rayon=3, debut={{t}}, fin=' + ev('t+100') + ', couleur="rouge", epaisseur=4)',
]
NOMS_EL = ['un rayon', 'un diamètre', 'une corde', 'un arc de cercle']
V1 = variation(
    'Voici un cercle de centre $O$. Comment s\'appelle le trait rouge ?\n\n'
    + figure('-4 ; 4 ; -3.8 ; 3.8', 'Un cercle de centre O et un trait rouge.',
             'O = point(0, 0, etiquette="bas-droite")\ncercle(O, rayon=3, epaisseur=2)\n'
             + selon('k', ELEMENTS, 0))
    + choix(NOMS_EL),
    [var('k', '0..3'), var('t', '0..359')], ['{{k}}'],
    ['Un **rayon** va du centre à un point du cercle. Un **diamètre** relie deux points du'
     ' cercle en passant par le centre. Une **corde** relie deux points du cercle. Un **arc**'
     ' est un morceau du cercle lui-même.',
     selon('k', ['Le trait rouge part du centre $O$ et s\'arrête sur le cercle :',
                 'Le trait rouge relie deux points du cercle et passe par le centre $O$ :',
                 'Le trait rouge relie deux points du cercle sans passer par le centre :',
                 'Le trait rouge est posé sur le cercle, il en suit la courbe :'], 0)
     + ' c\'est ' + selon('k', ['**' + n + '**' for n in NOMS_EL], 0) + '.'])
V2 = variation(
    'La figure bleue est-elle un cercle ou un disque ?\n\n'
    + figure('-3 ; 3 ; -2.8 ; 2.8', 'Une figure bleue : {{if:k==1|un cercle (la ligne seule)|un'
             ' disque (la surface coloriée et son bord)}}.',
             'O = point(0, 0, etiquette="bas-droite")\ncercle(O, rayon=2.2, couleur="bleu",'
             ' epaisseur=2, remplissage="bleu", opacite_fond={{if:k==1|0|0.45}})')
    + choix(['un cercle', 'un disque']),
    [var('k', '1..2'), var('j', 'eval:k-1')], ['{{j}}'],
    ['Le **cercle** est la ligne : tous ses points sont à la même distance du centre. Le'
     ' **disque** est toute la surface à l\'intérieur, avec son bord.',
     'Ici, {{if:k==1|seule la ligne est tracée : c\'est $' + col('\\text{un cercle}')
     + '$.|la surface est coloriée : c\'est $' + col('\\text{un disque}') + '$.}}'])
# Trois points A, B, C : l'un dedans (rang 0), l'un sur le cercle (1), l'un dehors (2).
PERMS = [(0, 1, 2), (0, 2, 1), (1, 0, 2), (1, 2, 0), (2, 0, 1), (2, 1, 0)]
ABC = ['A', 'B', 'C']


def distance(lettre):
    n = ABC.index(lettre)
    return var('d' + lettre, 'eval:' + '+'.join(
        f'{ind("w", m)}*' + ['(r-p)', 'r', '(r+s)'][o[n]] for m, o in enumerate(PERMS)))


V3 = variation(
    'Un cercle a pour centre le point $O$ et pour rayon ${{r}}~\\unit{cm}$. On sait que'
    ' $OA = {{dA}}~\\unit{cm}$, $OB = {{dB}}~\\unit{cm}$ et $OC = {{dC}}~\\unit{cm}$.\n\n'
    'Quel point est {{if:q==1|sur le cercle|à l\'extérieur du disque}} ?'
    + choix(['le point ' + x for x in ABC]),
    [var('q', '1..2'), var('w', '0..5'), var('r', '3..8'), var('p', '1..2'), var('s', '1..3')]
    + [distance(x) for x in ABC]
    + [table('u', 'w', [o.index(1) for o in PERMS], 0),
       table('x', 'w', [o.index(2) for o in PERMS], 0),
       var('z', 'eval:(2-q)*u+(q-1)*x')],
    ['{{z}}'],
    ['Les points **du cercle** sont tous à ${{r}}~\\unit{cm}$ de $O$ (le rayon). Plus près de'
     ' $O$, on est à l\'intérieur ; plus loin, on est à l\'extérieur du disque.',
     '{{if:q==1|Le point à exactement ${{r}}~\\unit{cm}$ de $O$ est sur le cercle|Le point à'
     ' plus de ${{r}}~\\unit{cm}$ de $O$ est à l\'extérieur du disque}} : c\'est le point $'
     + col('{{if:z==0|A|{{if:z==1|B|C}}}}') + '$.'])
V4 = variation(
    '{{if:k==1|Le rayon d\'un cercle mesure ${{r}}~\\unit{cm}$. Combien mesure son diamètre ?'
    '\n\nDiamètre : $?~\\unit{cm}$|Le diamètre d\'un cercle mesure ' + '$' + ev('2*r')
    + '~\\unit{cm}$. Combien mesure son rayon ?\n\nRayon : $?~\\unit{cm}$}}',
    [var('k', '1..2'), var('r', '2..9'), var('y', 'eval:(3-k)*r')], ['{{y}}'],
    ['Le **diamètre** traverse le cercle en passant par le centre : c\'est deux rayons bout à'
     ' bout.',
     '{{if:k==1|$2 \\times {{r}} = ' + col('{{y}}~\\unit{cm}') + '$.|$' + ev('2*r')
     + ' \\div 2 = ' + col('{{y}}~\\unit{cm}') + '$.}}'])
vs = [V1, V2, V3, V4]
ecrire('02-cercle-et-disque', modele(
    'Cercle, disque, rayon, diamètre, corde, arc',
    'Nommer rayon, diamètre, corde, arc ; cercle ou disque ; le cercle comme points à la même'
    ' distance du centre ; rayon et diamètre (entiers)',
    1, vs,
    [spec('Corde', 0, vs, {'k': 2, 't': 40}, ['2'], 'correct'),
     spec('Erreur : corde dite diamètre', 0, vs, {'k': 2, 't': 40}, ['1'], 'incorrect'),
     spec('Arc', 0, vs, {'k': 3, 't': 200}, ['3'], 'correct'),
     spec('Disque', 1, vs, {'k': 2}, ['1'], 'correct'),
     spec('Erreur : disque dit cercle', 1, vs, {'k': 2}, ['0'], 'incorrect'),
     spec('Sur le cercle : B (w = 0)', 2, vs, {'q': 1, 'w': 0, 'r': 5, 'p': 1, 's': 2}, ['1'],
          'correct'),
     spec('Dehors : A (w = 5)', 2, vs, {'q': 2, 'w': 5, 'r': 5, 'p': 1, 's': 2}, ['0'],
          'correct'),
     spec('Erreur : le point dedans', 2, vs, {'q': 1, 'w': 0, 'r': 5, 'p': 1, 's': 2}, ['0'],
          'incorrect'),
     spec('Rayon 7 → diamètre 14', 3, vs, {'k': 1, 'r': 7}, ['14'], 'correct'),
     spec('Diamètre 12 → rayon 6', 3, vs, {'k': 2, 'r': 6}, ['6'], 'correct'),
     spec('Erreur : le double au lieu de la moitié', 3, vs, {'k': 2, 'r': 6}, ['24'],
          'incorrect')]))

# ======================================================================================
# 03 et 04. Droites perpendiculaires, droites parallèles (CM1-100, 101 / CM2-089, 090)
# ======================================================================================

FEN_D = '-5 ; 5 ; -4 ; 4'


def deux_droites(t, ecart, parallele, p=''):
    """Deux droites : la bleue de direction t ; la rouge de direction t + 90 + écart
    (perpendiculaire) ou t + écart (parallèle, à 2,4 de la bleue). Expressions `eval`."""
    if parallele:
        return '\n'.join([
            f'{p}O = point(0, 0, visible=faux)',
            f'{p}M = point({p}O, longueur=1.2, angle=' + ev(f'{t}+90') + ', visible=faux)',
            f'{p}N = point({p}O, longueur=1.2, angle=' + ev(f'{t}+270') + ', visible=faux)',
            f'{p}U = point({p}M, longueur=3, angle=' + ev(t) + ', visible=faux)',
            f'{p}V = point({p}N, longueur=3, angle=' + ev(f'{t}+{ecart}') + ', visible=faux)',
            f'droite({p}M, {p}U, couleur="bleu", epaisseur=2)',
            f'droite({p}N, {p}V, couleur="rouge", epaisseur=2)'])
    return '\n'.join([
        f'{p}O = point(0, 0, visible=faux)',
        f'{p}U = point({p}O, longueur=3, angle=' + ev(t) + ', visible=faux)',
        f'{p}V = point({p}O, longueur=3, angle=' + ev(f'{t}+90+{ecart}') + ', visible=faux)',
        f'droite({p}O, {p}U, couleur="bleu", epaisseur=2)',
        f'droite({p}O, {p}V, couleur="rouge", epaisseur=2)'])


COULEURS = ['bleue', 'rouge', 'verte']
COUL_DSL = ['bleu', 'rouge', 'vert']


def quatre_droites(parallele):
    """Une droite noire de direction t ; trois droites de couleur, celle numéro w
    perpendiculaire (ou parallèle) à la noire, les autres décalées de g0, g1, g2 degrés."""
    lignes = ['O = point(0, 0, visible=faux)',
              'U = point(O, longueur=3, angle={{t}}, visible=faux)',
              'droite(O, U, couleur="noir", epaisseur=3)']
    for n in range(3):
        if parallele:
            dist, cote_ = [2.6, 1.4, 3.3][n], [270, 90, 90][n]
            lignes.append(f'X{n} = point(O, longueur={dist}, angle=' + ev(f't+{cote_}')
                          + ', visible=faux)')
            lignes.append(f'Y{n} = point(X{n}, longueur=3, angle=' + ev(f't+g{n}')
                          + ', visible=faux)')
        else:
            pos, sens = [3, 0, 3][n], [180, 0, 0][n]
            lignes.append(f'X{n} = point(O, longueur={pos}, angle=' + ev(f't+{sens}')
                          + ', visible=faux)' if pos else f'X{n} = point(0, 0, visible=faux)')
            lignes.append(f'Y{n} = point(X{n}, longueur=3, angle=' + ev(f't+90+g{n}')
                          + ', visible=faux)')
        lignes.append(f'droite(X{n}, Y{n}, couleur="{COUL_DSL[n]}", epaisseur=2)')
    return '\n'.join(lignes)


def ecarts(bornes):
    """g_n = 0 pour la droite numéro w, ± d_n sinon."""
    vs_ = [var('w', '0..2'), var('t', '0..179')]
    for n, (a, b) in enumerate(bornes):
        vs_ += [var(f'd{n}', f'{a}..{b}'), var(f's{n}', '0..1'),
                var(f'g{n}', f'eval:(1-{ind("w", n)})*(2*s{n}-1)*d{n}')]
    return vs_


EQUERRE = ('On pose le coin de l\'équerre (ou le coin d\'une feuille) là où les droites se'
           ' coupent, un bord le long d\'une droite.')
V1 = variation(
    'Ces deux droites sont-elles perpendiculaires ?\n\n'
    + figure(FEN_D, 'Une droite bleue et une droite rouge qui se coupent.',
             deux_droites('t', 'g', False))
    + choix(['Oui, elles sont perpendiculaires.', 'Non, elles ne sont pas perpendiculaires.']),
    [var('c', '0..1'), var('s', '0..1'), var('d', '20..35'), var('t', '0..179'),
     var('g', 'eval:c*(2*s-1)*d')],
    ['{{c}}'],
    ['Deux droites **perpendiculaires** se coupent en formant un angle droit.', EQUERRE,
     '{{if:c==0|L\'autre droite suit exactement l\'autre bord : elles sont $'
     + col('\\text{perpendiculaires}') + '$.|L\'autre droite s\'écarte du bord de l\'équerre :'
     ' elles ne sont $' + col('\\text{pas perpendiculaires}') + '$.}}'])
V2 = variation(
    'Sur quel dessin les deux droites sont-elles perpendiculaires ?'
    + choix_figures([(FEN_D, 'Deux droites qui se coupent.', deux_droites(f't{n}', g, False,
                                                                           'abc'[n]))
                     for n, g in enumerate(['0', 'g1', 'g2'])]),
    [var('t0', '0..179'), var('t1', '0..179'), var('t2', '0..179'), var('g1', '20..30'),
     var('g2', '-35..-25')],
    ['0'],
    ['Deux droites **perpendiculaires** se coupent en formant un angle droit.', EQUERRE,
     'Sur un seul dessin, l\'angle est droit : c\'est lui. Sur les deux autres, l\'angle est'
     ' plus petit ou plus grand qu\'un angle droit.'])
V3 = variation(
    'Quelle droite est perpendiculaire à la droite noire ?\n\n'
    + figure('-5 ; 5 ; -5 ; 5', 'Une droite noire et trois droites de couleur, bleue, rouge et'
             ' verte.', quatre_droites(False))
    + choix(['la droite ' + c for c in COULEURS]),
    ecarts([(20, 35), (20, 35), (20, 35)]), ['{{w}}'],
    ['On vérifie chaque droite de couleur avec l\'équerre, posée là où elle coupe la droite'
     ' noire.',
     'Seule la droite ' + selon('w', ['**' + c + '**' for c in COULEURS], 0) + ' fait un angle'
     ' droit avec la droite noire : c\'est $' + col(selon('w', ['\\text{la droite ' + c + '}'
                                                             for c in COULEURS], 0)) + '$.'])
vs = [V1, V2, V3]
ecrire('03-droites-perpendiculaires', modele(
    'Ces droites sont-elles perpendiculaires ?',
    'Reconnaître des droites perpendiculaires (sans code) : oui ou non, quel dessin, quelle'
    ' droite parmi trois',
    1, vs,
    [spec('Perpendiculaires', 0, vs, {'c': 0, 's': 1, 'd': 25, 't': 30}, ['0'], 'correct'),
     spec('Non (écart 25)', 0, vs, {'c': 1, 's': 1, 'd': 25, 't': 30}, ['1'], 'correct'),
     spec('Erreur : sécantes dites perpendiculaires', 0, vs,
          {'c': 1, 's': 0, 'd': 30, 't': 100}, ['0'], 'incorrect'),
     spec('Le bon dessin', 1, vs, {'t0': 20, 't1': 60, 't2': 140, 'g1': 25, 'g2': -30}, ['0'],
          'correct'),
     spec('Erreur : dessin à 115°', 1, vs, {'t0': 20, 't1': 60, 't2': 140, 'g1': 25, 'g2': -30},
          ['1'], 'incorrect'),
     spec('La rouge', 2, vs, {'w': 1, 't': 20, 'd0': 25, 's0': 0, 'd1': 30, 's1': 1, 'd2': 22,
                               's2': 1}, ['1'], 'correct'),
     spec('Erreur : la verte', 2, vs, {'w': 1, 't': 20, 'd0': 25, 's0': 0, 'd1': 30, 's1': 1,
                                       'd2': 22, 's2': 1}, ['2'], 'incorrect')]))

ECART = ('On mesure l\'écart entre les deux droites à deux endroits éloignés (avec la règle, ou'
         ' en comptant à l\'œil).')
V1 = variation(
    'Ces deux droites sont-elles parallèles ?\n\n'
    + figure(FEN_D, 'Une droite bleue et une droite rouge.', deux_droites('t', 'g', True))
    + choix(['Oui, elles sont parallèles.', 'Non, elles ne sont pas parallèles.']),
    [var('c', '0..1'), var('s', '0..1'), var('d', '10..16'), var('t', '0..179'),
     var('g', 'eval:c*(2*s-1)*d')],
    ['{{c}}'],
    ['Deux droites **parallèles** ne se coupent jamais : l\'écart entre elles reste le même'
     ' partout.', ECART,
     '{{if:c==0|L\'écart est le même partout : elles sont $' + col('\\text{parallèles}')
     + '$.|L\'écart change : les droites finiraient par se couper, elles ne sont $'
     + col('\\text{pas parallèles}') + '$.}}'])
V2 = variation(
    'Sur quel dessin les deux droites sont-elles parallèles ?'
    + choix_figures([(FEN_D, 'Deux droites.', deux_droites(f't{n}', g, True, 'abc'[n]))
                     for n, g in enumerate(['0', 'g1', 'g2'])]),
    [var('t0', '0..179'), var('t1', '0..179'), var('t2', '0..179'), var('g1', '12..16'),
     var('g2', '-24..-18')],
    ['0'],
    ['Deux droites **parallèles** ne se coupent jamais : l\'écart entre elles reste le même'
     ' partout.', ECART,
     'Sur un seul dessin, l\'écart ne change pas : c\'est lui. Sur les deux autres, les droites'
     ' se rapprochent d\'un côté.'])
V3 = variation(
    'Quelle droite est parallèle à la droite noire ?\n\n'
    + figure('-5 ; 5 ; -5 ; 5', 'Une droite noire et trois droites de couleur, bleue, rouge et'
             ' verte.', quatre_droites(True))
    + choix(['la droite ' + c for c in COULEURS]),
    ecarts([(8, 11), (14, 20), (20, 28)]), ['{{w}}'],
    ['On mesure, pour chaque droite de couleur, son écart avec la droite noire à deux endroits'
     ' éloignés.',
     'Seule la droite ' + selon('w', ['**' + c + '**' for c in COULEURS], 0) + ' reste toujours'
     ' à la même distance de la droite noire : c\'est $'
     + col(selon('w', ['\\text{la droite ' + c + '}' for c in COULEURS], 0)) + '$. Attention à'
     ' celle qui est presque parallèle : son écart change un peu.'])
vs = [V1, V2, V3]
ecrire('04-droites-paralleles', modele(
    'Ces droites sont-elles parallèles ?',
    'Reconnaître des droites parallèles : oui ou non, quel dessin, quelle droite parmi trois'
    ' (dont une presque parallèle)',
    2, vs,
    [spec('Parallèles', 0, vs, {'c': 0, 's': 0, 'd': 12, 't': 20}, ['0'], 'correct'),
     spec('Non (écart 12)', 0, vs, {'c': 1, 's': 0, 'd': 12, 't': 20}, ['1'], 'correct'),
     spec('Erreur : sécantes dites parallèles', 0, vs, {'c': 1, 's': 1, 'd': 10, 't': 150},
          ['0'], 'incorrect'),
     spec('Le bon dessin', 1, vs, {'t0': 10, 't1': 80, 't2': 130, 'g1': 14, 'g2': -20}, ['0'],
          'correct'),
     spec('Erreur : dessin à 14°', 1, vs, {'t0': 10, 't1': 80, 't2': 130, 'g1': 14, 'g2': -20},
          ['1'], 'incorrect'),
     spec('La verte', 2, vs, {'w': 2, 't': 30, 'd0': 9, 's0': 1, 'd1': 16, 's1': 0, 'd2': 24,
                               's2': 1}, ['2'], 'correct'),
     spec('Erreur : la presque parallèle (bleue)', 2, vs,
          {'w': 2, 't': 30, 'd0': 9, 's0': 1, 'd1': 16, 's1': 0, 'd2': 24, 's2': 1}, ['0'],
          'incorrect')]))

# ======================================================================================
# 05. Nommer une figure par sa définition (CM1-102)
# ======================================================================================

DEF8 = ['un polygone qui a trois côtés', 'un triangle qui a un angle droit',
        'un triangle qui a deux côtés de la même longueur',
        'un triangle qui a ses trois côtés de la même longueur', 'un polygone qui a quatre côtés',
        'un quadrilatère qui a quatre angles droits et quatre côtés de la même longueur',
        'un quadrilatère qui a quatre angles droits',
        'un quadrilatère qui a quatre côtés de la même longueur']
LISTE8 = [n for n in NOMS8]
V1 = variation(
    'D\'après ses codes, quel est le nom le plus précis de cette figure ?\n\n'
    + figure(FEN, 'Une figure avec ses codes.',
             selon('k', [selon('o', [figure_usuelle(n, a) for a in ORIENT], 0) for n in NOMS8],
                   0))
    + choix(LISTE8),
    [var('k', '0..7'), var('o', '0..2')], ['{{k}}'],
    ['On compte les côtés, puis on lit les codes : petits traits (côtés de même longueur),'
     ' petits carrés (angles droits).',
     'C\'est ' + selon('k', [d for d in DEF8], 0) + ' : $' + col(
         selon('k', ['\\text{' + n + '}' for n in NOMS8], 0)) + '$.'])
V2 = variation(
    'Comment s\'appelle ' + selon('k', DEF8, 0) + ' ?' + choix(LISTE8),
    [var('k', '0..7')], ['{{k}}'],
    ['On relit la définition de chaque figure.',
     selon('k', [d[0].upper() + d[1:] for d in DEF8], 0) + ', c\'est un $'
     + col(selon('k', ['\\text{' + n + '}' for n in NOMS8], 0)) + '$.'])
PIEGES = [('carré', 45), ('triangle équilatéral', 30), ('rectangle', 28), ('losange', 0)]
# Le losange posé sur un côté : on le tourne pour qu'un côté soit horizontal.
_p = FIGURES['losange'][0]
ROT_LOS = -math.degrees(math.atan2(_p[1][1] - _p[0][1], _p[1][0] - _p[0][0]))
PIEGES[3] = ('losange', ROT_LOS)
V3 = variation(
    'D\'après ses codes, quel est le nom le plus précis de cette figure ?\n\n'
    + figure(FEN, 'Une figure avec ses codes, dans une position inhabituelle.',
             selon('k', [figure_usuelle(n, a) for n, a in PIEGES]))
    + choix(LISTE8),
    [var('k', '1..4'), table('z', 'k', [NOMS8.index(n) for n, _ in PIEGES])], ['{{z}}'],
    ['La position de la figure ne change pas son nom : seuls comptent les côtés et les codes.',
     selon('k', ['Quatre côtés de même longueur et quatre angles droits, même posé sur la'
                 ' pointe : c\'est un $' + col('\\text{carré}') + '$.',
                 'Trois côtés de même longueur, même la pointe en bas : c\'est un $'
                 + col('\\text{triangle équilatéral}') + '$.',
                 'Quatre angles droits, même penché : c\'est un $' + col('\\text{rectangle}')
                 + '$.',
                 'Quatre côtés de même longueur, sans angle droit, même posé sur un côté :'
                 ' c\'est un $' + col('\\text{losange}') + '$.'])])
vs = [V1, V2, V3]
ecrire('05-nommer-une-figure', modele(
    'Nommer une figure par sa définition',
    'Triangle (rectangle, isocèle, équilatéral), quadrilatère, carré, rectangle, losange : nom'
    ' le plus précis d\'après les codes ; nom d\'après la définition ; figures tournées',
    1, vs,
    [spec('Losange codé', 0, vs, {'k': 7, 'o': 1}, ['7'], 'correct'),
     spec('Carré codé', 0, vs, {'k': 5, 'o': 0}, ['5'], 'correct'),
     spec('Erreur : carré dit losange', 0, vs, {'k': 5, 'o': 0}, ['7'], 'incorrect'),
     spec('Définition du rectangle', 1, vs, {'k': 6}, ['6'], 'correct'),
     spec('Erreur : définition du carré dite rectangle', 1, vs, {'k': 5}, ['6'], 'incorrect'),
     spec('Carré sur la pointe', 2, vs, {'k': 1}, ['5'], 'correct'),
     spec('Erreur : carré sur la pointe dit losange', 2, vs, {'k': 1}, ['7'], 'incorrect'),
     spec('Équilatéral pointe en bas', 2, vs, {'k': 2}, ['3'], 'correct')],
    grades=('CM1',)))

# ======================================================================================
# 06. Côtés parallèles, côtés égaux : les figures usuelles (CM1-103)
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
]
RAISONS = ['Un rectangle a quatre angles droits ; ses côtés opposés sont parallèles et de la'
           ' même longueur.',
           'Un losange a quatre côtés de la même longueur ; ses côtés opposés sont parallèles.',
           'Un carré est à la fois un rectangle et un losange.',
           'Un triangle équilatéral a trois côtés de la même longueur.',
           'Un triangle isocèle a (au moins) deux côtés de la même longueur.',
           'Un triangle rectangle a un angle droit, et un seul.']
V1 = variation(
    'Quelle phrase est vraie ?\n\n```choix\n'
    + ''.join('- ' + selon('f', [p[n] for p in PHRASES]) + '\n' for n in range(4)) + '```',
    [var('f', f'1..{len(PHRASES)}')], ['0'],
    [selon('f', RAISONS), 'La phrase vraie : **' + selon('f', [p[0] for p in PHRASES]) + '**'])
RECT_N = cadre(rot([(0, 0), (6.4, 0), (6.4, 3.4), (0, 3.4)], 12))
LOS_N = cadre(rot(FIGURES['losange'][0], -20))
COTES4 = ['[AB]', '[BC]', '[CD]', '[DA]']
V2 = variation(
    '$ABCD$ est un {{if:q==1|rectangle|losange}}. Quel côté est parallèle au côté $'
    + selon('s', COTES4, 0) + '$ ?\n\n'
    + figure(FEN, 'Un quadrilatère ABCD.',
             '{{if:q==1|' + dessin(RECT_N, noms=ABCD) + '|' + dessin(LOS_N, noms=ABCD) + '}}')
    + choix(['$' + c + '$' for c in COTES4]),
    [var('q', '1..2'), var('s', '0..3'), table('z', 's', [2, 3, 0, 1], 0)], ['{{z}}'],
    ['Dans un {{if:q==1|rectangle|losange}}, les **côtés opposés** sont parallèles.',
     'Le côté opposé à $' + selon('s', COTES4, 0) + '$ est $' + col(selon('s', [COTES4[(n + 2) % 4]
                                                                          for n in range(4)], 0))
     + '$.'])
ISO = [(0, 4.6), (-1.9, 0), (1.9, 0)]   # sommet principal, puis la base


def iso(v, o):
    pts = cadre(rot(ISO, ORIENT[o]))
    noms = [ABC[(j + v) % 3] for j in range(3)]
    return dessin(pts, noms=noms)


COTES3 = ['[AB]', '[BC]', '[CA]']
V3 = variation(
    '$ABC$ est un triangle isocèle en $' + selon('v', ABC, 0) + '$. Quel côté a la même'
    ' longueur que $' + selon('v', COTES3, 0) + '$ ?\n\n'
    + figure(FEN, 'Un triangle ABC.', selon('v', [selon('o', [iso(v, o) for o in range(3)], 0)
                                                  for v in range(3)], 0))
    + choix(['$' + c + '$' for c in COTES3]),
    [var('v', '0..2'), var('o', '0..2'), table('z', 'v', [2, 0, 1], 0)], ['{{z}}'],
    ['Un triangle isocèle en $' + selon('v', ABC, 0) + '$ a ses deux côtés qui partent de $'
     + selon('v', ABC, 0) + '$ de la même longueur.',
     'Ces deux côtés sont $' + selon('v', COTES3, 0) + '$ et $' + col(
         selon('v', ['[AC]', '[BA]', '[CB]'], 0)) + '$.'])
vs = [V1, V2, V3]
ecrire('06-proprietes-des-figures', modele(
    'Côtés parallèles, côtés égaux : les figures usuelles',
    'Propriétés du rectangle, du losange, du carré et des triangles particuliers : phrase vraie,'
    ' côté parallèle à un côté donné, côtés égaux du triangle isocèle',
    2, vs,
    [spec('Phrase vraie du losange', 0, vs, {'f': 2}, ['0'], 'correct'),
     spec('Erreur : le losange a 4 angles droits', 0, vs, {'f': 2}, ['1'], 'incorrect'),
     spec('Rectangle : parallèle à [BC] = [DA]', 1, vs, {'q': 1, 's': 1}, ['3'], 'correct'),
     spec('Erreur : côté consécutif', 1, vs, {'q': 2, 's': 0}, ['1'], 'incorrect'),
     spec('Isocèle en B : [BA]', 2, vs, {'v': 1, 'o': 0}, ['0'], 'correct'),
     spec('Erreur : la base', 2, vs, {'v': 1, 'o': 0}, ['2'], 'incorrect')],
    grades=('CM1',)))

# ======================================================================================
# 07. Les axes de symétrie des figures usuelles (CM1-106)
# ======================================================================================

AXES = [('carré', 4), ('rectangle', 2), ('losange', 2), ('triangle équilatéral', 3),
        ('triangle isocèle', 1), ('quadrilatère', 0), ('triangle', 0)]
V1 = variation(
    'Combien d\'axes de symétrie a ' + selon('k', [ARTICLE[n] for n, _ in AXES]) + ' ?\n\n'
    + figure(FEN, 'Une figure avec ses codes.',
             selon('k', [selon('o', [figure_usuelle(n, a) for a in ORIENT], 0) for n, _ in AXES]))
    + '\n\nNombre d\'axes : $?$',
    [var('k', f'1..{len(AXES)}'), var('o', '0..2'), table('z', 'k', [x for _, x in AXES])],
    ['{{z}}'],
    ['Une droite est un axe de symétrie quand, en pliant la figure le long de cette droite, les'
     ' deux moitiés se superposent exactement.',
     selon('k', ['Le carré : les deux diagonales et les deux droites qui passent par les'
                 ' milieux des côtés opposés.',
                 'Le rectangle : les deux droites qui passent par les milieux des côtés'
                 ' opposés (pas les diagonales).',
                 'Le losange : ses deux diagonales.',
                 'Le triangle équilatéral : une droite par sommet, qui passe par le milieu du'
                 ' côté opposé.',
                 'Le triangle isocèle : la droite qui passe par son sommet principal et le'
                 ' milieu de la base.',
                 'Ce quadrilatère n\'a ni côtés de même longueur ni angles droits : aucun pliage'
                 ' ne superpose ses deux moitiés.',
                 'Ce triangle a trois côtés de longueurs différentes : aucun pliage ne superpose'
                 ' ses deux moitiés.']),
     'Nombre d\'axes : $' + col('{{z}}') + '$.'])
V2 = variation(
    'Quelle figure n\'a aucun axe de symétrie ?'
    + choix_figures([(FEN, 'Une figure.', '{{if:k==1|' + figure_usuelle('quadrilatère', 15,
                                                                         couleur='noir')
                      + '|' + figure_usuelle('triangle', 200, couleur='noir') + '}}'),
                     (FEN, 'Une figure.', figure_usuelle('triangle isocèle', 20,
                                                          couleur='noir')),
                     (FEN, 'Une figure.', figure_usuelle('rectangle', 0, couleur='noir')),
                     (FEN, 'Une figure.', figure_usuelle('losange', 90, couleur='noir'))]),
    [var('k', '1..2')], ['0'],
    ['Le triangle isocèle a un axe, le rectangle deux, le losange deux (ses diagonales).',
     'La figure sans code, aux côtés tous différents, n\'a $' + col('\\text{aucun axe}') + '$ :'
     ' c\'est {{if:k==1|le quadrilatère|le triangle}} quelconque.'])
# Figure et droite rouge : 1 rectangle + diagonale (non), 2 carré + diagonale (oui),
# 3 rectangle + droite des milieux (oui), 4 losange + diagonale (oui), 5 losange + droite des
# milieux de deux côtés opposés (non).


def figure_et_droite(nom, droite_):
    pts, traits, droits = FIGURES[nom]
    pts = cadre(pts)
    (a, b) = droite_(pts)
    extra = (f'u = point({a[0]:.2f}, {a[1]:.2f}, visible=faux)\n'
             f'v = point({b[0]:.2f}, {b[1]:.2f}, visible=faux)\n'
             'droite(u, v, trait="tirets", couleur="rouge", epaisseur=2)')
    return dessin(pts, traits=traits, droits=droits, extra=extra)


def milieu(p, q):
    return ((p[0] + q[0]) / 2, (p[1] + q[1]) / 2)


DIAG = lambda p: (p[0], p[2])
MIL = lambda p: (milieu(p[0], p[1]), milieu(p[2], p[3]))
CAS = [('rectangle', DIAG, 1), ('carré', DIAG, 0), ('rectangle', MIL, 0), ('losange', DIAG, 0),
       ('losange', MIL, 1)]
V3 = variation(
    'La droite rouge est-elle un axe de symétrie de ' + selon('k', [ARTICLE[n] for n, _, _ in CAS])
    + ' ?\n\n'
    + figure(FEN, 'Une figure avec ses codes et une droite rouge en tirets.',
             selon('k', [figure_et_droite(n, d) for n, d, _ in CAS]))
    + choix(['Oui', 'Non']),
    [var('k', f'1..{len(CAS)}'), table('z', 'k', [x for _, _, x in CAS])], ['{{z}}'],
    ['On imagine qu\'on plie la figure le long de la droite rouge : les deux moitiés se'
     ' superposent-elles exactement ?',
     selon('k', ['Non : plié le long de sa diagonale, un rectangle (qui n\'est pas un carré) ne'
                 ' se superpose pas, les coins dépassent. La diagonale n\'est $'
                 + col('\\text{pas un axe}') + '$.',
                 'Oui : la diagonale d\'un carré est un $' + col('\\text{axe de symétrie}')
                 + '$.',
                 'Oui : la droite qui passe par les milieux de deux côtés opposés est un $'
                 + col('\\text{axe de symétrie}') + '$ du rectangle.',
                 'Oui : la diagonale d\'un losange est un $' + col('\\text{axe de symétrie}')
                 + '$.',
                 'Non : plié ainsi, un losange (qui n\'est pas un carré) ne se superpose pas.'
                 ' Ses axes sont ses diagonales ; cette droite n\'est $'
                 + col('\\text{pas un axe}') + '$.'])])
vs = [V1, V2, V3]
ecrire('07-axes-des-figures-usuelles', modele(
    'Les axes de symétrie des figures usuelles',
    'Nombre d\'axes du carré, du rectangle, du losange, des triangles particuliers ; figure sans'
    ' axe ; la diagonale du rectangle n\'est pas un axe',
    3, vs,
    [spec('Carré : 4', 0, vs, {'k': 1, 'o': 0}, ['4'], 'correct'),
     spec('Rectangle : 2', 0, vs, {'k': 2, 'o': 1}, ['2'], 'correct'),
     spec('Erreur : rectangle 4 (diagonales)', 0, vs, {'k': 2, 'o': 1}, ['4'], 'incorrect'),
     spec('Équilatéral : 3', 0, vs, {'k': 4, 'o': 2}, ['3'], 'correct'),
     spec('Le quadrilatère quelconque', 1, vs, {'k': 1}, ['0'], 'correct'),
     spec('Erreur : le rectangle', 1, vs, {'k': 1}, ['2'], 'incorrect'),
     spec('Diagonale du rectangle : non', 2, vs, {'k': 1}, ['1'], 'correct'),
     spec('Erreur : diagonale du rectangle dite axe', 2, vs, {'k': 1}, ['0'], 'incorrect'),
     spec('Diagonale du carré : oui', 2, vs, {'k': 2}, ['0'], 'correct')],
    grades=('CM1',)))

# ============================================================================

os.makedirs(DOSSIER, exist_ok=True)
for nom, mod in MODELES.items():
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(mod, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
