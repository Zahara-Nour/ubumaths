"""Écrit les 4 modèles du lot 1 « automatismes » de la Terminale technologique (STMG)
dans scripts/questions/ttechno-1-automatismes/.

Phase 0 validée par David le 2026-11-17 (journal docs/archive/wip/questions-ttechno-progress.md § 11) :

| #  | Point        | Nœud (posé par la migration)       | Niveau |
| I1 | TTECHNO-073  | Évolutions › indices                | 1 |
| I2 | TTECHNO-015  | Évolutions › indices                | 1 |
| I3 | TTECHNO-015  | Évolutions › indices                | 2 |
| I4 | TTECHNO-092  | Calcul littéral › isoler une variable | 2 |

Bornes (BO Tle techno p.7) : indice de base 100 — interpréter, calculer un indice, calculer le
taux d'évolution entre deux valeurs ; isoler une variable dans une inégalité qui en comporte
plusieurs, exemples internes aux mathématiques ou issus d'autres disciplines.

Pièges : jamais de variable `e` ni `i` ; case choix → `melanger: non`, réponse = rang de la bonne
proposition ; décimaux → `blankDefaults.acceptDecimal` ; arrondi → `precision` + `round` dans eval.

    python3 docs/wip/questions/lot-ttechno-1.py scripts/questions/ttechno-1-automatismes
"""
import json
import os
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables_, answer, status, violations=None):
    expected = {'status': status}
    if violations:
        expected['constraintViolations'] = violations
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'answers': [answer], 'expected': expected}


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


def variation(statement, variables, reponse, steps, conditions=None, precision=None):
    blank = {'expectedAnswer': reponse}
    if precision is not None:
        blank['precision'] = {'type': 'decimal', 'digits': precision}
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': [blank], 'correction': {'steps': steps}}


def col(x):
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


DECIMAL = {'blankDefaults': {'acceptDecimal': True}}
INDICE_DEF = ('L\'indice de base $100$ d\'une valeur $V$ par rapport à la valeur de référence $V_0$'
              ' est $I=100\\times\\dfrac{V}{V_0}$.')

# --- I1, TTECHNO-073 : calculer un indice --------------------------------------------------

I1 = modele(
    'Calculer un indice de base 100',
    'Indice d\'une valeur, valeur retrouvée à partir de l\'indice, indice dans un tableau',
    1, 45,
    [
        variation(
            'En 2020, une salle de sport comptait ${{a}}$ abonnés ; en 2024, elle en compte'
            ' ${{eval:a+d}}$.\n\nCalcule l\'indice du nombre d\'abonnés en 2024, base $100$ en'
            ' 2020, arrondi au dixième.\n\n$I_{2024}\\approx ?$',
            [var('a', '120..480'), var('d', '-60..90')],
            '{{eval:round(1000*(a+d)/a)/10;d}}',
            [INDICE_DEF,
             '$I_{2024}=100\\times\\dfrac{ {{eval:a+d}} }{ {{a}} }\\approx'
             + col('{{eval:round(1000*(a+d)/a)/10;d}}') + '$.'],
            conditions=['d*d >= 25'],
            precision=1,
        ),
        variation(
            'Le loyer mensuel d\'un appartement était de ${{l}}~\\unit{€}$ en 2019. En 2025,'
            ' l\'indice de ce loyer, base $100$ en 2019, vaut ${{k}}$.\n\nQuel est le loyer'
            ' mensuel en 2025 ?\n\n$?~\\unit{€}$',
            [var('l', '500|600|650|720|800'), var('k', '96|104|108|112|115|120')],
            '{{eval:l*k/100;d}}',
            ['Un indice de ${{k}}$ signifie que le loyer vaut $\\dfrac{ {{k}} }{100}$ du loyer'
             ' de 2019.',
             '${{l}}\\times\\dfrac{ {{k}} }{100}=' + col('{{eval:l*k/100;d}}') + '$ : le loyer'
             ' est de ${{eval:l*k/100;d}}~\\unit{€}$.'],
        ),
        variation(
            'Le tableau donne le prix d\'un panier de courses, en euros, et son indice base $100$'
            ' en 2021.\n\n'
            '| Année | 2021 | 2022 | 2023 |\n| --- | --- | --- | --- |\n'
            '| Prix (€) | ${{a}}$ | ${{eval:a+b}}$ | ${{eval:a+c}}$ |\n'
            '| Indice | $100$ | ${{eval:round(1000*(a+b)/a)/10;d}}$ | $?$ |\n\n'
            'Complète l\'indice de 2023, arrondi au dixième.',
            [var('a', '40..80'), var('b', '1..6'), var('c', '4..12')],
            '{{eval:round(1000*(a+c)/a)/10;d}}',
            [INDICE_DEF,
             '$I_{2023}=100\\times\\dfrac{ {{eval:a+c}} }{ {{a}} }\\approx'
             + col('{{eval:round(1000*(a+c)/a)/10;d}}') + '$.'],
            conditions=['c > b'],
            precision=1,
        ),
    ],
    [
        spec('200 → 250 : 125', 0, {'a': '200', 'd': '50'}, '125', 'correct'),
        spec('300 → 260 : 86,7', 0, {'a': '300', 'd': '-40'}, '86,7', 'correct'),
        spec('Erreur : rapport inversé (115,4)', 0, {'a': '300', 'd': '-40'}, '115,4', 'incorrect'),
        spec('Erreur : différence (−40)', 0, {'a': '300', 'd': '-40'}, '-40', 'incorrect'),
        spec('Erreur : sans le × 100 (0,9)', 0, {'a': '300', 'd': '-40'}, '0,9', 'incorrect'),
        spec('600 €, indice 112 : 672', 1, {'l': '600', 'k': '112'}, '672', 'correct'),
        spec('Erreur : 600 + 112', 1, {'l': '600', 'k': '112'}, '712', 'incorrect'),
        spec('Erreur : 600 × 100 / 112 (535,71)', 1, {'l': '600', 'k': '112'}, '535,71',
             'incorrect'),
        spec('650 €, indice 96 : 624', 1, {'l': '650', 'k': '96'}, '624', 'correct'),
        spec('60 → 69 : 115', 2, {'a': '60', 'b': '3', 'c': '9'}, '115', 'correct'),
        spec('48 → 55 : 114,6', 2, {'a': '48', 'b': '2', 'c': '7'}, '114,6', 'correct'),
        spec('Erreur : indice de 2022 (104,2)', 2, {'a': '48', 'b': '2', 'c': '7'}, '104,2',
             'incorrect'),
        spec('Erreur : 100 + écart en euros (107)', 2, {'a': '48', 'b': '2', 'c': '7'}, '107',
             'incorrect'),
    ],
    shared=DECIMAL,
)

# --- I2, TTECHNO-015 : interpréter un indice --------------------------------------------------

I2_REGLE = ('Un indice $I$ de base $100$ correspond à un taux d\'évolution de $I-100$ pour cent'
            ' depuis l\'année de base.')
HHB = '\n\n```choix\nmelanger: non\n- une hausse\n- une baisse\n- une stabilité\n```'

I2 = modele(
    'Interpréter un indice de base 100',
    'Traduire un indice en taux d\'évolution depuis l\'année de base',
    1, 30,
    [
        variation(
            'L\'indice du prix d\'un article en 2024, base $100$ en 2020, vaut ${{k}}$.\n\n'
            'De quel pourcentage le prix a-t-il augmenté entre 2020 et 2024 ?\n\n$?~\\%$',
            [var('k', '103.5|108|112.5|117|124|131.2')],
            '{{eval:k-100;d}}',
            [I2_REGLE,
             '${{k}}-100=' + col('{{eval:k-100;d}}') + '$ : le prix a augmenté de'
             ' ${{eval:k-100;d}}~\\%$.'],
        ),
        variation(
            'L\'indice de la production d\'une usine en 2024, base $100$ en 2020, vaut ${{k}}$.'
            '\n\nQuel est le taux d\'évolution de la production entre 2020 et 2024 (positif pour'
            ' une hausse, négatif pour une baisse) ?\n\n$?~\\%$',
            [var('k', '96|91.5|87|82|78.4')],
            '{{eval:k-100;d}}',
            [I2_REGLE,
             '${{k}}-100=' + col('{{eval:k-100;d}}') + '$ : la production a baissé de'
             ' ${{eval:100-k;d}}~\\%$.'],
        ),
        variation(
            'L\'indice du nombre de visiteurs d\'un musée en 2024, base $100$ en 2019, vaut'
            ' ${{eval:100+m*(1.5*s^2-3.5*s+1);d}}$.\n\nEntre 2019 et 2024, le nombre de'
            ' visiteurs a connu…' + HHB,
            [var('s', '0|0|1|1|2'), var('m', '3|6|8|12|15|22')],
            '{{s}}',
            [I2_REGLE,
             'Ici l\'indice vaut ${{eval:100+m*(1.5*s^2-3.5*s+1);d}}$, '
             '{{if:s==0|plus que $100$ : c\'est **une hausse**.|'
             '{{if:s==1|moins que $100$ : c\'est **une baisse**.|'
             'exactement $100$ : c\'est **une stabilité**.}}}}'],
        ),
    ],
    [
        spec('112,5 → 12,5', 0, {'k': '112.5'}, '12,5', 'correct'),
        spec('Erreur : 112,5', 0, {'k': '112.5'}, '112,5', 'incorrect'),
        spec('Erreur : 0,125', 0, {'k': '112.5'}, '0,125', 'incorrect'),
        spec('87 → −13', 1, {'k': '87'}, '-13', 'correct'),
        spec('Erreur : signe perdu (13)', 1, {'k': '87'}, '13', 'incorrect'),
        spec('Erreur : 87', 1, {'k': '87'}, '87', 'incorrect'),
    ] + [s for vi_vars, bonne in [({'s': '0', 'm': '8'}, 0), ({'s': '1', 'm': '12'}, 1),
                                  ({'s': '2', 'm': '6'}, 2)]
         for s in [spec('choix : bonne réponse ' + str(bonne), 2, vi_vars, str(bonne), 'correct')]
         + [spec('choix ' + str(j) + ' refusé', 2, vi_vars, str(j), 'incorrect')
            for j in range(3) if j != bonne]],
    shared=DECIMAL,
)

# --- I3, TTECHNO-015 : taux d'évolution entre deux années, à partir des indices ---------------

I3_REGLE = ('Le taux d\'évolution entre deux années se calcule avec les indices comme avec les'
            ' valeurs : $t=\\dfrac{I_2-I_1}{I_1}$. La différence $I_2-I_1$ est un écart en'
            ' **points**, pas en pourcentage.')
VF = '\n\n```choix\nmelanger: non\n- vraie\n- fausse\n```'

I3 = modele(
    'Taux d\'évolution entre deux années à partir des indices',
    'Calculer un taux d\'évolution entre deux indices, sans confondre points et pourcentage',
    2, 60,
    [
        variation(
            'L\'indice du prix de l\'électricité, base $100$ en 2015, vaut ${{a}}$ en 2022 et'
            ' ${{eval:a+d}}$ en 2024.\n\nCalcule le taux d\'évolution du prix entre 2022 et 2024,'
            ' en pourcentage arrondi au dixième.\n\n$?~\\%$',
            [var('a', '104..125'), var('d', '-12..18')],
            '{{eval:round(1000*d/a)/10;d}}',
            [I3_REGLE,
             '$t=\\dfrac{ {{eval:a+d}}-{{a}} }{ {{a}} }\\approx{{eval:round(10000*d/a)/10000;d}}$,'
             ' soit environ $' + col('{{eval:round(1000*d/a)/10;d}}') + '~\\%$.'],
            conditions=['d*d >= 9'],
            precision=1,
        ),
        variation(
            'L\'indice du prix d\'un service, base $100$ en 2015, passe de ${{a}}$ en 2022 à'
            ' ${{eval:a+d}}$ en 2024.\n\nAffirmation : « Entre 2022 et 2024, le prix a augmenté'
            ' de ${{eval:(1-s)*round(1000*d/a)/10+s*d;d}}~\\%$ (taux arrondi au dixième). »\n\n'
            'Cette affirmation est…' + VF,
            # a ⩾ 118 : l'écart en points dépasse le taux d'au moins 1,5 point, l'affirmation
            # fausse ne peut pas passer pour un arrondi du vrai taux.
            [var('s', '0|1'), var('a', '118..140'), var('d', '8..20')],
            '{{s}}',
            [I3_REGLE,
             '$t=\\dfrac{ {{eval:a+d}}-{{a}} }{ {{a}} }\\approx{{eval:round(1000*d/a)/10;d}}~\\%$.',
             '{{if:s==0|L\'affirmation est **vraie**.|L\'affirmation est **fausse** : ${{d}}$ est'
             ' l\'écart en points, pas le taux d\'évolution.}}'],
            conditions=['d - 100*d/a >= 1.5'],
        ),
    ],
    [
        spec('110 → 121 : 10', 0, {'a': '110', 'd': '11'}, '10', 'correct'),
        spec('115 → 124 : 7,8', 0, {'a': '115', 'd': '9'}, '7,8', 'correct'),
        spec('Erreur : écart en points (9)', 0, {'a': '115', 'd': '9'}, '9', 'incorrect'),
        spec('Erreur : I₂ − 100 (24)', 0, {'a': '115', 'd': '9'}, '24', 'incorrect'),
        spec('120 → 111 : −7,5', 0, {'a': '120', 'd': '-9'}, '-7,5', 'correct'),
        spec('Erreur : signe perdu (7,5)', 0, {'a': '120', 'd': '-9'}, '7,5', 'incorrect'),
        spec('taux juste annoncé : vraie', 1, {'s': '0', 'a': '125', 'd': '10'}, '0', 'correct'),
        spec('taux juste annoncé : « fausse » refusé', 1, {'s': '0', 'a': '125', 'd': '10'}, '1',
             'incorrect'),
        spec('points annoncés : fausse', 1, {'s': '1', 'a': '125', 'd': '10'}, '1', 'correct'),
        spec('points annoncés : « vraie » refusé', 1, {'s': '1', 'a': '125', 'd': '10'}, '0',
             'incorrect'),
    ],
    shared=DECIMAL,
)

# --- I4, TTECHNO-092 : isoler une variable dans une inégalité ---------------------------------

I4 = modele(
    'Isoler une variable dans une inégalité',
    'Exprimer une variable en fonction des autres dans une inégalité, en gardant ou en changeant'
    ' le sens',
    2, 60,
    [
        variation(
            'Avec un budget de ${{c}}~\\unit{€}$, une association achète $x$ ballons à ${{a}}~'
            '\\unit{€}$ et $y$ filets à ${{b}}~\\unit{€}$ : ${{a}}x+{{b}}y\\leqslant {{c}}$.\n\n'
            'Exprime $y$ en fonction de $x$.\n\n$?$',
            [var('a', '2..9'), var('b', '3..8'), var('c', '40..120')],
            'y\\leqslant {{eval:-(a)/(b)}}x{{eval:(c)/(b);+}}',
            ['On isole le terme en $y$ : ${{b}}y\\leqslant {{c}}-{{a}}x$.',
             'On divise par ${{b}}$, qui est **positif** : le sens de l\'inégalité ne change pas.',
             '$$' + col('y\\leqslant {{eval:-(a)/(b)}}x{{eval:(c)/(b);+}}') + '$$'],
            conditions=['a != b'],
        ),
        variation(
            'Les nombres $x$ et $y$ vérifient ${{a}}x-{{b}}y\\leqslant {{c}}$.\n\n'
            'Exprime $y$ en fonction de $x$.\n\n$?$',
            [var('a', '2..9'), var('b', '2..6'), var('c', '1..12')],
            'y\\geqslant {{eval:(a)/(b)}}x{{eval:-(c)/(b);+}}',
            ['On isole le terme en $y$ : $-{{b}}y\\leqslant {{c}}-{{a}}x$.',
             'On divise par $-{{b}}$, qui est **négatif** : le sens de l\'inégalité **change**.',
             '$$' + col('y\\geqslant {{eval:(a)/(b)}}x{{eval:-(c)/(b);+}}') + '$$'],
            conditions=['a != b'],
        ),
        variation(
            '{{if:w==0|Un appareil branché sous une tension $U$ (en volts) ne doit pas dépasser'
            ' la puissance $P$ (en watts) : l\'intensité $I$ vérifie $UI\\leqslant P$.|'
            'Un cycliste roule à la vitesse $v$ et ne doit pas parcourir plus que la distance $D$ :'
            ' la durée $t$ du trajet vérifie $vt\\leqslant D$.}}\n\nToutes ces grandeurs sont'
            ' strictement positives. Exprime ${{if:w==0|I|t}}$ en fonction des autres grandeurs.'
            '\n\n$?$',
            [var('w', '0|1')],
            '{{if:w==0|I\\leqslant\\frac{P}{U}|t\\leqslant\\frac{D}{v}}}',
            ['On divise les deux membres par ${{if:w==0|U|v}}$, qui est **positif** : le sens'
             ' de l\'inégalité ne change pas.',
             '$$' + col('{{if:w==0|I\\leqslant\\dfrac{P}{U}|t\\leqslant\\dfrac{D}{v}}}') + '$$'],
        ),
    ],
    [
        spec('3x + 5y ⩽ 60 : y ⩽ −3/5 x + 12', 0, {'a': '3', 'b': '5', 'c': '60'},
             'y\\leqslant -\\frac{3}{5}x+12', 'correct'),
        spec('Écrit avec \\le (clavier MathLive)', 0, {'a': '3', 'b': '5', 'c': '60'},
             'y\\le -\\frac{3}{5}x+12', 'correct'),
        spec('Termes dans l\'autre ordre', 0, {'a': '3', 'b': '5', 'c': '60'},
             'y\\leqslant 12-\\frac{3}{5}x', 'correct'),
        spec('Forme non réduite (60 − 3x)/5', 0, {'a': '3', 'b': '5', 'c': '60'},
             'y\\leqslant \\frac{60-3x}{5}', 'unoptimal_form', ['form']),
        spec('Écrit à l\'envers : juste, forme à améliorer (y non isolé à gauche)', 0,
             {'a': '3', 'b': '5', 'c': '60'}, '-\\frac{3}{5}x+12\\geqslant y',
             'unoptimal_form', ['form']),
        spec('Erreur : sens changé', 0, {'a': '3', 'b': '5', 'c': '60'},
             'y\\geqslant -\\frac{3}{5}x+12', 'incorrect'),
        spec('Erreur : c non divisé', 0, {'a': '3', 'b': '5', 'c': '60'},
             'y\\leqslant -\\frac{3}{5}x+60', 'incorrect'),
        spec('Erreur : signe de x gardé', 0, {'a': '3', 'b': '5', 'c': '60'},
             'y\\leqslant \\frac{3}{5}x+12', 'incorrect'),
        spec('2x − 4y ⩽ 8 : y ⩾ x/2 − 2', 1, {'a': '2', 'b': '4', 'c': '8'},
             'y\\geqslant \\frac{1}{2}x-2', 'correct'),
        spec('Erreur : sens non changé', 1, {'a': '2', 'b': '4', 'c': '8'},
             'y\\leqslant \\frac{1}{2}x-2', 'incorrect'),
        spec('Erreur : signe de c', 1, {'a': '2', 'b': '4', 'c': '8'},
             'y\\geqslant \\frac{1}{2}x+2', 'incorrect'),
        spec('UI ⩽ P : I ⩽ P/U', 2, {'w': '0'}, 'I\\leqslant\\frac{P}{U}', 'correct'),
        spec('Erreur : I ⩽ U/P', 2, {'w': '0'}, 'I\\leqslant\\frac{U}{P}', 'incorrect'),
        spec('Erreur : I ⩽ PU', 2, {'w': '0'}, 'I\\leqslant PU', 'incorrect'),
        spec('vt ⩽ D : t ⩽ D/v', 2, {'w': '1'}, 't\\leqslant\\frac{D}{v}', 'correct'),
        spec('Erreur : t ⩾ D/v', 2, {'w': '1'}, 't\\geqslant\\frac{D}{v}', 'incorrect'),
    ],
    shared={'cleanCoefficients': True},
    options={'constraints': {'form': 'warn'}},
)

MODELES = [('01-calculer-un-indice', I1), ('02-interpreter-un-indice', I2),
           ('03-taux-entre-deux-indices', I3), ('04-isoler-une-variable-inegalite', I4)]

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    chemin = os.path.join(DOSSIER, nom + '.json')
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
    print('écrit', chemin)
