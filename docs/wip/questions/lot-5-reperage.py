"""Écrit les 9 modèles du lot 12 « Droite graduée et repère » de la 5e.

Phase 0 : journal § 27, validée par David le 2026-11-15 (« je te suis », tiers en v3 de 01, brouillons
`d4f38d30` / `d4d56c1b` renumérotés 3 et 4). Un point par modèle :

| #  | Point | Titre | Réponse | Nœud, niveau |
| 01 | 5-016 | Lire l'abscisse d'un point (relatifs) | case | relatifs › droite graduée, 1 |
| 02 | 5-121 | Placer un point d'abscisse relative | line placer: | relatifs › droite graduée, 2 |
| 03 | 5-046 | Lire une abscisse décimale relative | case | coordonnées dans le plan, 1 |
| 04 | 5-127 | Placer un point d'abscisse décimale relative | line placer: | coordonnées dans le plan, 2 |
| 05 | 5-093 | Produire un tableau de valeurs | tableau à trous | généralités sur les fonctions, 10 |
| 06 | 5-097 | Tableau de valeurs à partir d'une formule | tableau à trous | généralités sur les fonctions, 11 |
| 07 | 5-095 | Placer les points d'un tableau de valeurs | courbe placer: | généralités sur les fonctions, 12 |
| 08 | 5-114 | Représenter des données par un graphique | courbe placer: | courbes et repères, 3 |
| 09 | 5-122 | Ranger des nombres relatifs | ranger | relatifs › ordre, 3 |

Décisions et pièges :
- un fichier ne porte ni `theme`, ni `domain`, ni `subdomain` (ADR 0035) ; nœud et tag : migration ;
- 01 / 02 : unités, demis, quarts (01 : tiers en plus, réponse en fraction) ; 03 / 04 : dixièmes seulement
  (centièmes = 6e) ; droites À PLACER (02, 04) : 12 intervalles au plus (page à cocher : 20 px entre
  graduations sur téléphone) ; droites étiquetées en 0 et 1 seulement (03 v2 : les deux entiers qui encadrent) ;
- « k impair » : `mod(k*k,2)!=0` (k signé par `;±`) ;
- 05 sans formule (situation en mots, programme de calcul) ; 06 formule donnée (borne 5-097) ;
  pas de notation fonctionnelle (bornes 5-093 à 5-097) ;
- 07 / 08 : points nommés dans le tableau (le geste `placer:` place des points nommés) ;
- 09 : positions affichées des specs calculées par le générateur (`positions-ranger.ts`) ;
- variables `e` et `i` interdites.

    python3 docs/wip/questions/lot-5-reperage.py scripts/questions/5-reperage
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': [str(a) for a in answers],
            'expected': {'status': status}}


def modele(nom, title, description, level, variations, specs, delay=90, options=None):
    m = {'title': title, 'description': description, 'grades': ['5'], 'level': level,
         'delay': delay, 'status': 'draft'}
    if options:
        m['options'] = options
    m['variations'] = variations
    m['testSpecs'] = specs
    return nom, m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    if answers:
        v['blanks'] = [{'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def m(x):
    return '$' + col(x) + '$'


def droite(start, end, step, major, labels, ligne):
    return ('```line\nstart: ' + start + '\nend: ' + end + '\nstep: ' + step + '\nmajor: ' + major
            + '\nlabels: ' + labels + '\n' + ligne + '\n```')


MODELES = []

# --- 01. 5-016 : lire l'abscisse d'un point (relatifs) -------------------------------------

LIRE = 'Quel nombre repère le point $A$ ?\n\n'
DEMI = droite('-4', '4', '0.5', '2', '0, 1', 'points: A={{eval:k/2;d}}')
QUART = droite('-3', '3', '0.25', '4', '0, 1', 'points: A={{eval:k/4;d}}')
UNITE = droite('-6', '6', '1', '1', '0, 1', 'points: A={{k}}')
TIERS = droite('-3', '3', '1/3', '3', '0, 1', 'points: A={{eval:s*a}}/3')

COTE = '{{if:k<0|à gauche|à droite}} de $0$'
MODELES.append(modele(
    '01-lire-l-abscisse-d-un-point-relatifs', "Lire l'abscisse d'un point sur une droite graduée",
    'Lire l\'abscisse relative d\'un point sur une droite graduée étiquetée en 0 et 1 : graduée en unités,'
    ' en demis, en quarts, en tiers (réponse en fraction)', 1,
    [variation(LIRE + UNITE + '\n\n$$A : ?$$', [var('k', '2..5;±')], ['{{k}}'],
               ['**Ce que vaut une graduation.** De $0$ à $1$, il y a une graduation : chaque graduation vaut $1$.',
                '$A$ est à ${{eval:abs(k)}}$ graduations ' + COTE + ' : son abscisse est ' + m('{{k}}') + '.']),
     variation(LIRE + DEMI + '\n\n$$A : ?$$', [var('k', '1..7;±')], ['{{eval:k/2;d}}'],
               ['**Ce que vaut une graduation.** L\'unité, de $0$ à $1$, est partagée en $2$ : chaque graduation'
                ' vaut $0.5$.',
                '$A$ est à ${{eval:abs(k)}}$ graduations ' + COTE + ' : ${{eval:abs(k)}} \\times 0.5 = '
                '{{eval:abs(k)/2;d}}$, donc son abscisse est ' + m('{{eval:k/2;d}}') + '.'],
               ['mod(k*k,2)!=0']),
     variation(LIRE + QUART + '\n\n$$A : ?$$', [var('k', '1..11;±')], ['{{eval:k/4;d}}'],
               ['**Ce que vaut une graduation.** L\'unité, de $0$ à $1$, est partagée en $4$ : chaque graduation'
                ' vaut $0.25$.',
                '$A$ est à ${{eval:abs(k)}}$ graduations ' + COTE + ' : ${{eval:abs(k)}} \\times 0.25 = '
                '{{eval:abs(k)/4;d}}$, donc son abscisse est ' + m('{{eval:k/4;d}}') + '.'],
               ['mod(k*k,2)!=0']),
     variation(LIRE + TIERS + '\n\n$$A : ?$$', [var('a', '1..8'), var('s', '1|-1')],
               ['{{if:s<0|-}}\\frac{{{a}}}{3}'],
               ['**Ce que vaut une graduation.** L\'unité, de $0$ à $1$, est partagée en $3$ : chaque graduation'
                ' vaut $\\frac{1}{3}$.',
                '$A$ est à ${{a}}$ graduations {{if:s<0|à gauche|à droite}} de $0$ : son abscisse est '
                + m('{{if:s<0|-}}\\frac{{{a}}}{3}') + '.'],
               ['mod(a,3)!=0'])],
    [spec('−3', 0, {'k': -3}, ['-3'], 'correct'),
     spec('Erreur : signe oublié', 0, {'k': -3}, ['3'], 'incorrect'),
     spec('4', 0, {'k': 4}, ['4'], 'correct'),
     spec('−2,5', 1, {'k': -5}, ['-2,5'], 'correct'),
     spec('Erreur : graduations comptées (−5)', 1, {'k': -5}, ['-5'], 'incorrect'),
     spec('Erreur : signe oublié (2,5)', 1, {'k': -5}, ['2,5'], 'incorrect'),
     spec('1,5', 1, {'k': 3}, ['1,5'], 'correct'),
     spec('−1,75', 2, {'k': -7}, ['-1,75'], 'correct'),
     spec('Erreur : −1,7 (graduation lue en dixièmes)', 2, {'k': -7}, ['-1,7'], 'incorrect'),
     spec('Erreur : −1,25 (compté depuis −1 dans le mauvais sens)', 2, {'k': -7}, ['-1,25'], 'incorrect'),
     spec('0,75', 2, {'k': 3}, ['0,75'], 'correct'),
     spec('−4/3', 3, {'a': 4, 's': -1}, ['-\\frac{4}{3}'], 'correct'),
     spec('Erreur : −1,3 (tiers lus en dixièmes)', 3, {'a': 4, 's': -1}, ['-1,3'], 'incorrect'),
     spec('Erreur : 4/3 (signe oublié)', 3, {'a': 4, 's': -1}, ['\\frac{4}{3}'], 'incorrect'),
     spec('2/3', 3, {'a': 2, 's': 1}, ['\\frac{2}{3}'], 'correct')],
    delay=45))

# --- 02. 5-121 : placer un point d'abscisse relative ---------------------------------------

PLACE = 'Place le nombre ${{x}}$ sur la droite graduée.\n\n'
MODELES.append(modele(
    '02-placer-un-point-d-abscisse-relative', "Placer un point d'abscisse relative",
    'Placer un nombre relatif sur une droite graduée étiquetée en 0 et 1 : en unités, en demis, en quarts,'
    ' puis deux points de signes contraires', 2,
    [variation(PLACE + droite('-6', '6', '1', '1', '0, 1', 'placer: {{x}}'),
               [var('k', '2..5;±'), var('x', 'eval:k')], [],
               ['Chaque graduation vaut $1$ ; ${{x}}$ est à ${{eval:abs(k)}}$ graduations ' + COTE + '.',
                'On place le point sur la graduation ' + m('{{x}}') + '.']),
     variation(PLACE + droite('-3', '2', '0.5', '2', '0, 1', 'placer: {{x}}'),
               [var('k', '1..5;±'), var('x', 'eval:k/2;d')], [],
               ['L\'unité est partagée en $2$ : chaque graduation vaut $0.5$.',
                '${{x}}$, c\'est ${{eval:abs(k)}}$ graduations ' + COTE + ' : on place le point en ' + m('{{x}}')
                + '.'],
               ['mod(k*k,2)!=0', 'k<=3']),
     variation(PLACE + droite('-2', '1', '0.25', '4', '0, 1', 'placer: {{x}}'),
               [var('k', '1..7;±'), var('x', 'eval:k/4;d')], [],
               ['L\'unité est partagée en $4$ : chaque graduation vaut $0.25$.',
                '${{x}}$, c\'est ${{eval:abs(k)}}$ graduations ' + COTE + ' : on place le point en ' + m('{{x}}')
                + '.'],
               ['mod(k*k,2)!=0', 'k<=3']),
     variation('Place les points $A({{xa}})$ et $B({{xb}})$ sur la droite graduée.\n\n'
               + droite('-3', '2', '0.5', '2', '0, 1', 'placer: A={{xa}} ; B={{xb}}'),
               [var('a', '1..6'), var('b', '1..4'), var('xa', 'eval:-a/2;d'), var('xb', 'eval:b/2;d')], [],
               ['Chaque graduation vaut $0.5$.',
                '$A$ est à ${{a}}$ graduations à gauche de $0$, en ' + m('{{xa}}') + ' ; $B$ est à ${{b}}$'
                ' graduations à droite de $0$, en ' + m('{{xb}}') + '.'],
               ['a!=b'])],
    [spec('−3 placé', 0, {'k': -3}, ['-3'], 'correct'),
     spec('Erreur : 3 (signe oublié)', 0, {'k': -3}, ['3'], 'incorrect'),
     spec('−2,5 placé', 1, {'k': -5}, ['-2.5'], 'correct'),
     spec('Erreur : −1,5 (compté depuis −1 vers la droite)', 1, {'k': -5}, ['-1.5'], 'incorrect'),
     spec('Erreur : 2,5', 1, {'k': -5}, ['2.5'], 'incorrect'),
     spec('−1,75 placé', 2, {'k': -7}, ['-1.75'], 'correct'),
     spec('Erreur : −1,25', 2, {'k': -7}, ['-1.25'], 'incorrect'),
     spec('A(−1,5), B(1,5) placés', 3, {'a': 3, 'b': 3}, ['-1.5', '1.5'], 'correct'),
     spec('Erreur : A en 1,5', 3, {'a': 3, 'b': 2}, ['1.5', '1'], 'incorrect')],
    delay=45))

# --- 03. 5-046 : lire une abscisse décimale relative ---------------------------------------

AUTOUR_0 = droite('-1.5', '1.5', '0.1', '10', '0, 1', 'points: A={{eval:k/10;d}}')
AUTOUR_N = droite('{{eval:-n-1}}', '{{eval:-n+0.5;d}}', '0.1', '10', '{{eval:-n-1}}, {{eval:-n}}',
                  'points: A={{x}}')
MODELES.append(modele(
    '03-lire-une-abscisse-decimale-relative', 'Lire une abscisse décimale relative',
    'Lire l\'abscisse décimale relative d\'un point sur une droite graduée en dixièmes : autour de 0, puis'
    ' entre deux entiers négatifs', 1,
    [variation(LIRE + AUTOUR_0 + '\n\n$$A : ?$$', [var('k', '1..14;±')], ['{{eval:k/10;d}}'],
               ['**Ce que vaut une graduation.** L\'unité, de $0$ à $1$, est partagée en $10$ : chaque graduation'
                ' vaut $0.1$.',
                '$A$ est à ${{eval:abs(k)}}$ graduations ' + COTE + ' : son abscisse est '
                + m('{{eval:k/10;d}}') + '.'],
               ['k*k!=100']),
     variation(LIRE + AUTOUR_N + '\n\n$$A : ?$$',
               [var('n', '2..5'), var('k', '1..9'), var('x', 'eval:-(10*n+k)/10;d')], ['{{x}}'],
               ['**Ce que vaut une graduation.** De ${{eval:-n-1}}$ à ${{eval:-n}}$, l\'unité est partagée en $10$ :'
                ' chaque graduation vaut $0.1$.',
                '$A$ est à ${{k}}$ graduations à gauche de ${{eval:-n}}$ : son abscisse est ' + m('{{x}}') + '.',
                '**Contrôle.** ${{x}}$ est bien entre ${{eval:-n-1}}$ et ${{eval:-n}}$.'])],
    [spec('−1,3', 0, {'k': -13}, ['-1,3'], 'correct'),
     spec('Erreur : 1,3 (signe oublié)', 0, {'k': -13}, ['1,3'], 'incorrect'),
     spec('Erreur : −0,13', 0, {'k': -13}, ['-0,13'], 'incorrect'),
     spec('0,7', 0, {'k': 7}, ['0,7'], 'correct'),
     spec('−3,4', 1, {'n': 3, 'k': 4}, ['-3,4'], 'correct'),
     spec('Erreur : −3,6 (compté depuis −4)', 1, {'n': 3, 'k': 4}, ['-3,6'], 'incorrect'),
     spec('Erreur : −2,6 (compté vers la droite)', 1, {'n': 3, 'k': 4}, ['-2,6'], 'incorrect'),
     spec('Erreur : 3,4 (signe oublié)', 1, {'n': 3, 'k': 4}, ['3,4'], 'incorrect')],
    delay=45))

# --- 04. 5-127 : placer un point d'abscisse décimale relative ------------------------------

MODELES.append(modele(
    '04-placer-un-point-d-abscisse-decimale', "Placer un point d'abscisse décimale relative",
    'Placer un nombre décimal relatif sur une droite graduée en dixièmes (une unité, 10 graduations) : entre −1'
    ' et 0, entre deux entiers négatifs, puis deux points de part et d\'autre de 0', 2,
    [variation(PLACE + droite('-1', '0', '0.1', '10', '-1, 0', 'placer: {{x}}'),
               [var('k', '1..9'), var('x', 'eval:-k/10;d')], [],
               ['Chaque graduation vaut $0.1$.',
                '${{x}}$, c\'est ${{k}}$ graduations à gauche de $0$ : on place le point en ' + m('{{x}}') + '.']),
     variation(PLACE + droite('{{eval:-n-1}}', '{{eval:-n}}', '0.1', '10', '{{eval:-n-1}}, {{eval:-n}}',
                              'placer: {{x}}'),
               [var('n', '2..5'), var('k', '1..9'), var('x', 'eval:-(10*n+k)/10;d')], [],
               ['Chaque graduation vaut $0.1$.',
                '${{x}}$ est entre ${{eval:-n-1}}$ et ${{eval:-n}}$, à ${{k}}$ graduations à gauche de'
                ' ${{eval:-n}}$ : on place le point en ' + m('{{x}}') + '.']),
     variation('Place les points $A({{xa}})$ et $B({{xb}})$ sur la droite graduée.\n\n'
               + droite('-0.5', '0.5', '0.1', '10', '-0.5, 0, 0.5', 'placer: A={{xa}} ; B={{xb}}'),
               [var('a', '1..4'), var('b', '1..4'), var('xa', 'eval:-a/10;d'), var('xb', 'eval:b/10;d')], [],
               ['Chaque graduation vaut $0.1$.',
                '$A$ est à ${{a}}$ graduations à gauche de $0$, en ' + m('{{xa}}') + ' ; $B$ à ${{b}}$'
                ' graduations à droite, en ' + m('{{xb}}') + '.'])],
    [spec('−0,3 placé', 0, {'k': 3}, ['-0.3'], 'correct'),
     spec('Erreur : −0,7 (compté depuis −1 vers la droite)', 0, {'k': 3}, ['-0.7'], 'incorrect'),
     spec('−3,4 placé', 1, {'n': 3, 'k': 4}, ['-3.4'], 'correct'),
     spec('Erreur : −3,6', 1, {'n': 3, 'k': 4}, ['-3.6'], 'incorrect'),
     spec('A(−0,3), B(0,4) placés', 2, {'a': 3, 'b': 4}, ['-0.3', '0.4'], 'correct'),
     spec('Erreur : A en 0,3', 2, {'a': 3, 'b': 4}, ['0.3', '0.4'], 'incorrect')],
    delay=45))

# --- 05. 5-093 : produire un tableau de valeurs (sans formule) -----------------------------


def tableau(t1, t2, xs, ys):
    return ('| ' + t1 + ' | ' + ' | '.join(xs) + ' |\n|' + '---|' * (len(xs) + 1) + '\n| ' + t2 + ' | '
            + ' | '.join(ys) + ' |\n')


X4 = ['${{x1}}$', '${{x2}}$', '${{x3}}$', '${{x4}}$']
TROUS = ['$?$'] * 4
VX = [var('x1', '1..3'), var('x2', '4..6'), var('x3', '7..9'), var('x4', 'eval:10')]
MODELES.append(modele(
    '05-produire-un-tableau-de-valeurs', 'Produire un tableau de valeurs',
    'Compléter un tableau de valeurs à partir d\'une situation décrite en mots (prix avec livraison) ou d\'un'
    ' programme de calcul, sans formule donnée', 10,
    [variation('Un fleuriste vend ses tulipes ${{a}}$ € pièce. Pour toute commande, la livraison coûte ${{b}}$ €.\n\n'
               + tableau('Nombre de tulipes', 'Prix payé (€)', X4, TROUS)
               + '\nComplète le tableau.',
               [var('a', '2..5'), var('b', '3..8')] + VX,
               ['{{eval:a*x1+b}}', '{{eval:a*x2+b}}', '{{eval:a*x3+b}}', '{{eval:a*x4+b}}'],
               ['Pour un nombre de tulipes, on multiplie par ${{a}}$ (le prix des tulipes), puis on ajoute ${{b}}$'
                ' (la livraison, payée une seule fois).',
                'Par exemple, pour ${{x1}}$ tulipes : ${{x1}} \\times {{a}} + {{b}} = ' + col('{{eval:a*x1+b}}')
                + '$ €.',
                'Les autres prix : ' + m('{{eval:a*x2+b}}') + ', ' + m('{{eval:a*x3+b}}') + ' et '
                + m('{{eval:a*x4+b}}') + ' €.']),
     variation('Voici un programme de calcul :\n\n- choisir un nombre ;\n- le multiplier par ${{a}}$ ;\n'
               '- soustraire ${{b}}$ au résultat.\n\n'
               + tableau('Nombre choisi', 'Résultat', ['$0$', '$1$', '${{x3}}$', '$10$'], TROUS)
               + '\nComplète le tableau.',
               [var('a', '2..5'), var('b', '3..9'), var('x3', '3..6')],
               ['{{eval:-b}}', '{{eval:a-b}}', '{{eval:a*x3-b}}', '{{eval:10*a-b}}'],
               ['On applique le programme à chaque nombre : d\'abord $\\times {{a}}$, puis $- {{b}}$.',
                '$0 \\times {{a}} - {{b}} = ' + col('{{eval:-b}}') + '$ ; $1 \\times {{a}} - {{b}} = '
                + col('{{eval:a-b}}') + '$.',
                '${{x3}} \\times {{a}} - {{b}} = ' + col('{{eval:a*x3-b}}') + '$ ; $10 \\times {{a}} - {{b}} = '
                + col('{{eval:10*a-b}}') + '$.'])],
    [spec('3 € la tulipe, livraison 5 € : 2, 5, 8, 10 → 11, 20, 29, 35', 0,
          {'a': 3, 'b': 5, 'x1': 2, 'x2': 5, 'x3': 8}, ['11', '20', '29', '35'], 'correct'),
     spec('Erreur : livraison oubliée', 0, {'a': 3, 'b': 5, 'x1': 2, 'x2': 5, 'x3': 8},
          ['6', '15', '24', '30'], 'incorrect'),
     spec('Erreur : livraison payée par tulipe', 0, {'a': 3, 'b': 5, 'x1': 2, 'x2': 5, 'x3': 8},
          ['16', '40', '64', '80'], 'incorrect'),
     spec('×4 − 7 : 0, 1, 5, 10 → −7, −3, 13, 33', 1, {'a': 4, 'b': 7, 'x3': 5}, ['-7', '-3', '13', '33'],
          'correct'),
     spec('Erreur : 7 − 0 (soustraction retournée)', 1, {'a': 4, 'b': 7, 'x3': 5}, ['7', '3', '13', '33'],
          'incorrect'),
     spec('Erreur : (n − 7) × 4', 1, {'a': 4, 'b': 7, 'x3': 5}, ['-28', '-24', '-8', '12'], 'incorrect')],
    delay=120))

# --- 06. 5-097 : tableau de valeurs à partir d'une formule ---------------------------------

MODELES.append(modele(
    '06-tableau-de-valeurs-a-partir-d-une-formule', "Tableau de valeurs à partir d'une formule",
    'Compléter un tableau de valeurs à partir d\'une formule donnée : aire d\'un carré, distance de freinage,'
    ' périmètre d\'un rectangle', 11,
    [variation('L\'aire $\\mathcal{A}$ d\'un carré de côté $c$ (en cm) est donnée par la formule'
               ' $\\mathcal{A} = c \\times c$ (en cm²).\n\n'
               + tableau('Côté $c$ (cm)', 'Aire $\\mathcal{A}$ (cm²)', ['$1$', '${{c2}}$', '${{c3}}$', '${{c4}}$'],
                         TROUS)
               + '\nComplète le tableau.',
               [var('c2', '2..4'), var('c3', '5..7'), var('c4', '8..12')],
               ['1', '{{eval:c2*c2}}', '{{eval:c3*c3}}', '{{eval:c4*c4}}'],
               ['On remplace $c$ par chaque valeur du tableau dans la formule $\\mathcal{A} = c \\times c$.',
                '$1 \\times 1 = ' + col('1') + '$ ; ${{c2}} \\times {{c2}} = ' + col('{{eval:c2*c2}}') + '$ ; ${{c3}}'
                ' \\times {{c3}} = ' + col('{{eval:c3*c3}}') + '$ ; ${{c4}} \\times {{c4}} = '
                + col('{{eval:c4*c4}}') + '$.']),
     variation('Sur route mouillée, la distance de freinage $d$ (en m) d\'une voiture qui roule à $v$ km/h vaut'
               ' environ $d = v \\times v \\div 100$.\n\n'
               + tableau('Vitesse $v$ (km/h)', 'Distance $d$ (m)',
                         ['${{eval:10*w1}}$', '${{eval:10*w2}}$', '${{eval:10*w3}}$', '${{eval:10*w4}}$'], TROUS)
               + '\nComplète le tableau.',
               [var('w1', '2..3'), var('w2', '4..5'), var('w3', '6..7'), var('w4', '8..10')],
               ['{{eval:w1*w1}}', '{{eval:w2*w2}}', '{{eval:w3*w3}}', '{{eval:w4*w4}}'],
               ['On remplace $v$ par chaque vitesse : d\'abord $v \\times v$, puis on divise par $100$.',
                'Pour $v = {{eval:10*w1}}$ : ${{eval:10*w1}} \\times {{eval:10*w1}} = {{eval:100*w1*w1}}$, et'
                ' ${{eval:100*w1*w1}} \\div 100 = ' + col('{{eval:w1*w1}}') + '$ m.',
                'De même : ' + m('{{eval:w2*w2}}') + ', ' + m('{{eval:w3*w3}}') + ' et ' + m('{{eval:w4*w4}}')
                + ' m.']),
     variation('Le périmètre $P$ (en cm) d\'un rectangle de largeur $3$ cm et de longueur $L$ (en cm) est donné'
               ' par la formule $P = 2 \\times (L + 3)$.\n\n'
               + tableau('Longueur $L$ (cm)', 'Périmètre $P$ (cm)', ['${{l1}}$', '${{l2}}$', '${{l3}}$', '${{l4}}$'],
                         TROUS)
               + '\nComplète le tableau.',
               [var('l1', '4..5'), var('l2', '6..8'), var('l3', '9..12'), var('l4', '15..20')],
               ['{{eval:2*(l1+3)}}', '{{eval:2*(l2+3)}}', '{{eval:2*(l3+3)}}', '{{eval:2*(l4+3)}}'],
               ['On remplace $L$ par chaque longueur, et on calcule d\'abord la parenthèse.',
                'Pour $L = {{l1}}$ : $2 \\times ({{l1}} + 3) = 2 \\times {{eval:l1+3}} = ' + col('{{eval:2*(l1+3)}}')
                + '$.',
                'De même : ' + m('{{eval:2*(l2+3)}}') + ', ' + m('{{eval:2*(l3+3)}}') + ' et '
                + m('{{eval:2*(l4+3)}}') + ' cm.'])],
    [spec('Carré : 1, 3, 6, 10 → 1, 9, 36, 100', 0, {'c2': 3, 'c3': 6, 'c4': 10}, ['1', '9', '36', '100'],
          'correct'),
     spec('Erreur : c × 2', 0, {'c2': 3, 'c3': 6, 'c4': 10}, ['2', '6', '12', '20'], 'incorrect'),
     spec('Freinage : 30, 50, 70, 90 → 9, 25, 49, 81', 1, {'w1': 3, 'w2': 5, 'w3': 7, 'w4': 9},
          ['9', '25', '49', '81'], 'correct'),
     spec('Erreur : v × 2 ÷ 100', 1, {'w1': 3, 'w2': 5, 'w3': 7, 'w4': 9}, ['0,6', '1', '1,4', '1,8'],
          'incorrect'),
     spec('Rectangle : 5, 7, 10, 18 → 16, 20, 26, 42', 2, {'l1': 5, 'l2': 7, 'l3': 10, 'l4': 18},
          ['16', '20', '26', '42'], 'correct'),
     spec('Erreur : 2 × L + 3 (parenthèse oubliée)', 2, {'l1': 5, 'l2': 7, 'l3': 10, 'l4': 18},
          ['13', '17', '23', '39'], 'incorrect')],
    delay=120))

# --- 07. 5-095 : placer les points d'un tableau de valeurs ---------------------------------

NOMS = ['A', 'B', 'C', 'D', 'E']


def placer_points(xs, ys, n):
    return ' ; '.join(f'{NOMS[j]}=({xs[j]} ; {ys[j]})' for j in range(n))


def corr_points(xs, ys, n):
    return ', '.join(f'${NOMS[j]}' + col(f'({xs[j]} ; {ys[j]})') + '$' for j in range(n))


X07 = ['{{x1}}', '{{x2}}', '{{x3}}', '{{x4}}']
Y07a = ['{{eval:a*x1+b}}', '{{eval:a*x2+b}}', '{{eval:a*x3+b}}', '{{eval:a*x4+b}}']
Y07b = ['{{eval:p*x1+q}}', '{{eval:p*x2+q}}', '{{eval:p*x3+q}}', '{{eval:p*x4+q}}']
V07 = [var('x1', '0'), var('x2', '1..2'), var('x3', '3..4'), var('x4', '5..6')]


def tableau_points(t1, t2, xs, ys):
    return ('| Point | ' + ' | '.join(NOMS[:len(xs)]) + ' |\n|' + '---|' * (len(xs) + 1) + '\n| ' + t1 + ' | '
            + ' | '.join('$' + x + '$' for x in xs) + ' |\n| ' + t2 + ' | ' + ' | '.join('$' + y + '$' for y in ys)
            + ' |\n')


MODELES.append(modele(
    '07-placer-les-points-d-un-tableau-de-valeurs', "Placer les points d'un tableau de valeurs",
    'Placer dans un repère donné les points qui représentent un tableau de valeurs (hauteur d\'eau selon le'
    ' temps, prix selon le nombre de séances), axes gradués de 1 en 1 puis de 5 en 5', 12,
    [variation('On remplit un bassin. Le tableau donne la hauteur d\'eau selon le temps écoulé.\n\n'
               + tableau_points('Temps (min)', 'Hauteur (cm)', X07, Y07a)
               + '\nPlace les points A, B, C et D : le temps en abscisse, la hauteur en ordonnée.\n\n'
               '```courbe\nx: -1 ; 7\ny: -1 ; 15\ngrille: 1 ; 1\naxes: x = Temps (min) ; y = Hauteur (cm)\n'
               'placer: ' + placer_points(X07, Y07a, 4) + '\ntaille: moyenne\n'
               'description: Repère : temps en abscisse, de 1 en 1 ; hauteur en ordonnée, de 1 en 1.\n```',
               [var('a', '1..2'), var('b', '1..2')] + V07, [],
               ['Chaque colonne du tableau donne un point : (temps ; hauteur). L\'abscisse se lit sur l\'axe'
                ' horizontal, l\'ordonnée sur l\'axe vertical.',
                corr_points(X07, Y07a, 4) + '.']),
     variation('Au cinéma de la ville, on achète une carte à ${{q}}$ €, puis chaque séance coûte ${{p}}$ €. Le'
               ' tableau donne le prix payé selon le nombre de séances.\n\n'
               + tableau_points('Séances', 'Prix (€)', X07, Y07b)
               + '\nPlace les points A, B, C et D : le nombre de séances en abscisse, le prix en ordonnée.\n\n'
               '```courbe\nx: -1 ; 7\ny: -5 ; 80\ngrille: 1 ; 5\naxes: x = Séances ; y = Prix (€)\n'
               'placer: ' + placer_points(X07, Y07b, 4) + '\ntaille: moyenne\n'
               'description: Repère : séances en abscisse, de 1 en 1 ; prix en ordonnée, de 5 en 5.\n```',
               [var('u', '1..3'), var('q', 'eval:5*u'), var('v', '1..2'), var('p', 'eval:5*v')] + V07, [],
               ['Chaque colonne du tableau donne un point : (séances ; prix). Sur l\'axe vertical, une graduation'
                ' vaut $5$ €.',
                corr_points(X07, Y07b, 4) + '.'])],
    [spec('Bassin : (0 ; 2), (2 ; 6), (3 ; 8), (5 ; 12)', 0, {'a': 2, 'b': 2, 'x2': 2, 'x3': 3, 'x4': 5},
          ['0;2', '2;6', '3;8', '5;12'], 'correct'),
     spec('Erreur : B avec abscisse et ordonnée échangées', 0, {'a': 2, 'b': 2, 'x2': 2, 'x3': 3, 'x4': 5},
          ['0;2', '6;2', '3;8', '5;12'], 'incorrect'),
     spec('Erreur : D une graduation trop bas', 0, {'a': 2, 'b': 2, 'x2': 2, 'x3': 3, 'x4': 5},
          ['0;2', '2;6', '3;8', '5;11'], 'incorrect'),
     spec('Cinéma : carte 10 €, (0 ; 10), (1 ; 15), (4 ; 30), (6 ; 40)', 1,
          {'u': 2, 'v': 1, 'x2': 1, 'x3': 4, 'x4': 6}, ['0;10', '1;15', '4;30', '6;40'], 'correct'),
     spec('Erreur : C placé une graduation trop haut (35)', 1, {'u': 2, 'v': 1, 'x2': 1, 'x3': 4, 'x4': 6},
          ['0;10', '1;15', '4;35', '6;40'], 'incorrect')],
    delay=180))

# --- 08. 5-114 : représenter des données par un graphique cartésien ------------------------

X08 = ['6', '7', '8', '9', '10']
T08 = ['{{t1}}', '{{t2}}', '{{t3}}', '{{t4}}', '{{t5}}']
S08 = ['0', '1', '2', '3', '4']
H08 = ['{{h0}}', '{{h1}}', '{{h2}}', '{{h3}}', '{{h4}}']
MODELES.append(modele(
    '08-representer-des-donnees-par-un-graphique', 'Représenter des données par un graphique cartésien',
    'Représenter un relevé (température heure par heure, négative possible ; taille d\'une plante semaine'
    ' par semaine) par des points dans un repère, axes donnés', 3,
    [variation('Un matin d\'hiver, on a relevé la température toutes les heures.\n\n'
               + tableau_points('Heure (h)', 'Température (°C)', X08, T08)
               + '\nPlace les points A, B, C, D et E : l\'heure en abscisse, la température en ordonnée.\n\n'
               '```courbe\nx: -1 ; 11\ny: -6 ; 6\ngrille: 1 ; 1\naxes: x = Heure (h) ; y = Température (°C)\n'
               'placer: ' + placer_points(X08, T08, 5) + '\ntaille: moyenne\n'
               'description: Repère : heure en abscisse, de 1 en 1 ; température en ordonnée, de −6 à 6 °C.\n```',
               [var('t1', '-5..-3'), var('t2', '-3..-1'), var('t3', '-1..1'), var('t4', '1..3'), var('t5', '3..5')],
               [],
               ['Chaque colonne donne un point : (heure ; température). Une température négative se place sous'
                ' l\'axe des abscisses.',
                corr_points(X08, T08, 5) + '.']),
     variation('Chaque semaine, on a mesuré la hauteur d\'une plante.\n\n'
               + tableau_points('Semaine', 'Hauteur (cm)', S08, H08)
               + '\nPlace les points A, B, C, D et E : la semaine en abscisse, la hauteur en ordonnée.\n\n'
               '```courbe\nx: -1 ; 5\ny: -2 ; 22\ngrille: 1 ; 2\naxes: x = Semaine ; y = Hauteur (cm)\n'
               'placer: ' + placer_points(S08, H08, 5) + '\ntaille: moyenne\n'
               'description: Repère : semaines en abscisse, de 1 en 1 ; hauteur en ordonnée, de 2 en 2 cm.\n```',
               [var('u0', '1..2'), var('d1', '1..2'), var('d2', '1..2'), var('d3', '1..2'), var('d4', '1..2'),
                var('h0', 'eval:2*u0'), var('h1', 'eval:2*(u0+d1)'), var('h2', 'eval:2*(u0+d1+d2)'),
                var('h3', 'eval:2*(u0+d1+d2+d3)'), var('h4', 'eval:2*(u0+d1+d2+d3+d4)')],
               [],
               ['Chaque colonne donne un point : (semaine ; hauteur). Sur l\'axe vertical, une graduation vaut'
                ' $2$ cm.',
                corr_points(S08, H08, 5) + '.'])],
    [spec('Températures −4, −2, 0, 2, 4', 0, {'t1': -4, 't2': -2, 't3': 0, 't4': 2, 't5': 4},
          ['6;-4', '7;-2', '8;0', '9;2', '10;4'], 'correct'),
     spec('Erreur : températures négatives placées au-dessus de l\'axe', 0,
          {'t1': -4, 't2': -2, 't3': 0, 't4': 2, 't5': 4}, ['6;4', '7;2', '8;0', '9;2', '10;4'], 'incorrect'),
     spec('Erreur : A avec abscisse et ordonnée échangées', 0, {'t1': -3, 't2': -2, 't3': 0, 't4': 2, 't5': 4},
          ['-3;6', '7;-2', '8;0', '9;2', '10;4'], 'incorrect'),
     spec('Plante : 2, 4, 8, 10, 14', 1, {'u0': 1, 'd1': 1, 'd2': 2, 'd3': 1, 'd4': 2},
          ['0;2', '1;4', '2;8', '3;10', '4;14'], 'correct'),
     spec('Erreur : hauteurs lues de 1 en 1 (moitié)', 1, {'u0': 1, 'd1': 1, 'd2': 2, 'd3': 1, 'd4': 2},
          ['0;1', '1;2', '2;4', '3;5', '4;7'], 'incorrect')],
    delay=180))

# --- 09. 5-122 : ranger des nombres relatifs -----------------------------------------------

RANGE_ENTIERS = variation(
    'Range ces nombres du plus petit au plus grand.\n\n```ranger\nsigne: <\n- $-{{p}}$\n- $-{{q}}$\n- ${{s}}$\n'
    '- ${{t}}$\n- ${{u}}$\n```',
    [var('p', '6..9'), var('q', '2..5'), var('s', '-1|0|1'), var('t', '2..5'), var('u', '6..9')], [],
    ['**Deux nombres négatifs** : le plus petit est celui qui est le plus loin de $0$ ; $-{{p}} < -{{q}}$.',
     '**Un nombre négatif** est plus petit qu\'un nombre positif.',
     '$$' + col('-{{p}} < -{{q}} < {{s}} < {{t}} < {{u}}') + '$$'])
RANGE_DECIMAUX = variation(
    'Range ces nombres du plus grand au plus petit.\n\n```ranger\nsigne: >\n- ${{eval:b/10;d}}$\n- $0$\n'
    '- ${{eval:-d/10;d}}$\n- ${{eval:-(100*a+5)/100;d}}$\n- ${{eval:-(10*a+5)/10;d}}$\n```',
    [var('a', '2..4'), var('b', '1..9'), var('d', '1..9')], [],
    ['**Un nombre positif** est plus grand que $0$, et $0$ est plus grand que tout nombre négatif.',
     '**Deux nombres négatifs** : le plus grand est le plus proche de $0$. ${{eval:(100*a+5)/100;d}}$ est plus'
     ' proche de $0$ que ${{eval:(10*a+5)/10;d}}$ : $-{{eval:(100*a+5)/100;d}} > -{{eval:(10*a+5)/10;d}}$.',
     '$$' + col('{{eval:b/10;d}} > 0 > {{eval:-d/10;d}} > {{eval:-(100*a+5)/100;d}} > {{eval:-(10*a+5)/10;d}}')
     + '$$'])
MODELES.append(modele(
    '09-ranger-des-nombres-relatifs', 'Ranger des nombres relatifs',
    'Ranger cinq nombres relatifs : entiers dans l\'ordre croissant, puis décimaux dans l\'ordre décroissant'
    ' (−2,05 et −2,5 ; −0,7 et 0)', 3,
    [RANGE_ENTIERS, RANGE_DECIMAUX],
    ['RANGER:0:' + json.dumps({'p': '7', 'q': '3', 's': '0', 't': '4', 'u': '8'}),
     'RANGER:1:' + json.dumps({'a': '2', 'b': '4', 'd': '7'})],
    delay=60))


# --- Specs « ranger » : positions affichées calculées par le générateur ---------------------

def positions(chemin, vi, variables):
    out = subprocess.run(['pnpm', 'exec', 'tsx', 'docs/wip/questions/positions-ranger.ts', chemin, str(vi),
                          json.dumps(variables)],
                         check=True, capture_output=True, text=True).stdout.strip().splitlines()
    return json.loads(out[-1])


FAUX_RANGER = {0: 'Erreur : −3 avant −7 (distance à zéro)',
               1: 'Erreur : −2,5 avant −2,05 (plus de chiffres)'}

os.makedirs(DOSSIER, exist_ok=True)
for nom, mod in MODELES:
    chemin = os.path.join(DOSSIER, nom + '.json')
    # L'id écrit par `create-questions --publier` est gardé : sans lui, le fichier ne retrouve plus son modèle.
    if os.path.exists(chemin):
        ancien = json.load(open(chemin, encoding='utf-8'))
        if 'id' in ancien:
            mod = {'id': ancien['id'], **mod}
    a_ranger = [s for s in mod['testSpecs'] if isinstance(s, str)]
    mod['testSpecs'] = [s for s in mod['testSpecs'] if not isinstance(s, str)]
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(mod, f, ensure_ascii=False, indent='\t')
    for marque in a_ranger:
        _, vi, variables = marque.split(':', 2)
        vi = int(vi)
        variables = json.loads(variables)
        juste = positions(chemin, vi, variables)
        faux = juste[:]
        if vi == 0:
            faux[0], faux[1] = faux[1], faux[0]
        else:
            faux[3], faux[4] = faux[4], faux[3]
        mod['testSpecs'] += [spec('Ordre juste', vi, variables, juste, 'correct'),
                             spec(FAUX_RANGER[vi], vi, variables, faux, 'incorrect')]
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(mod, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits dans', DOSSIER)
