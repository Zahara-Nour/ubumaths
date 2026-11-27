"""Écrit les modèles neufs du chantier idees-3e-transformations dans
scripts/questions/idees-3e-transformations-neufs/ (N1 à N4).

Phase 0 tranchée par David le 2026-11-27 (« je te suis » : recommandations suivies ; journal
docs/archive/wip/idees-3e-transformations/idees-3e-transformations-progress.md).

Rangement, tout SANS point : rotation et homothétie sont absentes du BO de cycle 4 en vigueur
(docs/systeme/programmes/bornes/cycle4.md, bornes générales n° 13 : « aucun point ne doit les
générer »), et d'aucun autre programme du dépôt (Q1, Q2).
- N1, N4 : « Géométrie > Rotations » (notion existante, vide) ;
- N2, N3 : « Géométrie > Homothéties » (notion existante, vide).

Ni theme, ni domain, ni subdomain, ni id : create-questions --publier écrit l'id.

Décisions d'écriture et écarts à la fiche :
- N1, N2 : figure à compléter sur quadrillage (`verifier: point A' = rotation(…)` /
  `homothetie(…)`), le juge calcule le point attendu par le langage des figures. Les erreurs
  typiques sont des specs refusées (une case « figure » n'a pas d'erreurs prévues).
- N1 (e), N2 (e) : repère à placer (` ```courbe ` `placer:`), A et le centre donnés par leurs
  seules coordonnées (ils ne sont pas dessinés : l'élève les repère).
- N3 : |k| = n/10 seulement (n de 2 à 9 ou de 15 à 40) : la fiche disait aussi n/d, mais un
  rapport non décimal rend les longueurs non décimales ; les réponses restent exactes. Figure à
  main levée (points sur une droite, pas à l'échelle). Variations (b) et (c) : deux erreurs
  prévues seulement, je n'en invente pas une troisième.
- N4 (c) : triangles équilatéraux, centre de l'hexagone, six configurations fixes (k), calculées
  ici et vérifiées par les specs.

Usage : python3 docs/wip/questions/idees-3e-transformations-neufs.py \
          scripts/questions/idees-3e-transformations-neufs
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from idees_3e_thales_outils import (  # noqa: E402
    case, couleur, erreur, resoudre, spec, tous_distincts, var, variation)

DOSSIER = sys.argv[1]

RANGEMENT = {
    'n1-image-d-un-point-par-une-rotation': ('Géométrie > Rotations', None),
    'n2-image-d-un-point-par-une-homothetie': ('Géométrie > Homothéties', None),
    'n3-calculs-lies-a-une-homothetie': ('Géométrie > Homothéties', None),
    'n4-rotation-dans-un-pavage': ('Géométrie > Rotations', None),
}

SENS_DIRECT = "dans le sens inverse des aiguilles d'une montre"
SENS_INDIRECT = "dans le sens des aiguilles d'une montre"


# =============================================================================================
# Outils
# =============================================================================================

def modele(title, description, level, delay, variations, specs):
    return {'title': title, 'description': description, 'grades': ['3'], 'level': level,
            'delay': delay, 'status': 'draft', 'variations': variations, 'testSpecs': specs}


def ecrire(nom, m):
    os.makedirs(DOSSIER, exist_ok=True)
    chemin = os.path.join(DOSSIER, nom + '.json')
    tete = {}
    if os.path.exists(chemin):
        with open(chemin, encoding='utf-8') as f:
            ancien = json.load(f)
        if 'id' in ancien:
            tete = {'id': ancien['id']}
    noeud, point = RANGEMENT[nom]
    m = {**tete, 'rangement': {'noeud': noeud, 'point': point}, **m}
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
    print(f'{nom} : {len(m["variations"])} variations, {len(m["testSpecs"])} specs')


def coul(contenu):
    """Couleur dans un texte (hors formule) : entre $."""
    return '$' + couleur(contenu) + '$'


def fr(x):
    """Réponse d'élève : arrondi au centième, virgule `{,}`."""
    t = f'{round(x + (1e-9 if x >= 0 else -1e-9), 2):.2f}'.rstrip('0').rstrip('.')
    return t.replace('.', '{,}')


def exact(expr):
    return '{{eval:' + expr + ';d}}'


def cent(expr):
    return '{{eval:round(100*(' + expr + '))/100;d}}'


def calc(expr, v):
    env = {k: float(x) for k, x in v.items()}
    return eval(expr, {'__builtins__': {}, 'abs': abs, 'round': round}, env)


def distincts(exprs, facteur=100):
    return tous_distincts([f'round({facteur}*({x}))' for x in exprs])


def a_completer(fenetre, verifier, lignes):
    """Bloc figure à compléter sur quadrillage de 1, outil point."""
    tete = f'```figure-a-completer\nfenetre: {fenetre}\ngrille: 1\noutils: point\n'
    tete += ''.join(f'verifier: {v}\n' for v in verifier)
    return tete + '---\n' + '\n'.join(lignes) + '\n```'


def pt(nom, x, y, etiquette='droite'):
    return f'{nom} = point({x}, {y}, etiquette="{etiquette}")'


def point_spec(x, y):
    return f'point({int(x)};{int(y)})'


# =============================================================================================
# N1 — Image d'un point par une rotation, sur quadrillage
# =============================================================================================
# O = (6 ; 6) dans une fenêtre de 0 à 12 ; A = O + (dx ; dy).

O_N1 = ['O = point(6, 6, etiquette="bas-gauche")']
FEN = '0 ; 12 ; 0 ; 12'
COND_DXDY = ['dx*dx + dy*dy > 1']


def deplacement(dx, dy):
    """Phrase « de O à A : … » pour le corrigé."""
    return (f'De $O$ à $A$, on se déplace de ${{{{{dx}}}}}$ carreaux à l\'horizontale et de '
            f'${{{{{dy}}}}}$ carreaux à la verticale (positif : vers la droite ou vers le haut).')


N1_V0 = variation(
    "Place le point $A'$, image du point $A$ par la rotation de centre $O$ et d'angle $90^{\\circ}$ "
    + SENS_DIRECT + '.\n\n'
    + a_completer(FEN, ["point A' = rotation(A, centre=O, angle=90)"],
                  O_N1 + [pt('A', '6+{{dx}}', '6+{{dy}}')]),
    [var('dx', '-4..4'), var('dy', '-4..4')],
    [],
    [deplacement('dx', 'dy'),
     "Un quart de tour " + SENS_DIRECT + " fait tourner ce déplacement : de $O$ à $A'$, on se "
     "déplace de ${{eval:-dy}}$ carreaux à l'horizontale et de ${{dx}}$ à la verticale. "
     "On a bien $OA' = OA$ et $\\widehat{AOA'} = 90^{\\circ}$ : c'est le point "
     + coul("A'") + '.'],
    "Trace [OA], puis fais tourner ce segment d'un quart de tour autour de O, " + SENS_DIRECT
    + " : OA' doit être égal à OA, et l'angle AOA' doit être droit.",
    COND_DXDY,
)
V = {'dx': 3, 'dy': 1}
S_N1 = [
    spec("v0 A(9;7) : A'(5;9)", 0, V, 'correct', [point_spec(5, 9)]),
    spec("v0 A(7;4) : A'(8;7)", 0, {'dx': 1, 'dy': -2}, 'correct', [point_spec(8, 7)]),
    spec('v0 : sens des aiguilles (7;3)', 0, V, 'incorrect', [point_spec(7, 3)]),
    spec('v0 : symétrique par rapport à O (3;5)', 0, V, 'incorrect', [point_spec(3, 5)]),
    spec('v0 : coordonnées échangées sans signe (7;9)', 0, V, 'incorrect', [point_spec(7, 9)]),
]

N1_V1 = variation(
    "Place le point $A'$, image du point $A$ par la rotation de centre $O$ et d'angle $90^{\\circ}$ "
    + SENS_INDIRECT + '.\n\n'
    + a_completer(FEN, ["point A' = rotation(A, centre=O, angle=-90)"],
                  O_N1 + [pt('A', '6+{{dx}}', '6+{{dy}}')]),
    [var('dx', '-4..4'), var('dy', '-4..4')],
    [],
    [deplacement('dx', 'dy'),
     "Un quart de tour " + SENS_INDIRECT + " fait tourner ce déplacement : de $O$ à $A'$, on se "
     "déplace de ${{dy}}$ carreaux à l'horizontale et de ${{eval:-dx}}$ à la verticale. "
     "On a bien $OA' = OA$ et $\\widehat{AOA'} = 90^{\\circ}$ : c'est le point "
     + coul("A'") + '.'],
    "Trace [OA], puis fais tourner ce segment d'un quart de tour autour de O, " + SENS_INDIRECT
    + ", comme une aiguille de montre.",
    COND_DXDY,
)
S_N1 += [
    spec("v1 A(9;7) : A'(7;3)", 1, V, 'correct', [point_spec(7, 3)]),
    spec('v1 : sens inverse (5;9)', 1, V, 'incorrect', [point_spec(5, 9)]),
    spec('v1 : symétrique par rapport à O (3;5)', 1, V, 'incorrect', [point_spec(3, 5)]),
]

N1_V2 = variation(
    "Place le point $A'$, image du point $A$ par la rotation de centre $O$ et d'angle "
    "$180^{\\circ}$.\n\n"
    + a_completer(FEN, ["point A' = rotation(A, centre=O, angle=180)"],
                  O_N1 + [pt('A', '6+{{dx}}', '6+{{dy}}')]),
    [var('dx', '-4..4'), var('dy', '-4..4')],
    [],
    [deplacement('dx', 'dy'),
     "Un demi-tour change ce déplacement en son opposé : de $O$ à $A'$, ${{eval:-dx}}$ à "
     "l'horizontale et ${{eval:-dy}}$ à la verticale. $O$ est le milieu de $[AA']$ : la rotation "
     "d'angle $180^{\\circ}$ est la **symétrie de centre $O$**. C'est le point " + coul("A'")
     + '.'],
    "Un demi-tour autour de O : A, O et A' sont alignés, et O est au milieu de [AA'].",
    COND_DXDY,
)
S_N1 += [
    spec("v2 A(9;7) : A'(3;5)", 2, V, 'correct', [point_spec(3, 5)]),
    spec("v2 : quart de tour seulement (5;9)", 2, V, 'incorrect', [point_spec(5, 9)]),
    spec("v2 : symétrique par rapport à l'axe vertical (3;7)", 2, V, 'incorrect',
         [point_spec(3, 7)]),
]

# --- v3 : triangle ABC, quart de tour direct. A = O + (dx ; dy), B = A + (p ; 0), C = A + (1 ; q).
N1_V3 = variation(
    "Place les points $A'$, $B'$ et $C'$, images des sommets du triangle $ABC$ par la rotation de "
    "centre $O$ et d'angle $90^{\\circ}$ " + SENS_DIRECT + '.\n\n'
    + a_completer(FEN, ["point A' = rotation(A, centre=O, angle=90)",
                        "point B' = rotation(B, centre=O, angle=90)",
                        "point C' = rotation(C, centre=O, angle=90)"],
                  O_N1 + [pt('A', '6+{{dx}}', '6+{{dy}}', 'bas'),
                          pt('B', '6+{{dx}}+{{p}}', '6+{{dy}}', 'bas'),
                          pt('C', '6+{{dx}}+1', '6+{{dy}}+{{q}}', 'haut'),
                          'segment(A, B)', 'segment(B, C)', 'segment(C, A)']),
    [var('dx', '1..3'), var('dy', '-4..1'), var('p', '2..3'), var('q', '2..3')],
    [],
    ["On fait tourner chaque sommet séparément, d'un quart de tour autour de $O$ : si l'on va de "
     "$O$ à un point par $(a ; b)$ carreaux, on va de $O$ à son image par $(-b ; a)$.",
     "Par exemple, de $O$ à $A$ : $({{dx}} ; {{dy}})$, donc de $O$ à $A'$ : "
     "$({{eval:-dy}} ; {{dx}})$. Une rotation conserve les longueurs et les angles : le triangle "
     + coul("A'B'C'") + " a la même forme que $ABC$, tourné d'un quart de tour."],
    "Fais tourner les sommets un par un, comme une aiguille qui tournerait autour de O dans le "
    "sens inverse d'une montre.",
    ['dx + p <= 5', 'dy + q <= 5', 'dy + q >= -5'] + ['abs((-(dy))-(dx)) + abs((dx)-(dy)) > 0', 'abs((-(dy))-(dx+p)) + abs((dx)-(dy)) > 0', 'abs((-(dy))-(dx+1)) + abs((dx)-(dy+q)) > 0', 'abs((-(dy))-(dx)) + abs((dx+p)-(dy)) > 0', 'abs((-(dy))-(dx+p)) + abs((dx+p)-(dy)) > 0', 'abs((-(dy))-(dx+1)) + abs((dx+p)-(dy+q)) > 0', 'abs((-(dy+q))-(dx)) + abs((dx+1)-(dy)) > 0', 'abs((-(dy+q))-(dx+p)) + abs((dx+1)-(dy)) > 0', 'abs((-(dy+q))-(dx+1)) + abs((dx+1)-(dy+q)) > 0'],
)
V3 = {'dx': 2, 'dy': -3, 'p': 2, 'q': 2}
# A(8;3) B(10;3) C(9;5) ; images : A'(9;8) B'(9;10) C'(7;9)
S_N1 += [
    spec("v3 : A'(9;8), B'(9;10), C'(7;9)", 3, V3, 'correct',
         [point_spec(9, 8) + '|' + point_spec(9, 10) + '|' + point_spec(7, 9)]),
    spec('v3 : sens des aiguilles', 3, V3, 'incorrect',
         [point_spec(3, 4) + '|' + point_spec(3, 2) + '|' + point_spec(5, 3)]),
    spec("v3 : C' oublié", 3, V3, 'incorrect',
         [point_spec(9, 8) + '|' + point_spec(9, 10)]),
]

# --- v4 : dans un repère. O(xo ; yo), A(xa ; ya) ; A' = O + (-(ya-yo) ; xa-xo).
N1_V4 = variation(
    "Dans le repère, on donne les points $O({{xo}} ; {{yo}})$ et $A({{xa}} ; {{ya}})$. Place le "
    "point $B$, image de $A$ par la rotation de centre $O$ et d'angle $90^{\\circ}$ "
    + SENS_DIRECT + ".\n\n```courbe\nx: -8 ; 8\ny: -8 ; 8\ngrille: 1 ; 1\n"
    "placer: B=({{eval:xo-(ya-yo)}} ; {{eval:yo+(xa-xo)}})\ntaille: moyenne\n"
    "description: Repère gradué de 1 en 1, de −8 à 8 sur chaque axe.\n```",
    [var('xo', '-3..3'), var('yo', '-3..3'), var('xa', '-5..5'), var('ya', '-5..5')],
    [],
    ["De $O$ à $A$, l'abscisse change de ${{eval:xa-xo}}$ et l'ordonnée de ${{eval:ya-yo}}$.",
     "Un quart de tour " + SENS_DIRECT + " change le déplacement $(a ; b)$ en $(-b ; a)$ : de "
     "$O$ à $B$, on se déplace de $({{eval:-(ya-yo)}} ; {{eval:xa-xo}})$. Donc "
     + coul("B({{eval:xo-(ya-yo)}} ; {{eval:yo+(xa-xo)}})") + '.'],
    "Place d'abord O et A, puis compte le déplacement de O à A en carreaux, et fais-le tourner "
    "d'un quart de tour.",
    ['(xa-xo)*(xa-xo) + (ya-yo)*(ya-yo) > 1', 'abs(xo-(ya-yo)) <= 8', 'abs(yo+(xa-xo)) <= 8',
     'xo != 0', 'yo != 0'],
)
V4 = {'xo': 1, 'yo': 2, 'xa': 4, 'ya': 3}
# déplacement (3 ; 1) → (−1 ; 3) : A'(0 ; 5)
S_N1 += [
    spec("v4 O(1;2), A(4;3) : A'(0;5)", 4, V4, 'correct', ['0;5']),
    spec('v4 : centre pris à l\'origine (-3;4)', 4, V4, 'incorrect', ['-3;4']),
    spec('v4 : sens des aiguilles (2;-1)', 4, V4, 'incorrect', ['2;-1']),
    spec('v4 : symétrique par rapport à O (-2;1)', 4, V4, 'incorrect', ['-2;1']),
]

N1 = modele(
    "L'image d'un point par une rotation",
    "Sur quadrillage, placer l'image d'un point par un quart de tour (dans les deux sens) ou un "
    "demi-tour, puis les images des sommets d'un triangle ; dans un repère, l'image d'un point "
    "donné par ses coordonnées, centre hors de l'origine.",
    2, 240, [N1_V0, N1_V1, N1_V2, N1_V3, N1_V4], S_N1)


# =============================================================================================
# N2 — Image d'un point par une homothétie, sur quadrillage
# =============================================================================================
# O = (8 ; 8) dans une fenêtre de 0 à 16.

FEN2 = '0 ; 16 ; 0 ; 16'
O_N2 = ['O = point(8, 8, etiquette="bas-gauche")']


def hom_corr(k_tex, k_expr, positif):
    cote = ("du même côté de $O$ que $A$" if positif
            else "de l'autre côté de $O$ (le rapport est négatif)")
    return [
        "De $O$ à $A$, on se déplace de ${{dx}}$ carreaux à l'horizontale et de ${{dy}}$ à la "
        "verticale (positif : vers la droite ou vers le haut).",
        "Une homothétie de centre $O$ et de rapport $" + k_tex + "$ multiplie ce déplacement par $"
        + k_tex + "$ : de $O$ à $A'$, ${{eval:(" + k_expr + ")*dx;d}}$ à l'horizontale et "
        "${{eval:(" + k_expr + ")*dy;d}}$ à la verticale. $A'$ est sur la droite $(OA)$, " + cote
        + " : c'est le point " + coul("A'") + '.']


N2_V0 = variation(
    "Place le point $A'$, image du point $A$ par l'homothétie de centre $O$ et de rapport "
    "${{k}}$.\n\n"
    + a_completer(FEN2, ["point A' = homothetie(A, centre=O, rapport={{k}})"],
                  O_N2 + [pt('A', '8+{{dx}}', '8+{{dy}}')]),
    [var('k', '2|3'), var('dx', '-3..3'), var('dy', '-3..3')],
    [],
    hom_corr('{{k}}', 'k', True),
    "A' est sur la demi-droite [OA), et OA' = {{k}} × OA : compte les carreaux de O à A, puis "
    "{{k}} fois plus depuis O.",
    ['dx*dx + dy*dy > 1', 'abs(k*dx) <= 7', 'abs(k*dy) <= 7'],
)
VH = {'k': 2, 'dx': 2, 'dy': 1}
# A(10;9) : A'(12;10)
S_N2 = [
    spec("v0 k=2, A(10;9) : A'(12;10)", 0, VH, 'correct', [point_spec(12, 10)]),
    spec("v0 k=3, A(9;7) : A'(11;5)", 0, {'k': 3, 'dx': 1, 'dy': -1}, 'correct',
         [point_spec(11, 5)]),
    spec("v0 : k fois OA compté depuis A (14;11)", 0, VH, 'incorrect', [point_spec(14, 11)]),
    spec('v0 : mauvais côté de O (4;6)', 0, VH, 'incorrect', [point_spec(4, 6)]),
]

N2_V1 = variation(
    "Place le point $A'$, image du point $A$ par l'homothétie de centre $O$ et de rapport "
    "$\\dfrac{1}{2}$.\n\n"
    + a_completer(FEN2, ["point A' = homothetie(A, centre=O, rapport=0.5)"],
                  O_N2 + [pt('A', '8+{{dx}}', '8+{{dy}}')]),
    [var('a', '-3..3'), var('b', '-3..3'), var('dx', 'eval:2*a'), var('dy', 'eval:2*b')],
    [],
    hom_corr('\\dfrac{1}{2}', '1/2', True)[:1] + [
        "Une homothétie de rapport $\\dfrac{1}{2}$ divise ce déplacement par $2$ : de $O$ à $A'$, "
        "${{a}}$ à l'horizontale et ${{b}}$ à la verticale. $A'$ est le **milieu** de $[OA]$ : "
        "c'est une réduction. C'est le point " + coul("A'") + '.'],
    "Le rapport est inférieur à 1 : A' est entre O et A, et OA' = OA ÷ 2.",
    ['a*a + b*b > 0'],
)
VH1 = {'a': 2, 'b': -1, 'dx': 4, 'dy': -2}
# A(12;6) : A'(10;7)
S_N2 += [
    spec("v1 A(12;6) : A'(10;7)", 1, VH1, 'correct', [point_spec(10, 7)]),
    spec('v1 : rapport 2 au lieu de 1/2 (16;4)', 1, VH1, 'incorrect', [point_spec(16, 4)]),
    spec('v1 : mauvais côté de O (6;9)', 1, VH1, 'incorrect', [point_spec(6, 9)]),
]

N2_V2 = variation(
    "Place le point $A'$, image du point $A$ par l'homothétie de centre $O$ et de rapport "
    "${{k}}$.\n\n"
    + a_completer(FEN2, ["point A' = homothetie(A, centre=O, rapport={{k}})"],
                  O_N2 + [pt('A', '8+{{dx}}', '8+{{dy}}')]),
    [var('k', '-1|-2'), var('dx', '-3..3'), var('dy', '-3..3')],
    [],
    hom_corr('{{k}}', 'k', False),
    "Le rapport est négatif : A' est sur la droite (OA), mais de l'autre côté de O. Ensuite, "
    "OA' = {{eval:-k}} × OA.",
    ['dx*dx + dy*dy > 1', 'abs(k*dx) <= 7', 'abs(k*dy) <= 7'],
)
VH2 = {'k': -2, 'dx': 2, 'dy': 1}
# A(10;9) : A'(4;6)
S_N2 += [
    spec("v2 k=-2, A(10;9) : A'(4;6)", 2, VH2, 'correct', [point_spec(4, 6)]),
    spec("v2 k=-1, A(10;9) : A'(6;7)", 2, {'k': -1, 'dx': 2, 'dy': 1}, 'correct',
         [point_spec(6, 7)]),
    spec('v2 : signe oublié (12;10)', 2, VH2, 'incorrect', [point_spec(12, 10)]),
    spec('v2 : rapport -1/2 (7;7)', 2, {'k': -2, 'dx': 2, 'dy': 2}, 'incorrect',
         [point_spec(7, 7)]),
]

N2_V3 = variation(
    "Place les points $A'$ et $B'$, images des extrémités du segment $[AB]$ par l'homothétie de "
    "centre $O$ et de rapport ${{k}}$.\n\n"
    + a_completer(FEN2, ["point A' = homothetie(A, centre=O, rapport={{k}})",
                         "point B' = homothetie(B, centre=O, rapport={{k}})"],
                  O_N2 + [pt('A', '8+{{dx}}', '8+{{dy}}', 'bas'),
                          pt('B', '8+{{ex}}', '8+{{ey}}', 'haut'),
                          'segment(A, B)']),
    [var('k', '2|-2'), var('dx', '-3..3'), var('dy', '-3..3'), var('ex', '-3..3'),
     var('ey', '-3..3')],
    [],
    ["On construit l'image de chaque extrémité : de $O$ à $A$, $({{dx}} ; {{dy}})$ carreaux, donc "
     "de $O$ à $A'$, $({{eval:k*dx}} ; {{eval:k*dy}})$ ; de $O$ à $B$, $({{ex}} ; {{ey}})$, donc de "
     "$O$ à $B'$, $({{eval:k*ex}} ; {{eval:k*ey}})$.",
     "L'image du segment $[AB]$ est le segment " + coul("[A'B']") + ", parallèle à $[AB]$ et "
     "${{eval:abs(k)}}$ fois plus long."],
    "Construis séparément l'image de A, puis celle de B : chacune est sur la droite qui la relie "
    "à O.",
    ['dx*dx + dy*dy > 1', 'ex*ex + ey*ey > 1', '(ex-dx)*(ex-dx) + (ey-dy)*(ey-dy) > 1',
     'dx*ey != dy*ex'],
)
VH3 = {'k': 2, 'dx': 2, 'dy': 1, 'ex': -1, 'ey': 3}
# A(10;9) → (12;10) ; B(7;11) → (6;14)
S_N2 += [
    spec("v3 k=2 : A'(12;10), B'(6;14)", 3, VH3, 'correct',
         [point_spec(12, 10) + '|' + point_spec(6, 14)]),
    spec('v3 : k=2 au lieu de -2', 3, {**VH3, 'k': -2}, 'incorrect',
         [point_spec(12, 10) + '|' + point_spec(6, 14)]),
    spec('v3 : segment glissé (translation de A vers A\')', 3, VH3, 'incorrect',
         [point_spec(12, 10) + '|' + point_spec(9, 12)]),
]

N2_V4 = variation(
    "Dans le repère, on donne les points $O({{xo}} ; {{yo}})$ et $A({{xa}} ; {{ya}})$. Place le "
    "point $B$, image de $A$ par l'homothétie de centre $O$ et de rapport ${{kt}}$.\n\n"
    "```courbe\nx: -8 ; 8\ny: -8 ; 8\ngrille: 1 ; 1\n"
    "placer: B=({{eval:xo+k*(xa-xo)}} ; {{eval:yo+k*(ya-yo)}})\ntaille: moyenne\n"
    "description: Repère gradué de 1 en 1, de −8 à 8 sur chaque axe.\n```",
    [var('k', '2|-2|0.5|1.5'),
     var('xo', '-3..3'), var('yo', '-3..3'), var('m', '-2..2'), var('n', '-2..2'),
     var('xa', 'eval:xo+2*m'), var('ya', 'eval:yo+2*n')],
    [],
    ["De $O$ à $A$, l'abscisse change de ${{eval:xa-xo}}$ et l'ordonnée de ${{eval:ya-yo}}$.",
     "L'homothétie de rapport ${{kt}}$ multiplie ce déplacement par ${{kt}}$ : de $O$ à $B$, "
     "$({{eval:k*(xa-xo);d}} ; {{eval:k*(ya-yo);d}})$. Donc "
     + coul("B({{eval:xo+k*(xa-xo)}} ; {{eval:yo+k*(ya-yo)}})") + '.'],
    "Compte le déplacement de O à A, multiplie-le par le rapport, et pars de O (pas de A).",
    ['m*m + n*n > 0', 'abs(xo+k*(xa-xo)) <= 8', 'abs(yo+k*(ya-yo)) <= 8', 'abs(xa) <= 8',
     'abs(ya) <= 8', 'xo != 0'],
)
# kt : écriture du rapport, posée par une variable de texte (if)
N2_V4['statement'] = N2_V4['statement'].replace(
    '{{kt}}', '{{if:2*k==1|\\dfrac{1}{2}|{{eval:k;d}}}}')
N2_V4['correction']['steps'] = [s.replace(
    '{{kt}}', '{{if:2*k==1|\\dfrac{1}{2}|{{eval:k;d}}}}')
    for s in N2_V4['correction']['steps']]
V24 = {'k': 2, 'xo': 1, 'yo': -1, 'm': 1, 'n': 1, 'xa': 3, 'ya': 1}
# O(1;-1), A(3;1), k=2 : A'(5;3)
S_N2 += [
    spec("v4 k=2, O(1;-1), A(3;1) : A'(5;3)", 4, V24, 'correct', ['5;3']),
    spec('v4 : centre pris à l\'origine (6;2)', 4, V24, 'incorrect', ['6;2']),
    spec('v4 : k fois OA compté depuis A (7;5)', 4, V24, 'incorrect', ['7;5']),
    spec("v4 k=1,5, O(1;-1), A(5;3) : A'(7;5)", 4,
         {'k': 1.5, 'xo': 1, 'yo': -1, 'm': 2, 'n': 2, 'xa': 5, 'ya': 3}, 'correct',
         ['7;5']),
]

N2 = modele(
    "L'image d'un point par une homothétie",
    "Sur quadrillage, placer l'image d'un point par une homothétie de rapport 2 ou 3, 1/2, −1 ou "
    "−2, puis l'image d'un segment ; dans un repère, l'image d'un point donné par ses coordonnées.",
    2, 240, [N2_V0, N2_V1, N2_V2, N2_V3, N2_V4], S_N2)


# =============================================================================================
# N3 — Calculs liés à une homothétie
# =============================================================================================
# |k| = n/10 : g = 1 agrandissement (n = w, 15..40), g = 0 réduction (n = u, 2..9).
# s = 1 : A et A' du même côté de O ; s = -1 : A, O, A' alignés dans cet ordre.

VARS_K = [var('s', '1|-1'), var('g', '0|1'), var('u', '2..9'), var('w', '15..40'),
          var('n', 'eval:g*w+(1-g)*u')]
K_TEX = '{{eval:s*n/10;d}}'
ABSK_TEX = '{{eval:n/10;d}}'
POSITION = ("{{if:s==1|Les points $O$, $A$ et $A'$ sont alignés, $A$ et $A'$ du même côté de $O$."
            "|Les points $A$, $O$ et $A'$ sont alignés dans cet ordre.}}")
ENONCE_H = "$A'$ est l'image de $A$ par une homothétie de centre $O$"


def fig_ligne(avec_b=False):
    """Figure à main levée : O, A, A' sur une droite (ordre selon s), pas à l'échelle."""
    lignes = [
        'O = point({{if:s==1|1|5}}, 1.5, etiquette="bas")',
        'A = point({{if:s==1|{{if:g==1|4|7}}|2}}, 1.5, etiquette="bas")',
        "Ap = point({{if:s==1|{{if:g==1|8|3}}|{{if:g==1|9|7}}}}, 1.5, etiquette=\"aucune\")",
        "texte({{if:s==1|{{if:g==1|8|3}}|{{if:g==1|9|7}}}}-0.2, 0.9, \"A'\")",
        'segment(point(0.3, 1.5, visible=faux), point(9.7, 1.5, visible=faux), trait="tirets")',
    ]
    return ('```figure\nfenetre: 0 ; 10 ; 0 ; 3\ndescription: Figure à main levée, pas à '
            "l'échelle : les points O, A et A' sur une même droite.\n---\n"
            + '\n'.join(lignes) + '\n```')


def specs_case(vi, juste, erreurs, v, desc):
    """Spec juste et une spec refusée par erreur prévue, pour le tirage v."""
    out = [spec(f'v{vi} {desc} : {fr(calc(juste, v))}', vi, v, 'correct', [fr(calc(juste, v))])]
    for x, msg, lab in erreurs:
        out.append(spec(f'v{vi} : {lab} ({fr(calc(x, v))})', vi, v, 'incorrect',
                        [fr(calc(x, v))], resoudre(msg, {**v})))
    return out


def blank(juste, erreurs):
    return case(exact(juste), [erreur(cent(x), msg, lab) for x, msg, lab in erreurs])


# Tirages des specs : agrandissement positif, réduction négative
TA = {'s': 1, 'g': 1, 'u': 4, 'w': 25, 'n': 25, 'a': 4}
TR = {'s': -1, 'g': 0, 'u': 4, 'w': 25, 'n': 4, 'a': 5}

# --- v0 : k depuis OA et OA'
J0 = 's*n/10'
E0 = [('s*10/n', "Tu as divisé OA par OA' : le rapport est $\\dfrac{OA'}{OA}$, la longueur "
       "d'arrivée sur la longueur de départ.", 'Rapport renversé'),
      ('-s*n/10', "Regarde la position des points : {{if:s==1|$A$ et $A'$ sont du même côté de "
       "$O$, le rapport est positif.|$O$ est entre $A$ et $A'$, le rapport est négatif.}}",
       'Signe faux'),
      ('a*n/10-a', "Tu as calculé la différence OA' − OA : le rapport se trouve par une "
       "division.", 'Différence')]
N3_V0 = variation(
    ENONCE_H + ". " + POSITION + " On donne $OA = {{a}}~\\unit{cm}$ et "
    "$OA' = {{eval:a*n/10;d}}~\\unit{cm}$. Calcule le rapport $k$ de cette homothétie (écriture décimale).\n\n"
    + fig_ligne() + '\n\n$k = ?$',
    VARS_K + [var('a', '2..12')],
    [blank(J0, E0)],
    ["$OA' {{if:g==1|>|<}} OA$ : c'est {{if:g==1|un agrandissement|une réduction}}, donc "
     "{{if:g==1|$k > 1$ ou $k < -1$|$k$ est entre $-1$ et $1$}}. {{if:s==1|$A$ et $A'$ sont du "
     "même côté de $O$ : $k$ est positif.|$O$ est entre $A$ et $A'$ : $k$ est négatif.}}",
     "$$k = {{if:s==1||-}}\\dfrac{OA'}{OA} = {{if:s==1||-}}\\dfrac{ {{eval:a*n/10;d}} }{ {{a}} } = "
     + couleur(K_TEX) + "$$"],
    "Le rapport compare la longueur d'arrivée OA' à la longueur de départ OA. Son signe dépend "
    "de la position de O.",
    distincts([J0] + [e[0] for e in E0]),
)
S_N3 = specs_case(0, J0, E0, TA, "OA = 4, OA' = 10, même côté")
S_N3 += [spec('v0 réduction négative : -0,4', 0, TR, 'correct', ['-0{,}4'])]

# --- v1 : OA' depuis OA et k
J1 = 'a*n/10'
E1 = [('a*10/n', "Tu as divisé OA par le rapport : une homothétie **multiplie** les longueurs "
       "par le rapport sans son signe.", 'Division'),
      ('-a*n/10', "Une longueur est toujours positive : on multiplie OA par le rapport sans son signe, "
       "le signe de $k$ dit seulement de quel côté de $O$ est $A'$.", 'Longueur négative')]
N3_V1 = variation(
    ENONCE_H + " et de rapport $k = " + K_TEX + "$. On donne $OA = {{a}}~\\unit{cm}$. Calcule "
    "$OA'$.\n\n$OA' = ?~\\unit{cm}$",
    VARS_K + [var('a', '2..12')],
    [blank(J1, E1)],
    ["Une homothétie de rapport $k$ multiplie les longueurs par $" + ABSK_TEX
     + "$ (le rapport sans son signe : la distance à $O$ ne dépend pas du signe de $k$).",
     "$$OA' = " + ABSK_TEX + " \\times {{a}} = " + couleur('{{eval:a*n/10;d}}~\\unit{cm}') + "$$"],
    "Une homothétie multiplie les distances au centre par la valeur du rapport, sans son signe.",
    distincts([J1] + [e[0] for e in E1]),
)
TR1 = {**TR, 'n': 4, 'a': 5}
S_N3 += specs_case(1, J1, E1, TR1, "k = -0,4, OA = 5")

# --- v2 : OA depuis OA' et k
J2 = 'a'
E2 = [('a*n*n/100', "Tu as multiplié OA' par le rapport : on cherche la longueur de départ, on "
       "divise donc OA' par le rapport sans son signe.", 'Multiplication'),
      ('-a', "Une longueur est toujours positive : le signe de $k$ dit seulement de quel côté de "
       "$O$ est $A'$.", 'Longueur négative')]
N3_V2 = variation(
    ENONCE_H + " et de rapport $k = " + K_TEX + "$. On donne $OA' = {{eval:a*n/10;d}}~\\unit{cm}$. "
    "Calcule $OA$.\n\n$OA = ?~\\unit{cm}$",
    VARS_K + [var('a', '2..12')],
    [blank(J2, E2)],
    ["$OA' = " + ABSK_TEX + " \\times OA$, donc on divise par $" + ABSK_TEX
     + "$.",
     "$$OA = \\dfrac{OA'}{" + ABSK_TEX + "} = \\dfrac{ {{eval:a*n/10;d}} }{" + ABSK_TEX + "} = "
     + couleur('{{a}}~\\unit{cm}') + "$$"],
    "OA' est la longueur d'arrivée : pour revenir au départ, on fait l'opération inverse.",
    distincts([J2] + [e[0] for e in E2]),
)
S_N3 += specs_case(2, J2, E2, {**TR, 'n': 4, 'a': 5}, "k = -0,4, OA' = 2")

# --- v3 : deux étapes, k depuis OA et OA', puis A'B' depuis AB
J3 = 'b*n/10'
E3 = [('b*10/n', "Tu as renversé le rapport : on multiplie AB par $\\dfrac{OA'}{OA}$, pas par "
       "$\\dfrac{OA}{OA'}$.", 'Rapport renversé'),
      ('b+a*n/10-a', "Une homothétie multiplie les longueurs ; elle n'ajoute pas la même "
       "différence.", 'Même différence')]
N3_V3 = variation(
    "$A'$ et $B'$ sont les images de $A$ et $B$ par une homothétie de centre $O$. " + POSITION
    + " On donne $OA = {{a}}~\\unit{cm}$, $OA' = {{eval:a*n/10;d}}~\\unit{cm}$ et "
    "$AB = {{b}}~\\unit{cm}$. Calcule $A'B'$.\n\n" + fig_ligne() + "\n\n$A'B' = ?~\\unit{cm}$",
    VARS_K + [var('a', '2..12'), var('b', '2..9')],
    [blank(J3, E3)],
    ["On cherche d'abord le rapport, sans son signe : $\\dfrac{OA'}{OA} = "
     "\\dfrac{ {{eval:a*n/10;d}} }{ {{a}} } = " + ABSK_TEX + "$.",
     "L'homothétie multiplie toutes les longueurs par $" + ABSK_TEX + "$ : $$A'B' = " + ABSK_TEX
     + " \\times {{b}} = " + couleur('{{eval:b*n/10;d}}~\\unit{cm}') + "$$"],
    "Commence par le rapport, avec OA et OA'. Il agit sur toutes les longueurs, AB comprise.",
    ['a != b'] + distincts([J3] + [e[0] for e in E3]),
)
S_N3 += specs_case(3, J3, E3, {**TA, 'b': 3}, "OA = 4, OA' = 10, AB = 3")

# --- v4 : k depuis OA et AA'. s = 1 : agrandissement (A entre O et A') ; s = -1 : AA' = OA + OA'.
AAP = '{{if:s==1|{{eval:a*(n-10)/10;d}}|{{eval:a*(n+10)/10;d}}}}'
J4 = 's*n/10'
E4 = [('s*(n-10*s)/10', "Tu as divisé AA' par OA : le rapport est $\\dfrac{OA'}{OA}$. Calcule "
       "d'abord $OA'$.", "AA' au lieu de OA'"),
      ('-s*n/10', "Regarde la position des points : {{if:s==1|$A$ et $A'$ sont du même côté de "
       "$O$, le rapport est positif.|$O$ est entre $A$ et $A'$, le rapport est négatif.}}",
       'Signe faux'),
      ('s*10/n', "Tu as renversé le rapport : $k$ a pour valeur $\\dfrac{OA'}{OA}$.",
       'Rapport renversé')]
N3_V4 = variation(
    ENONCE_H + ". {{if:s==1|Les points $O$, $A$ et $A'$ sont alignés dans cet ordre.|Les points "
    "$A$, $O$ et $A'$ sont alignés dans cet ordre.}} On donne $OA = {{a}}~\\unit{cm}$ et "
    "$AA' = " + AAP + "~\\unit{cm}$. Calcule le rapport $k$ de cette homothétie (écriture décimale).\n\n"
    + fig_ligne() + '\n\n$k = ?$',
    VARS_K + [var('a', '2..12')],
    [blank(J4, E4)],
    ["{{if:s==1|$A$ est entre $O$ et $A'$ : $OA' = OA + AA' = {{a}} + " + AAP
     + " = {{eval:a*n/10;d}}~\\unit{cm}$.|$O$ est entre $A$ et $A'$ : "
     "$OA' = AA' - OA = " + AAP + " - {{a}} = {{eval:a*n/10;d}}~\\unit{cm}$.}}",
     "$$k = {{if:s==1||-}}\\dfrac{OA'}{OA} = {{if:s==1||-}}\\dfrac{ {{eval:a*n/10;d}} }{ {{a}} } "
     "= " + couleur(K_TEX) + "$$"],
    "Calcule d'abord OA' en lisant l'ordre des points sur la droite.",
    ['(s+1)*(1-g) == 0'] + distincts([J4] + [e[0] for e in E4]),
)
S_N3 += specs_case(4, J4, E4, TA, "O, A, A', OA = 4, AA' = 6")
S_N3 += specs_case(4, J4, E4, {**TR, 'n': 4, 'a': 5}, "A, O, A', OA = 5, AA' = 7")

# --- v5 : encadrer k (choix à 4). Indice : (s+1) + g*s + (1-s)/2.
N3_V5 = variation(
    ENONCE_H + ". " + POSITION + " On donne $OA = {{a}}~\\unit{cm}$ et "
    "$OA' = {{eval:a*n/10;d}}~\\unit{cm}$. Sans calculer $k$, que peut-on dire du rapport $k$ de "
    "cette homothétie ?\n\n" + fig_ligne()
    + "\n\n```choix\n- $k < -1$\n- $-1 < k < 0$\n- $0 < k < 1$\n- $k > 1$\n```",
    VARS_K + [var('a', '2..12')],
    [case('{{eval:(s+1)+g*s+(1-s)/2}}')],
    ["$OA' {{if:g==1|>|<}} OA$ : l'image est {{if:g==1|plus loin de $O$ que $A$, c'est un "
     "agrandissement : $k > 1$ ou $k < -1$.|plus près de $O$ que $A$, c'est une réduction : "
     "$k$ est entre $-1$ et $1$.}}",
     "{{if:s==1|$A$ et $A'$ sont du même côté de $O$ : $k > 0$.|$O$ est entre $A$ et $A'$ : "
     "$k < 0$.}} Donc " + coul("{{if:s==1|{{if:g==1|k > 1|0 < k < 1}}|{{if:g==1|k < -1|-1 < "
     "k < 0}}}}") + '.'],
    "Deux questions : A' est-il plus loin de O que A, ou plus près ? Et O est-il entre A et A' ?",
)
S_N3 += [
    spec('v5 agrandissement positif : k > 1', 5, TA, 'correct', ['3']),
    spec('v5 : signe oublié (k < -1)', 5, TA, 'incorrect', ['0']),
    spec('v5 réduction négative : -1 < k < 0', 5, TR, 'correct', ['1']),
    spec('v5 : réduction prise pour 0 < k < 1', 5, TR, 'incorrect', ['2']),
    spec('v5 agrandissement négatif : k < -1', 5, {**TA, 's': -1}, 'correct', ['0']),
    spec('v5 réduction positive : 0 < k < 1', 5, {**TR, 's': 1}, 'correct', ['2']),
]

# --- v6 : aire de l'image, rapport négatif (aire × k²)
J6 = 'ai*n*n/100'
E6 = [('ai*n/10', "Les aires ne sont pas multipliées par le rapport sans son signe, mais par $k^2$ : "
       "une aire, c'est longueur × longueur.", 'Multiplié par |k|'),
      ('-ai*n*n/100', "Une aire est toujours positive : $k^2$ est un carré, il est positif.",
       'Aire négative'),
      ('ai*2*n/10', "$k^2$ n'est pas le double du rapport : $k^2 = k \\times k$.",
       '2k au lieu de k²')]
N3_V6 = variation(
    "Une figure a pour aire ${{ai}}~\\unit{cm^2}$. Quelle est l'aire de son image par une "
    "homothétie de rapport $" + K_TEX + "$ ?\n\n$\\text{Aire} = ?~\\unit{cm^2}$",
    VARS_K + [var('ai', '4..60')],
    [blank(J6, E6)],
    ["Une homothétie de rapport $k$ multiplie les longueurs par $" + ABSK_TEX + "$, donc les "
     "aires par $k^2 = (" + K_TEX + ")^2 = {{eval:n*n/100;d}}$. Le signe de $k$ ne change rien.",
     "$$\\text{Aire} = {{eval:n*n/100;d}} \\times {{ai}} = "
     + couleur('{{eval:ai*n*n/100;d}}~\\unit{cm^2}') + "$$"],
    "Une aire est le produit de deux longueurs : chacune est multipliée par |k|.",
    ['s == -1', 'round(100*ai*n*n/100) == ai*n*n', 'ai*n*n/100 < 1000']
    + distincts([J6] + [e[0] for e in E6]),
)
S_N3 += specs_case(6, J6, E6, {'s': -1, 'g': 0, 'u': 5, 'w': 25, 'n': 5, 'ai': 20},
                   "k = -0,5, aire 20")

N3 = modele(
    "Calculs liés à une homothétie",
    "Rapport d'une homothétie depuis OA et OA' ou depuis OA et AA', longueur de l'image ou de "
    "départ, longueur en deux étapes, encadrement du rapport selon la position des points, aire "
    "de l'image par un rapport négatif.",
    2, 180, [N3_V0, N3_V1, N3_V2, N3_V3, N3_V4, N3_V5, N3_V6], S_N3)


# =============================================================================================
# N4 — Rotation dans un pavage
# =============================================================================================

def pavage_carres():
    """Carrés 4 × 4 de côté 2, pièces numérotées de 1 (en haut à gauche) à 16."""
    lignes = []
    for t in range(5):
        lignes.append(f'h{t}a = point(0, {2*t}, visible=faux)')
        lignes.append(f'h{t}b = point(8, {2*t}, visible=faux)')
        lignes.append(f'segment(h{t}a, h{t}b)')
        lignes.append(f'v{t}a = point({2*t}, 0, visible=faux)')
        lignes.append(f'v{t}b = point({2*t}, 8, visible=faux)')
        lignes.append(f'segment(v{t}a, v{t}b)')
    for q in range(4):
        for p in range(4):
            num = 4 * (3 - q) + p + 1
            lignes.append(f'texte({2*p+0.8}, {2*q+1.2}, "{num}")')
    lignes.append('O = point(2*{{cx}}, 2*{{cy}}, etiquette="haut-droite")')
    return ('```figure\nfenetre: -0.5 ; 8.5 ; -0.5 ; 8.5\ndescription: Pavage de 16 carrés '
            'numérotés de 1 à 16, ligne par ligne depuis le haut à gauche ; le point O est un '
            'sommet du pavage.\n---\n' + '\n'.join(lignes) + '\n```')


NUM = '4*(3-q)+p+1'
# Quart de tour direct : i' = cx+cy-q-1, j' = cy-cx+p
IMG_D = '4*(3-(cy-cx+p))+(cx+cy-q-1)+1'
# Quart de tour indirect : i' = cx-cy+q, j' = cx+cy-p-1
IMG_I = '4*(3-(cx+cy-p-1))+(cx-cy+q)+1'
# Demi-tour : i' = 2cx-p-1, j' = 2cy-q-1
IMG_DT = '4*(3-(2*cy-q-1))+(2*cx-p-1)+1'

DANS = lambda ii, jj: [f'{ii} >= 0', f'{ii} <= 3', f'{jj} >= 0', f'{jj} <= 3']  # noqa: E731

E_SENS = ("Tu as tourné dans le sens des aiguilles d'une montre : ici, c'est le sens inverse.",
          'Sens inversé')
N4_V0 = variation(
    "Quelle pièce est l'image de la pièce n° ${{eval:" + NUM + "}}$ par la rotation de centre $O$ "
    "et d'angle $90^{\\circ}$ " + SENS_DIRECT + " ?\n\n" + pavage_carres() + "\n\nPièce n° $?$",
    [var('cx', '1..3'), var('cy', '1..3'), var('p', '0..3'), var('q', '0..3')],
    [case('{{eval:' + IMG_D + '}}',
          [erreur('{{eval:' + IMG_I + '}}', E_SENS[0], E_SENS[1]),
           erreur('{{eval:' + IMG_DT + '}}', "Tu as fait un demi-tour : un angle de "
                  "$90^{\\circ}$, c'est un quart de tour.", 'Demi-tour')])],
    ["La pièce n° ${{eval:" + NUM + "}}$ tourne autour de $O$ d'un quart de tour, " + SENS_DIRECT
     + " : chacun de ses sommets tourne de $90^{\\circ}$ autour de $O$, à la même distance de $O$.",
     "Elle arrive sur la pièce n° " + coul('{{eval:' + IMG_D + '}}') + '.'],
    "Suis un coin de la pièce : il tourne autour de O comme l'aiguille d'une montre à l'envers, "
    "d'un quart de tour.",
    DANS('cx+cy-q-1', 'cy-cx+p') + DANS('cx-cy+q', 'cx+cy-p-1') + DANS('2*cx-p-1', '2*cy-q-1'),
)
VP = {'cx': 2, 'cy': 2, 'p': 2, 'q': 2}
# pièce (2,2) = n° 7 ; image directe i'=1, j'=2 → n° 6 ; indirecte i'=2, j'=1 → n° 11 ; demi-tour (1,1) → 10
S_N4 = [
    spec('v0 pièce 7, O au centre : 6', 0, VP, 'correct', ['6']),
    spec('v0 : sens inversé (11)', 0, VP, 'incorrect', ['11'], E_SENS[0]),
    spec('v0 : demi-tour (10)', 0, VP, 'incorrect', ['10']),
]

N4_V1 = variation(
    "Quelle pièce est l'image de la pièce n° ${{eval:" + NUM + "}}$ par la rotation de centre $O$ "
    "et d'angle $180^{\\circ}$ ?\n\n" + pavage_carres() + "\n\nPièce n° $?$",
    [var('cx', '1..3'), var('cy', '1..3'), var('p', '0..3'), var('q', '0..3')],
    [case('{{eval:' + IMG_DT + '}}',
          [erreur('{{eval:' + IMG_D + '}}', "Tu as fait un quart de tour : un angle de "
                  "$180^{\\circ}$, c'est un demi-tour.", 'Quart de tour')])],
    ["Un demi-tour autour de $O$ est la symétrie de centre $O$ : chaque sommet de la pièce a "
     "son image de l'autre côté de $O$, à la même distance.",
     "La pièce n° ${{eval:" + NUM + "}}$ arrive sur la pièce n° " + coul('{{eval:' + IMG_DT
                                                                        + '}}') + '.'],
    "Un demi-tour : O est le milieu du segment qui relie un coin de la pièce à son image.",
    DANS('cx+cy-q-1', 'cy-cx+p') + DANS('2*cx-p-1', '2*cy-q-1')
    + [f'{IMG_D} != {IMG_DT}'],
)
S_N4 += [
    spec('v1 pièce 7, O au centre : 10', 1, VP, 'correct', ['10']),
    spec('v1 : quart de tour (6)', 1, VP, 'incorrect', ['6']),
]


# --- v2 : triangles équilatéraux dans un hexagone de rayon 2 autour de O.
def triangles_hexagone():
    """Les 24 triangles (côté 2) d'un hexagone de rayon 4 centré en O(0 ; 0), numérotés de
    haut en bas puis de gauche à droite. Rend (liste de sommets, centres)."""
    h = math.sqrt(3)

    def sommet(a, b):
        return (2 * a + b, b * h)

    def dans_hex(p):
        x, y = p
        return (abs(y) <= 2 * h + 1e-9 and abs(h * x) + abs(y) <= 4 * h + 1e-9)

    tris = []
    for a in range(-5, 6):
        for b in range(-3, 4):
            for t in (((a, b), (a + 1, b), (a, b + 1)), ((a + 1, b), (a + 1, b + 1), (a, b + 1))):
                pts = [sommet(*q) for q in t]
                if all(dans_hex(p) for p in pts):
                    tris.append(pts)
    centres = [(sum(p[0] for p in t) / 3, sum(p[1] for p in t) / 3) for t in tris]
    # Rangée par rangée (bandes de hauteur h), de gauche à droite dans la rangée
    ordre = sorted(range(len(tris)), key=lambda k: (-math.floor(centres[k][1] / h),
                                                    round(centres[k][0], 3)))
    return [tris[k] for k in ordre], [centres[k] for k in ordre]


TRIS, CENTRES = triangles_hexagone()
assert len(TRIS) == 24, len(TRIS)


def image_triangle(num, angle):
    cx, cy = CENTRES[num - 1]
    r = math.radians(angle)
    x, y = cx * math.cos(r) - cy * math.sin(r), cx * math.sin(r) + cy * math.cos(r)
    for k, (u, v) in enumerate(CENTRES):
        if abs(u - x) < 1e-6 and abs(v - y) < 1e-6:
            return k + 1
    raise ValueError((num, angle))


def figure_triangles():
    aretes = set()
    for t in TRIS:
        for p, q in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])):
            cle = tuple(sorted([(round(p[0], 4), round(p[1], 4)), (round(q[0], 4), round(q[1], 4))]))
            aretes.add(cle)
    lignes = []
    for n, (p, q) in enumerate(sorted(aretes)):
        lignes.append(f'e{n}a = point({p[0]}, {p[1]}, visible=faux)')
        lignes.append(f'e{n}b = point({q[0]}, {q[1]}, visible=faux)')
        lignes.append(f'segment(e{n}a, e{n}b)')
    for k, (x, y) in enumerate(CENTRES):
        lignes.append(f'texte({round(x - 0.2, 3)}, {round(y + 0.2, 3)}, "{k + 1}")')
    lignes.append('O = point(0, 0, etiquette="bas")')
    return ('```figure\nfenetre: -4.6 ; 4.6 ; -3.9 ; 3.9\ndescription: Hexagone régulier de '
            'centre O découpé en 24 triangles équilatéraux numérotés de 1 à 24, rangée par rangée '
            'depuis le haut, de gauche à droite.\n---\n' + '\n'.join(lignes) + '\n```')


# Six configurations : (pièce, angle en degrés, positif = sens inverse des aiguilles)
CONFIGS = [(2, 60), (9, 120), (14, -60), (20, -120), (5, 120), (17, 60)]


def si_k(valeurs):
    """{{if:k==1|v1|{{if:k==2|v2|…}}}}"""
    texte = str(valeurs[-1])
    for idx in range(len(valeurs) - 2, -1, -1):
        texte = f'{{{{if:k=={idx + 1}|{valeurs[idx]}|{texte}}}}}'
    return texte


PIECES = [c[0] for c in CONFIGS]
ANGLES = [abs(c[1]) for c in CONFIGS]
SENS = [SENS_DIRECT if c[1] > 0 else SENS_INDIRECT for c in CONFIGS]
IMAGES = [image_triangle(p, a) for p, a in CONFIGS]
IMAGES_INV = [image_triangle(p, -a) for p, a in CONFIGS]
for p, im, inv in zip(PIECES, IMAGES, IMAGES_INV):
    assert len({p, im, inv}) == 3, (p, im, inv)

N4_V2 = variation(
    "Quelle pièce est l'image de la pièce n° $" + si_k(PIECES) + "$ par la rotation de centre $O$ "
    "et d'angle $" + si_k(ANGLES) + "^{\\circ}$ " + si_k(SENS) + " ?\n\n" + figure_triangles()
    + "\n\nPièce n° $?$",
    [var('k', '1..6')],
    [case(si_k(IMAGES), [erreur(si_k(IMAGES_INV), "Tu as tourné dans l'autre sens : relis le sens "
                                "de la rotation.", 'Sens inversé')])],
    ["Les six angles autour de $O$ mesurent chacun $60^{\\circ}$ : une rotation de "
     "$" + si_k(ANGLES) + "^{\\circ}$ fait tourner chaque pièce d'" + si_k(
         ['un cran' if a == 60 else 'deux crans' for a in ANGLES])
     + " autour de $O$, " + si_k(SENS) + ".",
     "La pièce n° $" + si_k(PIECES) + "$ arrive sur la pièce n° " + coul(si_k(IMAGES)) + '.'],
    "Autour de O, six triangles se partagent le tour complet : chacun fait 60°.",
)
S_N4 += [
    spec(f'v2 k={k + 1} : pièce {PIECES[k]} → {IMAGES[k]}', 2, {'k': k + 1}, 'correct',
         [str(IMAGES[k])]) for k in range(6)]
S_N4 += [spec(f'v2 k=1 : sens inversé ({IMAGES_INV[0]})', 2, {'k': 1}, 'incorrect',
              [str(IMAGES_INV[0])])]

N4 = modele(
    "Rotation dans un pavage",
    "Dans un pavage de carrés ou de triangles équilatéraux aux pièces numérotées, trouver l'image "
    "d'une pièce par un quart de tour, un demi-tour, ou une rotation de 60° ou 120°.",
    2, 180, [N4_V0, N4_V1, N4_V2], S_N4)


ecrire('n1-image-d-un-point-par-une-rotation', N1)
ecrire('n2-image-d-un-point-par-une-homothetie', N2)
ecrire('n3-calculs-lies-a-une-homothetie', N3)
ecrire('n4-rotation-dans-un-pavage', N4)
