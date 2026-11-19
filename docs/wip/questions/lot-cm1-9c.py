"""Écrit les 4 modèles du lot 9c du CM1 (constructions à la règle graduée) dans
scripts/questions/cm1-9c/.

Phase 0 validée par David le 2026-11-19 (§ 26 et 26 bis du journal
`docs/archive/wip/questions-cm1-progress.md`) : CM1-097 (segment de longueur donnée) et CM1-104
(rectangle, carré, triangle rectangle, cercle de rayon donné) ; jumeaux CM2-087 et CM2-094 :
niveaux CM1 et CM2 pour les quatre modèles.

Outil : la figure à compléter sur papier uni, à la règle graduée (chantier `regle-graduee`,
ADR 0036) ; syntaxe et palettes : `src/lib/block-catalog/figure-a-completer.ts` (exemples). Une unité
de la figure vaut 1 cm ; l'énoncé n'invite jamais à mesurer l'écran.

Réponses d'essai au format de `serializeConstructionAnswer` : `regle(ox;oy;bx;by;sens)` (le 0 en o,
vers b), `segment(...)`, `cercle(cx;cy;x;y)`, l'équerre = `droite(P;P + (-uy, ux))` le long de
[AB] (`perpendicularThrough`).

    python3 docs/wip/questions/lot-cm1-9c.py scripts/questions/cm1-9c
"""
import json
import math
import os
import sys

DOSSIER = sys.argv[1]
MODELES = {}
GRADES = ('CM1', 'CM2')

# ---- Gabarits ----


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(enonce, variables, etapes, conditions=None):
    v = {'statement': enonce, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['correction'] = {'steps': etapes}
    return v


def modele(title, description, niveau, variations, specs, delay=180):
    return {'title': title, 'description': description, 'grades': list(GRADES), 'level': niveau,
            'delay': delay, 'status': 'draft', 'variations': variations, 'testSpecs': specs}


def n(x):
    """Nombre écrit dans une réponse de figure : pleine précision, sans « -0 »."""
    x = x + 0.0
    if abs(x - round(x)) < 1e-12:
        return str(int(round(x)))
    return repr(round(x, 12))


def objets(*liste):
    return '|'.join(liste)


def segment(p, q):
    return 'segment(' + ';'.join(n(v) for v in (p[0], p[1], q[0], q[1])) + ')'


def droite(p, q):
    return 'droite(' + ';'.join(n(v) for v in (p[0], p[1], q[0], q[1])) + ')'


def cercle(c, p):
    return 'cercle(' + ';'.join(n(v) for v in (c[0], c[1], p[0], p[1])) + ')'


def regle(o, vers):
    return 'regle(' + ';'.join(n(v) for v in (o[0], o[1], vers[0], vers[1], 1)) + ')'


def equerre(a, b, p):
    """La perpendiculaire à [ab] en p, tracée à l'équerre (`perpendicularThrough`)."""
    ux, uy = b[0] - a[0], b[1] - a[1]
    return droite(p, (p[0] - uy, p[1] + ux))


def graduation(o, vers, mm):
    d = math.hypot(vers[0] - o[0], vers[1] - o[1])
    return o[0] + (mm / 10) * (vers[0] - o[0]) / d, o[1] + (mm / 10) * (vers[1] - o[1]) / d


def spec(desc, vi, variables, answer, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': [answer], 'expected': {'status': status}}


def a_completer(fenetre, verifier, lignes):
    return ('\n\n```figure-a-completer\nfenetre: ' + fenetre + '\nverifier: ' + verifier + '\n---\n'
            + '\n'.join(lignes) + '\n```')


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def cm(x):
    return x + '\\,\\text{cm}'


DIXIEMES = '{{eval:x/10;d}}'  # longueur en mm écrite en cm (5,3)

# ============================================================================
# 9. CM1-097 (+ CM2-087) : tracer un segment de longueur donnée
# Fenêtre 14 × 8 (règle de 14 cm), A(1 ; 4) : 12 cm vers la droite tiennent.

F9 = '0 ; 14 ; 0 ; 8'
A9 = (1, 4)
CORPS9 = ['A = point(1, 4, etiquette="gauche")']
CONSIGNE_REGLE = (' Pose le $0$ de la règle graduée sur $A$, puis trace le segment jusqu\'à la bonne'
                  ' graduation.')

V9 = [
    variation(
        'Trace un segment $[AB]$ de $' + cm('{{l}}') + '$ qui part du point $A$.' + CONSIGNE_REGLE
        + a_completer(F9, 'segment AB = {{l}} cm', CORPS9),
        [var('l', '3..12')],
        ['La règle graduée posée avec son $0$ sur $A$ ; on trace depuis $A$ jusqu\'à la graduation $'
         + cm('{{l}}') + '$ : c\'est le point $' + col('B') + '$.']),
    variation(
        'Trace un segment $[AB]$ de $' + cm(DIXIEMES) + '$ qui part du point $A$.' + CONSIGNE_REGLE
        + a_completer(F9, 'segment AB = ' + DIXIEMES + ' cm', CORPS9),
        [var('c', '3..9'), var('m', '1..9'), var('x', 'eval:10*c+m')],
        ['$' + cm(DIXIEMES) + ' = ' + cm('{{c}}') + '\\,{{m}}\\,\\text{mm}$ : sur la règle, $' +
         '{{m}}$ petites graduations après le $' + cm('{{c}}') + '$.',
         'La règle posée avec son $0$ sur $A$ ; on trace depuis $A$ jusqu\'à cette graduation : c\'est'
         ' le point $' + col('B') + '$.']),
    variation(
        'Sur la demi-droite $[Ax)$, trace un segment $[AB]$ de $' + cm('{{l}}') + '$.'
        ' Pose le $0$ de la règle graduée sur $A$, le long de la demi-droite.'
        + a_completer('0 ; 14 ; 0 ; 8', 'segment AB = {{l}} cm sur [Ax)',
                      ['A = point(1, 2, etiquette="bas")', 'X = point(13, {{y}}, visible=faux)',
                       'x = demidroite(A, X)', 'texte(13, {{eval:y+0.45;d}}, "x")']),
        [var('y', '2..7'), var('l', '3..10')],
        ['La règle posée avec son $0$ sur $A$, le long de $[Ax)$ ; on trace jusqu\'à la graduation $'
         + cm('{{l}}') + '$ : c\'est le point $' + col('B') + '$, sur la demi-droite.']),
]


def seg9(l_mm, vers=(2, 4), avec_regle=True):
    b = graduation(A9, vers, l_mm)
    return objets(*([regle(A9, vers)] if avec_regle else []), segment(A9, b))


A9C = (1, 2)


def seg9c(y, l_mm, vers=None):
    vers = vers or (13, y)
    return objets(regle(A9C, vers), segment(A9C, graduation(A9C, vers, l_mm)))


S9 = [
    spec('7 cm vers la droite', 0, {'l': 7}, seg9(70), 'correct'),
    spec('3 cm en oblique', 0, {'l': 3}, seg9(30, vers=(4, 8)), 'correct'),
    spec('12 cm vers la droite', 0, {'l': 12}, seg9(120), 'correct'),
    spec('Erreur : 7,2 cm au lieu de 7 cm', 0, {'l': 7}, seg9(72), 'incorrect'),
    spec('Erreur : tracé sans la règle', 0, {'l': 7}, seg9(70, avec_regle=False), 'incorrect'),
    spec('5,3 cm', 1, {'c': 5, 'm': 3, 'x': 53}, seg9(53), 'correct'),
    spec('9,9 cm vers la droite', 1, {'c': 9, 'm': 9, 'x': 99}, seg9(99), 'correct'),
    spec('3,4 cm vers le bas', 1, {'c': 3, 'm': 4, 'x': 34}, seg9(34, vers=(1, 0)), 'correct'),
    spec('Erreur : 5 cm au lieu de 5,3 cm (millimètres oubliés)', 1, {'c': 5, 'm': 3, 'x': 53},
         seg9(50), 'incorrect'),
    spec('Erreur : 3,5 cm au lieu de 5,3 cm', 1, {'c': 5, 'm': 3, 'x': 53}, seg9(35), 'incorrect'),
    spec('Demi-droite horizontale, 6 cm', 2, {'y': 2, 'l': 6}, seg9c(2, 60), 'correct'),
    spec('Demi-droite oblique, 5 cm', 2, {'y': 6, 'l': 5}, seg9c(6, 50), 'correct'),
    spec('Demi-droite oblique, 10 cm', 2, {'y': 7, 'l': 10}, seg9c(7, 100), 'correct'),
    spec('Erreur : 5 cm, mais pas sur la demi-droite', 2, {'y': 6, 'l': 5},
         seg9c(6, 50, vers=(13, 2)), 'incorrect'),
    spec('Erreur : 4,5 cm au lieu de 5 cm sur la demi-droite', 2, {'y': 6, 'l': 5}, seg9c(6, 45),
         'incorrect'),
]

MODELES['09-tracer-un-segment-de-longueur-donnee'] = modele(
    'Tracer un segment de longueur donnée',
    'Tracer à la règle graduée un segment de longueur donnée, en cm ou en cm et mm, depuis un point'
    ' ou sur une demi-droite',
    1, V9, S9, delay=120)

# ============================================================================
# 10. CM1-104 (+ CM2-094) : construire un rectangle ou un carré de dimensions données
# Fenêtre 12 × 9 (règle de 12 cm), A(2 ; 1), [AB] horizontal : la figure au-dessus tient.

F10 = '0 ; 12 ; 0 ; 9'
A10 = (2, 1)


def corps10(longueur):
    return ['A = point(2, 1, etiquette="bas")', 'B = point(' + longueur + ', 1, etiquette="bas")',
            's = segment(A, B)']


V10 = [
    variation(
        'Le côté $[AB]$, de $' + cm('{{l}}') + '$, est tracé. Construis le rectangle $ABCD$ tel que $BC = '
        + cm('{{h}}') + '$. Trace les angles droits avec l\'équerre et prends les longueurs sur la'
        ' règle graduée.'
        + a_completer(F10, 'rectangle A ; B ; C ; D : BC = {{h}} cm', corps10('{{eval:2+l}}')),
        [var('l', '6..9'), var('h', '2..5')],
        ['**En $B$** : l\'équerre le long de $[AB]$, l\'angle droit en $B$ ; on trace la'
         ' perpendiculaire. La règle posée avec son $0$ sur $B$ : $' + col('C') + '$ est à $'
         + cm('{{h}}') + '$.',
         '**En $A$** : de même, $' + col('D') + '$ sur la perpendiculaire en $A$, à $' + cm('{{h}}')
         + '$. On trace $[BC]$, $[AD]$ et $[CD]$.']),
    variation(
        'Le côté $[AB]$, de $' + cm('{{c}}') + '$, est tracé. Construis le carré $ABCD$. Trace les'
        ' angles droits avec l\'équerre et prends les longueurs sur la règle graduée.'
        + a_completer(F10, 'carre A ; B ; C ; D', corps10('{{eval:2+c}}')),
        [var('c', '4..7')],
        ['Les quatre côtés d\'un carré ont la même longueur, $' + cm('{{c}}') + '$, et ses angles sont'
         ' droits.',
         '**En $B$** : l\'équerre le long de $[AB]$, la perpendiculaire en $B$ ; la règle posée avec son'
         ' $0$ sur $B$ : $' + col('C') + '$ est à $' + cm('{{c}}') + '$. De même $' + col('D')
         + '$ en $A$. On trace $[BC]$, $[AD]$ et $[CD]$.']),
]


def rect(l, h_mm, d_mm=None, avec_equerre=True, sans_cd=False):
    a, b = A10, (2 + l, 1)
    d_mm = h_mm if d_mm is None else d_mm
    c, d = (b[0], 1 + h_mm / 10), (a[0], 1 + d_mm / 10)
    liste = []
    if avec_equerre:
        liste += [equerre(a, b, b), regle(b, (b[0], 2)), segment(b, c),
                  equerre(a, b, a), regle(a, (a[0], 2)), segment(a, d)]
    else:
        liste += [segment(b, (c[0] + 0.15, c[1])), segment(a, (d[0] - 0.1, d[1]))]
        c, d = (c[0] + 0.15, c[1]), (d[0] - 0.1, d[1])
    if not sans_cd:
        liste.append(segment(c, d))
    return objets(*liste)


S10 = [
    spec('Rectangle 7 × 3', 0, {'l': 7, 'h': 3}, rect(7, 30), 'correct'),
    spec('Rectangle 9 × 5', 0, {'l': 9, 'h': 5}, rect(9, 50), 'correct'),
    spec('Erreur : BC = 3,5 cm au lieu de 3 cm', 0, {'l': 7, 'h': 3}, rect(7, 35), 'incorrect'),
    spec('Erreur : BC = 7 cm (longueur de [AB])', 0, {'l': 7, 'h': 3}, rect(7, 70), 'incorrect'),
    spec('Erreur : côtés tracés sans équerre', 0, {'l': 7, 'h': 3}, rect(7, 30, avec_equerre=False),
         'incorrect'),
    spec('Erreur : figure non fermée', 0, {'l': 7, 'h': 3}, rect(7, 30, sans_cd=True), 'incorrect'),
    spec('Carré de 6 cm', 1, {'c': 6}, rect(6, 60), 'correct'),
    spec('Carré de 4 cm', 1, {'c': 4}, rect(4, 40), 'correct'),
    spec('Erreur : côtés de 5 cm sur [AB] de 6 cm (rectangle)', 1, {'c': 6}, rect(6, 50), 'incorrect'),
    spec('Erreur : [AD] plus long que [BC]', 1, {'c': 6}, rect(6, 60, d_mm=64), 'incorrect'),
]

MODELES['10-construire-un-rectangle-ou-un-carre'] = modele(
    'Construire un rectangle ou un carré de dimensions données',
    'Construire sur papier uni, à l\'équerre et à la règle graduée, un rectangle ou un carré dont un'
    ' côté est tracé et les dimensions données en cm',
    2, V10, S10, delay=240)

# ============================================================================
# 11. CM1-104 (+ CM2-094) : construire un triangle rectangle de côtés donnés
# Fenêtre 14 × 9 (règle de 14 cm), A(2 ; 1,5), [AB] horizontal de 5 à 10 cm, AC de 3 à 7 cm.

F11 = '0 ; 14 ; 0 ; 9'
A11 = (2, 1.5)

V11 = [
    variation(
        'Le côté $[AB]$, de $' + cm('{{l}}') + '$, est tracé. Construis le triangle $ABC$ rectangle en'
        ' $A$, tel que $AC = ' + cm('{{h}}') + '$. Trace l\'angle droit avec l\'équerre et prends la'
        ' longueur sur la règle graduée.'
        + a_completer(F11, 'triangle ABC : CAB = 90 ; AC = {{h}} cm',
                      ['A = point(2, 1.5, etiquette="bas")',
                       'B = point({{eval:2+l}}, 1.5, etiquette="bas")', 's = segment(A, B)']),
        [var('l', '5..10'), var('h', '3..7')],
        ['**L\'angle droit en $A$** : l\'équerre le long de $[AB]$, l\'angle droit en $A$ ; on trace'
         ' la perpendiculaire à $[AB]$ en $A$.',
         '**La longueur** : la règle posée avec son $0$ sur $A$, le long de la perpendiculaire ; $'
         + col('C') + '$ est sur la graduation $' + cm('{{h}}') + '$. On trace $[AC]$ et $[BC]$.']),
]


def tri(l, h_mm, avec_equerre=True, en_b=False):
    a, b = A11, (2 + l, 1.5)
    if en_b:
        c = (b[0], 1.5 + h_mm / 10)
        return objets(equerre(a, b, b), regle(b, (b[0], 2.5)), segment(b, c), segment(a, c))
    c = (2, 1.5 + h_mm / 10)
    if not avec_equerre:
        c = (2.25, c[1])
        return objets(segment(a, c), segment(b, c))
    return objets(equerre(a, b, a), regle(a, (2, 2.5)), segment(a, c), segment(b, c))


S11 = [
    spec('AB = 10 cm, AC = 6 cm', 0, {'l': 10, 'h': 6}, tri(10, 60), 'correct'),
    spec('AB = 5 cm, AC = 7 cm', 0, {'l': 5, 'h': 7}, tri(5, 70), 'correct'),
    spec('Erreur : AC = 5,6 cm au lieu de 6 cm', 0, {'l': 10, 'h': 6}, tri(10, 56), 'incorrect'),
    spec('Erreur : C placé à l\'œil, sans équerre', 0, {'l': 10, 'h': 6},
         tri(10, 60, avec_equerre=False), 'incorrect'),
    spec('Erreur : angle droit en B au lieu de A', 0, {'l': 10, 'h': 6}, tri(10, 60, en_b=True),
         'incorrect'),
]

MODELES['11-construire-un-triangle-rectangle'] = modele(
    'Construire un triangle rectangle de côtés donnés',
    'Construire sur papier uni un triangle rectangle dont un côté de l\'angle droit est tracé : l\'angle'
    ' droit à l\'équerre, l\'autre côté à la règle graduée',
    2, V11, S11, delay=180)

# ============================================================================
# 12. CM1-104 (+ CM2-094) : tracer un cercle de rayon donné
# Fenêtre 14 × 14 (règle de 14 cm), O(7 ; 7) : un rayon de 6 cm tient.

F12 = '0 ; 14 ; 0 ; 14'
O12 = (7, 7)
CORPS12 = ['O = point(7, 7)']

V12 = [
    variation(
        'Trace le cercle de centre $O$ et de rayon $' + cm('{{r}}') + '$. Pose le $0$ de la règle'
        ' graduée sur $O$, puis ouvre le compas jusqu\'à la bonne graduation.'
        + a_completer(F12, 'cercle c = cercle(O, rayon={{r}} cm)', CORPS12),
        [var('r', '2..6')],
        ['La règle posée avec son $0$ sur $O$ ; le compas piqué en $O$, ouvert jusqu\'à la graduation $'
         + cm('{{r}}') + '$ : on trace le ' + '$' + col('\\text{cercle}') + '$.']),
    variation(
        'Trace le cercle de centre $O$ et de rayon $' + cm(DIXIEMES) + '$. Pose le $0$ de la règle'
        ' graduée sur $O$, puis ouvre le compas jusqu\'à la bonne graduation.'
        + a_completer(F12, 'cercle c = cercle(O, rayon=' + DIXIEMES + ' cm)', CORPS12),
        [var('c', '2..5'), var('m', '1..9'), var('x', 'eval:10*c+m')],
        ['$' + cm(DIXIEMES) + ' = ' + cm('{{c}}') + '\\,{{m}}\\,\\text{mm}$ : sur la règle, ${{m}}$'
         ' petites graduations après le $' + cm('{{c}}') + '$.',
         'Le compas piqué en $O$, ouvert jusqu\'à cette graduation : on trace le $'
         + col('\\text{cercle}') + '$.']),
]


def cer(r_mm, avec_regle=True, centre=O12):
    vers = (8, 7)
    p = graduation(O12, vers, r_mm)
    p = (p[0] + centre[0] - O12[0], p[1] + centre[1] - O12[1])
    return objets(*([regle(O12, vers)] if avec_regle else []), cercle(centre, p))


S12 = [
    spec('Rayon 4 cm', 0, {'r': 4}, cer(40), 'correct'),
    spec('Rayon 6 cm', 0, {'r': 6}, cer(60), 'correct'),
    spec('Erreur : rayon 4,2 cm au lieu de 4 cm', 0, {'r': 4}, cer(42), 'incorrect'),
    spec('Erreur : compas ouvert sans la règle', 0, {'r': 4}, cer(40, avec_regle=False), 'incorrect'),
    spec('Erreur : compas piqué à côté de O', 0, {'r': 4}, cer(40, centre=(7.5, 7)), 'incorrect'),
    spec('Rayon 3,5 cm', 1, {'c': 3, 'm': 5, 'x': 35}, cer(35), 'correct'),
    spec('Erreur : rayon 3 cm au lieu de 3,5 cm', 1, {'c': 3, 'm': 5, 'x': 35}, cer(30), 'incorrect'),
    spec('Erreur : diamètre de 3,5 cm (rayon 1,75)', 1, {'c': 3, 'm': 5, 'x': 35}, cer(17),
         'incorrect'),
]

MODELES['12-tracer-un-cercle-de-rayon-donne'] = modele(
    'Tracer un cercle de rayon donné',
    'Tracer au compas un cercle de centre donné et de rayon donné en cm (ou en cm et mm), l\'ouverture'
    ' prise sur la règle graduée',
    1, V12, S12, delay=120)

# ============================================================================

os.makedirs(DOSSIER, exist_ok=True)
for nom, mod in MODELES.items():
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(mod, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles,', sum(len(m['variations']) for m in MODELES.values()), 'variations,',
      sum(len(m['testSpecs']) for m in MODELES.values()), 'specs')
