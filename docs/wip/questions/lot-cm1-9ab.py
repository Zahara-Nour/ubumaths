"""Écrit les 8 modèles des lots 9a et 9b du CM1 (probabilités, proportionnalité) dans
scripts/questions/cm1-9ab/.

Phase 0 validée par David le 2026-11-19 (§ 26 et 26 bis du journal
`docs/archive/wip/questions-cm1-progress.md`) : 6 modèles de probabilités (CM1-123 à 128), sans aucun
calcul de probabilité ; 2 de proportionnalité (CM1-129, 130), une seule étape ; niveaux CM1 et CM2
pour 124 (jumeau CM2-109), CM1 seul pour les autres.

Bornes (`cycle3.json`) : 123 pas de quantification ; 124 pièce, dé, urne, cartes ; 125 le
vocabulaire du BO ; 126 sans calcul, trois ou quatre évènements ; 129 deux grandeurs en contexte ;
130 une seule utilisation de la linéarité, sans tableau ni retour à l'unité.

Patrons : `cm1-8c/` (gabarits), `cm1-4/07` (```ranger), `cm1-3c/01` (```partage),
`5-proportionnalite/04` (`plusieurs: oui`), `cm2-11a/06, 07` (proportionnalité au CM2).

Pièges (journal, doc § 9) : `i` et `e` jamais comme variables ; dans une variable, `eval:` sans
`==` (indicatrices) ; la case choix répond par l'indice d'origine ; le ranger par la position
AFFICHÉE (relevée avec `scripts/questions/ranger-attendus.ts`) ; aucun `|` dans un texte placé
dans un `{{if:}}` ; réponse attendue sans `{{if:}}` imbriqué (variable calculée).

    python3 docs/wip/questions/lot-cm1-9ab.py scripts/questions/cm1-9ab
"""
import json
import math
import os
import sys

DOSSIER = sys.argv[1]
MODELES = {}

# ---- Gabarits ----


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(enonce, variables, reponses, etapes):
    v = {'statement': enonce, 'variables': variables}
    if reponses is not None:
        v['blanks'] = [r if isinstance(r, dict) else {'expectedAnswer': r} for r in reponses]
    v['correction'] = {'steps': etapes}
    return v


def modele(title, description, niveau, variations, specs, grades=('CM1',), delay=60,
           options=None):
    m = {'title': title, 'description': description, 'grades': list(grades), 'level': niveau,
         'delay': delay, 'status': 'draft'}
    if options:
        m['options'] = options
    m['variations'] = variations
    m['testSpecs'] = specs
    return m


def ecrire(nom, mod):
    MODELES[nom] = mod


FONCTIONS = {'__builtins__': {}, 'floor': math.floor, 'mod': lambda a, b: a % b, 'abs': abs,
             'max': max, 'min': min}


def calcule(variables, tirage):
    valeurs = {}
    for v in variables:
        nom, expr = v['name'], v['expression']
        if expr.startswith('eval:') and nom not in tirage:
            x = eval(expr[5:], FONCTIONS, dict(valeurs))
            assert abs(x - round(x)) < 1e-9, (nom, x)
            valeurs[nom] = int(round(x))
        else:
            assert nom in tirage, ('tirage manquant', nom)
            valeurs[nom] = tirage[nom]
    return valeurs


def spec(desc, vi, vs, tirage, answers, status):
    valeurs = calcule(vs[vi]['variables'], tirage)
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(x) for k, x in valeurs.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def colm(x, k=0):
    return '$' + col(x, k) + '$'


def selon(k, textes, n=1):
    """`{{if:k==n|…|{{if:k==n+1|…|…}}}}` : le texte numéro m pour k == n + m."""
    if len(textes) == 1:
        return textes[0]
    return ('{{if:' + k + '==' + str(n) + '|' + textes[0] + '|' + selon(k, textes[1:], n + 1)
            + '}}')


def ind(k, m):
    """Indicatrice de k == m, en `eval:` (qui ne connaît pas `==`)."""
    return f'(1-min(abs({k}-{m}),1))'


def table(nom, k, valeurs, debut=1):
    """Variable `nom` = valeurs[k - debut], par indicatrices."""
    return var(nom, 'eval:' + '+'.join(f'{ind(k, m)}*{int(v)}'
                                       for m, v in enumerate(valeurs, debut)))


def choix(lignes, melanger=False, plusieurs=False):
    tete = ('plusieurs: oui\n' if plusieurs else '') + ('' if melanger else 'melanger: non\n')
    return '\n\n```choix\n' + tete + ''.join('- ' + c + '\n' for c in lignes) + '```'


def ranger(etiquettes):
    return '\n\n```ranger\nsigne: <\n' + ''.join('- ' + c + '\n' for c in etiquettes) + '```'


def roue(n, g):
    return f'\n\n```partage\nforme: disque {n}\ngris: {g}\n```'


OUI_NON = choix(['Oui', 'Non'])
EUR = '~\\unit{€}'


def euros_dixiemes(x):
    """Prix écrit en dizaines de centimes (`x` = 36 → 3,60 €), sans `;d` (deux décimales)."""
    return '{{eval:floor((' + x + ')/10)}}.{{eval:mod(' + x + ',10)}}0'


# ============================================================================
# 1. CM1-123 : est-ce une expérience aléatoire ?

SITUATIONS = [
    # le hasard décide (1 à 5)
    ('On lance un dé et on regarde le nombre obtenu.',
     'On ne peut pas savoir à l\'avance quelle face sera dessus : c\'est le hasard qui décide.'),
    ('On lance une pièce de monnaie et on regarde si elle tombe sur pile ou sur face.',
     'Personne ne peut dire à l\'avance si la pièce tombera sur pile ou sur face.'),
    ('On tire une boule dans un sac sans regarder et on note sa couleur.',
     'Sans regarder, on ne sait pas quelle boule on va prendre : c\'est le hasard.'),
    ('On fait tourner une roue de loterie et on regarde la case où elle s\'arrête.',
     'On ne sait pas à l\'avance où la roue va s\'arrêter.'),
    ('On tire une carte au hasard dans un jeu de cartes et on regarde si c\'est un cœur.',
     'Les cartes sont mélangées : on ne sait pas à l\'avance quelle carte on tirera.'),
    # le résultat est connu d'avance (6 à 10)
    ('On calcule $25 + 17$ et on note le résultat.',
     'Le résultat est toujours $42$ : on le connaît avant de commencer, le hasard n\'y est pour rien.'),
    ('On lâche une balle au-dessus du sol et on regarde si elle tombe.',
     'La balle tombe à chaque fois : on sait à l\'avance ce qui va se passer.'),
    ('On regarde quel jour de la semaine vient après lundi.',
     'Après lundi vient toujours mardi : aucun hasard.'),
    ('On compte les jours du mois de janvier.',
     'Janvier a toujours $31$ jours : le résultat est connu d\'avance.'),
    ('On multiplie $6$ par $7$ avec une calculatrice et on lit l\'écran.',
     'La calculatrice affiche toujours $42$ : on le sait avant d\'appuyer.'),
]

V1 = variation(
    selon('s', [t for t, _ in SITUATIONS]) + '\n\nEst-ce une expérience aléatoire ?' + OUI_NON,
    [var('s', '1..10'), var('r', 'eval:min(floor(s/6),1)')],
    ['{{r}}'],
    ['Une **expérience aléatoire**, c\'est une expérience dont on ne peut pas connaître le'
     ' résultat à l\'avance : c\'est le hasard qui décide.',
     selon('s', [e for _, e in SITUATIONS]),
     'Réponse : ' + colm('\\text{{{if:r==0|oui|non}}}') + '.'])

SERIES = [
    ['On lance un dé et on regarde le nombre obtenu.',
     'On tire un jeton dans un sac sans regarder et on note son numéro.',
     'On compte les doigts d\'une main.',
     'On calcule $10 \\times 10$.'],
    ['On lance une pièce de monnaie et on regarde la face du dessus.',
     'On fait tourner une roue de loterie et on regarde sa couleur.',
     'On lâche une pierre dans l\'eau et on regarde si elle coule.',
     'On regarde quel mois vient après mars.'],
    ['On tire une carte dans un jeu de cartes bien mélangé.',
     'On tire une boule dans une urne sans regarder et on note sa couleur.',
     'On compte les roues d\'un vélo.',
     'On calcule la moitié de $20$.'],
]

V2 = variation(
    'Dans quelles situations est-ce le hasard qui décide du résultat ?'
    + choix([selon('t', [s[j] for s in SERIES]) for j in range(4)], melanger=True,
            plusieurs=True),
    [var('t', '1..3')],
    ['0;1'],
    ['Le hasard décide quand on **ne peut pas savoir à l\'avance** le résultat.',
     'Expériences aléatoires : « ' + selon('t', [s[0] for s in SERIES]) + ' » et « '
     + selon('t', [s[1] for s in SERIES]) + ' ».',
     'Les deux autres ont un résultat connu d\'avance : ce ne sont pas des expériences'
     ' aléatoires.'])

vs = [V1, V2]
ecrire('01-est-ce-une-experience-aleatoire', modele(
    'Est-ce une expérience aléatoire ?',
    'Reconnaître une expérience aléatoire (dé, pièce, sac, roue, cartes) parmi des situations au'
    ' résultat connu d\'avance (calcul, balle lâchée, jour suivant), une ou plusieurs à cocher',
    1, vs,
    [spec('Dé : oui', 0, vs, {'s': 1}, ['0'], 'correct'),
     spec('Erreur : dé, non', 0, vs, {'s': 1}, ['1'], 'incorrect'),
     spec('Balle lâchée : non', 0, vs, {'s': 7}, ['1'], 'correct'),
     spec('Erreur : balle lâchée, oui', 0, vs, {'s': 7}, ['0'], 'incorrect'),
     spec('Série 1 : dé et jeton', 1, vs, {'t': 1}, ['0;1'], 'correct'),
     spec('Erreur : le calcul coché en plus', 1, vs, {'t': 1}, ['0;1;3'], 'incorrect'),
     spec('Un seul coché : partiel', 1, vs, {'t': 1}, ['0'], 'unoptimal_form')]))

# ============================================================================
# 2. CM1-124 (+ CM2-109) : toutes les issues possibles

SAC3 = ('Un sac contient ${{a}}$ boules rouges, ${{b}}$ boules bleues et ${{c}}$ boules'
        ' vertes. On tire une boule sans regarder et on note sa couleur.')

V1 = variation(
    selon('k', ['On lance un dé à $6$ faces numérotées de $1$ à $6$ et on note le nombre'
                ' obtenu.',
                'On lance une pièce de monnaie et on note la face du dessus.',
                SAC3], 0)
    + '\n\nCombien y a-t-il d\'issues possibles ?\n\nIl y en a $?$.',
    [var('k', '0..2'), var('a', '2..5'), var('b', '2..5'), var('c', '2..5'),
     table('n', 'k', [6, 2, 3], 0)],
    ['{{n}}'],
    ['Une **issue**, c\'est un résultat possible de l\'expérience.',
     selon('k', ['Le dé peut montrer $1$, $2$, $3$, $4$, $5$ ou $6$.',
                 'La pièce peut tomber sur pile ou sur face.',
                 'On note la couleur : la boule tirée peut être rouge, bleue ou verte. Le nombre'
                 ' de boules ne change pas les couleurs possibles.'], 0),
     'Il y a ' + colm('{{n}}') + ' issues possibles.'])

V2 = variation(
    SAC3 + '\n\nCoche toutes les issues possibles.'
    + choix(['une boule rouge', 'une boule bleue', 'une boule verte', 'une boule jaune'],
            melanger=True, plusieurs=True),
    [var('a', '2..5'), var('b', '2..5'), var('c', '2..5')],
    ['0;1;2'],
    ['Dans le sac, il n\'y a que des boules rouges, bleues et vertes.',
     'Issues possibles : ' + colm('\\text{rouge, bleue, verte}') + '. Il n\'y a pas de boule'
     ' jaune : tirer une boule jaune est impossible.'])

V3 = variation(
    'On lance un dé à $6$ faces numérotées de $1$ à $6$.\n\nCoche les nombres qu\'on peut'
    ' obtenir.'
    + choix(['${{x}}$', '${{y}}$', '$0$', '$7$', '$10$'], melanger=True, plusieurs=True),
    [var('x', '1..3'), var('y', '4..6')],
    ['0;1'],
    ['Les faces du dé portent les nombres de $1$ à $6$ : ce sont les seules issues.',
     'On peut obtenir ' + colm('{{x}}') + ' et ' + colm('{{y}}') + '. On ne peut obtenir ni'
     ' $0$, ni $7$, ni $10$.'])

vs = [V1, V2, V3]
ecrire('02-toutes-les-issues-possibles', modele(
    'Toutes les issues possibles',
    'Compter ou cocher les issues d\'un dé, d\'une pièce, d\'un sac de boules de trois'
    ' couleurs (le nombre de boules n\'est pas le nombre d\'issues)',
    1, vs,
    [spec('Dé : 6 issues', 0, vs, {'k': 0, 'a': 3, 'b': 2, 'c': 4}, ['6'], 'correct'),
     spec('Pièce : 2 issues', 0, vs, {'k': 1, 'a': 3, 'b': 2, 'c': 4}, ['2'], 'correct'),
     spec('Sac : 3 couleurs', 0, vs, {'k': 2, 'a': 3, 'b': 2, 'c': 4}, ['3'], 'correct'),
     spec('Erreur : sac, 9 (les boules comptées)', 0, vs, {'k': 2, 'a': 3, 'b': 2, 'c': 4},
          ['9'], 'incorrect'),
     spec('Rouge, bleue, verte', 1, vs, {'a': 3, 'b': 2, 'c': 4}, ['0;1;2'], 'correct'),
     spec('Erreur : jaune cochée', 1, vs, {'a': 3, 'b': 2, 'c': 4}, ['0;1;2;3'], 'incorrect'),
     spec('Verte oubliée : partiel', 1, vs, {'a': 3, 'b': 2, 'c': 4}, ['0;1'],
          'unoptimal_form'),
     spec('Dé : 2 et 5', 2, vs, {'x': 2, 'y': 5}, ['0;1'], 'correct'),
     spec('Erreur : 0 coché', 2, vs, {'x': 2, 'y': 5}, ['0;1;2'], 'incorrect')],
    grades=('CM1', 'CM2')))

# ============================================================================
# 3. CM1-125 : impossible, possible, certain ; probable, peu probable, une chance sur deux

IPC = choix(['impossible', 'possible', 'certain'])

EV_DE = [
    ('obtenir $7$', 'Aucune face ne porte $7$ : c\'est impossible.'),
    ('obtenir un nombre plus petit que $7$',
     'Toutes les faces portent un nombre plus petit que $7$ : c\'est certain.'),
    ('obtenir ${{n}}$', 'Une face porte ${{n}}$, mais le dé peut aussi tomber sur une autre :'
     ' c\'est possible, pas certain.'),
    ('obtenir $0$', 'Aucune face ne porte $0$ : c\'est impossible.'),
    ('obtenir un nombre entre $1$ et $6$',
     'Toutes les faces portent un nombre entre $1$ et $6$ : c\'est certain.'),
    ('obtenir un nombre pair', 'Trois faces portent un nombre pair ($2$, $4$, $6$), les autres'
     ' non : c\'est possible, pas certain.'),
]

V1 = variation(
    'On lance un dé à $6$ faces numérotées de $1$ à $6$.\n\n« ' + selon('k', [t for t, _ in EV_DE])
    + ' » : est-ce impossible, possible ou certain ?' + IPC,
    [var('k', '1..6'), var('n', '1..6'), table('r', 'k', [0, 2, 1, 0, 2, 1])],
    ['{{r}}'],
    ['**Impossible** : cela n\'arrive jamais. **Certain** : cela arrive à chaque fois.'
     ' **Possible** : cela peut arriver, ou pas.',
     selon('k', [e for _, e in EV_DE]),
     'Réponse : ' + colm('\\text{{{if:r==0|impossible|{{if:r==1|possible|certain}}}}}') + '.'])

V2 = variation(
    'Un sac contient ${{R}}$ boules rouges et ${{B}}$ boules bleues. On tire une boule sans'
    ' regarder.\n\nTirer une boule rouge, c\'est :'
    + choix(['probable', 'peu probable', 'une chance sur deux']),
    [var('k', '0..2'), var('x', '9..12'), var('y', '1..2'), var('z', '3..8'),
     var('R', f'eval:{ind("k", 0)}*x+{ind("k", 1)}*y+{ind("k", 2)}*z'),
     var('B', f'eval:{ind("k", 0)}*y+{ind("k", 1)}*x+{ind("k", 2)}*z')],
    ['{{k}}'],
    ['On compare le nombre de boules rouges au nombre de boules bleues.',
     selon('k', ['Il y a beaucoup plus de rouges (${{R}}$) que de bleues (${{B}}$) : on a de'
                 ' grandes chances de tirer une rouge.',
                 'Il y a beaucoup moins de rouges (${{R}}$) que de bleues (${{B}}$) : on a peu'
                 ' de chances de tirer une rouge.',
                 'Il y a autant de rouges que de bleues (${{R}}$ chacune) : rouge ou bleue, la'
                 ' même chance.'], 0),
     'Réponse : ' + colm('\\text{{{if:k==0|probable|{{if:k==1|peu probable|une chance sur'
                        ' deux}}}}}') + '.'])

EV_SAC = [
    ('tirer une boule verte', 'Il n\'y a aucune boule verte dans le sac : c\'est impossible.'),
    ('tirer une boule rouge ou une boule bleue',
     'Toutes les boules sont rouges ou bleues : c\'est certain.'),
    ('tirer une boule rouge', 'On peut tirer une rouge, mais aussi une bleue : c\'est possible,'
     ' pas certain.'),
]

V3 = variation(
    'Un sac contient ${{a}}$ boules rouges et ${{b}}$ boules bleues, et rien d\'autre. On tire'
    ' une boule sans regarder.\n\n« ' + selon('k', [t for t, _ in EV_SAC])
    + ' » : est-ce impossible, possible ou certain ?' + IPC,
    [var('k', '1..3'), var('a', '2..8'), var('b', '2..8'), table('r', 'k', [0, 2, 1])],
    ['{{r}}'],
    [selon('k', [e for _, e in EV_SAC]),
     'Réponse : ' + colm('\\text{{{if:r==0|impossible|{{if:r==1|possible|certain}}}}}') + '.'])

vs = [V1, V2, V3]
ecrire('03-impossible-possible-certain', modele(
    'Impossible, possible ou certain ?',
    'Le vocabulaire du hasard sur un dé et un sac de boules : impossible, possible, certain ;'
    ' probable, peu probable, une chance sur deux (sans calcul)',
    1, vs,
    [spec('Obtenir 7 : impossible', 0, vs, {'k': 1, 'n': 4}, ['0'], 'correct'),
     spec('Erreur : obtenir 7, possible', 0, vs, {'k': 1, 'n': 4}, ['1'], 'incorrect'),
     spec('Plus petit que 7 : certain', 0, vs, {'k': 2, 'n': 4}, ['2'], 'correct'),
     spec('Obtenir 4 : possible', 0, vs, {'k': 3, 'n': 4}, ['1'], 'correct'),
     spec('Erreur : obtenir 4, certain', 0, vs, {'k': 3, 'n': 4}, ['2'], 'incorrect'),
     spec('10 rouges, 2 bleues : probable', 1, vs, {'k': 0, 'x': 10, 'y': 2, 'z': 5}, ['0'],
          'correct'),
     spec('Erreur : 10 rouges, peu probable', 1, vs, {'k': 0, 'x': 10, 'y': 2, 'z': 5}, ['1'],
          'incorrect'),
     spec('1 rouge, 11 bleues : peu probable', 1, vs, {'k': 1, 'x': 11, 'y': 1, 'z': 5}, ['1'],
          'correct'),
     spec('5 et 5 : une chance sur deux', 1, vs, {'k': 2, 'x': 10, 'y': 2, 'z': 5}, ['2'],
          'correct'),
     spec('Verte : impossible', 2, vs, {'k': 1, 'a': 3, 'b': 5}, ['0'], 'correct'),
     spec('Rouge ou bleue : certain', 2, vs, {'k': 2, 'a': 3, 'b': 5}, ['2'], 'correct'),
     spec('Erreur : rouge ou bleue, possible', 2, vs, {'k': 2, 'a': 3, 'b': 5}, ['1'],
          'incorrect'),
     spec('Rouge : possible', 2, vs, {'k': 3, 'a': 3, 'b': 5}, ['1'], 'correct')]))

# ============================================================================
# 4. CM1-126 : du moins probable au plus probable

# p choisit la couleur la moins nombreuse : rouge (0), bleue (1), verte (2) ; puis les deux
# autres dans l'ordre circulaire. x < y < z : petit, moyen, grand.
COULEURS = ['rouge', 'bleue', 'verte']

V1 = variation(
    'Un sac contient ${{R}}$ boules rouges, ${{B}}$ boules bleues et ${{G}}$ boules vertes. On'
    ' tire une boule sans regarder.\n\nRange ces tirages du **moins probable** au **plus'
    ' probable**.'
    + ranger(['une boule ' + selon('p', [COULEURS[(q + d) % 3] for q in range(3)], 0)
              for d in range(3)]),
    [var('p', '0..2'), var('x', '1..3'), var('y', '5..7'), var('z', '10..12'),
     var('R', f'eval:{ind("p", 0)}*x+{ind("p", 2)}*y+{ind("p", 1)}*z'),
     var('B', f'eval:{ind("p", 1)}*x+{ind("p", 0)}*y+{ind("p", 2)}*z'),
     var('G', f'eval:{ind("p", 2)}*x+{ind("p", 1)}*y+{ind("p", 0)}*z')],
    None,
    ['Plus il y a de boules d\'une couleur, plus on a de chances de la tirer.',
     'On range les couleurs de la moins nombreuse (${{x}}$ boules) à la plus nombreuse'
     ' (${{z}}$ boules).',
     col('\\text{une boule ' + selon('p', COULEURS, 0) + '} < \\text{une boule '
         + selon('p', [COULEURS[(q + 1) % 3] for q in range(3)], 0) + '} < \\text{une boule '
         + selon('p', [COULEURS[(q + 2) % 3] for q in range(3)], 0) + '}')])
V1['correction']['steps'][-1] = '$$' + V1['correction']['steps'][-1] + '$$'

V2 = variation(
    'Une roue est partagée en $8$ parts égales. On la fait tourner : quand elle s\'arrête, la'
    ' flèche montre une part au hasard.' + roue(8, '{{g}}')
    + '\n\nQuelle couleur a le plus de chances d\'être montrée par la flèche ?'
    + choix(['une part coloriée', 'une part blanche', 'les deux ont autant de chances']),
    [var('g', '1..7'), table('r', 'g', [1, 1, 1, 2, 0, 0, 0])],
    ['{{r}}'],
    ['On compte les parts : ${{g}}$ coloriée{{if:g>1|s}} et ${{eval:8-g}}$ blanche{{if:g<7|s}}.',
     'Les parts sont égales : la couleur qui a le plus de parts a le plus de chances.',
     'Réponse : ' + colm('\\text{{{if:r==0|une part coloriée|{{if:r==1|une part blanche|les'
                        ' deux ont autant de chances}}}}}') + '.'])

vs = [V1, V2]
ecrire('04-du-moins-probable-au-plus-probable', modele(
    'Du moins probable au plus probable',
    'Ranger trois tirages d\'un sac selon le nombre de boules de chaque couleur ; dire quelle'
    ' couleur d\'une roue a le plus de chances (sans calcul)',
    2, vs,
    # Ranger : réponses = positions AFFICHÉES, relevées avec ranger-attendus.ts : ['2', '0', '1']
    # pour les deux tirages ; ordre inverse = ['1', '0', '2'].
    [spec('Rouge < bleue < verte', 0, vs, {'p': 0, 'x': 2, 'y': 6, 'z': 11},
          ['2', '0', '1'], 'correct'),
     spec('Erreur : ordre inverse', 0, vs, {'p': 0, 'x': 2, 'y': 6, 'z': 11},
          ['1', '0', '2'], 'incorrect'),
     spec('Bleue < verte < rouge', 0, vs, {'p': 1, 'x': 1, 'y': 5, 'z': 12},
          ['2', '0', '1'], 'correct'),
     spec('3 parts coloriées : la blanche', 1, vs, {'g': 3}, ['1'], 'correct'),
     spec('Erreur : 3 parts, la coloriée', 1, vs, {'g': 3}, ['0'], 'incorrect'),
     spec('6 parts coloriées : la coloriée', 1, vs, {'g': 6}, ['0'], 'correct'),
     spec('4 parts : autant', 1, vs, {'g': 4}, ['2'], 'correct')],
    delay=60))

# ============================================================================
# 5. CM1-127 : deux issues, mais pas une chance sur deux

CHANCE = choix(['Oui, une chance sur deux', 'Non, moins d\'une chance sur deux',
                'Non, plus d\'une chance sur deux'])

# s = signe de 2g − N (ou de R − B) ; réponse f(s) = (3s² + s) / 2 : −1 → 1, 0 → 0, 1 → 2.
V1 = variation(
    'Une roue est partagée en ${{N}}$ parts égales. On la fait tourner : la flèche montre une'
    ' part coloriée ou une part blanche. Il y a donc deux issues.' + roue('{{N}}', '{{g}}')
    + '\n\nA-t-on une chance sur deux que la flèche montre une part coloriée ?' + CHANCE,
    [var('N', '4|6|8'), var('g', '1..{{eval:N-1}}'), var('s', 'eval:max(min(2*g-N,1),-1)'),
     var('r', 'eval:(3*s*s+s)/2')],
    ['{{r}}'],
    ['Deux issues, ce n\'est pas forcément une chance sur deux : il faut regarder combien de'
     ' parts a chaque couleur.',
     '${{g}}$ part{{if:g>1|s}} coloriée{{if:g>1|s}}, ${{eval:N-g}}$ blanche{{if:N-g>1|s}}.'
     + selon('s', [' Moins de parts coloriées que de blanches.', ' Autant de chaque couleur.',
                   ' Plus de parts coloriées que de blanches.'], -1),
     'Réponse : ' + colm('\\text{{{if:r==0|oui, une chance sur deux|{{if:r==1|non, moins'
                        ' d\'une chance sur deux|non, plus d\'une chance sur deux}}}}}') + '.'])

V2 = variation(
    'Un sac contient ${{R}}$ boule{{if:R>1|s}} rouge{{if:R>1|s}} et ${{B}}$ boule{{if:B>1|s}}'
    ' bleue{{if:B>1|s}}. On tire une boule sans regarder : elle est rouge ou bleue, il y a deux'
    ' issues.\n\nA-t-on une chance sur deux de tirer une boule rouge ?' + CHANCE,
    [var('R', '1..6'), var('B', '1..6'), var('s', 'eval:max(min(R-B,1),-1)'),
     var('r', 'eval:(3*s*s+s)/2')],
    ['{{r}}'],
    ['Deux issues, ce n\'est pas forcément une chance sur deux : il faut comparer le nombre'
     ' de boules de chaque couleur.',
     selon('s', ['Il y a moins de rouges (${{R}}$) que de bleues (${{B}}$).',
                 'Il y a autant de rouges que de bleues.',
                 'Il y a plus de rouges (${{R}}$) que de bleues (${{B}}$).'], -1),
     'Réponse : ' + colm('\\text{{{if:r==0|oui, une chance sur deux|{{if:r==1|non, moins'
                        ' d\'une chance sur deux|non, plus d\'une chance sur deux}}}}}') + '.'])

vs = [V1, V2]
ecrire('05-deux-issues-pas-forcement-une-chance-sur-deux', modele(
    'Deux issues, pas forcément une chance sur deux',
    'Une roue à parts coloriées ou un sac de deux couleurs : deux issues, mais une chance sur'
    ' deux seulement si les deux couleurs sont aussi nombreuses',
    2, vs,
    [spec('1 part sur 4 : moins', 0, vs, {'N': 4, 'g': 1}, ['1'], 'correct'),
     spec('Erreur : 1 part sur 4, une chance sur deux', 0, vs, {'N': 4, 'g': 1}, ['0'],
          'incorrect'),
     spec('3 parts sur 6 : une chance sur deux', 0, vs, {'N': 6, 'g': 3}, ['0'], 'correct'),
     spec('6 parts sur 8 : plus', 0, vs, {'N': 8, 'g': 6}, ['2'], 'correct'),
     spec('1 rouge, 3 bleues : moins', 1, vs, {'R': 1, 'B': 3}, ['1'], 'correct'),
     spec('Erreur : 1 rouge, 3 bleues, une chance sur deux', 1, vs, {'R': 1, 'B': 3}, ['0'],
          'incorrect'),
     spec('4 et 4 : une chance sur deux', 1, vs, {'R': 4, 'B': 4}, ['0'], 'correct'),
     spec('5 rouges, 2 bleues : plus', 1, vs, {'R': 5, 'B': 2}, ['2'], 'correct')]))

# ============================================================================
# 6. CM1-128 : chaque issue a-t-elle autant de chances ?

EQUI = [
    # autant de chances (1 à 4)
    ('On lance un dé ordinaire à $6$ faces. Chaque nombre de $1$ à $6$ est une issue.',
     'Les six faces sont pareilles : chaque nombre a la même chance.'),
    ('On lance une pièce de monnaie : pile ou face.',
     'La pièce a deux faces pareilles : pile et face ont la même chance.'),
    ('Un sac contient $4$ boules rouges et $4$ boules bleues. On tire une boule : rouge ou'
     ' bleue.', 'Il y a autant de rouges que de bleues : même chance.'),
    ('Un jeu de cartes contient autant de cartes de chaque couleur : pique, cœur, carreau,'
     ' trèfle. On tire une carte et on regarde sa couleur.',
     'Chaque couleur a autant de cartes : même chance.'),
    # pas autant (5 à 8)
    ('Un sac contient $6$ boules rouges et $2$ boules bleues. On tire une boule : rouge ou'
     ' bleue.', 'Il y a plus de rouges que de bleues : la rouge a plus de chances.'),
    ('Un dé a six faces qui portent $1$, $2$, $3$, $4$, $6$ et $6$. On le lance et on regarde'
     ' le nombre obtenu.', 'Le $6$ est sur deux faces, les autres nombres sur une seule : le'
     ' $6$ a plus de chances.'),
    ('Un sachet contient $9$ bonbons à la fraise et $1$ bonbon au citron. On en prend un sans'
     ' regarder : fraise ou citron.',
     'Il y a beaucoup plus de bonbons à la fraise : la fraise a plus de chances.'),
    ('Une roue est partagée en $4$ parts égales : $3$ bleues et $1$ jaune. On la fait'
     ' tourner : bleu ou jaune.', 'Le bleu occupe trois parts, le jaune une seule : le bleu a'
     ' plus de chances.'),
]

V1 = variation(
    selon('s', [t for t, _ in EQUI])
    + '\n\nLes issues ont-elles toutes autant de chances de se réaliser ?' + OUI_NON,
    [var('s', '1..8'), var('r', 'eval:min(floor(s/5),1)')],
    ['{{r}}'],
    ['Les issues ont **autant de chances** quand aucune n\'est favorisée.',
     selon('s', [e for _, e in EQUI]),
     'Réponse : ' + colm('\\text{{{if:r==0|oui|non}}}') + '.'])

V2 = variation(
    'Une roue est partagée en ${{N}}$ parts égales. On la fait tourner : la flèche montre une'
    ' part coloriée ou une part blanche.' + roue('{{N}}', '{{g}}')
    + '\n\nPart coloriée ou part blanche : ont-elles autant de chances ?' + OUI_NON,
    [var('N', '4|6|8'), var('g', '1..{{eval:N-1}}'), var('r', 'eval:min(abs(2*g-N),1)')],
    ['{{r}}'],
    ['On compte les parts de chaque couleur : ${{g}}$ coloriée{{if:g>1|s}}, ${{eval:N-g}}$'
     ' blanche{{if:N-g>1|s}}.',
     'Autant de chances seulement s\'il y a autant de parts de chaque couleur.',
     'Réponse : ' + colm('\\text{{{if:r==0|oui|non}}}') + '.'])

vs = [V1, V2]
ecrire('06-chaque-issue-a-t-elle-autant-de-chances', modele(
    'Chaque issue a-t-elle autant de chances ?',
    'Reconnaître une situation d\'équiprobabilité : dé ordinaire, pièce, sac de deux couleurs'
    ' en nombres égaux, roue moitié coloriée ; dé truqué, sac déséquilibré',
    1, vs,
    [spec('Dé ordinaire : oui', 0, vs, {'s': 1}, ['0'], 'correct'),
     spec('Erreur : dé ordinaire, non', 0, vs, {'s': 1}, ['1'], 'incorrect'),
     spec('Dé à deux 6 : non', 0, vs, {'s': 6}, ['1'], 'correct'),
     spec('Erreur : dé à deux 6, oui', 0, vs, {'s': 6}, ['0'], 'incorrect'),
     spec('4 parts sur 8 : oui', 1, vs, {'N': 8, 'g': 4}, ['0'], 'correct'),
     spec('1 part sur 4 : non', 1, vs, {'N': 4, 'g': 1}, ['1'], 'correct'),
     spec('Erreur : 1 part sur 4, oui', 1, vs, {'N': 4, 'g': 1}, ['0'], 'incorrect')]))

# ============================================================================
# 7. CM1-129 : est-ce une situation de proportionnalité ?

PROP = [
    # proportionnel (1 à 4)
    ('Des cahiers identiques sont vendus au même prix chacun. Le prix à payer est-il'
     ' proportionnel au nombre de cahiers achetés ?',
     'Deux fois plus de cahiers coûtent deux fois plus cher, trois fois plus, trois fois plus'
     ' cher : oui.'),
    ('Des manuels sont tous identiques. La masse d\'une pile de ces manuels est-elle'
     ' proportionnelle au nombre de manuels ?',
     'Chaque manuel ajoute la même masse : deux fois plus de manuels pèsent deux fois plus.'),
    ('Pour une pâte à crêpes, on met toujours $250~\\unit{g}$ de farine pour $2$ œufs. La'
     ' masse de farine est-elle proportionnelle au nombre d\'œufs ?',
     'Avec deux fois plus d\'œufs, on met deux fois plus de farine : oui.'),
    ('Au marché, les pommes coûtent $3~\\unit{€}$ le kilogramme. Le prix payé est-il'
     ' proportionnel à la masse de pommes ?',
     'Chaque kilogramme coûte le même prix : deux fois plus de pommes coûtent deux fois plus.'),
    # pas proportionnel (5 à 8)
    ('La taille d\'un enfant est-elle proportionnelle à son âge ?',
     'Un enfant de $10$ ans n\'est pas deux fois plus grand qu\'un enfant de $5$ ans : non.'),
    ('Un taxi fait payer $4~\\unit{€}$ dès qu\'on monte, puis $2~\\unit{€}$ par kilomètre. Le'
     ' prix de la course est-il proportionnel au nombre de kilomètres ?',
     '$1~\\unit{km}$ coûte $6~\\unit{€}$, $2~\\unit{km}$ coûtent $8~\\unit{€}$ et pas'
     ' $12~\\unit{€}$ : les $4~\\unit{€}$ du départ ne doublent pas. Non.'),
    ('Un magasin vend un stylo $1~\\unit{€}$, et le lot de $10$ stylos $7~\\unit{€}$. Le prix'
     ' payé est-il proportionnel au nombre de stylos ?',
     '$10$ stylos devraient coûter $10~\\unit{€}$ ; le lot coûte moins : non.'),
    ('Un forfait de téléphone coûte $15~\\unit{€}$ par mois, quel que soit le nombre d\'appels.'
     ' Le prix payé est-il proportionnel au nombre d\'appels ?',
     'On paie toujours $15~\\unit{€}$, même en appelant deux fois plus : non.'),
]

V1 = variation(
    selon('s', [t for t, _ in PROP]) + OUI_NON,
    [var('s', '1..8'), var('r', 'eval:min(floor(s/5),1)')],
    ['{{r}}'],
    ['Deux grandeurs sont **proportionnelles** quand, si l\'une devient deux fois, trois fois'
     '… plus grande, l\'autre aussi.',
     selon('s', [e for _, e in PROP]),
     'Réponse : ' + colm('\\text{{{if:r==0|oui|non}}}') + '.'])

V2 = variation(
    'À la papeterie, ${{n}}$ cahiers identiques coûtent ${{A}}' + EUR + '$ et ${{M}}$ cahiers'
    ' coûtent ${{P}}' + EUR + '$.\n\nLe prix est-il proportionnel au nombre de'
    ' cahiers ?' + OUI_NON,
    [var('n', '2..4'), var('m', '2..3'), var('u', '2..4'), var('o', '0..1'), var('d', '1..2'),
     var('A', 'eval:n*u'), var('M', 'eval:m*n'), var('P', 'eval:m*n*u-o*d')],
    ['{{o}}'],
    ['${{M}}$ cahiers, c\'est ${{m}}$ fois ${{n}}$ cahiers. Si le prix était proportionnel, on'
     ' paierait ${{m}}$ fois plus : ${{m}} \\times {{A}} = {{eval:m*A}}$.',
     'On paie ${{P}}' + EUR + '$'
     + '{{if:o==0| : c\'est bien ${{m}}$ fois plus.| et non ${{eval:m*A}}' + EUR + '$.}}',
     'Réponse : ' + colm('\\text{{{if:o==0|oui|non}}}') + '.'])

vs = [V1, V2]
ecrire('07-proportionnel-ou-pas', modele(
    'Proportionnel ou pas ?',
    'Deux grandeurs en contexte : prix d\'objets identiques, pile de manuels, recette, prix au'
    ' kilo (oui) ; taille et âge, taxi, lot, forfait (non) ; deux achats chiffrés à comparer',
    1, vs,
    [spec('Cahiers : oui', 0, vs, {'s': 1}, ['0'], 'correct'),
     spec('Erreur : cahiers, non', 0, vs, {'s': 1}, ['1'], 'incorrect'),
     spec('Taxi : non', 0, vs, {'s': 6}, ['1'], 'correct'),
     spec('Erreur : taxi, oui (le prix augmente)', 0, vs, {'s': 6}, ['0'], 'incorrect'),
     spec('3 cahiers 6 €, 6 cahiers 12 € : oui', 1, vs, {'n': 3, 'm': 2, 'u': 2, 'o': 0, 'd': 1},
          ['0'], 'correct'),
     spec('3 cahiers 6 €, 6 cahiers 11 € : non', 1, vs, {'n': 3, 'm': 2, 'u': 2, 'o': 1, 'd': 1},
          ['1'], 'correct'),
     spec('Erreur : 11 €, oui (le prix augmente)', 1, vs,
          {'n': 3, 'm': 2, 'u': 2, 'o': 1, 'd': 1}, ['0'], 'incorrect')]))

# ============================================================================
# 8. CM1-130 : résoudre un problème de proportionnalité (une étape)

PB = [
    ('${{n}}$ manuels identiques pèsent ${{w}}~\\unit{kg}$.\n\nCombien pèsent ${{K}}$ de ces'
     ' manuels ?\n\nIls pèsent $?~\\text{kg}$.', 'manuels', 'kg'),
    ('Pour ${{n}}$ personnes, une recette demande ${{w}}$ œufs.\n\nCombien d\'œufs faut-il pour'
     ' ${{K}}$ personnes ?\n\nIl faut $?$ œufs.', 'personnes', 'œufs'),
    ('Une imprimante imprime ${{w}}$ pages en ${{n}}$ minutes, toujours à la même vitesse.'
     '\n\nCombien de pages imprime-t-elle en ${{K}}$ minutes ?\n\nElle imprime $?$ pages.',
     'minutes', 'pages'),
]

V1 = variation(
    selon('c', [t for t, _, _ in PB]),
    [var('c', '1..3'), var('n', '2..6'), var('w', '2..9'), var('k', '2|3|4|5|10'),
     var('K', 'eval:k*n')],
    ['{{eval:k*w}}'],
    ['${{K}}$ ' + selon('c', [a for _, a, _ in PB]) + ', c\'est ${{k}}$ fois ${{n}}$ '
     + selon('c', [a for _, a, _ in PB]) + ' : ${{n}} \\times {{k}} = {{K}}$.',
     'C\'est ${{k}}$ fois plus, donc ${{k}}$ fois plus de ' + selon('c', [b for _, _, b in PB])
     + ' : $$' + col('{{k}} \\times {{w}} = {{eval:k*w}}') + '$$'])

V2 = variation(
    'À la boulangerie, ${{n}}$ croissants coûtent $' + euros_dixiemes('P') + EUR
    + '$.\n\nCombien coûtent ${{K}}$ croissants ?\n\nIls coûtent $?~\\text{€}$.',
    [var('n', '2..4'), var('u', '11..19'), var('P', 'eval:n*u'), var('k', '2|3|4|5'),
     var('K', 'eval:k*n')],
    ['{{eval:k*P/10;d}}'],
    ['${{K}}$ croissants, c\'est ${{k}}$ fois ${{n}}$ croissants : ${{n}} \\times {{k}} ='
     ' {{K}}$.',
     'Ils coûtent ${{k}}$ fois plus : $$' + col('{{k}} \\times ' + euros_dixiemes('P') + ' = '
                                                 + euros_dixiemes('k*P')) + '$$',
     'Ils coûtent $' + euros_dixiemes('k*P') + EUR + '$.'])

V3 = variation(
    '${{K}}$ stylos identiques coûtent ${{W}}' + EUR + '$.\n\nCombien coûtent ${{n}}$ de ces'
    ' stylos ?\n\nIls coûtent $?~\\text{€}$.',
    [var('n', '2..5'), var('w', '2..9'), var('k', '2|3|4|5'), var('K', 'eval:k*n'),
     var('W', 'eval:k*w')],
    ['{{w}}'],
    ['${{n}}$ stylos, c\'est ${{k}}$ fois moins que ${{K}}$ stylos : ${{K}} \\div {{k}} ='
     ' {{n}}$.',
     'Ils coûtent ${{k}}$ fois moins : $$' + col('{{W}} \\div {{k}} = {{w}}') + '$$'])

vs = [V1, V2, V3]
ecrire('08-resoudre-un-probleme-de-proportionnalite', modele(
    'Résoudre un problème de proportionnalité',
    'Une seule étape : k fois plus (masses, œufs, pages ; prix décimal) ou k fois moins, avec'
    ' k de 2 à 5 ou 10 ; sans tableau ni retour à l\'unité',
    1, vs,
    [spec('3 manuels 4 kg → 12 manuels : 16', 0, vs, {'c': 1, 'n': 3, 'w': 4, 'k': 4}, ['16'],
          'correct'),
     spec('Erreur : additif, 4 + 9 = 13', 0, vs, {'c': 1, 'n': 3, 'w': 4, 'k': 4}, ['13'],
          'incorrect'),
     spec('Erreur : 4 × 12 = 48 (multiplié par le nombre de manuels)', 0, vs,
          {'c': 1, 'n': 3, 'w': 4, 'k': 4}, ['48'], 'incorrect'),
     spec('Œufs : 2 personnes 3 œufs → 20 personnes : 30', 0, vs,
          {'c': 2, 'n': 2, 'w': 3, 'k': 10}, ['30'], 'correct'),
     spec('3 croissants 3,60 € → 9 croissants : 10,80', 1, vs, {'n': 3, 'u': 12, 'k': 3},
          ['10,80'], 'correct'),
     spec('10,8 accepté', 1, vs, {'n': 3, 'u': 12, 'k': 3}, ['10,8'], 'correct'),
     spec('Erreur : 3,60 × 9 = 32,40', 1, vs, {'n': 3, 'u': 12, 'k': 3}, ['32,40'],
          'incorrect'),
     spec('12 stylos 15 € → 4 stylos : 5', 2, vs, {'n': 4, 'w': 5, 'k': 3}, ['5'], 'correct'),
     spec('Erreur : 15 − 8 = 7 (additif)', 2, vs, {'n': 4, 'w': 5, 'k': 3}, ['7'],
          'incorrect')],
    delay=90, options={'constraints': {'spacesFromFourDigits': True, 'zeros': 'off'}}))

# ============================================================================

os.makedirs(DOSSIER, exist_ok=True)
for nom, mod in MODELES.items():
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(mod, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
