"""Écrit les 6 modèles du lot 8 « Opérations » de la 5e dans scripts/questions/5-operations/.

Phase 0 validée par David le 2026-11-02 (§ 19 du journal `docs/wip/questions-5-progress.md`) ;
un point par modèle :

| #  | Point | Titre | Réponse | Catégorie, niveau |
| 01 | 5-001 | Problèmes à deux opérations | case | Décimaux › Problèmes › Plusieurs opérations, 1 |
| 02 | 5-001 | Contrôler la vraisemblance d'un résultat | choix parmi 3 | Décimaux › Problèmes › Vraisemblance, 1 |
| 03 | 5-002 | Choisir l'opération | choix parmi 4 | Décimaux › Problèmes › Choisir l'opération, 1 |
| 04 | 5-005 | Traduire un problème en une seule expression | case | Entiers › Priorités opératoires › Traduire en une expression, 1 |
| 05 | 5-116 | Traduire une succession d'opérations | case | idem, 2 |
| 06 | 5-117 | Traduire un programme de calcul | case | idem, 3 |

Bornes : `cycle4.json`, 5e (5-001 : décimaux positifs ; 5-005, 5-116, 5-117 : une seule
expression, avec ou sans parenthèses). Décimaux positifs, au plus 2 décimales, résultats < 1 000 ;
04-06 en entiers. Le nœud et le tag sont posés par la migration de rangement, après le
`--publier` de David.

Juge mesuré le 2026-11-02 (04-06, `products: off` comme en 4e, `form` strict par défaut) :
- la valeur (« 7 » pour 3 × 2 + 1) et un calcul à moitié fait (« 6 + 1 », « 8 × 2 ») : forme
  refusée (`bad_form`, 0 point) ;
- le mauvais parenthésage (3 × (2 + 1), 5 + 3 × 2) : faux ;
- l'ordre commutatif (1 + 3 × 2, 2 × (5 + 3)) : juste ; ÷ et : justes tous deux ;
- des parenthèses superflues ((3 × 2) + 1) : juste mais perfectible (`brackets`, ambre) ;
- la forme développée (5 × 2 + 3 × 2 pour (5 + 3) × 2) : forme refusée.

Décisions et pièges :
- 01, 02 : prix en euros, `zeros` à `off` (7,50 € et 7,5 € justes) ; un prix s'écrit toujours
  avec deux décimales dans l'énoncé (`euros()`, un `eval` retirerait le zéro) ;
- choix en case choix (bloc ```choix, ADR 0033), le bon choix écrit en premier (indice 0) ;
- montants en `\\unit{€}`, jamais « : » juste après un montant ;
- variables `e` et `i` interdites dans les `eval`.

    python3 docs/wip/questions/lot-5-operations.py scripts/questions/5-operations
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


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + l + '\n' for l in lignes) + '```'


def euros(c):
    """Montant de `c` centimes, toujours à deux décimales (« 7.50 », « 0.35 »)."""
    return ('{{eval:floor(' + c + '/100)}}.{{eval:floor(mod(' + c + ',100)/10)}}{{eval:mod('
            + c + ',10)}}')


def prix(c):
    """Montant en ligne, avec son unité : $7.50~\\unit{€}$."""
    return '$' + euros(c) + EURO + '$'


def ev(x):
    return '{{eval:' + x + '}}'


def programme(etapes):
    return '\n\n' + ''.join('- ' + e + '\n' for e in etapes)


EURO = '~\\unit{€}'
X = '\\times'
DIV = '\\div'
SANS_ZEROS = {'constraints': {'zeros': 'off'}}
# 3 × 2 + 1 et 2 × 3 + 1 : le signe × n'est pas une maladresse (lot 8 de 4e, `products: off`)
EXPRESSION = {'constraints': {'products': 'off'}}
DECIMAUX = 'Décimaux'
PROBLEMES = 'Problèmes'
MODELES = []

# --- 1. 5-001 : problèmes à deux opérations ------------------------------------------------

DEUX_ETAPES = ('**Problème à deux étapes.** On cherche d\'abord un résultat intermédiaire, puis'
               ' on s\'en sert pour répondre à la question.')

# Achat : n articles à P centimes et un article à Q centimes ; total n·P + Q
ACHAT = variation(
    'Léa achète ${{n}}$ cahiers à ' + prix('P') + ' l\'un et une trousse à ' + prix('Q')
    + '. Combien paie-t-elle en tout ?\n\n$?' + EURO + '$',
    [var('n', '2..6'), var('p', '11..49'), var('P', 'eval:10*p+5'), var('q', '15..99'),
     var('Q', 'eval:10*q'), var('T', 'eval:n*P')],
    [ev('(n*P+Q)/100;d')],
    [DEUX_ETAPES,
     'Prix des cahiers : ${{n}} ' + X + ' ' + euros('P') + ' = ' + euros('T') + EURO + '$.',
     'Prix total : $' + euros('T') + ' + ' + euros('Q') + ' = ' + col(euros('(T+Q)')) + EURO
     + '$.'],
    ['mod(q,10)!=0'])

# Rendu de monnaie : n baguettes à P centimes, payées avec un billet de B euros
MONNAIE = variation(
    'Malik achète ${{n}}$ baguettes à ' + prix('P') + ' l\'une. Il paie avec un billet de'
    ' $' + '{{B}}' + EURO + '$. Combien la boulangère lui rend-elle ?\n\n$?' + EURO + '$',
    [var('n', '2..5'), var('p', '17..78'), var('P', 'eval:5*p'), var('B', '10|20'),
     var('T', 'eval:n*P')],
    [ev('(100*B-n*P)/100;d')],
    [DEUX_ETAPES,
     'Prix des baguettes : ${{n}} ' + X + ' ' + euros('P') + ' = ' + euros('T') + EURO + '$.',
     'Monnaie rendue : ${{B}} - ' + euros('T') + ' = ' + col(euros('(100*B-T)')) + EURO + '$.'],
    ['100*B-n*P>=100'])

# Partage après dépense : k amis ont B euros, dépensent D centimes, partagent le reste (S chacun)
PARTAGE = variation(
    '${{k}}$ amis ont $' + '{{B}}' + EURO + '$ à eux tous. Ils dépensent ' + prix('D')
    + ' pour le goûter, puis se partagent ce qui reste à parts égales. Combien chacun'
    ' reçoit-il ?\n\n$?' + EURO + '$',
    [var('k', '2..4'), var('B', '20|30|40|50'), var('s', '30..198'), var('S', 'eval:5*s'),
     var('R', 'eval:k*S'),
     var('D', 'eval:100*B-R')],
    [ev('S/100;d')],
    [DEUX_ETAPES,
     'Ce qui reste : ${{B}} - ' + euros('D') + ' = ' + euros('R') + EURO + '$.',
     'Part de chacun : $' + euros('R') + ' ' + DIV + ' {{k}} = ' + col(euros('S')) + EURO + '$.'],
    ['D>=150'])

# Longueur : ruban de L cm, n morceaux de M cm coupés ; reste en mètres
RUBAN = variation(
    'Un ruban mesure $' + ev('L/100;d') + '~\\unit{m}$. Inès en coupe ${{n}}$ morceaux de'
    ' $' + ev('M/100;d') + '~\\unit{m}$ chacun. Quelle longueur de ruban reste-t-il ?\n\n'
    '$?~\\unit{m}$',
    [var('l', '15..48'), var('L', 'eval:10*l'), var('n', '2..4'), var('m', '2..9'),
     var('M', 'eval:10*m+5'), var('C', 'eval:n*M')],
    [ev('(L-n*M)/100;d')],
    [DEUX_ETAPES,
     'Longueur coupée : ${{n}} ' + X + ' ' + ev('M/100;d') + ' = ' + ev('C/100;d')
     + '~\\unit{m}$.',
     'Longueur restante : $' + ev('L/100;d') + ' - ' + ev('C/100;d') + ' = '
     + col(ev('(L-C)/100;d')) + '~\\unit{m}$.'],
    ['mod(l,10)!=0', 'L-n*M>=20'])

SPEC_ACHAT = {'n': 4, 'p': 23, 'P': 235, 'q': 32, 'Q': 320, 'T': 940}
SPEC_MONNAIE = {'n': 3, 'p': 23, 'P': 115, 'B': 10, 'T': 345}
SPEC_PARTAGE = {'k': 3, 'B': 30, 's': 129, 'S': 645, 'R': 1935, 'D': 1065}
SPEC_RUBAN = {'l': 25, 'L': 250, 'n': 3, 'm': 4, 'M': 45, 'C': 135}
MODELES.append(modele(
    '01-problemes-a-deux-operations', 'Problèmes à deux opérations',
    'Résoudre un problème à deux étapes avec des décimaux : achat de plusieurs articles, monnaie'
    ' rendue, partage de ce qui reste après une dépense, longueur restante',
    DECIMAUX, PROBLEMES, 'Plusieurs opérations', 1, [ACHAT, MONNAIE, PARTAGE, RUBAN],
    [spec('4 × 2,35 + 3,20 = 12,6', 0, SPEC_ACHAT, '12,6', 'correct'),
     spec('12,60 accepté', 0, SPEC_ACHAT, '12,60', 'correct'),
     spec('Erreur : les cahiers seulement (9,4)', 0, SPEC_ACHAT, '9,4', 'incorrect'),
     spec('Erreur : 2,35 + 3,20 (5,55)', 0, SPEC_ACHAT, '5,55', 'incorrect'),
     spec('10 − 3 × 1,15 = 6,55', 1, SPEC_MONNAIE, '6,55', 'correct'),
     spec('Erreur : le prix payé (3,45)', 1, SPEC_MONNAIE, '3,45', 'incorrect'),
     spec('Erreur : 10 − 1,15 (8,85)', 1, SPEC_MONNAIE, '8,85', 'incorrect'),
     spec('(30 − 10,65) ÷ 3 = 6,45', 2, SPEC_PARTAGE, '6,45', 'correct'),
     spec('Erreur : le reste (19,35)', 2, SPEC_PARTAGE, '19,35', 'incorrect'),
     spec('Erreur : 30 ÷ 3 (10)', 2, SPEC_PARTAGE, '10', 'incorrect'),
     spec('2,5 − 3 × 0,45 = 1,15', 3, SPEC_RUBAN, '1,15', 'correct'),
     spec('Erreur : la longueur coupée (1,35)', 3, SPEC_RUBAN, '1,35', 'incorrect'),
     spec('Erreur : 2,5 − 0,45 (2,05)', 3, SPEC_RUBAN, '2,05', 'incorrect')],
    delay=90, options=SANS_ZEROS))

# --- 2. 5-001 : contrôler la vraisemblance --------------------------------------------------
# Trois résultats : le bon (indice 0), une virgule mal placée, une mauvaise opération.

VRAISEMBLANCE = ('**Vraisemblance.** Avant de calculer, on cherche un **ordre de grandeur** en'
                 ' arrondissant les nombres ; un résultat très loin de cet ordre de grandeur est'
                 ' faux.')
QUESTION_VRAI = ' Quel résultat est vraisemblable ?'

# Achat : n cahiers à P centimes et un stylo à Q centimes ; bon : n·P + Q ; virgule : ×10 ;
# mauvaise opération : n + P + Q (addition au lieu de la multiplication)
VRAI_ACHAT = variation(
    'Tom achète ${{n}}$ cahiers à ' + prix('P') + ' l\'un et un stylo à ' + prix('Q')
    + '.' + QUESTION_VRAI
    + choix([prix('T'), prix('(10*T)'), prix('(100*n+P+Q)')]),
    [var('n', '3..8'), var('p', '41..99'), var('P', 'eval:5*p'), var('q', '21..58'),
     var('Q', 'eval:5*q'), var('T', 'eval:n*P+Q')],
    ['0'],
    [VRAISEMBLANCE,
     'Un cahier coûte un peu {{if:mod(P,100)<50|plus|moins}} de $' + ev('round(P/100)')
     + EURO + '$ : ${{n}}$ cahiers coûtent environ ${{n}} ' + X + ' ' + ev('round(P/100)')
     + ' = ' + ev('n*round(P/100)') + EURO + '$, et le stylo ajoute un peu.',
     'Calcul exact : ${{n}} ' + X + ' ' + euros('P') + ' + ' + euros('Q') + ' = '
     + col(euros('T')) + EURO + '$. Les deux autres résultats sont trop grands (virgule mal'
     ' placée) ou trop petits (on a additionné au lieu de multiplier).'],
    ['mod(P,100)!=50', '100*n+P+Q!=T'])

# Ruban de L cm, n morceaux de M cm : bon L − n·M ; virgule ÷10 ; mauvaise opération L + n·M
VRAI_RUBAN = variation(
    'Un ruban mesure $' + ev('L/100;d') + '~\\unit{m}$. On en coupe ${{n}}$ morceaux de $'
    + ev('M/100;d') + '~\\unit{m}$. On cherche la longueur qui reste.' + QUESTION_VRAI
    + choix(['$' + ev('R/100;d') + '~\\unit{m}$', '$' + ev('R/1000;d') + '~\\unit{m}$',
             '$' + ev('(L+n*M)/100;d') + '~\\unit{m}$']),
    [var('l', '30..90'), var('L', 'eval:10*l'), var('n', '2..5'), var('m', '3..9'),
     var('M', 'eval:10*m+5'), var('R', 'eval:L-n*M')],
    ['0'],
    [VRAISEMBLANCE,
     'Il reste **moins** que la longueur du ruban, $' + ev('L/100;d') + '~\\unit{m}$ : on'
     ' écarte $' + ev('(L+n*M)/100;d') + '~\\unit{m}$. On coupe environ ${{n}} ' + X
     + ' ' + ev('round(M/10)/10;d') + ' = ' + ev('n*round(M/10)/10;d') + '~\\unit{m}$ : il'
     ' reste plus de $' + ev('R/1000;d') + '~\\unit{m}$.',
     'Calcul exact : $' + ev('L/100;d') + ' - {{n}} ' + X + ' ' + ev('M/100;d') + ' = '
     + col(ev('R/100;d')) + '~\\unit{m}$.'],
    ['R>=200'])

# Partage : k amis paient un repas de A centimes avec une réduction de r euros ; part S ;
# virgule ×10 ; mauvaise opération (A − 100r) × k
VRAI_PARTAGE = variation(
    '${{k}}$ amis partagent à parts égales un repas de ' + prix('A') + ', après une'
    ' réduction de $' + '{{r}}' + EURO + '$. On cherche ce que paie chacun.' + QUESTION_VRAI
    + choix([prix('S'), prix('(10*S)'), prix('(k*(A-100*r))')]),
    [var('k', '3..5'), var('s', '170..480'), var('S', 'eval:5*s'), var('r', '5|10'),
     var('A', 'eval:k*S+100*r')],
    ['0'],
    [VRAISEMBLANCE,
     'Après la réduction, le repas coûte $' + euros('(A-100*r)') + EURO + '$ : chacun paie'
     ' **moins** que ce prix. Ordre de grandeur : $' + ev('round((A-100*r)/100)') + ' ' + DIV
     + ' {{k}}$, à peu près $' + ev('round((A-100*r)/(100*k))') + EURO + '$ chacun.',
     'Calcul exact : $(' + euros('A') + ' - {{r}}) ' + DIV + ' {{k}} = ' + euros('(A-100*r)')
     + ' ' + DIV + ' {{k}} = ' + col(euros('S')) + EURO + '$.'])

MODELES.append(modele(
    '02-controler-la-vraisemblance', 'Contrôler la vraisemblance d\'un résultat',
    'Repérer, par un ordre de grandeur, le résultat vraisemblable d\'un problème à deux étapes'
    ' parmi trois : le bon, une virgule mal placée, une mauvaise opération',
    DECIMAUX, PROBLEMES, 'Vraisemblance', 1, [VRAI_ACHAT, VRAI_RUBAN, VRAI_PARTAGE],
    [spec('Le bon total', 0, {'n': 4, 'p': 47, 'P': 235, 'q': 24, 'Q': 120, 'T': 1060}, '0', 'correct'),
     spec('Erreur : virgule (106 €)', 0, {'n': 4, 'p': 47, 'P': 235, 'q': 24, 'Q': 120, 'T': 1060}, '1',
          'incorrect'),
     spec('Erreur : addition (7,55 €)', 0, {'n': 4, 'p': 47, 'P': 235, 'q': 24, 'Q': 120, 'T': 1060}, '2',
          'incorrect'),
     spec('La bonne longueur', 1, {'l': 50, 'L': 500, 'n': 3, 'm': 8, 'M': 85, 'R': 245}, '0', 'correct'),
     spec('Erreur : plus long que le ruban', 1, {'l': 50, 'L': 500, 'n': 3, 'm': 8, 'M': 85, 'R': 245}, '2',
          'incorrect'),
     spec('La bonne part', 2, {'k': 4, 's': 247, 'S': 1235, 'r': 10, 'A': 5940}, '0', 'correct'),
     spec('Erreur : virgule (123,50 €)', 2, {'k': 4, 's': 247, 'S': 1235, 'r': 10, 'A': 5940}, '1',
          'incorrect'),
     spec('Erreur : multiplié', 2, {'k': 4, 's': 247, 'S': 1235, 'r': 10, 'A': 5940}, '2', 'incorrect')],
    delay=60))

# --- 3. 5-002 : choisir l'opération --------------------------------------------------------
# Quatre calculs avec les deux nombres de l'énoncé ; le bon écrit en premier (indice 0).

SENS = {
    '+': '**Addition** : on réunit deux quantités.',
    '-': '**Soustraction** : on cherche un écart, ce qui reste ou ce qui manque.',
    '*': '**Multiplication** : on répète la même quantité plusieurs fois (prix × quantité).',
    '/': '**Division** : on partage en parts égales, ou on cherche combien de fois une quantité'
         ' tient dans une autre.',
}


def calculs(a, b, bon):
    ops = {'+': '+', '-': '-', '*': X, '/': DIV}
    ordre = [bon] + [o for o in '+-*/' if o != bon]
    return choix(['$' + a + ' ' + ops[o] + ' ' + b + '$' for o in ordre])


def operation(enonce, a, b, bon, variables, explication, conditions=None):
    return variation(
        enonce + ' Quel calcul donne la réponse ?' + calculs(a, b, bon), variables, ['0'],
        [SENS[bon], explication], conditions)


PARTAGE_JUS = operation(
    'On verse $' + ev('V/10;d') + '~\\unit{L}$ de jus, à parts égales, dans ${{b}}$ bouteilles.'
    ' On cherche la quantité de jus dans une bouteille.',
    ev('V/10;d'), '{{b}}', '/', [var('b', '3..6'), var('q', '12..45'), var('V', 'eval:b*q')],
    'On partage $' + ev('V/10;d') + '~\\unit{L}$ en ${{b}}$ parts égales : $' + col(
        ev('V/10;d') + ' ' + DIV + ' {{b}}') + '$.', ['mod(q,10)!=0'])
GROUPEMENT = operation(
    'On range ${{n}}$ œufs dans des boîtes de ${{b}}$. On cherche le nombre de boîtes'
    ' remplies.',
    '{{n}}', '{{b}}', '/', [var('b', '6|10|12'), var('q', '7..25'), var('n', 'eval:b*q')],
    'On cherche combien de fois ${{b}}$ tient dans ${{n}}$ : $' + col('{{n}} ' + DIV + ' {{b}}')
    + '$.')
ECART = operation(
    'Léna mesure $' + ev('A/100;d') + '~\\unit{m}$ et son frère $' + ev('B/100;d')
    + '~\\unit{m}$. On cherche de combien Léna est plus grande que son frère.',
    ev('A/100;d'), ev('B/100;d'), '-', [var('A', '140..175'), var('B', '110..139')],
    'On cherche l\'écart entre les deux tailles : $' + col(ev('A/100;d') + ' - ' + ev('B/100;d'))
    + '$.')
PRIX_QUANTITE = operation(
    'Les pommes coûtent ' + prix('P') + ' le kilogramme. Sami en achète ${{m}}~\\unit{kg}$.'
    ' On cherche le prix à payer.',
    euros('P'), '{{m}}', '*', [var('p', '14..39'), var('P', 'eval:10*p+5'), var('m', '2..6')],
    'On paie ${{m}}$ fois le prix d\'un kilogramme : $' + col(euros('P') + ' ' + X + ' {{m}}')
    + '$.')
REUNION = operation(
    'Un sac de riz pèse $' + ev('A/100;d') + '~\\unit{kg}$ et un sac de pâtes $' + ev('B/100;d')
    + '~\\unit{kg}$. On cherche la masse des deux sacs ensemble.',
    ev('A/100;d'), ev('B/100;d'), '+',
    [var('a', '21..99'), var('A', 'eval:5*a'), var('b', '21..99'), var('B', 'eval:5*b')],
    'On réunit les deux masses : $' + col(ev('A/100;d') + ' + ' + ev('B/100;d')) + '$.',
    ['a!=b'])

MODELES.append(modele(
    '03-choisir-l-operation', 'Choisir l\'opération',
    'Choisir l\'opération qui résout un problème : partage, groupement, écart, prix × quantité,'
    ' réunion de deux quantités',
    DECIMAUX, PROBLEMES, 'Choisir l\'opération', 1,
    [PARTAGE_JUS, GROUPEMENT, ECART, PRIX_QUANTITE, REUNION],
    [spec('Partage : division', 0, {'b': 5, 'q': 25, 'V': 125}, '0', 'correct'),
     spec('Erreur : multiplication', 0, {'b': 5, 'q': 25, 'V': 125}, '3', 'incorrect'),
     spec('Groupement : division', 1, {'b': 6, 'q': 14, 'n': 84}, '0', 'correct'),
     spec('Erreur : soustraction', 1, {'b': 6, 'q': 14, 'n': 84}, '2', 'incorrect'),
     spec('Écart : soustraction', 2, {'A': 152, 'B': 138}, '0', 'correct'),
     spec('Erreur : addition', 2, {'A': 152, 'B': 138}, '1', 'incorrect'),
     spec('Prix × quantité : multiplication', 3, {'p': 23, 'P': 235, 'm': 4}, '0', 'correct'),
     spec('Erreur : addition', 3, {'p': 23, 'P': 235, 'm': 4}, '1', 'incorrect'),
     spec('Réunion : addition', 4, {'a': 48, 'A': 240, 'b': 75, 'B': 375}, '0', 'correct'),
     spec('Erreur : multiplication', 4, {'a': 48, 'A': 240, 'b': 75, 'B': 375}, '2', 'incorrect')],
    delay=45))

# --- 4. 5-005 : traduire un problème en une seule expression ---------------------------------

UNE_EXPRESSION = ('**Une seule expression.** On écrit tout le calcul en une ligne, sans'
                  ' l\'effectuer. La multiplication est prioritaire sur l\'addition et la'
                  ' soustraction ; des **parenthèses** obligent à faire un calcul en premier.')
CONSIGNE = '\n\nÉcris le calcul en **une seule expression**, sans l\'effectuer.\n\n$?$'

ACHAT_SIMPLE = variation(
    'Léo achète ${{a}}$ cahiers à ${{b}}' + EURO + '$ l\'un et un stylo à ${{c}}' + EURO
    + '$. On cherche le prix payé.' + CONSIGNE,
    [var('a', '2..6'), var('b', '2..5'), var('c', '1..4')],
    ['{{a}}' + X + '{{b}}+{{c}}'],
    [UNE_EXPRESSION,
     'Prix des cahiers : ${{a}} ' + X + ' {{b}}$ ; on ajoute le stylo. La multiplication se'
     ' fait d\'abord, pas besoin de parenthèses :',
     '$$' + col('{{a}} ' + X + ' {{b}} + {{c}}') + '$$'])
DEUX_ACHATS = variation(
    'Au marché, Nora achète ${{a}}~\\unit{kg}$ de pommes à ${{b}}' + EURO + '$ le kilogramme et'
    ' ${{c}}$ melons à ${{d}}' + EURO + '$ l\'un. On cherche le prix payé.' + CONSIGNE,
    [var('a', '2..5'), var('b', '2..4'), var('c', '2..4'), var('d', '3..6')],
    ['{{a}}' + X + '{{b}}+{{c}}' + X + '{{d}}'],
    [UNE_EXPRESSION,
     'Pommes : ${{a}} ' + X + ' {{b}}$ ; melons : ${{c}} ' + X + ' {{d}}$ ; on ajoute les deux'
     ' prix. Les multiplications se font d\'abord :',
     '$$' + col('{{a}} ' + X + ' {{b}} + {{c}} ' + X + ' {{d}}') + '$$'],
    ['a!=c'])
RESTE = variation(
    'Inès a ${{a}}' + EURO + '$. Elle achète ${{b}}$ places de cinéma à ${{c}}' + EURO
    + '$ l\'une. On cherche ce qui lui reste.' + CONSIGNE,
    [var('b', '2..4'), var('c', '5..9'), var('a', '30|40|50')],
    ['{{a}}-{{b}}' + X + '{{c}}'],
    [UNE_EXPRESSION,
     'Prix des places : ${{b}} ' + X + ' {{c}}$ ; on l\'enlève à ${{a}}$. La multiplication se'
     ' fait d\'abord :',
     '$$' + col('{{a}} - {{b}} ' + X + ' {{c}}') + '$$'],
    ['b*c<a'])
PAGES = variation(
    'Chaque jour, Tom lit ${{a}}$ pages le matin et ${{b}}$ pages le soir. On cherche le nombre'
    ' de pages qu\'il lit en ${{c}}$ jours.' + CONSIGNE,
    [var('a', '5..15'), var('b', '5..15'), var('c', '3..7')],
    ['({{a}}+{{b}})' + X + '{{c}}'],
    [UNE_EXPRESSION,
     'En un jour : ${{a}} + {{b}}$ pages ; en ${{c}}$ jours, ${{c}}$ fois plus. L\'addition doit'
     ' se faire **d\'abord** : il faut des parenthèses.',
     '$$' + col('({{a}} + {{b}}) ' + X + ' {{c}}') + '$$'],
    ['a!=b'])

ABC = {'a': 3, 'b': 2, 'c': 1}
MODELES.append(modele(
    '04-traduire-un-probleme-en-une-expression', 'Traduire un problème en une seule expression',
    'Écrire en une seule expression, sans l\'effectuer, le calcul qui résout un problème :'
    ' 3 × 2 + 1, 2 × 3 + 3 × 5, 40 − 3 × 7, (8 + 6) × 5',
    'Entiers', 'Priorités opératoires', 'Traduire en une expression', 1,
    [ACHAT_SIMPLE, DEUX_ACHATS, RESTE, PAGES],
    [spec('3 × 2 + 1', 0, ABC, '3\\times2+1', 'correct'),
     spec('1 + 3 × 2 (ordre changé)', 0, ABC, '1+3\\times2', 'correct'),
     spec('2 × 3 + 1 (ordre changé)', 0, ABC, '2\\times3+1', 'correct'),
     spec('(3 × 2) + 1 : parenthèses superflues', 0, ABC, '(3\\times2)+1', 'unoptimal_form',
          ['brackets']),
     spec('Erreur : la valeur 7', 0, ABC, '7', 'bad_form', ['form']),
     spec('Erreur : 6 + 1 (calcul commencé)', 0, ABC, '6+1', 'bad_form', ['form']),
     spec('Erreur : 3 × (2 + 1)', 0, ABC, '3\\times(2+1)', 'incorrect'),
     spec('2 × 3 + 3 × 5', 1, {'a': 2, 'b': 3, 'c': 3, 'd': 5}, '2\\times3+3\\times5',
          'correct'),
     spec('Erreur : 2 × 3 + 3 + 5', 1, {'a': 2, 'b': 3, 'c': 3, 'd': 5}, '2\\times3+3+5',
          'incorrect'),
     spec('40 − 3 × 7', 2, {'a': 40, 'b': 3, 'c': 7}, '40-3\\times7', 'correct'),
     spec('Erreur : (40 − 3) × 7', 2, {'a': 40, 'b': 3, 'c': 7}, '(40-3)\\times7', 'incorrect'),
     spec('Erreur : 3 × 7 − 40', 2, {'a': 40, 'b': 3, 'c': 7}, '3\\times7-40', 'incorrect'),
     spec('(8 + 6) × 5', 3, {'a': 8, 'b': 6, 'c': 5}, '(8+6)\\times5', 'correct'),
     spec('5 × (6 + 8) (ordre changé)', 3, {'a': 8, 'b': 6, 'c': 5}, '5\\times(6+8)', 'correct'),
     spec('Erreur : 8 + 6 × 5 (parenthèses oubliées)', 3, {'a': 8, 'b': 6, 'c': 5},
          '8+6\\times5', 'incorrect'),
     spec('Développé : 8 × 5 + 6 × 5 (forme refusée)', 3, {'a': 8, 'b': 6, 'c': 5},
          '8\\times5+6\\times5', 'bad_form', ['form'])],
    delay=60, options=EXPRESSION))

# --- 5. 5-116 : traduire une succession d'opérations -----------------------------------------

SUCCESSION = ('**Succession d\'opérations.** On écrit les opérations dans l\'ordre donné. Quand'
              ' une addition ou une soustraction doit être faite **avant** une multiplication'
              ' ou une division, on la met entre parenthèses.')
CONSIGNE_SUCC = '\n\nÉcris ce calcul en **une seule expression**, sans l\'effectuer.\n\n$?$'

AJOUTE_MULTIPLIE = variation(
    'Ajoute ${{a}}$ à ${{b}}$, puis multiplie le résultat par ${{c}}$.' + CONSIGNE_SUCC,
    [var('a', '2..9'), var('b', '2..9'), var('c', '2..9')],
    ['({{b}}+{{a}})' + X + '{{c}}'],
    [SUCCESSION,
     'D\'abord ${{b}} + {{a}}$ ; la multiplication vient **après** : parenthèses.',
     '$$' + col('({{b}} + {{a}}) ' + X + ' {{c}}') + '$$'],
    ['a!=b'])
MULTIPLIE_AJOUTE = variation(
    'Multiplie ${{a}}$ par ${{b}}$, puis ajoute ${{c}}$ au résultat.' + CONSIGNE_SUCC,
    [var('a', '2..9'), var('b', '2..9'), var('c', '2..9')],
    ['{{a}}' + X + '{{b}}+{{c}}'],
    [SUCCESSION,
     'D\'abord ${{a}} ' + X + ' {{b}}$ ; la multiplication est déjà prioritaire : pas besoin de'
     ' parenthèses.',
     '$$' + col('{{a}} ' + X + ' {{b}} + {{c}}') + '$$'],
    ['a!=b'])
SOUSTRAIS_DIVISE = variation(
    'Soustrais ${{b}}$ de ${{a}}$, puis divise le résultat par ${{c}}$.' + CONSIGNE_SUCC,
    [var('c', '2..6'), var('q', '2..9'), var('b', '2..9'), var('a', 'eval:c*q+b')],
    ['({{a}}-{{b}})' + DIV + '{{c}}'],
    [SUCCESSION,
     'D\'abord ${{a}} - {{b}}$ ; la division vient **après** : parenthèses.',
     '$$' + col('({{a}} - {{b}}) ' + DIV + ' {{c}}') + '$$'])
DIVISE_SOUSTRAIS = variation(
    'Divise ${{a}}$ par ${{b}}$, puis soustrais ${{c}}$ du résultat.' + CONSIGNE_SUCC,
    [var('b', '2..9'), var('q', '4..9'), var('c', '1..3'), var('a', 'eval:b*q')],
    ['{{a}}' + DIV + '{{b}}-{{c}}'],
    [SUCCESSION,
     'D\'abord ${{a}} ' + DIV + ' {{b}}$ ; la division est déjà prioritaire : pas besoin de'
     ' parenthèses.',
     '$$' + col('{{a}} ' + DIV + ' {{b}} - {{c}}') + '$$'])

MODELES.append(modele(
    '05-traduire-une-succession-d-operations', 'Traduire une succession d\'opérations',
    'Écrire en une seule expression une succession donnée d\'opérations : « ajoute 3 à 5, puis'
    ' multiplie le résultat par 2 » s\'écrit (5 + 3) × 2 ; parenthèses seulement si besoin',
    'Entiers', 'Priorités opératoires', 'Traduire en une expression', 2,
    [AJOUTE_MULTIPLIE, MULTIPLIE_AJOUTE, SOUSTRAIS_DIVISE, DIVISE_SOUSTRAIS],
    [spec('(5 + 3) × 2', 0, {'a': 3, 'b': 5, 'c': 2}, '(5+3)\\times2', 'correct'),
     spec('2 × (3 + 5) (ordre changé)', 0, {'a': 3, 'b': 5, 'c': 2}, '2\\times(3+5)', 'correct'),
     spec('Erreur : 5 + 3 × 2 (parenthèses oubliées)', 0, {'a': 3, 'b': 5, 'c': 2},
          '5+3\\times2', 'incorrect'),
     spec('Erreur : la valeur 16', 0, {'a': 3, 'b': 5, 'c': 2}, '16', 'bad_form', ['form']),
     spec('Erreur : 8 × 2 (calcul commencé)', 0, {'a': 3, 'b': 5, 'c': 2}, '8\\times2',
          'bad_form', ['form']),
     spec('4 × 7 + 3', 1, {'a': 4, 'b': 7, 'c': 3}, '4\\times7+3', 'correct'),
     spec('(4 × 7) + 3 : parenthèses superflues', 1, {'a': 4, 'b': 7, 'c': 3},
          '(4\\times7)+3', 'unoptimal_form', ['brackets']),
     spec('Erreur : 4 × (7 + 3)', 1, {'a': 4, 'b': 7, 'c': 3}, '4\\times(7+3)', 'incorrect'),
     spec('(17 − 5) ÷ 4', 2, {'c': 4, 'q': 3, 'b': 5, 'a': 17}, '(17-5)\\div4', 'correct'),
     spec('(17 − 5) : 4', 2, {'c': 4, 'q': 3, 'b': 5, 'a': 17}, '(17-5):4', 'correct'),
     spec('Erreur : 17 − 5 ÷ 4', 2, {'c': 4, 'q': 3, 'b': 5, 'a': 17}, '17-5\\div4',
          'incorrect'),
     spec('Erreur : (5 − 17) ÷ 4', 2, {'c': 4, 'q': 3, 'b': 5, 'a': 17}, '(5-17)\\div4',
          'incorrect'),
     spec('24 ÷ 6 − 1', 3, {'b': 6, 'q': 4, 'c': 1, 'a': 24}, '24\\div6-1', 'correct'),
     spec('Erreur : 24 ÷ (6 − 1)', 3, {'b': 6, 'q': 4, 'c': 1, 'a': 24}, '24\\div(6-1)',
          'incorrect')],
    delay=60, options=EXPRESSION))

# --- 6. 5-117 : traduire un programme de calcul ----------------------------------------------

PROGRAMME = ('**Programme de calcul.** Chaque étape s\'applique au **résultat** de la'
             ' précédente. Une addition ou une soustraction suivie d\'une multiplication se met'
             ' entre parenthèses.')
CONSIGNE_PROG = ('\nÉcris en **une seule expression** le calcul effectué par ce programme, sans'
                 ' l\'effectuer.\n\n$?$')
VOICI = 'Voici un programme de calcul :'

PROG_AJOUTE = variation(
    VOICI + programme(['choisir ${{n}}$ ;', 'ajouter ${{a}}$ ;',
                       'multiplier le résultat par ${{b}}$.']) + CONSIGNE_PROG,
    [var('n', '2..9'), var('a', '2..9'), var('b', '2..9')],
    ['({{n}}+{{a}})' + X + '{{b}}'],
    [PROGRAMME,
     '${{n}} + {{a}}$, puis on multiplie **ce résultat** par ${{b}}$ : parenthèses.',
     '$$' + col('({{n}} + {{a}}) ' + X + ' {{b}}') + '$$'],
    ['n!=a'])
PROG_TROIS = variation(
    VOICI + programme(['choisir ${{n}}$ ;', 'le multiplier par ${{a}}$ ;', 'ajouter ${{b}}$ ;',
                       'multiplier le résultat par ${{c}}$.']) + CONSIGNE_PROG,
    [var('n', '2..9'), var('a', '2..5'), var('b', '1..9'), var('c', '2..5')],
    ['({{n}}' + X + '{{a}}+{{b}})' + X + '{{c}}'],
    [PROGRAMME,
     'Les deux premières étapes : ${{n}} ' + X + ' {{a}} + {{b}}$ (la multiplication se fait'
     ' d\'abord, pas de parenthèses).',
     'On multiplie **tout ce résultat** par ${{c}}$ : parenthèses.',
     '$$' + col('({{n}} ' + X + ' {{a}} + {{b}}) ' + X + ' {{c}}') + '$$'],
    ['n!=a', 'a!=c'])
PROG_SOUSTRAIT = variation(
    VOICI + programme(['choisir ${{n}}$ ;', 'soustraire ${{a}}$ ;',
                       'multiplier le résultat par ${{b}}$ ;', 'ajouter ${{c}}$.'])
    + CONSIGNE_PROG,
    [var('a', '1..5'), var('n', '6..12'), var('b', '2..5'), var('c', '1..9')],
    ['({{n}}-{{a}})' + X + '{{b}}+{{c}}'],
    [PROGRAMME,
     '${{n}} - {{a}}$, puis on multiplie **ce résultat** par ${{b}}$ : $({{n}} - {{a}}) ' + X
     + ' {{b}}$.',
     'On ajoute ${{c}}$ à la fin : la multiplication se fait déjà avant, pas d\'autres'
     ' parenthèses.',
     '$$' + col('({{n}} - {{a}}) ' + X + ' {{b}} + {{c}}') + '$$'],
    ['b!=c'])

MODELES.append(modele(
    '06-traduire-un-programme-de-calcul', 'Traduire un programme de calcul',
    'Écrire en une seule expression le calcul d\'un programme de calcul à deux ou trois étapes :'
    ' « choisis 5, ajoute 3, multiplie par 2 » s\'écrit (5 + 3) × 2',
    'Entiers', 'Priorités opératoires', 'Traduire en une expression', 3,
    [PROG_AJOUTE, PROG_TROIS, PROG_SOUSTRAIT],
    [spec('(5 + 3) × 2', 0, {'n': 5, 'a': 3, 'b': 2}, '(5+3)\\times2', 'correct'),
     spec('2 × (5 + 3) (ordre changé)', 0, {'n': 5, 'a': 3, 'b': 2}, '2\\times(5+3)', 'correct'),
     spec('Erreur : 5 + 3 × 2', 0, {'n': 5, 'a': 3, 'b': 2}, '5+3\\times2', 'incorrect'),
     spec('Erreur : la valeur 16', 0, {'n': 5, 'a': 3, 'b': 2}, '16', 'bad_form', ['form']),
     spec('(4 × 3 + 5) × 2', 1, {'n': 4, 'a': 3, 'b': 5, 'c': 2}, '(4\\times3+5)\\times2',
          'correct'),
     spec('2 × (3 × 4 + 5) (ordre changé)', 1, {'n': 4, 'a': 3, 'b': 5, 'c': 2},
          '2\\times(3\\times4+5)', 'correct'),
     spec('((4 × 3) + 5) × 2 : parenthèses superflues', 1, {'n': 4, 'a': 3, 'b': 5, 'c': 2},
          '((4\\times3)+5)\\times2', 'unoptimal_form', ['brackets']),
     spec('Erreur : 4 × 3 + 5 × 2', 1, {'n': 4, 'a': 3, 'b': 5, 'c': 2}, '4\\times3+5\\times2',
          'incorrect'),
     spec('Erreur : 4 × (3 + 5) × 2', 1, {'n': 4, 'a': 3, 'b': 5, 'c': 2},
          '4\\times(3+5)\\times2', 'incorrect'),
     spec('(9 − 2) × 4 + 3', 2, {'a': 2, 'n': 9, 'b': 4, 'c': 3}, '(9-2)\\times4+3', 'correct'),
     spec('Erreur : 9 − 2 × 4 + 3', 2, {'a': 2, 'n': 9, 'b': 4, 'c': 3}, '9-2\\times4+3',
          'incorrect'),
     spec('Erreur : (9 − 2) × (4 + 3)', 2, {'a': 2, 'n': 9, 'b': 4, 'c': 3},
          '(9-2)\\times(4+3)', 'incorrect')],
    delay=60, options=EXPRESSION))

os.makedirs(DOSSIER, exist_ok=True)
for nom, mod in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(mod, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
