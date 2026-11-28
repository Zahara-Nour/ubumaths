"""Ajoute la variation validée (V1) au modèle publié 2b382069, exporté de prod dans
scripts/questions/idees-1re-variations-publies/ (chantier idees-1re-variations).

Phase 0 validée par David le 2026-11-26 (« je valide ») : V1, f′ trinôme sans racine (Δ < 0),
ensemble où f′(x) ⩾ 0 = ℝ ou ∅ selon le signe du coefficient de x². La variation s'ajoute À LA
FIN (les réponses des élèves gardent l'indice de leur variation) ; la migration de contenu est
générée par scripts/questions/migration-contenu.ts.

Le script repart du contenu de prod (variations et specs d'origine, comptées dans ORIGINE) :
le relancer réécrit l'ajout sans le doubler.

Usage : python3 docs/wip/questions/idees-1re-variations-publies.py scripts/questions/idees-1re-variations-publies
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'

# id court → (variations, specs) d'origine en prod (export du 2026-11-26)
ORIGINE = {'2b382069': (3, 12)}

# Messages tels que la résolution les réécrit (rempli après le premier passage de question:specs)
REECRIT = {}


def resolu(message, coef):
    """Message tel que la résolution le réécrit, pour le coefficient de x² donné."""
    return (message.replace('\\Delta<0', '\\Delta < 0').replace("$f'(x)$", "$f'\\left( x \\right)$")
            .replace('{{eval:3*a}}', str(coef)))


def spec(desc, vi, variables_, status, answers, message=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = REECRIT.get(message, message)
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables_.items()},
            'expected': expected, 'answers': answers}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def ajouter(court, variations, specs):
    chemin = os.path.join(DOSSIER, court + '.json')
    with open(chemin, encoding='utf-8') as f:
        m = json.load(f)
    nv, ns = ORIGINE[court]
    assert len(m['variations']) >= nv and len(m['testSpecs']) >= ns, court
    m['variations'] = m['variations'][:nv]
    m['testSpecs'] = m['testSpecs'][:ns]
    for s in specs:
        s['variationIndex'] += nv
    m['variations'] += variations
    m['testSpecs'] += specs
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write('\n')


ERR_SIGNE_A = ('$\\Delta<0$ : $f\'(x)$ ne s\'annule jamais et garde le signe du coefficient de '
               '$x^2$, ici ${{eval:3*a}}$.')
ERR_SOMMET = ('$-\\dfrac{b}{2a}$ est l\'abscisse du sommet de la parabole, pas une racine : '
              'comme $\\Delta<0$, $f\'(x)$ ne change pas de signe.')

v1 = {
    'statement': 'Soit $f$ une fonction dérivable sur $\\mathbb{R}$ dont la dérivée est '
                 '$f\'(x)={{eval:3*a*x^2+2*b*x+c}}$.\n\n'
                 'Donne l\'ensemble des réels $x$ tels que $f\'(x)\\geqslant 0$ (intervalle, '
                 'réunion d\'intervalles, $\\mathbb{R}$ ou $\\emptyset$) : ce sont les intervalles '
                 'sur lesquels $f$ est croissante.\n\n$S=?$',
    'variables': [var('x', 'x|x'), var('a', '1..3;±'), var('b', '-5..5'), var('c', '-9..9')],
    'conditions': ['b^2-3*a*c < 0'],
    'blanks': [{
        'expectedAnswer': '{{if:a>0|\\mathbb{R}|\\emptyset}}',
        'expectedErrors': [
            erreur('\\emptyset', ERR_SIGNE_A, '∅ alors que f′ > 0'),
            erreur('\\mathbb{R}', ERR_SIGNE_A, 'ℝ alors que f′ < 0'),
            erreur('{{if:a>0|[{{eval:-b/(3*a)}};+\\infty[|]-\\infty;{{eval:-b/(3*a)}}]}}', ERR_SOMMET,
                   'Intervalle autour du sommet')]}],
    'correction': {'steps': [
        '$f\'$ est un trinôme du second degré : $\\Delta={{eval:(2*b)^2}}-4\\times{{eval:3*a;()}}'
        '\\times{{c;()}}={{eval:4*b^2-12*a*c}}<0$. $f\'(x)$ ne s\'annule pas.',
        'Il garde le signe du coefficient de $x^2$, ${{eval:3*a}}$ : $f\'(x)$ est '
        '{{if:a>0|strictement positif|strictement négatif}} pour tout réel $x$.',
        '$S=' + PRIMAIRE + '{ {{if:a>0|\\mathbb{R}|\\emptyset}} }$ : $f$ est '
        '{{if:a>0|croissante|décroissante}} sur $\\mathbb{R}$.']},
    'hint': 'Calcule le discriminant de $f\'(x)$. S\'il est négatif, $f\'(x)$ ne s\'annule pas : '
            'quel signe garde-t-il ?',
}

V = {'a': 1, 'b': 1, 'c': 2}          # f′(x) = 3x² + 2x + 2, Δ = 4 − 24 < 0
W = {'a': -2, 'b': 1, 'c': -3}        # f′(x) = −6x² + 2x − 3, Δ = 4 − 72 < 0
specs = [
    spec('3x² + 2x + 2 : ℝ', 0, V, 'correct', ['\\mathbb{R}']),
    spec('3x² + 2x + 2 : ]−∞ ; +∞[', 0, V, 'correct', [']-\\infty;+\\infty[']),
    spec('3x² + 2x + 2 : ∅', 0, V, 'incorrect', ['\\emptyset'], resolu(ERR_SIGNE_A, 3)),
    spec('3x² + 2x + 2 : autour du sommet', 0, V, 'incorrect', ['[-\\frac{1}{3};+\\infty['],
         resolu(ERR_SOMMET, 3)),
    spec('−6x² + 2x − 3 : ∅', 0, W, 'correct', ['\\emptyset']),
    spec('−6x² + 2x − 3 : ℝ', 0, W, 'incorrect', ['\\mathbb{R}'], resolu(ERR_SIGNE_A, -6)),
]

ajouter('2b382069', [v1], specs)
print('2b382069 : 1 variation ajoutée')
