"""Écrit les 6 modèles du lot 7 « Puissances, racines, calcul littéral » de la 4e dans
scripts/questions/4-lot-7/.

Phase 0 validée par David le 2026-11-01 (§ 32 du journal `docs/wip/questions-4-progress.md`), un
point par modèle :

| # | Point | Titre                             | Catégorie, niveau                                          |
| 1 | 4-017 | Puissance d'un produit            | Puissances › Calculer › Puissance d'un produit, 2          |
| 2 | 4-018 | Problèmes avec des puissances     | Puissances › Problèmes › Situations, 1                     |
| 3 | 4-020 | Encadrer une racine carrée        | Racines carrées › Apprivoiser › Encadrer, 1                |
| 4 | 4-021 | Pairs et impairs                  | Calcul littéral › Produire une formule › Pairs et impairs, 1 |
| 5 | 4-023 | Démontrer avec le calcul littéral | Calcul littéral › Raisonner › Démontrer, 1                 |
| 6 | 4-071 | Mettre en équation ax + b = cx + d | Calcul littéral › Equations › Mettre en équation, 3       |

Bornes : `cycle4.json`, 4e (exposants entiers naturels ; 4-017 (ab)ⁿ = aⁿbⁿ ; 4-020 deux entiers
consécutifs, aire 20 → entre 4 et 5 ; 4-021 pair 2n, impair 2n + 1 ; 4-023 équivalence de
programmes, somme de 3 consécutifs ; 4-071 coefficients entiers relatifs, pas de x²). Le nœud et le
tag sont posés par la migration de rangement, après le `--publier` de David.

Décisions et pièges :
- 4-017 : forme puissance exigée quand la consigne la demande (`requiredForm: power`) ;
- 4-020 : n = m² + r (1 ≤ r ≤ 2m), donc jamais un carré et n ≤ 143 ;
- 4-021, 4-023 (expressions) : `form` et `products` coupées, toute écriture égale acceptée ;
- 4-071 : la solution est tirée d'abord, les coefficients s'en déduisent (solution entière) ;
- choix en case choix (bloc ```choix, ADR 0033), le bon choix écrit en premier (indice 0) ;
- jamais de variable `e` ni `i` dans les `eval`.

    python3 docs/wip/questions/lot-4-7.py scripts/questions/4-lot-7
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
    m = {'title': title, 'description': description, 'grades': ['4'], 'theme': theme,
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


def ev(x):
    return '{{eval:' + x + '}}'


def pw(base, expo):
    """Puissance base^expo ; expo est une expression de gabarit (`{{n}}`, `{{eval:…}}`)."""
    return base + '^{ ' + expo + ' }'


X = '\\times'
OPTIONS_EXPRESSION = {'constraints': {'form': 'off', 'products': 'off'}}
MODELES = []

# --- 1. 4-017 : puissance d'un produit ------------------------------------------------------

PRODUIT = ('**Puissance d\'un produit.** Pour tout entier naturel $n$ :'
           ' $(a ' + X + ' b)^n = a^n ' + X + ' b^n$.')
AB = [var('a', '2..5'), var('b', '2..5'), var('n', '2..6')]
A_DIFF_B = ['a!=b']

PRODUIT_TROUS = variation(
    'Complète.\n\n$$({{a}} ' + X + ' {{b}})' + pw('', '{{n}}') + ' = ' + pw('{{a}}', '?') + ' '
    + X + ' ' + pw('{{b}}', '?') + '$$',
    AB, ['{{n}}', '{{n}}'],
    [PRODUIT,
     '$$({{a}} ' + X + ' {{b}})' + pw('', '{{n}}') + ' = ' + pw('{{a}}', col('{{n}}')) + ' ' + X
     + ' ' + pw('{{b}}', col('{{n}}')) + '$$',
     'L\'exposant s\'applique à **chacun** des facteurs du produit.'],
    A_DIFF_B)

PRODUIT_UNE_PUISSANCE = variation(
    'Écris sous la forme d\'une seule puissance.\n\n$$' + pw('{{a}}', '{{n}}') + ' ' + X + ' '
    + pw('{{b}}', '{{n}}') + ' = ?$$',
    AB, [{'expectedAnswer': pw(ev('a*b'), '{{n}}'), 'requiredForm': 'power'}],
    [PRODUIT,
     'Les deux puissances ont le **même exposant** ${{n}}$ : on multiplie les nombres entre eux.',
     '$$' + pw('{{a}}', '{{n}}') + ' ' + X + ' ' + pw('{{b}}', '{{n}}') + ' = ({{a}} ' + X
     + ' {{b}})' + pw('', '{{n}}') + ' = ' + col(pw(ev('a*b'), '{{n}}')) + '$$'],
    A_DIFF_B)

PRODUIT_ASTUCE = variation(
    'Calcule astucieusement, sans calculatrice.\n\n$$' + pw('2', '{{n}}') + ' ' + X + ' '
    + pw('5', '{{n}}') + ' = ?$$',
    [var('n', '2..6')], [ev('10^n')],
    [PRODUIT,
     'Les deux puissances ont le même exposant : on regroupe $2 ' + X + ' 5 = 10$.',
     '$$' + pw('2', '{{n}}') + ' ' + X + ' ' + pw('5', '{{n}}') + ' = (2 ' + X + ' 5)'
     + pw('', '{{n}}') + ' = ' + pw('10', '{{n}}') + ' = ' + col('{{solution}}') + '$$'])

PRODUIT_CHOIX = variation(
    '$({{a}} ' + X + ' {{b}})' + pw('', '{{n}}') + '$ est égal à :'
    + choix(['$' + pw('{{a}}', '{{n}}') + ' ' + X + ' ' + pw('{{b}}', '{{n}}') + '$',
             '${{a}} ' + X + ' ' + pw('{{b}}', '{{n}}') + '$',
             '$' + pw('{{a}}', '{{n}}') + ' ' + X + ' {{b}}$',
             '$' + pw(ev('a*b'), ev('2*n')) + '$']),
    AB, ['0'],
    [PRODUIT,
     'L\'exposant porte sur **tout** le produit entre parenthèses, donc sur ${{a}}$ et sur ${{b}}$ :',
     '$$({{a}} ' + X + ' {{b}})' + pw('', '{{n}}') + ' = '
     + col(pw('{{a}}', '{{n}}') + ' ' + X + ' ' + pw('{{b}}', '{{n}}')) + '$$',
     'On n\'ajoute pas d\'exposants : ici, il n\'y a qu\'un exposant, ${{n}}$.'],
    A_DIFF_B)

S235 = {'a': 2, 'b': 3, 'n': 5}
MODELES.append(modele(
    '01-puissance-d-un-produit', 'Puissance d\'un produit',
    'Utiliser (ab)ⁿ = aⁿbⁿ : (3 × 4)² = 3^? × 4^? ; 2⁵ × 3⁵ en une seule puissance ;'
    ' 2⁴ × 5⁴ astucieusement',
    'Puissances', 'Calculer', 'Puissance d\'un produit', 2,
    [PRODUIT_TROUS, PRODUIT_UNE_PUISSANCE, PRODUIT_ASTUCE, PRODUIT_CHOIX],
    [spec('(2 × 3)⁵ = 2⁵ × 3⁵', 0, S235, ['5', '5'], 'correct'),
     spec('Erreur : 2⁵ × 3¹', 0, S235, ['5', '1'], 'incorrect'),
     spec('2⁵ × 3⁵ = 6⁵', 1, S235, '6^5', 'correct'),
     spec('7 776 : la valeur, pas la puissance demandée', 1, S235, '7776', 'bad_form',
          ['form']),
     spec('Erreur : 6¹⁰ (exposants ajoutés)', 1, S235, '6^{10}', 'incorrect'),
     spec('Erreur : 5⁵ (bases ajoutées)', 1, S235, '5^5', 'incorrect'),
     spec('2⁴ × 5⁴ = 10 000', 2, {'n': 4}, '10\\,000', 'correct'),
     spec('Erreur : 10⁸', 2, {'n': 4}, '100000000', 'incorrect'),
     spec('Erreur : 7⁴ = 2 401', 2, {'n': 4}, '2401', 'incorrect'),
     spec('(2 × 3)⁵ : 2⁵ × 3⁵', 3, S235, '0', 'correct'),
     spec('Erreur : 6¹⁰', 3, S235, '3', 'incorrect'),
     spec('Erreur : 2 × 3⁵', 3, S235, '1', 'incorrect')],
    delay=45))

# --- 2. 4-018 : problèmes avec des puissances -----------------------------------------------

DOUBLER = ('**Multiplier plusieurs fois par le même nombre.** Multiplier $n$ fois par $2$,'
           ' c\'est multiplier par $2^n$.')

BACTERIES = variation(
    'Une bactérie se divise en deux toutes les heures : chaque heure, le nombre de bactéries'
    ' double. Au départ, il y a une seule bactérie.\n\nCombien y a-t-il de bactéries au bout de'
    ' ${{n}}$ heures ?\n\nIl y a $' + pw('2', '?') + '$ bactéries, soit $?$ bactéries.',
    [var('n', '3..10')], ['{{n}}', ev('2^n')],
    [DOUBLER,
     'Au bout de $1$ heure : $2$ bactéries ; au bout de $2$ heures : $2 ' + X + ' 2 = 2^2$ ;'
     ' au bout de $3$ heures : $2^3$…',
     'Au bout de ${{n}}$ heures : $' + col(pw('2', '{{n}}')) + ' = ' + col(ev('2^n'), 1)
     + '$ bactéries.'])

MESSAGES = variation(
    'Lina envoie un message à $3$ amis. Chacun d\'eux le transfère à $3$ nouvelles personnes, et'
    ' ainsi de suite. Au 1er envoi, $3$ personnes reçoivent le message ; au 2e envoi,'
    ' $3 ' + X + ' 3 = 9$ personnes.\n\nCombien de personnes reçoivent le message au'
    ' {{n}}e envoi ?\n\n$' + pw('3', '?') + '$ personnes, soit $?$ personnes.',
    [var('n', '3..6')], ['{{n}}', ev('3^n')],
    ['**Multiplier plusieurs fois par le même nombre.** À chaque envoi, le nombre de personnes'
     ' est multiplié par $3$.',
     '1er envoi : $3$ ; 2e envoi : $3^2$ ; 3e envoi : $3^3$…',
     'Au {{n}}e envoi : $' + col(pw('3', '{{n}}')) + ' = ' + col(ev('3^n'), 1)
     + '$ personnes.'])

CADENAS = variation(
    'Un cadenas a ${{k}}$ molettes ; chacune porte les chiffres de $0$ à $9$.\n\nCombien de codes'
    ' différents peut-on former ?\n\n$' + pw('10', '?') + '$ codes, soit $?$ codes.',
    [var('k', '3..6')], ['{{k}}', ev('10^k')],
    ['**Compter les codes.** Chaque molette offre $10$ possibilités, quelles que soient les'
     ' autres : on multiplie $10$ par lui-même autant de fois qu\'il y a de molettes.',
     '$' + ' '.join(['10', X, '10', X, '\\ldots']) + '$ (${{k}}$ facteurs) $= '
     + col(pw('10', '{{k}}')) + ' = ' + col(ev('10^k'), 1) + '$ codes.'])

CUBE = variation(
    'Un cube a une arête de $' + pw('10', '{{k}}') + '~\\unit{cm}$.\n\nQuel est son volume ?'
    '\n\n$V = ' + pw('10', '?') + '~\\unit{cm^3}$',
    [var('k', '1..3')], [ev('3*k')],
    ['**Volume d\'un cube.** Le volume d\'un cube d\'arête $c$ est $c ' + X + ' c ' + X
     + ' c = c^3$.',
     '$$V = ' + pw('10', '{{k}}') + ' ' + X + ' ' + pw('10', '{{k}}') + ' ' + X + ' '
     + pw('10', '{{k}}') + ' = ' + pw('10', '{{k}} + {{k}} + {{k}}') + ' = '
     + col(pw('10', ev('3*k'))) + '~\\unit{cm^3}$$'])

PLIAGES = variation(
    'On plie une feuille de papier en deux, puis encore en deux, et ainsi de suite. On note $n$'
    ' le nombre de pliages.\n\nQuelle expression donne le nombre d\'épaisseurs de papier après'
    ' $n$ pliages ?'
    + choix(['$2^n$', '$2n$', '$n^2$', '$2 + n$']),
    [], ['0'],
    ['**Doubler à chaque fois.** Chaque pliage double le nombre d\'épaisseurs.',
     '$1$ pliage : $2$ ; $2$ pliages : $2 ' + X + ' 2 = 4$ ; $3$ pliages : $2 ' + X + ' 2 ' + X
     + ' 2 = 8$.',
     'Après $n$ pliages : $' + col('2^n') + '$ épaisseurs ($2n$ donnerait $6$ pour $3$'
     ' pliages, et non $8$).'])

MODELES.append(modele(
    '02-problemes-avec-des-puissances', 'Problèmes avec des puissances',
    'Résoudre un problème avec des puissances : bactéries qui doublent, chaîne de messages,'
    ' codes d\'un cadenas, volume d\'un cube d\'arête 10ᵏ cm, pliages',
    'Puissances', 'Problèmes', 'Situations', 1,
    [BACTERIES, MESSAGES, CADENAS, CUBE, PLIAGES],
    [spec('7 heures : 2⁷ = 128', 0, {'n': 7}, ['7', '128'], 'correct'),
     spec('Erreur : 2 × 7 = 14', 0, {'n': 7}, ['7', '14'], 'incorrect'),
     spec('Erreur : 7² = 49', 0, {'n': 7}, ['7', '49'], 'incorrect'),
     spec('4e envoi : 3⁴ = 81', 1, {'n': 4}, ['4', '81'], 'correct'),
     spec('Erreur : 3 × 4 = 12', 1, {'n': 4}, ['4', '12'], 'incorrect'),
     spec('4 molettes : 10⁴ = 10 000', 2, {'k': 4}, ['4', '10\\,000'], 'correct'),
     spec('Erreur : 10 × 4 = 40', 2, {'k': 4}, ['4', '40'], 'incorrect'),
     spec('Arête 10² cm : 10⁶ cm³', 3, {'k': 2}, '6', 'correct'),
     spec('Erreur : 10⁵ (2 + 3)', 3, {'k': 2}, '5', 'incorrect'),
     spec('Erreur : 10⁸ (2 au cube lu 2³)', 3, {'k': 2}, '8', 'incorrect'),
     spec('2ⁿ', 4, {}, '0', 'correct'),
     spec('Erreur : 2n', 4, {}, '1', 'incorrect')],
    delay=90))

# --- 3. 4-020 : encadrer une racine carrée ---------------------------------------------------

ENCADRER = ('**Encadrer une racine carrée.** On cherche les deux carrés parfaits qui entourent'
            ' le nombre : si $m^2 < n < (m+1)^2$, alors $m < \\sqrt{n} < m + 1$.')
MN = [var('m', '1..11'), var('r', '1..{{eval:2*m}}'), var('n', 'eval:m*m+r')]
CARRES = ('$$' + col(ev('m*m'), 1) + ' < {{n}} < ' + col(ev('(m+1)^2'), 1) + '$$ car $' + pw(
    '{{m}}', '2') + ' = ' + ev('m*m') + '$ et $' + pw(ev('m+1'), '2') + ' = ' + ev('(m+1)^2') + '$.')

ENCADRER_TROUS = variation(
    'Complète avec deux nombres entiers consécutifs.\n\n$$? < \\sqrt{ {{n}} } < ?$$',
    MN, ['{{m}}', ev('m+1')],
    [ENCADRER, CARRES,
     '$$' + col('{{m}}') + ' < \\sqrt{ {{n}} } < ' + col(ev('m+1')) + '$$'])

ENCADRER_CARRE = variation(
    'Un carré a une aire de ${{n}}~\\unit{cm^2}$.\n\nEntre quels nombres entiers consécutifs la'
    ' longueur de son côté est-elle comprise ?\n\nLe côté mesure entre $?~\\unit{cm}$ et'
    ' $?~\\unit{cm}$.',
    MN, ['{{m}}', ev('m+1')],
    ['**Côté et aire.** Le côté d\'un carré d\'aire ${{n}}~\\unit{cm^2}$ mesure $\\sqrt{ {{n}} }'
     '~\\unit{cm}$.',
     ENCADRER, CARRES,
     'Le côté mesure entre $' + col('{{m}}') + '~\\unit{cm}$ et $' + col(ev('m+1'))
     + '~\\unit{cm}$.'])

ENCADRER_CHOIX = variation(
    '$\\sqrt{ {{n}} }$ est compris entre :'
    + choix(['${{m}}$ et $' + ev('m+1') + '$',
             '$' + ev('floor(n/2)') + '$ et $' + ev('floor(n/2)+1') + '$',
             '$' + ev('n-1') + '$ et $' + ev('n+1') + '$',
             '$' + ev('m-1') + '$ et ${{m}}$']),
    MN, ['0'],
    [ENCADRER, CARRES,
     '$$' + col('{{m}}') + ' < \\sqrt{ {{n}} } < ' + col(ev('m+1')) + '$$',
     'La racine carrée n\'est pas la moitié : $\\sqrt{ {{n}} } \\neq {{n}} \\div 2$.'],
    ['floor(n/2)>m+1'])

S20 = {'m': 4, 'r': 4, 'n': 20}
MODELES.append(modele(
    '03-encadrer-une-racine-carree', 'Encadrer une racine carrée',
    'Encadrer la racine carrée d\'un entier par deux entiers consécutifs : 4 < √20 < 5 ;'
    ' côté d\'un carré d\'aire 20 cm²',
    'Racines carrées', 'Apprivoiser', 'Encadrer', 1,
    [ENCADRER_TROUS, ENCADRER_CARRE, ENCADRER_CHOIX],
    [spec('4 < √20 < 5', 0, S20, ['4', '5'], 'correct'),
     spec('Erreur : bornes inversées', 0, S20, ['5', '4'], 'incorrect'),
     spec('Erreur : la moitié, 10 et 11', 0, S20, ['10', '11'], 'incorrect'),
     spec('Erreur : 16 et 25 (les carrés)', 0, S20, ['16', '25'], 'incorrect'),
     spec('Aire 20 cm² : entre 4 et 5 cm', 1, S20, ['4', '5'], 'correct'),
     spec('Erreur : 19 et 21', 1, S20, ['19', '21'], 'incorrect'),
     spec('√20 : entre 4 et 5', 2, S20, '0', 'correct'),
     spec('Erreur : la moitié', 2, S20, '1', 'incorrect')],
    delay=45))

# --- 4. 4-021 : pairs et impairs -------------------------------------------------------------

PAIR = ('**Pairs et impairs.** $n$ désigne un nombre entier. Un nombre pair s\'écrit $2n$ ; un'
        ' nombre impair s\'écrit $2n + 1$.')

PAIR_CHOIX = variation(
    '$n$ désigne un nombre entier.\n\nQuelle expression désigne toujours un nombre pair ?'
    + choix(['$2n$', '$n + 2$', '$n^2$', '$2n + 1$']),
    [], ['0'],
    [PAIR,
     '$' + col('2n') + '$ est un multiple de $2$ : il est toujours pair.',
     'Les autres ne le sont pas toujours : pour $n = 3$, $n + 2 = 5$, $n^2 = 9$ et'
     ' $2n + 1 = 7$ sont impairs.'])

IMPAIR_CHOIX = variation(
    '$n$ désigne un nombre entier.\n\nQuelle expression désigne toujours un nombre impair ?'
    + choix(['$2n + 1$', '$n + 1$', '$3n$', '$2n + 2$']),
    [], ['0'],
    [PAIR,
     '$' + col('2n + 1') + '$ est un nombre pair augmenté de $1$ : il est toujours impair.',
     'Les autres ne le sont pas toujours : pour $n = 3$, $n + 1 = 4$ est pair ; pour $n = 2$,'
     ' $3n = 6$ est pair ; $2n + 2 = 2(n + 1)$ est toujours pair.'])

PAIR_SUIVANT = variation(
    '$n$ désigne un nombre entier : $2n$ est donc un nombre pair.\n\nÉcris, en fonction de $n$,'
    ' le nombre pair qui suit $2n$.\n\nLe nombre pair suivant est $?$.',
    [], ['2n+2'],
    [PAIR,
     'Les nombres pairs vont de $2$ en $2$ : le suivant de $2n$ est $2n + 2$.',
     'Exemple : pour $n = 5$, $2n = 10$ et le nombre pair suivant est $12 = 10 + 2$.',
     'Réponse : $' + col('2n + 2') + '$ (on peut aussi écrire $2(n + 1)$).'])

IMPAIR_SUIVANT = variation(
    '$n$ désigne un nombre entier : $2n + 1$ est donc un nombre impair.\n\nÉcris, en fonction'
    ' de $n$, le nombre impair qui suit $2n + 1$.\n\nLe nombre impair suivant est $?$.',
    [], ['2n+3'],
    [PAIR,
     'Les nombres impairs vont de $2$ en $2$ : le suivant de $2n + 1$ est $2n + 1 + 2$.',
     'Exemple : pour $n = 5$, $2n + 1 = 11$ et le nombre impair suivant est $13 = 11 + 2$.',
     'Réponse : $' + col('2n + 3') + '$.'])

TOM = variation(
    'Tom affirme : « Pour tout nombre entier $n$, le nombre $n + 1$ est impair. »\n\nQue penser'
    ' de cette affirmation ?'
    + choix(['Elle est fausse : pour $n = {{a}}$, $n + 1 = ' + ev('a+1') + '$ est pair.',
             'Elle est vraie : pour $n = {{b}}$, $n + 1 = ' + ev('b+1') + '$ est impair.',
             'Elle est vraie pour tous les nombres entiers.']),
    [var('j', '1..9'), var('a', 'eval:2*j+1'), var('h', '1..9'), var('b', 'eval:2*h')], ['0'],
    ['**Tester une affirmation.** Un seul exemple qui ne marche pas suffit à prouver qu\'une'
     ' affirmation « pour tout $n$ » est fausse ; des exemples qui marchent ne prouvent rien.',
     'Pour $n = {{a}}$ : $n + 1 = ' + ev('a+1') + '$, qui est pair.',
     'L\'affirmation est donc ' + col('\\text{fausse}').join(['$', '$']) + ' : $n + 1$ est'
     ' impair seulement quand $n$ est pair.'])

MODELES.append(modele(
    '04-pairs-et-impairs', 'Pairs et impairs',
    'Écrire un nombre pair 2n, un nombre impair 2n + 1, et tester une affirmation : quelle'
    ' expression est toujours paire ? le pair qui suit 2n ? « n + 1 est toujours impair » ?',
    'Calcul littéral', 'Produire une formule', 'Pairs et impairs', 1,
    [PAIR_CHOIX, IMPAIR_CHOIX, PAIR_SUIVANT, IMPAIR_SUIVANT, TOM],
    [spec('2n', 0, {}, '0', 'correct'),
     spec('Erreur : n + 2', 0, {}, '1', 'incorrect'),
     spec('2n + 1', 1, {}, '0', 'correct'),
     spec('Erreur : n + 1', 1, {}, '1', 'incorrect'),
     spec('2n + 2', 2, {}, '2n+2', 'correct'),
     spec('Autre écriture : 2(n + 1)', 2, {}, '2(n+1)', 'correct'),
     spec('Erreur : 2n + 1 (l\'entier suivant)', 2, {}, '2n+1', 'incorrect'),
     spec('Erreur : n + 2', 2, {}, 'n+2', 'incorrect'),
     spec('2n + 3', 3, {}, '2n+3', 'correct'),
     spec('Erreur : 2n + 2', 3, {}, '2n+2', 'incorrect'),
     spec('Fausse : contre-exemple', 4, {'j': 2, 'a': 5, 'h': 3, 'b': 6}, '0', 'correct'),
     spec('Erreur : vraie sur un exemple', 4, {'j': 2, 'a': 5, 'h': 3, 'b': 6}, '1',
          'incorrect')],
    delay=45, options=OPTIONS_EXPRESSION))

# --- 5. 4-023 : démontrer avec le calcul littéral -------------------------------------------

DEMONTRER = ('**Démontrer.** Des exemples ne prouvent pas qu\'une propriété est toujours vraie :'
             ' on écrit le calcul avec une lettre, valable pour tous les nombres.')
CONSECUTIFS = '$n + (n + 1) + (n + 2)$'

SOMME_REDUITE = variation(
    '$n$ désigne un nombre entier. On ajoute trois entiers consécutifs :'
    ' ' + CONSECUTIFS + '.\n\nÉcris cette somme sous forme réduite.\n\n$$n + (n + 1) + (n + 2) = ?$$',
    [], ['3n+3'],
    [DEMONTRER,
     'On regroupe les $n$ d\'un côté, les nombres de l\'autre :',
     '$$n + (n + 1) + (n + 2) = ' + col('n + n + n', 1) + ' + ' + col('1 + 2', 2) + ' = '
     + col('3n + 3') + '$$'])

SOMME_PREUVE = variation(
    '$n$ désigne un nombre entier. On a calculé : $n + (n + 1) + (n + 2) = 3n + 3$.\n\nQuelle'
    ' égalité prouve que la somme de trois entiers consécutifs est toujours un multiple de $3$ ?'
    + choix(['$3n + 3 = 3(n + 1)$', '$3n + 3 = 3(n + 3)$', '$3n + 3 = 6$ pour $n = 1$',
             '$3n + 3 = 3 + 3n$']),
    [], ['0'],
    [DEMONTRER,
     'Un multiple de $3$ s\'écrit $3 ' + X + ' k$ avec $k$ entier : on factorise par $3$.',
     '$$3n + 3 = ' + col('3(n + 1)') + '$$',
     '$n + 1$ est un entier : la somme est bien un multiple de $3$, pour **tout** $n$.'
     ' L\'exemple $n = 1$ ne prouve rien pour les autres nombres.'])

PROGRAMME_A = ('**Programme A** : choisir un nombre $x$ ; lui ajouter ${{a}}$ ; multiplier le'
               ' résultat par ${{k}}$ ; soustraire ' + ev('k*a').join(['$', '$']) + '.')
AK = [var('a', '2..9'), var('k', '2..5')]

PROGRAMME_REDUIT = variation(
    PROGRAMME_A + '\n\nÉcris le résultat du programme A en fonction de $x$, sous forme réduite.\n\nRésultat : $?$',
    AK, ['{{k}}x'],
    ['**Programme de calcul.** On traduit chaque étape par une expression, puis on réduit.',
     '$x$ → $x + {{a}}$ → ${{k}}(x + {{a}})$ → ${{k}}(x + {{a}}) - ' + ev('k*a') + '$',
     '$${{k}}(x + {{a}}) - ' + ev('k*a') + ' = {{k}}x + ' + col(ev('k*a'), 1) + ' - '
     + col(ev('k*a'), 1) + ' = ' + col('{{k}}x') + '$$'])

PROGRAMME_CONCLURE = variation(
    PROGRAMME_A + '\n\n**Programme B** : choisir un nombre $x$ ; le multiplier par ${{k}}$.'
    '\n\nOn a montré que, pour tout nombre $x$, le programme A donne ${{k}}(x + {{a}}) - '
    + ev('k*a') + ' = {{k}}x$.\n\nQue peut-on conclure ?'
    + choix(['Les deux programmes donnent toujours le même résultat.',
             'Ils donnent le même résultat seulement pour $x = {{a}}$.',
             'Ils ne donnent jamais le même résultat.',
             'On ne peut pas savoir sans essayer tous les nombres.']),
    AK, ['0'],
    [DEMONTRER,
     'Le programme B donne ${{k}}x$, et le programme A aussi, **pour tout** $x$.',
     'Conclusion : ' + col('\\text{les deux programmes donnent toujours le même résultat}')
     .join(['$', '$']) + '. Le calcul littéral remplace l\'essai de tous les nombres.'])

DEUX_PAIRS = variation(
    'On veut prouver que la somme de deux nombres pairs est toujours paire.\n\nLequel de ces'
    ' raisonnements est une démonstration ?'
    + choix(['On écrit les deux nombres $2n$ et $2m$ ($n$ et $m$ entiers) :'
             ' $2n + 2m = 2(n + m)$, qui est pair.',
             '$2 + 4 = 6$, $6 + 8 = 14$ et $10 + 12 = 22$ sont pairs.',
             'On écrit les deux nombres $2n$ et $2n$ : $2n + 2n = 4n$, qui est pair.',
             'C\'est vrai, car la somme de deux nombres pairs est paire.']),
    [], ['0'],
    [DEMONTRER,
     'Deux nombres pairs quelconques s\'écrivent $2n$ et $2m$ : deux lettres, car ils peuvent'
     ' être différents ($2n$ et $2n$ désignent le même nombre).',
     '$$2n + 2m = ' + col('2(n + m)') + '$$',
     '$n + m$ est un entier : la somme est un multiple de $2$, donc paire. Trois exemples ne'
     ' prouvent rien, et répéter la propriété non plus.'])

MODELES.append(modele(
    '05-demontrer-avec-le-calcul-litteral', 'Démontrer avec le calcul littéral',
    'Utiliser le calcul littéral pour démontrer : somme de trois entiers consécutifs multiple de 3,'
    ' deux programmes de calcul équivalents, somme de deux pairs',
    'Calcul littéral', 'Raisonner', 'Démontrer', 1,
    [SOMME_REDUITE, SOMME_PREUVE, PROGRAMME_REDUIT, PROGRAMME_CONCLURE, DEUX_PAIRS],
    [spec('3n + 3', 0, {}, '3n+3', 'correct'),
     spec('Autre écriture : 3(n + 1)', 0, {}, '3(n+1)', 'correct'),
     spec('Erreur : 3n + 2', 0, {}, '3n+2', 'incorrect'),
     spec('Erreur : n + 3', 0, {}, 'n+3', 'incorrect'),
     spec('3(n + 1)', 1, {}, '0', 'correct'),
     spec('Erreur : un exemple', 1, {}, '2', 'incorrect'),
     spec('Programme A : 3x', 2, {'a': 5, 'k': 3}, '3x', 'correct'),
     spec('Erreur : 3x + 15 (soustraction oubliée)', 2, {'a': 5, 'k': 3}, '3x+15', 'incorrect'),
     spec('Erreur : x + 5', 2, {'a': 5, 'k': 3}, 'x+5', 'incorrect'),
     spec('Toujours le même résultat', 3, {'a': 5, 'k': 3}, '0', 'correct'),
     spec('Erreur : il faut tout essayer', 3, {'a': 5, 'k': 3}, '3', 'incorrect'),
     spec('2n + 2m = 2(n + m)', 4, {}, '0', 'correct'),
     spec('Erreur : trois exemples', 4, {}, '1', 'incorrect'),
     spec('Erreur : 2n + 2n', 4, {}, '2', 'incorrect')],
    delay=90, options=OPTIONS_EXPRESSION))

# --- 6. 4-071 : mettre en équation ax + b = cx + d ------------------------------------------

METTRE = ('**Mettre en équation.** On choisit l\'inconnue $x$, on écrit chaque quantité en'
          ' fonction de $x$, puis on traduit « autant que » par le signe $=$.')

# Tarifs : la solution s est tirée d'abord ; abonnement b = (c − a) × s
TARIFS_VARS = [var('s', '4..15'), var('c', '6..12'), var('a', '2..{{eval:c-2}}'),
               var('b', 'eval:(c-a)*s')]
TARIFS = ('À la piscine, deux tarifs sont proposés :\n\n- tarif A : un abonnement de'
          ' ${{b}}~\\unit{€}$, puis ${{a}}~\\unit{€}$ par séance ;\n- tarif B : ${{c}}~\\unit{€}$'
          ' par séance, sans abonnement.\n\nOn note $x$ le nombre de séances.')
TARIFS_PRIX = ('Prix au tarif A : $' + col('{{b}} + {{a}}x', 1) + '$ ; prix au tarif B : $'
               + col('{{c}}x', 2) + '$.')

TARIFS_EQUATION = variation(
    TARIFS + '\n\nQuelle équation permet de trouver le nombre de séances pour lequel les deux'
    ' tarifs coûtent le même prix ?'
    + choix(['${{b}} + {{a}}x = {{c}}x$', '${{a}}x = {{b}} + {{c}}x$',
             '${{b}}x + {{a}} = {{c}}x$', '${{b}} + {{a}} + x = {{c}}x$']),
    TARIFS_VARS, ['0'],
    [METTRE, TARIFS_PRIX,
     'Même prix : $' + col('{{b}} + {{a}}x = {{c}}x') + '$.'])

TARIFS_SOLUTION = variation(
    TARIFS + '\n\nPour combien de séances les deux tarifs coûtent-ils le même prix ?\n\nPour $?$'
    ' séances.',
    TARIFS_VARS, ['{{s}}'],
    [METTRE, TARIFS_PRIX,
     '$$\\begin{aligned} {{b}} + {{a}}x &= {{c}}x \\\\ {{b}} &= {{c}}x - {{a}}x \\\\ {{b}} &= '
     + ev('c-a') + 'x \\\\ x &= ' + '\\frac{ {{b}} }{ ' + ev('c-a') + ' } = '
     + col('{{s}}') + ' \\end{aligned}$$',
     'Vérification : $' + '{{b}} + {{a}} ' + X + ' {{s}} = ' + ev('b+a*s') + '$ et ${{c}} ' + X
     + ' {{s}} = ' + ev('c*s') + '$.'])

# Nombre mystère : solution s relative (non nulle), d = (a − c) × s + b > 0
MYSTERE_VARS = [var('s', '-9..9'), var('a', '2..9'), var('c', '2..9'), var('b', '1..20'),
                var('d', 'eval:(a-c)*s+b')]
SP = '{{if:s<0|({{s}})|{{s}}}}'
MYSTERE_CONDITIONS = ['s!=0', 'a!=c', 'd>0', 'd!=b', 'd<=60']
MYSTERE = ('Je pense à un nombre. Si je le multiplie par ${{a}}$ et que j\'ajoute ${{b}}$,'
           ' j\'obtiens le même résultat que si je le multiplie par ${{c}}$ et que j\'ajoute'
           ' ${{d}}$.')

MYSTERE_EQUATION = variation(
    MYSTERE + '\n\nOn note $x$ ce nombre. Quelle équation traduit l\'énoncé ?'
    + choix(['${{a}}x + {{b}} = {{c}}x + {{d}}$', '${{a}} + {{b}}x = {{c}} + {{d}}x$',
             '${{a}}x + {{c}}x = {{b}} + {{d}}$', '$' + ev('a+b') + 'x = ' + ev('c+d') + 'x$']),
    MYSTERE_VARS, ['0'],
    [METTRE,
     'Premier calcul : $' + col('{{a}}x + {{b}}', 1) + '$ ; second calcul : $'
     + col('{{c}}x + {{d}}', 2) + '$.',
     'Même résultat : $' + col('{{a}}x + {{b}} = {{c}}x + {{d}}') + '$.'],
    MYSTERE_CONDITIONS + ['a+b!=c+d'])

MYSTERE_SOLUTION = variation(
    MYSTERE + '\n\nQuel est ce nombre ?\n\nLe nombre est $?$.',
    MYSTERE_VARS, ['{{s}}'],
    [METTRE,
     'On note $x$ ce nombre : $' + col('{{a}}x + {{b}} = {{c}}x + {{d}}', 1) + '$.',
     '$$\\begin{aligned} {{a}}x - {{c}}x &= {{d}} - {{b}} \\\\ ' + ev('a-c') + 'x &= '
     + ev('d-b') + ' \\\\ x &= ' + col('{{s}}') + ' \\end{aligned}$$',
     'Vérification : ${{a}} ' + X + ' ' + SP + ' + {{b}} = ' + ev('a*s+b') + '$ et ${{c}} ' + X
     + ' ' + SP + ' + {{d}} = ' + ev('c*s+d') + '$.'],
    MYSTERE_CONDITIONS)

# Cuves : A part de b L et gagne a L/min ; B part de d = b + (a − c) × s L et gagne c L/min
CUVES = variation(
    'La cuve A contient ${{b}}~\\unit{L}$ d\'eau et se remplit de ${{a}}~\\unit{L}$ par minute.'
    ' La cuve B contient ${{d}}~\\unit{L}$ d\'eau et se remplit de ${{c}}~\\unit{L}$ par'
    ' minute.\n\nAu bout de combien de minutes les deux cuves contiendront-elles le même volume'
    ' d\'eau ?\n\nAu bout de $?$ minutes.',
    [var('s', '2..12'), var('a', '4..9'), var('c', '2..{{eval:a-1}}'), var('b', '5..40'),
     var('d', 'eval:b+(a-c)*s')],
    ['{{s}}'],
    [METTRE,
     'Au bout de $x$ minutes : cuve A $' + col('{{b}} + {{a}}x', 1) + '$, cuve B $'
     + col('{{d}} + {{c}}x', 2) + '$.',
     '$$\\begin{aligned} {{b}} + {{a}}x &= {{d}} + {{c}}x \\\\ {{a}}x - {{c}}x &= {{d}} - {{b}}'
     ' \\\\ ' + ev('a-c') + 'x &= ' + ev('d-b') + ' \\\\ x &= ' + col('{{s}}')
     + ' \\end{aligned}$$',
     'Vérification : $' + '{{b}} + {{a}} ' + X + ' {{s}} = ' + ev('b+a*s') + '$ et ${{d}} + {{c}} '
     + X + ' {{s}} = ' + ev('d+c*s') + '$ litres.'])

ST = {'s': 6, 'c': 9, 'a': 4, 'b': 30}
SM = {'s': -3, 'a': 5, 'c': 2, 'b': 20, 'd': 11}
MODELES.append(modele(
    '06-mettre-en-equation-ax-b-cx-d', 'Mettre en équation ax + b = cx + d',
    'Mettre en équation un problème du type ax + b = cx + d et le résoudre : deux tarifs, nombre'
    ' mystère, deux cuves',
    'Calcul littéral', 'Equations', 'Mettre en équation', 3,
    [TARIFS_EQUATION, TARIFS_SOLUTION, MYSTERE_EQUATION, MYSTERE_SOLUTION, CUVES],
    [spec('30 + 4x = 9x', 0, ST, '0', 'correct'),
     spec('Erreur : 4x = 30 + 9x', 0, ST, '1', 'incorrect'),
     spec('30 + 4x = 9x : 6 séances', 1, ST, '6', 'correct'),
     spec('Erreur : 30 ÷ 9', 1, ST, '\\frac{10}{3}', 'incorrect'),
     spec('Erreur : 30 ÷ 13', 1, ST, '\\frac{30}{13}', 'incorrect'),
     spec('5x + 20 = 2x + 11', 2, SM, '0', 'correct'),
     spec('Erreur : 5 + 20x = 2 + 11x', 2, SM, '1', 'incorrect'),
     spec('5x + 20 = 2x + 11 : −3', 3, SM, '-3', 'correct'),
     spec('Erreur : 3 (signe)', 3, SM, '3', 'incorrect'),
     spec('Cuves : 6 minutes', 4, {'s': 6, 'a': 7, 'c': 3, 'b': 10, 'd': 34}, '6', 'correct'),
     spec('Erreur : 24 (la différence des volumes)', 4,
          {'s': 6, 'a': 7, 'c': 3, 'b': 10, 'd': 34}, '24', 'incorrect')],
    delay=120))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
