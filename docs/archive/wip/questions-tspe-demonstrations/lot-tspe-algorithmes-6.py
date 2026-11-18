"""Écrit les 5 modèles du lot 6 « algorithmes : équations différentielles et intégration » de la
terminale spécialité dans scripts/questions/tspe-algorithmes-6/.

Phase 0 des algorithmes validée par David le 2026-11-12 (D2 du journal
« docs/wip/questions-tspe-demonstrations-progress.md », § 18), phase 0 du lot validée le
2026-11-12 (D3, § 23). Un point par modèle, chacun sur une sous-notion existante, au-dessus des
niveaux déjà présents (relevé prod du 2026-11-12) :

| # | Point    | Titre                                                  | Niv. | Nœud du modèle                                 |
| 1 | TSPE-474 | Méthode d'Euler en Python : y′ = f et y′ = ay + b      | 1    | Éq. diff. › Généralités › méthode d'Euler      |
| 2 | TSPE-610 | Méthode des milieux en Python                          | 3    | Intégration › Calcul d'int. › méth. rectangles |
| 3 | TSPE-611 | Méthode des trapèzes en Python                         | 4    | Intégration › Calcul d'int. › méth. rectangles |
| 4 | TSPE-500 | Algorithme de Brouncker pour ln 2 en Python            | 5    | Intégration › Calcul d'int. › méth. rectangles |
| 5 | TSPE-499 | Méthode de Monte-Carlo pour une intégrale en Python    | 3    | Intégration › Intégrale et aire › aire algébr. |

Forme (D2, Q2, comme D9 de la 1re) : Python seulement ; (a) faire tourner un programme (case),
(b) compléter une ligne (case choix à 4 propositions, la première est la bonne, ordre mélangé à
l'affichage), (c) interpréter. Valeurs calculables à la main. Monte-Carlo (aléatoire) : jamais
« faites-le tourner », le décompte est donné.

Gabarits remplis par `replace`, jamais par `format` (format mange les accolades de {{eval:…}}).
Variables : jamais `e` ni `E` (constante d'Euler), ni `i`.

    python3 docs/archive/wip/questions-tspe-demonstrations/lot-tspe-algorithmes-6.py scripts/questions/tspe-algorithmes-6
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, answer, status, variables=None):
    answers = answer if isinstance(answer, list) else [answer]
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in (variables or {}).items()},
            'answers': answers,
            'expected': ({'status': status, 'constraintViolations': ['form']} if status == 'bad_form'
                         else {'status': status})}


def modele(nom, title, description, level, variations, specs):
    return nom, {'title': title, 'description': description, 'grades': ['T_SPE'],
                 'level': level, 'delay': 90, 'status': 'draft', 'shared': {},
                 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def ev(x):
    return '{{eval:' + x + '}}'


def evd(x):
    """Valeur écrite en décimal (sans `;d`, un quotient reste en fraction)."""
    return '{{eval:' + x + ';d}}'


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def python(code):
    return '\n\n```python\n' + code + '\n```\n\n'


def choix(lignes):
    return '\n\n```choix\n' + ''.join('- ' + l + '\n' for l in lignes) + '```'


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

# --- 1. TSPE-474 : méthode d'Euler pour y′ = f et y′ = ay + b ---------------------------------

EULER_AFFINE = ('def euler(a, b, y, h, n):\n'
                '    for k in range(n):\n'
                '        y = y + h * (a * y + b)\n'
                '    return y')

V474_TOURNER = case(
    'On considère la fonction Python suivante, qui applique la méthode d\'Euler à l\'équation'
    ' différentielle $y\'=ay+b$.'
    + python(EULER_AFFINE)
    + 'Que renvoie `euler(' + ev('a') + ', ' + ev('b') + ', ' + ev('y0') + ', 0.5, 2)` ?\n\n$?$',
    [var('a', '-1|1|2|3'), var('b', '1..3'), var('y0', '0|4|5'),
     var('y1', 'eval:y0+0.5*(a*y0+b)'), var('y2', 'eval:y1+0.5*(a*y1+b)')],
    evd('y2'),
    ['La boucle est parcourue deux fois, avec $h=0{,}5$.',
     'Premier tour : $a\\times y+b=' + ev('a*y0+b') + '$, donc `y` devient $' + ev('y0')
     + '+0{,}5\\times(' + ev('a*y0+b') + ')=' + evd('y1') + '$.',
     'Second tour : $a\\times y+b=' + evd('a*y1+b') + '$, donc `y` devient $' + evd('y1')
     + '+0{,}5\\times(' + evd('a*y1+b') + ')=' + col(evd('y2')) + '$.'])

EULER_F = ('def f(x):\n'
           '    return 2 * x + 1\n'
           '\n'
           'def euler(x, y, h, n):\n'
           '    for k in range(n):\n'
           '        {ligne}\n'
           '        x = x + h\n'
           '    return y')
LIGNE_EULER = 'y = y + h * f(x)'

V474_LIGNE = ligne(
    'La fonction Python ci-dessous applique la méthode d\'Euler, avec un pas $h$, à l\'équation'
    ' différentielle $y\'=f(x)$, en partant du point de coordonnées $(x\\,;\\,y)$.'
    + python(EULER_F.replace('{ligne}', '...'))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`' + LIGNE_EULER + '`',
    ['`y = y + f(x)`', '`y = h * f(x)`', '`y = y + h * f(y)`'],
    ['La méthode d\'Euler remplace la courbe, sur $[x\\,;\\,x+h]$, par sa tangente au point'
     ' d\'abscisse $x$ : $y(x+h)\\approx y(x)+h\\times y\'(x)$.',
     'Ici $y\'(x)=f(x)$ : la pente dépend de $x$, pas de $y$, et l\'accroissement est $h$ fois la'
     ' pente.',
     'La ligne est donc `' + LIGNE_EULER + '`.'])

V474_INTERPRETER = ligne(
    'On considère le programme Python suivant.'
    + python(EULER_AFFINE + '\n\nprint(euler(' + ev('a') + ', ' + ev('b') + ', 1, 0.001, '
             + ev('1000*t') + '))')
    + 'De quel nombre la valeur affichée est-elle une valeur approchée ? On note $y$ la solution'
    ' de $y\'=' + ev('a') + 'y+' + ev('b') + '$ telle que $y(0)=1$.',
    [var('a', '2|3'), var('b', '1|2'), var('t', '1|2')],
    '$y(' + ev('t') + ')$',
    ['$y\'(' + ev('t') + ')$', '$y(' + ev('1000*t') + ')$', '$y(0{,}001)$'],
    ['On part de $x=0$ et $y=1$ ; chaque tour avance de $h=0{,}001$ et calcule une valeur'
     ' approchée de $y$ au point suivant.',
     'Après $' + ev('1000*t') + '$ tours, on est arrivé en $x=' + ev('1000*t') + '\\times0{,}001='
     + ev('t') + '$.',
     'La valeur affichée approche donc $' + col('y(' + ev('t') + ')') + '$, et d\'autant mieux que'
     ' le pas est petit.'])

MODELES.append(modele(
    '01-methode-d-euler', 'Méthode d\'Euler en Python : y′ = f et y′ = ay + b',
    'Méthode d\'Euler : faire tourner deux pas de 0,5 sur y′ = ay + b (y0 ∈ {0, 4, 5}, jamais l\'équilibre −b/a), compléter la ligne'
    ' y = y + h * f(x) pour y′ = f, dire quelle valeur de la solution le programme approche',
    1, [V474_TOURNER, V474_LIGNE, V474_INTERPRETER],
    [spec('a = 1, b = 1, y0 = 4 : 10,25', 0, '10.25', 'correct',
          {'a': 1, 'b': 1, 'y0': 4, 'y1': 6.5, 'y2': 10.25}),
     spec('a = 2, b = 1, y0 = 0 : 1,5', 0, '1.5', 'correct',
          {'a': 2, 'b': 1, 'y0': 0, 'y1': 0.5, 'y2': 1.5}),
     spec('a = 2, b = 1, y0 = 0 : avec virgule', 0, '1,5', 'correct',
          {'a': 2, 'b': 1, 'y0': 0, 'y1': 0.5, 'y2': 1.5}),
     spec('Erreur : un seul pas', 0, '0.5', 'incorrect',
          {'a': 2, 'b': 1, 'y0': 0, 'y1': 0.5, 'y2': 1.5}),
     spec('a = −1, b = 3, y0 = 5 : 3,5', 0, '3.5', 'correct',
          {'a': -1, 'b': 3, 'y0': 5, 'y1': 4, 'y2': 3.5})]
    + specs_choix(1, LIGNE_EULER, ['sans h', 'sans y', 'f(y)'])
    + specs_choix(2, 'y(t)', ['y′(t)', 'y(1000 t)', 'y(h)'], {'a': 2, 'b': 1, 't': 1})))

# --- 2. TSPE-610 : méthode des milieux ---------------------------------------------------------

MILIEUX = ('def f(x):\n'
           '    return x**2\n'
           '\n'
           'def milieux(a, b, n):\n'
           '    h = (b - a) / n\n'
           '    s = 0\n'
           '    for k in range(n):\n'
           '        {ligne}\n'
           '    return s * h')
LIGNE_MILIEUX = 's = s + f(a + (k + 0.5) * h)'

V610_TOURNER = case(
    'On considère le programme Python suivant.'
    + python(MILIEUX.replace('{ligne}', LIGNE_MILIEUX))
    + 'Que renvoie `milieux(0, ' + ev('B') + ', ' + ev('n') + ')` ? On donnera la valeur exacte.'
    '\n\n$?$',
    [var('B', '1|2'), var('n', '2|4'), var('h', 'eval:B/n'),
     var('r', 'eval:B^3*(4*n^2-1)/(12*n^2)')],
    ev('r'),
    ['$h=\\dfrac{' + ev('B') + '-0}{' + ev('n') + '}=' + ev('h') + '$ ; la boucle évalue $f$ au'
     ' milieu de chacun des $' + ev('n') + '$ intervalles de longueur $h$.',
     '{{if:n==2|Les milieux sont $' + ev('h/2') + '$ et $' + ev('3*h/2') + '$, donc $s=\\left('
     + ev('h/2') + '\\right)^2+\\left(' + ev('3*h/2') + '\\right)^2=' + ev('10*h^2/4')
     + '$|Les milieux sont $' + ev('h/2') + '$, $' + ev('3*h/2') + '$, $' + ev('5*h/2') + '$ et $'
     + ev('7*h/2') + '$, donc $s=' + ev('h^2/4') + '\\times(1+9+25+49)=' + ev('21*h^2')
     + '$}}.',
     'La fonction renvoie $s\\times h=' + col(ev('r')) + '$.'])

V610_LIGNE = ligne(
    'La fonction Python ci-dessous doit calculer une valeur approchée de $\\displaystyle\\int_a^b'
    ' f(x)\\,\\mathrm{d}x$ par la méthode des milieux : on découpe $[a\\,;\\,b]$ en $n$'
    ' intervalles de longueur $h$, et chaque rectangle a pour hauteur l\'image du milieu de son'
    ' intervalle.'
    + python(MILIEUX.replace('{ligne}', '...'))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`' + LIGNE_MILIEUX + '`',
    ['`s = s + f(a + k * h)`', '`s = s + f(a + (k + 1) * h)`', '`s = s + f((k + 0.5) * h)`'],
    ['Le $k$-ième intervalle (pour $k$ allant de $0$ à $n-1$) est $[a+kh\\,;\\,a+(k+1)h]$.',
     'Son milieu est $a+kh+\\dfrac{h}{2}=a+(k+0{,}5)h$ ; avec `a + k * h` ou `a + (k + 1) * h`,'
     ' on obtiendrait les rectangles à gauche ou à droite, et sans `a` on partirait de $0$.',
     'La ligne est donc `' + LIGNE_MILIEUX + '`.'])

V610_INTERPRETER = ligne(
    'On reprend la fonction `milieux` ci-dessous, avec $f(x)=x^2$.'
    + python(MILIEUX.replace('{ligne}', LIGNE_MILIEUX))
    + 'Quand $n$ devient de plus en plus grand, de quel nombre `milieux(0, 1, n)` se'
    ' rapproche-t-elle ?',
    [], '$\\displaystyle\\int_0^1 x^2\\,\\mathrm{d}x=\\dfrac{1}{3}$',
    ['$\\dfrac{f(0)+f(1)}{2}=\\dfrac{1}{2}$', '$f(1)-f(0)=1$',
     '$f\\left(\\dfrac{1}{2}\\right)=\\dfrac{1}{4}$'],
    ['`milieux(0, 1, n)` est la somme des aires de $n$ rectangles qui recouvrent à peu près le'
     ' domaine sous la courbe de $f$, entre $0$ et $1$.',
     'Quand $n$ augmente, cette somme tend vers l\'aire sous la courbe, c\'est-à-dire'
     ' $\\displaystyle\\int_0^1 x^2\\,\\mathrm{d}x=\\left[\\dfrac{x^3}{3}\\right]_0^1=\\dfrac{1}{3}$.',
     'Elle se rapproche donc de $' + col('\\dfrac{1}{3}') + '$.'])

MODELES.append(modele(
    '02-methode-des-milieux', 'Méthode des milieux en Python',
    'Méthode des milieux pour x² sur [0 ; b] : faire tourner pour n = 2 ou 4 (valeur exacte),'
    ' compléter s = s + f(a + (k + 0.5) * h), limite quand n grandit (l\'intégrale)',
    3, [V610_TOURNER, V610_LIGNE, V610_INTERPRETER],
    [spec('B = 1, n = 2 : 5/16', 0, '\\frac{5}{16}', 'correct',
          {'B': 1, 'n': 2, 'h': '1/2', 'r': '5/16'}),
     spec('Forme : 0,3125 au lieu de la fraction', 0, '0.3125', 'bad_form', {'B': 1, 'n': 2, 'h': '1/2', 'r': '5/16'}),
     spec('Erreur : rectangles à gauche (1/8)', 0, '\\frac{1}{8}', 'incorrect',
          {'B': 1, 'n': 2, 'h': '1/2', 'r': '5/16'}),
     spec('B = 1, n = 4 : 21/64', 0, '\\frac{21}{64}', 'correct',
          {'B': 1, 'n': 4, 'h': '1/4', 'r': '21/64'}),
     spec('B = 2, n = 4 : 21/8', 0, '\\frac{21}{8}', 'correct',
          {'B': 2, 'n': 4, 'h': '1/2', 'r': '21/8'})]
    + specs_choix(1, LIGNE_MILIEUX, ['à gauche', 'à droite', 'sans a'])
    + specs_choix(2, '1/3', ['1/2', '1', '1/4'])))

# --- 3. TSPE-611 : méthode des trapèzes --------------------------------------------------------

TRAPEZES = ('def f(x):\n'
            '    return x**2\n'
            '\n'
            'def trapezes(a, b, n):\n'
            '    h = (b - a) / n\n'
            '    s = 0\n'
            '    x = a\n'
            '    for k in range(n):\n'
            '        {ligne}\n'
            '        x = x + h\n'
            '    return s')
LIGNE_TRAPEZES = 's = s + (f(x) + f(x + h)) * h / 2'

V611_TOURNER = case(
    'On considère le programme Python suivant.'
    + python(TRAPEZES.replace('{ligne}', LIGNE_TRAPEZES))
    + 'Que renvoie `trapezes(0, ' + ev('B') + ', ' + ev('n') + ')` ? On donnera la valeur exacte.'
    '\n\n$?$',
    [var('B', '1|2'), var('n', '2|4'), var('h', 'eval:B/n'),
     var('r', 'eval:B^3/3+B*h^2/6')],
    ev('r'),
    ['$h=\\dfrac{' + ev('B') + '-0}{' + ev('n') + '}=' + ev('h') + '$ ; chaque tour ajoute l\'aire'
     ' d\'un trapèze, $\\dfrac{f(x)+f(x+h)}{2}\\times h$.',
     'En regroupant, chaque image intérieure est comptée deux fois : {{if:n==2|$s=\\dfrac{h}{2}'
     '\\left(f(0)+2f(' + ev('h') + ')+f(' + ev('B') + ')\\right)=' + ev('h/2') + '\\times'
     + ev('2*h^2+B^2') + '$|$s=\\dfrac{h}{2}\\left(f(0)+2f(' + ev('h') + ')+2f(' + ev('2*h')
     + ')+2f(' + ev('3*h') + ')+f(' + ev('B') + ')\\right)=' + ev('h/2') + '\\times'
     + ev('28*h^2+B^2') + '$}}.',
     'La fonction renvoie $' + col(ev('r')) + '$.'])

V611_LIGNE = ligne(
    'La fonction Python ci-dessous doit calculer une valeur approchée de $\\displaystyle\\int_a^b'
    ' f(x)\\,\\mathrm{d}x$ par la méthode des trapèzes : sur chaque intervalle $[x\\,;\\,x+h]$, on'
    ' remplace l\'aire sous la courbe par celle du trapèze de sommets $(x\\,;\\,0)$,'
    ' $(x+h\\,;\\,0)$, $(x+h\\,;\\,f(x+h))$ et $(x\\,;\\,f(x))$.'
    + python(TRAPEZES.replace('{ligne}', '...'))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`' + LIGNE_TRAPEZES + '`',
    ['`s = s + (f(x) + f(x + h)) * h`', '`s = s + (f(x + h) - f(x)) * h / 2`',
     '`s = s + f(x) * f(x + h) * h / 2`'],
    ['Le trapèze a pour bases $f(x)$ et $f(x+h)$ et pour hauteur $h$.',
     'Son aire est $\\dfrac{\\text{somme des bases}}{2}\\times\\text{hauteur}=\\dfrac{f(x)+f(x+h)}{2}'
     '\\times h$ : sans la division par $2$, on compterait deux fois trop.',
     'La ligne est donc `' + LIGNE_TRAPEZES + '`.'])

V611_INTERPRETER = ligne(
    'On reprend la fonction `trapezes` ci-dessous, avec $f(x)=x^2$.'
    + python(TRAPEZES.replace('{ligne}', LIGNE_TRAPEZES))
    + 'Comment la valeur renvoyée par `trapezes(0, 1, 10)` se place-t-elle par rapport à'
    ' $\\displaystyle\\int_0^1 x^2\\,\\mathrm{d}x$ ?',
    [], 'Elle est supérieure, car $f$ est convexe : sur chaque intervalle, la courbe est sous la'
    ' corde.',
    ['Elle est inférieure, car $f$ est convexe : sur chaque intervalle, la courbe est sous la'
     ' corde.',
     'Elle est égale, car la méthode des trapèzes est exacte pour un polynôme.',
     'Elle est supérieure, car $f$ est croissante sur $[0\\,;\\,1]$.'],
    ['$f\'\'(x)=2>0$ : $f$ est convexe, donc sur chaque intervalle $[x\\,;\\,x+h]$ sa courbe est'
     ' sous la corde qui joint $(x\\,;\\,f(x))$ et $(x+h\\,;\\,f(x+h))$.',
     'Chaque trapèze contient donc le domaine sous la courbe : son aire est plus grande. La'
     ' croissance de $f$ ne joue aucun rôle.',
     'La valeur renvoyée est ' + '$' + col('\\text{supérieure à l\'intégrale}') + '$.'])

MODELES.append(modele(
    '03-methode-des-trapezes', 'Méthode des trapèzes en Python',
    'Méthode des trapèzes pour x² sur [0 ; b] : faire tourner pour n = 2 ou 4 (valeur exacte),'
    ' compléter s = s + (f(x) + f(x + h)) * h / 2, excès ou défaut (fonction convexe)',
    4, [V611_TOURNER, V611_LIGNE, V611_INTERPRETER],
    [spec('B = 1, n = 2 : 3/8', 0, '\\frac{3}{8}', 'correct',
          {'B': 1, 'n': 2, 'h': '1/2', 'r': '3/8'}),
     spec('Forme : 0,375 au lieu de la fraction', 0, '0.375', 'bad_form', {'B': 1, 'n': 2, 'h': '1/2', 'r': '3/8'}),
     spec('Erreur : sans diviser par 2', 0, '\\frac{3}{4}', 'incorrect',
          {'B': 1, 'n': 2, 'h': '1/2', 'r': '3/8'}),
     spec('B = 1, n = 4 : 11/32', 0, '\\frac{11}{32}', 'correct',
          {'B': 1, 'n': 4, 'h': '1/4', 'r': '11/32'}),
     spec('B = 2, n = 2 : 3', 0, '3', 'correct', {'B': 2, 'n': 2, 'h': 1, 'r': 3})]
    + specs_choix(1, LIGNE_TRAPEZES, ['sans /2', 'différence', 'produit'])
    + specs_choix(2, 'supérieure, convexe', ['inférieure', 'égale', 'croissante'])))

# --- 4. TSPE-500 : algorithme de Brouncker -----------------------------------------------------

BROUNCKER = ('def brouncker(n):\n'
             '    s = 0\n'
             '    for k in range(1, n + 1):\n'
             '        {ligne}\n'
             '    return s')
LIGNE_BROUNCKER = 's = s + 1 / ((2*k - 1) * (2*k))'

V500_TOURNER = case(
    'On considère la fonction Python suivante.'
    + python(BROUNCKER.replace('{ligne}', LIGNE_BROUNCKER))
    + 'Que renvoie `brouncker(' + ev('n') + ')` ? On donnera la valeur exacte, sous forme de'
    ' fraction.\n\n$?$',
    [var('n', '2|3'), var('r', 'eval:1/2+floor(n/2)/12+floor(n/3)/30')],
    ev('r'),
    ['Pour $k=1$, on ajoute $\\dfrac{1}{1\\times2}=\\dfrac{1}{2}$ ; pour $k=2$,'
     ' $\\dfrac{1}{3\\times4}=\\dfrac{1}{12}${{if:n==3| ; pour $k=3$, $\\dfrac{1}{5\\times6}'
     '=\\dfrac{1}{30}$|}}.',
     '{{if:n==3|$s=\\dfrac{1}{2}+\\dfrac{1}{12}+\\dfrac{1}{30}=\\dfrac{30}{60}+\\dfrac{5}{60}'
     '+\\dfrac{2}{60}$|$s=\\dfrac{1}{2}+\\dfrac{1}{12}=\\dfrac{6}{12}+\\dfrac{1}{12}$}}.',
     'La fonction renvoie $' + col(ev('r')) + '$.'])

V500_LIGNE = ligne(
    'La fonction Python ci-dessous doit renvoyer la somme de Brouncker'
    '\n\n$\\dfrac{1}{1\\times2}+\\dfrac{1}{3\\times4}+\\dfrac{1}{5\\times6}+\\cdots'
    '+\\dfrac{1}{(2n-1)\\times2n}$'
    + python(BROUNCKER.replace('{ligne}', '...'))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`' + LIGNE_BROUNCKER + '`',
    ['`s = s + 1 / (k * (k + 1))`', '`s = s + 1 / (2*k * (2*k + 1))`',
     '`s = s + (-1)**k / k`'],
    ['Les dénominateurs sont $1\\times2$, $3\\times4$, $5\\times6$ : un impair suivi du pair'
     ' suivant.',
     'Pour $k$ allant de $1$ à $n$, ce sont $(2k-1)\\times2k$ ; `k * (k + 1)` donnerait'
     ' $1\\times2$, $2\\times3$, $3\\times4$, et `2*k * (2*k + 1)` commencerait à $2\\times3$.',
     'La ligne est donc `' + LIGNE_BROUNCKER + '`.'])

V500_INTERPRETER = ligne(
    'On considère le programme Python suivant.'
    + python(BROUNCKER.replace('{ligne}', LIGNE_BROUNCKER) + '\n\nprint(brouncker(10000))')
    + 'De quel nombre la valeur affichée est-elle une valeur approchée ?',
    [], '$\\ln(2)=\\displaystyle\\int_1^2\\dfrac{1}{x}\\,\\mathrm{d}x$',
    ['$1$', '$\\dfrac{\\pi}{4}$', '$\\ln(3)$'],
    ['$\\dfrac{1}{(2k-1)\\times2k}=\\dfrac{1}{2k-1}-\\dfrac{1}{2k}$, donc la somme vaut'
     ' $1-\\dfrac{1}{2}+\\dfrac{1}{3}-\\dfrac{1}{4}+\\cdots-\\dfrac{1}{2n}$.',
     'Brouncker obtient cette somme en remplissant le domaine sous l\'hyperbole $y=\\dfrac{1}{x}$,'
     ' entre $1$ et $2$, par des rectangles de plus en plus fins ; elle tend vers l\'aire de ce'
     ' domaine.',
     'La valeur affichée approche donc $' + col('\\ln(2)') + '\\approx0{,}693$.'])

MODELES.append(modele(
    '04-algorithme-de-brouncker', 'Algorithme de Brouncker pour ln 2 en Python',
    'Somme de Brouncker 1/(1×2) + 1/(3×4) + … : faire tourner pour n = 2 ou 3 (fraction),'
    ' compléter s = s + 1 / ((2k − 1)(2k)), dire de quel nombre c\'est une valeur approchée (ln 2)',
    5, [V500_TOURNER, V500_LIGNE, V500_INTERPRETER],
    [spec('n = 2 : 7/12', 0, '\\frac{7}{12}', 'correct', {'n': 2, 'r': '7/12'}),
     spec('n = 3 : 37/60', 0, '\\frac{37}{60}', 'correct', {'n': 3, 'r': '37/60'}),
     spec('Erreur : un terme oublié (n = 3)', 0, '\\frac{7}{12}', 'incorrect',
          {'n': 3, 'r': '37/60'})]
    + specs_choix(1, LIGNE_BROUNCKER, ['k(k+1)', '2k(2k+1)', 'série harmonique alternée'])
    + specs_choix(2, 'ln 2', ['1', 'π/4', 'ln 3'])))

# --- 5. TSPE-499 : méthode de Monte-Carlo ------------------------------------------------------

MONTE_CARLO = ('from random import random\n'
               '\n'
               'def f(x):\n'
               '    return x**3\n'
               '\n'
               'def monte_carlo(N):\n'
               '    c = 0\n'
               '    for k in range(N):\n'
               '        x = 2 * random()\n'
               '        y = 8 * random()\n'
               '        {condition}\n'
               '            c = c + 1\n'
               '    return 16 * c / N')
CONDITION_MC = 'if y <= f(x):'

V499_TOURNER = case(
    'On considère le programme Python suivant : `random()` renvoie un nombre au hasard dans'
    ' $[0\\,;\\,1[$.'
    + python(MONTE_CARLO.replace('{condition}', CONDITION_MC))
    + 'On exécute `monte_carlo(1000)`. À la fin de la boucle, `c` vaut $' + ev('c') + '$. Quelle'
    ' valeur la fonction renvoie-t-elle ?\n\n$?$',
    [var('c', '230..270'), var('r', 'eval:16*c/1000')],
    evd('r'),
    ['`c` compte les points tirés dans le rectangle $[0\\,;\\,2]\\times[0\\,;\\,8]$ qui sont sous'
     ' la courbe de $f$.',
     'La fonction renvoie $\\dfrac{16\\times' + ev('c') + '}{1000}=' + col(evd('r')) + '$.',
     'C\'est l\'aire du rectangle ($16$) multipliée par la proportion de points sous la courbe :'
     ' une valeur approchée de $\\displaystyle\\int_0^2 x^3\\,\\mathrm{d}x=4$.'])

V499_LIGNE = ligne(
    'La fonction Python ci-dessous tire $N$ points au hasard dans le rectangle'
    ' $[0\\,;\\,2]\\times[0\\,;\\,8]$ et compte, dans `c`, ceux qui sont sous la courbe de $f$.'
    + python(MONTE_CARLO.replace('{condition}', '...'))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`' + CONDITION_MC + '`',
    ['`if y >= f(x):`', '`if x <= f(y):`', '`if y <= x:`'],
    ['Le point de coordonnées $(x\\,;\\,y)$ est sous la courbe de $f$ quand son ordonnée est'
     ' inférieure à l\'image de son abscisse.',
     'Il faut donc comparer $y$ à $f(x)$, et non $x$ à $f(y)$ ; `y >= f(x)` compterait les points'
     ' au-dessus.',
     'La ligne est donc `' + CONDITION_MC + '`.'])

V499_INTERPRETER = ligne(
    'On reprend la fonction `monte_carlo` ci-dessous.'
    + python(MONTE_CARLO.replace('{condition}', CONDITION_MC))
    + 'Pour $N$ grand, de quel nombre la proportion $\\dfrac{c}{N}$ est-elle proche ?',
    [], '$\\dfrac{1}{4}$', ['$4$', '$\\dfrac{1}{16}$', '$\\dfrac{1}{2}$'],
    ['$\\dfrac{c}{N}$ est la fréquence des points tombés sous la courbe : pour $N$ grand, elle est'
     ' proche de la probabilité qu\'un point du rectangle soit sous la courbe.',
     'Cette probabilité est le quotient des aires : $\\dfrac{\\displaystyle\\int_0^2 x^3\\,'
     '\\mathrm{d}x}{2\\times8}=\\dfrac{\\left[\\frac{x^4}{4}\\right]_0^2}{16}=\\dfrac{4}{16}$.',
     '$\\dfrac{c}{N}$ est donc proche de $' + col('\\dfrac{1}{4}') + '$ ; $4$ est l\'intégrale'
     ' elle-même, valeur approchée par $16\\times\\dfrac{c}{N}$.'])

MODELES.append(modele(
    '05-methode-de-monte-carlo', 'Méthode de Monte-Carlo pour une intégrale en Python',
    'Monte-Carlo pour l\'intégrale de x³ sur [0 ; 2], points dans [0 ; 2] × [0 ; 8] : valeur'
    ' renvoyée pour un décompte donné, compléter if y <= f(x):, limite de c/N (1/4)',
    3, [V499_TOURNER, V499_LIGNE, V499_INTERPRETER],
    [spec('c = 250 : 4', 0, '4', 'correct', {'c': 250, 'r': 4}),
     spec('c = 243 : 3,888', 0, '3.888', 'correct', {'c': 243, 'r': 3.888}),
     spec('c = 243 : avec virgule', 0, '3,888', 'correct', {'c': 243, 'r': 3.888}),
     spec('Erreur : c/N sans l\'aire du rectangle', 0, '0.243', 'incorrect', {'c': 243, 'r': 3.888})]
    + specs_choix(1, CONDITION_MC, ['au-dessus', 'x et y échangés', 'y <= x'])
    + specs_choix(2, '1/4', ['4', '1/16', '1/2'])))

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
