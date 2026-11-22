"""Écrit les 5 modèles neufs du chantier idees-tle-suites dans scripts/questions/idees-tle-suites-neufs/.

Fiches validées par David le 2026-11-22 : docs/archive/wip/idees-tle-suites/idees-tle-suites-fiches.md § Modèles neufs
(F9, F10, F11, F12, F14 bis). Grades T_SPE. Ni theme, ni domain, ni subdomain, ni id : le
rangement (nœud du point + tag) se fera par migration, après la création en brouillon.

Règles suivies (couvrir-un-niveau.md § 5) : trois erreurs prévues par case d'écriture ordinaire,
chacune avec sa spec `incorrect` qui nomme son message (écrit sous sa forme RÉÉCRITE :
`$k + 1$`, pas `$k+1$`) ; un coup de pouce par variation, qui ne donne jamais la réponse ; pas de
Oui / Non nu ; la consigne dit ce que la forme imposée refuse.
"""
import json
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'


def spec(desc, vi, variables_, status, answers, message=None, violations=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = message
    if violations is not None:
        expected['constraintViolations'] = violations
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': expected, 'answers': answers}


def modele(title, description, level, delay, variations, specs, options=None, shared=None):
    m = {'title': title, 'description': description, 'grades': ['T_SPE'], 'level': level,
         'delay': delay, 'status': 'draft', 'shared': shared or {}}
    if options:
        m['options'] = options
    m['variations'] = variations
    m['testSpecs'] = specs
    return m


def bloc(nom, *lignes):
    return '```' + nom + '\n' + '\n'.join(lignes) + '\n```'


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


def choix(*options):
    return bloc('choix', *['- ' + o for o in options])


# =============================================================================================
# F9 — TSPE-386 (raisonner par récurrence) : « Démontrer une forme explicite par récurrence :
# l'hérédité ». Forme imposée comme d1aee0b9 v3 : contrainte `form` stricte par défaut (le
# modèle ne la règle pas), l'attendue est la formule au rang k + 1 ; une écriture de même valeur
# autrement écrite (développée, ou la relation recopiée) est `bad_form`. La consigne le dit.
# (c) : vₙ₊₁ − vₙ, un entier (la forme n'y joue pas).
# =============================================================================================

REFUS = ('Une expression de même valeur écrite autrement (développée, par exemple) est refusée.')

F9_A = variation(
    'La suite $(u_n)$ est définie par $u_0={{eval:l+c}}$ et, pour tout entier naturel $n$, '
    '$u_{n+1}={{r}}u_n{{eval:l*(1-r);+}}$. On veut démontrer par récurrence que, pour tout '
    'entier naturel $n$, $u_n={{l}}{{c;+}}\\times{{r}}^{n}$.\n\n'
    'Hérédité : on suppose $u_k={{l}}{{c;+}}\\times{{r}}^{k}$ pour un entier naturel $k$. '
    'Écris $u_{k+1}$ en fonction de $k$, sous la forme de la formule au rang $k+1$. '
    + REFUS + '\n\n$u_{k+1}=?$',
    [var('r', '2..5'), var('l', '1..9;±'), var('c', '2..9;±')],
    [case('{{l}}{{c;+}}\\times{{r}}^{k+1}', [
        erreur('{{l}}{{c;+}}\\times{{r}}^{k}',
               'Tu as recopié la formule au rang $k$ : au rang $k + 1$, l\'exposant devient '
               '$k + 1$.', 'Formule au rang k'),
        erreur('{{eval:r*l}}{{c;+}}\\times{{r}}^{k+1}',
               'Tu as multiplié $u_k$ par ${{r}}$ sans ajouter ensuite le terme constant de la '
               'relation.', 'Terme constant oublié'),
        erreur('{{eval:l*(2-r)}}{{c;+}}\\times{{r}}^{k+1}',
               'Tu n\'as multiplié par ${{r}}$ que le terme en puissance : c\'est tout $u_k$ '
               'qu\'il faut multiplier.', 'Multiplication partielle'),
    ])],
    [
        '$u_{k+1}={{r}}u_k{{eval:l*(1-r);+}}={{r}}\\left({{l}}{{c;+}}\\times{{r}}^{k}\\right)'
        '{{eval:l*(1-r);+}}$.',
        '$u_{k+1}={{eval:r*l}}{{eval:l*(1-r);+}}{{c;+}}\\times{{r}}\\times{{r}}^{k}='
        + PRIMAIRE + '{ {{l}}{{c;+}}\\times{{r}}^{k+1} }$ : c\'est la formule au rang $k+1$.',
        'Avec l\'initialisation ($u_0={{eval:l+c}}={{l}}{{c;+}}\\times{{r}}^{0}$), la formule est '
        'vraie pour tout entier naturel $n$.',
    ],
    'Remplace $u_k$ par la formule dans $u_{k+1}={{r}}u_k{{eval:l*(1-r);+}}$, développe, puis '
    'utilise ${{r}}\\times{{r}}^{k}={{r}}^{k+1}$.',
)

F9_B = variation(
    'La suite $(u_n)$ est définie par $u_0=\\dfrac{1}{{{a}}}$ et, pour tout entier naturel $n$, '
    '$u_{n+1}=\\dfrac{u_n}{{{b}}u_n+1}$ ; ses termes sont strictement positifs. On veut '
    'démontrer par récurrence que, pour tout entier naturel $n$, '
    '$u_n=\\dfrac{1}{{{b}}n+{{a}}}$.\n\n'
    'Hérédité : on suppose $u_k=\\dfrac{1}{{{b}}k+{{a}}}$ pour un entier naturel $k$. Écris '
    '$u_{k+1}$ en fonction de $k$, sous la forme de la formule au rang $k+1$. ' + REFUS
    + '\n\n$u_{k+1}=?$',
    [var('b', '2..5'), var('a', '2..9')],
    [case('\\frac{1}{{{b}}(k+1)+{{a}}}', [
        erreur('\\frac{1}{{{b}}k+{{eval:a+1}}}',
               'Au rang $k + 1$, on remplace $k$ par $k + 1$ : le dénominateur augmente de '
               '${{b}}$, pas de $1$.', 'Dénominateur augmenté de 1'),
        erreur('{{b}}(k+1)+{{a}}',
               'Tu as donné l\'inverse de $u_{k + 1}$.', 'Inverse'),
        erreur('\\frac{1}{{{b}}}',
               'Le dénominateur de la relation est ${{b}}u_k + 1$ : n\'oublie pas d\'ajouter '
               '$1$.', '+1 oublié au dénominateur'),
    ])],
    [
        '$u_{k+1}=\\dfrac{u_k}{{{b}}u_k+1}=\\dfrac{\\dfrac{1}{{{b}}k+{{a}}}}'
        '{\\dfrac{{{b}}}{{{b}}k+{{a}}}+1}$.',
        'On multiplie le numérateur et le dénominateur par ${{b}}k+{{a}}$ : '
        '$u_{k+1}=\\dfrac{1}{{{b}}+{{b}}k+{{a}}}=' + PRIMAIRE
        + '{\\dfrac{1}{{{b}}(k+1)+{{a}}}}$ : c\'est la formule au rang $k+1$.',
        'Avec l\'initialisation ($u_0=\\dfrac{1}{{{a}}}=\\dfrac{1}{{{b}}\\times0+{{a}}}$), la '
        'formule est vraie pour tout entier naturel $n$.',
    ],
    'Remplace $u_k$ par $\\dfrac{1}{{{b}}k+{{a}}}$ dans la relation, puis multiplie le numérateur '
    'et le dénominateur par ${{b}}k+{{a}}$.',
)

F9_C = variation(
    'La suite $(u_n)$ est définie par $u_0=1$ et, pour tout entier naturel $n$, '
    '$u_{n+1}=\\dfrac{u_n}{1+{{a}}u_n}$ ; ses termes sont strictement positifs. On pose, pour '
    'tout entier naturel $n$, $v_n=\\dfrac{1}{u_n}$.\n\n'
    'Calcule $v_{n+1}-v_n$.\n\n$v_{n+1}-v_n=?$',
    [var('a', '2..9')],
    [case('{{a}}', [
        erreur('-{{a}}', 'Tu as calculé $v_n - v_{n + 1}$, l\'opposé de la différence demandée.',
               'Différence inversée'),
        erreur('{{eval:a+1}}',
               'On ne simplifie pas une somme par $u_n$ : '
               '$\\frac{1 + {{a}}u_n}{u_n} = \\frac{1}{u_n} + {{a}}$.',
               'Simplification abusive'),
        erreur('\\frac{1}{{{a}}}',
               'Tu as inversé ${{a}}$ : $\\frac{1 + {{a}}u_n}{u_n} = \\frac{1}{u_n} + {{a}}$.',
               'Inverse de a'),
    ])],
    [
        '$v_{n+1}=\\dfrac{1}{u_{n+1}}=\\dfrac{1+{{a}}u_n}{u_n}=\\dfrac{1}{u_n}+{{a}}=v_n+{{a}}$.',
        'Donc $v_{n+1}-v_n=' + PRIMAIRE + '{{{a}}}$ : la suite $(v_n)$ est arithmétique de raison '
        '${{a}}$.',
    ],
    'Écris $v_{n+1}=\\dfrac{1}{u_{n+1}}$ en inversant la fraction $\\dfrac{u_n}{1+{{a}}u_n}$, '
    'puis coupe la fraction obtenue en deux.',
)

SPECS_F9 = [
    # (a) r = 2, ℓ = 3, c = 4 : uₙ₊₁ = 2uₙ − 3, attendu 3 + 4×2^(k+1)
    spec('a : formule au rang k + 1', 0, {'r': '2', 'l': '3', 'c': '4'}, 'correct',
         ['3+4\\times2^{k+1}']),
    spec('a : point de multiplication', 0, {'r': '2', 'l': '3', 'c': '4'}, 'correct',
         ['3+4\\cdot2^{k+1}']),
    spec('a : 8×2^k, forme refusée', 0, {'r': '2', 'l': '3', 'c': '4'}, 'bad_form',
         ['3+8\\times2^{k}'], violations=['form']),
    spec('a : relation recopiée, forme refusée', 0, {'r': '2', 'l': '3', 'c': '4'}, 'bad_form',
         ['2(3+4\\times2^{k})-3'], violations=['form']),
    spec('a : formule au rang k', 0, {'r': '2', 'l': '3', 'c': '4'}, 'incorrect',
         ['3+4\\times2^{k}'],
         'Tu as recopié la formule au rang $k$ : au rang $k + 1$, l\'exposant devient $k + 1$.'),
    spec('a : terme constant oublié', 0, {'r': '2', 'l': '3', 'c': '4'}, 'incorrect',
         ['6+4\\times2^{k+1}'],
         'Tu as multiplié $u_k$ par $2$ sans ajouter ensuite le terme constant de la relation.'),
    spec('a : multiplication partielle', 0, {'r': '3', 'l': '5', 'c': '-2'}, 'incorrect',
         ['-5-2\\times3^{k+1}'],
         'Tu n\'as multiplié par $3$ que le terme en puissance : c\'est tout $u_k$ qu\'il faut '
         'multiplier.'),
    spec('a : ordre inversé', 0, {'r': '2', 'l': '3', 'c': '4'}, 'correct',
         ['4\\times2^{k+1}+3']),
    spec('a : c négatif', 0, {'r': '3', 'l': '5', 'c': '-2'}, 'correct',
         ['5-2\\times3^{k+1}']),
    # (b) b = 2, a = 3 : attendu 1/(2(k+1)+3)
    spec('b : formule au rang k + 1', 1, {'b': '2', 'a': '3'}, 'correct',
         ['\\frac{1}{2(k+1)+3}']),
    spec('b : 1/(2k+5), forme refusée', 1, {'b': '2', 'a': '3'}, 'bad_form',
         ['\\frac{1}{2k+5}'], violations=['form']),
    spec('b : dénominateur + 1', 1, {'b': '2', 'a': '3'}, 'incorrect', ['\\frac{1}{2k+4}'],
         'Au rang $k + 1$, on remplace $k$ par $k + 1$ : le dénominateur augmente de $2$, pas '
         'de $1$.'),
    spec('b : inverse', 1, {'b': '2', 'a': '3'}, 'incorrect', ['2(k+1)+3'],
         'Tu as donné l\'inverse de $u_{k + 1}$.'),
    spec('b : +1 oublié', 1, {'b': '2', 'a': '3'}, 'incorrect', ['\\frac{1}{2}'],
         'Le dénominateur de la relation est $2 u_k + 1$ : n\'oublie pas d\'ajouter $1$.'),
    # (c) a = 4
    spec('c : a', 2, {'a': '4'}, 'correct', ['4']),
    spec('c : opposé', 2, {'a': '4'}, 'incorrect', ['-4'],
         'Tu as calculé $v_n - v_{n + 1}$, l\'opposé de la différence demandée.'),
    spec('c : 1 + a', 2, {'a': '4'}, 'incorrect', ['5'],
         'On ne simplifie pas une somme par $u_n$ : $\\frac{1 + 4u_n}{u_n} = \\frac{1}{u_n} + 4$.'),
    spec('c : 1/a', 2, {'a': '4'}, 'incorrect', ['\\frac{1}{4}'],
         'Tu as inversé $4$ : $\\frac{1 + 4u_n}{u_n} = \\frac{1}{u_n} + 4$.'),
]

# =============================================================================================
# F10 — TSPE-385 (établir la convergence) : « Sens de variation d'une suite
# arithmético-géométrique ». a = k/10, ℓ = 10m entier, b = m(10 − k). Case 1 : uₙ₊₁ − uₙ en
# fonction de uₙ, toute écriture équivalente (`form: off`, comme 9f14d672). Case 2 : choix du
# sens et de la conclusion, la rédaction juste en premier (indice 0), mélangée à l'affichage.
# Erreur « signe de a − 1 » écartée : pour k = 5 elle a la valeur de « uₙ₊₁ écrit » (rejeu rouge).
# =============================================================================================


def f10(decroissante):
    if decroissante:
        u0, sens = '{{eval:10*m+d}}', '\\geqslant'
        options = [
            '$(u_n)$ est décroissante, car $u_{n+1}-u_n\\leqslant0$ ; décroissante et minorée par '
            '${{eval:10*m}}$, elle converge',
            '$(u_n)$ est croissante, car $u_{n+1}-u_n\\geqslant0$ ; croissante et minorée par '
            '${{eval:10*m}}$, elle converge',
            '$(u_n)$ est décroissante, donc elle tend vers $-\\infty$',
            'On ne peut pas conclure : le signe de $u_{n+1}-u_n$ change avec $n$',
        ]
        signe = ('un nombre négatif fois un nombre positif ou nul (car '
                 '$u_n\\geqslant{{eval:10*m}}$), donc $u_{n+1}-u_n\\leqslant0$.')
        fin = 'La suite est décroissante et minorée par ${{eval:10*m}}$ : elle converge.'
    else:
        u0, sens = '{{eval:10*m-d}}', '\\leqslant'
        options = [
            '$(u_n)$ est croissante, car $u_{n+1}-u_n\\geqslant0$ ; croissante et majorée par '
            '${{eval:10*m}}$, elle converge',
            '$(u_n)$ est décroissante, car $u_{n+1}-u_n\\leqslant0$ ; décroissante et majorée par '
            '${{eval:10*m}}$, elle converge',
            '$(u_n)$ est croissante, donc elle tend vers $+\\infty$',
            'On ne peut pas conclure : le signe de $u_{n+1}-u_n$ change avec $n$',
        ]
        signe = ('un nombre négatif fois un nombre négatif ou nul (car '
                 '$u_n\\leqslant{{eval:10*m}}$), donc $u_{n+1}-u_n\\geqslant0$.')
        fin = 'La suite est croissante et majorée par ${{eval:10*m}}$ : elle converge.'
    return variation(
        'La suite $(u_n)$ est définie par $u_0=' + u0 + '$ et, pour tout entier naturel $n$, '
        '$u_{n+1}={{eval:k/10;d}}u_n{{eval:m*(10-k);+}}$. On admet que, pour tout entier naturel '
        '$n$, $u_n' + sens + '{{eval:10*m}}$.\n\n'
        '1. Exprime $u_{n+1}-u_n$ en fonction de $u_n$.\n\n$u_{n+1}-u_n=?$\n\n'
        '2. Quelle conclusion est juste ?\n\n' + choix(*options),
        [var('k', '1..9'), var('m', '1..9;±'), var('d', '2..20')],
        [case('{{eval:k/10-1;d}}u_n{{eval:m*(10-k);+}}', [
            erreur('{{eval:k/10;d}}u_n{{eval:m*(10-k);+}}',
                   'Tu as écrit $u_{n + 1}$ : il reste à lui soustraire $u_n$.', 'uₙ₊₁ au lieu '
                   'de la différence'),
            erreur('{{eval:k/10-1;d}}u_n',
                   'Tu as oublié le terme constant de la relation.', 'Terme constant oublié'),
            erreur('{{eval:1-k/10;d}}u_n{{eval:-m*(10-k);+}}',
                   'Tu as calculé $u_n - u_{n + 1}$, l\'opposé de la différence demandée.',
                   'Différence inversée'),
        ]), case('0')],
        [
            '$u_{n+1}-u_n={{eval:k/10;d}}u_n{{eval:m*(10-k);+}}-u_n=' + PRIMAIRE
            + '{ {{eval:k/10-1;d}}u_n{{eval:m*(10-k);+}} }$.',
            'Comme ${{eval:m*(10-k)}}={{eval:1-k/10;d}}\\times{{eval:10*m;()}}$, '
            '$u_{n+1}-u_n={{eval:k/10-1;d}}\\left(u_n-{{eval:10*m;()}}\\right)$ : ' + signe,
            fin + ' Les autres conclusions se trompent de signe, confondent monotone et '
            '« tend vers l\'infini », ou oublient que le signe de $u_n-{{eval:10*m;()}}$ est '
            'connu.',
        ],
        'Remplace $u_{n+1}$ par ${{eval:k/10;d}}u_n{{eval:m*(10-k);+}}$ et réduis ; pour le signe, '
        'compare $u_n$ à ${{eval:10*m}}$.',
    )


SPECS_F10 = [
    # (a) k = 8, m = 5, d = 10 : u₀ = 60, uₙ₊₁ = 0,8uₙ + 10, ℓ = 50
    spec('a : −0,2uₙ + 10, décroissante', 0, {'k': '8', 'm': '5', 'd': '10'}, 'correct',
         ['-0.2u_n+10', '0']),
    spec('a : ordre inversé', 0, {'k': '8', 'm': '5', 'd': '10'}, 'correct',
         ['10-0.2u_n', '0']),
    spec('a : factorisée', 0, {'k': '8', 'm': '5', 'd': '10'}, 'correct',
         ['-0.2(u_n-50)', '0']),
    spec('a : croissante choisie', 0, {'k': '8', 'm': '5', 'd': '10'}, 'incorrect',
         ['-0.2u_n+10', '1']),
    spec('a : tend vers −∞ choisi', 0, {'k': '8', 'm': '5', 'd': '10'}, 'incorrect',
         ['-0.2u_n+10', '2']),
    spec('a : uₙ₊₁ écrit', 0, {'k': '8', 'm': '5', 'd': '10'}, 'incorrect',
         ['0.8u_n+10', '0'], 'Tu as écrit $u_{n + 1}$ : il reste à lui soustraire $u_n$.'),
    spec('a : constante oubliée', 0, {'k': '8', 'm': '5', 'd': '10'}, 'incorrect',
         ['-0.2u_n', '0'], 'Tu as oublié le terme constant de la relation.'),
    spec('a : différence inversée', 0, {'k': '8', 'm': '5', 'd': '10'}, 'incorrect',
         ['0.2u_n-10', '0'],
         'Tu as calculé $u_n - u_{n + 1}$, l\'opposé de la différence demandée.'),
    # (b) k = 5, m = −2, d = 6 : u₀ = −26, uₙ₊₁ = 0,5uₙ − 10, ℓ = −20
    spec('b : −0,5uₙ − 10, croissante', 1, {'k': '5', 'm': '-2', 'd': '6'}, 'correct',
         ['-0.5u_n-10', '0']),
    spec('b : fraction', 1, {'k': '5', 'm': '-2', 'd': '6'}, 'correct',
         ['-\\frac{1}{2}u_n-10', '0']),
    spec('b : décroissante choisie', 1, {'k': '5', 'm': '-2', 'd': '6'}, 'incorrect',
         ['-0.5u_n-10', '1']),
    spec('b : uₙ₊₁ écrit', 1, {'k': '5', 'm': '-2', 'd': '6'}, 'incorrect',
         ['0.5u_n-10', '0'], 'Tu as écrit $u_{n + 1}$ : il reste à lui soustraire $u_n$.'),
    spec('b : différence inversée', 1, {'k': '5', 'm': '-2', 'd': '6'}, 'incorrect',
         ['0.5u_n+10', '0'],
         'Tu as calculé $u_n - u_{n + 1}$, l\'opposé de la différence demandée.'),
]

# =============================================================================================
# F11 — TSPE-392 (recherche de seuils) : « Seuil d'une suite récurrente en Python ». Code en bloc
# ```python comme bcc687bb. (a) choix de la condition du while (u <= S ; pièges : inégalité
# inversée, n au lieu de u, égalité). (b) uₙ₊₁ = 0,5uₙ + h, ℓ = 2h, u₀ = ℓ + 64 : termes exacts
# ℓ + 64/2ⁿ, tableau n = 0 à 6 affiché, la valeur renvoyée se lit sans calculatrice. Seuil
# S = ℓ + t, t strictement entre deux écarts consécutifs (jamais égal à un terme).
# =============================================================================================

F11_A = variation(
    'La suite $(u_n)$ est définie par $u_0={{u}}$ et, pour tout entier naturel $n$, '
    '$u_{n+1}={{eval:k/10;d}}u_n+{{b}}$ ; elle est croissante et tend vers $+\\infty$.\n\n'
    'La fonction Python ci-dessous doit renvoyer le premier rang $n$ tel que $u_n>S$.\n\n'
    + bloc('python', 'def seuil(S):', '    n = 0', '    u = {{u}}', '    while ...:',
           '        u = 1.{{eval:k-10}} * u + {{b}}', '        n = n + 1', '    return n')
    + '\n\nQue faut-il écrire à la place des points de suspension ?\n\n'
    + choix('`u <= S`', '`u > S`', '`n <= S`', '`u == S`'),
    [var('k', '11..15'), var('b', '4..20'), var('u', '1..20')],
    [case('0')],
    [
        'La boucle `while` répète son contenu **tant que** sa condition est vraie : elle doit '
        'continuer tant que le seuil n\'est pas dépassé, c\'est-à-dire tant que '
        '$u_n\\leqslant S$.',
        'Avec `u > S`, la boucle s\'arrête tout de suite (au départ, $u_0\\leqslant S$) ; '
        '`n <= S` compare le rang au seuil, pas le terme ; `u == S` est faux dès le départ.',
        'La condition est donc `u <= S`.',
    ],
    'La boucle `while` répète son contenu tant que sa condition est vraie : elle doit s\'arrêter '
    'au premier rang où $u_n>S$.',
)

TABLEAU_F11 = ('| $n$ | $0$ | $1$ | $2$ | $3$ | $4$ | $5$ | $6$ |\n'
               '|---|---|---|---|---|---|---|---|\n'
               '| $u_n$ | ' + ' | '.join('${{eval:2*h+' + str(64 // 2 ** i) + '}}$'
                                        for i in range(7)) + ' |')

F11_B = variation(
    'La suite $(u_n)$ est définie par $u_0={{eval:2*h+64}}$ et, pour tout entier naturel $n$, '
    '$u_{n+1}=0{,}5u_n+{{h}}$ ; elle est décroissante et converge vers ${{eval:2*h}}$. Voici ses '
    'premiers termes.\n\n' + TABLEAU_F11 + '\n\nOn considère la fonction Python suivante.\n\n'
    + bloc('python', 'def seuil(S):', '    n = 0', '    u = {{eval:2*h+64}}',
           '    while u >= S:', '        u = 0.5 * u + {{h}}', '        n = n + 1',
           '    return n')
    + '\n\nQue renvoie `seuil({{eval:2*h+t}})` ?\n\n$?$',
    [var('h', '5..15'), var('N', '2..5'), var('lo', 'eval:64/2^N+1'),
     var('hi', 'eval:64/2^(N-1)-1'), var('t', '{{lo}}..{{hi}}')],
    [case('{{N}}', [
        erreur('{{eval:N-1}}',
               'Tu as donné le dernier rang où $u_n \\geqslant {{eval:2*h+t}}$ : la fonction '
               'renvoie le premier rang où $u_n < {{eval:2*h+t}}$.', 'Rang précédent'),
        erreur('{{eval:N+1}}',
               'Tu as compté un tour de trop : $n$ vaut $0$ au départ, pour $u_0$.',
               'Un tour de trop'),
        erreur('{{eval:2*h+64/2^N}}',
               'La fonction renvoie `n`, le rang, pas la valeur du terme `u`.',
               'Terme au lieu du rang'),
    ])],
    [
        'La boucle continue tant que $u_n\\geqslant{{eval:2*h+t}}$ : la fonction renvoie le '
        'premier rang $n$ tel que $u_n<{{eval:2*h+t}}$.',
        'Dans le tableau, $u_{ {{eval:N-1}} }={{eval:2*h+64/2^(N-1)}}\\geqslant{{eval:2*h+t}}$ et '
        '$u_{ {{N}} }={{eval:2*h+64/2^N}}<{{eval:2*h+t}}$.',
        'La fonction renvoie $' + PRIMAIRE + '{{{N}}}$.',
    ],
    'La boucle s\'arrête dès que la condition `u >= S` devient fausse : cherche dans le tableau le '
    'premier terme strictement inférieur au seuil, et lis son rang.',
)

SPECS_F11 = [
    spec('a : u <= S', 0, {'k': '12', 'b': '5', 'u': '10'}, 'correct', ['0']),
    spec('a : inégalité inversée', 0, {'k': '12', 'b': '5', 'u': '10'}, 'incorrect', ['1']),
    spec('a : n au lieu de u', 0, {'k': '12', 'b': '5', 'u': '10'}, 'incorrect', ['2']),
    spec('a : égalité', 0, {'k': '12', 'b': '5', 'u': '10'}, 'incorrect', ['3']),
    # (b) h = 10 : ℓ = 20, termes 84, 52, 36, 28, 24, 22, 21 ; N = 3, t = 9..15, S = 30
    spec('b : rang 3 (S = 30)', 1, {'h': '10', 'N': '3', 'lo': '9', 'hi': '15', 't': '10'},
         'correct', ['3']),
    spec('b : rang précédent', 1, {'h': '10', 'N': '3', 'lo': '9', 'hi': '15', 't': '10'},
         'incorrect', ['2'],
         'Tu as donné le dernier rang où $u_n \\geqslant 30$ : la fonction renvoie le premier '
         'rang où $u_n < 30$.'),
    spec('b : un tour de trop', 1, {'h': '10', 'N': '3', 'lo': '9', 'hi': '15', 't': '10'},
         'incorrect', ['4'],
         'Tu as compté un tour de trop : $n$ vaut $0$ au départ, pour $u_0$.'),
    spec('b : terme au lieu du rang', 1,
         {'h': '10', 'N': '3', 'lo': '9', 'hi': '15', 't': '10'}, 'incorrect', ['28'],
         'La fonction renvoie `n`, le rang, pas la valeur du terme `u`.'),
    spec('b : rang 5 (S = 13)', 1, {'h': '5', 'N': '5', 'lo': '3', 'hi': '3', 't': '3'},
         'correct', ['5']),
]

# =============================================================================================
# F12 — TSPE-385 : « Vrai ou faux : propriétés des suites ». Pas de Vrai / Faux nu : l'élève
# choisit une réponse justifiée ; v0 à v3 : la bonne est « Faux » avec le contre-exemple de la
# fiche, les pièges : « Vrai » avec un faux argument (théorème mal cité), « Faux » avec un
# contre-exemple qui n'en est pas un. v4 et v5 : affirmations VRAIES (ajoutées sur décision de
# David du 2026-11-22, pour que la réponse ne soit pas toujours « Faux ») ; la bonne cite le
# théorème du cours, les pièges : un « Vrai » mal justifié, deux « Faux » dont le contre-exemple
# ne vérifie pas l'hypothèse.
# =============================================================================================

CONSIGNE_F12 = ('Cette affirmation est-elle vraie ou fausse ? Choisis la réponse correctement '
                'justifiée.\n\n')
HINT_F12 = ('Une affirmation sur « toute suite » est vraie si elle se démontre pour toutes les '
            'suites ; un seul contre-exemple la rend fausse, à condition qu\'il vérifie '
            'l\'hypothèse **sans** vérifier la conclusion. Vérifie aussi que le théorème cité est '
            'bien celui du cours.')


def f12(affirmation, options, steps):
    return variation(CONSIGNE_F12 + '« ' + affirmation + ' »\n\n' + choix(*options), [],
                     [case('0')], steps, HINT_F12)


F12_VARIATIONS = [
    f12('Toute suite bornée converge.', [
        'Faux : $u_n=(-1)^n$ est bornée (entre $-1$ et $1$) mais n\'a pas de limite',
        'Vrai : une suite bornée ne peut pas tendre vers l\'infini, donc elle converge',
        'Vrai : c\'est le théorème de convergence des suites monotones',
        'Faux : $u_n=n$ est bornée mais tend vers $+\\infty$',
    ], [
        'La suite $u_n=(-1)^n$ prend les valeurs $1$ et $-1$ : elle est bornée, mais elle n\'a pas '
        'de limite.',
        'L\'affirmation est donc $' + PRIMAIRE + '{\\text{fausse}}$. Le théorème demande une suite '
        '**monotone** et bornée ; $u_n=n$ n\'est pas bornée.',
    ]),
    f12('Toute suite croissante tend vers $+\\infty$.', [
        'Faux : $u_n=1-\\dfrac{1}{n+1}$ est croissante et converge vers $1$',
        'Vrai : ses termes augmentent, donc ils dépassent tout réel',
        'Vrai : c\'est le théorème « toute suite croissante tend vers $+\\infty$ »',
        'Faux : $u_n=-n$ est croissante et tend vers $-\\infty$',
    ], [
        'La suite $u_n=1-\\dfrac{1}{n+1}$ est croissante (on retire un nombre de plus en plus '
        'petit) et converge vers $1$.',
        'L\'affirmation est donc $' + PRIMAIRE + '{\\text{fausse}}$. Le théorème dit : toute suite '
        'croissante **non majorée** tend vers $+\\infty$ ; $u_n=-n$ est décroissante.',
    ]),
    f12('Une suite qui tend vers $+\\infty$ est croissante.', [
        'Faux : $u_n=n+2(-1)^n$ tend vers $+\\infty$ (car $u_n\\geqslant n-2$), mais $u_1<u_0$',
        'Vrai : si elle n\'était pas croissante, elle ne pourrait pas dépasser tout réel',
        'Vrai : c\'est la réciproque du théorème « toute suite croissante non majorée tend vers '
        '$+\\infty$ »',
        'Faux : $u_n=n^2$ tend vers $+\\infty$ mais n\'est pas croissante',
    ], [
        '$u_n=n+2(-1)^n\\geqslant n-2$, donc $u_n$ tend vers $+\\infty$ ; pourtant $u_0=2$ et '
        '$u_1=-1$ : la suite n\'est pas croissante.',
        'L\'affirmation est donc $' + PRIMAIRE + '{\\text{fausse}}$. La réciproque d\'un théorème '
        'n\'est pas un théorème ; et $u_n=n^2$ est croissante sur $\\mathbb{N}$.',
    ]),
    f12('Si $u_n\\leqslant v_n$ pour tout entier naturel $n$ et si $(v_n)$ converge, alors '
        '$(u_n)$ converge.', [
            'Faux : avec $u_n=-n$ et $v_n=0$, on a $u_n\\leqslant v_n$, $(v_n)$ converge, mais '
            '$(u_n)$ tend vers $-\\infty$',
            'Vrai : c\'est le théorème des gendarmes',
            'Vrai : $(u_n)$ est majorée par une suite convergente, donc elle converge',
            'Faux : avec $u_n=\\dfrac{1}{n+1}$ et $v_n=1$, $(u_n)$ ne converge pas',
        ], [
            'Avec $u_n=-n$ et $v_n=0$ : $u_n\\leqslant v_n$ et $(v_n)$ converge vers $0$, mais '
            '$(u_n)$ tend vers $-\\infty$.',
            'L\'affirmation est donc $' + PRIMAIRE + '{\\text{fausse}}$. Les gendarmes demandent '
            'un encadrement par **deux** suites de même limite ; une suite majorée ne converge '
            'pas forcément ; et $\\dfrac{1}{n+1}$ converge vers $0$.',
        ]),
    f12('Toute suite croissante et majorée converge.', [
        'Vrai : c\'est le théorème de convergence monotone (admis)',
        'Faux : $u_n=1-\\dfrac{1}{n+1}$ est croissante, majorée par $1$, mais ne converge pas',
        'Vrai : une suite majorée converge toujours',
        'Faux : $u_n=(-1)^n$ est majorée par $1$ mais n\'a pas de limite',
    ], [
        'Le cours l\'admet : toute suite croissante et majorée converge (vers un réel inférieur ou '
        'égal au majorant). L\'affirmation est donc $' + PRIMAIRE + '{\\text{vraie}}$.',
        '$u_n=1-\\dfrac{1}{n+1}$ converge vers $1$ ; $u_n=(-1)^n$ n\'est pas croissante ; et une '
        'suite seulement majorée peut ne pas converger, comme $(-1)^n$ ou $-n$.',
    ]),
    f12('Si $u_n\\geqslant v_n$ pour tout entier naturel $n$ et si $(v_n)$ tend vers $+\\infty$, '
        'alors $(u_n)$ tend vers $+\\infty$.', [
            'Vrai : c\'est un théorème de comparaison du cours',
            'Faux : avec $v_n=n$ et $u_n=-n$, la suite $(u_n)$ tend vers $-\\infty$',
            'Vrai : c\'est le théorème des gendarmes',
            'Faux : avec $v_n=n$ et $u_n=n+(-1)^n$, la suite $(u_n)$ n\'a pas de limite',
        ], [
            'Théorème de comparaison : si $u_n\\geqslant v_n$ à partir d\'un certain rang et si '
            '$(v_n)$ tend vers $+\\infty$, alors $(u_n)$ tend vers $+\\infty$. L\'affirmation '
            'est donc $' + PRIMAIRE + '{\\text{vraie}}$.',
            'Avec $u_n=-n$, l\'hypothèse $u_n\\geqslant v_n$ est fausse ; $n+(-1)^n\\geqslant n-1$ '
            'tend vers $+\\infty$ ; et les gendarmes demandent un encadrement par deux suites de '
            'même limite finie.',
        ]),
]
SPECS_F12 = []
for i, nom in enumerate(['bornée', 'croissante', 'tend vers +∞', 'comparaison']):
    SPECS_F12.append(spec(f'v{i} ({nom}) : faux, bon contre-exemple', i, {}, 'correct', ['0']))
    SPECS_F12.append(spec(f'v{i} ({nom}) : vrai, faux argument', i, {}, 'incorrect', ['1']))
    SPECS_F12.append(spec(f'v{i} ({nom}) : faux contre-exemple', i, {}, 'incorrect', ['3']))
for i, nom in [(4, 'croissante majorée'), (5, 'comparaison +∞')]:
    SPECS_F12.append(spec(f'v{i} ({nom}) : vrai, théorème du cours', i, {}, 'correct', ['0']))
    SPECS_F12.append(spec(f'v{i} ({nom}) : faux, contre-exemple hors hypothèse', i, {}, 'incorrect', ['1']))
    SPECS_F12.append(spec(f'v{i} ({nom}) : vrai, faux argument', i, {}, 'incorrect', ['2']))
    SPECS_F12.append(spec(f'v{i} ({nom}) : faux, contre-exemple qui n\'en est pas un', i, {}, 'incorrect', ['3']))

# =============================================================================================
# F14 bis — TSPE-577 (limite par les opérations) : « Moyenne des premiers termes d'une suite
# arithmético-géométrique ». uₙ = ℓ + c·qⁿ, Sₙ = u₀ + … + uₙ₋₁ = nℓ + c(1 − qⁿ)/(1 − q),
# Sₙ/n → ℓ. Case 1 : toute écriture équivalente (`form: off`). Variations fixées à l'écriture :
# (a) q = 1/2 (coefficient 2c) ; (b) q = k/10, k de 5 à 9, c = j(10 − k) pour un coefficient
# entier 10j, c ≠ ±1. ℓ de 2 à 9 en valeur absolue (pas de « 1n »).
# =============================================================================================


def f14(q_texte, q_attendu, variables, coef, coef_oubli, conditions):
    s_n = '{{l}}n' + coef + '\\left(1-' + q_attendu + '^{n}\\right)'
    return variation(
        'La suite $(u_n)$ est définie, pour tout entier naturel $n$, par '
        '$u_n={{l}}' + '{{c;+}}' + '\\times' + q_texte + '^{n}$. Pour tout entier $n\\geqslant1$, '
        'on note $S_n=u_0+u_1+\\cdots+u_{n-1}$ (somme des $n$ premiers termes).\n\n'
        '1. Exprime $S_n$ en fonction de $n$.\n\n$S_n=?$\n\n'
        '2. Détermine la limite de $\\dfrac{S_n}{n}$ quand $n$ tend vers $+\\infty$.\n\n'
        '$\\lim\\limits_{n\\to+\\infty}\\dfrac{S_n}{n}=?$',
        variables,
        [case(s_n, [
            erreur('{{l}}(n+1)' + coef + '\\left(1-' + q_attendu + '^{n+1}\\right)',
                   '$S_n$ compte $n$ termes, de $u_0$ à $u_{n - 1}$ : tu en as pris un de trop.',
                   'Un terme de trop'),
            erreur('{{l}}' + coef + '\\left(1-' + q_attendu + '^{n}\\right)',
                   'Chacun des $n$ termes contient ${{l}}$ : ce nombre compte $n$ fois dans la '
                   'somme.', 'ℓ compté une fois'),
            erreur('{{l}}n' + coef_oubli + '\\left(1-' + q_attendu + '^{n}\\right)',
                   'Dans la somme géométrique, tu as oublié de diviser par $1 - q$.',
                   'Division par 1 − q oubliée'),
        ]), case('{{l}}', [
            erreur('{{if:l>0|+\\infty|-\\infty}}',
                   'C\'est la limite de $S_n$ ; on demande celle de $\\frac{S_n}{n}$.',
                   'Limite de Sₙ'),
            erreur('0', 'Le terme ${{l}}$ de $\\frac{S_n}{n}$ ne dépend pas de $n$ : il ne tend '
                   'pas vers $0$.', 'Tout tend vers 0'),
            erreur(coef.replace(';+}}', '}}'),
                   'Tu as donné la limite de la partie géométrique de $S_n$, pas celle de '
                   '$\\frac{S_n}{n}$.', 'Limite de la partie géométrique'),
        ])],
        [
            '$S_n=\\underbrace{ {{l;()}}+\\cdots+{{l;()}} }_{n\\text{ fois}}{{c;+}}\\left(1+' + q_texte
            + '+\\cdots+' + q_texte + '^{n-1}\\right)={{l}}n{{c;+}}\\times\\dfrac{1-' + q_texte
            + '^{n}}{1-' + q_texte + '}$.',
            'Donc $S_n=' + PRIMAIRE + '{ ' + s_n + ' }$.',
            '$\\dfrac{S_n}{n}={{l}}' + coef + '\\times\\dfrac{1-' + q_texte + '^{n}}{n}$ ; comme '
            '$0<1-' + q_texte + '^{n}<1$, ce quotient tend vers $0$.',
            'Donc $\\lim\\limits_{n\\to+\\infty}\\dfrac{S_n}{n}=' + PRIMAIRE + '{{{l}}}$ : la '
            'moyenne des premiers termes tend vers la limite de la suite.',
        ],
        'Sépare $S_n$ en deux sommes : $n$ fois le nombre ${{l}}$, et ${{c}}$ fois la somme '
        'géométrique $1+q+\\cdots+q^{n-1}$, avec $q='
        + q_texte.replace('\\left(', '').replace('\\right)', '') + '$.',
        conditions,
    )


F14_A = f14('\\left(\\dfrac{1}{2}\\right)', '\\left(\\frac{1}{2}\\right)',
            [var('l', '2..9;±'), var('c', '2..9;±')], '{{eval:2*c;+}}', '{{c;+}}',
            ['2*c != l'])
F14_B = f14('{{eval:k/10;d}}', '{{eval:k/10;d}}',
            [var('k', '5..9'), var('j', '1..5;±'), var('l', '2..9;±'),
             var('c', 'eval:j*(10-k)')], '{{eval:10*j;+}}', '{{c;+}}', ['c != 1', 'c != -1'])

SPECS_F14 = [
    # (a) ℓ = 3, c = 4 : Sₙ = 3n + 8(1 − (1/2)ⁿ), limite 3
    spec('a : juste', 0, {'l': '3', 'c': '4'}, 'correct',
         ['3n+8\\left(1-\\left(\\frac{1}{2}\\right)^{n}\\right)', '3']),
    spec('a : 0,5ⁿ développé', 0, {'l': '3', 'c': '4'}, 'correct',
         ['3n+8-8\\times0.5^{n}', '3']),
    spec('a : quotient de la formule, × devant la fraction perfectible', 0, {'l': '3', 'c': '4'}, 'unoptimal_form',
         ['3n+4\\times\\frac{1-\\frac{1}{2^n}}{1-\\frac{1}{2}}', '3'], violations=['products']),
    spec('a : un terme de trop', 0, {'l': '3', 'c': '4'}, 'incorrect',
         ['3(n+1)+8\\left(1-\\left(\\frac{1}{2}\\right)^{n+1}\\right)', '3'],
         '$S_n$ compte $n$ termes, de $u_0$ à $u_{n - 1}$ : tu en as pris un de trop.'),
    spec('a : ℓ une fois', 0, {'l': '3', 'c': '4'}, 'incorrect',
         ['3+8\\left(1-\\left(\\frac{1}{2}\\right)^{n}\\right)', '3'],
         'Chacun des $n$ termes contient $3$ : ce nombre compte $n$ fois dans la somme.'),
    spec('a : division oubliée', 0, {'l': '3', 'c': '4'}, 'incorrect',
         ['3n+4\\left(1-\\left(\\frac{1}{2}\\right)^{n}\\right)', '3'],
         'Dans la somme géométrique, tu as oublié de diviser par $1 - q$.'),
    spec('a : limite de Sₙ', 0, {'l': '3', 'c': '4'}, 'incorrect',
         ['3n+8\\left(1-\\left(\\frac{1}{2}\\right)^{n}\\right)', '+\\infty'],
         'C\'est la limite de $S_n$ ; on demande celle de $\\frac{S_n}{n}$.'),
    spec('a : tout tend vers 0', 0, {'l': '3', 'c': '4'}, 'incorrect',
         ['3n+8\\left(1-\\left(\\frac{1}{2}\\right)^{n}\\right)', '0'],
         'Le terme $3$ de $\\frac{S_n}{n}$ ne dépend pas de $n$ : il ne tend pas vers $0$.'),
    spec('a : partie géométrique', 0, {'l': '3', 'c': '4'}, 'incorrect',
         ['3n+8\\left(1-\\left(\\frac{1}{2}\\right)^{n}\\right)', '8'],
         'Tu as donné la limite de la partie géométrique de $S_n$, pas celle de '
         '$\\frac{S_n}{n}$.'),
    # (b) k = 8, j = 2, ℓ = −5, c = 4 : Sₙ = −5n + 20(1 − 0,8ⁿ), limite −5
    spec('b : juste', 1, {'k': '8', 'j': '2', 'l': '-5', 'c': '4'}, 'correct',
         ['-5n+20\\left(1-0.8^{n}\\right)', '-5']),
    spec('b : développé', 1, {'k': '8', 'j': '2', 'l': '-5', 'c': '4'}, 'correct',
         ['20-5n-20\\times0.8^{n}', '-5']),
    spec('b : division oubliée', 1, {'k': '8', 'j': '2', 'l': '-5', 'c': '4'}, 'incorrect',
         ['-5n+4\\left(1-0.8^{n}\\right)', '-5'],
         'Dans la somme géométrique, tu as oublié de diviser par $1 - q$.'),
    spec('b : limite de Sₙ (−∞)', 1, {'k': '8', 'j': '2', 'l': '-5', 'c': '4'}, 'incorrect',
         ['-5n+20\\left(1-0.8^{n}\\right)', '-\\infty'],
         'C\'est la limite de $S_n$ ; on demande celle de $\\frac{S_n}{n}$.'),
]

MODELES = {
    # F9 · TSPE-386
    'f09-recurrence-forme-explicite': modele(
        'Démontrer une forme explicite par récurrence : l\'hérédité',
        'Hérédité d\'une formule explicite : uₖ₊₁ sous la forme de la formule au rang k + 1 '
        '(arithmético-géométrique, uₙ₊₁ = uₙ/(buₙ + 1)), forme imposée ; vₙ = 1/uₙ arithmétique',
        3, 60, [F9_A, F9_B, F9_C], SPECS_F9),
    # F10 · TSPE-385
    'f10-sens-variation-arithmetico-geometrique': modele(
        'Sens de variation d\'une suite arithmético-géométrique',
        'uₙ₊₁ − uₙ en fonction de uₙ, puis sens de variation et convergence sachant uₙ ⩾ ℓ ou '
        'uₙ ⩽ ℓ (a = k/10)',
        2, 60, [f10(True), f10(False)], SPECS_F10, options={'constraints': {'form': 'off'}}),
    # F11 · TSPE-392
    'f11-seuil-suite-recurrente-python': modele(
        'Seuil d\'une suite récurrente en Python',
        'Fonction seuil(S) avec une boucle while : condition à choisir (suite croissante), '
        'valeur renvoyée lue dans un tableau de termes (suite décroissante vers ℓ)',
        2, 60, [F11_A, F11_B], SPECS_F11),
    # F12 · TSPE-385
    'f12-vrai-faux-proprietes-suites': modele(
        'Vrai ou faux : propriétés des suites',
        'Choisir la réponse justifiée : bornée ⇏ convergente, croissante ⇏ +∞, +∞ ⇏ croissante, '
        'majorée par une suite convergente ⇏ convergente',
        2, 60, F12_VARIATIONS, SPECS_F12),
    # F14 bis · TSPE-577
    'f14bis-moyenne-termes-arithmetico-geometrique': modele(
        'Moyenne des premiers termes d\'une suite arithmético-géométrique',
        'uₙ = ℓ + c·qⁿ : Sₙ = u₀ + … + uₙ₋₁ en fonction de n (somme géométrique), puis limite '
        'de Sₙ/n (q = 1/2, q = k/10)',
        3, 60, [F14_A, F14_B], SPECS_F14, options={'constraints': {'form': 'off'}}),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
