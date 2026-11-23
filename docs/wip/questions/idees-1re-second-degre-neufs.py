"""Écrit les modèles neufs du chantier idees-1re-second-degre dans
scripts/questions/idees-1re-second-degre-neufs/.

Phase 0 validée par David le 2026-11-22 (« je valide tes recos » ; journal
docs/wip/idees-1re-second-degre-progress.md, page à cocher
https://claude.ai/artifact/JeWK9CeELHWtAMj2fkmzBy) : F1 à F7, sept modèles neufs.

Points prévus (rangement par migration, après la création en brouillon) :
F1 1SPE-386, F2 1SPE-254, F3 1SPE-246, F4 1SPE-248, F5 1SPE-402, F6 1SPE-287, F7 1SPE-250.

Grades 1_SPE. Ni theme, ni domain, ni subdomain, ni id : create-questions --publier écrit l'id.

Règles suivies (couvrir-un-niveau.md § 5) : erreurs prévues par case d'écriture ordinaire (de
vraies erreurs d'élèves, sans en inventer pour atteindre trois), chacune avec sa spec `incorrect`
qui nomme son message ; un coup de pouce par variation, qui ne donne jamais la réponse ; pas de
Oui / Non nu. Les ensembles se saisissent en `answerKind: intervalles` ({a ; b}, ∅, intervalles).

Usage : python3 docs/wip/questions/idees-1re-second-degre-neufs.py scripts/questions/idees-1re-second-degre-neufs
"""
import json
import os
import sys
from fractions import Fraction

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
VIDE = '\\varnothing'
R = '\\mathbb{R}'


def spec(desc, vi, variables_, status, answers, message=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = message
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables_.items()},
            'expected': expected, 'answers': answers}


def modele(title, description, level, variations, specs, shared=None, delay=120):
    return {'title': title, 'description': description, 'grades': ['1_SPE'], 'level': level,
            'delay': delay, 'status': 'draft', 'shared': shared or {'cleanCoefficients': True},
            'variations': variations, 'testSpecs': specs}


def bloc(nom, *lignes):
    return '```' + nom + '\n' + '\n'.join(lignes) + '\n```'


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def case(attendue, erreurs=None, kind=None, forme=None):
    c = {'expectedAnswer': attendue}
    if kind:
        c['answerKind'] = kind
    if forme:
        c['requiredForm'] = forme
    if erreurs:
        c['expectedErrors'] = erreurs
    return c


def variation(statement, variables, blanks, steps, hint, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': blanks, 'correction': {'steps': steps}, 'hint': hint}


def coef(v):
    """Coefficient devant une parenthèse ou une lettre : 1 → rien, −1 → −."""
    return '{{if:' + v + '==-1|-|}}{{if:' + v + '*' + v + '>1|{{' + v + '}}|}}'


def ecrire(nom, m):
    os.makedirs(DOSSIER, exist_ok=True)
    chemin = os.path.join(DOSSIER, nom + '.json')
    # Garder l'id écrit en tête par create-questions --publier, s'il existe
    if os.path.exists(chemin):
        with open(chemin, encoding='utf-8') as f:
            ancien = json.load(f)
        if 'id' in ancien:
            m = {'id': ancien['id'], **m}
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write('\n')


def fr(x):
    """Fraction en LaTeX pour une spec (réponse d'élève)."""
    x = Fraction(x)
    if x.denominator == 1:
        return str(x.numerator)
    signe = '-' if x < 0 else ''
    return signe + '\\frac{' + str(abs(x.numerator)) + '}{' + str(x.denominator) + '}'


def ens(*vals):
    return '\\{' + ';'.join(vals) + '\\}'


X = var('x', 'x|x')
DELTA_ETAPE = ('$$\\begin{align}\\Delta &= b^2-4ac \\\\ &= {{eval:b;()}}^2-4\\times{{eval:a;()}}'
               '\\times{{eval:c;()}} \\\\ &= {{eval:b^2-4*a*c}}\\end{align}$$')
ENS_HINT = ('Calcule le discriminant $\\Delta=b^2-4ac$ : son signe dit combien l\'équation a de '
            'solutions.')
CONSIGNE_S = ('\n\nÉcris l\'ensemble des solutions entre accolades, par exemple $\\{2;5\\}$, ou '
              '$\\varnothing$ s\'il n\'y en a pas.\n\n$S=?$')

# =============================================================================================
# F1 — Résoudre une équation du second degré : l'élève décide s'il y a deux, une ou aucune
# solution, et écrit S (1AL21-4, 1AL21-5, 1AL23-2). Point 1SPE-386.
# f69a6e9e donne deux cases x₁, x₂ : il annonce deux racines. Ici, rien n'est annoncé.
# =============================================================================================

ERR_SIGNE = ('Tu as changé le signe des solutions : dans $\\dfrac{-b\\pm\\sqrt{\\Delta}}{2a}$, '
             'n\'oublie pas le signe « − » devant $b$.')
f1 = []
f1s = []

# v0 — deux racines entières, a = 1
f1.append(variation(
    'Résous dans $' + R + '$ l\'équation ${{eval:ax^2+bx+c}}=0$.' + CONSIGNE_S,
    [X, var('a', '1'), var('r', '-6..6'), var('s', '-6..6'), var('b', 'eval:-(r+s)'),
     var('c', 'eval:r*s')],
    [case('\\{ {{r}} ; {{s}} \\}', [
        erreur('\\{ {{eval:-r}} ; {{eval:-s}} \\}', ERR_SIGNE, 'Signe de −b oublié'),
        erreur('\\{ {{eval:2*r}} ; {{eval:2*s}} \\}',
               'Tu as oublié de diviser par $2 a = 2$.', 'Division par 2a oubliée'),
    ])],
    ['On identifie $a=1$, $b={{b}}$ et $c={{c}}$, puis on calcule le discriminant.', DELTA_ETAPE,
     '$\\Delta>0$ : deux solutions, $x_1=\\dfrac{-b-\\sqrt{\\Delta}}{2a}={{r}}$ et '
     '$x_2=\\dfrac{-b+\\sqrt{\\Delta}}{2a}={{s}}$.',
     'Donc $S=' + PRIMAIRE + '{\\{ {{r}} ; {{s}} \\}}$.'],
    ENS_HINT, ['r < s']))
v = {'a': 1, 'r': -2, 's': 3, 'b': -1, 'c': -6}
f1s += [spec('x² − x − 6 : {−2 ; 3}', 0, v, 'correct', [ens('-2', '3')]),
        spec('x² − x − 6 : ordre inverse', 0, v, 'correct', [ens('3', '-2')]),
        spec('Signes changés', 0, v, 'incorrect', [ens('2', '-3')], ERR_SIGNE),
        spec('Division par 2a oubliée', 0, v, 'incorrect', [ens('-4', '6')],
             'Tu as oublié de diviser par $2 a = 2$.'),
        spec('Une seule solution donnée', 0, v, 'incorrect', [ens('3')]),
        spec('Ensemble vide', 0, v, 'incorrect', [VIDE])]

# v1 — deux racines, a de 2 à 3 (±), l'une fractionnaire : P = (x − r)(a x − q)
f1.append(variation(
    'Résous dans $' + R + '$ l\'équation ${{eval:ax^2+bx+c}}=0$.' + CONSIGNE_S,
    [X, var('a', '2|3|-2|-3'), var('r', '1..5;±'), var('q', '1..7;±'),
     var('b', 'eval:-(q+a*r)'), var('c', 'eval:q*r')],
    [case('\\{ {{r}} ; {{eval:q/a}} \\}', [
        erreur('\\{ {{eval:-r}} ; {{eval:-q/a}} \\}', ERR_SIGNE, 'Signe de −b oublié'),
        erreur('\\{ {{eval:a*r}} ; {{q}} \\}',
               'Tu as divisé par $2$ au lieu de $2a={{eval:2*a}}$.', 'Division par 2 au lieu de 2a'),
    ])],
    ['On identifie $a={{a}}$, $b={{b}}$ et $c={{c}}$, puis on calcule le discriminant.', DELTA_ETAPE,
     '$\\Delta>0$ : deux solutions, $\\dfrac{-b\\pm\\sqrt{\\Delta}}{2a}$ avec $2a={{eval:2*a}}$, '
     'soit ${{r}}$ et ${{eval:q/a}}$.',
     'Donc $S=' + PRIMAIRE + '{\\{ {{if:r<q/a|{{r}} ; {{eval:q/a}}|{{eval:q/a}} ; {{r}}}} \\}}$.'],
    ENS_HINT, ['q != a*r']))
v = {'a': 2, 'r': 1, 'q': 3, 'b': -5, 'c': 3}  # 2x² − 5x + 3 = (x − 1)(2x − 3)
f1s += [spec('2x² − 5x + 3 : {1 ; 3/2}', 1, v, 'correct', [ens('1', fr('3/2'))]),
        spec('2x² − 5x + 3 : décimal', 1, v, 'correct', [ens('1,5', '1')]),
        spec('Signes changés', 1, v, 'incorrect', [ens('-1', fr('-3/2'))], ERR_SIGNE),
        spec('Division par 2 seulement', 1, v, 'incorrect', [ens('2', '3')],
             'Tu as divisé par $2$ au lieu de $2 a = 4$.')]

# v2 — racine double
ERR_DOUBLE_VIDE = ('$\\Delta = 0$ : l\'équation a une solution, la racine double $x_0=-\\dfrac{b}{2a}$.')
f1.append(variation(
    'Résous dans $' + R + '$ l\'équation ${{eval:ax^2+bx+c}}=0$.' + CONSIGNE_S,
    [X, var('a', '1..4;±'), var('r', '1..6;±'), var('b', 'eval:-2*a*r'), var('c', 'eval:a*r^2')],
    [case('\\{ {{r}} \\}', [
        erreur(VIDE, ERR_DOUBLE_VIDE, 'Δ = 0 pris pour aucune solution'),
        erreur('\\{ {{eval:-r}} \\}', ERR_SIGNE, 'Signe de −b oublié'),
        erreur('\\{ {{eval:2*r}} \\}',
               'La racine double est $x_0=-\\dfrac{b}{2a}$ : tu as oublié le $2$.',
               'Division par a au lieu de 2a'),
    ])],
    ['On identifie $a={{a}}$, $b={{b}}$ et $c={{c}}$, puis on calcule le discriminant.', DELTA_ETAPE,
     '$\\Delta=0$ : une seule solution, $x_0=-\\dfrac{b}{2a}=-\\dfrac{ {{b}} }{ {{eval:2*a}} }={{r}}$.',
     'Donc $S=' + PRIMAIRE + '{\\{ {{r}} \\}}$.'],
    ENS_HINT))
v = {'a': 1, 'r': 3, 'b': -6, 'c': 9}
f1s += [spec('x² − 6x + 9 : {3}', 2, v, 'correct', [ens('3')]),
        spec('Ensemble vide', 2, v, 'incorrect', [VIDE], ERR_DOUBLE_VIDE),
        spec('Signe', 2, v, 'incorrect', [ens('-3')], ERR_SIGNE),
        spec('Oubli du 2', 2, v, 'incorrect', [ens('6')],
             'La racine double est $x_0=-\\dfrac{b}{2a}$ : tu as oublié le $2$.')]

# v3 — aucune solution : a(x − h)² + sg·k, a et sg·k de même signe
ERR_SOMMET = ('$-\\dfrac{b}{2a}$ n\'est une solution que si $\\Delta = 0$ ; ici $\\Delta < 0$ : l\'équation n\'a aucune solution.')
f1.append(variation(
    'Résous dans $' + R + '$ l\'équation ${{eval:ax^2+bx+c}}=0$.' + CONSIGNE_S,
    [X, var('a', '1..3;±'), var('h', '-4..4'), var('k', '1..6'), var('sg', 'eval:a/abs(a)'),
     var('b', 'eval:-2*a*h'), var('c', 'eval:a*h^2+sg*k')],
    [case(VIDE, [
        erreur('\\{ {{h}} \\}', ERR_SOMMET, 'Sommet pris pour une solution'),
    ])],
    ['On identifie $a={{a}}$, $b={{b}}$ et $c={{c}}$, puis on calcule le discriminant.', DELTA_ETAPE,
     '$\\Delta<0$ : le trinôme ne s\'annule jamais.',
     'Donc $S=' + PRIMAIRE + '{\\varnothing}$.'],
    ENS_HINT))
v = {'a': 1, 'h': 2, 'k': 3, 'sg': 1, 'b': -4, 'c': 7}
f1s += [spec('x² − 4x + 7 : ∅', 3, v, 'correct', [VIDE]),
        spec('x² − 4x + 7 : ∅ écrit emptyset', 3, v, 'correct', ['\\emptyset']),
        spec('Sommet', 3, v, 'incorrect', [ens('2')], ERR_SOMMET),
        spec('Tous les réels', 3, v, 'incorrect', [R])]

# v4 — racines irrationnelles : (x − h)² − k, k non carré
ERR_RAC_2 = ('$\\sqrt{\\Delta}$ se divise aussi par $2 a = 2$ : $\\dfrac{-b\\pm\\sqrt{\\Delta}}{2}$, pas seulement $-b$.')
f1.append(variation(
    'Résous dans $' + R + '$ l\'équation ${{eval:ax^2+bx+c}}=0$.\n\nDonne les solutions en valeur '
    'exacte, avec un radical simplifié.' + CONSIGNE_S,
    [X, var('a', '1'), var('h', '1..5;±'), var('k', '2|3|5|6|7'), var('b', 'eval:-2*h'),
     var('c', 'eval:h^2-k')],
    [case('\\{ {{h}}-\\sqrt{ {{k}} } ; {{h}}+\\sqrt{ {{k}} } \\}', [
        erreur('\\{ {{h}}-2\\sqrt{ {{k}} } ; {{h}}+2\\sqrt{ {{k}} } \\}', ERR_RAC_2,
               'Racine de Δ non divisée par 2a'),
        erreur('\\{ {{eval:-h}}-\\sqrt{ {{k}} } ; {{eval:-h}}+\\sqrt{ {{k}} } \\}', ERR_SIGNE,
               'Signe de −b oublié'),
    ])],
    ['On identifie $a=1$, $b={{b}}$ et $c={{c}}$, puis on calcule le discriminant.', DELTA_ETAPE,
     '$\\Delta>0$ : deux solutions. $\\sqrt{\\Delta}=\\sqrt{ {{eval:4*k}} }=2\\sqrt{ {{k}} }$, donc '
     '$\\dfrac{ {{eval:2*h}}\\pm2\\sqrt{ {{k}} } }{2}={{h}}\\pm\\sqrt{ {{k}} }$.',
     'Donc $S=' + PRIMAIRE + '{\\{ {{h}}-\\sqrt{ {{k}} } ; {{h}}+\\sqrt{ {{k}} } \\}}$.'],
    ENS_HINT))
v = {'a': 1, 'h': 2, 'k': 3, 'b': -4, 'c': 1}  # x² − 4x + 1
f1s += [spec('x² − 4x + 1 : 2 ± √3', 4, v, 'correct', [ens('2-\\sqrt{3}', '2+\\sqrt{3}')]),
        spec('√Δ non divisé', 4, v, 'incorrect', [ens('2-2\\sqrt{3}', '2+2\\sqrt{3}')], ERR_RAC_2),
        spec('Signe', 4, v, 'incorrect', [ens('-2-\\sqrt{3}', '-2+\\sqrt{3}')], ERR_SIGNE)]

# v5 — équation à réduire d'abord : p x² + m x + n = q x² + u x + w, différence (x − r)(x − s)
ERR_REDUIRE = ('Ces nombres sont les solutions avec le mauvais signe : réduis d\'abord l\'équation à la forme $a x^2 + b x + c = 0$, en changeant le signe des termes que tu passes de l\'autre côté.')
f1.append(variation(
    'Résous dans $' + R + '$ l\'équation ${{eval:p*x^2+m*x+n}}={{eval:q*x^2+u*x+w}}$.' + CONSIGNE_S,
    [X, var('q', '1..3'), var('p', 'eval:q+1'), var('u', '-5..5'), var('w', '-6..6'),
     var('r', '-5..5'), var('s', '-5..5'), var('m', 'eval:u-(r+s)'), var('n', 'eval:w+r*s')],
    [case('\\{ {{r}} ; {{s}} \\}', [
        erreur('\\{ {{eval:-r}} ; {{eval:-s}} \\}', ERR_REDUIRE, 'Signes des racines changés'),
    ])],
    ['On passe tout dans le membre de gauche : $({{eval:p*x^2+m*x+n}})-({{eval:q*x^2+u*x+w}})=0$, '
     'soit ${{eval:x^2-(r+s)*x+r*s}}=0$.',
     '$\\Delta={{eval:(r+s)^2-4*r*s}}>0$ : deux solutions, $\\dfrac{ {{eval:r+s}}\\pm{{eval:s-r}} }{2}$, '
     'soit ${{r}}$ et ${{s}}$.',
     'Donc $S=' + PRIMAIRE + '{\\{ {{r}} ; {{s}} \\}}$.'],
    'Commence par tout passer dans un même membre pour te ramener à $ax^2+bx+c=0$.',
    ['r < s']))
v = {'q': 1, 'p': 2, 'u': 3, 'w': -2, 'r': -1, 's': 4, 'm': 0, 'n': -6}  # 2x² − 6 = x² + 3x − 2
f1s += [spec('2x² − 6 = x² + 3x − 2 : {−1 ; 4}', 5, v, 'correct', [ens('-1', '4')]),
        spec('Signes changés', 5, v, 'incorrect', [ens('1', '-4')], ERR_REDUIRE)]

# v6 — a x² = b x
ERR_DIVISE_X = ('En divisant par $x$, tu as perdu la solution $x = 0$ : factorise plutôt par $x$.')
f1.append(variation(
    'Résous dans $' + R + '$ l\'équation ${{eval:a*x^2}}={{eval:b*x}}$.' + CONSIGNE_S,
    [X, var('a', '2..5;±'), var('b', '1..9;±')],
    [case('\\{ 0 ; {{eval:b/a}} \\}', [
        erreur('\\{ {{eval:b/a}} \\}', ERR_DIVISE_X, 'Solution 0 perdue'),
        erreur('\\{ 0 ; {{eval:a/b}} \\}',
               'De ${{a}}x={{b}}$, on tire $x=\\dfrac{ {{b}} }{ {{a}} }$, pas l\'inverse.',
               'Quotient inversé'),
    ])],
    ['On passe tout à gauche et on factorise par $x$ : ${{eval:a*x^2-b*x}}=x({{eval:a*x-b}})=0$.',
     'Un produit est nul si l\'un de ses facteurs est nul : $x=0$ ou ${{eval:a*x-b}}=0$, '
     'soit $x={{eval:b/a}}$.',
     'Donc $S=' + PRIMAIRE + '{\\{ 0 ; {{eval:b/a}} \\}}$.'],
    'Ne divise pas par $x$ (il pourrait valoir $0$) : passe tout dans un membre et factorise.',
    ['a != b']))
v = {'a': 3, 'b': 6}
f1s += [spec('3x² = 6x : {0 ; 2}', 6, v, 'correct', [ens('0', '2')]),
        spec('Solution 0 perdue', 6, v, 'incorrect', [ens('2')], ERR_DIVISE_X),
        spec('Quotient inversé', 6, v, 'incorrect', [ens('0', fr('1/2'))],
             'De $3 x = 6$, on tire $x = \\dfrac{6}{3}$, pas l\'inverse.')]

F1 = modele('Résoudre une équation du second degré (ensemble des solutions)',
            'Décider s\'il y a deux, une ou aucune solution et écrire S : racines entières, '
            'fractionnaires, double, irrationnelles, équation à réduire, ax² = bx',
            2, f1, f1s, {'cleanCoefficients': True, 'blankDefaults': {'answerKind': 'intervalles'}})

# =============================================================================================
# F2 — Choisir la forme adaptée pour résoudre (1AL20-2, 1AL21-6). Point 1SPE-254.
# Tirage commun : a ∈ {±2, ±3, ±4}, x₁, x₂ = x₁ + 2k, α = x₁ + k, β = −a k² (α et β entiers).
# =============================================================================================

TROIS_FORMES = (
    'Soit $f$ la fonction définie sur $' + R + '$ par trois écritures égales :\n\n'
    '- forme développée : $f(x)={{eval:ax^2+bx+c}}$ ;\n'
    '- forme factorisée : $f(x)={{a}}(x{{eval:-x1;+}})(x{{eval:-x2;+}})$ ;\n'
    '- forme canonique : $f(x)={{a}}(x{{eval:-al;+}})^2{{eval:be;+}}$.\n\n')
F2_VARS = [X, var('a', '2..4;±'), var('x1', '-5..3'), var('k', '1..4'), var('x2', 'eval:x1+2*k'),
           var('al', 'eval:x1+k'), var('be', 'eval:-a*k^2'), var('b', 'eval:-a*(x1+x2)'),
           var('c', 'eval:a*x1*x2')]
F2_COND = ['x1 != 0', 'x2 != 0', 'al != 0']
F2_HINT = ('Cherche l\'écriture qui fait disparaître le plus de calcul : un produit nul, un '
           'terme qui s\'annule de chaque côté, ou un carré isolé.')
CHOISIS = 'En choisissant l\'écriture la plus adaptée, résous '
F2_EX = {'a': 2, 'x1': -1, 'k': 2, 'x2': 3, 'al': 1, 'be': -8, 'b': -4, 'c': -6}
# f(x) = 2x² − 4x − 6 = 2(x + 1)(x − 3) = 2(x − 1)² − 8
f2 = []
f2s = []

ERR_F2_SIGNES = ('Un produit $a \\left( x - x_1 \\right) \\left( x - x_2 \\right)$ est nul pour $x = x_1$ ou $x = x_2$ : attention aux signes.')
ERR_F2_SOMMET = ('${{al}}$ est l\'abscisse du sommet : $f({{al}})={{be}}$, pas $0$.')
f2.append(variation(
    TROIS_FORMES + CHOISIS + 'l\'équation $f(x)=0$.' + CONSIGNE_S, F2_VARS,
    [case('\\{ {{x1}} ; {{x2}} \\}', [
        erreur('\\{ {{eval:-x1}} ; {{eval:-x2}} \\}', ERR_F2_SIGNES, 'Signes des racines'),
        erreur('\\{ {{al}} \\}', ERR_F2_SOMMET, 'Abscisse du sommet'),
    ])],
    ['La forme factorisée donne un produit nul : $f(x)=0 \\iff x{{eval:-x1;+}}=0$ ou '
     '$x{{eval:-x2;+}}=0$.',
     'Donc $S=' + PRIMAIRE + '{\\{ {{x1}} ; {{x2}} \\}}$.'],
    F2_HINT, F2_COND))
f2s += [spec('f(x) = 0 : {−1 ; 3}', 0, F2_EX, 'correct', [ens('-1', '3')]),
        spec('Signes', 0, F2_EX, 'incorrect', [ens('1', '-3')], ERR_F2_SIGNES),
        spec('Sommet', 0, F2_EX, 'incorrect', [ens('1')],
             '$1$ est l\'abscisse du sommet : $f\\left( 1 \\right) = -8$, pas $0$.')]

ERR_F2_ZERO = ('En divisant par $x$, tu as perdu la solution $x = 0$ : factorise par $x$.')
f2.append(variation(
    TROIS_FORMES + CHOISIS + 'l\'équation $f(x)={{c}}$.' + CONSIGNE_S, F2_VARS,
    [case('\\{ 0 ; {{eval:x1+x2}} \\}', [
        erreur('\\{ {{eval:x1+x2}} \\}', ERR_F2_ZERO, 'Solution 0 perdue'),
        erreur('\\{ 0 ; {{eval:-(x1+x2)}} \\}',
               'De ${{a}}x{{eval:b;+}}=0$, on tire $x=-\\dfrac{ {{b}} }{ {{a}} }$ : attention au signe.',
               'Signe'),
    ])],
    ['La forme développée fait disparaître la constante : $f(x)={{c}} \\iff {{eval:ax^2+bx}}=0 '
     '\\iff x({{eval:a*x+b}})=0$.',
     '$x=0$ ou ${{eval:a*x+b}}=0$, soit $x={{eval:x1+x2}}$. Donc $S=' + PRIMAIRE
     + '{\\{ 0 ; {{eval:x1+x2}} \\}}$.'],
    F2_HINT, F2_COND))
f2s += [spec('f(x) = −6 : {0 ; 2}', 1, F2_EX, 'correct', [ens('0', '2')]),
        spec('0 perdu', 1, F2_EX, 'incorrect', [ens('2')], ERR_F2_ZERO),
        spec('Signe', 1, F2_EX, 'incorrect', [ens('0', '-2')],
             'De $2 x - 4 = 0$, on tire $x = -\\dfrac{-4}{2}$ : attention au signe.')]

ERR_F2_RACINES = 'Ce sont les solutions de $f(x)=0$ ; ici on cherche $f(x)={{be}}$.'
f2.append(variation(
    TROIS_FORMES + CHOISIS + 'l\'équation $f(x)={{be}}$.' + CONSIGNE_S, F2_VARS,
    [case('\\{ {{al}} \\}', [
        erreur('\\{ {{x1}} ; {{x2}} \\}', ERR_F2_RACINES, 'Racines de f'),
        erreur('\\{ {{eval:-al}} \\}',
               '$(x{{eval:-al;+}})^2=0$ donne $x={{al}}$ : attention au signe.', 'Signe'),
    ])],
    ['La forme canonique isole un carré : $f(x)={{be}} \\iff {{a}}(x{{eval:-al;+}})^2=0 \\iff '
     'x={{al}}$.',
     'Donc $S=' + PRIMAIRE + '{\\{ {{al}} \\}}$.'],
    F2_HINT, F2_COND))
f2s += [spec('f(x) = −8 : {1}', 2, F2_EX, 'correct', [ens('1')]),
        spec('Racines de f', 2, F2_EX, 'incorrect', [ens('-1', '3')],
             'Ce sont les solutions de $f\\left( x \\right) = 0$ ; ici on cherche $f\\left( x \\right) = -8$.'),
        spec('Signe', 2, F2_EX, 'incorrect', [ens('-1')],
             '$\\left( x - 1 \\right)^2 = 0$ donne $x = 1$ : attention au signe.')]

ERR_F2_PM = ('$(x{{eval:-al;+}})^2={{eval:m^2}}$ a deux solutions : $x{{eval:-al;+}}={{m}}$ ou '
             '$x{{eval:-al;+}}=-{{m}}$.')
f2.append(variation(
    TROIS_FORMES + CHOISIS + 'l\'équation $f(x)={{R}}$.' + CONSIGNE_S,
    F2_VARS + [var('m', '1..3'), var('R', 'eval:be+a*m^2')],
    [case('\\{ {{eval:al-m}} ; {{eval:al+m}} \\}', [
        erreur('\\{ {{eval:al+m}} \\}', ERR_F2_PM, 'Une seule racine carrée'),
        erreur('\\{ {{eval:-al-m}} ; {{eval:-al+m}} \\}',
               '$(x{{eval:-al;+}})^2={{eval:m^2}}$ donne $x={{al}}\\pm{{m}}$ : attention au signe de $\\alpha$.',
               'Signe de α'),
    ])],
    ['La forme canonique : $f(x)={{R}} \\iff {{a}}(x{{eval:-al;+}})^2={{eval:a*m^2}} \\iff '
     '(x{{eval:-al;+}})^2={{eval:m^2}}$.',
     '$x{{eval:-al;+}}={{m}}$ ou $x{{eval:-al;+}}=-{{m}}$. Donc $S=' + PRIMAIRE
     + '{\\{ {{eval:al-m}} ; {{eval:al+m}} \\}}$.'],
    F2_HINT, F2_COND + ['m != k', 'R != c']))
v = dict(F2_EX, m=1, R=-6)  # R = −8 + 2 = −6 = c : interdit → m = 3
v = dict(F2_EX, m=3, R=10)
f2s += [spec('f(x) = 10 : {−2 ; 4}', 3, v, 'correct', [ens('-2', '4')]),
        spec('Une seule solution', 3, v, 'incorrect', [ens('4')],
             '$\\left( x - 1 \\right)^2 = 9$ a deux solutions : $x - 1 = 3$ ou $x - 1 = -3$.'),
        spec('Signe de α', 3, v, 'incorrect', [ens('-4', '2')],
             '$\\left( x - 1 \\right)^2 = 9$ donne $x=1\\pm3$ : attention au signe de $\\alpha$.')]

# v4 — f(x) < β ou f(x) > β : ∅ ou ℝ privé de α. e = 1 → ∅, e = −1 → ℝ \ {α}
ERR_F2_INEQ = ('Un carré est toujours positif ou nul : avec $a={{a}}$, regarde si '
               '${{a}}(x{{eval:-al;+}})^2$ peut être {{if:t==0|strictement négatif|strictement '
               'positif}}.')
ERR_F2_R = ('{{if:ee==-1|En $x={{al}}$, on a $f(x)={{be}}$ : l\'inégalité est stricte, ce nombre '
            'n\'est pas solution.|Un carré est toujours positif ou nul : avec $a={{a}}$, regarde si '
            '${{a}}(x{{eval:-al;+}})^2$ peut être {{if:t==0|strictement négatif|strictement '
            'positif}}.}}')
f2.append(variation(
    TROIS_FORMES + CHOISIS + 'l\'inéquation $f(x){{if:t==0|<|>}}{{be}}$.\n\nÉcris l\'ensemble des '
    'solutions : $\\varnothing$, $\\mathbb{R}$, $\\mathbb{R}\\setminus\\{a\\}$ ou des '
    'intervalles.\n\n$S=?$',
    F2_VARS + [var('t', '0|1'), var('sg', 'eval:a/abs(a)'), var('ee', 'eval:sg*(1-2*t)')],
    [case('{{if:ee==1|\\varnothing|\\mathbb{R}\\setminus\\{ {{al}} \\}}}', [
        erreur('{{if:ee==1|\\mathbb{R}\\setminus\\{ {{al}} \\}|\\varnothing}}', ERR_F2_INEQ,
               'Sens du carré'),
        erreur('\\mathbb{R}', ERR_F2_R, 'Tous les réels'),
    ])],
    ['La forme canonique : $f(x){{if:t==0|<|>}}{{be}} \\iff {{a}}(x{{eval:-al;+}})^2{{if:t==0|<|>}}0$.',
     '{{if:ee==1|Or ${{a}}(x{{eval:-al;+}})^2$ est toujours du signe de $a$ ou nul : il n\'est jamais '
     '{{if:t==0|strictement négatif|strictement positif}}. Donc $S=' + PRIMAIRE
     + '{\\varnothing}$.|Or ${{a}}(x{{eval:-al;+}})^2$ est {{if:t==0|strictement négatif|strictement '
     'positif}} dès que $x\\neq{{al}}$. Donc $S=' + PRIMAIRE + '{\\mathbb{R}\\setminus\\{ {{al}} \\}}$.}}'],
    F2_HINT, F2_COND))
v1 = dict(F2_EX, t=0, sg=1, ee=1)     # 2(x − 1)² < 0 : ∅
v2 = dict(F2_EX, t=1, sg=1, ee=-1)    # 2(x − 1)² > 0 : ℝ \ {1}
f2s += [spec('f(x) < −8 avec a > 0 : ∅', 4, v1, 'correct', [VIDE]),
        spec('f(x) < −8 : ℝ \\ {1} au lieu de ∅', 4, v1, 'incorrect', ['\\mathbb{R}\\setminus\\{1\\}'],
             'Un carré est toujours positif ou nul : avec $a = 2$, regarde si $2 \\left( x - 1 \\right)^2$ peut être strictement négatif.'),
        spec('f(x) > −8 avec a > 0 : ℝ \\ {1}', 4, v2, 'correct', ['\\mathbb{R}\\setminus\\{1\\}']),
        spec('f(x) > −8 : réunion d\'intervalles', 4, v2, 'correct',
             [']-\\infty;1[\\cup]1;+\\infty[']),
        spec('f(x) > −8 : ℝ', 4, v2, 'incorrect', [R],
             'En $x = 1$, on a $f\\left( x \\right) = -8$ : l\'inégalité est stricte, ce nombre n\'est pas solution.')]

F2 = modele('Résoudre en choisissant la forme adaptée',
            'Trois formes d\'une fonction du second degré données ; résoudre f(x) = 0, f(x) = c, '
            'f(x) = β, f(x) = R ou f(x) < β avec la forme qui rend le calcul immédiat',
            2, f2, f2s, {'cleanCoefficients': True, 'blankDefaults': {'answerKind': 'intervalles'}})

# =============================================================================================
# F3 — Résoudre par la forme canonique, sans le discriminant (1AL21-3). Point 1SPE-246.
# Deux cases : la forme canonique (forme imposée), puis S. a = 1 et b pair (cas simples du BO).
# =============================================================================================

F3_ENONCE = (
    'On veut résoudre dans $' + R + '$ l\'équation ${{eval:x^2+bx+c}}=0$ sans le discriminant.\n\n'
    '1. Écris ${{eval:x^2+bx+c}}$ sous forme canonique : ${{eval:x^2+bx+c}}=?$\n\n'
    '2. Déduis-en l\'ensemble des solutions, entre accolades ($\\varnothing$ s\'il n\'y en a '
    'pas) : $S=?$')
FORME_CANO = {'pattern': 'u*($x+v)^2+w'}
ERR_F3_SIGNE_H = ('Le carré à compléter est $\\left(x+\\dfrac{b}{2}\\right)^2$ avec $b={{b}}$ : '
                  'attention au signe.')
ERR_F3_C = ('Tu as gardé $c$ tel quel : en développant $(x{{eval:-h;+}})^2$, on obtient '
            '${{eval:h^2}}$ en trop, à retirer.')
F3_HINT = ('Complète le carré : $x^2+bx=\\left(x+\\dfrac{b}{2}\\right)^2-\\left(\\dfrac{b}{2}'
           '\\right)^2$.')


def f3_case_cano(attendue):
    return case(attendue, [
        erreur('(x{{eval:h;+}})^2{{eval:c-h^2;+}}', ERR_F3_SIGNE_H, 'Signe de b/2'),
        erreur('(x{{eval:-h;+}})^2{{eval:c;+}}', ERR_F3_C, 'Constante non corrigée'),
    ], forme=FORME_CANO)


f3 = []
f3s = []
# v0 — (x − h)² − m²
f3.append(variation(
    F3_ENONCE,
    [X, var('h', '1..6;±'), var('m', '1..6'), var('b', 'eval:-2*h'), var('c', 'eval:h^2-m^2')],
    [f3_case_cano('(x{{eval:-h;+}})^2-{{eval:m^2}}'),
     case('\\{ {{eval:h-m}} ; {{eval:h+m}} \\}', [
         erreur('\\{ {{eval:h+m}} \\}',
                '$X^2={{eval:m^2}}$ a deux solutions, $X={{m}}$ et $X=-{{m}}$.',
                'Une seule racine carrée'),
         erreur('\\{ {{eval:-h-m}} ; {{eval:-h+m}} \\}',
                '$x{{eval:-h;+}}=\\pm{{m}}$ donne $x={{h}}\\pm{{m}}$ : attention au signe.',
                'Signe de α'),
     ], kind='intervalles')],
    ['On complète le carré : $x^2{{eval:b;+}}x=(x{{eval:-h;+}})^2-{{eval:h^2}}$, donc '
     '${{eval:x^2+bx+c}}=' + PRIMAIRE + '{(x{{eval:-h;+}})^2-{{eval:m^2}}}$.',
     '$(x{{eval:-h;+}})^2={{eval:m^2}} \\iff x{{eval:-h;+}}={{m}}$ ou $x{{eval:-h;+}}=-{{m}}$.',
     'Donc $S=' + PRIMAIRE + '{\\{ {{eval:h-m}} ; {{eval:h+m}} \\}}$.'],
    F3_HINT, ['c != 0']))
v = {'h': 3, 'm': 2, 'b': -6, 'c': 5}  # x² − 6x + 5 = (x − 3)² − 4
f3s += [spec('x² − 6x + 5', 0, v, 'correct', ['(x-3)^2-4', ens('1', '5')]),
        spec('Canonique : signe de b/2', 0, v, 'incorrect', ['(x+3)^2-4', ens('1', '5')],
             'Le carré à compléter est $\\left(x+\\dfrac{b}{2}\\right)^2$ avec $b = -6$ : attention au signe.'),
        spec('Canonique : c gardé', 0, v, 'incorrect', ['(x-3)^2+5', ens('1', '5')],
             'Tu as gardé $c$ tel quel : en développant $\\left( x - 3 \\right)^2$, on obtient $9$ en trop, à retirer.'),
        spec('S : une seule solution', 0, v, 'incorrect', ['(x-3)^2-4', ens('5')],
             '$X^2 = 4$ a deux solutions, $X = 2$ et $X = -2$.'),
        spec('S : signe', 0, v, 'incorrect', ['(x-3)^2-4', ens('-5', '-1')],
             '$x-3=\\pm2$ donne $x=3\\pm2$ : attention au signe.')]

# v1 — (x − h)² + k, k > 0 : ∅
f3.append(variation(
    F3_ENONCE,
    [X, var('h', '1..6;±'), var('k', '1..9'), var('b', 'eval:-2*h'), var('c', 'eval:h^2+k')],
    [f3_case_cano('(x{{eval:-h;+}})^2+{{k}}'),
     case(VIDE, [
         erreur('\\{ {{h}} \\}',
                '$(x{{eval:-h;+}})^2+{{k}}$ vaut au moins ${{k}}$ : il ne s\'annule jamais.',
                'Sommet pris pour une solution'),
     ], kind='intervalles')],
    ['On complète le carré : $x^2{{eval:b;+}}x=(x{{eval:-h;+}})^2-{{eval:h^2}}$, donc '
     '${{eval:x^2+bx+c}}=' + PRIMAIRE + '{(x{{eval:-h;+}})^2+{{k}}}$.',
     'Un carré est positif ou nul, donc $(x{{eval:-h;+}})^2+{{k}}\\geqslant{{k}}>0$ : l\'expression '
     'ne s\'annule jamais.',
     'Donc $S=' + PRIMAIRE + '{\\varnothing}$.'],
    F3_HINT))
v = {'h': -2, 'k': 3, 'b': 4, 'c': 7}  # x² + 4x + 7 = (x + 2)² + 3
f3s += [spec('x² + 4x + 7', 1, v, 'correct', ['(x+2)^2+3', VIDE]),
        spec('S : sommet', 1, v, 'incorrect', ['(x+2)^2+3', ens('-2')],
             '$\\left( x + 2 \\right)^2 + 3$ vaut au moins $3$ : il ne s\'annule jamais.')]

# v2 — (x − h)² − k, k non carré
f3.append(variation(
    F3_ENONCE + '\n\nDonne les solutions en valeur exacte.',
    [X, var('h', '1..5;±'), var('k', '2|3|5|6|7'), var('b', 'eval:-2*h'), var('c', 'eval:h^2-k')],
    [f3_case_cano('(x{{eval:-h;+}})^2-{{k}}'),
     case('\\{ {{h}}-\\sqrt{ {{k}} } ; {{h}}+\\sqrt{ {{k}} } \\}', [
         erreur('\\{ {{h}}+\\sqrt{ {{k}} } \\}',
                '$X^2={{k}}$ a deux solutions, $X=\\sqrt{ {{k}} }$ et $X=-\\sqrt{ {{k}} }$.',
                'Une seule racine carrée'),
         erreur('\\{ {{eval:h-k}} ; {{eval:h+k}} \\}',
                '$(x{{eval:-h;+}})^2={{k}}$ donne $x{{eval:-h;+}}=\\pm\\sqrt{ {{k}} }$, pas '
                '$\\pm{{k}}$.', 'Racine carrée oubliée'),
     ], kind='intervalles')],
    ['On complète le carré : $x^2{{eval:b;+}}x=(x{{eval:-h;+}})^2-{{eval:h^2}}$, donc '
     '${{eval:x^2+bx+c}}=' + PRIMAIRE + '{(x{{eval:-h;+}})^2-{{k}}}$.',
     '$(x{{eval:-h;+}})^2={{k}} \\iff x{{eval:-h;+}}=\\sqrt{ {{k}} }$ ou '
     '$x{{eval:-h;+}}=-\\sqrt{ {{k}} }$.',
     'Donc $S=' + PRIMAIRE + '{\\{ {{h}}-\\sqrt{ {{k}} } ; {{h}}+\\sqrt{ {{k}} } \\}}$.'],
    F3_HINT))
v = {'h': 1, 'k': 5, 'b': -2, 'c': -4}  # x² − 2x − 4 = (x − 1)² − 5
f3s += [spec('x² − 2x − 4', 2, v, 'correct', ['(x-1)^2-5', ens('1-\\sqrt{5}', '1+\\sqrt{5}')]),
        spec('S : une seule', 2, v, 'incorrect', ['(x-1)^2-5', ens('1+\\sqrt{5}')],
             '$X^2 = 5$ a deux solutions, $X = \\sqrt{5}$ et $X = -\\sqrt{5}$.'),
        spec('S : racine oubliée', 2, v, 'incorrect', ['(x-1)^2-5', ens('-4', '6')],
             '$\\left( x - 1 \\right)^2 = 5$ donne $x-1=\\pm\\sqrt{ 5 }$, pas $\\pm5$.')]

F3 = modele('Résoudre une équation par la forme canonique',
            'x² + bx + c (b pair) : forme canonique par complétion du carré, puis ensemble des '
            'solutions, sans discriminant', 2, f3, f3s)

# =============================================================================================
# F4 — Nombre de solutions selon un paramètre m (1AL21-7). Point 1SPE-248.
# Δ(m) simple : affine en m, ou m² − 4k². Réponse : l'ensemble des valeurs de m.
# =============================================================================================

F4_HINT = ('Exprime le discriminant en fonction de $m$, puis traduis la condition sur le nombre '
           'de solutions par une condition sur le signe de $\\Delta$.')
f4 = []
f4s = []
EQ_P = '$x^2{{eval:2*p;+}}x+m=0$'
ERR_F4_SENS = ('$\\Delta={{eval:4*p^2}}-4m$ doit être strictement positif : cela donne '
               '$m<{{eval:p^2}}$.')
ERR_F4_4 = ('$\\Delta={{eval:4*p^2}}-4m>0$ donne $4m<{{eval:4*p^2}}$ : divise aussi par $4$.')
ERR_F4_BORNE = ('Pour $m={{eval:p^2}}$, $\\Delta=0$ : une seule solution, la borne est exclue.')
f4.append(variation(
    'Pour quelles valeurs du réel $m$ l\'équation ' + EQ_P + ' a-t-elle deux solutions réelles '
    'distinctes ?\n\nÉcris l\'ensemble de ces valeurs de $m$ (intervalle).\n\n$?$',
    [var('p', '1..4;±')],
    [case(']-\\infty;{{eval:p^2}}[', [
        erreur(']{{eval:p^2}};+\\infty[', ERR_F4_SENS, 'Sens de l\'inégalité'),
        erreur(']-\\infty;{{eval:4*p^2}}[', ERR_F4_4, 'Division par 4 oubliée'),
        erreur(']-\\infty;{{eval:p^2}}]', ERR_F4_BORNE, 'Borne incluse'),
    ])],
    ['$a=1$, $b={{eval:2*p}}$, $c=m$ : $\\Delta={{eval:2*p;()}}^2-4\\times1\\times m={{eval:4*p^2}}-4m$.',
     'Deux solutions distinctes $\\iff \\Delta>0 \\iff {{eval:4*p^2}}-4m>0 \\iff m<{{eval:p^2}}$.',
     'L\'ensemble cherché est $' + PRIMAIRE + '{\\left]-\\infty\\,;{{eval:p^2}}\\right[}$.'],
    F4_HINT))
v = {'p': 3}
f4s += [spec('x² + 6x + m : m < 9', 0, v, 'correct', [']-\\infty;9[']),
        spec('Sens', 0, v, 'incorrect', [']9;+\\infty['],
             '$\\Delta = 36 - 4 m$ doit être strictement positif : cela donne $m < 9$.'),
        spec('Oubli de /4', 0, v, 'incorrect', [']-\\infty;36['],
             '$\\Delta = 36 - 4 m > 0$ donne $4 m < 36$ : divise aussi par $4$.'),
        spec('Borne incluse', 0, v, 'incorrect', [']-\\infty;9]'],
             'Pour $m = 9$, $\\Delta = 0$ : une seule solution, la borne est exclue.')]

ERR_F4_1_4 = '$\\Delta={{eval:4*p^2}}-4m=0$ donne $m=\\dfrac{ {{eval:4*p^2}} }{4}$.'
ERR_F4_1_S = '$\\Delta={{eval:4*p^2}}-4m=0$ donne $4m={{eval:4*p^2}}$ : attention au signe.'
f4.append(variation(
    'Pour quelles valeurs du réel $m$ l\'équation ' + EQ_P + ' a-t-elle exactement une solution '
    'réelle ?\n\nÉcris l\'ensemble de ces valeurs de $m$, entre accolades.\n\n$?$',
    [var('p', '1..4;±')],
    [case('\\{ {{eval:p^2}} \\}', [
        erreur('\\{ {{eval:4*p^2}} \\}', ERR_F4_1_4, 'Division par 4 oubliée'),
        erreur('\\{ {{eval:-p^2}} \\}', ERR_F4_1_S, 'Signe'),
    ])],
    ['$\\Delta={{eval:2*p;()}}^2-4m={{eval:4*p^2}}-4m$.',
     'Une seule solution $\\iff \\Delta=0 \\iff m={{eval:p^2}}$.',
     'L\'ensemble cherché est $' + PRIMAIRE + '{\\{ {{eval:p^2}} \\}}$.'],
    F4_HINT))
v = {'p': -2}
f4s += [spec('x² − 4x + m : {4}', 1, v, 'correct', [ens('4')]),
        spec('Oubli /4', 1, v, 'incorrect', [ens('16')],
             '$\\Delta = 16 - 4 m = 0$ donne $m = \\dfrac{16}{4}$.'),
        spec('Signe', 1, v, 'incorrect', [ens('-4')],
             '$\\Delta = 16 - 4 m = 0$ donne $4 m = 16$ : attention au signe.')]

ERR_F4_ENTRE = ('Entre $-{{eval:2*k}}$ et ${{eval:2*k}}$, $\\Delta<0$ : aucune solution. '
                '$\\Delta=m^2-{{eval:4*k^2}}$ est positif à l\'extérieur de ses racines.')
ERR_F4_NEG = ('$m^2>{{eval:4*k^2}}$ a aussi des solutions négatives : $m<-{{eval:2*k}}$.')
ERR_F4_RAC = ('$\\Delta=m^2-4\\times{{eval:k^2}}$ s\'annule en $\\pm{{eval:2*k}}$, pas en '
              '$\\pm{{k}}$.')
f4.append(variation(
    'Pour quelles valeurs du réel $m$ l\'équation $x^2+mx+{{eval:k^2}}=0$ a-t-elle deux '
    'solutions réelles distinctes ?\n\nÉcris l\'ensemble de ces valeurs de $m$ (intervalles).\n\n$?$',
    [var('k', '1..5')],
    [case(']-\\infty;{{eval:-2*k}}[\\cup]{{eval:2*k}};+\\infty[', [
        erreur(']{{eval:-2*k}};{{eval:2*k}}[', ERR_F4_ENTRE, 'Intérieur des racines'),
        erreur(']{{eval:2*k}};+\\infty[', ERR_F4_NEG, 'Solutions négatives oubliées'),
        erreur(']-\\infty;{{eval:-k}}[\\cup]{{k}};+\\infty[', ERR_F4_RAC, 'Racine de 4k² fausse'),
    ])],
    ['$\\Delta=m^2-4\\times1\\times{{eval:k^2}}=m^2-{{eval:4*k^2}}=(m-{{eval:2*k}})(m+{{eval:2*k}})$.',
     'Deux solutions distinctes $\\iff \\Delta>0$ : un trinôme en $m$ de coefficient $1>0$ est '
     'positif à l\'extérieur de ses racines $-{{eval:2*k}}$ et ${{eval:2*k}}$.',
     'L\'ensemble cherché est $' + PRIMAIRE + '{\\left]-\\infty\\,;-{{eval:2*k}}\\right[\\cup'
     '\\left]{{eval:2*k}}\\,;+\\infty\\right[}$.'],
    F4_HINT))
v = {'k': 3}
f4s += [spec('x² + mx + 9 : |m| > 6', 2, v, 'correct', [']-\\infty;-6[\\cup]6;+\\infty[']),
        spec('Intérieur', 2, v, 'incorrect', [']-6;6['],
             'Entre $-6$ et $6$, $\\Delta < 0$ : aucune solution. $\\Delta = m^2 - 36$ est positif à l\'extérieur de ses racines.'),
        spec('Négatives oubliées', 2, v, 'incorrect', [']6;+\\infty['],
             '$m^2 > 36$ a aussi des solutions négatives : $m<-6$.'),
        spec('Racines ±3', 2, v, 'incorrect', [']-\\infty;-3[\\cup]3;+\\infty['],
             '$\\Delta=m^2-4\\times9$ s\'annule en $\\pm6$, pas en $\\pm3$.')]

ERR_F4_M0 = ('Pour $m=0$, l\'équation devient ${{eval:2*p}}x+1=0$, du premier degré : elle a une '
             'seule solution. $m=0$ convient aussi.')
ERR_F4_M0_4 = '$\\Delta={{eval:4*p^2}}-4m=0$ donne $m={{eval:p^2}}$ (divise par $4$).'
f4.append(variation(
    'Pour quelles valeurs du réel $m$ l\'équation $mx^2+{{eval:2*p}}x+1=0$ a-t-elle exactement '
    'une solution réelle ?\n\nÉcris l\'ensemble de ces valeurs de $m$, entre accolades.\n\n$?$',
    [var('p', '1..3')],
    [case('\\{ 0 ; {{eval:p^2}} \\}', [
        erreur('\\{ {{eval:p^2}} \\}', ERR_F4_M0, 'Cas m = 0 oublié'),
        erreur('\\{ 0 ; {{eval:4*p^2}} \\}', ERR_F4_M0_4, 'Division par 4 oubliée'),
    ])],
    ['Si $m=0$ : l\'équation ${{eval:2*p}}x+1=0$ est du premier degré, elle a une seule solution '
     '$x=-\\dfrac{1}{ {{eval:2*p}} }$. Donc $m=0$ convient.',
     'Si $m\\neq0$ : l\'équation est du second degré, $\\Delta={{eval:4*p^2}}-4m$, et une seule '
     'solution $\\iff \\Delta=0 \\iff m={{eval:p^2}}$.',
     'L\'ensemble cherché est $' + PRIMAIRE + '{\\{ 0 ; {{eval:p^2}} \\}}$.'],
    'Attention au cas où le coefficient de $x^2$ est nul : l\'équation n\'est alors plus du '
    'second degré.'))
v = {'p': 2}
f4s += [spec('mx² + 4x + 1 : {0 ; 4}', 3, v, 'correct', [ens('0', '4')]),
        spec('m = 0 oublié', 3, v, 'incorrect', [ens('4')],
             'Pour $m = 0$, l\'équation devient $4 x + 1 = 0$, du premier degré : elle a une seule solution. $m = 0$ convient aussi.'),
        spec('Oubli /4', 3, v, 'incorrect', [ens('0', '16')],
             '$\\Delta = 16 - 4 m = 0$ donne $m = 4$ (divise par $4$).')]

F4 = modele('Nombre de solutions selon un paramètre',
            'Équation du second degré à paramètre m : valeurs de m pour deux solutions, une seule '
            'ou par le cas m = 0, d\'après le signe du discriminant',
            3, f4, f4s, {'cleanCoefficients': True, 'blankDefaults': {'answerKind': 'intervalles'}})

# =============================================================================================
# F5 — Extremum et variations sur un intervalle [p ; q] (1AL24-1). Point 1SPE-402.
# f(x) = a(x − α)² + β, affichée développée.
# =============================================================================================

F5_F = 'Soit $f$ la fonction définie sur $' + R + '$ par $f(x)={{eval:ax^2+bx+c}}$.'
INTERV = '\\left[{{p}}\\,;{{q}}\\right]'
F5_HINT = ('Cherche d\'abord l\'abscisse du sommet $\\alpha=-\\dfrac{b}{2a}$ : est-elle dans '
           'l\'intervalle ? Elle dit où $f$ change de sens de variation.')
F5_ALPHA = ('$\\alpha=-\\dfrac{b}{2a}=-\\dfrac{ {{b}} }{ {{eval:2*a}} }={{al}}$ et '
            '$f({{al}})={{be}}$ ; comme $a={{a}}$ est {{if:a>0|positif|négatif}}, $f$ est '
            '{{if:a>0|décroissante|croissante}} puis {{if:a>0|croissante|décroissante}}.')
f5 = []
f5s = []

# v0 — α dans [p ; q], a > 0 : minimum β, maximum en la borne la plus éloignée
FP = '{{eval:a*d1^2+be}}'
FQ = '{{eval:a*d2^2+be}}'
ERR_F5_BORNE = ('Le minimum n\'est pas forcément en une borne : $f$ change de sens de variation '
                'en $\\alpha={{al}}$, qui est dans l\'intervalle.')
ERR_F5_ALPHA = ('${{al}}$ est l\'abscisse où le minimum est atteint ; le minimum est la valeur '
                '$f({{al}})$.')
ERR_F5_PROCHE = ('Le maximum est atteint en la borne la plus éloignée de $\\alpha={{al}}$.')
f5.append(variation(
    F5_F + '\n\nSur l\'intervalle $' + INTERV + '$, le minimum de $f$ est $?$ et son maximum est $?$.',
    [X, var('a', '1..3'), var('al', '-4..4'), var('be', '-6..6'), var('d1', '1..3'),
     var('d2', '1..3'), var('p', 'eval:al-d1'), var('q', 'eval:al+d2'), var('b', 'eval:-2*a*al'),
     var('c', 'eval:a*al^2+be')],
    [case('{{be}}', [
        erreur(FP, ERR_F5_BORNE, 'Valeur en la borne gauche'),
        erreur('{{al}}', ERR_F5_ALPHA, 'Abscisse au lieu de la valeur'),
    ]),
     case('{{if:d1>d2|' + FP + '|' + FQ + '}}', [
         erreur('{{if:d1>d2|' + FQ + '|' + FP + '}}', ERR_F5_PROCHE, 'Borne la plus proche'),
         erreur('{{be}}', 'C\'est le minimum : avec $a>0$, $f({{al}})$ est la plus petite valeur.',
                'Minimum donné'),
     ])],
    [F5_ALPHA,
     '${{al}}\\in' + INTERV + '$ : le minimum sur l\'intervalle est $' + PRIMAIRE + '{ {{be}} }$.',
     '$f({{p}})=' + FP + '$ et $f({{q}})=' + FQ + '$ : le maximum est $' + PRIMAIRE
     + '{ {{if:d1>d2|' + FP + '|' + FQ + '}} }$, en la borne la plus éloignée de ${{al}}$.'],
    F5_HINT, ['d1 != d2']))
v = {'a': 1, 'al': 1, 'be': -4, 'd1': 1, 'd2': 3, 'p': 0, 'q': 4, 'b': -2, 'c': -3}
# f(x) = x² − 2x − 3 sur [0 ; 4] : min −4, f(0) = −3, f(4) = 5
f5s += [spec('x² − 2x − 3 sur [0 ; 4]', 0, v, 'correct', ['-4', '5']),
        spec('Min en la borne', 0, v, 'incorrect', ['-3', '5'],
             'Le minimum n\'est pas forcément en une borne : $f$ change de sens de variation en $\\alpha = 1$, qui est dans l\'intervalle.'),
        spec('Abscisse', 0, v, 'incorrect', ['1', '5'],
             '$1$ est l\'abscisse où le minimum est atteint ; le minimum est la valeur $f\\left( 1 \\right)$.'),
        spec('Max en la borne proche', 0, v, 'incorrect', ['-4', '-3'],
             'Le maximum est atteint en la borne la plus éloignée de $\\alpha = 1$.')]

# v1 — α à gauche de [p ; q] : f monotone sur l'intervalle
GP = '{{eval:a*d1^2+be}}'
GQ = '{{eval:a*(d1+d2)^2+be}}'
ERR_F5_HORS = ('$\\beta={{be}}$ est atteint en $\\alpha={{al}}$, qui n\'est pas dans $' + INTERV
               + '$ : sur cet intervalle, $f$ est monotone.')
f5.append(variation(
    F5_F + '\n\nSur l\'intervalle $' + INTERV + '$, le minimum de $f$ est $?$ et son maximum est $?$.',
    [X, var('a', '1..3;±'), var('al', '-4..2'), var('be', '-6..6'), var('d1', '1..3'),
     var('d2', '1..3'), var('p', 'eval:al+d1'), var('q', 'eval:p+d2'), var('b', 'eval:-2*a*al'),
     var('c', 'eval:a*al^2+be')],
    [case('{{if:a>0|' + GP + '|' + GQ + '}}', [
        erreur('{{be}}', ERR_F5_HORS, 'Sommet hors de l\'intervalle'),
        erreur('{{if:a>0|' + GQ + '|' + GP + '}}',
               'Tu as échangé le minimum et le maximum : regarde si $f$ croît ou décroît sur $'
               + INTERV + '$.', 'Min et max échangés'),
    ]),
     case('{{if:a>0|' + GQ + '|' + GP + '}}', [
         erreur('{{be}}', ERR_F5_HORS, 'Sommet hors de l\'intervalle'),
     ])],
    [F5_ALPHA,
     '${{al}}<{{p}}$ : sur $' + INTERV + '$, $f$ est {{if:a>0|croissante|décroissante}}.',
     '$f({{p}})=' + GP + '$ et $f({{q}})=' + GQ + '$ : le minimum est $' + PRIMAIRE
     + '{ {{if:a>0|' + GP + '|' + GQ + '}} }$ et le maximum $' + PRIMAIRE
     + '{ {{if:a>0|' + GQ + '|' + GP + '}} }$.'],
    F5_HINT))
v = {'a': -1, 'al': 0, 'be': 5, 'd1': 1, 'd2': 2, 'p': 1, 'q': 3, 'b': 0, 'c': 5}
# f(x) = −x² + 5 sur [1 ; 3] : décroissante, max f(1) = 4, min f(3) = −4
f5s += [spec('−x² + 5 sur [1 ; 3]', 1, v, 'correct', ['-4', '4']),
        spec('Sommet', 1, v, 'incorrect', ['-4', '5'],
             '$\\beta = 5$ est atteint en $\\alpha = 0$, qui n\'est pas dans $\\left[1\\,;3\\right]$ : sur cet intervalle, $f$ est monotone.'),
        spec('Échangés', 1, v, 'incorrect', ['4', '-4'],
             'Tu as échangé le minimum et le maximum : regarde si $f$ croît ou décroît sur '
             '$\\left[1\\,;3\\right]$.')]

# v2 — tableau de variations sur [p ; q] à compléter (α dedans)
f5.append(variation(
    F5_F + '\n\nComplète son tableau de variations sur $' + INTERV + '$.\n\n'
    + bloc('variation', 'variable: x', 'domain: {{p}}, ?{{al}}, {{q}}', '', 'variation: f(x)',
           '  {{p}}: ?' + FP + ', {{if:a>0|top|bottom}}',
           '  {{al}}: ?{{be}}, {{if:a>0|bottom|top}}',
           '  {{q}}: ?' + FQ + ', {{if:a>0|top|bottom}}',
           '  {{p}},{{al}}: ?flèche',
           '  {{al}},{{q}}: ?flèche'),
    [X, var('a', '1..3;±'), var('al', '-3..3'), var('be', '-6..6'), var('d1', '1..3'),
     var('d2', '1..3'), var('p', 'eval:al-d1'), var('q', 'eval:al+d2'), var('b', 'eval:-2*a*al'),
     var('c', 'eval:a*al^2+be')],
    [],
    [F5_ALPHA,
     '$f({{p}})=' + FP + '$, $f({{al}})={{be}}$ et $f({{q}})=' + FQ + '$.'],
    F5_HINT))
v = {'a': 1, 'al': 1, 'be': -4, 'd1': 1, 'd2': 3, 'p': 0, 'q': 4, 'b': -2, 'c': -3}
f5s += [spec('Tableau de x² − 2x − 3 sur [0 ; 4]', 2, v, 'correct', ['1', '-3', '↘', '-4', '↗', '5']),
        spec('Flèches inversées', 2, v, 'incorrect', ['1', '-3', '↗', '-4', '↘', '5'])]

F5 = modele('Extremum d\'une fonction du second degré sur un intervalle',
            'Minimum et maximum sur [p ; q], sommet dans l\'intervalle ou non ; tableau de '
            'variations sur [p ; q] à compléter', 2, f5, f5s)

# =============================================================================================
# F6 — Comparer deux images sans les calculer (1AL24-3). Point 1SPE-287.
# f(x) = a(x − α)² + β. Choix 0 : f(u) < f(v) ; 1 : = ; 2 : >.
# D = a((u − α)² − (v − α)²) donne la réponse.
# =============================================================================================

F6_F = ('Soit $f$ la fonction définie sur $' + R + '$ par $f(x)=' + coef('a')
        + '(x{{eval:-al;+}})^2{{eval:be;+}}$.\n\nSans calculer ces images, compare '
        '$f({{u}})$ et $f({{v}})$.\n\n')
F6_CHOIX = bloc('choix', 'melanger: non', '- $f({{u}})<f({{v}})$', '- $f({{u}})=f({{v}})$',
                '- $f({{u}})>f({{v}})$')
F6_REP = '{{if:D<0|0|{{if:D==0|1|2}}}}'
F6_HINT = ('La courbe de $f$ est une parabole d\'axe $x={{al}}$ : pense à la symétrie par '
           'rapport à cet axe, et au sens de variation de chaque côté.')
F6_CONCL = ('Donc $' + PRIMAIRE + '{f({{u}}){{if:D<0|<|{{if:D==0|=|>}}}}f({{v}})}$.')
f6 = []
f6s = []
f6.append(variation(
    F6_F + F6_CHOIX,
    [var('a', '1..4;±'), var('al', '-5..5'), var('be', '-9..9'), var('k', '2..9'),
     var('u', 'eval:al-k'), var('v', 'eval:al+k'), var('D', 'eval:a*((u-al)^2-(v-al)^2)')],
    [case(F6_REP)],
    ['La parabole est symétrique par rapport à la droite $x={{al}}$.',
     '${{u}}$ et ${{v}}$ sont à la même distance ${{k}}$ de ${{al}}$, de part et d\'autre : leurs '
     'images sont égales.', F6_CONCL],
    F6_HINT))
f6s += [spec('2(x − 1)² + 3 : f(−3) = f(5)', 0,
             {'a': 2, 'al': 1, 'be': 3, 'k': 4, 'u': -3, 'v': 5, 'D': 0}, 'correct', ['1']),
        spec('Pas égales', 0, {'a': 2, 'al': 1, 'be': 3, 'k': 4, 'u': -3, 'v': 5, 'D': 0},
             'incorrect', ['0'])]

# v1 — du même côté de α (sd = 1 : à droite, −1 : à gauche)
f6.append(variation(
    F6_F + F6_CHOIX,
    [var('a', '1..4;±'), var('al', '-5..5'), var('be', '-9..9'), var('d', '1..5'), var('g', '1..5'),
     var('sd', '1|-1'), var('u', 'eval:al+sd*d'), var('v', 'eval:al+sd*(d+g)'),
     var('D', 'eval:a*((u-al)^2-(v-al)^2)')],
    [case(F6_REP)],
    ['Comme $a={{a}}$ est {{if:a>0|positif|négatif}}, $f$ est {{if:a>0|décroissante|croissante}} '
     'sur $\\left]-\\infty\\,;{{al}}\\right]$ et {{if:a>0|croissante|décroissante}} sur '
     '$\\left[{{al}}\\,;+\\infty\\right[$.',
     '${{u}}$ et ${{v}}$ sont tous deux {{if:sd>0|à droite|à gauche}} de ${{al}}$, sur un intervalle '
     'où $f$ est monotone : l\'ordre des images s\'en déduit.', F6_CONCL],
    F6_HINT))
v = {'a': 1, 'al': 2, 'be': 0, 'd': 1, 'g': 2, 'sd': 1, 'u': 3, 'v': 5, 'D': -8}
f6s += [spec('(x − 2)² : f(3) < f(5)', 1, v, 'correct', ['0']),
        spec('Sens inverse', 1, v, 'incorrect', ['2'])]

# v2 — de part et d'autre de α, à des distances différentes
f6.append(variation(
    F6_F + F6_CHOIX,
    [var('a', '1..4;±'), var('al', '-5..5'), var('be', '-9..9'), var('d', '1..6'), var('g', '1..6'),
     var('u', 'eval:al-d'), var('v', 'eval:al+g'), var('D', 'eval:a*((u-al)^2-(v-al)^2)')],
    [case(F6_REP)],
    ['$f(x)$ ne dépend que de la distance de $x$ à ${{al}}$ : ${{u}}$ en est à ${{d}}$, ${{v}}$ à '
     '${{g}}$.',
     'Avec $a={{a}}$ {{if:a>0|positif, plus on s\'éloigne de l\'axe, plus $f(x)$ est grand|négatif, '
     'plus on s\'éloigne de l\'axe, plus $f(x)$ est petit}}.', F6_CONCL],
    F6_HINT, ['d != g']))
v = {'a': -1, 'al': 0, 'be': 4, 'd': 2, 'g': 5, 'u': -2, 'v': 5, 'D': 21}
f6s += [spec('−x² + 4 : f(−2) > f(5)', 2, v, 'correct', ['2']),
        spec('Sens inverse', 2, v, 'incorrect', ['0'])]

F6 = modele('Comparer deux images d\'une fonction du second degré',
            'f(x) = a(x − α)² + β : comparer deux images par la symétrie de la parabole ou le sens '
            'de variation, sans les calculer', 2, f6, f6s)

# =============================================================================================
# F7 — Se ramener à une inéquation du second degré (1AL24-3). Point 1SPE-250.
# =============================================================================================

f7 = []
f7s = []
F7_HINT = 'Traduis la question par une inéquation, puis étudie le signe du trinôme obtenu.'
ERR_F7_ENTRE = ('Entre ${{r}}$ et ${{s}}$, la différence est négative : la parabole y est en '
                'dessous de la droite.')
ERR_F7_LARGE = ('Aux points d\'intersection, la parabole n\'est pas strictement au-dessus : les '
                'bornes sont exclues.')
f7.append(variation(
    'Dans un repère, on considère la parabole $\\mathcal{P}$ d\'équation $y={{eval:x^2+B*x+C}}$ '
    'et la droite $D$ d\'équation $y={{eval:mm*x+n}}$.\n\nSur quel ensemble la parabole est-elle '
    'strictement au-dessus de la droite ?\n\n$?$',
    [X, var('r', '-5..5'), var('s', '-5..5'), var('mm', '1..3;±'), var('n', '-5..5'),
     var('B', 'eval:mm-(r+s)'), var('C', 'eval:n+r*s')],
    [case(']-\\infty;{{r}}[\\cup]{{s}};+\\infty[', [
        erreur(']{{r}};{{s}}[', ERR_F7_ENTRE, 'Intérieur des racines'),
        erreur(']-\\infty;{{r}}]\\cup[{{s}};+\\infty[', ERR_F7_LARGE, 'Bornes incluses'),
    ])],
    ['$\\mathcal{P}$ est au-dessus de $D$ quand ${{eval:x^2+B*x+C}}>{{eval:mm*x+n}}$, soit '
     '${{eval:x^2-(r+s)*x+r*s}}>0$.',
     'Ce trinôme a pour racines ${{r}}$ et ${{s}}$ ; de coefficient $1>0$, il est positif à '
     'l\'extérieur des racines.',
     'L\'ensemble cherché est $' + PRIMAIRE + '{\\left]-\\infty\\,;{{r}}\\right[\\cup\\left]{{s}}'
     '\\,;+\\infty\\right[}$.'],
    F7_HINT, ['r < s']))
v = {'r': -1, 's': 3, 'mm': 2, 'n': 1, 'B': 0, 'C': -2}  # y = x² − 2 et y = 2x + 1
f7s += [spec('x² − 2 au-dessus de 2x + 1', 0, v, 'correct', [']-\\infty;-1[\\cup]3;+\\infty[']),
        spec('Intérieur', 0, v, 'incorrect', [']-1;3['],
             'Entre $-1$ et $3$, la différence est négative : la parabole y est en dessous de la '
             'droite.'),
        spec('Bornes incluses', 0, v, 'incorrect', [']-\\infty;-1]\\cup[3;+\\infty['],
             'Aux points d\'intersection, la parabole n\'est pas strictement au-dessus : les bornes '
             'sont exclues.')]

SQRT_JUSTE = '{{if:a>0|]-\\infty;{{r}}]\\cup[{{s}};+\\infty[|[{{r}};{{s}}]}}'
SQRT_STRICT = '{{if:a>0|]-\\infty;{{r}}[\\cup]{{s}};+\\infty[|]{{r}};{{s}}[}}'
SQRT_INVERSE = '{{if:a>0|[{{r}};{{s}}]|]-\\infty;{{r}}]\\cup[{{s}};+\\infty[}}'
ERR_F7_ZERO = ('La racine carrée de $0$ existe : les valeurs où le trinôme s\'annule sont dans '
               'l\'ensemble.')
ERR_F7_SIGNE = ('Le trinôme est du signe de $a={{a}}$ à l\'extérieur de ses racines : vérifie où '
                'il est positif.')
f7.append(variation(
    'Soit $g$ la fonction définie par $g(x)=\\sqrt{ {{eval:a*x^2-a*(r+s)*x+a*r*s}} }$.\n\nDonne '
    'son ensemble de définition (intervalles).\n\n$?$',
    [X, var('a', '1..3;±'), var('r', '-5..5'), var('s', '-5..5')],
    [case(SQRT_JUSTE, [
        erreur(SQRT_STRICT, ERR_F7_ZERO, 'Racines exclues'),
        erreur(SQRT_INVERSE, ERR_F7_SIGNE, 'Signe du trinôme'),
    ])],
    ['$g(x)$ existe quand ${{eval:a*x^2-a*(r+s)*x+a*r*s}}\\geqslant0$.',
     'Ce trinôme vaut $' + coef('a') + '(x{{eval:-r;+}})(x{{eval:-s;+}})$ : racines ${{r}}$ et '
     '${{s}}$, du signe de $a={{a}}$ à l\'extérieur.',
     'L\'ensemble de définition est $' + PRIMAIRE + '{ ' + SQRT_JUSTE.replace(']-\\infty', '\\left]-\\infty')
     .replace('+\\infty[', '+\\infty\\right[') + ' }$.'],
    'Une racine carrée n\'existe que pour un nombre positif ou nul : écris l\'inéquation à '
    'résoudre.', ['r < s']))
v = {'a': -1, 'r': -2, 's': 2}  # √(−x² + 4)
f7s += [spec('√(−x² + 4) : [−2 ; 2]', 1, v, 'correct', ['[-2;2]']),
        spec('Racines exclues', 1, v, 'incorrect', [']-2;2['],
             'La racine carrée de $0$ existe : les valeurs où le trinôme s\'annule sont dans '
             'l\'ensemble.'),
        spec('Signe', 1, v, 'incorrect', [']-\\infty;-2]\\cup[2;+\\infty['],
             'Le trinôme est du signe de $a = -1$ à l\'extérieur de ses racines : vérifie où il est positif.')]

ERR_F7_R = 'Le dénominateur s\'annule en ${{r}}$ et en ${{s}}$ : ces deux valeurs sont interdites.'
f7.append(variation(
    'Soit $h$ la fonction définie par $h(x)=\\dfrac{1}{ {{eval:a*x^2-a*(r+s)*x+a*r*s}} }$.\n\n'
    'Donne son ensemble de définition (intervalles, ou $\\mathbb{R}$ privé de valeurs).\n\n$?$',
    [X, var('a', '1..3;±'), var('r', '-5..5'), var('s', '-5..5')],
    [case('\\mathbb{R}\\setminus\\{ {{r}} ; {{s}} \\}', [
        erreur('\\mathbb{R}', ERR_F7_R, 'Valeurs interdites oubliées'),
        erreur('\\mathbb{R}\\setminus\\{ {{eval:-r}} ; {{eval:-s}} \\}',
               'Les valeurs interdites sont les racines du dénominateur, ${{r}}$ et ${{s}}$ : '
               'attention au signe.', 'Signe des racines'),
    ])],
    ['$h(x)$ existe quand ${{eval:a*x^2-a*(r+s)*x+a*r*s}}\\neq0$.',
     'Ce trinôme s\'annule en ${{r}}$ et en ${{s}}$ (son discriminant vaut '
     '${{eval:a^2*(r-s)^2}}$).',
     'L\'ensemble de définition est $' + PRIMAIRE + '{\\mathbb{R}\\setminus\\{ {{r}} ; {{s}} \\}}$.'],
    'Un quotient n\'existe que si son dénominateur n\'est pas nul : cherche les valeurs qui '
    'l\'annulent.', ['r < s', 'r != -s']))
v = {'a': 1, 'r': -1, 's': 3}  # 1/(x² − 2x − 3)
f7s += [spec('1/(x² − 2x − 3)', 2, v, 'correct', ['\\mathbb{R}\\setminus\\{-1;3\\}']),
        spec('En intervalles', 2, v, 'correct', [']-\\infty;-1[\\cup]-1;3[\\cup]3;+\\infty[']),
        spec('ℝ', 2, v, 'incorrect', [R],
             'Le dénominateur s\'annule en $-1$ et en $3$ : ces deux valeurs sont interdites.'),
        spec('Signes', 2, v, 'incorrect', ['\\mathbb{R}\\setminus\\{1;-3\\}'],
             'Les valeurs interdites sont les racines du dénominateur, $-1$ et $3$ : attention au '
             'signe.')]

F7 = modele('Se ramener à une inéquation du second degré',
            'Position d\'une parabole par rapport à une droite, ensemble de définition de √f(x) et '
            'de 1/f(x), f du second degré',
            3, f7, f7s, {'cleanCoefficients': True, 'blankDefaults': {'answerKind': 'intervalles'}})

ecrire('f1-resoudre-equation-ensemble', F1)
ecrire('f2-choisir-la-forme', F2)
ecrire('f3-resoudre-par-forme-canonique', F3)
ecrire('f4-parametre-m', F4)
ecrire('f5-extremum-sur-intervalle', F5)
ecrire('f6-comparer-deux-images', F6)
ecrire('f7-inequation-en-situation', F7)
print('7 modèles écrits dans', DOSSIER)
