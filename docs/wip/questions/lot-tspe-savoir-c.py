"""Écrit les 8 modèles du sous-lot 8c « à savoir » (dénombrement, loi binomiale, sommes de variables
aléatoires, espace) de la terminale spécialité dans scripts/questions/tspe-8c-savoir/.

Phase 0 validée par David le 2026-11-02 (« je valide » sur les recos, D-L8 du journal
« docs/archive/wip/questions-tspe-restes-progress.md »), un point par modèle :

| # | Point    | Fait                                                  | Domaine › À savoir, niveau                    |
| 1 | TSPE-541 | un ensemble à n éléments a 2ⁿ parties                 | Dénombrement, 1                               |
| 2 | TSPE-614 | P(X = k) = C(n,k) pᵏ(1−p)ⁿ⁻ᵏ                          | Loi binomiale, 1                              |
| 3 | TSPE-519 | linéarité de l'espérance                              | Sommes de variables aléatoires, 1             |
| 4 | TSPE-520 | V(X+Y) = V(X)+V(Y) sous indépendance                  | Sommes de variables aléatoires, 2             |
| 5 | TSPE-343 | u ⊥ v ⟺ u·v = 0 (espace)                              | Orthogonalité et distances dans l'espace, 1   |
| 6 | TSPE-351 | plans perpendiculaires ⟺ vecteurs normaux orthogonaux | Orthogonalité et distances dans l'espace, 2   |
| 7 | TSPE-329 | droite = point + vecteur directeur                    | Vecteurs, droites et plans de l'espace, 1     |
| 8 | TSPE-331 | plan = point + deux vecteurs non colinéaires          | Vecteurs, droites et plans de l'espace, 2     |

Sous-domaine « À savoir » neuf dans chaque domaine (relevé prod du 2026-11-02 : aucun dans ces
domaines). Thèmes et domaines repris des voisins en prod, sur le nœud de chaque point : « Probabilités »
(Dénombrement, Loi binomiale, Sommes de variables aléatoires), « Géométrie » (Orthogonalité et
distances dans l'espace ; Vecteurs, droites et plans de l'espace). La phase 0 disait « domaine de
l'espace, 1-4 » : en prod, les voisins de 343/351 et de 329/331 sont dans deux domaines distincts,
d'où deux « À savoir » numérotés 1-2. Même forme que 8a et 8b : case choix à 4 propositions (la
première est la bonne, l'affichage les mélange), erreurs typiques en distracteurs. Aucune variable.

    python3 docs/wip/questions/lot-tspe-savoir-c.py scripts/questions/tspe-8c-savoir
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, answer, status):
    return {'description': desc, 'variationIndex': vi, 'variables': {},
            'answers': [answer], 'expected': {'status': status}}


def modele(nom, title, description, theme, domain, level, variations, libelles):
    assert len(libelles) == len(variations)
    specs = []
    for vi, (juste, erreurs) in enumerate(libelles):
        assert len(erreurs) == 3
        specs.append(spec(juste, vi, '0', 'correct'))
        for k, erreur in enumerate(erreurs, start=1):
            specs.append(spec('Erreur : ' + erreur, vi, str(k), 'incorrect'))
    return nom, {'title': title, 'description': description, 'grades': ['T_SPE'],
                 'theme': theme, 'domain': domain, 'subdomain': 'À savoir', 'level': level,
                 'delay': 30, 'status': 'draft', 'shared': {},
                 'variations': variations, 'testSpecs': specs}


def col(x):
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


def choix(lignes):
    return '\n\n```choix\n' + ''.join('- ' + l + '\n' for l in lignes) + '```'


def qcm(statement, bonne, autres, steps):
    """Variation sans variable : la première proposition est la bonne (index 0)."""
    assert len(autres) == 3
    return {'statement': statement + choix([bonne] + autres), 'variables': [],
            'blanks': [{'expectedAnswer': '0'}], 'correction': {'steps': steps}}


def vec3(nom, x, y, z):
    return '\\vec{' + nom + '}\\begin{pmatrix}' + x + '\\\\' + y + '\\\\' + z + '\\end{pmatrix}'


MODELES = []
PROBA = 'Probabilités'
GEO = 'Géométrie'
U, V, N, N2 = '\\vec{u}', '\\vec{v}', '\\vec{n}', '\\vec{n}\\,\''
AM = '\\overrightarrow{AM}'

# --- 1. TSPE-541 : 2ⁿ parties ---------------------------------------------------------------------

V541_FORMULE = qcm(
    'Soit $n$ un entier naturel. Le nombre de parties d\'un ensemble à $n$ éléments est :',
    '$2^n$',
    ['$n^2$', '$n!$', '$2n$'],
    ['À connaître : un ensemble à $n$ éléments possède $' + col('2^n') + '$ parties (l\'ensemble'
     ' vide et l\'ensemble lui-même compris).',
     'Pour $n=3$ : $\\{a\\,;b\\,;c\\}$ a $8=2^3$ parties ($\\varnothing$, trois singletons, trois'
     ' paires et l\'ensemble entier), et non $3^2=9$ ni $3!\\,=6$.'])
V541_EXEMPLE = qcm(
    'Le nombre de parties d\'un ensemble à $5$ éléments est :',
    '$32$',
    ['$31$', '$25$', '$10$'],
    ['À connaître : un ensemble à $n$ éléments possède $2^n$ parties.',
     'Avec $n=5$ : $2^5=' + col('32') + '$. Ce compte inclut l\'ensemble vide : $31$ l\'oublie.'])
V541_LIEN = qcm(
    'On compte les parties d\'un ensemble $E$ à $n$ éléments en associant à chaque partie $A$ un'
    ' $n$-uplet de $\\{0\\,;1\\}$. Ce $n$-uplet est obtenu en écrivant, pour chaque élément de $E$ :',
    '$1$ s\'il appartient à $A$, $0$ sinon',
    ['le nombre d\'éléments de $A$', '$1$ s\'il est le plus petit élément de $A$, $0$ sinon',
     'sa position dans $E$'],
    ['À connaître : une partie $A$ de $E$ est déterminée par la réponse « oui » ($1$) ou « non »'
     ' ($0$) à la question « l\'élément est-il dans $A$ ? », posée pour chacun des $n$ éléments.',
     'Il y a donc autant de parties que de $n$-uplets de $\\{0\\,;1\\}$, soit $'
     + col('2^n') + '$ (principe multiplicatif : $2$ choix pour chaque élément).'])

MODELES.append(modele(
    '01-nombre-de-parties', 'Nombre de parties d\'un ensemble',
    'À savoir : un ensemble à n éléments a 2ⁿ parties, lien avec les n-uplets de {0 ; 1} ;'
    ' formule, exemple n = 5, codage ; distracteurs : n², n!, 2n, oubli de l\'ensemble vide',
    PROBA, 'Dénombrement', 1,
    [V541_FORMULE, V541_EXEMPLE, V541_LIEN],
    [('2ⁿ', ['n²', 'n!', '2n']),
     ('32', ['31 (oubli de ∅)', '25 = 5²', '10 = 2 × 5']),
     ('1 si dans A, 0 sinon', ['cardinal de A', 'plus petit élément', 'position dans E'])]))

# --- 2. TSPE-614 : loi binomiale ------------------------------------------------------------------

BIN = '\\mathcal{B}(n\\,;p)'

V614_FORMULE = qcm(
    'Soit $X$ une variable aléatoire qui suit la loi binomiale $' + BIN + '$. Pour tout entier $k$'
    ' compris entre $0$ et $n$, $P(X=k)$ est égal à :',
    '$\\dbinom{n}{k}p^k(1-p)^{n-k}$',
    ['$p^k(1-p)^{n-k}$', '$\\dbinom{n}{k}p^{n-k}(1-p)^k$', '$\\dbinom{n}{k}p^k$'],
    ['À connaître : si $X$ suit la loi $' + BIN + '$, alors $P(X=k)=' + col(
        '\\dbinom{n}{k}p^k(1-p)^{n-k}') + '$ pour $0\\leqslant k\\leqslant n$.',
     '$p^k(1-p)^{n-k}$ est la probabilité d\'UN chemin à $k$ succès ; $\\dbinom{n}{k}$ compte ces'
     ' chemins. L\'exposant de $p$ est le nombre de succès $k$.'])
V614_EXEMPLE = qcm(
    'Soit $X$ une variable aléatoire qui suit la loi binomiale $\\mathcal{B}(10\\,;0{,}3)$.'
    ' $P(X=4)$ est égal à :',
    '$\\dbinom{10}{4}\\times0{,}3^4\\times0{,}7^6$',
    ['$0{,}3^4\\times0{,}7^6$', '$\\dbinom{10}{4}\\times0{,}3^6\\times0{,}7^4$',
     '$\\dbinom{10}{4}\\times0{,}3^4\\times0{,}7^4$'],
    ['À connaître : $P(X=k)=\\dbinom{n}{k}p^k(1-p)^{n-k}$.',
     'Ici $n=10$, $p=0{,}3$, $1-p=0{,}7$ et $k=4$ : $P(X=4)=' + col(
         '\\dbinom{10}{4}\\times0{,}3^4\\times0{,}7^6') + '$ (l\'exposant de $0{,}7$ est'
     ' $10-4=6$, le nombre d\'échecs).'])

MODELES.append(modele(
    '02-loi-binomiale-expression', 'Expression de la loi binomiale',
    'À savoir : si X suit B(n ; p), P(X = k) = C(n, k) pᵏ(1 − p)ⁿ⁻ᵏ ; formule, exemple'
    ' B(10 ; 0,3) ; distracteurs : coefficient oublié, exposants échangés, exposant des échecs',
    PROBA, 'Loi binomiale', 1,
    [V614_FORMULE, V614_EXEMPLE],
    [('C(n, k) pᵏ(1 − p)ⁿ⁻ᵏ', ['sans C(n, k)', 'exposants échangés', 'sans (1 − p)ⁿ⁻ᵏ']),
     ('C(10, 4) × 0,3⁴ × 0,7⁶', ['sans C(10, 4)', 'exposants échangés', '0,7⁴'])]))

# --- 3. TSPE-519 : linéarité de l'espérance -------------------------------------------------------

V519_SOMME = qcm(
    'Soit $X$ et $Y$ deux variables aléatoires définies sur le même univers. On a toujours :',
    '$E(X+Y)=E(X)+E(Y)$',
    ['$V(X+Y)=V(X)+V(Y)$', '$E(X+Y)=E(X)\\times E(Y)$', '$E(XY)=E(X)\\times E(Y)$'],
    ['À connaître : l\'espérance est linéaire : $' + col('E(X+Y)=E(X)+E(Y)') + '$, sans aucune'
     ' hypothèse sur $X$ et $Y$.',
     'L\'égalité $V(X+Y)=V(X)+V(Y)$, elle, demande que $X$ et $Y$ soient indépendantes.'])
V519_PRODUIT = qcm(
    'Soit $X$ une variable aléatoire et $a$ un réel. $E(aX)$ est égal à :',
    '$aE(X)$',
    ['$a^2E(X)$', '$E(X)$', '$a+E(X)$'],
    ['À connaître : $' + col('E(aX)=aE(X)') + '$ (et plus généralement $E(aX+b)=aE(X)+b$).',
     'C\'est la VARIANCE qui fait apparaître $a^2$ : $V(aX)=a^2V(X)$.'])
V519_EXEMPLE = qcm(
    'Soit $X$ et $Y$ deux variables aléatoires définies sur le même univers, avec $E(X)=3$ et'
    ' $E(Y)=5$. $E(2X+Y)$ est égal à :',
    '$11$',
    ['$8$', '$16$', '$17$'],
    ['À connaître : $E(X+Y)=E(X)+E(Y)$ et $E(aX)=aE(X)$.',
     'Donc $E(2X+Y)=2E(X)+E(Y)=2\\times3+5=' + col('11') + '$. ($16$ multiplie aussi $E(Y)$'
     ' par $2$ ; $17$ vient de $2^2\\times3+5$.)'])

MODELES.append(modele(
    '03-linearite-esperance', 'Linéarité de l\'espérance',
    'À savoir : E(X + Y) = E(X) + E(Y) et E(aX) = aE(X), sans hypothèse ; somme, produit par un'
    ' réel, exemple E(2X + Y) ; distracteurs : variance, produit, a²',
    PROBA, 'Sommes de variables aléatoires', 1,
    [V519_SOMME, V519_PRODUIT, V519_EXEMPLE],
    [('E(X + Y) = E(X) + E(Y)', ['V(X + Y) (indépendance)', 'produit', 'E(XY)']),
     ('aE(X)', ['a²E(X)', 'E(X)', 'a + E(X)']),
     ('11', ['8 = 3 + 5', '16 = 2 × 8', '17 = 4 × 3 + 5'])]))

# --- 4. TSPE-520 : variance d'une somme -----------------------------------------------------------

V520_HYPOTHESE = qcm(
    'Soit $X$ et $Y$ deux variables aléatoires définies sur le même univers. L\'égalité'
    ' $V(X+Y)=V(X)+V(Y)$ est vraie :',
    'lorsque $X$ et $Y$ sont indépendantes',
    ['pour toutes variables $X$ et $Y$', 'seulement si $X$ et $Y$ ont la même loi',
     'jamais : c\'est $\\sigma(X+Y)=\\sigma(X)+\\sigma(Y)$ qui est vraie'],
    ['À connaître : si $X$ et $Y$ sont ' + col('\\text{indépendantes}').join(['$', '$'])
     + ' (par exemple liées à des épreuves indépendantes), alors $V(X+Y)=V(X)+V(Y)$.',
     'Sans indépendance, l\'égalité peut être fausse : avec $Y=X$, $V(2X)=4V(X)$ et non $2V(X)$.'
     ' Ce sont les variances qui s\'ajoutent, pas les écarts-types.'])
V520_EXEMPLE = qcm(
    'Soit $X$ et $Y$ deux variables aléatoires indépendantes, avec $V(X)=4$ et $V(Y)=9$.'
    ' $V(X+Y)$ est égal à :',
    '$13$',
    ['$25$', '$5$', '$36$'],
    ['À connaître : si $X$ et $Y$ sont indépendantes, $V(X+Y)=V(X)+V(Y)$.',
     'Donc $V(X+Y)=4+9=' + col('13') + '$. ($25=(2+3)^2$ ajoute les écarts-types avant d\'élever'
     ' au carré ; $5=2+3$ est la somme des écarts-types.)'])
V520_ECART_TYPE = qcm(
    'Soit $X$ et $Y$ deux variables aléatoires indépendantes, avec $V(X)=9$ et $V(Y)=16$.'
    ' L\'écart-type $\\sigma(X+Y)$ est égal à :',
    '$5$',
    ['$7$', '$25$', '$\\sqrt{7}$'],
    ['À connaître : si $X$ et $Y$ sont indépendantes, $V(X+Y)=V(X)+V(Y)$ ; ce sont les'
     ' VARIANCES qui s\'ajoutent.',
     'Ici $V(X+Y)=9+16=25$, donc $\\sigma(X+Y)=\\sqrt{25}=' + col('5') + '$, et non'
     ' $\\sigma(X)+\\sigma(Y)=3+4=7$.'])

MODELES.append(modele(
    '04-variance-somme-independantes', 'Variance d\'une somme de variables indépendantes',
    'À savoir : V(X + Y) = V(X) + V(Y) si X et Y sont indépendantes ; hypothèse, exemple, écart-type'
    ' ; distracteurs : sans hypothèse, somme des écarts-types',
    PROBA, 'Sommes de variables aléatoires', 2,
    [V520_HYPOTHESE, V520_EXEMPLE, V520_ECART_TYPE],
    [('indépendantes', ['toujours', 'même loi', 'écarts-types']),
     ('13', ['25 = (2 + 3)²', '5 = 2 + 3', '36 = 4 × 9']),
     ('5', ['7 = 3 + 4', '25 (variance)', '√7'])]))

# --- 5. TSPE-343 : vecteurs orthogonaux ------------------------------------------------------------

V343_CARAC = qcm(
    'Deux vecteurs $' + U + '$ et $' + V + '$ de l\'espace sont orthogonaux si et seulement si :',
    '$' + U + '\\cdot' + V + '=0$',
    ['$' + U + '\\cdot' + V + '=1$', '$' + U + '$ et $' + V + '$ sont colinéaires',
     '$\\|' + U + '+' + V + '\\|=\\|' + U + '\\|+\\|' + V + '\\|$'],
    ['À connaître : dans l\'espace comme dans le plan, $' + U + '$ et $' + V + '$ sont orthogonaux'
     ' si et seulement si $' + col(U + '\\cdot' + V + '=0') + '$.',
     'Le vecteur nul est orthogonal à tout vecteur. L\'égalité'
     ' $\\|' + U + '+' + V + '\\|=\\|' + U + '\\|+\\|' + V + '\\|$ caractérise des vecteurs'
     ' colinéaires de même sens ; c\'est $\\|' + U + '+' + V + '\\|^2=\\|' + U + '\\|^2+\\|' + V
     + '\\|^2$ (Pythagore) qui équivaut à l\'orthogonalité.'])
V343_EXEMPLE = qcm(
    'Dans un repère orthonormé de l\'espace, on considère les vecteurs $' + vec3('u', '1', '2', '-1')
    + '$ et $' + vec3('v', '3', '-1', '1') + '$. Ces vecteurs :',
    'sont orthogonaux, car $1\\times3+2\\times(-1)+(-1)\\times1=0$',
    ['ne sont pas orthogonaux, car leurs coordonnées ne sont pas proportionnelles',
     'ne sont pas orthogonaux, car ils n\'ont pas la même norme',
     'sont colinéaires'],
    ['À connaître : $' + U + '$ et $' + V + '$ sont orthogonaux si et seulement si $' + U + '\\cdot'
     + V + '=0$ ; dans un repère orthonormé, $' + U + '\\cdot' + V + '=xx\'+yy\'+zz\'$.',
     'Ici $' + U + '\\cdot' + V + '=3-2-1=0$ : les vecteurs sont ' + col(
         '\\text{orthogonaux}').join(['$', '$']) + '. La proportionnalité des coordonnées teste'
     ' la colinéarité, pas l\'orthogonalité.'])

MODELES.append(modele(
    '05-vecteurs-orthogonaux-espace', 'Vecteurs orthogonaux dans l\'espace',
    'À savoir : u et v orthogonaux ⟺ u · v = 0 ; caractérisation, exemple en repère orthonormé ;'
    ' distracteurs : u · v = 1, colinéarité, normes',
    GEO, 'Orthogonalité et distances dans l\'espace', 1,
    [V343_CARAC, V343_EXEMPLE],
    [('u · v = 0', ['u · v = 1', 'colinéaires', 'normes additives']),
     ('orthogonaux, produit scalaire nul', ['proportionnalité', 'même norme', 'colinéaires'])]))

# --- 6. TSPE-351 : plans perpendiculaires ----------------------------------------------------------

V351_CARAC = qcm(
    'Soit $\\mathcal{P}$ et $\\mathcal{P}\'$ deux plans de vecteurs normaux respectifs $' + N
    + '$ et $' + N2 + '$. Les plans $\\mathcal{P}$ et $\\mathcal{P}\'$ sont perpendiculaires si et'
    ' seulement si :',
    '$' + N + '\\cdot' + N2 + '=0$',
    ['$' + N + '$ et $' + N2 + '$ sont colinéaires', '$' + N + '\\cdot' + N2 + '=1$',
     '$' + N + '=' + N2 + '$'],
    ['À connaître : deux plans sont perpendiculaires si et seulement si leurs vecteurs normaux sont'
     ' orthogonaux, c\'est-à-dire $' + col(N + '\\cdot' + N2 + '=0') + '$.',
     'Des vecteurs normaux COLINÉAIRES caractérisent au contraire des plans parallèles.'])
V351_EXEMPLE = qcm(
    'Dans un repère orthonormé de l\'espace, le plan $\\mathcal{P}$ a pour vecteur normal $'
    + vec3('n', '2', '1', '-1') + '$ et le plan $\\mathcal{P}\'$ a pour vecteur normal'
    ' $\\vec{n}\\,\'\\begin{pmatrix}1\\\\-1\\\\1\\end{pmatrix}$. Les plans $\\mathcal{P}$ et'
    ' $\\mathcal{P}\'$ sont :',
    'perpendiculaires',
    ['parallèles', 'sécants, mais pas perpendiculaires', 'confondus'],
    ['À connaître : deux plans sont perpendiculaires si et seulement si leurs vecteurs normaux sont'
     ' orthogonaux.',
     'Ici $' + N + '\\cdot' + N2 + '=2\\times1+1\\times(-1)+(-1)\\times1=0$ : les plans sont '
     + col('\\text{perpendiculaires}').join(['$', '$']) + '. Parallèles ou confondus, ils'
     ' auraient des vecteurs normaux colinéaires, ce qui n\'est pas le cas.'])

MODELES.append(modele(
    '06-plans-perpendiculaires', 'Plans perpendiculaires et vecteurs normaux',
    'À savoir : deux plans sont perpendiculaires ⟺ leurs vecteurs normaux sont orthogonaux ;'
    ' caractérisation, exemple en repère orthonormé ; distracteurs : colinéarité (plans'
    ' parallèles), produit scalaire égal à 1',
    GEO, 'Orthogonalité et distances dans l\'espace', 2,
    [V351_CARAC, V351_EXEMPLE],
    [('n · n′ = 0', ['colinéaires (parallèles)', 'n · n′ = 1', 'n = n′']),
     ('perpendiculaires', ['parallèles', 'sécants non perpendiculaires', 'confondus'])]))

# --- 7. TSPE-329 : droite = point + vecteur directeur ----------------------------------------------

V329_CARAC = qcm(
    'Soit $A$ un point de l\'espace et $' + U + '$ un vecteur non nul. La droite passant par $A$ et'
    ' de vecteur directeur $' + U + '$ est l\'ensemble des points $M$ tels que :',
    '$' + AM + '=t\\,' + U + '$ pour un réel $t$',
    ['$' + AM + '\\cdot' + U + '=0$', '$' + AM + '=' + U + '$',
     '$' + AM + '=t\\,' + U + '$ pour un réel $t\\geqslant0$'],
    ['À connaître : la droite passant par $A$ de vecteur directeur $' + U + '$ ($' + U
     + '\\neq\\vec{0}$) est l\'ensemble des points $M$ tels que $' + col(
         AM + '=t\\,' + U + ',\\ t\\in\\mathbb{R}') + '$ : $' + AM + '$ et $' + U + '$ sont'
     ' colinéaires.',
     'Avec $t\\geqslant0$ seulement, on n\'obtient qu\'une demi-droite ; $' + AM + '\\cdot' + U
     + '=0$ décrit le plan passant par $A$ de vecteur normal $' + U + '$.'])
V329_DONNEES = qcm(
    'Une droite de l\'espace est déterminée par :',
    'un point et un vecteur non nul',
    ['un point seul', 'un vecteur non nul seul', 'un point et deux vecteurs non colinéaires'],
    ['À connaître : une droite est déterminée par ' + col(
        '\\text{un point et un vecteur directeur non nul}').join(['$', '$']) + '.',
     'Un vecteur seul fixe une direction (une infinité de droites parallèles) ; un point et deux'
     ' vecteurs non colinéaires déterminent un PLAN.'])

MODELES.append(modele(
    '07-droite-point-vecteur-directeur', 'Droite : un point et un vecteur directeur',
    'À savoir : une droite est déterminée par un point A et un vecteur directeur u non nul,'
    ' M ∈ d ⟺ AM = t u ; caractérisation, données ; distracteurs : plan normal, demi-droite,'
    ' point ou vecteur seul',
    GEO, 'Vecteurs, droites et plans de l\'espace', 1,
    [V329_CARAC, V329_DONNEES],
    [('AM = t u, t réel', ['AM · u = 0 (plan)', 'AM = u', 't ⩾ 0 (demi-droite)']),
     ('point + vecteur non nul', ['point seul', 'vecteur seul', 'deux vecteurs (plan)'])]))

# --- 8. TSPE-331 : plan = point + deux vecteurs non colinéaires -----------------------------------

V331_CARAC = qcm(
    'Soit $A$ un point de l\'espace et $' + U + '$, $' + V + '$ deux vecteurs non colinéaires. Le'
    ' plan passant par $A$ et dirigé par $' + U + '$ et $' + V + '$ est l\'ensemble des points $M$'
    ' tels que :',
    '$' + AM + '=s\\,' + U + '+t\\,' + V + '$ pour des réels $s$ et $t$',
    ['$' + AM + '=t\\,' + U + '$ pour un réel $t$',
     '$' + AM + '\\cdot' + U + '=0$ et $' + AM + '\\cdot' + V + '=0$',
     '$' + AM + '=' + U + '+' + V + '$'],
    ['À connaître : le plan passant par $A$ dirigé par $' + U + '$ et $' + V + '$ (non colinéaires)'
     ' est l\'ensemble des points $M$ tels que $' + col(
         AM + '=s\\,' + U + '+t\\,' + V + ',\\ s,t\\in\\mathbb{R}') + '$.',
     '$' + AM + '=t\\,' + U + '$ décrit une droite ; les deux produits scalaires nuls décrivent la'
     ' droite passant par $A$ orthogonale à $' + U + '$ et à $' + V + '$.'])
V331_DONNEES = qcm(
    'Un plan de l\'espace est déterminé par un point et :',
    'deux vecteurs non colinéaires',
    ['un vecteur non nul', 'deux vecteurs colinéaires non nuls', 'deux vecteurs quelconques'],
    ['À connaître : un plan est déterminé par un point et ' + col(
        '\\text{deux vecteurs non colinéaires}').join(['$', '$']) + ' (un couple de vecteurs'
     ' directeurs).',
     'Avec un seul vecteur, ou deux vecteurs colinéaires, on ne décrit qu\'une droite.'])

MODELES.append(modele(
    '08-plan-point-deux-vecteurs', 'Plan : un point et deux vecteurs non colinéaires',
    'À savoir : un plan est déterminé par un point A et deux vecteurs u, v non colinéaires,'
    ' M ∈ P ⟺ AM = s u + t v ; caractérisation, données ; distracteurs : droite, droite'
    ' orthogonale, vecteurs colinéaires',
    GEO, 'Vecteurs, droites et plans de l\'espace', 2,
    [V331_CARAC, V331_DONNEES],
    [('AM = s u + t v', ['AM = t u (droite)', 'produits scalaires nuls', 'AM = u + v']),
     ('deux vecteurs non colinéaires', ['un vecteur', 'deux colinéaires', 'quelconques'])]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
