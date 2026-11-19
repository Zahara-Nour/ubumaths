"""Écrit les 7 modèles du lot 8 « loi binomiale » de la Terminale technologique (STMG)
dans scripts/questions/ttechno-8-loi-binomiale/.

Phase 0 validée par David le 2026-11-19 (journal docs/archive/wip/questions-ttechno-progress.md § 54,
Q36 à Q40 : « je suis tes recos ») :

| #  | Point        | Nœud (posé par la migration)                      | Niveau | Réponse              |
| B1 | TTECHNO-057  | Probabilités › Loi binomiale (notion)              | 1 | case choix ; nombres     |
| B2 | TTECHNO-060  | Combinaisons › triangle de Pascal                  | 1 | nombres ; case choix     |
| B3 | TTECHNO-061  | Combinaisons › coefficients binomiaux              | 1 | nombres                  |
| B4 | TTECHNO-067  | Probabilités › Loi binomiale (notion)              | 2 | nombre ; case choix      |
| B5 | TTECHNO-090  | Probabilités › Loi binomiale (notion)              | 2 | case choix               |
| B6 | TTECHNO-069  | Loi binomiale › espérance et variance              | 2 | placer ; choix ; nombre  |
| B7 | TTECHNO-091  | Loi binomiale › espérance et variance              | 2 | nombres ; case choix     |

Bornes (BO Tle techno p.5, p.10 ; ttechno.md) : coefficients au triangle de Pascal pour n ⩽ 10,
sans factorielle ; espérance admise, pas de variance ; 067, 069, 090, 091 « Python ou tableur ».
Q36 : B1 = définition (ce que compte X, ses valeurs, traduire un évènement), ni 062 ni 089.
Q37 : B2, B3 neufs, n ⩽ 10. Q38 : ```simulation à graine fixe, questions qui ne dépendent pas du
tirage. Q39 : Python dans B4, B5, B7, tableur dans B6.

Pièges : jamais de variable `e`, `i`, ni P / E / V ; case choix → `melanger: non`, réponse = rang ;
eval ne connaît ni `>` ni `==` dans une valeur ; `$` du tableur = `\\$`.

    python3 docs/wip/questions/lot-ttechno-8.py scripts/questions/ttechno-8-loi-binomiale
"""
import json
import os
import sys
from math import comb

DOSSIER = sys.argv[1]


def spec(desc, vi, variables_, answers, status, violations=None):
    if isinstance(answers, str):
        answers = [answers]
    expected = {'status': status}
    if violations:
        expected['constraintViolations'] = violations
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'answers': answers, 'expected': expected}


def specs_choix(vi, variables_, bonne, erreurs):
    """erreurs : {rang: description} des propositions fausses."""
    out = [spec('choix : bonne réponse ' + str(bonne), vi, variables_, str(bonne), 'correct')]
    out += [spec('Erreur : ' + d, vi, variables_, str(j), 'incorrect')
            for j, d in sorted(erreurs.items())]
    return out


def modele(title, description, level, delay, variations, specs, shared=None):
    # Ni theme, ni domain, ni subdomain (ADR 0035) ; nœud et tag posés par la migration.
    return {'title': title, 'description': description, 'grades': ['T_TECHNO'], 'level': level,
            'delay': delay, 'status': 'draft', 'shared': shared or {}, 'variations': variations,
            'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, reponses, steps, conditions=None):
    v = {'statement': statement, 'variables': variables, 'conditions': conditions or []}
    if reponses is not None:  # None : geste placer:, sans case
        if not isinstance(reponses, list):
            reponses = [reponses]
        v['blanks'] = [r if isinstance(r, dict) else {'expectedAnswer': r} for r in reponses]
    v['correction'] = {'steps': steps}
    return v


def col(x):
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


def colt(x):
    """Couleur hors d'une formule : entourée de $."""
    return '$' + col(x) + '$'


def choix(*options):
    return '\n\n```choix\nmelanger: non\n' + ''.join('- ' + o + '\n' for o in options) + '```'


def binom_tex(n, k):
    return '\\binom{' + n + '}{' + k + '}'


DECIMAL = {'blankDefaults': {'acceptDecimal': True}}

# --- B1, TTECHNO-057 : la loi binomiale B(n ; p) ---------------------------------------------

SITUATION_B1 = (
    'Une usine fabrique des pièces ; chacune est défectueuse avec la probabilité ${{p}}$,'
    ' indépendamment des autres. On prélève au hasard ${{n}}$ pièces (le stock est assez grand'
    ' pour assimiler ce prélèvement à des tirages avec remise). On appelle $X$ le nombre de pièces'
    ' défectueuses parmi les ${{n}}$ : $X$ suit la loi binomiale'
    ' $\\mathcal{B}({{n}}\\,;{{p}})$.\n\n'
)
VARS_B1 = [var('n', '5..20'), var('p', '0.02|0.05|0.1|0.15')]

B1 = modele(
    'La loi binomiale B(n ; p) : ce que compte X',
    'Ce que compte X, valeurs prises de 0 à n, traduire « au moins un », « aucun » en évènement'
    ' sur X',
    1, 45,
    [
        variation(
            SITUATION_B1 + 'Quelles valeurs la variable $X$ peut-elle prendre ?'
            + choix('$1$, $2$, …, ${{n}}$', '$0$, $1$, $2$, …, ${{n}}$',
                    '$0$, $1$, …, ${{eval:n-1}}$', '$0$ et $1$ seulement'),
            VARS_B1, '1',
            ['$X$ compte les pièces défectueuses parmi les ${{n}}$ prélevées.',
             'Il peut n\'y en avoir aucune ($X=0$), et au plus toutes ($X={{n}}$) : $X$ prend'
             ' les valeurs ' + colt('0,\\,1,\\,\\ldots,\\,{{n}}') + ', soit ${{eval:n+1}}$'
             ' valeurs.',
             '« $0$ et $1$ » sont les valeurs d\'une loi de Bernoulli : celle d\'une seule pièce.'],
        ),
        variation(
            SITUATION_B1 + 'Quel évènement s\'écrit « au moins une pièce est défectueuse » ?'
            + choix('$\\{X=1\\}$', '$\\{X\\geqslant 1\\}$', '$\\{X>1\\}$', '$\\{X\\leqslant 1\\}$'),
            VARS_B1, '1',
            ['« Au moins une » : une, ou deux, …, ou ${{n}}$ pièces défectueuses.',
             'C\'est l\'évènement ' + colt('\\{X\\geqslant 1\\}') + ', contraire de'
             ' $\\{X=0\\}$ (aucune pièce défectueuse).',
             '$\\{X=1\\}$ veut dire « exactement une » ; $\\{X>1\\}$, « au moins deux ».'],
        ),
        variation(
            SITUATION_B1 + 'Quel évènement s\'écrit « toutes les pièces prélevées sont en bon état » ?'
            + choix('$\\{X=0\\}$', '$\\{X={{n}}\\}$', '$\\{X\\leqslant 1\\}$',
                    '$\\{X\\neq 0\\}$'),
            VARS_B1, '0',
            ['$X$ compte les pièces **défectueuses** (les succès).',
             'Toutes en bon état : aucune pièce défectueuse, c\'est ' + colt('\\{X=0\\}') + '.',
             '$\\{X={{n}}\\}$ voudrait dire que les ${{n}}$ pièces sont défectueuses.'],
        ),
        variation(
            SITUATION_B1 + 'Quelle est la plus grande valeur que $X$ peut prendre ? Combien de'
            ' valeurs différentes $X$ peut-elle prendre ?\n\nPlus grande valeur : $?$\n\n'
            'Nombre de valeurs : $?$',
            VARS_B1, ['{{n}}', '{{eval:n+1}}'],
            ['Au plus, les ${{n}}$ pièces sont défectueuses : la plus grande valeur est '
             + colt('{{n}}') + '.',
             '$X$ prend les valeurs $0,\\,1,\\,\\ldots,\\,{{n}}$ : on n\'oublie pas $0$, cela fait '
             + colt('{{eval:n+1}}') + ' valeurs.'],
        ),
    ],
    specs_choix(0, {'n': '8', 'p': '0.05'}, 1,
                {0: 'oubli de 0', 2: 'oubli de n', 3: 'loi de Bernoulli'})
    + specs_choix(1, {'n': '12', 'p': '0.1'}, 1,
                  {0: 'exactement une', 2: 'au moins deux', 3: 'au plus une'})
    + specs_choix(2, {'n': '10', 'p': '0.02'}, 0,
                  {1: 'succès et échecs confondus', 2: 'au plus une', 3: 'contraire'})
    + [
        spec('n = 8 : 8 et 9', 3, {'n': '8', 'p': '0.05'}, ['8', '9'], 'correct'),
        spec('Erreur : oubli de 0 (8 valeurs)', 3, {'n': '8', 'p': '0.05'}, ['8', '8'],
             'incorrect'),
        spec('n = 20 : 20 et 21', 3, {'n': '20', 'p': '0.1'}, ['20', '21'], 'correct'),
    ],
)

# --- B2, TTECHNO-060 : triangle de Pascal ------------------------------------------------------

# Ligne n (5 ⩽ n ⩽ 9) écrite d'après des variables c1 … c9 (pas de {{eval}} dans un {{if}})
VARS_LIGNE = [var('c' + str(k), 'eval:binom(n,' + str(k) + ')') for k in range(1, 10)]
LIGNE_N = '$1$' + ''.join('{{if:n>=' + str(k) + '| ; ${{c' + str(k) + '}}$|}}'
                          for k in range(1, 10))

B2 = modele(
    'Triangle de Pascal : compléter une ligne',
    'Ligne suivante du triangle (n ⩽ 10), relation de Pascal sur deux coefficients donnés,'
    ' la relation qui construit le triangle',
    1, 60,
    [
        variation(
            'La ligne $n={{n}}$ du triangle de Pascal donne, dans l\'ordre, les coefficients'
            ' $' + binom_tex('{{n}}', '0') + '$, $' + binom_tex('{{n}}', '1') + '$, …, $'
            + binom_tex('{{n}}', '{{n}}') + '$ :\n\n' + LIGNE_N + '\n\n'
            'Donne les coefficients suivants de la ligne $n={{eval:n+1}}$.\n\n'
            '$' + binom_tex('{{eval:n+1}}', '1') + '=?$ ; $' + binom_tex('{{eval:n+1}}', '2')
            + '=?$ ; $' + binom_tex('{{eval:n+1}}', '3') + '=?$',
            [var('n', '5..9')] + VARS_LIGNE,
            ['{{eval:n+1}}', '{{eval:binom(n+1,2)}}', '{{eval:binom(n+1,3)}}'],
            ['Dans le triangle de Pascal, chaque coefficient est la somme des deux coefficients'
             ' situés au-dessus de lui : $' + binom_tex('n+1', 'k+1') + '=' + binom_tex('n', 'k')
             + '+' + binom_tex('n', 'k+1') + '$.',
             '$' + binom_tex('{{eval:n+1}}', '1') + '=1+{{n}}=' + col('{{eval:n+1}}') + '$ ;'
             ' $' + binom_tex('{{eval:n+1}}', '2') + '={{n}}+{{c2}}='
             + col('{{eval:binom(n+1,2)}}') + '$ ;'
             ' $' + binom_tex('{{eval:n+1}}', '3') + '={{c2}}+{{c3}}='
             + col('{{eval:binom(n+1,3)}}') + '$.'],
        ),
        variation(
            'On donne $' + binom_tex('{{n}}', '{{k}}') + '={{a}}$ et $'
            + binom_tex('{{n}}', '{{eval:k+1}}') + '={{b}}$.\n\n'
            'Sans autre calcul, donne $' + binom_tex('{{eval:n+1}}', '{{eval:k+1}}') + '$.\n\n'
            '$' + binom_tex('{{eval:n+1}}', '{{eval:k+1}}') + '=?$',
            [var('n', '5..9'), var('k', '1..3'), var('a', 'eval:binom(n,k)'),
             var('b', 'eval:binom(n,k+1)')],
            '{{eval:a+b}}',
            ['Relation de Pascal : $' + binom_tex('n+1', 'k+1') + '=' + binom_tex('n', 'k') + '+'
             + binom_tex('n', 'k+1') + '$. Dans le triangle, c\'est la somme des deux nombres'
             ' situés au-dessus.',
             '$' + binom_tex('{{eval:n+1}}', '{{eval:k+1}}') + '={{a}}+{{b}}='
             + col('{{eval:a+b}}') + '$.'],
        ),
        variation(
            'Dans le triangle de Pascal, quelle relation permet de calculer les coefficients d\'une'
            ' ligne à partir de ceux de la ligne précédente ?'
            + choix('$' + binom_tex('n+1', 'k+1') + '=' + binom_tex('n', 'k') + '\\times'
                    + binom_tex('n', 'k+1') + '$',
                    '$' + binom_tex('n+1', 'k') + '=' + binom_tex('n', 'k') + '+1$',
                    '$' + binom_tex('n+1', 'k+1') + '=' + binom_tex('n', 'k') + '+'
                    + binom_tex('n', 'k+1') + '$',
                    '$' + binom_tex('n+1', 'k+1') + '=' + binom_tex('n+1', 'k') + '+'
                    + binom_tex('n', 'k') + '$'),
            [], '2',
            ['Dans l\'arbre à $n+1$ épreuves, un chemin à $k+1$ succès commence par un succès'
             ' (il reste $k$ succès en $n$ épreuves) ou par un échec (il reste $k+1$ succès en'
             ' $n$ épreuves).',
             'D\'où la relation de Pascal ' + colt(binom_tex('n+1', 'k+1') + '='
                                                    + binom_tex('n', 'k') + '+'
                                                    + binom_tex('n', 'k+1'))
             + ' : chaque nombre du triangle est la somme des deux nombres situés au-dessus.'],
        ),
    ],
    [
        spec('n = 5 : 6, 15, 20', 0, {'n': '5'}, ['6', '15', '20'], 'correct'),
        spec('Erreur : recopie de la ligne n (5, 10, 10)', 0, {'n': '5'}, ['5', '10', '10'],
             'incorrect'),
        spec('n = 9 : 10, 45, 120', 0, {'n': '9'}, ['10', '45', '120'], 'correct'),
        spec('Erreur : n = 9, 10, 45, 84 (ligne 9 recopiée en 3e)', 0, {'n': '9'},
             ['10', '45', '84'], 'incorrect'),
        spec('n = 6, k = 2 : 15 + 20 = 35', 1, {'n': '6', 'k': '2', 'a': '15', 'b': '20'}, '35',
             'correct'),
        spec('Erreur : produit (300)', 1, {'n': '6', 'k': '2', 'a': '15', 'b': '20'}, '300',
             'incorrect'),
        spec('n = 9, k = 3 : 84 + 126 = 210', 1, {'n': '9', 'k': '3', 'a': '84', 'b': '126'},
             '210', 'correct'),
    ]
    + specs_choix(2, {}, 2, {0: 'produit', 1: 'plus un', 3: 'mauvaise ligne'}),
)

# --- B3, TTECHNO-061 : coefficients binomiaux au triangle (n ⩽ 10) -----------------------------

TRIANGLE_8 = ('| $n$ \\ $k$ | ' + ' | '.join('$' + str(k) + '$' for k in range(9)) + ' |\n'
              + '|' + '---|' * 10 + '\n'
              + ''.join('| $' + str(n) + '$ | '
                        + ' | '.join(('$' + str(comb(n, k)) + '$') if k <= n else ' '
                                     for k in range(9)) + ' |\n'
                        for n in range(9)))

B3 = modele(
    'Coefficients binomiaux au triangle de Pascal (n ⩽ 10)',
    'Lire un coefficient dans le triangle ; le calculer en construisant le triangle (n ⩽ 10) ;'
    ' valeurs particulières et symétrie',
    1, 60,
    [
        variation(
            'Voici le triangle de Pascal jusqu\'à la ligne $n=8$ ; la case de la ligne $n$ et de'
            ' la colonne $k$ contient $' + binom_tex('n', 'k') + '$.\n\n' + TRIANGLE_8
            + '\nDonne $' + binom_tex('{{n}}', '{{k}}') + '$.\n\n$'
            + binom_tex('{{n}}', '{{k}}') + '=?$',
            [var('n', '5..8'), var('k', '2..3')], '{{eval:binom(n,k)}}',
            ['On lit la ligne $n={{n}}$, colonne $k={{k}}$ (on compte les colonnes à partir de'
             ' $0$).',
             '$' + binom_tex('{{n}}', '{{k}}') + '=' + col('{{eval:binom(n,k)}}') + '$ : il y a'
             ' ${{eval:binom(n,k)}}$ chemins à ${{k}}$ succès dans l\'arbre à ${{n}}$ épreuves.'],
        ),
        variation(
            'En construisant le triangle de Pascal au brouillon, calcule $'
            + binom_tex('{{n}}', '{{k}}') + '$.\n\n$' + binom_tex('{{n}}', '{{k}}') + '=?$',
            [var('n', '9..10'), var('k', '2..4')], '{{eval:binom(n,k)}}',
            ['On construit les lignes une à une : chaque nombre est la somme des deux nombres'
             ' situés au-dessus, et chaque ligne commence et finit par $1$.',
             'Ligne $8$ : $1$ ; $8$ ; $28$ ; $56$ ; $70$ ; $56$ ; $28$ ; $8$ ; $1$.',
             'Ligne $9$ : $1$ ; $9$ ; $36$ ; $84$ ; $126$ ; $126$ ; $84$ ; $36$ ; $9$ ; $1$.',
             '{{if:n>=10|Ligne $10$ : $1$ ; $10$ ; $45$ ; $120$ ; $210$ ; $252$ ; $210$ ; $120$ ;'
             ' $45$ ; $10$ ; $1$.|On lit la ligne $9$.}}',
             '$' + binom_tex('{{n}}', '{{k}}') + '=' + col('{{eval:binom(n,k)}}') + '$.'],
        ),
        variation(
            'On donne $' + binom_tex('{{n}}', '{{k}}') + '={{c}}$.\n\n'
            'Sans calcul, donne les coefficients suivants.\n\n'
            '$' + binom_tex('{{n}}', '{{eval:n-k}}') + '=?$ ; $' + binom_tex('{{n}}', '0')
            + '=?$ ; $' + binom_tex('{{n}}', '1') + '=?$',
            [var('n', '6..10'), var('k', '2..3'), var('c', 'eval:binom(n,k)')],
            ['{{c}}', '1', '{{n}}'],
            ['Symétrie : choisir les ${{k}}$ épreuves réussies revient à choisir les'
             ' ${{eval:n-k}}$ épreuves ratées, donc $' + binom_tex('{{n}}', '{{eval:n-k}}') + '='
             + binom_tex('{{n}}', '{{k}}') + '=' + col('{{c}}') + '$ (la ligne du triangle se lit'
             ' de la même façon dans les deux sens).',
             '$' + binom_tex('{{n}}', '0') + '=' + col('1') + '$ : un seul chemin sans aucun'
             ' succès.',
             '$' + binom_tex('{{n}}', '1') + '=' + col('{{n}}') + '$ : le succès unique peut être'
             ' à n\'importe laquelle des ${{n}}$ épreuves.'],
        ),
    ],
    [
        spec('C(6, 2) = 15', 0, {'n': '6', 'k': '2'}, '15', 'correct'),
        spec('Erreur : décalage de colonne, C(6, 3) = 20', 0, {'n': '6', 'k': '2'}, '20',
             'incorrect'),
        spec('C(8, 3) = 56', 0, {'n': '8', 'k': '3'}, '56', 'correct'),
        spec('C(10, 4) = 210', 1, {'n': '10', 'k': '4'}, '210', 'correct'),
        spec('Erreur : C(10, 4) lu ligne 9 (126)', 1, {'n': '10', 'k': '4'}, '126', 'incorrect'),
        spec('C(9, 2) = 36', 1, {'n': '9', 'k': '2'}, '36', 'correct'),
        spec('n = 7, k = 2 : 21, 1, 7', 2, {'n': '7', 'k': '2', 'c': '21'}, ['21', '1', '7'],
             'correct'),
        spec('Erreur : C(n, 0) = 0', 2, {'n': '7', 'k': '2', 'c': '21'}, ['21', '0', '7'],
             'incorrect'),
        spec('n = 10, k = 3 : 120, 1, 10', 2, {'n': '10', 'k': '3', 'c': '120'},
             ['120', '1', '10'], 'correct'),
    ],
)

# --- B4, TTECHNO-067 : diagramme en bâtons de B(n ; p) -----------------------------------------


def barres_binomiale(n, titre):
    """Diagramme en bâtons de B(n ; p), probabilités en pourcentage au dixième."""
    lignes = ''.join(
        str(k) + ' = {{eval:round(1000*binom(' + str(n) + ',' + str(k) + ')*p^' + str(k)
        + '*(1-p)^' + str(n - k) + ')/10;d}} %\n' for k in range(n + 1))
    return ('```barres\ntitre: ' + titre + '\naxes: k ; P(X = k) en %\n' + lignes
            + 'taille: petite\n```')


B4 = modele(
    'Diagramme en bâtons d\'une loi binomiale',
    'Lire la valeur la plus probable sur le diagramme en bâtons de B(10 ; p) ; retrouver p d\'après'
    ' la forme du diagramme ; ligne Python qui calcule la hauteur d\'un bâton',
    2, 60,
    [
        variation(
            'La variable aléatoire $X$ suit la loi binomiale $\\mathcal{B}(10\\,;{{p}})$. Voici le'
            ' diagramme en bâtons de sa loi de probabilité (probabilités en pourcentage).\n\n'
            + barres_binomiale(10, 'Loi de X') + '\n\n'
            'Quelle valeur de $X$ est la plus probable ?\n\n$k=?$',
            [var('p', '0.2|0.3|0.4|0.6|0.7'), var('m', 'eval:floor(11*p)')], '{{m}}',
            ['Le bâton le plus haut est celui de la valeur la plus probable.',
             'Ici, c\'est le bâton de $k=' + col('{{m}}') + '$ :'
             ' $P(X={{m}})\\approx'
             ' {{eval:round(1000*binom(10,m)*p^m*(1-p)^(10-m))/10;d}}'
             '\\,\\%$.',
             'Il est proche de l\'espérance $10\\times{{p}}={{eval:10*p;d}}$ : les bâtons les'
             ' plus hauts sont autour de $np$.'],
        ),
        variation(
            'La variable aléatoire $X$ suit la loi binomiale $\\mathcal{B}(10\\,;p)$. Voici le'
            ' diagramme en bâtons de sa loi de probabilité (probabilités en pourcentage).\n\n'
            + barres_binomiale(10, 'Loi de X') + '\n\n'
            'Quelle est la valeur de $p$ ?'
            + choix('$p=0{,}2$', '$p=0{,}5$', '$p=0{,}8$'),
            [var('p', '0.2|0.5|0.8'), var('r', 'eval:round(p*10/3-2/3)')], '{{r}}',
            ['Les bâtons les plus hauts sont autour de l\'espérance $10p$.',
             'Le bâton le plus haut est celui de $k={{eval:round(10*p)}}$, donc'
             ' $10p\\approx{{eval:round(10*p)}}$ et ' + colt('p={{p}}') + '.',
             'Pour $p=0{,}5$, le diagramme est symétrique autour de $5$ ; pour $p=0{,}2$, les'
             ' bâtons hauts sont à gauche ; pour $p=0{,}8$, à droite.'],
        ),
        variation(
            'On veut tracer en Python le diagramme en bâtons de la loi $\\mathcal{B}(10\\,;p)$.'
            ' La liste `C` contient la ligne $10$ du triangle de Pascal.'
            '\n\n```python\nimport matplotlib.pyplot as plt\n\n'
            'C = [1, 10, 45, 120, 210, 252, 210, 120, 45, 10, 1]\n'
            'p = 0.3\nL = []\nfor k in range(11):\n    L.append(...)\n'
            'plt.bar(range(11), L)\nplt.show()\n```\n\n'
            'Que faut-il écrire à la place des points de suspension ?'
            + choix('`C[k] * p**k * (1-p)**k`', '`p**k * (1-p)**(10-k)`',
                    '`C[k] * p**k * (1-p)**(10-k)`', '`C[k] * k**p * (1-p)**(10-k)`'),
            [], '2',
            ['La hauteur du bâton $k$ est $P(X=k)=' + binom_tex('10', 'k') + 'p^k(1-p)^{10-k}$ :'
             ' le nombre de chemins à $k$ succès, fois la probabilité d\'un tel chemin.',
             'En Python : `C[k] * p**k * (1-p)**(10-k)`, la ' + colt('\\text{troisième}')
             + ' proposition.',
             'Sans `C[k]`, on n\'aurait que la probabilité d\'un seul chemin ; un chemin à $k$'
             ' succès a $10-k$ échecs, pas $k$.'],
        ),
    ],
    [
        spec('p = 0,3 : k = 3', 0, {'p': '0.3', 'm': '3'}, '3', 'correct'),
        spec('Erreur : p = 0,3, k = 2', 0, {'p': '0.3', 'm': '3'}, '2', 'incorrect'),
        spec('p = 0,7 : k = 7', 0, {'p': '0.7', 'm': '7'}, '7', 'correct'),
        spec('p = 0,2 : k = 2', 0, {'p': '0.2', 'm': '2'}, '2', 'correct'),
    ]
    + specs_choix(1, {'p': '0.2', 'r': '0'}, 0, {1: 'symétrique', 2: 'à droite'})
    + specs_choix(1, {'p': '0.8', 'r': '2'}, 2, {0: 'à gauche', 1: 'symétrique'})
    + specs_choix(2, {}, 2, {0: 'échecs', 1: 'sans le coefficient', 3: 'k puissance p'}),
    shared=DECIMAL,
)

# --- B5, TTECHNO-090 : simulation et loi binomiale --------------------------------------------

SIMULATION_B5 = (
    'En première, on a simulé ${{nb}}$ échantillons de taille ${{n}}$ d\'une loi de Bernoulli de'
    ' paramètre ${{p}}$ (des $1$ avec la probabilité ${{p}}$, des $0$ sinon) et compté, dans chaque'
    ' échantillon, le nombre de $1$. Le tableau donne, pour chaque nombre $k$ de $1$, l\'effectif'
    ' et la fréquence observés, et la probabilité $P(X=k)$ pour $X$ de loi'
    ' $\\mathcal{B}({{n}}\\,;{{p}})$.\n\n'
    '```simulation\nX ~ B({{n}} ; {{eval:p;d}})\ntirages: {{nb}}\ngraine: {{g}}\n```\n\n'
)
VARS_B5 = [var('n', '5..8'), var('p', '0.2|0.3|0.4|0.5'), var('nb', '200|500'),
           var('g', '1..30')]

B5 = modele(
    'Simulation d\'échantillons et loi binomiale',
    'Le nombre de 1 d\'un échantillon de Bernoulli suit B(n ; p) ; fréquences observées et'
    ' probabilités quand le nombre d\'échantillons grandit ; compter les 1 en Python',
    2, 60,
    [
        variation(
            SIMULATION_B5 + 'Quelle loi suit le nombre de $1$ d\'un échantillon de taille ${{n}}$ ?'
            + choix('$\\mathcal{B}({{n}}\\,;{{p}})$', '$\\mathcal{B}({{nb}}\\,;{{p}})$',
                    'la loi de Bernoulli de paramètre ${{p}}$', '$\\mathcal{B}({{p}}\\,;{{n}})$'),
            VARS_B5, '0',
            ['Un échantillon, c\'est ${{n}}$ épreuves de Bernoulli identiques et indépendantes,'
             ' de succès « obtenir $1$ », de probabilité ${{p}}$.',
             'Le nombre de $1$ compte les succès : il suit la loi '
             + colt('\\mathcal{B}({{n}}\\,;{{p}})') + '. Le nombre ${{nb}}$ d\'échantillons'
             ' n\'est pas un paramètre de la loi : c\'est le nombre de répétitions de la'
             ' simulation.'],
        ),
        variation(
            SIMULATION_B5 + 'Si l\'on simule beaucoup plus d\'échantillons (par exemple'
            ' $10\\,000$), que deviennent en général les fréquences observées ?'
            + choix('Elles deviennent toutes égales.',
                    'Elles se rapprochent des probabilités $P(X=k)$.',
                    'Elles s\'éloignent des probabilités $P(X=k)$.',
                    'Elles deviennent toutes égales à ${{p}}$.'),
            VARS_B5, '1',
            ['Avec ${{nb}}$ échantillons, les fréquences observées sont déjà proches des'
             ' probabilités, avec des écarts dus au hasard.',
             'Plus on simule d\'échantillons, plus ces écarts sont faibles en général : les'
             ' fréquences observées ' + colt('\\text{se rapprochent des probabilités}')
             + ' $P(X=k)$ de la loi $\\mathcal{B}({{n}}\\,;{{p}})$.',
             'Le diagramme des fréquences observées ressemble alors de plus en plus au diagramme'
             ' en bâtons de la loi binomiale.'],
        ),
        variation(
            'La fonction Python `nombre_de_1` simule un échantillon de taille `n` d\'une loi de'
            ' Bernoulli de paramètre `p` et renvoie le nombre de $1$ obtenus (`random()` renvoie'
            ' un nombre au hasard entre $0$ et $1$).'
            '\n\n```python\nfrom random import random\n\ndef nombre_de_1(n, p):\n    c = 0\n'
            '    for k in range(n):\n        ...\n            c = c + 1\n    return c\n```\n\n'
            'Que faut-il écrire à la place des points de suspension ?'
            + choix('`if random() > p:`', '`if random() == p:`', '`if p < 1:`',
                    '`if random() < p:`'),
            [], '3',
            ['`random()` tombe dans $[0\\,;p[$ avec la probabilité $p$ : la condition'
             ' `random() < p` est vraie avec la probabilité $p$, c\'est le tirage d\'un $1$.',
             'La ligne est `if random() < p:`, la ' + colt('\\text{quatrième}') + ' proposition :'
             ' `c` compte alors les $1$ de l\'échantillon, qui suit la loi'
             ' $\\mathcal{B}(n\\,;p)$.',
             '`random() > p` donnerait un $1$ avec la probabilité $1-p$ ; `random() == p` ne'
             ' serait presque jamais vrai ; `p < 1` serait toujours vrai.'],
        ),
    ],
    specs_choix(0, {'n': '6', 'p': '0.3', 'nb': '200', 'g': '4'}, 0,
                {1: 'N au lieu de n', 2: 'Bernoulli', 3: 'paramètres inversés'})
    + specs_choix(1, {'n': '5', 'p': '0.5', 'nb': '500', 'g': '11'}, 1,
                  {0: 'loi uniforme', 2: 'contresens', 3: 'p'})
    + specs_choix(2, {}, 3, {0: 'probabilité 1 − p', 1: 'égalité', 2: 'toujours vrai'}),
)

# --- B6, TTECHNO-069 : représenter l'espérance quand n ou p varie -------------------------------

B6 = modele(
    'Représenter l\'espérance de B(n ; p) quand n ou p varie',
    'Placer les points (n ; np) à p fixé ; ils sont alignés sur une droite passant par l\'origine ;'
    ' n fixé et p variable ; formule de tableur',
    2, 90,
    [
        variation(
            'Pour $p={{p}}$ fixé, on note $E_n$ l\'espérance de la loi'
            ' $\\mathcal{B}(n\\,;{{p}})$. Place les points $A$, $B$, $C$, $D$ et $F$ de'
            ' coordonnées $(n\\,;E_n)$ pour $n=10$, $20$, $30$, $40$ et $50$.\n\n'
            '```courbe\nx: -5 ; 55\ny: -1 ; 21\ngrille: 5 ; 1\n'
            'axes: x = n ; y = espérance\n'
            'placer: A=(10 ; {{eval:round(10*p)}}) ; B=(20 ; {{eval:round(20*p)}}) ;'
            ' C=(30 ; {{eval:round(30*p)}}) ; D=(40 ; {{eval:round(40*p)}}) ;'
            ' F=(50 ; {{eval:round(50*p)}})\n'
            'taille: moyenne\n'
            'description: Repère : n de −5 à 55 de 5 en 5, espérance de −1 à 21 de 1 en 1.\n'
            '```',
            [var('p', '0.1|0.2|0.3|0.4')], None,
            ['L\'espérance de $\\mathcal{B}(n\\,;p)$ est $np$ : $E_n={{p}}\\,n$.',
             '$E_{10}={{eval:round(10*p)}}$, $E_{20}={{eval:round(20*p)}}$,'
             ' $E_{30}={{eval:round(30*p)}}$, $E_{40}={{eval:round(40*p)}}$,'
             ' $E_{50}={{eval:round(50*p)}}$.',
             '```courbe\nx: -5 ; 55\ny: -1 ; 21\ngrille: 5 ; 1\n'
             'axes: x = n ; y = espérance\n'
             'points: A(10 ; {{eval:round(10*p)}}), B(20 ; {{eval:round(20*p)}}),'
             ' C(30 ; {{eval:round(30*p)}}), D(40 ; {{eval:round(40*p)}}),'
             ' F(50 ; {{eval:round(50*p)}})\n'
             'taille: moyenne\n'
             'description: Les cinq points (n ; np), alignés avec l\'origine.\n```',
             'Les points sont alignés sur la droite d\'équation $y={{p}}\\,x$, qui passe par'
             ' l\'origine.'],
        ),
        variation(
            'Pour $p={{p}}$ fixé, on représente dans un repère les points $(n\\,;E_n)$, où $E_n$'
            ' est l\'espérance de la loi $\\mathcal{B}(n\\,;{{p}})$, pour $n$ allant de $1$ à'
            ' $50$. Comment sont placés ces points ?'
            + choix('Sur une droite passant par l\'origine, de coefficient directeur ${{p}}$.',
                    'Sur une droite passant par l\'origine, de coefficient directeur $n$.',
                    'Sur une courbe qui n\'est pas une droite.',
                    'Sur une droite horizontale d\'ordonnée ${{p}}$.'),
            [var('p', '0.1|0.2|0.25|0.4|0.6')], '0',
            ['L\'espérance de $\\mathcal{B}(n\\,;{{p}})$ est $E_n={{p}}\\times n$ : elle est'
             ' proportionnelle à $n$.',
             'Les points $(n\\,;{{p}}\\,n)$ sont donc sur la droite d\'équation $y={{p}}\\,x$ :'
             ' ' + colt('\\text{une droite passant par l\'origine, de coefficient directeur }{{p}}')
             + '.'],
        ),
        variation(
            'Pour $n={{n}}$ fixé, on représente l\'espérance de la loi $\\mathcal{B}({{n}}\\,;p)$'
            ' en fonction de $p$, pour $p$ allant de $0$ à $1$ : les points obtenus sont sur une'
            ' droite passant par l\'origine.\n\nQuel est son coefficient directeur ? Quelle est'
            ' l\'espérance pour $p={{q}}$ ?\n\nCoefficient directeur : $?$\n\n'
            'Espérance pour $p={{q}}$ : $?$',
            [var('n', '10|20|25|40|50'), var('q', '0.2|0.4|0.6')],
            ['{{n}}', '{{eval:n*q;d}}'],
            ['L\'espérance de $\\mathcal{B}({{n}}\\,;p)$ est ${{n}}\\,p$ : c\'est une fonction'
             ' linéaire de $p$, de coefficient ' + colt('{{n}}') + '.',
             'Pour $p={{q}}$ : ${{n}}\\times{{q}}=' + col('{{eval:n*q;d}}') + '$.'],
        ),
        variation(
            'Dans une feuille de calcul, on veut l\'espérance de la loi $\\mathcal{B}(n\\,;p)$'
            ' pour $n$ allant de $1$ à $50$. Les valeurs de $n$ sont en colonne A (à partir de la'
            ' ligne 2) et $p$ est dans la cellule D1.\n\n'
            '|   | A | B | C | D |\n|---|---|---|---|---|\n| 1 | n | espérance |   | 0,3 |\n'
            '| 2 | 1 |   |   |   |\n| 3 | 2 |   |   |   |\n\n'
            'Quelle formule écrire en B2, pour la recopier ensuite vers le bas ?'
            + choix('=A2*D1', '=A2+\\$D\\$1', '=A2*\\$D\\$1', '=\\$A\\$2*\\$D\\$1'),
            [], '2',
            ['L\'espérance de $\\mathcal{B}(n\\,;p)$ est $np$ : en ligne 2, c\'est A2 × D1.',
             'En recopiant vers le bas, A2 doit devenir A3, A4… (c\'est voulu) mais D1 doit rester'
             ' D1 : on la bloque avec des « \\$ ».',
             'La formule est « =A2*\\$D\\$1 », la ' + colt('\\text{troisième}') + ' proposition.'
             ' On trace ensuite le nuage des colonnes A et B : les points sont alignés avec'
             ' l\'origine.'],
        ),
    ],
    [
        spec('p = 0,2 : 2, 4, 6, 8, 10', 0, {'p': '0.2'}, ['10;2', '20;4', '30;6', '40;8', '50;10'],
             'correct'),
        spec('Erreur : n/p au lieu de np', 0, {'p': '0.2'},
             ['10;5', '20;10', '30;15', '40;20', '50;25'], 'incorrect'),
        spec('p = 0,4 : 4, 8, 12, 16, 20', 0, {'p': '0.4'},
             ['10;4', '20;8', '30;12', '40;16', '50;20'], 'correct'),
    ]
    + specs_choix(1, {'p': '0.25'}, 0, {1: 'coefficient n', 2: 'courbe', 3: 'horizontale'})
    + [
        spec('n = 20, p = 0,4 : 20 et 8', 2, {'n': '20', 'q': '0.4'}, ['20', '8'], 'correct'),
        spec('Erreur : coefficient p', 2, {'n': '20', 'q': '0.4'}, ['0,4', '8'], 'incorrect'),
        spec('n = 25, p = 0,6 : 25 et 15', 2, {'n': '25', 'q': '0.6'}, ['25', '15'], 'correct'),
        spec('n = 25, p = 0,2 : 25 et 5', 2, {'n': '25', 'q': '0.2'}, ['25', '5'], 'correct'),
    ]
    + specs_choix(3, {}, 2, {0: 'sans $', 1: 'somme', 3: 'A bloquée'}),
    shared=DECIMAL,
)

# --- B7, TTECHNO-091 : espérance, le lien avec np ----------------------------------------------

B7 = modele(
    'Espérance de la loi binomiale : le lien avec np',
    'Calculer Σ k·P(X = k) sur la loi de B(3 ou 4 ; p) et comparer à np ; moyenne d\'une'
    ' simulation ; boucle Python de l\'espérance',
    2, 90,
    [
        variation(
            'La variable aléatoire $X$ suit la loi binomiale $\\mathcal{B}({{n}}\\,;{{p}})$. Voici'
            ' sa loi de probabilité.\n\n'
            '```loi\nX ~ B({{n}} ; {{eval:p;d}})\narrondi: 4\n```\n\n'
            'Calcule l\'espérance $\\displaystyle E(X)=\\sum_k k\\,P(X=k)$, puis le produit'
            ' ${{n}}\\times{{p}}$.\n\n$E(X)=?$\n\n${{n}}\\times{{p}}=?$',
            [var('n', '3..4'), var('p', '0.1|0.2|0.5')],
            ['{{eval:n*p;d}}', '{{eval:n*p;d}}'],
            ['$E(X)=0\\times P(X=0)+1\\times P(X=1)+\\cdots+{{n}}\\times P(X={{n}})$.',
             'Avec les valeurs du tableau, la somme vaut $E(X)=' + col('{{eval:n*p;d}}') + '$.',
             'Et ${{n}}\\times{{p}}=' + col('{{eval:n*p;d}}') + '$ : on retrouve l\'expression'
             ' admise $E(X)=np$.'],
        ),
        variation(
            'La variable aléatoire $X$ suit la loi binomiale $\\mathcal{B}({{n}}\\,;{{p}})$. On'
            ' simule ${{nb}}$ valeurs de $X$ et on trace la moyenne des valeurs obtenues en fonction'
            ' du nombre de tirages.\n\n'
            '```simulation\nX ~ B({{n}} ; {{eval:p;d}})\nmode: moyenne\ntirages: {{nb}}\n'
            'graine: {{g}}\n```\n\n'
            'De quel nombre la moyenne se rapproche-t-elle quand le nombre de tirages augmente ?'
            + choix('${{n}}$', '${{p}}$', '${{n}}\\times{{p}}$', '${{n}}+{{p}}$'),
            [var('n', '10|20|25'), var('p', '0.2|0.3|0.5'), var('nb', '500|1000'),
             var('g', '1..30')], '2',
            ['Quand le nombre de tirages augmente, la moyenne des valeurs simulées se rapproche'
             ' de l\'espérance de $X$.',
             'Pour la loi $\\mathcal{B}({{n}}\\,;{{p}})$, l\'espérance est'
             ' ' + colt('{{n}}\\times{{p}}') + '$={{eval:n*p;d}}$ : c\'est la droite'
             ' horizontale du graphique.'],
        ),
        variation(
            'La liste Python `L` contient les probabilités $P(X=0)$, $P(X=1)$, …, $P(X=n)$ d\'une'
            ' variable aléatoire $X$ de loi $\\mathcal{B}(n\\,;p)$. La fonction `esperance` doit'
            ' renvoyer $\\displaystyle\\sum_k k\\,P(X=k)$.'
            '\n\n```python\ndef esperance(L):\n    s = 0\n    for k in range(len(L)):\n'
            '        s = ...\n    return s\n```\n\n'
            'Que faut-il écrire à la place des points de suspension ?'
            + choix('`s + L[k]`', '`s + k*L[k]`', '`k*L[k]`', '`s + k + L[k]`'),
            [], '1',
            ['À chaque tour, on ajoute à `s` le terme $k\\,P(X=k)$, c\'est-à-dire `k*L[k]`.',
             'La ligne est `s = s + k*L[k]`, la ' + colt('\\text{deuxième}') + ' proposition.'
             ' Pour toute loi binomiale, la fonction renvoie $np$ (aux arrondis près).',
             '`s + L[k]` additionne les probabilités (on obtient $1$) ; `k*L[k]` seul oublie les'
             ' termes précédents.'],
        ),
    ],
    [
        spec('n = 3, p = 0,5 : 1,5 et 1,5', 0, {'n': '3', 'p': '0.5'}, ['1,5', '1,5'], 'correct'),
        spec('Erreur : somme des probabilités (1)', 0, {'n': '3', 'p': '0.5'}, ['1', '1,5'],
             'incorrect'),
        spec('n = 4, p = 0,2 : 0,8 et 0,8', 0, {'n': '4', 'p': '0.2'}, ['0,8', '0,8'], 'correct'),
        spec('n = 4, p = 0,1 : 0,4 et 0,4', 0, {'n': '4', 'p': '0.1'}, ['0,4', '0,4'], 'correct'),
    ]
    + specs_choix(1, {'n': '20', 'p': '0.3', 'nb': '500', 'g': '7'}, 2,
                  {0: 'n', 1: 'p', 3: 'somme'})
    + specs_choix(2, {}, 1, {0: 'somme des probabilités', 2: 'oubli de s', 3: 'somme'}),
    shared=DECIMAL,
)

MODELES = [('01-loi-binomiale-ce-que-compte-x', B1),
           ('02-triangle-de-pascal', B2),
           ('03-coefficients-au-triangle', B3),
           ('04-diagramme-en-batons', B4),
           ('05-simulation-et-loi-binomiale', B5),
           ('06-esperance-n-ou-p-variable', B6),
           ('07-esperance-lien-avec-np', B7)]

os.makedirs(DOSSIER, exist_ok=True)
for nom, mod in MODELES:
    chemin = os.path.join(DOSSIER, nom + '.json')
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(mod, f, ensure_ascii=False, indent='\t')
        f.write('\n')
    print('écrit', chemin)
