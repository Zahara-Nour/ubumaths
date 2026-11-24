"""Ajoute les variations validées aux 11 modèles publiés exportés de prod dans
scripts/questions/idees-tle-derivation-publies/ (chantier idees-tle-derivation).

Phase 0 validée par David le 2026-11-23 (fiches docs/archive/wip/idees-tle-derivation/idees-tle-derivation-fiches.md) :
F1 (50feeefd), F2 (f52b93c4), F8 (e3e19d28), F9 (225c8682), F10 (cfd13223), F12 c et F13
(37ce7759), F14 (98f9d4b2), F15 (eeb72d3a), F16 (08f9ad7b), F17 (c4775a3a), F18 (e814175b, Q2 :
sens de l'inégalité écrit, une case). Les variations s'ajoutent À LA FIN (les réponses des élèves
gardent l'indice de leur variation) ; la migration de contenu est générée par
scripts/questions/migration-contenu.ts.

Le script repart du contenu de prod (variations et specs d'origine, comptées dans ORIGINE) :
le relancer réécrit les ajouts sans les doubler. Variable `x` = 'x|x' : `{{eval:…}}` garde x en
lettre. ⛔ Jamais de variable `e` (Euler).

Usage : python3 docs/wip/questions/idees-tle-derivation-publies.py scripts/questions/idees-tle-derivation-publies
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
X = {'name': 'x', 'expression': 'x|x'}

# id court → (variations, specs) d'origine en prod (export du 2026-11-23)
ORIGINE = {'50feeefd': (5, 18), 'f52b93c4': (4, 13), 'e3e19d28': (1, 3), '225c8682': (1, 3),
           'cfd13223': (3, 12), '37ce7759': (1, 4), '98f9d4b2': (1, 3), 'eeb72d3a': (3, 12),
           '08f9ad7b': (3, 13), 'c4775a3a': (4, 18), 'e814175b': (4, 10)}


def spec(desc, vi, variables_, status, answers, message=None, violations=None):
    expected = {'status': status}
    if violations:
        expected['constraintViolations'] = violations
    if message is not None:
        expected['expectedErrorMessage'] = message
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': expected, 'answers': answers}


def bloc(nom, *lignes):
    return '```' + nom + '\n' + '\n'.join(lignes) + '\n```'


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def case(attendue, erreurs=None, kind=None):
    c = {'expectedAnswer': attendue}
    if kind == 'intervalles':
        c['answerKind'] = 'intervalles'
        c['openableBounds'] = True
    if erreurs:
        c['expectedErrors'] = erreurs
    return c


def variation(statement, variables, blanks, steps, hint, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': blanks, 'correction': {'steps': steps}, 'hint': hint}


def coef(v):
    """Coefficient devant une lettre : 1 → rien, −1 → −."""
    return '{{if:' + v + '==1||{{if:' + v + '==-1|-|{{' + v + '}}}}}}'


def item(contenu):
    return '- ' + contenu.replace('\n', '\n  ')


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
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'{court} : {nv} + {len(variations)} variations, {ns} + {len(specs)} specs')


# Intervalles écrits en LaTeX dans les corrigés
def ferme(a, b):
    return '\\left[' + a + '\\,;' + b + '\\right]'


# =============================================================================================
# 50feeefd — TSPE-413. F1 a : e^(ax² + bx + c) ; F1 b : (ax + b)e^(mx), forme factorisée (le
# modèle a `form: warn` : une forme développée vaut la moitié).
# =============================================================================================

EXP_F1 = '{{eval:a*x^2+b*x+c}}'
F1_A = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=e^{' + EXP_F1 + '}$.\n\n'
    'Détermine sa fonction dérivée.\n\n$f\'(x)=?$',
    [X, var('a', '1..3;±'), var('b', '1..5;±'), var('c', '-5..5')],
    [case('\\left({{eval:2*a*x+b}}\\right)e^{' + EXP_F1 + '}', [
        erreur('e^{' + EXP_F1 + '}',
               'Tu as oublié de multiplier par $u\'(x)$ : $(e^{u})\'=u\'e^{u}$.', '(eᵘ)′ = eᵘ'),
        erreur('e^{ {{eval:2*a*x+b}} }',
               'La dérivée ne se calcule pas dans l\'exposant : $(e^{u})\'=u\'e^{u}$, l\'exposant '
               'reste $u(x)$.', 'Exposant dérivé'),
        erreur('{{eval:2*a*x+b}}',
               'Tu n\'as gardé que $u\'(x)$ : $(e^{u})\'=u\'e^{u}$, le facteur $e^{u}$ reste.',
               'eᵘ oublié'),
    ])],
    [
        '$f=e^{u}$ avec $u(x)=' + EXP_F1 + '$, donc $f\'=u\'e^{u}$.',
        '$u\'(x)={{eval:2*a*x+b}}$, d\'où $f\'(x)=' + PRIMAIRE + '{\\left({{eval:2*a*x+b}}\\right)'
        'e^{' + EXP_F1 + '} }$.',
    ],
    'Pose $u(x)$ égal à l\'exposant, calcule $u\'(x)$, puis applique la formule de la dérivée de '
    '$e^{u}$.',
)

# (ax + b)e^(mx) : f′(x) = (amx + a + bm)e^(mx)
F1_B = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=\\left({{eval:a*x+b}}\\right)e^{'
    + coef('m') + 'x}$.\n\nDétermine sa fonction dérivée, sous forme factorisée.\n\n$f\'(x)=?$',
    [X, var('a', '1..5;±'), var('b', '1..5;±'), var('m', '-3|-2|-1|2|3')],
    [case('\\left({{eval:a*m*x+a+b*m}}\\right)e^{' + coef('m') + 'x}', [
        erreur('{{eval:a*m}}e^{' + coef('m') + 'x}',
               'La dérivée d\'un produit n\'est pas le produit des dérivées : $(uv)\'=u\'v+uv\'$.',
               'Produit des dérivées'),
        erreur('\\left({{eval:a*x+a+b}}\\right)e^{' + coef('m') + 'x}',
               'La dérivée de $e^{' + coef('m') + 'x}$ est ${{m}}e^{' + coef('m') + 'x}$, pas '
               '$e^{' + coef('m') + 'x}$.', 'Dérivée de e^(mx)'),
        erreur('{{a}}e^{' + coef('m') + 'x}',
               'Tu n\'as dérivé que le premier facteur : $(uv)\'=u\'v+uv\'$.', 'uv′ oublié'),
    ])],
    [
        '$f=uv$ avec $u(x)={{eval:a*x+b}}$, $u\'(x)={{a}}$, $v(x)=e^{' + coef('m') + 'x}$, '
        '$v\'(x)={{m}}e^{' + coef('m') + 'x}$.',
        '$f\'(x)={{a}}e^{' + coef('m') + 'x}+\\left({{eval:a*x+b}}\\right)\\times{{m;()}}e^{'
        + coef('m') + 'x}=\\left({{a}}+{{eval:m*(a*x+b)}}\\right)e^{' + coef('m') + 'x}$.',
        'Donc $f\'(x)=' + PRIMAIRE + '{\\left({{eval:a*m*x+a+b*m}}\\right)e^{' + coef('m')
        + 'x} }$.',
    ],
    'Dérive comme un produit $uv$ ; la dérivée de $e^{' + coef('m') + 'x}$ fait sortir le '
    'coefficient ${{m}}$. Mets ensuite $e^{' + coef('m') + 'x}$ en facteur.',

)

V1A = {'a': '2', 'b': '-3', 'c': '1'}
V1B = {'a': '2', 'b': '1', 'm': '3'}
SPECS_50 = [
    spec('F1a : e^(2x² − 3x + 1)', 0, V1A, 'correct', ['(4x-3)e^{2x^2-3x+1}']),
    spec('F1a : facteur après', 0, V1A, 'correct', ['e^{2x^2-3x+1}(4x-3)']),
    spec('F1a : (eᵘ)′ = eᵘ', 0, V1A, 'incorrect', ['e^{2x^2-3x+1}'],
         'Tu as oublié de multiplier par $u\'\\left( x \\right)$ : $(e^{u})\'=u\'e^{u}$.'),
    spec('F1a : exposant dérivé', 0, V1A, 'incorrect', ['e^{4x-3}']),
    spec('F1a : eᵘ oublié', 0, V1A, 'incorrect', ['4x-3']),
    spec('F1b : (2x + 1)e^(3x)', 1, V1B, 'correct', ['(6x+5)e^{3x}']),
    spec('F1b : développée (½)', 1, V1B, 'unoptimal_form', ['6xe^{3x}+5e^{3x}'],
         violations=['form']),
    spec('F1b : produit des dérivées', 1, V1B, 'incorrect', ['6e^{3x}']),
    spec('F1b : dérivée de e^(mx)', 1, V1B, 'incorrect', ['(2x+3)e^{3x}']),
    spec('F1b : uv′ oublié', 1, V1B, 'incorrect', ['2e^{3x}']),
    spec('F1b : (−x + 2)e^(−2x)', 1, {'a': '-1', 'b': '2', 'm': '-2'}, 'correct',
         ['(2x-5)e^{-2x}']),
]


# =============================================================================================
# f52b93c4 — TSPE-413. F2 a : (ax³ + bx)ⁿ ; F2 b : √(αe^(kx) + b). Jugées par équivalence.
# =============================================================================================

U_F2 = '{{eval:a*x^3+b*x}}'
F2_A = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=\\left(' + U_F2
    + '\\right)^{ {{n}} }$.\n\nDétermine sa fonction dérivée.\n\n$f\'(x)=?$',
    [X, var('a', '1..3'), var('b', '1..5;±'), var('n', '2..4')],
    [case('{{n}}\\left({{eval:3*a*x^2+b}}\\right)\\left(' + U_F2 + '\\right)'
          '{{if:n>2|^{ {{eval:n-1}} }}}', [
        erreur('{{n}}\\left(' + U_F2 + '\\right){{if:n>2|^{ {{eval:n-1}} }}}',
               'Tu as oublié de multiplier par $u\'(x)$ : $(u^{n})\'=n\\,u\'\\,u^{n-1}$.',
               'u′ oublié'),
        erreur('{{n}}\\left({{eval:3*a*x^2+b}}\\right)\\left(' + U_F2 + '\\right)^{ {{n}} }',
               'L\'exposant diminue de $1$ : $(u^{n})\'=n\\,u\'\\,u^{n-1}$.',
               'Exposant non diminué'),
    ])],
    [
        '$f=u^{ {{n}} }$ avec $u(x)=' + U_F2 + '$, donc $f\'={{n}}\\,u\'\\,u^{ {{eval:n-1}} }$.',
        '$u\'(x)={{eval:3*a*x^2+b}}$, d\'où $f\'(x)=' + PRIMAIRE + '{ {{n}}\\left({{eval:3*a*x^2+b}}'
        '\\right)\\left(' + U_F2 + '\\right){{if:n>2|^{ {{eval:n-1}} }}} }$.',
    ],
    'Pose $u(x)=' + U_F2 + '$, calcule $u\'(x)$, puis applique la formule de la dérivée de '
    '$u^{n}$.',
)

EKX = 'e^{' + coef('k') + 'x}'
RAC_F2 = '\\sqrt{' + coef('al') + EKX + '+{{b}}}'
# Numérateur simplifié par 2 (αk pair) : ±1 s'écrit sans 1
NUM_SIMPLE = '{{if:abs(al*k)==2||{{eval:abs(al*k)/2}}}}'
REP_F2B = ('{{if:al*k<0|-}}{{if:al*k==2*floor(al*k/2)|\\frac{' + NUM_SIMPLE + EKX + '}{'
           + RAC_F2 + '}|\\frac{ {{eval:abs(al*k)}}' + EKX + '}{2' + RAC_F2 + '}}}')
F2_B = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=' + RAC_F2 + '$.\n\n'
    'Détermine sa fonction dérivée.\n\n$f\'(x)=?$',
    [var('al', '1..3'), var('k', '-2|-1|1|2'), var('b', '1..5')],
    [case(REP_F2B, [
        erreur('\\frac{1}{2' + RAC_F2 + '}',
               'Tu as oublié de multiplier par $u\'(x)$ : $(\\sqrt{u})\'=\\dfrac{u\'}{2\\sqrt{u}}$.',
               'u′ oublié'),
        erreur('\\frac{ {{eval:al*k}}' + EKX + '}{' + RAC_F2 + '}',
               'La dérivée de $\\sqrt{u}$ est $\\dfrac{u\'}{2\\sqrt{u}}$ : tu as oublié le $2$ du '
               'dénominateur.', '2 oublié'),
        erreur('\\frac{ {{al}}' + EKX + '}{2' + RAC_F2 + '}',
               'La dérivée de $' + EKX + '$ est ${{k}}' + EKX + '$ : le coefficient ${{k}}$ sort.',
               'Dérivée de e^(kx)'),
    ])],
    [
        '$f=\\sqrt{u}$ avec $u(x)=' + coef('al') + EKX + '+{{b}}$, donc $f\'=\\dfrac{u\'}'
        '{2\\sqrt{u}}$.',
        '$u\'(x)={{al}}\\times{{k;()}}' + EKX + '={{eval:al*k}}' + EKX + '$, d\'où $f\'(x)='
        + '\\dfrac{ {{eval:al*k}}' + EKX + '}{2' + RAC_F2 + '}=' + PRIMAIRE + '{' + REP_F2B
        + '}$.',
    ],
    'Pose $u(x)$ égal à l\'expression sous la racine, calcule $u\'(x)$ (attention à la dérivée de '
    '$' + EKX + '$), puis applique la formule de la dérivée de $\\sqrt{u}$.',
)

SPECS_F5 = [
    spec('F2a : (x³ − 2x)³', 0, {'a': '1', 'b': '-2', 'n': '3'}, 'correct',
         ['3(3x^2-2)(x^3-2x)^2']),
    spec('F2a : facteurs dans un autre ordre', 0, {'a': '1', 'b': '-2', 'n': '3'}, 'correct',
         ['3(x^3-2x)^2(3x^2-2)']),
    spec('F2a : (2x³ + x)², exposant 1', 0, {'a': '2', 'b': '1', 'n': '2'}, 'correct',
         ['2(6x^2+1)(2x^3+x)']),
    spec('F2a : u′ oublié', 0, {'a': '1', 'b': '-2', 'n': '3'}, 'incorrect', ['3(x^3-2x)^2'],
         'Tu as oublié de multiplier par $u\'\\left( x \\right)$ : $(u^{n})\'=n\\,u\'\\,u^{n-1}$.'),
    spec('F2a : exposant non diminué', 0, {'a': '1', 'b': '-2', 'n': '3'}, 'incorrect',
         ['3(3x^2-2)(x^3-2x)^3']),
    spec('F2b : √(2e^(−x) + 3)', 1, {'al': '2', 'k': '-1', 'b': '3'}, 'correct',
         ['-\\frac{e^{-x}}{\\sqrt{2e^{-x}+3}}']),
    spec('F2b : non simplifiée par 2 (½)', 1, {'al': '2', 'k': '-1', 'b': '3'}, 'unoptimal_form',
         ['-\\frac{2e^{-x}}{2\\sqrt{2e^{-x}+3}}'], violations=['reducedFractions']),
    spec('F2b : √(3eˣ + 1), 3/(2√…)', 1, {'al': '3', 'k': '1', 'b': '1'}, 'correct',
         ['\\frac{3e^{x}}{2\\sqrt{3e^{x}+1}}']),
    spec('F2b : u′ oublié', 1, {'al': '2', 'k': '-1', 'b': '3'}, 'incorrect',
         ['\\frac{1}{2\\sqrt{2e^{-x}+3}}']),
    spec('F2b : 2 oublié', 1, {'al': '3', 'k': '2', 'b': '1'}, 'incorrect',
         ['\\frac{6e^{2x}}{\\sqrt{3e^{2x}+1}}']),
    spec('F2b : dérivée de e^(kx)', 1, {'al': '3', 'k': '2', 'b': '1'}, 'incorrect',
         ['\\frac{3e^{2x}}{2\\sqrt{3e^{2x}+1}}']),
]


# =============================================================================================
# e3e19d28 — TSPE-588. F8 : f′(x) = s·0,5((x − h)³ − 3(x − h)), deux sommets en h ± 1 ; f″ du
# signe de s((x − h)² − 1). On demande la courbure du milieu : concave si s = 1, convexe si s = −1,
# sur [h − 1 ; h + 1].
# =============================================================================================

QUAL = '{{if:s>0|concave|convexe}}'
F8 = variation(
    'On a représenté ci-dessous la courbe de la fonction **dérivée** $f\'$ d\'une fonction $f$ deux '
    'fois dérivable sur $\\mathbb{R}$.\n\n'
    + bloc('courbe', 'x: {{eval:h-3.5}} ; {{eval:h+3.5}}', 'y: -4 ; 4', 'grille: 1 ; 1',
           'g(x) = {{s}}*0.5*((x-{{h}})^3-3*(x-{{h}}))   rouge',
           'taille: moyenne',
           'description: Courbe de la dérivée f′ : un polynôme de degré 3 avec deux sommets, '
           'd\'abscisses {{eval:h-1}} et {{eval:h+1}}.')
    + '\n\nDétermine le plus grand intervalle borné sur lequel $f$ est **' + QUAL + '**.\n\n$I=?$',
    [var('s', '1|-1'), var('h', '-2..2')],
    [case('[{{eval:h-1}};{{eval:h+1}}]', [
        erreur(']-\\infty;{{eval:h-1}}]\\cup[{{eval:h+1}};+\\infty[',
               'Sur ces intervalles, $f\'$ est {{if:s>0|croissante|décroissante}} : $f$ y est '
               '{{if:s>0|convexe|concave}}, pas ' + QUAL + '.', 'Convexité inversée'),
    ], 'intervalles')],
    [
        '$f$ est convexe là où $f\'$ est **croissante**, concave là où $f\'$ est **décroissante** '
        '(le signe de $f\'$ donne les variations de $f$, pas sa convexité).',
        'Sur le graphique, $f\'$ est {{if:s>0|croissante, puis décroissante entre $' + '{{eval:h-1}}'
        '$ et ${{eval:h+1}}$, puis croissante|décroissante, puis croissante entre ${{eval:h-1}}$ et '
        '${{eval:h+1}}$, puis décroissante}}.',
        '$f$ est ' + QUAL + ' sur $' + PRIMAIRE + '{' + ferme('{{eval:h-1}}', '{{eval:h+1}}') + '}$.',
    ],
    'Repère les sommets de la courbe de $f\'$ : entre eux, $f\'$ est-elle croissante ou '
    'décroissante ?',
)

SPECS_E3 = [
    spec('F8 : s = 1, h = 0', 0, {'s': '1', 'h': '0'}, 'correct', ['[-1;1]']),
    spec('F8 : bornes ouvertes', 0, {'s': '1', 'h': '0'}, 'correct', [']-1;1[']),
    spec('F8 : convexité inversée', 0, {'s': '1', 'h': '0'}, 'incorrect',
         [']-\\infty;-1]\\cup[1;+\\infty['],
         'Sur ces intervalles, $f\'$ est croissante : $f$ y est convexe, pas concave.'),
    spec('F8 : s = −1, h = 2', 0, {'s': '-1', 'h': '2'}, 'correct', ['[1;3]']),
    spec('F8 : sommets mal lus', 0, {'s': '-1', 'h': '2'}, 'incorrect', ['[0;4]']),
]


# =============================================================================================
# 225c8682 — TSPE-590. F9 : f″(x) = s·0,5(x − a)(x − b), a < b, b − a ⩾ 2. f convexe là où
# f″ ⩾ 0 : entre les racines si s = −1, à l'extérieur si s = 1.
# =============================================================================================

EXT = ']-\\infty;{{a}}]\\cup[{{b}};+\\infty['
F9 = variation(
    'On a représenté ci-dessous la courbe de la fonction **dérivée seconde** $f\'\'$ d\'une fonction '
    '$f$ deux fois dérivable sur $\\mathbb{R}$.\n\n'
    + bloc('courbe', 'x: -5 ; 5', 'y: -5 ; 5', 'grille: 1 ; 1',
           'g(x) = {{s}}*0.5*(x-{{a}})*(x-{{b}})   violet',
           'taille: moyenne',
           'description: Courbe de la dérivée seconde f″ : une parabole tournée vers le '
           '{{if:s>0|haut|bas}} qui coupe l\'axe des abscisses en x = {{a}} et x = {{b}}.')
    + '\n\nSur quel ensemble la fonction $f$ est-elle **convexe** ? Donne un intervalle ou une '
    'réunion d\'intervalles.\n\n$S=?$',
    [var('s', '1|-1'), var('a', '-3..1'), var('b', '-1..3')],
    [case('{{if:s>0|' + EXT + '|[{{a}};{{b}}]}}', [
        erreur('{{if:s>0|[{{a}};{{b}}]|' + EXT + '}}',
               'C\'est l\'ensemble où $f\'\'(x)\\leqslant 0$ : $f$ y est concave.',
               'Concavité donnée'),
    ], 'intervalles')],
    [
        '$f$ est convexe là où $f\'\'(x)\\geqslant 0$, c\'est-à-dire là où la courbe de $f\'\'$ est '
        '**au-dessus** de l\'axe des abscisses.',
        '$f\'\'$ s\'annule en ${{a}}$ et en ${{b}}$ ; elle est positive {{if:s>0|à l\'extérieur de '
        'ses racines|entre ses racines}} : $f$ est convexe sur $' + PRIMAIRE
        + '{ {{if:s>0|\\left]-\\infty\\,;{{a}}\\right]\\cup\\left[{{b}}\\,;+\\infty\\right[|'
        + ferme('{{a}}', '{{b}}') + '}} }$.',
    ],
    'Repère où la courbe de $f\'\'$ est au-dessus de l\'axe des abscisses.',
    ['b - a >= 2'],
)

SPECS_22 = [
    spec('F9 : s = 1, extérieur', 0, {'s': '1', 'a': '-2', 'b': '1'}, 'correct',
         [']-\\infty;-2]\\cup[1;+\\infty[']),
    spec('F9 : s = 1, bornes ouvertes', 0, {'s': '1', 'a': '-2', 'b': '1'}, 'correct',
         [']-\\infty;-2[\\cup]1;+\\infty[']),
    spec('F9 : s = 1, concavité donnée', 0, {'s': '1', 'a': '-2', 'b': '1'}, 'incorrect',
         ['[-2;1]'], 'C\'est l\'ensemble où $f\'\'(x)\\leqslant 0$ : $f$ y est concave.'),
    spec('F9 : s = −1, entre', 0, {'s': '-1', 'a': '-1', 'b': '3'}, 'correct', ['[-1;3]']),
    spec('F9 : s = −1, extérieur à tort', 0, {'s': '-1', 'a': '-1', 'b': '3'}, 'incorrect',
         [']-\\infty;-1]\\cup[3;+\\infty[']),
]


# =============================================================================================
# cfd13223 — TSPE-585. F10 : tableau de variations de f′ sur [c − 3 ; c + 3], changement en c ;
# s = 1 : f′ décroît puis croît → f convexe sur [c ; c + 3] ; s = −1 : l'inverse → [c − 3 ; c].
# =============================================================================================

F10 = variation(
    'Soit $f$ une fonction deux fois dérivable sur $' + ferme('{{eval:c-3}}', '{{eval:c+3}}')
    + '$. Voici le tableau de variations de sa fonction **dérivée** $f\'$.\n\n'
    + bloc('variation', 'variable: x', 'domain: {{eval:c-3}}, {{c}}, {{eval:c+3}}', '',
           "variation: f'(x)",
           '  {{eval:c-3}}: {{eval:k+3*s}}, {{if:s>0|top|bottom}}',
           '  {{c}}: {{k}}, {{if:s>0|bottom|top}}',
           '  {{eval:c+3}}: {{eval:k+2*s}}, {{if:s>0|top|bottom}}')
    + '\n\nDétermine le plus grand intervalle sur lequel $f$ est **convexe**.\n\n$I=?$',
    [var('s', '1|-1'), var('c', '-2..2'), var('k', '-2..2')],
    [case('{{if:s>0|[{{c}};{{eval:c+3}}]|[{{eval:c-3}};{{c}}]}}', [
        erreur('{{if:s>0|[{{eval:c-3}};{{c}}]|[{{c}};{{eval:c+3}}]}}',
               'Sur cet intervalle, $f\'$ est décroissante : $f$ y est concave.',
               'Concavité donnée'),
    ], 'intervalles')],
    [
        'À connaître : $f$ est convexe sur un intervalle si et seulement si $f\'$ y est '
        '**croissante**.',
        'D\'après le tableau, $f\'$ est croissante sur $' + PRIMAIRE
        + '{ {{if:s>0|' + ferme('{{c}}', '{{eval:c+3}}') + '|' + ferme('{{eval:c-3}}', '{{c}}')
        + '}} }$ : c\'est là que $f$ est convexe. Le signe de $f\'$ ne compte pas ici.',
    ],
    'Lis dans le tableau où $f\'$ est croissante.',
)

SPECS_CF = [
    spec('F10 : s = 1, c = 0', 0, {'s': '1', 'c': '0', 'k': '-1'}, 'correct', ['[0;3]']),
    spec('F10 : bornes ouvertes', 0, {'s': '1', 'c': '0', 'k': '-1'}, 'correct', [']0;3[']),
    spec('F10 : concavité donnée', 0, {'s': '1', 'c': '0', 'k': '-1'}, 'incorrect', ['[-3;0]'],
         'Sur cet intervalle, $f\'$ est décroissante : $f$ y est concave.'),
    spec('F10 : s = −1, c = 2', 0, {'s': '-1', 'c': '2', 'k': '1'}, 'correct', ['[-1;2]']),
]


# =============================================================================================
# 37ce7759 — TSPE-419. F12 c : courbe de f (cubique) donnée, reconnaître celle de f″ parmi quatre
# (Q1). F13 : sinusoïde à deux inflexions (c et c + 3) sur [c − 2 ; c + 5], tangentes tracées aux
# inflexions ; A > 0 → concave sur [c ; c + 3], A < 0 → convexe sur [c ; c + 3].
# =============================================================================================

def petite(nom, formule, couleur, description):
    return bloc('courbe', 'x: {{eval:h-3.5}} ; {{eval:h+3.5}}', 'y: -4 ; 4', 'grille: 1 ; 1',
                nom + '(x) = ' + formule + '   ' + couleur, 'taille: petite',
                'description: ' + description)


F12_C = variation(
    'On a représenté ci-dessous la courbe $\\mathcal{C}_f$ d\'une fonction $f$ deux fois dérivable '
    'sur $\\mathbb{R}$.\n\n'
    + bloc('courbe', 'x: {{eval:h-3.5}} ; {{eval:h+3.5}}', 'y: -4 ; 4', 'grille: 1 ; 1',
           'f(x) = {{s}}*0.5*((x-{{h}})^3-3*(x-{{h}}))   bleu   nom=C_f',
           'taille: moyenne',
           'description: Courbe d\'une fonction polynôme de degré 3 avec deux sommets, '
           'd\'abscisses {{eval:h-1}} et {{eval:h+1}}.')
    + '\n\nLaquelle de ces courbes peut représenter la fonction **dérivée seconde** $f\'\'$ ?\n\n'
    + '````choix\n'
    + item(petite('g', '{{s}}*(x-{{h}})', 'violet',
                  'Droite qui coupe l\'axe des abscisses en x = {{h}}.')) + '\n'
    + item(petite('g', '{{eval:-s}}*(x-{{h}})', 'violet',
                  'Droite qui coupe l\'axe des abscisses en x = {{h}}.')) + '\n'
    + item(petite('g', '{{s}}*(x-{{eval:h+1}})', 'violet',
                  'Droite qui coupe l\'axe des abscisses en x = {{eval:h+1}}.')) + '\n'
    + item(petite('g', '{{s}}*1.5*((x-{{h}})^2-1)', 'violet',
                  'Parabole qui coupe l\'axe des abscisses en x = {{eval:h-1}} et x = '
                  '{{eval:h+1}}.')) + '\n````',
    [var('s', '1|-1'), var('h', '-2..2')],
    [case('0')],
    [
        '$f\'\'(x)\\geqslant 0$ là où $f$ est convexe (courbe tournée vers le haut), '
        '$f\'\'(x)\\leqslant 0$ là où elle est concave.',
        '$\\mathcal{C}_f$ est {{if:s>0|concave puis convexe|convexe puis concave}}, avec un point '
        'd\'inflexion d\'abscisse ${{h}}$ : $f\'\'$ est {{if:s>0|négative puis positive|positive '
        'puis négative}} et s\'annule en ${{h}}$.',
        'C\'est $' + PRIMAIRE + '{\\text{la droite } {{if:s>0|croissante|décroissante}} \\text{ qui '
        'coupe l\'axe en } {{h}} }$. La parabole qui s\'annule aux sommets de $\\mathcal{C}_f$ est '
        'celle de $f\'$.',
    ],
    'Où $\\mathcal{C}_f$ est-elle convexe, où est-elle concave ? Déduis-en le signe de $f\'\'$, et '
    'où elle s\'annule.',
)

SINUS = '{{A}}*sin(\\pi*(x-{{c}})/3)+{{k}}'
QUAL13 = '{{if:A>0|concave|convexe}}'
F13 = variation(
    'On a représenté ci-dessous la courbe $\\mathcal{C}_f$ d\'une fonction $f$ deux fois dérivable '
    'sur $' + ferme('{{eval:c-2}}', '{{eval:c+5}}') + '$, et ses tangentes en deux points.\n\n'
    + bloc('courbe', 'x: {{eval:c-2.5}} ; {{eval:c+5.5}}', 'y: {{eval:k-4}} ; {{eval:k+4}}',
           'grille: 1 ; 1',
           'f(x) = ' + SINUS + ' sur [{{eval:c-2}} ; {{eval:c+5}}]   bleu   nom=C_f',
           'tangente: f ; {{c}}', 'tangente: f ; {{eval:c+3}}',
           'taille: moyenne',
           'description: Courbe ondulée qui change deux fois de courbure, avec ses tangentes aux '
           'points d\'abscisses {{c}} et {{eval:c+3}}.')
    + '\n\nDétermine le plus grand intervalle sur lequel $f$ est **' + QUAL13 + '**.\n\n$I=?$',
    [var('A', '2|3|-2|-3'), var('c', '-2..0'), var('k', '-1..1')],
    [case('[{{c}};{{eval:c+3}}]', [
        erreur('[{{eval:c-1.5}};{{eval:c+1.5}}]',
               'Sur cet intervalle, $f$ est {{if:A>0|croissante|décroissante}} : la convexité se lit '
               'à la courbure, pas au sens de variation.', 'Intervalle de monotonie'),
        erreur('[{{eval:c-2}};{{c}}]',
               'Sur cet intervalle, la courbe est au-{{if:A>0|dessus|dessous}} de ses tangentes : '
               '$f$ y est {{if:A>0|convexe|concave}}.', 'Courbure inversée'),
    ], 'intervalles')],
    [
        'Aux points d\'abscisses ${{c}}$ et ${{eval:c+3}}$, la courbe traverse sa tangente : ce sont '
        'deux points d\'inflexion, où la courbure change.',
        'Entre eux, la courbe est {{if:A>0|en dessous|au-dessus}} de ses tangentes : $f$ est '
        + QUAL13 + ' sur $' + PRIMAIRE + '{' + ferme('{{c}}', '{{eval:c+3}}') + '}$ (et '
        '{{if:A>0|convexe|concave}} sur $' + ferme('{{eval:c-2}}', '{{c}}') + '$ et sur $'
        + ferme('{{eval:c+3}}', '{{eval:c+5}}') + '$).',
    ],
    'Repère les points où la courbe traverse sa tangente ; entre eux, est-elle tournée vers le haut '
    'ou vers le bas ?',
)

SPECS_37 = [
    spec('F12c : s = 1, h = 0', 0, {'s': '1', 'h': '0'}, 'correct', ['0']),
    spec('F12c : opposée', 0, {'s': '1', 'h': '0'}, 'incorrect', ['1']),
    spec('F12c : décalée', 0, {'s': '-1', 'h': '1'}, 'incorrect', ['2']),
    spec('F12c : parabole (f′)', 0, {'s': '-1', 'h': '1'}, 'incorrect', ['3']),
    spec('F13 : A = 2, c = −1', 1, {'A': '2', 'c': '-1', 'k': '0'}, 'correct', ['[-1;2]']),
    spec('F13 : bornes ouvertes', 1, {'A': '2', 'c': '-1', 'k': '0'}, 'correct', [']-1;2[']),
    spec('F13 : intervalle de monotonie', 1, {'A': '2', 'c': '-1', 'k': '0'}, 'incorrect',
         ['[-2.5;0.5]'],
         'Sur cet intervalle, $f$ est croissante : la convexité se lit à la courbure, pas au sens de '
         'variation.'),
    spec('F13 : courbure inversée', 1, {'A': '2', 'c': '-1', 'k': '0'}, 'incorrect', ['[-3;-1]']),
    spec('F13 : A = −3, c = 0', 1, {'A': '-3', 'c': '0', 'k': '1'}, 'correct', ['[0;3]']),
]


# =============================================================================================
# 98f9d4b2 — TSPE-587. F14 : nombre de points d'inflexion (0, 1 ou 2) d'une sinusoïde
# A sin(π(x − c)/3) + k (inflexions en c + 3j) tracée sur un intervalle qui en contient n.
# n = 0 : [c + 0,5 ; c + 2,5] ; n = 1 : [c − 1,5 ; c + 1,5] ; n = 2 : [c − 1 ; c + 4].
# =============================================================================================

P14 = '{{if:n==0|{{eval:c+0.5}}|{{if:n==1|{{eval:c-1.5}}|{{eval:c-1}}}}}}'
Q14 = '{{if:n==0|{{eval:c+2.5}}|{{if:n==1|{{eval:c+1.5}}|{{eval:c+4}}}}}}'
F14 = variation(
    'On a représenté ci-dessous la courbe $\\mathcal{C}_f$ d\'une fonction $f$ deux fois dérivable '
    'sur $\\left[' + P14 + '\\,;' + Q14 + '\\right]$.\n\n'
    + bloc('courbe', 'x: {{eval:c-2}} ; {{eval:c+4.5}}', 'y: {{eval:k-4}} ; {{eval:k+4}}',
           'grille: 1 ; 1',
           'f(x) = ' + SINUS + ' sur [' + P14 + ' ; ' + Q14 + ']   bleu   nom=C_f',
           'taille: moyenne',
           'description: Courbe ondulée tracée sur un intervalle borné.')
    + '\n\nCombien la courbe $\\mathcal{C}_f$ a-t-elle de points d\'inflexion ?\n\n$?$',
    [var('n', '0..2'), var('A', '2|3|-2|-3'), var('c', '-1..0'), var('k', '-1..1')],
    [case('{{n}}', [
        erreur('{{if:n==1|0|1}}',
               'Tu as compté les sommets de la courbe (tangente horizontale) : un point d\'inflexion '
               'est un point où la courbe change de courbure et traverse sa tangente.',
               'Sommets comptés'),
    ])],
    [
        'Un point d\'inflexion est un point où la courbe change de courbure (de « tournée vers le '
        'haut » à « tournée vers le bas », ou l\'inverse) : elle y traverse sa tangente.',
        '{{if:n==0|Ici, la courbe garde la même courbure sur tout l\'intervalle : elle n\'a ' + '$'
        + PRIMAIRE + '{0}$ point d\'inflexion.|{{if:n==1|Ici, la courbure change une seule fois, au '
        'point d\'abscisse ${{c}}$ : la courbe a $' + PRIMAIRE + '{1}$ point d\'inflexion.|Ici, la '
        'courbure change deux fois, aux points d\'abscisses ${{c}}$ et ${{eval:c+3}}$ : la courbe a $'
        + PRIMAIRE + '{2}$ points d\'inflexion.}}}}',
    ],
    'Suis la courbe de gauche à droite : combien de fois passe-t-elle de « tournée vers le haut » à '
    '« tournée vers le bas », ou l\'inverse ?',
)

SPECS_98 = [
    spec('F14 : n = 0', 0, {'n': '0', 'A': '2', 'c': '0', 'k': '0'}, 'correct', ['0']),
    spec('F14 : n = 0, sommet compté', 0, {'n': '0', 'A': '2', 'c': '0', 'k': '0'}, 'incorrect',
         ['1'],
         'Tu as compté les sommets de la courbe (tangente horizontale) : un point d\'inflexion est un '
         'point où la courbe change de courbure et traverse sa tangente.'),
    spec('F14 : n = 1', 0, {'n': '1', 'A': '-3', 'c': '-1', 'k': '1'}, 'correct', ['1']),
    spec('F14 : n = 2', 0, {'n': '2', 'A': '3', 'c': '-1', 'k': '-1'}, 'correct', ['2']),
    spec('F14 : n = 2, sommet compté', 0, {'n': '2', 'A': '3', 'c': '-1', 'k': '-1'}, 'incorrect',
         ['1']),
]


# =============================================================================================
# eeb72d3a — TSPE-411. F15 a : cubique (inflexion en h), tangente en h + t → au-dessus (convexe),
# en dessous (concave), la traverse (t = 0). F15 b : sinusoïde, tangente en c + 1,5t, t ∈ {−1, 0,
# 1, 2} : f convexe, concave, ou inflexion (t = 0 ou 2). Choix fixes, trois propositions.
# =============================================================================================

F15_A = variation(
    'On a représenté ci-dessous la courbe $\\mathcal{C}_f$ d\'une fonction $f$ deux fois dérivable '
    'sur $\\mathbb{R}$, et sa tangente $T$ au point $A$.\n\n'
    + bloc('courbe', 'x: {{eval:h-3.5}} ; {{eval:h+3.5}}', 'y: {{eval:k-4}} ; {{eval:k+4}}',
           'grille: 1 ; 1',
           'f(x) = {{s}}*0.5*((x-{{h}})^3-3*(x-{{h}}))+{{k}}   bleu   nom=C_f',
           'points: A({{eval:h+t}} ; f({{eval:h+t}}))',
           'tangente: f ; {{eval:h+t}}',
           'taille: moyenne',
           'description: Courbe d\'une fonction polynôme de degré 3 avec deux sommets, et sa '
           'tangente au point A.')
    + '\n\nAu voisinage du point $A$, la courbe $\\mathcal{C}_f$ est :\n\n'
    + bloc('choix', '- au-dessus de la tangente $T$', '- en dessous de la tangente $T$',
           '- de part et d\'autre de la tangente $T$ (elle la traverse en $A$)'),
    [var('s', '1|-1'), var('h', '-1..1'), var('k', '-1..1'), var('t', '-2..2')],
    [case('{{if:t==0|2|{{if:s*t>0|0|1}}}}')],
    [
        'Là où $f$ est convexe, sa courbe est au-dessus de ses tangentes ; là où elle est concave, '
        'en dessous ; en un point d\'inflexion, elle traverse sa tangente.',
        '{{if:t==0|$A$ est le point d\'inflexion de $\\mathcal{C}_f$ : la courbe est $' + PRIMAIRE
        + '{\\text{de part et d\'autre de } T}$.|Au voisinage de $A$, la courbe est tournée vers le '
        '{{if:s*t>0|haut ($f$ convexe)|bas ($f$ concave)}} : elle est $' + PRIMAIRE
        + '{\\text{ {{if:s*t>0|au-dessus|en dessous}} de } T}$.}}',
    ],
    'Au voisinage de $A$, la courbe est-elle tournée vers le haut, vers le bas, ou change-t-elle de '
    'courbure en $A$ ?',
)

X15 = '{{eval:c+1.5*t}}'
F15_B = variation(
    'On a représenté ci-dessous la courbe $\\mathcal{C}_f$ d\'une fonction $f$ deux fois dérivable '
    'sur $\\mathbb{R}$, et sa tangente au point $A$ d\'abscisse $a=' + X15 + '$.\n\n'
    + bloc('courbe', 'x: {{eval:c-3}} ; {{eval:c+4.5}}', 'y: {{eval:k-4}} ; {{eval:k+4}}',
           'grille: 1 ; 1',
           'f(x) = ' + SINUS + '   bleu   nom=C_f',
           'points: A(' + X15 + ' ; f(' + X15 + '))',
           'tangente: f ; ' + X15,
           'taille: moyenne',
           'description: Courbe ondulée et sa tangente au point A.')
    + '\n\nQue peut-on dire de $f$ au voisinage de $a$ ?\n\n'
    + bloc('choix', '- $f$ est convexe au voisinage de $a$', '- $f$ est concave au voisinage de $a$',
           '- $\\mathcal{C}_f$ a un point d\'inflexion en $A$'),
    [var('A', '2|3|-2|-3'), var('c', '-1..0'), var('k', '-1..1'), var('t', '-1..2')],
    [case('{{if:t*(t-2)==0|2|{{if:A*t<0|0|1}}}}')],
    [
        'La courbe d\'une fonction convexe est au-dessus de ses tangentes, celle d\'une fonction '
        'concave en dessous ; en un point d\'inflexion, elle traverse sa tangente.',
        '{{if:t*(t-2)==0|En $A$, la courbe traverse sa tangente : $' + PRIMAIRE
        + '{\\mathcal{C}_f\\text{ a un point d\'inflexion en }A}$.|Au voisinage de $A$, la courbe est '
        '{{if:A*t<0|au-dessus|en dessous}} de sa tangente : $' + PRIMAIRE
        + '{f\\text{ est {{if:A*t<0|convexe|concave}} au voisinage de }a}$.}}',
    ],
    'Au voisinage de $A$, la courbe est-elle au-dessus de sa tangente, en dessous, ou la '
    'traverse-t-elle ?',
)

V15 = {'s': '1', 'h': '0', 'k': '0'}
SPECS_EE = [
    spec('F15a : convexe (t = 1)', 0, {**V15, 't': '1'}, 'correct', ['0']),
    spec('F15a : concave (t = −2)', 0, {**V15, 't': '-2'}, 'correct', ['1']),
    spec('F15a : inflexion (t = 0)', 0, {**V15, 't': '0'}, 'correct', ['2']),
    spec('F15a : inflexion prise pour concave', 0, {**V15, 't': '0'}, 'incorrect', ['1']),
    spec('F15a : s = −1, t = 2 → en dessous', 0, {**V15, 's': '-1', 't': '2'}, 'correct', ['1']),
    spec('F15b : A = 2, t = −1 → convexe', 1, {'A': '2', 'c': '0', 'k': '0', 't': '-1'}, 'correct',
         ['0']),
    spec('F15b : A = 2, t = 1 → concave', 1, {'A': '2', 'c': '0', 'k': '0', 't': '1'}, 'correct',
         ['1']),
    spec('F15b : t = 2 → inflexion', 1, {'A': '-3', 'c': '-1', 'k': '1', 't': '2'}, 'correct',
         ['2']),
    spec('F15b : convexe pris pour concave', 1, {'A': '2', 'c': '0', 'k': '0', 't': '-1'},
         'incorrect', ['1']),
]


# =============================================================================================
# 08f9ad7b — TSPE-412. F16 : f(x) = s(x³ − 3x₀x² + 3(x₀² − r²)x) + d, f″(x) = 6s(x − x₀) :
# inflexion en x₀, ordonnée f(x₀) = s(x₀³ − 3r²x₀) + d. (r au lieu de e : e = Euler.)
# =============================================================================================

F16 = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)={{eval:s*(x^3-3*x0*x^2+3*(x0^2-r^2)*x)+d}}$.'
    '\n\nLa courbe de $f$ admet un unique point d\'inflexion. Quelle est son **ordonnée** ?\n\n$y=?$',
    [X, var('s', '1|-1'), var('x0', '-2..2'), var('r', '1..2'), var('d', '-5..5')],
    [case('{{eval:s*(x0^3-3*r^2*x0)+d}}', [
        erreur('{{x0}}',
               '${{x0}}$ est l\'abscisse du point d\'inflexion : son ordonnée est $f({{x0}})$.',
               'Abscisse donnée'),
        erreur('0',
               'C\'est $f\'\'({{x0}})$ qui est nul : l\'ordonnée du point d\'inflexion est '
               '$f({{x0}})$.', 'f″(x₀) donné'),
    ])],
    [
        '$f\'(x)={{eval:s*(3*x^2-6*x0*x+3*(x0^2-r^2))}}$ et $f\'\'(x)={{eval:s*(6*x-6*x0)}}$, qui '
        's\'annule en changeant de signe en $x={{x0}}$.',
        'L\'ordonnée du point d\'inflexion est $f({{x0}})=' + PRIMAIRE
        + '{ {{eval:s*(x0^3-3*r^2*x0)+d}} }$.',
    ],
    'Trouve d\'abord l\'abscisse du point d\'inflexion avec $f\'\'$, puis calcule l\'image de cette '
    'abscisse par $f$.',
)

SPECS_08 = [
    # x0 = 1, r = 2, s = 1, d = 3 : f(x) = x³ − 3x² − 9x + 3, f(1) = 1 − 12 + 3 = −8
    spec('F16 : x³ − 3x² − 9x + 3 → −8', 0, {'s': '1', 'x0': '1', 'r': '2', 'd': '3'}, 'correct',
         ['-8']),
    spec('F16 : abscisse donnée', 0, {'s': '1', 'x0': '1', 'r': '2', 'd': '3'}, 'incorrect', ['1'],
         '$1$ est l\'abscisse du point d\'inflexion : son ordonnée est $f\\left( 1 \\right)$.'),
    spec('F16 : f″(x₀)', 0, {'s': '1', 'x0': '1', 'r': '2', 'd': '3'}, 'incorrect', ['0']),
    spec('F16 : s = −1, x0 = −2', 0, {'s': '-1', 'x0': '-2', 'r': '1', 'd': '0'}, 'correct',
         ['2']),
]


# =============================================================================================
# c4775a3a — TSPE-420. F17 : f(x) = (x² + bx + c)eˣ avec b = −(r₁ + r₂) − 4, c = r₁r₂ − 2b − 2,
# pour que f″(x) = (x − r₁)(x − r₂)eˣ ; concave sur [r₁ ; r₂]. Le modèle a answerKind
# « intervalles » et openableBounds par défaut.
# =============================================================================================

F17 = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=\\left({{eval:x^2+b*x+c}}\\right)'
    'e^{x}$.\n\nDétermine le plus grand intervalle sur lequel $f$ est **concave**.\n\n$I=?$',
    [X, var('p', '-3..2'), var('q', '-2..3'), var('b', 'eval:-(p+q)-4'),
     var('c', 'eval:p*q-2*b-2')],
    [{'expectedAnswer': '[{{p}};{{q}}]', 'expectedErrors': [
        erreur(']-\\infty;{{p}}]\\cup[{{q}};+\\infty[',
               'C\'est là que $f\'\'(x)\\geqslant 0$ : $f$ y est convexe.', 'Convexité donnée'),
    ]}],
    [
        '$f\'(x)=(2x{{b;+}})e^{x}+\\left({{eval:x^2+b*x+c}}\\right)e^{x}='
        '\\left({{eval:x^2+(b+2)*x+b+c}}\\right)e^{x}$.',
        'De même, $f\'\'(x)=\\left({{eval:x^2+(b+4)*x+2*b+c+2}}\\right)e^{x}='
        '(x{{eval:-p;+}})(x{{eval:-q;+}})e^{x}$.',
        '$e^{x}>0$ : $f\'\'(x)$ a le signe du trinôme, négatif entre ses racines ${{p}}$ et ${{q}}$. '
        '$f$ est concave sur $' + PRIMAIRE + '{' + ferme('{{p}}', '{{q}}') + '}$.',
    ],
    'Dérive deux fois avec $(uv)\'=u\'v+uv\'$, en mettant $e^{x}$ en facteur, puis étudie le signe '
    'du trinôme obtenu.',
    ['p < q'],
)

SPECS_C4 = [
    # p = −1, q = 2 : b = −5, c = −2 + 10 − 2 = 6 → (x² − 5x + 6)eˣ, f″ = (x² − x − 2)eˣ
    spec('F17 : (x² − 5x + 6)eˣ → [−1 ; 2]', 0, {'p': '-1', 'q': '2', 'b': '-5', 'c': '6'},
         'correct', ['[-1;2]']),
    spec('F17 : convexité donnée', 0, {'p': '-1', 'q': '2', 'b': '-5', 'c': '6'}, 'incorrect',
         [']-\\infty;-1]\\cup[2;+\\infty['],
         'C\'est là que $f\'\'(x)\\geqslant 0$ : $f$ y est convexe.'),
    spec('F17 : racines du facteur (x² − 5x + 6)', 0, {'p': '-1', 'q': '2', 'b': '-5', 'c': '6'},
         'incorrect', ['[2;3]']),
]


# =============================================================================================
# e814175b — TSPE-417. Q2 : le sens de l'inégalité est écrit ; une case, la tangente.
# F18 a : f(x) = a·eˣ + bx² + cx + d (a, b de même signe), en 0 : y = (a + c)x + a + d.
# F18 b : f(x) = ax⁴ + bx² + cx + d (a, b de même signe), en x₀ ∈ {−2, −1, 1, 2}.
# =============================================================================================

SENS = '{{if:a>0|\\geqslant|\\leqslant}}'
F18_A = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=' + coef('a')
    + 'e^{x}{{eval:b*x^2+c*x+d;+}}$, qui est {{if:a>0|convexe|concave}} sur $\\mathbb{R}$.\n\n'
    'Complète avec l\'équation de la tangente à sa courbe au point d\'abscisse $0$ : pour tout '
    'réel $x$, $f(x)' + SENS + '?$',
    [X, var('a', '1..3;±'), var('bb', '1..3'), var('b', 'eval:bb*a/abs(a)'), var('c', '-5..5'),
     var('d', '-5..5')],
    [case('{{eval:(a+c)*x+a+d}}', [
        erreur('{{eval:(a+c)*x+d}}',
               '$f(0)={{a}}e^{0}{{d;+}}={{eval:a+d}}$ : $e^{0}=1$, pas $0$.', 'e⁰ = 0'),
        erreur('{{eval:c*x+a+d}}',
               'La dérivée de ${{a}}e^{x}$ est ${{a}}e^{x}$ : $f\'(0)={{a}}{{c;+}}$.',
               'Dérivée de a·eˣ oubliée'),
        erreur('{{eval:(a+c)*x}}',
               'La tangente en $0$ est $y=f\'(0)x+f(0)$ : il manque $f(0)$.', 'f(0) oublié'),
    ])],
    [
        '$f\'(x)={{a}}e^{x}{{eval:2*b*x+c;+}}$, donc $f\'(0)={{eval:a+c}}$ ; $f(0)={{a}}e^{0}'
        '{{d;+}}={{eval:a+d}}$.',
        'La tangente en $0$ a pour équation $y={{eval:(a+c)*x+a+d}}$. $f$ est '
        '{{if:a>0|convexe : sa courbe est au-dessus|concave : sa courbe est en dessous}} de cette '
        'tangente, donc pour tout réel $x$, $f(x)' + SENS + PRIMAIRE + '{ {{eval:(a+c)*x+a+d}} }$.',
    ],
    'Calcule $f(0)$ et $f\'(0)$ : la tangente en $0$ a pour équation $y=f\'(0)x+f(0)$.',
)

F18_B = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)={{eval:a*x^4+b*x^2+c*x+d}}$, qui est '
    '{{if:a>0|convexe|concave}} sur $\\mathbb{R}$.\n\nComplète avec l\'équation réduite de la '
    'tangente à sa courbe au point d\'abscisse ${{x0}}$ : pour tout réel $x$, $f(x)' + SENS + '?$',
    [X, var('a', '1..2;±'), var('bb', '1..3'), var('b', 'eval:bb*a/abs(a)'), var('c', '-5..5'),
     var('d', '-5..5'), var('x0', '-2|-1|1|2'), var('m', 'eval:4*a*x0^3+2*b*x0+c'),
     var('y0', 'eval:a*x0^4+b*x0^2+c*x0+d')],
    [case('{{eval:m*x+y0-m*x0}}', [
        erreur('{{eval:m*x+y0+m*x0}}',
               'La tangente au point d\'abscisse $a$ a pour équation $y=f\'(a)(x-a)+f(a)$ : ici '
               '$x-a$ s\'écrit $x{{eval:-x0;+}}$.', 'Signe de x₀'),
        erreur('{{eval:y0*x+m-y0*x0}}',
               'Tu as échangé $f({{x0}})$ et $f\'({{x0}})$ : la pente est $f\'({{x0}})={{m}}$.',
               'f(a) et f′(a) échangés'),
    ])],
    [
        '$f\'(x)={{eval:4*a*x^3+2*b*x+c}}$, donc $f\'({{x0}})={{m}}$ ; $f({{x0}})={{y0}}$.',
        'La tangente en ${{x0}}$ : $y={{m}}(x{{eval:-x0;+}}){{y0;+}}$, soit $y={{eval:m*x+y0-m*x0}}$.',
        '$f$ est {{if:a>0|convexe : sa courbe est au-dessus|concave : sa courbe est en dessous}} de '
        'ses tangentes, donc pour tout réel $x$, $f(x)' + SENS + PRIMAIRE
        + '{ {{eval:m*x+y0-m*x0}} }$.',
    ],
    'Calcule $f({{x0}})$ et $f\'({{x0}})$ : la tangente a pour équation $y=f\'({{x0}})(x{{eval:-x0;+}})'
    '+f({{x0}})$, à réduire.',
    ['m != y0'],
)

SPECS_E8 = [
    # a = 2, b = 1, c = −3, d = 1 : f = 2eˣ + x² − 3x + 1, f(0) = 3, f′(0) = −1 → −x + 3
    spec('F18a : 2eˣ + x² − 3x + 1', 0, {'a': '2', 'bb': '1', 'b': '1', 'c': '-3', 'd': '1'},
         'correct', ['-x+3']),
    spec('F18a : e⁰ = 0', 0, {'a': '2', 'bb': '1', 'b': '1', 'c': '-3', 'd': '1'}, 'incorrect',
         ['-x+1'],
         '$f\\left( 0 \\right) = 2 \\exponentialE^0 + 1 = 3$ : $\\exponentialE^0 = 1$, pas $0$.'),
    spec('F18a : dérivée de a·eˣ oubliée', 0, {'a': '2', 'bb': '1', 'b': '1', 'c': '-3', 'd': '1'},
         'incorrect', ['-3x+3']),
    spec('F18a : f(0) oublié', 0, {'a': '2', 'bb': '1', 'b': '1', 'c': '-3', 'd': '1'},
         'incorrect', ['-x']),
    spec('F18a : a < 0', 0, {'a': '-1', 'bb': '2', 'b': '-2', 'c': '4', 'd': '0'}, 'correct',
         ['3x-1']),
    # a = 1, b = 1, c = 0, d = −2, x0 = 1 : f = x⁴ + x² − 2, f(1) = 0, f′(1) = 6 → 6x − 6
    spec('F18b : x⁴ + x² − 2 en 1', 1,
         {'a': '1', 'bb': '1', 'b': '1', 'c': '0', 'd': '-2', 'x0': '1', 'm': '6', 'y0': '0'},
         'correct', ['6x-6']),
    spec('F18b : forme non réduite', 1,
         {'a': '1', 'bb': '1', 'b': '1', 'c': '0', 'd': '-2', 'x0': '1', 'm': '6', 'y0': '0'},
         'bad_form', ['6(x-1)'], violations=['form']),
    spec('F18b : signe de x₀', 1,
         {'a': '1', 'bb': '1', 'b': '1', 'c': '0', 'd': '-2', 'x0': '1', 'm': '6', 'y0': '0'},
         'incorrect', ['6x+6']),
    spec('F18b : f et f′ échangés', 1,
         {'a': '1', 'bb': '1', 'b': '1', 'c': '0', 'd': '-2', 'x0': '1', 'm': '6', 'y0': '0'},
         'incorrect', ['6']),
]


ajouter('50feeefd', [F1_A, F1_B], SPECS_50)
ajouter('f52b93c4', [F2_A, F2_B], SPECS_F5)
ajouter('e3e19d28', [F8], SPECS_E3)
ajouter('225c8682', [F9], SPECS_22)
ajouter('cfd13223', [F10], SPECS_CF)
ajouter('37ce7759', [F12_C, F13], SPECS_37)
ajouter('98f9d4b2', [F14], SPECS_98)
ajouter('eeb72d3a', [F15_A, F15_B], SPECS_EE)
ajouter('08f9ad7b', [F16], SPECS_08)
ajouter('c4775a3a', [F17], SPECS_C4)
ajouter('e814175b', [F18_A, F18_B], SPECS_E8)
