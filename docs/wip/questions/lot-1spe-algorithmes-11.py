"""Écrit les 5 modèles du lot 11 « algorithmes : analyse » de la 1re spé
dans scripts/questions/1spe-algorithmes-11/.

Phase 0 validée par David le 2026-11-06 (D9 du journal
« docs/archive/wip/questions-1spe-demonstrations-progress.md », § 15) ; contenu et rangement validés le
2026-11-06 (D11, « je valide »), un point par modèle, chacun sur une sous-notion existante :

| # | Point    | Titre                                           | Niv. | Nœud du modèle                                    |
| 1 | 1SPE-279 | Pentes des sécantes avec Python                 | 5    | Dérivation › taux de variation                    |
| 2 | 1SPE-288 | Méthode de Newton en Python                     | 5    | Dérivation › tangente                             |
| 3 | 1SPE-298 | Méthode d'Euler pour l'exponentielle en Python  | 2    | Fonction exponentielle › dérivée                  |
| 4 | 1SPE-299 | Valeur approchée de e avec Python               | 8    | Fonction exponentielle › propriétés algébriques   |
| 5 | 1SPE-309 | Approximation de π par Archimède en Python      | 7    | Fonctions trigonométriques › cercle et radians    |

Forme (D9, Q2) : Python seulement ; (a) faire tourner un programme (case), (b) compléter une ligne
(case choix à 4 propositions, la première est la bonne, ordre mélangé à l'affichage), (c)
interpréter (de quoi la valeur renvoyée est une approximation). Valeurs calculables à la main.

Variables : jamais `e` ni `E` (constante d'Euler), ni `i`.

    python3 docs/wip/questions/lot-1spe-algorithmes-11.py scripts/questions/1spe-algorithmes-11
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
    return nom, {'title': title, 'description': description, 'grades': ['1_SPE'],
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


def case(statement, variables, attendu, steps, conditions=None):
    v = {'statement': statement, 'variables': variables,
         'blanks': [{'expectedAnswer': attendu}], 'correction': {'steps': steps}}
    if conditions:
        v['conditions'] = conditions
    return v


def ligne(statement, variables, bonne, autres, steps, conditions=None):
    """Case choix : la première proposition est la bonne (index 0)."""
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


MODELES = []

# --- 1. 1SPE-279 : coefficients directeurs des sécantes pour un pas donné -----------------------

SECANTES = ('def f(x):\n'
            '    return x**2\n'
            '\n'
            'def secantes(a, pas):\n'
            '    L = []\n'
            '    for h in pas:\n'
            '        L.append({pente})\n'
            '    return L')
PENTE = '(f(a + h) - f(a)) / h'

V279_TOURNER = case(
    'On considère le programme Python suivant.'
    + python(SECANTES.format(pente=PENTE))
    + '`secantes(' + ev('a') + ', [1, 0.5, 0.2, 0.1])` renvoie la liste des coefficients'
    ' directeurs des sécantes à la courbe de $f$ entre les points d\'abscisses $' + ev('a')
    + '$ et $' + ev('a') + '+h$. Quel coefficient directeur la liste contient-elle pour $h='
    + evd('h') + '$ ?\n\n$?$',
    [var('a', '1..6'), var('h', '1|0.5|0.2|0.1'), var('s', 'eval:2*a+h')],
    evd('s'),
    ['Pour $h=' + evd('h') + '$, on calcule $\\dfrac{f(' + ev('a') + '+' + evd('h') + ')-f('
     + ev('a') + ')}{' + evd('h') + '}$ avec $f(x)=x^2$.',
     '$f(' + evd('a+h') + ')=' + evd('(a+h)^2') + '$ et $f(' + ev('a') + ')=' + ev('a^2')
     + '$, donc $\\dfrac{' + evd('(a+h)^2') + '-' + ev('a^2') + '}{' + evd('h') + '}=\\dfrac{'
     + evd('(a+h)^2-a^2') + '}{' + evd('h') + '}$.',
     'Le coefficient directeur vaut $' + col(evd('s')) + '$.'])

V279_LIGNE = ligne(
    'La fonction Python ci-dessous doit renvoyer la liste des coefficients directeurs des'
    ' sécantes à la courbe de $f$ entre les points d\'abscisses $a$ et $a+h$, pour chaque pas'
    ' $h$ de la liste `pas`.'
    + python(SECANTES.format(pente='...'))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`' + PENTE + '`',
    ['`f(a + h) - f(a)`', '`(f(a) - f(a + h)) / h`', '`(f(a + h) - f(a)) / a`'],
    ['La sécante passe par les points $(a\\,;\\,f(a))$ et $(a+h\\,;\\,f(a+h))$.',
     'Son coefficient directeur est le taux de variation $\\dfrac{f(a+h)-f(a)}{(a+h)-a}'
     '=\\dfrac{f(a+h)-f(a)}{h}$ : il faut diviser par $h$, dans cet ordre.',
     'La ligne est donc `L.append(' + PENTE + ')`.'])

V279_INTERPRETER = ligne(
    'On considère le programme Python suivant.'
    + python(SECANTES.format(pente=PENTE) + '\n\nprint(secantes(' + ev('a')
             + ', [0.1, 0.01, 0.001, 0.0001]))')
    + 'De quel nombre les valeurs affichées se rapprochent-elles ?',
    [var('a', '1|3|4|5|6')],
    '$f\'(' + ev('a') + ')=' + ev('2*a') + '$',
    ['$f(' + ev('a') + ')=' + ev('a^2') + '$', '$0$',
     '$f(' + ev('a+1') + ')-f(' + ev('a') + ')=' + ev('2*a+1') + '$'],
    ['Quand $h$ se rapproche de $0$, les sécantes se rapprochent de la tangente au point'
     ' d\'abscisse $' + ev('a') + '$, et leurs coefficients directeurs du nombre dérivé.',
     'Ici $\\dfrac{f(' + ev('a') + '+h)-f(' + ev('a') + ')}{h}=' + ev('2*a') + '+h$ : les'
     ' valeurs affichées sont, aux arrondis du calcul en machine près, $' + ev('2*a') + '{,}1$, $' + ev('2*a') + '{,}01$, $' + ev('2*a')
     + '{,}001$, $' + ev('2*a') + '{,}0001$.',
     'Elles se rapprochent de $' + col('f\'(' + ev('a') + ')=' + ev('2*a')) + '$.'])

MODELES.append(modele(
    '01-pentes-des-secantes', 'Pentes des sécantes avec Python',
    'Liste des coefficients directeurs des sécantes pour f(x) = x² : faire tourner pour un pas'
    ' donné, compléter la ligne du taux de variation, dire de quoi les pentes se rapprochent',
    5, [V279_TOURNER, V279_LIGNE, V279_INTERPRETER],
    [spec('a = 3, h = 0,5 : 6,5', 0, '6.5', 'correct', {'a': 3, 'h': 0.5, 's': 6.5}),
     spec('a = 3, h = 0,5 : 6,5 avec virgule', 0, '6,5', 'correct', {'a': 3, 'h': 0.5, 's': 6.5}),
     spec('Erreur : f(a + h) − f(a) non divisé par h', 0, '3.25', 'incorrect',
          {'a': 3, 'h': 0.5, 's': 6.5}),
     spec('a = 2, h = 1 : 5', 0, '5', 'correct', {'a': 2, 'h': 1, 's': 5})]
    + specs_choix(1, PENTE, ['f(a + h) - f(a)', '(f(a) - f(a + h)) / h',
                             '(f(a + h) - f(a)) / a'])
    + specs_choix(2, "f'(a)", ['f(a)', '0', 'f(a + 1) - f(a)'], {'a': 3})))

# --- 2. 1SPE-288 : méthode de Newton ------------------------------------------------------------

# Gabarit rempli par replace, pas par format : format mangerait les accolades de {{eval:c}}
NEWTON = ('def f(x):\n'
          '    return x**2 - ' + ev('c') + '\n'
          '\n'
          'def fp(x):\n'
          '    return 2 * x\n'
          '\n'
          'def newton(x, n):\n'
          '    for k in range(n):\n'
          '        {ligne}\n'
          '    return x')
LIGNE_NEWTON = 'x = x - f(x) / fp(x)'

V288_TOURNER = case(
    'On considère le programme Python suivant, où `fp` est la fonction dérivée de `f`.'
    + python(NEWTON.replace('{ligne}', LIGNE_NEWTON))
    + 'Que renvoie `newton(' + ev('p') + ', 1)` ?\n\n$?$',
    [var('p', '1|2|4|5'), var('c', '2..20'), var('r', 'eval:(p^2+c)/(2*p)')],
    evd('r'),
    ['La boucle est parcourue une seule fois, avec `x` égal à $' + ev('p') + '$.',
     '$f(' + ev('p') + ')=' + ev('p') + '^2-' + ev('c') + '=' + ev('p^2-c') + '$ et $f\'('
     + ev('p') + ')=2\\times' + ev('p') + '=' + ev('2*p') + '$.',
     '`x` devient $' + ev('p') + '-\\dfrac{' + ev('p') + '^2-' + ev('c') + '}{' + ev('2*p')
     + '}=\\dfrac{' + ev('p') + '^2+' + ev('c') + '}{' + ev('2*p') + '}=\\dfrac{' + ev('p^2+c')
     + '}{' + ev('2*p') + '}=' + col(evd('r')) + '$.'])

V288_LIGNE = ligne(
    'La méthode de Newton remplace $x$ par l\'abscisse du point où la tangente à la courbe de'
    ' $f$ au point d\'abscisse $x$ coupe l\'axe des abscisses. Dans le programme ci-dessous,'
    ' `fp` est la fonction dérivée de `f`.'
    + python(NEWTON.replace('{ligne}', '...'))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [var('c', '2|3|5|6|7|10')], '`' + LIGNE_NEWTON + '`',
    ['`x = x + f(x) / fp(x)`', '`x = x - fp(x) / f(x)`', '`x = f(x) / fp(x)`'],
    ['La tangente au point d\'abscisse $x$ a pour équation $y=f(x)+f\'(x)(t-x)$.',
     'Elle coupe l\'axe des abscisses quand $y=0$ : $f(x)+f\'(x)(t-x)=0$, soit'
     ' $t=x-\\dfrac{f(x)}{f\'(x)}$ (si $f\'(x)\\neq0$).',
     'La ligne est donc `' + LIGNE_NEWTON + '`.'])

V288_INTERPRETER = ligne(
    'On considère le programme Python suivant, où `fp` est la fonction dérivée de `f`.'
    + python(NEWTON.replace('{ligne}', LIGNE_NEWTON) + '\n\nprint(newton(' + ev('p') + ', 20))')
    + 'De quel nombre la valeur affichée est-elle une valeur approchée ?',
    [var('c', '2|3|5|6|7|10'), var('p', '1..4')],
    '$\\sqrt{' + ev('c') + '}$',
    ['$' + ev('c') + '$', '$' + ev('c') + '^2$', '$f(' + ev('p') + ')$'],
    ['La méthode de Newton fournit des valeurs de plus en plus proches d\'une solution de'
     ' $f(x)=0$, ici en partant de $' + ev('p') + '>0$.',
     '$x^2-' + ev('c') + '=0$ a pour solution positive $\\sqrt{' + ev('c') + '}$.',
     'La valeur affichée est une valeur approchée de $' + col('\\sqrt{' + ev('c') + '}') + '$.'])

MODELES.append(modele(
    '02-methode-de-newton', 'Méthode de Newton en Python',
    'Méthode de Newton pour f(x) = x² − c : faire tourner une itération, compléter la ligne'
    ' x = x − f(x)/f′(x) (tangente), dire de quel nombre le résultat est une valeur approchée',
    5, [V288_TOURNER, V288_LIGNE, V288_INTERPRETER],
    [spec('p = 2, c = 2 : 1,5', 0, '1.5', 'correct', {'p': 2, 'c': 2, 'r': 1.5}),
     spec('p = 2, c = 2 : 1,5 avec virgule', 0, '1,5', 'correct', {'p': 2, 'c': 2, 'r': 1.5}),
     spec('Erreur : x + f(x)/f′(x)', 0, '2.5', 'incorrect', {'p': 2, 'c': 2, 'r': 1.5}),
     spec('p = 4, c = 6 : 2,75', 0, '2.75', 'correct', {'p': 4, 'c': 6, 'r': 2.75})]
    + specs_choix(1, LIGNE_NEWTON, ['x = x + f(x) / fp(x)', 'x = x - fp(x) / f(x)',
                                    'x = f(x) / fp(x)'], {'c': 2})
    + specs_choix(2, 'racine de c', ['c', 'c²', 'f(p)'], {'c': 2, 'p': 1})))

# --- 3. 1SPE-298 : construction de l'exponentielle par la méthode d'Euler -----------------------

EULER = ('def euler(h, n):\n'
         '    x = 0\n'
         '    y = 1\n'
         '    for k in range(n):\n'
         '        {ligne}\n'
         '        x = x + h\n'
         '    return y')
LIGNE_EULER = 'y = y + h * y'

V298_TOURNER = case(
    'On considère la fonction Python suivante.'
    + python(EULER.format(ligne=LIGNE_EULER))
    + 'Que renvoie `euler(' + evd('h') + ', ' + ev('n') + ')` ?\n\n$?$',
    [var('h', '0.1|0.2|0.5'), var('n', '2|3'), var('r', 'eval:(1+h)^n')],
    evd('r'),
    ['`y = y + h * y` revient à multiplier `y` par $1+' + evd('h') + '=' + evd('1+h')
     + '$ ; la boucle est parcourue $' + ev('n') + '$ fois.',
     'Valeurs successives de `y` : $1$, $' + evd('1+h') + '$, $' + evd('(1+h)^2') + '${{if:n==3|,'
     ' $' + evd('(1+h)^3') + '$|}}.',
     '`euler(' + evd('h') + ', ' + ev('n') + ')` renvoie $' + evd('1+h') + '^' + ev('n') + '='
     + col(evd('r')) + '$.'])

V298_LIGNE = ligne(
    'La fonction exponentielle vérifie $\\exp\'=\\exp$ et $\\exp(0)=1$. Pour $h$ proche de $0$,'
    ' on a $\\exp(x+h)\\approx\\exp(x)+h\\exp\'(x)$. La fonction Python ci-dessous calcule de'
    ' proche en proche des valeurs approchées $y$ de $\\exp(x)$ pour $x=0$, $h$, $2h$, …'
    + python(EULER.format(ligne='...'))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`' + LIGNE_EULER + '`', ['`y = y + h`', '`y = h * y`', '`y = y + h * x`'],
    ['Si `y` est une valeur approchée de $\\exp(x)$, alors $\\exp(x+h)\\approx\\exp(x)+h'
     '\\exp\'(x)=\\exp(x)+h\\exp(x)$, puisque $\\exp\'=\\exp$.',
     'La nouvelle valeur de `y` est donc `y + h * y` : on utilise $\\exp\'(x)=\\exp(x)$, pas'
     ' $x$, ni $1$.',
     'La ligne est donc `' + LIGNE_EULER + '`.'])

V298_INTERPRETER = ligne(
    'On considère la fonction Python suivante (méthode d\'Euler pour la fonction exponentielle).'
    + python(EULER.format(ligne=LIGNE_EULER))
    + 'De quel nombre `euler(0.01, ' + ev('100*k') + ')` est-il une valeur approchée ?',
    [var('k', '1..3')],
    '$e^{' + ev('k') + '}$',
    ['$e^{0{,}01}$', '$e^{' + ev('100*k') + '}$', '$' + ev('k') + '$'],
    ['Partant de $x=0$, la boucle fait $' + ev('100*k') + '$ pas de $0{,}01$ : à la fin,'
     ' $x=' + ev('100*k') + '\\times0{,}01=' + ev('k') + '$.',
     'À chaque pas, `y` est une valeur approchée de $\\exp(x)$.',
     'La valeur renvoyée est une valeur approchée de $' + col('\\exp(' + ev('k') + ')=e^{'
                                                           + ev('k') + '}') + '$.'])

MODELES.append(modele(
    '03-methode-d-euler', 'Méthode d\'Euler pour l\'exponentielle en Python',
    'Méthode d\'Euler (exp′ = exp, exp(0) = 1) : faire tourner deux ou trois pas, compléter la'
    ' ligne y = y + h * y, dire de quel nombre euler(0.01, n) est une valeur approchée',
    2, [V298_TOURNER, V298_LIGNE, V298_INTERPRETER],
    [spec('h = 0,5, n = 2 : 2,25', 0, '2.25', 'correct', {'h': 0.5, 'n': 2, 'r': 2.25}),
     spec('h = 0,5, n = 2 : 2,25 avec virgule', 0, '2,25', 'correct',
          {'h': 0.5, 'n': 2, 'r': 2.25}),
     spec('Erreur : y + h à chaque pas', 0, '2', 'incorrect', {'h': 0.5, 'n': 2, 'r': 2.25}),
     spec('h = 0,1, n = 3 : 1,331', 0, '1.331', 'correct', {'h': 0.1, 'n': 3, 'r': 1.331})]
    + specs_choix(1, LIGNE_EULER, ['y = y + h', 'y = h * y', 'y = y + h * x'])
    + specs_choix(2, 'e^k', ['e^0,01', 'e^(100k)', 'k'], {'k': 2})))

# --- 4. 1SPE-299 : valeur approchée de e par la suite ((1 + 1/n)^n) ----------------------------

V299_TOURNER = case(
    'On considère la fonction Python suivante.'
    + python('def u(n):\n'
             '    p = 1\n'
             '    for k in range(n):\n'
             '        p = p * (1 + 1/n)\n'
             '    return p')
    + 'Que renvoie `u(' + ev('n') + ')` ?\n\n$?$',
    [var('n', '1|2'), var('r', 'eval:(1+1/n)^n')],
    evd('r'),
    ['La boucle est parcourue $' + ev('n') + '$ fois ; à chaque tour, `p` est multiplié par'
     ' $1+\\dfrac{1}{' + ev('n') + '}=' + evd('1+1/n') + '$.',
     '`u(n)` renvoie donc $\\left(1+\\dfrac{1}{n}\\right)^n$.',
     '`u(' + ev('n') + ')` renvoie $' + evd('1+1/n') + '^' + ev('n') + '=' + col(evd('r')) + '$.'])

V299_LIGNE = ligne(
    'La fonction Python ci-dessous doit renvoyer le terme $u_n=\\left(1+\\dfrac{1}{n}\\right)^n$,'
    ' qui donne des valeurs approchées du nombre $e$.'
    + python('def u(n):\n'
             '    return ...')
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`(1 + 1/n)**n`', ['`(1 + n)**(1/n)`', '`1 + (1/n)**n`', '`(1 + 1/n) * n`'],
    ['En Python, `**` est la puissance et `*` la multiplication.',
     'Il faut élever $1+\\dfrac{1}{n}$ (avec ses parenthèses) à la puissance $n$ : avec'
     ' `1 + (1/n)**n`, seul $\\dfrac{1}{n}$ serait élevé à la puissance.',
     'On écrit donc `return (1 + 1/n)**n`.'])

V299_INTERPRETER = ligne(
    'On considère le programme Python suivant.'
    + python('def u(n):\n'
             '    return (1 + 1/n)**n\n'
             '\n'
             'for n in [10, 100, 1000, 10000]:\n'
             '    print(u(n))')
    + 'Que peut-on dire des valeurs affichées ?',
    [], 'Elles augmentent et se rapprochent de $e\\approx2{,}718$.',
    ['Elles augmentent sans limite.', 'Elles diminuent et se rapprochent de $1$.',
     'Elles se rapprochent de $2$.'],
    ['Les valeurs affichées sont environ $2{,}594$ ; $2{,}705$ ; $2{,}717$ ; $2{,}718$.',
     'La suite $\\left(\\left(1+\\dfrac{1}{n}\\right)^n\\right)$ est croissante et se rapproche'
     ' du nombre $e=\\exp(1)$.',
     'Les valeurs ' + '$' + col('\\text{augmentent et se rapprochent de }e\\approx2{,}718') + '$.'])

MODELES.append(modele(
    '04-valeur-approchee-de-e', 'Valeur approchée de e avec Python',
    'Suite ((1 + 1/n)^n) : faire tourner u(1) ou u(2), compléter le return (1 + 1/n)**n, dire'
    ' comment évoluent u(10), u(100), u(1000), u(10000)',
    8, [V299_TOURNER, V299_LIGNE, V299_INTERPRETER],
    [spec('u(2) = 2,25', 0, '2.25', 'correct', {'n': 2, 'r': 2.25}),
     spec('u(2) = 2,25 avec virgule', 0, '2,25', 'correct', {'n': 2, 'r': 2.25}),
     spec('Erreur : 1 + 1/2 × 2', 0, '3', 'incorrect', {'n': 2, 'r': 2.25}),
     spec('u(1) = 2', 0, '2', 'correct', {'n': 1, 'r': 2})]
    + specs_choix(1, '(1 + 1/n)**n', ['(1 + n)**(1/n)', '1 + (1/n)**n', '(1 + 1/n) * n'])
    + specs_choix(2, 'croissent vers e', ['sans limite', 'vers 1', 'vers 2'])))

# --- 5. 1SPE-309 : approximation de π par la méthode d'Archimède --------------------------------

ARCHIMEDE = ('from math import sqrt\n'
             '\n'
             'def archimede(k):\n'
             '    n = 6\n'
             '    c = 1\n'
             '    for j in range(k):\n'
             '        c = sqrt(2 - sqrt(4 - c**2))\n'
             '        n = 2 * n\n'
             '    {retour}')
INTRO_ARCHIMEDE = ('Dans un cercle de rayon $1$, on inscrit un polygone régulier à $n$ côtés de'
                   ' longueur $c$ : on part de l\'hexagone ($n=6$, $c=1$), puis on double le'
                   ' nombre de côtés à chaque tour de boucle.')

V309_TOURNER = case(
    INTRO_ARCHIMEDE + python(ARCHIMEDE.format(retour='return n * c / 2'))
    + 'Combien de côtés a le polygone à la fin de l\'appel `archimede(' + ev('k') + ')`,'
    ' c\'est-à-dire que vaut `n` ?\n\n$?$',
    [var('k', '1..5'), var('m', 'eval:6*2^k')],
    ev('m'),
    ['`n` part de $6$ et la boucle est parcourue $' + ev('k') + '$ fois.',
     'À chaque tour, `n = 2 * n` double le nombre de côtés : $6$, $12${{if:k>=2|, $24$|}}'
     '{{if:k>=3|, $48$|}}{{if:k>=4|, $96$|}}{{if:k>=5|, $192$|}}.',
     'À la fin, `n` vaut $6\\times2^{' + ev('k') + '}=' + col(ev('m')) + '$.'])

V309_LIGNE = ligne(
    INTRO_ARCHIMEDE + ' La fonction doit renvoyer une valeur approchée de $\\pi$.'
    + python(ARCHIMEDE.format(retour='return ...'))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`n * c / 2`', ['`n * c`', '`c / 2`', '`n / 2`'],
    ['Le périmètre du polygone, $n\\times c$, est proche de celui du cercle, $2\\pi\\times1'
     '=2\\pi$.',
     'Donc $\\pi\\approx\\dfrac{n\\times c}{2}$ : `n * c` donnerait une valeur approchée de'
     ' $2\\pi$.',
     'On écrit donc `return n * c / 2`.'])

V309_INTERPRETER = ligne(
    INTRO_ARCHIMEDE + python(ARCHIMEDE.format(retour='return n * c / 2'))
    + 'Que renvoie `archimede(' + ev('k') + ')` ?',
    [var('k', '2..6')],
    'Une valeur approchée de $\\pi$ par défaut.',
    ['Une valeur approchée de $\\pi$ par excès.', 'Une valeur approchée de $2\\pi$.',
     'La longueur d\'un côté du polygone.'],
    ['`n * c` est le périmètre du polygone et $2\\pi$ celui du cercle ; on renvoie la moitié'
     ' du périmètre du polygone.',
     'Le polygone est inscrit dans le cercle : chaque côté est plus court que l\'arc qu\'il'
     ' sous-tend, donc $n\\times c<2\\pi$ et $\\dfrac{n\\times c}{2}<\\pi$. Par exemple,'
     ' `archimede(0)` renvoie $3$ et `archimede(3)` environ $3{,}139$.',
     '`archimede(' + ev('k') + ')` renvoie ' + '$' + col('\\text{une valeur approchée de }\\pi'
                                                       '\\text{ par défaut}') + '$.'])

MODELES.append(modele(
    '05-archimede', 'Approximation de π par Archimède en Python',
    'Polygones réguliers inscrits dans le cercle de rayon 1, nombre de côtés doublé à chaque'
    ' tour : faire tourner (nombre de côtés), compléter le return n * c / 2, interpréter'
    ' (valeur approchée de π par défaut)',
    7, [V309_TOURNER, V309_LIGNE, V309_INTERPRETER],
    [spec('k = 3 : 48 côtés', 0, '48', 'correct', {'k': 3, 'm': 48}),
     spec('Erreur : un doublement de moins', 0, '24', 'incorrect', {'k': 3, 'm': 48}),
     spec('k = 1 : 12 côtés', 0, '12', 'correct', {'k': 1, 'm': 12})]
    + specs_choix(1, 'n * c / 2', ['n * c', 'c / 2', 'n / 2'])
    + specs_choix(2, 'π par défaut', ['π par excès', '2π', 'côté'], {'k': 3})))

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
