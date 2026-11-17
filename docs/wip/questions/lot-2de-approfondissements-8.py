"""Écrit les 5 modèles du lot 8 « approfondissements : géométrie » de la seconde dans
scripts/questions/2de-approfondissements-8/.

Phase 0 validée par David le 2026-11-09 (« je suis tes recos », D5 du journal
« docs/wip/questions-2de-demonstrations-progress.md », § 13), un point par modèle ; 2-309 n'a
pas de modèle neuf : réemploi de `d4db2207` (médianes, 1re spé), qui reçoit le niveau seconde et
le tag par la migration du lot.

| # | Point | Titre                                                  | Sous-notion (prod), niveau                         |
| 1 | 2-305 | Barycentre de deux ou trois points                     | Vecteurs › combinaison linéaire, 3                 |
| 2 | 2-306 | Démontrer la formule des coordonnées du milieu         | Géométrie repérée › milieu et distance, 4          |
| 3 | 2-307 | Démontrer que les hauteurs sont concourantes           | Figures planes › triangles, 3                      |
| 4 | 2-308 | Aire d'un triangle : ½ ab sin C                        | Aires › triangle quelconque, 4                     |
| 5 | 2-310 | Démontrer que les médiatrices sont concourantes        | Figures planes › médiatrice et bissectrice, 4      |

Forme (D5, Q2) : 305 en exercice d'application à valeurs tirées ; 306, 307, 308, 310 sont des
preuves : à trous (case, case choix à 4 propositions, la première est la bonne, l'affichage les
mélange) et une variation « étapes à ranger » (`signe: aucun`) ; 306 et 308 ont aussi une
application. 307 par la preuve de seconde sans produit scalaire (ABC triangle des milieux de PQR :
hauteurs de ABC = médiatrices de PQR, renvoi au 310). Niveaux : après ceux déjà présents sur la
sous-notion (relevé prod du 2026-11-09 : 1-2, 1-3, 1-2, 1-3, 1-3).

    python3 docs/wip/questions/lot-2de-approfondissements-8.py scripts/questions/2de-approfondissements-8
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, answer, status, variables=None, violations=None):
    expected = {'status': status}
    if status in ('bad_form', 'unoptimal_form'):
        expected['constraintViolations'] = violations or ['form']
    answers = answer if isinstance(answer, list) else [answer]
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in (variables or {}).items()},
            'answers': answers, 'expected': expected}


def modele(nom, title, description, level, variations, specs):
    return nom, {'title': title, 'description': description, 'grades': ['2'],
                 'level': level, 'delay': 90, 'status': 'draft',
                 'shared': {},
                 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def ev(x):
    return '{{eval:' + x + '}}'


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def choix(lignes):
    return '\n\n```choix\n' + ''.join('- ' + l + '\n' for l in lignes) + '```'


def case(statement, variables, attendu, steps):
    """Variation à une case ouverte (`?` dans une formule de l'énoncé)."""
    return {'statement': statement, 'variables': variables,
            'blanks': [attendu if isinstance(attendu, dict) else {'expectedAnswer': attendu}],
            'correction': {'steps': steps}}


def justification(statement, variables, bonne, autres, steps):
    """Variation à une case choix : la première proposition est la bonne (index 0)."""
    return {'statement': statement + choix([bonne] + autres), 'variables': variables,
            'blanks': [{'expectedAnswer': '0'}], 'correction': {'steps': steps}}


def ranger(intro, etapes, steps):
    """Variation « étapes à ranger » : étapes données dans le bon ordre."""
    return {'statement': intro + '\n\nRemets les étapes de la démonstration dans l\'ordre.\n\n'
            '```ranger\nsigne: aucun\n' + ''.join('- ' + e + '\n' for e in etapes) + '```',
            'variables': [], 'correction': {'steps': steps}}


def specs_choix(vi, juste, erreurs, variables=None):
    out = [spec(juste, vi, '0', 'correct', variables)]
    for k, erreur in enumerate(erreurs, start=1):
        out.append(spec('Erreur : ' + erreur, vi, str(k), 'incorrect', variables))
    return out


MODELES = []


def vec(x):
    return '\\overrightarrow{' + x + '}'


def pt(nom, x, y):
    return nom + '(' + x + '\\,;\\,' + y + ')'


NUL = '\\vec{0}'

# --- 1. 2-305 : barycentre de deux ou trois points ---------------------------------------------

K = ev('k')
V305_RAPPORT = case(
    'Soit $A$ et $B$ deux points distincts, et $G$ le point tel que $' + vec('GA') + '+' + K
    + '\\,' + vec('GB') + '=' + NUL + '$ ($G$ est le barycentre de $A$ et $B$ affectés des'
    ' coefficients $1$ et $' + K + '$).\n\nComplète.\n\n$' + vec('AG') + '=?\\,' + vec('AB') + '$',
    [var('k', '2..5')], '\\frac{' + K + '}{' + ev('k+1') + '}',
    ['Par Chasles, $' + vec('GB') + '=' + vec('GA') + '+' + vec('AB') + '$, donc $' + vec('GA')
     + '+' + K + '\\,' + vec('GA') + '+' + K + '\\,' + vec('AB') + '=' + NUL + '$.',
     'Soit $' + ev('k+1') + '\\,' + vec('GA') + '=-' + K + '\\,' + vec('AB') + '$, donc $'
     + vec('AG') + '=' + col('\\frac{' + K + '}{' + ev('k+1') + '}') + '\\,' + vec('AB') + '$.'])
XA, YA = ev('xa'), ev('ya')
V305_DEUX = case(
    'Dans un repère, on considère les points $' + pt('A', XA, YA) + '$ et $'
    + pt('B', ev('xb'), ev('yb')) + '$. Le point $G$ vérifie $' + vec('GA') + '+2\\,'
    + vec('GB') + '=' + NUL + '$, donc $' + vec('AG') + '=\\frac{2}{3}\\,' + vec('AB') + '$.\n\n'
    'Donne les coordonnées de $G$.\n\n$$G(?\\,;\\,?)$$',
    [var('xa', '-5..5'), var('ya', '-5..5'), var('m1', '-3..3'), var('m2', '-3..3'),
     var('xb', 'eval:(xa)+3*(m1)'), var('yb', 'eval:(ya)+3*(m2)')],
    None,
    ['$' + vec('AB') + '(' + ev('3*m1') + '\\,;\\,' + ev('3*m2') + ')$, donc $\\frac{2}{3}\\,'
     + vec('AB') + '(' + ev('2*m1') + '\\,;\\,' + ev('2*m2') + ')$.',
     '$x_G=' + XA + ev('2*m1;+') + '=' + ev('xa+2*m1') + '$ et $y_G=' + YA + ev('2*m2;+') + '='
     + ev('ya+2*m2') + '$ : $' + col(pt('G', ev('xa+2*m1'), ev('ya+2*m2'))) + '$.'])
V305_DEUX['blanks'] = [{'expectedAnswer': ev('xa+2*m1')}, {'expectedAnswer': ev('ya+2*m2')}]
V305_DEUX['conditions'] = ['m1 != 0']
V305_TROIS = case(
    'Dans un repère, on considère les points $' + pt('A', ev('a1'), ev('a2')) + '$, $'
    + pt('B', ev('b1'), ev('b2')) + '$ et $' + pt('C', ev('c1'), ev('c2')) + '$. Le point $G$'
    ' vérifie $' + vec('GA') + '+' + vec('GB') + '+' + vec('GC') + '=' + NUL + '$ (isobarycentre'
    ' de $A$, $B$ et $C$) : ses coordonnées sont les moyennes de celles de $A$, $B$ et $C$.\n\n'
    'Donne les coordonnées de $G$.\n\n$$G(?\\,;\\,?)$$',
    [var('g1', '-4..4'), var('g2', '-4..4'), var('a1', '-6..6'), var('a2', '-6..6'),
     var('b1', '-6..6'), var('b2', '-6..6'),
     var('c1', 'eval:3*(g1)-(a1)-(b1)'), var('c2', 'eval:3*(g2)-(a2)-(b2)')],
    None,
    ['$x_G=\\frac{x_A+x_B+x_C}{3}=\\frac{' + ev('3*g1') + '}{3}=' + ev('g1') + '$ et'
     ' $y_G=\\frac{y_A+y_B+y_C}{3}=\\frac{' + ev('3*g2') + '}{3}=' + ev('g2') + '$.',
     'Donc $' + col(pt('G', ev('g1'), ev('g2'))) + '$.'])
V305_TROIS['blanks'] = [{'expectedAnswer': ev('g1')}, {'expectedAnswer': ev('g2')}]
V305_TROIS['conditions'] = ['(a1)*(b2)-(a2)*(b1)+(b1)*(c2)-(b2)*(c1)+(c1)*(a2)-(c2)*(a1) != 0']
V305_POSITION = justification(
    'Soit $A$ et $B$ deux points distincts, et $G$ le point tel que $2\\,' + vec('GA') + '+'
    + vec('GB') + '=' + NUL + '$.\n\nOù se trouve $G$ ?',
    [],
    'Sur le segment $[AB]$, au tiers en partant de $A$ : plus près de $A$ que de $B$.',
    ['Sur le segment $[AB]$, plus près de $B$ que de $A$.',
     'Au milieu de $[AB]$.',
     'Sur la droite $(AB)$, hors du segment $[AB]$.'],
    ['Par Chasles, $2\\,' + vec('GA') + '+' + vec('GA') + '+' + vec('AB') + '=' + NUL
     + '$, soit $' + vec('AG') + '=\\frac{1}{3}\\,' + vec('AB') + '$.',
     '$G$ est **au tiers de $[AB]$ en partant de $A$** : le plus gros'
     ' coefficient « attire » $G$ vers son point.'])

MODELES.append(modele(
    '01-barycentre-de-deux-ou-trois-points', 'Barycentre de deux ou trois points',
    'G tel que GA + kGB = 0 : AG = k/(k+1) AB (case, k de 2 à 5) ; coordonnées de G tel que'
    ' GA + 2GB = 0 (deux cases) ; isobarycentre de trois points (deux cases) ; position de G tel'
    ' que 2GA + GB = 0 (case choix)',
    3,
    [V305_RAPPORT, V305_DEUX, V305_TROIS, V305_POSITION],
    [spec('k = 2 : 2/3', 0, '\\frac{2}{3}', 'correct', {'k': 2}),
     spec('Erreur : 1/3', 0, '\\frac{1}{3}', 'incorrect', {'k': 2}),
     spec('Erreur : 1/2', 0, '\\frac{1}{2}', 'incorrect', {'k': 2}),
     spec('k = 3 : 3/4', 0, '\\frac{3}{4}', 'correct', {'k': 3}),
     spec('A(1;2), B(7;−1) : G(5;0)', 1, ['5', '0'], 'correct',
          {'xa': 1, 'ya': 2, 'm1': 2, 'm2': -1, 'xb': 7, 'yb': -1}),
     spec('Erreur : milieu (4;0,5)', 1, ['4', '0.5'], 'incorrect',
          {'xa': 1, 'ya': 2, 'm1': 2, 'm2': -1, 'xb': 7, 'yb': -1}),
     spec('Erreur : au tiers depuis A (3;1)', 1, ['3', '1'], 'incorrect',
          {'xa': 1, 'ya': 2, 'm1': 2, 'm2': -1, 'xb': 7, 'yb': -1}),
     spec('G(1;−2)', 2, ['1', '-2'], 'correct',
          {'g1': 1, 'g2': -2, 'a1': 4, 'a2': 0, 'b1': -3, 'b2': 1, 'c1': 2, 'c2': -7}),
     spec('Erreur : somme sans diviser (3;−6)', 2, ['3', '-6'], 'incorrect',
          {'g1': 1, 'g2': -2, 'a1': 4, 'a2': 0, 'b1': -3, 'b2': 1, 'c1': 2, 'c2': -7})]
    + specs_choix(3, 'au tiers depuis A', ['plus près de B', 'milieu', 'hors du segment'])))

# --- 2. 2-306 : formule des coordonnées du milieu ----------------------------------------------

INTRO_306 = ('Dans un repère, soit $' + pt('A', 'x_A', 'y_A') + '$ et $' + pt('B', 'x_B', 'y_B')
             + '$, et $I$ le milieu de $[AB]$. On démontre que $x_I=\\frac{x_A+x_B}{2}$ et'
             ' $y_I=\\frac{y_A+y_B}{2}$.\n\n')
V306_VECTEURS = justification(
    INTRO_306 + 'Pourquoi a-t-on $' + vec('AI') + '=' + vec('IB') + '$ ?',
    [],
    'Car $I$ est le milieu de $[AB]$ : $' + vec('AI') + '$ et $' + vec('IB') + '$ ont même'
    ' direction, même sens et même longueur.',
    ['Car $AI=IB$ : des longueurs égales suffisent.',
     'Car $' + vec('AI') + '$ et $' + vec('IB') + '$ sont colinéaires.',
     'Car les points $A$, $I$ et $B$ sont alignés.'],
    ['C\'est la caractérisation vectorielle du milieu : ' + '**$I$ milieu de $[AB]$ équivaut à $'
     + vec('AI') + '=' + vec('IB') + '$**' + '.',
     '$AI=IB$ ne suffit pas : tout point de la médiatrice de $[AB]$ la vérifie.',
     'Colinéaires ou alignés ne suffit pas : $I$ pourrait être n\'importe où sur $(AB)$.'])
V306_COEFF = case(
    INTRO_306 + 'Deux vecteurs égaux ont les mêmes coordonnées : $' + vec('AI') + '=' + vec('IB')
    + '$ donne $x_I-x_A=x_B-x_I$. Complète.\n\n$?\\,x_I=x_A+x_B$',
    [], '2',
    ['On ajoute $x_I+x_A$ aux deux membres de $x_I-x_A=x_B-x_I$.',
     'On obtient $' + col('2') + '\\,x_I=x_A+x_B$, puis $x_I=\\frac{x_A+x_B}{2}$.'])
V306_APPLICATION = case(
    'Dans un repère, on considère les points $' + pt('A', XA, YA) + '$ et $'
    + pt('B', ev('xb'), ev('yb')) + '$, et $I$ le milieu de $[AB]$.\n\n'
    'Donne les coordonnées de $I$.\n\n$$I(?\\,;\\,?)$$',
    [var('xa', '-6..6'), var('ya', '-6..6'), var('m1', '-4..4'), var('m2', '-4..4'),
     var('xb', 'eval:(xa)+2*(m1)'), var('yb', 'eval:(ya)+2*(m2)')],
    None,
    ['$x_I=\\frac{x_A+x_B}{2}=\\frac{' + ev('2*xa+2*m1') + '}{2}=' + ev('xa+m1') + '$ et'
     ' $y_I=\\frac{y_A+y_B}{2}=\\frac{' + ev('2*ya+2*m2') + '}{2}=' + ev('ya+m2') + '$.',
     'Donc $' + col(pt('I', ev('xa+m1'), ev('ya+m2'))) + '$.'])
V306_APPLICATION['blanks'] = [{'expectedAnswer': ev('xa+m1')}, {'expectedAnswer': ev('ya+m2')}]
V306_APPLICATION['conditions'] = ['m1 != 0']
V306_RANGER = ranger(
    INTRO_306.strip(),
    ['$I$ est le milieu de $[AB]$, donc $' + vec('AI') + '=' + vec('IB') + '$.',
     'Ces vecteurs égaux ont les mêmes coordonnées : $x_I-x_A=x_B-x_I$ et $y_I-y_A=y_B-y_I$.',
     'Donc $2x_I=x_A+x_B$ et $2y_I=y_A+y_B$.',
     'On divise par $2$ : $x_I=\\frac{x_A+x_B}{2}$ et $y_I=\\frac{y_A+y_B}{2}$.'],
    ['On traduit le milieu par une égalité de vecteurs, puis cette égalité en coordonnées.',
     'Conclusion : $' + col('I\\left(\\frac{x_A+x_B}{2}\\,;\\,\\frac{y_A+y_B}{2}\\right)') + '$.'])

MODELES.append(modele(
    '02-demontrer-formule-du-milieu', 'Démontrer la formule des coordonnées du milieu',
    'Démonstration à trous : AI = IB en vecteurs (case choix), coefficient 2 de 2x_I = x_A + x_B'
    ' (case) ; coordonnées du milieu (deux cases) ; étapes à ranger',
    4,
    [V306_VECTEURS, V306_COEFF, V306_APPLICATION, V306_RANGER],
    specs_choix(0, 'caractérisation vectorielle', ['AI = IB', 'colinéaires', 'alignés'])
    + [spec('2', 1, '2', 'correct'),
       spec('Erreur : 1', 1, '1', 'incorrect'),
       spec('A(1;−3), B(5;1) : I(3;−1)', 2, ['3', '-1'], 'correct',
            {'xa': 1, 'ya': -3, 'm1': 2, 'm2': 2, 'xb': 5, 'yb': 1}),
       spec('Erreur : demi-différence (2;2)', 2, ['2', '2'], 'incorrect',
            {'xa': 1, 'ya': -3, 'm1': 2, 'm2': 2, 'xb': 5, 'yb': 1}),
       spec('Erreur : somme sans diviser (6;−2)', 2, ['6', '-2'], 'incorrect',
            {'xa': 1, 'ya': -3, 'm1': 2, 'm2': 2, 'xb': 5, 'yb': 1})]
    + ['RANGER:3']))

# --- 3. 2-307 : les hauteurs d'un triangle sont concourantes -----------------------------------

INTRO_307 = ('Soit $ABC$ un triangle. Par $A$, on trace la parallèle à $(BC)$ ; par $B$, la'
             ' parallèle à $(AC)$ ; par $C$, la parallèle à $(AB)$. Elles forment un triangle'
             ' $PQR$ tel que $ABCQ$, $ACBR$ et $ABPC$ sont des parallélogrammes. On démontre que'
             ' les trois hauteurs de $ABC$ sont concourantes.\n\n')
V307_PARALLELOGRAMME = justification(
    INTRO_307 + '$ABCQ$ est un parallélogramme. Quelle égalité de vecteurs en déduit-on ?',
    [],
    '$' + vec('AQ') + '=' + vec('BC') + '$',
    ['$' + vec('AQ') + '=' + vec('CB') + '$',
     '$' + vec('AB') + '=' + vec('CQ') + '$',
     '$' + vec('AC') + '=' + vec('BQ') + '$'],
    ['$ABCQ$ parallélogramme : ses côtés opposés $[AQ]$ et $[BC]$ donnent $' + col(vec('AQ') + '='
                                                                                  + vec('BC'))
     + '$, et aussi $' + vec('AB') + '=' + vec('QC') + '$.',
     '$[AC]$ et $[BQ]$ sont les diagonales : elles ont le même milieu, mais $' + vec('AC')
     + '\\neq' + vec('BQ') + '$.'])
V307_OPPOSE = case(
    INTRO_307 + 'On a $' + vec('AQ') + '=' + vec('BC') + '$ (parallélogramme $ABCQ$) et $'
    + vec('AR') + '=' + vec('CB') + '$ (parallélogramme $ACBR$). Complète.\n\n$' + vec('AR')
    + '=?\\,' + vec('AQ') + '$',
    [], '-1',
    ['$' + vec('CB') + '=-' + vec('BC') + '$, donc $' + vec('AR') + '=' + col('-1') + '\\,'
     + vec('AQ') + '$.',
     '$' + vec('AR') + '=-' + vec('AQ') + '$ : $A$ est le milieu de $[QR]$. De même, $B$ est le'
     ' milieu de $[PR]$ et $C$ celui de $[PQ]$.'])
V307_MEDIATRICE = justification(
    INTRO_307 + '$A$ est le milieu de $[QR]$ et $(QR)$ est parallèle à $(BC)$. Pourquoi la'
    ' hauteur de $ABC$ issue de $A$ est-elle la médiatrice de $[QR]$ ?',
    [],
    'Elle passe par $A$, milieu de $[QR]$, et elle est perpendiculaire à $(BC)$, donc à $(QR)$.',
    ['Car elle passe par $A$, milieu de $[QR]$.',
     'Car elle est perpendiculaire à $(BC)$.',
     'Car $ABC$ et $PQR$ sont des triangles.'],
    ['La médiatrice de $[QR]$ est ' + '**la perpendiculaire à $(QR)$ passant par son milieu**'
     + ' : il faut les deux conditions.',
     'La hauteur issue de $A$ passe par $A$ et est perpendiculaire à $(BC)$, donc à sa parallèle'
     ' $(QR)$ : c\'est **la médiatrice de $[QR]$**.'])
V307_RANGER = ranger(
    INTRO_307.strip(),
    ['Avec les parallélogrammes $ABCQ$ et $ACBR$ : $' + vec('AQ') + '=' + vec('BC') + '$ et $'
     + vec('AR') + '=' + vec('CB') + '$.',
     'Donc $' + vec('AR') + '=-' + vec('AQ') + '$ : $A$ est le milieu de $[QR]$ ; de même, $B$'
     ' est le milieu de $[PR]$ et $C$ celui de $[PQ]$.',
     'La hauteur issue de $A$ est perpendiculaire à $(BC)$, donc à $(QR)$, et passe par $A$ :'
     ' c\'est la médiatrice de $[QR]$ ; de même pour les deux autres hauteurs.',
     'Les médiatrices du triangle $PQR$ sont concourantes, donc les hauteurs de $ABC$ aussi.'],
    ['Les hauteurs de $ABC$ sont les médiatrices du grand triangle $PQR$.',
     'Les médiatrices d\'un triangle sont concourantes (centre du cercle circonscrit) :'
     ' **les trois hauteurs de $ABC$ sont concourantes**.'])

MODELES.append(modele(
    '03-demontrer-hauteurs-concourantes', 'Démontrer que les hauteurs d\'un triangle sont'
    ' concourantes',
    'Démonstration par le triangle PQR dont ABC est le triangle des milieux : vecteurs d\'un'
    ' parallélogramme (case choix), AR = −AQ (case), hauteur = médiatrice de [QR] (case choix) ;'
    ' étapes à ranger',
    3,
    [V307_PARALLELOGRAMME, V307_OPPOSE, V307_MEDIATRICE, V307_RANGER],
    specs_choix(0, 'AQ = BC', ['AQ = CB', 'AB = CQ', 'diagonales'])
    + [spec('−1', 1, '-1', 'correct'),
       spec('Erreur : 1', 1, '1', 'incorrect'),
       spec('Erreur : 2', 1, '2', 'incorrect')]
    + specs_choix(2, 'milieu et perpendiculaire', ['milieu seul', 'perpendiculaire seule',
                                                   'triangles'])
    + ['RANGER:3']))

# --- 4. 2-308 : aire d'un triangle = ½ ab sin C ------------------------------------------------

INTRO_308 = ('Soit $ABC$ un triangle, avec $a=BC$, $b=AC$ et l\'angle $\\widehat{C}$ aigu. On note'
             ' $H$ le pied de la hauteur issue de $A$. On démontre que l\'aire du triangle est'
             ' $\\mathcal{A}=\\frac{1}{2}ab\\sin\\widehat{C}$.\n\n')
V308_HAUTEUR = justification(
    INTRO_308 + 'Le triangle $AHC$ est rectangle en $H$. Que vaut $AH$ ?',
    [],
    '$AH=b\\sin\\widehat{C}$',
    ['$AH=b\\cos\\widehat{C}$', '$AH=a\\sin\\widehat{C}$', '$AH=b\\tan\\widehat{C}$'],
    ['Dans $AHC$ rectangle en $H$, $[AH]$ est le côté opposé à $\\widehat{C}$ et $[AC]$'
     ' l\'hypoténuse : $\\sin\\widehat{C}=\\frac{AH}{AC}$.',
     'Donc $' + col('AH=b\\sin\\widehat{C}') + '$ ($b\\cos\\widehat{C}$ est la longueur $CH$).'])
V308_AIGU = justification(
    INTRO_308 + 'Pourquoi suppose-t-on l\'angle $\\widehat{C}$ aigu ?',
    [],
    'Le sinus n\'est défini que pour un angle aigu d\'un triangle rectangle : ici $\\widehat{C}$'
    ' dans $AHC$.',
    ['Sinon l\'aire serait négative.',
     'Sinon la hauteur issue de $A$ n\'existerait pas.',
     'Car tous les angles d\'un triangle sont aigus.'],
    ['En seconde, $\\sin\\widehat{C}$ se lit dans un triangle rectangle, où $\\widehat{C}$ est un'
     ' angle aigu.',
     'Si $\\widehat{C}$ est aigu, $H$ est sur la demi-droite $[CB)$ et $\\widehat{C}$ est'
     ' **un angle aigu du triangle rectangle $AHC$**.',
     'La hauteur existe toujours ; un triangle peut avoir un angle obtus.'])
A_, B_ = ev('a'), ev('b')
V308_APPLICATION = case(
    'Soit $ABC$ un triangle tel que $BC=' + A_ + '$ cm, $AC=' + B_ + '$ cm et'
    ' $\\widehat{C}=30^\\circ$. On rappelle que $\\sin 30^\\circ=\\frac{1}{2}$.\n\n'
    'Calcule l\'aire $\\mathcal{A}$ du triangle $ABC$, en cm².\n\n$\\mathcal{A}=?$',
    [var('a', '2..12'), var('b', '2..12')], ev('a*b/4;d'),
    ['$\\mathcal{A}=\\frac{1}{2}\\times BC\\times AC\\times\\sin\\widehat{C}=\\frac{1}{2}\\times '
     + A_ + '\\times ' + B_ + '\\times\\frac{1}{2}$.',
     '$\\mathcal{A}=\\frac{' + ev('a*b') + '}{4}=' + col(ev('a*b/4;d')) + '$ cm².'])
V308_RANGER = ranger(
    INTRO_308.strip(),
    ['L\'aire du triangle est $\\mathcal{A}=\\frac{1}{2}\\times BC\\times AH=\\frac{1}{2}\\,a\\times'
     ' AH$.',
     'Comme $\\widehat{C}$ est aigu, $AHC$ est rectangle en $H$, et $\\sin\\widehat{C}=\\frac{AH}'
     '{AC}$.',
     'Donc $AH=b\\sin\\widehat{C}$, et $\\mathcal{A}=\\frac{1}{2}ab\\sin\\widehat{C}$.'],
    ['On exprime la hauteur $AH$ avec le sinus de $\\widehat{C}$, puis on la remplace dans la'
     ' formule de l\'aire.',
     'Conclusion : $' + col('\\mathcal{A}=\\frac{1}{2}ab\\sin\\widehat{C}') + '$.'])

MODELES.append(modele(
    '04-aire-d-un-triangle-par-le-sinus', 'Aire d\'un triangle : $\\frac{1}{2}ab\\sin\\widehat{C}$',
    'Démonstration à trous (C aigu) : AH = b sin C (case choix), pourquoi C aigu (case choix) ;'
    ' aire avec C = 30° (case, a et b de 2 à 12) ; étapes à ranger',
    4,
    [V308_HAUTEUR, V308_AIGU, V308_APPLICATION, V308_RANGER],
    specs_choix(0, 'b sin C', ['b cos C', 'a sin C', 'b tan C'])
    + specs_choix(1, 'sinus d\'un angle aigu', ['aire négative', 'hauteur inexistante',
                                                'angles tous aigus'])
    + [spec('a = 6, b = 5 : 7,5', 2, '7.5', 'correct', {'a': 6, 'b': 5}),
       spec('Erreur : ½ ou sinus oublié (15)', 2, '15', 'incorrect', {'a': 6, 'b': 5}),
       spec('Erreur : ab (30)', 2, '30', 'incorrect', {'a': 6, 'b': 5}),
       spec('a = 4, b = 8 : 8', 2, '8', 'correct', {'a': 4, 'b': 8})]
    + ['RANGER:3']))

# --- 5. 2-310 : médiatrices concourantes au centre du cercle circonscrit -----------------------

INTRO_310 = ('Soit $ABC$ un triangle. On démontre que ses trois médiatrices sont concourantes, en'
             ' un point $O$ qui est le centre du cercle circonscrit au triangle.\n\n')
V310_SECANTES = justification(
    INTRO_310 + 'Pourquoi les médiatrices de $[AB]$ et de $[AC]$ se coupent-elles en un point $O$ ?',
    [],
    'Car $(AB)$ et $(AC)$ ne sont pas parallèles : leurs perpendiculaires ne le sont pas non plus.',
    ['Car deux droites se coupent toujours.',
     'Car elles passent toutes les deux par $A$.',
     'Car $AB=AC$.'],
    ['$ABC$ est un triangle : $(AB)$ et $(AC)$ sont sécantes en $A$.',
     'Les médiatrices sont perpendiculaires à ces droites : si elles étaient parallèles,'
     ' $(AB)$ et $(AC)$ le seraient aussi. Elles sont donc **sécantes**.',
     'Les médiatrices ne passent pas par $A$ (le milieu de $[AB]$ n\'est pas $A$).'])
V310_EQUIDISTANT = justification(
    INTRO_310 + '$O$ est sur la médiatrice de $[AB]$ et sur celle de $[AC]$, donc $OA=OB$ et'
    ' $OA=OC$. Qu\'en déduit-on ?',
    [],
    '$OB=OC$, donc $O$ est sur la médiatrice de $[BC]$.',
    ['$O$ est le milieu de $[BC]$.',
     '$O$ est sur la droite $(BC)$.',
     'Le triangle $ABC$ est isocèle en $A$.'],
    ['$OB=OA=OC$ : $O$ est à égale distance de $B$ et de $C$.',
     '**La médiatrice de $[BC]$ est l\'ensemble des points équidistants de $B$ et $C$** : '
     '$O$ est sur la médiatrice de $[BC]$.'])
V310_CERCLE = justification(
    INTRO_310 + 'Les trois médiatrices passent par $O$, et $OA=OB=OC$. Pourquoi $O$ est-il le'
    ' centre du cercle circonscrit à $ABC$ ?',
    [],
    'Le cercle de centre $O$ et de rayon $OA$ passe par $A$, $B$ et $C$.',
    ['Car $O$ est à l\'intérieur du triangle.',
     'Car $O$ est le milieu d\'un côté.',
     'Car $O$ est sur les trois hauteurs.'],
    ['$OA=OB=OC$ : $A$, $B$ et $C$ sont sur **le cercle de centre $O$ et de rayon $OA$**.',
     '$O$ peut être hors du triangle (angle obtus), ou au milieu de l\'hypoténuse (triangle'
     ' rectangle) : sa position n\'est pas la raison.'])
V310_RANGER = ranger(
    INTRO_310.strip(),
    ['Les médiatrices de $[AB]$ et $[AC]$ se coupent en un point $O$, car $(AB)$ et $(AC)$ ne'
     ' sont pas parallèles.',
     '$O$ est sur la médiatrice de $[AB]$, donc $OA=OB$ ; sur celle de $[AC]$, donc $OA=OC$.',
     'Donc $OB=OC$ : $O$ est aussi sur la médiatrice de $[BC]$.',
     '$OA=OB=OC$ : le cercle de centre $O$ passant par $A$ passe aussi par $B$ et $C$.'],
    ['On caractérise la médiatrice par l\'égalité des distances, dans les deux sens.',
     'Conclusion : **les médiatrices sont concourantes en $O$**, centre du'
     ' cercle circonscrit.'])

MODELES.append(modele(
    '05-demontrer-mediatrices-concourantes', 'Démontrer que les médiatrices d\'un triangle sont'
    ' concourantes',
    'Démonstration à trous : médiatrices de [AB] et [AC] sécantes (case choix), OB = OC donc O sur'
    ' la médiatrice de [BC] (case choix), centre du cercle circonscrit (case choix) ; étapes à'
    ' ranger',
    4,
    [V310_SECANTES, V310_EQUIDISTANT, V310_CERCLE, V310_RANGER],
    specs_choix(0, '(AB), (AC) non parallèles', ['toujours sécantes', 'passent par A', 'AB = AC'])
    + specs_choix(1, 'OB = OC', ['milieu de [BC]', 'sur (BC)', 'isocèle'])
    + specs_choix(2, 'cercle de rayon OA', ['intérieur', 'milieu d\'un côté', 'hauteurs'])
    + ['RANGER:3']))

# --- Specs « ranger » : positions affichées calculées par le générateur (graine 0) -------------

def positions(chemin, vi):
    out = subprocess.run(['pnpm', 'exec', 'tsx', 'docs/wip/questions/positions-ranger.ts', chemin, str(vi)],
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
        juste = positions(chemin, vi)
        faux = juste[:]
        faux[1], faux[2] = faux[2], faux[1]
        m['testSpecs'] += [spec('Étapes dans l’ordre', vi, juste, 'correct'),
                           spec('Erreur : deuxième et troisième étapes échangées', vi, faux,
                                'incorrect')]
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
