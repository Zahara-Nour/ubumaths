"""Écrit les 7 modèles du lot 11b « Triangles, symétrie, périmètres » de la 6e dans
scripts/questions/6-triangles-symetrie-perimetres/.

Phase 0 validée par David le 2026-11-09 (§ 26 du journal `docs/wip/questions-6-progress.md`,
« je suis tes recos ») : 174 à 179 et 148 ; 148 avec π ≈ 3,14 et résultat au dixième. Bornes :
`cycle3.json`, 6e (176 : somme 180°, équilatéral 60°, isocèle : les trois angles à partir d'un
seul ; 148 : contours de segments, cercles ou portions de cercles). Le nœud et le tag sont posés par
la migration de rangement, après le `--publier` de David.

Niveau (`level`, ordre dans la rubrique) : le plus petit de la plage de la phase 0, comme au 11a ;
aucun modèle de 6e n'est encore rangé sur « triangles », « Symétrie axiale » ni « Périmètres ».

Décisions et pièges :
- triangles dessinés à l'échelle : base [BC] horizontale, sommet A = intersection des deux côtés
  tournés des angles de la base (droites masquées) ; mesures écrites par `texte` au milieu de
  l'angle (point masqué tourné de la moitié de l'angle) ; 176 (« figure à main levée ») : triangle
  en `rendu="croquis"` ;
- `eval:` ne connaît ni `==` ni `>` : indicatrices de Lagrange (`lag`) ; bonne réponse d'un choix
  toujours par une variable ;
- décimaux (178, 148) : `shared.blankDefaults.acceptDecimal` ; arrondi au dixième par
  `floor(10*x+0.5)/10` (`round(…, 1)` est refusé par `eval`) ;
- le nom `A'` n'est pas un identifiant du langage de figure : point `Ap` sans étiquette, `texte`.

    python3 docs/wip/questions/lot-11b-triangles-symetrie-perimetres.py scripts/questions
"""
import json
import math
import os
import subprocess
import sys

RACINE = sys.argv[1]
DOSSIER = os.path.join(RACINE, '6-triangles-symetrie-perimetres')


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(nom, title, description, level, variations, specs, delay=60, decimal=False):
    m = {'title': title, 'description': description, 'grades': ['6'], 'level': level,
         'delay': delay, 'status': 'draft'}
    if decimal:
        m['shared'] = {'blankDefaults': {'acceptDecimal': True}}
    m['variations'] = variations
    m['testSpecs'] = specs
    return nom, m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    if answers:
        v['blanks'] = [{'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def colt(x):
    """Mot coloré dans une phrase (hors des $…$)."""
    return '$' + col('\\text{' + x + '}') + '$'


def choix(lignes, plusieurs=False, melanger=True):
    tete = ''
    if plusieurs:
        tete += 'plusieurs: oui\n'
    if not melanger:
        tete += 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + l + '\n' for l in lignes) + '```'


def si(cond, oui, non):
    return '{{if:' + cond + '|' + oui + '|' + non + '}}'


def si3(v, a, b, c):
    """Texte selon v ∈ {1, 2, 3}."""
    return si(v + '==1', a, si(v + '==2', b, c))


def lag(v, valeurs):
    """Expression qui vaut valeurs[i - 1] quand v == i (v ∈ 1..n), par indicatrices de Lagrange."""
    n = len(valeurs)
    termes = []
    for i in range(1, n + 1):
        if valeurs[i - 1] == 0:
            continue
        num = '*'.join('(' + v + '-' + str(j) + ')' for j in range(1, n + 1) if j != i)
        den = 1
        for j in range(1, n + 1):
            if j != i:
                den *= (i - j)
        termes.append('(' + str(valeurs[i - 1]) + ')*' + num + '/(' + str(den) + ')')
    return '+'.join(termes) if termes else '0'


def figure(fenetre, description, lignes):
    return ('\n\n```figure\nfenetre: ' + fenetre + '\ndescription: ' + description + '\n---\n'
            + '\n'.join(lignes) + '\n```\n\n')


def deg(x):
    return x + '^\\circ'


def angle_hat(nom):
    return '\\widehat{' + nom + '}'


def cm(x):
    return x + '~\\unit{cm}'


def n(x):
    x = x + 0.0
    if abs(x - round(x)) < 1e-9:
        return str(int(round(x)))
    return str(round(x, 3))


# --- Triangle à l'échelle sur la base [BC] ---------------------------------------------------------

def triangle(largeur, b, c, etiquettes, croquis=False, marques=None, droit_en_b=False):
    """Triangle ABC, B = (0, 0), C = (largeur, 0), angles de la base b (en B) et c (en C) : deux
    expressions de variables (`b`, `90-r`). `etiquettes` : {sommet: texte} écrit dans l'angle."""
    style = ', rendu="croquis"' if croquis else ''
    lignes = ['B = point(0, 0, etiquette="bas-gauche")',
              'C = point(' + n(largeur) + ', 0, etiquette="bas-droite")',
              'P = rotation(C, angle={{eval:' + b + '}}, centre=B, visible=faux)',
              'Q = rotation(B, angle={{eval:-(' + c + ')}}, centre=C, visible=faux)',
              'd1 = droite(B, P, visible=faux)', 'd2 = droite(C, Q, visible=faux)',
              'A = intersection(d1, d2, etiquette="haut")',
              'polygone(A, B, C, couleur="noir", epaisseur=2' + style + ')']
    for s, t in (marques or []):
        lignes.append('marque_segment(' + s + ', ' + t + ')')
    if droit_en_b:
        lignes.append('angle(C, B, A, marque="carre")')
    hb, hc = 1.4, largeur - 1.4
    lignes += ['HB = point(' + n(hb) + ', 0, visible=faux)',
               'HC = point(' + n(hc) + ', 0, visible=faux)']
    if 'B' in etiquettes:
        if not droit_en_b:
            lignes.append('angle(C, B, A)')
        lignes += ['TB = rotation(HB, angle={{eval:(' + b + ')/2;d}}, centre=B,'
                   ' visible=faux)', 'texte(TB, "' + etiquettes['B'] + '", dx=0, dy=0, ancre="centre")']
    if 'C' in etiquettes:
        lignes += ['angle(A, C, B)',
                   'TC = rotation(HC, angle={{eval:-(' + c + ')/2;d}}, centre=C,'
                   ' visible=faux)', 'texte(TC, "' + etiquettes['C'] + '", dx=0, dy=0, ancre="centre")']
    if 'A' in etiquettes:
        lignes += ['angle(B, A, C)', 'HA = point(A, longueur=1.7, direction=B, visible=faux)',
                   'TA = rotation(HA, angle={{eval:(180-(' + b + ')-(' + c + '))/2;d}}, centre=A,'
                   ' visible=faux)', 'texte(TA, "' + etiquettes['A'] + '", dx=0, dy=0, ancre="centre")']
    return lignes


def haut(largeur, b, c):
    """Haut de la fenêtre : hauteur du triangle (sommet A) plus une marge, calculée par `eval`."""
    def t(x):
        return 'tan((' + x + ')*\\pi/180)'
    if b == '90':
        h = n(largeur) + '*' + t(c)
    else:
        h = n(largeur) + '*' + t(b) + '*' + t(c) + '/(' + t(b) + '+' + t(c) + ')'
    return '{{eval:floor(10*(' + h + '+1.3))/10;d}}'


MODELES = []

# --- 7. 6-174 : propriétés angulaires des triangles particuliers -----------------------------------
# v1 : isocèle en A codé, angle en B écrit → angle en C ; v2 : équilatéral codé → chaque angle ;
# v3 : « deux angles égaux » / « trois angles égaux » → quel triangle ; v4 : rectangle en B, angle
# en C écrit → angle en A (90 − c). Hauteurs : 3·tan(b) ≤ 8,3 pour b ≤ 70.

FIG_174_1 = figure(
    '-1.5 ; 7.5 ; -1 ; ' + haut(6, 'b', 'b'),
    'Un triangle ABC isocèle en A (AB = AC codés) ; l\'angle en B mesure {{b}} degrés, l\'angle en C'
    ' est marqué d\'un point d\'interrogation.',
    triangle(6, 'b', 'b', {'B': '{{b}}°', 'C': '?'}, marques=[('A', 'B'), ('A', 'C')]))
FIG_174_2 = figure(
    '-1.5 ; 7.5 ; -1 ; 6.5',
    'Un triangle ABC équilatéral, ses trois côtés codés égaux.',
    triangle(6, '60', '60', {}, marques=[('A', 'B'), ('A', 'C'), ('B', 'C')]))
# v4 : rectangle en B : P tourné de 90 ; l'angle en C vaut c, A est au-dessus de B.
FIG_174_4 = figure(
    '-1.5 ; 7 ; -1 ; ' + haut(5, '90', 'c'),
    'Un triangle ABC rectangle en B ; l\'angle en C mesure {{c}} degrés, l\'angle en A est marqué'
    ' d\'un point d\'interrogation.',
    triangle(5, '90', 'c', {'C': '{{c}}°', 'A': '?'}, droit_en_b=True))

MODELES.append(modele(
    '07-angles-des-triangles-particuliers', 'Les angles des triangles particuliers',
    'Triangle isocèle : deux angles de même mesure ; triangle équilatéral : trois angles de 60° ;'
    ' triangle rectangle : les deux angles aigus ont pour somme 90°',
    1,
    [variation('Le triangle $ABC$ est isocèle en $A$.' + FIG_174_1 + 'Combien mesure l\'angle $'
               + angle_hat('ACB') + '$ ?\n\n$' + angle_hat('ACB') + ' = ' + deg('?') + '$',
               [var('b', '30..70')], ['{{b}}'],
               ['**Triangle isocèle** : ses deux angles **à la base** ont la même mesure. Ici, la'
                ' base est $[BC]$ (le côté opposé au sommet $A$).',
                '$' + angle_hat('ACB') + ' = ' + angle_hat('ABC') + ' = ' + col(deg('{{b}}'))
                + '$.']),
     variation('Le triangle $ABC$ est équilatéral.' + FIG_174_2 + 'Combien mesure chacun de ses'
               ' angles ?\n\n$' + deg('?') + '$',
               [], ['60'],
               ['**Triangle équilatéral** : ses trois angles ont la même mesure, et leur somme vaut'
                ' $' + deg('180') + '$.',
                '$180 \\div 3 = 60$ : chaque angle mesure $' + col(deg('60')) + '$.']),
     variation('Un triangle a **' + si('k==1', 'deux', 'trois') + ' angles de même mesure**.'
               ' Que peut-on dire de ce triangle ?'
               + choix(['il est isocèle', 'il est équilatéral', 'il est rectangle'],
                       melanger=False),
               [var('k', '1..2'), var('j', 'eval:k-1')], ['{{j}}'],
               ['Un triangle qui a **deux** angles de même mesure est **isocèle** ; un triangle'
                ' qui a ses **trois** angles de même mesure ($' + deg('60') + '$ chacun) est'
                ' **équilatéral**.',
                'Ce triangle est ' + si('k==1', colt('isocèle'), colt('équilatéral')) + '.']),
     variation('Le triangle $ABC$ est rectangle en $B$.' + FIG_174_4 + 'Combien mesure l\'angle $'
               + angle_hat('BAC') + '$ ?\n\n$' + angle_hat('BAC') + ' = ' + deg('?') + '$',
               [var('c', '25..60')], ['{{eval:90-c}}'],
               ['**Triangle rectangle** : l\'angle droit mesure $' + deg('90') + '$, donc les deux'
                ' autres angles ont pour somme $180 - 90 = ' + deg('90') + '$.',
                '$' + angle_hat('BAC') + ' = 90 - {{c}} = ' + col(deg('{{eval:90-c}}')) + '$.'])],
    [spec('Isocèle : 52', 0, {'b': 52}, '52', 'correct'),
     spec('Erreur : 76 (180 − 2 × 52)', 0, {'b': 52}, '76', 'incorrect'),
     spec('Erreur : 128 (180 − 52)', 0, {'b': 52}, '128', 'incorrect'),
     spec('Équilatéral : 60', 1, {}, '60', 'correct'),
     spec('Erreur : 90', 1, {}, '90', 'incorrect'),
     spec('Deux angles égaux : isocèle', 2, {'k': 1, 'j': 0}, '0', 'correct'),
     spec('Erreur : équilatéral pour deux angles', 2, {'k': 1, 'j': 0}, '1', 'incorrect'),
     spec('Trois angles égaux : équilatéral', 2, {'k': 2, 'j': 1}, '1', 'correct'),
     spec('Rectangle : 90 − 35 = 55', 3, {'c': 35}, '55', 'correct'),
     spec('Erreur : 145 (180 − 35)', 3, {'c': 35}, '145', 'incorrect')],
    delay=90))

# --- 8. 6-175 : la somme des angles d'un triangle --------------------------------------------------
# v1 : la valeur ; v2 : trois mesures, triangle possible ou non (somme ≠ 180 quand k = 2).

MODELES.append(modele(
    '08-somme-des-angles-d-un-triangle', 'La somme des angles d\'un triangle',
    'Dans tout triangle, la somme des mesures des trois angles vaut 180° : la connaître, s\'en'
    ' servir pour dire si un triangle est possible',
    1,
    [variation('Dans un triangle, combien vaut la somme des mesures des trois angles ?'
               + choix(['$' + deg('180') + '$', '$' + deg('360') + '$', '$' + deg('90') + '$',
                        'ça dépend du triangle']),
               [], ['0'],
               ['**Dans tout triangle**, quelle que soit sa forme, la somme des mesures des trois'
                ' angles vaut $' + col(deg('180')) + '$.']),
     variation('Un triangle peut-il avoir trois angles qui mesurent $' + deg('{{a}}') + '$, $'
               + deg('{{b}}') + '$ et $' + deg('{{c}}') + '$ ?'
               + choix(['oui', 'non'], melanger=False),
               [var('k', '1..2'), var('a', '40..80'), var('b', '30..60'), var('d', '1..3'),
                var('c', 'eval:180-a-b+10*d*(k-1)'), var('j', 'eval:k-1')], ['{{j}}'],
               ['**La somme des angles d\'un triangle** vaut toujours $' + deg('180') + '$.',
                '$' + '{{a}} + {{b}} + {{c}} = {{eval:a+b+c}}' + '$ : '
                + si('k==1', colt('oui') + ', ce triangle est possible.',
                     colt('non') + ', $' + '{{eval:a+b+c}} \\neq 180' + '$.')])],
    [spec('180°', 0, {}, '0', 'correct'),
     spec('Erreur : 360°', 0, {}, '1', 'incorrect'),
     spec('Erreur : ça dépend du triangle', 0, {}, '3', 'incorrect'),
     spec('Somme 180 : oui', 1, {'k': 1, 'a': 70, 'b': 50, 'd': 2, 'c': 60, 'j': 0}, '0',
          'correct'),
     spec('Somme 200 : non', 1, {'k': 2, 'a': 70, 'b': 50, 'd': 2, 'c': 80, 'j': 1}, '1',
          'correct'),
     spec('Erreur : oui quand la somme vaut 200', 1,
          {'k': 2, 'a': 70, 'b': 50, 'd': 2, 'c': 80, 'j': 1}, '0', 'incorrect')]))

# --- 9. 6-176 : calculer un angle d'un triangle ------------------------------------------------------
# v1 : angles en B et C → angle en A ; v2 : isocèle en A, angle au sommet 2r → angles à la base
# 90 − r ; v3 : isocèle en A, angle à la base b → angle au sommet 180 − 2b. Triangle en croquis
# (« figure à main levée », phase 0). Hauteur ≤ 8,5 : b ≤ 70, c ≤ 65 sur une base de 7.

FIG_176_1 = figure(
    '-1.5 ; 8.5 ; -1 ; ' + haut(7, 'b', 'c'),
    'Un triangle ABC à main levée ; l\'angle en B mesure {{b}} degrés, l\'angle en C {{c}} degrés,'
    ' l\'angle en A est marqué d\'un point d\'interrogation.',
    triangle(7, 'b', 'c', {'B': '{{b}}°', 'C': '{{c}}°', 'A': '?'}, croquis=True))
FIG_176_2 = figure(
    '-1.5 ; 7.5 ; -1 ; ' + haut(6, '90-r', '90-r'),
    'Un triangle ABC isocèle en A, à main levée ; l\'angle en A mesure {{eval:2*r}} degrés,'
    ' l\'angle en B est marqué d\'un point d\'interrogation.',
    triangle(6, '90-r', '90-r', {'B': '?', 'A': '{{eval:2*r}}°'}, croquis=True,
             marques=[('A', 'B'), ('A', 'C')]))
FIG_176_3 = figure(
    '-1.5 ; 7.5 ; -1 ; ' + haut(6, 'b', 'b'),
    'Un triangle ABC isocèle en A, à main levée ; l\'angle en B mesure {{b}} degrés, l\'angle en A'
    ' est marqué d\'un point d\'interrogation.',
    triangle(6, 'b', 'b', {'B': '{{b}}°', 'A': '?'}, croquis=True,
             marques=[('A', 'B'), ('A', 'C')]))

MODELES.append(modele(
    '09-calculer-un-angle-d-un-triangle', 'Calculer un angle d\'un triangle',
    'Avec la somme des angles (180°) : le troisième angle à partir de deux, les trois angles d\'un'
    ' triangle isocèle à partir d\'un seul',
    1,
    [variation('Dans le triangle $ABC$, $' + angle_hat('ABC') + ' = ' + deg('{{b}}') + '$ et $'
               + angle_hat('ACB') + ' = ' + deg('{{c}}') + '$.' + FIG_176_1
               + 'Combien mesure l\'angle $' + angle_hat('BAC') + '$ ?\n\n$' + angle_hat('BAC')
               + ' = ' + deg('?') + '$',
               [var('b', '35..70'), var('c', '35..65')], ['{{eval:180-b-c}}'],
               ['**La somme des angles** d\'un triangle vaut $' + deg('180') + '$.',
                '$' + angle_hat('BAC') + ' = 180 - {{b}} - {{c}} = ' + col(deg('{{eval:180-b-c}}'))
                + '$.']),
     variation('Le triangle $ABC$ est isocèle en $A$ et $' + angle_hat('BAC') + ' = '
               + deg('{{eval:2*r}}') + '$.' + FIG_176_2 + 'Combien mesure l\'angle $'
               + angle_hat('ABC') + '$ ?\n\n$' + angle_hat('ABC') + ' = ' + deg('?') + '$',
               [var('r', '20..55')], ['{{eval:90-r}}'],
               ['**Les angles à la base** $' + angle_hat('ABC') + '$ et $' + angle_hat('ACB')
                + '$ ont la même mesure ; avec $' + angle_hat('BAC') + '$, la somme vaut $'
                + deg('180') + '$.',
                'Les deux angles à la base mesurent ensemble $180 - {{eval:2*r}} = {{eval:180-2*r}}'
                '$, donc chacun $\\dfrac{{{eval:180-2*r}}}{2} = ' + col(deg('{{eval:90-r}}'))
                + '$.']),
     variation('Le triangle $ABC$ est isocèle en $A$ et $' + angle_hat('ABC') + ' = '
               + deg('{{b}}') + '$.' + FIG_176_3 + 'Combien mesure l\'angle $' + angle_hat('BAC')
               + '$ ?\n\n$' + angle_hat('BAC') + ' = ' + deg('?') + '$',
               [var('b', '30..70')], ['{{eval:180-2*b}}'],
               ['**Isocèle en $A$** : $' + angle_hat('ACB') + ' = ' + angle_hat('ABC') + ' = '
                + deg('{{b}}') + '$.',
                '$' + angle_hat('BAC') + ' = 180 - {{b}} - {{b}} = '
                + col(deg('{{eval:180-2*b}}')) + '$.'])],
    [spec('180 − 50 − 60 = 70', 0, {'b': 50, 'c': 60}, '70', 'correct'),
     spec('Erreur : 110 (somme des deux angles)', 0, {'b': 50, 'c': 60}, '110', 'incorrect'),
     spec('Erreur : 250 (360 − …)', 0, {'b': 50, 'c': 60}, '250', 'incorrect'),
     spec('Sommet 40 : base 70', 1, {'r': 20}, '70', 'correct'),
     spec('Erreur : 140 (sans partager en deux)', 1, {'r': 20}, '140', 'incorrect'),
     spec('Sommet 100 : base 40', 1, {'r': 50}, '40', 'correct'),
     spec('Base 65 : sommet 50', 2, {'b': 65}, '50', 'correct'),
     spec('Erreur : 115 (180 − 65 une seule fois)', 2, {'b': 65}, '115', 'incorrect')],
    delay=120))

# --- 10. 6-177 : les médiatrices d'un triangle sont concourantes -------------------------------------
# v1 : deux médiatrices tracées se coupent en O, figure tirée parmi trois (aigu, rectangle, obtus :
# O dedans, au milieu de l'hypoténuse, dehors) ; v2 : vrai / faux sur trois énoncés.

TRIANGLES_177 = {1: ((1, 1), (8, 1.5), (4, 7)), 2: ((1.5, 1), (8.5, 1), (1.5, 6)),
                 3: ((0.5, 3), (9, 3), (3, 5))}


def corps_177(k):
    a, b, c = TRIANGLES_177[k]
    pos = {1: ('bas-gauche', 'bas-droite', 'haut'), 2: ('bas-gauche', 'bas-droite', 'haut'),
           3: ('gauche', 'droite', 'haut')}[k]
    return '\n'.join('{} = point({}, {}, etiquette="{}")'.format(nom, n(p[0]), n(p[1]), e)
                     for nom, p, e in zip('ABC', (a, b, c), pos))


FIG_177 = figure(
    '-1 ; 10 ; -2.5 ; 8.5',
    si3('k', 'Un triangle ABC aux trois angles aigus et ses médiatrices de [AB] et de [BC], qui se'
             ' coupent en O, dans le triangle.',
        'Un triangle ABC rectangle en A et ses médiatrices de [AB] et de [BC], qui se coupent en O,'
        ' milieu de [BC].',
        'Un triangle ABC avec un angle obtus en C et ses médiatrices de [AB] et de [BC], qui se'
        ' coupent en O, hors du triangle.'),
    [si3('k', corps_177(1), corps_177(2), corps_177(3)),
     'polygone(A, B, C, couleur="noir", epaisseur=2)',
     'm1 = mediatrice(A, B, couleur="bleu")', 'm2 = mediatrice(B, C, couleur="bleu")',
     'O = intersection(m1, m2, etiquette="bas-droite")'])

MODELES.append(modele(
    '10-mediatrices-concourantes', 'Les médiatrices d\'un triangle sont concourantes',
    'Les trois médiatrices d\'un triangle se coupent en un même point : prévoir où passe la'
    ' troisième, reconnaître la propriété',
    1,
    [variation('On a tracé les médiatrices des côtés $[AB]$ et $[BC]$ du triangle $ABC$ ; elles se'
               ' coupent en $O$.' + FIG_177 + 'Que peut-on dire de la médiatrice du côté $[AC]$'
               ' ?'
               + choix(['elle passe par $O$', 'elle ne passe pas par $O$',
                        'ça dépend du triangle'], melanger=False),
               [var('k', '1..3')], ['0'],
               ['**Les trois médiatrices d\'un triangle sont concourantes** : elles se coupent en un'
                ' même point.',
                'La médiatrice de $[AC]$ ' + colt('passe par O') + ', comme les deux autres'
                + si3('k', ' (ici, $O$ est dans le triangle).',
                      ' (ici, $O$ est le milieu de $[BC]$).',
                      ' (ici, $O$ est hors du triangle : c\'est possible).')]),
     variation('Vrai ou faux ?\n\n« ' + si3('k', 'Les trois médiatrices d\'un triangle se coupent'
                                               ' en un même point.',
                                          'Les trois médiatrices d\'un triangle se coupent'
                                          ' toujours à l\'intérieur du triangle.',
                                          'Les médiatrices d\'un triangle passent par ses'
                                          ' sommets.') + ' »'
               + choix(['vrai', 'faux'], melanger=False),
               [var('k', '1..3'), var('j', 'eval:' + lag('k', [0, 1, 1]))], ['{{j}}'],
               ['La médiatrice d\'un côté est la droite perpendiculaire à ce côté **en son milieu**.'
                ' Les trois médiatrices d\'un triangle se coupent en un même point.',
                si3('k', colt('Vrai') + '.',
                    colt('Faux') + ' : le point de concours peut être hors du triangle (triangle'
                    ' qui a un angle obtus).',
                    colt('Faux') + ' : une médiatrice passe par le milieu d\'un côté, pas'
                    ' forcément par un sommet.')])],
    [spec('Passe par O (aigu)', 0, {'k': 1}, '0', 'correct'),
     spec('Passe par O (obtus)', 0, {'k': 3}, '0', 'correct'),
     spec('Erreur : ça dépend du triangle', 0, {'k': 3}, '2', 'incorrect'),
     spec('Concourantes : vrai', 1, {'k': 1, 'j': 0}, '0', 'correct'),
     spec('Toujours à l\'intérieur : faux', 1, {'k': 2, 'j': 1}, '1', 'correct'),
     spec('Erreur : vrai pour « toujours à l\'intérieur »', 1, {'k': 2, 'j': 1}, '0',
          'incorrect'),
     spec('Par les sommets : faux', 1, {'k': 3, 'j': 1}, '1', 'correct')],
    delay=90))

# --- 11. 6-178 : le cercle circonscrit -------------------------------------------------------------
# v1 : son centre ; v2 : O centre, OA = u/2 cm → OB et OC (deux cases).

MODELES.append(modele(
    '11-cercle-circonscrit', 'Le cercle circonscrit à un triangle',
    'Le cercle circonscrit passe par les trois sommets ; son centre est le point de concours des'
    ' médiatrices, à la même distance des trois sommets',
    1,
    [variation('Le cercle circonscrit à un triangle passe par ses trois sommets. Quel est son'
               ' centre ?'
               + choix(['le point de concours des médiatrices du triangle',
                        'le point de concours des bissectrices du triangle',
                        'le milieu d\'un côté du triangle']),
               [], ['0'],
               ['Le centre $O$ est **à la même distance des trois sommets** : $OA = OB$, donc $O$'
                ' est sur la médiatrice de $[AB]$ ; $OB = OC$, donc sur celle de $[BC]$.',
                'Le centre du cercle circonscrit est '
                + colt('le point de concours des médiatrices') + '.']),
     variation('$O$ est le centre du cercle circonscrit au triangle $ABC$, et $OA = '
               + cm('{{eval:u/2;d}}') + '$.\n\nCompléter : $OB = ' + cm('?') + '$ et $OC = '
               + cm('?') + '$.',
               [var('u', '5..19')], ['{{eval:u/2;d}}', '{{eval:u/2;d}}'],
               ['Le cercle circonscrit passe par $A$, $B$ et $C$ : $OA$, $OB$ et $OC$ sont trois'
                ' **rayons** de ce cercle.',
                '$OB = OC = OA = ' + col(cm('{{eval:u/2;d}}')) + '$.'])],
    [spec('Médiatrices', 0, {}, '0', 'correct'),
     spec('Erreur : bissectrices', 0, {}, '1', 'incorrect'),
     spec('OA = 4,5 : OB = OC = 4,5', 1, {'u': 9}, ['4,5', '4,5'], 'correct'),
     spec('Erreur : le diamètre (9)', 1, {'u': 9}, ['9', '9'], 'incorrect'),
     spec('OA = 6 : OB = OC = 6', 1, {'u': 12}, ['6', '6'], 'correct')],
    decimal=True))

# --- 12. 6-179 : le symétrique d'un point par rapport à une droite ---------------------------------
# v1 : la définition (d médiatrice de [AA'] ; leurres : chacune des deux conditions seule) ; v2 :
# d oblique, A' tiré parmi trois (juste ; même distance mais (AA') penche de 24° ;
# perpendiculaire mais pas à la même distance).

D1, D2, A179 = (0.5, 1), (9.5, 6), (2.5, 6)


def pied(p):
    ux, uy = D2[0] - D1[0], D2[1] - D1[1]
    t = ((p[0] - D1[0]) * ux + (p[1] - D1[1]) * uy) / (ux * ux + uy * uy)
    return D1[0] + t * ux, D1[1] + t * uy


H179 = pied(A179)
SYM = (2 * H179[0] - A179[0], 2 * H179[1] - A179[1])
_u = math.hypot(D2[0] - D1[0], D2[1] - D1[1])
GLISSE = (SYM[0] + 3 * (D2[0] - D1[0]) / _u, SYM[1] + 3 * (D2[1] - D1[1]) / _u)
COURT = (H179[0] + 0.5 * (SYM[0] - H179[0]), H179[1] + 0.5 * (SYM[1] - H179[1]))


def ap(p):
    return 'Ap = point(' + n(p[0]) + ', ' + n(p[1]) + ', etiquette="aucune")'


FIG_179 = figure(
    '-0.5 ; 10.5 ; -0.5 ; 7.5',
    si3('k', 'Une droite d oblique, un point A au-dessus et un point A\' au-dessous, le segment'
             ' [AA\'] en pointillés, perpendiculaire à d et coupé en son milieu par d.',
        'Une droite d oblique, un point A au-dessus et un point A\' au-dessous, à la même distance'
        ' de d, mais le segment [AA\'] n\'est pas perpendiculaire à d.',
        'Une droite d oblique, un point A au-dessus et un point A\' au-dessous, le segment [AA\']'
        ' perpendiculaire à d, mais A\' est deux fois plus près de d que A.'),
    ['D1 = point(' + n(D1[0]) + ', ' + n(D1[1]) + ', visible=faux)',
     'D2 = point(' + n(D2[0]) + ', ' + n(D2[1]) + ', visible=faux)',
     'd = droite(D1, D2, couleur="bleu", epaisseur=2)',
     'texte(9.3, 5.2, "d")',
     'A = point(' + n(A179[0]) + ', ' + n(A179[1]) + ', etiquette="haut")',
     si3('k', ap(SYM), ap(GLISSE), ap(COURT)),
     'texte(Ap, "A\'", dx=0.25, dy=-0.25)',
     'segment(A, Ap, trait="tirets")'])

MODELES.append(modele(
    '12-symetrique-d-un-point', 'Le symétrique d\'un point par rapport à une droite',
    'A\' est le symétrique de A par rapport à la droite d quand d est la médiatrice du segment'
    ' [AA\'] : perpendiculaire à [AA\'] en son milieu',
    1,
    [variation('Que veut dire « $A\'$ est le symétrique de $A$ par rapport à la droite $d$ » ?'
               + choix(['la droite $d$ est la médiatrice du segment $[AA\']$',
                        'la droite $d$ passe par le milieu du segment $[AA\']$',
                        'la droite $(AA\')$ est perpendiculaire à $d$',
                        'les points $A$ et $A\'$ sont de part et d\'autre de $d$']),
               [], ['0'],
               ['**Définition.** $A\'$ est le symétrique de $A$ par rapport à $d$ quand '
                + colt('d est la médiatrice de [AA\']') + ' : $d$ est perpendiculaire à $[AA\']$'
                ' **et** passe par son milieu.',
                'Une seule des deux conditions ne suffit pas.']),
     variation('Le point $A\'$ est-il le symétrique du point $A$ par rapport à la droite $d$ ?'
               + FIG_179
               + choix(['oui', 'non, la droite $(AA\')$ n\'est pas perpendiculaire à $d$',
                        'non, $A$ et $A\'$ ne sont pas à la même distance de $d$'],
                       melanger=False),
               [var('k', '1..3'), var('j', 'eval:k-1')], ['{{j}}'],
               ['$A\'$ est le symétrique de $A$ quand $d$ est **perpendiculaire** à $[AA\']$ **et**'
                ' passe par son **milieu** (les deux points sont à la même distance de $d$).',
                si3('k', '$[AA\']$ est perpendiculaire à $d$ et coupé en son milieu : '
                         + colt('oui') + '.',
                    '$A$ et $A\'$ sont bien à la même distance de $d$, mais $[AA\']$ penche : '
                    + colt('non') + ', $(AA\')$ n\'est pas perpendiculaire à $d$.',
                    '$[AA\']$ est perpendiculaire à $d$, mais $A\'$ est plus près de $d$ que $A$ : '
                    + colt('non') + '.')])],
    [spec('Médiatrice', 0, {}, '0', 'correct'),
     spec('Erreur : seulement le milieu', 0, {}, '1', 'incorrect'),
     spec('Erreur : seulement perpendiculaire', 0, {}, '2', 'incorrect'),
     spec('Symétrique', 1, {'k': 1, 'j': 0}, '0', 'correct'),
     spec('Non perpendiculaire', 1, {'k': 2, 'j': 1}, '1', 'correct'),
     spec('Erreur : oui quand (AA\') penche', 1, {'k': 2, 'j': 1}, '0', 'incorrect'),
     spec('Pas à la même distance', 1, {'k': 3, 'j': 2}, '2', 'correct')],
    delay=90))

# --- 13. 6-148 : périmètres de figures composées -----------------------------------------------------
# v1 : polygone en L (six côtés écrits) : 2(L + H) ; v2 : rectangle L × l dont un côté l est
# remplacé par un demi-cercle : 2L + l + 3,14 × l ÷ 2 ; v3 : deux demi-cercles (piste) :
# 2L + 3,14 × l. π ≈ 3,14, résultat arrondi au dixième (décision du § 26, question 4).

FIG_148_1 = figure(
    '-1.5 ; 12 ; -1.2 ; 8.5',
    'Une figure en forme de L : un rectangle de {{L}} cm sur {{H}} cm dont on a retiré, en haut à'
    ' droite, un rectangle de {{w}} cm sur {{h}} cm ; les six côtés ont leur longueur écrite.',
    ['P1 = point(0, 0, visible=faux)', 'P2 = point({{L}}, 0, visible=faux)',
     'P3 = point({{L}}, {{eval:H-h}}, visible=faux)',
     'P4 = point({{eval:L-w}}, {{eval:H-h}}, visible=faux)',
     'P5 = point({{eval:L-w}}, {{H}}, visible=faux)', 'P6 = point(0, {{H}}, visible=faux)',
     'polygone(P1, P2, P3, P4, P5, P6, couleur="noir", epaisseur=2)',
     'texte({{eval:L/2;d}}, -0.6, "{{L}} cm")',
     'texte({{eval:L+0.9;d}}, {{eval:(H-h)/2;d}}, "{{eval:H-h}} cm")',
     'texte({{eval:L-w/2;d}}, {{eval:H-h-0.6;d}}, "{{w}} cm")',
     'texte({{eval:L-w+0.9;d}}, {{eval:H-h/2;d}}, "{{h}} cm")',
     'texte({{eval:(L-w)/2;d}}, {{eval:H+0.6;d}}, "{{eval:L-w}} cm")',
     'texte(-0.9, {{eval:H/2;d}}, "{{H}} cm")'])


def piste(deux):
    """Rectangle {{L}} × {{l}} : côté droit (et gauche si deux) remplacé par un demi-cercle."""
    lignes = ['P1 = point(' + ('{{eval:l/2;d}}' if deux else '0') + ', 0, visible=faux)',
              'P2 = point({{eval:L+' + ('l/2' if deux else '0') + ';d}}, 0, visible=faux)',
              'P3 = point({{eval:L+' + ('l/2' if deux else '0') + ';d}}, {{l}}, visible=faux)',
              'P4 = point(' + ('{{eval:l/2;d}}' if deux else '0') + ', {{l}}, visible=faux)',
              'segment(P1, P2, couleur="noir", epaisseur=2)',
              'segment(P4, P3, couleur="noir", epaisseur=2)',
              'O1 = point({{eval:L+' + ('l/2' if deux else '0') + ';d}}, {{eval:l/2;d}},'
              ' visible=faux)',
              'arc(O1, rayon={{eval:l/2;d}}, debut=-90, fin=90, couleur="noir", epaisseur=2)',
              'texte({{eval:' + ('l/2+' if deux else '') + 'L/2;d}}, -0.6, "{{L}} cm")']
    if deux:
        lignes += ['O2 = point({{eval:l/2;d}}, {{eval:l/2;d}}, visible=faux)',
                   'arc(O2, rayon={{eval:l/2;d}}, debut=90, fin=270, couleur="noir", epaisseur=2)',
                   'segment(P1, P4, trait="tirets")',
                   'texte({{eval:l/2+0.25;d}}, {{eval:l/2;d}}, "{{l}} cm", ancre="gauche")']
    else:
        lignes += ['segment(P1, P4, couleur="noir", epaisseur=2)',
                   'texte(-0.9, {{eval:l/2;d}}, "{{l}} cm")']
    return lignes


FIG_148_2 = figure(
    '-1.8 ; {{eval:L+l/2+1;d}} ; -1.2 ; {{eval:l+1}}',
    'Un rectangle de {{L}} cm sur {{l}} cm dont le côté de droite est remplacé par un demi-cercle'
    ' de diamètre {{l}} cm.', piste(False))
FIG_148_3 = figure(
    '-1 ; {{eval:L+l+1}} ; -1.2 ; {{eval:l+1}}',
    'Une piste : deux segments de {{L}} cm et deux demi-cercles de diamètre {{l}} cm, un à chaque'
    ' bout.', piste(True))

DIXIEME = 'floor(10*({})+0.5)/10'
P148_2 = DIXIEME.format('2*L+l+1.57*l')
P148_3 = DIXIEME.format('2*L+3.14*l')

MODELES.append(modele(
    '13-perimetres-de-figures-composees', 'Périmètres de figures composées',
    'Décomposer le contour d\'une figure en segments et en portions de cercle, additionner leurs'
    ' longueurs ; un demi-cercle de diamètre D mesure π × D ÷ 2 (π ≈ 3,14)',
    1,
    [variation('Calcule le périmètre de cette figure.' + FIG_148_1 + 'Périmètre $= ' + cm('?')
               + '$',
               [var('L', '6..10'), var('H', '4..7'), var('w', '2..4'), var('h', '1..3')],
               ['{{eval:2*(L+H)}}'],
               ['**Le périmètre** est la longueur du contour : on additionne les longueurs des'
                ' six côtés.',
                '${{L}} + {{eval:H-h}} + {{w}} + {{h}} + {{eval:L-w}} + {{H}} = '
                + col(cm('{{eval:2*(L+H)}}')) + '$.'],
               conditions=['h<H-1']),
     variation('Calcule le périmètre de cette figure. On prend $\\pi \\approx 3{,}14$ ; donne le'
               ' résultat arrondi au dixième.' + FIG_148_2 + 'Périmètre $\\approx ' + cm('?') + '$',
               [var('L', '4..9'), var('m', '1..3'), var('l', 'eval:2*m')],
               ['{{eval:' + P148_2 + ';d}}'],
               ['**Le contour** : trois côtés du rectangle ($' + cm('{{L}}') + '$, $' + cm('{{l}}')
                + '$, $' + cm('{{L}}') + '$) et un **demi-cercle** de diamètre $' + cm('{{l}}')
                + '$ (le côté de droite n\'est pas sur le contour).',
                'Demi-cercle : $3{,}14 \\times {{l}} \\div 2 = {{eval:1.57*l;d}}$. Périmètre : ${{L}}'
                ' + {{l}} + {{L}} + {{eval:1.57*l;d}} = {{eval:2*L+l+1.57*l;d}}$, soit environ $'
                + col(cm('{{eval:' + P148_2 + ';d}}')) + '$.']),
     variation('Calcule le périmètre de cette piste. On prend $\\pi \\approx 3{,}14$ ; donne le'
               ' résultat arrondi au dixième.' + FIG_148_3 + 'Périmètre $\\approx ' + cm('?') + '$',
               [var('L', '4..9'), var('m', '1..3'), var('l', 'eval:2*m')],
               ['{{eval:' + P148_3 + ';d}}'],
               ['**Le contour** : deux segments de $' + cm('{{L}}') + '$ et deux demi-cercles de'
                ' diamètre $' + cm('{{l}}') + '$, qui font ensemble **un cercle entier** de'
                ' diamètre $' + cm('{{l}}') + '$ (le pointillé n\'est pas sur le contour).',
                'Cercle : $3{,}14 \\times {{l}} = {{eval:3.14*l;d}}$. Périmètre : ${{L}} + {{L}} +'
                ' {{eval:3.14*l;d}} = {{eval:2*L+3.14*l;d}}$, soit environ $'
                + col(cm('{{eval:' + P148_3 + ';d}}')) + '$.'])],
    [spec('L : 2 × (8 + 6) = 28', 0, {'L': 8, 'H': 6, 'w': 3, 'h': 2}, '28', 'correct'),
     spec('Erreur : 23 (côtés du creux oubliés)', 0, {'L': 8, 'H': 6, 'w': 3, 'h': 2}, '23',
          'incorrect'),
     spec('Erreur : 48 (aire)', 0, {'L': 8, 'H': 6, 'w': 3, 'h': 2}, '48', 'incorrect'),
     spec('Demi-cercle : 6 + 4 + 6 + 6,28 ≈ 22,3', 1, {'L': 6, 'm': 2, 'l': 4}, '22,3',
          'correct'),
     spec('Erreur : 28,6 (cercle entier)', 1, {'L': 6, 'm': 2, 'l': 4}, '28,6', 'incorrect'),
     spec('Erreur : 26,3 (côté de droite compté)', 1, {'L': 6, 'm': 2, 'l': 4}, '26,3',
          'incorrect'),
     spec('Piste : 5 + 5 + 18,84 ≈ 28,8', 2, {'L': 5, 'm': 3, 'l': 6}, '28,8', 'correct'),
     spec('Erreur : 34,8 (pointillé compté)', 2, {'L': 5, 'm': 3, 'l': 6}, '34,8', 'incorrect'),
     spec('Erreur : 19,4 (un seul demi-cercle)', 2, {'L': 5, 'm': 3, 'l': 6}, '19,4',
          'incorrect')],
    delay=150, decimal=True))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
