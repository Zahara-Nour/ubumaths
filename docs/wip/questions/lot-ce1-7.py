"""Lot 7 du CE1 : données (diagrammes en barres, tableaux) — 6 modèles.

Décisions de David (2026-11-01, journal questions-ce1 § 14, « tes recos ? » puis « go ») :
1. 081 : tableau déjà tracé, l'élève remplit la colonne des effectifs (pas de tableau à tracer).
2. Axe gradué de un en un : 20 au plus par barre, total de moins de 100.
3. Tableau à double entrée : cases jusqu'à 60 d'abord, puis le tableau du BO (total ~ 300).
4. Catégorie neuve « Représenter des données · Diagrammes en barres · 1 à 3 » ; les tableaux
   continuent le CP (« Tableaux · 2 », « Tableau à double entrée · 3, 4 »).

Valeur choisie par un indice (`k` de 0 à n − 1) : polynôme de Lagrange en `{{eval:}}`, jamais un
`{{if:}}` qui contiendrait un `{{eval:}}` (non résolu, piège du lot 6). Série brute : chaque
réponse `s1…sN` vaut 1 à n, l'effectif d'une valeur est la somme de ses indicatrices (CP-068).
Barres à monter : pas d'`expectedAnswer` (le bloc la calcule). Jamais de variable `e` ni `i`.

    python3 docs/wip/questions/lot-ce1-7.py scripts/questions/ce1-7
"""
import json
import sys
from fractions import Fraction

DOSSIER = sys.argv[1]

# ---- Gabarits ----


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(x) for k, x in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(title, description, subdomain, level, variations, specs, delay=120):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (sous-notion du point) est posé par la migration
    return {'title': title, 'description': description, 'grades': ['CE1'],
            'theme': 'Statistiques', 'domain': 'Représenter des données',
            'subdomain': subdomain, 'level': level, 'delay': delay, 'status': 'draft',
            'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, reponses, variables, etapes, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [r if isinstance(r, dict) else {'expectedAnswer': r} for r in reponses]
    v['correction'] = {'steps': etapes}
    return v


def choix(lignes):
    return '\n\n```choix\nmelanger: non\n' + ''.join('- ' + c + '\n' for c in lignes) + '```'


def ev(x):
    return '{{eval:' + x + '}}'


def lagrange(k, valeurs, debut=0):
    """Expression qui vaut `valeurs[j]` quand `k` vaut `debut + j` (entiers)."""
    n = len(valeurs)
    termes = []
    for j, v in enumerate(valeurs):
        num = '*'.join(f'({k}-{debut + m})' for m in range(n) if m != j)
        den = 1
        for m in range(n):
            if m != j:
                den *= (j - m)
        termes.append(f'({v})' + ('*' + num if num else '') + f'/({den})')
    return '(' + '+'.join(termes) + ')'


def lagrange_py(kv, valeurs, debut=0):
    n = len(valeurs)
    total = Fraction(0)
    for j, v in enumerate(valeurs):
        t = Fraction(v)
        for m in range(n):
            if m != j:
                t *= Fraction(kv - (debut + m), j - m)
        total += t
    return int(total)


def selon(k, textes, debut=0, j=0):
    """Texte choisi par l'indice `k` (`debut` à `debut` + n − 1) : `{{if:k==0|…|{{if:k==1|…|…}}}}`."""
    if j == len(textes) - 1:
        return textes[j]
    return ('{{if:' + k + '==' + str(debut + j) + '|' + textes[j] + '|'
            + selon(k, textes, debut, j + 1) + '}}')


def compte(s_vars, valeur, n):
    """Nombre de réponses égales à `valeur` (1 à n) parmi `s_vars` (indicatrices de Lagrange)."""
    autres = [m for m in range(1, n + 1) if m != valeur]
    den = 1
    for m in autres:
        den *= (valeur - m)
    return '+'.join('*'.join(f'({s}-{m})' for m in autres) + f'/({den})' for s in s_vars)


def barres(titre, axes, noms, valeurs, axe, extra=''):
    lignes = ['```barres', 'titre: ' + titre, 'axes: ' + axes]
    lignes += [f'{n} = {v}' for n, v in zip(noms, valeurs)]
    lignes.append('axe: ' + axe)
    if extra:
        lignes.append(extra)
    return '\n\n' + '\n'.join(lignes) + '\n```'


def croise(lignes_noms, colonnes, valeurs, extra=()):
    """`valeurs[r]` : liste des expressions de la ligne r."""
    b = ['```tableau-croise', 'lignes: ' + ' ; '.join(lignes_noms),
         'colonnes: ' + ' ; '.join(colonnes)]
    b += [n + ' = ' + ' ; '.join(vs) for n, vs in zip(lignes_noms, valeurs)]
    b += list(extra)
    return '\n\n' + '\n'.join(b) + '\n```'


def tous_differents(noms):
    return ['(' + a + '-' + b + ')*(' + a + '-' + b + ') > 0'
            for x, a in enumerate(noms) for b in noms[x + 1:]]


def plus_grand(noms):
    """Indice (0…) du plus grand, valeurs toutes différentes."""
    def rang(j):
        return ' && '.join(noms[j] + '>' + noms[m] for m in range(len(noms)) if m != j)
    corps = str(len(noms) - 1)
    for j in range(len(noms) - 2, -1, -1):
        corps = '{{if:' + rang(j) + '|' + str(j) + '|' + corps + '}}'
    return corps


def plus_petit(noms):
    def rang(j):
        return ' && '.join(noms[j] + '<' + noms[m] for m in range(len(noms)) if m != j)
    corps = str(len(noms) - 1)
    for j in range(len(noms) - 2, -1, -1):
        corps = '{{if:' + rang(j) + '|' + str(j) + '|' + corps + '}}'
    return corps


def f(x):
    return '${{' + x + '}}$'


PRENOMS = ['Léa', 'Tom', 'Inès', 'Noah', 'Jade', 'Adam', 'Lina', 'Hugo', 'Zoé', 'Rayan', 'Emma',
           'Sacha', 'Mila', 'Nolan', 'Chloé', 'Malo', 'Louna', 'Yanis', 'Rose', 'Ilyes']

# ---- Contextes ----

SPORTS = ['Football', 'Danse', 'Judo', 'Natation']
SPORTS_LE = ['le football', 'la danse', 'le judo', 'la natation']
FRUITS = ['Pomme', 'Banane', 'Fraise', 'Orange']
FRUITS_LA = ['la pomme', 'la banane', 'la fraise', 'l\'orange']
ANIMAUX = ['Chat', 'Chien', 'Lapin', 'Poisson', 'Cheval']
ANIMAUX_LE = ['le chat', 'le chien', 'le lapin', 'le poisson', 'le cheval']
COULEURS = ['Rouge', 'Bleu', 'Vert', 'Jaune']
COULEURS_LE = ['le rouge', 'le bleu', 'le vert', 'le jaune']

V4 = ['a', 'b', 'c', 'd']
V5 = ['a', 'b', 'c', 'd', 'g']

# ---- 1. Lire un diagramme en barres (CE1-082) ----

LIRE_PAS = 'L\'axe est gradué de un en un : chaque trait compte pour $1$ élève.'


def lire(titre, axes, noms, articles, vs, maxi, question):
    n = len(noms)
    return variation(
        'Voici le diagramme en barres « ' + titre + ' ».'
        + barres(titre, axes, noms, ['{{' + x + '}}' for x in vs], f'0 à {maxi}')
        + '\n\n' + question + ' ' + selon('k', articles) + ' ?\n\n$?$ élèves',
        ['{{n}}'],
        [var(x, f'2..{maxi}') for x in vs] + [var('k', f'0..{n - 1}'),
                                              var('n', 'eval:' + lagrange('k', vs))],
        ['On cherche la barre ' + selon('k', ['« ' + x + ' »' for x in noms]) + '.',
         LIRE_PAS,
         'Le haut de la barre arrive au trait $' + ev(lagrange('k', vs)) + '$ : $'
         + ev(lagrange('k', vs)) + '$ élèves ont choisi ' + selon('k', articles) + '.'])


LIRE_SPORTS = lire('Sport préféré', 'Sport ; Élèves', SPORTS[:3], SPORTS_LE[:3], V4[:3], 12,
                   'Combien d\'élèves ont choisi')
LIRE_FRUITS = lire('Fruit préféré', 'Fruit ; Élèves', FRUITS, FRUITS_LA, V4, 15,
                   'Combien d\'élèves ont choisi')
LIRE_ANIMAUX = lire('Animal préféré', 'Animal ; Élèves', ANIMAUX, ANIMAUX_LE, V5, 20,
                    'Combien d\'élèves ont choisi')
LIRE_ANIMAUX['conditions'] = ['a+b+c+d+g < 100']


def vals(noms, nombres, k):
    d = dict(zip(noms, nombres))
    d['k'] = k
    d['n'] = nombres[k]
    return d


SPECS_LIRE = [
    spec('BO : le football, 8 élèves', 0, vals(V4[:3], [8, 5, 11], 0), '8', 'correct'),
    spec('Erreur : trait voisin (9)', 0, vals(V4[:3], [8, 5, 11], 0), '9', 'incorrect'),
    spec('Erreur : barre voisine (la danse, 5)', 0, vals(V4[:3], [8, 5, 11], 0), '5',
         'incorrect'),
    spec('Le judo, 11 élèves', 0, vals(V4[:3], [8, 5, 11], 2), '11', 'correct'),
    spec('La fraise, 14 élèves', 1, vals(V4, [3, 9, 14, 6], 2), '14', 'correct'),
    spec('Erreur : la plus haute barre (14) plutôt que la banane', 1, vals(V4, [3, 9, 14, 6], 1),
         '14', 'incorrect'),
    spec('L\'orange, 6 élèves', 1, vals(V4, [3, 9, 14, 6], 3), '6', 'correct'),
    spec('Le cheval, 17 élèves', 2, vals(V5, [12, 7, 4, 9, 17], 4), '17', 'correct'),
    spec('Erreur : 16 (un trait de moins)', 2, vals(V5, [12, 7, 4, 9, 17], 4), '16',
         'incorrect'),
    spec('Le chat, 12 élèves', 2, vals(V5, [12, 7, 4, 9, 17], 0), '12', 'correct'),
]

# ---- 2. Interpréter un diagramme en barres (CE1-106) ----

PLUS_CHOISI = variation(
    'Voici le diagramme en barres « Sport préféré ».'
    + barres('Sport préféré', 'Sport ; Élèves', SPORTS, ['{{' + x + '}}' for x in V4], '0 à 15')
    + '\n\nQuel sport est le plus choisi ?' + choix(SPORTS),
    ['{{r}}'],
    [var(x, '2..15') for x in V4] + [var('r', plus_grand(V4))],
    ['On cherche la barre la plus haute.',
     'Le sport le plus choisi est ' + selon('r', SPORTS_LE) + ' : $'
     + ev(lagrange('r', V4)) + '$ élèves.'],
    tous_differents(V4))

MOINS_CHOISI = variation(
    'Voici le diagramme en barres « Fruit préféré ».'
    + barres('Fruit préféré', 'Fruit ; Élèves', FRUITS, ['{{' + x + '}}' for x in V4], '0 à 15')
    + '\n\nQuel fruit est le moins choisi ?' + choix(FRUITS),
    ['{{r}}'],
    [var(x, '2..15') for x in V4] + [var('r', plus_petit(V4))],
    ['On cherche la barre la moins haute.',
     'Le fruit le moins choisi est ' + selon('r', FRUITS_LA) + ' : $'
     + ev(lagrange('r', V4)) + '$ élèves.'],
    tous_differents(V4))

COMBIEN_DE_PLUS = variation(
    'Voici le diagramme en barres « Animal préféré ».'
    + barres('Animal préféré', 'Animal ; Élèves', ANIMAUX[:3], ['{{a}}', '{{b}}', '{{c}}'],
             '0 à 20')
    + '\n\nCombien d\'élèves de plus ont choisi le chat plutôt que le lapin ?\n\n$?$ élèves de plus',
    ['{{eval:a-c}}'],
    [var('a', '5..20'), var('b', '2..20'), var('c', '2..15')],
    ['On lit les deux barres : ${{a}}$ élèves pour le chat, ${{c}}$ pour le lapin.',
     'On calcule l\'écart : ${{a}} - {{c}} = ' + ev('a-c') + '$.',
     '$' + ev('a-c') + '$ élèves de plus ont choisi le chat.'],
    ['a-c >= 2'])

EN_TOUT = variation(
    'Voici le diagramme en barres « Couleur préférée ».'
    + barres('Couleur préférée', 'Couleur ; Élèves', COULEURS, ['{{' + x + '}}' for x in V4],
             '0 à 20')
    + '\n\nCombien d\'élèves ont répondu en tout ?\n\n$?$ élèves',
    ['{{eval:a+b+c+d}}'],
    [var(x, '2..20') for x in V4],
    ['On lit chaque barre : ${{a}}$, ${{b}}$, ${{c}}$ et ${{d}}$.',
     'On additionne : ${{a}} + {{b}} + {{c}} + {{d}} = ' + ev('a+b+c+d') + '$.',
     '$' + ev('a+b+c+d') + '$ élèves ont répondu.'])

SPECS_INTERPRETER = [
    spec('BO : le football, le plus choisi', 0, {'a': 12, 'b': 7, 'c': 4, 'd': 9, 'r': 0}, '0',
         'correct'),
    spec('Erreur : la natation (le dernier)', 0, {'a': 12, 'b': 7, 'c': 4, 'd': 9, 'r': 0}, '3',
         'incorrect'),
    spec('Erreur : le judo (le moins choisi)', 0, {'a': 12, 'b': 7, 'c': 4, 'd': 9, 'r': 0}, '2',
         'incorrect'),
    spec('La natation, le plus choisi', 0, {'a': 5, 'b': 7, 'c': 4, 'd': 13, 'r': 3}, '3',
         'correct'),
    spec('La banane, le moins choisi', 1, {'a': 8, 'b': 3, 'c': 11, 'd': 6, 'r': 1}, '1',
         'correct'),
    spec('Erreur : la fraise (le plus choisi)', 1, {'a': 8, 'b': 3, 'c': 11, 'd': 6, 'r': 1}, '2',
         'incorrect'),
    spec('Chat 14, lapin 6 : 8 de plus', 2, {'a': 14, 'b': 9, 'c': 6}, '8', 'correct'),
    spec('Erreur : 14 (le chat seul)', 2, {'a': 14, 'b': 9, 'c': 6}, '14', 'incorrect'),
    spec('Erreur : 20 (la somme)', 2, {'a': 14, 'b': 9, 'c': 6}, '20', 'incorrect'),
    spec('En tout : 12 + 7 + 15 + 9 = 43', 3, {'a': 12, 'b': 7, 'c': 15, 'd': 9}, '43', 'correct'),
    spec('Erreur : une barre oubliée (34)', 3, {'a': 12, 'b': 7, 'c': 15, 'd': 9}, '34',
         'incorrect'),
    spec('Erreur : le nombre de barres (4)', 3, {'a': 12, 'b': 7, 'c': 15, 'd': 9}, '4',
         'incorrect'),
]

# ---- 3. Construire un diagramme en barres (CE1-088) ----


def tableau_effectifs(entete, noms, vs):
    t = '| ' + entete + ' | Nombre d\'élèves |\n|---|---|\n'
    return t + ''.join('| ' + n + ' | $' + v + '$ |\n' for n, v in zip(noms, vs))


DEUX_BARRES = variation(
    'Les élèves de la classe ont choisi leur sport préféré.\n\n'
    + tableau_effectifs('Sport', SPORTS, ['{{' + x + '}}' for x in V4])
    + '\nConstruis les barres de la danse et du judo.'
    + barres('Sport préféré', 'Sport ; Élèves', SPORTS, ['{{' + x + '}}' for x in V4], '0 à 15',
             'placer: Danse ; Judo'),
    [],
    [var(x, '1..15') for x in V4],
    ['L\'axe est gradué de un en un.',
     'La barre de la danse monte jusqu\'au trait ${{b}}$, celle du judo jusqu\'au trait ${{c}}$.'],
    ['b != c'])

TOUTES = variation(
    'Les élèves de la classe ont choisi leur fruit préféré.\n\n'
    + tableau_effectifs('Fruit', FRUITS[:3], ['{{a}}', '{{b}}', '{{c}}'])
    + '\nConstruis le diagramme en barres.'
    + barres('Fruit préféré', 'Fruit ; Élèves', FRUITS[:3], ['{{a}}', '{{b}}', '{{c}}'],
             '0 à 12', 'placer: toutes'),
    [],
    [var(x, '1..12') for x in ['a', 'b', 'c']],
    ['Une barre par fruit, aussi haute que son nombre d\'élèves.',
     'Pomme : ${{a}}$ ; banane : ${{b}}$ ; fraise : ${{c}}$.'],
    tous_differents(['a', 'b', 'c']))

S12 = [f's{j}' for j in range(1, 13)]
LISTE12 = ' · '.join(PRENOMS[j] + ' : ' + '{{if:' + s + '==1|chat|{{if:' + s
                     + '==2|chien|lapin}}}}' for j, s in enumerate(S12))
COMPTER_PUIS = variation(
    'On a demandé à $12$ élèves leur animal préféré.\n\n' + LISTE12
    + '\n\nCompte, puis construis le diagramme en barres.'
    + barres('Animal préféré', 'Animal ; Élèves', ANIMAUX[:3], ['{{na}}', '{{nb}}', '{{nc}}'],
             '0 à 12', 'placer: toutes'),
    [],
    [var(s, '1..3') for s in S12]
    + [var('na', 'eval:' + compte(S12, 1, 3)), var('nb', 'eval:' + compte(S12, 2, 3)),
       var('nc', 'eval:' + compte(S12, 3, 3))],
    ['On compte chaque animal : chat ${{na}}$ ; chien ${{nb}}$ ; lapin ${{nc}}$.',
     'On vérifie : ${{na}} + {{nb}} + {{nc}} = 12$.',
     'Chaque barre monte jusqu\'à son nombre.'],
    ['na >= 1', 'nb >= 1', 'nc >= 1'])


def serie(valeurs):
    """Variables d'une série de 12 réponses, et ses effectifs."""
    d = {s: v for s, v in zip(S12, valeurs)}
    d['na'] = valeurs.count(1)
    d['nb'] = valeurs.count(2)
    d['nc'] = valeurs.count(3)
    return d


SERIE = [1, 2, 1, 3, 1, 2, 1, 3, 2, 1, 2, 1]  # 6 chats, 4 chiens, 2 lapins

SPECS_CONSTRUIRE = [
    spec('Danse 7, judo 11', 0, {'a': 9, 'b': 7, 'c': 11, 'd': 4}, ['7', '11'], 'correct'),
    spec('Erreur : barres inversées', 0, {'a': 9, 'b': 7, 'c': 11, 'd': 4}, ['11', '7'],
         'incorrect'),
    spec('Erreur : un trait de trop', 0, {'a': 9, 'b': 7, 'c': 11, 'd': 4}, ['8', '11'],
         'incorrect'),
    spec('Pomme 5, banane 9, fraise 3', 1, {'a': 5, 'b': 9, 'c': 3}, ['5', '9', '3'], 'correct'),
    spec('Erreur : la fraise un trait trop bas', 1, {'a': 5, 'b': 9, 'c': 3}, ['5', '9', '2'],
         'incorrect'),
    spec('Série : 6 chats, 4 chiens, 2 lapins', 2, serie(SERIE), ['6', '4', '2'], 'correct'),
    spec('Erreur : un chat oublié', 2, serie(SERIE), ['5', '4', '2'], 'incorrect'),
]

# ---- 4. Ranger des réponses dans un tableau (CE1-081) ----


def liste(s_vars, mots):
    return ' · '.join(PRENOMS[j] + ' : ' + selon(s, mots, 1) for j, s in enumerate(s_vars))


def ranger(nb, mots, noms, entete, question, total=False):
    n = len(noms)
    ss = [f's{j}' for j in range(1, nb + 1)]
    cs = [f'n{j}' for j in range(1, n + 1)]
    t = '| ' + entete + ' | Nombre d\'élèves |\n|---|---|\n' + ''.join(
        '| ' + x + ' | $?$ |\n' for x in noms)
    if total:
        t += '| **Total** | $?$ |\n'
    rep = ['{{' + c + '}}' for c in cs] + ([str(nb)] if total else [])
    etapes = ['On compte chaque réponse : '
              + ' ; '.join(mots[j] + ' ${{' + c + '}}$' for j, c in enumerate(cs)) + '.',
              'On vérifie : $' + ' + '.join('{{' + c + '}}' for c in cs) + ' = ' + str(nb)
              + '$, autant que d\'élèves.']
    if total:
        etapes.append('La ligne Total : les $' + str(nb) + '$ élèves.')
    return variation(
        question + '\n\n' + liste(ss, mots) + '\n\nCompte et complète le tableau.\n\n' + t,
        rep,
        [var(s, f'1..{n}') for s in ss]
        + [var(c, 'eval:' + compte(ss, j + 1, n)) for j, c in enumerate(cs)],
        etapes,
        [c + ' >= 1' for c in cs])


RANGER_3 = ranger(12, ['chat', 'chien', 'lapin'], ANIMAUX[:3], 'Animal',
                  'On a demandé à $12$ élèves leur animal préféré.')
RANGER_4 = ranger(16, ['pomme', 'banane', 'fraise', 'orange'], FRUITS, 'Fruit',
                  'On a demandé à $16$ élèves leur fruit préféré.', total=True)
RANGER_5 = ranger(20, ['rouge', 'bleu', 'vert', 'jaune', 'violet'],
                  ['Rouge', 'Bleu', 'Vert', 'Jaune', 'Violet'], 'Couleur',
                  'On a demandé à $20$ élèves leur couleur préférée.')


def serie_n(valeurs, n):
    d = {f's{j + 1}': v for j, v in enumerate(valeurs)}
    for c in range(1, n + 1):
        d[f'n{c}'] = valeurs.count(c)
    return d, [str(valeurs.count(c)) for c in range(1, n + 1)]


S3, R3 = serie_n([1, 2, 1, 3, 1, 2, 1, 3, 2, 1, 2, 1], 3)          # 6, 4, 2
S4, R4 = serie_n([1, 2, 3, 4, 1, 1, 2, 3, 1, 4, 2, 1, 3, 1, 2, 4], 4)  # 6, 4, 3, 3
S5, R5 = serie_n([1, 2, 3, 4, 5, 1, 2, 2, 3, 1, 5, 2, 4, 1, 2, 3, 5, 2, 1, 4], 5)  # 5, 6, 3, 3, 3

SPECS_RANGER = [
    spec('12 élèves : 6, 4, 2', 0, S3, R3, 'correct'),
    spec('Erreur : un chat oublié (5)', 0, S3, ['5', '4', '2'], 'incorrect'),
    spec('Erreur : chiens et lapins inversés', 0, S3, ['6', '2', '4'], 'incorrect'),
    spec('16 élèves, avec le total', 1, S4, R4 + ['16'], 'correct'),
    spec('Erreur : total = nombre de lignes (4)', 1, S4, R4 + ['4'], 'incorrect'),
    spec('20 élèves, 5 couleurs', 2, S5, R5, 'correct'),
    spec('Erreur : une réponse comptée deux fois', 2, S5, ['5', '7', '3', '3', '3'], 'incorrect'),
]

# ---- 5. Lire un tableau à double entrée (CE1-089) ----

JOURS = ['Lundi', 'Mardi', 'Jeudi', 'Vendredi']
JOURS_LE = ['le lundi', 'le mardi', 'le jeudi', 'le vendredi']
FJ = ['f1', 'f2', 'f3', 'f4']
GJ = ['g1', 'g2', 'g3', 'g4']
CANTINE = croise(['Filles', 'Garçons'], JOURS, [['{{' + x + '}}' for x in FJ],
                                                ['{{' + x + '}}' for x in GJ]],
                 ['coin: Élèves \\ Jour'])

CELLULE = '(1-q)*' + lagrange('j', FJ) + '+q*' + lagrange('j', GJ)
LIRE_CANTINE = variation(
    'Ce tableau donne le nombre d\'élèves qui mangent à la cantine, chaque jour.' + CANTINE
    + '\n\nCombien de ' + selon('q', ['filles', 'garçons']) + ' mangent à la cantine '
    + selon('j', JOURS_LE) + ' ?\n\n$?$ ' + selon('q', ['filles', 'garçons']),
    ['{{n}}'],
    [var(x, '5..60') for x in FJ + GJ] + [var('q', '0..1'), var('j', '0..3'),
                                          var('n', 'eval:' + CELLULE)],
    ['On prend la ligne des ' + selon('q', ['filles', 'garçons']) + ' et la colonne '
     + selon('j', ['du lundi', 'du mardi', 'du jeudi', 'du vendredi']) + '.',
     'La case où elles se croisent : $' + ev(CELLULE) + '$.'])

MODES = ['À pied', 'Vélo', 'Voiture', 'Bus']
MODES_DIT = ['à pied', 'à vélo', 'en voiture', 'en bus']
FM = ['f1', 'f2', 'f3', 'f4']
GM = ['g1', 'g2', 'g3', 'g4']
TRANSPORT = croise(MODES, ['Filles', 'Garçons'],
                   [['{{' + a + '}}', '{{' + b + '}}'] for a, b in zip(FM, GM)],
                   ['coin: Transport \\ Élèves', 'totaux: oui'])

CASE_TRANSPORT = '(1-q)*' + lagrange('j', FM) + '+q*' + lagrange('j', GM)
LIRE_TRANSPORT = variation(
    'Ce tableau donne la façon dont les élèves de l\'école viennent le matin.' + TRANSPORT
    + '\n\nCombien de ' + selon('q', ['filles', 'garçons']) + ' viennent '
    + selon('j', MODES_DIT) + ' ?\n\n$?$ ' + selon('q', ['filles', 'garçons']),
    ['{{n}}'],
    [var(x, '10..60') for x in FM + GM] + [var('q', '0..1'), var('j', '0..3'),
                                           var('n', 'eval:' + CASE_TRANSPORT)],
    ['On prend la ligne « ' + selon('j', MODES) + ' » et la colonne des '
     + selon('q', ['filles', 'garçons']) + '.',
     'La case où elles se croisent : $' + ev(CASE_TRANSPORT) + '$.'])

TOT_LIGNE = lagrange('j', [a + '+' + b for a, b in zip(FM, GM)])
TOT_COL = '(1-q)*(' + '+'.join(FM) + ')+q*(' + '+'.join(GM) + ')'
LIRE_TOTAL = variation(
    'Ce tableau donne la façon dont les élèves de l\'école viennent le matin.' + TRANSPORT
    + '\n\n' + selon('t', ['Combien d\'élèves viennent ' + selon('j', MODES_DIT) + ' ?',
                           'Combien de ' + selon('q', ['filles', 'garçons'])
                           + ' y a-t-il en tout ?'])
    + '\n\n$?$ ' + selon('t', ['élèves', selon('q', ['filles', 'garçons'])]),
    ['{{n}}'],
    [var(x, '10..90') for x in FM + GM]
    + [var('t', '0..1'), var('q', '0..1'), var('j', '0..3'),
       var('n', 'eval:(1-t)*' + TOT_LIGNE + '+t*(' + TOT_COL + ')')],
    [selon('t', ['On prend la ligne « ' + selon('j', MODES) + ' », jusqu\'à la colonne Total.',
                 'On prend la colonne des ' + selon('q', ['filles', 'garçons'])
                 + ', jusqu\'à la ligne Total.']),
     'Le total : $' + ev('(1-t)*' + TOT_LIGNE + '+t*(' + TOT_COL + ')') + '$.'])


def cantine(fs, gs, q, j):
    d = {x: v for x, v in zip(FJ + GJ, fs + gs)}
    d.update(q=q, j=j, n=(gs if q else fs)[j])
    return d


def transport(fs, gs, q, j, t=None):
    d = {x: v for x, v in zip(FM + GM, fs + gs)}
    d.update(q=q, j=j)
    if t is None:
        d['n'] = (gs if q else fs)[j]
    else:
        d['t'] = t
        d['n'] = fs[j] + gs[j] if t == 0 else sum(gs if q else fs)
    return d


CF, CG = [24, 31, 18, 27], [29, 22, 35, 20]
# BO : total 282
TF, TG = [38, 15, 47, 41], [42, 23, 36, 40]

SPECS_LIRE_TABLEAU = [
    spec('BO : les filles le mardi, 31', 0, cantine(CF, CG, 0, 1), '31', 'correct'),
    spec('Erreur : les garçons du mardi (22)', 0, cantine(CF, CG, 0, 1), '22', 'incorrect'),
    spec('Erreur : les filles du lundi (24)', 0, cantine(CF, CG, 0, 1), '24', 'incorrect'),
    spec('Les garçons le jeudi, 35', 0, cantine(CF, CG, 1, 2), '35', 'correct'),
    spec('Garçons à vélo, 23', 1, transport(TF, TG, 1, 1), '23', 'correct'),
    spec('Erreur : le total du vélo (38)', 1, transport(TF, TG, 1, 1), '38', 'incorrect'),
    spec('Filles en bus, 41', 1, transport(TF, TG, 0, 3), '41', 'correct'),
    spec('Total de la ligne voiture, 83', 2, transport(TF, TG, 0, 2, 0), '83', 'correct'),
    spec('Erreur : les filles en voiture (47)', 2, transport(TF, TG, 0, 2, 0), '47', 'incorrect'),
    spec('Total des garçons, 141', 2, transport(TF, TG, 1, 0, 1), '141', 'correct'),
    spec('Erreur : le total de l\'école (282)', 2, transport(TF, TG, 1, 0, 1), '282',
         'incorrect'),
]

# ---- 6. Interpréter un tableau à double entrée (CE1-107) ----

TJ = ['f1+g1', 'f2+g2', 'f3+g3', 'f4+g4']
TJ_NOMS = ['t1', 't2', 't3', 't4']
CANTINE_TOT = croise(['Filles', 'Garçons'], JOURS, [['{{' + x + '}}' for x in FJ],
                                                    ['{{' + x + '}}' for x in GJ]],
                     ['coin: Élèves \\ Jour', 'totaux: oui'])


def jour_max(avec_totaux):
    bloc = CANTINE_TOT if avec_totaux else CANTINE
    lire = ('On lit la ligne Total : ' if avec_totaux
            else 'On additionne filles et garçons, chaque jour : ')
    return variation(
        'Ce tableau donne le nombre d\'élèves qui mangent à la cantine, chaque jour.' + bloc
        + '\n\nQuel jour y a-t-il le plus d\'élèves à la cantine ?' + choix(JOURS),
        ['{{r}}'],
        [var(x, '5..60') for x in FJ + GJ]
        + [var(t, 'eval:' + s) for t, s in zip(TJ_NOMS, TJ)] + [var('r', plus_grand(TJ_NOMS))],
        [lire + ' ; '.join(j + ' ' + ('$' if avec_totaux else '${{' + f_ + '}} + {{' + g + '}} = ')
                           + '{{' + t + '}}$' for j, f_, g, t in zip(JOURS, FJ, GJ, TJ_NOMS))
         + '.',
         'Le plus grand total : ' + selon('r', JOURS_LE) + '.'],
        tous_differents(TJ_NOMS))


JOUR_MAX_TOTAUX = jour_max(True)
JOUR_MAX_SANS = jour_max(False)

CASE_CACHEE = variation(
    'Ce tableau donne la façon dont les élèves de l\'école viennent le matin. Une case est'
    ' cachée.'
    + croise(MODES, ['Filles', 'Garçons'],
             [['{{' + a + '}}', '{{' + b + '}}'] for a, b in zip(FM, GM)],
             ['coin: Transport \\ Élèves', 'totaux: oui', 'masquer: Vélo/Garçons'])
    + '\n\nCombien de garçons viennent à vélo ?\n\n$?$ garçons',
    ['{{g2}}'],
    [var(x, '10..60') for x in FM + GM],
    ['La ligne « Vélo » : ${{f2}}$ filles, et $' + ev('f2+g2') + '$ élèves en tout.',
     'Les garçons : $' + ev('f2+g2') + ' - {{f2}} = {{g2}}$.'])

DE_PLUS = variation(
    'Ce tableau donne le nombre d\'élèves qui mangent à la cantine, chaque jour.' + CANTINE
    + '\n\n' + selon('j', ['Le lundi', 'Le mardi', 'Le jeudi', 'Le vendredi']) + ', combien de garçons de plus que de filles mangent à la'
    ' cantine ?\n\n$?$ garçons de plus',
    ['{{n}}'],
    [var(x, '5..60') for x in FJ + GJ] + [var('j', '0..3'),
                                          var('n', 'eval:' + lagrange('j', GJ) + '-'
                                              + lagrange('j', FJ))],
    ['La colonne ' + selon('j', ['du lundi', 'du mardi', 'du jeudi', 'du vendredi']) + ' : $'
     + ev(lagrange('j', GJ)) + '$ garçons et $' + ev(lagrange('j', FJ)) + '$ filles.',
     'L\'écart : $' + ev(lagrange('j', GJ)) + ' - ' + ev(lagrange('j', FJ)) + ' = '
     + ev(lagrange('j', GJ) + '-' + lagrange('j', FJ)) + '$.'],
    ['n >= 2'])


def jours(fs, gs, extra):
    d = {x: v for x, v in zip(FJ + GJ, fs + gs)}
    for t, a, b in zip(TJ_NOMS, fs, gs):
        d[t] = a + b
    d.update(extra)
    return d


JF, JG = [24, 31, 18, 27], [29, 30, 30, 20]  # 53, 61, 48, 47 : le mardi

SPECS_INTERPRETER_TABLEAU = [
    spec('Avec les totaux : le mardi (61)', 0, jours(JF, JG, {'r': 1}), '1', 'correct'),
    spec('Erreur : le jeudi (la plus grande case, 30 garçons)', 0, jours(JF, JG, {'r': 1}),
         '2', 'incorrect'),
    spec('Sans les totaux : le mardi', 1, jours(JF, JG, {'r': 1}), '1', 'correct'),
    spec('Erreur sans totaux : le lundi (la première colonne)', 1,
         jours(JF, JG, {'r': 1}), '0', 'incorrect'),
    spec('Case cachée : 38 − 15 = 23', 2,
         {x: v for x, v in zip(FM + GM, [38, 15, 47, 41, 42, 23, 36, 40])}, '23', 'correct'),
    spec('Erreur : le total de la ligne (38)', 2,
         {x: v for x, v in zip(FM + GM, [38, 15, 47, 41, 42, 23, 36, 40])}, '38', 'incorrect'),
    spec('Erreur : les filles à vélo (15)', 2,
         {x: v for x, v in zip(FM + GM, [38, 15, 47, 41, 42, 23, 36, 40])}, '15', 'incorrect'),
    spec('Le jeudi : 30 − 18 = 12', 3,
         {**{x: v for x, v in zip(FJ + GJ, JF + JG)}, 'j': 2, 'n': 12}, '12', 'correct'),
    spec('Erreur : les garçons du jeudi (30)', 3,
         {**{x: v for x, v in zip(FJ + GJ, JF + JG)}, 'j': 2, 'n': 12}, '30', 'incorrect'),
]

MODELES = {
    '01-lire-un-diagramme-en-barres': modele(
        'Lis le diagramme en barres',
        'Lire l\'effectif d\'une barre, axe gradué de un en un : 3, 4 puis 5 barres (sports, fruits,'
        ' animaux), 20 au plus par barre', 'Diagrammes en barres', 1,
        [LIRE_SPORTS, LIRE_FRUITS, LIRE_ANIMAUX], SPECS_LIRE, delay=90),
    '02-interpreter-un-diagramme': modele(
        'Que dit le diagramme en barres ?',
        'Le plus choisi, le moins choisi (case choix), combien de plus, combien en tout',
        'Diagrammes en barres', 2, [PLUS_CHOISI, MOINS_CHOISI, COMBIEN_DE_PLUS, EN_TOUT],
        SPECS_INTERPRETER),
    '03-construire-un-diagramme': modele(
        'Construis le diagramme en barres',
        'Monter deux barres d\'après un tableau, puis toutes les barres ; compter une liste de 12'
        ' réponses puis construire', 'Diagrammes en barres', 3, [DEUX_BARRES, TOUTES, COMPTER_PUIS],
        SPECS_CONSTRUIRE, delay=180),
    '04-ranger-dans-un-tableau': modele(
        'Range les réponses dans un tableau',
        'Compter une liste de réponses (12, 16, 20 élèves ; 3 à 5 valeurs) et remplir la colonne'
        ' des effectifs, avec une ligne Total', 'Tableaux', 2, [RANGER_3, RANGER_4, RANGER_5],
        SPECS_RANGER, delay=180),
    '05-lire-un-tableau-double-entree': modele(
        'Lis le tableau à double entrée',
        'Filles et garçons à la cantine, jour par jour ; modes de transport avec totaux (BO,'
        ' total 282) : une case, puis un total', 'Tableau à double entrée', 3,
        [LIRE_CANTINE, LIRE_TRANSPORT, LIRE_TOTAL], SPECS_LIRE_TABLEAU),
    '06-interpreter-un-tableau': modele(
        'Que dit le tableau à double entrée ?',
        'Le jour où la cantine a le plus d\'élèves (avec, puis sans totaux) ; une case cachée'
        ' retrouvée par le total ; combien de garçons de plus', 'Tableau à double entrée', 4,
        [JOUR_MAX_TOTAUX, JOUR_MAX_SANS, CASE_CACHEE, DE_PLUS], SPECS_INTERPRETER_TABLEAU,
        delay=150),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as fichier:
        json.dump(m, fichier, ensure_ascii=False, indent='\t')
        fichier.write('\n')
print(len(MODELES), 'modèles écrits')
