"""Écrit les modèles neufs du chantier idees-3e-fonctions-affines dans
scripts/questions/idees-3e-fonctions-affines-neufs/.

Phase 0 validée par David le 2026-11-24 (« je suis tes recos » ; journal
docs/archive/wip/idees-3e-fonctions-affines/idees-3e-fonctions-affines-progress.md, § Phase 0) : N1 à N4, Q1 (N2 au point de Seconde
2-322, grades 3 et 2), Q3 (N1 : seule forme fractionnaire x/c + b).

Rangement (lu par migration-rangement.ts) :
- N1, N3 : « Fonctions > Fonctions affines > coefficient directeur et ordonnée à l'origine »,
  points 3-044 et 3-067 ;
- N2 : « Géométrie > Géométrie repérée > équations de droites », point 2-322 (conséquence de Q1,
  à redire à David avant la migration de rangement : journal, § Phase 0) ;
- N4 : « Fonctions > Généralités sur les fonctions » (notion), point 3-039.

Ni theme, ni domain, ni subdomain, ni id : create-questions --publier écrit l'id.

Règles suivies (couvrir-un-niveau.md § 5) : erreurs prévues par case d'écriture ordinaire (de
vraies erreurs d'élèves), chacune avec sa spec `incorrect` qui nomme son message ; un coup de pouce
par variation, qui ne donne jamais la réponse. Case de geste (N4, `tracer:`) : pas d'erreurs
prévues (la nature les exclut).

Comment les cases sont jugées (lu dans le code le 2026-11-24) :
- Case « f(x) = ? » (N2, N3) : case ordinaire. Valeur par équivalence (`areEquivalent`), puis
  forme en mode exact (`checkForm` de src/lib/mathAST/cosmetic-transforms.ts) : réponse et
  attendue passent les mêmes retouches, dont `sortTermsAndFactorsAST` (tri des termes), puis
  sont comparées. Donc 2x − 3 et −3 + 2x sont justes tous deux ; 2x + x − 3 (non réduite) est
  refusée (`form` strict par défaut, ADR 0013). Une erreur prévue se juge sur la valeur seule
  (`expected-errors.ts`, `isBlankValueCorrect`) : une expression en x de même valeur déclenche le
  message.
- Droite à tracer (N4) : `isTracedLineCorrect` (src/lib/ubumark/utils/courbe-tracer.ts) : deux
  points distincts posés sur la droite de l'équation `tracer:`, n'importe lesquels ; réponse de la
  case `x1;y1/x2;y2`.

Choix d'écriture :
- Expressions de l'énoncé écrites à la main (`{{a}}x{{b;+}}`) avec des coefficients ≥ 2 en valeur
  absolue ; N4 a des coefficients ±1 : `shared.cleanCoefficients` (1x → x), comme 216555e7.
- Réponses attendues en x par `{{eval:…}}` avec la variable x = 'x|x'.
- N1 : deux cases dans une phrase (« a = ? et b = ? »). Erreur « signe » écrite `abs(a)` : sur un
  tirage où a > 0, elle vaut la bonne réponse et elle est ignorée.
- N2 : les deux points sont tirés pour rester dans [−5 ; 5] ; les quotients du corrigé mettent les
  négatifs entre parenthèses (`{{eval:y1;()}}`).
- N3 : fenêtre resserrée autour de (0 ; b) et (1 ; a + b) (ou (2 ; n + b) pour les demis), x de
  −5 à 5, y de min(−1, b, a + b) − 3 à max(1, b, a + b) + 3.
- N4 : repère de −5 à 5 ; au moins deux nœuds visibles toujours (le plus petit de |a + b| et
  |b − a| vaut ||a| − |b|| ≤ 2).

Pièges et écarts (dits dans le rapport) : voir les commentaires de chaque variation.

Usage : python3 docs/wip/questions/idees-3e-fonctions-affines-neufs.py scripts/questions/idees-3e-fonctions-affines-neufs
"""
import json
import os
import re
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
X = {'name': 'x', 'expression': 'x|x'}

RANGEMENT = {
    'n1-coefficients-sur-l-expression': (
        'Fonctions > Fonctions affines > coefficient directeur et ordonnée à l\'origine', '3-044'),
    'n2-affine-par-deux-images': (
        'Géométrie > Géométrie repérée > équations de droites', '2-322'),
    'n3-expression-lue-sur-la-droite': (
        'Fonctions > Fonctions affines > coefficient directeur et ordonnée à l\'origine', '3-067'),
    'n4-representer-une-fonction-affine': ('Fonctions > Généralités sur les fonctions', '3-039'),
}


# =============================================================================================
# Outils (repris du gabarit idees-3e-fonctions-neufs.py)
# =============================================================================================

def spec(desc, vi, variables_, status, answers, message=None, violations=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = rw(message)
    if violations is not None:
        expected['constraintViolations'] = violations
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables_.items()},
            'expected': expected, 'answers': answers}


def modele(title, description, level, delay, variations, specs, grades=None, options=None,
           shared=None):
    m = {'title': title, 'description': description, 'grades': grades or ['3'], 'level': level,
         'delay': delay, 'status': 'draft'}
    if options:
        m['options'] = options
    if shared:
        m['shared'] = shared
    m['variations'] = variations
    m['testSpecs'] = specs
    return m


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
    v = {'statement': statement, 'variables': variables, 'conditions': conditions or []}
    if blanks is not None:
        v['blanks'] = blanks
    v['correction'] = {'steps': steps}
    v['hint'] = hint
    return v


def couleur(contenu):
    return PRIMAIRE + '{' + contenu + '}'


def ecrire(nom, m):
    os.makedirs(DOSSIER, exist_ok=True)
    chemin = os.path.join(DOSSIER, nom + '.json')
    # Garder l'id écrit en tête par create-questions --publier, s'il existe
    if os.path.exists(chemin):
        with open(chemin, encoding='utf-8') as f:
            ancien = json.load(f)
        if 'id' in ancien:
            m = {'id': ancien['id'], **m}
    noeud, point = RANGEMENT[nom]
    tete = {k: m[k] for k in ('id',) if k in m}
    m = {**tete, 'rangement': {'noeud': noeud, 'point': point},
         **{k: v for k, v in m.items() if k != 'id'}}
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write('\n')


def resoudre(texte, v):
    """Remplace les {{nom}} simples d'un message par leur valeur (pour les specs)."""
    return rw(re.sub(r'\{\{(\w+)\}\}', lambda mo: str(v[mo.group(1)]), texte))


# Le message est réécrit à la résolution (couvrir-un-niveau.md § 5) : la spec le nomme sous sa
# forme réécrite. Le modèle garde l'écriture lisible.
REECRITURES = [
    ('$f(x)=ax+b$', '$f\\left( x \\right) = a x + b$'),
]


def rw(texte):
    for avant, apres in REECRITURES:
        texte = texte.replace(avant, apres)
    return texte


def specs_erreurs(vi, v, erreurs_py, desc):
    """Une spec `incorrect` par erreur prévue d'une case unique : (réponse, message, nom)."""
    return [spec(desc + ' : ' + nom, vi, v, 'incorrect', [rep], resoudre(msg, v))
            for rep, msg, nom in erreurs_py]


def deux_cases(vi, v, juste, erreurs_a, erreurs_b, desc):
    """Specs d'erreurs d'un modèle à deux cases : la case fautive, l'autre juste."""
    out = []
    for rep, msg, nom in erreurs_a:
        out.append(spec(desc + ' : ' + nom, vi, v, 'incorrect', [rep, juste[1]],
                        resoudre(msg, v)))
    for rep, msg, nom in erreurs_b:
        out.append(spec(desc + ' : ' + nom, vi, v, 'incorrect', [juste[0], rep],
                        resoudre(msg, v)))
    return out


# =============================================================================================
# N1 — 3-044 : lire le coefficient directeur et l'ordonnée à l'origine sur l'expression.
# Deux cases dans une phrase. v0 b + ax ; v1 ax ; v2 b ; v3 x/c + b ; v4 c(ax + b) ; v5 ax + b + cx.
# =============================================================================================

QUESTION_N1 = ('\n\nSon coefficient directeur est $a=?$ et son ordonnée à l\'origine est '
               '$b=?$.')
ENONCE_N1 = 'On considère la fonction affine $f$ définie par $f(x)={F}$.' + QUESTION_N1
RAPPEL_N1 = ('Une fonction affine s\'écrit $f(x)=ax+b$ : le **coefficient directeur** $a$ est le '
             'nombre qui multiplie $x$, l\'**ordonnée à l\'origine** $b$ est le terme sans $x$.')

M1_INV_A = ('Tu as donné l\'ordonnée à l\'origine : le coefficient directeur est le nombre qui '
            'multiplie $x$.')
M1_INV_B = ('Tu as donné le coefficient directeur : l\'ordonnée à l\'origine est le terme sans '
            '$x$.')
M1_SIGNE_A = 'Le signe placé devant $x$ fait partie du coefficient directeur.'
M1_SIGNE_B = 'Le signe placé devant le terme sans $x$ fait partie de l\'ordonnée à l\'origine.'
M1_DEV = ('Développe d\'abord l\'expression : le nombre devant la parenthèse multiplie chacun '
          'de ses termes.')
M1_INVERSE = ('Diviser $x$ par un nombre, c\'est le multiplier par l\'inverse de ce nombre.')
M1_REDUIRE = 'Réduis d\'abord l\'expression : elle contient deux termes en $x$.'

HINT_N1 = ('Écris d\'abord $f(x)$ sous la forme $ax+b$ : $a$ est le nombre qui multiplie $x$, '
           '$b$ le terme sans $x$.')
COEFS = '2..9;±'

N1_V0 = variation(
    # b + ax : l'ordre inhabituel ; a ± couvre aussi b − ax (signe de a à lire)
    ENONCE_N1.format(F='{{b}}{{a;+}}x'),
    [var('a', COEFS), var('b', COEFS)],
    [
        case('{{a}}', [
            erreur('{{b}}', M1_INV_A, 'a et b inversés'),
            # Vaut la bonne réponse quand a > 0 : ignorée sur ces tirages
            erreur('{{eval:abs(a)}}', M1_SIGNE_A, 'Signe de a oublié (b − ax)'),
        ]),
        case('{{b}}', [
            erreur('{{a}}', M1_INV_B, 'a et b inversés'),
            erreur('{{eval:abs(b)}}', M1_SIGNE_B, 'Signe de b oublié'),
        ]),
    ],
    [
        RAPPEL_N1,
        'L\'ordre des termes ne change rien : $f(x)={{b}}{{a;+}}x={{a}}x{{b;+}}$, donc '
        '$a=' + couleur('{{a}}') + '$ et $b=' + couleur('{{b}}') + '$.',
    ],
    HINT_N1,
    # Les erreurs de chaque case ont des valeurs distinctes
    ['abs(a)!=abs(b)'],
)

N1_V1 = variation(
    ENONCE_N1.format(F='{{a}}x'),
    [var('a', COEFS)],
    [
        case('{{a}}', [erreur('0', M1_INV_A, 'a et b inversés')]),
        case('0', [erreur('{{a}}', M1_INV_B, 'a et b inversés')]),
    ],
    [
        RAPPEL_N1,
        '$f(x)={{a}}x={{a}}x+0$ : $a=' + couleur('{{a}}') + '$ et $b=' + couleur('0')
        + '$ (la fonction est linéaire).',
    ],
    HINT_N1,
)

N1_V2 = variation(
    ENONCE_N1.format(F='{{b}}'),
    [var('b', COEFS)],
    [
        case('0', [erreur('{{b}}', M1_INV_A, 'a et b inversés')]),
        case('{{b}}', [erreur('0', M1_INV_B, 'a et b inversés')]),
    ],
    [
        RAPPEL_N1,
        '$f(x)={{b}}=0x{{b;+}}$ : $a=' + couleur('0') + '$ et $b=' + couleur('{{b}}')
        + '$ (la fonction est constante).',
    ],
    'Écris $f(x)$ sous la forme $ax+b$ : combien de fois $x$ y a-t-il dans l\'expression ?',
)

N1_V3 = variation(
    # Q3 : une seule forme fractionnaire, x/c + b (a = 1/c). Décimal accepté (0,5 pour 1/2).
    ENONCE_N1.format(F='\\dfrac{x}{ {{c}} }{{b;+}}'),
    [var('c', '2..9'), var('b', COEFS)],
    [
        case('\\frac{1}{ {{c}} }', [
            erreur('{{c}}', M1_INVERSE, 'c pour 1/c'),
            erreur('{{b}}', M1_INV_A, 'a et b inversés'),
        ], acceptDecimal=True),
        case('{{b}}', [erreur('\\frac{1}{ {{c}} }', M1_INV_B, 'a et b inversés')]),
    ],
    [
        RAPPEL_N1,
        'Diviser par ${{c}}$, c\'est multiplier par $\\dfrac{1}{ {{c}} }$ : '
        '$f(x)=\\dfrac{1}{ {{c}} }x{{b;+}}$, donc $a=' + couleur('\\dfrac{1}{ {{c}} }')
        + '$ et $b=' + couleur('{{b}}') + '$.',
    ],
    'Diviser $x$ par un nombre, c\'est le multiplier par l\'inverse de ce nombre.',
    ['b!=c'],
)

N1_V4 = variation(
    ENONCE_N1.format(F='{{c}}({{a}}x{{b;+}})'),
    [var('c', COEFS), var('a', COEFS), var('b', COEFS)],
    [
        case('{{eval:c*a}}', [
            erreur('{{a}}', M1_DEV, 'Lu sans développer'),
            erreur('{{eval:c*b}}', M1_INV_A, 'a et b inversés'),
        ]),
        case('{{eval:c*b}}', [
            erreur('{{b}}', M1_DEV, 'Lu sans développer'),
            erreur('{{eval:c*a}}', M1_INV_B, 'a et b inversés'),
        ]),
    ],
    [
        RAPPEL_N1,
        'On développe : $f(x)={{c}}\\times{{eval:a;()}}x{{c;+}}\\times{{eval:b;()}}'
        '={{eval:c*a}}x{{eval:c*b;+}}$.',
        'Donc $a=' + couleur('{{eval:c*a}}') + '$ et $b=' + couleur('{{eval:c*b}}') + '$.',
    ],
    HINT_N1,
    # Erreurs de chaque case distinctes ; a ≠ b pour que l'inversion soit une erreur
    ['a!=c*b', 'b!=c*a', 'a!=b'],
)

N1_V5 = variation(
    ENONCE_N1.format(F='{{a}}x{{b;+}}{{c;+}}x'),
    [var('a', COEFS), var('b', COEFS), var('c', COEFS)],
    [
        case('{{eval:a+c}}', [
            erreur('{{a}}', M1_REDUIRE, 'Terme cx oublié'),
            erreur('{{b}}', M1_INV_A, 'a et b inversés'),
        ]),
        case('{{b}}', [erreur('{{eval:a+c}}', M1_INV_B, 'a et b inversés')]),
    ],
    [
        RAPPEL_N1,
        'On réduit : $f(x)={{a}}x{{c;+}}x{{b;+}}={{eval:a+c}}x{{b;+}}$.',
        'Donc $a=' + couleur('{{eval:a+c}}') + '$ et $b=' + couleur('{{b}}') + '$.',
    ],
    HINT_N1,
    # a + c ≠ 0 (sinon constante), ±1 (pas de « 1x » au corrigé) ; erreurs distinctes
    ['a+c!=0', 'abs(a+c)!=1', 'a!=b', 'b!=a+c'],
)


def specs_n1():
    s = []
    # v0 : f(x) = 5 − 3x
    v = {'a': -3, 'b': 5}
    s += [
        spec('v0 : f(x) = 5 − 3x', 0, v, 'correct', ['-3', '5']),
        spec('v0 : les deux faux', 0, v, 'incorrect', ['2', '1']),
    ]
    s += deux_cases(0, v, ['-3', '5'],
                    [('5', M1_INV_A, 'a et b inversés'), ('3', M1_SIGNE_A, 'signe de a')],
                    [('-3', M1_INV_B, 'a et b inversés')], 'v0')
    v = {'a': 4, 'b': -7}
    s += [spec('v0 : f(x) = −7 + 4x', 0, v, 'correct', ['4', '-7'])]
    s += deux_cases(0, v, ['4', '-7'], [], [('7', M1_SIGNE_B, 'signe de b')], 'v0')
    # v1 : f(x) = −6x
    v = {'a': -6}
    s += [spec('v1 : f(x) = −6x', 1, v, 'correct', ['-6', '0'])]
    s += deux_cases(1, v, ['-6', '0'], [('0', M1_INV_A, 'inversés')],
                    [('-6', M1_INV_B, 'inversés')], 'v1')
    # v2 : f(x) = 8
    v = {'b': 8}
    s += [spec('v2 : f(x) = 8', 2, v, 'correct', ['0', '8'])]
    s += deux_cases(2, v, ['0', '8'], [('8', M1_INV_A, 'inversés')],
                    [('0', M1_INV_B, 'inversés')], 'v2')
    # v3 : f(x) = x/4 − 3
    v = {'c': 4, 'b': -3}
    s += [
        spec('v3 : f(x) = x/4 − 3', 3, v, 'correct', ['\\frac{1}{4}', '-3']),
        spec('v3 : 0,25 accepté', 3, v, 'correct', ['0{,}25', '-3']),
    ]
    s += deux_cases(3, v, ['\\frac{1}{4}', '-3'],
                    [('4', M1_INVERSE, 'c pour 1/c'), ('-3', M1_INV_A, 'inversés')],
                    [('\\frac{1}{4}', M1_INV_B, 'inversés')], 'v3')
    # v4 : f(x) = −2(3x − 5) = −6x + 10
    v = {'c': -2, 'a': 3, 'b': -5}
    s += [spec('v4 : f(x) = −2(3x − 5)', 4, v, 'correct', ['-6', '10'])]
    s += deux_cases(4, v, ['-6', '10'],
                    [('3', M1_DEV, 'sans développer'), ('10', M1_INV_A, 'inversés')],
                    [('-5', M1_DEV, 'sans développer'), ('-6', M1_INV_B, 'inversés')], 'v4')
    # v5 : f(x) = 4x − 3 + 5x = 9x − 3
    v = {'a': 4, 'b': -3, 'c': 5}
    s += [spec('v5 : f(x) = 4x − 3 + 5x', 5, v, 'correct', ['9', '-3'])]
    s += deux_cases(5, v, ['9', '-3'],
                    [('4', M1_REDUIRE, 'cx oublié'), ('-3', M1_INV_A, 'inversés')],
                    [('9', M1_INV_B, 'inversés')], 'v5')
    v = {'a': -7, 'b': 2, 'c': 3}
    s.append(spec('v5 : f(x) = −7x + 2 + 3x', 5, v, 'correct', ['-4', '2']))
    return s


N1 = modele(
    'Lire les coefficients d\'une fonction affine sur son expression',
    'Coefficient directeur et ordonnée à l\'origine lus sur b + ax, ax, b, x/c + b, c(ax + b) '
    'à développer, ax + b + cx à réduire (pièges : a et b inversés, signe oublié, lecture sans '
    'développer, c pour 1/c)',
    1, 60, [N1_V0, N1_V1, N1_V2, N1_V3, N1_V4, N1_V5], specs_n1())


# =============================================================================================
# N2 — 2-322 (grades 3 et 2) : déterminer une fonction affine par deux images. Une case
# f(x) = …. v0 f(0) = b et f(x0) = y0 ; v1 x2 = x1 + 1 ; v2 quelconque ; v3 constante.
# =============================================================================================

ENONCE_N2 = ('$f$ est une fonction affine telle que $f({X1})={Y1}$ et $f({X2})={Y2}$.\n\n'
             'Donne l\'expression de $f(x)$.\n\n$f(x)=?$')
HINT_N2 = ('Le coefficient directeur se calcule avec les deux images : différence des images '
           'divisée par la différence des nombres de départ. Puis cherche $b$ avec l\'une des '
           'deux images.')

M2_RENV = ('Le coefficient directeur, c\'est la différence des images divisée par la différence '
           'des nombres de départ, pas l\'inverse.')
M2_B_OUBLIE = ('Tu as oublié l\'ordonnée à l\'origine : une fonction affine s\'écrit '
               '$f(x)=ax+b$.')
M2_B_IMAGE = ('Tu as pris une image donnée pour l\'ordonnée à l\'origine : $b$ est l\'image de '
              '$0$, calcule-le à partir de l\'une des deux images.')
M2_CONSTANTE = ('Les deux images sont égales : le coefficient directeur est nul, la fonction est '
                'constante.')

AFFINE = '{{eval:a*x+b}}'
# Affichage écrit à la main (eval réordonne « −x + 4 » en « 4 − x ») ; coefficients 1 et −1 par
# trois {{if:}} à plat (cleanCoefficients ne nettoie pas une formule dans \textcolor)
COEF_X = '{{if:a==1|x|}}{{if:a==-1|-x|}}{{if:a*a>1|{{a}}x|}}'
AFFICHE = COEF_X + '{{b;+}}'
DEMI = '{{if:n<0|-}}\\dfrac{ {{eval:abs(n)}} }{2}'


def quotient_n2(x1, y1, x2, y2):
    """Le calcul du coefficient directeur, négatifs entre parenthèses."""
    return ('$$a=\\dfrac{f(' + x2 + ')-f(' + x1 + ')}{' + x2 + '-' + x1p(x1) + '}'
            '=\\dfrac{' + y2 + '-' + x1p(y1) + '}{' + x2 + '-' + x1p(x1) + '}'
            '=\\dfrac{ {{eval:' + strip(y2) + '-' + strip(y1) + '}} }'
            '{ {{eval:' + strip(x2) + '-' + strip(x1) + '}} }=' + couleur('{{a}}') + '$$')


def strip(g):
    """`{{x1}}` → `x1` (nom de variable d'un gabarit simple)."""
    return g.strip('{}')


def x1p(g):
    """La valeur d'une variable, entre parenthèses si négative."""
    return '{{eval:' + strip(g) + ';()}}'


N2_V0 = variation(
    # f(0) = b donné en premier ; « b = y0 » est l'erreur « b pris pour une image donnée »
    ENONCE_N2.format(X1='0', Y1='{{b}}', X2='{{x0}}', Y2='{{y0}}'),
    [X, var('a', '1..4;±'), var('b', '1..5;±'), var('x0', '1..5;±'), var('y0', 'eval:a*x0+b')],
    [case(AFFINE, [
        erreur('{{eval:x/a+b}}', M2_RENV, 'Quotient renversé'),
        erreur('{{eval:a*x}}', M2_B_OUBLIE, 'b oublié'),
        erreur('{{eval:a*x+y0}}', M2_B_IMAGE, 'b = y₀ sans retrancher a·x₀'),
    ])],
    [
        '$f(0)={{b}}$ : l\'ordonnée à l\'origine est $b=' + couleur('{{b}}') + '$.',
        'Le coefficient directeur :',
        '$$a=\\dfrac{f({{x0}})-f(0)}{ {{x0}}-0 }=\\dfrac{ {{y0}}-{{eval:b;()}} }{ {{x0}} }'
        '=\\dfrac{ {{eval:y0-b}} }{ {{x0}} }=' + couleur('{{a}}') + '$$',
        'Donc $f(x)=' + couleur(AFFICHE) + '$.',
    ],
    'L\'image de $0$ donne directement l\'ordonnée à l\'origine. Pour le coefficient directeur, '
    'divise la différence des images par la différence des nombres de départ.',
    # Images dans [−5 ; 5] ; y0 ≠ 0 pour que « b oublié » et « b = y0 » diffèrent
    ['abs(y0)<=5', 'y0!=0'],
)

N2_V1 = variation(
    # x2 = x1 + 1 : a se lit comme la différence des images
    ENONCE_N2.format(X1='{{x1}}', Y1='{{y1}}', X2='{{x2}}', Y2='{{y2}}'),
    [X, var('a', '1..4;±'), var('b', '1..5;±'), var('x1', '1..4;±'), var('x2', 'eval:x1+1'),
     var('y1', 'eval:a*x1+b'), var('y2', 'eval:a*x2+b')],
    [case(AFFINE, [
        erreur('{{eval:x/a+y1-x1/a}}', M2_RENV, 'Quotient renversé'),
        erreur('{{eval:a*x}}', M2_B_OUBLIE, 'b oublié'),
        erreur('{{eval:a*x+y1}}', M2_B_IMAGE, 'b = y₁ sans retrancher a·x₁'),
    ])],
    [
        'Le coefficient directeur : les nombres de départ ne diffèrent que de $1$.',
        quotient_n2('{{x1}}', '{{y1}}', '{{x2}}', '{{y2}}'),
        'Puis $f({{x1}})={{y1}}$ : ${{a}}\\times{{eval:x1;()}}+b={{y1}}$, donc '
        '$b={{y1}}-{{eval:a*x1;()}}=' + couleur('{{b}}') + '$.',
        'Donc $f(x)=' + couleur(AFFICHE) + '$.',
    ],
    HINT_N2,
    # x2 ≠ 0 (sinon c'est v0), images dans [−5 ; 5], y1 ≠ 0 (b oublié ≠ b = y1)
    ['x2!=0', 'abs(y1)<=5', 'abs(y2)<=5', 'y1!=0'],
)

N2_V2 = variation(
    ENONCE_N2.format(X1='{{x1}}', Y1='{{y1}}', X2='{{x2}}', Y2='{{y2}}'),
    [X, var('a', '1..3;±'), var('b', '1..5;±'), var('x1', '1..5;±'), var('d', '2..4'),
     var('x2', 'eval:x1+d'), var('y1', 'eval:a*x1+b'), var('y2', 'eval:a*x2+b')],
    [case(AFFINE, [
        erreur('{{eval:d/(y2-y1)*x+y1-d/(y2-y1)*x1}}', M2_RENV, 'Quotient renversé'),
        erreur('{{eval:a*x}}', M2_B_OUBLIE, 'b oublié'),
        erreur('{{eval:a*x+y1}}', M2_B_IMAGE, 'b = y₁ sans retrancher a·x₁'),
    ])],
    [
        'Le coefficient directeur :',
        quotient_n2('{{x1}}', '{{y1}}', '{{x2}}', '{{y2}}'),
        'Puis $f({{x1}})={{y1}}$ : ${{a}}\\times{{eval:x1;()}}+b={{y1}}$, donc '
        '$b={{y1}}-{{eval:a*x1;()}}=' + couleur('{{b}}') + '$.',
        'Donc $f(x)=' + couleur(AFFICHE) + '$.',
    ],
    HINT_N2,
    ['x2!=0', 'abs(x2)<=5', 'abs(y1)<=5', 'abs(y2)<=5', 'y1!=0'],
)

N2_V3 = variation(
    # Constante : pas de quotient renversé (division par 0) ; erreurs « kx » et « 0 »
    ENONCE_N2.format(X1='{{x1}}', Y1='{{k}}', X2='{{x2}}', Y2='{{k}}'),
    [X, var('k', '1..5;±'), var('x1', '1..5;±'), var('d', '1..4'), var('x2', 'eval:x1+d')],
    [case('{{k}}', [
        erreur('{{eval:k*x}}', M2_CONSTANTE, 'k pris pour le coefficient directeur'),
        erreur('0', M2_B_OUBLIE, 'b oublié'),
    ])],
    [
        'Le coefficient directeur :',
        '$$a=\\dfrac{f({{x2}})-f({{x1}})}{ {{x2}}-{{eval:x1;()}} }='
        '\\dfrac{ {{k}}-{{eval:k;()}} }{ {{d}} }=\\dfrac{0}{ {{d}} }=' + couleur('0') + '$$',
        'Donc $f(x)=0\\times x+b=b$, et $f({{x1}})={{k}}$ donne $b={{k}}$ : '
        '$f(x)=' + couleur('{{k}}') + '$ (la fonction est constante).',
    ],
    HINT_N2,
    ['x2!=0', 'abs(x2)<=5'],
)


def specs_n2():
    s = []
    # v0 : f(0) = 3, f(2) = −1 → a = −2, f(x) = −2x + 3
    v = {'a': -2, 'b': 3, 'x0': 2, 'y0': -1}
    s += [
        spec('v0 : f(x) = −2x + 3', 0, v, 'correct', ['-2x+3']),
        spec('v0 : 3 − 2x juste aussi', 0, v, 'correct', ['3-2x']),
        spec('v0 : non réduite', 0, v, 'bad_form', ['-x-x+3'], violations=['form']),
    ]
    s += specs_erreurs(0, v, [
        ('-\\frac{1}{2}x+3', M2_RENV, 'quotient renversé'),
        ('-2x', M2_B_OUBLIE, 'b oublié'),
        ('-2x-1', M2_B_IMAGE, 'b = y0'),
    ], 'v0')
    # v1 : f(−3) = −4, f(−2) = −1 → a = 3, b = 5
    v = {'a': 3, 'b': 5, 'x1': -3, 'x2': -2, 'y1': -4, 'y2': -1}
    s += [spec('v1 : f(x) = 3x + 5', 1, v, 'correct', ['3x+5'])]
    s += specs_erreurs(1, v, [
        ('\\frac{1}{3}x-3', M2_RENV, 'quotient renversé'),
        ('3x', M2_B_OUBLIE, 'b oublié'),
        ('3x-4', M2_B_IMAGE, 'b = y1'),
    ], 'v1')
    v = {'a': -1, 'b': 2, 'x1': 1, 'x2': 2, 'y1': 1, 'y2': 0}
    s.append(spec('v1 : f(x) = −x + 2', 1, v, 'correct', ['-x+2']))
    # v2 : f(−1) = 3, f(3) = −5 → a = −2, b = 1
    v = {'a': -2, 'b': 1, 'x1': -1, 'd': 4, 'x2': 3, 'y1': 3, 'y2': -5}
    s += [
        spec('v2 : f(x) = −2x + 1', 2, v, 'correct', ['-2x+1']),
        spec('v2 : 1 − 2x', 2, v, 'correct', ['1-2x']),
    ]
    s += specs_erreurs(2, v, [
        ('-\\frac{1}{2}x+\\frac{5}{2}', M2_RENV, 'quotient renversé'),
        ('-2x', M2_B_OUBLIE, 'b oublié'),
        ('-2x+3', M2_B_IMAGE, 'b = y1'),
    ], 'v2')
    # v3 : f(−2) = f(1) = −4
    v = {'k': -4, 'x1': -2, 'd': 3, 'x2': 1}
    s += [spec('v3 : f(x) = −4', 3, v, 'correct', ['-4'])]
    s += specs_erreurs(3, v, [
        ('-4x', M2_CONSTANTE, 'kx'),
        ('0', M2_B_OUBLIE, 'b oublié'),
    ], 'v3')
    return s


N2 = modele(
    'Déterminer une fonction affine par deux images',
    'Expression de f(x) à partir de deux images : f(0) et une autre, deux nombres consécutifs, '
    'deux nombres quelconques, deux images égales (pièges : quotient renversé, b oublié, image '
    'prise pour l\'ordonnée à l\'origine)',
    2, 120, [N2_V0, N2_V1, N2_V2, N2_V3], specs_n2(), grades=['3', '2'])


# =============================================================================================
# N3 — 3-067 : lire l'expression d'une fonction affine sur sa droite. Une case f(x) = ….
# v0 a entier ±1..3, b ±1..4 ; v1 linéaire ; v2 a en demis (n/2, n impair), b entier.
# =============================================================================================

def fenetre(haut2):
    """Fenêtre : x de −5 à 5, y autour de (0 ; b) et du deuxième nœud lisible."""
    return ('x: -5 ; 5\ny: {{eval:min(-1,b,' + haut2 + ')-3}} ; {{eval:max(1,b,' + haut2
            + ')+3}}\ngrille: 1 ; 1\n')


def courbe_n3(f, haut2, extra=''):
    return ('```courbe\n' + fenetre(haut2) + 'f(x) = ' + f + '   bleu   nom=\\mathcal{D}\n'
            + extra + 'taille: moyenne\n')


ENONCE_N3 = ('La droite $\\mathcal{{D}}$ ci-dessous représente une fonction affine $f$.\n\n'
             '{COURBE}description: Droite D représentant une fonction affine f.\n```\n\n'
             'Donne l\'expression de $f(x)$.\n\n$f(x)=?$')
HINT_N3 = ('L\'ordonnée à l\'origine se lit là où la droite coupe l\'axe des ordonnées. Pour le '
           'coefficient directeur, avance vers la droite d\'un nombre entier de carreaux et '
           'regarde de combien la droite monte ou descend.')

M3_INV = ('Tu as échangé le coefficient directeur et l\'ordonnée à l\'origine : l\'ordonnée à '
          'l\'origine se lit sur l\'axe des ordonnées.')
M3_SIGNE = ('Vérifie le signe du coefficient directeur : il est positif si la droite monte, '
            'négatif si elle descend.')
M3_RENV = ('Le coefficient directeur, c\'est le déplacement vertical divisé par le déplacement '
           'horizontal, pas l\'inverse.')


def etapes_n3(f, x2, y2, avance, phrase_a, pente='a'):
    return [
        'On lit deux points de la droite sur des nœuds du quadrillage :',
        courbe_n3(f, y2, 'points: A(0 ; {{b}}), B(' + x2 + ' ; {{eval:' + y2 + '}})\n')
        + 'description: Droite D et deux de ses points, A sur l\'axe des ordonnées et B.\n```',
        '$\\mathcal{D}$ coupe l\'axe des ordonnées en $A(0\\,;{{b}})$ : $b=' + couleur('{{b}}')
        + '$.',
        'De $A$ à $B$, on avance de $' + avance + '$ et on {{if:' + pente + '>0|monte|descend}} de '
        '${{eval:abs(' + y2 + '-b)}}$ : ' + phrase_a,
        'Donc $f(x)=' + couleur('{answer}') + '$.',
    ]


N3_V0 = variation(
    ENONCE_N3.format(COURBE=courbe_n3('({{a}})*x+({{b}})', 'a+b')),
    [X, var('a', '1..3;±'), var('b', '1..4;±')],
    [case(AFFINE, [
        erreur('{{eval:b*x+a}}', M3_INV, 'a et b inversés'),
        erreur('{{eval:-a*x+b}}', M3_SIGNE, 'Signe du coefficient directeur'),
        # Vaut la bonne réponse quand a = ±1 : ignorée sur ces tirages
        erreur('{{eval:x/a+b}}', M3_RENV, 'Coefficient directeur renversé (1/a)'),
    ])],
    [s.replace('{answer}', AFFICHE) for s in etapes_n3(
        '({{a}})*x+({{b}})', '1', 'a+b', '1', '$a=' + couleur('{{a}}') + '$.')],
    HINT_N3,
    # a ≠ b : l'inversion est une erreur ; les trois erreurs ont des valeurs distinctes
    ['a!=b'],
)

N3_V1 = variation(
    # Linéaire : « a et b inversés » donnerait la constante a, pas une lecture de la droite
    ENONCE_N3.format(COURBE=courbe_n3('({{a}})*x', 'a')),
    [X, var('a', '1..3;±'), var('b', '0')],
    [case('{{eval:a*x}}', [
        erreur('{{eval:-a*x}}', M3_SIGNE, 'Signe du coefficient directeur'),
        erreur('{{eval:x/a}}', M3_RENV, 'Coefficient directeur renversé (1/a)'),
    ])],
    [s.replace('{answer}', COEF_X) for s in etapes_n3(
        '({{a}})*x', '1', 'a', '1', '$a=' + couleur('{{a}}') + '$.')],
    HINT_N3,
)

N3_V2 = variation(
    # a = n/2, n impair : deux nœuds (0 ; b) et (2 ; n + b). Forme exacte : « 0,5x + 1 » est
    # refusé (acceptDecimal ne vaut que pour un nombre seul, et un motif requiredForm u*x+v refuse
    # x/2) : la consigne demande l'écriture fractionnaire.
    ENONCE_N3.format(COURBE=courbe_n3('({{n}})/2*x+({{b}})', 'n+b')).replace(
        'Donne l\'expression de $f(x)$.',
        'Donne l\'expression de $f(x)$, avec un coefficient directeur en écriture fractionnaire.'),
    [X, var('n', '1|3|-1|-3'), var('b', '1..4;±')],
    [case('{{eval:n/2*x+b}}', [
        erreur('{{eval:b*x+n/2}}', M3_INV, 'a et b inversés'),
        erreur('{{eval:-n/2*x+b}}', M3_SIGNE, 'Signe du coefficient directeur'),
        erreur('{{eval:2/n*x+b}}', M3_RENV, 'Coefficient directeur renversé (2 au lieu de 1/2)'),
    ])],
    [s.replace('{answer}', DEMI + 'x{{b;+}}') for s in etapes_n3(
        '({{n}})/2*x+({{b}})', '2', 'n+b', '2', '$a=' + couleur(DEMI) + '$.', pente='n')],
    HINT_N3,
)


def specs_n3():
    s = []
    # v0 : f(x) = −2x + 3
    v = {'a': -2, 'b': 3}
    s += [
        spec('v0 : f(x) = −2x + 3', 0, v, 'correct', ['-2x+3']),
        spec('v0 : 3 − 2x', 0, v, 'correct', ['3-2x']),
    ]
    s += specs_erreurs(0, v, [
        ('3x-2', M3_INV, 'inversés'),
        ('2x+3', M3_SIGNE, 'signe'),
        ('-\\frac{1}{2}x+3', M3_RENV, 'renversé'),
    ], 'v0')
    v = {'a': 1, 'b': -4}
    s += [spec('v0 : f(x) = x − 4', 0, v, 'correct', ['x-4'])]
    # v1 : f(x) = 3x
    v = {'a': 3, 'b': 0}
    s += [spec('v1 : f(x) = 3x', 1, v, 'correct', ['3x'])]
    s += specs_erreurs(1, v, [
        ('-3x', M3_SIGNE, 'signe'),
        ('\\frac{1}{3}x', M3_RENV, 'renversé'),
    ], 'v1')
    v = {'a': -1, 'b': 0}
    s += [spec('v1 : f(x) = −x', 1, v, 'correct', ['-x'])]
    # v2 : f(x) = x/2 + 1, puis −3/2 x − 2
    v = {'n': 1, 'b': 1}
    s += [
        spec('v2 : f(x) = 1/2 x + 1', 2, v, 'correct', ['\\frac{1}{2}x+1']),
        spec('v2 : x/2 + 1', 2, v, 'correct', ['\\frac{x}{2}+1']),
        spec('v2 : 1 + x/2', 2, v, 'correct', ['1+\\frac{x}{2}']),
        spec('v2 : non réduite', 2, v, 'bad_form', ['x-\\frac{1}{2}x+1'], violations=['form']),
    ]
    s += specs_erreurs(2, v, [
        ('x+\\frac{1}{2}', M3_INV, 'inversés'),
        ('-\\frac{1}{2}x+1', M3_SIGNE, 'signe'),
        ('2x+1', M3_RENV, '2 au lieu de 1/2'),
    ], 'v2')
    v = {'n': -3, 'b': -2}
    s += [spec('v2 : f(x) = −3/2 x − 2', 2, v, 'correct', ['-\\frac{3}{2}x-2'])]
    return s


N3 = modele(
    'Lire l\'expression d\'une fonction affine sur sa droite',
    'Expression f(x) = ax + b lue sur la droite : coefficient directeur entier, fonction '
    'linéaire, coefficient directeur en demis (pièges : a et b inversés, signe, coefficient '
    'directeur renversé)',
    2, 90, [N3_V0, N3_V1, N3_V2], specs_n3())


# =============================================================================================
# N4 — 3-039 : représenter graphiquement une fonction affine (geste `tracer:` du ```courbe).
# v0 a entier ±1..3, b ±1..3 ; v1 linéaire ; v2 a en demis (n/2, n impair). Repère de −5 à 5.
# =============================================================================================

REPERE = 'x: -5 ; 5\ny: -5 ; 5\ngrille: 1 ; 1\n'
HINT_N4 = ('Commence par le point d\'abscisse $0$ : son ordonnée est $f(0)$. Calcule ensuite '
           'l\'image d\'un autre nombre.')


def enonce_n4(formule, equation):
    return ('On considère la fonction affine $f$ définie par $f(x)=' + formule + '$.\n\n'
            'Trace la droite qui représente $f$ : place deux de ses points.\n\n'
            '```courbe\n' + REPERE + 'tracer: y = ' + equation + '\n'
            'taille: moyenne\ndescription: Repère gradué de 1 en 1, de −5 à 5 sur les deux '
            'axes.\n```')


def corrige_n4(f, x2, y2, phrase):
    return [
        'Pour représenter $f$, on place deux points de sa droite : $(0\\,;f(0))$ sur l\'axe des '
        'ordonnées, puis un deuxième en calculant une autre image.',
        '```courbe\n' + REPERE + 'f(x) = ' + f + '   bleu   nom=\\mathcal{C}_f\n'
        'points: A(0 ; {{b}}), B(' + x2 + ' ; {{eval:' + y2 + '}})\ntaille: moyenne\n'
        'description: Droite représentant f et deux de ses points, A sur l\'axe des ordonnées '
        'et B.\n```',
        phrase,
    ]


N4_V0 = variation(
    enonce_n4('{{a}}x{{b;+}}', '({{a}})*x+({{b}})'),
    [var('a', '1..3;±'), var('b', '1..3;±')],
    None,
    corrige_n4('({{a}})*x+({{b}})', '1', 'a+b',
               '$f(0)={{b}}$ donne $A(0\\,;{{b}})$, et $f(1)={{a}}\\times1{{b;+}}={{eval:a+b}}$ '
               'donne $B(1\\,;{{eval:a+b}})$.'),
    HINT_N4,
    # a ≠ b : la droite de « a et b inversés » est une autre droite
    ['a!=b'],
)

N4_V1 = variation(
    enonce_n4('{{a}}x', '({{a}})*x'),
    [var('a', '1..3;±'), var('b', '0')],
    None,
    corrige_n4('({{a}})*x', '1', 'a',
               '$f(0)=0$ : la droite passe par l\'origine $A(0\\,;0)$. Puis $f(1)={{a}}$ donne '
               '$B(1\\,;{{a}})$.'),
    HINT_N4,
)

N4_V2 = variation(
    # a = n/2 : f(2) entier, deuxième point d'abscisse 2
    enonce_n4('{{if:n<0|-}}\\dfrac{ {{eval:abs(n)}} }{2}x{{b;+}}', '({{n}})/2*x+({{b}})'),
    [var('n', '1|3|-1|-3'), var('b', '1..3;±')],
    None,
    corrige_n4('({{n}})/2*x+({{b}})', '2', 'n+b',
               '$f(0)={{b}}$ donne $A(0\\,;{{b}})$. Une abscisse paire donne une image entière : '
               '$f(2)={{if:n<0|-}}\\dfrac{ {{eval:abs(n)}} }{2}\\times2{{b;+}}={{eval:n+b}}$, '
               'd\'où $B(2\\,;{{eval:n+b}})$.'),
    HINT_N4,
)


def specs_n4():
    s = []
    # v0 : f(x) = 2x − 1
    v = {'a': 2, 'b': -1}
    s += [
        spec('v0 : (0 ; −1) et (1 ; 1)', 0, v, 'correct', ['0;-1/1;1']),
        spec('v0 : deux autres points', 0, v, 'correct', ['2;3/-1;-3']),
        spec('v0 : a et b inversés (y = −x + 2)', 0, v, 'incorrect', ['0;2/1;1']),
        spec('v0 : signe de a (y = −2x − 1)', 0, v, 'incorrect', ['0;-1/1;-3']),
        spec('v0 : un seul point, posé deux fois', 0, v, 'incorrect', ['0;-1/0;-1']),
    ]
    v = {'a': -1, 'b': 3}
    s += [spec('v0 : f(x) = −x + 3', 0, v, 'correct', ['0;3/3;0'])]
    # v1 : f(x) = −3x
    v = {'a': -3, 'b': 0}
    s += [
        spec('v1 : (0 ; 0) et (1 ; −3)', 1, v, 'correct', ['0;0/1;-3']),
        spec('v1 : signe de a', 1, v, 'incorrect', ['0;0/1;3']),
    ]
    # v2 : f(x) = −3/2 x + 1
    v = {'n': -3, 'b': 1}
    s += [
        spec('v2 : (0 ; 1) et (2 ; −2)', 2, v, 'correct', ['0;1/2;-2']),
        spec('v2 : (−2 ; 4) et (2 ; −2)', 2, v, 'correct', ['-2;4/2;-2']),
        spec('v2 : pente renversée (−2/3)', 2, v, 'incorrect', ['0;1/3;-1']),
        spec('v2 : signe de a (y = 3/2 x + 1)', 2, v, 'incorrect', ['0;1/2;4']),
    ]
    return s


N4 = modele(
    'Représenter graphiquement une fonction affine',
    'Tracer la droite de f(x) = ax + b en plaçant deux de ses points : coefficient directeur '
    'entier, fonction linéaire, coefficient directeur en demis',
    1, 90, [N4_V0, N4_V1, N4_V2], specs_n4(), shared={'cleanCoefficients': True})


ecrire('n1-coefficients-sur-l-expression', N1)
ecrire('n2-affine-par-deux-images', N2)
ecrire('n3-expression-lue-sur-la-droite', N3)
ecrire('n4-representer-une-fonction-affine', N4)
print('4 modèles écrits dans', DOSSIER)
