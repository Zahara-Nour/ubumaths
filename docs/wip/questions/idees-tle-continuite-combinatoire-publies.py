"""Ajoute les variations validées aux 3 modèles publiés exportés de prod dans
scripts/questions/idees-tle-continuite-combinatoire-publies/ (chantier
idees-tle-continuite-combinatoire).

Phase 0 validée par David le 2026-11-25 (« je valide », fiches
docs/archive/wip/idees-tle-continuite-combinatoire/idees-tle-continuite-combinatoire-fiches.md) : V1 a et V1 b (2491dd75, dont l'idée en
attente TSA5-41), V2 a et V2 b (10393ff9), V3 (0965c56c). Les variations s'ajoutent À LA FIN (les
réponses des élèves gardent l'indice de leur variation) ; la migration de contenu est générée par
scripts/questions/migration-contenu.ts.

Le script repart du contenu de prod (variations et specs d'origine, comptées dans ORIGINE) :
le relancer réécrit les ajouts sans les doubler. Les trois modèles n'ont pas `cleanCoefficients` :
les coefficients s'écrivent à la main. ⛔ Jamais de variable `e` (Euler).

Usage : python3 docs/wip/questions/idees-tle-continuite-combinatoire-publies.py \
          scripts/questions/idees-tle-continuite-combinatoire-publies
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'

# id court → (variations, specs) d'origine en prod (export du 2026-11-25)
ORIGINE = {'2491dd75': (3, 13), '10393ff9': (2, 8), '0965c56c': (4, 16)}


def spec(desc, vi, variables_, status, answers, message=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = message
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': expected, 'answers': answers}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def case(attendue, erreurs=None, **reglages):
    c = {'expectedAnswer': attendue, **reglages}
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


# =============================================================================================
# 2491dd75 (TSPE-430, TCOMP-233) — V1 : nombre de solutions de f(x) = k, f donnée par sa formule
# et son tableau de variations, minimum écrit avec ln ou e (TSA4-40, idée en attente TSA5-41).
# t choisit la position de k par rapport au minimum.
# =============================================================================================

# V1 a : f(x) = x − a ln x sur ]0 ; +∞[, minimum a − a ln a < 0 en x = a (a de 3 à 6).
# t = 0 : k = −a − d < a − a ln a (car ln a < 2) → 0 ; t = 1 : k = minimum → 1 ; t = 2 : k ⩾ 0 → 2.
MIN_A = '{{a}}-{{a}}\\ln {{a}}'
K_A = '{{if:t==0|{{eval:-a-d}}|{{if:t==1|' + MIN_A + '|{{k2}}}}}}'
V1_A = variation(
    'On considère la fonction $f$ définie sur $\\left]0\\,;+\\infty\\right[$ par '
    '$f(x)=x-{{a}}\\ln x$. Son tableau de variations est donné ci-dessous.\n\n'
    '```variation\nvariable: x\ndomain: 0, {{a}}, +inf\n\nvariation: f(x)\n'
    '  0: +inf, top\n  {{a}}: {{a}}-{{a}}\\ln{ {{a}} }, bottom\n  +inf: +inf, top\n```\n\n'
    'Combien de solutions l\'équation $f(x)=' + K_A + '$ admet-elle sur '
    '$\\left]0\\,;+\\infty\\right[$ ?\n\n$?$',
    [var('a', '3..6'), var('t', '0..2'), var('d', '0..2'), var('k2', '0..3')],
    [case('{{t}}', [
        erreur('2', '{{if:t==1|$f$ n\'atteint son minimum qu\'en $x={{a}}$ : une seule solution.'
               '|$\\ln {{a}}<2$, donc ${{eval:-a-d}}<' + MIN_A + '$ : $f$ ne descend jamais aussi '
               'bas.}}', 'Mauvaise comparaison au minimum'),
        erreur('1', '{{if:t==2|${{k2}}$ est plus grand que le minimum : $f$ prend cette valeur une '
               'fois sur $\\left]0\\,;{{a}}\\right]$ et une fois sur $\\left[{{a}}\\,;+\\infty\\right[$.'
               '|$\\ln {{a}}<2$, donc ${{eval:-a-d}}<' + MIN_A + '$ : aucune solution.}}',
               'Une branche oubliée'),
        erreur('0', '{{if:t==1|Le minimum est une valeur de $f$ : $f({{a}})=' + MIN_A + '$.'
               '|${{k2}}$ est plus grand que le minimum $' + MIN_A + '$, qui est négatif.}}',
               'Minimum mal lu'),
    ])],
    [
        'Le minimum de $f$ est $f({{a}})=' + MIN_A + '\\approx {{eval:round(100*(a-a*ln(a)))/100;d}}$.',
        '{{if:t==0|${{eval:-a-d}}<' + MIN_A + '$ : $f(x)\\geqslant ' + MIN_A + '>{{eval:-a-d}}$ pour '
        'tout $x$, aucune solution.|{{if:t==1|Le minimum n\'est atteint qu\'en $x={{a}}$ : une seule '
        'solution.|${{k2}}>' + MIN_A + '$ : sur $\\left]0\\,;{{a}}\\right]$, $f$ est continue et '
        'strictement décroissante de $+\\infty$ à ' + '$' + MIN_A + '$, une solution (TVI) ; sur '
        '$\\left[{{a}}\\,;+\\infty\\right[$, continue et strictement croissante de $' + MIN_A
        + '$ à $+\\infty$, une solution.}}}}',
        'Au total : $' + PRIMAIRE + '{ {{t}} }$ solution(s).',
    ],
    'Compare la valeur cherchée au minimum de $f$, puis regarde chaque intervalle où $f$ est '
    'strictement monotone.',
)

# V1 b : f(x) = (x + b)eˣ sur ℝ, minimum −e^(x0) en x0 = −b − 1, limite 0 (non atteinte) en −∞.
# b ≠ −1 (sinon e⁰). t = 0 : k ⩽ −3 < −e → 0 ; t = 1 : minimum → 1 ; t = 2 : moitié du minimum
# → 2 ; t = 3 : k = 0 → 1 (x = −b) ; t = 4 : k > 0 → 1.
E_X0 = '{{if:x0==1|\\mathrm{e}|\\mathrm{e}^{ {{x0}} }}}'
E_X0_TAB = '{{if:x0==1|e|e^{ {{x0}} }}}'
K_B = ('{{if:t==0|{{eval:-3-d}}|{{if:t==1|-' + E_X0 + '|{{if:t==2|-\\frac{1}{2}' + E_X0
       + '|{{if:t==3|0|{{k2}}}}}}}}}}')
F_B = '{{if:b==0|x\\mathrm{e}^x|\\left(x{{if:b>0|+}}{{b}}\\right)\\mathrm{e}^x}}'
V1_B = variation(
    'On considère la fonction $f$ définie sur $\\mathbb{R}$ par $f(x)=' + F_B + '$. Son tableau '
    'de variations est donné ci-dessous.\n\n'
    '```variation\nvariable: x\ndomain: -inf, {{x0}}, +inf\n\nvariation: f(x)\n'
    '  -inf: 0, top\n  {{x0}}: -' + E_X0_TAB + ', bottom\n  +inf: +inf, top\n```\n\n'
    'Combien de solutions l\'équation $f(x)=' + K_B + '$ admet-elle sur $\\mathbb{R}$ ?\n\n$?$',
    [var('b', '-2|0|1|2'), var('x0', '{{eval:-b-1}}'), var('t', '0..4'), var('d', '0..1'),
     var('k2', '1..4')],
    [case('{{if:t==0|0|{{if:t==2|2|1}}}}', [
        erreur('2', '{{if:t==3|La limite $0$ en $-\\infty$ n\'est pas atteinte : $f(x)<0$ pour '
               '$x<{{x0}}$.|{{if:t==1|$f$ n\'atteint son minimum qu\'en $x={{x0}}$.|{{if:t==4|Pour '
               '$x\\leqslant {{x0}}$, $f(x)<0$ : la valeur ${{k2}}$ n\'y est pas atteinte.|'
               '${{eval:-3-d}}$ est plus petit que le minimum $-' + E_X0 + '$.}}}}}}',
               'Limite ou minimum compté à tort'),
        erreur('1', '{{if:t==2|Sur $\\left]-\\infty\\,;{{x0}}\\right]$, $f$ descend de $0$ (non '
               'atteint) à $-' + E_X0 + '$ : elle y prend aussi cette valeur.|${{eval:-3-d}}$ est '
               'plus petit que le minimum $-' + E_X0 + '$.}}', 'Une branche oubliée'),
        erreur('0', '{{if:t==1|Le minimum est une valeur de $f$ : $f({{x0}})=-' + E_X0 + '$.|Sur '
               '$\\left[{{x0}}\\,;+\\infty\\right[$, $f$ va de $-' + E_X0 + '$ à $+\\infty$ : elle '
               'prend cette valeur.}}', 'Branche croissante oubliée'),
    ])],
    [
        'Sur $\\left]-\\infty\\,;{{x0}}\\right]$, $f$ est continue et strictement décroissante, de '
        '$0$ (limite **non atteinte**) à $-' + E_X0 + '$ : elle y prend toutes les valeurs de '
        '$\\left[-' + E_X0 + '\\,;0\\right[$, une fois chacune.',
        'Sur $\\left[{{x0}}\\,;+\\infty\\right[$, $f$ est continue et strictement croissante, de '
        '$-' + E_X0 + '$ à $+\\infty$ : elle y prend toutes les valeurs de $\\left[-' + E_X0
        + '\\,;+\\infty\\right[$, une fois chacune.',
        '{{if:t==0|${{eval:-3-d}}<-' + E_X0 + '$ ($\\mathrm{e}<3$) : aucune solution.|{{if:t==1|'
        'La valeur $-' + E_X0 + '$ n\'est prise qu\'en $x={{x0}}$ : une seule solution.|{{if:t==2|'
        '$-' + E_X0 + '<-\\frac{1}{2}' + E_X0 + '<0$ : une solution sur chaque intervalle.|'
        'La valeur n\'est pas dans $\\left[-' + E_X0 + '\\,;0\\right[$ : une seule solution, sur '
        '$\\left[{{x0}}\\,;+\\infty\\right[$.}}}}}}',
        'Au total : $' + PRIMAIRE + '{ {{if:t==0|0|{{if:t==2|2|1}}}} }$ solution(s).',
    ],
    'Regarde quelles valeurs $f$ prend sur chaque intervalle où elle est strictement monotone ; '
    'attention à la limite en $-\\infty$, qui n\'est pas atteinte.',
)

SPECS_24 = [
    spec('V1 a : a = 3, k = −4 → 0', 0, {'a': '3', 't': '0', 'd': '1', 'k2': '0'}, 'correct', ['0']),
    spec('V1 a : a = 3, k = −4, 2 solutions', 0, {'a': '3', 't': '0', 'd': '1', 'k2': '0'},
         'incorrect', ['2'], '$\\ln 3<2$, donc $-4<3-3\\ln 3$ : $f$ ne descend jamais aussi bas.'),
    spec('V1 a : a = 4, k = minimum → 1', 0, {'a': '4', 't': '1', 'd': '0', 'k2': '0'}, 'correct',
         ['1']),
    spec('V1 a : minimum compté deux fois', 0, {'a': '4', 't': '1', 'd': '0', 'k2': '0'},
         'incorrect', ['2'], '$f$ n\'atteint son minimum qu\'en $x = 4$ : une seule solution.'),
    spec('V1 a : minimum pas atteint', 0, {'a': '4', 't': '1', 'd': '0', 'k2': '0'}, 'incorrect',
         ['0']),
    spec('V1 a : a = 5, k = 2 → 2', 0, {'a': '5', 't': '2', 'd': '0', 'k2': '2'}, 'correct', ['2']),
    spec('V1 a : une branche oubliée', 0, {'a': '5', 't': '2', 'd': '0', 'k2': '2'}, 'incorrect',
         ['1']),
    spec('V1 b : b = 0, k = −3 → 0', 1, {'b': '0', 't': '0', 'd': '0', 'k2': '1'}, 'correct', ['0']),
    spec('V1 b : b = 0, k = −1/e → 1', 1, {'b': '0', 't': '1', 'd': '0', 'k2': '1'}, 'correct',
         ['1']),
    spec('V1 b : b = 1, k = −e⁻²/2 → 2', 1, {'b': '1', 't': '2', 'd': '0', 'k2': '1'}, 'correct',
         ['2']),
    spec('V1 b : branche décroissante oubliée', 1, {'b': '1', 't': '2', 'd': '0', 'k2': '1'},
         'incorrect', ['1']),
    spec('V1 b : b = −2, k = 0 → 1', 1, {'b': '-2', 't': '3', 'd': '0', 'k2': '1'}, 'correct',
         ['1']),
    spec('V1 b : limite 0 comptée', 1, {'b': '-2', 't': '3', 'd': '0', 'k2': '1'}, 'incorrect',
         ['2']),
    spec('V1 b : b = 2, k = 3 → 1', 1, {'b': '2', 't': '4', 'd': '0', 'k2': '3'}, 'correct', ['1']),
    spec('V1 b : k positif, 0 solution', 1, {'b': '2', 't': '4', 'd': '0', 'k2': '3'}, 'incorrect',
         ['0']),
]

# =============================================================================================
# 10393ff9 (TSPE-425, TCOMP-220) — V2 : courbe à deux sauts (TSA4-10).
# f sur [−4 ; 4] : f1 sur [−4 ; a[, f2 sur [a ; b[, f3 sur [b ; 4], b = a + 3, a = −2 ou −1.
# Points pleins : en a sur f2, en b sur f3. Sauts j1, j2 = ±2.
# =============================================================================================


def courbe_deux_sauts():
    return (
        '```courbe\nx: -4.5 ; 4.5\ny: -6 ; 6\ngrille: 1 ; 1\n'
        'f(x) = 0.5*(x-({{a}}))+{{y1}} sur [-4 ; {{a}}[   bleu\n'
        'g(x) = -0.5*(x-({{a}}))+{{eval:y1+j1}} sur [{{a}} ; {{b}}[   bleu\n'
        'h(x) = 0.5*(x-({{b}}))+{{eval:y1+j1-1.5+j2}} sur [{{b}} ; 4]   bleu\n'
        'taille: moyenne\n'
        'description: Courbe en trois morceaux de droites ; elle saute en x = {{a}} (point plein '
        'sur le morceau du milieu) et en x = {{b}} (point plein sur le morceau de droite).\n```'
    )


ENONCE_V2 = ('On a représenté ci-dessous la courbe d\'une fonction $f$ définie sur '
             '$\\left[-4\\,;4\\right]$. Un point plein appartient à la courbe, un point creux '
             'n\'y appartient pas.\n\n')
VARS_V2 = [var('a', '-2|-1'), var('b', '{{eval:a+3}}'), var('y1', '0..1'), var('j1', '-2|2'),
           var('j2', '-2|2')]

V2_A = variation(
    ENONCE_V2 + courbe_deux_sauts() + '\n\nEn quelles abscisses $f$ n\'est-elle pas continue ? '
    'Donne-les dans l\'ordre croissant.\n\n$x_1=?$ et $x_2=?$',
    VARS_V2,
    [case('{{a}}', [
        erreur('{{eval:y1+j1}}', 'On demande l\'abscisse du saut, lue sur l\'axe horizontal, pas '
               'son ordonnée.', 'Ordonnée au lieu de l\'abscisse'),
        erreur('{{b}}', 'Donne d\'abord la plus petite des deux abscisses.', 'Ordre'),
    ]),
     case('{{b}}', [
         erreur('{{eval:y1+j1-1.5+j2}}', 'On demande l\'abscisse du saut, lue sur l\'axe '
                'horizontal, pas son ordonnée.', 'Ordonnée au lieu de l\'abscisse'),
         erreur('{{a}}', 'Donne d\'abord la plus petite des deux abscisses.', 'Ordre'),
     ])],
    [
        'Une fonction est continue sur un intervalle quand sa courbe s\'y trace **sans lever le '
        'crayon**.',
        'La courbe saute en $x={{a}}$ et en $x={{b}}$ : $f$ n\'est pas continue en $' + PRIMAIRE
        + '{ {{a}} }$ ni en $' + PRIMAIRE + '{ {{b}} }$.',
    ],
    'Cherche les endroits où il faut lever le crayon pour tracer la courbe.',
)

V2_B = variation(
    ENONCE_V2 + courbe_deux_sauts() + '\n\nQuel est le plus grand intervalle contenant $0$ sur '
    'lequel $f$ est continue ?\n\n$?$',
    VARS_V2,
    [case('[{{a}};{{b}}[', [
        erreur(']{{a}};{{b}}[', 'En $x={{a}}$, le point plein est sur le morceau du milieu : '
               'le morceau commence par $f({{a}})$, sans saut.', 'Borne gauche ouverte'),
        erreur('[{{a}};{{b}}]', 'En $x={{b}}$, la valeur $f({{b}})$ est sur le morceau de droite : '
               'le morceau du milieu saute en ${{b}}$.', 'Borne droite fermée'),
        erreur(']{{a}};{{b}}]', 'Regarde où sont les points pleins : en ${{a}}$ sur le morceau du '
               'milieu, en ${{b}}$ sur celui de droite.', 'Bornes inversées'),
    ], answerKind='intervalles')],
    [
        'Le morceau du milieu se trace sans lever le crayon, et le point plein en $x={{a}}$ lui '
        'appartient : $f$ est continue sur $\\left[{{a}}\\,;{{b}}\\right[$.',
        'En $x={{b}}$, $f({{b}})$ est sur le morceau de droite : la courbe saute, $f$ n\'est '
        'continue sur aucun intervalle qui contient ${{b}}$ et des réels juste avant. De même en '
        '${{a}}$ vers la gauche.',
        'Le plus grand intervalle contenant $0$ est $' + PRIMAIRE
        + '{\\left[{{a}}\\,;{{b}}\\right[}$.',
    ],
    'Repère les deux sauts, puis regarde de quel côté se trouve le point plein à chaque saut.',
)

V_V2 = {'a': '-2', 'y1': '0', 'j1': '2', 'j2': '-2'}  # b = 1, f(a) = 2, f(b) = −1,5
SPECS_10 = [
    spec('V2 a : −2 et 1', 0, V_V2, 'correct', ['-2', '1']),
    spec('V2 a : ordonnée au lieu de l\'abscisse', 0, V_V2, 'incorrect', ['2', '1'],
         'On demande l\'abscisse du saut, lue sur l\'axe horizontal, pas son ordonnée.'),
    spec('V2 a : ordre inversé', 0, V_V2, 'incorrect', ['1', '-2'],
         'Donne d\'abord la plus petite des deux abscisses.'),
    spec('V2 a : a = −1 → −1 et 2', 0, {'a': '-1', 'y1': '1', 'j1': '-2', 'j2': '2'}, 'correct',
         ['-1', '2']),
    spec('V2 b : [−2 ; 1[', 1, V_V2, 'correct', ['[-2;1['])
    ,
    spec('V2 b : ]−2 ; 1[', 1, V_V2, 'incorrect', [']-2;1['],
         'En $x = -2$, le point plein est sur le morceau du milieu : le morceau commence par '
         '$f\\left( -2 \\right)$, sans saut.'),
    spec('V2 b : [−2 ; 1]', 1, V_V2, 'incorrect', ['[-2;1]']),
    spec('V2 b : ]−2 ; 1]', 1, V_V2, 'incorrect', [']-2;1]']),
    spec('V2 b : a = −1 → [−1 ; 2[', 1, {'a': '-1', 'y1': '1', 'j1': '-2', 'j2': '2'}, 'correct',
         ['[-1;2[']),
]

# =============================================================================================
# 0965c56c (TSPE-309) — V3 : n chiffres qui peuvent se répéter, puis p lettres distinctes parmi
# les L premières de l'alphabet (TSG1-03). Réponse 10ⁿ × L!/(L − p)!.
# =============================================================================================

DERNIERE = '{{if:L==5|E|{{if:L==6|F|{{if:L==7|G|H}}}}}}'
V3 = variation(
    'Un code est formé de ${{n}}$ chiffres (de $0$ à $9$, chacun pouvant se répéter), suivis de '
    '${{p}}$ lettres **toutes différentes** choisies parmi les ${{L}}$ lettres de A à '
    + DERNIERE + '.\n\nCombien de codes différents existe-t-il ?\n\n$?$',
    [var('n', '2..4'), var('p', '2..3'), var('L', '5..8')],
    [case('{{eval:10^n*factorial(L)/factorial(L-p)}}', [
        erreur('{{eval:10^n*L^p}}', 'Les lettres sont toutes différentes : il reste une lettre de '
               'moins à chaque choix.', 'Lettres répétées'),
        erreur('{{eval:factorial(10)/factorial(10-n)*factorial(L)/factorial(L-p)}}', 'Les chiffres '
               'peuvent se répéter : ${{eval:10^n}}$ façons de les choisir.', 'Chiffres distincts'),
        erreur('{{eval:10^n+factorial(L)/factorial(L-p)}}', 'On choisit les chiffres ET les '
               'lettres : on multiplie les nombres de choix.', 'Somme au lieu du produit'),
    ], acceptCombinatorialNotation=True)],
    [
        'Les chiffres peuvent se répéter : $10^{ {{n}} }={{eval:10^n}}$ façons de les choisir.',
        'Les lettres sont distinctes et l\'ordre compte : $\\dfrac{ {{L}}! }{ {{eval:L-p}}! }='
        '{{eval:factorial(L)/factorial(L-p)}}$ façons.',
        'Principe multiplicatif : ${{eval:10^n}}\\times{{eval:factorial(L)/factorial(L-p)}}='
        + PRIMAIRE + '{ {{eval:10^n*factorial(L)/factorial(L-p)}} }$.',
    ],
    'Compte séparément les choix des chiffres et ceux des lettres, puis combine-les.',
)

SPECS_09 = [
    spec('V3 : n = 2, p = 2, L = 5 → 2000', 0, {'n': '2', 'p': '2', 'L': '5'}, 'correct', ['2000']),
    spec('V3 : notation combinatoire', 0, {'n': '2', 'p': '2', 'L': '5'}, 'correct',
         ['100\\times\\frac{5!}{3!}']),
    spec('V3 : lettres répétées', 0, {'n': '2', 'p': '2', 'L': '5'}, 'incorrect', ['2500'],
         'Les lettres sont toutes différentes : il reste une lettre de moins à chaque choix.'),
    spec('V3 : chiffres distincts', 0, {'n': '2', 'p': '2', 'L': '5'}, 'incorrect', ['1800'],
         'Les chiffres peuvent se répéter : $100$ façons de les choisir.'),
    spec('V3 : somme', 0, {'n': '2', 'p': '2', 'L': '5'}, 'incorrect', ['120']),
    spec('V3 : n = 3, p = 3, L = 8 → 336000', 0, {'n': '3', 'p': '3', 'L': '8'}, 'correct',
         ['336000']),
]

ajouter('2491dd75', [V1_A, V1_B], SPECS_24)
ajouter('10393ff9', [V2_A, V2_B], SPECS_10)
ajouter('0965c56c', [V3], SPECS_09)
print('3 modèles complétés dans', DOSSIER)
