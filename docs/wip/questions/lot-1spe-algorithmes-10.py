"""Écrit les 3 modèles du lot 10 « algorithmes : suites et dénombrement » de la 1re spé
dans scripts/questions/1spe-algorithmes-10/.

Phase 0 validée par David le 2026-11-06 (D9 du journal
« docs/wip/questions-1spe-demonstrations-progress.md », § 15) ; contenu et rangement validés le
2026-11-06 (D10, « je te suis »), un point par modèle, chacun sur une sous-notion existante :

| # | Point    | Titre                                           | Niv. | Nœud du modèle                                       |
| 1 | 1SPE-238 | Calculer une factorielle avec Python            | 1    | Arrangements et permutations › factorielle           |
| 2 | 1SPE-239 | Suite de Syracuse, suite de Fibonacci en Python | 4    | Généralités sur les suites › explicite ou par récurrence |
| 3 | 1SPE-380 | Calculer une somme de termes avec Python        | 3    | Généralités sur les suites › sommes de termes        |

Forme (D9, Q2) : Python seulement ; (a) faire tourner un programme (case), (b) compléter une ligne
(case choix à 4 propositions, la première est la bonne, ordre mélangé à l'affichage), (c)
interpréter (quelle somme le programme calcule). Valeurs calculables à la main.

Variables : jamais `e` ni `E` (constante d'Euler), ni `i`.

    python3 docs/wip/questions/lot-1spe-algorithmes-10.py scripts/questions/1spe-algorithmes-10
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

# --- 1. 1SPE-238 : calcul de factorielle --------------------------------------------------------

FACT = ('def fact(n):\n'
        '    p = {init}\n'
        '    for k in range(1, n + 1):\n'
        '        p = {boucle}\n'
        '    return p')
FACT_VALEURS = ('$1$, $2$, $6$, $24${{if:n>=5|, $120$|}}{{if:n>=6|, $720$|}}{{if:n>=7|, $5040$|}}')

V238_TOURNER = case(
    'On considère la fonction Python suivante.' + python(FACT.format(init='1', boucle='p * k'))
    + 'Que renvoie `fact(' + ev('n') + ')` ?\n\n$?$',
    [var('n', '4..7'), var('f', 'eval:n!')], ev('f'),
    ['`k` prend les valeurs $1$, $2$, …, $' + ev('n') + '$ : `range(1, n + 1)` s\'arrête juste'
     ' avant `n + 1`. À chaque tour, `p` est multiplié par `k`.',
     'Valeurs successives de `p` après chaque tour : ' + FACT_VALEURS + '.',
     '`fact(' + ev('n') + ')` renvoie $1\\times2\\times\\cdots\\times' + ev('n') + '='
     + ev('n') + '!=' + col(ev('f')) + '$.'])

V238_BOUCLE = ligne(
    'La fonction Python ci-dessous doit renvoyer $n!=1\\times2\\times\\cdots\\times n$.'
    + python(FACT.format(init='1', boucle='...'))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`p * k`', ['`p + k`', '`p * n`', '`k`'],
    ['À chaque tour, on multiplie le produit déjà calculé par le nouvel entier `k`.',
     'Avec `p + k`, on calculerait la somme $1+1+2+\\cdots+n$ ; avec `p * n`, on multiplierait'
     ' toujours par $n$ ; avec `k`, `p` ne garderait que le dernier entier.',
     'La ligne est donc `p = p * k`.'])

V238_INIT = ligne(
    'La fonction Python ci-dessous doit renvoyer $n!=1\\times2\\times\\cdots\\times n$.'
    + python(FACT.format(init='...', boucle='p * k'))
    + 'Quelle valeur faut-il donner à `p` au départ ?',
    [], '`1`', ['`0`', '`n`', '`k`'],
    ['On multiplie `p` par $1$, $2$, …, $n$ : il faut partir d\'une valeur qui ne change pas'
     ' le produit, c\'est-à-dire $1$.',
     'En partant de $0$, le produit resterait égal à $0$ ; en partant de $n$, on obtiendrait'
     ' $n\\times n!$ ; `k` n\'existe pas encore avant la boucle.',
     'On écrit donc `p = 1`.'])

MODELES.append(modele(
    '01-factorielle', 'Calculer une factorielle avec Python',
    'Fonction fact(n) par une boucle for : faire tourner (n de 4 à 7), compléter la ligne de la'
    ' boucle, choisir la valeur initiale du produit',
    1, [V238_TOURNER, V238_BOUCLE, V238_INIT],
    [spec('fact(5) = 120', 0, '120', 'correct', {'n': 5, 'f': 120}),
     spec('Erreur : 4! (un tour de moins)', 0, '24', 'incorrect', {'n': 5, 'f': 120}),
     spec('fact(7) = 5040', 0, '5040', 'correct', {'n': 7, 'f': 5040})]
    + specs_choix(1, 'p * k', ['p + k', 'p * n', 'k'])
    + specs_choix(2, 'p = 1', ['p = 0', 'p = n', 'p = k'])))

# --- 2. 1SPE-239 : suites de Syracuse et de Fibonacci -------------------------------------------


def syr(x):
    """Terme suivant de Syracuse, en expression : u/2 si u pair, 3u + 1 sinon."""
    return f'(1-mod({x},2))*({x})/2+mod({x},2)*(3*({x})+1)'


def parite(w):
    return ('{{if:mod(' + w + ',2)==0|$' + ev(w) + '$ est pair|$' + ev(w) + '$ est impair}}')


V239_SYRACUSE = case(
    'On considère le programme Python suivant.'
    + python('u = ' + ev('a') + '\n'
             'for j in range(' + ev('t') + '):\n'
             '    if u % 2 == 0:\n'
             '        u = u // 2\n'
             '    else:\n'
             '        u = 3 * u + 1\n'
             'print(u)')
    + 'Quelle valeur est affichée ?\n\n$?$',
    [var('a', '5..30'), var('t', '3|4'),
     var('w1', 'eval:' + syr('a')), var('w2', 'eval:' + syr('w1')),
     var('w3', 'eval:' + syr('w2')), var('w4', 'eval:' + syr('w3')),
     var('r', 'eval:(4-t)*w3+(t-3)*w4')],
    ev('r'),
    ['La boucle est parcourue $' + ev('t') + '$ fois. `u % 2 == 0` teste si `u` est pair ;'
     ' `u // 2` est le quotient entier de `u` par $2$.',
     parite('a') + ' : `u` devient $' + ev('w1') + '$. ' + parite('w1') + ' : `u` devient $'
     + ev('w2') + '$. ' + parite('w2') + ' : `u` devient $' + ev('w3') + '$.'
     '{{if:t==4| ' + parite('w3') + ' : `u` devient $' + ev('w4') + '$.|}}',
     'Le programme affiche $' + col(ev('r')) + '$.'])

V239_IMPAIR = ligne(
    'Dans la suite de Syracuse, un terme pair est divisé par $2$, et un terme impair est'
    ' multiplié par $3$, puis augmenté de $1$. Le programme Python ci-dessous affiche les termes'
    ' de la suite de premier terme $' + ev('a') + '$ jusqu\'à obtenir $1$.'
    + python('u = ' + ev('a') + '\n'
             'while u != 1:\n'
             '    if u % 2 == 0:\n'
             '        u = u // 2\n'
             '    else:\n'
             '        u = ...\n'
             '    print(u)')
    + 'Que faut-il écrire à la place des points de suspension ?',
    [var('a', '5..30')], '`3 * u + 1`', ['`u // 2`', '`3 * (u + 1)`', '`u + 1`'],
    ['Le `else` traite le cas où `u` est impair.',
     'Il faut multiplier par $3$ puis ajouter $1$ : `3 * u + 1`. Avec `3 * (u + 1)`, on'
     ' ajouterait $1$ avant de multiplier.',
     'La ligne est donc `u = 3 * u + 1`.'])

V239_FIBONACCI = ligne(
    'La suite de Fibonacci commence par $1$, $1$, et chaque terme est la somme des deux'
    ' précédents. Le programme Python ci-dessous doit construire la liste `L` de ses $'
    + ev('n') + '$ premiers termes.'
    + python('L = [1, 1]\n'
             'for k in range(2, ' + ev('n') + '):\n'
             '    L.append(...)')
    + 'Que faut-il écrire à la place des points de suspension ?',
    [var('n', '8..12')], '`L[k - 1] + L[k - 2]`',
    ['`L[k] + L[k - 1]`', '`L[k - 1] * L[k - 2]`', '`L[k - 1] + 1`'],
    ['Au tour `k`, la liste contient déjà `L[0]`, …, `L[k - 1]` : `append` ajoute l\'élément'
     ' d\'indice `k`. `L[k]` n\'existe pas encore.',
     'Le nouvel élément est la somme des deux derniers, `L[k - 1]` et `L[k - 2]`.',
     'On écrit donc `L.append(L[k - 1] + L[k - 2])`. La liste commence par'
     ' $[1, 1, 2, 3, 5, 8, 13, 21, …]$.'])

VARS_SYR = {'a': 7, 't': 3, 'w1': 22, 'w2': 11, 'w3': 34, 'w4': 17, 'r': 34}
MODELES.append(modele(
    '02-syracuse-fibonacci', 'Suite de Syracuse, suite de Fibonacci en Python',
    'Syracuse : faire tourner 3 ou 4 tours depuis un entier tiré, compléter le cas impair ;'
    ' Fibonacci en liste : compléter l\'élément ajouté par append',
    4, [V239_SYRACUSE, V239_IMPAIR, V239_FIBONACCI],
    [spec('7 → 22 → 11 → 34', 0, '34', 'correct', VARS_SYR),
     spec('Erreur : deux tours', 0, '11', 'incorrect', VARS_SYR),
     spec('27, 4 tours → 82, 41, 124, 62', 0, '62', 'correct',
          {'a': 27, 't': 4, 'w1': 82, 'w2': 41, 'w3': 124, 'w4': 62, 'r': 62})]
    + specs_choix(1, '3 * u + 1', ['u // 2', '3 * (u + 1)', 'u + 1'], {'a': 7})
    + specs_choix(2, 'L[k - 1] + L[k - 2]',
                  ['L[k] + L[k - 1]', 'L[k - 1] * L[k - 2]', 'L[k - 1] + 1'], {'n': 10})))

# --- 3. 1SPE-380 : calcul de sommes de termes ---------------------------------------------------


def terme(k):
    return ev('a*' + str(k) + '+b')


V380_TOURNER = case(
    'On considère la fonction Python suivante.'
    + python('def somme(n):\n'
             '    s = 0\n'
             '    for k in range(n + 1):\n'
             '        s = s + ' + ev('a') + ' * k + ' + ev('b') + '\n'
             '    return s')
    + 'Que renvoie `somme(' + ev('n') + ')` ?\n\n$?$',
    [var('a', '2..5'), var('b', '1..9'), var('n', '3..5'),
     var('s', 'eval:a*n*(n+1)/2+b*(n+1)')],
    ev('s'),
    ['`k` prend les valeurs $0$, $1$, …, $' + ev('n') + '$ : `range(n + 1)` commence à $0$ et'
     ' s\'arrête juste avant $' + ev('n+1') + '$.',
     'On ajoute les termes $' + ev('a') + 'k+' + ev('b') + '$ : $' + terme(0) + '+' + terme(1)
     + '+' + terme(2) + '+' + terme(3) + '{{if:n>=4|+' + terme(4) + '|}}{{if:n>=5|+' + terme(5)
     + '|}}$.',
     '`somme(' + ev('n') + ')` renvoie $' + col(ev('s')) + '$.'])

V380_ACCUMULER = ligne(
    'Le programme Python ci-dessous doit afficher la somme $u_0+u_1+\\cdots+u_{' + ev('n-1')
    + '}$ des termes de la suite géométrique de premier terme $u_0=' + ev('u') + '$ et de raison $'
    + ev('q') + '$.'
    + python('u = ' + ev('u') + '\n'
             's = 0\n'
             'for k in range(' + ev('n') + '):\n'
             '    ...\n'
             '    u = ' + ev('q') + ' * u\n'
             'print(s)')
    + 'Que faut-il écrire à la place des points de suspension ?',
    [var('u', '1..5'), var('q', '2|3'), var('n', '5..8')],
    '`s = s + u`', ['`s = u`', '`s = s * u`', '`u = s + u`'],
    ['`s` sert d\'accumulateur : il part de $0$ et, à chaque tour, on lui ajoute le terme'
     ' courant `u`, avant que `u` ne passe au terme suivant.',
     'Avec `s = u`, `s` ne garderait que le dernier terme ; avec `s = s * u`, il resterait égal'
     ' à $0$ ; `u = s + u` modifierait le terme au lieu de la somme.',
     'La ligne est donc `s = s + u`.'])


V380_INTERPRETER = ligne(
    'On considère une suite $(u_n)$ et le programme Python suivant, où `u(k)` renvoie $u_k$.'
    + python('s = 0\n'
             'for k in range(' + ev('p') + ', ' + ev('m') + '):\n'
             '    s = s + u(k)')
    + 'Quelle somme la variable `s` contient-elle à la fin du programme ?',
    [var('p', '1..3'), var('m', '8..12')],
    '$u_{' + ev('p') + '}+u_{' + ev('p+1') + '}+\\cdots+u_{' + ev('m-1') + '}$',
    ['$u_{' + ev('p') + '}+u_{' + ev('p+1') + '}+\\cdots+u_{' + ev('m') + '}$',
     '$u_{' + ev('p+1') + '}+u_{' + ev('p+2') + '}+\\cdots+u_{' + ev('m') + '}$',
     '$u_{0}+u_{1}+\\cdots+u_{' + ev('m-1') + '}$'],
    ['`range(' + ev('p') + ', ' + ev('m') + ')` donne les entiers de $' + ev('p') + '$ à $'
     + ev('m-1') + '$ : il commence à $' + ev('p') + '$ et s\'arrête juste avant $' + ev('m')
     + '$.',
     'À chaque tour, on ajoute $u_k$ à `s`.',
     '`s` contient donc $' + col('u_{' + ev('p') + '}+\\cdots+u_{' + ev('m-1') + '}') + '$.'])

VARS_SOMME = {'a': 3, 'b': 2, 'n': 4, 's': 40}
MODELES.append(modele(
    '03-somme-de-termes', 'Calculer une somme de termes avec Python',
    'Accumulateur s : faire tourner somme(n) pour des termes ak + b, compléter la ligne'
    ' d\'accumulation (suite géométrique), dire quelle somme calcule une boucle range(p, m)',
    3, [V380_TOURNER, V380_ACCUMULER, V380_INTERPRETER],
    [spec('3k + 2, n = 4 : 2 + 5 + 8 + 11 + 14', 0, '40', 'correct', VARS_SOMME),
     spec('Erreur : terme k = 0 oublié', 0, '38', 'incorrect', VARS_SOMME),
     spec('2k + 1, n = 3 : 16', 0, '16', 'correct', {'a': 2, 'b': 1, 'n': 3, 's': 16})]
    + specs_choix(1, 's = s + u', ['s = u', 's = s * u', 'u = s + u'], {'u': 2, 'q': 3, 'n': 5})
    + specs_choix(2, 'de p à m − 1', ['de p à m', 'de p + 1 à m', 'de 0 à m − 1'],
                  {'p': 2, 'm': 10})))

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
