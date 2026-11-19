"""Écrit les 5 modèles du lot 6 « fonction inverse » de la Terminale technologique (STMG)
dans scripts/questions/ttechno-6-inverse/.

Phase 0 validée par David le 2026-11-19 (journal docs/archive/wip/questions-ttechno-progress.md § 44,
Q28 à Q31 : « je te suis ») :

| #  | Point        | Nœud (posé par la migration)                   | Niveau | Réponse                    |
| I1 | TTECHNO-045  | Fonction inverse › définition et courbe         | 1 | nombre ; case choix             |
| I2 | TTECHNO-086  | Fonction inverse › définition et courbe         | 1 | case choix ; nombre             |
| I3 | TTECHNO-049  | Dérivation › variations et extremums            | 2 | expression ; intervalle ; choix |
| I4 | TTECHNO-049  | Dérivation › variations et extremums            | 2 | nombres                         |
| I5 | TTECHNO-087  | Dérivation › variations et extremums            | 1 | placer ; choix de courbes       |

Bornes (BO Tle techno p.9, ttechno.md) : comportement aux bornes et asymptotes en approche
intuitive, notation lim admise pour 1/x, k/x, a + k/x seulement (ltt-6) ; fonctions P(x) + k/x
avec deg P ⩽ 3, forme quotient admise (ltt-4) ; dérivées des polynômes et de 1/x seulement.
Q28 : ]0 ; +∞[ partout, une variation sur ℝ privé de 0 (tableau de SIGNES seul : une ligne
`variation:` exigerait des limites en 0, hors bornes pour x + k/x). Q29 : une variation x² + k/x.

Pièges : jamais de variable `e` ni `i` ; case choix → `melanger: non`, réponse = rang ; eval ne
connaît ni `>` ni `==` (indicatrices par floor / min / max / abs).

    python3 docs/wip/questions/lot-ttechno-6.py scripts/questions/ttechno-6-inverse
"""
import json
import os
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables_, answers, status, violations=None):
    if isinstance(answers, str):
        answers = [answers]
    expected = {'status': status}
    if violations:
        expected['constraintViolations'] = violations
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'answers': answers, 'expected': expected}


def modele(title, description, level, delay, variations, specs, shared=None):
    # Ni theme, ni domain, ni subdomain (ADR 0035) ; nœud et tag posés par la migration.
    return {'title': title, 'description': description, 'grades': ['T_TECHNO'], 'level': level,
            'delay': delay, 'status': 'draft', 'shared': shared or {}, 'variations': variations,
            'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, reponses, steps, conditions=None):
    v = {'statement': statement, 'variables': variables, 'conditions': conditions or []}
    if reponses is not None:  # None : geste placer:, sans case
        if not isinstance(reponses, list):
            reponses = [reponses]
        v['blanks'] = [r if isinstance(r, dict) else {'expectedAnswer': r} for r in reponses]
    v['correction'] = {'steps': steps}
    return v


def col(x):
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


def colt(x):
    """Couleur hors d'une formule : entourée de $."""
    return '$' + col(x) + '$'


def choix(*options):
    return '\n\n```choix\nmelanger: non\n' + ''.join('- ' + o + '\n' for o in options) + '```'


def courbe(fonction, x, y, description, grille='1 ; 1', taille='petite', extra=''):
    return ('```courbe\n'
            'x: ' + x + '\n'
            'y: ' + y + '\n'
            'grille: ' + grille + '\n'
            'f(x) = ' + fonction + '   bleu\n'
            + extra +
            'taille: ' + taille + '\n'
            'description: ' + description + '\n'
            '```')


def choix_courbes(*items):
    """items : (fonction, description) ; courbes de même fenêtre, dans l'ordre donné."""
    corps = ''
    for fonction, description in items:
        bloc = courbe(fonction, '0 ; 6.5', '-6 ; 10', description)
        corps += '- ' + bloc.replace('\n', '\n  ') + '\n'
    return '\n\n````choix\nmelanger: non\n' + corps + '````'


REGLAGES = {'blankDefaults': {'acceptDecimal': True}, 'cleanCoefficients': True}
# k/x écrit avec le signe devant la fraction : sg = ±1, k > 0.
SG_K = '{{if:sg<0|-|+}}\\dfrac{ {{k}} }{x}'
LIM_DROITE = '\\lim_{x\\to0,\\ x>0}'

# --- I1, TTECHNO-045 : 1/x pour x très grand ou proche de 0 ---------------------------------

I1 = modele(
    'Inverse d\'un nombre très grand ou très proche de 0',
    'Ordres de grandeur de 1/x pour x = ±10⁻ⁿ et 10ⁿ ; ce que devient 1/x quand x devient très'
    ' grand ou très proche de 0 ; notation lim pour a + k/x et k/x',
    1, 40,
    [
        variation(
            'Calcule l\'inverse de ${{eval:sg*10^(-n);d}}$.\n\n'
            '$\\dfrac{1}{ {{eval:sg*10^(-n);d}} }=?$',
            [var('n', '2..5'), var('sg', '1|1|-1')], '{{eval:sg*10^n}}',
            ['${{eval:10^(-n);d}}=\\dfrac{1}{ {{eval:10^n}} }$ : diviser $1$ par ce nombre revient à'
             ' multiplier par ${{eval:10^n}}$.',
             '$\\dfrac{1}{ {{eval:sg*10^(-n);d}} }=' + col('{{eval:sg*10^n}}') + '$ : l\'inverse'
             ' d\'un nombre très proche de $0$ est très grand en valeur absolue, et de même signe.'],
        ),
        variation(
            'Calcule l\'inverse de ${{eval:10^n}}$, en écriture décimale.\n\n'
            '$\\dfrac{1}{ {{eval:10^n}} }=?$',
            [var('n', '3..6')], '{{eval:10^(-n);d}}',
            ['$\\dfrac{1}{ {{eval:10^n}} }=10^{ -{{n}} }=' + col('{{eval:10^(-n);d}}') + '$ : '
             'l\'inverse d\'un très grand nombre est très proche de $0$.'],
        ),
        variation(
            'On donne à $x$ des valeurs {{if:sg>0|positives|négatives}} de plus en plus grandes'
            ' en valeur absolue : ${{eval:sg*10}}$, ${{eval:sg*100}}$, ${{eval:sg*1000}}$…\n\n'
            'Que devient $\\dfrac{1}{x}$ ?'
            + choix('il devient de plus en plus grand',
                    'il se rapproche de $1$',
                    'il se rapproche de $0$'),
            [var('sg', '1|-1')], '2',
            ['$\\dfrac{1}{ {{eval:sg*10}} }={{eval:sg*0.1;d}}$, $\\dfrac{1}{ {{eval:sg*100}} }'
             '={{eval:sg*0.01;d}}$, $\\dfrac{1}{ {{eval:sg*1000}} }={{eval:sg*0.001;d}}$…',
             '$\\dfrac{1}{x}$ ' + colt('\\text{se rapproche de } 0') + ' (en restant'
             ' {{if:sg>0|positif|négatif}}) : la courbe de la fonction inverse se rapproche de'
             ' l\'axe des abscisses.'],
        ),
        variation(
            'On donne à $x$ des valeurs {{if:sg>0|positives|négatives}} de plus en plus proches'
            ' de $0$ : ${{eval:sg*0.1;d}}$, ${{eval:sg*0.01;d}}$, ${{eval:sg*0.001;d}}$…\n\n'
            'Que devient $\\dfrac{1}{x}$ ?'
            + choix('il devient positif et de plus en plus grand',
                    'il devient négatif et de plus en plus grand en valeur absolue',
                    'il se rapproche de $0$'),
            [var('sg', '1|-1')], '{{eval:(1-sg)/2}}',
            ['$\\dfrac{1}{ {{eval:sg*0.1;d}} }={{eval:sg*10}}$, $\\dfrac{1}{ {{eval:sg*0.01;d}} }'
             '={{eval:sg*100}}$, $\\dfrac{1}{ {{eval:sg*0.001;d}} }={{eval:sg*1000}}$…',
             '$\\dfrac{1}{x}$ est du signe de $x$ et ' + colt('\\text{devient de plus en plus grand'
             ' en valeur absolue}') + ' : la branche de la courbe {{if:sg>0|monte le long|descend'
             ' le long}} de l\'axe des ordonnées.'],
        ),
        variation(
            'Complète.\n\n$\\lim_{x\\to+\\infty}\\left({{a}}' + SG_K + '\\right)=?$',
            [var('a', '-5..5'), var('k', '1..9'), var('sg', '1|-1')], '{{a}}',
            ['Quand $x$ devient très grand, $\\dfrac{ {{k}} }{x}$ se rapproche de $0$.',
             'Donc ${{a}}' + SG_K + '$ se rapproche de ${{a}}$ : $\\lim_{x\\to+\\infty}'
             '\\left({{a}}' + SG_K + '\\right)=' + col('{{a}}') + '$.'],
            ['a != 0'],
        ),
        variation(
            'Complète : que vaut $' + LIM_DROITE + '\\dfrac{ {{eval:sg*k}} }{x}$ ?'
            + choix('$-\\infty$', '$0$', '$+\\infty$'),
            [var('k', '2..9'), var('sg', '1|-1')], '{{eval:1+sg}}',
            ['Quand $x$ se rapproche de $0$ en restant positif, $\\dfrac{1}{x}$ devient positif'
             ' et de plus en plus grand : $' + LIM_DROITE + '\\dfrac{1}{x}=+\\infty$.',
             'On multiplie par ${{eval:sg*k}}$, {{if:sg>0|positif : le signe ne change pas|négatif :'
             ' le signe change}}. $' + LIM_DROITE + '\\dfrac{ {{eval:sg*k}} }{x}='
             + col('{{if:sg>0|+|-}}\\infty') + '$.'],
        ),
    ],
    [
        spec('1/0,001 = 1000', 0, {'n': '3', 'sg': '1'}, '1000', 'correct'),
        spec('Erreur : 0,001', 0, {'n': '3', 'sg': '1'}, '0,001', 'incorrect'),
        spec('1/(−0,01) = −100', 0, {'n': '2', 'sg': '-1'}, '-100', 'correct'),
        spec('Erreur : signe perdu (100)', 0, {'n': '2', 'sg': '-1'}, '100', 'incorrect'),
        spec('1/10000 = 0,0001', 1, {'n': '4'}, '0,0001', 'correct'),
        spec('Erreur : un zéro de trop (0,00001)', 1, {'n': '4'}, '0,00001', 'incorrect'),
        spec('x très grand : se rapproche de 0', 2, {'sg': '1'}, '2', 'correct'),
        spec('Erreur : de plus en plus grand', 2, {'sg': '1'}, '0', 'incorrect'),
        spec('x négatif très grand : se rapproche de 0', 2, {'sg': '-1'}, '2', 'correct'),
        spec('x → 0, x > 0 : positif et très grand', 3, {'sg': '1'}, '0', 'correct'),
        spec('Erreur : se rapproche de 0', 3, {'sg': '1'}, '2', 'incorrect'),
        spec('x → 0, x < 0 : négatif et très grand', 3, {'sg': '-1'}, '1', 'correct'),
        spec('Erreur x < 0 : positif', 3, {'sg': '-1'}, '0', 'incorrect'),
        spec('lim 3 + 5/x = 3', 4, {'a': '3', 'k': '5', 'sg': '1'}, '3', 'correct'),
        spec('Erreur : 0', 4, {'a': '3', 'k': '5', 'sg': '1'}, '0', 'incorrect'),
        spec('lim −2 − 4/x = −2', 4, {'a': '-2', 'k': '4', 'sg': '-1'}, '-2', 'correct'),
        spec('lim 3/x en 0⁺ = +∞', 5, {'k': '3', 'sg': '1'}, '2', 'correct'),
        spec('lim −3/x en 0⁺ = −∞', 5, {'k': '3', 'sg': '-1'}, '0', 'correct'),
        spec('Erreur : +∞ (signe de k oublié)', 5, {'k': '3', 'sg': '-1'}, '2', 'incorrect'),
        spec('Erreur : 0', 5, {'k': '3', 'sg': '1'}, '1', 'incorrect'),
    ],
    shared=REGLAGES,
)

# --- I2, TTECHNO-086 : asymptotes de l'hyperbole, par lecture --------------------------------
# f(x) = a + sg·k/x, tracée : la courbe se rapproche de x = 0 et de y = a.

FONC_I2 = '{{a}} + ({{eval:sg*k}})/x'
COURBE_I2 = courbe(
    FONC_I2, '-6 ; 6', '{{eval:a-6}} ; {{eval:a+6}}',
    'Hyperbole en deux branches, de part et d\'autre de l\'axe des ordonnées ; les branches se'
    ' rapprochent de la droite horizontale d\'ordonnée {{a}} quand x devient très grand en valeur'
    ' absolue.', taille='moyenne')
COURBE_I2_K = courbe(
    '({{eval:sg*k}})/x', '-6 ; 6', '-6 ; 6',
    'Hyperbole en deux branches, de part et d\'autre de l\'axe des ordonnées, qui se rapprochent'
    ' des deux axes.', taille='moyenne')
SOUS_I2 = ('Quand $x$ devient très grand en valeur absolue, $\\dfrac{ {{k}} }{x}$ se rapproche de'
           ' $0$ : la courbe se rapproche de la droite d\'équation $y={{a}}$ (asymptote'
           ' horizontale).')
VERT_I2 = ('Quand $x$ se rapproche de $0$, $\\dfrac{ {{k}} }{x}$ devient très grand en valeur'
           ' absolue : la courbe longe l\'axe des ordonnées, la droite d\'équation $x=0$ (asymptote'
           ' verticale). $f$ n\'est pas définie en $0$.')

I2 = modele(
    'Asymptotes de l\'hyperbole, par lecture',
    'Droites dont la courbe de k/x ou de a + k/x se rapproche, lues sur la courbe ou sur'
    ' l\'expression : axes, y = a',
    1, 30,
    [
        variation(
            'Voici la courbe de la fonction $f$ définie sur $\\mathbb{R}\\setminus\\{0\\}$ par'
            ' $f(x)=\\dfrac{ {{eval:sg*k}} }{x}$.\n\n' + COURBE_I2_K + '\n\n'
            'De quelles droites la courbe se rapproche-t-elle ?'
            + choix('de l\'axe des abscisses et de l\'axe des ordonnées',
                    'de la droite d\'équation $y=x$ et de l\'axe des abscisses',
                    'de l\'axe des ordonnées seulement',
                    'des droites d\'équations $x={{k}}$ et $y={{k}}$'),
            [var('k', '1..4'), var('sg', '1|-1')], '0',
            ['Quand $x$ devient très grand en valeur absolue, $\\dfrac{ {{eval:sg*k}} }{x}$ se'
             ' rapproche de $0$ : la courbe se rapproche de l\'axe des abscisses ($y=0$).',
             'Quand $x$ se rapproche de $0$, $\\dfrac{ {{eval:sg*k}} }{x}$ devient très grand en'
             ' valeur absolue : la courbe longe l\'axe des ordonnées ($x=0$).',
             'Réponse : ' + colt('\\text{les deux axes}') + ', les deux asymptotes de l\'hyperbole.'],
        ),
        variation(
            'Voici la courbe de la fonction $f$ définie sur $\\mathbb{R}\\setminus\\{0\\}$ par'
            ' $f(x)={{a}}' + SG_K + '$.\n\n' + COURBE_I2 + '\n\n'
            'Quand $x$ devient très grand, la courbe se rapproche d\'une droite horizontale.'
            ' Quelle est son équation ?\n\n$y=?$',
            [var('a', '-3..3'), var('k', '1..4'), var('sg', '1|-1')], '{{a}}',
            [SOUS_I2, 'L\'asymptote horizontale a pour équation $y=' + col('{{a}}') + '$.'],
            ['a != 0'],
        ),
        variation(
            'Voici la courbe de la fonction $f$ définie sur $\\mathbb{R}\\setminus\\{0\\}$ par'
            ' $f(x)={{a}}' + SG_K + '$.\n\n' + COURBE_I2 + '\n\n'
            'Quand $x$ se rapproche de $0$, de quelle droite la courbe se rapproche-t-elle ?'
            + choix('de la droite d\'équation $y={{a}}$', 'de l\'axe des abscisses',
                    'de l\'axe des ordonnées', 'de la droite d\'équation $x={{a}}$'),
            [var('a', '-3..3'), var('k', '1..4'), var('sg', '1|-1')], '2',
            [VERT_I2, 'Réponse : ' + colt('\\text{l\'axe des ordonnées}') + ' ($x=0$).'],
            ['a != 0'],
        ),
        variation(
            'On considère la fonction $f$ définie sur $\\mathbb{R}\\setminus\\{0\\}$ par'
            ' $f(x)={{a}}' + SG_K + '$.\n\n'
            'Sans tracer la courbe, donne l\'équation de son asymptote horizontale.\n\n$y=?$',
            [var('a', '-9..9'), var('k', '2..20'), var('sg', '1|-1')], '{{a}}',
            [SOUS_I2, 'L\'asymptote horizontale a pour équation $y=' + col('{{a}}') + '$.'],
            ['a != 0', 'a != k'],
        ),
    ],
    [
        spec('k/x : les deux axes', 0, {'k': '2', 'sg': '1'}, '0', 'correct'),
        spec('Erreur : axe des ordonnées seulement', 0, {'k': '2', 'sg': '1'}, '2', 'incorrect'),
        spec('2 + 3/x : y = 2', 1, {'a': '2', 'k': '3', 'sg': '1'}, '2', 'correct'),
        spec('Erreur : y = 3 (k au lieu de a)', 1, {'a': '2', 'k': '3', 'sg': '1'}, '3',
             'incorrect'),
        spec('−1 − 2/x : y = −1', 1, {'a': '-1', 'k': '2', 'sg': '-1'}, '-1', 'correct'),
        spec('x → 0 : axe des ordonnées', 2, {'a': '2', 'k': '3', 'sg': '1'}, '2', 'correct'),
        spec('Erreur : y = a', 2, {'a': '2', 'k': '3', 'sg': '1'}, '0', 'incorrect'),
        spec('Erreur : x = a', 2, {'a': '2', 'k': '3', 'sg': '1'}, '3', 'incorrect'),
        spec('5 − 12/x : y = 5', 3, {'a': '5', 'k': '12', 'sg': '-1'}, '5', 'correct'),
        spec('Erreur : y = 0', 3, {'a': '5', 'k': '12', 'sg': '-1'}, '0', 'incorrect'),
    ],
    shared=REGLAGES,
)

# --- I3, TTECHNO-049 : étudier f(x) = ax + b + k/x ------------------------------------------
# k = a·m² : f′(x) = (ax² − k)/x² s'annule en m (entier), minimum f(m) = 2am + b.

FONC_I3 = '{{if:a>1|{{a}}}}x{{if:b>0|+{{b}}}}{{if:b<0|{{b}}}}+\\dfrac{ {{k}} }{x}'
VARS_I3 = [var('a', '1|2'), var('m', '2..5'), var('k', 'eval:a*m^2'), var('b', '-5..5')]
SUR_I3 = ('On considère la fonction $f$ définie sur $\\left]0\\,;+\\infty\\right[$ par $f(x)='
          + FONC_I3 + '$.')
DERIV_I3 = ('La dérivée de $x\\mapsto\\dfrac{1}{x}$ est $x\\mapsto-\\dfrac{1}{x^2}$ ; celle de'
            ' $x\\mapsto {{if:a>1|{{a}}}}x{{if:b>0|+{{b}}}}{{if:b<0|{{b}}}}$ est la constante'
            ' ${{a}}$.')
TABLEAU_I3 = ('```variation\nvariable: x\ndomain: ]0, [{{m}}, [+inf[\n\n'
              'sign: f\'(x)\n  0: ||\n  0,{{m}}: -\n  {{m}}: z\n  {{m}},+inf: +\n\n'
              'variation: f(x)\n  {{m}}: {{eval:2*a*m+b}}, bottom\n```')
SIGNE_I3 = ('Sur $\\left]0\\,;+\\infty\\right[$, $x^2>0$ : $f\'(x)$ a le signe de'
            ' ${{if:a>1|{{a}}}}x^2-{{k}}={{if:a>1|{{a}}}}\\left(x^2-{{m}}^2\\right)$, négatif pour'
            ' $0<x<{{m}}$, nul en ${{m}}$, positif pour $x>{{m}}$.')
QUOT_I3 = '\\dfrac{ {{if:a>1|{{a}}}}x^2-{{k}} }{x^2}'

I3 = modele(
    'Étudier une fonction ax + b + k/x',
    'Dérivée a − k/x² ; même dénominateur ; signe de f′ et sens de variation sur ]0 ; +∞[ ;'
    ' minimum ; x + k/x sur ℝ privé de 0 ; x² + k/x',
    2, 120,
    [
        variation(
            SUR_I3 + '\n\nCalcule $f\'(x)$.\n\n$f\'(x)=?$',
            VARS_I3, '{{a}}-\\frac{ {{k}} }{x^2}',
            [DERIV_I3,
             'Donc $f\'(x)=' + col('{{a}}-\\dfrac{ {{k}} }{x^2}') + '$.'],
        ),
        variation(
            SUR_I3 + ' Sa dérivée est $f\'(x)={{a}}-\\dfrac{ {{k}} }{x^2}$.\n\n'
            'Écris $f\'(x)$ avec un seul dénominateur.\n\n$f\'(x)=\\dfrac{?}{x^2}$',
            VARS_I3, '{{if:a>1|{{a}}}}x^2-{{k}}',
            ['On écrit ${{a}}=\\dfrac{ {{a}}x^2}{x^2}$ :',
             '$f\'(x)=\\dfrac{ {{a}}x^2}{x^2}-\\dfrac{ {{k}} }{x^2}=\\dfrac{'
             + col('{{if:a>1|{{a}}}}x^2-{{k}}') + '}{x^2}$.'],
        ),
        variation(
            SUR_I3 + ' Sa dérivée est $f\'(x)=' + QUOT_I3 + '$.\n\n'
            'Sur quel intervalle $f\'(x)\\geqslant 0$ ?\n\n$S=?$',
            VARS_I3, {'expectedAnswer': '[{{m}};+\\infty[', 'answerKind': 'intervalles'},
            [SIGNE_I3, TABLEAU_I3,
             '$S=' + col('\\left[{{m}}\\,;+\\infty\\right[') + '$ : $f$ est croissante sur cet'
             ' intervalle, décroissante sur $\\left]0\\,;{{m}}\\right]$.'],
        ),
        variation(
            SUR_I3 + ' Sa dérivée est $f\'(x)=' + QUOT_I3 + '$.\n\n'
            '$f$ admet un minimum sur $\\left]0\\,;+\\infty\\right[$. Pour quelle valeur de $x$, et'
            ' quel est ce minimum ?\n\n$x=?$ ; minimum $=?$',
            VARS_I3, ['{{m}}', '{{eval:2*a*m+b}}'],
            [SIGNE_I3, TABLEAU_I3,
             '$f$ décroît puis croît : le minimum est atteint en $x=' + col('{{m}}') + '$ et vaut'
             ' $f({{m}})={{eval:a*m}}{{if:b>0|+{{b}}}}{{if:b<0|{{b}}}}+\\dfrac{ {{k}} }{ {{m}} }='
             + col('{{eval:2*a*m+b}}') + '$.'],
        ),
        variation(
            'On considère la fonction $f$ définie sur $\\mathbb{R}\\setminus\\{0\\}$ par'
            ' $f(x)=x+\\dfrac{ {{k}} }{x}$. Sa dérivée est $f\'(x)=\\dfrac{x^2-{{k}} }{x^2}$.\n\n'
            'Sur quels intervalles $f$ est-elle décroissante ?'
            + choix('sur $\\left[-{{m}}\\,;0\\right[$ et sur $\\left]0\\,;{{m}}\\right]$',
                    'sur $\\left[-{{m}}\\,;{{m}}\\right]$',
                    'sur $\\left]-\\infty\\,;-{{m}}\\right]$ et sur $\\left[{{m}}\\,;+\\infty'
                    '\\right[$',
                    'sur $\\left]0\\,;{{m}}\\right]$ seulement'),
            [var('m', '2..5'), var('k', 'eval:m^2')], '0',
            ['$x^2>0$ : $f\'(x)$ a le signe de $x^2-{{k}}=(x-{{m}})(x+{{m}})$, qui s\'annule en'
             ' $-{{m}}$ et en ${{m}}$. $f$ n\'est pas définie en $0$ (double barre).',
             '```variation\nvariable: x\ndomain: -inf, -{{m}}, 0, {{m}}, +inf\n\n'
             'sign: f\'(x)\n  -inf,-{{m}}: +\n  -{{m}}: z\n  -{{m}},0: -\n  0: ||\n'
             '  0,{{m}}: -\n  {{m}}: z\n  {{m}},+inf: +\n```',
             '$f$ est décroissante ' + colt('\\text{sur } \\left[-{{m}}\\,;0\\right[ \\text{ et sur }'
             ' \\left]0\\,;{{m}}\\right]') + ', séparément : on ne peut pas écrire'
             ' $\\left[-{{m}}\\,;{{m}}\\right]$, qui contient $0$.'],
        ),
        variation(
            'On considère la fonction $f$ définie sur $\\left]0\\,;+\\infty\\right[$ par'
            ' $f(x)=x^2+\\dfrac{ {{k}} }{x}$. Sa dérivée est $f\'(x)=2x-\\dfrac{ {{k}} }{x^2}'
            '=\\dfrac{2x^3-{{k}} }{x^2}$.\n\n'
            '$f$ est décroissante puis croissante. En quelle valeur de $x$ change-t-elle de sens,'
            ' et quel est son minimum ?\n\n$x=?$ ; minimum $=?$',
            [var('c', '2..4'), var('k', 'eval:2*c^3')], ['{{c}}', '{{eval:3*c^2}}'],
            ['$x^2>0$ : $f\'(x)$ a le signe de $2x^3-{{k}}$. Or $2x^3={{k}}$ pour'
             ' $x^3={{eval:c^3}}$, soit $x={{c}}$ ; la fonction cube étant croissante,'
             ' $2x^3-{{k}}<0$ pour $x<{{c}}$ et $>0$ pour $x>{{c}}$.',
             '```variation\nvariable: x\ndomain: ]0, [{{c}}, [+inf[\n\n'
             'sign: f\'(x)\n  0: ||\n  0,{{c}}: -\n  {{c}}: z\n  {{c}},+inf: +\n\n'
             'variation: f(x)\n  {{c}}: {{eval:3*c^2}}, bottom\n```',
             'Changement de sens en $x=' + col('{{c}}') + '$ ; minimum $f({{c}})={{eval:c^2}}'
             '+\\dfrac{ {{k}} }{ {{c}} }=' + col('{{eval:3*c^2}}') + '$.'],
        ),
    ],
    [
        spec('2x + 1 + 18/x : 2 − 18/x²', 0, {'a': '2', 'm': '3', 'k': '18', 'b': '1'},
             '2-\\frac{18}{x^2}', 'correct'),
        spec('Erreur : 2 + 18/x² (signe)', 0, {'a': '2', 'm': '3', 'k': '18', 'b': '1'},
             '2+\\frac{18}{x^2}', 'incorrect'),
        spec('Erreur : 3 − 18/x² (constante dérivée)', 0, {'a': '2', 'm': '3', 'k': '18', 'b': '1'},
             '3-\\frac{18}{x^2}', 'incorrect'),
        spec('x − 2 + 16/x : x² − 16', 1, {'a': '1', 'm': '4', 'k': '16', 'b': '-2'}, 'x^2-16',
             'correct'),
        spec('Erreur : 1 − 16', 1, {'a': '1', 'm': '4', 'k': '16', 'b': '-2'}, '1-16',
             'incorrect'),
        spec('Erreur : x − 16', 1, {'a': '1', 'm': '4', 'k': '16', 'b': '-2'}, 'x-16',
             'incorrect'),
        spec('2x² − 8 : [2 ; +∞[', 2, {'a': '2', 'm': '2', 'k': '8', 'b': '0'}, '[2;+\\infty[',
             'correct'),
        spec('Erreur : ]0 ; 2]', 2, {'a': '2', 'm': '2', 'k': '8', 'b': '0'}, ']0;2]',
             'incorrect'),
        spec('Erreur : [4 ; +∞[ (k/a au lieu de √(k/a))', 2,
             {'a': '2', 'm': '2', 'k': '8', 'b': '0'}, '[4;+\\infty[', 'incorrect'),
        spec('x + 3 + 25/x : min 13 en 5', 3, {'a': '1', 'm': '5', 'k': '25', 'b': '3'},
             ['5', '13'], 'correct'),
        spec('Erreur : min 8 (b oublié)', 3, {'a': '1', 'm': '5', 'k': '25', 'b': '3'},
             ['5', '8'], 'incorrect'),
        spec('2x − 4 + 32/x : min 12 en 4', 3, {'a': '2', 'm': '4', 'k': '32', 'b': '-4'},
             ['4', '12'], 'correct'),
        spec('x + 9/x : [−3 ; 0[ et ]0 ; 3]', 4, {'m': '3', 'k': '9'}, '0', 'correct'),
        spec('Erreur : [−3 ; 3] (0 oublié)', 4, {'m': '3', 'k': '9'}, '1', 'incorrect'),
        spec('Erreur : ]0 ; 3] seulement', 4, {'m': '3', 'k': '9'}, '3', 'incorrect'),
        spec('x² + 54/x : en 3, min 27', 5, {'c': '3', 'k': '54'}, ['3', '27'], 'correct'),
        spec('Erreur : x = 27 (k/2 sans racine cubique)', 5, {'c': '3', 'k': '54'},
             ['27', '27'], 'incorrect'),
    ],
    shared=REGLAGES,
)

# --- I4, TTECHNO-049 : coût moyen, prix unitaire --------------------------------------------
# C(x) = x² + px + q (milliers d'euros, x tonnes), q = m² : CM(x) = x + p + q/x, min en m.

COUT = ('Une entreprise produit $x$ tonnes d\'un produit, avec $1\\leqslant x\\leqslant 20$. Le coût'
        ' de production, en milliers d\'euros, est $C(x)=x^2+{{p}}x+{{q}}$. Le coût moyen d\'une'
        ' tonne est $C_M(x)=\\dfrac{C(x)}{x}$.')
VARS_I4 = [var('m', '4..10'), var('q', 'eval:m^2'), var('p', '1..9')]
DERIV_I4 = ('$C_M(x)=x+{{p}}+\\dfrac{ {{q}} }{x}$, donc $C_M\'(x)=1-\\dfrac{ {{q}} }{x^2}'
            '=\\dfrac{x^2-{{q}} }{x^2}$, du signe de $x^2-{{q}}=(x-{{m}})(x+{{m}})$ : négatif'
            ' sur $[1\\,;{{m}}[$, positif sur $]{{m}}\\,;20]$.')
TABLEAU_I4 = ('```variation\nvariable: x\ndomain: 1, {{m}}, 20\n\n'
              'sign: C_M\'(x)\n  1,{{m}}: -\n  {{m}}: z\n  {{m}},20: +\n\n'
              'variation: C_M(x)\n  1: {{eval:1+p+q}}, top\n  {{m}}: {{eval:2*m+p}}, bottom\n'
              '  20: {{eval:20+p+q/20;d}}, top\n```')
PRIX = ('Un imprimeur facture une commande de $n$ affiches : ${{F}}$ € de frais fixes, puis'
        ' ${{c}}$ € par affiche. Le prix unitaire d\'une affiche est'
        ' $P(n)={{c}}+\\dfrac{ {{F}} }{n}$ (en euros).')

I4 = modele(
    'Coût moyen, prix unitaire',
    'Coût moyen C(x)/x écrit x + p + q/x ; production qui rend le coût moyen minimal et ce coût ;'
    ' prix unitaire c + F/n : valeur limite et seuil',
    2, 120,
    [
        variation(
            COUT + '\n\nÉcris $C_M(x)$ sans quotient de polynômes.\n\n'
            '$C_M(x)=x+?+\\dfrac{?}{x}$',
            VARS_I4, ['{{p}}', '{{q}}'],
            ['On divise chaque terme de $C(x)$ par $x$ :',
             '$C_M(x)=\\dfrac{x^2}{x}+\\dfrac{ {{p}}x}{x}+\\dfrac{ {{q}} }{x}=x+' + col('{{p}}')
             + '+\\dfrac{' + col('{{q}}') + '}{x}$.'],
        ),
        variation(
            COUT + ' On a $C_M(x)=x+{{p}}+\\dfrac{ {{q}} }{x}$.\n\n'
            'Quelle production rend le coût moyen minimal ?\n\n$x=?$ tonnes',
            VARS_I4, '{{m}}',
            [DERIV_I4, TABLEAU_I4,
             'Le coût moyen est minimal pour ' + colt('{{m}}') + ' tonnes.'],
        ),
        variation(
            COUT + ' On a $C_M(x)=x+{{p}}+\\dfrac{ {{q}} }{x}$ ; il est minimal pour ${{m}}$'
            ' tonnes.\n\nQuel est ce coût moyen minimal ?\n\n$?$ milliers d\'euros par tonne',
            VARS_I4, '{{eval:2*m+p}}',
            ['$C_M({{m}})={{m}}+{{p}}+\\dfrac{ {{q}} }{ {{m}} }={{m}}+{{p}}+{{m}}='
             + col('{{eval:2*m+p}}') + '$ milliers d\'euros par tonne.'],
        ),
        variation(
            PRIX + '\n\nQuand le nombre d\'affiches devient très grand, de quel prix le prix'
            ' unitaire se rapproche-t-il ?\n\n$?$ €',
            [var('F', '200|300|400|500|600'), var('c', '2..8')], '{{c}}',
            ['Quand $n$ devient très grand, $\\dfrac{ {{F}} }{n}$ se rapproche de $0$ : les frais'
             ' fixes se partagent entre de plus en plus d\'affiches.',
             '$P(n)$ se rapproche de ' + colt('{{c}}') + ' € (droite asymptote $y={{c}}$).'],
        ),
        variation(
            PRIX + '\n\nÀ partir de combien d\'affiches le prix unitaire est-il inférieur ou égal'
            ' à ${{eval:c+d}}$ € ?\n\n$n\\geqslant ?$',
            [var('F', '200|300|400|500|600'), var('c', '2..8'), var('d', '1|2|4|5')],
            '{{eval:F/d}}',
            ['$P(n)\\leqslant{{eval:c+d}}$ équivaut à $\\dfrac{ {{F}} }{n}\\leqslant{{d}}$, soit'
             ' $n\\geqslant\\dfrac{ {{F}} }{ {{d}} }={{eval:F/d}}$ ($n>0$).',
             'À partir de ' + colt('{{eval:F/d}}') + ' affiches. $P$ est décroissante : plus la'
             ' commande est grande, plus l\'affiche est bon marché.'],
        ),
    ],
    [
        spec('x² + 3x + 49 : 3 et 49', 0, {'m': '7', 'q': '49', 'p': '3'}, ['3', '49'],
             'correct'),
        spec('Erreur : 3x et 49 (x oublié dans la division)', 0, {'m': '7', 'q': '49', 'p': '3'},
             ['3x', '49'], 'incorrect'),
        spec('q = 49 : 7 tonnes', 1, {'m': '7', 'q': '49', 'p': '3'}, '7', 'correct'),
        spec('Erreur : 49 (q au lieu de √q)', 1, {'m': '7', 'q': '49', 'p': '3'}, '49',
             'incorrect'),
        spec('Erreur : 1 (borne de l\'intervalle)', 1, {'m': '7', 'q': '49', 'p': '3'}, '1',
             'incorrect'),
        spec('CM(7) = 17', 2, {'m': '7', 'q': '49', 'p': '3'}, '17', 'correct'),
        spec('Erreur : 10 (q/m oublié)', 2, {'m': '7', 'q': '49', 'p': '3'}, '10', 'incorrect'),
        spec('Erreur : C(7) = 119', 2, {'m': '7', 'q': '49', 'p': '3'}, '119', 'incorrect'),
        spec('P(n) → 5', 3, {'F': '300', 'c': '5'}, '5', 'correct'),
        spec('Erreur : 0', 3, {'F': '300', 'c': '5'}, '0', 'incorrect'),
        spec('Erreur : 305', 3, {'F': '300', 'c': '5'}, '305', 'incorrect'),
        spec('400/n ⩽ 2 : n ⩾ 200', 4, {'F': '400', 'c': '3', 'd': '2'}, '200', 'correct'),
        spec('Erreur : 80 (F/(c + d))', 4, {'F': '400', 'c': '3', 'd': '2'}, '80', 'incorrect'),
    ],
    shared=REGLAGES,
)

# --- I5, TTECHNO-087 : représenter P(x) + k/x -----------------------------------------------

FONC_I5 = 'x + 12/x + ({{b}})'
I5 = modele(
    'Représenter une fonction P(x) + k/x',
    'Points de la courbe de x + 12/x + b à placer ; courbe de x ± k/x reconnue d\'après'
    ' l\'expression ; allure tirée d\'un tableau de variations',
    1, 60,
    [
        variation(
            'On considère la fonction $f$ définie sur $\\left]0\\,;+\\infty\\right[$ par'
            ' $f(x)=x+\\dfrac{12}{x}{{if:b>0|+{{b}}}}{{if:b<0|{{b}}}}$.\n\n'
            'Place les points $A$, $B$, $C$, $D$ et $E$ de la courbe de $f$ d\'abscisses $1$,'
            ' $2$, $3$, $4$ et $6$.\n\n'
            '```courbe\nx: -1 ; 7\ny: {{eval:b-1}} ; {{eval:b+14}}\ngrille: 1 ; 1\n'
            'placer: A=(1 ; {{eval:13+b}}) ; B=(2 ; {{eval:8+b}}) ; C=(3 ; {{eval:7+b}}) ;'
            ' D=(4 ; {{eval:7+b}}) ; E=(6 ; {{eval:8+b}})\n'
            'taille: moyenne\n'
            'description: Repère : x de −1 à 7, y de {{eval:b-1}} à {{eval:b+14}}, de 1 en 1.\n```',
            [var('b', '-5|-4|-3|-2|0')], None,
            ['On calcule les images : $f(1)=1+12{{if:b>0|+{{b}}}}{{if:b<0|{{b}}}}={{eval:13+b}}$,'
             ' $f(2)=2+6{{if:b>0|+{{b}}}}{{if:b<0|{{b}}}}={{eval:8+b}}$, $f(3)=3+4{{if:b>0|+{{b}}}}'
             '{{if:b<0|{{b}}}}={{eval:7+b}}$, $f(4)=4+3{{if:b>0|+{{b}}}}{{if:b<0|{{b}}}}'
             '={{eval:7+b}}$, $f(6)=6+2{{if:b>0|+{{b}}}}{{if:b<0|{{b}}}}={{eval:8+b}}$.',
             courbe(FONC_I5, '-1 ; 7', '{{eval:b-1}} ; {{eval:b+14}}',
                    'Courbe de f sur ]0 ; 7] : elle descend jusqu\'au voisinage de x ≈ 3,5 puis'
                    ' remonte, et passe par les cinq points placés.', taille='moyenne',
                    extra='points: A(1 ; {{eval:13+b}}), B(2 ; {{eval:8+b}}), C(3 ; {{eval:7+b}}),'
                          ' D(4 ; {{eval:7+b}}), E(6 ; {{eval:8+b}})\n'),
             'La courbe descend puis remonte : elle longe l\'axe des ordonnées près de $0$ et se'
             ' rapproche de la droite $y=x{{if:b>0|+{{b}}}}{{if:b<0|{{b}}}}$ quand $x$ devient'
             ' grand.'],
        ),
        variation(
            'Quelle courbe représente la fonction $f$ définie sur $\\left]0\\,;+\\infty\\right[$'
            ' par $f(x)=x+\\dfrac{4}{x}$ ?'
            + choix_courbes(
                ('4/x', 'Courbe qui descend sur tout l\'intervalle et se'
                 ' rapproche de l\'axe des abscisses.'),
                ('x + 4/x', 'Courbe qui descend jusqu\'au point (2 ; 4) puis'
                 ' remonte.'),
                ('x - 4/x', 'Courbe qui monte sur tout l\'intervalle et coupe'
                 ' l\'axe des abscisses en x = 2.'),
                ('-x + 4/x', 'Courbe qui descend sur tout l\'intervalle et passe'
                 ' sous l\'axe des abscisses après x = 2.'),
            ),
            [], '1',
            ['On calcule quelques images : $f(1)=5$, $f(2)=4$, $f(4)=5$. La seule courbe qui'
             ' passe par ces points est la ' + colt('\\text{deuxième}') + '.',
             'Sa dérivée $f\'(x)=1-\\dfrac{4}{x^2}=\\dfrac{x^2-4}{x^2}$ est négative avant $2$,'
             ' positive après : la courbe descend jusqu\'à $(2\\,;4)$ puis remonte.'],
        ),
        variation(
            'Une fonction $f$ définie sur $\\left]0\\,;+\\infty\\right[$ a ce tableau de'
            ' variations :\n\n'
            '```variation\nvariable: x\ndomain: ]0, [2, [+inf[\n\n'
            'sign: f\'(x)\n  0: ||\n  0,2: +\n  2: z\n  2,+inf: -\n\n'
            'variation: f(x)\n  2: 6, top\n```\n\n'
            'Quelle courbe peut la représenter ?'
            + choix_courbes(
                ('x + 4/x', 'Courbe qui descend jusqu\'au point (2 ; 4) puis'
                 ' remonte.'),
                ('8/x', 'Courbe qui descend sur tout l\'intervalle.'),
                ('10 - x - 4/x', 'Courbe qui monte jusqu\'au point (2 ; 6) puis'
                 ' redescend.'),
                ('x - 4/x', 'Courbe qui monte sur tout l\'intervalle.'),
            ),
            [], '2',
            ['Le tableau dit : $f$ croissante sur $\\left]0\\,;2\\right]$, décroissante sur'
             ' $\\left[2\\,;+\\infty\\right[$, maximum $6$ en $2$.',
             'La seule courbe qui monte jusqu\'à $(2\\,;6)$ puis redescend est la '
             + colt('\\text{troisième}') + ' (celle de $x\\mapsto 10-x-\\dfrac{4}{x}$).'],
        ),
    ],
    [
        spec('b = 0 : 13, 8, 7, 7, 8', 0, {'b': '0'}, ['1;13', '2;8', '3;7', '4;7', '6;8'],
             'correct'),
        spec('Erreur : x + 12x (12/x lu 12x) : 13, 26…', 0, {'b': '0'},
             ['1;13', '2;26', '3;39', '4;52', '6;78'], 'incorrect'),
        spec('b = −3 : 10, 5, 4, 4, 5', 0, {'b': '-3'}, ['1;10', '2;5', '3;4', '4;4', '6;5'],
             'correct'),
        spec('Erreur b = −3 : b oublié', 0, {'b': '-3'}, ['1;13', '2;8', '3;7', '4;7', '6;8'],
             'incorrect'),
        spec('x + 4/x : deuxième courbe', 1, {}, '1', 'correct'),
        spec('Erreur : 4/x seul', 1, {}, '0', 'incorrect'),
        spec('Erreur : x − 4/x', 1, {}, '2', 'incorrect'),
        spec('Maximum 6 en 2 : troisième courbe', 2, {}, '2', 'correct'),
        spec('Erreur : minimum au lieu de maximum', 2, {}, '0', 'incorrect'),
    ],
    shared=REGLAGES,
)

MODELES = [('01-inverse-tres-grand-tres-petit', I1),
           ('02-asymptotes-hyperbole', I2),
           ('03-etudier-ax-plus-b-plus-k-sur-x', I3),
           ('04-cout-moyen-prix-unitaire', I4),
           ('05-representer-polynome-plus-k-sur-x', I5)]

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    chemin = os.path.join(DOSSIER, nom + '.json')
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
    print('écrit', chemin)
