"""Écrit les 7 modèles du lot 8 C « Séries en classes, graphiques » de la 2de dans
scripts/questions/2de-classes-c/.

Phase 0 validée par David le 2026-11-02 (§ 51 du journal `docs/wip/questions-2de-progress.md`).
Bornes : `bornes/lycee/2de.json` (2-372, 2-480, 2-380, 2-481, 2-381, 2-482, 2-484) : séries
regroupées en classes **de même amplitude** ; répartition uniforme dans une classe (centre, médiane
estimée). Un point par modèle ; le nœud et le tag sont posés par la migration de rangement, après le
`--publier` de David.

Décisions et pièges :
- un rang tiré (`p`, `c`) choisit une classe : l'indicatrice « k = p » s'écrit
  `(1-min(1,abs((p)-k)))` dans un `eval` (pas de `if` dans un `eval`) ;
- polygone des fréquences cumulées : effectif total 100, pour que les fréquences cumulées tombent
  sur des pourcentages entiers ; la médiane lue tombe sur une borne de classe ;
- classe médiane : effectif total impair (position (N + 1)/2, jamais à cheval sur deux classes) ;
- un choix se répond par son rang dans la liste écrite (mélangée à l'affichage) ;
- jamais de `{{if:…}}` imbriqué : une variation par cas ;
- les variables sont substituées telles quelles dans les `eval` : toujours `(a)`, `-(a)` ;
- variables `e` et `i` interdites.

    python3 docs/wip/questions-2de/lot-classes-c-2de.py scripts/questions/2de-classes-c
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]
HISTOGRAMME = ('Statistiques', 'Représenter des données', 'Histogramme')
CUMULEES = ('Statistiques', 'Représenter des données', 'Fréquences cumulées')
MOYENNE = ('Statistiques', 'Indicateurs', 'Moyenne')
MEDIANE = ('Statistiques', 'Indicateurs', 'Médiane')
COMPARER = ('Statistiques', 'Problèmes', 'Comparer des séries')


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(v) for k, v in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(nom, title, description, categorie, level, variations, specs, delay=90):
    m = {'title': title, 'description': description, 'grades': ['2'], 'theme': categorie[0],
         'domain': categorie[1], 'subdomain': categorie[2], 'level': level, 'delay': delay,
         'status': 'draft', 'shared': {'blankDefaults': {'acceptDecimal': True}},
         'variations': variations, 'testSpecs': specs}
    return nom, m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, blanks, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [{'expectedAnswer': b} for b in blanks]
    v['correction'] = {'steps': steps}
    return v


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def choix(question, options, melanger=True):
    entete = '' if melanger else 'melanger: non\n'
    return question + '\n\n```choix\n' + entete + ''.join('- ' + o + '\n' for o in options) + '```'


def ind(k, p):
    """Indicatrice « k = p » dans un eval (k entier écrit, p nom de variable)."""
    return '(1-min(1,abs((' + p + ')-' + str(k) + ')))'


def borne(k):
    """Borne gauche de la classe k (1 à 5) : x0 + (k − 1)h."""
    return '{{eval:(x0)+' + str(k - 1) + '*(h)}}'


def classe(k):
    return '[' + borne(k) + ' ; ' + borne(k + 1) + '['


def classe_tex(k):
    return '\\left[' + borne(k) + '\\,;' + borne(k + 1) + '\\right['


def tableau_effectifs(entete, effectifs, ligne='Effectif'):
    """Tableau markdown : une ligne des classes, une ligne des effectifs."""
    t = '| ' + entete + ' | ' + ' | '.join('$' + classe_tex(k) + '$' for k in range(1, 6)) + ' |\n'
    t += '|---' * 6 + '|\n'
    t += '| ' + ligne + ' | ' + ' | '.join('$' + n + '$' for n in effectifs) + ' |'
    return t


CLASSES_X = [var('x0', '0|10|20|30|40'), var('h', '5|10|20')]
NOMS = ['{{n' + str(k) + '}}' for k in range(1, 6)]

MODELES = []

# =============================================================================================
# 1. 2-372 : histogramme
# =============================================================================================

# Effectifs pairs (quadrillage de 2 en 2) : 2·s_k, s_k de 1 à 6 ; la classe p reçoit 12 de plus :
# elle est la classe modale.
HISTO_VARS = CLASSES_X + [var('p', '1..5')] + [var('s' + str(k), '1..6') for k in range(1, 6)] + [
    var('n' + str(k), 'eval:2*(s' + str(k) + ')+12*' + ind(k, 'p')) for k in range(1, 6)]


def histo(description):
    return ('```histogramme\naxes: ' + 'Taille (cm) ; Effectif\n'
            + ''.join(classe(k) + ' = {{n' + str(k) + '}}\n' for k in range(1, 6))
            + 'description: ' + description + '\n```')


INTRO_HISTO = ('L\'histogramme ci-dessous donne la répartition des tailles (en cm) de plantes'
               ' mesurées dans un jardin.\n\n' + histo('Histogramme de cinq classes de même amplitude.')
               + '\n\n')
SOMME = '(n1)+(n2)+(n3)+(n4)+(n5)'
LISTE = '{{n1}}+{{n2}}+{{n3}}+{{n4}}+{{n5}}'

HISTO_CLASSE = variation(
    INTRO_HISTO + 'Combien de plantes ont une taille dans la classe $\\left[{{eval:(x0)+((c)-1)*(h)}}'
    '\\,;{{eval:(x0)+(c)*(h)}}\\right[$ ?\n\n$?$ plantes',
    HISTO_VARS + [var('c', '1..5'), var('nc', 'eval:' + '+'.join(
        '(n' + str(k) + ')*' + ind(k, 'c') for k in range(1, 6)))],
    ['{{nc}}'],
    ['Classes de même amplitude : la **hauteur** de chaque rectangle donne l\'effectif de la classe.',
     'Le rectangle de la classe $\\left[{{eval:(x0)+((c)-1)*(h)}}\\,;{{eval:(x0)+(c)*(h)}}\\right[$'
     ' monte à ' + col('{{nc}}') + ' : ${{nc}}$ plantes.'])

HISTO_TOTAL = variation(
    INTRO_HISTO + 'Combien de plantes ont été mesurées en tout ?\n\n$?$ plantes',
    HISTO_VARS,
    ['{{eval:' + SOMME + '}}'],
    ['On lit l\'effectif de chaque classe (hauteur des rectangles), puis on les additionne.',
     '$' + LISTE + '=' + col('{{eval:' + SOMME + '}}') + '$ plantes.'])

HISTO_MODALE = variation(
    INTRO_HISTO + choix('Quelle est la classe modale (la classe de plus grand effectif) ?',
                        ['$' + classe_tex(k) + '$' for k in range(1, 6)], melanger=False),
    HISTO_VARS,
    ['{{eval:(p)-1}}'],
    ['La classe modale est celle du rectangle le **plus haut**.',
     'Effectifs : ' + ', '.join('$' + n + '$' for n in NOMS) + ' ; le plus grand est'
     ' ${{eval:max(' + ','.join('(n' + str(k) + ')' for k in range(1, 6)) + ')}}$, classe '
     + col('\\left[{{eval:(x0)+((p)-1)*(h)}}\\,;{{eval:(x0)+(p)*(h)}}\\right[') + '.'])

SP_H = {'x0': 20, 'h': 10, 'p': 3, 's1': 2, 's2': 4, 's3': 3, 's4': 5, 's5': 1,
        'n1': 4, 'n2': 8, 'n3': 18, 'n4': 10, 'n5': 2}
SP_HC = dict(SP_H, c=4, nc=10)
MODELES.append(modele(
    '01-histogramme', 'Lire un histogramme',
    'Histogramme à classes de même amplitude : effectif d\'une classe, effectif total, classe modale',
    HISTOGRAMME, 1, [HISTO_CLASSE, HISTO_TOTAL, HISTO_MODALE],
    [spec('Classe [50 ; 60[ : 10', 0, SP_HC, '10', 'correct'),
     spec('Erreur : classe voisine (18)', 0, SP_HC, '18', 'incorrect'),
     spec('Total : 42', 1, SP_H, '42', 'correct'),
     spec('Erreur : plus grand effectif (18)', 1, SP_H, '18', 'incorrect'),
     spec('Classe modale [40 ; 50[ (rang 2)', 2, SP_H, '2', 'correct'),
     spec('Erreur : dernière classe', 2, SP_H, '4', 'incorrect')]))

# =============================================================================================
# 2. 2-480 : polygone des fréquences cumulées
# =============================================================================================

# Effectif total 100 ; la médiane tombe sur la borne gauche de la classe 3 (c1 + c2 = 50).
# Effectifs multiples de 10 (quadrillage du polygone de 10 en 10 %).
CUM_VARS = CLASSES_X + [var('a1', '1..4'), var('a3', '1..3'), var('a4', '1..3'),
                        var('n1', 'eval:10*(a1)'), var('n2', 'eval:50-(n1)'), var('n3', 'eval:10*(a3)'),
                        var('n4', 'eval:10*(a4)'), var('n5', 'eval:50-(n3)-(n4)')]


def polygone(lecture=False):
    return ('```frequences-cumulees\naxes: Durée (min) ; Fréquence cumulée\n'
            + ('lecture: médiane\n' if lecture else '')
            + ''.join(classe(k) + ' = {{n' + str(k) + '}}\n' for k in range(1, 6))
            + 'description: Polygone des fréquences cumulées croissantes de cinq classes.\n```')


INTRO_CUM = ('On a relevé la durée (en minutes) de $100$ appels téléphoniques. Voici le polygone des'
             ' fréquences cumulées croissantes.\n\n' + polygone() + '\n\n')

CUM_LIRE = variation(
    INTRO_CUM + 'Quel pourcentage des appels ont duré moins de ${{eval:(x0)+(c)*(h)}}$ minutes ?'
    '\n\n$?\\,\\%$',
    CUM_VARS + [var('c', '1|3|4'), var('fc', 'eval:' + '+'.join(
        '(n' + str(k) + ')*min(1,max(0,(c)-' + str(k - 1) + '))' for k in range(1, 6)))],
    ['{{fc}}'],
    ['Le polygone passe, à la borne droite de chaque classe, par la fréquence cumulée : la part des'
     ' valeurs **inférieures** à cette borne.',
     'À l\'abscisse ${{eval:(x0)+(c)*(h)}}$, on lit ' + col('{{fc}}\\,\\%') + '.'],
    ['n5 >= 10'])

CUM_MEDIANE = variation(
    INTRO_CUM + 'Lis une valeur de la médiane de la durée des appels.\n\nMédiane : $?$ minutes',
    CUM_VARS,
    ['{{eval:(x0)+2*(h)}}'],
    ['La médiane est l\'abscisse du point du polygone d\'ordonnée $50\\,\\%$.',
     polygone(lecture=True),
     'On lit ' + col('{{eval:(x0)+2*(h)}}') + ' minutes.'],
    ['n5 >= 10'])

SP_CUM = {'x0': 0, 'h': 5, 'a1': 2, 'a3': 2, 'a4': 2, 'n1': 20, 'n2': 30, 'n3': 20, 'n4': 20, 'n5': 10}
MODELES.append(modele(
    '02-polygone-des-frequences-cumulees', 'Lire un polygone des fréquences cumulées',
    'Fréquence cumulée lue à une borne de classe ; médiane lue à 50 %',
    CUMULEES, 1, [CUM_LIRE, CUM_MEDIANE],
    [spec('Moins de 15 min : 70 %', 0, dict(SP_CUM, c=3, fc=70), '70', 'correct'),
     spec('Erreur : effectif de la classe (20)', 0, dict(SP_CUM, c=3, fc=70), '20', 'incorrect'),
     spec('Médiane : 10', 1, SP_CUM, '10', 'correct'),
     spec('Erreur : 50 (l\'ordonnée)', 1, SP_CUM, '50', 'incorrect')]))

# =============================================================================================
# 3. 2-380 : moyenne à partir des moyennes des classes
# =============================================================================================

TABLE_380 = ('| Âge | Effectif | Moyenne des âges de la classe |\n|---|---|---|\n'
             + ''.join('| $' + classe_tex(k) + '$ | ${{n' + str(k) + '}}$ | ${{eval:(x0)+' + str(k - 1)
                       + '*(h)+(u' + str(k) + ');d}}$ |\n' for k in range(1, 4)))
SOMME_380 = '+'.join('(n' + str(k) + ')*((x0)+' + str(k - 1) + '*(h)+(u' + str(k) + '))'
                     for k in range(1, 4))
EFF_380 = '(n1)+(n2)+(n3)'

PONDEREE = variation(
    'Les adhérents d\'un club sont répartis en trois classes d\'âge. Pour chaque classe, on connaît'
    ' l\'effectif et la moyenne des âges.\n\n' + TABLE_380 + '\nCalcule l\'âge moyen des adhérents'
    ' du club.\n\nÂge moyen : $?$ ans',
    [var('x0', '10|20|30'), var('h', '10'), var('n1', '5..30'), var('n2', '5..30'),
     var('n3', '5..30'), var('u1', '2..8'), var('u2', '2..8'), var('u3', '2..8')],
    ['{{eval:(' + SOMME_380 + ')/(' + EFF_380 + ');d}}'],
    ['La moyenne de la série est la moyenne des moyennes de classe **pondérée par les effectifs** :'
     ' $\\overline{x}=\\dfrac{n_1\\overline{x}_1+n_2\\overline{x}_2+n_3\\overline{x}_3}{n_1+n_2+n_3}$.',
     'Somme des âges : $' + '+'.join('{{n' + str(k) + '}}\\times{{eval:(x0)+' + str(k - 1) + '*(h)+(u'
                                    + str(k) + ')}}' for k in range(1, 4))
     + '={{eval:' + SOMME_380 + '}}$ ; effectif : ${{eval:' + EFF_380 + '}}$.',
     '$\\overline{x}=\\dfrac{ {{eval:' + SOMME_380 + '}} }{ {{eval:' + EFF_380 + '}} }='
     + col('{{eval:(' + SOMME_380 + ')/(' + EFF_380 + ');d}}') + '$ ans.'],
    ['mod(10*(' + SOMME_380 + '),' + EFF_380 + ') == 0', 'n1 != n2'])

SP_380 = {'x0': 20, 'h': 10, 'n1': 30, 'n2': 10, 'n3': 10, 'u1': 4, 'u2': 5, 'u3': 6}
MODELES.append(modele(
    '03-moyenne-des-moyennes-de-classes', 'Moyenne à partir des moyennes des classes',
    'Série regroupée en classes : moyenne pondérée des moyennes de classe (piège : moyenne des'
    ' moyennes)',
    MOYENNE, 6, [PONDEREE],
    [spec('(30×24 + 10×35 + 10×46)/50 = 30,6', 0, SP_380, '30.6', 'correct'),
     spec('Erreur : moyenne des moyennes (35)', 0, SP_380, '35', 'incorrect')]))

# =============================================================================================
# 4. 2-481 : moyenne par les centres de classes
# =============================================================================================

SOMME_481 = '+'.join('(n' + str(k) + ')*((x0)+' + str(k - 1) + '*(h)+(h)/2)' for k in range(1, 6))
EFF_481 = '+'.join('(n' + str(k) + ')' for k in range(1, 6))

CENTRES = variation(
    'Voici la répartition des temps de course (en minutes) des élèves d\'un lycée.\n\n'
    + tableau_effectifs('Temps (min)', NOMS) + '\n\nOn suppose les valeurs **réparties uniformément**'
    ' dans chaque classe. Calcule le temps moyen.\n\nTemps moyen : $?$ minutes',
    CLASSES_X + [var('n' + str(k), '1..12') for k in range(1, 6)],
    ['{{eval:(' + SOMME_481 + ')/(' + EFF_481 + ');d}}'],
    ['Répartition uniforme : chaque classe est représentée par son **centre**, $\\dfrac{a+b}{2}$.',
     'Centres : ' + ', '.join('${{eval:(x0)+' + str(k - 1) + '*(h)+(h)/2;d}}$' for k in range(1, 6))
     + ' ; effectif total ${{eval:' + EFF_481 + '}}$.',
     '$\\overline{x}=\\dfrac{' + '+'.join('{{n' + str(k) + '}}\\times{{eval:(x0)+' + str(k - 1)
                                         + '*(h)+(h)/2;d}}' for k in range(1, 6)) + '}{ {{eval:'
     + EFF_481 + '}} }=' + col('{{eval:(' + SOMME_481 + ')/(' + EFF_481 + ');d}}') + '$.'],
    ['mod(100*(' + SOMME_481 + '),' + EFF_481 + ') == 0'])

SP_481 = {'x0': 20, 'h': 10, 'n1': 2, 'n2': 3, 'n3': 5, 'n4': 6, 'n5': 4}
MODELES.append(modele(
    '04-moyenne-par-les-centres', 'Moyenne d\'une série regroupée en classes',
    'Répartition uniforme dans chaque classe : moyenne calculée avec les centres des classes',
    MOYENNE, 7, [CENTRES],
    [spec('Centres 25…65, effectifs 2 3 5 6 4 : 970/20 = 48,5', 0, SP_481, '48.5', 'correct'),
     spec('Erreur : bornes gauches (43,5)', 0, SP_481, '43.5', 'incorrect'),
     spec('Erreur : moyenne des centres (45)', 0, SP_481, '45', 'incorrect')]))

# =============================================================================================
# 5. 2-381 : classe médiane
# =============================================================================================

CUMS = ['(n1)', '(n1)+(n2)', '(n1)+(n2)+(n3)', '(n1)+(n2)+(n3)+(n4)']
N_381 = '(n1)+(n2)+(n3)+(n4)+(n5)'
RANG = '(' + N_381 + '+1)/2'
INDEX_MED = '+'.join('min(1,max(0,' + RANG + '-(' + c + ')))' for c in CUMS)

CLASSE_MEDIANE = variation(
    'Voici la répartition des masses (en grammes) des pommes d\'une cagette.\n\n'
    + tableau_effectifs('Masse (g)', NOMS) + '\n\n'
    + choix('Quelle est la classe médiane ?', ['$' + classe_tex(k) + '$' for k in range(1, 6)],
            melanger=False),
    [var('x0', '100|120|150'), var('h', '10|20')] + [var('n' + str(k), '1..12') for k in range(1, 6)]
    + [var('m', 'eval:' + INDEX_MED)],
    ['{{m}}'],
    ['Effectif total : ${{eval:' + N_381 + '}}$, impair : la médiane est la valeur de rang'
     ' $\\dfrac{ {{eval:' + N_381 + '}}+1}{2}={{eval:' + RANG + '}}$.',
     'Effectifs cumulés : ' + ', '.join('${{eval:' + c + '}}$' for c in CUMS) + ', ${{eval:' + N_381
     + '}}$. La classe médiane est la première dont l\'effectif cumulé atteint ${{eval:' + RANG
     + '}}$ : ' + col('\\left[{{eval:(x0)+(m)*(h)}}\\,;{{eval:(x0)+((m)+1)*(h)}}\\right[') + '.'],
    ['mod(' + N_381 + ',2) == 1'])

SP_381 = {'x0': 100, 'h': 20, 'n1': 3, 'n2': 5, 'n3': 4, 'n4': 6, 'n5': 3, 'm': 2}
MODELES.append(modele(
    '05-classe-mediane', 'Classe médiane d\'une série regroupée en classes',
    'Effectifs de cinq classes : classe médiane par les effectifs cumulés (effectif total impair)',
    MEDIANE, 4, [CLASSE_MEDIANE],
    [spec('N = 21, rang 11 : cumulés 3, 8, 12 → [140 ; 160[', 0, SP_381, '2', 'correct'),
     spec('Erreur : classe modale [160 ; 180[', 0, SP_381, '3', 'incorrect')]))

# =============================================================================================
# 6. 2-482 : médiane estimée (répartition uniforme dans la classe médiane)
# =============================================================================================

# Effectif total 100, la classe médiane est la 3e : c1 + c2 < 50 ⩽ c1 + c2 + c3.
VARS_482 = CLASSES_X + [var('n1', '5..20'), var('n2', '5..20'), var('n3', '20|25|40|50'),
                        var('n4', '5..15'), var('n5', 'eval:100-(n1)-(n2)-(n3)-(n4)'),
                        var('cb', 'eval:(n1)+(n2)')]
ME = '(x0)+2*(h)+(50-(cb))*(h)/(n3)'

MEDIANE_ESTIMEE = variation(
    'On a relevé la durée (en minutes) de $100$ trajets.\n\n' + tableau_effectifs('Durée (min)', NOMS)
    + '\n\nLa classe médiane est $\\left[{{eval:(x0)+2*(h)}}\\,;{{eval:(x0)+3*(h)}}\\right[$. On suppose'
    ' les durées **réparties uniformément** dans cette classe. Estime la médiane.\n\nMédiane : $?$'
    ' minutes',
    VARS_482,
    ['{{eval:' + ME + ';d}}'],
    ['Avant la classe médiane, il y a ${{n1}}+{{n2}}={{cb}}$ valeurs ; il en manque $50-{{cb}}='
     '{{eval:50-(cb)}}$ pour atteindre la moitié.',
     'Répartition uniforme : ces ${{eval:50-(cb)}}$ valeurs, sur les ${{n3}}$ de la classe, occupent'
     ' la fraction $\\dfrac{ {{eval:50-(cb)}} }{ {{n3}} }$ de l\'amplitude ${{h}}$.',
     '$Me\\approx{{eval:(x0)+2*(h)}}+\\dfrac{ {{eval:50-(cb)}} }{ {{n3}} }\\times{{h}}='
     + col('{{eval:' + ME + ';d}}') + '$ minutes.'],
    ['cb < 50', '(cb)+(n3) > 50', 'n5 >= 1', 'mod(10*(50-(cb))*(h),n3) == 0'])

SP_482 = {'x0': 0, 'h': 10, 'n1': 15, 'n2': 20, 'n3': 25, 'n4': 15, 'n5': 25, 'cb': 35}
MODELES.append(modele(
    '06-mediane-estimee', 'Estimer la médiane d\'une série regroupée en classes',
    'Répartition uniforme dans la classe médiane : médiane estimée par proportionnalité',
    MEDIANE, 5, [MEDIANE_ESTIMEE],
    [spec('35 avant, 25 dans [20 ; 30[ : 20 + 15/25 × 10 = 26', 0, SP_482, '26', 'correct'),
     spec('Erreur : centre de la classe (25)', 0, SP_482, '25', 'incorrect'),
     spec('Erreur : borne gauche (20)', 0, SP_482, '20', 'incorrect')]))

# =============================================================================================
# 7. 2-484 : comparer deux boîtes à moustaches
# =============================================================================================

# Boîte A : min, Q1, Me, Q3, max par pas de 5 ; idem B.
BOITES_VARS = []
for s in 'ab':
    BOITES_VARS += [var('m0' + s, '0|5|10|15'), var('g1' + s, '1..3'), var('g2' + s, '1..3'),
                    var('g3' + s, '1..3'), var('g4' + s, '1..3'),
                    var('q1' + s, 'eval:(m0' + s + ')+5*(g1' + s + ')'),
                    var('me' + s, 'eval:(q1' + s + ')+5*(g2' + s + ')'),
                    var('q3' + s, 'eval:(me' + s + ')+5*(g3' + s + ')'),
                    var('mx' + s, 'eval:(q3' + s + ')+5*(g4' + s + ')'),
                    var('iq' + s, 'eval:(q3' + s + ')-(q1' + s + ')'),
                    var('et' + s, 'eval:(mx' + s + ')-(m0' + s + ')')]


def boites():
    return ('```boite-a-moustaches\naxe: 0 à 75, de 5 en 5\ntitre: Note sur 75\n'
            'Classe A = {{m0a}} ; {{q1a}} ; {{mea}} ; {{q3a}} ; {{mxa}}\n'
            'Classe B = {{m0b}} ; {{q1b}} ; {{meb}} ; {{q3b}} ; {{mxb}}\n'
            'description: Deux boîtes à moustaches, classes A et B.\n```')


INTRO_BOITES = ('Les boîtes à moustaches ci-dessous résument les notes (sur $75$) de deux classes à un'
                ' concours.\n\n' + boites() + '\n\n')
CHOIX_AB = ['la classe A', 'la classe B', 'les deux sont égales']
LECTURE_AB = ('Classe A : minimum ${{m0a}}$, $Q_1={{q1a}}$, médiane ${{mea}}$, $Q_3={{q3a}}$, maximum'
              ' ${{mxa}}$. Classe B : minimum ${{m0b}}$, $Q_1={{q1b}}$, médiane ${{meb}}$,'
              ' $Q_3={{q3b}}$, maximum ${{mxb}}$.')

BOITE_MEDIANE = variation(
    INTRO_BOITES + choix('Quelle classe a la plus grande médiane ?', CHOIX_AB, melanger=False),
    BOITES_VARS,
    ['{{if:mea>meb|0|1}}'],
    ['La médiane est le trait **à l\'intérieur** de la boîte.', LECTURE_AB,
     'La plus grande médiane est celle de ' + col('\\text{la classe {{if:mea>meb|A|B}}}') + '.'],
    ['mea != meb'])

BOITE_ETENDUE = variation(
    INTRO_BOITES + choix('Quelle classe a la plus grande étendue de notes ?', CHOIX_AB, melanger=False),
    BOITES_VARS,
    ['{{if:eta>etb|0|1}}'],
    ['L\'étendue est la longueur totale, d\'une extrémité des moustaches à l\'autre : maximum $-$'
     ' minimum.', LECTURE_AB,
     'Étendues : A : ${{mxa}}-{{m0a}}={{eta}}$ ; B : ${{mxb}}-{{m0b}}={{etb}}$ : '
     + col('\\text{la classe {{if:eta>etb|A|B}}}') + '.'],
    ['eta != etb'])

BOITE_IQ = variation(
    INTRO_BOITES + choix('Quelle classe a le plus grand écart interquartile ?', CHOIX_AB, melanger=False),
    BOITES_VARS,
    ['{{if:iqa>iqb|0|1}}'],
    ['L\'écart interquartile $Q_3-Q_1$ est la **longueur de la boîte**.', LECTURE_AB,
     'Écarts interquartiles : A : ${{q3a}}-{{q1a}}={{iqa}}$ ; B : ${{q3b}}-{{q1b}}={{iqb}}$ : '
     + col('\\text{la classe {{if:iqa>iqb|A|B}}}') + '.'],
    ['iqa != iqb'])

SP_B = {'m0a': 10, 'g1a': 2, 'g2a': 1, 'g3a': 1, 'g4a': 3, 'q1a': 20, 'mea': 25, 'q3a': 30, 'mxa': 45,
        'iqa': 10, 'eta': 35,
        'm0b': 5, 'g1b': 1, 'g2b': 3, 'g3b': 2, 'g4b': 1, 'q1b': 10, 'meb': 25, 'q3b': 35, 'mxb': 40,
        'iqb': 25, 'etb': 35}
SP_BM = dict(SP_B, meb=30, q3b=40, mxb=45, iqb=30, etb=40)
MODELES.append(modele(
    '07-comparer-deux-boites', 'Comparer deux séries sur leurs boîtes à moustaches',
    'Deux boîtes à moustaches données : la plus grande médiane, étendue, écart interquartile',
    COMPARER, 4, [BOITE_MEDIANE, BOITE_ETENDUE, BOITE_IQ],
    [spec('Médianes 25 et 30 : B', 0, SP_BM, '1', 'correct'),
     spec('Erreur : A', 0, SP_BM, '0', 'incorrect'),
     spec('Étendues 35 et 40 : B', 1, SP_BM, '1', 'correct'),
     spec('Erreur : égales', 1, SP_BM, '2', 'incorrect'),
     spec('Écarts interquartiles 10 et 25 : B', 2, SP_B, '1', 'correct'),
     spec('Erreur : A (plus haut minimum)', 2, SP_B, '0', 'incorrect')]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
