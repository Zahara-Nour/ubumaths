"""Écrit les 4 modèles du lot 2 « Calcul littéral, équations » de la 3e dans scripts/questions/3-lot-2/.

Phase 0 validée par David le 2026-10-29 (journal `questions-3-progress.md` § 9, un point par modèle) :

| # | Point | Titre | Catégorie, niveau |
| 1 | 3-016 | Développer (a + b)² et (a − b)² | Calcul littéral › Transformation › Identités remarquables, 10 |
| 2 | 3-054 | Factoriser avec un facteur commun | Calcul littéral › Transformation › Factorisation, 11 |
| 3 | 3-014 | Résoudre une inéquation ax ⩾ b | Calcul littéral › Inéquations › ax ⩾ b, 1 |
| 4 | 3-015 | Résoudre une équation produit nul | Calcul littéral › Equations › Produit nul, 1 |

Bornes : `cycle4.json`, 3e (3-016 : les trois identités, exemple (x + 3)² ; 3-054 : facteur commun
apparent, pour se ramener à un produit nul ; 3-014 : ax ⩾ b, les quatre sens, a négatif possible ;
3-015 : (ax + b)(cx + d) = 0, coefficients décimaux possibles). Niveaux 10 et 11 : les premiers
libres de leur catégorie (relevé MCP du 2026-10-29). Le nœud et le tag sont posés par la migration
de rangement, après le `--publier` de David.

Décisions et pièges (juge mesuré le 2026-10-29, journal § 9.1) :
- 3-014 : réponse en inégalité « x > 4 », pas en intervalle ; une borne fraction attendue refuse
  son écriture décimale (et l'inverse) → bornes entières (v1, v2) ou fraction NON décimale (v3) ;
- 3-015 : « x = 3 ou x = −5/2 » n'est pas compris → ensemble S = {… ; …}, `answerKind:
  'intervalles'` comme 3-008 ; la v5 (factoriser d'abord) est la dernière, la plus difficile ;
- 3-054 : consigne « Factorise » ; le second facteur n'a pas de diviseur commun entier (sinon
  « le plus possible » attendrait 2(x + 2)(2x + 3)) et n'est jamais constant ;
- variables `e` et `i` interdites dans les `eval`.

    python3 docs/wip/questions/lot-3-2.py scripts/questions/3-lot-2
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
           delay=60, options=None, shared=None):
    m = {'title': title, 'description': description, 'grades': ['3'], 'theme': theme,
         'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': delay,
         'status': 'draft'}
    if options:
        m['options'] = options
    if shared:
        m['shared'] = shared
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


def ev(x):
    return '{{eval:' + x + '}}'


def frac(n, d):
    return '\\dfrac{' + n + '}{' + d + '}'


X = '\\times'
# La lettre x, pour les `eval` qui écrivent une expression (2x − 3, et non 2 × x + −3)
LETTRE = var('x', 'x|x')
MODELES = []

# --- 1. 3-016 : développer (a + b)² et (a − b)² -----------------------------------------------

DEVELOPPE = 'Développe et réduis :\n\n$$'
REPONSE = '$$\n\n$?$'
RAPPEL_SOMME = '**Carré d\'une somme** : $(a+b)^2=a^2+2ab+b^2$.'
RAPPEL_DIFF = '**Carré d\'une différence** : $(a-b)^2=a^2-2ab+b^2$.'
RAPPEL_PRODUIT = '**Produit d\'une somme par une différence** : $(a-b)(a+b)=a^2-b^2$.'


def carre_simple(signe):
    """(x ± n)², n de 1 à 9."""
    rappel = RAPPEL_SOMME if signe == '+' else RAPPEL_DIFF
    return variation(
        DEVELOPPE + '(x' + signe + '{{n}})^2' + REPONSE,
        [var('n', '1..9')],
        ['x^2' + signe + ev('2*n') + 'x+' + ev('n^2')],
        [rappel + ' Ici, $a=x$ et $b={{n}}$.',
         '$$(x' + signe + '{{n}})^2 = x^2 ' + signe + ' 2 ' + X + ' x ' + X + ' {{n}} + {{n}}^2 = '
         + col('{{solution}}') + '$$'])


def carre_ax(signe):
    """(ax ± b)², a de 2 à 5 : le carré porte sur a ET sur x."""
    rappel = RAPPEL_SOMME if signe == '+' else RAPPEL_DIFF
    return variation(
        DEVELOPPE + '({{a}}x' + signe + '{{b}})^2' + REPONSE,
        [var('a', '2..5'), var('b', '1..9')],
        [ev('a^2') + 'x^2' + signe + ev('2*a*b') + 'x+' + ev('b^2')],
        [rappel + ' Ici, $a={{a}}x$ et $b={{b}}$.',
         '$({{a}}x)^2 = {{a}}^2 ' + X + ' x^2 = ' + ev('a^2') + 'x^2$ : le carré porte sur ${{a}}$'
         ' **et** sur $x$.',
         '$$({{a}}x' + signe + '{{b}})^2 = ({{a}}x)^2 ' + signe + ' 2 ' + X + ' {{a}}x ' + X
         + ' {{b}} + {{b}}^2 = ' + col('{{solution}}') + '$$'])


# v5 : l'une des trois identités, t = 0 : (ax + b)², 1 : (ax − b)², 2 : (ax − b)(ax + b)
def selon_t(somme, diff, produit):
    return '{{if:t==0|' + somme + '|{{if:t==1|' + diff + '|' + produit + '}}}}'


MELANGE = variation(
    DEVELOPPE + selon_t('({{a}}x+{{b}})^2', '({{a}}x-{{b}})^2', '({{a}}x-{{b}})({{a}}x+{{b}})')
    + REPONSE,
    [var('t', '0..2'), var('a', '1..5'), var('b', '1..9')],
    [selon_t(ev('a^2') + 'x^2+' + ev('2*a*b') + 'x+' + ev('b^2'),
             ev('a^2') + 'x^2-' + ev('2*a*b') + 'x+' + ev('b^2'),
             ev('a^2') + 'x^2-' + ev('b^2'))],
    ['**Quelle identité ?** ' + selon_t(RAPPEL_SOMME, RAPPEL_DIFF, RAPPEL_PRODUIT)
     + ' Ici, $a={{a}}x$ et $b={{b}}$.',
     '$$' + selon_t('({{a}}x+{{b}})^2 = ({{a}}x)^2 + 2 ' + X + ' {{a}}x ' + X + ' {{b}} + {{b}}^2',
                    '({{a}}x-{{b}})^2 = ({{a}}x)^2 - 2 ' + X + ' {{a}}x ' + X + ' {{b}} + {{b}}^2',
                    '({{a}}x-{{b}})({{a}}x+{{b}}) = ({{a}}x)^2 - {{b}}^2')
     + ' = ' + col('{{solution}}') + '$$'],
    ['a>=2 || t==2'])

MODELES.append(modele(
    '01-developper-carre-somme-difference', 'Développer (a + b)² et (a − b)²',
    'Développer avec les identités remarquables : (x + 3)², (x − 5)², (2x + 5)², (3x − 4)², puis'
    ' l\'une des trois identités à reconnaître ((ax + b)², (ax − b)², (ax − b)(ax + b))',
    'Calcul littéral', 'Transformation', 'Identités remarquables', 10,
    [carre_simple('+'), carre_simple('-'), carre_ax('+'), carre_ax('-'), MELANGE],
    [spec('(x + 3)² = x² + 6x + 9', 0, {'n': 3}, 'x^2+6x+9', 'correct'),
     spec('Erreur : double produit oublié x² + 9', 0, {'n': 3}, 'x^2+9', 'incorrect'),
     spec('Erreur : double produit sans le 2 x² + 3x + 9', 0, {'n': 3}, 'x^2+3x+9', 'incorrect'),
     spec('(x − 5)² = x² − 10x + 25', 1, {'n': 5}, 'x^2-10x+25', 'correct'),
     spec('Erreur : signe du double produit x² + 10x + 25', 1, {'n': 5}, 'x^2+10x+25', 'incorrect'),
     spec('Erreur : x² − 25', 1, {'n': 5}, 'x^2-25', 'incorrect'),
     spec('(2x + 5)² = 4x² + 20x + 25', 2, {'a': 2, 'b': 5}, '4x^2+20x+25', 'correct'),
     spec('Ordre croissant 25 + 20x + 4x²', 2, {'a': 2, 'b': 5}, '25+20x+4x^2', 'correct'),
     spec('Erreur : (2x)² écrit 2x²', 2, {'a': 2, 'b': 5}, '2x^2+20x+25', 'incorrect'),
     spec('Erreur : double produit sans le 2', 2, {'a': 2, 'b': 5}, '4x^2+10x+25', 'incorrect'),
     spec('(3x − 4)² = 9x² − 24x + 16', 3, {'a': 3, 'b': 4}, '9x^2-24x+16', 'correct'),
     spec('Erreur : 9x² − 16', 3, {'a': 3, 'b': 4}, '9x^2-16', 'incorrect'),
     spec('Erreur : + b² devenu − 16', 3, {'a': 3, 'b': 4}, '9x^2-24x-16', 'incorrect'),
     spec('(2x − 5)(2x + 5) = 4x² − 25', 4, {'t': 2, 'a': 2, 'b': 5}, '4x^2-25', 'correct'),
     spec('Erreur : traité comme un carré', 4, {'t': 2, 'a': 2, 'b': 5}, '4x^2-20x+25',
          'incorrect'),
     spec('(3x + 1)² = 9x² + 6x + 1', 4, {'t': 0, 'a': 3, 'b': 1}, '9x^2+6x+1', 'correct'),
     spec('Non réduit 9x² + 3x + 3x + 1', 4, {'t': 0, 'a': 3, 'b': 1}, '9x^2+3x+3x+1',
          'bad_form', ['form'])],
    delay=60))

# --- 2. 3-054 : factoriser avec un facteur commun ---------------------------------------------

FACTORISE = 'Factorise :\n\n$$'
F1 = ev('x+(a)')          # le facteur commun (x + a)
FAX = ev('(a)*x+(b)')     # le facteur commun (ax + b), v3
RAPPEL_FACTEUR = ('**Facteur commun** : $k \\times A + k \\times B = k \\times (A + B)$ et'
                  ' $k \\times A - k \\times B = k \\times (A - B)$.')


def crochet(contenu):
    return '\\left[' + contenu + '\\right]'


# v1 : (x + a)(bx + c) + (x + a)(dx + f) = (x + a)((b + d)x + c + f)
SOMME = variation(
    FACTORISE + '(' + F1 + ')(' + ev('(b)*x+(c)') + ')+(' + F1 + ')(' + ev('(d)*x+(f)') + ')'
    + REPONSE,
    [LETTRE, var('a', '1..9;±'), var('b', '1..5'), var('c', '1..9;±'), var('d', '1..5'),
     var('f', '1..9;±')],
    ['(' + F1 + ')(' + ev('(b+d)*x+(c+f)') + ')'],
    [RAPPEL_FACTEUR + ' Ici, le facteur commun est $' + col('(' + F1 + ')') + '$.',
     '$$' + col('(' + F1 + ')') + '(' + ev('(b)*x+(c)') + ')+' + col('(' + F1 + ')') + '('
     + ev('(d)*x+(f)') + ') = ' + col('(' + F1 + ')') + crochet('(' + ev('(b)*x+(c)') + ')+('
     + ev('(d)*x+(f)') + ')') + '$$',
     'On réduit le second facteur : $(' + ev('(b)*x+(c)') + ')+(' + ev('(d)*x+(f)') + ') = '
     + ev('(b+d)*x+(c+f)') + '$.',
     '$$' + col('{{solution}}') + '$$'],
    ['c+f != 0', 'gcd(b+d, abs(c+f)) == 1'])

# v2 : (x + a)(bx + c) − (x + a)(dx + f) = (x + a)((b − d)x + c − f), b > d
DIFFERENCE = variation(
    FACTORISE + '(' + F1 + ')(' + ev('(b)*x+(c)') + ')-(' + F1 + ')(' + ev('(d)*x+(f)') + ')'
    + REPONSE,
    [LETTRE, var('a', '1..9;±'), var('b', '2..6'), var('c', '1..9;±'), var('d', '1..5'),
     var('f', '1..9;±')],
    ['(' + F1 + ')(' + ev('(b-d)*x+(c-f)') + ')'],
    [RAPPEL_FACTEUR + ' Ici, le facteur commun est $' + col('(' + F1 + ')') + '$.',
     '$$' + col('(' + F1 + ')') + '(' + ev('(b)*x+(c)') + ')-' + col('(' + F1 + ')') + '('
     + ev('(d)*x+(f)') + ') = ' + col('(' + F1 + ')') + crochet('(' + ev('(b)*x+(c)') + ')-('
     + ev('(d)*x+(f)') + ')') + '$$',
     'Le signe $-$ devant la parenthèse change **tous** ses signes : $(' + ev('(b)*x+(c)')
     + ')-(' + ev('(d)*x+(f)') + ') = ' + ev('(b)*x+(c)') + ev('-(d)*x-(f)') + ' = '
     + ev('(b-d)*x+(c-f)') + '$.',
     '$$' + col('{{solution}}') + '$$'],
    ['b > d', 'c-f != 0', 'gcd(b-d, abs(c-f)) == 1'])

# v3 : facteur en tête puis en queue : (ax + b)(cx + d) + (fx + g)(ax + b)
TETE_QUEUE = variation(
    FACTORISE + '(' + FAX + ')(' + ev('(c)*x+(d)') + ')+(' + ev('(f)*x+(g)') + ')(' + FAX + ')'
    + REPONSE,
    [LETTRE, var('a', '2..5'), var('b', '1..9;±'), var('c', '1..4'), var('d', '1..9;±'),
     var('f', '1..4'), var('g', '1..9;±')],
    ['(' + FAX + ')(' + ev('(c+f)*x+(d+g)') + ')'],
    [RAPPEL_FACTEUR + ' Le facteur commun $' + col('(' + FAX + ')') + '$ est placé en tête dans'
     ' le premier produit, en queue dans le second : l\'ordre des facteurs ne compte pas.',
     '$$' + col('(' + FAX + ')') + '(' + ev('(c)*x+(d)') + ')+(' + ev('(f)*x+(g)') + ')'
     + col('(' + FAX + ')') + ' = ' + col('(' + FAX + ')') + crochet('(' + ev('(c)*x+(d)')
     + ')+(' + ev('(f)*x+(g)') + ')') + ' = ' + col('{{solution}}') + '$$'],
    ['gcd(a, abs(b)) == 1', 'd+g != 0', 'gcd(c+f, abs(d+g)) == 1', 'c+f != a || d+g != b'])

# v4 : facteur au carré : (x + a)² + (x + a)(bx + c) = (x + a)((b + 1)x + a + c)
CARRE = variation(
    FACTORISE + '(' + F1 + ')^2+(' + F1 + ')(' + ev('(b)*x+(c)') + ')' + REPONSE,
    [LETTRE, var('a', '1..9;±'), var('b', '1..5'), var('c', '1..9;±')],
    ['(' + F1 + ')(' + ev('(b+1)*x+(a+c)') + ')'],
    [RAPPEL_FACTEUR + ' Un carré est un produit : $(' + F1 + ')^2 = ' + col('(' + F1 + ')')
     + '(' + F1 + ')$.',
     '$$' + col('(' + F1 + ')') + '(' + F1 + ')+' + col('(' + F1 + ')') + '('
     + ev('(b)*x+(c)') + ') = ' + col('(' + F1 + ')') + crochet('(' + F1 + ')+('
     + ev('(b)*x+(c)') + ')') + ' = ' + col('{{solution}}') + '$$'],
    ['a+c != 0', 'gcd(b+1, abs(a+c)) == 1'])

# v5 : facteur seul : (x + a)(bx + c) + (x + a) = (x + a)(bx + c + 1)
SEUL = variation(
    FACTORISE + '(' + F1 + ')(' + ev('(b)*x+(c)') + ')+(' + F1 + ')' + REPONSE,
    [LETTRE, var('a', '1..9;±'), var('b', '2..6'), var('c', '1..9;±')],
    ['(' + F1 + ')(' + ev('(b)*x+(c+1)') + ')'],
    [RAPPEL_FACTEUR + ' Le second terme est le facteur commun **tout seul** : $(' + F1
     + ') = ' + col('(' + F1 + ')') + ' ' + X + ' 1$.',
     '$$' + col('(' + F1 + ')') + '(' + ev('(b)*x+(c)') + ')+' + col('(' + F1 + ')') + ' ' + X
     + ' 1 = ' + col('(' + F1 + ')') + crochet('(' + ev('(b)*x+(c)') + ')+1') + ' = '
     + col('{{solution}}') + '$$'],
    ['c+1 != 0', 'gcd(b, abs(c+1)) == 1'])

MODELES.append(modele(
    '02-factoriser-facteur-commun', 'Factoriser avec un facteur commun',
    'Factoriser quand le facteur commun est une expression entre parenthèses :'
    ' (x + 2)(3x − 1) + (x + 2)(x + 4), avec un −, facteur en tête puis en queue, facteur au'
    ' carré, facteur seul (le 1 caché)',
    'Calcul littéral', 'Transformation', 'Factorisation', 11,
    [SOMME, DIFFERENCE, TETE_QUEUE, CARRE, SEUL],
    [spec('(x + 2)(4x + 3)', 0, {'a': 2, 'b': 3, 'c': -1, 'd': 1, 'f': 4}, '(x+2)(4x+3)',
          'correct'),
     spec('Ordre inverse (4x + 3)(x + 2)', 0, {'a': 2, 'b': 3, 'c': -1, 'd': 1, 'f': 4},
          '(4x+3)(x+2)', 'correct'),
     spec('Erreur : (x + 2)(4x + 5)', 0, {'a': 2, 'b': 3, 'c': -1, 'd': 1, 'f': 4},
          '(x+2)(4x+5)', 'incorrect'),
     spec('Facteur non réduit', 0, {'a': 2, 'b': 3, 'c': -1, 'd': 1, 'f': 4},
          '(x+2)(3x-1+x+4)', 'bad_form', ['form']),
     spec('Forme développée', 0, {'a': 2, 'b': 3, 'c': -1, 'd': 1, 'f': 4}, '4x^2+11x+6',
          'bad_form', ['form']),
     spec('(x + 2)(2x − 5)', 1, {'a': 2, 'b': 3, 'c': -1, 'd': 1, 'f': 4}, '(x+2)(2x-5)',
          'correct'),
     spec('Erreur : signe du − non distribué (x + 2)(2x + 3)', 1,
          {'a': 2, 'b': 3, 'c': -1, 'd': 1, 'f': 4}, '(x+2)(2x+3)', 'incorrect'),
     spec('(2x + 1)(3x + 1)', 2, {'a': 2, 'b': 1, 'c': 1, 'd': -3, 'f': 2, 'g': 4},
          '(2x+1)(3x+1)', 'correct'),
     spec('Erreur : (2x + 1)(3x − 7)', 2, {'a': 2, 'b': 1, 'c': 1, 'd': -3, 'f': 2, 'g': 4},
          '(2x+1)(3x-7)', 'incorrect'),
     spec('(x + 3)(3x + 2)', 3, {'a': 3, 'b': 2, 'c': -1}, '(x+3)(3x+2)', 'correct'),
     spec('Erreur : (x + 3) du carré oublié (x + 3)(2x − 1)', 3, {'a': 3, 'b': 2, 'c': -1},
          '(x+3)(2x-1)', 'incorrect'),
     spec('(x − 4)(3x + 2)', 4, {'a': -4, 'b': 3, 'c': 1}, '(x-4)(3x+2)', 'correct'),
     spec('Erreur : le 1 oublié (x − 4)(3x + 1)', 4, {'a': -4, 'b': 3, 'c': 1}, '(x-4)(3x+1)',
          'incorrect')],
    delay=90))

# --- 3. 3-014 : résoudre une inéquation ax ⩾ b -------------------------------------------------


def sens(v):
    """Le signe d'inégalité n° v : 0 <, 1 ⩽, 2 >, 3 ⩾."""
    return ('{{if:' + v + '==0|<|{{if:' + v + '==1|\\leqslant |{{if:' + v + '==2|>|\\geqslant }}}}'
            '}}')


def sens_inverse(v):
    return ('{{if:' + v + '==0|>|{{if:' + v + '==1|\\geqslant |{{if:' + v + '==2|<|\\leqslant }}}}'
            '}}')


INEQ = 'Résous l\'inéquation $'
INEQ_FIN = '$.\n\nLes solutions sont les nombres $x$ tels que $?$.'
STRICTE = ('{{if:s==0|L\'inégalité est **stricte** : la borne n\'est pas solution.|{{if:s==2|'
           'L\'inégalité est **stricte** : la borne n\'est pas solution.|L\'inégalité est'
           ' **large** : la borne est solution.}}}}')
POSITIF = ('On divise les deux membres par ${{a}}$, un nombre **positif** : le sens de'
           ' l\'inégalité **ne change pas**.')
NEGATIF = ('On divise les deux membres par ${{a}}$, un nombre **négatif** : le sens de'
           ' l\'inégalité **change**.')

# v1 : a > 0, b = a × k
A_POSITIF = variation(
    INEQ + '{{a}}x' + sens('s') + ev('a*k') + INEQ_FIN,
    [var('a', '2..9'), var('k', '1..10;±'), var('s', '0..3')],
    ['x' + sens('s') + '{{k}}'],
    [POSITIF,
     '$${{a}}x' + sens('s') + ev('a*k') + ' \\iff x' + sens('s') + frac(ev('a*k'), '{{a}}')
     + ' \\iff ' + col('x' + sens('s') + '{{k}}') + '$$',
     STRICTE])

# v2 : a < 0, b = a × k
A_NEGATIF = variation(
    INEQ + '{{a}}x' + sens('s') + ev('a*k') + INEQ_FIN,
    [var('a', '-9..-2'), var('k', '1..10;±'), var('s', '0..3')],
    ['x' + sens_inverse('s') + '{{k}}'],
    [NEGATIF,
     '$${{a}}x' + sens('s') + ev('a*k') + ' \\iff x' + sens_inverse('s')
     + frac(ev('a*k'), '{{a}}') + ' \\iff ' + col('x' + sens_inverse('s') + '{{k}}') + '$$',
     STRICTE])

# v3 : borne en fraction non décimale (|a| = 3, 6, 7 ou 9) ; r = s si a > 0, le sens inverse sinon
FRACTION = variation(
    INEQ + '{{a}}x' + sens('s') + '{{b}}' + INEQ_FIN,
    [var('a', '-9|-7|-6|-3|3|6|7|9'), var('b', '1..20;±'), var('s', '0..3'),
     var('r', ev('mod(s+(abs(a)-a)/abs(a),4)'))],
    ['x' + sens('r') + ev('(b)/(a)')],
    ['{{if:a>0|' + POSITIF + '|' + NEGATIF + '}}',
     '$${{a}}x' + sens('s') + '{{b}} \\iff x' + sens('r') + frac('{{b}}', '{{a}}') + ' \\iff '
     + col('x' + sens('r') + ev('(b)/(a)')) + '$$',
     'La fraction ne tombe pas juste : on la garde sous forme de fraction irréductible, sans'
     ' valeur approchée. ' + STRICTE],
    ['gcd(abs(a), abs(b)) == 1'])

MODELES.append(modele(
    '03-resoudre-inequation-ax-b', 'Résoudre une inéquation ax ⩾ b',
    'Résoudre une inéquation du type ax ⩾ b, les quatre sens (<, ⩽, >, ⩾), a positif ou négatif'
    ' (3x ⩾ 12, −2x < 6, −7x < 3) ; réponse écrite en inégalité « x > 4 »',
    'Calcul littéral', 'Inéquations', 'ax ⩾ b', 1,
    [A_POSITIF, A_NEGATIF, FRACTION],
    [spec('3x > 12 : x > 4', 0, {'a': 3, 'k': 4, 's': 2}, 'x>4', 'correct'),
     spec('Erreur : soustraction x > 9', 0, {'a': 3, 'k': 4, 's': 2}, 'x>9', 'incorrect'),
     spec('Erreur : inégalité large x ⩾ 4', 0, {'a': 3, 'k': 4, 's': 2}, 'x\\geqslant 4',
          'incorrect'),
     spec('−2x < 6 : x > −3', 1, {'a': -2, 'k': -3, 's': 0}, 'x>-3', 'correct'),
     spec('Erreur : sens non changé x < −3', 1, {'a': -2, 'k': -3, 's': 0}, 'x<-3', 'incorrect'),
     spec('Erreur : signe perdu x > 3', 1, {'a': -2, 'k': -3, 's': 0}, 'x>3', 'incorrect'),
     spec('3x ⩾ 2 : x ⩾ 2/3', 2, {'a': 3, 'b': 2, 's': 3, 'r': 3}, 'x\\geqslant \\frac{2}{3}',
          'correct'),
     spec('Erreur : valeur approchée x ⩾ 0,67', 2, {'a': 3, 'b': 2, 's': 3, 'r': 3},
          'x\\geqslant 0{,}67', 'incorrect'),
     spec('−7x < 3 : x > −3/7', 2, {'a': -7, 'b': 3, 's': 0, 'r': 2}, 'x>-\\frac{3}{7}',
          'correct'),
     spec('Erreur : sens non changé x < −3/7', 2, {'a': -7, 'b': 3, 's': 0, 'r': 2},
          'x<-\\frac{3}{7}', 'incorrect')],
    delay=60))

# --- 4. 3-015 : résoudre une équation produit nul ---------------------------------------------

EQ = 'Résous l\'équation $'
EQ_FIN = '=0$.\n\nL\'ensemble des solutions est $S=?$.'
RAPPEL_NUL = '**Un produit est nul si et seulement si l\'un au moins de ses facteurs est nul.**'


def solutions(s1, s2):
    return '\\{ ' + s1 + ' ; ' + s2 + ' \\}'


# v1 : (x − p)(x − q) = 0
UNITAIRES = variation(
    EQ + '(' + ev('x-(p)') + ')(' + ev('x-(q)') + ')' + EQ_FIN,
    [LETTRE, var('p', '1..9;±'), var('q', '1..9;±')],
    [solutions('{{p}}', '{{q}}')],
    [RAPPEL_NUL,
     '$$(' + ev('x-(p)') + ')(' + ev('x-(q)') + ')=0 \\iff ' + ev('x-(p)') + '=0 \\text{ ou } '
     + ev('x-(q)') + '=0 \\iff x={{p}} \\text{ ou } x={{q}}$$',
     'L\'équation a deux solutions : $S=' + col(solutions('{{p}}', '{{q}}')) + '$.'],
    ['p != q'])

# v2 : (ax + b)(cx + d) = 0, solutions entières ou fractions
AFFINES = variation(
    EQ + '(' + ev('(a)*x+(b)') + ')(' + ev('(c)*x+(d)') + ')' + EQ_FIN,
    [LETTRE, var('a', '2..5'), var('b', '1..9;±'), var('c', '2..5'), var('d', '1..9;±')],
    [solutions(ev('-(b)/(a)'), ev('-(d)/(c)'))],
    [RAPPEL_NUL,
     '$$\\begin{align} (' + ev('(a)*x+(b)') + ')(' + ev('(c)*x+(d)') + ')=0 & \\iff '
     + ev('(a)*x+(b)') + '=0 \\text{ ou } ' + ev('(c)*x+(d)') + '=0 \\\\ & \\iff x='
     + frac(ev('-(b)'), '{{a}}') + ' \\text{ ou } x=' + frac(ev('-(d)'), '{{c}}')
     + ' \\end{align}$$',
     'L\'équation a deux solutions : $S=' + col(solutions(ev('-(b)/(a)'), ev('-(d)/(c)')))
     + '$.'],
    ['gcd(a, abs(b)) == 1', 'gcd(c, abs(d)) == 1', '(b)*(c) != (a)*(d)'])

# v3 : coefficients décimaux, (n/2 x − nm/10)(cx − cj/10) = 0 → {m/5 ; j/10}, comme
# (2,5x − 7)(8x − 9,6) = 0 → {2,8 ; 1,2}. `;d` : écriture décimale (sans lui, 7x/2 − 63/10)
def dec(x):
    return ev(x + ';d')


FACT1 = dec('n/2') + 'x-' + dec('n*m/10')
FACT2 = '{{c}}x' + ev('-(c*j/10);d;+')
DECIMAUX = variation(
    EQ + '(' + FACT1 + ')(' + FACT2 + ')' + EQ_FIN,
    [var('n', '1|3|5|7|9'), var('m', '6..24'), var('c', '2..9'), var('j', '11..49;±')],
    [solutions(dec('m/5'), dec('j/10'))],
    [RAPPEL_NUL,
     '$$\\begin{align} (' + FACT1 + ')(' + FACT2 + ')=0 & \\iff ' + dec('n/2') + 'x='
     + dec('n*m/10') + ' \\text{ ou } {{c}}x=' + dec('c*j/10') + ' \\\\ & \\iff x='
     + frac(dec('n*m/10'), dec('n/2')) + ' \\text{ ou } x=' + frac(dec('c*j/10'), '{{c}}')
     + ' \\\\ & \\iff x=' + dec('m/5') + ' \\text{ ou } x=' + dec('j/10') + ' \\end{align}$$',
     'L\'équation a deux solutions : $S=' + col(solutions(dec('m/5'), dec('j/10'))) + '$.'],
    ['mod(m,5) != 0', 'mod(j,10) != 0', '2*j != 4*m'])

# v4 : x(ax + b) = 0, le facteur x donne la solution 0
FACTEUR_X = variation(
    EQ + 'x(' + ev('(a)*x+(b)') + ')' + EQ_FIN,
    [LETTRE, var('a', '2..9'), var('b', '1..20;±')],
    [solutions('0', ev('-(b)/(a)'))],
    [RAPPEL_NUL + ' Le premier facteur est $x$ lui-même.',
     '$$x(' + ev('(a)*x+(b)') + ')=0 \\iff x=0 \\text{ ou } ' + ev('(a)*x+(b)')
     + '=0 \\iff x=0 \\text{ ou } x=' + ev('-(b)/(a)') + '$$',
     'L\'équation a deux solutions : $S=' + col(solutions('0', ev('-(b)/(a)'))) + '$.'],
    ['gcd(a, abs(b)) == 1'])

# v5 : factoriser d'abord (3-054), puis produit nul :
# (x + a)(bx + c) + (x + a)(dx + f) = (x + a)((b + d)x + c + f) = 0
FACTORISER_DABORD = variation(
    EQ + '(' + F1 + ')(' + ev('(b)*x+(c)') + ')+(' + F1 + ')(' + ev('(d)*x+(f)') + ')' + EQ_FIN,
    [LETTRE, var('a', '1..9;±'), var('b', '1..5'), var('c', '1..9;±'), var('d', '1..5'),
     var('f', '1..9;±')],
    [solutions(ev('-(a)'), ev('-(c+f)/(b+d)'))],
    ['Ce n\'est pas encore un produit : on **factorise** d\'abord par le facteur commun $'
     + col('(' + F1 + ')') + '$.',
     '$$(' + F1 + ')(' + ev('(b)*x+(c)') + ')+(' + F1 + ')(' + ev('(d)*x+(f)') + ') = '
     + col('(' + F1 + ')') + crochet('(' + ev('(b)*x+(c)') + ')+(' + ev('(d)*x+(f)') + ')')
     + ' = (' + F1 + ')(' + ev('(b+d)*x+(c+f)') + ')$$',
     RAPPEL_NUL,
     '$$(' + F1 + ')(' + ev('(b+d)*x+(c+f)') + ')=0 \\iff ' + F1 + '=0 \\text{ ou } '
     + ev('(b+d)*x+(c+f)') + '=0 \\iff x=' + ev('-(a)') + ' \\text{ ou } x='
     + ev('-(c+f)/(b+d)') + '$$',
     'L\'équation a deux solutions : $S=' + col(solutions(ev('-(a)'), ev('-(c+f)/(b+d)')))
     + '$.'],
    ['c+f != 0', 'gcd(b+d, abs(c+f)) == 1', '(a)*(b+d) != (c+f)'])

MODELES.append(modele(
    '04-resoudre-equation-produit-nul', 'Résoudre une équation produit nul',
    'Résoudre une équation produit nul : (x − 3)(x + 5) = 0, (2x − 3)(5x + 7) = 0, coefficients'
    ' décimaux (2,5x − 7)(8x − 9,6) = 0, x(3x − 5) = 0, puis factoriser d\'abord'
    ' (x + 2)(3x − 1) + (x + 2)(x + 4) = 0 ; ensemble des solutions écrit',
    'Calcul littéral', 'Equations', 'Produit nul', 1,
    [UNITAIRES, AFFINES, DECIMAUX, FACTEUR_X, FACTORISER_DABORD],
    [spec('(x − 3)(x + 5) = 0 : S = {3 ; −5}', 0, {'p': 3, 'q': -5}, '\\{3;-5\\}', 'correct'),
     spec('Ordre inverse {−5 ; 3}', 0, {'p': 3, 'q': -5}, '\\{-5;3\\}', 'correct'),
     spec('Erreur : signes inversés {−3 ; 5}', 0, {'p': 3, 'q': -5}, '\\{-3;5\\}', 'incorrect'),
     spec('Erreur : une seule solution {3}', 0, {'p': 3, 'q': -5}, '\\{3\\}', 'incorrect'),
     spec('(2x − 3)(5x + 7) = 0 : S = {3/2 ; −7/5}', 1, {'a': 2, 'b': -3, 'c': 5, 'd': 7},
          '\\{\\frac{3}{2};-\\frac{7}{5}\\}', 'correct'),
     spec('Écriture décimale {1,5 ; −1,4}', 1, {'a': 2, 'b': -3, 'c': 5, 'd': 7},
          '\\{1{,}5;-1{,}4\\}', 'correct'),
     spec('Erreur : b/a au lieu de −b/a', 1, {'a': 2, 'b': -3, 'c': 5, 'd': 7},
          '\\{-\\frac{3}{2};\\frac{7}{5}\\}', 'incorrect'),
     spec('(2,5x − 7)(8x − 9,6) = 0 : S = {2,8 ; 1,2}', 2, {'n': 5, 'm': 14, 'c': 8, 'j': 12},
          '\\{2{,}8;1{,}2\\}', 'correct'),
     spec('En fractions {14/5 ; 6/5}', 2, {'n': 5, 'm': 14, 'c': 8, 'j': 12},
          '\\{\\frac{14}{5};\\frac{6}{5}\\}', 'correct'),
     spec('Erreur : signes inversés', 2, {'n': 5, 'm': 14, 'c': 8, 'j': 12},
          '\\{-2{,}8;-1{,}2\\}', 'incorrect'),
     spec('x(3x − 5) = 0 : S = {0 ; 5/3}', 3, {'a': 3, 'b': -5}, '\\{0;\\frac{5}{3}\\}',
          'correct'),
     spec('Erreur : 0 oublié {5/3}', 3, {'a': 3, 'b': -5}, '\\{\\frac{5}{3}\\}', 'incorrect'),
     spec('(x + 2)(4x + 3) = 0 : S = {−2 ; −3/4}', 4, {'a': 2, 'b': 3, 'c': -1, 'd': 1, 'f': 4},
          '\\{-2;-\\frac{3}{4}\\}', 'correct'),
     spec('Erreur : signes inversés {2 ; 3/4}', 4, {'a': 2, 'b': 3, 'c': -1, 'd': 1, 'f': 4},
          '\\{2;\\frac{3}{4}\\}', 'incorrect')],
    delay=90, shared={'blankDefaults': {'answerKind': 'intervalles'}}))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
