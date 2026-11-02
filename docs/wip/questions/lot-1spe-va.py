"""Écrit les 8 modèles du lot « variables aléatoires : notations et registres » de la 1re spé
dans scripts/questions/1spe-va/.

Phase 0 validée par David le 2026-11-02 (« je valide » sur les recos, § 22 du journal
« docs/wip/questions-1spe-progress.md », D28), un point par modèle :

| # | Point    | Titre                                         | Catégorie, niveau                                |
| 1 | 1SPE-347 | Image d'une issue par une variable aléatoire  | Modéliser par une variable aléatoire, 1          |
| 2 | 1SPE-354 | Valeurs possibles d'une variable aléatoire    | Modéliser par une variable aléatoire, 2          |
| 3 | 1SPE-428 | Événements {X = a} et {X ⩽ a}                 | Loi d'une variable aléatoire, 5                  |
| 4 | 1SPE-429 | De la phrase à la notation                    | Notations, 1                                     |
| 5 | 1SPE-430 | De la notation à la phrase                    | Notations, 2                                     |
| 6 | 1SPE-352 | Variance par la formule de König-Huygens      | Variance et écart-type, 4                        |
| 7 | 1SPE-363 | Fonction Python : moyenne d'un échantillon    | Échantillons et simulation, 1                    |
| 8 | 1SPE-364 | Écart entre moyenne d'un échantillon et E(X)  | Échantillons et simulation, 2                    |

Domaine « Variables aléatoires » (celui du lot 0) ; trois catégories neuves (relevé prod du
2026-11-02, tous niveaux scolaires confondus) ; « Loi d'une variable aléatoire » a les niveaux 1-4,
« Variance et écart-type » 1-3.

Voisins à ne pas répéter : 570f91d5 (P(X ⩾ a) lue dans la loi), 97b3a376 (probabilité depuis un
énoncé), 2af6296f (variance par la définition, König-Huygens en « autre méthode »).

Décisions (David, 2026-11-02) : Q1 trois catégories neuves ; Q2 364 en texte (moyenne de
l'échantillon donnée, la simulation reste aux exercices Python) ; Q3 352 traité ici en
savoir-faire ; Q4 question d'accès : personne.

Bornes : « lycee/1spe.json » (univers fini ; notations {X = a}, {X ⩽ a}, P(X = a), P(X ⩽ a) ;
V(X) = E(X²) − E(X)² ; fonction Python de moyenne d'un échantillon de taille n).

    python3 docs/wip/questions/lot-1spe-va.py scripts/questions/1spe-va
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


def modele(nom, title, description, subdomain, level, variations, specs, delay=60):
    return nom, {'title': title, 'description': description, 'grades': ['1_SPE'],
                 'theme': 'Probabilités', 'domain': 'Variables aléatoires',
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


def colt(x, k=0):
    """Réponse colorée dans le texte (hors formule)."""
    return '$' + col(x, k) + '$'


def ev(x):
    return '{{eval:' + x + '}}'


def evd(x):
    return '{{eval:' + x + ';d}}'


def evp(x):
    """Valeur entre parenthèses si négative."""
    return '{{eval:' + x + ';()}}'


def choix(lignes):
    return '\n\n```choix\n' + ''.join('- ' + l + '\n' for l in lignes) + '```'


MODELES = []

# --- 1. 1SPE-347 : image d'une issue par X ------------------------------------------------------

ENONCE_PIECES = (
    'On lance deux pièces équilibrées et on note les faces obtenues, dans l\'ordre ($P$ : pile,'
    ' $F$ : face). L\'univers est $\\Omega=\\{(P\\,;P)\\,;(P\\,;F)\\,;(F\\,;P)\\,;(F\\,;F)\\}$.\n\n'
    'Chaque pile obtenu fait gagner $' + ev('a') + '$ € au joueur et chaque face lui fait perdre $'
    + ev('b') + '$ €. On note $X$ la variable aléatoire qui, à chaque issue, associe le gain'
    ' algébrique du joueur, en euros.')
VARS_PIECES = [var('a', '2..9'), var('b', '1..6')]
COND_PIECES = ['a != b']

V347_PF = variation(
    ENONCE_PIECES + '\n\n$X\\big((P\\,;F)\\big)=?$', VARS_PIECES, [ev('a-b')],
    ['$X$ est une fonction définie sur l\'univers : elle associe un nombre réel à chaque issue.',
     'L\'issue $(P\\,;F)$ compte un pile et une face : $X\\big((P\\,;F)\\big)=' + ev('a') + '-'
     + ev('b') + '=' + col(ev('a-b')) + '$.'], COND_PIECES)
V347_FF = variation(
    ENONCE_PIECES + '\n\n$X\\big((F\\,;F)\\big)=?$', VARS_PIECES, [ev('-2*b')],
    ['$X$ est une fonction définie sur l\'univers : elle associe un nombre réel à chaque issue.',
     'L\'issue $(F\\,;F)$ compte deux faces : le joueur perd $2\\times' + ev('b') + '=' + ev('2*b')
     + '$ €, donc $X\\big((F\\,;F)\\big)=' + col(ev('-2*b')) + '$.'], COND_PIECES)
V347_DE = variation(
    'On lance un dé équilibré à six faces, puis une pièce équilibrée. Une issue s\'écrit $(n\\,;P)$'
    ' ou $(n\\,;F)$, où $n$ est le numéro du dé.\n\nOn note $X$ la variable aléatoire qui, à chaque'
    ' issue, associe : le double du numéro si la pièce tombe sur pile ; le numéro diminué de $'
    + ev('c') + '$ si elle tombe sur face.\n\n$X\\big((' + ev('n') + '\\,;F)\\big)=?$',
    [var('n', '1..6'), var('c', '2..5')], [ev('n-c')],
    ['La pièce tombe sur face : $X$ associe à cette issue le numéro diminué de $' + ev('c') + '$.',
     '$X\\big((' + ev('n') + '\\,;F)\\big)=' + ev('n') + '-' + ev('c') + '=' + col(ev('n-c'))
     + '$.'], ['n != c'])
V347_FONCTION = variation(
    'On lance deux dés et on note $X$ la somme des numéros obtenus. Quelle phrase décrit'
    ' correctement la variable aléatoire $X$ ?'
    + choix(['$X$ est une fonction qui, à chaque issue de l\'univers, associe un nombre réel.',
             '$X$ est la probabilité d\'obtenir une somme donnée.',
             '$X$ est un événement de l\'univers.',
             '$X$ est l\'ensemble des issues de l\'expérience.']),
    [], ['0'],
    ['Une variable aléatoire est une **fonction** définie sur l\'univers $\\Omega$, à valeurs'
     ' réelles : à l\'issue « $(2\\,;5)$ », par exemple, $X$ associe le nombre $7$.',
     'Ce n\'est ni une probabilité (un nombre entre $0$ et $1$), ni un événement (une partie de'
     ' $\\Omega$), ni l\'univers lui-même : ' + colt('X \\text{ est une fonction}') + '.'])

MODELES.append(modele(
    '01-image-d-une-issue', 'Image d\'une issue par une variable aléatoire',
    'Variable aléatoire comme fonction de l\'univers : gain associé à une issue (deux pièces, dé'
    ' et pièce) ; reconnaître la définition d\'une variable aléatoire',
    'Modéliser par une variable aléatoire', 1,
    [V347_PF, V347_FF, V347_DE, V347_FONCTION],
    [spec('X(P;F) = 5 − 3', 0, {'a': 5, 'b': 3}, '2', 'correct'),
     spec('Erreur : 5 + 3', 0, {'a': 5, 'b': 3}, '8', 'incorrect'),
     spec('X(P;F) négatif : 2 − 6', 0, {'a': 2, 'b': 6}, '-4', 'correct'),
     spec('X(F;F) = −2 × 3', 1, {'a': 5, 'b': 3}, '-6', 'correct'),
     spec('Erreur : signe oublié', 1, {'a': 5, 'b': 3}, '6', 'incorrect'),
     spec('X(4;F) = 4 − 3', 2, {'n': 4, 'c': 3}, '1', 'correct'),
     spec('Erreur : règle de pile', 2, {'n': 4, 'c': 3}, '8', 'incorrect'),
     spec('Fonction', 3, {}, '0', 'correct'),
     spec('Erreur : probabilité', 3, {}, '1', 'incorrect'),
     spec('Erreur : événement', 3, {}, '2', 'incorrect')]))

# --- 2. 1SPE-354 : valeurs possibles de X -------------------------------------------------------

DEMANDE_VALEURS = ('\n\nDonne les valeurs possibles de $X$, rangées dans l\'ordre croissant.\n\n'
                   '$?$ ; $?$ ; $?$')

V354_PIECES = variation(
    'On lance deux pièces équilibrées. Chaque pile obtenu fait gagner $' + ev('a') + '$ € au'
    ' joueur et chaque face lui fait perdre $' + ev('b') + '$ €. On note $X$ le gain algébrique du'
    ' joueur, en euros.' + DEMANDE_VALEURS,
    VARS_PIECES, [ev('-2*b'), ev('a-b'), ev('2*a')],
    ['Le joueur peut obtenir deux faces, un pile et une face (dans un ordre ou dans l\'autre), ou'
     ' deux piles.',
     'Deux faces : $X=-2\\times' + ev('b') + '=' + ev('-2*b') + '$. Un pile et une face : $X='
     + ev('a') + '-' + ev('b') + '=' + ev('a-b') + '$. Deux piles : $X=2\\times' + ev('a') + '='
     + ev('2*a') + '$.',
     'Dans l\'ordre croissant : $' + col(ev('-2*b')) + '$ ; $' + col(ev('a-b')) + '$ ; $'
     + col(ev('2*a')) + '$.'], COND_PIECES)
V354_URNE = variation(
    'Pour jouer, on paie $' + ev('m') + '$ €, puis on tire une boule au hasard dans une urne qui'
    ' contient des boules rouges, vertes et noires. Une boule rouge rapporte $' + ev('a') + '$ €,'
    ' une boule verte rapporte $' + ev('c') + '$ €, une boule noire ne rapporte rien. On note $X$'
    ' le gain algébrique du joueur (ce qu\'il reçoit moins sa mise), en euros.' + DEMANDE_VALEURS,
    [var('m', '2..5'), var('c', '1..6'), var('a', '5..15')],
    [ev('-m'), ev('c-m'), ev('a-m')],
    ['Le gain algébrique tient compte de la mise, payée dans tous les cas.',
     'Boule noire : $X=0-' + ev('m') + '=' + ev('-m') + '$. Boule verte : $X=' + ev('c') + '-'
     + ev('m') + '=' + ev('c-m') + '$. Boule rouge : $X=' + ev('a') + '-' + ev('m') + '='
     + ev('a-m') + '$.',
     'Dans l\'ordre croissant : $' + col(ev('-m')) + '$ ; $' + col(ev('c-m')) + '$ ; $'
     + col(ev('a-m')) + '$.'], ['c < a', 'c != m'])
V354_DE = variation(
    'On lance un dé équilibré à six faces. Si l\'on obtient $6$, on gagne $' + ev('a') + '$ € ; si'
    ' l\'on obtient $4$ ou $5$, on gagne $' + ev('b') + '$ € ; sinon, on perd $' + ev('c') + '$ €.'
    ' On note $X$ le gain algébrique, en euros.' + DEMANDE_VALEURS,
    [var('a', '6..12'), var('b', '1..5'), var('c', '1..5')],
    [ev('-c'), ev('b'), ev('a')],
    ['Trois cas : $6$ ; $4$ ou $5$ ; $1$, $2$ ou $3$. Perdre $' + ev('c') + '$ € correspond à'
     ' $X=' + ev('-c') + '$.',
     'Dans l\'ordre croissant : $' + col(ev('-c')) + '$ ; $' + col(ev('b')) + '$ ; $'
     + col(ev('a')) + '$.'])

MODELES.append(modele(
    '02-valeurs-possibles', 'Valeurs possibles d\'une variable aléatoire',
    'Modéliser une situation par une variable aléatoire et donner ses valeurs possibles, dans'
    ' l\'ordre croissant (deux pièces, urne avec mise, dé)',
    'Modéliser par une variable aléatoire', 2,
    [V354_PIECES, V354_URNE, V354_DE],
    [spec('−6 ; 2 ; 10', 0, {'a': 5, 'b': 3}, ['-6', '2', '10'], 'correct'),
     spec('Erreur : ordre décroissant', 0, {'a': 5, 'b': 3}, ['10', '2', '-6'], 'incorrect'),
     spec('Erreur : gain de 2 faces positif', 0, {'a': 5, 'b': 3}, ['2', '6', '10'],
          'incorrect'),
     spec('−3 ; 1 ; 7', 1, {'m': 3, 'c': 4, 'a': 10}, ['-3', '1', '7'], 'correct'),
     spec('Erreur : mise oubliée', 1, {'m': 3, 'c': 4, 'a': 10}, ['0', '4', '10'], 'incorrect'),
     spec('−2 ; 3 ; 8', 2, {'a': 8, 'b': 3, 'c': 2}, ['-2', '3', '8'], 'correct'),
     spec('Erreur : perte positive', 2, {'a': 8, 'b': 3, 'c': 2}, ['2', '3', '8'], 'incorrect')]))

# --- 3. 1SPE-428 : événements {X = a} et {X ⩽ a} ------------------------------------------------

ENONCE_DES = (
    'On lance deux dés équilibrés à quatre faces, numérotées de $1$ à $4$. L\'univers compte $16$'
    ' issues équiprobables. On note $X$ la somme des deux numéros obtenus.')
TABLE_SOMMES = (
    '\n\n| $+$ | $1$ | $2$ | $3$ | $4$ |\n|---|---|---|---|---|\n'
    '| $1$ | $2$ | $3$ | $4$ | $5$ |\n| $2$ | $3$ | $4$ | $5$ | $6$ |\n'
    '| $3$ | $4$ | $5$ | $6$ | $7$ |\n| $4$ | $5$ | $6$ | $7$ | $8$ |')
DEMANDE_428 = ('\n\n' + CONSIGNE + '\n\nNombre d\'issues : $?$\n\n')

V428_EGAL = variation(
    ENONCE_DES + ' On s\'intéresse à l\'événement $\\{X=' + ev('s') + '\\}$.' + DEMANDE_428
    + '$P(X=' + ev('s') + ')=?$',
    [var('s', '3..7')], [ev('4-abs(s-5)'), ev('(4-abs(s-5))/16')],
    ['L\'événement $\\{X=' + ev('s') + '\\}$ est formé des issues dont la somme vaut $' + ev('s')
     + '$. On les compte dans le tableau des sommes :' + TABLE_SOMMES,
     'La somme $' + ev('s') + '$ apparaît $' + col(ev('4-abs(s-5)')) + '$ fois.',
     'Les issues sont équiprobables : $P(X=' + ev('s') + ')=\\dfrac{' + ev('4-abs(s-5)')
     + '}{16}=' + col(ev('(4-abs(s-5))/16')) + '$.'])
V428_INF_DES = variation(
    ENONCE_DES + ' On s\'intéresse à l\'événement $\\{X\\leqslant ' + ev('s') + '\\}$.'
    + DEMANDE_428 + '$P(X\\leqslant ' + ev('s') + ')=?$',
    [var('s', '3..5')], [ev('s*(s-1)/2'), ev('s*(s-1)/32')],
    ['L\'événement $\\{X\\leqslant ' + ev('s') + '\\}$ est formé des issues dont la somme vaut'
     ' **au plus** $' + ev('s') + '$ : $' + ev('s') + '$ compris. On les compte dans le tableau'
     ' des sommes :' + TABLE_SOMMES,
     'Les sommes inférieures ou égales à $' + ev('s') + '$ apparaissent en tout $'
     + col(ev('s*(s-1)/2')) + '$ fois.',
     'Les issues sont équiprobables : $P(X\\leqslant ' + ev('s') + ')=\\dfrac{' + ev('s*(s-1)/2')
     + '}{16}=' + col(ev('s*(s-1)/32')) + '$.'])
V428_INF_PIECES = variation(
    'On lance trois pièces équilibrées. L\'univers compte $8$ issues équiprobables : $PPP$, $PPF$,'
    ' $PFP$, $FPP$, $PFF$, $FPF$, $FFP$, $FFF$. On note $X$ le nombre de piles obtenus. On'
    ' s\'intéresse à l\'événement $\\{X\\leqslant ' + ev('k') + '\\}$.' + DEMANDE_428
    + '$P(X\\leqslant ' + ev('k') + ')=?$',
    [var('k', '1..2')], [ev('3*k+1'), ev('(3*k+1)/8')],
    ['L\'événement $\\{X\\leqslant ' + ev('k') + '\\}$ : « au plus $' + ev('k') + '$ {{if:k == 1|pile|piles}} »,'
     ' $' + ev('k') + '$ compris.',
     'Issues : $FFF$, $PFF$, $FPF$, $FFP${{if:k == 2|, $PPF$, $PFP$, $FPP$|}}, soit $'
     + col(ev('3*k+1')) + '$ issues.',
     'Les issues sont équiprobables : $P(X\\leqslant ' + ev('k') + ')=\\dfrac{' + ev('3*k+1')
     + '}{8}=' + col(ev('(3*k+1)/8')) + '$.'])

MODELES.append(modele(
    '03-evenements-x-egal-x-inferieur', 'Événements {X = a} et {X ⩽ a}',
    'Notations {X = a}, {X ⩽ a}, P(X = a), P(X ⩽ a) : compter les issues de l\'événement puis'
    ' calculer sa probabilité (somme de deux dés à quatre faces, nombre de piles sur trois'
    ' pièces)',
    'Loi d\'une variable aléatoire', 5,
    [V428_EGAL, V428_INF_DES, V428_INF_PIECES],
    [spec('{X = 4} : 3 issues, 3/16', 0, {'s': 4}, ['3', '\\frac{3}{16}'], 'correct'),
     spec('{X = 5} : décimal 0,25', 0, {'s': 5}, ['4', '0{,}25'], 'correct'),
     spec('Erreur : sur 8 issues', 0, {'s': 4}, ['3', '\\frac{3}{8}'], 'incorrect'),
     spec('{X ⩽ 4} : 6 issues, 3/8', 1, {'s': 4}, ['6', '\\frac{3}{8}'], 'correct'),
     spec('Erreur : {X < 4} ou {X = 4}', 1, {'s': 4}, ['3', '\\frac{3}{16}'], 'incorrect'),
     spec('{X ⩽ 1} : 4 issues, 1/2', 2, {'k': 1}, ['4', '\\frac{1}{2}'], 'correct'),
     spec('{X ⩽ 2} : 7 issues, 0,875', 2, {'k': 2}, ['7', '0{,}875'], 'correct'),
     spec('Erreur : {X = 1}', 2, {'k': 1}, ['3', '\\frac{3}{8}'], 'incorrect')]))

# --- 4. 1SPE-429 : de la phrase à la notation ---------------------------------------------------

ENONCE_GAIN = 'Dans un jeu, on note $G$ le gain algébrique du joueur pour une partie, en euros.'


def ensemble(signe, valeur='{{a}}'):
    return '$\\{G' + signe + ' ' + valeur + '\\}$'


def v429(phrase, bonne, autres, steps, variables=None):
    return variation(
        ENONCE_GAIN + ' L\'événement « ' + phrase + ' » s\'écrit :' + choix([bonne] + autres),
        variables if variables is not None else [var('a', '2..20')], ['0'], steps)


V429_AU_MOINS = v429(
    'le joueur gagne au moins $' + ev('a') + '$ €', ensemble('\\geqslant'),
    [ensemble('>'), ensemble('\\leqslant'), ensemble('<')],
    ['« Au moins $' + ev('a') + '$ » : $' + ev('a') + '$ ou plus, $' + ev('a') + '$ compris.',
     'L\'événement s\'écrit $' + col('\\{G\\geqslant ' + ev('a') + '\\}') + '$.'])
V429_AU_PLUS = v429(
    'le joueur gagne au plus $' + ev('a') + '$ €', ensemble('\\leqslant'),
    [ensemble('<'), ensemble('\\geqslant'), ensemble('>')],
    ['« Au plus $' + ev('a') + '$ » : $' + ev('a') + '$ ou moins, $' + ev('a') + '$ compris.',
     'L\'événement s\'écrit $' + col('\\{G\\leqslant ' + ev('a') + '\\}') + '$.'])
V429_PLUS_DE = v429(
    'le joueur gagne strictement plus de $' + ev('a') + '$ €', ensemble('>'),
    [ensemble('\\geqslant'), ensemble('<'), ensemble('\\leqslant')],
    ['« Strictement plus de $' + ev('a') + '$ » : $' + ev('a') + '$ n\'est pas compris.',
     'L\'événement s\'écrit $' + col('\\{G>' + ev('a') + '\\}') + '$.'])
V429_PERD = v429(
    'le joueur perd de l\'argent', ensemble('<', '0'),
    [ensemble('\\leqslant', '0'), ensemble('>', '0'), ensemble('=', '0')],
    ['Perdre de l\'argent, c\'est avoir un gain algébrique strictement négatif ; un gain nul'
     ' n\'est pas une perte.',
     'L\'événement s\'écrit $' + col('\\{G<0\\}') + '$.'], [])
V429_PROBA = variation(
    ENONCE_GAIN + ' La **probabilité** que le joueur gagne exactement $' + ev('a') + '$ € s\'écrit :'
    + choix(['$P(G=' + ev('a') + ')$', '$\\{G=' + ev('a') + '\\}$', '$P(G)=' + ev('a') + '$',
             '$G=P(' + ev('a') + ')$']),
    [var('a', '2..20')], ['0'],
    ['$\\{G=' + ev('a') + '\\}$ est l\'**événement** « le joueur gagne exactement $' + ev('a')
     + '$ € » ; sa probabilité est un **nombre**, noté $P(G=' + ev('a') + ')$.',
     'La probabilité s\'écrit $' + col('P(G=' + ev('a') + ')') + '$.'])

MODELES.append(modele(
    '04-de-la-phrase-a-la-notation', 'De la phrase à la notation',
    'Langue naturelle → symboles : au moins, au plus, strictement plus de, perdre de l\'argent'
    ' ({G < 0}) ; événement {G = a} ou probabilité P(G = a)',
    'Notations', 1,
    [V429_AU_MOINS, V429_AU_PLUS, V429_PLUS_DE, V429_PERD, V429_PROBA],
    [spec('Au moins : ⩾', 0, {'a': 5}, '0', 'correct'),
     spec('Erreur : au moins → >', 0, {'a': 5}, '1', 'incorrect'),
     spec('Au plus : ⩽', 1, {'a': 5}, '0', 'correct'),
     spec('Erreur : au plus → <', 1, {'a': 5}, '1', 'incorrect'),
     spec('Strictement plus : >', 2, {'a': 5}, '0', 'correct'),
     spec('Erreur : strictement plus → ⩾', 2, {'a': 5}, '1', 'incorrect'),
     spec('Perdre : G < 0', 3, {}, '0', 'correct'),
     spec('Erreur : G ⩽ 0', 3, {}, '1', 'incorrect'),
     spec('Probabilité : P(G = a)', 4, {'a': 5}, '0', 'correct'),
     spec('Erreur : l\'événement', 4, {'a': 5}, '1', 'incorrect')]))

# --- 5. 1SPE-430 : de la notation à la phrase ---------------------------------------------------

ENONCE_QCM = (
    'Un élève répond au hasard aux $' + ev('n') + '$ questions d\'un QCM. On note $X$ le nombre de'
    ' bonnes réponses qu\'il obtient.')
VARS_QCM = [var('n', '8..12'), var('a', '3..6')]


def v430(notation, bonne, autres, steps):
    return variation(
        ENONCE_QCM + '\n\n' + notation + choix([bonne] + autres), VARS_QCM, ['0'], steps)


V430_INF = v430(
    'L\'événement $\\{X\\leqslant ' + ev('a') + '\\}$ est l\'événement :',
    '« l\'élève obtient au plus $' + ev('a') + '$ bonnes réponses »',
    ['« l\'élève obtient moins de $' + ev('a') + '$ bonnes réponses »',
     '« l\'élève obtient au moins $' + ev('a') + '$ bonnes réponses »',
     '« l\'élève obtient exactement $' + ev('a') + '$ bonnes réponses »'],
    ['$X\\leqslant ' + ev('a') + '$ : $' + ev('a') + '$ bonnes réponses ou moins, $' + ev('a')
     + '$ compris.',
     'C\'est « l\'élève obtient ' + colt('\\text{au plus } ' + ev('a')) + ' bonnes réponses ».'])
V430_PROBA_SUP = v430(
    '$P(X>' + ev('a') + ')$ est la probabilité que :',
    'l\'élève obtienne au moins $' + ev('a+1') + '$ bonnes réponses',
    ['l\'élève obtienne au moins $' + ev('a') + '$ bonnes réponses',
     'l\'élève obtienne au plus $' + ev('a') + '$ bonnes réponses',
     'l\'élève obtienne plus de $' + ev('a+1') + '$ bonnes réponses'],
    ['$X>' + ev('a') + '$ : strictement plus de $' + ev('a') + '$ bonnes réponses. $X$ ne prend'
     ' que des valeurs entières : c\'est $' + ev('a+1') + '$ bonnes réponses ou plus.',
     'C\'est la probabilité que l\'élève obtienne ' + colt('\\text{au moins } ' + ev('a+1'))
     + ' bonnes réponses.'])
V430_INF_STRICT = v430(
    'L\'événement $\\{X<' + ev('a') + '\\}$ est l\'événement :',
    '« l\'élève obtient au plus $' + ev('a-1') + '$ bonnes réponses »',
    ['« l\'élève obtient au plus $' + ev('a') + '$ bonnes réponses »',
     '« l\'élève obtient au moins $' + ev('a-1') + '$ bonnes réponses »',
     '« l\'élève obtient moins de $' + ev('a-1') + '$ bonnes réponses »'],
    ['$X<' + ev('a') + '$ : strictement moins de $' + ev('a') + '$ bonnes réponses. $X$ ne prend'
     ' que des valeurs entières : c\'est $' + ev('a-1') + '$ bonnes réponses ou moins.',
     'C\'est « l\'élève obtient ' + colt('\\text{au plus } ' + ev('a-1')) + ' bonnes réponses ».'])
V430_NATURE = v430(
    'Que désigne l\'écriture $P(X\\leqslant ' + ev('a') + ')$ ?',
    'un nombre compris entre $0$ et $1$',
    ['un événement', 'une valeur prise par $X$', 'un nombre de bonnes réponses'],
    ['$\\{X\\leqslant ' + ev('a') + '\\}$ est un événement ; $P(X\\leqslant ' + ev('a') + ')$ est'
     ' sa probabilité.',
     'C\'est donc ' + colt('\\text{un nombre compris entre } 0 \\text{ et } 1') + '.'])

MODELES.append(modele(
    '05-de-la-notation-a-la-phrase', 'De la notation à la phrase',
    'Symboles → langue naturelle : {X ⩽ a}, P(X > a) (au moins a + 1, X entier), {X < a} (au'
    ' plus a − 1) ; P(X ⩽ a) est un nombre',
    'Notations', 2,
    [V430_INF, V430_PROBA_SUP, V430_INF_STRICT, V430_NATURE],
    [spec('{X ⩽ a} : au plus', 0, {'n': 10, 'a': 4}, '0', 'correct'),
     spec('Erreur : moins de', 0, {'n': 10, 'a': 4}, '1', 'incorrect'),
     spec('P(X > a) : au moins a + 1', 1, {'n': 10, 'a': 4}, '0', 'correct'),
     spec('Erreur : au moins a', 1, {'n': 10, 'a': 4}, '1', 'incorrect'),
     spec('{X < a} : au plus a − 1', 2, {'n': 10, 'a': 4}, '0', 'correct'),
     spec('Erreur : au plus a', 2, {'n': 10, 'a': 4}, '1', 'incorrect'),
     spec('P(X ⩽ a) : un nombre', 3, {'n': 10, 'a': 4}, '0', 'correct'),
     spec('Erreur : un événement', 3, {'n': 10, 'a': 4}, '1', 'incorrect')]))

# --- 6. 1SPE-352 : variance par König-Huygens ---------------------------------------------------

VARS_LOI = [var('x1', '-4..4'), var('d1', '1..4'), var('d2', '1..4'),
            var('x2', '{{eval:x1+d1}}'), var('x3', '{{eval:x2+d2}}'),
            var('a', '1..8'), var('b', '1..{{eval:9-a}}'), var('c', '{{eval:10-a-b}}'),
            var('S', '{{eval:a*(x1)+b*(x2)+c*(x3)}}'),
            var('Q', '{{eval:a*(x1)^2+b*(x2)^2+c*(x3)^2}}'),
            var('E', '{{eval:S/10}}')]
TABLE_LOI = (
    '\n\n| $x_k$ | ${{x1}}$ | ${{x2}}$ | ${{x3}}$ |\n|---|---|---|---|\n'
    '| $P(X=x_k)$ | ' + '$' + evd('a/10') + '$ | $' + evd('b/10') + '$ | $' + evd('c/10') + '$ |')

V352_LOI = variation(
    'La loi de probabilité d\'une variable aléatoire $X$ est donnée par le tableau suivant.'
    + TABLE_LOI + '\n\nOn sait que $E(X)=' + ev('E') + '$. Calcule $E(X^2)$, puis la variance de'
    ' $X$ par la formule de König-Huygens. ' + CONSIGNE + '\n\n$E(X^2)=?$\n\n$V(X)=?$',
    VARS_LOI, [ev('Q/10'), ev('Q/10-E^2')],
    ['$E(X^2)=\\sum p_k x_k^2=' + evd('a/10') + '\\times ' + evp('x1') + '^2+' + evd('b/10')
     + '\\times ' + evp('x2') + '^2+' + evd('c/10') + '\\times ' + evp('x3') + '^2='
     + col(evd('Q/10')) + '$.',
     'Formule de König-Huygens : $V(X)=E(X^2)-{E(X)}^2$.',
     '$V(X)=' + evd('Q/10') + '-' + evp('E') + '^2=' + evd('Q/10') + '-' + ev('E^2') + '='
     + col(evd('Q/10-E^2')) + '$.'], ['mod(S,10) == 0', 'S != 0'])
V352_DONNEES = variation(
    'Pour une variable aléatoire $X$, on sait que $E(X)=' + evd('u/10') + '$ et $E(X^2)='
    + evd('q/10') + '$. Calcule la variance de $X$. ' + CONSIGNE + '\n\n$V(X)=?$',
    [var('u', '-30..30'), var('q', '1..150')], [ev('q/10-u^2/100')],
    ['Formule de König-Huygens : $V(X)=E(X^2)-{E(X)}^2$.',
     '$E(X)^2=' + evp('u/10;d') + '^2=' + evd('u^2/100') + '$ (un carré est positif).',
     '$V(X)=' + evd('q/10') + '-' + evd('u^2/100') + '=' + col(evd('q/10-u^2/100')) + '$.'],
    ['10*q > u^2', 'u != 0', 'mod(u,10) != 0'])

MODELES.append(modele(
    '06-variance-koenig-huygens', 'Variance par la formule de König-Huygens',
    'V(X) = E(X²) − E(X)² : E(X²) calculée depuis la loi (E(X) donnée), ou E(X) et E(X²) données'
    ' (E(X) parfois négative)',
    'Variance et écart-type', 4,
    [V352_LOI, V352_DONNEES],
    [spec('x = 1, 2, 3 ; p = 0,3 ; 0,4 ; 0,3 : E(X²) = 4,6, V = 0,6', 0,
          {'x1': 1, 'd1': 1, 'd2': 1, 'a': 3, 'b': 4}, ['4{,}6', '0{,}6'], 'correct'),
     spec('En fractions', 0, {'x1': 1, 'd1': 1, 'd2': 1, 'a': 3, 'b': 4},
          ['\\frac{23}{5}', '\\frac{3}{5}'], 'correct'),
     spec('Erreur : V = E(X²) − E(X)', 0, {'x1': 1, 'd1': 1, 'd2': 1, 'a': 3, 'b': 4},
          ['4{,}6', '2{,}6'], 'incorrect'),
     spec('E = −1,5 ; E(X²) = 4,7 : V = 2,45', 1, {'u': -15, 'q': 47}, '2{,}45', 'correct'),
     spec('Erreur : −(−1,5)² compté négatif', 1, {'u': -15, 'q': 47}, '6{,}95', 'incorrect'),
     spec('Erreur : carré oublié', 1, {'u': -15, 'q': 47}, '6{,}2', 'incorrect')]))

# --- 7. 1SPE-363 : fonction Python de moyenne ---------------------------------------------------

CODE_LISTE = (
    '```python\ndef moyenne(echantillon):\n    s = 0\n    for x in echantillon:\n'
    '        s = s + x\n    return s / len(echantillon)\n```')
CODE_X = (
    '```python\nfrom random import random\n\ndef X():\n    if random() < 0.' + ev('p') + ':\n'
    '        return ' + ev('g') + '\n    return -' + ev('h') + '\n\n'
    'def moyenne(n):\n    s = 0\n    for i in range(n):\n        s = s + X()\n')

V363_LISTE = variation(
    'On considère la fonction Python suivante.\n\n' + CODE_LISTE + '\n\nQue renvoie l\'appel'
    ' `moyenne([' + ev('u') + ', ' + ev('v') + ', ' + ev('w') + ', ' + ev('z') + '])` ?\n\n$?$',
    [var('u', '0..12'), var('v', '0..12'), var('w', '0..12'), var('z', '0..12')],
    [ev('(u+v+w+z)/4')],
    ['La boucle ajoute chaque valeur à `s` : à la fin, $s=' + ev('u') + '+' + ev('v') + '+'
     + ev('w') + '+' + ev('z') + '=' + ev('u+v+w+z') + '$.',
     'La liste contient $4$ valeurs : la fonction renvoie $\\dfrac{' + ev('u+v+w+z') + '}{4}='
     + col(evd('(u+v+w+z)/4')) + '$, la moyenne de l\'échantillon.'],
    ['mod(u+v+w+z,4) != 0'])
V363_LIGNE = variation(
    'La fonction `X` ci-dessous simule une variable aléatoire. La fonction `moyenne` doit renvoyer'
    ' la moyenne d\'un échantillon de taille `n` de cette variable aléatoire.\n\n' + CODE_X
    + '    ...\n```\n\nPar quelle instruction faut-il remplacer les points de suspension ?'
    + choix(['`return s / n`', '`return s`', '`return X() / n`', '`return s / i`']),
    [var('p', '1..9'), var('g', '2..9'), var('h', '1..5')], ['0'],
    ['La boucle appelle `n` fois la fonction `X` : `s` est la **somme** des `n` valeurs simulées.',
     'La moyenne de l\'échantillon est cette somme divisée par l\'effectif `n` : '
     + colt('\\texttt{return s / n}') + '.'])
V363_SENS = variation(
    'On considère le programme Python suivant.\n\n' + CODE_X + '    return s / n\n```\n\n'
    'Que renvoie l\'appel `moyenne(1000)` ?'
    + choix(['la moyenne d\'un échantillon de taille $1000$ de la variable aléatoire simulée par'
             ' `X`',
             'l\'espérance exacte de la variable aléatoire simulée par `X`',
             'la somme de $1000$ valeurs de la variable aléatoire simulée par `X`',
             'la probabilité que `X()` renvoie $' + ev('g') + '$']),
    [var('p', '1..9'), var('g', '2..9'), var('h', '1..5')], ['0'],
    ['`moyenne(1000)` simule $1000$ valeurs de la variable aléatoire, les additionne, puis divise'
     ' par $1000$.',
     'C\'est ' + colt('\\text{la moyenne d\'un échantillon de taille } 1000') + ' : un nombre'
     ' qui change d\'un appel à l\'autre, en général proche de l\'espérance sans lui être égal.'])

MODELES.append(modele(
    '07-fonction-python-moyenne', 'Fonction Python : moyenne d\'un échantillon',
    'Lire une fonction Python de moyenne (valeur renvoyée pour une liste), compléter sa dernière'
    ' ligne (return s / n), comprendre ce que renvoie moyenne(1000)',
    'Échantillons et simulation', 1,
    [V363_LISTE, V363_LIGNE, V363_SENS],
    [spec('Moyenne de 3, 8, 5, 1 = 4,25', 0, {'u': 3, 'v': 8, 'w': 5, 'z': 1}, '4{,}25',
          'correct'),
     spec('En fraction', 0, {'u': 3, 'v': 8, 'w': 5, 'z': 1}, '\\frac{17}{4}', 'correct'),
     spec('Erreur : la somme', 0, {'u': 3, 'v': 8, 'w': 5, 'z': 1}, '17', 'incorrect'),
     spec('return s / n', 1, {'p': 3, 'g': 5, 'h': 2}, '0', 'correct'),
     spec('Erreur : return s', 1, {'p': 3, 'g': 5, 'h': 2}, '1', 'incorrect'),
     spec('Moyenne d\'un échantillon', 2, {'p': 3, 'g': 5, 'h': 2}, '0', 'correct'),
     spec('Erreur : l\'espérance exacte', 2, {'p': 3, 'g': 5, 'h': 2}, '1', 'incorrect')]))

# --- 8. 1SPE-364 : écart entre la moyenne d'un échantillon et l'espérance -----------------------

V364_ECART = variation(
    'La loi de probabilité d\'une variable aléatoire $X$ est donnée par le tableau suivant.'
    + TABLE_LOI + '\n\nOn a simulé un échantillon de taille $' + ev('n') + '$ de $X$ : la moyenne'
    ' de l\'échantillon est $m=' + evd('E+t/100') + '$.\n\nCalcule l\'écart entre $m$ et'
    ' l\'espérance de $X$, c\'est-à-dire $|m-E(X)|$. ' + CONSIGNE + '\n\n$|m-E(X)|=?$',
    VARS_LOI + [var('t', '-60..60'), var('n', '100|200|500|1000')], [ev('abs(t)/100')],
    ['$E(X)=\\sum p_k x_k=' + evd('a/10') + '\\times ' + evp('x1') + '+' + evd('b/10') + '\\times '
     + evp('x2') + '+' + evd('c/10') + '\\times ' + evp('x3') + '=' + evd('E') + '$.',
     '$|m-E(X)|=|' + evd('E+t/100') + '-' + evp('E;d') + '|=|' + evd('t/100') + '|='
     + col(evd('abs(t)/100')) + '$.',
     'La moyenne de l\'échantillon est proche de l\'espérance sans lui être égale : elle'
     ' fluctue d\'un échantillon à l\'autre.'],
    ['t != 0', 'mod(t,10) != 0'])
V364_TAILLE = variation(
    'On simule des échantillons de taille $n$ d\'une variable aléatoire $X$ d\'espérance $'
    + ev('mu') + '$, et on note $m$ la moyenne de chaque échantillon. En général, quand la taille'
    ' $n$ de l\'échantillon augmente, l\'écart $|m-' + ev('mu') + '|$ :'
    + choix(['devient plus petit', 'devient plus grand', 'est toujours nul',
             'ne dépend pas de $n$']),
    [var('mu', '2..20')], ['0'],
    ['La moyenne d\'un échantillon fluctue autour de l\'espérance, et d\'autant moins que'
     ' l\'échantillon est grand.',
     'En général, l\'écart ' + colt('\\text{devient plus petit}') + ' quand $n$ augmente ; il n\'est'
     ' pas nul pour autant.'])

MODELES.append(modele(
    '08-ecart-moyenne-esperance', 'Écart entre la moyenne d\'un échantillon et l\'espérance',
    'Calculer E(X) depuis la loi puis l\'écart |m − E(X)| avec la moyenne m d\'un échantillon'
    ' simulé ; l\'écart diminue en général quand la taille de l\'échantillon augmente',
    'Échantillons et simulation', 2,
    [V364_ECART, V364_TAILLE],
    [spec('E = 2, m = 2,35 : écart 0,35', 0,
          {'x1': 1, 'd1': 1, 'd2': 1, 'a': 3, 'b': 4, 't': 35, 'n': 100}, '0{,}35', 'correct'),
     spec('E = 2, m = 1,77 : écart 0,23', 0,
          {'x1': 1, 'd1': 1, 'd2': 1, 'a': 3, 'b': 4, 't': -23, 'n': 100}, '0{,}23', 'correct'),
     spec('Erreur : écart négatif', 0,
          {'x1': 1, 'd1': 1, 'd2': 1, 'a': 3, 'b': 4, 't': -23, 'n': 100}, '-0{,}23', 'incorrect'),
     spec('Erreur : m recopiée', 0,
          {'x1': 1, 'd1': 1, 'd2': 1, 'a': 3, 'b': 4, 't': 35, 'n': 100}, '2{,}35', 'incorrect'),
     spec('Plus petit', 1, {'mu': 5}, '0', 'correct'),
     spec('Erreur : toujours nul', 1, {'mu': 5}, '2', 'incorrect')]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
