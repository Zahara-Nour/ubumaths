"""Écrit les 10 modèles du lot 2 du CM1 (numération des entiers) dans scripts/questions/cm1-2/.

Phase 0 validée par David le 2026-10-29 (§ 8 du journal `docs/wip/questions-cm1-progress.md`).
Bornes : `cycle3.json`, CM1 (entiers jusqu'à 999 999, six rangs, ranger jusqu'à cinq nombres,
diviseur candidat ≤ 10 ; exemples du programme : 342 320 filtres en cartons de 1 000, le nombre
qui suit 99 999, 45 307 … 45 370, 141 n'est pas multiple de 7). Un point par modèle ; le nœud
et le tag sont posés par la migration de rangement, après le `--publier`.

Décisions et pièges :
- jumeau du lot 1 du CM2 (`lot-cm2-1.py`), relu et corrigé par David : « représente combien
  d'unités ? », ```ranger pour ranger ;
- règle de l'école « espaces dès 4 chiffres » ;
- choix en case « choix » (bloc ```choix, ADR 0033), jamais l'ancien QCM ;
- multiples et diviseurs : Oui / Non en V1, un choix parmi quatre en V2 (une réponse au hasard
  n'a plus qu'une chance sur quatre) ; candidats 3, 4, 6, 7, 8, 9 (2, 5 et 10 : critères de
  CM1-011, déjà couverts) ;
- niveaux : suite des niveaux de chaque catégorie, relevés en prod le 2026-10-29 (le CE2 a
  pris Décomposition 18-20, Ecriture 17-18, Comparer 10-11, Encadrer 11-12).

    python3 docs/wip/questions/lot-cm1-2.py scripts/questions/cm1-2
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


def modele(nom, title, description, domain, subdomain, level, variations, specs, delay=20):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (nœud du point) est posé par la migration
    return nom, {'title': title, 'description': description, 'grades': ['CM1'],
                 'theme': 'Entiers', 'domain': domain, 'subdomain': subdomain,
                 'level': level, 'delay': delay, 'status': 'draft', 'options': ECOLE,
                 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None):
    # Chaque `?` de l'énoncé est une case, dans l'ordre de `answers` ; `answers=None` : les
    # cases viennent d'un bloc (```ranger), sans `blanks[]`
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    if answers is not None:
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
    """Réponse tapée avec les espaces de l'école : 342320 → 342\\,320."""
    return f'{n:,}'.replace(',', '\\,')


def entre(mini, maxi, attendu):
    # Toute réponse entière strictement comprise entre mini et maxi est juste
    return {'expectedAnswer': attendu, 'rulesSuffice': True,
            'validationRules': [{'type': 'range', 'min': mini, 'max': maxi, 'inclusive': False},
                                {'type': 'predicate', 'predicate': 'isInteger'}]}


MODELES = []

# Rangs d'un entier de six chiffres, du rang 0 (unités) au rang 5 (centaines de mille)
RANGS = ['unités', 'dizaines', 'centaines', 'unités de mille', 'dizaines de mille',
         'centaines de mille']
# Les mêmes, comme unités de numération (« 3 centaines de mille, c'est 300 milliers »)
UNITES = ['unités', 'dizaines', 'centaines', 'milliers', 'dizaines de mille',
          'centaines de mille']
UNITE = ['unité', 'dizaine', 'centaine', 'millier', 'dizaine de mille', 'centaine de mille']
CLASSES = ['unités', 'mille']
CLASSES_ETAPE = ('**Les rangs.** On découpe le nombre en classes de trois chiffres à partir de la'
                 ' droite : classe des unités, classe des mille. Dans chaque classe, de droite à'
                 ' gauche : unités, dizaines, centaines.')


# --- 1. CM1-003 : unités de numération -----------------------------------------------------

UNITE_VERS_PETITE = variation(
    '${{k}}$ ' + selon('u', UNITES) + ', c\'est $?$ ' + selon('w', UNITES) + '.',
    [var('k', '2..9'), var('u', '2..5'), var('w', '0..4'), var('p', 'eval:u-w')],
    ['{{eval:k*10^p}}'],
    ['**Unités de numération.** D\'un rang au rang juste à sa droite, on multiplie par $10$ :'
     ' $1$ centaine de mille, c\'est $10$ dizaines de mille, $1$ dizaine de mille, c\'est $10$'
     ' milliers…',
     'Des ' + selon('u', UNITES) + ' aux ' + selon('w', UNITES) + ', on descend de ${{p}}$'
     ' rang{{if:p>1|s|}} : $1$ ' + selon('u', UNITE) + ', c\'est ${{eval:10^p}}$ '
     + selon('w', UNITES) + '.',
     '${{k}}$ ' + selon('u', UNITES) + ', c\'est ${{k}} \\times {{eval:10^p}} = '
     + col('{{solution}}') + '$ ' + selon('w', UNITES) + '.'],
    ['p>=1'])

PETITE_VERS_UNITE = variation(
    '${{eval:k*10^p}}$ ' + selon('w', UNITES) + ', c\'est $?$ ' + selon('u', UNITES) + '.',
    [var('k', '2..99'), var('u', '2..5'), var('w', '0..4'), var('p', 'eval:u-w')],
    ['{{k}}'],
    ['**Unités de numération.** Il faut ${{eval:10^p}}$ ' + selon('w', UNITES) + ' pour faire'
     ' $1$ ' + selon('u', UNITE) + '.',
     'On cherche combien de fois ${{eval:10^p}}$ dans ${{eval:k*10^p}}$ : '
     '${{eval:k*10^p}} = ' + col('{{solution}}') + ' \\times {{eval:10^p}}$.'],
    ['p>=1', 'k*10^u<=999999', 'mod(k,10)!=0'])

NON_CANONIQUE = variation(
    '${{k}}$ ' + selon('w', UNITES) + ', c\'est $?$ ' + selon('w', UNITES[1:]) + ' et $?$ '
    + selon('w', UNITES) + '.',
    [var('w', '0..4'), var('k', '21..99')],
    ['{{eval:floor(k/10)}}', '{{eval:mod(k,10)}}'],
    ['$10$ ' + selon('w', UNITES) + ', c\'est $1$ ' + selon('w', UNITE[1:]) + '.',
     'Dans ${{k}}$ ' + selon('w', UNITES) + ', il y a ${{eval:floor(k/10)}}$ paquets de $10$,'
     ' et il en reste ${{eval:mod(k,10)}}$ : ${{k}}$ ' + selon('w', UNITES) + ', c\'est $'
     + col('{{eval:floor(k/10)}}') + '$ ' + selon('w', UNITES[1:]) + ' et $'
     + col('{{eval:mod(k,10)}}') + '$ ' + selon('w', UNITES) + '.'],
    ['mod(k,10)>=2'])

MODELES.append(modele(
    '01-unites-de-numeration', 'Unités de numération (jusqu\'aux centaines de mille)',
    'Relations entre les unités de numération, des unités aux centaines de mille'
    ' (3 centaines de mille = 300 milliers ; 35 centaines = 3 milliers et 5 centaines)',
    'Apprivoiser', 'Décomposition', 21, [UNITE_VERS_PETITE, PETITE_VERS_UNITE, NON_CANONIQUE],
    [spec('3 centaines de mille = 300 milliers', 0, {'k': 3, 'u': 5, 'w': 3, 'p': 2}, '300',
          'correct'),
     spec('Erreur : rapport inversé (3)', 0, {'k': 3, 'u': 5, 'w': 3, 'p': 2}, '3', 'incorrect'),
     spec('Erreur : un zéro de trop (3 000)', 0, {'k': 3, 'u': 5, 'w': 3, 'p': 2}, esp(3000),
          'incorrect'),
     spec('7 dizaines de mille = 7 000 dizaines', 0, {'k': 7, 'u': 4, 'w': 1, 'p': 3},
          esp(7000), 'correct'),
     spec('Sans espaces : forme à améliorer', 0, {'k': 7, 'u': 4, 'w': 1, 'p': 3}, '7000',
          'unoptimal_form', ['spaces']),
     spec('400 dizaines = 4 milliers', 1, {'k': 4, 'u': 3, 'w': 1, 'p': 2}, '4', 'correct'),
     spec('Erreur : 40', 1, {'k': 4, 'u': 3, 'w': 1, 'p': 2}, '40', 'incorrect'),
     spec('Erreur : 4 000', 1, {'k': 4, 'u': 3, 'w': 1, 'p': 2}, esp(4000), 'incorrect'),
     spec('35 centaines = 3 milliers et 5 centaines', 2, {'w': 2, 'k': 35}, ['3', '5'],
          'correct'),
     spec('Erreur : chiffres inversés', 2, {'w': 2, 'k': 35}, ['5', '3'], 'incorrect'),
     spec('Erreur : 35 et 0', 2, {'w': 2, 'k': 35}, ['35', '0'], 'incorrect')]))


# --- 2. CM1-003 : le nombre de centaines, de milliers… -------------------------------------

NOMS = ['dizaines', 'centaines', 'milliers', 'dizaines de mille']

NOMBRE_DE = variation(
    'Quel est le nombre de ' + selon('k', NOMS, 1) + ' dans ${{n}}$ ?\n\n$$?$$',
    [var('c', '5..6'), var('n', 'digits:c'), var('k', '1..4'),
     var('reste', 'eval:mod(n,10^k)')],
    ['{{eval:floor(n/10^k)}}'],
    ['**Chiffre ou nombre ?** Le chiffre des ' + selon('k', NOMS, 1) + ' est un seul chiffre ;'
     ' le nombre de ' + selon('k', NOMS, 1) + ' les compte toutes : on garde tous les chiffres'
     ' jusqu\'à ce rang.',
     '$${{n}} = ' + col('{{solution}}') + ' \\times {{eval:10^k}}{{if:reste>0| + {{reste}}|}}$$',
     'Il y a $' + col('{{solution}}') + '$ ' + selon('k', NOMS, 1) + ' dans ${{n}}$.'],
    ['c-k>=2'])

CARTONS = variation(
    'Une usine a fabriqué ${{n}}$ filtres. Elle les range dans des cartons de ${{t}}$ filtres.'
    '\n\nCombien de cartons peut-elle remplir entièrement ?\n\nElle remplit $?$ cartons.',
    [var('c', '5..6'), var('n', 'digits:c'), var('k', '1..4'), var('t', 'eval:10^k'),
     var('reste', 'eval:mod(n,t)')],
    ['{{eval:floor(n/t)}}'],
    ['Un carton contient ${{t}}$ filtres : le nombre de cartons pleins, c\'est le nombre de '
     + selon('k', NOMS, 1) + ' dans ${{n}}$.',
     '$${{n}} = ' + col('{{solution}}') + ' \\times {{t}} + {{reste}}$$',
     'Elle remplit $' + col('{{solution}}') + '$ cartons ; il reste ${{reste}}$ filtres.'],
    ['reste>0', 'c-k>=2'])

EX_NOMBRE = {'c': 6, 'n': 342320, 'k': 2, 'reste': 20}
EX_CARTONS = {'c': 6, 'n': 342320, 'k': 3, 't': 1000, 'reste': 320}
MODELES.append(modele(
    '02-nombre-de-centaines', 'Le nombre de centaines, de milliers…',
    'Distinguer le chiffre et le nombre de dizaines… de dizaines de mille dans un entier de 5 à'
    ' 6 chiffres ; problème des cartons (342 320 filtres en cartons de 1 000)',
    'Apprivoiser', 'Décomposition', 22, [NOMBRE_DE, CARTONS],
    [spec('342 320, centaines : 3 423', 0, EX_NOMBRE, esp(3423), 'correct'),
     spec('Erreur : le chiffre des centaines (3)', 0, EX_NOMBRE, '3', 'incorrect'),
     spec('Erreur : la classe des mille (342)', 0, EX_NOMBRE, '342', 'incorrect'),
     spec('Cartons de 1 000 : 342', 1, EX_CARTONS, '342', 'correct'),
     spec('Erreur : un carton de trop (343)', 1, EX_CARTONS, '343', 'incorrect'),
     spec('Erreur : le chiffre des milliers (2)', 1, EX_CARTONS, '2', 'incorrect')],
    delay=30))


# --- 3. CM1-005 : la valeur d'un chiffre ---------------------------------------------------

def unique(rang):
    """Le chiffre `ch` (au rang `rang`) n'apparaît qu'une fois dans `n` (au plus 6 chiffres)."""
    return [f'{i}>=c || {i}=={rang} || mod(floor(n/10^{i}),10)!=ch' for i in range(6)]


CHIFFRE_DU_RANG = variation(
    'Dans le nombre ${{n}}$, quel est le chiffre des ' + selon('r', RANGS) + ' ?\n\n$$?$$',
    [var('c', '5..6'), var('n', 'digits:c'), var('cm', 'eval:c-1'), var('r', '1..{{cm}}'),
     var('k', 'eval:floor(r/3)'), var('ch', 'eval:mod(floor(n/10^r),10)')],
    ['{{ch}}'],
    [CLASSES_ETAPE,
     'Le chiffre des ' + selon('r', RANGS) + ' est dans la classe des ' + selon('k', CLASSES)
     + '. Dans ${{n}}$, c\'est $' + col('{{solution}}') + '$.'],
    ['mod(floor(n/10^(r+1)),10)!=ch', 'mod(floor(n/10^(r-1)),10)!=ch'])

VALEUR = variation(
    # « Que vaut le chiffre 7 ? » appelle « 7 » (relecture de David au CM2, 2026-10-28)
    'Dans le nombre ${{n}}$, le chiffre ${{ch}}$ représente combien d\'unités ?\n\n'
    'Il représente $?$ unités.',
    [var('c', '5..6'), var('n', 'digits:c'), var('cm', 'eval:c-1'), var('r', '1..{{cm}}'),
     var('ch', 'eval:mod(floor(n/10^r),10)')],
    ['{{eval:ch*10^r}}'],
    [CLASSES_ETAPE,
     'Dans ${{n}}$, le chiffre ${{ch}}$ est le chiffre des ' + selon('r', RANGS) + ' : il'
     ' représente ${{ch}}$ ' + selon('r', UNITES) + ', c\'est-à-dire $' + col('{{solution}}')
     + '$ unités.'],
    ['ch>=2'] + unique('r'))

RANG_DU_CHIFFRE = variation(
    'Dans le nombre ${{n}}$, le chiffre ${{ch}}$ est le chiffre des :'
    + choix([selon('a', RANGS), selon('r', RANGS), selon('b', RANGS)]),
    [var('c', '5..6'), var('n', 'digits:c'), var('cm', 'eval:c-2'), var('r', '1..{{cm}}'),
     var('a', 'eval:r-1'), var('b', 'eval:r+1'), var('k', 'eval:floor(r/3)'),
     var('ch', 'eval:mod(floor(n/10^r),10)')],
    ['1'],
    [CLASSES_ETAPE,
     'Dans ${{n}}$, le chiffre ${{ch}}$ est dans la classe des ' + selon('k', CLASSES) + ' :'
     ' c\'est le chiffre des **' + selon('r', RANGS) + '**.'],
    unique('r'))

EX_CHIFFRE = {'c': 6, 'n': 845273, 'cm': 5, 'r': 4, 'k': 1, 'ch': 4}
EX_VALEUR = {'c': 6, 'n': 471305, 'cm': 5, 'r': 4, 'ch': 7}
EX_RANG = {'c': 6, 'n': 471305, 'cm': 4, 'r': 4, 'a': 3, 'b': 5, 'k': 1, 'ch': 7}
MODELES.append(modele(
    '03-valeur-d-un-chiffre', "La valeur d'un chiffre (jusqu'à $999\\,999$)",
    "Chiffre d'un rang, valeur d'un chiffre selon sa position, rang d'un chiffre, dans un entier"
    ' de 5 à 6 chiffres',
    'Apprivoiser', 'Décomposition', 23, [CHIFFRE_DU_RANG, VALEUR, RANG_DU_CHIFFRE],
    [spec('845 273, dizaines de mille : 4', 0, EX_CHIFFRE, '4', 'correct'),
     spec('Erreur : rang voisin (5)', 0, EX_CHIFFRE, '5', 'incorrect'),
     spec('Erreur : rang compté depuis la gauche (7)', 0, EX_CHIFFRE, '7', 'incorrect'),
     spec('Le 7 de 471 305 représente 70 000 unités', 1, EX_VALEUR, esp(70000), 'correct'),
     spec('Erreur : 7', 1, EX_VALEUR, '7', 'incorrect'),
     spec('Erreur : rang voisin (7 000)', 1, EX_VALEUR, esp(7000), 'incorrect'),
     spec('Le 7 de 471 305 : dizaines de mille', 2, EX_RANG, '1', 'correct'),
     spec('Erreur : unités de mille', 2, EX_RANG, '0', 'incorrect')]))


# --- 4. CM1-004 : le nombre qui suit, le nombre qui précède ---------------------------------

SUIT = ['Le nombre qui suit, c\'est celui qu\'on écrit juste après en comptant : on avance'
        ' de $1$.']
PRECEDE = ['Le nombre qui précède, c\'est celui qu\'on écrit juste avant en comptant : on'
           ' recule de $1$.']

SUIT_SIMPLE = variation(
    'Le nombre qui suit ${{n}}$ est $?$.', [var('n', '10000..999998')], ['{{eval:n+1}}'],
    SUIT + ['$${{n}} \\rightarrow ' + col('{{solution}}') + '$$'], ['mod(n,10)<=8'])

SUIT_PASSAGE = variation(
    'Le nombre qui suit ${{n}}$ est $?$.',
    [var('c', '5..6'), var('z', '2..4'), var('m', 'eval:c-z'), var('a', 'digits:m'),
     var('n', 'eval:a*10^z+10^z-1')],
    ['{{eval:n+1}}'],
    SUIT + ['${{n}}$ se termine par ${{z}}$ chiffres $9$ : en avançant de $1$, ils deviennent'
            ' tous des $0$ et le chiffre juste à leur gauche augmente de $1$.',
            '$${{n}} \\rightarrow ' + col('{{solution}}') + '$$'],
    ['mod(a,10)!=9'])

PRECEDE_PASSAGE = variation(
    'Le nombre qui précède ${{n}}$ est $?$.',
    [var('c', '5..6'), var('z', '2..4'), var('m', 'eval:c-z'), var('a', 'digits:m'),
     var('n', 'eval:a*10^z')],
    ['{{eval:n-1}}'],
    PRECEDE + ['${{n}}$ se termine par ${{z}}$ zéros : en reculant de $1$, ils deviennent tous'
               ' des $9$ et le chiffre juste à leur gauche diminue de $1$.',
               '$$' + col('{{solution}}') + ' \\rightarrow {{n}}$$'],
    ['mod(a,10)!=0'])

PASSAGE_CLASSE = variation(
    'Le nombre qui {{if:s==0|suit|précède}} ${{n}}$ est $?$.',
    [var('c', '4..5'), var('s', '0..1'), var('n', 'eval:10^c-1+s')],
    ['{{eval:n+1-2*s}}'],
    ['{{if:s==0|' + SUIT[0] + '|' + PRECEDE[0] + '}}',
     '{{if:s==0|Tous les chiffres de ${{n}}$ sont des $9$ : ils deviennent tous des $0$, et un'
     ' $1$ apparaît devant. Le nombre a un chiffre de plus.|${{n}}$, c\'est $1$ suivi de'
     ' ${{c}}$ zéros : en reculant de $1$, les zéros deviennent des $9$ et le $1$ disparaît.'
     ' Le nombre a un chiffre de moins.}}',
     '$${{if:s==0|{{n}} \\rightarrow ' + col('{{solution}}') + '|' + col('{{solution}}')
     + ' \\rightarrow {{n}}}}$$'])

MODELES.append(modele(
    '04-suit-precede', "Le nombre qui suit, le nombre qui précède (jusqu'à $999\\,999$)",
    "Suite écrite des nombres jusqu'à 999 999 : nombre qui suit, nombre qui précède, avec les"
    ' passages (… 999 → … 000, 99 999 → 100 000)',
    'Apprivoiser', 'Ecriture', 19, [SUIT_SIMPLE, SUIT_PASSAGE, PRECEDE_PASSAGE, PASSAGE_CLASSE],
    [spec('suit 452 731 : 452 732', 0, {'n': 452731}, esp(452732), 'correct'),
     spec('suit 34 599 : 34 600', 1, {'c': 5, 'z': 2, 'm': 3, 'a': 345, 'n': 34599},
          esp(34600), 'correct'),
     spec('Erreur : 345 100 (99 + 1 accolé)', 1,
          {'c': 5, 'z': 2, 'm': 3, 'a': 345, 'n': 34599}, esp(345100), 'incorrect'),
     spec('Erreur : chiffre de gauche oublié (34 500)', 1,
          {'c': 5, 'z': 2, 'm': 3, 'a': 345, 'n': 34599}, esp(34500), 'incorrect'),
     spec('précède 274 000 : 273 999', 2, {'c': 6, 'z': 3, 'm': 3, 'a': 274, 'n': 274000},
          esp(273999), 'correct'),
     spec('Erreur : 274 999', 2, {'c': 6, 'z': 3, 'm': 3, 'a': 274, 'n': 274000},
          esp(274999), 'incorrect'),
     spec('Erreur : 273 000', 2, {'c': 6, 'z': 3, 'm': 3, 'a': 274, 'n': 274000},
          esp(273000), 'incorrect'),
     spec('suit 99 999 : 100 000', 3, {'c': 5, 's': 0, 'n': 99999}, esp(100000), 'correct'),
     spec('Erreur : 99 1000 (991 000)', 3, {'c': 5, 's': 0, 'n': 99999}, esp(991000),
          'incorrect'),
     spec('précède 10 000 : 9 999', 3, {'c': 4, 's': 1, 'n': 10000}, esp(9999), 'correct'),
     spec('Erreur : 1 999', 3, {'c': 4, 's': 1, 'n': 10000}, esp(1999), 'incorrect')]))


# --- 5. CM1-007 : « supérieur à », « inférieur à », « compris entre » ------------------------

EXPRESSIONS = [
    variation('Écris un nombre supérieur à ${{n}}$.\n\nUn nombre supérieur à ${{n}}$ : $?$.',
              [var('n', '10000..999000')], [entre('{{n}}', '100000000', '{{eval:n+1}}')],
              ['Un nombre supérieur à ${{n}}$ est plus grand que ${{n}}$ : il vient après dans la'
               ' suite des nombres.',
               'Par exemple ${{eval:n+1}}$ ou ${{eval:n+10}}$ : $${{eval:n+1}} > {{n}}$$']),
    variation('Écris un nombre inférieur à ${{n}}$.\n\nUn nombre inférieur à ${{n}}$ : $?$.',
              [var('n', '10000..999000')], [entre('-1', '{{n}}', '{{eval:n-1}}')],
              ['Un nombre inférieur à ${{n}}$ est plus petit que ${{n}}$ : il vient avant dans la'
               ' suite des nombres.',
               'Par exemple ${{eval:n-1}}$ ou ${{eval:n-10}}$ : $${{eval:n-1}} < {{n}}$$']),
    variation('Écris un nombre compris entre ${{a}}$ et ${{eval:a+10}}$.\n\n'
              'Un nombre compris entre ${{a}}$ et ${{eval:a+10}}$ : $?$.',
              [var('m', '1000..99998'), var('a', 'eval:10*m')],
              [entre('{{a}}', '{{eval:a+10}}', '{{eval:a+5}}')],
              ['Un nombre compris entre ${{a}}$ et ${{eval:a+10}}$ est plus grand que ${{a}}$ et'
               ' plus petit que ${{eval:a+10}}$.',
               'Ce sont les nombres de ${{eval:a+1}}$ à ${{eval:a+9}}$ : n\'importe lequel convient.',
               '$${{a}} < {{eval:a+5}} < {{eval:a+10}}$$']),
    variation('Écris un nombre supérieur à ${{a}}$ et inférieur à ${{b}}$.\n\n'
              'Un nombre supérieur à ${{a}}$ et inférieur à ${{b}}$ : $?$.',
              [var('a', '10000..999980'), var('k', '3..20'), var('b', 'eval:a+k')],
              [entre('{{a}}', '{{b}}', '{{eval:a+1}}')],
              ['Le nombre doit être plus grand que ${{a}}$ et plus petit que ${{b}}$.',
               'Ce sont les nombres de ${{eval:a+1}}$ à ${{eval:b-1}}$ : n\'importe lequel convient.',
               '$${{a}} < {{eval:a+1}} < {{b}}$$']),
]

MODELES.append(modele(
    '05-superieur-inferieur-compris',
    "Supérieur à, inférieur à, compris entre (jusqu'à $999\\,999$)",
    'Écrire un nombre qui respecte la phrase (toute réponse juste acceptée), entiers de 5 à 6'
    ' chiffres',
    'Apprivoiser', 'Comparer', 12, EXPRESSIONS,
    [spec('supérieur à 45 307 : 45 308', 0, {'n': 45307}, esp(45308), 'correct'),
     spec('supérieur à 45 307 : 90 000', 0, {'n': 45307}, esp(90000), 'correct'),
     spec('Erreur : 45 307 lui-même', 0, {'n': 45307}, esp(45307), 'incorrect'),
     spec('Erreur : inférieur (45 000)', 0, {'n': 45307}, esp(45000), 'incorrect'),
     spec('inférieur à 45 307 : 45 306', 1, {'n': 45307}, esp(45306), 'correct'),
     spec('inférieur à 45 307 : 0', 1, {'n': 45307}, '0', 'correct'),
     spec('Erreur : supérieur (50 000)', 1, {'n': 45307}, esp(50000), 'incorrect'),
     spec('compris entre 345 270 et 345 280 : 345 275', 2, {'m': 34527, 'a': 345270},
          esp(345275), 'correct'),
     spec('Erreur : borne 345 280', 2, {'m': 34527, 'a': 345270}, esp(345280), 'incorrect'),
     spec('Erreur : 345 270 lui-même', 2, {'m': 34527, 'a': 345270}, esp(345270), 'incorrect'),
     spec('supérieur à 52 860 et inférieur à 52 865 : 52 864', 3,
          {'a': 52860, 'k': 5, 'b': 52865}, esp(52864), 'correct'),
     spec('Erreur : 52 865 lui-même', 3, {'a': 52860, 'k': 5, 'b': 52865}, esp(52865),
          'incorrect')]))


# --- 6. CM1-009 : ranger cinq nombres ------------------------------------------------------
# Comme au CM2, à l'échelle des dizaines de mille : quatre nombres de six chiffres qui
# commencent par M, dont deux aux chiffres échangés (milliers / centaines), et un nombre de
# cinq chiffres qui commence par 9 (le plus petit malgré son premier chiffre).

RANG_VARS = [var('M', '10..99'), var('t', '1..7'), var('u', '{{eval:t+1}}..8'),
             var('w', '0..9999'), var('R1', '0..99'), var('R2', '0..99'),
             var('R3', '0..99'), var('R4', '0..99'),
             var('s1', 'eval:9*10^4+w'),
             var('s2', 'eval:M*10^4+(t-1)*10^3+9*10^2+R1'),
             var('s3', 'eval:M*10^4+t*10^3+u*10^2+R2'),
             var('s4', 'eval:M*10^4+t*10^3+9*10^2+R3'),
             var('s5', 'eval:M*10^4+u*10^3+t*10^2+R4')]


def etiquettes(signe, noms):
    return ('\n\n```ranger\nsigne: ' + signe + '\n'
            + ''.join('- ${{' + n + '}}$\n' for n in noms) + '```')


METHODE_RANGER = ('On compte d\'abord les chiffres : ${{s1}}$ n\'en a que $5$, c\'est le plus'
                  ' petit. Les quatre autres ont $6$ chiffres et commencent par ${{M}}$ : on'
                  ' compare leurs chiffres des unités de mille, puis des centaines.')

RANGER = [
    variation('Range ces nombres du plus petit au plus grand.'
              + etiquettes('<', ['s1', 's2', 's3', 's4', 's5']), RANG_VARS, None,
              [METHODE_RANGER, '$${{s1}} < {{s2}} < {{s3}} < {{s4}} < {{s5}}$$']),
    variation('Range ces nombres du plus grand au plus petit.'
              + etiquettes('>', ['s5', 's4', 's3', 's2', 's1']), RANG_VARS, None,
              [METHODE_RANGER, '$${{s5}} > {{s4}} > {{s3}} > {{s2}} > {{s1}}$$']),
]

EX_R = {'M': 34, 't': 2, 'u': 5, 'w': 8765, 'R1': 12, 'R2': 56, 'R3': 7, 'R4': 30}
MODELES.append(modele(
    '06-ranger-cinq-nombres', "Ranger cinq nombres (jusqu'à $999\\,999$)",
    'Ranger cinq entiers de 5 et 6 chiffres dans l\'ordre croissant ou décroissant',
    'Apprivoiser', 'Comparer', 13, RANGER,
    # L'élève répond, place par place, la position AFFICHÉE de l'étiquette qu'il y pose (mélange
    # des specs, graine 0) : positions relevées avec le générateur, comme au CM2
    [spec('croissant', 0, EX_R, ['4', '0', '1', '2', '3'], 'correct'),
     spec('Erreur : 98 765 en dernier (premier chiffre lu)', 0, EX_R,
          ['0', '1', '2', '3', '4'], 'incorrect'),
     spec('Erreur : 342 556 et 341 912 inversés', 0, EX_R, ['4', '1', '0', '2', '3'],
          'incorrect'),
     spec('Erreur : ordre décroissant', 0, EX_R, ['3', '2', '1', '0', '4'], 'incorrect'),
     spec('décroissant', 1, EX_R, ['4', '0', '1', '2', '3'], 'correct'),
     spec('Erreur : ordre croissant', 1, EX_R, ['3', '2', '1', '0', '4'], 'incorrect')],
    delay=60))


# --- 7. CM1-141 : encadrer un nombre -------------------------------------------------------

PRES = ['à la dizaine près', 'à la centaine près', 'au millier près',
        'à la dizaine de mille près']
UN = ['$1$ dizaine', '$1$ centaine', '$1$ millier', '$1$ dizaine de mille']

ENCADRER = variation(
    'Encadre ${{n}}$ ' + selon('k', PRES, 1) + '.\n\n$$?<{{n}}<?$$',
    [var('c', '5..6'), var('n', 'digits:c'), var('k', '1..4'), var('lo', 'eval:n-mod(n,10^k)'),
     var('hi', 'eval:lo+10^k')],
    ['{{lo}}', '{{hi}}'],
    ['**Encadrer ' + selon('k', PRES, 1) + '.** On garde les chiffres jusqu\'au rang des '
     + selon('k', ['dizaines', 'centaines', 'unités de mille', 'dizaines de mille'], 1)
     + ' et on remplace les suivants par des zéros : ${{lo}}$. On ajoute ' + selon('k', UN, 1)
     + ' : ${{hi}}$.',
     '$$' + col('{{lo}}') + ' < {{n}} < ' + col('{{hi}}') + '$$'],
    ['mod(n,10^k)!=0', 'hi<=999999'])

EX_ENC = {'c': 5, 'n': 45307, 'k': 2, 'lo': 45300, 'hi': 45400}
MODELES.append(modele(
    '07-encadrer-un-nombre', "Encadrer un nombre (jusqu'à $999\\,999$)",
    'Encadrer un entier de 5 à 6 chiffres à la dizaine, à la centaine, au millier ou à la'
    ' dizaine de mille près',
    'Apprivoiser', 'Encadrer', 13, [ENCADRER],
    [spec('45 300 < 45 307 < 45 400', 0, EX_ENC, [esp(45300), esp(45400)], 'correct'),
     spec('Erreur : nombres juste avant et juste après', 0, EX_ENC, [esp(45306), esp(45308)],
          'incorrect'),
     spec('Erreur : à la dizaine près', 0, EX_ENC, [esp(45300), esp(45310)], 'incorrect'),
     spec('Erreur : au-dessus mal arrondi (46 000)', 0, EX_ENC, [esp(45300), esp(46000)],
          'incorrect')],
    delay=30))


# --- 8. CM1-142 : intercaler un nombre ----------------------------------------------------

def intercaler(variables, bas, haut, exemple, steps, conditions=None):
    return variation(
        'Écris un nombre entier compris entre ${{' + bas + '}}$ et ${{' + haut + '}}$.\n\n$${{'
        + bas + '}} < ? < {{' + haut + '}}$$',
        variables, [entre('{{' + bas + '}}', '{{' + haut + '}}', exemple)], steps, conditions)


INTERCALER_LARGE = intercaler(
    [var('c', '5..6'), var('a', 'digits:c'), var('g', '10..9999'), var('b', 'eval:a+g')],
    'a', 'b', '{{eval:a+1}}',
    ['On compare les deux nombres chiffre à chiffre : tout nombre plus grand que ${{a}}$ et'
     ' plus petit que ${{b}}$ convient.',
     'Par exemple $' + col('{{eval:a+1}}') + '$, ou ${{eval:b-1}}$.'],
    ['b<=999999'])

INTERCALER_SERRE = intercaler(
    [var('c', '5..6'), var('a', 'digits:c'), var('b', 'eval:a+2')],
    'a', 'b', '{{eval:a+1}}',
    ['Entre ${{a}}$ et ${{b}}$, il n\'y a qu\'un seul nombre entier : celui qui suit ${{a}}$.',
     '$${{a}} < ' + col('{{solution}}') + ' < {{b}}$$'],
    ['b<=999999'])

INTERCALER_PASSAGE = intercaler(
    [var('c', '5..6'), var('k', '2..4'), var('m', 'eval:c-k'), var('x', 'digits:m'),
     var('r0', 'eval:x*10^k'), var('a', 'eval:r0-1'), var('b', 'eval:r0+1')],
    'a', 'b', '{{r0}}',
    ['${{a}}$ se termine par des $9$ : le nombre qui le suit est ${{r0}}$.',
     '$${{a}} < ' + col('{{solution}}') + ' < {{b}}$$'],
    ['mod(x,10)!=0'])

EX_LARGE = {'c': 5, 'a': 45307, 'g': 63, 'b': 45370}
EX_PASSAGE = {'c': 5, 'k': 3, 'm': 2, 'x': 46, 'r0': 46000, 'a': 45999, 'b': 46001}
MODELES.append(modele(
    '08-intercaler-un-nombre', "Intercaler un nombre (jusqu'à $999\\,999$)",
    'Écrire un entier compris entre deux entiers de 5 à 6 chiffres (45 307 < … < 45 370) ;'
    ' toute réponse comprise est juste',
    'Apprivoiser', 'Encadrer', 14, [INTERCALER_LARGE, INTERCALER_SERRE, INTERCALER_PASSAGE],
    [spec('45 308', 0, EX_LARGE, esp(45308), 'correct'),
     spec('45 350', 0, EX_LARGE, esp(45350), 'correct'),
     spec('Erreur : la borne 45 370', 0, EX_LARGE, esp(45370), 'incorrect'),
     spec('Erreur : 45 400', 0, EX_LARGE, esp(45400), 'incorrect'),
     spec('Erreur : 45 300', 0, EX_LARGE, esp(45300), 'incorrect'),
     spec('écart de 2 : 123 457', 1, {'c': 6, 'a': 123456, 'b': 123458}, esp(123457),
          'correct'),
     spec('Erreur : 123 458', 1, {'c': 6, 'a': 123456, 'b': 123458}, esp(123458), 'incorrect'),
     spec('passage : 46 000', 2, EX_PASSAGE, esp(46000), 'correct'),
     spec('Erreur : 45 1000 lu comme 451 000', 2, EX_PASSAGE, esp(451000), 'incorrect')]))


# --- 9 et 10. CM1-012 et CM1-013 : multiple de, diviseur de ---------------------------------
# Oui / Non (V1) : o = 0 → Oui (n = d × q), o = 1 → Non (n = d × q + r, r de 1 à d - 1).
# Un parmi quatre (V2) : le choix juste est écrit en premier, le bloc mélange l'affichage.

OUI_NON = choix(['Oui', 'Non'], melanger=False)
CANDIDATS = '3|4|6|7|8|9'
OUI_NON_VARS = [var('d', CANDIDATS), var('o', '0..1'), var('q', '4..140'), var('dm', 'eval:d-1'),
                var('s', '1..{{dm}}'), var('r', 'eval:s*o'), var('n', 'eval:d*q+r')]
OUI_NON_COND = ['n>=20', 'n<=999']
DIVISION = ('$${{n}} = {{d}} \\times {{q}}{{if:o==1| + {{r}}|}}$$')
CONCLUSION_MULTIPLE = ('{{if:o==0|Le reste est $0$ : ' + col('oui') + ', ${{n}}$ est un multiple'
                       ' de ${{d}}$ (il est dans la table de ${{d}}$).|Le reste est ${{r}}$, pas'
                       ' $0$ : ' + col('non') + ', ${{n}}$ n\'est pas un multiple de ${{d}}$.}}')
CONCLUSION_DIVISEUR = ('{{if:o==0|Le reste est $0$ : ' + col('oui') + ', ${{d}}$ est un'
                       ' diviseur de ${{n}}$.|Le reste est ${{r}}$, pas $0$ : ' + col('non')
                       + ', ${{d}}$ n\'est pas un diviseur de ${{n}}$.}}')

EST_MULTIPLE = variation(
    'Le nombre ${{n}}$ est-il un multiple de ${{d}}$ ?' + OUI_NON, OUI_NON_VARS, ['{{o}}'],
    ['**Multiple.** ${{n}}$ est un multiple de ${{d}}$ si la division de ${{n}}$ par ${{d}}$'
     ' tombe juste : le reste est $0$.', DIVISION, CONCLUSION_MULTIPLE], OUI_NON_COND)

QUEL_MULTIPLE = variation(
    'Lequel de ces nombres est un multiple de ${{d}}$ ?'
    + choix(['${{m0}}$', '${{m1}}$', '${{m2}}$', '${{m3}}$']),
    [var('d', CANDIDATS), var('dm', 'eval:d-1'), var('q0', '10..110'), var('q1', '10..110'),
     var('q2', '10..110'), var('q3', '10..110'), var('r1', '1..{{dm}}'),
     var('r2', '1..{{dm}}'), var('r3', '1..{{dm}}'), var('m0', 'eval:d*q0'),
     var('m1', 'eval:d*q1+r1'), var('m2', 'eval:d*q2+r2'), var('m3', 'eval:d*q3+r3')],
    ['0'],
    ['**Multiple.** Un multiple de ${{d}}$ est un nombre de la table de ${{d}}$ : sa division'
     ' par ${{d}}$ tombe juste.',
     '$${{m0}} = {{d}} \\times {{q0}}$$ Le reste est $0$ : $' + col('{{m0}}') + '$ est un'
     ' multiple de ${{d}}$.',
     'Les autres ne le sont pas : ${{m1}} = {{d}} \\times {{q1}} + {{r1}}$, ${{m2}} = {{d}}'
     ' \\times {{q2}} + {{r2}}$, ${{m3}} = {{d}} \\times {{q3}} + {{r3}}$.'],
    ['m0<=999', 'm1<=999', 'm2<=999', 'm3<=999', 'q1!=q2', 'q1!=q3', 'q2!=q3', 'q0!=q1',
     'q0!=q2', 'q0!=q3'])

EX_OUI = {'d': 7, 'o': 0, 'q': 23, 'dm': 6, 's': 3, 'r': 0, 'n': 161}
EX_NON = {'d': 7, 'o': 1, 'q': 20, 'dm': 6, 's': 1, 'r': 1, 'n': 141}
EX_QUEL = {'d': 6, 'dm': 5, 'q0': 24, 'q1': 23, 'q2': 30, 'q3': 15, 'r1': 4, 'r2': 2,
           'r3': 3, 'm0': 144, 'm1': 142, 'm2': 182, 'm3': 93}
MODELES.append(modele(
    '09-est-ce-un-multiple', 'Est-ce un multiple ?',
    'Dire si un entier jusqu\'à 999 est un multiple de 3, 4, 6, 7, 8 ou 9 (141 n\'est pas'
    ' multiple de 7) ; trouver le multiple parmi quatre nombres',
    'Diviser', 'Multiples et diviseurs', 2, [EST_MULTIPLE, QUEL_MULTIPLE],
    [spec('161 = 7 × 23 : oui', 0, EX_OUI, '0', 'correct'),
     spec('Erreur : non', 0, EX_OUI, '1', 'incorrect'),
     spec('141 = 7 × 20 + 1 : non', 0, EX_NON, '1', 'correct'),
     spec('Erreur : oui (14 dans la table de 7)', 0, EX_NON, '0', 'incorrect'),
     spec('144 est multiple de 6', 1, EX_QUEL, '0', 'correct'),
     spec('Erreur : 142 (pair, mais pas multiple de 6)', 1, EX_QUEL, '1', 'incorrect')],
    delay=30))

EST_DIVISEUR = variation(
    '${{d}}$ est-il un diviseur de ${{n}}$ ?' + OUI_NON, OUI_NON_VARS, ['{{o}}'],
    ['**Diviseur.** ${{d}}$ est un diviseur de ${{n}}$ si la division de ${{n}}$ par ${{d}}$'
     ' tombe juste : le reste est $0$. C\'est la même chose que « ${{n}}$ est un multiple de'
     ' ${{d}}$ ».', DIVISION, CONCLUSION_DIVISEUR], OUI_NON_COND)

QUEL_DIVISEUR = variation(
    'Lequel de ces nombres est un diviseur de ${{n}}$ ?'
    + choix(['${{d}}$', '${{e1}}$', '${{e2}}$', '${{e3}}$']),
    # Les trois autres choix se déduisent de d (d - 1, d + 1, d + 2, de 2 à 10) : tirés au
    # hasard, ils rendaient trop de tirages impossibles
    [var('d', '3..8'), var('e1', 'eval:d-1'), var('e2', 'eval:d+1'), var('e3', 'eval:d+2'),
     var('q', '10..140'), var('n', 'eval:d*q')],
    ['0'],
    ['**Diviseur.** On divise ${{n}}$ par chacun des nombres : le diviseur est celui pour'
     ' lequel la division tombe juste.',
     '$${{n}} = {{d}} \\times {{q}}$$ Le reste est $0$ : $' + col('{{d}}') + '$ est un diviseur'
     ' de ${{n}}$.',
     'Pour ${{e1}}$, ${{e2}}$ et ${{e3}}$, le reste n\'est pas $0$ : ${{n}} = {{e1}} \\times'
     ' {{eval:floor(n/e1)}} + {{eval:mod(n,e1)}}$, ${{n}} = {{e2}} \\times {{eval:floor(n/e2)}}'
     ' + {{eval:mod(n,e2)}}$, ${{n}} = {{e3}} \\times {{eval:floor(n/e3)}} +'
     ' {{eval:mod(n,e3)}}$.'],
    ['n<=999', 'mod(n,e1)!=0', 'mod(n,e2)!=0', 'mod(n,e3)!=0'])

EX_QUEL_D = {'d': 7, 'e1': 6, 'e2': 8, 'e3': 9, 'q': 23, 'n': 161}
MODELES.append(modele(
    '10-est-ce-un-diviseur', 'Est-ce un diviseur ?',
    'Dire si 3, 4, 6, 7, 8 ou 9 est un diviseur d\'un entier jusqu\'à 999 ; trouver le diviseur'
    ' parmi quatre nombres qui se suivent (de 2 à 10)',
    'Diviser', 'Multiples et diviseurs', 3, [EST_DIVISEUR, QUEL_DIVISEUR],
    [spec('7 divise 161 : oui', 0, EX_OUI, '0', 'correct'),
     spec('Erreur : non', 0, EX_OUI, '1', 'incorrect'),
     spec('7 ne divise pas 141 : non', 0, EX_NON, '1', 'correct'),
     spec('Erreur : oui', 0, EX_NON, '0', 'incorrect'),
     spec('7 divise 161', 1, EX_QUEL_D, '0', 'correct'),
     spec('Erreur : 6', 1, EX_QUEL_D, '1', 'incorrect')],
    delay=30))


os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
