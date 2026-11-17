"""Écrit les 8 modèles du lot 7c du CE2 (statistiques) dans scripts/questions/ce2-7c/.

Phase 0 validée par David le 2026-11-05 (§ 13 du journal `docs/wip/questions-ce2-progress.md`,
« je suis tes recos ») : 082 pris dans ce lot (barres à monter et `axe: à choisir` en prod) ;
niveaux partagés (diagrammes en barres 4 à 6 avec la 5e ; 076 aux niveaux 1 et 2 du nœud
« Représenter des données », avec la 2de). Bornes `cycle2.json` : CE2-074 (caractères qualitatifs ou
quantitatifs discrets : frères et sœurs, âge), CE2-076 (tableau à double entrée avec totaux ; barre
complétée à partir d'un effectif total, 175 élèves), CE2-082 (échelle de l'axe adaptée aux données).

Le CE1 (lot `ce1-7`, gabarit de ce script) a déjà la cantine et le sport préféré, axe de un en un,
cases jusqu'à 60 : le CE2 monte les nombres (jusqu'à 200), passe à trois lignes, gradue l'axe de
2 en 2, de 5 en 5, de 10 en 10, et fait compléter les totaux.

Valeur choisie par un indice : polynôme de Lagrange en `{{eval:}}`, jamais un `{{if:}}` qui
contiendrait un `{{eval:}}`. Barres à monter : pas d'`expectedAnswer` (le bloc la calcule ; avec
`axe: à choisir`, la première case est l'échelle). Jamais de variable `e` ni `i`.

    python3 docs/wip/questions/lot-ce2-7c.py scripts/questions/ce2-7c
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


def modele(title, description, level, variations, specs, delay=120):
    # ni theme, ni domain, ni subdomain (ADR 0035) : le rangement est posé par la migration
    return {'title': title, 'description': description, 'grades': ['CE2'], 'level': level,
            'delay': delay, 'status': 'draft', 'variations': variations, 'testSpecs': specs}


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


def selon(k, textes, debut=0, j=0):
    """Texte choisi par l'indice `k` : `{{if:k==0|…|{{if:k==1|…|…}}}}`."""
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
    b = ['```tableau-croise', 'lignes: ' + ' ; '.join(lignes_noms),
         'colonnes: ' + ' ; '.join(colonnes)]
    b += [n + ' = ' + ' ; '.join(vs) for n, vs in zip(lignes_noms, valeurs)]
    b += list(extra)
    return '\n\n' + '\n'.join(b) + '\n```'


def tous_differents(noms):
    return ['(' + a + '-' + b + ')*(' + a + '-' + b + ') > 0'
            for x, a in enumerate(noms) for b in noms[x + 1:]]


def rang_extreme(noms, signe):
    """Indice (0…) du plus grand (`>`) ou du plus petit (`<`), valeurs toutes différentes."""
    def rang(j):
        return ' && '.join(noms[j] + signe + noms[m] for m in range(len(noms)) if m != j)
    corps = str(len(noms) - 1)
    for j in range(len(noms) - 2, -1, -1):
        corps = '{{if:' + rang(j) + '|' + str(j) + '|' + corps + '}}'
    return corps


def accolades(noms):
    return ['{{' + x + '}}' for x in noms]


PRENOMS = ['Léa', 'Tom', 'Inès', 'Noah', 'Jade', 'Adam', 'Lina', 'Hugo', 'Zoé', 'Rayan', 'Emma',
           'Sacha', 'Mila', 'Nolan', 'Chloé', 'Malo', 'Louna', 'Yanis', 'Rose', 'Ilyes', 'Nina',
           'Elio', 'Maëlle', 'Ayoub']

# ---- 1. Ranger des données dans un tableau (CE2-074) ----


def ranger(nb, valeurs, dits, entete, colonne, question, total=False):
    """Liste de `nb` réponses (valeurs `dits`), tableau des effectifs à compléter en `$?$`."""
    n = len(valeurs)
    ss = [f's{j}' for j in range(1, nb + 1)]
    cs = [f'n{j}' for j in range(1, n + 1)]
    liste = ' · '.join(PRENOMS[j] + ' : ' + selon(s, dits, 1) for j, s in enumerate(ss))
    t = '| ' + entete + ' | ' + colonne + ' |\n|---|---|\n' + ''.join(
        '| ' + x + ' | $?$ |\n' for x in valeurs)
    if total:
        t += '| **Total** | $?$ |\n'
    rep = accolades(cs) + ([str(nb)] if total else [])
    etapes = ['On compte chaque réponse : '
              + ' ; '.join(valeurs[j] + ' : ${{' + c + '}}$' for j, c in enumerate(cs)) + '.',
              'On vérifie : $' + ' + '.join(accolades(cs)) + ' = ' + str(nb)
              + '$, autant que d\'élèves.']
    if total:
        etapes.append('La ligne Total : les $' + str(nb) + '$ élèves.')
    return variation(
        question + '\n\n' + liste + '\n\nCompte et complète le tableau.\n\n' + t,
        rep,
        [var(s, f'1..{n}') for s in ss]
        + [var(c, 'eval:' + compte(ss, j + 1, n)) for j, c in enumerate(cs)],
        etapes,
        [c + ' >= 1' for c in cs])


FRERES = ranger(20, ['0', '1', '2', '3'], ['$0$', '$1$', '$2$', '$3$'],
                'Nombre de frères et sœurs', 'Nombre d\'élèves',
                'On a demandé à $20$ élèves combien ils ont de frères et sœurs.')
AGES = ranger(24, ['8 ans', '9 ans', '10 ans'], ['$8$ ans', '$9$ ans', '$10$ ans'], 'Âge',
              'Nombre d\'élèves', 'Voici l\'âge des $24$ élèves de la classe.', total=True)
POINTURES = ranger(22, ['31', '32', '33', '34', '35'], ['$31$', '$32$', '$33$', '$34$', '$35$'],
                   'Pointure', 'Nombre d\'élèves',
                   'On a relevé la pointure de $22$ élèves.', total=True)


def serie_n(valeurs, n):
    d = {f's{j + 1}': v for j, v in enumerate(valeurs)}
    for c in range(1, n + 1):
        d[f'n{c}'] = valeurs.count(c)
    return d, [str(valeurs.count(c)) for c in range(1, n + 1)]


SF, RF = serie_n([2, 1, 3, 2, 2, 1, 4, 2, 1, 3, 2, 1, 2, 3, 1, 2, 4, 1, 2, 3], 4)  # 6, 8, 4, 2
SA, RA = serie_n([1, 2, 2, 3, 1, 2, 2, 1, 3, 2, 2, 1, 2, 3, 2, 1, 2, 2, 1, 3, 2, 2, 1, 2],
                 3)  # 7, 13, 4
SP, RP = serie_n([1, 2, 3, 3, 4, 2, 3, 5, 3, 2, 4, 3, 1, 3, 2, 4, 5, 3, 2, 3, 4, 3], 5)  # 2,5,9,4,2

SPECS_RANGER = [
    spec('20 élèves : 6, 8, 4, 2', 0, SF, RF, 'correct'),
    spec('Erreur : un « 1 » compté comme « 0 »', 0, SF, ['7', '7', '4', '2'], 'incorrect'),
    spec('Erreur : effectifs pris pour les valeurs (0, 1, 2, 3)', 0, SF, ['0', '1', '2', '3'],
         'incorrect'),
    spec('24 élèves : 7, 13, 4, total 24', 1, SA, RA + ['24'], 'correct'),
    spec('Erreur : total = nombre de lignes (3)', 1, SA, RA + ['3'], 'incorrect'),
    spec('Erreur : un 9 ans oublié', 1, SA, ['7', '12', '4', '24'], 'incorrect'),
    spec('22 pointures : 2, 5, 9, 4, 2, total 22', 2, SP, RP + ['22'], 'correct'),
    spec('Erreur : 33 et 34 inversés', 2, SP, ['2', '5', '4', '9', '2', '22'], 'incorrect'),
]

# ---- 2. Lire un tableau à double entrée (CE2-075) ----

JOURS = ['Lundi', 'Mardi', 'Jeudi', 'Vendredi']
JOURS_LE = ['le lundi', 'le mardi', 'le jeudi', 'le vendredi']
JOURS_DU = ['du lundi', 'du mardi', 'du jeudi', 'du vendredi']
GENS = ['Filles', 'Garçons', 'Adultes']
GENS_DIT = ['filles', 'garçons', 'adultes']
FJ, GJ, AJ = ['f1', 'f2', 'f3', 'f4'], ['g1', 'g2', 'g3', 'g4'], ['a1', 'a2', 'a3', 'a4']
CANTINE = croise(GENS, JOURS, [accolades(FJ), accolades(GJ), accolades(AJ)],
                 ['coin: Personnes \\ Jour'])
CANTINE_VARS = ([var(x, '40..150') for x in FJ + GJ] + [var(x, '5..20') for x in AJ])

CASE_CANTINE = lagrange('q', [lagrange('j', FJ), lagrange('j', GJ), lagrange('j', AJ)])
LIRE_CANTINE = variation(
    'Ce tableau donne le nombre de personnes qui mangent à la cantine, chaque jour.' + CANTINE
    + '\n\nCombien de ' + selon('q', GENS_DIT) + ' mangent à la cantine ' + selon('j', JOURS_LE)
    + ' ?\n\n$?$ ' + selon('q', GENS_DIT),
    ['{{n}}'],
    CANTINE_VARS + [var('q', '0..2'), var('j', '0..3'), var('n', 'eval:' + CASE_CANTINE)],
    ['On prend la ligne des ' + selon('q', GENS_DIT) + ' et la colonne ' + selon('j', JOURS_DU)
     + '.',
     'La case où elles se croisent : $' + ev(CASE_CANTINE) + '$.'])

CLASSES = ['CE1', 'CE2', 'CM1']
GENRES = ['Albums', 'Romans', 'BD', 'Documentaires']
GENRES_DIT = ['albums', 'romans', 'BD', 'documentaires']
L1, L2, L3 = ['b1', 'b2', 'b3', 'b4'], ['c1', 'c2', 'c3', 'c4'], ['d1', 'd2', 'd3', 'd4']
BIBLI = croise(CLASSES, GENRES, [accolades(L1), accolades(L2), accolades(L3)],
               ['coin: Classe \\ Livres'])
BIBLI_TOT = croise(CLASSES, GENRES, [accolades(L1), accolades(L2), accolades(L3)],
                   ['coin: Classe \\ Livres', 'totaux: oui'])
BIBLI_VARS = [var(x, '10..200') for x in L1 + L2 + L3]

CASE_BIBLI = lagrange('q', [lagrange('j', L1), lagrange('j', L2), lagrange('j', L3)])
LIRE_BIBLI = variation(
    'Ce tableau donne le nombre de livres empruntés à la bibliothèque de l\'école cette année.'
    + BIBLI
    + '\n\nCombien de ' + selon('j', GENRES_DIT) + ' les élèves de ' + selon('q', CLASSES)
    + ' ont-ils empruntés ?\n\n$?$ livres',
    ['{{n}}'],
    BIBLI_VARS + [var('q', '0..2'), var('j', '0..3'), var('n', 'eval:' + CASE_BIBLI)],
    ['On prend la ligne « ' + selon('q', CLASSES) + ' » et la colonne « '
     + selon('j', GENRES) + ' ».',
     'La case où elles se croisent : $' + ev(CASE_BIBLI) + '$.'])

TOT_GENRE = lagrange('j', [a + '+' + b + '+' + c for a, b, c in zip(L1, L2, L3)])
LIRE_TOTAL = variation(
    'Ce tableau donne le nombre de livres empruntés à la bibliothèque de l\'école cette année.'
    + BIBLI_TOT
    + '\n\nCombien de ' + selon('j', GENRES_DIT) + ' ont été empruntés en tout ?\n\n$?$ livres',
    ['{{n}}'],
    BIBLI_VARS + [var('j', '0..3'), var('n', 'eval:' + TOT_GENRE)],
    ['« En tout » : on prend la colonne « ' + selon('j', GENRES)
     + ' », jusqu\'à la ligne Total.',
     'Le total : $' + ev(TOT_GENRE) + '$.'])


def cantine(fs, gs, ad, extra):
    d = {x: v for x, v in zip(FJ + GJ + AJ, fs + gs + ad)}
    d.update(extra)
    return d


def bibli(rangs, extra):
    d = {x: v for x, v in zip(L1 + L2 + L3, rangs[0] + rangs[1] + rangs[2])}
    d.update(extra)
    return d


CF, CG, CA = [112, 98, 125, 87], [104, 131, 96, 119], [12, 9, 14, 11]
BL = [[45, 18, 62, 23], [37, 54, 88, 41], [16, 103, 75, 58]]

SPECS_LIRE_TABLEAU = [
    spec('BO : les filles le lundi, 112', 0, cantine(CF, CG, CA, {'q': 0, 'j': 0, 'n': 112}),
         '112', 'correct'),
    spec('Erreur : les garçons du lundi (104)', 0, cantine(CF, CG, CA, {'q': 0, 'j': 0, 'n': 112}),
         '104', 'incorrect'),
    spec('Erreur : les filles du mardi (98)', 0, cantine(CF, CG, CA, {'q': 0, 'j': 0, 'n': 112}),
         '98', 'incorrect'),
    spec('Les adultes le jeudi, 14', 0, cantine(CF, CG, CA, {'q': 2, 'j': 2, 'n': 14}), '14',
         'correct'),
    spec('Les garçons le mardi, 131', 0, cantine(CF, CG, CA, {'q': 1, 'j': 1, 'n': 131}), '131',
         'correct'),
    spec('Romans du CM1, 103', 1, bibli(BL, {'q': 2, 'j': 1, 'n': 103}), '103', 'correct'),
    spec('Erreur : romans du CE2 (54)', 1, bibli(BL, {'q': 2, 'j': 1, 'n': 103}), '54',
         'incorrect'),
    spec('BD du CE1, 62', 1, bibli(BL, {'q': 0, 'j': 2, 'n': 62}), '62', 'correct'),
    spec('BD en tout : 62 + 88 + 75 = 225', 2, bibli(BL, {'j': 2, 'n': 225}), '225', 'correct'),
    spec('Erreur : les BD du CE1 seules (62)', 2, bibli(BL, {'j': 2, 'n': 225}), '62', 'incorrect'),
    spec('Albums en tout : 98', 2, bibli(BL, {'j': 0, 'n': 98}), '98', 'correct'),
]

# ---- 3. Interpréter un tableau à double entrée (CE2-096) ----

TJ = [f'{a}+{b}+{c}' for a, b, c in zip(FJ, GJ, AJ)]
TJ_NOMS = ['t1', 't2', 't3', 't4']
SOMMES = [var(t, 'eval:' + s) for t, s in zip(TJ_NOMS, TJ)]
ADDITIONS = ('On additionne les trois lignes, chaque jour : '
             + ' ; '.join(j + ' ${{' + f_ + '}} + {{' + g + '}} + {{' + a + '}} = {{' + t + '}}$'
                          for j, f_, g, a, t in zip(JOURS, FJ, GJ, AJ, TJ_NOMS)) + '.')


def jour_extreme(plus):
    mot = 'le plus' if plus else 'le moins'
    return variation(
        'Ce tableau donne le nombre de personnes qui mangent à la cantine, chaque jour.' + CANTINE
        + '\n\nQuel jour y a-t-il ' + mot + ' de personnes à la cantine ?' + choix(JOURS),
        ['{{r}}'],
        CANTINE_VARS + SOMMES + [var('r', rang_extreme(TJ_NOMS, '>' if plus else '<'))],
        [ADDITIONS,
         ('Le plus grand' if plus else 'Le plus petit') + ' total : ' + selon('r', JOURS_LE)
         + '.'],
        tous_differents(TJ_NOMS))


JOUR_PLUS = jour_extreme(True)
JOUR_MOINS = jour_extreme(False)

EN_TOUT_JOUR = variation(
    'Ce tableau donne le nombre de personnes qui mangent à la cantine, chaque jour.' + CANTINE
    + '\n\nCombien de personnes ont mangé à la cantine ' + selon('j', JOURS_LE)
    + ' ?\n\n$?$ personnes',
    ['{{n}}'],
    CANTINE_VARS + [var('j', '0..3'), var('n', 'eval:' + lagrange('j', TJ))],
    ['On prend toute la colonne ' + selon('j', JOURS_DU) + ' : filles, garçons et adultes.',
     'On additionne : $' + ev(lagrange('j', FJ)) + ' + ' + ev(lagrange('j', GJ)) + ' + '
     + ev(lagrange('j', AJ)) + ' = ' + ev(lagrange('j', TJ)) + '$.'])

ECART = lagrange('j', GJ) + '-' + lagrange('j', FJ)
DE_PLUS = variation(
    'Ce tableau donne le nombre de personnes qui mangent à la cantine, chaque jour.' + CANTINE
    + '\n\n' + selon('j', ['Le lundi', 'Le mardi', 'Le jeudi', 'Le vendredi'])
    + ', combien de garçons de plus que de filles ont mangé à la cantine ?\n\n$?$ garçons de plus',
    ['{{n}}'],
    CANTINE_VARS + [var('j', '0..3'), var('n', 'eval:' + ECART)],
    ['La colonne ' + selon('j', JOURS_DU) + ' : $' + ev(lagrange('j', GJ)) + '$ garçons et $'
     + ev(lagrange('j', FJ)) + '$ filles.',
     'L\'écart : $' + ev(lagrange('j', GJ)) + ' - ' + ev(lagrange('j', FJ)) + ' = ' + ev(ECART)
     + '$.'],
    ['n >= 3'])


def jours(fs, gs, ad, extra):
    d = cantine(fs, gs, ad, {})
    for t, a, b, c in zip(TJ_NOMS, fs, gs, ad):
        d[t] = a + b + c
    d.update(extra)
    return d


# totaux : 228, 238, 235, 217 → le mardi le plus, le vendredi le moins ; plus grande case :
# le jeudi (125 filles), piège
IF, IG, IA = [112, 98, 125, 87], [104, 131, 96, 119], [12, 9, 14, 11]

SPECS_INTERPRETER = [
    spec('Le plus : le mardi (238)', 0, jours(IF, IG, IA, {'r': 1}), '1', 'correct'),
    spec('Erreur : le jeudi (la plus grande case des filles)', 0, jours(IF, IG, IA, {'r': 1}),
         '2', 'incorrect'),
    spec('Erreur : le lundi (la première colonne)', 0, jours(IF, IG, IA, {'r': 1}), '0',
         'incorrect'),
    spec('Le moins : le vendredi (217)', 1, jours(IF, IG, IA, {'r': 3}), '3', 'correct'),
    spec('Erreur : le mardi (la plus petite case des filles, 98)', 1, jours(IF, IG, IA, {'r': 3}),
         '1', 'incorrect'),
    spec('En tout le jeudi : 125 + 96 + 14 = 235', 2, jours(IF, IG, IA, {'j': 2, 'n': 235}), '235',
         'correct'),
    spec('Erreur : les adultes oubliés (221)', 2, jours(IF, IG, IA, {'j': 2, 'n': 235}), '221',
         'incorrect'),
    spec('Le vendredi : 119 − 87 = 32', 3, jours(IF, IG, IA, {'j': 3, 'n': 32}), '32', 'correct'),
    spec('Erreur : les garçons du vendredi (119)', 3, jours(IF, IG, IA, {'j': 3, 'n': 32}), '119',
         'incorrect'),
    spec('Erreur : la somme (206)', 3, jours(IF, IG, IA, {'j': 3, 'n': 32}), '206', 'incorrect'),
]

# ---- 4. Compléter un tableau avec totaux (CE2-076) ----

MODES = ['À pied', 'Vélo', 'Voiture', 'Bus']
FM, GM = ['f1', 'f2', 'f3', 'f4'], ['g1', 'g2', 'g3', 'g4']
TRANSPORT_VALS = [[accolades([a])[0], accolades([b])[0]] for a, b in zip(FM, GM)]
INTRO_TRANSPORT = ('Ce tableau donne la façon dont les élèves de l\'école viennent le matin.'
                   ' Des cases sont cachées.')


def transport(masques):
    return croise(MODES, ['Filles', 'Garçons'], TRANSPORT_VALS,
                  ['coin: Transport \\ Élèves', 'totaux: oui', 'masquer: ' + ' ; '.join(masques)])


TRANSPORT_VARS = [var(x, '10..90') for x in FM + GM]

CASE_PAR_COLONNE = variation(
    INTRO_TRANSPORT + transport(['Voiture/Filles'])
    + '\n\nCombien de filles viennent en voiture ?\n\n$?$ filles',
    ['{{f3}}'],
    TRANSPORT_VARS,
    ['La ligne « Voiture » : ${{g3}}$ garçons, et $' + ev('f3+g3') + '$ élèves en tout.',
     'Les filles : $' + ev('f3+g3') + ' - {{g3}} = {{f3}}$.'])

TOTAUX_CACHES = variation(
    INTRO_TRANSPORT + transport(['Bus/Total', 'Total/Filles'])
    + '\n\nComplète les cases cachées.\n\nÉlèves qui viennent en bus : $?$\n\nNombre total de'
    ' filles : $?$',
    ['{{eval:f4+g4}}', '{{eval:f1+f2+f3+f4}}'],
    TRANSPORT_VARS,
    ['Le bus : on additionne la ligne, ${{f4}} + {{g4}} = ' + ev('f4+g4') + '$.',
     'Les filles : on additionne la colonne, ${{f1}} + {{f2}} + {{f3}} + {{f4}} = '
     + ev('f1+f2+f3+f4') + '$.'])

TROIS_CACHEES = variation(
    INTRO_TRANSPORT + transport(['Vélo/Garçons', 'Total/Garçons', 'Total/Total'])
    + '\n\nComplète les cases cachées.\n\nGarçons à vélo : $?$\n\nNombre total de garçons : $?$'
    '\n\nNombre total d\'élèves : $?$',
    ['{{g2}}', '{{eval:g1+g2+g3+g4}}', '{{eval:f1+f2+f3+f4+g1+g2+g3+g4}}'],
    TRANSPORT_VARS,
    ['Garçons à vélo : la ligne « Vélo » fait $' + ev('f2+g2') + '$ élèves, dont ${{f2}}$ filles :'
     ' $' + ev('f2+g2') + ' - {{f2}} = {{g2}}$.',
     'Les garçons : ${{g1}} + {{g2}} + {{g3}} + {{g4}} = ' + ev('g1+g2+g3+g4') + '$.',
     'Tous les élèves : $' + ev('f1+f2+f3+f4') + ' + ' + ev('g1+g2+g3+g4') + ' = '
     + ev('f1+f2+f3+f4+g1+g2+g3+g4') + '$ (ou la colonne Total).'])

TF, TG = [38, 15, 47, 41], [42, 23, 36, 40]  # filles 141, garçons 141, total 282 (CE1)


def tr(fs, gs):
    return {x: v for x, v in zip(FM + GM, fs + gs)}


SPECS_TOTAUX = [
    spec('Filles en voiture : 83 − 36 = 47', 0, tr(TF, TG), '47', 'correct'),
    spec('Erreur : le total de la ligne (83)', 0, tr(TF, TG), '83', 'incorrect'),
    spec('Erreur : les garçons en voiture (36)', 0, tr(TF, TG), '36', 'incorrect'),
    spec('Bus 81, filles 141', 1, tr(TF, TG), ['81', '141'], 'correct'),
    spec('Erreur : le bus = les filles en bus (41)', 1, tr(TF, TG), ['41', '141'], 'incorrect'),
    spec('Erreur : une case oubliée dans les filles (100)', 1, tr(TF, TG), ['81', '100'],
         'incorrect'),
    spec('Vélo 23, garçons 141, total 282', 2, tr(TF, TG), ['23', '141', '282'], 'correct'),
    spec('Erreur : total = filles + garçons sans le vélo (259)', 2, tr(TF, TG),
         ['23', '141', '259'], 'incorrect'),
    spec('Erreur : garçons à vélo = ligne vélo (38)', 2, tr(TF, TG), ['38', '141', '282'],
         'incorrect'),
]

# ---- 5. Compléter une barre à partir du total (CE2-076) ----

SPORTS = ['Football', 'Danse', 'Judo', 'Basket']
SPORTS_LE = ['le football', 'la danse', 'le judo', 'le basket']
# effectifs multiples de 5 (sur une graduation de l'axe de 5 en 5) : u × 5
US = ['ua', 'ub', 'uc']

BARRE_PAR_TOTAL = variation(
    'Les ${{T}}$ élèves de l\'école ont tous choisi un sport. Le diagramme n\'est pas fini :'
    ' il manque la barre du basket.'
    + barres('Sport préféré', 'Sport ; Élèves', SPORTS, ['{{a}}', '{{b}}', '{{c}}', '{{d}}'],
             '0 à 80, de 5 en 5', 'placer: Basket')
    + '\n\nConstruis la barre du basket.',
    [],
    [var('ua', '4..14'), var('ub', '4..14'), var('uc', '4..14'), var('ud', '3..14'),
     var('a', 'eval:5*ua'), var('b', 'eval:5*ub'), var('c', 'eval:5*uc'), var('d', 'eval:5*ud'),
     var('T', 'eval:a+b+c+d')],
    ['Les trois barres tracées : ${{a}} + {{b}} + {{c}} = ' + ev('a+b+c') + '$ élèves.',
     'Le basket : ${{T}} - ' + ev('a+b+c') + ' = {{d}}$ élèves.',
     'La barre du basket monte jusqu\'à ${{d}}$ (l\'axe est gradué de $5$ en $5$).'],
    ['T >= 120', 'T <= 200'])

AUTRES = variation(
    'Les ${{T}}$ élèves de l\'école ont tous choisi un sport. Le diagramme montre trois sports ;'
    ' les autres élèves ont choisi le basket.'
    + barres('Sport préféré', 'Sport ; Élèves', SPORTS[:3], ['{{a}}', '{{b}}', '{{c}}'],
             '0 à 100, de 10 en 10')
    + '\n\nCombien d\'élèves ont choisi le basket ?\n\n$?$ élèves',
    ['{{d}}'],
    [var('ua', '2..10'), var('ub', '2..10'), var('uc', '2..10'), var('d', '15..90'),
     var('a', 'eval:10*ua'), var('b', 'eval:10*ub'), var('c', 'eval:10*uc'),
     var('T', 'eval:a+b+c+d')],
    ['On lit les trois barres : ${{a}}$, ${{b}}$ et ${{c}}$.',
     'Ensemble : ${{a}} + {{b}} + {{c}} = ' + ev('a+b+c') + '$ élèves.',
     'Le basket : ${{T}} - ' + ev('a+b+c') + ' = {{d}}$ élèves.'],
    ['T >= 150', 'T <= 250'])


def sports(a, b, c, d):
    return {'ua': a // 5, 'ub': b // 5, 'uc': c // 5, 'ud': d // 5, 'a': a, 'b': b, 'c': c,
            'd': d, 'T': a + b + c + d}


def sports10(a, b, c, d):
    return {'ua': a // 10, 'ub': b // 10, 'uc': c // 10, 'a': a, 'b': b, 'c': c, 'd': d,
            'T': a + b + c + d}


SPECS_BARRE_TOTAL = [
    spec('BO : 175 élèves, 50 + 35 + 60 → basket 30', 0, sports(50, 35, 60, 30), '30', 'correct'),
    spec('Erreur : la barre à 35 (un trait de trop)', 0, sports(50, 35, 60, 30), '35',
         'incorrect'),
    spec('Erreur : un trait de moins (25)', 0, sports(50, 35, 60, 30), '25', 'incorrect'),
    spec('190 élèves : 45 + 70 + 25 → basket 50', 0, sports(45, 70, 25, 50), '50', 'correct'),
    spec('200 élèves : 60 + 40 + 50 → basket 50', 1, sports10(60, 40, 50, 50), '50', 'correct'),
    spec('Erreur : les trois barres (150)', 1, sports10(60, 40, 50, 50), '150', 'incorrect'),
    spec('Erreur : le total (200)', 1, sports10(60, 40, 50, 50), '200', 'incorrect'),
    spec('175 élèves : 70 + 30 + 40 → basket 35', 1, sports10(70, 30, 40, 35), '35', 'correct'),
]

# ---- 6. Lire un diagramme gradué (CE2-083) ----

FRUITS = ['Pomme', 'Banane', 'Fraise', 'Orange']
FRUITS_LA = ['la pomme', 'la banane', 'la fraise', 'l\'orange']
ANIMAUX = ['Chat', 'Chien', 'Lapin', 'Poisson', 'Cheval']
ANIMAUX_LE = ['le chat', 'le chien', 'le lapin', 'le poisson', 'le cheval']
V4 = ['a', 'b', 'c', 'd']
V5 = ['a', 'b', 'c', 'd', 'g']
U4 = ['ua', 'ub', 'uc', 'ud']
U5 = ['ua', 'ub', 'uc', 'ud', 'ug']


def lire_gradue(titre, axes, noms, articles, pas, maxi, mult, umin, umax, pas_dit, qui,
                entre=False):
    """Effectifs = `mult` × u ; axe de `pas` en `pas` jusqu'à `maxi`."""
    n = len(noms)
    vs, us = (V4, U4) if n == 4 else (V5, U5)
    lecture = ('Le haut de la barre est au milieu, entre deux traits : $' + ev(lagrange('k', vs))
               + '$.' if entre else
               'Le haut de la barre arrive au trait $' + ev(lagrange('k', vs)) + '$.')
    return variation(
        'Voici le diagramme en barres « ' + titre + ' ».'
        + barres(titre, axes, noms, accolades(vs), f'0 à {maxi}, de {pas} en {pas}')
        + '\n\nCombien ' + qui + ' ont choisi ' + selon('k', articles) + ' ?\n\n$?$ élèves',
        ['{{n}}'],
        [var(u, f'{umin}..{umax}') for u in us]
        + [var(v, f'eval:{mult}*{u}') for v, u in zip(vs, us)]
        + [var('k', f'0..{n - 1}'), var('n', 'eval:' + lagrange('k', vs))],
        ['On cherche la barre ' + selon('k', ['« ' + x + ' »' for x in noms]) + '.',
         'L\'axe est gradué de ' + pas_dit + ' : chaque trait compte pour $' + str(pas)
         + '$ élèves.',
         lecture + ' ' + selon('k', [a[0].upper() + a[1:] for a in articles]) + ' : $'
         + ev(lagrange('k', vs)) + '$ élèves.'])


DE_2 = lire_gradue('Sport préféré', 'Sport ; Élèves', SPORTS, SPORTS_LE, 2, 30, 2, 2, 15,
                   '$2$ en $2$', 'd\'élèves')
DE_5 = lire_gradue('Fruit préféré', 'Fruit ; Élèves', FRUITS, FRUITS_LA, 5, 60, 5, 2, 12,
                   '$5$ en $5$', 'd\'élèves')
DE_10 = lire_gradue('Animal préféré', 'Animal ; Élèves', ANIMAUX, ANIMAUX_LE, 10, 100, 10, 2,
                    10, '$10$ en $10$', 'd\'élèves')
# entre deux traits : 10 × u + 5, de 15 à 75, sur un axe de 10 en 10 jusqu'à 80 (une barre de
# 5 sur un axe de 100 ne se lisait pas, essai du 2026-11-05)
ENTRE = lire_gradue('Fruit préféré', 'Fruit ; Élèves', FRUITS, FRUITS_LA, 10, 80, 5, 1, 19,
                    '$10$ en $10$', 'd\'élèves', entre=True)
ENTRE['variables'] = [var(u, '1..7') for u in U4] + [var(v, f'eval:10*{u}+5')
                                                    for v, u in zip(V4, U4)] + ENTRE['variables'][8:]


def gradue(vs_noms, us_noms, valeurs, mult, k, plus=0):
    d = {}
    for v, u, x in zip(vs_noms, us_noms, valeurs):
        d[v] = x
        d[u] = (x - plus) // mult
    d['k'] = k
    d['n'] = valeurs[k]
    return d


SPECS_LIRE_GRADUE = [
    spec('De 2 en 2 : la danse, 14', 0, gradue(V4, U4, [22, 14, 8, 26], 2, 1), '14', 'correct'),
    spec('Erreur : traits comptés de 1 en 1 (7)', 0, gradue(V4, U4, [22, 14, 8, 26], 2, 1), '7',
         'incorrect'),
    spec('Le basket, 26', 0, gradue(V4, U4, [22, 14, 8, 26], 2, 3), '26', 'correct'),
    spec('De 5 en 5 : la fraise, 35', 1, gradue(V4, U4, [20, 45, 35, 10], 5, 2), '35', 'correct'),
    spec('Erreur : 7 traits lus comme 7', 1, gradue(V4, U4, [20, 45, 35, 10], 5, 2), '7',
         'incorrect'),
    spec('Erreur : barre voisine (45)', 1, gradue(V4, U4, [20, 45, 35, 10], 5, 2), '45',
         'incorrect'),
    spec('De 10 en 10 : le cheval, 80', 2, gradue(V5, U5, [40, 60, 20, 30, 80], 10, 4), '80',
         'correct'),
    spec('Erreur : 8 (le nombre de traits)', 2, gradue(V5, U5, [40, 60, 20, 30, 80], 10, 4), '8',
         'incorrect'),
    spec('Entre deux traits : la banane, 45', 3, gradue(V4, U4, [25, 45, 75, 15], 10, 1, 5), '45',
         'correct'),
    spec('Erreur : le trait du dessous (40)', 3, gradue(V4, U4, [25, 45, 75, 15], 10, 1, 5), '40',
         'incorrect'),
    spec('Erreur : le trait du dessus (50)', 3, gradue(V4, U4, [25, 45, 75, 15], 10, 1, 5), '50',
         'incorrect'),
]

# ---- 7. Comparer sur un diagramme (CE2-097) ----

SPORTS5 = ['Football', 'Basket', 'Danse', 'Judo', 'Natation']
SPORTS5_LE = ['le football', 'le basket', 'la danse', 'le judo', 'la natation']

FOOT_BASKET = variation(
    'Voici le diagramme en barres « Sport préféré ».'
    + barres('Sport préféré', 'Sport ; Élèves', SPORTS5, accolades(V5), '0 à 60, de 5 en 5')
    + '\n\nCombien d\'élèves de plus ont choisi le football plutôt que le basket ?\n\n'
    '$?$ élèves de plus',
    ['{{eval:a-b}}'],
    [var(u, '2..12') for u in U5] + [var(v, f'eval:5*{u}') for v, u in zip(V5, U5)],
    ['On lit les deux barres : ${{a}}$ élèves pour le football, ${{b}}$ pour le basket.',
     'On calcule l\'écart : ${{a}} - {{b}} = ' + ev('a-b') + '$.',
     '$' + ev('a-b') + '$ élèves de plus ont choisi le football.'],
    ['a-b >= 10'])

EN_TOUT = variation(
    'Voici le diagramme en barres « Fruit préféré ».'
    + barres('Fruit préféré', 'Fruit ; Élèves', FRUITS, accolades(V4), '0 à 50, de 2 en 2')
    + '\n\nCombien d\'élèves ont répondu en tout ?\n\n$?$ élèves',
    ['{{eval:a+b+c+d}}'],
    [var(u, '3..25') for u in U4] + [var(v, f'eval:2*{u}') for v, u in zip(V4, U4)],
    ['On lit chaque barre : ${{a}}$, ${{b}}$, ${{c}}$ et ${{d}}$.',
     'On additionne : ${{a}} + {{b}} + {{c}} + {{d}} = ' + ev('a+b+c+d') + '$.',
     '$' + ev('a+b+c+d') + '$ élèves ont répondu.'])

ECART_K = lagrange('k', V5) + '-' + lagrange('m', V5)
PAIRE = variation(
    'Voici le diagramme en barres « Animal préféré ».'
    + barres('Animal préféré', 'Animal ; Élèves', ANIMAUX, accolades(V5), '0 à 100, de 10 en 10')
    + '\n\nCombien d\'élèves de moins ont choisi ' + selon('m', ANIMAUX_LE) + ' que '
    + selon('k', ANIMAUX_LE) + ' ?\n\n$?$ élèves de moins',
    ['{{n}}'],
    [var(u, '1..10') for u in U5] + [var(v, f'eval:10*{u}') for v, u in zip(V5, U5)]
    + [var('k', '0..4'), var('m', '0..4'), var('n', 'eval:' + ECART_K)],
    ['On lit les deux barres : $' + ev(lagrange('k', V5)) + '$ pour ' + selon('k', ANIMAUX_LE)
     + ', $' + ev(lagrange('m', V5)) + '$ pour ' + selon('m', ANIMAUX_LE) + '.',
     'L\'écart : $' + ev(lagrange('k', V5)) + ' - ' + ev(lagrange('m', V5)) + ' = ' + ev(ECART_K)
     + '$.'],
    ['n >= 20'])

MOINS_CHOISI = variation(
    'Voici le diagramme en barres « Sport préféré ».'
    + barres('Sport préféré', 'Sport ; Élèves', SPORTS5, accolades(V5), '0 à 60, de 5 en 5')
    + '\n\nQuel sport est le moins choisi ?' + choix(SPORTS5),
    ['{{r}}'],
    [var(u, '2..12') for u in U5] + [var(v, f'eval:5*{u}') for v, u in zip(V5, U5)]
    + [var('r', rang_extreme(V5, '<'))],
    ['On cherche la barre la moins haute.',
     'Le sport le moins choisi est ' + selon('r', SPORTS5_LE) + ' : $' + ev(lagrange('r', V5))
     + '$ élèves.'],
    tous_differents(V5))


def cinq(valeurs, mult, extra=None):
    d = {}
    for v, u, x in zip(V5, U5, valeurs):
        d[v] = x
        d[u] = x // mult
    d.update(extra or {})
    return d


def quatre(valeurs, mult):
    d = {}
    for v, u, x in zip(V4, U4, valeurs):
        d[v] = x
        d[u] = x // mult
    return d


SPECS_COMPARER = [
    spec('BO : foot 45, basket 25 → 20 de plus', 0, cinq([45, 25, 30, 15, 50], 5), '20',
         'correct'),
    spec('Erreur : le football seul (45)', 0, cinq([45, 25, 30, 15, 50], 5), '45', 'incorrect'),
    spec('Erreur : la somme (70)', 0, cinq([45, 25, 30, 15, 50], 5), '70', 'incorrect'),
    spec('Erreur : traits comptés (4)', 0, cinq([45, 25, 30, 15, 50], 5), '4', 'incorrect'),
    spec('En tout : 18 + 32 + 24 + 6 = 80', 1, quatre([18, 32, 24, 6], 2), '80', 'correct'),
    spec('Erreur : une barre oubliée (74)', 1, quatre([18, 32, 24, 6], 2), '74', 'incorrect'),
    spec('Lapin 90, chat 40 : 50 de moins pour le chat', 2,
         cinq([40, 60, 90, 20, 70], 10, {'k': 2, 'm': 0, 'n': 50}), '50', 'correct'),
    spec('Erreur : 5 (en traits)', 2, cinq([40, 60, 90, 20, 70], 10, {'k': 2, 'm': 0, 'n': 50}),
         '5', 'incorrect'),
    spec('Le moins choisi : le judo (15)', 3, cinq([45, 25, 30, 15, 50], 5, {'r': 3}), '3',
         'correct'),
    spec('Erreur : la natation (le plus choisi)', 3, cinq([45, 25, 30, 15, 50], 5, {'r': 3}), '4',
         'incorrect'),
]

# ---- 8. Construire un diagramme en choisissant l'échelle (CE2-082) ----


def tableau_effectifs(entete, noms, vs):
    t = '| ' + entete + ' | Nombre d\'élèves |\n|---|---|\n'
    return t + ''.join('| ' + n + ' | $' + v + '$ |\n' for n, v in zip(noms, vs))


AVANT = {2: 1, 5: 2, 10: 5}


def construire(contexte, entete, titre, axes, noms, mult, umax):
    """`mult` = l'échelle attendue : la plus grande barre (`m`, n'importe laquelle) dépasse ce
    que l'échelle d'avant (`AVANT`) laisse rentrer, et `umax × mult` ≤ `10 × mult`."""
    n = len(noms)
    vs, us = (V4, U4) if n == 4 else (V5, U5)
    return variation(
        contexte + '\n\n' + tableau_effectifs(entete, noms, accolades(vs))
        + '\nChoisis l\'échelle de l\'axe, puis construis le diagramme en barres.'
        + barres(titre, axes, noms, accolades(vs), 'à choisir', 'placer: toutes'),
        [],
        [var(u, f'1..{umax}') for u in us]
        + [var(v, f'eval:{mult}*{u}') for v, u in zip(vs, us)]
        + [var('m', 'eval:max(' + ','.join(vs) + ')')],
        ['L\'axe a $10$ graduations : on prend la plus petite échelle où la plus grande barre'
         ' rentre.',
         'La plus grande barre : ${{m}}$ élèves. Avec $' + str(AVANT[mult])
         + '$ par graduation, l\'axe s\'arrêterait à $' + str(10 * AVANT[mult])
         + '$ : trop court. Avec $' + str(mult) + '$, il monte jusqu\'à $' + str(10 * mult)
         + '$ : tout rentre.',
         'Chaque barre monte jusqu\'à son nombre d\'élèves.'],
        ['m > ' + str(10 * AVANT[mult])])


ECHELLE_2 = construire('Les élèves de la classe ont choisi leur fruit préféré.', 'Fruit',
                       'Fruit préféré', 'Fruit ; Élèves', FRUITS, 2, 10)
ECHELLE_5 = construire('Les élèves de l\'école ont choisi leur sport préféré.', 'Sport',
                       'Sport préféré', 'Sport ; Élèves', SPORTS, 5, 10)
ECHELLE_10 = construire('Les élèves de l\'école ont choisi leur animal préféré.', 'Animal',
                        'Animal préféré', 'Animal ; Élèves', ANIMAUX, 10, 9)


def echelle(valeurs, mult):
    vs, us = (V4, U4) if len(valeurs) == 4 else (V5, U5)
    d = {}
    for v, u, x in zip(vs, us, valeurs):
        d[v] = x
        d[u] = x // mult
    d['m'] = max(valeurs)
    return d


SPECS_ECHELLE = [
    spec('Fruits jusqu\'à 18 : échelle 2', 0, echelle([18, 6, 12, 10], 2),
         ['2', '18', '6', '12', '10'], 'correct'),
    spec('Erreur : échelle 1 (18 ne rentre pas)', 0, echelle([18, 6, 12, 10], 2),
         ['1', '18', '6', '12', '10'], 'incorrect'),
    spec('Erreur : échelle 5 (rentre, mais moins lisible)', 0, echelle([18, 6, 12, 10], 2),
         ['5', '18', '6', '12', '10'], 'incorrect'),
    spec('Sports jusqu\'à 45 : échelle 5', 1, echelle([45, 20, 35, 10], 5),
         ['5', '45', '20', '35', '10'], 'correct'),
    spec('Le basket le plus haut (40) : échelle 5', 1, echelle([15, 20, 35, 40], 5),
         ['5', '15', '20', '35', '40'], 'correct'),
    spec('Erreur : échelle 2 (40 ne rentre pas)', 1, echelle([15, 20, 35, 40], 5),
         ['2', '15', '20', '35', '40'], 'incorrect'),
    spec('Erreur : une barre un trait trop haut', 1, echelle([45, 20, 35, 10], 5),
         ['5', '45', '25', '35', '10'], 'incorrect'),
    spec('Animaux jusqu\'à 80 : échelle 10', 2, echelle([80, 30, 60, 20, 50], 10),
         ['10', '80', '30', '60', '20', '50'], 'correct'),
    spec('Erreur : échelle 5 (80 ne rentre pas)', 2, echelle([80, 30, 60, 20, 50], 10),
         ['5', '80', '30', '60', '20', '50'], 'incorrect'),
]

MODELES = {
    '01-ranger-les-donnees-en-tableau': modele(
        'Range les données dans un tableau',
        'Compter une liste de réponses (frères et sœurs, âge, pointure ; 20 à 24 élèves) et remplir'
        ' la colonne des effectifs, avec une ligne Total', 3, [FRERES, AGES, POINTURES],
        SPECS_RANGER, delay=240),
    '02-lire-un-tableau-double-entree': modele(
        'Lis le tableau à double entrée (trois lignes)',
        'Cantine (filles, garçons, adultes), bibliothèque (CE1, CE2, CM1) : une case, nombres'
        ' jusqu\'à 200, puis le total d\'une colonne', 5, [LIRE_CANTINE, LIRE_BIBLI, LIRE_TOTAL],
        SPECS_LIRE_TABLEAU),
    '03-interpreter-un-tableau': modele(
        'Que dit le tableau à double entrée ? (trois lignes)',
        'Sans totaux : le jour où la cantine a le plus, le moins de personnes (case choix), combien'
        ' en tout un jour, combien de garçons de plus', 6,
        [JOUR_PLUS, JOUR_MOINS, EN_TOUT_JOUR, DE_PLUS], SPECS_INTERPRETER, delay=180),
    '04-completer-un-tableau-avec-totaux': modele(
        'Complète le tableau avec ses totaux',
        'Tableau à double entrée avec totaux, cases cachées : une case par son total, un total de'
        ' ligne et de colonne, puis trois cases dont le total général', 1,
        [CASE_PAR_COLONNE, TOTAUX_CACHES, TROIS_CACHEES], SPECS_TOTAUX, delay=180),
    '05-completer-une-barre-par-le-total': modele(
        'Retrouve la barre qui manque grâce au total',
        'Effectif total donné (175 élèves, BO) : construire la barre qui manque (axe de 5 en 5),'
        ' puis calculer l\'effectif d\'un sport absent du diagramme (axe de 10 en 10)', 2,
        [BARRE_PAR_TOTAL, AUTRES], SPECS_BARRE_TOTAL, delay=180),
    '06-lire-un-diagramme-gradue': modele(
        'Lis le diagramme en barres (axe gradué de 2 en 2, 5 en 5, 10 en 10)',
        'Lire une barre sur un axe gradué de 2 en 2, de 5 en 5, de 10 en 10, puis une barre'
        ' entre deux traits (35 sur un axe de 10 en 10)', 4, [DE_2, DE_5, DE_10, ENTRE],
        SPECS_LIRE_GRADUE, delay=90),
    '07-comparer-sur-un-diagramme': modele(
        'Compare les barres du diagramme',
        'Combien de plus (BO : football et basket), combien en tout, combien de moins, le moins'
        ' choisi (case choix) ; axes de 2 en 2, 5 en 5, 10 en 10', 5,
        [FOOT_BASKET, EN_TOUT, PAIRE, MOINS_CHOISI], SPECS_COMPARER, delay=150),
    '08-construire-un-diagramme-echelle': modele(
        'Choisis l\'échelle et construis le diagramme',
        'Tableau des effectifs donné : choisir l\'échelle (2, 5 ou 10 par graduation) puis monter'
        ' toutes les barres', 6, [ECHELLE_2, ECHELLE_5, ECHELLE_10], SPECS_ECHELLE, delay=240),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as fichier:
        json.dump(m, fichier, ensure_ascii=False, indent='\t')
        fichier.write('\n')
print(len(MODELES), 'modèles écrits')
