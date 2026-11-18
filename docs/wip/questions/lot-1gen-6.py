"""Écrit les 7 modèles du lot 6 « statistiques à deux variables » de la 1re générale
(enseignement scientifique, module spécifique) dans scripts/questions/1gen-6-statistiques-deux-variables/.

Phase 0 validée par David le 2026-11-18 (Q20 à Q23, journal docs/archive/wip/questions-1gen-progress.md § 23) :

| #  | Point    | Nœud (posé par la migration)                          | Niveau | Réponse              |
| S1 | 1GEN-001 | Statistiques › Tableaux croisés                       | 2 | case (%, effectif), choix |
| S2 | 1GEN-002 | Statistiques › Statistique à deux variables › nuage   | 1 | ```courbe + placer:       |
| S3 | 1GEN-002 | Statistiques › Statistique à deux variables › nuage   | 1 | case, choix               |
| S4 | 1GEN-004 | Statistiques › Statistique à deux variables › point moyen | 2 | placer: G, case, choix |
| S5 | 1GEN-005 | Statistiques › Statistique à deux variables › ajustement  | 1 | choix                 |
| S6 | 1GEN-007 | Statistiques › Statistique à deux variables › ajustement  | 2 | case (a et b), choix  |
| S7 | 1GEN-006 | Statistiques › Représenter des données                | 1 | choix (formules)          |

S2, S3, S4, S6 sont communs avec la 1re techno (Q21) : écrits ici avec `grades` = ['1_GEN'] ; la
session questions-1techno ajoute `1_TECHNO` et ses tags (085, 082, 084, 087) par sa migration.

Écart à la phase 0 : S1 compare deux diagrammes **séparés** (un par groupe) au lieu de barres groupées :
le bloc à deux séries ne prend que des données brutes (une valeur par élève), qu'un tirage aléatoire ne
sait pas écrire ; deux blocs à effectifs se tirent librement.

Pièges : jamais de variable `e` ni `i` ; case choix `melanger: non` → réponse = rang écrit ; choix
mélangés → réponse « 0 » = premier choix écrit, et le corrigé nomme la bonne réponse, jamais son rang ;
`placer:` = points sur un nœud de la grille ; `points:` d'un ```courbe toujours nommés ; `\\$` dans une
formule de tableur (sinon lu comme une formule mathématique).

    python3 docs/wip/questions/lot-1gen-6.py scripts/questions/1gen-6-statistiques-deux-variables
"""
import json
import os
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables_, answers, status):
    if isinstance(answers, str):
        answers = [answers]
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'answers': answers, 'expected': {'status': status}}


def modele(title, description, level, delay, variations, specs, shared=None):
    # Ni theme, ni domain, ni subdomain (ADR 0035) ; nœud et tag posés par la migration.
    m = {'title': title, 'description': description, 'grades': ['1_GEN'], 'level': level,
         'delay': delay, 'status': 'draft', 'shared': shared or {}}
    m['variations'] = variations
    m['testSpecs'] = specs
    return m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, reponses, steps, conditions=None):
    """reponses : None pour un geste (placer : la case est posée par le bloc)."""
    v = {'statement': statement, 'variables': variables, 'conditions': conditions or []}
    if reponses is not None:
        if isinstance(reponses, str):
            reponses = [reponses]
        v['blanks'] = [{'expectedAnswer': r} for r in reponses]
    v['correction'] = {'steps': steps}
    return v


def col(x):
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


def choix(options, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + o + '\n' for o in options) + '```'


def indic(k, j):
    """1 si k = j, 0 sinon (eval ne connaît pas ==)."""
    return '(1-min(abs(' + k + '-' + str(j) + '),1))'


# --- S1, 1GEN-001 : comparer deux groupes sur des diagrammes --------------------------------

S1_INTRO = ('Dans un lycée, on a demandé à des élèves comment ils viennent le matin. Les diagrammes'
            ' ci-dessous donnent les réponses des filles et celles des garçons.\n\n')


def s1_bloc(kind, titre, valeurs, etiquettes=None):
    lignes = ['```' + kind, 'titre: ' + titre]
    if etiquettes:
        lignes.append('étiquettes: ' + etiquettes)
    if kind == 'barres':
        lignes.append('valeurs: oui')
    lignes += ['Vélo = {{' + valeurs[0] + '}}', 'Bus = {{' + valeurs[1] + '}}',
               'Marche = {{' + valeurs[2] + '}}', '```']
    return '\n'.join(lignes)


def s1_figures(kind, etiquettes=None):
    return (s1_bloc(kind, 'Filles', ['f1', 'f2', 'f3'], etiquettes) + '\n\n'
            + s1_bloc(kind, 'Garçons', ['g1', 'g2', 'g3'], etiquettes))


# Effectifs totaux 20, 25 ou 50 : chaque pourcentage est entier.
S1_FILLES = [var('T1', '20|25|50'), var('f1', '2..12'), var('f2', '2..12'), var('f3', 'eval:T1-f1-f2')]
S1_GARCONS = [var('T2', '20|25|50'), var('g1', '2..12'), var('g2', '2..12'), var('g3', 'eval:T2-g1-g2')]
S1_COND = ['f3 >= 2', 'g3 >= 2', 'f1 != f2', 'f1 != f3', 'g1 != g2', 'g2 != g3']

# Piège : le groupe le plus nombreux a l'effectif le plus grand à vélo, mais la plus petite part.
# Petit groupe (p) : P ∈ {20, 25}, p1 à vélo ; grand groupe (q) : Q = 2P, q1 ∈ ]p1 ; 2·p1[.
S1_PIEGE_VARS = [var('P', '20|25'), var('p1', '5..8'), var('p2', '3..9'), var('p3', 'eval:P-p1-p2'),
                 var('Q', 'eval:2*P'), var('q1', '{{eval:p1+2}}..{{eval:2*p1-2}}'),
                 var('q2', '8..20'), var('q3', 'eval:Q-q1-q2')]
S1_PIEGE_COND = ['p3 >= 2', 'q3 >= 3']


def s1_piege(petit, grand, barres_petit, barres_grand, reponse):
    """petit / grand : nom du groupe ; barres_* : variables (vélo, bus, marche)."""
    # Filles toujours en premier ; le petit groupe est l'un ou l'autre selon la variation.
    if petit == 'Filles':
        figures = s1_bloc('barres', 'Filles', barres_petit) + '\n\n' + s1_bloc('barres', 'Garçons', barres_grand)
    else:
        figures = s1_bloc('barres', 'Filles', barres_grand) + '\n\n' + s1_bloc('barres', 'Garçons', barres_petit)
    p, q = petit.lower(), grand.lower()
    return variation(
        S1_INTRO + figures + '\n\nEn proportion, qui vient le plus souvent à vélo : les filles ou les'
        ' garçons ?' + choix(['Les filles', 'Les garçons'], melanger=False),
        S1_PIEGE_VARS, reponse,
        ['Les groupes n\'ont pas le même effectif : on ne compare pas les effectifs, mais les'
         ' **proportions**.',
         'Il y a ${{p1}}+{{p2}}+{{p3}}={{P}}$ ' + p + ' ; la part de celles et ceux qui viennent à'
         ' vélo est $\\dfrac{ {{p1}} }{ {{P}} }={{eval:100*p1/P;d}}\\,\\%$.',
         'Il y a ${{q1}}+{{q2}}+{{q3}}={{Q}}$ ' + q + ' ; la part est $\\dfrac{ {{q1}} }{ {{Q}} }='
         '{{eval:100*q1/Q;d}}\\,\\%$.',
         'Même si ${{q1}}>{{p1}}$, ce sont **les ' + p + '** qui viennent le plus souvent à vélo, en'
         ' proportion : $' + col('{{eval:100*p1/P;d}}\\,\\%>{{eval:100*q1/Q;d}}\\,\\%') + '$.'],
        S1_PIEGE_COND,
    )


S1 = modele(
    'Comparer deux groupes à l\'aide de diagrammes',
    'Croisement de deux caractères qualitatifs : part d\'un groupe, comparaison en proportion'
    ' (piège des effectifs), effectif retrouvé d\'un pourcentage',
    2, 90,
    [
        variation(
            S1_INTRO + s1_figures('circulaire', 'effectifs')
            + '\n\nQuel pourcentage des filles vient à vélo ?\n\n$?\\,\\%$',
            S1_FILLES + S1_GARCONS, '{{eval:100*f1/T1}}',
            ['On ne regarde que le diagramme des filles : il y a ${{f1}}+{{f2}}+{{f3}}={{T1}}$'
             ' filles.',
             'La part des filles qui viennent à vélo est $\\dfrac{ {{f1}} }{ {{T1}} }='
             '{{eval:f1/T1;d}}$, soit $' + col('{{eval:100*f1/T1}}\\,\\%') + '$.'],
            S1_COND,
        ),
        s1_piege('Filles', 'Garçons', ['p1', 'p2', 'p3'], ['q1', 'q2', 'q3'], '0'),
        s1_piege('Garçons', 'Filles', ['p1', 'p2', 'p3'], ['q1', 'q2', 'q3'], '1'),
        variation(
            'Dans un lycée, on a interrogé ${{T1}}$ filles et ${{T2}}$ garçons sur la façon dont ils'
            ' viennent le matin. Les diagrammes donnent les pourcentages.\n\n'
            + s1_figures('circulaire', 'pourcentages')
            + '\n\nCombien de garçons viennent en bus ?\n\n$?$ garçons',
            S1_FILLES + S1_GARCONS, '{{g2}}',
            ['On lit sur le diagramme des garçons : ${{eval:100*g2/T2}}\\,\\%$ viennent en bus.',
             'Il y a ${{T2}}$ garçons : ${{eval:100*g2/T2}}\\,\\%\\times{{T2}}=\\dfrac{ {{eval:100*g2/T2}}'
             '\\times{{T2}} }{100}=' + col('{{g2}}') + '$ garçons.'],
            S1_COND,
        ),
    ],
    [
        spec('20 filles, 6 à vélo : 30 %', 0,
             {'T1': '20', 'f1': '6', 'f2': '9', 'f3': '5', 'T2': '25', 'g1': '10', 'g2': '8', 'g3': '7'},
             '30', 'correct'),
        spec('Erreur : l\'effectif (6)', 0,
             {'T1': '20', 'f1': '6', 'f2': '9', 'f3': '5', 'T2': '25', 'g1': '10', 'g2': '8', 'g3': '7'},
             '6', 'incorrect'),
        spec('Erreur : rapporté à tous les élèves (6/45 ≈ 13 %)', 0,
             {'T1': '20', 'f1': '6', 'f2': '9', 'f3': '5', 'T2': '25', 'g1': '10', 'g2': '8', 'g3': '7'},
             '13', 'incorrect'),
        spec('Filles 6/20 = 30 % > garçons 10/40 = 25 %', 1,
             {'P': '20', 'p1': '6', 'p2': '8', 'p3': '6', 'Q': '40', 'q1': '10', 'q2': '15', 'q3': '15'},
             '0', 'correct'),
        spec('Erreur : les effectifs comparés (10 > 6)', 1,
             {'P': '20', 'p1': '6', 'p2': '8', 'p3': '6', 'Q': '40', 'q1': '10', 'q2': '15', 'q3': '15'},
             '1', 'incorrect'),
        spec('Garçons 7/25 = 28 % > filles 12/50 = 24 %', 2,
             {'P': '25', 'p1': '7', 'p2': '9', 'p3': '9', 'Q': '50', 'q1': '12', 'q2': '20', 'q3': '18'},
             '1', 'correct'),
        spec('Erreur : les effectifs comparés', 2,
             {'P': '25', 'p1': '7', 'p2': '9', 'p3': '9', 'Q': '50', 'q1': '12', 'q2': '20', 'q3': '18'},
             '0', 'incorrect'),
        spec('25 garçons, 32 % en bus : 8', 3,
             {'T1': '20', 'f1': '6', 'f2': '9', 'f3': '5', 'T2': '25', 'g1': '10', 'g2': '8', 'g3': '7'},
             '8', 'correct'),
        spec('Erreur : le pourcentage (32)', 3,
             {'T1': '20', 'f1': '6', 'f2': '9', 'f3': '5', 'T2': '25', 'g1': '10', 'g2': '8', 'g3': '7'},
             '32', 'incorrect'),
    ],
)

# --- S2, 1GEN-002 : représenter un nuage de points ------------------------------------------

LETTRES = 'ABCDEF'


def tableau(entete_x, entete_y, xs, ys):
    n = len(xs)
    return ('| ' + entete_x + ' | ' + ' | '.join(xs) + ' |\n|' + '---|' * (n + 1) + '\n| '
            + entete_y + ' | ' + ' | '.join(ys) + ' |')


def placer(xs, ys):
    return 'placer: ' + ' ; '.join(LETTRES[k] + '=(' + xs[k] + ' ; ' + ys[k] + ')' for k in range(len(xs)))


def coords_corrige(xs, ys):
    return ', '.join('$' + LETTRES[k] + col('(' + xs[k] + '\\,;' + ys[k] + ')') + '$'
                     for k in range(len(xs)))


S2_CONSIGNE = ('Représente cette série par un nuage de points : place les points $A$, $B$, $C$, $D$ et'
               ' $E$, dans l\'ordre du tableau (le point $A$ représente le premier couple).\n\n')
S2_FIN = ('Chaque colonne du tableau donne un point : l\'abscisse est la valeur de $x$, l\'ordonnée celle'
          ' de $y$. ')

XS1 = ['1', '2', '3', '4', '5']
YS1 = ['{{y' + str(k) + '}}' for k in range(1, 6)]
XS2 = ['5', '6', '7', '8', '9']
YS2 = ['{{eval:20*k' + str(k) + '}}' for k in range(1, 6)]
XS3 = ['1', '2', '3', '4', '5']
YS3 = ['{{eval:5*k' + str(k) + '}}' for k in range(1, 6)]
def croissants(debut):
    """k1 dans debut, puis chaque k augmente de 1 ou 2 (crans assez larges pour le doigt)."""
    return [var('k1', debut)] + [var('k' + str(j), '{{eval:k' + str(j - 1) + '+1}}..{{eval:k' + str(j - 1)
                                     + '+2}}') for j in range(2, 6)]

S2 = modele(
    'Représenter une série à deux variables par un nuage de points',
    'Placer les points (xᵢ ; yᵢ) d\'un tableau : série brute, diamètre et masse de pommes, adhérents'
    ' d\'un club selon le rang de l\'année',
    1, 90,
    [
        variation(
            'On considère la série statistique à deux variables suivante.\n\n'
            + tableau('$x_i$', '$y_i$', XS1, ['$' + y + '$' for y in YS1]) + '\n\n' + S2_CONSIGNE
            + '```courbe\nx: -1 ; 6\ny: -1 ; 11\ngrille: 1 ; 1\n' + placer(XS1, YS1)
            + '\ntaille: moyenne\ndescription: Repère gradué de 1 en 1 : x de −1 à 6, y de −1 à 11.\n```',
            [var('y' + str(k), '0..10') for k in range(1, 6)], None,
            [S2_FIN + 'On place ' + coords_corrige(XS1, YS1) + '.'],
            ['y1 != y2', 'y2 != y3', 'y3 != y4', 'y4 != y5'],
        ),
        variation(
            'Le tableau donne le diamètre $x_i$ (en cm) et la masse $y_i$ (en g) de cinq pommes.\n\n'
            + tableau('Diamètre $x_i$ (cm)', 'Masse $y_i$ (g)', XS2, ['$' + y + '$' for y in YS2])
            + '\n\n' + S2_CONSIGNE
            + '```courbe\nx: 4 ; 10\ny: 40 ; 300\ngrille: 1 ; 20\naxes: x = Diamètre (cm) ; y = Masse (g)\n'
            + placer(XS2, YS2) + '\ntaille: moyenne\ndescription: Repère : diamètre de 4 à 10 cm, de 1 en'
            ' 1 ; masse de 40 à 300 g, de 20 en 20.\n```',
            croissants('4..6'), None,
            [S2_FIN + 'L\'axe des abscisses commence à $4$ : on repère bien chaque diamètre avant de'
             ' placer le point. ' + coords_corrige(XS2, YS2) + '.'],
            ['k5 <= 14'],
        ),
        variation(
            'Le tableau donne le nombre $y_i$ d\'adhérents d\'un club selon le rang $x_i$ de l\'année'
            ' (rang $1$ pour 2019).\n\n'
            + tableau('Rang $x_i$', 'Adhérents $y_i$', XS3, ['$' + y + '$' for y in YS3])
            + '\n\n' + S2_CONSIGNE
            + '```courbe\nx: -1 ; 6\ny: -5 ; 65\ngrille: 1 ; 5\naxes: x = Rang ; y = Adhérents\n'
            + placer(XS3, YS3) + '\ntaille: moyenne\ndescription: Repère : rang de −1 à 6, de 1 en 1 ;'
            ' adhérents de −5 à 65, de 5 en 5.\n```',
            croissants('2..4'), None,
            [S2_FIN + 'L\'ordonnée est graduée de $5$ en $5$. ' + coords_corrige(XS3, YS3) + '.'],
            ['k5 <= 12'],
        ),
    ],
    [
        spec('Série brute : les cinq points', 0,
             {'y1': '3', 'y2': '7', 'y3': '2', 'y4': '9', 'y5': '5'},
             ['1;3', '2;7', '3;2', '4;9', '5;5'], 'correct'),
        spec('Erreur : C avec abscisse et ordonnée échangées', 0,
             {'y1': '3', 'y2': '7', 'y3': '2', 'y4': '9', 'y5': '5'},
             ['1;3', '2;7', '2;3', '4;9', '5;5'], 'incorrect'),
        spec('Pommes : 80, 100, 140, 160, 200 g', 1,
             {'k1': '4', 'k2': '5', 'k3': '7', 'k4': '8', 'k5': '10'},
             ['5;80', '6;100', '7;140', '8;160', '9;200'], 'correct'),
        spec('Erreur : diamètres placés à partir de 1', 1,
             {'k1': '4', 'k2': '5', 'k3': '7', 'k4': '8', 'k5': '10'},
             ['1;80', '2;100', '3;140', '4;160', '5;200'], 'incorrect'),
        spec('Club : 15, 20, 30, 35, 45', 2,
             {'k1': '3', 'k2': '4', 'k3': '6', 'k4': '7', 'k5': '9'},
             ['1;15', '2;20', '3;30', '4;35', '5;45'], 'correct'),
        spec('Erreur : ordonnées lues de 1 en 1 au lieu de 5 en 5', 2,
             {'k1': '3', 'k2': '4', 'k3': '6', 'k4': '7', 'k5': '9'},
             ['1;3', '2;4', '3;6', '4;7', '5;9'], 'incorrect'),
    ],
)

# --- S3, 1GEN-002 : lire un nuage de points -------------------------------------------------

S3_POINTS = 'points: ' + ', '.join(
    LETTRES[k] + '(' + str(k + 1) + ' ; {{y' + str(k + 1) + '}})' for k in range(6))
S3_REPERE = ('```courbe\nx: 0 ; 7\ny: -1 ; 21\ngrille: 1 ; 1\naxes: x = Heures de révision ; y = Note\n'
             + S3_POINTS + '\ntaille: moyenne\ndescription: Nuage de 6 points, un par élève : heures de'
             ' révision de 1 à 6 en abscisse, note sur 20 en ordonnée, graduée de 1 en 1.\n```')
S3_YK = '+'.join('y' + str(j) + '*' + indic('k', j) for j in range(1, 7))


def nuage(ys, titre_x='x', titre_y='y'):
    return ('```nuage\nx: 1 ; 2 ; 3 ; 4 ; 5 ; 6\ny: ' + ' ; '.join(ys) + '\nnom x: ' + titre_x
            + '\nnom y: ' + titre_y + '\n```')


S3_TENDANCE = ['{{eval:b+(a)*' + str(k) + '+n' + str(k) + '}}' for k in range(1, 7)]
S3_COURBE = ['{{eval:c*(' + str(k) + '-m)^2+b}}' for k in range(1, 7)]
S3_BRUIT = [var('n' + str(k), '-2..2') for k in range(1, 7)]
S3_AJUST = ['Oui : les points sont presque alignés', 'Non : les points dessinent nettement une courbe']

S3 = modele(
    'Lire un nuage de points',
    'Lire une valeur sur un nuage, dire la tendance, juger si un ajustement affine est adapté',
    1, 45,
    [
        variation(
            'Six élèves ont noté leur temps de révision (en heures) et leur note au contrôle (sur 20).'
            ' Chaque point du nuage représente un élève.\n\n' + S3_REPERE
            + '\n\nQuelle note a obtenue l\'élève qui a révisé ${{k}}$ heures ?\n\n$?$',
            [var('y' + str(j), '4..19') for j in range(1, 7)] + [var('k', '2..6')],
            '{{eval:' + S3_YK + '}}',
            ['On cherche le point d\'abscisse ${{k}}$ (les heures de révision), puis on lit son'
             ' ordonnée (la note).',
             'Ce point est $({{k}}\\,;{{eval:' + S3_YK + '}})$ : l\'élève a eu $'
             + col('{{eval:' + S3_YK + '}}') + '$.'],
        ),
        variation(
            'Le nuage de points ci-dessous représente une série statistique à deux variables'
            ' $(x_i\\,;y_i)$.\n\n' + nuage(S3_TENDANCE) + '\n\nQue montre ce nuage ?'
            + choix(['$y$ a tendance à augmenter quand $x$ augmente',
                     '$y$ a tendance à diminuer quand $x$ augmente',
                     'On ne voit aucune tendance'], melanger=False),
            [var('a', '3..5;±'), var('b', '32..36')] + S3_BRUIT, '{{eval:(1-a/abs(a))/2}}',
            ['On parcourt le nuage de gauche à droite, quand $x$ augmente.',
             'Les points {{if:a>0|montent|descendent}} dans l\'ensemble (même si deux points voisins'
             ' ne suivent pas toujours) : **$y$ a tendance à {{if:a>0|augmenter|diminuer}} quand $x$'
             ' augmente**.'],
        ),
        variation(
            'Le nuage de points ci-dessous représente une série statistique à deux variables'
            ' $(x_i\\,;y_i)$.\n\n' + nuage(S3_TENDANCE)
            + '\n\nUn ajustement affine (par une droite) de ce nuage semble-t-il adapté ?'
            + choix(S3_AJUST, melanger=False),
            [var('a', '3..5;±'), var('b', '32..36')] + [var('n' + str(k), '-1..1') for k in range(1, 7)],
            '0',
            ['Un ajustement affine est adapté quand les points se répartissent autour d\'une droite.',
             'Ici, ils sont **presque alignés** : une droite passerait tout près de chacun d\'eux.'
             ' L\'ajustement affine est adapté.'],
        ),
        variation(
            'Le nuage de points ci-dessous représente une série statistique à deux variables'
            ' $(x_i\\,;y_i)$.\n\n' + nuage(S3_COURBE)
            + '\n\nUn ajustement affine (par une droite) de ce nuage semble-t-il adapté ?'
            + choix(S3_AJUST, melanger=False),
            [var('c', '2..3'), var('m', '3|4'), var('b', '2..6')], '1',
            ['Un ajustement affine est adapté quand les points se répartissent autour d\'une droite.',
             'Ici, les points descendent puis remontent : ils dessinent une **courbe** en forme de U.'
             ' Aucune droite ne passe près de tous : l\'ajustement affine n\'est pas adapté.'],
        ),
    ],
    [
        spec('4 heures : la note du point D', 0,
             {'y1': '7', 'y2': '9', 'y3': '10', 'y4': '13', 'y5': '12', 'y6': '16', 'k': '4'},
             '13', 'correct'),
        spec('Erreur : point voisin lu (3 heures)', 0,
             {'y1': '7', 'y2': '9', 'y3': '10', 'y4': '13', 'y5': '12', 'y6': '16', 'k': '4'},
             '10', 'incorrect'),
        spec('Tendance croissante', 1,
             {'a': '4', 'b': '34', 'n1': '1', 'n2': '-2', 'n3': '0', 'n4': '2', 'n5': '-1', 'n6': '0'},
             '0', 'correct'),
        spec('Erreur : aucune tendance', 1,
             {'a': '4', 'b': '34', 'n1': '1', 'n2': '-2', 'n3': '0', 'n4': '2', 'n5': '-1', 'n6': '0'},
             '2', 'incorrect'),
        spec('Tendance décroissante', 1,
             {'a': '-3', 'b': '34', 'n1': '1', 'n2': '-2', 'n3': '0', 'n4': '2', 'n5': '-1', 'n6': '0'},
             '1', 'correct'),
        spec('Points presque alignés : oui', 2,
             {'a': '-4', 'b': '34', 'n1': '1', 'n2': '0', 'n3': '-1', 'n4': '1', 'n5': '0', 'n6': '-1'},
             '0', 'correct'),
        spec('Erreur : non', 2,
             {'a': '-4', 'b': '34', 'n1': '1', 'n2': '0', 'n3': '-1', 'n4': '1', 'n5': '0', 'n6': '-1'},
             '1', 'incorrect'),
        spec('Points en U : non', 3, {'c': '2', 'm': '3', 'b': '4'}, '1', 'correct'),
        spec('Erreur : oui', 3, {'c': '2', 'm': '3', 'b': '4'}, '0', 'incorrect'),
    ],
)

# --- S4, 1GEN-004 : le point moyen dans le nuage --------------------------------------------
# v1 : 4 points, moyennes entières par construction (x4 et y4 calculés).
S4_V1_VARS = [var('x1', '0..1'), var('x2', '{{eval:x1+1}}..{{eval:x1+3}}'),
              var('x3', '{{eval:x2+1}}..{{eval:x2+3}}'), var('gx', '3..5'),
              var('x4', 'eval:4*gx-x1-x2-x3'),
              var('y1', '1..9'), var('y2', '1..9'), var('y3', '1..9'), var('gy', '3..7'),
              var('y4', 'eval:4*gy-y1-y2-y3')]
S4_V1_COND = ['x4 > x3', 'x4 <= 8', 'y4 >= 0', 'y4 <= 10', 'gx != x2', 'gx != x3']
# v3 : 5 points, moyennes entières par construction.
S4_V3_VARS = [var('x1', '1..2'), var('x2', '{{eval:x1+1}}..{{eval:x1+3}}'),
              var('x3', '{{eval:x2+1}}..{{eval:x2+3}}'), var('x4', '{{eval:x3+1}}..{{eval:x3+3}}'),
              var('gx', '4..7'), var('x5', 'eval:5*gx-x1-x2-x3-x4'),
              var('y1', '8..20'), var('y2', '8..20'), var('y3', '8..20'), var('y4', '8..20'),
              var('gy', '10..18'), var('y5', 'eval:5*gy-y1-y2-y3-y4')]
S4_V3_COND = ['x5 > x4', 'x5 <= 16', 'y5 >= 5', 'y5 <= 25', 'gx != gy', 'abs(x3-gx)+abs(y3-gy) > 0']

S4 = modele(
    'Le point moyen d\'un nuage de points',
    'Placer le point moyen G, retrouver b sachant que la droite d\'ajustement passe par G,'
    ' reconnaître G parmi des coordonnées',
    2, 90,
    [
        variation(
            'Le nuage ci-dessous compte quatre points $A$, $B$, $C$ et $D$.\n\n'
            '```courbe\nx: -1 ; 9\ny: -1 ; 11\ngrille: 1 ; 1\npoints: A({{x1}} ; {{y1}}), B({{x2}} ; {{y2}}),'
            ' C({{x3}} ; {{y3}}), D({{x4}} ; {{y4}})\nplacer: G=({{gx}} ; {{gy}})\ntaille: moyenne\n'
            'description: Repère gradué de 1 en 1 : x de −1 à 9, y de −1 à 11 ; quatre points A({{x1}} ;'
            ' {{y1}}), B({{x2}} ; {{y2}}), C({{x3}} ; {{y3}}), D({{x4}} ; {{y4}}).\n```\n\n'
            'Place le point moyen $G$ de ce nuage.',
            S4_V1_VARS, None,
            ['Le point moyen $G(\\bar{x}\\,;\\bar{y})$ a pour coordonnées la moyenne des abscisses et'
             ' la moyenne des ordonnées.',
             '$\\bar{x}=\\dfrac{ {{x1}}+{{x2}}+{{x3}}+{{x4}} }{4}={{gx}}$ et $\\bar{y}=\\dfrac{ {{y1}}+'
             '{{y2}}+{{y3}}+{{y4}} }{4}={{gy}}$.',
             'On place $G' + col('({{gx}}\\,;{{gy}})') + '$ : il est « au centre » du nuage, mais ce'
             ' n\'est en général pas un point du nuage.'],
            S4_V1_COND,
        ),
        variation(
            'Le point moyen d\'un nuage de points est $G({{gx}}\\,;{{gy}})$. On ajuste ce nuage par une'
            ' droite de coefficient directeur ${{eval:A/2;d}}$ qui passe par $G$, d\'équation'
            ' $y={{eval:A/2;d}}x+b$.\n\nCalcule $b$.\n\n$b=?$',
            [var('gx', '2..8'), var('gy', '20..60'), var('A', '1..9')], '{{eval:gy-A*gx/2}}',
            ['La droite passe par $G$ : les coordonnées de $G$ vérifient son équation.',
             '${{gy}}={{eval:A/2;d}}\\times{{gx}}+b$, donc $b={{gy}}-{{eval:A*gx/2;d}}='
             + col('{{eval:gy-A*gx/2;d}}') + '$.'],
        ),
        variation(
            'On considère la série statistique à deux variables suivante.\n\n'
            '| $x_i$ | ${{x1}}$ | ${{x2}}$ | ${{x3}}$ | ${{x4}}$ | ${{x5}}$ |\n|---|---|---|---|---|---|\n'
            '| $y_i$ | ${{y1}}$ | ${{y2}}$ | ${{y3}}$ | ${{y4}}$ | ${{y5}}$ |\n\n'
            'Quel est le point moyen du nuage associé ?'
            + choix(['$G({{gx}}\\,;{{gy}})$', '$G({{gy}}\\,;{{gx}})$', '$G({{x3}}\\,;{{y3}})$',
                     '$G({{eval:5*gx/4;d}}\\,;{{eval:5*gy/4;d}})$']),
            S4_V3_VARS, '0',
            ['Le point moyen $G(\\bar{x}\\,;\\bar{y})$ : moyenne des $x_i$, puis moyenne des $y_i$, chacune'
             ' divisée par l\'effectif $5$.',
             '$\\bar{x}=\\dfrac{ {{eval:5*gx}} }{5}={{gx}}$ et $\\bar{y}=\\dfrac{ {{eval:5*gy}} }{5}={{gy}}$,'
             ' donc $' + col('G({{gx}}\\,;{{gy}})') + '$.',
             'La colonne du milieu du tableau n\'est pas le point moyen, et on divise bien par $5$,'
             ' le nombre de points.'],
            S4_V3_COND,
        ),
    ],
    [
        spec('G(4 ; 5)', 0,
             {'x1': '1', 'x2': '3', 'x3': '5', 'gx': '4', 'x4': '7',
              'y1': '2', 'y2': '6', 'y3': '4', 'gy': '5', 'y4': '8'}, '4;5', 'correct'),
        spec('Erreur : abscisse et ordonnée échangées', 0,
             {'x1': '1', 'x2': '3', 'x3': '5', 'gx': '4', 'x4': '7',
              'y1': '2', 'y2': '6', 'y3': '4', 'gy': '5', 'y4': '8'}, '5;4', 'incorrect'),
        spec('Erreur : un point du nuage (B)', 0,
             {'x1': '1', 'x2': '3', 'x3': '5', 'gx': '4', 'x4': '7',
              'y1': '2', 'y2': '6', 'y3': '4', 'gy': '5', 'y4': '8'}, '3;6', 'incorrect'),
        spec('G(4 ; 30), a = 2,5 : b = 20', 1, {'gx': '4', 'gy': '30', 'A': '5'}, '20', 'correct'),
        spec('Erreur : b = ȳ + a·x̄ (40)', 1, {'gx': '4', 'gy': '30', 'A': '5'}, '40', 'incorrect'),
        spec('Erreur : b = ȳ (30)', 1, {'gx': '4', 'gy': '30', 'A': '5'}, '30', 'incorrect'),
        spec('Bon point moyen', 2,
             {'x1': '1', 'x2': '3', 'x3': '5', 'x4': '7', 'gx': '5', 'x5': '9',
              'y1': '10', 'y2': '14', 'y3': '12', 'y4': '16', 'gy': '13', 'y5': '13'}, '0', 'correct'),
        spec('Erreur : coordonnées échangées', 2,
             {'x1': '1', 'x2': '3', 'x3': '5', 'x4': '7', 'gx': '5', 'x5': '9',
              'y1': '10', 'y2': '14', 'y3': '12', 'y4': '16', 'gy': '13', 'y5': '13'}, '1', 'incorrect'),
    ],
    shared={'blankDefaults': {'acceptDecimal': True}},
)

# --- S5, 1GEN-005 : interpolation, extrapolation --------------------------------------------

S5_RELEVES = ('On a relevé tous les deux ans, de 2014 à 2024, la population d\'une ville, puis ajusté le'
              ' nuage obtenu par une droite. On utilise cette droite pour estimer la population en'
              ' {{Y}}.\n\nCette estimation est :' + choix(['une interpolation', 'une extrapolation'],
                                                           melanger=False))
S5_DEF = ('On **interpole** quand on estime une valeur **à l\'intérieur** de la période observée (ici'
          ' de 2014 à 2024), on **extrapole** quand on estime une valeur **en dehors**.')

S5 = modele(
    'Interpolation ou extrapolation ?',
    'Reconnaître une interpolation, une extrapolation, et la prudence qu\'appelle une extrapolation'
    ' lointaine',
    1, 30,
    [
        variation(S5_RELEVES, [var('Y', '2015|2017|2019|2021|2023')], '0',
                  [S5_DEF, '{{Y}} est entre 2014 et 2024 (entre deux relevés) : c\'est une'
                   ' **interpolation**.']),
        variation(S5_RELEVES, [var('Y', '2026..2035')], '1',
                  [S5_DEF, '{{Y}} est après 2024, hors de la période observée : c\'est une'
                   ' **extrapolation**.']),
        variation(
            'Une série statistique à deux variables a été observée pour $x$ allant de ${{a}}$ à'
            ' ${{b}}$. On l\'a ajustée par une droite.\n\nLaquelle de ces estimations est une'
            ' interpolation ?'
            + choix(['L\'estimation de $y$ pour $x={{c}}$', 'L\'estimation de $y$ pour $x={{eval:b+d}}$',
                     'L\'estimation de $y$ pour $x={{eval:a-d}}$', 'L\'estimation de $y$ pour $x={{eval:2*b}}$']),
            [var('a', '3..6'), var('L', '6..10'), var('b', 'eval:a+L'), var('c', '{{eval:a+1}}..{{eval:b-1}}'),
             var('d', '1..2')], '0',
            ['On interpole quand la valeur de $x$ est **dans** l\'intervalle observé $[{{a}}\\,;{{b}}]$.',
             'Seul $x={{c}}$ est entre ${{a}}$ et ${{b}}$ : l\'estimation pour $' + col('x={{c}}') + '$'
             ' est une interpolation ; les trois autres sont des extrapolations.'],
        ),
        variation(
            'Le nombre d\'abonnés à un service a été relevé chaque année de 2015 à 2024 ; le nuage est'
            ' bien ajusté par une droite. On utilise cette droite pour estimer le nombre d\'abonnés en'
            ' {{Y}}.\n\nQue penser de cette estimation ?'
            + choix(['C\'est une extrapolation lointaine : elle est peu fiable, rien ne dit que la'
                     ' tendance va durer',
                     'C\'est une interpolation : elle est fiable',
                     'Elle est exacte, car la droite passe par le point moyen',
                     'Elle est fiable, puisque le nuage est bien ajusté']),
            [var('Y', '2060..2090')], '0',
            ['{{Y}} est bien au-delà de 2024 : c\'est une **extrapolation**, et une extrapolation'
             ' lointaine.',
             'Un bon ajustement sur 2015-2024 ne dit rien de l\'évolution des décennies suivantes : la'
             ' tendance peut changer. L\'estimation est **peu fiable**.'],
        ),
    ],
    [
        spec('2019 : interpolation', 0, {'Y': '2019'}, '0', 'correct'),
        spec('Erreur : extrapolation', 0, {'Y': '2019'}, '1', 'incorrect'),
        spec('2030 : extrapolation', 1, {'Y': '2030'}, '1', 'correct'),
        spec('Erreur : interpolation', 1, {'Y': '2030'}, '0', 'incorrect'),
        spec('x = 7 dans [4 ; 12]', 2, {'a': '4', 'L': '8', 'b': '12', 'c': '7', 'd': '2'}, '0', 'correct'),
        spec('Erreur : x = 14', 2, {'a': '4', 'L': '8', 'b': '12', 'c': '7', 'd': '2'}, '1', 'incorrect'),
        spec('2075 : peu fiable', 3, {'Y': '2075'}, '0', 'correct'),
        spec('Erreur : fiable car bien ajusté', 3, {'Y': '2075'}, '3', 'incorrect'),
    ],
)

# --- S6, 1GEN-007 : déterminer un ajustement affine -----------------------------------------
# Mayer à 6 points : x = 1..6, G1(2 ; g1), G2(5 ; g1 + 3k) → a = k, b = g1 − 2k.
S6_M6_VARS = [var('g1', '6..12'), var('k', '1..4'), var('g2', 'eval:g1+3*k'),
              var('p1', '1..3'), var('q1', '-1..1'), var('p2', '1..3'), var('q2', '-1..1')]
S6_M6_Y = ['{{eval:g1-p1}}', '{{eval:g1+q1}}', '{{eval:g1+p1-q1}}',
           '{{eval:g2-p2}}', '{{eval:g2+q2}}', '{{eval:g2+p2-q2}}']
# Mayer à 8 points : x = 1..8, G1(2,5 ; g1), G2(6,5 ; g1 + 4k) → a = k, b = g1 − 2,5k.
S6_M8_VARS = [var('g1', '6..12'), var('k', '1..3'), var('g2', 'eval:g1+4*k'),
              var('p1', '2..3'), var('q1', '0..1'), var('p2', '2..3'), var('q2', '0..1')]
S6_M8_Y = ['{{eval:g1-p1}}', '{{eval:g1-q1}}', '{{eval:g1+q1}}', '{{eval:g1+p1}}',
           '{{eval:g2-p2}}', '{{eval:g2-q2}}', '{{eval:g2+q2}}', '{{eval:g2+p2}}']


def ligne_tableau(ys):
    xs = [str(k) for k in range(1, len(ys) + 1)]
    return ('| $x_i$ | ' + ' | '.join('$' + x + '$' for x in xs) + ' |\n|' + '---|' * (len(xs) + 1)
            + '\n| $y_i$ | ' + ' | '.join('$' + y + '$' for y in ys) + ' |')


S6_MAYER = ('La **droite de Mayer** : on partage le nuage en deux groupes de même effectif (les plus'
            ' petites valeurs de $x$, puis les plus grandes), on calcule le point moyen de chaque'
            ' groupe, et la droite passe par ces deux points moyens.')

# Au jugé : nuage de 6 points autour de y = a0·x + b0 ; trois droites, la bonne (rang r),
# une de pente opposée passant par le centre, une parallèle qui laisse tout le nuage au-dessus.
S6_JUGE_VARS = [var('a0', '1|2'), var('b0', '3..5')] + [var('n' + str(k), '-1..1') for k in range(1, 7)]
S6_JUGE_POINTS = 'points: ' + ', '.join(
    LETTRES[k] + '(' + str(k + 1) + ' ; {{eval:a0*' + str(k + 1) + '+b0+n' + str(k + 1) + '}})'
    for k in range(6))
S6_DROITES = {
    'bonne': '{{a0}}*x+{{b0}}',
    'opposee': '-{{a0}}*x+{{eval:b0+7*a0}}',
    'dessous': '{{a0}}*x+{{eval:b0-4}}',
}


def s6_juge(ordre):
    """ordre : noms des droites dans l'ordre d₁, d₂, d₃."""
    couleurs = ['bleu', 'rouge', 'vert']
    fonctions = ['f', 'g', 'h']
    lignes = ''.join(fonctions[j] + '(x) = ' + S6_DROITES[nom] + '   ' + couleurs[j] + '   nom=d_'
                     + str(j + 1) + '\n' for j, nom in enumerate(ordre))
    r = ordre.index('bonne')
    o = ordre.index('opposee')
    d = ordre.index('dessous')
    return variation(
        'On veut ajuster **au jugé** le nuage ci-dessous par une droite.\n\n'
        '```courbe\nx: 0 ; 7\ny: -2 ; 20\ngrille: 1 ; 2\n' + S6_JUGE_POINTS + '\n' + lignes
        + 'taille: moyenne\ndescription: Nuage de 6 points et trois droites d₁ (bleue), d₂ (rouge),'
        ' d₃ (verte).\n```\n\nLaquelle de ces droites est un ajustement acceptable du nuage ?'
        + choix(['$d_1$', '$d_2$', '$d_3$'], melanger=False),
        S6_JUGE_VARS, str(r),
        ['Une droite d\'ajustement au jugé suit la tendance du nuage et passe **au milieu** des points :'
         ' à peu près autant de points au-dessus qu\'au-dessous.',
         '$d_' + str(o + 1) + '$ descend alors que le nuage monte ; $d_' + str(d + 1) + '$ a la bonne'
         ' direction, mais laisse tous les points au-dessus d\'elle.',
         '$' + col('d_' + str(r + 1)) + '$ suit le nuage et passe au milieu des points : c\'est un'
         ' ajustement acceptable.'],
    )


S6 = modele(
    'Déterminer un ajustement affine',
    'Droite de Mayer (6 et 8 points), droite au jugé, droite des moindres carrés donnée par la'
    ' calculatrice',
    2, 120,
    [
        variation(
            'On considère la série statistique à deux variables suivante.\n\n' + ligne_tableau(S6_M6_Y)
            + '\n\nDétermine l\'équation $y=ax+b$ de la droite de Mayer : premier groupe $x$ de $1$ à'
            ' $3$, second groupe $x$ de $4$ à $6$.\n\n$a=?$ et $b=?$',
            S6_M6_VARS, ['{{k}}', '{{eval:g1-2*k}}'],
            [S6_MAYER,
             '$G_1$ : $\\bar{x}_1=\\dfrac{1+2+3}{3}=2$, $\\bar{y}_1=\\dfrac{' + '+'.join(S6_M6_Y[:3])
             + '}{3}={{g1}}$.',
             '$G_2$ : $\\bar{x}_2=\\dfrac{4+5+6}{3}=5$, $\\bar{y}_2=\\dfrac{' + '+'.join(S6_M6_Y[3:])
             + '}{3}={{g2}}$.',
             '$a=\\dfrac{ {{g2}}-{{g1}} }{5-2}=' + col('{{k}}') + '$, puis $G_1$ sur la droite :'
             ' ${{g1}}={{k}}\\times2+b$, donc $b=' + col('{{eval:g1-2*k}}') + '$.'],
        ),
        variation(
            'On considère la série statistique à deux variables suivante.\n\n' + ligne_tableau(S6_M8_Y)
            + '\n\nDétermine l\'équation $y=ax+b$ de la droite de Mayer : premier groupe $x$ de $1$ à'
            ' $4$, second groupe $x$ de $5$ à $8$.\n\n$a=?$ et $b=?$',
            S6_M8_VARS, ['{{k}}', '{{eval:g1-5*k/2}}'],
            [S6_MAYER,
             '$G_1$ : $\\bar{x}_1=\\dfrac{1+2+3+4}{4}=2{,}5$, $\\bar{y}_1=\\dfrac{' + '+'.join(S6_M8_Y[:4])
             + '}{4}={{g1}}$.',
             '$G_2$ : $\\bar{x}_2=\\dfrac{5+6+7+8}{4}=6{,}5$, $\\bar{y}_2=\\dfrac{' + '+'.join(S6_M8_Y[4:])
             + '}{4}={{g2}}$.',
             '$a=\\dfrac{ {{g2}}-{{g1}} }{6{,}5-2{,}5}=' + col('{{k}}') + '$, puis $G_1$ sur la droite :'
             ' ${{g1}}={{k}}\\times2{,}5+b$, donc $b=' + col('{{eval:g1-5*k/2;d}}') + '$.'],
        ),
        s6_juge(['bonne', 'opposee', 'dessous']),
        s6_juge(['dessous', 'bonne', 'opposee']),
        s6_juge(['opposee', 'dessous', 'bonne']),
        variation(
            'Pour une série statistique à deux variables, la calculatrice affiche les coefficients de'
            ' la droite d\'ajustement par la méthode des moindres carrés $y=ax+b$ :\n\n'
            '$a={{eval:A/10000;d}}$ et $b={{eval:B/10000;d}}$.\n\nDonne $a$ et $b$ arrondis au'
            ' centième.\n\n$a\\approx ?$ et $b\\approx ?$',
            [var('A', '15001..49999'), var('B', '50001..199999')],
            ['{{eval:round(A/100)/100}}', '{{eval:round(B/100)/100}}'],
            ['La calculatrice fait le calcul des moindres carrés : il reste à arrondir.',
             'Au centième, on regarde le troisième chiffre après la virgule : $a\\approx'
             + col('{{eval:round(A/100)/100;d}}') + '$ et $b\\approx' + col('{{eval:round(B/100)/100;d}}')
             + '$.',
             'La droite des moindres carrés est donc $y={{eval:round(A/100)/100;d}}x+'
             '{{eval:round(B/100)/100;d}}$.'],
            ['abs(mod(A, 100)-50) > 0', 'abs(mod(B, 100)-50) > 0', 'mod(A, 100) != 0', 'mod(B, 100) != 0'],
        ),
    ],
    [
        spec('Mayer 6 : g1 = 8, k = 2 → a = 2, b = 4', 0,
             {'g1': '8', 'k': '2', 'g2': '14', 'p1': '2', 'q1': '1', 'p2': '1', 'q2': '0'},
             ['2', '4'], 'correct'),
        spec('Erreur : a = (ȳ₂ − ȳ₁) sans diviser (6)', 0,
             {'g1': '8', 'k': '2', 'g2': '14', 'p1': '2', 'q1': '1', 'p2': '1', 'q2': '0'},
             ['6', '4'], 'incorrect'),
        spec('Erreur : b = ȳ₁ (8)', 0,
             {'g1': '8', 'k': '2', 'g2': '14', 'p1': '2', 'q1': '1', 'p2': '1', 'q2': '0'},
             ['2', '8'], 'incorrect'),
        spec('Mayer 8 : g1 = 10, k = 3 → a = 3, b = 2,5', 1,
             {'g1': '10', 'k': '3', 'g2': '22', 'p1': '2', 'q1': '1', 'p2': '3', 'q2': '0'},
             ['3', '2,5'], 'correct'),
        spec('Erreur : x̄₁ pris à 2 (b = 4)', 1,
             {'g1': '10', 'k': '3', 'g2': '22', 'p1': '2', 'q1': '1', 'p2': '3', 'q2': '0'},
             ['3', '4'], 'incorrect'),
        spec('Au jugé : d₁', 2, {'a0': '2', 'b0': '4', 'n1': '0', 'n2': '1', 'n3': '-1', 'n4': '0',
                                 'n5': '1', 'n6': '-1'}, '0', 'correct'),
        spec('Erreur : la droite sous le nuage (d₃)', 2,
             {'a0': '2', 'b0': '4', 'n1': '0', 'n2': '1', 'n3': '-1', 'n4': '0', 'n5': '1', 'n6': '-1'},
             '2', 'incorrect'),
        spec('Au jugé : d₂', 3, {'a0': '1', 'b0': '3', 'n1': '0', 'n2': '1', 'n3': '-1', 'n4': '0',
                                 'n5': '1', 'n6': '-1'}, '1', 'correct'),
        spec('Au jugé : d₃', 4, {'a0': '1', 'b0': '5', 'n1': '0', 'n2': '1', 'n3': '-1', 'n4': '0',
                                 'n5': '1', 'n6': '-1'}, '2', 'correct'),
        spec('Erreur : pente opposée (d₁)', 4,
             {'a0': '1', 'b0': '5', 'n1': '0', 'n2': '1', 'n3': '-1', 'n4': '0', 'n5': '1', 'n6': '-1'},
             '0', 'incorrect'),
        spec('a = 2,3471 → 2,35 ; b = 15,0823 → 15,08', 5, {'A': '23471', 'B': '150823'},
             ['2,35', '15,08'], 'correct'),
        spec('Erreur : troncature (2,34)', 5, {'A': '23471', 'B': '150823'}, ['2,34', '15,08'],
             'incorrect'),
    ],
    shared={'blankDefaults': {'acceptDecimal': True}},
)

# --- S7, 1GEN-006 : formules du tableur (tableau croisé) ------------------------------------

S7_VARS = [var('f1', '5..30'), var('f2', '5..30'), var('g1', '5..30'), var('g2', '5..30')]
S7_FEUILLE = ('Une feuille de calcul contient le tableau croisé des élèves d\'un lycée selon leur sexe'
              ' et leur façon de venir.\n\n'
              '|   | A | B | C | D |\n|---|---|---|---|---|\n'
              '| 1 |   | Vélo | Bus | Total |\n'
              '| 2 | Filles | {{f1}} | {{f2}} |   |\n'
              '| 3 | Garçons | {{g1}} | {{g2}} |   |\n'
              '| 4 | Total |   |   |   |\n\n')
S7_PLAGE = ('**Tableur.** Une plage de cellules s\'écrit avec deux-points : « B2:C2 » va de B2 à C2.')

S7 = modele(
    'Formules du tableur pour un tableau croisé',
    'Total d\'une ligne, d\'une colonne, fréquence recopiée avec une référence bloquée, choix du'
    ' diagramme',
    1, 45,
    [
        variation(
            S7_FEUILLE + 'Quelle formule écrire dans la cellule D2 pour obtenir le nombre total de'
            ' filles ?' + choix(['=SOMME(B2:C2)', '=SOMME(B2:B3)', '=SOMME(B2:D2)', '=B2*C2']),
            S7_VARS, '0',
            [S7_PLAGE, 'Les filles sont sur la ligne 2, dans les colonnes B et C : '
             + '$' + col('\\text{=SOMME(B2:C2)}') + '$ donne ${{f1}}+{{f2}}={{eval:f1+f2}}$.',
             '« =SOMME(B2:B3) » additionne la colonne Vélo ; « =SOMME(B2:D2) » contient sa propre'
             ' cellule D2 ; « =B2*C2 » multiplie.'],
        ),
        variation(
            S7_FEUILLE + 'Quelle formule écrire dans la cellule B4 pour obtenir le nombre total'
            ' d\'élèves qui viennent à vélo ?'
            + choix(['=SOMME(B2:B3)', '=SOMME(B2:C2)', '=SOMME(B2:B4)', '=B2+C3']),
            S7_VARS, '0',
            [S7_PLAGE, 'Les élèves qui viennent à vélo sont dans la colonne B, lignes 2 et 3 : '
             + '$' + col('\\text{=SOMME(B2:B3)}') + '$ donne ${{f1}}+{{g1}}={{eval:f1+g1}}$.',
             '« =SOMME(B2:C2) » additionne la ligne des filles ; « =SOMME(B2:B4) » contient sa propre'
             ' cellule B4 ; « =B2+C3 » mélange vélo et bus.'],
        ),
        variation(
            S7_FEUILLE.replace('| 4 | Total |   |   |   |\n\n',
                               '| 4 | Total | {{eval:f1+g1}} | {{eval:f2+g2}} |   |\n'
                               '| 5 |   | Part parmi les cyclistes |   |   |\n'
                               '| 6 | Filles |   |   |   |\n| 7 | Garçons |   |   |   |\n\n')
            + 'En B6, on veut la part des filles parmi les élèves qui viennent à vélo, puis recopier la'
            ' formule vers le bas, en B7, pour obtenir celle des garçons. Quelle formule écrire en'
            ' B6 ?' + choix(['=B2/B\\$4', '=B2/B4', '=B\\$2/B\\$4', '=B4/B2']),
            S7_VARS, '0',
            ['En B6, il faut calculer $\\dfrac{\\text{B2}}{\\text{B4}}$. Mais en recopiant vers le bas, le'
             ' tableur augmente de 1 chaque numéro de ligne : « =B2/B4 » deviendrait « =B3/B5 » en B7,'
             ' et B5 ne contient pas le total.',
             'Le symbole \\$ devant le 4 **bloque** la ligne : « =B2/B\\$4 » devient « =B3/B\\$4 » en B7,'
             ' la part des garçons. La bonne formule est $' + col('\\text{=B2/B\\$4}') + '$.',
             '« =B\\$2/B\\$4 » donnerait encore la part des filles en B7 ; « =B4/B2 » est l\'inverse.'],
        ),
        variation(
            S7_FEUILLE + 'On veut que le tableur trace un diagramme pour comparer la façon de venir des'
            ' filles et celle des garçons, alors qu\'ils ne sont pas aussi nombreux. Quel diagramme'
            ' choisir ?'
            + choix(['Deux diagrammes circulaires, un pour les filles, un pour les garçons',
                     'Un seul diagramme circulaire des totaux « Vélo » et « Bus »',
                     'Une courbe qui relie les effectifs',
                     'Un diagramme en barres des totaux de la ligne 4']),
            S7_VARS, '0',
            ['Pour comparer deux groupes d\'effectifs différents, on compare des **proportions**.',
             'Un diagramme circulaire par groupe montre la part de chaque façon de venir dans ce groupe :'
             ' **deux diagrammes circulaires, un pour les filles, un pour les garçons**.',
             'Les totaux de la ligne 4 mélangent filles et garçons ; une courbe ne convient pas à des'
             ' catégories.'],
        ),
    ],
    [
        spec('D2 : =SOMME(B2:C2)', 0, {'f1': '12', 'f2': '18', 'g1': '9', 'g2': '21'}, '0', 'correct'),
        spec('Erreur : la colonne (=SOMME(B2:B3))', 0, {'f1': '12', 'f2': '18', 'g1': '9', 'g2': '21'},
             '1', 'incorrect'),
        spec('B4 : =SOMME(B2:B3)', 1, {'f1': '12', 'f2': '18', 'g1': '9', 'g2': '21'}, '0', 'correct'),
        spec('Erreur : référence circulaire (=SOMME(B2:B4))', 1,
             {'f1': '12', 'f2': '18', 'g1': '9', 'g2': '21'}, '2', 'incorrect'),
        spec('B6 : =B2/B$4', 2, {'f1': '12', 'f2': '18', 'g1': '9', 'g2': '21'}, '0', 'correct'),
        spec('Erreur : =B2/B4 (faux après recopie)', 2, {'f1': '12', 'f2': '18', 'g1': '9', 'g2': '21'},
             '1', 'incorrect'),
        spec('Deux circulaires', 3, {'f1': '12', 'f2': '18', 'g1': '9', 'g2': '21'}, '0', 'correct'),
        spec('Erreur : barres des totaux', 3, {'f1': '12', 'f2': '18', 'g1': '9', 'g2': '21'}, '3',
             'incorrect'),
    ],
)

MODELES = [('01-comparer-deux-groupes-diagrammes', S1),
           ('02-representer-nuage-de-points', S2),
           ('03-lire-nuage-de-points', S3),
           ('04-point-moyen-du-nuage', S4),
           ('05-interpolation-extrapolation', S5),
           ('06-determiner-ajustement-affine', S6),
           ('07-formules-tableur-tableau-croise', S7)]

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    chemin = os.path.join(DOSSIER, nom + '.json')
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
    print('écrit', chemin)
