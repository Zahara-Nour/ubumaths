"""Écrit les 10 modèles du lot « dérivation » de la 1re spé dans scripts/questions/1spe-derivation/.

Phase 0 validée par David le 2026-11-01 (§ 18 du journal « docs/wip/questions-1spe-progress.md »),
un point par modèle :

| #  | Point    | Titre                                         | Fonctions › Dérivation › …, niveau |
| 1  | 1SPE-259 | Utiliser la définition du taux de variation   | Taux de variation, 1               |
| 2  | 1SPE-268 | Calculer un taux de variation                 | Taux de variation, 2               |
| 3  | 1SPE-397 | Calculer la pente d'une sécante               | Taux de variation, 3               |
| 4  | 1SPE-388 | Lire la pente d'une sécante sur un graphique  | Taux de variation, 4               |
| 5  | 1SPE-262 | Fonction affine tangente                      | Approximation affine, 1            |
| 6  | 1SPE-390 | Approximation affine de f(a + h)              | Approximation affine, 2            |
| 7  | 1SPE-273 | Valeur approchée de f(a + h)                  | Approximation affine, 3            |
| 8  | 1SPE-263 | Ensemble de dérivabilité                      | Fonctions dérivées, 7 (6 pris, D24) |
| 9  | 1SPE-267 | Dérivabilité de la valeur absolue en 0        | Dérivabilité en un point, 1        |
| 10 | 1SPE-269 | Interpréter le nombre dérivé en contexte      | Nombre dérivé, 4                   |

Bornes : « lycee/1spe.json » (fonctions de la liste du BO seulement : polynômes, 1/x, √x ; aucune
composée, l1s-1 ; |x| en 0 seulement ; 390 : exemples du BO en a = 1, carré, inverse, racine).
Le nœud et le tag sont posés par la migration de rangement, après le « --publier » de David.

Décisions (David, 2026-11-01) : 262 a son propre modèle (langage de fonction, « g(x) = … »,
voisin de 272 en « y = … ») ; 269, variation 3 en case choix (en prod depuis v0.57.1).

Pièges :
- modèle 06 : forme libre (« form » coupée), sinon 1 + 0,5h est refusé (attendu 1 + h/2) ;
- case choix : la bonne réponse est écrite en premier (indice 0), le bloc mélange ;
- « {{eval:-a;+}} » pour écrire « b − a » : a ≠ 0 en condition (pas de « + 0 ») ;
- variables « e » et « i » interdites dans les « eval » ; « x|x » (ou t, q, h) = lettre libre.

    python3 docs/wip/questions/lot-1spe-derivation.py scripts/questions/1spe-derivation
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(nom, title, description, subdomain, level, variations, specs, delay=60, options=None):
    m = {'title': title, 'description': description, 'grades': ['1_SPE'],
                 'theme': 'Fonctions', 'domain': 'Dérivation', 'subdomain': subdomain,
                 'level': level, 'delay': delay, 'status': 'draft',
                 'shared': {'cleanCoefficients': True},
                 'variations': variations, 'testSpecs': specs}
    if options:
        m['options'] = options
    return nom, m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [{'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def ev(x):
    return '{{eval:' + x + '}}'


def evp(x):
    """Valeur signée, pour l'écrire après un terme : « + 3 », « − 3 »."""
    return '{{eval:' + x + ';+}}'


def evd(x):
    return '{{eval:' + x + ';d}}'


def frac(n, d):
    return '\\dfrac{' + n + '}{' + d + '}'


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + l + '\n' for l in lignes) + '```'


X = var('x', 'x|x')
TAUX = frac('f(b)-f(a)', 'b-a')
MODELES = []

# --- 1. 1SPE-259 : la définition du taux, à rebours ------------------------------------------

V259_FB = variation(
    'Le taux de variation d\'une fonction $f$ entre ${{a}}$ et ${{b}}$ vaut ${{t}}$, et'
    ' $f({{a}})={{y}}$.\n\nQue vaut $f({{b}})$ ?\n\n$f({{b}})=?$',
    [var('a', '-3..3'), var('d', '1..5'), var('b', 'eval:a+d'), var('t', '1..6;±'),
     var('y', '1..9;±')],
    [ev('y+t*d')],
    ['Le taux de variation de $f$ entre $a$ et $b$ est $' + TAUX + '$.',
     'Ici $' + frac('f({{b}})-f({{a}})', '{{b}}' + evp('-a')) + '={{t}}$, donc'
     ' $f({{b}})-f({{a}})={{t}}\\times{{d}}=' + ev('t*d') + '$.',
     '$$f({{b}})={{y}}' + evp('t*d') + '=' + col(ev('y+t*d')) + '$$'],
    ['a != 0'])
V259_B = variation(
    'Une fonction $f$ prend les valeurs du tableau ci-dessous, et son taux de variation entre'
    ' ${{a}}$ et $b$ vaut ${{t}}$.\n\n| $x$ | ${{a}}$ | $b$ |\n| --- | --- | --- |\n'
    '| $f(x)$ | ${{ya}}$ | ${{yb}}$ |\n\nQue vaut $b$ ?\n\n$b=?$',
    [var('a', '-3..3'), var('d', '1..5'), var('t', '1..4;±'), var('ya', '1..9;±'),
     var('yb', 'eval:ya+t*d')],
    [ev('a+d')],
    ['Le taux de variation de $f$ entre ${{a}}$ et $b$ est $' + frac('f(b)-f({{a}})', 'b' + evp('-a'))
     + '={{t}}$.',
     'Or $f(b)-f({{a}})={{yb}}' + evp('-ya') + '=' + ev('yb-ya') + '$, donc'
     ' $b' + evp('-a') + '=' + frac(ev('yb-ya'), '{{t}}') + '={{d}}$.',
     '$$b=' + col(ev('a+d')) + '$$'],
    ['a != 0', 'abs(yb) <= 20'])

MODELES.append(modele(
    '01-definition-taux-de-variation', 'Utiliser la définition du taux de variation',
    'Le taux (f(b) − f(a))/(b − a) étant connu, retrouver f(b), ou b à partir d\'un tableau de'
    ' valeurs',
    'Taux de variation', 1, [V259_FB, V259_B],
    [spec('a = 1, b = 3, taux 3, f(1) = 4 : f(3) = 10', 0,
          {'a': 1, 'd': 2, 'b': 3, 't': 3, 'y': 4}, '10', 'correct'),
     spec('Erreur : f(a) + taux, sans (b − a) : 7', 0,
          {'a': 1, 'd': 2, 'b': 3, 't': 3, 'y': 4}, '7', 'incorrect'),
     spec('a = 1, taux 2, f(1) = 5, f(b) = 11 : b = 4', 1,
          {'a': 1, 'd': 3, 't': 2, 'ya': 5, 'yb': 11}, '4', 'correct'),
     spec('Erreur : b − a au lieu de b : 3', 1,
          {'a': 1, 'd': 3, 't': 2, 'ya': 5, 'yb': 11}, '3', 'incorrect')],
    delay=45))

# --- 2. 1SPE-268 : calculer un taux de variation ---------------------------------------------

V268_POLY = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=' + ev('m*x^2+n*x+c') + '$.\n\n'
    'Calcule le taux de variation de $f$ entre ${{a}}$ et ${{b}}$.\n\n'
    '$' + frac('f({{b}})-f({{a}})', '{{b}}' + evp('-a')) + '=?$',
    [X, var('m', '1..3;±'), var('n', '1..5;±'), var('c', '1..6;±'), var('a', '-3..2'),
     var('d', '1..3'), var('b', 'eval:a+d'), var('fa', 'eval:m*a^2+n*a+c'),
     var('fb', 'eval:m*b^2+n*b+c')],
    [ev('m*(a+b)+n')],
    ['On calcule les deux images : $f({{a}})={{fa}}$ et $f({{b}})={{fb}}$.',
     '$$' + frac('f({{b}})-f({{a}})', '{{b}}' + evp('-a')) + '='
     + frac('{{fb}}' + evp('-fa'), '{{d}}') + '=' + frac(ev('fb-fa'), '{{d}}') + '='
     + col(ev('m*(a+b)+n')) + '$$'],
    ['a != 0', 'fa != 0'])
V268_INVERSE = variation(
    'Soit $f$ la fonction inverse, définie sur $]0\\,;+\\infty[$ par $f(x)=\\dfrac{1}{x}$.\n\n'
    'Calcule le taux de variation de $f$ entre ${{a}}$ et ${{b}}$.\n\n'
    '$' + frac('f({{b}})-f({{a}})', '{{b}}-{{a}}') + '=?$',
    [var('a', '2..5'), var('b', '3..7')],
    ['-\\dfrac{1}{' + ev('a*b') + '}'],
    ['$f({{b}})-f({{a}})=\\dfrac{1}{ {{b}} }-\\dfrac{1}{ {{a}} }='
     + frac('{{a}}-{{b}}', ev('a*b')) + '=' + frac(ev('a-b'), ev('a*b')) + '$.',
     'On divise par ${{b}}-{{a}}=' + ev('b-a') + '$ : $$' + frac('f({{b}})-f({{a}})', '{{b}}-{{a}}')
     + '=' + frac(ev('a-b'), ev('a*b') + '\\times' + ev('b-a')) + '='
     + col('-\\dfrac{1}{' + ev('a*b') + '}') + '$$'],
    ['a < b'])
V268_RACINE = variation(
    'Soit $f$ la fonction racine carrée, définie sur $[0\\,;+\\infty[$ par $f(x)=\\sqrt{x}$.\n\n'
    'Calcule le taux de variation de $f$ entre ${{a}}$ et ${{b}}$.\n\n'
    '$' + frac('f({{b}})-f({{a}})', '{{b}}-{{a}}') + '=?$',
    [var('r', '1..4'), var('d', '1..3'), var('s', 'eval:r+d'), var('a', 'eval:r^2'),
     var('b', 'eval:s^2')],
    ['\\dfrac{1}{' + ev('r+s') + '}'],
    ['$f({{a}})=\\sqrt{ {{a}} }={{r}}$ et $f({{b}})=\\sqrt{ {{b}} }={{s}}$.',
     '$$' + frac('f({{b}})-f({{a}})', '{{b}}-{{a}}') + '=' + frac('{{s}}-{{r}}', ev('b-a'))
     + '{{if:d==1||=\\dfrac{ {{d}} }{' + ev('b-a') + '}}}=' + col('\\dfrac{1}{' + ev('r+s') + '}') + '$$'])

MODELES.append(modele(
    '02-calculer-taux-de-variation', 'Calculer un taux de variation',
    'Taux de variation (f(b) − f(a))/(b − a) d\'un polynôme du second degré, de la fonction'
    ' inverse, de la racine carrée entre deux carrés',
    'Taux de variation', 2, [V268_POLY, V268_INVERSE, V268_RACINE],
    [spec('f(x) = x² + 2x + 3, entre 1 et 3 : 6', 0,
          {'m': 1, 'n': 2, 'c': 3, 'a': 1, 'd': 2, 'b': 3, 'fa': 6, 'fb': 18}, '6', 'correct'),
     spec('Erreur : f(b) − f(a) sans diviser : 12', 0,
          {'m': 1, 'n': 2, 'c': 3, 'a': 1, 'd': 2, 'b': 3, 'fa': 6, 'fb': 18}, '12', 'incorrect'),
     spec('Inverse entre 2 et 3 : −1/6', 1, {'a': 2, 'b': 3}, '-\\frac{1}{6}', 'correct'),
     spec('Erreur de signe : 1/6', 1, {'a': 2, 'b': 3}, '\\frac{1}{6}', 'incorrect'),
     spec('Racine entre 1 et 4 : 1/3', 2, {'r': 1, 'd': 1, 's': 2, 'a': 1, 'b': 4},
          '\\frac{1}{3}', 'correct'),
     spec('Erreur : √4 − √1 sans diviser : 1', 2, {'r': 1, 'd': 1, 's': 2, 'a': 1, 'b': 4},
          '1', 'incorrect')],
    delay=60))

# --- 3. 1SPE-397 : pente d'une sécante ----------------------------------------------------------

V397_PENTE = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=' + ev('x^3+n*x') + '$, de courbe'
    ' $\\mathcal{C}_f$. $A$ et $B$ sont les points de $\\mathcal{C}_f$ d\'abscisses ${{a}}$ et'
    ' ${{b}}$.\n\nCalcule le coefficient directeur de la sécante $(AB)$.\n\n$m=?$',
    [X, var('n', '1..4;±'), var('a', '-2..1'), var('d', '1..3'), var('b', 'eval:a+d'),
     var('fa', 'eval:a^3+n*a'), var('fb', 'eval:b^3+n*b')],
    [ev('(fb-fa)/d')],
    ['$A({{a}}\\,;{{fa}})$ et $B({{b}}\\,;{{fb}})$ : on calcule les ordonnées avec $f$.',
     'Le coefficient directeur de $(AB)$ est le taux de variation de $f$ entre ${{a}}$ et'
     ' ${{b}}$ : $$m=' + frac('y_B-y_A', 'x_B-x_A') + '=' + frac('{{fb}}' + evp('-fa'),
                                                           '{{b}}' + evp('-a'))
     + '=' + frac(ev('fb-fa'), '{{d}}') + '=' + col(ev('(fb-fa)/d')) + '$$'],
    ['a != 0', 'fa != 0', 'abs(fb) <= 40'])
V397_EQUATION = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=' + ev('x^2+n*x+c') + '$, de courbe'
    ' $\\mathcal{C}_f$. $A$ et $B$ sont les points de $\\mathcal{C}_f$ d\'abscisses ${{a}}$ et'
    ' ${{b}}$.\n\nCalcule le coefficient directeur $m$ de la sécante $(AB)$, puis donne son'
    ' équation réduite.\n\n$m=?$\n\n$y=?$',
    [X, var('n', '1..5;±'), var('c', '1..6;±'), var('a', '-3..2'), var('d', '1..3'),
     var('b', 'eval:a+d'), var('fa', 'eval:a^2+n*a+c'), var('fb', 'eval:b^2+n*b+c'),
     var('k', 'eval:a+b+n'), var('p', 'eval:fa-k*a')],
    [ev('k'), ev('k*x+p')],
    ['$A({{a}}\\,;{{fa}})$ et $B({{b}}\\,;{{fb}})$ : $$m=' + frac('{{fb}}' + evp('-fa'),
                                                                 '{{b}}' + evp('-a'))
     + '=' + frac(ev('fb-fa'), '{{d}}') + '=' + col('{{k}}') + '$$',
     '$(AB)$ passe par $A$ : $y={{k}}(x' + evp('-a') + ')' + evp('fa') + '$, soit'
     ' $$y=' + col(ev('k*x+p')) + '$$'],
    ['a != 0', 'fa != 0', 'k != 0'])

MODELES.append(modele(
    '03-pente-d-une-secante', 'Calculer la pente d\'une sécante',
    'Coefficient directeur de la sécante (AB), A et B sur la courbe d\'une fonction ; puis'
    ' équation réduite de (AB)',
    'Taux de variation', 3, [V397_PENTE, V397_EQUATION],
    [spec('f(x) = x³ + x, entre 1 et 2 : 8', 0,
          {'n': 1, 'a': 1, 'd': 1, 'b': 2, 'fa': 2, 'fb': 10}, '8', 'correct'),
     spec('Erreur de signe : −8', 0,
          {'n': 1, 'a': 1, 'd': 1, 'b': 2, 'fa': 2, 'fb': 10}, '-8', 'incorrect'),
     spec('f(x) = x² + x + 2, entre 1 et 2 : m = 4, y = 4x', 1,
          {'n': 1, 'c': 2, 'a': 1, 'd': 1, 'b': 2, 'fa': 4, 'fb': 8, 'k': 4, 'p': 0},
          ['4', '4x'], 'correct'),
     spec('Erreur : ordonnée à l\'origine f(a) : y = 4x + 4', 1,
          {'n': 1, 'c': 2, 'a': 1, 'd': 1, 'b': 2, 'fa': 4, 'fb': 8, 'k': 4, 'p': 0},
          ['4', '4x+4'], 'incorrect')],
    delay=75))

# --- 4. 1SPE-388 : sécante lue sur la courbe -------------------------------------------------

F388 = ('({{q}})/2*(x-({{a}}))*(x-({{b}}))+({{s}})*(x-({{a}}))+({{ya}})')
G388 = '({{s}})*(x-({{a}}))+({{ya}})'
VARS388 = [var('a', '-3..0'), var('d', '2..3'), var('b', 'eval:a+d'), var('ya', '-2..2'),
           var('s', '1..2;±'), var('yb', 'eval:ya+s*d'), var('q', '1|-1')]
COND388 = ['abs(yb) <= 4']


def courbe388(secante, description):
    lignes = ['x: -5 ; 5', 'y: -5 ; 5', 'grille: 1 ; 1', 'f(x) = ' + F388 + '   bleu']
    if secante:
        lignes.append('g(x) = ' + G388 + '   rouge   pointillé')
    lignes += ['points: A({{a}} ; {{ya}}), B({{b}} ; {{yb}})', 'taille: moyenne',
               'description: ' + description]
    return '\n\n```courbe\n' + '\n'.join(lignes) + '\n```'


CORR388 = ['$A({{a}}\\,;{{ya}})$ et $B({{b}}\\,;{{yb}})$ sont sur des nœuds de la grille.',
           'Le coefficient directeur de $(AB)$ est $$m=' + frac('y_B-y_A', 'x_B-x_A') + '='
           + frac('{{yb}}' + evp('-ya'), '{{b}}' + evp('-a')) + '=' + frac(ev('yb-ya'), '{{d}}')
           + '=' + col('{{s}}') + '$$',
           'C\'est aussi le taux de variation de $f$ entre ${{a}}$ et ${{b}}$.']
V388_TRACEE = variation(
    'La courbe $\\mathcal{C}_f$ d\'une fonction $f$ (trait plein) et la sécante $(AB)$ (en'
    ' pointillés) sont tracées ci-dessous.'
    + courbe388(True, 'Courbe d\'une fonction et sa sécante (AB), en pointillés.')
    + '\n\nLis le coefficient directeur de la sécante $(AB)$.\n\n$m=?$',
    VARS388, ['{{s}}'], CORR388, COND388 + ['a != 0', 'ya != 0'])
V388_POINTS = variation(
    'Les points $A$ et $B$ sont sur la courbe $\\mathcal{C}_f$ d\'une fonction $f$.'
    + courbe388(False, 'Courbe d\'une fonction et deux points A et B sur la courbe.')
    + '\n\nQuel est le coefficient directeur de la sécante $(AB)$ ?\n\n$m=?$',
    VARS388, ['{{s}}'], CORR388, COND388 + ['a != 0', 'ya != 0'])
S388 = {'a': -1, 'd': 2, 'b': 1, 'ya': 1, 's': 1, 'yb': 3, 'q': 1}

MODELES.append(modele(
    '04-lire-pente-d-une-secante', 'Lire la pente d\'une sécante sur un graphique',
    'Coefficient directeur de la sécante (AB) lu sur la courbe, A et B sur des nœuds de la'
    ' grille ; sécante tracée, puis points seuls',
    'Taux de variation', 4, [V388_TRACEE, V388_POINTS],
    [spec('A(−1 ; 1), B(1 ; 3) : 1', 0, S388, '1', 'correct'),
     spec('Erreur : Δy seul, 2', 0, S388, '2', 'incorrect'),
     spec('Points seuls : 1', 1, S388, '1', 'correct'),
     spec('Erreur : Δy seul, 2', 1, S388, '2', 'incorrect')],
    delay=45))

# --- 5. 1SPE-262 : fonction affine tangente --------------------------------------------------

TANGENTE = 'g(x)=f(a)+f\'(a)(x-a)'


def v262(fonction, ens, variables, fa, fpa, reponse, conditions=None):
    return variation(
        'Soit $f$ la fonction définie sur $' + ens + '$ par $f(x)=' + fonction + '$.\n\n'
        'Donne, sous forme réduite, la fonction affine tangente $g$ à $f$ en ${{a}}$.\n\n'
        '$g(x)=?$',
        variables, [reponse],
        ['La fonction affine tangente à $f$ en $a$ est $' + TANGENTE + '$.',
         'Ici $f({{a}})=' + fa + '$ et $f\'({{a}})=' + fpa + '$, donc'
         ' $g(x)=' + fa + '+\\left(' + fpa + '\\right)(x' + evp('-a') + ')$.',
         '$$g(x)=' + col(reponse) + '$$'],
        conditions)


V262_CARRE = v262('x^2', '\\mathbb{R}', [X, var('a', '1..4;±')], ev('a^2'), ev('2*a'),
                  ev('2*a*x-a^2'))
V262_CUBE = v262('x^3', '\\mathbb{R}', [X, var('a', '1..2;±')], ev('a^3'), ev('3*a^2'),
                 ev('3*a^2*x-2*a^3'))
V262_INVERSE = v262('\\dfrac{1}{x}', '\\mathbb{R}^*', [X, var('a', '1..4;±')], ev('1/a'),
                    ev('-1/a^2'), ev('-x/a^2+2/a'))
V262_RACINE = variation(
    'Soit $f$ la fonction définie sur $[0\\,;+\\infty[$ par $f(x)=\\sqrt{x}$.\n\n'
    'Donne, sous forme réduite, la fonction affine tangente $g$ à $f$ en ${{a}}$.\n\n$g(x)=?$',
    [X, var('r', '1..3'), var('a', 'eval:r^2')], [ev('x/(2*r)+r/2')],
    ['La fonction affine tangente à $f$ en $a$ est $' + TANGENTE + '$, avec'
     ' $f\'(x)=\\dfrac{1}{2\\sqrt{x}}$.',
     'Ici $f({{a}})={{r}}$ et $f\'({{a}})=\\dfrac{1}{' + ev('2*r') + '}$.',
     '$$g(x)=' + col(ev('x/(2*r)+r/2')) + '$$'])

MODELES.append(modele(
    '05-fonction-affine-tangente', 'Fonction affine tangente',
    'Fonction affine tangente x ↦ f(a) + f′(a)(x − a), sous forme réduite, pour le carré, le'
    ' cube, l\'inverse et la racine carrée',
    'Approximation affine', 1, [V262_CARRE, V262_CUBE, V262_INVERSE, V262_RACINE],
    [spec('Carré en 3 : 6x − 9', 0, {'a': 3}, '6x-9', 'correct'),
     spec('Erreur de signe : 6x + 9', 0, {'a': 3}, '6x+9', 'incorrect'),
     spec('Cube en 1 : 3x − 2', 1, {'a': 1}, '3x-2', 'correct'),
     spec('Erreur : f′(a) seul, 3x', 1, {'a': 1}, '3x', 'incorrect'),
     spec('Inverse en 2 : −x/4 + 1', 2, {'a': 2}, '-\\frac{1}{4}x+1', 'correct'),
     spec('Inverse : autre écriture', 2, {'a': 2}, '1-\\frac{x}{4}', 'correct'),
     spec('Erreur de signe sur f′ : x/4 + 1', 2, {'a': 2}, '\\frac{1}{4}x+1', 'incorrect'),
     spec('Racine en 4 : x/4 + 1', 3, {'r': 2, 'a': 4}, '\\frac{x}{4}+1', 'correct'),
     spec('Erreur : + f(a) seul, x/4 + 2', 3, {'r': 2, 'a': 4}, '\\frac{x}{4}+2', 'incorrect')],
    delay=60))

# --- 6. 1SPE-390 : approximation f(a + h) ≈ f(a) + f′(a)h ------------------------------------

APPROX = 'f(a+h)\\approx f(a)+f\'(a)h'


def v390(expression, f, fa, fpa, reponse, variables=None, a='1'):
    return variation(
        'Pour $h$ proche de $0$, donne l\'approximation affine de $' + expression + '$.\n\n'
        '$' + expression + '\\approx ?$',
        variables or [], [reponse],
        ['Avec $f(x)=' + f + '$ et $a=' + a + '$ : $' + APPROX + '$.',
         'Ici $f(' + a + ')=' + fa + '$ et $f\'(' + a + ')=' + fpa + '$, donc'
         ' $$' + expression + '\\approx ' + col(reponse) + '$$'])


V390_CARRE = v390('(1+h)^2', 'x^2', '1', '2', '1+2h')
V390_INVERSE = v390('\\dfrac{1}{1+h}', '\\dfrac{1}{x}', '1', '-1', '1-h')
V390_RACINE = v390('\\sqrt{1+h}', '\\sqrt{x}', '1', '\\dfrac{1}{2}', '1+\\dfrac{h}{2}')
V390_CARRE_A = v390('({{a}}+h)^2', 'x^2', ev('a^2'), ev('2*a'), ev('a^2+2*a*h'),
                    [var('h', 'h|h'), var('a', '2..6')], a='{{a}}')

MODELES.append(modele(
    '06-approximation-affine', 'Approximation affine de f(a + h)',
    'f(a + h) ≈ f(a) + f′(a)h, en fonction de h : carré, inverse, racine carrée en 1, carré en a',
    'Approximation affine', 2, [V390_CARRE, V390_INVERSE, V390_RACINE, V390_CARRE_A],
    [spec('(1 + h)² ≈ 1 + 2h', 0, {}, '1+2h', 'correct'),
     spec('Autre ordre : 2h + 1', 0, {}, '2h+1', 'correct'),
     spec('Erreur : valeur exacte développée', 0, {}, '1+2h+h^2', 'incorrect'),
     spec('Erreur : 1 + h', 0, {}, '1+h', 'incorrect'),
     spec('1/(1 + h) ≈ 1 − h', 1, {}, '1-h', 'correct'),
     spec('Erreur de signe : 1 + h', 1, {}, '1+h', 'incorrect'),
     spec('√(1 + h) ≈ 1 + h/2', 2, {}, '1+\\frac{h}{2}', 'correct'),
     spec('Autre écriture : 1 + 0,5h', 2, {}, '1+0{,}5h', 'correct'),
     spec('Erreur : 1 + h', 2, {}, '1+h', 'incorrect'),
     spec('(3 + h)² ≈ 9 + 6h', 3, {'a': 3}, '9+6h', 'correct'),
     spec('Erreur : 9 + 3h', 3, {'a': 3}, '9+3h', 'incorrect')],
    delay=45, options={'constraints': {'form': 'off'}}))

# --- 7. 1SPE-273 : valeur approchée de f(a + h) ----------------------------------------------

V273_DONNE = variation(
    '$f$ est une fonction dérivable sur $\\mathbb{R}$, avec $f({{a}})={{y}}$ et'
    ' $f\'({{a}})={{k}}$.\n\nÀ l\'aide de l\'approximation affine de $f$ en ${{a}}$, donne une'
    ' valeur approchée de $f(' + evd('a+hh/10') + ')$.\n\n$f(' + evd('a+hh/10') + ')\\approx ?$',
    [var('a', '1..5'), var('y', '1..9;±'), var('k', '1..6;±'), var('hh', '1..3;±')],
    [evd('y+k*hh/10')],
    ['$' + APPROX + '$, avec $a={{a}}$ et $h=' + evd('hh/10') + '$.',
     '$$f(' + evd('a+hh/10') + ')\\approx {{y}}' + evp('k') + '\\times(' + evd('hh/10') + ')='
     + col(evd('y+k*hh/10')) + '$$'])
V273_RACINE = variation(
    'À l\'aide d\'une approximation affine, donne une valeur approchée de'
    ' $\\sqrt{' + evd('r^2+hh/100') + '}$.\n\n$\\sqrt{' + evd('r^2+hh/100') + '}\\approx ?$',
    [var('r', '2|4|5'), var('hh', '1..9;±')],
    [evd('r+hh/(200*r)')],
    ['On prend $f(x)=\\sqrt{x}$, $a=' + ev('r^2') + '$ et $h=' + evd('hh/100') + '$ :'
     ' $f(a)={{r}}$ et $f\'(a)=\\dfrac{1}{2\\sqrt{a}}=\\dfrac{1}{' + ev('2*r') + '}$.',
     '$$\\sqrt{' + evd('r^2+hh/100') + '}\\approx {{r}}+\\dfrac{' + evd('hh/100') + '}{'
     + ev('2*r') + '}=' + col(evd('r+hh/(200*r)')) + '$$'])
V273_INVERSE = variation(
    'À l\'aide d\'une approximation affine, donne une valeur approchée de'
    ' $\\dfrac{1}{' + evd('1+hh/100') + '}$.\n\n$\\dfrac{1}{' + evd('1+hh/100') + '}\\approx ?$',
    [var('hh', '1..5;±')],
    [evd('1-hh/100')],
    ['On prend $f(x)=\\dfrac{1}{x}$, $a=1$ et $h=' + evd('hh/100') + '$ : $f(1)=1$ et'
     ' $f\'(1)=-1$.',
     '$$\\dfrac{1}{' + evd('1+hh/100') + '}\\approx 1-(' + evd('hh/100') + ')='
     + col(evd('1-hh/100')) + '$$'])
V273_CARRE = variation(
    'À l\'aide d\'une approximation affine, donne une valeur approchée de'
    ' $' + evd('1+hh/1000') + '^2$.\n\n$' + evd('1+hh/1000') + '^2\\approx ?$',
    [var('hh', '1..9;±')],
    [evd('1+hh/500')],
    ['On prend $f(x)=x^2$, $a=1$ et $h=' + evd('hh/1000') + '$ : $f(1)=1$ et $f\'(1)=2$.',
     '$$' + evd('1+hh/1000') + '^2\\approx 1+2\\times(' + evd('hh/1000') + ')='
     + col(evd('1+hh/500')) + '$$'])

MODELES.append(modele(
    '07-valeur-approchee', 'Valeur approchée de f(a + h)',
    'Valeur décimale approchée de f(a + h) par f(a) + f′(a)h : f(a) et f′(a) donnés, puis √, 1/x et'
    ' x² à reconnaître',
    'Approximation affine', 3, [V273_DONNE, V273_RACINE, V273_INVERSE, V273_CARRE],
    [spec('f(2) = 5, f′(2) = −3, f(2,1) ≈ 4,7', 0, {'a': 2, 'y': 5, 'k': -3, 'hh': 1},
          '4{,}7', 'correct'),
     spec('Erreur de signe : 5,3', 0, {'a': 2, 'y': 5, 'k': -3, 'hh': 1}, '5{,}3', 'incorrect'),
     spec('√4,02 ≈ 2,005', 1, {'r': 2, 'hh': 2}, '2{,}005', 'correct'),
     spec('Erreur : f′(a) = 1/√a, 2,01', 1, {'r': 2, 'hh': 2}, '2{,}01', 'incorrect'),
     spec('1/0,98 ≈ 1,02', 2, {'hh': -2}, '1{,}02', 'correct'),
     spec('Erreur de signe : 0,98', 2, {'hh': -2}, '0{,}98', 'incorrect'),
     spec('1,003² ≈ 1,006', 3, {'hh': 3}, '1{,}006', 'correct'),
     spec('Erreur : 1,003', 3, {'hh': 3}, '1{,}003', 'incorrect')],
    delay=60))

# --- 8. 1SPE-263 : ensemble de dérivabilité --------------------------------------------------

R = '$\\mathbb{R}$'
R_PLUS_OUVERT = '$]0\\,;+\\infty[$'
R_PLUS_FERME = '$[0\\,;+\\infty[$'
R_ETOILE = '$]-\\infty\\,;0[\\,\\cup\\,]0\\,;+\\infty[$'
ENSEMBLES = [R, R_PLUS_OUVERT, R_PLUS_FERME, R_ETOILE]


def v263(fonction, juste, raison):
    autres = [e for e in ENSEMBLES if e != juste]
    return variation(
        'Sur quel ensemble la fonction $f$ définie par $f(x)=' + fonction + '$ est-elle'
        ' dérivable ?' + choix([juste] + autres),
        [], ['0'], [raison, 'Conclusion : $f$ est dérivable sur ' + juste + '.'])


V263_INVERSE = v263('\\dfrac{1}{x}', R_ETOILE,
                    'La fonction inverse n\'est pas définie en $0$ ; elle est dérivable sur'
                    ' chacun des intervalles $]-\\infty\\,;0[$ et $]0\\,;+\\infty[$, de dérivée'
                    ' $-\\dfrac{1}{x^2}$.')
V263_RACINE = v263('\\sqrt{x}', R_PLUS_OUVERT,
                   'La racine carrée est définie sur $[0\\,;+\\infty[$, mais pas dérivable en'
                   ' $0$ : sa dérivée $\\dfrac{1}{2\\sqrt{x}}$ n\'existe pas en $0$.')
V263_CUBE = v263('x^3', R, 'Une fonction polynôme est dérivable sur $\\mathbb{R}$ : ici'
                 ' $f\'(x)=3x^2$.')
V263_PUISSANCE = v263('\\dfrac{1}{x^2}', R_ETOILE,
                      '$f(x)=x^{-2}$ n\'est pas définie en $0$ ; elle est dérivable sur'
                      ' $]-\\infty\\,;0[$ et sur $]0\\,;+\\infty[$, de dérivée'
                      ' $-\\dfrac{2}{x^3}$.')

MODELES.append(modele(
    '08-ensemble-de-derivabilite', 'Ensemble de dérivabilité',
    'Ensemble sur lequel une fonction de référence est dérivable (1/x, √x, x³, 1/x²), case choix',
    'Fonctions dérivées', 7, [V263_INVERSE, V263_RACINE, V263_CUBE, V263_PUISSANCE],
    [spec('Inverse : ℝ*', 0, {}, '0', 'correct'),
     spec('Erreur : ℝ', 0, {}, '1', 'incorrect'),
     spec('Racine : ]0 ; +∞[', 1, {}, '0', 'correct'),
     spec('Erreur : [0 ; +∞[', 1, {}, '2', 'incorrect'),
     spec('Cube : ℝ', 2, {}, '0', 'correct'),
     spec('Erreur : ]0 ; +∞[', 2, {}, '1', 'incorrect'),
     spec('1/x² : ℝ*', 3, {}, '0', 'correct'),
     spec('Erreur : ]0 ; +∞[', 3, {}, '2', 'incorrect')],
    delay=30))

# --- 9. 1SPE-267 : |x| en 0 --------------------------------------------------------------------

OUI_NON = choix(['Oui', 'Non'], melanger=False)  # « Non » = indice 1
CONCLUSION267 = ['À droite de $0$, le taux vaut $1$ ; à gauche, il vaut $-1$ : quand $h$ tend vers'
                 ' $0$, il ne s\'approche pas d\'un **seul** nombre.',
                 'Conclusion : la fonction valeur absolue $' + col('\\text{n\'est pas dérivable}')
                 + '$ en $0$ (sa courbe y fait une pointe).']
V267_NOMBRES = variation(
    'Soit $f$ la fonction valeur absolue : $f(x)=|x|$.\n\nCalcule le taux de variation de $f$'
    ' entre $0$ et $h$, pour $h=' + evd('u/10') + '$ puis pour $h=' + evd('-w/100') + '$.\n\n'
    'Pour $h=' + evd('u/10') + '$ : $\\dfrac{f(h)-f(0)}{h}=?$\n\n'
    'Pour $h=' + evd('-w/100') + '$ : $\\dfrac{f(h)-f(0)}{h}=?$\n\n'
    'La fonction $f$ est-elle dérivable en $0$ ?' + OUI_NON,
    [var('u', '1..9'), var('w', '1..9')], ['1', '-1', '1'],
    ['Pour $h=' + evd('u/10') + '$ : $\\dfrac{|' + evd('u/10') + '|}{' + evd('u/10') + '}=1$.',
     'Pour $h=' + evd('-w/100') + '$ : $\\dfrac{|' + evd('-w/100') + '|}{' + evd('-w/100')
     + '}=\\dfrac{' + evd('w/100') + '}{' + evd('-w/100') + '}=-1$.'] + CONCLUSION267)
V267_LETTRES = variation(
    'Soit $f$ la fonction valeur absolue : $f(x)=|x|$. Pour $h\\neq0$, le taux de variation de'
    ' $f$ entre $0$ et $h$ est $\\dfrac{f(h)-f(0)}{h}=\\dfrac{|h|}{h}$.\n\n'
    'Si $h>0$ : $\\dfrac{|h|}{h}=?$\n\nSi $h<0$ : $\\dfrac{|h|}{h}=?$\n\n'
    'La fonction $f$ est-elle dérivable en $0$ ?' + OUI_NON,
    [], ['1', '-1', '1'],
    ['Si $h>0$, $|h|=h$ et $\\dfrac{|h|}{h}=1$. Si $h<0$, $|h|=-h$ et'
     ' $\\dfrac{|h|}{h}=\\dfrac{-h}{h}=-1$.'] + CONCLUSION267)

MODELES.append(modele(
    '09-valeur-absolue-en-0', 'Dérivabilité de la valeur absolue en 0',
    'Taux de variation de |x| entre 0 et h (h > 0, h < 0), puis dérivabilité en 0 (case choix)',
    'Dérivabilité en un point', 1, [V267_NOMBRES, V267_LETTRES],
    [spec('1, −1, non', 0, {'u': 2, 'w': 5}, ['1', '-1', '1'], 'correct'),
     spec('Erreur : 1, 1 (valeur absolue oubliée au dénominateur)', 0, {'u': 2, 'w': 5},
          ['1', '1', '1'], 'incorrect'),
     spec('Erreur : « oui »', 0, {'u': 2, 'w': 5}, ['1', '-1', '0'], 'incorrect'),
     spec('Lettres : 1, −1, non', 1, {}, ['1', '-1', '1'], 'correct'),
     spec('Lettres, erreur : « oui »', 1, {}, ['1', '-1', '0'], 'incorrect')],
    delay=60))

# --- 10. 1SPE-269 : nombre dérivé en contexte ------------------------------------------------

V269_VITESSE = variation(
    'Un mobile parcourt, en $t$ secondes, une distance $d(t)=' + ev('p*t^2+q*t') + '$ (en'
    ' mètres).\n\nCalcule sa vitesse instantanée à l\'instant $t={{u}}$ s, c\'est-à-dire'
    ' $d\'({{u}})$.\n\n$v=?~\\unit{m/s}$',
    [var('t', 't|t'), var('p', '1..5'), var('q', '0..10'), var('u', '1..6')],
    [ev('2*p*u+q')],
    ['La vitesse instantanée à l\'instant $t$ est le nombre dérivé $d\'(t)$.',
     '$d\'(t)=' + ev('2*p*t+q') + '$, donc $d\'({{u}})=' + col(ev('2*p*u+q') + '~\\unit{m/s}')
     + '$.'])
V269_COUT = variation(
    'Le coût de fabrication de $q$ objets est $C(q)=' + ev('k*q^2+b*q+c') + '$ (en euros).\n\n'
    'Le coût marginal pour ${{n}}$ objets est $C\'({{n}})$. Calcule-le.\n\n'
    '$C\'({{n}})=?~\\unit{€}$',
    [var('q', 'q|q'), var('k', '1..3'), var('b', '5..20'), var('c', '100..500'),
     var('n', '5..30')],
    [ev('2*k*n+b')],
    ['$C\'(q)=' + ev('2*k*q+b') + '$.',
     '$C\'({{n}})=' + col(ev('2*k*n+b') + '~\\unit{€}') + '$ : produire un objet de plus,'
     ' au-delà de ${{n}}$, coûte environ ' + ev('2*k*n+b') + ' €.'])
V269_SENS = variation(
    'La position d\'un mobile, en mètres, est donnée à l\'instant $t$ (en secondes) par'
    ' $f(t)$. On sait que $f\'({{u}})={{w}}$.\n\nQue signifie cette égalité ?'
    + choix(['À l\'instant ${{u}}$ s, la vitesse du mobile est de ${{w}}$ m/s.',
             'En ${{u}}$ s, le mobile a parcouru ${{w}}$ m.',
             'Entre $0$ et ${{u}}$ s, la vitesse moyenne du mobile est de ${{w}}$ m/s.',
             'À l\'instant ${{w}}$ s, la vitesse du mobile est de ${{u}}$ m/s.']),
    [var('u', '2..9'), var('w', '5..30')], ['0'],
    ['Le nombre dérivé $f\'({{u}})$ est la **vitesse instantanée** à l\'instant ${{u}}$ : pas une'
     ' distance ($f({{u}})$), ni une vitesse moyenne (un taux de variation).',
     'Conclusion : $' + col('\\text{à } {{u}} \\text{ s, la vitesse est de } {{w}} \\text{ m/s}')
     + '$.'],
    ['u != w'])

MODELES.append(modele(
    '10-nombre-derive-en-contexte', 'Interpréter le nombre dérivé en contexte',
    'Vitesse instantanée d′(t₀), coût marginal C′(q₀), puis sens de f′(a) en contexte (case choix)',
    'Nombre dérivé', 4, [V269_VITESSE, V269_COUT, V269_SENS],
    [spec('d(t) = 5t² + 2t, v(3) = 32', 0, {'p': 5, 'q': 2, 'u': 3}, '32', 'correct'),
     spec('Erreur : d(3) = 51', 0, {'p': 5, 'q': 2, 'u': 3}, '51', 'incorrect'),
     spec('C(q) = q² + 10q + 200, C′(20) = 50', 1, {'k': 1, 'b': 10, 'c': 200, 'n': 20}, '50',
          'correct'),
     spec('Erreur : C(20) = 800', 1, {'k': 1, 'b': 10, 'c': 200, 'n': 20}, '800', 'incorrect'),
     spec('Sens : vitesse instantanée', 2, {'u': 3, 'w': 12}, '0', 'correct'),
     spec('Erreur : distance parcourue', 2, {'u': 3, 'w': 12}, '1', 'incorrect'),
     spec('Erreur : vitesse moyenne', 2, {'u': 3, 'w': 12}, '2', 'incorrect')],
    delay=60))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
