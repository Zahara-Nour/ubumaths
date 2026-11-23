"""Écrit les 7 modèles du lot 8 B « Indicateurs » de la 2de dans scripts/questions/2de-indicateurs-b/.

Phase 0 validée par David le 2026-11-02 (§ 51 du journal `docs/wip/questions-2de-progress.md`).
Bornes : `bornes/lycee/2de.json` (2-369, 2-370, 2-371, 2-479, 2-402, 2-382, 2-483). Un point par
modèle ; le nœud et le tag sont posés par la migration de rangement, après le `--publier` de David.

Décisions et pièges :
- écart type seul indicateur de dispersion (pas de variance, 2-370) : σ = √(moyenne des carrés des
  écarts), séries construites pour un écart type entier (écarts (−4, 1, 1, 1, 1)·k et
  (−3, −1, −1, −1, 0, 0, 2, 4)·k : σ = 2k) ;
- quartiles comme en 3e (c4-2) : « au moins 25 % des valeurs ⩽ Q₁ » ; effectif multiple de 4 ;
- séries données dans le désordre (médiane : il faut ranger) ;
- un choix se répond par son rang dans la liste écrite (mélangée à l'affichage) ;
- jamais de `{{if:…}}` imbriqué : une variable de cas ou une variation par cas ;
- les variables sont substituées telles quelles dans les `eval` : toujours `(a)`, `-(a)` ;
- variables `e` et `i` interdites.

    python3 docs/wip/questions-2de/lot-indicateurs-b-2de.py scripts/questions/2de-indicateurs-b
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]
MOYENNE = ('Statistiques', 'Indicateurs', 'Moyenne')
ECART_TYPE = ('Statistiques', 'Indicateurs', 'Écart type')
MEDIANE = ('Statistiques', 'Indicateurs', 'Médiane')
QUARTILES = ('Statistiques', 'Indicateurs', 'Quartiles')
COMPARER = ('Statistiques', 'Problèmes', 'Comparer des séries')


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(v) for k, v in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(nom, title, description, categorie, level, variations, specs, delay=60):
    m = {'title': title, 'description': description, 'grades': ['2'], 'theme': categorie[0],
         'domain': categorie[1], 'subdomain': categorie[2], 'level': level, 'delay': delay,
         'status': 'draft', 'shared': {'blankDefaults': {'acceptDecimal': True}},
         'variations': variations, 'testSpecs': specs}
    return nom, m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, blanks, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [{'expectedAnswer': b} for b in blanks]
    v['correction'] = {'steps': steps}
    return v


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def colt(x, k=0):
    """Valeur colorée en plein texte : `\\textcolor` hors `$…$` s'afficherait en LaTeX brut."""
    return '$' + col(x, k) + '$'


def choix(question, options, melanger=True):
    entete = '' if melanger else 'melanger: non\n'
    return question + '\n\n```choix\n' + entete + ''.join('- ' + o + '\n' for o in options) + '```'


def serie(valeurs):
    """Série écrite entre `$…$`, valeurs séparées par « ; »."""
    return '$' + '\\ ;\\ '.join(valeurs) + '$'


MODELES = []

# =============================================================================================
# 1. 2-369 : linéarité de la moyenne
# =============================================================================================

AJOUT = variation(
    'La moyenne des notes d\'un devoir est ${{eval:(m)/10;d}}$. Le professeur ajoute ${{b}}$ points'
    ' à **chaque** note.\n\nQuelle est la nouvelle moyenne ?\n\nNouvelle moyenne : $?$',
    [var('m', '80..140'), var('b', '1|2|3')],
    ['{{eval:(m)/10+(b);d}}'],
    ['Si on ajoute le même nombre $b$ à chaque valeur, la moyenne augmente de $b$.',
     '${{eval:(m)/10;d}}+{{b}}=' + col('{{eval:(m)/10+(b);d}}') + '$.'])

CONVERSION = variation(
    'La moyenne des notes sur ${{s}}$ d\'un devoir est ${{eval:(m)/10;d}}$. Le professeur convertit'
    ' **chaque** note pour qu\'elle soit sur ${{t}}$.\n\nQuelle est la moyenne des notes converties ?'
    '\n\nNouvelle moyenne : $?$',
    [var('s', '20|40'), var('t', '10|20'), var('m', '60..140')],
    ['{{eval:(m)/10*(t)/(s);d}}'],
    ['Convertir sur ${{t}}$ une note sur ${{s}}$, c\'est la multiplier par $\\dfrac{ {{t}} }{ {{s}} }='
     '{{eval:(t)/(s);d}}$.',
     'Si on multiplie chaque valeur par un même nombre $a$, la moyenne est multipliée par $a$ :'
     ' ${{eval:(m)/10;d}}\\times{{eval:(t)/(s);d}}=' + col('{{eval:(m)/10*(t)/(s);d}}') + '$.'],
    ['s != t'])

FAHRENHEIT = variation(
    'La température moyenne d\'un mois est ${{m}}~\\unit{°C}$. Pour passer des degrés Celsius aux'
    ' degrés Fahrenheit, on transforme **chaque** température $x$ en $1{,}8x+32$.\n\nQuelle est la'
    ' température moyenne du mois en degrés Fahrenheit ?\n\nMoyenne : $?~\\unit{°F}$',
    [var('m', '5..30')],
    ['{{eval:1.8*(m)+32;d}}'],
    ['Si chaque valeur $x$ devient $ax+b$, la moyenne $\\overline{x}$ devient $a\\overline{x}+b$.',
     '$1{,}8\\times{{m}}+32=' + col('{{eval:1.8*(m)+32;d}}') + '~\\unit{°F}$.'])

SP_AJ = {'m': 112, 'b': 2}
SP_CONV = {'s': 20, 't': 10, 'm': 126}
SP_F = {'m': 15}
MODELES.append(modele(
    '01-linearite-de-la-moyenne', 'Linéarité de la moyenne',
    'Moyenne d\'une série dont chaque valeur est augmentée de b, multipliée par a, ou transformée'
    ' en ax + b',
    MOYENNE, 4, [AJOUT, CONVERSION, FAHRENHEIT],
    [spec('11,2 + 2 : 13,2', 0, SP_AJ, '13.2', 'correct'),
     spec('Erreur : moyenne inchangée', 0, SP_AJ, '11.2', 'incorrect'),
     spec('12,6 sur 20 → 6,3 sur 10', 1, SP_CONV, '6.3', 'correct'),
     spec('Erreur : 12,6 × 2', 1, SP_CONV, '25.2', 'incorrect'),
     spec('15 °C → 59 °F', 2, SP_F, '59', 'correct'),
     spec('Erreur : + 32 oublié (27)', 2, SP_F, '27', 'incorrect')]))

# =============================================================================================
# 2. 2-370 : écart type
# =============================================================================================

METHODE_SIGMA = ('L\'écart type est la racine carrée de la moyenne des carrés des écarts à la'
                 ' moyenne : $\\sigma=\\sqrt{\\dfrac{(x_1-\\overline{x})^2+\\dots+(x_n-\\overline{x})^2}'
                 '{n}}$.')

# Écarts (−4, 1, 1, 1, 1)·k ; σ = 2k
CINQ = ['{{eval:(m)+(k)}}', '{{eval:(m)-4*(k)}}', '{{eval:(m)+(k)}}', '{{eval:(m)+(k)}}',
        '{{eval:(m)+(k)}}']
SIGMA_CINQ = variation(
    'Voici une série de $5$ valeurs : ' + serie(CINQ) + '.\n\nSa moyenne vaut ${{m}}$. Calcule son'
    ' écart type.\n\n$\\sigma=?$',
    [var('m', '13..20'), var('k', '1|2|3')],
    ['{{eval:2*(k)}}'],
    [METHODE_SIGMA,
     'Écarts à la moyenne : $-{{eval:4*(k)}}$ (une fois) et ${{k}}$ (quatre fois) ; carrés :'
     ' ${{eval:16*(k)*(k)}}$ et ${{eval:(k)*(k)}}$.',
     'Moyenne des carrés : $\\dfrac{ {{eval:16*(k)*(k)}}+4\\times{{eval:(k)*(k)}} }{5}='
     '\\dfrac{ {{eval:20*(k)*(k)}} }{5}={{eval:4*(k)*(k)}}$.',
     '$\\sigma=\\sqrt{ {{eval:4*(k)*(k)}} }=' + col('{{eval:2*(k)}}') + '$.'])

# Écarts (−3, −1, −1, −1, 0, 0, 2, 4)·k ; σ = 2k
HUIT = ['{{eval:(m)+2*(k)}}', '{{eval:(m)-(k)}}', '{{m}}', '{{eval:(m)+4*(k)}}', '{{eval:(m)-(k)}}',
        '{{eval:(m)-3*(k)}}', '{{m}}', '{{eval:(m)-(k)}}']
SIGMA_HUIT = variation(
    'Voici une série de $8$ valeurs : ' + serie(HUIT) + '.\n\nSa moyenne vaut ${{m}}$. Calcule son'
    ' écart type.\n\n$\\sigma=?$',
    [var('m', '10..20'), var('k', '1|2|3')],
    ['{{eval:2*(k)}}'],
    [METHODE_SIGMA,
     'Écarts à la moyenne : $-{{eval:3*(k)}}$, $-{{k}}$ (trois fois), $0$ (deux fois),'
     ' ${{eval:2*(k)}}$ et ${{eval:4*(k)}}$.',
     'Somme des carrés : ${{eval:9*(k)*(k)}}+3\\times{{eval:(k)*(k)}}+0+{{eval:4*(k)*(k)}}+'
     '{{eval:16*(k)*(k)}}={{eval:32*(k)*(k)}}$ ; moyenne des carrés : $\\dfrac{ {{eval:32*(k)*(k)}} }'
     '{8}={{eval:4*(k)*(k)}}$.',
     '$\\sigma=\\sqrt{ {{eval:4*(k)*(k)}} }=' + col('{{eval:2*(k)}}') + '$.'])

# Deux séries de même moyenne, écarts (−d, 0, d)
COMPARER_SIGMA = variation(
    'Série A : ' + serie(['{{eval:(m)-(a)}}', '{{m}}', '{{eval:(m)+(a)}}']) + ' ; série B : '
    + serie(['{{eval:(m)-(b)}}', '{{m}}', '{{eval:(m)+(b)}}']) + '.\n\n'
    + choix('Les deux séries ont la même moyenne ${{m}}$. Laquelle a le plus grand écart type ?',
            ['la série A', 'la série B', 'elles ont le même écart type'], melanger=False),
    [var('m', '10..20'), var('a', '1..8'), var('b', '1..8')],
    ['{{if:a>b|0|1}}'],
    ['L\'écart type mesure la **dispersion** des valeurs autour de la moyenne : plus les valeurs'
     ' sont éloignées de la moyenne, plus il est grand.',
     'Les valeurs de A s\'écartent de ${{a}}$ de la moyenne, celles de B de ${{b}}$ : c\'est '
     + colt('\\text{la série {{if:a>b|A|B}}}') + ' qui a le plus grand écart type.'],
    ['a != b', 'm > a', 'm > b'])

SP_5 = {'m': 15, 'k': 2}
SP_8 = {'m': 12, 'k': 1}
SP_CMP = {'m': 12, 'a': 2, 'b': 5}
MODELES.append(modele(
    '02-ecart-type', 'Écart type d\'une série',
    'Calculer l\'écart type d\'une petite série (résultat entier) ; comparer les écarts types de deux'
    ' séries de même moyenne',
    ECART_TYPE, 1, [SIGMA_CINQ, SIGMA_HUIT, COMPARER_SIGMA],
    [spec('Écarts (−8, 2, 2, 2, 2) : σ = 4', 0, SP_5, '4', 'correct'),
     spec('Erreur : moyenne des carrés (16)', 0, SP_5, '16', 'incorrect'),
     spec('Erreur : étendue (10)', 0, SP_5, '10', 'incorrect'),
     spec('Série de 8 : σ = 2', 1, SP_8, '2', 'correct'),
     spec('Erreur : 4 (sans racine)', 1, SP_8, '4', 'incorrect'),
     spec('A (±2), B (±5) : B', 2, SP_CMP, '1', 'correct'),
     spec('Erreur : même écart type', 2, SP_CMP, '2', 'incorrect')]))

# =============================================================================================
# 3. 2-371 : moyenne après ajout ou retrait d'une valeur
# =============================================================================================

AJOUT_VALEUR = variation(
    'Une série de ${{n}}$ valeurs a pour moyenne ${{m}}$. On ajoute la valeur ${{v}}$ à la série.'
    '\n\nQuelle est la nouvelle moyenne ?\n\nNouvelle moyenne : $?$',
    [var('n', '4..9'), var('m', '8..15'), var('v', '0..30')],
    ['{{eval:((n)*(m)+(v))/((n)+1)}}'],
    ['Somme des ${{n}}$ valeurs : ${{n}}\\times{{m}}={{eval:(n)*(m)}}$.',
     'Après l\'ajout : ${{eval:(n)+1}}$ valeurs, de somme ${{eval:(n)*(m)}}+{{v}}='
     '{{eval:(n)*(m)+(v)}}$.',
     'Nouvelle moyenne : $\\dfrac{ {{eval:(n)*(m)+(v)}} }{ {{eval:(n)+1}} }='
     + col('{{eval:((n)*(m)+(v))/((n)+1)}}') + '$.'],
    ['v != m', 'mod((n)*(m)+(v),(n)+1) == 0'])

RETRAIT_VALEUR = variation(
    'Une série de ${{n}}$ valeurs a pour moyenne ${{m}}$. On retire de la série la valeur ${{v}}$.'
    '\n\nQuelle est la nouvelle moyenne ?\n\nNouvelle moyenne : $?$',
    [var('n', '5..10'), var('m', '8..15'), var('v', '0..30')],
    ['{{eval:((n)*(m)-(v))/((n)-1)}}'],
    ['Somme des ${{n}}$ valeurs : ${{n}}\\times{{m}}={{eval:(n)*(m)}}$.',
     'Après le retrait : ${{eval:(n)-1}}$ valeurs, de somme ${{eval:(n)*(m)}}-{{v}}='
     '{{eval:(n)*(m)-(v)}}$.',
     'Nouvelle moyenne : $\\dfrac{ {{eval:(n)*(m)-(v)}} }{ {{eval:(n)-1}} }='
     + col('{{eval:((n)*(m)-(v))/((n)-1)}}') + '$.'],
    ['v != m', 'mod((n)*(m)-(v),(n)-1) == 0'])

# s = 0 : valeur au-dessus de la moyenne ; 1 : égale ; 2 : au-dessous
SENS_VALEUR = variation(
    'La moyenne d\'une série est ${{m}}$. On ajoute à la série la valeur ${{v}}$.\n\n'
    + choix('Sans calcul : la moyenne…', ['augmente', 'ne change pas', 'diminue'], melanger=False),
    [var('m', '8..15'), var('s', '0|1|2'), var('d', '1..9'), var('v', 'eval:(m)+(1-(s))*(d)')],
    ['{{s}}'],
    ['Une valeur ajoutée **au-dessus** de la moyenne la fait augmenter, **au-dessous** la fait'
     ' diminuer, **égale** à la moyenne ne la change pas.',
     '{{if:s==0|${{v}}>{{m}}$ : la valeur est au-dessus de la moyenne, qui '
     + colt('\\text{augmente}') + '.| }}'
     '{{if:s==1|${{v}}={{m}}$ : la valeur est égale à la moyenne, qui ' + colt('\\text{ne change pas}')
     + '.| }}'
     '{{if:s==2|${{v}}<{{m}}$ : la valeur est au-dessous de la moyenne, qui ' + colt('\\text{diminue}')
     + '.| }}'])

SP_AJV = {'n': 4, 'm': 10, 'v': 20}
SP_RET = {'n': 6, 'm': 12, 'v': 2}
SP_S0 = {'m': 10, 's': 0, 'd': 5, 'v': 15}
SP_S2 = {'m': 10, 's': 2, 'd': 3, 'v': 7}
MODELES.append(modele(
    '03-moyenne-ajout-retrait', 'Moyenne après l\'ajout ou le retrait d\'une valeur',
    'Nouvelle moyenne quand on ajoute ou retire une valeur (par la somme) ; sens de variation sans'
    ' calcul',
    MOYENNE, 5, [AJOUT_VALEUR, RETRAIT_VALEUR, SENS_VALEUR],
    [spec('4 valeurs de moyenne 10, + 20 : 12', 0, SP_AJV, '12', 'correct'),
     spec('Erreur : moyenne de 10 et 20 (15)', 0, SP_AJV, '15', 'incorrect'),
     spec('Erreur : divisé par 4 (15)', 0, SP_AJV, '15', 'incorrect'),
     spec('6 valeurs de moyenne 12, − 2 : 14', 1, SP_RET, '14', 'correct'),
     spec('Erreur : 12 − 2', 1, SP_RET, '10', 'incorrect'),
     spec('15 > 10 : augmente', 2, SP_S0, '0', 'correct'),
     spec('7 < 10 : diminue', 2, SP_S2, '2', 'correct'),
     spec('Erreur : ne change pas', 2, SP_S2, '1', 'incorrect')]))

# =============================================================================================
# 4. 2-479 : médiane après ajout ou retrait
# =============================================================================================

# x1 < x2 < … < x7, affichés dans le désordre
VAL = [var('x1', '2..6'), var('d2', '1..4'), var('d3', '1..4'), var('d4', '1..4'), var('d5', '1..4'),
       var('d6', '1..4'), var('d7', '1..4'), var('x2', 'eval:(x1)+(d2)'), var('x3', 'eval:(x2)+(d3)'),
       var('x4', 'eval:(x3)+(d4)'), var('x5', 'eval:(x4)+(d5)'), var('x6', 'eval:(x5)+(d6)'),
       var('x7', 'eval:(x6)+(d7)')]
DESORDRE = serie(['{{x3}}', '{{x7}}', '{{x1}}', '{{x5}}', '{{x2}}', '{{x6}}', '{{x4}}'])
RANGEE = '$x_1$ à $x_7$ : ' + serie(['{{x' + str(k) + '}}' for k in range(1, 8)])
INTRO_MED = 'Voici une série de $7$ valeurs : ' + DESORDRE + '.\n\n'
QUESTION_MED = '\n\nQuelle est la médiane de la nouvelle série ?\n\nMédiane : $?$'

MED_GRANDE = variation(
    INTRO_MED + 'On ajoute la valeur ${{v}}$.' + QUESTION_MED,
    VAL + [var('w', '1..10'), var('v', 'eval:(x7)+(w)')],
    ['{{eval:((x4)+(x5))/2;d}}'],
    ['Série rangée : ' + serie(['{{x' + str(k) + '}}' for k in range(1, 8)]) + ' ; sa médiane est'
     ' la $4^\\text{e}$ valeur, ${{x4}}$.',
     'On ajoute ${{v}}$, la plus grande valeur : $8$ valeurs, la médiane est la moyenne des'
     ' $4^\\text{e}$ et $5^\\text{e}$ : $\\dfrac{ {{x4}}+{{x5}} }{2}='
     + col('{{eval:((x4)+(x5))/2;d}}') + '$.'])

MED_PETITE = variation(
    INTRO_MED + 'On ajoute la valeur ${{v}}$.' + QUESTION_MED,
    VAL + [var('v', 'eval:(x1)-1')],
    ['{{eval:((x3)+(x4))/2;d}}'],
    ['Série rangée : ' + serie(['{{x' + str(k) + '}}' for k in range(1, 8)]) + ' ; sa médiane est'
     ' la $4^\\text{e}$ valeur, ${{x4}}$.',
     'On ajoute ${{v}}$, la plus petite valeur : la série rangée devient ' + serie(
         ['{{v}}'] + ['{{x' + str(k) + '}}' for k in range(1, 8)]) + '. Médiane : moyenne des'
     ' $4^\\text{e}$ et $5^\\text{e}$ valeurs, $\\dfrac{ {{x3}}+{{x4}} }{2}='
     + col('{{eval:((x3)+(x4))/2;d}}') + '$.'])

MED_RETRAIT = variation(
    INTRO_MED + 'On retire la plus grande valeur.' + QUESTION_MED,
    VAL,
    ['{{eval:((x3)+(x4))/2;d}}'],
    ['Série rangée : ' + serie(['{{x' + str(k) + '}}' for k in range(1, 8)]) + ' ; on retire'
     ' ${{x7}}$.',
     'Il reste $6$ valeurs : la médiane est la moyenne des $3^\\text{e}$ et $4^\\text{e}$,'
     ' $\\dfrac{ {{x3}}+{{x4}} }{2}=' + col('{{eval:((x3)+(x4))/2;d}}') + '$.'])

SP_MED = {'x1': 3, 'd2': 2, 'd3': 1, 'd4': 3, 'd5': 2, 'd6': 1, 'd7': 4, 'x2': 5, 'x3': 6, 'x4': 9,
          'x5': 11, 'x6': 12, 'x7': 16}
SP_MED_G = dict(SP_MED, w=5, v=21)
SP_MED_P = dict(SP_MED, v=2)
MODELES.append(modele(
    '04-mediane-ajout-retrait', 'Médiane après l\'ajout ou le retrait d\'une valeur',
    'Série de 7 valeurs donnée dans le désordre ; nouvelle médiane après l\'ajout d\'une valeur'
    ' extrême ou le retrait de la plus grande',
    MEDIANE, 3, [MED_GRANDE, MED_PETITE, MED_RETRAIT],
    [spec('3 5 6 9 11 12 16 + 21 : (9 + 11)/2 = 10', 0, SP_MED_G, '10', 'correct'),
     spec('Erreur : ancienne médiane (9)', 0, SP_MED_G, '9', 'incorrect'),
     spec('Erreur : 4e valeur de la série non rangée (11)', 0, SP_MED_G, '11', 'incorrect'),
     spec('+ 2 : (6 + 9)/2 = 7,5', 1, SP_MED_P, '7.5', 'correct'),
     spec('Erreur : 9', 1, SP_MED_P, '9', 'incorrect'),
     spec('Retrait de 16 : 7,5', 2, SP_MED, '7.5', 'correct'),
     spec('Erreur : ancienne médiane (9)', 2, SP_MED, '9', 'incorrect')]))

# =============================================================================================
# 5. 2-402 : interpréter un quartile
# =============================================================================================

QUART = '{{if:g==0|25|75}}'
QNOM = '{{if:g==0|Q_1|Q_3}}'
SENS_QUARTILE = variation(
    'Pour une série statistique, on a $' + QNOM + '={{q}}$.\n\n'
    + choix('Quelle phrase est juste ?',
            ['au moins $' + QUART + '\\,\\%$ des valeurs sont inférieures ou égales à ${{q}}$',
             'exactement $' + QUART + '\\,\\%$ des valeurs sont égales à ${{q}}$',
             'au plus $' + QUART + '\\,\\%$ des valeurs sont inférieures ou égales à ${{q}}$',
             'la moyenne de la série est ${{q}}$']),
    [var('g', '0|1'), var('q', '8..40')],
    ['0'],
    ['$' + QNOM + '$ est la plus petite valeur de la série telle qu\'**au moins** $' + QUART
     + '\\,\\%$ des valeurs lui soient inférieures ou égales.',
     'Donc ' + colt('\\text{au moins }' + QUART + '\\,\\%\\text{ des valeurs sont} \\leqslant {{q}}')
     + '. Le quartile ne dit rien de la moyenne.'])

COMBIEN_QUARTILE = variation(
    'Une série compte ${{n}}$ valeurs et $' + QNOM + '={{q}}$.\n\nAu moins combien de valeurs sont'
    ' inférieures ou égales à ${{q}}$ ?\n\nAu moins $?$ valeurs',
    [var('g', '0|1'), var('n', '20|40|60|80|100|200'), var('q', '8..40')],
    ['{{eval:(n)*(1+2*(g))/4}}'],
    ['Au moins $' + QUART + '\\,\\%$ des valeurs sont inférieures ou égales à $' + QNOM + '$.',
     '$' + QUART + '\\,\\%$ de ${{n}}$ : $\\dfrac{' + QUART + '}{100}\\times{{n}}='
     + col('{{eval:(n)*(1+2*(g))/4}}') + '$.'])

SP_Q1 = {'g': 0, 'q': 12}
SP_N3 = {'g': 1, 'n': 40, 'q': 15}
SP_N1 = {'g': 0, 'n': 200, 'q': 15}
MODELES.append(modele(
    '05-interpreter-un-quartile', 'Interpréter un quartile',
    'Sens de Q1 et Q3 (« au moins 25 % / 75 % des valeurs sont inférieures ou égales ») ; nombre'
    ' minimal de valeurs concernées',
    QUARTILES, 2, [SENS_QUARTILE, COMBIEN_QUARTILE],
    [spec('Phrase juste', 0, SP_Q1, '0', 'correct'),
     spec('Erreur : « exactement »', 0, SP_Q1, '1', 'incorrect'),
     spec('Erreur : « au plus »', 0, SP_Q1, '2', 'incorrect'),
     spec('Q3, 40 valeurs : au moins 30', 1, SP_N3, '30', 'correct'),
     spec('Erreur : 10 (le quart)', 1, SP_N3, '10', 'incorrect'),
     spec('Q1, 200 valeurs : au moins 50', 1, SP_N1, '50', 'correct')]))

# =============================================================================================
# 6. 2-382 : comparer par moyenne et écart type
# =============================================================================================

TABLE_MS = ('| | Moyenne | Écart type |\n|---|---|---|\n'
            '| Classe A | ${{eval:(ma)/10;d}}$ | ${{eval:(sa)/10;d}}$ |\n'
            '| Classe B | ${{eval:(mb)/10;d}}$ | ${{eval:(sb)/10;d}}$ |')
INTRO_MS = 'Deux classes ont passé le même devoir, noté sur $20$.\n\n' + TABLE_MS + '\n\n'
VARS_MS = [var('ma', '90..135'), var('mb', '90..135'), var('sa', '10..50'), var('sb', '10..50')]
COND_MS = ['abs((ma)-(mb)) >= 3', 'abs((sa)-(sb)) >= 8']
CLASSES = ['la classe A', 'la classe B']

MS_MOYENNE = variation(
    INTRO_MS + choix('Quelle classe a les meilleurs résultats en moyenne ?', CLASSES, melanger=False),
    VARS_MS,
    ['{{if:ma>mb|0|1}}'],
    ['La **moyenne** indique le niveau : on compare ${{eval:(ma)/10;d}}$ et ${{eval:(mb)/10;d}}$.',
     'C\'est ' + colt('\\text{la classe {{if:ma>mb|A|B}}}') + ' qui a la meilleure moyenne.'],
    COND_MS)

MS_HOMOGENE = variation(
    INTRO_MS + choix('Quelle classe a les résultats les plus homogènes (les plus regroupés autour'
                     ' de la moyenne) ?', CLASSES, melanger=False),
    VARS_MS,
    ['{{if:sa<sb|0|1}}'],
    ['L\'**écart type** mesure la dispersion autour de la moyenne : le plus petit écart type'
     ' correspond aux résultats les plus homogènes.',
     'On compare ${{eval:(sa)/10;d}}$ et ${{eval:(sb)/10;d}}$ : c\'est '
     + colt('\\text{la classe {{if:sa<sb|A|B}}}') + '.'],
    COND_MS)

SP_MS = {'ma': 112, 'mb': 108, 'sa': 45, 'sb': 21}
MODELES.append(modele(
    '06-comparer-moyenne-ecart-type', 'Comparer deux séries : moyenne et écart type',
    'Deux séries résumées par (moyenne, écart type) : la meilleure moyenne, la plus homogène',
    COMPARER, 2, [MS_MOYENNE, MS_HOMOGENE],
    [spec('11,2 contre 10,8 : A', 0, SP_MS, '0', 'correct'),
     spec('Erreur : B', 0, SP_MS, '1', 'incorrect'),
     spec('Écarts types 4,5 et 2,1 : B plus homogène', 1, SP_MS, '1', 'correct'),
     spec('Erreur : A (plus grand écart type)', 1, SP_MS, '0', 'incorrect')]))

# =============================================================================================
# 7. 2-483 : comparer par médiane et écart interquartile
# =============================================================================================

TABLE_MQ = ('| | $Q_1$ | Médiane | $Q_3$ |\n|---|---|---|---|\n'
            '| Lycée A | ${{qa}}$ | ${{ma}}$ | ${{ra}}$ |\n'
            '| Lycée B | ${{qb}}$ | ${{mb}}$ | ${{rb}}$ |')
INTRO_MQ = ('On a relevé les temps de trajet (en minutes) des élèves de deux lycées A et B.\n\n'
            + TABLE_MQ + '\n\n')
VARS_MQ = [var('qa', '5..12'), var('ga', '1..6'), var('ha', '1..8'), var('ma', 'eval:(qa)+(ga)'),
           var('ra', 'eval:(ma)+(ha)'), var('qb', '5..12'), var('gb', '1..6'), var('hb', '1..8'),
           var('mb', 'eval:(qb)+(gb)'), var('rb', 'eval:(mb)+(hb)'),
           var('ia', 'eval:(ra)-(qa)'), var('ib', 'eval:(rb)-(qb)')]

MQ_ECARTS = variation(
    INTRO_MQ + 'Calcule l\'écart interquartile des temps de chaque lycée.\n\nLycée A : $?$ ; lycée B : $?$',
    VARS_MQ,
    ['{{ia}}', '{{ib}}'],
    ['Écart interquartile $=Q_3-Q_1$.',
     'Lycée A : ${{ra}}-{{qa}}=' + col('{{ia}}') + '$ ; lycée B : ${{rb}}-{{qb}}=' + col('{{ib}}')
     + '$.'],
    ['ia != ib'])

MQ_DISPERSION = variation(
    INTRO_MQ + choix('Selon l\'écart interquartile, quel lycée a les temps les plus dispersés ?',
                     ['le lycée A', 'le lycée B', 'aussi dispersés l\'un que l\'autre'], melanger=False),
    VARS_MQ,
    ['{{if:ia>ib|0|1}}'],
    ['L\'**écart interquartile** $Q_3-Q_1$ mesure la dispersion de la moitié centrale des valeurs.',
     'Lycée A : ${{ra}}-{{qa}}={{ia}}$ ; lycée B : ${{rb}}-{{qb}}={{ib}}$.'
     ' Les temps les plus dispersés sont ceux du ' + colt('\\text{lycée {{if:ia>ib|A|B}}}') + '.'],
    ['ia != ib'])

SP_MQ = {'qa': 8, 'ga': 4, 'ha': 3, 'ma': 12, 'ra': 15, 'qb': 6, 'gb': 4, 'hb': 8, 'mb': 10, 'rb': 18,
         'ia': 7, 'ib': 12}
MODELES.append(modele(
    '07-comparer-mediane-ecart-interquartile', 'Comparer deux séries : médiane et écart interquartile',
    'Deux séries résumées par (Q1, médiane, Q3) : écarts interquartiles, la plus dispersée',
    COMPARER, 3, [MQ_ECARTS, MQ_DISPERSION],
    [spec('A : 15 − 8 = 7 ; B : 18 − 6 = 12', 0, SP_MQ, ['7', '12'], 'correct'),
     spec('Erreur : médiane − Q1', 0, SP_MQ, ['4', '4'], 'incorrect'),
     spec('B plus dispersée', 1, SP_MQ, '1', 'correct'),
     spec('Erreur : A (meilleure médiane)', 1, SP_MQ, '0', 'incorrect')]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
