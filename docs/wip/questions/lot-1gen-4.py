"""Écrit les 7 modèles du lot 4 « taux moyen, phénomènes exponentiels, seuils » de la 1re
générale (enseignement scientifique, module spécifique) dans
scripts/questions/1gen-4-taux-moyen-seuils/.

Phase 0 validée par David le 2026-11-17 (Q13 à Q16, journal docs/archive/wip/questions-1gen-progress.md
§ 14). Nœud et tag posés par la migration :

| #  | Point    | Nœud                                     | Niveau | Réponse            |
| T1 | 1GEN-037 | Évolutions › taux d'évolution moyen      | 2 | case, % arrondi          |
| T2 | 1GEN-040 | Évolutions › taux d'évolution moyen      | 2 | case, % arrondi          |
| T3 | 1GEN-038 | Fonction exponentielle › croiss./décr.   | 1 | case choix               |
| T4 | 1GEN-056 | Fonction exponentielle › croiss./décr.   | 2 | case, expression         |
| T5 | 1GEN-043 | Fonction exponentielle › croiss./décr.   | 2 | case choix               |
| T6 | 1GEN-044 | Modèles d'évolution › seuil              | 2 | case, entier             |
| T7 | 1GEN-060 | Modèles d'évolution › seuil              | 1 | case, lecture / entier   |

Borne (BO 1re ES p.7) : a > 0 et x ⩾ 0 ; pas de logarithme (le seuil se cherche par essais à la
calculatrice ; `ln` ne sert qu'au calcul de la réponse, jamais dans un texte). T1 et T2 sont
candidats TTECHNO (035, 038) : écrits ici avec `grades` = ['1_GEN'], questions-ttechno ajoute
`T_TECHNO` et ses tags.

Pièges : jamais de variable `e` ni `i` ; case choix → `melanger: non`, réponse = rang ; eval ne
connaît ni `>` ni `==` (indicatrices par floor / min / max) ; `round(…, n)` refusé
→ round(100*x)/100 ; pas de `ceil` → floor(…) + 1 (aucune égalité exacte possible ici).

    python3 docs/wip/questions/lot-1gen-4.py scripts/questions/1gen-4-taux-moyen-seuils
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


def r2(expr):
    """Valeur arrondie au centième, écrite avec une virgule."""
    return '{{eval:round(100*(' + expr + '))/100;d}}'


def r3(expr):
    return '{{eval:round(1000*(' + expr + '))/1000;d}}'


def differe(expr_juste, expr_fausse, k=100):
    """Condition : l'erreur typique, arrondie comme la réponse, donne une autre valeur."""
    return 'round(' + str(k) + '*(' + expr_juste + ')) != round(' + str(k) + '*(' + expr_fausse + '))'


# --- T1, 1GEN-037 : taux moyen de n évolutions successives ----------------------------------

TAUX_MOYEN = ('Le taux d\'évolution moyen $t_m$ de $n$ évolutions successives est celui qui, appliqué'
              ' $n$ fois, donne la même évolution globale : $(1+t_m)^n=CM$, où $CM$ est le'
              ' coefficient multiplicateur global. Donc $1+t_m=CM^{\\frac{1}{n}}$.')

T1_CM2 = '(1+a/100)*(1-b/100)'
T1_CM3 = '(1+a/100)*(1+b/100)*(1-c/100)'
T1_CM4 = '(1+a/100)*(1-b/100)*(1+c/100)*(1-d/100)'


def t1_rep(cm, n):
    return '100*((' + cm + ')^(1/' + str(n) + ')-1)'


T1 = modele(
    'Taux d\'évolution moyen de plusieurs évolutions successives',
    'Taux moyen de 2, 3 ou 4 évolutions données une à une, à l\'aide de l\'exposant 1/n',
    2, 60,
    [
        variation(
            'Le prix d\'un article augmente de ${{a}}~\\%$, puis baisse de ${{b}}~\\%$.\n\n'
            'Calcule le taux d\'évolution moyen de ces deux évolutions, en pourcentage, arrondi'
            ' au centième.\n\n$t_m\\approx ?~\\%$',
            [var('a', '10|20|25|30|40|50'), var('b', '5|10|15|20|25|30')],
            case(r2(t1_rep(T1_CM2, 2)), precision=arrondi(2)),
            ['Les coefficients multiplicateurs sont $1+\\dfrac{ {{a}} }{100}={{eval:1+a/100;d}}$ et'
             ' $1-\\dfrac{ {{b}} }{100}={{eval:1-b/100;d}}$. Le coefficient global est'
             ' $CM={{eval:1+a/100;d}}\\times{{eval:1-b/100;d}}={{eval:' + T1_CM2 + ';d}}$.',
             TAUX_MOYEN,
             'Ici $n=2$ : $1+t_m={{eval:' + T1_CM2 + ';d}}^{\\frac{1}{2}}\\approx'
             + '{{eval:round(10000*(' + T1_CM2 + ')^(1/2))/10000;d}}$, donc $t_m\\approx' + col(r2(t1_rep(T1_CM2, 2)))
             + '~\\%$ (et non la moyenne des taux : on ne fait pas la moyenne de $+{{a}}~\\%$ et'
             ' de $-{{b}}~\\%$).'],
            [differe(t1_rep(T1_CM2, 2), '(a-b)/2'), 'a != b'],
        ),
        variation(
            'Le chiffre d\'affaires d\'une entreprise a augmenté de ${{a}}~\\%$ la première année,'
            ' de ${{b}}~\\%$ la deuxième, puis a baissé de ${{c}}~\\%$ la troisième.\n\n'
            'Calcule le taux d\'évolution annuel moyen sur ces trois années, en pourcentage,'
            ' arrondi au centième.\n\n$t_m\\approx ?~\\%$',
            [var('a', '5|10|15|20|25'), var('b', '5|10|15|20|25'), var('c', '10|20|30')],
            case(r2(t1_rep(T1_CM3, 3)), precision=arrondi(2)),
            ['Le coefficient multiplicateur global est $CM={{eval:1+a/100;d}}\\times'
             '{{eval:1+b/100;d}}\\times{{eval:1-c/100;d}}={{eval:' + T1_CM3 + ';d}}$.',
             TAUX_MOYEN,
             'Ici $n=3$ : $1+t_m={{eval:' + T1_CM3 + ';d}}^{\\frac{1}{3}}$, donc, à la calculatrice,'
             ' $t_m\\approx' + col(r2(t1_rep(T1_CM3, 3))) + '~\\%$.'],
            [differe(t1_rep(T1_CM3, 3), '(a+b-c)/3')],
        ),
        variation(
            'Le cours d\'une action a connu les évolutions annuelles suivantes.\n\n'
            '| Année | 1 | 2 | 3 | 4 |\n| --- | --- | --- | --- | --- |\n'
            '| Évolution | $+{{a}}~\\%$ | $-{{b}}~\\%$ | $+{{c}}~\\%$ | $-{{d}}~\\%$ |\n\n'
            'Calcule le taux d\'évolution annuel moyen sur ces quatre années, en pourcentage,'
            ' arrondi au centième.\n\n$t_m\\approx ?~\\%$',
            [var('a', '10|20|30|40'), var('b', '5|10|15|20'), var('c', '10|20|30|40'),
             var('d', '5|10|15|20')],
            case(r2(t1_rep(T1_CM4, 4)), precision=arrondi(2)),
            ['Le coefficient multiplicateur global est $CM={{eval:1+a/100;d}}\\times'
             '{{eval:1-b/100;d}}\\times{{eval:1+c/100;d}}\\times{{eval:1-d/100;d}}'
             '\\approx{{eval:round(10000*(' + T1_CM4 + '))/10000;d}}$.',
             TAUX_MOYEN,
             'Ici $n=4$ : $1+t_m=CM^{\\frac{1}{4}}$, donc, à la calculatrice,'
             ' $t_m\\approx' + col(r2(t1_rep(T1_CM4, 4))) + '~\\%$.'],
            [differe(t1_rep(T1_CM4, 4), '(a-b+c-d)/4')],
        ),
    ],
    [
        spec('+20 % puis −10 % : 1,08^(1/2) − 1 ≈ 3,92 %', 0, {'a': '20', 'b': '10'}, '3,92',
             'correct'),
        spec('Erreur : moyenne des taux (5 %)', 0, {'a': '20', 'b': '10'}, '5', 'incorrect'),
        spec('Erreur : taux global / 2 (4 %)', 0, {'a': '20', 'b': '10'}, '4', 'incorrect'),
        spec('Erreur : oubli du −1 (103,92)', 0, {'a': '20', 'b': '10'}, '103,92', 'incorrect'),
        spec('+10, +20, −30 : 0,924^(1/3) − 1 ≈ −2,60 %', 1, {'a': '10', 'b': '20', 'c': '30'},
             '-2,6', 'correct'),
        spec('Erreur : moyenne des taux (0 %)', 1, {'a': '10', 'b': '20', 'c': '30'}, '0',
             'incorrect'),
        spec('+20, −10, +30, −20 : 1,1232^(1/4) − 1 ≈ 2,95 %', 2,
             {'a': '20', 'b': '10', 'c': '30', 'd': '20'}, '2,95', 'correct'),
        spec('Erreur : moyenne des taux (5 %)', 2, {'a': '20', 'b': '10', 'c': '30', 'd': '20'},
             '5', 'incorrect'),
    ],
    shared={'blankDefaults': {'acceptDecimal': True}},
)


# --- T2, 1GEN-040 : taux moyen entre deux valeurs, taux global, taux mensuel ---------------

T2_RAISON = ('Si une grandeur passe de $V_0$ à $V_n$ en $n$ périodes, le taux moyen $t_m$ par période'
             ' vérifie $V_0\\times(1+t_m)^n=V_n$, donc $1+t_m=\\left(\\dfrac{V_n}{V_0}\\right)^{\\frac{1}{n}}$.')

T2 = modele(
    'Calculer un taux d\'évolution moyen',
    'Taux annuel moyen entre deux valeurs, à partir d\'un taux global ; taux mensuel équivalent',
    2, 60,
    [
        variation(
            'La population d\'une ville est passée de ${{v}}$ à ${{w}}$ habitants en ${{n}}$ ans.\n\n'
            'Calcule le taux d\'évolution annuel moyen de cette population, en pourcentage,'
            ' arrondi au centième.\n\n$t_m\\approx ?~\\%$',
            [var('v', '12000|25000|40000'), var('m', '1.2|1.25|1.5|0.8|0.9'), var('n', '3|4|5|8|10'),
             var('w', 'eval:v*m')],
            case(r2('100*(m^(1/n)-1)'), precision=arrondi(2)),
            [T2_RAISON,
             'Ici $\\dfrac{V_n}{V_0}=\\dfrac{ {{w}} }{ {{v}} }={{m}}$ et $n={{n}}$ :'
             ' $1+t_m={{m}}^{\\frac{1}{ {{n}} }}$.',
             'À la calculatrice : $t_m\\approx' + col(r2('100*(m^(1/n)-1)')) + '~\\%$ par an (et non'
             ' le taux global divisé par ${{n}}$).'],
            [differe('100*(m^(1/n)-1)', '100*(m-1)/n')],
        ),
        variation(
            'Le prix d\'un logement a augmenté de ${{g}}~\\%$ en ${{n}}$ ans.\n\n'
            'Calcule le taux d\'évolution annuel moyen de ce prix, en pourcentage, arrondi au'
            ' centième.\n\n$t_m\\approx ?~\\%$',
            [var('g', '20|30|50|60|80|100'), var('n', '2..10')],
            case(r2('100*((1+g/100)^(1/n)-1)'), precision=arrondi(2)),
            ['Une hausse de ${{g}}~\\%$ correspond au coefficient multiplicateur global'
             ' $CM=1+\\dfrac{ {{g}} }{100}={{eval:1+g/100;d}}$.',
             'Le taux annuel moyen vérifie $(1+t_m)^{ {{n}} }={{eval:1+g/100;d}}$, donc'
             ' $1+t_m={{eval:1+g/100;d}}^{\\frac{1}{ {{n}} }}$.',
             'À la calculatrice : $t_m\\approx' + col(r2('100*((1+g/100)^(1/n)-1)')) + '~\\%$ par an'
             ' (et non $\\dfrac{ {{g}} }{ {{n}} }$ : les hausses se multiplient, elles ne'
             ' s\'ajoutent pas).'],
            [differe('100*((1+g/100)^(1/n)-1)', 'g/n')],
        ),
        variation(
            'Un placement rapporte ${{t}}~\\%$ par an, à intérêts composés.\n\n'
            'Calcule le taux mensuel équivalent, c\'est-à-dire le taux qui, appliqué chaque mois'
            ' pendant $12$ mois, donne la même évolution sur un an. Donne-le en pourcentage,'
            ' arrondi au millième.\n\n$t_m\\approx ?~\\%$',
            [var('t', '3|4|5|6|8|10|12')],
            case(r3('100*((1+t/100)^(1/12)-1)'), precision=arrondi(3)),
            ['Sur un an, le coefficient multiplicateur est $1+\\dfrac{ {{t}} }{100}='
             '{{eval:1+t/100;d}}$.',
             'Le taux mensuel $t_m$ vérifie $(1+t_m)^{12}={{eval:1+t/100;d}}$, donc'
             ' $1+t_m={{eval:1+t/100;d}}^{\\frac{1}{12}}$.',
             'À la calculatrice : $t_m\\approx' + col(r3('100*((1+t/100)^(1/12)-1)')) + '~\\%$ par'
             ' mois (un peu moins que $\\dfrac{ {{t}} }{12}$).'],
            [differe('100*((1+t/100)^(1/12)-1)', 't/12', 1000)],
        ),
    ],
    [
        spec('25 000 → 30 000 en 5 ans : 1,2^(1/5) − 1 ≈ 3,71 %', 0,
             {'v': '25000', 'm': '1.2', 'n': '5', 'w': '30000'}, '3,71', 'correct'),
        spec('Erreur : taux global / n (4 %)', 0, {'v': '25000', 'm': '1.2', 'n': '5', 'w': '30000'},
             '4', 'incorrect'),
        spec('Erreur : exposant n (1,2^5 − 1 ≈ 148,83 %)', 0,
             {'v': '25000', 'm': '1.2', 'n': '5', 'w': '30000'}, '148,83', 'incorrect'),
        spec('40 000 → 32 000 en 4 ans : 0,8^(1/4) − 1 ≈ −5,43 %', 0,
             {'v': '40000', 'm': '0.8', 'n': '4', 'w': '32000'}, '-5,43', 'correct'),
        spec('+50 % en 5 ans : 1,5^(1/5) − 1 ≈ 8,45 %', 1, {'g': '50', 'n': '5'}, '8,45', 'correct'),
        spec('Erreur : 50 / 5 = 10 %', 1, {'g': '50', 'n': '5'}, '10', 'incorrect'),
        spec('Erreur : oubli du −1 (108,45)', 1, {'g': '50', 'n': '5'}, '108,45', 'incorrect'),
        spec('6 % par an : 1,06^(1/12) − 1 ≈ 0,487 %', 2, {'t': '6'}, '0,487', 'correct'),
        spec('Erreur : 6 / 12 = 0,5 %', 2, {'t': '6'}, '0,5', 'incorrect'),
    ],
    shared={'blankDefaults': {'acceptDecimal': True}},
)

# --- T3, 1GEN-038 : reconnaître une évolution exponentielle ----------------------------------

LIN_EXP_NI = ('\n\n```choix\nmelanger: non\n- une évolution linéaire\n- une évolution exponentielle\n'
              '- ni l\'une ni l\'autre\n```')
LIN_EXP = '\n\n```choix\nmelanger: non\n- une évolution linéaire\n- une évolution exponentielle\n```'
REGLE_TABLEAU = ('À pas constant, une évolution est **linéaire** si les **différences** entre deux'
                 ' valeurs successives sont constantes ; elle est **exponentielle** si les'
                 ' **quotients** sont constants.')
REGLE_MOTS = ('Ajouter (ou retirer) la même quantité à chaque période donne une évolution'
              ' **linéaire** ; multiplier par le même nombre (augmenter ou diminuer d\'un même'
              ' pourcentage, diviser par $2$…) donne une évolution **exponentielle**.')


def tableau(terme):
    vals = ' | '.join('${{eval:' + terme.replace('X', str(k)) + ';d}}$' for k in range(5))
    return ('\n\n| $x$ | $0$ | $1$ | $2$ | $3$ | $4$ |\n| --- | --- | --- | --- | --- | --- |\n'
            '| $y$ | ' + vals + ' |')


T3_INTRO = 'Une grandeur $y$ a été relevée à intervalles réguliers :'
T3_QUESTION = '\n\nCes valeurs correspondent-elles à…'

LIN, EXP, NI = 'a+r*X', 'a*q^X', 'a+b*X*(X+1)/2'

T3 = modele(
    'Reconnaître une évolution exponentielle',
    'Linéaire ou exponentielle (tableau, phrase) ; croissance ou décroissance ; discret ou continu',
    1, 40,
    [
        variation(
            T3_INTRO + tableau(LIN) + T3_QUESTION + LIN_EXP_NI,
            [var('a', '20..40'), var('r', '-4|-3|3|5|8|12')], '0',
            [REGLE_TABLEAU,
             'Les différences valent toutes ${{r}}$ : l\'évolution est $' + col('\\text{linéaire}') + '$'
             + '. (Les quotients, eux, ne sont pas constants.)'],
        ),
        variation(
            T3_INTRO + tableau(EXP) + T3_QUESTION + LIN_EXP_NI,
            [var('q', '2|1.5|0.5'), var('m', '1|2'), var('a', 'eval:16*m')], '1',
            [REGLE_TABLEAU,
             'Chaque valeur s\'obtient en multipliant la précédente par ${{q}}$ : les quotients'
             ' sont constants, l\'évolution est $' + col('\\text{exponentielle}') + '$. (Les'
             ' différences, elles, ne sont pas constantes.)'],
        ),
        variation(
            T3_INTRO + tableau(NI) + T3_QUESTION + LIN_EXP_NI,
            [var('a', '2..9'), var('b', '1..3')], '2',
            [REGLE_TABLEAU,
             'Les différences valent ${{b}}$, ${{eval:2*b}}$, ${{eval:3*b}}$, ${{eval:4*b}}$ : elles'
             ' ne sont pas constantes. Les quotients non plus :'
             ' $\\dfrac{ {{eval:a+b}} }{ {{a}} }\\neq\\dfrac{ {{eval:a+3*b}} }{ {{eval:a+b}} }$.',
             'L\'évolution n\'est $' + col('\\text{ni linéaire, ni exponentielle}') + '$.'],
            ['a != b'],
        ),
        variation(
            'La population d\'un village augmente de ${{p}}~\\%$ par an.\n\n'
            'Son évolution est-elle…' + LIN_EXP,
            [var('p', '2|3|4|5')], '1',
            [REGLE_MOTS,
             'Augmenter de ${{p}}~\\%$, c\'est multiplier par ${{eval:1+p/100;d}}$ chaque année :'
             ' l\'évolution est $' + col('\\text{exponentielle}') + '$.'],
        ),
        variation(
            'La population d\'un village augmente de ${{p}}$ habitants par an.\n\n'
            'Son évolution est-elle…' + LIN_EXP,
            [var('p', '20|30|50|80')], '0',
            [REGLE_MOTS,
             'On ajoute ${{p}}$ habitants chaque année : l\'évolution est '
             + '$' + col('\\text{linéaire}') + '$.'],
        ),
        variation(
            'La masse d\'un élément radioactif est divisée par $2$ toutes les ${{h}}$ heures.\n\n'
            'Son évolution est-elle…' + LIN_EXP,
            [var('h', '3|8|12|24')], '1',
            [REGLE_MOTS,
             'Toutes les ${{h}}$ heures, la masse est multipliée par $0{,}5$ : l\'évolution est '
             + '$' + col('\\text{exponentielle}') + '$.'],
        ),
        variation(
            'Une quantité est multipliée par ${{q}}$ chaque heure.\n\n'
            'S\'agit-il…\n\n```choix\nmelanger: non\n- d\'une croissance exponentielle\n'
            '- d\'une décroissance exponentielle\n```',
            [var('q', '0.6|0.7|0.8|0.9|1.1|1.2|1.5|2')], '{{eval:1-min(floor(q),1)}}',
            ['Multiplier à chaque période par un nombre $q>1$ fait croître la quantité ; par un'
             ' nombre $0<q<1$, la fait décroître.',
             'Ici $q={{q}}$ {{if:q>1|est supérieur à $1$ : c\'est une croissance exponentielle|est'
             ' compris entre $0$ et $1$ : c\'est une décroissance exponentielle}}.'],
        ),
        variation(
            'On étudie le nombre de bactéries d\'une culture, qui double toutes les heures. On'
            ' s\'intéresse à ce nombre {{if:c>0|à chaque heure entière $n=0$, $1$, $2$…|à tout'
            ' instant $t\\geqslant0$, en heures}}.\n\n'
            'Quel modèle convient ?\n\n```choix\nmelanger: non\n'
            '- une suite géométrique (phénomène discret)\n'
            '- une fonction $t\\mapsto k\\times a^t$ (phénomène continu)\n```',
            [var('c', '0|1')], '{{eval:1-c}}',
            ['Une grandeur observée à des instants séparés (chaque heure entière) est un'
             ' phénomène **discret**, modélisé par une suite géométrique. Une grandeur observée à'
             ' tout instant est un phénomène **continu**, modélisé par une fonction'
             ' $t\\mapsto k\\times a^t$.',
             'Ici, on observe le nombre {{if:c>0|à chaque heure entière : phénomène discret, suite'
             ' géométrique|à tout instant : phénomène continu, fonction $t\\mapsto k\\times a^t$}}.'],
        ),
    ],
    [
        spec('Tableau linéaire', 0, {'a': '30', 'r': '5'}, '0', 'correct'),
        spec('Erreur : linéaire pris pour exponentiel', 0, {'a': '30', 'r': '5'}, '1', 'incorrect'),
        spec('Tableau exponentiel (×1,5)', 1, {'q': '1.5', 'm': '1', 'a': '16'}, '1', 'correct'),
        spec('Erreur : exponentiel pris pour linéaire', 1, {'q': '1.5', 'm': '1', 'a': '16'}, '0',
             'incorrect'),
        spec('Ni l\'un ni l\'autre', 2, {'a': '3', 'b': '2'}, '2', 'correct'),
        spec('Erreur : « exponentielle » parce que ça croît vite', 2, {'a': '3', 'b': '2'}, '1',
             'incorrect'),
        spec('+3 % par an : exponentielle', 3, {'p': '3'}, '1', 'correct'),
        spec('Erreur : +3 % pris pour linéaire', 3, {'p': '3'}, '0', 'incorrect'),
        spec('+50 habitants par an : linéaire', 4, {'p': '50'}, '0', 'correct'),
        spec('Erreur : +50 habitants pris pour exponentiel', 4, {'p': '50'}, '1', 'incorrect'),
        spec('Divisée par 2 : exponentielle', 5, {'h': '8'}, '1', 'correct'),
        spec('Erreur : divisée par 2 prise pour linéaire', 5, {'h': '8'}, '0', 'incorrect'),
        spec('×1,2 : croissance', 6, {'q': '1.2'}, '0', 'correct'),
        spec('×0,8 : décroissance', 6, {'q': '0.8'}, '1', 'correct'),
        spec('Erreur : ×0,8 pris pour une croissance', 6, {'q': '0.8'}, '0', 'incorrect'),
        spec('Heures entières : discret', 7, {'c': '1'}, '0', 'correct'),
        spec('Tout instant : continu', 7, {'c': '0'}, '1', 'correct'),
        spec('Erreur : tout instant pris pour discret', 7, {'c': '0'}, '0', 'incorrect'),
    ],
)

# --- T4, 1GEN-056 : modéliser par une fonction exponentielle --------------------------------
# Expression en t ou en x, telle que l'énoncé la nomme. Décimal dans l'expression → forme libre.

T4 = modele(
    'Modéliser une évolution par une fonction exponentielle',
    'Écrire f(t) = k × aᵗ : baisse ou hausse d\'un pourcentage, division par 2, rumeur',
    2, 60,
    [
        variation(
            'On injecte ${{q}}$ mg d\'un médicament dans le sang. L\'organisme en élimine'
            ' ${{p}}~\\%$ par heure. On modélise la quantité restante, en mg, au bout de $t$ heures'
            ' ($t$ réel positif) par une fonction $Q$.\n\nExprime $Q(t)$ en fonction de $t$.\n\n'
            '$Q(t)=?$',
            [var('q', '50|100|200'), var('p', '10|15|20|25')],
            '{{q}}\\times{{eval:1-p/100;d}}^t',
            ['Perdre ${{p}}~\\%$ par heure, c\'est multiplier par $1-\\dfrac{ {{p}} }{100}='
             '{{eval:1-p/100;d}}$ chaque heure : la décroissance est exponentielle.',
             'Au départ, $Q(0)={{q}}$, donc $Q(t)=' + col('{{q}}\\times{{eval:1-p/100;d}}^t') + '$.'],
        ),
        variation(
            'Une ville compte ${{q}}$ habitants. Sa population augmente de ${{p}}~\\%$ par an. On'
            ' modélise la population au bout de $x$ années ($x$ réel positif) par une fonction'
            ' $P$.\n\nExprime $P(x)$ en fonction de $x$.\n\n$P(x)=?$',
            [var('q', '2000|5000|12000'), var('p', '2|3|5')],
            '{{q}}\\times{{eval:1+p/100;d}}^x',
            ['Augmenter de ${{p}}~\\%$ par an, c\'est multiplier par $1+\\dfrac{ {{p}} }{100}='
             '{{eval:1+p/100;d}}$ chaque année : la croissance est exponentielle.',
             'Au départ, $P(0)={{q}}$, donc $P(x)=' + col('{{q}}\\times{{eval:1+p/100;d}}^x') + '$.'],
        ),
        variation(
            'Un échantillon contient ${{q}}$ noyaux radioactifs. Leur nombre est divisé par $2$'
            ' toutes les heures. On modélise le nombre de noyaux restants au bout de $t$ heures'
            ' ($t$ réel positif) par une fonction $N$.\n\nExprime $N(t)$ en fonction de $t$.\n\n'
            '$N(t)=?$',
            [var('q', '1000|5000|8000')],
            '{{q}}\\times0{,}5^t',
            ['Diviser par $2$, c\'est multiplier par $0{,}5$ : la décroissance est exponentielle.',
             'Au départ, $N(0)={{q}}$, donc $N(t)=' + col('{{q}}\\times0{,}5^t') + '$.'],
        ),
        variation(
            'Une rumeur se propage : au départ, une personne la connaît, et à chaque étape le'
            ' nombre de personnes qui la connaissent est multiplié par ${{k}}$. On modélise ce'
            ' nombre au bout de $x$ étapes par une fonction $f$ définie pour $x\\geqslant0$.\n\n'
            'Exprime $f(x)$ en fonction de $x$.\n\n$f(x)=?$',
            [var('k', '2..5')],
            '{{k}}^x',
            ['Le nombre est multiplié par ${{k}}$ à chaque étape : la croissance est exponentielle,'
             ' de la forme $f(x)=f(0)\\times{{k}}^x$.',
             'Au départ, $f(0)=1$, donc $f(x)=' + col('{{k}}^x') + '$.'],
        ),
    ],
    [
        spec('100 mg, −20 % : 100 × 0,8^t', 0, {'q': '100', 'p': '20'}, '100\\times0,8^t',
             'correct'),
        spec('Écrit 100·0,8^t', 0, {'q': '100', 'p': '20'}, '100\\cdot0,8^{t}', 'correct'),
        spec('Erreur : 100 × 0,2^t', 0, {'q': '100', 'p': '20'}, '100\\times0,2^t', 'incorrect'),
        spec('Erreur : 100 × 1,2^t (hausse)', 0, {'q': '100', 'p': '20'}, '100\\times1,2^t',
             'incorrect'),
        spec('Erreur : baisse linéaire 100 − 20t', 0, {'q': '100', 'p': '20'}, '100-20t',
             'incorrect'),
        spec('5000 hab., +3 % : 5000 × 1,03^x', 1, {'q': '5000', 'p': '3'}, '5000\\times1,03^x',
             'correct'),
        spec('Erreur : 5000 × 0,03^x', 1, {'q': '5000', 'p': '3'}, '5000\\times0,03^x',
             'incorrect'),
        spec('Erreur : 5000 + 150x', 1, {'q': '5000', 'p': '3'}, '5000+150x', 'incorrect'),
        spec('1000 × 0,5^t', 2, {'q': '1000'}, '1000\\times0,5^t', 'correct'),
        spec('Écrit 1000/2^t', 2, {'q': '1000'}, '\\frac{1000}{2^t}', 'correct'),
        spec('Erreur : 1000 × 2^t', 2, {'q': '1000'}, '1000\\times2^t', 'incorrect'),
        spec('Erreur : 1000 − 500t', 2, {'q': '1000'}, '1000-500t', 'incorrect'),
        spec('×3 : 3^x', 3, {'k': '3'}, '3^x', 'correct'),
        spec('Erreur : 3x', 3, {'k': '3'}, '3x', 'incorrect'),
        spec('Erreur : x^3', 3, {'k': '3'}, 'x^3', 'incorrect'),
    ],
    shared={'cleanCoefficients': True, 'blankDefaults': {'acceptDecimal': True}},
    options={'constraints': {'form': 'off'}},
)

# --- T5, 1GEN-043 : ordre de grandeur ---------------------------------------------------------
# 2¹⁰ = 1 024 ≈ 10³ : n doublements (n = 10, 20, 30) ≈ 10³, 10⁶, 10⁹. Le ×3 de la phase 0 est
# retiré : 3¹⁰ ≈ 6 × 10⁴ n'a pas d'ordre de grandeur sans ambiguïté (10⁴ ou 10⁵).

PUISSANCES = ('\n\n```choix\nmelanger: non\n- $10$\n- $10^2$\n- $10^3$\n- $10^6$\n- $10^9$\n```')
DIX = ('$2^{10}=1\\,024\\approx10^3$. Donc $2^{20}=\\left(2^{10}\\right)^2\\approx10^6$ et'
       ' $2^{30}=\\left(2^{10}\\right)^3\\approx10^9$.')

T5 = modele(
    'Ordre de grandeur d\'une évolution exponentielle',
    'Doublements et demi-vies : 2¹⁰ ≈ 10³, donc 2²⁰ ≈ 10⁶ et 2³⁰ ≈ 10⁹',
    2, 40,
    [
        variation(
            'Une population de bactéries double toutes les heures.\n\n'
            'Par environ combien est-elle multipliée au bout de ${{n}}$ heures ?' + PUISSANCES,
            [var('n', '10|20|30')], '{{eval:n/10+1}}',
            ['Au bout de ${{n}}$ heures, la population a doublé ${{n}}$ fois : elle est multipliée'
             ' par $2^{ {{n}} }$.', DIX,
             'Elle est multipliée par environ $' + col('10^{ {{eval:3*n/10}} }') + '$ (et non par'
             ' $2\\times{{n}}={{eval:2*n}}$ : les doublements se multiplient).'],
        ),
        variation(
            'La demi-vie d\'un élément radioactif est la durée au bout de laquelle la moitié de ses'
            ' noyaux se sont désintégrés.\n\n'
            'Au bout de ${{n}}$ demi-vies, le nombre de noyaux restants est divisé par environ…'
            + PUISSANCES,
            [var('n', '10|20|30')], '{{eval:n/10+1}}',
            ['À chaque demi-vie, le nombre de noyaux est divisé par $2$ : au bout de ${{n}}$'
             ' demi-vies, il est divisé par $2^{ {{n}} }$.', DIX,
             'Il est divisé par environ $' + col('10^{ {{eval:3*n/10}} }') + '$ : il en reste'
             ' environ un sur $10^{ {{eval:3*n/10}} }$.'],
        ),
        variation(
            'Le nombre de personnes ayant vu une vidéo double toutes les ${{m}}$ minutes.\n\n'
            'Par environ combien ce nombre est-il multiplié en ${{h}}$ heure{{if:h>1|s}} ?'
            + PUISSANCES,
            [var('m', '6|12|18|30'), var('k', '1..3'), var('h', 'eval:k*m/6')], '{{eval:k+1}}',
            ['En ${{h}}$ heure{{if:h>1|s}}, soit ${{eval:60*h}}$ minutes, le nombre double'
             ' $\\dfrac{ {{eval:60*h}} }{ {{m}} }={{eval:10*k}}$ fois : il est multiplié par'
             ' $2^{ {{eval:10*k}} }$.', DIX,
             'Il est multiplié par environ $' + col('10^{ {{eval:3*k}} }') + '$.'],
        ),
    ],
    [
        spec('2^10 ≈ 10³', 0, {'n': '10'}, '2', 'correct'),
        spec('Erreur : 2 × 10 = 20 ≈ 10', 0, {'n': '10'}, '0', 'incorrect'),
        spec('Erreur : 10²', 0, {'n': '10'}, '1', 'incorrect'),
        spec('2^20 ≈ 10⁶', 0, {'n': '20'}, '3', 'correct'),
        spec('Erreur : 2^20 pris pour 10³ × 2', 0, {'n': '20'}, '2', 'incorrect'),
        spec('2^30 ≈ 10⁹', 1, {'n': '30'}, '4', 'correct'),
        spec('Erreur : 10⁶ pour 30 demi-vies', 1, {'n': '30'}, '3', 'incorrect'),
        spec('12 min, 4 h : 20 doublements, 10⁶', 2, {'m': '12', 'k': '2', 'h': '4'}, '3',
             'correct'),
        spec('Erreur : 4 h comptées comme 4 doublements… (10)', 2, {'m': '12', 'k': '2', 'h': '4'},
             '0', 'incorrect'),
    ],
)

# --- T6, 1GEN-044 : seuil par le calcul (sans logarithme) -----------------------------------
# Réponse n ⩽ 20, cherchée par essais à la calculatrice. Corrigé : les deux puissances qui
# encadrent le seuil (pas de tableau complet : 0b686e01, 1GEN-061, le fait).

SEUIL_METHODE = ('On calcule à la calculatrice les valeurs successives (touche de puissance, ou'
                 ' tableau de valeurs) jusqu\'à franchir le seuil.')

T6 = modele(
    'Problème de seuil d\'une évolution exponentielle, par le calcul',
    'Premier rang n tel que k × qⁿ franchit un seuil : placement, médicament, population',
    2, 90,
    [
        variation(
            'Un capital de ${{c}}~\\unit{€}$ est placé à ${{t}}~\\%$ par an, à intérêts composés.'
            ' Au bout de $n$ années, il vaut ${{c}}\\times{{eval:1+t/100;d}}^n$ euros.\n\n'
            'Au bout de combien d\'années le capital atteindra-t-il ou dépassera-t-il'
            ' ${{s}}~\\unit{€}$ pour la première fois ?\n\n$n=?$',
            [var('c', '1000|2000|5000'), var('t', '4|5|6|8|10'), var('r', '1.5|2'),
             var('s', 'eval:c*r'), var('n', 'eval:floor(ln(r)/ln(1+t/100))+1')],
            '{{n}}',
            ['On cherche le plus petit entier $n$ tel que ${{c}}\\times{{eval:1+t/100;d}}^n'
             '\\geqslant{{s}}$. ' + SEUIL_METHODE,
             '${{c}}\\times{{eval:1+t/100;d}}^{ {{eval:n-1}} }\\approx'
             + r2('c*(1+t/100)^(n-1)') + '<{{s}}$ et ${{c}}\\times{{eval:1+t/100;d}}^{ {{n}} }'
             '\\approx' + r2('c*(1+t/100)^n') + '\\geqslant{{s}}$.',
             'Le capital atteint ${{s}}~\\unit{€}$ pour la première fois au bout de $'
             + col('{{n}}') + '$ années.'],
            ['n <= 20'],
        ),
        variation(
            'On injecte ${{q}}$ mg d\'un médicament dans le sang ; la quantité diminue de'
            ' ${{p}}~\\%$ par heure. Au bout de $n$ heures, il en reste'
            ' ${{q}}\\times{{eval:1-p/100;d}}^n$ mg.\n\n'
            'Au bout de combien d\'heures la quantité deviendra-t-elle inférieure à ${{s}}$ mg'
            ' ?\n\n$n=?$',
            [var('q', '100|200|500'), var('p', '10|20|25|30'), var('s', '5|10|20'),
             var('n', 'eval:floor(ln(s/q)/ln(1-p/100))+1')],
            '{{n}}',
            ['On cherche le plus petit entier $n$ tel que ${{q}}\\times{{eval:1-p/100;d}}^n<{{s}}$. '
             + SEUIL_METHODE,
             '${{q}}\\times{{eval:1-p/100;d}}^{ {{eval:n-1}} }\\approx'
             + r2('q*(1-p/100)^(n-1)') + '\\geqslant{{s}}$ et ${{q}}\\times{{eval:1-p/100;d}}^{ {{n}} }'
             '\\approx' + r2('q*(1-p/100)^n') + '<{{s}}$.',
             'La quantité passe sous ${{s}}$ mg au bout de $' + col('{{n}}') + '$ heures.'],
            ['n <= 20'],
        ),
        variation(
            'Une ville compte ${{v}}$ habitants ; sa population augmente de ${{t}}~\\%$ par an. Au'
            ' bout de $n$ années, elle compte ${{v}}\\times{{eval:1+t/100;d}}^n$ habitants.\n\n'
            'Au bout de combien d\'années la population dépassera-t-elle ${{w}}$ habitants ?'
            '\n\n$n=?$',
            [var('v', '20000|50000'), var('t', '2|3|5'), var('m', '1.2|1.3|1.5'),
             var('w', 'eval:v*m'), var('n', 'eval:floor(ln(m)/ln(1+t/100))+1')],
            '{{n}}',
            ['On cherche le plus petit entier $n$ tel que ${{v}}\\times{{eval:1+t/100;d}}^n>{{w}}$. '
             + SEUIL_METHODE,
             '${{v}}\\times{{eval:1+t/100;d}}^{ {{eval:n-1}} }\\approx'
             '{{eval:round(v*(1+t/100)^(n-1))}}\\leqslant{{w}}$ et'
             ' ${{v}}\\times{{eval:1+t/100;d}}^{ {{n}} }\\approx{{eval:round(v*(1+t/100)^n)}}>{{w}}$.',
             'La population dépasse ${{w}}$ habitants au bout de $' + col('{{n}}') + '$ années.'],
            ['n <= 20'],
        ),
    ],
    [
        spec('1000 € à 8 %, seuil 2000 : n = 10 (1,08⁹ ≈ 1,999)', 0,
             {'c': '1000', 't': '8', 'r': '2', 's': '2000', 'n': '10'}, '10', 'correct'),
        spec('Erreur : dernier rang sous le seuil (9)', 0,
             {'c': '1000', 't': '8', 'r': '2', 's': '2000', 'n': '10'}, '9', 'incorrect'),
        spec('Erreur : un an de trop (11)', 0,
             {'c': '1000', 't': '8', 'r': '2', 's': '2000', 'n': '10'}, '11', 'incorrect'),
        spec('Erreur : intérêts simples (100 / 8 → 13)', 0,
             {'c': '1000', 't': '8', 'r': '2', 's': '2000', 'n': '10'}, '13', 'incorrect'),
        spec('100 mg, −20 %, sous 10 mg : n = 11', 1,
             {'q': '100', 'p': '20', 's': '10', 'n': '11'}, '11', 'correct'),
        spec('Erreur : 10', 1, {'q': '100', 'p': '20', 's': '10', 'n': '11'}, '10', 'incorrect'),
        spec('Erreur : baisse linéaire (5)', 1, {'q': '100', 'p': '20', 's': '10', 'n': '11'}, '5',
             'incorrect'),
        spec('20 000 hab., +3 %, dépasse 30 000 : n = 14', 2,
             {'v': '20000', 't': '3', 'm': '1.5', 'w': '30000', 'n': '14'}, '14', 'correct'),
        spec('Erreur : 13', 2, {'v': '20000', 't': '3', 'm': '1.5', 'w': '30000', 'n': '14'}, '13',
             'incorrect'),
    ],
)

# --- T7, 1GEN-060 : seuil lu sur la courbe --------------------------------------------------


def t7_courbe(lignes, xmax, ymax, grille_x, grille_y, description, axes=''):
    return ('```courbe\nx: -0.5 ; ' + xmax + '\ny: -0.5 ; ' + ymax + '\ngrille: ' + grille_x
            + ' ; ' + grille_y + '\n' + axes + lignes + 'taille: moyenne\ndescription: '
            + description + '\n```')


T7 = modele(
    'Problème de seuil d\'une évolution exponentielle, sur un graphique',
    'Courbe de k × aˣ ou nuage d\'une suite géométrique et droite y = s : lire où le seuil est'
    ' franchi',
    1, 45,
    [
        variation(
            'La courbe $\\mathcal{C}_f$ ci-dessous représente la fonction $f$ définie sur'
            ' $[0\\,;6]$ par $f(x)={{if:k>1|{{k}}\\times}}{{a}}^x$ ; la droite tracée en'
            ' pointillés a pour équation $y={{s}}$.\n\n'
            + t7_courbe('f(x) = {{k}}*{{a}}^x sur [0 ; 6]   bleu   nom=\\mathcal{C}_f\n'
                        'g(x) = {{s}}   rouge   pointillé\n', '6.5', '17', '0.5', '1',
                        'Courbe croissante de f(x) = {{k}} × {{a}}^x sur [0 ; 6] et droite'
                        ' horizontale y = {{s}} ; abscisses graduées de 0,5 en 0,5.')
            + '\n\nÀ partir de quelle valeur de $x$ a-t-on $f(x)\\geqslant{{s}}$ ? Lis-la à une'
            ' demi-graduation près.\n\n$x\\approx ?$',
            [var('k', '1|2'), var('a', '1.4|1.5'), var('s', '3..12')],
            case(r2('ln(s/k)/ln(a)'), precision=tolerance(0.25)),
            ['On cherche où la courbe passe au-dessus de la droite $y={{s}}$ : on repère leur'
             ' point d\'intersection, puis on descend lire son abscisse.',
             'On lit $x\\approx' + col('{{eval:round(10*ln(s/k)/ln(a))/10;d}}') + '$ : $f$ est'
             ' croissante, donc $f(x)\\geqslant{{s}}$ pour tout $x$ à partir de cette valeur.'],
            ['k*a^6 <= 16', 's > k', 'ln(s/k)/ln(a) >= 0.5', 'ln(s/k)/ln(a) <= 5.5'],
        ),
        variation(
            'Après une injection, la quantité de médicament dans le sang, en mg, au bout de $x$'
            ' heures, est $f(x)={{k}}\\times{{a}}^x$. Sa courbe est tracée ci-dessous, avec la'
            ' droite d\'équation $y={{s}}$.\n\n'
            + t7_courbe('f(x) = {{k}}*{{a}}^x sur [0 ; 6]   bleu   nom=\\mathcal{C}_f\n'
                        'g(x) = {{s}}   rouge   pointillé\n', '6.5', '17', '0.5', '1',
                        'Courbe décroissante de f(x) = {{k}} × {{a}}^x sur [0 ; 6] et droite'
                        ' horizontale y = {{s}} ; abscisses graduées de 0,5 en 0,5.',
                        'axes: x = Heures ; y = mg\n')
            + '\n\nAu bout de combien de temps la quantité passe-t-elle sous ${{s}}$ mg ? Lis la'
            ' durée à une demi-graduation près.\n\n$x\\approx ?$',
            [var('k', '10|12|16'), var('a', '0.5|0.6|0.7'), var('s', '2..8')],
            case(r2('ln(s/k)/ln(a)'), precision=tolerance(0.25)),
            ['On cherche où la courbe passe sous la droite $y={{s}}$ : on repère leur point'
             ' d\'intersection, puis on descend lire son abscisse.',
             'On lit $x\\approx' + col('{{eval:round(10*ln(s/k)/ln(a))/10;d}}') + '$ heures :'
             ' $f$ est décroissante, donc la quantité reste sous ${{s}}$ mg ensuite.'],
            ['s < k', 'ln(s/k)/ln(a) >= 0.5', 'ln(s/k)/ln(a) <= 5.5'],
        ),
        variation(
            'Le nuage de points ci-dessous représente les premiers termes d\'une suite géométrique'
            ' $(u_n)$ : le point d\'abscisse $n$ a pour ordonnée $u_n$. La droite en pointillés a'
            ' pour équation $y={{s}}$.\n\n'
            + t7_courbe('u(n) = {{u}}*{{q}}^n pour n de 0 à 6   bleu\n'
                        'g(x) = {{s}}   rouge   pointillé\n', '6.5', '18', '1', '1',
                        'Nuage de 7 points (n ; u_n) pour n de 0 à 6, croissant, et droite'
                        ' horizontale y = {{s}}.')
            + '\n\nÀ partir de quel rang $n$ a-t-on $u_n>{{s}}$ ?\n\n$n=?$',
            [var('u', '1|1.5'), var('q', '1.5|1.6'), var('s', '2..14'),
             var('n', 'eval:floor(ln(s/u)/ln(q))+1')],
            '{{n}}',
            ['On cherche le premier point situé au-dessus de la droite $y={{s}}$.',
             'Le point de rang ${{eval:n-1}}$ est au-dessous ($u_{ {{eval:n-1}} }\\approx'
             + r2('u*q^(n-1)') + '$), celui de rang ${{n}}$ au-dessus ($u_{ {{n}} }\\approx'
             + r2('u*q^n') + '$).',
             'La suite est croissante : $u_n>{{s}}$ à partir du rang $n=' + col('{{n}}') + '$.'
             ' Attention, le premier point est celui de rang $0$.'],
            ['n >= 1', 'n <= 6', 'u*q^6 <= 17.5', 'u*q^n - s >= 0.4', 's - u*q^(n-1) >= 0.4'],
        ),
    ],
    [
        spec('1,5^x ⩾ 5 : x ≈ 3,97 → 4 accepté', 0, {'k': '1', 'a': '1.5', 's': '5'}, '4',
             'correct'),
        spec('Erreur : lecture à 3,5', 0, {'k': '1', 'a': '1.5', 's': '5'}, '3,5', 'incorrect'),
        spec('Erreur : image de 5 lue (≈ 7,6)', 0, {'k': '1', 'a': '1.5', 's': '5'}, '7,6',
             'incorrect'),
        spec('16 × 0,5^x < 4 : x = 2', 1, {'k': '16', 'a': '0.5', 's': '4'}, '2', 'correct'),
        spec('16 × 0,5^x < 4 : 2,2 accepté', 1, {'k': '16', 'a': '0.5', 's': '4'}, '2,2',
             'correct'),
        spec('Erreur : 2,5', 1, {'k': '16', 'a': '0.5', 's': '4'}, '2,5', 'incorrect'),
        spec('1, 1,5, 2,25, 3,375, 5,06 : u_n > 4 dès n = 4', 2,
             {'u': '1', 'q': '1.5', 's': '4', 'n': '4'}, '4', 'correct'),
        spec('Erreur : rang du dernier point sous la droite (3)', 2,
             {'u': '1', 'q': '1.5', 's': '4', 'n': '4'}, '3', 'incorrect'),
        spec('Erreur : rang compté à partir de 1 (5)', 2,
             {'u': '1', 'q': '1.5', 's': '4', 'n': '4'}, '5', 'incorrect'),
    ],
    shared={'blankDefaults': {'acceptDecimal': True}},
)

MODELES = [('01-taux-moyen-evolutions-successives', T1),
           ('02-taux-moyen-entre-deux-valeurs', T2),
           ('03-reconnaitre-evolution-exponentielle', T3),
           ('04-modeliser-fonction-exponentielle', T4),
           ('05-ordre-de-grandeur-exponentielle', T5),
           ('06-seuil-par-le-calcul', T6),
           ('07-seuil-sur-un-graphique', T7)]

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    chemin = os.path.join(DOSSIER, nom + '.json')
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
    print('écrit', chemin)
