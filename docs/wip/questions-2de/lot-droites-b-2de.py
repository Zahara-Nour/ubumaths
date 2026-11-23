"""Écrit les 10 modèles du lot 5 B « Droites : équations, tracés, positions relatives » de la 2de
dans scripts/questions/2de-droites-b/.

Phase 0 validée par David le 2026-11-01 (§ 30 du journal `docs/wip/questions-2de-progress.md`).
Bornes : `bornes/lycee/2de.json` (2-439, 2-312, 2-441, 2-314, 2-440, 2-316, 2-445 ; 2-317, 2-318,
2-319). Un point par modèle ; le nœud et le tag sont posés par la migration de rangement, après le
`--publier` de David.

Décisions et pièges :
- L5-b : équation en forme libre (case `equation`, toute équation de la droite juste) en 2-441, 2-314,
  2-440 ; forme imposée (`requiredForm`) en 2-439 (réduite) et 2-312 (cartésienne) ;
- L4-d : chaque modèle à case choix oui/non a une variation à calcul ;
- tracés (2-316, 2-445) : case choix entre quatre ` ```courbe ` (la bonne et trois erreurs typiques),
  b ≠ 0 en 2-445 (le bloc ne trace pas de verticale) ;
- 2-317 passe par l'équation de (AB), pour se distinguer de 2-303 (déterminant) ;
- `cleanCoefficients` : 1x, −1y, +0 nettoyés ; une chaîne de calcul (deux relations) est laissée telle
  quelle ;
- les variables sont substituées telles quelles dans les `eval` : toujours `(a)`, `-(a)` ;
- variables `e` et `i` interdites.

    python3 docs/wip/questions-2de/lot-droites-b-2de.py scripts/questions/2de-droites-b
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


def modele(nom, title, description, subdomain, level, variations, specs, delay=120):
    m = {'title': title, 'description': description, 'grades': ['2'], 'theme': 'Géométrie',
         'domain': 'Droites du plan', 'subdomain': subdomain, 'level': level,
         'delay': delay, 'status': 'draft',
         'shared': {'cleanCoefficients': True, 'blankDefaults': {'acceptDecimal': True}},
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


def case_eq(attendu, forme=None):
    c = {'expectedAnswer': attendu, 'answerKind': 'equation'}
    if forme:
        c['requiredForm'] = forme
    return c


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def colonne(x, y):
    return '\\begin{pmatrix}' + x + '\\\\' + y + '\\end{pmatrix}'


def point(nom, x, y):
    return nom + '(' + x + '\\,;\\,' + y + ')'


def choix(question, options):
    return (question + '\n\n```choix\nmelanger: non\n' + ''.join('- ' + o + '\n' for o in options)
            + '```')


def fraction(n, q):
    """n/q écrit avec le signe devant la fraction (n entier relatif, q > 0)."""
    return '{{if:' + n + '<0|-}}\\dfrac{ {{eval:abs(' + n + ')}} }{ {{' + q + '}} }'


def courbe_lignes(expression, points=None, description='Droite d tracée dans un repère.',
                  taille='moyenne'):
    lignes = ['```courbe', 'x: -6 ; 6', 'y: -6 ; 6', 'grille: 1 ; 1',
              'f(x) = ' + expression + '   bleu   nom=d']
    if points:
        lignes.append('points: ' + points)
    lignes += ['taille: ' + taille, 'description: ' + description, '```']
    return lignes


def courbe(expression, points=None, description='Droite d tracée dans un repère.'):
    return '\n'.join(courbe_lignes(expression, points, description))


def choix_courbes(question, droites):
    """Case choix entre des droites tracées (patron `fonctions-terminale/C-06`), mélangées.

    `droites` : liste de (expression, description) ; la bonne en premier (réponse « 0 »)."""
    options = []
    for expression, description in droites:
        lignes = courbe_lignes(expression, description=description, taille='petite')
        options.append('- ' + lignes[0] + '\n' + ''.join('  ' + l + '\n' for l in lignes[1:]))
    return question + '\n\n````choix\n' + ''.join(options) + '````'


def tete(v, lettre):
    """Premier terme coloré `v·lettre` (v variable nommée non nulle) : `\\textcolor` empêche le
    nettoyage des coefficients, d'où les `if` (1x → x, −1x → −x), comme `geometrie-reperee-1spe/A-02`."""
    return ('{{if:' + v + '==1|' + lettre + '}}{{if:' + v + '==-1|-' + lettre + '}}{{if:' + v + '>1|{{' + v
            + '}}' + lettre + '}}{{if:' + v + '< -1|{{' + v + '}}' + lettre + '}}')


def suite(v, lettre):
    """Terme suivant coloré `±v·lettre` (v variable nommée, rien si v = 0)."""
    return ('{{if:' + v + '==1|+' + lettre + '}}{{if:' + v + '==-1|-' + lettre + '}}{{if:' + v + '>1|+{{' + v
            + '}}' + lettre + '}}{{if:' + v + '< -1|{{' + v + '}}' + lettre + '}}')


def cst(v):
    """Constante colorée `±v` (v variable nommée, rien si v = 0)."""
    return '{{if:' + v + '>0|+{{' + v + '}}}}{{if:' + v + '< 0|{{' + v + '}}}}'


def droite_par(p, m):
    """Description d'accessibilité de y = mx + p (p, m : expressions d'`eval`) : deux de ses points."""
    return ('Droite passant par les points (0 ; {{eval:' + p + '}}) et (1 ; {{eval:' + p + '+' + m + '}}).')


MODELES = []
REPERE = 'Dans un repère du plan'
OUI_NON = ['Oui', 'Non']
EQUATIONS = 'Équations de droites'
POSITIONS = 'Positions relatives'

# --- 7. 2-439 : équation réduite ---------------------------------------------------------------

# w = 1 : A sur d (« Oui ») ; w = 0 : ordonnée décalée de s (« Non »)
POINT_SUR_REDUITE = variation(
    REPERE + ', la droite $d$ a pour équation $y={{m}}x{{p;+}}$.\n\n'
    + choix('Le point $' + point('A', '{{xa}}', '{{ya}}') + '$ appartient-il à la droite $d$ ?', OUI_NON),
    [var('m', '2..4;±'), var('p', '1..6;±'), var('xa', '-4..4!0'), var('w', '0|1'), var('s', '1..3;±'),
     var('ya', 'eval:(m)*(xa)+(p)+(1-(w))*(s)')],
    [case('{{eval:1-(w)}}')],
    ['$A$ appartient à $d$ si et seulement si ses coordonnées vérifient l\'équation : on remplace $x$ par'
     ' ${{xa}}$.',
     '$${{m}}\\times{{xa;()}}{{p;+}}={{eval:(m)*(xa)+(p)}}$$',
     '{{if:w==1|On trouve l\'ordonnée de $A$ : **$A$ appartient à $d$**.|${{eval:(m)*(xa)+(p)}}\\neq{{ya}}$ :'
     ' **$A$ n\'appartient pas à $d$**.}}'])

ORDONNEE_SUR_REDUITE = variation(
    REPERE + ', la droite $d$ a pour équation $y={{m}}x{{p;+}}$.\n\nLe point $A$ de la droite $d$ a pour'
    ' abscisse ${{xa}}$. Calcule son ordonnée.\n\n$y_A=?$',
    [var('m', '2..5;±'), var('p', '1..9;±'), var('xa', '-5..5!0')],
    [case('{{eval:(m)*(xa)+(p)}}')],
    ['$A$ est sur $d$ : ses coordonnées vérifient l\'équation, on remplace $x$ par ${{xa}}$.',
     '$$y_A={{m}}\\times{{xa;()}}{{p;+}}=' + col('{{eval:(m)*(xa)+(p)}}') + '$$'])

# Cartésienne construite à partir de y = mx + p : a = −mb, c = −pb
REDUITE_DE_CARTESIENNE = variation(
    REPERE + ', la droite $d$ a pour équation ${{eval:-(m)*(b)}}x{{b;+}}y{{eval:-(p)*(b);+}}=0$.\n\n'
    'Donne l\'**équation réduite** de la droite $d$.\n\n$?$',
    [var('m', '1..4;±'), var('p', '1..6;±'), var('b', '1..3;±')],
    [case_eq('y={{m}}x{{p;+}}', 'reduite')],
    ['L\'équation réduite s\'écrit $y=mx+p$ : on isole $y$.',
     '$${{b}}y={{eval:(m)*(b)}}x{{eval:(p)*(b);+}}$$',
     '{{if:b!=1|On divise par ${{b}}$ : }}$' + col('y=' + tete('m', 'x') + cst('p')) + '$.'])

VERTICALE = variation(
    REPERE + ', la droite $d$ passe par le point $' + point('A', '{{xa}}', '{{ya}}') + '$ et est parallèle'
    ' à l\'axe des ordonnées.\n\nDonne l\'**équation réduite** de la droite $d$.\n\n$?$',
    [var('xa', '-6..6!0'), var('ya', '-6..6')],
    [case_eq('x={{xa}}', 'reduite')],
    ['Une droite parallèle à l\'axe des ordonnées n\'a pas de pente : tous ses points ont la même abscisse.',
     'Son équation réduite est $x=c$, ici $' + col('x={{xa}}') + '$.'])

SP_PR_OUI = {'m': 2, 'p': -3, 'xa': 4, 'w': 1, 's': 1, 'ya': 5}
SP_PR_NON = {'m': 2, 'p': -3, 'xa': 4, 'w': 0, 's': 1, 'ya': 6}
SP_OR = {'m': -3, 'p': 2, 'xa': -2}
SP_RC = {'m': -2, 'p': 3, 'b': 1}
SP_RC2 = {'m': 2, 'p': -1, 'b': -3}
SP_VE = {'xa': 3, 'ya': -1}
MODELES.append(modele(
    '01-equation-reduite', 'Équation réduite d\'une droite',
    'Point sur une droite y = mx + p ? ; ordonnée du point d\'abscisse donnée ; équation réduite tirée'
    ' d\'une cartésienne ; droite x = c (pièges : y = mx + p pris pour m, signe de p, isoler y sans diviser)',
    EQUATIONS, 1,
    [POINT_SUR_REDUITE, ORDONNEE_SUR_REDUITE, REDUITE_DE_CARTESIENNE, VERTICALE],
    [spec('A(4 ; 5) sur y = 2x − 3 : « Oui »', 0, SP_PR_OUI, '0', 'correct'),
     spec('A(4 ; 6) : « Non »', 0, SP_PR_NON, '1', 'correct'),
     spec('A(4 ; 6) : « Oui » faux', 0, SP_PR_NON, '0', 'incorrect'),
     spec('y = −3x + 2, x = −2 → 8', 1, SP_OR, '8', 'correct'),
     spec('Erreur : signe (−4)', 1, SP_OR, '-4', 'incorrect'),
     spec('2x + y − 3 = 0 → y = −2x + 3', 2, SP_RC, 'y=-2x+3', 'correct'),
     spec('Écrite y = 3 − 2x', 2, SP_RC, 'y=3-2x', 'correct'),
     spec('Forme cartésienne refusée', 2, SP_RC, '2x+y-3=0', 'bad_form', ['form']),
     spec('Erreur : signe (y = 2x + 3)', 2, SP_RC, 'y=2x+3', 'incorrect'),
     spec('6x − 3y − 3 = 0 → y = 2x − 1', 2, SP_RC2, 'y=2x-1', 'correct'),
     spec('Erreur : pas divisé (−3y = −6x + 3)', 2, SP_RC2, '-3y=-6x+3', 'bad_form', ['form']),
     spec('x = 3', 3, SP_VE, 'x=3', 'correct'),
     spec('Erreur : y = −1', 3, SP_VE, 'y=-1', 'incorrect')]))

# --- 8. 2-312 : équation cartésienne -----------------------------------------------------------

# w = 1 : M sur d ; w = 0 : c décalé de s
POINT_SUR_CARTESIENNE = variation(
    REPERE + ', la droite $d$ a pour équation ${{a}}x{{b;+}}y{{c;+}}=0$.\n\n'
    + choix('Le point $' + point('M', '{{xm}}', '{{ym}}') + '$ appartient-il à la droite $d$ ?', OUI_NON),
    [var('a', '2..5;±'), var('b', '2..5;±'), var('xm', '-5..5!0'), var('ym', '-5..5!0'), var('w', '0|1'),
     var('s', '1..3;±'), var('c', 'eval:-((a)*(xm)+(b)*(ym))+(1-(w))*(s)')],
    [case('{{eval:1-(w)}}')],
    ['$M$ appartient à $d$ si et seulement si ses coordonnées vérifient l\'équation : on remplace $x$ par'
     ' ${{xm}}$ et $y$ par ${{ym}}$.',
     '$${{a}}\\times{{xm;()}}{{b;+}}\\times{{ym;()}}{{c;+}}={{eval:(a)*(xm)+(b)*(ym)+(c)}}$$',
     '{{if:w==1|On trouve $0$ : **$M$ appartient à $d$**.|On ne trouve pas $0$ : **$M$ n\'appartient pas à'
     ' $d$**.}}'])

C_POUR_UN_POINT = variation(
    REPERE + ', on considère la droite $d$ d\'équation ${{a}}x{{b;+}}y+c=0$, où $c$ est un nombre réel.\n\n'
    'Détermine $c$ pour que le point $' + point('M', '{{xm}}', '{{ym}}') + '$ appartienne à $d$.\n\n$c=?$',
    [var('a', '1..5;±'), var('b', '1..5;±'), var('xm', '-5..5!0'), var('ym', '-5..5!0')],
    [case('{{eval:-((a)*(xm)+(b)*(ym))}}')],
    ['$M$ appartient à $d$ si et seulement si ses coordonnées vérifient l\'équation :',
     '$${{a}}\\times{{xm;()}}{{b;+}}\\times{{ym;()}}+c=0\\quad\\text{soit}\\quad{{eval:(a)*(xm)+(b)*(ym)}}+c=0$$',
     'donc $c=' + col('{{eval:-((a)*(xm)+(b)*(ym))}}') + '$.'])

CARTESIENNE_DE_REDUITE = variation(
    REPERE + ', la droite $d$ a pour équation $y={{m}}x{{p;+}}$.\n\nDonne une **équation cartésienne** de la'
    ' droite $d$.\n\n$?$',
    [var('m', '1..5;±'), var('p', '1..9;±')],
    [case_eq('{{m}}x-y{{p;+}}=0', 'cartesienne')],
    ['Une équation cartésienne s\'écrit $ax+by+c=0$ : on passe tous les termes dans le même membre.',
     '$$y=' + tete('m', 'x') + cst('p') + '\\iff' + col(tete('m', 'x') + '-y' + cst('p') + '=0') + '$$',
     'Toute équation proportionnelle est aussi juste, par exemple ${{eval:-(m)}}x+y{{eval:-(p);+}}=0$.'])

CARTESIENNE_DE_REDUITE_FRACTION = variation(
    REPERE + ', la droite $d$ a pour équation $y=' + fraction('n', 'q') + 'x{{p;+}}$.\n\nDonne une'
    ' **équation cartésienne** de la droite $d$.\n\n$?$',
    [var('q', '2|3|5'), var('n', '1..4;±'), var('p', '1..6;±'), var('qp', 'eval:(q)*(p)')],
    [case_eq('{{n}}x{{eval:-(q);+}}y{{eval:(q)*(p);+}}=0', 'cartesienne')],
    ['On multiplie les deux membres par ${{q}}$, puis on passe tous les termes dans le même membre :',
     '$${{q}}y=' + tete('n', 'x') + cst('qp') + '\\iff' + col(tete('n', 'x') + '-{{q}}y' + cst('qp') + '=0')
     + '$$',
     'Toute équation proportionnelle est aussi juste.'],
    ['mod(n, q) != 0'])

SP_MC_OUI = {'a': 2, 'b': -3, 'xm': 3, 'ym': 4, 'w': 1, 's': 1, 'c': 6}
SP_MC_NON = {'a': 2, 'b': -3, 'xm': 3, 'ym': 4, 'w': 0, 's': 2, 'c': 8}
SP_CP = {'a': 2, 'b': -3, 'xm': 1, 'ym': -2}
SP_CR = {'m': 3, 'p': -2}
SP_CF = {'q': 3, 'n': 2, 'p': 1}
MODELES.append(modele(
    '02-equation-cartesienne', 'Équation cartésienne d\'une droite',
    'Point sur une droite ax + by + c = 0 ? ; c pour qu\'un point soit sur la droite ; équation cartésienne'
    ' tirée d\'une réduite, pente entière ou fractionnaire (pièges : coordonnées échangées, signe de c,'
    ' membre droit non nul)', EQUATIONS, 2,
    [POINT_SUR_CARTESIENNE, C_POUR_UN_POINT, CARTESIENNE_DE_REDUITE, CARTESIENNE_DE_REDUITE_FRACTION],
    [spec('M(3 ; 4) sur 2x − 3y + 6 = 0 : « Oui »', 0, SP_MC_OUI, '0', 'correct'),
     spec('2x − 3y + 8 = 0 : « Non »', 0, SP_MC_NON, '1', 'correct'),
     spec('« Oui » faux', 0, SP_MC_NON, '0', 'incorrect'),
     spec('2x − 3y + c = 0, M(1 ; −2) → −8', 1, SP_CP, '-8', 'correct'),
     spec('Erreur : signe (8)', 1, SP_CP, '8', 'incorrect'),
     spec('y = 3x − 2 → 3x − y − 2 = 0', 2, SP_CR, '3x-y-2=0', 'correct'),
     spec('Proportionnelle −3x + y + 2 = 0', 2, SP_CR, '-3x+y+2=0', 'correct'),
     spec('Forme réduite refusée', 2, SP_CR, 'y=3x-2', 'bad_form', ['form']),
     spec('Membre droit non nul refusé', 2, SP_CR, '3x-y=2', 'bad_form', ['form']),
     spec('Erreur : signe de c (3x − y + 2 = 0)', 2, SP_CR, '3x-y+2=0', 'incorrect'),
     spec('y = 2/3 x + 1 → 2x − 3y + 3 = 0', 3, SP_CF, '2x-3y+3=0', 'correct'),
     spec('Erreur : p non multiplié (2x − 3y + 1 = 0)', 3, SP_CF, '2x-3y+1=0', 'incorrect')]))

# --- 9. 2-441 : point et pente → équation -----------------------------------------------------

ECRIRE_EQUATION = 'Donne une équation de la droite $d$.\n\n$?$'

POINT_PENTE_ENTIERE = variation(
    REPERE + ', la droite $d$ passe par le point $' + point('A', '{{xa}}', '{{ya}}') + '$ et a pour pente'
    ' ${{m}}$.\n\n' + ECRIRE_EQUATION,
    [var('m', '1..4;±'), var('xa', '-5..5!0'), var('ya', '-6..6'), var('p0', 'eval:(ya)-(m)*(xa)')],
    [case_eq('y={{m}}x{{eval:(ya)-(m)*(xa);+}}')],
    ['La droite a une équation de la forme $y={{m}}x+p$. Elle passe par $A$, donc :',
     '$${{ya}}={{m}}\\times{{xa;()}}+p\\quad\\text{soit}\\quad p={{ya}}-{{eval:(m)*(xa);()}}'
     '={{eval:(ya)-(m)*(xa)}}$$',
     'Une équation de $d$ est $' + col('y=' + tete('m', 'x') + cst('p0')) + '$.'])

POINT_PENTE_FRACTION = variation(
    REPERE + ', la droite $d$ passe par le point $' + point('A', '{{eval:(q)*(t)}}', '{{ya}}') + '$ et a pour'
    ' pente $' + fraction('n', 'q') + '$.\n\n' + ECRIRE_EQUATION,
    [var('q', '2|3'), var('n', '1..4;±'), var('t', '1..2;±'), var('ya', '-5..5'),
     var('p0', 'eval:(ya)-(n)*(t)')],
    [case_eq('y={{eval:(n)/(q)}}x{{eval:(ya)-(n)*(t);+}}')],
    ['La droite a une équation de la forme $y=' + fraction('n', 'q') + 'x+p$. Elle passe par $A$, donc :',
     '$${{ya}}=' + fraction('n', 'q') + '\\times{{eval:(q)*(t);()}}+p\\quad\\text{soit}\\quad'
     ' p={{ya}}-{{eval:(n)*(t);()}}={{eval:(ya)-(n)*(t)}}$$',
     'Une équation de $d$ est $' + col('y=' + fraction('n', 'q') + 'x' + cst('p0')) + '$.'],
    ['mod(n, q) != 0'])

SP_PP = {'m': -2, 'xa': 3, 'ya': 1}
SP_PPF = {'q': 3, 'n': 2, 't': -1, 'ya': 4}
MODELES.append(modele(
    '03-equation-par-un-point-et-la-pente', 'Équation d\'une droite par un point et sa pente',
    'Droite de pente m passant par A : y = mx + p, p tiré de A, pente entière puis fractionnaire ; forme'
    ' libre (pièges : p = y_A, p = y_A + m x_A, x et y échangés)', EQUATIONS, 3,
    [POINT_PENTE_ENTIERE, POINT_PENTE_FRACTION],
    [spec('A(3 ; 1), m = −2 → y = −2x + 7', 0, SP_PP, 'y=-2x+7', 'correct'),
     spec('Cartésienne 2x + y − 7 = 0', 0, SP_PP, '2x+y-7=0', 'correct'),
     spec('Erreur : p = y_A (y = −2x + 1)', 0, SP_PP, 'y=-2x+1', 'incorrect'),
     spec('Erreur : p = y_A + m x_A (y = −2x − 5)', 0, SP_PP, 'y=-2x-5', 'incorrect'),
     spec('A(−3 ; 4), m = 2/3 → y = 2/3 x + 6', 1, SP_PPF, 'y=\\frac{2}{3}x+6', 'correct'),
     spec('Cartésienne 2x − 3y + 18 = 0', 1, SP_PPF, '2x-3y+18=0', 'correct'),
     spec('Erreur : y = 2/3 x + 2', 1, SP_PPF, 'y=\\frac{2}{3}x+2', 'incorrect')]))

# --- 10. 2-314 : deux points → équation ------------------------------------------------------

DEUX_POINTS = (REPERE + ', on considère les points $' + point('A', '{{ax}}', '{{ay}}') + '$ et $'
               + point('B', '{{eval:(ax)+(dx)}}', '{{eval:(ay)+(dy)}}') + '$.\n\nDonne une équation de la'
               ' droite $(AB)$.\n\n$?$')

DEUX_POINTS_ENTIERE = variation(
    DEUX_POINTS,
    [var('ax', '-5..5'), var('ay', '-5..5'), var('dx', '1..3;±'), var('k', '1..3;±'),
     var('dy', 'eval:(k)*(dx)'), var('p0', 'eval:(ay)-(k)*(ax)')],
    [case_eq('y={{k}}x{{eval:(ay)-(k)*(ax);+}}')],
    ['$x_A\\neq x_B$ : la droite $(AB)$ a une équation de la forme $y=mx+p$, de pente :',
     '$$m=\\dfrac{y_B-y_A}{x_B-x_A}=\\dfrac{ {{dy}} }{ {{dx}} }={{k}}$$',
     'Elle passe par $A$ : ${{ay}}={{k}}\\times{{ax;()}}+p$, donc $p={{eval:(ay)-(k)*(ax)}}$.',
     'Une équation de $(AB)$ est $' + col('y=' + tete('k', 'x') + cst('p0')) + '$.'])

DEUX_POINTS_FRACTION = variation(
    DEUX_POINTS,
    [var('ax', '-5..5!0'), var('ay', '-5..5!0'), var('dx', '2..4;±'), var('dy', '1..5;±'),
     var('mdx', 'eval:-(dx)'), var('c0', 'eval:(dx)*(ay)-(dy)*(ax)')],
    [case_eq('{{dy}}x{{eval:-(dx);+}}y{{eval:(dx)*(ay)-(dy)*(ax);+}}=0')],
    ['$\\overrightarrow{AB}' + colonne('{{dx}}', '{{dy}}') + '$ dirige $(AB)$. Le point $M(x\\,;\\,y)$ est sur'
     ' $(AB)$ si et seulement si $\\overrightarrow{AM}' + colonne('x{{eval:-(ax);+}}', 'y{{eval:-(ay);+}}')
     + '$ et $\\overrightarrow{AB}$ sont colinéaires :',
     '$$\\det\\left(\\overrightarrow{AM},\\overrightarrow{AB}\\right)={{dy;()}}(x{{eval:-(ax);+}})'
     '-{{dx;()}}(y{{eval:-(ay);+}})=0$$',
     'Une équation de $(AB)$ est $' + col(tete('dy', 'x') + suite('mdx', 'y') + cst('c0') + '=0') + '$,'
     ' soit $y={{eval:(dy)/(dx)}}x{{eval:(ay)-(dy)*(ax)/(dx);+}}$.'],
    ['mod(dy, dx) != 0'])

DEUX_POINTS_VERTICALE = variation(
    REPERE + ', on considère les points $' + point('A', '{{ax}}', '{{ay}}') + '$ et $'
    + point('B', '{{ax}}', '{{eval:(ay)+(dy)}}') + '$.\n\nDonne une équation de la droite $(AB)$.\n\n$?$',
    [var('ax', '-6..6!0'), var('ay', '-5..5'), var('dy', '1..6;±')],
    [case_eq('x={{ax}}')],
    ['$A$ et $B$ ont la même abscisse ${{ax}}$ : la droite $(AB)$ est parallèle à l\'axe des ordonnées, elle'
     ' n\'a pas de pente.',
     'Une équation de $(AB)$ est $' + col('x={{ax}}') + '$.'])

SP_DE = {'ax': 1, 'ay': 2, 'dx': 2, 'k': 3, 'dy': 6}
SP_DF = {'ax': -1, 'ay': 3, 'dx': 4, 'dy': -6}
SP_DV = {'ax': 2, 'ay': -1, 'dy': 4}
MODELES.append(modele(
    '04-equation-par-deux-points', 'Équation d\'une droite passant par deux points',
    'Équation de (AB) : pente puis ordonnée à l\'origine, pente fractionnaire (par le déterminant), droite'
    ' x = c quand x_A = x_B ; forme libre (pièges : droite par un seul des deux points, pente Δx/Δy)',
    EQUATIONS, 4,
    [DEUX_POINTS_ENTIERE, DEUX_POINTS_FRACTION, DEUX_POINTS_VERTICALE],
    [spec('A(1 ; 2), B(3 ; 8) → y = 3x − 1', 0, SP_DE, 'y=3x-1', 'correct'),
     spec('Cartésienne 3x − y − 1 = 0', 0, SP_DE, '3x-y-1=0', 'correct'),
     spec('Erreur : p = y_A (y = 3x + 2)', 0, SP_DE, 'y=3x+2', 'incorrect'),
     spec('Erreur : pente Δx/Δy', 0, SP_DE, 'y=\\frac{1}{3}x+\\frac{5}{3}', 'incorrect'),
     spec('A(−1 ; 3), B(3 ; −3) → −6x − 4y + 6 = 0', 1, SP_DF, '-6x-4y+6=0', 'correct'),
     spec('Réduite y = −3/2 x + 3/2', 1, SP_DF, 'y=-\\frac{3}{2}x+\\frac{3}{2}', 'correct'),
     spec('Simplifiée 3x + 2y − 3 = 0', 1, SP_DF, '3x+2y-3=0', 'correct'),
     spec('Erreur : c faux (3x + 2y − 4 = 0)', 1, SP_DF, '3x+2y-4=0', 'incorrect'),
     spec('x_A = x_B = 2 → x = 2', 2, SP_DV, 'x=2', 'correct'),
     spec('Erreur : y = 2', 2, SP_DV, 'y=2', 'incorrect')]))

# --- 11. 2-440 : point et vecteur directeur → équation ---------------------------------------

POINT_VECTEUR = variation(
    REPERE + ', la droite $d$ passe par le point $' + point('A', '{{xa}}', '{{ya}}') + '$ et a pour vecteur'
    ' directeur $\\vec{u}' + colonne('{{u1}}', '{{u2}}') + '$.\n\n' + ECRIRE_EQUATION,
    [var('xa', '-5..5!0'), var('ya', '-5..5!0'), var('u1', '1..5;±'), var('u2', '1..5;±'),
     var('mu1', 'eval:-(u1)'), var('c0', 'eval:(u1)*(ya)-(u2)*(xa)')],
    [case_eq('{{u2}}x{{eval:-(u1);+}}y{{eval:(u1)*(ya)-(u2)*(xa);+}}=0')],
    ['Le point $M(x\\,;\\,y)$ est sur $d$ si et seulement si $\\overrightarrow{AM}'
     + colonne('x{{eval:-(xa);+}}', 'y{{eval:-(ya);+}}') + '$ et $\\vec{u}$ sont colinéaires, c\'est-à-dire'
     ' $\\det\\left(\\overrightarrow{AM},\\vec{u}\\right)=0$ :',
     '$${{u2;()}}(x{{eval:-(xa);+}})-{{u1;()}}(y{{eval:-(ya);+}})=0$$',
     'On développe : $' + col(tete('u2', 'x') + suite('mu1', 'y') + cst('c0') + '=0') + '$.',
     'Toute équation proportionnelle est aussi juste.'],
    ['abs(u1) != abs(u2)'])

POINT_VECTEUR_VERTICAL = variation(
    REPERE + ', la droite $d$ passe par le point $' + point('A', '{{xa}}', '{{ya}}') + '$ et a pour vecteur'
    ' directeur $\\vec{u}' + colonne('0', '{{u2}}') + '$.\n\n' + ECRIRE_EQUATION,
    [var('xa', '-6..6!0'), var('ya', '-6..6'), var('u2', '1..5;±')],
    [case_eq('x={{xa}}')],
    ['$\\vec{u}$ a une première coordonnée nulle : $d$ est parallèle à l\'axe des ordonnées, tous ses points'
     ' ont l\'abscisse de $A$.',
     'Une équation de $d$ est donc $' + col('x={{xa}}') + '$.'])

SP_PV = {'xa': 2, 'ya': -1, 'u1': 3, 'u2': 2}
SP_PVV = {'xa': -3, 'ya': 2, 'u2': 4}
MODELES.append(modele(
    '05-equation-par-un-point-et-un-vecteur-directeur',
    'Équation d\'une droite par un point et un vecteur directeur',
    'Droite passant par A, de vecteur directeur u : det(AM, u) = 0 développé ; u(0 ; k) donne x = c ; forme'
    ' libre (pièges : u pris pour vecteur normal, signe de c, (−b ; a) mal lu)', EQUATIONS, 5,
    [POINT_VECTEUR, POINT_VECTEUR_VERTICAL],
    [spec('A(2 ; −1), u(3 ; 2) → 2x − 3y − 7 = 0', 0, SP_PV, '2x-3y-7=0', 'correct'),
     spec('Réduite y = 2/3 x − 7/3', 0, SP_PV, 'y=\\frac{2}{3}x-\\frac{7}{3}', 'correct'),
     spec('Erreur : u pris pour normal (3x + 2y − 4 = 0)', 0, SP_PV, '3x+2y-4=0', 'incorrect'),
     spec('Erreur : signe de c (2x − 3y + 7 = 0)', 0, SP_PV, '2x-3y+7=0', 'incorrect'),
     spec('u(0 ; 4) → x = −3', 1, SP_PVV, 'x=-3', 'correct'),
     spec('Écrite 4x + 12 = 0', 1, SP_PVV, '4x+12=0', 'correct'),
     spec('Erreur : y = 2', 1, SP_PVV, 'y=2', 'incorrect')]))

# --- 12. 2-316 : tracer depuis l'équation réduite ---------------------------------------------

TRACE_REDUITE = ('Pour tracer $y=mx+p$ : on place le point $(0\\,;\\,p)$ sur l\'axe des ordonnées, puis, en'
                 ' avançant de $1$, on monte de $m$ (on descend si $m<0$).')

# Choix : 0 bonne, 1 pente de signe changé, 2 m et p échangés, 3 p de signe changé
TRACER_REDUITE = variation(
    REPERE + ', on considère la droite $d$ d\'équation $y={{m}}x{{p;+}}$.\n\n'
    + choix_courbes('Quelle figure représente la droite $d$ ?',
                    [('({{m}})*x+({{p}})', droite_par('(p)', '(m)')),
                     ('({{eval:-(m)}})*x+({{p}})', droite_par('(p)', '-(m)')),
                     ('({{p}})*x+({{m}})', droite_par('(m)', '(p)')),
                     ('({{m}})*x+({{eval:-(p)}})', droite_par('-(p)', '(m)'))]),
    [var('m', '1..3;±'), var('p', '1..4;±')],
    [case('0')],
    [TRACE_REDUITE,
     courbe('({{m}})*x+({{p}})', 'A(0 ; {{p}}), B(1 ; {{eval:(p)+(m)}})',
            'Droite d et deux de ses points, A et B, d\'abscisses 0 et 1.'),
     'Ici $d$ passe par $A(0\\,;{{p}})$ et, en avançant de $1$, on {{if:m>0|monte|descend}} de'
     ' ${{eval:abs(m)}}$ jusqu\'à $B(1\\,;{{eval:(p)+(m)}})$.'],
    ['m != p', 'abs((p)+(m)) <= 6', 'abs((m)-(p)) <= 6'])

# Choix : 0 bonne, 1 pente de signe changé, 2 pente inversée q/n, 3 p de signe changé
TRACER_REDUITE_FRACTION = variation(
    REPERE + ', on considère la droite $d$ d\'équation $y=' + fraction('n', 'q') + 'x{{p;+}}$.\n\n'
    + choix_courbes('Quelle figure représente la droite $d$ ?',
                    [('({{n}})/({{q}})*x+({{p}})', 'Droite passant par les points (0 ; {{p}}) et ({{q}} ;'
                      ' {{eval:(p)+(n)}}).'),
                     ('({{eval:-(n)}})/({{q}})*x+({{p}})', 'Droite passant par les points (0 ; {{p}}) et'
                      ' ({{q}} ; {{eval:(p)-(n)}}).'),
                     ('({{q}})/({{n}})*x+({{p}})', 'Droite passant par les points (0 ; {{p}}) et'
                      ' ({{eval:abs(n)}} ; {{eval:(p)+(q)*abs(n)/(n)}}).'),
                     ('({{n}})/({{q}})*x+({{eval:-(p)}})', 'Droite passant par les points (0 ;'
                      ' {{eval:-(p)}}) et ({{q}} ; {{eval:(n)-(p)}}).')]),
    [var('q', '2|3'), var('n', '1..3;±'), var('p', '1..3;±')],
    [case('0')],
    [TRACE_REDUITE,
     courbe('({{n}})/({{q}})*x+({{p}})', 'A(0 ; {{p}}), B({{q}} ; {{eval:(p)+(n)}})',
            'Droite d et deux de ses points, A et B, d\'abscisses 0 et {{q}}.'),
     'La pente est $' + fraction('n', 'q') + '$ : en avançant de ${{q}}$, on {{if:n>0|monte|descend}} de'
     ' ${{eval:abs(n)}}$, de $A(0\\,;{{p}})$ à $B({{q}}\\,;{{eval:(p)+(n)}})$.'],
    ['mod(n, q) != 0', 'abs((p)+(n)) <= 5', 'abs((p)-(n)) <= 5'])

SP_TR = {'m': 2, 'p': -1}
SP_TF = {'q': 3, 'n': 2, 'p': 1}
MODELES.append(modele(
    '06-tracer-une-droite-equation-reduite', 'Tracer une droite donnée par son équation réduite',
    'Choisir la droite tracée qui représente y = mx + p, pente entière puis fractionnaire (pièges : signe de'
    ' la pente, m et p échangés, pente inversée, signe de p)', EQUATIONS, 6,
    [TRACER_REDUITE, TRACER_REDUITE_FRACTION],
    [spec('y = 2x − 1 : la bonne', 0, SP_TR, '0', 'correct'),
     spec('Erreur : m et p échangés', 0, SP_TR, '2', 'incorrect'),
     spec('y = 2/3 x + 1 : la bonne', 1, SP_TF, '0', 'correct'),
     spec('Erreur : pente inversée', 1, SP_TF, '2', 'incorrect')]))

# --- 13. 2-445 : tracer depuis l'équation cartésienne -----------------------------------------

# Cartésienne construite à partir de y = mx + p : a = −mb, c = −pb (b ≠ 0)
# Choix : 0 bonne, 1 pente de signe changé, 2 p de signe changé, 3 les deux
TRACER_CARTESIENNE = variation(
    REPERE + ', on considère la droite $d$ d\'équation ${{eval:-(m)*(b)}}x{{b;+}}y{{eval:-(p)*(b);+}}=0$.\n\n'
    + choix_courbes('Quelle figure représente la droite $d$ ?',
                    [('({{m}})*x+({{p}})', droite_par('(p)', '(m)')),
                     ('({{eval:-(m)}})*x+({{p}})', droite_par('(p)', '-(m)')),
                     ('({{m}})*x+({{eval:-(p)}})', droite_par('-(p)', '(m)')),
                     ('({{eval:-(m)}})*x+({{eval:-(p)}})', droite_par('-(p)', '-(m)'))]),
    [var('m', '1..3;±'), var('p', '1..4;±'), var('b', '1..3;±')],
    [case('0')],
    ['On isole $y$ pour obtenir l\'équation réduite :',
     '$${{b}}y={{eval:(m)*(b)}}x{{eval:(p)*(b);+}}$$',
     '{{if:b!=1|On divise par ${{b}}$ : }}$y={{m}}x{{p;+}}$.',
     TRACE_REDUITE,
     courbe('({{m}})*x+({{p}})', 'A(0 ; {{p}}), B(1 ; {{eval:(p)+(m)}})',
            'Droite d et deux de ses points, A et B, d\'abscisses 0 et 1.')],
    ['abs((p)+(m)) <= 6', 'abs((p)-(m)) <= 6'])

# a et b quelconques, c multiple de b : pente −a/b fractionnaire, p = −c/b entier
# Choix : 0 bonne, 1 pente a/b (signe oublié), 2 pente −b/a, 3 p de signe changé
TRACER_CARTESIENNE_FRACTION = variation(
    REPERE + ', on considère la droite $d$ d\'équation ${{a}}x{{b;+}}y{{eval:-(p)*(b);+}}=0$.\n\n'
    + choix_courbes('Quelle figure représente la droite $d$ ?',
                    [('({{eval:-(a)}})/({{b}})*x+({{p}})', 'Droite de pente {{eval:-(a)/(b)}} passant par le'
                      ' point (0 ; {{p}}).'),
                     ('({{a}})/({{b}})*x+({{p}})', 'Droite de pente {{eval:(a)/(b)}} passant par le point'
                      ' (0 ; {{p}}).'),
                     ('({{eval:-(b)}})/({{a}})*x+({{p}})', 'Droite de pente {{eval:-(b)/(a)}} passant par le'
                      ' point (0 ; {{p}}).'),
                     ('({{eval:-(a)}})/({{b}})*x+({{eval:-(p)}})', 'Droite de pente {{eval:-(a)/(b)}} passant'
                      ' par le point (0 ; {{eval:-(p)}}).')]),
    [var('a', '1..3;±'), var('b', '2..3;±'), var('p', '1..3;±')],
    [case('0')],
    ['On isole $y$ pour obtenir l\'équation réduite :',
     '$${{b}}y={{eval:-(a)}}x{{eval:(p)*(b);+}}$$',
     'On divise par ${{b}}$ : $y={{eval:-(a)/(b)}}x{{p;+}}$.',
     'La droite passe par $(0\\,;{{p}})$ et a pour pente ${{eval:-(a)/(b)}}$ : en avançant de'
     ' ${{eval:abs(b)}}$, on {{if:(a)*(b)<0|monte|descend}} de ${{eval:abs(a)}}$.',
     courbe('({{eval:-(a)}})/({{b}})*x+({{p}})', 'A(0 ; {{p}}), B({{eval:abs(b)}} ;'
            ' {{eval:(p)-(a)*abs(b)/(b)}})',
            'Droite d et deux de ses points, A et B, d\'abscisses 0 et {{eval:abs(b)}}.')],
    ['mod(a, b) != 0', 'abs(a) != abs(b)', 'abs((p)-(a)*abs(b)/(b)) <= 5'])

SP_TC = {'m': -2, 'p': 3, 'b': 1}
SP_TCF = {'a': 2, 'b': 3, 'p': -1}
MODELES.append(modele(
    '07-tracer-une-droite-equation-cartesienne', 'Tracer une droite donnée par une équation cartésienne',
    'Choisir la droite tracée qui représente ax + by + c = 0 (b ≠ 0), en isolant y d\'abord, pente entière'
    ' puis fractionnaire (pièges : pente a/b, −b/a, signe de p)', EQUATIONS, 7,
    [TRACER_CARTESIENNE, TRACER_CARTESIENNE_FRACTION],
    [spec('2x + y − 3 = 0 : la bonne', 0, SP_TC, '0', 'correct'),
     spec('Erreur : signe de la pente', 0, SP_TC, '1', 'incorrect'),
     spec('2x + 3y + 3 = 0 : la bonne', 1, SP_TCF, '0', 'correct'),
     spec('Erreur : pente a/b', 1, SP_TCF, '1', 'incorrect')]))

# --- 14. 2-317 : alignement par une équation -------------------------------------------------

TROIS_POINTS = (REPERE + ', on considère les points $' + point('A', '{{ax}}', '{{eval:(k)*(ax)+(p)}}')
                + '$, $' + point('B', '{{eval:(ax)+(dx)}}', '{{eval:(k)*((ax)+(dx))+(p)}}') + '$ et $')

# w = 1 : C sur (AB) ; w = 0 : ordonnée de C décalée de s
ALIGNES_PAR_EQUATION = variation(
    TROIS_POINTS + point('C', '{{xc}}', '{{yc}}') + '$. La droite $(AB)$ a pour équation'
    ' $y={{k}}x{{p;+}}$.\n\n' + choix('Les points $A$, $B$ et $C$ sont-ils alignés ?', OUI_NON),
    [var('ax', '-4..4'), var('dx', '1..3;±'), var('k', '1..3;±'), var('p', '-4..4'), var('xc', '-5..5'),
     var('w', '0|1'), var('s', '1..3;±'), var('yc', 'eval:(k)*(xc)+(p)+(1-(w))*(s)')],
    [case('{{eval:1-(w)}}')],
    ['$A$, $B$ et $C$ sont alignés si et seulement si $C$ est sur la droite $(AB)$, c\'est-à-dire si ses'
     ' coordonnées vérifient $y={{k}}x{{p;+}}$.',
     '$${{k}}\\times{{xc;()}}{{p;+}}={{eval:(k)*(xc)+(p)}}$$',
     '{{if:w==1|On trouve l\'ordonnée de $C$ : **$A$, $B$ et $C$ sont alignés**.|'
     '${{eval:(k)*(xc)+(p)}}\\neq{{yc}}$ : $C$ n\'est pas sur $(AB)$, **les points ne sont pas alignés**.}}'],
    ['xc != ax', 'xc != (ax)+(dx)', 'abs((k)*((ax)+(dx))+(p)) <= 12'])

ORDONNEE_POUR_ALIGNER = variation(
    TROIS_POINTS + point('C', '{{xc}}', 'y') + '$, où $y$ est un nombre réel.\n\nDétermine $y$ pour que les'
    ' points $A$, $B$ et $C$ soient alignés.\n\n$y=?$',
    [var('ax', '-4..4'), var('dx', '1..3;±'), var('k', '1..3;±'), var('p', '-4..4'), var('xc', '-5..5')],
    [case('{{eval:(k)*(xc)+(p)}}')],
    ['$A$, $B$ et $C$ sont alignés si et seulement si $C$ est sur la droite $(AB)$. On cherche son'
     ' équation $y=mx+p$.',
     '$$m=\\dfrac{y_B-y_A}{x_B-x_A}=\\dfrac{ {{eval:(k)*(dx)}} }{ {{dx}} }={{k}}$$',
     'Elle passe par $A$ : $p={{eval:(k)*(ax)+(p)}}-{{k;()}}\\times{{ax;()}}={{p}}$, donc $(AB)$ a pour'
     ' équation $y={{k}}x{{p;+}}$.',
     '$C$ est sur $(AB)$ : $y={{k}}\\times{{xc;()}}{{p;+}}=' + col('{{eval:(k)*(xc)+(p)}}') + '$.'],
    ['xc != ax', 'xc != (ax)+(dx)', 'abs((k)*((ax)+(dx))+(p)) <= 12'])

SP_AL_OUI = {'ax': 1, 'dx': 2, 'k': 2, 'p': -1, 'xc': -2, 'w': 1, 's': 1, 'yc': -5}
SP_AL_NON = {'ax': 1, 'dx': 2, 'k': 2, 'p': -1, 'xc': -2, 'w': 0, 's': 1, 'yc': -4}
SP_OA = {'ax': 1, 'dx': 2, 'k': -3, 'p': 2, 'xc': 4}
MODELES.append(modele(
    '08-alignement-par-une-equation', 'Trois points alignés : par une équation de droite',
    'A, B, C alignés ? en testant C dans l\'équation de (AB) ; ordonnée de C pour que A, B, C soient'
    ' alignés, par l\'équation de (AB) (pièges : abscisse et ordonnée échangées, signe de p)', POSITIONS, 1,
    [ALIGNES_PAR_EQUATION, ORDONNEE_POUR_ALIGNER],
    [spec('C(−2 ; −5) sur y = 2x − 1 : « Oui »', 0, SP_AL_OUI, '0', 'correct'),
     spec('C(−2 ; −4) : « Non »', 0, SP_AL_NON, '1', 'correct'),
     spec('« Oui » faux', 0, SP_AL_NON, '0', 'incorrect'),
     spec('A(1 ; −1), B(3 ; −7), C(4 ; y) → −10', 1, SP_OA, '-10', 'correct'),
     spec('Erreur : signe de p (−14)', 1, SP_OA, '-14', 'incorrect')]))

# --- 15. 2-318 : parallèles ou sécantes ------------------------------------------------------

PARALLELES_SECANTES = ['Parallèles', 'Sécantes']

# w = 1 : d′ = t·d décalée (parallèles) ; w = 0 : b′ décalé de s (sécantes). c′ ≠ t·c : jamais confondues.
DEUX_CARTESIENNES = variation(
    REPERE + ', on considère les droites $d$ : ${{a}}x{{b;+}}y{{c;+}}=0$ et $d\'$ :'
    ' ${{eval:(t)*(a)}}x{{bb;+}}y{{cc;+}}=0$.\n\n'
    + choix('Les droites $d$ et $d\'$ sont-elles parallèles ou sécantes ?', PARALLELES_SECANTES),
    [var('a', '1..4;±'), var('b', '1..4;±'), var('c', '-6..6'), var('t', '-3|-2|2|3'), var('w', '0|1'),
     var('s', '1..2;±'), var('bb', 'eval:(t)*(b)+(1-(w))*(s)'), var('cc', '-9..9')],
    [case('{{eval:1-(w)}}')],
    ['$\\vec{u}' + colonne('{{eval:-(b)}}', '{{a}}') + '$ dirige $d$ et $\\vec{v}'
     + colonne('{{eval:-(bb)}}', '{{eval:(t)*(a)}}') + '$ dirige $d\'$. Les droites sont parallèles si et'
     ' seulement si ces vecteurs sont colinéaires.',
     '$$\\det(\\vec{u},\\vec{v})={{eval:-(b)}}\\times{{eval:(t)*(a);()}}-{{a;()}}\\times{{eval:-(bb);()}}'
     '={{eval:(a)*(bb)-(t)*(a)*(b)}}$$',
     '{{if:w==1|Le déterminant est nul : **$d$ et $d\'$ sont parallèles**.|Le déterminant n\'est pas nul :'
     ' **$d$ et $d\'$ sont sécantes**.}}'],
    ['bb != 0', 'cc != (t)*(c)'])

# d′ : ax + by + c = 0 de pente −a/b ; parallèle à d : y = mx + p si m = −a/b
REDUITE_ET_CARTESIENNE = variation(
    REPERE + ', on considère les droites $d$ : $y={{m}}x{{p;+}}$ et $d\'$ :'
    ' ${{a}}x{{b;+}}y{{c;+}}=0$.\n\n'
    + choix('Les droites $d$ et $d\'$ sont-elles parallèles ou sécantes ?', PARALLELES_SECANTES),
    [var('m', '1..3;±'), var('p', '-5..5'), var('b', '1..3;±'), var('w', '0|1'), var('s', '1..2;±'),
     var('a', 'eval:-((m)+(1-(w))*(s))*(b)'), var('c', '-6..6')],
    [case('{{eval:1-(w)}}')],
    ['Deux droites non parallèles à l\'axe des ordonnées sont parallèles si et seulement si elles ont la même'
     ' pente. La pente de $d$ est ${{m}}$.',
     'Pour $d\'$, on isole $y$ : ${{b}}y={{eval:-(a)}}x{{eval:-(c);+}}$, donc $y={{eval:-(a)/(b)}}x'
     '{{eval:-(c)/(b);+}}$ : sa pente est ${{eval:-(a)/(b)}}$.',
     '{{if:w==1|Même pente : **$d$ et $d\'$ sont parallèles**.|Pentes différentes : **$d$ et $d\'$ sont'
     ' sécantes**.}}'],
    ['a != 0', 'c != -(p)*(b)'])

M_POUR_PARALLELES = variation(
    REPERE + ', on considère les droites $d$ : $mx{{beta;+}}y-1=0$, où $m$ est un nombre réel, et $d\'$ :'
    ' ${{a}}x{{b;+}}y{{c;+}}=0$.\n\nDétermine $m$ pour que $d$ et $d\'$ soient parallèles.\n\n$m=?$',
    [var('beta', '2..4'), var('a', '1..5;±'), var('b', '1..4;±'), var('c', '-6..6')],
    [case('{{eval:(a)*(beta)/(b)}}')],
    ['$\\vec{u}' + colonne('{{eval:-(beta)}}', 'm') + '$ dirige $d$ et $\\vec{v}' + colonne('{{eval:-(b)}}', '{{a}}')
     + '$ dirige $d\'$. Les droites sont parallèles si et seulement si $\\det(\\vec{u},\\vec{v})=0$ :',
     '$${{eval:-(beta)}}\\times{{a;()}}-m\\times{{eval:-(b);()}}=0\\quad\\text{soit}\\quad{{b}}m={{eval:(a)*(beta)}}$$',
     'donc $m=' + col('{{eval:(a)*(beta)/(b)}}') + '$.'],
)

SP_2C_PAR = {'a': 2, 'b': -3, 'c': 1, 't': 2, 'w': 1, 's': 1, 'bb': -6, 'cc': 5}
SP_2C_SEC = {'a': 2, 'b': -3, 'c': 1, 't': 2, 'w': 0, 's': 1, 'bb': -5, 'cc': 5}
SP_RC_PAR = {'m': 2, 'p': 1, 'b': 1, 'w': 1, 's': 1, 'a': -2, 'c': 3}
SP_RC_SEC = {'m': 2, 'p': 1, 'b': 1, 'w': 0, 's': 1, 'a': -3, 'c': 3}
SP_MP = {'beta': 2, 'a': 3, 'b': -4, 'c': 1}
MODELES.append(modele(
    '09-droites-paralleles-ou-secantes', 'Deux droites données par leurs équations : parallèles ou sécantes ?',
    'Positions relatives de deux droites par leurs équations (deux cartésiennes : déterminant des vecteurs'
    ' directeurs ; réduite et cartésienne : pentes) ; m pour que deux droites soient parallèles (pièges :'
    ' pente a/b, vecteur (a ; b))', POSITIONS, 2,
    [DEUX_CARTESIENNES, REDUITE_ET_CARTESIENNE, M_POUR_PARALLELES],
    [spec('2x − 3y + 1 = 0 et 4x − 6y + 5 = 0 : parallèles', 0, SP_2C_PAR, '0', 'correct'),
     spec('4x − 5y + 5 = 0 : sécantes', 0, SP_2C_SEC, '1', 'correct'),
     spec('« Parallèles » faux', 0, SP_2C_SEC, '0', 'incorrect'),
     spec('y = 2x + 1 et −2x + y + 3 = 0 : parallèles', 1, SP_RC_PAR, '0', 'correct'),
     spec('−3x + y + 3 = 0 : sécantes', 1, SP_RC_SEC, '1', 'correct'),
     spec('mx + 2y − 1 = 0 ∥ 3x − 4y + 1 = 0 → −3/2', 2, SP_MP, '-\\frac{3}{2}', 'correct'),
     spec('En décimal −1,5', 2, SP_MP, '-1.5', 'correct'),
     spec('Erreur : signe (3/2)', 2, SP_MP, '\\frac{3}{2}', 'incorrect'),
     spec('Erreur : m = a (3)', 2, SP_MP, '3', 'incorrect')]))

# --- 16. 2-319 : point d'intersection --------------------------------------------------------

INTERSECTION = ('Donne les coordonnées du point d\'intersection $I$ des droites $d$ et $d\'$.\n\n$$'
                + point('I', '?', '?') + '$$')


def resolution(xi, yi):
    return ['Les coordonnées de $I$ vérifient les deux équations : on égale les deux expressions de $y$.',
            '$$' + tete('m1', 'x') + cst('p1') + '=' + tete('m2', 'x') + cst('p2') + '{{if:dm!=1|\\iff ' + tete('dm', 'x')
            + '={{dp}}}}\\iff x=' + xi + '$$',
            'Puis $y={{m1}}\\times\\left(' + xi + '\\right){{p1;+}}=' + yi + '$, donc $' + point('I', col(xi), col(yi))
            + '$.']


INTERSECTION_ENTIERE = variation(
    REPERE + ', on considère les droites $d$ : $y={{m1}}x{{eval:(y0)-(m1)*(x0);+}}$ et $d\'$ :'
    ' $y={{m2}}x{{eval:(y0)-(m2)*(x0);+}}$.\n\n' + INTERSECTION,
    [var('x0', '-4..4'), var('y0', '-5..5'), var('m1', '1..4;±'), var('m2', '1..4;±'),
     var('p1', 'eval:(y0)-(m1)*(x0)'), var('p2', 'eval:(y0)-(m2)*(x0)'), var('dm', 'eval:(m1)-(m2)'),
     var('dp', 'eval:(p2)-(p1)')],
    [case('{{x0}}'), case('{{y0}}')],
    resolution('{{x0}}', '{{y0}}'),
    ['m1 != m2', 'p1 != p2'])

INTERSECTION_FRACTION = variation(
    REPERE + ', on considère les droites $d$ : $y={{m1}}x{{p1;+}}$ et $d\'$ : $y={{m2}}x{{p2;+}}$.\n\n'
    + INTERSECTION,
    [var('m1', '1..4;±'), var('m2', '1..4;±'), var('p1', '-6..6!0'), var('p2', '-6..6'),
     var('dm', 'eval:(m1)-(m2)'), var('dp', 'eval:(p2)-(p1)')],
    [case('{{eval:((p2)-(p1))/((m1)-(m2))}}'), case('{{eval:(m1)*((p2)-(p1))/((m1)-(m2))+(p1)}}')],
    resolution('{{eval:((p2)-(p1))/((m1)-(m2))}}', '{{eval:(m1)*((p2)-(p1))/((m1)-(m2))+(p1)}}'),
    ['m1 != m2', 'mod((p2)-(p1), (m1)-(m2)) != 0'])

INTERSECTION_VERTICALE = variation(
    REPERE + ', on considère les droites $d$ : $x={{x0}}$ et $d\'$ : $y={{m}}x{{p;+}}$.\n\n' + INTERSECTION,
    [var('x0', '-5..5!0'), var('m', '1..4;±'), var('p', '-6..6')],
    [case('{{x0}}'), case('{{eval:(m)*(x0)+(p)}}')],
    ['Tous les points de $d$ ont pour abscisse ${{x0}}$ : $x_I={{x0}}$.',
     '$I$ est aussi sur $d\'$ : $y_I={{m}}\\times{{x0;()}}{{p;+}}={{eval:(m)*(x0)+(p)}}$, donc $'
     + point('I', col('{{x0}}'), col('{{eval:(m)*(x0)+(p)}}')) + '$.'])

SP_IE = {'x0': 2, 'y0': -1, 'm1': 3, 'm2': -2, 'p1': -7, 'p2': 3}
SP_IF = {'m1': 2, 'm2': -1, 'p1': 1, 'p2': 3}
SP_IV = {'x0': -2, 'm': 3, 'p': 1}
MODELES.append(modele(
    '10-point-d-intersection-de-deux-droites', 'Point d\'intersection de deux droites',
    'Coordonnées du point d\'intersection de deux droites y = mx + p (deux cases), entières puis'
    ' fractionnaires ; une droite x = c (pièges : x seul, y calculé dans une seule équation mal, signe)',
    POSITIONS, 3,
    [INTERSECTION_ENTIERE, INTERSECTION_FRACTION, INTERSECTION_VERTICALE],
    [spec('y = 3x − 7 et y = −2x + 3 → I(2 ; −1)', 0, SP_IE, ['2', '-1'], 'correct'),
     spec('Erreur : coordonnées échangées', 0, SP_IE, ['-1', '2'], 'incorrect'),
     spec('y = 2x + 1 et y = −x + 3 → I(2/3 ; 7/3)', 1, SP_IF, ['\\frac{2}{3}', '\\frac{7}{3}'], 'correct'),
     spec('Erreur : x de signe faux', 1, SP_IF, ['-\\frac{2}{3}', '-\\frac{1}{3}'], 'incorrect'),
     spec('x = −2 et y = 3x + 1 → I(−2 ; −5)', 2, SP_IV, ['-2', '-5'], 'correct'),
     spec('Erreur : y = 1 (ordonnée à l\'origine)', 2, SP_IV, ['-2', '1'], 'incorrect')]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
