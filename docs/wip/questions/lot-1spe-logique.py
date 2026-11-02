"""Écrit les 7 modèles du lot « logique et listes » de la 1re spé dans scripts/questions/1spe-logique/.

Phase 0 validée par David le 2026-11-02 (« go » sur les recos, journal
« docs/wip/questions-1spe-logique-progress.md », D1), un point par modèle :

| # | Point    | Titre                               | Catégorie, niveau                                                |
| 1 | 1SPE-203 | Quantification implicite            | Logique › Logique et raisonnement › Quantificateurs et négation, 4 |
| 2 | 1SPE-206 | Liste en extension                  | Algorithmique › Listes › Créer une liste, 1                      |
| 3 | 1SPE-367 | Liste par ajouts successifs         | Algorithmique › Listes › Créer une liste, 2                      |
| 4 | 1SPE-207 | Liste en compréhension              | Algorithmique › Listes › Liste en compréhension, 1               |
| 5 | 1SPE-208 | Éléments et indices                 | Algorithmique › Listes › Éléments et indices, 1                  |
| 6 | 1SPE-209 | Parcourir une liste par ses indices | Algorithmique › Listes › Parcourir une liste, 1                  |
| 7 | 1SPE-210 | Itérer sur les éléments d'une liste | Algorithmique › Listes › Parcourir une liste, 2                  |

Relevé prod du 2026-11-02 (MCP) : aucun modèle de liste en base, tous niveaux confondus (catégories
« Algorithmique › Listes » neuves) ; Quantificateurs et négation : niveaux 1 à 3 pris.

Décisions : Q1 contenu d'une liste = une case par élément sur la ligne « L = [?, ?, ?] » ; Q2 Python
partout, une variation en langage naturel (367) ; Q3 209 = parcours par indice, 210 = itération sur
les éléments ; Q4 niveau 1_SPE seul ; Q5 accès : personne.

Bornes : « lycee/1spe.json » (listes seulement, Python ou langage naturel ; quantifications
implicites, ∀ et ∃ non exigibles).

Pièges du moteur de tirage : `i` (et `e`) ne sont jamais des noms de variables (imaginaire,
Euler) ; un `{{if:}}` imbriqué dans l'expression d'une variable est refusé, un seul passe ; `eval:`
ne connaît pas les comparaisons → indicatrices en `min`/`max`/`abs`. Pas de `cleanCoefficients`
(aucune expression algébrique à nettoyer).

    python3 docs/wip/questions/lot-1spe-logique.py scripts/questions/1spe-logique
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': [str(a) for a in (answers if isinstance(answers, list) else [answers])],
            'expected': {'status': status}}


def modele(nom, title, description, theme, domain, subdomain, level, variations, specs):
    return nom, {'title': title, 'description': description, 'grades': ['1_SPE'],
                 'theme': theme, 'domain': domain, 'subdomain': subdomain,
                 'level': level, 'delay': 60, 'status': 'draft',
                 'shared': {},
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


def colt(x, k=0):
    """Réponse colorée dans le texte (hors formule)."""
    return '$' + col(x, k) + '$'


def ev(x):
    return '{{eval:' + x + '}}'


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + l + '\n' for l in lignes) + '```'


def code(lignes, langage='python'):
    return '\n\n```' + langage + '\n' + '\n'.join(lignes) + '\n```\n\n'


def cases(n, nom='L'):
    """Ligne de réponse « L = [?, ?, ?] » : une case par élément."""
    return '$' + nom + '=[' + ',\\ '.join(['?'] * n) + ']$'


def liste_math(valeurs, couleur=True):
    """« [3, 5, 7] » en formule, chaque valeur colorée (corrigé)."""
    vals = [col(v) if couleur else v for v in valeurs]
    return '[' + ',\\ '.join(vals) + ']'


def liste_py(valeurs):
    return '[' + ', '.join(valeurs) + ']'


def ind(cond_pos):
    """Indicatrice entière de « cond_pos > 0 » (cond_pos entier) : 1 si vrai, 0 sinon."""
    return 'min(max(' + cond_pos + ',0),1)'


def egal(a, b):
    """Indicatrice de a = b (entiers)."""
    return '(1-min(abs(' + a + '-(' + b + ')),1))'


def qcm_specs(vi, variables, n, juste, erreurs):
    out = [spec(juste, vi, variables, '0', 'correct')]
    for k, erreur in enumerate(erreurs, start=1):
        out.append(spec('Erreur : ' + erreur, vi, variables, str(k), 'incorrect'))
    assert len(erreurs) == n - 1
    return out


MODELES = []

# --- 1. 1SPE-203 : quantification implicite ---------------------------------------------------

V203_ARITH = variation(
    'On considère la proposition : « Si un entier est multiple de $6$, alors il est pair. »\n\n'
    'Quelle phrase dit exactement la même chose ?'
    + choix(['Pour tout entier $n$, si $n$ est multiple de $6$, alors $n$ est pair.',
             'Il existe un entier $n$ multiple de $6$ qui est pair.',
             'Pour tout entier $n$, si $n$ est pair, alors $n$ est multiple de $6$.',
             'Tous les entiers sont multiples de $6$ et pairs.']),
    [], ['0'],
    ['Une proposition conditionnelle « Si un entier est…, alors il est… » parle de **tous** les'
     ' entiers qui vérifient la condition : le « pour tout » est **sous-entendu**.',
     'Elle s\'écrit donc : **« Pour tout entier $n$, si $n$ est multiple de $6$, alors $n$ est'
     ' pair. »**',
     '« Il existe… » ne garantit qu\'un seul exemple ; échanger la condition et la conclusion'
     ' donne la réciproque (fausse ici : $4$ est pair sans être multiple de $6$).'])
V203_GEOM = variation(
    'On considère la proposition : « Si un quadrilatère est un losange, alors ses diagonales sont'
    ' perpendiculaires. »\n\nQuelle phrase dit exactement la même chose ?'
    + choix(['Pour tout quadrilatère $ABCD$, si $ABCD$ est un losange, alors ses diagonales sont'
             ' perpendiculaires.',
             'Il existe un losange dont les diagonales sont perpendiculaires.',
             'Pour tout quadrilatère $ABCD$, si ses diagonales sont perpendiculaires, alors $ABCD$'
             ' est un losange.',
             'Tous les quadrilatères ont des diagonales perpendiculaires.']),
    [], ['0'],
    ['La proposition conditionnelle parle de **tous** les losanges : le « pour tout » est'
     ' **sous-entendu**.',
     'Elle s\'écrit donc : **« Pour tout quadrilatère $ABCD$, si $ABCD$ est un losange, alors ses'
     ' diagonales sont perpendiculaires. »**',
     '« Il existe… » ne garantit qu\'un seul exemple ; échanger la condition et la conclusion'
     ' donne la réciproque (fausse ici : un cerf-volant a des diagonales perpendiculaires sans'
     ' être un losange).'])
V203_EXISTE = variation(
    'Parmi ces propositions, laquelle sous-entend « il existe » (et non « pour tout ») ?'
    + choix(['Une équation du second degré peut avoir deux solutions.',
             'Un carré est un rectangle.',
             'Le carré d\'un nombre réel est positif ou nul.',
             'Si deux réels sont positifs, leur somme est positive.']),
    [], ['0'],
    ['« Un carré est un rectangle », « le carré d\'un réel est positif ou nul » et « si deux réels'
     ' sont positifs, leur somme est positive » valent pour **tous** les carrés, tous les réels :'
     ' « pour tout » est sous-entendu.',
     '« Une équation du second degré **peut** avoir deux solutions » signifie : **« il existe une'
     ' équation du second degré qui a deux solutions »** (par exemple $x^2-1=0$), pas'
     ' que toutes en ont deux ($x^2+1=0$ n\'en a aucune).'])
V203_CARRE = variation(
    'On considère la proposition, où $x$ désigne un nombre réel : « Si $x^2=' + ev('a^2')
    + '$, alors $x=' + ev('a') + '$. »\n\nCette proposition est :'
    + choix(['fausse : pour $x=-' + ev('a') + '$, on a $x^2=' + ev('a^2') + '$ mais $x\\neq '
             + ev('a') + '$.',
             'vraie : pour $x=' + ev('a') + '$, on a bien $x^2=' + ev('a^2') + '$.',
             'vraie, car $\\sqrt{' + ev('a^2') + '}=' + ev('a') + '$.',
             'ni vraie ni fausse : on ne sait pas de quel réel $x$ il s\'agit.']),
    [var('a', '2..9')], ['0'],
    ['La proposition sous-entend « **pour tout** réel $x$ » : elle est vraie seulement si **chaque**'
     ' réel $x$ tel que $x^2=' + ev('a^2') + '$ vérifie $x=' + ev('a') + '$.',
     'Un seul contre-exemple suffit à la rendre fausse : $x=-' + ev('a') + '$ donne $x^2='
     + ev('a^2') + '$ et $x\\neq ' + ev('a') + '$.',
     'La proposition est donc ' + colt('\\text{fausse}') + '. Un exemple ($x=' + ev('a')
     + '$) ne prouve pas une proposition qui commence par « pour tout ».'])
V203_INEGALITE = variation(
    'On considère la proposition, où $x$ désigne un nombre réel : « Si $x^2>' + ev('a^2')
    + '$, alors $x>' + ev('a') + '$. »\n\nCette proposition est :'
    + choix(['fausse : pour $x=-' + ev('a+1') + '$, on a $x^2=' + ev('(a+1)^2') + '>'
             + ev('a^2') + '$ mais $x<' + ev('a') + '$.',
             'vraie : pour $x=' + ev('a+1') + '$, on a $x^2>' + ev('a^2') + '$ et $x>' + ev('a')
             + '$.',
             'vraie, car la fonction carré est croissante.',
             'fausse : pour $x=' + ev('a') + '$, on n\'a pas $x^2>' + ev('a^2') + '$.']),
    [var('a', '2..9')], ['0'],
    ['La proposition sous-entend « **pour tout** réel $x$ » : un seul contre-exemple suffit à la'
     ' rendre fausse, il doit **vérifier la condition** sans vérifier la conclusion.',
     '$x=-' + ev('a+1') + '$ convient : $x^2=' + ev('(a+1)^2') + '>' + ev('a^2') + '$ mais $x<'
     + ev('a') + '$. La proposition est donc ' + colt('\\text{fausse}') + '.',
     'La fonction carré n\'est croissante que sur $[0\\,;+\\infty[$ ; et $x=' + ev('a') + '$ ne'
     ' vérifie pas la condition, ce n\'est pas un contre-exemple.'])

MODELES.append(modele(
    '01-quantification-implicite', 'Quantification implicite',
    'Repérer le « pour tout » sous-entendu d\'une proposition conditionnelle (forme explicite,'
    ' « pour tout » ou « il existe », vraie ou fausse par un contre-exemple)',
    'Logique', 'Logique et raisonnement', 'Quantificateurs et négation', 4,
    [V203_ARITH, V203_GEOM, V203_EXISTE, V203_CARRE, V203_INEGALITE],
    qcm_specs(0, {}, 4, 'pour tout explicite', ['il existe', 'réciproque', 'tous les entiers'])
    + qcm_specs(1, {}, 4, 'pour tout explicite', ['il existe', 'réciproque', 'tous'])
    + qcm_specs(2, {}, 4, 'peut avoir', ['un carré est un rectangle', 'carré positif', 'somme'])
    + qcm_specs(3, {'a': 3}, 4, 'contre-exemple −3', ['un exemple', 'racine', 'indécidable'])
    + qcm_specs(4, {'a': 4}, 4, 'contre-exemple −5', ['un exemple', 'carré croissant',
                                                    'x = a ne vérifie pas la condition'])))

# --- 2. 1SPE-206 : liste en extension ----------------------------------------------------------

MULT = [ev(str(k) + '*p') for k in range(1, 6)]
V206_CHOIX = variation(
    'On veut créer en Python la liste `L` des multiples de $' + ev('p') + '$ compris entre $'
    + ev('p') + '$ et $' + ev('5*p') + '$ (inclus), rangés dans l\'ordre croissant.\n\n'
    'Quelle instruction crée cette liste ?'
    + choix(['`L = ' + liste_py(MULT) + '`',
             '`L = ' + liste_py(['0'] + MULT) + '`',
             '`L = ' + liste_py(MULT[:4]) + '`',
             '`L = ' + liste_py([ev(str(k) + '*p') for k in range(2, 7)]) + '`']),
    [var('p', '3..9')], ['0'],
    ['Une liste **en extension** s\'écrit en énumérant tous ses éléments entre crochets, séparés'
     ' par des virgules.',
     'Les multiples de $' + ev('p') + '$ de $' + ev('p') + '$ à $' + ev('5*p') + '$ sont $'
     + ', '.join(MULT[:4]) + '$ et $' + MULT[4] + '$ : $0$ n\'est pas compris entre $' + ev('p')
     + '$ et $' + ev('5*p') + '$, et $' + ev('5*p') + '$ est inclus.',
     'D\'où ' + colt('\\texttt{L = [' + ', '.join(MULT) + ']}') + '.'])
IMP = [ev('a+' + str(2 * k)) for k in range(5)]
V206_CASES = variation(
    'Écris en extension la liste `L` des entiers impairs compris entre $' + ev('a') + '$ et $'
    + ev('a+8') + '$ (inclus), rangés dans l\'ordre croissant.\n\n' + cases(5),
    [var('m', '0..20'), var('a', '2*m+1')], IMP,
    ['On part de $' + ev('a') + '$ (impair) et on ajoute $2$ à chaque fois, jusqu\'à $' + ev('a+8')
     + '$.',
     '$$L=' + liste_math(IMP) + '$$'])

MODELES.append(modele(
    '02-liste-en-extension', 'Liste en extension',
    'Créer une liste en énumérant ses éléments : reconnaître l\'instruction Python (bornes,'
    ' premier terme), ou écrire la liste d\'entiers décrite en mots',
    'Algorithmique', 'Listes', 'Créer une liste', 1,
    [V206_CHOIX, V206_CASES],
    qcm_specs(0, {'p': 7}, 4, 'les cinq multiples', ['0 en trop', 'dernier oublié',
                                                    'départ au double'])
    + [spec('Liste juste', 1, {'m': 3, 'a': 7}, [7, 9, 11, 13, 15], 'correct'),
       spec('Erreur : entiers pairs', 1, {'m': 3, 'a': 7}, [8, 10, 12, 14, 16], 'incorrect'),
       spec('Erreur : pas de 1', 1, {'m': 3, 'a': 7}, [7, 8, 9, 10, 11], 'incorrect')]))

# --- 3. 1SPE-367 : liste par ajouts successifs -------------------------------------------------

AFF = [ev(str(k) + '*a+b') for k in range(5)]
V367_AFFINE = variation(
    'On exécute le programme Python suivant.'
    + code(['L = []', 'for k in range(5):', '    L.append(' + ev('a') + ' * k + ' + ev('b') + ')'])
    + 'Que contient la liste `L` à la fin ?\n\n' + cases(5),
    [var('a', '2..6'), var('b', '1..9')], AFF,
    ['`L.append(x)` ajoute `x` **à la fin** de la liste ; `range(5)` donne $k=0,1,2,3,4$ (cinq'
     ' passages, $5$ exclu).',
     'Passages successifs : $' + ', '.join(ev(str(k) + '*a+b') for k in range(5)) + '$.',
     '$$L=' + liste_math(AFF) + '$$'])
MUL = [ev(str(k) + '*q') for k in range(1, 5)]
V367_CONDITION = variation(
    'On exécute le programme Python suivant.'
    + code(['L = []', 'for k in range(1, ' + ev('5*q') + '):', '    if k % ' + ev('q') + ' == 0:',
            '        L.append(k)'])
    + 'Que contient la liste `L` à la fin ?\n\n' + cases(4),
    [var('q', '3..7')], MUL,
    ['`range(1, ' + ev('5*q') + ')` donne les entiers de $1$ à $' + ev('5*q-1') + '$ ($' + ev('5*q')
     + '$ exclu). `k % ' + ev('q') + ' == 0` est vrai quand $k$ est un multiple de $' + ev('q')
     + '$ : seuls ces entiers sont ajoutés.',
     '$$L=' + liste_math(MUL) + '$$'])
V367_NATUREL = variation(
    'On exécute l\'algorithme suivant, écrit en langage naturel.'
    + code(['L ← liste vide', 'u ← ' + ev('u'), 'Pour k allant de 1 à 4 :',
            '    Ajouter u à la fin de L', '    u ← ' + ev('q') + ' × u', 'Fin Pour'], '')
    + 'Que contient la liste `L` à la fin ?\n\n' + cases(4),
    [var('u', '1..5'), var('q', '2..3')], [ev('u'), ev('u*q'), ev('u*q^2'), ev('u*q^3')],
    ['À chaque passage, on ajoute d\'abord la valeur **actuelle** de $u$ à la fin de $L$, puis on'
     ' la multiplie par $' + ev('q') + '$.',
     'Valeurs ajoutées : $' + ev('u') + '$, puis $' + ev('u*q') + '$, $' + ev('u*q^2') + '$ et $'
     + ev('u*q^3') + '$ (la dernière valeur de $u$, $' + ev('u*q^4') + '$, n\'est jamais ajoutée).',
     '$$L=' + liste_math([ev('u'), ev('u*q'), ev('u*q^2'), ev('u*q^3')]) + '$$'])

MODELES.append(modele(
    '03-liste-par-ajouts-successifs', 'Liste par ajouts successifs',
    'Contenu d\'une liste construite par append dans une boucle (Python, avec ou sans condition),'
    ' ou par « ajouter à la fin » en langage naturel',
    'Algorithmique', 'Listes', 'Créer une liste', 2,
    [V367_AFFINE, V367_CONDITION, V367_NATUREL],
    [spec('Liste juste', 0, {'a': 3, 'b': 2}, [2, 5, 8, 11, 14], 'correct'),
     spec('Erreur : k de 1 à 5', 0, {'a': 3, 'b': 2}, [5, 8, 11, 14, 17], 'incorrect'),
     spec('Liste juste', 1, {'q': 4}, [4, 8, 12, 16], 'correct'),
     spec('Erreur : 0 compté', 1, {'q': 4}, [0, 4, 8, 12], 'incorrect'),
     spec('Erreur : 20 compté (borne exclue)', 1, {'q': 4}, [8, 12, 16, 20], 'incorrect'),
     spec('Liste juste', 2, {'u': 3, 'q': 2}, [3, 6, 12, 24], 'correct'),
     spec('Erreur : ajout après la multiplication', 2, {'u': 3, 'q': 2}, [6, 12, 24, 48],
          'incorrect')]))

# --- 4. 1SPE-207 : liste en compréhension ------------------------------------------------------

CAR = [ev(str(k * k) + '-c') for k in range(5)]
V207_CARRES = variation(
    'On exécute l\'instruction Python suivante (`x**2` est le carré de `x`).'
    + code(['L = [x**2 - ' + ev('c') + ' for x in range(5)]'])
    + 'Que contient la liste `L` ?\n\n' + cases(5),
    [var('c', '1..9')], CAR,
    ['Une liste **en compréhension** applique la formule `x**2 - ' + ev('c') + '` à chaque `x`'
     ' de `range(5)`, c\'est-à-dire $x=0,1,2,3,4$.',
     '$$L=' + liste_math(CAR) + '$$'])
RES = [ev(str(k) + '*q+s') for k in range(4)]
V207_CONDITION = variation(
    'On exécute l\'instruction Python suivante.'
    + code(['L = [x for x in range(' + ev('3*q+s+1') + ') if x % ' + ev('q') + ' == ' + ev('s')
            + ']'])
    + 'Que contient la liste `L` ?\n\n' + cases(4),
    [var('q', '3..5'), var('s', '1..{{eval:q-1}}')], RES,
    ['La liste contient les entiers $x$ de $0$ à $' + ev('3*q+s') + '$ qui **vérifient la'
     ' condition** `x % ' + ev('q') + ' == ' + ev('s') + '` : le reste de la division de $x$ par $'
     + ev('q') + '$ vaut $' + ev('s') + '$.',
     'C\'est l\'ensemble $\\{x\\in\\{0,\\dots,' + ev('3*q+s') + '\\}\\ :\\ x \\text{ a pour reste } '
     + ev('s') + ' \\text{ dans la division par } ' + ev('q') + '\\}$.',
     '$$L=' + liste_math(RES) + '$$'])
V207_CHOIX = variation(
    'On veut la liste `L` des carrés des entiers de $1$ à $' + ev('n') + '$ (inclus) : $L=[1, 4,'
    ' \\dots, ' + ev('n^2') + ']$.\n\nQuelle instruction Python crée cette liste ?'
    + choix(['`L = [x**2 for x in range(1, ' + ev('n+1') + ')]`',
             '`L = [x**2 for x in range(1, ' + ev('n') + ')]`',
             '`L = [x**2 for x in range(' + ev('n') + ')]`',
             '`L = [2*x for x in range(1, ' + ev('n+1') + ')]`']),
    [var('n', '5..9')], ['0'],
    ['C\'est la liste en compréhension de l\'ensemble $\\{x^2\\ :\\ x\\in\\{1,\\dots,' + ev('n')
     + '\\}\\}$ : la formule est `x**2`, et `x` doit parcourir $1, 2, \\dots, ' + ev('n') + '$.',
     '`range(1, ' + ev('n+1') + ')` donne les entiers de $1$ à $' + ev('n') + '$ (la borne $'
     + ev('n+1') + '$ est exclue) ; `range(' + ev('n') + ')` irait de $0$ à $' + ev('n-1') + '$.',
     'D\'où ' + colt('\\texttt{L = [x**2 for x in range(1, ' + ev('n+1') + ')]}') + '.'])

MODELES.append(modele(
    '04-liste-en-comprehension', 'Liste en compréhension',
    'Contenu d\'une liste en compréhension (formule, puis condition « if » liée à un ensemble),'
    ' et choix de la compréhension qui donne un ensemble décrit en mots',
    'Algorithmique', 'Listes', 'Liste en compréhension', 1,
    [V207_CARRES, V207_CONDITION, V207_CHOIX],
    [spec('Liste juste', 0, {'c': 3}, [-3, -2, 1, 6, 13], 'correct'),
     spec('Erreur : x de 1 à 5', 0, {'c': 3}, [-2, 1, 6, 13, 22], 'incorrect'),
     spec('Erreur : double au lieu du carré', 0, {'c': 3}, [-3, -1, 1, 3, 5], 'incorrect'),
     spec('Liste juste', 1, {'q': 4, 's': 1}, [1, 5, 9, 13], 'correct'),
     spec('Erreur : multiples de q', 1, {'q': 4, 's': 1}, [0, 4, 8, 12], 'incorrect')]
    + qcm_specs(2, {'n': 6}, 4, 'range(1, n+1)', ['n oublié', 'de 0 à n−1', 'doubles'])))

# --- 5. 1SPE-208 : éléments et indices ---------------------------------------------------------

Y6 = [var('y' + str(k), '1..30') for k in range(6)]
VOISINS = [f'y{k} != y{k + 1}' for k in range(5)]
Y = ['{{y' + str(k) + '}}' for k in range(6)]
SEL = 'eval:' + '+'.join(f'y{k}*' + egal('r', str(k)) for k in range(1, 5))
V208_LIRE = variation(
    'On a défini en Python la liste suivante.'
    + code(['L = ' + liste_py(Y)])
    + 'Que vaut `L[' + ev('r') + ']` ?\n\n$?$',
    Y6 + [var('r', '1..4'), var('v', SEL)], [ev('v')],
    ['En Python, les indices d\'une liste commencent à $0$ : `L[0]` est le premier élément, `L[1]`'
     ' le deuxième, et ainsi de suite.',
     '`L[' + ev('r') + ']` est donc l\'élément n° $' + ev('r+1') + '$ : $' + col(ev('v')) + '$.'],
    VOISINS)
V208_MODIFIER = variation(
    'On exécute le programme Python suivant.'
    + code(['L = ' + liste_py(Y[:4]), 'L.append(' + ev('a') + ')', 'L[1] = ' + ev('b'),
            'del L[0]'])
    + 'Que contient la liste `L` à la fin ?\n\n' + cases(4),
    Y6 + [var('a', '31..50'), var('b', '31..50')], [ev('b'), ev('y2'), ev('y3'), ev('a')],
    ['`L.append(' + ev('a') + ')` ajoute $' + ev('a') + '$ à la fin : $L=' + liste_math(
        Y[:4] + [ev('a')], False) + '$.',
     '`L[1] = ' + ev('b') + '` remplace l\'élément d\'indice $1$ (le deuxième) : $L=' + liste_math(
        [Y[0], ev('b'), Y[2], Y[3], ev('a')], False) + '$.',
     '`del L[0]` supprime le premier élément, les suivants reculent d\'un rang :',
     '$$L=' + liste_math([ev('b'), Y[2], Y[3], ev('a')]) + '$$'],
    VOISINS + ['a != b'])
V208_SUPPRIMER = variation(
    'On exécute le programme Python suivant.'
    + code(['L = ' + liste_py(Y[:5]), 'del L[' + ev('d') + ']', 'print(L[2])'])
    + 'Quelle valeur est affichée ?\n\n$?$',
    Y6 + [var('d', '0..2')], [ev('y3')],
    ['`del L[' + ev('d') + ']` supprime l\'élément d\'indice $' + ev('d') + '$ ; les éléments'
     ' qui le suivent **reculent d\'un rang** (leurs indices diminuent de $1$).',
     'Comme $' + ev('d') + '\\leqslant 2$, l\'ancien `L[3]` devient le nouveau `L[2]` : la valeur'
     ' affichée est $' + col(ev('y3')) + '$.'],
    VOISINS)

Y_FIXE = {'y0': 4, 'y1': 11, 'y2': 7, 'y3': 23, 'y4': 15, 'y5': 2}
MODELES.append(modele(
    '05-elements-et-indices', 'Éléments et indices d\'une liste',
    'Lire un élément par son indice (dès 0), modifier, ajouter (append) et supprimer (del) des'
    ' éléments, et suivre le décalage des indices',
    'Algorithmique', 'Listes', 'Éléments et indices', 1,
    [V208_LIRE, V208_MODIFIER, V208_SUPPRIMER],
    [spec('Indice 2 = troisième élément', 0, {**Y_FIXE, 'r': 2, 'v': 7}, [7], 'correct'),
     spec('Erreur : indices comptés dès 1', 0, {**Y_FIXE, 'r': 2, 'v': 7}, [11], 'incorrect'),
     spec('Liste juste', 1, {**Y_FIXE, 'a': 40, 'b': 33}, [33, 7, 23, 40], 'correct'),
     spec('Erreur : del oublié sur le bon élément', 1, {**Y_FIXE, 'a': 40, 'b': 33},
          [4, 7, 23, 40], 'incorrect'),
     spec('Erreur : L[1] pris comme premier élément', 1, {**Y_FIXE, 'a': 40, 'b': 33},
          [11, 7, 23, 40], 'incorrect'),
     spec('Valeur juste', 2, {**Y_FIXE, 'd': 1}, [23], 'correct'),
     spec('Erreur : décalage oublié', 2, {**Y_FIXE, 'd': 1}, [7], 'incorrect')]))

# --- 6. 1SPE-209 : parcourir une liste par ses indices -----------------------------------------

Z6 = [var('z' + str(k), '1..20') for k in range(6)]
Z = ['{{z' + str(k) + '}}' for k in range(6)]
COMPTE = 'eval:' + '+'.join(ind(f'z{k}-s') for k in range(6))
V209_COMPTER = variation(
    'On exécute le programme Python suivant.'
    + code(['L = ' + liste_py(Z), 'c = 0', 'for k in range(len(L)):', '    if L[k] > ' + ev('s')
            + ':', '        c = c + 1', 'print(c)'])
    + 'Quelle valeur est affichée ?\n\n$?$',
    Z6 + [var('s', '8..12'), var('c', COMPTE)], [ev('c')],
    ['`len(L)` vaut $6$ : `k` prend les indices $0$ à $5$, et `L[k]` parcourt tous les éléments.',
     'Le compteur `c` augmente de $1$ pour chaque élément **strictement** supérieur à $' + ev('s')
     + '$.',
     'Il y en a $' + col(ev('c')) + '$.'],
    ['c >= 1', 'c <= 5'] + [f'z{k} != s' for k in range(6)])
W = ['{{w' + str(k) + '}}' for k in range(6)]
W6 = ([var('t' + str(k), '1..20') for k in range(6)] + [var('p', '1..5'), var('M', '21..30')]
      + [var('w' + str(k), '{{if:p==' + str(k) + '|{{M}}|{{t' + str(k) + '}}}}') for k in range(6)])
V209_MAX = variation(
    'On exécute le programme Python suivant.'
    + code(['L = ' + liste_py(W), 'j = 0', 'for k in range(1, len(L)):', '    if L[k] > L[j]:',
            '        j = k', 'print(j)'])
    + 'Quelle valeur est affichée ?\n\n$?$',
    W6, [ev('p')],
    ['`j` garde l\'**indice** du plus grand élément rencontré : à chaque `k`, si `L[k]` dépasse'
     ' `L[j]`, `j` prend la valeur `k`.',
     'Le plus grand élément est $' + ev('M') + '$, à l\'indice $' + ev('p') + '$ (les indices'
     ' commencent à $0$).',
     'Le programme affiche $' + col(ev('p')) + '$ (l\'indice, pas la valeur $' + ev('M') + '$).'])
PAIRS = 'eval:z0+z2+z4'
V209_PAIRS = variation(
    'On exécute le programme Python suivant.'
    + code(['L = ' + liste_py(Z), 's = 0', 'for k in range(len(L)):', '    if k % 2 == 0:',
            '        s = s + L[k]', 'print(s)'])
    + 'Quelle valeur est affichée ?\n\n$?$',
    Z6 + [var('somme', PAIRS)], [ev('somme')],
    ['La condition `k % 2 == 0` porte sur l\'**indice** `k`, pas sur la valeur : on ajoute les'
     ' éléments d\'indices $0$, $2$ et $4$.',
     '$s=' + Z[0] + '+' + Z[2] + '+' + Z[4] + '=' + col(ev('somme')) + '$.'],
    ['z0+z2+z4 != z1+z3+z5'])

MODELES.append(modele(
    '06-parcourir-une-liste-par-ses-indices', 'Parcourir une liste par ses indices',
    'Parcours d\'une liste par ses indices (for k in range(len(L))) : compter selon une condition,'
    ' trouver l\'indice du plus grand élément, sommer selon l\'indice',
    'Algorithmique', 'Listes', 'Parcourir une liste', 1,
    [V209_COMPTER, V209_MAX, V209_PAIRS],
    [spec('Compte juste', 0, {'z0': 4, 'z1': 15, 'z2': 9, 'z3': 12, 'z4': 18, 'z5': 13, 's': 10, 'c': 4}, [4], 'correct'),
     spec('Erreur : éléments inférieurs comptés', 0, {'z0': 4, 'z1': 15, 'z2': 9, 'z3': 12, 'z4': 18, 'z5': 13, 's': 10, 'c': 4}, [2], 'incorrect'),
     spec('Erreur : un de trop', 0, {'z0': 4, 'z1': 15, 'z2': 9, 'z3': 12, 'z4': 18, 'z5': 13, 's': 10, 'c': 4}, [5], 'incorrect'),
     spec('Indice juste', 1, {'t0': 5, 't1': 8, 't2': 3, 't3': 17, 't4': 2, 't5': 9, 'p': 3,
                              'M': 26, 'w0': 5, 'w1': 8, 'w2': 3, 'w3': 26, 'w4': 2, 'w5': 9},
          [3], 'correct'),
     spec('Erreur : valeur au lieu de l\'indice', 1,
          {'t0': 5, 't1': 8, 't2': 3, 't3': 17, 't4': 2, 't5': 9, 'p': 3, 'M': 26, 'w0': 5,
           'w1': 8, 'w2': 3, 'w3': 26, 'w4': 2, 'w5': 9}, [26], 'incorrect'),
     spec('Erreur : rang compté dès 1', 1,
          {'t0': 5, 't1': 8, 't2': 3, 't3': 17, 't4': 2, 't5': 9, 'p': 3, 'M': 26, 'w0': 5,
           'w1': 8, 'w2': 3, 'w3': 26, 'w4': 2, 'w5': 9}, [4], 'incorrect'),
     spec('Somme juste', 2, {'z0': 4, 'z1': 15, 'z2': 9, 'z3': 12, 'z4': 18, 'z5': 3,
                             'somme': 31}, [31], 'correct'),
     spec('Erreur : indices impairs', 2, {'z0': 4, 'z1': 15, 'z2': 9, 'z3': 12, 'z4': 18,
                                          'z5': 3, 'somme': 31}, [30], 'incorrect')]))

# --- 7. 1SPE-210 : itérer sur les éléments -----------------------------------------------------

V210_SOMME = variation(
    'On exécute le programme Python suivant.'
    + code(['L = ' + liste_py(Z[:5]), 's = 0', 'for x in L:', '    s = s + x', 'print(s)'])
    + 'Quelle valeur est affichée ?\n\n$?$',
    Z6[:5] + [var('somme', 'eval:z0+z1+z2+z3+z4')], [ev('somme')],
    ['`for x in L` donne à `x` **chaque élément** de la liste, dans l\'ordre : $' + ', '.join(Z[:5])
     + '$.',
     '`s` les additionne : $s=' + '+'.join(Z[:5]) + '=' + col(ev('somme')) + '$.'])
V210_MIN = variation(
    'On exécute le programme Python suivant.'
    + code(['L = ' + liste_py(Z), 'm = L[0]', 'for x in L:', '    if x < m:', '        m = x',
            'print(m)'])
    + 'Quelle valeur est affichée ?\n\n$?$',
    Z6 + [var('m', 'eval:min(z0,z1,z2,z3,z4,z5)')], [ev('m')],
    ['`m` part du premier élément ; à chaque élément `x` plus petit que `m`, `m` prend la valeur'
     ' `x`.',
     'À la fin, `m` est le **plus petit** élément de la liste : $' + col(ev('m')) + '$.'],
    ['z0 != m'])
T = ['{{eval:2*o' + str(k) + '+1}}' for k in range(3)]
P = ['{{eval:2*g' + str(k) + '}}' for k in range(2)]
V210_NOUVELLE = variation(
    'On exécute le programme Python suivant.'
    + code(['L = ' + liste_py([T[0], P[0], P[1], T[1], T[2]]), 'M = []', 'for x in L:',
            '    if x % 2 == 1:', '        M.append(' + ev('a') + ' * x)'])
    + 'Que contient la liste `M` à la fin ?\n\n' + cases(3, 'M'),
    [var('o0', '0..9'), var('o1', '0..9'), var('o2', '0..9'), var('g0', '1..9'),
     var('g1', '1..9'), var('a', '2..5')],
    [ev('a*(2*o0+1)'), ev('a*(2*o1+1)'), ev('a*(2*o2+1)')],
    ['`for x in L` parcourt les éléments ; `x % 2 == 1` est vrai pour les éléments **impairs** :'
     ' $' + T[0] + '$, $' + T[1] + '$ et $' + T[2] + '$.',
     'Chacun est multiplié par $' + ev('a') + '$ puis ajouté à la fin de `M` :',
     '$$M=' + liste_math([ev('a*(2*o0+1)'), ev('a*(2*o1+1)'), ev('a*(2*o2+1)')]) + '$$'])

MODELES.append(modele(
    '07-iterer-sur-les-elements', 'Itérer sur les éléments d\'une liste',
    'Itération sur les éléments d\'une liste (for x in L) : somme, plus petit élément, nouvelle'
    ' liste construite à partir des éléments qui vérifient une condition',
    'Algorithmique', 'Listes', 'Parcourir une liste', 2,
    [V210_SOMME, V210_MIN, V210_NOUVELLE],
    [spec('Somme juste', 0, {'z0': 4, 'z1': 15, 'z2': 9, 'z3': 12, 'z4': 18, 'somme': 58}, [58],
          'correct'),
     spec('Erreur : dernier élément oublié', 0,
          {'z0': 4, 'z1': 15, 'z2': 9, 'z3': 12, 'z4': 18, 'somme': 58}, [40], 'incorrect'),
     spec('Minimum juste', 1, {'z0': 9, 'z1': 15, 'z2': 4, 'z3': 12, 'z4': 18, 'z5': 6, 'm': 4},
          [4], 'correct'),
     spec('Erreur : maximum', 1, {'z0': 9, 'z1': 15, 'z2': 4, 'z3': 12, 'z4': 18, 'z5': 6,
                                  'm': 4}, [18], 'incorrect'),
     spec('Liste juste', 2, {'o0': 2, 'o1': 0, 'o2': 6, 'g0': 3, 'g1': 4, 'a': 3}, [15, 3, 39],
          'correct'),
     spec('Erreur : éléments pairs', 2, {'o0': 2, 'o1': 0, 'o2': 6, 'g0': 3, 'g1': 4, 'a': 3},
          [18, 24, 3], 'incorrect')]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
