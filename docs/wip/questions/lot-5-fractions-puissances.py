"""Écrit les 4 modèles du lot 3 « Fractions et puissances » de la 5e dans
scripts/questions/5-fractions-puissances/.

Phase 0 validée par David le 2026-10-29 (« je te suis ») ; un point par modèle :

| # | Point | Titre | Réponse | Catégorie, niveau |
| 1 | 5-027 | Problèmes : ajouter ou retrancher des fractions (un dénominateur multiple de
|   |       | l'autre, m = k × n ≤ 12) | case | Fractions › Problèmes › Additionner et soustraire, 1 |
| 2 | 5-027 | idem, dénominateurs quelconques ≤ 6 (2/3 + 1/4) | case | idem, 2 |
| 3 | 5-033 | Calculer une expression avec un carré ou un cube (x entier) | case |
|   |       | Calcul littéral › Calculs › Avec des puissances, 1 |
| 4 | 5-033 | idem, x décimal à une décimale, carré seulement | case | idem, 2 |

Bornes : `cycle4.json`, 5e (5-027 : fractions positives, additions et soustractions seulement ;
5-033 : un terme en x² ou x³, valeur substituée décimale positive). Le nœud et le tag sont posés
par la migration de rangement, après le `--publier` de David.

Décisions et pièges :
- 5-027 : trois situations, total (a/n + b/m), ce qui reste d'une quantité (a/n − b/m), le reste
  d'un tout (1 − (a/n + b/m)) ; « une quantité égale aux b/m de la capacité » et pas « b/m de ce
  qui reste » (fraction d'une fraction : 4e) ;
- fraction égale non simplifiée acceptée (`reducedFractions: off`, simplifier = 4e, comme
  f92d63a6) ; la réponse attendue est écrite au dénominateur commun le plus petit ;
- erreurs refusées : numérateurs et dénominateurs additionnés (2/3 + 1/4 → 3/7), 3x² ↔ (3x)²,
  x² lu 2x, 0,3² → 0,9 ;
- décimaux tirés en dixièmes entiers (`X/10;d`), carrés calculés en entiers puis divisés ;
- variables `e` et `i` interdites dans les `eval`.

    python3 docs/wip/questions/lot-5-fractions-puissances.py scripts/questions/5-fractions-puissances
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
    m = {'title': title, 'description': description, 'grades': ['5'], 'theme': theme,
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


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def ev(x):
    return '{{eval:' + x + '}}'


def fr(num, den, d=True):
    """Fraction LaTeX : fr('{{a}}', '{{n}}') → \\dfrac{{{a}}}{{{n}}}."""
    return ('\\dfrac{' if d else '\\frac{') + num + '}{' + den + '}'


MODELES = []
FRACTIONS_LIBRES = {'constraints': {'reducedFractions': 'off'}}

# --- 1 et 2. 5-027 : problèmes avec des additions et soustractions de fractions ---------------
# Les deux fractions : a/n et b/m, réécrites sur le dénominateur commun L (a/n = A/L, b/m = B/L).

MEME_DEN = ('**Même dénominateur.** Pour additionner ou soustraire des fractions, on les écrit'
            ' d\'abord avec le même dénominateur.')
REPONSE = '\n\n$$?$$'


def ecrire_au_den(x, den, fois, resultat):
    """$$x/den = x×fois / den×fois = resultat/L$$"""
    return ('$$' + fr(x, den) + ' = ' + fr(x + ' \\times ' + fois, den + ' \\times ' + fois)
            + ' = ' + fr(resultat, '{{L}}') + '$$')


def situations(etapes_den, intro_den):
    """Les trois situations, avec les étapes qui mettent a/n et b/m au dénominateur L."""
    a_n, b_m = fr('{{a}}', '{{n}}', False), fr('{{b}}', '{{m}}', False)
    total = variation(
        '{{if:s==0|Lou|Inès}} mange les $' + a_n + '$ d\'une pizza et {{if:s==0|Sam|Noé}} les $'
        + b_m + '$ de la même pizza.\n\nQuelle fraction de la pizza ont-ils mangée à eux'
        ' deux ?' + REPONSE,
        [var('s', '0..1')], [fr('{{eval:A+B}}', '{{L}}', False)],
        [MEME_DEN, intro_den] + etapes_den
        + ['$$' + fr('{{A}}', '{{L}}') + ' + ' + fr('{{B}}', '{{L}}') + ' = '
           + fr('{{A}} + {{B}}', '{{L}}') + ' = ' + col(fr('{{eval:A+B}}', '{{L}}')) + '$$',
           'Ils ont mangé les $' + col(fr('{{eval:A+B}}', '{{L}}')) + '$ de la pizza.'],
        ['A+B<L'])
    reste_quantite = variation(
        'Un réservoir est rempli aux $' + a_n + '$ de sa capacité. On utilise une quantité d\'eau'
        ' égale aux $' + b_m + '$ de sa capacité.\n\nÀ quelle fraction de sa capacité le'
        ' réservoir est-il encore rempli ?' + REPONSE,
        [], [fr('{{eval:A-B}}', '{{L}}', False)],
        [MEME_DEN, intro_den] + etapes_den
        + ['On retire l\'eau utilisée :',
           '$$' + fr('{{A}}', '{{L}}') + ' - ' + fr('{{B}}', '{{L}}') + ' = '
           + fr('{{A}} - {{B}}', '{{L}}') + ' = ' + col(fr('{{eval:A-B}}', '{{L}}')) + '$$',
           'Le réservoir est encore rempli aux $' + col(fr('{{eval:A-B}}', '{{L}}'))
           + '$ de sa capacité.'],
        ['A>B'])
    reste_tout = variation(
        'Dans un jardin, les $' + a_n + '$ de la surface sont un potager et les $' + b_m
        + '$ de la surface sont plantés de fleurs. Le reste est une pelouse.\n\nQuelle fraction'
        ' de la surface du jardin la pelouse occupe-t-elle ?' + REPONSE,
        [], [fr('{{eval:L-A-B}}', '{{L}}', False)],
        [MEME_DEN, intro_den] + etapes_den
        + ['Le potager et les fleurs occupent :',
           '$$' + fr('{{A}}', '{{L}}') + ' + ' + fr('{{B}}', '{{L}}') + ' = '
           + fr('{{eval:A+B}}', '{{L}}') + '$$',
           'Le jardin entier, c\'est $1 = ' + fr('{{L}}', '{{L}}') + '$ : la pelouse occupe',
           '$$' + fr('{{L}}', '{{L}}') + ' - ' + fr('{{eval:A+B}}', '{{L}}') + ' = '
           + col(fr('{{eval:L-A-B}}', '{{L}}')) + '$$'],
        ['A+B<L'])
    return [total, reste_quantite, reste_tout]


# 01 : m = k × n, dénominateur commun L = m
MULTIPLE = [var('n', '2..6'), var('k', '2..4'), var('m', 'eval:k*n'),
            var('a', '1..{{eval:n-1}}'), var('b', '1..{{eval:k*n-1}}'),
            var('L', 'eval:k*n'), var('A', 'eval:a*k'), var('B', 'eval:b')]
MULTIPLE_CONDITIONS = ['k*n<=12', 'gcd(a,n)==1', 'gcd(b,k*n)==1']
MULTIPLE_ETAPES = [ecrire_au_den('{{a}}', '{{n}}', '{{k}}', '{{A}}')]
MULTIPLE_INTRO = ('Ici, ${{m}} = {{n}} \\times {{k}}$ : on écrit la première fraction avec le'
                  ' dénominateur ${{m}}$.')

PB_MULTIPLE = situations(MULTIPLE_ETAPES, MULTIPLE_INTRO)
for v in PB_MULTIPLE:
    v['variables'] = v['variables'] + MULTIPLE
    v['conditions'] = MULTIPLE_CONDITIONS + v.get('conditions', [])

# 02 : n et p quelconques (aucun multiple de l'autre), L = ppcm(n, m)
QUELCONQUES = [var('n', '2..6'), var('m', '2..6'), var('a', '1..{{eval:n-1}}'),
               var('b', '1..{{eval:m-1}}'),
               var('L', 'eval:n*m/gcd(n,m)'), var('u', 'eval:m/gcd(n,m)'),
               var('w', 'eval:n/gcd(n,m)'), var('A', 'eval:a*m/gcd(n,m)'),
               var('B', 'eval:b*n/gcd(n,m)')]
QUELCONQUES_CONDITIONS = ['mod(n,m)!=0', 'mod(m,n)!=0', 'gcd(a,n)==1', 'gcd(b,m)==1']
QUELCONQUES_ETAPES = [ecrire_au_den('{{a}}', '{{n}}', '{{u}}', '{{A}}'),
                      ecrire_au_den('{{b}}', '{{m}}', '{{w}}', '{{B}}')]
QUELCONQUES_INTRO = ('${{L}}$ est un multiple de ${{n}}$ et de ${{m}}$ : on écrit les deux'
                     ' fractions avec le dénominateur ${{L}}$.')

PB_QUELCONQUES = situations(QUELCONQUES_ETAPES, QUELCONQUES_INTRO)
for v in PB_QUELCONQUES:
    v['variables'] = v['variables'] + QUELCONQUES
    v['conditions'] = QUELCONQUES_CONDITIONS + v.get('conditions', [])

# 1/4 et 3/8 : total 5/8, reste 1/8, pelouse 3/8
M1 = {'s': 0, 'n': 4, 'k': 2, 'm': 8, 'a': 1, 'b': 3, 'L': 8, 'A': 2, 'B': 3}
# 3/4 et 1/8 : réservoir 5/8
M2 = {'n': 4, 'k': 2, 'm': 8, 'a': 3, 'b': 1, 'L': 8, 'A': 6, 'B': 1}
# 1/3 et 1/6 : total 3/6 = 1/2
M3 = {'s': 1, 'n': 3, 'k': 2, 'm': 6, 'a': 1, 'b': 1, 'L': 6, 'A': 2, 'B': 1}
MODELES.append(modele(
    '01-problemes-fractions-multiple', 'Problèmes : ajouter ou retrancher des fractions',
    'Résoudre un problème qui additionne ou soustrait deux fractions dont un dénominateur est'
    ' multiple de l\'autre : 1/4 d\'une pizza et 3/8 de la même pizza ; ce qui reste d\'un'
    ' réservoir ; la part d\'un jardin qui reste',
    'Fractions', 'Problèmes', 'Additionner et soustraire', 1,
    PB_MULTIPLE,
    [spec('1/4 + 3/8 = 5/8', 0, M1, '\\frac{5}{8}', 'correct'),
     spec('Erreur : 4/12 (numérateurs et dénominateurs additionnés)', 0, M1, '\\frac{4}{12}',
          'incorrect'),
     spec('1/3 + 1/6 = 3/6 (non simplifiée)', 0, M3, '\\frac{3}{6}', 'correct'),
     spec('1/3 + 1/6 = 1/2 (simplifiée, acceptée)', 0, M3, '\\frac{1}{2}', 'correct'),
     spec('3/4 − 1/8 = 5/8', 1, M2, '\\frac{5}{8}', 'correct'),
     spec('Erreur : 2/4 (numérateurs et dénominateurs soustraits)', 1, M2, '\\frac{2}{4}',
          'incorrect'),
     spec('1 − (1/4 + 3/8) = 3/8', 2, M1, '\\frac{3}{8}', 'correct'),
     spec('Erreur : 5/8 (la part du potager et des fleurs)', 2, M1, '\\frac{5}{8}',
          'incorrect')],
    delay=90, options=FRACTIONS_LIBRES))

# 2/3 et 1/4 : total 11/12, reste 5/12, pelouse 1/12
Q1 = {'s': 0, 'n': 3, 'm': 4, 'a': 2, 'b': 1, 'L': 12, 'u': 4, 'w': 3, 'A': 8, 'B': 3}
# 1/4 et 1/6 : total 5/12 (10/24 accepté), pelouse 7/12
Q2 = {'s': 1, 'n': 4, 'm': 6, 'a': 1, 'b': 1, 'L': 12, 'u': 3, 'w': 2, 'A': 3, 'B': 2}
MODELES.append(modele(
    '02-problemes-fractions-quelconques', 'Problèmes : ajouter ou retrancher des fractions',
    'Résoudre un problème qui additionne ou soustrait deux fractions de dénominateurs quelconques :'
    ' 2/3 d\'une pizza et 1/4 de la même pizza ; ce qui reste d\'un réservoir ; la part d\'un'
    ' jardin qui reste',
    'Fractions', 'Problèmes', 'Additionner et soustraire', 2,
    PB_QUELCONQUES,
    [spec('2/3 + 1/4 = 11/12', 0, Q1, '\\frac{11}{12}', 'correct'),
     spec('Erreur : 3/7 (numérateurs et dénominateurs additionnés)', 0, Q1, '\\frac{3}{7}',
          'incorrect'),
     spec('1/4 + 1/6 = 10/24 (dénominateur 24, accepté)', 0, Q2, '\\frac{10}{24}', 'correct'),
     spec('2/3 − 1/4 = 5/12', 1, Q1, '\\frac{5}{12}', 'correct'),
     spec('Erreur : 1 (numérateurs et dénominateurs soustraits)', 1, Q1, '1', 'incorrect'),
     spec('1 − (2/3 + 1/4) = 1/12', 2, Q1, '\\frac{1}{12}', 'correct'),
     spec('1 − (1/4 + 1/6) = 7/12', 2, Q2, '\\frac{7}{12}', 'correct'),
     spec('Erreur : 5/12 (la part du potager et des fleurs)', 2, Q2, '\\frac{5}{12}',
          'incorrect')],
    delay=120, options=FRACTIONS_LIBRES))

# --- 3 et 4. 5-033 : valeur d'une expression littérale avec une puissance simple --------------

CP = 'Calculer'
SUBST_DEF = ('**Remplacer.** On remplace $x$ par sa valeur, puis on calcule en respectant les'
             ' priorités : d\'abord les puissances, puis les multiplications, enfin les additions'
             ' et les soustractions.')


def enonce(valeur, expression):
    return ('Calcule $A$ pour $x = ' + valeur + '$.\n\n$$A = ' + expression + '$$\n\n$$A = ?$$')


A_X2 = variation(
    enonce('{{x}}', '{{a}}x^2'), [var('a', '2..5'), var('x', '2..10')], ['{{eval:a*x*x}}'],
    [SUBST_DEF,
     '${{a}}x^2$ signifie ${{a}} \\times x^2$ : le carré porte seulement sur $x$.',
     '$$A = {{a}} \\times ' + col('{{x}}^2', 1) + ' = {{a}} \\times {{eval:x*x}} = '
     + col('{{solution}}') + '$$'])
A_X2_B = variation(
    enonce('{{x}}', '{{a}}x^2 - {{b}}'),
    [var('a', '2..5'), var('x', '2..10'), var('b', '1..20')], ['{{eval:a*x*x-b}}'],
    [SUBST_DEF,
     '${{a}}x^2$ signifie ${{a}} \\times x^2$ : le carré porte seulement sur $x$.',
     '$$A = {{a}} \\times ' + col('{{x}}^2', 1) + ' - {{b}} = {{a}} \\times {{eval:x*x}} - {{b}}'
     ' = {{eval:a*x*x}} - {{b}} = ' + col('{{solution}}') + '$$'],
    ['b<a*x*x'])
AX_2_B = variation(
    enonce('{{x}}', '({{a}}x)^2 - {{b}}'),
    [var('a', '2..5'), var('x', '2..6'), var('b', '1..20')], ['{{eval:a*a*x*x-b}}'],
    [SUBST_DEF,
     'Les parenthèses : le carré porte sur tout le produit ${{a}}x$.',
     '$$A = ({{a}} \\times ' + col('{{x}}', 1) + ')^2 - {{b}} = {{eval:a*x}}^2 - {{b}} = '
     '{{eval:a*a*x*x}} - {{b}} = ' + col('{{solution}}') + '$$'],
    ['a*x<=12', 'b<a*a*x*x'])
X3_B = variation(
    enonce('{{x}}', 'x^3 + {{b}}'), [var('x', '2..5'), var('b', '1..20')],
    ['{{eval:x*x*x+b}}'],
    [SUBST_DEF,
     '$x^3 = x \\times x \\times x$.',
     '$$A = ' + col('{{x}}^3', 1) + ' + {{b}} = {{x}} \\times {{x}} \\times {{x}} + {{b}} = '
     '{{eval:x*x*x}} + {{b}} = ' + col('{{solution}}') + '$$'])

MODELES.append(modele(
    '03-expression-avec-une-puissance', 'Calculer une expression avec un carré ou un cube',
    'Calculer la valeur d\'une expression littérale avec un carré ou un cube pour une valeur'
    ' entière de x : 3x² − 7 et (3x)² − 7 pour x = 4 ; x³ + 5 pour x = 3',
    'Calcul littéral', 'Calculs', 'Avec des puissances', 1,
    [A_X2, A_X2_B, AX_2_B, X3_B],
    [spec('3x² pour x = 4 : 48', 0, {'a': 3, 'x': 4}, '48', 'correct'),
     spec('Erreur : 144 (lu (3x)²)', 0, {'a': 3, 'x': 4}, '144', 'incorrect'),
     spec('Erreur : 24 (x² lu 2x)', 0, {'a': 3, 'x': 4}, '24', 'incorrect'),
     spec('3x² − 7 pour x = 4 : 41', 1, {'a': 3, 'x': 4, 'b': 7}, '41', 'correct'),
     spec('Erreur : 137 (lu (3x)² − 7)', 1, {'a': 3, 'x': 4, 'b': 7}, '137', 'incorrect'),
     spec('(3x)² − 7 pour x = 2 : 29', 2, {'a': 3, 'x': 2, 'b': 7}, '29', 'correct'),
     spec('Erreur : 5 (lu 3x² − 7)', 2, {'a': 3, 'x': 2, 'b': 7}, '5', 'incorrect'),
     spec('x³ + 5 pour x = 3 : 32', 3, {'x': 3, 'b': 5}, '32', 'correct'),
     spec('Erreur : 14 (x³ lu 3x)', 3, {'x': 3, 'b': 5}, '14', 'incorrect')],
    delay=60))

# x décimal à une décimale : 0,1 à 0,9 et 1,1 à 1,5
DIXIEME = [var('X', '1..15'), var('x', 'eval:X/10;d')]
NON_ENTIER = ['X!=10']

D_X2 = variation(
    enonce('{{x}}', 'x^2'), DIXIEME, ['{{eval:X*X/100;d}}'],
    [SUBST_DEF,
     '$$A = ' + col('{{x}}^2', 1) + ' = {{x}} \\times {{x}} = ' + col('{{solution}}') + '$$',
     'Un nombre à un chiffre après la virgule, multiplié par lui-même, en a deux.'],
    NON_ENTIER)
D_A_X2 = variation(
    enonce('{{x}}', '{{a}}x^2'), DIXIEME + [var('a', '2..5')], ['{{eval:a*X*X/100;d}}'],
    [SUBST_DEF,
     '${{a}}x^2$ signifie ${{a}} \\times x^2$ : le carré porte seulement sur $x$.',
     '$$A = {{a}} \\times ' + col('{{x}}^2', 1) + ' = {{a}} \\times {{eval:X*X/100;d}} = '
     + col('{{solution}}') + '$$'],
    NON_ENTIER)
D_X2_B = variation(
    enonce('{{x}}', 'x^2 + {{b}}'), DIXIEME + [var('b', '1..9')], ['{{eval:X*X/100+b;d}}'],
    [SUBST_DEF,
     '$$A = ' + col('{{x}}^2', 1) + ' + {{b}} = {{x}} \\times {{x}} + {{b}} = {{eval:X*X/100;d}}'
     ' + {{b}} = ' + col('{{solution}}') + '$$'],
    NON_ENTIER)

MODELES.append(modele(
    '04-expression-avec-un-carre-decimaux', 'Calculer une expression avec un carré ou un cube',
    'Calculer la valeur d\'une expression littérale avec un carré pour une valeur décimale de x'
    ' (un chiffre après la virgule) : x² pour x = 0,3 ; 4x² pour x = 1,2 ; x² + 5 pour x = 0,7',
    'Calcul littéral', 'Calculs', 'Avec des puissances', 2,
    [D_X2, D_A_X2, D_X2_B],
    [spec('x² pour x = 0,3 : 0,09', 0, {'X': 3, 'x': '0.3'}, '0,09', 'correct'),
     spec('Erreur : 0,9 (virgule mal placée)', 0, {'X': 3, 'x': '0.3'}, '0,9', 'incorrect'),
     spec('Erreur : 0,6 (x² lu 2x)', 0, {'X': 3, 'x': '0.3'}, '0,6', 'incorrect'),
     spec('4x² pour x = 1,2 : 5,76', 1, {'X': 12, 'x': '1.2', 'a': 4}, '5,76', 'correct'),
     spec('Erreur : 23,04 (lu (4x)²)', 1, {'X': 12, 'x': '1.2', 'a': 4}, '23,04', 'incorrect'),
     spec('x² + 5 pour x = 0,7 : 5,49', 2, {'X': 7, 'x': '0.7', 'b': 5}, '5,49', 'correct'),
     spec('Erreur : 6,4 (x² lu 2x)', 2, {'X': 7, 'x': '0.7', 'b': 5}, '6,4', 'incorrect')],
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
