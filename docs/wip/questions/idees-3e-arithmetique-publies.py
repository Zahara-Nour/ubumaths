"""Ajoute les variations validées à un modèle publié de 3e exporté de prod dans
scripts/questions/idees-3e-arithmetique-publies/ (chantier idees-3e-arithmetique).

Phase 0 validée par David le 2026-11-23 : F2 (90dca27a, fractions qui demandent une
décomposition). F1 (prévue sur 77ab770d) est passée en modèle neuf (idees-3e-arithmetique-neufs.py) :
elle demande `products: off`, et les options d'un modèle publié sont figées par la migration de
contenu. Les variations s'ajoutent À LA FIN (les réponses des élèves gardent l'indice de leur
variation) ; la migration de contenu est générée par scripts/questions/migration-contenu.ts. Seuls
`variations` et `testSpecs` changent.

Le script repart du contenu de prod (variations et specs d'origine, comptées dans ORIGINE) :
le relancer réécrit les ajouts sans les doubler.

Pièges du lot :
- Le corrigé ne peut pas décomposer un nombre quelconque (pas de fonction de décomposition dans
  les gabarits) : les nombres sont construits à partir de leurs facteurs (g = 2^x × 3^y × 5^z,
  p et q premiers).
- 90dca27a n'a pas d'options : une fraction égale mais simplifiable est `unoptimal_form`
  (contrainte `reducedFractions`), comme dans sa variation d'origine.

Usage : python3 docs/wip/questions/idees-3e-arithmetique-publies.py scripts/questions/idees-3e-arithmetique-publies
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
SECOND = '\\textcolor{{{color:primary.1}}}'

# id court → (variations, specs) d'origine en prod (export du 2026-11-23)
ORIGINE = {'90dca27a': (1, 5)}


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


def puissance(base, exposant):
    """base^exposant, sans exposant quand il vaut 1 (variables nommées)."""
    return '{{if:' + exposant + '==1|{{' + base + '}}|{{' + base + '}}^{ {{' + exposant + '}} }}}'


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
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
    print(f'{court} : {nv} + {len(variations)} variations, {ns} + {len(specs)} specs')


# =============================================================================================
# 90dca27a — 3-001, simplifier une fraction. F2 : fractions qui demandent une décomposition.
# Diviseur commun g = 2^x × 3^y × 5^z (de 6 à 30, au moins deux facteurs) ; numérateur g × p,
# dénominateur g × q, p et q premiers distincts : la fraction irréductible est p/q.
# =============================================================================================

def facteurs_g():
    """Facteurs de g = 2^x × 3^y × 5^z, écrits un par un (2 × 2 × 3), sans 1 en tête."""
    return ('{{if:x>=1|2|}}{{if:x>=2|\\times 2|}}'
            '{{if:y>=1|{{if:x>=1|\\times |}}3|}}'
            '{{if:z>=1|{{if:x+y>=1|\\times |}}5|}}')


G_COMMUN = couleur(facteurs_g())
VARS_G = [var('x', '0..2'), var('y', '0..1'), var('z', '0..1'), var('g', 'eval:2^x*3^y*5^z')]
COND_G = ['x+y+z>=2', 'g>=6', 'g<=30']
FRAC_PQ = '\\dfrac{ {{p}} }{ {{q}} }'

ERREURS_F2 = [
    erreur('\\dfrac{ {{q}} }{ {{p}} }',
           'Tu as inversé la fraction : le numérateur reste au numérateur.', 'Fraction inversée'),
    erreur('\\dfrac{ {{p}} }{ {{eval:g*q}} }',
           'Tu as divisé le numérateur par ${{g}}$, mais pas le dénominateur : on divise les deux '
           'par le même nombre.', 'Dénominateur oublié'),
]

ETAPES_F2 = [
    'On décompose le numérateur et le dénominateur en produits de facteurs premiers.',
    '$$\\dfrac{ {{eval:g*p}} }{ {{eval:g*q}} } = \\dfrac{' + G_COMMUN + '\\times {{p}} }{'
    + G_COMMUN + '\\times {{q}} }$$',
    'Les facteurs communs donnent ${{g}}$ : on divise le numérateur et le dénominateur par '
    '${{g}}$, et il ne reste plus de facteur commun.',
    '$$\\dfrac{ {{eval:g*p}} }{ {{eval:g*q}} } = ' + couleur(FRAC_PQ) + '$$',
]

F2_A = variation(
    'Simplifie le plus possible.\n\n$$\\dfrac{ {{eval:g*p}} }{ {{eval:g*q}} } = ?$$',
    VARS_G + [var('p', '2|3|5|7|11|13|17|19'), var('q', '2|3|5|7|11|13|17|19')],
    [case(FRAC_PQ, ERREURS_F2)],
    ETAPES_F2,
    'Décompose le numérateur et le dénominateur en facteurs premiers, puis repère les facteurs '
    'communs.',
    COND_G + ['p!=q', 'mod(g,p)!=0', 'mod(g,q)!=0', 'g*p<=400', 'g*q<=400', 'max(g*p,g*q)>=50'],
)

# b) Diviseur commun caché : un premier c de 13 à 19, multiplié par deux petits nombres
# premiers entre eux (12/51 = (4 × 3)/(17 × 3)… : ici c × u / c × v).
F2_B = variation(
    'Simplifie le plus possible.\n\n$$\\dfrac{ {{eval:c*u}} }{ {{eval:c*v}} } = ?$$',
    [var('c', '13|17|19'), var('u', '2..9'), var('v', '2..9')],
    [case('\\dfrac{ {{u}} }{ {{v}} }', [
        erreur('\\dfrac{ {{v}} }{ {{u}} }',
               'Tu as inversé la fraction : le numérateur reste au numérateur.',
               'Fraction inversée'),
        erreur('\\dfrac{ {{u}} }{ {{eval:c*v}} }',
               'Tu as divisé le numérateur par ${{c}}$, mais pas le dénominateur : on divise les '
               'deux par le même nombre.', 'Dénominateur oublié'),
    ])],
    [
        'Les tables ne suffisent pas : on cherche un diviseur commun parmi les nombres premiers '
        '$2$, $3$, $5$, $7$, $11$, $13$, $17$, $19$…',
        '$$\\dfrac{ {{eval:c*u}} }{ {{eval:c*v}} } = \\dfrac{ {{u}} \\times ' + couleur('{{c}}')
        + '}{ {{v}} \\times ' + couleur('{{c}}') + '}$$',
        '$$\\dfrac{ {{eval:c*u}} }{ {{eval:c*v}} } = ' + couleur('\\dfrac{ {{u}} }{ {{v}} }')
        + '$$',
    ],
    'Aucun nombre des tables ne divise les deux : essaie $11$, $13$, $17$, $19$.',
    ['gcd(u,v)==1', 'u!=v'],
)

# c) Les deux décompositions sont données : A = g × p, B = g × q (mêmes tirages qu'en a).
F2_C = variation(
    'On donne $A = {{eval:g*p}} = ' + facteurs_g() + '\\times {{p}}$ et $B = {{eval:g*q}} = '
    + facteurs_g() + '\\times {{q}}$.\n\nÉcris $\\dfrac{A}{B}$ sous forme irréductible.\n\n'
    '$$\\dfrac{A}{B} = ?$$',
    VARS_G + [var('p', '2|3|5|7|11|13|17|19'), var('q', '2|3|5|7|11|13|17|19')],
    [case(FRAC_PQ, ERREURS_F2)],
    [
        '$$\\dfrac{A}{B} = \\dfrac{' + G_COMMUN + '\\times {{p}} }{' + G_COMMUN
        + '\\times {{q}} }$$',
        'Les facteurs communs aux deux décompositions donnent ${{g}}$ : on divise le numérateur '
        'et le dénominateur par ${{g}}$.',
        '$$\\dfrac{A}{B} = ' + couleur(FRAC_PQ) + '$$',
    ],
    'Repère les facteurs premiers qui sont dans les deux décompositions.',
    COND_G + ['p!=q', 'mod(g,p)!=0', 'mod(g,q)!=0', 'g*p<=400', 'g*q<=400'],
)

V66 = {'x': '1', 'y': '1', 'z': '0', 'p': '11', 'q': '5'}
V140 = {'x': '2', 'y': '0', 'z': '1', 'p': '7', 'q': '17'}
V12 = {'c': '17', 'u': '4', 'v': '3'}
SPECS_90 = [
    spec('F2a : 66/30 → 11/5', 0, V66, 'correct', ['\\frac{11}{5}']),
    spec('F2a : 33/15, simplifiée à moitié', 0, V66, 'unoptimal_form', ['\\frac{33}{15}'],
         violations=['reducedFractions']),
    spec('F2a : inversée', 0, V66, 'incorrect', ['\\frac{5}{11}'],
         'Tu as inversé la fraction : le numérateur reste au numérateur.'),
    spec('F2a : dénominateur oublié', 0, V66, 'incorrect', ['\\frac{11}{30}'],
         'Tu as divisé le numérateur par $6$, mais pas le dénominateur : on divise les deux par '
         'le même nombre.'),
    spec('F2a : 140/340 → 7/17', 0, V140, 'correct', ['\\frac{7}{17}']),
    spec('F2a : 14/34, simplifiée par 10 seulement', 0, V140, 'unoptimal_form',
         ['\\frac{14}{34}'], violations=['reducedFractions']),
    spec('F2b : 68/51 → 4/3', 1, V12, 'correct', ['\\frac{4}{3}']),
    spec('F2b : inversée', 1, V12, 'incorrect', ['\\frac{3}{4}'],
         'Tu as inversé la fraction : le numérateur reste au numérateur.'),
    spec('F2b : dénominateur oublié', 1, V12, 'incorrect', ['\\frac{4}{51}'],
         'Tu as divisé le numérateur par $17$, mais pas le dénominateur : on divise les deux par '
         'le même nombre.'),
    spec('F2b : 26/39 → 2/3', 1, {'c': '13', 'u': '2', 'v': '3'}, 'correct', ['\\frac{2}{3}']),
    spec('F2c : A = 84, B = 60 → 7/5', 2, {'x': '2', 'y': '1', 'z': '0', 'p': '7', 'q': '5'},
         'correct', ['\\frac{7}{5}']),
    spec('F2c : 21/15, simplifiée par 4 seulement', 2,
         {'x': '2', 'y': '1', 'z': '0', 'p': '7', 'q': '5'}, 'unoptimal_form', ['\\frac{21}{15}'],
         violations=['reducedFractions']),
    spec('F2c : inversée', 2, {'x': '2', 'y': '1', 'z': '0', 'p': '7', 'q': '5'}, 'incorrect',
         ['\\frac{5}{7}'], 'Tu as inversé la fraction : le numérateur reste au numérateur.'),
]


ajouter('90dca27a', [F2_A, F2_B, F2_C], SPECS_90)
