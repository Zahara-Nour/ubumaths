"""Écrit les 7 modèles du lot 4 A « Vecteurs en coordonnées : coordonnées, norme, distance, milieu »
de la 2de dans scripts/questions/2de-vecteurs-a/.

Phase 0 validée par David le 2026-10-29 (§ 23 du journal `docs/wip/questions-2de-progress.md`).
Bornes : `bornes/lycee/2de.json` (2-434, 2-294, 2-300, 2-436, 2-293 et 2-301 en base orthonormée,
2-302 : décision l2-8, calcul quelle que soit la méthode). Un point par modèle ; le nœud et le tag
sont posés par la migration de rangement, après le `--publier` de David.

Décisions et pièges :
- L4-a : lot 4 A (ces 7 points), la colinéarité au lot 4 B ;
- L4-b : norme 2√10 attendue, √40 juste mais « à améliorer » (contrainte `reducedRadicals`) ;
- L4-c : 2u⃗ − 3v⃗ en dernière variation de 2-300 ;
- L4-d : « isocèle en A ? » en case choix (2-301), le modèle garde ses variations à calcul ;
- vecteur répondu dans une case `answerKind: "vecteur"` (en ligne ou en colonne) ; point répondu
  dans deux cases (abscisse, ordonnée) ;
- les variables sont substituées telles quelles dans les `eval` : toujours `(a)`, `-(a)` ;
- normes et distances tirées dans des listes : valeur entière, √n irréductible, ou k√m ;
- variables `e` et `i` interdites.

    python3 docs/wip/questions-2de/lot-vecteurs-a-2de.py scripts/questions/2de-vecteurs-a
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


def modele(nom, title, description, categorie, level, variations, specs, delay=90):
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
    v['blanks'] = blanks
    v['correction'] = {'steps': steps}
    return v


def case(attendu):
    return {'expectedAnswer': attendu}


def case_vecteur(x, y):
    return {'expectedAnswer': '(' + x + ';' + y + ')', 'answerKind': 'vecteur'}


def selon(nom, valeurs, debut=0):
    """`{{if:nom==debut|v0|{{if:nom==debut+1|v1|…}}}}` ; la dernière valeur est le « sinon »."""
    texte = valeurs[-1]
    for k in range(len(valeurs) - 2, -1, -1):
        texte = '{{if:' + nom + '==' + str(debut + k) + '|' + valeurs[k] + '|' + texte + '}}'
    return texte


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def colonne(x, y):
    return '\\begin{pmatrix}' + x + '\\\\' + y + '\\end{pmatrix}'


def point(nom, x, y):
    return nom + '(' + x + '\\,;\\,' + y + ')'


MODELES = []
VECTEURS = 'Vecteurs du plan'
REPERE = 'Dans un repère $(O\\,;\\vec{i},\\vec{j})$'
REPERE_ON = 'Dans un repère orthonormé $(O\\,;\\vec{i},\\vec{j})$'
DONNE_VECTEUR = 'Donne ses coordonnées (en colonne, ou en ligne $(x\\,;y)$).'

# --- 1. 2-434 : coordonnées d'un vecteur dans une base --------------------------------------

DEFINITION = ('Les coordonnées de $\\vec{u}$ sont les nombres $x$ et $y$ tels que'
              ' $\\vec{u}=x\\,\\vec{i}+y\\,\\vec{j}$ : on les lit devant $\\vec{i}$ puis devant $\\vec{j}$.')

BASE_LIRE = variation(
    REPERE + ', on considère le vecteur $\\vec{u}={{a}}\\vec{i}{{b;+}}\\vec{j}$.\n\n'
    + DONNE_VECTEUR + '\n\n$$\\vec{u}\\,?$$',
    [var('a', '2..9;±'), var('b', '2..9;±')],
    [case_vecteur('{{a}}', '{{b}}')],
    [DEFINITION,
     '$\\vec{u}=' + col('{{a}}') + '\\,\\vec{i}' + '{{if:b>0|+|}}' + col('{{b}}', 1)
     + '\\,\\vec{j}$, donc $\\vec{u}' + colonne(col('{{a}}'), col('{{b}}', 1)) + '$.'])

BASE_ZERO = variation(
    REPERE + ', on considère le vecteur $\\vec{u}={{a}}' + selon('t', ['\\vec{i}', '\\vec{j}'])
    + '$.\n\n' + DONNE_VECTEUR + '\n\n$$\\vec{u}\\,?$$',
    [var('t', '0|1'), var('a', '2..9;±')],
    [case_vecteur('{{if:t==0|{{a}}|0}}', '{{if:t==0|0|{{a}}}}')],
    [DEFINITION,
     '$\\vec{u}=' + selon('t', ['{{a}}\\,\\vec{i}+' + col('0', 1) + '\\,\\vec{j}',
                               col('0') + '\\,\\vec{i}+{{a}}\\,\\vec{j}'])
     + '$ : il n\'y a pas de ' + selon('t', ['$\\vec{j}$', '$\\vec{i}$'])
     + ', sa coordonnée vaut $0$.',
     '$\\vec{u}' + col(selon('t', [colonne('{{a}}', '0'), colonne('0', '{{a}}')])) + '$.'])

BASE_ECRIRE = variation(
    REPERE + ', on considère le vecteur $\\vec{u}' + colonne('{{a}}', '{{b}}') + '$.\n\n'
    'Complète : $\\vec{u}=?\\,\\vec{i}+?\\,\\vec{j}$',
    [var('a', '2..9;±'), var('b', '2..9;±')],
    [case('{{a}}'), case('{{b}}')],
    [DEFINITION,
     'La première coordonnée va devant $\\vec{i}$, la seconde devant $\\vec{j}$ :'
     ' $\\vec{u}=' + col('{{a}}') + '\\,\\vec{i}+' + col('{{b;()}}', 1) + '\\,\\vec{j}$'
     '{{if:b<0|, soit $\\vec{u}={{a}}\\,\\vec{i}{{b}}\\,\\vec{j}$|}}.'])

BASE_FRACTION = variation(
    REPERE + ', on considère le vecteur $\\vec{u}=-\\dfrac{ {{p}} }{ {{q}} }\\vec{i}{{b;+}}\\vec{j}$.\n\n'
    + DONNE_VECTEUR + '\n\n$$\\vec{u}\\,?$$',
    [var('p', '1|2|3'), var('q', '2|3|4|5'), var('b', '2..9;±')],
    [case_vecteur('-\\frac{ {{p}} }{ {{q}} }', '{{b}}')],
    [DEFINITION + ' Une coordonnée peut être une fraction.',
     '$\\vec{u}' + colonne(col('-\\dfrac{ {{p}} }{ {{q}} }'), col('{{b}}', 1)) + '$.'],
    ['p == 1 || mod(q, p) != 0'])

SP_BL = {'a': 3, 'b': -2}
SP_BZ = {'t': 1, 'a': 4}
SP_BE = {'a': -1, 'b': 4}
SP_BF = {'p': 1, 'q': 2, 'b': 3}
MODELES.append(modele(
    '01-coordonnees-d-un-vecteur', 'Coordonnées d\'un vecteur dans une base',
    'Lire les coordonnées de u = a i + b j (une coordonnée nulle, une fraction), et écrire u à partir'
    ' de ses coordonnées (pièges : coordonnées échangées, 0 oublié, signe)',
    ('Géométrie', VECTEURS, 'Coordonnées'), 1,
    [BASE_LIRE, BASE_ZERO, BASE_ECRIRE, BASE_FRACTION],
    [spec('3i − 2j → (3 ; −2)', 0, SP_BL, '(3;-2)', 'correct'),
     spec('En colonne', 0, SP_BL, '\\begin{pmatrix}3\\\\-2\\end{pmatrix}', 'correct'),
     spec('Erreur : coordonnées échangées', 0, SP_BL, '(-2;3)', 'incorrect'),
     spec('Erreur : signe perdu', 0, SP_BL, '(3;2)', 'incorrect'),
     spec('4j → (0 ; 4)', 1, SP_BZ, '(0;4)', 'correct'),
     spec('Erreur : (4 ; 0)', 1, SP_BZ, '(4;0)', 'incorrect'),
     spec('u(−1 ; 4) → −1 et 4', 2, SP_BE, ['-1', '4'], 'correct'),
     spec('Erreur : cases échangées', 2, SP_BE, ['4', '-1'], 'incorrect'),
     spec('−½ i + 3 j → (−1/2 ; 3)', 3, SP_BF, '(-\\frac{1}{2};3)', 'correct'),
     spec('En décimal (−0,5 ; 3)', 3, SP_BF, '(-0.5;3)', 'correct'),
     spec('Erreur : signe de la fraction perdu', 3, SP_BF, '(\\frac{1}{2};3)', 'incorrect')]))

# --- 2. 2-294 : coordonnées de AB à partir de A et B ----------------------------------------

FORMULE_AB = ('$\\overrightarrow{AB}' + colonne('x_B-x_A', 'y_B-y_A') + '$ : on retranche les'
              ' coordonnées de l\'origine $A$ à celles de l\'extrémité $B$.')

AB_ENTIERS = variation(
    REPERE + ', on considère les points $' + point('A', '{{ax}}', '{{ay}}') + '$ et $'
    + point('B', '{{bx}}', '{{by}}') + '$.\n\nDonne les coordonnées du vecteur'
    ' $\\overrightarrow{AB}$.\n\n$$\\overrightarrow{AB}\\,?$$',
    [var('ax', '-9..9'), var('ay', '-9..9'), var('bx', '-9..9'), var('by', '-9..9')],
    [case_vecteur('{{eval:(bx)-(ax)}}', '{{eval:(by)-(ay)}}')],
    [FORMULE_AB,
     '$\\overrightarrow{AB}' + colonne('{{bx}}-{{ax;()}}', '{{by}}-{{ay;()}}') + '$, soit $'
     '\\overrightarrow{AB}' + col(colonne('{{eval:(bx)-(ax)}}', '{{eval:(by)-(ay)}}')) + '$.'],
    ['bx != ax', 'by != ay'])

AB_EXTREMITE = variation(
    REPERE + ', on considère le point $' + point('A', '{{ax}}', '{{ay}}') + '$ et le vecteur'
    ' $\\overrightarrow{AB}' + colonne('{{u1}}', '{{u2}}') + '$.\n\nDonne les coordonnées du point'
    ' $B$.\n\n$$' + point('B', '?', '?') + '$$',
    [var('ax', '-9..9'), var('ay', '-9..9'), var('u1', '1..9;±'), var('u2', '1..9;±')],
    [case('{{eval:(ax)+(u1)}}'), case('{{eval:(ay)+(u2)}}')],
    [FORMULE_AB + ' Donc $x_B=x_A+' + '(x_B-x_A)$ : on **ajoute** les coordonnées de'
     ' $\\overrightarrow{AB}$ à celles de $A$.',
     '$x_B={{ax}}+{{u1;()}}=' + col('{{eval:(ax)+(u1)}}') + '$ et $y_B={{ay}}+{{u2;()}}='
     + col('{{eval:(ay)+(u2)}}', 1) + '$, donc $' + point('B', col('{{eval:(ax)+(u1)}}'),
                                                      col('{{eval:(ay)+(u2)}}', 1)) + '$.'],
    ['abs(ax+u1) <= 12', 'abs(ay+u2) <= 12'])

AB_DECIMAUX = variation(
    REPERE + ', on considère les points $' + point('A', '{{eval:(ax)/2;d}}', '{{ay}}') + '$ et $'
    + point('B', '{{eval:(bx)/2;d}}', '{{eval:(by)/2;d}}') + '$.\n\nDonne les coordonnées du vecteur'
    ' $\\overrightarrow{AB}$.\n\n$$\\overrightarrow{AB}\\,?$$',
    [var('ax', '-9..9'), var('ay', '-6..6'), var('bx', '-9..9'), var('by', '-13..13')],
    [case_vecteur('{{eval:((bx)-(ax))/2}}', '{{eval:(by)/2-(ay)}}')],
    [FORMULE_AB,
     '$\\overrightarrow{AB}' + colonne('{{eval:(bx)/2;d}}-{{eval:(ax)/2;d;()}}',
                                        '{{eval:(by)/2;d}}-{{ay;()}}') + '$, soit $'
     '\\overrightarrow{AB}' + col(colonne('{{eval:((bx)-(ax))/2;d}}', '{{eval:(by)/2-(ay);d}}'))
     + '$.'],
    ['mod(ax, 2) != 0', 'mod(by, 2) != 0', 'bx != ax'])

SP_AE = {'ax': 2, 'ay': -1, 'bx': -3, 'by': 4}
SP_AX = {'ax': 2, 'ay': -1, 'u1': 3, 'u2': -5}
SP_AD = {'ax': 3, 'ay': 2, 'bx': -1, 'by': 5}
MODELES.append(modele(
    '02-coordonnees-de-ab', 'Coordonnées du vecteur AB',
    'Coordonnées de AB à partir de A et B (entiers, puis décimaux), et de B à partir de A et AB'
    ' (pièges : A − B, soustraire au lieu d\'ajouter)',
    ('Géométrie', VECTEURS, 'Coordonnées'), 2,
    [AB_ENTIERS, AB_EXTREMITE, AB_DECIMAUX],
    [spec('A(2 ; −1), B(−3 ; 4) → (−5 ; 5)', 0, SP_AE, '(-5;5)', 'correct'),
     spec('Erreur : A − B (5 ; −5)', 0, SP_AE, '(5;-5)', 'incorrect'),
     spec('Erreur : somme (−1 ; 3)', 0, SP_AE, '(-1;3)', 'incorrect'),
     spec('A(2 ; −1), AB(3 ; −5) → B(5 ; −6)', 1, SP_AX, ['5', '-6'], 'correct'),
     spec('Erreur : soustraction, B(−1 ; 4)', 1, SP_AX, ['-1', '4'], 'incorrect'),
     spec('A(1,5 ; 2), B(−0,5 ; 2,5) → (−2 ; 0,5)', 2, SP_AD, '(-2;0.5)', 'correct'),
     spec('En fractions', 2, SP_AD, '(-2;\\frac{1}{2})', 'correct'),
     spec('Erreur : A − B', 2, SP_AD, '(2;-0.5)', 'incorrect')]))

# --- 3. 2-300 : coordonnées d'une somme -----------------------------------------------------

DEUX_VECTEURS = (REPERE + ', on considère les vecteurs $\\vec{u}' + colonne('{{u1}}', '{{u2}}')
                 + '$ et $\\vec{v}' + colonne('{{v1}}', '{{v2}}') + '$.\n\n')
VARS_UV = [var('u1', '-9..9'), var('u2', '-9..9'), var('v1', '-9..9'), var('v2', '-9..9')]
NON_NULS = ['abs(u1)+abs(u2) > 0', 'abs(v1)+abs(v2) > 0']
COORD_PAR_COORD = 'On calcule **coordonnée par coordonnée** : abscisse avec abscisse, ordonnée avec ordonnée.'

SOMME = variation(
    DEUX_VECTEURS + 'Donne les coordonnées du vecteur $\\vec{u}+\\vec{v}$.\n\n$$\\vec{u}+\\vec{v}\\,?$$',
    VARS_UV,
    [case_vecteur('{{eval:(u1)+(v1)}}', '{{eval:(u2)+(v2)}}')],
    [COORD_PAR_COORD,
     '$\\vec{u}+\\vec{v}' + colonne('{{u1}}+{{v1;()}}', '{{u2}}+{{v2;()}}') + '$, soit $\\vec{u}+\\vec{v}'
     + col(colonne('{{eval:(u1)+(v1)}}', '{{eval:(u2)+(v2)}}')) + '$.'],
    NON_NULS)

DIFFERENCE = variation(
    DEUX_VECTEURS + 'Donne les coordonnées du vecteur $\\vec{u}-\\vec{v}$.\n\n$$\\vec{u}-\\vec{v}\\,?$$',
    VARS_UV,
    [case_vecteur('{{eval:(u1)-(v1)}}', '{{eval:(u2)-(v2)}}')],
    [COORD_PAR_COORD + ' On retranche les coordonnées de $\\vec{v}$, avec leur signe.',
     '$\\vec{u}-\\vec{v}' + colonne('{{u1}}-{{v1;()}}', '{{u2}}-{{v2;()}}') + '$, soit $\\vec{u}-\\vec{v}'
     + col(colonne('{{eval:(u1)-(v1)}}', '{{eval:(u2)-(v2)}}')) + '$.'],
    NON_NULS + ['v1 < 0 || v2 < 0'])

CHASLES = variation(
    REPERE + ', on considère les points $' + point('A', '{{ax}}', '{{ay}}') + '$, $'
    + point('B', '{{bx}}', '{{by}}') + '$ et $' + point('C', '{{cx}}', '{{cy}}') + '$.\n\n'
    'Donne les coordonnées du vecteur $\\overrightarrow{AB}+\\overrightarrow{BC}$.\n\n'
    '$$\\overrightarrow{AB}+\\overrightarrow{BC}\\,?$$',
    [var('ax', '-9..9'), var('ay', '-9..9'), var('bx', '-9..9'), var('by', '-9..9'),
     var('cx', '-9..9'), var('cy', '-9..9')],
    [case_vecteur('{{eval:(cx)-(ax)}}', '{{eval:(cy)-(ay)}}')],
    ['**Relation de Chasles** : $\\overrightarrow{AB}+\\overrightarrow{BC}=\\overrightarrow{AC}$.'
     ' (On peut aussi calculer $\\overrightarrow{AB}$ et $\\overrightarrow{BC}$, puis les additionner.)',
     '$\\overrightarrow{AC}' + colonne('{{cx}}-{{ax;()}}', '{{cy}}-{{ay;()}}') + '$, soit $'
     '\\overrightarrow{AB}+\\overrightarrow{BC}' + col(colonne('{{eval:(cx)-(ax)}}', '{{eval:(cy)-(ay)}}'))
     + '$.'],
    ['cx != ax', 'cy != ay', 'bx != ax', 'bx != cx'])

COMBINAISON = variation(
    DEUX_VECTEURS + 'Donne les coordonnées du vecteur $\\vec{w}={{p}}\\vec{u}{{q;+}}\\vec{v}$.\n\n'
    '$$\\vec{w}\\,?$$',
    VARS_UV + [var('p', '2..4'), var('q', '2..4;±')],
    [case_vecteur('{{eval:(p)*(u1)+(q)*(v1)}}', '{{eval:(p)*(u2)+(q)*(v2)}}')],
    [COORD_PAR_COORD + ' Chaque coordonnée est multipliée par le nombre devant le vecteur.',
     '$\\vec{w}' + colonne('{{p}}\\times{{u1;()}}+{{q;()}}\\times{{v1;()}}',
                           '{{p}}\\times{{u2;()}}+{{q;()}}\\times{{v2;()}}') + '$',
     '$\\vec{w}' + col(colonne('{{eval:(p)*(u1)+(q)*(v1)}}', '{{eval:(p)*(u2)+(q)*(v2)}}')) + '$'],
    NON_NULS + ['abs(u1) <= 6', 'abs(u2) <= 6', 'abs(v1) <= 6', 'abs(v2) <= 6'])

SP_S = {'u1': 3, 'u2': -2, 'v1': -5, 'v2': 4}
SP_C = {'ax': 1, 'ay': 2, 'bx': -3, 'by': 5, 'cx': 4, 'cy': -1}
SP_W = {'u1': 3, 'u2': -2, 'v1': -1, 'v2': 4, 'p': 2, 'q': -3}
MODELES.append(modele(
    '03-coordonnees-d-une-somme', 'Coordonnées d\'une somme de vecteurs',
    'u + v, u − v, AB + BC (Chasles) et 2u − 3v coordonnée par coordonnée (pièges : signe de v'
    ' dans la différence, A − C)',
    ('Géométrie', VECTEURS, 'Coordonnées'), 3,
    [SOMME, DIFFERENCE, CHASLES, COMBINAISON],
    [spec('(3 ; −2) + (−5 ; 4) = (−2 ; 2)', 0, SP_S, '(-2;2)', 'correct'),
     spec('Erreur : différence (8 ; −6)', 0, SP_S, '(8;-6)', 'incorrect'),
     spec('(3 ; −2) − (−5 ; 4) = (8 ; −6)', 1, SP_S, '(8;-6)', 'correct'),
     spec('Erreur : signe de v oublié (−2 ; 2)', 1, SP_S, '(-2;2)', 'incorrect'),
     spec('AB + BC = AC = (3 ; −3)', 2, SP_C, '(3;-3)', 'correct'),
     spec('Erreur : A − C (−3 ; 3)', 2, SP_C, '(-3;3)', 'incorrect'),
     spec('2u − 3v = (9 ; −16)', 3, SP_W, '(9;-16)', 'correct'),
     spec('Erreur : 2u + 3v (3 ; 8)', 3, SP_W, '(3;8)', 'incorrect')]))

# --- 4. 2-436 : produit par un réel ---------------------------------------------------------

UN_VECTEUR = REPERE + ', on considère le vecteur $\\vec{u}' + colonne('{{u1}}', '{{u2}}') + '$.\n\n'
PRODUIT_REGLE = ('$k\\,\\vec{u}' + colonne('k\\,x', 'k\\,y') + '$ : **chaque** coordonnée est'
                 ' multipliée par $k$.')

PRODUIT_ENTIER = variation(
    UN_VECTEUR + 'Donne les coordonnées du vecteur ${{k}}\\vec{u}$.\n\n$${{k}}\\vec{u}\\,?$$',
    [var('u1', '1..9;±'), var('u2', '-9..9'), var('k', '2..5;±')],
    [case_vecteur('{{eval:(k)*(u1)}}', '{{eval:(k)*(u2)}}')],
    [PRODUIT_REGLE,
     '${{k}}\\vec{u}' + colonne('{{k}}\\times{{u1;()}}', '{{k}}\\times{{u2;()}}') + '$, soit ${{k}}\\vec{u}'
     + col(colonne('{{eval:(k)*(u1)}}', '{{eval:(k)*(u2)}}')) + '$.'],
    ['u2 != 0'])

PRODUIT_FRACTION = variation(
    REPERE + ', on considère le vecteur $\\vec{u}' + colonne('{{eval:(q)*(r1)}}', '{{eval:(q)*(r2)}}')
    + '$.\n\nDonne les coordonnées du vecteur ${{if:s==1||-}}\\dfrac{ {{p}} }{ {{q}} }\\vec{u}$.\n\n'
    '$${{if:s==1||-}}\\dfrac{ {{p}} }{ {{q}} }\\vec{u}\\,?$$',
    [var('s', '1|-1'), var('p', '1|2|3'), var('q', '2|3|4|5'), var('r1', '1..4;±'), var('r2', '1..4;±')],
    [case_vecteur('{{eval:(s)*(p)*(r1)}}', '{{eval:(s)*(p)*(r2)}}')],
    [PRODUIT_REGLE + ' Diviser par ${{q}}$ d\'abord rend le calcul simple.',
     '${{if:s==1||-}}\\dfrac{ {{p}} }{ {{q}} }\\times{{eval:(q)*(r1);()}}={{if:s==1||-}}{{p}}\\times{{r1;()}}='
     + col('{{eval:(s)*(p)*(r1)}}') + '$ et ${{if:s==1||-}}\\dfrac{ {{p}} }{ {{q}} }\\times{{eval:(q)*(r2);()}}'
     '={{if:s==1||-}}{{p}}\\times{{r2;()}}=' + col('{{eval:(s)*(p)*(r2)}}', 1) + '$.',
     '$${{if:s==1||-}}\\dfrac{ {{p}} }{ {{q}} }\\vec{u}' + colonne(col('{{eval:(s)*(p)*(r1)}}'),
                                                         col('{{eval:(s)*(p)*(r2)}}', 1)) + '$$'],
    ['p == 1 || mod(q, p) != 0'])

TROUVER_K = variation(
    REPERE + ', on considère les vecteurs $\\vec{u}' + colonne('{{eval:(d)*(r1)}}', '{{eval:(d)*(r2)}}')
    + '$ et $\\vec{v}' + colonne('{{eval:(n)*(r1)}}', '{{eval:(n)*(r2)}}') + '$.\n\n'
    'Détermine le réel $k$ tel que $\\vec{v}=k\\,\\vec{u}$.\n\n$$k=?$$',
    [var('r1', '1..4;±'), var('r2', '1..4;±'), var('d', '1|2'), var('n', '1..5;±')],
    [case('{{if:d==1|{{n}}|\\frac{ {{n}} }{ {{d}} }}}')],
    ['$\\vec{v}=k\\,\\vec{u}$ : chaque coordonnée de $\\vec{v}$ est $k$ fois celle de $\\vec{u}$.'
     ' Avec la première : ${{eval:(n)*(r1)}}=k\\times{{eval:(d)*(r1);()}}$, donc $k=\\dfrac{ {{eval:(n)*(r1)}} }'
     '{ {{eval:(d)*(r1)}} }=' + col('{{eval:(n)/(d)}}') + '$.',
     'On vérifie avec la seconde : ${{eval:(n)/(d);()}}\\times{{eval:(d)*(r2);()}}={{eval:(n)*(r2)}}$.'],
    ['n != d', 'd == 1 || mod(n, 2) != 0'])

SP_PE = {'u1': 3, 'u2': -2, 'k': -4}
SP_PF = {'s': -1, 'p': 2, 'q': 3, 'r1': 2, 'r2': -1}
SP_PK = {'r1': 2, 'r2': -1, 'd': 2, 'n': -3}
MODELES.append(modele(
    '04-produit-par-un-reel', 'Coordonnées du produit d\'un vecteur par un réel',
    'k·u avec k entier relatif, k fraction (−⅔u), puis trouver k tel que v = k·u (pièges : une'
    ' seule coordonnée multipliée, k inversé)',
    ('Géométrie', VECTEURS, 'Coordonnées'), 4,
    [PRODUIT_ENTIER, PRODUIT_FRACTION, TROUVER_K],
    [spec('−4 × (3 ; −2) = (−12 ; 8)', 0, SP_PE, '(-12;8)', 'correct'),
     spec('Erreur : seule l\'abscisse multipliée', 0, SP_PE, '(-12;-2)', 'incorrect'),
     spec('Erreur : signe (−12 ; −8)', 0, SP_PE, '(-12;-8)', 'incorrect'),
     spec('−⅔ × (6 ; −3) = (−4 ; 2)', 1, SP_PF, '(-4;2)', 'correct'),
     spec('Erreur : signe de k oublié', 1, SP_PF, '(4;-2)', 'incorrect'),
     spec('u(4 ; −2), v(−6 ; 3) → k = −3/2', 2, SP_PK, '-\\frac{3}{2}', 'correct'),
     spec('En décimal', 2, SP_PK, '-1.5', 'correct'),
     spec('Erreur : k inversé (−2/3)', 2, SP_PK, '-\\frac{2}{3}', 'incorrect')]))

# --- 5. 2-293 : norme d'un vecteur ----------------------------------------------------------

NORME_REGLE = ('En base orthonormée, $\\|\\vec{u}\\|=\\sqrt{x^2+y^2}$ (théorème de Pythagore).')

# (x, y, x² + y², norme) : entière, √n irréductible, k√m
PYTHAGORE = [(3, 4, 25, '5'), (6, 8, 100, '10'), (5, 12, 169, '13'), (8, 15, 289, '17'),
             (9, 12, 225, '15'), (12, 5, 169, '13')]
IRREDUCTIBLES = [(2, 3, 13), (1, 4, 17), (2, 5, 29), (3, 5, 34), (1, 6, 37), (4, 5, 41), (1, 2, 5),
                 (1, 3, 10), (2, 7, 53), (3, 7, 58)]
SIMPLIFIABLES = [(2, 6, 40, '2', '10'), (2, 4, 20, '2', '5'), (3, 6, 45, '3', '5'), (3, 3, 18, '3', '2'),
                 (4, 4, 32, '4', '2'), (4, 6, 52, '2', '13'), (3, 9, 90, '3', '10'), (6, 4, 52, '2', '13')]
# en dixièmes : (0,6 ; 0,8) → 1
DECIMAUX = [(6, 8, 10), (15, 20, 25), (3, 4, 5), (12, 5, 13), (7, 24, 25), (24, 10, 26)]


def liste(nom, valeurs):
    return var(nom, selon('t', [str(v) for v in valeurs]))


def signe(coord, s):
    return '{{if:' + s + '==1|' + coord + '|-' + coord + '}}'


def carre(coord, s):
    return '{{if:' + s + '==1|' + coord + '|(-' + coord + ')}}^2'


VARS_SIGNES = [var('sx', '1|-1'), var('sy', '1|-1')]


def norme_variation(table, attendu, conclusion, decimal=False):
    n = len(table)
    variables = [var('t', '0..' + str(n - 1))] + VARS_SIGNES + [
        liste('x', [r[0] for r in table]), liste('y', [r[1] for r in table])]
    if not decimal:
        variables.append(liste('c', [r[2] for r in table]))
    if attendu is not None:
        variables += attendu[0]
    x, y = signe('{{x}}', 'sx'), signe('{{y}}', 'sy')
    somme = ('{{c}}' if not decimal else '{{c}}')
    return variation(
        REPERE_ON + ', on considère le vecteur $\\vec{u}' + colonne(x, y) + '$.\n\n'
        'Calcule la norme de $\\vec{u}$ (valeur exacte, sous la forme la plus simple).\n\n'
        '$$\\|\\vec{u}\\|=?$$',
        variables,
        [case(attendu[1])],
        [NORME_REGLE,
         '$$\\|\\vec{u}\\|=\\sqrt{' + carre('{{x}}', 'sx') + '+' + carre('{{y}}', 'sy') + '}=\\sqrt{'
         + somme + '}$$',
         conclusion])


NORME_ENTIERE = norme_variation(
    PYTHAGORE, ([liste('r', [r[3] for r in PYTHAGORE])], '{{r}}'),
    '${{c}}={{r}}^2$, donc $\\|\\vec{u}\\|=' + col('{{r}}') + '$.')
NORME_RACINE = norme_variation(
    IRREDUCTIBLES, ([], '\\sqrt{ {{c}} }'),
    '${{c}}$ n\'a aucun facteur carré autre que $1$ : $\\|\\vec{u}\\|=' + col('\\sqrt{ {{c}} }') + '$.')
NORME_SIMPLIFIER = norme_variation(
    SIMPLIFIABLES, ([liste('k', [r[3] for r in SIMPLIFIABLES]), liste('m', [r[4] for r in SIMPLIFIABLES])],
                    '{{k}}\\sqrt{ {{m}} }'),
    'On simplifie : $\\sqrt{ {{c}} }=\\sqrt{ {{eval:(k)^2}}\\times{{m}} }=\\sqrt{ {{eval:(k)^2}} }\\times'
    '\\sqrt{ {{m}} }$, donc $\\|\\vec{u}\\|=' + col('{{k}}\\sqrt{ {{m}} }') + '$.')

DX, DY, DR = '{{eval:(x)/10;d}}', '{{eval:(y)/10;d}}', '{{eval:(r)/10;d}}'
NORME_DECIMALE = variation(
    REPERE_ON + ', on considère le vecteur $\\vec{u}' + colonne(signe(DX, 'sx'), signe(DY, 'sy'))
    + '$.\n\nCalcule la norme de $\\vec{u}$.\n\n$$\\|\\vec{u}\\|=?$$',
    [var('t', '0..' + str(len(DECIMAUX) - 1))] + VARS_SIGNES + [
        liste('x', [r[0] for r in DECIMAUX]), liste('y', [r[1] for r in DECIMAUX]),
        liste('r', [r[2] for r in DECIMAUX])],
    [case('{{eval:(r)/10}}')],
    [NORME_REGLE,
     '$$\\|\\vec{u}\\|=\\sqrt{' + carre(DX, 'sx') + '+' + carre(DY, 'sy') + '}=\\sqrt{'
     '{{eval:((x)^2+(y)^2)/100;d}}}$$',
     'Or ${{eval:((x)^2+(y)^2)/100;d}}=' + DR + '^2$, donc $\\|\\vec{u}\\|=' + col(DR) + '$.'])

SP_NE = {'t': 0, 'sx': 1, 'sy': -1, 'x': 3, 'y': 4, 'c': 25, 'r': 5}
SP_NR = {'t': 0, 'sx': 1, 'sy': -1, 'x': 2, 'y': 3, 'c': 13}
SP_NS = {'t': 0, 'sx': 1, 'sy': 1, 'x': 2, 'y': 6, 'c': 40, 'k': 2, 'm': 10}
SP_ND = {'t': 0, 'sx': 1, 'sy': 1, 'x': 6, 'y': 8, 'r': 10}
MODELES.append(modele(
    '05-norme-d-un-vecteur', 'Norme d\'un vecteur',
    'Norme en base orthonormée : entière (3 ; 4), √n irréductible, k√m à simplifier (√40 = 2√10),'
    ' coordonnées décimales (pièges : racine oubliée, √(x + y), signe dans le carré)',
    ('Géométrie', VECTEURS, 'Norme et distance'), 1,
    [NORME_ENTIERE, NORME_RACINE, NORME_SIMPLIFIER, NORME_DECIMALE],
    [spec('u(3 ; −4) → 5', 0, SP_NE, '5', 'correct'),
     spec('Erreur : racine oubliée (25)', 0, SP_NE, '25', 'incorrect'),
     spec('Erreur : √(3 − 4)² lu x + y (1)', 0, SP_NE, '1', 'incorrect'),
     spec('u(2 ; −3) → √13', 1, SP_NR, '\\sqrt{13}', 'correct'),
     spec('Erreur : (−3)² = −9, √(4 − 9)', 1, SP_NR, '\\sqrt{-5}', 'incorrect'),
     spec('Erreur : x + y (√5)', 1, SP_NR, '\\sqrt{5}', 'incorrect'),
     spec('u(2 ; 6) → 2√10', 2, SP_NS, '2\\sqrt{10}', 'correct'),
     spec('√40 : juste, à simplifier', 2, SP_NS, '\\sqrt{40}', 'unoptimal_form', ['reducedRadicals']),
     spec('Erreur : 4√10', 2, SP_NS, '4\\sqrt{10}', 'incorrect'),
     spec('u(0,6 ; 0,8) → 1', 3, SP_ND, '1', 'correct'),
     spec('Erreur : x + y (1,4)', 3, SP_ND, '1.4', 'incorrect')]))

# --- 6. 2-301 : distance entre deux points --------------------------------------------------

DISTANCE_REGLE = ('En repère orthonormé, $AB=\\|\\overrightarrow{AB}\\|=\\sqrt{(x_B-x_A)^2+(y_B-y_A)^2}$.')
DEUX_POINTS = (REPERE_ON + ', on considère les points $' + point('A', '{{ax}}', '{{ay}}') + '$ et $'
               + point('B', '{{eval:(ax)+(sx)*(x)}}', '{{eval:(ay)+(sy)*(y)}}') + '$.\n\n')


def distance_variation(table, attendu_vars, attendu, conclusion):
    n = len(table)
    variables = [var('t', '0..' + str(n - 1))] + VARS_SIGNES + [
        liste('x', [r[0] for r in table]), liste('y', [r[1] for r in table]),
        liste('c', [r[2] for r in table])] + attendu_vars + [var('ax', '-6..6'), var('ay', '-6..6')]
    return variation(
        DEUX_POINTS + 'Calcule la distance $AB$ (valeur exacte, sous la forme la plus simple).\n\n$$AB=?$$',
        variables,
        [case(attendu)],
        [DISTANCE_REGLE,
         '$$AB=\\sqrt{\\left({{eval:(ax)+(sx)*(x)}}-{{ax;()}}\\right)^2+\\left({{eval:(ay)+(sy)*(y)}}-{{ay;()}}'
         '\\right)^2}=\\sqrt{' + carre('{{x}}', 'sx') + '+' + carre('{{y}}', 'sy') + '}=\\sqrt{ {{c}} }$$',
         conclusion])


DISTANCE_ENTIERE = distance_variation(
    PYTHAGORE[:3] + [(4, 3, 25, '5'), (8, 6, 100, '10')],
    [liste('r', ['5', '10', '13', '5', '10'])], '{{r}}',
    '${{c}}={{r}}^2$, donc $AB=' + col('{{r}}') + '$.')
DISTANCE_RACINE = distance_variation(
    IRREDUCTIBLES, [], '\\sqrt{ {{c}} }',
    '${{c}}$ n\'a aucun facteur carré autre que $1$ : $AB=' + col('\\sqrt{ {{c}} }') + '$.')

# Isocèle en A : AC⃗ = (sx·q ; sy·p) a la longueur de AB⃗ = (p ; q) ; « non » : (sx·q ; sy·(p + 1))
ISOCELE = variation(
    REPERE_ON + ', on considère les points $' + point('A', '{{ax}}', '{{ay}}') + '$, $'
    + point('B', '{{eval:(ax)+(p)}}', '{{eval:(ay)+(q)}}') + '$ et $'
    + point('C', '{{eval:(ax)+(sx)*(q)}}', '{{eval:(ay)+(sy)*(p)+(w)*(sy)}}') + '$.\n\n'
    'Le triangle $ABC$ est-il isocèle en $A$ ?\n\n```choix\nmelanger: non\n- Oui\n- Non\n```',
    [var('p', '1..5;±'), var('q', '1..5;±'), var('sx', '1|-1'), var('sy', '1|-1'), var('w', '0|1'),
     var('ax', '-5..5'), var('ay', '-5..5')],
    [case('{{w}}')],
    ['Le triangle est isocèle en $A$ si $AB=AC$ : on compare $AB^2$ et $AC^2$ (sans racine, c\'est plus'
     ' simple).',
     '$AB^2={{p;()}}^2+{{q;()}}^2=' + col('{{eval:(p)^2+(q)^2}}') + '$ et $AC^2={{eval:(sx)*(q);()}}^2+'
     '{{eval:(sy)*(p)+(w)*(sy);()}}^2=' + col('{{eval:(q)^2+((p)+(w))^2}}', 1) + '$.',
     '{{if:w==0|$AB^2=AC^2$, donc $AB=AC$ : **le triangle est isocèle en $A$**.|$AB^2\\neq AC^2$,'
     ' donc $AB\\neq AC$ : **le triangle n\'est pas isocèle en $A$**.}}'],
    ['abs(p) != abs(q)', 'p+w != 0', '(p)*(sy)*((p)+(w)) - (q)*(sx)*(q) != 0'])

SP_DE = {'t': 0, 'sx': 1, 'sy': -1, 'x': 3, 'y': 4, 'c': 25, 'r': 5, 'ax': 1, 'ay': 2}
SP_DR = {'t': 0, 'sx': -1, 'sy': 1, 'x': 2, 'y': 3, 'c': 13, 'ax': 1, 'ay': -2}
SP_IO = {'p': 3, 'q': 1, 'sx': -1, 'sy': 1, 'w': 0, 'ax': 0, 'ay': 0}
SP_IN = {'p': 3, 'q': 1, 'sx': -1, 'sy': 1, 'w': 1, 'ax': 0, 'ay': 0}
MODELES.append(modele(
    '06-distance-entre-deux-points', 'Distance entre deux points',
    'AB en repère orthonormé (entière, √n), puis « ABC isocèle en A ? » par AB² et AC² (pièges :'
    ' racine oubliée, différences non élevées au carré)',
    ('Géométrie', VECTEURS, 'Norme et distance'), 2,
    [DISTANCE_ENTIERE, DISTANCE_RACINE, ISOCELE],
    [spec('A(1 ; 2), B(4 ; −2) → 5', 0, SP_DE, '5', 'correct'),
     spec('Erreur : racine oubliée (25)', 0, SP_DE, '25', 'incorrect'),
     spec('Erreur : somme des différences (−1)', 0, SP_DE, '-1', 'incorrect'),
     spec('A(1 ; −2), B(−1 ; 1) → √13', 1, SP_DR, '\\sqrt{13}', 'correct'),
     spec('Erreur : √(2 + 3)', 1, SP_DR, '\\sqrt{5}', 'incorrect'),
     spec('AB² = AC² = 10 : oui', 2, SP_IO, '0', 'correct'),
     spec('AB² = AC² : « non » faux', 2, SP_IO, '1', 'incorrect'),
     spec('AB² = 10, AC² = 17 : non', 2, SP_IN, '1', 'correct')]))

# --- 7. 2-302 : coordonnées du milieu -------------------------------------------------------

MILIEU_REGLE = ('Le milieu $I$ de $[AB]$ a pour coordonnées les **moyennes** de celles de $A$ et $B$ :'
                ' $x_I=\\dfrac{x_A+x_B}{2}$ et $y_I=\\dfrac{y_A+y_B}{2}$.')

MILIEU = variation(
    REPERE + ', on considère les points $' + point('A', '{{ax}}', '{{ay}}') + '$ et $'
    + point('B', '{{bx}}', '{{by}}') + '$.\n\nDonne les coordonnées du milieu $I$ du segment $[AB]$.'
    '\n\n$$' + point('I', '?', '?') + '$$',
    [var('ax', '-9..9'), var('ay', '-9..9'), var('bx', '-9..9'), var('by', '-9..9')],
    [case('{{eval:((ax)+(bx))/2}}'), case('{{eval:((ay)+(by))/2}}')],
    [MILIEU_REGLE,
     '$x_I=\\dfrac{ {{ax}}+{{bx;()}} }{2}=' + col('{{eval:((ax)+(bx))/2;d}}') + '$ et $y_I=\\dfrac{ {{ay}}+'
     '{{by;()}} }{2}=' + col('{{eval:((ay)+(by))/2;d}}', 1) + '$.'],
    ['bx != ax', 'by != ay', 'mod(ax+bx, 2) != 0 || mod(ay+by, 2) != 0'])

SYMETRIQUE = variation(
    REPERE + ', on considère les points $' + point('A', '{{ax}}', '{{ay}}') + '$ et $'
    + point('I', '{{ix}}', '{{iy}}') + '$. Le point $I$ est le milieu du segment $[AB]$.\n\n'
    'Donne les coordonnées du point $B$.\n\n$$' + point('B', '?', '?') + '$$',
    [var('ax', '-9..9'), var('ay', '-9..9'), var('ix', '-6..6'), var('iy', '-6..6')],
    [case('{{eval:2*(ix)-(ax)}}'), case('{{eval:2*(iy)-(ay)}}')],
    [MILIEU_REGLE + ' Ici on connaît $x_I$ et $x_A$ : on cherche $x_B$.',
     '$\\dfrac{ {{ax}}+x_B}{2}={{ix}}$, donc ${{ax}}+x_B={{eval:2*(ix)}}$ et $x_B={{eval:2*(ix)}}-{{ax;()}}='
     + col('{{eval:2*(ix)-(ax)}}') + '$.',
     'De même, $y_B={{eval:2*(iy)}}-{{ay;()}}=' + col('{{eval:2*(iy)-(ay)}}', 1) + '$.'],
    ['ix != ax', 'iy != ay', 'abs(2*(ix)-(ax)) <= 12', 'abs(2*(iy)-(ay)) <= 12'])

CENTRE = variation(
    REPERE + ', $ABCD$ est un parallélogramme, avec $' + point('A', '{{ax}}', '{{ay}}') + '$ et $'
    + point('C', '{{cx}}', '{{cy}}') + '$.\n\nDonne les coordonnées de son centre $O\'$.\n\n$$'
    + point('O\'', '?', '?') + '$$',
    [var('ax', '-9..9'), var('ay', '-9..9'), var('cx', '-9..9'), var('cy', '-9..9')],
    [case('{{eval:((ax)+(cx))/2}}'), case('{{eval:((ay)+(cy))/2}}')],
    ['Les diagonales d\'un parallélogramme se coupent en leur milieu : le centre $O\'$ est le milieu'
     ' de $[AC]$.',
     MILIEU_REGLE.replace('$[AB]$', '$[AC]$').replace('$I$', '$O\'$').replace('x_I', 'x_{O\'}')
     .replace('y_I', 'y_{O\'}').replace('x_B', 'x_C').replace('y_B', 'y_C').replace('$B$', '$C$'),
     '$x_{O\'}=\\dfrac{ {{ax}}+{{cx;()}} }{2}=' + col('{{eval:((ax)+(cx))/2;d}}') + '$ et $y_{O\'}=\\dfrac{'
     ' {{ay}}+{{cy;()}} }{2}=' + col('{{eval:((ay)+(cy))/2;d}}', 1) + '$.'],
    ['abs(cx-ax) >= 2', 'abs(cy-ay) >= 2'])

SP_MI = {'ax': 3, 'ay': -1, 'bx': -2, 'by': 5}
SP_MS = {'ax': 3, 'ay': -1, 'ix': 1, 'iy': 2}
SP_MC = {'ax': -1, 'ay': 4, 'cx': 5, 'cy': -3}
MODELES.append(modele(
    '07-coordonnees-du-milieu', 'Coordonnées du milieu d\'un segment',
    'Milieu de [AB], extrémité B connaissant A et le milieu, centre d\'un parallélogramme'
    ' (pièges : différence / 2, moitié de x_I)',
    ('Géométrie', VECTEURS, 'Milieu'), 1,
    [MILIEU, SYMETRIQUE, CENTRE],
    [spec('A(3 ; −1), B(−2 ; 5) → I(0,5 ; 2)', 0, SP_MI, ['0.5', '2'], 'correct'),
     spec('En fraction', 0, SP_MI, ['\\frac{1}{2}', '2'], 'correct'),
     spec('Erreur : différence / 2 (−2,5 ; 3)', 0, SP_MI, ['-2.5', '3'], 'incorrect'),
     spec('A(3 ; −1), I(1 ; 2) → B(−1 ; 5)', 1, SP_MS, ['-1', '5'], 'correct'),
     spec('Erreur : milieu de [AI] (2 ; 0,5)', 1, SP_MS, ['2', '0.5'], 'incorrect'),
     spec('A(−1 ; 4), C(5 ; −3) → O\'(2 ; 0,5)', 2, SP_MC, ['2', '0.5'], 'correct'),
     spec('Erreur : (3 ; −3,5)', 2, SP_MC, ['3', '-3.5'], 'incorrect')]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
