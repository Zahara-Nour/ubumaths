"""Écrit les 4 modèles du lot 6 « exemples d'algorithmes : fonctions et statistiques » de la
seconde dans scripts/questions/2de-algorithmes-6/.

Phase 0 validée par David le 2026-11-08 (D3 du journal
« docs/wip/questions-2de-demonstrations-progress.md », § 9) : un point par modèle, chacun sur la
sous-notion existante de son point (362 et 387, posés sur une notion : extremums ; tableau croisé
d'effectifs), niveau après ceux déjà présents (relevé prod du 2026-11-09) :

| # | Point | Titre                                                       | Niv. | Nœud du modèle                                    |
| 1 | 2-361 | Approcher un maximum par balayage, en Python                | 3    | Généralités sur les fonctions › extremums         |
| 2 | 2-362 | Longueur approchée d'une portion de courbe, en Python       | 4    | Généralités sur les fonctions › extremums         |
| 3 | 2-387 | Filtrer des individus avec ET, OU, NON, en Python           | 4    | Tableaux croisés › tableau croisé d'effectifs     |
| 4 | 2-388 | Fréquence conditionnelle à partir de deux listes, en Python | 5    | Tableaux croisés › tableau croisé d'effectifs     |

Forme (D3, Q2) : Python seulement ; (a) faire tourner un programme (case), (b) compléter une ligne
(case choix à 4 propositions, la première est la bonne, ordre mélangé à l'affichage), (c)
interpréter. Valeurs calculables à la main.

Variables : jamais `e` ni `E` (constante d'Euler), ni `i`. Jamais `str.format` sur un texte qui
contient `{{eval}}`. Dans le code Python, jamais `{{eval:…;d}}` (il écrirait une virgule).

    python3 docs/wip/questions/lot-2de-algorithmes-6.py scripts/questions/2de-algorithmes-6
"""
import json
import math
import os
import random
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, answer, status, variables=None, violations=None):
    answers = answer if isinstance(answer, list) else [answer]
    expected = {'status': status}
    if violations:
        expected['constraintViolations'] = violations  # une par case en défaut
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in (variables or {}).items()},
            'answers': answers, 'expected': expected}


def modele(nom, title, description, level, variations, specs):
    return nom, {'title': title, 'description': description, 'grades': ['2'],
                 'level': level, 'delay': 90, 'status': 'draft', 'shared': {},
                 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def ev(x):
    return '{{eval:' + x + '}}'


def dec(x):
    """Valeur écrite en décimal (sans `;d`, un quotient reste en fraction)."""
    return '{{eval:' + x + ';d}}'


def decp(x):
    return '{{eval:' + x + ';d;()}}'


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def python(code):
    return '\n\n```python\n' + code + '\n```\n\n'


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + l + '\n' for l in lignes) + '```'


def selon(nom, valeurs):
    """`{{if:nom==1|v1|{{if:nom==2|v2|…}}}}` : valeur choisie par l'indice `nom` (1, 2, …)."""
    out = valeurs[-1]
    for k in range(len(valeurs) - 1, 0, -1):
        out = '{{if:' + nom + '==' + str(k) + '|' + valeurs[k - 1] + '|' + out + '}}'
    return out


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

# --- 1. 2-361 : approcher un maximum par balayage -----------------------------------------------

BALAYAGE = ('def f(x):\n'
            '    return -x**2 + S*x\n'
            '\n'
            'def maximum(a, pas):\n'
            '    x = a\n'
            '    while COND:\n'
            '        x = x + pas\n'
            '    return x')
COND = 'f(x + pas) > f(x)'
S_PY = ev('q') + '.' + ev('u')  # s écrit avec un point dans le code Python

# f(x) = −x² + s·x, s = q + u/10 (u pair, non nul) : maximum en s/2, jamais un demi-entier, donc
# jamais d'égalité f(x + 1) = f(x) pour x entier. Le balayage de pas 1 depuis 0 s'arrête au premier
# entier r tel que f(r + 1) ⩽ f(r), l'entier le plus proche de s/2 : r = floor((s + 1)/2).
VARS_F = [var('q', '2..8'), var('u', '2|4|6|8'), var('s', 'eval:q+u/10'),
          var('r', 'eval:floor((s+1)/2)')]


def fx(t):
    return dec('-(' + t + ')^2+s*(' + t + ')')


INTRO_F = ('La fonction $f$ est définie sur $[0\\,;5]$ par $f(x)=-x^2+' + dec('s') + 'x$. D\'après son'
           ' tableau de variations, $f$ est croissante, puis décroissante sur $[0\\,;5]$.')

V361_TOURNER = case(
    INTRO_F + ' On considère le programme Python suivant.'
    + python(BALAYAGE.replace('S', S_PY).replace('COND', COND))
    + 'Que renvoie l\'appel `maximum(0, 1)` ?\n\n$?$',
    VARS_F, ev('r'),
    ['La boucle avance $x$ de $1$ en $1$ à partir de $0$, tant que $f(x+1)>f(x)$, c\'est-à-dire'
     ' tant que $f$ augmente encore.',
     'Tant que $x<' + ev('r') + '$, $f(x+1)>f(x)$ : par exemple $f(' + ev('r-1') + ')=' + fx('r-1')
     + '$ et $f(' + ev('r') + ')=' + fx('r') + '$.',
     'Pour $x=' + ev('r') + '$ : $f(' + ev('r+1') + ')=' + fx('r+1') + '$ n\'est pas supérieur à'
     ' $f(' + ev('r') + ')=' + fx('r') + '$, la boucle s\'arrête et l\'appel renvoie $'
     + col(ev('r')) + '$.',
     '$f$ atteint son maximum en $x=\\dfrac{' + dec('s') + '}{2}=' + dec('s/2') + '$ : le balayage de'
     ' pas $1$ en donne une valeur approchée à $1$ près.'])

V361_COMPLETER = ligne(
    'La fonction $f$ est croissante, puis décroissante. La fonction Python `maximum` doit avancer'
    ' $x$ de `pas` en `pas` à partir de `a`, tant que $f$ augmente, pour approcher l\'abscisse où'
    ' $f$ atteint son maximum.'
    + python(BALAYAGE.replace('S', '4.6').replace('COND', '...'))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`' + COND + '`', ['`f(x + pas) < f(x)`', '`f(x) > 0`', '`x + pas > x`'],
    ['Tant que $f$ est croissante, la valeur suivante $f(x+\\text{pas})$ est plus grande que'
     ' $f(x)$ : on avance.',
     'Dès que $f(x+\\text{pas})$ n\'est plus supérieure à $f(x)$, $f$ a cessé de croître : on est'
     ' près du maximum, on s\'arrête.',
     'La condition est donc `' + COND + '`. `f(x + pas) < f(x)` s\'arrêterait tout de suite ;'
     ' `f(x) > 0` cherche où $f$ change de signe ; `x + pas > x` est toujours vraie (la boucle ne'
     ' s\'arrêterait jamais).'])

V361_INTERPRETER = ligne(
    'La fonction $f$ est croissante, puis décroissante. On considère le programme Python suivant.'
    + python(BALAYAGE.replace('S', '4.6').replace('COND', COND))
    + 'On appelle `maximum(0, 0.01)`. Que représente la valeur renvoyée ?',
    [], 'Une valeur approchée, à $0{,}01$ près, de l\'abscisse où $f$ atteint son maximum.',
    ['Une valeur approchée, à $0{,}01$ près, du maximum de $f$.',
     'La valeur exacte de l\'abscisse où $f$ atteint son maximum.',
     'Le premier nombre $x$ à partir de $0$ pour lequel $f(x)$ est négatif.'],
    ['La boucle s\'arrête au premier $x$ (de $0{,}01$ en $0{,}01$) après lequel $f$ ne croît plus :'
     ' le maximum est atteint à moins de $0{,}01$ de ce $x$.',
     'La fonction renvoie `x`, une ABSCISSE, pas la valeur $f(x)$ du maximum. Et c\'est une valeur'
     ' approchée : le pas fixe la précision.',
     'Ici le maximum est atteint en $x=2{,}3$ : l\'appel renvoie environ $' + col('2{,}3') + '$'
     ' (Python peut afficher `2.299999…`, à cause des calculs sur les nombres à virgule).'])

VARS_361 = {'q': 4, 'u': 6, 's': '23/5', 'r': 2}  # s = 4,6 : f(2) = 5,2 > f(3) = 4,8
VARS_361B = {'q': 5, 'u': 2, 's': '26/5', 'r': 3}  # s = 5,2 : maximum en 2,6
VARS_361C = {'q': 2, 'u': 2, 's': '11/5', 'r': 1}  # s = 2,2 : maximum en 1,1
MODELES.append(modele(
    '01-maximum-par-balayage', 'Approcher un maximum par balayage, en Python',
    'f croissante puis décroissante ; maximum(a, pas) avance tant que f(x + pas) > f(x) : valeur'
    ' renvoyée avec un pas de 1, compléter la condition du while, interpréter la valeur renvoyée'
    ' (abscisse du maximum à pas près)',
    3, [V361_TOURNER, V361_COMPLETER, V361_INTERPRETER],
    [spec('s = 4,6 : 2', 0, '2', 'correct', VARS_361),
     spec('Erreur : un pas de trop (3)', 0, '3', 'incorrect', VARS_361),
     spec('Erreur : abscisse exacte 2,3', 0, '2,3', 'incorrect', VARS_361),
     spec('s = 5,2 : 3', 0, '3', 'correct', VARS_361B),
     spec('s = 2,2 : 1', 0, '1', 'correct', VARS_361C)]
    + specs_choix(1, COND, ['f(x + pas) < f(x)', 'f(x) > 0', 'x + pas > x'])
    + specs_choix(2, 'abscisse à 0,01 près', ['maximum de f', 'valeur exacte',
                                             'f(x) négatif'])))

# --- 2. 2-362 : longueur approchée d'une portion de courbe --------------------------------------

LONGUEUR = ('from math import sqrt\n'
            '\n'
            'def f(x):\n'
            '    return F\n'
            '\n'
            'def longueur(a, b, n):\n'
            '    h = (b - a) / n\n'
            '    L = 0\n'
            '    for k in range(n):\n'
            '        x = a + k * h\n'
            '        LIGNE\n'
            '    return L')
LIGNE_L = 'L = L + sqrt(h**2 + (f(x + h) - f(x))**2)'
# (h, w, √(h² + w²)) : f(x) = w(x − c)²/h² + z sur [c − h ; c + h], n = 2. Les points d'abscisses
# c − h, c, c + h sont (c − h ; w + z), (c ; z), (c + h ; w + z) : deux segments de longueur entière.
TRIPLETS = [(3, 4, 5), (4, 3, 5), (6, 8, 10), (8, 6, 10), (5, 12, 13), (12, 5, 13)]
VARS_COURBE = [var('j', '1..' + str(len(TRIPLETS))),
               var('h', selon('j', [str(t[0]) for t in TRIPLETS])),
               var('w', selon('j', [str(t[1]) for t in TRIPLETS])),
               var('L', selon('j', [str(t[2]) for t in TRIPLETS])),
               var('c', '1..4'), var('z', '1..5'),
               var('a', 'eval:c-h'), var('b', 'eval:c+h')]
F_PY = ev('w') + ' * (x - ' + ev('c') + ')**2 / ' + ev('h*h') + ' + ' + ev('z')

V362_TOURNER = case(
    'Pour approcher la longueur de la courbe de $f$ entre les abscisses $a$ et $b$, on la remplace'
    ' par une ligne brisée : on découpe $[a\\,;b]$ en $n$ intervalles de même longueur $h$ et on'
    ' relie les points de la courbe d\'abscisses $a$, $a+h$, $a+2h$, …, $b$. Ici'
    ' $f(x)=\\dfrac{' + ev('w') + '}{' + ev('h*h') + '}(x-' + ev('c') + ')^2+' + ev('z') + '$.'
    + python(LONGUEUR.replace('F', F_PY).replace('LIGNE', LIGNE_L))
    + 'Que renvoie l\'appel `longueur(' + ev('a') + ', ' + ev('b') + ', 2)` ?\n\n$?$',
    VARS_COURBE, ev('2*L'),
    ['$h=\\dfrac{' + ev('b') + '-' + decp('a') + '}{2}=' + ev('h') + '$ : la ligne brisée relie les'
     ' points d\'abscisses $' + ev('a') + '$, $' + ev('c') + '$ et $' + ev('b') + '$.',
     '$f(' + ev('a') + ')=' + ev('w+z') + '$, $f(' + ev('c') + ')=' + ev('z') + '$ et $f('
     + ev('b') + ')=' + ev('w+z') + '$.',
     'Pour $k=0$ : $\\sqrt{' + ev('h') + '^2+(' + ev('z') + '-' + ev('w+z') + ')^2}=\\sqrt{'
     + ev('h*h+w*w') + '}=' + ev('L') + '$ ; pour $k=1$ : $\\sqrt{' + ev('h') + '^2+(' + ev('w+z')
     + '-' + ev('z') + ')^2}=' + ev('L') + '$.',
     'L\'appel renvoie $' + ev('L') + '+' + ev('L') + '=' + col(ev('2*L')) + '$ (Python affiche `'
     + ev('2*L') + '.0`).'])

V362_COMPLETER = ligne(
    'La fonction Python ci-dessous doit approcher la longueur de la courbe de $f$ entre les'
    ' abscisses $a$ et $b$ par celle de la ligne brisée qui relie les points de la courbe'
    ' d\'abscisses $a$, $a+h$, …, $b$, avec $h=\\dfrac{b-a}{n}$.'
    + python(LONGUEUR.replace('F', 'x**2').replace('LIGNE', '...'))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`' + LIGNE_L + '`',
    ['`L = L + sqrt(h**2 + f(x)**2)`', '`L = L + h**2 + (f(x + h) - f(x))**2`',
     '`L = L + sqrt(h + (f(x + h) - f(x)))`'],
    ['Le segment ajouté relie les points $\\big(x\\,;f(x)\\big)$ et $\\big(x+h\\,;f(x+h)\\big)$.',
     'Sa longueur est $\\sqrt{(x+h-x)^2+\\big(f(x+h)-f(x)\\big)^2}=\\sqrt{h^2+\\big(f(x+h)-f(x)'
     '\\big)^2}$ (formule de la distance, ou théorème de Pythagore).',
     'On l\'ajoute à `L` : `' + LIGNE_L + '`. Les autres propositions oublient la racine, les'
     ' carrés, ou prennent $f(x)$ au lieu de l\'écart $f(x+h)-f(x)$.'])

V362_INTERPRETER = ligne(
    'On considère la fonction Python suivante, qui approche la longueur de la courbe de $f$ entre'
    ' les abscisses $a$ et $b$ par celle d\'une ligne brisée à $n$ segments.'
    + python(LONGUEUR.replace('F', 'x**2').replace('LIGNE', LIGNE_L))
    + 'Que se passe-t-il quand on appelle `longueur(0, 2, n)` avec des valeurs de `n` de plus en'
    ' plus grandes ?',
    [], 'La valeur renvoyée se rapproche de la longueur de la courbe de $f$ entre $0$ et $2$.',
    ['La valeur renvoyée se rapproche de l\'aire sous la courbe de $f$ entre $0$ et $2$.',
     'La valeur renvoyée ne change pas : la ligne brisée a toujours la même longueur.',
     'La valeur renvoyée se rapproche de $2$, la longueur de l\'intervalle $[0\\,;2]$.'],
    ['Plus `n` est grand, plus les segments sont courts et plus la ligne brisée « colle » à la'
     ' courbe.',
     'La somme des longueurs des segments se rapproche alors de la $' + col('\\text{longueur de la'
                                                                          ' courbe}') + '$.',
     'Ce n\'est pas une aire (on additionne des longueurs de segments), et la valeur dépend de'
     ' `n` : avec $n=1$, un seul segment, de longueur $\\sqrt{2^2+4^2}=\\sqrt{20}\\approx4{,}47$ ;'
     ' avec $n=2$, $\\sqrt{2}+\\sqrt{10}\\approx4{,}58$.'])

VARS_362 = {'j': 1, 'h': 3, 'w': 4, 'L': 5, 'c': 1, 'z': 2, 'a': -2, 'b': 4}
VARS_362B = {'j': 6, 'h': 12, 'w': 5, 'L': 13, 'c': 3, 'z': 1, 'a': -9, 'b': 15}
MODELES.append(modele(
    '02-longueur-d-une-courbe', 'Longueur approchée d\'une portion de courbe, en Python',
    'longueur(a, b, n) additionne les longueurs des segments d\'une ligne brisée inscrite dans la'
    ' courbe : valeur renvoyée pour n = 2 (longueurs entières), compléter la ligne de la somme,'
    ' interpréter quand n grandit',
    4, [V362_TOURNER, V362_COMPLETER, V362_INTERPRETER],
    [spec('(3, 4, 5) : 10', 0, '10', 'correct', VARS_362),
     spec('Erreur : un seul segment (5)', 0, '5', 'incorrect', VARS_362),
     spec('Erreur : sans racine ni carrés (14)', 0, '14', 'incorrect', VARS_362),
     spec('(12, 5, 13) : 26', 0, '26', 'correct', VARS_362B)]
    + specs_choix(1, LIGNE_L, ['f(x) au lieu de l\'écart', 'sans racine', 'sans carrés'])
    + specs_choix(2, 'longueur de la courbe', ['aire', 'ne change pas', 'longueur de [0 ; 2]'])))

# --- 3. 2-387 : filtrer des individus avec ET, OU, NON ------------------------------------------

N387 = 8
INTRO_LISTES = ('On a relevé, pour {n} élèves, leur moyen de transport (`"bus"` ou `"vélo"`) et'
                ' s\'ils pratiquent un sport en club (`"oui"` ou `"non"`). Les deux listes sont dans'
                ' le même ordre : l\'élève numéro `k` a pour réponses `transport[k]` et `sport[k]`.')
BUS = 'transport[k] == "bus"'
SPORT = 'sport[k] == "oui"'
CONDITIONS = [BUS + ' and ' + SPORT, BUS + ' or ' + SPORT, BUS + ' and not ' + SPORT]
CRITERES = ['viennent en bus ET pratiquent un sport en club',
            'viennent en bus OU pratiquent un sport en club (ou les deux)',
            'viennent en bus ET ne pratiquent PAS de sport en club']


def liste_python(nom, lettre, n, oui, non):
    return (nom + ' = [' + ', '.join('{{if:' + lettre + str(k) + '==1|"' + oui + '"|"' + non
                                     + '"}}' for k in range(1, n + 1)) + ']')


COMPTER = ('def compter(transport, sport):\n'
           '    c = 0\n'
           '    for k in range(len(transport)):\n'
           '        if COND:\n'
           '            c = c + 1\n'
           '    return c')

# tk = 1 : bus ; pk = 1 : sport. ck = 1 si l'élève k est compté, selon la condition o.
VARS_FILTRE = ([var('o', '1..3')] + [var('t' + str(k), '0..1') for k in range(1, N387 + 1)]
               + [var('p' + str(k), '0..1') for k in range(1, N387 + 1)]
               + [var('c' + str(k), selon('o', [ev('t{0}*p{0}'.format(k)),
                                                ev('t{0}+p{0}-t{0}*p{0}'.format(k)),
                                                ev('t{0}*(1-p{0})'.format(k))]))
                  for k in range(1, N387 + 1)]
               + [var('nc', 'eval:' + '+'.join('c' + str(k) for k in range(1, N387 + 1)))])

DETAIL = ' ; '.join('{{if:t' + str(k) + '==1|bus|vélo}}, {{if:p' + str(k) + '==1|oui|non}} : '
                    '{{if:c' + str(k) + '==1|✓|✗}}' for k in range(1, N387 + 1))

V387_TOURNER = case(
    INTRO_LISTES.replace('{n}', str(N387))
    + python(liste_python('transport', 't', N387, 'bus', 'vélo') + '\n'
             + liste_python('sport', 'p', N387, 'oui', 'non') + '\n\n'
             + COMPTER.replace('COND', selon('o', CONDITIONS)))
    + 'Que renvoie l\'appel `compter(transport, sport)` ?\n\n$?$',
    VARS_FILTRE, ev('nc'),
    ['La fonction compte les élèves qui ' + selon('o', CRITERES) + '.',
     'Élève par élève (✓ : compté) : ' + DETAIL + '.',
     'L\'appel renvoie $' + col(ev('nc')) + '$.'])

V387_COMPLETER = ligne(
    INTRO_LISTES.replace('{n}', '30')
    + ' La fonction ci-dessous doit compter les élèves qui viennent en bus ET ne pratiquent PAS de'
    ' sport en club.'
    + python(COMPTER.replace('COND', '...'))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`' + CONDITIONS[2] + '`',
    ['`' + BUS + ' or not ' + SPORT + '`', '`not ' + BUS + ' and ' + SPORT + '`',
     '`' + BUS + ' and ' + SPORT + '`'],
    ['« Ne pratique pas de sport en club » s\'écrit `not ' + SPORT + '` : `not` contredit le test'
     ' qui le suit.',
     'Les deux critères doivent être vérifiés en même temps : on les relie par `and` (ET), pas par'
     ' `or` (OU).',
     'La condition est donc `' + CONDITIONS[2] + '`. `not ' + BUS + ' and ' + SPORT + '` compte les'
     ' élèves à vélo qui font du sport.'])

V387_INTERPRETER = ligne(
    INTRO_LISTES.replace('{n}', '30') + ' On considère la fonction suivante.'
    + python(COMPTER.replace('COND', CONDITIONS[1]))
    + 'Que renvoie l\'appel `compter(transport, sport)` ?',
    [], 'Le nombre d\'élèves qui viennent en bus, ou qui pratiquent un sport en club, ou les deux.',
    ['Le nombre d\'élèves qui viennent en bus et pratiquent un sport en club.',
     'Le nombre d\'élèves qui viennent en bus ou qui pratiquent un sport en club, mais pas les'
     ' deux.',
     'Le nombre d\'élèves qui viennent en bus, plus le nombre d\'élèves qui pratiquent un sport en'
     ' club.'],
    ['`c` augmente de $1$ pour chaque élève dont la condition `' + CONDITIONS[1] + '` est vraie.',
     'En Python, `A or B` est vrai dès que l\'un des deux est vrai, Y COMPRIS quand les deux le'
     ' sont : c\'est le « ou » inclusif des mathématiques.',
     'Chaque élève est compté une seule fois, même s\'il vient en bus ET fait du sport : ce n\'est'
     ' pas la somme des deux effectifs. La fonction renvoie le $' + col('\\text{nombre d\'élèves qui'
                                                                        ' viennent en bus ou qui'
                                                                        ' font du sport}') + '$.'])


def vars_387(o, t, p):
    v = {'o': o}
    v.update({'t' + str(k + 1): t[k] for k in range(N387)})
    v.update({'p' + str(k + 1): p[k] for k in range(N387)})
    c = [[t[k] * p[k], t[k] + p[k] - t[k] * p[k], t[k] * (1 - p[k])][o - 1] for k in range(N387)]
    v.update({'c' + str(k + 1): c[k] for k in range(N387)})
    v['nc'] = sum(c)
    return v


T387 = [1, 0, 1, 1, 0, 0, 1, 0]
P387 = [1, 1, 0, 1, 0, 1, 0, 0]
# bus : 1, 3, 4, 7 ; sport : 1, 2, 4, 6. ET : 2 ; OU : 6 ; ET NON : 2 (3 et 7)
VARS_387_ET, VARS_387_OU, VARS_387_NON = (vars_387(o, T387, P387) for o in (1, 2, 3))
assert (VARS_387_ET['nc'], VARS_387_OU['nc'], VARS_387_NON['nc']) == (2, 6, 2)
MODELES.append(modele(
    '03-filtrer-et-ou-non', 'Filtrer des individus avec ET, OU, NON, en Python',
    'Deux listes (transport, sport) ; compter(transport, sport) compte les élèves qui vérifient un'
    ' critère : valeur renvoyée (and, or, and not), compléter la condition (ET NON), interpréter or'
    ' (ou inclusif)',
    4, [V387_TOURNER, V387_COMPLETER, V387_INTERPRETER],
    [spec('ET : 2', 0, '2', 'correct', VARS_387_ET),
     spec('OU : 6', 0, '6', 'correct', VARS_387_OU),
     spec('Erreur : OU compté comme somme des effectifs (8)', 0, '8', 'incorrect', VARS_387_OU),
     spec('Erreur : OU exclusif (4)', 0, '4', 'incorrect', VARS_387_OU),
     spec('ET NON : 2', 0, '2', 'correct', VARS_387_NON),
     spec('Erreur : élèves en bus seulement (4)', 0, '4', 'incorrect', VARS_387_NON)]
    + specs_choix(1, CONDITIONS[2], ['or au lieu de and', 'not sur le mauvais test',
                                     'sans not'])
    + specs_choix(2, 'ou inclusif', ['ET', 'ou exclusif', 'somme des effectifs'])))

# --- 4. 2-388 : fréquence conditionnelle à partir de deux listes --------------------------------

N388 = 10
FREQUENCE = ('def frequence(transport, sport):\n'
             '    bus = 0\n'
             '    bus_sport = 0\n'
             '    for k in range(len(transport)):\n'
             '        if transport[k] == "bus":\n'
             '            bus = bus + 1\n'
             '            if sport[k] == "oui":\n'
             '                bus_sport = bus_sport + 1\n'
             '    RETOUR')
RETOUR = 'return bus_sport / bus'


def jeux_388():
    """6 jeux de 10 élèves : 4, 5 ou 8 en bus (fréquence décimale), au moins un sportif parmi eux
    et au moins un non sportif ; fréquences « inverses » distinctes de la bonne."""
    rng = random.Random(388)
    jeux = []
    while len(jeux) < 6:
        t = [rng.randint(0, 1) for _ in range(N388)]
        p = [rng.randint(0, 1) for _ in range(N388)]
        nb = sum(t)
        nbs = sum(a * b for a, b in zip(t, p))
        ns = sum(p)
        if nb not in (4, 5, 8) or not 0 < nbs < nb or ns == nb:
            continue
        if any((nb, nbs) == (j[2], j[3]) for j in jeux):
            continue
        jeux.append((t, p, nb, nbs, ns))
    return jeux


JEUX = jeux_388()
VARS_FREQ = ([var('j', '1..' + str(len(JEUX)))]
             + [var('t' + str(k), selon('j', [str(x[0][k - 1]) for x in JEUX]))
                for k in range(1, N388 + 1)]
             + [var('p' + str(k), selon('j', [str(x[1][k - 1]) for x in JEUX]))
                for k in range(1, N388 + 1)]
             + [var('nb', selon('j', [str(x[2]) for x in JEUX])),
                var('nbs', selon('j', [str(x[3]) for x in JEUX])),
                var('ns', selon('j', [str(x[4]) for x in JEUX]))])

TABLEAU = ('```tableau-croise\n'
           'lignes: bus ; vélo\n'
           'colonnes: sport ; pas de sport\n'
           'bus = ' + ev('nbs') + ' ; ' + ev('nb-nbs') + '\n'
           'vélo = ' + ev('ns-nbs') + ' ; ' + ev(str(N388) + '-nb-ns+nbs') + '\n'
           'coin: Transport \\ Sport\n'
           '```')

V388_TOURNER = case(
    INTRO_LISTES.replace('{n}', str(N388))
    + python(liste_python('transport', 't', N388, 'bus', 'vélo') + '\n'
             + liste_python('sport', 'p', N388, 'oui', 'non') + '\n\n'
             + FREQUENCE.replace('RETOUR', RETOUR))
    + 'Que renvoie l\'appel `frequence(transport, sport)` ?\n\n$?$',
    VARS_FREQ, dec('nbs/nb'),
    ['Le tableau croisé des deux listes :', TABLEAU,
     '`bus` compte les élèves qui viennent en bus : $' + ev('nb') + '$ ; `bus_sport` compte, parmi'
     ' eux, ceux qui pratiquent un sport en club : $' + ev('nbs') + '$.',
     'L\'appel renvoie $\\dfrac{' + ev('nbs') + '}{' + ev('nb') + '}=' + col(dec('nbs/nb')) + '$ :'
     ' la fréquence des sportifs PARMI les élèves qui viennent en bus.'])

V388_COMPLETER = ligne(
    INTRO_LISTES.replace('{n}', '30')
    + ' La fonction ci-dessous doit renvoyer la fréquence des élèves qui pratiquent un sport en club'
    ' parmi ceux qui viennent en bus.'
    + python(FREQUENCE.replace('RETOUR', '...'))
    + 'Que faut-il écrire à la place des points de suspension ?',
    [], '`' + RETOUR + '`',
    ['`return bus_sport / len(transport)`', '`return bus / bus_sport`',
     '`return bus / len(transport)`'],
    ['« Parmi ceux qui viennent en bus » : l\'effectif de référence est le nombre d\'élèves qui'
     ' viennent en bus, `bus`.',
     'On divise l\'effectif des élèves qui viennent en bus ET font du sport, `bus_sport`, par cet'
     ' effectif de référence : `' + RETOUR + '`.',
     '`bus_sport / len(transport)` donne la fréquence parmi TOUS les élèves ; `bus / len(transport)`'
     ' la fréquence (marginale) des élèves qui viennent en bus ; `bus / bus_sport` est supérieur à'
     ' $1$.'])

V388_INTERPRETER = ligne(
    INTRO_LISTES.replace('{n}', '30') + ' On considère la fonction suivante.'
    + python(FREQUENCE.replace('RETOUR', RETOUR))
    + 'Que renvoie l\'appel `frequence(transport, sport)` ?',
    [], 'La fréquence des élèves qui pratiquent un sport en club parmi ceux qui viennent en bus.',
    ['La fréquence des élèves qui viennent en bus parmi ceux qui pratiquent un sport en club.',
     'La fréquence des élèves qui viennent en bus et pratiquent un sport en club, parmi tous les'
     ' élèves.',
     'La fréquence des élèves qui viennent en bus, parmi tous les élèves.'],
    ['`bus` ne compte que les élèves qui viennent en bus ; `bus_sport` compte, PARMI EUX, ceux qui'
     ' font du sport (le second `if` est dans le premier).',
     'La fonction divise `bus_sport` par `bus` : l\'effectif de référence est celui des élèves qui'
     ' viennent en bus, pas l\'effectif total.',
     'C\'est la $' + col('\\text{fréquence des sportifs parmi les élèves qui viennent en bus}')
     + '$ (fréquence conditionnelle). L\'inverse, « bus parmi les sportifs », diviserait par le'
     ' nombre de sportifs.'])


def vars_388(j):
    t, p, nb, nbs, ns = JEUX[j - 1]
    v = {'j': j}
    v.update({'t' + str(k + 1): t[k] for k in range(N388)})
    v.update({'p' + str(k + 1): p[k] for k in range(N388)})
    v.update({'nb': nb, 'nbs': nbs, 'ns': ns})
    return v


def decimal_fr(x):
    return ('%g' % x).replace('.', ',')


SPECS_388 = []
for j in (1, 2):
    t, p, nb, nbs, ns = JEUX[j - 1]
    SPECS_388.append(spec('Jeu ' + str(j) + ' : ' + str(nbs) + '/' + str(nb), 0,
                          decimal_fr(nbs / nb), 'correct', vars_388(j)))
    SPECS_388.append(spec('Jeu ' + str(j) + ' : erreur, parmi tous les élèves', 0,
                          decimal_fr(nbs / N388), 'incorrect', vars_388(j)))
    SPECS_388.append(spec('Jeu ' + str(j) + ' : erreur, bus parmi les sportifs', 0,
                          '\\frac{' + str(nbs) + '}{' + str(ns) + '}', 'incorrect',
                          vars_388(j)))
MODELES.append(modele(
    '04-frequence-conditionnelle-listes', 'Fréquence conditionnelle à partir de deux listes, en'
    ' Python',
    'Deux listes (transport, sport) ; frequence(transport, sport) renvoie la fréquence des sportifs'
    ' parmi les élèves venant en bus : valeur renvoyée (tableau croisé en correction), compléter'
    ' le return, interpréter (conditionnelle, pas l\'inverse)',
    5, [V388_TOURNER, V388_COMPLETER, V388_INTERPRETER],
    SPECS_388
    + specs_choix(1, RETOUR, ['parmi tous les élèves', 'quotient inversé', 'fréquence marginale'])
    + specs_choix(2, 'sportifs parmi les élèves en bus', ['bus parmi les sportifs',
                                                         'parmi tous les élèves',
                                                         'fréquence marginale'])))

for t, p, nb, nbs, ns in JEUX:
    assert nbs / nb != nbs / ns and nbs / nb != nbs / N388
    assert math.isclose(round(nbs / nb, 3), nbs / nb)

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
