"""Écrit le modèle du lot 11 de la 4e (4-038, rectangle sans équerre) dans scripts/questions/4-lot-11/.

Phase 0 validée par David le 2026-11-17 (journal `docs/archive/wip/rectangle-sans-equerre-progress.md` § 6) :

| # | Point | Titre                                | Catégorie, niveau                          |
| 1 | 4-038 | Construire un rectangle sans équerre | Géométrie › Figures planes › triangles, 3  |

Outil : `verifier: rectangle A ; B ; C ; D : AB = 4 cm ; AC = 6 cm` (#2781), même journal § 3.
Décisions de David : AB de 3 à 6 cm, AC de AB + 1 à 9 cm, au mm (§ 2) ; [AC] horizontale (Q6) ;
niveau 3 (Q7) ; noms des sommets variés.

Écart d'écriture (à dire à David) : AC est un nombre PAIR de mm, pour que le milieu O de [AC] tombe
sur une graduation de la règle (3,15 cm ne se mesure pas) et que la méthode de la correction
(M1 : O à la règle et au compas) marche à chaque tirage.

Figure : fenêtre 12 × 9 (règle de 12 cm), [AC] horizontale, centrée, à y = 4,5 : B et D sont au
plus à AC/2 ≤ 4,5 cm de (AC), le rectangle tient des deux côtés.

Les `testSpecs` rejouent les gestes de l'élève (règle posée, compas ouvert sur une graduation,
croisements de traits) avec les coordonnées que l'aimantation donnerait.

    python3 docs/wip/questions/lot-4-11.py scripts/questions/4-lot-11
"""
import json
import math
import os
import subprocess
import sys

DOSSIER = sys.argv[1]

NOMS = ['ABCD', 'EFGH', 'MNPQ', 'RSTU']


def selon(nom, valeurs):
    """Texte choisi par la variable nom ({{if}} mis bout à bout, jamais imbriqués)."""
    return ''.join('{{if:' + nom + '==' + str(j) + '|' + str(v) + '|}}' for j, v in enumerate(valeurs))


def sommet(i):
    return selon('s', [n[i] for n in NOMS])


A, B, C, D = (sommet(i) for i in range(4))
O = 'O'  # le milieu des diagonales ; aucun jeu de noms ne contient O
ABCD = A + B + C + D


def col(x, k=0):
    """Mot en couleur (toujours dans $…$, en texte)."""
    return '$\\textcolor{{{color:primary.' + str(k) + '}}}{\\text{' + x + '}}$'


AB_CM = '{{eval:ab/10;d}}'
AC_CM = '{{eval:ac/10;d}}'
DEMI_AC_CM = '{{eval:ac/20;d}}'
XA = '{{eval:(120-ac)/20;d}}'
XC = '{{eval:(120+ac)/20;d}}'

FIGURE = '\n'.join([
    '```figure-a-completer',
    'fenetre: 0 ; 12 ; 0 ; 9',
    f'verifier: rectangle {A} ; {B} ; {C} ; {D} : {A}{B} = {AB_CM} cm ; {A}{C} = {AC_CM} cm',
    '---',
    f'{A} = point({XA}, 4.5, etiquette="gauche")',
    f'{C} = point({XC}, 4.5, etiquette="droite")',
    f'd = segment({A}, {C})',
    '```',
])

STATEMENT = (
    f'Construis le rectangle ${ABCD}$ tel que ${A}{B} = {AB_CM}$ cm et ${A}{C} = {AC_CM}$ cm, '
    f'sans équerre. La diagonale $[{A}{C}]$ est tracée.\n\n' + FIGURE
)

STEPS = [
    f'Les diagonales d\'un rectangle ont le {col("même milieu")} et la {col("même longueur", 1)}. '
    f'On place $' + O + f'$, milieu de $[{A}{C}]$ : règle posée en ${A}$, '
    f'${A}' + O + f' = {DEMI_AC_CM}$ cm.',
    f'Le triangle ${A}{B}{C}$ est rectangle en ${B}$ : ${B}$ est sur le {col("cercle de diamètre")} '
    f'$[{A}{C}]$ (centre $' + O + f'$, passant par ${A}$). Il est aussi à ${AB_CM}$ cm de ${A}$ : '
    f'compas ouvert à ${AB_CM}$ cm, piqué en ${A}$. ${B}$ est au croisement des deux cercles.',
    f'${D}$ est sur la droite $({B}' + O + f')$, de l\'autre côté de $' + O + f'$, avec '
    f'${B}{D} = {A}{C} = {AC_CM}$ cm (règle posée en ${B}$, dirigée vers $' + O + f'$). '
    f'On trace les côtés $[{A}{B}]$, $[{B}{C}]$, $[{C}{D}]$ et $[{D}{A}]$.',
]


# ---- Gestes de l'élève (comme l'aimantation les donne) ------------------------------------------

def num(x):
    x = 0.0 if abs(x) < 1e-12 else x
    return repr(round(x, 12)) if x != int(x) else str(int(x))


def regle(o, b):
    return f'regle({num(o[0])};{num(o[1])};{num(b[0])};{num(b[1])};1)'


def cercle(c, p):
    return f'cercle({num(c[0])};{num(c[1])};{num(p[0])};{num(p[1])})'


def segment(p, q):
    return f'segment({num(p[0])};{num(p[1])};{num(q[0])};{num(q[1])})'


def grad(o, vers, mm):
    """Graduation `mm` d'une règle posée le 0 en o, dirigée vers `vers`."""
    dx, dy = vers[0] - o[0], vers[1] - o[1]
    n = math.hypot(dx, dy)
    return (o[0] + mm / 10 * dx / n, o[1] + mm / 10 * dy / n)


def croisement(c1, r1, c2, r2, dessus):
    """Croisement de deux cercles (au-dessus ou au-dessous de la droite des centres, ici (AC))."""
    dx, dy = c2[0] - c1[0], c2[1] - c1[1]
    d = math.hypot(dx, dy)
    a = (r1 * r1 - r2 * r2 + d * d) / (2 * d)
    h = math.sqrt(max(r1 * r1 - a * a, 0))
    mx, my = c1[0] + a * dx / d, c1[1] + a * dy / d
    p1 = (mx - h * dy / d, my + h * dx / d)
    p2 = (mx + h * dy / d, my - h * dx / d)
    haut, bas = (p1, p2) if p1[1] > p2[1] else (p2, p1)
    return haut if dessus else bas


def figure_de(ac):
    return ((120 - ac) / 20, 4.5), ((120 + ac) / 20, 4.5)


def m1(ab, ac, dessus=True, ab_trace=None, d_mm=None):
    """Méthode M1 : O à la règle et au compas, cercle de diamètre [AC], compas en A, règle de B vers O."""
    a, c = figure_de(ac)
    ab_trace = ab if ab_trace is None else ab_trace
    ra = regle(a, c)
    o = grad(a, c, ac // 2)
    b = croisement(a, ab_trace / 10, o, ac / 20, dessus)
    d = grad(b, o, ac if d_mm is None else d_mm)
    return [ra, cercle(a, o), cercle(o, a), cercle(a, grad(a, c, ab_trace)),
            segment(a, b), segment(b, c), regle(b, o), segment(b, d),
            segment(c, d), segment(d, a)]


def m3(ab, ac, dessus=True):
    """M3 : D au croisement du cercle de diamètre [AC] et du compas ouvert à AB, piqué en C."""
    a, c = figure_de(ac)
    o = grad(a, c, ac // 2)
    b = croisement(a, ab / 10, o, ac / 20, dessus)
    d = croisement(c, ab / 10, o, ac / 20, not dessus)
    return [regle(a, c), cercle(a, o), cercle(o, a), cercle(a, grad(a, c, ab)),
            regle(c, a), cercle(c, grad(c, a, ab)),
            segment(a, b), segment(b, c), segment(c, d), segment(d, a)]


def a_l_oeil(ab, ac):
    """B et D posés à l'œil (arrondis au mm près du bon endroit), aucun instrument."""
    a, c = figure_de(ac)
    o = ((a[0] + c[0]) / 2, 4.5)
    b = croisement(a, ab / 10, o, ac / 20, True)
    b = (round(b[0], 1), round(b[1], 1))
    d = (2 * o[0] - b[0], 2 * o[1] - b[1])
    return [segment(a, b), segment(b, c), segment(c, d), segment(d, a)]


def angle_pas_droit(ab, ac):
    """B à AB de A, mais pris au compas en C ouvert 5 mm trop loin : B hors du cercle de diamètre [AC]."""
    a, c = figure_de(ac)
    o = grad(a, c, ac // 2)
    cb = round(math.sqrt(ac * ac - ab * ab)) + 5
    b = croisement(a, ab / 10, c, cb / 10, True)
    d = grad(b, o, ac)
    return [regle(a, c), cercle(a, o), cercle(a, grad(a, c, ab)),
            regle(c, a), cercle(c, grad(c, a, cb)),
            segment(a, b), segment(b, c), regle(b, o), segment(b, d),
            segment(c, d), segment(d, a)]


def spec(desc, s, ab, ac, objets, status):
    return {'description': desc, 'variationIndex': 0,
            'variables': {'s': str(s), 'ab': str(ab), 'h': str(ac // 2), 'ac': str(ac)},
            'answers': ['|'.join(objets)], 'expected': {'status': status}}


SPECS = [
    spec('M1 : ABCD, AB = 4 cm, AC = 6 cm, B au-dessus', 0, 40, 60, m1(40, 60), 'correct'),
    spec('M1 : B au-dessous de (AC)', 0, 40, 60, m1(40, 60, dessus=False), 'correct'),
    spec('M1 : EFGH, EF = 3,5 cm, EG = 7,2 cm', 1, 35, 72, m1(35, 72), 'correct'),
    spec('M1 : MNPQ, MN = 6 cm, MP = 7 cm', 2, 60, 70, m1(60, 70, dessus=False), 'correct'),
    spec('M1 : RSTU, RS = 3 cm, RT = 9 cm (les plus longues)', 3, 30, 90, m1(30, 90), 'correct'),
    spec('M3 : D au compas piqué en C', 1, 35, 72, m3(35, 72), 'correct'),
    spec('Erreur : B et D posés à l\'œil', 0, 40, 60, a_l_oeil(40, 60), 'incorrect'),
    spec('Erreur : compas ouvert à 4,5 cm au lieu de 4 cm', 0, 40, 60, m1(40, 60, ab_trace=45),
         'incorrect'),
    spec('Erreur : angle en B pas droit (B hors du cercle de diamètre [AC])', 0, 40, 60,
         angle_pas_droit(40, 60), 'incorrect'),
    spec('Erreur : [BD] arrêté à 6,5 cm (diagonales de longueurs différentes)', 0, 40, 60,
         m1(40, 60, d_mm=65), 'incorrect'),
]

MODELE = {
    'title': 'Construire un rectangle sans équerre',
    'description': 'La diagonale est tracée : construire le rectangle au compas et à la règle graduée, '
                   'par le cercle de diamètre la diagonale et les diagonales de même milieu et de même '
                   'longueur',
    'grades': ['4'],
    'level': 3,
    'delay': 240,
    'status': 'draft',
    'variations': [{
        'statement': STATEMENT,
        'variables': [
            {'name': 's', 'expression': '0..3'},
            {'name': 'ab', 'expression': '30..60'},
            {'name': 'h', 'expression': '20..45'},
            {'name': 'ac', 'expression': 'eval:2*h'},
        ],
        'conditions': ['ac>=ab+10'],
        'correction': {'steps': STEPS},
    }],
    'testSpecs': SPECS,
}

os.makedirs(DOSSIER, exist_ok=True)
with open(os.path.join(DOSSIER, '01-rectangle-sans-equerre.json'), 'w', encoding='utf-8') as f:
    json.dump(MODELE, f, ensure_ascii=False, indent='\t')
    f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL)
print(f'1 modèle écrit dans {DOSSIER}')
