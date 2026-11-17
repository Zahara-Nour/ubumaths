"""Écrit les 2 modèles du lot 5 « exemples d'algorithmes : géométrie » de la seconde
dans scripts/questions/2de-algorithmes-5/.

Phase 0 validée par David le 2026-11-08 (D3 du journal
« docs/wip/questions-2de-demonstrations-progress.md », § 9) : un point par modèle, chacun sur la
sous-notion existante de son point, niveau après ceux déjà présents (relevé prod du 2026-11-08) :

| # | Point | Titre                                                    | Niv. | Nœud du modèle                          |
| 1 | 2-321 | Tester l'alignement de trois points en Python             | 8    | Vecteurs › colinéarité                  |
| 2 | 2-322 | Équation réduite d'une droite par deux points, en Python  | 11   | Géométrie repérée › équations de droites |

Forme (D3, Q2) : Python seulement ; (a) faire tourner un programme (case), (b) compléter une ligne
(case choix à 4 propositions, la première est la bonne, ordre mélangé à l'affichage), (c)
interpréter. Valeurs calculables à la main.

Variables : jamais `e` ni `E` (constante d'Euler), ni `i`. Jamais `str.format` sur un texte qui
contient `{{eval}}`.

    python3 docs/wip/questions/lot-2de-algorithmes-5.py scripts/questions/2de-algorithmes-5
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, answer, status, variables=None, violations=None):
    answers = answer if isinstance(answer, list) else [answer]
    expected = {'status': status}
    if violations:
        expected['constraintViolations'] = violations  # une par case en défaut
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in (variables or {}).items()},
            'answers': answers, 'expected': expected}


def modele(nom, title, description, level, variations, specs):
    return nom, {'title': title, 'description': description, 'grades': ['2'],
                 'level': level, 'delay': 90, 'status': 'draft', 'shared': {},
                 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def ev(x):
    return '{{eval:' + x + '}}'


def evp(x):
    """Valeur entre parenthèses si elle est négative (facteur d'un produit)."""
    return '{{eval:' + x + ';()}}'


def dec(x):
    """Valeur écrite en décimal (sans `;d`, un quotient reste en fraction)."""
    return '{{eval:' + x + ';d}}'


def decp(x):
    return '{{eval:' + x + ';d;()}}'


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def python(code):
    return '\n\n```python\n' + code + '\n```\n\n'


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + l + '\n' for l in lignes) + '```'


def case(statement, variables, attendus, steps):
    attendus = attendus if isinstance(attendus, list) else [attendus]
    return {'statement': statement, 'variables': variables,
            'blanks': [{'expectedAnswer': a} for a in attendus], 'correction': {'steps': steps}}


def ligne(statement, variables, bonne, autres, steps):
    """Case choix : la première proposition est la bonne (index 0)."""
    return {'statement': statement + choix([bonne] + autres), 'variables': variables,
            'blanks': [{'expectedAnswer': '0'}], 'correction': {'steps': steps}}


def specs_choix(vi, juste, erreurs, variables=None):
    out = [spec(juste, vi, '0', 'correct', variables)]
    for k, erreur in enumerate(erreurs, start=1):
        out.append(spec('Erreur : ' + erreur, vi, str(k), 'incorrect', variables))
    return out


MODELES = []

# --- 1. 2-321 : alignement de trois points -------------------------------------------------------

ALIGNES = ('def alignes(xA, yA, xB, yB, xC, yC):\n'
           '    det = DET\n'
           '    return det == 0')
DET = '(xB - xA) * (yC - yA) - (yB - yA) * (xC - xA)'

# A, B = A + u (u ≠ 0 car ux ≠ 0), C = A + k·u, décalé de (0, p) quand o = 1 :
# det(AB, AC) = ux × (k·uy + o·p) − uy × k·ux = o·p·ux, nul si et seulement si o = 0
VARS_ABC = [var('xa', '-3..3'), var('ya', '-3..3'), var('ux', '1|2|-1|-2'), var('uy', '-2..2'),
            var('k', '2|3|-1'), var('o', '0..1'), var('p', '1|2|-1'),
            var('xb', 'eval:xa+ux'), var('yb', 'eval:ya+uy'),
            var('dx', 'eval:k*ux'), var('dy', 'eval:k*uy+o*p'),
            var('xc', 'eval:xa+dx'), var('yc', 'eval:ya+dy'), var('det', 'eval:ux*dy-uy*dx')]

APPEL_ABC = ('`alignes(' + ev('xa') + ', ' + ev('ya') + ', ' + ev('xb') + ', ' + ev('yb') + ', '
             + ev('xc') + ', ' + ev('yc') + ')`')

ETAPES_DET = [
    '`det` est le déterminant des vecteurs $\\overrightarrow{AB}\\begin{pmatrix}x_B-x_A\\\\y_B-y_A'
    '\\end{pmatrix}$ et $\\overrightarrow{AC}\\begin{pmatrix}x_C-x_A\\\\y_C-y_A\\end{pmatrix}$.',
    'Ici $\\overrightarrow{AB}\\begin{pmatrix}' + ev('ux') + '\\\\' + ev('uy')
    + '\\end{pmatrix}$ et $\\overrightarrow{AC}\\begin{pmatrix}' + ev('dx') + '\\\\' + ev('dy')
    + '\\end{pmatrix}$, donc $\\text{det}=' + ev('ux') + '\\times' + evp('dy') + '-' + evp('uy')
    + '\\times' + evp('dx') + '=' + col(ev('det')) + '$.',
]

V321_TOURNER = case(
    'On considère la fonction Python suivante, où `(xA, yA)`, `(xB, yB)` et `(xC, yC)` sont les'
    ' coordonnées de trois points $A$, $B$, $C$ dans un repère.'
    + python(ALIGNES.replace('DET', DET))
    + 'On appelle ' + APPEL_ABC + '. Quelle est la valeur de `det` ?\n\n$?$',
    VARS_ABC, ev('det'), ETAPES_DET)

V321_COMPLETER = ligne(
    'La fonction Python ci-dessous doit renvoyer `True` si les points $A(x_A\\,;y_A)$,'
    ' $B(x_B\\,;y_B)$ et $C(x_C\\,;y_C)$ sont alignés, et `False` sinon.'
    + python(ALIGNES.replace('DET', '...'))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`' + DET + '`',
    ['`(xB - xA) * (xC - xA) - (yB - yA) * (yC - yA)`',
     '`(xB - xA) * (yC - yA) + (yB - yA) * (xC - xA)`',
     '`(xB - xA) * (yB - yA) - (xC - xA) * (yC - yA)`'],
    ['$A$, $B$, $C$ sont alignés si et seulement si les vecteurs $\\overrightarrow{AB}$ et'
     ' $\\overrightarrow{AC}$ sont colinéaires, c\'est-à-dire si leur déterminant est nul.',
     'Le déterminant de $\\begin{pmatrix}x\\\\y\\end{pmatrix}$ et'
     ' $\\begin{pmatrix}x\'\\\\y\'\\end{pmatrix}$ est $xy\'-yx\'$ : on multiplie « en croix »'
     ' l\'abscisse de l\'un par l\'ordonnée de l\'autre, puis on soustrait.',
     'Avec $\\overrightarrow{AB}\\begin{pmatrix}x_B-x_A\\\\y_B-y_A\\end{pmatrix}$ et'
     ' $\\overrightarrow{AC}\\begin{pmatrix}x_C-x_A\\\\y_C-y_A\\end{pmatrix}$ :'
     ' `det = ' + DET + '`. Les autres propositions multiplient abscisse par abscisse, ou'
     ' additionnent au lieu de soustraire.'])

V321_INTERPRETER = {
    'statement': 'On considère la fonction Python suivante, où `(xA, yA)`, `(xB, yB)` et'
    ' `(xC, yC)` sont les coordonnées de trois points $A$, $B$, $C$ dans un repère.'
    + python(ALIGNES.replace('DET', DET))
    + 'Que renvoie ' + APPEL_ABC + ' ?'
    + choix(['`True` : les points sont alignés', '`False` : les points ne sont pas alignés'],
            melanger=False),
    'variables': VARS_ABC,
    'blanks': [{'expectedAnswer': '{{o}}'}],
    'correction': {'steps': ETAPES_DET + [
        '{{if:o==0|Le déterminant est nul : $\\overrightarrow{AB}$ et $\\overrightarrow{AC}$ sont'
        ' colinéaires, la fonction renvoie `True` : $A$, $B$, $C$ sont alignés.|Le déterminant'
        ' n\'est pas nul : $\\overrightarrow{AB}$ et $\\overrightarrow{AC}$ ne sont pas'
        ' colinéaires, la fonction renvoie `False` : $A$, $B$, $C$ ne sont pas alignés.}}']},
}

# A(1 ; 2), u = (2 ; 1), k = 2 : B(3 ; 3), C(5 ; 4) alignés ; décalé de p = 1 : C(5 ; 5), det = 2
VARS_321 = {'xa': 1, 'ya': 2, 'ux': 2, 'uy': 1, 'k': 2, 'o': 0, 'p': 1, 'xb': 3, 'yb': 3,
            'dx': 4, 'dy': 2, 'xc': 5, 'yc': 4, 'det': 0}
VARS_321B = {**VARS_321, 'o': 1, 'dy': 3, 'yc': 5, 'det': 2}
# A(−1 ; 0), u = (−1 ; 2), k = −1, p = −1 : B(−2 ; 2), C(0 ; −3), det = (−1)×(−3) − 2×1 = 1
VARS_321C = {'xa': -1, 'ya': 0, 'ux': -1, 'uy': 2, 'k': -1, 'o': 1, 'p': -1, 'xb': -2, 'yb': 2,
             'dx': 1, 'dy': -3, 'xc': 0, 'yc': -3, 'det': 1}
MODELES.append(modele(
    '01-tester-alignement-trois-points', 'Tester l\'alignement de trois points en Python',
    'alignes(xA, yA, xB, yB, xC, yC) par le déterminant de AB et AC : valeur de det pour trois'
    ' points donnés, compléter la ligne du déterminant, valeur renvoyée (True ou False)',
    8, [V321_TOURNER, V321_COMPLETER, V321_INTERPRETER],
    [spec('Alignés : det = 0', 0, '0', 'correct', VARS_321),
     spec('Non alignés : det = 2', 0, '2', 'correct', VARS_321B),
     spec('Négatifs : det = 1', 0, '1', 'correct', VARS_321C),
     spec('Erreur : somme au lieu de différence', 0, '-5', 'incorrect', VARS_321C)]
    + specs_choix(1, DET, ['abscisse × abscisse', 'somme', 'mauvais vecteurs'])
    + [spec('Alignés : True', 2, '0', 'correct', VARS_321),
       spec('Erreur : False pour des points alignés', 2, '1', 'incorrect', VARS_321),
       spec('Non alignés : False', 2, '1', 'correct', VARS_321B)]))

# --- 2. 2-322 : équation réduite de la droite passant par deux points ---------------------------

EQUATION = ('def equation(xA, yA, xB, yB):\n'
            '    m = (yB - yA) / (xB - xA)\n'
            '    P\n'
            '    return m, p')
LIGNE_P = 'p = yA - m * xA'

# xB − xA = dx (1 ou 2) : m entier ou demi-entier, p décimal à une décimale au plus
VARS_AB = [var('xa', '-3..3'), var('ya', '-4..4'), var('dx', '1|2'), var('dy', '-5..5'),
           var('xb', 'eval:xa+dx'), var('yb', 'eval:ya+dy'), var('m', 'eval:dy/dx'),
           var('p', 'eval:ya-m*xa')]

V322_TOURNER = case(
    'On considère la fonction Python suivante, où `(xA, yA)` et `(xB, yB)` sont les coordonnées'
    ' de deux points $A$ et $B$ d\'abscisses différentes.'
    + python(EQUATION.replace('P', LIGNE_P))
    + 'Que renvoie `equation(' + ev('xa') + ', ' + ev('ya') + ', ' + ev('xb') + ', ' + ev('yb')
    + ')` ?\n\n$m=?$ et $p=?$',
    VARS_AB, [dec('m'), dec('p')],
    ['`m` est la pente de la droite $(AB)$ : $m=\\dfrac{y_B-y_A}{x_B-x_A}=\\dfrac{' + ev('yb')
     + '-' + evp('ya') + '}{' + ev('xb') + '-' + evp('xa') + '}=\\dfrac{' + ev('dy') + '}{'
     + ev('dx') + '}=' + col(dec('m')) + '$.',
     '`p` est l\'ordonnée à l\'origine : $A$ est sur la droite, donc $y_A=mx_A+p$ et'
     ' $p=y_A-mx_A=' + ev('ya') + '-' + decp('m') + '\\times' + evp('xa') + '=' + col(dec('p'))
     + '$.',
     'La fonction renvoie $m=' + col(dec('m')) + '$ et $p=' + col(dec('p')) + '$ : la droite'
     ' $(AB)$ a pour équation réduite $y=mx+p$ avec ces valeurs. (À l\'écran, Python écrit'
     ' des nombres à virgule, avec un point : la division `/` donne `2.0` pour $2$.)'])

V322_COMPLETER = ligne(
    'La fonction Python ci-dessous doit renvoyer la pente $m$ et l\'ordonnée à l\'origine $p$ de'
    ' la droite $(AB)$, d\'équation réduite $y=mx+p$, où $A(x_A\\,;y_A)$ et $B(x_B\\,;y_B)$ ont des'
    ' abscisses différentes.'
    + python(EQUATION.replace('P', '...'))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`' + LIGNE_P + '`', ['`p = yA + m * xA`', '`p = m * xA - yA`', '`p = yA - xA`'],
    ['$A$ est sur la droite d\'équation $y=mx+p$ : $y_A=mx_A+p$.',
     'Donc $p=y_A-mx_A$, qui s\'écrit `p = yA - m * xA` en Python.',
     '`yA + m * xA` et `m * xA - yA` se trompent de signe ; `yA - xA` oublie la pente.'])

V322_INTERPRETER = ligne(
    'On considère la fonction Python suivante, où `(xA, yA)` et `(xB, yB)` sont les coordonnées'
    ' de deux points $A$ et $B$ distincts.'
    + python(EQUATION.replace('P', LIGNE_P))
    + 'Dans quel cas l\'appel `equation(xA, yA, xB, yB)` provoque-t-il une erreur ?',
    [], 'Quand `xA == xB`', ['Quand `yA == yB`', 'Quand `xA == yA`', 'Quand `xA == 0`'],
    ['La seule opération qui peut échouer est la division `(yB - yA) / (xB - xA)` : Python'
     ' refuse de diviser par $0$ (erreur `ZeroDivisionError`).',
     'Elle échoue quand $x_B-x_A=0$, c\'est-à-dire quand `xA == xB` : la droite $(AB)$ est alors'
     ' parallèle à l\'axe des ordonnées. Elle n\'a pas de pente ni d\'équation réduite, mais une'
     ' équation de la forme $x=x_A$.',
     'Quand `yA == yB`, la pente vaut $0$ (droite parallèle à l\'axe des abscisses) : aucune'
     ' erreur. `xA == yA` ou `xA == 0` ne rendent pas le dénominateur nul.'])

# A(1 ; 2), B(3 ; 5) : m = 3/2 = 1,5 ; p = 2 − 1,5 = 0,5
VARS_322 = {'xa': 1, 'ya': 2, 'dx': 2, 'dy': 3, 'xb': 3, 'yb': 5, 'm': '3/2', 'p': '1/2'}
# A(−2 ; 1), B(−1 ; −3) : m = −4 ; p = 1 − (−4)(−2) = −7
VARS_322B = {'xa': -2, 'ya': 1, 'dx': 1, 'dy': -4, 'xb': -1, 'yb': -3, 'm': -4, 'p': -7}
MODELES.append(modele(
    '02-equation-droite-deux-points', 'Équation réduite d\'une droite par deux points, en Python',
    'equation(xA, yA, xB, yB) renvoie la pente m et l\'ordonnée à l\'origine p : valeurs renvoyées'
    ' (deux cases), compléter la ligne de p, cas d\'erreur (xA == xB, division par zéro)',
    11, [V322_TOURNER, V322_COMPLETER, V322_INTERPRETER],
    [spec('A(1 ; 2), B(3 ; 5) : 1,5 et 0,5', 0, ['1,5', '0,5'], 'correct', VARS_322),
     spec('Fractions : forme décimale demandée (Python renvoie 1.5)', 0,
          ['\\frac{3}{2}', '\\frac{1}{2}'], 'bad_form',
          VARS_322, ['form', 'form']),
     spec('Négatifs : −4 et −7', 0, ['-4', '-7'], 'correct', VARS_322B),
     spec('Erreur : p = yA + m·xA', 0, ['-4', '9'], 'incorrect', VARS_322B),
     spec('Erreur : pente inversée', 0, ['2/3', '0,5'], 'incorrect', VARS_322)]
    + specs_choix(1, LIGNE_P, ['yA + m * xA', 'm * xA - yA', 'yA - xA'])
    + specs_choix(2, 'xA == xB', ['yA == yB', 'xA == yA', 'xA == 0'])))

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
