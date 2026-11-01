"""Écrit les 6 modèles du lot 4b du CM1 (calcul posé) dans scripts/questions/cm1-4b/.

Phase 0 du 2026-11-01 (§ 13 du journal `docs/wip/questions-cm1-progress.md`), validée par David
(« go », § 13 bis) : 1. le bloc pose l'opération, l'élève effectue (limite acceptée ; le corrigé
commence par « on aligne les virgules ») ; 2. soustraction : deux modèles, compensation et
cassage, comme au CE1 ; 3. 050 et 165 rangés sous « Décimaux : calculs › addition » et
« › soustraction » (leur point est sur la notion).
Bornes : `cycle3.json`, CM1-050 (deux décimales au plus, entiers mêlés, trois termes :
56,75 + 234 + 0,8), 165 (34,5 − 2,58), 051 (876 × 208, produit ≤ 999 999), 052 (entier 2 à 9,
deux décimales au plus : 7 × 46,55 ; 8 × 17,3), 053 (diviseur 2 à 9, dividende de cinq chiffres
au plus : 9 456 ÷ 7). Un point par modèle ; le nœud et le tag sont posés par la migration de
rangement, après le `--publier`.

Décisions et pièges :
- patrons : `lot-ce1-6.py` (addition et soustractions posées, une par méthode),
  `lot-6-calcul-decimal.py` (division euclidienne posée, deux cases quotient + reste) ;
- case d'opération SANS `expectedAnswer` : le bloc calcule la réponse (`blanks: []`) ;
- décimaux tirés en entiers (centièmes `C`, dixièmes `T`) puis affichés par `{{eval:…;d}}` :
  aucun calcul en flottant dans les conditions ;
- deux décimales voulues → `mod(C,10) != 0` (sinon 45,70 s'afficherait 45,7) ;
- soustraction : le premier terme le plus grand (exigé par le bloc) ;
- niveaux : catégories neuves « … / Calcul posé » (aucun modèle en prod ni dans les lots écrits,
  relevé du 2026-11-01), donc niveaux 1 (et 2 pour le cassage) ; la phase 0 numérotait par nœud,
  à tort : le niveau se compte dans la catégorie (`theme`, `domain`, `subdomain`).

    python3 docs/wip/questions/lot-cm1-4b.py scripts/questions/cm1-4b
"""

import json
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(title, description, theme, domain, level, variations, specs, delay=180):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (nœud du point) est posé par la migration
    return {'title': title, 'description': description, 'grades': ['CM1'], 'theme': theme,
            'domain': domain, 'subdomain': 'Calcul posé', 'level': level, 'delay': delay,
            'status': 'draft', 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, etapes, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = []
    v['correction'] = {'steps': etapes}
    return v


def ev(x):
    return '{{eval:' + x + '}}'


def dec(x):
    """Nombre décimal affiché : `{{eval:C/100;d}}`."""
    return '{{eval:' + x + ';d}}'


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def fr(x):
    """Nombre écrit à la française (virgule, espaces de milliers) : réponses des specs."""
    s = f'{x:,.2f}' if isinstance(x, float) else f'{x:,}'
    if isinstance(x, float):
        s = s.rstrip('0').rstrip('.')
    return s.replace(',', ' ').replace('.', ',')


POSE = 'Pose et calcule.\n\n```operation\ncalcul: '
VIRGULES = ('On aligne les virgules : centièmes sous centièmes, dixièmes sous dixièmes, unités sous'
            ' unités.')
COMME_ENTIERS = ('On calcule comme avec des nombres entiers, colonne par colonne, en partant de la'
                 ' droite ; la virgule du résultat se place sous les autres virgules.')

# ---- 1. Addition posée de décimaux (CM1-050) ----

# Retenue des centièmes vers les dixièmes, entre deux nombres à deux décimales C et D
RC = 'floor((mod(C,10)+mod(D,10))/10)'


def centiemes(a, b):
    """Étape des centièmes : `a`, `b` chiffres des centièmes (expressions)."""
    return ('Centièmes : $' + ev(a) + ' + ' + ev(b) + ' = ' + ev(a + '+' + b) + '${{if:' + a + '+'
            + b + '>=10| : on écrit $' + ev(a + '+' + b + '-10') + '$ et on retient $1$ aux'
            ' dixièmes.|.}}')


ADD_DEUX_DECIMALES = variation(
    POSE + dec('C/100') + ' + ' + dec('D/100') + '\n```',
    [var('C', '1001..9999'), var('D', '1001..9999')],
    [VIRGULES, centiemes('mod(C,10)', 'mod(D,10)'), COMME_ENTIERS,
     '$$' + dec('C/100') + ' + ' + dec('D/100') + ' = ' + col(dec('(C+D)/100')) + '$$'],
    ['mod(C,10) != 0', 'mod(D,10) != 0', 'mod(C,10) + mod(D,10) >= 10', 'C >= D'])

# BO : 34,5 + 2,58 (le premier n'a pas de centièmes)
ADD_DECIMALES_DIFFERENTES = variation(
    POSE + dec('T/10') + ' + ' + dec('D/100') + '\n```',
    [var('T', '11..999'), var('D', '101..9999')],
    [VIRGULES, '$' + dec('T/10') + '$ n\'a pas de centièmes : sa case des centièmes reste vide,'
     ' elle compte pour $0$ (on peut penser $' + dec('T/10') + '0$).',
     'Centièmes : $0 + ' + ev('mod(D,10)') + ' = ' + ev('mod(D,10)') + '$.', COMME_ENTIERS,
     '$$' + dec('T/10') + ' + ' + dec('D/100') + ' = ' + col(dec('(10*T+D)/100')) + '$$'],
    ['mod(T,10) != 0', 'mod(D,10) != 0', '10*T > D'])

# Entier + décimal : 234 + 5,68
ADD_ENTIER = variation(
    POSE + '{{n}} + ' + dec('D/100') + '\n```',
    [var('n', '101..999'), var('D', '101..9999')],
    [VIRGULES, '${{n}}$ est un nombre entier : sa virgule, qu\'on n\'écrit pas, est juste après'
     ' le chiffre des unités. Ses chiffres se posent sous les unités, les dizaines, les centaines'
     ' (on peut penser ${{n}}{,}00$).', COMME_ENTIERS,
     '$${{n}} + ' + dec('D/100') + ' = ' + col(dec('(100*n+D)/100')) + '$$'],
    ['mod(D,10) != 0'])

# BO : 56,75 + 234 + 0,8 (trois termes, un entier, un dixième)
ADD_TROIS_TERMES = variation(
    POSE + dec('C/100') + ' + {{n}} + 0,{{t}}\n```',
    [var('C', '1001..9999'), var('n', '101..999'), var('t', '1..9')],
    [VIRGULES + ' ${{n}}$ est entier : sa virgule est juste après son chiffre des unités.',
     'Centièmes : seul $' + dec('C/100') + '$ en a : $' + ev('mod(C,10)') + '$.',
     'Dixièmes : $' + ev('mod(floor(C/10),10)') + ' + {{t}} = ' + ev('mod(floor(C/10),10)+t')
     + '${{if:mod(floor(C/10),10)+t>=10| : on écrit $' + ev('mod(floor(C/10),10)+t-10')
     + '$ et on retient $1$ aux unités.|.}}', COMME_ENTIERS,
     '$$' + dec('C/100') + ' + {{n}} + ' + dec('t/10') + ' = ' + col(dec('(C+100*n+10*t)/100')) + '$$'],
    ['mod(C,10) != 0'])


def sans_retenue_cent(*termes):
    """Retenue oubliée : chaque colonne réduite à son chiffre des unités (termes en centièmes)."""
    res, rang = 0, 1
    while any(t // rang for t in termes):
        res += sum(t // rang % 10 for t in termes) % 10 * rang
        rang *= 10
    return res / 100


SPECS_ADDITION = [
    spec('45,78 + 26,57 = 72,35', 0, {'C': 4578, 'D': 2657}, '72,35', 'correct'),
    spec('Erreur : retenues oubliées, 45,78 + 26,57 = 61,25', 0, {'C': 4578, 'D': 2657},
         fr(sans_retenue_cent(4578, 2657)), 'incorrect'),
    spec('BO : 34,5 + 2,58 = 37,08', 1, {'T': 345, 'D': 258}, '37,08', 'correct'),
    spec('Erreur : chiffres alignés à droite, 345 + 258 → 6,03', 1, {'T': 345, 'D': 258}, '6,03',
         'incorrect'),
    spec('Erreur : 34,5 + 2,58 = 36,13 (5 + 58 dans les décimales)', 1, {'T': 345, 'D': 258},
         '36,13', 'incorrect'),
    spec('234 + 5,68 = 239,68', 2, {'n': 234, 'D': 568}, '239,68', 'correct'),
    spec('Erreur : 234 posé sous les décimales, 2,34 + 5,68 = 8,02', 2, {'n': 234, 'D': 568},
         '8,02', 'incorrect'),
    spec('BO : 56,75 + 234 + 0,8 = 291,55', 3, {'C': 5675, 'n': 234, 't': 8}, '291,55',
         'correct'),
    spec('Erreur : 0,8 pris pour 0,08, 56,75 + 234 + 0,08 = 290,83', 3,
         {'C': 5675, 'n': 234, 't': 8}, '290,83', 'incorrect'),
]

# ---- 2 et 3. Soustraction posée de décimaux (CM1-165), compensation et cassage ----


def regle(methode):
    if methode == 'cassage':
        return ('Quand on ne peut pas ôter le chiffre du bas, on casse une unité de la colonne de'
                ' gauche : elle vaut $10$ dans la colonne où l\'on calcule.')
    return ('Quand on ne peut pas ôter le chiffre du bas, on ajoute $10$ au chiffre du haut, et $1$'
            ' au chiffre du bas de la colonne suivante, à gauche.')


def soustraction(methode):
    tete = 'Pose et calcule.\n\n```operation\ncalcul: '
    queue = '\nméthode: ' + methode + '\n```'
    meme = variation(
        tete + dec('C/100') + ' − ' + dec('D/100') + queue,
        [var('C', '2001..9999'), var('D', '1001..9999')],
        [VIRGULES, regle(methode),
         'Centièmes : on ne peut pas ôter $' + ev('mod(D,10)') + '$ de $' + ev('mod(C,10)')
         + '$ : on calcule $' + ev('mod(C,10)+10') + ' - ' + ev('mod(D,10)') + ' = '
         + ev('mod(C,10)+10-mod(D,10)') + '$.', COMME_ENTIERS,
         '$$' + dec('C/100') + ' - ' + dec('D/100') + ' = ' + col(dec('(C-D)/100')) + '$$'],
        ['mod(C,10) != 0', 'mod(D,10) != 0', 'mod(D,10) > mod(C,10)', 'C - D >= 100'])
    # BO : 34,5 − 2,58 (le premier n'a pas de centièmes)
    moins = variation(
        tete + dec('T/10') + ' − ' + dec('D/100') + queue,
        [var('T', '101..999'), var('D', '101..9999')],
        [VIRGULES, '$' + dec('T/10') + '$ n\'a pas de centièmes : sa case des centièmes est vide,'
         ' elle compte pour $0$ (on peut penser $' + dec('T/10') + '0$).', regle(methode),
         'Centièmes : on ne peut pas ôter $' + ev('mod(D,10)') + '$ de $0$ : on calcule $10 - '
         + ev('mod(D,10)') + ' = ' + ev('10-mod(D,10)') + '$.', COMME_ENTIERS,
         '$$' + dec('T/10') + ' - ' + dec('D/100') + ' = ' + col(dec('(10*T-D)/100')) + '$$'],
        ['mod(T,10) != 0', 'mod(D,10) != 0', '10*T - D >= 100'])
    # Entier − décimal : 25 − 3,46
    entier = variation(
        tete + '{{n}} − ' + dec('D/100') + queue,
        [var('n', '11..99'), var('D', '101..999')],
        [VIRGULES, '${{n}}$ est entier : on peut penser ${{n}}{,}00$, ses cases des dixièmes et des'
         ' centièmes comptent pour $0$.', regle(methode), COMME_ENTIERS,
         '$${{n}} - ' + dec('D/100') + ' = ' + col(dec('(100*n-D)/100')) + '$$'],
        ['mod(D,10) != 0', '100*n - D >= 100'])
    return [meme, moins, entier]


def ecart_cent(a, b):
    """Erreur « plus petit chiffre ôté du plus grand », colonne par colonne (en centièmes)."""
    res, rang = 0, 1
    while a // rang or b // rang:
        res += abs(a // rang % 10 - b // rang % 10) * rang
        rang *= 10
    return res / 100


SPECS_SOUSTRACTION = [
    spec('52,34 − 17,58 = 34,76', 0, {'C': 5234, 'D': 1758}, '34,76', 'correct'),
    spec('Erreur : plus petit chiffre ôté du plus grand, 52,34 − 17,58 = 45,24', 0,
         {'C': 5234, 'D': 1758}, fr(ecart_cent(5234, 1758)), 'incorrect'),
    spec('BO : 34,5 − 2,58 = 31,92', 1, {'T': 345, 'D': 258}, '31,92', 'correct'),
    spec('Erreur : 8 − 0 au lieu de 0 − 8, 34,5 − 2,58 = 32,08', 1, {'T': 345, 'D': 258},
         fr(ecart_cent(3450, 258)), 'incorrect'),
    spec('25 − 3,46 = 21,54', 2, {'n': 25, 'D': 346}, '21,54', 'correct'),
    spec('Erreur : 25 − 3,46 = 22,46 (décimales recopiées)', 2, {'n': 25, 'D': 346}, '22,46',
         'incorrect'),
]

# ---- 4. Multiplication posée de deux entiers (CM1-051) ----

PRODUITS = 'On multiplie ${{a}}$ par chaque chiffre de ${{b}}$, en commençant par les unités.'

MULT_2_2 = variation(
    POSE + '{{a}} × {{b}}\n```',
    [var('a', '12..99'), var('u', '2..9'), var('d', '1..9'), var('b', 'eval:10*d+u')],
    [PRODUITS, 'Unités : ${{a}} \\times {{u}} = ' + ev('a*u') + '$.',
     'Dizaines : ${{a}} \\times {{d}} = ' + ev('a*d') + '$ dizaines : on l\'écrit avec un $0$ de'
     ' décalage, $' + ev('10*a*d') + '$.',
     'On additionne : $' + ev('a*u') + ' + ' + ev('10*a*d') + ' = ' + ev('a*b') + '$.',
     '$${{a}} \\times {{b}} = ' + col(ev('a*b')) + '$$'],
    ['mod(a,10) != 0', 'b >= 12'])

MULT_3_2 = variation(
    POSE + '{{a}} × {{b}}\n```',
    [var('a', '102..999'), var('u', '2..9'), var('d', '1..9'), var('b', 'eval:10*d+u')],
    [PRODUITS, 'Unités : ${{a}} \\times {{u}} = ' + ev('a*u') + '$.',
     'Dizaines : ${{a}} \\times {{d}} = ' + ev('a*d') + '$ dizaines : on l\'écrit avec un $0$ de'
     ' décalage, $' + ev('10*a*d') + '$.',
     'On additionne : $' + ev('a*u') + ' + ' + ev('10*a*d') + ' = ' + ev('a*b') + '$.',
     '$${{a}} \\times {{b}} = ' + col(ev('a*b')) + '$$'],
    ['mod(a,10) != 0', 'b >= 12'])

# BO : 876 × 208 (un 0 au milieu du nombre du bas : sa ligne est sautée)
MULT_3_3_ZERO = variation(
    POSE + '{{a}} × {{b}}\n```',
    [var('a', '102..999'), var('u', '2..9'), var('c', '1..9'), var('b', 'eval:100*c+u')],
    [PRODUITS, 'Unités : ${{a}} \\times {{u}} = ' + ev('a*u') + '$.',
     'Dizaines : le chiffre est $0$, la ligne vaudrait $0$ : on la saute.',
     'Centaines : ${{a}} \\times {{c}} = ' + ev('a*c') + '$ centaines : on l\'écrit avec deux $0$'
     ' de décalage, $' + ev('100*a*c') + '$.',
     'On additionne : $' + ev('a*u') + ' + ' + ev('100*a*c') + ' = ' + ev('a*b') + '$.',
     '$${{a}} \\times {{b}} = ' + col(ev('a*b')) + '$$'],
    ['mod(a,10) != 0'])

SPECS_MULT = [
    spec('48 × 37 = 1 776', 0, {'a': 48, 'u': 7, 'd': 3, 'b': 37}, '1 776', 'correct'),
    spec('Erreur : décalage oublié, 48 × 7 + 48 × 3 = 480', 0, {'a': 48, 'u': 7, 'd': 3, 'b': 37},
         '480', 'incorrect'),
    spec('347 × 26 = 9 022', 1, {'a': 347, 'u': 6, 'd': 2, 'b': 26}, '9 022', 'correct'),
    spec('Erreur : décalage oublié, 2 082 + 694 = 2 776', 1, {'a': 347, 'u': 6, 'd': 2, 'b': 26},
         '2 776', 'incorrect'),
    spec('BO : 876 × 208 = 182 208', 2, {'a': 876, 'u': 8, 'c': 2, 'b': 208}, '182 208',
         'correct'),
    spec('Erreur : un seul 0 de décalage, 7 008 + 17 520 = 24 528', 2,
         {'a': 876, 'u': 8, 'c': 2, 'b': 208}, '24 528', 'incorrect'),
]

# ---- 5. Décimal × entier de 2 à 9 (CM1-052) ----

VIRGULE_PRODUIT = ('On pose la multiplication comme avec des nombres entiers, sans s\'occuper de la'
                   ' virgule.')

MULT_DIXIEMES = variation(
    POSE + '{{n}} × ' + dec('T/10') + '\n```',
    [var('n', '2..9'), var('T', '11..999')],
    [VIRGULE_PRODUIT, '${{T}} \\times {{n}} = ' + ev('T*n') + '$.',
     '$' + dec('T/10') + '$ a un chiffre après la virgule : le produit en a un aussi.',
     '$${{n}} \\times ' + dec('T/10') + ' = ' + col(dec('T*n/10')) + '$$'],
    ['mod(T,10) != 0', 'mod(T*n,10) != 0'])

MULT_CENTIEMES = variation(
    POSE + '{{n}} × ' + dec('C/100') + '\n```',
    [var('n', '2..9'), var('C', '101..9999')],
    [VIRGULE_PRODUIT, '${{C}} \\times {{n}} = ' + ev('C*n') + '$.',
     '$' + dec('C/100') + '$ a deux chiffres après la virgule : le produit en a deux aussi.',
     '$${{n}} \\times ' + dec('C/100') + ' = ' + col(dec('C*n/100')) + '$$'],
    ['mod(C,10) != 0', 'mod(C*n,10) != 0'])

# 4 × 12,35 = 49,40 : le 0 de la fin peut s'enlever (49,4 juste)
MULT_ZERO_FINAL = variation(
    POSE + '{{n}} × ' + dec('C/100') + '\n```',
    [var('n', '2..9'), var('C', '101..9999')],
    [VIRGULE_PRODUIT, '${{C}} \\times {{n}} = ' + ev('C*n') + '$.',
     '$' + dec('C/100') + '$ a deux chiffres après la virgule : le produit en a deux aussi, $'
     + ev('floor(C*n/100)') + '{,}' + ev('floor(mod(C*n,100)/10)') + '0$.',
     'Le $0$ à la fin de la partie décimale peut s\'enlever.',
     '$${{n}} \\times ' + dec('C/100') + ' = ' + col(dec('C*n/100')) + '$$'],
    ['mod(C,10) != 0', 'mod(C*n,10) == 0', 'mod(C*n,100) != 0'])

SPECS_MULT_DEC = [
    spec('BO : 8 × 17,3 = 138,4', 0, {'n': 8, 'T': 173}, '138,4', 'correct'),
    spec('Erreur : virgule oubliée, 1 384', 0, {'n': 8, 'T': 173}, '1 384', 'incorrect'),
    spec('BO : 7 × 46,55 = 325,85', 1, {'n': 7, 'C': 4655}, '325,85', 'correct'),
    spec('Erreur : virgule oubliée, 32 585', 1, {'n': 7, 'C': 4655}, '32 585', 'incorrect'),
    spec('Erreur : une seule décimale, 3 258,5', 1, {'n': 7, 'C': 4655}, '3 258,5', 'incorrect'),
    spec('4 × 12,35 = 49,4', 2, {'n': 4, 'C': 1235}, '49,4', 'correct'),
    # 49,40 tapé dans la grille : la lecture des cases retire le 0 de fin (`readOperationAnswer`),
    # le juge reçoit 49,4 ; pas de spec « 49,40 »
    spec('Erreur : virgule une case trop à gauche, 4,94', 2, {'n': 4, 'C': 1235}, '4,94',
         'incorrect'),
]

# ---- 6. Division euclidienne posée (CM1-053) ----

DIV_TETE = 'Pose et effectue la division euclidienne.\n\n```operation\ncalcul: {{N}} ÷ {{d}}\n```'
DIV_ETAPES = [
    '**Division euclidienne.** Diviser ${{N}}$ par ${{d}}$, c\'est trouver le quotient et le reste'
    ' tels que ${{N}} = ({{d}} \\times \\text{quotient}) + \\text{reste}$, avec un reste plus petit'
    ' que ${{d}}$.',
    '$${{N}} = ({{d}} \\times ' + col('{{q}}') + ') + ' + col('{{r}}', 1) + '$$',
    'Le quotient est $' + col('{{q}}') + '$, le reste $' + col('{{r}}', 1) + '$, plus petit que'
    ' ${{d}}$.']
DIV_VARS = [var('d', '2..9'), var('r', '0..{{eval:d-1}}'), var('N', 'eval:d*q+r')]

# 157 ÷ 6 : trois chiffres, quotient à deux chiffres
DIV_3 = variation(DIV_TETE, [var('q', '11..99')] + DIV_VARS, DIV_ETAPES,
                  ['N >= 100', 'N <= 999', 'mod(q,10) != 0'])
# BO : 9 456 ÷ 7 (quatre chiffres)
DIV_4 = variation(DIV_TETE, [var('q', '112..4999')] + DIV_VARS, DIV_ETAPES,
                  ['N >= 1000', 'N <= 9999'])
# 2 418 ÷ 4 = 604 reste 2 : un 0 au quotient
DIV_ZERO = variation(
    DIV_TETE, [var('c', '1..9'), var('u', '1..9'), var('q', 'eval:100*c+u')] + DIV_VARS,
    DIV_ETAPES[:1] + ['Au milieu, le dividende partiel est plus petit que ${{d}}$ : on écrit $0$'
                      ' au quotient avant d\'abaisser le chiffre suivant.'] + DIV_ETAPES[1:],
    ['N >= 1000', 'N <= 9999'])
# 23 875 ÷ 6 : cinq chiffres
DIV_5 = variation(DIV_TETE, [var('q', '1112..49999')] + DIV_VARS, DIV_ETAPES,
                  ['N >= 10000', 'N <= 99999'])

SPECS_DIV = [
    spec('157 ÷ 6 = 26 reste 1', 0, {'q': 26, 'd': 6, 'r': 1, 'N': 157}, ['26', '1'], 'correct'),
    spec('Erreur : reste plus grand que le diviseur, 25 reste 7', 0,
         {'q': 26, 'd': 6, 'r': 1, 'N': 157}, ['25', '7'], 'incorrect'),
    spec('BO : 9 456 ÷ 7 = 1 350 reste 6', 1, {'q': 1350, 'd': 7, 'r': 6, 'N': 9456},
         ['1 350', '6'], 'correct'),
    spec('Erreur : reste faux, 1 350 reste 5', 1, {'q': 1350, 'd': 7, 'r': 6, 'N': 9456},
         ['1 350', '5'], 'incorrect'),
    spec('2 418 ÷ 4 = 604 reste 2', 2, {'c': 6, 'u': 4, 'q': 604, 'd': 4, 'r': 2, 'N': 2418},
         ['604', '2'], 'correct'),
    spec('Erreur : 0 oublié au quotient, 64 reste 2', 2,
         {'c': 6, 'u': 4, 'q': 604, 'd': 4, 'r': 2, 'N': 2418}, ['64', '2'], 'incorrect'),
    spec('23 875 ÷ 6 = 3 979 reste 1', 3, {'q': 3979, 'd': 6, 'r': 1, 'N': 23875}, ['3 979', '1'],
         'correct'),
    spec('Erreur : 3 978 reste 7', 3, {'q': 3979, 'd': 6, 'r': 1, 'N': 23875}, ['3 978', '7'],
         'incorrect'),
]

MODELES = {
    '01-addition-posee-decimaux': modele(
        'Poser une addition de nombres décimaux',
        'Addition posée de décimaux (deux décimales au plus) : 45,78 + 26,57 ; 34,5 + 2,58 ;'
        ' 234 + 5,68 ; 56,75 + 234 + 0,8', 'Décimaux', 'Additionner', 1,
        [ADD_DEUX_DECIMALES, ADD_DECIMALES_DIFFERENTES, ADD_ENTIER, ADD_TROIS_TERMES],
        SPECS_ADDITION),
    '02-soustraction-posee-decimaux-compensation': modele(
        'Poser une soustraction de nombres décimaux (par compensation)',
        'Soustraction posée de décimaux, méthode par compensation : 52,34 − 17,58 ; 34,5 − 2,58 ;'
        ' 25 − 3,46', 'Décimaux', 'Soustraire', 1, soustraction('compensation'),
        SPECS_SOUSTRACTION),
    '03-soustraction-posee-decimaux-cassage': modele(
        'Poser une soustraction de nombres décimaux (par cassage)',
        'Soustraction posée de décimaux, méthode par cassage : 52,34 − 17,58 ; 34,5 − 2,58 ;'
        ' 25 − 3,46', 'Décimaux', 'Soustraire', 2, soustraction('cassage'), SPECS_SOUSTRACTION),
    '04-multiplication-posee-entiers': modele(
        'Poser une multiplication de deux nombres entiers',
        'Multiplication posée : 48 × 37 ; 347 × 26 ; 876 × 208 (un 0 au milieu, sa ligne sautée)',
        'Entiers', 'Multiplier', 1, [MULT_2_2, MULT_3_2, MULT_3_3_ZERO], SPECS_MULT, delay=240),
    '05-multiplication-posee-decimal-entier': modele(
        'Poser la multiplication d\'un nombre décimal par un entier',
        'Multiplication posée d\'un décimal par un entier de 2 à 9 : 8 × 17,3 ; 7 × 46,55 ;'
        ' 4 × 12,35 = 49,4', 'Décimaux', 'Multiplier', 1,
        [MULT_DIXIEMES, MULT_CENTIEMES, MULT_ZERO_FINAL], SPECS_MULT_DEC),
    '06-division-euclidienne-posee': modele(
        'Poser une division euclidienne',
        'Division euclidienne posée, diviseur à un chiffre : 157 ÷ 6 ; 9 456 ÷ 7 ; un 0 au'
        ' quotient (2 418 ÷ 4) ; cinq chiffres (23 875 ÷ 6)', 'Entiers', 'Diviser', 1,
        [DIV_3, DIV_4, DIV_ZERO, DIV_5], SPECS_DIV, delay=240),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
