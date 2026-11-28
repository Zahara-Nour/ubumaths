"""Ajoute les variations validées aux 7 modèles publiés exportés de prod dans
scripts/questions/idees-tle-limites-publies/ (chantier idees-tle-limites).

Phase 0 validée par David le 2026-11-22 : F4, F5 (a4d8dc52), F6 (04ec9518), F7 (5bf5b452),
F8 (b97dabe1), F9 (ae70373c), F10 (806c10f4), F11 (7844be9a). Les variations s'ajoutent À LA FIN
(les réponses des élèves gardent l'indice de leur variation) ; la migration de contenu est générée
par scripts/questions/migration-contenu.ts.

Le script repart du contenu de prod (variations et specs d'origine, comptées dans ORIGINE) :
le relancer réécrit les ajouts sans les doubler.

Usage : python3 docs/wip/questions/idees-tle-limites-publies.py scripts/questions/idees-tle-limites-publies
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
PINF = '+\\infty'
MINF = '-\\infty'

# id court → (variations, specs) d'origine en prod (export du 2026-11-22)
ORIGINE = {'a4d8dc52': (4, 14), '04ec9518': (4, 13), '5bf5b452': (3, 12), 'b97dabe1': (3, 8),
           'ae70373c': (4, 11), '806c10f4': (4, 14), '7844be9a': (4, 14)}


def spec(desc, vi, variables_, status, answers, message=None):
    expected = {'status': status}
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
    if kind:
        c['answerKind'] = kind
    if erreurs:
        c['expectedErrors'] = erreurs
    return c


def variation(statement, variables, blanks, steps, hint, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': blanks, 'correction': {'steps': steps}, 'hint': hint}


def coef(v):
    """Coefficient devant une lettre : 1 → rien, −1 → −."""
    return '{{if:' + v + '==1||{{if:' + v + '==-1|-|{{' + v + '}}}}}}'


def puiss(n):
    """x^n, avec x seul pour n = 1."""
    return '{{if:' + n + '==1|x|x^{ {{' + n + '}} }}}'


def lim(borne):
    return '\\displaystyle\\lim_{x\\to' + borne + '}f(x)'


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


# =============================================================================================
# a4d8dc52 — TSPE-404, asymptote parallèle à un axe. F4 : asymptote lue dans un tableau de
# variations (horizontale, verticale) ; F5 : une limite qui ne donne pas toujours d'asymptote.
# =============================================================================================

ASY_CONSIGNE = ('Donne une équation de l\'asymptote à $\\mathcal{C}_f$ que l\'on peut lire dans ce '
                'tableau.\n\n$?$')

# F4 a : f croît de −∞ (ou de b) jusqu'à M en c, puis décroît vers b (ou vers −∞).
F4_A = variation(
    'Voici le tableau de variations d\'une fonction $f$ définie sur $\\mathbb{R}$, de courbe '
    '$\\mathcal{C}_f$.\n\n'
    + bloc('variation', 'variable: x', 'domain: -inf, {{c}}, +inf', '', 'variation: f(x)',
           '  -inf: {{if:sg>0|-inf|{{b}}}}, bottom',
           '  {{c}}: {{eval:b+h}}, top',
           '  +inf: {{if:sg>0|{{b}}|-inf}}, bottom')
    + '\n\n' + ASY_CONSIGNE,
    [var('b', '-5..5'), var('c', '-4..4'), var('h', '1..4'), var('sg', '1|-1')],
    [case('y={{b}}', [
        erreur('x={{b}}',
               'Une limite finie en ${{if:sg>0|+|-}}\\infty$ donne une asymptote horizontale : son '
               'équation commence par $y =$.', 'x et y échangés'),
        erreur('y={{eval:b+h}}',
               'Tu as lu le maximum de $f$ : l\'asymptote vient de la limite écrite au bout du '
               'tableau.', 'Maximum lu'),
        erreur('x={{c}}',
               'Tu as donné l\'abscisse du maximum : l\'asymptote vient de la limite écrite au bout '
               'du tableau.', 'Abscisse du maximum'),
    ], 'equation')],
    [
        'Le tableau donne $' + lim('{{if:sg>0|+|-}}\\infty') + '={{b}}$ : une limite **finie** en '
        '${{if:sg>0|+|-}}\\infty$.',
        'La droite d\'équation $' + PRIMAIRE + '{y={{b}}}$ est asymptote horizontale à '
        '$\\mathcal{C}_f$ en ${{if:sg>0|+|-}}\\infty$.',
    ],
    'Cherche dans le tableau une limite finie en $+\\infty$ ou en $-\\infty$, ou une limite infinie '
    'en un réel.',
    ['c != b'],
)

# F4 b : f définie sur ]a ; +∞[, limite ±∞ en a, extremum N en m, puis ±∞ en +∞.
F4_B = variation(
    'Voici le tableau de variations d\'une fonction $f$ définie sur '
    '$\\left]{{a}}\\,;+\\infty\\right[$, de courbe $\\mathcal{C}_f$.\n\n'
    + bloc('variation', 'variable: x', 'domain: {{a}}, {{eval:a+h}}, +inf', '', 'variation: f(x)',
           '  {{a}}: ||, right, {{if:sg>0|+inf, top|-inf, bottom}}',
           '  {{eval:a+h}}: {{N}}, {{if:sg>0|bottom|top}}',
           '  +inf: {{if:sg>0|+inf, top|-inf, bottom}}')
    + '\n\n' + ASY_CONSIGNE,
    [var('a', '-5..5'), var('h', '1..3'), var('N', '-5..5'), var('sg', '1|-1')],
    [case('x={{a}}', [
        erreur('y={{a}}',
               'Une limite infinie en ${{a}}$ donne une asymptote verticale : son équation commence '
               'par $x =$.', 'x et y échangés'),
        erreur('x={{eval:a+h}}',
               'Tu as donné l\'abscisse {{if:sg>0|du minimum|du maximum}} : l\'asymptote vient '
               'de la limite infinie en ${{a}}$, sous la double barre.', 'Abscisse de l\'extremum'),
        erreur('y={{N}}',
               'Tu as lu {{if:sg>0|le minimum|le maximum}} de $f$ : l\'asymptote vient de la limite '
               'infinie en ${{a}}$, sous la double barre.', 'Extremum lu'),
    ], 'equation')],
    [
        'Le tableau donne $\\displaystyle\\lim_{x\\to {{a}}}f(x)={{if:sg>0|+|-}}\\infty$ (à droite '
        'de ${{a}}$) : une limite **infinie** en un réel.',
        'La droite d\'équation $' + PRIMAIRE + '{x={{a}}}$ est asymptote verticale à '
        '$\\mathcal{C}_f$. En $+\\infty$, la limite est infinie : pas d\'asymptote horizontale.',
    ],
    'Cherche dans le tableau une limite finie en $+\\infty$ ou en $-\\infty$, ou une limite infinie '
    'en un réel.',
    ['N != a', 'N != a+h'],
)

# F5 : quatre situations, dont deux sans asymptote ; t = 0 : lim en ±∞ = b ; t = 1 : lim en ±∞
# infinie ; t = 2 : lim en a infinie ; t = 3 : lim en a = b.
F5_BORNE = '{{if:t<2|{{s}}\\infty|{{a}}}}'
F5_VALEUR = '{{if:t==1|{{s2}}\\infty|{{if:t==2|{{s2}}\\infty|{{b}}}}}}'
F5 = variation(
    'Soit $f$ une fonction, de courbe $\\mathcal{C}_f$, telle que $\\displaystyle\\lim_{x\\to'
    + F5_BORNE + '}f(x)=' + F5_VALEUR + '$.\n\nQue peut-on en déduire ?\n\n'
    + bloc('choix',
           '- $\\mathcal{C}_f$ admet l\'asymptote horizontale d\'équation $y={{b}}$.',
           '- $\\mathcal{C}_f$ admet l\'asymptote verticale d\'équation $x={{b}}$.',
           '- $\\mathcal{C}_f$ admet l\'asymptote verticale d\'équation $x={{a}}$.',
           '- Cette limite ne donne pas d\'asymptote parallèle à un axe.'),
    [var('t', '0..3'), var('a', '-6..6'), var('b', '-6..6'), var('s', '+|-'), var('s2', '+|-')],
    [case('{{if:t==0|0|{{if:t==2|2|3}}}}')],
    [
        'Une asymptote **horizontale** vient d\'une limite **finie** en $+\\infty$ ou en '
        '$-\\infty$ ; une asymptote **verticale**, d\'une limite **infinie** en un réel.',
        '{{if:t==0|Ici, la limite est finie en ${{s}}\\infty$ : $' + PRIMAIRE + '{y={{b}}}$ est '
        'asymptote horizontale.|{{if:t==2|Ici, la limite est infinie en ${{a}}$ : $' + PRIMAIRE
        + '{x={{a}}}$ est asymptote verticale.|{{if:t==1|Ici, la limite est infinie en '
        '${{s}}\\infty$|Ici, la limite est finie en ${{a}}$}} : $' + PRIMAIRE
        + '{\\text{pas d\'asymptote}}$ parallèle à un axe.}}}}',
    ],
    'Une asymptote horizontale vient d\'une limite finie en $+\\infty$ ou en $-\\infty$ ; une '
    'asymptote verticale, d\'une limite infinie en un réel.',
    ['a != b', 'a != 0', 'b != 0'],
)

SPECS_A4 = [
    spec('F4a : tableau, lim en +∞ = 2', 0, {'b': '2', 'c': '-1', 'h': '3', 'sg': '1'}, 'correct',
         ['y=2']),
    spec('F4a : y − 2 = 0', 0, {'b': '2', 'c': '-1', 'h': '3', 'sg': '1'}, 'correct', ['y-2=0']),
    spec('F4a : x et y échangés', 0, {'b': '2', 'c': '-1', 'h': '3', 'sg': '1'}, 'incorrect',
         ['x=2'],
         'Une limite finie en $+\\infty$ donne une asymptote horizontale : son équation commence par '
         '$y =$.'),
    spec('F4a : maximum lu', 0, {'b': '2', 'c': '-1', 'h': '3', 'sg': '1'}, 'incorrect', ['y=5'],
         'Tu as lu le maximum de $f$ : l\'asymptote vient de la limite écrite au bout du tableau.'),
    spec('F4a : abscisse du maximum', 0, {'b': '2', 'c': '-1', 'h': '3', 'sg': '1'}, 'incorrect',
         ['x=-1'],
         'Tu as donné l\'abscisse du maximum : l\'asymptote vient de la limite écrite au bout du '
         'tableau.'),
    spec('F4a : lim en −∞ = −3', 0, {'b': '-3', 'c': '2', 'h': '1', 'sg': '-1'}, 'correct',
         ['y=-3']),
    spec('F4b : verticale x = 1', 1, {'a': '1', 'h': '2', 'N': '-2', 'sg': '1'}, 'correct',
         ['x=1']),
    spec('F4b : x et y échangés', 1, {'a': '1', 'h': '2', 'N': '-2', 'sg': '1'}, 'incorrect',
         ['y=1'],
         'Une limite infinie en $1$ donne une asymptote verticale : son équation commence par '
         '$x =$.'),
    spec('F4b : abscisse de l\'extremum', 1, {'a': '1', 'h': '2', 'N': '-2', 'sg': '1'},
         'incorrect', ['x=3'],
         'Tu as donné l\'abscisse du minimum : l\'asymptote vient de la limite infinie en $1$, sous '
         'la double barre.'),
    spec('F4b : extremum lu', 1, {'a': '1', 'h': '2', 'N': '-2', 'sg': '1'}, 'incorrect', ['y=-2'],
         'Tu as lu le minimum de $f$ : l\'asymptote vient de la limite infinie en $1$, sous la '
         'double barre.'),
    spec('F4b : vers −∞, x = −4', 1, {'a': '-4', 'h': '1', 'N': '2', 'sg': '-1'}, 'correct',
         ['x=-4']),
    spec('F5 : limite finie en +∞', 2, {'t': '0', 'a': '2', 'b': '-3', 's': '+', 's2': '+'},
         'correct', ['0']),
    spec('F5 : limite finie en +∞, verticale à tort', 2,
         {'t': '0', 'a': '2', 'b': '-3', 's': '+', 's2': '+'}, 'incorrect', ['1']),
    spec('F5 : limite infinie en +∞, pas d\'asymptote', 2,
         {'t': '1', 'a': '2', 'b': '-3', 's': '+', 's2': '-'}, 'correct', ['3']),
    spec('F5 : limite infinie en +∞, horizontale à tort', 2,
         {'t': '1', 'a': '2', 'b': '-3', 's': '+', 's2': '-'}, 'incorrect', ['0']),
    spec('F5 : limite infinie en a', 2, {'t': '2', 'a': '2', 'b': '-3', 's': '+', 's2': '+'},
         'correct', ['2']),
    spec('F5 : limite finie en a, pas d\'asymptote', 2,
         {'t': '3', 'a': '2', 'b': '-3', 's': '+', 's2': '+'}, 'correct', ['3']),
    spec('F5 : limite finie en a, verticale à tort', 2,
         {'t': '3', 'a': '2', 'b': '-3', 's': '+', 's2': '+'}, 'incorrect', ['2']),
]


# =============================================================================================
# 04ec9518 — TSPE-415, limite en un point, dénominateur → 0. F6 : pente négative (0⁺ et 0⁻
# s'échangent), dénominateur x² − a² (signe hors de [−a ; a]).
# =============================================================================================

FRAC_K = '{{if:k>0|\\dfrac{ {{k}} }|-\\dfrac{ {{eval:abs(k)}} }}}'

# d = 1 : à droite ; d = 0 : à gauche. Dénominateur a(x − r), a < 0.
F6_A = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}\\setminus\\left\\{ {{r}} \\right\\}$ par '
    '$f(x)=' + FRAC_K + '{ {{a}}x{{eval:-a*r;+}} }$.\n\n'
    'Détermine la limite de $f$ en ${{r}}$ **{{if:d==1|à droite|à gauche}}** (pour '
    '$x{{if:d==1|>|<}}{{r}}$).\n\n$\\displaystyle\\lim_{x\\to {{r}}}f(x)=?$',
    [var('a', '-5..-1'), var('r', '-6..6'), var('k', '1..9;±'), var('d', '0|1')],
    [case('{{if:k*(1-2*d)>0|' + PINF + '|' + MINF + '}}', [
        erreur('{{if:k*(1-2*d)>0|' + MINF + '|' + PINF + '}}',
               'Le coefficient de $x$ est négatif : ${{a}} x {{eval:-a*r;+}}$ est '
               '{{if:d==1|négatif|positif}} pour $x {{if:d==1|>|<}} {{r}}$.',
               'Pente négative oubliée'),
        erreur('0',
               'Le dénominateur tend vers $0$ et le numérateur non : le quotient tend vers '
               'l\'infini.', 'Zéro au lieu de l\'infini'),
    ])],
    [
        '${{a}}x{{eval:-a*r;+}}={{a}}\\left(x{{eval:-r;+}}\\right)$ s\'annule en ${{r}}$ ; le '
        'coefficient ${{a}}$ est négatif : pour $x{{if:d==1|>|<}}{{r}}$, ${{a}}x{{eval:-a*r;+}}'
        '{{if:d==1|<|>}}0$, et il tend vers $0$.',
        'Donc $\\dfrac{1}{ {{a}}x{{eval:-a*r;+}} }$ tend vers ${{if:d==1|-|+}}\\infty$. Le '
        'numérateur vaut ${{k}}$ : par produit, $\\displaystyle\\lim_{x\\to {{r}}}f(x)=' + PRIMAIRE
        + '{ {{if:k*(1-2*d)>0|+\\infty|-\\infty}} }$ ({{if:d==1|à droite|à gauche}}).',
    ],
    'Étudie le signe de ${{a}}x{{eval:-a*r;+}}$ {{if:d==1|à droite|à gauche}} de ${{r}}$ : '
    'attention, le coefficient de $x$ est négatif.',
    ['r != 0'],
)

# w = 0 : en a à droite ; w = 1 : en −a à gauche. Dans les deux cas x² − a² → 0⁺.
F6_P = '{{eval:a*(1-2*w)}}'
F6_B = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}\\setminus\\left\\{ -{{a}}\\,;{{a}} \\right\\}$ '
    'par $f(x)=\\dfrac{' + coef('c') + 'x{{d;+}}}{x^{2}-{{eval:a*a}}}$.\n\n'
    'Détermine la limite de $f$ en $' + F6_P + '$ **{{if:w==0|à droite|à gauche}}** (pour '
    '$x{{if:w==0|>|<}}' + F6_P + '$).\n\n$\\displaystyle\\lim_{x\\to ' + F6_P + '}f(x)=?$',
    [var('a', '1..6'), var('c', '1..5;±'), var('d', '1..9;±'), var('w', '0|1')],
    [case('{{if:c*a*(1-2*w)+d>0|' + PINF + '|' + MINF + '}}', [
        erreur('{{if:c*a*(1-2*w)+d>0|' + MINF + '|' + PINF + '}}',
               'Le dénominateur est positif {{if:w==0|à droite de|à gauche de}} $' + F6_P
               + '$ : le signe de la limite est celui du numérateur, qui tend vers '
               '${{eval:c*a*(1-2*w)+d}}$.', 'Signe inversé'),
        erreur('0',
               'Le dénominateur tend vers $0$ et le numérateur non : le quotient tend vers '
               'l\'infini.', 'Zéro au lieu de l\'infini'),
    ])],
    [
        'Le numérateur tend vers ${{eval:c*a*(1-2*w)+d}}$, {{if:c*a*(1-2*w)+d>0|positif|négatif}}.',
        '$x^{2}-{{eval:a*a}}=(x-{{a}})(x+{{a}})$ est positif à l\'extérieur de l\'intervalle '
        '$\\left[-{{a}}\\,;{{a}}\\right]$ : pour $x{{if:w==0|>|<}}' + F6_P + '$, il est positif et '
        'tend vers $0$.',
        'Par quotient, $\\displaystyle\\lim_{x\\to ' + F6_P + '}f(x)=' + PRIMAIRE
        + '{ {{if:c*a*(1-2*w)+d>0|+\\infty|-\\infty}} }$ ({{if:w==0|à droite|à gauche}}).',
    ],
    'Cherche la limite du numérateur, puis le signe de $x^{2}-{{eval:a*a}}$ '
    '{{if:w==0|à droite|à gauche}} de $' + F6_P + '$ (un tableau de signes aide).',
    ['c*a+d != 0', '-c*a+d != 0'],
)

SPECS_04 = [
    spec('F6a : 3/(−2x + 4) à droite de 2', 0, {'a': '-2', 'r': '2', 'k': '3', 'd': '1'},
         'correct', [MINF]),
    spec('F6a : pente négative oubliée', 0, {'a': '-2', 'r': '2', 'k': '3', 'd': '1'}, 'incorrect',
         [PINF],
         'Le coefficient de $x$ est négatif : $-2 x + 4$ est négatif pour $x > 2$.'),
    spec('F6a : zéro', 0, {'a': '-2', 'r': '2', 'k': '3', 'd': '1'}, 'incorrect', ['0'],
         'Le dénominateur tend vers $0$ et le numérateur non : le quotient tend vers l\'infini.'),
    spec('F6a : −5/(−x − 3) à gauche de −3', 0, {'a': '-1', 'r': '-3', 'k': '-5', 'd': '0'},
         'correct', [MINF]),
    spec('F6b : (2x + 1)/(x² − 9) en 3 à droite', 1, {'a': '3', 'c': '2', 'd': '1', 'w': '0'},
         'correct', [PINF]),
    spec('F6b : signe inversé', 1, {'a': '3', 'c': '2', 'd': '1', 'w': '0'}, 'incorrect', [MINF],
         'Le dénominateur est positif à droite de $3$ : le signe de la limite est celui du '
         'numérateur, qui tend vers $7$.'),
    spec('F6b : zéro', 1, {'a': '3', 'c': '2', 'd': '1', 'w': '0'}, 'incorrect', ['0'],
         'Le dénominateur tend vers $0$ et le numérateur non : le quotient tend vers l\'infini.'),
    spec('F6b : (2x + 1)/(x² − 9) en −3 à gauche', 1, {'a': '3', 'c': '2', 'd': '1', 'w': '1'},
         'correct', [MINF]),
]


# =============================================================================================
# 5bf5b452 — TSPE-400. F7 : une inégalité concrète ax + c ⩽ f(x) (m = 0) ou f(x) ⩽ ax + c (m = 1) ;
# selon le sens et le signe de a, on conclut en +∞, en −∞, ou nulle part (a = 0). x₀ : leurre.
# =============================================================================================

AXC = '{{if:a==0|{{c}}|' + coef('a') + 'x{{c;+}}}}'
F7_INF = '{{if:m==0|+|-}}\\infty'
F7 = variation(
    'Une fonction $f$ définie sur $\\mathbb{R}$ vérifie, pour tout réel $x$ :\n\n'
    '$${{if:m==0|' + AXC + '\\leqslant f(x)|f(x)\\leqslant ' + AXC + '}}$$\n\n'
    'Quelle limite de $f$ cette inégalité permet-elle d\'affirmer ?\n\n'
    + bloc('choix', 'melanger: non',
           '- $' + lim('-\\infty') + '=' + F7_INF + '$',
           '- $' + lim('+\\infty') + '=' + F7_INF + '$',
           '- $\\displaystyle\\lim_{x\\to {{x0}}}f(x)={{eval:a*x0+c}}$',
           '- Cette inégalité ne permet d\'affirmer aucune de ces limites.'),
    [var('a', '-4..4'), var('c', '1..6;±'), var('m', '0|1'), var('x0', '-3..3')],
    [case('{{if:a==0|3|{{if:a*(1-2*m)>0|1|0}}}}')],
    [
        '{{if:a==0|La fonction est seulement {{if:m==0|minorée|majorée}} par une constante : cela '
        'ne donne aucune limite.|$' + AXC + '$ tend vers ${{if:m==0|+|-}}\\infty$ en '
        '${{if:a*(1-2*m)>0|+|-}}\\infty$, et $f$ est {{if:m==0|au-dessus|au-dessous}}.}}',
        '{{if:a==0|$' + PRIMAIRE + '{\\text{Aucune limite}}$ ne peut être '
        'affirmée.|Par comparaison, $' + PRIMAIRE + '{' + lim('{{if:a*(1-2*m)>0|+|-}}\\infty') + '='
        + F7_INF + '}$.}}',
        'Une inégalité ne donne jamais la limite en un réel $x_0$ : $f$ peut valoir n\'importe '
        'quoi {{if:m==0|au-dessus|au-dessous}} de la droite.',
    ],
    'Un théorème de comparaison demande une fonction {{if:m==0|minorée|majorée}} par une fonction '
    'qui tend vers ${{if:m==0|+|-}}\\infty$ : de quel côté la droite $y=' + AXC + '$ le fait-elle ?',
)

SPECS_5B = [
    spec('F7 : 2x − 1 ⩽ f(x) → +∞ en +∞', 0, {'a': '2', 'c': '-1', 'm': '0', 'x0': '1'},
         'correct', ['1']),
    spec('F7 : 2x − 1 ⩽ f(x), côté inversé', 0, {'a': '2', 'c': '-1', 'm': '0', 'x0': '1'},
         'incorrect', ['0']),
    spec('F7 : 2x − 1 ⩽ f(x), leurre en x₀', 0, {'a': '2', 'c': '-1', 'm': '0', 'x0': '1'},
         'incorrect', ['2']),
    spec('F7 : −3x + 2 ⩽ f(x) → +∞ en −∞', 0, {'a': '-3', 'c': '2', 'm': '0', 'x0': '0'},
         'correct', ['0']),
    spec('F7 : f(x) ⩽ x + 4 → −∞ en −∞', 0, {'a': '1', 'c': '4', 'm': '1', 'x0': '2'}, 'correct',
         ['0']),
    spec('F7 : f(x) ⩽ −2x + 1 → −∞ en +∞', 0, {'a': '-2', 'c': '1', 'm': '1', 'x0': '2'},
         'correct', ['1']),
    spec('F7 : 5 ⩽ f(x), aucune', 0, {'a': '0', 'c': '5', 'm': '0', 'x0': '-1'}, 'correct', ['3']),
    spec('F7 : 5 ⩽ f(x), +∞ à tort', 0, {'a': '0', 'c': '5', 'm': '0', 'x0': '-1'}, 'incorrect',
         ['1']),
]


# =============================================================================================
# b97dabe1 — TSPE-580, croissances comparées. F8 : c·eˣ/xⁿ en +∞ (signe de c), c·xⁿ·e^(kx) en −∞.
# =============================================================================================

F8_A = variation(
    'Soit $f$ la fonction définie sur $\\left]0\\,;+\\infty\\right[$ par '
    '$f(x)=\\dfrac{' + coef('c') + 'e^{x}}{' + puiss('n') + '}$.\n\n'
    'Détermine la limite de $f$ en $+\\infty$.\n\n$' + lim('+\\infty') + '=?$',
    [var('c', '1..5;±'), var('n', '1..5')],
    [case('{{if:c>0|' + PINF + '|' + MINF + '}}', [
        erreur('0',
               'Tu as inversé les croissances comparées : en $+\\infty$, c\'est l\'exponentielle '
               'qui l\'emporte sur toute puissance de $x$.', 'Croissances comparées inversées'),
        erreur('{{if:c>0|' + MINF + '|' + PINF + '}}',
               'Le coefficient ${{c}}$ est {{if:c>0|positif|négatif}} : il donne le signe de la '
               'limite.', 'Signe du coefficient'),
        erreur('{{c}}',
               'Un quotient de deux infinis est une forme indéterminée : il ne vaut pas $1$.',
               'Infini sur infini = 1'),
    ])],
    [
        'Par croissances comparées, $\\displaystyle\\lim_{x\\to+\\infty}\\dfrac{e^{x}}{'
        + puiss('n') + '}=+\\infty$.',
        'Le coefficient ${{c}}$ est {{if:c>0|positif|négatif}} : par produit, $' + lim('+\\infty')
        + '=' + PRIMAIRE + '{ {{if:c>0|+\\infty|-\\infty}} }$.',
    ],
    'Écris $f(x)={{c}}\\times\\dfrac{e^{x}}{' + puiss('n') + '}$ et utilise les croissances comparées.',
)

F8_B = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=' + coef('c') + puiss('n')
    + 'e^{ {{k}}x }$.\n\nDétermine la limite de $f$ en $-\\infty$.\n\n$' + lim('-\\infty') + '=?$',
    [var('c', '1..9;±'), var('n', '1..4'), var('k', '2..4')],
    [case('0', [
        erreur('{{if:c*(-1)^n>0|' + PINF + '|' + MINF + '}}',
               'Tu n\'as regardé que la puissance de $x$ : le facteur exponentiel tend vers $0$ et '
               'l\'emporte, par croissances comparées.', 'Limite d\'un seul facteur'),
        erreur('{{c}}',
               'Un produit « infini fois zéro » est une forme indéterminée : il ne vaut pas $1$.',
               'Infini fois zéro = 1'),
    ])],
    [
        'On pose $X={{k}}x$ : quand $x$ tend vers $-\\infty$, $X$ aussi, et $x=\\dfrac{X}{ {{k}} }$.',
        '$f(x)=\\dfrac{ {{c}} }{ {{eval:k^n}} }X^{ {{n}} }e^{X}$ ; par croissances comparées, '
        '$\\displaystyle\\lim_{X\\to-\\infty}X^{ {{n}} }e^{X}=0$.',
        'Donc $' + lim('-\\infty') + '=' + PRIMAIRE + '{0}$.',
    ],
    'Pose $X={{k}}x$ : écris $x^{n}$ en fonction de $X$, puis utilise la limite de $X^{n}e^{X}$ en '
    '$-\\infty$.',
)

SPECS_B9 = [
    spec('F8a : 3eˣ/x² en +∞', 0, {'c': '3', 'n': '2'}, 'correct', [PINF]),
    spec('F8a : croissances comparées inversées', 0, {'c': '3', 'n': '2'}, 'incorrect', ['0'],
         'Tu as inversé les croissances comparées : en $+\\infty$, c\'est l\'exponentielle qui l\'emporte '
         'sur toute puissance de $x$.'),
    spec('F8a : −2eˣ/x³', 0, {'c': '-2', 'n': '3'}, 'correct', [MINF]),
    spec('F8a : signe du coefficient', 0, {'c': '-2', 'n': '3'}, 'incorrect', [PINF],
         'Le coefficient $-2$ est négatif : il donne le signe de la limite.'),
    spec('F8a : ∞/∞ = 1', 0, {'c': '-2', 'n': '3'}, 'incorrect', ['-2'],
         'Un quotient de deux infinis est une forme indéterminée : il ne vaut pas $1$.'),
    spec('F8b : 5x³e^(2x) en −∞', 1, {'c': '5', 'n': '3', 'k': '2'}, 'correct', ['0']),
    spec('F8b : limite d\'un seul facteur', 1, {'c': '5', 'n': '3', 'k': '2'}, 'incorrect', [MINF],
         'Tu n\'as regardé que la puissance de $x$ : le facteur exponentiel tend vers $0$ et '
         'l\'emporte, par croissances comparées.'),
    spec('F8b : ∞ × 0 = 1', 1, {'c': '5', 'n': '3', 'k': '2'}, 'incorrect', ['5'],
         'Un produit « infini fois zéro » est une forme indéterminée : il ne vaut pas $1$.'),
]


# =============================================================================================
# ae70373c — TSPE-582. F9 : construire l'encadrement à partir de −1 ⩽ cos x ⩽ 1 (pas de limite de
# cos ni de sin : décision lts-5). Pas d'erreur prévue inventée sur (b) et (c) : l'erreur réelle
# (« sin x n'a pas de limite, donc f non plus ») ne se tape pas.
# =============================================================================================

TRIG = '{{if:t==0|\\cos x|\\sin x}}'
F9_A = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=' + coef('a') + 'x^{2}{{b;+}}'
    '{{c;+}}' + TRIG + '$.\n\nDétermine la limite de $f$ en ${{if:sg>0|+|-}}\\infty$.\n\n$'
    + lim('{{if:sg>0|+|-}}\\infty') + '=?$',
    [var('a', '1..5;±'), var('b', '1..9;±'), var('c', '2..5;±'), var('t', '0|1'),
     var('sg', '1|-1')],
    [case('{{if:a>0|' + PINF + '|' + MINF + '}}', [
        erreur('{{if:a>0|' + MINF + '|' + PINF + '}}',
               'Le coefficient de $x^2$ est {{if:a>0|positif|négatif}} : en $-\\infty$ comme en '
               '$+\\infty$, $x^2$ tend vers $+\\infty$.', 'Signe inversé'),
    ])],
    [
        'Pour tout réel $x$, $-1\\leqslant' + TRIG + '\\leqslant1$, donc $-{{eval:abs(c)}}\\leqslant'
        '{{c}}' + TRIG + '\\leqslant{{eval:abs(c)}}$.',
        '{{if:a>0|Donc $f(x)\\geqslant' + coef('a') + 'x^{2}{{eval:b-abs(c);+}}$, qui tend vers '
        '$+\\infty$|Donc $f(x)\\leqslant' + coef('a') + 'x^{2}{{eval:b+abs(c);+}}$, qui tend vers '
        '$-\\infty$}} en ${{if:sg>0|+|-}}\\infty$.',
        'Par comparaison, $' + lim('{{if:sg>0|+|-}}\\infty') + '=' + PRIMAIRE
        + '{ {{if:a>0|+\\infty|-\\infty}} }$.',
    ],
    'Encadre ${{c}}' + TRIG + '$ à l\'aide de $-1\\leqslant' + TRIG + '\\leqslant1$, puis utilise '
    'un théorème de comparaison.',
)

F9_B = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=\\dfrac{ {{c}}\\sin x}{' + coef('a')
    + 'x^{2}+{{b}}}$.\n\nDétermine la limite de $f$ en $+\\infty$.\n\n$' + lim('+\\infty') + '=?$',
    [var('c', '1..9;±'), var('a', '1..5'), var('b', '1..8')],
    [case('0')],
    [
        'Pour tout réel $x$, $-1\\leqslant\\sin x\\leqslant1$ et $' + coef('a') + 'x^{2}+{{b}}>0$, '
        'donc $-\\dfrac{ {{eval:abs(c)}} }{' + coef('a') + 'x^{2}+{{b}}}\\leqslant f(x)\\leqslant'
        '\\dfrac{ {{eval:abs(c)}} }{' + coef('a') + 'x^{2}+{{b}}}$.',
        'Les deux membres tendent vers $0$ en $+\\infty$ : par le théorème des gendarmes, $'
        + lim('+\\infty') + '=' + PRIMAIRE + '{0}$.',
    ],
    'Encadre $\\sin x$ entre $-1$ et $1$, divise par le dénominateur (positif), puis utilise le '
    'théorème des gendarmes.',
)

F9_C = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)={{c}}\\cos x\\,e^{-' + coef('m')
    + 'x}$.\n\nDétermine la limite de $f$ en $+\\infty$.\n\n$' + lim('+\\infty') + '=?$',
    [var('c', '1..9;±'), var('m', '1..4')],
    [case('0')],
    [
        'Pour tout réel $x$, $-1\\leqslant\\cos x\\leqslant1$ et $e^{-' + coef('m') + 'x}>0$, donc '
        '$-{{eval:abs(c)}}e^{-' + coef('m') + 'x}\\leqslant f(x)\\leqslant{{eval:abs(c)}}e^{-'
        + coef('m') + 'x}$.',
        '$e^{-' + coef('m') + 'x}$ tend vers $0$ en $+\\infty$ : par le théorème des gendarmes, $'
        + lim('+\\infty') + '=' + PRIMAIRE + '{0}$.',
    ],
    'Encadre $\\cos x$ entre $-1$ et $1$, multiplie par $e^{-' + coef('m') + 'x}$ (positif), puis '
    'utilise le théorème des gendarmes.',
)

SPECS_AE = [
    spec('F9a : 2x² + 3 − 4cos x en +∞', 0, {'a': '2', 'b': '3', 'c': '-4', 't': '0', 'sg': '1'},
         'correct', [PINF]),
    spec('F9a : −x² + 1 + 2 sin x en −∞', 0, {'a': '-1', 'b': '1', 'c': '2', 't': '1', 'sg': '-1'},
         'correct', [MINF]),
    spec('F9a : signe inversé', 0, {'a': '-1', 'b': '1', 'c': '2', 't': '1', 'sg': '-1'},
         'incorrect', [PINF],
         'Le coefficient de $x^2$ est négatif : en $-\\infty$ comme en $+\\infty$, $x^2$ tend vers '
         '$+\\infty$.'),
    spec('F9b : 3 sin x/(2x² + 5)', 1, {'c': '3', 'a': '2', 'b': '5'}, 'correct', ['0']),
    spec('F9b : 3 à tort', 1, {'c': '3', 'a': '2', 'b': '5'}, 'incorrect', ['3']),
    spec('F9c : −5 cos x e^(−2x)', 2, {'c': '-5', 'm': '2'}, 'correct', ['0']),
    spec('F9c : −5 à tort', 2, {'c': '-5', 'm': '2'}, 'incorrect', ['-5']),
]


# =============================================================================================
# 806c10f4 — TSPE-415, sans forme indéterminée. F10 : avec eˣ et xⁿ, reconnaître qu'il n'y a pas
# de FI (l'élève sort trop vite les croissances comparées).
# =============================================================================================

SIGNE_KN = 'k*(-1)^n'
F10_A = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=' + coef('k') + puiss('n')
    + '+e^{x}$.\n\nDétermine la limite de $f$ en $-\\infty$.\n\n$' + lim('-\\infty') + '=?$',
    [var('k', '1..5;±'), var('n', '1..5')],
    [case('{{if:' + SIGNE_KN + '>0|' + PINF + '|' + MINF + '}}', [
        erreur('{{if:' + SIGNE_KN + '>0|' + MINF + '|' + PINF + '}}',
               'En $-\\infty$, $x^{{n}}$ tend vers ${{if:(-1)^n>0|+|-}}\\infty$ (puissance '
               '{{if:(-1)^n>0|paire|impaire}}), puis multiplie par ${{k}}$.', 'Signe de la puissance'),
        erreur('0',
               'Pas de forme indéterminée ici : en $-\\infty$, l\'exponentielle tend vers $0$, la limite '
               'est celle de la puissance.', 'Croissances comparées à tort'),
    ])],
    [
        'En $-\\infty$, $e^{x}$ tend vers $0$ et $' + puiss('n') + '$ tend vers '
        '${{if:(-1)^n>0|+|-}}\\infty$ (puissance {{if:(-1)^n>0|paire|impaire}}), donc $'
        + coef('k') + puiss('n') + '$ tend vers ${{if:' + SIGNE_KN + '>0|+|-}}\\infty$.',
        'Pas de forme indéterminée : par somme, $' + lim('-\\infty') + '=' + PRIMAIRE
        + '{ {{if:' + SIGNE_KN + '>0|+\\infty|-\\infty}} }$.',
    ],
    'Cherche séparément la limite de chaque terme en $-\\infty$ : y a-t-il vraiment une forme '
    'indéterminée ?',
)

F10_B = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=' + coef('k') + puiss('n')
    + 'e^{x}$.\n\nDétermine la limite de $f$ en $+\\infty$.\n\n$' + lim('+\\infty') + '=?$',
    [var('k', '1..5;±'), var('n', '1..5')],
    [case('{{if:k>0|' + PINF + '|' + MINF + '}}', [
        erreur('0',
               'Pas de forme indéterminée ici : en $+\\infty$, les deux facteurs tendent vers '
               '$+\\infty$.', 'Croissances comparées à tort'),
        erreur('{{if:k>0|' + MINF + '|' + PINF + '}}',
               'Le coefficient ${{k}}$ est {{if:k>0|positif|négatif}} : il donne le signe de la '
               'limite.', 'Signe du coefficient'),
    ])],
    [
        'En $+\\infty$, $' + puiss('n') + '$ et $e^{x}$ tendent vers $+\\infty$ : pas de forme '
        'indéterminée, leur produit tend vers $+\\infty$.',
        'Le coefficient ${{k}}$ est {{if:k>0|positif|négatif}} : $' + lim('+\\infty') + '='
        + PRIMAIRE + '{ {{if:k>0|+\\infty|-\\infty}} }$.',
    ],
    'Cherche la limite de chaque facteur en $+\\infty$ : y a-t-il vraiment une forme '
    'indéterminée ?',
)

F10_C = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=\\dfrac{' + coef('k') + puiss('n')
    + '}{e^{x}}$.\n\nDétermine la limite de $f$ en $-\\infty$.\n\n$' + lim('-\\infty') + '=?$',
    [var('k', '1..5;±'), var('n', '1..5')],
    [case('{{if:' + SIGNE_KN + '>0|' + PINF + '|' + MINF + '}}', [
        erreur('0',
               'Par croissances comparées, $x^{{n}}$ divisé par l\'exponentielle tend vers $0$ en $+\\infty$, pas en '
               '$-\\infty$ : ici, le dénominateur tend vers $0$.', 'Croissances comparées à tort'),
        erreur('{{if:' + SIGNE_KN + '>0|' + MINF + '|' + PINF + '}}',
               'En $-\\infty$, $x^{{n}}$ tend vers ${{if:(-1)^n>0|+|-}}\\infty$ (puissance '
               '{{if:(-1)^n>0|paire|impaire}}), puis multiplie par ${{k}}$.', 'Signe de la puissance'),
    ])],
    [
        '$f(x)=' + coef('k') + puiss('n') + '\\times e^{-x}$. En $-\\infty$, $e^{-x}$ tend vers '
        '$+\\infty$ et $' + coef('k') + puiss('n') + '$ vers ${{if:' + SIGNE_KN + '>0|+|-}}\\infty$.',
        'Pas de forme indéterminée : par produit, $' + lim('-\\infty') + '=' + PRIMAIRE
        + '{ {{if:' + SIGNE_KN + '>0|+\\infty|-\\infty}} }$.',
    ],
    'Écris $\\dfrac{1}{e^{x}}=e^{-x}$ et cherche la limite de chaque facteur en $-\\infty$.',
)

SPECS_80 = [
    spec('F10a : 3x² + eˣ en −∞', 0, {'k': '3', 'n': '2'}, 'correct', [PINF]),
    spec('F10a : −2x³ + eˣ en −∞', 0, {'k': '-2', 'n': '3'}, 'correct', [PINF]),
    spec('F10a : signe de la puissance', 0, {'k': '4', 'n': '3'}, 'incorrect', [PINF],
         'En $-\\infty$, $x^3$ tend vers $-\\infty$ (puissance impaire), puis multiplie par $4$.'),
    spec('F10a : croissances comparées à tort', 0, {'k': '3', 'n': '2'}, 'incorrect', ['0'],
         'Pas de forme indéterminée ici : en $-\\infty$, l\'exponentielle tend vers $0$, la limite est '
         'celle de la puissance.'),
    spec('F10b : −3x²eˣ en +∞', 1, {'k': '-3', 'n': '2'}, 'correct', [MINF]),
    spec('F10b : croissances comparées à tort', 1, {'k': '-3', 'n': '2'}, 'incorrect', ['0'],
         'Pas de forme indéterminée ici : en $+\\infty$, les deux facteurs tendent vers $+\\infty$.'),
    spec('F10b : signe du coefficient', 1, {'k': '-3', 'n': '2'}, 'incorrect', [PINF],
         'Le coefficient $-3$ est négatif : il donne le signe de la limite.'),
    spec('F10c : 2x³/eˣ en −∞', 2, {'k': '2', 'n': '3'}, 'correct', [MINF]),
    spec('F10c : croissances comparées à tort', 2, {'k': '2', 'n': '3'}, 'incorrect', ['0'],
         'Par croissances comparées, $x^3$ divisé par l\'exponentielle tend vers $0$ en $+\\infty$, pas en '
         '$-\\infty$ : ici, le dénominateur tend vers $0$.'),
    spec('F10c : signe de la puissance', 2, {'k': '2', 'n': '3'}, 'incorrect', [PINF],
         'En $-\\infty$, $x^3$ tend vers $-\\infty$ (puissance impaire), puis multiplie par $2$.'),
]


# =============================================================================================
# 7844be9a — TSPE-583. F11 : (a·eˣ + b)/(c·eˣ + d) en +∞, factoriser par eˣ → a/c. d > 0 : f
# définie sur ℝ.
# =============================================================================================

F11 = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=\\dfrac{' + coef('a') + 'e^{x}{{b;+}}}{'
    + coef('c') + 'e^{x}+{{d}}}$.\n\nDétermine la limite de $f$ en $+\\infty$.\n\n$'
    + lim('+\\infty') + '=?$',
    [var('a', '1..6'), var('b', '1..6;±'), var('c', '1..6'), var('d', '1..6')],
    [case('{{eval:a/c}}', [
        erreur('{{eval:b/d}}',
               'Tu as fait le quotient des termes constants : en $+\\infty$, ce sont les termes '
               'exponentiels qui l\'emportent.', 'Quotient des constantes'),
        erreur('1',
               'Un quotient de deux infinis est une forme indéterminée : il ne vaut pas $1$.',
               'Infini sur infini = 1'),
        erreur(PINF,
               'Le numérateur et le dénominateur tendent tous deux vers $+\\infty$ : c\'est une '
               'forme indéterminée, pas $+\\infty$.', 'FI prise pour +∞'),
    ])],
    [
        'Forme indéterminée : on factorise par $e^{x}$ en haut et en bas. '
        '$f(x)=\\dfrac{e^{x}\\left({{a}}{{b;+}}e^{-x}\\right)}{e^{x}\\left({{c}}+{{d}}e^{-x}\\right)}'
        '=\\dfrac{ {{a}}{{b;+}}e^{-x}}{ {{c}}+{{d}}e^{-x}}$.',
        '$e^{-x}$ tend vers $0$ en $+\\infty$ : $' + lim('+\\infty') + '=\\dfrac{ {{a}} }{ {{c}} }='
        + PRIMAIRE + '{ {{eval:a/c}} }$.',
    ],
    'Factorise le numérateur et le dénominateur par $e^{x}$, puis utilise la limite de $e^{-x}$ en '
    '$+\\infty$.',
    ['a*d != b*c'],
)

SPECS_78 = [
    spec('F11 : (2eˣ − 3)/(4eˣ + 1)', 0, {'a': '2', 'b': '-3', 'c': '4', 'd': '1'}, 'correct',
         ['\\frac{1}{2}']),
    spec('F11 : 0,5 accepté', 0, {'a': '2', 'b': '-3', 'c': '4', 'd': '1'}, 'correct', ['0.5']),
    spec('F11 : quotient des constantes', 0, {'a': '2', 'b': '-3', 'c': '4', 'd': '1'}, 'incorrect',
         ['-3'],
         'Tu as fait le quotient des termes constants : en $+\\infty$, ce sont les termes '
         'exponentiels qui l\'emportent.'),
    spec('F11 : ∞/∞ = 1', 0, {'a': '2', 'b': '-3', 'c': '4', 'd': '1'}, 'incorrect', ['1'],
         'Un quotient de deux infinis est une forme indéterminée : il ne vaut pas $1$.'),
    spec('F11 : FI prise pour +∞', 0, {'a': '2', 'b': '-3', 'c': '4', 'd': '1'}, 'incorrect', [PINF],
         'Le numérateur et le dénominateur tendent tous deux vers $+\\infty$ : c\'est une forme '
         'indéterminée, pas $+\\infty$.'),
]


ajouter('a4d8dc52', [F4_A, F4_B, F5], SPECS_A4)
ajouter('04ec9518', [F6_A, F6_B], SPECS_04)
ajouter('5bf5b452', [F7], SPECS_5B)
ajouter('b97dabe1', [F8_A, F8_B], SPECS_B9)
ajouter('ae70373c', [F9_A, F9_B, F9_C], SPECS_AE)
ajouter('806c10f4', [F10_A, F10_B, F10_C], SPECS_80)
ajouter('7844be9a', [F11], SPECS_78)
