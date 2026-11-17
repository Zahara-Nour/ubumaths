"""Écrit les 6 modèles du lot 8 « approfondissements : géométrie » de la 1re spé
dans scripts/questions/1spe-approfondissements-8/.

Phase 0 validée par David le 2026-11-04 (D3 du journal
« docs/archive/wip/questions-1spe-demonstrations-progress.md », § 9) ; rangement D6 (2026-11-05), un point
par modèle :

| # | Point    | Titre                                                  | Niv. | Nœud du modèle (D6)                         |
| 1 | 1SPE-324 | Calculer avec la loi des sinus                                    | 1    | Produit scalaire › angles et longueurs      |
| 2 | 1SPE-325 | Démontrer que les hauteurs d'un triangle sont concourantes | 2 | Produit scalaire › propriétés               |
| 3 | 1SPE-326 | Démontrer que les médianes concourent au centre de gravité | 2 | Vecteurs › combinaison linéaire             |
| 4 | 1SPE-334 | Points équidistants de l'axe des abscisses et d'un point | 2    | Géométrie repérée › parabole (neuve)        |
| 5 | 1SPE-335 | Intersection d'un cercle et d'une droite parallèle à un axe | 1 | Géométrie repérée › équation de cercle  |
| 6 | 1SPE-420 | Intersection d'une parabole et d'une droite parallèle à un axe | 1 | Géométrie repérée › parabole (neuve) |

Forme (D3, Q2) : 325 et 326 sont des preuves, comme les démonstrations (case, case choix à
4 propositions dont la première est la bonne, variation « étapes à ranger », positions calculées
par le générateur, graine 0) ; les autres sont des exercices d'application à valeurs tirées.
La loi des sinus est rappelée dans l'énoncé (approfondissement : le BO ne demande pas de la
connaître) ; angles remarquables, réponses exactes k√2, k√3, b/(2a).

Étapes à ranger : chaque étape s'appuie sur la précédente (aucune paire interchangeable, leçon
du lot 7).

Approfondissements « en aucun cas obligatoires » (BO 1re spé p.3).

    python3 docs/wip/questions/lot-1spe-approfondissements-8.py scripts/questions/1spe-approfondissements-8
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, answer, status, variables=None):
    expected = {'status': status}
    if status == 'bad_form':
        expected['constraintViolations'] = ['form']
    answers = answer if isinstance(answer, list) else [answer]
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in (variables or {}).items()},
            'answers': answers, 'expected': expected}


def modele(nom, title, description, level, variations, specs):
    return nom, {'title': title, 'description': description, 'grades': ['1_SPE'],
                 'level': level, 'delay': 90, 'status': 'draft',
                 'shared': {},
                 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def ev(x):
    return '{{eval:' + x + '}}'


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def choix(lignes):
    return '\n\n```choix\n' + ''.join('- ' + l + '\n' for l in lignes) + '```'


def case(statement, variables, attendu, steps, conditions=None):
    """Variation à une case ouverte (`?` dans une formule de l'énoncé)."""
    v = {'statement': statement, 'variables': variables,
         'blanks': [attendu if isinstance(attendu, dict) else {'expectedAnswer': attendu}],
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


def ranger(intro, etapes, steps):
    """Variation « étapes à ranger » (lot 4) : étapes données dans le bon ordre."""
    return {'statement': intro + '\n\nRemets les étapes de la démonstration dans l\'ordre.\n\n'
            '```ranger\nsigne: aucun\n' + ''.join('- ' + e + '\n' for e in etapes) + '```',
            'variables': [], 'correction': {'steps': steps}}


def specs_choix(vi, juste, erreurs, variables=None):
    out = [spec(juste, vi, '0', 'correct', variables)]
    for k, erreur in enumerate(erreurs, start=1):
        out.append(spec('Erreur : ' + erreur, vi, str(k), 'incorrect', variables))
    return out


def vec(ab):
    return '\\overrightarrow{' + ab + '}'


def ps(u, v):
    """Produit scalaire de deux vecteurs nommés par leurs extrémités."""
    return vec(u) + '\\cdot' + vec(v)


# Variable symbolique `x` (astuce des modèles de 1spe-analyse-a : `x|x`), pour écrire un
# polynôme développé avec {{eval:…}} (coefficients nuls et signes gérés par le moteur).
X = var('x', 'x|x')

MODELES = []

# --- 1. 1SPE-324 : loi des sinus -----------------------------------------------------------------

LOI_SINUS = ('Dans un triangle $ABC$, on admet la loi des sinus :\n\n'
             '$$\\dfrac{BC}{\\sin\\widehat{A}}=\\dfrac{AC}{\\sin\\widehat{B}}'
             '=\\dfrac{AB}{\\sin\\widehat{C}}$$\n\n')

V324_30_45 = case(
    LOI_SINUS + 'Dans le triangle $ABC$, $\\widehat{A}=30^\\circ$, $\\widehat{B}=45^\\circ$ et'
    ' $BC=' + ev('a') + '$ cm. Calcule $AC$, en valeur exacte.\n\n$AC=?$ cm',
    [var('a', '2..9')], ev('a') + '\\sqrt{2}',
    ['La loi des sinus donne $\\dfrac{AC}{\\sin\\widehat{B}}=\\dfrac{BC}{\\sin\\widehat{A}}$,'
     ' donc $AC=\\dfrac{BC\\times\\sin\\widehat{B}}{\\sin\\widehat{A}}$.',
     '$\\sin 30^\\circ=\\dfrac{1}{2}$ et $\\sin 45^\\circ=\\dfrac{\\sqrt{2}}{2}$ : $AC=\\dfrac{'
     + ev('a') + '\\times\\frac{\\sqrt{2}}{2}}{\\frac{1}{2}}$.',
     'Donc $AC=' + col(ev('a') + '\\sqrt{2}') + '$ cm.'])
V324_45_60 = case(
    LOI_SINUS + 'Dans le triangle $ABC$, $\\widehat{A}=45^\\circ$, $\\widehat{B}=60^\\circ$ et'
    ' $BC=' + ev('k') + '\\sqrt{2}$ cm. Calcule $AC$, en valeur exacte.\n\n$AC=?$ cm',
    [var('k', '2..9')], ev('k') + '\\sqrt{3}',
    ['La loi des sinus donne $AC=\\dfrac{BC\\times\\sin\\widehat{B}}{\\sin\\widehat{A}}$.',
     '$\\sin 45^\\circ=\\dfrac{\\sqrt{2}}{2}$ et $\\sin 60^\\circ=\\dfrac{\\sqrt{3}}{2}$ : $AC=\\dfrac{'
     + ev('k') + '\\sqrt{2}\\times\\frac{\\sqrt{3}}{2}}{\\frac{\\sqrt{2}}{2}}$.',
     'Les $\\dfrac{\\sqrt{2}}{2}$ se simplifient : $AC=' + col(ev('k') + '\\sqrt{3}') + '$ cm.'])
V324_SINUS = case(
    LOI_SINUS + 'Dans le triangle $ABC$, $\\widehat{A}=30^\\circ$, $BC=' + ev('a') + '$ cm et'
    ' $AC=' + ev('b') + '$ cm. Calcule $\\sin\\widehat{B}$, en valeur exacte.\n\n'
    '$\\sin\\widehat{B}=?$',
    [var('a', '3..9'), var('b', '2..9')], ev('b/(2*a)'),
    ['La loi des sinus donne $\\dfrac{AC}{\\sin\\widehat{B}}=\\dfrac{BC}{\\sin\\widehat{A}}$,'
     ' donc $\\sin\\widehat{B}=\\dfrac{AC\\times\\sin\\widehat{A}}{BC}$.',
     '$\\sin 30^\\circ=\\dfrac{1}{2}$ : $\\sin\\widehat{B}=\\dfrac{' + ev('b')
     + '\\times\\frac{1}{2}}{' + ev('a') + '}$.',
     'Donc $\\sin\\widehat{B}=' + col(ev('b/(2*a)')) + '$.'],
    ['b < 2*a', 'b != a'])

MODELES.append(modele(
    '01-loi-des-sinus', 'Calculer avec la loi des sinus',
    'Loi des sinus rappelée : un côté avec des angles de 30° et 45°, puis 45° et 60° (valeurs'
    ' exactes), et le sinus d\'un angle connaissant deux côtés et l\'angle de 30°',
    1,
    [V324_30_45, V324_45_60, V324_SINUS],
    [spec('5√2', 0, '5\\sqrt{2}', 'correct', {'a': 5}),
     spec('Erreur : quotient inversé (5√2/2)', 0, '\\frac{5\\sqrt{2}}{2}', 'incorrect', {'a': 5}),
     spec('Erreur : 5', 0, '5', 'incorrect', {'a': 5}),
     spec('4√3', 1, '4\\sqrt{3}', 'correct', {'k': 4}),
     spec('Erreur : quotient inversé (8√3/3)', 1, '\\frac{8\\sqrt{3}}{3}', 'incorrect', {'k': 4}),
     spec('Erreur : 4√2', 1, '4\\sqrt{2}', 'incorrect', {'k': 4}),
     spec('2/5', 2, '\\frac{2}{5}', 'correct', {'a': 5, 'b': 4}),
     spec('Erreur : quotient inversé (5/8)', 2, '\\frac{5}{8}', 'incorrect', {'a': 5, 'b': 4}),
     spec('Erreur : sans le sinus de 30° (4/5)', 2, '\\frac{4}{5}', 'incorrect',
          {'a': 5, 'b': 4})]))

# --- 2. 1SPE-325 : concourance des hauteurs -----------------------------------------------------

INTRO_325 = ('Soit $ABC$ un triangle. Les hauteurs issues de $A$ et de $B$ ne sont pas parallèles'
             ' (sinon $(BC)$ et $(AC)$ le seraient) : soit $H$ leur point d\'intersection.\n\n')
EULER = ps('HA', 'BC') + '+' + ps('HB', 'CA') + '+' + ps('HC', 'AB')

V325_SOMME = case(
    INTRO_325 + 'Par la relation de Chasles, $' + vec('BC') + '=' + vec('HC') + '-' + vec('HB')
    + '$, $' + vec('CA') + '=' + vec('HA') + '-' + vec('HC') + '$ et $' + vec('AB') + '='
    + vec('HB') + '-' + vec('HA') + '$. En développant, complète.\n\n$' + EULER + '=?$',
    [], '0',
    ['On remplace : $' + ps('HA', 'HC') + '-' + ps('HA', 'HB') + '+' + ps('HB', 'HA') + '-'
     + ps('HB', 'HC') + '+' + ps('HC', 'HB') + '-' + ps('HC', 'HA') + '$.',
     'Le produit scalaire est symétrique : les termes s\'annulent deux à deux.',
     'Donc $' + EULER + '=' + col('0') + '$.'])
V325_HAUTEUR = justification(
    INTRO_325 + 'Pourquoi $' + ps('HA', 'BC') + '=0$ ?',
    [],
    'Car $H$ est sur la hauteur issue de $A$, perpendiculaire à $(BC)$.',
    ['Car $H$ est le milieu de $[BC]$.',
     'Car $HA=HB$.',
     'Car $' + vec('HA') + '$ et $' + vec('BC') + '$ sont colinéaires.'],
    ['La hauteur issue de $A$ est la droite passant par $A$ et perpendiculaire à $(BC)$.',
     '$H$ et $A$ sont sur cette droite, donc $' + vec('HA') + '$ est orthogonal à $' + vec('BC')
     + '$ : $' + col(ps('HA', 'BC') + '=0') + '$.',
     'De même, $H$ est sur la hauteur issue de $B$ : $' + ps('HB', 'CA') + '=0$.'])
V325_CONCLUSION = justification(
    INTRO_325 + 'On a démontré que $' + ps('HC', 'AB') + '=0$. Qu\'en conclut-on ?',
    [],
    '$H$ est sur la droite passant par $C$ et perpendiculaire à $(AB)$ : la hauteur issue de $C$.',
    ['$H$ est le milieu de $[AB]$.',
     '$H$ est à égale distance de $A$, de $B$ et de $C$.',
     '$H$ est sur la droite $(AB)$.'],
    ['$' + ps('HC', 'AB') + '=0$ : $' + vec('HC') + '$ est orthogonal à $' + vec('AB') + '$.',
     'Donc $' + col('H') + '$ est sur la droite passant par $C$ et perpendiculaire à $(AB)$,'
     ' c\'est-à-dire sur la hauteur issue de $C$.',
     'Les trois hauteurs passent par $H$ : elles sont concourantes.'])
V325_PREUVE = ranger(
    'Soit $ABC$ un triangle. On démontre que ses trois hauteurs sont concourantes.',
    ['Soit $H$ le point d\'intersection des hauteurs issues de $A$ et de $B$.',
     'Par Chasles, en développant : $' + EULER + '=0$.',
     'Or $' + ps('HA', 'BC') + '=0$ et $' + ps('HB', 'CA') + '=0$, donc $' + ps('HC', 'AB')
     + '=0$.',
     'Donc $H$ est sur la hauteur issue de $C$ : les trois hauteurs sont concourantes.'],
    ['On nomme $H$, puis on écrit une égalité vraie pour tout point, avec $H$.',
     'Deux des trois produits sont nuls, car $H$ est sur deux hauteurs : le troisième l\'est'
     ' aussi, $' + col(ps('HC', 'AB') + '=0') + '$, et $H$ est sur la troisième hauteur.'])

MODELES.append(modele(
    '02-concourance-des-hauteurs', 'Démontrer que les hauteurs d\'un triangle sont concourantes',
    'H intersection de deux hauteurs : HA·BC + HB·CA + HC·AB = 0 par Chasles, HA·BC = 0'
    ' (case choix), conclusion HC·AB = 0 (case choix), démonstration (étapes à ranger)',
    2,
    [V325_SOMME, V325_HAUTEUR, V325_CONCLUSION, V325_PREUVE],
    [spec('0', 0, '0', 'correct'),
     spec('Erreur : 1', 0, '1', 'incorrect')]
    + specs_choix(1, 'H sur la hauteur issue de A', ['milieu', 'HA = HB', 'colinéaires'])
    + specs_choix(2, 'hauteur issue de C', ['milieu', 'équidistant', 'sur (AB)'])
    + ['RANGER:3']))

# --- 3. 1SPE-326 : médianes et centre de gravité ------------------------------------------------

INTRO_326 = ('Soit $ABC$ un triangle. On admet qu\'il existe un point $G$ tel que $' + vec('GA')
             + '+' + vec('GB') + '+' + vec('GC') + '=\\vec{0}$. On note $A\'$ le milieu de'
             ' $[BC]$.\n\n')

V326_MILIEU = case(
    INTRO_326 + 'Complète.\n\n$' + vec('GB') + '+' + vec('GC') + '=?\\,' + vec('GA\'') + '$',
    [], '2',
    ['Par Chasles, $' + vec('GB') + '=' + vec('GA\'') + '+' + vec('A\'B') + '$ et $' + vec('GC')
     + '=' + vec('GA\'') + '+' + vec('A\'C') + '$.',
     '$A\'$ est le milieu de $[BC]$ : $' + vec('A\'B') + '+' + vec('A\'C') + '=\\vec{0}$.',
     'Donc $' + vec('GB') + '+' + vec('GC') + '=' + col('2') + vec('GA\'') + '$.'])
V326_COLINEAIRES = justification(
    INTRO_326 + 'On a obtenu $' + vec('GA') + '=-2\\,' + vec('GA\'') + '$. Pourquoi $G$ est-il'
    ' sur la médiane issue de $A$ ?',
    [],
    'Car $' + vec('GA') + '$ et $' + vec('GA\'') + '$ sont colinéaires : $A$, $G$ et $A\'$ sont'
    ' alignés.',
    ['Car $GA=GA\'$.',
     'Car $G$ est le milieu de $[AA\']$.',
     'Car $A\'$ est le milieu de $[BC]$.'],
    ['$' + vec('GA') + '=-2\\,' + vec('GA\'') + '$ : les deux vecteurs sont colinéaires.',
     'Donc $A$, $G$ et $A\'$ sont alignés : $' + col('G\\in(AA\')') + '$, la médiane issue de $A$.',
     '$A\'$ milieu de $[BC]$ sert à obtenir l\'égalité, pas à conclure.'])
V326_RAPPORT = case(
    INTRO_326 + 'On a obtenu $' + vec('GA') + '=-2\\,' + vec('GA\'') + '$. Complète.\n\n$'
    + vec('AG') + '=?\\,' + vec('AA\'') + '$',
    [], '\\frac{2}{3}',
    ['$' + vec('AG') + '=2\\,' + vec('GA\'') + '$ et $' + vec('AA\'') + '=' + vec('AG') + '+'
     + vec('GA\'') + '=3\\,' + vec('GA\'') + '$.',
     'Donc $' + vec('AG') + '=' + col('\\dfrac{2}{3}') + vec('AA\'') + '$ : $G$ est aux deux'
     ' tiers de la médiane, en partant du sommet.'])
V326_PREUVE = ranger(
    'Soit $ABC$ un triangle. On démontre que ses trois médianes sont concourantes, au point $G$'
    ' tel que $' + vec('GA') + '+' + vec('GB') + '+' + vec('GC') + '=\\vec{0}$ (on admet qu\'il'
    ' existe).',
    ['Soit $G$ tel que $' + vec('GA') + '+' + vec('GB') + '+' + vec('GC') + '=\\vec{0}$, et'
     ' $A\'$ le milieu de $[BC]$.',
     'Comme $A\'$ est le milieu de $[BC]$, $' + vec('GB') + '+' + vec('GC') + '=2\\,'
     + vec('GA\'') + '$.',
     'Donc $' + vec('GA') + '+2\\,' + vec('GA\'') + '=\\vec{0}$, soit $' + vec('GA') + '=-2\\,'
     + vec('GA\'') + '$.',
     '$A$, $G$ et $A\'$ sont alignés : $G$ est sur la médiane issue de $A$ ; de même pour $B$ et'
     ' $C$.'],
    ['Le milieu $A\'$ transforme $' + vec('GB') + '+' + vec('GC') + '$ en $2\\,' + vec('GA\'')
     + '$.',
     'La colinéarité de $' + vec('GA') + '$ et $' + vec('GA\'') + '$ place $G$ sur la médiane ;'
     ' le même calcul vaut pour les deux autres : $' + col('G') + '$ est sur les trois.'])

MODELES.append(modele(
    '03-medianes-et-centre-de-gravite',
    'Démontrer que les médianes concourent au centre de gravité',
    'G tel que GA + GB + GC = 0 : GB + GC = 2GA′ (case), A, G, A′ alignés (case choix),'
    ' AG = 2/3 AA′ (case), démonstration (étapes à ranger)',
    2,
    [V326_MILIEU, V326_COLINEAIRES, V326_RAPPORT, V326_PREUVE],
    [spec('2', 0, '2', 'correct'),
     spec('Erreur : 1', 0, '1', 'incorrect'),
     spec('Erreur : 1/2', 0, '\\frac{1}{2}', 'incorrect')]
    + specs_choix(1, 'colinéaires', ['GA = GA′', 'milieu de [AA′]', 'A′ milieu'])
    + [spec('2/3', 2, '\\frac{2}{3}', 'correct'),
       spec('Erreur : 1/3', 2, '\\frac{1}{3}', 'incorrect'),
       spec('Erreur : 2', 2, '2', 'incorrect')]
    + ['RANGER:3']))

# --- 4. 1SPE-334 : points équidistants de l'axe des abscisses et d'un point ---------------------
# F(a ; b), b > 0 pair ; M(x ; y) : |y| = MF ⇔ y² = (x − a)² + (y − b)² ⇔ 2by = (x − a)² + b²
# ⇔ y = (x − a)²/(2b) + b/2 : une parabole.

V_334 = [var('a', '-5..5'), var('b', '2|4|6')]
C_334 = ['a != 0']
F_334 = '$F(' + ev('a') + '\\,;\\,' + ev('b') + ')$'
INTRO_334 = ('Dans un repère orthonormé, on cherche l\'ensemble des points $M(x\\,;\\,y)$ à égale'
             ' distance de l\'axe des abscisses et du point ' + F_334 + '.\n\n')
EQ_334 = 'y^2=(x' + ev('-a;+') + ')^2+(y-' + ev('b') + ')^2'

V334_SOMMET = case(
    INTRO_334 + 'Sur la droite d\'équation $x=' + ev('a') + '$, quel point convient ? Donne son'
    ' ordonnée.\n\n$y=?$',
    V_334, ev('b/2'),
    ['La distance de $M(' + ev('a') + '\\,;\\,y)$ à l\'axe des abscisses est $|y|$, et $MF=|y-'
     + ev('b') + '|$.',
     '$|y|=|y-' + ev('b') + '|$ : $y$ est à égale distance de $0$ et de $' + ev('b') + '$, donc'
     ' $y=' + col(ev('b/2')) + '$.'],
    C_334)
V334_DEVELOPPE = case(
    INTRO_334 + 'La distance de $M$ à l\'axe des abscisses est $|y|$ : $M$ convient si et'
    ' seulement si $' + EQ_334 + '$. En développant $(y-' + ev('b') + ')^2$, complète.\n\n'
    '$' + ev('2*b') + 'y=(x' + ev('-a;+') + ')^2+?$',
    V_334, ev('b^2'),
    ['$(y-' + ev('b') + ')^2=y^2-' + ev('2*b') + 'y+' + ev('b^2') + '$ : les $y^2$ se'
     ' simplifient.',
     'Il reste $0=(x' + ev('-a;+') + ')^2-' + ev('2*b') + 'y+' + ev('b^2') + '$, soit $'
     + ev('2*b') + 'y=(x' + ev('-a;+') + ')^2+' + col(ev('b^2')) + '$.'],
    C_334)
V334_ENSEMBLE = justification(
    INTRO_334 + 'Quel est cet ensemble ?',
    V_334,
    'La parabole d\'équation $y=\\dfrac{1}{' + ev('2*b') + '}(x' + ev('-a;+') + ')^2+'
    + ev('b/2') + '$',
    ['La parabole d\'équation $y=\\dfrac{1}{' + ev('2*b') + '}(x' + ev('a;+') + ')^2+'
     + ev('b/2') + '$',
     'La parabole d\'équation $y=\\dfrac{1}{' + ev('b') + '}(x' + ev('-a;+') + ')^2+'
     + ev('b/2') + '$',
     'Le cercle de centre $F$ et de rayon $' + ev('b') + '$'],
    ['$M$ convient si et seulement si $|y|=MF$, soit $' + EQ_334 + '$.',
     'En développant : $' + ev('2*b') + 'y=(x' + ev('-a;+') + ')^2+' + ev('b^2') + '$.',
     'Donc $' + col('y=\\dfrac{1}{' + ev('2*b') + '}(x' + ev('-a;+') + ')^2+' + ev('b/2')) + '$ :'
     ' c\'est une parabole, de sommet $(' + ev('a') + '\\,;\\,' + ev('b/2') + ')$.'],
    C_334)

VARS_334 = {'a': 3, 'b': 4}
MODELES.append(modele(
    '04-points-equidistants-de-l-axe-et-d-un-point',
    'Points équidistants de l\'axe des abscisses et d\'un point',
    'F(a ; b) donné : point de la droite x = a qui convient, équation 2by = (x − a)² + b²'
    ' (case), l\'ensemble est une parabole (case choix)',
    2,
    [V334_SOMMET, V334_DEVELOPPE, V334_ENSEMBLE],
    [spec('2', 0, '2', 'correct', VARS_334),
     spec('Erreur : 4 (ordonnée de F)', 0, '4', 'incorrect', VARS_334),
     spec('Erreur : 0', 0, '0', 'incorrect', VARS_334),
     spec('16', 1, '16', 'correct', VARS_334),
     spec('Erreur : 8', 1, '8', 'incorrect', VARS_334),
     spec('Erreur : −16', 1, '-16', 'incorrect', VARS_334)]
    + specs_choix(2, 'parabole', ['signe de a', '1/b', 'cercle'], VARS_334)))

# --- 5. 1SPE-335 : cercle et droite parallèle à un axe -------------------------------------------
# Cercle de centre Ω(p ; q), rayon 5 ; droite y = q + d avec d = ±3 ou ±4 : (x − p)² = 25 − d².

CERCLE = '(x' + ev('-p;+') + ')^2+(y' + ev('-q;+') + ')^2=25'
V_335 = [var('p', '-5..5'), var('q', '-5..5'), var('d', '-4|-3|3|4')]
C_335 = ['p != 0', 'q != 0', 'q + d != 0']
INTRO_335 = ('Dans un repère orthonormé, on considère le cercle $\\mathcal{C}$ d\'équation $'
             + CERCLE + '$.\n\n')

V335_HORIZONTALE = case(
    INTRO_335 + 'La droite d\'équation $y=' + ev('q+d') + '$ coupe $\\mathcal{C}$ en deux points.'
    ' Quelle est la plus grande de leurs abscisses ?\n\n$x=?$',
    V_335, ev('p+sqrt(25-d^2)'),
    ['On remplace $y$ par $' + ev('q+d') + '$ : $(x' + ev('-p;+') + ')^2+' + ev('d;()')
     + '^2=25$, soit $(x' + ev('-p;+') + ')^2=' + ev('25-d^2') + '$.',
     'Donc $x' + ev('-p;+') + '=' + ev('sqrt(25-d^2)') + '$ ou $x' + ev('-p;+') + '=-'
     + ev('sqrt(25-d^2)') + '$, soit $x=' + ev('p+sqrt(25-d^2)') + '$ ou $x='
     + ev('p-sqrt(25-d^2)') + '$.',
     'La plus grande abscisse est $' + col(ev('p+sqrt(25-d^2)')) + '$.'],
    C_335)
V335_VERTICALE = case(
    INTRO_335 + 'La droite d\'équation $x=' + ev('p+d') + '$ coupe $\\mathcal{C}$ en deux points.'
    ' Quelle est la plus petite de leurs ordonnées ?\n\n$y=?$',
    V_335, ev('q-sqrt(25-d^2)'),
    ['On remplace $x$ par $' + ev('p+d') + '$ : $' + ev('d;()') + '^2+(y' + ev('-q;+')
     + ')^2=25$, soit $(y' + ev('-q;+') + ')^2=' + ev('25-d^2') + '$.',
     'Donc $y=' + ev('q+sqrt(25-d^2)') + '$ ou $y=' + ev('q-sqrt(25-d^2)') + '$.',
     'La plus petite ordonnée est $' + col(ev('q-sqrt(25-d^2)')) + '$.'],
    ['p != 0', 'q != 0', 'p + d != 0'])
V_335_NB = [var('p', '-5..5'), var('q', '-5..5'), var('r', '2..5'), var('t', '-7..7')]
V335_NOMBRE = case(
    'Dans un repère orthonormé, on considère le cercle $\\mathcal{C}$ d\'équation $(x'
    + ev('-p;+') + ')^2+(y' + ev('-q;+') + ')^2=' + ev('r^2') + '$.\n\n'
    'Combien la droite d\'équation $y=' + ev('q+t') + '$ a-t-elle de points communs avec'
    ' $\\mathcal{C}$ ?\n\n$?$',
    V_335_NB, ev('1+sign(r^2-t^2)'),
    ['On remplace $y$ par $' + ev('q+t') + '$ : $(x' + ev('-p;+') + ')^2+' + ev('t;()')
     + '^2=' + ev('r^2') + '$, soit $(x' + ev('-p;+') + ')^2=' + ev('r^2-t^2') + '$.',
     'Un carré est positif ou nul : deux solutions si le second membre est strictement positif,'
     ' une s\'il est nul, aucune s\'il est négatif.',
     'Nombre de points communs de la droite et de $\\mathcal{C}$ : $'
     + col(ev('1+sign(r^2-t^2)')) + '$.'],
    ['p != 0', 'q != 0', 'q + t != 0', 'abs(t) >= r - 1', 'abs(t) <= r + 1'])

VARS_335 = {'p': 2, 'q': -1, 'd': 3}  # (x − 2)² + (y + 1)² = 25, y = 2 : x = −2 ou 6
VARS_335_V = {'p': 2, 'q': -1, 'd': -4}  # x = −2 : (y + 1)² = 9, y = 2 ou −4
MODELES.append(modele(
    '05-cercle-et-droite-parallele-a-un-axe',
    'Intersection d\'un cercle et d\'une droite parallèle à un axe',
    'Cercle (x − p)² + (y − q)² = r² : plus grande abscisse des points communs avec y = k, plus'
    ' petite ordonnée avec x = k, nombre de points communs',
    1,
    [V335_HORIZONTALE, V335_VERTICALE, V335_NOMBRE],
    [spec('6', 0, '6', 'correct', VARS_335),
     spec('Erreur : −2 (la plus petite)', 0, '-2', 'incorrect', VARS_335),
     spec('Erreur : 4 (sans le centre)', 0, '4', 'incorrect', VARS_335),
     spec('−4', 1, '-4', 'correct', VARS_335_V),
     spec('Erreur : 2 (la plus grande)', 1, '2', 'incorrect', VARS_335_V),
     spec('Erreur : −3 (sans le centre)', 1, '-3', 'incorrect', VARS_335_V),
     spec('2 points', 2, '2', 'correct', {'p': 1, 'q': 1, 'r': 3, 't': 2}),
     spec('1 point (tangente)', 2, '1', 'correct', {'p': 1, 'q': 1, 'r': 3, 't': -3}),
     spec('0 point', 2, '0', 'correct', {'p': 1, 'q': 1, 'r': 3, 't': 4}),
     spec('Erreur : 2 au lieu de 0', 2, '2', 'incorrect', {'p': 1, 'q': 1, 'r': 3, 't': 4})]))

# --- 6. 1SPE-420 : parabole et droite parallèle à un axe -----------------------------------------

V_420_V = [X, var('a', '-2|-1|1|2'), var('b', '-5..5'), var('c', '-6..6'), var('k', '-3..3')]
V420_VERTICALE = case(
    'Dans un repère, on considère la parabole $\\mathcal{P}$ d\'équation $y=' + ev('a*x^2+b*x+c')
    + '$.\n\nLa droite d\'équation $x=' + ev('k') + '$ coupe $\\mathcal{P}$ en un seul point.'
    ' Quelle est son ordonnée ?\n\n$y=?$',
    V_420_V, ev('a*k^2+b*k+c'),
    ['Le point commun a pour abscisse $' + ev('k') + '$ : son ordonnée est l\'image de $' + ev('k')
     + '$.',
     '$y=' + ev('a') + '\\times' + ev('k;()') + '^2' + ev('b;+') + '\\times' + ev('k;()')
     + ev('c;+') + '=' + col(ev('a*k^2+b*k+c')) + '$.'],
    ['b != 0', 'c != 0', 'k != 0'])
V_420_H = [X, var('a', '-2|-1|1|2'), var('u', '-4..4'), var('v', '-4..4'), var('k', '-5..5')]
V420_HORIZONTALE = case(
    'Dans un repère, on considère la parabole $\\mathcal{P}$ d\'équation $y='
    + ev('a*x^2-a*(u+v)*x+a*u*v+k') + '$.\n\nLa droite d\'équation $y=' + ev('k') + '$ coupe'
    ' $\\mathcal{P}$ en deux points. Quelle est la plus grande de leurs abscisses ?\n\n$x=?$',
    V_420_H, ev('v'),
    ['Les points communs vérifient $' + ev('a*x^2-a*(u+v)*x+a*u*v+k') + '=' + ev('k') + '$, soit $'
     + ev('a*x^2-a*(u+v)*x+a*u*v') + '=0$.',
     'Ce trinôme a pour racines $' + ev('u') + '$ et $' + ev('v') + '$ (discriminant, ou'
     ' factorisation $' + ev('a*(x-u)*(x-v)') + '$).',
     'La plus grande abscisse est $' + col(ev('v')) + '$.'],
    ['u < v', 'u != 0', 'v != 0', 'k != 0', 'u*v + k != 0', 'u + v != 0'])
V_420_N = [X, var('a', '-2|-1|1|2'), var('s', '-4..4'), var('m', '-5..5'), var('k', '-5..5')]
V420_NOMBRE = case(
    'Dans un repère, on considère la parabole $\\mathcal{P}$ d\'équation $y='
    + ev('a*x^2-2*a*s*x+a*s^2+m') + '$.\n\nCombien la droite d\'équation $y=' + ev('k') + '$'
    ' a-t-elle de points communs avec $\\mathcal{P}$ ?\n\n$?$',
    V_420_N, ev('1+sign(a*(k-m))'),
    ['$y=' + ev('a*x^2-2*a*s*x+a*s^2+m') + '=' + ev('a*(x-s)^2') + ev('m;+') + '$ (forme canonique).',
     'Les points communs vérifient $' + ev('a*(x-s)^2') + ev('m;+') + '='
     + ev('k') + '$, soit $(x' + ev('-s;+') + ')^2=' + ev('(k-m)/a') + '$.',
     'Deux solutions si ce nombre est strictement positif, une s\'il est nul, aucune sinon :'
     ' nombre de points communs, $' + col(ev('1+sign(a*(k-m))')) + '$.'],
    ['s != 0', 'm != 0', 'a*s^2 + m != 0', 'abs(k - m) <= 3'])

VARS_420_H = {'a': 1, 'u': -1, 'v': 3, 'k': 2}  # y = x² − 2x − 1, y = 2 : x = −1 ou 3
MODELES.append(modele(
    '06-parabole-et-droite-parallele-a-un-axe',
    'Intersection d\'une parabole et d\'une droite parallèle à un axe',
    'Parabole y = ax² + bx + c : ordonnée du point commun avec x = k, plus grande abscisse'
    ' des points communs avec y = k, nombre de points communs avec y = k',
    1,
    [V420_VERTICALE, V420_HORIZONTALE, V420_NOMBRE],
    [spec('9', 0, '9', 'correct', {'a': 1, 'b': 2, 'c': 1, 'k': 2}),
     spec('Erreur : 1 (c)', 0, '1', 'incorrect', {'a': 1, 'b': 2, 'c': 1, 'k': 2}),
     spec('3', 1, '3', 'correct', VARS_420_H),
     spec('Erreur : −1 (la plus petite)', 1, '-1', 'incorrect', VARS_420_H),
     spec('Erreur : 2 (la droite)', 1, '2', 'incorrect', VARS_420_H),
     spec('2 points', 2, '2', 'correct', {'a': 1, 's': 1, 'm': -2, 'k': 0}),
     spec('1 point (sommet)', 2, '1', 'correct', {'a': 1, 's': 1, 'm': -2, 'k': -2}),
     spec('0 point', 2, '0', 'correct', {'a': -1, 's': 1, 'm': -2, 'k': 0}),
     spec('Erreur : 2 au lieu de 0 (a < 0)', 2, '2', 'incorrect',
          {'a': -1, 's': 1, 'm': -2, 'k': 0})]))


# --- Specs « ranger » : positions affichées calculées par le générateur (graine 0) -------------

def positions(chemin, vi):
    out = subprocess.run(['pnpm', 'exec', 'tsx', 'docs/wip/questions/positions-ranger.ts', chemin, str(vi)],
                         check=True, capture_output=True, text=True).stdout.strip().splitlines()
    return json.loads(out[-1])


os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    chemin = os.path.join(DOSSIER, nom + '.json')
    a_ranger = [s for s in m['testSpecs'] if isinstance(s, str)]
    m['testSpecs'] = [s for s in m['testSpecs'] if not isinstance(s, str)]
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
    for marque in a_ranger:
        vi = int(marque.split(':')[1])
        juste = positions(chemin, vi)
        faux = juste[:]
        faux[1], faux[2] = faux[2], faux[1]
        m['testSpecs'] += [spec('Étapes dans l’ordre', vi, juste, 'correct'),
                           spec('Erreur : deuxième et troisième étapes échangées', vi, faux,
                                'incorrect')]
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
