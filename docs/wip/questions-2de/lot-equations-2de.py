"""Écrit les 10 modèles du lot 2 « Équations et inéquations du premier degré » de la 2de
dans scripts/questions/2de-equations/.

Phase 0 validée par David le 2026-10-27 (§ 8 du journal `docs/wip/questions-2de-progress.md`).
Bornes : `bornes/lycee/2de.json` (2-265, 266, 267, 279, 280, 281, 429 à 432 ; sens des inégalités :
décision l2-3, les quatre sens). Un point par modèle ; le nœud et le tag sont posés par la
migration de rangement, après le `--publier` de David.

Décisions et pièges :
- réponse en ensemble : une case `S = ?`, `answerKind: 'intervalles'` ({3}, ∅, ℝ, intervalles ;
  borne non simplifiée = ½ ; « 3 » sans accolades ou « x ⩾ 2 » = faux) ;
- les variables sont substituées telles quelles dans les `eval` : toujours `(a)`, `-(a)` ;
- sens de l'inégalité tiré (`s` : 0 <, 1 ⩽, 2 >, 3 ⩾) ; coefficient négatif = sens inversé ;
- cas a = c (équation ou inéquation) : ∅ ou ℝ, tiré par `t` ;
- variables `e` et `i` interdites.

    python3 docs/wip/questions-2de/lot-equations-2de.py scripts/questions/2de-equations
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]
THEME = 'Calcul littéral'
EQUATIONS = ('Equations', 'Ensemble des solutions')
INEQUATIONS = ('Inéquations', 'Premier degré')
INTERVALLES = {'blankDefaults': {'answerKind': 'intervalles'}}


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(v) for k, v in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(nom, title, description, categorie, level, variations, specs, delay=60):
    m = {'title': title, 'description': description, 'grades': ['2'], 'theme': THEME,
         'domain': categorie[0], 'subdomain': categorie[1], 'level': level, 'delay': delay,
         'status': 'draft', 'shared': INTERVALLES, 'variations': variations, 'testSpecs': specs}
    return nom, m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


X = var('x', 'x|x')


def variation(statement, variables, answer, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [{'expectedAnswer': answer}]
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


def equation(eq):
    return ("Résous dans $\\mathbb{R}$ l'équation $" + eq
            + "$.\n\nL'ensemble des solutions est $S=?$.")


def inequation(ineq):
    return ("Résous dans $\\mathbb{R}$ l'inéquation $" + ineq
            + "$.\n\nL'ensemble des solutions est $S=?$.")


def conclusion(ensemble):
    return '$S=' + col(ensemble) + '$.'


def singleton(r):
    return '\\{ ' + r + ' \\}'


def paire(r1, r2):
    return '\\{ ' + r1 + ' ; ' + r2 + ' \\}'


# --- Inégalités : sens tiré par `s` (0 <, 1 ⩽, 2 >, 3 ⩾) ------------------------------------

SENS = ['<', '\\leqslant ', '>', '\\geqslant ']
SENS_INVERSE = ['>', '\\geqslant ', '<', '\\leqslant ']


def signe(inverse=False):
    return selon('s', SENS_INVERSE if inverse else SENS)


def intervalles(r):
    """Ensembles de x < r, x ⩽ r, x > r, x ⩾ r (réponse attendue)."""
    return [']-\\infty;' + r + '[', ']-\\infty;' + r + ']', ']' + r + ';+\\infty[',
            '[' + r + ';+\\infty[']


def intervalles_affiches(r):
    return ['\\left]-\\infty\\,;' + r + '\\right[', '\\left]-\\infty\\,;' + r + '\\right]',
            '\\left]' + r + '\\,;+\\infty\\right[', '\\left[' + r + '\\,;+\\infty\\right[']


def solution_inequation(r, inverse=False):
    liste = intervalles(r)
    if inverse:
        liste = liste[2:] + liste[:2]
    return selon('s', liste)


def conclusion_inequation(r, inverse=False):
    liste = intervalles_affiches(r)
    if inverse:
        liste = liste[2:] + liste[:2]
    return conclusion(selon('s', liste))


def crochet(r):
    """Crochet de la borne r, selon le sens tiré (`s` pair : stricte)."""
    stricte = ('L\'inégalité est **stricte** : $' + r + '$ n\'est pas solution, le crochet est'
               ' **ouvert** de son côté.')
    large = ('L\'inégalité est **large** : $' + r + '$ est solution, le crochet est **fermé** de'
             ' son côté.')
    return selon('s', [stricte, large, stricte, large])


MODELES = []

# --- 1. 2-430 : a + x = b ---------------------------------------------------------------------

ISOLER_SOMME = ('On isole $x$ : on {{if:a>0|soustrait ${{a}}$|ajoute ${{eval:-(a)}}$}} aux deux'
                ' membres de l\'équation.')

SOMME_ENTIERS = variation(
    equation('x{{eval:a;+}}={{b}}'),
    [var('a', '1..20;±'), var('b', '-20..20')],
    singleton('{{eval:(b)-(a)}}'),
    [ISOLER_SOMME,
     '$$x{{eval:a;+}}={{b}}\\iff x={{b}}{{eval:-(a);+}}\\iff x={{eval:(b)-(a)}}$$',
     'L\'équation a une seule solution. ' + conclusion(singleton('{{eval:(b)-(a)}}'))],
    ['b != a'])

SOMME_DECIMAUX = variation(
    equation('{{a}}+x={{b}}'),
    [var('A', '1..99;±'), var('B', '-99..99'), var('a', 'eval:(A)/10;d'),
     var('b', 'eval:(B)/10;d')],
    singleton('{{eval:((B)-(A))/10;d}}'),
    [ISOLER_SOMME,
     '$${{a}}+x={{b}}\\iff x={{b}}{{eval:-(a);+}}\\iff x={{eval:((B)-(A))/10;d}}$$',
     'L\'équation a une seule solution. ' + conclusion(singleton('{{eval:((B)-(A))/10;d}}'))],
    ['mod(A,10) != 0', 'B != A'])

SP_SOMME = {'a': 7, 'b': -3}
SP_DEC = {'A': -23, 'B': 15, 'a': '-2.3', 'b': '1.5'}
MODELES.append(modele(
    '01-equation-a-plus-x-egal-b', 'Résoudre une équation a + x = b',
    'Ensemble des solutions de x + a = b (entiers relatifs) et de a + x = b (décimaux)',
    EQUATIONS, 1, [SOMME_ENTIERS, SOMME_DECIMAUX],
    [spec('x + 7 = −3 : S = {−10}', 0, SP_SOMME, '\\{-10\\}', 'correct'),
     spec('« S = » tapé en tête', 0, SP_SOMME, 'S=\\{-10\\}', 'correct'),
     spec('Erreur : a ajouté au lieu d\'être soustrait ({4})', 0, SP_SOMME, '\\{4\\}', 'incorrect'),
     spec('Erreur : la solution sans accolades', 0, SP_SOMME, '-10', 'incorrect'),
     spec('−2,3 + x = 1,5 : S = {3,8}', 1, SP_DEC, '\\{3{,}8\\}', 'correct'),
     spec('Erreur : −0,8 (signe de a gardé)', 1, SP_DEC, '\\{-0{,}8\\}', 'incorrect')],
    delay=45))

# --- 2. 2-429 : ax = b ------------------------------------------------------------------------

DIVISER = 'On divise les deux membres par ${{a}}$, qui n\'est pas nul.'

PRODUIT_ENTIER = variation(
    equation('{{eval:(a)*x}}={{eval:(a)*(k)}}'),
    [X, var('a', '2..9;±'), var('k', '1..9;±')],
    singleton('{{k}}'),
    [DIVISER,
     '$${{eval:(a)*x}}={{eval:(a)*(k)}}\\iff x=\\frac{ {{eval:(a)*(k)}} }{ {{a}} }\\iff x={{k}}$$',
     conclusion(singleton('{{k}}'))])

PRODUIT_FRACTION = variation(
    equation('{{eval:(a)*x}}={{b}}'),
    [X, var('a', '2..9;±'), var('b', '1..20;±')],
    singleton('{{eval:(b)/(a)}}'),
    [DIVISER,
     '$${{eval:(a)*x}}={{b}}\\iff x=\\frac{ {{b}} }{ {{a}} }\\iff x={{eval:(b)/(a)}}$$',
     'On donne la fraction **irréductible**. ' + conclusion(singleton('{{eval:(b)/(a)}}'))],
    ['mod(b,a) != 0'])

INVERSE = '{{if:p==1|{{q}}|\\frac{ {{q}} }{ {{p}} }}}'

PRODUIT_COEF_FRACTION = variation(
    equation('\\frac{ {{p}} }{ {{q}} }x={{r}}'),
    [var('p', '1..5'), var('q', '2..7'), var('r', '1..9;±')],
    singleton('{{eval:(r)*(q)/(p)}}'),
    ['Diviser par $\\frac{ {{p}} }{ {{q}} }$, c\'est multiplier par son inverse $' + INVERSE
     + '$ : on multiplie les deux membres par $' + INVERSE + '$.',
     '$$\\frac{ {{p}} }{ {{q}} }x={{r}}\\iff x={{r}}\\times' + INVERSE
     + '\\iff x={{eval:(r)*(q)/(p)}}$$',
     conclusion(singleton('{{eval:(r)*(q)/(p)}}'))],
    ['gcd(p,q) == 1', 'p != q'])

SP_PE = {'a': -4, 'k': 3}
SP_PF = {'a': 6, 'b': -4}
SP_PC = {'p': 2, 'q': 3, 'r': 4}
MODELES.append(modele(
    '02-equation-ax-egal-b', 'Résoudre une équation ax = b',
    'Ensemble des solutions de ax = b : solution entière, solution fractionnaire, coefficient'
    ' fractionnaire (2/3 x = 4)',
    EQUATIONS, 2, [PRODUIT_ENTIER, PRODUIT_FRACTION, PRODUIT_COEF_FRACTION],
    [spec('−4x = −12 : S = {3}', 0, SP_PE, '\\{3\\}', 'correct'),
     spec('Erreur : signe perdu ({−3})', 0, SP_PE, '\\{-3\\}', 'incorrect'),
     spec('Erreur : soustraction au lieu de division ({−8})', 0, SP_PE, '\\{-8\\}', 'incorrect'),
     spec('6x = −4 : S = {−2/3}', 1, SP_PF, '\\{-\\frac{2}{3}\\}', 'correct'),
     spec('Fraction non simplifiée (−4/6)', 1, SP_PF, '\\{-\\frac{4}{6}\\}', 'unoptimal_form',
          ['intervalForm']),
     spec('Erreur : a/b ({−3/2})', 1, SP_PF, '\\{-\\frac{3}{2}\\}', 'incorrect'),
     spec('2/3 x = 4 : S = {6}', 2, SP_PC, '\\{6\\}', 'correct'),
     spec('Erreur : multiplié par 2/3 ({8/3})', 2, SP_PC, '\\{\\frac{8}{3}\\}', 'incorrect')],
    delay=45))

# --- 3. 2-265 : ax + b = 0 --------------------------------------------------------------------

AFFINE_ETAPES = [
    'On isole $x$ : on {{if:b>0|soustrait ${{b}}$|ajoute ${{eval:-(b)}}$}} aux deux membres, puis'
    ' on divise par ${{a}}$, qui n\'est pas nul.',
    '$${{eval:(a)*x+(b)}}=0\\iff {{eval:(a)*x}}={{eval:-(b)}}\\iff x=\\frac{ {{eval:-(b)}} }{ {{a}} }'
    '\\iff x={{eval:-(b)/(a)}}$$',
    conclusion(singleton('{{eval:-(b)/(a)}}'))]

AFFINE_ENTIER = variation(
    equation('{{eval:(a)*x+(b)}}=0'),
    [X, var('a', '2..9;±'), var('k', '1..9;±'), var('b', 'eval:-(a)*(k)')],
    singleton('{{eval:-(b)/(a)}}'),
    AFFINE_ETAPES)

AFFINE_FRACTION = variation(
    equation('{{eval:(a)*x+(b)}}=0'),
    [X, var('a', '2..9;±'), var('b', '1..9;±')],
    singleton('{{eval:-(b)/(a)}}'),
    AFFINE_ETAPES,
    ['mod(b,a) != 0'])

SP_AE = {'a': 3, 'k': -4, 'b': 12}
SP_AF = {'a': 4, 'b': -6}
MODELES.append(modele(
    '03-equation-ax-plus-b-egal-0', 'Résoudre une équation ax + b = 0',
    'Ensemble des solutions de ax + b = 0 : solution entière, solution fractionnaire',
    EQUATIONS, 3, [AFFINE_ENTIER, AFFINE_FRACTION],
    [spec('3x + 12 = 0 : S = {−4}', 0, SP_AE, '\\{-4\\}', 'correct'),
     spec('Erreur : signe oublié ({4})', 0, SP_AE, '\\{4\\}', 'incorrect'),
     spec('Erreur : −a/b ({−1/4})', 0, SP_AE, '\\{-\\frac{1}{4}\\}', 'incorrect'),
     spec('4x − 6 = 0 : S = {3/2}', 1, SP_AF, '\\{\\frac{3}{2}\\}', 'correct'),
     spec('Écriture décimale {1,5}', 1, SP_AF, '\\{1{,}5\\}', 'correct'),
     spec('Fraction non simplifiée (6/4)', 1, SP_AF, '\\{\\frac{6}{4}\\}', 'unoptimal_form',
          ['intervalForm']),
     spec('Erreur : signe ({−3/2})', 1, SP_AF, '\\{-\\frac{3}{2}\\}', 'incorrect')],
    delay=45))

# --- 4. 2-279 : ax + b = cx + d ---------------------------------------------------------------

DEUX_MEMBRES = [
    'On regroupe les termes en $x$ dans le membre de gauche et les nombres dans celui de droite.',
    '$$\\begin{align} {{eval:(a)*x+(b)}}={{eval:(c)*x+(d)}} & \\iff ' + col('{{eval:(a)*x}}', 1)
    + col('{{eval:-(c)*x;+}}', 1) + '={{d}}' + col('{{eval:-(b);+}}', 0)
    + ' \\\\ & \\iff {{eval:((a)-(c))*x}}={{eval:(d)-(b)}} \\\\ & \\iff x=\\frac{ {{eval:(d)-(b)}} }'
    '{ {{eval:(a)-(c)}} }={{eval:((d)-(b))/((a)-(c))}} \\end{align}$$',
    'L\'équation a une seule solution. '
    + conclusion(singleton('{{eval:((d)-(b))/((a)-(c))}}'))]

MEMBRES_ENTIER = variation(
    equation('{{eval:(a)*x+(b)}}={{eval:(c)*x+(d)}}'),
    [X, var('a', '1..9;±'), var('c', '1..9;±!a'), var('k', '1..9;±'), var('b', '1..9;±'),
     var('d', 'eval:((a)-(c))*(k)+(b)')],
    singleton('{{eval:((d)-(b))/((a)-(c))}}'),
    DEUX_MEMBRES,
    ['d != 0'])

MEMBRES_FRACTION = variation(
    equation('{{eval:(a)*x+(b)}}={{eval:(c)*x+(d)}}'),
    [X, var('a', '1..9;±'), var('c', '1..9;±!a'), var('b', '1..9;±'), var('d', '1..9;±')],
    singleton('{{eval:((d)-(b))/((a)-(c))}}'),
    DEUX_MEMBRES,
    ['mod((d)-(b),(a)-(c)) != 0'])

# a = c : on développe a(x + u) + v, qui vaut ax + au + v ; t = 1 → égalité toujours vraie (ℝ)
MEMBRES_CAS = variation(
    equation('{{a}}(x{{eval:u;+}}){{eval:v;+}}={{eval:(a)*x+(a)*(u)+(v)+(1-(t))*(g)}}'),
    [X, var('a', '2..9'), var('u', '1..9;±'), var('v', '1..9;±'), var('t', '0..1'),
     var('g', '1..9;±')],
    selon('t', ['\\varnothing', '\\mathbb{R}']),
    ['On développe le membre de gauche : ${{a}}(x{{eval:u;+}}){{eval:v;+}}'
     '={{eval:(a)*x+(a)*(u)+(v)}}$.',
     'Les termes en $x$ sont les mêmes des deux côtés : en les retirant, il reste'
     ' ${{eval:(a)*(u)+(v)}}={{eval:(a)*(u)+(v)+(1-(t))*(g)}}$, une égalité '
     + selon('t', ['**toujours fausse** : aucun réel n\'est solution.',
                   '**toujours vraie** : tous les réels sont solutions.']),
     conclusion(selon('t', ['\\varnothing', '\\mathbb{R}']))],
    ['(a)*(u)+(v) != 0'])

SP_ME = {'a': 5, 'c': 2, 'k': -3, 'b': 4, 'd': -5}
SP_MF = {'a': 2, 'c': -2, 'b': 3, 'd': -4}
SP_VIDE = {'a': 2, 'u': 3, 'v': -1, 't': 0, 'g': 4}
SP_TOUS = {'a': 2, 'u': 3, 'v': -1, 't': 1, 'g': 4}
MODELES.append(modele(
    '04-equation-ax-plus-b-egal-cx-plus-d', 'Résoudre une équation ax + b = cx + d',
    'Ensemble des solutions de ax + b = cx + d : solution entière, fractionnaire ; cas a = c'
    ' (aucune solution ou tous les réels)',
    EQUATIONS, 4, [MEMBRES_ENTIER, MEMBRES_FRACTION, MEMBRES_CAS],
    [spec('5x + 4 = 2x − 5 : S = {−3}', 0, SP_ME, '\\{-3\\}', 'correct'),
     spec('Erreur : signe en changeant de membre ({−1/3})', 0, SP_ME, '\\{-\\frac{1}{3}\\}',
          'incorrect'),
     spec('Erreur : {3}', 0, SP_ME, '\\{3\\}', 'incorrect'),
     spec('2x + 3 = −2x − 4 : S = {−7/4}', 1, SP_MF, '\\{-\\frac{7}{4}\\}', 'correct'),
     spec('Erreur : 2x − 2x (dénominateur 0 oublié) {−7}', 1, SP_MF, '\\{-7\\}', 'incorrect'),
     spec('2(x + 3) − 1 = 2x + 9 : S = ∅', 2, SP_VIDE, '\\varnothing', 'correct'),
     spec('Erreur : ℝ au lieu de ∅', 2, SP_VIDE, '\\mathbb{R}', 'incorrect'),
     spec('Erreur : {0}', 2, SP_VIDE, '\\{0\\}', 'incorrect'),
     spec('2(x + 3) − 1 = 2x + 5 : S = ℝ', 2, SP_TOUS, '\\mathbb{R}', 'correct'),
     spec('Erreur : ∅ au lieu de ℝ', 2, SP_TOUS, '\\varnothing', 'incorrect')]))

# --- 5. 2-267 : produit nul ------------------------------------------------------------------

PRODUIT_NUL = ('**Un produit est nul si et seulement si l\'un au moins de ses facteurs est nul.**')

NUL_ENTIERS = variation(
    equation('(x{{eval:-(p);+}})(x{{eval:-(q);+}})=0'),
    [var('p', '1..9;±'), var('q', '1..9;±!p')],
    paire('{{p}}', '{{q}}'),
    [PRODUIT_NUL,
     '$$(x{{eval:-(p);+}})(x{{eval:-(q);+}})=0\\iff x{{eval:-(p);+}}=0 \\text{ ou }'
     ' x{{eval:-(q);+}}=0\\iff x={{p}} \\text{ ou } x={{q}}$$',
     'L\'équation a deux solutions. ' + conclusion(paire('{{p}}', '{{q}}'))])

NUL_AFFINES = variation(
    equation('({{eval:(a)*x+(b)}})({{eval:(c)*x+(d)}})=0'),
    [X, var('a', '2..5'), var('b', '1..9;±'), var('c', '2..5'), var('d', '1..9;±')],
    paire('{{eval:-(b)/(a)}}', '{{eval:-(d)/(c)}}'),
    [PRODUIT_NUL,
     '$$\\begin{align} ({{eval:(a)*x+(b)}})({{eval:(c)*x+(d)}})=0 & \\iff {{eval:(a)*x+(b)}}=0'
     ' \\text{ ou } {{eval:(c)*x+(d)}}=0 \\\\ & \\iff x={{eval:-(b)/(a)}} \\text{ ou }'
     ' x={{eval:-(d)/(c)}} \\end{align}$$',
     'L\'équation a deux solutions. '
     + conclusion(paire('{{eval:-(b)/(a)}}', '{{eval:-(d)/(c)}}'))],
    ['(b)*(c) != (a)*(d)', 'mod(b,a) != 0 || mod(d,c) != 0'])

SP_NE = {'p': 3, 'q': -5}
SP_NA = {'a': 2, 'b': -3, 'c': 3, 'd': 1}
MODELES.append(modele(
    '05-equation-produit-nul', 'Résoudre une équation produit nul',
    'Ensemble des solutions de (x − p)(x − q) = 0 (entiers) et de (ax + b)(cx + d) = 0'
    ' (fractions)',
    EQUATIONS, 5, [NUL_ENTIERS, NUL_AFFINES],
    [spec('(x − 3)(x + 5) = 0 : S = {3 ; −5}', 0, SP_NE, '\\{3;-5\\}', 'correct'),
     spec('Ordre inverse {−5 ; 3}', 0, SP_NE, '\\{-5;3\\}', 'correct'),
     spec('Erreur : signes inversés {−3 ; 5}', 0, SP_NE, '\\{-3;5\\}', 'incorrect'),
     spec('Erreur : une seule solution {3}', 0, SP_NE, '\\{3\\}', 'incorrect'),
     spec('(2x − 3)(3x + 1) = 0 : S = {3/2 ; −1/3}', 1, SP_NA,
          '\\{\\frac{3}{2};-\\frac{1}{3}\\}', 'correct'),
     spec('Erreur : b/a au lieu de −b/a', 1, SP_NA, '\\{-\\frac{3}{2};\\frac{1}{3}\\}',
          'incorrect'),
     spec('Erreur : signes changés seulement {3 ; −1}', 1, SP_NA, '\\{3;-1\\}', 'incorrect')]))

# --- 6. 2-281 : x² = a ----------------------------------------------------------------------

CARRE = ('Les nombres dont le carré vaut $a>0$ sont $\\sqrt{a}$ et $-\\sqrt{a}$ : **deux**'
         ' solutions. Si $a=0$, une seule ($0$) ; si $a<0$, aucune (un carré est positif).')

CARRE_PARFAIT = variation(
    equation('x^2={{eval:(n)^2}}'),
    [var('n', '1..12')],
    paire('-{{n}}', '{{n}}'),
    [CARRE,
     '${{eval:(n)^2}}>0$ et $\\sqrt{ {{eval:(n)^2}} }={{n}}$ : $x^2={{eval:(n)^2}}\\iff x={{n}}'
     ' \\text{ ou } x=-{{n}}$.',
     conclusion(paire('-{{n}}', '{{n}}'))])

CARRE_RACINE = variation(
    equation('x^2={{a}}'),
    [var('a', '2..23')],
    paire('-\\sqrt{ {{a}} }', '\\sqrt{ {{a}} }'),
    [CARRE,
     '${{a}}>0$ : $x^2={{a}}\\iff x=\\sqrt{ {{a}} } \\text{ ou } x=-\\sqrt{ {{a}} }$.',
     conclusion(paire('-\\sqrt{ {{a}} }', '\\sqrt{ {{a}} }'))],
    ['mod(a,4) != 0', 'mod(a,9) != 0'])

# t = 0 : x² = 0 ; t = 1 : x² = −n
CARRE_CAS = variation(
    equation('x^2={{eval:-(t)*(n)}}'),
    [var('t', '0..1'), var('n', '1..20')],
    selon('t', [singleton('0'), '\\varnothing']),
    [CARRE,
     selon('t', ['$x^2=0\\iff x=0$ : une seule solution.',
                 '${{eval:-(n)}}<0$ et un carré n\'est jamais négatif : aucune solution.']),
     conclusion(selon('t', [singleton('0'), '\\varnothing']))])

CARRE_SIMPLIFIER = variation(
    equation('x^2={{eval:(k)^2*(m)}}'),
    [var('k', '2..5'), var('m', '2|3|5|6|7')],
    paire('-{{k}}\\sqrt{ {{m}} }', '{{k}}\\sqrt{ {{m}} }'),
    [CARRE,
     '${{eval:(k)^2*(m)}}>0$ : $x=\\sqrt{ {{eval:(k)^2*(m)}} }$ ou $x=-\\sqrt{ {{eval:(k)^2*(m)}} }$.',
     'On simplifie la racine : $\\sqrt{ {{eval:(k)^2*(m)}} }=\\sqrt{ {{eval:(k)^2}}\\times{{m}} }'
     '=\\sqrt{ {{eval:(k)^2}} }\\times\\sqrt{ {{m}} }={{k}}\\sqrt{ {{m}} }$.',
     conclusion(paire('-{{k}}\\sqrt{ {{m}} }', '{{k}}\\sqrt{ {{m}} }'))])

SP_CP = {'n': 7}
SP_CR = {'a': 11}
SP_C0 = {'t': 0, 'n': 5}
SP_CN = {'t': 1, 'n': 5}
SP_CS = {'k': 2, 'm': 3}
MODELES.append(modele(
    '06-equation-x-carre-egal-a', 'Résoudre une équation x² = a',
    'Ensemble des solutions de x² = a : carré parfait, racine non entière, a = 0 ou a < 0,'
    ' racine à simplifier (x² = 12)',
    EQUATIONS, 6, [CARRE_PARFAIT, CARRE_RACINE, CARRE_CAS, CARRE_SIMPLIFIER],
    [spec('x² = 49 : S = {−7 ; 7}', 0, SP_CP, '\\{-7;7\\}', 'correct'),
     spec('Erreur : la solution négative oubliée {7}', 0, SP_CP, '\\{7\\}', 'incorrect'),
     spec('Erreur : a/2 {−24,5 ; 24,5}', 0, SP_CP, '\\{-24{,}5;24{,}5\\}', 'incorrect'),
     spec('x² = 11 : S = {−√11 ; √11}', 1, SP_CR, '\\{-\\sqrt{11};\\sqrt{11}\\}', 'correct'),
     spec('Erreur : {√11}', 1, SP_CR, '\\{\\sqrt{11}\\}', 'incorrect'),
     spec('x² = 0 : S = {0}', 2, SP_C0, '\\{0\\}', 'correct'),
     spec('Erreur : ∅ au lieu de {0}', 2, SP_C0, '\\varnothing', 'incorrect'),
     spec('x² = −5 : S = ∅', 2, SP_CN, '\\varnothing', 'correct'),
     spec('Erreur : {−√5 ; √5}', 2, SP_CN, '\\{-\\sqrt{5};\\sqrt{5}\\}', 'incorrect'),
     spec('x² = 12 : S = {−2√3 ; 2√3}', 3, SP_CS, '\\{-2\\sqrt{3};2\\sqrt{3}\\}', 'correct'),
     spec('Racine non simplifiée {−√12 ; √12}', 3, SP_CS, '\\{-\\sqrt{12};\\sqrt{12}\\}',
          'unoptimal_form', ['intervalForm']),
     spec('Erreur : {−6 ; 6}', 3, SP_CS, '\\{-6;6\\}', 'incorrect')]))

# --- 7. 2-432 : a + x ⩾ b -------------------------------------------------------------------

ISOLER_INEG = ('On isole $x$ : on {{if:a>0|soustrait ${{a}}$|ajoute ${{eval:-(a)}}$}} aux deux'
               ' membres. Ajouter ou soustraire un nombre **ne change pas** le sens de'
               ' l\'inégalité.')

INEG_SOMME_ENTIERS = variation(
    inequation('x{{eval:a;+}}' + signe() + '{{b}}'),
    [var('a', '1..20;±'), var('b', '-20..20'), var('s', '0..3')],
    solution_inequation('{{eval:(b)-(a)}}'),
    [ISOLER_INEG,
     '$$x{{eval:a;+}}' + signe() + '{{b}}\\iff x' + signe() + '{{eval:(b)-(a)}}$$',
     crochet('{{eval:(b)-(a)}}'),
     conclusion_inequation('{{eval:(b)-(a)}}')],
    ['b != a'])

INEG_SOMME_DECIMAUX = variation(
    inequation('{{a}}+x' + signe() + '{{b}}'),
    [var('A', '1..99;±'), var('B', '-99..99'), var('a', 'eval:(A)/10;d'),
     var('b', 'eval:(B)/10;d'), var('s', '0..3')],
    solution_inequation('{{eval:((B)-(A))/10;d}}'),
    [ISOLER_INEG,
     '$${{a}}+x' + signe() + '{{b}}\\iff x' + signe() + '{{eval:((B)-(A))/10;d}}$$',
     crochet('{{eval:((B)-(A))/10;d}}'),
     conclusion_inequation('{{eval:((B)-(A))/10;d}}')],
    ['mod(A,10) != 0', 'B != A'])

SP_IS = {'a': 4, 'b': -2, 's': 3}
SP_IS0 = {'a': 4, 'b': -2, 's': 0}
SP_ID = {'A': -15, 'B': 22, 'a': '-1.5', 'b': '2.2', 's': 1}
MODELES.append(modele(
    '07-inequation-a-plus-x', 'Résoudre une inéquation a + x ⩾ b',
    'Ensemble des solutions de x + a ⩾ b (entiers relatifs) et de a + x ⩾ b (décimaux), les'
    ' quatre sens',
    INEQUATIONS, 1, [INEG_SOMME_ENTIERS, INEG_SOMME_DECIMAUX],
    [spec('x + 4 ⩾ −2 : S = [−6 ; +∞[', 0, SP_IS, '[-6;+\\infty[', 'correct'),
     spec('Erreur : crochet ouvert ]−6 ; +∞[', 0, SP_IS, ']-6;+\\infty[', 'incorrect'),
     spec('Erreur : mauvais côté ]−∞ ; −6]', 0, SP_IS, ']-\\infty;-6]', 'incorrect'),
     spec('Erreur : 4 ajouté [2 ; +∞[', 0, SP_IS, '[2;+\\infty[', 'incorrect'),
     spec('Erreur : inégalité au lieu d\'un ensemble', 0, SP_IS, 'x\\geqslant -6', 'incorrect'),
     spec('x + 4 < −2 : S = ]−∞ ; −6[', 0, SP_IS0, ']-\\infty;-6[', 'correct'),
     spec('−1,5 + x ⩽ 2,2 : S = ]−∞ ; 3,7]', 1, SP_ID, ']-\\infty;3{,}7]', 'correct'),
     spec('Erreur : ]−∞ ; 0,7]', 1, SP_ID, ']-\\infty;0{,}7]', 'incorrect')],
    delay=45))

# --- 8. 2-431 : ax ⩾ b ----------------------------------------------------------------------

def diviser_ineg(positif):
    if positif:
        return ('On divise les deux membres par ${{a}}$, un nombre **positif** : le sens de'
                ' l\'inégalité **ne change pas**.')
    return ('On divise les deux membres par ${{a}}$, un nombre **négatif** : le sens de'
            ' l\'inégalité **change**.')


def ineg_produit(a_plage, positif):
    r = '{{eval:(b)/(a)}}'
    return variation(
        inequation('{{eval:(a)*x}}' + signe() + '{{b}}'),
        [X, var('a', a_plage), var('b', '1..30;±'), var('s', '0..3')],
        solution_inequation(r, not positif),
        [diviser_ineg(positif),
         '$${{eval:(a)*x}}' + signe() + '{{b}}\\iff x' + signe(not positif)
         + '\\frac{ {{b}} }{ {{a}} }\\iff x' + signe(not positif) + r + '$$',
         crochet(r),
         conclusion_inequation(r, not positif)])


SP_PP = {'a': 3, 'b': 12, 's': 2}
SP_PN = {'a': -2, 'b': 5, 's': 3}
SP_PN1 = {'a': -1, 'b': 4, 's': 0}
MODELES.append(modele(
    '08-inequation-ax', 'Résoudre une inéquation ax ⩾ b',
    'Ensemble des solutions de ax ⩾ b : a positif, puis a négatif (le sens change), les quatre'
    ' sens',
    INEQUATIONS, 2, [ineg_produit('2..9', True), ineg_produit('-9..-1', False)],
    [spec('3x > 12 : S = ]4 ; +∞[', 0, SP_PP, ']4;+\\infty[', 'correct'),
     spec('Erreur : soustraction ]9 ; +∞[', 0, SP_PP, ']9;+\\infty[', 'incorrect'),
     spec('Erreur : crochet fermé [4 ; +∞[', 0, SP_PP, '[4;+\\infty[', 'incorrect'),
     spec('−2x ⩾ 5 : S = ]−∞ ; −5/2]', 1, SP_PN, ']-\\infty;-\\frac{5}{2}]', 'correct'),
     spec('Écriture décimale ]−∞ ; −2,5]', 1, SP_PN, ']-\\infty;-2{,}5]', 'correct'),
     spec('Erreur : sens non changé [−5/2 ; +∞[', 1, SP_PN, '[-\\frac{5}{2};+\\infty[',
          'incorrect'),
     spec('Erreur : signe perdu ]−∞ ; 5/2]', 1, SP_PN, ']-\\infty;\\frac{5}{2}]', 'incorrect'),
     spec('−x < 4 : S = ]−4 ; +∞[', 1, SP_PN1, ']-4;+\\infty[', 'correct'),
     spec('Erreur : sens non changé ]−∞ ; −4[', 1, SP_PN1, ']-\\infty;-4[', 'incorrect')]))

# --- 9. 2-266 : ax + b > 0 ------------------------------------------------------------------

def ineg_affine(a_plage, positif):
    r = '{{eval:-(b)/(a)}}'
    return variation(
        inequation('{{eval:(a)*x+(b)}}' + signe() + '0'),
        [X, var('a', a_plage), var('b', '1..9;±'), var('s', '0..3')],
        solution_inequation(r, not positif),
        ['On {{if:b>0|soustrait ${{b}}$|ajoute ${{eval:-(b)}}$}} aux deux membres : le sens ne'
         ' change pas.',
         diviser_ineg(positif),
         '$${{eval:(a)*x+(b)}}' + signe() + '0\\iff {{eval:(a)*x}}' + signe() + '{{eval:-(b)}}'
         '\\iff x' + signe(not positif) + r + '$$',
         crochet(r),
         conclusion_inequation(r, not positif)])


SP_AP = {'a': 2, 'b': -7, 's': 2}
SP_AN = {'a': -3, 'b': 6, 's': 1}
MODELES.append(modele(
    '09-inequation-ax-plus-b', 'Résoudre une inéquation ax + b > 0',
    'Ensemble des solutions de ax + b > 0 : a positif, puis a négatif (le sens change), les'
    ' quatre sens',
    INEQUATIONS, 3, [ineg_affine('2..9', True), ineg_affine('-9..-2', False)],
    [spec('2x − 7 > 0 : S = ]7/2 ; +∞[', 0, SP_AP, ']\\frac{7}{2};+\\infty[', 'correct'),
     spec('Erreur : borne −7/2', 0, SP_AP, ']-\\frac{7}{2};+\\infty[', 'incorrect'),
     spec('Erreur : mauvais côté ]−∞ ; 7/2[', 0, SP_AP, ']-\\infty;\\frac{7}{2}[', 'incorrect'),
     spec('−3x + 6 ⩽ 0 : S = [2 ; +∞[', 1, SP_AN, '[2;+\\infty[', 'correct'),
     spec('Erreur : sens non changé ]−∞ ; 2]', 1, SP_AN, ']-\\infty;2]', 'incorrect'),
     spec('Erreur : crochet ouvert ]2 ; +∞[', 1, SP_AN, ']2;+\\infty[', 'incorrect')]))

# --- 10. 2-280 : ax + b ⩾ cx + d ------------------------------------------------------------

def ineg_membres(c_plage, positif):
    r = '{{eval:((d)-(b))/((a)-(c))}}'
    return variation(
        inequation('{{eval:(a)*x+(b)}}' + signe() + '{{eval:(c)*x+(d)}}'),
        [X, var('a', '1..9;±'), var('c', c_plage), var('b', '1..9;±'), var('d', '1..9;±'),
         var('s', '0..3')],
        solution_inequation(r, not positif),
        ['On regroupe les termes en $x$ à gauche et les nombres à droite : le sens ne change pas.',
         '$${{eval:(a)*x+(b)}}' + signe() + '{{eval:(c)*x+(d)}}\\iff {{eval:((a)-(c))*x}}'
         + signe() + '{{eval:(d)-(b)}}$$',
         ('On divise par ${{eval:(a)-(c)}}$, un nombre **positif** : le sens **ne change pas**.'
          if positif else
          'On divise par ${{eval:(a)-(c)}}$, un nombre **négatif** : le sens **change**.')
         + ' $x' + signe(not positif) + r + '$.',
         crochet(r),
         conclusion_inequation(r, not positif)],
        ['(a)-(c) ' + ('> 0' if positif else '< 0'), 'd != b'])


# a = c : ax + b ⩾ ax + d revient à b ⩾ d ; t = 1 → toujours vraie (ℝ).
# d = b + g × (2t − 1) × (1 si s ∈ {0, 1}, −1 sinon) : pour < et ⩽, b < d ⇔ t = 1.
INEG_MEMBRES_CAS = variation(
    inequation('{{eval:(a)*x+(b)}}' + signe() + '{{eval:(a)*x+(d)}}'),
    [X, var('a', '2..9;±'), var('b', '1..9;±'), var('g', '1..9'), var('t', '0..1'),
     var('s', '0..3'), var('d', 'eval:(b)+(g)*(2*(t)-1)*(1-2*floor((s)/2))')],
    selon('t', ['\\varnothing', '\\mathbb{R}']),
    ['Les termes en $x$ sont les mêmes des deux côtés : en retirant ${{eval:(a)*x}}$, il reste'
     ' ${{b}}' + signe() + '{{d}}$.',
     'Cette inégalité ne dépend pas de $x$ : elle est '
     + selon('t', ['**toujours fausse** : aucun réel n\'est solution.',
                   '**toujours vraie** : tous les réels sont solutions.']),
     conclusion(selon('t', ['\\varnothing', '\\mathbb{R}']))],
    ['d != 0'])

SP_MP = {'a': 5, 'c': 2, 'b': -4, 'd': 8, 's': 3}
SP_MN = {'a': 1, 'c': 4, 'b': 3, 'd': -6, 's': 0}
SP_MV = {'a': 3, 'b': 2, 'g': 5, 't': 0, 's': 0, 'd': -3}
SP_MT = {'a': 3, 'b': 2, 'g': 5, 't': 1, 's': 3, 'd': -3}
MODELES.append(modele(
    '10-inequation-ax-plus-b-cx-plus-d', 'Résoudre une inéquation ax + b ⩾ cx + d',
    'Ensemble des solutions de ax + b ⩾ cx + d : a − c positif, négatif (le sens change), a = c'
    ' (aucune solution ou tous les réels), les quatre sens',
    INEQUATIONS, 4,
    [ineg_membres('1..9;±!a', True), ineg_membres('1..9;±!a', False), INEG_MEMBRES_CAS],
    [spec('5x − 4 ⩾ 2x + 8 : S = [4 ; +∞[', 0, SP_MP, '[4;+\\infty[', 'correct'),
     spec('Erreur : signe en changeant de membre [4/3 ; +∞[', 0, SP_MP,
          '[\\frac{4}{3};+\\infty[', 'incorrect'),
     spec('Erreur : crochet ouvert ]4 ; +∞[', 0, SP_MP, ']4;+\\infty[', 'incorrect'),
     spec('x + 3 < 4x − 6 : S = ]3 ; +∞[', 1, SP_MN, ']3;+\\infty[', 'correct'),
     spec('Erreur : sens non changé ]−∞ ; 3[', 1, SP_MN, ']-\\infty;3[', 'incorrect'),
     spec('3x + 2 < 3x − 3 : S = ∅', 2, SP_MV, '\\varnothing', 'correct'),
     spec('Erreur : ℝ au lieu de ∅', 2, SP_MV, '\\mathbb{R}', 'incorrect'),
     spec('3x + 2 ⩾ 3x − 3 : S = ℝ', 2, SP_MT, '\\mathbb{R}', 'correct'),
     spec('Écriture ]−∞ ; +∞[', 2, SP_MT, ']-\\infty;+\\infty[', 'correct'),
     spec('Erreur : ∅ au lieu de ℝ', 2, SP_MT, '\\varnothing', 'incorrect')]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
