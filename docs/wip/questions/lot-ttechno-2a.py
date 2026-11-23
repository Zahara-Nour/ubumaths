"""Écrit les 8 modèles du lot 2a « suites » de la Terminale technologique (STMG)
dans scripts/questions/ttechno-2a-suites/.

Phase 0 validée par David le 2026-11-17 (journal docs/archive/wip/questions-ttechno-progress.md § 12,
Q16 à Q18 : « je suis tes recos ») :

| #  | Point        | Nœud (posé par la migration)            | Niveau |
| M1 | TTECHNO-016  | Suites › Suites arithmétiques (notion)    | 1 |
| M2 | TTECHNO-018  | Suites › Suites géométriques (notion)     | 2 |
| M3 | TTECHNO-020  | Suites arithmétiques › définition         | 2 |
| M4 | TTECHNO-021  | Suites géométriques › définition          | 2 |
| M5 | TTECHNO-022  | Suites arithmétiques › définition         | 1 |
| M6 | TTECHNO-028  | Suites arithmétiques › somme des termes   | 3 |
| M7 | TTECHNO-029  | Suites géométriques › somme des termes    | 3 |
| M8 | TTECHNO-074  | Suites arithmétiques › somme des termes   | 2 |

Bornes (BO Tle techno p.7-8) : suites géométriques à termes positifs ; moyenne géométrique de
deux nombres positifs ; notation Σ sur des exemples variés (carrés, cubes, inverses) ; exemple
type de 029 : valeur acquise par des placements à intérêts composés avec versements réguliers.
Ni eˣ, ni ln, ni limite.

Pièges : jamais de variable `e` ni `i` ; case choix → `melanger: non`, réponse = rang de la bonne
proposition ; décimaux → `blankDefaults.acceptDecimal` ; arrondi → `precision` + `round` dans eval.
Un « non » de M3 / M4 ne doit pas rendre vraie une proposition « oui » : conditions explicites.

    python3 docs/wip/questions/lot-ttechno-2a.py scripts/questions/ttechno-2a-suites
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


def choix(*options):
    return '\n\n```choix\nmelanger: non\n' + '\n'.join('- ' + o for o in options) + '\n```'


def specs_choix(vi, cas, n):
    """cas : liste de (variables, rang de la bonne proposition) ; n propositions."""
    out = []
    for vars_, bonne in cas:
        out.append(spec('choix : bonne réponse ' + str(bonne), vi, vars_, str(bonne), 'correct'))
        out += [spec('choix ' + str(j) + ' refusé', vi, vars_, str(j), 'incorrect')
                for j in range(n) if j != bonne]
    return out


DECIMAL = {'blankDefaults': {'acceptDecimal': True}}

# --- M1, TTECHNO-016 : moyenne arithmétique de deux nombres ----------------------------------

M1_DEF = 'La moyenne arithmétique de deux nombres $a$ et $b$ est $\\dfrac{a+b}{2}$.'
M1_SUITE = ('Dans une suite arithmétique, chaque terme est la moyenne arithmétique du terme'
            ' qui le précède et du terme qui le suit.')

M1 = modele(
    'Moyenne arithmétique de deux nombres',
    'Calculer la moyenne arithmétique de deux nombres, retrouver un terme d\'une suite'
    ' arithmétique entre deux autres',
    1, 30,
    [
        variation(
            'Calcule la moyenne arithmétique de ${{a}}$ et ${{b}}$.\n\n$?$',
            [var('a', '-20..40'), var('b', '-20..40')],
            '{{eval:(a+b)/2;d}}',
            [M1_DEF,
             '$\\dfrac{ {{a}}{{eval:b;+}} }{2}=\\dfrac{ {{eval:a+b}} }{2}='
             + col('{{eval:(a+b)/2;d}}') + '$.'],
            conditions=['a != b', 'a != -b'],
        ),
        variation(
            '$(u_n)$ est une suite arithmétique telle que $u_{{k}}={{a}}$ et'
            ' $u_{{k2}}={{eval:a+2*r}}$.\n\nCalcule $u_{{k1}}$.\n\n$u_{{k1}}=?$',
            [var('k', '0..6'), var('k1', 'eval:k+1'), var('k2', 'eval:k+2'), var('a', '-10..30'),
             var('r', '-9..9')],
            '{{eval:a+r}}',
            [M1_SUITE,
             '$u_{{k1}}=\\dfrac{u_{{k}}+u_{{k2}}}{2}=\\dfrac{ {{a}}{{eval:a+2*r;+}} }{2}='
             + col('{{eval:a+r}}') + '$.'],
            conditions=['r != 0'],
        ),
        variation(
            'Une commune comptait ${{a}}$ habitants en 2022 et ${{eval:a+2*r}}$ habitants en 2024.'
            ' On suppose que la population a varié du même nombre d\'habitants chaque année.\n\n'
            'Combien la commune comptait-elle d\'habitants en 2023 ?\n\n$?$ habitants',
            [var('a', '1500..4800'), var('r', '-90..150')],
            '{{eval:a+r}}',
            ['La population varie du même nombre chaque année : elle suit une suite arithmétique.'
             ' ' + M1_SUITE,
             '$\\dfrac{ {{a}}+{{eval:a+2*r}} }{2}=' + col('{{eval:a+r}}') + '$ habitants en'
             ' 2023.'],
            conditions=['r*r >= 100'],
        ),
    ],
    [
        spec('7 et 12 : 9,5', 0, {'a': '7', 'b': '12'}, '9,5', 'correct'),
        spec('7 et 12 : 19/2 → forme (décimal attendu)', 0, {'a': '7', 'b': '12'}, '\\frac{19}{2}',
             'bad_form', ['form']),
        spec('Erreur : somme (19)', 0, {'a': '7', 'b': '12'}, '19', 'incorrect'),
        spec('Erreur : demi-écart (2,5)', 0, {'a': '7', 'b': '12'}, '2,5', 'incorrect'),
        spec('−8 et 14 : 3', 0, {'a': '-8', 'b': '14'}, '3', 'correct'),
        spec('Erreur : signe perdu (11)', 0, {'a': '-8', 'b': '14'}, '11', 'incorrect'),
        spec('u₂ = 5, u₄ = 17 : u₃ = 11', 1, {'k': '2', 'k1': '3', 'k2': '4', 'a': '5', 'r': '6'},
             '11', 'correct'),
        spec('Erreur : raison prise pour l\'écart (12)', 1,
             {'k': '2', 'k1': '3', 'k2': '4', 'a': '5', 'r': '6'}, '12', 'incorrect'),
        spec('Erreur : 5 + 12 (17)', 1, {'k': '2', 'k1': '3', 'k2': '4', 'a': '5', 'r': '6'},
             '17', 'incorrect'),
        spec('2 000 → 2 240 : 2 120', 2, {'a': '2000', 'r': '120'}, '2120', 'correct'),
        spec('Erreur : 2 000 + 240', 2, {'a': '2000', 'r': '120'}, '2240', 'incorrect'),
        spec('3 000 → 2 860 : 2 930', 2, {'a': '3000', 'r': '-70'}, '2930', 'correct'),
    ],
    shared=DECIMAL,
)

# --- M2, TTECHNO-018 : moyenne géométrique de deux nombres positifs --------------------------

M2_DEF = ('La moyenne géométrique de deux nombres positifs $a$ et $b$ est $\\sqrt{ab}$.')
M2_SUITE = ('Dans une suite géométrique à termes positifs, chaque terme est la moyenne'
            ' géométrique du terme qui le précède et du terme qui le suit.')

M2 = modele(
    'Moyenne géométrique de deux nombres positifs',
    'Calculer la moyenne géométrique de deux nombres positifs, retrouver un terme d\'une suite'
    ' géométrique entre deux autres',
    2, 45,
    [
        variation(
            'Calcule la moyenne géométrique de ${{eval:k*m^2}}$ et ${{eval:k*n^2}}$.\n\n$?$',
            [var('k', '1|2|3|5'), var('m', '1..4'), var('n', '2..6')],
            '{{eval:k*m*n}}',
            [M2_DEF,
             '$\\sqrt{ {{eval:k*m^2}}\\times{{eval:k*n^2}} }=\\sqrt{ {{eval:k^2*m^2*n^2}} }='
             + col('{{eval:k*m*n}}') + '$.'],
            conditions=['m < n'],
        ),
        variation(
            'Calcule la moyenne géométrique de ${{a}}$ et ${{b}}$, arrondie au dixième.\n\n'
            '$?$',
            [var('a', '2..30'), var('b', '2..30')],
            '{{eval:round(10*sqrt(a*b))/10;d}}',
            [M2_DEF,
             '$\\sqrt{ {{a}}\\times{{b}} }=\\sqrt{ {{eval:a*b}} }\\approx'
             + col('{{eval:round(10*sqrt(a*b))/10;d}}') + '$.'],
            conditions=['a < b', 'round(sqrt(a*b))^2 != a*b'],
            precision=1,
        ),
        variation(
            '$(u_n)$ est une suite géométrique à termes positifs telle que'
            ' $u_{{k}}={{eval:a*q^(2*s)}}$ et $u_{{k2}}={{eval:a*q^(2-2*s)}}$.\n\n'
            'Calcule $u_{{k1}}$.\n\n$u_{{k1}}=?$',
            [var('k', '0..6'), var('k1', 'eval:k+1'), var('k2', 'eval:k+2'), var('a', '1..9'),
             var('q', '2..5'), var('s', '0|1')],
            '{{eval:a*q}}',
            [M2_SUITE,
             '$u_{{k1}}=\\sqrt{u_{{k}}\\times u_{{k2}}}=\\sqrt{ {{eval:a*q^(2*s)}}\\times'
             '{{eval:a*q^(2-2*s)}} }=\\sqrt{ {{eval:a^2*q^2}} }=' + col('{{eval:a*q}}') + '$.'],
            conditions=['a*q^2 <= 400'],
        ),
    ],
    [
        spec('4 et 9 : 6', 0, {'k': '1', 'm': '2', 'n': '3'}, '6', 'correct'),
        spec('Erreur : moyenne arithmétique (6,5)', 0, {'k': '1', 'm': '2', 'n': '3'}, '6,5',
             'incorrect'),
        spec('Erreur : produit (36)', 0, {'k': '1', 'm': '2', 'n': '3'}, '36', 'incorrect'),
        spec('8 et 18 : 12', 0, {'k': '2', 'm': '2', 'n': '3'}, '12', 'correct'),
        spec('3 et 7 : 4,6', 1, {'a': '3', 'b': '7'}, '4,6', 'correct'),
        spec('Erreur : moyenne arithmétique (5)', 1, {'a': '3', 'b': '7'}, '5', 'incorrect'),
        spec('Erreur : √3 + √7 (4,4)', 1, {'a': '3', 'b': '7'}, '4,4', 'incorrect'),
        spec('u₁ = 3, u₃ = 48 : u₂ = 12', 2,
             {'k': '1', 'k1': '2', 'k2': '3', 'a': '3', 'q': '4', 's': '0'}, '12', 'correct'),
        spec('Erreur : moyenne arithmétique (25,5)', 2,
             {'k': '1', 'k1': '2', 'k2': '3', 'a': '3', 'q': '4', 's': '0'}, '25,5', 'incorrect'),
        spec('Erreur : raison (4)', 2,
             {'k': '1', 'k1': '2', 'k2': '3', 'a': '3', 'q': '4', 's': '0'}, '4', 'incorrect'),
        spec('décroissante : u₀ = 50, u₂ = 2 : u₁ = 10', 2,
             {'k': '0', 'k1': '1', 'k2': '2', 'a': '2', 'q': '5', 's': '1'}, '10', 'correct'),
    ],
    shared=DECIMAL,
)

# --- M3, TTECHNO-020 : trois nombres consécutifs d'une suite arithmétique ? --------------------

M3_REGLE = ('Trois nombres $a$, $b$, $c$ sont, dans cet ordre, des termes consécutifs d\'une'
            ' suite arithmétique si et seulement si $b-a=c-b$ (on ajoute toujours le même'
            ' nombre).')
M3_CHOIX = choix('oui, car $b-a=c-b$', 'non, car $b-a\\neq c-b$',
                 'oui, car $a$, $b$ et $c$ sont rangés dans l\'ordre croissant')
M3_CHOIX_LOYER = choix('oui, car la hausse est la même chaque année',
                       'non, car la hausse n\'est pas la même chaque année',
                       'oui, car le loyer augmente chaque année')

M3 = modele(
    'Trois nombres consécutifs d\'une suite arithmétique ?',
    'Prouver que trois nombres sont, ou ne sont pas, des termes consécutifs d\'une suite'
    ' arithmétique, en comparant les écarts',
    2, 45,
    [
        variation(
            'On considère les nombres $a={{x}}$, $b={{eval:x+r}}$ et $c={{eval:x+2*r+s*d}}$.\n\n'
            'Sont-ils, dans cet ordre, trois termes consécutifs d\'une suite arithmétique ?'
            + M3_CHOIX,
            [var('x', '-10..30'), var('r', '2..12'), var('s', '0|1'), var('d', '1..4')],
            '{{s}}',
            [M3_REGLE,
             '$b-a={{r}}$ et $c-b={{eval:r+s*d}}$.',
             '{{if:s==0|Les deux écarts sont égaux : **oui**, ce sont trois termes consécutifs'
             ' d\'une suite arithmétique de raison ${{r}}$.|Les deux écarts sont différents :'
             ' **non**. (Être rangés dans l\'ordre croissant ne suffit pas.)}}'],
        ),
        variation(
            'Le loyer mensuel d\'un local commercial était de ${{x}}~\\unit{€}$ en 2023, de'
            ' ${{eval:x+r}}~\\unit{€}$ en 2024 et de ${{eval:x+2*r+s*d}}~\\unit{€}$ en 2025.\n\n'
            'Ces trois loyers sont-ils trois termes consécutifs d\'une suite arithmétique ?'
            + M3_CHOIX_LOYER,
            [var('x', '600..900'), var('r', '15..40'), var('s', '0|1'), var('d', '2..9')],
            '{{s}}',
            [M3_REGLE,
             'Hausse de 2023 à 2024 : ${{eval:x+r}}-{{x}}={{r}}$ ; hausse de 2024 à 2025 :'
             ' ${{eval:x+2*r+s*d}}-{{eval:x+r}}={{eval:r+s*d}}$.',
             '{{if:s==0|Les deux hausses sont égales : **oui**, la suite des loyers est'
             ' arithmétique de raison ${{r}}$.|Les deux hausses sont différentes : **non**.'
             ' (Un loyer qui augmente chaque année ne suffit pas.)}}'],
        ),
    ],
    specs_choix(0, [({'x': '4', 'r': '5', 's': '0', 'd': '1'}, 0),
                    ({'x': '4', 'r': '5', 's': '1', 'd': '2'}, 1)], 3)
    + specs_choix(1, [({'x': '700', 'r': '20', 's': '0', 'd': '5'}, 0),
                      ({'x': '700', 'r': '20', 's': '1', 'd': '5'}, 1)], 3),
)

# --- M4, TTECHNO-021 : trois nombres consécutifs d'une suite géométrique ? ---------------------

M4_REGLE = ('Trois nombres strictement positifs $a$, $b$, $c$ sont, dans cet ordre, des termes'
            ' consécutifs d\'une suite géométrique si et seulement si'
            ' $\\dfrac{b}{a}=\\dfrac{c}{b}$ (on multiplie toujours par le même nombre).')
M4_CHOIX = choix('oui, car $\\dfrac{b}{a}=\\dfrac{c}{b}$', 'non, car $\\dfrac{b}{a}\\neq\\dfrac{c}{b}$',
                 'oui, car $b-a=c-b$')
M4_CHOIX_PRIX = choix('oui, car le prix est multiplié par le même nombre chaque année',
                      'non, car le prix n\'est pas multiplié par le même nombre chaque année',
                      'oui, car le prix augmente chaque année')

M4 = modele(
    'Trois nombres consécutifs d\'une suite géométrique ?',
    'Prouver que trois nombres positifs sont, ou ne sont pas, des termes consécutifs d\'une suite'
    ' géométrique, en comparant les quotients',
    2, 45,
    [
        # s = 1 : c ajouté de d, ni géométrique ni arithmétique (condition).
        variation(
            'On considère les nombres $a={{x}}$, $b={{eval:x*q}}$ et $c={{eval:x*q^2+s*d}}$.\n\n'
            'Sont-ils, dans cet ordre, trois termes consécutifs d\'une suite géométrique ?'
            + M4_CHOIX,
            [var('x', '2..9'), var('q', '2..4'), var('s', '0|1'), var('d', '1..5')],
            '{{s}}',
            [M4_REGLE,
             '$\\dfrac{b}{a}=\\dfrac{ {{eval:x*q}} }{ {{x}} }={{q}}$ et'
             ' $\\dfrac{c}{b}=\\dfrac{ {{eval:x*q^2+s*d}} }{ {{eval:x*q}} }'
             '{{if:s==0|={{q}}|\\neq{{q}}}}$.',
             '{{if:s==0|Les deux quotients sont égaux : **oui**, ce sont trois termes consécutifs'
             ' d\'une suite géométrique de raison ${{q}}$.|Les deux quotients sont différents :'
             ' **non**.}}'],
            # c = xq² + d ne peut pas être arithmétique : il faudrait d = −x(q − 1)² < 0.
        ),
        # Le piège : s = 1 donne trois nombres en progression ARITHMÉTIQUE.
        variation(
            'On considère les nombres $a={{x}}$, $b={{eval:x*q}}$ et'
            ' $c={{eval:(1-s)*x*q^2+s*(2*x*q-x)}}$.\n\n'
            'Sont-ils, dans cet ordre, trois termes consécutifs d\'une suite géométrique ?'
            + M4_CHOIX,
            [var('x', '2..9'), var('q', '2..3'), var('s', '0|1')],
            '{{s}}',
            [M4_REGLE,
             '$\\dfrac{b}{a}=\\dfrac{ {{eval:x*q}} }{ {{x}} }={{q}}$ et'
             ' $\\dfrac{c}{b}=\\dfrac{ {{eval:(1-s)*x*q^2+s*(2*x*q-x)}} }{ {{eval:x*q}} }'
             '{{if:s==0|={{q}}|={{eval:(2*q-1)/q}}\\neq{{q}}}}$.',
             '{{if:s==0|Les deux quotients sont égaux : **oui**, suite géométrique de raison'
             ' ${{q}}$.|Les deux quotients sont différents : **non**. Ici $b-a=c-b$ : ce sont'
             ' trois termes consécutifs d\'une suite **arithmétique**, pas géométrique.}}'],
        ),
        variation(
            'Le prix d\'un abonnement était de ${{p}}~\\unit{€}$ en 2023, de'
            ' ${{eval:p*(1+t/100);d}}~\\unit{€}$ en 2024 et de'
            ' ${{eval:(1-s)*p*(1+t/100)^2+s*p*(1+2*t/100);d}}~\\unit{€}$ en 2025.\n\n'
            'Ces trois prix sont-ils trois termes consécutifs d\'une suite géométrique ?'
            + M4_CHOIX_PRIX,
            [var('p', '100|200|400|500'), var('t', '5|10|20'), var('s', '0|1')],
            '{{s}}',
            [M4_REGLE,
             '$\\dfrac{ {{eval:p*(1+t/100);d}} }{ {{p}} }={{eval:1+t/100;d}}$ et'
             ' $\\dfrac{ {{eval:(1-s)*p*(1+t/100)^2+s*p*(1+2*t/100);d}} }'
             '{ {{eval:p*(1+t/100);d}} }'
             '{{if:s==0|={{eval:1+t/100;d}}|\\approx{{eval:round(1000*(1+2*t/100)/(1+t/100))/1000;d}}}}$.',
             '{{if:s==0|Le prix est multiplié par ${{eval:1+t/100;d}}$ chaque année : **oui**,'
             ' suite géométrique de raison ${{eval:1+t/100;d}}$.|Les deux quotients sont'
             ' différents : **non**. Le prix augmente de ${{eval:p*t/100;d}}~\\unit{€}$ chaque'
             ' année : c\'est une suite **arithmétique**.}}'],
        ),
    ],
    specs_choix(0, [({'x': '3', 'q': '2', 's': '0', 'd': '1'}, 0),
                    ({'x': '3', 'q': '2', 's': '1', 'd': '1'}, 1)], 3)
    + specs_choix(1, [({'x': '4', 'q': '2', 's': '0'}, 0),
                      ({'x': '4', 'q': '2', 's': '1'}, 1)], 3)
    + specs_choix(2, [({'p': '200', 't': '10', 's': '0'}, 0),
                      ({'p': '200', 't': '10', 's': '1'}, 1)], 3),
)

# --- M5, TTECHNO-022 : raison d'une suite arithmétique modélisant une évolution --------------

M5_REGLE = ('Une grandeur qui augmente (ou diminue) chaque fois **du même nombre** est modélisée'
            ' par une suite arithmétique ; ce nombre est la raison (négatif pour une baisse).')

M5 = modele(
    'Raison d\'une suite arithmétique modélisant une évolution',
    'Lire la raison dans une situation d\'évolution absolue constante, ou la calculer à partir'
    ' de relevés',
    1, 45,
    [
        variation(
            'Un club de randonnée compte ${{a}}$ adhérents en 2024 et gagne ${{r}}$ adhérents'
            ' chaque année. On note $u_n$ le nombre d\'adhérents en $2024+n$ : la suite $(u_n)$'
            ' est arithmétique.\n\nQuelle est sa raison ?\n\n$r=?$',
            [var('a', '80..300'), var('r', '4..25')],
            '{{r}}',
            [M5_REGLE, 'Chaque année, on ajoute ${{r}}$ adhérents : $r=' + col('{{r}}') + '$.'],
        ),
        variation(
            'Le stock d\'un entrepôt est de ${{a}}$ cartons le 1er janvier ; il diminue de'
            ' ${{r}}$ cartons chaque mois. On note $u_n$ le stock au bout de $n$ mois : la suite'
            ' $(u_n)$ est arithmétique.\n\nQuelle est sa raison ?\n\n$r=?$',
            [var('a', '900..2500'), var('r', '30..120')],
            '{{eval:-r}}',
            [M5_REGLE,
             'Chaque mois, on retire ${{r}}$ cartons : $r=' + col('{{eval:-r}}') + '$ (une baisse'
             ' donne une raison négative).'],
        ),
        variation(
            'Le tableau donne la production d\'une ferme solaire, en mégawattheures.\n\n'
            '| Année | 2021 | 2022 | 2023 | 2024 |\n| --- | --- | --- | --- | --- |\n'
            '| Production | ${{a}}$ | ${{eval:a+r}}$ | ${{eval:a+2*r}}$ | ${{eval:a+3*r}}$ |\n\n'
            'La production est modélisée par une suite arithmétique. Quelle est sa raison ?\n\n'
            '$r=?$',
            [var('a', '400..900'), var('r', '-40..60')],
            '{{r}}',
            [M5_REGLE,
             'D\'une année à la suivante : ${{eval:a+r}}-{{a}}={{r}}$, et de même pour les autres'
             ' années. La raison est $r=' + col('{{r}}') + '$.'],
            conditions=['r*r >= 25'],
        ),
        variation(
            'Une commune comptait ${{a}}$ habitants en 2018 et ${{eval:a+n*r}}$ habitants en'
            ' ${{eval:2018+n}}$. On suppose que la population a varié du même nombre d\'habitants'
            ' chaque année : elle est modélisée par une suite arithmétique.\n\nQuelle est sa'
            ' raison ?\n\n$r=?$',
            [var('a', '1500..5000'), var('n', '4..8'), var('r', '-60..80')],
            '{{r}}',
            [M5_REGLE,
             'De 2018 à ${{eval:2018+n}}$, il y a ${{n}}$ années : la population a varié de'
             ' ${{n}}$ fois la raison.',
             '$r=\\dfrac{ {{eval:a+n*r}}-{{a}} }{ {{n}} }=\\dfrac{ {{eval:n*r}} }{ {{n}} }='
             + col('{{r}}') + '$.'],
            conditions=['r*r >= 100'],
        ),
    ],
    [
        spec('gagne 12 : 12', 0, {'a': '150', 'r': '12'}, '12', 'correct'),
        spec('Erreur : premier terme (150)', 0, {'a': '150', 'r': '12'}, '150', 'incorrect'),
        spec('diminue de 50 : −50', 1, {'a': '1200', 'r': '50'}, '-50', 'correct'),
        spec('Erreur : signe perdu (50)', 1, {'a': '1200', 'r': '50'}, '50', 'incorrect'),
        spec('tableau +35 : 35', 2, {'a': '500', 'r': '35'}, '35', 'correct'),
        spec('tableau −20 : −20', 2, {'a': '500', 'r': '-20'}, '-20', 'correct'),
        spec('Erreur : signe perdu (20)', 2, {'a': '500', 'r': '-20'}, '20', 'incorrect'),
        spec('Erreur : écart sur trois ans (−60)', 2, {'a': '500', 'r': '-20'}, '-60', 'incorrect'),
        spec('2018 → 2024, +360 : 60', 3, {'a': '2000', 'n': '6', 'r': '60'}, '60', 'correct'),
        spec('Erreur : non divisé (360)', 3, {'a': '2000', 'n': '6', 'r': '60'}, '360',
             'incorrect'),
        spec('Erreur : divisé par 7 (51,4)', 3, {'a': '2000', 'n': '6', 'r': '60'}, '51,4',
             'incorrect'),
    ],
)

# --- M6, TTECHNO-028 : somme arithmétique en situation ---------------------------------------

M6_FORMULE = ('La somme de termes consécutifs d\'une suite arithmétique vaut'
              ' $\\text{nombre de termes}\\times\\dfrac{\\text{premier terme}+\\text{dernier'
              ' terme}}{2}$.')
M6_CHOIX = choix('le terme $u_{ {{n}} }$', 'la somme $u_1+u_2+\\cdots+u_{ {{n}} }$',
                 'la somme $u_1+u_2+\\cdots+u_{ {{eval:n-1}} }$')

M6 = modele(
    'Somme arithmétique en situation',
    'Reconnaître qu\'un total relève d\'une somme de termes consécutifs d\'une suite arithmétique,'
    ' puis la calculer',
    3, 90,
    [
        variation(
            'Une entreprise fabrique ${{p}}$ vélos la première année, puis chaque année ${{r}}$'
            ' vélos de plus que l\'année précédente.\n\nCombien de vélos aura-t-elle fabriqués en'
            ' tout au bout de ${{n}}$ années ?\n\n$?$ vélos',
            [var('p', '200..500'), var('r', '10..40'), var('n', '5..12')],
            '{{eval:n*(2*p+(n-1)*r)/2}}',
            ['La production de l\'année $k$ est $u_k$ : suite arithmétique de premier terme'
             ' $u_1={{p}}$ et de raison ${{r}}$, donc $u_{ {{n}} }={{p}}+{{eval:n-1}}\\times{{r}}='
             '{{eval:p+(n-1)*r}}$.',
             'Le total est la somme $u_1+u_2+\\cdots+u_{ {{n}} }$ de ${{n}}$ termes. ' + M6_FORMULE,
             '$S={{n}}\\times\\dfrac{ {{p}}+{{eval:p+(n-1)*r}} }{2}='
             + col('{{eval:n*(2*p+(n-1)*r)/2}}') + '$ vélos.'],
        ),
        variation(
            'Léa épargne : elle met ${{p}}~\\unit{€}$ de côté le premier mois, puis chaque mois'
            ' ${{r}}~\\unit{€}$ de plus que le mois précédent.\n\nQuelle somme aura-t-elle mise de'
            ' côté en tout au bout de ${{n}}$ mois ?\n\n$?~\\unit{€}$',
            [var('p', '10..50'), var('r', '2..10'), var('n', '6|10|12|18|24')],
            '{{eval:n*(2*p+(n-1)*r)/2}}',
            ['Le versement du mois $k$ est $u_k$ : suite arithmétique de premier terme'
             ' $u_1={{p}}$ et de raison ${{r}}$, donc $u_{ {{n}} }={{p}}+{{eval:n-1}}\\times{{r}}='
             '{{eval:p+(n-1)*r}}$.',
             'Le total est la somme $u_1+u_2+\\cdots+u_{ {{n}} }$ de ${{n}}$ termes. ' + M6_FORMULE,
             '$S={{n}}\\times\\dfrac{ {{p}}+{{eval:p+(n-1)*r}} }{2}='
             + col('{{eval:n*(2*p+(n-1)*r)/2}}') + '~\\unit{€}$.'],
        ),
        variation(
            'Un théâtre a vendu ${{p}}$ abonnements la première saison, puis chaque saison'
            ' ${{r}}$ abonnements de plus que la précédente. On note $u_k$ le nombre d\'abonnements'
            ' vendus la saison $k$ (donc $u_1={{p}}$).\n\n'
            '{{if:w==0|Combien d\'abonnements le théâtre vendra-t-il **pendant la saison**'
            ' ${{n}}$ ?|Combien d\'abonnements le théâtre aura-t-il vendus **en tout pendant les'
            ' ${{n}}$ premières saisons** ?}}\n\nPour répondre, on calcule…' + M6_CHOIX,
            [var('p', '120..300'), var('r', '5..20'), var('n', '6..12'), var('w', '0|1')],
            '{{w}}',
            ['$(u_k)$ est arithmétique de premier terme $u_1={{p}}$ et de raison ${{r}}$.',
             '{{if:w==0|On demande la vente d\'**une seule** saison, la ${{n}}^{\\text{e}}$ : c\'est le'
             ' terme $u_{ {{n}} }$.|On demande un **total** sur les saisons $1$ à ${{n}}$ : c\'est'
             ' la somme $u_1+u_2+\\cdots+u_{ {{n}} }$, qui compte ${{n}}$ termes.}}'],
        ),
    ],
    [
        spec('300 vélos, +20, 10 ans : 3 900', 0, {'p': '300', 'r': '20', 'n': '10'}, '3900',
             'correct'),
        spec('Erreur : dernier terme seul (480)', 0, {'p': '300', 'r': '20', 'n': '10'}, '480',
             'incorrect'),
        spec('Erreur : 11 termes (4 400)', 0, {'p': '300', 'r': '20', 'n': '10'}, '4400',
             'incorrect'),
        spec('Erreur : sans la hausse (3 000)', 0, {'p': '300', 'r': '20', 'n': '10'}, '3000',
             'incorrect'),
        spec('20 €, +5, 12 mois : 570', 1, {'p': '20', 'r': '5', 'n': '12'}, '570', 'correct'),
        spec('Erreur : dernier versement (75)', 1, {'p': '20', 'r': '5', 'n': '12'}, '75',
             'incorrect'),
        spec('Erreur : 12 × 20 + 12 × 5 (300)', 1, {'p': '20', 'r': '5', 'n': '12'}, '300',
             'incorrect'),
    ] + specs_choix(2, [({'p': '200', 'r': '10', 'n': '8', 'w': '0'}, 0),
                        ({'p': '200', 'r': '10', 'n': '8', 'w': '1'}, 1)], 3),
)

# --- M7, TTECHNO-029 : somme géométrique en situation ----------------------------------------

M7_FORMULE = ('Pour $q\\neq1$ : $1+q+q^2+\\cdots+q^{n-1}=\\dfrac{1-q^n}{1-q}$, donc la somme de'
              ' $n$ termes consécutifs d\'une suite géométrique de premier terme $u$ et de raison $q$'
              ' vaut $u\\times\\dfrac{1-q^n}{1-q}$.')
M7_CHOIX = choix('le terme $u_{ {{n}} }$', 'la somme $u_1+u_2+\\cdots+u_{ {{n}} }$',
                 'le produit $u_1\\times u_2\\times\\cdots\\times u_{ {{n}} }$')

M7 = modele(
    'Somme géométrique en situation',
    'Reconnaître qu\'un total relève d\'une somme de termes consécutifs d\'une suite géométrique'
    ' (versements réguliers à intérêts composés, production en baisse), puis la calculer',
    3, 120,
    [
        variation(
            'Chaque 1er janvier, Hugo verse ${{v}}~\\unit{€}$ sur un compte rémunéré à ${{t}}~\\%$'
            ' par an, à intérêts composés. Il fait son premier versement le 1er janvier 2025.\n\n'
            'Quelle somme y a-t-il sur le compte juste après son ${{n}}^{\\text{e}}$ versement ?'
            ' Arrondis à l\'euro.\n\n$?~\\unit{€}$',
            [var('v', '500|1000|1200|1500|2000'), var('t', '1|2|3|4|5'), var('n', '5..10')],
            '{{eval:round(v*((1+t/100)^n-1)/(t/100))}}',
            ['Un versement placé depuis $k$ années vaut ${{v}}\\times{{eval:1+t/100;d}}^k$ (il est'
             ' multiplié par ${{eval:1+t/100;d}}$ chaque année).',
             'Juste après le ${{n}}^{\\text{e}}$ versement, le compte contient'
             ' ${{v}}+{{v}}\\times{{eval:1+t/100;d}}+\\cdots+{{v}}\\times{{eval:1+t/100;d}}^{ {{eval:n-1}} }$ :'
             ' la somme de ${{n}}$ termes d\'une suite géométrique de premier terme ${{v}}$ et de'
             ' raison ${{eval:1+t/100;d}}$.',
             M7_FORMULE,
             '$S={{v}}\\times\\dfrac{1-{{eval:1+t/100;d}}^{ {{n}} }}{1-{{eval:1+t/100;d}}}\\approx'
             + col('{{eval:round(v*((1+t/100)^n-1)/(t/100))}}') + '~\\unit{€}$.'],
            precision=0,
        ),
        variation(
            'Une carrière extrait ${{p}}$ tonnes de pierre la première année, puis chaque année'
            ' ${{t}}~\\%$ de moins que l\'année précédente.\n\nQuelle quantité de pierre aura-t-elle'
            ' extraite en tout au bout de ${{n}}$ années ? Arrondis à la tonne.\n\n$?$ tonnes',
            [var('p', '2000|3000|4000|5000'), var('t', '5|10|15|20'), var('n', '5..10')],
            '{{eval:round(p*(1-(1-t/100)^n)/(t/100))}}',
            ['L\'extraction de l\'année $k$ est $u_k$ : suite géométrique de premier terme'
             ' $u_1={{p}}$ et de raison $1-\\dfrac{ {{t}} }{100}={{eval:1-t/100;d}}$.',
             'Le total est la somme $u_1+u_2+\\cdots+u_{ {{n}} }$ de ${{n}}$ termes. ' + M7_FORMULE,
             '$S={{p}}\\times\\dfrac{1-{{eval:1-t/100;d}}^{ {{n}} }}{1-{{eval:1-t/100;d}}}\\approx'
             + col('{{eval:round(p*(1-(1-t/100)^n)/(t/100))}}') + '$ tonnes.'],
            precision=0,
        ),
        variation(
            'Une boulangerie a vendu ${{p}}$ galettes la première année, puis chaque année'
            ' ${{t}}~\\%$ de plus que l\'année précédente. On note $u_k$ le nombre de galettes'
            ' vendues l\'année $k$ (donc $u_1={{p}}$).\n\n'
            '{{if:w==0|Combien de galettes la boulangerie vendra-t-elle **pendant l\'année**'
            ' ${{n}}$ ?|Combien de galettes la boulangerie aura-t-elle vendues **en tout pendant'
            ' les ${{n}}$ premières années** ?}}\n\nPour répondre, on calcule…' + M7_CHOIX,
            [var('p', '400..900'), var('t', '2|4|5|8|10'), var('n', '5..10'), var('w', '0|1')],
            '{{w}}',
            ['$(u_k)$ est géométrique de premier terme $u_1={{p}}$ et de raison'
             ' ${{eval:1+t/100;d}}$.',
             '{{if:w==0|On demande la vente d\'**une seule** année, la ${{n}}^{\\text{e}}$ : c\'est le'
             ' terme $u_{ {{n}} }$.|On demande un **total** sur les années $1$ à ${{n}}$ : c\'est'
             ' la somme $u_1+u_2+\\cdots+u_{ {{n}} }$, qui compte ${{n}}$ termes.}}'],
        ),
    ],
    [
        spec('1 000 €, 2 %, 5 versements : 5 204', 0, {'v': '1000', 't': '2', 'n': '5'}, '5204',
             'correct'),
        spec('Erreur : sans intérêts (5 000)', 0, {'v': '1000', 't': '2', 'n': '5'}, '5000',
             'incorrect'),
        spec('Erreur : dernier versement placé 5 ans (1 104)', 0,
             {'v': '1000', 't': '2', 'n': '5'}, '1104', 'incorrect'),
        spec('Erreur : 6 termes (6 308)', 0, {'v': '1000', 't': '2', 'n': '5'}, '6308',
             'incorrect'),
        spec('4 000 t, −10 %, 5 ans : 16 380', 1, {'p': '4000', 't': '10', 'n': '5'}, '16\\,380',
             'correct'),
        spec('16380 sans espace : forme à améliorer', 1, {'p': '4000', 't': '10', 'n': '5'},
             '16380', 'unoptimal_form', ['spaces']),
        spec('Erreur : sans la baisse (20 000)', 1, {'p': '4000', 't': '10', 'n': '5'}, '20\\,000',
             'incorrect'),
        spec('Erreur : dernier terme (2 624)', 1, {'p': '4000', 't': '10', 'n': '5'}, '2624',
             'incorrect'),
    ] + specs_choix(2, [({'p': '500', 't': '5', 'n': '6', 'w': '0'}, 0),
                        ({'p': '500', 't': '5', 'n': '6', 'w': '1'}, 1)], 3),
)

# --- M8, TTECHNO-074 : notation Σ -------------------------------------------------------------

M8_LECTURE = ('$\\displaystyle\\sum_{k=p}^{m}f(k)$ se lit « somme des $f(k)$ pour $k$ allant de'
              ' $p$ à $m$ » : on remplace $k$ par chaque entier de $p$ à $m$ et on additionne.')
M8_CHOIX = choix('$\\displaystyle\\sum_{k=1}^{ {{n}} }\\dfrac{1}{k}$',
                 '$\\displaystyle\\sum_{k=1}^{ {{n}} }k$',
                 '$\\displaystyle\\sum_{k=0}^{ {{n}} }\\dfrac{1}{k}$',
                 '$\\displaystyle\\sum_{k=1}^{ {{eval:n-1}} }\\dfrac{1}{k}$')
M8_CHOIX_CARRES = choix('$\\displaystyle\\sum_{k=1}^{ {{n}} }k^2$',
                        '$\\displaystyle\\sum_{k=1}^{ {{n}} }2k$',
                        '$\\displaystyle\\sum_{k=1}^{ {{eval:n^2}} }k$',
                        '$\\displaystyle\\left(\\sum_{k=1}^{ {{n}} }k\\right)^2$')

M8 = modele(
    'Notation Σ',
    'Lire et calculer une somme écrite avec Σ (carrés, cubes, inverses), compter ses termes,'
    ' écrire une somme avec Σ',
    2, 60,
    [
        variation(
            'Calcule $S=\\displaystyle\\sum_{k=1}^{ {{n}} }k^{ {{a}} }$.\n\n$S=?$',
            [var('n', '3..5'), var('a', '2|3')],
            '{{eval:{{if:a==2|n*(n+1)*(2*n+1)/6|(n*(n+1)/2)^2}}}}',
            [M8_LECTURE,
             '$S=1^{ {{a}} }+2^{ {{a}} }+3^{ {{a}} }{{if:n==3||+4^{ {{a}} }}}{{if:n==5|+5^{ {{a}} }|}}='
             + col('{{eval:{{if:a==2|n*(n+1)*(2*n+1)/6|(n*(n+1)/2)^2}}}}') + '$.'],
        ),
        variation(
            'Calcule $S=\\displaystyle\\sum_{k=1}^{ {{n}} }\\dfrac{1}{k}$. Donne la valeur exacte.'
            '\n\n$S=?$',
            [var('n', '2|3|4')],
            '{{eval:{{if:n==2|3/2|{{if:n==3|11/6|25/12}}}}}}',
            [M8_LECTURE,
             '$S={{if:n==2|1+\\dfrac{1}{2}|{{if:n==3|1+\\dfrac{1}{2}+\\dfrac{1}{3}|1+\\dfrac{1}{2}+\\dfrac{1}{3}+\\dfrac{1}{4}}}}}='
             + col('{{eval:{{if:n==2|3/2|{{if:n==3|11/6|25/12}}}}}}') + '$.'],
        ),
        variation(
            'Combien de termes la somme $\\displaystyle\\sum_{k={{p}}}^{ {{m}} }(k^2+1)$'
            ' compte-t-elle ?\n\n$?$ termes',
            [var('p', '0..5'), var('m', '9..30')],
            '{{eval:m-p+1}}',
            [M8_LECTURE,
             '$k$ prend toutes les valeurs entières de ${{p}}$ à ${{m}}$ : il y en a'
             ' ${{m}}-{{p}}+1=' + col('{{eval:m-p+1}}') + '$.'],
        ),
        variation(
            'Quelle écriture est égale à'
            ' $1+\\dfrac{1}{2}+\\dfrac{1}{3}+\\cdots+\\dfrac{1}{ {{n}} }$ ?' + M8_CHOIX,
            [var('n', '6..20')],
            '0',
            [M8_LECTURE,
             'Les termes sont les inverses $\\dfrac{1}{k}$ des entiers $k$ de $1$ à ${{n}}$ :'
             ' $' + col('\\displaystyle\\sum_{k=1}^{ {{n}} }\\dfrac{1}{k}') + '$. (Pour $k=0$,'
             ' $\\dfrac{1}{0}$ n\'existe pas.)'],
        ),
        variation(
            'Quelle écriture est égale à $1^2+2^2+3^2+\\cdots+{{n}}^2$ ?' + M8_CHOIX_CARRES,
            [var('n', '6..20')],
            '0',
            [M8_LECTURE,
             'Les termes sont les carrés $k^2$ des entiers $k$ de $1$ à ${{n}}$ :'
             ' $' + col('\\displaystyle\\sum_{k=1}^{ {{n}} }k^2') + '$.'],
        ),
    ],
    [
        spec('Σ k², n = 4 : 30', 0, {'n': '4', 'a': '2'}, '30', 'correct'),
        spec('Erreur : (1+2+3+4)² (100)', 0, {'n': '4', 'a': '2'}, '100', 'incorrect'),
        spec('Erreur : sans le carré (10)', 0, {'n': '4', 'a': '2'}, '10', 'incorrect'),
        spec('Σ k³, n = 3 : 36', 0, {'n': '3', 'a': '3'}, '36', 'correct'),
        spec('Erreur : dernier terme (27)', 0, {'n': '3', 'a': '3'}, '27', 'incorrect'),
        spec('Σ 1/k, n = 3 : 11/6', 1, {'n': '3'}, '\\frac{11}{6}', 'correct'),
        spec('Erreur : 3/6', 1, {'n': '3'}, '\\frac{3}{6}', 'incorrect'),
        spec('Erreur : 1/6', 1, {'n': '3'}, '\\frac{1}{6}', 'incorrect'),
        spec('Σ 1/k, n = 4 : 25/12', 1, {'n': '4'}, '\\frac{25}{12}', 'correct'),
        spec('k de 2 à 20 : 19', 2, {'p': '2', 'm': '20'}, '19', 'correct'),
        spec('Erreur : 20 − 2 (18)', 2, {'p': '2', 'm': '20'}, '18', 'incorrect'),
        spec('Erreur : 20', 2, {'p': '2', 'm': '20'}, '20', 'incorrect'),
        spec('k de 0 à 12 : 13', 2, {'p': '0', 'm': '12'}, '13', 'correct'),
    ] + specs_choix(3, [({'n': '10'}, 0)], 4) + specs_choix(4, [({'n': '10'}, 0)], 4),
)

MODELES = [('01-moyenne-arithmetique', M1), ('02-moyenne-geometrique', M2),
           ('03-trois-nombres-arithmetique', M3), ('04-trois-nombres-geometrique', M4),
           ('05-raison-arithmetique-evolution', M5), ('06-somme-arithmetique-situation', M6),
           ('07-somme-geometrique-situation', M7), ('08-notation-sigma', M8)]

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    chemin = os.path.join(DOSSIER, nom + '.json')
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
    print('écrit', chemin)
