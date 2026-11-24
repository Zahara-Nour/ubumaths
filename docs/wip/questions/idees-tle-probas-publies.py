"""Ajoute les variations validées aux 5 modèles publiés exportés de prod dans
scripts/questions/idees-tle-probas-publies/ (chantier idees-tle-probas).

Phase 0 validée par David le 2026-11-24 (« je valide tes recos », fiches
docs/archive/wip/idees-tle-probas/idees-tle-probas-fiches.md) : F1 (ecf4d46b), F4 a et F4 b (4ee9a359), F5 (7974722d),
F6 a et F6 b (0943e867), F7 a et F7 b (95f73515). Les variations s'ajoutent À LA FIN (les réponses
des élèves gardent l'indice de leur variation) ; la migration de contenu est générée par
scripts/questions/migration-contenu.ts.

Le script repart du contenu de prod (variations et specs d'origine, comptées dans ORIGINE) :
le relancer réécrit les ajouts sans les doubler. ⛔ Jamais de variable `e` (Euler) ni `i` (unité
imaginaire).

Usage : python3 docs/wip/questions/idees-tle-probas-publies.py scripts/questions/idees-tle-probas-publies
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'

# id court → (variations, specs) d'origine en prod (export du 2026-11-24)
ORIGINE = {'ecf4d46b': (2, 7), '4ee9a359': (3, 10), '7974722d': (1, 2), '0943e867': (4, 9),
           '95f73515': (1, 3)}


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


def case(attendue, erreurs=None):
    c = {'expectedAnswer': attendue}
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


EXACT = 'Réponds par une fraction irréductible ou par un nombre décimal exact.'

# =============================================================================================
# ecf4d46b (TSPE-617) — F1 : probabilités totales « à l'envers » : P(G) donnée, trouver P_B(G).
# P(A) = a/10, P_A(G) = g/10, P_B(G) = h/10 ; P(G) = (ag + (10 − a)h)/100.
# =============================================================================================

PG = '{{eval:(a*g+(10-a)*h)/100;d}}'
PAG = '{{eval:a*g/100;d}}'
PBG = '{{eval:(10-a)*h/100;d}}'
F1 = variation(
    'Avant une partie d\'un jeu vidéo, un joueur choisit le monde $A$ ou le monde $B$. On choisit '
    'un joueur au hasard et on note $G$ l\'événement « le joueur gagne la partie ». On sait que :\n\n'
    '- $P(A)={{eval:a/10;d}}$ ;\n- $P_{A}\\left(G\\right)={{eval:g/10;d}}$ ;\n- $P(G)=' + PG + '$.\n\n'
    'Calcule la probabilité que le joueur gagne sachant qu\'il a choisi le monde $B$. ' + EXACT
    + '\n\n$P_{B}\\left(G\\right)=?$',
    [var('a', '2..6'), var('g', '3..9'), var('h', '1..7')],
    [case('{{eval:h/10}}', [
        erreur('{{eval:(10-a)*h/100}}',
               'Ce nombre est $P(B\\cap G)$. Pour obtenir $P_{B}\\left(G\\right)$, il faut encore '
               'diviser par $P(B)={{eval:1-a/10;d}}$.', 'Oubli de diviser par P(B)'),
        erreur('{{eval:(a*g+(10-a)*h)/100-g/10}}',
               'On ne soustrait pas une probabilité conditionnelle : c\'est $P(A\\cap G)=P(A)\\times '
               'P_A(G)$ qu\'il faut retirer de $P(G)$.', 'P(G) − P_A(G)'),
        erreur('{{eval:(10-a)*h/(a*g+(10-a)*h)}}',
               'Ce nombre est $P_G(B)$. $P_B(G)=\\dfrac{P(B\\cap G)}{P(B)}$ : on divise par '
               '$P(B)$, pas par $P(G)$.', 'Divisé par P(G)'),
    ])],
    [
        '$A$ et $B$ forment une partition : $P(G)=P(A\\cap G)+P(B\\cap G)$ (probabilités totales).',
        '$P(A\\cap G)=P(A)\\times P_A(G)={{eval:a/10;d}}\\times{{eval:g/10;d}}=' + PAG + '$, donc '
        '$P(B\\cap G)=' + PG + '-' + PAG + '=' + PBG + '$.',
        '$P(B)=1-{{eval:a/10;d}}={{eval:1-a/10;d}}$ et $P_B(G)=\\dfrac{P(B\\cap G)}{P(B)}=\\dfrac{'
        + PBG + '}{ {{eval:1-a/10;d}} }=' + PRIMAIRE + '{ {{eval:h/10;d}} }$.',
    ],
    'Écris la formule des probabilités totales pour $P(G)$ : quel terme est inconnu ?',
    ['g != h'],
)
SPECS_F1 = [
    spec('F1 : P(A) = 0,4, P_A(G) = 0,7, P(G) = 0,46 → P_B(G) = 0,3', 0,
         {'a': '4', 'g': '7', 'h': '3'}, 'correct', ['0,3']),
    spec('F1 : en fraction', 0, {'a': '4', 'g': '7', 'h': '3'}, 'correct', ['\\frac{3}{10}']),
    spec('F1 : P(B ∩ G) = 0,18', 0, {'a': '4', 'g': '7', 'h': '3'}, 'incorrect', ['0,18'],
         'Ce nombre est $P(B\\cap G)$. Pour obtenir $P_{B}\\left(G\\right)$, il faut encore diviser par '
         '$P \\left( B \\right) = 0.6$.'),
    spec('F1 : P(G) − P_A(G) = −0,22', 0, {'a': '4', 'g': '7', 'h': '3'}, 'incorrect', ['-0,22']),
    spec('F1 : P_G(B) = 0,18/0,46', 0, {'a': '4', 'g': '7', 'h': '3'}, 'incorrect',
         ['\\frac{9}{23}']),
]

# =============================================================================================
# 4ee9a359 (TSPE-509) — F4 a : exprimer pₙ = 1 − qⁿ ; F4 b : condition de la boucle Python.
# p = t/20 (0,05 à 0,3), q = 1 − p.
# =============================================================================================

F4A = variation(
    'On répète $n$ fois, de façon indépendante, une épreuve de Bernoulli dont la probabilité de '
    'succès est $p={{eval:t/20;d}}$. Pour tout entier $n\\geqslant 1$, on note $p_n$ la probabilité '
    'd\'obtenir **au moins un** succès.\n\nExprime $p_n$ en fonction de $n$.\n\n$p_n=?$',
    [var('n', 'n|n'), var('t', '1..6')],
    [case('1-{{eval:1-t/20;d}}^n', [
        erreur('{{eval:1-t/20;d}}^n',
               'Ce nombre est la probabilité de n\'obtenir **aucun** succès. « Au moins un » est '
               'l\'événement contraire.', 'Aucun succès'),
        erreur('1-{{eval:t/20;d}}^n',
               'Le contraire de « au moins un succès » est « que des échecs », de probabilité '
               '$(1-p)^{n}$, pas $p^{n}$.', 'Mauvais contraire'),
        erreur('{{eval:t/20;d}}^n',
               'Ce nombre est la probabilité d\'obtenir $n$ succès sur $n$ épreuves.',
               'Que des succès'),
    ])],
    [
        'L\'événement contraire de « au moins un succès » est « aucun succès » : les $n$ épreuves, '
        'indépendantes, sont toutes des échecs, de probabilité $1-{{eval:t/20;d}}={{eval:1-t/20;d}}$.',
        '$P(\\text{aucun succès})={{eval:1-t/20;d}}^{n}$, donc $p_n=' + PRIMAIRE
        + '{1-{{eval:1-t/20;d}}^{n}}$.',
    ],
    'Quel est l\'événement contraire de « au moins un succès », et quelle est sa probabilité ?',
)

Q_PY = '0.{{eval:100-5*t}}'
F4B = variation(
    'On répète $n$ fois, de façon indépendante, une épreuve de Bernoulli dont la probabilité de '
    'succès est $p={{eval:t/20;d}}$. La probabilité d\'obtenir au moins un succès est '
    '$p_n=1-{{eval:1-t/20;d}}^{n}$.\n\nLa fonction Python ci-dessous doit renvoyer le plus petit '
    'entier $n$ tel que $p_n\\geqslant$ `seuil`, pour un `seuil` compris entre $0$ et $1$.\n\n'
    '```python\ndef rang_minimal(seuil):\n    n = 1\n    while ...:\n        n = n + 1\n    return n\n'
    '```\n\nQue faut-il écrire à la place des points de suspension ?\n\n'
    '```choix\n- `1 - ' + Q_PY + '**n < seuil`\n- `1 - ' + Q_PY + '**n >= seuil`\n'
    '- `' + Q_PY + '**n < seuil`\n- `n < seuil`\n```',
    [var('t', '1..6')],
    [case('0')],
    [
        'La boucle `while` répète son contenu **tant que** sa condition est vraie : elle doit '
        'continuer tant que $p_n<$ `seuil`, c\'est-à-dire tant que `1 - ' + Q_PY + '**n < seuil`.',
        'Avec `>=`, la boucle s\'arrêterait tout de suite ; `' + Q_PY + '**n < seuil` teste la '
        'probabilité de n\'avoir aucun succès ; `n < seuil` compare le rang au seuil.',
        'La condition est donc `1 - ' + Q_PY + '**n < seuil`.',
    ],
    'La boucle tourne **tant que** sa condition est vraie : quand doit-elle s\'arrêter ?',
)
SPECS_F4 = [
    spec('F4 a : p = 0,1 → 1 − 0,9ⁿ', 0, {'t': '2'}, 'correct', ['1-0{,}9^n']),
    spec('F4 a : 1 − (9/10)ⁿ : mauvaise forme (p est donné en décimal)', 0, {'t': '2'}, 'bad_form',
         ['1-\\left(\\frac{9}{10}\\right)^n'], violations=['form']),
    spec('F4 a : 1 − 0.9ⁿ (point) accepté', 0, {'t': '2'}, 'correct', ['1-0.9^n']),
    spec('F4 a : 0,9ⁿ (aucun succès)', 0, {'t': '2'}, 'incorrect', ['0{,}9^n'],
         'Ce nombre est la probabilité de n\'obtenir **aucun** succès. « Au moins un » est '
         'l\'événement contraire.'),
    spec('F4 a : 1 − 0,1ⁿ', 0, {'t': '2'}, 'incorrect', ['1-0{,}1^n']),
    spec('F4 a : 0,1ⁿ', 0, {'t': '2'}, 'incorrect', ['0{,}1^n']),
    spec('F4 b : bonne condition', 1, {'t': '2'}, 'correct', ['0']),
    spec('F4 b : >= (arrêt immédiat)', 1, {'t': '2'}, 'incorrect', ['1']),
    spec('F4 b : qⁿ < seuil', 1, {'t': '2'}, 'incorrect', ['2']),
]

# =============================================================================================
# 7974722d (TSPE-526) — F5 : linéarité de l'espérance sans indépendance (X₁, X₂ liées par l'arbre).
# P(A) = a/10, P_A(B) = b/10, P_Ā(B) = c/10 ; E(X) = P(A) + P(B).
# =============================================================================================

PB = '{{eval:(a*b+(10-a)*c)/100;d}}'
F5 = variation(
    'Un exercice comporte deux questions $Q_1$ et $Q_2$, chacune notée $0$ ou $1$ point. On choisit '
    'un candidat au hasard ; on note $A$ l\'événement « il réussit $Q_1$ » et $B$ l\'événement « il '
    'réussit $Q_2$ ». L\'arbre ci-dessous décrit la situation.\n\n'
    '```probtree\nA:{{eval:a/10;d}}\n  B:{{eval:b/10;d}}\n  \\overline{B}:{{eval:1-b/10;d}}\n'
    '\\overline{A}:{{eval:1-a/10;d}}\n  B:{{eval:c/10;d}}\n  \\overline{B}:{{eval:1-c/10;d}}\n```\n\n'
    'On note $X_1$ et $X_2$ les notes du candidat aux deux questions, et $X=X_1+X_2$ sa note à '
    'l\'exercice. Les variables $X_1$ et $X_2$ ne sont **pas** indépendantes.\n\n'
    'Calcule $E(X)$. Réponds par un nombre décimal exact.\n\n$E(X)=?$',
    [var('a', '2..8'), var('b', '2..8'), var('c', '2..8')],
    [case('{{eval:a/10+(a*b+(10-a)*c)/100}}', [
        erreur('{{eval:a/10+b/10}}',
               '$P_A(B)$ est la probabilité de réussir $Q_2$ **sachant** que $Q_1$ est réussie. '
               '$E(X_2)=P(B)$ se calcule avec les probabilités totales.', 'P_A(B) au lieu de P(B)'),
        erreur('{{eval:2*a*b/100}}',
               'Ce nombre compte seulement les candidats qui réussissent les deux questions. '
               '$E(X)=E(X_1)+E(X_2)$, même sans indépendance.', 'Seulement les deux réussies'),
        erreur('{{eval:a/10*(a*b+(10-a)*c)/100}}',
               'L\'espérance d\'une **somme** est la somme des espérances : '
               '$E(X)=E(X_1)+E(X_2)$, pas un produit.', 'Produit au lieu de somme'),
    ])],
    [
        '$X_1$ suit la loi de Bernoulli de paramètre $P(A)$ : $E(X_1)=P(A)={{eval:a/10;d}}$. De même, '
        '$E(X_2)=P(B)$.',
        'Probabilités totales : $P(B)=P(A)P_A(B)+P(\\overline{A})P_{\\overline{A}}(B)='
        '{{eval:a/10;d}}\\times{{eval:b/10;d}}+{{eval:1-a/10;d}}\\times{{eval:c/10;d}}=' + PB + '$.',
        'La linéarité de l\'espérance vaut **même sans indépendance** : $E(X)=E(X_1)+E(X_2)='
        '{{eval:a/10;d}}+' + PB + '=' + PRIMAIRE + '{ {{eval:a/10+(a*b+(10-a)*c)/100;d}} }$.',
    ],
    'Que vaut l\'espérance d\'une note qui vaut $1$ ou $0$ ? La linéarité a-t-elle besoin de '
    'l\'indépendance ?',
    ['b != c'],
)
SPECS_F5 = [
    spec('F5 : P(A) = 0,6, P_A(B) = 0,7, P_Ā(B) = 0,2 → 0,6 + 0,5 = 1,1', 0,
         {'a': '6', 'b': '7', 'c': '2'}, 'correct', ['1,1']),
    spec('F5 : P_A(B) au lieu de P(B) → 1,3', 0, {'a': '6', 'b': '7', 'c': '2'}, 'incorrect',
         ['1,3'],
         '$P_A \\left( B \\right)$ est la probabilité de réussir $Q_2$ **sachant** que $Q_1$ '
         'est réussie. $E \\left( X_2 \\right) = P \\left( B \\right)$ se calcule avec les '
         'probabilités totales.'),
    spec('F5 : 2 P(A ∩ B) = 0,84', 0, {'a': '6', 'b': '7', 'c': '2'}, 'incorrect', ['0,84']),
    spec('F5 : produit 0,3', 0, {'a': '6', 'b': '7', 'c': '2'}, 'incorrect', ['0,3']),
]

# =============================================================================================
# 0943e867 (TSPE-530) — F6 a : réunion d'intervalles ; F6 b : somme de n variables indépendantes.
# =============================================================================================

REUNION_X = ('P\\left(X\\in\\left]-\\infty\\,;{{eval:m-d}}\\right]\\cup\\left[{{eval:m+d}}\\,;'
             '+\\infty\\right[\\right)')
F6A = variation(
    'Une variable aléatoire $X$ a pour espérance $\\mu={{m}}$ et pour variance $V(X)={{v}}$.\n\n'
    'À l\'aide de l\'inégalité de Bienaymé-Tchebychev, donne un majorant de $' + REUNION_X + '$.\n\n$'
    + REUNION_X + '\\leqslant ?$',
    [var('m', '5..50'), var('v', '1..20'), var('d', '2..10')],
    [case('{{eval:v/d^2}}', [
        erreur('{{eval:v/d}}', 'L\'inégalité divise la variance par le **carré** de l\'écart : '
               '$\\dfrac{V(X)}{\\delta^{2}}$.', 'V/δ'),
        erreur('{{eval:1-v/d^2}}', 'Ce nombre minore la probabilité de l\'intervalle **centré**. '
               'Ici, $X$ est loin de ${{m}}$ : c\'est l\'événement $|X-{{m}}|\\geqslant {{d}}$, '
               'majoré directement.', '1 − V/δ²'),
    ])],
    [
        '$X\\leqslant {{eval:m-d}}$ ou $X\\geqslant {{eval:m+d}}$ veut dire que $X$ est à une distance '
        'au moins ${{d}}$ de ${{m}}$ : l\'événement est $\\left|X-{{m}}\\right|\\geqslant {{d}}$.',
        'Bienaymé-Tchebychev : $P\\left(\\left|X-{{m}}\\right|\\geqslant {{d}}\\right)\\leqslant'
        '\\dfrac{ {{v}} }{ {{d}}^{2} }=' + PRIMAIRE + '{ {{eval:v/d^2}} }$.',
    ],
    'Les deux intervalles sont à égale distance de ${{m}}$ : écris l\'événement avec une valeur '
    'absolue.',
    ['v < d^2'],
)

F6B = variation(
    'Les variables aléatoires $X_1$, …, $X_{ {{n}} }$ sont **indépendantes** et suivent toutes la '
    'même loi, d\'espérance $\\mu={{m}}$ et de variance $V={{v}}$. On pose '
    '$S=X_1+\\cdots+X_{ {{n}} }$.\n\nÀ l\'aide de l\'inégalité de Bienaymé-Tchebychev, donne un '
    'majorant de $P\\left(\\left|S-{{eval:n*m}}\\right|\\geqslant {{d}}\\right)$.\n\n'
    '$P\\left(\\left|S-{{eval:n*m}}\\right|\\geqslant {{d}}\\right)\\leqslant ?$',
    [var('n', '10|20|25|50'), var('m', '1..9'), var('v', '1..5'), var('d', '10..40')],
    [case('{{eval:n*v/d^2}}', [
        erreur('{{eval:v/d^2}}', 'C\'est la variance de **$S$** qui compte : les $X_k$ étant '
               'indépendantes, $V(S)={{n}}\\times{{v}}$.', 'n oublié'),
        erreur('{{eval:n^2*v/d^2}}', 'Pour une somme de variables indépendantes, les variances '
               's\'ajoutent : $V(S)={{n}}V$, pas ${{n}}^{2}V$.', 'n² V'),
        erreur('{{eval:n*v/d}}', 'L\'inégalité divise la variance par le **carré** de l\'écart.',
               'V(S)/δ'),
    ])],
    [
        '$E(S)={{n}}\\times{{m}}={{eval:n*m}}$ et, les $X_k$ étant indépendantes, '
        '$V(S)={{n}}\\times{{v}}={{eval:n*v}}$.',
        'Bienaymé-Tchebychev appliquée à $S$ : $P\\left(\\left|S-{{eval:n*m}}\\right|\\geqslant '
        '{{d}}\\right)\\leqslant\\dfrac{ {{eval:n*v}} }{ {{d}}^{2} }=' + PRIMAIRE
        + '{ {{eval:n*v/d^2}} }$.',
    ],
    'Calcule d\'abord l\'espérance et la variance de $S$.',
    ['n*v < d^2'],
)
SPECS_F6 = [
    spec('F6 a : V = 4, δ = 5 → 4/25', 0, {'m': '10', 'v': '4', 'd': '5'}, 'correct',
         ['\\frac{4}{25}']),
    spec('F6 a : 0,16 accepté', 0, {'m': '10', 'v': '4', 'd': '5'}, 'correct', ['0,16']),
    spec('F6 a : V/δ', 0, {'m': '10', 'v': '4', 'd': '5'}, 'incorrect', ['\\frac{4}{5}']),
    spec('F6 a : 1 − V/δ²', 0, {'m': '10', 'v': '4', 'd': '5'}, 'incorrect', ['\\frac{21}{25}']),
    spec('F6 b : n = 20, V = 2, δ = 10 → 40/100', 1, {'n': '20', 'm': '3', 'v': '2', 'd': '10'},
         'correct', ['0,4']),
    spec('F6 b : n oublié', 1, {'n': '20', 'm': '3', 'v': '2', 'd': '10'}, 'incorrect', ['0,02']),
    spec('F6 b : n² V', 1, {'n': '20', 'm': '3', 'v': '2', 'd': '10'}, 'incorrect', ['8']),
    spec('F6 b : V(S)/δ', 1, {'n': '20', 'm': '3', 'v': '2', 'd': '10'}, 'incorrect', ['4']),
]

# =============================================================================================
# 95f73515 (TSPE-531) — F7 a : minorant ; F7 b : réunion d'intervalles. δ = 1/d, comme v0.
# =============================================================================================

F7A = variation(
    '$M$ est la moyenne d\'un échantillon de taille $n={{n}}$ d\'une loi d\'espérance $\\mu$ et de '
    'variance $V={{v}}$.\n\nÀ l\'aide de l\'inégalité de concentration, donne un minorant de '
    '$P\\left(\\left|M-\\mu\\right|<{{eval:1/d;d}}\\right)$ (nombre décimal).\n\n'
    '$P\\left(\\left|M-\\mu\\right|<{{eval:1/d;d}}\\right)\\geqslant ?$',
    [var('n', '100|200|400|500|1000'), var('v', '1..10'), var('d', '2|4|5|10')],
    [case('{{eval:1-v*d^2/n}}', [
        erreur('{{eval:v*d^2/n}}', 'Ce nombre **majore** la probabilité que $M$ s\'écarte de '
               '$\\mu$. L\'événement demandé est le contraire : on passe par $1-\\ldots$',
               'Majorant au lieu du minorant'),
        erreur('{{eval:1-v*d/n}}', 'L\'inégalité divise par $n\\delta^{2}$ : l\'écart est au '
               '**carré**.', 'δ au lieu de δ²'),
        erreur('{{eval:1-v*d^2}}', 'Pour la moyenne d\'un échantillon, la variance est divisée '
               'par $n$ : $\\dfrac{V}{n\\delta^{2}}$.', 'n oublié'),
    ])],
    [
        '$\\left|M-\\mu\\right|<{{eval:1/d;d}}$ est l\'événement contraire de '
        '$\\left|M-\\mu\\right|\\geqslant {{eval:1/d;d}}$.',
        'Inégalité de concentration : $P\\left(\\left|M-\\mu\\right|\\geqslant {{eval:1/d;d}}\\right)'
        '\\leqslant\\dfrac{ {{v}} }{ {{n}}\\times{{eval:1/d;d}}^{2} }={{eval:v*d^2/n;d}}$.',
        'Donc $P\\left(\\left|M-\\mu\\right|<{{eval:1/d;d}}\\right)\\geqslant 1-{{eval:v*d^2/n;d}}='
        + PRIMAIRE + '{ {{eval:1-v*d^2/n;d}} }$.',
    ],
    'L\'inégalité de concentration majore la probabilité d\'un **écart**. Quel est le contraire de '
    'l\'événement demandé ?',
    ['v*d^2 < n'],
)

REUNION_M = ('P\\left(M\\in\\left]-\\infty\\,;{{eval:m-1/d;d}}\\right]\\cup\\left[{{eval:m+1/d;d}}'
             '\\,;+\\infty\\right[\\right)')
F7B = variation(
    '$M$ est la moyenne d\'un échantillon de taille $n={{n}}$ d\'une loi d\'espérance $\\mu={{m}}$ et '
    'de variance $V={{v}}$.\n\nÀ l\'aide de l\'inégalité de concentration, donne un majorant de $'
    + REUNION_M + '$ (nombre décimal).\n\n$' + REUNION_M + '\\leqslant ?$',
    [var('n', '100|200|400|500|1000'), var('m', '1..20'), var('v', '1..10'), var('d', '2|4|5|10')],
    [case('{{eval:v*d^2/n}}', [
        erreur('{{eval:1-v*d^2/n}}', 'Ici, $M$ est **loin** de ${{m}}$ : c\'est l\'événement '
               '$\\left|M-{{m}}\\right|\\geqslant {{eval:1/d;d}}$, majoré directement, sans '
               '$1-\\ldots$', '1 − majorant'),
        erreur('{{eval:v*d/n}}', 'L\'inégalité divise par $n\\delta^{2}$ : l\'écart est au '
               '**carré**.', 'δ au lieu de δ²'),
        erreur('{{eval:v*d^2}}', 'Pour la moyenne d\'un échantillon, la variance est divisée par '
               '$n$ : $\\dfrac{V}{n\\delta^{2}}$.', 'n oublié'),
    ])],
    [
        '$M\\leqslant {{eval:m-1/d;d}}$ ou $M\\geqslant {{eval:m+1/d;d}}$ : $M$ est à une distance au '
        'moins ${{eval:1/d;d}}$ de ${{m}}$, c\'est l\'événement $\\left|M-{{m}}\\right|\\geqslant '
        '{{eval:1/d;d}}$.',
        'Inégalité de concentration : $P\\left(\\left|M-{{m}}\\right|\\geqslant {{eval:1/d;d}}\\right)'
        '\\leqslant\\dfrac{ {{v}} }{ {{n}}\\times{{eval:1/d;d}}^{2} }=' + PRIMAIRE
        + '{ {{eval:v*d^2/n;d}} }$.',
    ],
    'Les deux intervalles sont à égale distance de ${{m}}$ : écris l\'événement avec une valeur '
    'absolue.',
    ['v*d^2 < n'],
)
SPECS_F7 = [
    spec('F7 a : n = 1000, V = 5, δ = 0,1 → 1 − 0,5 = 0,5', 0, {'n': '1000', 'v': '5', 'd': '10'},
         'correct', ['0,5']),
    spec('F7 a : n = 500, V = 2, δ = 0,2 → 1 − 0,1 = 0,9', 0, {'n': '500', 'v': '2', 'd': '5'},
         'correct', ['0,9']),
    spec('F7 a : majorant donné', 0, {'n': '500', 'v': '2', 'd': '5'}, 'incorrect', ['0,1']),
    spec('F7 a : δ au lieu de δ²', 0, {'n': '500', 'v': '2', 'd': '5'}, 'incorrect', ['0,98']),
    spec('F7 b : n = 400, V = 4, δ = 0,25 → 0,16', 1, {'n': '400', 'm': '7', 'v': '4', 'd': '4'},
         'correct', ['0,16']),
    spec('F7 b : 1 − majorant', 1, {'n': '400', 'm': '7', 'v': '4', 'd': '4'}, 'incorrect',
         ['0,84']),
    spec('F7 b : δ au lieu de δ²', 1, {'n': '400', 'm': '7', 'v': '4', 'd': '4'}, 'incorrect',
         ['0,04']),
]

ajouter('ecf4d46b', [F1], SPECS_F1)
ajouter('4ee9a359', [F4A, F4B], SPECS_F4)
ajouter('7974722d', [F5], SPECS_F5)
ajouter('0943e867', [F6A, F6B], SPECS_F6)
ajouter('95f73515', [F7A, F7B], SPECS_F7)
print('écrit :', DOSSIER)
