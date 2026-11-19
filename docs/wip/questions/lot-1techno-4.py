"""Écrit les modèles du lot 4 « algorithmique » de la 1re techno dans scripts/questions/1techno-4/.

Phase 0 validée par David le 2026-11-18 (journal docs/archive/wip/questions-1techno-progress.md, § 26).
Huit modèles en Python ; aucun jumeau en 1re générale (accord de questions-1gen) :

- M1 simuler une loi de Bernoulli avec random() → 1TECHNO-003 ;
- M2 simuler un échantillon de taille n → 1TECHNO-103 + 1SPE-362 (modèle commun, grades 1_TECHNO et 1_SPE ;
  jumeau Bernoulli de 5192e88a, qui n'est pas touché) ;
- M3 N échantillons et histogramme des fréquences → 1TECHNO-101 ;
- M4 compter les fréquences dans [p − ks ; p + ks] → 1TECHNO-105 ;
- M5 accumulateur pour un produit → 1TECHNO-107 (jumeau de ff3a3a15, sans le mot « factorielle ») ;
- M6 liste des premiers termes d'une suite → 1TECHNO-051 ;
- M7 rang à partir duquel une suite dépasse l'autre → 1TECHNO-122 ;
- M8 valeur approchée d'une solution par balayage → 1TECHNO-067 (jumeau de 66cd841d sur x² + x = k).

Bornes 1re techno : Python, seule collection la liste ; suites notées u(n), géométriques à termes strictement
positifs ; fonctions polynômes de degré ≤ 3 ; aucun formalisme sur les variables aléatoires.
Un point par programme (ADR 0020) ; nœud et tags viendront par migration.

    python3 docs/wip/questions/lot-1techno-4.py scripts/questions/1techno-4
"""
import json
import os
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, answers, status, variables=None):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in (variables or {}).items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def modele(title, point, description, level, variations, specs, grades=None):
    return {'title': title, 'description': description,
            'grades': grades or ['1_TECHNO'], 'level': level, 'delay': 90, 'status': 'draft',
            'shared': {'blankDefaults': {'acceptDecimal': True}},
            'variations': variations, 'testSpecs': specs, '_point': point}


def variation(statement, blanks, variables, steps, conditions=None):
    v = {'statement': statement, 'blanks': blanks, 'variables': variables,
         'correction': {'steps': steps}}
    if conditions:
        v['conditions'] = conditions
    return v


def choix(enonce, bonne, autres, steps, variables=None, conditions=None):
    """Case choix mélangée : la bonne réponse est écrite en premier (index 0)."""
    bloc = '\n\n```choix\n' + ''.join('- ' + l + '\n' for l in [bonne] + autres) + '```'
    return variation(enonce + bloc, [{'expectedAnswer': '0'}], variables or [], steps, conditions)


def case(attendue, **options):
    return {'expectedAnswer': attendue, **options}


def py(code):
    return '```python\n' + code + '\n```'


def couleur(x):
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


def indic_inf(x, seuil):
    """1 si x < seuil, 0 sinon (entiers, x ≠ seuil) : eval ne connaît pas les comparaisons."""
    return f'min(max({seuil}-{x},0),1)'


def indic_dans(x, lo, hi):
    """1 si lo < x < hi, 0 sinon (entiers, x ni égal à lo ni à hi)."""
    return f'min(max({x}-({lo}),0),1)*min(max(({hi})-{x},0),1)'


MODELES = []

# ---------------------------------------------------------------------------------------------
# M1 — simuler une loi de Bernoulli avec random() : 1TECHNO-003
# ---------------------------------------------------------------------------------------------

RANDOM = 'La fonction `random()` renvoie un nombre aléatoire de l\'intervalle $[0\\,;1[$.'
EPREUVE = py('from random import random\n\ndef epreuve():\n    if random() {{op}} 0.{{pt}}:\n'
             '        return 1\n    else:\n        return 0')
EPREUVE_INF = EPREUVE.replace('{{op}}', '<')
EPREUVE_SUP = EPREUVE.replace('{{op}}', '>')

MODELES.append(('M1-simuler-une-loi-de-bernoulli', modele(
    'Simuler une loi de Bernoulli avec random()', '1TECHNO-003',
    'random() < p renvoie 1 avec la probabilité p ; random() > p : 1 − p ; choisir la bonne fonction ;'
    ' valeur renvoyée pour un tirage donné', 1,
    [variation(RANDOM + ' On considère la fonction Python suivante.\n\n' + EPREUVE_INF
               + '\n\nAvec quelle probabilité `epreuve()` renvoie-t-elle $1$ ?\n\n$?$',
               [case('{{eval:pt/10;d}}')], [var('pt', '1..9')],
               ['`random()` est inférieur à $0{,}{{pt}}$ avec une probabilité égale à la longueur de'
                ' $[0\\,;0{,}{{pt}}[$, soit $0{,}{{pt}}$.',
                '`epreuve()` renvoie $1$ avec la probabilité $' + couleur('0{,}{{pt}}') + '$ : elle simule'
                ' une loi de Bernoulli de paramètre $0{,}{{pt}}$.']),
     variation(RANDOM + ' On considère la fonction Python suivante.\n\n' + EPREUVE_SUP
               + '\n\nAvec quelle probabilité `epreuve()` renvoie-t-elle $1$ ?\n\n$?$',
               [case('{{eval:(10-pt)/10;d}}')], [var('pt', '1..9')],
               ['Attention au sens : `epreuve()` renvoie $1$ quand `random()` est **supérieur** à'
                ' $0{,}{{pt}}$, c\'est-à-dire dans $]0{,}{{pt}}\\,;1[$.',
                'Cet intervalle a pour longueur $1-0{,}{{pt}}=0{,}{{eval:10-pt}}$ : `epreuve()` renvoie'
                ' $1$ avec la probabilité $' + couleur('0{,}{{eval:10-pt}}') + '$.']),
     choix(RANDOM + ' Chaque fonction ci-dessous renvoie $0$ ou $1$. Laquelle simule une loi de Bernoulli'
           ' de paramètre $0{,}{{pt}}$ ?',
           'elle renvoie $1$ si `random() < 0.{{pt}}`, et $0$ sinon',
           ['elle renvoie $1$ si `random() < 0.{{eval:10-pt}}`, et $0$ sinon',
            'elle renvoie $1$ si `random() == 0.{{pt}}`, et $0$ sinon',
            'elle renvoie `randint(0, 1)`, c\'est-à-dire $0$ ou $1$ au hasard'],
           ['Une loi de Bernoulli de paramètre $0{,}{{pt}}$ donne $1$ avec la probabilité $0{,}{{pt}}$.',
            '`random() < 0.{{pt}}` est vrai avec la probabilité $0{,}{{pt}}$ : c\'est la bonne fonction.'
            ' `random() == 0.{{pt}}` n\'est presque jamais vrai, et `randint(0, 1)` donne $1$ une fois sur'
            ' deux (paramètre $0{,}5$).'],
           [var('pt', '1..9')], ['pt != 5']),
     variation(RANDOM + ' On considère la fonction Python suivante.\n\n' + EPREUVE_INF
               + '\n\nLors d\'un appel, `random()` a renvoyé $0{,}{{r}}$. Que renvoie `epreuve()` ?\n\n$?$',
               [case('{{eval:' + indic_inf('r', '10*pt') + '}}')],
               [var('pt', '1..9'), var('r', '11..99')],
               ['On compare : $0{,}{{r}}{{if:r<10*pt|<|\\geqslant}}0{,}{{pt}}$.',
                'La condition `random() < 0.{{pt}}` est {{if:r<10*pt|vraie|fausse}} : `epreuve()` renvoie'
                ' $' + couleur('{{eval:' + indic_inf('r', '10*pt') + '}}') + '$.'],
               ['mod(r,10) != 0'])],
    [spec('p = 0,3 : 0,3', 0, '0.3', 'correct', {'pt': 3}),
     spec('Erreur : 1 − p', 0, '0.7', 'incorrect', {'pt': 3}),
     spec('random() > 0,3 : 0,7', 1, '0.7', 'correct', {'pt': 3}),
     spec('Erreur : lire 0,3', 1, '0.3', 'incorrect', {'pt': 3}),
     spec('Bonne fonction', 2, '0', 'correct', {'pt': 3}),
     spec('Erreur : random() == p', 2, '2', 'incorrect', {'pt': 3}),
     spec('0,27 < 0,3 : 1', 3, '1', 'correct', {'pt': 3, 'r': 27}),
     spec('Erreur : 0 au lieu de 1', 3, '0', 'incorrect', {'pt': 3, 'r': 27}),
     spec('0,42 > 0,3 : 0', 3, '0', 'correct', {'pt': 3, 'r': 42})])))

# ---------------------------------------------------------------------------------------------
# M2 — simuler un échantillon de taille n : 1TECHNO-103 + 1SPE-362
# ---------------------------------------------------------------------------------------------

ECHANTILLON = ('from random import random\n\ndef echantillon(n, p):\n    c = 0\n    for k in range(n):\n'
               '        if random() < p:\n            c = c + 1\n    return c')
RS = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6']
NB_UNS = 'eval:' + '+'.join(indic_inf(r, '10*pt') for r in RS)
TIRAGES = ('| `random()` | ' + ' | '.join('$0{,}{{' + r + '}}$' for r in RS) + ' |\n| --- |'
           + ' --- |' * 6 + '\n| Issue | ' + ' | '.join('${{eval:' + indic_inf(r, '10*pt') + '}}$' for r in RS)
           + ' |')

MODELES.append(('M2-simuler-un-echantillon-de-bernoulli', modele(
    'Simuler un échantillon d\'une loi de Bernoulli', '1TECHNO-103',
    'Fonction Python qui compte les 1 de n épreuves de Bernoulli : valeur renvoyée pour six tirages donnés,'
    ' renvoyer la fréquence, sens d\'un appel', 2,
    [variation(RANDOM + ' On considère la fonction Python suivante.\n\n' + py(ECHANTILLON)
               + '\n\nOn appelle `echantillon(6, 0.{{pt}})`. Les six appels à `random()` renvoient, dans'
               ' l\'ordre : ' + ' ; '.join('$0{,}{{' + r + '}}$' for r in RS)
               + '.\n\nQue renvoie la fonction ?\n\n$?$',
               [case('{{nb}}')],
               [var('pt', '2..8')] + [var(r, '11..99') for r in RS] + [var('nb', NB_UNS)],
               ['À chaque tour, `c` augmente de $1$ quand `random()` renvoie un nombre inférieur à'
                ' $0{,}{{pt}}$ (issue $1$) :\n\n' + TIRAGES,
                'La fonction renvoie le nombre de $1$ de l\'échantillon : $' + couleur('{{nb}}') + '$.'],
               ['mod(' + r + ',10) != 0' for r in RS] + ['nb >= 1', 'nb <= 5']),
     choix(RANDOM + ' On considère la fonction Python suivante.\n\n' + py(ECHANTILLON)
           + '\n\nOn veut qu\'elle renvoie la **fréquence** des $1$ dans l\'échantillon, et non leur nombre.'
           ' Par quelle instruction faut-il remplacer `return c` ?',
           '`return c / n`', ['`return c`', '`return n / c`', '`return c / p`'],
           ['À la fin de la boucle, `c` est le nombre de $1$ parmi les `n` épreuves.',
            'La fréquence des $1$ est ce nombre divisé par l\'effectif `n` : `return c / n`.']),
     choix(RANDOM + ' On considère la fonction Python suivante.\n\n' + py(ECHANTILLON)
           + '\n\nOn appelle `echantillon(100, 0.{{pt}})`. Que renvoie cet appel ?',
           'le nombre de $1$ dans un échantillon de taille $100$, qui change d\'un appel à l\'autre',
           ['toujours ${{eval:10*pt}}$', 'la fréquence des $1$ dans l\'échantillon',
            'la probabilité d\'obtenir $1$'],
           ['La fonction simule $100$ épreuves de Bernoulli de paramètre $0{,}{{pt}}$ et compte les $1$.',
            'Le résultat est aléatoire : il est souvent proche de ${{eval:10*pt}}$, mais pas toujours égal.'
            ' C\'est le **nombre de $1$** de l\'échantillon, pas une fréquence ni une probabilité.'],
           [var('pt', '2..8')])],
    [spec('p = 0,5 : quatre tirages sous 0,5', 0, '4', 'correct',
          {'pt': 5, 'r1': 42, 'r2': 18, 'r3': 91, 'r4': 25, 'r5': 67, 'r6': 13, 'nb': 4}),
     spec('Erreur : compter ceux au-dessus', 0, '2', 'incorrect',
          {'pt': 5, 'r1': 42, 'r2': 18, 'r3': 91, 'r4': 25, 'r5': 67, 'r6': 13, 'nb': 4}),
     spec('return c / n', 1, '0', 'correct'),
     spec('Erreur : return c', 1, '1', 'incorrect'),
     spec('Nombre de 1, aléatoire', 2, '0', 'correct', {'pt': 3}),
     spec('Erreur : toujours 30', 2, '1', 'incorrect', {'pt': 3})],
    grades=['1_TECHNO', '1_SPE'])))

# ---------------------------------------------------------------------------------------------
# M3 — N échantillons et histogramme des fréquences : 1TECHNO-101
# ---------------------------------------------------------------------------------------------

FREQS = py('from random import random\n\ndef frequence(n, p):\n    c = 0\n    for k in range(n):\n'
           '        if random() < p:\n            c = c + 1\n    return c / n\n\n'
           'freqs = [frequence(100, 0.{{pt}}) for j in range(500)]')
# Profil d'une loi binomiale n = 100, p = 0,3 (écart type ≈ 0,046), classes d'amplitude 0,05 ; d déplace
# quelques échantillons entre les deux classes centrales. Total : 500.
EFFECTIFS = ['6', '62', '{{eval:166+d}}', '{{eval:186-d}}', '70', '10']

def borne(j):
    decalage = 5 * j - 15
    return '0,{{eval:10*pt' + (f'+{decalage}' if decalage > 0 else f'{decalage}' if decalage else '') + '}}'


HISTO = ('```histogramme\naxes: Fréquence des 1 ; Nombre d\'échantillons\n'
         + ''.join(f'[{borne(j)} ; {borne(j + 1)}[ = {EFFECTIFS[j]}\n' for j in range(6))
         + 'description: Histogramme des fréquences des 1 dans 500 échantillons, six classes d\'amplitude'
           ' 0,05.\n```')
VARS_M3 = [var('pt', '3|4|6'), var('d', '-6..6')]
INTRO_M3 = ('On a simulé $500$ échantillons de taille $100$ d\'une loi de Bernoulli de paramètre $0{,}{{pt}}$ avec'
            ' le programme suivant.\n\n' + FREQS + '\n\nVoici l\'histogramme des $500$ fréquences de la liste'
            ' `freqs`.\n\n' + HISTO)

MODELES.append(('M3-echantillons-et-histogramme', modele(
    'Simuler N échantillons et lire l\'histogramme des fréquences', '1TECHNO-101',
    'Liste de 500 fréquences de Bernoulli (taille 100) et son histogramme : effectif d\'une classe, effectif'
    ' sous un seuil, paramètre le plus plausible, contenu de la liste', 3,
    [variation(INTRO_M3 + '\n\nCombien d\'échantillons ont une fréquence des $1$ dans $[' + borne(2).replace(',', '{,}')
               + '\\,;' + borne(3).replace(',', '{,}') + '[$ ?\n\n$?$',
               [case('{{eval:166+d}}')], VARS_M3,
               ['On lit la hauteur de la barre de la classe $[' + borne(2).replace(',', '{,}') + '\\,;'
                + borne(3).replace(',', '{,}') + '[$.',
                '$' + couleur('{{eval:166+d}}') + '$ échantillons ont une fréquence des $1$ dans cette'
                ' classe.']),
     variation(INTRO_M3 + '\n\nCombien d\'échantillons ont une fréquence des $1$ inférieure à $'
               + borne(2).replace(',', '{,}') + '$ ?\n\n$?$',
               [case('68')], VARS_M3,
               ['Deux classes sont sous $' + borne(2).replace(',', '{,}') + '$ : $[' + borne(0).replace(',', '{,}')
                + '\\,;' + borne(1).replace(',', '{,}') + '[$ ($6$ échantillons) et $['
                + borne(1).replace(',', '{,}') + '\\,;' + borne(2).replace(',', '{,}') + '[$ ($62$).',
                'En tout : $6+62=' + couleur('68') + '$ échantillons.']),
     choix('On a simulé $500$ échantillons de taille $100$ d\'une loi de Bernoulli dont on ne connaît pas le'
           ' paramètre $p$. Voici l\'histogramme des $500$ fréquences des $1$ observées.\n\n' + HISTO
           + '\n\nQuelle valeur de $p$ est la plus plausible ?',
           '$0{,}{{pt}}$', ['$0{,}{{eval:pt-1}}$', '$0{,}{{eval:pt+1}}$', '$0{,}{{eval:pt+2}}$'],
           ['Les fréquences observées fluctuent autour de $p$ : les barres les plus hautes encadrent la'
            ' valeur de $p$.',
            'Elles sont de part et d\'autre de $' + borne(3).replace(',', '{,}') + '$ : $p=0{,}{{pt}}$ est la'
            ' valeur la plus plausible.'],
           VARS_M3),
     choix('On considère le programme Python suivant.\n\n' + FREQS + '\n\nQue contient la liste `freqs` ?',
           'les fréquences des $1$ dans $500$ échantillons de taille $100$',
           ['les fréquences des $1$ dans $100$ échantillons de taille $500$',
            '$500$ nombres égaux à $0$ ou à $1$',
            'les nombres de $1$ dans $500$ échantillons de taille $100$'],
           ['`frequence(100, 0.{{pt}})` simule un échantillon de taille $100$ et renvoie `c / n`, la'
            ' **fréquence** des $1$.',
            '`for j in range(500)` répète cet appel $500$ fois : `freqs` contient les fréquences des $1$ dans'
            ' $500$ échantillons de taille $100$.'],
           [var('pt', '2..8')])],
    [spec('Classe centrale gauche : 166', 0, '166', 'correct', {'pt': 3, 'd': 0}),
     spec('Erreur : classe voisine', 0, '186', 'incorrect', {'pt': 3, 'd': 0}),
     spec('Sous le seuil : 68', 1, '68', 'correct', {'pt': 3, 'd': 0}),
     spec('Erreur : une seule classe', 1, '62', 'incorrect', {'pt': 3, 'd': 0}),
     spec('p plausible', 2, '0', 'correct', {'pt': 4, 'd': 2}),
     spec('Erreur : p trop grand', 2, '2', 'incorrect', {'pt': 4, 'd': 2}),
     spec('Contenu de freqs', 3, '0', 'correct', {'pt': 3}),
     spec('Erreur : tailles inversées', 3, '1', 'incorrect', {'pt': 3})])))

# ---------------------------------------------------------------------------------------------
# M4 — compter les fréquences dans [p − ks ; p + ks] : 1TECHNO-105
# ---------------------------------------------------------------------------------------------

COMPTER = py('def compter(freqs, p, s, k):\n    c = 0\n    for f in freqs:\n'
             '        if p - k * s <= f <= p + k * s:\n            c = c + 1\n    return c')
FS = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8']
NB_DANS = 'eval:' + '+'.join(indic_dans(f, '10*pt-5*k', '10*pt+5*k') for f in FS)
TABLE_M4 = ('| $f$ | ' + ' | '.join('$0{,}{{' + f + '}}$' for f in FS) + ' |\n| --- |' + ' --- |' * 8
            + '\n| Dans l\'intervalle | '
            + ' | '.join('{{if:' + f + '>10*pt-5*k && ' + f + '<10*pt+5*k|oui|non}}' for f in FS) + ' |')

MODELES.append(('M4-compter-dans-p-plus-ou-moins-ks', modele(
    'Compter les fréquences dans [p − ks ; p + ks]', '1TECHNO-105',
    'Fonction Python compter(freqs, p, s, k) : valeur renvoyée sur huit fréquences (k = 1 ou 2), condition à'
    ' compléter, pourcentage sur 500 échantillons, effet de k', 3,
    [variation('On considère la fonction Python suivante.\n\n' + COMPTER
               + '\n\nOn appelle `compter(L, 0.{{pt}}, 0.05, {{k}})` avec\n\n`L = ['
               + ', '.join('0.{{' + f + '}}' for f in FS) + ']`\n\nQue renvoie cet appel ?\n\n$?$',
               [case('{{nb}}')],
               [var('pt', '3..6'), var('k', '1|2'), var('lo', 'eval:10*pt-18'), var('hi', 'eval:10*pt+18')]
               + [var(f, '{{lo}}..{{hi}}') for f in FS] + [var('nb', NB_DANS)],
               ['Avec $p=0{,}{{pt}}$, $s=0{,}05$ et $k={{k}}$, la fonction compte les valeurs de la liste'
                ' situées dans $[{{eval:(10*pt-5*k)/100;d}}\\,;{{eval:(10*pt+5*k)/100;d}}]$.',
                TABLE_M4,
                'La fonction renvoie $' + couleur('{{nb}}') + '$.'],
               ['mod(' + f + ',5) != 0' for f in FS] + ['nb >= 2', 'nb <= 6']),
     choix('Dans $N$ échantillons de taille $n$ d\'une loi de Bernoulli de paramètre $p$, on a rangé les'
           ' fréquences des $1$ dans la liste `freqs` ; $s$ est l\'écart type de ces fréquences. La fonction'
           ' ci-dessous doit compter les fréquences situées dans l\'intervalle $[p-ks\\,;p+ks]$.\n\n'
           + py('def compter(freqs, p, s, k):\n    c = 0\n    for f in freqs:\n        if ...:\n'
                '            c = c + 1\n    return c')
           + '\n\nQue faut-il écrire à la place des points de suspension ?',
           '`p - k * s <= f <= p + k * s`',
           ['`p - s <= f <= p + s`', '`f <= p + k * s`', '`p - k <= f <= p + k`'],
           ['$f$ est dans $[p-ks\\,;p+ks]$ quand $p-ks\\leqslant f$ **et** $f\\leqslant p+ks$.',
            'En Python : `p - k * s <= f <= p + k * s`. Sans `k`, on n\'utiliserait que l\'intervalle'
            ' $[p-s\\,;p+s]$ ; avec `f <= p + k * s` seul, on oublierait la borne de gauche.']),
     variation('On a simulé $500$ échantillons de taille $100$ d\'une loi de Bernoulli de paramètre $0{,}{{pt}}$'
               ' et rangé les fréquences des $1$ dans la liste `freqs`. La fonction suivante compte les'
               ' fréquences situées dans $[p-ks\\,;p+ks]$, où $s$ est l\'écart type des fréquences.\n\n'
               + COMPTER + '\n\nL\'appel `compter(freqs, 0.{{pt}}, s, 2)` renvoie ${{c}}$. Quel pourcentage'
               ' des $500$ fréquences est situé dans $[p-2s\\,;p+2s]$ ?\n\n$?\\,\\%$',
               [case('{{eval:c/5;d}}')], [var('pt', '3..6'), var('c', '460..490')],
               ['${{c}}$ fréquences sur $500$ sont dans l\'intervalle.',
                '$\\dfrac{ {{c}} }{500}={{eval:c/500;d}}$, soit $' + couleur('{{eval:c/5;d}}') + '~\\%$.']),
     choix('On a rangé dans la liste `freqs` les fréquences des $1$ de plusieurs centaines d\'échantillons, et'
           ' $s$ est leur écart type. On considère la fonction suivante.\n\n' + COMPTER
           + '\n\nAvec la même liste, on appelle `compter(freqs, p, s, 1)`, puis `compter(freqs, p, s, 2)`.'
           ' Le second nombre renvoyé est…',
           'supérieur ou égal au premier',
           ['inférieur ou égal au premier', 'toujours égal au premier', 'toujours le double du premier'],
           ['L\'intervalle $[p-s\\,;p+s]$ est contenu dans $[p-2s\\,;p+2s]$ : toute fréquence comptée'
            ' avec $k=1$ l\'est aussi avec $k=2$.',
            'Le second nombre est donc **supérieur ou égal** au premier, sans être en général le double.'])],
    [spec('p = 0,4, k = 1 : quatre valeurs', 0, '4', 'correct',
          {'pt': 4, 'k': 1, 'lo': 22, 'hi': 58, 'f1': 38, 'f2': 27, 'f3': 44, 'f4': 52, 'f5': 41, 'f6': 33,
           'f7': 47, 'f8': 36, 'nb': 4}),
     spec('Erreur : intervalle de k = 2', 0, '6', 'incorrect',
          {'pt': 4, 'k': 1, 'lo': 22, 'hi': 58, 'f1': 38, 'f2': 27, 'f3': 44, 'f4': 52, 'f5': 41, 'f6': 33,
           'f7': 47, 'f8': 36, 'nb': 4}),
     spec('p = 0,4, k = 2 : six valeurs', 0, '6', 'correct',
          {'pt': 4, 'k': 2, 'lo': 22, 'hi': 58, 'f1': 38, 'f2': 27, 'f3': 44, 'f4': 52, 'f5': 41, 'f6': 33,
           'f7': 47, 'f8': 36, 'nb': 6}),
     spec('Condition complète', 1, '0', 'correct'),
     spec('Erreur : k oublié', 1, '1', 'incorrect'),
     spec('467 sur 500 : 93,4 %', 2, '93.4', 'correct', {'pt': 4, 'c': 467}),
     spec('Erreur : le nombre', 2, '467', 'incorrect', {'pt': 4, 'c': 467}),
     spec('Supérieur ou égal', 3, '0', 'correct'),
     spec('Erreur : inférieur', 3, '1', 'incorrect')])))

# ---------------------------------------------------------------------------------------------
# M5 — accumulateur pour un produit : 1TECHNO-107
# ---------------------------------------------------------------------------------------------

PRODUIT = 'def produit(n):\n    p = {{init}}\n    for k in range(1, n + 1):\n        p = p * k\n    return p'

MODELES.append(('M5-accumulateur-produit', modele(
    'Accumulateur pour calculer un produit', '1TECHNO-107',
    'Boucle p = p * k : produit des entiers de 1 à n, initialisation à 1, coefficient multiplicateur global'
    ' d\'évolutions successives, produit des éléments d\'une liste', 2,
    [variation('On considère la fonction Python suivante.\n\n' + py(PRODUIT.replace('{{init}}', '1'))
               + '\n\nQue renvoie `produit({{n}})` ?\n\n$?$',
               [case('{{eval:f}}')], [var('n', '4..6'), var('f', 'eval:n!')],
               ['`k` prend les valeurs $1$, $2$, …, ${{n}}$ (`range(1, n + 1)` s\'arrête juste avant'
                ' $n+1$). À chaque tour, `p` est multiplié par `k`.',
                'Valeurs successives de `p` : $1$, $2$, $6$, $24${{if:n>=5|, $120$|}}{{if:n>=6|, $720$|}}.',
                '`produit({{n}})` renvoie le produit des entiers de $1$ à ${{n}}$ : $'
                + couleur('{{eval:f}}') + '$.']),
     choix('La fonction Python ci-dessous doit renvoyer le produit $1\\times2\\times\\cdots\\times n$.\n\n'
           + py(PRODUIT.replace('{{init}}', '...'))
           + '\n\nQuelle valeur faut-il donner à `p` au départ ?',
           '`1`', ['`0`', '`n`', '`k`'],
           ['`p` est un accumulateur : on le multiplie à chaque tour par `k`.',
            'Il doit partir de $1$, qui ne change pas un produit. Avec $0$, `p` vaudrait toujours $0$ ; `k`'
            ' n\'existe pas encore avant la boucle.']),
     variation('Un prix évolue plusieurs fois de suite. La liste `taux` contient les taux d\'évolution'
               ' successifs, écrits en décimal : $0{,}1$ pour une hausse de $10~\\%$, $-0{,}2$ pour une baisse'
               ' de $20~\\%$.\n\n'
               + py('def coef_global(taux):\n    cm = 1\n    for t in taux:\n        cm = cm * (1 + t)\n'
                    '    return cm')
               + '\n\nQue renvoie `coef_global([0.{{a}}, -0.{{b}}])` ?\n\n$?$',
               [case('{{eval:(1+a/10)*(1-b/10);d}}')], [var('a', '1..5'), var('b', '1..5')],
               ['`cm` part de $1$ et est multiplié par chaque coefficient multiplicateur $1+t$.',
                '$1\\times(1+0{,}{{a}})\\times(1-0{,}{{b}})=1{,}{{a}}\\times0{,}{{eval:10-b}}='
                + couleur('{{eval:(1+a/10)*(1-b/10);d}}') + '$ : c\'est le coefficient multiplicateur global.']),
     variation('On considère la fonction Python suivante.\n\n'
               + py('def produit_liste(L):\n    p = 1\n    for x in L:\n        p = p * x\n    return p')
               + '\n\nQue renvoie `produit_liste([{{a}}, {{b}}, {{c}}])` ?\n\n$?$',
               [case('{{eval:a*b*c}}')], [var('a', '2..6'), var('b', '2..6'), var('c', '2..6')],
               ['`p` part de $1$ et est multiplié par chaque élément de la liste.',
                '$1\\times{{a}}\\times{{b}}\\times{{c}}=' + couleur('{{eval:a*b*c}}') + '$.'])],
    [spec('n = 5 : 120', 0, '120', 'correct', {'n': 5, 'f': 120}),
     spec('Erreur : somme', 0, '15', 'incorrect', {'n': 5, 'f': 120}),
     spec('p = 1', 1, '0', 'correct'),
     spec('Erreur : p = 0', 1, '1', 'incorrect'),
     spec('+10 % puis −20 % : 0,88', 2, '0.88', 'correct', {'a': 1, 'b': 2}),
     spec('Erreur : taux ajoutés', 2, '0.9', 'incorrect', {'a': 1, 'b': 2}),
     spec('2 × 3 × 5 = 30', 3, '30', 'correct', {'a': 2, 'b': 3, 'c': 5}),
     spec('Erreur : somme', 3, '10', 'incorrect', {'a': 2, 'b': 3, 'c': 5})])))

# ---------------------------------------------------------------------------------------------
# M6 — liste des premiers termes d'une suite : 1TECHNO-051
# ---------------------------------------------------------------------------------------------


def termes(maj):
    return py('def termes(n):\n    u = {{a}}\n    L = []\n    for k in range(n):\n        L.append(u)\n'
              '        ' + maj + '\n    return L')


def liste(exprs):
    return '`[' + ', '.join('{{eval:' + x + '}}' for x in exprs) + ']`'


ARITH = 'La suite $(u(n))$ est définie par $u(0)={{a}}$ et $u(n+1)=u(n)+{{r}}$.'
GEO = 'La suite $(u(n))$ est définie par $u(0)={{a}}$ et $u(n+1)={{q}}\\times u(n)$.'

MODELES.append(('M6-liste-des-termes-d-une-suite', modele(
    'Liste des premiers termes d\'une suite en Python', '1TECHNO-051',
    'Fonction termes(n) : liste renvoyée (arithmétique, géométrique), élément d\'indice 3, liste en'
    ' compréhension', 2,
    [choix(ARITH + ' La fonction Python suivante renvoie la liste de ses premiers termes.\n\n'
           + termes('u = u + {{r}}') + '\n\nQue renvoie `termes(4)` ?',
           liste(['a', 'a+r', 'a+2*r', 'a+3*r']),
           [liste(['a+r', 'a+2*r', 'a+3*r', 'a+4*r']), liste(['a', 'a+r', 'a+2*r', 'a+3*r', 'a+4*r']),
            liste(['a', 'a+r', 'a+2*r'])],
           ['`u` vaut d\'abord $u(0)={{a}}$ : il est ajouté à `L` **avant** d\'être augmenté de ${{r}}$.',
            'La boucle tourne $4$ fois : `L` reçoit $u(0)$, $u(1)$, $u(2)$, $u(3)$, soit '
            + liste(['a', 'a+r', 'a+2*r', 'a+3*r']) + '.'],
           [var('a', '1..9'), var('r', '2..7')]),
     choix(GEO + ' La fonction Python suivante renvoie la liste de ses premiers termes.\n\n'
           + termes('u = {{q}} * u') + '\n\nQue renvoie `termes(4)` ?',
           liste(['a', 'a*q', 'a*q^2', 'a*q^3']),
           [liste(['a*q', 'a*q^2', 'a*q^3', 'a*q^4']), liste(['a', 'a*q', 'a*q^2', 'a*q^3', 'a*q^4']),
            liste(['a', 'a+q', 'a+2*q', 'a+3*q'])],
           ['`u` vaut d\'abord $u(0)={{a}}$ : il est ajouté à `L` **avant** d\'être multiplié par ${{q}}$.',
            'La boucle tourne $4$ fois : `L` reçoit $u(0)$, $u(1)$, $u(2)$, $u(3)$, soit '
            + liste(['a', 'a*q', 'a*q^2', 'a*q^3']) + '.'],
           [var('a', '1..5'), var('q', '2|3')]),
     variation(ARITH + ' La fonction Python suivante renvoie la liste de ses premiers termes.\n\n'
               + termes('u = u + {{r}}') + '\n\nOn exécute `L = termes(6)`. Que vaut `L[3]` ?\n\n$?$',
               [case('{{eval:a+3*r}}')], [var('a', '1..9'), var('r', '2..7')],
               ['Les indices d\'une liste commencent à $0$ : `L[0]` est $u(0)$, `L[1]` est $u(1)$, etc.',
                '`L[3]` est donc $u(3)={{a}}+3\\times{{r}}=' + couleur('{{eval:a+3*r}}') + '$, le quatrième'
                ' élément de la liste.']),
     variation('On considère l\'instruction Python suivante.\n\n'
               + py('L = [{{a}} + {{r}} * n for n in range(5)]')
               + '\n\nQue vaut le dernier élément de la liste `L` ?\n\n$?$',
               [case('{{eval:a+4*r}}')], [var('a', '1..9'), var('r', '2..7')],
               ['`n` prend les valeurs $0$, $1$, $2$, $3$, $4$ : `range(5)` s\'arrête juste avant $5$.',
                'Le dernier élément est obtenu pour $n=4$ : ${{a}}+{{r}}\\times4=' + couleur('{{eval:a+4*r}}')
                + '$.'])],
    [spec('Bonne liste (arithmétique)', 0, '0', 'correct', {'a': 3, 'r': 2}),
     spec('Erreur : commence à u(1)', 0, '1', 'incorrect', {'a': 3, 'r': 2}),
     spec('Bonne liste (géométrique)', 1, '0', 'correct', {'a': 2, 'q': 3}),
     spec('Erreur : un terme de trop', 1, '2', 'incorrect', {'a': 2, 'q': 3}),
     spec('L[3] = u(3)', 2, '11', 'correct', {'a': 5, 'r': 2}),
     spec('Erreur : troisième élément', 2, '9', 'incorrect', {'a': 5, 'r': 2}),
     spec('n = 4 : a + 4r', 3, '23', 'correct', {'a': 3, 'r': 5}),
     spec('Erreur : n = 5', 3, '28', 'incorrect', {'a': 3, 'r': 5})])))

# ---------------------------------------------------------------------------------------------
# M7 — rang à partir duquel une suite dépasse l'autre : 1TECHNO-122
# ---------------------------------------------------------------------------------------------

# N = rang cherché. r ≤ rmax garantit qu'un u(0) existe : v(N − 1) ⩽ u(N − 1), v(N) > u(N) et u(0) > v(0).
# v − u est convexe : v(n) ⩽ u(n) pour tout n < N, et v(n) > u(n) pour tout n ⩾ N.
VARS_M7 = [var('N', '4..6'), var('b', '1..3'),
           var('rmax', 'eval:floor(min(b*2^(N-1)-1, (b*2^N-b-2)/N))'), var('r', '2..{{rmax}}'),
           var('alo', 'eval:max(b*2^(N-1)-r*(N-1), b+1)'), var('ahi', 'eval:b*2^N-r*N-1'),
           var('a', '{{alo}}..{{ahi}}')]
SUITES = ('On considère les suites $(u(n))$ et $(v(n))$ définies par $u(0)={{a}}$, $u(n+1)=u(n)+{{r}}$, et'
          ' $v(0)={{b}}$, $v(n+1)=2\\times v(n)$.')
RANG = 'def rang():\n    u = {{a}}\n    v = {{b}}\n    n = 0\n    while {{cond}}:\n        u = u + {{r}}\n' \
       '        v = 2 * v\n        n = n + 1\n    return n'
VALEURS = ('| $n$ | ' + ' | '.join(f'${j}$' for j in range(8)) + ' |\n| --- |' + ' --- |' * 8
           + '\n| $u(n)$ | ' + ' | '.join('${{eval:a+r*' + str(j) + '}}$' for j in range(8))
           + ' |\n| $v(n)$ | ' + ' | '.join('${{eval:b*2^' + str(j) + '}}$' for j in range(8)) + ' |')
ARRET = ['$u({{eval:N-1}})={{eval:a+r*(N-1)}}$ et $v({{eval:N-1}})={{eval:b*2^(N-1)}}$ : on a encore'
         ' $v({{eval:N-1}})\\leqslant u({{eval:N-1}})$.',
         '$u({{N}})={{eval:a+r*N}}$ et $v({{N}})={{eval:b*2^N}}$ : $v({{N}})>u({{N}})$.']

MODELES.append(('M7-rang-ou-une-suite-depasse-l-autre', modele(
    'Rang à partir duquel une suite dépasse une autre', '1TECHNO-122',
    'u arithmétique, v géométrique de raison 2 : valeur renvoyée par la boucle while v <= u, lecture d\'un'
    ' tableau de valeurs, condition à compléter', 3,
    [variation(SUITES + ' La fonction Python suivante cherche à partir de quel rang $v(n)$ dépasse $u(n)$.\n\n'
               + py(RANG.replace('{{cond}}', 'v <= u')) + '\n\nQue renvoie `rang()` ?\n\n$?$',
               [case('{{N}}')], VARS_M7,
               ['La boucle continue tant que $v(n)\\leqslant u(n)$ ; à chaque tour, `n` augmente de $1$.']
               + ARRET + ['La boucle s\'arrête pour $n={{N}}$ : `rang()` renvoie $' + couleur('{{N}}') + '$.']),
     variation(SUITES + ' Un tableur donne leurs premiers termes.\n\n' + VALEURS
               + '\n\nQuel est le plus petit entier $n$ tel que $v(n)>u(n)$ ?\n\n$n=?$',
               [case('{{N}}')], VARS_M7,
               ARRET + ['Ensuite, $v(n)$ double et reste au-dessus : le plus petit rang est $n='
                        + couleur('{{N}}') + '$.']),
     choix(SUITES + ' La fonction Python ci-dessous doit renvoyer le plus petit entier $n$ tel que'
           ' $v(n)>u(n)$.\n\n' + py(RANG.replace('{{cond}}', '...'))
           + '\n\nQue faut-il écrire à la place des points de suspension ?',
           '`v <= u`', ['`v > u`', '`v <= n`', '`u <= n`'],
           ['On continue **tant que** $v(n)$ n\'a pas dépassé $u(n)$, c\'est-à-dire tant que'
            ' $v(n)\\leqslant u(n)$ : `v <= u`.',
            'Avec `v > u`, la boucle ne tournerait pas, car au départ $v(0)={{b}}<u(0)={{a}}$.'],
           VARS_M7)],
    [spec('N = 5 : renvoie 5', 0, '5', 'correct',
          {'N': 5, 'b': 2, 'rmax': 12, 'r': 10, 'alo': 3, 'ahi': 13, 'a': 10}),
     spec('Erreur : dernier rang où v ⩽ u', 0, '4', 'incorrect',
          {'N': 5, 'b': 2, 'rmax': 12, 'r': 10, 'alo': 3, 'ahi': 13, 'a': 10}),
     spec('Tableau : 5', 1, '5', 'correct',
          {'N': 5, 'b': 2, 'rmax': 12, 'r': 10, 'alo': 3, 'ahi': 13, 'a': 10}),
     spec('Erreur : 6', 1, '6', 'incorrect',
          {'N': 5, 'b': 2, 'rmax': 12, 'r': 10, 'alo': 3, 'ahi': 13, 'a': 10}),
     spec('v <= u', 2, '0', 'correct',
          {'N': 5, 'b': 2, 'rmax': 12, 'r': 10, 'alo': 3, 'ahi': 13, 'a': 10}),
     spec('Erreur : v > u', 2, '1', 'incorrect',
          {'N': 5, 'b': 2, 'rmax': 12, 'r': 10, 'alo': 3, 'ahi': 13, 'a': 10})])))

# ---------------------------------------------------------------------------------------------
# M8 — valeur approchée d'une solution par balayage : 1TECHNO-067
# ---------------------------------------------------------------------------------------------

BALAYAGE = ('def f(x):\n    return x**2 + x\n\ndef balayage(k, pas):\n    x = 0\n    while {{cond}}:\n'
            '        x = x + pas\n    return x, x + pas')
EQUATION = ('On cherche la solution positive $\\alpha$ de l\'équation $x^2+x={{k}}$. Sur $[0\\,;+\\infty[$, la'
            ' fonction $f:x\\mapsto x^2+x$ est croissante.')
SANS_CARRE = 'mod(sqrt(1+4*k),1) != 0'


def fx(t):
    """f(t/10) écrit en décimal, t en dixièmes."""
    return '{{eval:((' + t + ')^2+10*(' + t + '))/100;d}}'


TABLEUR = ('| $x$ | ' + ' | '.join('${{eval:(t' + d + ')/10;d}}$' for d in ['-1', '', '+1', '+2'])
           + ' |\n| --- | --- | --- | --- | --- |\n| $f(x)$ | '
           + ' | '.join('$' + fx('t' + d) + '$' for d in ['-1', '', '+1', '+2']) + ' |')

MODELES.append(('M8-valeur-approchee-par-balayage', modele(
    'Valeur approchée d\'une solution par balayage', '1TECHNO-067',
    'x² + x = k sur [0 ; +∞[ : encadrement renvoyé par balayage(k, 1), encadrement au dixième d\'après un'
    ' tableau de valeurs, condition à compléter, sens de balayage(k, 0.01)', 3,
    [variation(EQUATION + ' On considère le programme Python suivant.\n\n'
               + py(BALAYAGE.replace('{{cond}}', 'f(x + pas) <= k'))
               + '\n\nQue renvoie `balayage({{k}}, 1)` ? Complète l\'encadrement de $\\alpha$.\n\n'
                 '$?\\leqslant\\alpha\\leqslant?$',
               [case('{{m}}'), case('{{eval:m+1}}')],
               [var('k', '3..40'), var('m', 'eval:floor((sqrt(1+4*k)-1)/2)')],
               ['`x` avance de $1$ en $1$ à partir de $0$ tant que $f(x+1)\\leqslant{{k}}$.',
                '$f({{m}})={{eval:m^2+m}}\\leqslant{{k}}$ et $f({{eval:m+1}})={{eval:(m+1)^2+m+1}}>{{k}}$ : la'
                ' boucle s\'arrête pour $x={{m}}$.',
                'La fonction renvoie $({{m}}, {{eval:m+1}})$ : $' + couleur('{{m}}') + '\\leqslant\\alpha'
                '\\leqslant' + couleur('{{eval:m+1}}') + '$.'],
               [SANS_CARRE]),
     variation(EQUATION + ' Un tableur donne quelques valeurs de $f$.\n\n' + TABLEUR
               + '\n\nEncadre $\\alpha$ entre deux nombres à un dixième près.\n\n$?<\\alpha<?$',
               [case('{{eval:t/10;d}}'), case('{{eval:(t+1)/10;d}}')],
               [var('k', '5..40'), var('t', 'eval:floor(10*(sqrt(1+4*k)-1)/2)')],
               ['On cherche où $f(x)$ passe au-dessus de ${{k}}$.',
                '$f({{eval:t/10;d}})=' + fx('t') + '<{{k}}$ et $f({{eval:(t+1)/10;d}})=' + fx('t+1')
                + '>{{k}}$ ; $f$ étant croissante, $' + couleur('{{eval:t/10;d}}') + '<\\alpha<'
                + couleur('{{eval:(t+1)/10;d}}') + '$.'],
               [SANS_CARRE]),
     choix(EQUATION + ' La fonction `balayage` ci-dessous doit renvoyer un encadrement de $\\alpha$ d\'amplitude'
           ' `pas`.\n\n' + py(BALAYAGE.replace('{{cond}}', '...'))
           + '\n\nQue faut-il écrire à la place des points de suspension ?',
           '`f(x + pas) <= k`', ['`f(x) <= k`', '`f(x + pas) >= k`', '`x + pas <= k`'],
           ['On avance tant que le nombre suivant, `x + pas`, a encore une image inférieure ou égale à $k$ :'
            ' `f(x + pas) <= k`.',
            'Avec `f(x) <= k`, on irait un pas trop loin : $f(x)$ dépasserait $k$ et l\'encadrement serait'
            ' faux. Comparer `x + pas` à $k$ oublie la fonction $f$.'],
           [var('k', '3..40')]),
     choix(EQUATION + ' On considère le programme Python suivant.\n\n'
           + py(BALAYAGE.replace('{{cond}}', 'f(x + pas) <= k'))
           + '\n\nL\'appel `balayage({{k}}, 0.01)` renvoie deux nombres. Ils forment…',
           'un encadrement de $\\alpha$ d\'amplitude $0{,}01$',
           ['un encadrement de $\\alpha$ d\'amplitude $0{,}1$', 'la valeur exacte de $\\alpha$ et une valeur'
            ' approchée', 'un encadrement de $f(\\alpha)$ d\'amplitude $0{,}01$'],
           ['`x` avance de $0{,}01$ en $0{,}01$ : la fonction renvoie `x` et `x + 0.01`, avec'
            ' $f(x)\\leqslant{{k}}<f(x+0{,}01)$.',
            '$f$ étant croissante, $x\\leqslant\\alpha<x+0{,}01$ : c\'est un **encadrement de $\\alpha$'
            ' d\'amplitude $0{,}01$**, pas la valeur exacte.'],
           [var('k', '3..40')])],
    [spec('k = 10 : entre 2 et 3', 0, ['2', '3'], 'correct', {'k': 10, 'm': 2}),
     spec('Erreur : un pas trop loin', 0, ['3', '4'], 'incorrect', {'k': 10, 'm': 2}),
     spec('k = 10 : entre 2,7 et 2,8', 1, ['2.7', '2.8'], 'correct', {'k': 10, 't': 27}),
     spec('Erreur : décalé', 1, ['2.8', '2.9'], 'incorrect', {'k': 10, 't': 27}),
     spec('f(x + pas) <= k', 2, '0', 'correct', {'k': 10}),
     spec('Erreur : f(x) <= k', 2, '1', 'incorrect', {'k': 10}),
     spec('Amplitude 0,01', 3, '0', 'correct', {'k': 10}),
     spec('Erreur : amplitude 0,1', 3, '1', 'incorrect', {'k': 10})])))

# ---------------------------------------------------------------------------------------------
# Écriture
# ---------------------------------------------------------------------------------------------

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    m = dict(m)
    m.pop('_point')
    chemin = os.path.join(DOSSIER, nom + '.json')
    ancien_id = None
    if os.path.exists(chemin):
        with open(chemin, encoding='utf-8') as f:
            ancien_id = json.load(f).get('id')
    if ancien_id:
        m = {'id': ancien_id, **m}
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=1)
        f.write('\n')
print(len(MODELES), 'modèles écrits dans', DOSSIER)
for nom, m in MODELES:
    print(' ', m['_point'], nom)
