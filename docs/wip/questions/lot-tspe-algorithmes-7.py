"""Écrit les 4 modèles du lot 7 « algorithmes : probabilités, simulation et loi binomiale » de la
terminale spécialité dans scripts/questions/tspe-algorithmes-7/.

Phase 0 des algorithmes validée par David le 2026-11-12 (D2 du journal
« docs/wip/questions-tspe-demonstrations-progress.md », § 18), phase 0 du lot validée le
2026-11-12 (D4, § 27). Un point par modèle, chacun sur une sous-notion existante, au-dessus des
niveaux déjà présents (relevé prod du 2026-11-12) :

| # | Point    | Titre                                               | Niv. | Nœud du modèle                                 |
| 1 | TSPE-324 | Permutations en Python : générer, tirer au hasard   | 4    | Dénombrement › Arr. et permutations › permut.  |
| 2 | TSPE-513 | Planche de Galton en Python                         | 4    | Probabilités › Loi binomiale › schéma de Bern. |
| 3 | TSPE-514 | Problème de la surréservation en Python             | 3    | Probabilités › Loi binomiale › interv. fluct.  |
| 4 | TSPE-515 | Simuler un échantillon en Python                    | 4    | Probabilités › Sommes et conc. › échantillons  |

Forme (D2, Q2, comme D9 de la 1re) : Python seulement ; (a) faire tourner un programme (case),
(b) compléter une ligne (case choix à 4 propositions, la première est la bonne, ordre mélangé à
l'affichage), (c) interpréter. Un programme aléatoire n'est jamais « faites-le tourner » : 513 et
515 n'ont pas de forme (a) (D4 : 513 double (c), 515 double (b)). 514 : la table des P(X ⩽ k)
de B(80 ; 0,9) est donnée dans l'énoncé.

Gabarits remplis par `replace`, jamais par `format` (format mange les accolades de {{eval:…}}).
Variables : jamais `e` ni `E` (constante d'Euler), ni `i`. Dans le code Python, un décimal est
écrit en dur ou par {{if:…}} (jamais par {{eval}}, qui l'écrirait avec une virgule).

    python3 docs/wip/questions/lot-tspe-algorithmes-7.py scripts/questions/tspe-algorithmes-7
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

# Liste [1, 2, …, n] et sa renversée, pour n ∈ {3, 4, 5} (une liste n'est pas une valeur d'eval)
LISTE = '{{if:n==3|[1, 2, 3]|{{if:n==4|[1, 2, 3, 4]|[1, 2, 3, 4, 5]}}}}'
RENVERSEE = '{{if:n==3|[3, 2, 1]|{{if:n==4|[4, 3, 2, 1]|[5, 4, 3, 2, 1]}}}}'

# --- 1. TSPE-324 : générer les permutations, tirer une permutation au hasard ------------------

PERMUTATIONS = ('def permutations(L):\n'
                '    if len(L) <= 1:\n'
                '        return [L]\n'
                '    resultat = []\n'
                '    for i in range(len(L)):\n'
                '        reste = L[:i] + L[i+1:]\n'
                '        for P in permutations(reste):\n'
                '            resultat.append([L[i]] + P)\n'
                '    return resultat')

V324_TOURNER = case(
    'La fonction Python ci-dessous renvoie la liste de toutes les permutations de la liste `L`'
    ' (chacune écrite comme une liste).'
    + python(PERMUTATIONS + '\n\nprint(len(permutations(' + LISTE + ')))')
    + 'Quel nombre ce programme affiche-t-il ?\n\n$?$',
    [var('n', '3..5'), var('r', 'eval:factorial(n)')],
    ev('r'),
    ['Pour chaque premier élément `L[i]` (il y a `len(L)` choix), la fonction ajoute toutes les'
     ' permutations des éléments restants.',
     'Donc, pour une liste de $m$ éléments, le nombre de permutations est $m$ fois celui d\'une'
     ' liste de $m-1$ éléments, et il vaut $1$ pour $m=1$ : $m\\times(m-1)\\times\\cdots\\times1'
     '=m!$.',
     'Pour $' + ev('n') + '$ éléments, le programme affiche $' + ev('n') + '!=' + col(ev('r'))
     + '$.'])

MELANGE = ('from random import randint\n'
           '\n'
           'def melange(L):\n'
           '    n = len(L)\n'
           '    for i in range(n - 1, 0, -1):\n'
           '        {ligne}\n'
           '        L[i], L[j] = L[j], L[i]\n'
           '    return L')
LIGNE_MELANGE = 'j = randint(0, i)'

V324_LIGNE = ligne(
    'La fonction Python ci-dessous doit mélanger la liste `L` de façon que toutes ses'
    ' permutations aient la même probabilité d\'être obtenues (mélange de Fisher-Yates) :'
    ' `randint(a, b)` renvoie un entier au hasard entre `a` et `b`, **bornes comprises**.'
    + python(MELANGE.replace('{ligne}', '...'))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`' + LIGNE_MELANGE + '`',
    ['`j = randint(0, n - 1)`', '`j = randint(0, i - 1)`', '`j = randint(1, i)`'],
    ['À chaque tour, on choisit au hasard l\'élément qui ira en position `i`, parmi ceux des'
     ' positions $0$ à $i$ qui ne sont pas encore placés : `j = randint(0, i)`.',
     'Il y a alors $n\\times(n-1)\\times\\cdots\\times2=n!$ suites de tirages équiprobables, une'
     ' par permutation. Avec `randint(0, n - 1)`, il y en a $n^{n-1}$, qui n\'est pas un multiple'
     ' de $n!$ : certaines permutations sortent plus souvent. Avec `randint(0, i - 1)`, `L[i]` est'
     ' toujours échangé et la liste de départ ne peut pas sortir ; avec `randint(1, i)`, `L[0]` ne'
     ' bouge jamais.',
     'La ligne est donc `' + LIGNE_MELANGE + '`.'])

V324_INTERPRETER = ligne(
    'On reprend la fonction `melange` ci-dessous, qui tire une permutation de `L` au hasard, toutes'
    ' les permutations ayant la même probabilité d\'être obtenues.'
    + python(MELANGE.replace('{ligne}', LIGNE_MELANGE))
    + 'On exécute `melange(' + LISTE + ')`. Quelle est la probabilité que la liste renvoyée soit `'
    + RENVERSEE + '` ?',
    [var('n', '3..5')],
    '$\\dfrac{1}{' + ev('factorial(n)') + '}$',
    ['$\\dfrac{1}{' + ev('n') + '}$', '$\\dfrac{1}{' + ev('n^n') + '}$',
     '$\\dfrac{1}{' + ev('factorial(n-1)') + '}$'],
    ['Une liste de $' + ev('n') + '$ éléments distincts a $' + ev('n') + '!=' + ev('factorial(n)')
     + '$ permutations.',
     'Elles sont équiprobables, et `' + RENVERSEE + '` est l\'une d\'elles.',
     'La probabilité est donc $' + col('\\dfrac{1}{' + ev('factorial(n)') + '}') + '$.'])

MODELES.append(modele(
    '01-permutations-en-python', 'Permutations en Python : générer, tirer au hasard',
    'Permutations : nombre de listes renvoyées par la génération récursive (n! pour n = 3, 4, 5),'
    ' compléter j = randint(0, i) dans le mélange de Fisher-Yates, probabilité d\'une permutation'
    ' donnée (1/n!)',
    4, [V324_TOURNER, V324_LIGNE, V324_INTERPRETER],
    [spec('n = 3 : 6', 0, '6', 'correct', {'n': 3, 'r': 6}),
     spec('n = 4 : 24', 0, '24', 'correct', {'n': 4, 'r': 24}),
     spec('n = 5 : 120', 0, '120', 'correct', {'n': 5, 'r': 120}),
     spec('Erreur : n^n (n = 3)', 0, '27', 'incorrect', {'n': 3, 'r': 6}),
     spec('Erreur : n (n = 4)', 0, '4', 'incorrect', {'n': 4, 'r': 24})]
    + specs_choix(1, LIGNE_MELANGE, ['randint(0, n − 1), biaisé', 'Sattolo', 'L[0] fixe'])
    + specs_choix(2, '1/n!', ['1/n', '1/nⁿ', '1/(n − 1)!'], {'n': 4})))

# --- 2. TSPE-513 : planche de Galton -----------------------------------------------------------

GALTON = ('from random import random\n'
          '\n'
          'def galton(n):\n'
          '    x = 0\n'
          '    for k in range(n):\n'
          '        {condition}\n'
          '            x = x + 1\n'
          '    return x')
CONDITION_GALTON = 'if random() < 0.5:'
CONTEXTE_GALTON = (
    'Dans une planche de Galton à $n$ rangées de clous, une bille rebondit sur un clou de chaque'
    ' rangée et part à droite ou à gauche avec la même probabilité, indépendamment des autres'
    ' rangées. Elle tombe dans la case numéro $x$, où $x$ est le nombre de fois où elle est partie'
    ' à droite.')

V513_LIGNE = ligne(
    CONTEXTE_GALTON + ' La fonction Python ci-dessous doit simuler la chute d\'une bille et'
    ' renvoyer le numéro de sa case ; `random()` renvoie un nombre au hasard dans $[0\\,;\\,1[$.'
    + python(GALTON.replace('{condition}', '...'))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`' + CONDITION_GALTON + '`',
    ['`if random() == 0.5:`', '`if random() < 1:`', '`if random() < 1 / n:`'],
    ['À chaque rangée, la bille part à droite avec la probabilité $\\dfrac{1}{2}$.',
     '`random()` tombe dans $[0\\,;\\,0{,}5[$ avec la probabilité $\\dfrac{1}{2}$. `random() < 1`'
     ' est toujours vrai, `random() == 0.5` ne l\'est presque jamais, et `1 / n` dépend du nombre'
     ' de rangées.',
     'La ligne est donc `' + CONDITION_GALTON + '`.'])

V513_LOI = ligne(
    CONTEXTE_GALTON + ' On simule la chute d\'une bille avec la fonction Python suivante.'
    + python(GALTON.replace('{condition}', CONDITION_GALTON))
    + 'Quelle loi suit le nombre renvoyé par `galton(' + ev('n') + ')` ?',
    [var('n', '4..8')],
    'La loi binomiale $\\mathcal{B}(' + ev('n') + '\\,;\\,0{,}5)$',
    ['La loi uniforme sur $\\{0\\,;\\,1\\,;\\,\\ldots\\,;\\,' + ev('n') + '\\}$',
     'La loi binomiale $\\mathcal{B}(' + ev('n+1') + '\\,;\\,0{,}5)$',
     'La loi de Bernoulli de paramètre $0{,}5$'],
    ['Chaque tour de boucle est une épreuve de Bernoulli : succès (« à droite ») avec la'
     ' probabilité $0{,}5$.',
     'Les $' + ev('n') + '$ épreuves sont identiques et indépendantes, et `x` compte les succès. Il'
     ' y a $' + ev('n+1') + '$ cases, mais seulement $' + ev('n') + '$ rangées, donc $' + ev('n')
     + '$ épreuves ; et les cases du milieu sont plus probables que celles des bords.',
     '`x` suit donc la loi $' + col('\\mathcal{B}(' + ev('n') + '\\,;\\,0{,}5)') + '$.'])

V513_PROBA = case(
    CONTEXTE_GALTON + ' On simule la chute d\'une bille avec la fonction Python suivante.'
    + python(GALTON.replace('{condition}', CONDITION_GALTON))
    + 'Quelle est la probabilité que `galton(' + ev('n') + ')` renvoie $' + ev('k') + '$ ? On'
    ' donnera la valeur exacte, sous forme de fraction.\n\n$?$',
    [var('n', '4..6'), var('k', '1..{{eval:n-1}}'), var('c', 'eval:binom(n,k)'),
     var('d', 'eval:2^n'), var('r', 'eval:binom(n,k)/2^n')],
    ev('r'),
    ['Le nombre renvoyé suit la loi binomiale $\\mathcal{B}(' + ev('n') + '\\,;\\,0{,}5)$.',
     '$P(X=' + ev('k') + ')=\\dbinom{' + ev('n') + '}{' + ev('k') + '}\\times0{,}5^{' + ev('k')
     + '}\\times0{,}5^{' + ev('n-k') + '}=\\dfrac{' + ev('c') + '}{' + ev('d') + '}$.',
     'La probabilité est donc $' + col(ev('r')) + '$.'])

MODELES.append(modele(
    '02-planche-de-galton', 'Planche de Galton en Python',
    'Planche de Galton simulée en Python : compléter if random() < 0.5:, loi du numéro de case'
    ' (B(n ; 0,5), pièges : uniforme, n + 1 épreuves), probabilité d\'une case (fraction)',
    4, [V513_LIGNE, V513_LOI, V513_PROBA],
    specs_choix(0, CONDITION_GALTON, ['== 0.5', '< 1', '< 1/n'])
    + specs_choix(1, 'B(n ; 0,5)', ['uniforme', 'B(n + 1 ; 0,5)', 'Bernoulli'], {'n': 5})
    + [spec('n = 4, k = 2 : 3/8', 2, '\\frac{3}{8}', 'correct',
            {'n': 4, 'k': 2, 'c': 6, 'd': 16, 'r': '3/8'}),
       spec('Forme : 0,375 au lieu de la fraction', 2, '0.375', 'bad_form',
            {'n': 4, 'k': 2, 'c': 6, 'd': 16, 'r': '3/8'}),
       spec('Erreur : cases équiprobables (1/5)', 2, '\\frac{1}{5}', 'incorrect',
            {'n': 4, 'k': 2, 'c': 6, 'd': 16, 'r': '3/8'}),
       spec('Erreur : coefficient oublié (1/16)', 2, '\\frac{1}{16}', 'incorrect',
            {'n': 4, 'k': 2, 'c': 6, 'd': 16, 'r': '3/8'}),
       spec('n = 5, k = 1 : 5/32', 2, '\\frac{5}{32}', 'correct',
            {'n': 5, 'k': 1, 'c': 5, 'd': 32, 'r': '5/32'}),
       spec('n = 6, k = 3 : 5/16', 2, '\\frac{5}{16}', 'correct',
            {'n': 6, 'k': 3, 'c': 20, 'd': 64, 'r': '5/16'})]))

# --- 3. TSPE-514 : surréservation --------------------------------------------------------------

SURRESERVATION = ('from math import comb\n'
                  '\n'
                  'def F(k):\n'
                  '    s = 0\n'
                  '    for j in range(k + 1):\n'
                  '        s = s + comb(80, j) * 0.9**j * 0.1**(80 - j)\n'
                  '    return s\n'
                  '\n'
                  'def seuil(alpha):\n'
                  '    k = 0\n'
                  '    {condition}\n'
                  '        k = k + 1\n'
                  '    return k')
CONDITION_SURRESERVATION = 'while 1 - F(k) > alpha:'
CONTEXTE_SURRESERVATION = (
    'Une compagnie aérienne vend $80$ billets pour un vol. Chaque passager se présente à'
    ' l\'embarquement avec la probabilité $0{,}9$, indépendamment des autres. On note $X$ le'
    ' nombre de passagers qui se présentent : $X$ suit la loi binomiale $\\mathcal{B}(80\\,;\\,'
    '0{,}9)$, et la fonction `F` ci-dessous renvoie $P(X\\leqslant k)$.')
# P(X ⩽ k) pour X ~ B(80 ; 0,9), arrondies à 10⁻⁴ (calculées le 2026-11-12)
TABLE_SURRESERVATION = (
    '\n\n| $k$ | $72$ | $73$ | $74$ | $75$ | $76$ | $77$ | $78$ | $79$ |\n'
    '|---|---|---|---|---|---|---|---|---|\n'
    '| $P(X\\leqslant k)$ | $0{,}5544$ | $0{,}6995$ | $0{,}8231$ | $0{,}9120$ | $0{,}9647$ |'
    ' $0{,}9893$ | $0{,}9978$ | $0{,}9998$ |\n\n')
# j → (α en Python, α en LaTeX, k renvoyé, P(X ⩽ k − 1), P(X ⩽ k))
ALPHA_PY = '{{if:j==1|0.2|{{if:j==2|0.1|{{if:j==3|0.05|0.01}}}}}}'
ALPHA_TEX = '{{if:j==1|0{,}2|{{if:j==2|0{,}1|{{if:j==3|0{,}05|0{,}01}}}}}}'

V514_TOURNER = case(
    CONTEXTE_SURRESERVATION
    + python(SURRESERVATION.replace('{condition}', CONDITION_SURRESERVATION))
    + 'On donne quelques valeurs de $P(X\\leqslant k)$, arrondies à $10^{-4}$.'
    + TABLE_SURRESERVATION
    + 'Que renvoie `seuil(' + ALPHA_PY + ')` ?\n\n$?$',
    [var('j', '1..4'), var('r', '{{if:j==1|74|{{if:j==2|75|{{if:j==3|76|78}}}}}}'),
     var('fq', '{{if:j==1|0{,}6995|{{if:j==2|0{,}8231|{{if:j==3|0{,}9120|0{,}9893}}}}}}'),
     var('fr', '{{if:j==1|0{,}8231|{{if:j==2|0{,}9120|{{if:j==3|0{,}9647|0{,}9978}}}}}}')],
    '{{r}}',
    ['La boucle augmente `k` tant que $P(X>k)=1-P(X\\leqslant k)$ est strictement supérieure à $'
     + ALPHA_TEX + '$ : elle renvoie le plus petit $k$ tel que $P(X\\leqslant k)\\geqslant1-'
     + ALPHA_TEX + '$.',
     '$P(X\\leqslant ' + ev('r-1') + ')\\approx{{fq}}$, donc $P(X>' + ev('r-1') + ')$ est'
     ' supérieure à $' + ALPHA_TEX + '$ ; $P(X\\leqslant {{r}})\\approx{{fr}}$, donc $P(X>{{r}})'
     '\\leqslant' + ALPHA_TEX + '$.',
     'La fonction renvoie $' + col('{{r}}') + '$.'])

V514_LIGNE = ligne(
    CONTEXTE_SURRESERVATION + ' La fonction `seuil` doit renvoyer le plus petit entier $k$ tel'
    ' que $P(X>k)\\leqslant\\alpha$.'
    + python(SURRESERVATION.replace('{condition}', '...'))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`' + CONDITION_SURRESERVATION + '`',
    ['`while F(k) > alpha:`', '`while 1 - F(k) <= alpha:`', '`while F(k) < alpha:`'],
    ['$P(X>k)=1-P(X\\leqslant k)=1-F(k)$.',
     'On augmente $k$ **tant que** la condition voulue n\'est pas atteinte, c\'est-à-dire tant que'
     ' $1-F(k)>\\alpha$ ; avec `<=`, la boucle s\'arrêterait tout de suite, et `F(k)` seul porte'
     ' sur $P(X\\leqslant k)$, pas sur $P(X>k)$.',
     'La ligne est donc `' + CONDITION_SURRESERVATION + '`.'])

V514_INTERPRETER = ligne(
    CONTEXTE_SURRESERVATION
    + python(SURRESERVATION.replace('{condition}', CONDITION_SURRESERVATION))
    + '`seuil(0.05)` renvoie $76$. Que signifie ce résultat ?',
    [], 'Si l\'avion a $76$ places, la probabilité que des passagers présents restent sans place'
    ' est au plus $5\\,\\%$.',
    ['La probabilité qu\'exactement $76$ passagers se présentent est au plus $5\\,\\%$.',
     'Si l\'avion a $76$ places, au moins $5\\,\\%$ des passagers présents restent sans place.',
     'Dans $95\\,\\%$ des cas, exactement $76$ passagers se présentent.'],
    ['`seuil(0.05)` est le plus petit $k$ tel que $P(X>k)\\leqslant0{,}05$ : ici'
     ' $P(X>76)\\leqslant0{,}05$ et $P(X>75)>0{,}05$.',
     '$X>76$ signifie que plus de $76$ passagers se présentent : avec $76$ places, certains'
     ' restent au sol. L\'événement porte sur « plus de $76$ », pas sur « exactement $76$ ».',
     'Avec $' + col('76') + '$ places, le risque de laisser des passagers au sol est au plus'
     ' $5\\,\\%$ ; avec $75$, il dépasserait $5\\,\\%$.'])

MODELES.append(modele(
    '03-probleme-de-la-surreservation', 'Problème de la surréservation en Python',
    'Surréservation, X ~ B(80 ; 0,9) : plus petit k tel que P(X > k) ⩽ α avec la table des'
    ' P(X ⩽ k) donnée (α = 0,2 ; 0,1 ; 0,05 ; 0,01), compléter while 1 - F(k) > alpha:, sens du k'
    ' renvoyé',
    3, [V514_TOURNER, V514_LIGNE, V514_INTERPRETER],
    [spec('α = 0,2 : 74', 0, '74', 'correct', {'j': 1, 'r': 74}),
     spec('α = 0,1 : 75', 0, '75', 'correct', {'j': 2, 'r': 75}),
     spec('α = 0,05 : 76', 0, '76', 'correct', {'j': 3, 'r': 76}),
     spec('α = 0,01 : 78', 0, '78', 'correct', {'j': 4, 'r': 78}),
     spec('Erreur : dernier k qui ne convient pas (α = 0,05)', 0, '75', 'incorrect',
          {'j': 3, 'r': 76}),
     spec('Erreur : un cran trop loin (α = 0,01)', 0, '79', 'incorrect', {'j': 4, 'r': 78})]
    + specs_choix(1, CONDITION_SURRESERVATION, ['F(k) > alpha', '<=', 'F(k) < alpha'])
    + specs_choix(2, 'au plus 5 % de risque, 76 places', ['exactement 76', 'au moins 5 %',
                                                           '95 % exactement 76'])))

# --- 4. TSPE-515 : simuler un échantillon ------------------------------------------------------

LOI_X = ('from random import random\n'
         '\n'
         'def X():\n'
         '    {condition}\n'
         '        return {a}\n'
         '    return -1')
CONDITION_X = 'if random() < 0.3:'
MOYENNE = ('\n'
           '\n'
           'def moyenne(n):\n'
           '    S = 0\n'
           '    for k in range(n):\n'
           '        {ligne}\n'
           '    return S / n')
LIGNE_MOYENNE = 'S = S + X()'
CONTEXTE_X = ('Une variable aléatoire $X$ prend la valeur ${a}$ avec la probabilité $0{,}3$, et la'
              ' valeur $-1$ sinon. ')


def programme_x(a, condition, ligne_moyenne):
    return (LOI_X.replace('{condition}', condition).replace('{a}', a)
            + MOYENNE.replace('{ligne}', ligne_moyenne))


V515_LOI = ligne(
    CONTEXTE_X.replace('{a}', '2') + 'La fonction `X` ci-dessous doit simuler $X$, et `moyenne(n)`'
    ' renvoyer la moyenne d\'un échantillon de taille $n$ de $X$ ; `random()` renvoie un nombre au'
    ' hasard dans $[0\\,;\\,1[$.'
    + python(programme_x('2', '...', LIGNE_MOYENNE))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`' + CONDITION_X + '`',
    ['`if random() > 0.3:`', '`if random() < 0.7:`', '`if random() == 0.3:`'],
    ['`random()` tombe dans $[0\\,;\\,0{,}3[$ avec la probabilité $0{,}3$ : c\'est dans ce cas que'
     ' `X` doit renvoyer $2$.',
     '`random() > 0.3` et `random() < 0.7` sont vrais avec la probabilité $0{,}7$ : $X$ vaudrait'
     ' $2$ trop souvent. `random() == 0.3` n\'est presque jamais vrai.',
     'La ligne est donc `' + CONDITION_X + '`.'])

V515_SOMME = ligne(
    CONTEXTE_X.replace('{a}', '2') + 'La fonction `X` ci-dessous simule $X$, et `moyenne(n)` doit'
    ' renvoyer la moyenne d\'un échantillon de taille $n$ de $X$ : $n$ valeurs de $X$, tirées'
    ' indépendamment.'
    + python(programme_x('2', CONDITION_X, '...'))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`' + LIGNE_MOYENNE + '`',
    ['`S = X()`', '`S = S + k`', '`S = S * X()`'],
    ['`S` doit être la somme $S_n=X_1+X_2+\\cdots+X_n$ des $n$ valeurs tirées : à chaque tour, on'
     ' tire une nouvelle valeur `X()` et on l\'ajoute à `S`.',
     'Avec `S = X()`, `S` ne garderait que le dernier tirage ; `S = S + k` additionne les numéros'
     ' des tours, et `S = S * X()` reste égal à $0$.',
     'La ligne est donc `' + LIGNE_MOYENNE + '`, et la fonction renvoie $M_n=\\dfrac{S_n}{n}$.'])

V515_INTERPRETER = ligne(
    CONTEXTE_X.replace('{a}', ev('a')) + 'On considère le programme Python suivant.'
    + python(programme_x(ev('a'), CONDITION_X, LIGNE_MOYENNE) + '\n\nprint(moyenne(100000))')
    + 'De quel nombre la valeur affichée est-elle, en général, proche ?',
    [var('a', '2..4')],
    '$' + evd('3*a/10-7/10') + '$',
    ['$0{,}3$', '$' + evd('(a-1)/2') + '$', '$' + evd('3*a^2/10+7/10-(3*a/10-7/10)^2') + '$'],
    ['`moyenne(100000)` est la moyenne $M_n$ d\'un échantillon de taille $n=100\\,000$ de $X$.',
     'D\'après la loi des grands nombres, $M_n$ se concentre autour de $E(X)$ quand $n$ est grand'
     ' (sa variance $\\dfrac{V(X)}{n}$ tend vers $0$).',
     '$E(X)=' + ev('a') + '\\times0{,}3+(-1)\\times0{,}7=' + col(evd('3*a/10-7/10')) + '$. La'
     ' moyenne des deux valeurs, $' + evd('(a-1)/2') + '$, ne tient pas compte de leurs'
     ' probabilités.'])

MODELES.append(modele(
    '04-simuler-un-echantillon', 'Simuler un échantillon en Python',
    'Échantillon de X (a avec la probabilité 0,3, −1 sinon) : compléter if random() < 0.3: dans la'
    ' simulation de X, compléter S = S + X() dans la moyenne, valeur proche de la moyenne d\'un'
    ' grand échantillon (E(X))',
    4, [V515_LOI, V515_SOMME, V515_INTERPRETER],
    specs_choix(0, CONDITION_X, ['> 0.3', '< 0.7', '== 0.3'])
    + specs_choix(1, LIGNE_MOYENNE, ['dernier tirage', 'numéros des tours', 'produit'])
    + specs_choix(2, 'E(X)', ['p', 'moyenne des valeurs', 'V(X)'], {'a': 2})))

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
