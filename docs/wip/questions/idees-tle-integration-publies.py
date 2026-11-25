"""Ajoute les variations validées aux 7 modèles publiés exportés de prod dans
scripts/questions/idees-tle-integration-publies/ (chantier idees-tle-integration).

Phase 0 validée par David le 2026-11-25 (« je suis tes recos » ; fiches
docs/wip/idees-tle-integration-fiches.md) : F2 (3dbc5a7b), F3 (2d480f3d), F4 (fe25be0a, +2),
F5 et F6 (b52c53d8), F8 (74da1cd6), F9 (fc2ea212, +3), F10 (6035aa61). Les variations s'ajoutent
À LA FIN (les réponses des élèves gardent l'indice de leur variation) ; la migration de contenu est
générée par scripts/questions/migration-contenu.ts.

Le script repart du contenu de prod (variations et specs d'origine, comptées dans ORIGINE) :
le relancer réécrit les ajouts sans les doubler. Variable `x` = 'x|x' : `{{eval:…}}` garde x en
lettre. ⛔ Jamais de variable `e` (Euler).

Usage : python3 docs/wip/questions/idees-tle-integration-publies.py scripts/questions/idees-tle-integration-publies
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
X = {'name': 'x', 'expression': 'x|x'}

# id court → (variations, specs) d'origine en prod (export du 2026-11-25)
ORIGINE = {'3dbc5a7b': (3, 13), '2d480f3d': (3, 15), 'fe25be0a': (5, 29), 'b52c53d8': (5, 23),
           '74da1cd6': (3, 12), 'fc2ea212': (4, 14), '6035aa61': (4, 12)}


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


def case(attendue, erreurs=None, **extra):
    c = {'expectedAnswer': attendue, **extra}
    if erreurs:
        c['expectedErrors'] = erreurs
    return c


def variation(statement, variables, blanks, steps, hint, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': blanks, 'correction': {'steps': steps}, 'hint': hint}


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


def coef(v):
    """Coefficient devant une lettre : 1 → rien, −1 → −."""
    return '{{if:' + v + '==1||{{if:' + v + '==-1|-|{{' + v + '}}}}}}'


# =============================================================================================
# F2 — 3dbc5a7b (TSPE-602) : TSA7-11. f(x) = c/(x + a)² sur ]−a ; +∞[ ; F(x) = (dx + k)/(x + a)
# est une primitive ssi F − G est constante, G(x) = −c/(x + a). F(x) = d + (k − da)/(x + a), donc
# k = da − c.
# =============================================================================================

DEN = 'x{{a;+}}'
F2 = variation(
    'Soit $f$ la fonction définie sur $\\left]{{eval:-a}}\\,;+\\infty\\right[$ par $f(x)='
    '{{if:c<0|-}}\\dfrac{ {{eval:abs(c)}} }{\\left(' + DEN + '\\right)^2}$.\n\n'
    'Détermine le réel $k$ tel que la fonction $F$ définie par $F(x)=\\dfrac{ {{d}}x+k}{' + DEN
    + '}$ soit une primitive de $f$ sur $\\left]{{eval:-a}}\\,;+\\infty\\right[$.\n\n$k=?$',
    [var('a', '1..5;±'), var('c', '1..5;±'), var('d', '2..5;±')],
    [case('{{eval:d*a-c}}', [
        erreur('{{eval:-c}}',
               '$G(x)={{if:c>0|-}}\\dfrac{ {{eval:abs(c)}} }{' + DEN + '}$ est bien une primitive de $f$, mais '
               '$F$ s\'écrit autrement : $F(x)={{d}}+\\dfrac{k{{eval:-d*a;+}}}{' + DEN + '}$.',
               'Primitive du cours recopiée'),
        erreur('{{c}}',
               'Une primitive de $\\dfrac{1}{u^2}$ est $-\\dfrac{1}{u}$ : attention au signe.',
               'Signe'),
        erreur('{{eval:d*a+c}}',
               'Dérive $F$ : $F\'(x)=\\dfrac{ {{d}}\\left(' + DEN + '\\right)-\\left({{d}}x+k\\right)}'
               '{\\left(' + DEN + '\\right)^2}$. Le numérateur doit être égal à ${{c}}$.', 'Signe de c'),
    ])],
    [
        'Une primitive de $f$ est $G(x)={{if:c>0|-}}\\dfrac{ {{eval:abs(c)}} }{' + DEN + '}$, car une '
        'primitive de $\\dfrac{1}{u^2}$ est $-\\dfrac{1}{u}$.',
        '$F(x)=\\dfrac{ {{d}}\\left(' + DEN + '\\right)+k{{eval:-d*a;+}}}{' + DEN + '}={{d}}+'
        '\\dfrac{k{{eval:-d*a;+}}}{' + DEN + '}$.',
        'Deux primitives de $f$ diffèrent d\'une constante : $F-G={{d}}+\\dfrac{k{{eval:c-d*a;+}}}{'
        + DEN + '}$ doit être constante, donc $k{{eval:c-d*a;+}}=0$.',
        '$k=' + PRIMAIRE + '{ {{eval:d*a-c}} }$.',
    ],
    'Cherche une primitive $G$ de $f$, puis écris $F(x)$ sous la forme « nombre $+$ fraction » : '
    '$F-G$ doit être constante.',
)
# a = 2, c = 3, d = 4 : k = 8 − 3 = 5
V2 = {'a': '2', 'c': '3', 'd': '4'}
SPECS_3D = [
    spec('F2 : a = 2, c = 3, d = 4 → 5', 0, V2, 'correct', ['5']),
    spec('F2 : primitive du cours recopiée', 0, V2, 'incorrect', ['-3']),
    spec('F2 : signe', 0, V2, 'incorrect', ['3']),
    spec('F2 : signe de c', 0, V2, 'incorrect', ['11']),
    spec('F2 : a = −3, c = −2, d = 2 → −4', 0, {'a': '-3', 'c': '-2', 'd': '2'}, 'correct',
         ['-4']),
]


# =============================================================================================
# F3 — 2d480f3d (TSPE-468) : TSA7-13. f(x) = e^(ax + b), F(0) = c :
# F(x) = (1/a)e^(ax + b) + c − e^b/a.
# =============================================================================================

EXPO = '{{a}}x{{b;+}}'
EB = '{{if:b==1|e|e^{ {{b}} }}}'
CST3 = '{{if:a>0|-|+}}\\frac{' + EB + '}{ {{eval:abs(a)}} }'
F3 = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=e^{' + EXPO + '}$.\n\nDétermine la '
    'primitive $F$ de $f$ sur $\\mathbb{R}$ telle que $F(0)={{c}}$.\n\n$F(x)=?$',
    [var('a', '2..4;±'), var('b', '1..3;±'), var('c', '-5..5')],
    [case('{{eval:1/a}}e^{' + EXPO + '}{{if:c!=0|{{c;+}}}}' + CST3, [
        erreur('{{eval:1/a}}e^{' + EXPO + '}{{if:c!=0|{{c;+}}}}',
               '$F(0)={{eval:1/a}}' + EB + '+k$ : $' + EB + '$ ne vaut pas $1$, la constante '
               'n\'est pas ${{c}}$.', 'Constante = F(0)'),
        erreur('{{a}}e^{' + EXPO + '}{{if:c!=0|{{c;+}}}}{{if:a>0|-|+}}{{eval:abs(a)}}' + EB,
               'Dérive ${{a}}e^{' + EXPO + '}$ : on obtient ${{eval:a*a}}e^{' + EXPO + '}$, pas '
               '$f(x)$. Une primitive de $e^{ax+b}$ est $\\dfrac{1}{a}e^{ax+b}$.', 'a au lieu de 1/a'),
        erreur('{{eval:1/a}}e^{' + EXPO + '}{{if:c!=0|{{c;+}}}}{{if:a>0|+|-}}\\frac{' + EB + '}'
               '{ {{eval:abs(a)}} }',
               '$F(0)={{eval:1/a}}' + EB + '+k={{c}}$, donc $k={{c}}' + CST3 + '$ : attention au '
               'signe.', 'Signe de la constante'),
    ])],
    [
        'Avec $u(x)=' + EXPO + '$, $u\'(x)={{a}}$ : $f={{eval:1/a}}u\'e^{u}$, de primitive '
        '${{eval:1/a}}e^{u}$. Les primitives de $f$ sont les fonctions $F(x)={{eval:1/a}}'
        'e^{' + EXPO + '}+k$, $k\\in\\mathbb{R}$.',
        '$F(0)={{eval:1/a}}' + EB + '+k={{c}}$, donc $k={{c}}' + CST3 + '$.',
        '$F(x)=' + PRIMAIRE + '{ {{eval:1/a}}e^{' + EXPO + '}{{if:c!=0|{{c;+}}}}' + CST3 + '}$.',
    ],
    'Cherche une primitive de la forme $\\lambda e^{' + EXPO + '}$ en dérivant, puis utilise '
    '$F(0)={{c}}$ pour trouver la constante.',
)
# a = 2, b = 1, c = 3 : F = ½e^(2x+1) + 3 − e/2
V3 = {'a': '2', 'b': '1', 'c': '3'}
SPECS_2D = [
    spec('F3 : a = 2, b = 1, c = 3', 0, V3, 'correct', ['\\frac{1}{2}e^{2x+1}+3-\\frac{e}{2}']),
    spec('F3 : autre écriture', 0, V3, 'correct', ['\\frac{e^{2x+1}-e}{2}+3']),
    spec('F3 : constante = F(0)', 0, V3, 'incorrect', ['\\frac{1}{2}e^{2x+1}+3']),
    spec('F3 : a au lieu de 1/a', 0, V3, 'incorrect', ['2e^{2x+1}+3-2e']),
    spec('F3 : signe de la constante', 0, V3, 'incorrect', ['\\frac{1}{2}e^{2x+1}+3+\\frac{e}{2}']),
    spec('F3 : a = −3, b = −2, c = 0', 0, {'a': '-3', 'b': '-2', 'c': '0'}, 'correct',
         ['-\\frac{1}{3}e^{-3x-2}+\\frac{e^{-2}}{3}']),
]


# =============================================================================================
# F4 — fe25be0a (TSPE-467) : TSA7-14, TSA7-20. f(x) = ax² + bx + c, a non multiple de 3, b impair :
# coefficients a/3 et b/2. a : une primitive (case « primitive », constante libre) ; b : F(0) = y₀.
# =============================================================================================

POLY = '{{eval:a*x^2+b*x+c}}'
PRIM = '{{eval:a/3*x^3+b/2*x^2+c*x}}'
ERR_F4 = [
    erreur('{{eval:a*x^3+b/2*x^2+c*x}}',
           'Dérive ton résultat : $(x^3)\'=3x^2$. Une primitive de $x^2$ est $\\dfrac{x^3}{3}$.',
           'a au lieu de a/3'),
    erreur('{{eval:a/3*x^3+b*x^2+c*x}}',
           'Dérive ton résultat : $(x^2)\'=2x$. Une primitive de $x$ est $\\dfrac{x^2}{2}$.',
           'b au lieu de b/2'),
    erreur('{{eval:2*a*x+b}}', 'Tu as dérivé $f$ : on cherche $F$ telle que $F\'=f$.', 'Dérivée'),
]
VARS_F4 = [X, var('a', '-5|-4|-2|-1|1|2|4|5'), var('b', '-7|-5|-3|-1|1|3|5|7'), var('c', '1..6;±')]

F4_A = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=' + POLY + '$.\n\nDonne une '
    'primitive $F$ de $f$ sur $\\mathbb{R}$.\n\n$F(x)=?$',
    VARS_F4,
    [case(PRIM, integrand=POLY, answerKind='primitive')],
    [
        'On cherche une primitive terme à terme : une primitive de $x^2$ est $\\dfrac{x^3}{3}$, '
        'une primitive de $x$ est $\\dfrac{x^2}{2}$, une primitive de $1$ est $x$.',
        'Une primitive de $f$ est $F(x)=' + PRIMAIRE + '{' + PRIM + '}$ (à une constante près).',
    ],
    'Prends une primitive de chaque terme : $x^n$ a pour primitive $\\dfrac{x^{n+1}}{n+1}$.',
)

F4_B = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=' + POLY + '$.\n\nDétermine la '
    'primitive $F$ de $f$ sur $\\mathbb{R}$ telle que $F(0)={{y0}}$.\n\n$F(x)=?$',
    VARS_F4 + [var('y0', '1..6;±')],
    [case('{{eval:a/3*x^3+b/2*x^2+c*x+y0}}', [
        erreur('{{eval:a*x^3+b/2*x^2+c*x+y0}}', ERR_F4[0]['message'], 'a au lieu de a/3'),
        erreur('{{eval:a/3*x^3+b*x^2+c*x+y0}}', ERR_F4[1]['message'], 'b au lieu de b/2'),
        erreur(PRIM, 'Tu as oublié la condition $F(0)={{y0}}$ : ajoute la bonne constante.',
               'Condition oubliée'),
    ])],
    [
        'Les primitives de $f$ sont les fonctions $F(x)=' + PRIM + '+k$, $k\\in\\mathbb{R}$.',
        '$F(0)=k={{y0}}$.',
        '$F(x)=' + PRIMAIRE + '{ {{eval:a/3*x^3+b/2*x^2+c*x+y0}} }$.',
    ],
    'Prends une primitive de chaque terme ($x^n$ a pour primitive $\\dfrac{x^{n+1}}{n+1}$), puis '
    'règle la constante avec $F(0)$.',
)
# a = 2, b = 3, c = −1 : f = 2x² + 3x − 1, F = 2/3 x³ + 3/2 x² − x
V4 = {'a': '2', 'b': '3', 'c': '-1'}
SPECS_FE = [
    spec('F4a : 2x² + 3x − 1', 0, V4, 'correct', ['\\frac{2}{3}x^3+\\frac{3}{2}x^2-x']),
    spec('F4a : constante ajoutée acceptée', 0, V4, 'correct',
         ['\\frac{2}{3}x^3+\\frac{3}{2}x^2-x+4']),
    spec('F4a : écriture en fraction', 0, V4, 'correct', ['\\frac{2x^3}{3}+\\frac{3x^2}{2}-x']),
    spec('F4a : a au lieu de a/3', 0, V4, 'incorrect', ['2x^3+\\frac{3}{2}x^2-x']),
    spec('F4a : b au lieu de b/2', 0, V4, 'incorrect', ['\\frac{2}{3}x^3+3x^2-x']),
    spec('F4a : dérivée', 0, V4, 'incorrect', ['4x+3']),
    spec('F4b : F(0) = 5', 1, {**V4, 'y0': '5'}, 'correct',
         ['\\frac{2}{3}x^3+\\frac{3}{2}x^2-x+5']),
    spec('F4b : condition oubliée', 1, {**V4, 'y0': '5'}, 'incorrect',
         ['\\frac{2}{3}x^3+\\frac{3}{2}x^2-x']),
    spec('F4b : a au lieu de a/3', 1, {**V4, 'y0': '5'}, 'incorrect', ['2x^3+\\frac{3}{2}x^2-x+5']),
]


# =============================================================================================
# F5 — b52c53d8 (TSPE-487) : TSA8-21. ∫ₘⁿ (3ax² + 2bx + c) dx, m ∈ {−2, −1}, n ∈ {1, 2} :
# F = ax³ + bx² + cx, résultat entier.
# F6 — b52c53d8 : TSA8-22. ∫ c/(cx + d) entre lo et hi, cx + d > 0 : ln(q/p), p = c·lo + d,
# q = c·hi + d. d = p − c·lo.
# =============================================================================================

VAL5 = '{{eval:a*(n^3-m^3)+b*(n^2-m^2)+c*(n-m)}}'
F5 = variation(
    'Calcule la valeur exacte de $\\displaystyle\\int_{ {{m}} }^{ {{n}} }\\left('
    '{{eval:3*a*x^2+2*b*x+c}}\\right)\\mathrm{d}x$.\n\n$?$',
    [X, var('a', '1..4;±'), var('b', '1..4;±'), var('c', '1..4;±'), var('m', '-2|-1'),
     var('n', '1|2')],
    [case(VAL5, [
        erreur('{{eval:-(a*(n^3-m^3)+b*(n^2-m^2)+c*(n-m))}}',
               'On calcule $F({{n}})-F({{m}})$ : la borne du haut moins la borne du bas.',
               'F(a) − F(b)'),
        erreur('{{eval:a*n^3+b*n^2+c*n}}',
               'Tu as oublié de retrancher $F({{m}})$, qui ne vaut pas $0$.', 'F(a) oublié'),
        erreur('{{eval:a*(n^3-abs(m)^3)+b*(n^2-m^2)+c*(n-m)}}',
               'Attention aux puissances d\'un nombre négatif : $({{m}})^3={{eval:m^3}}$.',
               'Signe de m³'),
    ])],
    [
        'Une primitive de $x\\mapsto {{eval:3*a*x^2+2*b*x+c}}$ est $F(x)={{eval:a*x^3+b*x^2+c*x}}$.',
        '$F({{n}})={{eval:a*n^3+b*n^2+c*n}}$ et $F({{m}})={{eval:a*m^3+b*m^2+c*m}}$.',
        '$\\displaystyle\\int_{ {{m}} }^{ {{n}} }\\left({{eval:3*a*x^2+2*b*x+c}}\\right)\\mathrm{d}x'
        '=F({{n}})-F({{m}})=' + PRIMAIRE + '{' + VAL5 + '}$.',
    ],
    'Cherche une primitive $F$ terme à terme, puis calcule $F({{n}})-F({{m}})$ en faisant '
    'attention aux puissances de ${{m}}$.',
    ['a*(n^3-m^3)+b*(n^2-m^2)+c*(n-m) != 0'],
)

COEF_C = '{{if:c==1|x|{{c}}x}}'
F6 = variation(
    'Calcule la valeur exacte de $\\displaystyle\\int_{ {{lo}} }^{ {{hi}} }\\dfrac{ {{c}} }{'
    + COEF_C + '{{eval:p-c*lo;+}}}\\,\\mathrm{d}x$.\n\n$?$',
    [var('c', '1..4'), var('lo', '0..3'), var('p', '1..4'), var('h', '1..3'),
     var('hi', 'eval:lo+h'), var('q', 'eval:p+c*h')],
    [case('\\ln\\left({{eval:q/p}}\\right)', [
        erreur('\\ln\\left({{eval:p/q}}\\right)',
               'On calcule $F({{hi}})-F({{lo}})$ : $\\ln({{q}})-\\ln({{p}})$, pas l\'inverse.',
               'Bornes inversées'),
        erreur('{{c}}\\ln\\left({{eval:q/p}}\\right)',
               'Le numérateur ${{c}}$ est la dérivée du dénominateur : $f=\\dfrac{u\'}{u}$, de '
               'primitive $\\ln(u)$, sans facteur ${{c}}$.', 'Facteur c'),
        erreur('\\ln({{q}})',
               'Tu as oublié de retrancher $F({{lo}})=\\ln({{p}})$, qui ne vaut pas $0$.',
               'F(a) oublié'),
    ])],
    [
        'Avec $u(x)=' + COEF_C + '{{eval:p-c*lo;+}}$, $u\'(x)={{c}}$ : la fonction intégrée est '
        '$\\dfrac{u\'}{u}$, et $u>0$ sur $\\left[{{lo}}\\,;{{hi}}\\right]$ ($u({{lo}})={{p}}$, $u$ '
        'croissante). Une primitive est $F(x)=\\ln\\left(u(x)\\right)$.',
        '$F({{hi}})-F({{lo}})=\\ln({{q}})-\\ln({{p}})=' + PRIMAIRE
        + '{\\ln\\left({{eval:q/p}}\\right)}$.',
    ],
    'Compare le numérateur à la dérivée du dénominateur : tu reconnais la forme $\\dfrac{u\'}{u}$.',
    ['p != c*lo', 'p != q'],
)
# F5 : a = 1, b = −1, c = 2, m = −1, n = 2 : F = x³ − x² + 2x ; F(2) = 8, F(−1) = −4 → 12
V5 = {'a': '1', 'b': '-1', 'c': '2', 'm': '-1', 'n': '2'}
# F6 : c = 2, lo = 1, p = 1 (d = −1), h = 2 (hi = 3), q = 5 → ln 5
V6 = {'c': '2', 'lo': '1', 'p': '1', 'h': '2', 'hi': '3', 'q': '5'}
V6B = {'c': '3', 'lo': '0', 'p': '2', 'h': '2', 'hi': '2', 'q': '8'}
SPECS_B5 = [
    spec('F5 : 3x² − 2x + 2 sur [−1 ; 2] → 12', 0, V5, 'correct', ['12']),
    spec('F5 : F(a) − F(b)', 0, V5, 'incorrect', ['-12']),
    spec('F5 : F(a) oublié', 0, V5, 'incorrect', ['8']),
    spec('F5 : signe de m³', 0, V5, 'incorrect', ['10']),
    spec('F6 : 2/(2x − 1) sur [1 ; 3] → ln 5', 1, V6, 'correct', ['\\ln(5)']),
    spec('F6 : bornes inversées', 1, V6, 'incorrect', ['\\ln\\left(\\frac{1}{5}\\right)']),
    spec('F6 : facteur c', 1, V6, 'incorrect', ['2\\ln(5)']),
    spec('F6 : 3/(3x + 2) sur [0 ; 2] → ln 4', 1, V6B, 'correct', ['\\ln(4)']),
    spec('F6 : ln 8 − ln 2 accepté', 1, V6B, 'correct', ['\\ln(8)-\\ln(2)']),
    spec('F6 : 2 ln 2 accepté', 1, V6B, 'correct', ['2\\ln(2)']),
    spec('F6 : F(a) oublié', 1, V6B, 'incorrect', ['\\ln(8)']),
]


# =============================================================================================
# F8 — 74da1cd6 (TSPE-481) : TSA8-10, la réciproque de la positivité est fausse. f(x) = x − p sur
# [0 ; 3p] : ∫ = 3p²/2 > 0, mais f(0) = −p < 0. Choix 0 = la bonne (ordre mélangé à l'affichage).
# =============================================================================================

F8 = variation(
    'Soit $f$ la fonction définie sur $\\left[0\\,;{{eval:3*p}}\\right]$ par $f(x)=x-{{p}}$. On '
    'admet que $\\displaystyle\\int_0^{ {{eval:3*p}} }f(x)\\,\\mathrm{d}x={{eval:3*p*p/2}}$.\n\n'
    'Que peut-on affirmer ?\n\n'
    + bloc('choix',
           '- $f$ n\'est pas positive sur $\\left[0\\,;{{eval:3*p}}\\right]$, bien que son intégrale '
           'soit positive',
           '- $f$ est positive sur $\\left[0\\,;{{eval:3*p}}\\right]$, puisque son intégrale est '
           'positive',
           '- Il y a une erreur : une fonction qui prend des valeurs négatives a une intégrale '
           'négative',
           '- $f$ est négative sur $\\left[0\\,;{{eval:3*p}}\\right]$'),
    [var('p', '1..3')],
    [case('0')],
    [
        '$f(0)=-{{p}}<0$ : $f$ n\'est pas positive sur $\\left[0\\,;{{eval:3*p}}\\right]$, alors que '
        'son intégrale est positive.',
        'La positivité de l\'intégrale ne marche que dans un sens : $f\\geqslant 0\\Rightarrow'
        '\\displaystyle\\int_a^bf\\geqslant 0$ (avec $a\\leqslant b$). La réciproque est fausse : '
        'ici l\'aire au-dessus de l\'axe (sur $\\left[{{p}}\\,;{{eval:3*p}}\\right]$) l\'emporte sur '
        'l\'aire en dessous (sur $\\left[0\\,;{{p}}\\right]$).',
        'Réponse : $' + PRIMAIRE + '{f\\text{ n\'est pas positive, bien que son intégrale le '
        'soit}}$.',
    ],
    'Calcule $f(0)$. Que dit exactement la propriété de positivité de l\'intégrale, et dans quel '
    'sens ?',
)
SPECS_74 = [
    spec('F8 : p = 2 → choix 0', 0, {'p': '2'}, 'correct', ['0']),
    spec('F8 : réciproque', 0, {'p': '2'}, 'incorrect', ['1']),
    spec('F8 : erreur supposée', 0, {'p': '2'}, 'incorrect', ['2']),
    spec('F8 : négative', 0, {'p': '1'}, 'incorrect', ['3']),
]


# =============================================================================================
# F9 — fc2ea212 (TSPE-488) : TSA8-41, intégration par parties avec un facteur affine u = ax + b.
# a : ∫₀¹ (ax + b)e^(kx) = e^k[(a + b)/k − a/k²] + a/k² − b/k.
# b : ∫₀^(π/2) (ax + b)cos x = aπ/2 + b − a.
# c : ∫₁ᵉ (ax + b)ln x = a(e² + 1)/4 + b, a pair.
# =============================================================================================

AFF = coef('a') + 'x{{b;+}}'
EK = '{{if:k==1|e|e^{ {{k}} }}}'
KX = '{{if:k==1|x|{{if:k==-1|-x|{{k}}x}}}}'
INVK = '{{if:k==1||{{if:k==-1|-|{{eval:1/k}}}}}}'
# Constante d'abord : « 3e-1 » se lirait 3 × 10⁻¹ (écriture scientifique)
CC = '{{eval:a/k^2-b/k}}'
CE = '{{if:(a+b)*k-a==k*k|+|{{if:(a+b)*k-a==-k*k|-|{{eval:(a+b)/k-a/k^2;+}}}}}}'
F9_A = variation(
    'À l\'aide d\'une intégration par parties, calcule la valeur exacte de $\\displaystyle'
    '\\int_{0}^{1}\\left(' + AFF + '\\right)e^{' + KX + '}\\,\\mathrm{d}x$.'
    '\n\n$?$',
    [var('a', '1..3;±'), var('b', '1..3;±'), var('k', '1|2;±')],
    [case(CC + CE + EK, [
        erreur('{{eval:-b/k}}{{eval:(a+b)/k;+}}' + EK,
               'Tu as oublié le second terme : $\\displaystyle\\int u\'v=\\big[uv\\big]-\\int uv\'$.',
               'Intégrale oubliée'),
        erreur('{{eval:-a/k^2-b/k}}{{eval:(a+b)/k+a/k^2;+}}' + EK,
               'Attention au signe : $\\displaystyle\\int_0^1 u v\'=\\big[uv\\big]_0^1-\\int_0^1 u\'v$, '
               'avec un moins devant la seconde intégrale.', 'Signe'),
    ])],
    [
        'On pose $u(x)=' + AFF + '$ et $v\'(x)=e^{' + KX + '}$ : $u\'(x)={{a}}$ et $v(x)='
        + INVK + 'e^{' + KX + '}$.',
        '$\\displaystyle\\int_{0}^{1}u v\'=\\big[u v\\big]_0^1-\\int_0^1 u\'v=\\left[' + INVK + '\\left('
        + AFF + '\\right)e^{' + KX + '}\\right]_0^1-{{eval:a/k;()}}\\int_0^1e^{' + KX + '}\\,\\mathrm{d}x$.',
        '$=\\left({{eval:(a+b)/k}}' + EK + '{{eval:-b/k;+}}\\right)-{{eval:a/k^2;()}}\\left(' + EK
        + '-1\\right)=' + PRIMAIRE + '{' + CC + CE + EK + '}$.',
    ],
    'Dérive le facteur affine et cherche une primitive de l\'exponentielle (attention au facteur '
    '$\\dfrac{1}{ {{k}} }$).',
    ['(a+b)*k-a != 0', 'a-b*k != 0'],
)

PIA = ('{{if:a==1|\\frac{\\pi}{2}}}{{if:a==-1|-\\frac{\\pi}{2}}}{{if:a==2|\\pi}}{{if:a==-2|-\\pi}}'
       '{{if:a==3|\\frac{3\\pi}{2}}}{{if:a==-3|-\\frac{3\\pi}{2}}}')
F9_B = variation(
    'À l\'aide d\'une intégration par parties, calcule la valeur exacte de $\\displaystyle'
    '\\int_{0}^{\\frac{\\pi}{2}}\\left(' + AFF + '\\right)\\cos(x)\\,\\mathrm{d}x$.\n\n$?$',
    [var('a', '1..3;±'), var('b', '1..3;±')],
    [case(PIA + '{{eval:b-a;+}}', [
        erreur(PIA + '{{b;+}}',
               'Tu as oublié le second terme : $\\displaystyle\\int u\'v=\\big[uv\\big]-\\int uv\'$.',
               'Intégrale oubliée'),
        erreur(PIA + '{{eval:b+a;+}}',
               'Une primitive de $\\sin$ est $-\\cos$ : $\\displaystyle\\int_0^{\\frac{\\pi}{2}}'
               '\\sin(x)\\,\\mathrm{d}x=1$, et le second terme est retranché.', 'Signe'),
    ])],
    [
        'On pose $u(x)=' + AFF + '$ et $v\'(x)=\\cos(x)$ : $u\'(x)={{a}}$ et $v(x)=\\sin(x)$.',
        '$\\displaystyle\\int_{0}^{\\frac{\\pi}{2}}u v\'=\\left[\\left(' + AFF + '\\right)\\sin(x)'
        '\\right]_0^{\\frac{\\pi}{2}}-{{a;()}}\\int_0^{\\frac{\\pi}{2}}\\sin(x)\\,\\mathrm{d}x='
        '\\left(' + PIA + '{{b;+}}\\right)-{{a;()}}\\big[-\\cos(x)\\big]_0^{\\frac{\\pi}{2}}$.',
        '$=\\left(' + PIA + '{{b;+}}\\right)-{{a;()}}\\times 1=' + PRIMAIRE + '{' + PIA
        + '{{eval:b-a;+}}}$.',
    ],
    'Dérive le facteur affine et prends une primitive de $\\cos$ ; n\'oublie pas le moins devant la '
    'seconde intégrale.',
    ['b != a'],
)

def cf(expr):
    """Coefficient calculé devant une lettre : 1 → rien, −1 → −."""
    return ('{{if:' + expr + '==1||{{if:' + expr + '==-1|-|{{eval:' + expr + '}}}}}}')


def cfs(expr):
    """Coefficient signé (terme qui suit) : 1 → +, −1 → −."""
    return ('{{if:' + expr + '==1|+|{{if:' + expr + '==-1|-|{{eval:' + expr + ';+}}}}}}')


U9 = '{{eval:a/2*x^2+b*x}}'
UE9 = cf('a/2') + 'e^2' + cfs('b') + 'e'
VAL9C = cf('a/4') + 'e^{2}{{eval:a/4+b;+}}'
F9_C = variation(
    'À l\'aide d\'une intégration par parties, calcule la valeur exacte de $\\displaystyle'
    '\\int_{1}^{e}\\left(' + AFF + '\\right)\\ln(x)\\,\\mathrm{d}x$.\n\n$?$',
    [X, var('a', '2|4;±'), var('b', '1..3;±')],
    [case(VAL9C, [
        erreur(UE9,
               'Tu as oublié le second terme : $\\displaystyle\\int u\'v=\\big[uv\\big]-\\int uv\'$.',
               'Intégrale oubliée'),
        erreur(cf('a/2') + 'e^{2}{{eval:a/4+b;+}}',
               'Le crochet vaut $\\left[\\left(' + U9 + '\\right)\\ln(x)\\right]_1^e=' + UE9
               + '$ : vérifie le calcul de $\\displaystyle\\int_1^e\\left({{eval:a/2*x+b}}\\right)'
               '\\mathrm{d}x$.', 'Seconde intégrale'),
    ])],
    [
        'On pose $u\'(x)=' + AFF + '$ et $v(x)=\\ln(x)$ : $u(x)=' + U9 + '$ et '
        '$v\'(x)=\\dfrac{1}{x}$ (on dérive le logarithme).',
        '$\\displaystyle\\int_1^e u\'v=\\left[\\left(' + U9 + '\\right)\\ln(x)\\right]_1^e'
        '-\\int_1^e\\left({{eval:a/2*x+b}}\\right)\\mathrm{d}x=\\left(' + UE9
        + '\\right)-\\left[{{eval:a/4*x^2+b*x}}\\right]_1^e$.',
        '$=\\left(' + UE9 + '\\right)-\\left(' + cf('a/4') + 'e^2' + cfs('b') + 'e'
        '{{eval:-a/4-b;+}}\\right)=' + PRIMAIRE + '{' + VAL9C + '}$.',
    ],
    'Ici, c\'est le logarithme qu\'il faut dériver : prends une primitive du facteur affine.',
    ['a+4*b != 0'],
)
# a : a = 1, b = 1, k = 1 → ∫₀¹ (x + 1)eˣ = e (CE = 2 − 1 = 1, CC = 1 − 1 = 0 : exclu par la
# condition) ; prendre a = 2, b = 1, k = 1 : CE = 3 − 2 = 1, CC = 2 − 1 = 1 → e + 1
V9A = {'a': '2', 'b': '1', 'k': '1'}
# a = 1, b = −1, k = 2 : CE = 0/2 − 1/4 = −1/4, CC = 1/4 + 1/2 = 3/4
V9A2 = {'a': '1', 'b': '-1', 'k': '2'}
SPECS_FC = [
    spec('F9a : (2x + 1)eˣ → e + 1', 0, V9A, 'correct', ['e+1']),
    spec('F9a : intégrale oubliée', 0, V9A, 'incorrect', ['3e-1']),
    spec('F9a : signe', 0, V9A, 'incorrect', ['5e-3']),
    spec('F9a : (x − 1)e^(2x) → −e²/4 + 3/4', 0, V9A2, 'correct',
         ['-\\frac{1}{4}e^{2}+\\frac{3}{4}']),
    spec('F9a : forme factorisée acceptée', 0, V9A2, 'correct', ['\\frac{3-e^2}{4}']),
    # a = 1, b = 2, k = 1 : CE = 2, CC = −1 → 2e − 1, tapé dans l'ordre de l'élève
    spec('F9a : 2e − 1 dans l\'ordre de l\'élève', 0, {'a': '1', 'b': '2', 'k': '1'}, 'correct',
         ['2e-1']),
    spec('F9a : 2e − 1 avec \\exponentialE', 0, {'a': '1', 'b': '2', 'k': '1'}, 'correct',
         ['2\\exponentialE-1']),
    spec('F9b : (2x + 3)cos x → π + 1', 1, {'a': '2', 'b': '3'}, 'correct', ['\\pi+1']),
    spec('F9b : intégrale oubliée', 1, {'a': '2', 'b': '3'}, 'incorrect', ['\\pi+3']),
    spec('F9b : signe', 1, {'a': '2', 'b': '3'}, 'incorrect', ['\\pi+5']),
    spec('F9b : (−x + 2)cos x → −π/2 + 3', 1, {'a': '-1', 'b': '2'}, 'correct',
         ['3-\\frac{\\pi}{2}']),
    spec('F9c : (2x + 1)ln x → e²/2 + 3/2', 2, {'a': '2', 'b': '1'}, 'correct',
         ['\\frac{e^2+3}{2}']),
    spec('F9c : intégrale oubliée', 2, {'a': '2', 'b': '1'}, 'incorrect', ['e^2+e']),
    spec('F9c : seconde intégrale', 2, {'a': '2', 'b': '1'}, 'incorrect', ['e^2+\\frac{3}{2}']),
    spec('F9c : (−4x + 3)ln x → −e² + 2', 2, {'a': '-4', 'b': '3'}, 'correct', ['2-e^2']),
]


# =============================================================================================
# F10 — 6035aa61 (TSPE-491) : idée TSA1-48. Iₙ = ∫₁ᵉ (ln x)ⁿ dx décroissante : 0 ⩽ ln x ⩽ 1 sur
# [1 ; e]. Mêmes choix que v2 (0 = décroissante).
# =============================================================================================

F10 = variation(
    'Pour tout entier naturel $n$, on pose $I_n=\\displaystyle\\int_{1}^{e}\\left(\\ln x\\right)^n'
    '\\,\\mathrm{d}x$.\n\nQuel est le sens de variation de la suite $(I_n)$ ?\n\n'
    + bloc('choix', '- $(I_n)$ est décroissante', '- $(I_n)$ est croissante',
           '- $(I_n)$ est constante', '- On ne peut pas le savoir sans calculer $I_n$'),
    [],
    [case('0')],
    [
        '$I_{n+1}-I_n=\\displaystyle\\int_{1}^{e}(\\ln x)^n(\\ln x-1)\\,\\mathrm{d}x$ (linéarité).',
        'Sur $\\left[1\\,;e\\right]$, $\\ln x\\geqslant 0$ et $\\ln x\\leqslant\\ln e=1$ : la fonction '
        'intégrée est négative, et $1\\leqslant e$.',
        'Donc $I_{n+1}-I_n\\leqslant 0$ : $(I_n)$ est $' + PRIMAIRE + '{\\text{décroissante}}$.',
    ],
    'Compare $(\\ln x)^{n+1}$ et $(\\ln x)^n$ sur $\\left[1\\,;e\\right]$ : entre quelles valeurs '
    'est $\\ln x$ ?',
)
SPECS_60 = [
    spec('F10 : décroissante', 0, {}, 'correct', ['0']),
    spec('F10 : croissante', 0, {}, 'incorrect', ['1']),
    spec('F10 : constante', 0, {}, 'incorrect', ['2']),
    spec('F10 : sans calcul', 0, {}, 'incorrect', ['3']),
]


ajouter('3dbc5a7b', [F2], SPECS_3D)
ajouter('2d480f3d', [F3], SPECS_2D)
ajouter('fe25be0a', [F4_A, F4_B], SPECS_FE)
ajouter('b52c53d8', [F5, F6], SPECS_B5)
ajouter('74da1cd6', [F8], SPECS_74)
ajouter('fc2ea212', [F9_A, F9_B, F9_C], SPECS_FC)
ajouter('6035aa61', [F10], SPECS_60)
print('7 modèles complétés dans', DOSSIER)
