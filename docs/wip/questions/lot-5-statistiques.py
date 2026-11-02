"""Écrit les 10 modèles du lot 9 « Statistiques » de la 5e dans scripts/questions/5-statistiques/.

Phase 0 validée par David le 2026-11-02 (« je te suis » sur les recos) ; un point par modèle :

| #  | Point | Titre | Réponse | Sous-notion, niveau |
| 01 | 5-076 | Compter des effectifs | case | effectifs et fréquences, 2 |
| 02 | 5-109 | Lire un tableau | case | tableaux, 3 |
| 03 | 5-136 | Interpréter un tableau | choix ; case | tableaux, 4 |
| 04 | 5-078 | Ranger des données dans un tableau | cases | tableaux, 5 |
| 05 | 5-110 | Lire un diagramme en barres | case | diagrammes en barres, 4 |
| 06 | 5-137 | Interpréter un diagramme en barres | choix ; case | diagrammes en barres, 5 |
| 07 | 5-111 | Lire un diagramme circulaire | case (fraction) | diagrammes circulaires, 1 |
| 08 | 5-138 | Interpréter un diagramme circulaire | choix ; case | diagrammes circulaires, 2 |
| 09 | 5-077 | Lire un graphique | case | courbes et repères, 1 |
| 10 | 5-135 | Interpréter un graphique | choix | courbes et repères, 2 |

Décisions (journal § 23) :
- 07 : diagramme sans étiquettes, aucun secteur au-delà de 180° (borne), réponse en fraction seule
  (non simplifiée acceptée) ;
- 09-10 : bloc ```courbe, années en abscisse, un segment affine par année (ligne brisée) ;
- le moteur n'a pas `==` dans `eval:` : un effectif se compte par `{{if:x==v|1|0}}` additionnés ;
- variables `e` et `i` interdites.

    python3 docs/wip/questions/lot-5-statistiques.py scripts/questions/5-statistiques
"""
import json
import os
import random
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(nom, title, description, domain, subdomain, level, variations, specs, delay=90,
           options=None):
    m = {'title': title, 'description': description, 'grades': ['5'], 'theme': 'Statistiques',
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
    v['blanks'] = [{'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def m(x):
    return '$' + col(x) + '$'


def choix(lignes, melanger=False):
    entete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + entete + ''.join('- ' + l + '\n' for l in lignes) + '```'


def sel(k, valeurs, base=1):
    """Valeur numéro k (k = base, base + 1…) parmi `valeurs` (textes), en `{{if:…}}` imbriqués."""
    if len(valeurs) == 1:
        return valeurs[0]
    return '{{if:' + k + '==' + str(base) + '|' + valeurs[0] + '|' + sel(k, valeurs[1:], base + 1) + '}}'


def compte(noms, valeur):
    """Expression `eval:` qui compte les variables de `noms` égales à `valeur`."""
    return 'eval:' + '+'.join('{{if:' + n + '==' + str(valeur) + '|1|0}}' for n in noms)


def tous_differents(noms):
    return [f'({a}-{b})*({a}-{b}) > 0' for idx, a in enumerate(noms) for b in noms[idx + 1:]]


def argmax(noms, plus=True):
    """Indice (0, 1…) de la plus grande (ou plus petite) des variables, toutes différentes."""
    cmp = '>' if plus else '<'
    def rang(idx):
        if idx == len(noms) - 1:
            return str(idx)
        a = noms[idx]
        test = ' && '.join(f'{a}{cmp}{b}' for b in noms if b != a)
        return '{{if:' + test + '|' + str(idx) + '|' + rang(idx + 1) + '}}'
    return rang(0)


def plus_grand_py(vals):
    return max(range(len(vals)), key=lambda j: vals[j])


R = 'Représenter des données'
FRACTION_LIBRE = {'constraints': {'reducedFractions': 'off'}}
MODELES = []
alea = random.Random(5076)

# --- 01. 5-076 : compter des effectifs ------------------------------------------------------

AGES = [f'x{k}' for k in range(1, 21)]
NOTES = [f'x{k}' for k in range(1, 19)]


def liste(noms):
    return '$' + ' ~;~ '.join('{{' + n + '}}' for n in noms) + '$'


ages_spec = [alea.randint(11, 14) for _ in AGES]
notes_spec = [alea.randint(4, 10) for _ in NOTES]

COMPTER_AGES = variation(
    'Voici l\'âge, en années, des $20$ élèves d\'un club de théâtre :\n\n' + liste(AGES)
    + '\n\nCombien d\'élèves ont ${{c}}$ ans ?\n\n$?$ élèves',
    [var(n, '11..14') for n in AGES] + [var('c', '11..14'), var('n', compte(AGES, '{{c}}'))],
    ['{{n}}'],
    ['On parcourt la liste et on compte chaque ${{c}}$ (en le barrant pour ne pas le compter deux'
     ' fois).',
     'Il y a ' + m('{{n}}') + ' fois ${{c}}$ : l\'**effectif** de ${{c}}$ ans est ${{n}}$.'],
    ['n >= 2'])
COMPTER_NOTES = variation(
    'Voici les notes sur $10$ de $18$ élèves à une interrogation :\n\n' + liste(NOTES)
    + '\n\nCombien d\'élèves ont eu ${{c}}$ ?\n\n$?$ élèves',
    [var(n, '4..10') for n in NOTES] + [var('c', '5..9'), var('n', compte(NOTES, '{{c}}'))],
    ['{{n}}'],
    ['On parcourt la liste et on compte chaque ${{c}}$ (en le barrant pour ne pas le compter deux'
     ' fois).',
     'Il y a ' + m('{{n}}') + ' fois ${{c}}$ : l\'**effectif** de la note ${{c}}$ est ${{n}}$.'],
    ['n >= 2'])

c1 = 12
n1 = ages_spec.count(c1)
while n1 < 2:
    ages_spec = [alea.randint(11, 14) for _ in AGES]
    n1 = ages_spec.count(c1)
v1 = {n: v for n, v in zip(AGES, ages_spec)} | {'c': c1, 'n': n1}
c2 = 7
n2 = notes_spec.count(c2)
while n2 < 2:
    notes_spec = [alea.randint(4, 10) for _ in NOTES]
    n2 = notes_spec.count(c2)
v2 = {n: v for n, v in zip(NOTES, notes_spec)} | {'c': c2, 'n': n2}

MODELES.append(modele(
    '01-compter-des-effectifs', 'Compter des effectifs',
    'Compter dans une liste brute de données combien de fois revient une valeur (l\'effectif de'
    ' 12 ans parmi les âges de 20 élèves)',
    R, 'effectifs et fréquences', 2, [COMPTER_AGES, COMPTER_NOTES],
    [spec(f'{n1} fois 12', 0, v1, str(n1), 'correct'),
     spec('Erreur : un de trop', 0, v1, str(n1 + 1), 'incorrect'),
     spec('Erreur : l\'effectif total', 0, v1, '20', 'incorrect'),
     spec(f'{n2} fois 7', 1, v2, str(n2), 'correct'),
     spec('Erreur : un de moins', 1, v2, str(n2 - 1), 'incorrect')],
    delay=120))

# --- Tableau âge / effectif (02, 03) --------------------------------------------------------


def tableau_ages(effectifs, total=False):
    tete = '| Âge (ans) | 11 | 12 | 13 | 14 |' + (' Total |' if total else '')
    sep = '| --- ' * (5 + (1 if total else 0)) + '|'
    corps = '| Effectif | ' + ' | '.join('$' + v + '$' for v in effectifs) + ' |'
    return '\n\n' + tete + '\n' + sep + '\n' + corps + '\n\n'


EFF = ['a', 'b', 'c', 'd']
EFF_VARS = [var(n, '2..15') for n in EFF]
TAB = tableau_ages(['{{a}}', '{{b}}', '{{c}}', '{{d}}'])
K_EFF = sel('k', ['{{a}}', '{{b}}', '{{c}}', '{{d}}'])

# --- 02. 5-109 : lire un tableau ------------------------------------------------------------

LIRE_TAB = variation(
    'Voici l\'âge des élèves inscrits au club de judo.' + TAB
    + 'Combien d\'élèves ont ${{eval:10+k}}$ ans ?\n\n$?$ élèves',
    EFF_VARS + [var('k', '1..4')],
    [K_EFF],
    ['On repère la colonne « ${{eval:10+k}}$ » et on lit l\'effectif en dessous.',
     m(K_EFF) + ' élèves ont ${{eval:10+k}}$ ans.'],
    tous_differents(EFF))
LIRE_TAB_INVERSE = variation(
    'Voici l\'âge des élèves inscrits au club de judo.' + TAB
    + 'Quel âge ont les ' + '$' + K_EFF + '$ élèves de la même colonne ?\n\n$?$ ans',
    EFF_VARS + [var('k', '1..4')],
    ['{{eval:10+k}}'],
    ['On cherche l\'effectif $' + K_EFF + '$ dans la ligne du bas et on lit l\'âge au-dessus.',
     'Ces élèves ont ' + m('{{eval:10+k}}') + ' ans.'],
    tous_differents(EFF))

V_TAB = {'a': 6, 'b': 11, 'c': 9, 'd': 4}
MODELES.append(modele(
    '02-lire-un-tableau', 'Lire un tableau',
    'Lire un effectif dans un tableau (combien d\'élèves ont 12 ans ?), ou la valeur qui a un'
    ' effectif donné',
    R, 'tableaux', 3, [LIRE_TAB, LIRE_TAB_INVERSE],
    [spec('12 ans : 11', 0, V_TAB | {'k': 2}, '11', 'correct'),
     spec('Erreur : colonne voisine', 0, V_TAB | {'k': 2}, '9', 'incorrect'),
     spec('Erreur : l\'âge au lieu de l\'effectif', 0, V_TAB | {'k': 2}, '12', 'incorrect'),
     spec('9 élèves : 13 ans', 1, V_TAB | {'k': 3}, '13', 'correct'),
     spec('Erreur : l\'effectif recopié', 1, V_TAB | {'k': 3}, '9', 'incorrect')]))

# --- 03. 5-136 : interpréter un tableau -----------------------------------------------------

AGES_CHOIX = ['$11$ ans', '$12$ ans', '$13$ ans', '$14$ ans']
PLUS_FREQUENT = variation(
    'Voici l\'âge des élèves inscrits au club d\'échecs.' + TAB
    + 'Quel âge est le plus fréquent ?' + choix(AGES_CHOIX),
    EFF_VARS + [var('r', argmax(EFF))],
    ['{{r}}'],
    ['L\'âge le plus fréquent est celui qui a le plus grand **effectif**.',
     'Le plus grand effectif est $' + sel('r', ['{{a}}', '{{b}}', '{{c}}', '{{d}}'], 0)
     + '$ : l\'âge le plus fréquent est ' + m('{{eval:11+r}}') + ' ans.'],
    tous_differents(EFF))
PLUS_DE_12 = variation(
    'Voici l\'âge des élèves inscrits au club d\'échecs.' + TAB
    + 'Combien d\'élèves ont **plus de** $12$ ans ?\n\n$?$ élèves',
    EFF_VARS, ['{{eval:c+d}}'],
    ['Plus de $12$ ans : $13$ ans et $14$ ans ($12$ ans ne compte pas).',
     '${{c}} + {{d}} = ' + col('{{eval:c+d}}') + '$ élèves.'])
TOTAL_TAB = variation(
    'Voici l\'âge des élèves inscrits au club d\'échecs.' + TAB
    + 'Combien d\'élèves sont inscrits au club ?\n\n$?$ élèves',
    EFF_VARS, ['{{eval:a+b+c+d}}'],
    ['L\'**effectif total** est la somme de tous les effectifs.',
     '${{a}} + {{b}} + {{c}} + {{d}} = ' + col('{{eval:a+b+c+d}}') + '$ élèves.'])

MODELES.append(modele(
    '03-interpreter-un-tableau', 'Interpréter un tableau',
    'Exploiter un tableau d\'effectifs : la valeur la plus fréquente, combien au-delà d\'une'
    ' valeur, l\'effectif total',
    R, 'tableaux', 4, [PLUS_FREQUENT, PLUS_DE_12, TOTAL_TAB],
    [spec('12 ans le plus fréquent', 0, V_TAB | {'r': 1}, '1', 'correct'),
     spec('Erreur : 11 ans (première colonne)', 0, V_TAB | {'r': 1}, '0', 'incorrect'),
     spec('Plus de 12 : 13', 1, V_TAB, '13', 'correct'),
     spec('Erreur : 12 ans compris', 1, V_TAB, '24', 'incorrect'),
     spec('Total : 30', 2, V_TAB, '30', 'correct'),
     spec('Erreur : une colonne oubliée', 2, V_TAB, '26', 'incorrect')]))

# --- 04. 5-078 : ranger des données dans un tableau ------------------------------------------

RANG16 = [f'x{k}' for k in range(1, 17)]
TRANSPORTS = ['à pied', 'vélo', 'bus', 'voiture']


def compteurs(noms, valeurs):
    return [var(f'n{j + 1}', compte(noms, v)) for j, v in enumerate(valeurs)]


TAB_VIDE_AGES = ('\n\n| Âge (ans) | 11 | 12 | 13 | 14 |\n| --- | --- | --- | --- | --- |\n'
                 '| Effectif | $?$ | $?$ | $?$ | $?$ |\n\n')
RANGER_AGES = variation(
    'Voici l\'âge, en années, des $16$ élèves d\'un club de natation :\n\n' + liste(RANG16)
    + '\n\nComplète le tableau des effectifs.' + TAB_VIDE_AGES,
    [var(n, '11..14') for n in RANG16] + compteurs(RANG16, [11, 12, 13, 14]),
    ['{{n1}}', '{{n2}}', '{{n3}}', '{{n4}}'],
    ['On compte chaque âge dans la liste, en barrant les nombres déjà comptés.',
     '$11$ ans : ' + m('{{n1}}') + ' ; $12$ ans : ' + m('{{n2}}') + ' ; $13$ ans : '
     + m('{{n3}}') + ' ; $14$ ans : ' + m('{{n4}}') + '.',
     'Contrôle : ${{n1}} + {{n2}} + {{n3}} + {{n4}} = 16$, le nombre d\'élèves.'],
    ['n1 >= 1', 'n2 >= 1', 'n3 >= 1', 'n4 >= 1'])
MOTS = [sel(n, TRANSPORTS) for n in RANG16[:15]]
TAB_VIDE_TRANSPORTS = ('\n\n| Moyen de transport | À pied | Vélo | Bus | Voiture |\n'
                       '| --- | --- | --- | --- | --- |\n'
                       '| Effectif | $?$ | $?$ | $?$ | $?$ |\n\n')
RANGER_TRANSPORTS = variation(
    'On a demandé à $15$ élèves comment ils viennent au collège. Voici leurs réponses :\n\n'
    + ' ; '.join(MOTS) + '.\n\nComplète le tableau des effectifs.' + TAB_VIDE_TRANSPORTS,
    [var(n, '1..4') for n in RANG16[:15]] + compteurs(RANG16[:15], [1, 2, 3, 4]),
    ['{{n1}}', '{{n2}}', '{{n3}}', '{{n4}}'],
    ['On compte chaque réponse, en barrant celles déjà comptées.',
     'À pied : ' + m('{{n1}}') + ' ; vélo : ' + m('{{n2}}') + ' ; bus : ' + m('{{n3}}')
     + ' ; voiture : ' + m('{{n4}}') + '.',
     'Contrôle : ${{n1}} + {{n2}} + {{n3}} + {{n4}} = 15$, le nombre d\'élèves.'],
    ['n1 >= 1', 'n2 >= 1', 'n3 >= 1', 'n4 >= 1'])


def tirage_rangement(nb, lo, hi):
    while True:
        xs = [alea.randint(lo, hi) for _ in range(nb)]
        ns = [xs.count(v) for v in range(lo, hi + 1)]
        if min(ns) >= 1 and len(set(ns)) > 1:
            return xs, ns


xa, na = tirage_rangement(16, 11, 14)
va = {n: v for n, v in zip(RANG16, xa)} | {f'n{j + 1}': c for j, c in enumerate(na)}
xt, nt = tirage_rangement(15, 1, 4)
vt = {n: v for n, v in zip(RANG16[:15], xt)} | {f'n{j + 1}': c for j, c in enumerate(nt)}
faux_a = [str(c) for c in na]
j0 = next(j for j in range(3) if na[j] != na[j + 1])
faux_a[j0], faux_a[j0 + 1] = faux_a[j0 + 1], faux_a[j0]

MODELES.append(modele(
    '04-ranger-des-donnees-dans-un-tableau', 'Ranger des données dans un tableau',
    'Construire le tableau des effectifs d\'une liste brute de données (âges, moyens de'
    ' transport)',
    R, 'tableaux', 5, [RANGER_AGES, RANGER_TRANSPORTS],
    [spec('Âges : tableau juste', 0, va, [str(c) for c in na], 'correct'),
     spec('Erreur : deux colonnes échangées', 0, va, faux_a, 'incorrect'),
     spec('Transports : tableau juste', 1, vt, [str(c) for c in nt], 'correct'),
     spec('Erreur : un de trop', 1, vt, [str(nt[0] + 1)] + [str(c) for c in nt[1:]],
          'incorrect')],
    delay=180))

# --- Diagrammes en barres (05, 06) ----------------------------------------------------------

SPORTS = ['Football', 'Basket', 'Danse', 'Natation']


def barres(titre, axes, noms, valeurs, axe):
    corps = ''.join(f'{n} = {v}\n' for n, v in zip(noms, valeurs))
    return ('\n\n```barres\ntitre: ' + titre + '\naxes: ' + axes + '\n' + corps + 'axe: ' + axe
            + '\n```\n\n')


BAR_AGES = barres('Âge des élèves de l\'association sportive', 'Âge (ans) ; Élèves',
                  ['11 ans', '12 ans', '13 ans', '14 ans'],
                  ['{{eval:2*a}}', '{{eval:2*b}}', '{{eval:2*c}}', '{{eval:2*d}}'],
                  '0 à 24, de 2 en 2')
BAR_SPORTS = barres('Sport préféré des élèves de 5e', 'Sport ; Élèves', SPORTS,
                    ['{{eval:5*a}}', '{{eval:5*b}}', '{{eval:5*c}}', '{{eval:5*d}}'],
                    '0 à 50, de 5 en 5')
BAR_VARS_2 = [var(n, '1..12') for n in EFF]
BAR_VARS_5 = [var(n, '1..10') for n in EFF]

# --- 05. 5-110 : lire un diagramme en barres --------------------------------------------------

LIRE_BAR_AGES = variation(
    'Voici l\'âge des élèves inscrits à l\'association sportive.' + BAR_AGES
    + 'Combien d\'élèves ont ${{eval:10+k}}$ ans ?\n\n$?$ élèves',
    BAR_VARS_2 + [var('k', '1..4')],
    ['{{eval:2*(' + K_EFF + ')}}'],
    ['On suit le haut de la barre « ${{eval:10+k}}$ ans » jusqu\'à l\'axe vertical, gradué de'
     ' $2$ en $2$.',
     m('{{eval:2*(' + K_EFF + ')}}') + ' élèves ont ${{eval:10+k}}$ ans.'],
    tous_differents(EFF))
LIRE_BAR_SPORTS = variation(
    'On a demandé leur sport préféré aux élèves de 5e.' + BAR_SPORTS
    + 'Combien d\'élèves ont choisi ' + sel('k', ['le football', 'le basket', 'la danse',
                                                    'la natation']) + ' ?\n\n$?$ élèves',
    BAR_VARS_5 + [var('k', '1..4')],
    ['{{eval:5*(' + K_EFF + ')}}'],
    ['On suit le haut de la barre jusqu\'à l\'axe vertical, gradué de $5$ en $5$.',
     m('{{eval:5*(' + K_EFF + ')}}') + ' élèves ont choisi '
     + sel('k', ['le football', 'le basket', 'la danse', 'la natation']) + '.'],
    tous_differents(EFF))

V_BAR = {'a': 4, 'b': 7, 'c': 9, 'd': 3}
MODELES.append(modele(
    '05-lire-un-diagramme-en-barres', 'Lire un diagramme en barres',
    'Lire un effectif sur un diagramme en barres gradué de 2 en 2 ou de 5 en 5 (combien'
    ' d\'élèves ont 12 ans ?)',
    R, 'diagrammes en barres', 4, [LIRE_BAR_AGES, LIRE_BAR_SPORTS],
    [spec('12 ans : 14', 0, V_BAR | {'k': 2}, '14', 'correct'),
     spec('Erreur : graduations comptées de 1 en 1', 0, V_BAR | {'k': 2}, '7', 'incorrect'),
     spec('Danse : 45', 1, V_BAR | {'k': 3}, '45', 'correct'),
     spec('Erreur : barre voisine', 1, V_BAR | {'k': 3}, '35', 'incorrect')]))

# --- 06. 5-137 : interpréter un diagramme en barres -------------------------------------------

PLUS_CHOISI = variation(
    'On a demandé leur sport préféré aux élèves de 5e.' + BAR_SPORTS
    + 'Quel sport est le plus choisi ?' + choix(SPORTS),
    BAR_VARS_5 + [var('r', argmax(EFF))],
    ['{{r}}'],
    ['Le sport le plus choisi est celui de la barre **la plus haute**.',
     'C\'est ' + sel('r', ['le football', 'le basket', 'la danse', 'la natation'], 0) + ' : $'
     + col('{{eval:5*(' + sel('r', ['{{a}}', '{{b}}', '{{c}}', '{{d}}'], 0) + ')}}')
     + '$ élèves.'],
    tous_differents(EFF))
COMBIEN_DE_PLUS = variation(
    'Voici l\'âge des élèves inscrits à l\'association sportive.' + BAR_AGES
    + 'Combien d\'élèves de $12$ ans de plus que d\'élèves de $14$ ans ?\n\n$?$ élèves de plus',
    BAR_VARS_2, ['{{eval:2*(b-d)}}'],
    ['On lit : $12$ ans → ${{eval:2*b}}$ élèves ; $14$ ans → ${{eval:2*d}}$ élèves.',
     '${{eval:2*b}} - {{eval:2*d}} = ' + col('{{eval:2*(b-d)}}') + '$ élèves de plus.'],
    ['b - d >= 2'])
TOTAL_BAR = variation(
    'On a demandé leur sport préféré aux élèves de 5e.' + BAR_SPORTS
    + 'Combien d\'élèves ont répondu ?\n\n$?$ élèves',
    BAR_VARS_5, ['{{eval:5*(a+b+c+d)}}'],
    ['On lit chaque barre, puis on additionne les effectifs.',
     '${{eval:5*a}} + {{eval:5*b}} + {{eval:5*c}} + {{eval:5*d}} = '
     + col('{{eval:5*(a+b+c+d)}}') + '$ élèves.'])

MODELES.append(modele(
    '06-interpreter-un-diagramme-en-barres', 'Interpréter un diagramme en barres',
    'Exploiter un diagramme en barres : la catégorie la plus choisie, un écart entre deux barres,'
    ' l\'effectif total',
    R, 'diagrammes en barres', 5, [PLUS_CHOISI, COMBIEN_DE_PLUS, TOTAL_BAR],
    [spec('Danse la plus choisie', 0, V_BAR | {'r': 2}, '2', 'correct'),
     spec('Erreur : la moins choisie', 0, V_BAR | {'r': 2}, '3', 'incorrect'),
     spec('14 - 6 = 8', 1, V_BAR, '8', 'correct'),
     spec('Erreur : graduations comptées de 1 en 1', 1, V_BAR, '4', 'incorrect'),
     spec('Total : 115', 2, V_BAR, '115', 'correct'),
     spec('Erreur : une barre oubliée', 2, V_BAR, '100', 'incorrect')]))

# --- 07. 5-111 : lire un diagramme circulaire ----------------------------------------------------


def circulaire(titre, noms, valeurs, etiquettes):
    corps = ''.join(f'{n} = {v}\n' for n, v in zip(noms, valeurs))
    return ('\n\n```circulaire\ntitre: ' + titre + '\n' + corps + 'étiquettes: ' + etiquettes
            + '\n```\n\n')


MOYENS = ['À pied', 'Vélo', 'Bus', 'Voiture']
MOYENS_TXT = ['à pied', 'à vélo', 'en bus', 'en voiture']
CIRC_QUARTS = circulaire('Moyen de transport des élèves', MOYENS[:3],
                         ['{{a}}', '{{b}}', '{{c}}'], 'aucune')
CIRC_HUITIEMES = circulaire('Moyen de transport des élèves', MOYENS,
                            ['{{a}}', '{{b}}', '{{c}}', '{{d}}'], 'aucune')


def fraction_lue(num, den):
    """num : nom de variable ; den : entier. Fraction simplifiée en couleur si elle se simplifie."""
    d = str(den)
    frac = '\\dfrac{{{' + num + '}}}{' + d + '}'
    pg = 'gcd(' + num + ',' + d + ')'
    return ('{{if:' + pg + '!=1|$' + frac + ' = '
            + col('\\dfrac{{{eval:(' + num + ')/' + pg + '}}}{{{eval:' + d + '/' + pg + '}}}')
            + '$|$' + col(frac) + '$}}')


LIRE_QUARTS = variation(
    'Voici comment viennent au collège les élèves d\'une classe.' + CIRC_QUARTS
    + 'Quelle fraction des élèves vient ' + sel('k', MOYENS_TXT[:3]) + ' ?\n\n$?$',
    [var('a', '1..2'), var('b', '1..2'), var('c', 'eval:4-a-b'), var('k', '1..3'),
     var('p', sel('k', ['{{a}}', '{{b}}', '{{c}}']))],
    ['\\dfrac{{{p}}}{4}'],
    ['Le disque est partagé en $4$ quarts ; on compte les quarts du secteur « '
     + sel('k', MOYENS[:3]) + ' ».',
     'Il en occupe ${{p}}$ sur $4$ : ' + fraction_lue('p', 4) + ' des élèves.'],
    ['c >= 1'])
LIRE_HUITIEMES = variation(
    'Voici comment viennent au collège les élèves d\'une classe.' + CIRC_HUITIEMES
    + 'Quelle fraction des élèves vient ' + sel('k', MOYENS_TXT) + ' ?\n\n$?$',
    [var('a', '1..4'), var('b', '1..4'), var('c', '1..4'), var('d', 'eval:8-a-b-c'),
     var('k', '1..4'), var('p', K_EFF)],
    ['\\dfrac{{{p}}}{8}'],
    ['Le disque se partage en $8$ parts égales (la moitié de la moitié de la moitié) ; on compte'
     ' les huitièmes du secteur « ' + sel('k', MOYENS) + ' ».',
     'Il en occupe ${{p}}$ sur $8$ : ' + fraction_lue('p', 8)
     + ' des élèves.'],
    ['d >= 1', 'd <= 4'])

MODELES.append(modele(
    '07-lire-un-diagramme-circulaire', 'Lire un diagramme circulaire',
    'Lire la part d\'une catégorie sur un diagramme circulaire sans étiquettes, en quarts ou en'
    ' huitièmes (quelle part des élèves vient à vélo ?)',
    R, 'diagrammes circulaires', 1, [LIRE_QUARTS, LIRE_HUITIEMES],
    [spec('Vélo : 1/4', 0, {'a': 2, 'b': 1, 'c': 1, 'k': 2, 'p': 1}, '\\frac{1}{4}', 'correct'),
     spec('À pied : 2/4 accepté', 0, {'a': 2, 'b': 1, 'c': 1, 'k': 1, 'p': 2}, '\\frac{2}{4}', 'correct'),
     spec('À pied : 1/2', 0, {'a': 2, 'b': 1, 'c': 1, 'k': 1, 'p': 2}, '\\frac{1}{2}', 'correct'),
     spec('Erreur : 25 (pourcentage)', 0, {'a': 2, 'b': 1, 'c': 1, 'k': 2, 'p': 1}, '25', 'incorrect'),
     spec('Bus : 3/8', 1, {'a': 2, 'b': 1, 'c': 3, 'd': 2, 'k': 3, 'p': 3}, '\\frac{3}{8}', 'correct'),
     spec('Erreur : 3/4 (parts mal comptées)', 1, {'a': 2, 'b': 1, 'c': 3, 'd': 2, 'k': 3, 'p': 3},
          '\\frac{3}{4}', 'incorrect')],
    options=FRACTION_LIBRE))

# --- 08. 5-138 : interpréter un diagramme circulaire ----------------------------------------------

CIRC_POURCENTS = circulaire('Moyen de transport des 200 élèves du collège', MOYENS,
                            ['{{eval:5*a}} %', '{{eval:5*b}} %', '{{eval:5*c}} %',
                             '{{eval:5*d}} %'], 'pourcentages')
POURCENT_VARS = [var('a', '1..10'), var('b', '1..10'), var('c', '1..10'),
                 var('d', 'eval:20-a-b-c')]
POURCENT_CONDS = ['d >= 1', 'd <= 10']
PLUS_UTILISE = variation(
    'Voici comment viennent au collège ses $200$ élèves.' + CIRC_POURCENTS
    + 'Quel moyen de transport est le plus utilisé ?' + choix(MOYENS),
    POURCENT_VARS + [var('r', argmax(EFF))],
    ['{{r}}'],
    ['Le plus utilisé est celui du plus grand secteur, donc du plus grand pourcentage.',
     'C\'est « ' + sel('r', MOYENS, 0) + ' », avec $'
     + col('{{eval:5*(' + sel('r', ['{{a}}', '{{b}}', '{{c}}', '{{d}}'], 0) + ')}}~\\%') + '$.'],
    POURCENT_CONDS + tous_differents(EFF))
NOMBRE_ELEVES = variation(
    'Voici comment viennent au collège ses $200$ élèves.' + CIRC_POURCENTS
    + 'Combien d\'élèves viennent ' + sel('k', MOYENS_TXT) + ' ?\n\n$?$ élèves',
    POURCENT_VARS + [var('k', '1..4')],
    ['{{eval:10*(' + K_EFF + ')}}'],
    ['On lit le pourcentage : $' + '{{eval:5*(' + K_EFF + ')}}~\\%$ des $200$ élèves.',
     '$1~\\%$ de $200$, c\'est $2$ élèves ; donc $' + '{{eval:5*(' + K_EFF + ')}}'
     + '~\\%$, c\'est ${{eval:5*(' + K_EFF + ')}} \\times 2 = ' + col('{{eval:10*(' + K_EFF + ')}}')
     + '$ élèves.'],
    POURCENT_CONDS)

V_POURC = {'a': 3, 'b': 5, 'c': 8, 'd': 4}
MODELES.append(modele(
    '08-interpreter-un-diagramme-circulaire', 'Interpréter un diagramme circulaire',
    'Exploiter un diagramme circulaire en pourcentages : la catégorie la plus utilisée, le nombre'
    ' d\'élèves d\'une catégorie sur 200',
    R, 'diagrammes circulaires', 2, [PLUS_UTILISE, NOMBRE_ELEVES],
    [spec('Bus le plus utilisé', 0, V_POURC | {'r': 2}, '2', 'correct'),
     spec('Erreur : vélo', 0, V_POURC | {'r': 2}, '1', 'incorrect'),
     spec('Vélo : 25 % de 200 = 50', 1, V_POURC | {'k': 2}, '50', 'correct'),
     spec('Erreur : le pourcentage recopié', 1, V_POURC | {'k': 2}, '25', 'incorrect')]))

# --- Graphiques d'évolution (09, 10) ------------------------------------------------------------

ANNEES = list(range(2016, 2023))
Y = [f'y{j}' for j in range(len(ANNEES))]
NOMS_F = ['f', 'g', 'h', 'p', 'q', 's']


def evolution(titre_y, ymax, grille_y):
    segs = ''.join(
        f'{NOMS_F[j]}(x) = {{{{{Y[j]}}}}} + ({{{{{Y[j + 1]}}}}} - ({{{{{Y[j]}}}}}))*(x - {ANNEES[j]})'
        f' sur [{ANNEES[j]} ; {ANNEES[j + 1]}]   bleu\n'
        for j in range(len(ANNEES) - 1))
    return ('\n\n```courbe\nx: 2015 ; 2023\ny: 0 ; ' + str(ymax) + '\ngrille: 1 ; ' + str(grille_y)
            + '\naxes: x = Année ; y = ' + titre_y + '\n' + segs + '```\n\n')


EVOL_LIRE = evolution('Visiteurs (milliers)', 14, 1)
SEL_ANNEE = sel('k', ['{{' + y + '}}' for y in Y])

# --- 09. 5-077 : lire un graphique ------------------------------------------------------------

LIRE_GRAPH = variation(
    'Ce graphique donne le nombre de visiteurs d\'un musée chaque année, en milliers.' + EVOL_LIRE
    + 'Combien de milliers de visiteurs le musée a-t-il reçus en ${{eval:2015+k}}$ ?\n\n'
    '$?$ milliers',
    [var(y, '2..13') for y in Y] + [var('k', '2..7')],
    [SEL_ANNEE],
    ['On part de ${{eval:2015+k}}$ sur l\'axe horizontal, on monte jusqu\'à la ligne, puis on lit'
     ' la valeur sur l\'axe vertical.',
     'En ${{eval:2015+k}}$, le musée a reçu ' + m(SEL_ANNEE) + ' milliers de visiteurs.'])
LIRE_GRAPH_INVERSE = variation(
    'Ce graphique donne le nombre de visiteurs d\'un musée chaque année, en milliers.' + EVOL_LIRE
    + 'En quelle année le musée a-t-il reçu $' + SEL_ANNEE + '$ milliers de visiteurs ?\n\n$?$',
    [var(y, '2..13') for y in Y] + [var('k', '1..7')],
    ['{{eval:2015+k}}'],
    ['On part de $' + SEL_ANNEE + '$ sur l\'axe vertical, on va jusqu\'à la ligne, puis on'
     ' descend lire l\'année.',
     'C\'est en ' + m('{{eval:2015+k}}') + '.'],
    tous_differents(Y))

V_GRAPH = dict(zip(Y, [5, 7, 6, 9, 4, 8, 11]))
MODELES.append(modele(
    '09-lire-un-graphique', 'Lire un graphique',
    'Lire une valeur sur un graphique d\'évolution (quelle est la valeur en 2020 ?), ou l\'année'
    ' qui correspond à une valeur',
    R, 'courbes et repères', 1, [LIRE_GRAPH, LIRE_GRAPH_INVERSE],
    [spec('2020 : 4', 0, V_GRAPH | {'k': 5}, '4', 'correct'),
     spec('Erreur : année voisine', 0, V_GRAPH | {'k': 5}, '9', 'incorrect'),
     spec('11 milliers : 2022', 1, V_GRAPH | {'k': 7}, '2022', 'correct'),
     spec('Erreur : la valeur recopiée', 1, V_GRAPH | {'k': 7}, '11', 'incorrect')]))

# --- 10. 5-135 : interpréter un graphique ------------------------------------------------------

INTERVALLES = [f'Entre ${ANNEES[j]}$ et ${ANNEES[j + 1]}$' for j in range(len(ANNEES) - 1)]
D = [f'u{j}' for j in range(1, 7)]


def cumul(debut):
    """y0 = debut, y_j = y_{j-1} + u_j."""
    return [var('y0', debut)] + [var(Y[j], f'eval:{Y[j - 1]}+{D[j - 1]}') for j in range(1, 7)]


EVOL_INTERP = evolution('Abonnés (centaines)', 22, 2)
HAUSSE = variation(
    'Ce graphique donne le nombre d\'abonnés d\'une médiathèque chaque année, en centaines.'
    + EVOL_INTERP + 'Entre quelles années le nombre d\'abonnés a-t-il **le plus augmenté** ?'
    + choix(INTERVALLES),
    [var('t', '1..6'), var('g', '4..5')] + [var(f'w{j}', '0..2') for j in range(1, 7)]
    + [var(D[j], '{{if:t==' + str(j + 1) + '|{{g}}|{{w' + str(j + 1) + '}}}}') for j in range(6)]
    + cumul('2..4'),
    ['{{eval:t-1}}'],
    ['On cherche le segment qui **monte le plus** : c\'est là que la hausse est la plus forte.',
     'Entre ' + m(sel('t', [str(a) for a in ANNEES[:-1]])) + ' et '
     + m(sel('t', [str(a) for a in ANNEES[1:]])) + ', le nombre passe de $'
     + sel('t', ['{{' + y + '}}' for y in Y[:-1]]) + '$ à $'
     + sel('t', ['{{' + y + '}}' for y in Y[1:]]) + '$ centaines : $+{{g}}$ centaines, la plus'
     ' forte hausse.'])
BAISSE = variation(
    'Ce graphique donne le nombre d\'abonnés d\'une médiathèque chaque année, en centaines.'
    + EVOL_INTERP + 'Entre quelles années le nombre d\'abonnés a-t-il **baissé** ?'
    + choix(INTERVALLES),
    [var('t', '1..6'), var('g', '1..3')] + [var(f'w{j}', '1..3') for j in range(1, 7)]
    + [var(D[j], '{{if:t==' + str(j + 1) + '|{{eval:-g}}|{{w' + str(j + 1) + '}}}}')
       for j in range(6)]
    + cumul('3..6'),
    ['{{eval:t-1}}'],
    ['On cherche le segment qui **descend**.',
     'Entre ' + m(sel('t', [str(a) for a in ANNEES[:-1]])) + ' et '
     + m(sel('t', [str(a) for a in ANNEES[1:]])) + ', le nombre passe de $'
     + sel('t', ['{{' + y + '}}' for y in Y[:-1]]) + '$ à $'
     + sel('t', ['{{' + y + '}}' for y in Y[1:]]) + '$ centaines : il baisse. Partout ailleurs, il'
     ' augmente.'])


def v_evol(debut, us, t, g):
    ys = [debut]
    for u in us:
        ys.append(ys[-1] + u)
    return ({'t': t, 'g': g} | {f'w{j + 1}': (us[j] if j + 1 != t else 1) for j in range(6)}
            | dict(zip(D, us)) | dict(zip(Y, ys)))


V_HAUSSE = v_evol(3, [1, 0, 5, 2, 1, 2], 3, 5)
V_BAISSE = v_evol(4, [2, 1, 3, -2, 1, 2], 4, 2)
MODELES.append(modele(
    '10-interpreter-un-graphique', 'Interpréter un graphique',
    'Exploiter un graphique d\'évolution : entre quelles années la valeur a le plus augmenté,'
    ' entre quelles années elle a baissé',
    R, 'courbes et repères', 2, [HAUSSE, BAISSE],
    [spec('Plus forte hausse : 2018-2019', 0, V_HAUSSE, '2', 'correct'),
     spec('Erreur : la plus haute valeur (2021-2022)', 0, V_HAUSSE, '5', 'incorrect'),
     spec('Baisse : 2019-2020', 1, V_BAISSE, '3', 'correct'),
     spec('Erreur : 2018-2019', 1, V_BAISSE, '2', 'incorrect')]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, mod in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(mod, f, ensure_ascii=False, indent='\t')
        f.write('\n')
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
