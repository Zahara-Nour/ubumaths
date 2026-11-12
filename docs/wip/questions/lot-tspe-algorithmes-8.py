"""Écrit les 4 modèles du lot 8 « algorithmes : probabilités, concentration » de la terminale
spécialité dans scripts/questions/tspe-algorithmes-8/.

Phase 0 des algorithmes validée par David le 2026-11-12 (D2 du journal
« docs/wip/questions-tspe-demonstrations-progress.md », § 18), phase 0 du lot validée le
2026-11-13 (D5, § 31). Un point par modèle, chacun sur la sous-notion de son point, au-dessus des
niveaux déjà présents (relevé prod du 2026-11-12) :

| # | Point    | Titre                                                  | Niv. | Nœud du modèle                               |
| 1 | TSPE-534 | Probabilité de l'écart à pn en Python                  | 3    | Probabilités › Sommes et conc. › Bienaymé-T. |
| 2 | TSPE-624 | Comparer avec Bienaymé-Tchebychev en Python            | 4    | Probabilités › Sommes et conc. › Bienaymé-T. |
| 3 | TSPE-535 | Simuler une marche aléatoire en Python                 | 5    | Probabilités › Proba. cond. › épreuves ind.  |
| 4 | TSPE-536 | Écart type des moyennes d'échantillons en Python       | 2    | Probabilités › Sommes et conc. › loi g. n.   |

Forme (D2, Q2, comme D9 de la 1re) : Python seulement ; (a) faire tourner un programme (case),
(b) compléter une ligne (case choix à 4 propositions, la première est la bonne, ordre mélangé à
l'affichage), (c) interpréter. Un programme aléatoire n'est jamais « faites-le tourner » : 535 et
536 n'ont pas de forme (a). 534 : la table des P(X ⩽ k) de B(n ; 0,5) est donnée dans l'énoncé,
pour n ∈ {36, 49, 64, 100} (avec n = 16 ou 25, la somme lue dans la table arrondie diffère de la
valeur exacte arrondie).

Gabarits remplis par `replace`, jamais par `format` (format mange les accolades de {{eval:…}}).
Variables : jamais `e` ni `E` (constante d'Euler), ni `i`. Dans le code Python, un décimal est
écrit en dur ou par {{if:…}} (jamais par {{eval}}, qui l'écrirait avec une virgule).

    python3 docs/wip/questions/lot-tspe-algorithmes-8.py scripts/questions/tspe-algorithmes-8
"""
import json
import os
import subprocess
import sys
from math import comb, sqrt

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


def selon(nom, valeurs):
    """{{if:…}} imbriqués : valeurs = [(valeur de la variable, texte)], la dernière par défaut."""
    (v, t), reste = valeurs[0], valeurs[1:]
    if not reste:
        return t
    return '{{if:' + nom + '==' + str(v) + '|' + t + '|' + selon(nom, reste) + '}}'


def virgule(x):
    return str(x).replace('.', '{,}')


# --- 1. TSPE-534 : P(|Sₙ − pn| > √n) ------------------------------------------------------------

ECART = ('from math import comb, sqrt\n'
         '\n'
         'def P_ecart(n, p):\n'
         '    s = 0\n'
         '    for k in range(n + 1):\n'
         '        {condition}\n'
         '            s = s + comb(n, k) * p**k * (1 - p)**(n - k)\n'
         '    return s')
CONDITION_ECART = 'if abs(k - n*p) > sqrt(n):'
CONTEXTE_ECART = ('On note $S_n$ une variable aléatoire qui suit la loi binomiale'
                  ' $\\mathcal{B}(n\\,;\\,p)$. ')

TAILLES_ECART = [36, 49, 64, 100]


def bornes_ecart(n):
    """Plus grand k avec k < n/2 − √n, plus petit k avec k > n/2 + √n (p = 0,5)."""
    return int(n / 2 - sqrt(n) - 0.5), n - int(n / 2 - sqrt(n) - 0.5)


def repartition(n, k):
    return round(sum(comb(n, j) for j in range(k + 1)) / 2**n, 4)


# Colonnes de la table : lo − 1, lo, lo + 1, hi − 2, hi − 1, hi (calculées ici, en Python)
COLONNES = [('lo', -1), ('lo', 0), ('lo', 1), ('hi', -2), ('hi', -1), ('hi', 0)]


def cellule(c):
    nom, d = c
    valeurs = []
    for n in TAILLES_ECART:
        lo, hi = bornes_ecart(n)
        k = (lo if nom == 'lo' else hi) + d
        valeurs.append((n, virgule(f'{repartition(n, k):.4f}')))
    return '$' + selon('n', valeurs) + '$'


def entete(c):
    nom, d = c
    return '$' + ev(nom + ('+' + str(d) if d > 0 else (str(d) if d < 0 else ''))) + '$'


TABLE_ECART = ('\n\n| $k$ | ' + ' | '.join(entete(c) for c in COLONNES) + ' |\n'
               '|---|' + '---|' * len(COLONNES) + '\n'
               '| $P(S_n\\leqslant k)$ | ' + ' | '.join(cellule(c) for c in COLONNES) + ' |\n\n')
# Valeur lue dans la table : P(S ⩽ lo) + 1 − P(S ⩽ hi − 1), en dix-millièmes
LUE = {n: round(10000 * (repartition(n, bornes_ecart(n)[0]) + 1
                         - repartition(n, bornes_ecart(n)[1] - 1))) for n in TAILLES_ECART}
for n in TAILLES_ECART:
    exacte = sum(comb(n, k) for k in range(n + 1) if abs(k - n / 2) > sqrt(n)) / 2**n
    assert LUE[n] == round(10000 * exacte), (n, LUE[n], exacte)

V534_TOURNER = case(
    CONTEXTE_ECART + 'La fonction Python ci-dessous renvoie $P(\\lvert S_n-pn\\rvert>\\sqrt{n})$.'
    + python(ECART.replace('{condition}', CONDITION_ECART))
    + 'Pour $n=' + ev('n') + '$ et $p=0{,}5$, on donne quelques valeurs de $P(S_n\\leqslant k)$,'
    ' arrondies à $10^{-4}$.' + TABLE_ECART
    + 'En utilisant la table, donner la valeur renvoyée par `P_ecart(' + ev('n') + ', 0.5)`,'
    ' arrondie à $10^{-4}$.\n\n$?$',
    [var('n', '|'.join(str(n) for n in TAILLES_ECART)), var('m', 'eval:sqrt(n)'),
     var('lo', 'eval:floor(n/2-sqrt(n)-0.5)'), var('hi', 'eval:n-lo'),
     var('r', 'eval:' + selon('n', [(n, str(LUE[n])) for n in TAILLES_ECART]) + '/10000')],
    evd('r'),
    ['La fonction additionne les $P(S_n=k)$ pour les entiers $k$ tels que $\\lvert k-'
     + evd('n/2') + '\\rvert>' + ev('m') + '$, car $np=' + evd('n/2') + '$ et $\\sqrt{'
     + ev('n') + '}=' + ev('m') + '$.',
     'Ce sont les entiers $k\\leqslant' + ev('lo') + '$ et les entiers $k\\geqslant' + ev('hi')
     + '$ : la fonction renvoie $P(S_n\\leqslant' + ev('lo') + ')+1-P(S_n\\leqslant' + ev('hi-1')
     + ')$.',
     'Avec la table, on obtient $' + col(evd('r')) + '$.'])

V534_LIGNE = ligne(
    CONTEXTE_ECART + 'La fonction Python ci-dessous doit renvoyer $P(\\lvert S_n-pn\\rvert'
    '>\\sqrt{n})$.'
    + python(ECART.replace('{condition}', '...'))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`' + CONDITION_ECART + '`',
    ['`if k - n*p > sqrt(n):`', '`if abs(k - p) > sqrt(n):`', '`if abs(k - n*p) > n:`'],
    ['La fonction additionne les $P(S_n=k)$ des valeurs $k$ qui réalisent l\'événement'
     ' $\\lvert S_n-pn\\rvert>\\sqrt{n}$.',
     'Il faut la valeur absolue (les écarts au-dessous de $pn$ comptent aussi), l\'espérance $pn$'
     ' et non $p$, et le seuil $\\sqrt{n}$.',
     'La ligne est donc `' + CONDITION_ECART + '`.'])

V534_INTERPRETER = ligne(
    CONTEXTE_ECART + 'On considère la fonction Python suivante.'
    + python(ECART.replace('{condition}', CONDITION_ECART))
    + 'Que renvoie `P_ecart(' + ev('n') + ', ' + selon('q', [(2, '0.5'), (5, '0.2'), (10, '0.1')])
    + ')` ?',
    [var('n', '50|100|200'), var('q', '2|5|10')],
    'La probabilité que $S_{' + ev('n') + '}$ s\'écarte de son espérance de plus de $\\sqrt{'
    + ev('n') + '}$',
    ['La probabilité que $S_{' + ev('n') + '}$ dépasse son espérance de plus de $\\sqrt{'
     + ev('n') + '}$',
     'La probabilité que $S_{' + ev('n') + '}$ reste à au plus $\\sqrt{' + ev('n') + '}$ de son'
     ' espérance',
     'L\'écart type de $S_{' + ev('n') + '}$'],
    ['La fonction additionne $P(S_n=k)$ pour les $k$ tels que $\\lvert k-np\\rvert>\\sqrt{n}$.',
     '$np$ est l\'espérance de $S_n$, et la valeur absolue compte les écarts des deux côtés.',
     'Elle renvoie donc $' + col('P(\\lvert S_{' + ev('n') + '}-E(S_{' + ev('n') + '})\\rvert'
                                 '>\\sqrt{' + ev('n') + '})') + '$.'])

MODELES.append(modele(
    '01-probabilite-de-l-ecart-a-pn', 'Probabilité de l\'écart à pn en Python',
    'P(|Sₙ − pn| > √n) pour Sₙ ~ B(n ; p) : valeur renvoyée avec la table des P(Sₙ ⩽ k) donnée'
    ' (n = 36, 49, 64, 100 ; p = 0,5), compléter if abs(k - n*p) > sqrt(n):, sens de la valeur'
    ' renvoyée',
    3, [V534_TOURNER, V534_LIGNE, V534_INTERPRETER],
    [spec('n = 36 : 0,0288', 0, '0.0288', 'correct', {'n': 36, 'm': 6, 'lo': 11, 'hi': 25,
                                                      'r': 0.0288}),
     spec('n = 36 : avec virgule', 0, '0,0288', 'correct', {'n': 36, 'm': 6, 'lo': 11, 'hi': 25,
                                                            'r': 0.0288}),
     spec('n = 100 : 0,0352', 0, '0.0352', 'correct', {'n': 100, 'm': 10, 'lo': 39, 'hi': 61,
                                                       'r': 0.0352}),
     spec('Erreur : une seule queue (n = 100)', 0, '0.0176', 'incorrect',
          {'n': 100, 'm': 10, 'lo': 39, 'hi': 61, 'r': 0.0352}),
     spec('Erreur : ⩾ au lieu de > (n = 36)', 0, '0.0652', 'incorrect',
          {'n': 36, 'm': 6, 'lo': 11, 'hi': 25, 'r': 0.0288})]
    + specs_choix(1, CONDITION_ECART, ['une seule queue', 'p au lieu de np', 'seuil n'])
    + specs_choix(2, 'P(|S − E(S)| > √n)', ['une queue', 'complémentaire', 'écart type'],
                  {'n': 100, 'q': 2})))

# --- 2. TSPE-624 : comparer avec Bienaymé-Tchebychev -----------------------------------------

BORNE = ('from math import sqrt\n'
         '\n'
         'def borne(n, p):\n'
         '    V = n * p * (1 - p)\n'
         '    delta = sqrt(n)\n'
         '    {ligne}')
LIGNE_BORNE = 'return V / delta**2'
CONTEXTE_BORNE = (
    'On note $S_n$ une variable aléatoire qui suit la loi binomiale $\\mathcal{B}(n\\,;\\,p)$.'
    ' D\'après l\'inégalité de Bienaymé-Tchebychev, pour tout réel $\\delta>0$,'
    ' $P(\\lvert S_n-np\\rvert\\geqslant\\delta)\\leqslant\\dfrac{V(S_n)}{\\delta^2}$. ')
P_PY = selon('q', [(2, '0.5'), (5, '0.2'), (10, '0.1')])
P_TEX = selon('q', [(2, '0{,}5'), (5, '0{,}2'), (10, '0{,}1')])

V624_TOURNER = case(
    CONTEXTE_BORNE + 'La fonction Python ci-dessous calcule cette majoration pour'
    ' $\\delta=\\sqrt{n}$.'
    + python(BORNE.replace('{ligne}', LIGNE_BORNE))
    + 'Que renvoie `borne(' + ev('n') + ', ' + P_PY + ')` ?\n\n$?$',
    [var('n', '25|100|400'), var('q', '2|5|10'), var('r', 'eval:(q-1)/q^2')],
    evd('r'),
    ['`V` vaut $V(S_n)=np(1-p)$ et `delta**2` vaut $(\\sqrt{n})^2=n$.',
     'La fonction renvoie $\\dfrac{np(1-p)}{n}=p(1-p)$ : le résultat ne dépend pas de $n$.',
     'Avec $p=' + P_TEX + '$ : $' + P_TEX + '\\times(1-' + P_TEX + ')=' + col(evd('r')) + '$.'])

V624_LIGNE = ligne(
    CONTEXTE_BORNE + 'La fonction Python ci-dessous doit renvoyer cette majoration pour'
    ' $\\delta=\\sqrt{n}$.'
    + python(BORNE.replace('{ligne}', '...'))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`' + LIGNE_BORNE + '`',
    ['`return V / delta`', '`return sqrt(V) / delta`', '`return delta**2 / V`'],
    ['La majoration est $\\dfrac{V(S_n)}{\\delta^2}$ : la variance divisée par le **carré** de'
     ' l\'écart $\\delta$.',
     '`V` est la variance $np(1-p)$ et `delta` vaut $\\sqrt{n}$.',
     'La ligne est donc `' + LIGNE_BORNE + '`.'])

V624_INTERPRETER = ligne(
    CONTEXTE_BORNE + 'Avec la fonction `P_ecart(n, p)`, qui renvoie $P(\\lvert S_n-np\\rvert'
    '>\\sqrt{n})$, et la fonction `borne(n, p)` ci-dessous, qui renvoie la majoration pour'
    ' $\\delta=\\sqrt{n}$, on exécute le programme suivant.'
    + python(BORNE.replace('{ligne}', LIGNE_BORNE)
             + '\n\nprint(round(P_ecart(100, 0.5), 4))\nprint(borne(100, 0.5))')
    + 'Il affiche `0.0352` puis `0.25`. Que peut-on en conclure ?',
    [], 'L\'inégalité est vérifiée, mais la majoration est loin d\'être optimale.',
    ['L\'inégalité de Bienaymé-Tchebychev est fausse ici, car $0{,}25>0{,}0352$.',
     'Le calcul de `P_ecart` est faux : il devrait renvoyer $0{,}25$.',
     'L\'inégalité de Bienaymé-Tchebychev ne s\'applique pas à une loi binomiale.'],
    ['$P(\\lvert S_n-np\\rvert>\\sqrt{n})\\leqslant P(\\lvert S_n-np\\rvert\\geqslant\\sqrt{n})'
     '\\leqslant p(1-p)$ : on doit trouver une probabilité inférieure ou égale à $0{,}25$.',
     'C\'est le cas : $0{,}0352\\leqslant0{,}25$. L\'inégalité vaut pour toute variable'
     ' aléatoire qui a une variance, binomiale comprise.',
     'Mais $0{,}25$ est environ sept fois plus grand que la probabilité : la majoration est'
     ' $' + col('\\text{vraie mais grossière}') + '$, c\'est le prix de son caractère universel.'])

MODELES.append(modele(
    '02-comparer-avec-bienayme-tchebychev', 'Comparer avec Bienaymé-Tchebychev en Python',
    'Majoration de Bienaymé-Tchebychev pour δ = √n et Sₙ ~ B(n ; p) : valeur de borne(n, p)'
    ' (p(1 − p), p = 0,5 ; 0,2 ; 0,1), compléter return V / delta**2, comparer 0,0352 à 0,25'
    ' (inégalité vraie mais pas optimale)',
    4, [V624_TOURNER, V624_LIGNE, V624_INTERPRETER],
    [spec('p = 0,5 : 0,25', 0, '0.25', 'correct', {'n': 100, 'q': 2, 'r': 0.25}),
     spec('p = 0,2 : 0,16 avec virgule', 0, '0,16', 'correct', {'n': 25, 'q': 5, 'r': 0.16}),
     spec('p = 0,1 : 0,09', 0, '0.09', 'correct', {'n': 400, 'q': 10, 'r': 0.09}),
     spec('Erreur : V(Sₙ) sans diviser (n = 25, p = 0,2)', 0, '4', 'incorrect',
          {'n': 25, 'q': 5, 'r': 0.16}),
     spec('Erreur : V/δ (n = 100, p = 0,5)', 0, '2.5', 'incorrect',
          {'n': 100, 'q': 2, 'r': 0.25})]
    + specs_choix(1, LIGNE_BORNE, ['V/δ', '√V/δ', 'inverse'])
    + specs_choix(2, 'vraie mais grossière', ['fausse', 'calcul faux', 'ne s\'applique pas'])))

# --- 3. TSPE-535 : marche aléatoire -------------------------------------------------------------

MARCHE = ('from random import random\n'
          '\n'
          'def marche(n):\n'
          '    x = 0\n'
          '    for k in range(n):\n'
          '        {condition}\n'
          '            x = x + 1\n'
          '        else:\n'
          '            {pas}\n'
          '    return x')
PAS_MARCHE = 'x = x - 1'
CONTEXTE_MARCHE = (
    'Un pion part de l\'origine d\'une droite graduée. À chaque étape, il avance d\'une unité'
    ' (pas $+1$) avec la probabilité {p}, ou recule d\'une unité (pas $-1$) sinon, indépendamment'
    ' des étapes précédentes. ')


def marche_py(condition, pas):
    return MARCHE.replace('{condition}', condition).replace('{pas}', pas)


V535_PAS = ligne(
    CONTEXTE_MARCHE.replace('{p}', '$0{,}5$') + 'La fonction Python ci-dessous doit renvoyer la'
    ' position du pion après $n$ étapes ; `random()` renvoie un nombre au hasard dans'
    ' $[0\\,;\\,1[$.'
    + python(marche_py('if random() < 0.5:', '...'))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`' + PAS_MARCHE + '`',
    ['`x = 0`', '`x = x + 1`', '`x = -1`'],
    ['Dans le cas `else`, le pion recule d\'une unité : sa position diminue de $1$.',
     '`x = 0` et `x = -1` effacent la position atteinte, et `x = x + 1` ferait toujours avancer'
     ' le pion.',
     'La ligne est donc `' + PAS_MARCHE + '`.'])

CONDITION_MARCHE = 'if random() < 0.7:'

V535_CONDITION = ligne(
    CONTEXTE_MARCHE.replace('{p}', '$0{,}7$') + 'La fonction Python ci-dessous doit renvoyer la'
    ' position du pion après $n$ étapes ; `random()` renvoie un nombre au hasard dans'
    ' $[0\\,;\\,1[$.'
    + python(marche_py('...', PAS_MARCHE))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`' + CONDITION_MARCHE + '`',
    ['`if random() < 0.3:`', '`if random() > 0.7:`', '`if random() == 0.7:`'],
    ['Le pion avance avec la probabilité $0{,}7$ : la condition qui précède `x = x + 1` doit être'
     ' vraie avec la probabilité $0{,}7$.',
     '`random()` tombe dans $[0\\,;\\,0{,}7[$ avec la probabilité $0{,}7$. `random() < 0.3` et'
     ' `random() > 0.7` sont vrais avec la probabilité $0{,}3$, et `random() == 0.7` presque'
     ' jamais.',
     'La ligne est donc `' + CONDITION_MARCHE + '`.'])

V535_MOYENNE = case(
    CONTEXTE_MARCHE.replace('{p}', '$' + selon('q', [(6, '0{,}6'), (7, '0{,}7'), (8, '0{,}8')])
                            + '$')
    + 'On considère le programme Python suivant.'
    + python(marche_py('if random() < ' + selon('q', [(6, '0.6'), (7, '0.7'), (8, '0.8')]) + ':',
                       PAS_MARCHE)
             + '\n\nS = 0\nfor j in range(100000):\n    S = S + marche(' + ev('n') + ')\n'
             'print(S / 100000)')
    + 'De quel nombre la valeur affichée est-elle, en général, proche ?\n\n$?$',
    [var('q', '6|7|8'), var('n', '10|20|50'), var('r', 'eval:n*(2*q-10)/10')],
    ev('r'),
    ['Le programme affiche la moyenne des positions après $' + ev('n') + '$ étapes, sur'
     ' $100\\,000$ marches : d\'après la loi des grands nombres, elle est proche de l\'espérance'
     ' $E(X)$ de la position $X$.',
     'Si $Y$ est le nombre de pas $+1$, $Y$ suit la loi $\\mathcal{B}(' + ev('n') + '\\,;\\,'
     + selon('q', [(6, '0{,}6'), (7, '0{,}7'), (8, '0{,}8')]) + ')$ et $X=Y-(' + ev('n')
     + '-Y)=2Y-' + ev('n') + '$.',
     '$E(X)=2E(Y)-' + ev('n') + '=2\\times' + ev('n*q/10') + '-' + ev('n') + '='
     + col(ev('r')) + '$.'])

MODELES.append(modele(
    '03-simuler-une-marche-aleatoire', 'Simuler une marche aléatoire en Python',
    'Marche aléatoire sur une droite graduée : compléter x = x - 1, compléter if random() < 0.7:'
    ' (pas +1 de probabilité 0,7), valeur proche de la position moyenne (n(2p − 1))',
    5, [V535_PAS, V535_CONDITION, V535_MOYENNE],
    specs_choix(0, PAS_MARCHE, ['x = 0', 'x = x + 1', 'x = -1'])
    + specs_choix(1, CONDITION_MARCHE, ['< 0.3', '> 0.7', '== 0.7'])
    + [spec('p = 0,7, n = 10 : 4', 2, '4', 'correct', {'q': 7, 'n': 10, 'r': 4}),
       spec('p = 0,6, n = 50 : 10', 2, '10', 'correct', {'q': 6, 'n': 50, 'r': 10}),
       spec('p = 0,8, n = 20 : 12', 2, '12', 'correct', {'q': 8, 'n': 20, 'r': 12}),
       spec('Erreur : np (p = 0,7, n = 10)', 2, '7', 'incorrect', {'q': 7, 'n': 10, 'r': 4}),
       spec('Erreur : marche symétrique, 0 (p = 0,7, n = 10)', 2, '0', 'incorrect',
            {'q': 7, 'n': 10, 'r': 4})]))

# --- 4. TSPE-536 : écart type des moyennes ------------------------------------------------------

LOI_MOYENNES = ('from random import random\n'
                'from statistics import mean\n'
                '\n'
                'def X():\n'
                '    if random() < 0.5:\n'
                '        return {bas}\n'
                '    return {haut}\n'
                '\n'
                'def moyennes(N, n):\n'
                '    M = []\n'
                '    for j in range(N):\n'
                '        M.append(mean([X() for k in range(n)]))\n'
                '    return M')
CONTEXTE_MOYENNES = (
    'Une variable aléatoire $X$ prend les valeurs ${bas}$ et ${haut}$ avec la probabilité'
    ' $\\dfrac{1}{2}$ chacune : son espérance est $\\mu=10$ et son écart type est $\\sigma={sg}$.'
    ' La fonction `moyennes(N, n)` ci-dessous simule $N$ échantillons de taille $n$ de $X$ et'
    ' renvoie la liste de leurs moyennes. ')


def moyennes_py(sg):
    return LOI_MOYENNES.replace('{bas}', ev('10-' + sg)).replace('{haut}', ev('10+' + sg))


def contexte_moyennes(sg):
    return (CONTEXTE_MOYENNES.replace('{bas}', ev('10-' + sg)).replace('{haut}', ev('10+' + sg))
            .replace('{sg}', ev(sg)))


PROPORTION = ('\n'
              '\n'
              'def proportion(M, mu, sigma, n, k):\n'
              '    c = 0\n'
              '    for m in M:\n'
              '        {condition}\n'
              '            c = c + 1\n'
              '    return c / len(M)')
CONDITION_PROPORTION = 'if abs(m - mu) <= k * sigma / sqrt(n):'

V536_LIGNE = ligne(
    contexte_moyennes('s') + 'La fonction `proportion` doit renvoyer la proportion des moyennes'
    ' de la liste `M` dont l\'écart à $\\mu$ est inférieur ou égal à $k\\dfrac{\\sigma}'
    '{\\sqrt{n}}$.'
    + python('from math import sqrt\n' + moyennes_py('s')
             + PROPORTION.replace('{condition}', '...'))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [var('s', '1..3')], '`' + CONDITION_PROPORTION + '`',
    ['`if abs(m - mu) <= k * sigma:`', '`if m - mu <= k * sigma / sqrt(n):`',
     '`if abs(m - mu) <= k * sigma / n:`'],
    ['L\'écart entre la moyenne `m` et $\\mu$ est $\\lvert m-\\mu\\rvert$ : la valeur absolue'
     ' compte les écarts des deux côtés.',
     'Le seuil est $k\\dfrac{\\sigma}{\\sqrt{n}}$, $k$ fois l\'écart type de la moyenne d\'un'
     ' échantillon de taille $n$ (et non $k\\sigma$, ni $k\\dfrac{\\sigma}{n}$).',
     'La ligne est donc `' + CONDITION_PROPORTION + '`.'])

V536_ECART = case(
    contexte_moyennes('s') + 'On exécute le programme suivant, où `pstdev` calcule l\'écart type'
    ' d\'une série.'
    + python(moyennes_py('s').replace('from statistics import mean',
                                      'from statistics import mean, pstdev')
             + '\n\nprint(pstdev(moyennes(1000, ' + ev('m^2') + ')))')
    + 'De quel nombre la valeur affichée est-elle, en général, proche ?\n\n$?$',
    [var('s', '1|2|3|5'), var('m', '5|10|20'), var('r', 'eval:s/m')],
    evd('r'),
    ['La valeur affichée est l\'écart type $s$ de la série des $1\\,000$ moyennes d\'échantillons'
     ' de taille $n=' + ev('m^2') + '$.',
     'La moyenne $M_n$ d\'un échantillon de taille $n$ a pour variance $\\dfrac{\\sigma^2}{n}$,'
     ' donc pour écart type $\\dfrac{\\sigma}{\\sqrt{n}}$ : $s$ en est proche.',
     '$\\dfrac{\\sigma}{\\sqrt{n}}=\\dfrac{' + ev('s') + '}{\\sqrt{' + ev('m^2') + '}}=\\dfrac{'
     + ev('s') + '}{' + ev('m') + '}=' + col(evd('r')) + '$.'])

V536_TAILLE = ligne(
    contexte_moyennes('s') + 'On calcule l\'écart type $s$ de la série des moyennes renvoyée par'
    ' `moyennes(1000, ' + ev('n') + ')`, puis par `moyennes(1000, ' + ev('4*n') + ')`.'
    + python(moyennes_py('s'))
    + 'Comment $s$ change-t-il, en général, quand on passe de $n=' + ev('n') + '$ à $n='
    + ev('4*n') + '$ ?',
    [var('s', '1..3'), var('n', '25|50|100')],
    'Il est à peu près divisé par $2$.',
    ['Il est à peu près divisé par $4$.', 'Il est à peu près multiplié par $2$.',
     'Il ne change presque pas.'],
    ['$s$ est proche de l\'écart type de la moyenne d\'un échantillon, $\\dfrac{\\sigma}'
     '{\\sqrt{n}}$.',
     'Quand $n$ est multiplié par $4$, $\\sqrt{n}$ est multiplié par $\\sqrt{4}=2$.',
     '$s$ est donc $' + col('\\text{à peu près divisé par }2') + '$ : les moyennes se resserrent autour de'
     ' $\\mu$, mais seulement en $\\dfrac{1}{\\sqrt{n}}$.'])

MODELES.append(modele(
    '04-ecart-type-des-moyennes', 'Écart type des moyennes d\'échantillons en Python',
    'N échantillons de taille n de X (μ = 10, écart type σ) : compléter la ligne de comptage'
    ' abs(m - mu) <= k * sigma / sqrt(n), écart type des moyennes proche de σ/√n (case), effet de'
    ' n multiplié par 4 (s divisé par 2)',
    2, [V536_LIGNE, V536_ECART, V536_TAILLE],
    specs_choix(0, CONDITION_PROPORTION, ['kσ', 'sans valeur absolue', 'σ/n'], {'s': 2})
    + [spec('σ = 2, n = 25 : 0,4', 1, '0.4', 'correct', {'s': 2, 'm': 5, 'r': 0.4}),
       spec('σ = 5, n = 100 : 0,5 avec virgule', 1, '0,5', 'correct', {'s': 5, 'm': 10, 'r': 0.5}),
       spec('σ = 3, n = 400 : 0,15', 1, '0.15', 'correct', {'s': 3, 'm': 20, 'r': 0.15}),
       spec('Erreur : σ/n (σ = 5, n = 100)', 1, '0.05', 'incorrect', {'s': 5, 'm': 10, 'r': 0.5}),
       spec('Erreur : σ (σ = 2, n = 25)', 1, '2', 'incorrect', {'s': 2, 'm': 5, 'r': 0.4})]
    + specs_choix(2, 'divisé par 2', ['divisé par 4', 'multiplié par 2', 'inchangé'],
                  {'s': 2, 'n': 25})))

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
