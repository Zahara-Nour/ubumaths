"""Écrit les 8 modèles du lot 1 du CM2 (numération des entiers) dans scripts/questions/cm2-1/.

Phase 0 validée par David le 2026-10-28 (§ 6 du journal `docs/wip/questions-cm2-progress.md`).
Bornes : `cycle3.json`, CM2 (entiers d'au plus neuf chiffres, neuf rangs, ranger jusqu'à cinq
nombres ; exemples du programme : 3 405 270 … 3 450 207, 12 342 320 pailles en cartons de
10 000, le nombre qui suit 999 999). Un point par modèle ; le nœud et le tag sont posés par la
migration de rangement, après le `--publier` de David.

Décisions et pièges :
- règle de l'école « espaces dès 4 chiffres », comme le lot « nombres » de 6e ;
- choix en case « choix » (bloc ```choix, ADR 0033), jamais l'ancien QCM ;
- niveaux : suite des niveaux de chaque catégorie (`Entiers / Apprivoiser`), relevés le
  2026-10-28 ; la session `questions-cm1` prend les suivants ;
- « le chiffre 7 de 4 712 305 » : le chiffre n'apparaît qu'une fois dans le nombre (une
  condition par rang), sinon la question serait ambiguë ;
- intercaler : case libre jugée par une règle « strictement entre » (`rulesSuffice`),
  l'attendu n'est qu'un exemple.

    python3 docs/wip/questions/lot-cm2-1.py scripts/questions/cm2-1
"""

import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]
ECOLE = {'constraints': {'spacesFromFourDigits': True}}


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(v) for k, v in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(nom, title, description, subdomain, level, variations, specs, delay=20):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (nœud du point) est posé par la migration
    return nom, {'title': title, 'description': description, 'grades': ['CM2'],
                 'theme': 'Entiers', 'domain': 'Apprivoiser', 'subdomain': subdomain,
                 'level': level, 'delay': delay, 'status': 'draft', 'options': ECOLE,
                 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None):
    # Chaque `?` de l'énoncé est une case, dans l'ordre de `answers`
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [a if isinstance(a, dict) else {'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def selon(nom, valeurs, debut=0):
    """`{{if:nom==debut|v0|{{if:nom==debut+1|v1|…}}}}` ; la dernière valeur est le « sinon »."""
    texte = valeurs[-1]
    for i in range(len(valeurs) - 2, -1, -1):
        texte = '{{if:' + nom + '==' + str(debut + i) + '|' + valeurs[i] + '|' + texte + '}}'
    return texte


def col(x, i=0):
    return '\\textcolor{{{color:primary.' + str(i) + '}}}{' + x + '}'


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + l + '\n' for l in lignes) + '```'


def esp(n):
    """Réponse tapée avec les espaces de l'école : 12342320 → 12\\,342\\,320."""
    return f'{n:,}'.replace(',', '\\,')


def chiffre(n, r):
    return (n // 10 ** r) % 10


def entre(mini, maxi, attendu):
    # Toute réponse entière strictement comprise entre mini et maxi est juste
    return {'expectedAnswer': attendu, 'rulesSuffice': True,
            'validationRules': [{'type': 'range', 'min': mini, 'max': maxi, 'inclusive': False},
                                {'type': 'predicate', 'predicate': 'isInteger'}]}


MODELES = []

# Rangs d'un entier de neuf chiffres, du rang 0 (unités) au rang 8 (centaines de millions)
RANGS = ['unités', 'dizaines', 'centaines', 'unités de mille', 'dizaines de mille',
         'centaines de mille', 'unités de millions', 'dizaines de millions',
         'centaines de millions']
# Les mêmes, comme unités de numération (« 7 millions, c'est 7 000 milliers »)
UNITES = ['unités', 'dizaines', 'centaines', 'milliers', 'dizaines de mille',
          'centaines de mille', 'millions', 'dizaines de millions', 'centaines de millions']
CLASSES = ['unités', 'mille', 'millions']
CLASSES_ETAPE = ('**Les rangs.** On découpe le nombre en classes de trois chiffres à partir de la'
                 ' droite : classe des unités, des mille, des millions. Dans chaque classe, de'
                 ' droite à gauche : unités, dizaines, centaines.')


# --- 1. CM2-001 : unités de numération -----------------------------------------------------

UNITE_VERS_PETITE = variation(
    '${{k}}$ ' + selon('u', UNITES) + ', c\'est $?$ ' + selon('w', UNITES) + '.',
    [var('k', '2..9'), var('u', '3..8'), var('w', '0..7'), var('p', 'eval:u-w')],
    ['{{eval:k*10^p}}'],
    ['**Unités de numération.** D\'un rang au rang juste à sa droite, on multiplie par $10$ :'
     ' $1$ million, c\'est $10$ centaines de mille, $1$ centaine de mille, c\'est $10$ dizaines'
     ' de mille…',
     'Des ' + selon('u', UNITES) + ' aux ' + selon('w', UNITES) + ', on descend de ${{p}}$'
     ' rang{{if:p>1|s|}} : $1$ ' + selon('u', ['unité', 'dizaine', 'centaine', 'millier',
                                                'dizaine de mille', 'centaine de mille',
                                                'million', 'dizaine de millions',
                                                'centaine de millions'])
     + ', c\'est ${{eval:10^p}}$ ' + selon('w', UNITES) + '.',
     '${{k}}$ ' + selon('u', UNITES) + ', c\'est ${{k}} \\times {{eval:10^p}} = '
     + col('{{solution}}') + '$ ' + selon('w', UNITES) + '.'],
    ['p>=1', 'p<=6'])

PETITE_VERS_UNITE = variation(
    '${{eval:k*10^p}}$ ' + selon('w', UNITES) + ', c\'est $?$ ' + selon('u', UNITES) + '.',
    [var('k', '2..99'), var('u', '3..8'), var('w', '0..7'), var('p', 'eval:u-w')],
    ['{{k}}'],
    ['**Unités de numération.** Il faut ${{eval:10^p}}$ ' + selon('w', UNITES) + ' pour faire'
     ' $1$ ' + selon('u', ['unité', 'dizaine', 'centaine', 'millier', 'dizaine de mille',
                           'centaine de mille', 'million', 'dizaine de millions',
                           'centaine de millions']) + '.',
     'On cherche combien de fois ${{eval:10^p}}$ dans ${{eval:k*10^p}}$ : '
     '${{eval:k*10^p}} = ' + col('{{solution}}') + ' \\times {{eval:10^p}}$.'],
    ['p>=1', 'p<=5', 'k*10^u<=999999999', 'mod(k,10)!=0'])

NON_CANONIQUE = variation(
    '${{k}}$ ' + selon('w', UNITES) + ', c\'est $?$ ' + selon('w', UNITES[1:]) + ' et $?$ '
    + selon('w', UNITES) + '.',
    [var('w', '0..7'), var('k', '21..99')],
    ['{{eval:floor(k/10)}}', '{{eval:mod(k,10)}}'],
    ['$10$ ' + selon('w', UNITES) + ', c\'est $1$ ' + selon('w', [
        'dizaine', 'centaine', 'millier', 'dizaine de mille', 'centaine de mille', 'million',
        'dizaine de millions', 'centaine de millions']) + '.',
     'Dans ${{k}}$ ' + selon('w', UNITES) + ', il y a ${{eval:floor(k/10)}}$ paquets de $10$,'
     ' et il en reste ${{eval:mod(k,10)}}$ : ${{k}}$ ' + selon('w', UNITES) + ', c\'est $'
     + col('{{eval:floor(k/10)}}') + '$ ' + selon('w', UNITES[1:]) + ' et $'
     + col('{{eval:mod(k,10)}}') + '$ ' + selon('w', UNITES) + '.'],
    ['mod(k,10)>=2'])

MODELES.append(modele(
    '01-unites-de-numeration', 'Unités de numération',
    'Relations entre les unités de numération, des unités aux centaines de millions'
    ' (7 millions = 7 000 milliers ; 35 centaines de mille = 3 millions et 5 centaines de mille)',
    'Décomposition', 15, [UNITE_VERS_PETITE, PETITE_VERS_UNITE, NON_CANONIQUE],
    [spec('7 millions = 7 000 milliers', 0, {'k': 7, 'u': 6, 'w': 3, 'p': 3}, esp(7000),
          'correct'),
     spec('Erreur : rapport inversé (7)', 0, {'k': 7, 'u': 6, 'w': 3, 'p': 3}, '7', 'incorrect'),
     spec('Erreur : un zéro de trop (70 000)', 0, {'k': 7, 'u': 6, 'w': 3, 'p': 3}, esp(70000),
          'incorrect'),
     spec('Sans espaces : forme à améliorer', 0, {'k': 7, 'u': 6, 'w': 3, 'p': 3}, '7000',
          'unoptimal_form', ['spaces']),
     spec('4 000 dizaines de mille = 40 millions', 1, {'k': 40, 'u': 6, 'w': 4, 'p': 2}, '40',
          'correct'),
     spec('Erreur : 4', 1, {'k': 40, 'u': 6, 'w': 4, 'p': 2}, '4', 'incorrect'),
     spec('Erreur : 400 000', 1, {'k': 40, 'u': 6, 'w': 4, 'p': 2}, esp(400000), 'incorrect'),
     spec('35 centaines de mille = 3 millions et 5 centaines de mille', 2, {'w': 5, 'k': 35},
          ['3', '5'], 'correct'),
     spec('Erreur : chiffres inversés', 2, {'w': 5, 'k': 35}, ['5', '3'], 'incorrect'),
     spec('Erreur : 35 et 0', 2, {'w': 5, 'k': 35}, ['35', '0'], 'incorrect')]))


# --- 2. CM2-001 : le nombre de milliers, de dizaines de mille… -----------------------------

NOMS = ['dizaines', 'centaines', 'milliers', 'dizaines de mille', 'centaines de mille',
        'millions']

NOMBRE_DE = variation(
    'Quel est le nombre de ' + selon('k', NOMS, 1) + ' dans ${{n}}$ ?\n\n$$?$$',
    [var('c', '7..9'), var('n', 'digits:c'), var('k', '1..6'),
     var('reste', 'eval:mod(n,10^k)')],
    ['{{eval:floor(n/10^k)}}'],
    ['**Chiffre ou nombre ?** Le chiffre des ' + selon('k', NOMS, 1) + ' est un seul chiffre ;'
     ' le nombre de ' + selon('k', NOMS, 1) + ' les compte toutes : on garde tous les chiffres'
     ' jusqu\'à ce rang.',
     '$${{n}} = ' + col('{{solution}}') + ' \\times {{eval:10^k}}{{if:reste>0| + {{reste}}|}}$$',
     'Il y a $' + col('{{solution}}') + '$ ' + selon('k', NOMS, 1) + ' dans ${{n}}$.'],
    ['c-k>=2'])

CARTONS = variation(
    'Une usine a fabriqué ${{n}}$ pailles. Elle les range dans des cartons de ${{t}}$ pailles.'
    '\n\nCombien de cartons peut-elle remplir entièrement ?\n\nElle remplit $?$ cartons.',
    [var('c', '7..9'), var('n', 'digits:c'), var('k', '2..6'), var('t', 'eval:10^k'),
     var('reste', 'eval:mod(n,t)')],
    ['{{eval:floor(n/t)}}'],
    ['Un carton contient ${{t}}$ pailles : le nombre de cartons pleins, c\'est le nombre de '
     + selon('k', NOMS, 1) + ' dans ${{n}}$.',
     '$${{n}} = ' + col('{{solution}}') + ' \\times {{t}} + {{reste}}$$',
     'Elle remplit $' + col('{{solution}}') + '$ cartons ; il reste ${{reste}}$ pailles.'],
    ['reste>0', 'c-k>=2'])

EX_NOMBRE = {'c': 8, 'n': 12342320, 'k': 3, 'reste': 320}
EX_CARTONS = {'c': 8, 'n': 12342320, 'k': 4, 't': 10000, 'reste': 2320}
MODELES.append(modele(
    '02-nombre-de-milliers', 'Le nombre de milliers, de dizaines de mille…',
    'Distinguer le chiffre et le nombre de dizaines… de millions dans un entier de 7 à 9'
    ' chiffres ; problème des cartons (12 342 320 pailles en cartons de 10 000)',
    'Décomposition', 16, [NOMBRE_DE, CARTONS],
    [spec('12 342 320, milliers : 12 342', 0, EX_NOMBRE, esp(12342), 'correct'),
     spec('Erreur : le chiffre des milliers (2)', 0, EX_NOMBRE, '2', 'incorrect'),
     spec('Erreur : la classe des mille (342)', 0, EX_NOMBRE, '342', 'incorrect'),
     spec('Cartons de 10 000 : 1 234', 1, EX_CARTONS, esp(1234), 'correct'),
     spec('Erreur : un carton de trop (1 235)', 1, EX_CARTONS, esp(1235), 'incorrect'),
     spec('Erreur : le chiffre des dizaines de mille (3)', 1, EX_CARTONS, '3', 'incorrect')],
    delay=30))


# --- 3. CM2-004 : la valeur d'un chiffre ---------------------------------------------------

def unique(rang):
    """Le chiffre `ch` (au rang `rang`) n'apparaît qu'une fois dans `n` (au plus 9 chiffres)."""
    return [f'{i}>=c || {i}=={rang} || mod(floor(n/10^{i}),10)!=ch' for i in range(9)]


CHIFFRE_DU_RANG = variation(
    'Dans le nombre ${{n}}$, quel est le chiffre des ' + selon('r', RANGS) + ' ?\n\n$$?$$',
    [var('c', '6..9'), var('n', 'digits:c'), var('cm', 'eval:c-1'), var('r', '1..{{cm}}'),
     var('k', 'eval:floor(r/3)'), var('ch', 'eval:mod(floor(n/10^r),10)')],
    ['{{ch}}'],
    [CLASSES_ETAPE,
     'Le chiffre des ' + selon('r', RANGS) + ' est dans la classe des ' + selon('k', CLASSES)
     + '. Dans ${{n}}$, c\'est $' + col('{{solution}}') + '$.'],
    ['mod(floor(n/10^(r+1)),10)!=ch', 'mod(floor(n/10^(r-1)),10)!=ch'])

VALEUR = variation(
    'Dans le nombre ${{n}}$, que vaut le chiffre ${{ch}}$ ?\n\nIl vaut $?$.',
    [var('c', '6..9'), var('n', 'digits:c'), var('cm', 'eval:c-1'), var('r', '1..{{cm}}'),
     var('ch', 'eval:mod(floor(n/10^r),10)')],
    ['{{eval:ch*10^r}}'],
    [CLASSES_ETAPE,
     'Dans ${{n}}$, le chiffre ${{ch}}$ est le chiffre des ' + selon('r', RANGS) + ' : il vaut'
     ' ${{ch}}$ ' + selon('r', UNITES) + ', c\'est-à-dire $' + col('{{solution}}') + '$.'],
    ['ch>=2'] + unique('r'))

RANG_DU_CHIFFRE = variation(
    'Dans le nombre ${{n}}$, le chiffre ${{ch}}$ est le chiffre des :'
    + choix([selon('a', RANGS), selon('r', RANGS), selon('b', RANGS)]),
    [var('c', '6..9'), var('n', 'digits:c'), var('cm', 'eval:c-2'), var('r', '1..{{cm}}'),
     var('a', 'eval:r-1'), var('b', 'eval:r+1'), var('k', 'eval:floor(r/3)'),
     var('ch', 'eval:mod(floor(n/10^r),10)')],
    ['1'],
    [CLASSES_ETAPE,
     'Dans ${{n}}$, le chiffre ${{ch}}$ est dans la classe des ' + selon('k', CLASSES) + ' :'
     ' c\'est le chiffre des **' + selon('r', RANGS) + '**.'],
    unique('r'))

EX_CHIFFRE = {'c': 9, 'n': 845273018, 'cm': 8, 'r': 4, 'k': 1, 'ch': 7}
EX_VALEUR = {'c': 7, 'n': 4712305, 'cm': 6, 'r': 5, 'ch': 7}
EX_RANG = {'c': 7, 'n': 4712305, 'cm': 5, 'r': 5, 'a': 4, 'b': 6, 'k': 1, 'ch': 7}
MODELES.append(modele(
    '03-valeur-d-un-chiffre', "La valeur d'un chiffre",
    "Chiffre d'un rang, valeur d'un chiffre selon sa position, rang d'un chiffre, dans un entier"
    ' de 6 à 9 chiffres',
    'Décomposition', 17, [CHIFFRE_DU_RANG, VALEUR, RANG_DU_CHIFFRE],
    [spec('845 273 018, dizaines de mille : 7', 0, EX_CHIFFRE, '7', 'correct'),
     spec('Erreur : rang voisin (2)', 0, EX_CHIFFRE, '2', 'incorrect'),
     spec('Erreur : rang compté depuis la gauche (2)', 0, EX_CHIFFRE, '5', 'incorrect'),
     spec('Le 7 de 4 712 305 vaut 700 000', 1, EX_VALEUR, esp(700000), 'correct'),
     spec('Erreur : 7', 1, EX_VALEUR, '7', 'incorrect'),
     spec('Erreur : rang voisin (70 000)', 1, EX_VALEUR, esp(70000), 'incorrect'),
     spec('Le 7 de 4 712 305 : centaines de mille', 2, EX_RANG, '1', 'correct'),
     spec('Erreur : dizaines de mille', 2, EX_RANG, '0', 'incorrect')]))


# --- 4. CM2-002 : le nombre qui suit, le nombre qui précède ---------------------------------

SUIT = ['Le nombre qui suit, c\'est celui qu\'on écrit juste après en comptant : on avance'
        ' de $1$.']
PRECEDE = ['Le nombre qui précède, c\'est celui qu\'on écrit juste avant en comptant : on'
           ' recule de $1$.']

SUIT_SIMPLE = variation(
    'Le nombre qui suit ${{n}}$ est $?$.', [var('n', '100000..999999998')], ['{{eval:n+1}}'],
    SUIT + ['$${{n}} \\rightarrow ' + col('{{solution}}') + '$$'], ['mod(n,10)<=8'])

SUIT_PASSAGE = variation(
    'Le nombre qui suit ${{n}}$ est $?$.',
    [var('c', '7..9'), var('z', '2..5'), var('m', 'eval:c-z'), var('a', 'digits:m'),
     var('n', 'eval:a*10^z+10^z-1')],
    ['{{eval:n+1}}'],
    SUIT + ['${{n}}$ se termine par ${{z}}$ chiffres $9$ : en avançant de $1$, ils deviennent'
            ' tous des $0$ et le chiffre juste à leur gauche augmente de $1$.',
            '$${{n}} \\rightarrow ' + col('{{solution}}') + '$$'],
    ['mod(a,10)!=9'])

PRECEDE_PASSAGE = variation(
    'Le nombre qui précède ${{n}}$ est $?$.',
    [var('c', '7..9'), var('z', '2..5'), var('m', 'eval:c-z'), var('a', 'digits:m'),
     var('n', 'eval:a*10^z')],
    ['{{eval:n-1}}'],
    PRECEDE + ['${{n}}$ se termine par ${{z}}$ zéros : en reculant de $1$, ils deviennent tous'
               ' des $9$ et le chiffre juste à leur gauche diminue de $1$.',
               '$$' + col('{{solution}}') + ' \\rightarrow {{n}}$$'],
    ['mod(a,10)!=0'])

PASSAGE_CLASSE = variation(
    'Le nombre qui {{if:s==0|suit|précède}} ${{n}}$ est $?$.',
    [var('c', '6..8'), var('s', '0..1'), var('n', 'eval:10^c-1+s')],
    ['{{eval:n+1-2*s}}'],
    ['{{if:s==0|' + SUIT[0] + '|' + PRECEDE[0] + '}}',
     '{{if:s==0|Tous les chiffres de ${{n}}$ sont des $9$ : ils deviennent tous des $0$, et un'
     ' $1$ apparaît devant. Le nombre a un chiffre de plus.|${{n}}$, c\'est $1$ suivi de'
     ' ${{c}}$ zéros : en reculant de $1$, les zéros deviennent des $9$ et le $1$ disparaît.'
     ' Le nombre a un chiffre de moins.}}',
     '$${{if:s==0|{{n}} \\rightarrow ' + col('{{solution}}') + '|' + col('{{solution}}')
     + ' \\rightarrow {{n}}}}$$'])

MODELES.append(modele(
    '04-suit-precede', 'Le nombre qui suit, le nombre qui précède',
    "Suite écrite des nombres jusqu'à 999 999 999 : nombre qui suit, nombre qui précède, avec"
    ' les passages (… 999 → … 000, 999 999 → 1 000 000)',
    'Ecriture', 16, [SUIT_SIMPLE, SUIT_PASSAGE, PRECEDE_PASSAGE, PASSAGE_CLASSE],
    [spec('suit 4 527 316 : 4 527 317', 0, {'n': 4527316}, esp(4527317), 'correct'),
     spec('suit 3 459 999 : 3 460 000', 1,
          {'c': 7, 'z': 4, 'm': 3, 'a': 345, 'n': 3459999}, esp(3460000), 'correct'),
     spec('Erreur : 3 459 1000 lu comme 34 591 000', 1,
          {'c': 7, 'z': 4, 'm': 3, 'a': 345, 'n': 3459999}, esp(34591000), 'incorrect'),
     spec('Erreur : chiffre de gauche oublié (3 450 000)', 1,
          {'c': 7, 'z': 4, 'm': 3, 'a': 345, 'n': 3459999}, esp(3450000), 'incorrect'),
     spec('précède 27 400 000 : 27 399 999', 2,
          {'c': 8, 'z': 5, 'm': 3, 'a': 274, 'n': 27400000}, esp(27399999), 'correct'),
     spec('Erreur : 27 499 999', 2,
          {'c': 8, 'z': 5, 'm': 3, 'a': 274, 'n': 27400000}, esp(27499999), 'incorrect'),
     spec('Erreur : 27 300 000', 2,
          {'c': 8, 'z': 5, 'm': 3, 'a': 274, 'n': 27400000}, esp(27300000), 'incorrect'),
     spec('suit 999 999 : 1 000 000', 3, {'c': 6, 's': 0, 'n': 999999}, esp(1000000),
          'correct'),
     spec('Erreur : 999 1000 (9 991 000)', 3, {'c': 6, 's': 0, 'n': 999999}, esp(9991000),
          'incorrect'),
     spec('précède 10 000 000 : 9 999 999', 3, {'c': 7, 's': 1, 'n': 10000000}, esp(9999999),
          'correct'),
     spec('Erreur : 1 999 999', 3, {'c': 7, 's': 1, 'n': 10000000}, esp(1999999),
          'incorrect')]))


# --- 5. CM2-005 : comparer deux grands nombres ---------------------------------------------

SIGNES = choix(['$<$', '$=$', '$>$'], melanger=False)
COMPARE = ('Complète avec le signe qui convient.\n\n$${{if:s==0|GAUCHE|DROITE}} \\ldots'
           ' {{if:s==0|DROITE|GAUCHE}}$$' + SIGNES)

ECHANGES = variation(
    COMPARE.replace('GAUCHE', '{{n}}').replace('DROITE', '{{m}}'),
    [var('s', '0..1'), var('c', '7..9'), var('n', 'digits:c'), var('cm', 'eval:c-2'),
     var('r', '1..{{cm}}'), var('d1', 'eval:mod(floor(n/10^r),10)'),
     var('d2', 'eval:mod(floor(n/10^(r-1)),10)'),
     var('m', 'eval:n+(d2-d1)*10^r+(d1-d2)*10^(r-1)')],
    ['{{if:s==0|{{if:d1>d2|2|0}}|{{if:d1>d2|0|2}}}}'],
    ['**Même nombre de chiffres.** Les deux nombres ont ${{c}}$ chiffres : on compare leurs'
     ' chiffres un à un, de gauche à droite, jusqu\'au premier qui diffère.',
     'Le premier chiffre qui diffère est celui des ' + selon('r', RANGS) + ' : ${{d1}}$ dans'
     ' ${{n}}$, ${{d2}}$ dans ${{m}}$.',
     '$${{if:s==0|{{n}} ' + col('{{if:d1>d2|>|<}}') + ' {{m}}|{{m}} '
     + col('{{if:d1>d2|<|>}}') + ' {{n}}}}$$'],
    ['d1!=d2'])

LONGUEURS = variation(
    COMPARE.replace('GAUCHE', '{{a}}').replace('DROITE', '{{b}}'),
    [var('s', '0..1'), var('c', '6..8'), var('a', 'digits:c'), var('c1', 'eval:c+1'),
     var('b', 'digits:c1')],
    ['{{if:s==0|0|2}}'],
    ['**Nombre de chiffres.** On compte d\'abord les chiffres : ${{b}}$ en a ${{c1}}$,'
     ' ${{a}}$ n\'en a que ${{c}}$. Le nombre qui a le plus de chiffres est le plus grand, même'
     ' s\'il commence par un petit chiffre.',
     '$${{if:s==0|{{a}} ' + col('<') + ' {{b}}|{{b}} ' + col('>') + ' {{a}}}}$$'],
    ['floor(a/10^(c-1))>=7', 'floor(b/10^c)<=2'])

EX_ECHANGES = {'s': 0, 'c': 7, 'n': 3405270, 'cm': 5, 'r': 4, 'd1': 0, 'd2': 5, 'm': 3450270}
EX_LONGUEURS = {'s': 0, 'c': 6, 'a': 987654, 'c1': 7, 'b': 1023456}
MODELES.append(modele(
    '05-comparer-deux-grands-nombres', 'Comparer deux grands nombres',
    'Comparer deux entiers de 6 à 9 chiffres avec <, = ou > : chiffres échangés, nombres de'
    ' chiffres différents',
    'Comparer', 8, [ECHANGES, LONGUEURS],
    [spec('3 405 270 < 3 450 270', 0, EX_ECHANGES, '0', 'correct'),
     spec('Erreur : >', 0, EX_ECHANGES, '2', 'incorrect'),
     spec('Échangés : 3 450 270 > 3 405 270', 0, dict(EX_ECHANGES, s=1), '2', 'correct'),
     spec('987 654 < 1 023 456', 1, EX_LONGUEURS, '0', 'correct'),
     spec('Erreur : premier chiffre lu (>)', 1, EX_LONGUEURS, '2', 'incorrect'),
     spec('Échangés : 1 023 456 > 987 654', 1, dict(EX_LONGUEURS, s=1), '2', 'correct')]))


# --- 6. CM2-006 : ranger cinq grands nombres -----------------------------------------------
# Comme au CE1 (229, 234, 239, 243, 300), à l'échelle des millions : quatre nombres de M
# millions, dont deux aux chiffres échangés (centaines de mille / dizaines de mille), et un
# nombre de sept chiffres qui commence par 9 (le plus petit malgré son premier chiffre).

RANG_VARS = [var('M', '10..99'), var('t', '1..7'), var('u', '{{eval:t+1}}..8'),
             var('w', '0..999999'), var('R1', '0..9999'), var('R2', '0..9999'),
             var('R3', '0..9999'), var('R4', '0..9999'),
             var('s1', 'eval:9*10^6+w'),
             var('s2', 'eval:M*10^6+(t-1)*10^5+9*10^4+R1'),
             var('s3', 'eval:M*10^6+t*10^5+u*10^4+R2'),
             var('s4', 'eval:M*10^6+t*10^5+9*10^4+R3'),
             var('s5', 'eval:M*10^6+u*10^5+t*10^4+R4'), var('o', '1..4')]
ORDRES = [['s3', 's1', 's5', 's2', 's4'], ['s2', 's5', 's4', 's1', 's3'],
          ['s4', 's2', 's1', 's5', 's3'], ['s5', 's3', 's2', 's4', 's1']]
AFFICHE = [var(f'x{i + 1}', 'eval:{{if:o==1|' + ORDRES[0][i] + '|{{if:o==2|' + ORDRES[1][i]
               + '|{{if:o==3|' + ORDRES[2][i] + '|' + ORDRES[3][i] + '}}}}}}')
           for i in range(5)]
# Une formule par nombre : la liste passe à la ligne sur un téléphone (une seule formule déborde)
LISTE = '${{x1}}$ ; ${{x2}}$ ; ${{x3}}$ ; ${{x4}}$ ; ${{x5}}$'
METHODE_RANGER = ('On compte d\'abord les chiffres : ${{s1}}$ n\'en a que $7$, c\'est le plus'
                  ' petit. Les quatre autres ont ${{M}}$ millions : on compare leurs centaines'
                  ' de mille, puis leurs dizaines de mille.')

RANGER = [
    variation('Range ces nombres du plus petit au plus grand.\n\n' + LISTE + '\n\n$$?<?<?<?<?$$',
              RANG_VARS + AFFICHE, ['{{s1}}', '{{s2}}', '{{s3}}', '{{s4}}', '{{s5}}'],
              [METHODE_RANGER, '$${{s1}} < {{s2}} < {{s3}} < {{s4}} < {{s5}}$$']),
    variation('Range ces nombres du plus grand au plus petit.\n\n' + LISTE + '\n\n$$?>?>?>?>?$$',
              RANG_VARS + AFFICHE, ['{{s5}}', '{{s4}}', '{{s3}}', '{{s2}}', '{{s1}}'],
              [METHODE_RANGER, '$${{s5}} > {{s4}} > {{s3}} > {{s2}} > {{s1}}$$']),
]

EX_R = {'M': 34, 't': 2, 'u': 5, 'w': 876543, 'R1': 1234, 'R2': 5678, 'R3': 12, 'R4': 300,
        's1': 9876543, 's2': 34191234, 's3': 34255678, 's4': 34290012, 's5': 34520300, 'o': 1}
CROISSANT = [esp(EX_R[f's{i}']) for i in range(1, 6)]
MODELES.append(modele(
    '06-ranger-cinq-grands-nombres', 'Ranger cinq grands nombres',
    'Ranger cinq entiers de 7 et 8 chiffres dans l\'ordre croissant ou décroissant',
    'Comparer', 9, RANGER,
    [spec('croissant', 0, EX_R, CROISSANT, 'correct'),
     spec('Erreur : 9 876 543 en dernier (premier chiffre lu)', 0, EX_R,
          CROISSANT[1:] + CROISSANT[:1], 'incorrect'),
     spec('Erreur : 34 255 678 et 34 191 234 inversés', 0, EX_R,
          [CROISSANT[0], CROISSANT[2], CROISSANT[1]] + CROISSANT[3:], 'incorrect'),
     spec('Erreur : ordre décroissant', 0, EX_R, CROISSANT[::-1], 'incorrect'),
     spec('décroissant', 1, EX_R, CROISSANT[::-1], 'correct')],
    delay=60))


# --- 7. CM2-127 : encadrer un grand nombre -------------------------------------------------

PRES = ['au millier près', 'à la dizaine de mille près', 'à la centaine de mille près',
        'au million près']
UN = ['$1$ millier', '$1$ dizaine de mille', '$1$ centaine de mille', '$1$ million']

ENCADRER = variation(
    'Encadre ${{n}}$ ' + selon('k', PRES, 3) + '.\n\n$$?<{{n}}<?$$',
    [var('c', '7..9'), var('n', 'digits:c'), var('k', '3..6'), var('lo', 'eval:n-mod(n,10^k)'),
     var('hi', 'eval:lo+10^k')],
    ['{{lo}}', '{{hi}}'],
    ['**Encadrer ' + selon('k', PRES, 3) + '.** On garde les chiffres jusqu\'au rang des '
     + selon('k', ['unités de mille', 'dizaines de mille', 'centaines de mille',
                   'unités de millions'], 3)
     + ' et on remplace les suivants par des zéros : ${{lo}}$. On ajoute ' + selon('k', UN, 3)
     + ' : ${{hi}}$.',
     '$$' + col('{{lo}}') + ' < {{n}} < ' + col('{{hi}}') + '$$'],
    ['mod(n,10^k)!=0'])

EX_ENC = {'c': 7, 'n': 3405270, 'k': 4, 'lo': 3400000, 'hi': 3410000}
MODELES.append(modele(
    '07-encadrer-un-grand-nombre', 'Encadrer un grand nombre',
    'Encadrer un entier de 7 à 9 chiffres au millier, à la dizaine de mille, à la centaine de'
    ' mille ou au million près',
    'Encadrer', 9, [ENCADRER],
    [spec('3 400 000 < 3 405 270 < 3 410 000', 0, EX_ENC, [esp(3400000), esp(3410000)],
          'correct'),
     spec('Erreur : nombres juste avant et juste après', 0, EX_ENC,
          [esp(3405269), esp(3405271)], 'incorrect'),
     spec('Erreur : au millier près', 0, EX_ENC, [esp(3405000), esp(3406000)], 'incorrect'),
     spec('Erreur : au-dessus mal arrondi (3 500 000)', 0, EX_ENC, [esp(3400000), esp(3500000)],
          'incorrect')],
    delay=30))


# --- 8. CM2-128 : intercaler un grand nombre ----------------------------------------------

def intercaler(variables, bas, haut, exemple, steps, conditions=None):
    return variation(
        'Écris un nombre entier compris entre ${{' + bas + '}}$ et ${{' + haut + '}}$.\n\n$${{'
        + bas + '}} < ? < {{' + haut + '}}$$',
        variables, [entre('{{' + bas + '}}', '{{' + haut + '}}', exemple)], steps, conditions)


INTERCALER_LARGE = intercaler(
    [var('c', '7..9'), var('a', 'digits:c'), var('g', '1000..99999'), var('b', 'eval:a+g')],
    'a', 'b', '{{eval:a+1}}',
    ['On compare les deux nombres chiffre à chiffre : tout nombre plus grand que ${{a}}$ et'
     ' plus petit que ${{b}}$ convient.',
     'Par exemple $' + col('{{eval:a+1}}') + '$, ou ${{eval:b-1}}$.'],
    ['b<=999999999'])

INTERCALER_SERRE = intercaler(
    [var('c', '7..9'), var('a', 'digits:c'), var('b', 'eval:a+2')],
    'a', 'b', '{{eval:a+1}}',
    ['Entre ${{a}}$ et ${{b}}$, il n\'y a qu\'un seul nombre entier : celui qui suit ${{a}}$.',
     '$${{a}} < ' + col('{{solution}}') + ' < {{b}}$$'],
    ['b<=999999999'])

INTERCALER_PASSAGE = intercaler(
    [var('c', '7..9'), var('k', '3..5'), var('m', 'eval:c-k'), var('x', 'digits:m'),
     var('r0', 'eval:x*10^k'), var('a', 'eval:r0-1'), var('b', 'eval:r0+1')],
    'a', 'b', '{{r0}}',
    ['${{a}}$ se termine par des $9$ : le nombre qui le suit est ${{r0}}$.',
     '$${{a}} < ' + col('{{solution}}') + ' < {{b}}$$'],
    ['mod(x,10)!=0'])

EX_LARGE = {'c': 7, 'a': 3405270, 'g': 44937, 'b': 3450207}
EX_PASSAGE = {'c': 7, 'k': 4, 'm': 3, 'x': 345, 'r0': 3450000, 'a': 3449999, 'b': 3450001}
MODELES.append(modele(
    '08-intercaler-un-grand-nombre', 'Intercaler un grand nombre',
    'Écrire un entier compris entre deux entiers de 7 à 9 chiffres (3 405 270 < … < 3 450 207) ;'
    ' toute réponse comprise est juste',
    'Encadrer', 10, [INTERCALER_LARGE, INTERCALER_SERRE, INTERCALER_PASSAGE],
    [spec('3 405 271', 0, EX_LARGE, esp(3405271), 'correct'),
     spec('3 420 000', 0, EX_LARGE, esp(3420000), 'correct'),
     spec('Erreur : la borne 3 450 207', 0, EX_LARGE, esp(3450207), 'incorrect'),
     spec('Erreur : 3 460 000', 0, EX_LARGE, esp(3460000), 'incorrect'),
     spec('Erreur : 3 400 000', 0, EX_LARGE, esp(3400000), 'incorrect'),
     spec('écart de 2 : 12 345 679', 1, {'c': 8, 'a': 12345678, 'b': 12345680},
          esp(12345679), 'correct'),
     spec('Erreur : 12 345 680', 1, {'c': 8, 'a': 12345678, 'b': 12345680}, esp(12345680),
          'incorrect'),
     spec('passage : 3 450 000', 2, EX_PASSAGE, esp(3450000), 'correct'),
     spec('Erreur : 3 449 1000 lu comme 34 491 000', 2, EX_PASSAGE, esp(34491000),
          'incorrect')]))


os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
