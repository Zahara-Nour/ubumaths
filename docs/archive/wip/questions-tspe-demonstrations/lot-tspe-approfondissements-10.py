"""Écrit les 4 modèles du lot 10 « approfondissements : plans et sphères » de la terminale spé
dans scripts/questions/tspe-approfondissements-10/.

Phase 0 validée par David le 2026-11-13 (D3 du journal
« docs/wip/questions-tspe-demonstrations-progress.md », § 35), un point par modèle :

| # | Point    | Titre                                         | Niv. | Nœud du modèle                                         |
| 1 | TSPE-374 | Intersection de deux plans                    | 4    | Espace › positions relatives et intersections          |
| 2 | TSPE-377 | Intersection d'une sphère et d'une droite     | 5    | Orthogonalité et distances dans l'espace › sphère      |
| 3 | TSPE-564 | Plan tangent à une sphère en un point         | 5    | Orthogonalité et distances dans l'espace › sphère      |
| 4 | TSPE-361 | Sphère circonscrite à un tétraèdre            | 6    | Orthogonalité et distances dans l'espace › sphère      |

Les 4 points sont sur la sous-notion de leur modèle. Niveaux au-dessus de ceux déjà présents en
prod (relevé du 2026-11-14 : 3 au plus sur « positions relatives et intersections », 4 sur
« sphère »).

Forme (D3, Q2) : applications à valeurs tirées, cases et cases choix (4 propositions, la première
est la bonne). `shared.cleanCoefficients` nettoie les équations (« 1x », « +(-3)z », « 0z »).

    python3 docs/archive/wip/questions-tspe-demonstrations/lot-tspe-approfondissements-10.py scripts/questions/tspe-approfondissements-10
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, answer, status, variables=None):
    expected = {'status': status}
    answers = answer if isinstance(answer, list) else [answer]
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in (variables or {}).items()},
            'answers': answers, 'expected': expected}


def modele(nom, title, description, level, variations, specs):
    return nom, {'title': title, 'description': description, 'grades': ['T_SPE'],
                 'level': level, 'delay': 120, 'status': 'draft',
                 'shared': {'cleanCoefficients': True},
                 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def ev(x):
    return '{{eval:' + x + '}}'


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def choix(lignes):
    return '\n\n```choix\n' + ''.join('- ' + l + '\n' for l in lignes) + '```'


def case(statement, variables, attendus, steps, conditions=None):
    """Variation à une ou plusieurs cases ouvertes (`?` dans une formule de l'énoncé)."""
    attendus = attendus if isinstance(attendus, list) else [attendus]
    v = {'statement': statement, 'variables': variables,
         'blanks': [{'expectedAnswer': a} for a in attendus],
         'correction': {'steps': steps}}
    if conditions:
        v['conditions'] = conditions
    return v


def justification(statement, variables, bonne, autres, steps, conditions=None):
    """Variation à une case choix : la première proposition est la bonne (index 0)."""
    v = {'statement': statement + choix([bonne] + autres), 'variables': variables,
         'blanks': [{'expectedAnswer': '0'}], 'correction': {'steps': steps}}
    if conditions:
        v['conditions'] = conditions
    return v


def specs_choix(vi, juste, erreurs, variables=None):
    out = [spec(juste, vi, '0', 'correct', variables)]
    for k, erreur in enumerate(erreurs, start=1):
        out.append(spec('Erreur : ' + erreur, vi, str(k), 'incorrect', variables))
    return out


def vec(ab):
    return '\\overrightarrow{' + ab + '}'


def pt(nom, x, y, z):
    """Point de l'espace à coordonnées tirées : A(x ; y ; z)."""
    return nom + '(' + ev(x) + '\\,;\\,' + ev(y) + '\\,;\\,' + ev(z) + ')'


def triplet(x, y, z):
    return '(' + x + '\\,;\\,' + y + '\\,;\\,' + z + ')'


def sphere(a, b, c, r2):
    """Équation centre-rayon, nettoyée par cleanCoefficients : (x-(a))^2+…=r2."""
    return ('(x-(' + ev(a) + '))^2+(y-(' + ev(b) + '))^2+(z-(' + ev(c) + '))^2=' + ev(r2))


REPERE = 'Dans l\'espace muni d\'un repère orthonormé, '
S = '\\mathcal{S}'
P = '\\mathcal{P}'
P2 = '\\mathcal{Q}'
MODELES = []

# --- 1. TSPE-374 : intersection de deux plans -------------------------------------------------

# La droite d est choisie (A(x0 ; y0 ; 0), u(u1 ; u2 ; 1)), puis les plans x + y + k1 z = d1 et
# x − y + k2 z = d2 qui la contiennent : k1 = −(u1 + u2), k2 = u2 − u1.
V_374_DROITE = [var('x0', '-4..4'), var('y0', '-4..4'), var('u1', '-3..3'), var('u2', '-3..3'),
                var('k1', 'eval:-(u1)-(u2)'), var('k2', 'eval:(u2)-(u1)'),
                var('d1', 'eval:(x0)+(y0)'), var('d2', 'eval:(x0)-(y0)')]
V374_DROITE = case(
    REPERE + 'on considère les plans $' + P + ' : x+y+(' + ev('k1') + ')z=' + ev('d1') + '$ et $'
    + P2 + ' : x-y+(' + ev('k2') + ')z=' + ev('d2') + '$. Leurs vecteurs normaux ne sont pas'
    ' colinéaires : les deux plans se coupent selon une droite $d$.\n\nEn posant $z=t$, résous le'
    ' système en $x$ et $y$, puis complète : $d$ passe par le point $A$ de cote nulle et a pour'
    ' vecteur directeur $\\vec{u}$ de cote $1$.\n\n$A' + triplet('?', '?', '0') + '$ et $\\vec{u}$ :'
    ' $' + triplet('?', '?', '1') + '$',
    V_374_DROITE, [ev('x0'), ev('y0'), ev('u1'), ev('u2')],
    ['Avec $z=t$, le système devient $x+y=' + ev('d1') + '+(' + ev('-k1') + ')t$ et $x-y='
     + ev('d2') + '+(' + ev('-k2') + ')t$.',
     'En ajoutant : $2x=' + ev('2*x0') + '+(' + ev('2*u1') + ')t$, donc $x=' + ev('x0') + '+('
     + ev('u1') + ')t$. En soustrayant : $2y=' + ev('2*y0') + '+(' + ev('2*u2') + ')t$, donc $y='
     + ev('y0') + '+(' + ev('u2') + ')t$.',
     'Pour $t=0$ : $' + col('A' + triplet(ev('x0'), ev('y0'), '0')) + '$ ; les coefficients de $t$'
     ' donnent $' + col('\\vec{u}' + triplet(ev('u1'), ev('u2'), '1')) + '$.'],
    ['k1 != 0', 'k2 != 0'])

V374_PARALLELES = justification(
    REPERE + 'on considère les plans $' + P + ' : ' + ev('a') + 'x+(' + ev('b') + ')y+(' + ev('c')
    + ')z=' + ev('d') + '$ et $' + P2 + ' : ' + ev('k*a') + 'x+(' + ev('k*b') + ')y+(' + ev('k*c')
    + ')z=' + ev('f') + '$.\n\nQuelle est leur intersection ?',
    [var('a', '1..3'), var('b', '1..3;±'), var('c', '1..3;±'), var('d', '-5..5'),
     var('k', '2..3;±'), var('f', '-9..9')],
    'L\'ensemble vide : les plans sont strictement parallèles',
    ['Une droite, car les plans ne sont pas confondus',
     'Le plan $' + P + '$ : les plans sont confondus',
     'Un point'],
    ['Les vecteurs normaux $\\vec{n}' + triplet(ev('a'), ev('b'), ev('c')) + '$ et $\\vec{n}\''
     + triplet(ev('k*a'), ev('k*b'), ev('k*c')) + '$ vérifient $\\vec{n}\'=' + ev('k;()')
     + '\\,\\vec{n}$ : ils sont colinéaires, les plans sont parallèles.',
     'Si un point vérifiait les deux équations, en multipliant la première par $' + ev('k;()')
     + '$ on aurait $' + ev('k*a') + 'x+(' + ev('k*b') + ')y+(' + ev('k*c') + ')z=' + ev('k*d')
     + '$, alors que la seconde donne $' + ev('f') + '$.',
     'Comme $' + ev('k*d') + '\\neq ' + ev('f') + '$, aucun point n\'est commun : l\'intersection'
     ' est $' + col('\\varnothing') + '$, les plans sont strictement parallèles.'],
    ['f != k*d'])

V_374_POINT = [var('a', '2..4'), var('b', '2..4'), var('x0', '-4..4'), var('y0', '-4..4'),
               var('z0', '-4..4'), var('d1', 'eval:(x0)+(y0)+(a)*(z0)'),
               var('d2', 'eval:(x0)-(y0)+(b)*(z0)')]
V374_POINT = case(
    REPERE + 'on considère les plans $' + P + ' : x+y+' + ev('a') + 'z=' + ev('d1') + '$ et $'
    + P2 + ' : x-y+' + ev('b') + 'z=' + ev('d2') + '$, sécants selon une droite $d$.\n\nLe point'
    ' $M' + triplet(ev('x0'), 'y', 'z') + '$ appartient à $d$. Détermine $y$ et $z$.\n\n$y=?$ et'
    ' $z=?$',
    V_374_POINT, [ev('y0'), ev('z0')],
    ['$M$ est dans les deux plans : $' + ev('x0') + '+y+' + ev('a') + 'z=' + ev('d1') + '$ et $'
     + ev('x0') + '-y+' + ev('b') + 'z=' + ev('d2') + '$, soit $y+' + ev('a') + 'z=' + ev('d1-x0')
     + '$ et $-y+' + ev('b') + 'z=' + ev('d2-x0') + '$.',
     'En ajoutant : $' + ev('a+b') + 'z=' + ev('d1+d2-2*x0') + '$, donc $z=' + ev('z0') + '$.',
     'Puis $y=' + ev('d1-x0') + '-' + ev('a') + '\\times' + ev('z0;()') + '$ : $'
     + col('y=' + ev('y0')) + '$ et $' + col('z=' + ev('z0')) + '$.'],
    ['x0 != 0'])

VARS_374_D = {'x0': 1, 'y0': 2, 'u1': 2, 'u2': -1, 'k1': -1, 'k2': -3, 'd1': 3, 'd2': -1}
VARS_374_P = {'a': 2, 'b': 3, 'x0': 1, 'y0': -2, 'z0': 3, 'd1': 5, 'd2': 12}
MODELES.append(modele(
    '01-intersection-de-deux-plans', 'Espace : déterminer l\'intersection de deux plans',
    'Deux plans sécants : point de cote nulle et vecteur directeur de la droite d\'intersection'
    ' (quatre cases), plans aux vecteurs normaux colinéaires : strictement parallèles (case'
    ' choix), coordonnées manquantes d\'un point de la droite d\'intersection (deux cases)',
    4,
    [V374_DROITE, V374_PARALLELES, V374_POINT],
    [spec('A(1 ; 2 ; 0), u(2 ; −1 ; 1)', 0, ['1', '2', '2', '-1'], 'correct', VARS_374_D),
     spec('Erreur : signes du vecteur directeur', 0, ['1', '2', '-2', '1'], 'incorrect',
          VARS_374_D),
     spec('Erreur : x et y échangés', 0, ['2', '1', '-1', '2'], 'incorrect', VARS_374_D)]
    + specs_choix(1, 'strictement parallèles', ['une droite', 'confondus', 'un point'],
                  {'a': 2, 'b': -1, 'c': 3, 'd': 1, 'k': -2, 'f': 5})
    + [spec('y = −2, z = 3', 2, ['-2', '3'], 'correct', VARS_374_P),
       spec('Erreur : y = 2 (signe)', 2, ['2', '3'], 'incorrect', VARS_374_P),
       spec('Erreur : y et z échangés', 2, ['3', '-2'], 'incorrect', VARS_374_P)]))

# --- 2. TSPE-377 : intersection d'une sphère et d'une droite ----------------------------------

V_377_EQ = [var('a', '-4..4'), var('b', '-4..4'), var('c', '-4..4'), var('p', '-3..3'),
            var('q', '-3..3'), var('r2', '5..30')]
V377_EQUATION = case(
    REPERE + 'on considère la sphère $' + S + '$ d\'équation $' + sphere('a', 'b', 'c', 'r2')
    + '$ et la droite $d$ de représentation paramétrique $x=' + ev('a+p') + '+t$, $y='
    + ev('b+q') + '-t$, $z=' + ev('c') + '+2t$ ($t\\in\\mathbb{R}$).\n\nEn remplaçant $x$, $y$ et'
    ' $z$ dans l\'équation de $' + S + '$, puis en passant tout dans le membre de gauche, on obtient'
    ' une équation du second degré en $t$. Complète.\n\n$?t^2+?t+?=0$',
    V_377_EQ, ['6', ev('2*(p-q)'), ev('p^2+q^2-r2')],
    ['Pour un point de $d$ : $x-(' + ev('a') + ')=' + ev('p') + '+t$, $y-(' + ev('b') + ')='
     + ev('q') + '-t$ et $z-(' + ev('c') + ')=2t$.',
     'L\'équation devient $(' + ev('p') + '+t)^2+(' + ev('q') + '-t)^2+(2t)^2=' + ev('r2')
     + '$, soit $t^2+' + ev('2*p') + 't+' + ev('p^2') + '+t^2-' + ev('2*q') + 't+' + ev('q^2')
     + '+4t^2=' + ev('r2') + '$.',
     'Donc $' + col('6t^2' + ev('2*(p-q);+') + 't' + ev('p^2+q^2-r2;+') + '=0') + '$.'],
    ['a+p != 0', 'b+q != 0', 'c != 0', 'p != q', 'p^2+q^2 != r2'])

V_377_POINTS = [var('a', '1..4;±'), var('b', '1..4;±'), var('c', '1..4;±'),
                var('k', '1..3')]
V377_POINTS = case(
    REPERE + 'on considère la sphère $' + S + '$ d\'équation $' + sphere('a', 'b', 'c', '9*k^2')
    + '$ et la droite $d$ de représentation paramétrique $x=' + ev('a') + '+t$, $y=' + ev('b')
    + '+2t$, $z=' + ev('c') + '+2t$ ($t\\in\\mathbb{R}$).\n\n$d$ coupe $' + S + '$ en deux points.'
    ' Donne les coordonnées de celui qui correspond à $t>0$.\n\n$E' + triplet('?', '?', '?') + '$',
    V_377_POINTS, [ev('a+k'), ev('b+2*k'), ev('c+2*k')],
    ['En remplaçant : $t^2+(2t)^2+(2t)^2=' + ev('9*k^2') + '$, soit $9t^2=' + ev('9*k^2') + '$.',
     'Donc $t^2=' + ev('k^2') + '$ : $t=' + ev('k') + '$ ou $t=-' + ev('k') + '$ ($d$ passe par le'
     ' centre de $' + S + '$).',
     'Pour $t=' + ev('k') + '$ : $' + col('E' + triplet(ev('a+k'), ev('b+2*k'), ev('c+2*k')))
     + '$.'])

V_377_AUCUN = [var('a', '1..4;±'), var('b', '-4..4'), var('c', '-4..4'), var('p', '1..5;±'),
               var('q', '1..5;±'), var('r', '1..4')]
V377_AUCUN = justification(
    REPERE + 'on considère la sphère $' + S + '$ de centre $\\Omega' + triplet(ev('a'), ev('b'),
                                                                         ev('c'))
    + '$ et de rayon $' + ev('r') + '$, et la droite $d$ de représentation paramétrique $x='
    + ev('a') + '+t$, $y=' + ev('b+p') + '$, $z=' + ev('c+q') + '$ ($t\\in\\mathbb{R}$).\n\nCombien'
    ' $d$ et $' + S + '$ ont-elles de points communs ?',
    V_377_AUCUN,
    'Aucun',
    ['Un seul : $d$ est tangente à $' + S + '$',
     'Deux',
     'Une infinité'],
    ['Une équation de $' + S + '$ est $' + sphere('a', 'b', 'c', 'r^2') + '$.',
     'Pour un point de $d$ : $t^2+' + ev('p;()') + '^2+' + ev('q;()') + '^2=' + ev('r^2')
     + '$, soit $t^2=' + ev('r^2-p^2-q^2') + '$.',
     'Un carré n\'est jamais strictement négatif : $' + col('\\text{aucun point commun}') + '$.'],
    ['p^2+q^2 > r^2'])

VARS_377_E = {'a': 1, 'b': -2, 'c': 3, 'p': 1, 'q': -1, 'r2': 14}
MODELES.append(modele(
    '02-intersection-d-une-sphere-et-d-une-droite',
    'Espace : intersection d\'une sphère et d\'une droite',
    'Équation du second degré en t obtenue en remplaçant la représentation paramétrique (trois'
    ' cases), point d\'intersection d\'une droite passant par le centre (trois cases), droite'
    ' sans point commun avec la sphère (case choix)',
    5,
    [V377_EQUATION, V377_POINTS, V377_AUCUN],
    [spec('6t² + 4t − 12 = 0', 0, ['6', '4', '-12'], 'correct', VARS_377_E),
     spec('Erreur : 3t² (coefficient de z oublié au carré)', 0, ['3', '4', '-12'], 'incorrect',
          VARS_377_E),
     spec('Erreur : constante sans le rayon', 0, ['6', '4', '2'], 'incorrect', VARS_377_E),
     spec('E(3 ; 2 ; 5)', 1, ['3', '2', '5'], 'correct', {'a': 1, 'b': -2, 'c': 1, 'k': 2}),
     spec('Erreur : t = −2', 1, ['-1', '-6', '-3'], 'incorrect', {'a': 1, 'b': -2, 'c': 1, 'k': 2}),
     spec('Erreur : t = 6 (rayon)', 1, ['7', '10', '13'], 'incorrect',
          {'a': 1, 'b': -2, 'c': 1, 'k': 2})]
    + specs_choix(2, 'aucun', ['tangente', 'deux', 'infinité'],
                  {'a': 1, 'b': 0, 'c': 2, 'p': 3, 'q': -2, 'r': 3})))

# --- 3. TSPE-564 : plan tangent à une sphère en un point --------------------------------------

V_564 = [var('a', '-3..3'), var('b', '-3..3'), var('c', '-3..3'), var('v1', '-3..3'),
         var('v2', '-3..3'), var('v3', '-3..3'), var('r2', 'eval:(v1)^2+(v2)^2+(v3)^2'),
         var('xa', 'eval:(a)+(v1)'), var('ya', 'eval:(b)+(v2)'), var('za', 'eval:(c)+(v3)')]
C_564 = ['(v1 != 0 && v2 != 0) || (v1 != 0 && v3 != 0) || (v2 != 0 && v3 != 0)']
V564_NORMAL = case(
    REPERE + 'on considère la sphère $' + S + '$ d\'équation $x^2+y^2+z^2+(' + ev('-2*a') + ')x+('
    + ev('-2*b') + ')y+(' + ev('-2*c') + ')z+(' + ev('a^2+b^2+c^2-r2') + ')=0$ et son point $'
    + pt('A', 'xa', 'ya', 'za') + '$.\n\nLe plan tangent à $' + S + '$ en $A$ est le plan passant'
    ' par $A$ et orthogonal au rayon $[\\Omega A]$, où $\\Omega$ est le centre de $' + S + '$.'
    ' Donne les coordonnées du vecteur $' + vec('\\Omega A') + '$, normal à ce plan.\n\n$'
    + triplet('?', '?', '?') + '$',
    V_564, [ev('v1'), ev('v2'), ev('v3')],
    ['On complète les carrés : $' + sphere('a', 'b', 'c', 'r2') + '$.',
     'Le centre est $\\Omega' + triplet(ev('a'), ev('b'), ev('c')) + '$.',
     'Donc $' + vec('\\Omega A') + col(triplet(ev('v1'), ev('v2'), ev('v3'))) + '$.'],
    C_564)

V564_EQUATION = case(
    REPERE + 'on considère la sphère $' + S + '$ d\'équation $' + sphere('a', 'b', 'c', 'r2')
    + '$ et son point $' + pt('A', 'xa', 'ya', 'za') + '$.\n\nLe plan $' + P + '$ tangent à $' + S
    + '$ en $A$ a une équation de la forme $' + ev('v1') + 'x+(' + ev('v2') + ')y+(' + ev('v3')
    + ')z+d=0$. Détermine $d$.\n\n$d=?$',
    V_564, ev('-(v1*xa+v2*ya+v3*za)'),
    ['Le centre de $' + S + '$ est $\\Omega' + triplet(ev('a'), ev('b'), ev('c')) + '$, et $'
     + P + '$ est orthogonal à $' + vec('\\Omega A') + triplet(ev('v1'), ev('v2'), ev('v3'))
     + '$ : d\'où les coefficients de $x$, $y$ et $z$.',
     '$A\\in' + P + '$ : $' + ev('v1') + '\\times' + ev('xa;()') + '+' + ev('v2;()') + '\\times'
     + ev('ya;()') + '+' + ev('v3;()') + '\\times' + ev('za;()') + '+d=0$.',
     'Soit $' + ev('v1*xa+v2*ya+v3*za') + '+d=0$, donc $' + col('d=' + ev('-(v1*xa+v2*ya+v3*za)'))
     + '$.'],
    C_564)

V564_PREUVE = justification(
    'Soit $' + S + '$ une sphère de centre $\\Omega$ et de rayon $R$, $A$ un point de $' + S
    + '$, et $' + P + '$ le plan passant par $A$ et orthogonal à $(\\Omega A)$.\n\nPour montrer'
    ' que $A$ est le seul point commun à $' + P + '$ et $' + S + '$, on prend un point $M$ de $' + P
    + '$ distinct de $A$. Quel argument donne $\\Omega M>R$ ?',
    [],
    'Le triangle $\\Omega AM$ est rectangle en $A$ : $\\Omega M^2=\\Omega A^2+AM^2>R^2$',
    ['L\'inégalité triangulaire : $\\Omega M=\\Omega A+AM$',
     '$M$ est dans $' + P + '$, donc $\\Omega M=R$',
     '$AM=\\Omega A$, car $' + P + '$ est orthogonal à $(\\Omega A)$'],
    ['$(\\Omega A)$ est orthogonale à $' + P + '$, donc à la droite $(AM)$ contenue dans $' + P
     + '$ : le triangle $\\Omega AM$ est rectangle en $A$.',
     'Pythagore : $\\Omega M^2=\\Omega A^2+AM^2=R^2+AM^2>R^2$, car $AM>0$.',
     'Donc $\\Omega M>R$ : $M\\notin' + S + '$, et $' + col('A \\text{ est le seul point commun}')
     + '$ ; c\'est pourquoi $' + P + '$ est dit tangent à $' + S + '$ en $A$.'])

VARS_564 = {'a': 1, 'b': -1, 'c': 2, 'v1': 2, 'v2': 1, 'v3': -2, 'r2': 9, 'xa': 3, 'ya': 0,
            'za': 0}
MODELES.append(modele(
    '03-plan-tangent-a-une-sphere', 'Espace : plan tangent à une sphère en un point',
    'Vecteur normal ΩA, centre lu sur une équation développée (trois cases), constante d\'une'
    ' équation du plan tangent (case), pourquoi le plan tangent ne touche la sphère qu\'en A :'
    ' Pythagore (case choix)',
    5,
    [V564_NORMAL, V564_EQUATION, V564_PREUVE],
    [spec('ΩA(2 ; 1 ; −2)', 0, ['2', '1', '-2'], 'correct', VARS_564),
     spec('Erreur : AΩ (signes)', 0, ['-2', '-1', '2'], 'incorrect', VARS_564),
     spec('Erreur : coordonnées de A', 0, ['3', '0', '0'], 'incorrect', VARS_564),
     spec('d = −6', 1, '-6', 'correct', VARS_564),
     spec('Erreur : d = 6 (signe)', 1, '6', 'incorrect', VARS_564),
     spec('Erreur : d avec Ω au lieu de A (3)', 1, '3', 'incorrect', VARS_564)]
    + specs_choix(2, 'Pythagore', ['inégalité triangulaire', 'ΩM = R', 'AM = ΩA'])))

# --- 4. TSPE-361 : sphère circonscrite à un tétraèdre -----------------------------------------

V_361 = [var('p', '1..4'), var('q', '1..4'), var('s', '1..4')]
INTRO_361 = (REPERE + 'on considère le tétraèdre $OABC$, avec $O' + triplet('0', '0', '0') + '$, $'
             + pt('A', '2*p', '0', '0') + '$, $' + pt('B', '0', '2*q', '0') + '$ et $'
             + pt('C', '0', '0', '2*s') + '$.\n\n')
ETAPES_361_CENTRE = [
    'Le centre $\\Omega(x\\,;\\,y\\,;\\,z)$ est équidistant des quatre sommets.',
    '$\\Omega O^2=\\Omega A^2$ : $x^2=(x-' + ev('2*p') + ')^2$, soit $' + ev('4*p') + 'x='
    + ev('4*p^2') + '$, donc $x=' + ev('p') + '$ ; de même $\\Omega O^2=\\Omega B^2$ donne $y='
    + ev('q') + '$ et $\\Omega O^2=\\Omega C^2$ donne $z=' + ev('s') + '$.']
V361_CENTRE = case(
    INTRO_361 + 'Détermine le centre $\\Omega$ de la sphère circonscrite à $OABC$, c\'est-à-dire'
    ' passant par ses quatre sommets.\n\n$\\Omega' + triplet('?', '?', '?') + '$',
    V_361, [ev('p'), ev('q'), ev('s')],
    ETAPES_361_CENTRE
    + ['Donc $' + col('\\Omega' + triplet(ev('p'), ev('q'), ev('s'))) + '$, le milieu de $[O'
       + 'D]$ où $D$ est le sommet opposé à $O$ du pavé construit sur $OA$, $OB$, $OC$.'])

V361_RAYON = case(
    INTRO_361 + 'Soit $R$ le rayon de la sphère circonscrite à $OABC$, passant par ses quatre'
    ' sommets. Détermine $R^2$.\n\n$R^2=?$',
    V_361, ev('p^2+q^2+s^2'),
    ETAPES_361_CENTRE
    + ['$R^2=\\Omega O^2=' + ev('p') + '^2+' + ev('q') + '^2+' + ev('s') + '^2$, donc $'
       + col('R^2=' + ev('p^2+q^2+s^2')) + '$.'])

V361_METHODE = justification(
    'Soit $ABCD$ un tétraèdre. On cherche le centre $\\Omega$ de sa sphère circonscrite, la sphère'
    ' qui passe par $A$, $B$, $C$ et $D$.\n\nQuel est ce point ?',
    [],
    'Le point commun aux plans médiateurs des arêtes $[AB]$, $[AC]$ et $[AD]$',
    ['L\'isobarycentre de $A$, $B$, $C$ et $D$',
     'Le point commun aux hauteurs du tétraèdre',
     'Le milieu du segment qui joint les milieux de $[AB]$ et de $[CD]$'],
    ['$\\Omega A=\\Omega B$ équivaut à : $\\Omega$ est dans le plan médiateur de $[AB]$.',
     'De même avec $[AC]$ et $[AD]$ : $\\Omega A=\\Omega B=\\Omega C=\\Omega D$ équivaut à'
     ' $\\Omega$ commun aux trois plans médiateurs.',
     'Le centre est donc $' + col('\\text{le point commun aux plans médiateurs}') + '$ ;'
     ' l\'isobarycentre ne convient que pour un tétraèdre particulier (régulier par exemple).'])

V_361_D = [var('p', '1..3'), var('q', '1..3'), var('d1', '-3..3'), var('d2', '-3..3'),
           var('d3', '1..4')]
V361_SYSTEME = case(
    REPERE + 'on considère le tétraèdre $OABD$, avec $O' + triplet('0', '0', '0') + '$, $'
    + pt('A', '2*p', '0', '0') + '$, $' + pt('B', '0', '2*q', '0') + '$ et $'
    + pt('D', 'd1', 'd2', 'd3') + '$.\n\nLe centre de sa sphère circonscrite est $\\Omega'
    + triplet(ev('p'), ev('q'), 'z') + '$ (plans médiateurs de $[OA]$ et $[OB]$). En écrivant'
    ' $\\Omega O^2=\\Omega D^2$, détermine $z$.\n\n$z=?$',
    V_361_D, ev('(d1^2+d2^2+d3^2-2*p*d1-2*q*d2)/(2*d3)'),
    ['$\\Omega O^2=' + ev('p^2+q^2') + '+z^2$ et $\\Omega D^2=(' + ev('p') + '-' + ev('d1;()')
     + ')^2+(' + ev('q') + '-' + ev('d2;()') + ')^2+(z-' + ev('d3') + ')^2$.',
     'L\'égalité donne, après simplification de $z^2$ : $' + ev('2*d3') + 'z='
     + ev('d1^2+d2^2+d3^2-2*p*d1-2*q*d2') + '$.',
     'Donc $' + col('z=' + ev('(d1^2+d2^2+d3^2-2*p*d1-2*q*d2)/(2*d3)')) + '$.'],
    ['d1 != 2*p || d2 != 0', 'd1 != 0 || d2 != 2*q'])

VARS_361_D = {'p': 1, 'q': 1, 'd1': 1, 'd2': 0, 'd3': 3}
MODELES.append(modele(
    '04-sphere-circonscrite-a-un-tetraedre', 'Espace : sphère circonscrite à un tétraèdre',
    'Tétraèdre trirectangle OABC : centre (trois cases) et carré du rayon (case) de la sphère'
    ' circonscrite ; le centre est le point commun aux plans médiateurs (case choix) ; cote du'
    ' centre par ΩO² = ΩD² (case)',
    6,
    [V361_CENTRE, V361_RAYON, V361_METHODE, V361_SYSTEME],
    [spec('Ω(1 ; 2 ; 3)', 0, ['1', '2', '3'], 'correct', {'p': 1, 'q': 2, 's': 3}),
     spec('Erreur : sommet opposé (2 ; 4 ; 6)', 0, ['2', '4', '6'], 'incorrect',
          {'p': 1, 'q': 2, 's': 3}),
     spec('Erreur : isobarycentre (1/2 ; 1 ; 3/2)', 0,
          ['\\frac{1}{2}', '1', '\\frac{3}{2}'], 'incorrect', {'p': 1, 'q': 2, 's': 3}),
     spec('14', 1, '14', 'correct', {'p': 1, 'q': 2, 's': 3}),
     spec('Erreur : 56 (diamètre au carré)', 1, '56', 'incorrect', {'p': 1, 'q': 2, 's': 3}),
     spec('Erreur : √14 (R au lieu de R²)', 1, '\\sqrt{14}', 'incorrect',
          {'p': 1, 'q': 2, 's': 3})]
    + specs_choix(2, 'plans médiateurs', ['isobarycentre', 'hauteurs', 'bimédianes'])
    + [spec('z = 4/3', 3, '\\frac{4}{3}', 'correct', VARS_361_D),
       spec('Erreur : 8/3 (sans le facteur 2)', 3, '\\frac{8}{3}', 'incorrect', VARS_361_D),
       spec('Erreur : 3/2 (milieu de la cote de D)', 3, '\\frac{3}{2}', 'incorrect', VARS_361_D)]))


os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    chemin = os.path.join(DOSSIER, nom + '.json')
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
