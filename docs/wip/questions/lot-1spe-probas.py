"""Écrit les 8 modèles du lot « probabilités : partition, Bernoulli, arbres et tableaux » de la
1re spé dans scripts/questions/1spe-probas/.

Phase 0 validée par David le 2026-11-01 (« je valide » sur les recos, § 21 du journal
« docs/wip/questions-1spe-progress.md »), un point par modèle :

| # | Point    | Titre                                    | Catégorie, niveau                                              |
| 1 | 1SPE-337 | Partition de l'univers                   | Probabilités conditionnelles › Partition de l'univers, 1       |
| 2 | 1SPE-342 | Compléter l'arbre de deux épreuves       | Probabilités conditionnelles › Épreuves indépendantes, 1       |
| 3 | 1SPE-422 | Probabilité lue sur l'arbre              | Probabilités conditionnelles › Épreuves indépendantes, 2       |
| 4 | 1SPE-425 | Compléter le tableau de deux épreuves    | Probabilités conditionnelles › Épreuves indépendantes, 3       |
| 5 | 1SPE-423 | Probabilité lue sur le tableau           | Probabilités conditionnelles › Épreuves indépendantes, 4       |
| 6 | 1SPE-339 | Répéter une épreuve de Bernoulli         | Probabilités conditionnelles › Répétition de Bernoulli, 1      |
| 7 | 1SPE-343 | Arbre de trois épreuves de Bernoulli     | Probabilités conditionnelles › Répétition de Bernoulli, 2      |
| 8 | 1SPE-426 | Probabilités d'une répétition (n ⩽ 4)    | Probabilités conditionnelles › Répétition de Bernoulli, 3      |

Les trois catégories sont neuves (relevé prod du 2026-11-01, tous niveaux scolaires confondus).

Voisins à ne pas répéter : d5780995 (338, deux tirages avec remise sans arbre), 5ba712bc, 69a05f98,
6dd2f133 (arbres pondérés conditionnels), 4ff9d049 (Terminale, paramètres de la loi binomiale).

Décisions (David, 2026-11-01) : Q1 trois catégories neuves ; Q2 tableaux en markdown avec des
cases « $?$ » (« ```tableau-croise » ne travaille que sur des effectifs) ; Q3 arbre dessiné pour
n ⩽ 3 seulement ; Q4 question d'accès : personne.

Bornes : « lycee/1spe.json » (deux épreuves indépendantes ; n ⩽ 4 épreuves de Bernoulli ; ni loi
binomiale ni coefficient binomial). Consigne « fraction irréductible ou nombre décimal exact » et
calculs intermédiaires en décimaux (« ;d ») quand les données le sont (lot 0-probabilités, C1/C2).

    python3 docs/wip/questions/lot-1spe-probas.py scripts/questions/1spe-probas
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]
CONSIGNE = 'Réponds par une fraction irréductible ou par un nombre décimal exact.'


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(nom, title, description, subdomain, level, variations, specs, delay=90):
    return nom, {'title': title, 'description': description, 'grades': ['1_SPE'],
                 'theme': 'Probabilités', 'domain': 'Probabilités conditionnelles',
                 'subdomain': subdomain, 'level': level, 'delay': delay, 'status': 'draft',
                 'shared': {'cleanCoefficients': True, 'blankDefaults': {'acceptDecimal': True}},
                 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [a if isinstance(a, dict) else {'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def ev(x):
    return '{{eval:' + x + '}}'


def evd(x):
    return '{{eval:' + x + ';d}}'


def choix(lignes):
    return '\n\n```choix\n' + ''.join('- ' + l + '\n' for l in lignes) + '```'


def arbre(lignes):
    return '\n\n```probtree\n' + '\n'.join(lignes) + '\n```'


MODELES = []

# --- 1. 1SPE-337 : partition de l'univers ----------------------------------------------------

CHOIX_PARTITION = ['Oui.',
                   'Non : deux de ces événements ont au moins une issue en commun.',
                   'Non : au moins une issue n\'appartient à aucun de ces événements.']
VARS_JETONS = [var('n', '12..20'), var('a', '2..6'), var('b', '6..15')]
COND_JETONS = ['b >= a+3', 'n >= b+3']


def v337(debut_b, attendu, steps):
    return variation(
        'Un sac contient $' + ev('n') + '$ jetons numérotés de $1$ à $' + ev('n') + '$. On tire un'
        ' jeton au hasard et on considère les événements :\n\n'
        '- $A$ : « le numéro est inférieur ou égal à $' + ev('a') + '$ » ;\n'
        '- $B$ : « le numéro est compris entre $' + ev(debut_b) + '$ et $' + ev('b') + '$,'
        ' bornes comprises » ;\n'
        '- $C$ : « le numéro est supérieur ou égal à $' + ev('b+1') + '$ ».\n\n'
        'Les événements $A$, $B$ et $C$ forment-ils une partition de l\'univers ?'
        + choix(CHOIX_PARTITION),
        VARS_JETONS, [attendu],
        ['L\'univers est $\\Omega=\\{1\\,;2\\,;\\ldots\\,;' + ev('n') + '\\}$. Des événements forment'
         ' une partition de $\\Omega$ lorsqu\'ils sont deux à deux disjoints (aucune issue commune)'
         ' et que leur réunion est $\\Omega$ (chaque issue est dans l\'un d\'eux).',
         '$A=\\{1\\,;\\ldots\\,;' + ev('a') + '\\}$, $B=\\{' + ev(debut_b) + '\\,;\\ldots\\,;'
         + ev('b') + '\\}$ et $C=\\{' + ev('b+1') + '\\,;\\ldots\\,;' + ev('n') + '\\}$.']
        + steps, COND_JETONS)


V337_OUI = v337('a+1', '0', [
    'Ces trois ensembles se suivent sans se chevaucher ni laisser de trou : ils sont deux à deux'
    ' disjoints et leur réunion est $\\Omega$. ' + col('\\text{Oui}') + ', c\'est une partition.'])
V337_COMMUNE = v337('a', '1', [
    'L\'issue $' + ev('a') + '$ appartient à la fois à $A$ et à $B$ : $A\\cap B\\neq\\varnothing$.'
    ' ' + col('\\text{Non}') + ', ce n\'est pas une partition.'])
V337_MANQUE = v337('a+2', '2', [
    'L\'issue $' + ev('a+1') + '$ n\'appartient ni à $A$, ni à $B$, ni à $C$ : la réunion n\'est pas'
    ' $\\Omega$. ' + col('\\text{Non}') + ', ce n\'est pas une partition.'])
V337_PC = variation(
    'Les événements $A$, $B$ et $C$ forment une partition de l\'univers. On sait que $P(A)='
    + evd('a/100') + '$ et $P(B)=' + evd('b/100') + '$.\n\n$P(C)=?$',
    [var('a', '10..55'), var('b', '10..45')], [ev('1-(a+b)/100')],
    ['$A$, $B$ et $C$ forment une partition de l\'univers : ils sont deux à deux disjoints et leur'
     ' réunion est l\'univers, donc $P(A)+P(B)+P(C)=1$.',
     '$P(C)=1-' + evd('a/100') + '-' + evd('b/100') + '=' + col(evd('1-(a+b)/100')) + '$.'],
    ['a+b <= 90', 'mod(a+b,10) != 0'])

MODELES.append(modele(
    '01-partition-de-l-univers', 'Partition de l\'univers',
    'Reconnaître une partition de l\'univers (jetons numérotés : oui, issue commune, issue'
    ' oubliée) ; probabilité du dernier événement d\'une partition',
    'Partition de l\'univers', 1,
    [V337_OUI, V337_COMMUNE, V337_MANQUE, V337_PC],
    [spec('Partition : oui', 0, {'n': 15, 'a': 4, 'b': 10}, '0', 'correct'),
     spec('Partition : « issue commune » refusé', 0, {'n': 15, 'a': 4, 'b': 10}, '1', 'incorrect'),
     spec('Issue commune', 1, {'n': 15, 'a': 4, 'b': 10}, '1', 'correct'),
     spec('Issue commune : « oui » refusé', 1, {'n': 15, 'a': 4, 'b': 10}, '0', 'incorrect'),
     spec('Issue oubliée', 2, {'n': 15, 'a': 4, 'b': 10}, '2', 'correct'),
     spec('Issue oubliée : « issue commune » refusé', 2, {'n': 15, 'a': 4, 'b': 10}, '1',
          'incorrect'),
     spec('P(C) = 1 − 0,35 − 0,22', 3, {'a': 35, 'b': 22}, '0{,}43', 'correct'),
     spec('P(C) en fraction', 3, {'a': 35, 'b': 22}, '\\frac{43}{100}', 'correct'),
     spec('Erreur : P(A) + P(B)', 3, {'a': 35, 'b': 22}, '0{,}57', 'incorrect')]))

# --- 2. 1SPE-342 : compléter l'arbre de deux épreuves ------------------------------------------

ENONCE_URNES = (
    'Une urne $U_1$ contient $' + ev('r') + '$ boules rouges et $' + ev('v') + '$ boules vertes.'
    ' Une urne $U_2$ contient $' + ev('b') + '$ boules blanches et $' + ev('k') + '$ boules'
    ' noires. On tire une boule au hasard dans $U_1$, puis une boule au hasard dans $U_2$ : les'
    ' deux tirages sont indépendants.\n\nOn note $R$, $V$, $B$ et $N$ les événements « la boule'
    ' tirée est rouge », « verte », « blanche », « noire ».')
VARS_URNES = [var('r', '1..6'), var('v', '1..6'), var('b', '1..6'), var('k', '1..6')]
COND_URNES = ['r != v', 'b != k']
ENONCE_TIRS = (
    'Inès tire un penalty au football, puis un lancer franc au basket. Elle réussit son penalty'
    ' avec la probabilité $' + evd('a/10') + '$ et son lancer franc avec la probabilité $'
    + evd('c/10') + '$ ; les deux tirs sont indépendants.\n\nOn note $F$ l\'événement « le'
    ' penalty est réussi » et $L$ l\'événement « le lancer franc est réussi ».')
VARS_TIRS = [var('a', '3..9'), var('c', '2..8')]
COND_TIRS = ['a != c']


def arbre_urnes(cache):
    """cache=True : l'arbre de l'énoncé (V et tout le second niveau masqués)."""
    vb = '?' if cache else ev('b/(b+k)')
    vn = '?' if cache else ev('k/(b+k)')
    return arbre(['R:' + ev('r/(r+v)'), '  B:' + vb, '  N:' + vn,
                  'V:' + ('?' if cache else ev('v/(r+v)')), '  B:' + vb, '  N:' + vn])


def arbre_tirs(cache):
    vl = '?' if cache else evd('c/10')
    vnl = '?' if cache else evd('1-c/10')
    return arbre(['F:' + evd('a/10'), '  L:' + vl, '  \\overline{L}:' + vnl,
                  '\\overline{F}:' + ('?' if cache else evd('1-a/10')), '  L:' + vl,
                  '  \\overline{L}:' + vnl])


V342_URNES = variation(
    ENONCE_URNES + '\n\nComplète l\'arbre pondéré qui représente cette expérience.'
    + arbre_urnes(True) + '\n\n' + CONSIGNE + '\n\nBranche $V$ : $?$\n\n'
    'Chaque branche $B$ : $?$\n\nChaque branche $N$ : $?$',
    VARS_URNES, [ev('v/(r+v)'), ev('b/(b+k)'), ev('k/(b+k)')],
    ['Premier tirage, dans $U_1$ : $P(V)=1-P(R)=\\dfrac{' + ev('v') + '}{' + ev('r+v') + '}='
     + col(ev('v/(r+v)')) + '$.',
     'Second tirage, dans $U_2$ : il ne dépend pas de la couleur de la première boule (tirages'
     ' indépendants). Les branches du second niveau portent donc les **mêmes** pondérations sous'
     ' $R$ et sous $V$ : $P(B)=\\dfrac{' + ev('b') + '}{' + ev('b+k') + '}=' + col(ev('b/(b+k)'))
     + '$ et $P(N)=\\dfrac{' + ev('k') + '}{' + ev('b+k') + '}=' + col(ev('k/(b+k)')) + '$.'
     + arbre_urnes(False)], COND_URNES)
V342_TIRS = variation(
    ENONCE_TIRS + '\n\nComplète l\'arbre pondéré qui représente cette expérience.'
    + arbre_tirs(True) + '\n\nBranche $\\overline{F}$ : $?$\n\nChaque branche $L$ : $?$\n\n'
    'Chaque branche $\\overline{L}$ : $?$',
    VARS_TIRS, [ev('1-a/10'), ev('c/10'), ev('1-c/10')],
    ['$P(\\overline{F})=1-' + evd('a/10') + '=' + col(evd('1-a/10')) + '$.',
     'Les deux tirs sont indépendants : le lancer franc est réussi avec la même probabilité, que'
     ' le penalty soit réussi ou non. Sous $F$ comme sous $\\overline{F}$ : $P(L)='
     + col(evd('c/10')) + '$ et $P(\\overline{L})=1-' + evd('c/10') + '=' + col(evd('1-c/10'))
     + '$.' + arbre_tirs(False)], COND_TIRS)

MODELES.append(modele(
    '02-completer-l-arbre-de-deux-epreuves', 'Compléter l\'arbre de deux épreuves',
    'Deux épreuves indépendantes (deux urnes ; penalty puis lancer franc) : compléter les'
    ' pondérations de l\'arbre, les mêmes sous chaque branche du premier niveau',
    'Épreuves indépendantes', 1,
    [V342_URNES, V342_TIRS],
    [spec('Urnes 2R 3V, 4B 1N', 0, {'r': 2, 'v': 3, 'b': 4, 'k': 1},
          ['\\frac{3}{5}', '\\frac{4}{5}', '\\frac{1}{5}'], 'correct'),
     spec('Urnes, décimaux', 0, {'r': 2, 'v': 3, 'b': 4, 'k': 1},
          ['0{,}6', '0{,}8', '0{,}2'], 'correct'),
     spec('Erreur : rapport blanches / noires', 0, {'r': 2, 'v': 3, 'b': 4, 'k': 1},
          ['\\frac{3}{5}', '4', '\\frac{1}{4}'], 'incorrect'),
     spec('Erreur : U₂ conditionné par la couleur (U₁ mélangée)', 0,
          {'r': 2, 'v': 3, 'b': 4, 'k': 1}, ['\\frac{3}{5}', '\\frac{2}{5}', '\\frac{1}{5}'],
          'incorrect'),
     spec('Tirs 0,7 et 0,4', 1, {'a': 7, 'c': 4}, ['0{,}3', '0{,}4', '0{,}6'], 'correct'),
     spec('Tirs, fractions', 1, {'a': 7, 'c': 4}, ['\\frac{3}{10}', '\\frac{2}{5}', '\\frac{3}{5}'],
          'correct'),
     spec('Erreur : branches inversées', 1, {'a': 7, 'c': 4}, ['0{,}3', '0{,}6', '0{,}4'],
          'incorrect')]))

# --- 3. 1SPE-422 : probabilité lue sur l'arbre ------------------------------------------------

V422_URNES = variation(
    ENONCE_URNES + '\n\nL\'arbre pondéré ci-dessous représente cette expérience.'
    + arbre_urnes(False) + '\n\n' + CONSIGNE + '\n\nProbabilité de tirer une boule rouge puis une'
    ' boule blanche : $P(R\\cap B)=?$',
    VARS_URNES, [ev('r*b/((r+v)*(b+k))')],
    ['L\'événement $R\\cap B$ correspond au chemin $R$ puis $B$ : sa probabilité est le produit des'
     ' pondérations des branches de ce chemin.',
     '$P(R\\cap B)=' + ev('r/(r+v)') + '\\times' + ev('b/(b+k)') + '='
     + col(ev('r*b/((r+v)*(b+k))')) + '$.'], COND_URNES)
V422_TIRS = variation(
    ENONCE_TIRS + '\n\nL\'arbre pondéré ci-dessous représente cette expérience.'
    + arbre_tirs(False) + '\n\n' + CONSIGNE + '\n\nProbabilité qu\'Inès réussisse un seul de ses'
    ' deux tirs : $?$',
    VARS_TIRS, [ev('(a*(10-c)+(10-a)*c)/100')],
    ['« Un seul tir réussi » est réalisé par deux chemins : $F$ puis $\\overline{L}$, et'
     ' $\\overline{F}$ puis $L$.',
     '$P(F\\cap\\overline{L})=' + evd('a/10') + '\\times' + evd('1-c/10') + '='
     + evd('a*(10-c)/100') + '$ et $P(\\overline{F}\\cap L)=' + evd('1-a/10') + '\\times'
     + evd('c/10') + '=' + evd('(10-a)*c/100') + '$.',
     'Ces deux chemins sont incompatibles : on additionne. $' + evd('a*(10-c)/100') + '+'
     + evd('(10-a)*c/100') + '=' + col(evd('(a*(10-c)+(10-a)*c)/100')) + '$.'], COND_TIRS)

MODELES.append(modele(
    '03-probabilite-lue-sur-l-arbre', 'Probabilité lue sur l\'arbre',
    'Arbre de deux épreuves indépendantes : probabilité d\'un chemin (deux urnes), d\'un événement'
    ' réalisé par deux chemins (un seul tir réussi)',
    'Épreuves indépendantes', 2,
    [V422_URNES, V422_TIRS],
    [spec('2/5 × 4/5', 0, {'r': 2, 'v': 3, 'b': 4, 'k': 1}, '\\frac{8}{25}', 'correct'),
     spec('En décimal', 0, {'r': 2, 'v': 3, 'b': 4, 'k': 1}, '0{,}32', 'correct'),
     spec('Erreur : somme des branches', 0, {'r': 2, 'v': 3, 'b': 4, 'k': 1}, '\\frac{6}{5}',
          'incorrect'),
     spec('0,7 × 0,6 + 0,3 × 0,4', 1, {'a': 7, 'c': 4}, '0{,}54', 'correct'),
     spec('Erreur : un seul chemin', 1, {'a': 7, 'c': 4}, '0{,}42', 'incorrect'),
     spec('Erreur : les deux réussis', 1, {'a': 7, 'c': 4}, '0{,}28', 'incorrect')]))

# --- 4 et 5. 1SPE-425, 1SPE-423 : tableaux --------------------------------------------------

ENONCE_DES = (
    'On lance un dé rouge et un dé bleu, tous deux équilibrés, à quatre faces. Les faces du dé'
    ' rouge portent les nombres $1$, $2$, $3$ et $4$ ; celles du dé bleu, les nombres $' + ev('m')
    + '$, $' + ev('m+1') + '$, $' + ev('m+2') + '$ et $' + ev('m+3') + '$. On note la somme des'
    ' deux nombres obtenus.')
TROUS_DES = {(2, 2), (3, 0), (4, 3)}


def tableau_des(trous):
    lignes = ['| $+$ | ' + ' | '.join('$' + ev('m+' + str(j)) + '$' for j in range(4)) + ' |',
              '| --- | --- | --- | --- | --- |']
    for i in range(1, 5):
        cases = ['$?$' if (i, j) in trous else '$' + ev(str(i) + '+m+' + str(j)) + '$'
                 for j in range(4)]
        lignes.append('| $' + str(i) + '$ | ' + ' | '.join(cases) + ' |')
    return '\n\n' + '\n'.join(lignes)


def tableau_probas(cache):
    def c(x):
        return '$?$' if cache else '$' + evd(x) + '$'
    return ('\n\n| | $B$ | $\\overline{B}$ | Total |\n| --- | --- | --- | --- |\n'
            '| $A$ | ' + c('a*c/100') + ' | ' + c('a*(10-c)/100') + ' | $' + evd('a/10') + '$ |\n'
            '| $\\overline{A}$ | ' + c('(10-a)*c/100') + ' | ' + c('(10-a)*(10-c)/100') + ' | $'
            + evd('1-a/10') + '$ |\n'
            '| Total | $' + evd('c/10') + '$ | $' + evd('1-c/10') + '$ | $1$ |')


ENONCE_AB = ('$A$ et $B$ sont deux événements **indépendants** tels que $P(A)=' + evd('a/10')
             + '$ et $P(B)=' + evd('c/10') + '$.')
VARS_AB = [var('a', '2..8'), var('c', '2..8')]
COND_AB = ['a != c']

V425_DES = variation(
    ENONCE_DES + '\n\nComplète le tableau des issues (ligne : dé rouge ; colonne : dé bleu).'
    + tableau_des(TROUS_DES),
    [var('m', '0..3')], [ev('2+m+2'), ev('3+m+0'), ev('4+m+3')],
    ['Chaque case contient la somme du nombre de sa ligne (dé rouge) et du nombre de sa colonne'
     ' (dé bleu).',
     'Ligne $2$, colonne $' + ev('m+2') + '$ : $' + col(ev('2+m+2')) + '$ ; ligne $3$, colonne $'
     + ev('m') + '$ : $' + col(ev('3+m')) + '$ ; ligne $4$, colonne $' + ev('m+3') + '$ : $'
     + col(ev('4+m+3')) + '$.' + tableau_des(set())])
V425_PROBAS = variation(
    ENONCE_AB + ' Complète le tableau des probabilités.' + tableau_probas(True) + '\n\n' + CONSIGNE,
    VARS_AB, [ev('a*c/100'), ev('a*(10-c)/100'), ev('(10-a)*c/100'), ev('(10-a)*(10-c)/100')],
    ['$A$ et $B$ sont indépendants, donc $P(A\\cap B)=P(A)\\times P(B)$ ; c\'est vrai aussi pour'
     ' $A$ et $\\overline{B}$, $\\overline{A}$ et $B$, $\\overline{A}$ et $\\overline{B}$.',
     '$P(A\\cap B)=' + evd('a/10') + '\\times' + evd('c/10') + '=' + col(evd('a*c/100'))
     + '$, $P(A\\cap\\overline{B})=' + evd('a/10') + '\\times' + evd('1-c/10') + '='
     + col(evd('a*(10-c)/100')) + '$,',
     '$P(\\overline{A}\\cap B)=' + evd('1-a/10') + '\\times' + evd('c/10') + '='
     + col(evd('(10-a)*c/100')) + '$, $P(\\overline{A}\\cap\\overline{B})=' + evd('1-a/10')
     + '\\times' + evd('1-c/10') + '=' + col(evd('(10-a)*(10-c)/100')) + '$.',
     'Vérification : chaque ligne et chaque colonne redonne son total.' + tableau_probas(False)],
    COND_AB)

MODELES.append(modele(
    '04-completer-le-tableau-de-deux-epreuves', 'Compléter le tableau de deux épreuves',
    'Deux épreuves indépendantes représentées par un tableau : tableau des issues (somme de deux'
    ' dés à quatre faces), tableau des probabilités (produits des marges)',
    'Épreuves indépendantes', 3,
    [V425_DES, V425_PROBAS],
    [spec('Dé bleu 1 à 4', 0, {'m': 1}, ['5', '4', '8'], 'correct'),
     spec('Dé bleu 0 à 3', 0, {'m': 0}, ['4', '3', '7'], 'correct'),
     spec('Erreur : produit au lieu de la somme', 0, {'m': 1}, ['6', '3', '16'], 'incorrect'),
     spec('0,3 et 0,6', 1, {'a': 3, 'c': 6}, ['0{,}18', '0{,}12', '0{,}42', '0{,}28'], 'correct'),
     spec('Erreur : somme des marges', 1, {'a': 3, 'c': 6}, ['0{,}9', '0{,}7', '1{,}3', '1{,}1'],
          'incorrect'),
     spec('Erreur : B et B̄ inversés', 1, {'a': 3, 'c': 6}, ['0{,}12', '0{,}18', '0{,}28',
                                                            '0{,}42'], 'incorrect')]))

V423_DES = variation(
    ENONCE_DES + '\n\nLe tableau donne toutes les issues (ligne : dé rouge ; colonne : dé bleu).'
    + tableau_des(set()) + '\n\n' + CONSIGNE + '\n\nProbabilité que la somme soit égale à $'
    + ev('m+4+d') + '$ : $?$',
    [var('m', '0..3'), var('d', '-3..3')], [ev('(4-abs(d))/16')],
    ['Les deux dés sont équilibrés et indépendants : les $4\\times4=16$ cases du tableau sont'
     ' des issues équiprobables.',
     'La somme $' + ev('m+4+d') + '$ apparaît dans $' + ev('4-abs(d)') + '$ case(s).',
     'Probabilité : $\\dfrac{' + ev('4-abs(d)') + '}{16}=' + col(ev('(4-abs(d))/16')) + '$.'])
V423_PROBAS = variation(
    ENONCE_AB + ' Voici le tableau des probabilités.' + tableau_probas(False) + '\n\n' + CONSIGNE
    + '\n\n$P(A\\cup B)=?$',
    VARS_AB, [ev('a/10+c/10-a*c/100')],
    ['$A\\cup B$ est réalisé par les cases $A\\cap B$, $A\\cap\\overline{B}$ et'
     ' $\\overline{A}\\cap B$ (toutes sauf $\\overline{A}\\cap\\overline{B}$).',
     '$P(A\\cup B)=1-P(\\overline{A}\\cap\\overline{B})=1-' + evd('(10-a)*(10-c)/100') + '='
     + col(evd('a/10+c/10-a*c/100')) + '$.',
     'On retrouve $P(A)+P(B)-P(A\\cap B)=' + evd('a/10') + '+' + evd('c/10') + '-'
     + evd('a*c/100') + '=' + evd('a/10+c/10-a*c/100') + '$.'], COND_AB)

MODELES.append(modele(
    '05-probabilite-lue-sur-le-tableau', 'Probabilité lue sur le tableau',
    'Deux épreuves indépendantes représentées par un tableau : probabilité d\'une somme de deux dés'
    ' (issues équiprobables), probabilité d\'une réunion lue sur le tableau des probabilités',
    'Épreuves indépendantes', 4,
    [V423_DES, V423_PROBAS],
    [spec('Somme 5, dé bleu 1 à 4 : 4/16', 0, {'m': 1, 'd': 0}, '\\frac{1}{4}', 'correct'),
     spec('Somme 3, dé bleu 1 à 4 : 2/16', 0, {'m': 1, 'd': -2}, '\\frac{1}{8}', 'correct'),
     spec('En décimal', 0, {'m': 1, 'd': -2}, '0{,}125', 'correct'),
     spec('Erreur : 1 / nombre de sommes', 0, {'m': 1, 'd': -2}, '\\frac{1}{7}', 'incorrect'),
     spec('0,3 et 0,6 : 0,72', 1, {'a': 3, 'c': 6}, '0{,}72', 'correct'),
     spec('Erreur : P(A) + P(B)', 1, {'a': 3, 'c': 6}, '0{,}9', 'incorrect'),
     spec('Erreur : P(A ∩ B)', 1, {'a': 3, 'c': 6}, '0{,}18', 'incorrect')]))

# --- 6. 1SPE-339 : répéter une épreuve de Bernoulli ------------------------------------------

V339_GENERAL = variation(
    'On répète $' + ev('n') + '$ fois, de façon indépendante, une même épreuve de Bernoulli dont la'
    ' probabilité de succès est $p=' + evd('a/10') + '$.\n\n' + CONSIGNE + '\n\n'
    'Nombre de chemins de l\'arbre qui représente cette expérience : $?$\n\n'
    'Probabilité d\'obtenir un échec à chacune des $' + ev('n-1') + '$ premières épreuves, puis un'
    ' succès à la dernière : $?$',
    [var('n', '2..4'), var('a', '1..9')], [ev('2^n'), ev('(1-a/10)^(n-1)*a/10')],
    ['Chaque épreuve a deux issues (succès $S$, échec $\\overline{S}$) : chaque nouvelle épreuve'
     ' double le nombre de chemins. Il y en a $2^{' + ev('n') + '}=' + col(ev('2^n')) + '$.',
     'Les épreuves sont indépendantes : la probabilité d\'un chemin est le produit des'
     ' probabilités de ses branches, avec $P(\\overline{S})=1-' + evd('a/10') + '='
     + evd('1-a/10') + '$.',
     'Ici $' + ev('n-1') + '$ échecs puis un succès : $' + evd('1-a/10') + '^{' + ev('n-1')
     + '}\\times' + evd('a/10') + '=' + col(evd('(1-a/10)^(n-1)*a/10')) + '$.'])
V339_ARCHER = variation(
    'Un archer atteint la cible avec la probabilité $' + evd('a/10') + '$ à chaque tir, et ses tirs'
    ' sont indépendants. Il tire trois flèches.\n\n' + CONSIGNE + '\n\n'
    'Probabilité qu\'il atteigne la cible au premier et au troisième tir, mais pas au deuxième :'
    ' $?$',
    [var('a', '2..9')], [ev('(a/10)^2*(1-a/10)')],
    ['Chaque tir est une épreuve de Bernoulli de succès « atteindre la cible », de probabilité'
     ' $p=' + evd('a/10') + '$ ; on la répète trois fois de façon indépendante.',
     'L\'événement demandé est le chemin $S\\,\\overline{S}\\,S$ : sa probabilité est le produit des'
     ' probabilités de ses branches.',
     '$' + evd('a/10') + '\\times' + evd('1-a/10') + '\\times' + evd('a/10') + '='
     + col(evd('(a/10)^2*(1-a/10)')) + '$.'])

MODELES.append(modele(
    '06-repeter-une-epreuve-de-bernoulli', 'Répéter une épreuve de Bernoulli',
    'Répétition de n ⩽ 4 épreuves de Bernoulli indépendantes et identiques : nombre de chemins,'
    ' probabilité d\'un chemin donné (cas général, archer)',
    'Répétition de Bernoulli', 1,
    [V339_GENERAL, V339_ARCHER],
    [spec('n = 3, p = 0,4 : 8 et 0,6² × 0,4', 0, {'n': 3, 'a': 4}, ['8', '0{,}144'], 'correct'),
     spec('n = 3, fraction', 0, {'n': 3, 'a': 4}, ['8', '\\frac{18}{125}'], 'correct'),
     spec('Erreur : 2n chemins', 0, {'n': 3, 'a': 4}, ['6', '0{,}144'], 'incorrect'),
     spec('Erreur : 0,4² × 0,6', 0, {'n': 3, 'a': 4}, ['8', '0{,}096'], 'incorrect'),
     spec('n = 4, p = 0,5', 0, {'n': 4, 'a': 5}, ['16', '0{,}0625'], 'correct'),
     spec('Archer 0,8 : 0,8 × 0,2 × 0,8', 1, {'a': 8}, '0{,}128', 'correct'),
     spec('Erreur : 0,8 × 0,8', 1, {'a': 8}, '0{,}64', 'incorrect'),
     spec('Erreur : 3 chemins comptés', 1, {'a': 8}, '0{,}384', 'incorrect')]))

# --- 7. 1SPE-343 : arbre de trois épreuves de Bernoulli --------------------------------------


def arbre_bernoulli(cache_echec):
    ps = evd('a/10')
    pe = '?' if cache_echec else evd('1-a/10')
    lignes = []
    for i1, (l1, p1) in enumerate([('S', ps), ('\\overline{S}', pe)]):
        lignes.append(l1 + ':' + p1)
        for l2, p2 in [('S', ps), ('\\overline{S}', pe)]:
            lignes.append('  ' + l2 + ':' + p2)
            for l3, p3 in [('S', ps), ('\\overline{S}', pe)]:
                lignes.append('    ' + l3 + ':' + p3)
    return arbre(lignes)


ENONCE_BERNOULLI3 = (
    'On répète trois fois, de façon indépendante, une même épreuve de Bernoulli dont la'
    ' probabilité de succès est $p=' + evd('a/10') + '$. On note $S$ le succès et $\\overline{S}$'
    ' l\'échec.')
V343_COMPLETER = variation(
    ENONCE_BERNOULLI3 + ' Dans l\'arbre ci-dessous, les pondérations des branches'
    ' $\\overline{S}$ ont été effacées.' + arbre_bernoulli(True) + '\n\n' + CONSIGNE + '\n\n'
    'Pondération de chaque branche $\\overline{S}$ : $?$\n\n'
    'Probabilité du chemin $S\\,\\overline{S}\\,S$ : $?$',
    [var('a', '1..9')], [ev('1-a/10'), ev('(a/10)^2*(1-a/10)')],
    ['Les épreuves sont identiques et indépendantes : à chaque nœud, la branche $\\overline{S}$'
     ' porte $1-p=1-' + evd('a/10') + '=' + col(evd('1-a/10')) + '$.' + arbre_bernoulli(False),
     'Le chemin $S\\,\\overline{S}\\,S$ a pour probabilité le produit de ses branches : $'
     + evd('a/10') + '\\times' + evd('1-a/10') + '\\times' + evd('a/10') + '='
     + col(evd('(a/10)^2*(1-a/10)')) + '$.'], ['a != 5'])
V343_COMPTER = variation(
    ENONCE_BERNOULLI3 + ' L\'arbre ci-dessous représente cette expérience.' + arbre_bernoulli(False)
    + '\n\nCombien de chemins de l\'arbre conduisent à exactement $' + ev('j') + '$ succès ?'
    '\n\n$?$ chemin(s)',
    [var('a', '1..9'), var('j', '0..3')], [ev('1+j*(3-j)')],
    ['On parcourt les $8$ chemins de l\'arbre et on compte, pour chacun, le nombre de branches $S$ :'
     ' $SSS$ ($3$ succès), $SS\\overline{S}$, $S\\overline{S}S$, $\\overline{S}SS$ ($2$ succès),'
     ' $S\\overline{S}\\,\\overline{S}$, $\\overline{S}S\\overline{S}$,'
     ' $\\overline{S}\\,\\overline{S}S$ ($1$ succès), $\\overline{S}\\,\\overline{S}\\,\\overline{S}$'
     ' ($0$ succès).',
     'Exactement $' + ev('j') + '$ succès : $' + col(ev('1+j*(3-j)')) + '$ chemin(s).'])

MODELES.append(modele(
    '07-arbre-de-trois-epreuves-de-bernoulli', 'Arbre de trois épreuves de Bernoulli',
    'Arbre de trois épreuves de Bernoulli indépendantes et identiques : compléter les branches'
    ' d\'échec et calculer un chemin ; compter les chemins à exactement j succès (sans coefficient'
    ' binomial)',
    'Répétition de Bernoulli', 2,
    [V343_COMPLETER, V343_COMPTER],
    [spec('p = 0,3 : 0,7 et 0,063', 0, {'a': 3}, ['0{,}7', '0{,}063'], 'correct'),
     spec('Erreur : p sur les échecs', 0, {'a': 3}, ['0{,}3', '0{,}027'], 'incorrect'),
     spec('2 succès : 3 chemins', 1, {'a': 4, 'j': 2}, '3', 'correct'),
     spec('0 succès : 1 chemin', 1, {'a': 4, 'j': 0}, '1', 'correct'),
     spec('Erreur : 2 succès, 2 chemins', 1, {'a': 4, 'j': 2}, '2', 'incorrect')]))

# --- 8. 1SPE-426 : probabilités d'une répétition ---------------------------------------------

ENONCE_JEU = (
    'À un jeu, Malo gagne chaque partie avec la probabilité $' + evd('a/10') + '$, et les parties'
    ' sont indépendantes.')
V426_EXACT3 = variation(
    ENONCE_JEU + ' Il joue trois parties.\n\n' + CONSIGNE + '\n\nProbabilité qu\'il gagne exactement'
    ' $' + ev('j') + '$ partie(s) : $?$',
    [var('a', '1..9'), var('j', '1..2')], [ev('3*(a/10)^j*(1-a/10)^(3-j)')],
    ['Chaque partie est une épreuve de Bernoulli (succès : gagner, $p=' + evd('a/10') + '$) ;'
     ' on la répète trois fois de façon indépendante.',
     'Un chemin à exactement $' + ev('j') + '$ victoire(s) et $' + ev('3-j') + '$ défaite(s) a pour'
     ' probabilité $' + evd('a/10') + '^{' + ev('j') + '}\\times' + evd('1-a/10') + '^{' + ev('3-j')
     + '}=' + evd('(a/10)^j*(1-a/10)^(3-j)') + '$.',
     'Il y a $3$ tels chemins : on choisit la partie qui diffère des deux autres (la seule'
     ' gagnée, ou la seule perdue).',
     'Probabilité : $3\\times' + evd('(a/10)^j*(1-a/10)^(3-j)') + '='
     + col(evd('3*(a/10)^j*(1-a/10)^(3-j)')) + '$.'], ['a != 5'])
V426_AU_MOINS = variation(
    ENONCE_JEU + ' Il joue $' + ev('n') + '$ parties.\n\n' + CONSIGNE + '\n\nProbabilité qu\'il gagne'
    ' au moins une partie : $?$',
    [var('n', '2..4'), var('a', '1..9')], [ev('1-(1-a/10)^n')],
    ['L\'événement contraire de « gagner au moins une partie » est « perdre toutes les parties » :'
     ' un seul chemin, $\\overline{S}\\cdots\\overline{S}$.',
     'Les parties sont indépendantes : $P(\\text{perdre les } ' + ev('n') + ' \\text{ parties})='
     + evd('1-a/10') + '^{' + ev('n') + '}=' + evd('(1-a/10)^n') + '$.',
     'Probabilité de gagner au moins une partie : $1-' + evd('(1-a/10)^n') + '='
     + col(evd('1-(1-a/10)^n')) + '$.'])
V426_UNE_SUR4 = variation(
    ENONCE_JEU + ' Il joue quatre parties.\n\n' + CONSIGNE + '\n\nProbabilité qu\'il gagne exactement'
    ' une partie : $?$',
    [var('a', '1..9')], [ev('4*(a/10)*(1-a/10)^3')],
    ['Gagner exactement une partie sur quatre : quatre chemins, selon la partie gagnée,'
     ' $S\\overline{S}\\,\\overline{S}\\,\\overline{S}$, $\\overline{S}S\\overline{S}\\,\\overline{S}$,'
     ' $\\overline{S}\\,\\overline{S}S\\overline{S}$, $\\overline{S}\\,\\overline{S}\\,\\overline{S}S$.',
     'Chacun a pour probabilité $' + evd('a/10') + '\\times' + evd('1-a/10') + '^3='
     + evd('(a/10)*(1-a/10)^3') + '$ (parties indépendantes).',
     'Probabilité : $4\\times' + evd('(a/10)*(1-a/10)^3') + '='
     + col(evd('4*(a/10)*(1-a/10)^3')) + '$.'])

MODELES.append(modele(
    '08-probabilites-d-une-repetition', 'Probabilités d\'une répétition (n ⩽ 4)',
    'Répétition de n ⩽ 4 épreuves de Bernoulli : exactement j succès sur 3, au moins un succès'
    ' (événement contraire), exactement un succès sur 4 — par les chemins, sans loi binomiale',
    'Répétition de Bernoulli', 3,
    [V426_EXACT3, V426_AU_MOINS, V426_UNE_SUR4],
    [spec('p = 0,4, 1 sur 3 : 3 × 0,4 × 0,36', 0, {'a': 4, 'j': 1}, '0{,}432', 'correct'),
     spec('p = 0,4, 2 sur 3 : 3 × 0,16 × 0,6', 0, {'a': 4, 'j': 2}, '0{,}288', 'correct'),
     spec('Erreur : un seul chemin', 0, {'a': 4, 'j': 1}, '0{,}144', 'incorrect'),
     spec('Au moins une sur 3, p = 0,4 : 1 − 0,216', 1, {'n': 3, 'a': 4}, '0{,}784', 'correct'),
     spec('Erreur : 1 − 0,4³', 1, {'n': 3, 'a': 4}, '0{,}936', 'incorrect'),
     spec('Erreur : 0,6³', 1, {'n': 3, 'a': 4}, '0{,}216', 'incorrect'),
     spec('Une sur 4, p = 0,2 : 4 × 0,2 × 0,512', 2, {'a': 2}, '0{,}4096', 'correct'),
     spec('En fraction', 2, {'a': 2}, '\\frac{256}{625}', 'correct'),
     spec('Erreur : un seul chemin', 2, {'a': 2}, '0{,}1024', 'incorrect')]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
