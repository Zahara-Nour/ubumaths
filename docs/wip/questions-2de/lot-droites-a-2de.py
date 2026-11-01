"""Écrit les 6 modèles du lot 5 A « Droites : pente et vecteur directeur » de la 2de
dans scripts/questions/2de-droites-a/.

Phase 0 validée par David le 2026-11-01 (§ 30 du journal `docs/wip/questions-2de-progress.md`).
Bornes : `bornes/lycee/2de.json` (2-313, 2-315, 2-442 : droite non parallèle à l'axe des ordonnées ;
2-311, 2-443, 2-444). Un point par modèle ; le nœud et le tag sont posés par la migration de
rangement, après le `--publier` de David.

Décisions et pièges :
- L5-a : un vecteur directeur n'est pas unique → case `vecteur` en mode `colineaire` (2-443, 2-444) ;
  2-311 en case choix à plusieurs réponses (vecteurs directeurs et leurres) ;
- L4-d repris : la case choix oui/non (pente de (AB) ?) est doublée de variations à calcul ;
- pentes lues sur un graphique : droite par deux points à coordonnées entières, (0 ; p) et (q ; p + n),
  marqués dans l'énoncé quand la pente est fractionnaire ;
- `cleanCoefficients` : 1x, −1y, +0 nettoyés dans les équations tirées ;
- les variables sont substituées telles quelles dans les `eval` : toujours `(a)`, `-(a)` ;
- variables `e` et `i` interdites.

    python3 docs/wip/questions-2de/lot-droites-a-2de.py scripts/questions/2de-droites-a
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(v) for k, v in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(nom, title, description, level, variations, specs, blank_defaults=None, delay=90):
    defaults = {'acceptDecimal': True}
    if blank_defaults:
        defaults.update(blank_defaults)
    m = {'title': title, 'description': description, 'grades': ['2'], 'theme': 'Géométrie',
         'domain': 'Droites du plan', 'subdomain': 'Pente et vecteur directeur', 'level': level,
         'delay': delay, 'status': 'draft',
         'shared': {'cleanCoefficients': True, 'blankDefaults': defaults},
         'variations': variations, 'testSpecs': specs}
    return nom, m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, blanks, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = blanks
    v['correction'] = {'steps': steps}
    return v


def case(attendu):
    return {'expectedAnswer': attendu}


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def colonne(x, y):
    return '\\begin{pmatrix}' + x + '\\\\' + y + '\\end{pmatrix}'


def point(nom, x, y):
    return nom + '(' + x + '\\,;\\,' + y + ')'


def choix(question, options, plusieurs=False):
    tete = 'plusieurs: oui' if plusieurs else 'melanger: non'
    return question + '\n\n```choix\n' + tete + '\n' + ''.join('- ' + o + '\n' for o in options) + '```'


def fraction(n, q):
    """n/q écrit avec le signe devant la fraction (n entier relatif, q > 0)."""
    return '{{if:' + n + '<0|-}}\\dfrac{ {{eval:abs(' + n + ')}} }{ {{' + q + '}} }'


def courbe(expression, points=None, description='Droite d tracée dans un repère.'):
    lignes = ['```courbe', 'x: -6 ; 6', 'y: -6 ; 6', 'grille: 1 ; 1',
              'f(x) = ' + expression + '   bleu   nom=d']
    if points:
        lignes.append('points: ' + points)
    lignes += ['taille: moyenne', 'description: ' + description, '```']
    return '\n'.join(lignes)


MODELES = []
REPERE = 'Dans un repère du plan'
PENTE_FORMULE = ('La pente de la droite $(AB)$, quand $x_A\\neq x_B$, est'
                 ' $m=\\dfrac{y_B-y_A}{x_B-x_A}$ : déplacement vertical sur déplacement horizontal.')

# --- 1. 2-313 : pente par deux points --------------------------------------------------------

DEUX_POINTS = (REPERE + ', on considère les points $' + point('A', '{{ax}}', '{{ay}}') + '$ et $'
               + point('B', '{{eval:(ax)+(dx)}}', '{{eval:(ay)+(dy)}}') + '$.\n\n')


def calcul_pente(resultat):
    return ('$$m=\\dfrac{ {{eval:(ay)+(dy)}}-{{ay;()}} }{ {{eval:(ax)+(dx)}}-{{ax;()}} }'
            '=\\dfrac{ {{dy}} }{ {{dx}} }=' + col(resultat) + '$$')


PENTE_ENTIERE = variation(
    DEUX_POINTS + 'Détermine la pente $m$ de la droite $(AB)$.\n\n$m=?$',
    [var('ax', '-5..5'), var('ay', '-5..5'), var('dx', '1..3;±'), var('k', '1..3;±'),
     var('dy', 'eval:(k)*(dx)')],
    [case('{{k}}')],
    [PENTE_FORMULE, calcul_pente('{{k}}')])

PENTE_FRACTION = variation(
    DEUX_POINTS + 'Détermine la pente $m$ de la droite $(AB)$.\n\n$m=?$',
    [var('ax', '-5..5'), var('ay', '-5..5'), var('dx', '2..5;±'), var('dy', '1..7;±')],
    [case('{{eval:(dy)/(dx)}}')],
    [PENTE_FORMULE, calcul_pente('{{eval:(dy)/(dx)}}')],
    ['mod(dy, dx) != 0'])

# w = 0 : x_B = x_A (pas de pente, « Non ») ; w = 1 : pente (« Oui »)
A_UNE_PENTE = variation(
    REPERE + ', on considère les points $' + point('A', '{{ax}}', '{{ay}}') + '$ et $'
    + point('B', '{{eval:(ax)+(w)*(dx)}}', '{{eval:(ay)+(dy)}}') + '$.\n\n'
    + choix('La droite $(AB)$ a-t-elle une pente ?', ['Oui', 'Non']),
    [var('ax', '-5..5'), var('ay', '-5..5'), var('dx', '1..4;±'), var('dy', '1..6;±'), var('w', '0|1')],
    [case('{{eval:1-(w)}}')],
    ['{{if:w==0|$A$ et $B$ ont la même abscisse ${{ax}}$ : la droite $(AB)$ est parallèle à l\'axe des'
     ' ordonnées, d\'équation $x={{ax}}$. **Elle n\'a pas de pente** (on diviserait par'
     ' $x_B-x_A=0$).|$x_A\\neq x_B$ : la droite $(AB)$ n\'est pas parallèle à l\'axe des ordonnées,'
     ' **elle a une pente**, $m={{eval:(dy)/(dx)}}$.}}'])

SP_PE = {'ax': 1, 'ay': 2, 'dx': 2, 'k': 3, 'dy': 6}
SP_PF = {'ax': -1, 'ay': 3, 'dx': 4, 'dy': -6}
SP_PV = {'ax': 2, 'ay': 1, 'dx': 3, 'dy': 4, 'w': 0}
SP_PO = {'ax': 2, 'ay': 1, 'dx': 3, 'dy': 4, 'w': 1}
MODELES.append(modele(
    '01-pente-par-deux-points', 'Pente d\'une droite passant par deux points',
    'm = (y_B − y_A)/(x_B − x_A) : pente entière, puis fractionnaire ; (AB) a-t-elle une pente ? (pas si'
    ' x_A = x_B) (pièges : Δx/Δy, différences dans des ordres différents)', 1,
    [PENTE_ENTIERE, PENTE_FRACTION, A_UNE_PENTE],
    [spec('A(1 ; 2), B(3 ; 8) → 3', 0, SP_PE, '3', 'correct'),
     spec('Erreur : Δx/Δy (1/3)', 0, SP_PE, '\\frac{1}{3}', 'incorrect'),
     spec('Erreur : signe, différences croisées (−3)', 0, SP_PE, '-3', 'incorrect'),
     spec('A(−1 ; 3), B(3 ; −3) → −3/2', 1, SP_PF, '-\\frac{3}{2}', 'correct'),
     spec('En décimal −1,5', 1, SP_PF, '-1.5', 'correct'),
     spec('Fraction non simplifiée −6/4', 1, SP_PF, '-\\frac{6}{4}', 'unoptimal_form', ['reducedFractions']),
     spec('Erreur : Δx/Δy (−2/3)', 1, SP_PF, '-\\frac{2}{3}', 'incorrect'),
     spec('x_A = x_B : « Non »', 2, SP_PV, '1', 'correct'),
     spec('x_A = x_B : « Oui » faux', 2, SP_PV, '0', 'incorrect'),
     spec('x_A ≠ x_B : « Oui »', 2, SP_PO, '0', 'correct')]))

# --- 2. 2-315 : pente lue sur un graphique ---------------------------------------------------

LECTURE_PENTE = ('La pente se lit entre deux points de la droite : $m=\\dfrac{\\text{déplacement vertical}}'
                 '{\\text{déplacement horizontal}}$.')

PENTE_LUE_ENTIERE = variation(
    'La droite $d$ est tracée dans le repère ci-dessous.\n\n' + courbe('({{m}})*x+({{p}})')
    + '\n\nQuelle est la pente $m$ de la droite $d$ ?\n\n$m=?$',
    [var('m', '1..3;±'), var('p', '-3..3')],
    [case('{{m}}')],
    [LECTURE_PENTE,
     courbe('({{m}})*x+({{p}})', 'A(0 ; {{p}}), B(1 ; {{eval:(p)+(m)}})',
            'Droite d et deux de ses points, A et B, d\'abscisses 0 et 1.'),
     'De $A(0\\,;{{p}})$ à $B(1\\,;{{eval:(p)+(m)}})$ : on avance de $1$, on {{if:m>0|monte|descend}} de'
     ' ${{eval:abs(m)}}$, donc $m=' + col('{{m}}') + '$.'],
    ['abs((p)+4*(m)) <= 12'])

PENTE_LUE_FRACTION = variation(
    'La droite $d$ est tracée dans le repère ci-dessous ; elle passe par les points $A$ et $B$.\n\n'
    + courbe('({{n}})/({{q}})*x+({{p}})', 'A(0 ; {{p}}), B({{q}} ; {{eval:(p)+(n)}})',
             'Droite d passant par les points A et B.')
    + '\n\nQuelle est la pente $m$ de la droite $d$ ?\n\n$m=?$',
    [var('q', '2|3|4'), var('n', '1..5;±'), var('p', '-3..3')],
    [case('{{eval:(n)/(q)}}')],
    [LECTURE_PENTE,
     'De $A(0\\,;{{p}})$ à $B({{q}}\\,;{{eval:(p)+(n)}})$ : on avance de ${{q}}$, on'
     ' {{if:n>0|monte|descend}} de ${{eval:abs(n)}}$, donc $m=\\dfrac{ {{n}} }{ {{q}} }='
     + col('{{eval:(n)/(q)}}') + '$.'],
    ['mod(n, q) != 0', 'abs((p)+(n)) <= 5'])

SP_LE = {'m': -2, 'p': 1}
SP_LF = {'q': 3, 'n': 2, 'p': -1}
MODELES.append(modele(
    '02-pente-lue-sur-un-graphique', 'Lire la pente d\'une droite sur un graphique',
    'Pente lue sur une droite tracée dans un repère : entière, puis fractionnaire entre deux points'
    ' marqués (pièges : horizontal sur vertical, signe d\'une droite qui descend)', 2,
    [PENTE_LUE_ENTIERE, PENTE_LUE_FRACTION],
    [spec('m = −2', 0, SP_LE, '-2', 'correct'),
     spec('Erreur : signe (2)', 0, SP_LE, '2', 'incorrect'),
     spec('Erreur : ordonnée à l\'origine (1)', 0, SP_LE, '1', 'incorrect'),
     spec('m = 2/3', 1, SP_LF, '\\frac{2}{3}', 'correct'),
     spec('Erreur : horizontal sur vertical (3/2)', 1, SP_LF, '\\frac{3}{2}', 'incorrect')]))

# --- 3. 2-442 : pente lue sur une équation ---------------------------------------------------

PENTE_REDUITE = variation(
    REPERE + ', la droite $d$ a pour équation $y={{p}}{{m;+}}x$.\n\nQuelle est la pente $m$ de la droite'
    ' $d$ ?\n\n$m=?$',
    [var('m', '1..5;±'), var('p', '1..9;±')],
    [case('{{m}}')],
    ['L\'équation réduite d\'une droite s\'écrit $y=mx+p$ : la pente est le **coefficient de $x$**, quelle'
     ' que soit la place du terme.',
     '$$y={{p}}{{m;+}}x={{m}}x{{p;+}}\\quad\\text{donc}\\quad m=' + col('{{m}}') + '$$'],
    ['abs(m) != abs(p)'])

PENTE_CARTESIENNE = variation(
    REPERE + ', la droite $d$ a pour équation ${{a}}x{{b;+}}y{{c;+}}=0$.\n\nQuelle est la pente $m$ de la'
    ' droite $d$ ?\n\n$m=?$',
    [var('a', '1..6;±'), var('b', '2..6;±'), var('c', '-9..9')],
    [case('{{eval:-(a)/(b)}}')],
    ['On isole $y$ pour obtenir l\'équation réduite :',
     '$${{b}}y={{eval:-(a)}}x{{eval:-(c);+}}\\quad\\text{donc}\\quad y={{eval:-(a)/(b)}}x'
     '{{eval:-(c)/(b);+}}$$',
     'La pente est le coefficient de $x$ : $m=-\\dfrac{a}{b}=' + col('{{eval:-(a)/(b)}}') + '$.'],
    ['abs(a) != abs(b)'])

SP_ER = {'m': -2, 'p': 3}
SP_EC = {'a': 2, 'b': 3, 'c': -6}
MODELES.append(modele(
    '03-pente-lue-sur-une-equation', 'Lire la pente d\'une droite sur son équation',
    'Pente d\'une droite donnée par y = p + mx, puis par ax + by + c = 0 (m = −a/b) (pièges : terme'
    ' constant pris pour la pente, a/b sans le signe, b/a)', 3,
    [PENTE_REDUITE, PENTE_CARTESIENNE],
    [spec('y = 3 − 2x → −2', 0, SP_ER, '-2', 'correct'),
     spec('Erreur : terme constant (3)', 0, SP_ER, '3', 'incorrect'),
     spec('Erreur : signe (2)', 0, SP_ER, '2', 'incorrect'),
     spec('2x + 3y − 6 = 0 → −2/3', 1, SP_EC, '-\\frac{2}{3}', 'correct'),
     spec('Erreur : a/b sans signe (2/3)', 1, SP_EC, '\\frac{2}{3}', 'incorrect'),
     spec('Erreur : −b/a (−3/2)', 1, SP_EC, '-\\frac{3}{2}', 'incorrect'),
     spec('Erreur : coefficient de x (2)', 1, SP_EC, '2', 'incorrect')]))

# --- 4. 2-311 : vecteur directeur (connaissance) ---------------------------------------------

DEF_DIRECTEUR = ('Un **vecteur directeur** de la droite $d$ est un vecteur non nul dont la direction est celle'
                 ' de $d$ : tout vecteur non nul **colinéaire** à $\\overrightarrow{AB}$, si $A$ et $B$'
                 ' sont deux points distincts de $d$.')

# Choix : 0 AB, 1 point B (leurre), 2 BA, 3 (Δy ; Δx) (leurre), 4 2AB, 5 (Δx ; −Δy) (leurre)
DIRECTEURS_AB = variation(
    REPERE + ', on considère les points $' + point('A', '{{ax}}', '{{ay}}') + '$ et $'
    + point('B', '{{eval:(ax)+(dx)}}', '{{eval:(ay)+(dy)}}') + '$.\n\n'
    + choix('Quels vecteurs sont des vecteurs directeurs de la droite $(AB)$ ?',
            ['$' + colonne('{{dx}}', '{{dy}}') + '$',
             '$' + colonne('{{eval:(ax)+(dx)}}', '{{eval:(ay)+(dy)}}') + '$',
             '$' + colonne('{{eval:-(dx)}}', '{{eval:-(dy)}}') + '$',
             '$' + colonne('{{dy}}', '{{dx}}') + '$',
             '$' + colonne('{{eval:2*(dx)}}', '{{eval:2*(dy)}}') + '$',
             '$' + colonne('{{dx}}', '{{eval:-(dy)}}') + '$'], plusieurs=True),
    [var('ax', '-5..5!0'), var('ay', '-5..5!0'), var('dx', '1..4;±'), var('dy', '1..4;±')],
    [case('0;2;4')],
    [DEF_DIRECTEUR,
     '$\\overrightarrow{AB}' + colonne('{{dx}}', '{{dy}}') + '$ est un vecteur directeur, comme ses multiples'
     ' non nuls : $\\overrightarrow{BA}=-\\overrightarrow{AB}' + colonne('{{eval:-(dx)}}', '{{eval:-(dy)}}')
     + '$ et $2\\overrightarrow{AB}' + colonne('{{eval:2*(dx)}}', '{{eval:2*(dy)}}') + '$.',
     'Les autres ne sont pas colinéaires à $\\overrightarrow{AB}$ (déterminant non nul) ; $'
     + colonne('{{eval:(ax)+(dx)}}', '{{eval:(ay)+(dy)}}') + '$ donne les coordonnées du **point** $B$, pas'
     ' une direction.'],
    ['abs(dx) != abs(dy)', '(dx)*((ay)+(dy)) - (dy)*((ax)+(dx)) != 0'])

# Choix : 0 −u, 1 (u2 ; u1) (leurre), 2 3u, 3 (−u2 ; u1) (leurre), 4 (u1 + 1 ; u2 + 1) (leurre)
DIRECTEURS_U = variation(
    REPERE + ', la droite $d$ a pour vecteur directeur $\\vec{u}' + colonne('{{u1}}', '{{u2}}') + '$.\n\n'
    + choix('Quels vecteurs sont aussi des vecteurs directeurs de $d$ ?',
            ['$' + colonne('{{eval:-(u1)}}', '{{eval:-(u2)}}') + '$',
             '$' + colonne('{{u2}}', '{{u1}}') + '$',
             '$' + colonne('{{eval:3*(u1)}}', '{{eval:3*(u2)}}') + '$',
             '$' + colonne('{{eval:-(u2)}}', '{{u1}}') + '$',
             '$' + colonne('{{eval:(u1)+1}}', '{{eval:(u2)+1}}') + '$'], plusieurs=True),
    [var('u1', '1..5;±'), var('u2', '1..5;±')],
    [case('0;2')],
    [DEF_DIRECTEUR,
     '$-\\vec{u}' + colonne('{{eval:-(u1)}}', '{{eval:-(u2)}}') + '$ et $3\\vec{u}'
     + colonne('{{eval:3*(u1)}}', '{{eval:3*(u2)}}') + '$ sont colinéaires à $\\vec{u}$ : ce sont des'
     ' vecteurs directeurs de $d$.',
     'Les autres ne le sont pas : échanger les coordonnées, ou ajouter $1$ à chacune, change la direction.'],
    ['abs(u1) != abs(u2)', 'u1 != u2 + 1', 'u2 != u1 + 1'])

SP_DA = {'ax': 1, 'ay': 2, 'dx': 2, 'dy': 3}
SP_DU = {'u1': 2, 'u2': -3}
MODELES.append(modele(
    '04-vecteurs-directeurs', 'Reconnaître des vecteurs directeurs d\'une droite',
    'Parmi des vecteurs, lesquels dirigent (AB) ou une droite de vecteur directeur u (case choix à plusieurs'
    ' réponses) (pièges : coordonnées du point B, coordonnées échangées, u + (1 ; 1))', 4,
    [DIRECTEURS_AB, DIRECTEURS_U],
    [spec('AB, BA, 2AB', 0, SP_DA, '0;2;4', 'correct'),
     spec('Avec le point B', 0, SP_DA, '0;1;2;4', 'incorrect'),
     spec('−u et 3u', 1, SP_DU, '0;2', 'correct'),
     spec('Avec (u2 ; u1)', 1, SP_DU, '0;1;2', 'incorrect')]))

# --- 5. 2-443 : vecteur directeur lu sur une équation ----------------------------------------

DIRECTEUR_CARTESIENNE = variation(
    REPERE + ', la droite $d$ a pour équation ${{a}}x{{b;+}}y{{c;+}}=0$.\n\nDonne un vecteur directeur'
    ' $\\vec{u}$ de la droite $d$.\n\n$\\vec{u}\\ ?$',
    [var('a', '1..6;±'), var('b', '1..6;±'), var('c', '-9..9')],
    [case('({{eval:-(b)}};{{a}})')],
    ['Une droite d\'équation $ax+by+c=0$ a pour vecteur directeur $\\vec{u}' + colonne('-b', 'a') + '$.',
     'Ici $a={{a}}$ et $b={{b}}$ : $\\vec{u}' + colonne(col('{{eval:-(b)}}'), col('{{a}}')) + '$. Tout vecteur'
     ' non nul colinéaire à $\\vec{u}$ convient aussi.'],
    ['abs(a) != abs(b)'])

DIRECTEUR_REDUITE = variation(
    REPERE + ', la droite $d$ a pour équation $y={{m}}x{{p;+}}$.\n\nDonne un vecteur directeur $\\vec{u}$ de'
    ' la droite $d$.\n\n$\\vec{u}\\ ?$',
    [var('m', '2..6;±'), var('p', '-9..9')],
    [case('(1;{{m}})')],
    ['Quand $x$ augmente de $1$, $y$ varie de la pente $m$ : une droite d\'équation $y=mx+p$ a pour vecteur'
     ' directeur $\\vec{u}' + colonne('1', 'm') + '$.',
     'Ici $\\vec{u}' + colonne(col('1'), col('{{m}}')) + '$. Tout vecteur non nul colinéaire à $\\vec{u}$'
     ' convient aussi.'])

DIRECTEUR_REDUITE_FRACTION = variation(
    REPERE + ', la droite $d$ a pour équation $y=' + fraction('n', 'q') + 'x{{p;+}}$.\n\nDonne un vecteur'
    ' directeur $\\vec{u}$ de la droite $d$.\n\n$\\vec{u}\\ ?$',
    [var('q', '2|3|5'), var('n', '1..4;±'), var('p', '-9..9')],
    [case('({{q}};{{n}})')],
    ['Une droite d\'équation $y=mx+p$ a pour vecteur directeur $' + colonne('1', 'm') + '$, ici $'
     + colonne('1', fraction('n', 'q')) + '$.',
     'En le multipliant par ${{q}}$, on obtient un vecteur directeur à coordonnées entières : $\\vec{u}'
     + colonne(col('{{q}}'), col('{{n}}')) + '$.'],
    ['mod(n, q) != 0'])

SP_VC = {'a': 2, 'b': -3, 'c': 5}
SP_VR = {'m': 4, 'p': -1}
SP_VF = {'q': 3, 'n': -2, 'p': 1}
MODELES.append(modele(
    '05-vecteur-directeur-lu-sur-une-equation', 'Vecteur directeur d\'une droite donnée par une équation',
    'Vecteur directeur (−b ; a) de ax + by + c = 0, puis (1 ; m) de y = mx + p, pente entière ou'
    ' fractionnaire ; tout vecteur colinéaire accepté (pièges : (a ; b) normal, (m ; 1), (1 ; p))', 5,
    [DIRECTEUR_CARTESIENNE, DIRECTEUR_REDUITE, DIRECTEUR_REDUITE_FRACTION],
    [spec('2x − 3y + 5 = 0 → (3 ; 2)', 0, SP_VC, '(3;2)', 'correct'),
     spec('Colinéaire (−6 ; −4)', 0, SP_VC, '(-6;-4)', 'correct'),
     spec('Erreur : (a ; b), vecteur normal', 0, SP_VC, '(2;-3)', 'incorrect'),
     spec('Erreur : (b ; a)', 0, SP_VC, '(-3;2)', 'incorrect'),
     spec('y = 4x − 1 → (1 ; 4)', 1, SP_VR, '(1;4)', 'correct'),
     spec('Erreur : (m ; 1)', 1, SP_VR, '(4;1)', 'incorrect'),
     spec('Erreur : (1 ; p)', 1, SP_VR, '(1;-1)', 'incorrect'),
     spec('y = −2/3 x + 1 → (3 ; −2)', 2, SP_VF, '(3;-2)', 'correct'),
     spec('(1 ; −2/3) accepté', 2, SP_VF, '(1;-\\frac{2}{3})', 'correct'),
     spec('Erreur : (−2 ; 3)', 2, SP_VF, '(-2;3)', 'incorrect')],
    blank_defaults={'answerKind': 'vecteur', 'vectorMode': 'colineaire'}))

# --- 6. 2-444 : vecteur directeur lu sur un graphique ----------------------------------------

LECTURE_DIRECTEUR = ('Entre deux points $A$ et $B$ de la droite, $\\overrightarrow{AB}$ est un vecteur directeur :'
                     ' sa première coordonnée est le déplacement horizontal, la seconde le déplacement vertical.')

DIRECTEUR_LU_ENTIER = variation(
    'La droite $d$ est tracée dans le repère ci-dessous.\n\n' + courbe('({{m}})*x+({{p}})')
    + '\n\nDonne un vecteur directeur $\\vec{u}$ de la droite $d$.\n\n$\\vec{u}\\ ?$',
    [var('m', '1..3;±'), var('p', '-3..3')],
    [case('(1;{{m}})')],
    [LECTURE_DIRECTEUR,
     courbe('({{m}})*x+({{p}})', 'A(0 ; {{p}}), B(1 ; {{eval:(p)+(m)}})',
            'Droite d et deux de ses points, A et B, d\'abscisses 0 et 1.'),
     'De $A$ à $B$ : on avance de $1$, on {{if:m>0|monte|descend}} de ${{eval:abs(m)}}$, donc'
     ' $\\vec{u}=\\overrightarrow{AB}' + colonne(col('1'), col('{{m}}')) + '$. Tout vecteur non nul'
     ' colinéaire convient aussi.'],
    ['abs((p)+4*(m)) <= 12'])

DIRECTEUR_LU_FRACTION = variation(
    'La droite $d$ est tracée dans le repère ci-dessous ; elle passe par les points $A$ et $B$.\n\n'
    + courbe('({{n}})/({{q}})*x+({{p}})', 'A(0 ; {{p}}), B({{q}} ; {{eval:(p)+(n)}})',
             'Droite d passant par les points A et B.')
    + '\n\nDonne un vecteur directeur $\\vec{u}$ de la droite $d$.\n\n$\\vec{u}\\ ?$',
    [var('q', '2|3|4'), var('n', '1..5;±'), var('p', '-3..3')],
    [case('({{q}};{{n}})')],
    [LECTURE_DIRECTEUR,
     'De $A(0\\,;{{p}})$ à $B({{q}}\\,;{{eval:(p)+(n)}})$ : on avance de ${{q}}$, on'
     ' {{if:n>0|monte|descend}} de ${{eval:abs(n)}}$, donc $\\vec{u}=\\overrightarrow{AB}'
     + colonne(col('{{q}}'), col('{{n}}')) + '$. Tout vecteur non nul colinéaire convient aussi.'],
    ['mod(n, q) != 0', 'abs((p)+(n)) <= 5'])

SP_GE = {'m': -2, 'p': 1}
SP_GF = {'q': 3, 'n': 2, 'p': -1}
MODELES.append(modele(
    '06-vecteur-directeur-lu-sur-un-graphique', 'Lire un vecteur directeur d\'une droite sur un graphique',
    'Vecteur directeur lu entre deux points d\'une droite tracée : pente entière, puis fractionnaire entre'
    ' deux points marqués ; tout vecteur colinéaire accepté (pièges : coordonnées échangées, signe)', 6,
    [DIRECTEUR_LU_ENTIER, DIRECTEUR_LU_FRACTION],
    [spec('m = −2 → (1 ; −2)', 0, SP_GE, '(1;-2)', 'correct'),
     spec('Colinéaire (−1 ; 2)', 0, SP_GE, '(-1;2)', 'correct'),
     spec('Erreur : signe (1 ; 2)', 0, SP_GE, '(1;2)', 'incorrect'),
     spec('Erreur : échangées (−2 ; 1)', 0, SP_GE, '(-2;1)', 'incorrect'),
     spec('A(0 ; −1), B(3 ; 1) → (3 ; 2)', 1, SP_GF, '(3;2)', 'correct'),
     spec('Erreur : échangées (2 ; 3)', 1, SP_GF, '(2;3)', 'incorrect'),
     spec('Erreur : point B (3 ; 1)', 1, SP_GF, '(3;1)', 'incorrect')],
    blank_defaults={'answerKind': 'vecteur', 'vectorMode': 'colineaire'}))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
