"""Écrit les 8 modèles du lot 8 A « Évolutions et proportions » de la 2de dans
scripts/questions/2de-evolutions-a/.

Phase 0 validée par David le 2026-11-02 (§ 51 du journal `docs/wip/questions-2de-progress.md`).
Bornes : `bornes/lycee/2de.json` (2-365, 2-368, 2-478, 2-364, 2-376, 2-375, 2-490, 2-491). Un point
par modèle ; le nœud et le tag sont posés par la migration de rangement, après le `--publier` de
David.

Décisions et pièges :
- L8-a : 2-368 et 2-478 = des coefficients multiplicateurs donnés ET demandés, sans taux
  (36abc642 et bbd511cb, publiés, partent des taux : 2-378, 2-379) ;
- L8-c : 2-491 (oubli du lot 2 bis) écrit ici, catégorie « Lecture graphique » (niv. 1 à 3 pris) ;
- un nombre décimal calculé s'écrit `{{eval:…;d}}` ; sans `;d` une fraction exacte reste une
  fraction (coefficient réciproque 5/6) ;
- montants `$…~\\unit{€}$`, case `$?~\\unit{€}$` ; pourcentages `$…\\,\\%$`, case `$?\\,\\%$` ;
- un choix se répond par son rang dans la liste écrite (mélangée à l'affichage) ;
- les variables sont substituées telles quelles dans les `eval` : toujours `(a)`, `-(a)` ;
- variables `e` et `i` interdites.

    python3 docs/wip/questions-2de/lot-evolutions-a-2de.py scripts/questions/2de-evolutions-a
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]
VARIATIONS = ('Proportionnalité', 'Pourcentages', 'Variations')
COEFFICIENT = ('Proportionnalité', 'Pourcentages', 'Coefficient')
PROPORTION = ('Proportionnalité', 'Pourcentages', 'Proportion')
PROBLEMES = ('Proportionnalité', 'Pourcentages', 'Problèmes')
LECTURE = ('Fonctions', 'Généralités', 'Lecture graphique')


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(v) for k, v in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(nom, title, description, categorie, level, variations, specs, delay=60):
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


def selon(nom, valeurs, debut=0):
    """`{{if:nom==debut|v0|{{if:nom==debut+1|v1|…}}}}` ; la dernière valeur est le « sinon »."""
    texte = valeurs[-1]
    for k in range(len(valeurs) - 2, -1, -1):
        texte = '{{if:' + nom + '==' + str(debut + k) + '|' + valeurs[k] + '|' + texte + '}}'
    return texte


EUROS = '~\\unit{€}'
PCT = '\\,\\%'

MODELES = []

# =============================================================================================
# 1. 2-365 : variation absolue V2 − V1
# =============================================================================================

ABSOLUE = variation(
    'Le prix d\'un article passe de ${{v1}}' + EUROS + '$ à ${{v2}}' + EUROS + '$.\n\n'
    'Quelle est la variation absolue de ce prix ?\n\n'
    'Variation absolue : $?' + EUROS + '$',
    [var('v1', '20..200'), var('d', '-40..40'), var('v2', 'eval:(v1)+(d)')],
    ['{{eval:(v2)-(v1)}}'],
    ['La variation absolue est la **valeur finale moins la valeur initiale** : $V_2-V_1$.',
     '$V_2-V_1={{v2}}-{{v1}}=' + col('{{d}}') + '$ : le prix '
     '{{if:d>0|augmente|baisse}} de ${{eval:abs(d)}}' + EUROS + '$.'],
    ['d != 0', 'v2 > 0'])

# Article A : petite hausse en euros, grande en pourcentage ; article B : l'inverse.
ABSOLUE_RELATIVE = variation(
    'Le prix de l\'article A passe de ${{a1}}' + EUROS + '$ à ${{a2}}' + EUROS + '$ ; celui de'
    ' l\'article B passe de ${{b1}}' + EUROS + '$ à ${{b2}}' + EUROS + '$.\n\n'
    + choix('Quel article a la plus forte hausse {{if:g==0|en euros (variation absolue)|en pourcentage}} ?',
            ['l\'article A', 'l\'article B', 'les deux ont la même hausse'], melanger=False),
    [var('a1', '20|40|50|80'), var('ta', '25|50'), var('a2', 'eval:(a1)*(1+(ta)/100)'),
     var('b1', '200|400|500'), var('tb', '5|10|20'), var('b2', 'eval:(b1)*(1+(tb)/100)'),
     var('g', '0|1')],
    ['{{if:g==0|1|0}}'],
    ['Variations absolues : $A$ : ${{a2}}-{{a1}}={{eval:(a2)-(a1)}}' + EUROS + '$ ; $B$ :'
     ' ${{b2}}-{{b1}}={{eval:(b2)-(b1)}}' + EUROS + '$.',
     'Variations relatives : $A$ : $\\dfrac{ {{eval:(a2)-(a1)}} }{ {{a1}} }={{ta}}' + PCT + '$ ; $B$ :'
     ' $\\dfrac{ {{eval:(b2)-(b1)}} }{ {{b1}} }={{tb}}' + PCT + '$.',
     '{{if:g==0|En euros, la plus forte hausse est celle de ' + col('\\text{l\'article B}')
     + '|En pourcentage, la plus forte hausse est celle de ' + col('\\text{l\'article A}') + '}} :'
     ' la variation absolue et la variation relative ne classent pas les hausses de la même façon.'],
    ['(b2)-(b1) > (a2)-(a1)', 'ta > tb'])

SP_ABS = {'v1': 120, 'd': -15, 'v2': 105}
SP_AR = {'a1': 40, 'ta': 25, 'a2': 50, 'b1': 200, 'tb': 10, 'b2': 220, 'g': 0}
SP_AR1 = dict(SP_AR, g=1)
MODELES.append(modele(
    '01-variation-absolue', 'Variation absolue d\'une grandeur',
    'Variation absolue V2 − V1 (avec son signe) ; comparer deux hausses en euros et en pourcentage',
    VARIATIONS, 12, [ABSOLUE, ABSOLUE_RELATIVE],
    [spec('120 € → 105 € : −15', 0, SP_ABS, '-15', 'correct'),
     spec('Erreur : V1 − V2 (15)', 0, SP_ABS, '15', 'incorrect'),
     spec('A 40 → 50, B 200 → 220 : en euros, B', 1, SP_AR, '1', 'correct'),
     spec('Erreur : A (confond avec le pourcentage)', 1, SP_AR, '0', 'incorrect'),
     spec('En pourcentage : A', 1, SP_AR1, '0', 'correct'),
     spec('Erreur : B', 1, SP_AR1, '1', 'incorrect')]))

# =============================================================================================
# 2. 2-368 : coefficients successifs = produit
# =============================================================================================

COEFS = '1.1|1.2|1.25|1.5|2|0.9|0.8|0.75|0.6|0.5'

PRODUIT = variation(
    'Une grandeur est multipliée par ${{eval:c1;d}}$, puis le résultat est multiplié par'
    ' ${{eval:c2;d}}$.\n\nPar quel nombre la grandeur de départ est-elle multipliée en tout ?\n\n'
    'Coefficient multiplicateur global : $?$',
    [var('c1', COEFS), var('c2', COEFS)],
    ['{{eval:(c1)*(c2);d}}'],
    ['Des évolutions successives se composent en **multipliant les coefficients multiplicateurs**.',
     '$C={{eval:c1;d}}\\times {{eval:c2;d}}=' + col('{{eval:(c1)*(c2);d}}') + '$.'],
    ['c1 != c2'])

MANQUANT = variation(
    'Une grandeur est multipliée par ${{eval:c1;d}}$, puis par un nombre $k$. Au total, elle est'
    ' multipliée par ${{eval:(c1)*(c2);d}}$.\n\nQuelle est la valeur de $k$ ?\n\n$k=?$',
    [var('c1', COEFS), var('c2', COEFS)],
    ['{{eval:c2;d}}'],
    ['Le coefficient global est le produit des coefficients : ${{eval:c1;d}}\\times k='
     '{{eval:(c1)*(c2);d}}$.',
     'Donc $k=\\dfrac{ {{eval:(c1)*(c2);d}} }{ {{eval:c1;d}} }=' + col('{{eval:c2;d}}') + '$.'],
    ['c1 != c2'])

SP_PROD = {'c1': '1.2', 'c2': '0.75'}
SP_PROD2 = {'c1': '1.25', 'c2': '0.8'}
MODELES.append(modele(
    '02-coefficients-successifs', 'Coefficients multiplicateurs successifs',
    'Le coefficient global de deux évolutions successives est le produit des coefficients ;'
    ' retrouver un coefficient manquant',
    COEFFICIENT, 4, [PRODUIT, MANQUANT],
    [spec('1,2 puis 0,75 : 0,9', 0, SP_PROD, '0.9', 'correct'),
     spec('Erreur : somme moins 1 (0,95)', 0, SP_PROD, '0.95', 'incorrect'),
     spec('Erreur : somme (1,95)', 0, SP_PROD, '1.95', 'incorrect'),
     spec('1,25 puis 0,8 : 1', 0, SP_PROD2, '1', 'correct'),
     spec('Manquant : 1,2 × k = 0,9 → 0,75', 1, SP_PROD, '0.75', 'correct'),
     spec('Erreur : différence (−0,3)', 1, SP_PROD, '-0.3', 'incorrect')]))

# =============================================================================================
# 3. 2-478 : coefficient réciproque = inverse
# =============================================================================================

RECIPROQUE = variation(
    'Une grandeur est multipliée par ${{eval:1+(t)/100;d}}$.\n\nPar quel nombre faut-il multiplier'
    ' la nouvelle valeur pour retrouver la valeur de départ ?\n\nCoefficient réciproque : $?$',
    [var('t', '25|60|100|150|20|50|-20|-25|-40|-50|-60|-75')],
    ['{{eval:100/(100+(t))}}'],
    ['Pour revenir à la valeur de départ, on multiplie par l\'**inverse** du coefficient'
     ' multiplicateur.',
     '$\\dfrac{1}{ {{eval:1+(t)/100;d}} }=\\dfrac{100}{ {{eval:100+(t)}} }='
     + col('{{eval:100/(100+(t))}}') + '$.',
     '{{if:mod(100000,100+(t))==0|En écriture décimale : ${{eval:100/(100+(t));d}}$.|Ce n\'est pas'
     ' un nombre décimal : on garde la fraction.}}'])

RECIPROQUE_VERIF = variation(
    'Une grandeur est multipliée par ${{eval:1+(t)/100;d}}$, puis le résultat est multiplié par un'
    ' nombre $k$ : on retrouve la valeur de départ.\n\nQuelle est la valeur de $k$ ?\n\n$k=?$',
    [var('t', '25|60|100|150|-20|-50|-60|-75')],
    ['{{eval:100/(100+(t))}}'],
    ['On retrouve la valeur de départ : le coefficient global vaut $1$, donc'
     ' ${{eval:1+(t)/100;d}}\\times k=1$.',
     '$k=\\dfrac{1}{ {{eval:1+(t)/100;d}} }=' + col('{{eval:100/(100+(t));d}}') + '$ : c\'est'
     ' l\'inverse du coefficient.'])

SP_REC = {'t': 25}
SP_REC6 = {'t': 20}
SP_REC2 = {'t': -75}
MODELES.append(modele(
    '03-coefficient-reciproque', 'Coefficient multiplicateur réciproque',
    'Le coefficient de l\'évolution réciproque est l\'inverse du coefficient (fraction quand ce'
    ' n\'est pas un décimal)',
    COEFFICIENT, 5, [RECIPROQUE, RECIPROQUE_VERIF],
    [spec('× 1,25 → × 0,8', 0, SP_REC, '0.8', 'correct'),
     spec('En fraction 4/5', 0, SP_REC, '\\dfrac{4}{5}', 'correct'),
     spec('Erreur : 0,75 (taux opposé)', 0, SP_REC, '0.75', 'incorrect'),
     spec('× 1,2 → × 5/6', 0, SP_REC6, '\\dfrac{5}{6}', 'correct'),
     spec('Erreur : 0,8 (taux opposé)', 0, SP_REC6, '0.8', 'incorrect'),
     spec('Erreur : arrondi 0,83', 0, SP_REC6, '0.83', 'incorrect'),
     spec('× 0,25 → k = 4', 1, SP_REC2, '4', 'correct'),
     spec('Erreur : 1,75', 1, SP_REC2, '1.75', 'incorrect')]))

# =============================================================================================
# 4. 2-364 : pourcentage de pourcentage (notion)
# =============================================================================================

# Deux contextes : g = 0 lycée, g = 1 entreprise
TOUT = selon('g', ['élèves du lycée', 'salariés de l\'entreprise'])
PARTIE = selon('g', ['sont en seconde', 'sont des cadres'])
SOUS = selon('g', ['sont demi-pensionnaires', 'travaillent à temps partiel'])
QUI = selon('g', ['élèves de seconde demi-pensionnaires', 'cadres à temps partiel'])
PARMI = selon('g', ['des élèves de seconde', 'des cadres'])

POURCENT_POURCENT = variation(
    '${{p1}}' + PCT + '$ des ' + TOUT + ' ' + PARTIE + ' ; parmi eux, ${{p2}}' + PCT + '$ ' + SOUS
    + '.\n\nQuelle proportion des ' + TOUT + ' sont des ' + QUI + ' ?\n\nProportion : $?' + PCT + '$',
    [var('g', '0|1'), var('p1', '20|25|40|50|60|80'), var('p2', '10|20|25|30|40|50|75')],
    ['{{eval:(p1)*(p2)/100;d}}'],
    ['Prendre $p_2$ d\'une partie qui représente $p_1$ du tout, c\'est prendre $p_1\\times p_2$ du'
     ' tout : les proportions se **multiplient**.',
     '$\\dfrac{ {{p1}} }{100}\\times\\dfrac{ {{p2}} }{100}={{eval:(p1)/100;d}}\\times'
     ' {{eval:(p2)/100;d}}={{eval:(p1)*(p2)/10000;d}}$, soit ' + col('{{eval:(p1)*(p2)/100;d}}' + PCT)
     + '.'])

POURCENT_INVERSE = variation(
    '${{p1}}' + PCT + '$ des ' + TOUT + ' ' + PARTIE + '. Les ' + QUI + ' représentent'
    ' ${{eval:(p1)*(p2)/100;d}}' + PCT + '$ des ' + TOUT + '.\n\nQuelle proportion ' + PARMI + ' '
    + SOUS + ' ?\n\nProportion : $?' + PCT + '$',
    [var('g', '0|1'), var('p1', '20|25|40|50|80'), var('p2', '10|20|25|30|40|50|75')],
    ['{{p2}}'],
    ['La proportion du tout est le produit : $\\dfrac{ {{p1}} }{100}\\times p='
     '\\dfrac{ {{eval:(p1)*(p2)/100;d}} }{100}$.',
     '$p=\\dfrac{ {{eval:(p1)*(p2)/100;d}} }{ {{p1}} }={{eval:(p2)/100;d}}$, soit '
     + col('{{p2}}' + PCT) + '.'])

SP_PP = {'g': 0, 'p1': 40, 'p2': 25}
SP_PP2 = {'g': 1, 'p1': 60, 'p2': 75}
MODELES.append(modele(
    '04-pourcentage-de-pourcentage', 'Pourcentage d\'un pourcentage',
    'Ensembles emboîtés : la proportion d\'une partie d\'une partie est le produit des proportions ;'
    ' retrouver une des deux proportions',
    PROPORTION, 4, [POURCENT_POURCENT, POURCENT_INVERSE],
    [spec('40 % puis 25 % : 10 %', 0, SP_PP, '10', 'correct'),
     spec('Erreur : somme (65)', 0, SP_PP, '65', 'incorrect'),
     spec('Erreur : produit sans diviser (1000)', 0, SP_PP, '1000', 'incorrect'),
     spec('60 % puis 75 % : 45 %', 0, SP_PP2, '45', 'correct'),
     spec('Inverse : 10 % sur 40 % → 25 %', 1, SP_PP, '25', 'correct'),
     spec('Erreur : différence (30)', 1, SP_PP, '30', 'incorrect')]))

# =============================================================================================
# 5. 2-376 : pourcentages de pourcentages en situation (effectifs)
# =============================================================================================

EFFECTIF_EMBOITE = variation(
    'Une ville compte ${{n}}$ habitants. ${{p1}}' + PCT + '$ d\'entre eux ont un emploi ; parmi'
    ' ceux qui ont un emploi, ${{p2}}' + PCT + '$ travaillent dans une autre ville.\n\nCombien'
    ' d\'habitants travaillent dans une autre ville ?\n\n$?$ habitants',
    [var('n', '2000|4000|5000|8000|10000|20000'), var('p1', '40|50|60|75|80'),
     var('p2', '10|20|25|30|40|60')],
    ['{{eval:(n)*(p1)*(p2)/10000}}'],
    ['Habitants qui ont un emploi : $\\dfrac{ {{p1}} }{100}\\times {{n}}={{eval:(n)*(p1)/100}}$.',
     'Parmi eux : $\\dfrac{ {{p2}} }{100}\\times {{eval:(n)*(p1)/100}}='
     + col('{{eval:(n)*(p1)*(p2)/10000}}') + '$ habitants.',
     'On peut aussi multiplier les proportions : ${{eval:(p1)/100;d}}\\times{{eval:(p2)/100;d}}='
     '{{eval:(p1)*(p2)/10000;d}}$, et ${{eval:(p1)*(p2)/10000;d}}\\times {{n}}='
     '{{eval:(n)*(p1)*(p2)/10000}}$.'],
    ['mod((n)*(p1)*(p2),10000) == 0'])

TROIS_NIVEAUX = variation(
    'Dans un lycée, ${{p1}}' + PCT + '$ des élèves sont des filles ; parmi les filles, ${{p2}}' + PCT
    + '$ sont internes ; parmi les filles internes, ${{p3}}' + PCT + '$ font du sport le mercredi.'
    '\n\nQuelle proportion des élèves du lycée sont des filles internes qui font du sport le'
    ' mercredi ?\n\nProportion : $?' + PCT + '$',
    [var('p1', '40|50|60'), var('p2', '10|20|50'), var('p3', '25|50|80')],
    ['{{eval:(p1)*(p2)*(p3)/10000;d}}'],
    ['Trois ensembles emboîtés : on multiplie les trois proportions.',
     '${{eval:(p1)/100;d}}\\times{{eval:(p2)/100;d}}\\times{{eval:(p3)/100;d}}='
     '{{eval:(p1)*(p2)*(p3)/1000000;d}}$, soit '
     + col('{{eval:(p1)*(p2)*(p3)/10000;d}}' + PCT) + '.'])

SP_EMB = {'n': 5000, 'p1': 60, 'p2': 30}
SP_TROIS = {'p1': 50, 'p2': 20, 'p3': 50}
MODELES.append(modele(
    '05-pourcentages-de-pourcentages-situation', 'Pourcentages de pourcentages : effectifs',
    'Situation à ensembles emboîtés : effectif d\'une partie d\'une partie ; trois proportions'
    ' successives',
    PROBLEMES, 2, [EFFECTIF_EMBOITE, TROIS_NIVEAUX],
    [spec('5 000, 60 %, 30 % : 900', 0, SP_EMB, '900', 'correct'),
     spec('Erreur : seulement 30 % de 5 000 (1 500)', 0, SP_EMB, '1500', 'incorrect'),
     spec('Erreur : 90 % de 5 000 (4 500)', 0, SP_EMB, '4500', 'incorrect'),
     spec('50 %, 20 %, 50 % : 5 %', 1, SP_TROIS, '5', 'correct'),
     spec('Erreur : somme (120)', 1, SP_TROIS, '120', 'incorrect')]))

# =============================================================================================
# 6. 2-375 : effectifs, proportions, pourcentages
# =============================================================================================

MULTIPLES_5 = '5|10|15|20|25|30|35|40|45|55|60|65|70|75|80|85|90|95'

VERS_POURCENT = variation(
    'Dans un club de ${{n}}$ adhérents, ${{k}}$ ont moins de $18$ ans.\n\nQuel pourcentage des'
    ' adhérents ont moins de $18$ ans ?\n\n$?' + PCT + '$',
    [var('n', '20|40|60|80|200|400|500'), var('p', MULTIPLES_5), var('k', 'eval:(n)*(p)/100')],
    ['{{p}}'],
    ['La proportion est $\\dfrac{\\text{effectif de la partie}}{\\text{effectif total}}='
     '\\dfrac{ {{k}} }{ {{n}} }={{eval:(k)/(n);d}}$.',
     'En pourcentage : ${{eval:(k)/(n);d}}=\\dfrac{ {{p}} }{100}$, soit ' + col('{{p}}' + PCT) + '.'])

VERS_EFFECTIF = variation(
    'Dans un club de ${{n}}$ adhérents, ${{p}}' + PCT + '$ ont moins de $18$ ans.\n\nCombien'
    ' d\'adhérents ont moins de $18$ ans ?\n\n$?$ adhérents',
    [var('n', '40|50|80|120|150|200|300|400|500'), var('p', '5|10|15|20|25|30|35|40|45|60|65|70|75')],
    ['{{eval:(n)*(p)/100}}'],
    ['Effectif de la partie $=$ proportion $\\times$ effectif total.',
     '$\\dfrac{ {{p}} }{100}\\times {{n}}={{eval:(p)/100;d}}\\times{{n}}='
     + col('{{eval:(n)*(p)/100}}') + '$ adhérents.'],
    ['mod((n)*(p),100) == 0'])

VERS_DECIMAL = variation(
    'Dans un club de ${{n}}$ adhérents, ${{k}}$ ont moins de $18$ ans.\n\nQuelle est la proportion'
    ' d\'adhérents de moins de $18$ ans, en écriture décimale ?\n\nProportion : $?$',
    [var('n', '20|40|60|80|200|400'), var('p', MULTIPLES_5), var('k', 'eval:(n)*(p)/100')],
    ['{{eval:(p)/100;d}}'],
    ['Proportion $=\\dfrac{\\text{effectif de la partie}}{\\text{effectif total}}=\\dfrac{ {{k}} }'
     '{ {{n}} }=' + col('{{eval:(p)/100;d}}') + '$.',
     'Soit ${{p}}' + PCT + '$.'])

SP_POUR = {'n': 80, 'p': 35, 'k': 28}
SP_EFF = {'n': 300, 'p': 35}
SP_DEC = {'n': 40, 'p': 35, 'k': 14}
MODELES.append(modele(
    '06-effectifs-proportions-pourcentages', 'Effectifs, proportions et pourcentages',
    'Passer de l\'effectif à la proportion (décimale ou en pourcentage) et de la proportion à'
    ' l\'effectif',
    PROPORTION, 5, [VERS_POURCENT, VERS_EFFECTIF, VERS_DECIMAL],
    [spec('28 sur 80 : 35 %', 0, SP_POUR, '35', 'correct'),
     spec('Erreur : 80/28 en %', 0, SP_POUR, '285.7', 'incorrect'),
     spec('Erreur : 0,35 au lieu de 35', 0, SP_POUR, '0.35', 'incorrect'),
     spec('35 % de 300 : 105', 1, SP_EFF, '105', 'correct'),
     spec('Erreur : 300 − 35', 1, SP_EFF, '265', 'incorrect'),
     spec('14 sur 40 : 0,35', 2, SP_DEC, '0.35', 'correct'),
     spec('Fraction 7/20 : écriture décimale demandée', 2, SP_DEC, '\\dfrac{7}{20}', 'bad_form', ['form']),
     spec('Erreur : 35 (pourcentage)', 2, SP_DEC, '35', 'incorrect')]))

# =============================================================================================
# 7. 2-490 : le tout connaissant une partie
# =============================================================================================

# Proportion a/b ; f = forme écrite : 0 fraction, 1 décimal, 2 pourcentage.
FORME = selon('f', ['\\dfrac{ {{a}} }{ {{b}} }', '{{eval:(a)/(b);d}}',
                    '{{eval:100*(a)/(b);d}}' + PCT])

LE_TOUT = variation(
    '${{eval:(a)*(m)}}$ adhérents d\'un club ont moins de $18$ ans, ce qui représente $' + FORME
    + '$ des adhérents.\n\nCombien le club compte-t-il d\'adhérents ?\n\n$?$ adhérents',
    [var('b', '4|5|8|10|20'), var('a', '1..9'), var('m', '2..12'), var('f', '0|1|2')],
    ['{{eval:(b)*(m)}}'],
    ['Partie $=$ proportion $\\times$ tout, donc tout $=\\dfrac{\\text{partie}}{\\text{proportion}}$.',
     'Ici la proportion vaut $\\dfrac{ {{a}} }{ {{b}} }$ : $\\dfrac{ {{eval:(a)*(m)}} }'
     '{ \\frac{ {{a}} }{ {{b}} } }={{eval:(a)*(m)}}\\times\\dfrac{ {{b}} }{ {{a}} }='
     + col('{{eval:(b)*(m)}}') + '$ adhérents.',
     'Vérification : $\\dfrac{ {{eval:(a)*(m)}} }{ {{eval:(b)*(m)}} }=\\dfrac{ {{a}} }{ {{b}} }$.'],
    ['a < b', 'gcd(a,b) == 1'])

SP_TOUT = {'b': 8, 'a': 3, 'm': 6, 'f': 0}
SP_TOUT_D = dict(SP_TOUT, f=1)
SP_TOUT_P = {'b': 20, 'a': 7, 'm': 3, 'f': 2}
MODELES.append(modele(
    '07-le-tout-connaissant-une-partie', 'Calculer le tout connaissant une partie',
    'Effectif total à partir d\'une partie et de sa proportion (fraction, décimal ou pourcentage)',
    PROPORTION, 6, [LE_TOUT],
    [spec('18 = 3/8 du club : 48', 0, SP_TOUT, '48', 'correct'),
     spec('Erreur : partie × proportion (6,75)', 0, SP_TOUT, '6.75', 'incorrect'),
     spec('Erreur : 18 + 3/8 de 18', 0, SP_TOUT, '24.75', 'incorrect'),
     spec('18 = 0,375 : 48', 0, SP_TOUT_D, '48', 'correct'),
     spec('21 = 35 % : 60', 0, SP_TOUT_P, '60', 'correct'),
     spec('Erreur : 35 % de 21', 0, SP_TOUT_P, '7.35', 'incorrect')]))

# =============================================================================================
# 8. 2-491 : images lues sur une courbe
# =============================================================================================


def courbe(x, y, lignes, description, points=None):
    """Bloc ```courbe : fenêtre, grille 1 ; 1, une ligne par fonction."""
    texte = '```courbe\nx: ' + x + '\ny: ' + y + '\ngrille: 1 ; 1\n'
    texte += ''.join(ligne + '\n' for ligne in lignes)
    if points:
        texte += 'points: ' + points + '\n'
    return texte + 'taille: moyenne\ndescription: ' + description + '\n```'


def sur_axes(x, y):
    """Projetés M'(x ; 0) et M''(0 ; y) de M, omis quand ils seraient confondus avec M."""
    return ('{{if:' + y + '==0| |, M\'({{' + x + '}} ; 0)}}'
            + '{{if:' + x + '==0| |, M\'\'(0 ; {{' + y + '}})}}')


METHODE_IMAGE = ('On part de ${{x0}}$ sur l\'axe des abscisses, on va verticalement jusqu\'à'
                 ' $\\mathcal{C}_f$ (point $M$), puis horizontalement jusqu\'à l\'axe des ordonnées :'
                 ' l\'image est l\'**ordonnée** de $M$.')
QUESTION_IMAGE = 'Détermine graphiquement l\'image de ${{x0}}$ par $f$.\n\n$f({{x0}})=?$'

# Parabole de sommet (a ; m) : f = m + c(x − a)², définie sur [a − 3 ; a + 3] ; x0 = a + u.
F_SOMMET = '{{m}}+({{c}})*(x-({{a}}))^2'
DOM_SOMMET = '[{{eval:(a)-3}} ; {{eval:(a)+3}}]'
X_SOMMET = '{{eval:min(-1,(a)-4)}} ; {{eval:max(1,(a)+4)}}'
Y_SOMMET = '{{eval:min(0,(m),(m)+4*(c))-1}} ; {{eval:max(0,(m),(m)+4*(c))+1}}'

IMAGE_SOMMET = variation(
    'La courbe $\\mathcal{C}_f$ ci-dessous représente une fonction $f$ définie sur'
    ' $\\left[{{eval:(a)-3}}\\,;{{eval:(a)+3}}\\right]$.\n\n'
    + courbe(X_SOMMET, Y_SOMMET, ['f(x) = ' + F_SOMMET + ' sur ' + DOM_SOMMET + '   bleu   nom=C_f'],
             'Parabole d\'une fonction f.')
    + '\n\n' + QUESTION_IMAGE,
    [var('a', '-2..2'), var('m', '-2..2'), var('c', '1|-1'), var('u', '-2|-1|0|1|2'),
     var('x0', 'eval:(a)+(u)'), var('y0', 'eval:(m)+(c)*(u)*(u)')],
    ['{{y0}}'],
    [METHODE_IMAGE,
     courbe(X_SOMMET, Y_SOMMET, ['f(x) = ' + F_SOMMET + ' sur ' + DOM_SOMMET + '   bleu   nom=C_f'],
            'Courbe de f et point M({{x0}} ; {{y0}}) de la courbe.',
            'M({{x0}} ; {{y0}})' + sur_axes('x0', 'y0')),
     'Le point de $\\mathcal{C}_f$ d\'abscisse ${{x0}}$ est $M({{x0}}\\,;{{y0}})$ : $f({{x0}})='
     + col('{{y0}}') + '$.'],
    ['x0 != y0'])

# Parabole f = k + c(x − p)(x − q) sur [p − 1 ; q + 1] ; x0 entier du domaine.
F_PARABOLE = '{{k}}+({{c}})*(x-({{p}}))*(x-({{q}}))'
DOM_PARABOLE = '[{{eval:(p)-1}} ; {{eval:(q)+1}}]'
X_PARABOLE = '{{eval:(p)-2}} ; {{eval:max(1,(q)+2)}}'
Y_PARABOLE = ('{{eval:floor(min(0,(k)-(c)*(d)*(d)/4,(k)+(c)*(1+(d))))-1}} ; '
              '{{eval:ceil(max(0,(k)-(c)*(d)*(d)/4,(k)+(c)*(1+(d))))+1}}')

IMAGE_PARABOLE = variation(
    'La courbe $\\mathcal{C}_f$ ci-dessous représente une fonction $f$ définie sur'
    ' $\\left[{{eval:(p)-1}}\\,;{{eval:(q)+1}}\\right]$.\n\n'
    + courbe(X_PARABOLE, Y_PARABOLE, ['f(x) = ' + F_PARABOLE + ' sur ' + DOM_PARABOLE
                                      + '   bleu   nom=C_f'],
             'Courbe en forme de parabole d\'une fonction f.')
    + '\n\n' + QUESTION_IMAGE,
    [var('p', '-4..0'), var('d', '2|4'), var('q', 'eval:(p)+(d)'), var('c', '1|-1'),
     var('k', '-2..2'), var('j', '0..6'), var('x0', 'eval:(p)-1+(j)'),
     var('y0', 'eval:(k)+(c)*((x0)-(p))*((x0)-(q))')],
    ['{{y0}}'],
    [METHODE_IMAGE,
     courbe(X_PARABOLE, Y_PARABOLE, ['f(x) = ' + F_PARABOLE + ' sur ' + DOM_PARABOLE
                                     + '   bleu   nom=C_f'],
            'Courbe de f et point M({{x0}} ; {{y0}}) de la courbe.',
            'M({{x0}} ; {{y0}})' + sur_axes('x0', 'y0')),
     'Le point de $\\mathcal{C}_f$ d\'abscisse ${{x0}}$ est $M({{x0}}\\,;{{y0}})$ : $f({{x0}})='
     + col('{{y0}}') + '$.'],
    ['x0 <= (q)+1', 'x0 != y0', 'x0 != p', 'x0 != q'])

SP_IM = {'a': 1, 'm': -1, 'c': 1, 'u': 2, 'x0': 3, 'y0': 3}
SP_IM2 = {'a': 0, 'm': 2, 'c': -1, 'u': -1, 'x0': -1, 'y0': 1}
SP_PAR = {'p': -2, 'd': 4, 'q': 2, 'c': 1, 'k': -1, 'j': 2, 'x0': -1, 'y0': -4}
MODELES.append(modele(
    '08-images-graphiques', 'Déterminer graphiquement des images',
    'Image d\'un nombre lue sur une courbe : ordonnée du point d\'abscisse donnée (pièges :'
    ' abscisse recopiée, signe)',
    LECTURE, 4, [IMAGE_SOMMET, IMAGE_PARABOLE],
    [spec('Sommet (1 ; −1), x0 = 3 : f(3) = 3', 0, SP_IM, '3', 'correct'),
     spec('Erreur : signe (−3)', 0, SP_IM, '-3', 'incorrect'),
     spec('Sommet (0 ; 2), f(−1) = 1', 0, SP_IM2, '1', 'correct'),
     spec('Erreur : abscisse recopiée (−1)', 0, SP_IM2, '-1', 'incorrect'),
     spec('f(−1) = −4', 1, SP_PAR, '-4', 'correct'),
     spec('Erreur : antécédent confondu (−1)', 1, SP_PAR, '-1', 'incorrect')]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
