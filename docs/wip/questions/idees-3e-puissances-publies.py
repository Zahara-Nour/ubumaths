"""Ajoute les variations validées aux modèles publiés exportés de prod dans
scripts/questions/idees-3e-puissances-publies/ (chantier idees-3e-puissances).

Phase 0 validée par David le 2026-11-25 (« je valide » : toutes les recommandations ; fiches
docs/wip/idees-3e-puissances-fiches.md) :
- 15368b02 (3-004) : F1 (V2 calculer a⁻ⁿ en fraction, V3 a⁰) et F2 (V4 1/(a × … × a) → a⁻ⁿ) ;
- bb9cff7b (3-005) et 18761148 (3-052) : F3, base négative ;
- 3fe98dd9 (4e, 4-015) : F4, (−a)ⁿ et −aⁿ écrits en produit ; Q1 : 3 × 3 × 3 × 3 refusé pour
  (−3)⁴.

Les variations s'ajoutent À LA FIN (les réponses des élèves gardent l'indice de leur variation) ;
la migration de contenu est générée par scripts/questions/migration-contenu.ts. Seuls `variations`
et `testSpecs` changent : les options restent celles de la prod.

Le script repart du contenu de prod (variations et specs d'origine, comptées dans ORIGINE) : le
relancer réécrit les ajouts sans les doubler.

Pièges du lot :
- La forme est jugée en mode exact (contrainte `form`, stricte par défaut) : 1/2³ pour 1/8, 1/5³
  pour 5⁻³, 3 × 3 × 3 × 3 pour (−3)⁴ ont la bonne valeur mais pas la forme demandée → `bad_form`.
  C'est ainsi que Q1 est tenue : une erreur prévue de même valeur que la réponse serait ignorée
  (couvrir-un-niveau.md § 5), le refus vient de la forme, avec le message de forme ordinaire.
- Base négative (F3) : la base est écrite dans l'énoncé, l'élève tape l'exposant
  ((−3)^{?}) ; (−3)⁶ ou 3⁶ ne se posent donc pas.
- 3fe98dd9 a une variable partagée `a` (lettres ou entiers) : les variations ajoutées prennent
  `k`, un entier de 2 à 9.

Usage : python3 docs/wip/questions/idees-3e-puissances-publies.py scripts/questions/idees-3e-puissances-publies
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
SECOND = '\\textcolor{{{color:primary.1}}}'

# id court → (variations, specs) d'origine en prod (export du 2026-11-25)
ORIGINE = {'15368b02': (1, 5), 'bb9cff7b': (1, 4), '18761148': (1, 4), '3fe98dd9': (6, 10)}
NOMS = {
    '15368b02': '15368b02', 'bb9cff7b': 'bb9cff7b', '18761148': '18761148', '3fe98dd9': '3fe98dd9',
}


def spec(desc, vi, variables_, status, answers, message=None, violations=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = message
    if violations is not None:
        expected['constraintViolations'] = violations
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


def couleur(contenu, c=PRIMAIRE):
    return c + '{' + contenu + '}'


def produit(facteur, sep='\\times'):
    """facteur répété n fois (n de 2 à 5, variable `n`), séparé par `sep`."""
    def rep(k):
        return sep.join([facteur] * k)
    return ('{{if:n==2|' + rep(2) + '|{{if:n==3|' + rep(3) + '|{{if:n==4|' + rep(4) + '|'
            + rep(5) + '}}}}}}')


def ajouter(court, variations, specs, contraintes=None):
    chemin = os.path.join(DOSSIER, NOMS[court] + '.json')
    with open(chemin, encoding='utf-8') as f:
        m = json.load(f)
    if contraintes:
        m['options']['constraints'].update(contraintes)
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


# =============================================================================================
# 15368b02 — 3-004, définition de a⁻ⁿ. F1 : calculer a⁻ⁿ (fraction) et a⁰ ; F2 : 1/(a×…×a) → a⁻ⁿ.
# =============================================================================================

MSG_SIGNE = ('Un exposant négatif ne rend pas le nombre négatif : il donne l’inverse de la '
             'puissance.')
MSG_FOIS = ('Tu as multiplié la base par l’exposant : l’exposant compte les facteurs égaux à la '
            'base.')

F1_A = variation(
    'Calcule. Donne le résultat sous la forme d’une fraction, sans puissance.\n\n'
    '$${{a}}^{-{{n}}} = ?$$',
    [var('a', '2..10'), var('n', '2..4'), var('q', 'eval:a^n')],
    [case('\\dfrac{1}{ {{q}} }', [
        erreur('-{{q}}', MSG_SIGNE, 'Puissance rendue négative'),
        erreur('-{{eval:a*n}}', MSG_FOIS + ' ' + MSG_SIGNE, 'Base × exposant, et signe moins'),
        erreur('\\dfrac{1}{ {{eval:a*n}} }', MSG_FOIS, 'Base × exposant'),
    ])],
    [
        '**Exposant négatif.** Pour $a \\neq 0$ : $a^{-n} = \\dfrac{1}{a^n}$.',
        '$${{a}}^{' + couleur('-{{n}}') + '} = \\dfrac{1}{ {{a}}^{' + couleur('{{n}}', SECOND)
        + '} } = \\dfrac{1}{ ' + '{{if:n==2|{{a}}\\times{{a}}|{{if:n==3|{{a}}\\times{{a}}\\times{{a}}|'
        '{{a}}\\times{{a}}\\times{{a}}\\times{{a}}}}}}' + ' } = ' + couleur('\\dfrac{1}{ {{q}} }')
        + '$$',
    ],
    '$a^{-n}$ est l’inverse de $a^n$ : calcule d’abord $a^n$.',
    ['q<=1000'],
)

F1_B = variation(
    'Calcule.\n\n$${{if:s==1|(-{{a}})|{{a}}}}^{0} = ?$$',
    [var('s', '0|1'), var('a', '2..15')],
    [case('1', [
        erreur('0', 'Un exposant nul ne donne pas zéro : tout nombre non nul élevé à la puissance '
               '$0$ vaut $1$.', 'Zéro'),
        erreur('{{if:s==1|-{{a}}|{{a}}}}', 'L’exposant $0$ ne laisse pas la base telle quelle : '
               'tout nombre non nul élevé à la puissance $0$ vaut $1$.', 'La base recopiée'),
        erreur('-1', 'Le résultat ne dépend pas du signe de la base : tout nombre non nul élevé à '
               'la puissance $0$ vaut $1$.', 'Moins un'),
    ])],
    [
        '**Exposant nul.** Pour $a \\neq 0$ : $a^0 = 1$. On le retrouve avec un quotient : '
        '$\\dfrac{a^3}{a^3} = 1$ et $\\dfrac{a^3}{a^3} = a^{3-3} = a^0$.',
        '$${{if:s==1|(-{{a}})|{{a}}}}^{0} = ' + couleur('1') + '$$',
    ],
    'Calcule $\\dfrac{a^3}{a^3}$ de deux façons : en simplifiant, puis avec la règle des '
    'exposants.',
)

F2 = variation(
    'Écris sous la forme d’une seule puissance.\n\n$$\\dfrac{1}{' + produit('{{a}}') + '} = ?$$',
    [var('a', '2..9'), var('n', '2..5')],
    [case('{{a}}^{-{{n}}}', [
        erreur('{{a}}^{ {{n}} }', 'Tu as oublié le signe moins : le produit est au dénominateur, '
               'c’est un inverse.', 'Signe moins oublié'),
        erreur('-{{a}}^{ {{n}} }', 'Le signe moins va sur l’exposant, pas devant la puissance : '
               'ce nombre est positif.', 'Moins devant la puissance'),
    ])],
    [
        'Le dénominateur compte ' + couleur('{{n}}', SECOND) + ' facteurs égaux à ${{a}}$ : '
        'c’est ${{a}}^{ {{n}} }$.',
        '**Exposant négatif.** $\\dfrac{1}{a^n} = a^{-n}$.',
        '$$\\dfrac{1}{' + produit('{{a}}') + '} = \\dfrac{1}{ {{a}}^{' + couleur('{{n}}', SECOND)
        + '} } = ' + couleur('{{a}}^{-{{n}}}') + '$$',
    ],
    'Compte les facteurs du dénominateur, puis pense à l’inverse d’une puissance.',
)

V8 = {'a': '2', 'n': '3'}
V5 = {'a': '5', 'n': '3'}
SPECS_153 = [
    spec('F1 : 2^-3 → 1/8', 0, V8, 'correct', ['\\frac{1}{8}']),
    spec('F1 : 1/2^3, puissance gardée', 0, V8, 'bad_form', ['\\frac{1}{2^3}'],
         violations=['form']),
    spec('F1 : -8', 0, V8, 'incorrect', ['-8'], MSG_SIGNE),
    spec('F1 : -6', 0, V8, 'incorrect', ['-6'], MSG_FOIS + ' ' + MSG_SIGNE),
    spec('F1 : 1/6', 0, V8, 'incorrect', ['\\frac{1}{6}'], MSG_FOIS),
    spec('F1 : 10^-3 → 1/1000', 0, {'a': '10', 'n': '3'}, 'correct', ['\\frac{1}{1000}']),
    spec('F1 : 9^-2 → 1/81', 0, {'a': '9', 'n': '2'}, 'correct', ['\\frac{1}{81}']),
    spec('F1b : 7^0 → 1', 1, {'s': '0', 'a': '7'}, 'correct', ['1']),
    spec('F1b : (-12)^0 → 1', 1, {'s': '1', 'a': '12'}, 'correct', ['1']),
    spec('F1b : 0', 1, {'s': '0', 'a': '7'}, 'incorrect', ['0'],
         'Un exposant nul ne donne pas zéro : tout nombre non nul élevé à la puissance $0$ vaut '
         '$1$.'),
    spec('F1b : la base recopiée', 1, {'s': '0', 'a': '7'}, 'incorrect', ['7'],
         'L’exposant $0$ ne laisse pas la base telle quelle : tout nombre non nul élevé à la '
         'puissance $0$ vaut $1$.'),
    spec('F1b : -1 pour (-12)^0', 1, {'s': '1', 'a': '12'}, 'incorrect', ['-1'],
         'Le résultat ne dépend pas du signe de la base : tout nombre non nul élevé à la '
         'puissance $0$ vaut $1$.'),
    spec('F2 : 1/(5×5×5) → 5^-3', 2, V5, 'correct', ['5^{-3}']),
    spec('F2 : 1/5^3, pas une seule puissance', 2, V5, 'bad_form', ['\\frac{1}{5^3}'],
         violations=['form']),
    spec('F2 : 1/125', 2, V5, 'bad_form', ['\\frac{1}{125}'], violations=['form']),
    spec('F2 : 5^3', 2, V5, 'incorrect', ['5^3'],
         'Tu as oublié le signe moins : le produit est au dénominateur, c’est un inverse.'),
    spec('F2 : -5^3', 2, V5, 'incorrect', ['-5^3'],
         'Le signe moins va sur l’exposant, pas devant la puissance : ce nombre est positif.'),
    spec('F2 : 1/(3×3) → 3^-2', 2, {'a': '3', 'n': '2'}, 'correct', ['3^{-2}']),
]

ajouter('15368b02', [F1_A, F1_B, F2], SPECS_153)


# =============================================================================================
# bb9cff7b (3-005) et 18761148 (3-052) — F3 : base négative. La base est écrite, l'élève tape
# l'exposant.
# =============================================================================================

BASE = '(-{{a}})'


def p(e):
    return BASE + '^{ ' + e + ' }'


MSG_P_FOIS = ('Tu as multiplié les exposants : dans un produit de puissances de même base, on les '
              'additionne.')
MSG_P_MOINS = ('Tu as soustrait les exposants : c’est la règle du quotient ; pour un produit, on '
               'les additionne.')
MSG_SIGNES = 'Attention aux exposants négatifs : garde leur signe dans le calcul.'

F3_P = variation(
    'Calcule en écrivant le résultat sous la forme d’une puissance de $(-{{a}})$.\n\n'
    '$$' + p('{{b}}') + ' \\times ' + p('{{c}}') + ' = ' + BASE + '^{?}$$',
    [var('a', '2..9'), var('b', '2..6;±'), var('c', '2..6;±')],
    [case('{{eval:b+(c)}}', [
        erreur('{{eval:b*(c)}}', MSG_P_FOIS, 'Exposants multipliés'),
        erreur('{{eval:b-(c)}}', MSG_P_MOINS, 'Exposants soustraits'),
        erreur('{{eval:abs(b)+abs(c)}}', MSG_SIGNES, 'Signes des exposants oubliés'),
    ])],
    [
        '**Produit de puissances d’un même nombre.** $a^m \\times a^n = a^{m+n}$, même quand la '
        'base est négative.',
        '$$' + p(couleur('{{b}}')) + ' \\times ' + p(couleur('{{c}}', SECOND)) + ' = '
        + p('{{b}} {{eval:c;+}}') + ' = ' + couleur(p('{{eval:b+(c)}}')) + '$$',
    ],
    'La base est la même dans les deux puissances, $(-{{a}})$ : compte les facteurs.',
    ['abs(b+(c))>1'],
)

F3_Q = variation(
    'Calcule en écrivant le résultat sous la forme d’une puissance de $(-{{a}})$.\n\n'
    '$$\\dfrac{' + p('{{b}}') + '}{' + p('{{c}}') + '} = ' + BASE + '^{?}$$',
    [var('a', '2..9'), var('b', '2..6;±'), var('c', '2..6;±')],
    [case('{{eval:b-(c)}}', [
        erreur('{{eval:b+(c)}}', 'Tu as additionné les exposants : pour un quotient, on retranche '
               'l’exposant du dénominateur.', 'Exposants additionnés'),
        erreur('{{eval:c-(b)}}', 'Tu as soustrait dans le mauvais sens : exposant du numérateur '
               'moins exposant du dénominateur.', 'Soustraction à l’envers'),
        erreur('{{eval:abs(b)-abs(c)}}', MSG_SIGNES, 'Signes des exposants oubliés'),
    ])],
    [
        '**Quotient de puissances d’un même nombre.** $\\dfrac{a^m}{a^n} = a^{m-n}$, même quand la '
        'base est négative.',
        '$$\\dfrac{' + p(couleur('{{b}}')) + '}{' + p(couleur('{{c}}', SECOND)) + '} = '
        + p('{{b}} {{eval:-(c);+}}') + ' = ' + couleur(p('{{eval:b-(c)}}')) + '$$',
    ],
    'La base est la même en haut et en bas, $(-{{a}})$ : les facteurs du dénominateur se '
    'simplifient avec ceux du numérateur.',
    ['abs(b-(c))>1'],
)

SPECS_BB = [
    spec('F3 : (-3)^4 × (-3)^-6 → -2', 0, {'a': '3', 'b': '4', 'c': '-6'}, 'correct', ['-2']),
    spec('F3 : (-7)^5 × (-7)^3 → 8', 0, {'a': '7', 'b': '5', 'c': '3'}, 'correct', ['8']),
    spec('F3 : exposants multipliés', 0, {'a': '7', 'b': '5', 'c': '3'}, 'incorrect', ['15'],
         MSG_P_FOIS),
    spec('F3 : exposants soustraits', 0, {'a': '7', 'b': '5', 'c': '3'}, 'incorrect', ['2'],
         MSG_P_MOINS),
    spec('F3 : (-3)^-4 × (-3)^6 → 2', 0, {'a': '3', 'b': '-4', 'c': '6'}, 'correct', ['2']),
    spec('F3 : signes oubliés', 0, {'a': '3', 'b': '-4', 'c': '6'}, 'incorrect', ['10'],
         MSG_SIGNES),
]

SPECS_187 = [
    spec('F3 : (-2)^3 / (-2)^-4 → 7', 0, {'a': '2', 'b': '3', 'c': '-4'}, 'correct', ['7']),
    spec('F3 : (-5)^2 / (-5)^6 → -4', 0, {'a': '5', 'b': '2', 'c': '6'}, 'correct', ['-4']),
    spec('F3 : exposants additionnés', 0, {'a': '5', 'b': '2', 'c': '6'}, 'incorrect', ['8'],
         'Tu as additionné les exposants : pour un quotient, on retranche l’exposant du '
         'dénominateur.'),
    spec('F3 : à l’envers', 0, {'a': '5', 'b': '2', 'c': '6'}, 'incorrect', ['4'],
         'Tu as soustrait dans le mauvais sens : exposant du numérateur moins exposant du '
         'dénominateur.'),
    spec('F3 : (-2)^-3 / (-2)^4 → -7', 0, {'a': '2', 'b': '-3', 'c': '4'}, 'correct', ['-7']),
    spec('F3 : signes oubliés', 0, {'a': '2', 'b': '-3', 'c': '4'}, 'incorrect', ['-1'],
         MSG_SIGNES),
]

ajouter('bb9cff7b', [F3_P], SPECS_BB)
ajouter('18761148', [F3_Q], SPECS_187)


# =============================================================================================
# 3fe98dd9 — 4-015 (4e). F4 : (−k)ⁿ et −kⁿ écrits en produit, k de 2 à 9, n de 2 à 5.
# =============================================================================================

MSG_FOIS_4 = 'L’exposant ne multiplie pas la base : il compte les facteurs égaux à la base.'

# Q1 : (−k)ⁿ s'écrit avec n facteurs négatifs. Le juge range les signes avant de comparer les
# formes ((−3)×(−3)×(−3)×(−3) et 3×3×3×3 y sont la même forme) : un motif exige n facteurs
# négatifs ; la valeur, jugée à part, fait le reste.
_JOKERS = ['p', 'q', 'r', 's', 't']
MOTIF_NEGATIFS = ('{{if:n==2|' + ' * '.join(j + ':negative' for j in _JOKERS[:2])
                  + '|{{if:n==3|' + ' * '.join(j + ':negative' for j in _JOKERS[:3])
                  + '|{{if:n==4|' + ' * '.join(j + ':negative' for j in _JOKERS[:4])
                  + '|' + ' * '.join(j + ':negative' for j in _JOKERS) + '}}}}}}')

F4_PAR = variation(
    'Réécris cette expression à l’aide de la définition d’une puissance, avec des $\\times$.\n\n'
    '$$(-{{k}})^{ {{n}} } = ?$$',
    # Le motif passe par une variable : un {{if:}} écrit dans requiredForm n'est pas résolu.
    [var('k', '2..9'), var('n', '2..5'), var('motif', MOTIF_NEGATIFS)],
    [{**case(produit('(-{{k}})', '*'), [
        erreur('-' + produit('{{k}}', '*'), 'Les parenthèses disent que toute la base, signe '
               'compris, est répétée : chaque facteur est négatif.', 'Signe sorti des parenthèses'),
        erreur('(-{{k}})*{{n}}', MSG_FOIS_4, 'Base × exposant'),
    ]), 'requiredForm': {'pattern': '{{motif}}'}}],
    [
        '**Définition d’une puissance.** $a^n = a \\times a \\times \\cdots \\times a$ ($n$ '
        'facteurs). Les parenthèses disent ce qui est répété : ici, toute la base $(-{{k}})$.',
        '$$' + couleur('(-{{k}})') + '^{' + couleur('{{n}}', SECOND) + '} = '
        + produit('(-{{k}})') + '$$',
    ],
    'Regarde les parenthèses : elles disent ce qui est élevé à la puissance.',
)

F4_SANS = variation(
    'Réécris cette expression à l’aide de la définition d’une puissance, avec des $\\times$.\n\n'
    '$$-{{k}}^{ {{n}} } = ?$$',
    [var('k', '2..9'), var('n', '2..5')],
    [case('-' + produit('{{k}}', '*'), [
        erreur(produit('(-{{k}})', '*'), 'Sans parenthèses, la puissance ne porte que sur le '
               'nombre : le signe moins reste devant, une seule fois.', 'Signe répété'),
        erreur('-{{k}}*{{n}}', MSG_FOIS_4, 'Base × exposant'),
    ])],
    [
        '**Définition d’une puissance.** $a^n = a \\times a \\times \\cdots \\times a$ ($n$ '
        'facteurs). Sans parenthèses, l’exposant ne porte que sur ${{k}}$ : $-{{k}}^{ {{n}} }$ est '
        'l’opposé de ${{k}}^{ {{n}} }$.',
        '$$-' + couleur('{{k}}') + '^{' + couleur('{{n}}', SECOND) + '} = -' + produit('{{k}}')
        + '$$',
    ],
    'Regarde les parenthèses : sans elles, sur quoi porte l’exposant ?',
)

SPECS_3FE = [
    spec('F4 : (-3)^4', 0, {'k': '3', 'n': '4'}, 'correct',
         ['(-3)\\times(-3)\\times(-3)\\times(-3)']),
    spec('F4 : (-3)^4, Q1 : 3×3×3×3 refusé (même valeur, base -3)', 0, {'k': '3', 'n': '4'},
         'bad_form', ['3\\times3\\times3\\times3'], violations=['form']),
    spec('F4 : (-3)^4, signe sorti', 0, {'k': '3', 'n': '4'}, 'incorrect',
         ['-3\\times3\\times3\\times3'],
         'Les parenthèses disent que toute la base, signe compris, est répétée : chaque facteur '
         'est négatif.'),
    spec('F4 : (-3)^4, base × exposant', 0, {'k': '3', 'n': '4'}, 'incorrect', ['(-3)\\times4'],
         MSG_FOIS_4),
    spec('F4 : (-2)^3', 0, {'k': '2', 'n': '3'}, 'correct', ['(-2)\\times(-2)\\times(-2)']),
    spec('F4 : (-2)^3, -2×2×2 : même valeur, autre forme', 0, {'k': '2', 'n': '3'}, 'bad_form',
         ['-2\\times2\\times2'], violations=['form']),
    spec('F4 : -5^2', 1, {'k': '5', 'n': '2'}, 'correct', ['-5\\times5']),
    spec('F4 : -5^2, signe répété', 1, {'k': '5', 'n': '2'}, 'incorrect', ['(-5)\\times(-5)'],
         'Sans parenthèses, la puissance ne porte que sur le nombre : le signe moins reste devant, '
         'une seule fois.'),
    spec('F4 : -5^2, base × exposant', 1, {'k': '5', 'n': '2'}, 'incorrect', ['-5\\times2'],
         MSG_FOIS_4),
    spec('F4 : -4^5', 1, {'k': '4', 'n': '5'}, 'correct', ['-4\\times4\\times4\\times4\\times4']),
]

# Options de 3fe98dd9 (elles jugent aussi ses 6 variations en prod, sans base négative ni signe :
# leurs specs d'origine restent vertes) : `signs` coupé, sinon (−3)×(−3)×(−3)×(−3) est « à
# simplifier » en 3×3×3×3 ; parenthèse du premier facteur négatif permise, sinon (−3) en tête est
# « parenthèse inutile ».
ajouter('3fe98dd9', [F4_PAR, F4_SANS], SPECS_3FE,
        {'signs': 'off', 'allowBracketsInFirstNegativeTerm': True})
