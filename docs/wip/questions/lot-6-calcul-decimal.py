"""Écrit les 10 modèles du lot 3 « Calcul décimal » de la 6e dans scripts/questions/6-calcul-decimal/.

Phase 0 validée par David le 2026-10-27 (§ 10 du journal `docs/wip/questions-6-progress.md`).
Bornes : `cycle3.json`, 6e (6-121 : diviseur entier de 1 à 9, division qui peut ne pas s'arrêter ;
6-123 et 6-124 : diviseur < 100). Un point par modèle ; le nœud et le tag sont posés par la
migration de rangement, après le `--publier` de David.

Décisions et pièges :
- seule la division euclidienne (6-123) est posée (bloc ```operation, cases du quotient et du
  reste, attendus calculés par le bloc) ;
- problèmes en euros : `zeros` à `off` (7,50 € et 7,5 € justes tous deux) ; un prix s'écrit
  toujours avec deux décimales dans l'énoncé (`euros()`, un `eval` retirerait le zéro) ;
- 6-122 : diviseur d'un chiffre seulement (sans calculatrice) ;
- choix en case choix (bloc ```choix, ADR 0033) ;
- variables `e` et `i` interdites dans les `eval`.

    python3 docs/wip/questions/lot-6-calcul-decimal.py scripts/questions/6-calcul-decimal
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]
SANS_ZEROS = {'constraints': {'zeros': 'off'}}


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
    m = {'title': title, 'description': description, 'grades': ['6'], 'theme': theme,
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


def selon(nom, valeurs, debut=0):
    """`{{if:nom==debut|v0|{{if:nom==debut+1|v1|…}}}}` ; la dernière valeur est le « sinon »."""
    texte = valeurs[-1]
    for k in range(len(valeurs) - 2, -1, -1):
        texte = '{{if:' + nom + '==' + str(debut + k) + '|' + valeurs[k] + '|' + texte + '}}'
    return texte


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + l + '\n' for l in lignes) + '```'


def euros(c):
    """Prix de `c` centimes, toujours à deux décimales (« 7.50 », « 0.35 »)."""
    return ('{{eval:floor(' + c + '/100)}}.{{eval:floor(mod(' + c + ',100)/10)}}{{eval:mod('
            + c + ',10)}}')


EURO = '~\\text{€}'
MODELES = []

# --- 1. 6-114 : additionner des décimaux -------------------------------------------------

ALIGNER = ('**Additionner des décimaux.** On additionne les chiffres de même rang : unités avec'
           ' unités, dixièmes avec dixièmes, centièmes avec centièmes. Pour ne pas se tromper, on'
           ' écrit les deux nombres avec autant de chiffres après la virgule.')

ADDITION_LONGUEURS = variation(
    'Calcule.\n\n$${{x}} + {{y}} = ?$$',
    [var('A', '11..999'), var('B', '101..999'), var('x', 'eval:A/10;d'),
     var('y', 'eval:B/100;d')],
    ['{{eval:(10*A+B)/100;d}}'],
    [ALIGNER,
     '${{x}} = {{x}}0$ : c\'est ${{eval:10*A}}$ centièmes ; ${{y}}$, c\'est ${{B}}$ centièmes.'
     ' En tout : ${{eval:10*A}} + {{B}} = {{eval:10*A+B}}$ centièmes.',
     '$${{x}} + {{y}} = {{x}}0 + {{y}} = ' + col('{{solution}}') + '$$'],
    ['mod(A,10)!=0', 'mod(B,10)!=0'])

ADDITION_REGROUPER = variation(
    'Calcule astucieusement.\n\n$${{p}} + {{b}} + {{q}} = ?$$',
    [var('u', '1..20'), var('D', '5..95'), var('w', '0..9'), var('M', '11..99'),
     var('p', 'eval:u+D/100;d'), var('q', 'eval:w+(100-D)/100;d'), var('b', 'eval:M/10;d')],
    ['{{eval:u+w+1+M/10;d}}'],
    ['**Regrouper.** Dans une somme, on peut changer l\'ordre des termes : on cherche deux'
     ' nombres dont la somme est un entier.',
     '$' + col('{{p}}') + ' + ' + col('{{q}}') + ' = {{eval:u+w+1}}$ : ${{D}}$ centièmes et'
     ' ${{eval:100-D}}$ centièmes font $100$ centièmes, soit $1$ unité.',
     '$${{p}} + {{b}} + {{q}} = {{eval:u+w+1}} + {{b}} = ' + col('{{solution}}') + '$$'],
    ['mod(D,10)!=0', 'mod(M,10)!=0'])

ADDITION_ENTIER = variation(
    'Calcule.\n\n$${{n}} + {{y}} = ?$$',
    [var('n', '2..99'), var('Y', '1..999'), var('y', 'eval:Y/100;d')],
    ['{{eval:n+Y/100;d}}'],
    [ALIGNER,
     '${{n}}$ est un entier : ${{n}} = {{n}}.00$. On ajoute ses unités aux unités de ${{y}}$,'
     ' les dixièmes et les centièmes ne changent pas.',
     '$${{n}} + {{y}} = ' + col('{{solution}}') + '$$'],
    ['mod(Y,10)!=0'])

SPEC_ADD = {'A': 127, 'B': 385, 'x': '12.7', 'y': '3.85'}
SPEC_REG = {'u': 2, 'D': 75, 'w': 0, 'M': 46, 'p': '2.75', 'q': '0.25', 'b': '4.6'}
SPEC_ENT = {'n': 7, 'Y': 35, 'y': '0.35'}
MODELES.append(modele(
    '01-additionner-des-decimaux', 'Additionner des nombres décimaux',
    'Somme de deux décimaux de longueurs différentes (12,7 + 3,85), regroupement en un entier'
    ' (2,75 + 4,6 + 0,25), entier + décimal (7 + 0,35)',
    'Décimaux', 'Additionner', 'Somme', 5,
    [ADDITION_LONGUEURS, ADDITION_REGROUPER, ADDITION_ENTIER],
    [spec('12,7 + 3,85 = 16,55', 0, SPEC_ADD, '16,55', 'correct'),
     spec('Erreur : chiffres alignés à droite (5,12)', 0, SPEC_ADD, '5,12', 'incorrect'),
     spec('Erreur : retenue des dixièmes oubliée (15,55)', 0, SPEC_ADD, '15,55', 'incorrect'),
     spec('2,75 + 4,6 + 0,25 = 7,6', 1, SPEC_REG, '7,6', 'correct'),
     spec('Erreur : 4,6 lu 4,06 (7,06)', 1, SPEC_REG, '7,06', 'incorrect'),
     spec('7 + 0,35 = 7,35', 2, SPEC_ENT, '7,35', 'correct'),
     spec('Erreur : 7 ajouté aux centièmes (0,42)', 2, SPEC_ENT, '0,42', 'incorrect')]))

# --- 2. 6-198 : soustraire des décimaux ---------------------------------------------------

SOUSTRAIRE = ('**Soustraire des décimaux.** On écrit les deux nombres avec autant de chiffres'
              ' après la virgule (on ajoute des zéros), puis on soustrait rang par rang, de droite à'
              ' gauche, avec les retenues.')

SOUSTRACTION_LONGUEURS = variation(
    'Calcule.\n\n$${{x}} - {{y}} = ?$$',
    [var('A', '21..999'), var('B', '101..999'), var('x', 'eval:A/10;d'),
     var('y', 'eval:B/100;d')],
    ['{{eval:(10*A-B)/100;d}}'],
    [SOUSTRAIRE,
     '${{x}} = {{x}}0$ : il a $0$ centième. On ne peut pas ôter ${{eval:mod(B,10)}}$ centièmes'
     ' de $0$ : on échange $1$ dixième contre $10$ centièmes.',
     '$${{x}} - {{y}} = {{x}}0 - {{y}} = ' + col('{{solution}}') + '$$'],
    ['mod(A,10)!=0', 'mod(B,10)!=0', '10*A>B+100'])

SOUSTRACTION_ENTIER = variation(
    'Calcule.\n\n$${{n}} - {{y}} = ?$$',
    [var('n', '2..50'), var('M', '11..499'), var('y', 'eval:M/10;d')],
    ['{{eval:n-M/10;d}}'],
    [SOUSTRAIRE,
     '${{n}} = {{n}}.0$ : il a $0$ dixième. On échange $1$ unité contre $10$ dixièmes : $10 -'
     ' {{eval:mod(M,10)}} = {{eval:10-mod(M,10)}}$ dixièmes.',
     '$${{n}} - {{y}} = {{n}}.0 - {{y}} = ' + col('{{solution}}') + '$$'],
    ['mod(M,10)!=0', '10*n>M'])

SOUSTRACTION_DEUX_RANGS = variation(
    'Calcule.\n\n$${{x}} - {{y}} = ?$$',
    [var('a', '3..30'), var('c', '1..8'), var('b', '1..{{eval:a-1}}'), var('d', '1..9'),
     var('u', '{{eval:c+1}}..9'), var('x', 'eval:a+c/100;d'), var('y', 'eval:b+d/10+u/100;d')],
    ['{{eval:(100*a+c-100*b-10*d-u)/100;d}}'],
    [SOUSTRAIRE,
     '${{x}}$ a $0$ dixième et ${{c}}$ centième{{if:c>1|s|}} : pour ôter ${{u}}$ centièmes, on'
     ' échange $1$ unité contre $10$ dixièmes, puis $1$ dixième contre $10$ centièmes.',
     '$${{x}} - {{y}} = ' + col('{{solution}}') + '$$'],
    ['100*a+c>100*b+10*d+u'])

SPEC_SOUS = {'A': 152, 'B': 347, 'x': '15.2', 'y': '3.47'}
SPEC_SOUS_ENT = {'n': 10, 'M': 36, 'y': '3.6'}
SPEC_DEUX = {'a': 8, 'c': 3, 'b': 2, 'd': 7, 'u': 5, 'x': '8.03', 'y': '2.75'}
MODELES.append(modele(
    '02-soustraire-des-decimaux', 'Soustraire des nombres décimaux',
    'Différence de décimaux : premier terme plus court (15,2 − 3,47), entier moins décimal'
    ' (10 − 3,6), retenue sur deux rangs (8,03 − 2,75)',
    'Décimaux', 'Soustraire', 'Différence', 5,
    [SOUSTRACTION_LONGUEURS, SOUSTRACTION_ENTIER, SOUSTRACTION_DEUX_RANGS],
    [spec('15,2 − 3,47 = 11,73', 0, SPEC_SOUS, '11,73', 'correct'),
     spec('Erreur : petit chiffre ôté du grand (12,27)', 0, SPEC_SOUS, '12,27', 'incorrect'),
     spec('Erreur : retenue oubliée (11,83)', 0, SPEC_SOUS, '11,83', 'incorrect'),
     spec('10 − 3,6 = 6,4', 1, SPEC_SOUS_ENT, '6,4', 'correct'),
     spec('Erreur : retenue oubliée (7,4)', 1, SPEC_SOUS_ENT, '7,4', 'incorrect'),
     spec('Erreur : 7,6', 1, SPEC_SOUS_ENT, '7,6', 'incorrect'),
     spec('8,03 − 2,75 = 5,28', 2, SPEC_DEUX, '5,28', 'correct'),
     spec('Erreur : petit chiffre ôté du grand (6,72)', 2, SPEC_DEUX, '6,72', 'incorrect'),
     spec('Erreur : retenue des unités oubliée (6,28)', 2, SPEC_DEUX, '6,28', 'incorrect')]))

# --- 3. 6-116 : × 0,1 et ÷ 10 -------------------------------------------------------------

FACTEURS = ['0.1', '0.01', '0.001']
DIVISEURS = ['10', '100', '1~000']
LIEN = ('**Le lien.** $0.1$, c\'est un dixième : multiplier par $0.1$, c\'est prendre le dixième,'
        ' donc diviser par $10$. De même, $\\times 0.01$ revient à $\\div 100$, et $\\times 0.001$'
        ' à $\\div 1~000$.')

LIEN_CHOIX = variation(
    'Multiplier un nombre par $' + selon('k', FACTEURS, 1) + '$, c\'est :'
    + choix(['le diviser par $10$', 'le diviser par $100$', 'le diviser par $1~000$',
             'le multiplier par $10$', 'le multiplier par $100$']),
    [var('k', '1..3')],
    ['{{eval:k-1}}'],
    [LIEN,
     'Multiplier par $' + selon('k', FACTEURS, 1) + '$, c\'est ' + col('diviser par $'
     + selon('k', DIVISEURS, 1) + '$') + ' : chaque chiffre recule de ${{k}}$ rang{{if:k>1|s|}}'
     ' vers la droite.'])

LIEN_DIVISEUR = variation(
    'Complète.\n\n$${{n}} \\times ' + selon('k', FACTEURS, 1) + ' = {{n}} \\div ?$$',
    [var('k', '1..3'), var('N', '11..999'), var('n', 'eval:N/10;d')],
    ['{{eval:10^k}}'],
    [LIEN,
     '$$\\times ' + selon('k', FACTEURS, 1) + ' \\quad \\text{revient à} \\quad \\div '
     + col('{{solution}}') + '$$'])

LIEN_FACTEUR = variation(
    'Complète.\n\n$${{n}} \\div ' + selon('k', DIVISEURS, 1) + ' = {{n}} \\times ?$$',
    [var('k', '1..3'), var('N', '11..999'), var('n', 'eval:N/10;d')],
    ['{{eval:10^(-k);d}}'],
    [LIEN,
     '$$\\div ' + selon('k', DIVISEURS, 1) + ' \\quad \\text{revient à} \\quad \\times '
     + col('{{solution}}') + '$$'])

LIEN_CALCUL = variation(
    'Calcule.\n\n$${{n}} \\times ' + selon('k', FACTEURS, 1) + ' = ?$$',
    [var('k', '1..3'), var('n', '2..999')],
    ['{{eval:n/10^k;d}}'],
    [LIEN,
     '$${{n}} \\times ' + selon('k', FACTEURS, 1) + ' = {{n}} \\div ' + selon('k', DIVISEURS, 1)
     + ' = ' + col('{{solution}}') + '$$'],
    ['mod(n,10)!=0'])

MODELES.append(modele(
    '03-multiplier-par-0-1-diviser-par-10', "Multiplier par 0,1, c'est diviser par 10",
    'Lien entre × 0,1 / × 0,01 / × 0,001 et ÷ 10 / ÷ 100 / ÷ 1 000 : case choix, égalités à'
    ' compléter, calcul par la division',
    'Décimaux', 'Multiplier', 'Puissances de 10', 10,
    [LIEN_CHOIX, LIEN_DIVISEUR, LIEN_FACTEUR, LIEN_CALCUL],
    [spec('× 0,01 : diviser par 100', 0, {'k': 2}, '1', 'correct'),
     spec('Erreur : multiplier par 100', 0, {'k': 2}, '4', 'incorrect'),
     spec('37,5 × 0,1 = 37,5 ÷ 10', 1, {'k': 1, 'N': 375, 'n': '37.5'}, '10', 'correct'),
     spec('Erreur : 0,1', 1, {'k': 1, 'N': 375, 'n': '37.5'}, '0,1', 'incorrect'),
     spec('Erreur : un zéro de trop (100)', 1, {'k': 1, 'N': 375, 'n': '37.5'}, '100',
          'incorrect'),
     spec('4,5 ÷ 100 = 4,5 × 0,01', 2, {'k': 2, 'N': 45, 'n': '4.5'}, '0,01', 'correct'),
     spec('Erreur : 100', 2, {'k': 2, 'N': 45, 'n': '4.5'}, '100', 'incorrect'),
     spec('52 × 0,01 = 0,52', 3, {'k': 2, 'n': 52}, '0,52', 'correct'),
     spec('Erreur : multiplié par 100 (5 200)', 3, {'k': 2, 'n': 52}, '5\\,200', 'incorrect')]))

# --- 4. 6-117 : le produit de deux décimaux par l'aire ------------------------------------

AIRE_DM = variation(
    'Un rectangle mesure ${{x}}~\\text{dm}$ sur ${{y}}~\\text{dm}$. En centimètres, il mesure'
    ' ${{A}}~\\text{cm}$ sur ${{B}}~\\text{cm}$.\n\n'
    'Son aire en centimètres carrés :\n\n$${{A}} \\times {{B}} = ?~\\text{cm}^2$$\n\n'
    'Or $100~\\text{cm}^2 = 1~\\text{dm}^2$. Son aire en décimètres carrés :\n\n'
    '$${{x}} \\times {{y}} = ?~\\text{dm}^2$$',
    [var('A', '11..99'), var('B', '11..99'), var('x', 'eval:A/10;d'), var('y', 'eval:B/10;d')],
    ['{{eval:A*B}}', '{{eval:A*B/100;d}}'],
    ['**Aire d\'un rectangle.** Aire $=$ longueur $\\times$ largeur, les deux dans la même unité.',
     'En centimètres : ${{A}} \\times {{B}} = ' + col('{{eval:A*B}}') + '$ cm².',
     '$1~\\text{dm}^2 = 100~\\text{cm}^2$ : on divise par $100$. Donc ${{x}} \\times {{y}} = '
     + col('{{eval:A*B/100;d}}', 1) + '$ dm². Chaque facteur a $1$ chiffre après la virgule, le'
     ' produit en a $2$.'],
    ['mod(A,10)!=0', 'mod(B,10)!=0', 'A>B'])

AIRE_M = variation(
    'Un rectangle mesure $0.{{a}}~\\text{m}$ sur $0.{{b}}~\\text{m}$. En centimètres, il mesure'
    ' ${{eval:10*a}}~\\text{cm}$ sur ${{eval:10*b}}~\\text{cm}$.\n\n'
    'Son aire en centimètres carrés :\n\n$${{eval:10*a}} \\times {{eval:10*b}} = ?~\\text{cm}^2$$'
    '\n\nOr $10~000~\\text{cm}^2 = 1~\\text{m}^2$. Son aire en mètres carrés :\n\n'
    '$$0.{{a}} \\times 0.{{b}} = ?~\\text{m}^2$$',
    [var('a', '1..9'), var('b', '1..9')],
    ['{{eval:100*a*b}}', '{{eval:a*b/100;d}}'],
    ['**Aire d\'un rectangle.** Aire $=$ longueur $\\times$ largeur, les deux dans la même unité.',
     'En centimètres : ${{eval:10*a}} \\times {{eval:10*b}} = ' + col('{{eval:100*a*b}}')
     + '$ cm².',
     '$1~\\text{m}^2 = 10~000~\\text{cm}^2$ : on divise par $10~000$. Donc $0.{{a}} \\times 0.{{b}}'
     ' = ' + col('{{eval:a*b/100;d}}', 1) + '$ m² : le produit de deux nombres plus petits que'
     ' $1$ est plus petit que chacun d\'eux.'],
    ['a>b'])

SPEC_DM = {'A': 37, 'B': 29, 'x': '3.7', 'y': '2.9'}
MODELES.append(modele(
    '04-produit-de-decimaux-par-l-aire', "Un produit de décimaux par l'aire",
    "Sens du produit de deux décimaux par l'aire d'un rectangle et la conversion des unités"
    ' (3,7 dm × 2,9 dm ; 0,4 m × 0,3 m)',
    'Décimaux', 'Multiplier', 'Produit', 6, [AIRE_DM, AIRE_M],
    [spec('3,7 × 2,9 : 1 073 cm², 10,73 dm²', 0, SPEC_DM, ['1\\,073', '10,73'], 'correct'),
     spec('Erreur : virgule « comme dans l\'addition » (107,3)', 0, SPEC_DM, ['1\\,073', '107,3'],
          'incorrect'),
     spec('0,4 × 0,3 : 1 200 cm², 0,12 m²', 1, {'a': 4, 'b': 3}, ['1\\,200', '0,12'], 'correct'),
     spec('Erreur : 0,4 × 0,3 = 1,2', 1, {'a': 4, 'b': 3}, ['1\\,200', '1,2'], 'incorrect'),
     spec('Erreur : 120 cm²', 1, {'a': 4, 'b': 3}, ['120', '0,12'], 'incorrect')],
    delay=60))

# --- 5. 6-119 : contrôler par un ordre de grandeur ----------------------------------------

GRANDEUR = ('**Ordre de grandeur.** On remplace chaque nombre par un nombre proche, simple à'
            ' calculer de tête : le résultat exact doit en être proche.')

GRANDEUR_PRODUIT = variation(
    'Sans poser le calcul, quel est le résultat de ${{a}} \\times {{b}}$ ?'
    + choix(['${{eval:P/1000;d}}$', '${{eval:P/100;d}}$', '${{eval:P/10;d}}$']),
    [var('A', '101..999'), var('B', '11..99'), var('a', 'eval:A/10;d'), var('b', 'eval:B/10;d'),
     var('P', 'eval:A*B')],
    ['1'],
    [GRANDEUR,
     '${{a}} \\approx {{eval:round(A/10)}}$ et ${{b}} \\approx {{eval:round(B/10)}}$, donc'
     ' ${{a}} \\times {{b}} \\approx {{eval:round(A/10)*round(B/10)}}$.',
     'Le seul résultat proche est $' + col('{{eval:P/100;d}}') + '$.'],
    ['mod(A,10)!=0', 'mod(B,10)!=0', 'mod(P,10)!=0'])

GRANDEUR_SOMME = variation(
    'Sans poser le calcul, quel est le résultat de ${{a}} + {{b}}$ ?'
    + choix(['${{eval:S/1000;d}}$', '${{eval:S/100;d}}$', '${{eval:S/10;d}}$']),
    [var('A', '1001..9999'), var('B', '1001..9999'), var('a', 'eval:A/10;d'),
     var('b', 'eval:B/100;d'), var('S', 'eval:10*A+B')],
    ['1'],
    [GRANDEUR,
     '${{a}} \\approx {{eval:round(A/10)}}$ et ${{b}} \\approx {{eval:round(B/100)}}$, donc'
     ' ${{a}} + {{b}} \\approx {{eval:round(A/10)+round(B/100)}}$.',
     'Le seul résultat proche est $' + col('{{eval:S/100;d}}') + '$.'],
    ['mod(A,10)!=0', 'mod(B,10)!=0', 'mod(S,10)!=0'])

GRANDEUR_ORDRE = variation(
    'Quel est un ordre de grandeur de ${{a}} \\times {{n}}$ ?'
    + choix(['${{eval:10*p*q}}$', '${{eval:100*p*q}}$', '${{eval:1000*p*q}}$']),
    [var('p', '2..9'), var('dl', '-9..9'), var('A', 'eval:100*p+dl'), var('a', 'eval:A/10;d'),
     var('q', '1..9'), var('el', '-2..2'), var('n', 'eval:10*q+el')],
    ['1'],
    [GRANDEUR,
     '${{a}} \\approx {{eval:10*p}}$ et ${{n}} \\approx {{eval:10*q}}$, donc ${{a}} \\times {{n}}'
     ' \\approx {{eval:10*p}} \\times {{eval:10*q}} = ' + col('{{eval:100*p*q}}') + '$.'],
    ['dl!=0', 'el!=0'])

MODELES.append(modele(
    '05-controler-par-un-ordre-de-grandeur', 'Contrôler par un ordre de grandeur',
    'Choisir le bon résultat d\'un produit ou d\'une somme de décimaux (mêmes chiffres, virgule'
    ' déplacée) ; choisir un ordre de grandeur d\'un produit',
    'Décimaux', 'Apprivoiser', 'Arrondir', 3,
    [GRANDEUR_PRODUIT, GRANDEUR_SOMME, GRANDEUR_ORDRE],
    [spec('48,7 × 3,1 = 150,97', 0, {'A': 487, 'B': 31, 'a': '48.7', 'b': '3.1', 'P': 15097}, '1',
          'correct'),
     spec('Erreur : 15,097', 0, {'A': 487, 'B': 31, 'a': '48.7', 'b': '3.1', 'P': 15097}, '0',
          'incorrect'),
     spec('398,6 + 51,25 = 449,85', 1,
          {'A': 3986, 'B': 5125, 'a': '398.6', 'b': '51.25', 'S': 44985}, '1', 'correct'),
     spec('Erreur : 4 498,5', 1, {'A': 3986, 'B': 5125, 'a': '398.6', 'b': '51.25', 'S': 44985},
          '2', 'incorrect'),
     spec('49,8 × 21 ≈ 1 000', 2,
          {'p': 5, 'dl': -2, 'A': 498, 'a': '49.8', 'q': 2, 'el': 1, 'n': 21}, '1', 'correct'),
     spec('Erreur : 10 000', 2,
          {'p': 5, 'dl': -2, 'A': 498, 'a': '49.8', 'q': 2, 'el': 1, 'n': 21}, '2',
          'incorrect')]))

# --- 6. 6-120 : problèmes de produits -----------------------------------------------------

PRIX_KILO = variation(
    'Au marché, les {{if:f==0|pommes coûtent|{{if:f==1|poires coûtent|cerises coûtent}}}} $'
    + euros('pk') + EURO + '$ le kilogramme. Léa en achète ${{m}}~\\text{kg}$. Combien'
    ' paie-t-elle ?\n\n$$?' + EURO + '$$',
    [var('f', '0..2'), var('k', '12..59'), var('pk', 'eval:10*k'), var('M', '11..49'),
     var('m', 'eval:M/10;d')],
    ['{{eval:M*k/100;d}}'],
    ['**Prix à payer** $=$ masse $\\times$ prix d\'un kilogramme.',
     '$${{m}} \\times ' + euros('pk') + ' = ' + col(euros('(M*k)')) + '$$',
     'Léa paie $' + col(euros('(M*k)')) + EURO + '$.'],
    ['mod(k,10)!=0', 'mod(M,10)!=0'])

PLEIN = variation(
    'Le litre d\'essence coûte $' + euros('P') + EURO + '$. Malik met ${{L}}$ litres dans sa'
    ' voiture. Combien paie-t-il ?\n\n$$?' + EURO + '$$',
    [var('P', '160..199'), var('L', '20..50')],
    ['{{eval:L*P/100;d}}'],
    ['**Prix à payer** $=$ nombre de litres $\\times$ prix d\'un litre.',
     '$${{L}} \\times ' + euros('P') + ' = ' + col(euros('(L*P)')) + '$$',
     'Ordre de grandeur : ${{L}} \\times 2 = {{eval:2*L}}$ ; le résultat est un peu moins.'],
    ['mod(P,10)!=0'])

MOINS_D_UN_KILO = variation(
    'Le fromage coûte $' + euros('pk') + EURO + '$ le kilogramme. Inès en achète'
    ' $0.{{m}}~\\text{kg}$. Combien paie-t-elle ?\n\n$$?' + EURO + '$$',
    [var('k', '12..99'), var('pk', 'eval:10*k'), var('m', '2..9')],
    ['{{eval:m*k/100;d}}'],
    ['**Prix à payer** $=$ masse $\\times$ prix d\'un kilogramme, même quand la masse est plus'
     ' petite que $1$ kg.',
     '$$0.{{m}} \\times ' + euros('pk') + ' = ' + col(euros('(m*k)')) + '$$',
     'Elle achète moins d\'un kilogramme : elle paie moins que $' + euros('pk') + EURO + '$.'],
    ['mod(k,10)!=0'])

SPEC_KILO = {'f': 0, 'k': 35, 'pk': 350, 'M': 24, 'm': '2.4'}
SPEC_PLEIN = {'P': 185, 'L': 35}
SPEC_FROMAGE = {'k': 45, 'pk': 450, 'm': 6}
MODELES.append(modele(
    '06-problemes-de-produits-decimaux', 'Problèmes de produits décimaux',
    'Prix à payer : masse × prix au kilo (2,4 kg à 3,50 €), litres × prix du litre, masse'
    ' inférieure à 1 kg (le produit est plus petit)',
    'Décimaux', 'Problèmes', 'Multiplication', 1, [PRIX_KILO, PLEIN, MOINS_D_UN_KILO],
    [spec('2,4 kg à 3,50 € : 8,4 €', 0, SPEC_KILO, '8,4', 'correct'),
     spec('8,40 € accepté', 0, SPEC_KILO, '8,40', 'correct'),
     spec('Erreur : addition (5,9)', 0, SPEC_KILO, '5,9', 'incorrect'),
     spec('Erreur : virgule (84)', 0, SPEC_KILO, '84', 'incorrect'),
     spec('35 L à 1,85 € : 64,75 €', 1, SPEC_PLEIN, '64,75', 'correct'),
     spec('Erreur : virgule (647,5)', 1, SPEC_PLEIN, '647,5', 'incorrect'),
     spec('0,6 kg à 4,50 € : 2,7 €', 2, SPEC_FROMAGE, '2,7', 'correct'),
     spec('2,70 € accepté', 2, SPEC_FROMAGE, '2,70', 'correct'),
     spec('Erreur : 27', 2, SPEC_FROMAGE, '27', 'incorrect'),
     spec('Erreur : addition (5,1)', 2, SPEC_FROMAGE, '5,1', 'incorrect')],
    delay=60, options=SANS_ZEROS))

# --- 7. 6-121 : diviser un décimal par un entier < 10 -------------------------------------

DIVISER = ('**Diviser un décimal par un entier.** On divise comme pour les entiers ; on place la'
           ' virgule au quotient quand on abaisse le premier chiffre après la virgule. Si la'
           ' division n\'est pas finie, on ajoute des zéros après la virgule et on continue.')

DIVISION_FINIE = variation(
    'Calcule.\n\n$${{x}} \\div {{d}} = ?$$',
    [var('d', '2..9'), var('Q', '11..999'), var('x', 'eval:d*Q/100;d')],
    ['{{eval:Q/100;d}}'],
    [DIVISER,
     'Vérification : ${{d}} \\times ' + col('{{solution}}') + ' = {{x}}$.'],
    ['mod(Q,10)!=0', 'mod(d*Q,100)!=0'])

DIVISION_ENTIERS = variation(
    'Calcule. Le quotient est un nombre décimal.\n\n$${{n}} \\div {{d}} = ?$$',
    [var('sd', '0..3'), var('d', selon('sd', ['2', '4', '5', '8'])), var('n', '3..99')],
    ['{{eval:n/d;d}}'],
    [DIVISER,
     '${{n}} = {{d}} \\times {{eval:floor(n/d)}} + {{eval:mod(n,d)}}$ : le reste n\'est pas nul,'
     ' on continue après la virgule ($' + '{{n}}.000' + '$).',
     '$${{n}} \\div {{d}} = ' + col('{{solution}}') + '$$'],
    ['mod(n,d)!=0'])

DIVISION_INFINIE = variation(
    'Donne la valeur arrondie au centième du quotient.\n\n$${{n}} \\div {{d}} \\approx ?$$',
    [var('sd', '0..2'), var('d', selon('sd', ['3', '6', '9'])), var('n', '2..99'),
     var('h', 'eval:mod(floor(1000*n/d),10)')],
    ['{{eval:round(100*n/d)/100;d}}'],
    [DIVISER,
     '${{n}} \\div {{d}} = {{eval:floor(1000*n/d)/1000;d}}\\ldots$ La division ne s\'arrête'
     ' jamais : on calcule jusqu\'aux millièmes.',
     'Le chiffre des millièmes est $' + col('{{h}}', 1) + '$ : {{if:h>=5|on arrondit'
     ' au-dessus|on garde le chiffre des centièmes}}.',
     '$${{n}} \\div {{d}} \\approx ' + col('{{solution}}') + '$$'],
    ['mod(1000*n,d)!=0'])

MODELES.append(modele(
    '07-diviser-un-decimal-par-un-entier', 'Diviser un décimal par un entier',
    'Quotient d\'un décimal par un entier de 2 à 9 (division finie), d\'un entier par 2, 4, 5,'
    ' 8 (quotient décimal), arrondi au centième d\'une division qui ne s\'arrête pas (10 ÷ 3,'
    ' 73 ÷ 6)',
    'Décimaux', 'Diviser', 'Quotient', 8,
    [DIVISION_FINIE, DIVISION_ENTIERS, DIVISION_INFINIE],
    [spec('6,15 ÷ 3 = 2,05', 0, {'d': 3, 'Q': 205, 'x': '6.15'}, '2,05', 'correct'),
     spec('Erreur : zéro oublié (2,5)', 0, {'d': 3, 'Q': 205, 'x': '6.15'}, '2,5', 'incorrect'),
     spec('9 ÷ 4 = 2,25', 1, {'sd': 1, 'd': 4, 'n': 9}, '2,25', 'correct'),
     spec('Erreur : le reste pris pour les décimales (2,1)', 1, {'sd': 1, 'd': 4, 'n': 9}, '2,1',
          'incorrect'),
     spec('10 ÷ 3 ≈ 3,33', 2, {'sd': 0, 'd': 3, 'n': 10, 'h': 3}, '3,33', 'correct'),
     spec('73 ÷ 6 ≈ 12,17', 2, {'sd': 1, 'd': 6, 'n': 73, 'h': 6}, '12,17', 'correct'),
     spec('Erreur : troncature (12,16)', 2, {'sd': 1, 'd': 6, 'n': 73, 'h': 6}, '12,16',
          'incorrect'),
     spec('Erreur : le reste pris pour les décimales (12,1)', 2,
          {'sd': 1, 'd': 6, 'n': 73, 'h': 6}, '12,1', 'incorrect')]))

# --- 8. 6-122 : problèmes de partage ------------------------------------------------------

PARTAGE_SOMME = variation(
    '${{n}}$ amis partagent {{if:o==0|un gain de|une cagnotte de}} $' + euros('C') + EURO
    + '$ en parts égales. Combien chacun reçoit-il ?\n\n$$?' + EURO + '$$',
    [var('o', '0..1'), var('n', '2..9'), var('j', '20..400'), var('P', 'eval:5*j'),
     var('C', 'eval:n*P')],
    ['{{eval:P/100;d}}'],
    ['**Partager en parts égales**, c\'est diviser : part $=$ somme $\\div$ nombre de parts.',
     '$$' + euros('C') + ' \\div {{n}} = ' + col(euros('P')) + '$$',
     'Vérification : ${{n}} \\times ' + euros('P') + ' = ' + euros('C') + '$.'],
    ['mod(C,10)!=0'])

PARTAGE_RUBAN = variation(
    'On coupe un ruban de ${{L}}~\\text{m}$ en ${{n}}$ morceaux de même longueur. Quelle est la'
    ' longueur d\'un morceau ?\n\n$$?~\\text{m}$$',
    [var('n', '2..9'), var('Q', '11..150'), var('L', 'eval:n*Q/100;d')],
    ['{{eval:Q/100;d}}'],
    ['**Partager en parts égales**, c\'est diviser : longueur d\'un morceau $=$ longueur du ruban'
     ' $\\div$ nombre de morceaux.',
     '$${{L}} \\div {{n}} = ' + col('{{solution}}') + '$$',
     'Vérification : ${{n}} \\times {{solution}} = {{L}}$.'],
    ['mod(n*Q,100)!=0'])

PRIX_UNITAIRE = variation(
    '${{n}}$ {{if:o==0|cahiers identiques coûtent|stylos identiques coûtent}} $' + euros('C')
    + EURO + '$. Combien coûte un {{if:o==0|cahier|stylo}} ?\n\n$$?' + EURO + '$$',
    [var('o', '0..1'), var('n', '2..9'), var('j', '10..80'), var('P', 'eval:5*j'),
     var('C', 'eval:n*P')],
    ['{{eval:P/100;d}}'],
    ['**Prix d\'un objet** $=$ prix total $\\div$ nombre d\'objets.',
     '$$' + euros('C') + ' \\div {{n}} = ' + col(euros('P')) + '$$',
     'Vérification : ${{n}} \\times ' + euros('P') + ' = ' + euros('C') + '$.'])

SPEC_PART = {'o': 0, 'n': 3, 'j': 149, 'P': 745, 'C': 2235}
SPEC_RUBAN = {'n': 6, 'Q': 70, 'L': '4.2'}
SPEC_CAHIER = {'o': 0, 'n': 4, 'j': 38, 'P': 190, 'C': 760}
MODELES.append(modele(
    '08-problemes-de-partage-decimal', 'Problèmes de partage décimal',
    'Diviser une somme, une longueur, un prix total par un entier d\'un chiffre (22,35 € entre'
    ' 3 ; 4,2 m en 6 ; 4 cahiers pour 7,60 €)',
    'Décimaux', 'Problèmes', 'Division', 1, [PARTAGE_SOMME, PARTAGE_RUBAN, PRIX_UNITAIRE],
    [spec('22,35 € entre 3 : 7,45 €', 0, SPEC_PART, '7,45', 'correct'),
     spec('Erreur : multiplié (67,05)', 0, SPEC_PART, '67,05', 'incorrect'),
     spec('Erreur : 7,4 (centimes oubliés)', 0, SPEC_PART, '7,4', 'incorrect'),
     spec('4,2 m en 6 : 0,7 m', 1, SPEC_RUBAN, '0,7', 'correct'),
     spec('Erreur : 7', 1, SPEC_RUBAN, '7', 'incorrect'),
     spec('Erreur : 0,07', 1, SPEC_RUBAN, '0,07', 'incorrect'),
     spec('7,60 € pour 4 : 1,90 €', 2, SPEC_CAHIER, '1,90', 'correct'),
     spec('1,9 € accepté', 2, SPEC_CAHIER, '1,9', 'correct'),
     spec('Erreur : 1,15 (7 ÷ 4 = 1 reste 3, puis 60 ÷ 4)', 2, SPEC_CAHIER, '1,15',
          'incorrect')],
    delay=60, options=SANS_ZEROS))

# --- 9. 6-123 : poser une division euclidienne --------------------------------------------

EUCLIDE = ('**Division euclidienne.** Diviser $N$ par $d$, c\'est trouver le quotient $q$ et le'
           ' reste $r$ tels que $N = (d \\times q) + r$, avec un reste plus petit que $d$.')


def posee(variables, conditions):
    return variation(
        'Pose et effectue la division euclidienne.\n\n```operation\ncalcul: {{N}} ÷ {{d}}\n```',
        variables, None,
        [EUCLIDE,
         '$${{N}} = ({{d}} \\times ' + col('{{q}}') + ') + ' + col('{{r}}', 1) + '$$',
         'Le quotient est $' + col('{{q}}') + '$, le reste $' + col('{{r}}', 1) + '$, plus petit'
         ' que ${{d}}$.'],
        conditions)


POSEE_UN_CHIFFRE = posee(
    [var('d', '3..9'), var('q', '21..999'), var('r', '0..{{eval:d-1}}'),
     var('N', 'eval:d*q+r')],
    ['N<=9999', 'mod(q,10)!=0'])
POSEE_DEUX_CHIFFRES = posee(
    [var('d', '11..99'), var('q', '6..99'), var('r', '1..{{eval:d-1}}'),
     var('N', 'eval:d*q+r')],
    ['N<=9999', 'mod(d,10)!=0'])
# Un 0 au quotient (618 ÷ 3 = 206) : chiffre des dizaines du quotient nul
POSEE_ZERO = posee(
    [var('d', '2..9'), var('a', '1..9'), var('b', '1..9'), var('q', 'eval:100*a+b'),
     var('r', '0..{{eval:d-1}}'), var('N', 'eval:d*q+r')],
    None)

MODELES.append(modele(
    '09-poser-une-division-euclidienne', 'Poser une division euclidienne',
    'Division euclidienne posée (quotient et reste) : diviseur à un chiffre, à deux chiffres'
    ' (295 ÷ 18), un 0 au quotient (618 ÷ 3)',
    'Entiers', 'Diviser', 'Division euclidienne', 5,
    [POSEE_UN_CHIFFRE, POSEE_DEUX_CHIFFRES, POSEE_ZERO],
    [spec('1 357 ÷ 6 = 226 reste 1', 0, {'d': 6, 'q': 226, 'r': 1, 'N': 1357}, ['226', '1'],
          'correct'),
     spec('Erreur : reste trop grand (225 reste 7)', 0, {'d': 6, 'q': 226, 'r': 1, 'N': 1357},
          ['225', '7'], 'incorrect'),
     spec('295 ÷ 18 = 16 reste 7', 1, {'d': 18, 'q': 16, 'r': 7, 'N': 295}, ['16', '7'],
          'correct'),
     spec('Erreur : 15 reste 25', 1, {'d': 18, 'q': 16, 'r': 7, 'N': 295}, ['15', '25'],
          'incorrect'),
     spec('618 ÷ 3 = 206 reste 0', 2, {'d': 3, 'a': 2, 'b': 6, 'q': 206, 'r': 0, 'N': 618},
          ['206', '0'], 'correct'),
     spec('Erreur : zéro oublié (26)', 2, {'d': 3, 'a': 2, 'b': 6, 'q': 206, 'r': 0, 'N': 618},
          ['26', '0'], 'incorrect')],
    delay=120))

# --- 10. 6-124 : problèmes de division euclidienne ----------------------------------------

BOITES = variation(
    'On range ${{N}}$ œufs dans des boîtes de ${{d}}$. Combien de boîtes pleines'
    ' obtient-on ? Combien d\'œufs reste-t-il ?\n\n'
    '$$?~\\text{boîtes pleines et}~?~\\text{œufs restants}$$',
    [var('sd', '0..3'), var('d', selon('sd', ['6', '10', '12', '30'])), var('q', '5..40'),
     var('r', '1..{{eval:d-1}}'), var('N', 'eval:d*q+r')],
    ['{{q}}', '{{r}}'],
    [EUCLIDE,
     '$${{N}} = ({{d}} \\times ' + col('{{q}}') + ') + ' + col('{{r}}', 1) + '$$',
     'On obtient $' + col('{{q}}') + '$ boîtes pleines et il reste $' + col('{{r}}', 1)
     + '$ œuf{{if:r>1|s|}}.'],
    ['N<1000'])

CARS = variation(
    '${{E}}$ élèves partent en sortie. Un car a ${{c}}$ places. Combien de cars faut-il, au'
    ' minimum, pour transporter tous les élèves ?\n\n$$?~\\text{cars}$$',
    [var('c', '30..60'), var('q', '2..9'), var('r', '1..{{eval:c-1}}'),
     var('E', 'eval:c*q+r')],
    ['{{eval:q+1}}'],
    [EUCLIDE,
     '$${{E}} = ({{c}} \\times {{q}}) + ' + col('{{r}}', 1) + '$$',
     '${{q}}$ cars pleins ne suffisent pas : il reste ${{r}}$ élève{{if:r>1|s|}}. Il faut un car'
     ' de plus : $' + col('{{solution}}') + '$ cars.'])

DUREES = ['jours', 'heures', 'minutes']
GRANDES = ['semaines', 'jours', 'heures']
PAR = ['7', '24', '60']
CONVERSION = variation(
    'Complète.\n\n$${{N}}~\\text{' + selon('s', DUREES) + '} = ?~\\text{' + selon('s', GRANDES)
    + '}~?~\\text{' + selon('s', DUREES) + '}$$',
    [var('s', '0..2'), var('d', selon('s', PAR)), var('q', '2..40'),
     var('r', '1..{{eval:d-1}}'), var('N', 'eval:d*q+r')],
    ['{{q}}', '{{r}}'],
    ['Une ' + selon('s', ['semaine', 'journée', 'heure']) + ' compte ${{d}}$ '
     + selon('s', DUREES) + ' : on fait la division euclidienne de ${{N}}$ par ${{d}}$.',
     '$${{N}} = ({{d}} \\times ' + col('{{q}}') + ') + ' + col('{{r}}', 1) + '$$',
     '$${{N}}~\\text{' + selon('s', DUREES) + '} = ' + col('{{q}}') + '~\\text{'
     + selon('s', GRANDES) + '}~' + col('{{r}}', 1) + '~\\text{'
     + selon('s', ['jour', 'heure', 'minute']) + '{{if:r>1|s|}}}$$'])

SPEC_OEUFS = {'sd': 2, 'd': 12, 'q': 24, 'r': 7, 'N': 295}
SPEC_CARS = {'c': 45, 'q': 5, 'r': 5, 'E': 230}
SPEC_JOURS = {'s': 0, 'd': 7, 'q': 21, 'r': 3, 'N': 150}
MODELES.append(modele(
    '10-problemes-de-division-euclidienne', 'Problèmes de division euclidienne',
    'Interpréter le quotient et le reste : boîtes pleines et reste, nombre de cars (un de plus'
    ' pour le reste), jours en semaines et jours, heures en jours, minutes en heures',
    'Entiers', 'Problèmes', 'Division euclidienne', 1, [BOITES, CARS, CONVERSION],
    [spec('295 œufs, boîtes de 12 : 24 et 7', 0, SPEC_OEUFS, ['24', '7'], 'correct'),
     spec('Erreur : quotient et reste échangés', 0, SPEC_OEUFS, ['7', '24'], 'incorrect'),
     spec('Erreur : quotient décimal (24,58)', 0, SPEC_OEUFS, ['24,58', '7'], 'incorrect'),
     spec('230 élèves, 45 places : 6 cars', 1, SPEC_CARS, '6', 'correct'),
     spec('Erreur : le reste oublié (5)', 1, SPEC_CARS, '5', 'incorrect'),
     spec('Erreur : quotient décimal (5,1)', 1, SPEC_CARS, '5,1', 'incorrect'),
     spec('150 jours = 21 semaines 3 jours', 2, SPEC_JOURS, ['21', '3'], 'correct'),
     spec('Erreur : 21,4 semaines', 2, SPEC_JOURS, ['21,4', '0'], 'incorrect'),
     spec('150 min = 2 h 30 min', 2, {'s': 2, 'd': 60, 'q': 2, 'r': 30, 'N': 150},
          ['2', '30'], 'correct')],
    delay=60))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
