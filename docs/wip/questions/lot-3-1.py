"""Écrit les 5 modèles du lot 1 « Puissances et nombres » de la 3e dans scripts/questions/3-lot-1/.

Phase 0 validée par David le 2026-10-28 (journal `questions-3-progress.md` § 8, un point par modèle) :

| # | Point | Titre | Catégorie, niveau |
| 1 | 3-003 | Problèmes avec des fractions | Fractions › Problèmes › Parts et restes, 3 |
| 2 | 3-007 | Problèmes et notation scientifique | Puissances › Problèmes › Notation scientifique, 1 |
| 3 | 3-008 | Résoudre x² = a | Calcul littéral › Equations › x² = a, 1 |
| 4 | 3-009 | Problèmes avec la racine carrée | Racines carrées › Problèmes › Aire et côté, 1 |
| 5 | 3-010 | Décomposer en facteurs premiers | Entiers › Nombres premiers › Décomposition, 1 |

Bornes : `cycle4.json`, 3e (3-003 : les quatre opérations ; 3-007 : préfixes de nano à giga ;
3-008 : a > 0, a = 0, a < 0, solutions en √a sans simplification ; 3-010 : entiers naturels,
exemples du BO 60, 306). Le nœud et le tag sont posés par la migration de rangement, après le
`--publier` de David. « Parts et restes » : 1 = 6e, 2 = prévu par la 4e, 3 = ici.

Décisions et pièges :
- 3-007 v4 (bactéries) : réponse en nombre entier ; 3-009 v3 : aire de 10 à 99 cm², arrondi au mm ;
- 3-010 : le juge ne sait pas exiger « facteurs premiers » (mesuré : `product` accepte 4 × 15, un
  motif refuse 5 × 3 × 2²) → cases des exposants et case choix, pas de réponse libre ;
- unités et préfixes : `{{if:…}}` mis bout à bout, jamais imbriqués ; μ = lettre grecque (U+03BC) ;
- variables `e` et `i` interdites dans les `eval`.

    python3 docs/wip/questions/lot-3-1.py scripts/questions/3-lot-1
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


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + l + '\n' for l in lignes) + '```'


def ev(x):
    return '{{eval:' + x + '}}'


def frac(n, d):
    return '\\dfrac{' + n + '}{' + d + '}'


X = '\\times'
MODELES = []

# --- 1. 3-003 : problèmes avec des fractions -------------------------------------------------

# v1 : trois groupes a/b, 1/d, 1/g ; la part du dernier = 1 − somme, calculée sur b × d × g
NUM_RESTE = 'b*d*g-a*d*g-b*g-b*d'
DEN_RESTE = 'b*d*g'
G1 = 'gcd(' + NUM_RESTE + ',' + DEN_RESTE + ')'
COMPLEMENT = variation(
    'Dans un collège, $' + frac('{{a}}', '{{b}}') + '$ des élèves sont en sixième, $'
    + frac('1', '{{d}}') + '$ en cinquième et $' + frac('1', '{{g}}') + '$ en quatrième. Les'
    ' autres sont en troisième.\n\nQuelle fraction des élèves est en troisième ?\n\n$?$',
    [var('b', '3..5'), var('a', '1..2'), var('d', '3..6'), var('g', '4..8')],
    [frac(ev('(' + NUM_RESTE + ')/' + G1), ev(DEN_RESTE + '/' + G1))],
    ['**Les élèves de troisième, c\'est ce qui reste.** Tous les élèves représentent $1$ : on'
     ' retire de $1$ la somme des trois fractions.',
     'Somme des trois fractions, au dénominateur commun $' + ev(DEN_RESTE) + '$ : $'
     + frac('{{a}}', '{{b}}') + ' + ' + frac('1', '{{d}}') + ' + ' + frac('1', '{{g}}') + ' = '
     + frac(ev('a*d*g+b*g+b*d'), ev(DEN_RESTE)) + '$.',
     '$$1 - ' + frac(ev('a*d*g+b*g+b*d'), ev(DEN_RESTE)) + ' = '
     + frac(ev(NUM_RESTE), ev(DEN_RESTE)) + ' = ' + col('{{solution}}') + '$$'],
    ['gcd(a,b)==1', 'b<d', 'd<g', NUM_RESTE + '>0'])

# v2 : a/b dépensé, puis c/d du reste ; il reste N = k(b − a)(d − c) € ; départ = k × b × d
DU_RESTE = variation(
    'Inès dépense $' + frac('{{a}}', '{{b}}') + '$ de son argent de poche, puis $'
    + frac('{{c}}', '{{d}}') + '$ de ce qui lui reste. Il lui reste alors $' + ev('k*(b-a)*(d-c)')
    + '~\\unit{€}$.\n\nCombien d\'argent avait-elle au départ ?\n\n$?~\\unit{€}$',
    [var('b', '2..5'), var('a', '1..4'), var('d', '2..5'), var('c', '1..4'), var('k', '1..5')],
    [ev('k*b*d')],
    ['**Fraction qui reste.** Après la première dépense, il reste $1 - ' + frac('{{a}}', '{{b}}')
     + ' = ' + frac(ev('b-a'), '{{b}}') + '$ de l\'argent. Elle dépense ensuite $'
     + frac('{{c}}', '{{d}}') + '$ **de ce reste** : il en reste $' + frac(ev('d-c'), '{{d}}')
     + '$.',
     'Il reste donc $' + frac(ev('d-c'), '{{d}}') + ' ' + X + ' ' + frac(ev('b-a'), '{{b}}')
     + ' = ' + frac(ev('(d-c)*(b-a)'), ev('b*d')) + '$ de l\'argent du départ, soit $'
     + ev('k*(b-a)*(d-c)') + '~\\unit{€}$.',
     '$$' + ev('k*(b-a)*(d-c)') + ' \\div ' + frac(ev('(d-c)*(b-a)'), ev('b*d')) + ' = '
     + ev('k*(b-a)*(d-c)') + ' ' + X + ' ' + frac(ev('b*d'), ev('(d-c)*(b-a)')) + ' = '
     + col('{{solution}}~\\unit{€}') + '$$'],
    ['a<b', 'c<d', 'gcd(a,b)==1', 'gcd(c,d)==1', 'k*b*d<=200'])

# v3 : réservoir aux a/b, + N L, aux c/d ; capacité = k × b × d, N = k(cb − ad)
RESERVOIR = variation(
    'Un réservoir est rempli aux $' + frac('{{a}}', '{{b}}') + '$. On y verse $'
    + ev('k*(c*b-a*d)') + '~\\unit{L}$ : il est alors rempli aux $' + frac('{{c}}', '{{d}}')
    + '$.\n\nQuelle est la capacité du réservoir ?\n\n$?~\\unit{L}$',
    [var('b', '2..6'), var('a', '1..5'), var('d', '2..6'), var('c', '1..5'), var('k', '1..5')],
    [ev('k*b*d')],
    ['**Fraction versée.** Le réservoir passe de $' + frac('{{a}}', '{{b}}') + '$ à $'
     + frac('{{c}}', '{{d}}') + '$ : on a versé $' + frac('{{c}}', '{{d}}') + ' - '
     + frac('{{a}}', '{{b}}') + ' = ' + frac(ev('c*b-a*d'), ev('b*d')) + '$ de sa capacité.',
     'Ces $' + frac(ev('c*b-a*d'), ev('b*d')) + '$ de la capacité font $' + ev('k*(c*b-a*d)')
     + '~\\unit{L}$.',
     '$$' + ev('k*(c*b-a*d)') + ' \\div ' + frac(ev('c*b-a*d'), ev('b*d')) + ' = '
     + ev('k*(c*b-a*d)') + ' ' + X + ' ' + frac(ev('b*d'), ev('c*b-a*d')) + ' = '
     + col('{{solution}}~\\unit{L}') + '$$'],
    ['a<b', 'c<d', 'gcd(a,b)==1', 'gcd(c,d)==1', 'c*b>a*d', 'b!=d', 'k*b*d<=180'])

V_COMP = {'b': 3, 'a': 1, 'd': 4, 'g': 6}
V_RESTE = {'b': 3, 'a': 1, 'd': 4, 'c': 1, 'k': 2}
V_RES = {'b': 3, 'a': 1, 'd': 4, 'c': 3, 'k': 2}
MODELES.append(modele(
    '01-problemes-avec-des-fractions', 'Problèmes avec des fractions',
    'Résoudre un problème à plusieurs étapes avec des fractions : la part qui reste (1 − somme),'
    ' une fraction du reste, un réservoir qui passe de 1/3 à 3/4',
    'Fractions', 'Problèmes', 'Parts et restes', 3,
    [COMPLEMENT, DU_RESTE, RESERVOIR],
    [spec('1 − (1/3 + 1/4 + 1/6) = 1/4', 0, V_COMP, '\\frac{1}{4}', 'correct'),
     spec('Erreur : la somme 3/4 au lieu du reste', 0, V_COMP, '\\frac{3}{4}', 'incorrect'),
     spec('Erreur : numérateurs et dénominateurs ajoutés (1 − 3/13)', 0, V_COMP,
          '\\frac{10}{13}', 'incorrect'),
     spec('Départ 24 € (il reste 2/3 × 3/4 = 1/2, soit 12 €)', 1, V_RESTE, '24', 'correct'),
     spec('Erreur : 1/4 de la somme de départ (1 − 1/3 − 1/4 = 5/12 → 28,8)', 1, V_RESTE,
          '28,8', 'incorrect'),
     spec('Erreur : le reste lui-même (12)', 1, V_RESTE, '12', 'incorrect'),
     spec('Capacité 24 L (3/4 − 1/3 = 5/12, soit 10 L)', 2, V_RES, '24', 'correct'),
     spec('Erreur : 10 ÷ 3/4', 2, V_RES, '\\frac{40}{3}', 'incorrect'),
     spec('Erreur : 10 × 5/12', 2, V_RES, '\\frac{25}{6}', 'incorrect')],
    delay=120))

# --- 2. 3-007 : problèmes et notation scientifique -------------------------------------------

# k : puissance du préfixe ; l'unité est écrite par des {{if:}} mis bout à bout
PREFIXES = [(-9, 'nm'), (-6, 'μm'), (-3, 'mm'), (3, 'kW'), (6, 'MW'), (9, 'GW')]
UNITE = ''.join('{{if:k==' + str(p) + '|\\unit{' + u + '}|}}' for p, u in PREFIXES)
BASE = '{{if:k<0|\\unit{m}|\\unit{W}}}'
NOM_PREFIXE = ''.join('{{if:k==' + str(p) + '|' + n + '|}}' for p, n in
                      [(-9, 'nano'), (-6, 'micro'), (-3, 'milli'), (3, 'kilo'), (6, 'méga'),
                       (9, 'giga')])
LISTE_K = '-9|-6|-3|3|6|9'
RAPPEL_PREFIXES = ('**Préfixes.** nano $= 10^{-9}$, micro $= 10^{-6}$, milli $= 10^{-3}$,'
                   ' kilo $= 10^{3}$, méga $= 10^{6}$, giga $= 10^{9}$.')
RAPPEL_SCI = ('**Notation scientifique.** Un nombre s\'écrit $a ' + X + ' 10^n$ avec'
              ' $1 \\leq a < 10$ et $n$ entier relatif.')

PREFIXE = variation(
    'Complète.\n\n$$1~' + UNITE + ' = 10^{?}~' + BASE + '$$',
    [var('k', LISTE_K)],
    ['{{k}}'],
    [RAPPEL_PREFIXES,
     'Le préfixe ' + NOM_PREFIXE + ' vaut $10^{' + col('{{k}}') + '}$ : $1~' + UNITE + ' = '
     + col('10^{{{k}}}') + '~' + BASE + '$.'],
    None)

# A = X × 10^(j − 1) dans l'unité à préfixe = (X/10) × 10^(j + k) dans l'unité de base
CONVERSION = variation(
    'Écris cette grandeur en ' + '{{if:k<0|mètres|watts}}' + ', en notation scientifique.'
    '\n\n$$' + ev('X*10^(j-1);d') + '~' + UNITE + ' = ? ' + X + ' 10^{?}~' + BASE + '$$',
    [var('k', LISTE_K), var('X', '11..99!m(10)'), var('j', '0..2')],
    [ev('X/10;d'), ev('j+k')],
    [RAPPEL_PREFIXES + ' ' + RAPPEL_SCI,
     'On écrit d\'abord le nombre en notation scientifique : $' + ev('X*10^(j-1);d') + ' = '
     + col(ev('X/10;d')) + ' ' + X + ' 10^{' + ev('j') + '}$.',
     '$$' + ev('X*10^(j-1);d') + '~' + UNITE + ' = ' + ev('X/10;d') + ' ' + X + ' 10^{'
     + ev('j') + '} ' + X + ' 10^{{{k}}}~' + BASE + ' = ' + col(ev('X/10;d')) + ' ' + X
     + ' 10^{' + col(ev('j+k')) + '}~' + BASE + '$$'])

LUMIERE = variation(
    'En une seconde, la lumière parcourt $3 ' + X + ' 10^{8}~\\unit{m}$. Quelle distance'
    ' parcourt-elle en $' + ev('c*10^p') + '~\\unit{s}$ ?\n\nDonne le résultat en notation'
    ' scientifique.\n\n$$? ' + X + ' 10^{?}~\\unit{m}$$',
    [var('c', '4..9'), var('p', '1..3')],
    [ev('3*c/10;d'), ev('9+p')],
    [RAPPEL_SCI,
     'Distance = vitesse × durée : $3 ' + X + ' 10^{8} ' + X + ' ' + ev('c*10^p') + ' = 3 ' + X
     + ' {{c}} ' + X + ' 10^{8} ' + X + ' 10^{{{p}}} = ' + ev('3*c') + ' ' + X + ' 10^{'
     + ev('8+p') + '}$.',
     '$' + ev('3*c') + '$ n\'est pas entre $1$ et $10$ : $' + ev('3*c') + ' = ' + ev('3*c/10;d')
     + ' ' + X + ' 10$.',
     '$$' + ev('3*c') + ' ' + X + ' 10^{' + ev('8+p') + '} = ' + col(ev('3*c/10;d')) + ' ' + X
     + ' 10^{' + col(ev('9+p')) + '}~\\unit{m}$$'])

BACTERIES = variation(
    'Une bactérie mesure $' + '{{a}}' + '~\\unit{μm}$. Combien de bactéries faut-il aligner,'
    ' bout à bout, pour faire $1~\\unit{cm}$ ?\n\n$?$',
    [var('a', '1|2|4|5')],
    [ev('10000/a')],
    ['**Même unité.** $1~\\unit{cm} = 10^{-2}~\\unit{m}$ et $1~\\unit{μm} = 10^{-6}~\\unit{m}$ :'
     ' $1~\\unit{cm} = 10^{-2} \\div 10^{-6}~\\unit{μm} = 10^{4}~\\unit{μm} = 10\\,000~\\unit{μm}$.',
     '$$10\\,000 \\div {{a}} = ' + col('{{solution}}') + '$$'])

V_CONV = {'k': -9, 'X': 35, 'j': 2}
MODELES.append(modele(
    '02-problemes-et-notation-scientifique', 'Problèmes et notation scientifique',
    'Utiliser les préfixes (nano à giga) et la notation scientifique : 1 μm = 10⁻⁶ m ;'
    ' 350 nm = 3,5 × 10⁻⁷ m ; distance parcourue par la lumière ; bactéries bout à bout',
    'Puissances', 'Problèmes', 'Notation scientifique', 1,
    [PREFIXE, CONVERSION, LUMIERE, BACTERIES],
    [spec('1 μm = 10⁻⁶ m', 0, {'k': -6}, '-6', 'correct'),
     spec('Erreur : 1 μm = 10⁻³ m (milli)', 0, {'k': -6}, '-3', 'incorrect'),
     spec('1 GW = 10⁹ W', 0, {'k': 9}, '9', 'correct'),
     spec('350 nm = 3,5 × 10⁻⁷ m', 1, V_CONV, ['3,5', '-7'], 'correct'),
     spec('Erreur : mantisse 35 (35 × 10⁻⁸)', 1, V_CONV, ['35', '-8'], 'incorrect'),
     spec('Erreur : exposant du préfixe seul (3,5 × 10⁻⁹)', 1, V_CONV, ['3,5', '-9'],
          'incorrect'),
     spec('3 × 10⁸ × 500 = 1,5 × 10¹¹ m', 2, {'c': 5, 'p': 2}, ['1,5', '11'], 'correct'),
     spec('Erreur : 15 × 10¹⁰ non converti', 2, {'c': 5, 'p': 2}, ['15', '10'], 'incorrect'),
     spec('Erreur : exposants multipliés (1,5 × 10¹⁷)', 2, {'c': 5, 'p': 2}, ['1,5', '17'],
          'incorrect'),
     spec('10 000 ÷ 2 = 5 000', 3, {'a': 2}, '5000', 'correct'),
     spec('Erreur : 1 cm = 1 000 μm (500)', 3, {'a': 2}, '500', 'incorrect')],
    delay=90))

# --- 3. 3-008 : résoudre x² = a --------------------------------------------------------------

RAPPEL_CARRE = ('Les nombres dont le carré vaut $a>0$ sont $\\sqrt{a}$ et $-\\sqrt{a}$ : **deux**'
                ' solutions. Si $a=0$, une seule ($0$) ; si $a<0$, aucune (un carré est positif).')
ENONCE_X2 = 'Résous l\'équation $x^2=VALEUR$.\n\nL\'ensemble des solutions est $S=?$.'

CARRE_PARFAIT = variation(
    ENONCE_X2.replace('VALEUR', ev('n*n')),
    [var('n', '1..12')],
    ['\\{ -{{n}} ; {{n}} \\}'],
    [RAPPEL_CARRE,
     '$' + ev('n*n') + '>0$ et $\\sqrt{' + ev('n*n') + '}={{n}}$ : $x^2=' + ev('n*n')
     + '\\iff x={{n}} \\text{ ou } x=-{{n}}$.',
     '$S=' + col('\\{ -{{n}} ; {{n}} \\}') + '$.'])

NON_CARRE = variation(
    ENONCE_X2.replace('VALEUR', '{{a}}'),
    [var('a', '2..23')],
    ['\\{ -\\sqrt{ {{a}} } ; \\sqrt{ {{a}} } \\}'],
    [RAPPEL_CARRE,
     '${{a}}>0$ : $x^2={{a}}\\iff x=\\sqrt{ {{a}} } \\text{ ou } x=-\\sqrt{ {{a}} }$.',
     '$S=' + col('\\{ -\\sqrt{ {{a}} } ; \\sqrt{ {{a}} } \\}') + '$.'],
    ['mod(a,4) != 0', 'mod(a,9) != 0'])

NUL_OU_NEGATIF = variation(
    ENONCE_X2.replace('VALEUR', ev('-(t)*(n)')),
    [var('t', '0..1'), var('n', '1..20')],
    ['{{if:t==0|\\{ 0 \\}|\\varnothing}}'],
    [RAPPEL_CARRE,
     '{{if:t==0|$x^2=0\\iff x=0$ : une seule solution.|$' + ev('-(n)')
     + '<0$ et un carré n\'est jamais négatif : aucune solution.}}',
     '$S=' + col('{{if:t==0|\\{ 0 \\}|\\varnothing}}') + '$.'])

MODELES.append(modele(
    '03-resoudre-x2-egal-a', 'Résoudre x² = a',
    'Résoudre x² = a : deux solutions −√a et √a si a > 0 (x² = 49, x² = 7), une si a = 0,'
    ' aucune si a < 0 ; ensemble des solutions écrit',
    'Calcul littéral', 'Equations', 'x² = a', 1,
    [CARRE_PARFAIT, NON_CARRE, NUL_OU_NEGATIF],
    [spec('x² = 49 : S = {−7 ; 7}', 0, {'n': 7}, '\\{-7;7\\}', 'correct'),
     spec('x² = 49 : ordre inversé {7 ; −7}', 0, {'n': 7}, '\\{7;-7\\}', 'correct'),
     spec('Erreur : la solution positive seule', 0, {'n': 7}, '\\{7\\}', 'incorrect'),
     spec('x² = 7 : S = {−√7 ; √7}', 1, {'a': 7}, '\\{-\\sqrt{7};\\sqrt{7}\\}', 'correct'),
     spec('Erreur : √7 seul', 1, {'a': 7}, '\\{\\sqrt{7}\\}', 'incorrect'),
     spec('Erreur : 7/2 (division par 2)', 1, {'a': 7}, '\\{\\frac{7}{2}\\}', 'incorrect'),
     spec('x² = 0 : S = {0}', 2, {'t': 0, 'n': 5}, '\\{0\\}', 'correct'),
     spec('x² = −5 : S = ∅', 2, {'t': 1, 'n': 5}, '\\varnothing', 'correct'),
     spec('Erreur : x² = −5, S = {−√5 ; √5}', 2, {'t': 1, 'n': 5},
          '\\{-\\sqrt{5};\\sqrt{5}\\}', 'incorrect')],
    delay=60, shared={'blankDefaults': {'answerKind': 'intervalles'}}))

# --- 4. 3-009 : problèmes avec la racine carrée ----------------------------------------------

ENONCE_COTE = ('Un carré a une aire de $AIRE~\\unit{cm^2}$. Quelle est la longueur de son côté'
               '{{FIN}} ?\n\nCôté : $?$ cm')
RAPPEL_RACINE = ('**Côté et aire.** L\'aire d\'un carré de côté $c$ est $c^2$ : le côté est le'
                 ' nombre positif dont le carré vaut l\'aire, $c = \\sqrt{\\text{aire}}$.')

COTE_ENTIER = variation(
    ENONCE_COTE.replace('AIRE', ev('n*n')).replace('{{FIN}}', ''),
    [var('n', '2..15')],
    ['{{n}}'],
    [RAPPEL_RACINE,
     '$$c = \\sqrt{' + ev('n*n') + '} = ' + col('{{n}}') + '~\\unit{cm} \\quad \\text{car }'
     ' {{n}}^2 = ' + ev('n*n') + '$$'])

COTE_EXACT = variation(
    ENONCE_COTE.replace('AIRE', '{{a}}').replace('{{FIN}}', ' (valeur exacte)'),
    [var('a', '10..99')],
    ['\\sqrt{ {{a}} }'],
    [RAPPEL_RACINE,
     '${{a}}$ n\'est pas un carré parfait : la valeur exacte du côté s\'écrit avec une racine.',
     '$$c = ' + col('\\sqrt{ {{a}} }') + '~\\unit{cm}$$'],
    # sans facteur carré : √a est déjà simplifiée (la simplification des racines est en 2de)
    ['mod(a,4) != 0', 'mod(a,9) != 0', 'mod(a,25) != 0', 'mod(a,49) != 0'])

COTE_ARRONDI = variation(
    ENONCE_COTE.replace('AIRE', '{{a}}').replace('{{FIN}}', ', arrondie au millimètre'),
    [var('a', '10..99')],
    [{'expectedAnswer': ev('round(10*sqrt(a))/10;d'),
      'precision': {'type': 'decimal', 'digits': 1}}],
    [RAPPEL_RACINE,
     '$c = \\sqrt{ {{a}} }~\\unit{cm}$. À la calculatrice, $\\sqrt{ {{a}} } \\approx '
     + ev('floor(1000*sqrt(a))/1000;d') + '$.',
     'Au millimètre, c\'est-à-dire au dixième de centimètre : $$c \\approx '
     + col('{{solution}}') + '~\\unit{cm}$$'],
    ['floor(sqrt(a))^2 != a'])

# rectangle (m·k²) × m, d'aire (m·k)² : le côté du carré est m·k
RECTANGLE = variation(
    'Un rectangle mesure $' + ev('m*k*k') + '~\\unit{cm}$ sur ${{m}}~\\unit{cm}$. Un carré a la'
    ' même aire que ce rectangle.\n\nQuelle est la longueur du côté du carré ?\n\nCôté : $?$ cm',
    [var('m', '2..6'), var('k', '2..4')],
    [ev('m*k')],
    ['**Aire du rectangle.** $' + ev('m*k*k') + ' ' + X + ' {{m}} = ' + ev('m*k*m*k')
     + '~\\unit{cm^2}$ : c\'est aussi l\'aire du carré.',
     RAPPEL_RACINE,
     '$$c = \\sqrt{' + ev('m*k*m*k') + '} = ' + col('{{solution}}') + '~\\unit{cm}$$'],
    ['m*k*k<=50'])

MODELES.append(modele(
    '04-problemes-avec-la-racine-carree', 'Problèmes avec la racine carrée',
    'Trouver le côté d\'un carré connaissant son aire : 49 cm² → 7 cm ; 21 cm² → √21 cm ;'
    ' 20 cm² → ≈ 4,5 cm ; carré de même aire qu\'un rectangle 18 cm × 2 cm',
    'Racines carrées', 'Problèmes', 'Aire et côté', 1,
    [COTE_ENTIER, COTE_EXACT, COTE_ARRONDI, RECTANGLE],
    [spec('Aire 49 : côté 7', 0, {'n': 7}, '7', 'correct'),
     spec('Erreur : aire ÷ 2 (24,5)', 0, {'n': 7}, '24,5', 'incorrect'),
     spec('Erreur : aire ÷ 4, comme un périmètre (12,25)', 0, {'n': 7}, '12,25', 'incorrect'),
     spec('Aire 21 : côté √21', 1, {'a': 21}, '\\sqrt{21}', 'correct'),
     spec('Erreur : aire ÷ 2 (10,5)', 1, {'a': 21}, '10,5', 'incorrect'),
     spec('Erreur : valeur approchée 4,6 (valeur exacte demandée)', 1, {'a': 21}, '4,6',
          'incorrect'),
     spec('Aire 20 : ≈ 4,5', 2, {'a': 20}, '4,5', 'correct'),
     spec('Erreur : 4,4 (troncature)', 2, {'a': 20}, '4,4', 'incorrect'),
     spec('Rectangle 18 × 2 : côté 6', 3, {'m': 2, 'k': 3}, '6', 'correct'),
     spec('Erreur : demi-périmètre (20)', 3, {'m': 2, 'k': 3}, '20', 'incorrect'),
     spec('Erreur : l\'aire (36)', 3, {'m': 2, 'k': 3}, '36', 'incorrect')],
    delay=60))

# --- 5. 3-010 : décomposer en facteurs premiers ----------------------------------------------

RAPPEL_PREMIERS = ('**Facteurs premiers.** On divise par $2$ tant que c\'est possible, puis par $3$,'
                   ' par $5$, $7$… : à la fin, il ne reste que des nombres premiers.')

N1 = '2^a*3^b*5^c'
EXPOSANTS_235 = variation(
    'Décompose ce nombre en produit de facteurs premiers.\n\n$$' + ev(N1) + ' = 2^{?} ' + X
    + ' 3^{?} ' + X + ' 5^{?}$$',
    [var('a', '1..3'), var('b', '1..2'), var('c', '1..2')],
    ['{{a}}', '{{b}}', '{{c}}'],
    [RAPPEL_PREMIERS,
     'On divise ${{a}}$ fois par $2$ : $' + ev(N1) + ' = 2^{{{a}}} ' + X + ' ' + ev('3^b*5^c')
     + '$ ; puis ${{b}}$ fois par $3$ : $' + ev('3^b*5^c') + ' = 3^{{{b}}} ' + X + ' '
     + ev('5^c') + '$ ; il reste $' + ev('5^c') + ' = 5^{{{c}}}$.',
     '$$' + ev(N1) + ' = ' + col('2^{{{a}}} ' + X + ' 3^{{{b}}} ' + X + ' 5^{{{c}}}') + '$$'],
    [N1 + '<=1000'])

N2 = '2^a*3^b*p'
GRAND_PREMIER = variation(
    'Décompose ce nombre en produit de facteurs premiers.\n\n$$' + ev(N2) + ' = 2^{?} ' + X
    + ' 3^{?} ' + X + ' ?$$',
    [var('a', '1..3'), var('b', '1..2'), var('p', '7|11|13|17|19|23|29|31|37')],
    ['{{a}}', '{{b}}', '{{p}}'],
    [RAPPEL_PREMIERS,
     'On divise ${{a}}$ fois par $2$ : $' + ev(N2) + ' = 2^{{{a}}} ' + X + ' ' + ev('3^b*p')
     + '$ ; puis ${{b}}$ fois par $3$ : $' + ev('3^b*p') + ' = 3^{{{b}}} ' + X + ' {{p}}$.',
     '${{p}}$ n\'est divisible par aucun nombre premier plus petit que lui : il est premier.',
     '$$' + ev(N2) + ' = ' + col('2^{{{a}}} ' + X + ' 3^{{{b}}} ' + X + ' {{p}}') + '$$'],
    [N2 + '<=3000'])

# n = 2^a × 3 × q ; la bonne décomposition est le choix 0 (indice d'origine)
N3 = '2^a*3*q'
LAQUELLE = variation(
    'Quelle est la décomposition de $' + ev(N3) + '$ en produit de facteurs premiers ?'
    + choix(['$2^{{{a}}} ' + X + ' 3 ' + X + ' {{q}}$',
             '$2^{{{a}}} ' + X + ' ' + ev('3*q') + '$',
             '$' + ev('2^a') + ' ' + X + ' ' + ev('3*q') + '$',
             '$2 ' + X + ' ' + ev(N3 + '/2') + '$']),
    [var('a', '2..3'), var('q', '5|7')],
    ['0'],
    [RAPPEL_PREMIERS,
     '$' + ev('3*q') + ' = 3 ' + X + ' {{q}}$ et $' + ev('2^a') + ' = 2^{{{a}}}$ ne sont pas'
     ' premiers ; $2$, $3$ et ${{q}}$ le sont.',
     '$$' + ev(N3) + ' = ' + col('2^{{{a}}} ' + X + ' 3 ' + X + ' {{q}}') + '$$'])

MODELES.append(modele(
    '05-decomposer-en-facteurs-premiers', 'Décomposer en facteurs premiers',
    'Décomposer un entier en produit de facteurs premiers : 60 = 2² × 3 × 5 ; 306 = 2 × 3² × 17 ;'
    ' reconnaître la décomposition parmi 4 × 15, 2 × 30, 2² × 15',
    'Entiers', 'Nombres premiers', 'Décomposition', 1,
    [EXPOSANTS_235, GRAND_PREMIER, LAQUELLE],
    [spec('60 = 2² × 3 × 5', 0, {'a': 2, 'b': 1, 'c': 1}, ['2', '1', '1'], 'correct'),
     spec('Erreur : 2³ (60 ÷ 2 ÷ 2 ÷ 2 tenté)', 0, {'a': 2, 'b': 1, 'c': 1}, ['3', '1', '1'],
          'incorrect'),
     spec('306 = 2 × 3² × 17', 1, {'a': 1, 'b': 2, 'p': 17}, ['1', '2', '17'], 'correct'),
     spec('Erreur : 51 au lieu de 17 (3 oublié)', 1, {'a': 1, 'b': 2, 'p': 17}, ['1', '1', '51'],
          'incorrect'),
     spec('60 : 2² × 3 × 5', 2, {'a': 2, 'q': 5}, '0', 'correct'),
     spec('Erreur : 2² × 15', 2, {'a': 2, 'q': 5}, '1', 'incorrect'),
     spec('Erreur : 4 × 15', 2, {'a': 2, 'q': 5}, '2', 'incorrect')],
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
