"""Ajoute les variations validées aux 9 modèles publiés exportés de prod dans
scripts/questions/idees-tle-ln-publies/ (chantier idees-tle-ln).

Phase 0 validée par David le 2026-11-24 (« je suis tes recos », fiches
docs/wip/idees-tle-ln-fiches.md) : F1 et F2 (ffd5c051), F3 a, F3 b et F5 (d3301f2d), F4 a et F4 b
(14036c68), F7 (f1963ef2), F8 a et F8 b (50feeefd), F10 a et F10 b (2cef3442), F11 a et F11 b
(7c8b341b), F12 (7f13ca89), F13 (e814175b, Q3 : oui). Les variations s'ajoutent À LA FIN (les
réponses des élèves gardent l'indice de leur variation) ; la migration de contenu est générée par
scripts/questions/migration-contenu.ts.

Le script repart du contenu de prod (variations et specs d'origine, comptées dans ORIGINE) :
le relancer réécrit les ajouts sans les doubler. Variable `x` = 'x|x' : `{{eval:…}}` garde x en
lettre. ⛔ Jamais de variable `e` (Euler).

Usage : python3 docs/wip/questions/idees-tle-ln-publies.py scripts/questions/idees-tle-ln-publies
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
X = {'name': 'x', 'expression': 'x|x'}

# id court → (variations, specs) d'origine en prod (export du 2026-11-24)
ORIGINE = {'ffd5c051': (5, 15), 'd3301f2d': (3, 11), '14036c68': (3, 18), 'f1963ef2': (3, 21),
           '50feeefd': (7, 29), '2cef3442': (2, 4), '7c8b341b': (3, 12), '7f13ca89': (4, 17),
           'e814175b': (6, 19)}


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
    if erreurs:
        c['expectedErrors'] = erreurs
    return c


VIDE = {'expectedAnswer': ''}


def variation(statement, variables, blanks, steps, hint, conditions=None, blank_defaults=None):
    v = {'statement': statement, 'variables': variables, 'conditions': conditions or [],
         'blanks': blanks, 'correction': {'steps': steps}, 'hint': hint}
    if blank_defaults is not None:
        v['blankDefaults'] = blank_defaults
    return v


def coef(v):
    """Coefficient devant une lettre : 1 → rien, −1 → −."""
    return '{{if:' + v + '==1||{{if:' + v + '==-1|-|{{' + v + '}}}}}}'


def coef_signe(v):
    """Coefficient signé après un terme : 1 → +, −1 → −, sinon ±|v|."""
    return '{{if:' + v + '==1|+|{{if:' + v + '==-1|-|{{' + v + ';+}}}}}}'


def puissance(n):
    """x, ou x^n."""
    return '{{if:' + n + '==1|x|x^{ {{' + n + '}} }}}'


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


# =============================================================================================
# ffd5c051 (TSPE-444) — F1 : ln d'un quotient ; F2 : exprimer en fonction de ln x
# =============================================================================================

F1 = variation(
    'Écris $\\ln\\dfrac{ {{eval:a^p}} }{ {{eval:b^q}} }$ en fonction de $\\ln {{a}}$ et '
    '$\\ln {{b}}$.\n\n$\\ln\\dfrac{ {{eval:a^p}} }{ {{eval:b^q}} }=?\\ln {{a}}+?\\ln {{b}}$',
    [var('a', '2|3'), var('b', '3|5'), var('p', '1..4'), var('q', '1..3')],
    [case('{{p}}', [
        erreur('{{eval:a^p}}', 'On demande le coefficient devant $\\ln {{a}}$ : écris '
               '${{eval:a^p}}$ comme une puissance de ${{a}}$, l\'exposant donne le coefficient.',
               'Nombre au lieu de l\'exposant'),
    ]),
     case('{{eval:-q}}', [
         erreur('{{q}}', '$\\ln\\dfrac{A}{B}=\\ln A-\\ln B$ : le coefficient de $\\ln {{b}}$ est '
                'négatif.', 'Signe oublié'),
         erreur('{{eval:-b^q}}', 'On demande le coefficient devant $\\ln {{b}}$ : écris '
                '${{eval:b^q}}$ comme une puissance de ${{b}}$.', 'Nombre au lieu de l\'exposant'),
     ])],
    [
        '${{eval:a^p}}={{if:p==1|{{a}}|{{a}}^{ {{p}} }}}$ et ${{eval:b^q}}={{if:q==1|{{b}}|'
        '{{b}}^{ {{q}} }}}$.',
        '$\\ln\\dfrac{A}{B}=\\ln A-\\ln B$ et $\\ln\\left(a^{n}\\right)=n\\ln a$ : '
        '$\\ln\\dfrac{ {{eval:a^p}} }{ {{eval:b^q}} }=' + PRIMAIRE + '{' + coef('p') + '\\ln {{a}}'
        '-' + coef('q') + '\\ln {{b}}}$.',
    ],
    'Écris le numérateur et le dénominateur comme des puissances, puis utilise '
    '$\\ln\\dfrac{A}{B}=\\ln A-\\ln B$.',
    ['a < b'],
)

F2 = variation(
    'Soit $x>0$. Écris $A=' + coef('a') + '\\ln\\left(x^{2}\\right)' + coef_signe('b')
    + '\\ln\\left(\\dfrac{1}{x}\\right)' + coef_signe('c') + '\\ln\\left(x^{3}\\right)$ sous la '
    'forme $k\\ln x$.\n\n$A=?\\ln x$',
    [var('a', '1..5;±'), var('b', '1..5;±'), var('c', '1..5;±'), var('k', 'eval:2*a-b+3*c')],
    [case('{{k}}', [
        erreur('{{eval:2*a+b+3*c}}', '$\\ln\\left(\\dfrac{1}{x}\\right)=-\\ln x$, pas $\\ln x$.',
               'ln(1/x) = ln x'),
        erreur('{{eval:a-b+c}}', '$\\ln\\left(x^{n}\\right)=n\\ln x$ : l\'exposant devient un '
               'coefficient.', 'Exposants oubliés'),
    ])],
    [
        '$\\ln\\left(x^{2}\\right)=2\\ln x$, $\\ln\\left(\\dfrac{1}{x}\\right)=-\\ln x$ et '
        '$\\ln\\left(x^{3}\\right)=3\\ln x$.',
        '$A={{eval:2*a}}\\ln x{{eval:-b;+}}\\ln x{{eval:3*c;+}}\\ln x=' + PRIMAIRE
        + '{' + coef('k') + '\\ln x}$.',
    ],
    'Ramène chaque terme à un multiple de $\\ln x$ : que valent $\\ln\\left(x^{n}\\right)$ et '
    '$\\ln\\left(\\dfrac{1}{x}\\right)$ ?',
    ['k != 0'],
)

SPECS_FF = [
    spec('F1 : ln(8/25) = 3 ln 2 − 2 ln 5', 0, {'a': '2', 'b': '5', 'p': '3', 'q': '2'}, 'correct',
         ['3', '-2']),
    spec('F1 : signe oublié', 0, {'a': '2', 'b': '5', 'p': '3', 'q': '2'}, 'incorrect', ['3', '2'],
         '$\\ln\\dfrac{A}{B}=\\ln A-\\ln B$ : le coefficient de $\\ln 5$ est négatif.'),
    spec('F1 : nombres au lieu des exposants', 0, {'a': '2', 'b': '5', 'p': '3', 'q': '2'},
         'incorrect', ['8', '-25']),
    spec('F1 : coefficients échangés', 0, {'a': '2', 'b': '5', 'p': '3', 'q': '2'}, 'incorrect',
         ['2', '-3']),
    # 3 ln(x²) − 2 ln(1/x) + ln(x³) = 6 + 2 + 3 = 11
    spec('F2 : 3, −2, 1 → 11', 1, {'a': '3', 'b': '-2', 'c': '1', 'k': '11'}, 'correct', ['11']),
    spec('F2 : ln(1/x) = ln x', 1, {'a': '3', 'b': '-2', 'c': '1', 'k': '11'}, 'incorrect', ['7'],
         '$\\ln\\left(\\dfrac{1}{x}\\right)=-\\ln x$, pas $\\ln x$.'),
    spec('F2 : exposants oubliés', 1, {'a': '3', 'b': '-2', 'c': '1', 'k': '11'}, 'incorrect',
         ['6']),
]

# =============================================================================================
# d3301f2d (TSPE-446) — F3 a : aˣ = b ; F3 b : aˣ = b sans calculatrice ; F5 : ln u = ln v
# =============================================================================================

LNBA = '\\dfrac{\\ln {{b}}}{\\ln {{a}}}'
F3_A = variation(
    'Résous dans $\\mathbb{R}$ l\'équation ${{a}}^{x}={{b}}$. Donne la valeur exacte.\n\n$x=?$',
    [var('a', '2|3|5|10'), var('b', '3..50'), var('r', 'eval:ln(b)/ln(a)')],
    [case(LNBA, [
        erreur('\\ln\\left(\\dfrac{ {{b}} }{ {{a}} }\\right)',
               '$\\ln\\left({{a}}^{x}\\right)=x\\ln {{a}}$ : on divise par $\\ln {{a}}$, on ne '
               'divise pas ${{b}}$ par ${{a}}$.', 'ln(b/a)'),
        erreur('\\dfrac{ {{b}} }{ {{a}} }', '${{a}}^{x}$ n\'est pas ${{a}}x$ : applique $\\ln$ aux '
               'deux membres.', 'b/a'),
        erreur('\\ln {{b}}-\\ln {{a}}', '$x\\ln {{a}}=\\ln {{b}}$ : on divise par $\\ln {{a}}$, on '
               'ne le soustrait pas.', 'ln b − ln a'),
    ])],
    [
        'Les deux membres sont strictement positifs ; $\\ln$ est strictement croissante : '
        '${{a}}^{x}={{b}}\\iff\\ln\\left({{a}}^{x}\\right)=\\ln {{b}}$.',
        '$\\ln\\left({{a}}^{x}\\right)=x\\ln {{a}}$, et $\\ln {{a}}>0$ : $x=' + PRIMAIRE + '{' + LNBA
        + '}$.',
    ],
    'Applique $\\ln$ aux deux membres : que vaut $\\ln\\left({{a}}^{x}\\right)$ ?',
    ['abs(r-round(r)) > 0.001'],
)

F3_B = variation(
    'Résous dans $\\mathbb{R}$, sans calculatrice, l\'équation ${{eval:m^u}}^{x}={{eval:m^v}}$. '
    'Donne la valeur exacte, simplifiée.\n\n$x=?$',
    [var('m', '2|3|5'), var('u', '2..4'), var('v', '2..5')],
    [dict(case('{{eval:v/u}}', [
        erreur('{{eval:u/v}}', '$x\\ln {{eval:m^u}}=\\ln {{eval:m^v}}$ : $x$ est le quotient '
               '$\\dfrac{\\ln {{eval:m^v}}}{\\ln {{eval:m^u}}}$, pas son inverse.', 'Inverse'),
        erreur('{{eval:m^v/m^u}}', 'On ne divise pas ${{eval:m^v}}$ par ${{eval:m^u}}$ : écris les '
               'deux nombres comme des puissances de ${{m}}$.', 'b/a'),
        erreur('{{eval:v-u}}', '$\\left({{m}}^{ {{u}} }\\right)^{x}={{m}}^{ {{u}}x}$ : les exposants '
               'se multiplient, ${{u}}x={{v}}$.', 'Différence des exposants'),
    ]), acceptDecimal=True)],
    [
        '${{eval:m^u}}={{m}}^{ {{u}} }$ et ${{eval:m^v}}={{m}}^{ {{v}} }$ : l\'équation s\'écrit '
        '${{m}}^{ {{u}}x}={{m}}^{ {{v}} }$.',
        'En appliquant $\\ln$ : ${{u}}x\\ln {{m}}={{v}}\\ln {{m}}$, donc ${{u}}x={{v}}$ et '
        '$x=' + PRIMAIRE + '{ {{eval:v/u}} }$.',
    ],
    'Écris les deux nombres comme des puissances d\'un même entier.',
    ['v/u != round(v/u)', 'm^v <= 3125', 'm^u <= 625'],
)

# F5 : ln(ax + b) = ln(cx + d), a, c > 0 : x₀ = (d − b)/(a − c) ; solution si ax₀ + b > 0, sinon ∅.
F5 = variation(
    'Résous dans $\\mathbb{R}$ l\'équation $\\ln\\left(' + coef('a') + 'x{{b;+}}\\right)=\\ln\\left('
    + coef('c') + 'x{{d;+}}\\right)$. Donne l\'ensemble $S$ des solutions ($\\emptyset$ s\'il n\'y en '
    'a pas).\n\n$S=?$',
    [var('a', '1..5'), var('b', '-9..9'), var('c', '1..5'), var('d', '-9..9'),
     var('x0', 'eval:(d-b)/(a-c)'), var('v', 'eval:a*(d-b)/(a-c)+b')],
    [case('{{if:v>0|\\left\\{ {{x0}} \\right\\}|\\emptyset}}', [
        erreur('\\left\\{ {{x0}} \\right\\}',
               'Pour $x={{x0}}$, $' + coef('a') + 'x{{b;+}}$ vaut ${{v}}$ : il n\'est pas strictement '
               'positif, $\\ln$ n\'y est pas défini. Vérifie toujours le domaine.',
               'Solution hors du domaine'),
        erreur('\\left\\{ {{eval:-x0}} \\right\\}', '$' + coef('a') + 'x{{b;+}}=' + coef('c')
               + 'x{{d;+}}\\iff {{eval:a-c}}x={{eval:d-b}}$ : vérifie le signe.', 'Signe'),
        erreur('\\emptyset', 'Pour $x={{x0}}$, les deux expressions valent ${{v}}>0$ : c\'est bien '
               'une solution.', 'Solution rejetée à tort'),
    ], kind='intervalles')],
    [
        '$\\ln$ est strictement croissante : $\\ln A=\\ln B\\iff A=B$, à condition que $A>0$ et '
        '$B>0$.',
        '$' + coef('a') + 'x{{b;+}}=' + coef('c') + 'x{{d;+}}\\iff {{eval:a-c}}x={{eval:d-b}}\\iff '
        'x={{x0}}$.',
        'Pour $x={{x0}}$, les deux expressions valent ${{v}}$, {{if:v>0|strictement positif : '
        '$x={{x0}}$ convient|qui n\'est pas strictement positif : $x={{x0}}$ ne convient pas}}.',
        '$S=' + PRIMAIRE + '{ {{if:v>0|\\left\\{ {{x0}} \\right\\}|\\emptyset}} }$.',
    ],
    '$\\ln A=\\ln B$ équivaut à $A=B$… mais seulement si $A$ et $B$ sont strictement positifs.',
    ['a != c', 'b != d', 'v != 0'],
)

SPECS_D3 = [
    spec('F3a : 2ˣ = 9', 0, {'a': '2', 'b': '9', 'r': '3.1699'}, 'correct', ['\\frac{\\ln9}{\\ln2}']),
    spec('F3a : ln(9)/ln(2) avec parenthèses', 0, {'a': '2', 'b': '9', 'r': '3.1699'}, 'correct',
         ['\\frac{\\ln(9)}{\\ln(2)}']),
    spec('F3a : 2 ln 3 / ln 2', 0, {'a': '2', 'b': '9', 'r': '3.1699'}, 'correct',
         ['\\frac{2\\ln3}{\\ln2}']),
    spec('F3a : ln(b/a)', 0, {'a': '2', 'b': '9', 'r': '3.1699'}, 'incorrect',
         ['\\ln\\left(\\frac{9}{2}\\right)']),
    spec('F3a : b/a', 0, {'a': '2', 'b': '9', 'r': '3.1699'}, 'incorrect', ['\\frac{9}{2}']),
    spec('F3a : ln b − ln a', 0, {'a': '2', 'b': '9', 'r': '3.1699'}, 'incorrect',
         ['\\ln9-\\ln2']),
    spec('F3b : 4ˣ = 8', 1, {'m': '2', 'u': '2', 'v': '3'}, 'correct', ['\\frac{3}{2}']),
    spec('F3b : 1,5', 1, {'m': '2', 'u': '2', 'v': '3'}, 'correct', ['1.5']),
    spec('F3b : inverse', 1, {'m': '2', 'u': '2', 'v': '3'}, 'incorrect', ['\\frac{2}{3}']),
    spec('F3b : b/a', 1, {'m': '2', 'u': '2', 'v': '3'}, 'incorrect', ['2']),
    spec('F3b : différence des exposants', 1, {'m': '3', 'u': '3', 'v': '2'}, 'incorrect', ['-1']),
    # ln(3x − 1) = ln(x + 5) : x0 = 3, v = 8 > 0 → {3}
    spec('F5 : ln(3x − 1) = ln(x + 5) → {3}', 2,
         {'a': '3', 'b': '-1', 'c': '1', 'd': '5', 'x0': '3', 'v': '8'}, 'correct',
         ['\\left\\{3\\right\\}']),
    spec('F5 : rejetée à tort', 2, {'a': '3', 'b': '-1', 'c': '1', 'd': '5', 'x0': '3', 'v': '8'},
         'incorrect', ['\\emptyset']),
    spec('F5 : signe', 2, {'a': '3', 'b': '-1', 'c': '1', 'd': '5', 'x0': '3', 'v': '8'},
         'incorrect', ['\\left\\{-3\\right\\}']),
    # ln(2x + 1) = ln(x − 3) : x0 = −4, v = −7 < 0 → ∅
    spec('F5 : ln(2x + 1) = ln(x − 3) → ∅', 2,
         {'a': '2', 'b': '1', 'c': '1', 'd': '-3', 'x0': '-4', 'v': '-7'}, 'correct',
         ['\\emptyset']),
    spec('F5 : solution hors du domaine gardée', 2,
         {'a': '2', 'b': '1', 'c': '1', 'd': '-3', 'x0': '-4', 'v': '-7'}, 'incorrect',
         ['\\left\\{-4\\right\\}']),
]

# =============================================================================================
# 14036c68 (TSPE-596) — F4 a : aˣ < b, a > 1 ; F4 b : aˣ < b, 0 < a < 1 (le sens change)
# =============================================================================================

GAUCHE = ']-\\infty;' + LNBA + '['
DROITE_F = '[' + LNBA + ';+\\infty['
F4_A = variation(
    'Résous dans $\\mathbb{R}$ l\'inéquation ${{a}}^{x}{{if:s==0|<|\\geqslant}}{{b}}$.\n\n$S=?$',
    [var('a', '2|3|5'), var('b', '3..50'), var('s', '0|1'), var('r', 'eval:ln(b)/ln(a)')],
    [case('{{if:s==0|' + GAUCHE + '|' + DROITE_F + '}}', [
        erreur('{{if:s==0|]' + LNBA + ';+\\infty[|]-\\infty;' + LNBA + ']}}',
               '$\\ln {{a}}>0$ : diviser par $\\ln {{a}}$ ne change pas le sens de l\'inégalité.',
               'Sens changé à tort'),
        erreur('{{if:s==0|]-\\infty;' + LNBA + ']|]' + LNBA + ';+\\infty[}}',
               'L\'inégalité est {{if:s==0|stricte : la borne est exclue|large : la borne est '
               'incluse}}.', 'Crochet'),
        erreur('{{if:s==0|]-\\infty;\\ln\\left(\\dfrac{ {{b}} }{ {{a}} }\\right)[|[\\ln\\left('
               '\\dfrac{ {{b}} }{ {{a}} }\\right);+\\infty[}}',
               '$x\\ln {{a}}$ se divise par $\\ln {{a}}$ : la borne est $' + LNBA + '$.', 'ln(b/a)'),
    ])],
    [
        '$\\ln$ est strictement croissante : ${{a}}^{x}{{if:s==0|<|\\geqslant}}{{b}}\\iff '
        'x\\ln {{a}}{{if:s==0|<|\\geqslant}}\\ln {{b}}$.',
        '$\\ln {{a}}>0$, le sens est conservé : $x{{if:s==0|<|\\geqslant}}' + LNBA + '$.',
        '$S=' + PRIMAIRE + '{ {{if:s==0|\\left]-\\infty\\,;' + LNBA + '\\right[|\\left[' + LNBA
        + '\\,;+\\infty\\right[}} }$.',
    ],
    'Applique $\\ln$ aux deux membres, puis divise par $\\ln {{a}}$ : quel est son signe ?',
    ['abs(r-round(r)) > 0.001'],
)

LNBQ = '\\dfrac{\\ln {{b}}}{\\ln {{eval:k/10;d}}}'
F4_B = variation(
    'Résous dans $\\mathbb{R}$ l\'inéquation ${{eval:k/10;d}}^{x}{{if:s==0|<|\\geqslant}}{{b}}$.\n\n$S=?$',
    [var('k', '2|5|8'), var('b', '2..20'), var('s', '0|1')],
    [case('{{if:s==0|]' + LNBQ + ';+\\infty[|]-\\infty;' + LNBQ + ']}}', [
        erreur('{{if:s==0|]-\\infty;' + LNBQ + '[|[' + LNBQ + ';+\\infty[}}',
               '$\\ln {{eval:k/10;d}}<0$ car ${{eval:k/10;d}}<1$ : diviser par $\\ln {{eval:k/10;d}}$ change le sens de '
               'l\'inégalité.', 'Sens non changé'),
        erreur('{{if:s==0|[' + LNBQ + ';+\\infty[|]-\\infty;' + LNBQ + '[}}',
               'L\'inégalité est {{if:s==0|stricte : la borne est exclue|large : la borne est '
               'incluse}}.', 'Crochet'),
    ])],
    [
        '$\\ln$ est strictement croissante : ${{eval:k/10;d}}^{x}{{if:s==0|<|\\geqslant}}{{b}}\\iff '
        'x\\ln {{eval:k/10;d}}{{if:s==0|<|\\geqslant}}\\ln {{b}}$.',
        'Or ${{eval:k/10;d}}<1$, donc $\\ln {{eval:k/10;d}}<0$ : en divisant par $\\ln {{eval:k/10;d}}$, le sens change, '
        '$x{{if:s==0|>|\\leqslant}}' + LNBQ + '$.',
        '$S=' + PRIMAIRE + '{ {{if:s==0|\\left]' + LNBQ + '\\,;+\\infty\\right[|\\left]-\\infty\\,;'
        + LNBQ + '\\right]}} }$.',
    ],
    'Applique $\\ln$ aux deux membres. Quel est le signe de $\\ln {{eval:k/10;d}}$ ?',
)

SPECS_14 = [
    spec('F4a : 2ˣ < 9', 0, {'a': '2', 'b': '9', 's': '0', 'r': '3.17'}, 'correct',
         [']-\\infty;\\frac{\\ln9}{\\ln2}[']),
    spec('F4a : sens changé à tort', 0, {'a': '2', 'b': '9', 's': '0', 'r': '3.17'}, 'incorrect',
         [']\\frac{\\ln9}{\\ln2};+\\infty[']),
    spec('F4a : crochet fermé', 0, {'a': '2', 'b': '9', 's': '0', 'r': '3.17'}, 'incorrect',
         [']-\\infty;\\frac{\\ln9}{\\ln2}]']),
    spec('F4a : 3ˣ ⩾ 7', 0, {'a': '3', 'b': '7', 's': '1', 'r': '1.77'}, 'correct',
         ['[\\frac{\\ln7}{\\ln3};+\\infty[']),
    spec('F4a : ln(b/a)', 0, {'a': '3', 'b': '7', 's': '1', 'r': '1.77'}, 'incorrect',
         ['[\\ln\\left(\\frac{7}{3}\\right);+\\infty[']),
    spec('F4b : 0,5ˣ < 4', 1, {'k': '5', 'b': '4', 's': '0'}, 'correct',
         [']\\frac{\\ln4}{\\ln0.5};+\\infty[']),
    spec('F4b : écrit −2', 1, {'k': '5', 'b': '4', 's': '0'}, 'correct', [']-2;+\\infty[']),
    spec('F4b : sens non changé', 1, {'k': '5', 'b': '4', 's': '0'}, 'incorrect',
         [']-\\infty;\\frac{\\ln4}{\\ln0.5}[']),
    spec('F4b : 0,8ˣ ⩾ 3', 1, {'k': '8', 'b': '3', 's': '1'}, 'correct',
         [']-\\infty;\\frac{\\ln3}{\\ln0.8}]']),
    spec('F4b : crochet', 1, {'k': '8', 'b': '3', 's': '1'}, 'incorrect',
         [']-\\infty;\\frac{\\ln3}{\\ln0.8}[']),
]

# =============================================================================================
# f1963ef2 (TSPE-392) — F7 : seuil avec un premier terme négatif (le sens change)
# =============================================================================================

F7 = variation(
    'Pour tout entier naturel $n$, $u_n=-{{eval:100*u}}\\times{{eval:1+k/100;d}}^{n}$.\n\n'
    'Détermine le plus petit entier naturel $n$ tel que $u_n<-{{eval:10^t}}$.\n\n$n=?$',
    [var('u', '1..9'), var('k', '5..95'), var('t', '3..5'),
     var('x', 'eval:ln(10^t/(100*u))/ln(1+k/100)')],
    [case('{{eval:floor(x)+1}}', [
        erreur('{{eval:floor(x)}}', 'L\'inégalité donne $n>{{eval:round(x*100)/100;d}}$ environ : '
               'le plus petit entier qui convient est l\'entier suivant.', 'Arrondi par défaut'),
        erreur('{{eval:floor(ln(10^t)/ln(1+k/100))+1}}', 'Il faut d\'abord diviser par '
               '$-{{eval:100*u}}$ : $u_n<-{{eval:10^t}}\\iff {{eval:1+k/100;d}}^{n}>'
               '\\dfrac{ {{eval:10^t}} }{ {{eval:100*u}} }$.', 'Premier terme oublié'),
    ])],
    [
        '$u_n<-{{eval:10^t}}\\iff -{{eval:100*u}}\\times{{eval:1+k/100;d}}^{n}<-{{eval:10^t}}\\iff '
        '{{eval:1+k/100;d}}^{n}>\\dfrac{ {{eval:10^t}} }{ {{eval:100*u}} }$ (on divise par un nombre '
        'négatif : le sens change).',
        'En appliquant $\\ln$, strictement croissante : $n\\ln {{eval:1+k/100;d}}>\\ln\\dfrac{ '
        '{{eval:10^t}} }{ {{eval:100*u}} }$, et $\\ln {{eval:1+k/100;d}}>0$, donc '
        '$n>\\dfrac{\\ln\\frac{ {{eval:10^t}} }{ {{eval:100*u}} }}{\\ln {{eval:1+k/100;d}}}\\approx '
        '{{eval:round(x*100)/100;d}}$.',
        'Le plus petit entier naturel qui convient est $n=' + PRIMAIRE + '{ {{eval:floor(x)+1}} }$.',
    ],
    'Divise d\'abord par $-{{eval:100*u}}$ : attention au sens de l\'inégalité. Applique ensuite '
    '$\\ln$.',
    ['abs(x-round(x)) > 0.01', 'x > 1.5', 'floor(x)+1 <= 60'],
)

SPECS_F1 = [
    # u = 2, k = 50, t = 4 : 1,5ⁿ > 50 → n > ln 50 / ln 1,5 ≈ 9,65 → 10
    spec('F7 : −200 × 1,5ⁿ < −10 000 → 10', 0,
         {'u': '2', 'k': '50', 't': '4', 'x': '9.648'}, 'correct', ['10']),
    spec('F7 : arrondi par défaut', 0, {'u': '2', 'k': '50', 't': '4', 'x': '9.648'}, 'incorrect',
         ['9']),
    spec('F7 : premier terme oublié', 0, {'u': '2', 'k': '50', 't': '4', 'x': '9.648'},
         'incorrect', ['23']),
]

# =============================================================================================
# 50feeefd (TSPE-413) — F8 a : ln(x² + bx + c), Δ < 0 ; F8 b : ln(xⁿ)
# =============================================================================================

U8 = '{{eval:x^2+b*x+c}}'
UP8 = '{{eval:2*x+b}}'
F8_A = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=\\ln\\left(' + U8 + '\\right)$.\n\n'
    'Détermine sa fonction dérivée.\n\n$f\'(x)=?$',
    [X, var('b', '1..6;±'), var('c', '1..20')],
    [case('\\dfrac{' + UP8 + '}{' + U8 + '}', [
        erreur('\\dfrac{1}{' + U8 + '}', '$(\\ln u)\'=\\dfrac{u\'}{u}$ : il manque $u\'(x)$ au '
               'numérateur.', '1/u'),
        erreur('\\dfrac{1}{' + UP8 + '}', '$(\\ln u)\'=\\dfrac{u\'}{u}$, pas $\\dfrac{1}{u\'}$.',
               '1/u′'),
        erreur('\\ln\\left(' + UP8 + '\\right)', 'On ne dérive pas « à l\'intérieur » du '
               'logarithme : $(\\ln u)\'=\\dfrac{u\'}{u}$.', 'ln(u′)'),
    ])],
    [
        '$f=\\ln u$ avec $u(x)=' + U8 + '$, strictement positif sur $\\mathbb{R}$ (son '
        'discriminant ${{eval:b^2-4*c}}$ est négatif).',
        '$u\'(x)=' + UP8 + '$ et $(\\ln u)\'=\\dfrac{u\'}{u}$ : $f\'(x)=' + PRIMAIRE + '{\\dfrac{' + UP8
        + '}{' + U8 + '}}$.',
    ],
    'Reconnais la forme $\\ln u$ : quelle est la dérivée de $\\ln u$ ?',
    ['b^2-4*c < 0'],
)

F8_B = variation(
    'Soit $f$ la fonction définie sur $\\left]0\\,;+\\infty\\right[$ par $f(x)=\\ln\\left(x^{ {{n}} }'
    '\\right)$.\n\nDétermine sa fonction dérivée.\n\n$f\'(x)=?$',
    [X, var('n', '2..9')],
    [case('\\dfrac{ {{n}} }{x}', [
        erreur('\\dfrac{1}{x^{ {{n}} }}', '$(\\ln u)\'=\\dfrac{u\'}{u}$ : il manque $u\'(x)='
               '{{n}}x^{ {{eval:n-1}} }$ au numérateur.', '1/u'),
        erreur('\\dfrac{1}{ {{n}}x^{ {{eval:n-1}} }}', '$(\\ln u)\'=\\dfrac{u\'}{u}$, pas '
               '$\\dfrac{1}{u\'}$.', '1/u′'),
        erreur('{{n}}x^{ {{eval:n-1}} }', 'C\'est la dérivée de $x^{ {{n}} }$, pas celle de '
               '$\\ln\\left(x^{ {{n}} }\\right)$.', 'u′'),
    ])],
    [
        'Pour $x>0$, $\\ln\\left(x^{ {{n}} }\\right)={{n}}\\ln x$.',
        'Donc $f\'(x)={{n}}\\times\\dfrac{1}{x}=' + PRIMAIRE + '{\\dfrac{ {{n}} }{x}}$ (ou, avec '
        '$\\dfrac{u\'}{u}$ : $\\dfrac{ {{n}}x^{ {{eval:n-1}} }}{x^{ {{n}} }}$, qui se simplifie).',
    ],
    'Simplifie d\'abord $\\ln\\left(x^{ {{n}} }\\right)$ avec une propriété du logarithme.',
)

SPECS_50 = [
    spec('F8a : ln(x² + 2x + 5)', 0, {'b': '2', 'c': '5'}, 'correct', ['\\frac{2x+2}{x^2+2x+5}']),
    spec('F8a : 1/u', 0, {'b': '2', 'c': '5'}, 'incorrect', ['\\frac{1}{x^2+2x+5}']),
    spec('F8a : 1/u′', 0, {'b': '2', 'c': '5'}, 'incorrect', ['\\frac{1}{2x+2}']),
    spec('F8a : ln(u′)', 0, {'b': '2', 'c': '5'}, 'incorrect', ['\\ln(2x+2)']),
    spec('F8b : ln(x⁵)', 1, {'n': '5'}, 'correct', ['\\frac{5}{x}']),
    spec('F8b : 1/u', 1, {'n': '5'}, 'incorrect', ['\\frac{1}{x^5}']),
    spec('F8b : u′', 1, {'n': '5'}, 'incorrect', ['5x^4']),
]

# =============================================================================================
# 2cef3442 (TSPE-443) — F10 a : a xⁿ / ln x en +∞ ; F10 b : ln x − b xⁿ en +∞
# =============================================================================================

F10_A = variation(
    'Soit $f$ la fonction définie sur $\\left]1\\,;+\\infty\\right[$ par $f(x)=\\dfrac{' + coef('a')
    + puissance('n') + '}{\\ln x}$.\n\nDétermine la limite de $f$ en $+\\infty$.\n\n'
    '$\\displaystyle\\lim_{x\\to+\\infty}f(x)=?$',
    [var('a', '1..9;±'), var('n', '1..3')],
    [case('{{if:a>0|+\\infty|-\\infty}}', [
        erreur('0', 'C\'est $\\dfrac{\\ln x}{' + puissance('n') + '}$ qui tend vers $0$ : ici le '
               'quotient est inversé, la puissance est au numérateur.', 'Quotient inversé'),
        erreur('{{if:a>0|-\\infty|+\\infty}}', 'Le coefficient ${{a}}$ est '
               '{{if:a>0|positif|négatif}} : il donne le signe de la limite.', 'Signe de a'),
    ])],
    [
        'Forme indéterminée « $\\dfrac{\\infty}{\\infty}$ ». Par croissances comparées, '
        '$\\displaystyle\\lim_{x\\to+\\infty}\\dfrac{\\ln x}{' + puissance('n') + '}=0$, et ce '
        'quotient est positif pour $x>1$.',
        '$f(x)={{a}}\\times\\dfrac{1}{\\frac{\\ln x}{' + puissance('n') + '}}$ : l\'inverse d\'une '
        'quantité qui tend vers $0^{+}$ tend vers $+\\infty$, donc $\\displaystyle'
        '\\lim_{x\\to+\\infty}f(x)=' + PRIMAIRE + '{ {{if:a>0|+\\infty|-\\infty}} }$.',
    ],
    'Écris $f(x)$ à l\'aide de l\'inverse de $\\dfrac{\\ln x}{' + puissance('n') + '}$.',
)

F10_B = variation(
    'Soit $f$ la fonction définie sur $\\left]0\\,;+\\infty\\right[$ par $f(x)=\\ln x-' + coef('b')
    + puissance('n') + '$.\n\nDétermine la limite de $f$ en $+\\infty$.\n\n'
    '$\\displaystyle\\lim_{x\\to+\\infty}f(x)=?$',
    [var('b', '1..6'), var('n', '1..3')],
    [case('-\\infty', [
        erreur('+\\infty', '« $+\\infty-\\infty$ » est une forme indéterminée : factorise par $'
               + puissance('n') + '$ pour voir quel terme l\'emporte.', '+∞'),
        erreur('0', 'C\'est $\\dfrac{\\ln x}{' + puissance('n') + '}$ qui tend vers $0$, pas la '
               'différence.', 'Zéro'),
    ])],
    [
        'Forme indéterminée « $+\\infty-\\infty$ ». Pour $x>0$, $f(x)=' + puissance('n')
        + '\\left(\\dfrac{\\ln x}{' + puissance('n') + '}-{{b}}\\right)$.',
        'Par croissances comparées, $\\dfrac{\\ln x}{' + puissance('n') + '}$ tend vers $0$ : la '
        'parenthèse tend vers $-{{b}}$, et $' + puissance('n') + '$ vers $+\\infty$.',
        'Par produit, $\\displaystyle\\lim_{x\\to+\\infty}f(x)=' + PRIMAIRE + '{-\\infty}$.',
    ],
    'Forme indéterminée : factorise par $' + puissance('n') + '$.',
)

SPECS_2C = [
    spec('F10a : 3x²/ln x', 0, {'a': '3', 'n': '2'}, 'correct', ['+\\infty']),
    spec('F10a : quotient inversé', 0, {'a': '3', 'n': '2'}, 'incorrect', ['0']),
    spec('F10a : −2x/ln x', 0, {'a': '-2', 'n': '1'}, 'correct', ['-\\infty']),
    spec('F10a : signe de a', 0, {'a': '-2', 'n': '1'}, 'incorrect', ['+\\infty']),
    spec('F10b : ln x − 2x', 1, {'b': '2', 'n': '1'}, 'correct', ['-\\infty']),
    spec('F10b : +∞', 1, {'b': '2', 'n': '1'}, 'incorrect', ['+\\infty']),
    spec('F10b : 0', 1, {'b': '2', 'n': '1'}, 'incorrect', ['0']),
]

# =============================================================================================
# 7c8b341b (TSPE-439) — F11 a et b : règles fausses classiques (QCM, leurres de TSA5-40)
# =============================================================================================

F11_A = variation(
    'Pour tout réel $x>0$, laquelle de ces égalités est vraie ?\n\n'
    '```choix\n'
    '- $\\ln\\left(x^{2}\\right)=2\\ln x$\n'
    '- $\\left(\\ln x\\right)^{2}=2\\ln x$\n'
    '- $\\ln\\left(x^{2}\\right)=\\left(\\ln x\\right)^{2}$\n'
    '- $\\ln(2x)=2\\ln x$\n'
    '```',
    [],
    [case('0')],
    [
        '$\\ln\\left(a^{n}\\right)=n\\ln a$ : $\\ln\\left(x^{2}\\right)=' + PRIMAIRE
        + '{2\\ln x}$.',
        '$\\left(\\ln x\\right)^{2}$ est le carré du nombre $\\ln x$ : pour $x=e$, il vaut $1$, '
        'alors que $2\\ln e=2$. Et $\\ln(2x)=\\ln 2+\\ln x$.',
    ],
    'Distingue le logarithme d\'un carré et le carré d\'un logarithme ; essaie $x=e$.',
)

F11_B = variation(
    'Pour tout réel $x>0$, $\\ln\\left(\\dfrac{1}{x}\\right)$ est égal à :\n\n'
    '```choix\n'
    '- $-\\ln x$\n'
    '- $\\dfrac{1}{\\ln x}$\n'
    '- $\\ln(-x)$\n'
    '- $-\\dfrac{1}{\\ln x}$\n'
    '```',
    [],
    [case('0')],
    [
        '$\\ln\\left(\\dfrac{1}{x}\\right)+\\ln x=\\ln\\left(\\dfrac{1}{x}\\times x\\right)=\\ln 1=0$, '
        'donc $\\ln\\left(\\dfrac{1}{x}\\right)=' + PRIMAIRE + '{-\\ln x}$.',
        '$\\ln(-x)$ n\'existe pas pour $x>0$, et $\\dfrac{1}{\\ln x}$ n\'est pas défini en $x=1$.',
    ],
    'Calcule $\\ln\\left(\\dfrac{1}{x}\\right)+\\ln x$ avec la propriété du produit.',
)

SPECS_7C = [
    spec('F11a : 2 ln x', 0, {}, 'correct', ['0']),
    spec('F11a : (ln x)² = 2 ln x', 0, {}, 'incorrect', ['1']),
    spec('F11a : ln(x²) = (ln x)²', 0, {}, 'incorrect', ['2']),
    spec('F11a : ln(2x) = 2 ln x', 0, {}, 'incorrect', ['3']),
    spec('F11b : −ln x', 1, {}, 'correct', ['0']),
    spec('F11b : 1/ln x', 1, {}, 'incorrect', ['1']),
    spec('F11b : ln(−x)', 1, {}, 'incorrect', ['2']),
]

# =============================================================================================
# 7f13ca89 (TSPE-416) — F12 : tableau de variations de ax + b + k ln x (TSA5-41).
# x₀ = −k/a entier, f(x₀) = ax₀ + b + k ln x₀ ; limites en 0 et en +∞ à compléter.
# Le modèle juge ses cases en intervalles : la variation remet des cases ordinaires
# (blankDefaults vide).
# =============================================================================================

VAL12 = '{{eval:a*x0+b}}{{eval:k;+}}\\ln{ {{x0}} }'
F12 = variation(
    'Soit $f$ la fonction définie sur $\\left]0\\,;+\\infty\\right[$ par $f(x)=' + coef('a')
    + 'x{{b;+}}{{k;+}}\\ln x$. On admet que '
    '$\\displaystyle\\lim_{x\\to+\\infty}\\dfrac{\\ln x}{x}=0$.\n\nÉtudie le signe de $f\'(x)$, puis complète le tableau de '
    'variations de $f$, limites comprises.\n\n'
    + bloc('variation', 'variable: x', 'domain: 0, ?{{x0}}, +inf', '',
           "sign: f'(x)",
           '  0,{{x0}}: ?{{if:a>0|-|+}}',
           '  {{x0}}: z',
           '  {{x0}},+inf: ?{{if:a>0|+|-}}', '',
           'variation: f(x)',
           '  0: ?{{if:a>0|+inf|-inf}}, {{if:a>0|top|bottom}}',
           '  {{x0}}: ?' + VAL12 + ', {{if:a>0|bottom|top}}',
           '  +inf: ?{{if:a>0|+inf|-inf}}, {{if:a>0|top|bottom}}',
           '  0,{{x0}}: ?flèche',
           '  {{x0}},+inf: ?flèche'),
    [var('A', '1..3'), var('s', '1|-1'), var('a', 'eval:s*A'), var('x0', '2..4'),
     var('k', 'eval:-a*x0'), var('b', '1..5;±')],
    [case('', [
        erreur('{{eval:-x0}}', '$f\'(x)=0\\iff ' + coef('a') + 'x{{k;+}}=0\\iff x={{x0}}$ : vérifie le signe.',
               'Signe de x₀'),
        erreur('{{eval:a*x0}}', '$f\'(x)=\\dfrac{' + coef('a') + 'x{{k;+}}}{x}$ s\'annule quand le '
               'numérateur est nul : résous $' + coef('a') + 'x{{k;+}}=0$.', 'Valeur de k'),
    ]),
     VIDE, VIDE, VIDE, VIDE,
     case('', [
         erreur('{{eval:a*x0+b}}', '$f({{x0}})={{eval:a*x0}}{{b;+}}{{k;+}}\\ln {{x0}}$ : le terme en '
                '$\\ln {{x0}}$ ne s\'annule pas ($\\ln {{x0}}\\neq 0$).', 'ln oublié'),
     ]),
     VIDE, VIDE],
    [
        '$f\'(x)={{a}}{{k;+}}\\times\\dfrac{1}{x}=\\dfrac{' + coef('a') + 'x{{k;+}}}{x}$. Comme $x>0$, $f\'(x)$ '
        'a le signe de $' + coef('a') + 'x{{k;+}}$, qui s\'annule en $x=' + PRIMAIRE + '{ {{x0}} }$ : '
        '{{if:a>0|négatif avant, positif après|positif avant, négatif après}}.',
        '$f$ est {{if:a>0|décroissante puis croissante, de minimum|croissante puis décroissante, '
        'de maximum}} $f({{x0}})={{eval:a*x0}}{{b;+}}{{k;+}}\\ln {{x0}}=' + PRIMAIRE + '{' + VAL12
        + '}$.',
        'En $0$ : $\\displaystyle\\lim_{x\\to0}\\ln x=-\\infty$ et ${{k}}$ est '
        '{{if:a>0|négatif|positif}}, donc $\\displaystyle\\lim_{x\\to0}f(x)=' + PRIMAIRE
        + '{ {{if:a>0|+\\infty|-\\infty}} }$.',
        'En $+\\infty$ : forme indéterminée. $f(x)=x\\left({{a}}{{b;+}}\\times\\dfrac{1}{x}{{k;+}}'
        '\\times\\dfrac{\\ln x}{x}\\right)$ et $\\dfrac{\\ln x}{x}\\to 0$ (admis dans l\'énoncé) : '
        'la parenthèse tend vers ${{a}}$, donc $\\displaystyle\\lim_{x\\to+\\infty}f(x)=' + PRIMAIRE
        + '{ {{if:a>0|+\\infty|-\\infty}} }$.',
    ],
    'Mets $f\'(x)$ au même dénominateur : comme $x>0$, son signe est celui du numérateur.',
    ['a*x0+b != 0'],
    blank_defaults={},
)

# Ordre des cases : x₀, signes (2), limite en 0, flèche, extremum, flèche, limite en +∞
V12 = {'A': '2', 's': '1', 'a': '2', 'x0': '3', 'k': '-6', 'b': '-1'}
V12N = {'A': '1', 's': '-1', 'a': '-1', 'x0': '2', 'k': '2', 'b': '3'}
SPECS_7F = [
    spec('F12 : 2x − 1 − 6 ln x', 0, V12, 'correct',
         ['3', '-', '+', '+\\infty', '↘', '5-6\\ln3', '↗', '+\\infty']),
    spec('F12 : ln 3 avec parenthèses', 0, V12, 'correct',
         ['3', '-', '+', '+\\infty', '↘', '5-6\\ln(3)', '↗', '+\\infty']),
    spec('F12 : signe de x₀', 0, V12, 'incorrect',
         ['-3', '-', '+', '+\\infty', '↘', '5-6\\ln3', '↗', '+\\infty']),
    spec('F12 : ln oublié', 0, V12, 'incorrect',
         ['3', '-', '+', '+\\infty', '↘', '5', '↗', '+\\infty']),
    spec('F12 : flèches inversées', 0, V12, 'incorrect',
         ['3', '-', '+', '+\\infty', '↗', '5-6\\ln3', '↘', '+\\infty']),
    spec('F12 : limite en 0 fausse', 0, V12, 'incorrect',
         ['3', '-', '+', '-\\infty', '↘', '5-6\\ln3', '↗', '+\\infty']),
    spec('F12 : −x + 3 + 2 ln x (maximum)', 0, V12N, 'correct',
         ['2', '+', '-', '-\\infty', '↗', '1+2\\ln2', '↘', '-\\infty']),
]

# =============================================================================================
# e814175b (TSPE-417) — F13 : vₙ₊₁ = ln(1 + vₙ) décroissante (idée en attente TSA1-48)
# =============================================================================================

F13 = variation(
    'On sait que, pour tout réel $x>-1$, $\\ln(1+x)\\leqslant x$.\n\nLa suite $(v_n)$ est définie '
    'par $v_0={{v}}$ et, pour tout entier naturel $n$, $v_{n+1}=\\ln\\left(1+v_n\\right)$. On admet '
    'que $v_n>0$ pour tout $n$.\n\nQue peut-on en déduire ?\n\n'
    '```choix\n'
    '- La suite $(v_n)$ est décroissante\n'
    '- La suite $(v_n)$ est croissante\n'
    '- La suite $(v_n)$ est constante\n'
    '- On ne peut rien dire du sens de variation de $(v_n)$\n'
    '```',
    [var('v', '1..5')],
    [case('0')],
    [
        'Pour tout $n$, $v_n>0>-1$ : on peut appliquer l\'inégalité à $x=v_n$.',
        '$v_{n+1}=\\ln\\left(1+v_n\\right)\\leqslant v_n$ : la suite $(v_n)$ est $' + PRIMAIRE
        + '{\\text{décroissante}}$.',
    ],
    'Applique l\'inégalité à $x=v_n$ : que compare-t-elle ?',
)

SPECS_E8 = [
    spec('F13 : décroissante', 0, {'v': '2'}, 'correct', ['0']),
    spec('F13 : croissante', 0, {'v': '2'}, 'incorrect', ['1']),
    spec('F13 : on ne peut rien dire', 0, {'v': '2'}, 'incorrect', ['3']),
]


ajouter('ffd5c051', [F1, F2], SPECS_FF)
ajouter('d3301f2d', [F3_A, F3_B, F5], SPECS_D3)
ajouter('14036c68', [F4_A, F4_B], SPECS_14)
ajouter('f1963ef2', [F7], SPECS_F1)
ajouter('50feeefd', [F8_A, F8_B], SPECS_50)
ajouter('2cef3442', [F10_A, F10_B], SPECS_2C)
ajouter('7c8b341b', [F11_A, F11_B], SPECS_7C)
ajouter('7f13ca89', [F12], SPECS_7F)
ajouter('e814175b', [F13], SPECS_E8)
print('9 modèles complétés dans', DOSSIER)
