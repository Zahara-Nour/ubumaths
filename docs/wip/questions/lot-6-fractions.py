"""Écrit les 10 modèles du lot 4 « Fractions » de la 6e dans scripts/questions/6-fractions/.

Phase 0 validée par David le 2026-10-28 (§ 11 du journal `docs/wip/questions-6-progress.md`).
Bornes : `cycle3.json`, 6e (fractions : « cas simples », pas de borne chiffrée de dénominateur ;
6-133 : même dénominateur, même numérateur, comparaison à 1 et à 1/2, dénominateur commun ;
6-134 : liste du type 1 ; 5/3 ; 7/6 ; 99/100 ; 6-203 : encadrement par deux entiers consécutifs via
le nombre mixte). Exemples de réussite 6e 2025, p. 7-8. Un point par modèle ; le nœud et le tag
sont posés par la migration de rangement, après le `--publier` de David.

Décisions et pièges :
- dénominateurs ≤ 12 (tables de multiplication) ; résultats donnés sous forme irréductible, une
  fraction non simplifiée reste juste en ambre (`reducedFractions`, défaut `warn`) ;
- « Ranger » : trois nombres, trois cases `$? < ? < ?$` (décision du § 5, question 7) ;
- choix en case choix (bloc ```choix, ADR 0033) ; l'indice du bon choix passe par `sign()` dans un
  `eval`, jamais par des `{{if:…}}` imbriqués (non résolus dans l'indice) ;
- variables `e` et `i` interdites dans les `eval` ;
- montants en `\\unit{€}` (`en_unit`), sauf juste après une case (`?~\\text{€}` : case de nombre).

    python3 docs/wip/questions/lot-6-fractions.py scripts/questions/6-fractions
"""
import json
import os
import re
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


def fr(n, d):
    """Fraction de deux expressions de gabarit (`{{a}}`, `{{eval:…}}`)."""
    return '\\frac{' + n + '}{' + d + '}'


def ev(x):
    return '{{eval:' + x + '}}'


def reduite(n, d):
    """Fraction n/d (expressions entières) sous forme irréductible ; n/d jamais entier."""
    g = 'gcd(' + n + ',' + d + ')'
    return fr(ev('(' + n + ')/' + g), ev('(' + d + ')/' + g))


def reduite_ou_entier(n, d):
    """Fraction irréductible, ou l'entier si d divise n."""
    g = 'gcd(' + n + ',' + d + ')'
    return ('{{if:mod(' + n + ',' + d + ')==0|' + ev('(' + n + ')/(' + d + ')') + '|'
            + fr(ev('(' + n + ')/' + g), ev('(' + d + ')/' + g)) + '}}')


# Permutations de trois nombres (ordre d'affichage) ; la 0 (déjà rangés) n'est jamais tirée
PERMUTATIONS = [(0, 1, 2), (0, 2, 1), (1, 0, 2), (1, 2, 0), (2, 0, 1), (2, 1, 0)]


def melange(nombres):
    """Les trois nombres (rangés) dans l'ordre d'affichage tiré par `p` (1 à 5)."""
    return selon('p', [' \\quad ; \\quad '.join(nombres[k] for k in perm)
                       for perm in PERMUTATIONS])


PARTS_A = ['à la moitié', 'au tiers', 'au quart', 'au cinquième', 'au sixième', 'au septième',
           'au huitième', 'au neuvième', 'au dixième', 'au onzième', 'au douzième']
PARTS = ['la moitié', 'le tiers', 'le quart', 'le cinquième', 'le sixième', 'le septième',
         'le huitième', 'le neuvième', 'le dixième', 'le onzième', 'le douzième']

EURO = '~\\text{€}'
MODELES = []

# --- 1. 6-130 : entier, décimal ou non décimal ---------------------------------------------

NATURE = ('Le nombre $' + fr('{{a}}', '{{b}}') + '$ est :'
          + choix(['un nombre entier', 'un nombre décimal non entier', 'un nombre non décimal'],
                  melanger=False))
QUOTIENT = ('**Fraction et division.** $' + fr('{{a}}', '{{b}}') + '$ est le quotient de ${{a}}$'
            ' par ${{b}}$ : c\'est le résultat de la division ${{a}} \\div {{b}}$.')

NATURE_ENTIER = variation(
    NATURE, [var('b', '2..9'), var('q', '2..9'), var('a', 'eval:b*q')], ['0'],
    [QUOTIENT,
     '${{a}} \\div {{b}} = {{q}}$ : la division tombe juste, $' + fr('{{a}}', '{{b}}') + ' = {{q}}$'
     ' est ' + '**un nombre entier**' + '.'])

NATURE_DECIMAL = variation(
    NATURE, [var('b', '2|4|5|8|10|20|25'), var('a', '1..99')], ['1'],
    [QUOTIENT,
     '${{a}} \\div {{b}} = {{eval:a/b;d}}$ : la division s\'arrête, avec des chiffres après la'
     ' virgule. $' + fr('{{a}}', '{{b}}') + '$ est ' + '**un nombre décimal non entier**' + '.'],
    ['mod(a,b)!=0', 'a<10*b'])

NATURE_NON_DECIMAL = variation(
    NATURE, [var('b', '3|6|7|9|11|12'), var('a', '1..60')], ['2'],
    [QUOTIENT,
     '${{a}} \\div {{b}} = {{eval:floor(10000*a/b)/10000;d}}\\ldots$ : la division ne s\'arrête'
     ' jamais, les mêmes restes reviennent sans fin.',
     '$' + fr('{{a}}', '{{b}}') + '$ ne peut pas s\'écrire avec un nombre fini de chiffres après la'
     ' virgule : c\'est ' + '**un nombre non décimal**' + '.'],
    ['gcd(a,b)==1', 'a<5*b'])

MODELES.append(modele(
    '01-entier-decimal-ou-non-decimal', 'Entier, décimal ou non décimal ?',
    'Dire si une fraction représente un nombre entier (35/7), un décimal non entier (3/4, 7/5)'
    ' ou un nombre non décimal (2/3, 7/6), par la division du numérateur par le dénominateur',
    'Fractions', 'Apprivoiser', 'Forme décimale', 13,
    [NATURE_ENTIER, NATURE_DECIMAL, NATURE_NON_DECIMAL],
    [spec('35/7 : entier', 0, {'b': 7, 'q': 5, 'a': 35}, '0', 'correct'),
     spec('Erreur : 35/7 non décimal', 0, {'b': 7, 'q': 5, 'a': 35}, '2', 'incorrect'),
     spec('3/4 : décimal non entier', 1, {'b': 4, 'a': 3}, '1', 'correct'),
     spec('Erreur : 3/4 non décimal', 1, {'b': 4, 'a': 3}, '2', 'incorrect'),
     spec('7/6 : non décimal', 2, {'b': 6, 'a': 7}, '2', 'correct'),
     spec('Erreur : 7/6 décimal', 2, {'b': 6, 'a': 7}, '1', 'incorrect')]))

# --- 2. 6-131 : appliquer une fraction à un entier -----------------------------------------

DE_FOIS = ('**Fraction d\'un nombre.** Pour calculer une fraction d\'un nombre entier, on'
           ' multiplie la fraction par le nombre : « de » se traduit par « $\\times$ ».')

TRADUIRE = variation(
    'Calculer $' + fr('{{p}}', '{{q}}') + '$ de ${{n}}$, c\'est calculer :'
    + choix(['$' + fr('{{p}}', '{{q}}') + ' \\times {{n}}$',
             '$' + fr('{{p}}', '{{q}}') + ' + {{n}}$',
             '${{n}} - ' + fr('{{p}}', '{{q}}') + '$',
             '${{n}} \\div ' + fr('{{p}}', '{{q}}') + '$']),
    [var('q', '2..9'), var('p', '1..9'), var('k', '2..12'), var('n', 'eval:q*k')],
    ['0'],
    [DE_FOIS,
     '$' + fr('{{p}}', '{{q}}') + '$ de ${{n}}$ $= ' + col(fr('{{p}}', '{{q}}') + ' \\times {{n}}')
     + '$'],
    ['gcd(p,q)==1', 'p!=q', 'n<=100', 'p>=2'])

APPLIQUER_ENTIER = variation(
    'Calcule.\n\n$$' + fr('{{p}}', '{{q}}') + ' \\text{ de } {{n}} = ?$$',
    [var('q', '2..9'), var('p', '1..9'), var('k', '2..12'), var('n', 'eval:q*k')],
    ['{{eval:p*k}}'],
    [DE_FOIS,
     '$' + fr('{{p}}', '{{q}}') + '$ de ${{n}}$, c\'est ${{p}}$ fois $' + fr('1', '{{q}}') + '$ de'
     ' ${{n}}$ ; on simplifie d\'abord : ${{n}} \\div {{q}} = {{k}}$.',
     '$$' + fr('{{p}}', '{{q}}') + ' \\times {{n}} = {{p}} \\times ' + fr('{{n}}', '{{q}}')
     + ' = {{p}} \\times {{k}} = ' + col('{{solution}}') + '$$'],
    ['gcd(p,q)==1', 'p!=q', 'n<=100', 'p>=2'])

APPLIQUER_FRACTION = variation(
    'Calcule. Donne le résultat sous forme d\'une fraction.\n\n$$' + fr('{{p}}', '{{q}}')
    + ' \\text{ de } {{n}} = ?$$',
    [var('q', '2..9'), var('p', '1..9'), var('n', '2..9')],
    [fr('{{eval:p*n}}', '{{q}}')],
    [DE_FOIS,
     '$' + fr('{{p}}', '{{q}}') + '$ de ${{n}}$, c\'est ${{p}}$ fois $' + fr('1', '{{q}}') + '$ de'
     ' ${{n}}$, c\'est-à-dire ${{p}}$ fois $' + fr('{{n}}', '{{q}}') + '$.',
     '$$' + fr('{{p}}', '{{q}}') + ' \\times {{n}} = {{p}} \\times ' + fr('{{n}}', '{{q}}')
     + ' = ' + fr('{{p}} \\times {{n}}', '{{q}}') + ' = ' + col('{{solution}}') + '$$'],
    ['gcd(p,q)==1', 'gcd(n,q)==1', 'p!=q', 'p>=2'])

MODELES.append(modele(
    '02-appliquer-une-fraction-a-un-entier', 'Appliquer une fraction à un entier',
    'Traduire « de » par une multiplication ; calculer une fraction d\'un entier, en simplifiant'
    ' d\'abord (2/5 de 60 = 2 × 12) ou avec un résultat fractionnaire (5/4 de 3 = 15/4)',
    'Fractions', 'Calculer', 'Fraction d\'une quantité', 4,
    [TRADUIRE, APPLIQUER_ENTIER, APPLIQUER_FRACTION],
    [spec('2/5 de 60 : 2/5 × 60', 0, {'q': 5, 'p': 2, 'k': 12, 'n': 60}, '0', 'correct'),
     spec('Erreur : 60 ÷ 2/5', 0, {'q': 5, 'p': 2, 'k': 12, 'n': 60}, '3', 'incorrect'),
     spec('2/5 de 60 = 24', 1, {'q': 5, 'p': 2, 'k': 12, 'n': 60}, '24', 'correct'),
     spec('Erreur : rôles inversés (60 ÷ 2 × 5 = 150)', 1, {'q': 5, 'p': 2, 'k': 12, 'n': 60},
          '150', 'incorrect'),
     spec('Erreur : un cinquième seulement (12)', 1, {'q': 5, 'p': 2, 'k': 12, 'n': 60}, '12',
          'incorrect'),
     spec('5/4 de 3 = 15/4', 2, {'q': 4, 'p': 5, 'n': 3}, '\\frac{15}{4}', 'correct'),
     spec('3,75 : la consigne demande une fraction', 2, {'q': 4, 'p': 5, 'n': 3}, '3,75',
          'bad_form', ['form']),
     spec('Erreur : 5/12', 2, {'q': 4, 'p': 5, 'n': 3}, '\\frac{5}{12}', 'incorrect'),
     spec('Erreur : 15/12 (dénominateur multiplié aussi)', 2, {'q': 4, 'p': 5, 'n': 3},
          '\\frac{15}{12}', 'incorrect')]))

# --- 3. 6-136 : multiplier une fraction par un entier --------------------------------------

PRODUIT = ('**Fraction $\\times$ entier.** On multiplie le numérateur par l\'entier ; le'
           ' dénominateur ne change pas : $' + fr('a', 'b') + ' \\times n = '
           + fr('a \\times n', 'b') + '$.')

PRODUIT_DROITE = variation(
    'Calcule.\n\n$$' + fr('{{a}}', '{{b}}') + ' \\times {{n}} = ?$$',
    [var('b', '2..9'), var('a', '1..9'), var('n', '2..9')],
    [fr('{{eval:a*n}}', '{{b}}')],
    [PRODUIT,
     '$$' + fr('{{a}}', '{{b}}') + ' \\times {{n}} = ' + fr('{{a}} \\times {{n}}', '{{b}}') + ' = '
     + col('{{solution}}') + '$$'],
    ['gcd(a,b)==1', 'gcd(n,b)==1', 'a!=b'])

PRODUIT_GAUCHE = variation(
    'Calcule.\n\n$${{n}} \\times ' + fr('{{a}}', '{{b}}') + ' = ?$$',
    [var('b', '2..9'), var('a', '1..9'), var('n', '2..9')],
    [fr('{{eval:a*n}}', '{{b}}')],
    [PRODUIT,
     'L\'ordre ne compte pas dans un produit : ${{n}} \\times ' + fr('{{a}}', '{{b}}') + ' = '
     + fr('{{a}}', '{{b}}') + ' \\times {{n}}$.',
     '$${{n}} \\times ' + fr('{{a}}', '{{b}}') + ' = ' + fr('{{n}} \\times {{a}}', '{{b}}') + ' = '
     + col('{{solution}}') + '$$'],
    ['gcd(a,b)==1', 'gcd(n,b)==1', 'a!=b'])

COMMUTER = variation(
    'Complète.\n\n$$' + fr('{{a}}', '{{b}}') + ' \\times {{n}} = {{n}} \\times ?$$',
    [var('b', '2..9'), var('a', '1..9'), var('n', '2..9')],
    [fr('{{a}}', '{{b}}')],
    ['**L\'ordre ne compte pas** dans un produit : on peut échanger les deux facteurs.',
     '$$' + fr('{{a}}', '{{b}}') + ' \\times {{n}} = {{n}} \\times ' + col('{{solution}}') + '$$'],
    ['gcd(a,b)==1', 'a!=b'])

PRODUIT_ENTIER = variation(
    'Calcule.\n\n$$' + fr('{{a}}', '{{b}}') + ' \\times {{n}} = ?$$',
    [var('b', '2..9'), var('a', '1..9'), var('k', '2..5'), var('n', 'eval:b*k')],
    ['{{eval:a*k}}'],
    [PRODUIT,
     '$$' + fr('{{a}}', '{{b}}') + ' \\times {{n}} = ' + fr('{{a}} \\times {{n}}', '{{b}}') + ' = '
     + fr('{{eval:a*n}}', '{{b}}') + ' = ' + col('{{solution}}') + '$$',
     'On pouvait aussi simplifier d\'abord : ${{n}} \\div {{b}} = {{k}}$, puis ${{a}} \\times {{k}}'
     ' = {{solution}}$.'],
    ['gcd(a,b)==1', 'a!=b'])

MODELES.append(modele(
    '03-multiplier-une-fraction-par-un-entier', 'Multiplier une fraction par un entier',
    'Produit d\'une fraction par un entier dans les deux sens (3/7 × 4, 5 × 2/9), commutativité'
    ' (3/4 × 7 = 7 × ?), produit entier (5/6 × 12)',
    'Fractions', 'Calculer', 'Multiplication', 7,
    [PRODUIT_DROITE, PRODUIT_GAUCHE, COMMUTER, PRODUIT_ENTIER],
    [spec('3/7 × 4 = 12/7', 0, {'b': 7, 'a': 3, 'n': 4}, '\\frac{12}{7}', 'correct'),
     spec('Erreur : 12/28', 0, {'b': 7, 'a': 3, 'n': 4}, '\\frac{12}{28}', 'incorrect'),
     spec('Erreur : 3/28', 0, {'b': 7, 'a': 3, 'n': 4}, '\\frac{3}{28}', 'incorrect'),
     spec('5 × 2/9 = 10/9', 1, {'b': 9, 'a': 2, 'n': 5}, '\\frac{10}{9}', 'correct'),
     spec('Erreur : 10/45', 1, {'b': 9, 'a': 2, 'n': 5}, '\\frac{10}{45}', 'incorrect'),
     spec('3/4 × 7 = 7 × 3/4', 2, {'b': 4, 'a': 3, 'n': 7}, '\\frac{3}{4}', 'correct'),
     spec('Erreur : 7 × 3/4 complété par 3', 2, {'b': 4, 'a': 3, 'n': 7}, '3', 'incorrect'),
     spec('5/6 × 12 = 10', 3, {'b': 6, 'a': 5, 'k': 2, 'n': 12}, '10', 'correct'),
     spec('60/6 non simplifié : ambre', 3, {'b': 6, 'a': 5, 'k': 2, 'n': 12}, '\\frac{60}{6}',
          'unoptimal_form', ['reducedFractions']),
     spec('Erreur : 60/72', 3, {'b': 6, 'a': 5, 'k': 2, 'n': 12}, '\\frac{60}{72}',
          'incorrect')]))

# --- 4. 6-133 : comparer deux fractions ----------------------------------------------------
# a/b et c/d tirés ; `s` échange l'ordre d'affichage ; `r` = indice du signe (0 <, 1 =, 2 >)

SIGNES = ['<', '=', '>']
COMPARE = ('Complète avec le signe qui convient.\n\n$$' + fr('{{gn}}', '{{gd}}') + ' \\ldots '
           + fr('{{dn}}', '{{dd}}') + '$$' + choix(['$<$', '$=$', '$>$'], melanger=False))
CONCLURE = ('$$' + fr('{{gn}}', '{{gd}}') + ' ' + col(selon('r', SIGNES)) + ' '
            + fr('{{dn}}', '{{dd}}') + '$$')
AFFICHAGE = [var('s', '0..1'), var('gn', 'eval:(1-s)*a+s*c'), var('gd', 'eval:(1-s)*b+s*d'),
             var('dn', 'eval:(1-s)*c+s*a'), var('dd', 'eval:(1-s)*d+s*b'),
             var('r', 'eval:sign(gn*dd-dn*gd)+1')]


def compare(variables, steps, conditions):
    return variation(COMPARE, variables + AFFICHAGE, ['{{r}}'], steps + [CONCLURE], conditions)


COMPARER_DENOMINATEUR = compare(
    [var('b', '3..12'), var('a', '1..20'), var('c', '1..20'), var('d', 'eval:b')],
    ['**Même dénominateur.** Les deux fractions comptent des parts de même taille, $'
     + fr('1', '{{b}}') + '$ : la plus grande est celle qui a le plus grand numérateur.'],
    ['a!=c', 'mod(a,b)!=0', 'mod(c,b)!=0', 'a<2*b', 'c<2*b'])

COMPARER_NUMERATEUR = compare(
    [var('a', '1..9'), var('b', '2..11'), var('d', '{{eval:b+1}}..12'), var('c', 'eval:a')],
    ['**Même numérateur.** Partager l\'unité en ${{d}}$ donne des parts plus petites qu\'en ${{b}}$ :'
     ' $' + fr('1', '{{d}}') + ' < ' + fr('1', '{{b}}') + '$. Avec ${{a}}$ parts de chaque côté, $'
     + fr('{{a}}', '{{d}}') + ' < ' + fr('{{a}}', '{{b}}') + '$.'],
    ['mod(a,b)!=0', 'mod(a,d)!=0'])

COMPARER_A_UN = compare(
    [var('b', '3..12'), var('a', '1..{{eval:b-1}}'), var('d', '2..12'),
     var('c', '{{eval:d+1}}..{{eval:2*d-1}}')],
    ['**Comparer à 1.** $' + fr('{{a}}', '{{b}}') + ' < 1$ car ${{a}} < {{b}}$, et $'
     + fr('{{c}}', '{{d}}') + ' > 1$ car ${{c}} > {{d}}$ : donc $' + fr('{{a}}', '{{b}}') + ' < '
     + fr('{{c}}', '{{d}}') + '$.'],
    ['gcd(a,b)==1', 'gcd(c,d)==1'])

COMPARER_A_DEMI = compare(
    [var('b', '4..12'), var('a', '1..{{eval:floor((b-1)/2)}}'), var('d', '4..12'),
     var('c', '{{eval:floor(d/2)+1}}..{{eval:d-1}}')],
    ['**Comparer à $' + fr('1', '2') + '$.** La moitié de ${{b}}$ est ${{eval:b/2;d}}$ : ${{a}}$ est'
     ' plus petit, donc $' + fr('{{a}}', '{{b}}') + ' < ' + fr('1', '2') + '$. La moitié de ${{d}}$ est'
     ' ${{eval:d/2;d}}$ : ${{c}}$ est plus grand, donc $' + fr('{{c}}', '{{d}}') + ' > '
     + fr('1', '2') + '$.'],
    ['gcd(a,b)==1', 'gcd(c,d)==1'])

COMPARER_MULTIPLE = compare(
    [var('b', '2..6'), var('m', '2..3'), var('d', 'eval:b*m'), var('a', '1..{{eval:2*b-1}}'),
     var('c', '1..{{eval:2*d-1}}')],
    ['**Même dénominateur.** ${{d}} = {{b}} \\times {{m}}$ : on écrit $' + fr('{{a}}', '{{b}}')
     + '$ avec le dénominateur ${{d}}$, en multipliant numérateur et dénominateur par ${{m}}$.',
     '$' + fr('{{a}}', '{{b}}') + ' = ' + fr('{{a}} \\times {{m}}', '{{b}} \\times {{m}}') + ' = '
     + fr('{{eval:a*m}}', '{{d}}') + '$ : on compare ${{eval:a*m}}$ et ${{c}}$.'],
    ['gcd(a,b)==1', 'mod(a,b)!=0', 'mod(c,d)!=0', 'abs(c-a*m)<=2'])

COMPARER_COMMUN = compare(
    [var('k', '0..3'), var('b', selon('k', ['4', '6', '6', '4'])),
     var('d', selon('k', ['6', '8', '9', '10'])), var('L', 'eval:b*d/gcd(b,d)'),
     var('a', '1..{{eval:b-1}}'), var('c', '1..{{eval:d-1}}')],
    ['**Même dénominateur.** ${{L}}$ est un multiple de ${{b}}$ et de ${{d}}$ : on écrit les deux'
     ' fractions avec le dénominateur ${{L}}$.',
     '$' + fr('{{a}}', '{{b}}') + ' = ' + fr('{{eval:a*L/b}}', '{{L}}') + '$ et $'
     + fr('{{c}}', '{{d}}') + ' = ' + fr('{{eval:c*L/d}}', '{{L}}') + '$ : on compare $'
     + '{{eval:a*L/b}}$ et ${{eval:c*L/d}}$.'],
    ['gcd(a,b)==1', 'gcd(c,d)==1', 'a*d!=c*b'])

SPEC_DEN = {'b': 7, 'a': 3, 'c': 5, 'd': 7, 's': 0, 'gn': 3, 'gd': 7, 'dn': 5, 'dd': 7, 'r': 0}
SPEC_NUM = {'a': 5, 'b': 7, 'd': 9, 'c': 5, 's': 0, 'gn': 5, 'gd': 7, 'dn': 5, 'dd': 9, 'r': 2}
SPEC_UN = {'b': 8, 'a': 7, 'd': 9, 'c': 10, 's': 0, 'gn': 7, 'gd': 8, 'dn': 10, 'dd': 9, 'r': 0}
SPEC_DEMI = {'b': 12, 'a': 5, 'd': 11, 'c': 6, 's': 1, 'gn': 6, 'gd': 11, 'dn': 5, 'dd': 12,
             'r': 2}
SPEC_MUL = {'b': 3, 'm': 2, 'd': 6, 'a': 2, 'c': 4, 's': 0, 'gn': 2, 'gd': 3, 'dn': 4, 'dd': 6,
            'r': 1}
SPEC_COM = {'k': 0, 'b': 4, 'd': 6, 'L': 12, 'a': 3, 'c': 5, 's': 0, 'gn': 3, 'gd': 4, 'dn': 5,
            'dd': 6, 'r': 0}
MODELES.append(modele(
    '04-comparer-deux-fractions', 'Comparer deux fractions',
    'Comparer deux fractions : même dénominateur, même numérateur (5/7 et 5/9), de part et'
    ' d\'autre de 1 (7/8 et 10/9) ou de 1/2 (5/12 et 6/11), dénominateur commun (2/3 et 4/6 ;'
    ' 3/4 et 5/6)',
    'Fractions', 'Apprivoiser', 'Comparer', 5,
    [COMPARER_DENOMINATEUR, COMPARER_NUMERATEUR, COMPARER_A_UN, COMPARER_A_DEMI,
     COMPARER_MULTIPLE, COMPARER_COMMUN],
    [spec('3/7 < 5/7', 0, SPEC_DEN, '0', 'correct'),
     spec('5/7 > 5/9', 1, SPEC_NUM, '2', 'correct'),
     spec('Erreur : 5/7 < 5/9 (« 9 > 7 »)', 1, SPEC_NUM, '0', 'incorrect'),
     spec('7/8 < 10/9', 2, SPEC_UN, '0', 'correct'),
     spec('Erreur : 7/8 > 10/9', 2, SPEC_UN, '2', 'incorrect'),
     spec('6/11 > 5/12', 3, SPEC_DEMI, '2', 'correct'),
     spec('Erreur : 6/11 < 5/12 (« 12 > 11 »)', 3, SPEC_DEMI, '0', 'incorrect'),
     spec('2/3 = 4/6', 4, SPEC_MUL, '1', 'correct'),
     spec('Erreur : 2/3 < 4/6', 4, SPEC_MUL, '0', 'incorrect'),
     spec('3/4 < 5/6', 5, SPEC_COM, '0', 'correct'),
     spec('Erreur : 3/4 > 5/6', 5, SPEC_COM, '2', 'incorrect')]))

# --- 5. 6-203 : encadrer une fraction par deux entiers consécutifs -------------------------

ENCADRE = ('Encadre cette fraction par deux nombres entiers consécutifs.\n\n$$? < '
           + fr('{{a}}', '{{b}}') + ' < ?$$')
MIXTE = ('**Nombre mixte.** On cherche combien de fois ${{b}}$ va dans ${{a}}$ : ${{a}} = {{q}}'
         ' \\times {{b}} + {{r}}$.')
MIXTE_CALCUL = ('$$' + fr('{{a}}', '{{b}}') + ' = ' + fr('{{eval:q*b}}', '{{b}}') + ' + '
                + fr('{{r}}', '{{b}}') + ' = {{q}} + ' + fr('{{r}}', '{{b}}') + '$$')
MIXTE_FIN = ('$' + fr('{{r}}', '{{b}}') + '$ est entre $0$ et $1$, donc $' + col('{{q}}') + ' < '
             + fr('{{a}}', '{{b}}') + ' < ' + col('{{eval:q+1}}') + '$.')


def encadre(b, q):
    return variation(
        ENCADRE,
        [var('b', b), var('q', q), var('r', '1..{{eval:b-1}}'), var('a', 'eval:q*b+r')],
        ['{{q}}', '{{eval:q+1}}'], [MIXTE, MIXTE_CALCUL, MIXTE_FIN], ['gcd(r,b)==1'])


ENCADRER_PETITE = variation(
    ENCADRE, [var('b', '2..9'), var('a', '1..{{eval:b-1}}'), var('q', '0'), var('r', 'eval:a')],
    ['0', '1'],
    ['${{a}} < {{b}}$ : la fraction $' + fr('{{a}}', '{{b}}') + '$ est plus petite que $1$, et'
     ' plus grande que $0$.',
     '$$' + col('0') + ' < ' + fr('{{a}}', '{{b}}') + ' < ' + col('1') + '$$'],
    ['gcd(a,b)==1'])

SPEC_ENC = {'b': 3, 'q': 2, 'r': 1, 'a': 7}
SPEC_ENC2 = {'b': 6, 'q': 7, 'r': 5, 'a': 47}
MODELES.append(modele(
    '05-encadrer-une-fraction', 'Encadrer une fraction par deux entiers',
    'Encadrer une fraction par deux entiers consécutifs à l\'aide du nombre mixte'
    ' (7/3 = 2 + 1/3, donc 2 < 7/3 < 3) ; fractions plus grandes (47/6) ; fraction < 1',
    'Fractions', 'Apprivoiser', 'Encadrer', 1,
    [encadre('2..6', '1..4'), encadre('3..9', '5..10'), ENCADRER_PETITE],
    [spec('2 < 7/3 < 3', 0, SPEC_ENC, ['2', '3'], 'correct'),
     spec('Erreur : 3 et 7 (numérateur et dénominateur)', 0, SPEC_ENC, ['3', '7'], 'incorrect'),
     spec('Erreur : 1 et 3', 0, SPEC_ENC, ['1', '3'], 'incorrect'),
     spec('7 < 47/6 < 8', 1, SPEC_ENC2, ['7', '8'], 'correct'),
     spec('Erreur : 6 et 8', 1, SPEC_ENC2, ['6', '8'], 'incorrect'),
     spec('0 < 2/5 < 1', 2, {'b': 5, 'a': 2, 'q': 0, 'r': 2}, ['0', '1'], 'correct'),
     spec('Erreur : 2 et 5', 2, {'b': 5, 'a': 2, 'q': 0, 'r': 2}, ['2', '5'], 'incorrect')],
    delay=45))

# --- 6. 6-134 : ranger des fractions -------------------------------------------------------

RANGE = ('Range ces nombres dans l\'ordre croissant.\n\n$$NOMBRES$$\n\n$$? < ? < ?$$')


def range3(nombres, variables, steps, conditions):
    """`nombres` : les trois nombres déjà rangés ; affichés dans l'ordre tiré par `p`."""
    return variation(RANGE.replace('NOMBRES', melange(nombres)), [var('p', '1..5')] + variables,
                     nombres, steps + ['$$' + col(' < '.join(nombres)) + '$$'], conditions)


RANGER_DENOMINATEUR = range3(
    [fr('{{x}}', '{{b}}'), fr('{{y}}', '{{b}}'), fr('{{z}}', '{{b}}')],
    [var('b', '3..12'), var('x', '1..9'), var('y', '{{eval:x+1}}..{{eval:x+5}}'),
     var('z', '{{eval:y+1}}..{{eval:y+5}}')],
    ['**Même dénominateur.** Toutes les parts ont la même taille, $' + fr('1', '{{b}}') + '$ : on'
     ' range les numérateurs, ${{x}} < {{y}} < {{z}}$.'],
    ['mod(x,b)!=0', 'mod(y,b)!=0', 'mod(z,b)!=0'])

FX = reduite('x', 'D')
FY = reduite('y', 'D')
FZ = reduite('z', 'D')
RANGER_MULTIPLES = range3(
    [FX, FY, FZ],
    [var('D', '6|8|10|12'), var('x', '1..{{eval:D-3}}'), var('y', '{{eval:x+1}}..{{eval:D-2}}'),
     var('z', '{{eval:y+1}}..{{eval:D-1}}')],
    ['**Même dénominateur.** On écrit les trois fractions avec le dénominateur ${{D}}$ : $' + FX
     + ' = ' + fr('{{x}}', '{{D}}') + '$, {{if:gcd(y,D)>1|$' + FY + ' = ' + fr('{{y}}', '{{D}}')
     + '$|$' + fr('{{y}}', '{{D}}') + '$}}, $' + FZ + ' = ' + fr('{{z}}', '{{D}}')
     + '$. On range les numérateurs : ${{x}} < {{y}} < {{z}}$.'],
    ['gcd(x,D)>1', 'gcd(z,D)>1', 'gcd(x,D)!=gcd(z,D)'])

RANGER_AUTOUR_DE_UN = range3(
    [fr('{{a}}', '{{b}}'), '1', fr('{{c}}', '{{d}}')],
    [var('b', '3|4|5|6|8|10|100'), var('a', '{{if:b==100|90|1}}..{{eval:b-1}}'), var('d', '2..12'),
     var('c', '{{eval:d+1}}..{{eval:2*d-1}}')],
    ['**Comparer à 1.** $' + fr('{{a}}', '{{b}}') + ' < 1$ car ${{a}} < {{b}}$, et $'
     + fr('{{c}}', '{{d}}') + ' > 1$ car ${{c}} > {{d}}$.'],
    ['gcd(a,b)==1', 'gcd(c,d)==1'])

MODELES.append(modele(
    '06-ranger-des-fractions', 'Ranger des fractions',
    'Ranger trois fractions dans l\'ordre croissant : même dénominateur, dénominateurs multiples'
    ' (1/2 ; 5/8 ; 3/4), autour de 1 (99/100 ; 1 ; 7/6)',
    'Fractions', 'Apprivoiser', 'Ordonner', 1,
    [RANGER_DENOMINATEUR, RANGER_MULTIPLES, RANGER_AUTOUR_DE_UN],
    [spec('2/7 < 3/7 < 6/7', 0, {'p': 3, 'b': 7, 'x': 2, 'y': 3, 'z': 6},
          ['\\frac{2}{7}', '\\frac{3}{7}', '\\frac{6}{7}'], 'correct'),
     spec('Erreur : ordre décroissant', 0, {'p': 3, 'b': 7, 'x': 2, 'y': 3, 'z': 6},
          ['\\frac{6}{7}', '\\frac{3}{7}', '\\frac{2}{7}'], 'incorrect'),
     spec('1/2 < 5/8 < 3/4', 1, {'p': 5, 'D': 8, 'x': 4, 'y': 5, 'z': 6},
          ['\\frac{1}{2}', '\\frac{5}{8}', '\\frac{3}{4}'], 'correct'),
     spec('Erreur : rangées par numérateurs (1/2 ; 3/4 ; 5/8)', 1,
          {'p': 5, 'D': 8, 'x': 4, 'y': 5, 'z': 6},
          ['\\frac{1}{2}', '\\frac{3}{4}', '\\frac{5}{8}'], 'incorrect'),
     spec('99/100 < 1 < 7/6', 2, {'p': 4, 'b': 100, 'a': 99, 'd': 6, 'c': 7},
          ['\\frac{99}{100}', '1', '\\frac{7}{6}'], 'correct'),
     spec('Erreur : 1 < 99/100 < 7/6', 2, {'p': 4, 'b': 100, 'a': 99, 'd': 6, 'c': 7},
          ['1', '\\frac{99}{100}', '\\frac{7}{6}'], 'incorrect')],
    delay=60))

# --- 7. 6-204 : ranger des nombres mixtes --------------------------------------------------

RANGER_PARTIES_ENTIERES = range3(
    ['{{q}} + ' + fr('{{x}}', '{{y}}'), '{{eval:q+1}} + ' + fr('{{u}}', '{{v}}'),
     '{{eval:q+2}} + ' + fr('{{s}}', '{{t}}')],
    [var('q', '1..5'), var('y', '2..9'), var('x', '1..{{eval:y-1}}'), var('v', '2..9'),
     var('u', '1..{{eval:v-1}}'), var('t', '2..9'), var('s', '1..{{eval:t-1}}')],
    ['**Nombres mixtes.** Chaque fraction est plus petite que $1$ : on range d\'abord les parties'
     ' entières, ${{q}} < {{eval:q+1}} < {{eval:q+2}}$.'],
    ['gcd(x,y)==1', 'gcd(u,v)==1', 'gcd(s,t)==1'])

RANGER_MEME_PARTIE = range3(
    ['{{eval:q-1}} + ' + fr('{{x}}', '{{y}}'), '{{q}} + ' + fr('1', '{{m}}'),
     '{{q}} + ' + fr('1', '{{n}}')],
    [var('q', '2..5'), var('y', '2..9'), var('x', '1..{{eval:y-1}}'), var('m', '3..9'),
     var('n', '2..{{eval:m-1}}')],
    ['**Nombres mixtes.** On range d\'abord les parties entières : ${{eval:q-1}} < {{q}}$.',
     'Même partie entière ${{q}}$ : on compare les fractions. $' + fr('1', '{{m}}') + ' < '
     + fr('1', '{{n}}') + '$ : partager en ${{m}}$ donne des parts plus petites qu\'en ${{n}}$.'],
    ['gcd(x,y)==1'])

RANGER_AVEC_FRACTION = range3(
    ['{{eval:q-1}} + ' + fr('{{x}}', '{{y}}'), fr('{{eval:q*b+1}}', '{{b}}'),
     '{{q}} + ' + fr('1', '{{v}}')],
    [var('q', '2..4'), var('y', '2..9'), var('x', '1..{{eval:y-1}}'), var('b', '3..6'),
     var('v', '2..{{eval:b-1}}')],
    ['**Nombre mixte.** On écrit la fraction comme un nombre mixte : $'
     + fr('{{eval:q*b+1}}', '{{b}}') + ' = ' + fr('{{eval:q*b}}', '{{b}}') + ' + ' + fr('1', '{{b}}')
     + ' = {{q}} + ' + fr('1', '{{b}}') + '$.',
     'Partie entière ${{eval:q-1}}$ d\'abord ; puis, avec la même partie entière ${{q}}$, $'
     + fr('1', '{{b}}') + ' < ' + fr('1', '{{v}}') + '$.'],
    ['gcd(x,y)==1'])

MI_1 = ['2 + \\frac{3}{5}', '3 + \\frac{1}{2}', '4 + \\frac{1}{4}']
MI_2 = ['1 + \\frac{3}{4}', '2 + \\frac{1}{4}', '2 + \\frac{1}{3}']
MI_3 = ['1 + \\frac{3}{4}', '\\frac{9}{4}', '2 + \\frac{1}{3}']
MODELES.append(modele(
    '07-ranger-des-nombres-mixtes', 'Ranger des nombres mixtes',
    'Ranger trois nombres mixtes dans l\'ordre croissant : parties entières différentes, même'
    ' partie entière (2 + 1/4 et 2 + 1/3), une fraction parmi eux (9/4)',
    'Fractions', 'Apprivoiser', 'Ordonner', 2,
    [RANGER_PARTIES_ENTIERES, RANGER_MEME_PARTIE, RANGER_AVEC_FRACTION],
    [spec('2 + 3/5 < 3 + 1/2 < 4 + 1/4', 0,
          {'p': 2, 'q': 2, 'y': 5, 'x': 3, 'v': 2, 'u': 1, 't': 4, 's': 1}, MI_1, 'correct'),
     spec('Erreur : rangés par fractions', 0,
          {'p': 2, 'q': 2, 'y': 5, 'x': 3, 'v': 2, 'u': 1, 't': 4, 's': 1},
          ['4 + \\frac{1}{4}', '3 + \\frac{1}{2}', '2 + \\frac{3}{5}'], 'incorrect'),
     spec('1 + 3/4 < 2 + 1/4 < 2 + 1/3', 1, {'p': 4, 'q': 2, 'y': 4, 'x': 3, 'm': 4, 'n': 3},
          MI_2, 'correct'),
     spec('Erreur : 2 + 1/3 < 2 + 1/4 (« 4 > 3 »)', 1,
          {'p': 4, 'q': 2, 'y': 4, 'x': 3, 'm': 4, 'n': 3},
          ['1 + \\frac{3}{4}', '2 + \\frac{1}{3}', '2 + \\frac{1}{4}'], 'incorrect'),
     spec('1 + 3/4 < 9/4 < 2 + 1/3', 2, {'p': 1, 'q': 2, 'y': 4, 'x': 3, 'b': 4, 'v': 3}, MI_3,
          'correct'),
     spec('7/4 au lieu de 1 + 3/4 : les nombres donnés sont à recopier', 2,
          {'p': 1, 'q': 2, 'y': 4, 'x': 3, 'b': 4, 'v': 3},
          ['\\frac{7}{4}', '\\frac{9}{4}', '2 + \\frac{1}{3}'], 'bad_form', ['form']),
     spec('Erreur : 9/4 le plus grand', 2, {'p': 1, 'q': 2, 'y': 4, 'x': 3, 'b': 4, 'v': 3},
          ['1 + \\frac{3}{4}', '2 + \\frac{1}{3}', '\\frac{9}{4}'], 'incorrect')],
    delay=60))

# --- 8. 6-205 : soustraire des fractions ---------------------------------------------------

DENOMINATEUR_COMMUN = ('**Soustraire des fractions.** On écrit les deux fractions avec le même'
                       ' dénominateur, puis on soustrait les numérateurs ; le dénominateur ne'
                       ' change pas.')

SOUSTRAIRE_MEME = variation(
    'Calcule. Donne le résultat sous forme d\'une fraction simplifiée.\n\n$$'
    + fr('{{a}}', '{{b}}') + ' - ' + fr('{{c}}', '{{b}}') + ' = ?$$',
    [var('b', '3..12'), var('a', '2..{{eval:2*b-1}}'), var('c', '1..{{eval:a-1}}')],
    [reduite('a-c', 'b')],
    [DENOMINATEUR_COMMUN,
     '$$' + fr('{{a}}', '{{b}}') + ' - ' + fr('{{c}}', '{{b}}') + ' = ' + fr('{{a}} - {{c}}', '{{b}}')
     + ' = {{if:gcd(a-c,b)>1|' + fr('{{eval:a-c}}', '{{b}}') + ' = |}}'
     + col('{{solution}}') + '$$'],
    ['mod(a-c,b)!=0', 'mod(a,b)!=0', 'mod(c,b)!=0'])


def soustraire_deux(b, d, conditions, etape):
    """a/b et c/d, la plus grande d'abord ; N/L = la différence avec le dénominateur commun L."""
    plus_grande = '{{if:a*d>c*b|' + fr('{{a}}', '{{b}}') + ' - ' + fr('{{c}}', '{{d}}') + '|' \
        + fr('{{c}}', '{{d}}') + ' - ' + fr('{{a}}', '{{b}}') + '}}'
    sur_l = '{{if:a*d>c*b|' + fr('{{eval:a*L/b}}', '{{L}}') + ' - ' + fr('{{eval:c*L/d}}', '{{L}}') \
        + '|' + fr('{{eval:c*L/d}}', '{{L}}') + ' - ' + fr('{{eval:a*L/b}}', '{{L}}') + '}}'
    return variation(
        'Calcule. Donne le résultat sous forme d\'une fraction simplifiée.\n\n$$' + plus_grande
        + ' = ?$$',
        b + d + [var('L', 'eval:b*d/gcd(b,d)'), var('N', 'eval:abs(a*L/b-c*L/d)')],
        [reduite('N', 'L')],
        [DENOMINATEUR_COMMUN, etape,
         '$$' + plus_grande + ' = ' + sur_l + ' = {{if:gcd(N,L)>1|' + fr('{{N}}', '{{L}}')
         + ' = |}}' + col('{{solution}}') + '$$'],
        ['gcd(a,b)==1', 'gcd(c,d)==1', 'a*d!=c*b', 'mod(N,L)!=0'] + conditions)


ECRIRE_SUR_L = ('Dénominateur commun ${{L}}$ : $' + fr('{{a}}', '{{b}}') + ' = '
                + fr('{{eval:a*L/b}}', '{{L}}') + '$ et $' + fr('{{c}}', '{{d}}') + ' = '
                + fr('{{eval:c*L/d}}', '{{L}}') + '$.')

SOUSTRAIRE_MULTIPLES = soustraire_deux(
    [var('b', '2..6'), var('m', '2..3'), var('a', '1..{{eval:2*b-1}}')],
    [var('d', 'eval:b*m'), var('c', '1..{{eval:2*d-1}}')], [], ECRIRE_SUR_L)

SOUSTRAIRE_QUELCONQUES = soustraire_deux(
    [var('b', '2..6'), var('a', '1..{{eval:2*b-1}}')],
    [var('d', '2..6'), var('c', '1..{{eval:2*d-1}}')], ['gcd(b,d)==1'], ECRIRE_SUR_L)

SOUSTRAIRE_ENTIER = variation(
    'Calcule. Donne le résultat sous forme d\'une fraction.\n\n$${{n}} - ' + fr('{{c}}', '{{d}}')
    + ' = ?$$',
    [var('n', '1..3'), var('d', '2..9'), var('c', '1..{{eval:d-1}}')],
    [fr('{{eval:n*d-c}}', '{{d}}')],
    [DENOMINATEUR_COMMUN,
     '${{n}} = ' + fr('{{eval:n*d}}', '{{d}}') + '$ : ' + '{{if:n==1|une unité, c\'est|${{n}}$'
     ' unités, c\'est}} ${{eval:n*d}}$ fois $' + fr('1', '{{d}}') + '$.',
     '$${{n}} - ' + fr('{{c}}', '{{d}}') + ' = ' + fr('{{eval:n*d}}', '{{d}}') + ' - '
     + fr('{{c}}', '{{d}}') + ' = ' + col('{{solution}}') + '$$'],
    ['gcd(c,d)==1'])

SPEC_SM = {'b': 9, 'a': 7, 'c': 2}
SPEC_SMUL = {'b': 3, 'm': 2, 'a': 2, 'd': 6, 'c': 1, 'L': 6, 'N': 3}
SPEC_SQ = {'b': 2, 'a': 7, 'd': 5, 'c': 3, 'L': 10, 'N': 29}
MODELES.append(modele(
    '08-soustraire-des-fractions', 'Soustraire des fractions',
    'Différence de deux fractions : même dénominateur (7/9 − 2/9), dénominateurs multiples'
    ' (2/3 − 1/6), quelconques dans des cas simples (7/2 − 3/5), entier moins fraction (1 − 3/8)',
    'Fractions', 'Calculer', 'Addition et Soustraction', 11,
    [SOUSTRAIRE_MEME, SOUSTRAIRE_MULTIPLES, SOUSTRAIRE_QUELCONQUES, SOUSTRAIRE_ENTIER],
    [spec('7/9 − 2/9 = 5/9', 0, SPEC_SM, '\\frac{5}{9}', 'correct'),
     spec('Erreur : dénominateurs soustraits aussi (5/0)', 0, SPEC_SM, '\\frac{5}{18}',
          'incorrect'),
     spec('2/3 − 1/6 = 1/2', 1, SPEC_SMUL, '\\frac{1}{2}', 'correct'),
     spec('3/6 non simplifié : ambre', 1, SPEC_SMUL, '\\frac{3}{6}', 'unoptimal_form',
          ['reducedFractions']),
     spec('Erreur : numérateurs et dénominateurs ôtés (1/3)', 1, SPEC_SMUL, '\\frac{1}{3}',
          'incorrect'),
     spec('Erreur : 2/3 écrit 2/6 sans changer le numérateur (1/6)', 1, SPEC_SMUL, '\\frac{1}{6}',
          'incorrect'),
     spec('7/2 − 3/5 = 29/10', 2, SPEC_SQ, '\\frac{29}{10}', 'correct'),
     spec('Erreur : 4/3', 2, SPEC_SQ, '\\frac{4}{3}', 'incorrect'),
     spec('1 − 3/8 = 5/8', 3, {'n': 1, 'd': 8, 'c': 3}, '\\frac{5}{8}', 'correct'),
     spec('Erreur : 2/8', 3, {'n': 1, 'd': 8, 'c': 3}, '\\frac{2}{8}', 'incorrect')]))

# --- 9. 6-137 : problèmes de fractions -----------------------------------------------------

GATEAU = variation(
    'Mia a découpé son gâteau d\'anniversaire en parts de différentes tailles. Leïla choisit une'
    ' part égale ' + selon('m', PARTS_A, 2) + ' du gâteau et Léo choisit une part égale '
    + selon('n', PARTS_A, 2) + ' du gâteau.\n\nQuelle fraction du gâteau reste-t-il pour les autres'
    ' invités ?\n\n$$?$$',
    [var('m', '2..6'), var('n', '{{eval:m+1}}..12'), var('L', 'eval:m*n/gcd(m,n)'),
     var('R', 'eval:L-L/m-L/n')],
    [reduite('R', 'L')],
    ['Leïla prend $' + fr('1', '{{m}}') + '$ du gâteau et Léo $' + fr('1', '{{n}}') + '$. On écrit'
     ' ces fractions avec le dénominateur ${{L}}$ : $' + fr('1', '{{m}}') + ' = '
     + fr('{{eval:L/m}}', '{{L}}') + '$ et $' + fr('1', '{{n}}') + ' = ' + fr('{{eval:L/n}}', '{{L}}')
     + '$.',
     'Le gâteau entier, c\'est $' + fr('{{L}}', '{{L}}') + '$. Il reste :',
     '$$' + fr('{{L}}', '{{L}}') + ' - ' + fr('{{eval:L/m}}', '{{L}}') + ' - '
     + fr('{{eval:L/n}}', '{{L}}') + ' = ' + '{{if:gcd(R,L)>1|' + fr('{{R}}', '{{L}}') + ' = |}}'
     + col('{{solution}}') + '$$'],
    ['L<=12', 'mod(R,L)!=0'])

EFFECTIF = variation(
    'Dans un collège, une classe compte ${{N}}$ élèves. Les $' + fr('{{p}}', '{{q}}')
    + '$ des élèves de la classe sont demi-pensionnaires.\n\nCombien d\'élèves de cette classe'
    ' sont demi-pensionnaires ?\n\nIl y a $?$ élèves demi-pensionnaires.',
    [var('q', '3..5'), var('p', '2..{{eval:q-1}}'), var('k', '4..16'), var('N', 'eval:q*k')],
    ['{{eval:p*k}}'],
    ['Les $' + fr('{{p}}', '{{q}}') + '$ de ${{N}}$ : on multiplie la fraction par le nombre.',
     '$$' + fr('{{p}}', '{{q}}') + ' \\times {{N}} = {{p}} \\times ' + fr('{{N}}', '{{q}}')
     + ' = {{p}} \\times {{k}} = ' + col('{{solution}}') + '$$'],
    ['gcd(p,q)==1', 'p>=2', 'N>=20', 'N<=32'])

RESTE = variation(
    'Inès a ${{S}}' + EURO + '$. Elle dépense {{if:p==1|' + selon('q', PARTS, 2) + '|les $'
    + fr('{{p}}', '{{q}}') + '$}} de son argent.\n\nCombien d\'argent lui reste-t-il ?\n\n'
    'Il lui reste $?' + EURO + '$.',
    [var('q', '2..5'), var('p', '1..{{eval:q-1}}'), var('k', '2..12'), var('S', 'eval:q*k')],
    ['{{eval:S-p*k}}'],
    ['Elle dépense $' + fr('{{p}}', '{{q}}') + '$ de ${{S}}' + EURO + '$ : $'
     + fr('{{p}}', '{{q}}') + ' \\times {{S}} = {{if:p==1|{{S}} \\div {{q}}|{{p}} \\times {{k}}}} = {{eval:p*k}}$, soit ${{eval:p*k}}'
     + EURO + '$.',
     '$${{S}} - {{eval:p*k}} = ' + col('{{solution}}') + '$$'],
    ['gcd(p,q)==1', 'S>=10', 'S<=60'])

DEUX_PARTS = variation(
    'Hugo peint un mur. Il en peint les $' + fr('{{a}}', '{{b}}') + '$ en rouge et les $'
    + fr('{{c}}', '{{d}}') + '$ en bleu.\n\nQuelle fraction du mur est peinte ?\n\n$$?$$',
    [var('b', '2..5'), var('m', '2..3'), var('d', 'eval:b*m'), var('a', '1..{{eval:b-1}}'),
     var('c', '1..{{eval:d-1}}'), var('N', 'eval:a*m+c')],
    [reduite('N', 'd')],
    ['On écrit les deux fractions avec le dénominateur ${{d}}$ : $' + fr('{{a}}', '{{b}}') + ' = '
     + fr('{{eval:a*m}}', '{{d}}') + '$.',
     '$$' + fr('{{eval:a*m}}', '{{d}}') + ' + ' + fr('{{c}}', '{{d}}') + ' = ' + '{{if:gcd(N,d)>1|' + fr('{{N}}', '{{d}}') + ' = |}}'
     + col('{{solution}}') + '$$'],
    ['gcd(a,b)==1', 'gcd(c,d)==1', 'N<d'])

MODELES.append(modele(
    '09-problemes-de-fractions', 'Problèmes de fractions',
    'Problèmes : ce qui reste d\'un gâteau (un quart et un sixième), fraction d\'un effectif'
    ' (3/4 de 28 élèves), argent restant après une dépense, deux parts d\'un même mur (2/5 + 3/10)',
    'Fractions', 'Problèmes', 'Parts et restes', 1,
    [GATEAU, EFFECTIF, RESTE, DEUX_PARTS],
    [spec('quart + sixième : reste 7/12', 0, {'m': 4, 'n': 6, 'L': 12, 'R': 7}, '\\frac{7}{12}',
          'correct'),
     spec('Erreur : la fraction prise (5/12)', 0, {'m': 4, 'n': 6, 'L': 12, 'R': 7},
          '\\frac{5}{12}', 'incorrect'),
     spec('Erreur : 1/4 + 1/6 = 2/10, reste 8/10', 0, {'m': 4, 'n': 6, 'L': 12, 'R': 7},
          '\\frac{8}{10}', 'incorrect'),
     spec('3/4 de 28 = 21', 1, {'q': 4, 'p': 3, 'k': 7, 'N': 28}, '21', 'correct'),
     spec('Erreur : un quart seulement (7)', 1, {'q': 4, 'p': 3, 'k': 7, 'N': 28}, '7',
          'incorrect'),
     spec('24 €, le tiers dépensé : reste 16', 2, {'q': 3, 'p': 1, 'k': 8, 'S': 24}, '16',
          'correct'),
     spec('Erreur : la dépense (8)', 2, {'q': 3, 'p': 1, 'k': 8, 'S': 24}, '8', 'incorrect'),
     spec('2/5 + 3/10 = 7/10', 3, {'b': 5, 'm': 2, 'd': 10, 'a': 2, 'c': 3, 'N': 7},
          '\\frac{7}{10}', 'correct'),
     spec('Erreur : 5/15', 3, {'b': 5, 'm': 2, 'd': 10, 'a': 2, 'c': 3, 'N': 7}, '\\frac{5}{15}',
          'incorrect')],
    delay=60))

# --- 10. 6-135 : additionner des fractions de dénominateurs différents ---------------------
# Ajouté par David le 2026-10-28 (§ 11, question 2) : 58bbee5d ne couvre que le même dénominateur.

ADDITIONNER = ('**Additionner des fractions.** On écrit les deux fractions avec le même'
               ' dénominateur, puis on additionne les numérateurs ; le dénominateur ne change pas.')


def additionner(b, d, conditions):
    return variation(
        'Calcule. Donne le résultat sous forme d\'une fraction simplifiée.\n\n$$'
        + fr('{{a}}', '{{b}}') + ' + ' + fr('{{c}}', '{{d}}') + ' = ?$$',
        b + d + [var('L', 'eval:b*d/gcd(b,d)'), var('N', 'eval:a*L/b+c*L/d')],
        [reduite_ou_entier('N', 'L')],
        [ADDITIONNER, ECRIRE_SUR_L,
         '$$' + fr('{{a}}', '{{b}}') + ' + ' + fr('{{c}}', '{{d}}') + ' = '
         + fr('{{eval:a*L/b}}', '{{L}}') + ' + ' + fr('{{eval:c*L/d}}', '{{L}}') + ' = '
         + '{{if:gcd(N,L)>1|' + fr('{{N}}', '{{L}}') + ' = |}}' + col('{{solution}}') + '$$'],
        ['gcd(a,b)==1', 'gcd(c,d)==1'] + conditions)


ADDITIONNER_MULTIPLES = additionner(
    [var('b', '2..6'), var('m', '2..3'), var('a', '1..{{eval:2*b-1}}')],
    [var('d', 'eval:b*m'), var('c', '1..{{eval:2*d-1}}')], ['mod(N,L)!=0'])

ADDITIONNER_QUELCONQUES = additionner(
    [var('b', '2..6'), var('a', '1..{{eval:2*b-1}}')],
    [var('d', '2..6'), var('c', '1..{{eval:2*d-1}}')], ['gcd(b,d)==1', 'mod(N,L)!=0'])

MODELES.append(modele(
    '10-additionner-des-fractions-de-denominateurs-differents',
    'Additionner des fractions de dénominateurs différents',
    'Somme de deux fractions : dénominateurs multiples (2/3 + 1/6), quelconques dans des cas'
    ' simples (5/4 + 2/3)',
    'Fractions', 'Calculer', 'Addition et Soustraction', 12,
    [ADDITIONNER_MULTIPLES, ADDITIONNER_QUELCONQUES],
    [spec('2/3 + 1/6 = 5/6', 0, {'b': 3, 'm': 2, 'a': 2, 'd': 6, 'c': 1, 'L': 6, 'N': 5},
          '\\frac{5}{6}', 'correct'),
     spec('10/12 non simplifié : ambre', 0, {'b': 3, 'm': 2, 'a': 2, 'd': 6, 'c': 1, 'L': 6, 'N': 5},
          '\\frac{10}{12}', 'unoptimal_form', ['reducedFractions']),
     spec('Erreur : numérateurs et dénominateurs additionnés (3/9)', 0,
          {'b': 3, 'm': 2, 'a': 2, 'd': 6, 'c': 1, 'L': 6, 'N': 5}, '\\frac{3}{9}', 'incorrect'),
     spec('5/4 + 2/3 = 23/12', 1, {'b': 4, 'a': 5, 'd': 3, 'c': 2, 'L': 12, 'N': 23},
          '\\frac{23}{12}', 'correct'),
     spec('Erreur : 7/7', 1, {'b': 4, 'a': 5, 'd': 3, 'c': 2, 'L': 12, 'N': 23}, '\\frac{7}{7}',
          'incorrect'),
     spec('Erreur : 7/12', 1, {'b': 4, 'a': 5, 'd': 3, 'c': 2, 'L': 12, 'N': 23}, '\\frac{7}{12}',
          'incorrect')]))

# Grandeurs en `\\unit{…}` (notation-unites.md), sauf juste après une case : `?~\\text{€}` garde une
# case de nombre (l'unité est écrite, l'élève ne la tape pas)
GRANDEUR_TEXTE = re.compile(r'(?<!\?)~\\text\{(€)\}')


def en_unit(texte):
    return GRANDEUR_TEXTE.sub(lambda g: '~\\unit{' + g.group(1) + '}', texte)


for _, m in MODELES:
    for v in m['variations']:
        v['statement'] = en_unit(v['statement'])
        v['correction']['steps'] = [en_unit(x) for x in v['correction']['steps']]

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
