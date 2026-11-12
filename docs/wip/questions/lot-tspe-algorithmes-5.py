"""Écrit les 5 modèles du lot 5 « algorithmes : analyse » de la terminale spécialité
dans scripts/questions/tspe-algorithmes-5/.

Phase 0 validée par David le 2026-11-12 (D2 du journal
« docs/wip/questions-tspe-demonstrations-progress.md », § 18), un point par modèle, chacun sur une
sous-notion existante, au-dessus des niveaux déjà présents (relevé prod du 2026-11-12) :

| # | Point    | Titre                                                    | Niv. | Nœud du modèle                                   |
| 1 | TSPE-393 | Valeurs approchées de √2, du nombre d'or et de e (Python) | 4    | Suites › Limites de suites › convergence monotone |
| 2 | TSPE-433 | Méthode de dichotomie en Python                          | 4    | Fonctions › Continuité › encadrement d'une sol.  |
| 3 | TSPE-434 | Méthode de Newton en Python : racine cubique             | 5    | Fonctions › Continuité › encadrement d'une sol.  |
| 4 | TSPE-592 | Méthode de la sécante en Python                          | 6    | Fonctions › Continuité › encadrement d'une sol.  |
| 5 | TSPE-450 | Algorithme de Briggs pour le logarithme                  | 3    | Fonctions › Logarithmes › propriétés algébriques |

Forme (D2, Q2, comme D9 de la 1re) : Python seulement ; (a) faire tourner un programme (case),
(b) compléter une ligne (case choix à 4 propositions, la première est la bonne, ordre mélangé à
l'affichage), (c) interpréter. Valeurs calculables à la main. 393 : une variation par constante
(D2, Q4).

Gabarits remplis par `replace`, jamais par `format` (format mange les accolades de {{eval:…}}).
Variables : jamais `e` ni `E` (constante d'Euler), ni `i`.

    python3 docs/wip/questions/lot-tspe-algorithmes-5.py scripts/questions/tspe-algorithmes-5
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
            'answers': answers, 'expected': {'status': status}}


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

# --- 1. TSPE-393 : valeurs approchées de √2, du nombre d'or, de e -------------------------------

HERON = ('def heron(u, n):\n'
         '    for k in range(n):\n'
         '        u = (u + 2 / u) / 2\n'
         '    return u')

V393_HERON = case(
    'On considère la fonction Python suivante.'
    + python(HERON)
    + 'Que renvoie `heron(' + ev('p') + ', 1)` ?\n\n$?$',
    [var('p', '1|2|4|5'), var('r', 'eval:(p+2/p)/2')],
    evd('r'),
    ['La boucle est parcourue une seule fois, avec `u` égal à $' + ev('p') + '$.',
     '`u` devient $\\dfrac{1}{2}\\left(' + ev('p') + '+\\dfrac{2}{' + ev('p') + '}\\right)'
     '=\\dfrac{1}{2}\\left(' + ev('p') + '+' + evd('2/p') + '\\right)=' + col(evd('r')) + '$.',
     'C\'est la méthode de Héron : à partir du rang $1$, les termes décroissent et se'
     ' rapprochent de $\\sqrt{2}\\approx1{,}414$.'])

NOMBRE_D_OR = ('def u(n):\n'
               '    x = 1\n'
               '    for k in range(n):\n'
               '        x = 1 + 1 / x\n'
               '    return x\n'
               '\n'
               'print(u(30))')

V393_OR = ligne(
    'On considère le programme Python suivant.'
    + python(NOMBRE_D_OR)
    + 'De quel nombre la valeur affichée est-elle une valeur approchée ?',
    [], '$\\dfrac{1+\\sqrt{5}}{2}$',
    ['$\\dfrac{1-\\sqrt{5}}{2}$', '$\\sqrt{5}$', '$2$'],
    ['Les premières valeurs de `x` sont $1$ ; $2$ ; $1{,}5$ ; $\\dfrac{5}{3}$ ; $1{,}6$ : la suite'
     ' $x_{n+1}=1+\\dfrac{1}{x_n}$ converge (on l\'admet) vers un nombre $\\ell$.',
     'En passant à la limite : $\\ell=1+\\dfrac{1}{\\ell}$, soit $\\ell^2-\\ell-1=0$, dont les'
     ' solutions sont $\\dfrac{1-\\sqrt{5}}{2}<0$ et $\\dfrac{1+\\sqrt{5}}{2}$.',
     'Tous les termes sont supérieurs ou égaux à $1$, donc $\\ell\\geqslant1$ : la valeur affichée'
     ' approche $' + col('\\dfrac{1+\\sqrt{5}}{2}') + '\\approx1{,}618$, le nombre d\'or.'])

SOMME_E = ('def approx_e(n):\n'
           '    s = 1\n'
           '    t = 1\n'
           '    for k in range(1, n + 1):\n'
           '        {ligne}\n'
           '        s = s + t\n'
           '    return s')
LIGNE_E = 't = t / k'

V393_E = ligne(
    'La fonction Python ci-dessous doit renvoyer $1+\\dfrac{1}{1!}+\\dfrac{1}{2!}+\\cdots+'
    '\\dfrac{1}{n!}$, valeur approchée du nombre $e$. À chaque tour de boucle, `t` doit contenir'
    ' $\\dfrac{1}{k!}$.'
    + python(SOMME_E.replace('{ligne}', '...'))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`' + LIGNE_E + '`', ['`t = t * k`', '`t = 1 / k`', '`t = t / (k + 1)`'],
    ['$k!=(k-1)!\\times k$, donc $\\dfrac{1}{k!}=\\dfrac{1}{(k-1)!}\\times\\dfrac{1}{k}$.',
     'Avant la ligne, `t` contient $\\dfrac{1}{(k-1)!}$ (au premier tour, $\\dfrac{1}{0!}=1$) :'
     ' il suffit de le diviser par $k$.',
     'La ligne est donc `' + LIGNE_E + '`.'])

MODELES.append(modele(
    '01-valeurs-approchees-racine-2-nombre-d-or-e',
    'Valeurs approchées de √2, du nombre d\'or et de e en Python',
    'Une constante par variation : √2 par la méthode de Héron (faire tourner une itération),'
    ' nombre d\'or par x = 1 + 1/x (interpréter), e par la somme des 1/k! (compléter t = t / k)',
    4, [V393_HERON, V393_OR, V393_E],
    [spec('p = 1 : 1,5', 0, '1.5', 'correct', {'p': 1, 'r': 1.5}),
     spec('p = 1 : 1,5 avec virgule', 0, '1,5', 'correct', {'p': 1, 'r': 1.5}),
     spec('p = 5 : 2,7', 0, '2.7', 'correct', {'p': 5, 'r': 2.7}),
     spec('Erreur : p + 2/p sans diviser par 2', 0, '5.4', 'incorrect', {'p': 5, 'r': 2.7})]
    + specs_choix(1, 'nombre d\'or', ['racine négative', 'racine de 5', '2'])
    + specs_choix(2, LIGNE_E, ['t = t * k', 't = 1 / k', 't = t / (k + 1)'])))

# --- 2. TSPE-433 : méthode de dichotomie -------------------------------------------------------

DICHOTOMIE = ('def f(x):\n'
              '    return x**2 - ' + ev('c') + '\n'
              '\n'
              'def dichotomie(a, b, n):\n'
              '    for k in range(n):\n'
              '        m = (a + b) / 2\n'
              '        {condition}\n'
              '            b = m\n'
              '        else:\n'
              '            a = m\n'
              '    return a, b')
CONDITION = 'if f(a) * f(m) <= 0:'
NON_CARRES = '2|3|5|6|7|8|10|11|12|13|14|15'


def tour(m, s, a, b):
    """Un tour de dichotomie expliqué : m milieu, s = f(m), a et b après le tour."""
    return ('$m=' + evd(m) + '$ et $f(m)=' + evd(m + '^2-c') + '$ {{if:' + s + '>0|est positif, donc'
            ' $f(a)\\times f(m)<0$ et `b` prend la valeur $m$|est négatif, donc $f(a)\\times f(m)>0$'
            ' et `a` prend la valeur $m$}}. Alors $a=' + evd(a) + '$ et $b=' + evd(b) + '$.')


V433_TOURNER = case(
    'On considère le programme Python suivant.'
    + python(DICHOTOMIE.replace('{condition}', CONDITION))
    + 'L\'appel `dichotomie(' + ev('p') + ', ' + ev('p+1') + ', 2)` renvoie le couple `a, b`.'
    ' Que valent `a` et `b` ?\n\n$a=?$ et $b=?$',
    [var('c', NON_CARRES), var('p', 'eval:floor(sqrt(c))'), var('m1', 'eval:p+0.5'),
     var('s1', 'eval:m1^2-c'), var('a1', 'eval:floor(2*sqrt(c))/2'), var('b1', 'eval:a1+0.5'),
     var('m2', 'eval:a1+0.25'), var('s2', 'eval:m2^2-c'),
     var('a2', 'eval:floor(4*sqrt(c))/4'), var('b2', 'eval:a2+0.25')],
    [evd('a2'), evd('b2')],
    ['Au départ, $a=' + ev('p') + '$ et $f(a)=' + ev('p^2-c') + '<0$ ; `a` garde une image'
     ' négative tout au long du programme.',
     'Premier tour : ' + tour('m1', 's1', 'a1', 'b1'),
     'Second tour : ' + tour('m2', 's2', 'a2', 'b2'),
     'La fonction renvoie $a=' + col(evd('a2')) + '$ et $b=' + col(evd('b2')) + '$ : un'
     ' encadrement d\'amplitude $0{,}25$ de $\\sqrt{' + ev('c') + '}$.'])

V433_LIGNE = ligne(
    'La fonction $f$ est continue et strictement croissante sur $[a\\,;\\,b]$, avec $f(a)<0<f(b)$.'
    ' La fonction Python ci-dessous coupe l\'intervalle en deux à chaque tour et garde la moitié'
    ' qui contient la solution de $f(x)=0$.'
    + python(DICHOTOMIE.replace('{condition}', '...'))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [var('c', NON_CARRES)], '`' + CONDITION + '`',
    ['`if f(m) <= 0:`', '`if f(a) * f(b) <= 0:`', '`if f(a) + f(m) <= 0:`'],
    ['La solution est dans $[a\\,;\\,m]$ quand $f(a)$ et $f(m)$ sont de signes contraires (ou'
     ' $f(m)=0$), c\'est-à-dire quand $f(a)\\times f(m)\\leqslant0$ : on remplace alors $b$ par $m$.',
     'Avec `if f(m) <= 0:`, on garderait la mauvaise moitié ; $f(a)\\times f(b)$ reste négatif à'
     ' tous les tours et ne dit rien de $m$.',
     'La ligne est donc `' + CONDITION + '`.'])

V433_TOURS = case(
    'On applique la méthode de dichotomie à partir d\'un intervalle d\'amplitude $1$ : chaque tour'
    ' de boucle divise l\'amplitude par $2$.\n\nCombien de tours faut-il au minimum pour obtenir'
    ' un encadrement d\'amplitude inférieure ou égale à $10^{-' + ev('k') + '}$ ?\n\n$?$',
    [var('k', '1..3'), var('n', 'eval:3*k+1')],
    ev('n'),
    ['Après $n$ tours, l\'amplitude vaut $\\dfrac{1}{2^n}$ : on cherche le plus petit $n$ tel que'
     ' $\\dfrac{1}{2^n}\\leqslant10^{-' + ev('k') + '}$, soit $2^n\\geqslant' + ev('10^k') + '$.',
     '$2^{' + ev('n-1') + '}=' + ev('2^(n-1)') + '<' + ev('10^k') + '$ et $2^{' + ev('n') + '}='
     + ev('2^n') + '\\geqslant' + ev('10^k') + '$.',
     'Il faut au minimum $' + col(ev('n')) + '$ tours.'])

MODELES.append(modele(
    '02-methode-de-dichotomie', 'Méthode de dichotomie en Python',
    'Dichotomie pour f(x) = x² − c : faire tourner deux tours (a et b renvoyés), compléter la'
    ' condition f(a) * f(m) <= 0, nombre de tours pour une amplitude de 10^(−k)',
    4, [V433_TOURNER, V433_LIGNE, V433_TOURS],
    [spec('c = 2 : 1,25 et 1,5', 0, ['1.25', '1.5'], 'correct',
          {'c': 2, 'p': 1, 'm1': 1.5, 's1': 0.25, 'a1': 1, 'b1': 1.5, 'm2': 1.25, 's2': -0.4375,
           'a2': 1.25, 'b2': 1.5}),
     spec('c = 2 : avec virgules', 0, ['1,25', '1,5'], 'correct',
          {'c': 2, 'p': 1, 'm1': 1.5, 's1': 0.25, 'a1': 1, 'b1': 1.5, 'm2': 1.25, 's2': -0.4375,
           'a2': 1.25, 'b2': 1.5}),
     spec('Erreur : un seul tour', 0, ['1', '1.5'], 'incorrect',
          {'c': 2, 'p': 1, 'm1': 1.5, 's1': 0.25, 'a1': 1, 'b1': 1.5, 'm2': 1.25, 's2': -0.4375,
           'a2': 1.25, 'b2': 1.5}),
     spec('c = 7 : 2,5 et 2,75', 0, ['2.5', '2.75'], 'correct',
          {'c': 7, 'p': 2, 'm1': 2.5, 's1': -0.75, 'a1': 2.5, 'b1': 3, 'm2': 2.75, 's2': 0.5625,
           'a2': 2.5, 'b2': 2.75})]
    + specs_choix(1, CONDITION, ['if f(m) <= 0:', 'if f(a) * f(b) <= 0:', 'if f(a) + f(m) <= 0:'],
                  {'c': 2})
    + [spec('k = 2 : 7 tours', 2, '7', 'correct', {'k': 2, 'n': 7}),
       spec('Erreur : 2^6 = 64 jugé suffisant', 2, '6', 'incorrect', {'k': 2, 'n': 7}),
       spec('k = 3 : 10 tours', 2, '10', 'correct', {'k': 3, 'n': 10})]))

# --- 3. TSPE-434 : méthode de Newton -----------------------------------------------------------

NEWTON = ('def f(x):\n'
          '    return x**3 - ' + ev('c') + '\n'
          '\n'
          'def fp(x):\n'
          '    return 3 * x**2\n'
          '\n'
          '{corps}')
NEWTON_N = ('def newton(x, n):\n'
            '    for k in range(n):\n'
            '        x = x - f(x) / fp(x)\n'
            '    return x')
NEWTON_EPS = ('def newton(x, eps):\n'
              '    {condition}\n'
              '        x = x - f(x) / fp(x)\n'
              '    return x')
CONDITION_EPS = 'while abs(f(x)) > eps:'

V434_TOURNER = case(
    'On considère le programme Python suivant, où `fp` est la fonction dérivée de `f`.'
    + python(NEWTON.replace('{corps}', NEWTON_N))
    + 'Que renvoie `newton(1, 1)` ?\n\n$?$',
    [var('c', '4|7|10|13'), var('r', 'eval:(2+c)/3')],
    ev('r'),
    ['La boucle est parcourue une seule fois, avec `x` égal à $1$.',
     '$f(1)=1-' + ev('c') + '=' + ev('1-c') + '$ et $f\'(1)=3\\times1^2=3$.',
     '`x` devient $1-\\dfrac{' + ev('1-c') + '}{3}=1+' + ev('(c-1)/3') + '=' + col(ev('r')) + '$.'])

V434_LIGNE = ligne(
    'La fonction Python ci-dessous applique la méthode de Newton : elle doit répéter l\'itération'
    ' tant que $f(x)$ n\'est pas proche de $0$ à `eps` près. `fp` est la fonction dérivée de `f`.'
    + python(NEWTON.replace('{corps}', NEWTON_EPS.replace('{condition}', '...')))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [var('c', '2|3|5|6|7|9|10')], '`' + CONDITION_EPS + '`',
    ['`while abs(f(x)) < eps:`', '`while f(x) > eps:`', '`while abs(x) > eps:`'],
    ['On continue tant que l\'écart entre $f(x)$ et $0$ dépasse `eps`, c\'est-à-dire tant que'
     ' $|f(x)|>\\text{eps}$ ; `abs` donne la valeur absolue.',
     'Avec `f(x) > eps`, la boucle s\'arrêterait dès que $f(x)$ est négatif, même loin de $0$ ;'
     ' avec `abs(f(x)) < eps`, elle ne tournerait qu\'une fois arrivée près de la solution.',
     'La ligne est donc `' + CONDITION_EPS + '`.'])

V434_INTERPRETER = ligne(
    'On considère le programme Python suivant, où `fp` est la fonction dérivée de `f`.'
    + python(NEWTON.replace('{corps}', NEWTON_EPS.replace('{condition}', CONDITION_EPS))
             + '\n\nprint(newton(2, 10**-9))')
    + 'De quel nombre la valeur affichée est-elle une valeur approchée ?',
    [var('c', '2|3|5|6|7|9|10')],
    '$\\sqrt[3]{' + ev('c') + '}$',
    ['$\\sqrt{' + ev('c') + '}$', '$\\dfrac{' + ev('c') + '}{3}$', '$' + ev('c') + '^3$'],
    ['La méthode de Newton, partie de $x=2$, fournit des valeurs de plus en plus proches d\'une'
     ' solution de $f(x)=0$ ; elle s\'arrête quand $|f(x)|\\leqslant10^{-9}$.',
     '$x^3-' + ev('c') + '=0$ a pour unique solution réelle $\\sqrt[3]{' + ev('c') + '}$ (la'
     ' fonction $x\\mapsto x^3$ est strictement croissante).',
     'La valeur affichée est une valeur approchée de $' + col('\\sqrt[3]{' + ev('c') + '}') + '$.'])

MODELES.append(modele(
    '03-methode-de-newton', 'Méthode de Newton en Python : racine cubique',
    'Méthode de Newton pour f(x) = x³ − c : faire tourner une itération depuis 1, compléter la'
    ' condition d\'arrêt while abs(f(x)) > eps, dire de quel nombre le résultat est une valeur'
    ' approchée (racine cubique)',
    5, [V434_TOURNER, V434_LIGNE, V434_INTERPRETER],
    [spec('c = 7 : 3', 0, '3', 'correct', {'c': 7, 'r': 3}),
     spec('Erreur : x + f(x)/f′(x)', 0, '-1', 'incorrect', {'c': 7, 'r': 3}),
     spec('c = 13 : 5', 0, '5', 'correct', {'c': 13, 'r': 5})]
    + specs_choix(1, CONDITION_EPS, ['while abs(f(x)) < eps:', 'while f(x) > eps:',
                                     'while abs(x) > eps:'], {'c': 2})
    + specs_choix(2, 'racine cubique', ['racine carrée', 'c/3', 'c³'], {'c': 2})))

# --- 4. TSPE-592 : méthode de la sécante -------------------------------------------------------

SECANTE = ('def f(x):\n'
           '    return x**2 - ' + ev('c') + '\n'
           '\n'
           'def secante(a, b, n):\n'
           '    for k in range(n):\n'
           '        {ligne}\n'
           '        a = b\n'
           '        b = x\n'
           '    return b')
LIGNE_SECANTE = 'x = b - f(b) * (b - a) / (f(b) - f(a))'

V592_TOURNER = case(
    'On considère le programme Python suivant (méthode de la sécante).'
    + python(SECANTE.replace('{ligne}', LIGNE_SECANTE))
    + 'Que renvoie `secante(1, 3, 1)` ?\n\n$?$',
    [var('c', '2..8'), var('r', 'eval:(3+c)/4')],
    evd('r'),
    ['La boucle est parcourue une seule fois, avec $a=1$ et $b=3$ : $f(1)=' + ev('1-c')
     + '$ et $f(3)=' + ev('9-c') + '$.',
     '$x=3-' + ev('9-c') + '\\times\\dfrac{3-1}{' + ev('9-c') + '-(' + ev('1-c') + ')}=3-\\dfrac{'
     + ev('2*(9-c)') + '}{8}=' + evd('r') + '$.',
     'Puis `b` prend la valeur de `x` : la fonction renvoie $' + col(evd('r')) + '$.'])

V592_LIGNE = ligne(
    'La méthode de la sécante remplace le point d\'abscisse $b$ par le point où la droite passant'
    ' par $(a\\,;\\,f(a))$ et $(b\\,;\\,f(b))$ coupe l\'axe des abscisses.'
    + python(SECANTE.replace('{ligne}', '...'))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [var('c', '2..8')], '`' + LIGNE_SECANTE + '`',
    ['`x = b - f(b) / (f(b) - f(a))`', '`x = b - f(b) * (f(b) - f(a)) / (b - a)`',
     '`x = b + f(b) * (b - a) / (f(b) - f(a))`'],
    ['La droite passant par $(a\\,;\\,f(a))$ et $(b\\,;\\,f(b))$ a pour coefficient directeur'
     ' $s=\\dfrac{f(b)-f(a)}{b-a}$ et pour équation $y=f(b)+s(t-b)$.',
     'Elle coupe l\'axe des abscisses quand $y=0$ : $t=b-\\dfrac{f(b)}{s}=b-f(b)\\times'
     '\\dfrac{b-a}{f(b)-f(a)}$.',
     'La ligne est donc `' + LIGNE_SECANTE + '`.'])

V592_INTERPRETER = ligne(
    'Dans la méthode de la sécante, on calcule\n\n$x=b-f(b)\\times\\dfrac{b-a}{f(b)-f(a)}$\n\n'
    'à partir de deux nombres $a$ et $b$. Que représente $x$ ?',
    [], 'L\'abscisse du point d\'intersection de la droite passant par $(a\\,;\\,f(a))$ et'
    ' $(b\\,;\\,f(b))$ avec l\'axe des abscisses.',
    ['L\'abscisse du point d\'intersection de la tangente en $b$ avec l\'axe des abscisses.',
     'Le milieu de $[a\\,;\\,b]$.', 'Le coefficient directeur de la droite passant par'
     ' $(a\\,;\\,f(a))$ et $(b\\,;\\,f(b))$.'],
    ['$\\dfrac{f(b)-f(a)}{b-a}$ est le coefficient directeur de la sécante passant par'
     ' $(a\\,;\\,f(a))$ et $(b\\,;\\,f(b))$, pas celui de la tangente.',
     'Le point de la sécante d\'abscisse $x$ a pour ordonnée $f(b)+\\dfrac{f(b)-f(a)}{b-a}(x-b)'
     '=f(b)-f(b)=0$.',
     '$x$ est donc ' + '$' + col('\\text{l\'abscisse où la sécante coupe l\'axe des abscisses}')
     + '$.'])

MODELES.append(modele(
    '04-methode-de-la-secante', 'Méthode de la sécante en Python',
    'Méthode de la sécante pour f(x) = x² − c : faire tourner une itération depuis 1 et 3,'
    ' compléter la ligne x = b − f(b)(b − a)/(f(b) − f(a)), interpréter x (sécante et axe des'
    ' abscisses)',
    6, [V592_TOURNER, V592_LIGNE, V592_INTERPRETER],
    [spec('c = 2 : 1,25', 0, '1.25', 'correct', {'c': 2, 'r': 1.25}),
     spec('c = 2 : 1,25 avec virgule', 0, '1,25', 'correct', {'c': 2, 'r': 1.25}),
     spec('Erreur : sans le facteur b − a', 0, '2.125', 'incorrect', {'c': 2, 'r': 1.25}),
     spec('c = 7 : 2,5', 0, '2.5', 'correct', {'c': 7, 'r': 2.5})]
    + specs_choix(1, 'sécante', ['sans b − a', 'quotient renversé', 'signe +'], {'c': 2})
    + specs_choix(2, 'sécante et axe', ['tangente', 'milieu', 'coefficient directeur'])))

# --- 5. TSPE-450 : algorithme de Briggs --------------------------------------------------------

BRIGGS = ('from math import sqrt\n'
          '\n'
          'def briggs(x, n):\n'
          '    for k in range(n):\n'
          '        x = sqrt(x)\n'
          '    {retour}')
RETOUR_BRIGGS = 'return 2**n * (x - 1)'

V450_TOURNER = case(
    'On considère la fonction Python suivante.'
    + python(BRIGGS.replace('{retour}', RETOUR_BRIGGS))
    + 'Que renvoie `briggs(' + ev('x') + ', ' + ev('n') + ')` ?\n\n$?$',
    [var('q', '2..5'), var('n', '1|2'), var('x', 'eval:q^(2^n)'), var('r', 'eval:2^n*(q-1)')],
    ev('r'),
    ['La boucle prend $' + ev('n') + '$ fois la racine carrée de `x` : $' + ev('x')
     + '$ devient {{if:n==2|$' + ev('q^2') + '$, puis |}}$' + ev('q') + '$.',
     'La fonction renvoie $2^{' + ev('n') + '}\\times(' + ev('q') + '-1)=' + col(ev('r')) + '$.',
     'C\'est une valeur approchée grossière de $\\ln(' + ev('x') + ')$ : il faut prendre $n$ bien'
     ' plus grand pour que la racine soit proche de $1$.'])

V450_LIGNE = ligne(
    'Pour $x>0$, après $n$ racines carrées successives, $y=x^{1/2^n}$ est proche de $1$, et'
    ' $\\ln(x)=2^n\\ln(y)$. La fonction Python ci-dessous doit renvoyer une valeur approchée de'
    ' $\\ln(x)$, en utilisant $\\ln(y)\\approx y-1$ pour $y$ proche de $1$.'
    + python(BRIGGS.replace('{retour}', 'return ...'))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`2**n * (x - 1)`', ['`(x - 1) / 2**n`', '`2**n * x - 1`', '`x - 1`'],
    ['À la fin de la boucle, `x` contient $y=x^{1/2^n}$, proche de $1$.',
     'La tangente à la courbe de $\\ln$ au point d\'abscisse $1$ a pour équation $Y=y-1$, donc'
     ' $\\ln(y)\\approx y-1$ ; puis $\\ln(x)=2^n\\ln(y)\\approx2^n(y-1)$.',
     'On écrit donc `' + RETOUR_BRIGGS + '`.'])

V450_PROPRIETE = ligne(
    'L\'algorithme de Briggs repose sur l\'égalité $\\ln(x)=2^n\\ln\\left(x^{1/2^n}\\right)$,'
    ' obtenue en appliquant $n$ fois une propriété du logarithme. Laquelle ?',
    [], '$\\ln\\left(\\sqrt{x}\\right)=\\dfrac{1}{2}\\ln(x)$',
    ['$\\ln\\left(\\sqrt{x}\\right)=\\sqrt{\\ln(x)}$',
     '$\\ln\\left(\\dfrac{x}{2}\\right)=\\dfrac{\\ln(x)}{2}$', '$\\ln(x^2)=\\left(\\ln(x)\\right)^2$'],
    ['Pour $x>0$, $\\ln(x)=\\ln\\left(\\left(\\sqrt{x}\\right)^2\\right)=2\\ln\\left(\\sqrt{x}'
     '\\right)$, donc $\\ln\\left(\\sqrt{x}\\right)=\\dfrac{1}{2}\\ln(x)$.',
     'Chaque racine carrée divise le logarithme par $2$ : après $n$ racines, $\\ln\\left(x^{1/2^n}'
     '\\right)=\\dfrac{\\ln(x)}{2^n}$.',
     'La propriété utilisée est $' + col('\\ln\\left(\\sqrt{x}\\right)=\\dfrac{1}{2}\\ln(x)')
     + '$.'])

MODELES.append(modele(
    '05-algorithme-de-briggs', 'Algorithme de Briggs pour le logarithme en Python',
    'Racines carrées successives, puis ln(x) ≈ 2^n (x^(1/2^n) − 1) : faire tourner sur un carré'
    ' ou une puissance 4e, compléter le return, propriété ln(√x) = ½ ln(x)',
    3, [V450_TOURNER, V450_LIGNE, V450_PROPRIETE],
    [spec('q = 3, n = 1 : 4', 0, '4', 'correct', {'q': 3, 'n': 1, 'x': 9, 'r': 4}),
     spec('Erreur : x − 1 sans 2^n', 0, '2', 'incorrect', {'q': 3, 'n': 1, 'x': 9, 'r': 4}),
     spec('q = 2, n = 2 : 4', 0, '4', 'correct', {'q': 2, 'n': 2, 'x': 16, 'r': 4}),
     spec('q = 5, n = 2 : 16', 0, '16', 'correct', {'q': 5, 'n': 2, 'x': 625, 'r': 16})]
    + specs_choix(1, '2**n * (x - 1)', ['(x - 1) / 2**n', '2**n * x - 1', 'x - 1'])
    + specs_choix(2, 'ln √x = ½ ln x', ['racine du ln', 'ln(x/2)', 'ln(x²)'])))

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
