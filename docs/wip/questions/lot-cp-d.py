"""Lot D du CP : collections, droite graduée, longueurs, diagramme en barres — 6 modèles.

Phase 0 validée par David le 2026-11-19 (« je te suis », sur la phase 0 entière et ses trois
questions : les 5 points et leurs variations, deux modèles pour CP-033, axe de 0 à 10 pour CP-072).
Journal : `docs/wip/questions-progress.md`, § « Lot D ».

- CP-001 (dénombrement, niveau 2) : vrac 6 à 20 ; dizaines et unités 21 à 99 ; partiellement
  groupée (3 barres et 15 cubes, exemple du BO). Collections dessinées seulement.
- CP-070 (ordre, niveau 2) : deux collections rangées ; piège du BO (plus d'unités isolées ≠ plus
  grande). Case « choix » A / autant / B.
- CP-008 (droite graduée, niveau 1) : 0 à 10 ; 0 à 20 ; un morceau de 10 en 10 (lo..lo + 10, ≤ 100).
- CP-033 (comparaison et mesure, niveaux 1 et 2) : bandelettes alignées à gauche, écart d'au moins
  2 carreaux (« aucun doute ») ; la plus longue / la plus courte (choix) ; ranger 3 à 5 bandelettes.
- CP-072 (diagrammes en barres, niveau 1) : axe de 0 à 10, toutes les barres ; deux barres sur quatre.

Bandelettes : longueur = s + g × rang, le rang de chaque ligne lu dans une permutation tirée (`q`),
par polynôme de Lagrange en `{{eval:}}` (jamais d'`{{eval}}` dans un `{{if}}`). Étiquettes du
` ```ranger ` écrites dans le BON ordre : lettre de la ligne de rang j, par `{{if:q==…}}` à un niveau.
Pas de `theme` / `domain` / `subdomain` (ADR 0035). Jamais de variable `e` ni `i`.

    python3 -I docs/wip/questions/lot-cp-d.py scripts/questions/cp-d
"""
import json
import os
import sys

DOSSIER = sys.argv[1]
MODELES = {}

# ---- Gabarits ----


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(enonce, variables, reponses, etapes, conditions=None):
    v = {'statement': enonce, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [r if isinstance(r, dict) else {'expectedAnswer': r} for r in reponses]
    v['correction'] = {'steps': etapes}
    return v


def modele(title, description, niveau, variations, specs, delay=90):
    return {'title': title, 'description': description, 'grades': ['CP'], 'level': niveau,
            'delay': delay, 'status': 'draft', 'variations': variations, 'testSpecs': specs}


def calcule(variables, tirage):
    """Valeurs de toutes les variables d'une variation, pour un tirage donné (specs)."""
    valeurs = {}
    for v in variables:
        nom, expr = v['name'], v['expression']
        if expr.startswith('eval:'):
            x = eval(expr[5:], {'__builtins__': {}, 'max': max, 'min': min, 'abs': abs,
                                'sign': lambda a: (a > 0) - (a < 0)}, dict(valeurs))
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


def lagrange(k, valeurs):
    """Expression qui vaut `valeurs[j]` quand `k` vaut `j` (j = 0 … n − 1)."""
    n = len(valeurs)
    termes = []
    for j, v in enumerate(valeurs):
        num = '*'.join(f'({k}-{m})' for m in range(n) if m != j)
        den = 1
        for m in range(n):
            if m != j:
                den *= (j - m)
        termes.append(f'({v})' + ('*' + num if num else '') + f'/({den})')
    return '(' + '+'.join(termes) + ')'


def si(k, textes):
    s = textes[-1]
    for j in range(len(textes) - 2, -1, -1):
        s = '{{if:' + k + '==' + str(j) + '|' + textes[j] + '|' + s + '}}'
    return s


def choix(options):
    return '```choix\nmelanger: non\n' + ''.join(f'- {o}\n' for o in options) + '```'


def col(x):
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


def ecrire(nom, mod):
    MODELES[nom] = mod


# ============================================================================
# 01 — CP-001 : dénombrer une collection (dénombrement, 2)
# ============================================================================

QUESTION_CUBES = 'Combien de petits cubes y a-t-il ?'

v1 = variation(
    QUESTION_CUBES + '\n\n```collection\nunités: {{n}}\n```\n\nIl y a $?$ petits cubes.',
    [var('n', '6..20')],
    ['{{n}}'],
    ['Les cubes sont en vrac : on les compte un par un, sans en oublier ni en compter deux fois.',
     'Pour ne pas se perdre, on peut faire des paquets de $10$.',
     'Il y a $' + col('{{n}}') + '$ petits cubes.'])

v2 = variation(
    QUESTION_CUBES + '\n\n```collection\ndizaines: {{d}}\nunités: {{u}}\n```\n\n'
    'Il y a $?$ petits cubes.',
    [var('d', '2..9'), var('u', '1..9')],
    ['{{eval:10*d+u}}'],
    ['Une barre, c\'est $10$ cubes : une dizaine.',
     '${{d}}$ barres : ${{d}}$ dizaines, c\'est ${{eval:10*d}}$ cubes. Et ${{u}}$ cubes tout seuls.',
     '${{eval:10*d}} + {{u}} = ' + col('{{eval:10*d+u}}') + '$ petits cubes.'])

v3 = variation(
    QUESTION_CUBES + '\n\n```collection\ndizaines: {{d}}\nunités: {{u}}\n```\n\n'
    'Il y a $?$ petits cubes.',
    [var('d', '1..7'), var('w', '1..9'), var('u', 'eval:10+w')],
    ['{{eval:10*d+u}}'],
    ['Il y a ${{u}}$ cubes tout seuls : c\'est plus que $10$ ! Avec $10$ d\'entre eux, on fait une'
     ' barre de plus.',
     'Cela fait ${{eval:d+1}}$ barres et ${{w}}$ cubes tout seuls.',
     '${{eval:10*d+10}} + {{w}} = ' + col('{{eval:10*d+u}}') + '$ petits cubes.'])

vs = [v1, v2, v3]
ecrire('01-combien-de-cubes', modele(
    'Combien de petits cubes ?',
    'Dénombrer une collection dessinée : en vrac (6 à 20), en barres de dix et cubes (21 à 99),'
    ' partiellement groupée (plus de dix cubes tout seuls, exemple du programme)',
    2, vs,
    [spec('14 cubes en vrac', 0, vs, {'n': 14}, '14', 'correct'),
     spec('Erreur : un cube oublié (13)', 0, vs, {'n': 14}, '13', 'incorrect'),
     spec('4 barres et 7 cubes : 47', 1, vs, {'d': 4, 'u': 7}, '47', 'correct'),
     spec('Erreur : 4 + 7 = 11 (barres comptées comme des cubes)', 1, vs, {'d': 4, 'u': 7}, '11',
          'incorrect'),
     spec('Erreur : 74 (dizaines et unités inversées)', 1, vs, {'d': 4, 'u': 7}, '74',
          'incorrect'),
     spec('BO : 3 barres et 15 cubes, 45', 2, vs, {'d': 3, 'w': 5}, '45', 'correct'),
     spec('Erreur : 315 (on écrit 3 puis 15)', 2, vs, {'d': 3, 'w': 5}, '315', 'incorrect'),
     spec('Erreur : 35 (la dizaine des cubes seuls oubliée)', 2, vs, {'d': 3, 'w': 5}, '35',
          'incorrect')],
    delay=90))

# ============================================================================
# 02 — CP-070 : comparer deux collections (ordre, 2)
# ============================================================================

CHOIX_AB = choix(['La collection A', 'Elles en ont autant', 'La collection B'])
QUESTION_AB = 'Quelle collection a le plus de petits cubes ?'
VERDICT = si('z', ['$' + col('\\text{A}') + '$ a le plus de cubes.',
                   'Elles en ont $' + col('\\text{autant}') + '$.',
                   '$' + col('\\text{B}') + '$ a le plus de cubes.'])


def collection_ab(da, ua, db, ub):
    return ('```collection\ndizaines: {{' + da + '}} ; {{' + db + '}}\nunités: {{' + ua
            + '}} ; {{' + ub + '}}\nlégendes: A ; B\n```')


v1 = variation(
    QUESTION_AB + '\n\n' + collection_ab('da', 'ua', 'db', 'ub') + '\n\n' + CHOIX_AB,
    [var('da', '1..9'), var('ua', '0..9'), var('db', '1..9'), var('ub', '0..9'),
     var('va', 'eval:10*da+ua'), var('vb', 'eval:10*db+ub'), var('z', 'eval:sign(vb-va)+1')],
    ['{{z}}'],
    ['On compte chaque collection : une barre, c\'est $10$ cubes.',
     'A : ${{da}}$ barres et ${{ua}}$ cubes, c\'est ${{va}}$. B : ${{db}}$ barres et ${{ub}}$ cubes,'
     ' c\'est ${{vb}}$.',
     VERDICT],
    ['va != vb', 'da != db || ua != ub'])

v2 = variation(
    QUESTION_AB + '\n\n' + collection_ab('da', 'ua', 'db', 'ub') + '\n\n' + CHOIX_AB,
    [var('d', '1..7'), var('x', '1..9'), var('y', '0..9'),
     var('da', 'eval:d'), var('ua', 'eval:10+x'), var('db', 'eval:d+1'), var('ub', 'eval:y'),
     var('va', 'eval:10*da+ua'), var('vb', 'eval:10*db+ub'), var('z', 'eval:sign(vb-va)+1')],
    ['{{z}}'],
    ['A a ${{ua}}$ cubes tout seuls : avec $10$ d\'entre eux, on fait une barre de plus.',
     'A : ${{eval:d+1}}$ barres et ${{x}}$ cubes, c\'est ${{va}}$. B : ${{db}}$ barres et ${{ub}}$'
     ' cubes, c\'est ${{vb}}$.',
     VERDICT])

vs = [v1, v2]
ecrire('02-quelle-collection-a-le-plus', modele(
    'Quelle collection a le plus de cubes ?',
    'Comparer deux collections dessinées (moins de 100) : rangées en barres et cubes ; une collection'
    ' partiellement groupée, piège « plus de cubes seuls ne veut pas dire plus de cubes »',
    2, vs,
    [spec('A 52, B 49 : A', 0, vs, {'da': 5, 'ua': 2, 'db': 4, 'ub': 9}, '0', 'correct'),
     spec('Erreur : B (9 cubes seuls contre 2)', 0, vs, {'da': 5, 'ua': 2, 'db': 4, 'ub': 9}, '2',
          'incorrect'),
     spec('A 36, B 63 : B', 0, vs, {'da': 3, 'ua': 6, 'db': 6, 'ub': 3}, '2', 'correct'),
     spec('BO : A 3 barres et 15 cubes (45), B 4 barres et 2 cubes (42) : A', 1, vs,
          {'d': 3, 'x': 5, 'y': 2}, '0', 'correct'),
     spec('Erreur : B (plus de barres)', 1, vs, {'d': 3, 'x': 5, 'y': 2}, '2', 'incorrect'),
     spec('Autant : 45 et 45', 1, vs, {'d': 3, 'x': 5, 'y': 5}, '1', 'correct'),
     spec('Erreur : A (15 cubes seuls contre 5)', 1, vs, {'d': 3, 'x': 5, 'y': 5}, '0',
          'incorrect'),
     spec('A 27, B 38 : B', 1, vs, {'d': 1, 'x': 7, 'y': 8}, '2', 'correct')],
    delay=90))

# ============================================================================
# 03 — CP-008 : placer un nombre sur une demi-droite graduée de un en un (droite graduée, 1)
# ============================================================================

PLACE = 'Place le nombre ${{x}}$ sur la demi-droite graduée.'


def droite(debut, fin, labels):
    return ('```line\nstart: ' + debut + '\nend: ' + fin + '\nstep: 1\nmajor: 5\nlabels: '
            + labels + '\nplacer: {{x}}\n```')


v1 = variation(
    PLACE + '\n\n' + droite('0', '10', '0, 5, 10'),
    [var('x', '1..9')],
    [],
    ['La demi-droite est graduée de un en un : d\'un trait au suivant, on avance de $1$.',
     'On part de $0$ et on compte ${{x}}$ traits.'],
    ['x != 5'])

v2 = variation(
    PLACE + '\n\n' + droite('0', '20', '0, 10, 20'),
    [var('x', '11..19')],
    [],
    ['La demi-droite est graduée de un en un : d\'un trait au suivant, on avance de $1$.',
     'On part de $10$ et on compte encore ${{eval:x-10}}$ traits : $10 + {{eval:x-10}} = {{x}}$.'],
    ['x != 15'])

v3 = variation(
    PLACE + '\n\n' + droite('{{lo}}', '{{hi}}', '{{lo}}, {{hi}}'),
    [var('a', '1..9'), var('k', '1..9'), var('lo', 'eval:10*a'), var('hi', 'eval:lo+10'),
     var('x', 'eval:lo+k')],
    [],
    ['On ne voit qu\'un morceau de la demi-droite, de ${{lo}}$ à ${{hi}}$, graduée de un en un.',
     'On part de ${{lo}}$ et on compte ${{k}}$ traits : ${{lo}} + {{k}} = {{x}}$.'])

vs = [v1, v2, v3]
ecrire('03-place-le-nombre', modele(
    'Place le nombre sur la demi-droite',
    'Placer un nombre sur une demi-droite graduée de un en un : de 0 à 10 ; de 0 à 20 (11 à 19) ;'
    ' un morceau de dix, de 10 à 100',
    1, vs,
    [spec('7 sur la demi-droite de 0 à 10', 0, vs, {'x': 7}, '7', 'correct'),
     spec('Erreur : un trait de trop (8)', 0, vs, {'x': 7}, '8', 'incorrect'),
     spec('Rien placé : case vide', 0, vs, {'x': 7}, '', 'empty'),
     spec('13 sur la demi-droite de 0 à 20', 1, vs, {'x': 13}, '13', 'correct'),
     spec('Erreur : 3 (compté depuis 0, sans la dizaine)', 1, vs, {'x': 13}, '3', 'incorrect'),
     spec('37, entre 30 et 40', 2, vs, {'a': 3, 'k': 7}, '37', 'correct'),
     spec('Erreur : 36 (le trait de départ compté)', 2, vs, {'a': 3, 'k': 7}, '36', 'incorrect')],
    delay=60))

# ============================================================================
# 04, 05 — CP-033 : comparer des bandelettes (comparaison et mesure, 1 et 2)
# ============================================================================

LETTRES = ['A', 'B', 'C', 'D', 'E']
COULEURS = ['bleu', 'rouge', 'vert', 'orange', 'violet']
HAUTEUR = 1.2   # d'une ligne à la suivante
EPAISSEUR = 0.6

# Permutations : rang (0 = la plus courte) de chaque ligne, de haut en bas
PERMS = {
    3: [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]],
    4: [[1, 3, 0, 2], [2, 0, 3, 1], [3, 1, 2, 0], [0, 2, 1, 3], [2, 3, 1, 0], [1, 0, 3, 2]],
    5: [[2, 4, 0, 3, 1], [4, 1, 3, 0, 2], [1, 3, 4, 2, 0], [3, 0, 2, 4, 1], [0, 2, 1, 4, 3],
        [4, 2, 0, 1, 3]],
}


def bandelettes(n):
    """Variables (s, g, q, l0…), bloc figure, et longueur de chaque ligne."""
    largeur = 1 + 5 + 3 * (n - 1) + 1
    haut = n * HAUTEUR + 0.4
    variables = [var('s', '3..5'), var('g', '2..3'), var('q', '0..5')]
    lignes = []
    for r in range(n):
        rangs = [PERMS[n][p][r] for p in range(6)]
        variables.append(var(f'l{r}', 'eval:s+g*' + lagrange('q', rangs)))
        variables.append(var(f'x{r}', f'eval:1+l{r}'))
        y0 = round(haut - 0.4 - (r + 1) * HAUTEUR + (HAUTEUR - EPAISSEUR) / 2 + 0.2, 2)
        y1 = round(y0 + EPAISSEUR, 2)
        lignes += [
            f'P{r}a = point(1, {y0}, visible=faux)',
            f'P{r}b = point({{{{x{r}}}}}, {y0}, visible=faux)',
            f'P{r}c = point({{{{x{r}}}}}, {y1}, visible=faux)',
            f'P{r}d = point(1, {y1}, visible=faux)',
            f'polygone(P{r}a, P{r}b, P{r}c, P{r}d, couleur="noir", remplissage="{COULEURS[r]}",'
            ' opacite_fond=1)',
            f'texte(0.4, {round((y0 + y1) / 2, 2)}, "{LETTRES[r]}")',
        ]
    bloc = ('```figure\nfenetre: 0 ; ' + str(largeur) + ' ; 0 ; ' + str(round(haut, 2))
            + '\ndescription: ' + str(n) + ' bandelettes de couleur nommées '
            + ', '.join(LETTRES[:n - 1]) + ' et ' + LETTRES[n - 1]
            + ', l\'une sous l\'autre, alignées à gauche.\n---\n' + '\n'.join(lignes) + '\n```')
    return variables, bloc


def ligne_de_rang(n, rang):
    """Pour chaque q, la ligne (0…) qui a ce rang."""
    return [PERMS[n][p].index(rang) for p in range(6)]


ALIGNEES = 'Les bandelettes partent toutes du même bord, à gauche : on regarde où elles s\'arrêtent.'

variables, bloc = bandelettes(3)
v1 = variation(
    'Quelle bandelette est la plus {{if:t==1|longue|courte}} ?\n\n' + bloc + '\n\n'
    + choix([f'La bandelette {x}' for x in LETTRES[:3]]),
    [var('t', '0..1')] + variables
    + [var('lg', 'eval:' + lagrange('q', ligne_de_rang(3, 2))),
       var('lc', 'eval:' + lagrange('q', ligne_de_rang(3, 0))),
       var('r', 'eval:t*lg+(1-t)*lc')],
    ['{{r}}'],
    [ALIGNEES,
     'La plus {{if:t==1|longue|courte}} est celle qui s\'arrête le plus {{if:t==1|loin|tôt}} : la'
     ' bandelette $' + col('\\text{' + si('r', LETTRES[:3]) + '}') + '$.'])

variables4, bloc4 = bandelettes(4)
v2 = variation(
    'Quelle bandelette est la plus {{if:t==1|longue|courte}} ?\n\n' + bloc4 + '\n\n'
    + choix([f'La bandelette {x}' for x in LETTRES[:4]]),
    [var('t', '0..1')] + variables4
    + [var('lg', 'eval:' + lagrange('q', ligne_de_rang(4, 3))),
       var('lc', 'eval:' + lagrange('q', ligne_de_rang(4, 0))),
       var('r', 'eval:t*lg+(1-t)*lc')],
    ['{{r}}'],
    [ALIGNEES,
     'La plus {{if:t==1|longue|courte}} est celle qui s\'arrête le plus {{if:t==1|loin|tôt}} : la'
     ' bandelette $' + col('\\text{' + si('r', LETTRES[:4]) + '}') + '$.'])

vs = [v1, v2]


def tirage_b(t, q, s=3, g=2):
    return {'t': t, 'q': q, 's': s, 'g': g}


ecrire('04-quelle-bandelette', modele(
    'Quelle bandelette est la plus longue ?',
    'Comparer des bandelettes alignées à gauche, sans aucun doute (2 carreaux d\'écart au moins) :'
    ' la plus longue ou la plus courte, parmi 3 puis 4',
    1, vs,
    # q = 0 (3 lignes) : rangs 0, 1, 2 → la plus longue est C (2), la plus courte A (0)
    [spec('La plus longue : C', 0, vs, tirage_b(1, 0), '2', 'correct'),
     spec('Erreur : A (la plus courte)', 0, vs, tirage_b(1, 0), '0', 'incorrect'),
     # q = 3 : rangs 1, 2, 0 → la plus courte est C, la plus longue B
     spec('La plus courte : C', 0, vs, tirage_b(0, 3), '2', 'correct'),
     spec('Erreur : B (la plus longue)', 0, vs, tirage_b(0, 3), '1', 'incorrect'),
     # 4 lignes, q = 0 : rangs 1, 3, 0, 2 → la plus longue B, la plus courte C
     spec('4 bandelettes, la plus longue : B', 1, vs, tirage_b(1, 0, 4, 3), '1', 'correct'),
     spec('Erreur : D (la dernière)', 1, vs, tirage_b(1, 0, 4, 3), '3', 'incorrect'),
     spec('4 bandelettes, la plus courte : C', 1, vs, tirage_b(0, 0), '2', 'correct')],
    delay=45))


def ranger_bandelettes(n):
    variables, bloc = bandelettes(n)
    etiquettes = [si('q', [LETTRES[ligne] for ligne in ligne_de_rang(n, rang)])
                  for rang in range(n)]
    ordre = ' ; '.join('$\\text{' + e + '}$' for e in etiquettes)
    return variation(
        'Range les bandelettes de la plus courte à la plus longue.\n\n' + bloc
        + '\n\n```ranger\nsigne: <\n' + ''.join(f'- {x}\n' for x in etiquettes) + '```',
        variables,
        [],
        [ALIGNEES,
         'De la plus courte à la plus longue : ' + ordre + '.'])


vs = [ranger_bandelettes(3), ranger_bandelettes(4), ranger_bandelettes(5)]
# Réponses du ranger : position AFFICHÉE de l'étiquette posée à chaque place. Le mélange d'une
# spec est fixe (variables imposées, même source de hasard) : relevé le 2026-11-19 par
# `generateInstanceWithFixedVariables`, il ne dépend que du nombre d'étiquettes.
JUSTE = {3: ['2', '0', '1'], 4: ['3', '0', '1', '2'], 5: ['4', '0', '1', '2', '3']}


def envers(n):
    return list(reversed(JUSTE[n]))


def voisines(n):
    r = list(JUSTE[n])
    r[0], r[1] = r[1], r[0]
    return r


ecrire('05-range-les-bandelettes', modele(
    'Range les bandelettes',
    'Ranger 3, 4 puis 5 bandelettes alignées à gauche, de la plus courte à la plus longue'
    ' (5 au plus, borne du programme), étiquettes à ranger',
    2, vs,
    [spec('3 bandelettes, A < B < C', 0, vs, {'s': 3, 'g': 2, 'q': 0}, JUSTE[3], 'correct'),
     spec('Erreur : de la plus longue à la plus courte', 0, vs, {'s': 3, 'g': 2, 'q': 0},
          envers(3), 'incorrect'),
     spec('3 bandelettes, C < A < B', 0, vs, {'s': 4, 'g': 3, 'q': 3}, JUSTE[3], 'correct'),
     spec('4 bandelettes, C < A < D < B', 1, vs, {'s': 3, 'g': 2, 'q': 0}, JUSTE[4], 'correct'),
     spec('Erreur : deux voisines échangées', 1, vs, {'s': 3, 'g': 2, 'q': 0}, voisines(4),
          'incorrect'),
     spec('5 bandelettes', 2, vs, {'s': 5, 'g': 3, 'q': 5}, JUSTE[5], 'correct'),
     spec('Erreur : à l\'envers', 2, vs, {'s': 5, 'g': 3, 'q': 5}, envers(5), 'incorrect')],
    delay=90))

# ============================================================================
# 06 — CP-072 : construire un diagramme en barres (diagrammes en barres, 1)
# ============================================================================

FRUITS = ['Pomme', 'Banane', 'Fraise']
SPORTS = ['Football', 'Danse', 'Judo', 'Natation']


def tableau(entete, noms, vs_):
    t = '| ' + entete + ' | Nombre d\'élèves |\n|---|---|\n'
    return t + ''.join('| ' + n + ' | $' + v + '$ |\n' for n, v in zip(noms, vs_))


def barres(titre, axes, noms, valeurs, placer):
    lignes = ['```barres', 'titre: ' + titre, 'axes: ' + axes]
    lignes += [f'{n} = {v}' for n, v in zip(noms, valeurs)]
    lignes += ['axe: 0 à 10', 'placer: ' + placer]
    return '\n'.join(lignes) + '\n```'


def differents(noms):
    return ['(' + a + '-' + b + ')*(' + a + '-' + b + ') > 0'
            for x, a in enumerate(noms) for b in noms[x + 1:]]


v1 = variation(
    'Les élèves de la classe ont choisi leur fruit préféré.\n\n'
    + tableau('Fruit', FRUITS, ['{{a}}', '{{b}}', '{{c}}'])
    + '\nConstruis le diagramme en barres.\n\n'
    + barres('Fruit préféré', 'Fruit ; Élèves', FRUITS, ['{{a}}', '{{b}}', '{{c}}'], 'toutes'),
    [var(x, '1..10') for x in ['a', 'b', 'c']],
    [],
    ['Une barre par fruit, aussi haute que son nombre d\'élèves. L\'axe est gradué de un en un.',
     'Pomme : ${{a}}$ ; banane : ${{b}}$ ; fraise : ${{c}}$.'],
    differents(['a', 'b', 'c']))

v2 = variation(
    'Les élèves de la classe ont choisi leur sport préféré.\n\n'
    + tableau('Sport', SPORTS, ['{{a}}', '{{b}}', '{{c}}', '{{d}}'])
    + '\nDeux barres sont déjà tracées. Construis les barres de la danse et de la natation.\n\n'
    + barres('Sport préféré', 'Sport ; Élèves', SPORTS, ['{{a}}', '{{b}}', '{{c}}', '{{d}}'],
             'Danse ; Natation'),
    [var(x, '1..10') for x in ['a', 'b', 'c', 'd']],
    [],
    ['L\'axe est gradué de un en un.',
     'La barre de la danse monte jusqu\'au trait ${{b}}$, celle de la natation jusqu\'au trait'
     ' ${{d}}$.'],
    ['b != d'])

vs = [v1, v2]
ecrire('06-construis-le-diagramme', modele(
    'Construis le diagramme en barres',
    'Monter les barres d\'après un petit tableau, axe de 0 à 10 gradué de un en un : toutes les'
    ' barres (3 fruits) ; deux barres sur quatre (sports)',
    1, vs,
    [spec('Pomme 6, banane 4, fraise 8', 0, vs, {'a': 6, 'b': 4, 'c': 8}, ['6', '4', '8'],
          'correct'),
     spec('Erreur : la fraise un trait trop haut', 0, vs, {'a': 6, 'b': 4, 'c': 8},
          ['6', '4', '9'], 'incorrect'),
     spec('Erreur : banane et fraise inversées', 0, vs, {'a': 6, 'b': 4, 'c': 8}, ['6', '8', '4'],
          'incorrect'),
     spec('Danse 3, natation 9', 1, vs, {'a': 7, 'b': 3, 'c': 5, 'd': 9}, ['3', '9'], 'correct'),
     spec('Erreur : la barre du judo à la place de la danse', 1, vs,
          {'a': 7, 'b': 3, 'c': 5, 'd': 9}, ['5', '9'], 'incorrect')],
    delay=120))

# ============================================================================

os.makedirs(DOSSIER, exist_ok=True)
for nom, mod in MODELES.items():
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as fichier:
        json.dump(mod, fichier, ensure_ascii=False, indent='\t')
        fichier.write('\n')
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
