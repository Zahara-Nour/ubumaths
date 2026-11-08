"""Écrit les 5 modèles du lot 12 « algorithmes : probabilités et statistiques » de la 1re spé
dans scripts/questions/1spe-algorithmes-12/.

Phase 0 validée par David le 2026-11-06 (D9 du journal
« docs/archive/wip/questions-1spe-demonstrations-progress.md », § 15) ; contenu et rangement validés le
2026-11-08 (D12, « je te suis » : proposition du § 18 et recommandations), un point par modèle,
chacun sur une sous-notion existante :

| # | Point    | Titre                                         | Niv. | Nœud du modèle                                     |
| 1 | 1SPE-344 | Aire sous la parabole par Monte-Carlo         | 2    | Échantillonnage › simulation                       |
| 2 | 1SPE-427 | Estimation de π par Monte-Carlo               | 3    | Échantillonnage › simulation                       |
| 3 | 1SPE-359 | Espérance avec Python                         | 5    | Variables aléatoires › espérance                   |
| 4 | 1SPE-431 | Variance et écart type avec Python            | 5    | Variables aléatoires › variance et écart-type      |
| 5 | 1SPE-360 | Fréquence d'une lettre dans un texte          | 6    | Représenter des données › effectifs et fréquences  |

Forme (D9, Q2) : Python seulement ; (a) faire tourner (case), (b) compléter une ligne (case choix à
4 propositions, la première est la bonne, ordre mélangé à l'affichage), (c) interpréter. Un
programme aléatoire n'est jamais « faites-le tourner » : pour Monte-Carlo, la case porte sur un
décompte DONNÉ. Dans le code Python, jamais `{{eval:…;d}}` (il écrirait une virgule) : les
probabilités s'écrivent `0.{{eval:a}}`.

Variables : jamais `e` ni `E` (constante d'Euler), ni `i`.

    python3 docs/wip/questions/lot-1spe-algorithmes-12.py scripts/questions/1spe-algorithmes-12
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, answer, status, variables=None):
    answers = answer if isinstance(answer, list) else [answer]
    expected = {'status': status}
    if status == 'bad_form':
        # Valeur juste écrite en fraction : la valeur renvoyée par Python est un décimal
        expected['constraintViolations'] = ['form']
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in (variables or {}).items()},
            'answers': answers, 'expected': expected}


def modele(nom, title, description, level, variations, specs):
    return nom, {'title': title, 'description': description, 'grades': ['1_SPE'],
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


def selon(nom, valeurs):
    """`{{if:nom==1|v1|{{if:nom==2|v2|…}}}}` : valeur choisie par l'indice `nom` (1, 2, …)."""
    out = valeurs[-1]
    for k in range(len(valeurs) - 1, 0, -1):
        out = '{{if:' + nom + '==' + str(k) + '|' + valeurs[k - 1] + '|' + out + '}}'
    return out


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

# --- 1. 1SPE-344 : Monte-Carlo, aire sous la parabole -------------------------------------------

# Gabarits remplis par replace, pas par format : format mangerait les accolades de {{eval:…}}
MONTE_CARLO = ('from random import random\n'
               '\n'
               'def {nom}(n):\n'
               '    c = 0\n'
               '    for k in range(n):\n'
               '        x = random()\n'
               '        y = random()\n'
               '        if {condition}:\n'
               '            c = c + 1\n'
               '    {retour}')
PARABOLE = (MONTE_CARLO.replace('{nom}', 'aire').replace('{retour}', 'return c / n'))
COND_PARABOLE = 'y <= x**2'
INTRO_PARABOLE = ('On note $\\mathcal{D}$ le domaine du carré $[0\\,;1]\\times[0\\,;1]$ situé sous la'
                  ' parabole d\'équation $y=x^2$ (entre la parabole, l\'axe des abscisses et la droite'
                  ' d\'équation $x=1$). `random()` renvoie un nombre au hasard dans $[0\\,;1[$ : le'
                  ' point $(x\\,;y)$ est donc pris au hasard dans le carré.')

V344_DECOMPTE = case(
    INTRO_PARABOLE + python(PARABOLE.replace('{condition}', COND_PARABOLE))
    + 'Le programme tire des points au hasard : on ne peut pas prévoir ce que renvoie'
    ' `aire(10000)`. Lors d\'un appel `aire(10000)`, $' + ev('c') + '$ des $10\\,000$ points tirés'
    ' vérifient la condition du `if`. Quelle valeur cet appel renvoie-t-il ?\n\n$?$',
    [var('c', '3200..3450')],
    evd('c/10000'),
    ['`c` compte les points tirés qui vérifient la condition : à la fin, `c` vaut $' + ev('c')
     + '$.',
     'La fonction renvoie `c / n`, avec `n` égal à $10\\,000$.',
     'L\'appel renvoie $\\dfrac{' + ev('c') + '}{10\\,000}=' + col(evd('c/10000')) + '$.'])

V344_LIGNE = ligne(
    INTRO_PARABOLE + ' La fonction ci-dessous doit renvoyer la proportion des $n$ points tirés qui'
    ' sont dans $\\mathcal{D}$.'
    + python(PARABOLE.replace('{condition}', '...'))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`' + COND_PARABOLE + '`', ['`y >= x**2`', '`x <= y**2`', '`y <= 2 * x`'],
    ['Le point $(x\\,;y)$ du carré est dans $\\mathcal{D}$ quand il est sous la parabole, c\'est-à-dire'
     ' quand son ordonnée est inférieure à $x^2$.',
     'En Python, `**` est la puissance : $x^2$ s\'écrit `x**2` (et non `2 * x`).',
     'La condition est donc `' + COND_PARABOLE + '`.'])

V344_INTERPRETER = ligne(
    INTRO_PARABOLE + python(PARABOLE.replace('{condition}', COND_PARABOLE))
    + 'Pour $n$ grand, de quoi la valeur renvoyée par `aire(n)` est-elle une estimation ?',
    [], 'De l\'aire du domaine $\\mathcal{D}$.',
    ['De l\'aire du domaine situé au-dessus de la parabole dans le carré.',
     'Du nombre de points situés sous la parabole.', 'De l\'aire du carré.'],
    ['`aire(n)` renvoie la proportion des points tirés qui sont sous la parabole.',
     'Les points sont pris au hasard dans le carré, d\'aire $1$ : pour $n$ grand, cette'
     ' proportion est proche de $\\dfrac{\\text{aire de }\\mathcal{D}}{\\text{aire du carré}}'
     '=\\text{aire de }\\mathcal{D}$.',
     'La valeur renvoyée est une estimation de $' + col('\\text{l\'aire de }\\mathcal{D}') + '$.',
     'On démontrera en terminale que cette aire vaut $\\dfrac{1}{3}$ : les valeurs renvoyées en'
     ' sont proches.'])

MODELES.append(modele(
    '01-aire-sous-la-parabole', 'Aire sous la parabole par Monte-Carlo',
    'Méthode de Monte-Carlo pour l\'aire sous y = x² dans le carré unité : valeur renvoyée pour un'
    ' décompte donné, compléter la condition y <= x**2, dire de quoi la valeur est une estimation',
    2, [V344_DECOMPTE, V344_LIGNE, V344_INTERPRETER],
    [spec('c = 3312 : 0,3312', 0, '0.3312', 'correct', {'c': 3312}),
     spec('c = 3312 : 0,3312 avec virgule', 0, '0,3312', 'correct', {'c': 3312}),
     spec('c = 3312 : fraction, Python renvoie un décimal', 0, '\\frac{207}{625}', 'bad_form', {'c': 3312}),
     spec('Erreur : le décompte au lieu de la proportion', 0, '3312', 'incorrect', {'c': 3312}),
     spec('c = 3400 : 0,34', 0, '0.34', 'correct', {'c': 3400})]
    + specs_choix(1, COND_PARABOLE, ['y >= x**2', 'x <= y**2', 'y <= 2 * x'])
    + specs_choix(2, 'aire de D', ['au-dessus', 'nombre de points', 'carré'])))

# --- 2. 1SPE-427 : Monte-Carlo, estimation de π -------------------------------------------------

PI = MONTE_CARLO.replace('{nom}', 'estimation_pi')
COND_PI = 'x**2 + y**2 <= 1'
RETOUR_PI = 'return 4 * c / n'
INTRO_PI = ('Le quart de disque $\\mathcal{Q}$ de centre $O$ et de rayon $1$ situé dans le carré'
            ' $[0\\,;1]\\times[0\\,;1]$ a pour aire $\\dfrac{\\pi}{4}$. `random()` renvoie un nombre au'
            ' hasard dans $[0\\,;1[$ : le point $(x\\,;y)$ est donc pris au hasard dans le carré.')

V427_DECOMPTE = case(
    INTRO_PI + python(PI.replace('{condition}', COND_PI).replace('{retour}', RETOUR_PI))
    + 'Le programme tire des points au hasard : on ne peut pas prévoir ce que renvoie'
    ' `estimation_pi(10000)`. Lors d\'un appel `estimation_pi(10000)`, $' + ev('c')
    + '$ des $10\\,000$ points tirés vérifient la condition du `if`. Quelle valeur cet appel'
    ' renvoie-t-il ?\n\n$?$',
    [var('c', '7800..7900')],
    evd('4*c/10000'),
    ['`c` compte les points tirés qui sont dans $\\mathcal{Q}$ : à la fin, `c` vaut $' + ev('c')
     + '$.',
     'La fonction renvoie `4 * c / n`, avec `n` égal à $10\\,000$.',
     'L\'appel renvoie $\\dfrac{4\\times' + ev('c') + '}{10\\,000}=\\dfrac{' + ev('4*c')
     + '}{10\\,000}=' + col(evd('4*c/10000')) + '$.'])

V427_CONDITION = ligne(
    INTRO_PI + ' La fonction ci-dessous compte les points tirés qui sont dans $\\mathcal{Q}$.'
    + python(PI.replace('{condition}', '...').replace('{retour}', RETOUR_PI))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`' + COND_PI + '`', ['`x + y <= 1`', '`x**2 + y**2 >= 1`', '`x**2 + y**2 <= 4`'],
    ['Le point $M(x\\,;y)$ du carré est dans $\\mathcal{Q}$ quand $OM\\leqslant1$.',
     '$OM=\\sqrt{x^2+y^2}$, donc $OM\\leqslant1$ équivaut à $x^2+y^2\\leqslant1$.',
     'La condition est donc `' + COND_PI + '`.'])

V427_RETOUR = ligne(
    INTRO_PI + ' La fonction ci-dessous doit renvoyer une valeur approchée de $\\pi$.'
    + python(PI.replace('{condition}', COND_PI).replace('{retour}', 'return ...'))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`4 * c / n`', ['`c / n`', '`c / n / 4`', '`4 * n / c`'],
    ['`c / n` est la proportion des points tirés qui sont dans $\\mathcal{Q}$.',
     'Les points sont pris au hasard dans le carré, d\'aire $1$ : pour $n$ grand, cette'
     ' proportion est proche de l\'aire de $\\mathcal{Q}$, $\\dfrac{\\pi}{4}$. Donc'
     ' $\\pi\\approx4\\times\\dfrac{c}{n}$.',
     'On écrit donc `' + RETOUR_PI + '`.'])

MODELES.append(modele(
    '02-estimation-de-pi', 'Estimation de π par Monte-Carlo',
    'Méthode de Monte-Carlo pour π (quart de disque dans le carré unité) : valeur renvoyée pour un'
    ' décompte donné, compléter la condition x**2 + y**2 <= 1, compléter le return 4 * c / n',
    3, [V427_DECOMPTE, V427_CONDITION, V427_RETOUR],
    [spec('c = 7854 : 3,1416', 0, '3.1416', 'correct', {'c': 7854}),
     spec('c = 7854 : 3,1416 avec virgule', 0, '3,1416', 'correct', {'c': 7854}),
     spec('Erreur : sans le facteur 4', 0, '0.7854', 'incorrect', {'c': 7854}),
     spec('c = 7850 : 3,14', 0, '3.14', 'correct', {'c': 7850})]
    + specs_choix(1, COND_PI, ['x + y <= 1', 'x**2 + y**2 >= 1', 'x**2 + y**2 <= 4'])
    + specs_choix(2, RETOUR_PI, ['c / n', 'c / n / 4', '4 * n / c'])))

# --- 3. 1SPE-359 : algorithme renvoyant l'espérance ---------------------------------------------

ESPERANCE = ('def esperance(valeurs, probas):\n'
             '    s = 0\n'
             '    for k in range(len(valeurs)):\n'
             '        {ligne}\n'
             '    return s')
LIGNE_ESPERANCE = 's = s + valeurs[k] * probas[k]'
# Loi à 3 valeurs x1 < x2 < x3, probabilités a/10, b/10, c/10 (comme 1spe-va/06)
LOI = [var('x1', '-4..4'), var('d1', '1..4'), var('d2', '1..4'),
       var('x2', 'eval:x1+d1'), var('x3', 'eval:x2+d2'),
       var('a', '1..8'), var('b', '1..{{eval:9-a}}'), var('c', 'eval:10-a-b'),
       var('S', 'eval:a*x1+b*x2+c*x3')]
APPEL_ESPERANCE = ('esperance([' + ev('x1') + ', ' + ev('x2') + ', ' + ev('x3') + '], [0.'
                   + ev('a') + ', 0.' + ev('b') + ', 0.' + ev('c') + '])')


def par(x):
    """Valeur entière, entre parenthèses si elle est négative (après un signe)."""
    return '{{if:' + x + '<0|(' + ev(x) + ')|' + ev(x) + '}}'


def p(x):
    """Probabilité écrite en LaTeX, décimal à virgule."""
    return evd(x + '/10')


V359_TOURNER = case(
    'On considère la fonction Python suivante.'
    + python(ESPERANCE.replace('{ligne}', LIGNE_ESPERANCE))
    + 'Que renvoie l\'appel `' + APPEL_ESPERANCE + '` ?\n\n$?$',
    LOI,
    evd('S/10'),
    ['La boucle ajoute à `s`, pour chaque valeur, le produit de la valeur par sa probabilité.',
     '$s=' + ev('x1') + '\\times' + p('a') + '+' + par('x2') + '\\times' + p('b') + '+'
     + par('x3') + '\\times' + p('c') + '$.',
     'L\'appel renvoie $' + col(evd('S/10')) + '$, l\'espérance de la loi donnée.'])

V359_LIGNE = ligne(
    'Une variable aléatoire $X$ prend les valeurs de la liste `valeurs`, avec les probabilités de la'
    ' liste `probas` (dans le même ordre). La fonction ci-dessous doit renvoyer l\'espérance de $X$.'
    + python(ESPERANCE.replace('{ligne}', '...'))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`' + LIGNE_ESPERANCE + '`',
    ['`s = valeurs[k] * probas[k]`', '`s = s + valeurs[k]`', '`s = s + probas[k]`'],
    ['$E(X)=x_1\\,p_1+x_2\\,p_2+\\dots+x_n\\,p_n$ : chaque valeur est multipliée par sa probabilité.',
     'Il faut AJOUTER chaque produit à la somme `s` : `s = valeurs[k] * probas[k]` remplacerait'
     ' la somme par le dernier produit.',
     'La ligne est donc `' + LIGNE_ESPERANCE + '`.'])

MODELES.append(modele(
    '03-esperance', 'Espérance avec Python',
    'Fonction esperance(valeurs, probas) : faire tourner sur une loi à trois valeurs, compléter la'
    ' ligne s = s + valeurs[k] * probas[k]',
    5, [V359_TOURNER, V359_LIGNE],
    [spec('[1, 2, 5], [0.2, 0.5, 0.3] : 2,7', 0, '2.7', 'correct',
          {'x1': 1, 'd1': 1, 'd2': 3, 'x2': 2, 'x3': 5, 'a': 2, 'b': 5, 'c': 3, 'S': 27}),
     spec('2,7 avec virgule', 0, '2,7', 'correct',
          {'x1': 1, 'd1': 1, 'd2': 3, 'x2': 2, 'x3': 5, 'a': 2, 'b': 5, 'c': 3, 'S': 27}),
     spec('Erreur : moyenne des valeurs (8/3)', 0, '\\frac{8}{3}', 'incorrect',
          {'x1': 1, 'd1': 1, 'd2': 3, 'x2': 2, 'x3': 5, 'a': 2, 'b': 5, 'c': 3, 'S': 27}),
     spec('[-2, 0, 3], [0.5, 0.3, 0.2] : -0,4', 0, '-0.4', 'correct',
          {'x1': -2, 'd1': 2, 'd2': 3, 'x2': 0, 'x3': 3, 'a': 5, 'b': 3, 'c': 2, 'S': -4})]
    + specs_choix(1, LIGNE_ESPERANCE, ['s = valeurs[k] * probas[k]', 's = s + valeurs[k]',
                                       's = s + probas[k]'])))

# --- 4. 1SPE-431 : algorithme renvoyant la variance ou l'écart type -----------------------------

VARIANCE = ('from math import sqrt\n'
            '\n'
            'def esperance(valeurs, probas):\n'
            '    s = 0\n'
            '    for k in range(len(valeurs)):\n'
            '        s = s + valeurs[k] * probas[k]\n'
            '    return s\n'
            '\n'
            'def variance(valeurs, probas):\n'
            '    m = esperance(valeurs, probas)\n'
            '    v = 0\n'
            '    for k in range(len(valeurs)):\n'
            '        {ligne}\n'
            '    return v\n'
            '\n'
            'def ecart_type(valeurs, probas):\n'
            '    {retour}')
LIGNE_VARIANCE = 'v = v + probas[k] * (valeurs[k] - m)**2'
RETOUR_ECART = 'return sqrt(variance(valeurs, probas))'
INTRO_VA = ('Une variable aléatoire $X$ prend les valeurs de la liste `valeurs`, avec les'
            ' probabilités de la liste `probas` (dans le même ordre).')

# Loi symétrique m − d, m, m + d de probabilités a/10, (10 − 2a)/10, a/10 : E = m, V = 2a·d²/10
V431_TOURNER = case(
    'On considère le programme Python suivant.'
    + python(VARIANCE.replace('{ligne}', LIGNE_VARIANCE).replace('{retour}', RETOUR_ECART))
    + 'Que renvoie l\'appel `variance([' + ev('m-d') + ', ' + ev('m') + ', ' + ev('m+d') + '], [0.'
    + ev('a') + ', 0.' + ev('b') + ', 0.' + ev('a') + '])` ?\n\n$?$',
    [var('m', '0..6'), var('d', '1..4'), var('a', '1..4'), var('b', 'eval:10-2*a'),
     var('V', 'eval:2*a*d^2')],
    evd('V/10'),
    ['`m` reçoit l\'espérance : $' + ev('m-d') + '\\times' + p('a') + '+' + ev('m') + '\\times'
     + p('b') + '+' + ev('m+d') + '\\times' + p('a') + '=' + ev('m') + '$.',
     'La boucle ajoute, pour chaque valeur, sa probabilité fois le carré de son écart à `m` :'
     ' $v=' + p('a') + '\\times(-' + ev('d') + ')^2+' + p('b') + '\\times0^2+' + p('a') + '\\times'
     + ev('d') + '^2$.',
     'L\'appel renvoie $' + col(evd('V/10')) + '$, la variance de la loi donnée.'])

V431_LIGNE = ligne(
    INTRO_VA + ' La fonction `variance` doit renvoyer la variance de $X$.'
    + python(VARIANCE.replace('{ligne}', '...').replace('{retour}', RETOUR_ECART))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`' + LIGNE_VARIANCE + '`',
    ['`v = v + (valeurs[k] - m)**2`', '`v = v + probas[k] * (valeurs[k] - m)`',
     '`v = v + probas[k] * valeurs[k]**2 - m`'],
    ['$V(X)=p_1(x_1-m)^2+p_2(x_2-m)^2+\\dots+p_n(x_n-m)^2$, où $m=E(X)$.',
     'Chaque carré d\'écart à $m$ est multiplié par sa probabilité ; sans le carré, la somme'
     ' vaudrait toujours $0$.',
     'La ligne est donc `' + LIGNE_VARIANCE + '`.'])

V431_ECART = ligne(
    INTRO_VA + ' La fonction `ecart_type` doit renvoyer l\'écart type de $X$.'
    + python(VARIANCE.replace('{ligne}', LIGNE_VARIANCE).replace('{retour}', 'return ...'))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`sqrt(variance(valeurs, probas))`',
    ['`variance(valeurs, probas)**2`', '`sqrt(esperance(valeurs, probas))`',
     '`variance(valeurs, probas) / 2`'],
    ['L\'écart type est la racine carrée de la variance : $\\sigma(X)=\\sqrt{V(X)}$.',
     '`sqrt`, importée du module `math`, calcule la racine carrée.',
     'On écrit donc `' + RETOUR_ECART + '`.'])

MODELES.append(modele(
    '04-variance-et-ecart-type', 'Variance et écart type avec Python',
    'Fonctions variance et ecart_type : faire tourner variance sur une loi symétrique à trois'
    ' valeurs, compléter la ligne v = v + probas[k] * (valeurs[k] - m)**2, compléter le return'
    ' sqrt(variance(valeurs, probas))',
    5, [V431_TOURNER, V431_LIGNE, V431_ECART],
    [spec('[1, 3, 5], [0.2, 0.6, 0.2] : 1,6', 0, '1.6', 'correct',
          {'m': 3, 'd': 2, 'a': 2, 'b': 6, 'V': 16}),
     spec('1,6 avec virgule', 0, '1,6', 'correct', {'m': 3, 'd': 2, 'a': 2, 'b': 6, 'V': 16}),
     spec('Erreur : écart type au lieu de la variance', 0, '\\sqrt{1.6}', 'incorrect',
          {'m': 3, 'd': 2, 'a': 2, 'b': 6, 'V': 16}),
     spec('[2, 3, 4], [0.4, 0.2, 0.4] : 0,8', 0, '0.8',
          'correct', {'m': 3, 'd': 1, 'a': 4, 'b': 2, 'V': 8})]
    + specs_choix(1, LIGNE_VARIANCE, ['sans probas[k]', 'sans le carré', 'valeurs[k]**2 - m'])
    + specs_choix(2, RETOUR_ECART, ['variance au carré', 'racine de l\'espérance',
                                    'variance / 2'])))

# --- 5. 1SPE-360 : fréquence d'une lettre dans un texte -----------------------------------------

FREQUENCE = ('def frequence(texte, lettre):\n'
             '    c = 0\n'
             '    for car in texte:\n'
             '        if car == lettre:\n'
             '            c = c + 1\n'
             '    {retour}')
RETOUR_FREQUENCE = 'return c / len(texte)'
# (mot, lettre, nombre d'apparitions, longueur) : fréquences décimales exactes
MOTS = [('papa', 'a', 2, 4), ('maman', 'm', 2, 5), ('kayak', 'k', 2, 5), ('radar', 'd', 1, 5),
        ('chocolat', 'o', 2, 8), ('papillon', 'i', 1, 8), ('tatouage', 't', 2, 8),
        ('assassin', 's', 4, 8)]
MOT = selon('j', [m[0] for m in MOTS])
LETTRE = selon('j', [m[1] for m in MOTS])

V360_TOURNER = case(
    'On considère la fonction Python suivante.'
    + python(FREQUENCE.replace('{retour}', RETOUR_FREQUENCE))
    + 'Que renvoie l\'appel `frequence("' + MOT + '", "' + LETTRE + '")` ?\n\n$?$',
    [var('j', '1..' + str(len(MOTS))),
     var('c', selon('j', [str(m[2]) for m in MOTS])),
     var('L', selon('j', [str(m[3]) for m in MOTS]))],
    evd('c/L'),
    ['La boucle parcourt les caractères de « ' + MOT + ' » et compte ceux égaux à « ' + LETTRE
     + ' » : `c` vaut $' + ev('c') + '$.',
     '`len("' + MOT + '")` est le nombre de caractères du texte : $' + ev('L') + '$.',
     'L\'appel renvoie $\\dfrac{' + ev('c') + '}{' + ev('L') + '}=' + col(evd('c/L')) + '$.'])

V360_LIGNE = ligne(
    'La fonction Python ci-dessous doit renvoyer la fréquence de la lettre `lettre` dans le texte'
    ' `texte`.'
    + python(FREQUENCE.replace('{retour}', 'return ...'))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`c / len(texte)`', ['`c / 26`', '`len(texte) / c`', '`c`'],
    ['`c` est le nombre d\'apparitions de `lettre` dans le texte, c\'est-à-dire son effectif.',
     'La fréquence est l\'effectif divisé par l\'effectif total, ici le nombre de caractères du'
     ' texte, `len(texte)` (et non $26$, le nombre de lettres de l\'alphabet).',
     'On écrit donc `' + RETOUR_FREQUENCE + '`.'])

V360_INTERPRETER = ligne(
    'On considère la fonction Python suivante, appelée avec une phrase, par exemple'
    ' `frequence("la mer est belle", "e")`.'
    + python(FREQUENCE.replace('{retour}', RETOUR_FREQUENCE))
    + 'Que représente la valeur renvoyée ?',
    [], 'La proportion des caractères du texte, espaces compris, égaux à `lettre`.',
    ['Le nombre de fois où `lettre` apparaît dans le texte.',
     'Le pourcentage des caractères du texte égaux à `lettre`.',
     'La proportion des lettres du texte, espaces non compris, égales à `lettre`.'],
    ['`c` compte les caractères égaux à `lettre` ; la fonction renvoie `c` divisé par `len(texte)`'
     ' : c\'est une proportion, entre $0$ et $1$ (pas un pourcentage).',
     '`len(texte)` compte TOUS les caractères, espaces et ponctuation compris : pour'
     ' « la mer est belle », $16$ caractères dont $3$ espaces.',
     'La valeur renvoyée est $' + col('\\text{la proportion des caractères, espaces compris,'
                                      ' égaux à la lettre}') + '$ : ici $\\dfrac{4}{16}=0{,}25$.'])

MODELES.append(modele(
    '05-frequence-des-lettres', 'Fréquence d\'une lettre dans un texte',
    'Fonction frequence(texte, lettre) : faire tourner sur un mot court, compléter le return'
    ' c / len(texte), interpréter la valeur renvoyée (proportion des caractères, espaces compris)',
    6, [V360_TOURNER, V360_LIGNE, V360_INTERPRETER],
    [spec('papa, a : 0,5', 0, '0.5', 'correct', {'j': 1, 'c': 2, 'L': 4}),
     spec('papa, a : 0,5 avec virgule', 0, '0,5', 'correct', {'j': 1, 'c': 2, 'L': 4}),
     spec('papa, a : 1/2, Python renvoie un décimal', 0, '\\frac{1}{2}', 'bad_form', {'j': 1, 'c': 2, 'L': 4}),
     spec('Erreur : effectif au lieu de la fréquence', 0, '2', 'incorrect',
          {'j': 1, 'c': 2, 'L': 4}),
     spec('papillon, i : 0,125', 0, '0.125', 'correct', {'j': 6, 'c': 1, 'L': 8})]
    + specs_choix(1, RETOUR_FREQUENCE, ['c / 26', 'len(texte) / c', 'c'])
    + specs_choix(2, 'proportion des caractères', ['nombre', 'pourcentage',
                                                  'espaces non compris'])))

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
