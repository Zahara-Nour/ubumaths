"""Ajoute les variations validées aux 4 modèles publiés exportés de prod dans
scripts/questions/idees-1re-exponentielle-publies/ (chantier idees-1re-exponentielle).

Phase 0 : David, le 2026-11-24, « je valide les variations et les modeles » : F7 (6a5e58da),
F8 (68166a11), F9 (227f2c9c), F10 (15d3aaa0). Les variations s'ajoutent À LA FIN (les réponses des
élèves gardent l'indice de leur variation) ; la migration de contenu est générée par
scripts/questions/migration-contenu.ts.

Le script repart du contenu de prod (variations et specs d'origine, comptées dans ORIGINE) :
le relancer réécrit les ajouts sans les doubler.

Pièges : un message d'erreur prévue est réécrit à la résolution (e → \\exponentialE, espaces) :
la spec le compare sous sa forme réécrite (table REECRIT) ; pas de variable `e` (Euler) ;
68166a11 n'a pas de case « intervalles » par défaut : la case des ajouts la porte.

Usage : python3 docs/wip/questions/idees-1re-exponentielle-publies.py scripts/questions/idees-1re-exponentielle-publies
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'

# id court → (variations, specs) d'origine en prod (export du 2026-11-24)
ORIGINE = {'6a5e58da': (4, 17), '68166a11': (3, 6), '227f2c9c': (3, 22), '15d3aaa0': (3, 24)}

# Messages tels que la résolution les réécrit : la spec compare le message résolu.
REECRIT = {"La dérivée d'un produit est $u'v+uv'$ : vérifie $f'(0)$.": "La dérivée d'un produit est $u' v + u v'$ : vérifie $f'\\left( 0 \\right)$.", "L'ordonnée à l'origine de la tangente en $0$ est $f(0)$ : ne l'oublie pas.": "L'ordonnée à l'origine de la tangente en $0$ est $f\\left( 0 \\right)$ : ne l'oublie pas.", "La dérivée de $e^{kx}$ est $ke^{kx}$ : vérifie $f'(0)$.": "La dérivée de $\\exponentialE^{k x}$ est $k \\exponentialE^{k x}$ : vérifie $f'\\left( 0 \\right)$.", "La dérivée de $e^{kx}$ est $ke^{kx}$ : n'oublie pas le facteur $k$.": "La dérivée de $\\exponentialE^{k x}$ est $k \\exponentialE^{k x}$ : n'oublie pas le facteur $k$.", "$1=e^0$ : compare l'exposant à $0$, pas à $1$.": "$1 = \\exponentialE^0$ : compare l'exposant à $0$, pas à $1$."}


def spec(desc, vi, variables_, status, answers, message=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = REECRIT.get(message, message)
    if status in ('unoptimal_form', 'bad_form'):
        expected['constraintViolations'] = ['form']
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables_.items()},
            'expected': expected, 'answers': answers}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def case(attendue, erreurs=None, extra=None):
    c = {'expectedAnswer': attendue}
    if extra:
        c.update(extra)
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
    print(court, ':', len(variations), 'variations,', len(specs), 'specs ajoutées')


X = var('x', 'x|x')
RESOUS = ('Résous dans $\\mathbb{R}$ l\'inéquation $INEQ$.\n\nL\'ensemble des solutions est '
          '$S=?$.')

# =============================================================================================
# F7 — 6a5e58da : seconds membres écrits 1 et 1/e (1AN31-3).
# =============================================================================================

ERR_1_E0 = '$1=e^0$ : compare l\'exposant à $0$, pas à $1$.'
ERR_1SURE = '$\\dfrac{1}{e}=e^{-1}$ : compare l\'exposant à $-1$.'
ERR_SENS = 'Quand on divise par un nombre négatif, le sens de l\'inégalité change.'
ERR_CROCHET_L = 'L\'inégalité est large : la borne fait partie des solutions.'
ERR_CROCHET_S = 'L\'inégalité est stricte : la borne ne fait pas partie des solutions.'
CROISSANTE = ('La fonction exponentielle est **strictement croissante** sur $\\mathbb{R}$ : '
              '$e^u<e^v\\iff u<v$.')

v6a, s6a = [], []
R = '{{eval:-b/a}}'
v6a.append(variation(
    RESOUS.replace('INEQ', 'e^{ {{eval:a*x+b}} }\\leqslant 1'),
    [X, var('a', '2..5;±'), var('b', '1..9;±')],
    [case('{{if:a>0|]-\\infty;' + R + ']|[' + R + ';+\\infty[}}', [
        erreur('{{if:a>0|]-\\infty;{{eval:(1-b)/a}}]|[{{eval:(1-b)/a}};+\\infty[}}', ERR_1_E0,
               '1 lu e¹'),
        erreur('{{if:a>0|[' + R + ';+\\infty[|]-\\infty;' + R + ']}}', ERR_SENS, 'Sens'),
        erreur('{{if:a>0|]-\\infty;' + R + '[|]' + R + ';+\\infty[}}', ERR_CROCHET_L, 'Borne exclue'),
    ])],
    [CROISSANTE,
     '$1=e^0$, donc $e^{ {{eval:a*x+b}} }\\leqslant e^0\\iff {{eval:a*x+b}}\\leqslant 0\\iff '
     'x{{if:a>0|\\leqslant|\\geqslant}}' + R + '$'
     '{{if:a<0| (on divise par ${{a}}<0$ : le sens change)|}}.',
     '$S=' + PRIMAIRE + '{ {{if:a>0|\\left]-\\infty\\,;' + R + '\\right]|\\left[' + R
     + '\\,;+\\infty\\right[}} }$.'],
    'Écris $1$ comme une puissance de $e$, puis compare les exposants.'))
v = {'a': 2, 'b': -6}  # e^{2x−6} ≤ 1 → ]−∞ ; 3]
s6a += [spec('e^{2x−6} ≤ 1 : ]−∞ ; 3]', 0, v, 'correct', [']-\\infty;3]']),
        spec('1 lu e¹', 0, v, 'incorrect', [']-\\infty;\\frac{7}{2}]'], ERR_1_E0),
        spec('Sens', 0, v, 'incorrect', ['[3;+\\infty['], ERR_SENS),
        spec('Borne exclue', 0, v, 'incorrect', [']-\\infty;3['], ERR_CROCHET_L)]
v = {'a': -4, 'b': 2}  # e^{−4x+2} ≤ 1 → [1/2 ; +∞[
s6a += [spec('e^{−4x+2} ≤ 1 : [1/2 ; +∞[', 0, v, 'correct', ['[\\frac{1}{2};+\\infty['])]

R1 = '{{eval:(-1-b)/a}}'
v6a.append(variation(
    RESOUS.replace('INEQ', 'e^{ {{eval:a*x+b}} }>\\dfrac{1}{e}'),
    [X, var('a', '2..5;±'), var('b', '1..9;±')],
    [case('{{if:a>0|]' + R1 + ';+\\infty[|]-\\infty;' + R1 + '[}}', [
        erreur('{{if:a>0|]{{eval:(1-b)/a}};+\\infty[|]-\\infty;{{eval:(1-b)/a}}[}}', ERR_1SURE,
               '1/e lu e¹'),
        erreur('{{if:a>0|]-\\infty;' + R1 + '[|]' + R1 + ';+\\infty[}}', ERR_SENS, 'Sens'),
        erreur('{{if:a>0|[' + R1 + ';+\\infty[|]-\\infty;' + R1 + ']}}', ERR_CROCHET_S, 'Borne incluse'),
    ])],
    [CROISSANTE,
     '$\\dfrac{1}{e}=e^{-1}$, donc $e^{ {{eval:a*x+b}} }>e^{-1}\\iff {{eval:a*x+b}}>-1\\iff '
     'x{{if:a>0|>|<}}' + R1 + '$'
     '{{if:a<0| (on divise par ${{a}}<0$ : le sens change)|}}.',
     '$S=' + PRIMAIRE + '{ {{if:a>0|\\left]' + R1 + '\\,;+\\infty\\right[|\\left]-\\infty\\,;' + R1
     + '\\right[}} }$.'],
    'Écris $\\dfrac{1}{e}$ comme une puissance de $e$, puis compare les exposants.',
    ['b != -1']))
v = {'a': 2, 'b': 5}  # e^{2x+5} > 1/e → ]−3 ; +∞[
s6a += [spec('e^{2x+5} > 1/e : ]−3 ; +∞[', 1, v, 'correct', [']-3;+\\infty[']),
        spec('1/e lu e¹', 1, v, 'incorrect', [']-2;+\\infty['], ERR_1SURE),
        spec('Sens', 1, v, 'incorrect', [']-\\infty;-3['], ERR_SENS),
        spec('Borne incluse', 1, v, 'incorrect', ['[-3;+\\infty['], ERR_CROCHET_S)]

ajouter('6a5e58da', v6a, s6a)

# =============================================================================================
# F8 — 68166a11 : résoudre e^{ax+b} > 0 ou ≤ 0 (1AN31-3).
# =============================================================================================

INTERVALLES = {'answerKind': 'intervalles'}
ERR_EXPOSANT = ('L\'inégalité porte sur l\'exponentielle, pas sur son exposant : une '
                'exponentielle est toujours strictement positive.')
ERR_R = 'Une exponentielle est strictement positive : tous les réels $x$ conviennent.'
ERR_VIDE = 'Une exponentielle est strictement positive : aucun réel $x$ ne convient.'

v681, s681 = [], []
POS = '{{if:a>0|]{{eval:-b/a}};+\\infty[|]-\\infty;{{eval:-b/a}}[}}'
NEG = '{{if:a>0|]-\\infty;{{eval:-b/a}}]|[{{eval:-b/a}};+\\infty[}}'
v681.append(variation(
    RESOUS.replace('INEQ', 'e^{ {{eval:a*x+b}} }>0'),
    [X, var('a', '1..5;±'), var('b', '1..6;±')],
    [case('\\mathbb{R}', [
        erreur(POS, ERR_EXPOSANT, 'Exposant positif'),
        erreur('\\varnothing', ERR_R, 'Aucune solution'),
    ], INTERVALLES)],
    ['Pour tout réel $u$, $e^{u}>0$ : quelle que soit la valeur de $x$, '
     '$e^{ {{eval:a*x+b}} }>0$.',
     'L\'inégalité est vraie pour tout réel $x$ : $S=' + PRIMAIRE + '{\\mathbb{R}}$.'],
    'Quel est le signe d\'une exponentielle ?'))
v = {'a': 2, 'b': -6}
s681 += [spec('e^{2x−6} > 0 : ℝ', 0, v, 'correct', ['\\mathbb{R}']),
         spec(']−∞ ; +∞[ accepté', 0, v, 'correct', [']-\\infty;+\\infty[']),
         spec('Exposant positif', 0, v, 'incorrect', [']3;+\\infty['], ERR_EXPOSANT),
         spec('Aucune solution', 0, v, 'incorrect', ['\\varnothing'], ERR_R)]

v681.append(variation(
    RESOUS.replace('INEQ', 'e^{ {{eval:a*x+b}} }\\leqslant 0'),
    [X, var('a', '1..5;±'), var('b', '1..6;±')],
    [case('\\varnothing', [
        erreur(NEG, ERR_EXPOSANT, 'Exposant négatif'),
        erreur('\\mathbb{R}', ERR_VIDE, 'Tous les réels'),
    ], INTERVALLES)],
    ['Pour tout réel $u$, $e^{u}>0$ : quelle que soit la valeur de $x$, '
     '$e^{ {{eval:a*x+b}} }>0$.',
     'L\'inégalité n\'est vraie pour aucun réel $x$ : $S=' + PRIMAIRE + '{\\varnothing}$.'],
    'Quel est le signe d\'une exponentielle ?'))
v = {'a': -1, 'b': 4}
s681 += [spec('e^{−x+4} ≤ 0 : ∅', 1, v, 'correct', ['\\varnothing']),
         spec('Exposant négatif', 1, v, 'incorrect', ['[4;+\\infty['], ERR_EXPOSANT),
         spec('Tous les réels', 1, v, 'incorrect', ['\\mathbb{R}'], ERR_VIDE)]

ajouter('68166a11', v681, s681)

# =============================================================================================
# F9 — 227f2c9c : dériver ae^{kx} + bx + c (1AN32-2, cas 2).
# =============================================================================================

ERR_K = 'La dérivée de $e^{kx}$ est $ke^{kx}$ : n\'oublie pas le facteur $k$.'
ERR_A = 'Le coefficient devant l\'exponentielle reste : la dérivée de $a\\,e^{kx}$ est $ak\\,e^{kx}$.'
ERR_C = 'La dérivée d\'une constante est nulle.'

v227, s227 = [], []
v227.append(variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)={{a}}e^{ {{eval:k*x}} }{{eval:b*x+c;+}}$.'
    '\n\nCalcule $f\'(x)$.\n\n$f\'(x)=?$',
    [X, var('a', '2..9;±'), var('k', '2..6;±'), var('b', '1..6;±'), var('c', '1..6;±')],
    [case('{{eval:a*k}}e^{ {{eval:k*x}} }{{b;+}}', [
        erreur('{{a}}e^{ {{eval:k*x}} }{{b;+}}', ERR_K, 'Facteur k oublié'),
        erreur('{{k}}e^{ {{eval:k*x}} }{{b;+}}', ERR_A, 'Coefficient a oublié'),
        erreur('{{eval:a*k}}e^{ {{eval:k*x}} }{{eval:b+c;+}}', ERR_C, 'Constante gardée'),
    ])],
    ['La dérivée de $x\\mapsto e^{ {{eval:k*x}} }$ est $x\\mapsto {{k}}e^{ {{eval:k*x}} }$ : '
     'celle de ${{a}}e^{ {{eval:k*x}} }$ est ${{a}}\\times{{k;()}}e^{ {{eval:k*x}} }'
     '={{eval:a*k}}e^{ {{eval:k*x}} }$.',
     'La dérivée de ${{eval:b*x+c}}$ est ${{b}}$.',
     'Donc $f\'(x)=' + PRIMAIRE + '{ {{eval:a*k}}e^{ {{eval:k*x}} }{{b;+}} }$.'],
    'Dérive terme à terme : $(e^{kx})\'=ke^{kx}$, et un coefficient devant une fonction reste.',
    ['a != k', 'b+c != 0']))
v = {'a': 3, 'k': -2, 'b': 4, 'c': -1}  # 3e^{−2x} + 4x − 1 → −6e^{−2x} + 4
s227 += [spec('3e^{−2x} + 4x − 1 : −6e^{−2x} + 4', 0, v, 'correct', ['-6e^{-2x}+4']),
         spec('Ordre inverse', 0, v, 'correct', ['4-6e^{-2x}']),
         spec('Facteur k oublié', 0, v, 'incorrect', ['3e^{-2x}+4'], ERR_K),
         spec('Coefficient a oublié', 0, v, 'incorrect', ['-2e^{-2x}+4'], ERR_A),
         spec('Constante gardée', 0, v, 'incorrect', ['-6e^{-2x}+3'], ERR_C)]

ajouter('227f2c9c', v227, s227)

# =============================================================================================
# F10 — 15d3aaa0 : tangente en 0 à (ax + b)e^{kx} (1AN33-1, question 3).
# f(0) = b, f′(x) = (kax + a + kb)e^{kx}, f′(0) = a + kb.
# =============================================================================================

ERR_VP = 'La dérivée d\'un produit est $u\'v+uv\'$ : vérifie $f\'(0)$.'
ERR_F0 = 'L\'ordonnée à l\'origine de la tangente en $0$ est $f(0)$ : ne l\'oublie pas.'
ERR_KT = 'La dérivée de $e^{kx}$ est $ke^{kx}$ : vérifie $f\'(0)$.'

v15d, s15d = [], []
v15d.append(variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=({{eval:a*x+b}})e^{ {{eval:k*x}} }$, '
    'de courbe $\\mathcal{C}_f$.\n\nDonne l\'équation réduite de la tangente $T$ à $\\mathcal{C}_f$ '
    'au point d\'abscisse $0$.\n\n$y=?$',
    [X, var('a', '1..5;±'), var('b', '1..5;±'), var('k', '2..3;±')],
    [case('{{eval:(a+k*b)*x+b}}', [
        erreur('{{eval:a*x+b}}', ERR_VP, 'uv′ oublié'),
        erreur('{{eval:(a+k*b)*x}}', ERR_F0, 'f(0) oublié'),
        erreur('{{eval:(a+b)*x+b}}', ERR_KT, 'Facteur k oublié'),
    ])],
    ['$f(0)=({{b}})e^0={{b}}$.',
     '$f=uv$ avec $u(x)={{eval:a*x+b}}$ et $v(x)=e^{ {{eval:k*x}} }$ : '
     '$f\'(x)={{a}}e^{ {{eval:k*x}} }+({{eval:a*x+b}})\\times{{k;()}}e^{ {{eval:k*x}} }$, donc '
     '$f\'(0)={{a}}+{{b;()}}\\times{{k;()}}={{eval:a+k*b}}$.',
     '$T$ : $y=f\'(0)(x-0)+f(0)$, soit $y=' + PRIMAIRE + '{ {{eval:(a+k*b)*x+b}} }$.'],
    'Calcule $f(0)$ et $f\'(0)$, puis utilise $y=f\'(0)\\,x+f(0)$.',
    ['a+k*b != 0', 'a+b != a+k*b', 'a+b != 0']))
v = {'a': 2, 'b': 3, 'k': -2}  # (2x + 3)e^{−2x} : f(0) = 3, f′(0) = 2 − 6 = −4 → y = −4x + 3
s15d += [spec('(2x + 3)e^{−2x} : y = −4x + 3', 0, v, 'correct', ['-4x+3']),
         spec('uv′ oublié', 0, v, 'incorrect', ['2x+3'], ERR_VP),
         spec('f(0) oublié', 0, v, 'incorrect', ['-4x'], ERR_F0),
         spec('Facteur k oublié', 0, v, 'incorrect', ['5x+3'], ERR_KT)]

ajouter('15d3aaa0', v15d, s15d)
