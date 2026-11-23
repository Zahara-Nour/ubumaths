"""Écrit les 2 modèles du lot 8 « Boîte à moustaches » de la 3e dans scripts/questions/3-lot-8/.

Phase 0 validée par David le 2026-11-02 (journal `questions-3-progress.md` § 15 et 15.5, un point
par modèle, un seul modèle pour lire et interpréter) :

| # | Point | Titre | Catégorie, niveau |
| 1 | 3-062 | Lire une boîte à moustaches | Statistiques › Indicateurs › boîte à moustaches, 1 |
| 2 | 3-030 | Construire une boîte à moustaches | Statistiques › Indicateurs › boîte à moustaches, 2 |

Le nœud (f2167091) et le tag sont posés par la migration de rangement, après le `--publier` de David.
Bloc ` ```boite-a-moustaches ` en prod depuis la v0.62.0 (2026-11-01).

Décisions et pièges :
- quartiles (décision c4-2) : Q1 (Q3) = plus petite valeur dont le rang atteint 25 % (75 %) de
  l'effectif, soit rang ⌈N/4⌉ (⌈3N/4⌉) ; effectif toujours impair (médiane = une valeur) ;
- toutes les valeurs sont entières et sur une graduation (axe de 2 en 2 : valeurs paires) ;
- lire, v4 : phrases écrites à l'avance ; la juste tirée parmi trois, les trois fausses toujours
  fausses quand min < Q1 < médiane < Q3 < max et min > 0 (« au moins la moitié ⩽ Q1 » : moins de la
  moitié des valeurs sont sous la médiane) ;
- lire, v5 : deux boîtes sur le même axe, médianes et étendues différentes (une seule bonne
  combinaison) ;
- construire, v2 : 9, 11 ou 13 notes (k = 0, 1, 2), série rangée x1 ⩽ … ⩽ x13 montrée dans un
  ordre mélangé (permutations fixes) ; `données:` = la même liste, l'attendu est celui de
  `describeList` ; les rangs sont des polynômes de Lagrange en k (pas d'indexation dans `eval`) ;
- construire, v3 : tableau d'effectifs, 6 pointures consécutives, effectif total impair ⩽ 25 ;
- case choix : la bonne réponse écrite en premier (indice 0), le bloc mélange.

    python3 docs/wip/questions/lot-3-8.py scripts/questions/3-lot-8
"""
import json
import math
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


def modele(nom, title, description, level, variations, specs, delay):
    return nom, {'title': title, 'description': description, 'grades': ['3'],
                 'theme': 'Statistiques', 'domain': 'Indicateurs', 'subdomain': 'Boîte à moustaches',
                 'level': level, 'delay': delay, 'status': 'draft', 'variations': variations,
                 'testSpecs': specs}


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


def ev(x):
    return '{{eval:' + x + '}}'


def choix(lignes):
    return '\n\n```choix\n' + ''.join('- ' + l + '\n' for l in lignes) + '```'


def selon(v, valeurs):
    """{{if}} en chaîne : valeurs[k] quand v == k."""
    s = valeurs[-1]
    for k in range(len(valeurs) - 2, -1, -1):
        s = '{{if:' + v + '==' + str(k) + '|' + valeurs[k] + '|' + s + '}}'
    return s


def boite(axe, titre, lignes, placer=None):
    out = ['```boite-a-moustaches', 'axe: ' + axe, 'titre: ' + titre] + lignes
    if placer:
        out.append('placer: ' + placer)
    out.append('```')
    return '\n\n' + '\n'.join(out) + '\n\n'


def cinq(p):
    """Les cinq variables d'une boîte (min, Q1, médiane, Q3, max) de préfixe p."""
    return [p + s for s in ('lo', 'qa', 'me', 'qb', 'hi')]


def vars_boite(p, depart, ecarts, pas=1, base=0):
    """min = base + pas × depart, puis quatre écarts de pas × ecarts : strictement croissante."""
    lo, qa, me, qb, hi = cinq(p)
    g = [p + 'g' + str(k) for k in range(1, 5)]
    vs = [var(p + 'u', depart)] + [var(x, ecarts) for x in g]
    vs.append(var(lo, 'eval:' + str(base) + '+' + str(pas) + '*' + p + 'u'))
    precedent = lo
    for x, gx in zip([qa, me, qb, hi], g):
        vs.append(var(x, 'eval:' + precedent + '+' + str(pas) + '*' + gx))
        precedent = x
    return vs


def ligne(nom, p):
    return nom + ' = ' + ' ; '.join('{{' + x + '}}' for x in cinq(p))


def vs_boite(p, u, g):
    return {p + 'u': u, **{p + 'g' + str(k + 1): g[k] for k in range(4)}}


def valeurs_boite(u, g, pas=1, base=0):
    out = [base + pas * u]
    for x in g:
        out.append(out[-1] + pas * x)
    return out


MODELES = []

# --- 1. 3-062 : lire une boîte à moustaches -----------------------------------------------------

LIRE_TRAITS = ('Sur une boîte à moustaches, on lit de gauche à droite : le minimum (bout de la'
               ' moustache gauche), le premier quartile $Q_1$ (bord gauche de la boîte), la médiane'
               ' (trait dans la boîte), le troisième quartile $Q_3$ (bord droit), le maximum (bout de'
               ' la moustache droite).')

T = cinq('')  # lo, qa, me, qb, hi sans préfixe

V_MEDIANE = variation(
    'La boîte à moustaches résume le temps de trajet, en minutes, entre la maison et le collège des'
    ' élèves d\'une classe.'
    + boite('0 à 50, de 2 en 2', 'Temps de trajet (min)', [ligne('Trajet', '')])
    + 'Quelle est la médiane du temps de trajet, en minutes ?\n\n$?$',
    vars_boite('', '1..6', '1..4', pas=2), ['{{me}}'],
    [LIRE_TRAITS,
     'L\'axe est gradué de $2$ en $2$ : le trait dans la boîte est à ' + '$' + col('{{me}}') + '$.',
     'Au moins la moitié des élèves mettent ${{me}}$ minutes ou moins, au moins la moitié'
     ' ${{me}}$ minutes ou plus.'])

V_QUARTILES = variation(
    'La boîte à moustaches résume les notes sur $20$ des élèves de 3e à un devoir commun.'
    + boite('0 à 20', 'Note sur 20', [ligne('Notes', '')])
    + 'Lis le premier quartile $Q_1$ et le troisième quartile $Q_3$.\n\n$Q_1=?$ et $Q_3=?$',
    vars_boite('', '2..6', '1..4'), ['{{qa}}', '{{qb}}'],
    [LIRE_TRAITS,
     'Bord gauche de la boîte : $Q_1 = ' + col('{{qa}}') + '$ ; bord droit : $Q_3 = '
     + col('{{qb}}', 1) + '$.'], ['hi <= 20'])

V_ETENDUE = variation(
    'La boîte à moustaches résume la taille, en centimètres, des élèves d\'un collège.'
    + boite('140 à 180, de 2 en 2', 'Taille (cm)', [ligne('Tailles', '')])
    + 'Quelle est l\'étendue des tailles, en centimètres ?\n\n$?$',
    vars_boite('', '1..4', '1..4', pas=2, base=140), [ev('hi-lo')],
    ['L\'étendue est la différence entre le maximum et le minimum : les deux bouts des moustaches.',
     'Minimum : ${{lo}}$ cm ; maximum : ${{hi}}$ cm (axe gradué de $2$ en $2$).',
     'Étendue : ${{hi}} - {{lo}} = ' + col(ev('hi-lo')) + '$ cm.'])

# Phrases justes (une tirée par t) et fausses (toujours fausses, voir l'en-tête)
JUSTES = ['Au moins la moitié des élèves ont une note supérieure ou égale à ${{me}}$.',
          'Au moins $25~\\%$ des élèves ont une note inférieure ou égale à ${{qa}}$.',
          'Au moins $75~\\%$ des élèves ont une note inférieure ou égale à ${{qb}}$.']
POURQUOI = ['${{me}}$ est la médiane : au moins la moitié des notes sont au-dessus (ou égales).',
            '${{qa}}$ est le premier quartile : au moins un quart des notes sont en dessous (ou égales).',
            '${{qb}}$ est le troisième quartile : au moins trois quarts des notes sont en dessous (ou'
            ' égales).']
V_INTERPRETER = variation(
    'La boîte à moustaches résume les notes sur $20$ des élèves d\'une classe.'
    + boite('0 à 20', 'Note sur 20', [ligne('Notes', '')])
    + 'Quelle phrase est juste ?'
    + choix([selon('t', JUSTES),
             'Au moins $75~\\%$ des élèves ont une note supérieure ou égale à ${{qb}}$.',
             'Au moins la moitié des élèves ont une note inférieure ou égale à ${{qa}}$.',
             'L\'étendue des notes est ${{hi}}$.']),
    [var('t', '0..2')] + vars_boite('', '2..6', '1..4'), ['0'],
    [LIRE_TRAITS,
     selon('t', POURQUOI),
     'Les autres sont fausses : au moins $75~\\%$ des notes sont inférieures ou égales à ${{qb}}$'
     ' (pas supérieures) ; ${{qa}}$ est sous la médiane, donc moins de la moitié des notes sont'
     ' inférieures ou égales à ${{qa}}$ ; l\'étendue est ${{hi}} - {{lo}} = ' + ev('hi-lo') + '$.'],
    ['hi <= 20'])


def classe(cond, si, sinon):
    return '{{if:' + cond + '|' + si + '|' + sinon + '}}'


MED = 'Ame>Bme'
ETE = '(Ahi-Alo)>(Bhi-Blo)'
M_OUI, M_NON = classe(MED, '3e A', '3e B'), classe(MED, '3e B', '3e A')
E_OUI, E_NON = classe(ETE, '3e A', '3e B'), classe(ETE, '3e B', '3e A')


def combinaison(m, e):
    return 'La ' + m + ' a la plus grande médiane, la ' + e + ' la plus grande étendue.'


V_COMPARER = variation(
    'Les deux boîtes à moustaches résument les notes sur $20$ de deux classes au même devoir.'
    + boite('0 à 20', 'Note sur 20', [ligne('3e A', 'A'), ligne('3e B', 'B')])
    + 'Quelle phrase est juste ?'
    + choix([combinaison(M_OUI, E_OUI), combinaison(M_NON, E_OUI), combinaison(M_OUI, E_NON),
             combinaison(M_NON, E_NON)]),
    vars_boite('A', '2..6', '1..4') + vars_boite('B', '2..6', '1..4'), ['0'],
    ['Médianes (trait dans la boîte) : 3e A ${{Ame}}$, 3e B ${{Bme}}$ → **' + M_OUI + '**.',
     'Étendues (maximum − minimum) : 3e A ${{Ahi}} - {{Alo}} = ' + ev('Ahi-Alo') + '$, 3e B ${{Bhi}}'
     ' - {{Blo}} = ' + ev('Bhi-Blo') + '$ → **' + E_OUI + '**.'],
    ['Ame != Bme', '(Ahi-Alo) != (Bhi-Blo)', 'Ahi <= 20', 'Bhi <= 20'])

G1 = [2, 3, 3, 4]
assert valeurs_boite(3, G1, 2) == [6, 10, 16, 22, 30]
assert valeurs_boite(3, G1, 2, 140) == [146, 150, 156, 162, 170]
assert valeurs_boite(2, [3, 2, 4, 3]) == [2, 5, 7, 11, 14]
CA, CB = (2, [3, 4, 2, 3]), (3, [2, 2, 4, 5])     # A : médiane 9, étendue 12 ; B : 7, 13
assert valeurs_boite(*CA) == [2, 5, 9, 11, 14] and valeurs_boite(*CB) == [3, 5, 7, 11, 16]

MODELES.append(modele(
    '01-lire-une-boite-a-moustaches', 'Lire une boîte à moustaches',
    'Lire la médiane, les quartiles, l\'étendue sur une boîte à moustaches ; choisir la phrase'
    ' juste ; comparer deux boîtes', 1,
    [V_MEDIANE, V_QUARTILES, V_ETENDUE, V_INTERPRETER, V_COMPARER],
    [spec('Trajet 6, 10, 16, 22, 30 : médiane 16', 0, vs_boite('', 3, G1), '16', 'correct'),
     spec('Erreur : Q1 lu pour la médiane', 0, vs_boite('', 3, G1), '10', 'incorrect'),
     spec('Erreur : graduation de 2 lue de 1 (8 traits)', 0, vs_boite('', 3, G1), '8', 'incorrect'),
     spec('Notes 2, 5, 7, 11, 14 : Q1 = 5, Q3 = 11', 1, vs_boite('', 2, [3, 2, 4, 3]), ['5', '11'],
          'correct'),
     spec('Erreur : Q1 et Q3 inversés', 1, vs_boite('', 2, [3, 2, 4, 3]), ['11', '5'], 'incorrect'),
     spec('Erreur : minimum et maximum', 1, vs_boite('', 2, [3, 2, 4, 3]), ['2', '14'], 'incorrect'),
     spec('Tailles 146 à 170 : étendue 24', 2, vs_boite('', 3, G1), '24', 'correct'),
     spec('Erreur : étendue = maximum', 2, vs_boite('', 3, G1), '170', 'incorrect'),
     spec('Erreur : écart interquartile', 2, vs_boite('', 3, G1), '12', 'incorrect'),
     spec('Phrase juste (médiane)', 3, {'t': 0, **vs_boite('', 2, [3, 2, 4, 3])}, '0', 'correct'),
     spec('Phrase juste (Q3)', 3, {'t': 2, **vs_boite('', 2, [3, 2, 4, 3])}, '0', 'correct'),
     spec('Erreur : « 75 % au-dessus de Q3 »', 3, {'t': 0, **vs_boite('', 2, [3, 2, 4, 3])}, '1',
          'incorrect'),
     spec('Erreur : étendue = maximum', 3, {'t': 1, **vs_boite('', 2, [3, 2, 4, 3])}, '3',
          'incorrect'),
     spec('A plus grande médiane (9 contre 7), B plus grande étendue (13 contre 12)',
          4, {**vs_boite('A', *CA), **vs_boite('B', *CB)}, '0', 'correct'),
     spec('Erreur : la 3e A a aussi la plus grande étendue', 4,
          {**vs_boite('A', *CA), **vs_boite('B', *CB)}, '2', 'incorrect')],
    delay=90))

# --- 2. 3-030 : construire une boîte à moustaches -----------------------------------------------

V_INDICATEURS = variation(
    'Dans un club, on a relevé le temps, en minutes, que met chaque nageur pour nager $1$ km. Voici'
    ' les indicateurs de cette série :\n\n'
    'minimum : ${{lo}}$ ; premier quartile : ${{qa}}$ ; médiane : ${{me}}$ ; troisième quartile :'
    ' ${{qb}}$ ; maximum : ${{hi}}$.\n\nConstruis la boîte à moustaches.'
    + boite('10 à 50, de 2 en 2', 'Temps pour 1 km (min)', [ligne('Nageurs', '')], 'Nageurs'),
    vars_boite('', '1..4', '1..4', pas=2, base=10), [],
    ['L\'axe est gradué de $2$ en $2$.',
     'La boîte va de $Q_1 = {{qa}}$ à $Q_3 = {{qb}}$, avec un trait à la médiane ${{me}}$ ; les'
     ' moustaches vont jusqu\'au minimum ${{lo}}$ et au maximum ${{hi}}$.'])

# Série rangée x1 ⩽ … ⩽ x13 ; k = 0, 1, 2 → 9, 11, 13 notes
X = ['x' + str(i) for i in range(1, 14)]
TAILLES = [9, 11, 13]


def lagrange(a, b, c):
    """Expression valant a si k = 0, b si k = 1, c si k = 2."""
    return '(' + a + ')*(k-1)*(k-2)/2+(' + b + ')*k*(2-k)+(' + c + ')*k*(k-1)/2'


def rangs(n):
    return math.ceil(n / 4), (n + 1) // 2, math.ceil(3 * n / 4)


RANGS = [rangs(n) for n in TAILLES]   # (3, 5, 7), (3, 6, 9), (4, 7, 10)
assert RANGS == [(3, 5, 7), (3, 6, 9), (4, 7, 10)]

ALEA = random.Random(30)


def permutation(n):
    """Ordre d'affichage : ni la série rangée, ni sa médiane au milieu."""
    while True:
        p = list(range(n))
        ALEA.shuffle(p)
        if p[n // 2] != n // 2 and sum(1 for i in range(n - 1) if p[i] < p[i + 1]) <= 2 * n // 3:
            return p


PERMS = [[permutation(n) for _ in range(2)] for n in TAILLES]


def liste(indices):
    return ' ; '.join('{{' + X[i] + '}}' for i in indices)


AFFICHEE = selon('k', [selon('p', [liste(PERMS[k][p]) for p in range(2)]) for k in range(3)])
RANGEE = selon('k', [liste(range(n)) for n in TAILLES])

V_SERIE = variation(
    'Voici les notes sur $20$ de ${{n}}$ élèves à une évaluation :\n\n' + AFFICHEE + '\n\n'
    'Construis la boîte à moustaches de cette série.'
    + boite('0 à 20', 'Note sur 20', ['données: ' + AFFICHEE], 'toutes'),
    [var('k', '0..2'), var('p', '0..1'), var('x1', '1..5')]
    + [var('d' + str(i), '0..2') for i in range(2, 14)]
    + [var(X[i], 'eval:' + X[i - 1] + '+d' + str(i + 1)) for i in range(1, 13)]
    + [var('n', 'eval:9+2*k'),
       var('qa', 'eval:' + lagrange('x3', 'x3', 'x4')),
       var('me', 'eval:' + lagrange('x5', 'x6', 'x7')),
       var('qb', 'eval:' + lagrange('x7', 'x9', 'x10')),
       var('hi', 'eval:' + lagrange('x9', 'x11', 'x13'))],
    [],
    ['On range les notes : ' + RANGEE + '.',
     'Minimum : ${{x1}}$ ; maximum : ${{hi}}$.',
     'Médiane : ${{n}}$ notes, la note de rang $\\dfrac{ {{n}}+1}{2} = ' + ev('5+k') + '$, soit'
     ' ${{me}}$.',
     '$Q_1$ : $\\dfrac{ {{n}} }{4} = ' + selon('k', ['2{,}25', '2{,}75', '3{,}25']) + '$, la note de'
     ' rang ' + selon('k', ['3', '3', '4']) + ', soit ${{qa}}$ ; $Q_3$ : $\\dfrac{3 \\times {{n}} }{4} = '
     + selon('k', ['6{,}75', '8{,}25', '9{,}75']) + '$, la note de rang ' + selon('k', ['7', '9', '10'])
     + ', soit ${{qb}}$.',
     'La boîte va de ${{qa}}$ à ${{qb}}$, trait à ${{me}}$ ; moustaches de ${{x1}}$ à ${{hi}}$.'],
    ['x13 <= 20', 'x1 < qa', 'qa < me', 'me < qb', 'qb < hi'])

# Série à effectifs : 6 pointures consécutives v0 … v0 + 5, effectifs n0 … n5
N6 = ['n' + str(k) for k in range(6)]
CUM = ['C' + str(k) for k in range(6)]


def premier_rang(test):
    s = '5'
    for k in range(4, -1, -1):
        s = '{{if:' + test(CUM[k]) + '|' + str(k) + '|' + s + '}}'
    return s


V_EFFECTIFS = variation(
    'Voici les pointures des élèves d\'un club de basket.\n\n```effectifs\ntitre: Pointure\n'
    + '\n'.join(ev('v0+' + str(k)) + ' = {{' + N6[k] + '}}' for k in range(6))
    + '\nlignes: effectifs\n```\n\nConstruis la boîte à moustaches de cette série.'
    + boite('32 à 46', 'Pointure', ['Pointures = {{v0}} ; ' + ev('v0+Q') + ' ; ' + ev('v0+M') + ' ; '
                                    + ev('v0+R') + ' ; ' + ev('v0+5')], 'Pointures'),
    [var('v0', '35..38')] + [var(n, '1..6') for n in N6]
    + [var(CUM[k], 'eval:' + '+'.join(N6[:k + 1])) for k in range(6)]
    + [var('N', 'eval:C5'),
       var('Q', premier_rang(lambda c: '4*' + c + '>=N')),
       var('M', premier_rang(lambda c: '2*' + c + '>=N+1')),
       var('R', premier_rang(lambda c: '4*' + c + '>=3*N'))],
    [],
    ['Effectif total : $N = {{N}}$ (impair).',
     'Effectifs cumulés croissants : ' + ' ; '.join(
         '$' + ev('v0+' + str(k)) + '$ → ${{' + CUM[k] + '}}$' for k in range(6)) + '.',
     'Médiane : rang $\\dfrac{ {{N}}+1}{2} = ' + ev('(N+1)/2') + '$ → ' + ev('v0+M') + '. $Q_1$ :'
     ' premier cumulé qui atteint $\\dfrac{ {{N}} }{4}$ → ' + ev('v0+Q') + '. $Q_3$ : premier cumulé'
     ' qui atteint $\\dfrac{3 \\times {{N}} }{4}$ → ' + ev('v0+R') + '.',
     'Minimum ${{v0}}$, maximum ' + ev('v0+5') + ' : la boîte va de ' + ev('v0+Q') + ' à '
     + ev('v0+R') + '.'],
    ['N-2*floor(N/2) == 1', 'N <= 25', 'Q > 0', 'Q < M', 'M < R', 'R < 5'])


def serie_spec(k, p, xs):
    """Variables d'une série rangée (x1, écarts d2…d13) ; xs complétée jusqu'à 13 valeurs."""
    xs = xs + [xs[-1]] * (13 - len(xs))
    v = {'k': k, 'p': p, 'x1': xs[0]}
    v.update({'d' + str(i + 1): xs[i] - xs[i - 1] for i in range(1, 13)})
    return v


def indicateurs(xs):
    n = len(xs)
    a, m, b = rangs(n)
    return [xs[0], xs[a - 1], xs[m - 1], xs[b - 1], xs[-1]]


S9 = [3, 5, 7, 8, 10, 11, 12, 14, 16]      # Q1 = 7 ; demi-série basse 3, 5, 7, 8 → 6
assert indicateurs(S9) == [3, 7, 10, 12, 16]
S13 = [2, 4, 5, 6, 8, 9, 10, 10, 12, 13, 14, 15, 17]
assert indicateurs(S13) == [2, 6, 10, 13, 17]
milieu9 = S9[PERMS[0][0][4]]   # la 5e note affichée (« médiane » sans ranger)
assert milieu9 != 10


def eff_spec(v0, ns):
    return {'v0': v0, **{N6[k]: ns[k] for k in range(6)}}


NS = [2, 3, 5, 4, 3, 2]   # N = 19, cumulés 2, 5, 10, 14, 17, 19 : Q1 rang 5 → 1, médiane 10 → 2, Q3 15 → 4
V0 = 37

MODELES.append(modele(
    '02-construire-une-boite-a-moustaches', 'Construire une boîte à moustaches',
    'Construire une boîte à moustaches à partir de ses indicateurs, d\'une série de notes à ranger,'
    ' ou d\'un tableau d\'effectifs (quartiles du programme)', 2,
    [V_INDICATEURS, V_SERIE, V_EFFECTIFS],
    [spec('Nageurs 16, 22, 28, 36, 44', 0, vs_boite('', 3, [3, 3, 4, 4]),
          ['16', '22', '28', '36', '44'], 'correct'),
     spec('Erreur : Q1 et Q3 inversés', 0, vs_boite('', 3, [3, 3, 4, 4]),
          ['16', '36', '28', '22', '44'], 'incorrect'),
     spec('9 notes : 3, 7, 10, 12, 16', 1, serie_spec(0, 0, S9), [str(x) for x in indicateurs(S9)],
          'correct'),
     spec('Erreur : Q1 par la demi-série (6)', 1, serie_spec(0, 0, S9),
          ['3', '6', '10', '12', '16'], 'incorrect'),
     spec('Erreur : médiane = note du milieu de l\'énoncé', 1, serie_spec(0, 0, S9),
          ['3', '7', str(milieu9), '12', '16'], 'incorrect'),
     spec('13 notes : 2, 6, 10, 13, 17', 1, serie_spec(2, 1, S13),
          [str(x) for x in indicateurs(S13)], 'correct'),
     spec('Erreur : minimum et maximum oubliés (laissés sur Q1, Q3)', 1, serie_spec(2, 1, S13),
          ['6', '6', '10', '13', '13'], 'incorrect'),
     spec('Pointures 37 à 42, N = 19 : 37, 38, 39, 41, 42', 2, eff_spec(V0, NS),
          ['37', '38', '39', '41', '42'], 'correct'),
     spec('Erreur : médiane des six pointures sans les effectifs (40)', 2,
          eff_spec(V0, NS), ['37', '38', '40', '41', '42'], 'incorrect')],
    delay=300))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
