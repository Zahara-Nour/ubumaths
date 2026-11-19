"""Écrit les 7 modèles du lot 3 « fonctions x ↦ aˣ » de la 1re générale (enseignement
scientifique, module spécifique) dans scripts/questions/1gen-3-fonctions-exponentielles/.

Phase 0 validée par David le 2026-11-17 (Q13 à Q16, journal docs/archive/wip/questions-1gen-progress.md
§ 14). Tous les modèles vont sur le nœud « Fonctions › Fonction exponentielle › fonctions x ↦ aˣ »
(posé par la migration, avec le tag) :

| #  | Point    | Niveau | Réponse                         |
| E1 | 1GEN-032 | 1 | case, décimal arrondi                 |
| E2 | 1GEN-033 | 2 | case, une seule puissance (power)     |
| E3 | 1GEN-034 | 1 | case choix                            |
| E4 | 1GEN-035 | 2 | ```associer + courbes                 |
| E5 | 1GEN-036 | 1 | case, nombre                          |
| E6 | 1GEN-042 | 1 | ```courbe + placer:                   |
| E7 | 1GEN-059 | 1 | case, lecture à une demi-graduation   |

Borne (BO 1re ES p.7) : a > 0 et x ⩾ 0 ; ni logarithme, ni dérivée, ni eˣ ; valeurs non
entières de aˣ à la calculatrice. E1 à E5 sont candidats TTECHNO (031, 081, 032, 033 ; E2 commun,
Q15) : écrits ici avec `grades` = ['1_GEN'], questions-ttechno ajoute `T_TECHNO` et ses tags.

Pièges : jamais de variable `e` ni `i` ; case choix → `melanger: non`, réponse = rang ; eval ne
connaît ni `>` ni `==` (indicatrices par floor / min / max) ; `round(…, n)` refusé
→ round(100*x)/100.

    python3 docs/wip/questions/lot-1gen-3.py scripts/questions/1gen-3-fonctions-exponentielles
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
    m = {'title': title, 'description': description, 'grades': ['1_GEN'], 'level': level,
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
    """reponses : None pour un geste (placer, associer) ; une chaîne ou une case (dict)."""
    v = {'statement': statement, 'variables': variables, 'conditions': conditions or []}
    if reponses is not None:
        if not isinstance(reponses, list):
            reponses = [reponses]
        v['blanks'] = [r if isinstance(r, dict) else {'expectedAnswer': r} for r in reponses]
    v['correction'] = {'steps': steps}
    return v


def col(x):
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


def arrondi(digits):
    return {'type': 'decimal', 'digits': digits}


def tolerance(t):
    return {'type': 'tolerance', 'tolerance': t, 'mode': 'absolute'}


SENS = '\n\n```choix\nmelanger: non\n- croissante\n- décroissante\n- constante\n```'
REGLE_SENS = ('Pour $a>0$, la fonction $x\\mapsto a^x$ est croissante sur $[0\\,;+\\infty[$ si'
              ' $a>1$, décroissante si $0<a<1$, constante (égale à $1$) si $a=1$.')

# --- E1, 1GEN-032 : calculer une valeur de aˣ (x non entier) --------------------------------

E1 = modele(
    'Calculer une valeur de a^x (exposant non entier)',
    'À la calculatrice : f(x) = aˣ, placement sur une fraction d\'année, désintégration'
    ' radioactive',
    1, 45,
    [
        variation(
            'On considère la fonction $f$ définie sur $[0\\,;+\\infty[$ par $f(x)={{a}}^x$.\n\n'
            'Calcule $f({{x}})$, arrondi au centième.\n\n$f({{x}})\\approx ?$',
            [var('a', '1.5|2|3|0.5|0.8'), var('x', '0.5|1.5|2.5|3.2')],
            case('{{eval:round(100*a^x)/100;d}}', precision=arrondi(2)),
            ['On remplace $x$ par ${{x}}$ : $f({{x}})={{a}}^{ {{x}} }$. L\'exposant n\'est pas'
             ' entier : on calcule à la calculatrice, avec la touche de puissance.',
             '$f({{x}})\\approx' + col('{{eval:round(100*a^x)/100;d}}') + '$ (et non'
             ' ${{a}}\\times{{x}}$ : la puissance n\'est pas un produit).'],
        ),
        variation(
            'Un capital de ${{c}}~\\unit{€}$ est placé à ${{t}}~\\%$ par an, à intérêts composés.'
            ' Sa valeur, en euros, au bout de $x$ années (fraction d\'année comprise) est'
            ' $V(x)={{c}}\\times{{eval:1+t/100;d}}^x$.\n\n'
            'Calcule la valeur du placement au bout de ${{x}}$ années, arrondie au centime.\n\n'
            '$V({{x}})\\approx ?$',
            [var('c', '1000|2000|5000'), var('t', '2|3|4'), var('x', '1.5|2.5|3.5')],
            case('{{eval:round(100*c*(1+t/100)^x)/100;d}}', precision=arrondi(2)),
            ['On remplace $x$ par ${{x}}$ : $V({{x}})={{c}}\\times{{eval:1+t/100;d}}^{ {{x}} }$.',
             'À la calculatrice : $V({{x}})\\approx' + col('{{eval:round(100*c*(1+t/100)^x)/100;d}}')
             + '$ €. Les intérêts sont composés : on n\'ajoute pas ${{t}}~\\%$ du capital de'
             ' départ par année, on multiplie par ${{eval:1+t/100;d}}$.'],
        ),
        variation(
            'Un échantillon contient ${{n}}$ noyaux radioactifs. Au bout de $x$ demi-vies, il en'
            ' reste $N(x)={{n}}\\times0{,}5^x$.\n\n'
            'Combien en reste-t-il au bout de ${{x}}$ demi-vies ? Arrondis à l\'unité.\n\n'
            '$N({{x}})\\approx ?$',
            [var('n', '1000|8000'), var('x', '0.5|1.5|2.5')],
            case('{{eval:round(n*0.5^x)}}', precision=arrondi(0)),
            ['On remplace $x$ par ${{x}}$ : $N({{x}})={{n}}\\times0{,}5^{ {{x}} }$.',
             'À la calculatrice : $N({{x}})\\approx' + col('{{eval:round(n*0.5^x)}}') + '$ noyaux.'],
        ),
    ],
    [
        spec('2^1,5 ≈ 2,83', 0, {'a': '2', 'x': '1.5'}, '2,83', 'correct'),
        spec('Erreur : 2 × 1,5 = 3', 0, {'a': '2', 'x': '1.5'}, '3', 'incorrect'),
        spec('Erreur : 2^2,5 ≈ 5,66 (exposant + 1)', 0, {'a': '2', 'x': '1.5'}, '5,66',
             'incorrect'),
        spec('0,8^2,5 ≈ 0,57', 0, {'a': '0.8', 'x': '2.5'}, '0,57', 'correct'),
        spec('1000 × 1,02^1,5 ≈ 1030,15', 1, {'c': '1000', 't': '2', 'x': '1.5'}, '1030,15',
             'correct'),
        spec('Erreur : intérêts simples 1030', 1, {'c': '1000', 't': '2', 'x': '1.5'}, '1030',
             'incorrect'),
        spec('Erreur : 1000 × 1,02 × 1,5 = 1530', 1, {'c': '1000', 't': '2', 'x': '1.5'}, '1530',
             'incorrect'),
        spec('1000 × 0,5^1,5 ≈ 354', 2, {'n': '1000', 'x': '1.5'}, '354', 'correct'),
        spec('Erreur : 1000 × 0,5 × 1,5 = 750', 2, {'n': '1000', 'x': '1.5'}, '750', 'incorrect'),
    ],
)

# --- E2, 1GEN-033 : propriétés algébriques, une seule puissance -----------------------------
# Exposants positifs seulement (Q14). Commun avec questions-ttechno (Q15).

POW = {'requiredForm': 'power'}

E2 = modele(
    'Écrire sous la forme d\'une seule puissance (exposants réels positifs)',
    'Propriétés algébriques de x ↦ aˣ : produit, quotient, puissance d\'une puissance, même'
    ' exposant',
    2, 45,
    [
        variation(
            'Écris sous la forme d\'une seule puissance : ${{a}}^{ {{m}} }\\times{{a}}^{ {{p}} }$.'
            '\n\n${{a}}^{ {{m}} }\\times{{a}}^{ {{p}} }=?$',
            [var('a', '2|3|5|1.5'), var('m', '0.5|1.5|2|2.5|3'), var('p', '0.5|1.5|2|2.5|3')],
            case('{{a}}^{ {{eval:m+p;d}} }', **POW),
            ['Pour $a>0$ et tous réels positifs $x$ et $y$ : $a^x\\times a^y=a^{x+y}$. On'
             ' **ajoute** les exposants.',
             '${{a}}^{ {{m}} }\\times{{a}}^{ {{p}} }={{a}}^{ {{m}}+{{p}} }='
             + col('{{a}}^{ {{eval:m+p;d}} }') + '$.'],
            ['m*p != m+p'],
        ),
        variation(
            'Écris sous la forme d\'une seule puissance : $\\dfrac{ {{a}}^{ {{m}} } }{ {{a}}^{ {{p}} } }$.'
            '\n\n$\\dfrac{ {{a}}^{ {{m}} } }{ {{a}}^{ {{p}} } }=?$',
            [var('a', '2|3|5|1.5'), var('m', '2|2.5|3|3.5|4.5'), var('p', '0.5|1|1.5|2')],
            case('{{a}}^{ {{eval:m-p;d}} }', **POW),
            ['Pour $a>0$ et des réels $x\\geqslant y\\geqslant0$ :'
             ' $\\dfrac{a^x}{a^y}=a^{x-y}$. On **soustrait** les exposants.',
             '$\\dfrac{ {{a}}^{ {{m}} } }{ {{a}}^{ {{p}} } }={{a}}^{ {{m}}-{{p}} }='
             + col('{{a}}^{ {{eval:m-p;d}} }') + '$.'],
            ['m > p', 'm/p != m-p'],
        ),
        variation(
            'Écris sous la forme d\'une seule puissance : $\\left({{a}}^{ {{m}} }\\right)^{ {{k}} }$.'
            '\n\n$\\left({{a}}^{ {{m}} }\\right)^{ {{k}} }=?$',
            [var('a', '2|3|5|1.5'), var('m', '0.5|1.5|2.5|3'), var('k', '2..4')],
            case('{{a}}^{ {{eval:m*k;d}} }', **POW),
            ['Pour $a>0$ et tous réels positifs $x$ et $y$ : $\\left(a^x\\right)^y=a^{x\\times y}$.'
             ' On **multiplie** les exposants.',
             '$\\left({{a}}^{ {{m}} }\\right)^{ {{k}} }={{a}}^{ {{m}}\\times{{k}} }='
             + col('{{a}}^{ {{eval:m*k;d}} }') + '$.'],
            ['m*k != m+k'],
        ),
        variation(
            'Écris sous la forme d\'une seule puissance : ${{a}}^{ {{m}} }\\times{{b}}^{ {{m}} }$.'
            '\n\n${{a}}^{ {{m}} }\\times{{b}}^{ {{m}} }=?$',
            [var('a', '2|3|5|1.5'), var('b', '2|3|4'), var('m', '0.5|1.5|2.5|3')],
            case('{{eval:a*b;d}}^{ {{m}} }', **POW),
            ['Pour $a>0$, $b>0$ et tout réel positif $x$ : $a^x\\times b^x=(a\\times b)^x$. Les'
             ' deux puissances ont le **même exposant** : on multiplie les nombres.',
             '${{a}}^{ {{m}} }\\times{{b}}^{ {{m}} }=({{a}}\\times{{b}})^{ {{m}} }='
             + col('{{eval:a*b;d}}^{ {{m}} }') + '$.'],
            ['a != b'],
        ),
    ],
    [
        spec('2^1,5 × 2^2 = 2^3,5', 0, {'a': '2', 'm': '1.5', 'p': '2'}, '2^{3,5}', 'correct'),
        spec('Erreur : exposants multipliés (2^3)', 0, {'a': '2', 'm': '1.5', 'p': '2'}, '2^{3}',
             'incorrect'),
        spec('Erreur : base multipliée (4^3,5)', 0, {'a': '2', 'm': '1.5', 'p': '2'}, '4^{3,5}',
             'incorrect'),
        spec('3^4,5 / 3^1,5 = 3^3', 1, {'a': '3', 'm': '4.5', 'p': '1.5'}, '3^{3}', 'correct'),
        spec('Forme : 27 au lieu d\'une puissance', 1, {'a': '3', 'm': '4.5', 'p': '1.5'}, '27',
             'bad_form', ['form']),
        spec('Erreur : exposants divisés (3^3 ≠ … ; 2^2,5/2^0,5 → 2^5)', 1,
             {'a': '2', 'm': '2.5', 'p': '0.5'}, '2^{5}', 'incorrect'),
        spec('(5^1,5)^2 = 5^3', 2, {'a': '5', 'm': '1.5', 'k': '2'}, '5^{3}', 'correct'),
        spec('Erreur : exposants ajoutés (5^3,5)', 2, {'a': '5', 'm': '1.5', 'k': '2'},
             '5^{3,5}', 'incorrect'),
        spec('2^0,5 × 3^0,5 = 6^0,5', 3, {'a': '2', 'b': '3', 'm': '0.5'}, '6^{0,5}', 'correct'),
        spec('Erreur : bases ajoutées (5^0,5)', 3, {'a': '2', 'b': '3', 'm': '0.5'}, '5^{0,5}',
             'incorrect'),
        spec('Erreur : exposants ajoutés (6^1)', 3, {'a': '2', 'b': '3', 'm': '0.5'}, '6^{1}',
             'incorrect'),
    ],
    shared={'blankDefaults': {'acceptDecimal': True}},
)

# --- E3, 1GEN-034 : sens de variation de x ↦ aˣ ---------------------------------------------

E3 = modele(
    'Sens de variation de la fonction x ↦ a^x',
    'a > 1, 0 < a < 1, a = 1 ; comparer deux images sans calcul ; quantité qui diminue',
    1, 20,
    [
        variation(
            'On considère la fonction $f$ définie sur $[0\\,;+\\infty[$ par $f(x)={{a}}^x$.\n\n'
            'Quel est le sens de variation de $f$ sur $[0\\,;+\\infty[$ ?' + SENS,
            [var('a', '1.2|1.5|2|3')], '0',
            [REGLE_SENS, 'Ici $a=' + col('{{a}}') + '>1$ : $f$ est **croissante**.'],
        ),
        variation(
            'On considère la fonction $f$ définie sur $[0\\,;+\\infty[$ par $f(x)={{a}}^x$.\n\n'
            'Quel est le sens de variation de $f$ sur $[0\\,;+\\infty[$ ?' + SENS,
            [var('a', '0.2|0.5|0.8|0.9')], '1',
            [REGLE_SENS, 'Ici $0<a=' + col('{{a}}') + '<1$ : $f$ est **décroissante**.'],
        ),
        variation(
            'On considère la fonction $f$ définie sur $[0\\,;+\\infty[$ par $f(x)=1^x$.\n\n'
            'Quel est le sens de variation de $f$ sur $[0\\,;+\\infty[$ ?' + SENS,
            [], '2',
            [REGLE_SENS, 'Ici $a=' + col('1') + '$ : pour tout $x\\geqslant0$, $1^x=1$, $f$ est'
             ' **constante**.'],
        ),
        variation(
            'On considère la fonction $f$ définie sur $[0\\,;+\\infty[$ par $f(x)={{a}}^x$.\n\n'
            'Sans calculer, compare $f({{x1}})$ et $f({{x2}})$.\n\n'
            '```choix\nmelanger: non\n- $f({{x1}})<f({{x2}})$\n- $f({{x1}})>f({{x2}})$\n```',
            [var('a', '0.5|0.8|1.5|2|3'), var('x1', '0.5|1|1.5|2'), var('x2', '2.5|3|3.5|4')],
            '{{eval:1-min(floor(a),1)}}',
            [REGLE_SENS,
             'Ici $a={{a}}$ {{if:a>1|est supérieur à $1$ : $f$ est croissante|est compris entre $0$'
             ' et $1$ : $f$ est décroissante}}.',
             '${{x1}}<{{x2}}$, donc $' + col('f({{x1}}){{if:a>1|<|>}}f({{x2}})') + '$.'],
        ),
        variation(
            'Un médicament est éliminé par l\'organisme : sa quantité dans le sang diminue de'
            ' ${{p}}~\\%$ par heure. On la modélise par $Q(x)={{q}}\\times{{eval:1-p/100;d}}^x$,'
            ' en mg, où $x$ est le temps en heures.\n\n'
            'Quel est le sens de variation de $Q$ sur $[0\\,;+\\infty[$ ?' + SENS,
            [var('p', '10|15|20|25'), var('q', '50|100|200')], '1',
            ['Diminuer de ${{p}}~\\%$, c\'est multiplier par $1-\\dfrac{ {{p}} }{100}='
             '{{eval:1-p/100;d}}$.',
             '$x\\mapsto{{eval:1-p/100;d}}^x$ est décroissante, car $0<{{eval:1-p/100;d}}<1$ ;'
             ' multipliée par ${{q}}>0$, elle le reste : $Q$ est **décroissante**, comme la suite'
             ' géométrique de même raison.'],
        ),
    ],
    [s for vi, vars_, bonne in [
        (0, {'a': '1.5'}, 0), (1, {'a': '0.8'}, 1), (2, {}, 2), (4, {'p': '20', 'q': '100'}, 1)]
     for s in [spec('variation ' + str(vi) + ' : bonne réponse', vi, vars_, str(bonne), 'correct')]
     + [spec('variation ' + str(vi) + ' : « ' + ['croissante', 'décroissante', 'constante'][j]
             + ' » refusé', vi, vars_, str(j), 'incorrect') for j in range(3) if j != bonne]]
    + [
        spec('a = 2 : f(1) < f(3)', 3, {'a': '2', 'x1': '1', 'x2': '3'}, '0', 'correct'),
        spec('Erreur : a = 2, f(1) > f(3)', 3, {'a': '2', 'x1': '1', 'x2': '3'}, '1', 'incorrect'),
        spec('a = 0,5 : f(1) > f(3)', 3, {'a': '0.5', 'x1': '1', 'x2': '3'}, '1', 'correct'),
        spec('Erreur : a = 0,5, f(1) < f(3)', 3, {'a': '0.5', 'x1': '1', 'x2': '3'}, '0',
             'incorrect'),
    ],
)

# --- E4, 1GEN-035 : associer une courbe à sa fonction aˣ ------------------------------------
# Trois courbes sur [0 ; 4], toutes par (0 ; 1) : on les distingue par le sens et par f(1) = a.


def e4_courbe(j, etiquette):
    return ('- ```courbe\n'
            '  x: -0.5 ; 4.5\n'
            '  y: -0.5 ; 6\n'
            '  grille: 1 ; 1\n'
            '  f(x) = {{a' + j + '}}^x sur [0 ; 4]   bleu\n'
            '  points: A(1 ; {{a' + j + '}})\n'
            '  description: Courbe d\'une fonction x ↦ aˣ sur [0 ; 4], passant par (0 ; 1) et par'
            ' A(1 ; {{a' + j + '}}).\n'
            '  ```\n'
            '  -> ' + etiquette + '\n')


def e4_etiquette(j):
    return '$x\\mapsto{{a' + j + '}}^x$'


E4_ENONCE = ('Chaque courbe représente une fonction $x\\mapsto a^x$ sur $[0\\,;4]$.\n\n'
             'Relie chaque courbe à sa fonction.\n\n'
             '````associer\n' + ''.join(e4_courbe(j, e4_etiquette(j)) for j in '123') + '````')


def e4_corrige(sens):
    return [
        'Toutes ces courbes passent par $(0\\,;1)$, car $a^0=1$. Le point d\'abscisse $1$ a pour'
        ' ordonnée $a^1=a$ : on lit $a$ sur ce point. ' + REGLE_SENS,
        'Courbe 1 : elle passe par $(1\\,;{{a1}})$, c\'est $' + col('x\\mapsto{{a1}}^x') + '$, '
        + sens[0] + '.',
        'Courbe 2 : elle passe par $(1\\,;{{a2}})$, c\'est $' + col('x\\mapsto{{a2}}^x') + '$, '
        + sens[1] + '.',
        'Courbe 3 : elle passe par $(1\\,;{{a3}})$, c\'est $' + col('x\\mapsto{{a3}}^x') + '$, '
        + sens[2] + '.',
    ]


E4 = modele(
    'Associer une courbe à sa fonction x ↦ a^x',
    'Trois courbes ↔ trois fonctions x ↦ aˣ : sens de variation et point (1 ; a)',
    2, 60,
    [
        variation(
            E4_ENONCE,
            [var('a1', '1.2|1.5'), var('a2', '2|2.5'), var('a3', '0.5|0.6|0.8')], None,
            e4_corrige(['croissante, la moins rapide', 'croissante, la plus rapide',
                        'décroissante'])),
        variation(
            E4_ENONCE,
            [var('a1', '1.5|2|2.5'), var('a2', '1'), var('a3', '0.5|0.6|0.8')], None,
            e4_corrige(['croissante', 'constante : la droite horizontale d\'équation $y=1$',
                        'décroissante'])),
    ],
    # Réponses = rang affiché de l'étiquette de chaque courbe (étiquettes mélangées au tirage,
    # graine 0 du testeur) : relevé au premier passage de question:specs.
    [
        spec('Courbes bien reliées', 0, {'a1': '1.5', 'a2': '2', 'a3': '0.5'},
             ['2', '0', '1'], 'correct'),
        spec('Erreur : courbes 1 et 2 échangées', 0, {'a1': '1.5', 'a2': '2', 'a3': '0.5'},
             ['0', '2', '1'], 'incorrect'),
        spec('Avec a = 1 : bien reliées', 1, {'a1': '2', 'a2': '1', 'a3': '0.8'},
             ['2', '0', '1'], 'correct'),
        spec('Erreur : courbes 2 et 3 échangées', 1, {'a1': '2', 'a2': '1', 'a3': '0.8'},
             ['2', '1', '0'], 'incorrect'),
    ],
)

# --- E5, 1GEN-036 : exposant 1/n ------------------------------------------------------------

E5_SENS = ('Pour $b>0$ et $n$ entier non nul, $b^{\\frac{1}{n}}$ est le nombre **positif** dont la'
           ' puissance $n$-ième vaut $b$ : $\\left(b^{\\frac{1}{n}}\\right)^n=b^{\\frac{1}{n}\\times'
           ' n}=b^1=b$.')

E5 = modele(
    'Puissance d\'exposant 1/n',
    'b^(1/n) : valeur exacte, nombre positif dont la puissance n-ième vaut b, (a^(1/n))ⁿ = a',
    1, 40,
    [
        variation(
            'Calcule ${{b}}^{\\frac{1}{ {{n}} }}$.\n\n${{b}}^{\\frac{1}{ {{n}} }}=?$',
            [var('r', '2|3|4'), var('n', '2..5'), var('b', 'eval:r^n')], '{{r}}',
            [E5_SENS,
             'On cherche le nombre positif dont la puissance ${{n}}$-ième vaut ${{b}}$ :'
             ' ${{r}}^{ {{n}} }={{b}}$, donc ${{b}}^{\\frac{1}{ {{n}} }}=' + col('{{r}}') + '$.'],
            ['r^n <= 81'],
        ),
        variation(
            'Quel est le nombre positif $x$ tel que $x^{ {{n}} }={{b}}$ ? Donne sa valeur arrondie'
            ' au centième.\n\n$x\\approx ?$',
            [var('b', '2..20'), var('n', '2..5')],
            case('{{eval:round(100*b^(1/n))/100;d}}', precision=arrondi(2)),
            [E5_SENS,
             'Le nombre positif $x$ tel que $x^{ {{n}} }={{b}}$ est $x={{b}}^{\\frac{1}{ {{n}} }}$.',
             'À la calculatrice : $x\\approx' + col('{{eval:round(100*b^(1/n))/100;d}}') + '$.'],
            ['round(b^(1/n)) != b^(1/n)'],
        ),
        variation(
            'Calcule $\\left({{a}}^{\\frac{1}{ {{n}} }}\\right)^{ {{n}} }$.\n\n'
            '$\\left({{a}}^{\\frac{1}{ {{n}} }}\\right)^{ {{n}} }=?$',
            [var('a', '2..20'), var('n', '2..5')], '{{a}}',
            [E5_SENS,
             'On multiplie les exposants : $\\left({{a}}^{\\frac{1}{ {{n}} }}\\right)^{ {{n}} }='
             '{{a}}^{\\frac{1}{ {{n}} }\\times{{n}} }={{a}}^1=' + col('{{a}}') + '$.'],
            ['round(a^(1/n)) != a^(1/n)'],
        ),
    ],
    [
        spec('8^(1/3) = 2', 0, {'r': '2', 'n': '3', 'b': '8'}, '2', 'correct'),
        spec('Erreur : 8/3', 0, {'r': '2', 'n': '3', 'b': '8'}, '\\frac{8}{3}', 'incorrect'),
        spec('Erreur : 8^3 = 512', 0, {'r': '2', 'n': '3', 'b': '8'}, '512', 'incorrect'),
        spec('81^(1/4) = 3', 0, {'r': '3', 'n': '4', 'b': '81'}, '3', 'correct'),
        spec('x^3 = 10 : x ≈ 2,15', 1, {'b': '10', 'n': '3'}, '2,15', 'correct'),
        spec('Erreur : 10/3 ≈ 3,33', 1, {'b': '10', 'n': '3'}, '3,33', 'incorrect'),
        spec('Erreur : 10^3 = 1000', 1, {'b': '10', 'n': '3'}, '1000', 'incorrect'),
        spec('(7^(1/2))^2 = 7', 2, {'a': '7', 'n': '2'}, '7', 'correct'),
        spec('Erreur : arrondi intermédiaire 2,65² ≈ 7,02', 2, {'a': '7', 'n': '2'}, '7,02',
             'incorrect'),
        spec('Erreur : 1 (exposant 1/n × n pris pour la valeur)', 2, {'a': '7', 'n': '2'}, '1',
             'incorrect'),
    ],
    shared={'blankDefaults': {'acceptDecimal': True}},
    # 8/3 doit être jugé faux, pas refusé pour sa forme.
    options={'constraints': {'form': 'off'}},
)

# --- E6, 1GEN-042 : placer les points de la courbe d'une exponentielle ----------------------
# Ordonnées sur la grille : k × 2ˣ (grille k), 16g × 0,5ˣ (grille g), 8g × 1,5ˣ pour x ⩽ 3
# (grille g). Le tracé de la courbe elle-même reste hors outil (Q14).

LETTRES = 'ABCDE'


def placer(n_max, terme):
    return 'placer: ' + ' ; '.join(
        LETTRES[k] + '=(' + str(k) + ' ; {{eval:' + terme.replace('X', str(k)) + '}})'
        for k in range(n_max + 1))


def repere(n_max, terme, grille, haut, axes=''):
    return ('```courbe\nx: -1 ; ' + str(n_max + 1) + '\ny: -{{' + grille + '}} ; {{eval:' + haut
            + '}}\ngrille: 1 ; {{' + grille + '}}\n' + axes + placer(n_max, terme)
            + '\ntaille: moyenne\ndescription: Repère : x de −1 à ' + str(n_max + 1)
            + ' en abscisse, de 1 en 1 ; ordonnée graduée de {{' + grille + '}} en {{' + grille
            + '}}.\n```')


def consigne(n_max):
    noms = ', '.join('$' + LETTRES[k] + '$' for k in range(n_max)) + ' et $' + LETTRES[n_max] + '$'
    return ('\n\nPlace les points ' + noms + ' de la courbe de $f$ d\'abscisses $0$, $1$, …, $'
            + str(n_max) + '$.\n\n')


def valeurs(n_max, terme):
    return ', '.join('$f(' + str(k) + ')={{eval:' + terme.replace('X', str(k)) + ';d}}$'
                     for k in range(n_max + 1))


def points(n_max, terme):
    return ', '.join('$' + LETTRES[k] + col('(' + str(k) + '\\,;{{eval:' + terme.replace('X', str(k))
                                            + ';d}})') + '$' for k in range(n_max + 1))


def e6_fin(n_max, terme, sens):
    return ('On place ' + points(n_max, terme) + '. Les points ne sont pas alignés : la courbe'
            ' d\'une fonction $x\\mapsto k\\times a^x$ n\'est pas une droite ; ' + sens + '.')


T1, T2, T3 = 'k*2^X', 'k*0.5^X', 'k*1.5^X'

E6 = modele(
    'Placer des points de la courbe d\'une fonction exponentielle',
    'f(x) = k × aˣ : calculer f(0) à f(4) puis placer les points ; tableau de valeurs donné',
    1, 90,
    [
        variation(
            'On considère la fonction $f$ définie sur $[0\\,;+\\infty[$ par'
            ' $f(x)={{if:k>1|{{k}}\\times}}2^x$.' + consigne(4)
            + repere(4, T1, 'k', 'k*17'),
            [var('k', '1|2')], None,
            ['On calcule les images : ' + valeurs(4, T1) + '. On multiplie par $2$ d\'une abscisse'
             ' à la suivante.', e6_fin(4, T1, 'elle monte de plus en plus vite')],
        ),
        variation(
            'On considère la fonction $f$ définie sur $[0\\,;+\\infty[$ par'
            ' $f(x)={{k}}\\times0{,}5^x$.' + consigne(4) + repere(4, T2, 'g', 'g*17'),
            [var('g', '1|2|3|5'), var('k', 'eval:16*g')], None,
            ['On calcule les images : ' + valeurs(4, T2) + '. On divise par $2$ d\'une abscisse'
             ' à la suivante.', e6_fin(4, T2, 'elle descend de moins en moins vite')],
        ),
        variation(
            'Une culture compte ${{k}}$ milliers de bactéries. Leur nombre, en milliers, au bout de'
            ' $x$ heures est modélisé par $f(x)={{k}}\\times1{,}5^x$. On a calculé :\n\n'
            '| $x$ | $0$ | $1$ | $2$ | $3$ |\n| --- | --- | --- | --- | --- |\n'
            '| $f(x)$ | ${{eval:k;d}}$ | ${{eval:k*1.5;d}}$ | ${{eval:k*1.5^2;d}}$ |'
            ' ${{eval:k*1.5^3;d}}$ |\n\n'
            'Place les points $A$, $B$, $C$ et $D$ de la courbe de $f$ d\'abscisses $0$, $1$, $2$'
            ' et $3$.\n\n'
            + repere(3, T3, 'g', 'g*29', 'axes: x = Heures ; y = Milliers\n'),
            [var('g', '1|2'), var('k', 'eval:8*g')], None,
            ['Chaque colonne du tableau donne un point $(x\\,;f(x))$.',
             e6_fin(3, T3, 'elle monte de plus en plus vite')],
        ),
    ],
    [
        spec('f(x) = 2ˣ : 1, 2, 4, 8, 16', 0, {'k': '1'},
             ['0;1', '1;2', '2;4', '3;8', '4;16'], 'correct'),
        spec('Erreur : 2x au lieu de 2ˣ (0, 2, 4, 6, 8)', 0, {'k': '1'},
             ['0;0', '1;2', '2;4', '3;6', '4;8'], 'incorrect'),
        spec('f(x) = 2 × 2ˣ : 2, 4, 8, 16, 32', 0, {'k': '2'},
             ['0;2', '1;4', '2;8', '3;16', '4;32'], 'correct'),
        spec('Erreur : f(0) = 0', 0, {'k': '2'}, ['0;0', '1;4', '2;8', '3;16', '4;32'],
             'incorrect'),
        spec('f(x) = 32 × 0,5ˣ : 32, 16, 8, 4, 2', 1, {'g': '2', 'k': '32'},
             ['0;32', '1;16', '2;8', '3;4', '4;2'], 'correct'),
        spec('Erreur : 32 − 0,5x × … (on retire 8 : 32, 24, 16, 8, 0)', 1, {'g': '2', 'k': '32'},
             ['0;32', '1;24', '2;16', '3;8', '4;0'], 'incorrect'),
        spec('Bactéries 8 × 1,5ˣ : 8, 12, 18, 27', 2, {'g': '1', 'k': '8'},
             ['0;8', '1;12', '2;18', '3;27'], 'correct'),
        spec('Erreur : abscisse et ordonnée échangées pour B', 2, {'g': '1', 'k': '8'},
             ['0;8', '12;1', '2;18', '3;27'], 'incorrect'),
    ],
    shared={'cleanCoefficients': True},
)

# --- E7, 1GEN-059 : lire sur la courbe d'une exponentielle ----------------------------------
# Réponses à une demi-graduation près.


def e7_courbe(formule, xmax, ymax, grille_x, grille_y, description):
    return ('```courbe\nx: -0.5 ; ' + xmax + '\ny: -0.5 ; ' + ymax + '\ngrille: ' + grille_x
            + ' ; ' + grille_y + '\nf(x) = ' + formule + ' sur [0 ; 6]   bleu   nom=\\mathcal{C}_f\n'
            'taille: moyenne\ndescription: ' + description + '\n```')


E7_INTRO = 'La courbe $\\mathcal{C}_f$ ci-dessous représente une fonction $f$ définie sur $[0\\,;6]$.\n\n'

E7 = modele(
    'Lire sur la courbe d\'une fonction exponentielle',
    'f(x) = k × aˣ : lire une image, résoudre f(x) = b graphiquement, lire a',
    1, 40,
    [
        variation(
            E7_INTRO
            + e7_courbe('{{k}}*{{a}}^x', '6.5', '17', '1', '1',
                        'Courbe croissante de f(x) = {{k}} × {{a}}^x sur [0 ; 6], repère gradué de'
                        ' 1 en 1.')
            + '\n\nLis $f({{x}})$, à une demi-graduation près.\n\n$f({{x}})\\approx ?$',
            [var('k', '1|2'), var('a', '1.4|1.5'), var('x', '2..5')],
            case('{{eval:round(10*k*a^x)/10;d}}', precision=tolerance(0.5)),
            ['$f({{x}})$ est l\'ordonnée du point de $\\mathcal{C}_f$ d\'abscisse ${{x}}$ : on monte'
             ' verticalement depuis ${{x}}$ jusqu\'à la courbe, puis on lit l\'ordonnée sur l\'axe.',
             'On lit $f({{x}})\\approx' + col('{{eval:round(10*k*a^x)/10;d}}') + '$ (par le calcul,'
             ' $f({{x}})={{k}}\\times{{a}}^{ {{x}} }\\approx{{eval:round(100*k*a^x)/100;d}}$).'],
            ['k*a^6 <= 16'],
        ),
        variation(
            E7_INTRO
            + e7_courbe('{{k}}*{{a}}^x', '6.5', '17', '0.5', '1',
                        'Courbe décroissante de f(x) = {{k}} × {{a}}^x sur [0 ; 6] ; abscisses'
                        ' graduées de 0,5 en 0,5, ordonnées de 1 en 1.')
            + '\n\nRésous graphiquement l\'équation $f(x)={{y}}$, à une demi-graduation près.'
            '\n\n$x\\approx ?$',
            [var('k', '10|12|16'), var('a', '0.5|0.6|0.7'), var('y', '2|3|4|5|6|8')],
            case('{{eval:round(100*ln(y/k)/ln(a))/100;d}}', precision=tolerance(0.25)),
            ['On cherche l\'abscisse du point de $\\mathcal{C}_f$ d\'ordonnée ${{y}}$ : on part'
             ' de ${{y}}$ sur l\'axe des ordonnées, on va horizontalement jusqu\'à la courbe, puis on'
             ' descend lire l\'abscisse.',
             'On lit $x\\approx' + col('{{eval:round(10*ln(y/k)/ln(a))/10;d}}') + '$.'],
            ['y < k', 'ln(y/k)/ln(a) >= 0.5', 'ln(y/k)/ln(a) <= 5.5'],
        ),
        variation(
            E7_INTRO
            + e7_courbe('{{a}}^x', '6.5', '8', '1', '0.5',
                        'Courbe de f(x) = a^x sur [0 ; 6], abscisses graduées de 1 en 1, ordonnées'
                        ' de 0,5 en 0,5.')
            + '\n\n$f$ est de la forme $f(x)=a^x$, avec $a>0$. Lis la valeur de $a$.\n\n$a=?$',
            [var('a', '0.5|1.5|2|2.5')],
            case('{{a}}', precision=tolerance(0.25)),
            ['Pour $f(x)=a^x$ : $f(1)=a^1=a$. On lit donc l\'ordonnée du point d\'abscisse $1$.',
             'Le point de $\\mathcal{C}_f$ d\'abscisse $1$ a pour ordonnée ${{a}}$ : $a='
             + col('{{a}}') + '$. (La courbe passe aussi par $(0\\,;1)$, comme toute courbe de'
             ' $x\\mapsto a^x$.)'],
        ),
    ],
    [
        spec('1,5^4 ≈ 5,06 : 5 accepté', 0, {'k': '1', 'a': '1.5', 'x': '4'}, '5', 'correct'),
        spec('1,5^4 ≈ 5,06 : 5,5 accepté', 0, {'k': '1', 'a': '1.5', 'x': '4'}, '5,5', 'correct'),
        spec('Erreur : f(3) lu (3,4)', 0, {'k': '1', 'a': '1.5', 'x': '4'}, '3,4', 'incorrect'),
        spec('Erreur : 1,5 × 4 = 6 (lecture fausse)', 0, {'k': '1', 'a': '1.5', 'x': '4'}, '6,1',
             'incorrect'),
        spec('16 × 0,5^x = 4 : x = 2', 1, {'k': '16', 'a': '0.5', 'y': '4'}, '2', 'correct'),
        spec('16 × 0,5^x = 4 : 2,2 accepté', 1, {'k': '16', 'a': '0.5', 'y': '4'}, '2,2',
             'correct'),
        spec('Erreur : image de 4 lue (f(4) = 1)', 1, {'k': '16', 'a': '0.5', 'y': '4'}, '1',
             'incorrect'),
        spec('Erreur : 2,5 (une graduation de trop)', 1, {'k': '16', 'a': '0.5', 'y': '4'}, '2,5',
             'incorrect'),
        spec('a = 1,5', 2, {'a': '1.5'}, '1,5', 'correct'),
        spec('Erreur : f(0) = 1 lu', 2, {'a': '1.5'}, '1', 'incorrect'),
        spec('Erreur : f(2) = 2,25 lu', 2, {'a': '1.5'}, '2,25', 'incorrect'),
    ],
    shared={'blankDefaults': {'acceptDecimal': True}},
)

MODELES = [('01-calculer-valeur-a-puissance-x', E1),
           ('02-une-seule-puissance-exposants-reels', E2),
           ('03-sens-de-variation-a-puissance-x', E3),
           ('04-associer-courbe-a-puissance-x', E4),
           ('05-exposant-un-sur-n', E5),
           ('06-placer-points-courbe-exponentielle', E6),
           ('07-lire-courbe-exponentielle', E7)]

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    chemin = os.path.join(DOSSIER, nom + '.json')
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
    print('écrit', chemin)
