"""Écrit les 7 modèles du lot 4 « Probabilités » de la 4e dans scripts/questions/4-lot-4/.

Phase 0 validée par David le 2026-10-30 (§ 20 du journal « docs/wip/questions-4-progress.md »), un
point par modèle :

| # | Point | Titre                              | Catégorie, niveau                                   |
| 1 | 4-046 | Décrire une expérience aléatoire   | Probabilités › Évènements › Univers, 1              |
| 2 | 4-047 | Contraire, réunion, intersection   | Probabilités › Évènements › Opérations, 2           |
| 3 | 4-048 | Probabilité d'un évènement         | Probabilités › Calculer › Équiprobabilité, 1        |
| 4 | 4-079 | Évènement contraire                | Probabilités › Calculer › Évènement contraire, 1    |
| 5 | 4-049 | Deux épreuves                      | Probabilités › Calculer › Deux épreuves, 2          |
| 6 | 4-050 | Fréquences et probabilités         | Probabilités › Simulation › Fréquences, 1           |
| 7 | 4-051 | Fluctuation des fréquences         | Probabilités › Simulation › Fluctuation, 1          |

Bornes : « cycle4.json », 4e (4-046, 4-047 : univers, évènements comme ensembles d'issues ;
complémentaire, ∪, ∩, ∅ ; 4-049 : deux pièces, une pièce et un dé, deux dés ; issues
équiprobables ; tableau ou arbre). Le nœud et le tag sont posés par la migration de rangement,
après le « --publier » de David.

Décisions et pièges :
- probabilités : toute écriture égale acceptée (« acceptDecimal » ; fraction non simplifiée en
  ambre, « reducedFractions » par défaut), corrigé en fraction irréductible ;
- ensembles d'issues en case « intervalles » (accolades, points-virgules, ∅) ;
- cas tirés par « k » ou « j », le bon choix est « {{k}} » ;
- le bloc « simulation » tire ses effectifs à l'affichage (graine) : aucune réponse n'en dépend ;
- variables « e » et « i » interdites dans les « eval ».

    python3 docs/wip/questions/lot-4-4.py scripts/questions/4-lot-4
"""
import json
import os
import subprocess
import sys
from fractions import Fraction

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
           delay=60, shared=None):
    m = {'title': title, 'description': description, 'grades': ['4'],
         'theme': 'Probabilités', 'domain': domain, 'subdomain': subdomain, 'level': level,
         'delay': delay, 'status': 'draft'}
    if shared:
        m['shared'] = shared
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


def ens(elements):
    """Ensemble en extension, `\\{ 2;4;6 \\}` ; vide → `\\varnothing`."""
    if not elements:
        return '\\varnothing'
    return '\\{ ' + ';'.join(str(x) for x in elements) + ' \\}'


def ens_aff(elements):
    """Ensemble affiché dans un texte : `\\{2 ; 4 ; 6\\}`."""
    if not elements:
        return '\\varnothing'
    return '\\{' + ' ; '.join(str(x) for x in elements) + '\\}'


def ensemble(attendu):
    return {'expectedAnswer': attendu, 'answerKind': 'intervalles'}


def frac(f):
    f = Fraction(f)
    return str(f.numerator) if f.denominator == 1 else '\\frac{' + str(f.numerator) + '}{' + str(f.denominator) + '}'


CASE = '\n\n$$?$$'
PROBA = {'blankDefaults': {'acceptDecimal': True}}
EQUI = ('**Équiprobabilité.** Quand toutes les issues ont la même probabilité,'
        ' $P(A) = \\dfrac{\\text{nombre d\'issues favorables à } A}{\\text{nombre total d\'issues}}$.')
MODELES = []

# --- 1. 4-046 : décrire une expérience aléatoire ---------------------------------------------

UNIVERS = ('**Univers.** L\'ensemble de toutes les issues possibles d\'une expérience aléatoire'
           ' s\'appelle l\'univers. Un évènement est un ensemble d\'issues : on l\'écrit entre'
           ' accolades.')
ECRIRE_ENS = ('Écris l\'ensemble entre accolades, en séparant les éléments par des points-virgules'
              ' (par exemple $\\{1 ; 3 ; 5\\}$).')

UNIV_OBJETS = [('un dé équilibré à six faces, numérotées de $1$ à $6$', range(1, 7)),
               ('une roue équilibrée partagée en huit secteurs égaux, numérotés de $1$ à $8$',
                range(1, 9)),
               ('un dé équilibré à dix faces, numérotées de $1$ à $10$', range(1, 11))]
UNIV_ECRIRE = variation(
    'On lance ' + selon('k', [o for o, _ in UNIV_OBJETS]) + ' et on note le nombre obtenu.\n\n'
    'Écris l\'univers de cette expérience. ' + ECRIRE_ENS + CASE,
    [var('k', '0..2')],
    [ensemble(selon('k', [ens(list(r)) for _, r in UNIV_OBJETS]))],
    [UNIVERS,
     'Les issues possibles sont tous les nombres qui peuvent sortir : l\'univers est $'
     + col(selon('k', [ens_aff(list(r)) for _, r in UNIV_OBJETS])) + '$.'])

# Dé à six faces : évènement en mots → ensemble
EV6 = [('obtenir un nombre pair', [2, 4, 6]),
       ('obtenir un nombre impair', [1, 3, 5]),
       ('obtenir un multiple de $3$', [3, 6]),
       ('obtenir un nombre supérieur ou égal à $4$', [4, 5, 6]),
       ('obtenir un nombre inférieur à $3$', [1, 2])]
UNIV_EV6 = variation(
    'On lance un dé équilibré à six faces, numérotées de $1$ à $6$. On note $A$ l\'évènement'
    ' « ' + selon('j', [t for t, _ in EV6]) + ' ».\n\n'
    'Écris l\'évènement $A$ comme un ensemble d\'issues. ' + ECRIRE_ENS + CASE,
    [var('j', '0..4')],
    [ensemble(selon('j', [ens(s) for _, s in EV6]))],
    [UNIVERS,
     'L\'univers est $\\{1 ; 2 ; 3 ; 4 ; 5 ; 6\\}$. On garde les issues qui réalisent $A$ :'
     ' $A = ' + col(selon('j', [ens_aff(s) for _, s in EV6])) + '$.'])

# Dé à douze faces
EV12 = [('obtenir un multiple de $4$', [4, 8, 12]),
        ('obtenir un diviseur de $12$', [1, 2, 3, 4, 6, 12]),
        ('obtenir un nombre premier', [2, 3, 5, 7, 11]),
        ('obtenir un multiple de $5$', [5, 10]),
        ('obtenir un nombre supérieur ou égal à $9$', [9, 10, 11, 12])]
UNIV_EV12 = variation(
    'On lance un dé équilibré à douze faces, numérotées de $1$ à $12$. On note $B$ l\'évènement'
    ' « ' + selon('j', [t for t, _ in EV12]) + ' ».\n\n'
    'Écris l\'évènement $B$ comme un ensemble d\'issues. ' + ECRIRE_ENS + CASE,
    [var('j', '0..4')],
    [ensemble(selon('j', [ens(s) for _, s in EV12]))],
    [UNIVERS,
     'L\'univers est $\\{1 ; 2 ; \\ldots ; 12\\}$. On garde les issues qui réalisent $B$ :'
     ' $B = ' + col(selon('j', [ens_aff(s) for _, s in EV12])) + '$.'])

# k = 0 : une issue ; 1 : un évènement (pas l'univers) ; 2 : l'univers
UNIV_NATURE = variation(
    'On lance un dé équilibré à six faces, numérotées de $1$ à $6$.\n\n'
    'Que désigne ' + selon('k', ['le résultat « $5$ »', '$\\{2 ; 4 ; 6\\}$',
                                 '$\\{1 ; 2 ; 3 ; 4 ; 5 ; 6\\}$']) + ' ?'
    + choix(['Une issue de l\'expérience.',
             'Un évènement, qui n\'est pas l\'univers.',
             'L\'univers de l\'expérience.'], melanger=False),
    [var('k', '0..2')], ['{{k}}'],
    [UNIVERS,
     selon('k', ['« $5$ » est un des résultats possibles du lancer : ' + txt('c\'est une issue') + '.',
                 '$\\{2 ; 4 ; 6\\}$ regroupe trois issues (« obtenir un nombre pair ») sans être'
                 ' l\'ensemble de toutes les issues : ' + txt('c\'est un évènement') + '.',
                 '$\\{1 ; 2 ; 3 ; 4 ; 5 ; 6\\}$ contient toutes les issues : '
                 + txt('c\'est l\'univers') + '.'])])

MODELES.append(modele(
    '01-decrire-une-experience-aleatoire', 'Décrire une expérience aléatoire',
    'Écrire l\'univers d\'une expérience aléatoire et un évènement comme un ensemble d\'issues :'
    ' dé à six faces, « obtenir un nombre pair » = {2 ; 4 ; 6}',
    'Évènements', 'Univers', 1,
    [UNIV_ECRIRE, UNIV_EV6, UNIV_EV12, UNIV_NATURE],
    [spec('Dé à 6 faces : {1;…;6}', 0, {'k': 0}, '\\{1;2;3;4;5;6\\}', 'correct'),
     spec('Roue à 8 : désordre accepté', 0, {'k': 1}, '\\{8;1;2;3;4;5;6;7\\}', 'correct'),
     spec('Erreur : issue oubliée', 0, {'k': 0}, '\\{1;2;3;4;5\\}', 'incorrect'),
     spec('Pair : {2;4;6}', 1, {'j': 0}, '\\{2;4;6\\}', 'correct'),
     spec('Pair, dans le désordre', 1, {'j': 0}, '\\{6;2;4\\}', 'correct'),
     spec('Erreur : impair au lieu de pair', 1, {'j': 0}, '\\{1;3;5\\}', 'incorrect'),
     spec('≥ 4 : 4 compris', 1, {'j': 3}, '\\{4;5;6\\}', 'correct'),
     spec('Erreur : 4 oublié', 1, {'j': 3}, '\\{5;6\\}', 'incorrect'),
     spec('Premiers jusqu\'à 12', 2, {'j': 2}, '\\{2;3;5;7;11\\}', 'correct'),
     spec('Erreur : 1 compté premier', 2, {'j': 2}, '\\{1;2;3;5;7;11\\}', 'incorrect'),
     spec('Diviseurs de 12', 2, {'j': 1}, '\\{1;2;3;4;6;12\\}', 'correct'),
     spec('« 5 » : une issue', 3, {'k': 0}, '0', 'correct'),
     spec('{2;4;6} : un évènement', 3, {'k': 1}, '1', 'correct'),
     spec('Erreur : {2;4;6} pris pour l\'univers', 3, {'k': 1}, '2', 'incorrect'),
     spec('Univers', 3, {'k': 2}, '2', 'correct')],
    delay=60))

# --- 2. 4-047 : contraire, réunion, intersection ---------------------------------------------

U12 = list(range(1, 13))
CAS47 = [('obtenir un nombre pair', {2, 4, 6, 8, 10, 12}, 'obtenir un multiple de $3$', {3, 6, 9, 12}),
         ('obtenir un nombre premier', {2, 3, 5, 7, 11}, 'obtenir un nombre supérieur ou égal à $8$',
          {8, 9, 10, 11, 12}),
         ('obtenir un multiple de $4$', {4, 8, 12}, 'obtenir un diviseur de $12$', {1, 2, 3, 4, 6, 12})]


def trie(s):
    return sorted(s)


DE12 = ('On lance un dé équilibré à douze faces, numérotées de $1$ à $12$. On note $A$ l\'évènement'
        ' « ' + selon('j', [c[0] for c in CAS47]) + ' » et $B$ l\'évènement « '
        + selon('j', [c[2] for c in CAS47]) + ' ».\n\n')
AB = ('$A = ' + selon('j', [ens_aff(trie(c[1])) for c in CAS47]) + '$ et $B = '
      + selon('j', [ens_aff(trie(c[3])) for c in CAS47]) + '$.')
OPS = ('**Opérations.** $\\overline{A}$ (« non $A$ », le contraire de $A$) contient les issues qui'
       ' ne sont pas dans $A$ ; $A \\cap B$ (« $A$ et $B$ ») celles qui sont à la fois dans $A$ et'
       ' dans $B$ ; $A \\cup B$ (« $A$ ou $B$ ») celles qui sont dans $A$, dans $B$ ou dans les deux.')

OP_CONTRAIRE = variation(
    DE12 + 'Écris l\'évènement $\\overline{A}$ comme un ensemble d\'issues. ' + ECRIRE_ENS + CASE,
    [var('j', '0..2')],
    [ensemble(selon('j', [ens([x for x in U12 if x not in c[1]]) for c in CAS47]))],
    [OPS, AB,
     'On garde les issues de $\\{1 ; 2 ; \\ldots ; 12\\}$ qui ne sont pas dans $A$ :'
     ' $\\overline{A} = ' + col(selon('j', [ens_aff([x for x in U12 if x not in c[1]])
                                           for c in CAS47])) + '$.'])

OP_INTER = variation(
    DE12 + 'Écris l\'évènement $A \\cap B$ comme un ensemble d\'issues. ' + ECRIRE_ENS + CASE,
    [var('j', '0..2')],
    [ensemble(selon('j', [ens(trie(c[1] & c[3])) for c in CAS47]))],
    [OPS, AB,
     'Les issues qui sont à la fois dans $A$ et dans $B$ : $A \\cap B = '
     + col(selon('j', [ens_aff(trie(c[1] & c[3])) for c in CAS47])) + '$.'])

OP_UNION = variation(
    DE12 + 'Écris l\'évènement $A \\cup B$ comme un ensemble d\'issues. ' + ECRIRE_ENS + CASE,
    [var('j', '0..2')],
    [ensemble(selon('j', [ens(trie(c[1] | c[3])) for c in CAS47]))],
    [OPS, AB,
     'Les issues qui sont dans $A$, dans $B$ ou dans les deux, chacune écrite une seule fois :'
     ' $A \\cup B = ' + col(selon('j', [ens_aff(trie(c[1] | c[3])) for c in CAS47])) + '$.'])

INCOMPAT = [('obtenir un nombre pair', [2, 4, 6, 8, 10, 12], 'obtenir un nombre impair',
             [1, 3, 5, 7, 9, 11]),
            ('obtenir un nombre inférieur ou égal à $3$', [1, 2, 3],
             'obtenir un nombre supérieur ou égal à $10$', [10, 11, 12]),
            ('obtenir un multiple de $5$', [5, 10], 'obtenir un multiple de $7$', [7])]
OP_VIDE = variation(
    'On lance un dé équilibré à douze faces, numérotées de $1$ à $12$. On note $A$ l\'évènement'
    ' « ' + selon('j', [c[0] for c in INCOMPAT]) + ' » et $B$ l\'évènement « '
    + selon('j', [c[2] for c in INCOMPAT]) + ' ».\n\n'
    'Écris l\'évènement $A \\cap B$. ' + ECRIRE_ENS + ' L\'ensemble vide s\'écrit $\\varnothing$.'
    + CASE,
    [var('j', '0..2')],
    [ensemble('\\varnothing')],
    [OPS,
     '$A = ' + selon('j', [ens_aff(c[1]) for c in INCOMPAT]) + '$ et $B = '
     + selon('j', [ens_aff(c[3]) for c in INCOMPAT]) + '$ : aucune issue n\'est dans les deux.',
     '$A \\cap B = ' + col('\\varnothing') + '$ : c\'est l\'évènement impossible. On dit que $A$ et'
     ' $B$ sont incompatibles.'])

OP_LIRE = variation(
    'On note $A$ et $B$ deux évènements d\'une même expérience aléatoire.\n\n'
    'Comment se lit ' + selon('k', ['$A \\cap B$', '$A \\cup B$', '$\\overline{A}$']) + ' ?'
    + choix(['« $A$ et $B$ »', '« $A$ ou $B$ »', '« non $A$ »', '« ni $A$ ni $B$ »'],
            melanger=False),
    [var('k', '0..2')], ['{{k}}'],
    [OPS,
     selon('k', ['$A \\cap B$ se lit ' + txt('« A et B »') + '.',
                 '$A \\cup B$ se lit ' + txt('« A ou B »') + '.',
                 '$\\overline{A}$ se lit ' + txt('« non A »') + ' : c\'est le contraire de $A$.'])])

MODELES.append(modele(
    '02-contraire-reunion-intersection', 'Contraire, réunion, intersection',
    'Écrire le contraire, la réunion et l\'intersection d\'évènements comme des ensembles'
    ' d\'issues ; reconnaître l\'évènement impossible ; lire ∩, ∪ et la barre',
    'Évènements', 'Opérations', 2,
    [OP_CONTRAIRE, OP_INTER, OP_UNION, OP_VIDE, OP_LIRE],
    [spec('Non A (A pair)', 0, {'j': 0}, '\\{1;3;5;7;9;11\\}', 'correct'),
     spec('Erreur : A au lieu de non A', 0, {'j': 0}, '\\{2;4;6;8;10;12\\}', 'incorrect'),
     spec('Non A (A premier) : 1 compris', 0, {'j': 1}, '\\{1;4;6;8;9;10;12\\}', 'correct'),
     spec('A ∩ B (pair, multiple de 3)', 1, {'j': 0}, '\\{6;12\\}', 'correct'),
     spec('Erreur : réunion au lieu de l\'intersection', 1, {'j': 0},
          '\\{2;3;4;6;8;9;10;12\\}', 'incorrect'),
     spec('A ∩ B (premier, ≥ 8)', 1, {'j': 1}, '\\{11\\}', 'correct'),
     spec('A ∪ B (pair, multiple de 3)', 2, {'j': 0}, '\\{2;3;4;6;8;9;10;12\\}', 'correct'),
     spec('A ∪ B dans le désordre', 2, {'j': 0}, '\\{12;2;3;4;6;8;9;10\\}', 'correct'),
     spec('Erreur : 9 oublié', 2, {'j': 0}, '\\{2;3;4;6;8;10;12\\}', 'incorrect'),
     spec('Incompatibles : vide', 3, {'j': 0}, '\\varnothing', 'correct'),
     spec('Erreur : {0}', 3, {'j': 1}, '\\{0\\}', 'incorrect'),
     spec('A ∩ B : « A et B »', 4, {'k': 0}, '0', 'correct'),
     spec('Erreur : ∩ lu « ou »', 4, {'k': 0}, '1', 'incorrect'),
     spec('Barre : « non A »', 4, {'k': 2}, '2', 'correct')],
    delay=75))

# --- 3. 4-048 : probabilité d'un évènement ---------------------------------------------------

# k = 0 : une couleur ; k = 1 : deux couleurs (« rouge ou bleue »)
EQ_URNE = variation(
    'Une urne contient ${{r}}$ boules rouges, ${{v}}$ boules vertes et ${{b}}$ boules bleues,'
    ' indiscernables au toucher. On tire une boule au hasard.\n\n'
    'Quelle est la probabilité de tirer ' + selon('k', ['une boule verte',
                                                       'une boule rouge ou bleue']) + ' ?' + CASE,
    [var('k', '0..1'), var('r', '2..9'), var('v', '2..9'), var('b', '2..9')],
    [ev('(' + selon('k', ['v', 'r+b']) + ')/(r+v+b)')],
    [EQUI,
     'Il y a ${{r}} + {{v}} + {{b}} = ' + ev('r+v+b') + '$ boules, toutes équiprobables. '
     + selon('k', ['${{v}}$ sont vertes.',
                   '${{r}} + {{b}} = ' + ev('r+b') + '$ sont rouges ou bleues.']),
     '$$P = \\frac{' + ev(selon('k', ['v', 'r+b'])) + '}{' + ev('r+v+b') + '} = '
     + col('{{solution}}') + '$$'],
    ['r!=v', 'v!=b', 'r!=b'])

# Dé à n faces : k = 0 nombre pair, k = 1 nombre supérieur ou égal à m
EQ_DE = variation(
    'On lance un dé équilibré à ${{n}}$ faces, numérotées de $1$ à ${{n}}$.\n\n'
    'Quelle est la probabilité d\'' + selon('k', ['obtenir un nombre pair',
                                                 'obtenir un nombre supérieur ou égal à ${{m}}$'])
    + ' ?' + CASE,
    [var('k', '0..1'), var('n', '6|8|10|12'), var('m', '2..n')],
    [ev(selon('k', ['1/2', '(n-m+1)/n']))],
    [EQUI,
     'Les ${{n}}$ faces sont équiprobables. '
     + selon('k', ['Les nombres pairs de $1$ à ${{n}}$ sont $' + ev('n/2') + '$.',
                   'Les nombres de ${{m}}$ à ${{n}}$ sont ${{n}} - {{m}} + 1 = ' + ev('n-m+1')
                   + '$.']),
     '$$P = \\frac{' + ev(selon('k', ['n/2', 'n-m+1'])) + '}{{{n}}} = ' + col('{{solution}}') + '$$'])

CARTES = [('un roi', 4, '4 rois, un par couleur'),
          ('un cœur', 8, '8 cœurs'),
          ('une figure (valet, dame ou roi)', 12, '3 figures par couleur, soit $3 \\times 4 = 12$'),
          ('un as rouge', 2, '2 as rouges (cœur et carreau)')]
EQ_CARTES = variation(
    'Un jeu de $32$ cartes compte quatre couleurs (pique, cœur, carreau, trèfle) et huit cartes'
    ' par couleur : $7$, $8$, $9$, $10$, valet, dame, roi, as. On tire une carte au hasard.\n\n'
    'Quelle est la probabilité de tirer ' + selon('k', [c for c, _, _ in CARTES]) + ' ?' + CASE,
    [var('k', '0..3')],
    [selon('k', [frac(Fraction(n, 32)) for _, n, _ in CARTES])],
    [EQUI,
     'Les $32$ cartes sont équiprobables. Il y a ' + selon('k', [t for _, _, t in CARTES]) + '.',
     '$$P = ' + selon('k', ['\\frac{' + str(n) + '}{32} = ' for _, n, _ in CARTES])
     + col('{{solution}}') + '$$'])

MOTS = [('PROBABILITE', 'B'), ('MATHEMATIQUES', 'M'), ('ALEATOIRE', 'A')]


def voyelles(mot):
    return sum(1 for c in mot if c in 'AEIOUY')


# k : le mot ; j = 0 : une voyelle ; j = 1 : la lettre doublée
EQ_LETTRES = variation(
    'On écrit chaque lettre du mot ' + selon('k', ['« ' + m + ' »' for m, _ in MOTS])
    + ' sur un carton, puis on tire un carton au hasard.\n\n'
    'Quelle est la probabilité de tirer ' + selon('j', ['une voyelle', 'la lettre « '
                                                        + selon('k', [l for _, l in MOTS]) + ' »'])
    + ' ?' + CASE,
    [var('k', '0..2'), var('j', '0..1')],
    [selon('k', [selon('j', [frac(Fraction(voyelles(m), len(m))),
                             frac(Fraction(m.count(l), len(m)))]) for m, l in MOTS])],
    [EQUI,
     'Il y a ' + selon('k', ['$' + str(len(m)) + '$ cartons' for m, _ in MOTS])
     + ', tous équiprobables. '
     + selon('k', [selon('j', ['$' + str(voyelles(m)) + '$ portent une voyelle.',
                               '$' + str(m.count(l)) + '$ portent la lettre « ' + l + ' ».'])
                   for m, l in MOTS]),
     '$$P = ' + selon('k', [selon('j', ['\\frac{' + str(voyelles(m)) + '}{' + str(len(m)) + '}',
                                        '\\frac{' + str(m.count(l)) + '}{' + str(len(m)) + '}'])
                            for m, l in MOTS]) + ' = ' + col('{{solution}}') + '$$'])

MODELES.append(modele(
    '03-probabilite-d-un-evenement', 'Probabilité d\'un évènement',
    'Calculer la probabilité d\'un évènement dans une situation d\'équiprobabilité : urne, dé,'
    ' jeu de 32 cartes, lettres d\'un mot',
    'Calculer', 'Équiprobabilité', 1,
    [EQ_URNE, EQ_DE, EQ_CARTES, EQ_LETTRES],
    [spec('3 R, 5 V, 4 B : verte 5/12', 0, {'k': 0, 'r': 3, 'v': 5, 'b': 4}, '\\frac{5}{12}',
          'correct'),
     spec('Erreur : favorables / défavorables 5/7', 0, {'k': 0, 'r': 3, 'v': 5, 'b': 4},
          '\\frac{5}{7}', 'incorrect'),
     spec('Rouge ou bleue 7/12', 0, {'k': 1, 'r': 3, 'v': 5, 'b': 4}, '\\frac{7}{12}', 'correct'),
     spec('2 R, 4 V, 6 B : 4/12 non simplifié (ambre)', 0, {'k': 0, 'r': 2, 'v': 4, 'b': 6},
          '\\frac{4}{12}', 'unoptimal_form', ['reducedFractions']),
     spec('Dé à 8 : pair, 0,5 accepté', 1, {'k': 0, 'n': 8, 'm': 2}, '0,5', 'correct'),
     spec('Dé à 10 : ≥ 7, 4/10 → 2/5', 1, {'k': 1, 'n': 10, 'm': 7}, '\\frac{2}{5}', 'correct'),
     spec('Erreur : 3/10 (7 oublié)', 1, {'k': 1, 'n': 10, 'm': 7}, '\\frac{3}{10}', 'incorrect'),
     spec('Roi : 1/8', 2, {'k': 0}, '\\frac{1}{8}', 'correct'),
     spec('Figure : 3/8', 2, {'k': 2}, '\\frac{3}{8}', 'correct'),
     spec('Erreur : figure 3/32', 2, {'k': 2}, '\\frac{3}{32}', 'incorrect'),
     spec('PROBABILITE, voyelle : 5/11', 3, {'k': 0, 'j': 0}, '\\frac{5}{11}', 'correct'),
     spec('ALEATOIRE, voyelle : 2/3', 3, {'k': 2, 'j': 0}, '\\frac{2}{3}', 'correct'),
     spec('MATHEMATIQUES, M : 2/13', 3, {'k': 1, 'j': 1}, '\\frac{2}{13}', 'correct'),
     spec('Erreur : 1/13 (une seule lettre M comptée)', 3, {'k': 1, 'j': 1}, '\\frac{1}{13}',
          'incorrect')],
    delay=60, shared=PROBA))

# --- 4. 4-079 : évènement contraire ----------------------------------------------------------

CONTRAIRE = ('**Évènement contraire.** $P(\\text{non } A) = 1 - P(A)$ : un évènement et son contraire'
             ' ont des probabilités de somme $1$.')

CT_DECIMAL = variation(
    'La probabilité qu\'il pleuve demain est estimée à $' + ev('a/100;d') + '$.\n\n'
    'Quelle est la probabilité qu\'il ne pleuve pas demain ?' + CASE,
    [var('a', '11..89')],
    [ev('1-a/100;d')],
    [CONTRAIRE, '$$1 - ' + ev('a/100;d') + ' = ' + col('{{solution}}') + '$$'],
    ['mod(a,10)!=0'])

CT_FRACTION = variation(
    'À un jeu, la probabilité de gagner est $\\dfrac{{{a}}}{{{b}}}$.\n\n'
    'Quelle est la probabilité de perdre ?' + CASE,
    [var('b', '5..12'), var('a', '1..b')],
    [ev('(b-a)/b')],
    [CONTRAIRE,
     '« Perdre » est le contraire de « gagner ».',
     '$$1 - \\frac{{{a}}}{{{b}}} = \\frac{{{b}}}{{{b}}} - \\frac{{{a}}}{{{b}}} = '
     + col('{{solution}}') + '$$'],
    ['a<b', 'gcd(a,b)==1'])

CT_DE = variation(
    'On lance un dé équilibré à ${{n}}$ faces, numérotées de $1$ à ${{n}}$.\n\n'
    'Quelle est la probabilité de ne pas obtenir le ${{m}}$ ?' + CASE,
    [var('n', '6|8|10|12|20'), var('m', '1..n')],
    [ev('(n-1)/n')],
    [CONTRAIRE,
     'La probabilité d\'obtenir le ${{m}}$ est $\\dfrac{1}{{{n}}}$.',
     '$$1 - \\frac{1}{{{n}}} = ' + col('{{solution}}') + '$$'])

CT_URNE = variation(
    'Un sac contient ${{r}}$ jetons rouges, ${{v}}$ jetons verts et ${{b}}$ jetons bleus. On tire'
    ' un jeton au hasard.\n\n'
    'Quelle est la probabilité de ne pas tirer un jeton rouge ?' + CASE,
    [var('r', '2..9'), var('v', '2..9'), var('b', '2..9')],
    [ev('1-r/(r+v+b)')],
    [CONTRAIRE,
     'Il y a $' + ev('r+v+b') + '$ jetons : $P(\\text{rouge}) = \\dfrac{{{r}}}{' + ev('r+v+b')
     + '}$.',
     '$$P(\\text{non rouge}) = 1 - \\frac{{{r}}}{' + ev('r+v+b') + '} = ' + col('{{solution}}')
     + '$$'],
    ['r!=v', 'v!=b', 'r!=b'])

MODELES.append(modele(
    '04-evenement-contraire', 'Évènement contraire',
    'Calculer la probabilité de l\'évènement contraire : P(non A) = 1 − P(A), avec P(A) décimal ou'
    ' en fraction',
    'Calculer', 'Évènement contraire', 1,
    [CT_DECIMAL, CT_FRACTION, CT_DE, CT_URNE],
    [spec('0,35 → 0,65', 0, {'a': 35}, '0,65', 'correct'),
     spec('Erreur : 0,75 (retenue)', 0, {'a': 35}, '0,75', 'incorrect'),
     spec('3/8 → 5/8', 1, {'a': 3, 'b': 8}, '\\frac{5}{8}', 'correct'),
     spec('3/8 → 0,625 accepté', 1, {'a': 3, 'b': 8}, '0,625', 'correct'),
     spec('Erreur : inverse 8/3', 1, {'a': 3, 'b': 8}, '\\frac{8}{3}', 'incorrect'),
     spec('Dé à 6 : 5/6', 2, {'n': 6, 'm': 6}, '\\frac{5}{6}', 'correct'),
     spec('Erreur : 1/6', 2, {'n': 6, 'm': 6}, '\\frac{1}{6}', 'incorrect'),
     spec('3 R, 5 V, 4 B : 9/12 (ambre)', 3, {'r': 3, 'v': 5, 'b': 4}, '\\frac{9}{12}',
          'unoptimal_form', ['reducedFractions']),
     spec('3 R, 5 V, 4 B : 3/4', 3, {'r': 3, 'v': 5, 'b': 4}, '\\frac{3}{4}', 'correct'),
     spec('Erreur : 1/4 (rouge)', 3, {'r': 3, 'v': 5, 'b': 4}, '\\frac{1}{4}', 'incorrect')],
    delay=45, shared=PROBA))

# --- 5. 4-049 : deux épreuves ----------------------------------------------------------------

DEUX = ('**Deux épreuves.** On écrit toutes les issues (tableau ou arbre) : elles sont'
        ' équiprobables, puis on compte celles qui réalisent l\'évènement.')

PIECES = [('obtenir deux fois Pile', '\\frac{1}{4}', 'une seule issue, PP'),
          ('obtenir au moins une fois Pile', '\\frac{3}{4}', 'trois issues : PP, PF et FP'),
          ('obtenir une fois Pile et une fois Face', '\\frac{1}{2}', 'deux issues : PF et FP')]
DE_PIECES = variation(
    'On lance deux pièces équilibrées.\n\n'
    'Quelle est la probabilité d\'' + selon('k', [t for t, _, _ in PIECES]) + ' ?' + CASE,
    [var('k', '0..2')],
    [selon('k', [p for _, p, _ in PIECES])],
    [DEUX,
     'Les issues sont PP, PF, FP, FF (P pour Pile, F pour Face) : quatre issues équiprobables.'
     ' PF et FP sont deux issues différentes (la première pièce, puis la seconde).',
     'L\'évènement compte ' + selon('k', [n for _, _, n in PIECES]) + ' : $P = '
     + col('{{solution}}') + '$.'])

# k = 0 : Pile et le m ; k = 1 : Face et un nombre pair
DE_PIECE_DE = variation(
    'On lance une pièce équilibrée et un dé équilibré à six faces.\n\n'
    'Quelle est la probabilité d\'obtenir ' + selon('k', ['Pile et le ${{m}}$',
                                                         'Face et un nombre pair']) + ' ?' + CASE,
    [var('k', '0..1'), var('m', '1..6')],
    [selon('k', ['\\frac{1}{12}', '\\frac{1}{4}'])],
    [DEUX,
     'Il y a $2 \\times 6 = 12$ issues équiprobables : P1, P2, …, P6, F1, F2, …, F6.',
     selon('k', ['Une seule réalise l\'évènement, P{{m}} : $P = ' + col('{{solution}}') + '$.',
                 'Trois le réalisent, F2, F4 et F6 : $P = \\dfrac{3}{12} = ' + col('{{solution}}')
                 + '$.'])])

SOMMES = ('\n\n| $+$ | $1$ | $2$ | $3$ | $4$ | $5$ | $6$ |\n|---|---|---|---|---|---|---|\n'
          + '\n'.join('| $' + str(a) + '$ | ' + ' | '.join('$' + str(a + b) + '$' for b in range(1, 7))
                      + ' |' for a in range(1, 7)) + '\n\n')
DE_DEUX_DES = variation(
    'On lance deux dés équilibrés à six faces et on additionne les deux nombres obtenus. Le'
    ' tableau donne toutes les sommes possibles.' + SOMMES
    + 'Quelle est la probabilité d\'obtenir une somme égale à ${{s}}$ ?' + CASE,
    [var('s', '2..12')],
    [ev('min(s-1,13-s)/36')],
    [DEUX,
     'Le tableau a $6 \\times 6 = 36$ cases : $36$ issues équiprobables.',
     'La somme ${{s}}$ apparaît $' + ev('min(s-1,13-s)') + '$ fois : $P = \\dfrac{'
     + ev('min(s-1,13-s)') + '}{36} = ' + col('{{solution}}') + '$.'])

ARBRE = ('\n\n```probtree\noutcomes: true\n\n'
         + ''.join(p + ':1/2\n' + ''.join('  ' + c + ':1/3, ' + p[0] + c[0] + '\n'
                                          for c in ['Rouge', 'Verte', 'Bleue'])
                   for p in ['Pile', 'Face'])
         + '```\n\n')
URNE_ARBRE = [('Pile et une boule rouge', '\\frac{1}{6}', 'une issue, PR'),
              ('Face et une boule qui n\'est pas rouge', '\\frac{1}{3}', 'deux issues, FV et FB'),
              ('une boule verte', '\\frac{1}{3}', 'deux issues, PV et FV')]
DE_ARBRE = variation(
    'On lance une pièce équilibrée, puis on tire une boule au hasard dans une urne qui contient'
    ' une boule rouge, une boule verte et une boule bleue. L\'arbre donne toutes les issues.'
    + ARBRE + 'Quelle est la probabilité d\'obtenir ' + selon('k', [t for t, _, _ in URNE_ARBRE])
    + ' ?' + CASE,
    [var('k', '0..2')],
    [selon('k', [p for _, p, _ in URNE_ARBRE])],
    [DEUX,
     'L\'arbre a $2 \\times 3 = 6$ issues équiprobables : PR, PV, PB, FR, FV, FB.',
     'L\'évènement compte ' + selon('k', [n for _, _, n in URNE_ARBRE]) + ' : $P = '
     + col('{{solution}}') + '$.'])

MODELES.append(modele(
    '05-deux-epreuves', 'Deux épreuves',
    'Calculer une probabilité dans une expérience à deux épreuves aux issues équiprobables : deux'
    ' pièces, une pièce et un dé, deux dés (tableau des sommes), une pièce puis une urne (arbre)',
    'Calculer', 'Deux épreuves', 2,
    [DE_PIECES, DE_PIECE_DE, DE_DEUX_DES, DE_ARBRE],
    [spec('Deux Pile : 1/4', 0, {'k': 0}, '\\frac{1}{4}', 'correct'),
     spec('Erreur : 1/3 (PP, PF, FF)', 0, {'k': 0}, '\\frac{1}{3}', 'incorrect'),
     spec('Au moins un Pile : 0,75', 0, {'k': 1}, '0,75', 'correct'),
     spec('Erreur : 1/2', 0, {'k': 1}, '\\frac{1}{2}', 'incorrect'),
     spec('Pile et 6 : 1/12', 1, {'k': 0, 'm': 6}, '\\frac{1}{12}', 'correct'),
     spec('Erreur : 1/8 (2 + 6 issues)', 1, {'k': 0, 'm': 6}, '\\frac{1}{8}', 'incorrect'),
     spec('Face et pair : 3/12 (ambre)', 1, {'k': 1, 'm': 1}, '\\frac{3}{12}', 'unoptimal_form',
          ['reducedFractions']),
     spec('Somme 7 : 1/6', 2, {'s': 7}, '\\frac{1}{6}', 'correct'),
     spec('Erreur : 1/11 (onze sommes)', 2, {'s': 7}, '\\frac{1}{11}', 'incorrect'),
     spec('Somme 2 : 1/36', 2, {'s': 2}, '\\frac{1}{36}', 'correct'),
     spec('Somme 10 : 3/36 (ambre)', 2, {'s': 10}, '\\frac{3}{36}', 'unoptimal_form',
          ['reducedFractions']),
     spec('Pile et rouge : 1/6', 3, {'k': 0}, '\\frac{1}{6}', 'correct'),
     spec('Erreur : 1/5 (somme des dénominateurs)', 3, {'k': 0}, '\\frac{1}{5}', 'incorrect'),
     spec('Verte : 2/6 (ambre)', 3, {'k': 2}, '\\frac{2}{6}', 'unoptimal_form',
          ['reducedFractions'])],
    delay=75, shared=PROBA))

# --- 6. 4-050 : fréquences et probabilités ---------------------------------------------------

FREQ = ('**Fréquence et probabilité.** La fréquence observée d\'une issue est son effectif divisé'
        ' par le nombre de répétitions. Quand on répète beaucoup l\'expérience, les fréquences'
        ' observées se rapprochent des probabilités, sans leur être égales en général.')

N6 = ['n1', 'n2', 'n3', 'n4', 'n5']
FR_TABLEAU = variation(
    'On a lancé $500$ fois un dé à six faces. Voici les résultats.\n\n'
    '| Face | $1$ | $2$ | $3$ | $4$ | $5$ | $6$ |\n|---|---|---|---|---|---|---|\n'
    '| Effectif | ' + ' | '.join('${{' + n + '}}$' for n in N6 + ['n6']) + ' |\n\n'
    'Calcule la fréquence observée de la face $6$.' + CASE,
    [var(n, '72..95') for n in N6] + [var('n6', 'eval:500-' + '-'.join(N6))],
    [ev('n6/500')],
    [FREQ,
     '$$\\frac{{{n6}}}{500} = ' + col('{{solution}}') + ' = ' + ev('n6/500;d') + '$$',
     'La probabilité d\'obtenir $6$ avec un dé équilibré est $\\dfrac{1}{6} \\approx 0{,}167$ : la'
     ' fréquence observée en est proche.'],
    ['n6>=72', 'n6<=95'])

EQUILIBRE = [48, 53, 51, 46, 52, 50]
TRUQUE = [38, 41, 36, 40, 35, 110]


def diagramme(titre, effectifs):
    return ('```barres\ntitre: ' + titre + '\naxes: Face ; Effectif\naxe: 0 à 120, de 10 en 10\n'
            + ''.join(str(f) + ' = ' + str(n) + '\n' for f, n in zip(range(1, 7), effectifs))
            + '```')


# k = 0 : le dé A est truqué ; k = 1 : le dé B
FR_TRUQUE = variation(
    'On a lancé $300$ fois chacun de deux dés à six faces, le dé A et le dé B. Les diagrammes'
    ' donnent les effectifs de chaque face.\n\n'
    + selon('k', [diagramme('Dé A', TRUQUE) + '\n\n' + diagramme('Dé B', EQUILIBRE),
                  diagramme('Dé A', EQUILIBRE) + '\n\n' + diagramme('Dé B', TRUQUE)])
    + '\n\nQuel dé semble truqué ?'
    + choix(['Le dé A.', 'Le dé B.', 'Aucun des deux.', 'Les deux.'], melanger=False),
    [var('k', '0..1')], ['{{k}}'],
    [FREQ,
     'Pour un dé équilibré, chaque face sort environ $300 \\div 6 = 50$ fois.',
     'Le dé ' + selon('k', ['A', 'B']) + ' donne la face $6$ $110$ fois, plus du double : '
     + txt('le dé ' + selon('k', ['A', 'B']) + ' semble truqué') + '. Les effectifs de l\'autre'
     ' dé restent proches de $50$ : ils fluctuent seulement.'])

FR_SIMULATION = variation(
    'On a simulé $1\\,000$ lancers d\'un dé équilibré à six faces. Le tableau donne l\'effectif,'
    ' la fréquence observée et la probabilité de chaque face.\n\n'
    '```simulation\nF = 1 ; 2 ; 3 ; 4 ; 5 ; 6\nP = 1/6 ; 1/6 ; 1/6 ; 1/6 ; 1/6 ; 1/6\n'
    'tirages: 1000\ngraine: {{g}}\n```\n\n'
    'Que peut-on dire des fréquences observées ?'
    + choix(['Elles sont proches des probabilités, sans leur être égales.',
             'Elles sont égales aux probabilités.',
             'Elles n\'ont aucun rapport avec les probabilités.',
             'Elles sont toutes égales entre elles.']),
    [var('g', '1..999')], ['0'],
    [FREQ,
     'Les fréquences observées sont toutes voisines de $\\dfrac{1}{6} \\approx 0{,}167$, mais'
     ' aucune ne vaut exactement $\\dfrac{1}{6}$ : ' + txt('elles en sont proches') + '.'])

MODELES.append(modele(
    '06-frequences-et-probabilites', 'Fréquences et probabilités',
    'Comparer les fréquences observées lors de la répétition d\'une expérience aléatoire aux'
    ' probabilités : fréquence d\'une face sur 500 lancers, dé truqué, simulation de 1 000 lancers',
    'Simulation', 'Fréquences', 1,
    [FR_TABLEAU, FR_TRUQUE, FR_SIMULATION],
    [spec('84 sur 500 : 0,168', 0, {'n1': 80, 'n2': 85, 'n3': 90, 'n4': 78, 'n5': 83, 'n6': 84},
          '0,168', 'correct'),
     spec('84/500 accepté', 0, {'n1': 80, 'n2': 85, 'n3': 90, 'n4': 78, 'n5': 83, 'n6': 84},
          '\\frac{21}{125}', 'correct'),
     spec('Erreur : l\'effectif 84', 0,
          {'n1': 80, 'n2': 85, 'n3': 90, 'n4': 78, 'n5': 83, 'n6': 84}, '84', 'incorrect'),
     spec('Erreur : 1/6', 0, {'n1': 80, 'n2': 85, 'n3': 90, 'n4': 78, 'n5': 83, 'n6': 84},
          '\\frac{1}{6}', 'incorrect'),
     spec('Dé A truqué', 1, {'k': 0}, '0', 'correct'),
     spec('Erreur : dé B', 1, {'k': 0}, '1', 'incorrect'),
     spec('Dé B truqué', 1, {'k': 1}, '1', 'correct'),
     spec('Proches sans être égales', 2, {'g': 42}, '0', 'correct'),
     spec('Erreur : égales', 2, {'g': 42}, '1', 'incorrect')],
    delay=60, shared=PROBA))

# --- 7. 4-051 : fluctuation des fréquences ---------------------------------------------------

FLUCT = ('**Fluctuation.** Pour un même nombre de répétitions, les résultats d\'une expérience'
         ' aléatoire changent d\'une série à l\'autre : les fréquences fluctuent. Un écart à la'
         ' probabilité ne prouve pas que la pièce ou le dé est truqué.')

FL_GROUPES = variation(
    'Trois groupes lancent chacun $50$ fois une même pièce équilibrée. Le groupe 1 obtient ${{a}}$'
    ' fois Pile, le groupe 2 ${{b}}$ fois, le groupe 3 ${{c}}$ fois.\n\n'
    'Le groupe 2 affirme : « Notre fréquence de Pile n\'est pas $0{,}5$, donc la pièce est'
    ' truquée. » A-t-il raison ?'
    + choix(['Non : sur $50$ lancers, la fréquence fluctue d\'une série à l\'autre.',
             'Oui : la fréquence devrait valoir exactement $0{,}5$.',
             'Oui : les trois groupes n\'ont pas obtenu le même résultat.',
             'On ne peut rien dire d\'une pièce.']),
    [var('a', '21..29'), var('b', '21..29'), var('c', '21..29')], ['0'],
    [FLUCT,
     'Les fréquences de Pile sont $' + ev('a/50;d') + '$, $' + ev('b/50;d') + '$ et $'
     + ev('c/50;d') + '$ : elles varient autour de $0{,}5$. Sur $50$ lancers, de tels écarts sont'
     ' normaux : ' + txt('le groupe 2 a tort') + '.'],
    ['a!=b', 'b!=c', 'a!=c', 'b!=25'])

FL_SIMULATIONS = variation(
    'Inès et Malo simulent chacun $100$ lancers d\'un dé équilibré à six faces.\n\n'
    'Simulation d\'Inès :\n\n'
    '```simulation\nF = 1 ; 2 ; 3 ; 4 ; 5 ; 6\nP = 1/6 ; 1/6 ; 1/6 ; 1/6 ; 1/6 ; 1/6\n'
    'tirages: 100\ngraine: {{g}}\n```\n\n'
    'Simulation de Malo :\n\n'
    '```simulation\nF = 1 ; 2 ; 3 ; 4 ; 5 ; 6\nP = 1/6 ; 1/6 ; 1/6 ; 1/6 ; 1/6 ; 1/6\n'
    'tirages: 100\ngraine: {{h}}\n```\n\n'
    'Pourquoi leurs fréquences observées sont-elles différentes ?'
    + choix(['Les résultats d\'une expérience aléatoire changent d\'une série de lancers à'
             ' l\'autre.',
             'L\'un des deux s\'est trompé dans sa simulation.',
             'Les deux dés n\'ont pas les mêmes probabilités.',
             'Il faudrait que les fréquences soient égales.']),
    [var('g', '1..999'), var('h', '1..999')], ['0'],
    [FLUCT,
     'Les deux simulations utilisent les mêmes probabilités et le même nombre de lancers ; seuls'
     ' les tirages changent. ' + txt('C\'est la fluctuation') + '.'],
    ['g!=h'])

FL_REFAIRE = variation(
    'Léa lance $20$ fois une pièce équilibrée et obtient ${{a}}$ fois Pile. Elle recommence'
    ' $20$ lancers.\n\n'
    'Que peut-on dire de son nouveau nombre de Pile ?'
    + choix(['On ne peut pas savoir à l\'avance combien de fois elle obtiendra Pile.',
             'Elle obtiendra encore ${{a}}$ fois Pile.',
             'Elle obtiendra exactement $10$ fois Pile.',
             'Elle obtiendra $' + ev('20-a') + '$ fois Pile, pour compenser.']),
    [var('a', '6..14')], ['0'],
    [FLUCT,
     'Chaque série de $20$ lancers donne un résultat différent ; la pièce ne « se souvient » pas'
     ' des lancers d\'avant. ' + txt('On ne peut pas savoir à l\'avance') + ' : on sait seulement'
     ' que le nombre de Pile tourne souvent autour de $10$.'],
    ['a!=10'])

MODELES.append(modele(
    '07-fluctuation-des-frequences', 'Fluctuation des fréquences',
    'Observer la fluctuation des fréquences pour un nombre de répétitions fixé : trois groupes de'
    ' 50 lancers, deux simulations de 100 lancers, recommencer 20 lancers',
    'Simulation', 'Fluctuation', 1,
    [FL_GROUPES, FL_SIMULATIONS, FL_REFAIRE],
    [spec('Fluctuation', 0, {'a': 23, 'b': 27, 'c': 24}, '0', 'correct'),
     spec('Erreur : 0,5 exactement', 0, {'a': 23, 'b': 27, 'c': 24}, '1', 'incorrect'),
     spec('Fluctuation (simulations)', 1, {'g': 12, 'h': 345}, '0', 'correct'),
     spec('Erreur : une erreur de simulation', 1, {'g': 12, 'h': 345}, '1', 'incorrect'),
     spec('On ne peut pas savoir', 2, {'a': 7}, '0', 'correct'),
     spec('Erreur : compenser', 2, {'a': 7}, '3', 'incorrect')],
    delay=45))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
