"""Écrit les 10 modèles du lot « suites : modélisation et algorithmes » de la 1re spé dans
scripts/questions/1spe-suites/.

Phase 0 validée par David le 2026-11-01 (« je valide » sur les recos, § 20 du journal
« docs/wip/questions-1spe-progress.md »), un point par modèle :

| #  | Point    | Titre                                         | Catégorie, niveau                                          |
| 1  | 1SPE-214 | Évolution à accroissement constant            | Suites › Modélisation › Évolutions successives, 1          |
| 2  | 1SPE-217 | Évolution à taux constant                     | Suites › Modélisation › Évolutions successives, 2          |
| 3  | 1SPE-372 | Suite arithmétique et fonction affine         | Suites › Suites arithmétiques › Fonction affine, 1         |
| 4  | 1SPE-374 | Évolution exponentielle et suite géométrique  | Fonctions › Fonction exponentielle › Suites et modélisation, 3 |
| 5  | 1SPE-375 | De l'énoncé à l'expression de la suite        | Suites › Modélisation › De l'énoncé à la suite, 1          |
| 6  | 1SPE-378 | Termes d'une suite donnée par un algorithme   | Suites › Seuil et algorithmes › Algorithmes, 3             |
| 7  | 1SPE-369 | Reconnaître la suite que génère un algorithme | Suites › Seuil et algorithmes › Algorithmes, 4             |
| 8  | 1SPE-370 | Motif : nombre d'éléments à une étape         | Suites › Apprivoiser › Motifs, 1                           |
| 9  | 1SPE-222 | Motif : relation explicite                    | Suites › Apprivoiser › Motifs, 2                           |
| 10 | 1SPE-376 | Motif : relation de récurrence                | Suites › Apprivoiser › Motifs, 3                           |

Niveaux relevés en prod le 2026-11-01, tous niveaux scolaires confondus (Algorithmes : 1 et 2 pris ;
Fonction exponentielle › Suites et modélisation : 1 et 2 pris ; les autres catégories sont neuves).

Voisins à ne pas répéter : aeb1389d (pourcentage → raison, uₙ ; 379), 31a77ba9 (terme(n) Python,
u ← au + b ; 236), ca8f40c2 (f(x + 1)/f(x) pour e^{ax} ; 293).

Décisions (David, 2026-11-01) : Q1 récurrence en réponse = deux cases « uₙ₊₁ = ? × uₙ + ? » (le
juge n'a jamais reçu uₙ) ; le modèle 10 garde « uₙ + ? », une case en n ; Q2 motifs dessinés en
« ```figure », étapes dessinées fixes, seule l'étape demandée (ou la numérotation) varie ; Q3 quatre
catégories neuves.

Bornes : « lycee/1spe.json » (suites arithmétiques et géométriques seules formalisées, d'autres
types simples rencontrés sans connaissance spécifique ; algorithmique en Python ou langage naturel,
affectation « ← », listes seulement ; pas de logarithme).

    python3 docs/wip/questions/lot-1spe-suites.py scripts/questions/1spe-suites
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(nom, title, description, theme, domain, subdomain, level, variations, specs, delay=60):
    return nom, {'title': title, 'description': description, 'grades': ['1_SPE'],
                 'theme': theme, 'domain': domain, 'subdomain': subdomain,
                 'level': level, 'delay': delay, 'status': 'draft',
                 'shared': {'cleanCoefficients': True},
                 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None):
    """« answers » : chaînes (attendu seul) ou dictionnaires de case complets."""
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [a if isinstance(a, dict) else {'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def ev(x):
    return '{{eval:' + x + '}}'


def evd(x):
    return '{{eval:' + x + ';d}}'


def evp(x):
    """Valeur signée, pour l'écrire après un terme : « + 3 », « − 3 »."""
    return '{{eval:' + x + ';+}}'


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + l + '\n' for l in lignes) + '```'


def code(lignes, langage=''):
    return '\n\n```' + langage + '\n' + '\n'.join(lignes) + '\n```'


MODELES = []

# --- 1. 1SPE-214 : évolution à accroissement constant ----------------------------------------

V214_TABLEAU = variation(
    'Le tableau donne le nombre d\'adhérents d\'un club de sport.\n\n'
    '| Année | 2021 | 2022 | 2023 | 2024 |\n| --- | --- | --- | --- | --- |\n'
    '| Adhérents | $' + ev('a') + '$ | $' + ev('a+r') + '$ | $' + ev('a+2*r') + '$ | $'
    + ev('a+3*r') + '$ |\n\n'
    'On suppose que le nombre d\'adhérents continue d\'évoluer de la même façon.\n\n'
    'Combien le club comptera-t-il d\'adhérents en 2030 ?\n\n$?$ adhérents',
    [var('a', '300..900'), var('r', '12..48')], [ev('a+9*r')],
    ['D\'une année à l\'autre, le nombre d\'adhérents augmente toujours de $' + ev('r') + '$ :'
     ' l\'accroissement est **constant**. Le nombre d\'adhérents $n$ années après 2021 est le terme'
     ' $u_n$ d\'une suite arithmétique de premier terme $u_0=' + ev('a') + '$ et de raison $r='
     + ev('r') + '$.',
     '2030 correspond à $n=2030-2021=9$ : $u_9=u_0+9r=' + ev('a') + '+9\\times' + ev('r') + '$.',
     '$$u_9=' + col(ev('a+9*r')) + '$$'])
V214_DEUX_ANNEES = variation(
    'Une usine produisait $' + ev('a') + '$ tonnes de papier en 2022 et $' + ev('a+5*r')
    + '$ tonnes en 2027. Sa production a varié chaque année de la même quantité.\n\n'
    'De combien de tonnes a-t-elle varié chaque année (nombre négatif pour une baisse) ?\n\n'
    '$?$ tonnes par an',
    [var('a', '800..1500'), var('r', '5..40;±')], [ev('r')],
    ['La production varie chaque année de la même quantité $r$ : c\'est une suite arithmétique'
     ' de raison $r$.',
     'De 2022 à 2027, il y a $5$ ans : $' + ev('a+5*r') + '=' + ev('a') + '+5r$, donc $5r='
     + ev('5*r') + '$.',
     '$$r=' + col(ev('r')) + '$$'])
V214_RANGS = variation(
    'Dans une salle de spectacle, le premier rang compte $' + ev('a') + '$ sièges et chaque rang'
    ' compte $' + ev('r') + '$ sièges de plus que le précédent.\n\n'
    'Combien de sièges compte le rang numéro $' + ev('k') + '$ ?\n\n$?$ sièges',
    [var('a', '10..18'), var('r', '2..4'), var('k', '10..20')], [ev('a+(k-1)*r')],
    ['Le nombre de sièges du rang $n$ est le terme $u_n$ d\'une suite arithmétique de premier'
     ' terme $u_1=' + ev('a') + '$ et de raison $' + ev('r') + '$.',
     'Du rang $1$ au rang $' + ev('k') + '$, on ajoute $' + ev('k-1') + '$ fois la raison :'
     ' $u_{' + ev('k') + '}=u_1+' + ev('k-1') + '\\times' + ev('r') + '$.',
     '$$u_{' + ev('k') + '}=' + col(ev('a+(k-1)*r')) + '$$'])

MODELES.append(modele(
    '01-accroissement-constant', 'Évolution à accroissement constant',
    'Évolutions successives à accroissement constant = suite arithmétique : prévoir une valeur,'
    ' retrouver l\'accroissement entre deux années éloignées, rangs de sièges (premier terme u₁)',
    'Suites', 'Modélisation', 'Évolutions successives', 1,
    [V214_TABLEAU, V214_DEUX_ANNEES, V214_RANGS],
    [spec('2030 : a + 9r', 0, {'a': 500, 'r': 20}, '680', 'correct'),
     spec('Erreur : a + 8r', 0, {'a': 500, 'r': 20}, '660', 'incorrect'),
     spec('Baisse : r = −12', 1, {'a': 1000, 'r': -12}, '-12', 'correct'),
     spec('Erreur : signe oublié', 1, {'a': 1000, 'r': -12}, '12', 'incorrect'),
     spec('Erreur : écart total', 1, {'a': 1000, 'r': -12}, '-60', 'incorrect'),
     spec('Rang 15 : 12 + 14 × 3', 2, {'a': 12, 'r': 3, 'k': 15}, '54', 'correct'),
     spec('Erreur : 12 + 15 × 3', 2, {'a': 12, 'r': 3, 'k': 15}, '57', 'incorrect')]))

# --- 2. 1SPE-217 : évolution à taux constant -------------------------------------------------

V217_HAUSSE = variation(
    'Le nombre d\'habitants d\'une commune a été relevé trois années de suite :\n\n'
    '| Année | 2023 | 2024 | 2025 |\n| --- | --- | --- | --- |\n'
    '| Habitants | $' + ev('c*10000') + '$ | $' + ev('c*100*(100+t)') + '$ | $'
    + ev('c*(100+t)^2') + '$ |\n\n'
    'Le nombre d\'habitants évolue chaque année avec le même taux. Quel est ce taux ?\n\n'
    'Le nombre d\'habitants augmente de $?\\,\\%$ par an.',
    [var('c', '1..3'), var('t', '2..8')], [ev('t')],
    ['Le rapport de deux termes consécutifs est constant :'
     ' $\\dfrac{' + ev('c*100*(100+t)') + '}{' + ev('c*10000') + '}=\\dfrac{' + ev('c*(100+t)^2')
     + '}{' + ev('c*100*(100+t)') + '}=' + evd('1+t/100') + '$.',
     'Multiplier par $' + evd('1+t/100') + '=1+\\dfrac{' + ev('t') + '}{100}$, c\'est augmenter'
     ' de $' + col(ev('t') + '\\,\\%') + '$ : la suite est géométrique de raison $'
     + evd('1+t/100') + '$.'])
V217_BAISSE = variation(
    'La valeur d\'une machine a été estimée trois années de suite :\n\n'
    '| Année | 2023 | 2024 | 2025 |\n| --- | --- | --- | --- |\n'
    '| Valeur (en €) | $' + ev('c*10000') + '$ | $' + ev('c*100*(100-t)') + '$ | $'
    + ev('c*(100-t)^2') + '$ |\n\n'
    'La valeur baisse chaque année avec le même taux. Quel est ce taux ?\n\n'
    'La valeur baisse de $?\\,\\%$ par an.',
    [var('c', '2..8'), var('t', '2..10')], [ev('t')],
    ['Le rapport de deux termes consécutifs est constant :'
     ' $\\dfrac{' + ev('c*100*(100-t)') + '}{' + ev('c*10000') + '}=\\dfrac{' + ev('c*(100-t)^2')
     + '}{' + ev('c*100*(100-t)') + '}=' + evd('1-t/100') + '$.',
     'Multiplier par $' + evd('1-t/100') + '=1-\\dfrac{' + ev('t') + '}{100}$, c\'est baisser'
     ' de $' + col(ev('t') + '\\,\\%') + '$ : la suite est géométrique de raison $'
     + evd('1-t/100') + '$.'])
V217_GLOBAL2 = variation(
    'Le prix d\'un abonnement augmente de $' + ev('t') + '\\,\\%$ par an pendant deux années'
    ' consécutives.\n\nDe quel pourcentage a-t-il augmenté en tout sur ces deux années ?\n\n'
    'Le prix a augmenté de $?\\,\\%$.',
    [var('t', '2..30')], [evd('2*t+t^2/100')],
    ['Augmenter de $' + ev('t') + '\\,\\%$, c\'est multiplier par $' + evd('1+t/100')
     + '$. Deux années de suite : on multiplie par $' + evd('1+t/100') + '^2=' + evd('(1+t/100)^2')
     + '$.',
     'Les pourcentages ne s\'ajoutent pas : multiplier par $' + evd('(1+t/100)^2') + '$, c\'est'
     ' augmenter de $' + col(evd('2*t+t^2/100') + '\\,\\%') + '$, et non de $' + ev('2*t')
     + '\\,\\%$.'])
V217_GLOBAL3 = variation(
    'Une population de bactéries augmente de $' + ev('t') + '\\,\\%$ par heure pendant trois'
    ' heures.\n\nDe quel pourcentage a-t-elle augmenté en tout sur ces trois heures ?\n\n'
    'La population a augmenté de $?\\,\\%$.',
    [var('t', '10|20|50')], [evd('((1+t/100)^3-1)*100')],
    ['Augmenter de $' + ev('t') + '\\,\\%$, c\'est multiplier par $' + evd('1+t/100')
     + '$. Trois heures de suite : on multiplie par $' + evd('1+t/100') + '^3='
     + evd('(1+t/100)^3') + '$.',
     'Les pourcentages ne s\'ajoutent pas : multiplier par $' + evd('(1+t/100)^3') + '$, c\'est'
     ' augmenter de $' + col(evd('((1+t/100)^3-1)*100') + '\\,\\%') + '$, et non de $'
     + ev('3*t') + '\\,\\%$.'])

MODELES.append(modele(
    '02-taux-constant', 'Évolution à taux constant',
    'Évolutions successives à taux constant = suite géométrique : taux lu par le rapport de deux'
    ' termes consécutifs (hausse, baisse), taux global de deux ou trois évolutions',
    'Suites', 'Modélisation', 'Évolutions successives', 2,
    [V217_HAUSSE, V217_BAISSE, V217_GLOBAL2, V217_GLOBAL3],
    [spec('10 000 ; 10 400 ; 10 816 : 4 %', 0, {'c': 1, 't': 4}, '4', 'correct'),
     spec('Erreur : le coefficient 1,04', 0, {'c': 1, 't': 4}, '1,04', 'incorrect'),
     spec('Erreur : l\'écart 400', 0, {'c': 1, 't': 4}, '400', 'incorrect'),
     spec('Baisse de 5 %', 1, {'c': 2, 't': 5}, '5', 'correct'),
     spec('Erreur : coefficient 0,95', 1, {'c': 2, 't': 5}, '0,95', 'incorrect'),
     spec('2 × 10 % : 21 %', 2, {'t': 10}, '21', 'correct'),
     spec('Erreur : 20 %', 2, {'t': 10}, '20', 'incorrect'),
     spec('2 × 15 % : 32,25 %', 2, {'t': 15}, '32,25', 'correct'),
     spec('3 × 10 % : 33,1 %', 3, {'t': 10}, '33,1', 'correct'),
     spec('Erreur : 30 %', 3, {'t': 10}, '30', 'incorrect'),
     spec('Erreur : coefficient 1,331', 3, {'t': 10}, '1,331', 'incorrect')]))

# --- 3. 1SPE-372 : suite arithmétique et fonction affine -------------------------------------

V372_F = variation(
    'Soit $f$ la fonction affine définie sur $\\mathbb{R}$ par $f(x)=' + ev('a') + 'x' + evp('b')
    + '$. Pour tout entier naturel $n$, on pose $u_n=f(n)$.\n\n'
    'La suite $(u_n)$ est arithmétique. Donne son premier terme et sa raison.\n\n'
    '$u_0=?$ et $r=?$',
    [var('a', '1..9;±'), var('b', '1..12;±')], [ev('b'), ev('a')],
    ['$u_0=f(0)=' + ev('b') + '$.',
     '$u_{n+1}-u_n=f(n+1)-f(n)=' + ev('a') + '(n+1)' + evp('b') + '-(' + ev('a') + 'n'
     + evp('b') + ')=' + ev('a') + '$ : la raison est le coefficient directeur de $f$.',
     '$u_0=' + col(ev('b')) + '$ et $r=' + col(ev('a'), 1) + '$.'],
    ['a != b'])
V372_DROITE = variation(
    'La suite $(u_n)$ est arithmétique, de premier terme $u_0=' + ev('b') + '$ et de raison $r='
    + ev('a') + '$. Dans un repère, les points de coordonnées $(n\\,;u_n)$ sont alignés.\n\n'
    'Donne une équation de la droite qui les porte.\n\n$y=?$',
    [var('a', '1..6;±'), var('b', '1..10;±')], [ev('a') + 'x' + evp('b')],
    ['Pour tout $n$, $u_n=u_0+nr=' + ev('b') + evp('a') + 'n$ : le point $(n\\,;u_n)$ est sur la'
     ' droite d\'équation $y=' + ev('a') + 'x' + evp('b') + '$.',
     'Le coefficient directeur est la raison, l\'ordonnée à l\'origine est $u_0$ :'
     ' $y=' + col(ev('a') + 'x' + evp('b')) + '$.'],
    ['a != b'])
V372_DEUX_POINTS = variation(
    'La suite $(u_n)$ est arithmétique, avec $u_2=' + ev('b+2*a') + '$ et $u_6=' + ev('b+6*a')
    + '$. Dans un repère, les points de coordonnées $(n\\,;u_n)$ sont alignés.\n\n'
    'Donne une équation de la droite qui les porte.\n\n$y=?$',
    [var('a', '1..6;±'), var('b', '1..10;±')], [ev('a') + 'x' + evp('b')],
    ['La droite passe par $(2\\,;' + ev('b+2*a') + ')$ et $(6\\,;' + ev('b+6*a') + ')$ : son'
     ' coefficient directeur est $\\dfrac{' + ev('b+6*a') + '-(' + ev('b+2*a') + ')}{6-2}='
     + ev('a') + '$, c\'est la raison de la suite.',
     'Ordonnée à l\'origine : $u_0=u_2-2r=' + ev('b+2*a') + '-(' + ev('2*a') + ')=' + ev('b')
     + '$.',
     '$$y=' + col(ev('a') + 'x' + evp('b')) + '$$'],
    ['a != b'])

MODELES.append(modele(
    '03-arithmetique-et-affine', 'Suite arithmétique et fonction affine',
    'uₙ = f(n) avec f affine : premier terme et raison ; nuage aligné : équation de la droite par'
    ' u₀ et r, ou par deux termes',
    'Suites', 'Suites arithmétiques', 'Fonction affine', 1,
    [V372_F, V372_DROITE, V372_DEUX_POINTS],
    [spec('f(x) = 3x − 5 : u₀ = −5, r = 3', 0, {'a': 3, 'b': -5}, ['-5', '3'], 'correct'),
     spec('Erreur : inversés', 0, {'a': 3, 'b': -5}, ['3', '-5'], 'incorrect'),
     spec('u₀ = 4, r = −2 : y = −2x + 4', 1, {'a': -2, 'b': 4}, '-2x+4', 'correct'),
     spec('Écriture 4 − 2x', 1, {'a': -2, 'b': 4}, '4-2x', 'correct'),
     spec('Erreur : y = 4x − 2', 1, {'a': -2, 'b': 4}, '4x-2', 'incorrect'),
     spec('u₂ = 7, u₆ = 19 : y = 3x + 1', 2, {'a': 3, 'b': 1}, '3x+1', 'correct'),
     spec('Erreur : 12/6 = 2 pour la pente', 2, {'a': 3, 'b': 1}, '2x+3', 'incorrect')]))

# --- 4. 1SPE-374 : évolution exponentielle et suite géométrique -------------------------------

V374_RAISON = variation(
    'La masse (en grammes) d\'un produit radioactif au bout de $t$ années est'
    ' $m(t)=' + ev('m0') + 'e^{-' + evd('k') + 't}$. On relève la masse chaque année : on pose'
    ' $m_n=m(n)$ pour tout entier naturel $n$.\n\n'
    'La suite $(m_n)$ est géométrique. Donne sa raison, arrondie au millième.\n\n$q\\approx ?$',
    [var('m0', '20..90'), var('k', '0.1|0.2|0.05|0.3')],
    [{'expectedAnswer': evd('round(e^(-k)*1000)/1000'),
      'precision': {'type': 'decimal', 'digits': 3}}],
    ['$m_{n+1}=' + ev('m0') + 'e^{-' + evd('k') + '(n+1)}=' + ev('m0') + 'e^{-' + evd('k')
     + 'n}\\times e^{-' + evd('k') + '}=m_n\\times e^{-' + evd('k') + '}$.',
     'La suite est géométrique de raison $q=e^{-' + evd('k') + '}\\approx'
     + col(evd('round(e^(-k)*1000)/1000')) + '$ : à temps discret, chaque année multiplie la'
     ' masse par le même nombre.'])
V374_TAUX = variation(
    'Une population compte $P(t)=' + ev('p0') + 'e^{' + evd('k') + 't}$ individus au bout de $t$'
    ' années. On pose $u_n=P(n)$ pour tout entier naturel $n$.\n\n'
    'De quel pourcentage la population augmente-t-elle chaque année ? Arrondis au dixième.\n\n'
    'Elle augmente d\'environ $?\\,\\%$ par an.',
    [var('p0', '1000..5000'), var('k', '0.04|0.05|0.06|0.08|0.1')],
    [{'expectedAnswer': evd('round((e^k-1)*1000)/10'),
      'precision': {'type': 'decimal', 'digits': 1}}],
    ['$u_{n+1}=u_n\\times e^{' + evd('k') + '}$ : la suite $(u_n)$ est géométrique de raison'
     ' $e^{' + evd('k') + '}\\approx' + evd('round(e^k*10000)/10000') + '$.',
     'Multiplier par $' + evd('round(e^k*10000)/10000') + '$, c\'est augmenter d\'environ $'
     + col(evd('round((e^k-1)*1000)/10') + '\\,\\%') + '$ (et non de $' + evd('100*k')
     + '\\,\\%$).'])
V374_DEMI = variation(
    'Une quantité vaut $Q(t)=' + ev('q0') + 'e^{' + evd('k') + 't}$ au bout de $t$ années, $t$'
    ' réel positif. Chaque année, elle est multipliée par $e^{' + evd('k') + '}$.\n\n'
    'Par quel nombre est-elle multipliée en une demi-année ? Donne la valeur exacte.\n\n'
    '$\\dfrac{Q(t+0{,}5)}{Q(t)}=?$',
    [var('q0', '100..900'), var('k', '0.1|0.2|0.3|0.4|0.6')], ['e^{' + evd('k/2') + '}'],
    ['$Q(t+0{,}5)=' + ev('q0') + 'e^{' + evd('k') + '(t+0{,}5)}=' + ev('q0') + 'e^{' + evd('k')
     + 't}\\times e^{' + evd('k/2') + '}$.',
     'Le temps est continu : entre deux relevés annuels, la quantité est multipliée par $'
     + col('e^{' + evd('k/2') + '}') + '$ en une demi-année, et deux demi-années donnent bien $e^{'
     + evd('k/2') + '}\\times e^{' + evd('k/2') + '}=e^{' + evd('k') + '}$.'])

MODELES.append(modele(
    '04-exponentielle-et-geometrique', 'Évolution exponentielle et suite géométrique',
    'Temps continu f(t) = Ce^{kt}, temps discret uₙ = f(n) : raison e^{−k} arrondie, taux annuel'
    ' e^k − 1 en %, facteur d\'une demi-année e^{k/2}',
    'Fonctions', 'Fonction exponentielle', 'Suites et modélisation', 3,
    [V374_RAISON, V374_TAUX, V374_DEMI],
    [spec('e^{−0,1} ≈ 0,905', 0, {'m0': 80, 'k': 0.1}, '0,905', 'correct'),
     spec('Erreur : 0,9 (1 − k)', 0, {'m0': 80, 'k': 0.1}, '0,9', 'incorrect'),
     spec('Erreur : −0,1', 0, {'m0': 80, 'k': 0.1}, '-0,1', 'incorrect'),
     spec('e^{0,05} − 1 ≈ 5,1 %', 1, {'p0': 2000, 'k': 0.05}, '5,1', 'correct'),
     spec('Erreur : 5 % (k × 100)', 1, {'p0': 2000, 'k': 0.05}, '5', 'incorrect'),
     spec('e^{0,1} − 1 ≈ 10,5 %', 1, {'p0': 2000, 'k': 0.1}, '10,5', 'correct'),
     spec('Demi-année : e^{0,1}', 2, {'q0': 300, 'k': 0.2}, 'e^{0,1}', 'correct'),
     spec('Erreur : e^{0,2}/2', 2, {'q0': 300, 'k': 0.2}, '\\frac{e^{0,2}}{2}', 'incorrect'),
     spec('Erreur : e^{0,2}', 2, {'q0': 300, 'k': 0.2}, 'e^{0,2}', 'incorrect')]))

# --- 5. 1SPE-375 : de l'énoncé à l'expression de la suite ------------------------------------

V375_EXPLICITE = variation(
    'Léa a $' + ev('a') + '~\\unit{€}$ sur son compte en janvier, et y verse $' + ev('r')
    + '~\\unit{€}$ à la fin de chaque mois. On note $u_n$ la somme sur son compte $n$ mois après'
    ' janvier, avec $u_0=' + ev('a') + '$.\n\nExprime $u_n$ en fonction de $n$.\n\n$u_n=?$',
    [var('a', '20..150'), var('r', '10..60')], [ev('a') + '+' + ev('r') + 'n'],
    ['Chaque mois, la somme augmente de $' + ev('r') + '$ : $(u_n)$ est arithmétique de raison $'
     + ev('r') + '$ et de premier terme $u_0=' + ev('a') + '$.',
     '$$u_n=u_0+nr=' + col(ev('a') + '+' + ev('r') + 'n') + '$$'])
V375_LAC = variation(
    'Un lac contient $' + ev('n0') + '$ poissons. Chaque année, $' + ev('p') + '\\,\\%$ des'
    ' poissons meurent, puis on en introduit $' + ev('100*j') + '$. On note $u_n$ le nombre de'
    ' poissons au bout de $n$ années.\n\nComplète la relation de récurrence.\n\n'
    '$u_{n+1}=?\\times u_n+?$',
    [var('n0', '2000..6000'), var('p', '10|15|20|25|30'), var('j', '1..5')],
    [evd('1-p/100'), ev('100*j')],
    ['Perdre $' + ev('p') + '\\,\\%$ des poissons, c\'est multiplier leur nombre par $1-\\dfrac{'
     + ev('p') + '}{100}=' + evd('1-p/100') + '$.',
     'On ajoute ensuite les $' + ev('100*j') + '$ poissons introduits :'
     ' $u_{n+1}=' + col(evd('1-p/100')) + '\\times u_n+' + col(ev('100*j'), 1) + '$.'])
V375_INSCRITS = variation(
    'Un site compte $' + ev('a') + '$ inscrits le premier jour. Chaque jour, le nombre d\'inscrits'
    ' {{if:k==2|double|triple}}, puis $' + ev('d') + '$ personnes se désinscrivent. On note $u_n$'
    ' le nombre d\'inscrits le $n$-ième jour.\n\nComplète la relation de récurrence.\n\n'
    '$u_{n+1}=?\\times u_n+?$',
    [var('a', '20..80'), var('k', '2|3'), var('d', '2..15')], [ev('k'), ev('-d')],
    ['Le nombre d\'inscrits {{if:k==2|double|triple}} : on multiplie $u_n$ par $' + ev('k')
     + '$.',
     '$' + ev('d') + '$ personnes partent : on retranche $' + ev('d') + '$, c\'est-à-dire qu\'on'
     ' ajoute $' + ev('-d') + '$.',
     '$$u_{n+1}=' + col(ev('k')) + '\\times u_n' + col('-' + ev('d'), 1)
     + '$$'])
V375_PREMIER_U1 = variation(
    'Hugo prépare un semi-marathon. La première semaine, il court $' + ev('a') + '~\\unit{km}$ ;'
    ' chaque semaine, il court $' + ev('r') + '~\\unit{km}$ de plus que la semaine précédente.'
    ' On note $u_n$ la distance courue la $n$-ième semaine, avec $u_1=' + ev('a') + '$.\n\n'
    'Exprime $u_n$ en fonction de $n$.\n\n$u_n=?$',
    [var('a', '8..15'), var('r', '2..5')],
    [{'expectedAnswer': ev('a-r') + '+' + ev('r') + 'n', 'requiredForm': {'pattern': 'u'}}],
    ['$(u_n)$ est arithmétique de raison $' + ev('r') + '$, mais son premier terme est $u_1='
     + ev('a') + '$ : de $u_1$ à $u_n$, on ajoute $n-1$ fois la raison.',
     '$u_n=u_1+(n-1)r=' + ev('a') + '+' + ev('r') + '(n-1)$.',
     '$$u_n=' + col(ev('r') + 'n+' + ev('a-r')) + '$$'],
    ['a > r'])

MODELES.append(modele(
    '05-enonce-et-expression', 'De l\'énoncé à l\'expression de la suite',
    'Traduire un énoncé en langage naturel : forme explicite (u₀ ou u₁ premier terme), relation'
    ' de récurrence uₙ₊₁ = a × uₙ + b (deux cases)',
    'Suites', 'Modélisation', 'De l\'énoncé à la suite', 1,
    [V375_EXPLICITE, V375_LAC, V375_INSCRITS, V375_PREMIER_U1],
    [spec('120 + 25n', 0, {'a': 120, 'r': 25}, '120+25n', 'correct'),
     spec('Écriture 25n + 120', 0, {'a': 120, 'r': 25}, '25n+120', 'correct'),
     spec('Erreur : 25 + 120n', 0, {'a': 120, 'r': 25}, '25+120n', 'incorrect'),
     spec('Lac 20 %, +300 : 0,8 et 300', 1, {'n0': 5000, 'p': 20, 'j': 3}, ['0,8', '300'],
          'correct'),
     spec('Erreur : 0,2 (le taux)', 1, {'n0': 5000, 'p': 20, 'j': 3}, ['0,2', '300'],
          'incorrect'),
     spec('Erreur : −0,2', 1, {'n0': 5000, 'p': 20, 'j': 3}, ['-0,2', '300'], 'incorrect'),
     spec('Double, −5 : 2 et −5', 2, {'a': 40, 'k': 2, 'd': 5}, ['2', '-5'], 'correct'),
     spec('Erreur : +5', 2, {'a': 40, 'k': 2, 'd': 5}, ['2', '5'], 'incorrect'),
     spec('u₁ = 10, +3 : 3n + 7', 3, {'a': 10, 'r': 3}, '3n+7', 'correct'),
     spec('Écriture 10 + 3(n − 1)', 3, {'a': 10, 'r': 3}, '10+3(n-1)', 'correct'),
     spec('Erreur : 10 + 3n (u₀ supposé)', 3, {'a': 10, 'r': 3}, '10+3n', 'incorrect')]))

# --- 6. 1SPE-378 : termes d'une suite donnée par un algorithme -------------------------------

V378_NATUREL = variation(
    'On considère l\'algorithme suivant, écrit en langage naturel.'
    + code(['u ← ' + ev('a'),
            'Pour i allant de 1 à 3 :',
            '    u ← u² − ' + ev('c'),
            'Fin Pour',
            'Afficher u'])
    + '\n\nQuelle valeur est affichée ?\n\n$?$',
    [var('a', '1..3'), var('c', '1..3'), var('w1', 'a^2-c'), var('w2', 'w1^2-c'),
     var('w3', 'w2^2-c')], [ev('w3')],
    ['La boucle est parcourue trois fois ; on calcule $u$ à chaque passage.',
     'Passage 1 : $u=' + ev('a') + '^2-' + ev('c') + '=' + ev('w1') + '$. Passage 2 : $u='
     + '{{if:w1<0|(' + ev('w1') + ')|' + ev('w1') + '}}^2-' + ev('c') + '=' + ev('w2') + '$.',
     'Passage 3 : $u={{if:w2<0|(' + ev('w2') + ')|' + ev('w2') + '}}^2-' + ev('c') + '='
     + col(ev('w3')) + '$.'],
    ['abs(w3) <= 2000', 'w1 != 0'])
V378_LISTE = variation(
    'On considère le programme Python suivant.'
    + code(['L = [' + ev('a') + ']',
            'for k in range(1, 5):',
            '    L.append(L[k - 1] + ' + ev('b') + ' * k)'], 'python')
    + '\n\nQue vaut `L[' + ev('q') + ']` à la fin du programme ?\n\n$?$',
    [var('a', '1..9'), var('b', '2..5'), var('q', '3|4')], [ev('a+b*q*(q+1)/2')],
    ['La liste commence par `L[0] = ' + ev('a') + '`. À chaque tour, on ajoute à la fin le'
     ' dernier élément augmenté de $' + ev('b') + '\\times k$.',
     '`L[1]` $=' + ev('a+b') + '$, `L[2]` $=' + ev('a+3*b') + '$, `L[3]` $=' + ev('a+6*b')
     + '$, `L[4]` $=' + ev('a+10*b') + '$.',
     'Les indices commencent à $0$ : `L[' + ev('q') + ']` $=' + col(ev('a+b*q*(q+1)/2')) + '$.'])
V378_DEUX = variation(
    'On considère le programme Python suivant.'
    + code(['a, b = ' + ev('p') + ', ' + ev('s'),
            'for i in range(' + ev('n') + '):',
            '    a, b = b, a + b',
            'print(a)'], 'python')
    + '\n\nQuelle valeur est affichée ?\n\n$?$',
    [var('p', '1..3'), var('s', '1..4'), var('n', '4|5')], [ev('(n-2)*p+(2*n-5)*s')],
    ['À chaque tour, `a` prend la valeur de `b`, et `b` la somme des deux : chaque terme est la'
     ' somme des deux précédents.',
     'Valeurs successives de `a` : $' + ev('p') + '$, $' + ev('s') + '$, $' + ev('p+s')
     + '$, $' + ev('p+2*s') + '$, $' + ev('2*p+3*s') + '$, $' + ev('3*p+5*s') + '$…',
     'Après $' + ev('n') + '$ tours, `a` vaut $' + col(ev('(n-2)*p+(2*n-5)*s')) + '$.'])

MODELES.append(modele(
    '06-termes-par-un-algorithme', 'Termes d\'une suite donnée par un algorithme',
    'Calculer des termes : langage naturel avec ← (u ← u² − c), liste Python construite par'
    ' append (indice à partir de 0), boucle à deux variables (a, b = b, a + b)',
    'Suites', 'Seuil et algorithmes', 'Algorithmes', 3,
    [V378_NATUREL, V378_LISTE, V378_DEUX],
    [spec('u = 2, c = 1 : 3, 8, 63', 0, {'a': 2, 'c': 1, 'w1': 3, 'w2': 8, 'w3': 63}, '63',
          'correct'),
     spec('Erreur : deux passages', 0, {'a': 2, 'c': 1, 'w1': 3, 'w2': 8, 'w3': 63}, '8',
          'incorrect'),
     spec('L[3] = 2 + 6 × 3', 1, {'a': 2, 'b': 3, 'q': 3}, '20', 'correct'),
     spec('Erreur : L[3] pris pour le 3e élément', 1, {'a': 2, 'b': 3, 'q': 3}, '11',
          'incorrect'),
     spec('L[4] = 2 + 10 × 3', 1, {'a': 2, 'b': 3, 'q': 4}, '32', 'correct'),
     spec('1, 1, n = 5 : 8', 2, {'p': 1, 's': 1, 'n': 5}, '8', 'correct'),
     spec('Erreur : b au lieu de a', 2, {'p': 1, 's': 1, 'n': 5}, '13', 'incorrect'),
     spec('2, 3, n = 4 : 13', 2, {'p': 2, 's': 3, 'n': 4}, '13', 'correct')]))

# --- 7. 1SPE-369 : reconnaître la suite que génère un algorithme ------------------------------

NATURE = choix(['arithmétique', 'géométrique', 'ni arithmétique ni géométrique'], melanger=False)
V369_EXPLICITE = variation(
    'La fonction Python suivante renvoie le terme $u_n$ d\'une suite.'
    + code(['def u(n):',
            '    v = ' + ev('a'),
            '    for i in range(n):',
            '        v = v ' + ('{{if:r>0|+|-}}') + ' ' + ev('abs(r)'),
            '    return v'], 'python')
    + '\n\nExprime $u_n$ en fonction de $n$.\n\n$u_n=?$',
    [var('a', '1..20'), var('r', '2..9;±')], [ev('a') + evp('r') + 'n'],
    ['$u_0=' + ev('a') + '$, et chaque tour de boucle ajoute $' + ev('r') + '$ : la suite est'
     ' arithmétique de raison $' + ev('r') + '$.',
     'Après $n$ tours : $u_n=u_0+nr=' + col(ev('a') + evp('r') + 'n') + '$.'])
V369_RECURRENCE = variation(
    'La fonction Python suivante renvoie le terme $u_n$ d\'une suite.'
    + code(['def u(n):',
            '    v = ' + ev('a'),
            '    for i in range(n):',
            '        v = ' + evd('k') + ' * v + ' + ev('c'),
            '    return v'], 'python')
    + '\n\nComplète la relation de récurrence de la suite $(u_n)$.\n\n$u_{n+1}=?\\times u_n+?$',
    [var('a', '1..9'), var('k', '0.5|0.8|1.5|2|3'), var('c', '1..12')],
    [evd('k'), ev('c')],
    ['Un tour de boucle fait passer de $u_n$ à $u_{n+1}$ : la nouvelle valeur de `v` est $'
     + evd('k') + '$ fois l\'ancienne, plus $' + ev('c') + '$.',
     '$$u_{n+1}=' + col(evd('k')) + '\\times u_n+' + col(ev('c'), 1) + '$$'])
# Décimaux : en Python (point juste) ; le langage naturel, bloc de code sans conversion en virgule,
# garde des entiers (variation suivante).
V369_GEOMETRIQUE = variation(
    'On considère la fonction Python suivante.'
    + code(['def terme(N):',
            '    u = ' + ev('a'),
            '    for i in range(N):',
            '        u = ' + evd('q') + ' * u',
            '    return u'], 'python')
    + '\n\nLa valeur renvoyée par `terme(N)` est le terme $u_N$ d\'une suite $(u_n)$. Cette suite'
    ' est :'
    + NATURE + '\n\nSa raison vaut $?$.',
    [var('a', '2..50'), var('q', '0.5|0.9|1.2|1.5|2|3')], ['1', evd('q')],
    ['Chaque passage multiplie $u$ par $' + evd('q') + '$ : $u_{n+1}=' + evd('q') + '\\times u_n$.',
     'La suite est $' + col('\\text{géométrique}') + '$, de raison $' + col(evd('q'), 1) + '$.'])
V369_ARITHMETIQUE = variation(
    'On considère l\'algorithme suivant, écrit en langage naturel.'
    + code(['u ← ' + ev('a'),
            'Pour i allant de 1 à N :',
            '    u ← u − ' + ev('r'),
            'Fin Pour'])
    + '\n\nLa valeur de $u$ à la fin est le terme $u_N$ d\'une suite $(u_n)$. Cette suite est :'
    + NATURE + '\n\nSa raison vaut $?$.',
    [var('a', '20..90'), var('r', '2..9')], ['0', ev('-r')],
    ['Chaque passage retranche $' + ev('r') + '$ : $u_{n+1}=u_n-' + ev('r') + '$.',
     'La suite est $' + col('\\text{arithmétique}') + '$, de raison $' + col(ev('-r'), 1) + '$.'])

MODELES.append(modele(
    '07-reconnaitre-la-suite-d-un-algorithme', 'Reconnaître la suite que génère un algorithme',
    'Suite générée par un algorithme (Python ou langage naturel) : forme explicite, relation de'
    ' récurrence (deux cases), nature et raison',
    'Suites', 'Seuil et algorithmes', 'Algorithmes', 4,
    [V369_EXPLICITE, V369_RECURRENCE, V369_GEOMETRIQUE, V369_ARITHMETIQUE],
    [spec('v = 5, +3 : 5 + 3n', 0, {'a': 5, 'r': 3}, '5+3n', 'correct'),
     spec('Erreur : 3 + 5n', 0, {'a': 5, 'r': 3}, '3+5n', 'incorrect'),
     spec('v = 12, −4 : 12 − 4n', 0, {'a': 12, 'r': -4}, '12-4n', 'correct'),
     spec('1,5 v + 4 : 1,5 et 4', 1, {'a': 2, 'k': 1.5, 'c': 4}, ['1,5', '4'], 'correct'),
     spec('Erreur : inversés', 1, {'a': 2, 'k': 1.5, 'c': 4}, ['4', '1,5'], 'incorrect'),
     spec('× 1,2 : géométrique, 1,2', 2, {'a': 10, 'q': 1.2}, ['1', '1,2'], 'correct'),
     spec('Erreur : arithmétique', 2, {'a': 10, 'q': 1.2}, ['0', '1,2'], 'incorrect'),
     spec('− 7 : arithmétique, −7', 3, {'a': 50, 'r': 7}, ['0', '-7'], 'correct'),
     spec('Erreur : raison 7', 3, {'a': 50, 'r': 7}, ['0', '7'], 'incorrect')]))

# --- 8 à 10. Motifs : 1SPE-370, 1SPE-222, 1SPE-376 -------------------------------------------
#
# Trois étapes dessinées côte à côte, numérotées {{p}}, {{p}} + 1, {{p}} + 2. À l'étape m-ième
# dessinée (m = 1, 2, 3), le motif compte : allumettes 3m + 1, croix 4m + 1, triangle m(m + 1)/2,
# carré m². Étape n ⟹ m = n + 1 − p.


class Figure:
    def __init__(self):
        self.lignes = []
        self.k = 0

    def point(self, x, y, visible=True):
        """Point caché ; visible = un jeton (disque plein), qui suit l'échelle de la figure, à la
        différence du point du DSL, de taille fixe (minuscule dans une grande fenêtre)."""
        self.k += 1
        nom = 'Q' + str(self.k)
        self.lignes.append(nom + ' = point(' + _n(x) + ', ' + _n(y) + ', visible=faux)')
        if visible:
            # « cercle(O, r) » refuse les arguments de style : on les pose avec « style »
            self.lignes.append('J' + str(self.k) + ' = cercle(' + nom + ', 0.3)')
            self.lignes.append('style(J' + str(self.k) + ', couleur="bleu", remplissage="bleu",'
                               ' opacite_fond=0.85)')
        return nom

    def allumette(self, a, b):
        self.lignes.append('segment(' + a + ', ' + b + ', couleur="marron", epaisseur=3)')

    def etape(self, x, y, texte):
        self.lignes.append('texte(' + _n(x) + ', ' + _n(y) + ', "' + texte + '")')


def _n(x):
    return ('%g' % x)


def figure(dessiner, largeurs, hauteur, description):
    """dessiner(f, m, x0) dessine l'étape m (1, 2, 3) à partir de l'abscisse x0, posée sur y = 0."""
    f = Figure()
    x0 = 0.5
    for m in (1, 2, 3):
        dessiner(f, m, x0)
        f.etape(x0 + (largeurs[m - 1] - 1) / 2, -0.9, 'Étape ' + ('{{p}}' if m == 1 else
                                                               ev('p+' + str(m - 1))))
        x0 += largeurs[m - 1] + 1.5
    # Repère orthonormé : largeur / hauteur ≤ 4 (sinon le bloc refuse la fenêtre), marge partagée
    bas, haut = -1.6, hauteur + 0.6
    marge = max(0, (x0 - (haut - bas) * 3.5) / 7)
    tete = ['fenetre: -0.5 ; ' + _n(x0 - 0.5) + ' ; ' + _n(bas - marge) + ' ; ' + _n(haut + marge),
            'taille: grande',
            'description: ' + description, '---']
    return '\n\n```figure\n' + '\n'.join(tete + f.lignes) + '\n```'


def allumettes(f, m, x0):
    haut = [f.point(x0 + i, 1, visible=False) for i in range(m + 1)]
    bas = [f.point(x0 + i, 0, visible=False) for i in range(m + 1)]
    for i in range(m):
        f.allumette(haut[i], haut[i + 1])
        f.allumette(bas[i], bas[i + 1])
    for i in range(m + 1):
        f.allumette(bas[i], haut[i])


def croix(f, m, x0):
    c = x0 + m
    f.point(c, m)
    for i in range(1, m + 1):
        f.point(c - i, m)
        f.point(c + i, m)
        f.point(c, m - i)
        f.point(c, m + i)


def triangle(f, m, x0):
    for ligne in range(m):
        for j in range(ligne + 1):
            # Ligne « ligne » (0 = sommet, en haut) : ligne + 1 points, centrée sous le sommet
            f.point(x0 + (m - 1 - ligne) * 0.5 + j, (m - 1 - ligne) * 0.85)


def carre(f, m, x0):
    for i in range(m):
        for j in range(m):
            f.point(x0 + i, j)


MOTIFS = {
    'allumettes': {
        'figure': figure(allumettes, [2, 3, 4], 1,
                         'Trois étapes d\'un motif d\'allumettes : une rangée de 1, 2 puis 3 carrés'
                         ' accolés, qui comptent 4, 7 puis 10 allumettes.'),
        'quoi': 'allumettes', 'phrase': 'Des carrés d\'allumettes sont accolés en rangée.',
        'compte': '3*(K)+1', 'explicite': '3n' + evp('4-3*p'), 'pas': '3',
        'explication': 'Chaque nouveau carré ajoute $3$ allumettes : deux horizontales et une'
                       ' verticale.',
    },
    'croix': {
        'figure': figure(croix, [3, 5, 7], 6,
                         'Trois étapes d\'un motif de points en croix : un point central et des'
                         ' branches de 1, 2 puis 3 points, soit 5, 9 puis 13 points.'),
        'quoi': 'points', 'phrase': 'Des points sont disposés en croix.',
        'compte': '4*(K)+1', 'explicite': '4n' + evp('5-4*p'), 'pas': '4',
        'explication': 'Chaque étape ajoute un point au bout de chacune des $4$ branches.',
    },
    'triangle': {
        'figure': figure(triangle, [1, 2, 3], 1.7,
                         'Trois étapes d\'un motif de points en triangle : 1, 3 puis 6 points,'
                         ' en lignes de 1, 2, 3 points.'),
        'quoi': 'points', 'phrase': 'Des points sont disposés en triangle.',
        'compte': '(K)*((K)+1)/2',
        'explicite': '{{if:p==1|\\dfrac{n(n+1)}{2}|\\dfrac{(n+1)(n+2)}{2}}}',
        'pas': 'n' + evp('2-p'),
        'explication': 'Chaque étape ajoute une ligne qui a un point de plus que la précédente.',
    },
    'carre': {
        'figure': figure(carre, [1, 2, 3], 2,
                         'Trois étapes d\'un motif de points en carré : 1, 4 puis 9 points.'),
        'quoi': 'points', 'phrase': 'Des points sont disposés en carré.',
        'compte': '(K)^2', 'explicite': '{{if:p==1|n^2|(n+1)^2}}',
        'pas': '2n' + evp('3-2*p'),
        'explication': 'Pour passer d\'un carré de côté $m$ à un carré de côté $m+1$, on ajoute'
                       ' une ligne et une colonne : $2m+1$ points.',
    },
}


def compte(motif, n_expr):
    """Nombre d'éléments à l'étape n (n_expr : expression de n), selon la numérotation p."""
    return MOTIFS[motif]['compte'].replace('K', n_expr + '+1-p')


def enonce(motif):
    m = MOTIFS[motif]
    return m['phrase'] + ' Voici les trois premières étapes.' + m['figure']


P = var('p', '0|1')
P1 = var('p', '1')

# 8. 1SPE-370 : nombre d'éléments à une étape


def v370(motif):
    m = MOTIFS[motif]
    return variation(
        enonce(motif) + '\n\nCombien de ' + m['quoi'] + ' compte l\'étape ' + ev('k')
        + ' ?\n\n$?$ ' + m['quoi'],
        [P1, var('k', '4..8')], [ev(compte(motif, 'k'))],
        [m['explication'],
         'On poursuit le motif : étape $4$ : $' + ev(compte(motif, '4')) + '$, étape $5$ : $'
         + ev(compte(motif, '5')) + '$…',
         'L\'étape $' + ev('k') + '$ compte $' + col(ev(compte(motif, 'k'))) + '$ ' + m['quoi']
         + '.'])


MODELES.append(modele(
    '08-motif-nombre-d-elements', 'Motif : nombre d\'éléments à une étape',
    'Suite définie par un motif géométrique dessiné (allumettes, croix, triangle de points) :'
    ' compter les éléments d\'une étape non dessinée',
    'Suites', 'Apprivoiser', 'Motifs', 1,
    [v370('allumettes'), v370('croix'), v370('triangle')],
    [spec('Allumettes, étape 6 : 19', 0, {'p': 1, 'k': 6}, '19', 'correct'),
     spec('Erreur : 4 × 6', 0, {'p': 1, 'k': 6}, '24', 'incorrect'),
     spec('Croix, étape 5 : 21', 1, {'p': 1, 'k': 5}, '21', 'correct'),
     spec('Erreur : 4 × 5', 1, {'p': 1, 'k': 5}, '20', 'incorrect'),
     spec('Triangle, étape 7 : 28', 2, {'p': 1, 'k': 7}, '28', 'correct'),
     spec('Erreur : 7 × 8', 2, {'p': 1, 'k': 7}, '56', 'incorrect')]))

# 9. 1SPE-222 : relation explicite


def v222(motif):
    m = MOTIFS[motif]
    return variation(
        enonce(motif) + '\n\nOn note $u_n$ le nombre de ' + m['quoi'] + ' de l\'étape $n$'
        ' (la première étape dessinée est l\'étape $' + ev('p') + '$).\n\n'
        'Exprime $u_n$ en fonction de $n$.\n\n$u_n=?$',
        [P], [{'expectedAnswer': m['explicite'], 'requiredForm': {'pattern': 'u'}}],
        [m['explication'],
         'Les étapes dessinées donnent $u_{' + ev('p') + '}=' + ev(compte(motif, 'p')) + '$, $u_{'
         + ev('p+1') + '}=' + ev(compte(motif, 'p+1')) + '$, $u_{' + ev('p+2') + '}='
         + ev(compte(motif, 'p+2')) + '$ : la formule doit les retrouver.',
         '$$u_n=' + col(m['explicite']) + '$$'])


MODELES.append(modele(
    '09-motif-relation-explicite', 'Motif : relation explicite',
    'Suite définie par un motif géométrique dessiné (allumettes, croix, triangle, carré de points),'
    ' étapes numérotées à partir de 0 ou de 1 : uₙ en fonction de n',
    'Suites', 'Apprivoiser', 'Motifs', 2,
    [v222('allumettes'), v222('croix'), v222('triangle'), v222('carre')],
    [spec('Allumettes, dès 1 : 3n + 1', 0, {'p': 1}, '3n+1', 'correct'),
     spec('Allumettes, dès 0 : 3n + 4', 0, {'p': 0}, '3n+4', 'correct'),
     spec('Allumettes, dès 0, erreur : 3n + 1', 0, {'p': 0}, '3n+1', 'incorrect'),
     spec('Erreur : 4n', 0, {'p': 1}, '4n', 'incorrect'),
     spec('Croix, dès 1 : 4n + 1', 1, {'p': 1}, '4n+1', 'correct'),
     spec('Croix, dès 0 : 4n + 5', 1, {'p': 0}, '4n+5', 'correct'),
     spec('Triangle, dès 1 : n(n + 1)/2', 2, {'p': 1}, '\\frac{n(n+1)}{2}', 'correct'),
     spec('Triangle, développé', 2, {'p': 1}, '\\frac{n^2+n}{2}', 'correct'),
     spec('Triangle, dès 0 : (n + 1)(n + 2)/2', 2, {'p': 0}, '\\frac{(n+1)(n+2)}{2}', 'correct'),
     spec('Erreur : n²/2', 2, {'p': 1}, '\\frac{n^2}{2}', 'incorrect'),
     spec('Carré, dès 1 : n²', 3, {'p': 1}, 'n^2', 'correct'),
     spec('Carré, dès 0 : (n + 1)²', 3, {'p': 0}, '(n+1)^2', 'correct'),
     spec('Erreur : 2n', 3, {'p': 1}, '2n', 'incorrect')]))

# 10. 1SPE-376 : relation de récurrence


def v376(motif):
    m = MOTIFS[motif]
    return variation(
        enonce(motif) + '\n\nOn note $u_n$ le nombre de ' + m['quoi'] + ' de l\'étape $n$'
        ' (la première étape dessinée est l\'étape $' + ev('p') + '$).\n\n'
        'Complète la relation de récurrence.\n\n$u_{n+1}=u_n+?$',
        [P], [m['pas']],
        [m['explication'],
         'On passe de l\'étape $n$ à l\'étape $n+1$ en ajoutant $' + m['pas'] + '$ ' + m['quoi']
         + ' (on le vérifie : $u_{' + ev('p+1') + '}-u_{' + ev('p') + '}='
         + ev(compte(motif, 'p+1') + '-(' + compte(motif, 'p') + ')') + '$).',
         '$$u_{n+1}=u_n+' + col(m['pas']) + '$$'])


MODELES.append(modele(
    '10-motif-relation-de-recurrence', 'Motif : relation de récurrence',
    'Suite définie par un motif géométrique dessiné (allumettes, croix, triangle, carré de points),'
    ' étapes numérotées à partir de 0 ou de 1 : uₙ₊₁ = uₙ + ?',
    'Suites', 'Apprivoiser', 'Motifs', 3,
    [v376('allumettes'), v376('croix'), v376('triangle'), v376('carre')],
    [spec('Allumettes : + 3', 0, {'p': 1}, '3', 'correct'),
     spec('Erreur : + 4', 0, {'p': 1}, '4', 'incorrect'),
     spec('Croix : + 4', 1, {'p': 0}, '4', 'correct'),
     spec('Triangle, dès 1 : + (n + 1)', 2, {'p': 1}, 'n+1', 'correct'),
     spec('Triangle, dès 0 : + (n + 2)', 2, {'p': 0}, 'n+2', 'correct'),
     spec('Triangle, dès 1, erreur : + n', 2, {'p': 1}, 'n', 'incorrect'),
     spec('Carré, dès 1 : + (2n + 1)', 3, {'p': 1}, '2n+1', 'correct'),
     spec('Carré, dès 0 : + (2n + 3)', 3, {'p': 0}, '2n+3', 'correct'),
     spec('Erreur : + n²', 3, {'p': 1}, 'n^2', 'incorrect')]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
