"""Ajoute les variations validées aux 7 modèles publiés exportés de prod dans
scripts/questions/idees-tle-techno-analyse-publies/ (chantier idees-tle-techno-analyse).

Phase 0 validée par David le 2026-11-26 (« je valide les modèles », fiches
docs/archive/wip/idees-tle-techno-analyse/idees-tle-techno-analyse-fiches.md) : F1 et F6 (52b884ee), F2 (10bd7075), F3 et F4
(af24839d), F5 (dc269779), F7 (f84e23a3), F8 (94b1dbf6), F9 (f6805041). Les variations s'ajoutent
À LA FIN (les réponses des élèves gardent l'indice de leur variation) ; la migration de contenu est
générée par scripts/questions/migration-contenu.ts.

Le script repart du contenu de prod (variations et specs d'origine, comptées dans ORIGINE) : le
relancer réécrit les ajouts sans les doubler. Terminale techno : logarithme décimal seulement, pas
de ln. ⛔ Jamais de variable `e` (Euler).

Usage : python3 docs/wip/questions/idees-tle-techno-analyse-publies.py \
          scripts/questions/idees-tle-techno-analyse-publies
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'

# id court → (variations, specs) d'origine en prod (export du 2026-11-26)
ORIGINE = {'52b884ee': (6, 16), '10bd7075': (4, 11), 'af24839d': (5, 10), 'dc269779': (6, 18),
           'f84e23a3': (3, 9), '94b1dbf6': (4, 11), 'f6805041': (4, 8)}

LOG_PROPRIETE = ('Les deux membres sont strictement positifs : on prend leur logarithme, qui garde '
                 'l\'égalité (ou le sens de l\'inégalité, car $\\log$ est strictement croissante), '
                 'et on utilise $\\log\\left(a^x\\right)=x\\log(a)$.')


def spec(desc, vi, variables_, status, answers, message=None, violations=None):
    expected = {'status': status}
    if violations:
        expected['constraintViolations'] = violations
    if message is not None:
        expected['expectedErrorMessage'] = message
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': expected, 'answers': answers}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def case(attendue, erreurs=None, **extra):
    c = {'expectedAnswer': attendue}
    if erreurs:
        c['expectedErrors'] = erreurs
    c.update(extra)
    return c


def variation(statement, variables, blanks, steps, hint, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': blanks, 'correction': {'steps': steps}, 'hint': hint}


def coef(v):
    """Coefficient devant une lettre : 1 → rien, −1 → −."""
    return '{{if:' + v + '==1||{{if:' + v + '==-1|-|{{' + v + '}}}}}}'


def coef_signe(v):
    """Coefficient signé après un terme : 1 → +, −1 → −, sinon ±|v|."""
    return '{{if:' + v + '==1|+|{{if:' + v + '==-1|-|{{' + v + ';+}}}}}}'


def puissance(n):
    """x, ou x^n."""
    return '{{if:' + n + '==1|x|x^{ {{' + n + '}} }}}'


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


# Puissances d'un même nombre c : a = c^p, b = c^q (F1, F2). Avec c = 3, une puissance négative
# n'a pas d'écriture décimale : p et q positifs seulement.
VARS_PUISSANCES = [var('c', '2|3|5'), var('p', '-3|-2|-1|2|3|4|5'), var('q', '-3..5')]
CONDITIONS_PUISSANCES = ['q != 0', 'abs(q) != abs(p)', 'c != 3 || p > 0', 'c != 3 || q > 0',
                         'c^p <= 625', 'c^q <= 625']
A_DEC = '{{eval:c^p;d}}'
B_DEC = '{{eval:c^q;d}}'
PUISS_A = '{{c}}^{ {{p}} }'
PUISS_B = '{{c}}^{ {{q}} }'

# =============================================================================================
# 52b884ee (TTECHNO-043) — F1 : aˣ = b, solution rationnelle ; F6 : xᵃ = b en valeur exacte
# =============================================================================================

F1 = variation(
    'Résous dans $\\mathbb{R}$, sans calculatrice, l\'équation $' + A_DEC + '^x=' + B_DEC + '$. '
    'Donne la valeur exacte, sous la forme d\'un entier ou d\'une fraction simplifiée.\n\n$x=?$',
    VARS_PUISSANCES,
    [case('{{eval:q/p}}', [
        erreur('{{eval:p/q}}', '$' + coef('p') + 'x={{q}}$ : on divise ${{q}}$ par ${{p}}$, pas l\'inverse.',
               'Fraction renversée'),
        erreur('{{eval:-q/p}}', 'Écris $' + A_DEC + '=' + PUISS_A + '$ et $' + B_DEC + '='
               + PUISS_B + '$ : vérifie le signe des exposants.', 'Signe'),
        erreur('{{eval:c^q/c^p}}', 'On ne divise pas $' + B_DEC + '$ par $' + A_DEC + '$ : écris '
               'les deux nombres comme des puissances de ${{c}}$.', 'b/a'),
    ], acceptDecimal=True)],
    [
        '$' + A_DEC + '=' + PUISS_A + '$ et $' + B_DEC + '=' + PUISS_B + '$ : l\'équation s\'écrit '
        '$\\left(' + PUISS_A + '\\right)^x=' + PUISS_B + '$, soit ${{c}}^{ ' + coef('p') + 'x}=' + PUISS_B + '$.',
        LOG_PROPRIETE,
        '$' + coef('p') + 'x\\log({{c}})=' + coef('q') + '\\log({{c}})$, et $\\log({{c}})\\neq 0$ : $' + coef('p') + 'x={{q}}$, donc '
        '$x=' + PRIMAIRE + '{ {{eval:q/p}} }$.',
    ],
    'Écris les deux nombres comme des puissances d\'un même entier.',
    CONDITIONS_PUISSANCES,
)

# F6 : w = 1 une fois sur trois → b = cᵃ, x = c entier ; sinon b = r, x = r^(1/a)
F6 = variation(
    'Résous dans $\\left]0\\,;+\\infty\\right[$ l\'équation $x^{ {{a}} }={{b}}$. Donne la valeur '
    'exacte : un entier si c\'est possible, sinon une puissance de ${{b}}$.\n\n$x=?$',
    [var('a', '3..9'), var('w', '0|0|1'), var('c', '2|3'), var('r', '2|3|5|6|7'),
     var('b', 'eval:w*c^a+(1-w)*r')],
    [case('{{if:w==1|{{c}}|{{b}}^{\\frac{1}{ {{a}} }}}}', [
        erreur('\\frac{ {{b}} }{ {{a}} }', '$x^{ {{a}} }$ n\'est pas ${{a}}x$ : on ne divise pas '
               'par ${{a}}$.', 'b/a'),
        erreur('{{b}}^{ {{a}} }', 'Pour défaire la puissance ${{a}}$, on élève à la puissance '
               '$\\dfrac{1}{ {{a}} }$, pas à la puissance ${{a}}$.', 'b puissance a'),
        erreur('\\frac{\\log({{b}})}{ {{a}} }', '$\\dfrac{\\log({{b}})}{ {{a}} }$ est la valeur de '
               '$\\log(x)$, pas de $x$ : écris $x$ {{if:w==1|comme un entier|comme une puissance de '
               '${{b}}$}}.', 'log(x) au lieu '
               'de x'),
    ])],
    [
        '$x>0$ et ${{b}}>0$ : on prend le logarithme des deux membres.',
        '${{a}}\\log(x)=\\log({{b}})\\iff\\log(x)=\\dfrac{\\log({{b}})}{ {{a}} }$, donc '
        '$x=10^{\\frac{\\log({{b}})}{ {{a}} }}={{b}}^{\\frac{1}{ {{a}} }}$.',
        '{{if:w==1|Or ${{b}}={{c}}^{ {{a}} }$ : $x=' + PRIMAIRE + '{ {{c}} }$.|$x=' + PRIMAIRE
        + '{ {{b}}^{\\frac{1}{ {{a}} }} }$ (environ ${{eval:round(100*b^(1/a))/100;a2}}$).}}',
    ],
    'Cherche le nombre $p$ tel que $\\left(x^{ {{a}} }\\right)^{p}=x$.',
    ['w + abs(r-a) > 0', 'w*c^a <= 1000', 'w + abs(r^(1/a)-round(r^(1/a))) > 0.001'],
)

V_F1 = {'c': '2', 'p': '-2', 'q': '5'}  # 0,25ˣ = 32 → x = −5/2
V_F1B = {'c': '2', 'p': '3', 'q': '2'}  # 8ˣ = 4 → x = 2/3
V_F6 = {'a': '3', 'w': '0', 'c': '2', 'r': '5', 'b': '5'}
V_F6E = {'a': '3', 'w': '1', 'c': '3', 'r': '2', 'b': '27'}
SPECS_52 = [
    spec('F1 : 0,25ˣ = 32 → −5/2', 0, V_F1, 'correct', ['-\\frac{5}{2}']),
    spec('F1 : −2,5', 0, V_F1, 'correct', ['-2.5']),
    spec('F1 : fraction renversée', 0, V_F1, 'incorrect', ['-\\frac{2}{5}'],
         '$-2 x = 5$ : on divise $5$ par $-2$, pas l\'inverse.'),
    spec('F1 : signe', 0, V_F1, 'incorrect', ['\\frac{5}{2}'],
         'Écris $0.25 = 2^{-2}$ et $32 = 2^5$ : vérifie le signe des exposants.'),
    spec('F1 : b/a', 0, V_F1, 'incorrect', ['128'],
         'On ne divise pas $32$ par $0.25$ : écris les deux nombres comme des puissances de $2$.'),
    spec('F1 : 8ˣ = 4 → 2/3', 0, V_F1B, 'correct', ['\\frac{2}{3}']),
    spec('F1 : 8ˣ = 4, inverse', 0, V_F1B, 'incorrect', ['\\frac{3}{2}']),
    spec('F6 : x³ = 5', 1, V_F6, 'correct', ['5^{\\frac{1}{3}}']),
    spec('F6 : racine cubique (la consigne demande une puissance)', 1, V_F6, 'bad_form',
         ['\\sqrt[3]{5}'], violations=['form']),
    spec('F6 : b/a', 1, V_F6, 'incorrect', ['\\frac{5}{3}'],
         '$x^3$ n\'est pas $3 x$ : on ne divise pas par $3$.'),
    spec('F6 : b puissance a', 1, V_F6, 'incorrect', ['5^{3}'],
         'Pour défaire la puissance $3$, on élève à la puissance $\\dfrac{1}{3}$, pas à la '
         'puissance $3$.'),
    spec('F6 : log(x)', 1, V_F6, 'incorrect', ['\\frac{\\log(5)}{3}'],
         '$\\dfrac{\\log(5)}{ 3 }$ est la valeur de $\\log(x)$, pas de $x$ : écris $x$ comme '
         'une puissance de $5$.'),
    spec('F6 : x³ = 27 → 3', 1, V_F6E, 'correct', ['3']),
    spec('F6 : x³ = 27, b/a', 1, V_F6E, 'incorrect', ['9']),
]

# =============================================================================================
# 10bd7075 (TTECHNO-084) — F2 : aˣ ⋚ b, borne rationnelle, a < 1 une fois sur deux
# =============================================================================================

# s : 0 <, 1 ⩽, 2 >, 3 ⩾ ; g = 1 si S est à droite (x > …), t = 1 si l'inégalité est stricte
SIGNE = '{{if:s==0|<|{{if:s==1|\\leqslant|{{if:s==2|>|\\geqslant}}}}}}'
SIGNE_FINAL = ('{{if:g==1|{{if:t==1|>|\\geqslant}}|{{if:t==1|<|\\leqslant}}}}')
SIGNE_P = '{{if:s==0|<|{{if:s==1|\\leqslant|{{if:s==2|>|\\geqslant}}}}}}'
R = '{{eval:q/p}}'
R_INV = '{{eval:p/q}}'


def intervalle(g, t, borne):
    """Intervalle de solutions : à droite si g, borne exclue si t."""
    gauche = ']-\\infty;' + borne + '{{if:' + t + '|[|]}}'
    droite = '{{if:' + t + '|]|[}}' + borne + ';+\\infty['
    return '{{if:' + g + '|' + droite + '|' + gauche + '}}'


F2 = variation(
    'Résous dans $\\mathbb{R}$, sans calculatrice, l\'inéquation $' + A_DEC + '^x' + SIGNE + B_DEC
    + '$. Donne l\'ensemble des solutions, borne sous la forme d\'un entier ou d\'une fraction '
    'simplifiée.\n\n$S=?$',
    VARS_PUISSANCES + [var('s', '0..3'), var('t', 'eval:1-mod(s,2)'),
                       var('g', 'eval:mod(floor(s/2)+(1-sign(p))/2,2)')],
    [case(intervalle('g==1', 't==1', R), [
        erreur(intervalle('g==0', 't==1', R),
               '{{if:p<0|À la fin, on divise par ${{p}}<0$ : le sens de l\'inégalité change.|À la fin, '
               'on divise par ${{p}}>0$ : le sens de l\'inégalité ne change pas.}}', 'Sens de l\'inégalité'),
        erreur(intervalle('g==1', 't==0', R),
               'L\'inégalité est {{if:t==1|stricte : la borne est exclue|large : la borne est '
               'incluse}}.', 'Crochet'),
        erreur(intervalle('g==1', 't==1', R_INV),
               '$' + coef('p') + 'x' + SIGNE_P + '{{q}}$ : on divise ${{q}}$ par ${{p}}$, pas l\'inverse.', 'Borne renversée'),
    ])],
    [
        '$' + A_DEC + '=' + PUISS_A + '$ et $' + B_DEC + '=' + PUISS_B + '$ : l\'inéquation '
        's\'écrit ${{c}}^{ ' + coef('p') + 'x}' + SIGNE + PUISS_B + '$.',
        LOG_PROPRIETE,
        '$' + coef('p') + 'x\\log({{c}})' + SIGNE + '' + coef('q') + '\\log({{c}})$, et $\\log({{c}})>0$ : $' + coef('p') + 'x' + SIGNE
        + '{{q}}$.',
        '{{if:p<0|On divise par ${{p}}<0$ : le sens change|On divise par ${{p}}>0$ : le sens est '
        'conservé}}, $x' + SIGNE_FINAL + R + '$.',
        '$S=' + PRIMAIRE + '{ {{if:g==1|{{if:t==1|\\left]|\\left[}}' + R + '\\,;+\\infty\\right[|'
        '\\left]-\\infty\\,;' + R + '{{if:t==1|\\right[|\\right]}}}} }$.',
    ],
    'Écris les deux nombres comme des puissances d\'un même entier. À la fin, par quel nombre '
    'divises-tu, et quel est son signe ?',
    CONDITIONS_PUISSANCES,
)

# 0,25ˣ < 32 : −2x < 5 → x > −5/2 ; s = 0, p < 0 → g = 1, t = 1
V_F2 = {'c': '2', 'p': '-2', 'q': '5', 's': '0', 't': '1', 'g': '1'}
# 8ˣ ⩾ 4 : 3x ⩾ 2 → x ⩾ 2/3 ; s = 3 → g = 1, t = 0
V_F2B = {'c': '2', 'p': '3', 'q': '2', 's': '3', 't': '0', 'g': '1'}
SPECS_10 = [
    spec('F2 : 0,25ˣ < 32 → ]−5/2 ; +∞[', 0, V_F2, 'correct', [']-\\frac{5}{2};+\\infty[']),
    spec('F2 : sens non changé', 0, V_F2, 'incorrect', [']-\\infty;-\\frac{5}{2}['],
         'À la fin, on divise par $-2 < 0$ : le sens de l\'inégalité change.'),
    spec('F2 : crochet', 0, V_F2, 'incorrect', ['[-\\frac{5}{2};+\\infty['],
         'L\'inégalité est stricte : la borne est exclue.'),
    spec('F2 : borne renversée', 0, V_F2, 'incorrect', [']-\\frac{2}{5};+\\infty['],
         '$-2 x < 5$ : on divise $5$ par $-2$, pas l\'inverse.'),
    spec('F2 : 8ˣ ⩾ 4 → [2/3 ; +∞[', 0, V_F2B, 'correct', ['[\\frac{2}{3};+\\infty[']),
    spec('F2 : 8ˣ ⩾ 4, sens changé', 0, V_F2B, 'incorrect', [']-\\infty;\\frac{2}{3}]'],
         'À la fin, on divise par $3 > 0$ : le sens de l\'inégalité ne change pas.'),
    spec('F2 : 8ˣ ⩾ 4, crochet', 0, V_F2B, 'incorrect', [']\\frac{2}{3};+\\infty['],
         'L\'inégalité est large : la borne est incluse.'),
]

# =============================================================================================
# af24839d (TTECHNO-044) — F3 : log(aⁿ/bᵐ) ; F4 : réduire a log(xᵏ) + b log(1/xʲ) + c log(xᵐ)
# =============================================================================================

FRAC_F3 = ('{{if:w==1|\\dfrac{ {{a}}^{ {{n}} } }{ {{b}}^{ {{m}} } }|\\dfrac{ {{eval:a^n}} }'
           '{ {{eval:b^m}} }}}')
F3 = variation(
    'Écris $\\log\\left(' + FRAC_F3 + '\\right)$ en fonction de $\\log({{a}})$ et '
    '$\\log({{b}})$.\n\n$\\log\\left(' + FRAC_F3 + '\\right)=?\\log({{a}})+?\\log({{b}})$',
    [var('a', '2|3|5'), var('b', '2|3|5'), var('n', '2..5'), var('m', '2..5'), var('w', '0|1')],
    [case('{{n}}', [
        erreur('{{m}}', 'Le coefficient de $\\log({{a}})$ vient du numérateur, '
               '${{a}}^{ {{n}} }$.', 'Coefficients échangés'),
        erreur('{{eval:a^n}}', 'On demande le coefficient devant $\\log({{a}})$ : écris '
               '${{eval:a^n}}$ comme une puissance de ${{a}}$, l\'exposant donne le coefficient.',
               'Nombre au lieu de l\'exposant'),
        erreur('{{eval:n-m}}', 'Chaque logarithme a son coefficient : $\\log({{a}})$ et '
               '$\\log({{b}})$ ne se regroupent pas.', 'Tout dans une case'),
    ]),
     case('{{eval:-m}}', [
         erreur('{{m}}', '$\\log\\left(\\dfrac{A}{B}\\right)=\\log(A)-\\log(B)$ : le coefficient '
                'de $\\log({{b}})$ est négatif.', 'Signe oublié'),
         erreur('{{eval:-n}}', 'Le coefficient de $\\log({{b}})$ vient du dénominateur, '
                '${{b}}^{ {{m}} }$.', 'Coefficients échangés'),
         erreur('{{eval:-b^m}}', 'On demande le coefficient devant $\\log({{b}})$ : écris '
                '${{eval:b^m}}$ comme une puissance de ${{b}}$.', 'Nombre au lieu de l\'exposant'),
     ])],
    [
        'Pour $a>0$ et $b>0$ : $\\log\\left(\\dfrac{a}{b}\\right)=\\log(a)-\\log(b)$. Pour $a>0$ '
        'et $n$ entier naturel : $\\log\\left(a^n\\right)=n\\log(a)$.',
        '{{if:w==1||${{eval:a^n}}={{a}}^{ {{n}} }$ et ${{eval:b^m}}={{b}}^{ {{m}} }$, donc }}'
        '$\\log\\left(' + FRAC_F3 + '\\right)=\\log\\left({{a}}^{ {{n}} }\\right)-\\log\\left('
        '{{b}}^{ {{m}} }\\right)=' + PRIMAIRE + '{ {{n}} }\\log({{a}})' + PRIMAIRE
        + '{-{{m}}}\\log({{b}})$.',
    ],
    'Le logarithme d\'un quotient est une différence de logarithmes.',
    ['a != b', 'n != m', 'a^n <= 625', 'b^m <= 625'],
)

# r = ak − bj + cm ; erreurs : ak + bj + cm, a − b + c, ak − b + cm (j ⩾ 2)
F4 = variation(
    'Pour tout réel $x>0$, écris $A=' + coef('a') + '\\log\\left(' + puissance('k') + '\\right)'
    + coef_signe('b') + '\\log\\left(\\dfrac{1}{x^{ {{j}} }}\\right)' + coef_signe('c')
    + '\\log\\left(' + puissance('m') + '\\right)$ sous la forme $k\\log(x)$.\n\n$A=?\\log(x)$',
    [var('a', '1..5;±'), var('b', '1..5;±'), var('c', '1..5;±'), var('k', '1..3'),
     var('j', '2|3'), var('m', '1..3'), var('r', 'eval:a*k-b*j+c*m'), var('u', 'eval:a*k'),
     var('v', 'eval:-b*j'), var('z', 'eval:c*m')],
    [case('{{r}}', [
        erreur('{{eval:a*k+b*j+c*m}}', '$\\log\\left(\\dfrac{1}{x^{ {{j}} }}\\right)=-{{j}}\\log(x)$ : '
               'ce terme change de signe.', 'log(1/x^j) compté positif'),
        erreur('{{eval:a-b+c}}', '$\\log\\left(x^{n}\\right)=n\\log(x)$ : l\'exposant devient un '
               'coefficient.', 'Exposants oubliés'),
        erreur('{{eval:a*k-b+c*m}}', '$\\log\\left(\\dfrac{1}{x^{ {{j}} }}\\right)=-{{j}}\\log(x)$, '
               'pas $-\\log(x)$ : l\'exposant ${{j}}$ compte aussi.', 'Exposant j oublié'),
    ])],
    [
        'Pour $x>0$ : $\\log\\left(x^n\\right)=n\\log(x)$ et $\\log\\left(\\dfrac{1}{x^n}\\right)='
        '-n\\log(x)$.',
        '$A=' + coef('u') + '\\log(x)' + coef_signe('v') + '\\log(x)' + coef_signe('z') + '\\log(x)=' + PRIMAIRE + '{'
        + coef('r') + '\\log(x)}$.',
    ],
    '$\\log\\left(\\dfrac{1}{x^{ {{j}} }}\\right)=\\log(1)-\\log\\left(x^{ {{j}} }\\right)$, et '
    '$\\log(1)=0$.',
    ['r != 0', 'r != a-b+c', 'a*k+b*j+c*m != a-b+c', 'a-b+c != a*k-b+c*m'],
)

V_F3 = {'a': '2', 'b': '5', 'n': '3', 'm': '2', 'w': '0'}  # log(8/25)
V_F4 = {'a': '2', 'b': '3', 'c': '-1', 'k': '3', 'j': '2', 'm': '1', 'r': '-1', 'u': '6', 'v': '-6',
        'z': '-1'}
# 2·3 − 3·2 − 1·1 = −1
SPECS_AF = [
    spec('F3 : log(8/25) = 3 log 2 − 2 log 5', 0, V_F3, 'correct', ['3', '-2']),
    spec('F3 : nombre au lieu de l\'exposant', 0, V_F3, 'incorrect', ['8', '-2'],
         'On demande le coefficient devant $\\log(2)$ : écris $8$ comme une puissance de $2$, '
         'l\'exposant donne le coefficient.'),
    spec('F3 : signe oublié', 0, V_F3, 'incorrect', ['3', '2'],
         '$\\log\\left(\\dfrac{A}{B}\\right)=\\log(A)-\\log(B)$ : le coefficient de $\\log(5)$ est '
         'négatif.'),
    spec('F3 : coefficients échangés', 0, V_F3, 'incorrect', ['2', '-3']),
    spec('F3 : tout dans une case', 0, V_F3, 'incorrect', ['1', '0']),
    spec('F4 : 2 log x³ + 3 log(1/x²) − log x = −log x', 1, V_F4, 'correct', ['-1']),
    spec('F4 : log(1/x²) compté positif', 1, V_F4, 'incorrect', ['11'],
         '$\\log\\left(\\dfrac{1}{x^{ 2 }}\\right)=-2\\log(x)$ : ce terme change de signe.'),
    spec('F4 : exposants oubliés', 1, V_F4, 'incorrect', ['-2'],
         '$\\log\\left(x^{n}\\right)=n\\log(x)$ : l\'exposant devient un coefficient.'),
    spec('F4 : exposant j oublié', 1, V_F4, 'incorrect', ['2'],
         '$\\log\\left(\\dfrac{1}{x^{ 2 }}\\right)=-2\\log(x)$, pas $-\\log(x)$ : l\'exposant $2$ '
         'compte aussi.'),
]

# =============================================================================================
# dc269779 (TTECHNO-040) — F5 : deux logarithmes de puissances de 10
# =============================================================================================

# o = 0 : a log(10ⁿ) + c log(10ᵐ) ; o = 1 : log(10ⁿ) × log(10ᵐ). 10ᵐ écrit en nombre.
N10 = '{{eval:10^m;d}}'
EXPR_F5 = ('{{if:o==0|' + coef('a') + '\\log\\left(10^{ {{n}} }\\right)' + coef_signe('c')
           + '\\log(' + N10 + ')|\\log\\left(10^{ {{n}} }\\right)\\times\\log(' + N10 + ')}}')
F5 = variation(
    'Sans calculatrice, calcule $A=' + EXPR_F5 + '$.\n\n$A=?$',
    [var('o', '0|0|1'), var('a', '1..5;±'), var('c', '1..5;±'), var('n', '1..5'),
     var('m', '-3|-2|-1|1|2|3|4|5'), var('r', 'eval:(1-o)*(a*n+c*m)+o*n*m'),
     var('w1', 'eval:(1-o)*(a*n-c*m)-o*n*m'), var('w2', 'eval:(1-o)*(a*n+c*(m+1))+o*n*(m+1)'),
     var('w3', 'eval:(1-o)*(a+c)+o*(n+m)')],
    [case('{{r}}', [
        erreur('{{w1}}', '$' + N10 + '=10^{ {{m}} }$, donc $\\log(' + N10 + ')={{m}}$ : vérifie '
               'le signe.', 'Signe'),
        erreur('{{w2}}', '{{if:m<0|$' + N10 + '=10^{ {{m}} }$ : le $1$ est au rang ${{eval:-m}}$ '
               'après la virgule.|$' + N10 + '=10^{ {{m}} }$ : on compte les zéros, pas les '
               'chiffres.}}', 'Exposant décalé de 1'),
        erreur('{{w3}}', '{{if:o==0|Les coefficients ne suffisent pas : '
               '$\\log\\left(10^{n}\\right)=n$ donne la valeur de chaque logarithme.|C\'est un '
               'produit : on multiplie les deux logarithmes.}}',
               '{{if:o==0|Exposants oubliés|Somme au lieu du produit}}'),
    ])],
    [
        'Pour tout entier $n$, $\\log\\left(10^n\\right)=n$.',
        '$\\log\\left(10^{ {{n}} }\\right)={{n}}$ et $' + N10 + '=10^{ {{m}} }$, donc $\\log('
        + N10 + ')={{m}}$.',
        '$A={{if:o==0|{{eval:a*n}}{{eval:c*m;+}}|{{n}}\\times{{if:m<0|({{m}})|{{m}}}}}}='
        + PRIMAIRE + '{ {{r}} }$.',
    ],
    'Écris chaque nombre comme une puissance de $10$.',
    ['r != w1', 'r != w2', 'r != w3', 'w1 != w2', 'w1 != w3', 'w2 != w3'],
)

V_F5 = {'o': '0', 'a': '3', 'c': '-2', 'n': '2', 'm': '-2', 'r': '10', 'w1': '2', 'w2': '8',
        'w3': '1'}
# 3 log(10²) − 2 log(0,01) = 6 + 4 = 10
V_F5P = {'o': '1', 'a': '1', 'c': '1', 'n': '3', 'm': '2', 'r': '6', 'w1': '-6', 'w2': '9',
         'w3': '5'}
SPECS_DC = [
    spec('F5 : 3 log(10²) − 2 log(0,01) = 10', 0, V_F5, 'correct', ['10']),
    spec('F5 : signe de log(0,01)', 0, V_F5, 'incorrect', ['2'],
         '$0.01 = 10^{-2}$, donc $\\log(0.01)=-2$ : vérifie le signe.'),
    spec('F5 : zéros comptés après la virgule', 0, V_F5, 'incorrect', ['8'],
         '$0.01 = 10^{-2}$ : le $1$ est au rang $2$ après la virgule.'),
    spec('F5 : exposants oubliés', 0, V_F5, 'incorrect', ['1'],
         'Les coefficients ne suffisent pas : $\\log\\left(10^{n}\\right)=n$ donne la valeur de '
         'chaque logarithme.'),
    spec('F5 : log(10³) × log(100) = 6', 0, V_F5P, 'correct', ['6']),
    spec('F5 : somme au lieu du produit', 0, V_F5P, 'incorrect', ['5'],
         'C\'est un produit : on multiplie les deux logarithmes.'),
    spec('F5 : chiffres comptés', 0, V_F5P, 'incorrect', ['9'],
         '$100 = 10^2$ : on compte les zéros, pas les chiffres.'),
]

# =============================================================================================
# f84e23a3 (TTECHNO-038) — F7 : taux moyen par minute
# =============================================================================================

# d = 0 : hausse, d = 1 : baisse ; M = coefficient global, N = nombre de minutes
TM = 'round(100*(100*(M^(1/N)-1)))/100'
F7 = variation(
    '{{if:d==0|Le nombre de bactéries d\'une culture augmente|Le nombre de bactéries d\'une '
    'culture traitée par un antibiotique baisse}} de ${{x}}~\\%$ en ${{n}}$ '
    'heure{{if:n>1|s|}}.\n\nCalcule le taux d\'évolution moyen **par minute**, en pourcentage, '
    'arrondi au centième{{if:d==1| (il est négatif pour une baisse)|}}.\n\n$t_m\\approx ?~\\%$',
    [var('d', '0|1'), var('x', '10..80'), var('n', '1..3'), var('N', 'eval:60*n'),
     var('M', 'eval:1+(1-2*d)*x/100')],
    [case('{{eval:' + TM + ';a2}}', [
        erreur('{{eval:round(100*(1-2*d)*x/N)/100;a2}}', 'Les évolutions successives se '
               'multiplient : on ne divise pas ${{x}}~\\%$ par ${{N}}$.', 'Taux divisé'),
        erreur('{{eval:round(100*(100*(M^(1/n)-1)))/100;a2}}', 'C\'est le taux moyen par heure : '
               'en ${{n}}$ heure{{if:n>1|s|}}, il y a ${{N}}$ minutes.', 'Heures pas converties'),
        erreur('{{eval:round(100*(100*(M^(1/n)-1)/60))/100;a2}}', 'Le taux par heure ne se '
               'divise pas par $60$ : il faut la racine ${{N}}$-ième du coefficient global.',
               'Taux horaire divisé par 60'),
    ], precision={'type': 'decimal', 'digits': 2})],
    [
        '{{if:d==0|Une hausse|Une baisse}} de ${{x}}~\\%$ correspond au coefficient multiplicateur '
        'global $CM={{eval:M;d}}$.',
        'En ${{n}}$ heure{{if:n>1|s|}}, il y a ${{N}}$ minutes : le taux moyen par minute vérifie '
        '$(1+t_m)^{ {{N}} }={{eval:M;d}}$, donc $1+t_m={{eval:M;d}}^{\\frac{1}{ {{N}} }}$.',
        'Donc $t_m={{eval:M;d}}^{\\frac{1}{ {{N}} }}-1\\approx{{eval:round(10000*(M^(1/N)-1))/10000;d}}$.',
        'À la calculatrice : $t_m\\approx' + PRIMAIRE + '{ {{eval:' + TM + ';a2}} }~\\%$ par '
        'minute.',
    ],
    'Combien de minutes y a-t-il en ${{n}}$ heure{{if:n>1|s|}} ?',
    ['round(100*(100*(M^(1/N)-1))) != round(100*(1-2*d)*x/N)',
     'round(100*(100*(M^(1/N)-1))) != round(100*(100*(M^(1/n)-1))/60)'],
)

# 1,5^(1/120) − 1 ≈ 0,3384 % → 0,34 ; x/N = 0,4167 → 0,42 ; par heure 22,47 ; /60 → 0,37
V_F7 = {'d': '0', 'x': '50', 'n': '2', 'N': '120', 'M': '1.5'}
# 0,6^(1/60) − 1 ≈ −0,8478 % → −0,85 ; x/N → −0,67
V_F7B = {'d': '1', 'x': '40', 'n': '1', 'N': '60', 'M': '0.6'}
SPECS_F8 = [
    spec('F7 : +50 % en 2 h → 0,34 %', 0, V_F7, 'correct', ['0,34']),
    spec('F7 : taux divisé', 0, V_F7, 'incorrect', ['0,42'],
         'Les évolutions successives se multiplient : on ne divise pas $50~\\%$ par $120$.'),
    spec('F7 : heures pas converties', 0, V_F7, 'incorrect', ['22,47'],
         'C\'est le taux moyen par heure : en $2$ heures, il y a $120$ minutes.'),
    spec('F7 : taux horaire divisé par 60', 0, V_F7, 'incorrect', ['0,37'],
         'Le taux par heure ne se divise pas par $60$ : il faut la racine $120$-ième du '
         'coefficient global.'),
    spec('F7 : −40 % en 1 h → −0,85 %', 0, V_F7B, 'correct', ['-0,85']),
    spec('F7 : −40 %, taux divisé', 0, V_F7B, 'incorrect', ['-0,67']),
]

# =============================================================================================
# 94b1dbf6 (TTECHNO-033) — F8 : trouver a sur la courbe de aˣ
# =============================================================================================

# sg = 1 : a = n ; sg = −1 : a = 1/n ; A(sg·k ; nᵏ)
BASE_F8 = '{{if:sg==1|{{n}}|\\frac{1}{ {{n}} }}}'
F8 = variation(
    'La courbe ci-dessous représente une fonction $f:x\\mapsto a^x$, avec $a>0$. Elle passe par '
    'le point $A({{xA}}\\,;{{y}})$.\n\n'
    '```courbe\n'
    'x: -3.5 ; 3.5\n'
    'y: -0.5 ; 10.5\n'
    'grille: 1 ; 1\n'
    'f(x) = {{if:sg==1|{{n}}^x|(1/{{n}})^x}} sur [-3 ; 3]   bleu\n'
    'points: A({{xA}} ; {{y}})\n'
    'description: Courbe d\'une fonction x ↦ aˣ sur [−3 ; 3], passant par (0 ; 1) et par '
    'A({{xA}} ; {{y}}).\n'
    '```\n\n'
    'Détermine $a$. Donne la valeur exacte.\n\n$a=?$',
    [var('k', '1|2'), var('sg', '1|-1'), var('n', '2..5'), var('xA', 'eval:sg*k'),
     var('y', 'eval:n^k')],
    [case(BASE_F8, [
        erreur('{{if:sg==1|\\frac{1}{ {{n}} }|{{n}}}}', '$a^{ {{xA}} }={{y}}$ : {{if:sg==1|'
               'l\'exposant est positif, $a$ est plus grand que $1$.|l\'exposant est négatif, '
               '$a^{ {{xA}} }=\\dfrac{1}{' + '{{if:k==1|a|a^{2}}}' + '}$ : $a$ est plus petit que $1$.}}',
               'Inverse'),
        erreur('{{if:k==2|{{y}}|{{eval:-y}}}}', '{{if:k==2|$a^{ {{xA}} }={{y}}$ : l\'exposant est '
               '${{xA}}$, il faut encore défaire la puissance.|$a>0$ : la base d\'une fonction '
               '$x\\mapsto a^x$ est strictement positive.}}', '{{if:k==2|Ordonnée de A|Base négative}}'),
        erreur('{{if:k==2|\\frac{ {{y}} }{2}|{{eval:-y}}}}', '{{if:k==2|{{if:sg==-1|$a^{-2}=\\dfrac{1}{a^{2}}$, et |}}$a^{2}$ n\'est pas $2a$ : '
               'on prend la racine carrée, on ne divise pas par $2$.|$a>0$ : la base d\'une '
               'fonction $x\\mapsto a^x$ est strictement positive.}}',
               '{{if:k==2|Divisé par 2|Base négative}}'),
    ])],
    [
        'Le point $A({{xA}}\\,;{{y}})$ est sur la courbe : $f({{xA}})={{y}}$, soit '
        '$a^{ {{xA}} }={{y}}$.',
        '{{if:sg==1|{{if:k==1|$a={{y}}$.|$a^{2}={{y}}$ et $a>0$, donc $a=\\sqrt{ {{y}} }={{n}}$.}}'
        '|{{if:k==1|$a^{-1}=\\dfrac{1}{a}={{y}}$, donc $a=\\dfrac{1}{ {{y}} }$.|$a^{-2}=\\dfrac{1}{a^{2}}='
        '{{y}}$, donc $a^{2}=\\dfrac{1}{ {{y}} }$ et, comme $a>0$, $a=\\dfrac{1}{ {{n}} }$.}}}}',
        'La fonction est $f:x\\mapsto{{if:sg==1|{{n}}^x|\\left(\\frac{1}{ {{n}} }\\right)^x}}$ : $a=' + PRIMAIRE + '{'
        + BASE_F8 + '}$.',
    ],
    'Remplace $x$ par l\'abscisse de $A$ dans $f(x)=a^x$.',
    ['n^k <= 9'],
)

V_F8 = {'k': '2', 'sg': '1', 'n': '3', 'xA': '2', 'y': '9'}
V_F8N = {'k': '1', 'sg': '-1', 'n': '4', 'xA': '-1', 'y': '4'}
SPECS_94 = [
    spec('F8 : A(2 ; 9) → a = 3', 0, V_F8, 'correct', ['3']),
    spec('F8 : A(2 ; 9), ordonnée', 0, V_F8, 'incorrect', ['9'],
         '$a^2 = 9$ : l\'exposant est $2$, il faut encore défaire la puissance.'),
    spec('F8 : A(2 ; 9), divisé par 2', 0, V_F8, 'incorrect', ['\\frac{9}{2}'],
         '$a^2$ n\'est pas $2 a$ : on prend la racine carrée, on ne divise pas par $2$.'),
    spec('F8 : A(2 ; 9), inverse', 0, V_F8, 'incorrect', ['\\frac{1}{3}'],
         '$a^2 = 9$ : l\'exposant est positif, $a$ est plus grand que $1$.'),
    spec('F8 : A(−1 ; 4) → a = 1/4', 0, V_F8N, 'correct', ['\\frac{1}{4}']),
    spec('F8 : A(−1 ; 4) → 0,25', 0, V_F8N, 'correct', ['0,25']),
    spec('F8 : A(−1 ; 4), ordonnée (inverse)', 0, V_F8N, 'incorrect', ['4'],
         '$a^{-1} = 4$ : l\'exposant est négatif, $a^{ -1 }=\\dfrac{1}{a}$ : $a$ est plus '
         'petit que $1$.'),
    spec('F8 : A(−1 ; 4), base négative', 0, V_F8N, 'incorrect', ['-4'],
         '$a > 0$ : la base d\'une fonction $x\\mapsto a^x$ est strictement positive.'),
]

# =============================================================================================
# f6805041 (TTECHNO-036) — F9 : sens de k·aˣ avec une base en fraction
# =============================================================================================

# h : 1 → 3/2, 2 → 5/4, 3 → 2/3, 4 → 1/3, 5 → 1/2, 6 → 1,2, 7 → 0,25
NUM = '{{if:h==1|3|{{if:h==2|5|{{if:h==3|2|{{if:h==4|1|{{if:h==5|1|{{if:h==6|6|1}}}}}}}}}}}}'
DEN = '{{if:h==1|2|{{if:h==2|4|{{if:h==3|3|{{if:h==4|3|{{if:h==5|2|{{if:h==6|5|4}}}}}}}}}}}}'
BASE_F9 = '{{if:h==6|1{,}2|{{if:h==7|0{,}25|\\dfrac{ {{p}} }{ {{q}} }}}}}'
F9 = variation(
    'On considère la fonction $f$ définie sur $\\mathbb{R}$ par $f(x)={{eval:k;d}}\\times\\left('
    + BASE_F9 + '\\right)^x$.\n\nQuel est le sens de variation de $f$ sur $\\mathbb{R}$ ?\n\n'
    '```choix\nmelanger: non\n- croissante\n- décroissante\n- constante\n```',
    [var('h', '1..7'), var('p', NUM), var('q', DEN), var('u', '0.5|1.5|2.5|2|3|4|5|6'),
     var('sk', '1|-1'), var('k', 'eval:sk*u')],
    [case('{{eval:(1-sk*sign(p-q))/2}}')],
    [
        'Pour $k\\neq0$ et $a>0$ : si $k>0$, $x\\mapsto ka^x$ a **le même** sens de variation que '
        '$x\\mapsto a^x$ ; si $k<0$, elle a **le sens contraire** (multiplier par un nombre négatif '
        'renverse l\'ordre).',
        '$x\\mapsto\\left(' + BASE_F9 + '\\right)^x$ est {{if:p>q|croissante, car $' + BASE_F9
        + '>1$|décroissante, car $0<' + BASE_F9 + '<1$}}.',
        '$k={{eval:k;d}}{{if:sk==1|>0$ : même sens|<0$ : sens contraire}}, $f$ est $' + PRIMAIRE
        + '{\\text{' + '{{if:sk*sign(p-q)==1|croissante|décroissante}}' + '}}$.',
    ],
    'Compare la base à $1$, puis regarde le signe du coefficient devant la puissance.',
)

SPECS_F6 = [
    spec('F9 : 2 × (3/2)ˣ croissante', 0, {'h': '1', 'p': '3', 'q': '2', 'u': '2', 'sk': '1',
                                            'k': '2'}, 'correct', ['0']),
    spec('F9 : 2 × (3/2)ˣ, décroissante', 0, {'h': '1', 'p': '3', 'q': '2', 'u': '2', 'sk': '1',
                                               'k': '2'}, 'incorrect', ['1']),
    spec('F9 : −1,5 × (2/3)ˣ croissante', 0, {'h': '3', 'p': '2', 'q': '3', 'u': '1.5',
                                               'sk': '-1', 'k': '-1.5'}, 'correct', ['0']),
    spec('F9 : −1,5 × (2/3)ˣ, décroissante', 0, {'h': '3', 'p': '2', 'q': '3', 'u': '1.5',
                                                  'sk': '-1', 'k': '-1.5'}, 'incorrect', ['1']),
    spec('F9 : −4 × 1,2ˣ décroissante', 0, {'h': '6', 'p': '6', 'q': '5', 'u': '4', 'sk': '-1',
                                             'k': '-4'}, 'correct', ['1']),
    spec('F9 : 3 × 0,25ˣ décroissante', 0, {'h': '7', 'p': '1', 'q': '4', 'u': '3', 'sk': '1',
                                             'k': '3'}, 'correct', ['1']),
]


ajouter('52b884ee', [F1, F6], SPECS_52)
ajouter('10bd7075', [F2], SPECS_10)
ajouter('af24839d', [F3, F4], SPECS_AF)
ajouter('dc269779', [F5], SPECS_DC)
ajouter('f84e23a3', [F7], SPECS_F8)
ajouter('94b1dbf6', [F8], SPECS_94)
ajouter('f6805041', [F9], SPECS_F6)
print('7 modèles complétés dans', DOSSIER)
