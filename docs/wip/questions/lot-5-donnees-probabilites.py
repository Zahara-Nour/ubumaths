"""Écrit les 6 modèles du lot 6 « Données et probabilités » de la 5e dans scripts/questions/5-donnees-probabilites/.

Phase 0 validée par David le 2026-11-01 (« je valide » sur les recos) ; un point par modèle :

| #  | Point | Titre | Réponse | Catégorie, niveau |
| 01 | 5-134 | Calculer une fréquence | case | Statistiques › Représenter des données › effectifs et fréquences, 1 |
| 02 | 5-080 | Calculer une moyenne | case | Statistiques › Indicateurs › moyenne, 1 |
| 03 | 5-080 | Calculer une moyenne non entière | case | idem, 2 |
| 04 | 5-139 | Interpréter une moyenne | choix (plusieurs) | Statistiques › Indicateurs › moyenne, 3 (1 pris par 02, 2 par 03) |
| 05 | 5-079 | Choisir une représentation adaptée | choix | Statistiques › Représenter des données › choisir une représentation (neuve), 1 |
| 06 | 5-082 | Expérience aléatoire, issue, évènement | choix | Probabilités › Expériences aléatoires › événements, 1 |
| 07 | 5-083 | Probabilité : issues équiprobables | case (fraction) | Probabilités › Expériences aléatoires › équiprobabilité, 1 |
| 08 | 5-083 | Probabilité en décimal ou en pourcentage | case | idem, 2 |

Décisions (journal § 17) :
- fraction juste acceptée même non simplifiée (`reducedFractions: off`) ; le corrigé simplifie ;
- représentations nommées en texte, sans diagramme dessiné ;
- moyenne simple seulement (pondérée : 4e) ; issues cochées, sans la notation en accolades (4e) ;
- évènements à plusieurs issues (la 6e a l'issue seule) ;
- variables `e` et `i` interdites.

    python3 docs/wip/questions/lot-5-donnees-probabilites.py scripts/questions/5-donnees-probabilites
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(v) for k, v in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(nom, title, description, theme, domain, subdomain, level, variations, specs,
           delay=60, options=None):
    m = {'title': title, 'description': description, 'grades': ['5'], 'theme': theme,
         'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': delay,
         'status': 'draft'}
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
    if answers is not None:
        v['blanks'] = [a if isinstance(a, dict) else {'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def m(x):
    """Formule mise en couleur, en ligne."""
    return '$' + col(x) + '$'


def choix(lignes, melanger=True, plusieurs=False):
    entete = ('' if melanger else 'melanger: non\n') + ('plusieurs: oui\n' if plusieurs else '')
    return '\n\n```choix\n' + entete + ''.join('- ' + l + '\n' for l in lignes) + '```'


def fraction_corrigee(num, den, debut=''):
    """« debut a/b = fraction simplifiée » si elle se simplifie, sinon « debut a/b » en couleur.
    num, den : noms de variables (ou expressions sans accolades)."""
    frac = '\\dfrac{{{' + num + '}}}{{{' + den + '}}}'
    return ('{{if:gcd(' + num + ',' + den + ')!=1|$' + debut + frac + ' = '
            + col('{{eval:(' + num + ')/(' + den + ')}}') + '$ (la fraction $' + frac
            + '$ est juste aussi)|$' + debut + col(frac) + '$}}')


def tableau(titre, lignes):
    """Tableau d'effectifs en markdown : une colonne par catégorie, plus le total."""
    tete = '| ' + titre + ' | ' + ' | '.join(c for c, _ in lignes) + ' | Total |'
    sep = '| --- ' * (len(lignes) + 2) + '|'
    corps = ('| Effectif | ' + ' | '.join('$' + v + '$' for _, v in lignes) + ' | ${{n}}$ |')
    return '\n\n' + tete + '\n' + sep + '\n' + corps + '\n\n'


S = 'Statistiques'
P = 'Probabilités'
# Fraction juste acceptée même non simplifiée (décision de David, 2026-11-01)
FRACTION_LIBRE = {'constraints': {'reducedFractions': 'off'}}
MODELES = []

# --- 1. 5-134 : calculer une fréquence ----------------------------------------------------

FREQ_DEF = ('**Fréquence.** $\\text{fréquence} = \\dfrac{\\text{effectif de la catégorie}}'
            '{\\text{effectif total}}$. Elle s\'écrit en fraction, en nombre décimal ou en'
            ' pourcentage.')

TRANSPORT = tableau('Moyen de transport', [('À pied', '{{a}}'), ('Vélo', '{{b}}'),
                                           ('Bus', '{{c}}'), ('Voiture', '{{d}}')])
FREQ_VARS = [var('n', '20|25|50'), var('a', '2..12'), var('b', '2..12'), var('c', '2..12'),
             var('d', 'eval:n-a-b-c')]
FREQ_CONDS = ['d>=2', 'a!=b', 'a!=c']

FREQ_FRACTION = variation(
    'On a demandé aux ${{n}}$ élèves d\'une classe comment ils viennent au collège.' + TRANSPORT
    + 'Quelle est la fréquence des élèves qui viennent **à pied** ? Donne-la sous forme de'
    ' fraction.\n\n$?$',
    FREQ_VARS, ['\\dfrac{{{a}}}{{{n}}}'],
    [FREQ_DEF,
     'Fréquence : ' + fraction_corrigee('a', 'n') + '.'],
    FREQ_CONDS)
FREQ_DECIMAL = variation(
    'On a demandé aux ${{n}}$ élèves d\'une classe comment ils viennent au collège.' + TRANSPORT
    + 'Quelle est la fréquence des élèves qui viennent **en bus** ? Donne-la sous forme de nombre'
    ' décimal.\n\n$?$',
    FREQ_VARS, ['{{eval:c/n;d}}'],
    [FREQ_DEF,
     '$\\dfrac{{{c}}}{{{n}}} = {{c}} \\div {{n}} = ' + col('{{eval:c/n;d}}') + '$.'],
    FREQ_CONDS)
FREQ_POURCENT = variation(
    'On a demandé aux ${{n}}$ élèves d\'une classe comment ils viennent au collège.' + TRANSPORT
    + 'Quel **pourcentage** des élèves vient **à vélo** ?\n\n$?~\\%$',
    FREQ_VARS, ['{{eval:100*b/n;d}}'],
    [FREQ_DEF,
     '$\\dfrac{{{b}}}{{{n}}} = {{eval:b/n;d}} = \\dfrac{{{eval:100*b/n;d}}}{100}$ : cela fait '
     + m('{{eval:100*b/n;d}}~\\%') + '.'],
    FREQ_CONDS)

MODELES.append(modele(
    '01-frequence', 'Calculer une fréquence',
    'Calculer la fréquence d\'une catégorie dans un tableau d\'effectifs, en fraction, en nombre'
    ' décimal ou en pourcentage (8 élèves sur 20 : 8/20 = 0,4 = 40 %)',
    S, 'Représenter des données', 'effectifs et fréquences', 1,
    [FREQ_FRACTION, FREQ_DECIMAL, FREQ_POURCENT],
    [spec('8 sur 20 : 8/20', 0, {'n': 20, 'a': 8, 'b': 5, 'c': 4, 'd': 3}, '\\frac{8}{20}',
          'correct'),
     spec('8 sur 20 : 2/5 simplifiée', 0, {'n': 20, 'a': 8, 'b': 5, 'c': 4, 'd': 3},
          '\\frac{2}{5}', 'correct'),
     spec('Erreur : 8/12 (sur le reste)', 0, {'n': 20, 'a': 8, 'b': 5, 'c': 4, 'd': 3},
          '\\frac{8}{12}', 'incorrect'),
     spec('Erreur : 20/8 (à l\'envers)', 0, {'n': 20, 'a': 8, 'b': 5, 'c': 4, 'd': 3},
          '\\frac{20}{8}', 'incorrect'),
     spec('Bus 6 sur 25 : 0,24', 1, {'n': 25, 'a': 8, 'b': 5, 'c': 6, 'd': 6}, '0,24',
          'correct'),
     spec('Erreur : 6 (l\'effectif)', 1, {'n': 25, 'a': 8, 'b': 5, 'c': 6, 'd': 6}, '6',
          'incorrect'),
     spec('Erreur : 24 (le pourcentage)', 1, {'n': 25, 'a': 8, 'b': 5, 'c': 6, 'd': 6}, '24',
          'incorrect'),
     spec('Vélo 9 sur 50 : 18 %', 2, {'n': 50, 'a': 12, 'b': 9, 'c': 10, 'd': 19}, '18',
          'correct'),
     spec('Erreur : 0,18 (la fréquence)', 2, {'n': 50, 'a': 12, 'b': 9, 'c': 10, 'd': 19},
          '0,18', 'incorrect'),
     spec('Erreur : 9 (l\'effectif)', 2, {'n': 50, 'a': 12, 'b': 9, 'c': 10, 'd': 19}, '9',
          'incorrect')],
    delay=90, options=FRACTION_LIBRE))

# --- 2-3. 5-080 : calculer une moyenne ----------------------------------------------------

MOY_DEF = ('**Moyenne.** On additionne toutes les valeurs, puis on divise par le nombre de'
           ' valeurs.')

MOY_NOTES = variation(
    'Voici les notes de Sami à ses quatre derniers contrôles : $\\text{{{a}} ; {{b}} ; {{c}} ;'
    ' {{d}}}$.\n\nQuelle est la moyenne de ses notes ?\n\n$?$',
    [var('k', '9..15'), var('a', '6..18'), var('b', '6..18'), var('c', '6..18'),
     var('d', 'eval:4*k-a-b-c')],
    ['{{k}}'],
    [MOY_DEF,
     '$\\dfrac{{{a}} + {{b}} + {{c}} + {{d}}}{4} = \\dfrac{{{eval:4*k}}}{4} = ' + col('{{k}}')
     + '$.'],
    ['d>=4', 'd<=20', 'a!=b', 'c!=d'])
MOY_TEMP = variation(
    'Voici les températures relevées à midi pendant cinq jours, en degrés Celsius :'
    ' $\\text{{{a}} ; {{b}} ; {{c}} ; {{d}} ; {{f}}}$.\n\nQuelle est la température moyenne ?'
    '\n\n$?~\\unit{°C}$',
    [var('k', '12..25'), var('a', '8..30'), var('b', '8..30'), var('c', '8..30'),
     var('d', '8..30'), var('f', 'eval:5*k-a-b-c-d')],
    ['{{k}}'],
    [MOY_DEF,
     '$\\dfrac{{{a}} + {{b}} + {{c}} + {{d}} + {{f}}}{5} = \\dfrac{{{eval:5*k}}}{5} = '
     + col('{{k}}') + '$ °C.'],
    ['f>=8', 'f<=30', 'a!=b', 'c!=d'])

MODELES.append(modele(
    '02-moyenne', 'Calculer une moyenne',
    'Calculer la moyenne simple d\'une série de 4 ou 5 nombres entiers, quand elle tombe juste'
    ' (12, 15, 9, 14 → 12,5 au niveau suivant)',
    S, 'Indicateurs', 'moyenne', 1,
    [MOY_NOTES, MOY_TEMP],
    [spec('12, 16, 9, 11 → 12', 0,
          {'k': 12, 'a': 12, 'b': 16, 'c': 9, 'd': 11}, '12', 'correct'),
     spec('Erreur : 48 (la somme)', 0, {'k': 12, 'a': 12, 'b': 16, 'c': 9, 'd': 11}, '48',
          'incorrect'),
     spec('Erreur : 12,5 (milieu de 9 et 16)', 0, {'k': 12, 'a': 12, 'b': 16, 'c': 9, 'd': 11},
          '12,5', 'incorrect'),
     spec('Températures → 18', 1, {'k': 18, 'a': 15, 'b': 20, 'c': 17, 'd': 22, 'f': 16}, '18',
          'correct'),
     spec('Erreur : 90 (la somme)', 1, {'k': 18, 'a': 15, 'b': 20, 'c': 17, 'd': 22, 'f': 16},
          '90', 'incorrect')]))

MOY_SMS = variation(
    'Léa a compté ses messages pendant quatre jours : $\\text{{{a}} ; {{b}} ; {{c}} ; {{d}}}$.'
    '\n\nCombien de messages a-t-elle envoyés en moyenne par jour ?\n\n$?$',
    [var('a', '5..40'), var('b', '5..40'), var('c', '5..40'), var('d', '5..40')],
    ['{{eval:(a+b+c+d)/4;d}}'],
    [MOY_DEF,
     '$\\dfrac{{{a}} + {{b}} + {{c}} + {{d}}}{4} = \\dfrac{{{eval:a+b+c+d}}}{4} = '
     + col('{{eval:(a+b+c+d)/4;d}}') + '$.',
     'Une moyenne peut ne pas être un nombre entier, même si toutes les valeurs le sont.'],
    ['(a+b+c+d)%4!=0', 'a!=b', 'c!=d'])
MOY_NOTES_5 = variation(
    'Voici les notes d\'Inès sur 20 : $\\text{{{a}} ; {{b}} ; {{c}} ; {{d}} ; {{f}}}$.\n\n'
    'Quelle est la moyenne de ses notes ?\n\n$?$',
    [var('a', '4..20'), var('b', '4..20'), var('c', '4..20'), var('d', '4..20'),
     var('f', '4..20')],
    ['{{eval:(a+b+c+d+f)/5;d}}'],
    [MOY_DEF,
     '$\\dfrac{{{a}} + {{b}} + {{c}} + {{d}} + {{f}}}{5} = \\dfrac{{{eval:a+b+c+d+f}}}{5} = '
     + col('{{eval:(a+b+c+d+f)/5;d}}') + '$.'],
    ['(a+b+c+d+f)%5!=0', 'a!=b', 'c!=d'])

MODELES.append(modele(
    '03-moyenne-non-entiere', 'Calculer une moyenne non entière',
    'Calculer la moyenne simple d\'une série d\'entiers quand elle n\'est pas entière'
    ' (12, 15, 9, 14 → 12,5)',
    S, 'Indicateurs', 'moyenne', 2,
    [MOY_SMS, MOY_NOTES_5],
    [spec('12, 15, 9, 14 → 12,5', 0, {'a': 12, 'b': 15, 'c': 9, 'd': 14}, '12,5', 'correct'),
     spec('Erreur : 12 (arrondi)', 0, {'a': 12, 'b': 15, 'c': 9, 'd': 14}, '12', 'incorrect'),
     spec('Erreur : 50 (la somme)', 0, {'a': 12, 'b': 15, 'c': 9, 'd': 14}, '50', 'incorrect'),
     spec('Notes → 11,4', 1, {'a': 8, 'b': 12, 'c': 15, 'd': 10, 'f': 12}, '11,4', 'correct'),
     spec('Erreur : 14,25 (divisé par 4)', 1, {'a': 8, 'b': 12, 'c': 15, 'd': 10, 'f': 12},
          '14,25', 'incorrect')],
    delay=90))

# --- 4. 5-139 : interpréter une moyenne ---------------------------------------------------

INTERP_DEF = ('**Ce que dit une moyenne.** Si on remplaçait toutes les valeurs par la moyenne,'
              ' la somme ne changerait pas : $\\text{somme} = \\text{moyenne} \\times'
              ' \\text{nombre de valeurs}$. Cela ne veut pas dire que chaque valeur est égale à'
              ' la moyenne.')

INTERP_CLASSE = variation(
    'Dans une classe de ${{n}}$ élèves, la moyenne au dernier contrôle est de ${{k}}$ sur'
    ' $20$.\n\nQuelles phrases sont vraies ?'
    + choix(['Tous les élèves ont eu ${{k}}$.',
             'La somme des notes de la classe est ${{eval:n*k}}$.',
             'Au moins un élève a eu ${{k}}$ ou plus.',
             'Au moins un élève a eu ${{k}}$ ou moins.',
             'La moitié des élèves a eu plus de ${{k}}$.'], plusieurs=True),
    [var('n', '20..30'), var('k', '9..14')], ['1;2;3'],
    [INTERP_DEF,
     'Somme des notes : ${{n}} \\times {{k}} = ' + col('{{eval:n*k}}') + '$.',
     'Si toutes les notes étaient sous ${{k}}$, la moyenne serait sous ${{k}}$ : au moins une'
     ' note est donc ${{k}}$ ou plus ; de même, au moins une est ${{k}}$ ou moins.',
     'On ne sait rien des notes une à une : peut-être que personne n\'a eu ${{k}}$, et la'
     ' moyenne ne dit pas combien d\'élèves sont au-dessus.'])
INTERP_TEMP = variation(
    'Pendant une semaine ($7$ jours), la température moyenne à midi a été de ${{k}}$ °C.\n\n'
    'Quelles phrases sont vraies ?'
    + choix(['Il a fait ${{k}}$ °C à midi chaque jour.',
             'Un jour au moins, il a fait ${{k}}$ °C ou plus à midi.',
             'La somme des sept températures est ${{eval:7*k}}$.',
             'Il a fait plus de ${{k}}$ °C au moins quatre jours.'], plusieurs=True),
    [var('k', '12..26')], ['1;2'],
    [INTERP_DEF,
     'Somme des températures : $7 \\times {{k}} = ' + col('{{eval:7*k}}') + '$.',
     'Si tous les jours étaient sous ${{k}}$ °C, la moyenne serait sous ${{k}}$ °C : un jour au'
     ' moins a atteint ${{k}}$ °C.',
     'La moyenne ne dit ni la température de chaque jour, ni combien de jours ont dépassé'
     ' ${{k}}$ °C.'])
INTERP_COMPARER = variation(
    'Hugo a eu $\\text{{{k}} ; {{k}} ; {{k}} ; {{k}}}$ et Nora $\\text{{{a}} ; {{b}} ; {{c}} ;'
    ' {{d}}}$.\n\nQuelles phrases sont vraies ?'
    + choix(['Hugo et Nora ont la même moyenne.',
             'Nora a une meilleure moyenne que Hugo, car elle a eu ${{eval:max(a,b,c,d)}}$.',
             'Nora a eu au moins une note sous sa moyenne.',
             'Une moyenne de ${{k}}$ veut dire que toutes les notes valent ${{k}}$.'],
            plusieurs=True),
    [var('k', '10..14'), var('a', 'eval:k-6'), var('b', 'eval:k+6'), var('c', 'eval:k-2'),
     var('d', 'eval:k+2')],
    ['0;2'],
    [INTERP_DEF,
     'Hugo : $\\dfrac{4 \\times {{k}}}{4} = {{k}}$ ; Nora : $\\dfrac{{{a}} + {{b}} + {{c}} +'
     ' {{d}}}{4} = \\dfrac{{{eval:4*k}}}{4} = {{k}}$ : ' + col('\\text{même moyenne}').join('$$')
     + '.',
     'Nora a eu ${{a}}$, sous sa moyenne : une moyenne de ${{k}}$ ne veut pas dire que toutes les'
     ' notes valent ${{k}}$.'])

MODELES.append(modele(
    '04-interpreter-moyenne', 'Interpréter une moyenne',
    'Dire ce qu\'une moyenne apprend sur une série : une moyenne de 12 ne veut pas dire que'
    ' chacun a 12 ; somme = moyenne × effectif ; une valeur au moins atteint la moyenne',
    S, 'Indicateurs', 'moyenne', 3,
    [INTERP_CLASSE, INTERP_TEMP, INTERP_COMPARER],
    [spec('Classe : 1, 2, 3', 0, {'n': 25, 'k': 12}, '1;2;3', 'correct'),
     spec('Erreur : tous ont eu 12', 0, {'n': 25, 'k': 12}, '0;1;2;3', 'incorrect'),
     spec('Erreur : la moitié au-dessus', 0, {'n': 25, 'k': 12}, '1;2;3;4', 'incorrect'),
     spec('Températures : 1, 2', 1, {'k': 18}, '1;2', 'correct'),
     spec('Erreur : chaque jour 18', 1, {'k': 18}, '0;2', 'incorrect'),
     spec('Comparer : 0, 2', 2, {'k': 12, 'a': 6, 'b': 18, 'c': 10, 'd': 14}, '0;2', 'correct'),
     spec('Erreur : la meilleure note', 2, {'k': 12, 'a': 6, 'b': 18, 'c': 10, 'd': 14}, '1',
          'incorrect')],
    delay=90))

# --- 5. 5-079 : choisir une représentation ------------------------------------------------

REPR = ['un diagramme circulaire', 'un diagramme en barres',
        'un graphique (une courbe dans un repère)']
REPR_DEF = ('**Choisir sa représentation.** Le **diagramme circulaire** montre la part de chaque'
            ' catégorie dans un tout ; le **diagramme en barres** compare des effectifs ; le'
            ' **graphique** montre comment une grandeur évolue dans le temps.')

REPR_PARTS = variation(
    'On veut montrer **quelle part du budget** d\'une famille va au logement, à la nourriture, aux'
    ' transports et aux loisirs.\n\nQuelle représentation choisir ?' + choix(REPR, melanger=False),
    [], ['0'],
    [REPR_DEF, 'On veut voir la part de chaque poste dans le budget entier : '
     + col('\\text{un diagramme circulaire}').join('$$') + '.'])
REPR_COMPARER = variation(
    'On veut **comparer le nombre** de livres empruntés au CDI par chacune des six classes de'
    ' 5e.\n\nQuelle représentation choisir ?' + choix(REPR, melanger=False),
    [], ['1'],
    [REPR_DEF, 'On compare six effectifs entre eux : '
     + col('\\text{un diagramme en barres}').join('$$') + '.'])
REPR_EVOLUTION = variation(
    'On veut montrer **comment la taille** d\'un enfant **a évolué** de sa naissance à ses dix'
    ' ans.\n\nQuelle représentation choisir ?' + choix(REPR, melanger=False),
    [], ['2'],
    [REPR_DEF, 'On suit une grandeur au fil du temps : '
     + col('\\text{un graphique}').join('$$') + '.'])
REPR_SONDAGE = variation(
    'Un sondage demande aux élèves leur sport préféré. On veut montrer **quelle part des élèves**'
    ' a choisi chaque sport.\n\nQuelle représentation choisir ?' + choix(REPR, melanger=False),
    [], ['0'],
    [REPR_DEF, 'On veut la part de chaque sport parmi tous les élèves : '
     + col('\\text{un diagramme circulaire}').join('$$') + '.'])
REPR_TEMPERATURES = variation(
    'On a relevé la température chaque heure pendant une journée. On veut montrer **comment elle'
    ' a varié** au cours de la journée.\n\nQuelle représentation choisir ?'
    + choix(REPR, melanger=False),
    [], ['2'],
    [REPR_DEF, 'On suit la température heure après heure : '
     + col('\\text{un graphique}').join('$$') + '.'])

MODELES.append(modele(
    '05-choisir-representation', 'Choisir une représentation adaptée',
    'Choisir entre diagramme circulaire (part d\'un tout), diagramme en barres (comparer des'
    ' effectifs) et graphique (évolution dans le temps) selon ce qu\'on veut montrer',
    S, 'Représenter des données', 'choisir une représentation', 1,
    [REPR_PARTS, REPR_COMPARER, REPR_EVOLUTION, REPR_SONDAGE, REPR_TEMPERATURES],
    [spec('Budget : circulaire', 0, {}, '0', 'correct'),
     spec('Erreur : barres', 0, {}, '1', 'incorrect'),
     spec('CDI : barres', 1, {}, '1', 'correct'),
     spec('Erreur : graphique', 1, {}, '2', 'incorrect'),
     spec('Taille : graphique', 2, {}, '2', 'correct'),
     spec('Erreur : circulaire', 2, {}, '0', 'incorrect'),
     spec('Sondage : circulaire', 3, {}, '0', 'correct'),
     spec('Températures : graphique', 4, {}, '2', 'correct')],
    delay=30))

# --- 6. 5-082 : vocabulaire des probabilités ----------------------------------------------

VOC_DEF = ('**Vocabulaire.** Une **expérience aléatoire** a plusieurs résultats possibles, et on'
           ' ne peut pas savoir à l\'avance lequel sortira. Chaque résultat possible est une'
           ' **issue**. Un **évènement** est un ensemble d\'issues ; il est réalisé si l\'issue'
           ' obtenue en fait partie.')

VOC_ALEATOIRE = variation(
    'Lesquelles de ces expériences sont aléatoires ?'
    + choix(['Lancer un dé et noter le nombre obtenu.',
             'Tirer une carte au hasard dans un jeu.',
             'Mesurer la longueur de sa table avec une règle.',
             'Lancer une pièce et noter le côté visible.',
             'Calculer $7 \\times 8$.'], plusieurs=True),
    [], ['0;1;3'],
    [VOC_DEF,
     'Le dé, la carte tirée au hasard et la pièce ont plusieurs résultats possibles qu\'on ne'
     ' peut pas prévoir : ce sont des expériences aléatoires.',
     'La mesure de la table et le calcul donnent toujours le même résultat : elles ne sont pas'
     ' aléatoires.'])
VOC_ISSUES = variation(
    'On fait tourner une roue partagée en secteurs numérotés de $1$ à ${{n}}$ et on note le'
    ' numéro obtenu.\n\nCombien cette expérience a-t-elle d\'**issues** ?\n\n$?$',
    [var('n', '5..12')], ['{{n}}'],
    [VOC_DEF,
     'Les issues sont $1$, $2$, …, ${{n}}$ : il y en a ' + m('{{n}}') + '.'])
VOC_PAIR = variation(
    'On lance un dé à six faces, numérotées de $1$ à $6$. On considère l\'évènement'
    ' « {{if:k==0|obtenir un nombre pair|{{if:k==1|obtenir un nombre supérieur ou égal à $4$|'
    'obtenir un multiple de $3$}}}} ».\n\nQuelles issues réalisent cet évènement ?'
    + choix(['$1$', '$2$', '$3$', '$4$', '$5$', '$6$'], melanger=False, plusieurs=True),
    [var('k', '0..2')], ['{{if:k==0|1;3;5|{{if:k==1|3;4;5|2;5}}}}'],
    [VOC_DEF,
     'L\'évènement est réalisé par les issues '
     + col('{{if:k==0|2 ; 4 ; 6|{{if:k==1|4 ; 5 ; 6|3 ; 6}}}}').join('$$') + '.'])
VOC_REALISE = variation(
    'On tire une carte au hasard parmi des cartes numérotées de $1$ à $10$. On obtient la carte'
    ' ${{x}}$.\n\nL\'évènement « obtenir un nombre pair » est-il réalisé ?'
    + choix(['oui', 'non'], melanger=False),
    [var('x', '1..10')], ['{{if:x%2==0|0|1}}'],
    [VOC_DEF,
     '${{x}}$ {{if:x%2==0|est pair : l\'évènement est ' + col('\\text{réalisé}').join('$$')
     + '|n\'est pas pair : l\'évènement n\'est ' + col('\\text{pas réalisé}').join('$$') + '}}.'])

MODELES.append(modele(
    '06-vocabulaire-probabilites', 'Expérience aléatoire, issue, évènement',
    'Reconnaître une expérience aléatoire, compter ses issues, trouver les issues qui réalisent'
    ' un évènement (pair au dé : 2, 4, 6)',
    P, 'Expériences aléatoires', 'événements', 1,
    [VOC_ALEATOIRE, VOC_ISSUES, VOC_PAIR, VOC_REALISE],
    [spec('Aléatoires : 0, 1, 3', 0, {}, '0;1;3', 'correct'),
     spec('Erreur : la mesure', 0, {}, '0;1;2;3', 'incorrect'),
     spec('Roue à 8 : 8 issues', 1, {'n': 8}, '8', 'correct'),
     spec('Erreur : 1', 1, {'n': 8}, '1', 'incorrect'),
     spec('Pair : 2, 4, 6', 2, {'k': 0}, '1;3;5', 'correct'),
     spec('Erreur : 1, 3, 5', 2, {'k': 0}, '0;2;4', 'incorrect'),
     spec('≥ 4 : 4, 5, 6', 2, {'k': 1}, '3;4;5', 'correct'),
     spec('Oubli du 4 (strict) : partiel', 2, {'k': 1}, '4;5', 'unoptimal_form'),
     spec('Multiple de 3 : 3, 6', 2, {'k': 2}, '2;5', 'correct'),
     spec('Carte 4 : oui', 3, {'x': 4}, '0', 'correct'),
     spec('Carte 7 : non', 3, {'x': 7}, '1', 'correct'),
     spec('Erreur : carte 7, oui', 3, {'x': 7}, '0', 'incorrect')],
    delay=45))

# --- 7-8. 5-083 : attribuer des probabilités ----------------------------------------------

PROBA_DEF = ('**Issues équiprobables.** Quand toutes les issues ont la même chance de sortir :'
             ' $P = \\dfrac{\\text{nombre d\'issues favorables}}{\\text{nombre total'
             ' d\'issues}}$.')

PROBA_DE = variation(
    'On lance un dé équilibré à ${{n}}$ faces, numérotées de $1$ à ${{n}}$.\n\nQuelle est la'
    ' probabilité d\'obtenir {{if:k==0|un nombre pair|un multiple de $3$}} ? Donne-la sous forme de'
    ' fraction.\n\n$?$',
    [var('n', '6|8|10|12'), var('k', '0..1'),
     var('f', 'eval:{{if:k==0|n/2|floor(n/3)}}')],
    ['\\dfrac{{{f}}}{{{n}}}'],
    [PROBA_DEF,
     'Le dé est équilibré : les ${{n}}$ issues sont équiprobables. {{if:k==0|Il y a ${{f}}$'
     ' nombres pairs|Il y a ${{f}}$ multiples de $3$}} entre $1$ et ${{n}}$.',
     fraction_corrigee('f', 'n', 'P = ') + '.'])
PROBA_URNE = variation(
    'Un sac contient ${{r}}$ jetons rouges, ${{v}}$ jetons verts et ${{j}}$ jetons jaunes,'
    ' indiscernables au toucher. On tire un jeton au hasard.\n\nQuelle est la probabilité de'
    ' tirer un jeton **{{if:k==0|rouge|vert}}** ? Donne-la sous forme de fraction.\n\n$?$',
    [var('r', '1..9'), var('v', '1..9'), var('j', '1..9'), var('k', '0..1'),
     var('x', 'eval:{{if:k==0|r|v}}'), var('t', 'eval:r+v+j')],
    ['\\dfrac{{{x}}}{{{t}}}'],
    [PROBA_DEF,
     'Il y a ${{t}}$ jetons en tout, dont ${{x}}$ {{if:k==0|rouges|verts}}.',
     fraction_corrigee('x', 't', 'P = ') + '.'],
    ['r!=v', 'v!=j', 'r!=j'])
PROBA_LETTRES = variation(
    'On écrit les lettres du mot **{{if:k==0|MATHEMATIQUES|{{if:k==1|PROBABILITE|EXERCICE}}}}**'
    ' sur des cartons identiques, un carton par lettre, et on en tire un au hasard.\n\nQuelle est'
    ' la probabilité de tirer une **voyelle** ? Donne-la sous forme de fraction.\n\n$?$',
    [var('k', '0..2'), var('t', '{{if:k==0|13|{{if:k==1|11|8}}}}'),
     var('f', '{{if:k==0|6|{{if:k==1|5|4}}}}')],
    ['\\dfrac{{{f}}}{{{t}}}'],
    [PROBA_DEF,
     'Il y a ${{t}}$ cartons, dont ${{f}}$ portent une voyelle.',
     fraction_corrigee('f', 't', 'P = ') + '.'])

MODELES.append(modele(
    '07-probabilite-equiprobable', 'Probabilité : issues équiprobables',
    'Calculer la probabilité d\'un évènement à plusieurs issues quand elles sont équiprobables :'
    ' nombre pair au dé (3/6), jeton d\'une couleur, voyelle d\'un mot',
    P, 'Expériences aléatoires', 'équiprobabilité', 1,
    [PROBA_DE, PROBA_URNE, PROBA_LETTRES],
    [spec('Dé 6, pair : 3/6', 0, {'n': 6, 'k': 0, 'f': 3}, '\\frac{3}{6}', 'correct'),
     spec('Dé 6, pair : 1/2', 0, {'n': 6, 'k': 0, 'f': 3}, '\\frac{1}{2}', 'correct'),
     spec('Forme : 0,5 au lieu d\'une fraction', 0, {'n': 6, 'k': 0, 'f': 3}, '0,5', 'bad_form', ['form']),
     spec('Erreur : 1/6 (une issue)', 0, {'n': 6, 'k': 0, 'f': 3}, '\\frac{1}{6}', 'incorrect'),
     spec('Erreur : 3 (le nombre d\'issues)', 0, {'n': 6, 'k': 0, 'f': 3}, '3', 'incorrect'),
     spec('Dé 10, multiple de 3 : 3/10', 0, {'n': 10, 'k': 1, 'f': 3}, '\\frac{3}{10}',
          'correct'),
     spec('Sac 3 rouges, 5 verts, 2 jaunes : 3/10', 1, {'r': 3, 'v': 5, 'j': 2, 'k': 0, 'x': 3, 't': 10},
          '\\frac{3}{10}', 'correct'),
     spec('Erreur : 3/7 (sur les autres)', 1, {'r': 3, 'v': 5, 'j': 2, 'k': 0, 'x': 3, 't': 10}, '\\frac{3}{7}',
          'incorrect'),
     spec('Erreur : 1/3 (une couleur sur trois)', 1, {'r': 3, 'v': 5, 'j': 2, 'k': 0, 'x': 3, 't': 10},
          '\\frac{1}{3}', 'incorrect'),
     spec('EXERCICE : 4/8', 2, {'k': 2, 't': 8, 'f': 4}, '\\frac{4}{8}', 'correct'),
     spec('Erreur : 2/8 (voyelles différentes)', 2, {'k': 2, 't': 8, 'f': 4}, '\\frac{2}{8}',
          'incorrect')],
    delay=60, options=FRACTION_LIBRE))

PROBA_DECIMAL = variation(
    'Un sac contient ${{n}}$ billes indiscernables au toucher, dont ${{r}}$ rouges. On tire une'
    ' bille au hasard.\n\nQuelle est la probabilité de tirer une bille rouge ? Donne-la sous'
    ' forme de nombre décimal.\n\n$?$',
    [var('n', '10|20|25|50'), var('r', '1..n')],
    ['{{eval:r/n;d}}'],
    [PROBA_DEF,
     '$P = \\dfrac{{{r}}}{{{n}}} = {{r}} \\div {{n}} = ' + col('{{eval:r/n;d}}') + '$.'],
    ['r<n'])
PROBA_POURCENT = variation(
    'Une roue est partagée en ${{n}}$ secteurs égaux, dont ${{g}}$ sont gagnants. On la fait'
    ' tourner.\n\nQuelle est la probabilité de gagner, **en pourcentage** ?\n\n$?~\\%$',
    [var('n', '4|5|10|20|25'), var('g', '1..n')],
    ['{{eval:100*g/n;d}}'],
    [PROBA_DEF,
     '$P = \\dfrac{{{g}}}{{{n}}} = {{eval:g/n;d}}$, soit ' + m('{{eval:100*g/n;d}}~\\%') + '.'],
    ['g<n'])

MODELES.append(modele(
    '08-probabilite-decimal-pourcentage', 'Probabilité en décimal ou en pourcentage',
    'Donner une probabilité sous forme décimale ou de pourcentage (7 billes rouges sur 20 :'
    ' 0,35 ; 3 secteurs gagnants sur 5 : 60 %)',
    P, 'Expériences aléatoires', 'équiprobabilité', 2,
    [PROBA_DECIMAL, PROBA_POURCENT],
    [spec('7 sur 20 : 0,35', 0, {'n': 20, 'r': 7}, '0,35', 'correct'),
     spec('Erreur : 35 (pourcentage)', 0, {'n': 20, 'r': 7}, '35', 'incorrect'),
     spec('Erreur : 0,7', 0, {'n': 20, 'r': 7}, '0,7', 'incorrect'),
     spec('3 sur 5 : 60 %', 1, {'n': 5, 'g': 3}, '60', 'correct'),
     spec('Erreur : 0,6 (la fréquence)', 1, {'n': 5, 'g': 3}, '0,6', 'incorrect'),
     spec('Erreur : 3', 1, {'n': 5, 'g': 3}, '3', 'incorrect')],
    delay=60))

os.makedirs(DOSSIER, exist_ok=True)
for nom, mod in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(mod, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
