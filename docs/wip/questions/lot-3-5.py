"""Écrit les 6 modèles du lot 5 « Probabilités et statistiques » de la 3e dans
scripts/questions/3-lot-5/.

Phase 0 validée par David le 2026-10-31 (journal `questions-3-progress.md` § 12 et 12.6, un point
par modèle ; 3-036 et 3-063 couverts par les modèles de 4e ccb51039 et 76f5f143, partagés par la
migration de rangement) :

| # | Point | Titre | Catégorie, niveau |
| 1 | 3-033 | Probabilité de A ou B, de A et B | Probabilités › Évènements › Réunion et intersection, 1 |
| 2 | 3-028 | Effectifs cumulés croissants | Statistiques › Effectifs cumulés › Calculer, 1 |
| 3 | 3-056 | Médiane d'une série à effectifs | Statistiques › Indicateurs › Médiane à effectifs, 1 |
| 4 | 3-029 | Quartiles d'une série à effectifs | Statistiques › Indicateurs › Quartiles, 1 |
| 5 | 3-034 | Simuler deux épreuves indépendantes | Probabilités › Simulation › Deux épreuves, 1 |
| 6 | 3-035 | Stabilisation des fréquences | Probabilités › Simulation › Stabilisation, 1 |

Niveaux : catégories neuves (relevé MCP du 2026-10-31). Le nœud et le tag sont posés par la
migration de rangement, après le `--publier` de David.

Décisions et pièges :
- quartiles (décision c4-2) : Q1 (Q3) = plus petite valeur dont l'effectif cumulé atteint 25 %
  (75 %) de l'effectif total, soit 4 × cumulé ⩾ N (⩾ 3N) ; médiane : rang (N + 1)/2, effectif
  impair, ou pair avec les deux valeurs centrales égales (aucun cumulé égal à N/2) ;
- ` ```effectifs ` : `masquer:` ne fait qu'une case vide à l'affichage ; la réponse est une case
  sous le tableau ;
- ` ```simulation ` en mode `moyenne` écrit « espérance » (vocabulaire de 1re) et donne la valeur
  cherchée : 3-035 lit donc un tableau de fréquences, et 3-034 des effectifs simulés donnés ;
- probabilités : `acceptDecimal` (patron b28ed4fa), fraction non réduite = forme améliorable ;
  la réponse attendue reste une FRACTION (`{{eval:u/100}}`) : écrite en décimal, elle refuse la
  fraction juste (`bad_form`, mesuré) ; le corrigé l'écrit en décimal, comme l'énoncé ;
- un `{{eval}}` fractionnaire s'écrit `\\dfrac` : les décimaux affichés sont écrits chiffre à
  chiffre (`0{,}{{a}}`) ;
- case choix : la bonne réponse écrite en premier (indice 0), le bloc mélange ;
- variables `e` et `i` interdites dans les `eval`.

    python3 docs/wip/questions/lot-3-5.py scripts/questions/3-lot-5
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


def modele(nom, title, description, theme, domain, subdomain, level, variations, specs, delay=60,
           shared=None):
    m = {'title': title, 'description': description, 'grades': ['3'], 'theme': theme,
         'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': delay,
         'status': 'draft'}
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
    v['blanks'] = [a if isinstance(a, dict) else {'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def ev(x):
    return '{{eval:' + x + '}}'


def choix(lignes):
    return '\n\n```choix\n' + ''.join('- ' + l + '\n' for l in lignes) + '```'


def selon(v, valeurs):
    """{{if}} en chaîne : valeurs[k] quand v == k."""
    if len(valeurs) == 1:
        return valeurs[0]
    return '{{if:' + v + '==0|' + valeurs[0] + '|' + selon_suite(v, valeurs, 1) + '}}'


def selon_suite(v, valeurs, k):
    if k == len(valeurs) - 1:
        return valeurs[k]
    return '{{if:' + v + '==' + str(k) + '|' + valeurs[k] + '|' + selon_suite(v, valeurs, k + 1) + '}}'


PROBA = {'blankDefaults': {'acceptDecimal': True}}
MODELES = []

# --- Séries à effectifs : six valeurs consécutives x0 … x0 + 5, effectifs n0 … n5 --------------

N6 = ['n0', 'n1', 'n2', 'n3', 'n4', 'n5']
CUM = ['C0', 'C1', 'C2', 'C3', 'C4', 'C5']


def vars_serie(lo, hi):
    """Effectifs tirés, cumulés et total en variables (C5 = N)."""
    vs = [var(n, str(lo) + '..' + str(hi)) for n in N6]
    for k in range(6):
        vs.append(var(CUM[k], 'eval:' + '+'.join(N6[:k + 1])))
    vs.append(var('N', 'eval:C5'))
    return vs


def premier_rang(test):
    """Indice de la première valeur dont le cumulé vérifie test(C) — {{if}} en chaîne."""
    s = '5'
    for k in range(4, -1, -1):
        s = '{{if:' + test(CUM[k]) + '|' + str(k) + '|' + s + '}}'
    return s


def tableau_effectifs(titre, x0, lignes='effectifs', masquer=None):
    out = ['```effectifs', 'titre: ' + titre]
    for k in range(6):
        out.append(str(x0 + k) + ' = {{' + N6[k] + '}}')
    out.append('lignes: ' + lignes)
    if masquer:
        out.append('masquer: ' + masquer)
    out.append('```')
    return '\n\n' + '\n'.join(out) + '\n\n'


def barres(titre, axes, x0, haut):
    out = ['```barres', 'titre: ' + titre, 'axes: ' + axes, 'axe: 0 à ' + str(haut) + ', de 1 en 1']
    for k in range(6):
        out.append(str(x0 + k) + ' = {{' + N6[k] + '}}')
    out += ['description: Diagramme en barres des effectifs de chaque valeur, de ' + str(x0) + ' à '
            + str(x0 + 5) + '.', '```']
    return '\n\n' + '\n'.join(out) + '\n\n'


def ligne_cumules(x0):
    """Les effectifs cumulés écrits dans le corrigé."""
    return ('Effectifs cumulés croissants : ' + ' ; '.join(
        '$' + str(x0 + k) + '$ → ${{' + CUM[k] + '}}$' for k in range(6)) + '.')


# Calculs Python des specs (mêmes définitions que les variables)
def cumules(ns):
    c, out = 0, []
    for n in ns:
        c += n
        out.append(c)
    return out


def rang_test(ns, test):
    for k, c in enumerate(cumules(ns)):
        if test(c, sum(ns)):
            return k
    return 5


def vs_spec(ns):
    return {N6[k]: ns[k] for k in range(6)}


def mediane(ns):
    return rang_test(ns, lambda c, n: 2 * c >= n + 1)


def q1(ns):
    return rang_test(ns, lambda c, n: 4 * c >= n)


def q3(ns):
    return rang_test(ns, lambda c, n: 4 * c >= 3 * n)


def q1_calculatrice(ns):
    """Q1 = médiane de la demi-série inférieure (convention de calculatrice, refusée)."""
    serie = [k for k, n in enumerate(ns) for _ in range(n)]
    n = len(serie)
    basse = serie[:n // 2]
    m = len(basse)
    return (basse[(m - 1) // 2] + basse[m // 2]) / 2


def fr(x):
    """Nombre en écriture de réponse (virgule MathLive)."""
    if x == int(x):
        return str(int(x))
    return str(x).replace('.', '{,}')


# --- 1. 3-033 : P(A ∪ B) + P(A ∩ B) = P(A) + P(B) ---------------------------------------------

FORMULE = 'P(A \\cup B) = P(A) + P(B) - P(A \\cap B)'
# Centièmes à deux chiffres, sans zéro final (0,{{a}} s'écrit chiffre à chiffre) ; u = a + b − c
VARS_P = [var('a', '25..60'), var('b', '25..60'), var('c', '11..19'), var('u', 'eval:a+b-c')]
CONDS_P = ['c<a', 'c<b', 'u<=95', 'u>=20', 'a!=b', 'a-10*floor(a/10)!=0', 'b-10*floor(b/10)!=0',
           'u-10*floor(u/10)!=0']
PA, PB, PI, PU = '0{,}{{a}}', '0{,}{{b}}', '0{,}{{c}}', '0{,}{{u}}'


V_REUNION = variation(
    'Lors d\'une expérience aléatoire, $A$ et $B$ sont deux évènements tels que $P(A)=' + PA
    + '$, $P(B)=' + PB + '$ et $P(A \\cap B)=' + PI + '$.\n\nCalcule $P(A \\cup B)$.\n\n'
    '$P(A \\cup B)=?$',
    VARS_P, [ev('u/100')],
    ['On utilise la relation $P(A \\cup B) + P(A \\cap B) = P(A) + P(B)$, soit $' + FORMULE + '$.',
     '$P(A \\cup B) = ' + PA + ' + ' + PB + ' - ' + PI + ' = ' + col(PU) + '$.',
     'Les issues de $A \\cap B$ sont dans $A$ **et** dans $B$ : sans la soustraction, elles'
     ' seraient comptées deux fois.'],
    CONDS_P)

V_INTER = variation(
    'Lors d\'une expérience aléatoire, $A$ et $B$ sont deux évènements tels que $P(A)=' + PA
    + '$, $P(B)=' + PB + '$ et $P(A \\cup B)=' + PU + '$.\n\nCalcule $P(A \\cap B)$.\n\n'
    '$P(A \\cap B)=?$',
    VARS_P, [ev('c/100')],
    ['On utilise la relation $P(A \\cup B) + P(A \\cap B) = P(A) + P(B)$.',
     'Donc $P(A \\cap B) = P(A) + P(B) - P(A \\cup B) = ' + PA + ' + ' + PB + ' - ' + PU + ' = '
     + col(PI) + '$.'],
    CONDS_P)

# Dé à 12 faces : quatre couples d'évènements (nA, nB, nAB comptés dans le corrigé)
EVTS = [
    ('obtenir un nombre pair', 'obtenir un multiple de $3$', '2, 4, 6, 8, 10, 12', '3, 6, 9, 12',
     '6, 12', 6, 4, 2),
    ('obtenir un multiple de $4$', 'obtenir un multiple de $3$', '4, 8, 12', '3, 6, 9, 12', '12',
     3, 4, 1),
    ('obtenir un nombre inférieur ou égal à $5$', 'obtenir un nombre pair', '1, 2, 3, 4, 5',
     '2, 4, 6, 8, 10, 12', '2, 4', 5, 6, 2),
    ('obtenir un nombre premier', 'obtenir un nombre impair', '2, 3, 5, 7, 11',
     '1, 3, 5, 7, 9, 11', '3, 5, 7, 11', 5, 6, 4),
]


def du_couple(i):
    return selon('j', [str(e[i]) for e in EVTS])


V_DE = variation(
    'On lance un dé équilibré à douze faces, numérotées de $1$ à $12$. On note $A$ l\'évènement « '
    + selon('j', [e[0] for e in EVTS]) + ' » et $B$ l\'évènement « ' + selon('j', [e[1] for e in EVTS])
    + ' ».\n\nCalcule la probabilité de l\'évènement « $A$ ou $B$ ».\n\n$P(A \\cup B)=?$',
    [var('j', '0..3')], [ev('(' + du_couple(5) + '+' + du_couple(6) + '-' + du_couple(7) + ')/12')],
    ['Les $12$ issues sont équiprobables.',
     '$A$ : ' + selon('j', [e[2] for e in EVTS]) + ', donc $P(A)=\\dfrac{' + du_couple(5)
     + '}{12}$ ; $B$ : ' + selon('j', [e[3] for e in EVTS]) + ', donc $P(B)=\\dfrac{' + du_couple(6)
     + '}{12}$.',
     '$A \\cap B$ : ' + selon('j', [e[4] for e in EVTS]) + ', donc $P(A \\cap B)=\\dfrac{'
     + du_couple(7) + '}{12}$.',
     '$' + FORMULE + ' = \\dfrac{' + du_couple(5) + '+' + du_couple(6) + '-' + du_couple(7)
     + '}{12} = ' + col('{{solution}}') + '$.'])

V_EXCLUSIF = variation(
    'Lors d\'une expérience aléatoire, $A$ et $B$ sont deux évènements tels que $P(A)=' + PA
    + '$, $P(B)=' + PB + '$ et $P(A \\cap B)=' + PI + '$.\n\nCalcule la probabilité que $A$ **ou**'
    ' $B$ soit réalisé, **mais pas les deux**.\n\n$P=?$',
    VARS_P + [var('w', 'eval:u-c')], [ev('w/100')],
    ['« $A$ ou $B$, mais pas les deux » : on retire $A \\cap B$ de $A \\cup B$.',
     '$P(A \\cup B) = ' + PA + ' + ' + PB + ' - ' + PI + ' = ' + PU + '$.',
     '$P = P(A \\cup B) - P(A \\cap B) = ' + PU + ' - ' + PI + ' = '
     + col('0{,}{{w}}') + '$.'],
    CONDS_P + ['w>=11', 'w-10*floor(w/10)!=0'])

S_P = {'a': 45, 'b': 35, 'c': 15}
S_PX = {'a': 45, 'b': 41, 'c': 15}    # u = 71, w = 56 → la spec du « ou » exclusif

MODELES.append(modele(
    '01-probabilite-reunion-intersection', 'Probabilité de A ou B, de A et B',
    'Appliquer la relation P(A ∪ B) + P(A ∩ B) = P(A) + P(B) : réunion, intersection, « ou »'
    ' exclusif, en équiprobabilité',
    'Probabilités', 'Évènements', 'Réunion et intersection', 1,
    [V_REUNION, V_INTER, V_DE, V_EXCLUSIF],
    [spec('0,45 + 0,35 − 0,15 = 0,65', 0, S_P, '0{,}65', 'correct'),
     spec('En fraction : 13/20', 0, S_P, '\\frac{13}{20}', 'correct'),
     spec('Erreur : P(A) + P(B) = 0,8', 0, S_P, '0{,}8', 'incorrect'),
     spec('0,45 + 0,35 − 0,65 = 0,15', 1, S_P, '0{,}15', 'correct'),
     spec('Erreur : P(A ∪ B) − P(A) = 0,2', 1, S_P, '0{,}2', 'incorrect'),
     spec('Pair ou multiple de 3 : 8/12 = 2/3', 2, {'j': 0}, '\\frac{2}{3}', 'correct'),
     spec('8/12 non réduite (ambre)', 2, {'j': 0}, '\\frac{8}{12}', 'unoptimal_form',
          ['reducedFractions']),
     spec('Erreur : 10/12 (sans retirer 6 et 12)', 2, {'j': 0}, '\\frac{5}{6}', 'incorrect'),
     spec('Premier ou impair : 7/12', 2, {'j': 3}, '\\frac{7}{12}', 'correct'),
     spec('« Ou » exclusif : 0,71 − 0,15 = 0,56', 3, S_PX, '0{,}56', 'correct'),
     spec('Erreur : P(A ∪ B) = 0,71', 3, S_PX, '0{,}71', 'incorrect'),
     spec('En fraction : 14/25', 3, S_PX, '\\frac{14}{25}', 'correct')],
    shared=PROBA))

# --- 2. 3-028 : effectifs cumulés croissants ----------------------------------------------------

V_CUM_CASE = variation(
    'On a demandé aux élèves d\'une classe combien ils ont de frères et sœurs.'
    + tableau_effectifs('Nombre de frères et sœurs', 0, 'effectifs ; effectifs cumulés',
                        '2/effectifs cumulés')
    + 'Quel est l\'effectif cumulé croissant de la valeur $2$ ?\n\n$?$',
    vars_serie(1, 9), ['{{C2}}'],
    ['L\'effectif cumulé croissant de $2$ compte les élèves qui ont **au plus** $2$ frères et'
     ' sœurs : $0$, $1$ ou $2$.',
     '${{n0}} + {{n1}} + {{n2}} = ' + col('{{C2}}') + '$.',
     'Autre chemin : l\'effectif cumulé de $1$ plus l\'effectif de $2$, ${{C1}} + {{n2}} = {{C2}}$.'])

V_CUM_CALCUL = variation(
    'Voici les pointures des élèves d\'un club de sport.'
    + tableau_effectifs('Pointure', 36, 'effectifs')
    + 'Quel est l\'effectif cumulé croissant de la pointure $39$ ?\n\n$?$',
    vars_serie(1, 9), ['{{C3}}'],
    ['L\'effectif cumulé croissant de $39$ compte les élèves qui chaussent du $39$ **ou moins**.',
     '${{n0}} + {{n1}} + {{n2}} + {{n3}} = ' + col('{{C3}}') + '$.'])

V_CUM_AU_MOINS = variation(
    'On a demandé aux élèves d\'un collège combien de livres ils ont lus pendant les vacances.'
    + tableau_effectifs('Nombre de livres lus', 0, 'effectifs ; effectifs cumulés')
    + 'Combien d\'élèves ont lu **au moins** $3$ livres ?\n\n$?$',
    vars_serie(2, 12), ['{{eval:N-C2}}'],
    ['« Au moins $3$ » : $3$, $4$ ou $5$ livres. Les autres en ont lu **au plus** $2$ : l\'effectif'
     ' cumulé de $2$, ${{C2}}$.',
     'L\'effectif total est ${{N}}$ : ${{N}} - {{C2}} = ' + col(ev('N-C2')) + '$.',
     'On vérifie : ${{n3}} + {{n4}} + {{n5}} = ' + ev('N-C2') + '$.'])

NS_A = [3, 5, 7, 4, 2, 1]   # cumulés 3, 8, 15, 19, 21, 22
MODELES.append(modele(
    '02-effectifs-cumules', 'Effectifs cumulés croissants',
    'Calculer un effectif cumulé croissant à partir d\'un tableau d\'effectifs ; « au moins »'
    ' par le total moins un cumulé',
    'Statistiques', 'Effectifs cumulés', 'Calculer', 1,
    [V_CUM_CASE, V_CUM_CALCUL, V_CUM_AU_MOINS],
    [spec('Cumulé de 2 : 15', 0, vs_spec(NS_A), '15', 'correct'),
     spec('Erreur : l\'effectif de 2, 7', 0, vs_spec(NS_A), '7', 'incorrect'),
     spec('Cumulé de 39 : 19', 1, vs_spec(NS_A), '19', 'correct'),
     spec('Erreur : sans la pointure 39, 15', 1, vs_spec(NS_A), '15', 'incorrect'),
     spec('Au moins 3 : 22 − 15 = 7', 2, vs_spec(NS_A), '7', 'correct'),
     spec('Erreur : cumulé de 3, 19', 2, vs_spec(NS_A), '19', 'incorrect'),
     spec('Erreur : 22 − 19 = 3 (sans les 3 livres)', 2, vs_spec(NS_A), '3', 'incorrect')]))

# --- 3. 3-056 : médiane d'une série à effectifs --------------------------------------------------

MED = premier_rang(lambda c: '2*' + c + '>=N+1')
IMPAIR = ['N-2*floor(N/2)==1']
PAIR_UNIQUE = ['N-2*floor(N/2)==0'] + [c + '!=N/2' for c in CUM[:5]]


def etapes_mediane(x0, pair):
    rang = ('L\'effectif total est ${{N}}$, pair : la médiane est entre la $' + ev('N/2')
            + '^{\\text{e}}$ et la $' + ev('N/2+1') + '^{\\text{e}}$ valeur de la série rangée.'
            ) if pair else (
            'L\'effectif total est ${{N}}$, impair : la médiane est la $' + ev('(N+1)/2')
            + '^{\\text{e}}$ valeur de la série rangée, car $\\dfrac{ {{N}} + 1}{2} = '
            + ev('(N+1)/2') + '$.')
    fin = ('Les deux valeurs centrales sont égales : la médiane est ' if pair
           else 'Le premier effectif cumulé qui atteint $' + ev('(N+1)/2') + '$ est celui de ')
    return [rang, ligne_cumules(x0), fin + '$' + col('{{eval:' + str(x0) + '+M}}') + '$.']


V_MED_TABLEAU = variation(
    'Voici les notes sur $10$ obtenues par les élèves d\'une classe à un contrôle.'
    + tableau_effectifs('Note', 4, 'effectifs')
    + 'Quelle est la médiane de cette série ?\n\n$?$',
    vars_serie(1, 9) + [var('M', MED)], ['{{eval:4+M}}'], etapes_mediane(4, False), IMPAIR)

V_MED_BARRES = variation(
    'Le diagramme donne le nombre de buts marqués à chaque match d\'un championnat.'
    + barres('Buts par match', 'Nombre de buts ; Nombre de matchs', 0, 10)
    + 'Quelle est la médiane du nombre de buts par match ?\n\n$?$',
    vars_serie(1, 9) + [var('M', MED)], ['{{M}}'], etapes_mediane(0, False), IMPAIR)

V_MED_PAIR = variation(
    'Voici l\'âge des adhérents d\'un club de théâtre.'
    + tableau_effectifs('Âge (ans)', 12, 'effectifs')
    + 'Quelle est la médiane de cette série ?\n\n$?$',
    vars_serie(1, 9) + [var('M', MED)], ['{{eval:12+M}}'], etapes_mediane(12, True), PAIR_UNIQUE)

NS_M = [2, 3, 6, 5, 4, 1]   # N = 21, rang 11, cumulés 2, 5, 11 → 3e valeur
NS_P = [1, 4, 3, 6, 5, 1]   # N = 20, cumulés 1, 5, 8, 14 : rangs 10 et 11 → 4e valeur
MODELES.append(modele(
    '03-mediane-serie-effectifs', 'Médiane d\'une série à effectifs',
    'Donner la médiane d\'une série donnée par un tableau d\'effectifs ou un diagramme en barres,'
    ' par les effectifs cumulés',
    'Statistiques', 'Indicateurs', 'Médiane à effectifs', 1,
    [V_MED_TABLEAU, V_MED_BARRES, V_MED_PAIR],
    [spec('N = 21, rang 11 : note 6', 0, vs_spec(NS_M), '6', 'correct'),
     spec('N = 15, rang 8 : note 6', 0, vs_spec([5, 1, 2, 3, 2, 2]), '6', 'correct'),
     spec('Erreur : la note la plus fréquente, 4', 0, vs_spec([5, 1, 2, 3, 2, 2]), '4', 'incorrect'),
     spec('Erreur : le milieu des valeurs, 6,5', 0, vs_spec(NS_M), '6{,}5', 'incorrect'),
     spec('Barres, N = 21 : 2 buts', 1, vs_spec(NS_M), '2', 'correct'),
     spec('Erreur : l\'effectif le plus grand, 6', 1, vs_spec(NS_M), '6', 'incorrect'),
     spec('N = 20, rangs 10 et 11 : 15 ans', 2, vs_spec(NS_P), '15', 'correct'),
     spec('Erreur : rang 10 lu comme 14 ans', 2, vs_spec(NS_P), '14', 'incorrect')]))

# --- 4. 3-029 : quartiles d'une série à effectifs ------------------------------------------------

Q1 = premier_rang(lambda c: '4*' + c + '>=N')
Q3 = premier_rang(lambda c: '4*' + c + '>=3*N')


def quart(k):
    """k × N / 4 écrit en décimal (0, 25, 50 ou 75 centièmes) : un {{eval}} fractionnaire s'écrirait \\dfrac."""
    reste = '(' + k + '*N-4*floor(' + k + '*N/4))'
    return ('{{eval:floor(' + k + '*N/4)}}' + '{{if:' + reste + '==1|{,}25|{{if:' + reste + '==2|{,}5|'
            '{{if:' + reste + '==3|{,}75|}}}}}}')


def etapes_quartile(x0, nom, quart_txt, var_q):
    k = '1' if nom == 'Q_1' else '3'
    calcul = ('$\\dfrac{ {{N}} }{4} = ' if k == '1' else '$\\dfrac{3 \\times {{N}} }{4} = ') + quart(k) + '$.'
    return ['$' + nom + '$ est la plus petite valeur dont l\'effectif cumulé atteint ' + quart_txt
            + ' de l\'effectif total.',
            'Effectif total : ${{N}}$ ; ' + quart_txt + ' de ${{N}}$ : ' + calcul,
            ligne_cumules(x0),
            '$' + nom + ' = ' + col('{{eval:' + str(x0) + '+' + var_q + '}}') + '$.']


V_Q1 = variation(
    'Voici le nombre de jours d\'absence des élèves d\'un collège sur un trimestre.'
    + tableau_effectifs('Jours d\'absence', 0, 'effectifs')
    + 'Détermine le premier quartile $Q_1$ de cette série.\n\n$Q_1=?$',
    vars_serie(2, 12) + [var('Q', Q1)], ['{{Q}}'], etapes_quartile(0, 'Q_1', '25 %', 'Q'))

V_Q3 = variation(
    'Voici les notes sur $20$ obtenues par les élèves à un devoir commun.'
    + tableau_effectifs('Note', 10, 'effectifs')
    + 'Détermine le troisième quartile $Q_3$ de cette série.\n\n$Q_3=?$',
    vars_serie(2, 12) + [var('Q', Q3)], ['{{eval:10+Q}}'], etapes_quartile(10, 'Q_3', '75 %', 'Q'))

V_Q_BARRES = variation(
    'Le diagramme donne le nombre de passagers dans les voitures passées à un péage.'
    + barres('Passagers par voiture', 'Nombre de personnes ; Nombre de voitures', 1, 12)
    + 'Détermine le premier quartile $Q_1$ et le troisième quartile $Q_3$ de cette série.'
    '\n\n$Q_1=?$ et $Q_3=?$',
    vars_serie(2, 12) + [var('Q', Q1), var('R', Q3)], ['{{eval:1+Q}}', '{{eval:1+R}}'],
    ['$Q_1$ (et $Q_3$) est la plus petite valeur dont l\'effectif cumulé atteint $25~\\%$'
     ' ($75~\\%$) de l\'effectif total.',
     'Effectif total : ${{N}}$ ; $\\dfrac{ {{N}} }{4} = ' + quart('1')
     + '$ et $\\dfrac{3 \\times {{N}} }{4} = ' + quart('3') + '$.',
     ligne_cumules(1),
     '$Q_1 = ' + col(ev('1+Q')) + '$ et $Q_3 = ' + col(ev('1+R'), 1) + '$.'])

# Spec choisie pour que la convention de calculatrice (médiane de la demi-série) diffère
NS_Q = [3, 2, 2, 5, 4, 4]   # N = 20, cumulés 3, 5, 7, 12, 16, 20 : Q1 rang 5 → 1, calculatrice 1,5
NS_Q3 = [2, 3, 4, 2, 6, 3]  # N = 20, cumulés 2, 5, 9, 11, 17 : 15 → 4e indice → 14
assert q1(NS_Q) == 1 and q1_calculatrice(NS_Q) == 1.5
assert q3(NS_Q3) == 4
MODELES.append(modele(
    '04-quartiles-serie-effectifs', 'Quartiles d\'une série à effectifs',
    'Donner les quartiles d\'une série donnée par un tableau d\'effectifs ou un diagramme en'
    ' barres, par les effectifs cumulés (convention du programme)',
    'Statistiques', 'Indicateurs', 'Quartiles', 1,
    [V_Q1, V_Q3, V_Q_BARRES],
    [spec('N = 20, 25 % = 5 : Q1 = 1', 0, vs_spec(NS_Q), '1', 'correct'),
     spec('Erreur : convention de calculatrice, 1,5', 0, vs_spec(NS_Q), '1{,}5', 'incorrect'),
     spec('Erreur : la médiane, 3', 0, vs_spec(NS_Q), '3', 'incorrect'),
     spec('N = 20, 75 % = 15 : Q3 = 14', 1, vs_spec(NS_Q3), '14', 'correct'),
     spec('Erreur : la médiane, 13', 1, vs_spec(NS_Q3), '13', 'incorrect'),
     spec('Barres : Q1 = 2, Q3 = 5', 2, vs_spec(NS_Q), ['2', '5'], 'correct'),
     spec('Erreur : Q1 et Q3 inversés', 2, vs_spec(NS_Q), ['5', '2'], 'incorrect')]))

# --- 5. 3-034 : simuler deux épreuves indépendantes ---------------------------------------------

V_PROGRAMME = variation(
    '{{if:k==0|On veut simuler sur ordinateur le lancer de **deux dés** équilibrés à six faces et'
    ' noter la **somme** obtenue.|On veut simuler sur ordinateur le lancer de **deux pièces**'
    ' équilibrées et noter le **nombre de Pile** obtenu.}}\n\nQuelle instruction convient ?'
    + choix(['{{if:k==0|Tirer un entier au hasard entre $1$ et $6$, puis un autre entre $1$ et $6$,'
             ' et les additionner.|Tirer au hasard $0$ ou $1$, puis encore $0$ ou $1$, et les'
             ' additionner.}}',
             '{{if:k==0|Tirer un entier au hasard entre $2$ et $12$.|Tirer un entier au hasard entre'
             ' $0$ et $2$.}}',
             '{{if:k==0|Tirer un entier au hasard entre $1$ et $6$, et le multiplier par $2$.|Tirer'
             ' au hasard $0$ ou $1$, et le multiplier par $2$.}}',
             '{{if:k==0|Tirer un entier au hasard entre $1$ et $12$.|Tirer un entier au hasard entre'
             ' $1$ et $2$.}}']),
    [var('k', '0..1')], ['0'],
    ['Deux épreuves **indépendantes** : on simule {{if:k==0|chaque dé|chaque pièce}} séparément,'
     ' puis on combine les résultats.',
     '{{if:k==0|Un seul tirage entre $2$ et $12$ rendrait les onze sommes équiprobables : or la'
     ' somme $7$ s\'obtient de six façons et la somme $2$ d\'une seule.|Un seul tirage entre $0$ et'
     ' $2$ rendrait les trois résultats équiprobables : or « un Pile » s\'obtient de deux façons'
     ' (PF et FP).}}',
     'Multiplier un seul tirage par $2$ revient à lancer {{if:k==0|un seul dé|une seule pièce}} :'
     ' {{if:k==0|la somme serait toujours paire|on n\'aurait jamais exactement un Pile}}.'])

V_DEUX_PIECES = variation(
    'Lina lance deux pièces équilibrées. Elle pense que la probabilité d\'obtenir **deux Pile** est'
    ' $\\dfrac{1}{3}$, car il y a trois résultats : deux Pile, deux Face, un Pile et un Face.\n\n'
    'Elle simule $1\\,000$ lancers des deux pièces et obtient ${{n}}$ fois deux Pile.\n\nQuelle'
    ' probabilité les résultats de la simulation confirment-ils ?'
    + choix(['$\\dfrac{1}{4}$', '$\\dfrac{1}{3}$', '$\\dfrac{1}{2}$']),
    [var('n', '232..268')], ['0'],
    ['Fréquence observée de « deux Pile » : $\\dfrac{ {{n}} }{1\\,000} = 0{,}{{n}}$, proche de'
     ' $0{,}25$.',
     'L\'arbre donne **quatre** issues équiprobables :',
     '```probtree\noutcomes: true\n\nPile:1/2\n  Pile:1/2, PP\n  Face:1/2, PF\nFace:1/2\n'
     '  Pile:1/2, FP\n  Face:1/2, FF\n```',
     '« Un Pile et un Face » regroupe deux issues (PF et FP) : $P(\\text{deux Pile}) = '
     + col('\\dfrac{1}{4}') + '$, pas $\\dfrac{1}{3}$.'])

V_DEUX_DES = variation(
    'On simule $3\\,600$ lancers de deux dés équilibrés à six faces, en notant la somme des deux'
    ' dés. La somme ${{s}}$ est sortie ${{n}}$ fois.\n\nDe quelle probabilité la fréquence de la'
    ' somme ${{s}}$ est-elle proche ?'
    + choix(['$\\dfrac{ {{m}} }{36}$', '$\\dfrac{1}{11}$', '$\\dfrac{1}{6}$', '$\\dfrac{1}{12}$']),
    # s = 4 ou 10 exclu : 3/36 = 1/12, l'un des distracteurs
    [var('s', '5|6|8|9'), var('m', 'eval:6-abs(s-7)'),
     var('n', '{{eval:100*m-20}}..{{eval:100*m+20}}')],
    ['0'],
    ['Les $6 \\times 6 = 36$ couples de résultats sont équiprobables ; la somme ${{s}}$ en réunit'
     ' ${{m}}$ : $P = ' + col('\\dfrac{ {{m}} }{36}') + '$.',
     'Sur $3\\,600$ lancers, on attend donc environ $3\\,600 \\times \\dfrac{ {{m}} }{36} = '
     + ev('100*m') + '$ fois la somme ${{s}}$ : la simulation en donne ${{n}}$, c\'est cohérent.',
     'Les onze sommes ne sont **pas** équiprobables : $\\dfrac{1}{11}$ ne convient pas (on'
     ' attendrait environ $327$ fois chaque somme).'])

MODELES.append(modele(
    '05-simuler-deux-epreuves', 'Simuler deux épreuves indépendantes',
    'Simuler deux épreuves indépendantes (deux dés, deux pièces) et confronter les fréquences'
    ' simulées à la probabilité donnée par un arbre ou un tableau',
    'Probabilités', 'Simulation', 'Deux épreuves', 1,
    [V_PROGRAMME, V_DEUX_PIECES, V_DEUX_DES],
    [spec('Deux dés : deux tirages additionnés', 0, {'k': 0}, '0', 'correct'),
     spec('Erreur : un tirage entre 2 et 12', 0, {'k': 0}, '1', 'incorrect'),
     spec('Deux pièces : deux tirages additionnés', 0, {'k': 1}, '0', 'correct'),
     spec('Erreur : un tirage entre 0 et 2', 0, {'k': 1}, '1', 'incorrect'),
     spec('Deux Pile : 1/4', 1, {'n': 251}, '0', 'correct'),
     spec('Erreur : 1/3 (trois résultats)', 1, {'n': 251}, '1', 'incorrect'),
     spec('Somme 8 : 5/36', 2, {'s': 8, 'n': 507}, '0', 'correct'),
     spec('Erreur : 1/11 (sommes équiprobables)', 2, {'s': 8, 'n': 507}, '1', 'incorrect')],
    delay=75))

# --- 6. 3-035 : stabilisation des fréquences -----------------------------------------------------


def tableau_frequences(f1, f2, f3, f4):
    return ('\n\n| Nombre de lancers | $10$ | $100$ | $1\\,000$ | $10\\,000$ |\n|---|---|---|---|---|\n'
            '| Fréquence | $0{,}' + f1 + '$ | $0{,}' + f2 + '$ | $0{,}' + f3 + '$ | $0{,}' + f4 + '$ |\n\n')


# p = P/10 ; f(10) = (P ± 2)/10, f(100) = (10P ± d2)/100, f(1000), f(10000) de plus en plus près
VARS_F = [var('P', '3|4|6|7'), var('a', '-2|2'), var('b', '2..6;±'), var('c', '3..9;±'),
          var('d', '4..19;±'),
          var('F', 'eval:P+a'), var('G', 'eval:10*P+b'), var('H', 'eval:100*P+c'),
          var('K', 'eval:1000*P+d')]
CONDS_F = ['F!=5', 'abs(d)!=10']
TABLE_F = tableau_frequences('{{F}}', '{{G}}', '{{H}}', '{{K}}')
PUNAISE = ('On lance une punaise et on note si elle tombe **pointe en haut**. Voici la fréquence'
           ' de « pointe en haut » selon le nombre de lancers.')

V_STABLE = variation(
    PUNAISE + TABLE_F + 'Vers quelle valeur la fréquence semble-t-elle se stabiliser ?'
    + choix(['$0{,}{{P}}$', '$0{,}{{F}}$', '$0{,}5$', 'Elle ne se stabilise pas.']),
    VARS_F, ['0'],
    ['Quand le nombre de lancers augmente, la fréquence varie de moins en moins : $0{,}{{G}}$,'
     ' puis $0{,}{{H}}$, puis $0{,}{{K}}$.',
     'Elle se stabilise autour de $' + col('0{,}{{P}}') + '$ : c\'est une estimation de la'
     ' probabilité que la punaise tombe pointe en haut.',
     'Sur $10$ lancers seulement, la fréquence ($0{,}{{F}}$) fluctue trop pour conclure.'],
    CONDS_F)

V_MEILLEURE = variation(
    PUNAISE + TABLE_F + 'Quelle fréquence donne la meilleure estimation de la probabilité que la'
    ' punaise tombe pointe en haut ?'
    + choix(['Celle obtenue pour $10\\,000$ lancers.', 'Celle obtenue pour $10$ lancers.',
             'Celle obtenue pour $100$ lancers.', 'Toutes se valent.']),
    VARS_F, ['0'],
    ['Plus on répète l\'expérience, plus la fréquence observée se rapproche de la probabilité.',
     'La meilleure estimation est donc la fréquence sur le plus grand nombre de lancers : '
     + '$' + col('0{,}{{K}}') + '$, pour $10\\,000$ lancers.'],
    CONDS_F)

V_ESTIMER = variation(
    'On a lancé une punaise $5\\,000$ fois : elle est tombée ${{k}}$ fois pointe en haut.\n\n'
    'Donne une estimation de la probabilité qu\'elle tombe pointe en haut.\n\n$?$',
    [var('m', '30..70'), var('k', 'eval:50*m')], [ev('m/100')],
    ['Sur un grand nombre de lancers, la fréquence observée est une bonne estimation de la'
     ' probabilité.',
     'Fréquence de « pointe en haut » : $\\dfrac{ {{k}} }{5\\,000} = ' + col('0{,}{{m}}')
     + '$.'],
    ['m-10*floor(m/10)!=0'])

S_F1 = {'P': 4, 'a': 2, 'b': 3, 'c': -4, 'd': 7}     # 0,6 ; 0,43 ; 0,396 ; 0,4007
S_F2 = {'P': 6, 'a': -2, 'b': -3, 'c': 7, 'd': -8}    # 0,4 ; 0,57 ; 0,607 ; 0,5992
MODELES.append(modele(
    '06-stabilisation-frequences', 'Stabilisation des fréquences',
    'Observer la stabilisation des fréquences quand le nombre de répétitions augmente ; estimer'
    ' une probabilité par une fréquence',
    'Probabilités', 'Simulation', 'Stabilisation', 1,
    [V_STABLE, V_MEILLEURE, V_ESTIMER],
    [spec('Stabilisation vers 0,4', 0, S_F1, '0',
          'correct'),
     spec('Erreur : la fréquence sur 10 lancers', 0, S_F1, '1', 'incorrect'),
     spec('Erreur : 0,5 (« une chance sur deux »)', 0, S_F1, '2', 'incorrect'),
     spec('Meilleure estimation : 10 000 lancers', 1, S_F2, '0', 'correct'),
     spec('Erreur : 10 lancers', 1, S_F2, '1',
          'incorrect'),
     spec('2 350 sur 5 000 : 0,47', 2, {'m': 47}, '0{,}47', 'correct'),
     spec('En fraction : 47/100', 2, {'m': 47}, '\\frac{47}{100}', 'correct'),
     spec('Erreur : 2 350 / 1 000', 2, {'m': 47}, '2{,}35', 'incorrect')],
    shared=PROBA))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
