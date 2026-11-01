"""Écrit les 7 modèles du lot 1 « Relatifs et rationnels » de la 4e dans scripts/questions/4-lot-1/.

Phase 0 validée par David le 2026-10-28 (§ 9 du journal `docs/wip/questions-4-progress.md`), un
point par modèle :

| # | Point | Titre                               | Catégorie, niveau                                  |
| 1 | 4-082 | Somme de deux opposés               | Relatifs › Additionner et soustraire › Sommes, 8   |
| 2 | 4-004 | Nommer un enchaînement d'opérations | Entiers › Priorités opératoires › Vocabulaire, 3   |
| 3 | 4-006 | Nombre rationnel                    | Fractions › Apprivoiser › Définition, 3            |
| 4 | 4-009 | Fraction d'une fraction             | Fractions › Calculer › Fraction d'une quantité, 7  |
| 5 | 4-010 | L'inverse d'un nombre               | Fractions › Calculer › Inverse, 3                  |
| 6 | 4-013 | Enchaîner des calculs de fractions  | Fractions › Calculer › Enchaînements, 1            |
| 7 | 4-014 | Problèmes avec des fractions        | Fractions › Problèmes › Parts et restes, 2         |

Bornes : `cycle4.json`, 4e (décimaux relatifs, rationnels relatifs ; 4-082 : −7,5 + 7,5 = 0 ;
4-004 : somme, différence, produit, quotient ; 4-006 : un rationnel peut être entier, décimal, ou ni
l'un ni l'autre ; 4-009 : la fraction d'une fraction est un produit ; 4-010 : inverse de a ≠ 0, noté
1/a ; 4-013 : 7/4 − 3/4 × 9/8 ; 4-014 : les quatre opérations et l'inverse). Le nœud et le tag sont
posés par la migration de rangement, après le `--publier` de David.

Décisions et pièges :
- 4-082 : un chiffre après la virgule (0,1 à 99,9), tirés en dixièmes entiers (`X/10;d`) ;
- 4-006 : le cas (entier, décimal non entier, ni l'un ni l'autre) est tiré par `k` ; numérateur et
  dénominateur sont pris parmi trois jeux de variables par des indicatrices arithmétiques de `k`
  (`(1-k)*(2-k)/2`, `k*(2-k)`, `k*(k-1)/2`) ; le bon choix est `{{k}}`, jamais un `{{if:…}}` ;
- résultats donnés sous forme irréductible ; une fraction juste non simplifiée reste juste en
  ambre (`reducedFractions`, défaut `warn`) : la 4e simplifie sans exiger l'irréductible (4-005) ;
- choix en case choix (bloc ```choix, ADR 0033) ;
- variables `e` et `i` interdites dans les `eval`.

    python3 docs/wip/questions/lot-4-1.py scripts/questions/4-lot-1
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
    m = {'title': title, 'description': description, 'grades': ['4'], 'theme': theme,
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


def ev(x):
    return '{{eval:' + x + '}}'


def fr(n, d):
    """Fraction de deux expressions de gabarit (`{{a}}`, `{{eval:…}}`)."""
    return '\\frac{' + n + '}{' + d + '}'


def signee(n, d):
    """Fraction n/d (n de signe quelconque, d > 0) écrite −5/6, jamais \\frac{-5}{6}."""
    return '{{if:(' + n + ')<0|-|}}' + fr(ev('abs(' + n + ')'), ev(d))


def reduite(n, d):
    """Fraction n/d (n de signe quelconque, d > 0) sous forme irréductible ; n/d jamais entier."""
    g = 'gcd(abs(' + n + '),' + d + ')'
    return signee('(' + n + ')/' + g, '(' + d + ')/' + g)


def reduite_ou_entier(n, d):
    """Fraction irréductible (n de signe quelconque, d > 0), ou l'entier si d divise n."""
    return ('{{if:mod(abs(' + n + '),' + d + ')==0|' + ev('(' + n + ')/(' + d + ')') + '|'
            + reduite(n, d) + '}}')


def fin(n, d):
    """Fin d'un calcul : n/d puis, s'il se simplifie, « = » le résultat ; résultat en couleur."""
    return ('{{if:gcd(abs(' + n + '),' + d + ')>1|' + signee(n, d) + ' = |}}'
            + col('{{solution}}'))


X = '\\times'
MODELES = []

# --- 1. 4-082 : somme de deux opposés ------------------------------------------------------

OPPOSES = ('**Nombres opposés.** Deux nombres opposés ont la même distance à zéro et des signes'
           ' contraires : leur somme est égale à $0$.')
DIXIEMES = [var('X', '1..999'), var('x', 'eval:X/10;d')]
NON_ENTIER = ['mod(X,10)!=0']

OPPOSES_SOMME = variation(
    'Calcule.\n\n$$-{{x}} + {{x}} = ?$$', DIXIEMES, ['0'],
    [OPPOSES,
     '$' + col('-{{x}}', 1) + '$ et $' + col('{{x}}', 1) + '$ sont opposés.',
     '$$-{{x}} + {{x}} = ' + col('{{solution}}') + '$$'],
    NON_ENTIER)

OPPOSES_TROU = variation(
    'Complète.\n\n$$-{{x}} + ? = 0$$', DIXIEMES, ['{{x}}'],
    [OPPOSES,
     'Le nombre qui, ajouté à $-{{x}}$, donne $0$ est l\'opposé de $-{{x}}$ : ' + col('{{x}}')
     .join(['$', '$']) + '.',
     '$$-{{x}} + ' + col('{{x}}') + ' = 0$$'],
    NON_ENTIER)

OPPOSES_TROIS_TERMES = variation(
    'Calcule.\n\n$$-{{x}} + {{b}} + {{x}} = ?$$', DIXIEMES + [var('b', '2..20')], ['{{b}}'],
    [OPPOSES,
     'On regroupe les opposés : $' + col('-{{x}}', 1) + '$ et $' + col('{{x}}', 1) + '$.',
     '$$-{{x}} + {{b}} + {{x}} = ' + col('(-{{x}} + {{x}})', 1) + ' + {{b}} = ' + col('0', 1)
     + ' + {{b}} = ' + col('{{solution}}') + '$$'],
    NON_ENTIER)

X75 = {'X': 75, 'x': '7.5'}
MODELES.append(modele(
    '01-somme-de-deux-opposes', 'Somme de deux opposés',
    'Savoir que la somme de deux nombres opposés est nulle : −7,5 + 7,5 = 0 ; −7,5 + ? = 0 ;'
    ' −7,5 + 9 + 7,5',
    'Relatifs', 'Additionner et soustraire', 'Sommes', 8,
    [OPPOSES_SOMME, OPPOSES_TROU, OPPOSES_TROIS_TERMES],
    [spec('−7,5 + 7,5 = 0', 0, X75, '0', 'correct'),
     spec('Erreur : −15 (les deux nombres négatifs)', 0, X75, '-15', 'incorrect'),
     spec('Erreur : 15', 0, X75, '15', 'incorrect'),
     spec('−7,5 + 7,5 = 0', 1, X75, '7,5', 'correct'),
     spec('Erreur : −7,5', 1, X75, '-7,5', 'incorrect'),
     spec('−7,5 + 9 + 7,5 = 9', 2, {**X75, 'b': 9}, '9', 'correct'),
     spec('Erreur : 9 − 15 = −6', 2, {**X75, 'b': 9}, '-6', 'incorrect'),
     spec('Erreur : 9 + 15 = 24', 2, {**X75, 'b': 9}, '24', 'incorrect')],
    delay=20))

# --- 2. 4-004 : nommer un enchaînement d'opérations ----------------------------------------
# Le bon choix est toujours le premier écrit (indice d'origine 0) ; le bloc mélange l'affichage.

LIRE = ('**Lire un calcul.** On nomme d\'abord la **dernière** opération effectuée (somme,'
        ' différence, produit, quotient), puis ce sur quoi elle porte.')


def nommer(calcul, premier, derniere, bonne, intrus, variables, conditions=None):
    # Trois nombres distincts : jamais « la différence de 3 et 3 » (diviseur nul, phrases égales)
    conditions = ['a!=b', 'b!=c', 'a!=c'] + (conditions or [])
    return variation(
        'Comment se lit le calcul $' + calcul + '$ ?'
        + choix([bonne] + intrus), variables, ['0'],
        [LIRE,
         'On calcule d\'abord $' + col(premier, 1) + '$, puis on effectue ' + derniere + '.',
         '$' + calcul + '$ est ' + col('\\text{' + bonne + '}').join(['$', '$']) + '.'],
        conditions)


VARS3 = [var('a', '2..9'), var('b', '2..9'), var('c', '2..9')]
PRODUIT_DE_SOMME = nommer(
    '({{a}} + {{b}}) ' + X + ' {{c}}', '{{a}} + {{b}}', 'une multiplication',
    'le produit de la somme de {{a}} et {{b}} par {{c}}',
    ['la somme de {{a}} et du produit de {{b}} par {{c}}',
     'le produit de {{a}} par la somme de {{b}} et {{c}}',
     'la somme du produit de {{a}} par {{b}} et de {{c}}'],
    VARS3)
SOMME_DE_PRODUIT = nommer(
    '{{a}} + {{b}} ' + X + ' {{c}}', '{{b}} ' + X + ' {{c}}', 'une addition',
    'la somme de {{a}} et du produit de {{b}} par {{c}}',
    ['le produit de la somme de {{a}} et {{b}} par {{c}}',
     'la somme du produit de {{a}} par {{b}} et de {{c}}',
     'le produit de {{a}} par la somme de {{b}} et {{c}}'],
    VARS3)
QUOTIENT_DE_DIFFERENCE = nommer(
    '({{a}} - {{b}}) \\div {{c}}', '{{a}} - {{b}}', 'une division',
    'le quotient de la différence de {{a}} et {{b}} par {{c}}',
    ['la différence de {{a}} et du quotient de {{b}} par {{c}}',
     'le quotient de {{a}} par la différence de {{b}} et {{c}}',
     'la différence du quotient de {{a}} par {{b}} et de {{c}}'],
    [var('a', '10..30'), var('b', '2..9'), var('c', '2..9')],
    ['a>b', 'mod(a-b,c)==0'])
PRODUIT_DE_DIFFERENCE = nommer(
    '{{a}} ' + X + ' ({{b}} - {{c}})', '{{b}} - {{c}}', 'une multiplication',
    'le produit de {{a}} par la différence de {{b}} et {{c}}',
    ['la différence du produit de {{a}} par {{b}} et de {{c}}',
     'le produit de la différence de {{a}} et {{b}} par {{c}}',
     'la différence de {{a}} et du produit de {{b}} par {{c}}'],
    VARS3, ['b>c'])

ABC = {'a': 3, 'b': 5, 'c': 2}
MODELES.append(modele(
    '02-nommer-un-enchainement', 'Nommer un enchaînement d\'opérations',
    'Lire un calcul avec le vocabulaire somme, différence, produit, quotient : (3 + 5) × 2 est'
    ' « le produit de la somme de 3 et 5 par 2 »',
    'Entiers', 'Priorités opératoires', 'Vocabulaire', 3,
    [PRODUIT_DE_SOMME, SOMME_DE_PRODUIT, QUOTIENT_DE_DIFFERENCE, PRODUIT_DE_DIFFERENCE],
    [spec('(3 + 5) × 2 : produit de la somme', 0, ABC, '0', 'correct'),
     spec('Erreur : la somme de 3 et du produit (lu de gauche à droite)', 0, ABC, '1',
          'incorrect'),
     spec('3 + 5 × 2 : somme de 3 et du produit', 1, ABC, '0', 'correct'),
     spec('Erreur : le produit de la somme', 1, ABC, '1', 'incorrect'),
     spec('(17 − 5) ÷ 4 : quotient de la différence', 2, {'a': 17, 'b': 5, 'c': 4}, '0',
          'correct'),
     spec('Erreur : la différence de 17 et du quotient', 2, {'a': 17, 'b': 5, 'c': 4}, '1',
          'incorrect'),
     spec('3 × (5 − 2) : produit de 3 par la différence', 3, ABC, '0', 'correct'),
     spec('Erreur : la différence du produit', 3, ABC, '1', 'incorrect')]))

# --- 3. 4-006 : nombre rationnel -----------------------------------------------------------
# k = 0 : entier (A = B × q) ; k = 1 : décimal non entier ; k = 2 : ni l'un ni l'autre.
# s, t : signes du numérateur et du dénominateur, l'un au moins négatif.

INDIC = ['(1-k)*(2-k)/2', 'k*(2-k)', 'k*(k-1)/2']
VARS_RATIONNEL = [
    var('k', '0..2'), var('s', '-1|1'), var('t', '-1|1'),
    var('q', '2..9'), var('b0', '2..9'),
    var('b1', '2|4|5|8|10'), var('a1', '1..99'),
    var('b2', '3|6|7|9|11|12'), var('a2', '1..60'),
    var('A', 'eval:' + INDIC[0] + '*b0*q+' + INDIC[1] + '*a1+' + INDIC[2] + '*a2'),
    var('B', 'eval:' + INDIC[0] + '*b0+' + INDIC[1] + '*b1+' + INDIC[2] + '*b2'),
    var('N', 'eval:s*A'), var('D', 'eval:t*B')]
CONDITIONS_RATIONNEL = ['s+t<2', 'mod(a1,b1)!=0', 'a1<10*b1', 'gcd(a2,b2)==1', 'a2<5*b2']
FRACTION = fr('{{N}}', '{{D}}')
SIGNE = '{{if:s*t<0|-|}}'

NATURE = variation(
    'Le nombre $' + FRACTION + '$ est :'
    + choix(['un nombre entier', 'un nombre décimal non entier',
             'ni un entier, ni un décimal'], melanger=False),
    VARS_RATIONNEL, ['{{k}}'],
    ['**Nombre rationnel.** $' + FRACTION + '$ est le quotient de deux entiers relatifs : c\'est'
     ' un nombre rationnel. Un rationnel peut être un entier, un décimal non entier, ou ni l\'un'
     ' ni l\'autre.',
     'Le signe : ' + '{{if:s*t<0|les signes sont contraires, le quotient est négatif|les deux'
     ' nombres sont négatifs, le quotient est positif}}' + '. On divise ${{A}}$ par ${{B}}$.',
     selon('k', [
         '${{A}} \\div {{B}} = {{q}}$ : la division tombe juste. $' + FRACTION + ' = ' + SIGNE
         + '{{q}}$ est ' + col('\\text{un nombre entier}').join(['$', '$']) + '.',
         '${{A}} \\div {{B}} = ' + ev('A/B;d') + '$ : la division s\'arrête, avec des chiffres'
         ' après la virgule. $' + FRACTION + ' = ' + SIGNE + ev('A/B;d') + '$ est '
         + col('\\text{un nombre décimal non entier}').join(['$', '$']) + '.',
         '${{A}} \\div {{B}} = ' + ev('floor(10000*A/B)/10000;d') + '\\ldots$ : la division ne'
         ' s\'arrête jamais. $' + FRACTION + '$ n\'est '
         + col('\\text{ni un entier, ni un décimal}').join(['$', '$']) + '.'])],
    CONDITIONS_RATIONNEL)

DECIMAL_EN_QUOTIENT = variation(
    'Complète par un nombre entier relatif.\n\n$$-{{x}} = \\frac{?}{10}$$', DIXIEMES, ['-{{X}}'],
    ['**Nombre rationnel.** Un décimal relatif s\'écrit comme un quotient de deux entiers'
     ' relatifs.',
     '$-{{x}}$, c\'est $-{{X}}$ dixièmes : $$-{{x}} = ' + fr(col('-{{X}}'), '10') + '$$'],
    ['mod(X,10)!=0', 'X<100'])

ENTIER_M12 = {'k': 0, 's': -1, 't': 1, 'q': 3, 'b0': 4, 'b1': 4, 'a1': 7, 'b2': 3, 'a2': 5,
              'A': 12, 'B': 4, 'N': -12, 'D': 4}
DECIMAL_M7 = {**ENTIER_M12, 'k': 1, 's': 1, 't': -1, 'A': 7, 'B': 4, 'N': 7, 'D': -4}
NI_M5 = {**ENTIER_M12, 'k': 2, 'A': 5, 'B': 3, 'N': -5, 'D': 3}
MODELES.append(modele(
    '03-nombre-rationnel', 'Nombre rationnel',
    'Un rationnel est le quotient de deux entiers relatifs : dire si −12/4, 7/(−4), −5/3 est un'
    ' entier, un décimal non entier ou ni l\'un ni l\'autre ; écrire −0,3 comme quotient',
    'Fractions', 'Apprivoiser', 'Définition', 3,
    [NATURE, DECIMAL_EN_QUOTIENT],
    [spec('−12/4 : entier', 0, ENTIER_M12, '0', 'correct'),
     spec('Erreur : −12/4 « ni l\'un ni l\'autre » (une fraction n\'est pas un entier)', 0,
          ENTIER_M12, '2', 'incorrect'),
     spec('7/(−4) : décimal non entier', 0, DECIMAL_M7, '1', 'correct'),
     spec('Erreur : 7/(−4) entier', 0, DECIMAL_M7, '0', 'incorrect'),
     spec('−5/3 : ni entier, ni décimal', 0, NI_M5, '2', 'correct'),
     spec('Erreur : −5/3 décimal', 0, NI_M5, '1', 'incorrect'),
     spec('−0,3 = −3/10', 1, {'X': 3, 'x': '0.3'}, '-3', 'correct'),
     spec('Erreur : signe oublié', 1, {'X': 3, 'x': '0.3'}, '3', 'incorrect'),
     spec('−4,7 = −47/10', 1, {'X': 47, 'x': '4.7'}, '-47', 'correct'),
     spec('Erreur : −4,7 → −4', 1, {'X': 47, 'x': '4.7'}, '-4', 'incorrect')]))

# --- 4. 4-009 : fraction d'une fraction ----------------------------------------------------

DE_FOIS = ('**Fraction d\'une fraction.** Prendre $' + fr('{{a}}', '{{b}}') + '$ d\'un nombre, c\'est'
           ' le multiplier par $' + fr('{{a}}', '{{b}}') + '$ : « de » se traduit par « $' + X
           + '$ ».')
VARS_FF = [var('b', '2..10'), var('a', '1..{{eval:b-1}}'), var('d', '2..10'),
           var('c', '1..{{eval:d-1}}')]
IRREDUCTIBLES = ['gcd(a,b)==1', 'gcd(c,d)==1']
PRODUIT_FF = fr('{{a}}', '{{b}}') + ' ' + X + ' ' + fr('{{c}}', '{{d}}')

FF_SANS_SIMPLIFIER = variation(
    'Calcule.\n\n$$' + fr('{{a}}', '{{b}}') + ' \\text{ de } ' + fr('{{c}}', '{{d}}') + ' = ?$$',
    VARS_FF, [fr(ev('a*c'), ev('b*d'))],
    [DE_FOIS,
     '$$' + PRODUIT_FF + ' = ' + fr('{{a}} ' + X + ' {{c}}', '{{b}} ' + X + ' {{d}}') + ' = '
     + col('{{solution}}') + '$$'],
    IRREDUCTIBLES + ['gcd(a*c,b*d)==1'])

FF_SIMPLIFIER = variation(
    'Calcule. Simplifie le résultat.\n\n$$' + fr('{{a}}', '{{b}}') + ' \\text{ de } '
    + fr('{{c}}', '{{d}}') + ' = ?$$',
    VARS_FF, [reduite('a*c', 'b*d')],
    [DE_FOIS,
     '$$' + PRODUIT_FF + ' = ' + fr('{{a}} ' + X + ' {{c}}', '{{b}} ' + X + ' {{d}}') + ' = '
     + fr(ev('a*c'), ev('b*d')) + ' = ' + col('{{solution}}') + '$$',
     'On simplifie par $' + ev('gcd(a*c,b*d)') + '$.'],
    IRREDUCTIBLES + ['gcd(a*c,b*d)>1', 'mod(a*c,b*d)!=0'])

FF_PROBLEME = variation(
    'Dans un collège, les $' + fr('{{a}}', '{{b}}') + '$ des élèves sont demi-pensionnaires.'
    ' Parmi les demi-pensionnaires, les $' + fr('{{c}}', '{{d}}') + '$ sont en 4e.\n\n'
    'Quelle fraction des élèves du collège sont des demi-pensionnaires de 4e ?\n\n$$?$$',
    # numérateurs ≥ 2 : « les 2/3 des élèves », jamais « les 1/3 »
    [var('b', '3..6'), var('a', '2..{{eval:b-1}}'), var('d', '3..6'),
     var('c', '2..{{eval:d-1}}')],
    [reduite('a*c', 'b*d')],
    ['On prend les $' + fr('{{c}}', '{{d}}') + '$ **des** $' + fr('{{a}}', '{{b}}') + '$ des élèves :'
     ' c\'est une fraction d\'une fraction, donc un produit.',
     '$$' + fr('{{c}}', '{{d}}') + ' ' + X + ' ' + fr('{{a}}', '{{b}}') + ' = '
     + fr(ev('a*c'), ev('b*d')) + '{{if:gcd(a*c,b*d)>1| = ' + reduite('a*c', 'b*d') + '|}}$$',
     'Les demi-pensionnaires de 4e sont ' + col('{{solution}}').join(['$', '$']) + ' des élèves'
     ' du collège.'],
    IRREDUCTIBLES)

F2345 = {'b': 3, 'a': 2, 'd': 5, 'c': 4}
F3489 = {'b': 4, 'a': 3, 'd': 9, 'c': 8}
F3523 = {'b': 5, 'a': 3, 'd': 3, 'c': 2}
MODELES.append(modele(
    '04-fraction-d-une-fraction', 'Fraction d\'une fraction',
    'Calculer une fraction d\'une fraction par un produit : 2/3 de 4/5 = 8/15 ; 3/4 de 8/9 = 2/3 ;'
    ' les 2/3 des 3/5 des élèves',
    'Fractions', 'Calculer', 'Fraction d\'une quantité', 7,
    [FF_SANS_SIMPLIFIER, FF_SIMPLIFIER, FF_PROBLEME],
    [spec('2/3 de 4/5 = 8/15', 0, F2345, '\\frac{8}{15}', 'correct'),
     spec('Erreur : somme 2/3 + 4/5 = 22/15', 0, F2345, '\\frac{22}{15}', 'incorrect'),
     spec('Erreur : produit en croix 10/12', 0, F2345, '\\frac{10}{12}', 'incorrect'),
     spec('3/4 de 8/9 = 2/3', 1, F3489, '\\frac{2}{3}', 'correct'),
     spec('24/36 non simplifié : ambre', 1, F3489, '\\frac{24}{36}', 'unoptimal_form',
          ['reducedFractions']),
     spec('Erreur : somme 59/36', 1, F3489, '\\frac{59}{36}', 'incorrect'),
     spec('les 2/3 des 3/5 = 2/5', 2, F3523, '\\frac{2}{5}', 'correct'),
     spec('6/15 non simplifié : ambre', 2, F3523, '\\frac{6}{15}', 'unoptimal_form',
          ['reducedFractions']),
     spec('Erreur : 3/5 + 2/3 = 19/15', 2, F3523, '\\frac{19}{15}', 'incorrect')],
    delay=45))

# --- 5. 4-010 : l'inverse d'un nombre ------------------------------------------------------

INVERSE = ('**Inverse.** L\'inverse d\'un nombre $a$ non nul est le nombre qui, multiplié par $a$,'
           ' donne $1$ ; il se note $\\dfrac{1}{a}$.')

INVERSE_TROU = variation(
    'Complète.\n\n$${{a}} ' + X + ' ? = 1$$', [var('a', '2..12')],
    # 1/4 ou 0,25 : l'écriture décimale exacte est aussi l'inverse (1/3 arrondi reste faux)
    [{'expectedAnswer': fr('1', '{{a}}'), 'acceptDecimal': True}],
    [INVERSE,
     '$$' + '{{a}} ' + X + ' ' + col(fr('1', '{{a}}')) + ' = ' + fr('{{a}}', '{{a}}') + ' = 1$$',
     'Le nombre cherché est l\'inverse de ${{a}}$ : ' + col('{{solution}}').join(['$', '$'])
     + '.'])

INVERSE_DECIMAL = variation(
    'Quel est l\'inverse de ${{x}}$ ?\n\nL\'inverse de ${{x}}$ est $?$.',
    [var('C', '50|25|20|10|250|125'), var('x', 'eval:C/100;d')], [ev('100/C;d')],
    [INVERSE,
     'On cherche le nombre qui, multiplié par ${{x}}$, donne $1$ : $' + fr('1', '{{x}}') + ' = '
     + fr('100', '{{C}}') + ' = ' + ev('100/C;d') + '$.',
     '$$' + '{{x}} ' + X + ' ' + col('{{solution}}') + ' = 1$$'])

INVERSE_OU_OPPOSE = variation(
    'L\'inverse de ${{a}}$ est :'
    + choix(['$' + fr('1', '{{a}}') + '$', '$-{{a}}$', '$0{,}{{a}}$', '$-' + fr('1', '{{a}}') + '$']),
    [var('a', '2..9')], ['0'],
    [INVERSE,
     '$${{a}} ' + X + ' ' + col(fr('1', '{{a}}')) + ' = 1$$',
     '$-{{a}}$ est l\'**opposé** de ${{a}}$ : ${{a}} + (-{{a}}) = 0$. Ne pas confondre l\'inverse'
     ' (produit égal à $1$) et l\'opposé (somme égale à $0$).'])

MODELES.append(modele(
    '05-l-inverse-d-un-nombre', 'L\'inverse d\'un nombre',
    'Définition de l\'inverse et sa notation 1/a : 4 × ? = 1 ; l\'inverse de 0,25 ; ne pas'
    ' confondre l\'inverse de 5 (1/5) et son opposé (−5)',
    'Fractions', 'Calculer', 'Inverse', 3,
    [INVERSE_TROU, INVERSE_DECIMAL, INVERSE_OU_OPPOSE],
    [spec('4 × 1/4 = 1', 0, {'a': 4}, '\\frac{1}{4}', 'correct'),
     spec('4 × 0,25 = 1', 0, {'a': 4}, '0,25', 'correct'),
     spec('Erreur : l\'opposé −4', 0, {'a': 4}, '-4', 'incorrect'),
     spec('Erreur : 0,4', 0, {'a': 4}, '0,4', 'incorrect'),
     spec('Erreur : 1/3 arrondi à 0,33', 0, {'a': 3}, '0,33', 'incorrect'),
     spec('L\'inverse de 0,25 est 4', 1, {'C': 25, 'x': '0.25'}, '4', 'correct'),
     spec('Erreur : l\'opposé −0,25', 1, {'C': 25, 'x': '0.25'}, '-0,25', 'incorrect'),
     spec('L\'inverse de 2,5 est 0,4', 1, {'C': 250, 'x': '2.5'}, '0,4', 'correct'),
     spec('Erreur : 5,2', 1, {'C': 250, 'x': '2.5'}, '5,2', 'incorrect'),
     spec('L\'inverse de 5 est 1/5', 2, {'a': 5}, '0', 'correct'),
     spec('Erreur : l\'opposé −5', 2, {'a': 5}, '1', 'incorrect'),
     spec('Erreur : 0,5', 2, {'a': 5}, '2', 'incorrect')],
    delay=20))

# --- 6. 4-013 : enchaîner des calculs de fractions ------------------------------------------

PRIORITES = ('**Priorités.** On calcule d\'abord entre les parenthèses, puis les multiplications,'
             ' enfin les additions et les soustractions.')

ADDITION_PRODUIT = variation(
    'Calcule.\n\n$$' + fr('{{a}}', '{{d}}') + ' + ' + fr('{{b}}', '{{d}}') + ' ' + X + ' {{c}} = ?$$',
    [var('d', '3..9'), var('a', '1..{{eval:d-1}}'), var('b', '1..{{eval:d-1}}'),
     var('c', '2..5')],
    [reduite_ou_entier('a+b*c', 'd')],
    [PRIORITES,
     '$$' + fr('{{a}}', '{{d}}') + ' + ' + col(fr('{{b}}', '{{d}}') + ' ' + X + ' {{c}}', 1) + ' = '
     + fr('{{a}}', '{{d}}') + ' + ' + col(fr(ev('b*c'), '{{d}}'), 1) + ' = ' + fin('a+b*c', 'd') + '$$'],
    ['gcd(a,d)==1', 'gcd(b,d)==1'])

DIFFERENCE_PRODUIT = variation(
    'Calcule.\n\n$$' + fr('{{a}}', '{{b}}') + ' - ' + fr('{{c}}', '{{b}}') + ' ' + X + ' '
    + fr('{{f}}', '{{g}}') + ' = ?$$',
    [var('b', '2..9'), var('a', '2..20'), var('c', '1..9'), var('g', '2..8'), var('f', '1..12')],
    [reduite_ou_entier('a*g-c*f', 'b*g')],
    [PRIORITES,
     '$$' + fr('{{a}}', '{{b}}') + ' - ' + col(fr('{{c}}', '{{b}}') + ' ' + X + ' '
     + fr('{{f}}', '{{g}}'), 1) + ' = ' + fr('{{a}}', '{{b}}') + ' - '
     + col(fr(ev('c*f'), ev('b*g')), 1) + '$$',
     'On met au même dénominateur $' + ev('b*g') + '$ : $' + fr('{{a}}', '{{b}}') + ' = '
     + fr(ev('a*g'), ev('b*g')) + '$.',
     '$$' + fr(ev('a*g'), ev('b*g')) + ' - ' + fr(ev('c*f'), ev('b*g')) + ' = '
     + fin('a*g-c*f', 'b*g') + '$$'],
    ['gcd(a,b)==1', 'gcd(c,b)==1', 'gcd(f,g)==1', 'a*g>c*f', 'b*g<=40', 'a>b'])

def parentheses_produit(signe, nom_a):
    """(±a/b + c/b) × f/g ; `signe` = '' ou '-'."""
    n = '(' + signe + 'a+c)*f'
    return variation(
        'Calcule.\n\n$$\\left(' + signe + fr('{{a}}', '{{b}}') + ' + ' + fr('{{c}}', '{{b}}')
        + '\\right) ' + X + ' ' + fr('{{f}}', '{{g}}') + ' = ?$$',
        [var('b', '2..9'), var('a', '1..12'), var('c', '1..12'), var('g', '2..9'),
         var('f', '1..9')],
        [reduite_ou_entier(n, 'b*g')],
        [PRIORITES,
         '$$' + col('\\left(' + signe + fr('{{a}}', '{{b}}') + ' + ' + fr('{{c}}', '{{b}}')
                    + '\\right)', 1) + ' ' + X + ' ' + fr('{{f}}', '{{g}}') + ' = '
         + col(signee(signe + 'a+c', 'b'), 1) + ' ' + X + ' ' + fr('{{f}}', '{{g}}') + ' = '
         + fin(n, 'b*g') + '$$'],
        ['gcd(a,b)==1', 'gcd(c,b)==1', 'gcd(f,g)==1', 'a!=c', nom_a])


PARENTHESES_PRODUIT = parentheses_produit('', 'a+c<=12')
PARENTHESES_PRODUIT_NEGATIF = parentheses_produit('-', 'c<a')

MODELES.append(modele(
    '06-enchainer-des-calculs-de-fractions', 'Enchaîner des calculs de fractions',
    'Calculer une expression avec des fractions en respectant les priorités : 1/5 + 2/5 × 3 ;'
    ' 7/4 − 3/4 × 9/8 ; (1/3 + 4/3) × 2/5 ; (−5/3 + 1/3) × 2/7',
    'Fractions', 'Calculer', 'Enchaînements', 1,
    [ADDITION_PRODUIT, DIFFERENCE_PRODUIT, PARENTHESES_PRODUIT, PARENTHESES_PRODUIT_NEGATIF],
    [spec('1/5 + 2/5 × 3 = 7/5', 0, {'d': 5, 'a': 1, 'b': 2, 'c': 3}, '\\frac{7}{5}', 'correct'),
     spec('Erreur : de gauche à droite (3/5 × 3 = 9/5)', 0, {'d': 5, 'a': 1, 'b': 2, 'c': 3},
          '\\frac{9}{5}', 'incorrect'),
     spec('7/4 − 3/4 × 9/8 = 29/32', 1, {'b': 4, 'a': 7, 'c': 3, 'g': 8, 'f': 9},
          '\\frac{29}{32}', 'correct'),
     spec('Erreur : de gauche à droite (4/4 × 9/8 = 9/8)', 1,
          {'b': 4, 'a': 7, 'c': 3, 'g': 8, 'f': 9}, '\\frac{9}{8}', 'incorrect'),
     spec('(1/3 + 4/3) × 2/5 = 2/3', 2, {'b': 3, 'a': 1, 'c': 4, 'g': 5, 'f': 2}, '\\frac{2}{3}',
          'correct'),
     spec('10/15 non simplifié : ambre', 2, {'b': 3, 'a': 1, 'c': 4, 'g': 5, 'f': 2},
          '\\frac{10}{15}', 'unoptimal_form', ['reducedFractions']),
     spec('Erreur : parenthèses ignorées (1/3 + 8/15 = 13/15)', 2,
          {'b': 3, 'a': 1, 'c': 4, 'g': 5, 'f': 2}, '\\frac{13}{15}', 'incorrect'),
     spec('(−5/3 + 1/3) × 2/7 = −8/21', 3, {'b': 3, 'a': 5, 'c': 1, 'g': 7, 'f': 2},
          '-\\frac{8}{21}', 'correct'),
     spec('Erreur : signe oublié (8/21)', 3, {'b': 3, 'a': 5, 'c': 1, 'g': 7, 'f': 2},
          '\\frac{8}{21}', 'incorrect')],
    delay=90))

# --- 7. 4-014 : problèmes avec des fractions ------------------------------------------------

DU_RESTE = variation(
    'Léa dépense $' + fr('1', '{{p}}') + '$ de son argent de poche, puis $' + fr('1', '{{q}}')
    + '$ de ce qui lui reste.\n\nQuelle fraction de son argent de poche a-t-elle dépensée en'
    ' tout ?\n\n$$?$$',
    [var('p', '2..5'), var('q', '2..5')],
    [reduite_ou_entier('q+p-1', 'p*q')],
    ['Après la première dépense, il lui reste $1 - ' + fr('1', '{{p}}') + ' = '
     + fr(ev('p-1'), '{{p}}') + '$ de son argent.',
     'Elle dépense ensuite $' + fr('1', '{{q}}') + '$ **de ce reste** : $' + fr('1', '{{q}}') + ' '
     + X + ' ' + fr(ev('p-1'), '{{p}}') + ' = ' + fr(ev('p-1'), ev('p*q')) + '$.',
     '$$' + fr('1', '{{p}}') + ' + ' + fr(ev('p-1'), ev('p*q')) + ' = ' + fr('{{q}}', ev('p*q'))
     + ' + ' + fr(ev('p-1'), ev('p*q')) + ' = ' + fin('q+p-1', 'p*q')
     + '$$'])

VERRES = variation(
    'Une bouteille contient $' + fr('{{a}}', '{{b}}') + '~\\unit{L}$ de jus de fruits. On remplit'
    ' des verres de $' + fr('1', '{{c}}') + '~\\unit{L}$.\n\nCombien de verres peut-on remplir ?'
    '\n\nOn peut remplir $?$ verres.',
    [var('b', '2..4'), var('a', '1..{{eval:b-1}}'), var('m', '2..3'), var('c', 'eval:b*m')],
    ['{{eval:a*m}}'],
    ['On cherche combien de fois $' + fr('1', '{{c}}') + '~\\unit{L}$ entre dans $'
     + fr('{{a}}', '{{b}}') + '~\\unit{L}$ : c\'est une division.',
     'Diviser par $' + fr('1', '{{c}}') + '$, c\'est multiplier par son inverse ${{c}}$ :',
     '$$' + fr('{{a}}', '{{b}}') + ' \\div ' + fr('1', '{{c}}') + ' = ' + fr('{{a}}', '{{b}}') + ' '
     + X + ' {{c}} = ' + fr(ev('a*c'), '{{b}}') + ' = ' + col('{{solution}}') + '$$'],
    ['gcd(a,b)==1'])

FICELLE = variation(
    'Les $' + fr('{{a}}', '{{b}}') + '$ d\'une ficelle mesurent ${{n}}~\\unit{m}$.\n\nQuelle est la'
    ' longueur de la ficelle ?\n\nLa ficelle mesure $?~\\text{m}$.',
    [var('a', '2..4'), var('b', '3..9'), var('k', '2..6'), var('n', 'eval:a*k')],
    ['{{eval:b*k}}'],
    ['Si $L$ est la longueur de la ficelle : $' + fr('{{a}}', '{{b}}') + ' ' + X + ' L = {{n}}$,'
     ' donc $L = {{n}} \\div ' + fr('{{a}}', '{{b}}') + '$.',
     'Diviser par $' + fr('{{a}}', '{{b}}') + '$, c\'est multiplier par son inverse $'
     + fr('{{b}}', '{{a}}') + '$ :',
     '$${{n}} ' + X + ' ' + fr('{{b}}', '{{a}}') + ' = {{n}} \\div {{a}} ' + X + ' {{b}} = {{k}} '
     + X + ' {{b}} = ' + col('{{solution}}') + '$$'],
    ['gcd(a,b)==1', 'a<b'])

MODELES.append(modele(
    '07-problemes-avec-des-fractions', 'Problèmes avec des fractions',
    'Résoudre un problème avec des fractions : 1/3 puis 1/4 du reste ; combien de verres de 1/8 L'
    ' dans 3/4 L ; les 2/5 d\'une ficelle mesurent 12 m',
    'Fractions', 'Problèmes', 'Parts et restes', 2,
    [DU_RESTE, VERRES, FICELLE],
    [spec('1/3 puis 1/4 du reste : 1/2', 0, {'p': 3, 'q': 4}, '\\frac{1}{2}', 'correct'),
     spec('6/12 non simplifié : ambre', 0, {'p': 3, 'q': 4}, '\\frac{6}{12}', 'unoptimal_form',
          ['reducedFractions']),
     spec('Erreur : 1/3 + 1/4 = 7/12 (le reste oublié)', 0, {'p': 3, 'q': 4}, '\\frac{7}{12}',
          'incorrect'),
     spec('1/2 puis 1/3 du reste : 2/3', 0, {'p': 2, 'q': 3}, '\\frac{2}{3}', 'correct'),
     spec('Erreur : ce qui reste, 1/3', 0, {'p': 2, 'q': 3}, '\\frac{1}{3}', 'incorrect'),
     spec('3/4 L en verres de 1/8 L : 6', 1, {'b': 4, 'a': 3, 'm': 2, 'c': 8}, '6', 'correct'),
     spec('Erreur : 3/4 × 1/8 = 3/32', 1, {'b': 4, 'a': 3, 'm': 2, 'c': 8}, '\\frac{3}{32}',
          'incorrect'),
     spec('2/5 de la ficelle = 12 m : 30 m', 2, {'a': 2, 'b': 5, 'k': 6, 'n': 12}, '30',
          'correct'),
     spec('Erreur : 2/5 × 12', 2, {'a': 2, 'b': 5, 'k': 6, 'n': 12}, '\\frac{24}{5}',
          'incorrect'),
     spec('Erreur : 12 ÷ 2 = 6', 2, {'a': 2, 'b': 5, 'k': 6, 'n': 12}, '6', 'incorrect')],
    delay=90))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
