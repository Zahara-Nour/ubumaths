"""Écrit les modèles neufs du chantier idees-tle-integration dans scripts/questions/idees-tle-integration-neufs/.

Phase 0 validée par David le 2026-11-25 (« je suis tes recos » ; journal
docs/archive/wip/idees-tle-integration/idees-tle-integration-progress.md, fiches docs/archive/wip/idees-tle-integration/idees-tle-integration-fiches.md) :
F1 (lien entre f et ses primitives, lecture de courbe, Q1) et F7 (intégrale de cos et de sin,
modèle neuf Tle spé seulement, Q2).

Grades T_SPE. Ni theme, ni domain, ni subdomain, ni id : le rangement (nœud du point + tag) se fera
par migration, après la création en brouillon.

Règles suivies (couvrir-un-niveau.md § 5) : erreurs prévues de vraies erreurs d'élèves ; une
erreur qui tombe sur la bonne réponse d'un tirage est ignorée par le moteur ; un coup de pouce par
variation, qui ne donne jamais la réponse ; pas de Oui / Non nu. ⛔ Jamais de variable `e` (Euler).

Usage : python3 docs/wip/questions/idees-tle-integration-neufs.py scripts/questions/idees-tle-integration-neufs
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'


def spec(desc, vi, variables_, status, answers, message=None, violations=None):
    expected = {'status': status}
    if violations:
        expected['constraintViolations'] = violations
    if message is not None:
        expected['expectedErrorMessage'] = message
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': expected, 'answers': answers}


def modele(title, description, level, variations, specs, shared=None, options=None):
    m = {'title': title, 'description': description, 'grades': ['T_SPE'], 'level': level,
         'delay': 60, 'status': 'draft', 'shared': shared or {'cleanCoefficients': True}}
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


def case(attendue, erreurs=None, kind=None):
    c = {'expectedAnswer': attendue}
    if kind == 'intervalles':
        c['answerKind'] = 'intervalles'
        c['openableBounds'] = True
    if erreurs:
        c['expectedErrors'] = erreurs
    return c


def variation(statement, variables, blanks, steps, hint, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': blanks, 'correction': {'steps': steps}, 'hint': hint}


RANGEMENT = {
    'f01-lien-fonction-primitives': ('Équations différentielles > y′ = f > primitives : notion', 'TSPE-462'),
    'f07-integrale-cos-sin': ('Intégration > Calcul d\'intégrales > par une primitive', 'TSPE-487'),
}


def ecrire(nom, m):
    os.makedirs(DOSSIER, exist_ok=True)
    chemin = os.path.join(DOSSIER, nom + '.json')
    # Garder l'id écrit en tête par create-questions --publier, s'il existe
    if os.path.exists(chemin):
        with open(chemin, encoding='utf-8') as f:
            ancien = json.load(f)
        if 'id' in ancien:
            m = {'id': ancien['id'], **m}
    # Rangement (nœud + point) relevé en prod le 2026-11-25, lu par migration-rangement.ts
    if nom in RANGEMENT:
        noeud, point = RANGEMENT[nom]
        tete = {k: m[k] for k in ('id',) if k in m}
        m = {**tete, 'rangement': {'noeud': noeud, 'point': point}, **{k: v for k, v in m.items() if k != 'id'}}
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write('\n')


# =============================================================================================
# F1 — TSPE-462 : lien entre f et ses primitives, lu sur la courbe de f (TSA7-10, vrai / faux
# « f ⩾ 0 ⇔ F croissante », « f croissante ⇔ F convexe »).
# a : f(x) = k(x − p)(x − q), racines entières p < q = p + 2d, sommet m = p + d entier.
#     k = −1 : f ⩾ 0 sur [p ; q] → « où F est-elle croissante ? » → [p ; q].
#     k = 1  : f ⩽ 0 sur [p ; q] → « où F est-elle décroissante ? » → [p ; q].
#     Erreurs : le complémentaire ; ]−∞ ; m] (variations de f lues à la place de son signe).
# b : f(x) = s((x − α)² − r²). F″ = f′ : F convexe là où f croît.
#     s = 1 → [α ; +∞[ ; s = −1 → ]−∞ ; α].
#     Erreurs : l'autre demi-droite ; là où f ⩾ 0 (signe de f lu à la place de ses variations).
# =============================================================================================

def courbe(expr, xmin, xmax, ymin, ymax, description):
    return bloc('courbe', 'x: ' + xmin + ' ; ' + xmax, 'y: ' + ymin + ' ; ' + ymax,
                'grille: 1 ; 1', 'f(x) = ' + expr + '   bleu   nom=C_f', 'taille: moyenne',
                'description: ' + description)


COURBE_F1A = courbe('{{k}}*(x-({{p}}))*(x-({{eval:p+2*d}}))', '{{eval:p-2}}', '{{eval:p+2*d+2}}',
                    '{{eval:-d*d-2}}', '{{eval:d*d+2}}',
                    'Parabole {{if:k<0|tournée vers le bas|tournée vers le haut}}, qui coupe '
                    'l\'axe des abscisses en x = {{p}} et en x = {{eval:p+2*d}}.')

F1_A = variation(
    'On a représenté ci-dessous la courbe $\\mathcal{C}_f$ d\'une fonction $f$ définie et continue '
    'sur $\\mathbb{R}$.\n\n' + COURBE_F1A + '\n\n$F$ est une primitive de $f$ sur $\\mathbb{R}$. '
    'Sur quel intervalle $F$ est-elle {{if:k<0|croissante|décroissante}} ?\n\n$?$',
    [var('k', '-1|1'), var('p', '-4..1'), var('d', '1..2')],
    [case('[{{p}};{{eval:p+2*d}}]', [
        erreur(']-\\infty;{{p}}]\\cup[{{eval:p+2*d}};+\\infty[',
               '$F\' = f$ : $F$ est {{if:k<0|croissante|décroissante}} là où $f$ est '
               '{{if:k<0|positive|négative}}. Regarde où la courbe est {{if:k<0|au-dessus|en '
               'dessous}} de l\'axe des abscisses.', 'Complémentaire'),
        erreur(']-\\infty;{{eval:p+d}}]',
               'Tu as lu les variations de $f$. Or $F\'=f$ : ce sont les **signes** de $f$ qui '
               'donnent les variations de $F$.', 'Variations de f'),
    ], kind='intervalles')],
    [
        '$F$ est une primitive de $f$, donc $F\'=f$ : $F$ est {{if:k<0|croissante|décroissante}} '
        'là où $f$ est {{if:k<0|positive|négative}}.',
        'La courbe de $f$ est {{if:k<0|au-dessus|en dessous}} de l\'axe des abscisses entre ses '
        'deux points d\'intersection avec lui, d\'abscisses ${{p}}$ et ${{eval:p+2*d}}$.',
        '$F$ est {{if:k<0|croissante|décroissante}} sur $' + PRIMAIRE
        + '{\\left[{{p}}\\,;{{eval:p+2*d}}\\right]}$.',
    ],
    'Que vaut $F\'$ ? Relie le sens de variation de $F$ au signe de $f$, que tu lis sur la courbe.',
)

COURBE_F1B = courbe('{{s}}*((x-({{a}}))^2-{{r}}^2)', '{{eval:a-4}}', '{{eval:a+4}}', '-6', '6',
                    'Parabole {{if:s>0|tournée vers le haut|tournée vers le bas}}, de sommet '
                    'd\'abscisse x = {{a}}, qui coupe l\'axe des abscisses en x = {{eval:a-r}} et '
                    'en x = {{eval:a+r}}.')

F1_B = variation(
    'On a représenté ci-dessous la courbe $\\mathcal{C}_f$ d\'une fonction $f$ dérivable sur '
    '$\\mathbb{R}$.\n\n' + COURBE_F1B + '\n\n$F$ est une primitive de $f$ sur $\\mathbb{R}$. Sur '
    'quel intervalle $F$ est-elle convexe ?\n\n$?$',
    [var('s', '-1|1'), var('a', '-2..2'), var('r', '1..2')],
    [case('{{if:s>0|[{{a}};+\\infty[|]-\\infty;{{a}}]}}', [
        erreur('{{if:s>0|]-\\infty;{{a}}]|[{{a}};+\\infty[}}',
               '$F$ est convexe là où $F\'\'$ est positive. Or $F\'\'=f\'$ : cherche où $f$ est '
               '**croissante**.', 'Sens inversé'),
        erreur('{{if:s>0|]-\\infty;{{eval:a-r}}]\\cup[{{eval:a+r}};+\\infty[|[{{eval:a-r}};{{eval:a+r}}]}}',
               'Tu as lu le signe de $f$ : il donne les variations de $F$, pas sa convexité. La '
               'convexité de $F$ dépend du signe de $F\'\'=f\'$, donc des variations de $f$.',
               'Signe de f'),
    ], kind='intervalles')],
    [
        '$F\'=f$, donc $F\'\'=f\'$ : $F$ est convexe là où $f\'\\geqslant 0$, c\'est-à-dire là où $f$ '
        'est croissante.',
        'La parabole est {{if:s>0|tournée vers le haut|tournée vers le bas}} et son sommet a pour '
        'abscisse ${{a}}$ : $f$ est croissante sur {{if:s>0|$\\left[{{a}}\\,;+\\infty\\right[$|'
        '$\\left]-\\infty\\,;{{a}}\\right]$}}.',
        '$F$ est convexe sur $' + PRIMAIRE
        + '{ {{if:s>0|\\left[{{a}}\\,;+\\infty\\right[|\\left]-\\infty\\,;{{a}}\\right]}} }$.',
    ],
    'La convexité de $F$ se lit sur le signe de $F\'\'$. Exprime $F\'\'$ à l\'aide de $f$.',
)

# a : k = −1, p = −1, d = 2 → racines −1 et 3, sommet 1 ; F croissante sur [−1 ; 3]
V1A = {'k': '-1', 'p': '-1', 'd': '2'}
V1A2 = {'k': '1', 'p': '0', 'd': '1'}
# b : s = 1, a = 1, r = 2 → F convexe sur [1 ; +∞[
V1B = {'s': '1', 'a': '1', 'r': '2'}
V1B2 = {'s': '-1', 'a': '-1', 'r': '1'}
SPECS_F1 = [
    spec('a : k = −1 → [−1 ; 3]', 0, V1A, 'correct', ['[-1;3]']),
    spec('a : crochets ouverts acceptés', 0, V1A, 'correct', [']-1;3[']),
    spec('a : complémentaire', 0, V1A, 'incorrect', [']-\\infty;-1]\\cup[3;+\\infty['],
         '$F\' = f$ : $F$ est croissante là où $f$ est positive. Regarde où la courbe est au-dessus '
         'de l\'axe des abscisses.'),
    spec('a : variations de f', 0, V1A, 'incorrect', [']-\\infty;1]']),
    spec('a : k = 1, décroissante → [0 ; 2]', 0, V1A2, 'correct', ['[0;2]']),
    spec('a : k = 1, complémentaire', 0, V1A2, 'incorrect', [']-\\infty;0]\\cup[2;+\\infty[']),
    spec('b : s = 1 → [1 ; +∞[', 1, V1B, 'correct', ['[1;+\\infty[']),
    spec('b : sens inversé', 1, V1B, 'incorrect', [']-\\infty;1]']),
    spec('b : signe de f', 1, V1B, 'incorrect', [']-\\infty;-1]\\cup[3;+\\infty[']),
    spec('b : s = −1 → ]−∞ ; −1]', 1, V1B2, 'correct', [']-\\infty;-1]']),
    spec('b : s = −1, signe de f', 1, V1B2, 'incorrect', ['[-2;0]']),
]

F1 = modele(
    'Lien entre une fonction et ses primitives',
    'Lire sur la courbe de f les variations ou la convexité d\'une primitive F : F′ = f (signe de f '
    '→ variations de F), F″ = f′ (variations de f → convexité de F) (pièges : variations de f lues '
    'à la place de son signe, et l\'inverse)',
    3, [F1_A, F1_B], SPECS_F1)


# =============================================================================================
# F7 — TSPE-487 : intégrale de cos et de sin (TSA8-10). Bornes remarquables, résultat simple.
# a : ∫ k cos x, j = 0 : [0 ; π/6] → k/2 ; 1 : [0 ; π/2] → k ; 2 : [−π/2 ; π/2] → 2k ; 3 : [0 ; π] → 0.
# b : ∫ k sin x, j = 0 : [0 ; π/2] → k ; 1 : [0 ; π] → 2k ; 2 : [−π/2 ; π/2] → 0 ; 3 : [π/2 ; π] → k.
# c : ∫₀^(π/(2w)) cos(wx) → 1/w (j = 0) ; ∫₀^(π/w) sin(wx) → 2/w (j = 1).
# =============================================================================================

def borne(j, valeurs):
    """Borne LaTeX selon j, valeurs = 4 chaînes."""
    return ''.join('{{if:j==' + str(i) + '|' + v + '}}' for i, v in enumerate(valeurs))


PI6, PI2, MPI2, PI = '\\frac{\\pi}{6}', '\\frac{\\pi}{2}', '-\\frac{\\pi}{2}', '\\pi'
COEF_K = '{{if:k==1||{{if:k==-1|-|{{k}}}}}}'
COEF_MK = '{{if:k==-1||{{if:k==1|-|{{eval:-k}}}}}}'
OUV = '{{if:k<0|\\left(}}'
FER = '{{if:k<0|\\right)}}'

A_INF = borne('j', ['0', '0', MPI2, '0'])
A_SUP = borne('j', [PI6, PI2, PI2, PI])
VAL_A = '{{if:j==0|{{eval:k/2}}}}{{if:j==1|{{k}}}}{{if:j==2|{{eval:2*k}}}}{{if:j==3|0}}'
NEG_A = '{{if:j==0|{{eval:-k/2}}}}{{if:j==1|{{eval:-k}}}}{{if:j==2|{{eval:-2*k}}}}{{if:j==3|0}}'

F7_A = variation(
    'Calcule la valeur exacte de $\\displaystyle\\int_{' + A_INF + '}^{' + A_SUP + '}' + OUV + COEF_K
    + '\\cos(x)' + FER + '\\,\\mathrm{d}x$.\n\n$?$',
    [var('k', '1..5;±'), var('j', '0..3')],
    [case(VAL_A, [
        erreur(NEG_A,
               'Une primitive de $\\cos$ est $\\sin$ (et non $-\\sin$), et l\'on calcule '
               '$F\\left( b \\right) - F\\left( a \\right)$, borne du haut moins borne du bas.', 'Signe'),
        erreur('{{if:j==2|{{k}}|' + VAL_A + '}}',
               'Tu as oublié de retrancher $F\\left(' + A_INF + '\\right)$, qui ne vaut pas $0$ '
               'ici.', 'F(a) oublié'),
    ])],
    [
        'Une primitive de $x\\mapsto ' + COEF_K + '\\cos(x)$ est $F(x)=' + COEF_K + '\\sin(x)$.',
        '$\\displaystyle\\int_{' + A_INF + '}^{' + A_SUP + '}' + OUV + COEF_K + '\\cos(x)' + FER + '\\,\\mathrm{d}x'
        '=F\\left(' + A_SUP + '\\right)-F\\left(' + A_INF + '\\right)=' + COEF_K + '\\left(\\sin\\left('
        + A_SUP + '\\right)-\\sin\\left(' + A_INF + '\\right)\\right)'
        '={{k}}\\times{{if:j==0|\\frac{1}{2}}}{{if:j==1|1}}{{if:j==2|2}}{{if:j==3|0}}='
        + PRIMAIRE + '{' + VAL_A + '}$.',
    ],
    'Cherche une primitive de $\\cos$, puis calcule $F(b)-F(a)$ avec les valeurs remarquables du '
    'sinus.',
)

B_INF = borne('j', ['0', '0', MPI2, PI2])
B_SUP = borne('j', [PI2, PI, PI2, PI])
VAL_B = '{{if:j==0|{{k}}}}{{if:j==1|{{eval:2*k}}}}{{if:j==2|0}}{{if:j==3|{{k}}}}'
NEG_B = '{{if:j==0|{{eval:-k}}}}{{if:j==1|{{eval:-2*k}}}}{{if:j==2|0}}{{if:j==3|{{eval:-k}}}}'

F7_B = variation(
    'Calcule la valeur exacte de $\\displaystyle\\int_{' + B_INF + '}^{' + B_SUP + '}' + OUV + COEF_K
    + '\\sin(x)' + FER + '\\,\\mathrm{d}x$.\n\n$?$',
    [var('k', '1..5;±'), var('j', '0..3')],
    [case(VAL_B, [
        erreur(NEG_B,
               'Une primitive de $\\sin$ est $-\\cos$ : $(-\\cos)\'=\\sin$. Tu as pris $\\cos$, '
               'sans le signe moins (ou inversé les bornes).', 'Primitive cos'),
        erreur('{{if:j==1|{{k}}|' + VAL_B + '}}',
               'Tu as oublié de retrancher $F\\left(' + B_INF + '\\right)$ : $\\cos(0)=1$, pas $0$.',
               'F(a) oublié'),
    ])],
    [
        'Une primitive de $x\\mapsto ' + COEF_K + '\\sin(x)$ est $F(x)=' + COEF_MK + '\\cos(x)$, car '
        '$(-\\cos)\'=\\sin$.',
        '$\\displaystyle\\int_{' + B_INF + '}^{' + B_SUP + '}' + OUV + COEF_K + '\\sin(x)' + FER + '\\,\\mathrm{d}x'
        '=F\\left(' + B_SUP + '\\right)-F\\left(' + B_INF + '\\right)=' + COEF_MK + '\\left(\\cos\\left('
        + B_SUP + '\\right)-\\cos\\left(' + B_INF + '\\right)\\right)'
        '={{eval:-k;()}}\\times\\left({{if:j==0|0-1}}{{if:j==1|-1-1}}{{if:j==2|0-0}}{{if:j==3|-1-0}}'
        '\\right)=' + PRIMAIRE + '{' + VAL_B + '}$.',
    ],
    'Cherche une primitive de $\\sin$ (attention au signe), puis calcule $F(b)-F(a)$ avec les '
    'valeurs remarquables du cosinus.',
)

F7_C = variation(
    'Calcule la valeur exacte de $\\displaystyle\\int_{0}^{\\frac{\\pi}{ {{eval:(2-j)*w}} }}'
    '{{if:j==0|\\cos|\\sin}}({{w}}x)\\,\\mathrm{d}x$.\n\n$?$',
    [var('w', '2..4'), var('j', '0..1')],
    [case('{{eval:(1+j)/w}}', [
        erreur('{{eval:(1+j)*w}}',
               'La dérivée de ${{if:j==0|\\sin|\\cos}}({{w}}x)$ fait apparaître un facteur ${{w}}$ : '
               'une primitive de ${{if:j==0|\\cos|\\sin}}({{w}}x)$ est '
               '${{if:j==1|-}}\\dfrac{1}{ {{w}} }{{if:j==0|\\sin|\\cos}}({{w}}x)$. Il faut diviser '
               'par ${{w}}$, pas multiplier.', 'Multiplié par ω'),
        erreur('{{eval:1+j}}',
               'Tu as oublié le facteur $\\dfrac{1}{ {{w}} }$ : la dérivée de '
               '${{if:j==0|\\sin|\\cos}}({{w}}x)$ vaut ${{if:j==1|-}}{{w}}{{if:j==0|\\cos|\\sin}}'
               '({{w}}x)$.', '1/ω oublié'),
    ])],
    [
        'Une primitive de $x\\mapsto{{if:j==0|\\cos|\\sin}}({{w}}x)$ est $F(x)={{if:j==1|-}}'
        '\\dfrac{1}{ {{w}} }{{if:j==0|\\sin|\\cos}}({{w}}x)$ : dérive-la pour vérifier.',
        '$F\\left(\\frac{\\pi}{ {{eval:(2-j)*w}} }\\right)-F(0)={{if:j==0|\\dfrac{1}{ {{w}} }\\left('
        '\\sin\\left(\\frac{\\pi}{2}\\right)-\\sin(0)\\right)|-\\dfrac{1}{ {{w}} }\\left(\\cos(\\pi)'
        '-\\cos(0)\\right)}}=' + PRIMAIRE + '{ {{eval:(1+j)/w}} }$.',
    ],
    'Dérive ${{if:j==0|\\sin|\\cos}}({{w}}x)$ : quel facteur apparaît ? Ajuste la primitive en '
    'conséquence.',
)

SPECS_F7 = [
    spec('a : 3 cos sur [0 ; π/6] → 3/2', 0, {'k': '3', 'j': '0'}, 'correct', ['\\frac{3}{2}']),
    spec('a : décimal accepté', 0, {'k': '3', 'j': '0'}, 'correct', ['1.5']),
    spec('a : primitive −sin', 0, {'k': '3', 'j': '0'}, 'incorrect', ['-\\frac{3}{2}'],
         'Une primitive de $\\cos$ est $\\sin$ (et non $-\\sin$), et l\'on calcule $F\\left( b \\right) - F\\left( a \\right)$, '
         'borne du haut moins borne du bas.'),
    spec('a : −2 cos sur [−π/2 ; π/2] → −4', 0, {'k': '-2', 'j': '2'}, 'correct', ['-4']),
    spec('a : signe faux', 0, {'k': '-2', 'j': '2'}, 'incorrect', ['4']),
    spec('a : 4 cos sur [0 ; π] → 0', 0, {'k': '4', 'j': '3'}, 'correct', ['0']),
    spec('a : F(a) oublié sur [−π/2 ; π/2]', 0, {'k': '-2', 'j': '2'}, 'incorrect', ['-2']),
    spec('b : 3 sin sur [0 ; π] → 6', 1, {'k': '3', 'j': '1'}, 'correct', ['6']),
    spec('b : primitive cos', 1, {'k': '3', 'j': '1'}, 'incorrect', ['-6']),
    spec('b : F(a) oublié sur [0 ; π]', 1, {'k': '3', 'j': '1'}, 'incorrect', ['3']),
    spec('b : 5 sin sur [−π/2 ; π/2] → 0', 1, {'k': '5', 'j': '2'}, 'correct', ['0']),
    spec('b : −1 sin sur [π/2 ; π] → −1', 1, {'k': '-1', 'j': '3'}, 'correct', ['-1']),
    spec('c : cos(3x) sur [0 ; π/6] → 1/3', 2, {'w': '3', 'j': '0'}, 'correct', ['\\frac{1}{3}']),
    spec('c : multiplié par ω', 2, {'w': '3', 'j': '0'}, 'incorrect', ['3']),
    spec('c : 1/ω oublié', 2, {'w': '3', 'j': '0'}, 'incorrect', ['1']),
    spec('c : sin(2x) sur [0 ; π/2] → 1', 2, {'w': '2', 'j': '1'}, 'correct', ['1']),
    spec('c : sin(4x), 1/ω oublié', 2, {'w': '4', 'j': '1'}, 'incorrect', ['2']),
]

F7 = modele(
    'Intégrale de cos et de sin',
    'Calculer une intégrale de k cos x, k sin x, cos(ωx) ou sin(ωx) entre des bornes remarquables, '
    'à l\'aide d\'une primitive (pièges : primitive de sin sans le signe moins, primitive de cos '
    'prise égale à −sin, facteur 1/ω)',
    2, [F7_A, F7_B, F7_C], SPECS_F7,
    shared={'blankDefaults': {'acceptDecimal': True}, 'cleanCoefficients': True},
    options={'constraints': {'form': 'off', 'spaces': 'off'}})


MODELES = {
    'f01-lien-fonction-primitives': lambda: F1,
    'f07-integrale-cos-sin': lambda: F7,
}
choisis = sys.argv[2:] or list(MODELES)
for nom in choisis:
    ecrire(nom, MODELES[nom]())
print(len(choisis), 'modèle(s) écrit(s) dans', DOSSIER)
