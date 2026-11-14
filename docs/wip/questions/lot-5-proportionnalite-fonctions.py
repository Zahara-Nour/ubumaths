"""Écrit les 10 modèles du lot 10 « Proportionnalité, fonctions, barres à construire » de la 5e.

Phase 0 : journal § 24, questions tranchées § 24 bis (David, 2026-11-14, « je te suis ») ; un point
par modèle :

| #  | Point | Titre | Réponse | Sous-notion, niveau |
| 01 | 5-112 | Construire un diagramme en barres | barres à construire | diagrammes en barres, 6 |
| 02 | 5-089 | Représenter une proportionnalité par un graphique | points à placer | situations de proportionnalité, 2 |
| 03 | 5-090 | Reconnaître la proportionnalité par les quotients | cases + choix | caractérisation, 4 |
| 04 | 5-141 | Reconnaître la proportionnalité sur un graphique | choix | caractérisation, 5 |
| 05 | 5-091 | Nuage de points et proportionnalité | choix (raison) | caractérisation, 6 |
| 06 | 5-099 | Caractériser graphiquement la proportionnalité | choix parmi des droites | caractérisation, 7 |
| 07 | 5-094 | Lire un tableau de valeurs | case | généralités sur les fonctions, 6 |
| 08 | 5-142 | Interpréter un tableau de valeurs | choix | généralités sur les fonctions, 7 |
| 09 | 5-096 | Lire un graphique cartésien | case | généralités sur les fonctions, 8 |
| 10 | 5-143 | Interpréter un graphique cartésien | cases | généralités sur les fonctions, 9 |

Décisions et pièges :
- un fichier ne porte ni `theme`, ni `domain`, ni `subdomain` (ADR 0035) ; nœud et tag : migration ;
- 01 : axe donné de 5 en 5 jusqu'à 50, ou `axe: à choisir` (réponse = échelle puis barres) ;
- 02, 03 : situation concrète (bornes 5-089, 5-090 : pas de tableau décontextualisé) ;
- 04 sans contexte (oui / non) ; 05 en contexte, la raison dans le choix (§ 24 bis) ;
- 03 : un « non » = une seule colonne dont le quotient diffère d'une unité (ou de 10 km/h) ;
- pas de notation fonctionnelle (bornes 5-094 à 5-143) ; les `f(x)` des blocs courbe ne s'affichent pas ;
- choisir une valeur dans une liste : indicatrices `1-min(abs(k-j),1)` (pas de `==` dans `eval:`,
  `{{if:}}` sur un seul niveau dans une variable) ;
- variables `e` et `i` interdites.

    python3 docs/wip/questions/lot-5-proportionnalite-fonctions.py scripts/questions/5-proportionnalite-fonctions
"""
import json
import os
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
    v['blanks'] = [{'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def m(x):
    return '$' + col(x) + '$'


def choix(lignes):
    return '```choix\nmelanger: non\n' + ''.join('- ' + l + '\n' for l in lignes) + '```'


def ind(k, j):
    """Indicatrice « k vaut j » pour `eval:`."""
    return f'(1-min(abs({k}-{j}),1))'


def pick(k, noms, base=1):
    """Expression `eval:` : la variable de `noms` de rang k (k = base, base + 1…)."""
    return 'eval:' + '+'.join(f'{n}*{ind(k, base + j)}' for j, n in enumerate(noms))


def tous_differents(noms):
    return [f'({a}-{b})*({a}-{b}) > 0' for idx, a in enumerate(noms) for b in noms[idx + 1:]]


MODELES = []

# --- 01. 5-112 : construire un diagramme en barres -----------------------------------------

SPORTS = ['Football', 'Natation', 'Danse', 'Judo', 'Tennis']
SPORT_VARS = ['a', 'b', 'c', 'd', 'g']


def tableau_barres(titre_col, titre_val, noms, vars_):
    lignes = f'| {titre_col} | {titre_val} |\n|---|---|\n'
    return lignes + ''.join(f'| {n} | ${{{{{v}}}}}$ |\n' for n, v in zip(noms, vars_))


def bloc_barres(titre, axes, noms, vars_, axe):
    return ('```barres\ntitre: ' + titre + '\naxes: ' + axes + '\n'
            + ''.join(f'{n} = {{{{{v}}}}}\n' for n, v in zip(noms, vars_))
            + 'axe: ' + axe + '\nplacer: toutes\n```')


BARRES_AXE = variation(
    'On a demandé aux élèves de 5e du collège leur sport préféré.\n\n'
    + tableau_barres('Sport', "Nombre d'élèves", SPORTS, SPORT_VARS)
    + '\nConstruis le diagramme en barres de ces données.\n\n'
    + bloc_barres('Sport préféré', 'Sport ; Élèves', SPORTS, SPORT_VARS, '0 à 50, de 5 en 5'),
    [var('u' + v, '1..10') for v in SPORT_VARS]
    + [var(v, f'eval:5*u{v}') for v in SPORT_VARS],
    [],
    ['Une graduation de l\'axe vaut $5$ élèves.',
     'Chaque barre monte jusqu\'à l\'effectif lu dans le tableau : par exemple, la barre Football'
     ' monte jusqu\'à ' + m('{{a}}') + ', soit ${{ua}}$ graduations.'])
FRUITS = ['Pomme', 'Banane', 'Fraise', 'Orange']
FRUIT_VARS = ['a', 'b', 'c', 'd']
BARRES_ECHELLE = variation(
    'Une cantine a compté les fruits choisis par les élèves pendant une semaine.\n\n'
    + tableau_barres('Fruit', 'Nombre de fruits', FRUITS, FRUIT_VARS)
    + '\nChoisis l\'échelle de l\'axe, puis construis le diagramme en barres.\n\n'
    + bloc_barres('Fruits choisis', 'Fruit ; Fruits', FRUITS, FRUIT_VARS, 'à choisir'),
    [var('u' + v, '1..10') for v in FRUIT_VARS]
    + [var(v, f'eval:10*u{v}') for v in FRUIT_VARS]
    + [var('mx', 'eval:max(a,b,c,d)')],
    [],
    ['L\'axe a $10$ graduations : on prend la plus petite échelle où la plus grande barre rentre.',
     'La plus grande barre vaut ${{mx}}$. Avec $5$ par graduation, l\'axe s\'arrêterait à $50$ :'
     ' trop court. Avec ' + m('10') + ', il monte jusqu\'à $100$ : tout rentre.',
     'Chaque barre monte jusqu\'à son effectif.'],
    ['mx > 50'])
s_axe = {'ua': 3, 'ub': 7, 'uc': 4, 'ud': 2, 'ug': 6}
s_ech = {'ua': 3, 'ub': 7, 'uc': 4, 'ud': 6}
MODELES.append(modele(
    '01-construire-un-diagramme-en-barres',
    'Construire un diagramme en barres',
    'Tableau des effectifs donné : construire toutes les barres, axe de 5 en 5 ou échelle à choisir',
    6, [BARRES_AXE, BARRES_ECHELLE],
    [spec('Axe donné : 15, 35, 20, 10, 30', 0, s_axe, [15, 35, 20, 10, 30], 'correct'),
     spec('Erreur : une graduation par élève compté (3, 7, 4, 2, 6)', 0, s_axe, [3, 7, 4, 2, 6],
          'incorrect'),
     spec('Erreur : deux barres échangées', 0, s_axe, [35, 15, 20, 10, 30], 'incorrect'),
     spec('Échelle 10 : 30, 70, 40, 60', 1, s_ech, [10, 30, 70, 40, 60], 'correct'),
     spec('Erreur : échelle 5 (70 ne rentre pas)', 1, s_ech, [5, 30, 70, 40, 60], 'incorrect')],
    delay=240))

# --- 02. 5-089 : représenter une proportionnalité par un graphique ------------------------


def placer3(xs, ys):
    return 'placer: ' + ' ; '.join(f'{n}=({{{{{x}}}}} ; {{{{{y}}}}})'
                                    for n, x, y in zip('ABC', xs, ys))


def tableau3(tx, ty, xs, ys):
    return (f'| {tx} | ' + ' | '.join(f'${{{{{x}}}}}$' for x in xs) + ' |\n|---|---|---|---|\n'
            f'| {ty} | ' + ' | '.join(f'${{{{{y}}}}}$' for y in ys) + ' |\n')


GRAPHE_FRUITS = variation(
    'Les pommes coûtent ${{a}}~\\unit{€}$ le kilogramme. Le prix payé est proportionnel à la'
    ' masse achetée.\n\n'
    + tableau3('Masse (kg)', 'Prix (€)', ['x1', 'x2', 'x3'], ['y1', 'y2', 'y3'])
    + '\nPlace les points A, B et C qui représentent ce tableau : la masse en abscisse, le prix en'
    ' ordonnée.\n\n```courbe\nx: -1 ; 6\ny: -1 ; {{eval:5*a+1}}\ngrille: 1 ; 1\n'
    'axes: x = Masse (kg) ; y = Prix (€)\n' + placer3(['x1', 'x2', 'x3'], ['y1', 'y2', 'y3'])
    + '\ntaille: moyenne\ndescription: Repère gradué de 1 en 1 : masse en abscisse, prix en'
    ' ordonnée.\n```',
    [var('a', '2..3'), var('x1', '1..5'), var('x2', '1..5'), var('x3', '1..5'),
     var('y1', 'eval:a*x1'), var('y2', 'eval:a*x2'), var('y3', 'eval:a*x3')],
    [],
    ['Chaque colonne du tableau donne un point : (masse ; prix).',
     'A' + m('({{x1}} ; {{y1}})') + ', B' + m('({{x2}} ; {{y2}})') + ', C'
     + m('({{x3}} ; {{y3}})') + '.',
     'Les trois points sont alignés avec l\'origine du repère : c\'est le cas de toute situation'
     ' de proportionnalité.'],
    ['x1 < x2', 'x2 < x3'])
GRAPHE_VELO = variation(
    'Léa roule à vélo à la vitesse constante de ${{v}}~\\unit{km/h}$. La distance parcourue est'
    ' proportionnelle à la durée.\n\n'
    + tableau3('Durée (h)', 'Distance (km)', ['x1', 'x2', 'x3'], ['y1', 'y2', 'y3'])
    + '\nPlace les points A, B et C qui représentent ce tableau : la durée en abscisse, la'
    ' distance en ordonnée.\n\n```courbe\nx: -1 ; 5\ny: -5 ; {{eval:4*v+10}}\ngrille: 1 ; 5\n'
    'axes: x = Durée (h) ; y = Distance (km)\n' + placer3(['x1', 'x2', 'x3'], ['y1', 'y2', 'y3'])
    + '\ntaille: moyenne\ndescription: Repère : durée en abscisse, de 1 en 1 ; distance en'
    ' ordonnée, de 5 en 5.\n```',
    [var('w', '2..4'), var('v', 'eval:5*w'), var('x1', '1..4'), var('x2', '1..4'),
     var('x3', '1..4'), var('y1', 'eval:v*x1'), var('y2', 'eval:v*x2'), var('y3', 'eval:v*x3')],
    [],
    ['Chaque colonne du tableau donne un point : (durée ; distance).',
     'A' + m('({{x1}} ; {{y1}})') + ', B' + m('({{x2}} ; {{y2}})') + ', C'
     + m('({{x3}} ; {{y3}})') + '.',
     'Les trois points sont alignés avec l\'origine du repère : c\'est le cas de toute situation'
     ' de proportionnalité.'],
    ['x1 < x2', 'x2 < x3'])
GRAPHE_RECETTE = variation(
    'Pour une pâte à crêpes, il faut ${{f}}~\\unit{g}$ de farine par personne. La masse de farine'
    ' est proportionnelle au nombre de personnes.\n\n'
    + tableau3('Nombre de personnes', 'Farine (g)', ['x1', 'x2', 'x3'], ['y1', 'y2', 'y3'])
    + '\nPlace les points A, B et C qui représentent ce tableau : le nombre de personnes en'
    ' abscisse, la masse de farine en ordonnée.\n\n```courbe\nx: -1 ; 9\ny: {{eval:-f}} ; '
    '{{eval:9*f}}\ngrille: 1 ; {{f}}\naxes: x = Personnes ; y = Farine (g)\n'
    + placer3(['x1', 'x2', 'x3'], ['y1', 'y2', 'y3'])
    + '\ntaille: moyenne\ndescription: Repère : nombre de personnes en abscisse, de 1 en 1 ;'
    ' farine en ordonnée, de {{f}} en {{f}} g.\n```',
    [var('q', '1..2'), var('f', 'eval:50*q'), var('n1', '1..4'), var('n2', '1..4'),
     var('n3', '1..4'), var('x1', 'eval:2*n1'), var('x2', 'eval:2*n2'), var('x3', 'eval:2*n3'),
     var('y1', 'eval:f*x1'), var('y2', 'eval:f*x2'), var('y3', 'eval:f*x3')],
    [],
    ['Chaque colonne du tableau donne un point : (personnes ; farine).',
     'A' + m('({{x1}} ; {{y1}})') + ', B' + m('({{x2}} ; {{y2}})') + ', C'
     + m('({{x3}} ; {{y3}})') + '.',
     'Les trois points sont alignés avec l\'origine du repère : c\'est le cas de toute situation'
     ' de proportionnalité.'],
    ['n1 < n2', 'n2 < n3'])
s_f = {'a': 3, 'x1': 1, 'x2': 2, 'x3': 4}
s_v = {'w': 3, 'x1': 1, 'x2': 2, 'x3': 3}
s_r = {'q': 1, 'n1': 1, 'n2': 2, 'n3': 4}
MODELES.append(modele(
    '02-representer-une-proportionnalite-par-un-graphique',
    'Représenter une proportionnalité par un graphique',
    'Tableau d\'une situation de proportionnalité : placer ses trois points dans un repère',
    2, [GRAPHE_FRUITS, GRAPHE_VELO, GRAPHE_RECETTE],
    [spec('Pommes à 3 € : (1 ; 3), (2 ; 6), (4 ; 12)', 0, s_f, ['1;3', '2;6', '4;12'], 'correct'),
     spec('Erreur : abscisse et ordonnée échangées pour B', 0, s_f, ['1;3', '6;2', '4;12'],
          'incorrect'),
     spec('Vélo à 15 km/h : (1 ; 15), (2 ; 30), (3 ; 45)', 1, s_v, ['1;15', '2;30', '3;45'],
          'correct'),
     spec('Erreur : C placé une graduation trop bas', 1, s_v, ['1;15', '2;30', '3;40'],
          'incorrect'),
     spec('Crêpes, 50 g : (2 ; 100), (4 ; 200), (8 ; 400)', 2, s_r, ['2;100', '4;200', '8;400'],
          'correct'),
     spec('Erreur : nombre de personnes lu 1, 2, 4', 2, s_r, ['1;100', '2;200', '4;400'],
          'incorrect')],
    delay=180))

# --- 03. 5-090 : reconnaître la proportionnalité par les quotients ------------------------

QUOTIENT_VARS = [var('o', '0..1'), var('w', '1..2'), var('sg', 'eval:2*w-3'), var('c', '1..3'),
                 var('r', 'eval:1-o')]


def quotients(pas):
    return [var(f'k{j}', f'eval:k+(1-o)*{pas}*sg*{ind("c", j)}') for j in (1, 2, 3)]


def tableau_quotients(tx, ty, tq):
    return (f'| {tx} | ${{{{x1}}}}$ | ${{{{x2}}}}$ | ${{{{x3}}}}$ |\n|---|---|---|---|\n'
            f'| {ty} | ${{{{y1}}}}$ | ${{{{y2}}}}$ | ${{{{y3}}}}$ |\n'
            f'| {tq} | $?$ | $?$ | $?$ |\n')


def etapes_quotients(quoi, unite):
    return ['On calcule le quotient ' + quoi + ' dans chaque colonne : ' + m('{{k1}}') + ', '
            + m('{{k2}}') + ' et ' + m('{{k3}}') + '.',
            '{{if:o==1|Les trois quotients sont égaux : c\'est une situation de'
            ' proportionnalité, de coefficient ${{k}}$' + unite + '.|Les quotients ne sont pas'
            ' tous égaux : ce n\'est pas une situation de proportionnalité.}}']


QUOTIENT_CAHIERS = variation(
    'Une papeterie affiche le prix de lots de cahiers.\n\n'
    + tableau_quotients('Nombre de cahiers', 'Prix (€)', 'Prix ÷ nombre')
    + '\nComplète la dernière ligne, puis réponds : le prix est-il proportionnel au nombre de'
    ' cahiers ?\n\n' + choix(['Oui', 'Non']),
    [var('k', '3..8')] + QUOTIENT_VARS + quotients(1)
    + [var('x1', '2..4'), var('x2', '5..7'), var('x3', '8..10'),
       var('y1', 'eval:k1*x1'), var('y2', 'eval:k2*x2'), var('y3', 'eval:k3*x3')],
    ['{{k1}}', '{{k2}}', '{{k3}}', '{{r}}'],
    etapes_quotients('prix ÷ nombre', ' (le prix d\'un cahier, en euros)'))
QUOTIENT_TRAJET = variation(
    'Un automobiliste note la distance parcourue et la durée de trois trajets.\n\n'
    + tableau_quotients('Durée (h)', 'Distance (km)', 'Distance ÷ durée')
    + '\nComplète la dernière ligne, puis réponds : la distance est-elle proportionnelle à la'
    ' durée ?\n\n' + choix(['Oui', 'Non']),
    [var('kk', '4..9'), var('k', 'eval:10*kk')] + QUOTIENT_VARS + quotients(10)
    + [var('x1', '1..1'), var('x2', '2..3'), var('x3', '4..5'),
       var('y1', 'eval:k1*x1'), var('y2', 'eval:k2*x2'), var('y3', 'eval:k3*x3')],
    ['{{k1}}', '{{k2}}', '{{k3}}', '{{r}}'],
    etapes_quotients('distance ÷ durée', ' (la vitesse, en km/h)'))
s_oui = {'k': 4, 'o': 1, 'w': 2, 'c': 2, 'x1': 3, 'x2': 5, 'x3': 9}
s_non = {'k': 4, 'o': 0, 'w': 2, 'c': 2, 'x1': 3, 'x2': 5, 'x3': 9}
t_non = {'kk': 6, 'o': 0, 'w': 1, 'c': 3, 'x1': 1, 'x2': 2, 'x3': 4}
MODELES.append(modele(
    '03-reconnaitre-la-proportionnalite-par-les-quotients',
    'Reconnaître la proportionnalité par les quotients',
    'Tableau d\'une situation concrète : calculer les trois quotients, puis dire si c\'est'
    ' proportionnel',
    4, [QUOTIENT_CAHIERS, QUOTIENT_TRAJET],
    [spec('Prix 12, 20, 36 : quotients 4, oui', 0, s_oui, [4, 4, 4, 0], 'correct'),
     spec('Erreur : dit « non » alors que les quotients sont égaux', 0, s_oui, [4, 4, 4, 1],
          'incorrect'),
     spec('Prix 12, 25, 36 : quotients 4, 5, 4, non', 0, s_non, [4, 5, 4, 1], 'correct'),
     spec('Erreur : « oui » sans regarder la 2e colonne', 0, s_non, [4, 5, 4, 0], 'incorrect'),
     spec('Trajets 60, 120, 200 : quotients 60, 60, 50, non', 1, t_non, [60, 60, 50, 1],
          'correct'),
     spec('Erreur : quotient durée ÷ distance', 1, t_non, ['1/60', '1/60', '1/50', 1],
          'incorrect')],
    delay=150))

# --- 04. 5-141 : reconnaître la proportionnalité sur un graphique ------------------------

CAS_VARS = [var('t', '1..3'), var('bb', f'eval:b*{ind("t", 2)}'),
            var('lift', f'eval:2*{ind("t", 3)}')]
ETAPE_ORIGINE = ('Une situation de proportionnalité est représentée par des points **alignés avec'
                 ' l\'origine** du repère.')
GRAPHIQUE_SANS_CONTEXTE = variation(
    'Les points A, B, C et D représentent une situation.\n\n```courbe\nx: -1 ; 5\ny: -1 ; 12\n'
    'grille: 1 ; 1\npoints: A(1 ; {{y1}}), B(2 ; {{y2}}), C(3 ; {{y3}}), D(4 ; {{y4}})\n'
    'taille: moyenne\ndescription: Quatre points A, B, C, D d\'abscisses 1, 2, 3 et 4.\n```\n\n'
    'Cette situation est-elle une situation de proportionnalité ?\n\n' + choix(['Oui', 'Non']),
    [var('a', '1..2'), var('b', '1..3')] + CAS_VARS
    + [var('y1', 'eval:a+bb'), var('y2', 'eval:2*a+bb'), var('y3', 'eval:3*a+bb+lift'),
       var('y4', 'eval:4*a+bb'), var('r', f'eval:1-{ind("t", 1)}')],
    ['{{r}}'],
    [ETAPE_ORIGINE,
     '{{if:t==1|Ici, les points sont alignés et la droite qui les porte passe par l\'origine :'
     ' **oui**, c\'est une situation de proportionnalité.|{{if:t==2|Ici, les points sont'
     ' alignés, mais la droite qui les porte ne passe pas par l\'origine : **non**.|Ici, le'
     ' point C n\'est pas aligné avec les autres : **non**.}}}}'])
MODELES.append(modele(
    '04-reconnaitre-la-proportionnalite-sur-un-graphique',
    'Reconnaître la proportionnalité sur un graphique',
    'Quatre points dans un repère, sans contexte : alignés avec l\'origine ou non',
    5, [GRAPHIQUE_SANS_CONTEXTE],
    [spec('Alignés avec l\'origine : oui', 0, {'a': 2, 'b': 1, 't': 1}, [0], 'correct'),
     spec('Alignés sans l\'origine : non', 0, {'a': 2, 'b': 3, 't': 2}, [1], 'correct'),
     spec('Erreur : alignés sans l\'origine pris pour proportionnels', 0,
          {'a': 2, 'b': 3, 't': 2}, [0], 'incorrect'),
     spec('C hors de la droite : non', 0, {'a': 1, 'b': 2, 't': 3}, [1], 'correct'),
     spec('Erreur : « oui » alors que C n\'est pas aligné', 0, {'a': 1, 'b': 2, 't': 3}, [0],
          'incorrect')],
    delay=60))

# --- 05. 5-091 : nuage de points et proportionnalité --------------------------------------

RAISONS = ['Oui', 'Non : les points sont alignés, mais pas avec l\'origine',
           'Non : les points ne sont pas alignés']
ETAPES_NUAGE = [
    ETAPE_ORIGINE,
    '{{if:t==1|Les points sont alignés avec l\'origine : **oui**, le prix est proportionnel au'
    ' nombre de {{quoi}}.|{{if:t==2|Les points sont alignés, mais la droite qui les porte ne'
    ' passe pas par l\'origine (il y a un montant fixe) : **non**.|Les derniers points ne sont pas'
    ' alignés avec les premiers (à partir d\'un certain nombre, chaque {{un}} supplémentaire coûte moins cher) : **non**.}}}}']
NUAGE_CINEMA = variation(
    'Le graphique donne le prix payé, en euros, selon le nombre de places de cinéma achetées.\n\n'
    '```courbe\nx: -1 ; 6\ny: -5 ; 55\ngrille: 1 ; 5\naxes: x = Places ; y = Prix (€)\n'
    'points: A(1 ; {{y1}}), B(2 ; {{y2}}), C(3 ; {{y3}}), D(4 ; {{y4}}), F(5 ; {{y5}})\n'
    'taille: moyenne\ndescription: Nuage de cinq points : nombre de places de 1 à 5 en abscisse,'
    ' prix en ordonnée.\n```\n\nLe prix payé est-il proportionnel au nombre de places ?\n\n'
    + choix(RAISONS),
    [var('a', '6..9'), var('b', '3..5')] + CAS_VARS
    + [var('rb', f'eval:3*{ind("t", 3)}'),
       var('y1', 'eval:a+bb'), var('y2', 'eval:2*a+bb'), var('y3', 'eval:3*a+bb'),
       var('y4', 'eval:4*a+bb-rb'), var('y5', 'eval:5*a+bb-2*rb'), var('r', 'eval:t-1')],
    ['{{r}}'],
    [s.replace('{{quoi}}', 'places').replace('{{un}}', 'place') for s in ETAPES_NUAGE])
NUAGE_BUS = variation(
    'Le graphique donne le prix payé, en euros, selon le nombre de tickets de bus achetés.\n\n'
    '```courbe\nx: -1 ; 7\ny: -2 ; 26\ngrille: 1 ; 2\naxes: x = Tickets ; y = Prix (€)\n'
    'points: A(1 ; {{y1}}), B(2 ; {{y2}}), C(3 ; {{y3}}), D(4 ; {{y4}}), F(5 ; {{y5}}),'
    ' G(6 ; {{y6}})\ntaille: moyenne\ndescription: Nuage de six points : nombre de tickets de 1'
    ' à 6 en abscisse, prix en ordonnée.\n```\n\nLe prix payé est-il proportionnel au nombre de'
    ' tickets ?\n\n' + choix(RAISONS),
    [var('a', '2..3'), var('b', '2..4')] + CAS_VARS
    + [var('rb', f'eval:2*{ind("t", 3)}'),
       var('y1', 'eval:a+bb'), var('y2', 'eval:2*a+bb'), var('y3', 'eval:3*a+bb'),
       var('y4', 'eval:4*a+bb'), var('y5', 'eval:5*a+bb-rb'), var('y6', 'eval:6*a+bb-2*rb'),
       var('r', 'eval:t-1')],
    ['{{r}}'],
    [s.replace('{{quoi}}', 'tickets').replace('{{un}}', 'ticket') for s in ETAPES_NUAGE])
MODELES.append(modele(
    '05-nuage-de-points-et-proportionnalite',
    'Nuage de points et proportionnalité',
    'Prix selon un nombre d\'objets : proportionnel, alignés sans l\'origine, ou pas alignés',
    6, [NUAGE_CINEMA, NUAGE_BUS],
    [spec('Cinéma, 7 € la place : oui', 0, {'a': 7, 'b': 4, 't': 1}, [0], 'correct'),
     spec('Cinéma avec frais de 4 € : alignés sans l\'origine', 0, {'a': 7, 'b': 4, 't': 2}, [1],
          'correct'),
     spec('Erreur : frais pris pour proportionnel', 0, {'a': 7, 'b': 4, 't': 2}, [0],
          'incorrect'),
     spec('Bus, prix dégressif : pas alignés', 1, {'a': 2, 'b': 3, 't': 3}, [2], 'correct'),
     spec('Erreur : dégressif pris pour « alignés sans l\'origine »', 1, {'a': 2, 'b': 3, 't': 3},
          [1], 'incorrect')],
    delay=75))

# --- 06. 5-099 : caractériser graphiquement la proportionnalité ---------------------------

COULEURS = ['bleu', 'rouge', 'vert', 'violet']
DROITES = ['Laquelle de ces droites représente une situation de proportionnalité ?\n\n'
           + choix(['$d_1$', '$d_2$', '$d_3$', '$d_4$'])]


def bloc_droites(expr):
    return ('```courbe\nx: -1 ; 5\ny: -4 ; 12\ngrille: 1 ; 1\n'
            + ''.join(f'f{j}(x) = {expr(j)}   {COULEURS[j - 1]}   nom=d_{j}\n' for j in (1, 2, 3, 4))
            + 'taille: moyenne\ndescription: Quatre droites nommées d1, d2, d3 et d4.\n```\n\n')


DROITES_SEULES = variation(
    bloc_droites(lambda j: f'{{{{s{j}}}}}*x + {{{{b{j}}}}}') + DROITES[0],
    [var('p', '1..4')]
    + [var(f's{j}', '1..3') for j in (1, 2, 3, 4)]
    + [var(f'c{j}', '-3..4') for j in (1, 2, 3, 4)]
    + [var(f'b{j}', f'eval:c{j}*min(abs(p-{j}),1)') for j in (1, 2, 3, 4)]
    + [var('r', 'eval:p-1')],
    ['{{r}}'],
    ['Une situation de proportionnalité est représentée par une **droite qui passe par'
     ' l\'origine** du repère.',
     'Seule ' + m('d_{{p}}') + ' passe par l\'origine : c\'est elle.'],
    [f'c{j}*c{j} > 0' for j in (1, 2, 3, 4)])


def expr_courbe(j):
    # `{{if:}}` imbriqué non résolu dans un bloc courbe (sonde) : coefficients calculés.
    return f'{{{{a{j}}}}}*x^2 + {{{{m{j}}}}}*x + {{{{k{j}}}}}'


DROITES_ET_COURBE = variation(
    bloc_droites(expr_courbe).replace('Quatre droites', 'Quatre lignes') + DROITES[0].replace(
        'ces droites', 'ces lignes'),
    [var('p', '1..4'), var('q', 'eval:p-4*floor(p/4)+1')]
    + [var(f's{j}', '1..3') for j in (1, 2, 3, 4)]
    + [var(f'c{j}', '-3..4') for j in (1, 2, 3, 4)]
    + [var(f'a{j}', f'eval:0.5*{ind("q", j)}') for j in (1, 2, 3, 4)]
    + [var(f'm{j}', f'eval:s{j}*(1-{ind("q", j)})') for j in (1, 2, 3, 4)]
    + [var(f'k{j}', f'eval:c{j}*min(abs(p-{j}),1)*(1-{ind("q", j)})') for j in (1, 2, 3, 4)]
    + [var('r', 'eval:p-1')],
    ['{{r}}'],
    ['Une situation de proportionnalité est représentée par une **droite qui passe par'
     ' l\'origine** du repère.',
     '$d_{{q}}$ passe par l\'origine, mais ce n\'est pas une droite. Seule ' + m('d_{{p}}')
     + ' est une droite qui passe par l\'origine : c\'est elle.'],
    [f'c{j}*c{j} > 0' for j in (1, 2, 3, 4)])
s_d = {'p': 3, 's1': 2, 's2': 1, 's3': 2, 's4': 3, 'c1': 2, 'c2': -1, 'c3': 3, 'c4': 1}
MODELES.append(modele(
    '06-caracteriser-graphiquement-la-proportionnalite',
    'Caractériser graphiquement la proportionnalité',
    'Quatre lignes dans un repère : choisir la droite qui passe par l\'origine',
    7, [DROITES_SEULES, DROITES_ET_COURBE],
    [spec('d3 passe par l\'origine', 0, s_d, [2], 'correct'),
     spec('Erreur : la droite la plus pentue', 0, s_d, [3], 'incorrect'),
     spec('d3 droite par l\'origine, d4 courbe', 1, s_d, [2], 'correct'),
     spec('Erreur : la courbe qui passe par l\'origine', 1, s_d, [3], 'incorrect')],
    delay=60))

# --- 07. 5-094 : lire un tableau de valeurs -----------------------------------------------

HEURES = [f't{j}' for j in range(1, 8)]
TARIFS = [f'p{j}' for j in range(1, 7)]
LIRE_CARRE = variation(
    'Le tableau donne l\'aire d\'un carré selon la longueur de son côté.\n\n'
    '| Côté (cm) | $1$ | $2$ | $3$ | $4$ | $5$ | $6$ | $7$ |\n|---|---|---|---|---|---|---|---|\n'
    '| Aire (cm²) | $1$ | $4$ | $9$ | $16$ | $25$ | $36$ | $49$ |\n\n'
    'Quelle est l\'aire d\'un carré de côté ${{k}}~\\unit{cm}$ ?\n\n$?~\\unit{cm^2}$',
    [var('k', '2..7'), var('v', 'eval:k*k')],
    ['{{v}}'],
    ['On cherche ${{k}}$ dans la ligne « Côté », puis on lit la valeur en dessous.',
     'L\'aire est ' + m('{{v}}~\\unit{cm^2}') + '.'])
LIRE_TEMPERATURE = variation(
    'Le tableau donne la température relevée à chaque heure de la matinée.\n\n'
    '| Heure (h) | $6$ | $7$ | $8$ | $9$ | $10$ | $11$ | $12$ |\n|---|---|---|---|---|---|---|---|\n'
    '| Température (°C) | ' + ' | '.join(f'${{{{{t}}}}}$' for t in HEURES) + ' |\n\n'
    'Quelle température faisait-il à ${{h}}$ h ?\n\n$?~\\unit{°C}$',
    [var(t, '2..18') for t in HEURES] + [var('k', '1..7'), var('h', 'eval:k+5'),
                                          var('v', pick('k', HEURES))],
    ['{{v}}'],
    ['On cherche ${{h}}$ h dans la première ligne, puis on lit la température en dessous.',
     'Il faisait ' + m('{{v}}~\\unit{°C}') + '.'],
    tous_differents(HEURES))
LIRE_TAXI = variation(
    'Le tableau donne le prix d\'une course de taxi selon la distance parcourue.\n\n'
    '| Distance (km) | $1$ | $2$ | $3$ | $4$ | $5$ | $6$ |\n|---|---|---|---|---|---|---|\n'
    '| Prix (€) | ' + ' | '.join(f'${{{{{p}}}}}$' for p in TARIFS) + ' |\n\n'
    'Quelle distance a-t-on parcourue pour une course de ${{v}}~\\unit{€}$ ?\n\n$?~\\unit{km}$',
    [var('b', '3..5'), var('a', '2..3')]
    + [var(p, f'eval:b+a*{j}') for j, p in enumerate(TARIFS, 1)]
    + [var('k', '1..6'), var('v', 'eval:b+a*k')],
    ['{{k}}'],
    ['On cherche ${{v}}$ dans la ligne « Prix », puis on lit la distance au-dessus.',
     'La course mesurait ' + m('{{k}}~\\unit{km}') + '.'])
s_t = {f't{j}': v for j, v in enumerate([4, 6, 9, 11, 14, 15, 17], 1)}
MODELES.append(modele(
    '07-lire-un-tableau-de-valeurs',
    'Lire un tableau de valeurs',
    'Lire la valeur qui correspond à un nombre dans un tableau, ou le nombre qui donne une valeur',
    6, [LIRE_CARRE, LIRE_TEMPERATURE, LIRE_TAXI],
    [spec('Côté 5 : 25', 0, {'k': 5}, [25], 'correct'),
     spec('Erreur : colonne voisine', 0, {'k': 5}, [36], 'incorrect'),
     spec('Erreur : 2 × côté', 0, {'k': 5}, [10], 'incorrect'),
     spec('9 h : 11 °C', 1, {**s_t, 'k': 4}, [11], 'correct'),
     spec('Erreur : colonne voisine', 1, {**s_t, 'k': 4}, [9], 'incorrect'),
     spec('Course de 13 € : 4 km', 2, {'b': 5, 'a': 2, 'k': 4}, [4], 'correct'),
     spec('Erreur : lit la ligne du prix', 2, {'b': 5, 'a': 2, 'k': 4}, [13], 'incorrect')]))

# --- 08. 5-142 : interpréter un tableau de valeurs ----------------------------------------

SENS = ['Elle augmente', 'Elle diminue', 'Ni l\'un ni l\'autre : elle augmente et diminue']
ORDRE_MELANGE = [2, 4, 1, 5, 3]


def valeurs_sens():
    vs = [var('t', '1..3')]
    for j in range(1, 6):
        vs.append(var(f'y{j}', f'eval:{ind("t", 1)}*w{j}+{ind("t", 2)}*w{6 - j}'
                               f'+{ind("t", 3)}*w{ORDRE_MELANGE[j - 1]}'))
    vs.append(var('r', 'eval:t-1'))
    return vs


def croissance(base, pas):
    return ([var('w1', base)] + [var(f'd{j}', pas) for j in range(1, 5)]
            + [var(f'w{j + 1}', f'eval:w{j}+d{j}') for j in range(1, 5)])


ETAPES_SENS = [
    'On lit la deuxième ligne de gauche à droite : ${{y1}}$, ${{y2}}$, ${{y3}}$, ${{y4}}$,'
    ' ${{y5}}$.',
    '{{if:t==1|Chaque valeur est plus grande que la précédente : elle **augmente**.|{{if:t==2|Chaque valeur est plus petite que la précédente : elle diminue.|Elle augmente'
    ' parfois et diminue parfois : ni l\'un ni l\'autre.}}}}']
SENS_TEMPERATURE = variation(
    'Le tableau donne la température d\'une ville à différentes heures.\n\n'
    '| Heure (h) | $8$ | $9$ | $10$ | $11$ | $12$ |\n|---|---|---|---|---|---|\n'
    '| Température (°C) | ${{y1}}$ | ${{y2}}$ | ${{y3}}$ | ${{y4}}$ | ${{y5}}$ |\n\n'
    'Quand l\'heure augmente, comment varie la température ?\n\n' + choix(SENS),
    croissance('3..10', '1..3') + valeurs_sens(),
    ['{{r}}'],
    ETAPES_SENS)
SENS_ABONNES = variation(
    'Le tableau donne le nombre d\'adhérents d\'un club de sport chaque année.\n\n'
    '| Année | $2021$ | $2022$ | $2023$ | $2024$ | $2025$ |\n|---|---|---|---|---|---|\n'
    '| Adhérents | ${{y1}}$ | ${{y2}}$ | ${{y3}}$ | ${{y4}}$ | ${{y5}}$ |\n\n'
    'Quand l\'année augmente, comment varie le nombre d\'adhérents ?\n\n' + choix(SENS),
    croissance('40..60', '2..8') + valeurs_sens(),
    ['{{r}}'],
    ETAPES_SENS)
s_s = {'w1': 5, 'd1': 2, 'd2': 1, 'd3': 3, 'd4': 2}
MODELES.append(modele(
    '08-interpreter-un-tableau-de-valeurs',
    'Interpréter un tableau de valeurs',
    'Dire si une grandeur augmente, diminue, ou ni l\'un ni l\'autre quand l\'autre augmente',
    7, [SENS_TEMPERATURE, SENS_ABONNES],
    [spec('5, 7, 8, 11, 13 : augmente', 0, {**s_s, 't': 1}, [0], 'correct'),
     spec('13, 11, 8, 7, 5 : diminue', 0, {**s_s, 't': 2}, [1], 'correct'),
     spec('Erreur : lit le tableau de droite à gauche', 0, {**s_s, 't': 2}, [0], 'incorrect'),
     spec('7, 11, 5, 13, 8 : ni l\'un ni l\'autre', 1, {**s_s, 'w1': 45, 't': 3}, [2], 'correct'),
     spec('Erreur : compare seulement la première et la dernière', 1,
          {**s_s, 'w1': 45, 't': 3}, [0], 'incorrect')],
    delay=60))

# --- 09. 5-096 : lire un graphique cartésien ----------------------------------------------

POINTS7 = [f'y{j}' for j in range(0, 7)]
NUAGE6 = [f'y{j}' for j in range(1, 7)]
LIRE_COURBE = variation(
    'Le graphique donne la hauteur d\'eau, en centimètres, dans un bassin selon le temps écoulé,'
    ' en heures.\n\n```courbe\nx: -1 ; 7\ny: -1 ; 13\ngrille: 1 ; 1\n'
    'axes: x = Temps (h) ; y = Hauteur (cm)\ndonnées: '
    + ' ; '.join(f'({j} ; {{{{y{j}}}}})' for j in range(0, 7))
    + '\ntaille: moyenne\n```\n\nQuelle est la hauteur d\'eau au bout de ${{k}}$ h ?\n\n'
    '$?~\\unit{cm}$',
    [var(y, '1..12') for y in POINTS7] + [var('k', '1..6'), var('v', pick('k', POINTS7, 0))],
    ['{{v}}'],
    ['On part de ${{k}}$ sur l\'axe des abscisses, on monte jusqu\'à la ligne, puis on lit'
     ' l\'ordonnée sur l\'axe vertical.',
     'La hauteur est ' + m('{{v}}~\\unit{cm}') + '.'],
    ['(v-k)*(v-k) > 0'])
LIRE_NUAGE = variation(
    'Voici six points A, B, C, D, F et G dans un repère.\n\n```courbe\nx: -1 ; 7\ny: -1 ; 11\n'
    'grille: 1 ; 1\npoints: '
    + ', '.join(f'{n}({j} ; {{{{y{j}}}}})' for j, n in enumerate('ABCDFG', 1))
    + '\ntaille: moyenne\ndescription: Six points A, B, C, D, F, G d\'abscisses 1 à 6.\n```\n\n'
    'Quelle est l\'abscisse du point d\'ordonnée ${{v}}$ ?\n\n$?$',
    [var(y, '1..10') for y in NUAGE6] + [var('k', '1..6'), var('v', pick('k', NUAGE6))],
    ['{{k}}'],
    ['On part de ${{v}}$ sur l\'axe des ordonnées, on va horizontalement jusqu\'au point, puis'
     ' on lit son abscisse sur l\'axe horizontal.',
     'L\'abscisse est ' + m('{{k}}') + '.'],
    tous_differents(NUAGE6) + ['(v-k)*(v-k) > 0'])
s_c = {f'y{j}': v for j, v in enumerate([2, 5, 7, 8, 6, 9, 11])}
s_n = {f'y{j}': v for j, v in enumerate([3, 8, 5, 1, 9, 6], 1)}
MODELES.append(modele(
    '09-lire-un-graphique-cartesien',
    'Lire un graphique cartésien',
    'Lire l\'ordonnée d\'un point d\'une courbe, ou l\'abscisse d\'un point d\'un nuage',
    8, [LIRE_COURBE, LIRE_NUAGE],
    [spec('Au bout de 3 h : 8 cm', 0, {**s_c, 'k': 3}, [8], 'correct'),
     spec('Erreur : heure voisine', 0, {**s_c, 'k': 3}, [7], 'incorrect'),
     spec('Ordonnée 9 : abscisse 5', 1, {**s_n, 'k': 5}, [5], 'correct'),
     spec('Erreur : rend l\'ordonnée', 1, {**s_n, 'k': 5}, [9], 'incorrect')],
    delay=60))

# --- 10. 5-143 : interpréter un graphique cartésien ---------------------------------------

CROISSANTE = [f'y{j}' for j in range(0, 7)]
DEPASSER_CROISSANTE = variation(
    'Le graphique donne la température d\'un four, en dizaines de degrés, selon le temps de'
    ' chauffe, en minutes.\n\n```courbe\nx: -1 ; 7\ny: -1 ; 20\ngrille: 1 ; 1\n'
    'axes: x = Temps (min) ; y = Température (dizaines de °C)\ndonnées: '
    + ' ; '.join(f'({j} ; {{{{y{j}}}}})' for j in range(0, 7))
    + '\ntaille: moyenne\n```\n\nÀ partir de combien de minutes la température dépasse-t-elle'
    ' ${{s}}$ dizaines de degrés ?\n\nÀ partir de $?$ min',
    [var('y0', '2..4')] + [var(f'd{j}', '1..2') for j in range(1, 7)]
    + [var(f'y{j}', f'eval:y{j - 1}+d{j}') for j in range(1, 7)]
    + [var('k', '2..5'), var('s', pick('k', CROISSANTE, 0))],
    ['{{k}}'],
    ['On trace la ligne horizontale d\'ordonnée ${{s}}$ : la température atteint ${{s}}$ au'
     ' bout de ${{k}}$ min, puis reste au-dessus, car elle augmente.',
     'Elle dépasse ${{s}}$ dizaines de degrés à partir de ' + m('{{k}}') + ' min.'])
DEPASSER_CLOCHE = variation(
    'Le graphique donne la hauteur, en mètres, d\'une fusée à eau selon le temps écoulé depuis'
    ' son lancement, en secondes.\n\n```courbe\nx: -1 ; 7\ny: -1 ; {{eval:h+1}}\ngrille: 1 ; 1\n'
    'axes: x = Temps (s) ; y = Hauteur (m)\nf(x) = {{h}} - (x - 3)^2 sur [0 ; 6]   bleu\n'
    'taille: moyenne\ndescription: Courbe en cloche : la hauteur monte, atteint {{h}} m au bout de'
    ' 3 s, puis redescend.\n```\n\nPendant quelle période la hauteur de la fusée dépasse-t-elle'
    ' ${{s}}~\\unit{m}$ ?\n\nDe $?$ s à $?$ s',
    [var('h', '10..14'), var('dd', '1..2'), var('s', 'eval:h-dd*dd'), var('x1', 'eval:3-dd'),
     var('x2', 'eval:3+dd')],
    ['{{x1}}', '{{x2}}'],
    ['On trace la ligne horizontale d\'ordonnée ${{s}}$ : elle coupe la courbe en deux points,'
     ' d\'abscisses ' + m('{{x1}}') + ' et ' + m('{{x2}}') + '.',
     'Entre ces deux instants, la courbe est au-dessus de la ligne : la hauteur dépasse ${{s}}$'
     ' m de ${{x1}}$ s à ${{x2}}$ s.'])
s_cr = {'y0': 3, 'd1': 2, 'd2': 1, 'd3': 2, 'd4': 2, 'd5': 1, 'd6': 2}
MODELES.append(modele(
    '10-interpreter-un-graphique-cartesien',
    'Interpréter un graphique cartésien',
    'Pour quelles valeurs une grandeur dépasse-t-elle un seuil : « à partir de » ou « de … à … »',
    9, [DEPASSER_CROISSANTE, DEPASSER_CLOCHE],
    [spec('Seuil 8 atteint à 3 min', 0, {**s_cr, 'k': 3}, [3], 'correct'),
     spec('Erreur : rend le seuil au lieu du temps', 0, {**s_cr, 'k': 3}, [8], 'incorrect'),
     spec('Hauteur 12, seuil 8 : de 1 à 5', 1, {'h': 12, 'dd': 2}, [1, 5], 'correct'),
     spec('Erreur : bornes du graphique (0 à 6)', 1, {'h': 12, 'dd': 2}, [0, 6], 'incorrect'),
     spec('Erreur : rend les hauteurs', 1, {'h': 12, 'dd': 2}, [8, 8], 'incorrect')],
    delay=90))

# --- Écriture ------------------------------------------------------------------------------

os.makedirs(DOSSIER, exist_ok=True)
for nom, contenu in MODELES:
    chemin = os.path.join(DOSSIER, nom + '.json')
    ancien = {}
    if os.path.exists(chemin):
        with open(chemin, encoding='utf-8') as f:
            ancien = json.load(f)
    if 'id' in ancien:
        contenu = {'id': ancien['id'], **contenu}
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(contenu, f, ensure_ascii=False, indent=2)
        f.write('\n')
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
