"""Écrit les 5 modèles du lot 13 du CE2 (règle graduée) dans scripts/questions/ce2-13/.

Phase 0 validée par David le 2026-11-19 (§ 20 du journal `docs/archive/wip/questions-ce2-progress.md`,
« je te suis ») : CE2-039 (tracer un segment de longueur donnée) et CE2-070 coté en cm. Outils
livrés par le chantier `regle-graduee` (ADR 0036, 1 unité de la figure = 1 cm), papier uni :

- `segment AB = 6 cm` (aussi `5 cm 3 mm`, `72 mm`) : Règle graduée · Segment ;
- `carre A ; B ; C ; D`, `rectangle A ; B ; C ; D : BC = 3 cm` : Segment · Équerre · Règle graduée ;
- `triangle ABC : CAB = 90 ; AC = 4 cm` : Segment · Équerre · Règle graduée ;
- `cercle c = cercle(O, rayon=4 cm)` : Règle graduée · Compas.

Réponse d'une règle posée : `regle(ox;oy;bx;by;sens)`, son 0 en (ox ; oy), graduée vers (bx ; by).
Niveaux : 8 et 9 sur le nœud des longueurs (après « Mesurer un segment avec la règle », 6) ;
5 sur « constructions » (après les lots 12 et 12b, 3 et 4). Variables à une lettre ; jamais `e`
ni `i` ; aucun point nommé E.

    python3 docs/wip/questions/lot-ce2-13.py scripts/questions/ce2-13
"""
import json
import sys

DOSSIER = sys.argv[1]

# ---- Gabarits (repris du lot 12b) ----


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(x) for k, x in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(title, description, grade, level, variations, specs, delay=240):
    # ni theme, ni domain, ni subdomain (ADR 0035) : le rangement est posé par la migration
    return {'title': title, 'description': description, 'grades': [grade], 'level': level,
            'delay': delay, 'status': 'draft', 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, etapes):
    return {'statement': statement, 'variables': variables, 'correction': {'steps': etapes}}


def selon(k, textes, n=1):
    """`{{if:k==1|…|{{if:k==2|…|…}}}}` : le texte numéro k (à partir de 1)."""
    textes = [str(t) for t in textes]
    if len(textes) == 1:
        return textes[0]
    return ('{{if:' + k + '==' + str(n) + '|' + textes[0] + '|' + selon(k, textes[1:], n + 1)
            + '}}')


def colt(x, k=0):
    """Mot coloré en plein texte : toujours dans une formule (`\\textcolor` hors `$…$` reste brut)."""
    return '$\\textcolor{{{color:primary.' + str(k) + '}}}{\\text{' + x + '}}$'


def add(p, q):
    return (p[0] + q[0], p[1] + q[1])


def mul(v, k):
    return (v[0] * k, v[1] * k)


def fmt(x):
    # arrondi : le bruit des flottants allonge la réponse au-delà de la garde de complexité
    x = round(float(x), 6)
    return str(int(x)) if x.is_integer() else str(x)


def pt(nom, p):
    return f'{nom} = point({fmt(p[0])}, {fmt(p[1])})'


def seg(p, q):
    return f'segment({fmt(p[0])};{fmt(p[1])};{fmt(q[0])};{fmt(q[1])})'


def droite(p, q):
    return f'droite({fmt(p[0])};{fmt(p[1])};{fmt(q[0])};{fmt(q[1])})'


def cercle(c, p):
    return f'cercle({fmt(c[0])};{fmt(c[1])};{fmt(p[0])};{fmt(p[1])})'


def regle(o, vers):
    """La règle posée : son 0 en o, graduée vers le point `vers`."""
    return f'regle({fmt(o[0])};{fmt(o[1])};{fmt(vers[0])};{fmt(vers[1])};1)'


def dedans(pts, w, h):
    return all(0 <= x <= w and 0 <= y <= h for x, y in pts)


def normale(v):
    return (-v[1], v[0])


def perpendiculaire(a, b, en):
    # ce que rend l'équerre posée le long de [AB] au point `en` (`perpendicularThrough`)
    return droite(en, add(en, normale((b[0] - a[0], b[1] - a[1]))))


# ---- 01 et 02. Tracer un segment de longueur donnée (CE2-039) ----

WS, HS = 14, 10  # règle de 14 cm (le plus grand côté de la fenêtre)
DEPARTS = [(1, 5), (1, 2), (1, 8)]  # A ; vers la droite, 13 cm tiennent toujours
DIAGONALE = (0.6, 0.8)  # une direction oblique (3 ; 4) / 5

for a in DEPARTS:
    assert dedans([add(a, (12, 0))], WS, HS)


def bloc_segment(verif):
    return (f'```figure-a-completer\nfenetre: 0 ; {WS} ; 0 ; {HS}\nverifier: segment AB = '
            + verif + '\n---\n' + selon('k', [pt('A', a) for a in DEPARTS]) + '\n```')


def etapes_segment(longueur):
    return ['On pose la règle graduée : son ' + colt('0') + ' sur le point $A$.',
            'On trace le segment depuis $A$ jusqu\'à la graduation ' + longueur
            + ' : le segment $[AB]$ mesure ' + longueur + '.']


SEGMENT_CM = variation(
    'Avec la règle graduée, trace le segment $[AB]$ de $\\textcolor{{{color:primary.0}}}{{{l}}\\text{ cm}}$'
    ' en partant du point $A$.\n\n' + bloc_segment('{{l}} cm'),
    [var('k', '1..' + str(len(DEPARTS))), var('l', '3..12')],
    etapes_segment('$\\textcolor{{{color:primary.0}}}{{{l}}\\text{ cm}}$'))

SEGMENT_CM_MM = variation(
    'Avec la règle graduée, trace le segment $[AB]$ de'
    ' $\\textcolor{{{color:primary.0}}}{{{a}}\\text{ cm et }{{b}}\\text{ mm}}$ en partant du point $A$.'
    '\n\n' + bloc_segment('{{a}} cm {{b}} mm'),
    [var('k', '1..' + str(len(DEPARTS))), var('a', '2..11'), var('b', '1..9')],
    ['On pose la règle graduée : son ' + colt('0') + ' sur le point $A$.',
     'On compte $\\textcolor{{{color:primary.0}}}{{{a}}\\text{ cm}}$, puis encore'
     ' $\\textcolor{{{color:primary.0}}}{{{b}}\\text{ petits traits}}$ (les millimètres), et on'
     ' trace le segment depuis $A$ jusque-là.'])

SEGMENT_MM = variation(
    'Avec la règle graduée, trace le segment $[AB]$ de $\\textcolor{{{color:primary.0}}}{{{m}}\\text{ mm}}$'
    ' en partant du point $A$.\n\n' + bloc_segment('{{m}} mm'),
    [var('k', '1..' + str(len(DEPARTS))), var('a', '2..11'), var('b', '1..9'),
     var('m', '{{eval:10*a+b}}')],
    ['$10\\text{ mm} = 1\\text{ cm}$ : $\\textcolor{{{color:primary.0}}}{{{m}}\\text{ mm}}$, c\'est'
     ' {{a}} cm et {{b}} mm.',
     'On pose la règle graduée, son ' + colt('0') + ' sur le point $A$, on compte {{a}} cm puis'
     ' {{b}} petits traits, et on trace le segment depuis $A$ jusque-là.'])


def specs_segment(vi, variables, mm, k=1):
    """Specs d'un segment de `mm` millimètres depuis le départ numéro k."""
    a = DEPARTS[k - 1]
    lg = mm / 10
    b = add(a, (lg, 0))
    droite_ = add(a, (1, 0))
    out = [spec(f'{mm} mm vers la droite', vi, variables, regle(a, droite_) + '|' + seg(a, b),
                'correct')]
    # une autre direction : oblique, la règle posée dans cette direction
    if dedans([add(a, mul(DIAGONALE, lg))], WS, HS):
        out.append(spec(f'{mm} mm en oblique', vi, variables,
                        regle(a, add(a, DIAGONALE)) + '|' + seg(a, add(a, mul(DIAGONALE, lg))),
                        'correct'))
    out.append(spec('Erreur : 1 mm de trop', vi, variables,
                    regle(a, droite_) + '|' + seg(a, add(a, (lg + 0.1, 0))), 'incorrect'))
    out.append(spec('Erreur : 1 cm de moins', vi, variables,
                    regle(a, droite_) + '|' + seg(a, add(a, (lg - 1, 0))), 'incorrect'))
    out.append(spec('Erreur : tracé à l\'œil, sans la règle graduée', vi, variables, seg(a, b),
                    'incorrect'))
    out.append(spec('Erreur : deux segments depuis A', vi, variables,
                    regle(a, droite_) + '|' + seg(a, b) + '|' + seg(a, add(a, (0, 2))),
                    'incorrect'))
    out.append(spec('Rien de tracé', vi, variables, '', 'empty'))
    return out


SPECS_01 = (specs_segment(0, {'k': 1, 'l': 6}, 60, 1) + specs_segment(0, {'k': 2, 'l': 12}, 120, 2)
            + specs_segment(0, {'k': 3, 'l': 3}, 30, 3)[:1])
SPECS_02 = (specs_segment(0, {'k': 1, 'a': 5, 'b': 3}, 53, 1)
            + specs_segment(0, {'k': 3, 'a': 11, 'b': 9}, 119, 3)[:1]
            + specs_segment(1, {'k': 2, 'a': 7, 'b': 2, 'm': 72}, 72, 2)
            + specs_segment(1, {'k': 1, 'a': 2, 'b': 1, 'm': 21}, 21, 1)[:1])

# ---- 03. Carré ou rectangle coté (CE2-070) ----

WP, HP = 12, 10
A_P = (2, 1)


def bloc_polygone(verif, ab):
    return (f'```figure-a-completer\nfenetre: 0 ; {WP} ; 0 ; {HP}\nverifier: ' + verif + '\n---\n'
            + pt('A', A_P) + '\nB = point({{eval:' + str(A_P[0]) + '+' + ab + '}}, ' + str(A_P[1])
            + ')\nab = segment(A, B, epaisseur=3)\n```')


CARRE = variation(
    'Le côté $[AB]$ est déjà tracé. Avec l\'équerre et la règle graduée, construis le '
    + colt('carré') + ' $ABCD$.\n\n' + bloc_polygone('carre A ; B ; C ; D', 'c'),
    [var('c', '4..8')],
    ['Avec l\'équerre, on trace en $B$ la droite qui ' + colt('coupe') + ' $[AB]$ à angle droit ;'
     ' on fait de même en $A$.',
     'Les quatre côtés d\'un carré ont la même longueur : avec la règle graduée, son 0 en $B$, on'
     ' place $C$ à {{c}} cm de $B$ ; son 0 en $A$, on place $D$ à {{c}} cm de $A$.',
     'On trace $[BC]$, $[AD]$ et $[CD]$.'])

RECTANGLE = variation(
    'Le côté $[AB]$ est déjà tracé. Avec l\'équerre et la règle graduée, construis le '
    + colt('rectangle') + ' $ABCD$ dont le côté $[BC]$ mesure'
    ' $\\textcolor{{{color:primary.0}}}{{{b}}\\text{ cm}}$.\n\n'
    + bloc_polygone('rectangle A ; B ; C ; D : BC = {{b}} cm', 'a'),
    [var('a', '6..9'), var('b', '2..5')],
    ['Avec l\'équerre, on trace en $B$ la droite qui ' + colt('coupe') + ' $[AB]$ à angle droit ;'
     ' on fait de même en $A$.',
     'Avec la règle graduée, son 0 en $B$, on place $C$ à {{b}} cm de $B$ ; son 0 en $A$, on'
     ' place $D$ à {{b}} cm de $A$ (les côtés opposés d\'un rectangle ont la même longueur).',
     'On trace $[BC]$, $[AD]$ et $[CD]$.'])

for c in range(4, 9):
    assert dedans([add(A_P, (c, c))], WP, HP), c
for a in range(6, 10):
    for b in range(2, 6):
        assert a != b and dedans([add(A_P, (a, b))], WP, HP), (a, b)


def polygone(ab, bc, c_vu=None):
    """La construction juste : équerre, règle et côté en B, puis en A, puis [CD]."""
    a = A_P
    b = add(a, (ab, 0))
    c = add(b, (0, bc))
    d = add(a, (0, bc))
    if c_vu is not None:
        c = add(b, (0, c_vu))
    haut = (0, 1)
    return [perpendiculaire(a, b, b), regle(b, add(b, haut)), seg(b, c),
            perpendiculaire(a, b, a), regle(a, add(a, haut)), seg(a, d), seg(c, d)]


def specs_polygone(vi, variables, ab, bc):
    juste = polygone(ab, bc)
    a, b = A_P, add(A_P, (ab, 0))
    c, d = add(b, (0, bc)), add(a, (0, bc))
    sans_equerre = [o for o in juste if not o.startswith('droite')]
    sans_regle = [o for o in juste if not o.startswith('regle')]
    return [
        spec('Construction juste', vi, variables, '|'.join(juste), 'correct'),
        spec('Erreur : sans équerre, côtés tracés à l\'œil', vi, variables, '|'.join(sans_equerre),
             'incorrect'),
        spec('Erreur : sans règle graduée, sommets placés à l\'œil', vi, variables,
             '|'.join(sans_regle), 'incorrect'),
        spec('Erreur : [BC] et [AD] trop longs d\'1 cm', vi, variables,
             '|'.join(polygone(ab, bc + 1)[:3] + [perpendiculaire(a, b, a), regle(a, add(a, (0, 1))),
                                                  seg(a, add(d, (0, 1))),
                                                  seg(add(c, (0, 1)), add(d, (0, 1)))]),
             'incorrect'),
        spec('Erreur : le côté [CD] manque', vi, variables, '|'.join(juste[:-1]), 'incorrect'),
        spec('Rien de tracé', vi, variables, '', 'empty'),
    ]


SPECS_03 = (specs_polygone(0, {'c': 6}, 6, 6) + specs_polygone(0, {'c': 8}, 8, 8)[:1]
            + specs_polygone(1, {'a': 7, 'b': 3}, 7, 3) + specs_polygone(1, {'a': 9, 'b': 5}, 9, 5)[:1])

# ---- 04. Triangle rectangle coté (CE2-070) ----

WT, HT = 13, 9  # règle de 13 cm
A_T = (2, 2)

for ab in range(6, 11):
    for c in range(3, 7):
        assert dedans([add(A_T, (ab, 0)), add(A_T, (0, c))], WT, HT)

TRIANGLE = variation(
    'Le côté $[AB]$ est déjà tracé. Avec l\'équerre et la règle graduée, construis le triangle'
    ' $ABC$ qui a un ' + colt('angle droit') + ' en $A$ et dont le côté $[AC]$ mesure'
    ' $\\textcolor{{{color:primary.0}}}{{{c}}\\text{ cm}}$.\n\n'
    f'```figure-a-completer\nfenetre: 0 ; {WT} ; 0 ; {HT}\n'
    'verifier: triangle ABC : CAB = 90 ; AC = {{c}} cm\n---\n' + pt('A', A_T)
    + f'\nB = point({{{{eval:{A_T[0]}+d}}}}, {A_T[1]})\nab = segment(A, B, epaisseur=3)\n```',
    [var('d', '6..10'), var('c', '3..6')],
    ['On pose l\'équerre le long de $[AB]$, l\'angle droit en $A$, et on trace la droite qui '
     + colt('coupe') + ' $[AB]$ à angle droit.',
     'On pose la règle graduée sur cette droite, son 0 en $A$, et on place $C$ à'
     ' $\\textcolor{{{color:primary.0}}}{{{c}}\\text{ cm}}$ de $A$.',
     'On trace $[AC]$ et $[BC]$.'])


def specs_triangle(variables, ab, ac):
    a = A_T
    b = add(a, (ab, 0))
    c = add(a, (0, ac))
    equerre = perpendiculaire(a, b, a)
    r = regle(a, add(a, (0, 1)))
    juste = [equerre, r, seg(a, c), seg(b, c)]
    loin = add(c, (0, 0.2))
    return [
        spec(f'Triangle juste ({ab} cm, {ac} cm)', 0, variables, '|'.join(juste), 'correct'),
        spec('Erreur : sans équerre, [AC] tracé à l\'œil', 0, variables,
             '|'.join([r, seg(a, c), seg(b, c)]), 'incorrect'),
        spec('Erreur : sans règle graduée, C placé à l\'œil', 0, variables,
             '|'.join([equerre, seg(a, c), seg(b, c)]), 'incorrect'),
        spec('Erreur : [AC] trop long de 2 mm', 0, variables,
             '|'.join([equerre, r, seg(a, loin), seg(b, loin)]), 'incorrect'),
        spec('Erreur : le côté [BC] manque', 0, variables, '|'.join(juste[:3]), 'incorrect'),
        spec('Rien de tracé', 0, variables, '', 'empty'),
    ]


SPECS_04 = specs_triangle({'d': 10, 'c': 4}, 10, 4) + specs_triangle({'d': 6, 'c': 6}, 6, 6)[:1]

# ---- 05. Cercle de rayon donné en cm (CE2-070) ----

WC, HC = 14, 14
O_C = (7, 7)

for r in range(2, 7):
    assert O_C[0] - r >= 0 and O_C[0] + r <= WC and O_C[1] - r >= 0 and O_C[1] + r <= HC

CERCLE = variation(
    'Avec la règle graduée et le compas, trace le cercle de ' + colt('centre') + ' $O$ et de '
    + colt('rayon', 1) + ' $\\textcolor{{{color:primary.1}}}{{{r}}\\text{ cm}}$.\n\n'
    f'```figure-a-completer\nfenetre: 0 ; {WC} ; 0 ; {HC}\n'
    'verifier: cercle c = cercle(O, rayon={{r}} cm)\n---\n' + pt('O', O_C) + '\n```',
    [var('r', '2..6')],
    ['On pose la règle graduée, son 0 sur le ' + colt('centre') + ' $O$.',
     'On pique le compas en $O$ et on l\'ouvre jusqu\'à la graduation'
     ' $\\textcolor{{{color:primary.1}}}{{{r}}\\text{ cm}}$ : c\'est le ' + colt('rayon', 1) + '.',
     'On trace le cercle sans changer l\'écartement.'])


def specs_cercle(variables, rr):
    o = O_C
    r = regle(o, add(o, (1, 0)))
    juste = [r, cercle(o, add(o, (rr, 0)))]
    return [
        spec(f'Cercle juste ({rr} cm)', 0, variables, '|'.join(juste), 'correct'),
        spec(f'Cercle juste, règle posée vers le haut', 0, variables,
             '|'.join([regle(o, add(o, (0, 1))), cercle(o, add(o, (0, rr)))]), 'correct'),
        spec('Erreur : compas ouvert à l\'œil, sans la règle', 0, variables,
             cercle(o, add(o, (rr, 0))), 'incorrect'),
        spec('Erreur : rayon trop long de 2 mm', 0, variables,
             '|'.join([r, cercle(o, add(o, (rr + 0.2, 0)))]), 'incorrect'),
        spec('Erreur : compas piqué ailleurs qu\'en O', 0, variables,
             '|'.join([regle(add(o, (1, 0)), add(o, (2, 0))), cercle(add(o, (1, 0)),
                                                                     add(o, (1 + rr, 0)))]),
             'incorrect'),
        spec('Erreur : deux cercles de centre O', 0, variables,
             '|'.join(juste + [cercle(o, add(o, (rr - 1, 0)))]), 'incorrect'),
        spec('Rien de tracé', 0, variables, '', 'empty'),
    ]


SPECS_05 = specs_cercle({'r': 4}, 4) + specs_cercle({'r': 6}, 6)[:1] + specs_cercle({'r': 2}, 2)[:1]

# ---- Fichiers ----

MODELES = {
    '01-trace-un-segment-cm': modele(
        'Tracer un segment de longueur donnée en cm',
        'Papier uni : poser la règle graduée en A et tracer le segment [AB] de 3 à 12 cm', 'CE2', 8,
        [SEGMENT_CM], SPECS_01),
    '02-trace-un-segment-mm': modele(
        'Tracer un segment de longueur donnée en cm et mm',
        'Papier uni : tracer à la règle graduée un segment donné en cm et mm (5 cm et 3 mm) ou en mm'
        ' (72 mm)', 'CE2', 9, [SEGMENT_CM_MM, SEGMENT_MM], SPECS_02),
    '03-carre-rectangle-cotes': modele(
        'Construire un carré ou un rectangle de dimensions données',
        'Papier uni, [AB] tracé : angles droits à l\'équerre, longueurs à la règle graduée (carré'
        ' de 4 à 8 cm ; rectangle, BC de 2 à 5 cm)', 'CE2', 5, [CARRE, RECTANGLE], SPECS_03),
    '04-triangle-rectangle-cote': modele(
        'Construire un triangle rectangle de dimensions données',
        'Papier uni, [AB] tracé : angle droit en A à l\'équerre, AC de 3 à 6 cm à la règle'
        ' graduée', 'CE2', 5, [TRIANGLE], SPECS_04),
    '05-cercle-de-rayon-en-cm': modele(
        'Tracer un cercle de rayon donné en cm',
        'Papier uni : règle graduée posée en O, compas ouvert sur le rayon (2 à 6 cm)', 'CE2', 5,
        [CERCLE], SPECS_05),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
