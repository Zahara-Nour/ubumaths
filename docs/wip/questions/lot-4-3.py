"""Écrit les 9 modèles du lot 3 « Statistiques » de la 4e dans scripts/questions/4-lot-3/.

Phase 0 validée par David le 2026-10-29 (§ 16 du journal « docs/wip/questions-4-progress.md »), un
point par modèle :

| # | Point | Titre                          | Catégorie, niveau                                   |
| 1 | 4-039 | Moyenne pondérée               | Statistiques › Indicateurs › Moyenne, 3             |
| 2 | 4-040 | Déterminer la médiane          | Statistiques › Indicateurs › Médiane, 1             |
| 3 | 4-077 | Interpréter la médiane         | Statistiques › Indicateurs › Médiane, 2             |
| 4 | 4-041 | Calculer une étendue           | Statistiques › Indicateurs › Étendue, 1             |
| 5 | 4-078 | Interpréter une étendue        | Statistiques › Indicateurs › Étendue, 2             |
| 6 | 4-042 | Ajouter une valeur extrême     | Statistiques › Problèmes › Valeur extrême, 1        |
| 7 | 4-043 | Problèmes avec les indicateurs | Statistiques › Problèmes › Indicateurs, 1           |
| 8 | 4-044 | Comparer deux séries           | Statistiques › Problèmes › Comparer des séries, 1   |
| 9 | 4-045 | Formules du tableur            | Statistiques › Tableur › Formules, 1 (4e et 3e)     |

Bornes : « cycle4.json », 4e (4-040 : effectif ≤ 30, effectif pair → toute valeur entre les deux
valeurs centrales, bornes comprises ; 4-041 : données brutes, tableau, diagramme en barres ; 4-045 :
somme, moyenne, médiane, max, min). Le modèle tableur porte aussi 3-032 (même libellé, décision de
David). Le nœud et le tag sont posés par la migration de rangement, après le « --publier » de David.

Décisions et pièges :
- « median » n'existe pas dans les « eval » : les séries sont tirées déjà rangées (v1 < v2 < …) puis
  affichées dans un ordre mélangé, choisi parmi plusieurs par une variable (« selon ») ;
- moyennes justes avec au plus deux décimales : condition « mod(100*S,N)==0 » (pas d'arrondi demandé) ;
- médiane d'un effectif pair : « rulesSuffice » + règle « range » entre les deux valeurs centrales ;
- cas tirés par « k » (comme les lots 1 et 2), le bon choix est « {{k}} » ;
- variables « e » et « i » interdites dans les « eval ».

    python3 docs/wip/questions/lot-4-3.py scripts/questions/4-lot-3
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


def modele(nom, title, description, domain, subdomain, level, variations, specs,
           delay=60, grades=('4',)):
    m = {'title': title, 'description': description, 'grades': list(grades),
         'theme': 'Statistiques', 'domain': domain, 'subdomain': subdomain, 'level': level,
         'delay': delay, 'status': 'draft'}
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


def selon(nom, valeurs, debut=0):
    """`{{if:nom==debut|v0|{{if:nom==debut+1|v1|…}}}}` ; la dernière valeur est le « sinon »."""
    texte = valeurs[-1]
    for k in range(len(valeurs) - 2, -1, -1):
        texte = '{{if:' + nom + '==' + str(debut + k) + '|' + valeurs[k] + '|' + texte + '}}'
    return texte


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + l + '\n' for l in lignes) + '```'


def ev(x):
    return '{{eval:' + x + '}}'


def txt(x):
    return '$' + col('\\text{' + x + '}') + '$'


def serie(noms, ordre):
    """Les valeurs `{{v3}} ; {{v1}} ; …` dans l'ordre donné (indices dans `noms`)."""
    return ' ; '.join('{{' + noms[j] + '}}' for j in ordre)


def rangee(noms):
    return '$' + ' \\leqslant '.join('{{' + n + '}}' for n in noms) + '$'


def croissante(prefixe, n, debut, pas='1..3'):
    """Variables v1 < v2 < … < vn : v1 tiré dans `debut`, puis des écarts tirés dans `pas`."""
    vs = [var(prefixe + '1', debut)]
    for j in range(2, n + 1):
        vs.append(var('d' + prefixe + str(j), pas))
        vs.append(var(prefixe + str(j), 'eval:' + prefixe + str(j - 1) + '+d' + prefixe + str(j)))
    return vs


def tableau(entete, valeurs, effectifs):
    ligne1 = '| ' + entete[0] + ' | ' + ' | '.join(valeurs) + ' |'
    sep = '|' + '---|' * (len(valeurs) + 1)
    ligne2 = '| ' + entete[1] + ' | ' + ' | '.join(effectifs) + ' |'
    return '\n\n' + '\n'.join([ligne1, sep, ligne2]) + '\n\n'


def barres(axes, valeurs, effectifs):
    return ('\n\n```barres\naxes: ' + axes + '\n'
            + ''.join(v + ' = ' + n + '\n' for v, n in zip(valeurs, effectifs)) + '```\n\n')


def somme(termes):
    return '+'.join(termes)


X = '\\times'
CASE = '\n\n$$?$$'
# Indicatrices de k ∈ {0, 1, 2} : valent 1 pour leur cas, 0 sinon
INDIC = ['(1-k)*(2-k)/2', 'k*(2-k)', 'k*(k-1)/2']
MODELES = []

V4 = ['v1', 'v2', 'v3', 'v4']
N4 = ['n1', 'n2', 'n3', 'n4']
S4 = somme(v + '*' + n for v, n in zip(V4, N4))
T4 = somme(N4)

# --- 1. 4-039 : moyenne pondérée -------------------------------------------------------------

MOYENNE = ('**Moyenne pondérée.** On multiplie chaque valeur par son effectif, on additionne ces'
           ' produits, puis on divise par l\'effectif total.')


def etapes_moyenne(valeurs, effectifs, total, s):
    produits = ' + '.join('{{' + v + '}} ' + X + ' {{' + n + '}}' for v, n in zip(valeurs, effectifs))
    return [MOYENNE,
            'Effectif total : $' + ' + '.join('{{' + n + '}}' for n in effectifs) + ' = '
            + ev(total) + '$.',
            'Somme des produits : $' + produits + ' = ' + ev(s) + '$.',
            '$$\\text{moyenne} = \\frac{' + ev(s) + '}{' + ev(total) + '} = '
            + col('{{solution}}') + '$$']


VARS_TABLEAU = (croissante('v', 4, '5..9', '1..3')
                + [var('n1', '1..6'), var('n2', '1..6'), var('n3', '1..6'), var('n4', '1..6')])
COND_MOYENNE = [T4 + '>=8', T4 + '<=20', 'mod(100*(' + S4 + '),' + T4 + ')==0']

MOY_TABLEAU = variation(
    'Voici les notes obtenues par les élèves d\'un groupe à un contrôle.'
    + tableau(['Note', 'Effectif'], ['{{' + v + '}}' for v in V4], ['{{' + n + '}}' for n in N4])
    + 'Calcule la note moyenne du groupe.' + CASE,
    VARS_TABLEAU, [ev('(' + S4 + ')/(' + T4 + ');d')],
    etapes_moyenne(V4, N4, T4, S4), COND_MOYENNE)

MOY_BARRES = variation(
    'Le diagramme donne les notes obtenues par les élèves d\'un groupe à un contrôle.'
    + barres('Note ; Effectif', ['{{' + v + '}}' for v in V4], ['{{' + n + '}}' for n in N4])
    + 'Calcule la note moyenne du groupe.' + CASE,
    VARS_TABLEAU, [ev('(' + S4 + ')/(' + T4 + ');d')],
    ['On lit les effectifs sur le diagramme : ' + ', '.join(
        'note ${{' + v + '}}$, effectif ${{' + n + '}}$' for v, n in zip(V4, N4)) + '.']
    + etapes_moyenne(V4, N4, T4, S4), COND_MOYENNE)

# Données brutes : trois valeurs a < b < c ; k choisit l'ordre et les effectifs (3, 4, 2) ou (2, 3, 5)
BRUTES = [['b', 'a', 'c', 'b', 'b', 'a', 'c', 'b', 'a'],
          ['c', 'a', 'b', 'c', 'b', 'c', 'a', 'c', 'b', 'c']]
MOY_BRUTES = variation(
    'Voici le nombre de buts marqués par une équipe à chaque match de la saison :\n\n$$'
    + selon('k', [' ; '.join('{{' + x + '}}' for x in o) for o in BRUTES]) + '$$\n\n'
    'Calcule le nombre moyen de buts par match.' + CASE,
    [var('k', '0..1'), var('a', '0..2'), var('da', '1..2'), var('b', 'eval:a+da'),
     var('db', '1..3'), var('c', 'eval:b+db'),
     var('na', 'eval:3-k'), var('nb', 'eval:4-k'), var('nc', 'eval:2+3*k')],
    [ev('(a*na+b*nb+c*nc)/(na+nb+nc);d')],
    [MOYENNE,
     'On regroupe les valeurs : ${{a}}$ apparaît ${{na}}$ fois, ${{b}}$ apparaît ${{nb}}$ fois,'
     ' ${{c}}$ apparaît ${{nc}}$ fois. Effectif total : $' + ev('na+nb+nc') + '$.',
     'Somme : ${{a}} ' + X + ' {{na}} + {{b}} ' + X + ' {{nb}} + {{c}} ' + X + ' {{nc}} = '
     + ev('a*na+b*nb+c*nc') + '$.',
     '$$\\text{moyenne} = \\frac{' + ev('a*na+b*nb+c*nc') + '}{' + ev('na+nb+nc') + '} = '
     + col('{{solution}}') + '$$'],
    ['mod(100*(a*na+b*nb+c*nc),na+nb+nc)==0'])

MOY_COEF = variation(
    'Léa a obtenu trois notes ce trimestre :\n\n- ${{p}}$ au devoir maison (coefficient $1$) ;\n'
    '- ${{q}}$ à l\'interrogation (coefficient $2$) ;\n- ${{r}}$ au contrôle (coefficient $3$).\n\n'
    'Calcule sa moyenne.' + CASE,
    [var('p', '6..20'), var('q', '6..20'), var('r', '6..20')],
    [ev('(p+2*q+3*r)/6;d')],
    ['**Moyenne pondérée.** Chaque note compte autant de fois que son coefficient : on divise par'
     ' la somme des coefficients.',
     'Somme : ${{p}} ' + X + ' 1 + {{q}} ' + X + ' 2 + {{r}} ' + X + ' 3 = ' + ev('p+2*q+3*r')
     + '$ ; somme des coefficients : $1 + 2 + 3 = 6$.',
     '$$\\text{moyenne} = \\frac{' + ev('p+2*q+3*r') + '}{6} = ' + col('{{solution}}') + '$$'],
    ['mod(p+2*q+3*r,3)==0', 'p!=q', 'q!=r'])

MODELES.append(modele(
    '01-moyenne-ponderee', 'Moyenne pondérée',
    'Calculer une moyenne pondérée d\'une série de petit effectif donnée par un tableau, un'
    ' diagramme en barres, des données brutes ou des coefficients',
    'Indicateurs', 'Moyenne', 3,
    [MOY_TABLEAU, MOY_BARRES, MOY_BRUTES, MOY_COEF],
    [spec('Notes 8, 10, 12, 15 ; effectifs 2, 3, 4, 1 : 10,9', 0,
          {'v1': 8, 'dv2': 2, 'v2': 10, 'dv3': 2, 'v3': 12, 'dv4': 3, 'v4': 15,
           'n1': 2, 'n2': 3, 'n3': 4, 'n4': 1}, '10,9', 'correct'),
     spec('Erreur : moyenne des notes sans effectifs (11,25)', 0,
          {'v1': 8, 'dv2': 2, 'v2': 10, 'dv3': 2, 'v3': 12, 'dv4': 3, 'v4': 15,
           'n1': 2, 'n2': 3, 'n3': 4, 'n4': 1}, '11,25', 'incorrect'),
     spec('Erreur : somme des produits ÷ 4 valeurs', 0,
          {'v1': 8, 'dv2': 2, 'v2': 10, 'dv3': 2, 'v3': 12, 'dv4': 3, 'v4': 15,
           'n1': 2, 'n2': 3, 'n3': 4, 'n4': 1}, '27,25', 'incorrect'),
     spec('Diagramme : même série, 10,9', 1,
          {'v1': 8, 'dv2': 2, 'v2': 10, 'dv3': 2, 'v3': 12, 'dv4': 3, 'v4': 15,
           'n1': 2, 'n2': 3, 'n3': 4, 'n4': 1}, '10,9', 'correct'),
     spec('Buts 0, 2, 5 (3, 4, 2 fois) : 2', 2,
          {'k': 0, 'a': 0, 'da': 2, 'b': 2, 'db': 3, 'c': 5, 'na': 3, 'nb': 4, 'nc': 2}, '2',
          'correct'),
     spec('Erreur : moyenne de 0, 2, 5 sans répétitions', 2,
          {'k': 0, 'a': 0, 'da': 2, 'b': 2, 'db': 3, 'c': 5, 'na': 3, 'nb': 4, 'nc': 2},
          '\\frac{7}{3}', 'incorrect'),
     spec('Coefficients 12, 9, 14 : 12', 3, {'p': 12, 'q': 9, 'r': 14}, '12', 'correct'),
     spec('Coefficients 10, 13, 15 : 13,5', 3, {'p': 10, 'q': 13, 'r': 15}, '13,5', 'correct'),
     spec('Erreur : sans coefficients (12,67)', 3, {'p': 10, 'q': 13, 'r': 15}, '12,67',
          'incorrect')]))

# --- 2. 4-040 : déterminer la médiane --------------------------------------------------------

MEDIANE = ('**Médiane.** On range les valeurs dans l\'ordre croissant : la médiane partage la série'
           ' en deux parties de même effectif.')

V5 = ['v1', 'v2', 'v3', 'v4', 'v5']
V7 = V5 + ['v6', 'v7']
V8 = V7 + ['v8']
# Ordres d'affichage : la valeur du milieu de la liste affichée n'est jamais la médiane
ORDRES7 = [[2, 5, 0, 4, 6, 1, 3], [4, 1, 6, 0, 3, 5, 2], [6, 3, 1, 5, 0, 2, 4]]
ORDRES8 = [[5, 2, 7, 0, 6, 3, 1, 4], [1, 6, 3, 7, 4, 0, 5, 2], [7, 4, 0, 5, 2, 6, 3, 1]]

MED_RANGEE = variation(
    'Voici les temps de trajet (en minutes) de cinq élèves pour venir au collège, rangés dans l\'ordre'
    ' croissant :\n\n$$' + serie(V5, range(5)) + '$$\n\nQuelle est la médiane de cette série ?'
    + CASE,
    croissante('v', 5, '3..10', '1..6'), ['{{v3}}'],
    [MEDIANE,
     'Il y a $5$ valeurs : la médiane est la $3^\\text{e}$, avec deux valeurs avant et deux après.',
     '$$\\text{médiane} = ' + col('{{solution}}') + '$$'])

MED_IMPAIR = variation(
    'Voici le nombre de livres lus cette année par sept élèves :\n\n$$'
    + selon('s', [serie(V7, o) for o in ORDRES7]) + '$$\n\nQuelle est la médiane de cette série ?'
    + CASE,
    [var('s', '0..2')] + croissante('v', 7, '0..4', '1..3'), ['{{v4}}'],
    [MEDIANE,
     'Série rangée : ' + rangee(V7) + '.',
     'Il y a $7$ valeurs : la médiane est la $4^\\text{e}$, avec trois valeurs avant et trois après.',
     '$$\\text{médiane} = ' + col('{{solution}}') + '$$'])

MED_PAIR = variation(
    'Voici les tailles (en cm) de huit plants de tomates :\n\n$$'
    + selon('s', [serie(V8, o) for o in ORDRES8]) + '$$\n\nDonne une médiane de cette série.'
    + CASE,
    [var('s', '0..2')] + croissante('v', 8, '20..30', '1..5'),
    [{'expectedAnswer': ev('(v4+v5)/2;d'), 'rulesSuffice': True,
      'validationRules': [{'type': 'range', 'min': '{{v4}}', 'max': '{{v5}}', 'inclusive': True}]}],
    [MEDIANE,
     'Série rangée : ' + rangee(V8) + '.',
     'Il y a $8$ valeurs : les deux valeurs centrales sont la $4^\\text{e}$ (${{v4}}$) et la'
     ' $5^\\text{e}$ (${{v5}}$). Toute valeur comprise entre ${{v4}}$ et ${{v5}}$ partage la série'
     ' en deux parties de $4$ valeurs : c\'est une médiane.',
     'Par exemple, $$\\text{médiane} = ' + col('{{solution}}') + '$$'])

MED_SPECS_PAIR = {'s': 0, 'v1': 21, 'dv2': 2, 'v2': 23, 'dv3': 1, 'v3': 24, 'dv4': 2, 'v4': 26,
                  'dv5': 3, 'v5': 29, 'dv6': 1, 'v6': 30, 'dv7': 4, 'v7': 34, 'dv8': 1, 'v8': 35}
MED_SPECS_IMPAIR = {'s': 0, 'v1': 1, 'dv2': 1, 'v2': 2, 'dv3': 2, 'v3': 4, 'dv4': 1, 'v4': 5,
                    'dv5': 3, 'v5': 8, 'dv6': 1, 'v6': 9, 'dv7': 2, 'v7': 11}

MODELES.append(modele(
    '02-determiner-la-mediane', 'Déterminer la médiane',
    'Déterminer la médiane d\'une série de petit effectif donnée en données brutes, rangée ou non'
    ' (3, 7, 8, 12, 15 → 8) ; effectif pair : toute valeur entre les deux valeurs centrales',
    'Indicateurs', 'Médiane', 1,
    [MED_RANGEE, MED_IMPAIR, MED_PAIR],
    [spec('3, 7, 8, 12, 15 : 8', 0,
          {'v1': 3, 'dv2': 4, 'v2': 7, 'dv3': 1, 'v3': 8, 'dv4': 4, 'v4': 12, 'dv5': 3, 'v5': 15},
          '8', 'correct'),
     spec('Erreur : moyenne 9', 0,
          {'v1': 3, 'dv2': 4, 'v2': 7, 'dv3': 1, 'v3': 8, 'dv4': 4, 'v4': 12, 'dv5': 3, 'v5': 15},
          '9', 'incorrect'),
     spec('Sept valeurs non rangées : 5', 1, MED_SPECS_IMPAIR, '5', 'correct'),
     spec('Erreur : valeur du milieu de la liste non rangée (8)', 1, MED_SPECS_IMPAIR, '8',
          'incorrect'),
     spec('Huit valeurs : 27,5 (milieu des valeurs centrales)', 2, MED_SPECS_PAIR, '27,5',
          'correct'),
     spec('Huit valeurs : 26 (valeur centrale, borne comprise)', 2, MED_SPECS_PAIR, '26',
          'correct'),
     spec('Huit valeurs : 29 (valeur centrale, borne comprise)', 2, MED_SPECS_PAIR, '29',
          'correct'),
     spec('Huit valeurs : 28 (entre les deux)', 2, MED_SPECS_PAIR, '28', 'correct'),
     spec('Erreur : 30, hors des valeurs centrales', 2, MED_SPECS_PAIR, '30', 'incorrect'),
     spec('Erreur : 25, hors des valeurs centrales', 2, MED_SPECS_PAIR, '25', 'incorrect')]))

# --- 3. 4-077 : interpréter la médiane -------------------------------------------------------

# k = 0 : l'affirmation juste parle des notes ≥ m ; k = 1 : des notes ≤ m
MED_AFFIRMER = variation(
    'Dans une classe de ${{N}}$ élèves, la note médiane du dernier contrôle est ${{m}}$.\n\n'
    'Quelle affirmation est vraie ?'
    + choix([selon('k', ['Au moins la moitié des élèves ont une note supérieure ou égale à ${{m}}$.',
                         'Au moins la moitié des élèves ont une note inférieure ou égale à ${{m}}$.']),
             'La moyenne de la classe est ${{m}}$.',
             'Exactement ${{m}}$ élèves ont eu la note ${{m}}$.',
             'Exactement la moitié des élèves ont une note '
             + selon('k', ['inférieure', 'supérieure']) + ' à ${{m}}$.']),
    [var('k', '0..1'), var('p', '10..14'), var('N', 'eval:2*p+1'), var('m', '8..14')],
    ['0'],
    [MEDIANE,
     'La note médiane est la $' + ev('p+1') + '^\\text{e}$ des ${{N}}$ notes rangées : elle a ${{p}}$'
     ' notes avant elle et ${{p}}$ après. Donc au moins $' + ev('p+1') + '$ élèves, plus de la'
     ' moitié, ont une note ' + selon('k', ['supérieure', 'inférieure']) + ' ou égale à ${{m}}$ : '
     + txt('c\'est l\'affirmation vraie') + '.',
     'La médiane ne dit rien de la moyenne, ni du nombre d\'élèves qui ont exactement ${{m}}$ ; et'
     ' ${{N}}$ est impair : « exactement la moitié » est impossible.'])

MED_COMBIEN = variation(
    'Dans un club de ${{N}}$ sportifs, la taille médiane est ${{m}}~\\unit{cm}$.\n\n'
    'Combien de sportifs, au moins, mesurent ${{m}}~\\unit{cm}$ ou plus ?' + CASE,
    [var('p', '8..14'), var('N', 'eval:2*p+1'), var('m', '145..175')],
    ['{{eval:p+1}}'],
    [MEDIANE,
     'Les ${{N}}$ tailles rangées : la médiane est la $' + ev('p+1') + '^\\text{e}$, avec ${{p}}$'
     ' tailles avant et ${{p}}$ après.',
     'La médiane et les ${{p}}$ tailles suivantes sont supérieures ou égales à ${{m}}$ : au moins'
     ' ${{p}} + 1 = ' + col('{{solution}}') + '$ sportifs.'])

MODELES.append(modele(
    '03-interpreter-la-mediane', 'Interpréter la médiane',
    'Interpréter la médiane d\'une série de petit effectif : si la médiane vaut 12, au moins la'
    ' moitié des valeurs sont supérieures ou égales à 12',
    'Indicateurs', 'Médiane', 2,
    [MED_AFFIRMER, MED_COMBIEN],
    [spec('Affirmation vraie (≥)', 0, {'k': 0, 'p': 12, 'N': 25, 'm': 12}, '0', 'correct'),
     spec('Erreur : la moyenne', 0, {'k': 0, 'p': 12, 'N': 25, 'm': 12}, '1', 'incorrect'),
     spec('Affirmation vraie (≤)', 0, {'k': 1, 'p': 10, 'N': 21, 'm': 9}, '0', 'correct'),
     spec('Erreur : exactement la moitié', 0, {'k': 1, 'p': 10, 'N': 21, 'm': 9}, '3',
          'incorrect'),
     spec('21 sportifs, médiane 150 : 11', 1, {'p': 10, 'N': 21, 'm': 150}, '11', 'correct'),
     spec('Erreur : 10 (sans la médiane)', 1, {'p': 10, 'N': 21, 'm': 150}, '10', 'incorrect'),
     spec('Erreur : 10,5 (moitié de 21)', 1, {'p': 10, 'N': 21, 'm': 150}, '10,5', 'incorrect')],
    delay=45))

# --- 4. 4-041 : calculer une étendue ---------------------------------------------------------

ETENDUE = ('**Étendue.** L\'étendue d\'une série est la différence entre sa plus grande valeur et sa'
           ' plus petite valeur.')

T7 = ['t1', 't2', 't3', 't4', 't5', 't6', 't7']
MAXT = 'max(' + ','.join(T7) + ')'
MINT = 'min(' + ','.join(T7) + ')'
JOURS = ['Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.', 'Dim.']

ET_TEMPERATURES = variation(
    'Voici les températures minimales (en °C) relevées dans une ville pendant une semaine.'
    + tableau(['Jour', '$T$ (°C)'], JOURS, ['${{' + t + '}}$' for t in T7])
    + 'Calcule l\'étendue de cette série.' + CASE,
    [var(t, '-6..12') for t in T7],
    [ev(MAXT + '-' + MINT)],
    [ETENDUE,
     'Plus grande valeur : $' + ev(MAXT) + '$ ; plus petite valeur : $' + ev(MINT) + '$.',
     '$$' + ev(MAXT) + ' - (' + ev(MINT) + ') = ' + col('{{solution}}') + '~\\unit{°C}$$'],
    [MINT + '<0', MAXT + '>3', 'abs(t7-t1)!=' + MAXT + '-' + MINT])

V5N = ['n1', 'n2', 'n3', 'n4', 'n5']
ET_TABLEAU = variation(
    'Dans un club, on a relevé la pointure des chaussures des joueurs.'
    + tableau(['Pointure', 'Effectif'], ['{{' + v + '}}' for v in V5], ['{{' + n + '}}' for n in V5N])
    + 'Calcule l\'étendue des pointures.' + CASE,
    croissante('v', 5, '35..38', '1..2') + [var(n, '1..9') for n in V5N],
    ['{{eval:v5-v1}}'],
    [ETENDUE,
     'Les valeurs de la série sont les pointures (pas les effectifs) : la plus grande est ${{v5}}$,'
     ' la plus petite ${{v1}}$.',
     '$${{v5}} - {{v1}} = ' + col('{{solution}}') + '$$'],
    ['max(n1,n2,n3,n4,n5)-min(n1,n2,n3,n4,n5)!=v5-v1'])

ET_BARRES = variation(
    'Le diagramme donne le nombre de livres empruntés au CDI ce mois-ci par les élèves d\'une'
    ' classe.'
    + barres('Livres empruntés ; Effectif', ['{{' + v + '}}' for v in V5],
             ['{{' + n + '}}' for n in V5N])
    + 'Calcule l\'étendue de cette série.' + CASE,
    croissante('v', 5, '0..1', '1..2') + [var(n, '1..9') for n in V5N],
    ['{{eval:v5-v1}}'],
    [ETENDUE,
     'On lit les valeurs sous les barres : la plus grande est ${{v5}}$, la plus petite ${{v1}}$.',
     '$${{v5}} - {{v1}} = ' + col('{{solution}}') + '$$'],
    ['max(n1,n2,n3,n4,n5)-min(n1,n2,n3,n4,n5)!=v5-v1'])

TEMP_SPEC = {'t1': 3, 't2': -4, 't3': 0, 't4': 8, 't5': 12, 't6': 5, 't7': 1}
POINT_SPEC = {'v1': 36, 'dv2': 1, 'v2': 37, 'dv3': 2, 'v3': 39, 'dv4': 1, 'v4': 40, 'dv5': 2,
              'v5': 42, 'n1': 2, 'n2': 5, 'n3': 8, 'n4': 3, 'n5': 1}
FRERES_SPEC = {'v1': 0, 'dv2': 1, 'v2': 1, 'dv3': 1, 'v3': 2, 'dv4': 1, 'v4': 3, 'dv5': 2,
               'v5': 5, 'n1': 4, 'n2': 9, 'n3': 6, 'n4': 2, 'n5': 1}

MODELES.append(modele(
    '04-calculer-une-etendue', 'Calculer une étendue',
    'Calculer l\'étendue d\'une série donnée en données brutes (températures relatives), par un'
    ' tableau d\'effectifs ou un diagramme en barres',
    'Indicateurs', 'Étendue', 1,
    [ET_TEMPERATURES, ET_TABLEAU, ET_BARRES],
    [spec('Températures de −4 à 12 : 16', 0, TEMP_SPEC, '16', 'correct'),
     spec('Erreur : 12 − 4 = 8 (signe oublié)', 0, TEMP_SPEC, '8', 'incorrect'),
     spec('Erreur : dernière − première (−2)', 0, TEMP_SPEC, '-2', 'incorrect'),
     spec('Pointures 36 à 42 : 6', 1, POINT_SPEC, '6', 'correct'),
     spec('Erreur : étendue des effectifs (7)', 1, POINT_SPEC, '7', 'incorrect'),
     spec('Livres empruntés 0 à 5 : 5', 2, FRERES_SPEC, '5', 'correct'),
     spec('Erreur : étendue des effectifs (8)', 2, FRERES_SPEC, '8', 'incorrect')]))

# --- 5. 4-078 : interpréter une étendue ------------------------------------------------------

# Séries symétriques autour de m (même moyenne m) : A = m ± a, m ± b, m, m ; B = m ± c, m ± d, m, m
# k = 0 : A plus dispersée (c = a − δ) ; k = 1 : B (c = a + δ) ; k = 2 : autant (c = a)
SERIE_A = '{{xa1}} ; {{xa2}} ; {{m}} ; {{xa3}} ; {{xa4}} ; {{m}}'
SERIE_B = '{{m}} ; {{xb1}} ; {{xb2}} ; {{m}} ; {{xb3}} ; {{xb4}}'

ET_DISPERSION = variation(
    'Voici les notes de six élèves de deux groupes, A et B :\n\n- groupe A : $' + SERIE_A + '$ ;\n'
    '- groupe B : $' + SERIE_B + '$.\n\nLes deux groupes ont la même moyenne, ${{m}}$. Dans quel'
    ' groupe les notes sont-elles les plus dispersées ?'
    + choix(['le groupe A', 'le groupe B', 'autant dans les deux groupes'], melanger=False),
    [var('k', '0..2'), var('m', '8..12'), var('a', '3..7'), var('b', '1..2'), var('t', '1..3'),
     var('c', 'eval:a-t*' + INDIC[0] + '+t*' + INDIC[1]), var('d', '1..2'),
     var('xa1', 'eval:m-b'), var('xa2', 'eval:m+a'), var('xa3', 'eval:m-a'),
     var('xa4', 'eval:m+b'), var('xb1', 'eval:m+d'), var('xb2', 'eval:m-c'),
     var('xb3', 'eval:m+c'), var('xb4', 'eval:m-d')],
    ['{{k}}'],
    [ETENDUE + ' Plus l\'étendue est grande, plus les valeurs sont dispersées.',
     'Groupe A : $' + ev('m+a') + ' - ' + ev('m-a') + ' = ' + ev('2*a') + '$. Groupe B : $'
     + ev('m+c') + ' - ' + ev('m-c') + ' = ' + ev('2*c') + '$.',
     selon('k', ['L\'étendue de A est la plus grande : ' + txt('le groupe A') + '.',
                 'L\'étendue de B est la plus grande : ' + txt('le groupe B') + '.',
                 'Les étendues sont égales : ' + txt('autant dans les deux groupes') + '.'])],
    ['c>d', 'c>b', 'm+a<=20', 'm+c<=20', 'm-c>=0'])

ET_RETROUVER = variation(
    'Dans une classe, l\'étendue des notes d\'un contrôle est ${{E}}$ et la note la plus basse est'
    ' ${{L}}$.\n\nQuelle est la note la plus haute ?' + CASE,
    [var('L', '2..10'), var('E', '4..12')],
    ['{{eval:L+E}}'],
    [ETENDUE,
     '$$\\text{plus haute} - {{L}} = {{E}}$$',
     '$$\\text{plus haute} = {{L}} + {{E}} = ' + col('{{solution}}') + '$$'],
    ['L+E<=20', 'E!=L'])

DISP_SPEC = {'k': 1, 'm': 10, 'a': 4, 'b': 1, 't': 2, 'c': 6, 'd': 2, 'xa1': 9, 'xa2': 14,
             'xa3': 6, 'xa4': 11, 'xb1': 12, 'xb2': 4, 'xb3': 16, 'xb4': 8}

MODELES.append(modele(
    '05-interpreter-une-etendue', 'Interpréter une étendue',
    'Interpréter l\'étendue d\'une série : laquelle des deux classes a les notes les plus'
    ' dispersées ? Retrouver une valeur extrême à partir de l\'étendue',
    'Indicateurs', 'Étendue', 2,
    [ET_DISPERSION, ET_RETROUVER],
    [spec('B plus dispersé (étendues 8 et 12)', 0, DISP_SPEC, '1', 'correct'),
     spec('Erreur : autant (même moyenne)', 0, DISP_SPEC, '2', 'incorrect'),
     spec('Autant (étendues égales)', 0,
          {**DISP_SPEC, 'k': 2, 'c': 4, 'xb2': 6, 'xb3': 14}, '2', 'correct'),
     spec('Étendue 9, plus basse 7 : 16', 1, {'L': 7, 'E': 9}, '16', 'correct'),
     spec('Erreur : 9 − 7 = 2', 1, {'L': 7, 'E': 9}, '2', 'incorrect')],
    delay=45))

# --- 6. 4-042 : ajouter une valeur extrême ---------------------------------------------------

V6 = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6']
S6 = somme(V6)
ORDRES6 = [[3, 0, 5, 1, 4, 2], [1, 4, 2, 5, 0, 3]]
VARS_EXTREME = ([var('s', '0..1')] + croissante('v', 6, '6..9', '1..2')
                + [var('M', '12..18'), var('Z', 'eval:7*M-(' + S6 + ')')])
COND_EXTREME = ['Z>=v6+15', 'Z<=60', 'mod(' + S6 + ',3)==0']
ENONCE_EXTREME = (
    'Les six joueurs d\'une équipe de basket ont marqué ces points lors d\'un match :\n\n$$'
    + selon('s', [serie(V6, o) for o in ORDRES6]) + '$$\n\nOn avait oublié le septième joueur de'
    ' l\'équipe : il a marqué ${{Z}}$ points. On ajoute sa valeur à la série.\n\n')
AVANT = ('Avant : moyenne $\\dfrac{' + ev(S6) + '}{6} = ' + ev('(' + S6 + ')/6;d') + '$ ;'
         ' série rangée ' + rangee(V6) + ', médiane entre ${{v3}}$ et ${{v4}}$.')
APRES_MOY = ('Après : moyenne $\\dfrac{' + ev(S6) + ' + {{Z}}}{7} = \\dfrac{' + ev(S6 + '+Z')
             + '}{7} = {{M}}$.')
APRES_MED = ('Après : $7$ valeurs, ${{Z}}$ est la plus grande ; la médiane est la $4^\\text{e}$'
             ' valeur rangée, ${{v4}}$.')

EXT_MOYENNE = variation(
    ENONCE_EXTREME + 'Quelle est la nouvelle moyenne de la série ?' + CASE,
    VARS_EXTREME, ['{{M}}'],
    ['**Moyenne.** Somme des valeurs divisée par leur nombre : une valeur très grande l\'entraîne'
     ' vers le haut.', AVANT,
     '$$\\frac{' + ev(S6) + ' + {{Z}}}{7} = \\frac{' + ev(S6 + '+Z') + '}{7} = '
     + col('{{solution}}') + '$$'],
    COND_EXTREME)

EXT_MEDIANE = variation(
    ENONCE_EXTREME + 'Quelle est la nouvelle médiane de la série ?' + CASE,
    VARS_EXTREME, ['{{v4}}'],
    [MEDIANE,
     'Série rangée avec la nouvelle valeur : ' + rangee(V6) + ' $\\leqslant {{Z}}$.',
     'Il y a $7$ valeurs : la médiane est la $4^\\text{e}$.',
     '$$\\text{médiane} = ' + col('{{solution}}') + '$$'],
    COND_EXTREME)

EXT_COMPARER = variation(
    ENONCE_EXTREME + 'Quel indicateur change le plus ?'
    + choix(['la moyenne', 'la médiane', 'aucun des deux : ils changent autant']),
    VARS_EXTREME, ['0'],
    [AVANT, APRES_MOY, APRES_MED,
     'La moyenne passe de $' + ev('(' + S6 + ')/6;d') + '$ à ${{M}}$ ; la médiane bouge à peine : '
     + txt('la moyenne') + ' change le plus. Une valeur extrême tire la moyenne, pas la médiane.'],
    COND_EXTREME)

EXT_SPEC = {'s': 0, 'v1': 7, 'dv2': 1, 'v2': 8, 'dv3': 2, 'v3': 10, 'dv4': 1, 'v4': 11,
            'dv5': 1, 'v5': 12, 'dv6': 3, 'v6': 15, 'M': 15, 'Z': 42}

MODELES.append(modele(
    '06-ajouter-une-valeur-extreme', 'Ajouter une valeur extrême',
    'Comprendre l\'évolution de la moyenne et de la médiane quand on ajoute une valeur extrême à une'
    ' série : la moyenne change beaucoup, la médiane peu',
    'Problèmes', 'Valeur extrême', 1,
    [EXT_MOYENNE, EXT_MEDIANE, EXT_COMPARER],
    [spec('Points 7 à 15, on ajoute 42 : moyenne 15', 0, EXT_SPEC, '15', 'correct'),
     spec('Erreur : ancienne moyenne 10,5', 0, EXT_SPEC, '10,5', 'incorrect'),
     spec('Erreur : (10,5 + 42) ÷ 2', 0, EXT_SPEC, '26,25', 'incorrect'),
     spec('Nouvelle médiane : 11', 1, EXT_SPEC, '11', 'correct'),
     spec('Erreur : la nouvelle moyenne 15', 1, EXT_SPEC, '15', 'incorrect'),
     spec('Erreur : ancienne valeur centrale 10', 1, EXT_SPEC, '10', 'incorrect'),
     spec('La moyenne change le plus', 2, EXT_SPEC, '0', 'correct'),
     spec('Erreur : la médiane', 2, EXT_SPEC, '1', 'incorrect')]))

# --- 7. 4-043 : problèmes avec les indicateurs -----------------------------------------------

PB_NOTE = variation(
    'Après quatre contrôles, Sami a une moyenne de ${{m}}$. Quelle note doit-il obtenir au'
    ' cinquième contrôle pour que sa moyenne passe à ${{q}}$ ?' + CASE,
    [var('m', '9..14'), var('w', '1..2'), var('q', 'eval:m+w')],
    ['{{eval:5*q-4*m}}'],
    ['**Moyenne.** Moyenne × nombre de notes = somme des notes.',
     'Somme des quatre premières notes : $4 ' + X + ' {{m}} = ' + ev('4*m') + '$.',
     'Pour une moyenne de ${{q}}$ sur cinq notes, il faut une somme de $5 ' + X + ' {{q}} = '
     + ev('5*q') + '$.',
     '$$' + ev('5*q') + ' - ' + ev('4*m') + ' = ' + col('{{solution}}') + '$$'],
    ['5*q-4*m<=20'])

PB_SOMME = variation(
    'Dans une classe de ${{N}}$ élèves, la moyenne d\'un contrôle est $' + ev('h/2;d') + '$.\n\n'
    'Quelle est la somme des notes de tous les élèves ?' + CASE,
    [var('N', '20..30'), var('h', '19..29')],
    ['{{eval:N*h/2}}'],
    ['**Moyenne.** La moyenne est la somme des notes divisée par l\'effectif : la somme vaut donc'
     ' moyenne × effectif.',
     '$$' + ev('h/2;d') + ' ' + X + ' {{N}} = ' + col('{{solution}}') + '$$'],
    ['mod(N*h,2)==0', 'mod(h,2)==1'])

PB_GROUPES = variation(
    'Une classe compte deux groupes : ${{p}}$ élèves ont une moyenne de ${{a}}$, et ${{q}}$ élèves'
    ' ont une moyenne de ${{b}}$.\n\nQuelle est la moyenne de toute la classe ?' + CASE,
    [var('p', '6..15'), var('q', '6..18'), var('a', '9..16'), var('b', '9..16')],
    [ev('(p*a+q*b)/(p+q);d')],
    ['**Moyenne pondérée.** Chaque groupe pèse selon son effectif : on retrouve la somme de chaque'
     ' groupe (moyenne × effectif).',
     'Somme du premier groupe : ${{p}} ' + X + ' {{a}} = ' + ev('p*a') + '$ ; du second : ${{q}} '
     + X + ' {{b}} = ' + ev('q*b') + '$.',
     '$$\\frac{' + ev('p*a') + ' + ' + ev('q*b') + '}{{{p}} + {{q}}} = \\frac{' + ev('p*a+q*b')
     + '}{' + ev('p+q') + '} = ' + col('{{solution}}') + '$$'],
    ['p!=q', 'a!=b', 'mod(100*(p*a+q*b),p+q)==0'])

MODELES.append(modele(
    '07-problemes-avec-les-indicateurs', 'Problèmes avec les indicateurs',
    'Résoudre des problèmes avec la moyenne : la note qui manque pour atteindre une moyenne, la'
    ' somme des notes, la moyenne de deux groupes réunis',
    'Problèmes', 'Indicateurs', 1,
    [PB_NOTE, PB_SOMME, PB_GROUPES],
    [spec('Moyenne 12 → 13 : 17', 0, {'m': 12, 'w': 1, 'q': 13}, '17', 'correct'),
     spec('Erreur : 14 (13 + 1)', 0, {'m': 12, 'w': 1, 'q': 13}, '14', 'incorrect'),
     spec('Erreur : 13', 0, {'m': 12, 'w': 1, 'q': 13}, '13', 'incorrect'),
     spec('24 élèves, moyenne 11,5 : 276', 1, {'N': 24, 'h': 23}, '276', 'correct'),
     spec('Erreur : 24 ÷ 11,5 arrondi', 1, {'N': 24, 'h': 23}, '2,09', 'incorrect'),
     spec('10 élèves à 12, 20 à 15 : 14', 2, {'p': 10, 'q': 20, 'a': 12, 'b': 15}, '14',
          'correct'),
     spec('Erreur : 13,5 (moyenne des deux moyennes)', 2, {'p': 10, 'q': 20, 'a': 12, 'b': 15},
          '13,5', 'incorrect')]))

# --- 8. 4-044 : comparer deux séries ---------------------------------------------------------

# k = 0 : Ana a la meilleure moyenne ; k = 1 : Bilal ; k = 2 : égalité
A5 = ['a1', 'a2', 'a3', 'a4', 'a5']
B5 = ['b1', 'b2', 'b3', 'b4', 'b5']
SA = somme(A5)
SB = somme(B5)
CMP_MOYENNE = variation(
    'Ana et Bilal jouent aux fléchettes. Voici leurs scores sur cinq parties :\n\n'
    '- Ana : $' + serie(A5, range(5)) + '$ ;\n- Bilal : $' + serie(B5, range(5)) + '$.\n\n'
    'Qui a la meilleure moyenne ?'
    + choix(['Ana', 'Bilal', 'ils ont la même moyenne'], melanger=False),
    [var('k', '0..2'), var('t', '1..6')] + [var(a, '10..40') for a in A5]
    + [var(b, '10..40') for b in B5[:4]]
    + [var('b5', 'eval:(' + SA + ')-t*' + INDIC[0] + '+t*' + INDIC[1] + '-(b1+b2+b3+b4)')],
    ['{{k}}'],
    ['**Comparer des moyennes.** Ils ont joué le même nombre de parties : on compare les moyennes'
     ' (ou les sommes).',
     'Ana : $\\dfrac{' + ev(SA) + '}{5} = ' + ev('(' + SA + ')/5;d') + '$. Bilal : $\\dfrac{'
     + ev(SB) + '}{5} = ' + ev('(' + SB + ')/5;d') + '$.',
     selon('k', [txt('Ana') + ' a la meilleure moyenne.', txt('Bilal') + ' a la meilleure moyenne.',
                 txt('Ils ont la même moyenne') + '.'])],
    ['b5>=10', 'b5<=40', 'b5!=a5', 'max(' + ','.join(B5) + ')!=max(' + ','.join(A5) + ')'])

CMP_TABLEAU = variation(
    'Voici les indicateurs des notes de deux classes à un même contrôle.\n\n'
    '| | Moyenne | Médiane | Étendue |\n|---|---|---|---|\n'
    '| Classe A | $' + ev('ma/2;d') + '$ | ${{da}}$ | ${{ea}}$ |\n'
    '| Classe B | $' + ev('mb/2;d') + '$ | ${{db}}$ | ${{eb}}$ |\n\n'
    'Quelle affirmation est vraie ?'
    + choix(['La moyenne de la classe A est la plus grande.',
             'Les notes de la classe A sont les plus dispersées.',
             'La médiane de la classe A est la plus grande.',
             'Dans la classe A, tous les élèves ont au moins $' + ev('ma/2;d') + '$.']),
    [var('mb', '18..26'), var('w', '1..4'), var('ma', 'eval:mb+w'), var('db', '10..14'),
     var('u', '1..3'), var('da', 'eval:db-u'), var('ea', '6..12'), var('r', '2..6'),
     var('eb', 'eval:ea+r')],
    ['0'],
    ['**Comparer des séries.** La moyenne et la médiane disent où se placent les notes ; l\'étendue'
     ' dit si elles sont dispersées.',
     'Moyennes : $' + ev('ma/2;d') + ' > ' + ev('mb/2;d') + '$, ' + txt('la moyenne de A est la plus'
                                                                     ' grande') + '.',
     'Étendues : ${{ea}} < {{eb}}$, les notes de B sont les plus dispersées ; médianes : ${{da}} <'
     ' {{db}}$. Une moyenne ne dit pas que tous les élèves l\'atteignent.'])

# k = 0 : médiane de la ville A plus grande ; k = 1 : B ; k = 2 : égales
CMP_MEDIANE = variation(
    'Voici le nombre de jours de pluie relevés en juillet, pendant sept ans, dans deux villes :'
    '\n\n- ville A : $' + serie(V7, ORDRES7[0]) + '$ ;\n- ville B : $'
    + serie(['w' + str(j) for j in range(1, 8)], ORDRES7[1]) + '$.\n\nQuelle ville a la plus'
    ' grande médiane ?'
    + choix(['la ville A', 'la ville B', 'les médianes sont égales'], melanger=False),
    [var('k', '0..2'), var('t', '1..3')] + croissante('v', 7, '2..5', '1..3')
    + [var('w4', 'eval:v4-t*' + INDIC[0] + '+t*' + INDIC[1]),
       var('g3', '1..3'), var('w3', 'eval:w4-g3'), var('g2', '1..2'), var('w2', 'eval:w3-g2'),
       var('g1', '1..2'), var('w1', 'eval:w2-g1'), var('g5', '1..3'), var('w5', 'eval:w4+g5'),
       var('g6', '1..2'), var('w6', 'eval:w5+g6'), var('g7', '1..3'), var('w7', 'eval:w6+g7')],
    ['{{k}}'],
    [MEDIANE,
     'Ville A rangée : ' + rangee(V7) + ', médiane ${{v4}}$.',
     'Ville B rangée : ' + rangee(['w' + str(j) for j in range(1, 8)]) + ', médiane ${{w4}}$.',
     selon('k', [txt('la ville A') + ' a la plus grande médiane.',
                 txt('la ville B') + ' a la plus grande médiane.',
                 txt('les médianes sont égales') + '.'])],
    ['w1>=0'])

ANA = {'a1': 25, 'a2': 30, 'a3': 18, 'a4': 22, 'a5': 35}
MOY_CMP = {'k': 1, 't': 4, **ANA, 'b1': 28, 'b2': 31, 'b3': 20, 'b4': 25, 'b5': 30}
TAB_CMP = {'mb': 22, 'w': 2, 'ma': 24, 'db': 12, 'u': 2, 'da': 10, 'ea': 8, 'r': 4, 'eb': 12}
MED_CMP = {'k': 0, 't': 2, 'v1': 3, 'dv2': 1, 'v2': 4, 'dv3': 2, 'v3': 6, 'dv4': 1, 'v4': 7,
           'dv5': 2, 'v5': 9, 'dv6': 1, 'v6': 10, 'dv7': 3, 'v7': 13, 'w4': 5, 'g3': 1, 'w3': 4,
           'g2': 2, 'w2': 2, 'g1': 1, 'w1': 1, 'g5': 3, 'w5': 8, 'g6': 2, 'w6': 10, 'g7': 3,
           'w7': 13}

MODELES.append(modele(
    '08-comparer-deux-series', 'Comparer deux séries',
    'Comparer deux séries statistiques par leurs indicateurs : meilleure moyenne, affirmation vraie'
    ' sur moyenne, médiane et étendue, plus grande médiane',
    'Problèmes', 'Comparer des séries', 1,
    [CMP_MOYENNE, CMP_TABLEAU, CMP_MEDIANE],
    [spec('Ana 130, Bilal 134 : Bilal', 0, MOY_CMP, '1', 'correct'),
     spec('Erreur : Ana (meilleur score unique, 35)', 0, MOY_CMP, '0', 'incorrect'),
     spec('Moyenne de A plus grande', 1, TAB_CMP, '0', 'correct'),
     spec('Erreur : A plus dispersée', 1, TAB_CMP, '1', 'incorrect'),
     spec('Médianes 7 et 5 : ville A', 2, MED_CMP, '0', 'correct'),
     spec('Erreur : ville B', 2, MED_CMP, '1', 'incorrect')]))

# --- 9. 4-045 et 3-032 : formules du tableur -------------------------------------------------

NOTES = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7']
ELEVES = ['Ana', 'Bilal', 'Chloé', 'Dylan', 'Emma', 'Farid', 'Gaëlle']
S7 = somme(NOTES)


def feuille(ligne9):
    lignes = ['|   | A | B |', '|---|---|---|', '| 1 | Élève | Note |']
    lignes += ['| ' + str(j + 2) + ' | ' + e + ' | {{' + n + '}} |'
               for j, (e, n) in enumerate(zip(ELEVES, NOTES))]
    lignes.append('| 9 | ' + ligne9 + ' |  |')
    return ('Voici une feuille de calcul : les notes de sept élèves sont dans les cellules B2 à B8.'
            '\n\n' + '\n'.join(lignes) + '\n\n')


VARS_NOTES = [var(n, '5..19') for n in NOTES]
TABLEUR = ('**Tableur.** Une plage de cellules s\'écrit avec deux-points : « B2:B8 » va de B2 à B8.'
           ' Le point-virgule sépare des cellules isolées : « B2;B8 » ne prend que B2 et B8.')

TAB_MOYENNE = variation(
    feuille('Moyenne') + 'Quelle formule écrire dans la cellule B9 pour calculer la moyenne des'
    ' notes ?'
    + choix(['=MOYENNE(B2:B8)', '=SOMME(B2:B8)', '=MOYENNE(B2;B8)', '=B2+B8/7']),
    VARS_NOTES, ['0'],
    [TABLEUR,
     '« =MOYENNE(B2:B8) » calcule la moyenne des sept notes : ' + txt('c\'est la bonne formule') + '.',
     '« =SOMME(B2:B8) » donne la somme ; « =MOYENNE(B2;B8) » la moyenne de deux notes seulement ;'
     ' « =B2+B8/7 » divise B8 seul par 7.'])

TAB_MEDIANE = variation(
    feuille('Médiane') + 'Quelle formule écrire dans la cellule B9 pour calculer la médiane des'
    ' notes ?'
    + choix(['=MEDIANE(B2:B8)', '=MOYENNE(B2:B8)', '=MEDIANE(B2;B8)', '=B5']),
    VARS_NOTES, ['0'],
    [TABLEUR,
     '« =MEDIANE(B2:B8) » range les sept notes et donne celle du milieu : '
     + txt('c\'est la bonne formule') + '.',
     '« =B5 » est la cellule du milieu, mais les notes ne sont pas rangées ; « =MEDIANE(B2;B8) » ne'
     ' prend que deux notes.'])

TAB_ETENDUE = variation(
    feuille('Étendue') + 'Quelle formule écrire dans la cellule B9 pour calculer l\'étendue des'
    ' notes ?'
    + choix(['=MAX(B2:B8)-MIN(B2:B8)', '=MAX(B2:B8)', '=B8-B2', '=MIN(B2:B8)-MAX(B2:B8)']),
    VARS_NOTES, ['0'],
    [TABLEUR,
     'L\'étendue est la plus grande note moins la plus petite : '
     + txt('=MAX(B2:B8)-MIN(B2:B8)') + '.',
     '« =B8-B2 » soustrait la dernière note de la première, pas la plus grande de la plus petite ; '
     '« =MIN(B2:B8)-MAX(B2:B8) » donne un nombre négatif.'])

TAB_AFFICHE = variation(
    feuille('Moyenne') + 'On écrit « =MOYENNE(B2:B8) » dans la cellule B9. Quel nombre s\'affiche ?'
    + CASE,
    VARS_NOTES, [ev('(' + S7 + ')/7;d')],
    [TABLEUR,
     'Somme des notes : $' + ' + '.join('{{' + n + '}}' for n in NOTES) + ' = ' + ev(S7) + '$.',
     '$$\\frac{' + ev(S7) + '}{7} = ' + col('{{solution}}') + '$$'],
    ['mod(' + S7 + ',7)==0'])

MODELES.append(modele(
    '09-formules-du-tableur', 'Formules du tableur',
    'Utiliser le tableur pour calculer une moyenne, une médiane et une étendue : =MOYENNE(B2:B8),'
    ' =MEDIANE(B2:B8), =MAX(B2:B8)-MIN(B2:B8)',
    'Tableur', 'Formules', 1,
    [TAB_MOYENNE, TAB_MEDIANE, TAB_ETENDUE, TAB_AFFICHE],
    [spec('=MOYENNE(B2:B8)', 0, {n: 10 for n in NOTES}, '0', 'correct'),
     spec('Erreur : =SOMME(B2:B8)', 0, {n: 10 for n in NOTES}, '1', 'incorrect'),
     spec('Erreur : =MOYENNE(B2;B8)', 0, {n: 10 for n in NOTES}, '2', 'incorrect'),
     spec('=MEDIANE(B2:B8)', 1, {n: 10 for n in NOTES}, '0', 'correct'),
     spec('Erreur : =B5', 1, {n: 10 for n in NOTES}, '3', 'incorrect'),
     spec('=MAX(B2:B8)-MIN(B2:B8)', 2, {n: 10 for n in NOTES}, '0', 'correct'),
     spec('Erreur : =B8-B2', 2, {n: 10 for n in NOTES}, '2', 'incorrect'),
     spec('Notes de somme 84 : 12', 3,
          {'n1': 12, 'n2': 8, 'n3': 15, 'n4': 11, 'n5': 14, 'n6': 9, 'n7': 15}, '12', 'correct'),
     spec('Erreur : somme 84', 3,
          {'n1': 12, 'n2': 8, 'n3': 15, 'n4': 11, 'n5': 14, 'n6': 9, 'n7': 15}, '84',
          'incorrect')],
    delay=45, grades=('4', '3')))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
