"""Écrit les 4 modèles du lot 4 B « Vecteurs en coordonnées : déterminant et colinéarité » de la 2de
dans scripts/questions/2de-vecteurs-b/.

Phase 0 validée par David le 2026-10-29 (§ 23 du journal `docs/wip/questions-2de-progress.md`).
Bornes : `bornes/lycee/2de.json` (2-295 en base orthonormée ; 2-435, 2-303, 2-437 : critère de
colinéarité, déterminant nul ou proportionnalité des coordonnées). Un point par modèle ; le nœud et
le tag sont posés par la migration de rangement, après le `--publier` de David.

Décisions et pièges :
- L4-a : lot 4 B après le 4 A (même catégorie, sous-catégorie « Colinéarité ») ;
- L4-d : « colinéaires ? », « alignés ? », « parallèles ? » en case choix (Oui = 0, Non = 1), chaque
  modèle garde une variation à calcul (trouver m, x) ;
- « non » tiré en décalant d'une unité une coordonnée d'un cas colinéaire : le déterminant vaut alors
  ± une coordonnée, jamais 0 (conditions) ;
- les variables sont substituées telles quelles dans les `eval` : toujours `(a)`, `-(a)` ;
- variables `e` et `i` interdites.

    python3 docs/wip/questions-2de/lot-vecteurs-b-2de.py scripts/questions/2de-vecteurs-b
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


def modele(nom, title, description, level, variations, specs, delay=90):
    m = {'title': title, 'description': description, 'grades': ['2'], 'theme': 'Géométrie',
         'domain': 'Vecteurs du plan', 'subdomain': 'Colinéarité', 'level': level, 'delay': delay,
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


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def colonne(x, y):
    return '\\begin{pmatrix}' + x + '\\\\' + y + '\\end{pmatrix}'


def point(nom, x, y):
    return nom + '(' + x + '\\,;\\,' + y + ')'


def choix(question):
    return question + '\n\n```choix\nmelanger: non\n- Oui\n- Non\n```'


def det(x, y, xp, yp):
    """Le calcul `x × y′ − y × x′` écrit avec les parenthèses des négatifs."""
    return x + '\\times' + yp + '-' + y + '\\times' + xp


MODELES = []
REPERE_ON = 'Dans un repère orthonormé $(O\\,;\\vec{i},\\vec{j})$'
DEF_DET = ('$\\det(\\vec{u},\\vec{v})=\\begin{vmatrix}x&x\'\\\\y&y\'\\end{vmatrix}=xy\'-yx\'$ : produit en'
           ' croix, **différence** des deux produits.')
CRITERE = ('**Critère de colinéarité** : $\\vec{u}$ et $\\vec{v}$ sont colinéaires si et seulement si'
           ' $\\det(\\vec{u},\\vec{v})=0$.')
DEUX_VECTEURS = (REPERE_ON + ', on considère les vecteurs $\\vec{u}' + colonne('{{u1}}', '{{u2}}')
                 + '$ et $\\vec{v}' + colonne('{{v1}}', '{{v2}}') + '$.\n\n')
VARS_UV = [var('u1', '-9..9'), var('u2', '-9..9'), var('v1', '-9..9'), var('v2', '-9..9')]

# --- 8. 2-295 : déterminant de deux vecteurs -------------------------------------------------

DET_ENTIER = variation(
    DEUX_VECTEURS + 'Calcule $\\det(\\vec{u},\\vec{v})$.\n\n$$\\det(\\vec{u},\\vec{v})=?$$',
    VARS_UV,
    [case('{{eval:(u1)*(v2)-(u2)*(v1)}}')],
    [DEF_DET,
     '$$\\det(\\vec{u},\\vec{v})=' + det('{{u1;()}}', '{{u2;()}}', '{{v1;()}}', '{{v2;()}}') + '='
     + '{{eval:(u1)*(v2)}}-{{eval:(u2)*(v1);()}}=' + col('{{eval:(u1)*(v2)-(u2)*(v1)}}') + '$$'],
    ['u1 != 0', 'u2 != 0', 'v1 != 0', 'v2 != 0', '(u1)*(v2)-(u2)*(v1) != 0'])

DET_FRACTION = variation(
    REPERE_ON + ', on considère les vecteurs $\\vec{u}' + colonne('\\dfrac{ {{p}} }{ {{q}} }', '{{u2}}')
    + '$ et $\\vec{v}' + colonne('{{v1}}', '{{eval:(q)*(r)}}') + '$.\n\nCalcule $\\det(\\vec{u},\\vec{v})$.'
    '\n\n$$\\det(\\vec{u},\\vec{v})=?$$',
    [var('p', '1|2|3'), var('q', '2|3|4|5'), var('u2', '1..9;±'), var('v1', '1..9;±'), var('r', '1..3;±')],
    [case('{{eval:(p)*(r)-(u2)*(v1)}}')],
    [DEF_DET,
     '$$\\det(\\vec{u},\\vec{v})=\\dfrac{ {{p}} }{ {{q}} }\\times{{eval:(q)*(r);()}}-{{u2;()}}\\times{{v1;()}}'
     '={{eval:(p)*(r)}}-{{eval:(u2)*(v1);()}}=' + col('{{eval:(p)*(r)-(u2)*(v1)}}') + '$$'],
    ['p == 1 || mod(q, p) != 0', '(p)*(r)-(u2)*(v1) != 0'])

DET_POINTS = variation(
    REPERE_ON + ', on considère les points $' + point('A', '{{ax}}', '{{ay}}') + '$, $'
    + point('B', '{{bx}}', '{{by}}') + '$ et $' + point('C', '{{cx}}', '{{cy}}') + '$.\n\n'
    'Calcule $\\det(\\overrightarrow{AB},\\overrightarrow{AC})$.\n\n'
    '$$\\det(\\overrightarrow{AB},\\overrightarrow{AC})=?$$',
    [var('ax', '-6..6'), var('ay', '-6..6'), var('bx', '-6..6'), var('by', '-6..6'), var('cx', '-6..6'),
     var('cy', '-6..6')],
    [case('{{eval:((bx)-(ax))*((cy)-(ay))-((by)-(ay))*((cx)-(ax))}}')],
    ['On calcule d\'abord les coordonnées des deux vecteurs : $\\overrightarrow{AB}'
     + colonne('{{eval:(bx)-(ax)}}', '{{eval:(by)-(ay)}}') + '$ et $\\overrightarrow{AC}'
     + colonne('{{eval:(cx)-(ax)}}', '{{eval:(cy)-(ay)}}') + '$.',
     DEF_DET,
     '$$\\det(\\overrightarrow{AB},\\overrightarrow{AC})=' + det(
         '{{eval:(bx)-(ax);()}}', '{{eval:(by)-(ay);()}}', '{{eval:(cx)-(ax);()}}', '{{eval:(cy)-(ay);()}}')
     + '=' + col('{{eval:((bx)-(ax))*((cy)-(ay))-((by)-(ay))*((cx)-(ax))}}') + '$$'],
    ['bx != ax', 'by != ay', 'cx != ax', 'cy != ay', 'cx != bx',
     '((bx)-(ax))*((cy)-(ay))-((by)-(ay))*((cx)-(ax)) != 0'])

SP_DE = {'u1': 3, 'u2': -2, 'v1': 4, 'v2': 5}
SP_DF = {'p': 1, 'q': 2, 'u2': 3, 'v1': -2, 'r': 2}
SP_DP = {'ax': 1, 'ay': 2, 'bx': 4, 'by': 3, 'cx': -1, 'cy': 5}
MODELES.append(modele(
    '08-determinant', 'Déterminant de deux vecteurs',
    'det(u, v) = xy′ − yx′ en base orthonormée : coordonnées entières, une fraction, puis det(AB, AC)'
    ' à partir de trois points (pièges : somme au lieu de différence, produits mal croisés)', 1,
    [DET_ENTIER, DET_FRACTION, DET_POINTS],
    [spec('det((3 ; −2), (4 ; 5)) = 23', 0, SP_DE, '23', 'correct'),
     spec('Erreur : somme des produits (7)', 0, SP_DE, '7', 'incorrect'),
     spec('Erreur : ordre inversé (−23)', 0, SP_DE, '-23', 'incorrect'),
     spec('Erreur : produits non croisés (3×4 − (−2)×5 = 22)', 0, SP_DE, '22', 'incorrect'),
     spec('det((1/2 ; 3), (−2 ; 4)) = 8', 1, SP_DF, '8', 'correct'),
     spec('Erreur : somme (−4)', 1, SP_DF, '-4', 'incorrect'),
     spec('AB(3 ; 1), AC(−2 ; 3) → 11', 2, SP_DP, '11', 'correct'),
     spec('Erreur : signe (−11)', 2, SP_DP, '-11', 'incorrect')]))

# --- 9. 2-435 : critère de colinéarité -------------------------------------------------------

# Colinéaires : v = (k·r1 ; k·r2), u = (d·r1 ; d·r2) ; « non » : v2 décalé de 1
COLINEAIRES = variation(
    REPERE_ON + ', on considère les vecteurs $\\vec{u}' + colonne('{{eval:(d)*(r1)}}', '{{eval:(d)*(r2)}}')
    + '$ et $\\vec{v}' + colonne('{{eval:(k)*(r1)}}', '{{eval:(k)*(r2)+(w)}}') + '$.\n\n'
    + choix('Les vecteurs $\\vec{u}$ et $\\vec{v}$ sont-ils colinéaires ?'),
    [var('r1', '1..4;±'), var('r2', '1..4;±'), var('d', '1|2'), var('k', '2..4;±'), var('w', '0|1')],
    [case('{{w}}')],
    [CRITERE,
     '$$\\det(\\vec{u},\\vec{v})=' + det('{{eval:(d)*(r1);()}}', '{{eval:(d)*(r2);()}}', '{{eval:(k)*(r1);()}}',
                                        '{{eval:(k)*(r2)+(w);()}}')
     + '={{eval:(d)*(r1)*((k)*(r2)+(w))}}-{{eval:(d)*(r2)*(k)*(r1);()}}='
     + col('{{eval:(d)*(r1)*(w)}}') + '$$',
     '{{if:w==0|Le déterminant est nul : **les vecteurs sont colinéaires**.|Le déterminant n\'est pas nul :'
     ' **les vecteurs ne sont pas colinéaires**.}}'],
    ['k != d'])

TROUVER_M = variation(
    REPERE_ON + ', on considère les vecteurs $\\vec{u}' + colonne('m', '{{u2}}') + '$ et $\\vec{v}'
    + colonne('{{v1}}', '{{v2}}') + '$, où $m$ est un réel.\n\nDétermine $m$ pour que $\\vec{u}$ et'
    ' $\\vec{v}$ soient colinéaires.\n\n$$m=?$$',
    [var('u2', '1..6;±'), var('v1', '1..9;±'), var('v2', '1..6;±')],
    [case('{{eval:(u2)*(v1)/(v2)}}')],
    [CRITERE,
     '$$\\det(\\vec{u},\\vec{v})=m\\times{{v2;()}}-{{u2;()}}\\times{{v1;()}}={{v2}}m{{eval:-(u2)*(v1);+}}$$',
     'On résout ${{v2}}m{{eval:-(u2)*(v1);+}}=0$ : ${{v2}}m={{eval:(u2)*(v1)}}$, donc $m='
     + col('{{eval:(u2)*(v1)/(v2)}}') + '$.'],
    ['abs(v2) != 1', 'abs(u2) != abs(v2)'])

SP_CO = {'r1': 2, 'r2': -1, 'd': 1, 'k': 3, 'w': 0}
SP_CN = {'r1': 2, 'r2': -1, 'd': 1, 'k': 3, 'w': 1}
SP_CM = {'u2': 3, 'v1': 4, 'v2': 6}
SP_CF = {'u2': 2, 'v1': 3, 'v2': 4}
MODELES.append(modele(
    '09-critere-de-colinearite', 'Critère de colinéarité',
    'u et v colinéaires ? par le déterminant (case choix), puis trouver m pour que u(m ; a) et v(b ; c)'
    ' soient colinéaires (pièges : déterminant nul lu « non », m = b·c/a)', 2,
    [COLINEAIRES, TROUVER_M],
    [spec('u(2 ; −1), v(6 ; −3) : oui', 0, SP_CO, '0', 'correct'),
     spec('Déterminant nul : « non » faux', 0, SP_CO, '1', 'incorrect'),
     spec('u(2 ; −1), v(6 ; −2) : non', 0, SP_CN, '1', 'correct'),
     spec('u(m ; 3), v(4 ; 6) → m = 2', 1, SP_CM, '2', 'correct'),
     spec('Erreur : m = 6 × 4 / 3 = 8', 1, SP_CM, '8', 'incorrect'),
     spec('u(m ; 2), v(3 ; 4) → m = 3/2', 1, SP_CF, '\\frac{3}{2}', 'correct'),
     spec('En décimal 1,5', 1, SP_CF, '1.5', 'correct'),
     spec('Fraction non simplifiée 6/4', 1, SP_CF, '\\frac{6}{4}', 'unoptimal_form', ['reducedFractions'])]))

# --- 10. 2-303 : alignement ------------------------------------------------------------------

TROIS_POINTS = (REPERE_ON + ', on considère les points $' + point('A', '{{ax}}', '{{ay}}') + '$, $'
                + point('B', '{{eval:(ax)+(r1)}}', '{{eval:(ay)+(r2)}}') + '$ et $'
                + point('C', '{{eval:(ax)+(k)*(r1)}}', '{{eval:(ay)+(k)*(r2)+(w)}}') + '$.\n\n')
ALIGNES_REGLE = ('$A$, $B$, $C$ sont alignés si et seulement si $\\overrightarrow{AB}$ et'
                 ' $\\overrightarrow{AC}$ sont colinéaires, c\'est-à-dire'
                 ' $\\det(\\overrightarrow{AB},\\overrightarrow{AC})=0$.')

ALIGNES = variation(
    TROIS_POINTS + choix('Les points $A$, $B$ et $C$ sont-ils alignés ?'),
    [var('ax', '-5..5'), var('ay', '-5..5'), var('r1', '1..3;±'), var('r2', '1..3;±'), var('k', '2|3|-1|-2'),
     var('w', '0|1')],
    [case('{{w}}')],
    [ALIGNES_REGLE,
     '$\\overrightarrow{AB}' + colonne('{{r1}}', '{{r2}}') + '$ et $\\overrightarrow{AC}'
     + colonne('{{eval:(k)*(r1)}}', '{{eval:(k)*(r2)+(w)}}') + '$.',
     '$$\\det(\\overrightarrow{AB},\\overrightarrow{AC})=' + det('{{r1;()}}', '{{r2;()}}', '{{eval:(k)*(r1);()}}',
                                                                  '{{eval:(k)*(r2)+(w);()}}')
     + '=' + col('{{eval:(r1)*(w)}}') + '$$',
     '{{if:w==0|Le déterminant est nul : **les points sont alignés**.|Le déterminant n\'est pas nul :'
     ' **les points ne sont pas alignés**.}}'],
    ['abs(ay+(k)*(r2)+w) <= 12', 'abs(ax+(k)*(r1)) <= 12'])

ABSCISSE = variation(
    REPERE_ON + ', on considère les points $' + point('A', '{{ax}}', '{{ay}}') + '$, $'
    + point('B', '{{eval:(ax)+(r1)}}', '{{eval:(ay)+(r2)}}') + '$ et $'
    + point('C', 'x', '{{eval:(ay)+(k)*(r2)}}') + '$, où $x$ est un réel.\n\n'
    'Détermine $x$ pour que les points $A$, $B$ et $C$ soient alignés.\n\n$$x=?$$',
    [var('ax', '-5..5'), var('ay', '-5..5'), var('r1', '1..4;±'), var('r2', '1..3;±'), var('k', '2|3|-1|-2')],
    [case('{{eval:(ax)+(k)*(r1)}}')],
    [ALIGNES_REGLE,
     '$\\overrightarrow{AB}' + colonne('{{r1}}', '{{r2}}') + '$ et $\\overrightarrow{AC}'
     + colonne('x-{{ax;()}}', '{{eval:(k)*(r2)}}') + '$.',
     '$$\\det(\\overrightarrow{AB},\\overrightarrow{AC})={{r1;()}}\\times{{eval:(k)*(r2);()}}-{{r2;()}}'
     '\\times\\left(x-{{ax;()}}\\right)$$',
     'Il est nul si et seulement si ${{r2;()}}\\left(x-{{ax;()}}\\right)={{eval:(r1)*(k)*(r2)}}$, soit $x-{{ax;()}}'
     '={{eval:(k)*(r1)}}$ et $x=' + col('{{eval:(ax)+(k)*(r1)}}') + '$.'],
    ['ax != 0', 'abs(r2) != 1', 'abs(ax+(k)*(r1)) <= 12', 'abs(ay+(k)*(r2)) <= 12'])

SP_AO = {'ax': 1, 'ay': -2, 'r1': 2, 'r2': 1, 'k': 3, 'w': 0}
SP_AN = {'ax': 1, 'ay': -2, 'r1': 2, 'r2': 1, 'k': 3, 'w': 1}
SP_AX = {'ax': 1, 'ay': -2, 'r1': 2, 'r2': 2, 'k': 3}
MODELES.append(modele(
    '10-alignement', 'Trois points alignés ?',
    'A, B, C alignés ? par det(AB, AC) (case choix), puis l\'abscisse de C qui les aligne (pièges :'
    ' déterminant de A, B, C au lieu de AB, AC ; x = coordonnée de AC sans ajouter x_A)', 3,
    [ALIGNES, ABSCISSE],
    [spec('A(1 ; −2), B(3 ; −1), C(7 ; 1) : alignés', 0, SP_AO, '0', 'correct'),
     spec('Alignés : « non » faux', 0, SP_AO, '1', 'incorrect'),
     spec('C(7 ; 2) : non alignés', 0, SP_AN, '1', 'correct'),
     spec('B(3 ; 0), C(x ; 4) → x = 7', 1, SP_AX, '7', 'correct'),
     spec('Erreur : x_A non ajouté (6)', 1, SP_AX, '6', 'incorrect')]))

# --- 11. 2-437 : parallélisme ----------------------------------------------------------------

PARALLELES_REGLE = ('$(AB)$ et $(CD)$ sont parallèles si et seulement si $\\overrightarrow{AB}$ et'
                    ' $\\overrightarrow{CD}$ sont colinéaires, c\'est-à-dire'
                    ' $\\det(\\overrightarrow{AB},\\overrightarrow{CD})=0$.')
QUATRE_POINTS = (REPERE_ON + ', on considère les points $' + point('A', '{{ax}}', '{{ay}}') + '$, $'
                 + point('B', '{{eval:(ax)+(r1)}}', '{{eval:(ay)+(r2)}}') + '$, $'
                 + point('C', '{{cx}}', '{{cy}}') + '$ et $')

PARALLELES = variation(
    QUATRE_POINTS + point('D', '{{eval:(cx)+(k)*(r1)}}', '{{eval:(cy)+(k)*(r2)+(w)}}') + '$.\n\n'
    + choix('Les droites $(AB)$ et $(CD)$ sont-elles parallèles ?'),
    [var('ax', '-5..5'), var('ay', '-5..5'), var('r1', '1..3;±'), var('r2', '1..3;±'), var('cx', '-5..5'),
     var('cy', '-5..5'), var('k', '2|3|-1|-2'), var('w', '0|1')],
    [case('{{w}}')],
    [PARALLELES_REGLE,
     '$\\overrightarrow{AB}' + colonne('{{r1}}', '{{r2}}') + '$ et $\\overrightarrow{CD}'
     + colonne('{{eval:(k)*(r1)}}', '{{eval:(k)*(r2)+(w)}}') + '$.',
     '$$\\det(\\overrightarrow{AB},\\overrightarrow{CD})=' + det('{{r1;()}}', '{{r2;()}}', '{{eval:(k)*(r1);()}}',
                                                                  '{{eval:(k)*(r2)+(w);()}}')
     + '=' + col('{{eval:(r1)*(w)}}') + '$$',
     '{{if:w==0|Le déterminant est nul : **les droites sont parallèles**.|Le déterminant n\'est pas nul :'
     ' **les droites ne sont pas parallèles**.}}'],
    # C hors de (AB) : sinon les droites seraient confondues
    ['(r1)*((cy)-(ay)) - (r2)*((cx)-(ax)) != 0', 'abs(cx+(k)*(r1)) <= 12', 'abs(cy+(k)*(r2)+w) <= 12'])

ORDONNEE = variation(
    QUATRE_POINTS + point('D', '{{eval:(cx)+(k)*(r1)}}', 'm') + '$, où $m$ est un réel.\n\n'
    'Détermine $m$ pour que les droites $(AB)$ et $(CD)$ soient parallèles.\n\n$$m=?$$',
    [var('ax', '-5..5'), var('ay', '-5..5'), var('r1', '1..3;±'), var('r2', '1..3;±'), var('cx', '-5..5'),
     var('cy', '-5..5'), var('k', '2|3|-1|-2')],
    [case('{{eval:(cy)+(k)*(r2)}}')],
    [PARALLELES_REGLE,
     '$\\overrightarrow{AB}' + colonne('{{r1}}', '{{r2}}') + '$ et $\\overrightarrow{CD}'
     + colonne('{{eval:(k)*(r1)}}', 'm-{{cy;()}}') + '$.',
     '$$\\det(\\overrightarrow{AB},\\overrightarrow{CD})={{r1;()}}\\times\\left(m-{{cy;()}}\\right)-{{r2;()}}'
     '\\times{{eval:(k)*(r1);()}}$$',
     'Il est nul si et seulement si ${{r1;()}}\\left(m-{{cy;()}}\\right)={{eval:(r2)*(k)*(r1)}}$, soit $m-{{cy;()}}'
     '={{eval:(k)*(r2)}}$ et $m=' + col('{{eval:(cy)+(k)*(r2)}}') + '$.'],
    ['(r1)*((cy)-(ay)) - (r2)*((cx)-(ax)) != 0', 'cy != 0', 'abs(r1) != 1', 'abs(cx+(k)*(r1)) <= 12',
     'abs(cy+(k)*(r2)) <= 12'])

SP_PO = {'ax': 0, 'ay': 1, 'r1': 2, 'r2': 1, 'cx': 1, 'cy': -2, 'k': 2, 'w': 0}
SP_PN = {'ax': 0, 'ay': 1, 'r1': 2, 'r2': 1, 'cx': 1, 'cy': -2, 'k': 2, 'w': 1}
SP_PM = {'ax': 0, 'ay': 1, 'r1': 2, 'r2': 1, 'cx': 1, 'cy': -2, 'k': 2}
MODELES.append(modele(
    '11-parallelisme', 'Deux droites parallèles ?',
    '(AB) et (CD) parallèles ? par det(AB, CD) (case choix), puis l\'ordonnée de D qui les rend'
    ' parallèles (pièges : déterminant nul lu « non », y_C non ajouté)', 4,
    [PARALLELES, ORDONNEE],
    [spec('AB(2 ; 1), CD(4 ; 2) : parallèles', 0, SP_PO, '0', 'correct'),
     spec('Parallèles : « non » faux', 0, SP_PO, '1', 'incorrect'),
     spec('CD(4 ; 3) : non parallèles', 0, SP_PN, '1', 'correct'),
     spec('D(5 ; m) → m = 0', 1, SP_PM, '0', 'correct'),
     spec('Erreur : y_C non ajouté (2)', 1, SP_PM, '2', 'incorrect')]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
