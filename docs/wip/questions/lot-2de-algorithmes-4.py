"""Écrit les 4 modèles du lot 4 « exemples d'algorithmes : nombres » de la seconde
dans scripts/questions/2de-algorithmes-4/.

Phase 0 validée par David le 2026-11-08 (D3 du journal
« docs/wip/questions-2de-demonstrations-progress.md », § 9) : un point par modèle, chacun sur la
sous-notion existante de son point, niveau après ceux déjà présents :

| # | Point | Titre                                                     | Niv. | Nœud du modèle                               |
| 1 | 2-241 | Tester si un entier est multiple d'un autre en Python      | 12   | Divisibilité › multiples et diviseurs        |
| 2 | 2-242 | Plus grand multiple de a inférieur ou égal à b, en Python | 13   | Divisibilité › multiples et diviseurs        |
| 3 | 2-257 | Encadrer √2 par balayage en Python                        | 3    | Boucles › boucle bornée                      |
| 4 | 2-283 | Première puissance qui dépasse un seuil, en Python        | 3    | Boucles › boucle non bornée                  |

Forme (D3, Q2) : Python seulement ; (a) faire tourner un programme (case), (b) compléter une ligne
(case choix à 4 propositions, la première est la bonne, ordre mélangé à l'affichage), (c)
interpréter. Valeurs calculables à la main.

Variables : jamais `e` ni `E` (constante d'Euler), ni `i`. Jamais `str.format` sur un texte qui
contient `{{eval}}`.

    python3 docs/wip/questions/lot-2de-algorithmes-4.py scripts/questions/2de-algorithmes-4
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
    return nom, {'title': title, 'description': description, 'grades': ['2'],
                 'level': level, 'delay': 90, 'status': 'draft', 'shared': {},
                 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def ev(x):
    return '{{eval:' + x + '}}'


def dec(x):
    """Valeur écrite en décimal (sans `;d`, un quotient reste en fraction)."""
    return '{{eval:' + x + ';d}}'


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

# --- 1. 2-241 : a est-il multiple de b ? --------------------------------------------------------

# n = d × q + r, avec r = 0 (o = 0, multiple) ou 1 ⩽ r ⩽ d − 1 (o = 1)
VARS_N = [var('d', '3|4|6|7|8|9'), var('o', '0..1'), var('q', '3..9'), var('dm', 'eval:d-1'),
          var('s', '1..{{dm}}'), var('r', 'eval:s*o'), var('n', 'eval:d*q+r')]

V241_MODULO = {
    'statement': 'On considère la fonction Python suivante.'
    + python('def est_multiple(a, b):\n'
             '    return a % b == 0')
    + 'Que renvoie `est_multiple(' + ev('n') + ', ' + ev('d') + ')` ?'
    + choix(['`True`', '`False`'], melanger=False),
    'variables': VARS_N,
    'blanks': [{'expectedAnswer': '{{o}}'}],
    'correction': {'steps': [
        '`a % b` est le reste de la division euclidienne de `a` par `b`. `a % b == 0` vaut `True`'
        ' quand ce reste est nul, c\'est-à-dire quand `a` est un multiple de `b`.',
        '$' + ev('n') + '=' + ev('d') + '\\times' + ev('q') + '+' + ev('r') + '$ : le reste de la'
        ' division de $' + ev('n') + '$ par $' + ev('d') + '$ est $' + ev('r') + '$.',
        '{{if:o==0|Le reste est nul : la fonction renvoie $' + col('\\texttt{True}')
        + '$.|Le reste n\'est pas nul : la fonction renvoie $' + col('\\texttt{False}') + '$.}}']},
}

V241_BOUCLE = case(
    'On considère la fonction Python suivante, qui teste si `a` est un multiple de `b` sans'
    ' utiliser `%`.'
    + python('def est_multiple(a, b):\n'
             '    m = 0\n'
             '    while m < a:\n'
             '        m = m + b\n'
             '    return m == a')
    + 'On appelle `est_multiple(' + ev('n') + ', ' + ev('d') + ')`. Quelle est la valeur de `m`'
    ' à la sortie de la boucle ?\n\n$?$',
    VARS_N + [var('mf', 'eval:d*(q+o)')], ev('mf'),
    ['`m` prend les valeurs $0$, $' + ev('d') + '$, $' + ev('2*d') + '$, $' + ev('3*d')
     + '$, … : les multiples de $' + ev('d') + '$. La boucle s\'arrête au premier qui n\'est'
     ' plus strictement inférieur à $' + ev('n') + '$.',
     '$' + ev('d*(q-1+o)') + '<' + ev('n') + '\\leqslant' + ev('mf') + '$ : la boucle s\'arrête'
     ' avec $m=' + col(ev('mf')) + '$.',
     '{{if:o==0|$m=' + ev('n') + '$ : la fonction renvoie `True`, $' + ev('n')
     + '$ est un multiple de $' + ev('d') + '$.|$m\\neq' + ev('n') + '$ : la fonction renvoie'
     ' `False`, $' + ev('n') + '$ n\'est pas un multiple de $' + ev('d') + '$.}}'])

V241_COMPLETER = ligne(
    'La fonction Python ci-dessous doit renvoyer `True` si l\'entier `a` est un multiple de'
    ' l\'entier `b`, et `False` sinon.'
    + python('def est_multiple(a, b):\n'
             '    return ...')
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`a % b == 0`', ['`a // b == 0`', '`b % a == 0`', '`a % b == 1`'],
    ['`a` est un multiple de `b` quand le reste de la division euclidienne de `a` par `b` est'
     ' nul : `a % b == 0`.',
     '`a // b` est le quotient (nul seulement si `a < b`) ; `b % a == 0` teste si `b` est un'
     ' multiple de `a` ; `a % b == 1` teste si le reste vaut $1$.',
     'On écrit donc `return a % b == 0`.'])

VARS_241 = {'d': 7, 'o': 0, 'q': 5, 'dm': 6, 's': 3, 'r': 0, 'n': 35}
VARS_241B = {'d': 6, 'o': 1, 'q': 4, 'dm': 5, 's': 5, 'r': 5, 'n': 29}
MODELES.append(modele(
    '01-tester-un-multiple', 'Tester si un entier est multiple d\'un autre en Python',
    'est_multiple(a, b) par a % b == 0 : valeur renvoyée (True ou False) ; version par une'
    ' boucle while, valeur de m à la sortie ; compléter la ligne return',
    12, [V241_MODULO, V241_BOUCLE, V241_COMPLETER],
    [spec('35 multiple de 7 : True', 0, '0', 'correct', VARS_241),
     spec('Erreur : False pour 35 et 7', 0, '1', 'incorrect', VARS_241),
     spec('29 n\'est pas multiple de 6 : False', 0, '1', 'correct', VARS_241B),
     spec('35 et 7 : m = 35', 1, '35', 'correct', {**VARS_241, 'mf': 35}),
     spec('29 et 6 : m = 30', 1, '30', 'correct', {**VARS_241B, 'mf': 30}),
     spec('Erreur : dernier m < a', 1, '24', 'incorrect', {**VARS_241B, 'mf': 30})]
    + specs_choix(2, 'a % b == 0', ['a // b == 0', 'b % a == 0', 'a % b == 1'])))

# --- 2. 2-242 : plus grand multiple de a inférieur ou égal à b ----------------------------------

PGM = ('def plus_grand_multiple(a, b):\n'
       '    m = 0\n'
       '    while COND:\n'
       '        m = m + a\n'
       '    return m')

V242_TOURNER = case(
    'On considère la fonction Python suivante.' + python(PGM.replace('COND', 'm + a <= b'))
    + 'Que renvoie `plus_grand_multiple(' + ev('a') + ', ' + ev('b') + ')` ?\n\n$?$',
    [var('a', '3..9'), var('b', '20..80'), var('m', 'eval:b-mod(b,a)')], ev('m'),
    ['`m` prend les valeurs $0$, $' + ev('a') + '$, $' + ev('2*a') + '$, … : les multiples de $'
     + ev('a') + '$. On ajoute `a` tant que le multiple suivant, `m + a`, ne dépasse pas $'
     + ev('b') + '$.',
     '$' + ev('m') + '\\leqslant' + ev('b') + '<' + ev('m+a') + '$ : la boucle s\'arrête avec $m='
     + ev('m') + '$.',
     'La fonction renvoie $' + col(ev('m')) + '$, le plus grand multiple de $' + ev('a')
     + '$ inférieur ou égal à $' + ev('b') + '$.'])

V242_CONDITION = ligne(
    'La fonction Python ci-dessous doit renvoyer le plus grand multiple de l\'entier `a`'
    ' inférieur ou égal à l\'entier `b` (`a` et `b` strictement positifs).'
    + python(PGM.replace('COND', '...'))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`m + a <= b`', ['`m <= b`', '`m + a < b`', '`m < b`'],
    ['On ne doit ajouter `a` que si le multiple suivant, `m + a`, reste inférieur ou égal à `b`.',
     'Avec `m <= b` ou `m < b`, on ajoute `a` une fois de trop : on obtient un multiple qui peut'
     ' dépasser `b`. Avec `m + a < b`, on s\'arrête trop tôt quand `b` est lui-même un multiple'
     ' de `a`.',
     'La condition est donc `m + a <= b`.'])

V242_SANS_BOUCLE = ligne(
    'La fonction Python ci-dessous doit renvoyer, sans boucle, le plus grand multiple de l\'entier'
    ' `a` inférieur ou égal à l\'entier `b` (`a` et `b` strictement positifs).'
    + python('def plus_grand_multiple(a, b):\n'
             '    return ...')
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`(b // a) * a`', ['`(b / a) * a`', '`b % a`', '`b - a`'],
    ['`b // a` est le quotient de la division euclidienne de `b` par `a` : le nombre de fois'
     ' que `a` « tient » dans `b`. Le plus grand multiple de `a` inférieur ou égal à `b` est'
     ' donc `(b // a) * a`.',
     '`b / a` est le quotient décimal : `(b / a) * a` redonne `b`. `b % a` est le reste, et'
     ' `b - a` n\'est en général pas un multiple de `a`.',
     'On écrit donc `return (b // a) * a`.'])

MODELES.append(modele(
    '02-plus-grand-multiple', 'Plus grand multiple de a inférieur ou égal à b, en Python',
    'plus_grand_multiple(a, b) par une boucle while : valeur renvoyée (a de 3 à 9, b de 20 à 80),'
    ' compléter la condition ; version sans boucle par le quotient entier b // a',
    13, [V242_TOURNER, V242_CONDITION, V242_SANS_BOUCLE],
    [spec('a = 7, b = 50 : 49', 0, '49', 'correct', {'a': 7, 'b': 50, 'm': 49}),
     spec('Erreur : premier multiple au-dessus', 0, '56', 'incorrect', {'a': 7, 'b': 50, 'm': 49}),
     spec('b multiple de a : a = 5, b = 40', 0, '40', 'correct', {'a': 5, 'b': 40, 'm': 40})]
    + specs_choix(1, 'm + a <= b', ['m <= b', 'm + a < b', 'm < b'])
    + specs_choix(2, '(b // a) * a', ['(b / a) * a', 'b % a', 'b - a'])))

# --- 3. 2-257 : encadrement de √2 par balayage ---------------------------------------------------

BALAYAGE = ('def balayage(n):\n'
            '    pas = 10 ** (-n)\n'
            '    x = 1\n'
            '    while COND:\n'
            '        x = x + pas\n'
            '    return x, x + pas')

V257_TOURNER = case(
    'On considère la fonction Python suivante.' + python(BALAYAGE.replace('COND', '(x + pas) ** 2 <= 2'))
    + 'On appelle `balayage(' + ev('n') + ')`. Complète l\'encadrement de $\\sqrt{2}$ renvoyé.'
    '\n\n$?\\leqslant\\sqrt{2}\\leqslant?$',
    [var('n', '1..2'), var('g', 'eval:floor(sqrt(2)*10^n)/10^n'), var('h', 'eval:g+10^(-n)')],
    [dec('g'), dec('h')],
    ['Le pas vaut $10^{-' + ev('n') + '}=' + dec('10^(-n)') + '$. Partant de $1$, `x` avance d\'un'
     ' pas tant que le nombre suivant, `x + pas`, a un carré inférieur ou égal à $2$.',
     '$' + dec('g') + '^2=' + dec('g^2') + '\\leqslant2$ et $' + dec('h') + '^2=' + dec('h^2')
     + '>2$ : la boucle s\'arrête avec $x=' + dec('g') + '$.',
     'La fonction renvoie $' + dec('g') + '$ et $' + dec('h') + '$ : $' + col(dec('g'))
     + '\\leqslant\\sqrt{2}\\leqslant' + col(dec('h')) + '$. (À l\'écran, Python peut afficher'
     ' `' + '{{if:n==1|1.4000000000000004|1.4100000000000004}}' + '` : il calcule avec des'
     ' valeurs approchées des décimaux.)'])

V257_CONDITION = ligne(
    'La fonction Python ci-dessous doit renvoyer un encadrement de $\\sqrt{2}$ d\'amplitude'
    ' $10^{-n}$, par balayage à partir de $1$.'
    + python(BALAYAGE.replace('COND', '...'))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`(x + pas) ** 2 <= 2`', ['`x ** 2 <= 2`', '`(x + pas) ** 2 >= 2`', '`x + pas <= 2`'],
    ['$\\sqrt{2}$ est le nombre positif dont le carré vaut $2$ : on avance tant que le nombre'
     ' suivant, `x + pas`, a un carré inférieur ou égal à $2$. À la sortie,'
     ' $x^2\\leqslant2<(x+\\text{pas})^2$, donc $x\\leqslant\\sqrt{2}<x+\\text{pas}$.',
     'Avec `x ** 2 <= 2`, on avance un pas de trop : à la sortie, $x^2>2$. Avec'
     ' `(x + pas) ** 2 >= 2`, la boucle ne tourne pas : au départ, $(1+\\text{pas})^2<2$. Avec `x + pas <= 2`, on'
     ' encadrerait $2$, pas $\\sqrt{2}$.',
     'La condition est donc `(x + pas) ** 2 <= 2`.'])

V257_AMPLITUDE = ligne(
    'On considère la fonction Python suivante.' + python(BALAYAGE.replace('COND', '(x + pas) ** 2 <= 2'))
    + 'Les deux nombres renvoyés par `balayage(' + ev('n') + ')` encadrent $\\sqrt{2}$. Quelle'
    ' est l\'amplitude de cet encadrement ?',
    [var('n', '2..5')], '$10^{-' + ev('n') + '}$',
    ['$10^{' + ev('n') + '}$', '$\\dfrac{1}{' + ev('n') + '}$', '$' + ev('n') + '\\times10^{-1}$'],
    ['La fonction renvoie `x` et `x + pas` : leur écart est `pas`.',
     '`pas = 10 ** (-n)` : pour $n=' + ev('n') + '$, le pas vaut $10^{-' + ev('n') + '}$.',
     'L\'amplitude de l\'encadrement est $' + col('10^{-' + ev('n') + '}') + '$ : plus $n$ est'
     ' grand, plus l\'encadrement est précis (et plus la boucle fait de tours).'])

MODELES.append(modele(
    '03-encadrer-racine-de-2-par-balayage', 'Encadrer √2 par balayage en Python',
    'balayage(n), pas 10^(−n) : encadrement renvoyé pour n = 1 ou 2 (deux cases), compléter la'
    ' condition de la boucle while, amplitude de l\'encadrement',
    3, [V257_TOURNER, V257_CONDITION, V257_AMPLITUDE],
    [spec('n = 1 : 1,4 et 1,5', 0, ['1,4', '1,5'], 'correct', {'n': 1, 'g': '1.4', 'h': '1.5'}),
     spec('n = 2 : 1.41 et 1.42', 0, ['1.41', '1.42'], 'correct', {'n': 2, 'g': '1.41', 'h': '1.42'}),
     spec('Erreur : un pas de trop', 0, ['1,5', '1,6'], 'incorrect', {'n': 1, 'g': '1.4', 'h': '1.5'})]
    + specs_choix(1, '(x + pas) ** 2 <= 2', ['x ** 2 <= 2', '(x + pas) ** 2 >= 2', 'x + pas <= 2'])
    + specs_choix(2, '10^-n', ['10^n', '1/n', 'n × 10^-1'], {'n': 3})))

# --- 4. 2-283 : première puissance au-dessus (au-dessous) d'un seuil ----------------------------

PUISSANCE = ('def premiere_puissance(q, M):\n'
             '    n = 0\n'
             '    while COND:\n'
             '        n = n + 1\n'
             '    return n')

# q^(N−1) ⩽ M < q^N : la fonction renvoie N
V283_TOURNER = case(
    'On considère la fonction Python suivante.' + python(PUISSANCE.replace('COND', 'q ** n <= M'))
    + 'Que renvoie `premiere_puissance(' + ev('q') + ', ' + ev('M') + ')` ?\n\n$?$',
    [var('q', '2|3'), var('N', '3..5'), var('lo', 'eval:q^(N-1)'), var('hi', 'eval:q^N-1'),
     var('M', '{{lo}}..{{hi}}')], ev('N'),
    ['La boucle augmente `n` tant que $' + ev('q') + '^n\\leqslant' + ev('M') + '$ : elle'
     ' renvoie le premier exposant $n$ tel que $' + ev('q') + '^n>' + ev('M') + '$.',
     '$' + ev('q') + '^{' + ev('N-1') + '}=' + ev('lo') + '\\leqslant' + ev('M') + '$ et $'
     + ev('q') + '^{' + ev('N') + '}=' + ev('q^N') + '>' + ev('M') + '$.',
     'La fonction renvoie $' + col(ev('N')) + '$.'])

V283_CONDITION = ligne(
    'La fonction Python ci-dessous doit renvoyer le premier entier $n$ tel que $q^n>M$ (avec'
    ' $q>1$).'
    + python(PUISSANCE.replace('COND', '...'))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`q ** n <= M`', ['`q ** n > M`', '`q * n <= M`', '`n <= M`'],
    ['On augmente `n` **tant que** la puissance n\'a pas encore dépassé $M$, c\'est-à-dire tant'
     ' que $q^n\\leqslant M$. En Python, $q^n$ s\'écrit `q ** n`.',
     'Avec `q ** n > M`, la boucle ne tourne pas (au départ $q^0=1$). `q * n` est un produit,'
     ' pas une puissance ; `n <= M` compare l\'exposant à $M$.',
     'La condition est donc `q ** n <= M`.'])

# s = 0,c ou 0,0c ; premier n tel que 0,5^n < s
V283_INFERIEURE = case(
    'On considère la fonction Python suivante, qui renvoie le premier entier $n$ tel que'
    ' $0{,}5^n<s$.'
    + python('def premiere_puissance(s):\n'
             '    n = 0\n'
             '    while 0.5 ** n >= s:\n'
             '        n = n + 1\n'
             '    return n')
    + 'Que renvoie `premiere_puissance(0.{{if:t==1|0|}}' + ev('c') + ')` ?\n\n$?$',
    [var('t', '0..1'), var('c', '1|2|3|4'), var('s', 'eval:c/10^(t+1)'),
     var('N', 'eval:floor(ln(s)/ln(0.5))+1')], ev('N'),
    ['Les puissances de $0{,}5$ diminuent : $1$ ; $0{,}5$ ; $0{,}25$ ; $0{,}125$ ; $0{,}0625$ ;'
     ' $0{,}03125$ ; $0{,}015625$ ; $0{,}0078125$ ; …',
     '$0{,}5^{' + ev('N-1') + '}=' + dec('0.5^(N-1)') + '\\geqslant' + dec('s') + '$ et $0{,}5^{'
     + ev('N') + '}=' + dec('0.5^N') + '<' + dec('s') + '$.',
     'La fonction renvoie $' + col(ev('N')) + '$.'])

MODELES.append(modele(
    '04-premiere-puissance-seuil', 'Première puissance qui dépasse un seuil, en Python',
    'premiere_puissance(q, M) par une boucle while : valeur renvoyée (q = 2 ou 3), compléter la'
    ' condition ; première puissance de 0,5 inférieure à un seuil (0,1 à 0,04)',
    3, [V283_TOURNER, V283_CONDITION, V283_INFERIEURE],
    [spec('q = 2, M = 20 : 5', 0, '5', 'correct', {'q': 2, 'N': 5, 'lo': 16, 'hi': 31, 'M': 20}),
     spec('Erreur : dernier exposant sous le seuil', 0, '4', 'incorrect',
          {'q': 2, 'N': 5, 'lo': 16, 'hi': 31, 'M': 20}),
     spec('q = 3, M = 9 : 3', 0, '3', 'correct', {'q': 3, 'N': 3, 'lo': 9, 'hi': 26, 'M': 9})]
    + specs_choix(1, 'q ** n <= M', ['q ** n > M', 'q * n <= M', 'n <= M'])
    + [spec('s = 0,1 : 4', 2, '4', 'correct', {'t': 0, 'c': 1, 's': '0.1', 'N': 4}),
       spec('s = 0,03 : 6', 2, '6', 'correct', {'t': 1, 'c': 3, 's': '0.03', 'N': 6}),
       spec('Erreur : dernier exposant au-dessus', 2, '3', 'incorrect',
            {'t': 0, 'c': 1, 's': '0.1', 'N': 4})]))

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
