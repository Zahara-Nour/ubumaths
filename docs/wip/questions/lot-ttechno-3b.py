"""Écrit les 4 modèles du lot 3b « fonctions » de la Terminale technologique (STMG)
dans scripts/questions/ttechno-3b-fonctions/.

Phase 0 validée par David le 2026-11-18 (journal docs/archive/wip/questions-ttechno-progress.md § 22,
Q19, Q20 : « je suis tes recos »). Compléments sur ℝ (x < 0 compris) des modèles communs E3
(2a9c316a, tagué 032) et E4 (065eea60, tagué 033), écrits sur [0 ; +∞[ pour la 1re générale,
et la forme x ↦ k·aˣ avec k < 0, absente des modèles existants :

| #  | Point        | Nœud (posé par la migration)                 | Niveau | Réponse               |
| C5 | TTECHNO-032  | Fonction exponentielle › fonctions x ↦ aˣ     | 1 | case choix                |
| C6 | TTECHNO-033  | Fonction exponentielle › fonctions x ↦ aˣ     | 1 | associer + courbes ; case |
| C7 | TTECHNO-036  | Fonction exponentielle › fonctions x ↦ aˣ     | 1 | case choix                |
| C8 | TTECHNO-080  | Fonction exponentielle › fonctions x ↦ aˣ     | 2 | case choix ; nombre       |

Bornes (BO Tle techno p.8) : a > 0 ; a⁻ˣ = 1/aˣ ; sens selon a, en parallèle avec les suites
géométriques ; forme x ↦ k·aˣ seulement, sens selon le signe de k et les valeurs de a. Ni eˣ,
ni ln, ni dérivée. `grades` = ['T_TECHNO'] seul : les bornes 1GEN arrêtent x à 0.

Pièges : jamais de variable `e` ni `i` ; case choix → `melanger: non`, réponse = rang ; eval ne
connaît ni `>` ni `==` (indicatrices par floor / min / max / abs) ; k ≠ ±1 (pas de « 1 × »).

    python3 docs/wip/questions/lot-ttechno-3b.py scripts/questions/ttechno-3b-fonctions
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


def modele(title, description, level, delay, variations, specs, shared=None, options=None):
    # Ni theme, ni domain, ni subdomain (ADR 0035) ; nœud et tag posés par la migration.
    m = {'title': title, 'description': description, 'grades': ['T_TECHNO'], 'level': level,
         'delay': delay, 'status': 'draft', 'shared': shared or {}}
    if options:
        m['options'] = options
    m['variations'] = variations
    m['testSpecs'] = specs
    return m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def case(reponse, **reglages):
    b = {'expectedAnswer': reponse}
    b.update(reglages)
    return b


def variation(statement, variables, reponses, steps, conditions=None):
    """reponses : None pour un geste (associer) ; une chaîne, une case (dict) ou une liste."""
    v = {'statement': statement, 'variables': variables, 'conditions': conditions or []}
    if reponses is not None:
        if not isinstance(reponses, list):
            reponses = [reponses]
        v['blanks'] = [r if isinstance(r, dict) else {'expectedAnswer': r} for r in reponses]
    v['correction'] = {'steps': steps}
    return v


def col(x):
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


def choix(*options):
    return '\n\n```choix\nmelanger: non\n' + ''.join('- ' + o + '\n' for o in options) + '```'


DECIMAL = {'blankDefaults': {'acceptDecimal': True}}
SENS = choix('croissante', 'décroissante', 'constante')
REGLE_SENS = ('Pour $a>0$, la fonction $x\\mapsto a^x$ est croissante sur $\\mathbb{R}$ si $a>1$,'
              ' décroissante sur $\\mathbb{R}$ si $0<a<1$, constante (égale à $1$) si $a=1$.')
SUR_R = 'On considère la fonction $f$ définie sur $\\mathbb{R}$ par '
# Indicatrice « a > 1 » pour a dans {0,5 ; 0,8 ; 1,5 ; 2 ; 3} : 1 si a > 1, 0 si 0 < a < 1.
A_SUP_1 = 'min(floor(a),1)'
# Indicatrice « k > 0 » pour k entier, |k| ⩾ 2.
K_POS = 'min(max(k,0),1)'
A_TOUS = '0.5|0.8|1.5|2|3'
K_TOUS = '-5|-4|-3|-2|2|3|4|5'

# --- C5, TTECHNO-032 : sens de variation de x ↦ aˣ sur ℝ ------------------------------------

C5 = modele(
    'Sens de variation de x ↦ a^x sur ℝ',
    'Sens sur ℝ selon a ; comparer deux puissances d\'exposants négatifs sans calcul ; signe de'
    ' a^x ; a^x par rapport à 1 pour x < 0',
    1, 30,
    [
        variation(
            SUR_R + '$f(x)={{a}}^x$.\n\nQuel est le sens de variation de $f$ sur $\\mathbb{R}$ ?'
            + SENS,
            [var('a', '1.5|2|3|5')], '0',
            [REGLE_SENS,
             'Ici $a=' + col('{{a}}') + '>1$ : $f$ est **croissante** sur $\\mathbb{R}$, pour les'
             ' $x$ négatifs comme pour les positifs.'],
        ),
        variation(
            SUR_R + '$f(x)={{a}}^x$.\n\nQuel est le sens de variation de $f$ sur $\\mathbb{R}$ ?'
            + SENS,
            [var('a', '0.2|0.5|0.8|0.9')], '1',
            [REGLE_SENS,
             'Ici $0<a=' + col('{{a}}') + '<1$ : $f$ est **décroissante** sur $\\mathbb{R}$.'],
        ),
        variation(
            'Sans calculer, compare ${{a}}^{ {{x1}} }$ et ${{a}}^{ {{x2}} }$.'
            + choix('${{a}}^{ {{x1}} }<{{a}}^{ {{x2}} }$', '${{a}}^{ {{x1}} }>{{a}}^{ {{x2}} }$'),
            [var('a', A_TOUS), var('x1', '-3|-2.5|-2'), var('x2', '-1.5|-1|-0.5')],
            '{{eval:1-' + A_SUP_1 + '}}',
            [REGLE_SENS + ' C\'est vrai aussi pour les exposants négatifs.',
             'Ici $a={{a}}$ {{if:a>1|est supérieur à $1$ : $x\\mapsto{{a}}^x$ est croissante'
             '|est compris entre $0$ et $1$ : $x\\mapsto{{a}}^x$ est décroissante}}.',
             '${{x1}}<{{x2}}$, donc $' + col('{{a}}^{ {{x1}} }{{if:a>1|<|>}}{{a}}^{ {{x2}} }')
             + '$.'],
        ),
        variation(
            'Quel est le signe du nombre ${{a}}^{ {{x}} }$ ?'
            + choix('strictement négatif', 'nul', 'strictement positif'),
            [var('a', '1.5|2|3|5|0.5|0.8'), var('x', '-3|-2.5|-2|-1.5|-1|-0.5')], '2',
            ['Pour $a>0$, $a^x>0$ pour **tout** réel $x$ : la courbe de $x\\mapsto a^x$ reste'
             ' au-dessus de l\'axe des abscisses.',
             'Ici ${{a}}^{ {{x}} }=\\dfrac{1}{ {{a}}^{ {{eval:-x;d}} } }$ est $'
             + col('\\text{strictement positif}') + '$ : un exposant négatif ne rend pas le nombre'
             ' négatif.'],
        ),
        variation(
            'Sans calculer, situe ${{a}}^{ {{x}} }$ par rapport à $1$.'
            + choix('${{a}}^{ {{x}} }<1$', '${{a}}^{ {{x}} }=1$', '${{a}}^{ {{x}} }>1$'),
            [var('a', A_TOUS), var('x', '-3|-2.5|-2|-1.5|-1|-0.5')],
            '{{eval:2-2*' + A_SUP_1 + '}}',
            ['$1={{a}}^0$. ' + REGLE_SENS,
             'Ici $a={{a}}$ {{if:a>1|est supérieur à $1$ : $x\\mapsto{{a}}^x$ est croissante'
             '|est compris entre $0$ et $1$ : $x\\mapsto{{a}}^x$ est décroissante}}.',
             '${{x}}<0$, donc $' + col('{{a}}^{ {{x}} }{{if:a>1|<|>}}1') + '$.'],
        ),
    ],
    [
        spec('2^x croissante', 0, {'a': '2'}, '0', 'correct'),
        spec('Erreur : décroissante', 0, {'a': '2'}, '1', 'incorrect'),
        spec('0,5^x décroissante', 1, {'a': '0.5'}, '1', 'correct'),
        spec('Erreur : croissante', 1, {'a': '0.5'}, '0', 'incorrect'),
        spec('a = 2 : 2^-3 < 2^-1', 2, {'a': '2', 'x1': '-3', 'x2': '-1'}, '0', 'correct'),
        spec('Erreur a = 2 : « > » (comparaison des valeurs absolues)', 2,
             {'a': '2', 'x1': '-3', 'x2': '-1'}, '1', 'incorrect'),
        spec('a = 0,5 : 0,5^-2 > 0,5^-0,5', 2, {'a': '0.5', 'x1': '-2', 'x2': '-0.5'}, '1',
             'correct'),
        spec('Erreur a = 0,5 : « < »', 2, {'a': '0.5', 'x1': '-2', 'x2': '-0.5'}, '0',
             'incorrect'),
        spec('3^-2 strictement positif', 3, {'a': '3', 'x': '-2'}, '2', 'correct'),
        spec('Erreur : strictement négatif', 3, {'a': '3', 'x': '-2'}, '0', 'incorrect'),
        spec('3^-2 < 1', 4, {'a': '3', 'x': '-2'}, '0', 'correct'),
        spec('Erreur : 3^-2 > 1', 4, {'a': '3', 'x': '-2'}, '2', 'incorrect'),
        spec('0,8^-1,5 > 1', 4, {'a': '0.8', 'x': '-1.5'}, '2', 'correct'),
        spec('Erreur : 0,8^-1,5 < 1', 4, {'a': '0.8', 'x': '-1.5'}, '0', 'incorrect'),
    ],
)

# --- C6, TTECHNO-033 : courbe de x ↦ aˣ sur ℝ ------------------------------------------------
# Trois courbes sur [−3 ; 3], toutes par (0 ; 1) : on les distingue par le sens et par f(1) = a.


def c6_courbe(j):
    return ('- ```courbe\n'
            '  x: -3.5 ; 3.5\n'
            '  y: -0.5 ; 8.5\n'
            '  grille: 1 ; 1\n'
            '  f(x) = {{a' + j + '}}^x sur [-3 ; 3]   bleu\n'
            '  points: A(1 ; {{a' + j + '}})\n'
            '  description: Courbe d\'une fonction x ↦ aˣ sur [−3 ; 3], passant par (0 ; 1) et par'
            ' A(1 ; {{a' + j + '}}).\n'
            '  ```\n'
            '  -> $x\\mapsto{{a' + j + '}}^x$\n')


C6_ENONCE = ('Chaque courbe représente une fonction $x\\mapsto a^x$ sur $[-3\\,;3]$.\n\n'
             'Relie chaque courbe à sa fonction.\n\n'
             '````associer\n' + ''.join(c6_courbe(j) for j in '123') + '````')


def c6_corrige(sens, fin=''):
    return [
        'Toutes ces courbes passent par $(0\\,;1)$, car $a^0=1$. Le point d\'abscisse $1$ a pour'
        ' ordonnée $a^1=a$ : on lit $a$ sur ce point. ' + REGLE_SENS,
        'Courbe 1 : elle passe par $(1\\,;{{a1}})$, c\'est $' + col('x\\mapsto{{a1}}^x') + '$, '
        + sens[0] + '.',
        'Courbe 2 : elle passe par $(1\\,;{{a2}})$, c\'est $' + col('x\\mapsto{{a2}}^x') + '$, '
        + sens[1] + '.',
        'Courbe 3 : elle passe par $(1\\,;{{a3}})$, c\'est $' + col('x\\mapsto{{a3}}^x') + '$, '
        + sens[2] + '.' + fin,
    ]


C6 = modele(
    'Courbe de x ↦ a^x sur ℝ',
    'Associer trois courbes sur [−3 ; 3] ; courbes de a^x et (1/a)^x ; point d\'abscisse −1 ;'
    ' courbe au-dessus de l\'axe des abscisses',
    1, 60,
    [
        variation(
            C6_ENONCE,
            [var('a1', '1.2|1.5'), var('a2', '2|2.5'), var('a3', '0.5|0.6|0.8')], None,
            c6_corrige(['croissante, la moins rapide', 'croissante, la plus rapide',
                        'décroissante : elle monte quand $x$ diminue'])),
        variation(
            C6_ENONCE,
            [var('a3', '0.5|0.25'), var('a2', '1'), var('a1', 'eval:1/a3')], None,
            c6_corrige(['croissante', 'constante : la droite horizontale d\'équation $y=1$',
                        'décroissante'],
                       ' Les courbes de $x\\mapsto{{a1}}^x$ et de $x\\mapsto{{a3}}^x$ sont'
                       ' symétriques par rapport à l\'axe des ordonnées, car'
                       ' ${{a3}}^x=\\dfrac{1}{ {{a1}}^x}={{a1}}^{-x}$.')),
        variation(
            SUR_R + '$f(x)={{a}}^x$.\n\nQuelle est l\'ordonnée du point de sa courbe d\'abscisse'
            ' $-1$ ? Donne la valeur exacte.\n\n$f(-1)=?$',
            [var('a', '2|4|5|10')], '\\frac{1}{ {{a}} }',
            ['Pour $a>0$ et tout réel $x$ : $a^{-x}=\\dfrac{1}{a^x}$.',
             '$f(-1)={{a}}^{-1}=\\dfrac{1}{ {{a}} }$ : le point $' + col('\\left(-1\\,;\\dfrac{1}{ {{a}} }'
                                                                          '\\right)') + '$ est sur'
             ' la courbe, sous la droite d\'équation $y=1$ (la fonction est croissante).'],
        ),
        variation(
            SUR_R + '$f(x)={{a}}^x$. Que peut-on dire de sa courbe représentative ?'
            + choix('Elle est entièrement au-dessus de l\'axe des abscisses.',
                    'Elle passe sous l\'axe des abscisses pour $x<0$.',
                    'Elle passe par l\'origine du repère.'),
            [var('a', '1.5|2|3|0.5|0.8')], '0',
            ['Pour $a>0$, $a^x>0$ pour **tout** réel $x$, même négatif : $a^{-x}=\\dfrac{1}{a^x}$'
             ' est l\'inverse d\'un nombre positif.',
             'Elle passe par $(0\\,;1)$, pas par l\'origine : la courbe est $'
             + col('\\text{entièrement au-dessus de l\'axe des abscisses}') + '$.'],
        ),
    ],
    # Réponses des associer = rang affiché de l'étiquette de chaque courbe (graine 0 du
    # testeur), relevé au premier passage de question:specs (comme E4).
    [
        spec('Courbes bien reliées', 0, {'a1': '1.5', 'a2': '2', 'a3': '0.5'},
             ['2', '0', '1'], 'correct'),
        spec('Erreur : courbes 1 et 2 échangées', 0, {'a1': '1.5', 'a2': '2', 'a3': '0.5'},
             ['0', '2', '1'], 'incorrect'),
        spec('2^x, 1^x, 0,5^x bien reliées', 1, {'a1': '2', 'a2': '1', 'a3': '0.5'},
             ['2', '0', '1'], 'correct'),
        spec('Erreur : 2^x et 0,5^x échangées', 1, {'a1': '2', 'a2': '1', 'a3': '0.5'},
             ['1', '0', '2'], 'incorrect'),
        spec('f(−1) = 1/2', 2, {'a': '2'}, '\\frac{1}{2}', 'correct'),
        spec('f(−1) = 0,5', 2, {'a': '2'}, '0,5', 'correct'),
        spec('Erreur : −2', 2, {'a': '2'}, '-2', 'incorrect'),
        spec('Erreur : −1/2', 2, {'a': '2'}, '-\\frac{1}{2}', 'incorrect'),
        spec('Au-dessus de l\'axe', 3, {'a': '2'}, '0', 'correct'),
        spec('Erreur : sous l\'axe pour x < 0', 3, {'a': '2'}, '1', 'incorrect'),
        spec('Erreur : par l\'origine', 3, {'a': '2'}, '2', 'incorrect'),
    ],
    shared=DECIMAL,
)

# --- C7, TTECHNO-036 : sens de variation de x ↦ k·aˣ ------------------------------------------

REGLE_K = ('Pour $k\\neq0$ et $a>0$ : si $k>0$, $x\\mapsto ka^x$ a **le même** sens de variation'
           ' que $x\\mapsto a^x$ ; si $k<0$, elle a **le sens contraire** (multiplier par un'
           ' nombre négatif renverse l\'ordre).')
SENS_A = ('$x\\mapsto{{a}}^x$ est {{if:a>1|croissante, car ${{a}}>1$|décroissante, car'
          ' $0<{{a}}<1$}}.')


def c7_variation(a_expr, k_expr, rang, conclusion):
    return variation(
        SUR_R + '$f(x)={{k}}\\times{{a}}^x$.\n\nQuel est le sens de variation de $f$ sur'
        ' $\\mathbb{R}$ ?' + SENS,
        [var('a', a_expr), var('k', k_expr)], rang,
        [REGLE_K, SENS_A, conclusion],
    )


C7 = modele(
    'Sens de variation de x ↦ k·a^x',
    'Sens de x ↦ k·aˣ sur ℝ dans les quatre cas : k > 0 ou k < 0, a > 1 ou 0 < a < 1',
    1, 30,
    [
        c7_variation('1.5|2|3|1.05', '2|3|4|5|100', '0',
                     '$k={{k}}>0$ : même sens, $f$ est $' + col('\\text{croissante}') + '$.'),
        c7_variation('0.5|0.8|0.9|0.95', '2|3|4|5|100', '1',
                     '$k={{k}}>0$ : même sens, $f$ est $' + col('\\text{décroissante}') + '$.'),
        c7_variation('1.5|2|3|1.05', '-5|-4|-3|-2', '1',
                     '$k={{k}}<0$ : sens contraire, $f$ est $' + col('\\text{décroissante}') + '$.'),
        c7_variation('0.5|0.8|0.9|0.95', '-5|-4|-3|-2', '0',
                     '$k={{k}}<0$ : sens contraire, $f$ est $' + col('\\text{croissante}') + '$.'),
    ],
    [
        spec('3 × 2^x croissante', 0, {'a': '2', 'k': '3'}, '0', 'correct'),
        spec('Erreur : décroissante', 0, {'a': '2', 'k': '3'}, '1', 'incorrect'),
        spec('4 × 0,5^x décroissante', 1, {'a': '0.5', 'k': '4'}, '1', 'correct'),
        spec('Erreur : croissante', 1, {'a': '0.5', 'k': '4'}, '0', 'incorrect'),
        spec('−3 × 2^x décroissante', 2, {'a': '2', 'k': '-3'}, '1', 'correct'),
        spec('Erreur : croissante (signe de k oublié)', 2, {'a': '2', 'k': '-3'}, '0',
             'incorrect'),
        spec('−2 × 0,8^x croissante', 3, {'a': '0.8', 'k': '-2'}, '0', 'correct'),
        spec('Erreur : décroissante (signe de k oublié)', 3, {'a': '0.8', 'k': '-2'}, '1',
             'incorrect'),
    ],
)

# --- C8, TTECHNO-080 : utiliser le sens de variation de x ↦ k·aˣ ------------------------------
# f croissante ⇔ (k > 0 et a > 1) ou (k < 0 et 0 < a < 1) ⇔ |[a > 1] − [k > 0]| = 0.

DECROISSANTE = 'abs(' + A_SUP_1 + '-' + K_POS + ')'
SENS_F = ('$x\\mapsto{{a}}^x$ est {{if:a>1|croissante|décroissante}} et $k={{k}}$ est'
          ' {{if:k>0|positif : même sens|négatif : sens contraire}}, donc $f$ est **{{if:sens>0|'
          'croissante|décroissante}}**.')
SENS_VAR = var('sens', 'eval:1-2*' + DECROISSANTE)

C8 = modele(
    'Utiliser le sens de variation de x ↦ k·a^x',
    'Comparer deux images sans calcul (k < 0 compris) ; abscisse du maximum sur [0 ; 5] ;'
    ' retrouver k et a à partir de f(0) et f(1)',
    2, 45,
    [
        variation(
            SUR_R + '$f(x)={{k}}\\times{{a}}^x$.\n\nSans calculer, compare $f({{x1}})$ et'
            ' $f({{x2}})$.' + choix('$f({{x1}})<f({{x2}})$', '$f({{x1}})>f({{x2}})$'),
            [var('a', A_TOUS), var('k', K_TOUS), var('x1', '-2|-1|0|0.5|1'),
             var('x2', '1.5|2|3|4'), SENS_VAR],
            '{{eval:' + DECROISSANTE + '}}',
            [REGLE_K, SENS_F,
             '${{x1}}<{{x2}}$, donc $' + col('f({{x1}}){{if:sens>0|<|>}}f({{x2}})') + '$.'],
        ),
        variation(
            'On considère la fonction $f$ définie sur $[0\\,;5]$ par $f(x)={{k}}\\times{{a}}^x$.\n\n'
            'Pour quelle valeur de $x$ la fonction $f$ atteint-elle son **maximum** sur'
            ' $[0\\,;5]$ ?\n\n$x=?$',
            [var('a', A_TOUS), var('k', K_TOUS), SENS_VAR],
            '{{eval:5*(1-' + DECROISSANTE + ')}}',
            [REGLE_K, SENS_F,
             '{{if:sens>0|$f$ croissante : son maximum est atteint à la borne de droite'
             '|$f$ décroissante : son maximum est atteint à la borne de gauche}}, $x='
             + col('{{eval:5*(1-' + DECROISSANTE + ')}}') + '$.'],
        ),
        variation(
            'Une fonction $f$ est définie sur $\\mathbb{R}$ par $f(x)=k\\times a^x$, avec $a>0$.'
            ' On sait que $f(0)={{k}}$ et $f(1)={{eval:k*a;d}}$.\n\n'
            'Donne $k$ et $a$.\n\n$k=?$\n\n$a=?$',
            [var('a', '0.5|1.5|2|3'), var('k', K_TOUS), SENS_VAR],
            ['{{k}}', '{{a}}'],
            ['$f(0)=k\\times a^0=k$, donc $k=' + col('{{k}}') + '$.',
             '$f(1)=k\\times a$, donc $a=\\dfrac{f(1)}{f(0)}=\\dfrac{ {{eval:k*a;d}} }{ {{k}} }='
             + col('{{a}}') + '$.',
             'On en déduit le sens de variation : ' + SENS_F],
        ),
    ],
    [
        spec('3 × 2^x : f(0) < f(2)', 0, {'a': '2', 'k': '3', 'x1': '0', 'x2': '2', 'sens': '1'},
             '0', 'correct'),
        spec('−3 × 2^x : f(0) > f(2)', 0,
             {'a': '2', 'k': '-3', 'x1': '0', 'x2': '2', 'sens': '-1'}, '1', 'correct'),
        spec('Erreur −3 × 2^x : « < » (signe de k oublié)', 0,
             {'a': '2', 'k': '-3', 'x1': '0', 'x2': '2', 'sens': '-1'}, '0', 'incorrect'),
        spec('−2 × 0,5^x : f(−1) < f(3)', 0,
             {'a': '0.5', 'k': '-2', 'x1': '-1', 'x2': '3', 'sens': '1'}, '0', 'correct'),
        spec('Erreur −2 × 0,5^x : « > »', 0,
             {'a': '0.5', 'k': '-2', 'x1': '-1', 'x2': '3', 'sens': '1'}, '1', 'incorrect'),
        spec('4 × 1,5^x : max en 5', 1, {'a': '1.5', 'k': '4', 'sens': '1'}, '5', 'correct'),
        spec('−4 × 1,5^x : max en 0', 1, {'a': '1.5', 'k': '-4', 'sens': '-1'}, '0', 'correct'),
        spec('Erreur −4 × 1,5^x : 5', 1, {'a': '1.5', 'k': '-4', 'sens': '-1'}, '5', 'incorrect'),
        spec('−5 × 0,8^x : max en 5', 1, {'a': '0.8', 'k': '-5', 'sens': '1'}, '5', 'correct'),
        spec('f(0) = −4, f(1) = −6 : k = −4, a = 1,5', 2,
             {'a': '1.5', 'k': '-4', 'sens': '-1'}, ['-4', '1,5'], 'correct'),
        spec('Erreur : a = −2 (f(1) − f(0))', 2, {'a': '1.5', 'k': '-4', 'sens': '-1'},
             ['-4', '-2'], 'incorrect'),
        spec('Erreur : a = 6 (f(1) seul, signe perdu)', 2, {'a': '1.5', 'k': '-4', 'sens': '-1'},
             ['-4', '6'], 'incorrect'),
        spec('f(0) = 3, f(1) = 1,5 : k = 3, a = 0,5', 2,
             {'a': '0.5', 'k': '3', 'sens': '-1'}, ['3', '0,5'], 'correct'),
    ],
    shared=DECIMAL,
)

MODELES = [('01-sens-de-variation-a-puissance-x-sur-r', C5),
           ('02-courbe-a-puissance-x-sur-r', C6),
           ('03-sens-de-variation-k-a-puissance-x', C7),
           ('04-utiliser-sens-de-variation-k-a-puissance-x', C8)]

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    chemin = os.path.join(DOSSIER, nom + '.json')
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
    print('écrit', chemin)
