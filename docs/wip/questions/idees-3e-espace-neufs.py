"""Écrit le modèle neuf F1 du chantier idees-3e-espace dans
scripts/questions/idees-3e-espace-neufs/.

Phase 0 validée par David le 2026-11-27 (« je valide » ; journal
docs/archive/wip/idees-3e-espace/idees-3e-espace-progress.md, fiche F1) : un modèle neuf de 4e, « Calculer une longueur
dans un solide avec Pythagore », après l'outil n° 72 (`segments:` et `angles-droits:` du bloc
solide, #3264).

Rangement prévu (migration générée après la création en brouillon) : nœud « Géométrie >
Théorème de Pythagore > calcul de longueurs », à côté de 22d947f4 (figures planes), point 4-034.
Grades 4 seulement.

Décisions et pièges :
- Diagonale du cube et du pavé : [DF] et le triangle DHF rectangle en H, jamais [AG] (en
  cavalière, le dessin de [AG] se couche sur l'arête [FG] ; ubumark.md, piège de la cavalière).
- Cylindre (v4) : l'outil ne trace pas de segment sur un solide rond (phase 0 de l'outil) ; la
  figure montre le cylindre et ses deux centres, le point M et le triangle sont dans l'énoncé.
- Cône (v5) : la génératrice est déjà un trait du dessin, aucun segment à ajouter.
- Cube, face (v0) : [BE], jamais [AF] : en cavalière, le dessin de [AF] passe sur D.
- Formes lisibles (vues à l'écran le 2026-11-28) : pavé l ≤ 3p et l ≤ 3h (sinon une face écrasée),
  cône h ≤ 3r et r ≥ 3 (sinon une aiguille, nom de O sur le bord), pyramide 2h ≥ a et h ≤ 3a.
- Pyramide (v6) : `points: O centre ABCD`, `segments: [SO], [OA]`, `angles-droits: SOA`.
- Résultats arrondis au dixième : jamais un entier (sinon rien à arrondir), et jamais à la limite
  de l'arrondi (dixième de 10 × la longueur entre 0,4 et 0,6), comme v5 de 7bb95104.

Ni theme, ni domain, ni subdomain, ni id : create-questions --publier écrit l'id.

Règles suivies (couvrir-un-niveau.md § 5) : trois erreurs prévues par case (de vraies erreurs
d'élèves), chacune avec sa spec `incorrect` qui nomme son message ; un coup de pouce par
variation, qui ne donne jamais la réponse.

Usage : python3 docs/wip/questions/idees-3e-espace-neufs.py scripts/questions/idees-3e-espace-neufs
"""
import json
import math
import re
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'


def spec(desc, vi, variables_, status, answers, message=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = reecrit(message)
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables_.items()},
            'expected': expected, 'answers': answers}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def reecrit(message):
    """Forme réécrite à la résolution d'un message : $[DF]$ → $\\left[ DF \\right]$ (sinon la spec
    qui nomme le message est rouge, couvrir-un-niveau.md § 5)."""
    return re.sub(r'\$\[([A-Z]+)\]\$', r'$\\left[ \1 \\right]$', message)


def erreur(answer, message, label):
    return {'answer': answer, 'message': reecrit(message), 'label': label}


def case(attendue, erreurs):
    return {'expectedAnswer': attendue, 'expectedErrors': erreurs}


def variation(statement, variables, blanks, steps, hint, conditions):
    return {'statement': statement, 'variables': variables, 'conditions': conditions,
            'blanks': blanks, 'correction': {'steps': steps}, 'hint': hint}


def dixieme(x):
    """Écriture d'une spec : 7,1 → « 7{,}1 »."""
    t = f'{round(10 * x) / 10:.1f}'
    return t.replace('.', '{,}')


def entier_ou_dixieme(x):
    return dixieme(x) if abs(x - round(x)) > 1e-9 else str(round(x))


def sans_borne(expr):
    """Conditions d'un résultat à arrondir au dixième : ni entier, ni à la limite."""
    return [f'abs(({expr}) - round({expr})) > 0.05',
            f'abs(10*({expr}) - round(10*({expr}))) < 0.4']


def arrondi(expr):
    return f'{{{{eval:round(10*({expr}))/10;d}}}}'


# Messages des erreurs prévues, communs aux variations
RACINE_OUBLIEE = ("Tu as trouvé le **carré** de la longueur : il reste à prendre sa racine "
                  "carrée.")
LONGUEURS_AJOUTEES = ("On n'ajoute pas les longueurs : la longueur cherchée est l'hypoténuse "
                      "d'un triangle rectangle, utilise le théorème de Pythagore.")
CARRES_SOUSTRAITS = ("La longueur cherchée est l'hypoténuse, le plus long côté : on **ajoute** "
                     "les carrés des deux autres côtés.")

variations = []
specs = []

# ── v0 : diagonale d'une face d'un cube ──────────────────────────────────────
V = len(variations)
variations.append(variation(
    "$ABCDEFGH$ est un cube d'arête ${{a}}~\\unit{cm}$. Calcule la longueur de la diagonale "
    "$[BE]$ de la face $ABFE$, arrondie au dixième.\n\n"
    "```solide\nforme: cube {{a}}\nsommets: A B C D E F G H\ncotes: cm\n"
    "segments: [BE]\nangles-droits: BAE\n```\n\n$BE \\approx ?~\\unit{cm}$",
    [var('a', '3..12')],
    [case(arrondi('a*sqrt(2)'), [
        erreur('{{eval:2*a^2}}', RACINE_OUBLIEE, 'Racine carrée oubliée'),
        erreur('{{eval:2*a}}', LONGUEURS_AJOUTEES, 'Longueurs ajoutées'),
        erreur(arrondi('sqrt(2*a)'),
               "Le carré d'un nombre n'est pas son double : $a^2 = a \\times a$.",
               'Carré pris pour le double'),
    ])],
    ["La face $ABFE$ est un carré : le triangle $BAE$ est rectangle en $A$, d'hypoténuse $[BE]$.",
     "Théorème de Pythagore : $BE^2 = AB^2 + AE^2 = {{a}}^2 + {{a}}^2 = {{eval:2*a^2}}$.",
     f"Donc $BE = \\sqrt{{{{{{eval:2*a^2}}}}}} \\approx {PRIMAIRE}{{{arrondi('a*sqrt(2)')}~\\unit{{cm}}}}$ "
     "(à la calculatrice, arrondi au dixième)."],
    "Repère un triangle rectangle dont la longueur cherchée est l'hypoténuse.",
    sans_borne('a*sqrt(2)'),
))
a = 5
s = {'a': a}
specs += [
    spec('a = 5 : 5√2 ≈ 7,1', V, s, 'correct', [dixieme(a * math.sqrt(2))]),
    spec('Erreur : 2a² = 50', V, s, 'incorrect', ['50'], RACINE_OUBLIEE),
    spec('Erreur : 2a = 10', V, s, 'incorrect', ['10'], LONGUEURS_AJOUTEES),
    spec('Erreur : √(2a) ≈ 3,2', V, s, 'incorrect', [dixieme(math.sqrt(2 * a))],
         "Le carré d'un nombre n'est pas son double : $a^2 = a \\times a$."),
    spec('Erreur : valeur tronquée 7,0', V, s, 'incorrect', ['7']),
]

# ── v1 : diagonale d'un cube, en deux temps ──────────────────────────────────
V = len(variations)
DIAG_FACE = ("Tu as calculé la diagonale d'une **face** : $[DF]$ traverse le cube, c'est "
             "l'hypoténuse du triangle $DHF$.")
variations.append(variation(
    "$ABCDEFGH$ est un cube d'arête ${{a}}~\\unit{cm}$. Calcule la longueur de sa diagonale "
    "$[DF]$, arrondie au dixième.\n\n"
    "```solide\nforme: cube {{a}}\nsommets: A B C D E F G H\ncotes: cm\n"
    "segments: [HF], [DF]\nangles-droits: DHF\n```\n\n$DF \\approx ?~\\unit{cm}$",
    [var('a', '3..12')],
    [case(arrondi('a*sqrt(3)'), [
        erreur(arrondi('a*sqrt(2)'), DIAG_FACE, 'Diagonale de la face'),
        erreur('{{eval:3*a}}', LONGUEURS_AJOUTEES, 'Longueurs ajoutées'),
        erreur('{{eval:3*a^2}}', RACINE_OUBLIEE, 'Racine carrée oubliée'),
    ])],
    ["Dans la face $EFGH$, le triangle $HEF$ est rectangle en $E$ : "
     "$HF^2 = HE^2 + EF^2 = {{a}}^2 + {{a}}^2 = {{eval:2*a^2}}$.",
     "L'arête $[DH]$ est perpendiculaire à la face $EFGH$ : le triangle $DHF$ est rectangle en $H$, "
     "d'hypoténuse $[DF]$.",
     "Théorème de Pythagore : $DF^2 = DH^2 + HF^2 = {{eval:a^2}} + {{eval:2*a^2}} = {{eval:3*a^2}}$.",
     f"Donc $DF = \\sqrt{{{{{{eval:3*a^2}}}}}} \\approx {PRIMAIRE}{{{arrondi('a*sqrt(3)')}~\\unit{{cm}}}}$ "
     "(à la calculatrice, arrondi au dixième)."],
    "Commence par la diagonale $[HF]$ de la face du dessus, puis utilise le triangle $DHF$, "
    "rectangle en $H$.",
    sans_borne('a*sqrt(3)'),
))
s = {'a': 5}
specs += [
    spec('a = 5 : 5√3 ≈ 8,7', V, s, 'correct', [dixieme(5 * math.sqrt(3))]),
    spec('Erreur : diagonale de la face ≈ 7,1', V, s, 'incorrect', [dixieme(5 * math.sqrt(2))],
         DIAG_FACE),
    spec('Erreur : 3a = 15', V, s, 'incorrect', ['15'], LONGUEURS_AJOUTEES),
    spec('Erreur : 3a² = 75', V, s, 'incorrect', ['75'], RACINE_OUBLIEE),
]

# ── v2 : diagonale d'une face d'un pavé ──────────────────────────────────────
V = len(variations)
variations.append(variation(
    "$ABCDEFGH$ est un pavé droit : $EF = {{l}}~\\unit{cm}$, $EH = {{p}}~\\unit{cm}$ et "
    "$AE = {{h}}~\\unit{cm}$. Calcule la longueur de la diagonale $[HF]$ de la face $EFGH$, "
    "arrondie au dixième.\n\n"
    "```solide\nforme: pave {{l}} {{p}} {{h}}\nsommets: A B C D E F G H\ncotes: cm\n"
    "segments: [HF]\nangles-droits: HEF\n```\n\n$HF \\approx ?~\\unit{cm}$",
    [var('l', '4..12'), var('p', '2..8'), var('h', '2..10')],
    [case(arrondi('sqrt(l^2+p^2)'), [
        erreur('{{eval:l+p}}', LONGUEURS_AJOUTEES, 'Longueurs ajoutées'),
        erreur('{{eval:l^2+p^2}}', RACINE_OUBLIEE, 'Racine carrée oubliée'),
        erreur(arrondi('sqrt(l^2-p^2)'), CARRES_SOUSTRAITS, 'Carrés soustraits'),
    ])],
    ["La face $EFGH$ est un rectangle : le triangle $HEF$ est rectangle en $E$, d'hypoténuse $[HF]$.",
     "Théorème de Pythagore : $HF^2 = EF^2 + EH^2 = {{l}}^2 + {{p}}^2 = {{eval:l^2+p^2}}$.",
     f"Donc $HF = \\sqrt{{{{{{eval:l^2+p^2}}}}}} \\approx {PRIMAIRE}{{{arrondi('sqrt(l^2+p^2)')}~\\unit{{cm}}}}$ "
     "(à la calculatrice, arrondi au dixième)."],
    "Repère un triangle rectangle dont la longueur cherchée est l'hypoténuse.",
    ['p < l', 'h != l', 'h != p', 'l <= 3*h', 'l <= 3*p'] + sans_borne('sqrt(l^2+p^2)'),
))
s = {'l': 6, 'p': 4, 'h': 3}
specs += [
    spec('l = 6, p = 4 : √52 ≈ 7,2', 2, s, 'correct', [dixieme(math.sqrt(52))]),
    spec('Erreur : l + p = 10', 2, s, 'incorrect', ['10'], LONGUEURS_AJOUTEES),
    spec('Erreur : l² + p² = 52', 2, s, 'incorrect', ['52'], RACINE_OUBLIEE),
    spec('Erreur : √(l² − p²) ≈ 4,5', 2, s, 'incorrect', [dixieme(math.sqrt(20))], CARRES_SOUSTRAITS),
]

# ── v3 : diagonale d'un pavé, en deux temps ──────────────────────────────────
V = len(variations)
DIAG_FACE_PAVE = ("Tu as calculé la diagonale de la face du dessus : $[DF]$ traverse le pavé, "
                  "c'est l'hypoténuse du triangle $DHF$.")
variations.append(variation(
    "$ABCDEFGH$ est un pavé droit : $EF = {{l}}~\\unit{cm}$, $EH = {{p}}~\\unit{cm}$ et "
    "$DH = {{h}}~\\unit{cm}$. Calcule la longueur de sa diagonale $[DF]$, arrondie au dixième.\n\n"
    "```solide\nforme: pave {{l}} {{p}} {{h}}\nsommets: A B C D E F G H\ncotes: cm\n"
    "segments: [HF], [DF]\nangles-droits: DHF\n```\n\n$DF \\approx ?~\\unit{cm}$",
    [var('l', '4..12'), var('p', '2..8'), var('h', '2..10')],
    [case(arrondi('sqrt(l^2+p^2+h^2)'), [
        erreur(arrondi('sqrt(l^2+p^2)'), DIAG_FACE_PAVE, 'Diagonale de la face'),
        erreur('{{eval:l+p+h}}', LONGUEURS_AJOUTEES, 'Longueurs ajoutées'),
        erreur('{{eval:l^2+p^2+h^2}}', RACINE_OUBLIEE, 'Racine carrée oubliée'),
    ])],
    ["Dans la face $EFGH$, le triangle $HEF$ est rectangle en $E$ : "
     "$HF^2 = EF^2 + EH^2 = {{l}}^2 + {{p}}^2 = {{eval:l^2+p^2}}$.",
     "L'arête $[DH]$ est perpendiculaire à la face $EFGH$ : le triangle $DHF$ est rectangle en $H$, "
     "d'hypoténuse $[DF]$.",
     "Théorème de Pythagore : $DF^2 = DH^2 + HF^2 = {{h}}^2 + {{eval:l^2+p^2}} = {{eval:l^2+p^2+h^2}}$.",
     f"Donc $DF = \\sqrt{{{{{{eval:l^2+p^2+h^2}}}}}} \\approx {PRIMAIRE}{{{arrondi('sqrt(l^2+p^2+h^2)')}~\\unit{{cm}}}}$ "
     "(à la calculatrice, arrondi au dixième)."],
    "Commence par la diagonale $[HF]$ de la face du dessus, puis utilise le triangle $DHF$, "
    "rectangle en $H$.",
    ['p < l', 'h != l', 'h != p', 'l <= 3*h', 'l <= 3*p']
    + sans_borne('sqrt(l^2+p^2+h^2)')
    + ['abs(sqrt(l^2+p^2) - round(sqrt(l^2+p^2))) > 0.05'],
))
s = {'l': 6, 'p': 4, 'h': 3}
specs += [
    spec('l = 6, p = 4, h = 3 : √61 ≈ 7,8', V, s, 'correct', [dixieme(math.sqrt(61))]),
    spec('Erreur : diagonale de la face ≈ 7,2', V, s, 'incorrect', [dixieme(math.sqrt(52))],
         DIAG_FACE_PAVE),
    spec('Erreur : l + p + h = 13', V, s, 'incorrect', ['13'], LONGUEURS_AJOUTEES),
    spec('Erreur : l² + p² + h² = 61', V, s, 'incorrect', ['61'], RACINE_OUBLIEE),
]

# ── v4 : cylindre, du centre d'une base au bord de l'autre ───────────────────
V = len(variations)
variations.append(variation(
    "Un cylindre a pour axe $[OO']$ : $O$ et $O'$ sont les centres de ses bases. Son rayon "
    "mesure ${{r}}~\\unit{cm}$ et sa hauteur ${{h}}~\\unit{cm}$. $M$ est un point du cercle de "
    "centre $O'$. Calcule la longueur $OM$, arrondie au dixième.\n\n"
    "```solide\nforme: cylindre {{r}} {{h}}\nsommets: O O'\ncotes: cm\n```\n\n"
    "$OM \\approx ?~\\unit{cm}$",
    [var('r', '2..8'), var('h', '4..15')],
    [case(arrondi('sqrt(r^2+h^2)'), [
        erreur('{{eval:r+h}}', LONGUEURS_AJOUTEES, 'Longueurs ajoutées'),
        erreur('{{eval:r^2+h^2}}', RACINE_OUBLIEE, 'Racine carrée oubliée'),
        erreur(arrondi('sqrt(h^2-r^2)'), CARRES_SOUSTRAITS, 'Carrés soustraits'),
    ])],
    ["L'axe $[OO']$ est perpendiculaire à la base de centre $O'$ : le triangle $OO'M$ est "
     "rectangle en $O'$, d'hypoténuse $[OM]$. $OO' = {{h}}~\\unit{cm}$ (la hauteur) et "
     "$O'M = {{r}}~\\unit{cm}$ (le rayon).",
     "Théorème de Pythagore : $OM^2 = OO'^2 + O'M^2 = {{h}}^2 + {{r}}^2 = {{eval:r^2+h^2}}$.",
     f"Donc $OM = \\sqrt{{{{{{eval:r^2+h^2}}}}}} \\approx {PRIMAIRE}{{{arrondi('sqrt(r^2+h^2)')}~\\unit{{cm}}}}$ "
     "(à la calculatrice, arrondi au dixième)."],
    "Les points $O$, $O'$ et $M$ forment un triangle rectangle : en quel point est l'angle droit ?",
    ['h > r'] + sans_borne('sqrt(r^2+h^2)'),
))
s = {'r': 3, 'h': 7}
specs += [
    spec('r = 3, h = 7 : √58 ≈ 7,6', V, s, 'correct', [dixieme(math.sqrt(58))]),
    spec('Erreur : r + h = 10', V, s, 'incorrect', ['10'], LONGUEURS_AJOUTEES),
    spec('Erreur : r² + h² = 58', V, s, 'incorrect', ['58'], RACINE_OUBLIEE),
    spec('Erreur : √(h² − r²) ≈ 6,3', V, s, 'incorrect', [dixieme(math.sqrt(40))], CARRES_SOUSTRAITS),
]

# ── v5 : génératrice d'un cône ───────────────────────────────────────────────
V = len(variations)
variations.append(variation(
    "Un cône de révolution a pour sommet $S$ ; $O$ est le centre de sa base. Son rayon mesure "
    "${{r}}~\\unit{cm}$ et sa hauteur $SO = {{h}}~\\unit{cm}$. $M$ est un point du cercle de base. "
    "Calcule la longueur $SM$ de la génératrice, arrondie au dixième.\n\n"
    "```solide\nforme: cone {{r}} {{h}}\nsommets: S O\ncotes: cm\n```\n\n"
    "$SM \\approx ?~\\unit{cm}$",
    [var('r', '3..9'), var('h', '4..15')],
    [case(arrondi('sqrt(r^2+h^2)'), [
        erreur('{{eval:r+h}}', LONGUEURS_AJOUTEES, 'Longueurs ajoutées'),
        erreur('{{eval:r^2+h^2}}', RACINE_OUBLIEE, 'Racine carrée oubliée'),
        erreur(arrondi('sqrt(h^2-r^2)'), CARRES_SOUSTRAITS, 'Carrés soustraits'),
    ])],
    ["La hauteur $[SO]$ est perpendiculaire à la base : le triangle $SOM$ est rectangle en $O$, "
     "d'hypoténuse $[SM]$. $SO = {{h}}~\\unit{cm}$ et $OM = {{r}}~\\unit{cm}$ (le rayon).",
     "Théorème de Pythagore : $SM^2 = SO^2 + OM^2 = {{h}}^2 + {{r}}^2 = {{eval:r^2+h^2}}$.",
     f"Donc $SM = \\sqrt{{{{{{eval:r^2+h^2}}}}}} \\approx {PRIMAIRE}{{{arrondi('sqrt(r^2+h^2)')}~\\unit{{cm}}}}$ "
     "(à la calculatrice, arrondi au dixième)."],
    "Le sommet, le centre de la base et un point du cercle de base forment un triangle rectangle : "
    "en quel point est l'angle droit ?",
    ['h > r', 'h <= 3*r'] + sans_borne('sqrt(r^2+h^2)'),
))
s = {'r': 3, 'h': 7}
specs += [
    spec('r = 3, h = 7 : √58 ≈ 7,6', V, s, 'correct', [dixieme(math.sqrt(58))]),
    spec('Erreur : r + h = 10', V, s, 'incorrect', ['10'], LONGUEURS_AJOUTEES),
    spec('Erreur : r² + h² = 58', V, s, 'incorrect', ['58'], RACINE_OUBLIEE),
    spec('Erreur : √(h² − r²) ≈ 6,3', V, s, 'incorrect', [dixieme(math.sqrt(40))], CARRES_SOUSTRAITS),
]

# ── v6 : arête latérale d'une pyramide régulière à base carrée ───────────────
V = len(variations)
COTE_ENTIER = ("$[OA]$ n'est pas un côté du carré : c'est la moitié de sa diagonale $[AC]$. "
               "Calcule d'abord $AC$.")
DEMI_COTE = ("$O$ n'est pas le milieu d'un côté : c'est le centre du carré, $OA$ est la moitié de "
             "la diagonale $[AC]$.")
DIAG_ENTIERE = "$OA$ est la **moitié** de la diagonale $[AC]$, pas la diagonale entière."
variations.append(variation(
    "$SABCD$ est une pyramide régulière : sa base est le carré $ABCD$ de côté ${{a}}~\\unit{cm}$, "
    "de centre $O$, et sa hauteur $SO$ mesure ${{h}}~\\unit{cm}$. Calcule la longueur de l'arête "
    "$[SA]$, arrondie au dixième.\n\n"
    "```solide\nforme: pyramide carree {{a}} {{h}}\nsommets: S A B C D\ncotes: cm\n"
    "points: O centre ABCD\nsegments: [SO], [OA]\nangles-droits: SOA\n```\n\n"
    "$SA \\approx ?~\\unit{cm}$",
    [var('a', '2..12'), var('h', '3..15')],
    [case(arrondi('sqrt(h^2+a^2/2)'), [
        erreur(arrondi('sqrt(h^2+a^2)'), COTE_ENTIER, 'Côté pris pour OA'),
        erreur(arrondi('sqrt(h^2+a^2/4)'), DEMI_COTE, 'Demi-côté pris pour OA'),
        erreur(arrondi('sqrt(h^2+2*a^2)'), DIAG_ENTIERE, 'Diagonale entière prise pour OA'),
    ])],
    ["Dans le carré $ABCD$, le triangle $ABC$ est rectangle en $B$ : "
     "$AC^2 = AB^2 + BC^2 = {{a}}^2 + {{a}}^2 = {{eval:2*a^2}}$. Le centre $O$ est le milieu de "
     "$[AC]$, donc $OA^2 = \\dfrac{AC^2}{4} = \\dfrac{{{eval:2*a^2}}}{4} = {{eval:a^2/2;d}}$.",
     "La hauteur $[SO]$ est perpendiculaire à la base : le triangle $SOA$ est rectangle en $O$, "
     "d'hypoténuse $[SA]$.",
     "Théorème de Pythagore : $SA^2 = SO^2 + OA^2 = {{eval:h^2}} + {{eval:a^2/2;d}} = {{eval:h^2+a^2/2;d}}$.",
     f"Donc $SA = \\sqrt{{{{{{eval:h^2+a^2/2;d}}}}}} \\approx {PRIMAIRE}{{{arrondi('sqrt(h^2+a^2/2)')}~\\unit{{cm}}}}$ "
     "(à la calculatrice, arrondi au dixième)."],
    "Calcule d'abord $OA$ : c'est la moitié de la diagonale du carré. Puis utilise le triangle "
    "$SOA$, rectangle en $O$.",
    ['2*h >= a', 'h <= 3*a'] + sans_borne('sqrt(h^2+a^2/2)'),
))
s = {'a': 6, 'h': 4}
specs += [
    spec('a = 6, h = 4 : √34 ≈ 5,8', V, s, 'correct', [dixieme(math.sqrt(34))]),
    spec('Erreur : côté pris pour OA, √52 ≈ 7,2', V, s, 'incorrect', [dixieme(math.sqrt(52))],
         COTE_ENTIER),
    spec('Erreur : demi-côté pris pour OA, 5', V, s, 'incorrect', [entier_ou_dixieme(math.sqrt(25))],
         DEMI_COTE),
    spec('Erreur : diagonale entière, √88 ≈ 9,4', V, s, 'incorrect', [dixieme(math.sqrt(88))],
         DIAG_ENTIERE),
]

modele = {
    'rangement': {'noeud': 'Géométrie > Théorème de Pythagore > calcul de longueurs',
                  'point': '4-034'},
    'title': 'Calculer une longueur dans un solide avec Pythagore',
    'description': ("Théorème de Pythagore dans un solide, résultat arrondi au dixième : diagonale "
                    "d'une face et diagonale d'un cube ou d'un pavé, cylindre (centre d'une base à "
                    "un point du bord de l'autre), génératrice d'un cône, arête latérale d'une "
                    "pyramide régulière à base carrée"),
    'grades': ['4'],
    'level': 2,
    'delay': 150,
    'status': 'draft',
    'variations': variations,
    'testSpecs': specs,
}


def ecrire(nom, m):
    os.makedirs(DOSSIER, exist_ok=True)
    chemin = os.path.join(DOSSIER, nom + '.json')
    # Garder l'id écrit en tête par create-questions --publier, s'il existe
    if os.path.exists(chemin):
        with open(chemin, encoding='utf-8') as f:
            ancien = json.load(f)
        if 'id' in ancien:
            m = {'id': ancien['id'], **m}
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write('\n')


ecrire('f1-longueur-solide-pythagore', modele)
print(f'{len(variations)} variations, {len(specs)} specs → {DOSSIER}')
