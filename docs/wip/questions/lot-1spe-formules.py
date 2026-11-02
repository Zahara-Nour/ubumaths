"""Écrit les 5 modèles du lot « formules » du produit scalaire (1re spé)
dans scripts/questions/1spe-formules/.

Phase 0 validée par David le 2026-11-02 (« je valide » sur les recos, journal
« docs/archive/wip/questions-1spe-geometrie-progress.md », § Lot formules : phase 0), un point par modèle :

| # | Point    | Titre                                   | Catégorie, niveau                  |
| 1 | 1SPE-413 | Symétrie du produit scalaire            | Produit scalaire › Propriétés, 6   |
| 2 | 1SPE-315 | Développement de ‖u + v‖²               | Produit scalaire › Propriétés, 7   |
| 3 | 1SPE-416 | Développement de ‖u − v‖²               | Produit scalaire › Propriétés, 8   |
| 4 | 1SPE-414 | Norme en base orthonormée               | Produit scalaire › Propriétés, 9   |
| 5 | 1SPE-314 | Coordonnées et produits scalaires       | Produit scalaire › Propriétés, 10  |

Les modèles font APPLIQUER la formule (réponse en case), plus une variation « formule » en case
choix (4 propositions, la première est la bonne, l'affichage les mélange).

Voisins à ne pas répéter : 74363137 (Propriétés 4, calcul direct de ‖u ± v‖², tagué 320),
affe59f7 et d787d8c0 (u·v à partir de trois normes, 321), cf08f061 (norme d'un vecteur, seconde).

Bornes : « lycee/1spe.json » (u·v = v·u ; ‖u‖ = √(x² + y²) ; x = u·i, y = u·j ;
‖u ± v‖² = ‖u‖² ± 2u·v + ‖v‖²).

Pas de `cleanCoefficients` ; `blankDefaults.acceptDecimal` sur chaque modèle.

    python3 docs/wip/questions/lot-1spe-formules.py scripts/questions/1spe-formules
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, answers, status, variables=None, violations=None):
    expected = {'status': status}
    if violations:
        expected['constraintViolations'] = violations
    return {'description': desc, 'variationIndex': vi, 'variables': variables or {},
            'answers': answers, 'expected': expected}


def modele(nom, title, description, level, variations, specs):
    return nom, {'title': title, 'description': description, 'grades': ['1_SPE'],
                 'theme': 'Géométrie', 'domain': 'Produit scalaire', 'subdomain': 'Propriétés',
                 'level': level, 'delay': 45, 'status': 'draft',
                 'shared': {'blankDefaults': {'acceptDecimal': True}},
                 'options': {'constraints': {'spaces': 'off'}},
                 'variations': variations, 'testSpecs': specs}


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def choix(lignes):
    return '\n\n```choix\n' + ''.join('- ' + l + '\n' for l in lignes) + '```'


def qcm(statement, bonne, autres, steps):
    """Variation sans variable : la première proposition est la bonne (index 0)."""
    return {'statement': statement + choix([bonne] + autres), 'variables': [],
            'blanks': [{'expectedAnswer': '0'}], 'correction': {'steps': steps}}


def specs_qcm(vi, juste, erreurs):
    out = [spec(juste, vi, ['0'], 'correct')]
    for k, erreur in enumerate(erreurs, start=1):
        out.append(spec('Erreur : ' + erreur, vi, [str(k)], 'incorrect'))
    return out


def var(name, expression):
    return {'name': name, 'expression': expression}


def vect(a, b):
    return '\\begin{pmatrix}' + a + '\\\\' + b + '\\end{pmatrix}'


MODELES = []

U = '\\vec{u}'
V = '\\vec{v}'
W = '\\vec{w}'
I = '\\vec{i}'
J = '\\vec{j}'
UV = U + '\\cdot ' + V
VU = V + '\\cdot ' + U
NU = '\\|' + U + '\\|'
NV = '\\|' + V + '\\|'
NUPV = '\\|' + U + '+' + V + '\\|'
NUMV = '\\|' + U + '-' + V + '\\|'
AB = '\\overrightarrow{AB}'
AC = '\\overrightarrow{AC}'
BA = '\\overrightarrow{BA}'
CA = '\\overrightarrow{CA}'
BASE = 'Le plan est muni d\'une base orthonormée $(' + I + ',' + J + ')$.'

# Produit scalaire non nul et strictement plus petit que ‖u‖‖v‖ en valeur absolue (vecteurs non
# colinéaires) : même plage que 74363137.
P_PLAGE = '{{eval:max(-9,1-a*b)}}..{{eval:min(9,a*b-1)}}'

# --- 1. 1SPE-413 : u·v = v·u ---------------------------------------------------------------------

V413_DIRECT = {
    'statement': 'Soit $' + U + '$ et $' + V + '$ deux vecteurs tels que $' + UV + '={{k}}$.\n\n'
                 'Que vaut $' + VU + '$ ?\n\n$' + VU + '=?$',
    'variables': [var('k', '1..12;±')],
    'blanks': [{'expectedAnswer': '{{k}}'}],
    'correction': {'steps': [
        'Le produit scalaire est symétrique : pour tous vecteurs $' + U + '$ et $' + V + '$, $'
        + VU + '=' + UV + '$.',
        'Donc $' + VU + '=' + col('{{k}}') + '$.']},
}
V413_SOMME = {
    'statement': 'Soit $' + U + '$, $' + V + '$ et $' + W + '$ trois vecteurs tels que $' + UV
                 + '={{k}}$ et $' + W + '\\cdot ' + U + '={{m}}$.\n\n'
                 'Calcule $' + VU + '+' + U + '\\cdot ' + W + '$.\n\n$' + VU + '+' + U + '\\cdot '
                 + W + '=?$',
    'variables': [var('k', '1..9;±'), var('m', '1..9;±')],
    'conditions': ['k != m', 'k + m != 0'],
    'blanks': [{'expectedAnswer': '{{eval:k+m}}'}],
    'correction': {'steps': [
        'Le produit scalaire est symétrique : $' + VU + '=' + UV + '={{k}}$ et $' + U + '\\cdot '
        + W + '=' + W + '\\cdot ' + U + '={{m}}$.',
        'Donc $' + VU + '+' + U + '\\cdot ' + W + '={{k}}{{eval:m;+}}=' + col('{{eval:k+m}}') + '$.']},
}
V413_CHOIX = qcm(
    'Soit $A$, $B$ et $C$ trois points du plan. Laquelle de ces égalités est toujours vraie ?',
    '$' + AB + '\\cdot ' + AC + '=' + AC + '\\cdot ' + AB + '$',
    ['$' + AB + '\\cdot ' + AC + '=' + BA + '\\cdot ' + AC + '$',
     '$' + AB + '\\cdot ' + AC + '=' + AB + '\\cdot ' + CA + '$',
     '$' + AB + '\\cdot ' + AC + '=-' + AC + '\\cdot ' + AB + '$'],
    ['Le produit scalaire est symétrique : on peut échanger les deux vecteurs, $' + col(
        AB + '\\cdot ' + AC + '=' + AC + '\\cdot ' + AB) + '$.',
     'En revanche, $' + BA + '=-' + AB + '$ : remplacer un seul vecteur par son opposé change le'
     ' signe du produit scalaire.'])

MODELES.append(modele(
    '01-symetrie-produit-scalaire', 'Symétrie du produit scalaire',
    'Utiliser la symétrie u·v = v·u : valeur de v·u, somme de produits scalaires écrits dans'
    ' l\'autre ordre, et l\'égalité toujours vraie parmi des pièges (vecteur remplacé par son opposé)',
    6,
    [V413_DIRECT, V413_SOMME, V413_CHOIX],
    [spec('v·u = u·v = 7', 0, ['7'], 'correct', {'k': '7'}),
     spec('Erreur : signe changé', 0, ['-7'], 'incorrect', {'k': '7'}),
     spec('Erreur : « nul »', 0, ['0'], 'incorrect', {'k': '7'}),
     spec('5 + (−3) = 2', 1, ['2'], 'correct', {'k': '5', 'm': '-3'}),
     spec('Erreur : différence', 1, ['8'], 'incorrect', {'k': '5', 'm': '-3'}),
     spec('Erreur : opposé', 1, ['-2'], 'incorrect', {'k': '5', 'm': '-3'}),
     spec('Erreur : produit', 1, ['-15'], 'incorrect', {'k': '5', 'm': '-3'})]
    + specs_qcm(2, 'AB·AC = AC·AB', ['BA au lieu de AB', 'CA au lieu de AC', 'signe moins'])))

# --- 2 et 3. 1SPE-315 et 1SPE-416 : ‖u ± v‖² ------------------------------------------------------


def developpement(signe):
    """signe = '+' (315) ou '-' (416)."""
    plus = signe == '+'
    N = NUPV if plus else NUMV
    s = '+' if plus else '-'
    autre = '-' if plus else '+'
    choix_v = qcm(
        'Soit $' + U + '$ et $' + V + '$ deux vecteurs. Le nombre $' + N + '^2$ est égal à :',
        '$' + NU + '^2' + s + '2\\,' + UV + '+' + NV + '^2$',
        (['$' + NU + '^2+' + NV + '^2$',
          '$' + NU + '^2+' + UV + '+' + NV + '^2$',
          '$\\left(' + NU + '+' + NV + '\\right)^2$'] if plus else
         ['$' + NU + '^2+2\\,' + UV + '+' + NV + '^2$',
          '$' + NU + '^2-' + NV + '^2$',
          '$' + NU + '^2-' + UV + '+' + NV + '^2$']),
        ['$' + N + '^2=(' + U + s + V + ')\\cdot(' + U + s + V + ')$ : on développe par bilinéarité,'
         ' comme une identité remarquable.',
         '$' + N + '^2=' + U + '\\cdot ' + U + s + UV + s + VU + '+' + V + '\\cdot ' + V + '$, et $'
         + VU + '=' + UV + '$ (symétrie).',
         'Donc $' + N + '^2=' + col(NU + '^2' + s + '2\\,' + UV + '+' + NV + '^2') + '$.'])
    ortho = {
        'statement': 'Soit $' + U + '$ et $' + V + '$ deux vecteurs orthogonaux tels que $' + NU
                     + '={{a}}$ et $' + NV + '={{b}}$.\n\nCalcule $' + N + '^2$.\n\n$' + N
                     + '^2=?$',
        'variables': [var('a', '2..9'), var('b', '2..9')],
        'conditions': ['a != b'],
        'blanks': [{'expectedAnswer': '{{eval:a^2+b^2}}'}],
        'correction': {'steps': [
            '$' + N + '^2=' + NU + '^2' + s + '2\\,' + UV + '+' + NV + '^2$.',
            'Les vecteurs sont orthogonaux, donc $' + UV + '=0$ et $' + N + '^2=' + NU + '^2+' + NV
            + '^2$.',
            '$' + N + '^2={{a}}^2+{{b}}^2={{eval:a^2}}+{{eval:b^2}}=' + col('{{eval:a^2+b^2}}')
            + '$.']},
    }
    # S = ‖u ± v‖², donné ; on cherche ‖u‖² = S ∓ 2p − b²
    S = 'a^2' + s + '2*p+b^2'
    inverse = {
        'statement': 'Soit $' + U + '$ et $' + V + '$ deux vecteurs tels que $' + N + '^2={{S}}$, $'
                     + UV + '={{p}}$ et $' + NV + '={{b}}$.\n\nCalcule $' + NU + '^2$.\n\n$' + NU
                     + '^2=?$',
        'variables': [var('a', '2..6'), var('b', '2..6'), var('p', P_PLAGE),
                      var('S', '{{eval:' + S + '}}')],
        'conditions': ['p != 0', 'abs(p) < a*b'],
        'blanks': [{'expectedAnswer': '{{eval:a^2}}'}],
        'correction': {'steps': [
            '$' + N + '^2=' + NU + '^2' + s + '2\\,' + UV + '+' + NV + '^2$, donc $' + NU + '^2='
            + N + '^2' + autre + '2\\,' + UV + '-' + NV + '^2$.',
            '$' + NU + '^2={{S}}' + autre + '2\\times {{p;()}}-{{b}}^2={{S}}{{eval:'
            + ('-' if plus else '') + '2*p;+}}-{{eval:b^2}}=' + col('{{eval:a^2}}') + '$.']},
    }
    return choix_v, ortho, inverse


V315 = developpement('+')
MODELES.append(modele(
    '02-developpement-norme-somme', 'Développement de ‖u + v‖²',
    'Utiliser ‖u + v‖² = ‖u‖² + 2u·v + ‖v‖² : la formule parmi des erreurs typiques, le cas de deux'
    ' vecteurs orthogonaux, et ‖u‖² retrouvé à partir de ‖u + v‖², u·v et ‖v‖',
    7, list(V315),
    specs_qcm(0, '‖u‖² + 2u·v + ‖v‖²', ['‖u‖² + ‖v‖²', 'facteur 2 oublié', '(‖u‖ + ‖v‖)²'])
    + [spec('3² + 4² = 25', 1, ['25'], 'correct', {'a': '3', 'b': '4'}),
       spec('Erreur : (a + b)²', 1, ['49'], 'incorrect', {'a': '3', 'b': '4'}),
       spec('Erreur : a + b', 1, ['7'], 'incorrect', {'a': '3', 'b': '4'}),
       spec('Erreur : norme au lieu du carré', 1, ['5'], 'incorrect', {'a': '3', 'b': '4'}),
       spec('19 − 6 − 4 = 9', 2, ['9'], 'correct', {'a': '3', 'b': '2', 'p': '3', 'S': '19'}),
       spec('Erreur : facteur 2 oublié', 2, ['12'], 'incorrect',
            {'a': '3', 'b': '2', 'p': '3', 'S': '19'}),
       spec('Erreur : signe de 2u·v', 2, ['21'], 'incorrect',
            {'a': '3', 'b': '2', 'p': '3', 'S': '19'}),
       spec('Erreur : ‖v‖² oublié', 2, ['13'], 'incorrect',
            {'a': '3', 'b': '2', 'p': '3', 'S': '19'}),
       spec('Erreur : ‖u‖ au lieu de ‖u‖²', 2, ['3'], 'incorrect',
            {'a': '3', 'b': '2', 'p': '3', 'S': '19'})]))

V416 = developpement('-')
MODELES.append(modele(
    '03-developpement-norme-difference', 'Développement de ‖u − v‖²',
    'Utiliser ‖u − v‖² = ‖u‖² − 2u·v + ‖v‖² : la formule parmi des erreurs typiques (signe,'
    ' ‖u‖² − ‖v‖²), le cas de deux vecteurs orthogonaux, et ‖u‖² retrouvé à partir de ‖u − v‖²,'
    ' u·v et ‖v‖',
    8, list(V416),
    specs_qcm(0, '‖u‖² − 2u·v + ‖v‖²', ['signe de 2u·v', '‖u‖² − ‖v‖²', 'facteur 2 oublié'])
    + [spec('5² + 3² = 34', 1, ['34'], 'correct', {'a': '5', 'b': '3'}),
       spec('Erreur : a² − b²', 1, ['16'], 'incorrect', {'a': '5', 'b': '3'}),
       spec('Erreur : (a − b)²', 1, ['4'], 'incorrect', {'a': '5', 'b': '3'}),
       spec('Erreur : a − b', 1, ['2'], 'incorrect', {'a': '5', 'b': '3'}),
       spec('7 + 6 − 4 = 9', 2, ['9'], 'correct', {'a': '3', 'b': '2', 'p': '3', 'S': '7'}),
       spec('Erreur : signe de 2u·v', 2, ['-3'], 'incorrect',
            {'a': '3', 'b': '2', 'p': '3', 'S': '7'}),
       spec('Erreur : facteur 2 oublié', 2, ['6'], 'incorrect',
            {'a': '3', 'b': '2', 'p': '3', 'S': '7'}),
       spec('Erreur : ‖v‖² oublié', 2, ['13'], 'incorrect',
            {'a': '3', 'b': '2', 'p': '3', 'S': '7'}),
       spec('Erreur : ‖u‖ au lieu de ‖u‖²', 2, ['3'], 'incorrect',
            {'a': '3', 'b': '2', 'p': '3', 'S': '7'})]))

# --- 4. 1SPE-414 : ‖u‖ = √(x² + y²) --------------------------------------------------------------

NORME_DEBUT = ('En base orthonormée, $' + NU + '^2=' + U + '\\cdot ' + U + '=x^2+y^2$, donc $' + NU
               + '=\\sqrt{x^2+y^2}$.')
NORME_CALCUL = '$' + NU + '=\\sqrt{ {{x;()}}^2+{{y;()}}^2 }=\\sqrt{ {{eval:x^2}}+{{eval:y^2}} }='
# Racine entière : « √N = R » toujours écrit
NORME_STEPS = [NORME_DEBUT, NORME_CALCUL + '\\sqrt{ {{N}} }=' + col('{{R}}') + '$.']
# Racine non entière : « √N = » seulement si N a un facteur carré (N ≤ 72 : 4, 9, 25, 49)
NORME_STEPS_RACINE = [NORME_DEBUT, NORME_CALCUL + '{{if:N%4==0 or N%9==0 or N%25==0 or N%49==0|'
                      '\\sqrt{ {{N}} }=' + col('{{R}}') + '|' + col('{{R}}') + '}}$.']

# Triplets pythagoriciens (m² − n², 2mn, m² + n²), dans un ordre ou dans l'autre, signes au hasard
V414_ENTIER = {
    'statement': BASE + ' On considère le vecteur $' + U + vect('{{x}}', '{{y}}') + '$.\n\n'
                 'Calcule $' + NU + '$.\n\n$' + NU + '=?$',
    'variables': [var('m', '2..4'), var('n', '1..3'), var('sw', '0..1'), var('sx', '1|-1'),
                  var('sy', '1|-1'),
                  var('x', '{{eval:sx*(sw*(m^2-n^2)+(1-sw)*2*m*n)}}'),
                  var('y', '{{eval:sy*(sw*2*m*n+(1-sw)*(m^2-n^2))}}'),
                  var('N', '{{eval:x^2+y^2}}'), var('R', '{{eval:m^2+n^2}}')],
    'conditions': ['n < m'],
    'blanks': [{'expectedAnswer': '{{R}}'}],
    'correction': {'steps': NORME_STEPS},
}
V414_RACINE = {
    'statement': BASE + ' On considère le vecteur $' + U + vect('{{x}}', '{{y}}') + '$.\n\n'
                 'Calcule $' + NU + '$. Donne sa valeur exacte.\n\n$' + NU + '=?$',
    'variables': [var('x', '1..6;±'), var('y', '1..6;±'), var('N', '{{eval:x^2+y^2}}'),
                  var('R', '{{eval:sqrt(N)}}')],
    'conditions': ['sqrt(N) != round(sqrt(N))'],
    'blanks': [{'expectedAnswer': '{{R}}'}],
    'correction': {'steps': NORME_STEPS_RACINE},
}
V414_CHOIX = qcm(
    BASE + ' Pour un vecteur $' + U + vect('x', 'y') + '$, la norme $' + NU + '$ est égale à :',
    '$\\sqrt{x^2+y^2}$',
    ['$x^2+y^2$', '$\\sqrt{x+y}$', '$|x|+|y|$'],
    ['En base orthonormée, $' + NU + '^2=' + U + '\\cdot ' + U + '=x\\times x+y\\times y=x^2+y^2$.',
     'Une norme est positive, donc $' + NU + '=' + col('\\sqrt{x^2+y^2}') + '$ ($x^2+y^2$ est son'
     ' carré).'])

MODELES.append(modele(
    '04-norme-base-orthonormee', 'Norme en base orthonormée',
    'Utiliser ‖u‖ = √(x² + y²) en base orthonormée : norme entière (triplet pythagoricien), norme'
    ' exacte en racine réduite, et la formule parmi des erreurs typiques',
    9,
    [V414_ENTIER, V414_RACINE, V414_CHOIX],
    [spec('√(9 + 16) = 5', 0, ['5'], 'correct',
          {'m': '2', 'n': '1', 'sw': '1', 'sx': '1', 'sy': '-1', 'x': '3', 'y': '-4', 'N': '25',
           'R': '5'}),
     spec('Erreur : racine oubliée', 0, ['25'], 'incorrect',
          {'m': '2', 'n': '1', 'sw': '1', 'sx': '1', 'sy': '-1', 'x': '3', 'y': '-4', 'N': '25',
           'R': '5'}),
     spec('Erreur : |x| + |y|', 0, ['7'], 'incorrect',
          {'m': '2', 'n': '1', 'sw': '1', 'sx': '1', 'sy': '-1', 'x': '3', 'y': '-4', 'N': '25',
           'R': '5'}),
     spec('Erreur : x + y', 0, ['-1'], 'incorrect',
          {'m': '2', 'n': '1', 'sw': '1', 'sx': '1', 'sy': '-1', 'x': '3', 'y': '-4', 'N': '25',
           'R': '5'}),
     spec('√20 = 2√5', 1, ['2\\sqrt{5}'], 'correct', {'x': '2', 'y': '-4', 'N': '20'}),
     spec('√20 non réduite', 1, ['\\sqrt{20}'], 'unoptimal_form', {'x': '2', 'y': '-4', 'N': '20'},
          ['reducedRadicals']),
     spec('Erreur : racine oubliée', 1, ['20'], 'incorrect', {'x': '2', 'y': '-4', 'N': '20'}),
     spec('Erreur : |x| + |y|', 1, ['6'], 'incorrect', {'x': '2', 'y': '-4', 'N': '20'}),
     spec('Erreur : valeur approchée refusée', 1, ['4,47'], 'incorrect',
          {'x': '2', 'y': '-4', 'N': '20'})]
    + specs_qcm(2, '√(x² + y²)', ['racine oubliée', '√(x + y)', '|x| + |y|'])))

# --- 5. 1SPE-314 : x = u·i, y = u·j -------------------------------------------------------------

V314_COORD = {
    'statement': BASE + ' Un vecteur $' + U + '$ vérifie $' + U + '\\cdot ' + I + '={{a}}$ et $' + U
                 + '\\cdot ' + J + '={{b}}$.\n\nDonne les coordonnées de $' + U + '$.\n\n$' + U
                 + '(?\\,;\\,?)$',
    'variables': [var('a', '1..9;±'), var('b', '1..9;±')],
    'conditions': ['a != b'],
    'blanks': [{'expectedAnswer': '{{a}}'}, {'expectedAnswer': '{{b}}'}],
    'correction': {'steps': [
        'Dans une base orthonormée $(' + I + ',' + J + ')$, les coordonnées de $' + U + '$ sont $x='
        + U + '\\cdot ' + I + '$ et $y=' + U + '\\cdot ' + J + '$.',
        'En effet, si $' + U + '=x\\,' + I + '+y\\,' + J + '$, alors $' + U + '\\cdot ' + I + '=x\\,'
        + I + '\\cdot ' + I + '+y\\,' + J + '\\cdot ' + I + '=x$ car $' + I + '\\cdot ' + I
        + '=1$ et $' + J + '\\cdot ' + I + '=0$.',
        'Donc $' + U + col('({{a}}\\,;\\,{{b}})') + '$.']},
}
V314_PRODUIT = {
    'statement': BASE + ' On considère le vecteur $' + U + vect('{{x}}', '{{y}}') + '$.\n\n'
                 'Calcule $' + U + '\\cdot\\vec{ {{if:w==1|i|j}} }$.\n\n$' + U
                 + '\\cdot\\vec{ {{if:w==1|i|j}} }=?$',
    'variables': [var('x', '1..9;±'), var('y', '1..9;±'), var('w', '0..1')],
    'conditions': ['x != y', 'x + y != 0'],
    'blanks': [{'expectedAnswer': '{{eval:w*x+(1-w)*y}}'}],
    'correction': {'steps': [
        'Dans une base orthonormée $(' + I + ',' + J + ')$, $' + U + '\\cdot ' + I
        + '$ est l\'abscisse de $' + U + '$ et $' + U + '\\cdot ' + J + '$ son ordonnée.',
        'Donc $' + U + '\\cdot\\vec{ {{if:w==1|i|j}} }=' + col('{{eval:w*x+(1-w)*y}}') + '$.']},
}
V314_CHOIX = qcm(
    BASE + ' Pour un vecteur $' + U + vect('x', 'y') + '$, l\'abscisse $x$ est égale à :',
    '$' + U + '\\cdot ' + I + '$',
    ['$' + U + '\\cdot ' + J + '$', '$' + NU + '$', '$' + U + '\\cdot(' + I + '+' + J + ')$'],
    ['$' + U + '=x\\,' + I + '+y\\,' + J + '$, donc $' + U + '\\cdot ' + I + '=x\\,' + I + '\\cdot '
     + I + '+y\\,' + J + '\\cdot ' + I + '$.',
     'La base est orthonormée : $' + I + '\\cdot ' + I + '=1$ et $' + J + '\\cdot ' + I
     + '=0$, donc $x=' + col(U + '\\cdot ' + I) + '$ (et $y=' + U + '\\cdot ' + J + '$).'])

MODELES.append(modele(
    '05-coordonnees-produits-scalaires', 'Coordonnées et produits scalaires',
    'Utiliser x = u·i et y = u·j dans une base orthonormée (i, j) : coordonnées à partir des produits'
    ' scalaires, produit scalaire avec un vecteur de la base, et la formule parmi des erreurs'
    ' typiques',
    10,
    [V314_COORD, V314_PRODUIT, V314_CHOIX],
    [spec('(3 ; −5)', 0, ['3', '-5'], 'correct', {'a': '3', 'b': '-5'}),
     spec('Erreur : coordonnées échangées', 0, ['-5', '3'], 'incorrect', {'a': '3', 'b': '-5'}),
     spec('u·i = 4', 1, ['4'], 'correct', {'x': '4', 'y': '-3', 'w': '1'}),
     spec('Erreur : ordonnée au lieu de l\'abscisse', 1, ['-3'], 'incorrect',
          {'x': '4', 'y': '-3', 'w': '1'}),
     spec('Erreur : x + y', 1, ['1'], 'incorrect', {'x': '4', 'y': '-3', 'w': '1'}),
     spec('Erreur : norme', 1, ['5'], 'incorrect', {'x': '4', 'y': '-3', 'w': '1'}),
     spec('u·j = −3', 1, ['-3'], 'correct', {'x': '4', 'y': '-3', 'w': '0'}),
     spec('Erreur : abscisse au lieu de l\'ordonnée', 1, ['4'], 'incorrect',
          {'x': '4', 'y': '-3', 'w': '0'})]
    + specs_qcm(2, 'u·i', ['u·j', '‖u‖', 'u·(i + j)'])))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
