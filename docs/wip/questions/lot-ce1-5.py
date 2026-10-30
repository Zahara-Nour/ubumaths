"""Écrit les 6 modèles du lot 5 du CE1 (longueurs) dans scripts/questions/ce1-5/.

Phase 0 validée par David le 2026-10-30 (§ 11 du journal `docs/wip/questions-ce1-progress.md`).
Bornes `cycle2.json`, CE1-041 à 043 et 045 à 047 ; BO CE1 p.27 : m, cm, km ; 1 m = 100 cm,
1 km = 1 000 m ; 1 m + 46 cm = 146 cm ; trousse « plutôt 2 cm, 20 cm ou 2 m » ; longueurs
d'objets familiers et distances de référence. Décisions :

1. Pas d'écriture à virgule (BO) ; nombres écrits ≤ 1 000.
2. Texte et case choix ; aucun outil neuf.
3. Rangement sur les sous-notions existantes (« Longueurs › unités et conversions »,
   « Longueurs › comparaison et mesure »), posé par la migration ; catégories du CP
   (`Grandeurs · Longueurs`), niveaux libres après les siens (relevé MCP du 2026-10-30 :
   Unités 2, 4 ; Comparaison et mesure 1, 2 ; Ordres de grandeur 3).
4. Indice de la bonne réponse d'une case choix : une variable `r` calculée (jamais un `{{if}}`
   imbriqué) ; les listes sont rangées par bonne réponse pour que `r = floor((k-1)/n)`.
5. Un symbole d'unité seul s'écrit en texte (km), jamais `\\unit{km}` seul (lu « 1 km ») ;
   jamais de variable `e` ni `i`.

    python3 docs/wip/questions/lot-ce1-5.py scripts/questions/ce1-5
"""
import json
import sys

DOSSIER = sys.argv[1]

# ---- Gabarits ----


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(x) for k, x in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(title, description, subdomain, level, variations, specs, delay=60, options=None):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (sous-notion du point) est posé par la migration
    m = {'title': title, 'description': description, 'grades': ['CE1'], 'theme': 'Grandeurs',
         'domain': 'Longueurs', 'subdomain': subdomain, 'level': level, 'delay': delay,
         'status': 'draft'}
    if options:
        m['options'] = options
    m['variations'] = variations
    m['testSpecs'] = specs
    return m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, reponses, variables, etapes, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [{'expectedAnswer': r} for r in reponses]
    v['correction'] = {'steps': etapes}
    return v


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + c + '\n' for c in lignes) + '```'


def selon(k, textes, n=1):
    """`{{if:k==1|…|{{if:k==2|…|…}}}}` : le texte numéro k (à partir de 1)."""
    if len(textes) == 1:
        return textes[0]
    return ('{{if:' + k + '==' + str(n) + '|' + textes[0] + '|' + selon(k, textes[1:], n + 1)
            + '}}')


def ev(x):
    return '{{eval:' + x + '}}'


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def L(n, u):
    """Longueur en formule : $15~\\unit{cm}$."""
    return '$' + str(n) + '~\\unit{' + u + '}$'


MILLE = '1\\,000'
# Signe de comparaison selon r (0 : <, 1 : =, 2 : >)
SIGNE = '{{if:r==0|<|{{if:r==1|=|>}}}}'
SIGNES = choix(['$<$', '$=$', '$>$'], melanger=False)

# ---- 1. Unités de longueur (CE1-041) ----

NOMS = ['kilomètre', 'mètre', 'centimètre']
SYMBOLES = ['km', 'm', 'cm']

SYMBOLE = variation(
    'Quel est le symbole du ' + selon('k', NOMS) + ' ?' + choix(SYMBOLES), ['{{r}}'],
    [var('k', '1..3'), var('r', 'eval:k-1')],
    ['Le kilomètre s\'écrit km, le mètre s\'écrit m, le centimètre s\'écrit cm.',
     'Le ' + selon('k', NOMS) + ' s\'écrit **' + selon('k', SYMBOLES) + '**.'])

SENS = variation(
    'Que veut dire le symbole **' + selon('k', SYMBOLES) + '** ?' + choix(NOMS), ['{{r}}'],
    [var('k', '1..3'), var('r', 'eval:k-1')],
    ['km veut dire kilomètre, m veut dire mètre, cm veut dire centimètre.',
     '**' + selon('k', SYMBOLES) + '** veut dire **' + selon('k', NOMS) + '**.'])

PLUS_GRANDE = variation(
    'Quelle est la plus {{if:s==1|grande|petite}} de ces unités de longueur ?'
    + choix(['le kilomètre (km)', 'le mètre (m)', 'le centimètre (cm)']), ['{{r}}'],
    [var('s', '1..2'), var('r', 'eval:2*(s-1)')],
    ['$1~\\unit{km} = ' + MILLE + '~\\unit{m}$ et $1~\\unit{m} = 100~\\unit{cm}$.',
     'Le kilomètre est la plus grande, le centimètre la plus petite : la plus'
     ' {{if:s==1|grande est le **kilomètre**|petite est le **centimètre**}}.'])

SPECS_UNITES = [
    spec('symbole du kilomètre : km', 0, {'k': 1, 'r': 0}, '0', 'correct'),
    spec('Erreur : kilomètre → m', 0, {'k': 1, 'r': 0}, '1', 'incorrect'),
    spec('symbole du centimètre : cm', 0, {'k': 3, 'r': 2}, '2', 'correct'),
    spec('cm veut dire centimètre', 1, {'k': 3, 'r': 2}, '2', 'correct'),
    spec('Erreur : cm lu kilomètre', 1, {'k': 3, 'r': 2}, '0', 'incorrect'),
    spec('la plus grande : km', 2, {'s': 1, 'r': 0}, '0', 'correct'),
    spec('la plus petite : cm', 2, {'s': 2, 'r': 2}, '2', 'correct'),
    spec('Erreur : la plus petite → km', 2, {'s': 2, 'r': 2}, '0', 'incorrect'),
]

# ---- 2. Choisir l'unité (CE1-042) ----
# 4 longueurs en cm, puis 4 en m, puis 4 en km : r = floor((k-1)/4)

OBJETS = ['Un crayon mesure $15$', 'Une gomme mesure $4$', 'Un cahier mesure $30$',
          'Une règle d\'écolier mesure $20$',
          'La porte de la classe mesure $2$', 'Un bus mesure $12$', 'Une piscine mesure $25$',
          'La cour de l\'école mesure $40$',
          'Le trajet de la maison à la piscine fait $3$', 'Une course à pied fait $10$',
          'La route entre deux villes voisines fait $15$',
          'Une randonnée d\'une journée fait $20$']
UNITE_K = '{{if:r==0|centimètres|{{if:r==1|mètres|kilomètres}}}}'

CHOISIR = variation(
    selon('k', OBJETS) + ' …\n\nQuelle unité convient ?' + choix(SYMBOLES[::-1], melanger=False),
    ['{{r}}'], [var('k', '1..12'), var('r', 'eval:floor((k-1)/4)')],
    ['{{if:r==0|C\'est un petit objet, qu\'on tient dans la main : on mesure en centimètres.'
     '|{{if:r==1|C\'est grand comme une pièce ou un véhicule : on mesure en mètres.'
     '|C\'est une longue distance, qu\'on parcourt à pied ou en voiture : on mesure en'
     ' kilomètres.}}}}',
     selon('k', OBJETS) + ' ' + UNITE_K + ' (**' + '{{if:r==0|cm|{{if:r==1|m|km}}}}' + '**).'])

SPECS_CHOISIR = [
    spec('crayon : cm', 0, {'k': 1, 'r': 0}, '0', 'correct'),
    spec('Erreur : crayon de 15 m', 0, {'k': 1, 'r': 0}, '1', 'incorrect'),
    spec('bus : m', 0, {'k': 6, 'r': 1}, '1', 'correct'),
    spec('Erreur : bus de 12 cm', 0, {'k': 6, 'r': 1}, '0', 'incorrect'),
    spec('trajet : km', 0, {'k': 9, 'r': 2}, '2', 'correct'),
    spec('Erreur : trajet de 3 m', 0, {'k': 9, 'r': 2}, '1', 'incorrect'),
]

# ---- 3. Relations m, cm, km (CE1-043) ----

UN_M_UN_KM = variation(
    'Complète.\n\n$1~\\unit{{{if:s==1|m|km}}} = ?~\\text{{{if:s==1|cm|m}}}$',
    [ev('100+900*(s-1)')], [var('s', '1..2')],
    ['{{if:s==1|Dans un mètre, il y a cent centimètres.|Dans un kilomètre, il y a mille'
     ' mètres.}}',
     '$$1~\\unit{{{if:s==1|m|km}}} = ' + col('{{if:s==1|100|' + MILLE + '}}')
     + '~\\unit{{{if:s==1|cm|m}}}$$'])

METRES_EN_CM = variation(
    'Complète.\n\n${{a}}~\\unit{m} = ?~\\text{cm}$', [ev('100*a')], [var('a', '2..9')],
    ['Un mètre, c\'est $100~\\unit{cm}$ : ${{a}}~\\unit{m}$, c\'est ${{a}}$ fois'
     ' $100~\\unit{cm}$, ${{a}}$ centaines de centimètres.',
     '$${{a}}~\\unit{m} = ' + col(ev('100*a')) + '~\\unit{cm}$$'])

# BO : 1 m + 46 cm = 146 cm
M_PLUS_CM = variation(
    'Complète.\n\n${{a}}~\\unit{m} + {{b}}~\\unit{cm} = ?~\\text{cm}$', [ev('100*a+b')],
    [var('a', '1..9'), var('b', '1..99')],
    ['On écrit d\'abord les mètres en centimètres : ${{a}}~\\unit{m} = ' + ev('100*a')
     + '~\\unit{cm}$.', 'Puis on ajoute les centimètres :',
     '$$' + ev('100*a') + ' + {{b}} = ' + col(ev('100*a+b')) + '$$',
     '${{a}}~\\unit{m} + {{b}}~\\unit{cm} = ' + ev('100*a+b') + '~\\unit{cm}$.'])

CM_EN_M_ET_CM = variation(
    'Complète.\n\n$' + ev('100*a+b') + '~\\unit{cm} = ?~\\text{m}~?~\\text{cm}$',
    ['{{a}}', '{{b}}'], [var('a', '1..9'), var('b', '1..99')],
    ['Dans $' + ev('100*a+b') + '~\\unit{cm}$, il y a ${{a}}$ {{if:a==1|centaine|centaines}}'
     ' de centimètres, c\'est-à-dire ${{a}}~\\unit{m}$, et il reste ${{b}}~\\unit{cm}$.',
     '$$' + ev('100*a+b') + '~\\unit{cm} = ' + col('{{a}}') + '~\\unit{m}~' + col('{{b}}')
     + '~\\unit{cm}$$'])

VERS_UN_KM = variation(
    'Complète.\n\n${{a}}~\\unit{m} + ?~\\text{m} = 1~\\unit{km}$', [ev('1000-a')],
    [var('k', '2..18'), var('a', 'eval:50*k')],
    ['$1~\\unit{km} = ' + MILLE + '~\\unit{m}$ : on cherche ce qu\'il faut ajouter à ${{a}}$'
     ' pour arriver à $' + MILLE + '$.',
     '$${{a}} + ' + col(ev('1000-a')) + ' = ' + MILLE + '$$'])

SPECS_RELATIONS = [
    spec('1 m = 100 cm', 0, {'s': 1}, '100', 'correct'),
    spec('Erreur : 1 m = 10 cm', 0, {'s': 1}, '10', 'incorrect'),
    spec('1 km = 1 000 m', 0, {'s': 2}, '1000', 'correct'),
    spec('Erreur : 1 km = 100 m', 0, {'s': 2}, '100', 'incorrect'),
    spec('3 m = 300 cm', 1, {'a': 3}, '300', 'correct'),
    spec('Erreur : 3 m = 30 cm', 1, {'a': 3}, '30', 'incorrect'),
    spec('BO : 1 m + 46 cm = 146 cm', 2, {'a': 1, 'b': 46}, '146', 'correct'),
    spec('Erreur : 1 + 46 = 47', 2, {'a': 1, 'b': 46}, '47', 'incorrect'),
    spec('Erreur : 1 m + 46 cm = 1 046', 2, {'a': 1, 'b': 46}, '1046', 'incorrect'),
    spec('1 m + 5 cm = 105 cm', 2, {'a': 1, 'b': 5}, '105', 'correct'),
    spec('Erreur : 1 m + 5 cm = 15 cm', 2, {'a': 1, 'b': 5}, '15', 'incorrect'),
    spec('146 cm = 1 m 46 cm', 3, {'a': 1, 'b': 46}, ['1', '46'], 'correct'),
    spec('Erreur : 146 cm = 14 m 6 cm', 3, {'a': 1, 'b': 46}, ['14', '6'], 'incorrect'),
    spec('650 m + 350 m = 1 km', 4, {'k': 13, 'a': 650}, '350', 'correct'),
    spec('Erreur : retenue oubliée (450)', 4, {'k': 13, 'a': 650}, '450', 'incorrect'),
]

# ---- 4. Comparer des longueurs (CE1-045) ----
# Une égalité de temps en temps (comme « Comparer » des entiers et des fractions)

COMPARER = 'Compare ces deux longueurs.\n\n$$'

M_ET_CM = variation(
    COMPARER + '{{a}}~\\unit{m} \\quad \\ldots \\quad {{b}}~\\unit{cm}$$' + SIGNES, ['{{r}}'],
    [var('a', '1..9'), var('k', '0..18'), var('b', 'eval:100*a+10*(k-9)'),
     var('r', 'eval:sign(100*a-b)+1')],
    ['On écrit les deux longueurs dans la même unité : ${{a}}~\\unit{m} = ' + ev('100*a')
     + '~\\unit{cm}$.', '$$' + ev('100*a') + '~\\unit{cm} ' + SIGNE + ' {{b}}~\\unit{cm}$$',
     '$${{a}}~\\unit{m} ' + col(SIGNE) + ' {{b}}~\\unit{cm}$$'])

M_CM_ET_CM = variation(
    COMPARER + '{{a}}~\\unit{m}~{{b}}~\\unit{cm} \\quad \\ldots \\quad {{c}}~\\unit{cm}$$'
    + SIGNES, ['{{r}}'],
    [var('a', '1..8'), var('b', '1..99'), var('k', '0..40'), var('c', 'eval:100*a+b+k-20'),
     var('r', 'eval:sign(100*a+b-c)+1')],
    ['On écrit les deux longueurs dans la même unité : ${{a}}~\\unit{m}~{{b}}~\\unit{cm} = '
     + ev('100*a') + '~\\unit{cm} + {{b}}~\\unit{cm} = ' + ev('100*a+b') + '~\\unit{cm}$.',
     '$$' + ev('100*a+b') + '~\\unit{cm} ' + SIGNE + ' {{c}}~\\unit{cm}$$',
     '$${{a}}~\\unit{m}~{{b}}~\\unit{cm} ' + col(SIGNE) + ' {{c}}~\\unit{cm}$$'])

KM_ET_M = variation(
    COMPARER + '1~\\unit{km} \\quad \\ldots \\quad {{b}}~\\unit{m}$$' + SIGNES, ['{{r}}'],
    [var('k', '2..20'), var('b', 'eval:50*k'), var('r', 'eval:sign(1000-b)+1')],
    ['On écrit les deux longueurs dans la même unité : $1~\\unit{km} = ' + MILLE
     + '~\\unit{m}$.', '$$' + MILLE + '~\\unit{m} ' + SIGNE + ' {{b}}~\\unit{m}$$',
     '$$1~\\unit{km} ' + col(SIGNE) + ' {{b}}~\\unit{m}$$'])

SPECS_COMPARER = [
    spec('2 m > 150 cm', 0, {'a': 2, 'k': 4, 'b': 150, 'r': 2}, '2', 'correct'),
    spec('Erreur : 2 m < 150 cm (nombres seuls)', 0, {'a': 2, 'k': 4, 'b': 150, 'r': 2}, '0',
         'incorrect'),
    spec('3 m = 300 cm', 0, {'a': 3, 'k': 9, 'b': 300, 'r': 1}, '1', 'correct'),
    spec('1 m 20 cm < 125 cm', 1, {'a': 1, 'b': 20, 'k': 25, 'c': 125, 'r': 0}, '0', 'correct'),
    spec('Erreur : 1 m 20 cm > 125 cm', 1, {'a': 1, 'b': 20, 'k': 25, 'c': 125, 'r': 0}, '2',
         'incorrect'),
    spec('1 km > 900 m', 2, {'k': 18, 'b': 900, 'r': 2}, '2', 'correct'),
    spec('Erreur : 1 km < 900 m', 2, {'k': 18, 'b': 900, 'r': 2}, '0', 'incorrect'),
    spec('1 km = 1 000 m', 2, {'k': 20, 'b': 1000, 'r': 1}, '1', 'correct'),
]

# ---- 5. Longueurs de référence (CE1-046) ----

REFERENCES = ('Quelques longueurs à retenir : la largeur d\'un doigt fait environ $1~\\unit{cm}$,'
              ' la hauteur d\'une porte environ $2~\\unit{m}$, un terrain de football environ'
              ' $100~\\unit{m}$ ; à pied, on fait environ $1~\\unit{km}$ en un quart d\'heure.')

# La bonne réponse en premier (mélangée à l'affichage) : r = 0
QUOI = [  # (longueur, juste, leurre, leurre)
    (L(1, 'cm'), 'la largeur d\'un doigt', 'la longueur d\'un crayon',
     'la hauteur d\'une porte'),
    (L(1, 'm'), 'la largeur d\'une porte', 'la largeur d\'un doigt',
     'la longueur d\'un terrain de football'),
    (L(2, 'm'), 'la hauteur d\'une porte', 'la longueur d\'une gomme', 'la longueur d\'un bus'),
    (L(100, 'm'), 'la longueur d\'un terrain de football', 'la longueur d\'une voiture',
     'la hauteur d\'une porte'),
    (L(1, 'km'), 'le chemin qu\'on fait à pied en un quart d\'heure', 'le tour de la classe',
     'la longueur d\'un crayon'),
]

QUI_MESURE = variation(
    'Qu\'est-ce qui mesure environ ' + selon('k', [q[0] for q in QUOI]) + ' ?'
    + choix([selon('k', [q[j] for q in QUOI]) for j in (1, 2, 3)]), ['0'],
    [var('k', '1..5')],
    [REFERENCES, 'C\'est ' + selon('k', [q[1] for q in QUOI]) + ' qui mesure environ '
     + selon('k', [q[0] for q in QUOI]) + '.'])

# Deux en cm, deux en m, deux en km : r = floor((k-1)/2)
ENVIRON = [('La largeur d\'un doigt', 1), ('Une règle d\'écolier', 20),
           ('La hauteur d\'une porte', 2), ('Un terrain de football', 100),
           ('Le chemin qu\'on fait à pied en un quart d\'heure', 1),
           ('Le chemin qu\'on fait à pied en une heure', 4)]
NOMBRE_K = selon('k', [str(n) for _, n in ENVIRON])

MESURE_ENVIRON = variation(
    selon('k', [o for o, _ in ENVIRON]) + ' mesure environ…'
    + choix(['$' + NOMBRE_K + '~\\unit{' + u + '}$' for u in SYMBOLES[::-1]], melanger=False),
    ['{{r}}'], [var('k', '1..6'), var('r', 'eval:floor((k-1)/2)')],
    [REFERENCES, selon('k', [o for o, _ in ENVIRON]) + ' mesure environ $' + NOMBRE_K
     + '~\\unit{{{if:r==0|cm|{{if:r==1|m|km}}}}}$.'])

SPECS_REFERENCES = [
    spec('environ 1 cm : le doigt', 0, {'k': 1}, '0', 'correct'),
    spec('Erreur : 1 cm, le crayon', 0, {'k': 1}, '1', 'incorrect'),
    spec('environ 1 km : un quart d\'heure à pied', 0, {'k': 5}, '0', 'correct'),
    spec('Erreur : 1 km, le tour de la classe', 0, {'k': 5}, '1', 'incorrect'),
    spec('porte : 2 m', 1, {'k': 3, 'r': 1}, '1', 'correct'),
    spec('Erreur : porte de 2 cm', 1, {'k': 3, 'r': 1}, '0', 'incorrect'),
    spec('une heure à pied : 4 km', 1, {'k': 6, 'r': 2}, '2', 'correct'),
]

# ---- 6. Estimer une longueur (CE1-047) ----
# BO : « une trousse, plutôt 2 cm, 20 cm ou 2 m ». Trois réponses de plus en plus grandes ;
# trois objets par bonne réponse : r = floor((k-1)/3)

ESTIMER = [  # (objet, petite, moyenne, grande)
    ('Une gomme', L(4, 'cm'), L(40, 'cm'), L(4, 'm')),
    ('Un timbre', L(3, 'cm'), L(30, 'cm'), L(3, 'm')),
    ('Un bus', L(12, 'm'), L(120, 'm'), L(12, 'km')),
    ('Une trousse', L(2, 'cm'), L(20, 'cm'), L(2, 'm')),
    ('Un livre', L(3, 'cm'), L(30, 'cm'), L(3, 'm')),
    ('Un tour de piste d\'athlétisme', L(40, 'm'), L(400, 'm'), L(4, 'km')),
    ('Un lit', L(2, 'cm'), L(20, 'cm'), L(2, 'm')),
    ('Une voiture', L(4, 'cm'), L(40, 'cm'), L(4, 'm')),
    ('Une randonnée d\'une journée', L(15, 'm'), L(150, 'm'), L(15, 'km')),
]
OBJET_K = selon('k', [o[0] for o in ESTIMER])

PLUTOT = variation(
    OBJET_K + ' mesure plutôt…'
    + choix([selon('k', [o[j] for o in ESTIMER]) for j in (1, 2, 3)], melanger=False),
    ['{{r}}'], [var('k', '1..9'), var('r', 'eval:floor((k-1)/3)')],
    ['On compare avec des longueurs connues : un doigt fait environ $1~\\unit{cm}$, une porte'
     ' environ $2~\\unit{m}$ de haut, et on fait $1~\\unit{km}$ à pied en un quart d\'heure.',
     OBJET_K + ' mesure plutôt ' + selon('k', [o[1 + (k // 3)] for k, o in enumerate(ESTIMER)])
     + '.'])

SPECS_ESTIMER = [
    spec('BO : trousse, 20 cm', 0, {'k': 4, 'r': 1}, '1', 'correct'),
    spec('Erreur : trousse de 2 cm', 0, {'k': 4, 'r': 1}, '0', 'incorrect'),
    spec('Erreur : trousse de 2 m', 0, {'k': 4, 'r': 1}, '2', 'incorrect'),
    spec('gomme : 4 cm', 0, {'k': 1, 'r': 0}, '0', 'correct'),
    spec('randonnée : 15 km', 0, {'k': 9, 'r': 2}, '2', 'correct'),
    spec('Erreur : randonnée de 150 m', 0, {'k': 9, 'r': 2}, '1', 'incorrect'),
]

MODELES = {
    '01-unites-de-longueur': modele(
        'Les unités de longueur : km, m, cm',
        'Symbole et sens de km, m, cm ; la plus grande et la plus petite des trois unités',
        'Unités', 5, [SYMBOLE, SENS, PLUS_GRANDE], SPECS_UNITES, delay=45),
    '02-choisir-l-unite': modele(
        'Centimètre, mètre ou kilomètre ?',
        'Choisir l\'unité qui convient : un crayon de 15 cm, un bus de 12 m, un trajet de 3 km',
        'Unités', 6, [CHOISIR], SPECS_CHOISIR, delay=45),
    '03-relations-m-cm-km': modele(
        'Mètres, centimètres et kilomètres',
        '1 m = 100 cm, 1 km = 1 000 m ; 3 m = 300 cm ; 1 m + 46 cm = 146 cm ; 146 cm = 1 m'
        ' 46 cm ; ce qu\'il manque pour 1 km',
        'Unités', 7, [UN_M_UN_KM, METRES_EN_CM, M_PLUS_CM, CM_EN_M_ET_CM, VERS_UN_KM],
        SPECS_RELATIONS, delay=90),
    '04-comparer-des-longueurs': modele(
        'Comparer des longueurs',
        'Deux longueurs dans deux unités : 2 m et 150 cm ; 1 m 20 cm et 125 cm ; 1 km et'
        ' 900 m', 'Comparaison et mesure', 3, [M_ET_CM, M_CM_ET_CM, KM_ET_M], SPECS_COMPARER),
    '05-longueurs-de-reference': modele(
        'Des longueurs de référence',
        'Doigt 1 cm, porte 2 m, terrain de football 100 m, 1 km à pied en un quart d\'heure',
        'Ordres de grandeur', 4, [QUI_MESURE, MESURE_ENVIRON], SPECS_REFERENCES, delay=45),
    '06-estimer-une-longueur': modele(
        'Estimer une longueur',
        'Une trousse mesure plutôt 2 cm, 20 cm ou 2 m ?', 'Ordres de grandeur', 5, [PLUTOT],
        SPECS_ESTIMER, delay=45),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
