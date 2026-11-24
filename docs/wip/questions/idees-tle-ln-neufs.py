"""Écrit les modèles neufs du chantier idees-tle-ln dans scripts/questions/idees-tle-ln-neufs/.

Phase 0 validée par David le 2026-11-24 (« je suis tes recos », journal
docs/wip/idees-tle-ln-progress.md, fiches docs/wip/idees-tle-ln-fiches.md) : F6 (ensemble de
définition d'une fonction avec ln, Q1 : TSPE-438) et F9 (limite d'une fonction avec ln, sans forme
indéterminée, Q2 : nouveau modèle).

Grades T_SPE. Ni theme, ni domain, ni subdomain, ni id : le rangement (nœud du point + tag) se fera
par migration, après la création en brouillon.

Règles suivies (couvrir-un-niveau.md § 5) : erreurs prévues par case (de vraies erreurs d'élèves,
sans en inventer pour atteindre trois) ; une erreur qui tombe sur la bonne réponse d'un tirage est
ignorée par le moteur ; un coup de pouce par variation, qui ne donne jamais la réponse. Variable
`x` = 'x|x' : `{{eval:…}}` garde x en lettre. ⛔ Jamais de variable `e` (Euler).

Usage : python3 docs/wip/questions/idees-tle-ln-neufs.py scripts/questions/idees-tle-ln-neufs
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
X = {'name': 'x', 'expression': 'x|x'}


def spec(desc, vi, variables_, status, answers, message=None, violations=None):
    expected = {'status': status}
    if violations:
        expected['constraintViolations'] = violations
    if message is not None:
        expected['expectedErrorMessage'] = message
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': expected, 'answers': answers}


def modele(title, description, level, variations, specs, shared=None, options=None):
    m = {'title': title, 'description': description, 'grades': ['T_SPE'], 'level': level,
         'delay': 60, 'status': 'draft', 'shared': shared or {'cleanCoefficients': True}}
    if options:
        m['options'] = options
    m['variations'] = variations
    m['testSpecs'] = specs
    return m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def case(attendue, erreurs=None):
    c = {'expectedAnswer': attendue}
    if erreurs:
        c['expectedErrors'] = erreurs
    return c


def variation(statement, variables, blanks, steps, hint, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': blanks, 'correction': {'steps': steps}, 'hint': hint}


def coef(v):
    """Coefficient devant une lettre : 1 → rien, −1 → −."""
    return '{{if:' + v + '==1||{{if:' + v + '==-1|-|{{' + v + '}}}}}}'


def puissance(n):
    """x, ou x^n."""
    return '{{if:' + n + '==1|x|x^{ {{' + n + '}} }}}'


RANGEMENT = {
    'f06-ensemble-definition-ln': ('Fonctions > Logarithmes > réciproque de l\'exponentielle', 'TSPE-438'),
    'f09-limite-ln-sans-forme-indeterminee': ('Fonctions > Logarithmes > courbe', 'TSPE-441'),
}


def ecrire(nom, m):
    os.makedirs(DOSSIER, exist_ok=True)
    chemin = os.path.join(DOSSIER, nom + '.json')
    # Garder l'id écrit en tête par create-questions --publier, s'il existe
    if os.path.exists(chemin):
        with open(chemin, encoding='utf-8') as f:
            ancien = json.load(f)
        if 'id' in ancien:
            m = {'id': ancien['id'], **m}
    # Rangement (nœud + point) relevé en prod le 2026-11-24, lu par migration-rangement.ts
    if nom in RANGEMENT:
        noeud, point = RANGEMENT[nom]
        tete = {k: m[k] for k in ('id',) if k in m}
        m = {**tete, 'rangement': {'noeud': noeud, 'point': point}, **{k: v for k, v in m.items() if k != 'id'}}
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write('\n')


# =============================================================================================
# F6 — TSPE-438 : ensemble de définition d'une fonction avec ln. ln X n'existe que pour X > 0.
# Réponse : ensemble en intervalles (réunions, ℝ ∖ {r} et ℝ jugés par interval-answer.ts).
# =============================================================================================

CONSIGNE_F6 = 'Détermine l\'ensemble de définition $\\mathcal{D}_f$ de $f$.\n\n$\\mathcal{D}_f=?$'
LN0 = '$\\ln 0$ n\'existe pas : la borne où l\'expression s\'annule est exclue.'

# a : ln(ax + b) → ]−b/a ; +∞[ si a > 0, ]−∞ ; −b/a[ si a < 0
R6A = '{{eval:-b/a}}'
F6_A = variation(
    'Soit $f$ la fonction définie par $f(x)=\\ln\\left(' + coef('a') + 'x{{b;+}}\\right)$.\n\n'
    + CONSIGNE_F6,
    [var('a', '1..9;±'), var('b', '1..9;±')],
    [case('{{if:a>0|]' + R6A + ';+\\infty[|]-\\infty;' + R6A + '[}}', [
        erreur('{{if:a>0|[' + R6A + ';+\\infty[|]-\\infty;' + R6A + ']}}', LN0, 'Borne fermée'),
        erreur('{{if:a>0|]-\\infty;' + R6A + '[|]' + R6A + ';+\\infty[}}',
               'Il faut ${{a}}x{{b;+}}>0$. {{if:a<0|En divisant par ${{a}}$, qui est négatif, le '
               'sens de l\'inégalité change.|Ici, $x$ doit être plus grand que $' + R6A + '$.}}',
               'Mauvais côté'),
        erreur('{{if:a>0|]{{eval:b/a}};+\\infty[|]-\\infty;{{eval:b/a}}[}}',
               '${{a}}x{{b;+}}>0\\iff {{a}}x>{{eval:-b}}$ : la borne est $' + R6A + '$.',
               'Signe de la borne'),
    ])],
    [
        '$\\ln X$ n\'existe que pour $X>0$ : il faut ' + '$' + coef('a') + 'x{{b;+}}>0$.',
        '$' + coef('a') + 'x{{b;+}}>0\\iff ' + coef('a') + 'x>{{eval:-b}}\\iff x'
        '{{if:a>0|>|<}}' + R6A + '${{if:a<0| (on divise par ${{a}}<0$ : le sens change)}}.',
        '$\\mathcal{D}_f=' + PRIMAIRE + '{ {{if:a>0|\\left]' + R6A + '\\,;+\\infty\\right['
        '|\\left]-\\infty\\,;' + R6A + '\\right[}} }$.',
    ],
    '$\\ln X$ n\'existe que pour $X>0$ : quelle inéquation faut-il résoudre ?',
)

# b : ln(s(x − p)(x − q)) développé, p < q entiers → extérieur (s = 1) ou intérieur (s = −1)
EXT = ']-\\infty;{{p}}[\\cup]{{q}};+\\infty['
INT = ']{{p}};{{q}}['
F6_B = variation(
    'Soit $f$ la fonction définie par $f(x)=\\ln\\left({{eval:s*x^2-s*(p+q)*x+s*p*q}}\\right)$.\n\n'
    + CONSIGNE_F6,
    [X, var('p', '-6..5'), var('q', '-5..6'), var('s', '1|-1')],
    [case('{{if:s>0|' + EXT + '|' + INT + '}}', [
        erreur('{{if:s>0|' + INT + '|' + EXT + '}}',
               'Un trinôme est du signe de son coefficient de $x^2$ à l\'extérieur des racines, '
               'du signe contraire entre elles : ici ce coefficient est '
               '{{if:s>0|positif|négatif}}.', 'Intérieur et extérieur échangés'),
        erreur('{{if:s>0|]-\\infty;{{p}}]\\cup[{{q}};+\\infty[|[{{p}};{{q}}]}}', LN0,
               'Bornes fermées'),
        erreur('{{if:s>0|]-\\infty;{{eval:-q}}[\\cup]{{eval:-p}};+\\infty[|]{{eval:-q}};{{eval:-p}}[}}',
               'Les racines sont les valeurs qui annulent le trinôme : vérifie leur signe.',
               'Signe des racines'),
    ])],
    [
        'Il faut ${{eval:s*x^2-s*(p+q)*x+s*p*q}}>0$. Ce trinôme a pour racines ${{p}}$ et ${{q}}$ : '
        '${{eval:s*x^2-s*(p+q)*x+s*p*q}}={{if:s<0|-}}(x{{eval:-p;+}})(x{{eval:-q;+}})$.',
        'Il est du signe de son coefficient de $x^2$, {{if:s>0|positif|négatif}}, à l\'extérieur '
        'des racines : il est strictement positif {{if:s>0|pour $x<{{p}}$ ou $x>{{q}}$|entre '
        '${{p}}$ et ${{q}}$}}.',
        '$\\mathcal{D}_f=' + PRIMAIRE + '{ {{if:s>0|\\left]-\\infty\\,;{{p}}\\right[\\cup\\left]'
        '{{q}}\\,;+\\infty\\right[|\\left]{{p}}\\,;{{q}}\\right[}} }$.',
    ],
    'Il faut que le trinôme soit strictement positif : cherche ses racines, puis son signe.',
    ['p < q', 'p+q != 0', 'p*q != 0'],
)

# c : ln((ax + b)/(cx + d)), a, c > 0, r1 = −b/a < r2 = −d/c → ]−∞ ; r1[ ∪ ]r2 ; +∞[ ;
# avec r1 > r2, même chose dans l'autre ordre : on impose r1 < r2 en tirant d.
QEXT = ']-\\infty;{{r1}}[\\cup]{{r2}};+\\infty['
F6_C = variation(
    'Soit $f$ la fonction définie par $f(x)=\\ln\\left(\\dfrac{' + coef('a') + 'x{{b;+}}}{'
    + coef('c') + 'x{{d;+}}}\\right)$.\n\n' + CONSIGNE_F6,
    [var('a', '1..3'), var('b', '-9..9'), var('c', '1..3'), var('d', '-9..9'),
     var('r1', 'eval:-b/a'), var('r2', 'eval:-d/c')],
    [case(QEXT, [
        erreur(']{{r1}};{{r2}}[',
               'Un quotient est positif quand le numérateur et le dénominateur ont le même signe : '
               'dresse son tableau de signes.', 'Intervalle entre les valeurs'),
        erreur(']-\\infty;{{r1}}]\\cup]{{r2}};+\\infty[',
               'En $x={{r1}}$, le quotient vaut $0$ et $\\ln 0$ n\'existe pas.', 'Borne fermée'),
        erreur('\\mathbb{R}\\setminus\\left\\{ {{r2}} \\right\\}',
               'Exclure la valeur interdite ne suffit pas : le quotient doit être strictement '
               'positif.', 'Valeur interdite seule'),
    ])],
    [
        'Il faut $\\dfrac{' + coef('a') + 'x{{b;+}}}{' + coef('c') + 'x{{d;+}}}>0$. Le numérateur '
        's\'annule en ${{r1}}$, le dénominateur en ${{r2}}$ (valeur interdite).',
        'Comme les coefficients de $x$ sont positifs, les deux facteurs sont négatifs avant '
        '${{r1}}$, de signes contraires entre ${{r1}}$ et ${{r2}}$, positifs après ${{r2}}$ : le '
        'quotient est strictement positif pour $x<{{r1}}$ ou $x>{{r2}}$.',
        '$\\mathcal{D}_f=' + PRIMAIRE + '{\\left]-\\infty\\,;{{r1}}\\right[\\cup\\left]{{r2}}\\,;'
        '+\\infty\\right[}$.',
    ],
    'Le quotient doit être strictement positif : dresse le tableau de signes du numérateur et du '
    'dénominateur.',
    ['r1 < r2', 'b != 0', 'd != 0'],
)

# d : ln((x − r)²) développé → ℝ ∖ {r}
F6_D = variation(
    'Soit $f$ la fonction définie par $f(x)=\\ln\\left({{eval:x^2-2*r*x+r^2}}\\right)$.\n\n'
    + CONSIGNE_F6,
    [X, var('r', '1..6;±')],
    [case('\\mathbb{R}\\setminus\\left\\{ {{r}} \\right\\}', [
        erreur('\\mathbb{R}',
               'En $x={{r}}$, l\'expression vaut $0$ et $\\ln 0$ n\'existe pas.', 'Racine oubliée'),
        erreur(']{{r}};+\\infty[',
               'Un carré est positif des deux côtés de ${{r}}$ : seul $x={{r}}$ est exclu.',
               'Un seul côté'),
    ])],
    [
        '${{eval:x^2-2*r*x+r^2}}=(x{{eval:-r;+}})^{2}$ : c\'est un carré, positif, qui ne '
        's\'annule qu\'en $x={{r}}$.',
        'Il faut $(x{{eval:-r;+}})^{2}>0$, c\'est-à-dire $x\\neq {{r}}$.',
        '$\\mathcal{D}_f=' + PRIMAIRE + '{\\mathbb{R}\\setminus\\left\\{ {{r}} \\right\\} }$.',
    ],
    'Reconnais une identité remarquable : quand l\'expression est-elle nulle ?',
)

# e : ln(x² + c), c > 0 → ℝ
F6_E = variation(
    'Soit $f$ la fonction définie par $f(x)=\\ln\\left(x^{2}+{{c}}\\right)$.\n\n' + CONSIGNE_F6,
    [var('c', '1..9')],
    [case('\\mathbb{R}', [
        erreur(']0;+\\infty[',
               '$\\ln$ est définie sur $\\left]0\\,;+\\infty\\right[$, mais ici c\'est $x^{2}+{{c}}$ '
               'qui doit être strictement positif, pas $x$.', 'x > 0'),
        erreur('\\mathbb{R}\\setminus\\left\\{ 0 \\right\\}',
               'En $x=0$, $x^{2}+{{c}}={{c}}>0$ : $0$ n\'est pas exclu.', 'Zéro exclu'),
    ])],
    [
        'Il faut $x^{2}+{{c}}>0$.',
        'Pour tout réel $x$, $x^{2}\\geqslant 0$, donc $x^{2}+{{c}}\\geqslant {{c}}>0$.',
        '$\\mathcal{D}_f=' + PRIMAIRE + '{\\mathbb{R}}$.',
    ],
    'Quel est le signe de $x^{2}+{{c}}$ ? Peut-il s\'annuler ?',
)

SPECS_F6 = [
    spec('a : ln(2x − 3)', 0, {'a': '2', 'b': '-3'}, 'correct', [']\\frac{3}{2};+\\infty[']),
    spec('a : écrit en décimal', 0, {'a': '2', 'b': '-3'}, 'correct', [']1.5;+\\infty[']),
    spec('a : borne fermée', 0, {'a': '2', 'b': '-3'}, 'incorrect', ['[\\frac{3}{2};+\\infty['],
         LN0),
    spec('a : signe de la borne', 0, {'a': '2', 'b': '-3'}, 'incorrect',
         [']-\\frac{3}{2};+\\infty[']),
    spec('a : ln(−3x + 6)', 0, {'a': '-3', 'b': '6'}, 'correct', [']-\\infty;2[']),
    spec('a : a < 0, mauvais côté', 0, {'a': '-3', 'b': '6'}, 'incorrect', [']2;+\\infty[']),
    spec('b : x² − x − 6 = (x + 2)(x − 3)', 1, {'p': '-2', 'q': '3', 's': '1'}, 'correct',
         [']-\\infty;-2[\\cup]3;+\\infty[']),
    spec('b : intérieur à tort', 1, {'p': '-2', 'q': '3', 's': '1'}, 'incorrect', [']-2;3[']),
    spec('b : bornes fermées', 1, {'p': '-2', 'q': '3', 's': '1'}, 'incorrect',
         [']-\\infty;-2]\\cup[3;+\\infty[']),
    spec('b : signe des racines', 1, {'p': '-2', 'q': '3', 's': '1'}, 'incorrect',
         [']-\\infty;-3[\\cup]2;+\\infty[']),
    spec('b : −x² + x + 6 → intérieur', 1, {'p': '-2', 'q': '3', 's': '-1'}, 'correct',
         [']-2;3[']),
    spec('b : s = −1, extérieur à tort', 1, {'p': '-2', 'q': '3', 's': '-1'}, 'incorrect',
         [']-\\infty;-2[\\cup]3;+\\infty[']),
    spec('c : (x + 1)/(2x − 4)', 2,
         {'a': '1', 'b': '1', 'c': '2', 'd': '-4', 'r1': '-1', 'r2': '2'}, 'correct',
         [']-\\infty;-1[\\cup]2;+\\infty[']),
    spec('c : entre les valeurs', 2,
         {'a': '1', 'b': '1', 'c': '2', 'd': '-4', 'r1': '-1', 'r2': '2'}, 'incorrect',
         [']-1;2[']),
    spec('c : borne fermée au numérateur', 2,
         {'a': '1', 'b': '1', 'c': '2', 'd': '-4', 'r1': '-1', 'r2': '2'}, 'incorrect',
         [']-\\infty;-1]\\cup]2;+\\infty[']),
    spec('c : valeur interdite seule', 2,
         {'a': '1', 'b': '1', 'c': '2', 'd': '-4', 'r1': '-1', 'r2': '2'}, 'incorrect',
         ['\\mathbb{R}\\setminus\\left\\{2\\right\\}']),
    spec('d : (x − 3)²', 3, {'r': '3'}, 'correct', ['\\mathbb{R}\\setminus\\left\\{3\\right\\}']),
    spec('d : écrit en réunion', 3, {'r': '3'}, 'correct', [']-\\infty;3[\\cup]3;+\\infty[']),
    spec('d : racine oubliée', 3, {'r': '3'}, 'incorrect', ['\\mathbb{R}']),
    spec('d : un seul côté', 3, {'r': '3'}, 'incorrect', [']3;+\\infty[']),
    spec('e : x² + 4', 4, {'c': '4'}, 'correct', ['\\mathbb{R}']),
    spec('e : écrit en intervalle', 4, {'c': '4'}, 'correct', [']-\\infty;+\\infty[']),
    spec('e : x > 0', 4, {'c': '4'}, 'incorrect', [']0;+\\infty[']),
]

F6 = modele(
    'Ensemble de définition d\'une fonction avec ln',
    'Ensemble de définition de ln(u) : u affine, trinôme (extérieur ou intérieur des racines), '
    'quotient d\'affines, carré (ℝ privé d\'un point), x² + c (ℝ) (pièges : borne fermée, sens '
    'quand a < 0, intérieur et extérieur échangés, valeur interdite seule)',
    2, [F6_A, F6_B, F6_C, F6_D, F6_E], SPECS_F6,
    shared={'cleanCoefficients': True, 'blankDefaults': {'answerKind': 'intervalles'}},
    options={'constraints': {'spaces': 'off'}})


# =============================================================================================
# F9 — TSPE-441 : limites avec ln par les opérations (pas de forme indéterminée) ou par
# composition (idée en attente TSA2-35). Réponse : une limite (0, +∞, −∞, ou ln k).
# =============================================================================================

CC_A_TORT = ('Il n\'y a pas de forme indéterminée ici : les croissances comparées ne servent pas. '
             'Cherche la limite de chaque terme.')

F9_A = variation(
    'Soit $f$ la fonction définie sur $\\left]0\\,;+\\infty\\right[$ par $f(x)=\\ln x+' + coef('a')
    + puissance('n') + '$.\n\nDétermine la limite de $f$ en $+\\infty$.\n\n'
    '$\\displaystyle\\lim_{x\\to+\\infty}f(x)=?$',
    [var('a', '1..5'), var('n', '1..4')],
    [case('+\\infty', [
        erreur('0', CC_A_TORT, 'Croissance comparée à tort'),
        erreur('-\\infty', '$\\ln x$ tend vers $+\\infty$ en $+\\infty$, pas vers $-\\infty$.',
               'Limite de ln x'),
    ])],
    [
        '$\\displaystyle\\lim_{x\\to+\\infty}\\ln x=+\\infty$ et $\\displaystyle\\lim_{x\\to+\\infty}'
        + coef('a') + puissance('n') + '=+\\infty$.',
        'Par somme, $\\displaystyle\\lim_{x\\to+\\infty}f(x)=' + PRIMAIRE + '{+\\infty}$ : pas de '
        'forme indéterminée.',
    ],
    'Cherche la limite de chacun des deux termes en $+\\infty$, puis additionne.',
)

F9_B = variation(
    'Soit $f$ la fonction définie sur $\\left]0\\,;+\\infty\\right[$ par $f(x)=\\ln x{{if:a>0|+}}'
    + coef('a') + puissance('n') + '$.\n\nDétermine la limite de $f$ en $0$ (on a $x>0$).\n\n'
    '$\\displaystyle\\lim_{x\\to0}f(x)=?$',
    [var('a', '1..5;±'), var('n', '1..4')],
    [case('-\\infty', [
        erreur('0', '$' + puissance('n') + '$ tend vers $0$, mais $\\ln x$ tend vers $-\\infty$ '
               'quand $x$ tend vers $0$.', 'ln x → 0'),
        erreur('+\\infty', '$\\ln x$ tend vers $-\\infty$ en $0$, pas vers $+\\infty$.',
               'Limite de ln x'),
        erreur('{{a}}', 'Le terme ' + '$' + coef('a') + puissance('n') + '$ tend vers $0$ : '
               'c\'est $\\ln x$ qui donne la limite.', 'Coefficient a'),
    ])],
    [
        '$\\displaystyle\\lim_{x\\to0}\\ln x=-\\infty$ et $\\displaystyle\\lim_{x\\to0}' + coef('a')
        + puissance('n') + '=0$.',
        'Par somme, $\\displaystyle\\lim_{x\\to0}f(x)=' + PRIMAIRE + '{-\\infty}$.',
    ],
    'Cherche la limite de chacun des deux termes en $0$.',
)

SIGNE_A = '{{if:a>0|+\\infty|-\\infty}}'
SIGNE_OPP = '{{if:a>0|-\\infty|+\\infty}}'

F9_C = variation(
    'Soit $f$ la fonction définie sur $\\left]0\\,;+\\infty\\right[$ par $f(x)=' + coef('a')
    + puissance('n') + '\\ln x$.\n\nDétermine la limite de $f$ en $+\\infty$.\n\n'
    '$\\displaystyle\\lim_{x\\to+\\infty}f(x)=?$',
    [var('a', '1..5;±'), var('n', '1..3')],
    [case(SIGNE_A, [
        erreur('0', '$x\\ln x$ tend vers $0$ en $0$, pas en $+\\infty$ : en $+\\infty$, les deux '
               'facteurs tendent vers $+\\infty$.', 'Croissance comparée à tort'),
        erreur(SIGNE_OPP, 'Le coefficient ${{a}}$ est {{if:a>0|positif|négatif}} : il garde le '
               'signe du produit.', 'Signe de a'),
    ])],
    [
        '$\\displaystyle\\lim_{x\\to+\\infty}' + puissance('n') + '=+\\infty$ et '
        '$\\displaystyle\\lim_{x\\to+\\infty}\\ln x=+\\infty$, donc leur produit tend vers '
        '$+\\infty$.',
        'Multiplié par ${{a}}$, {{if:a>0|positif|négatif}} : $\\displaystyle\\lim_{x\\to+\\infty}'
        'f(x)=' + PRIMAIRE + '{' + SIGNE_A + '}$.',
    ],
    'Cherche la limite de chaque facteur en $+\\infty$ : y a-t-il une forme indéterminée ?',
)

F9_D = variation(
    'Soit $f$ la fonction définie sur $\\left]0\\,;+\\infty\\right[$ par $f(x)=\\dfrac{' + coef('a')
    + '\\ln x}{' + puissance('n') + '}$.\n\nDétermine la limite de $f$ en $0$ (on a $x>0$).\n\n'
    '$\\displaystyle\\lim_{x\\to0}f(x)=?$',
    [var('a', '1..5;±'), var('n', '1..3')],
    [case(SIGNE_OPP, [
        erreur('0', CC_A_TORT, 'Croissance comparée à tort'),
        erreur(SIGNE_A, 'En $0$, $\\ln x$ tend vers $-\\infty$ : le numérateur tend vers '
               '{{if:a>0|$-\\infty$|$+\\infty$}}.', 'Signe'),
    ])],
    [
        'En $0$ : $' + coef('a') + '\\ln x$ tend vers {{if:a>0|$-\\infty$|$+\\infty$}} et $'
        + puissance('n') + '$ tend vers $0$ en restant positif.',
        'Un quotient dont le numérateur tend vers l\'infini et le dénominateur vers $0^{+}$ tend '
        'vers l\'infini : $\\displaystyle\\lim_{x\\to0}f(x)=' + PRIMAIRE + '{' + SIGNE_OPP + '}$.',
    ],
    'Cherche séparément la limite du numérateur et celle du dénominateur en $0$.',
)

F9_E = variation(
    'Soit $f$ la fonction définie sur $\\left]0\\,;+\\infty\\right[$ par $f(x)=\\ln\\left('
    + coef('a') + puissance('n') + '+{{k}}\\right)$.\n\nDétermine la limite de $f$ en '
    '$+\\infty$.\n\n$\\displaystyle\\lim_{x\\to+\\infty}f(x)=?$',
    [var('a', '1..5'), var('n', '1..4'), var('k', '1..9')],
    [case('+\\infty', [
        erreur('\\ln {{k}}', 'C\'est en $0$ que $' + coef('a') + puissance('n') + '+{{k}}$ tend '
               'vers ${{k}}$ ; en $+\\infty$, il tend vers $+\\infty$.', 'ln k'),
        erreur('0', 'Composition : $X=' + coef('a') + puissance('n') + '+{{k}}$ tend vers '
               '$+\\infty$, et $\\ln X$ aussi.', 'Zéro'),
    ])],
    [
        'On pose $X=' + coef('a') + puissance('n') + '+{{k}}$ : $\\displaystyle'
        '\\lim_{x\\to+\\infty}X=+\\infty$.',
        'Et $\\displaystyle\\lim_{X\\to+\\infty}\\ln X=+\\infty$. Par composition, '
        '$\\displaystyle\\lim_{x\\to+\\infty}f(x)=' + PRIMAIRE + '{+\\infty}$.',
    ],
    'Pose $X$ l\'expression dans le logarithme : vers quoi tend-elle ?',
)

F9_F = variation(
    'Soit $f$ la fonction définie sur $\\left]0\\,;+\\infty\\right[$ par $f(x)=\\ln\\left({{k}}+'
    '\\dfrac{ {{a}} }{' + puissance('n') + '}\\right)$.\n\nDétermine la limite de $f$ en '
    '$+\\infty$.\n\n$\\displaystyle\\lim_{x\\to+\\infty}f(x)=?$',
    [var('k', '2..9'), var('a', '1..5'), var('n', '1..3')],
    [case('\\ln {{k}}', [
        erreur('{{k}}', 'L\'expression dans le logarithme tend vers ${{k}}$, donc $f(x)$ tend vers '
               '$\\ln {{k}}$ : il manque le logarithme.', 'ln oublié'),
        erreur('0', '$\\dfrac{ {{a}} }{' + puissance('n') + '}$ tend vers $0$, mais il reste ${{k}}$ '
               'dans le logarithme.', 'Zéro'),
        erreur('+\\infty', '$\\dfrac{ {{a}} }{' + puissance('n') + '}$ tend vers $0$ en $+\\infty$ : '
               'l\'expression dans le logarithme a une limite finie.', 'Infini'),
    ])],
    [
        'On pose $X={{k}}+\\dfrac{ {{a}} }{' + puissance('n') + '}$ : $\\displaystyle'
        '\\lim_{x\\to+\\infty}\\dfrac{ {{a}} }{' + puissance('n') + '}=0$, donc $X$ tend vers ${{k}}$.',
        '$\\ln$ est continue en ${{k}}$ : par composition, $\\displaystyle\\lim_{x\\to+\\infty}'
        'f(x)=' + PRIMAIRE + '{\\ln {{k}}}$.',
    ],
    'Vers quoi tend l\'expression dans le logarithme ?',
)

SPECS_F9 = [
    spec('a : ln x + 2x²', 0, {'a': '2', 'n': '2'}, 'correct', ['+\\infty']),
    spec('a : croissance comparée à tort', 0, {'a': '2', 'n': '2'}, 'incorrect', ['0'],
         CC_A_TORT),
    spec('a : −∞', 0, {'a': '2', 'n': '2'}, 'incorrect', ['-\\infty']),
    spec('b : ln x − 3x', 1, {'a': '-3', 'n': '1'}, 'correct', ['-\\infty']),
    spec('b : 0', 1, {'a': '-3', 'n': '1'}, 'incorrect', ['0']),
    spec('b : +∞', 1, {'a': '-3', 'n': '1'}, 'incorrect', ['+\\infty']),
    spec('c : −2x² ln x', 2, {'a': '-2', 'n': '2'}, 'correct', ['-\\infty']),
    spec('c : 0', 2, {'a': '-2', 'n': '2'}, 'incorrect', ['0']),
    spec('c : signe de a', 2, {'a': '-2', 'n': '2'}, 'incorrect', ['+\\infty']),
    spec('c : 3x ln x', 2, {'a': '3', 'n': '1'}, 'correct', ['+\\infty']),
    spec('d : 3 ln x / x²', 3, {'a': '3', 'n': '2'}, 'correct', ['-\\infty']),
    spec('d : 0', 3, {'a': '3', 'n': '2'}, 'incorrect', ['0']),
    spec('d : signe', 3, {'a': '3', 'n': '2'}, 'incorrect', ['+\\infty']),
    spec('d : −ln x / x', 3, {'a': '-1', 'n': '1'}, 'correct', ['+\\infty']),
    spec('e : ln(2x³ + 5)', 4, {'a': '2', 'n': '3', 'k': '5'}, 'correct', ['+\\infty']),
    spec('e : ln k', 4, {'a': '2', 'n': '3', 'k': '5'}, 'incorrect', ['\\ln5']),
    spec('f : ln(3 + 2/x)', 5, {'k': '3', 'a': '2', 'n': '1'}, 'correct', ['\\ln3']),
    spec('f : ln(3) avec parenthèses', 5, {'k': '3', 'a': '2', 'n': '1'}, 'correct', ['\\ln(3)']),
    spec('f : ln oublié', 5, {'k': '3', 'a': '2', 'n': '1'}, 'incorrect', ['3']),
    spec('f : 0', 5, {'k': '3', 'a': '2', 'n': '1'}, 'incorrect', ['0']),
]

F9 = modele(
    'Limite d\'une fonction avec ln, sans forme indéterminée',
    'Limites en 0 ou en +∞ de ln x + axⁿ, axⁿ ln x, a ln x / xⁿ (opérations, sans forme '
    'indéterminée), et de ln(axⁿ + k), ln(k + a/xⁿ) (composition) (pièges : croissances comparées '
    'appliquées à tort, signe de a, ln oublié)',
    3, [F9_A, F9_B, F9_C, F9_D, F9_E, F9_F], SPECS_F9)


MODELES = {
    'f06-ensemble-definition-ln': lambda: F6,
    'f09-limite-ln-sans-forme-indeterminee': lambda: F9,
}
choisis = sys.argv[2:] or list(MODELES)
for nom in choisis:
    ecrire(nom, MODELES[nom]())
print(len(choisis), 'modèle(s) écrit(s) dans', DOSSIER)
