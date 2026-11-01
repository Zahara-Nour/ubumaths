"""Écrit les 7 modèles du lot 1 « Calcul » de la 5e dans scripts/questions/5-calcul/.

Phase 0 validée par David le 2026-10-28 (un point par modèle) :

| # | Point | Titre | Variations | Réponse | Catégorie, niveau |
| 1 | 5-004 | Enchaîner des opérations | a + b × c ; a − (b + c) ; a,b + c × d,e ;
|   |       | a − (b,c + d,e) — décimaux positifs, 1 décimale, résultat positif | case |
|   |       | Décimaux › Priorités opératoires › Enchaînements, 1 |
| 2 | 5-006 | Nommer un calcul | a + b × c (somme), a × (b + c), (a + b) × c (produits),
|   |       | a × b + c (somme) | choix « une somme / un produit » | Entiers › Priorités opératoires ›
|   |       | Vocabulaire, 1 |
| 3 | 5-118 | Termes et facteurs | 2e terme de a + b × c, 1er facteur de (a + b) × c, et les
|   |       | symétriques (1er terme de a × b + c, 2e facteur de c × (a + b)) | choix parmi 4 écritures |
|   |       | Entiers › Priorités opératoires › Vocabulaire, 2 |
| 4 | 5-009 | Multiples et diviseurs | « n est-il un multiple de d ? », « lequel est un diviseur
|   |       | de N ? », « d divise-t-il n ? » ; tables jusqu'à 10, nombres ≤ 100, oui ET non tirés |
|   |       | choix | Entiers › Diviser › Multiples et diviseurs, 1 |
| 5 | 5-029 | Connaître les carrés | a², a de 0 à 12 | case | Entiers › Multiplier › Carrés, 2
|   |       | (niveau 1 déjà pris en prod) |
| 6 | 5-030 | Le cube de 10 | 10³ = ? et 10 × 10 × 10 = ? | case | Entiers › Multiplier › Cubes, 1 |
| 7 | 5-032 | Calculer avec des carrés et des cubes | a × b² − c ; (a × b)² − c ; a² + b³ ;
|   |       | a + b × c² — entiers ≤ 12, bases ≤ 5 pour les cubes, pas de quotient, résultat positif |
|   |       | case | Puissances › Calculer › Avec carrés et cubes, 1 |

Bornes : `cycle4.json`, 5e (5-006 : somme ou produit seulement, différence et quotient en 4e ;
5-009 : entiers naturels, pas de nombres premiers ; 5-032 : exposants 2 et 3 seulement). Le nœud et
le tag sont posés par la migration de rangement, après le `--publier` de David.

Décisions et pièges :
- choix en case choix (bloc ```choix, ADR 0033) ; l'indice du bon choix est un indice d'origine,
  passé par une variable ou un `eval` (jamais de `{{if:…}}` imbriqués) ;
- 5-009 : `ok` (0 ou 1) tire « oui » ou « non » ; le nombre « non » est `d × q + r`, 0 < r < d ;
  « lequel est un diviseur » : trois intrus de 2 à 10 qui ne divisent pas N (≈ 14 % de tirages
  gardés par essai, 100 essais : échec improbable) ;
- décimaux tirés en dixièmes entiers (`X/10;d`) et calculés en entiers, sans erreur d'arrondi ;
- carrés et cubes écrits en produits dans les `eval` (`b*b`, pas de `^`) ;
- variables `e` et `i` interdites dans les `eval`.

    python3 docs/wip/questions/lot-5-calcul.py scripts/questions/5-calcul
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(v) for k, v in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(nom, title, description, theme, domain, subdomain, level, variations, specs,
           delay=30, options=None):
    m = {'title': title, 'description': description, 'grades': ['5'], 'theme': theme,
         'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': delay,
         'status': 'draft'}
    if options:
        m['options'] = options
    m['variations'] = variations
    m['testSpecs'] = specs
    return nom, m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    if answers is not None:
        v['blanks'] = [a if isinstance(a, dict) else {'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + l + '\n' for l in lignes) + '```'


def ev(x):
    return '{{eval:' + x + '}}'


X = '\\times'
MODELES = []

# --- 1. 5-004 : enchaîner des opérations ---------------------------------------------------

CALCULE = 'Calcule.\n\n$$CALCUL = ?$$'
PRIORITE_MULT = ('**Priorité.** La multiplication se calcule **avant** l\'addition et la'
                 ' soustraction.')
PRIORITE_PAR = '**Priorité.** On calcule d\'abord **entre les parenthèses**.'

SOMME_PRODUIT = variation(
    CALCULE.replace('CALCUL', '{{a}} + {{b}} ' + X + ' {{c}}'),
    [var('a', '2..20'), var('b', '2..9'), var('c', '2..9')],
    ['{{eval:a+b*c}}'],
    [PRIORITE_MULT,
     '$$' + '{{a}} + ' + col('{{b}} ' + X + ' {{c}}', 1) + ' = {{a}} + ' + col(ev('b*c'), 1)
     + ' = ' + col('{{solution}}') + '$$'])

DIFFERENCE_PARENTHESES = variation(
    CALCULE.replace('CALCUL', '{{a}} - ({{b}} + {{c}})'),
    [var('a', '10..30'), var('b', '1..9'), var('c', '1..9')],
    ['{{eval:a-b-c}}'],
    [PRIORITE_PAR,
     '$$' + '{{a}} - ' + col('({{b}} + {{c}})', 1) + ' = {{a}} - ' + col(ev('b+c'), 1) + ' = '
     + col('{{solution}}') + '$$'],
    ['a>b+c'])

SOMME_PRODUIT_DECIMAUX = variation(
    CALCULE.replace('CALCUL', '{{x}} + {{c}} ' + X + ' {{y}}'),
    [var('X', '11..99'), var('c', '2..9'), var('Y', '11..99'), var('x', 'eval:X/10;d'),
     var('y', 'eval:Y/10;d')],
    ['{{eval:(X+c*Y)/10;d}}'],
    [PRIORITE_MULT,
     '$$' + '{{x}} + ' + col('{{c}} ' + X + ' {{y}}', 1) + ' = {{x}} + '
     + col(ev('c*Y/10;d'), 1) + ' = ' + col('{{solution}}') + '$$'],
    ['mod(X,10)!=0', 'mod(Y,10)!=0'])

DIFFERENCE_PARENTHESES_DECIMAUX = variation(
    CALCULE.replace('CALCUL', '{{a}} - ({{y}} + {{z}})'),
    [var('a', '10..30'), var('Y', '11..99'), var('Z', '11..99'), var('y', 'eval:Y/10;d'),
     var('z', 'eval:Z/10;d')],
    ['{{eval:(10*a-Y-Z)/10;d}}'],
    [PRIORITE_PAR,
     '$$' + '{{a}} - ' + col('({{y}} + {{z}})', 1) + ' = {{a}} - ' + col(ev('(Y+Z)/10;d'), 1)
     + ' = ' + col('{{solution}}') + '$$'],
    ['mod(Y,10)!=0', 'mod(Z,10)!=0', '10*a>Y+Z'])

SPEC_DEC = {'X': 55, 'c': 6, 'Y': 24, 'x': '5.5', 'y': '2.4'}
SPEC_DEC_PAR = {'a': 12, 'Y': 53, 'Z': 38, 'y': '5.3', 'z': '3.8'}
# Relecture de David (2026-10-28) : le niveau 1 vérifie les priorités sur des entiers seulement ;
# les décimaux passent dans un modèle de même type, au niveau 2 (08).
MODELES.append(modele(
    '01-enchainer-des-operations', 'Enchaîner des opérations',
    'Calculer en respectant les priorités, sur des entiers : multiplication avant addition'
    ' (5 + 3 × 4), parenthèses d\'abord (10 − (1 + 6))',
    'Décimaux', 'Priorités opératoires', 'Enchaînements', 1,
    [SOMME_PRODUIT, DIFFERENCE_PARENTHESES],
    [spec('5 + 3 × 4 = 17', 0, {'a': 5, 'b': 3, 'c': 4}, '17', 'correct'),
     spec('Erreur : calcul de gauche à droite (32)', 0, {'a': 5, 'b': 3, 'c': 4}, '32',
          'incorrect'),
     spec('10 − (1 + 6) = 3', 1, {'a': 10, 'b': 1, 'c': 6}, '3', 'correct'),
     spec('Erreur : parenthèses ignorées (10 − 1 + 6 = 15)', 1, {'a': 10, 'b': 1, 'c': 6}, '15',
          'incorrect')],
    delay=45))

MODELES.append(modele(
    '08-enchainer-des-operations-decimaux', 'Enchaîner des opérations',
    'Calculer en respectant les priorités, avec des décimaux : 5,5 + 6 × 2,4 ;'
    ' 12 − (5,3 + 3,8)',
    'Décimaux', 'Priorités opératoires', 'Enchaînements', 2,
    [SOMME_PRODUIT_DECIMAUX, DIFFERENCE_PARENTHESES_DECIMAUX],
    [spec('5,5 + 6 × 2,4 = 19,9', 0, SPEC_DEC, '19,9', 'correct'),
     spec('Erreur : de gauche à droite (11,5 × 2,4 = 27,6)', 0, SPEC_DEC, '27,6', 'incorrect'),
     spec('12 − (5,3 + 3,8) = 2,9', 1, SPEC_DEC_PAR, '2,9', 'correct'),
     spec('Erreur : parenthèses ignorées (12 − 5,3 + 3,8 = 10,5)', 1, SPEC_DEC_PAR, '10,5',
          'incorrect')],
    delay=60))

# --- 2. 5-006 : nommer un calcul (somme ou produit) ----------------------------------------

NATURE = choix(['une somme', 'un produit'], melanger=False)
DERNIERE = ('**Somme ou produit ?** On regarde la **dernière opération** à effectuer : une'
            ' addition donne une somme, une multiplication donne un produit.')


def nommer(calcul, premier, valeur_premier, reste, derniere, nature, variables, conditions=None):
    """`premier` : ce qu'on calcule d'abord ; `reste` : le calcul une fois `premier` remplacé."""
    return variation(
        'Le calcul $' + calcul + '$ est :' + NATURE, variables,
        ['0' if nature == 'une somme' else '1'],
        [DERNIERE,
         'On calcule d\'abord $' + col(premier, 1) + '$ : $' + calcul + ' = '
         + reste.replace('#', col(valeur_premier, 1)) + '$.',
         'La dernière opération est ' + derniere + ' : c\'est ' + col('\\text{' + nature + '}')
         .join(['$', '$']) + '.'],
        conditions)


VARS3 = [var('a', '2..9'), var('b', '2..9'), var('c', '2..9')]
NOMMER_SOMME_DROITE = nommer(
    '{{a}} + {{b}} ' + X + ' {{c}}', '{{b}} ' + X + ' {{c}}', ev('b*c'), '{{a}} + #',
    'une addition', 'une somme', VARS3)
NOMMER_PRODUIT_DROITE = nommer(
    '{{a}} ' + X + ' ({{b}} + {{c}})', '{{b}} + {{c}}', ev('b+c'), '{{a}} ' + X + ' #',
    'une multiplication', 'un produit', VARS3)
NOMMER_PRODUIT_GAUCHE = nommer(
    '({{a}} + {{b}}) ' + X + ' {{c}}', '{{a}} + {{b}}', ev('a+b'), '# ' + X + ' {{c}}',
    'une multiplication', 'un produit', VARS3)
NOMMER_SOMME_GAUCHE = nommer(
    '{{a}} ' + X + ' {{b}} + {{c}}', '{{a}} ' + X + ' {{b}}', ev('a*b'), '# + {{c}}',
    'une addition', 'une somme', VARS3)

ABC = {'a': 3, 'b': 4, 'c': 5}
MODELES.append(modele(
    '02-nommer-un-calcul', 'Nommer un calcul',
    'Dire si un calcul est une somme ou un produit, d\'après sa dernière opération'
    ' (3 + 4 × 5 est une somme ; (3 + 4) × 5 est un produit)',
    'Entiers', 'Priorités opératoires', 'Vocabulaire', 1,
    [NOMMER_SOMME_DROITE, NOMMER_PRODUIT_DROITE, NOMMER_PRODUIT_GAUCHE, NOMMER_SOMME_GAUCHE],
    [spec('3 + 4 × 5 : une somme', 0, ABC, '0', 'correct'),
     spec('Erreur : « un produit » parce qu\'il y a ×', 0, ABC, '1', 'incorrect'),
     spec('3 × (4 + 5) : un produit', 1, ABC, '1', 'correct'),
     spec('Erreur : « une somme » parce qu\'il y a +', 1, ABC, '0', 'incorrect'),
     spec('(3 + 4) × 5 : un produit', 2, ABC, '1', 'correct'),
     spec('Erreur : « une somme » (on voit + en premier)', 2, ABC, '0', 'incorrect'),
     spec('3 × 4 + 5 : une somme', 3, ABC, '0', 'correct'),
     spec('Erreur : « un produit » (on voit × en premier)', 3, ABC, '1', 'incorrect')]))

# --- 3. 5-118 : termes d'une somme, facteurs d'un produit ----------------------------------
# Le bon choix est toujours le premier écrit (indice d'origine 0) ; le bloc mélange l'affichage.

TERMES = ('**Termes.** Les **termes** d\'une somme sont les nombres (ou les calculs) que l\'on'
          ' additionne.')
FACTEURS = ('**Facteurs.** Les **facteurs** d\'un produit sont les nombres (ou les calculs) que'
            ' l\'on multiplie.')
DISTINCTS = ['a!=b', 'b!=c', 'a!=c']


def element(question, calcul, nature, bon, intrus, explication, rappel):
    return variation(
        question + ' $' + calcul + '$ ?' + choix(['$' + bon + '$'] + ['$' + x + '$' for x in intrus]),
        [var('a', '2..9'), var('b', '2..9'), var('c', '2..9')], ['0'],
        [rappel,
         '$' + calcul + '$ est ' + nature + ' : ' + explication,
         'La réponse est $' + col(bon) + '$.'],
        DISTINCTS)


DEUXIEME_TERME = element(
    'Quel est le deuxième terme de la somme', '{{a}} + {{b}} ' + X + ' {{c}}', 'une somme',
    '{{b}} ' + X + ' {{c}}', ['{{b}}', '{{c}}', '{{a}}'],
    'on calcule $' + '{{b}} ' + X + ' {{c}}$, puis on l\'ajoute à ${{a}}$. Ses deux termes sont'
    ' ${{a}}$ et ${{b}} ' + X + ' {{c}}$.', TERMES)
PREMIER_TERME = element(
    'Quel est le premier terme de la somme', '{{a}} ' + X + ' {{b}} + {{c}}', 'une somme',
    '{{a}} ' + X + ' {{b}}', ['{{a}}', '{{b}}', '{{c}}'],
    'on calcule $' + '{{a}} ' + X + ' {{b}}$, puis on ajoute ${{c}}$. Ses deux termes sont'
    ' ${{a}} ' + X + ' {{b}}$ et ${{c}}$.', TERMES)
PREMIER_FACTEUR = element(
    'Quel est le premier facteur du produit', '({{a}} + {{b}}) ' + X + ' {{c}}', 'un produit',
    '{{a}} + {{b}}', ['{{a}}', '{{b}}', '{{c}}'],
    'on calcule $' + '{{a}} + {{b}}$, puis on multiplie par ${{c}}$. Ses deux facteurs sont'
    ' $({{a}} + {{b}})$ et ${{c}}$.', FACTEURS)
DEUXIEME_FACTEUR = element(
    'Quel est le deuxième facteur du produit', '{{c}} ' + X + ' ({{a}} + {{b}})', 'un produit',
    '{{a}} + {{b}}', ['{{a}}', '{{b}}', '{{c}}'],
    'on calcule $' + '{{a}} + {{b}}$, puis on multiplie ${{c}}$ par le résultat. Ses deux facteurs'
    ' sont ${{c}}$ et $({{a}} + {{b}})$.', FACTEURS)

TFC = {'a': 7, 'b': 3, 'c': 5}
MODELES.append(modele(
    '03-termes-et-facteurs', 'Termes et facteurs',
    'Reconnaître les termes d\'une somme et les facteurs d\'un produit : le 2e terme de'
    ' 7 + 3 × 5 est 3 × 5 ; le 1er facteur de (4 + 2) × 9 est 4 + 2',
    'Entiers', 'Priorités opératoires', 'Vocabulaire', 2,
    [DEUXIEME_TERME, PREMIER_TERME, PREMIER_FACTEUR, DEUXIEME_FACTEUR],
    [spec('2e terme de 7 + 3 × 5 : 3 × 5', 0, TFC, '0', 'correct'),
     spec('Erreur : 3 (le 2e nombre écrit)', 0, TFC, '1', 'incorrect'),
     spec('1er terme de 7 × 3 + 5 : 7 × 3', 1, TFC, '0', 'correct'),
     spec('Erreur : 7 (le 1er nombre écrit)', 1, TFC, '1', 'incorrect'),
     spec('1er facteur de (7 + 3) × 5 : 7 + 3', 2, TFC, '0', 'correct'),
     spec('Erreur : 7 (le 1er nombre écrit)', 2, TFC, '1', 'incorrect'),
     spec('2e facteur de 5 × (7 + 3) : 7 + 3', 3, TFC, '0', 'correct'),
     spec('Erreur : 7', 3, TFC, '1', 'incorrect')]))

# --- 4. 5-009 : multiples et diviseurs -----------------------------------------------------
# `ok` = 1 : la réponse est oui (n = d × q) ; `ok` = 0 : non (n = d × q + r, 0 < r < d).

OUI_NON = choix(['Oui', 'Non'], melanger=False)
VARS_OUI_NON = [var('ok', '0..1'), var('d', '3..9'), var('q', '2..12'),
                var('r', '1..{{eval:d-1}}'), var('n', 'eval:d*q+(1-ok)*r'),
                var('rep', 'eval:1-ok')]
DIVISION = ('{{if:ok==1|${{n}} = {{d}} ' + X + ' {{q}}$ : la division de ${{n}}$ par ${{d}}$'
            ' tombe juste.|${{n}} = {{d}} ' + X + ' {{q}} + {{r}}$ : la division de ${{n}}$ par'
            ' ${{d}}$ ne tombe pas juste, il reste ${{r}}$.}}')

MULTIPLE = variation(
    '${{n}}$ est-il un multiple de ${{d}}$ ?' + OUI_NON, VARS_OUI_NON, ['{{rep}}'],
    ['**Multiple.** ${{n}}$ est un multiple de ${{d}}$ si ${{n}}$ est dans la table de ${{d}}$ :'
     ' ${{n}} = {{d}} ' + X + ' \\ldots$',
     DIVISION,
     '{{if:ok==1|' + col('\\text{Oui}').join(['$', '$']) + ', ${{n}}$ est un multiple de ${{d}}$.|'
     + col('\\text{Non}').join(['$', '$']) + ', ${{n}}$ n\'est pas un multiple de ${{d}}$.}}'],
    ['n<=100'])

DIVISE = variation(
    '${{d}}$ divise-t-il ${{n}}$ ?' + OUI_NON, VARS_OUI_NON, ['{{rep}}'],
    ['**Diviseur.** ${{d}}$ divise ${{n}}$ si la division de ${{n}}$ par ${{d}}$ tombe juste :'
     ' ${{n}}$ est alors un multiple de ${{d}}$.',
     DIVISION,
     '{{if:ok==1|' + col('\\text{Oui}').join(['$', '$']) + ', ${{d}}$ divise ${{n}}$.|'
     + col('\\text{Non}').join(['$', '$']) + ', ${{d}}$ ne divise pas ${{n}}$.}}'],
    ['n<=100'])

UN_DIVISEUR = variation(
    'Lequel de ces nombres est un diviseur de ${{N}}$ ?'
    + choix(['${{d}}$', '${{x}}$', '${{y}}$', '${{z}}$']),
    [var('d', '3..9'), var('q', '2..12'), var('N', 'eval:d*q'), var('x', '2..10'),
     var('y', '2..10'), var('z', '2..10')],
    ['0'],
    ['**Diviseur.** Un diviseur de ${{N}}$ est un nombre qui divise ${{N}}$ : la division tombe'
     ' juste.',
     '${{N}} = {{d}} ' + X + ' {{q}}$ : ' + col('{{d}}').join(['$', '$']) + ' est un diviseur de'
     ' ${{N}}$.',
     'Les autres ne le sont pas : ${{N}}$ n\'est dans la table ni de ${{x}}$, ni de ${{y}}$, ni de'
     ' ${{z}}$.'],
    ['N<=100', 'mod(N,x)!=0', 'mod(N,y)!=0', 'mod(N,z)!=0', 'x!=y', 'y!=z', 'x!=z'])

OUI_84 = {'ok': 1, 'd': 7, 'q': 12, 'r': 3, 'n': 84, 'rep': 0}
NON_59 = {'ok': 0, 'd': 7, 'q': 8, 'r': 3, 'n': 59, 'rep': 1}
OUI_72 = {'ok': 1, 'd': 9, 'q': 8, 'r': 2, 'n': 72, 'rep': 0}
NON_40 = {'ok': 0, 'd': 6, 'q': 6, 'r': 4, 'n': 40, 'rep': 1}
MODELES.append(modele(
    '04-multiples-et-diviseurs', 'Multiples et diviseurs',
    'Dire si un nombre est un multiple d\'un autre (84 et 7), si un nombre en divise un autre'
    ' (9 et 72), trouver un diviseur parmi quatre nombres ; tables jusqu\'à 10, nombres ≤ 100',
    'Entiers', 'Diviser', 'Multiples et diviseurs', 1,
    [MULTIPLE, UN_DIVISEUR, DIVISE],
    [spec('84 est un multiple de 7 : oui', 0, OUI_84, '0', 'correct'),
     spec('Erreur : non', 0, OUI_84, '1', 'incorrect'),
     spec('59 n\'est pas un multiple de 7 : non', 0, NON_59, '1', 'correct'),
     spec('Erreur : oui', 0, NON_59, '0', 'incorrect'),
     spec('6 divise 48', 1, {'d': 6, 'q': 8, 'N': 48, 'x': 5, 'y': 7, 'z': 9}, '0', 'correct'),
     spec('Erreur : 9 (48 confondu avec un multiple de 9)', 1,
          {'d': 6, 'q': 8, 'N': 48, 'x': 5, 'y': 7, 'z': 9}, '3', 'incorrect'),
     spec('9 divise 72 : oui', 2, OUI_72, '0', 'correct'),
     spec('Erreur : non', 2, OUI_72, '1', 'incorrect'),
     spec('6 ne divise pas 40 : non', 2, NON_40, '1', 'correct'),
     spec('Erreur : oui', 2, NON_40, '0', 'incorrect')]))

# --- 5. 5-029 : connaître les carrés -------------------------------------------------------

CARRE = variation(
    'Calcule.\n\n$${{a}}^2 = ?$$',
    [var('a', '0..12')],
    ['{{eval:a*a}}'],
    ['**Carré.** ${{a}}^2$ se lit « ${{a}}$ au carré » : c\'est ${{a}} ' + X + ' {{a}}$.',
     '$${{a}}^2 = {{a}} ' + X + ' {{a}} = ' + col('{{solution}}') + '$$'])

MODELES.append(modele(
    '05-connaitre-les-carres', 'Connaître les carrés',
    'Carrés des entiers de 0 à 12 (5² = 25, 12² = 144)',
    'Entiers', 'Multiplier', 'Carrés', 2,
    [CARRE],
    [spec('5² = 25', 0, {'a': 5}, '25', 'correct'),
     spec('Erreur : 5 × 2 = 10', 0, {'a': 5}, '10', 'incorrect'),
     spec('12² = 144', 0, {'a': 12}, '144', 'correct'),
     spec('Erreur : 12 × 2 = 24', 0, {'a': 12}, '24', 'incorrect'),
     spec('0² = 0', 0, {'a': 0}, '0', 'correct'),
     spec('1² = 1', 0, {'a': 1}, '1', 'correct'),
     spec('Erreur : 1² = 2', 0, {'a': 1}, '2', 'incorrect')],
    delay=20))

# --- 6. 5-030 : le cube de 10 --------------------------------------------------------------

CUBE = ('**Cube.** $10^3$ se lit « $10$ au cube » : c\'est $10 ' + X + ' 10 ' + X + ' 10$.')
CUBE_PUISSANCE = variation(
    'Calcule.\n\n$$10^3 = ?$$', [], ['1000'],
    [CUBE,
     '$$10^3 = 10 ' + X + ' 10 ' + X + ' 10 = 100 ' + X + ' 10 = ' + col('{{solution}}') + '$$',
     'Il y a $3$ zéros : autant que l\'exposant.'])
CUBE_PRODUIT = variation(
    'Calcule.\n\n$$10 ' + X + ' 10 ' + X + ' 10 = ?$$', [], ['1000'],
    ['On multiplie de gauche à droite : $10 ' + X + ' 10 = 100$.',
     '$$10 ' + X + ' 10 ' + X + ' 10 = 100 ' + X + ' 10 = ' + col('{{solution}}') + '$$',
     'C\'est le cube de $10$ : $10^3 = 1\\,000$.'])

MODELES.append(modele(
    '06-le-cube-de-10', 'Le cube de 10',
    'Connaître le cube de 10 : 10³ = 10 × 10 × 10 = 1 000',
    'Entiers', 'Multiplier', 'Cubes', 1,
    [CUBE_PUISSANCE, CUBE_PRODUIT],
    [spec('10³ = 1 000', 0, {}, '1000', 'correct'),
     spec('Erreur : 10 × 3 = 30', 0, {}, '30', 'incorrect'),
     spec('10³ recopié : forme refusée', 0, {}, '10^3', 'bad_form', ['form']),
     spec('Erreur : 100', 0, {}, '100', 'incorrect'),
     spec('10 × 10 × 10 = 1 000', 1, {}, '1000', 'correct'),
     spec('Erreur : 300', 1, {}, '300', 'incorrect'),
     spec('Erreur : 100', 1, {}, '100', 'incorrect')],
    delay=20))

# --- 7. 5-032 : calculer avec des carrés et des cubes --------------------------------------

# Relecture de David (2026-10-28) : calcul de tête → v1 a, b ≤ 5 (≤ 125) ; v4 b ≤ 4, c ≤ 5 (≤ 120).
PRIORITE_PUISSANCE = ('**Priorités.** On calcule d\'abord entre les parenthèses, puis les'
                      ' carrés et les cubes, puis les multiplications, enfin les additions et'
                      ' les soustractions.')

PRODUIT_CARRE = variation(
    CALCULE.replace('CALCUL', '{{a}} ' + X + ' {{b}}^2 - {{c}}'),
    [var('a', '2..5'), var('b', '2..5'), var('c', '1..20')],
    ['{{eval:a*b*b-c}}'],
    [PRIORITE_PUISSANCE,
     'Le carré porte seulement sur ${{b}}$ : ${{b}}^2 = {{b}} ' + X + ' {{b}} = '
     + ev('b*b') + '$.',
     '$${{a}} ' + X + ' ' + col('{{b}}^2', 1) + ' - {{c}} = {{a}} ' + X + ' ' + col(ev('b*b'), 1)
     + ' - {{c}} = ' + ev('a*b*b') + ' - {{c}} = ' + col('{{solution}}') + '$$'],
    ['c<a*b*b'])

CARRE_PRODUIT = variation(
    CALCULE.replace('CALCUL', '({{a}} ' + X + ' {{b}})^2 - {{c}}'),
    [var('a', '2..6'), var('b', '2..6'), var('c', '1..20')],
    ['{{eval:a*a*b*b-c}}'],
    [PRIORITE_PUISSANCE,
     'Le carré porte sur toute la parenthèse : on calcule d\'abord ${{a}} ' + X + ' {{b}} = '
     + ev('a*b') + '$.',
     '$$' + col('({{a}} ' + X + ' {{b}})', 1) + '^2 - {{c}} = ' + col(ev('a*b'), 1) + '^2 - {{c}}'
     ' = ' + ev('a*b*a*b') + ' - {{c}} = ' + col('{{solution}}') + '$$'],
    ['a*b<=12'])

CARRE_PLUS_CUBE = variation(
    CALCULE.replace('CALCUL', '{{a}}^2 + {{b}}^3'),
    [var('a', '2..12'), var('b', '2..5')],
    ['{{eval:a*a+b*b*b}}'],
    [PRIORITE_PUISSANCE,
     '${{a}}^2 = {{a}} ' + X + ' {{a}} = ' + ev('a*a') + '$ et ${{b}}^3 = {{b}} ' + X + ' {{b}} '
     + X + ' {{b}} = ' + ev('b*b*b') + '$.',
     '$${{a}}^2 + {{b}}^3 = ' + ev('a*a') + ' + ' + ev('b*b*b') + ' = ' + col('{{solution}}')
     + '$$'])

SOMME_PRODUIT_CARRE = variation(
    CALCULE.replace('CALCUL', '{{a}} + {{b}} ' + X + ' {{c}}^2'),
    [var('a', '1..20'), var('b', '2..4'), var('c', '2..5')],
    ['{{eval:a+b*c*c}}'],
    [PRIORITE_PUISSANCE,
     '$$' + '{{a}} + {{b}} ' + X + ' ' + col('{{c}}^2', 1) + ' = {{a}} + {{b}} ' + X + ' '
     + col(ev('c*c'), 1) + ' = {{a}} + ' + ev('b*c*c') + ' = ' + col('{{solution}}') + '$$'])

MODELES.append(modele(
    '07-calculer-avec-des-carres-et-des-cubes', 'Calculer avec des carrés et des cubes',
    'Calculer une expression avec des carrés et des cubes en respectant les priorités :'
    ' 3 × 5² − 7 et (3 × 5)² − 7 ; 4² + 2³ ; 5 + 2 × 3²',
    'Puissances', 'Calculer', 'Avec carrés et cubes', 1,
    [PRODUIT_CARRE, CARRE_PRODUIT, CARRE_PLUS_CUBE, SOMME_PRODUIT_CARRE],
    [spec('3 × 5² − 7 = 68', 0, {'a': 3, 'b': 5, 'c': 7}, '68', 'correct'),
     spec('Erreur : (3 × 5)² − 7 = 218', 0, {'a': 3, 'b': 5, 'c': 7}, '218', 'incorrect'),
     spec('Erreur : 5² lu 5 × 2 (23)', 0, {'a': 3, 'b': 5, 'c': 7}, '23', 'incorrect'),
     spec('(3 × 5)² − 7 = 218', 1, {'a': 3, 'b': 5, 'c': 7}, '218', 'correct'),
     spec('Erreur : 3 × 5² − 7 = 68', 1, {'a': 3, 'b': 5, 'c': 7}, '68', 'incorrect'),
     spec('4² + 2³ = 24', 2, {'a': 4, 'b': 2}, '24', 'correct'),
     spec('Erreur : 4 × 2 + 2 × 3 = 14', 2, {'a': 4, 'b': 2}, '14', 'incorrect'),
     spec('Erreur : 2³ lu 2 × 3 (22)', 2, {'a': 4, 'b': 2}, '22', 'incorrect'),
     spec('5 + 2 × 3² = 23', 3, {'a': 5, 'b': 2, 'c': 3}, '23', 'correct'),
     spec('Erreur : (5 + 2) × 3² = 63', 3, {'a': 5, 'b': 2, 'c': 3}, '63', 'incorrect'),
     spec('Erreur : (2 × 3)² + 5 = 41', 3, {'a': 5, 'b': 2, 'c': 3}, '41', 'incorrect')],
    delay=45))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
