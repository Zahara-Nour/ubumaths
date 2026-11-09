"""Écrit les 6 modèles du lot « raisonnements et problèmes » de la 1re spé
dans scripts/questions/1spe-raisonnements/.

Phase 0 validée par David le 2026-11-09 (journal « docs/wip/questions-1spe-raisonnements-progress.md »,
§ 4 et § 5), un point par modèle (ADR 0020) :

| # | Point    | Titre                                               | Nœud (celui du point), niveau                     | Niveaux        |
| 1 | 1SPE-205 | Démontrer par contraposée                           | Logique › Raisonnements › par contraposée, 1      | 1_SPE          |
| 2 | 2-216    | Raisonner par disjonction des cas                   | Logique › Raisonnements › disjonction de cas, 1   | 2, 1_SPE       |
| 3 | 2-217    | Raisonner par l'absurde                             | Logique › Raisonnements › par l'absurde, 1        | 2, 1_SPE       |
| 4 | 1SPE-284 | Résoudre un problème d'optimisation                 | Fonctions › Dérivation › variations et extremums, 9 | 1_SPE        |
| 5 | 1SPE-436 | Produit scalaire : résoudre un problème géométrique | Géométrie › Produit scalaire, 1                   | 1_SPE          |
| 6 | 1SPE-437 | Étudier une configuration dans un repère            | Géométrie › Géométrie repérée, 1                  | 1_SPE          |

Forme : celle des démonstrations (lot-1spe-demonstrations-1.py) : le raisonnement est écrit,
l'élève complète une étape (case), choisit une justification (case choix à 4 propositions, la
première est la bonne, l'affichage les mélange) ou range les étapes (` ```ranger `, `signe: aucun`).
Pas de `theme`/`domain`/`subdomain` (ADR 0035) : rangement et tag par migration.

Voisins à ne pas répéter : `93f9ecdf` « Reconnaître un type de raisonnement » (il NOMME le type,
ceux-ci le font PRODUIRE) ; « √2 irrationnel » (démonstration de 2de) ; « Déterminer les extrémums »
(401 : ici le problème est posé en situation).

    python3 docs/wip/questions/lot-1spe-raisonnements.py scripts/questions/1spe-raisonnements
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, answer, status, variables=None):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in (variables or {}).items()},
            'answers': answer if isinstance(answer, list) else [answer],
            'expected': {'status': status}}


def modele(nom, title, description, level, variations, specs, grades=('1_SPE',), shared=None):
    return nom, {'title': title, 'description': description, 'grades': list(grades),
                 'level': level, 'delay': 90, 'status': 'draft',
                 'shared': shared or {},
                 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def ev(x):
    return '{{eval:' + x + '}}'


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def choix(lignes):
    return '\n\n```choix\n' + ''.join('- ' + l + '\n' for l in lignes) + '```'


def case(statement, variables, attendu, steps, conditions=None):
    """Variation à une case ouverte (`?` dans une formule de l'énoncé)."""
    v = {'statement': statement, 'variables': variables,
         'blanks': [attendu if isinstance(attendu, dict) else {'expectedAnswer': attendu}],
         'correction': {'steps': steps}}
    if conditions:
        v['conditions'] = conditions
    return v


def justification(statement, variables, bonne, autres, steps, conditions=None):
    """Variation à une case choix : la première proposition est la bonne (index 0)."""
    v = {'statement': statement + choix([bonne] + autres), 'variables': variables,
         'blanks': [{'expectedAnswer': '0'}], 'correction': {'steps': steps}}
    if conditions:
        v['conditions'] = conditions
    return v


def ranger(intro, etapes, steps, variables=None, conditions=None):
    """Variation « étapes à ranger » : étapes données dans le bon ordre."""
    v = {'statement': intro + '\n\nRemets les étapes du raisonnement dans l\'ordre.\n\n'
         '```ranger\nsigne: aucun\n' + ''.join('- ' + e + '\n' for e in etapes) + '```',
         'variables': variables or [], 'correction': {'steps': steps}}
    if conditions:
        v['conditions'] = conditions
    return v


def specs_choix(vi, juste, erreurs, variables=None):
    out = [spec(juste, vi, '0', 'correct', variables)]
    for k, erreur in enumerate(erreurs, start=1):
        out.append(spec('Erreur : ' + erreur, vi, str(k), 'incorrect', variables))
    return out


MODELES = []

# --- 1. 1SPE-205 : contraposée ---------------------------------------------------------------
# « Pour tout entier naturel n, si n² + c est pair, alors n est impair » (c impair).
# Contraposée : si n est pair, alors n² + c est impair. n = 2k : n² + c = 2(2k² + (c − 1)/2) + 1.

V_205 = [var('c', '1..15')]
C_205 = ['c % 2 = 1']
PROP_205 = ('pour tout entier naturel $n$, si $n^2+' + ev('c') + '$ est pair, alors $n$ est'
            ' impair')
INTRO_205 = 'On veut démontrer la proposition : « ' + PROP_205 + ' ».\n\n'
CONTRA_205 = 'si $n$ est pair, alors $n^2+' + ev('c') + '$ est impair'
CALCUL_205 = ('Soit $n$ un entier naturel pair : $n=2k$ avec $k$ entier naturel. Alors'
              ' $n^2+' + ev('c') + '=4k^2+' + ev('c') + '=2\\left(2k^2+' + ev('(c-1)/2')
              + '\\right)+1$.')

V205_QUOI = justification(
    INTRO_205 + 'On choisit de raisonner par contraposée. Quelle implication démontre-t-on ?',
    V_205,
    'Pour tout entier naturel $n$, ' + CONTRA_205 + '.',
    ['Pour tout entier naturel $n$, si $n$ est impair, alors $n^2+' + ev('c') + '$ est pair.',
     'Pour tout entier naturel $n$, si $n$ est pair, alors $n^2+' + ev('c') + '$ est pair.',
     'Pour tout entier naturel $n$, si $n^2+' + ev('c') + '$ est impair, alors $n$ est pair.'],
    ['La contraposée de « si $A$, alors $B$ » est « si non $B$, alors non $A$ ».',
     'Ici, $A$ : « $n^2+' + ev('c') + '$ est pair » et $B$ : « $n$ est impair ». Non $B$ :'
     ' « $n$ est pair » ; non $A$ : « $n^2+' + ev('c') + '$ est impair ».',
     'On démontre donc : **si $n$ est pair, alors $n^2+' + ev('c') + '$ est impair**.',
     '« Si $n$ est impair, alors $n^2+' + ev('c') + '$ est pair » est la **réciproque** : elle'
     ' n\'est pas équivalente à la proposition de départ.'],
    C_205)

V205_CALCUL = case(
    INTRO_205 + 'On démontre sa contraposée : « ' + CONTRA_205 + ' ».\n\n'
    'Soit $n$ un entier naturel pair : $n=2k$ avec $k$ entier naturel. Complète.\n\n'
    '$n^2+' + ev('c') + '=2\\times\\left(?\\right)+1$',
    V_205, '2k^2+' + ev('(c-1)/2'),
    ['$n^2=(2k)^2=4k^2$, donc $n^2+' + ev('c') + '=4k^2+' + ev('c-1') + '+1$.',
     'On factorise $2$ dans $4k^2+' + ev('c-1') + '$ : $n^2+' + ev('c') + '=2\\times\\left('
     + col('2k^2+' + ev('(c-1)/2')) + '\\right)+1$.',
     'C\'est un nombre impair : la contraposée est démontrée.'],
    C_205)

V205_POURQUOI = justification(
    INTRO_205 + 'On a démontré : « pour tout entier naturel $n$, ' + CONTRA_205 + ' ».\n\n'
    'Pourquoi la proposition de départ est-elle alors démontrée ?',
    V_205,
    'Une implication et sa contraposée sont toujours vraies ou fausses en même temps.',
    ['Une implication et sa réciproque sont toujours vraies ou fausses en même temps.',
     'On a vérifié la proposition pour tous les entiers pairs, ce qui suffit.',
     'Elle n\'est pas démontrée : il faudrait encore traiter le cas où $n$ est impair.'],
    ['L\'implication « si $A$, alors $B$ » et sa contraposée « si non $B$, alors non $A$ » sont'
     ' **équivalentes** : démontrer l\'une, c\'est démontrer l\'autre.',
     'Ce n\'est pas vrai de la réciproque « si $B$, alors $A$ », qui peut être fausse quand'
     ' l\'implication est vraie.',
     'Il n\'y a pas d\'autre cas à traiter : la contraposée a été démontrée pour tout $n$.'],
    C_205)

V205_RANGER = ranger(
    'On veut démontrer : « ' + PROP_205 + ' ».',
    ['On démontre la contraposée : si $n$ est pair, alors $n^2+' + ev('c') + '$ est impair.',
     'Soit $n$ un entier naturel pair : $n=2k$ avec $k$ entier naturel.',
     'Alors $n^2+' + ev('c') + '=2\\left(2k^2+' + ev('(c-1)/2') + '\\right)+1$.',
     'Donc $n^2+' + ev('c') + '$ est impair : la contraposée est vraie.',
     'Une implication et sa contraposée sont équivalentes : la proposition est démontrée.'],
    ['On annonce d\'abord la contraposée à démontrer, puis on part de son hypothèse ($n$ pair).',
     CALCUL_205,
     'La contraposée est démontrée, donc la proposition de départ aussi.'],
    V_205, C_205)

VARS_205 = {'c': 5}
MODELES.append(modele(
    '01-demontrer-par-contraposee', 'Démontrer par contraposée',
    'Raisonnement par contraposée sur la parité (si n² + c est pair, alors n est impair) :'
    ' contraposée à choisir, calcul n² + c = 2(2k² + …) + 1 à compléter, pourquoi cela suffit,'
    ' étapes à ranger',
    1,
    [V205_QUOI, V205_CALCUL, V205_POURQUOI, V205_RANGER],
    specs_choix(0, 'contraposée', ['réciproque', 'n pair ⇒ pair', 'négations dans le mauvais ordre'],
                VARS_205)
    + [spec('2k² + 2', 1, '2k^2+2', 'correct', VARS_205),
       spec('Écriture 2 + 2k²', 1, '2+2k^2', 'correct', VARS_205),
       spec('Erreur : 2k² + 5', 1, '2k^2+5', 'incorrect', VARS_205),
       spec('Erreur : 4k² + 4', 1, '4k^2+4', 'incorrect', VARS_205),
       spec('Erreur : k² + 2', 1, 'k^2+2', 'incorrect', VARS_205)]
    + specs_choix(2, 'contraposée équivalente', ['réciproque', 'cas pairs suffisent', 'cas impair'],
                  VARS_205)
    + [('RANGER', 3, VARS_205)]))

# --- 2. 2-216 : disjonction des cas -----------------------------------------------------------
# « Pour tout entier naturel n, n(n + 1) + 2c est pair. »

V_216 = [var('c', '1..9')]
PROP_216 = 'pour tout entier naturel $n$, $n(n+1)+' + ev('2*c') + '$ est pair'
INTRO_216 = 'On veut démontrer : « ' + PROP_216 + ' ».\n\n'

V216_CAS = justification(
    INTRO_216 + 'On raisonne par disjonction des cas. Quels cas distingue-t-on ?',
    V_216,
    '$n$ est pair, ou $n$ est impair.',
    ['$n<' + ev('c') + '$, ou $n\\geqslant' + ev('c') + '$.',
     '$n=0$, ou $n\\neq 0$.',
     '$n$ est premier, ou $n$ n\'est pas premier.'],
    ['La parité de $n(n+1)$ dépend de la parité de $n$ : on distingue **$n$ pair** et'
     ' **$n$ impair**.',
     'Ces deux cas couvrent tous les entiers naturels, et dans chacun on sait écrire $n$'
     ' ($n=2k$ ou $n=2k+1$).',
     'Les autres découpages couvrent aussi tous les entiers, mais ne disent rien de la parité'
     ' de $n(n+1)$.'])

V216_IMPAIR = case(
    INTRO_216 + 'Premier cas : $n$ est pair, $n=2k$ avec $k$ entier naturel, et'
    ' $n(n+1)=2k(2k+1)$ est pair.\n\n'
    'Second cas : $n$ est impair, $n=2k+1$ avec $k$ entier naturel. Complète.\n\n'
    '$n(n+1)=(2k+1)(2k+2)=2\\times\\left(?\\right)$',
    V_216, {'expectedAnswer': '(2k+1)(k+1)', 'requiredForm': {'pattern': 'u'}},
    ['$2k+2=2(k+1)$, donc $(2k+1)(2k+2)=2\\times' + col('(2k+1)(k+1)') + '$.',
     'Donc $n(n+1)$ est pair, et $n(n+1)+' + ev('2*c') + '$ aussi (somme de deux nombres'
     ' pairs).',
     'Dans les deux cas, $n(n+1)+' + ev('2*c') + '$ est pair : la proposition est démontrée.'])

V216_RANGER = ranger(
    'On veut démontrer : « ' + PROP_216 + ' ».',
    ['On distingue deux cas : $n$ pair, ou $n$ impair.',
     'Si $n$ est pair, $n=2k$, et $n(n+1)=2k(2k+1)$ est pair.',
     'Si $n$ est impair, $n=2k+1$, et $n(n+1)=2(2k+1)(k+1)$ est pair.',
     'Dans les deux cas, $n(n+1)$ est pair, donc $n(n+1)+' + ev('2*c') + '$ aussi.'],
    ['On annonce les cas, on les traite l\'un après l\'autre, puis on conclut pour tous les'
     ' entiers.',
     'La conclusion vient en dernier : elle s\'appuie sur les deux cas.'],
    V_216)

VARS_216 = {'c': 3}
MODELES.append(modele(
    '02-raisonner-par-disjonction-des-cas', 'Raisonner par disjonction des cas',
    'Disjonction des cas sur la parité (n(n + 1) + 2c est pair) : cas à choisir, cas n impair'
    ' à compléter, étapes à ranger',
    1,
    [V216_CAS, V216_IMPAIR, V216_RANGER],
    specs_choix(0, 'pair / impair', ['n < c', 'n = 0', 'premier'], VARS_216)
    + [spec('(2k + 1)(k + 1)', 1, '(2k+1)(k+1)', 'correct', VARS_216),
       spec('Forme développée 2k² + 3k + 1', 1, '2k^2+3k+1', 'correct', VARS_216),
       spec('Erreur : (2k + 1)(2k + 2)', 1, '(2k+1)(2k+2)', 'incorrect', VARS_216),
       spec('Erreur : (k + 1)(k + 2)', 1, '(k+1)(k+2)', 'incorrect', VARS_216),
       ('RANGER', 2, VARS_216)],
    grades=('2', '1_SPE')))

# --- 3. 2-217 : absurde -----------------------------------------------------------------------
# « Il n'existe aucun entier naturel n tel que n² = p », p = q² + t, 1 ≤ t ≤ 2q.

V_217 = [var('q', '2..9'), var('t', '1..18'), var('p', ev('q^2+t'))]
C_217 = ['t <= 2*q']
PROP_217 = 'il n\'existe aucun entier naturel $n$ tel que $n^2=' + ev('p') + '$'
INTRO_217 = 'On veut démontrer : « ' + PROP_217 + ' ».\n\n'
ENCADRE_217 = ('$' + ev('q') + '^2=' + ev('q^2') + '<' + ev('p') + '<' + ev('(q+1)^2') + '='
               + ev('q+1') + '^2$')

V217_DEBUT = justification(
    INTRO_217 + 'On raisonne par l\'absurde. Par quoi commence-t-on ?',
    V_217,
    'Supposons qu\'il existe un entier naturel $n$ tel que $n^2=' + ev('p') + '$.',
    ['Supposons que, pour tout entier naturel $n$, $n^2\\neq' + ev('p') + '$.',
     'Prenons $n=' + ev('q') + '$ et calculons $n^2$.',
     'Vérifions que $n^2\\neq' + ev('p') + '$ pour $n=0$, $n=1$ et $n=2$.'],
    ['Un raisonnement par l\'absurde suppose **le contraire de ce qu\'on veut démontrer**, puis'
     ' aboutit à une impossibilité.',
     'Le contraire de « il n\'existe aucun $n$ tel que $n^2=' + ev('p') + '$ » est'
     ' « **il existe** un entier naturel $n$ tel que $n^2=' + ev('p') + '$ ».',
     'Supposer « pour tout $n$, $n^2\\neq' + ev('p') + '$ », c\'est supposer ce qu\'on veut'
     ' démontrer ; essayer quelques valeurs ne démontre rien pour tous les entiers.'],
    C_217)

V217_ENCADRE = case(
    INTRO_217 + 'Supposons qu\'il existe un entier naturel $n$ tel que $n^2=' + ev('p') + '$.\n\n'
    'Comme ' + ENCADRE_217 + ', on a $' + ev('q') + '^2<n^2<' + ev('q+1') + '^2$. Complète.\n\n'
    '$' + ev('q') + '<n<?$',
    V_217, ev('q+1'),
    ['Les nombres $' + ev('q') + '$, $n$ et $' + ev('q+1') + '$ sont positifs, et la fonction'
     ' carré est strictement croissante sur $[0\\,;+\\infty[$ : elle conserve l\'ordre.',
     'De $' + ev('q') + '^2<n^2<' + ev('q+1') + '^2$, on déduit $' + ev('q') + '<n<'
     + col(ev('q+1')) + '$.',
     'Or il n\'y a aucun entier strictement entre $' + ev('q') + '$ et $' + ev('q+1')
     + '$ : c\'est impossible.'],
    C_217)

V217_CONTRA = justification(
    INTRO_217 + 'Supposons qu\'il existe un entier naturel $n$ tel que $n^2=' + ev('p') + '$.'
    ' Comme ' + ENCADRE_217 + ', on obtient $' + ev('q') + '<n<' + ev('q+1') + '$.\n\n'
    'Où est la contradiction ?',
    V_217,
    'Aucun entier n\'est strictement compris entre deux entiers consécutifs.',
    ['$n^2$ ne peut pas être égal à $' + ev('p') + '$ car $' + ev('p') + '$ est impair.',
     'Un carré est toujours positif.',
     'Il n\'y a pas de contradiction : $n$ est un nombre décimal.'],
    ['$' + ev('q') + '$ et $' + ev('q+1') + '$ sont deux entiers consécutifs : aucun entier'
     ' n\'est strictement entre eux.',
     'Or $n$ est un entier, par hypothèse : l\'encadrement $' + ev('q') + '<n<' + ev('q+1')
     + '$ est **impossible**.',
     'L\'hypothèse de départ est donc fausse : aucun entier naturel $n$ ne vérifie $n^2='
     + ev('p') + '$.'],
    C_217)

V217_RANGER = ranger(
    'On veut démontrer : « ' + PROP_217 + ' ».',
    ['Supposons qu\'il existe un entier naturel $n$ tel que $n^2=' + ev('p') + '$.',
     'Comme ' + ENCADRE_217 + ', on a $' + ev('q') + '<n<' + ev('q+1') + '$.',
     'Or aucun entier n\'est strictement compris entre $' + ev('q') + '$ et $' + ev('q+1')
     + '$ : c\'est impossible.',
     'L\'hypothèse est fausse : il n\'existe aucun entier naturel $n$ tel que $n^2=' + ev('p')
     + '$.'],
    ['On suppose le contraire, on en déduit une impossibilité, puis on conclut que la'
     ' supposition était fausse.'],
    V_217, C_217)

VARS_217 = {'q': 4, 't': 3, 'p': 19}
MODELES.append(modele(
    '03-raisonner-par-l-absurde', 'Raisonner par l\'absurde',
    'Raisonnement par l\'absurde (aucun entier n tel que n² = p, p entre deux carrés consécutifs) :'
    ' hypothèse de départ à choisir, encadrement à compléter, contradiction à nommer, étapes à'
    ' ranger',
    1,
    [V217_DEBUT, V217_ENCADRE, V217_CONTRA, V217_RANGER],
    specs_choix(0, 'supposer le contraire', ['supposer la conclusion', 'un exemple',
                                              'quelques valeurs'], VARS_217)
    + [spec('5', 1, '5', 'correct', VARS_217),
       spec('Erreur : 19', 1, '19', 'incorrect', VARS_217),
       spec('Erreur : 25', 1, '25', 'incorrect', VARS_217),
       spec('Erreur : 4', 1, '4', 'incorrect', VARS_217)]
    + specs_choix(2, 'entiers consécutifs', ['p impair', 'carré positif', 'n décimal'],
                  VARS_217)
    + [('RANGER', 3, VARS_217)],
    grades=('2', '1_SPE')))

# --- 4. 1SPE-284 : optimisation ---------------------------------------------------------------
# Enclos rectangulaire contre un mur, m mètres de clôture, largeur x : A(x) = x(m − 2x),
#   A′(x) = m − 4x, maximum en x = m/4 (m multiple de 4).
# Boîte sans couvercle dans un carré de côté a, carrés de côté x découpés aux coins :
#   V(x) = x(a − 2x)², V′(x) = (a − 2x)(a − 6x), maximum en x = a/6, V(a/6) = 2a³/27 (a multiple de 6).

V_ENCLOS = [var('m', '20..80')]
C_ENCLOS = ['m % 4 = 0']
INTRO_ENCLOS = ('On dispose de $' + ev('m') + '~\\unit{m}$ de clôture pour fermer un enclos'
                ' rectangulaire adossé à un mur : la clôture forme les trois autres côtés. On note'
                ' $x$ la largeur de l\'enclos (en mètres), c\'est-à-dire la longueur des deux'
                ' côtés perpendiculaires au mur, avec $0<x<' + ev('m/2') + '$.\n\n')

V284_AIRE = case(
    INTRO_ENCLOS + 'Exprime l\'aire $A(x)$ de l\'enclos (en $\\unit{m^2}$) en fonction de $x$.\n\n'
    '$A(x)=?$',
    V_ENCLOS, {'expectedAnswer': 'x(' + ev('m') + '-2x)', 'requiredForm': {'pattern': 'u'}},
    ['Les deux côtés perpendiculaires au mur mesurent $x$ : il reste $' + ev('m') + '-2x$ mètres'
     ' de clôture pour le côté parallèle au mur.',
     'L\'aire est longueur fois largeur : $A(x)=' + col('x(' + ev('m') + '-2x)') + '$.'],
    C_ENCLOS)

V284_ENCLOS_X = case(
    INTRO_ENCLOS + 'L\'aire de l\'enclos est $A(x)=x(' + ev('m') + '-2x)$, et sa dérivée est'
    ' $A\'(x)=' + ev('m') + '-4x$.\n\n'
    'Pour quelle largeur $x$ (en mètres) l\'aire de l\'enclos est-elle maximale ?\n\n$x=?$',
    V_ENCLOS, ev('m/4'),
    ['$A\'(x)=' + ev('m') + '-4x$ s\'annule en $x=' + ev('m/4') + '$ ; elle est positive avant et'
     ' négative après.',
     '$A$ est donc croissante sur $\\left]0\\,;' + ev('m/4') + '\\right]$ puis décroissante sur'
     ' $\\left[' + ev('m/4') + '\\,;' + ev('m/2') + '\\right[$ : elle atteint son maximum en'
     ' $x=' + col(ev('m/4')) + '$.',
     'L\'enclos mesure alors $' + ev('m/4') + '~\\unit{m}$ sur $' + ev('m/2') + '~\\unit{m}$, pour'
     ' une aire de $' + ev('m^2/8') + '~\\unit{m^2}$.'],
    C_ENCLOS)

V_BOITE = [var('a', '6..30')]
C_BOITE = ['a % 6 = 0']
INTRO_BOITE = ('Dans une plaque carrée de côté $' + ev('a') + '~\\unit{cm}$, on découpe à chaque'
               ' coin un carré de côté $x$ (en centimètres), avec $0<x<' + ev('a/2') + '$, puis on'
               ' replie les bords pour former une boîte sans couvercle.\n\n'
               'Son volume est $V(x)=x(' + ev('a') + '-2x)^2$ (en $\\unit{cm^3}$), et sa dérivée'
               ' est $V\'(x)=(' + ev('a') + '-2x)(' + ev('a') + '-6x)$.\n\n')
VARIATIONS_BOITE = ['Sur $\\left]0\\,;' + ev('a/2') + '\\right[$, $' + ev('a') + '-2x>0$ : $V\'(x)$'
                    ' a le signe de $' + ev('a') + '-6x$, positif avant $' + ev('a/6')
                    + '$ et négatif après.',
                    '$V$ est donc croissante puis décroissante : son maximum est atteint en'
                    ' $x=' + ev('a/6') + '$.']

V284_BOITE_X = case(
    INTRO_BOITE + 'Pour quelle valeur de $x$ (en centimètres) le volume de la boîte est-il'
    ' maximal ?\n\n$x=?$',
    V_BOITE, ev('a/6'),
    VARIATIONS_BOITE
    + ['La valeur $x=' + ev('a/2') + '$, qui annule aussi $V\'$, n\'est pas dans l\'intervalle :'
       ' la boîte n\'existe plus. Réponse : $x=' + col(ev('a/6')) + '$.'],
    C_BOITE)

V284_BOITE_V = case(
    INTRO_BOITE + 'Quel est le volume maximal de la boîte (en $\\unit{cm^3}$) ?\n\n$?$',
    V_BOITE, ev('2*a^3/27'),
    VARIATIONS_BOITE
    + ['$V\\left(' + ev('a/6') + '\\right)=' + ev('a/6') + '\\times(' + ev('a') + '-'
       + ev('a/3') + ')^2=' + ev('a/6') + '\\times' + ev('2*a/3') + '^2=' + col(ev('2*a^3/27'))
       + '$.',
       'Le volume maximal est de $' + ev('2*a^3/27') + '~\\unit{cm^3}$.'],
    C_BOITE)

VARS_ENCLOS = {'m': 40}
VARS_BOITE = {'a': 12}
MODELES.append(modele(
    '04-resoudre-un-probleme-d-optimisation', 'Résoudre un problème d\'optimisation',
    'Problèmes guidés : enclos contre un mur (aire A(x) = x(m − 2x) à exprimer, largeur optimale'
    ' m/4) ; boîte sans couvercle (V′ donnée, côté optimal a/6, volume maximal 2a³/27)',
    9,
    [V284_AIRE, V284_ENCLOS_X, V284_BOITE_X, V284_BOITE_V],
    [spec('x(40 − 2x)', 0, 'x(40-2x)', 'correct', VARS_ENCLOS),
     spec('Forme développée 40x − 2x²', 0, '40x-2x^2', 'correct', VARS_ENCLOS),
     spec('Erreur : x(40 − x)', 0, 'x(40-x)', 'incorrect', VARS_ENCLOS),
     spec('Erreur : x(20 − x)', 0, 'x(20-x)', 'incorrect', VARS_ENCLOS),
     spec('Erreur : 2x + 40', 0, '2x+40', 'incorrect', VARS_ENCLOS),
     spec('10', 1, '10', 'correct', VARS_ENCLOS),
     spec('Erreur : 20 (borne de l\'intervalle)', 1, '20', 'incorrect', VARS_ENCLOS),
     spec('Erreur : 200 (l\'aire au lieu de x)', 1, '200', 'incorrect', VARS_ENCLOS),
     spec('2', 2, '2', 'correct', VARS_BOITE),
     spec('Erreur : 6 (racine hors intervalle)', 2, '6', 'incorrect', VARS_BOITE),
     spec('Erreur : 128 (le volume au lieu de x)', 2, '128', 'incorrect', VARS_BOITE),
     spec('128', 3, '128', 'correct', VARS_BOITE),
     spec('Erreur : 2 (x au lieu du volume)', 3, '2', 'incorrect', VARS_BOITE),
     spec('Erreur : 200', 3, '200', 'incorrect', VARS_BOITE)]))

# --- 5. 1SPE-436 : produit scalaire, problème géométrique --------------------------------------
# Carré ABCD de côté a, I milieu de [AB], J milieu de [BC] : DI·AJ = (DA + AI)·(AB + BJ)
#   = DA·AB + DA·BJ + AI·AB + AI·BJ = 0 − a²/2 + a²/2 + 0 = 0.
# Rectangle ABCD, AB = L, AD = l : AC·BD = (AB + BC)·(−AB + BC) = l² − L².


def vec(x):
    return '\\overrightarrow{' + x + '}'


def ps(x, y):
    return vec(x) + '\\cdot' + vec(y)


V_436 = [var('a', '2..10')]
C_436 = ['a % 2 = 0']
INTRO_436 = ('$ABCD$ est un carré de côté $' + ev('a') + '$. $I$ est le milieu de $[AB]$ et $J$'
             ' le milieu de $[BC]$. On veut démontrer que les droites $(DI)$ et $(AJ)$ sont'
             ' perpendiculaires.\n\n'
             'Par la relation de Chasles, $' + vec('DI') + '=' + vec('DA') + '+' + vec('AI')
             + '$ et $' + vec('AJ') + '=' + vec('AB') + '+' + vec('BJ') + '$, donc :\n\n'
             '$$' + ps('DI', 'AJ') + '=' + ps('DA', 'AB') + '+' + ps('DA', 'BJ') + '+'
             + ps('AI', 'AB') + '+' + ps('AI', 'BJ') + '$$\n\n')
FIN_436 = ('Donc $' + ps('DI', 'AJ') + '=0-' + ev('a^2/2') + '+' + ev('a^2/2') + '+0=0$ :'
           ' les droites $(DI)$ et $(AJ)$ sont perpendiculaires.')

V436_DABJ = case(
    INTRO_436 + 'Complète.\n\n$' + ps('DA', 'BJ') + '=?$',
    V_436, ev('-a^2/2'),
    ['$' + vec('DA') + '$ et $' + vec('BJ') + '$ sont colinéaires et de **sens contraires**'
     ' ($' + vec('BJ') + '$ va de $B$ vers $C$, comme $' + vec('AD') + '$).',
     '$' + ps('DA', 'BJ') + '=-DA\\times BJ=-' + ev('a') + '\\times' + ev('a/2') + '='
     + col(ev('-a^2/2')) + '$.',
     FIN_436],
    C_436)

V436_AIAB = case(
    INTRO_436 + 'Complète.\n\n$' + ps('AI', 'AB') + '=?$',
    V_436, ev('a^2/2'),
    ['$' + vec('AI') + '$ et $' + vec('AB') + '$ sont colinéaires et de **même sens**.',
     '$' + ps('AI', 'AB') + '=AI\\times AB=' + ev('a/2') + '\\times' + ev('a') + '='
     + col(ev('a^2/2')) + '$.',
     FIN_436],
    C_436)

V436_NUL = justification(
    INTRO_436 + 'Pourquoi $' + ps('DA', 'AB') + '=0$ ?',
    V_436,
    'Car les droites $(DA)$ et $(AB)$ sont perpendiculaires.',
    ['Car $DA=AB$.',
     'Car $A$ est un point commun aux deux vecteurs.',
     'Car les vecteurs $' + vec('DA') + '$ et $' + vec('AB') + '$ sont colinéaires.'],
    ['$ABCD$ est un carré : l\'angle $\\widehat{DAB}$ est droit.',
     'Le produit scalaire de deux vecteurs orthogonaux est **nul** : $' + ps('DA', 'AB')
     + '=0$. De même, $' + ps('AI', 'BJ') + '=0$.',
     'Des longueurs égales ne rendent pas un produit scalaire nul : $' + ps('AB', 'AB') + '='
     + ev('a^2') + '$.'],
    C_436)

V_RECT = [var('L', '3..9'), var('l', '2..8')]
C_RECT = ['l < L']
V436_RECT = case(
    '$ABCD$ est un rectangle tel que $AB=' + ev('L') + '$ et $AD=' + ev('l') + '$. On étudie'
    ' l\'angle de ses diagonales $[AC]$ et $[BD]$.\n\n'
    'Par la relation de Chasles, $' + vec('AC') + '=' + vec('AB') + '+' + vec('BC') + '$ et $'
    + vec('BD') + '=-' + vec('AB') + '+' + vec('BC') + '$, avec $' + ps('AB', 'BC') + '=0$.\n\n'
    'Complète.\n\n$' + ps('AC', 'BD') + '=?$',
    V_RECT, ev('l^2-L^2'),
    ['$' + ps('AC', 'BD') + '=-' + ps('AB', 'AB') + '+' + ps('AB', 'BC') + '-' + ps('BC', 'AB')
     + '+' + ps('BC', 'BC') + '=-AB^2+BC^2$.',
     'Avec $BC=AD=' + ev('l') + '$ : $' + ps('AC', 'BD') + '=' + ev('l^2') + '-' + ev('L^2')
     + '=' + col(ev('l^2-L^2')) + '$.',
     'Ce produit scalaire n\'est pas nul : les diagonales ne sont pas perpendiculaires. Elles le'
     ' sont seulement quand $AB=AD$, c\'est-à-dire quand le rectangle est un carré.'],
    C_RECT)

VARS_436 = {'a': 6}
VARS_RECT = {'L': 5, 'l': 3}
MODELES.append(modele(
    '05-produit-scalaire-probleme-geometrique',
    'Produit scalaire : résoudre un problème géométrique',
    'Carré ABCD, I et J milieux de [AB] et [BC] : (DI) ⊥ (AJ) par Chasles (DA·BJ, AI·AB à'
    ' calculer, DA·AB = 0 à justifier) ; rectangle : AC·BD = AD² − AB²',
    1,
    [V436_DABJ, V436_AIAB, V436_NUL, V436_RECT],
    [spec('−18', 0, '-18', 'correct', VARS_436),
     spec('Erreur : 18 (sens oublié)', 0, '18', 'incorrect', VARS_436),
     spec('Erreur : −36', 0, '-36', 'incorrect', VARS_436),
     spec('Erreur : 0', 0, '0', 'incorrect', VARS_436),
     spec('18', 1, '18', 'correct', VARS_436),
     spec('Erreur : 36', 1, '36', 'incorrect', VARS_436),
     spec('Erreur : 0', 1, '0', 'incorrect', VARS_436)]
    + specs_choix(2, 'orthogonaux', ['longueurs égales', 'point commun', 'colinéaires'], VARS_436)
    + [spec('−16', 3, '-16', 'correct', VARS_RECT),
       spec('Erreur : 16', 3, '16', 'incorrect', VARS_RECT),
       spec('Erreur : 0', 3, '0', 'incorrect', VARS_RECT),
       spec('Erreur : 34', 3, '34', 'incorrect', VARS_RECT)]))

# --- 6. 1SPE-437 : configuration en repère ----------------------------------------------------
# Carré ABCD, repère (A ; AB, AD) : A(0 ; 0), B(1 ; 0), C(1 ; 1), D(0 ; 1).
# I milieu de [CD] : I(1/2 ; 1). J sur [BC], BJ = 3/4 BC : J(1 ; 3/4).
# AI² = 5/4 = 20/16, IJ² = 5/16, AJ² = 25/16 = AI² + IJ² : AIJ rectangle en I.

INTRO_437 = ('$ABCD$ est un carré. $I$ est le milieu de $[CD]$, et $J$ est le point de $[BC]$ tel'
             ' que $BJ=\\dfrac{3}{4}BC$. On veut démontrer que le triangle $AIJ$ est rectangle'
             ' en $I$.\n\n')
REPERE_437 = ('On se place dans le repère $\\left(A\\,;' + vec('AB') + ',' + vec('AD')
              + '\\right)$ : $A(0\\,;0)$, $B(1\\,;0)$, $C(1\\,;1)$, $D(0\\,;1)$.')
DISTANCES_437 = ('$AI^2=\\dfrac{5}{4}=\\dfrac{20}{16}$, $IJ^2=\\dfrac{5}{16}$ et'
                 ' $AJ^2=\\dfrac{25}{16}$.')

V437_REPERE = justification(
    INTRO_437 + 'On choisit le repère $\\left(A\\,;' + vec('AB') + ',' + vec('AD') + '\\right)$'
    ' pour calculer des longueurs. Pourquoi est-il orthonormé ?',
    [],
    'Parce que $ABCD$ est un carré : $(AB)\\perp(AD)$ et $AB=AD$.',
    ['Parce que $A$ est un sommet du carré.',
     'Parce qu\'on choisit $AB=1$.',
     'Tout repère est orthonormé.'],
    ['Un repère $\\left(A\\,;' + vec('AB') + ',' + vec('AD') + '\\right)$ est orthonormé quand'
     ' les deux vecteurs sont **orthogonaux** et de **même norme**, prise pour unité.',
     'Dans le carré $ABCD$, $(AB)\\perp(AD)$ et $AB=AD$ : c\'est le cas.',
     'Dans un rectangle non carré, ce repère ne serait pas orthonormé, et la formule de la'
     ' distance ne s\'appliquerait pas.'])

V437_J = case(
    INTRO_437 + REPERE_437 + '\n\nComplète l\'ordonnée de $J$.\n\n$y_J=?$',
    [], '\\frac{3}{4}',
    ['$J$ est sur $[BC]$, segment vertical d\'abscisse $1$ qui va de $B(1\\,;0)$ à $C(1\\,;1)$.',
     '$BJ=\\dfrac{3}{4}BC=\\dfrac{3}{4}$, donc $J\\left(1\\,;' + col('\\dfrac{3}{4}') + '\\right)$.'])

V437_IJ = case(
    INTRO_437 + REPERE_437 + ' Alors $I\\left(\\dfrac{1}{2}\\,;1\\right)$ et'
    ' $J\\left(1\\,;\\dfrac{3}{4}\\right)$.\n\nComplète.\n\n$IJ^2=?$',
    [], '\\frac{5}{16}',
    ['Le repère est orthonormé : $IJ^2=(x_J-x_I)^2+(y_J-y_I)^2$.',
     '$IJ^2=\\left(1-\\dfrac{1}{2}\\right)^2+\\left(\\dfrac{3}{4}-1\\right)^2=\\dfrac{1}{4}'
     '+\\dfrac{1}{16}=' + col('\\dfrac{5}{16}') + '$.'])

V437_CONCLURE = justification(
    INTRO_437 + REPERE_437 + ' On a calculé ' + DISTANCES_437 + '\n\nQue peut-on conclure ?',
    [],
    '$AI^2+IJ^2=AJ^2$ : d\'après la réciproque du théorème de Pythagore, $AIJ$ est rectangle'
    ' en $I$.',
    ['$AI^2+AJ^2\\neq IJ^2$ : le triangle $AIJ$ n\'est pas rectangle.',
     '$AI^2+IJ^2=AJ^2$ : d\'après la réciproque du théorème de Pythagore, $AIJ$ est rectangle'
     ' en $A$.',
     '$AI=IJ$ : le triangle $AIJ$ est isocèle en $I$.'],
    ['$AI^2+IJ^2=\\dfrac{20}{16}+\\dfrac{5}{16}=\\dfrac{25}{16}=AJ^2$.',
     '$[AJ]$ est le plus grand côté : d\'après la réciproque du théorème de Pythagore, le'
     ' triangle $AIJ$ est **rectangle en $I$**, le sommet opposé à $[AJ]$.'])

MODELES.append(modele(
    '06-configuration-dans-un-repere', 'Étudier une configuration dans un repère',
    'Carré ABCD, I milieu de [CD], J sur [BC] avec BJ = ¾BC : repère (A ; AB, AD) orthonormé à'
    ' justifier, ordonnée de J et IJ² à calculer, conclusion par la réciproque de Pythagore',
    1,
    [V437_REPERE, V437_J, V437_IJ, V437_CONCLURE],
    specs_choix(0, 'carré', ['sommet', 'AB = 1', 'tout repère'])
    + [spec('3/4', 1, '\\frac{3}{4}', 'correct'),
       spec('0,75', 1, '0,75', 'correct'),
       spec('Erreur : 1/4', 1, '\\frac{1}{4}', 'incorrect'),
       spec('Erreur : 1', 1, '1', 'incorrect'),
       spec('5/16', 2, '\\frac{5}{16}', 'correct'),
       spec('Erreur : 3/16', 2, '\\frac{3}{16}', 'incorrect'),
       spec('Erreur : 5/4', 2, '\\frac{5}{4}', 'incorrect')]
    + specs_choix(3, 'rectangle en I', ['pas rectangle', 'rectangle en A', 'isocèle']),
    shared={'blankDefaults': {'acceptDecimal': True}}))



def positions(chemin, vi, variables):
    """Positions affichées d'une variation « étapes à ranger » (graine 0, variables de la spec)."""
    out = subprocess.run(['pnpm', 'exec', 'tsx', 'docs/wip/questions/positions-ranger.ts', chemin,
                          str(vi), json.dumps({k: str(v) for k, v in variables.items()})],
                         check=True, capture_output=True, text=True).stdout.strip().splitlines()
    return json.loads(out[-1])


os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    chemin = os.path.join(DOSSIER, nom + '.json')
    a_ranger = [s for s in m['testSpecs'] if isinstance(s, tuple)]
    m['testSpecs'] = [s for s in m['testSpecs'] if not isinstance(s, tuple)]
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
    for _, vi, variables in a_ranger:
        juste = positions(chemin, vi, variables)
        faux = juste[:]
        faux[1], faux[2] = faux[2], faux[1]
        m['testSpecs'] += [spec('Étapes dans l’ordre', vi, juste, 'correct', variables),
                           spec('Erreur : deuxième et troisième étapes échangées', vi, faux,
                                'incorrect', variables)]
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
