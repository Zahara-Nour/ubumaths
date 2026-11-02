"""Écrit les 4 modèles du lot 5b « sommes de variables aléatoires, loi des grands nombres » de la
terminale spécialité dans scripts/questions/tspe-5b-sommes/.

Phase 0 validée par David le 2026-11-02 (« tes recos ? » puis « je valide », journal
« docs/wip/questions-tspe-proba-progress.md » § Lot 5b), un point par modèle :

| # | Point    | Titre                                 | Catégorie, niveau                                                 |
| 1 | TSPE-518 | Loi de la somme de deux variables     | Sommes de variables aléatoires › Loi d'une somme, 1               |
| 2 | TSPE-521 | Variance de aX + b : V(aX) = a²V(X)   | Sommes de variables aléatoires › Espérance et variance, 1         |
| 3 | TSPE-525 | Écrire une variable comme somme       | Sommes de variables aléatoires › Décomposer en somme, 1           |
| 4 | TSPE-532 | Loi des grands nombres : interpréter  | Concentration et loi des grands nombres › Loi des grands nombres, 1 |

Ne pas répéter : 71cb8ab7 (V(aX + bY), X et Y indépendantes), 7974722d (E(aX + bY)), aced2e6c et
de8fa591 (échantillons, μ et V donnés), 0943e867, 91db0034, 95f73515 (inégalités).

Pièges : case choix → le PREMIER item est la bonne réponse (index 0) ; jamais de variable `e` ni
`i` (constantes) ; décimaux de plus de 4 chiffres attendus groupés.

    python3 docs/wip/questions/lot-tspe-5b-sommes.py scripts/questions/tspe-5b-sommes
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]
CONSIGNE = 'Réponds par une fraction irréductible ou par un nombre décimal exact.'
SOMMES = 'Sommes de variables aléatoires'
LGN = 'Concentration et loi des grands nombres'
MODELES = []


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(nom, title, description, domain, subdomain, level, variations, specs, delay=90):
    return nom, {'title': title, 'description': description, 'grades': ['T_SPE'],
                 'theme': 'Probabilités', 'domain': domain, 'subdomain': subdomain,
                 'level': level, 'delay': delay, 'status': 'draft',
                 'shared': {'cleanCoefficients': True, 'blankDefaults': {'acceptDecimal': True}},
                 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None):
    v = {'statement': statement, 'variables': variables,
         'blanks': [{'expectedAnswer': a} for a in answers],
         'correction': {'steps': steps}}
    if conditions:
        v['conditions'] = conditions
    return v


def col(x):
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


def ev(x):
    return '{{eval:' + x + '}}'


def evd(x):
    return '{{eval:' + x + ';d}}'


def par_k(valeurs, nom='k'):
    """Une valeur par cas de la variable (ifs à plat, jamais imbriqués)."""
    return ''.join('{{if:' + nom + '==' + str(i) + '|' + v + '}}' for i, v in enumerate(valeurs))


def choix(*items):
    return '\n\n```choix\n' + '\n'.join('- ' + i for i in items) + '\n```'


def ens(*valeurs):
    return '$\\{' + '\\,;'.join(valeurs) + '\\}$'


# --- 1. TSPE-518 : loi de la somme de deux variables ---------------------------------------------

X0, X1, X2 = evd('a/10'), evd('b/10'), evd('(10-a-b)/10')
Y0, Y1, Y2 = evd('c/10'), evd('g/10'), evd('(10-c-g)/10')
TABLES = ('\n\n| $x$ | $0$ | $1$ | $2$ |\n|---|---|---|---|\n| $P(X=x)$ | $' + X0 + '$ | $' + X1
          + '$ | $' + X2 + '$ |\n\n| $y$ | $0$ | $1$ | $2$ |\n|---|---|---|---|\n| $P(Y=y)$ | $' + Y0
          + '$ | $' + Y1 + '$ | $' + Y2 + '$ |')
V518_LOIS = variation(
    'Deux variables aléatoires **indépendantes** $X$ et $Y$ ont les lois données ci-dessous.'
    + TABLES + '\n\n' + CONSIGNE + '\n\n$P(X+Y=' + ev('2+k') + ')=?$',
    [var('k', '0..1'), var('a', '1..8'), var('b', '1..8'), var('c', '1..8'), var('g', '1..8')],
    [ev('((1-k)*(a*(10-c-g)+b*g+(10-a-b)*c)+k*(b*(10-c-g)+(10-a-b)*g))/100')],
    ['L\'événement $\\{X+Y=' + ev('2+k') + '\\}$ est la réunion des événements incompatibles '
     + par_k(['$\\{X=0\\}\\cap\\{Y=2\\}$, $\\{X=1\\}\\cap\\{Y=1\\}$ et $\\{X=2\\}\\cap\\{Y=0\\}$',
              '$\\{X=1\\}\\cap\\{Y=2\\}$ et $\\{X=2\\}\\cap\\{Y=1\\}$']) + ' : on liste les couples'
     ' de valeurs dont la somme vaut $' + ev('2+k') + '$.',
     '$X$ et $Y$ sont indépendantes : la probabilité de chaque intersection est un produit. '
     + par_k(['$' + X0 + '\\times' + Y2 + '+' + X1 + '\\times' + Y1 + '+' + X2 + '\\times' + Y0 + '$',
              '$' + X1 + '\\times' + Y2 + '+' + X2 + '\\times' + Y1 + '$']) + '.',
     '$P(X+Y=' + ev('2+k') + ')='
     + col(evd('((1-k)*(a*(10-c-g)+b*g+(10-a-b)*c)+k*(b*(10-c-g)+(10-a-b)*g))/100')) + '$.'],
    ['a+b <= 9', 'c+g <= 9'])

V518_DES = variation(
    'On lance un dé équilibré à quatre faces numérotées de $1$ à $4$ et un dé équilibré à six faces'
    ' numérotées de $1$ à $6$, indépendamment. On note $X$ le résultat du premier dé, $Y$ celui du'
    ' second et $S=X+Y$.\n\n' + CONSIGNE + '\n\n$P(S=' + ev('s') + ')=?$',
    [var('s', '2..10'), var('cnt', '{{eval:min(min(s-1,4),11-s)}}')],
    [ev('cnt/24')],
    ['Les dés sont indépendants : chaque couple $(x\\,;y)$ a pour probabilité $\\dfrac{1}{4}\\times'
     '\\dfrac{1}{6}=\\dfrac{1}{24}$.',
     '$S=' + ev('s') + '$ pour les couples $(x\\,;' + ev('s') + '-x)$ avec $x$ de $' + ev('max(1,s-6)')
     + '$ à $' + ev('min(4,s-1)') + '$ : il y en a $' + ev('cnt') + '$.',
     '$P(S=' + ev('s') + ')=' + ev('cnt') + '\\times\\dfrac{1}{24}=' + col(ev('cnt/24')) + '$.'],
    ['s > 2', 's < 10'])

V518_VALEURS = variation(
    'Une variable aléatoire $X$ prend les valeurs $0$ et $' + ev('a') + '$ ; une variable aléatoire'
    ' $Y$, indépendante de $X$, prend les valeurs $1$ et $' + ev('b') + '$, chacune avec une'
    ' probabilité non nulle.\n\nQuelles valeurs prend la variable $X+Y$ ?'
    + choix(ens('1', ev('a+1'), ev('b'), ev('a+b')), ens('0', '1', ev('a'), ev('b')),
            ens('1', ev('a+b')), ens('1', ev('a+1'), ev('a+b'))),
    [var('a', '2..4'), var('b', '6..9')], ['0'],
    ['$X+Y$ prend toutes les sommes $x+y$, avec $x$ une valeur de $X$ et $y$ une valeur de $Y$ :'
     ' un couple de valeurs donne une somme.',
     'Les quatre couples donnent $0+1=1$, $' + ev('a') + '+1=' + ev('a+1') + '$, $0+' + ev('b') + '='
     + ev('b') + '$ et $' + ev('a') + '+' + ev('b') + '=' + ev('a+b') + '$ ; par indépendance, chacun a'
     ' une probabilité non nulle.',
     'Valeurs de $X+Y$ : $' + col('\\{1\\,;' + ev('a+1') + '\\,;' + ev('b') + '\\,;' + ev('a+b')
                                   + '\\}') + '$.'])

MODELES.append(modele(
    '01-loi-de-la-somme-de-deux-variables', 'Loi de la somme de deux variables',
    'X et Y indépendantes : P(X + Y = s) par les couples de valeurs (lois en tableaux ; un dé à 4'
    ' faces et un dé à 6 faces) ; valeurs prises par X + Y',
    SOMMES, 'Loi d\'une somme', 1,
    [V518_LOIS, V518_DES, V518_VALEURS],
    [spec('s = 2 : 0,06 + 0,09 + 0,2', 0, {'k': 0, 'a': 2, 'b': 3, 'c': 4, 'g': 3}, '0{,}35',
          'correct'),
     spec('En fraction', 0, {'k': 0, 'a': 2, 'b': 3, 'c': 4, 'g': 3}, '\\frac{7}{20}', 'correct'),
     spec('Erreur : un seul couple', 0, {'k': 0, 'a': 2, 'b': 3, 'c': 4, 'g': 3}, '0{,}2',
          'incorrect'),
     spec('Erreur : somme sans produits', 0, {'k': 0, 'a': 2, 'b': 3, 'c': 4, 'g': 3}, '1{,}4',
          'incorrect'),
     spec('s = 3 : 0,09 + 0,15', 0, {'k': 1, 'a': 2, 'b': 3, 'c': 4, 'g': 3}, '0{,}24', 'correct'),
     spec('Erreur : (1 ; 2) oublié', 0, {'k': 1, 'a': 2, 'b': 3, 'c': 4, 'g': 3}, '0{,}15',
          'incorrect'),
     spec('S = 7 : 4/24', 1, {'s': 7, 'cnt': 4}, '\\frac{1}{6}', 'correct'),
     spec('S = 3 : 2/24', 1, {'s': 3, 'cnt': 2}, '\\frac{1}{12}', 'correct'),
     spec('Erreur : sur 36', 1, {'s': 3, 'cnt': 2}, '\\frac{1}{18}', 'incorrect'),
     spec('Erreur : un couple', 1, {'s': 3, 'cnt': 2}, '\\frac{1}{24}', 'incorrect'),
     spec('Les quatre sommes', 2, {'a': 3, 'b': 7}, '0', 'correct'),
     spec('Erreur : réunion des valeurs', 2, {'a': 3, 'b': 7}, '1', 'incorrect'),
     spec('Erreur : extrêmes', 2, {'a': 3, 'b': 7}, '2', 'incorrect')]))

# --- 2. TSPE-521 : V(aX) = a²V(X) ----------------------------------------------------------------

# a entre parenthèses seulement s'il est négatif : (−3)², mais 2²
PA = '{{if:a<0|(}}' + ev('a') + '{{if:a<0|)}}'

V521_AX = variation(
    'Une variable aléatoire $X$ a pour variance $V(X)=' + ev('v') + '$.\n\n$V(' + ev('a')
    + 'X)=?$',
    [var('a', '-6..6'), var('v', '2..9')], [ev('a^2*v')],
    ['Multiplier une variable par $a$ multiplie ses écarts à l\'espérance par $a$, donc les carrés'
     ' de ces écarts par $a^2$ : $V(aX)=a^2V(X)$.',
     '$V(' + ev('a') + 'X)=' + PA + '^2\\times' + ev('v') + '=' + ev('a^2') + '\\times' + ev('v')
     + '=' + col(ev('a^2*v')) + '$.'],
    ['a^2 > 1'])

V521_AXB = variation(
    'Une variable aléatoire $X$ a pour variance $V(X)=' + evd('v/10') + '$. On pose $Y=' + ev('a')
    + 'X+' + ev('b') + '$.\n\n' + CONSIGNE + '\n\n$V(Y)=?$',
    [var('a', '-5..5'), var('b', '1..9'), var('v', '2..30')], [ev('a^2*v/10')],
    ['Ajouter la constante $' + ev('b') + '$ décale toutes les valeurs et l\'espérance de la même'
     ' quantité : les écarts à l\'espérance ne changent pas, $V(aX+b)=V(aX)$.',
     '$V(aX)=a^2V(X)$ : $V(Y)=' + PA + '^2\\times' + evd('v/10') + '=' + col(evd('a^2*v/10'))
     + '$.'],
    ['a^2 > 1'])

V521_SIGMA = variation(
    'Une variable aléatoire $X$ a pour écart type $\\sigma\\left(X\\right)=' + ev('s') + '$. On pose $Y=' + ev('a')
    + 'X+' + ev('b') + '$.\n\n$\\sigma\\left(Y\\right)=?$',
    [var('a', '-6..-2'), var('b', '1..9'), var('s', '2..9')], [ev('-a*s')],
    ['$V(Y)=a^2V(X)$, donc $\\sigma(Y)=\\sqrt{a^2V(X)}=\\lvert a\\rvert\\,\\sigma(X)$ : un écart type'
     ' est positif, $a=' + ev('a') + '$ compte par sa valeur absolue.',
     '$\\sigma(Y)=\\lvert' + ev('a') + '\\rvert\\times' + ev('s') + '=' + ev('-a') + '\\times' + ev('s')
     + '=' + col(ev('-a*s')) + '$.'])

V521_GAIN = variation(
    'À un jeu, on note $X$ le nombre de cibles touchées ; $V(X)=' + evd('v/10') + '$. Le gain du'
    ' joueur, en euros, est $G=' + ev('a') + 'X-' + ev('b') + '$.\n\n' + CONSIGNE + '\n\n$V(G)=?$',
    [var('a', '2..10'), var('b', '1..20'), var('v', '2..30')], [ev('a^2*v/10')],
    ['$G=aX+b$ avec $a=' + ev('a') + '$ et $b=-' + ev('b') + '$ : la constante ne change pas la'
     ' variance, et $V(aX)=a^2V(X)$.',
     '$V(G)=' + ev('a') + '^2\\times' + evd('v/10') + '=' + ev('a^2') + '\\times' + evd('v/10') + '='
     + col(evd('a^2*v/10')) + '$ (en euros au carré).'])

MODELES.append(modele(
    '02-variance-de-ax-plus-b', 'Variance de aX + b : V(aX) = a²V(X)',
    'V(aX) = a²V(X), V(aX + b) = a²V(X), σ(aX + b) = |a|σ(X) avec a négatif, gain G = aX − b'
    ' (pièges : aV(X), b ajouté, σ négatif)',
    SOMMES, 'Espérance et variance', 1,
    [V521_AX, V521_AXB, V521_SIGMA, V521_GAIN],
    [spec('a = −3, V = 4 : 36', 0, {'a': -3, 'v': 4}, '36', 'correct'),
     spec('Erreur : aV(X)', 0, {'a': -3, 'v': 4}, '-12', 'incorrect'),
     spec('Erreur : |a|V(X)', 0, {'a': -3, 'v': 4}, '12', 'incorrect'),
     spec('a = 2, b = 5, V = 1,5 : 6', 1, {'a': 2, 'b': 5, 'v': 15}, '6', 'correct'),
     spec('Erreur : + b', 1, {'a': 2, 'b': 5, 'v': 15}, '11', 'incorrect'),
     spec('Erreur : 2V', 1, {'a': 2, 'b': 5, 'v': 15}, '3', 'incorrect'),
     spec('a = −4, σ = 3 : 12', 2, {'a': -4, 'b': 2, 's': 3}, '12', 'correct'),
     spec('Erreur : σ négatif', 2, {'a': -4, 'b': 2, 's': 3}, '-12', 'incorrect'),
     spec('Erreur : a²σ', 2, {'a': -4, 'b': 2, 's': 3}, '48', 'incorrect'),
     spec('a = 5, V = 1,2 : 30', 3, {'a': 5, 'b': 8, 'v': 12}, '30', 'correct'),
     spec('Erreur : 5 × 1,2', 3, {'a': 5, 'b': 8, 'v': 12}, '6', 'incorrect'),
     spec('Erreur : 25 × 1,2 − 8', 3, {'a': 5, 'b': 8, 'v': 12}, '22', 'incorrect')]))

# --- 3. TSPE-525 : écrire une variable comme somme -----------------------------------------------

V525_BERNOULLI = variation(
    'Un QCM compte $' + ev('n') + '$ questions ; à chacune, Noé répond au hasard, indépendamment des'
    ' autres. On note $X$ le nombre de bonnes réponses.\n\nQuelle écriture de $X$ est juste ?'
    + choix('$X=X_1+X_2+\\cdots+X_{' + ev('n') + '}$, où $X_k$ vaut $1$ si la $k$-ième réponse est'
            ' juste et $0$ sinon.',
            '$X=' + ev('n') + 'X_1$, où $X_1$ vaut $1$ si la première réponse est juste et $0$ sinon.',
            '$X=X_1\\times X_2\\times\\cdots\\times X_{' + ev('n') + '}$, où $X_k$ vaut $1$ si la'
            ' $k$-ième réponse est juste et $0$ sinon.',
            '$X=\\dfrac{X_1+X_2+\\cdots+X_{' + ev('n') + '}}{' + ev('n') + '}$, où $X_k$ vaut $1$ si la'
            ' $k$-ième réponse est juste et $0$ sinon.'),
    [var('n', '5..20')], ['0'],
    ['Chaque question est une épreuve de Bernoulli : $X_k$ vaut $1$ (succès) ou $0$ (échec).',
     'Additionner les $X_k$ compte les $1$, c\'est-à-dire les bonnes réponses. $' + ev('n')
     + 'X_1$ ne regarde que la première question, le produit vaut $1$ seulement si **toutes** sont'
     ' justes, et le quotient est la **proportion** de bonnes réponses.',
     'Réponse : $' + col('X=X_1+\\cdots+X_{' + ev('n') + '}') + '$.'])

V525_DES = variation(
    'On lance $' + ev('n') + '$ dés équilibrés à six faces et on note $S$ la somme des faces'
    ' obtenues.\n\n' + CONSIGNE + '\n\n$E(S)=?$',
    [var('n', '3..12')], [ev('7*n/2')],
    ['On écrit $S=D_1+D_2+\\cdots+D_{' + ev('n') + '}$, où $D_k$ est le résultat du $k$-ième dé : on'
     ' n\'a pas besoin de la loi de $S$.',
     'Chaque $D_k$ a pour espérance $\\dfrac{1+2+3+4+5+6}{6}=3{,}5$.',
     'Par linéarité de l\'espérance : $E(S)=' + ev('n') + '\\times3{,}5=' + col(evd('7*n/2')) + '$.'])

DEUX_SERIES = (
    'On lance $' + ev('p') + '$ fois une pièce équilibrée (succès : « pile »), puis $' + ev('q')
    + '$ fois un dé équilibré à six faces (succès : « $6$ »), tous les lancers étant indépendants.'
    ' On note $N$ le nombre total de succès.')
DECOMPOSE = ('On écrit $N=Y+Z$, où $Y$ est le nombre de piles et $Z$ le nombre de $6$ : $Y$ suit la'
             ' loi binomiale $\\mathcal{B}\\big(' + ev('p') + '\\,;\\tfrac{1}{2}\\big)$ et $Z$ la loi'
             ' $\\mathcal{B}\\big(' + ev('q') + '\\,;\\tfrac{1}{6}\\big)$. $N$ ne suit pas une loi'
             ' binomiale : les succès n\'ont pas tous la même probabilité.')
V525_ESP = variation(
    DEUX_SERIES + '\n\n' + CONSIGNE + '\n\n$E(N)=?$',
    [var('p', '2..10'), var('q', '2..20')], [ev('p/2+q/6')],
    [DECOMPOSE,
     '$E(Y)=' + ev('p') + '\\times\\dfrac{1}{2}=' + ev('p/2') + '$ et $E(Z)=' + ev('q')
     + '\\times\\dfrac{1}{6}=' + ev('q/6') + '$.',
     'Par linéarité : $E(N)=E(Y)+E(Z)=' + col(ev('p/2+q/6')) + '$.'])
V525_VAR = variation(
    DEUX_SERIES + '\n\n' + CONSIGNE + '\n\n$V(N)=?$',
    [var('p', '2..10'), var('q', '2..20')], [ev('p/4+5*q/36')],
    [DECOMPOSE,
     '$V(Y)=' + ev('p') + '\\times\\dfrac{1}{2}\\times\\dfrac{1}{2}=' + ev('p/4') + '$ et $V(Z)='
     + ev('q') + '\\times\\dfrac{1}{6}\\times\\dfrac{5}{6}=' + ev('5*q/36') + '$.',
     '$Y$ et $Z$ portent sur des lancers différents, donc sont indépendantes : $V(N)=V(Y)+V(Z)='
     + ev('p/4') + '+' + ev('5*q/36') + '=' + col(ev('p/4+5*q/36')) + '$.'])

MODELES.append(modele(
    '03-ecrire-une-variable-comme-somme', 'Écrire une variable comme somme',
    'Nombre de succès = somme de variables de Bernoulli ; somme de n dés (E = 3,5n) ; succès de deux'
    ' séries d\'épreuves différentes : N = Y + Z, E(N) et V(N)',
    SOMMES, 'Décomposer en somme', 1,
    [V525_BERNOULLI, V525_DES, V525_ESP, V525_VAR],
    [spec('Somme des indicatrices', 0, {'n': 10}, '0', 'correct'),
     spec('Erreur : nX₁', 0, {'n': 10}, '1', 'incorrect'),
     spec('Erreur : produit', 0, {'n': 10}, '2', 'incorrect'),
     spec('Erreur : moyenne', 0, {'n': 10}, '3', 'incorrect'),
     spec('5 dés : 17,5', 1, {'n': 5}, '17{,}5', 'correct'),
     spec('En fraction', 1, {'n': 5}, '\\frac{35}{2}', 'correct'),
     spec('Erreur : un dé', 1, {'n': 5}, '3{,}5', 'incorrect'),
     spec('Erreur : 5 × 21', 1, {'n': 5}, '105', 'incorrect'),
     spec('4 piles, 9 dés : 2 + 3/2', 2, {'p': 4, 'q': 9}, '\\frac{7}{2}', 'correct'),
     spec('En décimal', 2, {'p': 4, 'q': 9}, '3{,}5', 'correct'),
     spec('Erreur : tout à 1/2', 2, {'p': 4, 'q': 9}, '\\frac{13}{2}', 'incorrect'),
     spec('Erreur : tout à 1/6', 2, {'p': 4, 'q': 9}, '\\frac{13}{6}', 'incorrect'),
     spec('4 piles, 9 dés : 1 + 5/4', 3, {'p': 4, 'q': 9}, '\\frac{9}{4}', 'correct'),
     spec('En décimal', 3, {'p': 4, 'q': 9}, '2{,}25', 'correct'),
     spec('Erreur : E(N)', 3, {'p': 4, 'q': 9}, '\\frac{7}{2}', 'incorrect'),
     spec('Erreur : tout à 1/4', 3, {'p': 4, 'q': 9}, '\\frac{13}{4}', 'incorrect')]))

# --- 4. TSPE-532 : loi des grands nombres --------------------------------------------------------

ECHANTILLON = ('$(X_1, \\ldots, X_n)$ est un échantillon de taille $n$ d\'une loi d\'espérance'
               ' $\\mu=' + ev('m') + '$ et de variance $V=' + ev('v') + '$ ; on note $M_n$ sa moyenne.')
V532_ENONCE = variation(
    ECHANTILLON + ' On prend $\\delta=' + evd('d/100') + '$.\n\nQue dit la loi des grands nombres ?'
    + choix('$\\displaystyle\\lim_{n\\to+\\infty}P\\big(\\lvert M_n-' + ev('m') + '\\rvert\\geqslant'
            + evd('d/100') + '\\big)=0$.',
            '$M_n=' + ev('m') + '$ dès que $n$ est assez grand.',
            '$P\\big(\\lvert M_n-' + ev('m') + '\\rvert\\geqslant' + evd('d/100') + '\\big)=0$ dès'
            ' que $n$ est assez grand.',
            '$\\displaystyle\\lim_{n\\to+\\infty}V(M_n)=' + ev('m') + '$.'),
    [var('m', '2..9'), var('v', '2..9'), var('d', '1..9')], ['0'],
    ['La loi des grands nombres : pour tout $\\delta>0$, la probabilité que la moyenne $M_n$'
     ' s\'écarte de $\\mu$ d\'au moins $\\delta$ **tend vers** $0$ quand $n$ tend vers $+\\infty$.',
     'Elle ne dit pas que $M_n$ finit par valoir $\\mu$, ni que cette probabilité devient nulle :'
     ' $M_n$ reste aléatoire. $V(M_n)=\\dfrac{V}{n}$ tend vers $0$, pas vers $\\mu$.',
     'Réponse : $' + col('\\lim P\\big(\\lvert M_n-' + ev('m') + '\\rvert\\geqslant' + evd('d/100')
                         + '\\big)=0') + '$.'])

V532_DE = variation(
    'On lance $n$ fois un dé équilibré à six faces et on note $F_n$ la fréquence d\'apparition du $'
    + ev('f') + '$ au cours des $n$ lancers.\n\nQue permet d\'affirmer la loi des grands nombres ?'
    + choix('La probabilité que $F_n$ s\'écarte de $\\dfrac{1}{6}$ d\'au moins $' + evd('d/100')
            + '$ tend vers $0$ quand $n$ tend vers $+\\infty$.',
            'Après une longue série de lancers sans $' + ev('f') + '$, obtenir $' + ev('f')
            + '$ au lancer suivant devient plus probable.',
            '$F_n=\\dfrac{1}{6}$ dès que $n$ est un multiple de $6$.',
            'Pour $n$ assez grand, le nombre de $' + ev('f') + '$ obtenus est à moins de $1$ de'
            ' $\\dfrac{n}{6}$.'),
    [var('f', '1..6'), var('d', '1..9')], ['0'],
    ['$F_n$ est la moyenne de $n$ variables de Bernoulli indépendantes de paramètre'
     ' $\\dfrac{1}{6}$ : la loi des grands nombres dit que la probabilité d\'un écart d\'au moins'
     ' $\\delta$ entre $F_n$ et $\\dfrac{1}{6}$ tend vers $0$.',
     'Les lancers sont indépendants : le dé n\'a pas de mémoire, une série sans $' + ev('f')
     + '$ ne rend pas le $' + ev('f') + '$ plus probable. La loi parle de la **fréquence**, pas du'
     ' nombre de $' + ev('f') + '$, et jamais d\'une égalité exacte.',
     'Réponse : $' + col('P\\big(\\lvert F_n-\\tfrac{1}{6}\\rvert\\geqslant' + evd('d/100')
                         + '\\big)\\to0') + '$.'])

V532_LIMITE = variation(
    ECHANTILLON + ' On prend $\\delta=' + evd('d/100') + '$.\n\nQuand $n$ tend vers $+\\infty$, vers'
    ' quoi tend $P\\big(\\lvert M_n-' + ev('m') + '\\rvert\\geqslant' + evd('d/100') + '\\big)$ ?'
    + choix('$0$', '$1$', '$' + evd('d/100') + '$', '$\\dfrac{' + ev('v') + '}{' + evd('d/100')
                                                       + '^2}$'),
    [var('m', '2..9'), var('v', '2..9'), var('d', '1..9')], ['0'],
    ['C\'est la loi des grands nombres : la probabilité d\'un écart d\'au moins $\\delta$ entre'
     ' $M_n$ et $\\mu$ tend vers $0$.',
     'On le retrouve par l\'inégalité de concentration : $P\\big(\\lvert M_n-\\mu\\rvert\\geqslant'
     '\\delta\\big)\\leqslant\\dfrac{V}{n\\delta^2}$, et $\\dfrac{' + ev('v') + '}{n\\times'
     + evd('d/100') + '^2}$ tend vers $0$. $\\dfrac{V}{\\delta^2}$ est le majorant de'
     ' Bienaymé-Tchebychev pour **une** variable, il ne dépend pas de $n$.',
     'Réponse : $' + col('0') + '$.'])

MODELES.append(modele(
    '04-loi-des-grands-nombres', 'Loi des grands nombres : interpréter',
    'Énoncé de la loi des grands nombres (P(|Mₙ − μ| ⩾ δ) → 0), interprétation sur la fréquence d\'une'
    ' face d\'un dé (pièges : sophisme du joueur, égalité exacte), limite de la probabilité d\'écart',
    LGN, 'Loi des grands nombres', 1,
    [V532_ENONCE, V532_DE, V532_LIMITE],
    [spec('Limite nulle', 0, {'m': 5, 'v': 4, 'd': 2}, '0', 'correct'),
     spec('Erreur : Mₙ = μ', 0, {'m': 5, 'v': 4, 'd': 2}, '1', 'incorrect'),
     spec('Erreur : probabilité nulle', 0, {'m': 5, 'v': 4, 'd': 2}, '2', 'incorrect'),
     spec('Fréquence proche de 1/6', 1, {'f': 6, 'd': 1}, '0', 'correct'),
     spec('Erreur : sophisme du joueur', 1, {'f': 6, 'd': 1}, '1', 'incorrect'),
     spec('Erreur : nombre de 6', 1, {'f': 6, 'd': 1}, '3', 'incorrect'),
     spec('Tend vers 0', 2, {'m': 5, 'v': 4, 'd': 2}, '0', 'correct'),
     spec('Erreur : 1', 2, {'m': 5, 'v': 4, 'd': 2}, '1', 'incorrect'),
     spec('Erreur : majorant de Bienaymé-Tchebychev', 2, {'m': 5, 'v': 4, 'd': 2}, '3',
          'incorrect')]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
