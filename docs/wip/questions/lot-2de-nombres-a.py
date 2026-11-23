"""Écrit les 7 modèles du lot A « nombres » de la seconde (chantier ensembles-2de) dans
scripts/questions/2de-nombres-a/.

Conception validée par David (chantier ensembles-2de) ; un point par modèle, posé plus tard par
migration (aucun champ de point ni de nœud dans les fichiers) :

| # | Point     | Titre                                                  | Niveau |
| 1 | 2-254     | Arrondir un nombre décimal                             | 11     |
| 2 | 2-254     | Ordre de grandeur : est-ce vraisemblable ?             | 12     |
| 3 | 2-264     | Comparer à 1, comparer un entier et une fraction, ranger | 8    |
| 4 | 2-244     | Compter les entiers d'un intervalle                    | 5      |
| 5 | 2-420     | Distance entre deux nombres                            | 9      |
| 6 | (aucun)   | |x − a| > r : réunion de deux intervalles (hors programme, gardé sans point) | 3 |
| 7 | (aucun)   | Calculs avec plusieurs valeurs absolues (hors programme, sans point)      | 10 |

Décisions et pièges du lot :
- Décimaux tirés en entiers, affichés par `{{eval:…;d}}` (virgule) ; les nombres affichés restent
  sous 1 000 (la formule `${{n}}$` ne met pas l'espace de groupement).
- Arrondi : case `precision: decimal`, zéros de fin admis (`zeros: off`, 3,00) ; le dernier chiffre de l'arrondi n'est jamais 0 (sauf la
  variation « retenue », où l'arrondi au centième est un entier : 3 et 3,00 sont attendus justes).
- Vraisemblable : case choix Oui / Non (`melanger: non`) ; valeur fausse à un facteur 10 au moins
  de l'ordre de grandeur réaliste, que le corrigé donne.
- Comparer : case choix à trois relations (<, =, >) ; ranger : bloc ```ranger, l'ordre écrit est
  la réponse (fraction < décimal à deux chiffres < décimal à un chiffre < fraction), positions des
  specs calculées par le générateur (`positions-ranger.ts`).
- |x − a| > r : `answerKind: intervalles`, réunion acceptée.
- Valeurs absolues : `\\lvert … \\rvert` (un `|` couperait un `{{if:}}`).

    python3 docs/wip/questions/lot-2de-nombres-a.py scripts/questions/2de-nombres-a
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, answer, status, variables=None, violations=None):
    expected = {'status': status}
    if status in ('bad_form', 'unoptimal_form') and violations:
        expected['constraintViolations'] = violations
    answers = answer if isinstance(answer, list) else [answer]
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in (variables or {}).items()},
            'answers': answers, 'expected': expected}


def modele(nom, title, description, level, delay, variations, specs, shared=None,
           options=None):
    m = {'title': title, 'description': description, 'grades': ['2'], 'level': level,
         'delay': delay, 'status': 'draft'}
    if options:
        m['options'] = options
    if shared:
        m['shared'] = shared
    m['variations'] = variations
    m['testSpecs'] = specs
    return nom, m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def ev(x, d=False):
    return '{{eval:' + x + (';d' if d else '') + '}}'


def col(x):
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


def variation(statement, variables, blanks, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = blanks
    v['correction'] = {'steps': steps}
    return v


def choix(lignes):
    return '```choix\nmelanger: non\n' + '\n'.join('- ' + l for l in lignes) + '\n```'


def ab(x):
    return '\\lvert ' + x + '\\rvert'


# --- 1. Arrondir (point 2-254, niveau 11) ------------------------------------------------------
# x tiré en entiers (partie entière + chiffres), affiché par ;d. h = 1 quand le chiffre suivant
# vaut 5 ou plus. Conditions : l'arrondi ne finit pas par 0 et ne fait pas de retenue (retenue :
# variation à part).

def arrondi(rang, x, chiffre_garde, suivant, nom_suivant, arrondi_, digits, variables, conditions,
            garde_nom):
    return variation(
        'Arrondis $' + x + '$ ' + rang + '.\n\n$' + x + '\\approx ?$',
        variables,
        [{'expectedAnswer': arrondi_, 'precision': {'type': 'decimal', 'digits': digits}}],
        ['On repère le chiffre ' + garde_nom + ' : $' + chiffre_garde + '$. On regarde le chiffre '
         '**suivant**, celui ' + nom_suivant + ' : $' + suivant + '$.',
         '{{if:h==1|$' + suivant + '\\geqslant 5$ : on **augmente de 1** le chiffre ' + garde_nom
         + ', et on supprime les chiffres suivants.|$' + suivant + '<5$ : on **garde** le chiffre '
         + garde_nom + ', et on supprime les chiffres suivants.}}',
         '$' + x + '\\approx ' + col(arrondi_) + '$.'],
        conditions)


X_UNITE = ev('(1000*a+f)/1000', True)
V_UNITE = arrondi(
    "à l'unité", X_UNITE, '{{a}}', '{{s}}', 'des dixièmes', ev('a+h'), 0,
    [var('a', '2..99'), var('f', '1..999'), var('h', 'eval:floor(f/500)'),
     var('s', 'eval:floor(f/100)')],
    ['f != 500'], 'des unités')

X_DIX = ev('(10000*a+1000*t+g)/10000', True)
V_DIX = arrondi(
    'au dixième', X_DIX, '{{t}}', '{{s}}', 'des centièmes', ev('(10*a+t+h)/10', True), 1,
    [var('a', '0..49'), var('t', '0..9'), var('g', '1..999'), var('h', 'eval:floor(g/500)'),
     var('s', 'eval:floor(g/100)')],
    ['t + h >= 1', 't + h <= 9', 'g != 500'], 'des dixièmes')

X_CENT = ev('(100000*a+10000*dd+1000*cc+g)/100000', True)
V_CENT = arrondi(
    'au centième', X_CENT, '{{cc}}', '{{s}}', 'des millièmes',
    ev('(100*a+10*dd+cc+h)/100', True), 2,
    [var('a', '0..9'), var('dd', '0..9'), var('cc', '0..9'), var('g', '1..999'),
     var('h', 'eval:floor(g/500)'), var('s', 'eval:floor(g/100)')],
    ['cc + h >= 1', 'cc + h <= 9', 'g != 500'], 'des centièmes')

X_MILLE = ev('(100000*a+10000*dd+1000*cc+100*mm+g)/100000', True)
V_MILLE = arrondi(
    'au millième', X_MILLE, '{{mm}}', '{{s}}', 'des dix-millièmes',
    ev('(1000*a+100*dd+10*cc+mm+h)/1000', True), 3,
    [var('a', '0..20'), var('dd', '0..9'), var('cc', '0..9'), var('mm', '0..9'),
     var('g', '1..99'), var('h', 'eval:floor(g/50)'), var('s', 'eval:floor(g/10)')],
    ['mm + h >= 1', 'mm + h <= 9', 'g != 50'], 'des millièmes')

# Retenue : a,99m avec m ⩾ 5, arrondi au centième = a + 1 (écrit a+1,00)
X_RET = ev('(1000*a+990+m)/1000', True)
V_RETENUE = variation(
    'Arrondis $' + X_RET + '$ au centième.\n\n$' + X_RET + '\\approx ?$',
    [var('a', '0..19'), var('m', '5..9')],
    [{'expectedAnswer': ev('a+1'), 'precision': {'type': 'decimal', 'digits': 2}}],
    ['On repère le chiffre des centièmes : $9$. On regarde le chiffre **suivant**, celui des '
     'millièmes : ${{m}}\\geqslant 5$, on **augmente de 1** le chiffre des centièmes.',
     'Mais $9+1=10$ : il y a une **retenue**. $' + ev('a') + '{,}99$ devient $' + ev('a+1')
     + '{,}00$, comme quand on ajoute $0{,}01$ à $' + ev('a') + '{,}99$.',
     '$' + X_RET + '\\approx ' + col(ev('a+1') + '{,}00') + '$, que l\'on peut aussi écrire $'
     + ev('a+1') + '$.'])

ARRONDIR = modele(
    '01-arrondir-un-nombre', 'Arrondir un nombre décimal',
    "Arrondir à l'unité, au dixième, au centième, au millième, dont une retenue (2,996 → 3,00) "
    '(pièges : tronquer au lieu d\'arrondir, garder trop de chiffres, oublier la retenue)',
    11, 40,
    [V_UNITE, V_DIX, V_CENT, V_MILLE, V_RETENUE],
    [spec("12,718 à l'unité : 13", 0, '13', 'correct', {'a': 12, 'f': 718, 'h': 1, 's': 7}),
     spec('Erreur : troncature 12', 0, '12', 'incorrect', {'a': 12, 'f': 718, 'h': 1, 's': 7}),
     spec("45,302 à l'unité : 45", 0, '45', 'correct', {'a': 45, 'f': 302, 'h': 0, 's': 3}),
     spec('Erreur : arrondi au-dessus 46', 0, '46', 'incorrect',
          {'a': 45, 'f': 302, 'h': 0, 's': 3}),
     spec('3,1415 au dixième : 3,1', 1, '3{,}1', 'correct',
          {'a': 3, 't': 1, 'g': 415, 'h': 0, 's': 4}),
     spec('7,2681 au dixième : 7,3', 1, '7{,}3', 'correct',
          {'a': 7, 't': 2, 'g': 681, 'h': 1, 's': 6}),
     spec('Erreur : troncature 7,2', 1, '7{,}2', 'incorrect',
          {'a': 7, 't': 2, 'g': 681, 'h': 1, 's': 6}),
     spec('Trop de chiffres : 7,27 (arrondi au centième)', 1, '7{,}27', 'bad_form',
          {'a': 7, 't': 2, 'g': 681, 'h': 1, 's': 6}, ['rounding']),
     spec('3,14159 au centième : 3,14', 2, '3{,}14', 'correct',
          {'a': 3, 'dd': 1, 'cc': 4, 'g': 159, 'h': 0, 's': 1}),
     spec('2,71828 au centième : 2,72', 2, '2{,}72', 'correct',
          {'a': 2, 'dd': 7, 'cc': 1, 'g': 828, 'h': 1, 's': 8}),
     spec('Erreur : troncature 2,71', 2, '2{,}71', 'incorrect',
          {'a': 2, 'dd': 7, 'cc': 1, 'g': 828, 'h': 1, 's': 8}),
     spec('Erreur : au dixième 2,7', 2, '2{,}7', 'incorrect',
          {'a': 2, 'dd': 7, 'cc': 1, 'g': 828, 'h': 1, 's': 8}),
     spec('Point décimal 2.72', 2, '2.72', 'correct',
          {'a': 2, 'dd': 7, 'cc': 1, 'g': 828, 'h': 1, 's': 8}),
     spec('1,41421 au millième : 1,414', 3, '1{,}414', 'correct',
          {'a': 1, 'dd': 4, 'cc': 1, 'mm': 4, 'g': 21, 'h': 0, 's': 2}),
     spec('0,57721 au millième : 0,577', 3, '0{,}577', 'correct',
          {'a': 0, 'dd': 5, 'cc': 7, 'mm': 7, 'g': 21, 'h': 0, 's': 2}),
     spec('1,73205 au millième : 1,732', 3, '1{,}732', 'correct',
          {'a': 1, 'dd': 7, 'cc': 3, 'mm': 2, 'g': 5, 'h': 0, 's': 0}),
     spec('1,73268 au millième : 1,733', 3, '1{,}733', 'correct',
          {'a': 1, 'dd': 7, 'cc': 3, 'mm': 2, 'g': 68, 'h': 1, 's': 6}),
     spec('Erreur : troncature 1,732', 3, '1{,}732', 'incorrect',
          {'a': 1, 'dd': 7, 'cc': 3, 'mm': 2, 'g': 68, 'h': 1, 's': 6}),
     spec('2,996 au centième : 3,00', 4, '3{,}00', 'correct', {'a': 2, 'm': 6}),
     spec('2,996 au centième : 3', 4, '3', 'correct', {'a': 2, 'm': 6}),
     spec('Erreur : retenue oubliée 2,90', 4, '2{,}90', 'incorrect', {'a': 2, 'm': 6}),
     spec('Erreur : troncature 2,99', 4, '2{,}99', 'incorrect', {'a': 2, 'm': 6}),
     spec('Erreur : 2,100', 4, '2{,}100', 'incorrect', {'a': 2, 'm': 6})],
    # 3,00 est l'écriture attendue d'un arrondi au centième : zéros de fin admis
    options={'constraints': {'zeros': 'off'}})


# --- 2. Vraisemblable ? (point 2-254, niveau 12) -----------------------------------------------
# k = 0 : valeur réaliste v (réponse « Oui ») ; k = 1 : valeur w, à un facteur 10 au moins de
# l'ordre de grandeur réaliste (réponse « Non »).

def situation(phrase, v, w, ordre):
    """phrase contient {x} à la place de la valeur ; ordre : l'ordre de grandeur réaliste."""
    x = '{{if:k==0|{{v}}|{{w}}}}'
    return variation(
        phrase.replace('{x}', x) + ' Est-ce vraisemblable ?\n\n' + choix(['Oui', 'Non']),
        [var('k', '0|1'), var('v', v), var('w', w)],
        [{'expectedAnswer': '{{k}}'}],
        [ordre,
         '{{if:k==0|La valeur annoncée, ${{v}}$, est de cet ordre de grandeur : c\'est '
         'vraisemblable. Réponse : **' + 'Oui' + '**.|La valeur annoncée, ${{w}}$, est environ '
         '**dix fois** trop {{if:w<v|petite|grande}} (ou plus) : ce n\'est pas vraisemblable. '
         'Réponse : **Non**.}}'])


SITUATIONS = [
    situation('Une salle de classe a une aire de ${x}~\\unit{m^2}$.', '50|60|70', '5|6|500|600|800',
              'Une salle de classe mesure environ $8~\\unit{m}$ sur $8~\\unit{m}$ : son aire est de '
              "l'ordre de $50$ à $70~\\unit{m^2}$."),
    situation('Un élève de Seconde pèse ${x}~\\unit{kg}$.', '50|55|60|65', '5|6|500|600',
              "La masse d'un adolescent est de l'ordre de $50$ à $70~\\unit{kg}$."),
    situation('Un élève de Seconde mesure ${x}~\\unit{cm}$.', '160|165|170|175|180', '12|15|16',
              "Un adolescent mesure de l'ordre de $1{,}60~\\unit{m}$ à $1{,}80~\\unit{m}$, "
              'soit $160$ à $180~\\unit{cm}$.'),
    situation("Un film au cinéma dure ${x}~\\unit{min}$.", '100|110|120', '8|9|10',
              "Un film dure de l'ordre d'une heure et demie à deux heures, soit $90$ à "
              '$120~\\unit{min}$.'),
    situation('Une baignoire remplie contient ${x}~\\unit{L}$ d\'eau.', '150|200|250', '10|15|20',
              "Une baignoire remplie contient de l'ordre de $150$ à $250~\\unit{L}$ d'eau."),
    situation('Un téléphone portable a une masse de ${x}~\\unit{g}$.', '180|200|220', '10|15|18',
              "Un téléphone portable a une masse de l'ordre de $150$ à $250~\\unit{g}$."),
    situation('Un immeuble de cinq étages a une hauteur de ${x}~\\unit{m}$.', '15|18|20',
              '2|150|200',
              "Un étage mesure environ $3~\\unit{m}$ : cinq étages font de l'ordre de "
              '$15$ à $20~\\unit{m}$.'),
    situation('Un trajet à pied de ${x}~\\unit{km}$ dure une demi-heure.', '2|3', '20|30|40',
              "On marche à environ $5~\\unit{km}$ par heure : en une demi-heure, on parcourt de "
              "l'ordre de $2$ à $3~\\unit{km}$."),
]

VRAISEMBLABLE = modele(
    '02-ordre-de-grandeur-vraisemblable', 'Ordre de grandeur : est-ce vraisemblable ?',
    'Juger si une valeur annoncée (aire, masse, taille, durée, volume, distance) est vraisemblable '
    "(piège : valeur à un facteur 10 de l'ordre de grandeur réaliste)",
    12, 30,
    SITUATIONS,
    [spec('Salle de 60 m² : Oui', 0, '0', 'correct', {'k': 0, 'v': 60, 'w': 600}),
     spec('Salle de 600 m² : Non', 0, '1', 'correct', {'k': 1, 'v': 60, 'w': 600}),
     spec('Erreur : salle de 600 m² jugée vraisemblable', 0, '0', 'incorrect',
          {'k': 1, 'v': 60, 'w': 600}),
     spec('Élève de 60 kg : Oui', 1, '0', 'correct', {'k': 0, 'v': 60, 'w': 6}),
     spec('Élève de 6 kg : Non', 1, '1', 'correct', {'k': 1, 'v': 60, 'w': 6}),
     spec('Élève de 170 cm : Oui', 2, '0', 'correct', {'k': 0, 'v': 170, 'w': 16}),
     spec('Erreur : 170 cm jugés invraisemblables', 2, '1', 'incorrect',
          {'k': 0, 'v': 170, 'w': 16}),
     spec('Film de 9 min : Non', 3, '1', 'correct', {'k': 1, 'v': 110, 'w': 9}),
     spec('Baignoire de 200 L : Oui', 4, '0', 'correct', {'k': 0, 'v': 200, 'w': 15}),
     spec('Erreur : baignoire de 15 L jugée vraisemblable', 4, '0', 'incorrect',
          {'k': 1, 'v': 200, 'w': 15}),
     spec('Téléphone de 15 g : Non', 5, '1', 'correct', {'k': 1, 'v': 200, 'w': 15}),
     spec('Immeuble de 18 m : Oui', 6, '0', 'correct', {'k': 0, 'v': 18, 'w': 150}),
     spec('Erreur : immeuble de 150 m jugé vraisemblable', 6, '0', 'incorrect',
          {'k': 1, 'v': 18, 'w': 150}),
     spec('30 km en une demi-heure à pied : Non', 7, '1', 'correct', {'k': 1, 'v': 3, 'w': 30})])


# --- 3. Comparer à 1, un entier et une fraction, ranger (point 2-264, niveau 8) ---------------

FR = '\\dfrac{ {{p}} }{ {{q}} }'
V_COMP_1 = variation(
    'Compare $' + FR + '$ et $1$.\n\n'
    + choix(['$' + FR + '<1$', '$' + FR + '=1$', '$' + FR + '>1$']),
    [var('q', '2..12'), var('p', '1..20'), var('idx', 'eval:2*min(max(p-q,0),1)')],
    [{'expectedAnswer': '{{idx}}'}],
    ['$1=' + '\\dfrac{ {{q}} }{ {{q}} }$ : on compare les numérateurs, le dénominateur étant le même.',
     '{{if:idx==0|${{p}}<{{q}}$ : le numérateur est **plus petit** que le dénominateur, donc $'
     + col(FR + '<1') + '$.|${{p}}>{{q}}$ : le numérateur est **plus grand** que le dénominateur, '
     'donc $' + col(FR + '>1') + '$.}}'],
    ['p != q', 'gcd(p,q) == 1', 'p <= 2*q'])

FN = '\\dfrac{ {{p}} }{ {{q}} }'
V_COMP_N = variation(
    'Compare ${{n}}$ et $' + FN + '$.\n\n'
    + choix(['${{n}}<' + FN + '$', '${{n}}=' + FN + '$', '${{n}}>' + FN + '$']),
    [var('q', '3..9'), var('n', '1..9'), var('r', '1..8'), var('sg', '0|1'),
     var('p', 'eval:n*q+(2*sg-1)*r'), var('idx', 'eval:2*(1-sg)')],
    [{'expectedAnswer': '{{idx}}'}],
    ['On écrit ${{n}}$ avec le dénominateur ${{q}}$ : ${{n}}=\\dfrac{ ' + ev('n*q') + ' }{ {{q}} }$.',
     '{{if:sg==1|$' + ev('n*q') + '<{{p}}$, donc $' + col('{{n}}<' + FN) + '$.|$' + ev('n*q')
     + '>{{p}}$, donc $' + col('{{n}}>' + FN) + '$.}}'],
    ['r < q', 'gcd(r,q) == 1'])

# Ordre écrit = ordre juste : p/q < 0,d2 < 0,d3 < r/s.
# d2 = 10·d3 − c (piège : 0,68 > 0,7 parce que 68 > 7) ; p/q juste en dessous de 0,d2,
# r/s juste au-dessus de 0,d3.
L_PQ = '$\\dfrac{ {{p}} }{ {{q}} }$'
L_D2 = '$' + ev('d2/100', True) + '$'
L_D3 = '$' + ev('d3/10', True) + '$'
L_RS = '$\\dfrac{ {{r}} }{ {{s}} }$'
V_RANGER = variation(
    'Range ces nombres dans l\'ordre **croissant**.\n\n```ranger\nsigne: <\n- ' + L_PQ + '\n- '
    + L_D2 + '\n- ' + L_D3 + '\n- ' + L_RS + '\n```',
    [var('d3', '4..8'), var('c', '1..5'), var('d2', 'eval:10*d3-c'), var('q', '3|6|7|9'),
     var('p', 'eval:floor((d2*q-1)/100)'), var('s', '4|5|8'),
     var('r', 'eval:floor(d3*s/10)+1')],
    [],
    ['On écrit chaque nombre en écriture décimale (au millième près pour les fractions) : '
     '$\\dfrac{ {{p}} }{ {{q}} }\\approx ' + ev('round(1000*p/q)/1000', True) + '$, $\\dfrac{ {{r}} }{ {{s}} }='
     + ev('r/s', True) + '$.',
     'Pour comparer $' + ev('d2/100', True) + '$ et $' + ev('d3/10', True) + '$, on écrit $'
     + ev('d3/10', True) + '=' + ev('d3/10', True) + '0$ : $' + ev('d2/100', True) + '<'
     + ev('d3/10', True) + '0$ (on ne compare pas $' + ev('d2') + '$ et $' + ev('d3') + '$).',
     '$' + col('\\dfrac{ {{p}} }{ {{q}} }<' + ev('d2/100', True) + '<' + ev('d3/10', True)
     + '<\\dfrac{ {{r}} }{ {{s}} }') + '$'],
    ['p >= 1', 'r < s', 'gcd(p,q) == 1', 'gcd(r,s) == 1'])

S3_RANGER = {'d3': 7, 'c': 2, 'd2': 68, 'q': 3, 'p': 2, 's': 4, 'r': 3}
COMPARER = modele(
    '03-comparer-a-1-et-ranger', 'Comparer une fraction à 1, un entier et une fraction, ranger',
    'Comparer p/q et 1, un entier et une fraction, puis ranger fractions et décimaux dans l\'ordre '
    'croissant (pièges : 0,68 > 0,7 parce que 68 > 7, fraction jugée sans la comparer)',
    8, 60,
    [V_COMP_1, V_COMP_N, V_RANGER],
    [spec('7/8 < 1', 0, '0', 'correct', {'q': 8, 'p': 7, 'idx': 0}),
     spec('Erreur : 7/8 > 1', 0, '2', 'incorrect', {'q': 8, 'p': 7, 'idx': 0}),
     spec('9/4 > 1', 0, '2', 'correct', {'q': 4, 'p': 9, 'idx': 2}),
     spec('Erreur : 9/4 < 1', 0, '0', 'incorrect', {'q': 4, 'p': 9, 'idx': 2}),
     spec('3 < 17/5', 1, '0', 'correct', {'q': 5, 'n': 3, 'r': 2, 'sg': 1, 'p': 17, 'idx': 0}),
     spec('Erreur : 3 > 17/5', 1, '2', 'incorrect',
          {'q': 5, 'n': 3, 'r': 2, 'sg': 1, 'p': 17, 'idx': 0}),
     spec('4 > 25/7', 1, '2', 'correct', {'q': 7, 'n': 4, 'r': 3, 'sg': 0, 'p': 25, 'idx': 2}),
     spec('Erreur : 4 = 25/7', 1, '1', 'incorrect',
          {'q': 7, 'n': 4, 'r': 3, 'sg': 0, 'p': 25, 'idx': 2}),
     'RANGER:2'])


# --- 4. Compter les entiers d'un intervalle (point 2-244, niveau 5) ----------------------------

def crochet_g(o):
    return '{{if:' + o + '==0|[|]}}'


def crochet_d(o):
    return '{{if:' + o + '==0|]|[}}'


def compte(m, M):
    """Phrase « de m à M : M − m + 1 entiers », parenthèses si m < 0."""
    return ('{{if:' + m + '<0|$' + ev(M) + '-(' + ev(m) + ')+1=' + col(ev(M + '-(' + m + ')+1'))
            + '$|$' + ev(M) + '-' + ev(m) + '+1=' + col(ev(M + '-(' + m + ')+1')) + '$}}')


BORNE_A = ev('(10*la+fa)/10', True)
BORNE_B = ev('(10*lb+fb)/10', True)
V_DEC = variation(
    'Combien de nombres **entiers** l\'intervalle $\\left[' + BORNE_A + '\\,;' + BORNE_B
    + '\\right]$ contient-il ?\n\n$?$ entiers',
    [var('la', '-9..4'), var('w', '2..8'), var('lb', 'eval:la+w'), var('fa', '1..9'),
     var('fb', '1..9'), var('m', 'eval:la+1'), var('M', 'eval:lb')],
    [{'expectedAnswer': ev('w')}],
    ['Les bornes ne sont pas entières. Le plus petit entier de l\'intervalle est $' + ev('la+1')
     + '$ (le premier entier **après** $' + BORNE_A + '$), le plus grand est $' + ev('lb') + '$.',
     'On compte les entiers de $' + ev('la+1') + '$ à $' + ev('lb') + '$ : ' + compte('m', 'M')
     + '.'])

V_ENT = variation(
    'Combien de nombres **entiers** l\'intervalle $\\left' + crochet_g('o1') + '{{a}}\\,;{{b}}\\right'
    + crochet_d('o2') + '$ contient-il ?\n\n$?$ entiers',
    [var('a', '-9..5'), var('w', '2..9'), var('b', 'eval:a+w'), var('o1', '0|1'),
     var('o2', '0|1'), var('m', 'eval:a+o1'), var('M', 'eval:b-o2')],
    [{'expectedAnswer': ev('w+1-o1-o2')}],
    ['{{if:o1==0|Le crochet est **fermé** en ${{a}}$ : ${{a}}$ est dans l\'intervalle.|Le crochet '
     'est **ouvert** en ${{a}}$ : ${{a}}$ n\'est **pas** dans l\'intervalle.}} '
     '{{if:o2==0|Le crochet est **fermé** en ${{b}}$ : ${{b}}$ est dans l\'intervalle.|Le crochet '
     'est **ouvert** en ${{b}}$ : ${{b}}$ n\'est **pas** dans l\'intervalle.}}',
     'Les entiers vont de $' + ev('m') + '$ à $' + ev('M') + '$ : ' + compte('m', 'M') + '.'],
    )

V_PETIT_ENT = variation(
    'Quel est le **plus petit** nombre entier de l\'intervalle $\\left' + crochet_g('o1')
    + '{{a}}\\,;{{b}}\\right]$ ?\n\n$?$',
    [var('a', '-9..5'), var('w', '2..9'), var('b', 'eval:a+w'), var('o1', '0|1')],
    [{'expectedAnswer': ev('a+o1')}],
    ['{{if:o1==0|Le crochet est **fermé** en ${{a}}$ : ${{a}}$ est dans l\'intervalle, c\'est son '
     'plus petit entier : $' + col('{{a}}') + '$.|Le crochet est **ouvert** en ${{a}}$ : ${{a}}$ '
     'n\'est **pas** dans l\'intervalle. Le plus petit entier est le suivant : $' + col(ev('a+1'))
     + '$.}}'])

V_PETIT_DEC = variation(
    'Quel est le **plus petit** nombre entier de l\'intervalle $\\left[' + BORNE_A + '\\,;'
    + BORNE_B + '\\right]$ ?\n\n$?$',
    [var('la', '-9..-1'), var('w', '2..8'), var('lb', 'eval:la+w'), var('fa', '1..9'),
     var('fb', '1..9')],
    [{'expectedAnswer': ev('la+1')}],
    ['Sur la droite graduée, $' + BORNE_A + '$ est entre $' + ev('la') + '$ et $' + ev('la+1')
     + '$.',
     'Les nombres de l\'intervalle sont **après** $' + BORNE_A + '$ : le plus petit entier est $'
     + col(ev('la+1')) + '$ (et non $' + ev('la') + '$, qui est plus petit que $' + BORNE_A
     + '$).'])

ENTIERS = modele(
    '04-entiers-d-un-intervalle', 'Compter les entiers d\'un intervalle',
    'Nombre d\'entiers d\'un intervalle à bornes décimales ou entières (crochets ouverts ou '
    'fermés), plus petit entier d\'un intervalle (pièges : bornes exclues comptées, −2,5 → −3)',
    5, 45,
    [V_DEC, V_ENT, V_PETIT_ENT, V_PETIT_DEC],
    [spec('[−2,5 ; 3,7] : 6 entiers', 0, '6', 'correct',
          {'la': -3, 'w': 6, 'lb': 3, 'fa': 5, 'fb': 7, 'm': -2, 'M': 3}),
     spec('Erreur : de −3 à 3 (7)', 0, '7', 'incorrect',
          {'la': -3, 'w': 6, 'lb': 3, 'fa': 5, 'fb': 7, 'm': -2, 'M': 3}),
     spec('Erreur : 3 − (−2) = 5', 0, '5', 'incorrect',
          {'la': -3, 'w': 6, 'lb': 3, 'fa': 5, 'fb': 7, 'm': -2, 'M': 3}),
     spec(']−2 ; 4] : 6 entiers', 1, '6', 'correct',
          {'a': -2, 'w': 6, 'b': 4, 'o1': 1, 'o2': 0, 'm': -1, 'M': 4}),
     spec('Erreur : crochet ouvert ignoré (7)', 1, '7', 'incorrect',
          {'a': -2, 'w': 6, 'b': 4, 'o1': 1, 'o2': 0, 'm': -1, 'M': 4}),
     spec('[1 ; 5] : 5 entiers', 1, '5', 'correct',
          {'a': 1, 'w': 4, 'b': 5, 'o1': 0, 'o2': 0, 'm': 1, 'M': 5}),
     spec('Erreur : 5 − 1 = 4', 1, '4', 'incorrect',
          {'a': 1, 'w': 4, 'b': 5, 'o1': 0, 'o2': 0, 'm': 1, 'M': 5}),
     spec(']1 ; 5[ : 3 entiers', 1, '3', 'correct',
          {'a': 1, 'w': 4, 'b': 5, 'o1': 1, 'o2': 1, 'm': 2, 'M': 4}),
     spec(']−3 ; 4] : −2', 2, '-2', 'correct', {'a': -3, 'w': 7, 'b': 4, 'o1': 1}),
     spec('Erreur : −3 (crochet ouvert)', 2, '-3', 'incorrect', {'a': -3, 'w': 7, 'b': 4, 'o1': 1}),
     spec('[2 ; 7] : 2', 2, '2', 'correct', {'a': 2, 'w': 5, 'b': 7, 'o1': 0}),
     spec('[−2,5 ; 3,7] : −2', 3, '-2', 'correct', {'la': -3, 'w': 6, 'lb': 3, 'fa': 5, 'fb': 7}),
     spec('Erreur : −3', 3, '-3', 'incorrect', {'la': -3, 'w': 6, 'lb': 3, 'fa': 5, 'fb': 7})])


# --- 5. Distance entre deux nombres (point 2-420, niveau 9) ------------------------------------

def distance(a_txt, b_txt, calcul, d, variables, conditions=None):
    return variation(
        'Quelle est la **distance** entre les nombres $' + a_txt + '$ et $' + b_txt + '$ ?\n\n$d=?$',
        variables,
        [{'expectedAnswer': d}],
        ['La distance entre deux nombres $a$ et $b$ est $\\lvert a-b\\rvert$ : la différence, '
         'sans son signe. On peut soustraire dans un sens ou dans l\'autre.',
         '$d=' + calcul + '=' + col(d) + '$.'],
        conditions)


V_D_POS = distance(
    '{{a}}', '{{b}}', ab('{{a}}-{{b}}') + '=' + ab(ev('a-b')), ev('b-a'),
    [var('a', '1..30'), var('w', '1..30'), var('b', 'eval:a+w')])
V_D_SIGNES = distance(
    ev('-p'), '{{q}}', ab(ev('-p') + '-{{q}}') + '=' + ab(ev('-p-q')), ev('p+q'),
    [var('p', '1..20'), var('q', '1..20')])
V_D_NEG = distance(
    ev('-p'), ev('-q'), ab(ev('-p') + '-(' + ev('-q') + ')') + '=' + ab(ev('q-p')), ev('p-q'),
    [var('q', '1..15'), var('w', '1..15'), var('p', 'eval:q+w')])
V_D_DEC = distance(
    ev('-p/10', True), ev('q/10', True),
    ab(ev('-p/10', True) + '-' + ev('q/10', True)) + '=' + ab(ev('-(p+q)/10', True)),
    ev('(p+q)/10', True),
    [var('pu', '0..9'), var('pf', '1..9'), var('qu', '0..9'), var('qf', '1..9'),
     var('p', 'eval:10*pu+pf'), var('q', 'eval:10*qu+qf')])

D_DEC = {'pu': 1, 'pf': 5, 'qu': 2, 'qf': 3, 'p': 15, 'q': 23}
DISTANCE = modele(
    '05-distance-entre-deux-nombres', 'Distance entre deux nombres',
    'Distance |a − b| entre deux positifs, deux nombres de signes contraires, deux négatifs, deux '
    'décimaux (pièges : soustraire les distances à 0, réponse négative)',
    9, 40,
    [V_D_POS, V_D_SIGNES, V_D_NEG, V_D_DEC],
    [spec('Entre 4 et 11 : 7', 0, '7', 'correct', {'a': 4, 'w': 7, 'b': 11}),
     spec('Erreur : −7', 0, '-7', 'incorrect', {'a': 4, 'w': 7, 'b': 11}),
     spec('Entre −3 et 5 : 8', 1, '8', 'correct', {'p': 3, 'q': 5}),
     spec('Erreur : 5 − 3 = 2', 1, '2', 'incorrect', {'p': 3, 'q': 5}),
     spec('Erreur : −8', 1, '-8', 'incorrect', {'p': 3, 'q': 5}),
     spec('Entre −9 et −4 : 5', 2, '5', 'correct', {'q': 4, 'w': 5, 'p': 9}),
     spec('Erreur : 9 + 4 = 13', 2, '13', 'incorrect', {'q': 4, 'w': 5, 'p': 9}),
     spec('Entre −1,5 et 2,3 : 3,8', 3, '3{,}8', 'correct', D_DEC),
     spec('Erreur : 2,3 − 1,5 = 0,8', 3, '0{,}8', 'incorrect', D_DEC)],
    {'blankDefaults': {'acceptDecimal': True}})


# --- 6. |x − a| > r (hors programme, sans point, niveau 3) -------------------------------------

def abs_inequation(centre, variables, conditions=None):
    """centre : texte de |x − a| (signe compris) ; a peut être négatif."""
    sym = '{{if:s==0|>|\\geqslant }}'
    rep = ('{{if:s==0|]-\\infty;' + ev('a-r') + '[\\cup]' + ev('a+r') + ';+\\infty[|]-\\infty;'
           + ev('a-r') + ']\\cup[' + ev('a+r') + ';+\\infty[}}')
    sol = ('{{if:s==0|\\left]-\\infty\\,;' + ev('a-r') + '\\right[\\cup\\left]' + ev('a+r')
           + '\\,;+\\infty\\right[|\\left]-\\infty\\,;' + ev('a-r') + '\\right]\\cup\\left['
           + ev('a+r') + '\\,;+\\infty\\right[}}')
    return variation(
        'Résous dans $\\mathbb{R}$ l\'inéquation $\\lvert ' + centre + '\\rvert' + sym
        + '{{r}}$.\n\nL\'ensemble des solutions est $S=?$.',
        variables,
        [{'expectedAnswer': rep}],
        ['$\\lvert ' + centre + '\\rvert=\\lvert x-(' + ev('a') + ')\\rvert$ est la **distance** '
         'entre $x$ et $' + ev('a') + '$.' if '+' in centre else
         '$\\lvert ' + centre + '\\rvert$ est la **distance** entre $x$ et $' + ev('a') + '$.',
         'On cherche les nombres dont la distance à $' + ev('a') + '$ est {{if:s==0|**strictement '
         'supérieure** à|**supérieure ou égale** à}} ${{r}}$ : ceux situés {{if:s==0|strictement '
         'avant|avant}} $' + ev('a') + '-{{r}}=' + ev('a-r') + '$ ou {{if:s==0|strictement '
         'après|après}} $' + ev('a') + '+{{r}}=' + ev('a+r') + '${{if:s==0|.|, bornes comprises.}}',
         'Deux morceaux séparés : on les réunit par $\\cup$. $S=' + col(sol) + '$.'],
        conditions)


V_ABS_POS = abs_inequation('x-{{a}}', [var('a', '1..6'), var('r', '1..6'), var('s', '0|1')])
V_ABS_NEG = abs_inequation('x+' + ev('-a'),
                           [var('a', '-6..-1'), var('r', '1..6'), var('s', '0|1')])

ABS_INEQ = modele(
    '06-valeur-absolue-superieure', 'Résoudre |x − a| > r',
    'Inéquation |x − a| > r ou ⩾ r par la distance à a : réunion de deux intervalles (pièges : '
    'intervalle entre a − r et a + r, crochets, centre −a pour |x + a|)',
    3, 75,
    [V_ABS_POS, V_ABS_NEG],
    [spec('|x − 2| > 3 : ]−∞ ; −1[ ∪ ]5 ; +∞[', 0, ']-\\infty;-1[\\cup]5;+\\infty[', 'correct',
          {'a': 2, 'r': 3, 's': 0}),
     spec('Réunion écrite dans l\'autre ordre', 0, ']5;+\\infty[\\cup]-\\infty;-1[', 'correct',
          {'a': 2, 'r': 3, 's': 0}),
     spec('Erreur : ]−1 ; 5[', 0, ']-1;5[', 'incorrect', {'a': 2, 'r': 3, 's': 0}),
     spec('Erreur : crochets fermés', 0, ']-\\infty;-1]\\cup[5;+\\infty[', 'incorrect',
          {'a': 2, 'r': 3, 's': 0}),
     spec('Erreur : ]5 ; +∞[ seul', 0, ']5;+\\infty[', 'incorrect', {'a': 2, 'r': 3, 's': 0}),
     spec('|x − 4| ⩾ 1 : ]−∞ ; 3] ∪ [5 ; +∞[', 0, ']-\\infty;3]\\cup[5;+\\infty[', 'correct',
          {'a': 4, 'r': 1, 's': 1}),
     spec('Erreur : crochets ouverts', 0, ']-\\infty;3[\\cup]5;+\\infty[', 'incorrect',
          {'a': 4, 'r': 1, 's': 1}),
     spec('|x + 3| > 2 : ]−∞ ; −5[ ∪ ]−1 ; +∞[', 1, ']-\\infty;-5[\\cup]-1;+\\infty[', 'correct',
          {'a': -3, 'r': 2, 's': 0}),
     spec('Erreur : centre 3 au lieu de −3', 1, ']-\\infty;1[\\cup]5;+\\infty[', 'incorrect',
          {'a': -3, 'r': 2, 's': 0})],
    {'blankDefaults': {'answerKind': 'intervalles'}})


# --- 7. Calculs avec plusieurs valeurs absolues (hors programme, sans point, niveau 10) ---------

def calcul_abs(expr, steps, rep, variables, conditions=None):
    return variation(
        'Calcule $A=' + expr + '$.\n\n$A=?$',
        variables, [{'expectedAnswer': rep}], steps, conditions)


V_SOMME = calcul_abs(
    ab('-{{a}}') + '+' + ab('{{b}}-{{c}}'),
    ['$' + ab('-{{a}}') + '={{a}}$ et $' + ab('{{b}}-{{c}}') + '=' + ab(ev('b-c')) + '='
     + ev('c-b') + '$ : une valeur absolue n\'est jamais négative.',
     '$A={{a}}+' + ev('c-b') + '=' + col(ev('a+c-b')) + '$.'],
    ev('a+c-b'), [var('a', '1..9'), var('b', '1..9'), var('c', '2..15')], ['b < c'])

V_DIFF = calcul_abs(
    ab('{{b}}-{{c}}') + '-' + ab('-{{a}}'),
    ['$' + ab('{{b}}-{{c}}') + '=' + ab(ev('b-c')) + '=' + ev('c-b') + '$ et $' + ab('-{{a}}')
     + '={{a}}$.',
     '$A=' + ev('c-b') + '-{{a}}=' + col(ev('c-b-a')) + '$.'],
    ev('c-b-a'), [var('a', '1..9'), var('b', '1..9'), var('c', '2..15')], ['b < c'])

V_PROD = calcul_abs(
    ab('-{{a}}') + '\\times' + ab('{{b}}-{{c}}'),
    ['$' + ab('-{{a}}') + '={{a}}$ et $' + ab('{{b}}-{{c}}') + '=' + ab(ev('b-c')) + '='
     + ev('c-b') + '$.',
     '$A={{a}}\\times' + ev('c-b') + '=' + col(ev('a*(c-b)')) + '$.'],
    ev('a*(c-b)'), [var('a', '2..9'), var('b', '1..9'), var('c', '2..12')], ['b < c'])

V_IMBR = calcul_abs(
    '\\left\\lvert ' + ab('-{{a}}') + '-{{b}}\\right\\rvert',
    ['On calcule d\'abord la valeur absolue **intérieure** : $' + ab('-{{a}}') + '={{a}}$.',
     '$A=' + ab('{{a}}-{{b}}') + '=' + ab(ev('a-b')) + '=' + col(ev('b-a')) + '$.'],
    ev('b-a'), [var('a', '1..9'), var('w', '1..9'), var('b', 'eval:a+w')])

CALCULS_ABS = modele(
    '07-calculs-valeurs-absolues', 'Calculer avec plusieurs valeurs absolues',
    'Somme, différence, produit de valeurs absolues, valeur absolue imbriquée (pièges : |b − c| '
    'gardé négatif, |−a| = −a, ordre des calculs)',
    10, 45,
    [V_SOMME, V_DIFF, V_PROD, V_IMBR],
    [spec('|−3| + |5 − 8| = 6', 0, '6', 'correct', {'a': 3, 'b': 5, 'c': 8}),
     spec('Erreur : |5 − 8| gardé négatif (0)', 0, '0', 'incorrect', {'a': 3, 'b': 5, 'c': 8}),
     spec('Erreur : |−3| lu −3 et |5 − 8| lu −3 (−6)', 0, '-6', 'incorrect', {'a': 3, 'b': 5, 'c': 8}),
     spec('|2 − 9| − |−4| = 3', 1, '3', 'correct', {'a': 4, 'b': 2, 'c': 9}),
     spec('Erreur : 7 + 4 = 11', 1, '11', 'incorrect', {'a': 4, 'b': 2, 'c': 9}),
     spec('|7 − 9| − |−6| = −4', 1, '-4', 'correct', {'a': 6, 'b': 7, 'c': 9}),
     spec('Erreur : résultat sans signe 4', 1, '4', 'incorrect', {'a': 6, 'b': 7, 'c': 9}),
     spec('|−3| × |2 − 7| = 15', 2, '15', 'correct', {'a': 3, 'b': 2, 'c': 7}),
     spec('Erreur : |−3| lu −3 (−15)', 2, '-15', 'incorrect', {'a': 3, 'b': 2, 'c': 7}),
     spec('||−2| − 5| = 3', 3, '3', 'correct', {'a': 2, 'w': 3, 'b': 5}),
     spec('Erreur : −3', 3, '-3', 'incorrect', {'a': 2, 'w': 3, 'b': 5}),
     spec('Erreur : |−2 − 5| = 7', 3, '7', 'incorrect', {'a': 2, 'w': 3, 'b': 5})])


MODELES = [ARRONDIR, VRAISEMBLABLE, COMPARER, ENTIERS, DISTANCE, ABS_INEQ, CALCULS_ABS]


# --- Specs « ranger » : positions affichées calculées par le générateur ------------------------

def positions(chemin, vi, variables):
    out = subprocess.run(['pnpm', 'exec', 'tsx', 'docs/wip/questions/positions-ranger.ts', chemin,
                          str(vi), json.dumps({k: str(v) for k, v in variables.items()})],
                         check=True, capture_output=True, text=True).stdout.strip().splitlines()
    return json.loads(out[-1])


os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    chemin = os.path.join(DOSSIER, nom + '.json')
    a_ranger = [s for s in m['testSpecs'] if isinstance(s, str)]
    m['testSpecs'] = [s for s in m['testSpecs'] if not isinstance(s, str)]
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
    for marque in a_ranger:
        vi = int(marque.split(':')[1])
        juste = positions(chemin, vi, S3_RANGER)
        # Piège : 0,7 avant 0,68 (68 > 7)
        faux = juste[:]
        faux[1], faux[2] = faux[2], faux[1]
        m['testSpecs'] += [spec('2/3 < 0,68 < 0,7 < 3/4', vi, juste, 'correct', S3_RANGER),
                           spec('Erreur : 0,7 avant 0,68', vi, faux, 'incorrect', S3_RANGER)]
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
