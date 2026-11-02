"""Écrit les 9 modèles du lot 5a « succession d'épreuves, schéma de Bernoulli » de la terminale
spécialité dans scripts/questions/tspe-5a-succession/.

Phase 0 validée par David le 2026-11-02 (« tes recos ? » puis « je valide », journal
« docs/wip/questions-tspe-proba-progress.md » § Lot 5a), un point par modèle :

| # | Point    | Titre                                          | Catégorie, niveau                                  |
| 1 | TSPE-612 | Univers d'une succession d'épreuves            | Succession d'épreuves › Épreuves indépendantes, 1  |
| 2 | TSPE-501 | Probabilité d'une issue (x₁, …, xₙ)            | Succession d'épreuves › Épreuves indépendantes, 2  |
| 3 | TSPE-505 | Modéliser par des épreuves indépendantes       | Succession d'épreuves › Épreuves indépendantes, 3  |
| 4 | TSPE-507 | Calculer en utilisant l'indépendance           | Succession d'épreuves › Épreuves indépendantes, 4  |
| 5 | TSPE-613 | Arbre d'une succession : chemins, indépendance | Succession d'épreuves › Arbres, 1                  |
| 6 | TSPE-506 | Compléter l'arbre de trois épreuves            | Succession d'épreuves › Arbres, 2                  |
| 7 | TSPE-615 | Deux ou trois tirages sans remise              | Succession d'épreuves › Épreuves dépendantes, 1    |
| 8 | TSPE-617 | Probabilités totales                           | Succession d'épreuves › Épreuves dépendantes, 2    |
| 9 | TSPE-509 | Seuil par la loi binomiale                     | Loi binomiale › Calcul de probabilités, 6          |

Décisions : niveau `T_SPE` seul ; domaine neuf « Succession d'épreuves » (Q1) ; M9 à côté de
6c80b4ec (Q2) ; M5 v1 en case choix à quatre options justifiées (Q3). Ne pas répéter la 1re spé
(deux épreuves, Bernoulli n ⩽ 4, partition en deux) : n quelconque, épreuves différentes, trois
niveaux d'arbre, 615 borné à trois épreuves.

Pièges : case choix → le PREMIER item est la bonne réponse (index 0), sauf M5 v1 et M9 v2 où
l'index est une variable ; seuils de M9 tirés d'une table (aucun ln dans `{{eval:…}}`), cas proches
d'un entier écartés.

    python3 docs/wip/questions/lot-tspe-5a-succession.py scripts/questions/tspe-5a-succession
"""
import json
import math
import os
import subprocess
import sys

DOSSIER = sys.argv[1]
CONSIGNE = 'Réponds par une fraction irréductible ou par un nombre décimal exact.'
SUCC = 'Succession d\'épreuves'
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


def arbre(lignes):
    return '\n\n```probtree\n' + '\n'.join(lignes) + '\n```'


def bar(x):
    return '\\overline{' + x + '}'


def dec(x):
    """Décimal écrit à la française pour le texte : 0.05 → 0{,}05."""
    s = ('%.4f' % x).rstrip('0').rstrip('.')
    return s.replace('.', '{,}')


# --- 1. TSPE-612 : univers, produit cartésien ---------------------------------------------------

V612_TROIS = variation(
    'On lance un dé équilibré à $' + ev('2*w+4') + '$ faces numérotées de $1$ à $' + ev('2*w+4')
    + '$, puis une pièce de monnaie (pile $P$ ou face $F$), puis on tire une boule dans une urne qui'
    ' contient des boules de $' + ev('c') + '$ couleurs différentes. On note le résultat sous la forme'
    ' d\'un triplet (numéro ; côté ; couleur).\n\nNombre d\'issues de cette expérience : $?$',
    [var('w', '0..4'), var('c', '2..5')], [ev('(2*w+4)*2*c')],
    ['L\'univers est le **produit cartésien** des univers des trois épreuves : $\\{1\\,;\\ldots\\,;'
     + ev('2*w+4') + '\\}\\times\\{P\\,;F\\}\\times C$, où $C$ est l\'ensemble des $' + ev('c')
     + '$ couleurs.',
     'Une issue est un triplet : $' + ev('2*w+4') + '$ choix pour le numéro, $2$ pour le côté, $'
     + ev('c') + '$ pour la couleur. Il y a $' + ev('2*w+4') + '\\times2\\times' + ev('c') + '='
     + col(ev('(2*w+4)*2*c')) + '$ issues.'])
V612_BERNOULLI = variation(
    'On répète $' + ev('n') + '$ fois une épreuve de Bernoulli. On code chaque succès par $1$ et'
    ' chaque échec par $0$ : une issue est une liste de $' + ev('n') + '$ chiffres égaux à $0$ ou'
    ' à $1$, par exemple $(1\\,;0\\,;0\\,;1\\,;\\ldots)$.\n\nNombre d\'issues de cette expérience : $?$',
    [var('n', '5..10')], [ev('2^n')],
    ['L\'univers est $\\{0\\,;1\\}^{' + ev('n') + '}=\\{0\\,;1\\}\\times\\cdots\\times\\{0\\,;1\\}$ ($'
     + ev('n') + '$ facteurs).',
     'Chaque composante a $2$ valeurs possibles : il y a $2^{' + ev('n') + '}=' + col(ev('2^n'))
     + '$ issues.'])
V612_ISSUE = variation(
    'On lance un dé à six faces, puis une pièce (pile $P$ ou face $F$), puis on tire une boule rouge,'
    ' verte ou bleue ($R$, $V$ ou $B$). L\'univers est $\\{1\\,;2\\,;3\\,;4\\,;5\\,;6\\}\\times\\{P\\,;F\\}'
    '\\times\\{R\\,;V\\,;B\\}$.\n\nLaquelle de ces écritures est une issue de cette expérience ?'
    + choix('$(' + ev('d') + '\\,;F\\,;V)$', '$\\{' + ev('d') + '\\,;F\\,;V\\}$',
            '$(F\\,;' + ev('d') + '\\,;V)$', '$(' + ev('d') + '\\,;F)$'),
    [var('d', '1..6')], ['0'],
    ['Une issue d\'un produit cartésien est une liste **ordonnée** (un triplet ici) : une composante'
     ' par épreuve, dans l\'ordre des épreuves.',
     'Les accolades désignent un ensemble, sans ordre ; $(F\\,;' + ev('d') + '\\,;V)$ met le côté'
     ' avant le numéro ; $(' + ev('d') + '\\,;F)$ oublie la troisième épreuve.',
     'L\'issue est ' + '$' + col('(' + ev('d') + '\\,;F\\,;V)') + '$.'])

MODELES.append(modele(
    '01-univers-d-une-succession-d-epreuves', 'Univers d\'une succession d\'épreuves',
    'Univers produit cartésien : nombre d\'issues de trois épreuves différentes, de n épreuves de'
    ' Bernoulli ({0 ; 1}ⁿ) ; reconnaître une issue (triplet ordonné)',
    SUCC, 'Épreuves indépendantes', 1,
    [V612_TROIS, V612_BERNOULLI, V612_ISSUE],
    [spec('Dé à 6, 3 couleurs : 36', 0, {'w': 1, 'c': 3}, '36', 'correct'),
     spec('Erreur : somme 6 + 2 + 3', 0, {'w': 1, 'c': 3}, '11', 'incorrect'),
     spec('Erreur : pièce oubliée', 0, {'w': 1, 'c': 3}, '18', 'incorrect'),
     spec('n = 7 : 128', 1, {'n': 7}, '128', 'correct'),
     spec('Erreur : 2n', 1, {'n': 7}, '14', 'incorrect'),
     spec('Erreur : n²', 1, {'n': 7}, '49', 'incorrect'),
     spec('Triplet ordonné', 2, {'d': 4}, '0', 'correct'),
     spec('Erreur : ensemble', 2, {'d': 4}, '1', 'incorrect'),
     spec('Erreur : ordre', 2, {'d': 4}, '2', 'incorrect')]))

# --- 2. TSPE-501 : probabilité d'une issue = produit --------------------------------------------

V501_TROIS = variation(
    'On lance un dé équilibré à six faces, puis une pièce truquée qui tombe sur face ($F$) avec la'
    ' probabilité $' + evd('a/10') + '$, puis on tire une boule dans une urne qui contient $' + ev('r')
    + '$ boules rouges ($R$) et $' + ev('b') + '$ boules blanches. Les trois épreuves sont'
    ' indépendantes.\n\n' + CONSIGNE + '\n\nProbabilité de l\'issue $(' + ev('f') + '\\,;F\\,;R)$ : $?$',
    [var('a', '2..8'), var('r', '1..6'), var('b', '1..6'), var('f', '1..6')],
    [ev('a*r/(60*(r+b))')],
    ['Les épreuves sont indépendantes : la probabilité d\'une issue est le **produit** des'
     ' probabilités de ses composantes.',
     '$P(' + ev('f') + ')=\\dfrac{1}{6}$, $P(F)=' + evd('a/10') + '$ et $P(R)=\\dfrac{' + ev('r') + '}{'
     + ev('r+b') + '}$.',
     '$P\\big((' + ev('f') + '\\,;F\\,;R)\\big)=\\dfrac{1}{6}\\times' + evd('a/10') + '\\times\\dfrac{'
     + ev('r') + '}{' + ev('r+b') + '}=' + col(ev('a*r/(60*(r+b))')) + '$.'], ['a != 5'])

ISSUES = ['(S\\,;' + bar('S') + '\\,;S\\,;S\\,;' + bar('S') + ')',
          '(' + bar('S') + '\\,;S\\,;S\\,;' + bar('S') + '\\,;S\\,;S)',
          '(S\\,;S\\,;' + bar('S') + '\\,;S\\,;S\\,;S\\,;' + bar('S') + ')']
V501_N = variation(
    'Lina tire des penaltys. À chaque tir, elle marque ($S$) avec la probabilité $' + evd('a/10')
    + '$, et ses tirs sont indépendants. Elle tire $' + ev('m+5') + '$ penaltys.\n\n' + CONSIGNE
    + '\n\nProbabilité de l\'issue $' + par_k(ISSUES, 'm') + '$ : $?$',
    [var('a', '2..8'), var('m', '0..2')], [ev('(a/10)^(m+3)*(1-a/10)^2')],
    ['Les tirs sont indépendants : la probabilité de l\'issue est le produit des probabilités de'
     ' ses composantes, avec $P(S)=' + evd('a/10') + '$ et $P(' + bar('S') + ')=1-' + evd('a/10') + '='
     + evd('1-a/10') + '$.',
     'L\'issue compte $' + ev('m+3') + '$ fois $S$ et $2$ fois $' + bar('S') + '$ ; l\'ordre ne change'
     ' pas le produit.',
     '$' + evd('a/10') + '^{' + ev('m+3') + '}\\times' + evd('1-a/10') + '^2='
     + col(evd('(a/10)^(m+3)*(1-a/10)^2')) + '$.'], ['a != 5'])

MODELES.append(modele(
    '02-probabilite-d-une-issue', 'Probabilité d\'une issue (x₁, …, xₙ)',
    'Épreuves indépendantes : la probabilité d\'une issue est le produit des probabilités de ses'
    ' composantes (trois épreuves différentes ; n = 5 à 7 tirs)',
    SUCC, 'Épreuves indépendantes', 2,
    [V501_TROIS, V501_N],
    [spec('1/6 × 0,3 × 2/5', 0, {'a': 3, 'r': 2, 'b': 3, 'f': 4}, '\\frac{1}{50}', 'correct'),
     spec('En décimal', 0, {'a': 3, 'r': 2, 'b': 3, 'f': 4}, '0{,}02', 'correct'),
     spec('Erreur : urne oubliée', 0, {'a': 3, 'r': 2, 'b': 3, 'f': 4}, '0{,}05', 'incorrect'),
     spec('Erreur : boules blanches', 0, {'a': 3, 'r': 2, 'b': 3, 'f': 4}, '0{,}03', 'incorrect'),
     spec('0,6³ × 0,4²', 1, {'a': 6, 'm': 0}, '0{,}034\\,56', 'correct'),
     spec('n = 7 : 0,6⁵ × 0,4²', 1, {'a': 6, 'm': 2}, '0{,}012\\,441\\,6', 'correct'),
     spec('Erreur : exposants échangés', 1, {'a': 6, 'm': 0}, '0{,}02304', 'incorrect'),
     spec('Erreur : succès seuls', 1, {'a': 6, 'm': 0}, '0{,}216', 'incorrect')]))

# --- 3. TSPE-505 : modéliser par des épreuves indépendantes -------------------------------------

V505_URNE = variation(
    'Une urne contient $' + ev('r') + '$ boules rouges et $' + ev('b') + '$ boules noires.\n\n'
    'Laquelle de ces expériences se modélise par une succession de trois épreuves indépendantes ?'
    + choix('On tire une boule, on note sa couleur et on la remet dans l\'urne ; on fait cela trois'
            ' fois.',
            'On tire successivement trois boules, sans remettre dans l\'urne les boules tirées.',
            'On tire simultanément trois boules de l\'urne.',
            'On tire des boules une à une, sans remise, jusqu\'à obtenir une boule noire.'),
    [var('r', '3..8'), var('b', '2..6')], ['0'],
    ['Avec remise, l\'urne est la même avant chaque tirage : la composition, donc la probabilité de'
     ' chaque couleur, ne dépend pas des tirages précédents. Les trois épreuves sont'
     ' **indépendantes**.',
     'Sans remise, la composition change après chaque tirage : les épreuves ne sont pas'
     ' indépendantes. Un tirage simultané est une seule épreuve ; « jusqu\'à obtenir une noire » n\'a'
     ' pas un nombre fixé d\'épreuves.',
     'Réponse : ' + col('\\text{trois tirages avec remise}').join(['$', '$']) + '.'])
V505_DE = variation(
    'On lance $' + ev('n') + '$ fois un dé équilibré à six faces et on note, à chaque lancer, si l\'on'
    ' obtient $6$ (succès $S$) ou non (échec $' + bar('S') + '$).\n\nQuelle modélisation convient ?'
    + choix('$' + ev('n') + '$ épreuves identiques et indépendantes ; univers $\\{S\\,;' + bar('S')
            + '\\}^{' + ev('n') + '}$ ; $P(S)=\\dfrac{1}{6}$ à chaque lancer.',
            '$' + ev('n') + '$ épreuves dépendantes : la probabilité d\'obtenir $6$ change après un'
            ' $6$.',
            'Une seule épreuve, d\'univers $\\{1\\,;2\\,;3\\,;4\\,;5\\,;6\\}$.',
            '$' + ev('n') + '$ épreuves indépendantes ; univers $\\{S\\,;' + bar('S') + '\\}^{' + ev('n')
            + '}$ ; $P(S)=\\dfrac{1}{' + ev('n') + '}$.'),
    [var('n', '3..10')], ['0'],
    ['Chaque lancer est une épreuve à deux issues ($S$ : « obtenir $6$ », de probabilité'
     ' $\\dfrac{1}{6}$) ; le dé ne garde pas la mémoire des lancers : les épreuves sont identiques'
     ' et indépendantes.',
     'L\'expérience est la succession de ces $' + ev('n') + '$ épreuves : univers $\\{S\\,;' + bar('S')
     + '\\}^{' + ev('n') + '}$, et $P(S)=\\dfrac{1}{6}$ ne dépend pas du nombre de lancers.',
     'Réponse : ' + col(ev('n') + '\\text{ épreuves identiques et indépendantes, } P(S)=\\dfrac{1}{6}')
     .join(['$', '$']) + '.'], ['n != 6'])

MODELES.append(modele(
    '03-modeliser-par-des-epreuves-independantes', 'Modéliser par des épreuves indépendantes',
    'Reconnaître une succession d\'épreuves indépendantes (avec ou sans remise, simultané) ;'
    ' choisir la modélisation de n lancers de dé (univers {S ; S̄}ⁿ, P(S) = 1/6)',
    SUCC, 'Épreuves indépendantes', 3,
    [V505_URNE, V505_DE],
    [spec('Avec remise', 0, {'r': 4, 'b': 3}, '0', 'correct'),
     spec('Erreur : sans remise', 0, {'r': 4, 'b': 3}, '1', 'incorrect'),
     spec('Erreur : simultané', 0, {'r': 4, 'b': 3}, '2', 'incorrect'),
     spec('Bonne modélisation', 1, {'n': 5}, '0', 'correct'),
     spec('Erreur : dépendantes', 1, {'n': 5}, '1', 'incorrect'),
     spec('Erreur : P(S) = 1/n', 1, {'n': 5}, '3', 'incorrect')]))

# --- 4. TSPE-507 : calculer en utilisant l'indépendance -----------------------------------------

COMPOSANTS = (
    'Un appareil comporte trois composants $C_1$, $C_2$ et $C_3$, qui fonctionnent indépendamment les'
    ' uns des autres, avec les probabilités respectives $' + evd('x/20') + '$, $' + evd('y/20') + '$ et $'
    + evd('z/20') + '$.')
VARS_COMP = [var('x', '16..19'), var('y', '16..19'), var('z', '16..19')]
V507_SERIE = variation(
    COMPOSANTS + ' L\'appareil fonctionne si **les trois** composants fonctionnent (montage en'
    ' série).\n\n' + CONSIGNE + '\n\nProbabilité que l\'appareil fonctionne : $?$',
    VARS_COMP, [ev('x*y*z/8000')],
    ['On note $F_i$ l\'événement « $C_i$ fonctionne ». L\'appareil fonctionne si $F_1\\cap F_2\\cap F_3$'
     ' est réalisé.',
     'Les événements sont indépendants : $P(F_1\\cap F_2\\cap F_3)=P(F_1)\\times P(F_2)\\times P(F_3)$.',
     '$' + evd('x/20') + '\\times' + evd('y/20') + '\\times' + evd('z/20') + '='
     + col(evd('x*y*z/8000')) + '$.'])
V507_PARALLELE = variation(
    COMPOSANTS + ' L\'appareil fonctionne si **au moins un** des composants fonctionne (montage en'
    ' parallèle).\n\n' + CONSIGNE + '\n\nProbabilité que l\'appareil fonctionne : $?$',
    VARS_COMP, [ev('1-(20-x)*(20-y)*(20-z)/8000')],
    ['L\'événement contraire de « au moins un composant fonctionne » est « aucun ne fonctionne » :'
     ' $' + bar('F_1') + '\\cap' + bar('F_2') + '\\cap' + bar('F_3') + '$.',
     'Les pannes sont indépendantes : $P(' + bar('F_1') + '\\cap' + bar('F_2') + '\\cap' + bar('F_3')
     + ')=' + evd('1-x/20') + '\\times' + evd('1-y/20') + '\\times' + evd('1-z/20') + '='
     + evd('(20-x)*(20-y)*(20-z)/8000') + '$.',
     'Probabilité que l\'appareil fonctionne : $1-' + evd('(20-x)*(20-y)*(20-z)/8000') + '='
     + col(evd('1-(20-x)*(20-y)*(20-z)/8000')) + '$.'])
V507_UNE = variation(
    'Sam passe trois épreuves indépendantes. Il réussit la première avec la probabilité $'
    + evd('a/10') + '$, la deuxième avec la probabilité $' + evd('b/10') + '$ et la troisième avec la'
    ' probabilité $' + evd('c/10') + '$.\n\n' + CONSIGNE + '\n\nProbabilité qu\'il réussisse'
    ' **exactement une** épreuve : $?$',
    [var('a', '2..8'), var('b', '2..8'), var('c', '2..8')],
    [ev('(a*(10-b)*(10-c)+(10-a)*b*(10-c)+(10-a)*(10-b)*c)/1000')],
    ['On note $R_1$, $R_2$, $R_3$ les événements « il réussit la première, la deuxième, la troisième épreuve ». « Exactement une » est réalisé par'
     ' trois issues incompatibles : $R_1\\cap' + bar('R_2') + '\\cap' + bar('R_3') + '$, $' + bar('R_1')
     + '\\cap R_2\\cap' + bar('R_3') + '$, $' + bar('R_1') + '\\cap' + bar('R_2') + '\\cap R_3$.',
     'Par indépendance, chacune est un produit : $' + evd('a/10') + '\\times' + evd('1-b/10') + '\\times'
     + evd('1-c/10') + '=' + evd('a*(10-b)*(10-c)/1000') + '$, $' + evd('1-a/10') + '\\times'
     + evd('b/10') + '\\times' + evd('1-c/10') + '=' + evd('(10-a)*b*(10-c)/1000') + '$, $'
     + evd('1-a/10') + '\\times' + evd('1-b/10') + '\\times' + evd('c/10') + '='
     + evd('(10-a)*(10-b)*c/1000') + '$.',
     'On additionne : ' + col(evd('(a*(10-b)*(10-c)+(10-a)*b*(10-c)+(10-a)*(10-b)*c)/1000'))
     .join(['$', '$']) + '.'],
    ['a != b', 'b != c', 'a != c'])

MODELES.append(modele(
    '04-calculer-en-utilisant-l-independance', 'Calculer en utilisant l\'indépendance',
    'Trois événements indépendants de probabilités différentes : montage en série (produit), en'
    ' parallèle (événement contraire), exactement une réussite sur trois (trois produits)',
    SUCC, 'Épreuves indépendantes', 4,
    [V507_SERIE, V507_PARALLELE, V507_UNE],
    [spec('0,85 × 0,9 × 0,95', 0, {'x': 17, 'y': 18, 'z': 19}, '0{,}726\\,75', 'correct'),
     spec('Erreur : parallèle', 0, {'x': 17, 'y': 18, 'z': 19}, '0{,}99925', 'incorrect'),
     spec('Erreur : deux composants', 0, {'x': 17, 'y': 18, 'z': 19}, '0{,}765', 'incorrect'),
     spec('1 − 0,15 × 0,1 × 0,05', 1, {'x': 17, 'y': 18, 'z': 19}, '0{,}999\\,25', 'correct'),
     spec('Erreur : série', 1, {'x': 17, 'y': 18, 'z': 19}, '0{,}72675', 'incorrect'),
     spec('Erreur : 1 − produit des fiabilités', 1, {'x': 17, 'y': 18, 'z': 19}, '0{,}27325',
          'incorrect'),
     spec('0,21 + 0,06 + 0,09', 2, {'a': 7, 'b': 4, 'c': 5}, '0{,}36', 'correct'),
     spec('En fraction', 2, {'a': 7, 'b': 4, 'c': 5}, '\\frac{9}{25}', 'correct'),
     spec('Erreur : un seul chemin', 2, {'a': 7, 'b': 4, 'c': 5}, '0{,}21', 'incorrect'),
     spec('Erreur : au moins une', 2, {'a': 7, 'b': 4, 'c': 5}, '0{,}91', 'incorrect')]))

# --- 5. TSPE-613 : arbre, chemins, indépendance -------------------------------------------------

V613_CHEMINS = variation(
    'Une expérience enchaîne trois épreuves : la première a $' + ev('a') + '$ issues, la deuxième $'
    + ev('b') + '$ issues et la troisième $' + ev('c') + '$ issues, quelle que soit l\'issue des'
    ' épreuves précédentes. On la représente par un arbre.\n\nNombre de chemins de l\'arbre : $?$\n\n'
    'Nombre total de branches de l\'arbre : $?$',
    [var('a', '2..4'), var('b', '2..4'), var('c', '2..4')], [ev('a*b*c'), ev('a+a*b+a*b*c')],
    ['Premier niveau : $' + ev('a') + '$ branches. Chacune se divise en $' + ev('b') + '$ : $'
     + ev('a') + '\\times' + ev('b') + '=' + ev('a*b') + '$ branches au deuxième niveau, puis $'
     + ev('a*b') + '\\times' + ev('c') + '=' + ev('a*b*c') + '$ au troisième.',
     'Un chemin va de la racine à une extrémité du troisième niveau : il y en a autant que de'
     ' branches du dernier niveau, $' + col(ev('a*b*c')) + '$ (une par issue).',
     'Branches : $' + ev('a') + '+' + ev('a*b') + '+' + ev('a*b*c') + '=' + col(ev('a+a*b+a*b*c'))
     + '$.'])


def arbre_613(niveau2_sous_abar):
    pa, pb, pc = evd('a/10'), evd('b/10'), evd('c/10')
    na, nb, nc = evd('1-a/10'), evd('1-b/10'), evd('1-c/10')
    lignes = []
    for l1, p1, (q, nq) in [('A', pa, (pb, nb)), (bar('A'), na, niveau2_sous_abar)]:
        lignes.append(l1 + ':' + p1)
        for l2, p2 in [('B', q), (bar('B'), nq)]:
            lignes.append('  ' + l2 + ':' + p2)
            lignes += ['    C:' + pc, '    ' + bar('C') + ':' + nc]
    return arbre(lignes)


V613_INDEP = variation(
    'L\'arbre pondéré ci-dessous représente une succession de trois épreuves.'
    + arbre_613((evd('q/10'), evd('1-q/10'))) + '\n\nCes trois épreuves sont-elles indépendantes ?'
    + choix('Oui : sous chaque nœud d\'un même niveau, les branches portent les mêmes pondérations.',
            'Oui : chaque nœud a le même nombre de branches.',
            'Non : les pondérations du niveau suivant changent selon la branche dont on vient.',
            'Non : les pondérations issues d\'un même nœud sont différentes.'),
    [var('ind', '0..1'), var('a', '1..9'), var('b', '1..9'), var('c', '1..9'), var('d', '1..9'),
     var('q', '{{eval:ind*b+(1-ind)*d}}'), var('rep', '{{eval:2-2*ind}}')],
    ['{{rep}}'],
    ['Des épreuves sont indépendantes quand la probabilité de chaque issue d\'une épreuve ne dépend'
     ' pas des issues précédentes : sur l\'arbre, les branches d\'un même niveau portent les'
     ' **mêmes** pondérations sous chaque nœud.',
     'Le nombre de branches ne suffit pas, et des pondérations différentes sous un même nœud sont'
     ' normales (elles ont pour somme $1$).',
     'Ici, la branche $B$ porte $' + evd('b/10') + '$ sous $A$ et $' + evd('q/10') + '$ sous $' + bar('A') + '$. '
     + '{{if:ind==1|Ce sont les mêmes, comme pour $C$ à chaque nœud : $' + col('\\text{oui}')
     + '$, les épreuves sont indépendantes.}}'
     + '{{if:ind==0|Ces pondérations diffèrent : $' + col('\\text{non}')
     + '$, la deuxième épreuve dépend de la première.}}'],
    ['a != 5', 'b != 5', 'c != 5', 'd != 5', 'd != b'])

MODELES.append(modele(
    '05-arbre-d-une-succession', 'Arbre d\'une succession : chemins, indépendance',
    'Arbre de trois épreuves : nombre de chemins (une par issue) et de branches ; reconnaître sur un'
    ' arbre pondéré si les épreuves sont indépendantes (mêmes pondérations à chaque niveau)',
    SUCC, 'Arbres', 1,
    [V613_CHEMINS, V613_INDEP],
    [spec('2, 3, 4 : 24 et 32', 0, {'a': 2, 'b': 3, 'c': 4}, ['24', '32'], 'correct'),
     spec('Erreur : somme des issues', 0, {'a': 2, 'b': 3, 'c': 4}, ['9', '32'], 'incorrect'),
     spec('Erreur : branches = chemins', 0, {'a': 2, 'b': 3, 'c': 4}, ['24', '24'], 'incorrect'),
     spec('Erreur : branches = 2 + 3 + 4', 0, {'a': 2, 'b': 3, 'c': 4}, ['24', '9'], 'incorrect'),
     spec('Indépendantes : bon critère', 1, {'ind': 1, 'a': 3, 'b': 4, 'c': 7, 'd': 6}, '0',
          'correct'),
     spec('Indépendantes : faux critère', 1, {'ind': 1, 'a': 3, 'b': 4, 'c': 7, 'd': 6}, '1',
          'incorrect'),
     spec('Indépendantes : « non »', 1, {'ind': 1, 'a': 3, 'b': 4, 'c': 7, 'd': 6}, '2',
          'incorrect'),
     spec('Dépendantes : bon critère', 1, {'ind': 0, 'a': 3, 'b': 4, 'c': 7, 'd': 6}, '2',
          'correct'),
     spec('Dépendantes : « oui »', 1, {'ind': 0, 'a': 3, 'b': 4, 'c': 7, 'd': 6}, '0',
          'incorrect'),
     spec('Dépendantes : faux critère', 1, {'ind': 0, 'a': 3, 'b': 4, 'c': 7, 'd': 6}, '3',
          'incorrect')]))

# --- 6. TSPE-506 : compléter l'arbre de trois épreuves -----------------------------------------


def arbre_tirs(cache):
    def v(x):
        return '?' if cache else x
    lignes = []
    for l1, p1, (q, nq) in [('F', evd('a/10'), (evd('b/10'), v(evd('1-b/10')))),
                            (bar('F'), v(evd('1-a/10')), (v(evd('b/10')), v(evd('1-b/10'))))]:
        lignes.append(l1 + ':' + p1)
        for l2, p2 in [('L', q), (bar('L'), nq)]:
            lignes.append('  ' + l2 + ':' + p2)
            lignes += ['    C:' + evd('c/10'), '    ' + bar('C') + ':' + v(evd('1-c/10'))]
    return arbre(lignes)


V506_TIRS = variation(
    'Inès tire un penalty ($F$ : « réussi »), puis un lancer franc ($L$ : « réussi »), puis une'
    ' fléchette ($C$ : « au centre »). Elle réussit avec les probabilités respectives $' + evd('a/10')
    + '$, $' + evd('b/10') + '$ et $' + evd('c/10') + '$, et les trois épreuves sont indépendantes.'
    '\n\nComplète l\'arbre pondéré qui représente cette expérience.' + arbre_tirs(True) + '\n\n'
    + CONSIGNE + '\n\nBranche $' + bar('F') + '$ : $?$\n\nBranche $L$ issue de $' + bar('F')
    + '$ : $?$\n\nChaque branche $' + bar('C') + '$ : $?$',
    [var('a', '2..8'), var('b', '2..8'), var('c', '2..8')],
    [ev('1-a/10'), ev('b/10'), ev('1-c/10')],
    ['$P(' + bar('F') + ')=1-' + evd('a/10') + '=' + col(evd('1-a/10')) + '$.',
     'Les épreuves sont indépendantes : le lancer franc est réussi avec la même probabilité, que le'
     ' penalty soit réussi ou non. Sous $' + bar('F') + '$ comme sous $F$, la branche $L$ porte $'
     + col(evd('b/10')) + '$.',
     'De même, à chaque nœud du troisième niveau, $P(' + bar('C') + ')=1-' + evd('c/10') + '='
     + col(evd('1-c/10')) + '$.' + arbre_tirs(False)],
    ['a != 5', 'b != 5', 'c != 5', 'a != b', 'b != c'])


# Étiquette d'arbre : sans « \ », le bloc l'écrit en texte (« G_1 » brut) → \mathrm{G}_1 (droit, comme les surlignées).
LG = '\\mathrm{G}_%d'


def arbre_parties(cache):
    """Victoire G, défaite Ḡ ; après une victoire : g, après une défaite : h."""
    def v(x):
        return '?' if cache else x
    apres = {'V': [('G', evd('g/10')), ('NG', v(evd('1-g/10')))],
             'D': [('G', v(evd('h/10'))), ('NG', v(evd('1-h/10')))]}
    lignes = []
    for l1, p1, e1 in [(LG % 1, evd('a/10'), 'V'), (bar('G_1'), v(evd('1-a/10')), 'D')]:
        lignes.append(l1 + ':' + p1)
        for t2, p2 in apres[e1]:
            l2 = LG % 2 if t2 == 'G' else bar('G_2')
            lignes.append('  ' + l2 + ':' + p2)
            for t3, p3 in apres['V' if t2 == 'G' else 'D']:
                l3 = LG % 3 if t3 == 'G' else bar('G_3')
                lignes.append('    ' + l3 + ':' + p3)
    return arbre(lignes)


ENONCE_PARTIES = (
    'Noé joue trois parties. Il gagne la première avec la probabilité $' + evd('a/10') + '$. Ensuite,'
    ' s\'il a gagné une partie, il gagne la suivante avec la probabilité $' + evd('g/10') + '$ ; s\'il'
    ' l\'a perdue, il gagne la suivante avec la probabilité $' + evd('h/10') + '$. On note $G_1$, $G_2$'
    ' et $G_3$ les événements « Noé gagne la première, la deuxième, la troisième partie ».')
VARS_PARTIES = [var('a', '2..8'), var('g', '5..9'), var('h', '1..5')]
COND_PARTIES = ['g > h']
V506_PARTIES = variation(
    ENONCE_PARTIES + '\n\nComplète l\'arbre pondéré qui représente cette expérience.'
    + arbre_parties(True) + '\n\n' + CONSIGNE + '\n\nBranche $' + bar('G_1') + '$ : $?$\n\n'
    'Chaque branche $G_2$ ou $G_3$ qui suit une défaite : $?$\n\nChaque branche $' + bar('G_2')
    + '$ ou $' + bar('G_3') + '$ qui suit une victoire : $?$',
    VARS_PARTIES, [ev('1-a/10'), ev('h/10'), ev('1-g/10')],
    ['$P(' + bar('G_1') + ')=1-' + evd('a/10') + '=' + col(evd('1-a/10')) + '$.',
     'Les parties ne sont pas indépendantes : la pondération d\'une branche dépend de la partie'
     ' précédente. Après une défaite, Noé gagne avec la probabilité $' + col(evd('h/10')) + '$ : par'
     ' exemple $P_{' + bar('G_1') + '}(G_2)=' + evd('h/10') + '$.',
     'Après une victoire, il perd avec la probabilité $1-' + evd('g/10') + '=' + col(evd('1-g/10'))
     + '$.' + arbre_parties(False)],
    COND_PARTIES + ['a != 5'])

MODELES.append(modele(
    '06-completer-l-arbre-de-trois-epreuves', 'Compléter l\'arbre de trois épreuves',
    'Arbre pondéré à trois niveaux, à compléter : trois épreuves indépendantes différentes (mêmes'
    ' pondérations à chaque niveau) ; trois parties dépendantes (pondérations selon la partie'
    ' précédente)',
    SUCC, 'Arbres', 2,
    [V506_TIRS, V506_PARTIES],
    [spec('0,3 ; 0,4 ; 0,4', 0, {'a': 7, 'b': 4, 'c': 6}, ['0{,}3', '0{,}4', '0{,}4'], 'correct'),
     spec('Erreur : L sous F̄ = 1 − 0,4', 0, {'a': 7, 'b': 4, 'c': 6}, ['0{,}3', '0{,}6', '0{,}4'],
          'incorrect'),
     spec('Erreur : C̄ = 0,6', 0, {'a': 7, 'b': 4, 'c': 6}, ['0{,}3', '0{,}4', '0{,}6'],
          'incorrect'),
     spec('0,4 ; 0,3 ; 0,2', 1, {'a': 6, 'g': 8, 'h': 3}, ['0{,}4', '0{,}3', '0{,}2'], 'correct'),
     spec('Erreur : après défaite = 1 − 0,3', 1, {'a': 6, 'g': 8, 'h': 3},
          ['0{,}4', '0{,}7', '0{,}2'], 'incorrect'),
     spec('Erreur : après victoire = 1 − h', 1, {'a': 6, 'g': 8, 'h': 3},
          ['0{,}4', '0{,}3', '0{,}7'], 'incorrect')]))

# --- 7. TSPE-615 : deux ou trois tirages sans remise -------------------------------------------

URNE = ('Une urne contient $' + ev('r') + '$ boules rouges ($R$) et $' + ev('b') + '$ boules blanches'
        ' ($B$). ')
VARS_URNE = [var('r', '3..6'), var('b', '2..5')]
N = '(r+b)'
V615_CHEMIN = variation(
    URNE + 'On tire successivement trois boules, **sans remise**.\n\n' + CONSIGNE + '\n\n'
    'Probabilité de l\'issue $(R\\,;R\\,;B)$ : $?$',
    VARS_URNE, [ev('r*(r-1)*b/(' + N + '*(' + N + '-1)*(' + N + '-2))')],
    ['Sans remise, la composition de l\'urne change à chaque tirage : les épreuves ne sont pas'
     ' indépendantes. On multiplie les probabilités **conditionnelles** le long du chemin.',
     'Premier tirage : $P(R_1)=\\dfrac{' + ev('r') + '}{' + ev(N) + '}$. Il reste $' + ev('r-1')
     + '$ rouges sur $' + ev(N + '-1') + '$ boules : $P_{R_1}(R_2)=\\dfrac{' + ev('r-1') + '}{'
     + ev(N + '-1') + '}$. Puis $' + ev('b') + '$ blanches sur $' + ev(N + '-2') + '$ : $P_{R_1\\cap'
     ' R_2}(B_3)=\\dfrac{' + ev('b') + '}{' + ev(N + '-2') + '}$.',
     '$\\dfrac{' + ev('r') + '}{' + ev(N) + '}\\times\\dfrac{' + ev('r-1') + '}{' + ev(N + '-1')
     + '}\\times\\dfrac{' + ev('b') + '}{' + ev(N + '-2') + '}='
     + col(ev('r*(r-1)*b/(' + N + '*(' + N + '-1)*(' + N + '-2))')) + '$.'])
V615_MEME = variation(
    URNE + 'On tire successivement deux boules, **sans remise**.\n\n' + CONSIGNE + '\n\n'
    'Probabilité que les deux boules soient de la même couleur : $?$',
    VARS_URNE, [ev('(r*(r-1)+b*(b-1))/(' + N + '*(' + N + '-1))')],
    ['« Même couleur » est réalisé par deux chemins incompatibles : $(R\\,;R)$ et $(B\\,;B)$.',
     'Sans remise : $P\\big((R\\,;R)\\big)=\\dfrac{' + ev('r') + '}{' + ev(N) + '}\\times\\dfrac{'
     + ev('r-1') + '}{' + ev(N + '-1') + '}=' + ev('r*(r-1)/(' + N + '*(' + N + '-1))') + '$ et'
     ' $P\\big((B\\,;B)\\big)=\\dfrac{' + ev('b') + '}{' + ev(N) + '}\\times\\dfrac{' + ev('b-1') + '}{'
     + ev(N + '-1') + '}=' + ev('b*(b-1)/(' + N + '*(' + N + '-1))') + '$.',
     'On additionne : ' + col(ev('(r*(r-1)+b*(b-1))/(' + N + '*(' + N + '-1))')).join(['$', '$'])
     + '.'])
V615_AU_MOINS = variation(
    URNE + 'On tire successivement trois boules, **sans remise**.\n\n' + CONSIGNE + '\n\n'
    'Probabilité d\'obtenir au moins une boule blanche : $?$',
    VARS_URNE, [ev('1-r*(r-1)*(r-2)/(' + N + '*(' + N + '-1)*(' + N + '-2))')],
    ['L\'événement contraire de « au moins une blanche » est « trois rouges » : le chemin'
     ' $(R\\,;R\\,;R)$.',
     'Sans remise : $P\\big((R\\,;R\\,;R)\\big)=\\dfrac{' + ev('r') + '}{' + ev(N) + '}\\times\\dfrac{'
     + ev('r-1') + '}{' + ev(N + '-1') + '}\\times\\dfrac{' + ev('r-2') + '}{' + ev(N + '-2') + '}='
     + ev('r*(r-1)*(r-2)/(' + N + '*(' + N + '-1)*(' + N + '-2))') + '$.',
     'Probabilité d\'au moins une blanche : $1-' + ev('r*(r-1)*(r-2)/(' + N + '*(' + N + '-1)*('
                                                      + N + '-2))') + '='
     + col(ev('1-r*(r-1)*(r-2)/(' + N + '*(' + N + '-1)*(' + N + '-2))')) + '$.'])

MODELES.append(modele(
    '07-deux-ou-trois-tirages-sans-remise', 'Deux ou trois tirages sans remise',
    'Épreuves non indépendantes (deux ou trois tirages sans remise) : probabilité d\'un chemin par'
    ' les probabilités conditionnelles, d\'un événement réalisé par deux chemins, d\'« au moins une »'
    ' par l\'événement contraire',
    SUCC, 'Épreuves dépendantes', 1,
    [V615_CHEMIN, V615_MEME, V615_AU_MOINS],
    [spec('4R 3B : 4/7 × 3/6 × 3/5', 0, {'r': 4, 'b': 3}, '\\frac{6}{35}', 'correct'),
     spec('Erreur : avec remise', 0, {'r': 4, 'b': 3}, '\\frac{48}{343}', 'incorrect'),
     spec('Erreur : ordre oublié (×3)', 0, {'r': 4, 'b': 3}, '\\frac{18}{35}', 'incorrect'),
     spec('Même couleur : 12/42 + 6/42', 1, {'r': 4, 'b': 3}, '\\frac{3}{7}', 'correct'),
     spec('Erreur : avec remise', 1, {'r': 4, 'b': 3}, '\\frac{25}{49}', 'incorrect'),
     spec('Erreur : rouges seules', 1, {'r': 4, 'b': 3}, '\\frac{2}{7}', 'incorrect'),
     spec('Au moins une blanche : 1 − 4/35', 2, {'r': 4, 'b': 3}, '\\frac{31}{35}', 'correct'),
     spec('Erreur : avec remise', 2, {'r': 4, 'b': 3}, '\\frac{279}{343}', 'incorrect'),
     spec('Erreur : P(RRR)', 2, {'r': 4, 'b': 3}, '\\frac{4}{35}', 'incorrect')]))

# --- 8. TSPE-617 : probabilités totales ---------------------------------------------------------

ARBRE_MACHINES = arbre([
    '\\mathrm{A}_1:' + evd('v/10'), '  D:' + evd('d/100'), '  ' + bar('D') + ':' + evd('1-d/100'),
    '\\mathrm{A}_2:' + evd('w/10'), '  D:' + evd('t/100'), '  ' + bar('D') + ':' + evd('1-t/100'),
    '\\mathrm{A}_3:' + evd('1-(v+w)/10'), '  D:' + evd('u/100'), '  ' + bar('D') + ':' + evd('1-u/100')])
V617_MACHINES = variation(
    'Une usine fabrique des pièces sur trois machines : $A_1$ en produit $' + ev('10*v') + '~\\%$, $A_2$'
    ' en produit $' + ev('10*w') + '~\\%$ et $A_3$ le reste. Une pièce est défectueuse ($D$) avec la'
    ' probabilité $' + evd('d/100') + '$ si elle sort de $A_1$, $' + evd('t/100') + '$ si elle sort de'
    ' $A_2$ et $' + evd('u/100') + '$ si elle sort de $A_3$. On prend une pièce au hasard.\n\n'
    + CONSIGNE + '\n\n$P(D)=?$',
    [var('v', '2..5'), var('w', '2..4'), var('d', '1..6'), var('t', '1..6'), var('u', '1..6')],
    [ev('(v*d+w*t+(10-v-w)*u)/1000')],
    ['$A_1$, $A_2$, $A_3$ forment une **partition** de l\'univers (chaque pièce sort d\'une seule'
     ' machine) :' + ARBRE_MACHINES,
     'Formule des probabilités totales : $P(D)=P(A_1)P_{A_1}(D)+P(A_2)P_{A_2}(D)+P(A_3)P_{A_3}(D)$.',
     '$P(D)=' + evd('v/10') + '\\times' + evd('d/100') + '+' + evd('w/10') + '\\times' + evd('t/100')
     + '+' + evd('1-(v+w)/10') + '\\times' + evd('u/100') + '=' + col(evd('(v*d+w*t+(10-v-w)*u)/1000'))
     + '$.'],
    ['v + w <= 8', 'd != t', 't != u', 'd != u'])
P_G3 = '(a*g*g+a*(10-g)*h+(10-a)*h*g+(10-a)*(10-h)*h)/1000'
V617_PARTIES = variation(
    ENONCE_PARTIES + '\n\nL\'arbre pondéré ci-dessous représente cette expérience.'
    + arbre_parties(False) + '\n\n' + CONSIGNE + '\n\nProbabilité que Noé gagne la troisième partie :'
    ' $P(G_3)=?$',
    VARS_PARTIES, [ev(P_G3)],
    ['$G_3$ est réalisé par quatre chemins incompatibles : $G_1G_2G_3$, $G_1' + bar('G_2') + 'G_3$, $'
     + bar('G_1') + 'G_2G_3$ et $' + bar('G_1') + bar('G_2') + 'G_3$ (formule des probabilités'
     ' totales, avec la partition formée par les deux premières parties).',
     'Chacun a pour probabilité le produit de ses branches : $' + evd('a/10') + '\\times' + evd('g/10')
     + '\\times' + evd('g/10') + '=' + evd('a*g*g/1000') + '$ ; $' + evd('a/10') + '\\times'
     + evd('1-g/10') + '\\times' + evd('h/10') + '=' + evd('a*(10-g)*h/1000') + '$ ; $'
     + evd('1-a/10') + '\\times' + evd('h/10') + '\\times' + evd('g/10') + '='
     + evd('(10-a)*h*g/1000') + '$ ; $' + evd('1-a/10') + '\\times' + evd('1-h/10') + '\\times'
     + evd('h/10') + '=' + evd('(10-a)*(10-h)*h/1000') + '$.',
     'On additionne : $P(G_3)=' + col(evd(P_G3)) + '$.'],
    COND_PARTIES + ['a != 5'])

MODELES.append(modele(
    '08-probabilites-totales', 'Probabilités totales',
    'Formule des probabilités totales : partition en trois (trois machines) ; probabilité de gagner'
    ' la troisième partie sur un arbre de trois épreuves dépendantes (quatre chemins)',
    SUCC, 'Épreuves dépendantes', 2,
    [V617_MACHINES, V617_PARTIES],
    [spec('0,5 × 0,02 + 0,3 × 0,03 + 0,2 × 0,05', 0, {'v': 5, 'w': 3, 'd': 2, 't': 3, 'u': 5},
          '0{,}029', 'correct'),
     spec('En fraction', 0, {'v': 5, 'w': 3, 'd': 2, 't': 3, 'u': 5}, '\\frac{29}{1000}',
          'correct'),
     spec('Erreur : moyenne des taux', 0, {'v': 5, 'w': 3, 'd': 2, 't': 3, 'u': 5},
          '\\frac{1}{30}', 'incorrect'),
     spec('Erreur : une machine', 0, {'v': 5, 'w': 3, 'd': 2, 't': 3, 'u': 5}, '0{,}01',
          'incorrect'),
     spec('a = 0,6, g = 0,7, h = 0,4 : 0,574', 1, {'a': 6, 'g': 7, 'h': 4}, '0{,}574', 'correct'),
     spec('Erreur : un seul chemin', 1, {'a': 6, 'g': 7, 'h': 4}, '0{,}294', 'incorrect'),
     spec('Erreur : P(G₂)', 1, {'a': 6, 'g': 7, 'h': 4}, '0{,}58', 'incorrect')]))

# --- 9. TSPE-509 : seuil par la loi binomiale ---------------------------------------------------

# (p, s) : n = ceil(ln(1 − s)/ln(1 − p)), écarté si le quotient est à moins de 0,12 d'un entier.
SEUILS = [(0.05, 0.95), (0.1, 0.9), (0.1, 0.95), (0.15, 0.9), (0.2, 0.95), (0.2, 0.99),
          (0.3, 0.9), (0.3, 0.95)]
TABLE = []
for p, s in SEUILS:
    q = math.log(1 - s) / math.log(1 - p)
    assert 0.12 < q - math.floor(q) < 0.88, (p, s, q)
    TABLE.append((p, s, q, math.ceil(q)))
K = '0..' + str(len(TABLE) - 1)
TP = par_k([dec(p) for p, s, q, n in TABLE])
TQ = par_k([dec(1 - p) for p, s, q, n in TABLE])
TS = par_k([dec(s) for p, s, q, n in TABLE])
T1S = par_k([dec(1 - s) for p, s, q, n in TABLE])
TQUOT = par_k([dec(round(q, 2)) for p, s, q, n in TABLE])
TN = par_k([str(n) for p, s, q, n in TABLE])
TNM = par_k([str(n - 1) for p, s, q, n in TABLE])


def etapes_seuil(intro):
    return [intro + ' $P(X\\geqslant1)=1-P(X=0)=1-' + TQ + '^n$.',
            '$1-' + TQ + '^n\\geqslant' + TS + '\\iff' + TQ + '^n\\leqslant' + T1S + '\\iff n\\ln(' + TQ
            + ')\\leqslant\\ln(' + T1S + ')\\iff n\\geqslant\\dfrac{\\ln(' + T1S + ')}{\\ln(' + TQ
            + ')}$ : on divise par $\\ln(' + TQ + ')<0$, l\'inégalité change de sens.',
            '$\\dfrac{\\ln(' + T1S + ')}{\\ln(' + TQ + ')}\\approx' + TQUOT + '$ : le plus petit entier'
            ' $n$ est ' + col(TN).join(['$', '$']) + ' (pour $n=' + TNM + '$, la probabilité reste'
            ' inférieure à $' + TS + '$).']


V509_ABSTRAIT = variation(
    'On répète $n$ fois, de façon indépendante, une épreuve de Bernoulli de probabilité de succès'
    ' $p=' + TP + '$. On note $X$ le nombre de succès : $X$ suit la loi binomiale $\\mathcal{B}(n\\,;'
    + TP + ')$.\n\nPlus petit entier $n$ tel que $P(X\\geqslant1)\\geqslant' + TS + '$ : $n=?$',
    [var('k', K)], [TN],
    etapes_seuil('$P(X=0)=(1-p)^n=' + TQ + '^n$, donc'))
V509_PIECES = variation(
    'Une machine produit des pièces dont une proportion $' + TP + '$ est défectueuse. On prélève $n$'
    ' pièces ; le prélèvement est assimilé à un tirage avec remise. On note $X$ le nombre de pièces'
    ' défectueuses du prélèvement.\n\nCombien de pièces faut-il prélever, au minimum, pour que la'
    ' probabilité d\'obtenir au moins une pièce défectueuse soit supérieure ou égale à $' + TS
    + '$ ?\n\n$n=?$',
    [var('k', K)], [TN],
    etapes_seuil('$X$ suit la loi binomiale $\\mathcal{B}(n\\,;' + TP + ')$ : $P(X=0)=' + TQ
                 + '^n$, donc'))

# Comparaison : le meilleur jeu est (n1 essais, a/10) ; s = 1 le montre en second (jeu B).
V509_COMPARER = variation(
    'Deux jeux sont proposés. Au jeu A, on a $' + ev('s*n2+(1-s)*n1') + '$ essais indépendants, chacun'
    ' gagnant avec la probabilité $' + evd('(s*b+(1-s)*a)/10') + '$. Au jeu B, on a $'
    + ev('s*n1+(1-s)*n2') + '$ essais indépendants, chacun gagnant avec la probabilité $'
    + evd('(s*a+(1-s)*b)/10') + '$.\n\nQuel jeu donne la plus grande probabilité de gagner au moins'
    ' une fois ?' + choix('Le jeu A.', 'Le jeu B.', 'Les deux jeux donnent la même probabilité.'),
    [var('s', '0..1'), var('n1', '2..8'), var('a', '1..4'), var('n2', '2..8'), var('b', '1..4')],
    ['{{s}}'],
    ['Le nombre de gains suit une loi binomiale ; gagner au moins une fois est le contraire de'
     ' perdre tous les essais : $P(X\\geqslant1)=1-(1-p)^n$.',
     'Jeu A : $1-' + evd('1-(s*b+(1-s)*a)/10') + '^{' + ev('s*n2+(1-s)*n1') + '}\\approx'
     + '{{eval:round(1000*(1-(1-(s*b+(1-s)*a)/10)^(s*n2+(1-s)*n1)))/1000;d}}$ ; jeu B : $1-'
     + evd('1-(s*a+(1-s)*b)/10') + '^{' + ev('s*n1+(1-s)*n2') + '}\\approx'
     + '{{eval:round(1000*(1-(1-(s*a+(1-s)*b)/10)^(s*n1+(1-s)*n2)))/1000;d}}$.',
     'Le meilleur est ' + col('\\text{le jeu {{if:s==0|A}}{{if:s==1|B}}}').join(['$', '$'])
     + ', même s\'il a {{if:n1<n2|moins d\'essais}}{{if:n1>n2|une probabilité plus faible à chaque'
     ' essai}}.'],
    ['n1 != n2', 'a != b', '(n1-n2)*(a-b) < 0',
     '(1-b/10)^n2 - (1-a/10)^n1 >= 0.03'])

MODELES.append(modele(
    '09-seuil-par-la-loi-binomiale', 'Seuil par la loi binomiale',
    'Loi binomiale : plus petit n tel que P(X ⩾ 1) ⩾ s par 1 − (1 − p)ⁿ ⩾ s et le logarithme'
    ' (abstrait, contrôle de pièces) ; comparer deux jeux par P(X ⩾ 1)',
    'Loi binomiale', 'Calcul de probabilités', 6,
    [V509_ABSTRAIT, V509_PIECES, V509_COMPARER],
    [spec('p = 0,1, s = 0,9 : 22', 0, {'k': 1}, '22', 'correct'),
     spec('Erreur : arrondi au plus proche (58,4 → 58)', 0, {'k': 0}, '58',
          'incorrect'),
     spec('p = 0,05, s = 0,95 : 59', 0, {'k': 0}, '59', 'correct'),
     spec('Erreur : sens de l\'inégalité (n = 21)', 0, {'k': 1}, '21', 'incorrect'),
     spec('Pièces p = 0,2, s = 0,99 : 21', 1, {'k': 5}, '21', 'correct'),
     spec('Erreur : 20', 1, {'k': 5}, '20', 'incorrect'),
     spec('Jeu A meilleur (s = 0)', 2, {'s': 0, 'n1': 3, 'a': 4, 'n2': 6, 'b': 1}, '0', 'correct'),
     spec('Erreur : B', 2, {'s': 0, 'n1': 3, 'a': 4, 'n2': 6, 'b': 1}, '1', 'incorrect'),
     spec('Montré en B (s = 1)', 2, {'s': 1, 'n1': 3, 'a': 4, 'n2': 6, 'b': 1}, '1', 'correct'),
     spec('Erreur : égalité', 2, {'s': 1, 'n1': 3, 'a': 4, 'n2': 6, 'b': 1}, '2', 'incorrect')]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
