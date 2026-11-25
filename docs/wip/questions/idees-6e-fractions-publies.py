"""Ajoute les variations validées aux 13 modèles publiés exportés de prod dans
scripts/questions/idees-6e-fractions-publies/ (chantier idees-6e-fractions).

Phase 0 validée par David le 2026-11-25 (« je suis tes recos ») : F1 (93147367), F2 (000368e1),
F3 (6fdcdda1), F4 (c415d81d), F5 (5aa1d44c), F6 (afebbb91, 6818662d), F7 (83c835bb), F8 (58bbee5d),
F9 (0be55013), F10 (5cd25c2b), F11 (f9e9637c), F12 (5c8a6da6). Les variations s'ajoutent À LA FIN
(les réponses des élèves gardent l'indice de leur variation) ; la migration de contenu est générée
par scripts/questions/migration-contenu.ts. Seuls `variations` et `testSpecs` changent : ni titre,
ni niveaux, ni options.

Le script repart du contenu de prod (variations et specs d'origine, comptées dans ORIGINE) :
le relancer réécrit les ajouts sans les doubler.

Écarts à la fiche, à signaler à David :
- F6, 6818662d : la fiche voulait « a/b < 1 < c/d, dénominateurs différents », mais la variation 0
  du modèle le fait déjà (b et d tirés à part). À la place, une fraction égale à 1 (n/n) face à une
  fraction plus petite, égale ou plus grande que 1 : le cas « 5/5 et 7/7 » de leur exercice, que
  nous n'avions pas.
- F6, afebbb91 : une variation dont la réponse serait toujours « = » se devinerait. La seconde
  fraction vaut k·a/(k·b), ou un numérateur à 1 près : « = » une fois sur deux.
- F10 : un total de 150 à 990 (la fiche disait jusqu'à 2 400) : `${{N}}$` n'écrit pas l'espace des
  milliers.

Pièges du lot :
- Fusion `shared` ⊕ variation : `conditions` est REMPLACÉ en bloc (une liste vide aussi) ; les
  variables de `shared` sont tirées pour toutes les variations : on prend d'autres noms
  (6fdcdda1, c415d81d, 5aa1d44c ont des variables partagées a, b, c).
- Une erreur prévue qui tombe sur la bonne réponse d'un tirage est ignorée ; deux erreurs prévues
  de même valeur sur un tirage se gênent : les conditions les écartent.
- Choix (signe), étiquettes à ranger : pas d'erreur prévue (réservées à l'écriture ordinaire).
- Réponses des étiquettes à ranger : positions AFFICHÉES, calculées par
  scripts/questions/ranger-attendus.ts sous les variables de la spec.

Usage : python3 docs/wip/questions/idees-6e-fractions-publies.py scripts/questions/idees-6e-fractions-publies
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
SECOND = '\\textcolor{{{color:primary.1}}}'
FRACTION = {'pattern': 'u:integer / w:integer'}

# id court → (variations, specs) d'origine en prod (export du 2026-11-25)
ORIGINE = {'93147367': (1, 6), '000368e1': (1, 5), '6fdcdda1': (2, 6), 'c415d81d': (2, 7),
           '5aa1d44c': (4, 8), 'afebbb91': (2, 4), '6818662d': (2, 4), '83c835bb': (3, 6),
           '58bbee5d': (1, 6), '0be55013': (1, 5), '5cd25c2b': (4, 9), 'f9e9637c': (3, 9),
           '5c8a6da6': (1, 5)}


def spec(desc, vi, variables_, status, answers, message=None, violations=None):
    expected = {'status': status}
    if message is not None:
        # un décimal cité dans le message se résout avec un point (2.35)
        expected['expectedErrorMessage'] = message.replace('{,}', '.')
    if violations is not None:
        expected['constraintViolations'] = violations
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': expected, 'answers': answers}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def case(attendue, erreurs=None, forme=None):
    c = {'expectedAnswer': attendue}
    if forme:
        c['requiredForm'] = forme
    if erreurs:
        c['expectedErrors'] = erreurs
    return c


def variation(statement, variables, blanks, steps, hint, conditions=None):
    v = {'statement': statement, 'variables': variables, 'conditions': conditions or []}
    if blanks is not None:
        v['blanks'] = blanks
    v['correction'] = {'steps': steps}
    v['hint'] = hint
    return v


def couleur(contenu, c=PRIMAIRE):
    return c + '{' + contenu + '}'


def fr(n, d):
    return '\\frac{' + n + '}{' + d + '}'


def ajouter(court, variations, specs):
    chemin = os.path.join(DOSSIER, court + '.json')
    with open(chemin, encoding='utf-8') as f:
        m = json.load(f)
    nv, ns = ORIGINE[court]
    m['variations'] = m['variations'][:nv]
    m['testSpecs'] = m['testSpecs'][:ns]
    for s in specs:
        s['variationIndex'] += nv
    m['variations'] += variations
    m['testSpecs'] += specs
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
    print(f'{court} : {nv} + {len(variations)} variations, {ns} + {len(specs)} specs')


def fraction_en_mots(v, article):
    """« la moitié », « le tiers »… (article 'le') ou « à la moitié »… selon la valeur de v."""
    noms = {2: 'la moitié', 3: 'le tiers', 4: 'le quart', 5: 'le cinquième', 6: 'le sixième',
            7: 'le septième', 8: 'le huitième', 9: 'le neuvième', 10: 'le dixième',
            11: 'le onzième', 12: 'le douzième'}
    if article == 'Le':
        noms = {k: t[0].upper() + t[1:] for k, t in noms.items()}
    texte = noms[12]
    for k in range(11, 1, -1):
        texte = '{{if:' + v + '==' + str(k) + '|' + noms[k] + '|' + texte + '}}'
    return texte


# =============================================================================================
# 93147367 — forme décimale d'une fraction (6-125). F1 : les huitièmes (n impair), puis les
# dénominateurs 20, 25 et 50.
# =============================================================================================

F1_HUIT = variation(
    'Écris la forme décimale de la fraction.\n\n$$\\frac{{{n}}}{8} = ?$$',
    [var('n', '1|3|5|7|9|11|13|15')],
    [case('{{eval:n/8;d}}', [
        erreur('{{eval:n+0.8;d}}',
               'La barre de fraction n\'est pas une virgule : $\\frac{{{n}}}{8}$, c\'est '
               '${{n}} \\div 8$.', 'Barre de fraction lue comme une virgule'),
        erreur('{{eval:floor(100*n/8)/100;d}}',
               'La division n\'est pas finie : continue après les centièmes, jusqu\'à un reste '
               'nul.', 'Division arrêtée trop tôt'),
    ])],
    [
        '**Fraction et division.** $\\frac{{{n}}}{8}$ est le résultat de la division de '
        '${{n}}$ par $8$. On pose la division et on continue après la virgule jusqu\'à un reste '
        'nul.',
        '$$\\frac{{{n}}}{8} = {{n}} \\div 8 = ' + couleur('{{solution}}') + '$$',
    ],
    'Pose la division ${{n}} \\div 8$ et continue après la virgule jusqu\'à ce que le reste soit '
    'nul.',
)

F1_CENT = variation(
    'Écris la forme décimale de la fraction.\n\n$$\\frac{{{n}}}{{{d}}} = ?$$',
    [var('d', '20|25|50'), var('k', 'eval:100/d'), var('n', '1..{{eval:2*d-1}}')],
    [case('{{eval:n/d;d}}', [
        erreur('{{eval:n/100;d}}',
               '$\\frac{{{n}}}{{{d}}}$ n\'est pas ${{n}}$ centièmes : écris d\'abord une '
               'fraction égale de dénominateur $100$.', 'Numérateur gardé sur 100'),
        erreur('{{eval:n+d/100;d}}',
               'La barre de fraction n\'est pas une virgule : $\\frac{{{n}}}{{{d}}}$, c\'est '
               '${{n}} \\div {{d}}$.', 'Barre de fraction lue comme une virgule'),
    ])],
    [
        '**Fraction décimale.** ${{d}} \\times {{k}} = 100$ : on écrit une fraction égale de '
        'dénominateur $100$, en multipliant aussi le numérateur par ${{k}}$.',
        '$$\\frac{{{n}}}{{{d}}} = \\frac{{{n}} \\times ' + couleur('{{k}}', SECOND)
        + ' }{{{d}} \\times ' + couleur('{{k}}', SECOND) + ' } = \\frac{{{eval:n*k}}}{100} = '
        + couleur('{{solution}}') + '$$',
    ],
    'Cherche une fraction égale de dénominateur $100$ : par combien faut-il multiplier '
    '${{d}}$ ?',
    ['mod(n,d)!=0'],
)

SPECS_931 = [
    spec('F1 : 3/8 = 0,375', 0, {'n': '3'}, 'correct', ['0{,}375']),
    spec('F1 : 13/8 = 1,625', 0, {'n': '13'}, 'correct', ['1{,}625']),
    spec('F1 : barre lue comme une virgule (3,8)', 0, {'n': '3'}, 'incorrect', ['3{,}8'],
         'La barre de fraction n\'est pas une virgule : $\\frac{3}{8}$, c\'est $3 \\div 8$.'),
    spec('F1 : division arrêtée (0,37)', 0, {'n': '3'}, 'incorrect', ['0{,}37'],
         'La division n\'est pas finie : continue après les centièmes, jusqu\'à un reste nul.'),
    spec('F1 : 7/20 = 0,35', 1, {'d': '20', 'k': '5', 'n': '7'}, 'correct', ['0{,}35']),
    spec('F1 : 37/25 = 1,48', 1, {'d': '25', 'k': '4', 'n': '37'}, 'correct', ['1{,}48']),
    spec('F1 : 7/20 lu 7 centièmes', 1, {'d': '20', 'k': '5', 'n': '7'}, 'incorrect', ['0{,}07'],
         '$\\frac{7}{20}$ n\'est pas $7$ centièmes : écris d\'abord une fraction égale de '
         'dénominateur $100$.'),
    spec('F1 : 7/20 lu 7,2', 1, {'d': '20', 'k': '5', 'n': '7'}, 'incorrect', ['7{,}2'],
         'La barre de fraction n\'est pas une virgule : $\\frac{7}{20}$, c\'est $7 \\div 20$.'),
]


# =============================================================================================
# 000368e1 — forme fractionnaire d'un décimal (6-106). F2 : la moitié de l'égalité est donnée,
# un seul nombre à écrire. Décimaux n0/d0 avec d0 ∈ {2, 4}, n0 ∈ {1, 3, 5} : 0,5 ; 1,5 ; 2,5 ;
# 0,25 ; 0,75 ; 1,25 ; la fraction est agrandie m fois (m de 1 à 3).
# =============================================================================================

F2_VARS = [var('d0', '2|4'), var('n0', '1|3|5'), var('m', '1..3'),
           var('x', 'eval:n0/d0;d'), var('N', 'eval:n0*m'), var('D', 'eval:d0*m')]
# chiffres du décimal sans la virgule (0,75 → 75 ; 1,5 → 15)
F2_CHIFFRES = '{{eval:n0*(5+10*(d0-2))}}'
# chiffres après la virgule (1,5 → 5 ; 0,75 → 75 ; 1,25 → 25)
F2_APRES = '{{eval:mod(n0*(5+10*(d0-2)),10+45*(d0-2))}}'
F2_MOTS = '{{if:d0==2|demis|quarts}}'

F2_STEPS = [
    '**Demis et quarts.** $0{,}5 = \\frac{1}{2}$ et $0{,}25 = \\frac{1}{4}$ : ${{x}}$, c\'est '
    '${{n0}}$ ' + F2_MOTS + ', soit $\\frac{{{n0}}}{{{d0}}}$.',
    '{{if:m==1|$${{x}} = ' + fr('{{N}}', '{{D}}') + '$$|On multiplie le numérateur et le '
    'dénominateur par ${{m}}$ : $${{x}} = \\frac{{{n0}}}{{{d0}}} = \\frac{{{n0}} \\times '
    + couleur('{{m}}', SECOND) + ' }{{{d0}} \\times ' + couleur('{{m}}', SECOND) + ' } = '
    + fr('{{N}}', '{{D}}') + '$$}}',
]

F2_NUM = variation(
    'Complète l\'égalité.\n\n$${{x}} = \\frac{?}{{{D}}}$$',
    F2_VARS,
    [case('{{N}}', [
        erreur(F2_CHIFFRES,
               'Tu as recopié les chiffres de ${{x}}$ sans la virgule : cherche combien de '
               '$\\frac{1}{{{D}}}$ il faut pour faire ${{x}}$.', 'Chiffres recopiés'),
        erreur('{{n0}}',
               '$\\frac{{{n0}}}{{{d0}}}$ vaut bien ${{x}}$, mais le dénominateur est ici '
               '${{D}}$ : multiplie aussi le numérateur par ${{m}}$.', 'Numérateur non agrandi'),
    ])],
    F2_STEPS,
    'Écris d\'abord ${{x}}$ en demis ou en quarts : $1 = \\frac{2}{2} = \\frac{4}{4}$.',
)

F2_DEN = variation(
    'Complète l\'égalité.\n\n$${{x}} = \\frac{{{N}}}{?}$$',
    F2_VARS,
    [case('{{D}}', [
        erreur(F2_APRES,
               'Les chiffres après la virgule ne donnent pas le dénominateur : cherche en '
               'combien de parts égales il faut partager l\'unité.', 'Partie décimale recopiée'),
        erreur('{{d0}}',
               '$\\frac{{{n0}}}{{{d0}}}$ vaut bien ${{x}}$, mais le numérateur est ici '
               '${{N}}$ : multiplie aussi le dénominateur par ${{m}}$.',
               'Dénominateur non agrandi'),
    ])],
    F2_STEPS,
    'Écris d\'abord ${{x}}$ en demis ou en quarts : $1 = \\frac{2}{2} = \\frac{4}{4}$.',
)

V_075 = {'d0': '4', 'n0': '3', 'm': '1', 'x': '0.75', 'N': '3', 'D': '4'}
V_15x2 = {'d0': '2', 'n0': '3', 'm': '2', 'x': '1.5', 'N': '6', 'D': '4'}
V_125x3 = {'d0': '4', 'n0': '5', 'm': '3', 'x': '1.25', 'N': '15', 'D': '12'}
SPECS_000 = [
    spec('F2 num : 0,75 = 3/4', 0, V_075, 'correct', ['3']),
    spec('F2 num : 0,75 = ?/4, chiffres recopiés (75)', 0, V_075, 'incorrect', ['75'],
         'Tu as recopié les chiffres de $0{,}75$ sans la virgule : cherche combien de '
         '$\\frac{1}{4}$ il faut pour faire $0{,}75$.'),
    spec('F2 num : 1,5 = 6/4', 0, V_15x2, 'correct', ['6']),
    spec('F2 num : 1,5 = ?/4, numérateur non agrandi (3)', 0, V_15x2, 'incorrect', ['3'],
         '$\\frac{3}{2}$ vaut bien $1{,}5$, mais le dénominateur est ici $4$ : multiplie aussi '
         'le numérateur par $2$.'),
    spec('F2 dén : 1,5 = 6/4', 1, V_15x2, 'correct', ['4']),
    spec('F2 dén : 1,5 = 6/?, partie décimale (5)', 1, V_15x2, 'incorrect', ['5'],
         'Les chiffres après la virgule ne donnent pas le dénominateur : cherche en combien de '
         'parts égales il faut partager l\'unité.'),
    spec('F2 dén : 1,5 = 6/?, dénominateur non agrandi (2)', 1, V_15x2, 'incorrect', ['2'],
         '$\\frac{3}{2}$ vaut bien $1{,}5$, mais le numérateur est ici $6$ : multiplie aussi le '
         'dénominateur par $2$.'),
    spec('F2 dén : 1,25 = 15/12', 1, V_125x3, 'correct', ['12']),
    spec('F2 dén : 1,25 = 15/?, partie décimale (25)', 1, V_125x3, 'incorrect', ['25'],
         'Les chiffres après la virgule ne donnent pas le dénominateur : cherche en combien de '
         'parts égales il faut partager l\'unité.'),
]


# =============================================================================================
# 6fdcdda1 — définition du quotient (6-126). F3 : écrire un quotient en fraction. p et q de 10
# à 25, premiers entre eux, q sans quotient décimal (la fraction est la seule écriture exacte).
# =============================================================================================

F3_VARS = [var('p', '10..25'), var('q', '11..25')]
F3_COND = ['gcd(p,q)==1', 'mod(10000,q)!=0']


def f3_erreurs():
    return [
        erreur(fr('{{q}}', '{{p}}'),
               'Le premier nombre nommé, le dividende ${{p}}$, va au numérateur.',
               'Numérateur et dénominateur inversés'),
        erreur('{{eval:p+q}}', 'Un quotient est le résultat d\'une division, pas d\'une '
               'addition.', 'Somme'),
        erreur('{{eval:p*q}}', 'Un quotient est le résultat d\'une division, pas d\'une '
               'multiplication.', 'Produit'),
    ]


F3_STEPS = [
    '**Définition du quotient.** Le quotient de ${{p}}$ par ${{q}}$ est le nombre qui, multiplié '
    'par ${{q}}$, donne ${{p}}$. Il s\'écrit avec le dividende au numérateur et le diviseur au '
    'dénominateur.',
    '$${{p}} \\div {{q}} = ' + couleur(fr('{{p}}', '{{q}}')) + '$$',
]

F3_MOTS = variation(
    'Écris le quotient de ${{p}}$ par ${{q}}$ sous la forme d\'une fraction.\n\n$$?$$',
    F3_VARS, [case(fr('{{p}}', '{{q}}'), f3_erreurs(), FRACTION)], F3_STEPS,
    'Le premier nombre nommé, celui qu\'on divise, va en haut.', F3_COND,
)

F3_SIGNE = variation(
    'Écris ce quotient sous la forme d\'une fraction.\n\n$${{p}} \\div {{q}} = ?$$',
    F3_VARS, [case(fr('{{p}}', '{{q}}'), f3_erreurs(), FRACTION)], F3_STEPS,
    'Le nombre qu\'on divise va en haut, celui par lequel on divise va en bas.', F3_COND,
)

V_17_23 = {'p': '17', 'q': '23'}
SPECS_6FD = [
    spec('F3 mots : 17/23', 0, V_17_23, 'correct', ['\\frac{17}{23}']),
    spec('F3 mots : inversé (23/17)', 0, V_17_23, 'incorrect', ['\\frac{23}{17}'],
         'Le premier nombre nommé, le dividende $17$, va au numérateur.'),
    spec('F3 mots : somme (40)', 0, V_17_23, 'incorrect', ['40'],
         'Un quotient est le résultat d\'une division, pas d\'une addition.'),
    spec('F3 mots : produit (391)', 0, V_17_23, 'incorrect', ['391'],
         'Un quotient est le résultat d\'une division, pas d\'une multiplication.'),
    spec('F3 signe : inversé (19/14)', 1, {'p': '14', 'q': '19'}, 'incorrect',
         ['\\frac{19}{14}'], 'Le premier nombre nommé, le dividende $14$, va au numérateur.'),
    spec('F3 signe : 10/21', 1, {'p': '10', 'q': '21'}, 'correct', ['\\frac{10}{21}']),
]


# =============================================================================================
# c415d81d — égalités à trous multiplicatives (6-127). F4 : le trou est dans la fraction ; on
# revient à la définition, x × y/x = y. Noms x, y (a et b sont partagés).
# =============================================================================================

F4_VARS = [var('x', '2..20'), var('y', '2..30'), var('s', '0..1')]
F4_DEF = ('**Définition du quotient.** $\\frac{{{y}}}{{{x}}}$ est le nombre qui, multiplié '
          'par ${{x}}$, donne ${{y}}$.')

F4_NUM = variation(
    'Complète l\'égalité.\n\n$${{if:s==0|{{x}} \\times \\frac{?}{{{x}}}|\\frac{?}{{{x}}} '
    '\\times {{x}}}} = {{y}}$$',
    F4_VARS,
    [case('{{y}}', [
        erreur('{{eval:x*y}}', 'Multiplier par ${{x}}$ ce qu\'on divise par ${{x}}$ redonne le '
               'numérateur : il doit valoir ${{y}}$, pas plus.', 'Produit'),
        erreur('{{eval:y-x}}', 'Ce n\'est pas une addition : la fraction est le nombre qui, '
               'multiplié par ${{x}}$, donne ${{y}}$.', 'Différence'),
        erreur('{{x}}', 'Tu as recopié le dénominateur. $\\frac{{{x}}}{{{x}}} = 1$, et $'
               '{{x}} \\times 1$ ne fait pas ${{y}}$.', 'Dénominateur recopié'),
    ])],
    [F4_DEF, '$${{if:s==0|{{x}} \\times \\frac{' + couleur('{{y}}') + '}{{{x}}}|\\frac{'
     + couleur('{{y}}') + '}{{{x}}} \\times {{x}}}} = {{y}}$$'],
    'Rappelle-toi la définition : $\\frac{a}{b}$ est le nombre qui, multiplié par $b$, '
    'donne $a$.',
    ['x!=y', 'y!=2*x'],
)

F4_DEN = variation(
    'Complète l\'égalité.\n\n$${{if:s==0|{{x}} \\times \\frac{{{y}}}{?}|\\frac{{{y}}}{?} '
    '\\times {{x}}}} = {{y}}$$',
    F4_VARS,
    [case('{{x}}', [
        erreur('{{y}}', 'Tu as recopié le numérateur. $\\frac{{{y}}}{{{y}}} = 1$, et $'
               '{{x}} \\times 1$ ne fait pas ${{y}}$.', 'Numérateur recopié'),
    ])],
    [F4_DEF, '$${{if:s==0|{{x}} \\times \\frac{{{y}}}{' + couleur('{{x}}') + '}|\\frac{{{y}} '
     '}{' + couleur('{{x}}') + '} \\times {{x}}}} = {{y}}$$'],
    'Rappelle-toi la définition : $\\frac{a}{b}$ est le nombre qui, multiplié par $b$, '
    'donne $a$.',
    ['x!=y'],
)

V_5_12 = {'x': '5', 'y': '12', 's': '0'}
SPECS_C41 = [
    spec('F4 num : 5 × ?/5 = 12', 0, V_5_12, 'correct', ['12']),
    spec('F4 num : produit (60)', 0, V_5_12, 'incorrect', ['60'],
         'Multiplier par $5$ ce qu\'on divise par $5$ redonne le numérateur : il doit valoir '
         '$12$, pas plus.'),
    spec('F4 num : différence (7)', 0, V_5_12, 'incorrect', ['7'],
         'Ce n\'est pas une addition : la fraction est le nombre qui, multiplié par $5$, donne '
         '$12$.'),
    spec('F4 num : dénominateur recopié (5)', 0, V_5_12, 'incorrect', ['5'],
         'Tu as recopié le dénominateur. $\\frac{5}{5} = 1$, et $5 \\times 1$ ne fait pas $12$.'),
    spec('F4 num : fraction à gauche', 0, {**V_5_12, 's': '1'}, 'correct', ['12']),
    spec('F4 dén : 5 × 12/? = 12', 1, V_5_12, 'correct', ['5']),
    spec('F4 dén : numérateur recopié (12)', 1, V_5_12, 'incorrect', ['12'],
         'Tu as recopié le numérateur. $\\frac{12}{12} = 1$, et $5 \\times 1$ ne fait pas $12$.'),
]


# =============================================================================================
# 5aa1d44c — égalités de fractions (6-132). F5 : un entier écrit en fraction. Noms n, d
# (a, b, c sont partagés).
# =============================================================================================

F5_NUM = variation(
    'Complète l\'égalité.\n\n$${{n}} = \\frac{?}{{{d}}}$$',
    [var('n', '1..9'), var('d', '2..11')],
    [case('{{eval:n*d}}', [
        erreur('{{n}}', '$\\frac{{{n}}}{{{d}}}$ est plus petit que ${{n}}$ : il faut ${{d}}$ '
               'parts de $\\frac{1}{{{d}}}$ pour faire une seule unité.', 'Entier recopié'),
        erreur('{{eval:n+d}}', 'On ne fait pas la somme : compte les parts de '
               '$\\frac{1}{{{d}}}$ dans ${{n}}$ unités.', 'Somme'),
    ])],
    [
        '**Un entier en fraction.** Une unité, c\'est $\\frac{{{d}}}{{{d}}}$ : il y a ${{d}}$ '
        'parts de $\\frac{1}{{{d}}}$. Dans ${{n}}$ unités, il y en a ${{n}} \\times {{d}}$.',
        '$${{n}} = \\frac{' + couleur('{{eval:n*d}}') + '}{{{d}}}$$',
    ],
    'Combien de parts égales à $\\frac{1}{{{d}}}$ y a-t-il dans une unité ? Et dans ${{n}}$ '
    'unités ?',
    ['n*d!=n+d'],
)

F5_DEN = variation(
    'Complète l\'égalité.\n\n$${{n}} = \\frac{{{eval:n*d}}}{?}$$',
    [var('n', '1..9'), var('d', '3..11')],
    [case('{{d}}', [
        erreur('{{eval:n*d-n}}', 'On ne soustrait pas : cherche le nombre qui, multiplié par '
               '${{n}}$, donne ${{eval:n*d}}$.', 'Différence'),
        erreur('{{n}}', '$\\frac{{{eval:n*d}}}{{{n}}}$ vaut ${{d}}$, pas ${{n}}$.',
               'Entier recopié'),
    ])],
    [
        '**Un entier en fraction.** ${{n}} = \\frac{{{n}} \\times d}{d}$ : le numérateur est '
        '${{n}}$ fois le dénominateur. Ici ${{eval:n*d}} = {{n}} \\times {{d}}$.',
        '$${{n}} = \\frac{{{eval:n*d}}}{' + couleur('{{d}}') + '}$$',
    ],
    'Le numérateur est ${{n}}$ fois plus grand que le dénominateur : par quel nombre faut-il '
    'multiplier ${{n}}$ pour obtenir ${{eval:n*d}}$ ?',
    ['d!=n', 'n*(d-1)!=d', 'n*(d-1)!=n'],
)

SPECS_5AA = [
    spec('F5 num : 3 = 15/5', 0, {'n': '3', 'd': '5'}, 'correct', ['15']),
    spec('F5 num : entier recopié (3)', 0, {'n': '3', 'd': '5'}, 'incorrect', ['3'],
         '$\\frac{3}{5}$ est plus petit que $3$ : il faut $5$ parts de $\\frac{1}{5}$ pour faire '
         'une seule unité.'),
    spec('F5 num : somme (8)', 0, {'n': '3', 'd': '5'}, 'incorrect', ['8'],
         'On ne fait pas la somme : compte les parts de $\\frac{1}{5}$ dans $3$ unités.'),
    spec('F5 num : 1 = 7/7', 0, {'n': '1', 'd': '7'}, 'correct', ['7']),
    spec('F5 dén : 4 = 12/3', 1, {'n': '4', 'd': '3'}, 'correct', ['3']),
    spec('F5 dén : différence (8)', 1, {'n': '4', 'd': '3'}, 'incorrect', ['8'],
         'On ne soustrait pas : cherche le nombre qui, multiplié par $4$, donne $12$.'),
    spec('F5 dén : entier recopié (4)', 1, {'n': '4', 'd': '3'}, 'incorrect', ['4'],
         '$\\frac{12}{4}$ vaut $3$, pas $4$.'),
]


# =============================================================================================
# afebbb91 — comparer (6-133). F6 : deux fractions égales, l'une simplifiée, ou un numérateur à
# 1 près : réponse « = » une fois sur deux (w = 1 ou 2 → δ = 0 ; w = 0 → −1 ; w = 3 → +1).
# 6818662d — comparer à 1. F6 : une fraction égale à 1 (n/n) face à c/d plus petite, égale ou
# plus grande que 1 (t = 0, 1, 2).
# =============================================================================================

SIGNE = '{{if:r==0|<|{{if:r==1|=|>}}}}'
CHOIX_SIGNE = '```choix\nmelanger: non\n- $<$\n- $=$\n- $>$\n```'
COTES = [var('s', '0..1'), var('gn', 'eval:(1-s)*a+s*c'), var('gd', 'eval:(1-s)*b+s*d'),
         var('dn', 'eval:(1-s)*c+s*a'), var('dd', 'eval:(1-s)*d+s*b'),
         var('r', 'eval:sign(gn*dd-dn*gd)+1')]
ENONCE_SIGNE = ('Complète avec le signe qui convient.\n\n$$\\frac{{{gn}}}{{{gd}}} \\ldots '
                '\\frac{{{dn}}}{{{dd}}}$$\n\n' + CHOIX_SIGNE)
CONCLUSION = ('$$\\frac{{{gn}}}{{{gd}}} ' + couleur(SIGNE) + ' \\frac{{{dn}}}{{{dd}}}$$')

F6_EGALES = variation(
    ENONCE_SIGNE,
    [var('b', '2..9'), var('a', '1..{{eval:2*b-1}}'), var('k', '2..4'), var('w', '0..3'),
     var('dl', 'eval:floor(w/3)-1+min(w,1)'), var('c', 'eval:k*a+dl'), var('d', 'eval:k*b')]
    + COTES,
    [case('{{r}}')],
    [
        '**Même dénominateur.** On multiplie le numérateur et le dénominateur de '
        '$\\frac{{{a}}}{{{b}}}$ par ${{k}}$ : $\\frac{{{a}}}{{{b}}} = \\frac{{{eval:k*a}} '
        '}{{{d}}}$. On compare alors ${{eval:k*a}}$ et ${{c}}$, deux numérateurs sur le même '
        'dénominateur.',
        CONCLUSION,
    ],
    'Écris les deux fractions avec le même dénominateur, puis compare les numérateurs.',
    ['gcd(a,b)==1', 'mod(a,b)!=0', 'c>=1'],
)

F6_UN = variation(
    ENONCE_SIGNE,
    [var('a', '2..9'), var('d', '2..9'), var('t', '0..2'), var('cl', '1..{{eval:d-1}}'),
     var('ch', '{{eval:d+1}}..{{eval:2*d-1}}'),
     var('c', 'eval:(1-min(t,1))*cl+(1-abs(t-1))*d+max(t-1,0)*ch'), var('b', 'eval:a')]
    + COTES,
    [case('{{r}}')],
    [
        '**Comparer à 1.** $\\frac{{{a}}}{{{a}}} = 1$ : le numérateur est égal au '
        'dénominateur. {{if:t==0|$\\frac{{{c}}}{{{d}}} < 1$ car ${{c}} < {{d}}$.|{{if:t==1|'
        '$\\frac{{{c}}}{{{d}}} = 1$ aussi.|$\\frac{{{c}}}{{{d}}} > 1$ car ${{c}} > {{d}}$.'
        '}}}}',
        CONCLUSION,
    ],
    'Compare chaque fraction à $1$ : regarde si le numérateur est plus petit, égal ou plus grand '
    'que le dénominateur.',
    ['a!=d', 'gcd(c,d)*abs(t-1)<=1'],
)

V_2_3_8_12 = {'b': '3', 'a': '2', 'k': '4', 'w': '1', 'dl': '0', 'c': '8', 'd': '12', 's': '0',
              'gn': '2', 'gd': '3', 'dn': '8', 'dd': '12', 'r': '1'}
V_2_3_9_12 = {**V_2_3_8_12, 'w': '3', 'dl': '1', 'c': '9', 'dn': '9', 'r': '0'}
SPECS_AFE = [
    spec('F6 : 2/3 = 8/12', 0, V_2_3_8_12, 'correct', ['1']),
    spec('F6 : « < » car 2 < 8', 0, V_2_3_8_12, 'incorrect', ['0']),
    spec('F6 : 2/3 < 9/12', 0, V_2_3_9_12, 'correct', ['0']),
    spec('F6 : 2/3 = 9/12 (à 1 près)', 0, V_2_3_9_12, 'incorrect', ['1']),
]

V_5_5_7_7 = {'a': '5', 'd': '7', 't': '1', 'cl': '3', 'ch': '9', 'c': '7', 'b': '5', 's': '0',
             'gn': '5', 'gd': '5', 'dn': '7', 'dd': '7', 'r': '1'}
V_5_5_3_7 = {**V_5_5_7_7, 't': '0', 'c': '3', 'dn': '3', 'r': '2'}
SPECS_681 = [
    spec('F6 : 5/5 = 7/7', 0, V_5_5_7_7, 'correct', ['1']),
    spec('F6 : 5/5 < 7/7 (7 > 5)', 0, V_5_5_7_7, 'incorrect', ['0']),
    spec('F6 : 5/5 > 3/7', 0, V_5_5_3_7, 'correct', ['2']),
    spec('F6 : signe à l\'envers', 0, V_5_5_3_7, 'incorrect', ['0']),
]


# =============================================================================================
# 83c835bb — ranger (6-134). F7 : cinq nombres autour de 1, la liste de l'exemple de réussite
# (1 ; 5/3 ; 7/6 ; 99/100 ; 1 + 1/3). x = a/b < 1 ; 1 ; (q+1)/q = 1 + 1/q ; 1 + 1/w (w < q) ;
# (v+m)/v = 1 + m/v avec m/v > 1/2 (le plus grand, car 1/q et 1/w ≤ 1/3).
# =============================================================================================

F7_VARS = [var('b', '3|4|5|6|8|10|100'), var('a', '{{if:b==100|90|1}}..{{eval:b-1}}'),
           var('q', '4..9'), var('w', '3..{{eval:q-1}}'), var('v', '3..9'),
           var('m', '{{eval:floor(v/2)+1}}..{{eval:v-1}}')]
F7_COND = ['gcd(a,b)==1', 'gcd(m,v)==1']
F7_ETIQ = ['$\\frac{{{a}}}{{{b}}}$', '$1$', '$\\frac{{{eval:q+1}}}{{{q}}}$',
           '$1 + \\frac{1}{{{w}}}$', '$\\frac{{{eval:v+m}}}{{{v}}}$']
F7_STEPS = [
    '**Comparer à 1.** $\\frac{{{a}}}{{{b}}} < 1$ car ${{a}} < {{b}}$. Les trois autres '
    'fractions sont plus grandes que $1$ : on les écrit $1 + \\ldots$ ',
    '$$\\frac{{{eval:q+1}}}{{{q}}} = 1 + \\frac{1}{{{q}}} \\qquad \\frac{{{eval:v+m}}}{ '
    '{{v}}} = 1 + \\frac{{{m}}}{{{v}}}$$',
    '**Comparer ce qui dépasse 1.** $\\frac{1}{{{q}}} < \\frac{1}{{{w}}}$ car ${{q}} > {{w}}$ '
    '(des parts plus petites). Et $\\frac{{{m}}}{{{v}}} > \\frac{1}{2}$ car ${{m}}$ dépasse '
    'la moitié de ${{v}}$, alors que $\\frac{1}{{{q}}}$ et $\\frac{1}{{{w}}}$ sont plus '
    'petits que $\\frac{1}{2}$.',
]


def f7(signe, etiquettes, conclusion):
    return variation(
        'Range ces nombres dans l\'ordre ' + ('croissant' if signe == '<' else 'décroissant')
        + '.\n\n```ranger\nsigne: ' + signe + '\n' + '\n'.join('- ' + e for e in etiquettes)
        + '\n```',
        F7_VARS, None,
        F7_STEPS + ['$$' + couleur(conclusion) + '$$'],
        'Compare d\'abord chaque nombre à $1$, puis, pour ceux qui dépassent $1$, compare ce qui '
        'dépasse.',
        F7_COND,
    )


F7_C = f7('<', F7_ETIQ, ' < '.join(e.strip('$') for e in F7_ETIQ))
F7_D = f7('>', F7_ETIQ[::-1], ' > '.join(e.strip('$') for e in F7_ETIQ[::-1]))

V_F7 = {'b': '100', 'a': '99', 'q': '6', 'w': '3', 'v': '3', 'm': '2'}
# Réponses : positions affichées, lues par ranger-attendus.ts sous V_F7 (mêmes pour les deux)
RANG = ['4', '0', '1', '2', '3']
SPECS_83C = [
    spec('F7 croissant : 99/100 < 1 < 7/6 < 1 + 1/3 < 5/3', 0, V_F7, 'correct', RANG),
    spec('F7 croissant : ordre décroissant', 0, V_F7, 'incorrect', RANG[::-1]),
    spec('F7 décroissant : 5/3 > 1 + 1/3 > 7/6 > 1 > 99/100', 1, V_F7, 'correct', RANG),
    spec('F7 décroissant : ordre croissant', 1, V_F7, 'incorrect', RANG[::-1]),
]


# =============================================================================================
# 58bbee5d — additionner (6-135). F8 : entier plus fraction, puis quatre segments bout à bout.
# Réponse en une seule fraction (forme exigée).
# =============================================================================================

F8_ENTIER = variation(
    'Calcule. Donne le résultat sous la forme d\'une seule fraction.\n\n$${{n}} + '
    '\\frac{{{a}}}{{{b}}} = ?$$',
    [var('n', '1..3'), var('b', '2..5'), var('a', '1..{{eval:b-1}}')],
    [case(fr('{{eval:n*b+a}}', '{{b}}'), [
        erreur(fr('{{eval:n+a}}', '{{b}}'),
               '${{n}}$, ce n\'est pas ${{n}}$ {{if:b==2|demis|{{if:b==3|tiers|{{if:b==4|quarts|'
               'cinquièmes}}}}}} : écris d\'abord ${{n}}$ avec le dénominateur ${{b}}$.',
               'Entier ajouté au numérateur'),
        erreur(fr('{{eval:n+a}}', '{{eval:b+1}}'),
               'On n\'additionne pas les dénominateurs : écris ${{n}}$ avec le dénominateur '
               '${{b}}$.', 'Dénominateurs additionnés'),
    ], FRACTION)],
    [
        '**Un entier en fraction.** ${{n}} = \\frac{{{eval:n*b}}}{{{b}}}$ (dans une unité, il '
        'y a ${{b}}$ parts de $\\frac{1}{{{b}}}$).',
        '$${{n}} + \\frac{{{a}}}{{{b}}} = \\frac{{{eval:n*b}}}{{{b}}} + \\frac{{{a}}}{ '
        '{{b}}} = ' + couleur(fr('{{eval:n*b+a}}', '{{b}}')) + '$$',
    ],
    'Écris d\'abord ${{n}}$ sous la forme d\'une fraction de dénominateur ${{b}}$.',
    ['gcd(a,b)==1'],
)

F8_SEGMENTS = variation(
    'On met bout à bout quatre segments, de longueurs $\\frac{{{a}}}{{{d}}}~\\unit{m}$, '
    '$\\frac{{{b}}}{{{d}}}~\\unit{m}$, $\\frac{{{c}}}{{{d}}}~\\unit{m}$ et '
    '$\\frac{{{f}}}{{{d}}}~\\unit{m}$.\n\nQuelle est la longueur du segment obtenu ? Donne-la '
    'sous la forme d\'une seule fraction.\n\n$$?~\\text{m}$$',
    [var('d', '5..8'), var('a', '1..{{eval:d-1}}'), var('b', '1..{{eval:d-1}}'),
     var('c', '1..{{eval:d-1}}'), var('f', '1..{{eval:d-1}}'), var('S', 'eval:a+b+c+f')],
    [case(fr('{{S}}', '{{d}}'), [
        erreur(fr('{{S}}', '{{eval:4*d}}'),
               'On n\'additionne pas les dénominateurs : ce sont des {{if:d==5|cinquièmes|'
               '{{if:d==6|sixièmes|{{if:d==7|septièmes|huitièmes}}}}}} de mètre, on compte '
               'combien il y en a en tout.', 'Dénominateurs additionnés'),
    ], FRACTION)],
    [
        '**Même dénominateur.** Les quatre longueurs sont des {{if:d==5|cinquièmes|{{if:d==6|'
        'sixièmes|{{if:d==7|septièmes|huitièmes}}}}}} de mètre : on additionne les numérateurs, '
        'le dénominateur reste ${{d}}$.',
        '$$\\frac{{{a}}}{{{d}}} + \\frac{{{b}}}{{{d}}} + \\frac{{{c}}}{{{d}}} + '
        '\\frac{{{f}}}{{{d}}} = \\frac{{{a}} + {{b}} + {{c}} + {{f}}}{{{d}}} = '
        + couleur(fr('{{S}}', '{{d}}')) + '$$',
        'Le segment obtenu mesure $' + fr('{{S}}', '{{d}}') + '~\\unit{m}$.',
    ],
    'Les quatre fractions ont le même dénominateur : que devient-il quand on les additionne ?',
    ['gcd(S,d)==1'],
)

V_F8 = {'n': '2', 'b': '3', 'a': '1'}
V_SEG = {'d': '7', 'a': '2', 'b': '3', 'c': '1', 'f': '5', 'S': '11'}
SPECS_58B = [
    spec('F8 : 2 + 1/3 = 7/3', 0, V_F8, 'correct', ['\\frac{7}{3}']),
    spec('F8 : entier au numérateur (3/3)', 0, V_F8, 'incorrect', ['\\frac{3}{3}'],
         '$2$, ce n\'est pas $2$ tiers : écris d\'abord $2$ avec le dénominateur $3$.'),
    spec('F8 : dénominateurs additionnés (3/4)', 0, V_F8, 'incorrect', ['\\frac{3}{4}'],
         'On n\'additionne pas les dénominateurs : écris $2$ avec le dénominateur $3$.'),
    spec('F8 : somme recopiée', 0, V_F8, 'bad_form', ['2 + \\frac{1}{3}'], violations=['form']),
    spec('F8 segments : 11/7', 1, V_SEG, 'correct', ['\\frac{11}{7}']),
    spec('F8 segments : dénominateurs additionnés (11/28)', 1, V_SEG, 'incorrect',
         ['\\frac{11}{28}'],
         'On n\'additionne pas les dénominateurs : ce sont des septièmes de mètre, on compte '
         'combien il y en a en tout.'),
]


# =============================================================================================
# 0be55013 — appliquer une fraction (6-131). F9 : quantité qui n'est pas un multiple du
# dénominateur (résultat décimal, b ∈ {2, 4, 5}), puis une fraction d'heure en minutes.
# =============================================================================================

F9_DEC = variation(
    'Calcule $\\frac{{{a}}}{{{b}}}$ de ${{n}}$. Donne le résultat en écriture décimale.\n\n$\\frac{{{a}}}{{{b}}}$ de ${{n}}$ est '
    'égal à $?$.',
    [var('b', '2|4|5'), var('a', '1..{{eval:2*b-1}}'), var('n', '3..30')],
    [case('{{eval:a*n/b;d}}', [
        erreur('{{eval:a*n}}', 'Tu as multiplié par ${{a}}$ sans diviser par ${{b}}$.',
               'Division oubliée'),
        erreur('{{eval:n/b;d}}', 'Tu as pris $\\frac{1}{{{b}}}$ de ${{n}}$ : il en faut '
               '${{a}}$ fois plus.', 'Multiplication oubliée'),
    ])],
    [
        '**Fraction d\'une quantité.** $\\frac{{{a}}}{{{b}}}$ de ${{n}}$, c\'est '
        '$\\frac{{{a}}}{{{b}}} \\times {{n}}$ : on multiplie par ${{a}}$ et on divise par '
        '${{b}}$.',
        '$$\\frac{{{a}}}{{{b}}} \\times {{n}} = \\frac{{{a}} \\times {{n}}}{{{b}}} = '
        '\\frac{{{eval:a*n}}}{{{b}}} = ' + couleur('{{solution}}') + '$$',
    ],
    'Multiplie la fraction par ${{n}}$ : la division par ${{b}}$ peut tomber sur un nombre à '
    'virgule.',
    ['gcd(a,b)==1', 'a!=b', 'mod(n,b)!=0'],
)

F9_HEURE = variation(
    'Combien de minutes y a-t-il dans $\\frac{{{a}}}{{{b}}}$ d\'heure ?\n\n'
    '$$\\frac{{{a}}}{{{b}}}~\\unit{h} = ?~\\text{min}$$',
    [var('b', '2|3|4|6'), var('a', '1..{{eval:2*b-1}}')],
    [case('{{eval:60*a/b}}', [
        erreur('{{eval:10*a+b}}', 'Une fraction d\'heure ne se lit pas comme des minutes : '
               'calcule $\\frac{{{a}}}{{{b}}}$ de $60~\\unit{min}$.', 'Chiffres recopiés'),
        erreur('{{eval:60/b}}', 'Tu as pris $\\frac{1}{{{b}}}$ d\'heure : il en faut ${{a}}$.',
               'Multiplication oubliée'),
    ])],
    [
        '**Fraction d\'une durée.** $1~\\unit{h} = 60~\\unit{min}$, donc $\\frac{1}{{{b}}}~'
        '\\unit{h} = 60 \\div {{b}} = {{eval:60/b}}~\\unit{min}$.',
        '$$\\frac{{{a}}}{{{b}}}~\\unit{h} = {{a}} \\times {{eval:60/b}}~\\unit{min} = '
        + couleur('{{solution}}~\\unit{min}') + '$$',
    ],
    'Une heure, c\'est $60$ minutes : commence par trouver $\\frac{1}{{{b}}}$ d\'heure.',
    ['gcd(a,b)==1', 'a!=b', '10*a+b!=60*a/b'],
)

SPECS_0BE = [
    spec('F9 : 3/4 de 18 = 13,5', 0, {'b': '4', 'a': '3', 'n': '18'}, 'correct', ['13{,}5']),
    spec('F9 : 5/4 de 3 = 3,75', 0, {'b': '4', 'a': '5', 'n': '3'}, 'correct', ['3{,}75']),
    spec('F9 : division oubliée (54)', 0, {'b': '4', 'a': '3', 'n': '18'}, 'incorrect', ['54'],
         'Tu as multiplié par $3$ sans diviser par $4$.'),
    spec('F9 : multiplication oubliée (4,5)', 0, {'b': '4', 'a': '3', 'n': '18'}, 'incorrect',
         ['4{,}5'], 'Tu as pris $\\frac{1}{4}$ de $18$ : il en faut $3$ fois plus.'),
    spec('F9 heure : 3/4 h = 45 min', 1, {'b': '4', 'a': '3'}, 'correct', ['45']),
    spec('F9 heure : 5/4 h = 75 min', 1, {'b': '4', 'a': '5'}, 'correct', ['75']),
    spec('F9 heure : 3/4 h lu 34 min', 1, {'b': '4', 'a': '3'}, 'incorrect', ['34'],
         'Une fraction d\'heure ne se lit pas comme des minutes : calcule $\\frac{3}{4}$ de '
         '$60~\\unit{min}$.'),
    spec('F9 heure : 1/4 d\'heure seulement (15)', 1, {'b': '4', 'a': '3'}, 'incorrect', ['15'],
         'Tu as pris $\\frac{1}{4}$ d\'heure : il en faut $3$.'),
]


# =============================================================================================
# 5cd25c2b — problèmes de fractions (6-137). F10 : une part, la fraction qui reste, ce qui reste
# (trois cases) ; puis deux parts a/d et b/(2d), la fraction qui reste.
# =============================================================================================

F10_PART = ('{{if:p==1|' + fraction_en_mots('q', 'Le') + '|Les $\\frac{{{p}}}{{{q}}}$}}')

F10_TROIS = variation(
    'Un collège compte ${{N}}$ élèves. ' + F10_PART + ' des élèves viennent en bus, les autres '
    'viennent à pied.\n\n1. Combien d\'élèves viennent en bus ? $?$ élèves.\n'
    '2. Quelle fraction des élèves vient à pied ? $?$\n'
    '3. Combien d\'élèves viennent à pied ? $?$ élèves.',
    [var('q', '2..12'), var('p', '1..{{eval:q-1}}'), var('k', '15..99'), var('N', 'eval:q*k')],
    [
        case('{{eval:p*k}}', [
            erreur('{{k}}', 'Tu as calculé $\\frac{1}{{{q}}}$ des élèves : il en faut ${{p}}$ '
                   'fois plus.', 'Multiplication oubliée'),
        ]),
        case(fr('{{eval:(q-p)/gcd(q-p,q)}}', '{{eval:q/gcd(q-p,q)}}'), [
            erreur(fr('{{p}}', '{{q}}'), 'C\'est la fraction des élèves qui viennent en bus : '
                   'tous les élèves, c\'est $\\frac{{{q}}}{{{q}}}$.', 'Fraction de la part'),
        ]),
        case('{{eval:N-p*k}}', [
            erreur('{{eval:p*k}}', 'C\'est le nombre d\'élèves qui viennent en bus : enlève-les '
                   'du total.', 'Part recopiée'),
        ]),
    ],
    [
        '**Fraction d\'une quantité.** $\\frac{{{p}}}{{{q}}}$ de ${{N}}$ : ${{N}} \\div {{q}} '
        '= {{k}}$, puis ${{k}} \\times {{p}} = {{eval:p*k}}$ : $' + couleur('{{eval:p*k}}')
        + '$ élèves viennent en bus.',
        '**Ce qui reste.** Tous les élèves, c\'est $\\frac{{{q}}}{{{q}}}$ : $\\frac{{{q}}}{ '
        '{{q}}} - \\frac{{{p}}}{{{q}}} = \\frac{{{eval:q-p}}}{{{q}}}${{if:gcd(q-p,q)>1| '
        '$= ' + fr('{{eval:(q-p)/gcd(q-p,q)}}', '{{eval:q/gcd(q-p,q)}}') + '$|}} des élèves '
        'viennent à pied.',
        '$${{N}} - {{eval:p*k}} = ' + couleur('{{eval:N-p*k}}') + '$$',
    ],
    'Commence par $\\frac{1}{{{q}}}$ des élèves : partage ${{N}}$ en ${{q}}$ parts égales.',
    ['gcd(p,q)==1', 'N>=150', 'N<=990', 'mod(N,10)==0'],
)

F10_RESTE = variation(
    'Dans un jardin, Nora plante des légumes sur les $\\frac{{{a}}}{{{d}}}$ de la surface et '
    'des fleurs sur les $\\frac{{{b}}}{{{eval:2*d}}}$. Le reste est en gazon.\n\n'
    'Quelle fraction du jardin est en gazon ?\n\n$$?$$',
    [var('d', '2..6'), var('a', '1..{{eval:d-1}}'), var('b', '1..{{eval:2*d-1}}'),
     var('R', 'eval:2*d-2*a-b'), var('D', 'eval:2*d')],
    [case(fr('{{eval:R/gcd(R,D)}}', '{{eval:D/gcd(R,D)}}'), [
        erreur(fr('{{eval:2*a+b}}', '{{D}}'), 'C\'est la fraction plantée : le gazon, c\'est ce '
               'qui reste du jardin entier.', 'Fraction plantée'),
        erreur(fr('{{eval:3*d-a-b}}', '{{eval:3*d}}'), 'On n\'additionne pas les dénominateurs : '
               'écris d\'abord $\\frac{{{a}}}{{{d}}}$ avec le dénominateur ${{D}}$.',
               'Dénominateurs additionnés'),
    ])],
    [
        '**Même dénominateur.** $\\frac{{{a}}}{{{d}}} = \\frac{{{eval:2*a}}}{{{D}}}$ : '
        'légumes et fleurs occupent $\\frac{{{eval:2*a}}}{{{D}}} + \\frac{{{b}}}{{{D}}} = '
        '\\frac{{{eval:2*a+b}}}{{{D}}}$ du jardin.',
        'Le jardin entier, c\'est $\\frac{{{D}}}{{{D}}}$. Il reste :',
        '$$\\frac{{{D}}}{{{D}}} - \\frac{{{eval:2*a+b}}}{{{D}}} = {{if:gcd(R,D)>1|'
        '\\frac{{{R}}}{{{D}}} = |}}' + couleur('{{solution}}') + '$$',
    ],
    'Écris les deux fractions avec le dénominateur ${{D}}$ ; le jardin entier, c\'est '
    '$\\frac{{{D}}}{{{D}}}$.',
    ['gcd(a,d)==1', 'gcd(b,D)==1', 'R>=1', '(3*d-a-b)*D!=R*3*d', '(2*a+b)!=R'],
)

V_F10 = {'q': '4', 'p': '1', 'k': '60', 'N': '240'}
V_F10b = {'q': '5', 'p': '2', 'k': '30', 'N': '150'}
V_JARDIN = {'d': '4', 'a': '1', 'b': '3', 'R': '3', 'D': '8'}
SPECS_5CD = [
    spec('F10 : le quart de 240', 0, V_F10, 'correct', ['60', '\\frac{3}{4}', '180']),
    spec('F10 : 6/8 non simplifiée, remarquée', 0, V_F10, 'unoptimal_form', ['60', '\\frac{6}{8}', '180'],
         violations=['reducedFractions']),
    spec('F10 : fraction de la part (1/4)', 0, V_F10, 'incorrect', ['60', '\\frac{1}{4}', '180'],
         'C\'est la fraction des élèves qui viennent en bus : tous les élèves, c\'est '
         '$\\frac{4}{4}$.'),
    spec('F10 : 2/5 de 150', 0, V_F10b, 'correct', ['60', '\\frac{3}{5}', '90']),
    spec('F10 : 1/5 seulement (30)', 0, V_F10b, 'incorrect', ['30', '\\frac{3}{5}', '90'],
         'Tu as calculé $\\frac{1}{5}$ des élèves : il en faut $2$ fois plus.'),
    spec('F10 : part recopiée (60)', 0, V_F10b, 'incorrect', ['60', '\\frac{3}{5}', '60'],
         'C\'est le nombre d\'élèves qui viennent en bus : enlève-les du total.'),
    spec('F10 jardin : 1/4 + 3/8, reste 3/8', 1, V_JARDIN, 'correct', ['\\frac{3}{8}']),
    spec('F10 jardin : fraction plantée (5/8)', 1, V_JARDIN, 'incorrect', ['\\frac{5}{8}'],
         'C\'est la fraction plantée : le gazon, c\'est ce qui reste du jardin entier.'),
    spec('F10 jardin : dénominateurs additionnés (8/12)', 1, V_JARDIN, 'incorrect',
         ['\\frac{8}{12}'],
         'On n\'additionne pas les dénominateurs : écris d\'abord $\\frac{1}{4}$ avec le '
         'dénominateur $8$.'),
]


# =============================================================================================
# f9e9637c — sens d'un pourcentage (6-139). F11 : p % de sucre dans 25, 50, 200 ou 300 g (p
# multiple de 4) ; puis le complément à 100 %.
# =============================================================================================

F11_SUCRE = variation(
    'Un yaourt aux fruits contient ${{p}}\\,\\%$ de sucre.\n\nCombien de grammes de sucre y a-t-il '
    'dans ${{M}}~\\unit{g}$ de ce yaourt ?\n\n$$?~\\text{g}$$',
    [var('p', '4|8|12|16|20|24|28|32|36|40'), var('M', '25|50|200|300')],
    [case('{{eval:p*M/100}}', [
        erreur('{{p}}', '${{p}}\\,\\%$, c\'est ${{p}}~\\unit{g}$ de sucre dans $100~\\unit{g}$ '
               'de yaourt, pas dans ${{M}}~\\unit{g}$.', 'Pourcentage recopié'),
        erreur('{{eval:p*M}}', '${{p}}\\,\\%$, c\'est ${{p}}$ sur $100$ : il faut aussi diviser '
               'par $100$.', 'Division par 100 oubliée'),
    ])],
    [
        '**Pourcentage.** ${{p}}\\,\\%$ de sucre : ${{p}}~\\unit{g}$ de sucre dans $100~\\unit{g}$ '
        'de yaourt.',
        '{{if:M==25|$25~\\unit{g}$, c\'est le quart de $100~\\unit{g}$ : ${{p}} \\div 4|'
        '{{if:M==50|$50~\\unit{g}$, c\'est la moitié de $100~\\unit{g}$ : ${{p}} \\div 2|'
        '${{M}}~\\unit{g}$, c\'est ${{eval:M/100}}$ fois $100~\\unit{g}$ : ${{p}} \\times '
        '{{eval:M/100}}}}}} = ' + couleur('{{solution}}') + '$, soit ${{solution}}~\\unit{g}$ de '
        'sucre.',
    ],
    '${{p}}\\,\\%$ de sucre, c\'est ${{p}}~\\unit{g}$ dans $100~\\unit{g}$ : combien de fois '
    '$100~\\unit{g}$ y a-t-il dans ${{M}}~\\unit{g}$ ?',
)

F11_RESTE = variation(
    'Dans un collège, ${{a}}\\,\\%$ des élèves viennent en bus, ${{b}}\\,\\%$ viennent à pied et '
    'les autres viennent en voiture.\n\nQuel pourcentage des élèves viennent en voiture ?\n\n'
    '$$?\\,\\%$$',
    [var('ka', '1..12'), var('kb', '1..12'), var('a', 'eval:5*ka'), var('b', 'eval:5*kb')],
    [case('{{eval:100-a-b}}', [
        erreur('{{eval:a+b}}', '${{eval:a+b}}\\,\\%$, ce sont les élèves qui viennent en bus ou à '
               'pied : tous les élèves, c\'est $100\\,\\%$.', 'Somme des deux parts'),
        erreur('{{eval:100-a}}', 'Il faut aussi enlever les ${{b}}\\,\\%$ qui viennent à pied.',
               'Une part oubliée'),
        erreur('{{eval:100-b}}', 'Il faut aussi enlever les ${{a}}\\,\\%$ qui viennent en bus.',
               'Une part oubliée'),
    ])],
    [
        '**Pourcentage.** Tous les élèves, c\'est $100\\,\\%$. Bus et pied : ${{a}}\\,\\% + {{b}}'
        '\\,\\% = {{eval:a+b}}\\,\\%$.',
        '$$100 - {{eval:a+b}} = ' + couleur('{{solution}}') + '$$',
        '$' + couleur('{{solution}}\\,\\%') + '$ des élèves viennent en voiture.',
    ],
    'Tous les élèves du collège, c\'est $100\\,\\%$.',
    ['a!=b', 'a+b<100', 'a+b!=50', '2*a+b!=100', 'a+2*b!=100'],
)

SPECS_F9E = [
    spec('F11 : 12 % de 200 g = 24 g', 0, {'p': '12', 'M': '200'}, 'correct', ['24']),
    spec('F11 : 12 % de 25 g = 3 g', 0, {'p': '12', 'M': '25'}, 'correct', ['3']),
    spec('F11 : pourcentage recopié (12)', 0, {'p': '12', 'M': '200'}, 'incorrect', ['12'],
         '$12\\,\\%$, c\'est $12~\\unit{g}$ de sucre dans $100~\\unit{g}$ de yaourt, pas dans '
         '$200~\\unit{g}$.'),
    spec('F11 : division oubliée (2400)', 0, {'p': '12', 'M': '200'}, 'incorrect', ['2400'],
         '$12\\,\\%$, c\'est $12$ sur $100$ : il faut aussi diviser par $100$.'),
    spec('F11 reste : 35 % et 40 % → 25 %', 1, {'ka': '7', 'kb': '8', 'a': '35', 'b': '40'}, 'correct', ['25']),
    spec('F11 reste : somme (75)', 1, {'ka': '7', 'kb': '8', 'a': '35', 'b': '40'}, 'incorrect', ['75'],
         '$75\\,\\%$, ce sont les élèves qui viennent en bus ou à pied : tous les élèves, '
         'c\'est $100\\,\\%$.'),
    spec('F11 reste : bus oublié (60)', 1, {'ka': '7', 'kb': '8', 'a': '35', 'b': '40'}, 'incorrect', ['60'],
         'Il faut aussi enlever les $35\\,\\%$ qui viennent en bus.'),
    spec('F11 reste : pied oublié (65)', 1, {'ka': '7', 'kb': '8', 'a': '35', 'b': '40'}, 'incorrect', ['65'],
         'Il faut aussi enlever les $40\\,\\%$ qui viennent à pied.'),
]


# =============================================================================================
# 5c8a6da6 — proportion en pourcentage (6-140). F12 : un tout de 1 000, partie multiple de 10.
# =============================================================================================

F12_MILLE = variation(
    '{{if:c==0|Sur $1\\,000$ graines semées, ${{a}}$ ont germé.|Une enquête a interrogé '
    '$1\\,000$ personnes ; ${{a}}$ d\'entre elles ont un chien.}}\n\n{{if:c==0|Quel pourcentage '
    'des graines ont germé ?|Quel pourcentage des personnes interrogées ont un chien ?}}\n\n'
    '$$?\\,\\%$$',
    [var('c', '0..1'), var('p', '1..99'), var('a', 'eval:10*p')],
    [case('{{p}}', [
        erreur('{{a}}', '${{a}}$ est la partie : le pourcentage dit combien il y en a sur '
               '$100$, pas sur $1\\,000$.', 'Partie recopiée'),
        erreur('{{eval:p/100;d}}', 'Le pourcentage se lit sur $100$ : $\\frac{{{p}}}{100}$, '
               'c\'est ${{p}}\\,\\%$.', 'Proportion en écriture décimale'),
        erreur('{{eval:p/10;d}}', 'On divise $1\\,000$ par $10$ pour arriver à $100$ : divise '
               'aussi ${{a}}$ par $10$, pas par $100$.', 'Mauvais diviseur'),
    ])],
    [
        '**Proportion en pourcentage.** On écrit la proportion (la partie sur le tout), puis la '
        'fraction égale de dénominateur $100$.',
        '$$\\frac{{{a}}}{1\\,000} = \\frac{{{a}} \\div 10}{1\\,000 \\div 10} = '
        '\\frac{{{p}}}{100}$$',
        '$' + couleur('{{solution}}\\,\\%') + '$ {{if:c==0|des graines ont germé|des personnes '
        'interrogées ont un chien}}.',
    ],
    'Écris la fraction partie sur tout, puis cherche la fraction égale de dénominateur $100$.',
)

V_F12 = {'c': '0', 'p': '37', 'a': '370'}
SPECS_5C8 = [
    spec('F12 : 370 sur 1 000 = 37 %', 0, V_F12, 'correct', ['37']),
    spec('F12 : partie recopiée (370)', 0, V_F12, 'incorrect', ['370'],
         '$370$ est la partie : le pourcentage dit combien il y en a sur $100$, pas sur '
         '$1\\,000$.'),
    spec('F12 : écriture décimale (0,37)', 0, V_F12, 'incorrect', ['0{,}37'],
         'Le pourcentage se lit sur $100$ : $\\frac{37}{100}$, c\'est $37\\,\\%$.'),
    spec('F12 : mauvais diviseur (3,7)', 0, V_F12, 'incorrect', ['3{,}7'],
         'On divise $1\\,000$ par $10$ pour arriver à $100$ : divise aussi $370$ par $10$, pas '
         'par $100$.'),
]


ajouter('93147367', [F1_HUIT, F1_CENT], SPECS_931)
ajouter('000368e1', [F2_NUM, F2_DEN], SPECS_000)
ajouter('6fdcdda1', [F3_MOTS, F3_SIGNE], SPECS_6FD)
ajouter('c415d81d', [F4_NUM, F4_DEN], SPECS_C41)
ajouter('5aa1d44c', [F5_NUM, F5_DEN], SPECS_5AA)
ajouter('afebbb91', [F6_EGALES], SPECS_AFE)
ajouter('6818662d', [F6_UN], SPECS_681)
ajouter('83c835bb', [F7_C, F7_D], SPECS_83C)
ajouter('58bbee5d', [F8_ENTIER, F8_SEGMENTS], SPECS_58B)
ajouter('0be55013', [F9_DEC, F9_HEURE], SPECS_0BE)
ajouter('5cd25c2b', [F10_TROIS, F10_RESTE], SPECS_5CD)
ajouter('f9e9637c', [F11_SUCRE, F11_RESTE], SPECS_F9E)
ajouter('5c8a6da6', [F12_MILLE], SPECS_5C8)
