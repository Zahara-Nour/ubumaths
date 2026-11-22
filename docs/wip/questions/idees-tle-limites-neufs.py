"""Écrit les modèles neufs du chantier idees-tle-limites dans scripts/questions/idees-tle-limites-neufs/.

Phase 0 validée par David le 2026-11-22 (journal docs/wip/idees-tle-limites-progress.md, page à
cocher https://claude.ai/artifact/1F96L4GrKY7ThQKZsvWoL7) : F1 (deux modèles de lecture sur
courbe, Q1), F2 (composition), Q2 (quantité conjuguée, modèle sans point). F3 (tableau de
variations d'une homographique) attend une décision : le bloc ```variation refuse de cacher une
limite infinie.

Grades T_SPE. Ni theme, ni domain, ni subdomain, ni id : le rangement (nœud du point + tag) se fera
par migration, après la création en brouillon.

Règles suivies (couvrir-un-niveau.md § 5) : erreurs prévues par case d'écriture ordinaire (de
vraies erreurs d'élèves, sans en inventer pour atteindre trois), chacune avec sa spec `incorrect`
qui nomme son message ; un coup de pouce par variation, qui ne donne jamais la réponse ; pas de
Oui / Non nu.

Usage : python3 docs/wip/questions/idees-tle-limites-neufs.py scripts/questions/idees-tle-limites-neufs
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
PINF = '+\\infty'
MINF = '-\\infty'


def spec(desc, vi, variables_, status, answers, message=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = message
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': expected, 'answers': answers}


def modele(title, description, level, variations, specs, shared=None):
    return {'title': title, 'description': description, 'grades': ['T_SPE'], 'level': level,
            'delay': 60, 'status': 'draft', 'shared': shared or {'cleanCoefficients': True},
            'variations': variations, 'testSpecs': specs}


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


def coef(v):
    """Coefficient devant une lettre : 1 → rien, −1 → −."""
    return '{{if:' + v + '==1||{{if:' + v + '==-1|-|{{' + v + '}}}}}}'


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


# =============================================================================================
# F1 — Conjecturer une limite sur une courbe : deux modèles (Q1), un en +∞ (TSPE-397), un en −∞
# (TSPE-572), faits des mêmes courbes. Côté −∞ : les formules sont celles du côté +∞ où x est
# remplacé par −x (X ci-dessous), la fenêtre est retournée.
# La fenêtre est finie : la consigne dit qu'on admet que la courbe garde son allure au-delà.
# Pas d'asymptote tracée : elle donnerait la réponse.
# =============================================================================================

def lecture_courbe(cote):
    plus = cote == '+'
    X = 'x' if plus else '(-x)'
    fen_x = 'x: -2 ; 10' if plus else 'x: -10 ; 2'
    sens = 'droite' if plus else 'gauche'
    lim = '\\displaystyle\\lim_{x\\to' + cote + '\\infty}f(x)'
    admis = ('On admet que, au-delà de la fenêtre, la courbe garde l\'allure qu\'elle a à '
             + sens + '.')

    def courbe(formule, description):
        return bloc('courbe', fen_x, 'y: -7 ; 7', 'grille: 1 ; 1',
                    'f(x) = ' + formule + '   bleu', 'taille: moyenne',
                    'description: ' + description)

    # (a) limite finie : palier L + k·e^(−X/2) ou cloche L + k/(1 + (X/3)²) ; f(0) = L + k
    palier = ('{{if:forme==0|{{L}}{{k;+}}*exp(-' + X + '/2)|{{L}}{{k;+}}/(1+(' + X
              + '/3)^2)}}')
    va = variation(
        'On a tracé ci-dessous la courbe représentative d\'une fonction $f$ définie sur '
        '$\\mathbb{R}$. ' + admis + '\n\n'
        + courbe(palier, 'Courbe d\'une fonction qui se rapproche d\'une droite horizontale vers la '
                 + sens + '.')
        + '\n\nConjecture la limite de $f$ en $' + cote + '\\infty$.\n\n$' + lim + '=?$',
        [var('forme', '0|1'), var('L', '-3..3'), var('k', '1..3;±')],
        [case('{{L}}', [
            erreur('{{eval:L+k}}',
                   'Tu as lu $f\\left( 0 \\right)$, l\'ordonnée du point de la courbe sur l\'axe des ordonnées : la '
                   'limite se lit tout à ' + sens + ', là où la courbe s\'aplatit.',
                   'Ordonnée à l\'origine'),
            erreur('0',
                   'La courbe se rapproche d\'une droite horizontale, pas forcément de l\'axe des '
                   'abscisses : lis la hauteur de cette droite.', 'Zéro par défaut'),
            erreur(PINF if plus else MINF,
                   'Tu as donné la borne où va $x$ : la limite de $f$ est la valeur dont se '
                   'rapproche $f(x)$, lue sur l\'axe des ordonnées.', 'Borne de x recopiée'),
        ])],
        [
            'Quand $x$ tend vers $' + cote + '\\infty$ (vers la ' + sens + '), la courbe se '
            'rapproche de la droite horizontale d\'équation $y={{L}}$.',
            'On conjecture que $' + lim + '=' + PRIMAIRE + '{ {{L}} }$.',
        ],
        'Regarde la courbe tout à ' + sens + ' : de quelle droite horizontale se rapproche-t-elle ? '
        'Lis la hauteur de cette droite.',
    )

    # (b) limite infinie : parabole, exponentielle ou cubique, montante (s = 1) ou descendante
    infinie = ('{{if:forme==0|{{s}}*0.4*(' + X + '-{{p}})^2{{q;+}}|{{if:forme==1|{{s}}*exp(' + X
               + '/2-2){{q;+}}|{{s}}*0.05*(' + X + '-{{p}})^3{{q;+}}}}}}')
    vb = variation(
        'On a tracé ci-dessous la courbe représentative d\'une fonction $f$ définie sur '
        '$\\mathbb{R}$. ' + admis + '\n\n'
        + courbe(infinie, 'Courbe d\'une fonction qui sort de la fenêtre vers la ' + sens + '.')
        + '\n\nConjecture la limite de $f$ en $' + cote + '\\infty$.\n\n$' + lim + '=?$',
        [var('forme', '0..2'), var('s', '1|-1'), var('p', '1..4'), var('q', '1..3;±')],
        [case('{{if:s>0|' + PINF + '|' + MINF + '}}', [
            erreur('{{if:s>0|' + MINF + '|' + PINF + '}}',
                   'Tu as pris le mauvais sens : vers la ' + sens + ', la courbe '
                   '{{if:s>0|monte|descend}} sans fin.', 'Signe de l\'infini inversé'),
            erreur('{{if:s>0|7|-7}}',
                   'Tu as lu la valeur où la courbe sort de la fenêtre : au-delà, elle continue de '
                   '{{if:s>0|monter|descendre}}.', 'Bord de la fenêtre'),
        ])],
        [
            'Quand $x$ tend vers $' + cote + '\\infty$ (vers la ' + sens + '), la courbe '
            '{{if:s>0|monte|descend}} sans se rapprocher d\'aucune droite horizontale : $f(x)$ '
            'devient {{if:s>0|aussi grand|aussi grand en valeur absolue, et négatif,}} que l\'on '
            'veut.',
            'On conjecture que $' + lim + '=' + PRIMAIRE + '{ {{if:s>0|' + PINF + '|' + MINF
            + '}} }$.',
        ],
        'Regarde la courbe vers la ' + sens + ' : se rapproche-t-elle d\'une droite horizontale, ou '
        'monte-t-elle (ou descend-elle) sans fin ?',
    )

    # (c) oscillation : c + 2 sin(2x), pas de limite ; ou oscillation amortie c + 4e^(−X/3) sin(2x)
    osc = ('{{if:forme==0|{{c}}+2*sin(2*x)|{{c}}+4*exp(-' + X + '/3)*sin(2*x)}}')
    vc = variation(
        'On a tracé ci-dessous la courbe représentative d\'une fonction $f$ définie sur '
        '$\\mathbb{R}$. ' + admis + '\n\n'
        + courbe(osc, 'Courbe d\'une fonction qui oscille autour d\'une droite horizontale.')
        + '\n\nQue peut-on conjecturer sur la limite de $f$ en $' + cote + '\\infty$ ?\n\n'
        + bloc('choix',
               '- $' + lim + '={{c}}$',
               '- $' + lim + '=' + PINF + '$',
               '- $' + lim + '=' + MINF + '$',
               '- $' + lim + '=0$',
               '- $f$ n\'a pas de limite en $' + cote + '\\infty$.'),
        [var('forme', '0|1'), var('c', '1..3;±')],
        [case('{{if:forme==0|4|0}}')],
        [
            '{{if:forme==0|Vers la ' + sens + ', la courbe oscille entre les droites d\'équations '
            '$y={{eval:c-2}}$ et $y={{eval:c+2}}$, sans que ses oscillations diminuent : $f(x)$ ne '
            'se rapproche d\'aucun nombre.|Vers la ' + sens + ', les oscillations de la courbe '
            'diminuent : la courbe se resserre autour de la droite d\'équation $y={{c}}$.}}',
            '{{if:forme==0|On conjecture que $' + PRIMAIRE + '{f\\text{ n\'a pas de limite en }'
            + cote + '\\infty}$.|On conjecture que $' + lim + '=' + PRIMAIRE + '{ {{c}} }$.}}',
        ],
        'Quand $x$ va vers la ' + sens + ', les oscillations gardent-elles la même hauteur, ou '
        'se resserrent-elles autour d\'une droite horizontale ?',
    )

    v_a = {'forme': '0', 'L': '2', 'k': '3'}
    v_a2 = {'forme': '1', 'L': '-1', 'k': '-2'}
    v_b = {'forme': '0', 's': '1', 'p': '2', 'q': '1'}
    v_b2 = {'forme': '1', 's': '-1', 'p': '2', 'q': '-2'}
    borne = PINF if plus else MINF
    specs = [
        spec('a : palier, ℓ = 2', 0, v_a, 'correct', ['2']),
        spec('a : ordonnée à l\'origine', 0, v_a, 'incorrect', ['5'],
             'Tu as lu $f\\left( 0 \\right)$, l\'ordonnée du point de la courbe sur l\'axe des ordonnées : la '
             'limite se lit tout à ' + sens + ', là où la courbe s\'aplatit.'),
        spec('a : zéro par défaut', 0, v_a, 'incorrect', ['0'],
             'La courbe se rapproche d\'une droite horizontale, pas forcément de l\'axe des '
             'abscisses : lis la hauteur de cette droite.'),
        spec('a : borne de x recopiée', 0, v_a, 'incorrect', [borne],
             'Tu as donné la borne où va $x$ : la limite de $f$ est la valeur dont se rapproche '
             '$f\\left( x \\right)$, lue sur l\'axe des ordonnées.'),
        spec('a : cloche, ℓ = −1', 0, v_a2, 'correct', ['-1']),
        spec('b : parabole montante', 1, v_b, 'correct', [PINF]),
        spec('b : signe inversé', 1, v_b, 'incorrect', [MINF],
             'Tu as pris le mauvais sens : vers la ' + sens + ', la courbe monte sans fin.'),
        spec('b : bord de la fenêtre', 1, v_b, 'incorrect', ['7'],
             'Tu as lu la valeur où la courbe sort de la fenêtre : au-delà, elle continue de '
             'monter.'),
        spec('b : exponentielle descendante', 1, v_b2, 'correct', [MINF]),
        spec('c : oscillation, pas de limite', 2, {'forme': '0', 'c': '1'}, 'correct', ['4']),
        spec('c : oscillation, valeur moyenne', 2, {'forme': '0', 'c': '1'}, 'incorrect', ['0']),
        spec('c : amortie, limite c', 2, {'forme': '1', 'c': '-2'}, 'correct', ['0']),
        spec('c : amortie, pas de limite à tort', 2, {'forme': '1', 'c': '-2'}, 'incorrect', ['4']),
    ]
    titre = ('Conjecturer la limite en +∞ d\'une fonction sur sa courbe' if plus
             else 'Conjecturer la limite en −∞ d\'une fonction sur sa courbe')
    description = ('Lecture graphique de la limite en ' + ('+∞' if plus else '−∞')
                   + ' : limite finie (palier, cloche), infinie, ou pas de limite (oscillation) '
                   '(pièges : f(0), bord de la fenêtre, oscillation amortie)')
    return modele(titre, description, 1, [va, vb, vc], specs)


# =============================================================================================
# F2 — TSPE-581 : limite par composition. Le corrigé pose X = u(x), donne la limite de X, puis
# celle de la fonction extérieure en cette limite. ln va à la rubrique logarithme (décision lts-5).
# Côté de la limite : variable sg (1 en +∞, −1 en −∞).
# =============================================================================================

COTE = '{{if:sg>0|+|-}}'
LIM_C = '\\displaystyle\\lim_{x\\to' + COTE + '\\infty}f(x)'

F2_A = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=e^{ {{k}}x }$.\n\n'
    'Détermine la limite de $f$ en $' + COTE + '\\infty$.\n\n$' + LIM_C + '=?$',
    [var('k', '2..5;±'), var('sg', '1|-1')],
    [case('{{if:k*sg>0|' + PINF + '|0}}', [
        erreur('{{if:k*sg>0|0|' + PINF + '}}',
               'Regarde d\'abord la limite de ${{k}} x$ : elle tend vers '
               '${{if:k*sg>0|+|-}}\\infty$, puis vois ce que fait l\'exponentielle en '
               '${{if:k*sg>0|+|-}}\\infty$.', 'Limite de kx mal lue'),
        erreur(MINF,
               'Une exponentielle est toujours strictement positive : elle ne tend jamais vers '
               '$-\\infty$.', 'Exponentielle vers −∞'),
    ])],
    [
        'On pose $X={{k}}x$. Quand $x$ tend vers $' + COTE + '\\infty$, $X$ tend vers '
        '${{if:k*sg>0|+|-}}\\infty$ (le coefficient ${{k}}$ est {{if:k>0|positif|négatif}}).',
        'Or $\\displaystyle\\lim_{X\\to{{if:k*sg>0|+|-}}\\infty}e^{X}={{if:k*sg>0|+\\infty|0}}$. '
        'Par composition, $' + LIM_C + '=' + PRIMAIRE + '{ {{if:k*sg>0|+\\infty|0}} }$.',
    ],
    'Pose $X={{k}}x$ : cherche vers quoi tend $X$, puis la limite de $e^{X}$.',
)

F2_B = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=e^{' + coef('a') + 'x^{ {{n}} }{{k;+}}}$.'
    '\n\nDétermine la limite de $f$ en $' + COTE + '\\infty$.\n\n$' + LIM_C + '=?$',
    [var('a', '1..5;±'), var('n', '2|3'), var('k', '1..9;±'), var('sg', '1|-1')],
    [case('{{if:a*sg^n>0|' + PINF + '|0}}', [
        erreur('{{if:a*sg^n>0|0|' + PINF + '}}',
               'Cherche d\'abord la limite de l\'exposant : en $' + COTE + '\\infty$, '
               '$x^{{n}}$ tend vers ${{if:sg^n>0|+|-}}\\infty$, et l\'exposant vers '
               '${{if:a*sg^n>0|+|-}}\\infty$.', 'Limite de l\'exposant mal lue'),
        erreur(MINF,
               'Une exponentielle est toujours strictement positive : elle ne tend jamais vers '
               '$-\\infty$.', 'Exponentielle vers −∞'),
    ])],
    [
        'On pose $X=' + coef('a') + 'x^{ {{n}} }{{k;+}}$. En $' + COTE + '\\infty$, '
        '$x^{ {{n}} }$ tend vers ${{if:sg^n>0|+|-}}\\infty$, donc $X$ tend vers '
        '${{if:a*sg^n>0|+|-}}\\infty$.',
        'Or $\\displaystyle\\lim_{X\\to{{if:a*sg^n>0|+|-}}\\infty}e^{X}='
        '{{if:a*sg^n>0|+\\infty|0}}$. Par composition, $' + LIM_C + '=' + PRIMAIRE
        + '{ {{if:a*sg^n>0|+\\infty|0}} }$.',
    ],
    'Pose $X$ égal à l\'exposant : cherche sa limite (attention au signe de $x^{ {{n}} }$), puis '
    'celle de $e^{X}$.',
)

F2_C = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=\\sqrt{' + coef('a')
    + 'x^{ {{m}} }+{{k}}}$.\n\nDétermine la limite de $f$ en $' + COTE + '\\infty$.\n\n$'
    + LIM_C + '=?$',
    [var('a', '1..5'), var('m', '2|4'), var('k', '1..8'), var('sg', '1|-1')],
    [case(PINF, [
        erreur(MINF,
               'En $-\\infty$, $x^{{m}}$ tend vers $+\\infty$ (puissance paire), et une racine '
               'carrée n\'est jamais négative.', 'Signe de la puissance paire'),
        erreur('0',
               'Sous la racine, $' + coef('a') + ' x^{{m}} + {{k}}$ tend vers $+\\infty$ : sa racine '
               'carrée aussi.', 'Zéro'),
    ])],
    [
        'On pose $X=' + coef('a') + 'x^{ {{m}} }+{{k}}$. En $' + COTE + '\\infty$, '
        '$x^{ {{m}} }$ tend vers $+\\infty$ (puissance paire), donc $X$ tend vers $+\\infty$.',
        'Or $\\displaystyle\\lim_{X\\to+\\infty}\\sqrt{X}=+\\infty$. Par composition, $' + LIM_C
        + '=' + PRIMAIRE + '{+\\infty}$.',
    ],
    'Pose $X$ égal à l\'expression sous la racine : cherche sa limite, puis celle de $\\sqrt{X}$.',
)

F2_D = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=\\left(' + coef('a')
    + 'x{{k;+}}\\right)^{ {{p}} }$.\n\nDétermine la limite de $f$ en $' + COTE + '\\infty$.'
    '\n\n$' + LIM_C + '=?$',
    [var('a', '1..4;±'), var('k', '1..9;±'), var('p', '3..5'), var('sg', '1|-1')],
    [case('{{if:(a*sg)^p>0|' + PINF + '|' + MINF + '}}', [
        erreur('{{if:(a*sg)^p>0|' + MINF + '|' + PINF + '}}',
               'Cherche d\'abord le signe de la limite de $' + coef('a') + ' x {{k;+}}$, puis '
               'celui de sa puissance ${{p}}$-ième : une puissance {{if:p==4|paire|impaire}} '
               '{{if:p==4|est positive|garde le signe}}.', 'Signe de la puissance'),
    ])],
    [
        'On pose $X=' + coef('a') + 'x{{k;+}}$. En $' + COTE + '\\infty$, $X$ tend vers '
        '${{if:a*sg>0|+|-}}\\infty$ (le coefficient de $x$ est {{if:a>0|positif|négatif}}).',
        'Or $\\displaystyle\\lim_{X\\to{{if:a*sg>0|+|-}}\\infty}X^{ {{p}} }='
        '{{if:(a*sg)^p>0|+|-}}\\infty$ (puissance {{if:p==4|paire|impaire}}). Par composition, $'
        + LIM_C + '=' + PRIMAIRE + '{ {{if:(a*sg)^p>0|+|-}}\\infty }$.',
    ],
    'Pose $X$ égal à l\'expression entre parenthèses : cherche sa limite, puis celle de '
    '$X^{ {{p}} }$ (sa parité compte).',
)

F2_E = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=\\sqrt{e^{ {{k}}x }+{{eval:m*m}}}$.'
    '\n\nDétermine la limite de $f$ en ${{if:k>0|-|+}}\\infty$.\n\n'
    '$\\displaystyle\\lim_{x\\to{{if:k>0|-|+}}\\infty}f(x)=?$',
    [var('k', '1..3;±'), var('m', '1..4')],
    [case('{{m}}', [
        erreur('{{eval:m*m}}',
               'Tu as oublié la racine carrée : $\\sqrt{ {{eval:m*m}} }={{m}}$.', 'Racine oubliée'),
        erreur(PINF,
               'En ${{if:k>0|-|+}}\\infty$, ${{k}}x$ tend vers $-\\infty$ : l\'exponentielle tend '
               'vers $0$, pas vers $+\\infty$.', 'Exponentielle vers +∞'),
        erreur('\\sqrt{ {{eval:m*m+1}} }',
               'Tu as remplacé l\'exponentielle par $1$ : elle tend vers $0$ quand son exposant '
               'tend vers $-\\infty$.', 'Exponentielle vers 1'),
    ])],
    [
        'En ${{if:k>0|-|+}}\\infty$, ${{k}}x$ tend vers $-\\infty$, donc $e^{ {{k}}x }$ tend vers '
        '$0$ et $X=e^{ {{k}}x }+{{eval:m*m}}$ tend vers ${{eval:m*m}}$.',
        'La fonction racine carrée est continue en ${{eval:m*m}}$ : par composition, '
        '$\\displaystyle\\lim_{x\\to{{if:k>0|-|+}}\\infty}f(x)=\\sqrt{ {{eval:m*m}} }=' + PRIMAIRE
        + '{ {{m}} }$.',
    ],
    'Pose $X=e^{ {{k}}x }+{{eval:m*m}}$ : cherche sa limite (que fait $e^{ {{k}}x }$ ?), puis prends '
    'la racine carrée.',
)

SPECS_F2 = [
    spec('a : e^(3x) en +∞', 0, {'k': '3', 'sg': '1'}, 'correct', [PINF]),
    spec('a : e^(3x) en +∞, 0 à tort', 0, {'k': '3', 'sg': '1'}, 'incorrect', ['0'],
         'Regarde d\'abord la limite de $3 x$ : elle tend vers $+\\infty$, puis vois ce que fait '
         'l\'exponentielle en $+\\infty$.'),
    spec('a : e^(−2x) en +∞', 0, {'k': '-2', 'sg': '1'}, 'correct', ['0']),
    spec('a : e^(−2x) en +∞, +∞ à tort', 0, {'k': '-2', 'sg': '1'}, 'incorrect', [PINF],
         'Regarde d\'abord la limite de $-2 x$ : elle tend vers $-\\infty$, puis vois ce que fait '
         'l\'exponentielle en $-\\infty$.'),
    spec('a : −∞', 0, {'k': '-2', 'sg': '-1'}, 'incorrect', [MINF],
         'Une exponentielle est toujours strictement positive : elle ne tend jamais vers '
         '$-\\infty$.'),
    spec('a : e^(−2x) en −∞', 0, {'k': '-2', 'sg': '-1'}, 'correct', [PINF]),
    spec('b : e^(−2x² + 1) en −∞', 1, {'a': '-2', 'n': '2', 'k': '1', 'sg': '-1'}, 'correct', ['0']),
    spec('b : parité oubliée', 1, {'a': '-2', 'n': '2', 'k': '1', 'sg': '-1'}, 'incorrect', [PINF],
         'Cherche d\'abord la limite de l\'exposant : en $-\\infty$, $x^2$ tend vers $+\\infty$, '
         'et l\'exposant vers $-\\infty$.'),
    spec('b : e^(2x³ − 3) en −∞', 1, {'a': '2', 'n': '3', 'k': '-3', 'sg': '-1'}, 'correct', ['0']),
    spec('b : e^(x² + 4) en −∞', 1, {'a': '1', 'n': '2', 'k': '4', 'sg': '-1'}, 'correct', [PINF]),
    spec('b : −∞', 1, {'a': '2', 'n': '3', 'k': '-3', 'sg': '-1'}, 'incorrect', [MINF],
         'Une exponentielle est toujours strictement positive : elle ne tend jamais vers '
         '$-\\infty$.'),
    spec('c : √(2x² + 3) en −∞', 2, {'a': '2', 'm': '2', 'k': '3', 'sg': '-1'}, 'correct', [PINF]),
    spec('c : −∞ à tort', 2, {'a': '2', 'm': '2', 'k': '3', 'sg': '-1'}, 'incorrect', [MINF],
         'En $-\\infty$, $x^2$ tend vers $+\\infty$ (puissance paire), et une racine carrée '
         'n\'est jamais négative.'),
    spec('c : zéro', 2, {'a': '1', 'm': '4', 'k': '5', 'sg': '1'}, 'incorrect', ['0'],
         'Sous la racine, $x^4 + 5$ tend vers $+\\infty$ : sa racine carrée aussi.'),
    spec('d : (2x + 1)³ en −∞', 3, {'a': '2', 'k': '1', 'p': '3', 'sg': '-1'}, 'correct', [MINF]),
    spec('d : (2x + 1)⁴ en −∞', 3, {'a': '2', 'k': '1', 'p': '4', 'sg': '-1'}, 'correct', [PINF]),
    spec('d : (−3x + 2)⁵ en +∞', 3, {'a': '-3', 'k': '2', 'p': '5', 'sg': '1'}, 'correct', [MINF]),
    spec('d : signe de la puissance', 3, {'a': '2', 'k': '1', 'p': '3', 'sg': '-1'}, 'incorrect',
         [PINF],
         'Cherche d\'abord le signe de la limite de $2 x + 1$, puis celui de sa puissance $3$-ième : '
         'une puissance impaire garde le signe.'),
    spec('e : √(e^(2x) + 9) en −∞', 4, {'k': '2', 'm': '3'}, 'correct', ['3']),
    spec('e : racine oubliée', 4, {'k': '2', 'm': '3'}, 'incorrect', ['9'],
         'Tu as oublié la racine carrée : $\\sqrt{9} = 3$.'),
    spec('e : +∞ à tort', 4, {'k': '-1', 'm': '2'}, 'incorrect', [PINF],
         'En $+\\infty$, $-x$ tend vers $-\\infty$ : l\'exponentielle tend vers $0$, pas vers '
         '$+\\infty$.'),
    spec('e : exponentielle vers 1', 4, {'k': '2', 'm': '3'}, 'incorrect', ['\\sqrt{10}'],
         'Tu as remplacé l\'exponentielle par $1$ : elle tend vers $0$ quand son exposant tend '
         'vers $-\\infty$.'),
]

F2 = modele(
    'Limite d\'une fonction par composition',
    'Poser X = u(x), chercher la limite de X, puis celle de la fonction de référence : e^(kx), '
    'e^(axⁿ + k), √(axᵐ + k), (ax + k)ᵖ, √(e^(kx) + m²) (pièges : signe de xⁿ en −∞, exponentielle '
    'vers −∞ ou vers 1, racine oubliée)',
    2, [F2_A, F2_B, F2_C, F2_D, F2_E], SPECS_F2)


# =============================================================================================
# Q2 — Quantité conjuguée : modèle SANS point (choix de David, 2026-11-22). La technique n'est ni
# nommée ni illustrée au BO de Tle spé (src/lib/server/programmes/transcriptions/T_SPE.md), qui
# demande des « cas simples ». Deux variations validées, limite 0.
# =============================================================================================

FI = ('C\'est une forme indéterminée « $\\infty - \\infty$ » : multiplie et divise par la quantité '
      'conjuguée avant de conclure.')

Q2_A = variation(
    'Soit $f$ la fonction définie sur $\\left[0\\,;+\\infty\\right[$ par '
    '$f(x)=\\sqrt{' + coef('a') + 'x+{{b}}}-\\sqrt{' + coef('a') + 'x+{{d}}}$.\n\n'
    'Détermine la limite de $f$ en $+\\infty$.\n\n$\\displaystyle\\lim_{x\\to+\\infty}f(x)=?$',
    [var('a', '1..5'), var('b', '1..9'), var('d', '1..9')],
    [case('0', [
        erreur(PINF, FI, 'FI prise pour +∞'),
        erreur('{{eval:b-d}}',
               'Tu as gardé le numérateur ${{b}} - {{d}}$ : le dénominateur, somme de deux racines, '
               'tend vers $+\\infty$.', 'Dénominateur oublié'),
    ])],
    [
        'En $+\\infty$, les deux racines tendent vers $+\\infty$ : forme indéterminée. On multiplie '
        'et on divise par la quantité conjuguée $\\sqrt{' + coef('a') + 'x+{{b}}}+\\sqrt{' + coef('a')
        + 'x+{{d}}}$.',
        '$f(x)=\\dfrac{(' + coef('a') + 'x+{{b}})-(' + coef('a') + 'x+{{d}})}{\\sqrt{' + coef('a')
        + 'x+{{b}}}+\\sqrt{' + coef('a') + 'x+{{d}}}}=\\dfrac{ {{eval:b-d}} }{\\sqrt{' + coef('a')
        + 'x+{{b}}}+\\sqrt{' + coef('a') + 'x+{{d}}}}$.',
        'Le dénominateur tend vers $+\\infty$, le numérateur est constant : '
        '$\\displaystyle\\lim_{x\\to+\\infty}f(x)=' + PRIMAIRE + '{0}$.',
    ],
    'Multiplie et divise $f(x)$ par $\\sqrt{' + coef('a') + 'x+{{b}}}+\\sqrt{' + coef('a')
    + 'x+{{d}}}$, puis utilise $(A-B)(A+B)=A^{2}-B^{2}$.',
    ['b != d'],
)

Q2_B = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=\\sqrt{x^{2}+{{b}}}-\\sqrt{x^{2}+{{d}}}$.'
    '\n\nDétermine la limite de $f$ en $' + COTE + '\\infty$.\n\n$' + LIM_C + '=?$',
    [var('b', '1..9'), var('d', '1..9'), var('sg', '1|-1')],
    [case('0', [
        erreur(PINF, FI, 'FI prise pour +∞'),
        erreur('{{eval:b-d}}',
               'Tu as gardé le numérateur ${{b}} - {{d}}$ : le dénominateur, somme de deux racines, '
               'tend vers $+\\infty$.', 'Dénominateur oublié'),
    ])],
    [
        'En $' + COTE + '\\infty$, $x^{2}$ tend vers $+\\infty$ : les deux racines tendent vers '
        '$+\\infty$, forme indéterminée. On multiplie et on divise par la quantité conjuguée.',
        '$f(x)=\\dfrac{(x^{2}+{{b}})-(x^{2}+{{d}})}{\\sqrt{x^{2}+{{b}}}+\\sqrt{x^{2}+{{d}}}}='
        '\\dfrac{ {{eval:b-d}} }{\\sqrt{x^{2}+{{b}}}+\\sqrt{x^{2}+{{d}}}}$.',
        'Le dénominateur tend vers $+\\infty$, le numérateur est constant : $' + LIM_C + '='
        + PRIMAIRE + '{0}$.',
    ],
    'Multiplie et divise $f(x)$ par $\\sqrt{x^{2}+{{b}}}+\\sqrt{x^{2}+{{d}}}$, puis utilise '
    '$(A-B)(A+B)=A^{2}-B^{2}$.',
    ['b != d'],
)

SPECS_Q2 = [
    spec('a : √(2x+7) − √(2x+3)', 0, {'a': '2', 'b': '7', 'd': '3'}, 'correct', ['0']),
    spec('a : FI prise pour +∞', 0, {'a': '2', 'b': '7', 'd': '3'}, 'incorrect', [PINF], FI),
    spec('a : dénominateur oublié', 0, {'a': '2', 'b': '7', 'd': '3'}, 'incorrect', ['4'],
         'Tu as gardé le numérateur $7 - 3$ : le dénominateur, somme de deux racines, tend vers '
         '$+\\infty$.'),
    spec('b : √(x²+2) − √(x²+5) en −∞', 1, {'b': '2', 'd': '5', 'sg': '-1'}, 'correct', ['0']),
    spec('b : dénominateur oublié', 1, {'b': '2', 'd': '5', 'sg': '-1'}, 'incorrect', ['-3'],
         'Tu as gardé le numérateur $2 - 5$ : le dénominateur, somme de deux racines, tend vers '
         '$+\\infty$.'),
    spec('b : FI prise pour +∞', 1, {'b': '2', 'd': '5', 'sg': '1'}, 'incorrect', [PINF], FI),
]

Q2 = modele(
    'Lever une forme indéterminée avec la quantité conjuguée',
    'Différence de deux racines carrées en l\'infini (√(ax + b) − √(ax + d), √(x² + b) − √(x² + d)) : '
    'multiplier par la quantité conjuguée. Hors programme de Terminale (technique ni nommée ni '
    'illustrée au BO), rangé sans point (pièges : ∞ − ∞ pris pour +∞, dénominateur oublié)',
    3, [Q2_A, Q2_B], SPECS_Q2)


ecrire('f01a-lecture-limite-courbe-plus-infini', lecture_courbe('+'))
ecrire('f01b-lecture-limite-courbe-moins-infini', lecture_courbe('-'))
ecrire('f02-limite-par-composition', F2)
ecrire('q02-quantite-conjuguee-sans-point', Q2)
print('4 modèles écrits dans', DOSSIER)
