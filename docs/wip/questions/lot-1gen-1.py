"""Écrit les 5 modèles du lot 1 « suites géométriques à termes positifs » de la 1re générale
(enseignement scientifique, module spécifique) dans scripts/questions/1gen-1-suites-geometriques/.

Phase 0 validée par David le 2026-11-17 (Q10 à Q12, journal docs/archive/wip/questions-1gen-progress.md § 9) :

| #  | Point    | Nœud (posé par la migration)  | Niveau |
| G1 | 1GEN-028 | Suites géométriques › définition    | 1 |
| G2 | 1GEN-039 | Suites géométriques (notion)        | 1 |
| G3 | 1GEN-057 | Suites géométriques (notion)        | 2 |
| G4 | 1GEN-029 | Suites géométriques › terme général | 2 |
| G5 | 1GEN-030 | Suites géométriques (notion)        | 1 |

Borne (BO 1re ES p.6) : premier terme et raison STRICTEMENT POSITIFS ; raison ≠ 1 sauf G5 v4
(suite constante). Calque des modèles arithmétiques 1GEN en prod (1315d326, 337d31c3, 373fc5b4,
5cb7f6ce).

G1, G4, G5 sont communs avec la 1re techno (Q11) : écrits ici avec `grades` = ['1_GEN'] ; la
session questions-1techno ajoute `1_TECHNO` et ses tags (036, 038, 040 ou 049) par sa migration.

Pièges : jamais de variable `e` ni `i` ; case choix → `melanger: non`, réponse = rang de la bonne
proposition ; décimaux en réponse → `blankDefaults.acceptDecimal`.

    python3 docs/wip/questions/lot-1gen-1.py scripts/questions/1gen-1-suites-geometriques
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
    m = {'title': title, 'description': description, 'grades': ['1_GEN'], 'level': level,
         'delay': delay, 'status': 'draft', 'shared': shared or {}}
    if options:
        m['options'] = options
    m['variations'] = variations
    m['testSpecs'] = specs
    return m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, reponse, steps, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': [{'expectedAnswer': reponse}], 'correction': {'steps': steps}}


def col(x):
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


DECIMAL = {'blankDefaults': {'acceptDecimal': True}}
SENS = '\n\n```choix\nmelanger: non\n- croissante\n- décroissante\n- constante\n```'

# --- G1, 1GEN-028 : déterminer la raison ----------------------------------------------------

G1_RAPPORT = ('Pour une suite géométrique, on passe d\'un terme au suivant en multipliant par la'
              ' raison $q$ : $q=\\dfrac{u_{n+1}}{u_n}$.')

G1 = modele(
    'Déterminer la raison d\'une suite géométrique à termes positifs',
    'À partir de deux termes consécutifs ou d\'une évolution en pourcentage',
    1, 30,
    [
        variation(
            'Détermine la raison de cette suite géométrique.\n\n'
            '$u_{{k}}={{a}}$ et $u_{{k1}}={{eval:a*q;d}}$\n\nLa raison est $?$.',
            [var('k', '0..8'), var('k1', 'eval:k+1'), var('a', '2..12'), var('q', '2..5')],
            '{{q}}',
            [G1_RAPPORT,
             '$q=\\dfrac{u_{{k1}}}{u_{{k}}}=\\dfrac{{{eval:a*q;d}}}{{{a}}}=' + col('{{q}}') + '$.'],
        ),
        variation(
            'Détermine la raison de cette suite géométrique.\n\n'
            '$u_{{k}}={{a}}$ et $u_{{k1}}={{eval:a*q;d}}$\n\nLa raison est $?$.',
            [var('k', '0..8'), var('k1', 'eval:k+1'), var('m', '2..20'), var('a', 'eval:4*m'),
             var('q', '0.5|0.25|0.75')],
            '{{q}}',
            [G1_RAPPORT,
             '$q=\\dfrac{u_{{k1}}}{u_{{k}}}=\\dfrac{{{eval:a*q;d}}}{{{a}}}=' + col('{{q}}') + '$.'
             ' La raison est inférieure à $1$ : les termes diminuent.'],
        ),
        variation(
            'Le prix d\'un abonnement augmente de ${{t}}~\\%$ chaque année. On note $u_n$ le prix'
            ' de l\'abonnement l\'année $n$ : la suite $(u_n)$ est géométrique.\n\n'
            'Quelle est sa raison ?\n\n$q=?$',
            [var('t', '2|3|5|10|20')],
            '{{eval:1+t/100;d}}',
            ['Augmenter de ${{t}}~\\%$, c\'est multiplier par $1+\\dfrac{{{t}}}{100}$.',
             'D\'une année à la suivante, le prix est multiplié par $1+\\dfrac{{{t}}}{100}='
             + col('{{eval:1+t/100;d}}') + '$ : c\'est la raison.'],
        ),
        variation(
            'La valeur d\'une voiture baisse de ${{t}}~\\%$ chaque année. On note $u_n$ sa valeur'
            ' l\'année $n$ : la suite $(u_n)$ est géométrique.\n\n'
            'Quelle est sa raison ?\n\n$q=?$',
            [var('t', '5|10|20|25')],
            '{{eval:1-t/100;d}}',
            ['Baisser de ${{t}}~\\%$, c\'est multiplier par $1-\\dfrac{{{t}}}{100}$.',
             'D\'une année à la suivante, la valeur est multipliée par $1-\\dfrac{{{t}}}{100}='
             + col('{{eval:1-t/100;d}}') + '$ : c\'est la raison.'],
        ),
    ],
    [
        spec('u_3=5, u_4=15 → 3', 0, {'k': '3', 'k1': '4', 'a': '5', 'q': '3'}, '3', 'correct'),
        spec('Erreur : la différence (10)', 0, {'k': '3', 'k1': '4', 'a': '5', 'q': '3'}, '10',
             'incorrect'),
        spec('Erreur : le rapport inversé (1/3)', 0, {'k': '3', 'k1': '4', 'a': '5', 'q': '3'},
             '\\frac{1}{3}', 'incorrect'),
        spec('u_2=40, u_3=10 → 0,25', 1, {'k': '2', 'k1': '3', 'm': '10', 'a': '40', 'q': '0.25'},
             '0,25', 'correct'),
        spec('u_2=40, u_3=10 → 1/4 accepté', 1,
             {'k': '2', 'k1': '3', 'm': '10', 'a': '40', 'q': '0.25'}, '\\frac{1}{4}', 'correct'),
        spec('Erreur : le rapport inversé (4)', 1,
             {'k': '2', 'k1': '3', 'm': '10', 'a': '40', 'q': '0.25'}, '4', 'incorrect'),
        spec('Erreur : la différence (−30)', 1,
             {'k': '2', 'k1': '3', 'm': '10', 'a': '40', 'q': '0.25'}, '-30', 'incorrect'),
        spec('hausse de 5 % → 1,05', 2, {'t': '5'}, '1,05', 'correct'),
        spec('Erreur : 0,05', 2, {'t': '5'}, '0,05', 'incorrect'),
        spec('Erreur : 1 + t (6)', 2, {'t': '5'}, '6', 'incorrect'),
        spec('Erreur : t (5)', 2, {'t': '5'}, '5', 'incorrect'),
        spec('baisse de 20 % → 0,8', 3, {'t': '20'}, '0,8', 'correct'),
        spec('Erreur : 1,2 (hausse)', 3, {'t': '20'}, '1,2', 'incorrect'),
        spec('Erreur : −0,2', 3, {'t': '20'}, '-0,2', 'incorrect'),
    ],
    shared=DECIMAL,
    # 0,25 ou 1/4 : les deux écritures sont justes (sans cela, 1/4 tombe en bad_form).
    options={'constraints': {'form': 'off'}},
)

# --- G2, 1GEN-039 : terme d'une suite donnée par u_n = a × q^n -------------------------------

G2 = modele(
    'Calculer un terme d\'une suite géométrique (forme explicite)',
    'Suite définie par $u_n=a\\times q^n$',
    1, 30,
    [
        variation(
            'La suite $(u_n)$ est définie, pour tout entier naturel $n$, par'
            ' $u_n={{a}}\\times{{q}}^n$.\n\nCalcule $u_{{k}}$.\n\n$u_{{k}}=?$',
            [var('a', '1..9'), var('q', '2|3'), var('k', '2..5')],
            '{{eval:a*q^k;d}}',
            ['On remplace $n$ par ${{k}}$ : $u_{{k}}={{a}}\\times{{q}}^{{k}}$.',
             'On calcule d\'abord la puissance : ${{q}}^{{k}}={{eval:q^k}}$, puis'
             ' $u_{{k}}={{a}}\\times{{eval:q^k}}=' + col('{{eval:a*q^k;d}}') + '$.'],
        ),
        variation(
            'Un village compte ${{c}}$ habitants en 2025. On modélise sa population $n$ années'
            ' après 2025 par $u_n={{c}}\\times{{q}}^n$.\n\n'
            'Calcule $u_{ {{k}} }$, arrondi à l\'unité.\n\n$u_{ {{k}} }\\approx ?$',
            [var('c', '1000|2000|5000'), var('q', '1.02|1.03|1.05'), var('k', '5..12')],
            '{{eval:round(c*q^k)}}',
            ['On remplace $n$ par ${{k}}$ : $u_{ {{k}} }={{c}}\\times{{q}}^{ {{k}} }$.',
             'À la calculatrice, $u_{ {{k}} }\\approx' + col('{{eval:round(c*q^k)}}')
             + '$ habitants.'],
        ),
    ],
    [
        spec('u_n = 3×2^n, u_4 = 48', 0, {'a': '3', 'q': '2', 'k': '4'}, '48', 'correct'),
        spec('Erreur : (3×2)^4 = 1296', 0, {'a': '3', 'q': '2', 'k': '4'}, '1296', 'incorrect'),
        spec('Erreur : 3×2×4 = 24', 0, {'a': '3', 'q': '2', 'k': '4'}, '24', 'incorrect'),
        spec('Erreur : 3×3^3 = 81 (exposant k−1 ; juste : 243)', 0,
             {'a': '3', 'q': '3', 'k': '4'}, '81', 'incorrect'),
        spec('1000×1,05^10 ≈ 1629', 1, {'c': '1000', 'q': '1.05', 'k': '10'}, '1629', 'correct'),
        spec('Erreur : intérêts simples 1500', 1, {'c': '1000', 'q': '1.05', 'k': '10'}, '1500',
             'incorrect'),
        spec('Erreur : 1000×1,05×10 = 10500', 1, {'c': '1000', 'q': '1.05', 'k': '10'},
             '10500', 'incorrect'),
    ],
)

# --- G3, 1GEN-057 : terme d'une suite donnée par récurrence --------------------------------

PROCHE = ('$u_1={{q}}\\times{{a}}={{eval:a*q;d}}$, $u_2={{q}}\\times{{eval:a*q;d}}={{eval:a*q^2;d}}$'
          '{{if:k>=3|, $u_3={{q}}\\times{{eval:a*q^2;d}}={{eval:a*q^3;d}}$|}}'
          '{{if:k>=4|, $u_4={{q}}\\times{{eval:a*q^3;d}}={{eval:a*q^4;d}}$|}}.')

G3 = modele(
    'Calculer un terme d\'une suite géométrique (récurrence)',
    'Suite définie par $u_0$ et $u_{n+1}=q\\times u_n$',
    2, 40,
    [
        variation(
            'La suite $(u_n)$ est définie par $u_0={{a}}$ et, pour tout entier naturel $n$,'
            ' $u_{n+1}={{q}}\\times u_n$.\n\nCalcule $u_{{k}}$.\n\n$u_{{k}}=?$',
            [var('a', '1..9'), var('q', '2|3'), var('k', '2..4')],
            '{{eval:a*q^k;d}}',
            ['On passe d\'un terme au suivant en multipliant par ${{q}}$ :',
             PROCHE,
             'Donc $u_{{k}}=' + col('{{eval:a*q^k;d}}') + '$.'],
        ),
        variation(
            'La suite $(u_n)$ est définie par $u_0={{a}}$ et, pour tout entier naturel $n$,'
            ' $u_{n+1}={{q}}\\times u_n$.\n\nCalcule $u_{{k}}$.\n\n$u_{{k}}=?$',
            [var('a', '100|200|500|1000'), var('q', '1.1|1.2|0.9|0.8'), var('k', '2|3')],
            '{{eval:a*q^k;d}}',
            ['On passe d\'un terme au suivant en multipliant par ${{q}}$ :',
             PROCHE,
             'Donc $u_{{k}}=' + col('{{eval:a*q^k;d}}') + '$.'],
        ),
    ],
    [
        spec('u_0=5, q=2, u_3 = 40', 0, {'a': '5', 'q': '2', 'k': '3'}, '40', 'correct'),
        spec('Erreur : arithmétique 5+3×2 = 11', 0, {'a': '5', 'q': '2', 'k': '3'}, '11',
             'incorrect'),
        spec('Erreur : q^k sans u_0 (8)', 0, {'a': '5', 'q': '2', 'k': '3'}, '8', 'incorrect'),
        spec('Erreur : un rang de moins (20)', 0, {'a': '5', 'q': '2', 'k': '3'}, '20',
             'incorrect'),
        spec('u_0=100, q=1,1, u_3 = 133,1', 1, {'a': '100', 'q': '1.1', 'k': '3'}, '133,1',
             'correct'),
        spec('u_0=200, q=0,8, u_2 = 128', 1, {'a': '200', 'q': '0.8', 'k': '2'}, '128', 'correct'),
        spec('Erreur : 100 + 3×1,1 = 103,3', 1, {'a': '100', 'q': '1.1', 'k': '3'}, '103,3',
             'incorrect'),
        spec('Erreur : 100×1,1×3 = 330', 1, {'a': '100', 'q': '1.1', 'k': '3'}, '330',
             'incorrect'),
    ],
    shared=DECIMAL,
)

# --- G4, 1GEN-029 : terme général -----------------------------------------------------------

G4 = modele(
    'Terme général d\'une suite géométrique à termes positifs',
    'À partir de $u_0$, de $u_1$ ou d\'un placement à taux fixe',
    2, 40,
    [
        variation(
            '$(u_n)$ est la suite géométrique de premier terme $u_0={{a}}$ et de raison'
            ' $q={{q}}$.\n\nExprime $u_n$ en fonction de $n$.\n\n$u_n=?$',
            [var('a', '2..9'), var('q', '2..5')],
            '{{a}}\\times{{q}}^n',
            ['Le premier terme est $u_0$ : pour aller de $u_0$ à $u_n$, on multiplie $n$ fois'
             ' par la raison. Donc $u_n=u_0\\times q^n$.',
             '$u_n=' + col('{{a}}\\times{{q}}^n') + '$.'],
        ),
        variation(
            '$(u_n)$ est la suite géométrique de premier terme $u_1={{a}}$ et de raison'
            ' $q={{q}}$.\n\nExprime $u_n$ en fonction de $n$.\n\n$u_n=?$',
            [var('a', '2..9'), var('q', '2..5')],
            '{{a}}\\times{{q}}^{n-1}',
            ['Le premier terme est $u_1$ : pour aller de $u_1$ à $u_n$, on multiplie $n-1$ fois'
             ' par la raison. Donc $u_n=u_1\\times q^{n-1}$.',
             '$u_n=' + col('{{a}}\\times{{q}}^{n-1}') + '$.'],
        ),
        variation(
            'On place ${{c}}~\\unit{€}$ à ${{t}}~\\%$ d\'intérêts composés par an. On note $u_n$'
            ' la somme disponible au bout de $n$ années, donc $u_0={{c}}$.\n\n'
            'Exprime $u_n$ en fonction de $n$.\n\n$u_n=?$',
            [var('c', '500|1000|2000'), var('t', '2..5')],
            '{{c}}\\times{{eval:1+t/100;d}}^n',
            ['Chaque année, la somme augmente de ${{t}}~\\%$ : elle est multipliée par'
             ' $1+\\dfrac{{{t}}}{100}={{eval:1+t/100;d}}$. La suite $(u_n)$ est géométrique de'
             ' raison ${{eval:1+t/100;d}}$.',
             'Son premier terme est $u_0={{c}}$, donc $u_n=' + col('{{c}}\\times{{eval:1+t/100;d}}^n')
             + '$.'],
        ),
    ],
    [
        spec('u_0=3, q=2 : 3×2^n', 0, {'a': '3', 'q': '2'}, '3\\times2^n', 'correct'),
        spec('écrit 3·2^n sans signe', 0, {'a': '3', 'q': '2'}, '3\\cdot2^n', 'correct'),
        spec('Erreur : (3×2)^n = 6^n', 0, {'a': '3', 'q': '2'}, '6^n', 'incorrect'),
        spec('Erreur : arithmétique 3+2n', 0, {'a': '3', 'q': '2'}, '3+2n', 'incorrect'),
        spec('Erreur : 2×3^n (inversé)', 0, {'a': '3', 'q': '2'}, '2\\times3^n', 'incorrect'),
        spec('u_1=5, q=3 : 5×3^(n−1)', 1, {'a': '5', 'q': '3'}, '5\\times3^{n-1}', 'correct'),
        spec('Erreur : u_1 pris pour u_0 (5×3^n)', 1, {'a': '5', 'q': '3'}, '5\\times3^n',
             'incorrect'),
        spec('Erreur : exposant n+1', 1, {'a': '5', 'q': '3'}, '5\\times3^{n+1}', 'incorrect'),
        spec('1000 € à 3 % : 1000×1,03^n', 2, {'c': '1000', 't': '3'}, '1000\\times1,03^n',
             'correct'),
        spec('Erreur : 1000×0,03^n', 2, {'c': '1000', 't': '3'}, '1000\\times0,03^n',
             'incorrect'),
        spec('Erreur : intérêts simples 1000+30n', 2, {'c': '1000', 't': '3'}, '1000+30n',
             'incorrect'),
    ],
    shared={'cleanCoefficients': True},
    # 1000×1,03^n : un décimal dans une expression tombe en bad_form (acceptDecimal ne vaut que
    # pour un nombre seul) → forme libre, l'équivalence seule décide.
    options={'constraints': {'form': 'off'}},
)

# --- G5, 1GEN-030 : sens de variation -------------------------------------------------------

G5_REGLE = ('Pour une suite géométrique de premier terme positif et de raison $q>0$ : si $q>1$,'
            ' elle est croissante ; si $0<q<1$, elle est décroissante ; si $q=1$, elle est'
            ' constante.')

G5 = modele(
    'Sens de variation d\'une suite géométrique',
    'Premier terme et raison strictement positifs : la raison donne le sens de variation',
    1, 20,
    [
        variation(
            'La suite $(u_n)$ est définie par $u_0={{a}}$ et, pour tout entier naturel $n$,'
            ' $u_{n+1}={{q}}\\times u_n$.\n\nQuel est le sens de variation de la suite'
            ' $(u_n)$ ?' + SENS,
            [var('a', '1..9'), var('q', '1.2|1.5|2|3')],
            '0',
            ['$(u_n)$ est géométrique de raison $q=' + col('{{q}}') + '$ et de premier terme'
             ' positif.', G5_REGLE, 'Ici $q>1$ : la suite est **croissante**.'],
        ),
        variation(
            'La suite $(u_n)$ est définie par $u_0={{a}}$ et, pour tout entier naturel $n$,'
            ' $u_{n+1}={{q}}\\times u_n$.\n\nQuel est le sens de variation de la suite'
            ' $(u_n)$ ?' + SENS,
            [var('a', '10..90'), var('q', '0.2|0.5|0.8|0.9')],
            '1',
            ['$(u_n)$ est géométrique de raison $q=' + col('{{q}}') + '$ et de premier terme'
             ' positif.', G5_REGLE, 'Ici $0<q<1$ : la suite est **décroissante**.'],
        ),
        variation(
            'La suite $(u_n)$ est définie, pour tout entier naturel $n$, par'
            ' $u_n={{a}}\\times{{q}}^n$.\n\nQuel est le sens de variation de la suite'
            ' $(u_n)$ ?' + SENS,
            [var('a', '100|200|500|1000'), var('q', '0.5|0.8|0.9')],
            '1',
            ['$(u_n)$ est géométrique de premier terme $u_0={{a}}>0$ et de raison $q='
             + col('{{q}}') + '$.', G5_REGLE,
             'Ici $0<q<1$ : la suite est **décroissante**, même si son premier terme est grand.'],
        ),
        variation(
            'Un lac contient ${{a}}$ tonnes d\'algues ; cette masse baisse de ${{t}}~\\%$ chaque'
            ' année. On note $u_n$ la masse d\'algues, en tonnes, au bout de $n$ années.\n\n'
            'Quel est le sens de variation de la suite $(u_n)$ ?' + SENS,
            [var('a', '20..80'), var('t', '5|10|20')],
            '1',
            ['Baisser de ${{t}}~\\%$, c\'est multiplier par $1-\\dfrac{{{t}}}{100}='
             + col('{{eval:1-t/100;d}}') + '$ : $(u_n)$ est géométrique de raison'
             ' ${{eval:1-t/100;d}}$.', G5_REGLE, 'Ici $0<q<1$ : la suite est **décroissante**.'],
        ),
        variation(
            '$(u_n)$ est la suite géométrique de premier terme $u_0={{a}}$ et de raison'
            ' $q=1$.\n\nQuel est le sens de variation de la suite $(u_n)$ ?' + SENS,
            [var('a', '1..20')],
            '2',
            [G5_REGLE, 'Ici $q=' + col('1') + '$ : tous les termes valent ${{a}}$, la suite est'
             ' **constante**.'],
        ),
    ],
    [s for vi, vars_, bonne in [
        (0, {'a': '4', 'q': '1.5'}, 0), (1, {'a': '50', 'q': '0.8'}, 1),
        (2, {'a': '500', 'q': '0.9'}, 1), (3, {'a': '40', 't': '10'}, 1), (4, {'a': '7'}, 2)]
     for s in [spec('variation ' + str(vi) + ' : bonne réponse', vi, vars_, str(bonne), 'correct')]
     + [spec('variation ' + str(vi) + ' : « ' + ['croissante', 'décroissante', 'constante'][j]
             + ' » refusé', vi, vars_, str(j), 'incorrect') for j in range(3) if j != bonne]],
)

MODELES = [('01-raison-suite-geometrique', G1), ('02-terme-forme-explicite', G2),
           ('03-terme-recurrence', G3), ('04-terme-general-suite-geometrique', G4),
           ('05-sens-de-variation-suite-geometrique', G5)]

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    chemin = os.path.join(DOSSIER, nom + '.json')
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
    print('écrit', chemin)
