"""Écrit les 9 modèles du lot 6a du CE2 (longueurs et masses) dans scripts/questions/ce2-6a/.

Phase 0 validée par David le 2026-11-01 (§ 10 du journal `docs/wip/questions-ce2-progress.md`).
Bornes `cycle2.json`, CE2-035 à 038 (longueurs) et 045 à 048 (masses) :
- 035 : m, dm, cm, mm, km et leurs symboles ; 036 : cm–mm, m–dm–cm, km–m, 1 cm = 10 mm,
  1 m = 1 000 mm (16 m = 1 600 cm = 160 dm ; 5 km + 750 m = 5 750 m), sans tableau ni virgule ;
  037 : choix de l'unité parmi m, dm, cm, mm, km ; 038 : comparer des longueurs ;
- 045 : g, kg, t ; 046 : choix parmi g, kg, t ; 047 : g–kg et kg–t (5 462 g = 5 kg + 462 g ;
  5 350 kg = 5 t 350 kg), pas de g–t ; 048 : trois ou quatre objets, masses en kg, g ou t.
Décisions : réponses en case, sauf les choix d'unité (case choix) ; « comparer » = signe
(deux valeurs) + bloc `ranger` (trois ou quatre) ; « bonne réponse en premier » pour un choix
mélangé à l'affichage (réponse `0`) ; catégories du CE1 (`Grandeurs · Longueurs · …`,
`Grandeurs · Masses · …`), niveaux libres relevés au MCP le 2026-11-01 (à relire avant la
publication) : Longueurs Unités 2, 4-7 pris → 8 à 11 ; Comparaison et mesure 1-3 → 4 ;
Masses Unités 1-2 → 3 à 5 ; Masses Comparaison 1-2 → 3.

    python3 docs/wip/questions/lot-ce2-6a.py scripts/questions/ce2-6a
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


def modele(title, description, domain, subdomain, level, variations, specs, delay=60):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (sous-notion du point) est posé par la migration
    return {'title': title, 'description': description, 'grades': ['CE2'], 'theme': 'Grandeurs',
            'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': delay,
            'status': 'draft', 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, reponses, variables, etapes, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    if reponses:  # sans case écrite : bloc ```ranger (une case par place)
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


def U(n, u):
    """Mesure en formule : $15~\\unit{cm}$ (n est un texte ou une expression `{{…}}`)."""
    return '$' + str(n) + '~\\unit{' + u + '}$'


def etiquettes(signe, noms):
    return ('```ranger\nsigne: ' + signe + '\n' + '\n'.join('- ' + n for n in noms)
            + '\n```')


MILLE = '1\\,000'
# Signe de comparaison selon r (0 : <, 1 : =, 2 : >)
SIGNE = '{{if:r==0|<|{{if:r==1|=|>}}}}'
SIGNES = choix(['$<$', '$=$', '$>$'], melanger=False)

# =============================== LONGUEURS ===============================

# ---- 01. Unités de longueur (CE2-035) ----

NOMS_L = ['kilomètre', 'mètre', 'décimètre', 'centimètre', 'millimètre']
SYMBOLES_L = ['km', 'm', 'dm', 'cm', 'mm']
LIGNES_L = ['le kilomètre (km)', 'le mètre (m)', 'le décimètre (dm)', 'le centimètre (cm)',
            'le millimètre (mm)']

SYMBOLE_L = variation(
    'Quel est le symbole du ' + selon('k', NOMS_L) + ' ?' + choix(SYMBOLES_L), ['{{r}}'],
    [var('k', '1..5'), var('r', 'eval:k-1')],
    ['km pour le kilomètre, m pour le mètre, dm pour le décimètre, cm pour le centimètre et'
     ' mm pour le millimètre.',
     'Le ' + selon('k', NOMS_L) + ' s\'écrit **' + selon('k', SYMBOLES_L) + '**.'])

SENS_L = variation(
    'Que veut dire le symbole **' + selon('k', SYMBOLES_L) + '** ?' + choix(NOMS_L), ['{{r}}'],
    [var('k', '1..5'), var('r', 'eval:k-1')],
    ['km veut dire kilomètre, m mètre, dm décimètre, cm centimètre et mm millimètre.',
     '**' + selon('k', SYMBOLES_L) + '** veut dire **' + selon('k', NOMS_L) + '**.'])

EXTREME_L = variation(
    'Quelle est la plus {{if:s==1|grande|petite}} de ces unités de longueur ?'
    + choix(LIGNES_L, melanger=False), ['{{r}}'],
    [var('s', '1..2'), var('r', 'eval:4*(s-1)')],
    ['$1~\\unit{km} = ' + MILLE + '~\\unit{m}$, $1~\\unit{m} = 10~\\unit{dm}$,'
     ' $1~\\unit{dm} = 10~\\unit{cm}$ et $1~\\unit{cm} = 10~\\unit{mm}$.',
     'Du plus grand au plus petit : km, m, dm, cm, mm. La plus'
     ' {{if:s==1|grande est le **kilomètre**|petite est le **millimètre**}}.'])

# Couples (la plus grande, la plus petite) ; la bonne réponse est la plus grande
GRANDES = ['le mètre', 'le décimètre', 'le centimètre', 'le kilomètre', 'le mètre',
           'le décimètre']
PETITES = ['le décimètre', 'le centimètre', 'le millimètre', 'le mètre', 'le centimètre',
           'le millimètre']
RELATIONS_PAIRES = ['$1~\\unit{m} = 10~\\unit{dm}$', '$1~\\unit{dm} = 10~\\unit{cm}$',
                    '$1~\\unit{cm} = 10~\\unit{mm}$', '$1~\\unit{km} = ' + MILLE
                    + '~\\unit{m}$', '$1~\\unit{m} = 100~\\unit{cm}$',
                    '$1~\\unit{dm} = 100~\\unit{mm}$']
GRANDE_K = selon('k', GRANDES)
PETITE_K = selon('k', PETITES)

DEUX_UNITES = variation(
    'Quelle est la plus grande de ces deux unités de longueur ?'
    + choix(['{{if:s==1|' + GRANDE_K + '|' + PETITE_K + '}}',
             '{{if:s==1|' + PETITE_K + '|' + GRANDE_K + '}}'], melanger=False),
    ['{{eval:s-1}}'], [var('k', '1..6'), var('s', '1..2')],
    ['Il faut plusieurs petites unités pour faire une grande : ' + selon('k', RELATIONS_PAIRES)
     + '.', 'La plus grande est **' + GRANDE_K + '**.'])

SPECS_UNITES_L = [
    spec('symbole du décimètre : dm', 0, {'k': 3, 'r': 2}, '2', 'correct'),
    spec('Erreur : décimètre → cm', 0, {'k': 3, 'r': 2}, '3', 'incorrect'),
    spec('symbole du millimètre : mm', 0, {'k': 5, 'r': 4}, '4', 'correct'),
    spec('dm veut dire décimètre', 1, {'k': 3, 'r': 2}, '2', 'correct'),
    spec('Erreur : dm lu centimètre', 1, {'k': 3, 'r': 2}, '3', 'incorrect'),
    spec('la plus grande : km', 2, {'s': 1, 'r': 0}, '0', 'correct'),
    spec('la plus petite : mm', 2, {'s': 2, 'r': 4}, '4', 'correct'),
    spec('Erreur : la plus petite → cm', 2, {'s': 2, 'r': 4}, '3', 'incorrect'),
    spec('m plus grand que dm (m en 1er)', 3, {'k': 1, 's': 1}, '0', 'correct'),
    spec('Erreur : dm plus grand que m', 3, {'k': 1, 's': 1}, '1', 'incorrect'),
    spec('cm plus grand que mm (cm en 2e)', 3, {'k': 3, 's': 2}, '1', 'correct'),
    spec('Erreur : mm plus grand que cm', 3, {'k': 3, 's': 2}, '0', 'incorrect'),
]

# ---- 04. Choisir l'unité (CE2-037) ----
# Trois objets par unité, dans l'ordre mm, cm, dm, m, km : r = floor((k-1)/3)

OBJETS_L = ['L\'épaisseur d\'une pièce de monnaie mesure $2$', 'La longueur d\'une fourmi'
            ' mesure $5$', 'L\'épaisseur d\'une vitre mesure $4$',
            'Un crayon mesure $15$', 'Un cahier mesure $30$', 'Une gomme mesure $4$',
            'La hauteur d\'une table d\'écolier mesure $7$', 'La largeur d\'un bureau'
            ' mesure $12$', 'La hauteur d\'un cartable mesure $4$',
            'La porte de la classe mesure $2$', 'Un bus mesure $12$',
            'Une piscine mesure $25$',
            'Le trajet de la maison à la piscine fait $3$', 'Une course à pied fait $10$',
            'La route entre deux villes voisines fait $15$']
UNITE_PLURIEL_L = ('{{if:r==0|millimètres|{{if:r==1|centimètres|{{if:r==2|décimètres'
                   '|{{if:r==3|mètres|kilomètres}}}}}}}}')
SYMBOLE_R_L = '{{if:r==0|mm|{{if:r==1|cm|{{if:r==2|dm|{{if:r==3|m|km}}}}}}}}'

CHOISIR_L = variation(
    selon('k', OBJETS_L) + ' …\n\nQuelle unité convient ?'
    + choix(['mm', 'cm', 'dm', 'm', 'km'], melanger=False), ['{{r}}'],
    [var('k', '1..15'), var('r', 'eval:floor((k-1)/3)')],
    ['{{if:r==0|C\'est très petit, plus fin qu\'un doigt : on mesure en millimètres.'
     '|{{if:r==1|C\'est un petit objet, qu\'on tient dans la main : on mesure en centimètres.'
     '|{{if:r==2|C\'est un peu plus grand qu\'une main, moins qu\'une porte : on mesure en'
     ' décimètres.|{{if:r==3|C\'est grand comme une pièce ou un véhicule : on mesure en mètres.'
     '|C\'est une longue distance, qu\'on parcourt à pied ou en voiture : on mesure en'
     ' kilomètres.}}}}}}}}',
     selon('k', OBJETS_L) + ' ' + UNITE_PLURIEL_L + ' (**' + SYMBOLE_R_L + '**).'])

SPECS_CHOISIR_L = [
    spec('pièce de monnaie : mm', 0, {'k': 1, 'r': 0}, '0', 'correct'),
    spec('Erreur : pièce de 2 cm', 0, {'k': 1, 'r': 0}, '1', 'incorrect'),
    spec('crayon : cm', 0, {'k': 4, 'r': 1}, '1', 'correct'),
    spec('table d\'écolier : dm', 0, {'k': 7, 'r': 2}, '2', 'correct'),
    spec('Erreur : table de 7 m', 0, {'k': 7, 'r': 2}, '3', 'incorrect'),
    spec('bus : m', 0, {'k': 11, 'r': 3}, '3', 'correct'),
    spec('Erreur : bus de 12 cm', 0, {'k': 11, 'r': 3}, '1', 'incorrect'),
    spec('trajet : km', 0, {'k': 13, 'r': 4}, '4', 'correct'),
    spec('Erreur : trajet de 3 m', 0, {'k': 13, 'r': 4}, '3', 'incorrect'),
]

# ---- 02. Relations m · dm · cm · mm (CE2-036) ----
# 1 m = 10 dm = 100 cm = 1 000 mm ; 1 dm = 10 cm = 100 mm ; 1 cm = 10 mm

RANGS = ['m', 'dm', 'cm', 'mm']
RANG_X = selon('x', RANGS)
RANG_Y = selon('y', RANGS)
FOIS = {1: '10', 2: '100', 3: MILLE}
PUISSANCE = '{{if:y-x==1|10|{{if:y-x==2|100|' + MILLE + '}}}}'

UN_EN_PETITE = variation(
    'Complète.\n\n$1~\\unit{' + RANG_X + '} = ?~\\text{' + RANG_Y + '}$',
    [ev('10^(y-x)')], [var('x', '1..3'), var('y', '2..4')],
    ['Entre ces deux unités, il faut multiplier par ' + PUISSANCE + ' : un ' + RANG_X + ' vaut'
     ' ' + PUISSANCE + ' ' + RANG_Y + '.',
     '$$1~\\unit{' + RANG_X + '} = ' + col(PUISSANCE) + '~\\unit{' + RANG_Y + '}$$'],
    conditions=['x < y'])

M_EN_CM = variation(
    'Complète.\n\n${{a}}~\\unit{m} = ?~\\text{cm}$', [ev('100*a')], [var('a', '2..30')],
    ['Un mètre, c\'est $100~\\unit{cm}$ : ${{a}}~\\unit{m}$, c\'est ${{a}}$ fois'
     ' $100~\\unit{cm}$.', '$${{a}}~\\unit{m} = ' + col(ev('100*a')) + '~\\unit{cm}$$'])

M_EN_DM = variation(
    'Complète.\n\n${{a}}~\\unit{m} = ?~\\text{dm}$', [ev('10*a')], [var('a', '2..30')],
    ['Un mètre, c\'est $10~\\unit{dm}$ : ${{a}}~\\unit{m}$, c\'est ${{a}}$ fois'
     ' $10~\\unit{dm}$.', '$${{a}}~\\unit{m} = ' + col(ev('10*a')) + '~\\unit{dm}$$'])

CM_EN_MM = variation(
    'Complète.\n\n${{a}}~\\unit{cm} = ?~\\text{mm}$', [ev('10*a')], [var('a', '2..99')],
    ['Un centimètre, c\'est $10~\\unit{mm}$ : ${{a}}~\\unit{cm}$, c\'est ${{a}}$ fois'
     ' $10~\\unit{mm}$.', '$${{a}}~\\unit{cm} = ' + col(ev('10*a')) + '~\\unit{mm}$$'])

# BO : 16 m = 1 600 cm = 160 dm
M_EN_CM_ET_DM = variation(
    'Complète.\n\n${{a}}~\\unit{m} = ?~\\text{cm} = ?~\\text{dm}$', [ev('100*a'), ev('10*a')],
    [var('a', '2..30')],
    ['Un mètre, c\'est $100~\\unit{cm}$ et c\'est $10~\\unit{dm}$.',
     '$${{a}}~\\unit{m} = ' + col(ev('100*a')) + '~\\unit{cm} = ' + col(ev('10*a'))
     + '~\\unit{dm}$$'])

CM_EN_M = variation(
    'Complète.\n\n$' + ev('100*a') + '~\\unit{cm} = ?~\\text{m}$', ['{{a}}'],
    [var('a', '2..30')],
    ['Cent centimètres font un mètre : dans $' + ev('100*a') + '~\\unit{cm}$, il y a ${{a}}$'
     ' fois cent centimètres.', '$$' + ev('100*a') + '~\\unit{cm} = ' + col('{{a}}')
     + '~\\unit{m}$$'])

CM_EN_DM = variation(
    'Complète.\n\n$' + ev('10*a') + '~\\unit{cm} = ?~\\text{dm}$', ['{{a}}'],
    [var('a', '2..99')],
    ['Dix centimètres font un décimètre : dans $' + ev('10*a') + '~\\unit{cm}$, il y a ${{a}}$'
     ' fois dix centimètres.', '$$' + ev('10*a') + '~\\unit{cm} = ' + col('{{a}}')
     + '~\\unit{dm}$$'])

MM_EN_CM = variation(
    'Complète.\n\n$' + ev('10*a') + '~\\unit{mm} = ?~\\text{cm}$', ['{{a}}'],
    [var('a', '2..99')],
    ['Dix millimètres font un centimètre : dans $' + ev('10*a') + '~\\unit{mm}$, il y a ${{a}}$'
     ' fois dix millimètres.', '$$' + ev('10*a') + '~\\unit{mm} = ' + col('{{a}}')
     + '~\\unit{cm}$$'])

SPECS_REL_L = [
    spec('1 m = 10 dm', 0, {'x': 1, 'y': 2}, '10', 'correct'),
    spec('1 m = 1 000 mm', 0, {'x': 1, 'y': 4}, '1000', 'correct'),
    spec('Erreur : 1 m = 100 mm', 0, {'x': 1, 'y': 4}, '100', 'incorrect'),
    spec('1 dm = 100 mm', 0, {'x': 2, 'y': 4}, '100', 'correct'),
    spec('1 cm = 10 mm', 0, {'x': 3, 'y': 4}, '10', 'correct'),
    spec('16 m = 1 600 cm', 1, {'a': 16}, '1600', 'correct'),
    spec('Erreur : 16 m = 160 cm', 1, {'a': 16}, '160', 'incorrect'),
    spec('Erreur : 16 m = 116 cm', 1, {'a': 16}, '116', 'incorrect'),
    spec('16 m = 160 dm', 2, {'a': 16}, '160', 'correct'),
    spec('Erreur : 16 m = 1 600 dm', 2, {'a': 16}, '1600', 'incorrect'),
    spec('25 cm = 250 mm', 3, {'a': 25}, '250', 'correct'),
    spec('Erreur : 25 cm = 25 mm', 3, {'a': 25}, '25', 'incorrect'),
    spec('16 m = 1 600 cm = 160 dm', 4, {'a': 16}, ['1600', '160'], 'correct'),
    spec('Erreur : cm et dm échangés', 4, {'a': 16}, ['160', '1600'], 'incorrect'),
    spec('1 600 cm = 16 m', 5, {'a': 16}, '16', 'correct'),
    spec('Erreur : 1 600 cm = 160 m', 5, {'a': 16}, '160', 'incorrect'),
    spec('250 cm = 25 dm', 6, {'a': 25}, '25', 'correct'),
    spec('Erreur : 250 cm = 2 500 dm', 6, {'a': 25}, '2500', 'incorrect'),
    spec('250 mm = 25 cm', 7, {'a': 25}, '25', 'correct'),
    spec('Erreur : 250 mm = 2 500 cm', 7, {'a': 25}, '2500', 'incorrect'),
]

# ---- 03. Relations km · m (CE2-036) ----

KM_EN_M = variation(
    'Complète.\n\n${{a}}~\\unit{km} = ?~\\text{m}$', [ev('1000*a')], [var('a', '1..30')],
    ['Un kilomètre, c\'est $' + MILLE + '~\\unit{m}$ : ${{a}}~\\unit{km}$, c\'est ${{a}}$ fois'
     ' $' + MILLE + '~\\unit{m}$.', '$${{a}}~\\unit{km} = ' + col(ev('1000*a'))
     + '~\\unit{m}$$'])

M_EN_KM = variation(
    'Complète.\n\n$' + ev('1000*a') + '~\\unit{m} = ?~\\text{km}$', ['{{a}}'],
    [var('a', '2..30')],
    ['Mille mètres font un kilomètre : dans $' + ev('1000*a') + '~\\unit{m}$, il y a ${{a}}$'
     ' fois mille mètres.', '$$' + ev('1000*a') + '~\\unit{m} = ' + col('{{a}}')
     + '~\\unit{km}$$'])

# BO : 5 km + 750 m = 5 750 m ; b < 1 000, avec des zéros (5 km 40 m = 5 040 m)
KM_PLUS_M = variation(
    'Complète.\n\n${{a}}~\\unit{km} + {{b}}~\\unit{m} = ?~\\text{m}$', [ev('1000*a+b')],
    [var('a', '1..30'), var('b', '1..999')],
    ['On écrit d\'abord les kilomètres en mètres : ${{a}}~\\unit{km} = ' + ev('1000*a')
     + '~\\unit{m}$.', 'Puis on ajoute les mètres :',
     '$$' + ev('1000*a') + ' + {{b}} = ' + col(ev('1000*a+b')) + '$$',
     '${{a}}~\\unit{km} + {{b}}~\\unit{m} = ' + ev('1000*a+b') + '~\\unit{m}$.'])

M_EN_KM_ET_M = variation(
    'Complète.\n\n$' + ev('1000*a+b') + '~\\unit{m} = ?~\\text{km}~?~\\text{m}$',
    ['{{a}}', '{{b}}'], [var('a', '1..30'), var('b', '1..999')],
    ['Dans $' + ev('1000*a+b') + '~\\unit{m}$, il y a ${{a}}$ {{if:a==1|millier|milliers}} de'
     ' mètres, c\'est-à-dire ${{a}}~\\unit{km}$, et il reste ${{b}}~\\unit{m}$.',
     '$$' + ev('1000*a+b') + '~\\unit{m} = ' + col('{{a}}') + '~\\unit{km}~' + col('{{b}}')
     + '~\\unit{m}$$'])

SPECS_REL_KM = [
    spec('5 km = 5 000 m', 0, {'a': 5}, '5000', 'correct'),
    spec('Erreur : 5 km = 500 m', 0, {'a': 5}, '500', 'incorrect'),
    spec('7 000 m = 7 km', 1, {'a': 7}, '7', 'correct'),
    spec('Erreur : 7 000 m = 700 km', 1, {'a': 7}, '700', 'incorrect'),
    spec('BO : 5 km + 750 m = 5 750 m', 2, {'a': 5, 'b': 750}, '5750', 'correct'),
    spec('Erreur : 5 km + 750 m = 5 + 750', 2, {'a': 5, 'b': 750}, '755', 'incorrect'),
    spec('5 km + 40 m = 5 040 m', 2, {'a': 5, 'b': 40}, '5040', 'correct'),
    spec('Erreur : 5 km + 40 m = 5 400 m (zéro oublié)', 2, {'a': 5, 'b': 40}, '5400',
         'incorrect'),
    spec('5 750 m = 5 km 750 m', 3, {'a': 5, 'b': 750}, ['5', '750'], 'correct'),
    spec('Erreur : 5 750 m = 57 km 50 m', 3, {'a': 5, 'b': 750}, ['57', '50'], 'incorrect'),
    spec('2 040 m = 2 km 40 m', 3, {'a': 2, 'b': 40}, ['2', '40'], 'correct'),
]

# ---- 05. Comparer des longueurs (CE2-038) ----

COMPARER_L = 'Compare ces deux longueurs.\n\n$$'

M_ET_CM = variation(
    COMPARER_L + '{{a}}~\\unit{m} \\quad \\ldots \\quad {{b}}~\\unit{cm}$$' + SIGNES, ['{{r}}'],
    [var('a', '1..9'), var('k', '0..18'), var('b', 'eval:100*a+10*(k-9)'),
     var('r', 'eval:sign(100*a-b)+1')],
    ['On écrit les deux longueurs dans la même unité : ${{a}}~\\unit{m} = ' + ev('100*a')
     + '~\\unit{cm}$.', '$$' + ev('100*a') + '~\\unit{cm} ' + SIGNE + ' {{b}}~\\unit{cm}$$',
     '$${{a}}~\\unit{m} ' + col(SIGNE) + ' {{b}}~\\unit{cm}$$'])

KM_ET_M = variation(
    COMPARER_L + '{{a}}~\\unit{km} \\quad \\ldots \\quad {{b}}~\\unit{m}$$' + SIGNES,
    ['{{r}}'],
    [var('a', '1..9'), var('k', '0..18'), var('b', 'eval:1000*a+50*(k-9)'),
     var('r', 'eval:sign(1000*a-b)+1')],
    ['On écrit les deux longueurs dans la même unité : ${{a}}~\\unit{km} = ' + ev('1000*a')
     + '~\\unit{m}$.', '$$' + ev('1000*a') + '~\\unit{m} ' + SIGNE + ' {{b}}~\\unit{m}$$',
     '$${{a}}~\\unit{km} ' + col(SIGNE) + ' {{b}}~\\unit{m}$$'])

DM_ET_CM = variation(
    COMPARER_L + '{{a}}~\\unit{dm} \\quad \\ldots \\quad {{b}}~\\unit{cm}$$' + SIGNES,
    ['{{r}}'],
    [var('a', '2..30'), var('k', '0..10'), var('b', 'eval:10*a+2*(k-5)'),
     var('r', 'eval:sign(10*a-b)+1')],
    ['On écrit les deux longueurs dans la même unité : ${{a}}~\\unit{dm} = ' + ev('10*a')
     + '~\\unit{cm}$.', '$$' + ev('10*a') + '~\\unit{cm} ' + SIGNE + ' {{b}}~\\unit{cm}$$',
     '$${{a}}~\\unit{dm} ' + col(SIGNE) + ' {{b}}~\\unit{cm}$$'])

CM_ET_MM = variation(
    COMPARER_L + '{{a}}~\\unit{cm} \\quad \\ldots \\quad {{b}}~\\unit{mm}$$' + SIGNES,
    ['{{r}}'],
    [var('a', '2..40'), var('k', '0..10'), var('b', 'eval:10*a+4*(k-5)'),
     var('r', 'eval:sign(10*a-b)+1')],
    ['On écrit les deux longueurs dans la même unité : ${{a}}~\\unit{cm} = ' + ev('10*a')
     + '~\\unit{mm}$.', '$$' + ev('10*a') + '~\\unit{mm} ' + SIGNE + ' {{b}}~\\unit{mm}$$',
     '$${{a}}~\\unit{cm} ' + col(SIGNE) + ' {{b}}~\\unit{mm}$$'])

# Quatre longueurs en centimètres, décimètres et mètres, déjà rangées par construction :
# (100b - 30) cm < (10b - 1) dm < b m < (10b + 1) dm
RANG_B = [var('b', '2..9')]
ETIQ_RANG_B = ['$' + ev('100*b-30') + '~\\unit{cm}$', '$' + ev('10*b-1') + '~\\unit{dm}$',
               '${{b}}~\\unit{m}$', '$' + ev('10*b+1') + '~\\unit{dm}$']
ETAPES_RANG_B = [
    'On écrit toutes les longueurs en centimètres : $' + ev('10*b-1') + '~\\unit{dm} = '
    + ev('100*b-10') + '~\\unit{cm}$, ${{b}}~\\unit{m} = ' + ev('100*b') + '~\\unit{cm}$ et'
    ' $' + ev('10*b+1') + '~\\unit{dm} = ' + ev('100*b+10') + '~\\unit{cm}$.']

# Trois longueurs en mètres et kilomètres : (1000b - 100) m < b km < (1000b + 100) m
RANG_K = [var('b', '1..9')]
ETIQ_RANG_K = ['$' + ev('1000*b-100') + '~\\unit{m}$', '${{b}}~\\unit{km}$',
               '$' + ev('1000*b+100') + '~\\unit{m}$']
ETAPES_RANG_K = ['${{b}}~\\unit{km} = ' + ev('1000*b') + '~\\unit{m}$ : on compare les trois'
                 ' longueurs en mètres.']

RANGER_L = [
    variation('Range ces longueurs du plus petit au plus grand.\n\n'
              + etiquettes('<', ETIQ_RANG_B), None, RANG_B,
              ETAPES_RANG_B + ['$$' + ev('100*b-30') + '~\\unit{cm} < ' + ev('100*b-10')
                               + '~\\unit{cm} < ' + ev('100*b') + '~\\unit{cm} < '
                               + ev('100*b+10') + '~\\unit{cm}$$']),
    variation('Range ces longueurs du plus grand au plus petit.\n\n'
              + etiquettes('>', ETIQ_RANG_B[::-1]), None, RANG_B,
              ETAPES_RANG_B + ['$$' + ev('100*b+10') + '~\\unit{cm} > ' + ev('100*b')
                               + '~\\unit{cm} > ' + ev('100*b-10') + '~\\unit{cm} > '
                               + ev('100*b-30') + '~\\unit{cm}$$']),
    variation('Range ces longueurs du plus petit au plus grand.\n\n'
              + etiquettes('<', ETIQ_RANG_K), None, RANG_K,
              ETAPES_RANG_K + ['$$' + ev('1000*b-100') + '~\\unit{m} < ' + ev('1000*b')
                               + '~\\unit{m} < ' + ev('1000*b+100') + '~\\unit{m}$$']),
]

# ============================== MASSES ==============================

# ---- 06. Unités de masse (CE2-045) ----

NOMS_M = ['gramme', 'kilogramme', 'tonne']
SYMBOLES_M = ['g', 'kg', 't']
LIGNES_M = ['le gramme (g)', 'le kilogramme (kg)', 'la tonne (t)']

SYMBOLE_M = variation(
    'Quel est le symbole ' + selon('k', ['du gramme', 'du kilogramme', 'de la tonne']) + ' ?'
    + choix(SYMBOLES_M), ['{{r}}'],
    [var('k', '1..3'), var('r', 'eval:k-1')],
    ['g pour le gramme, kg pour le kilogramme et t pour la tonne.',
     selon('k', ['Le gramme s\'écrit', 'Le kilogramme s\'écrit', 'La tonne s\'écrit']) + ' **'
     + selon('k', SYMBOLES_M) + '**.'])

SENS_M = variation(
    'Que veut dire le symbole **' + selon('k', SYMBOLES_M) + '** ?' + choix(NOMS_M),
    ['{{r}}'], [var('k', '1..3'), var('r', 'eval:k-1')],
    ['g veut dire gramme, kg kilogramme et t tonne.',
     '**' + selon('k', SYMBOLES_M) + '** veut dire **' + selon('k', NOMS_M) + '**.'])

EXTREME_M = variation(
    'Quelle est la plus {{if:s==1|grande|petite}} de ces unités de masse ?'
    + choix(LIGNES_M, melanger=False), ['{{r}}'],
    [var('s', '1..2'), var('r', 'eval:2*(s-1)')],
    ['$1~\\unit{t} = ' + MILLE + '~\\unit{kg}$ et $1~\\unit{kg} = ' + MILLE + '~\\unit{g}$.',
     'Du plus grand au plus petit : la tonne, le kilogramme, le gramme. La plus'
     ' {{if:s==1|grande est la **tonne**|petite est le **gramme**}}.'])

# Couples (la plus grande, la plus petite) ; la bonne réponse est la plus grande
GRANDES_M = ['le kilogramme', 'la tonne', 'la tonne']
PETITES_M = ['le gramme', 'le kilogramme', 'le gramme']
GRANDE_MK = selon('k', GRANDES_M)
PETITE_MK = selon('k', PETITES_M)

DEUX_UNITES_M = variation(
    'Quelle est la plus grande de ces deux unités de masse ?'
    + choix(['{{if:s==1|' + GRANDE_MK + '|' + PETITE_MK + '}}',
             '{{if:s==1|' + PETITE_MK + '|' + GRANDE_MK + '}}'], melanger=False),
    ['{{eval:s-1}}'], [var('k', '1..3'), var('s', '1..2')],
    ['Il faut beaucoup de petites unités pour faire une grande : ' + selon('k', [
        '$1~\\unit{kg} = ' + MILLE + '~\\unit{g}$', '$1~\\unit{t} = ' + MILLE + '~\\unit{kg}$',
        '$1~\\unit{t}$ pèse bien plus que $1~\\unit{g}$'])
     + '.', 'La plus grande est **' + GRANDE_MK + '**.'])

SPECS_UNITES_M = [
    spec('symbole du gramme : g', 0, {'k': 1, 'r': 0}, '0', 'correct'),
    spec('Erreur : tonne → kg', 0, {'k': 3, 'r': 2}, '1', 'incorrect'),
    spec('symbole de la tonne : t', 0, {'k': 3, 'r': 2}, '2', 'correct'),
    spec('kg veut dire kilogramme', 1, {'k': 2, 'r': 1}, '1', 'correct'),
    spec('Erreur : kg lu gramme', 1, {'k': 2, 'r': 1}, '0', 'incorrect'),
    spec('la plus grande : la tonne', 2, {'s': 1, 'r': 0}, '0', 'correct'),
    spec('la plus petite : le gramme', 2, {'s': 2, 'r': 2}, '2', 'correct'),
    spec('Erreur : la plus petite → tonne', 2, {'s': 2, 'r': 2}, '0', 'incorrect'),
    spec('kg plus grand que g (kg en 1er)', 3, {'k': 1, 's': 1}, '0', 'correct'),
    spec('Erreur : g plus grand que kg', 3, {'k': 1, 's': 1}, '1', 'incorrect'),
    spec('t plus grande que kg (t en 2e)', 3, {'k': 2, 's': 2}, '1', 'correct'),
]

# ---- 07. Choisir l'unité de masse (CE2-046) ----
# Quatre objets par unité, dans l'ordre g, kg, t : r = floor((k-1)/4)

OBJETS_M = ['Un stylo pèse $10$', 'Une pomme pèse $150$', 'Une feuille de papier pèse $5$',
            'Un œuf pèse $60$',
            'Un élève de CE2 pèse $30$', 'Un sac de pommes de terre pèse $5$',
            'Un chien pèse $12$', 'Un cartable rempli pèse $6$',
            'Un camion pèse $12$', 'Une baleine pèse $100$', 'Un éléphant pèse $5$',
            'Un bus pèse $10$']
UNITE_PLURIEL_M = '{{if:r==0|grammes|{{if:r==1|kilogrammes|tonnes}}}}'
SYMBOLE_R_M = '{{if:r==0|g|{{if:r==1|kg|t}}}}'

CHOISIR_M = variation(
    selon('k', OBJETS_M) + ' …\n\nQuelle unité convient ?'
    + choix(SYMBOLES_M, melanger=False), ['{{r}}'],
    [var('k', '1..12'), var('r', 'eval:floor((k-1)/4)')],
    ['{{if:r==0|C\'est léger, on le tient du bout des doigts : on pèse en grammes.'
     '|{{if:r==1|C\'est assez lourd, on le porte à la main ou sur le dos : on pèse en'
     ' kilogrammes.|C\'est énorme, plus lourd qu\'une voiture : on pèse en tonnes.}}}}',
     selon('k', OBJETS_M) + ' ' + UNITE_PLURIEL_M + ' (**' + SYMBOLE_R_M + '**).'])

SPECS_CHOISIR_M = [
    spec('stylo : g', 0, {'k': 1, 'r': 0}, '0', 'correct'),
    spec('Erreur : stylo de 10 kg', 0, {'k': 1, 'r': 0}, '1', 'incorrect'),
    spec('élève : kg', 0, {'k': 5, 'r': 1}, '1', 'correct'),
    spec('Erreur : élève de 30 t', 0, {'k': 5, 'r': 1}, '2', 'incorrect'),
    spec('camion : t', 0, {'k': 9, 'r': 2}, '2', 'correct'),
    spec('Erreur : camion de 12 kg', 0, {'k': 9, 'r': 2}, '1', 'incorrect'),
]

# ---- 08. Relations g · kg · t (CE2-047) ----

UN_KG_UNE_T = variation(
    'Complète.\n\n$1~\\unit{{{if:s==1|kg|t}}} = ?~\\text{{{if:s==1|g|kg}}}$',
    [MILLE.replace('\\,', '')], [var('s', '1..2')],
    ['{{if:s==1|Dans un kilogramme, il y a mille grammes.|Dans une tonne, il y a mille'
     ' kilogrammes.}}',
     '$$1~\\unit{{{if:s==1|kg|t}}} = ' + col(MILLE) + '~\\unit{{{if:s==1|g|kg}}}$$'])

KG_EN_G = variation(
    'Complète.\n\n${{a}}~\\unit{kg} = ?~\\text{g}$', [ev('1000*a')], [var('a', '2..30')],
    ['Un kilogramme, c\'est $' + MILLE + '~\\unit{g}$ : ${{a}}~\\unit{kg}$, c\'est ${{a}}$'
     ' fois $' + MILLE + '~\\unit{g}$.', '$${{a}}~\\unit{kg} = ' + col(ev('1000*a'))
     + '~\\unit{g}$$'])

T_EN_KG = variation(
    'Complète.\n\n${{a}}~\\unit{t} = ?~\\text{kg}$', [ev('1000*a')], [var('a', '2..30')],
    ['Une tonne, c\'est $' + MILLE + '~\\unit{kg}$ : ${{a}}~\\unit{t}$, c\'est ${{a}}$ fois'
     ' $' + MILLE + '~\\unit{kg}$.', '$${{a}}~\\unit{t} = ' + col(ev('1000*a'))
     + '~\\unit{kg}$$'])

G_EN_KG = variation(
    'Complète.\n\n$' + ev('1000*a') + '~\\unit{g} = ?~\\text{kg}$', ['{{a}}'],
    [var('a', '2..30')],
    ['Mille grammes font un kilogramme : dans $' + ev('1000*a') + '~\\unit{g}$, il y a ${{a}}$'
     ' fois mille grammes.', '$$' + ev('1000*a') + '~\\unit{g} = ' + col('{{a}}')
     + '~\\unit{kg}$$'])

# BO : 5 462 g = 5 kg + 462 g
G_EN_KG_ET_G = variation(
    'Complète.\n\n$' + ev('1000*a+b') + '~\\unit{g} = ?~\\text{kg}~?~\\text{g}$',
    ['{{a}}', '{{b}}'], [var('a', '1..30'), var('b', '1..999')],
    ['Dans $' + ev('1000*a+b') + '~\\unit{g}$, il y a ${{a}}$ {{if:a==1|millier|milliers}} de'
     ' grammes, c\'est-à-dire ${{a}}~\\unit{kg}$, et il reste ${{b}}~\\unit{g}$.',
     '$$' + ev('1000*a+b') + '~\\unit{g} = ' + col('{{a}}') + '~\\unit{kg}~' + col('{{b}}')
     + '~\\unit{g}$$'])

KG_PLUS_G = variation(
    'Complète.\n\n${{a}}~\\unit{kg} + {{b}}~\\unit{g} = ?~\\text{g}$', [ev('1000*a+b')],
    [var('a', '1..30'), var('b', '1..999')],
    ['On écrit d\'abord les kilogrammes en grammes : ${{a}}~\\unit{kg} = ' + ev('1000*a')
     + '~\\unit{g}$.', 'Puis on ajoute les grammes :',
     '$$' + ev('1000*a') + ' + {{b}} = ' + col(ev('1000*a+b')) + '$$',
     '${{a}}~\\unit{kg} + {{b}}~\\unit{g} = ' + ev('1000*a+b') + '~\\unit{g}$.'])

# BO : 5 350 kg = 5 t 350 kg
KG_EN_T_ET_KG = variation(
    'Complète.\n\n$' + ev('1000*a+b') + '~\\unit{kg} = ?~\\text{t}~?~\\text{kg}$',
    ['{{a}}', '{{b}}'], [var('a', '1..30'), var('b', '1..999')],
    ['Dans $' + ev('1000*a+b') + '~\\unit{kg}$, il y a ${{a}}$ {{if:a==1|millier|milliers}} de'
     ' kilogrammes, c\'est-à-dire ${{a}}~\\unit{t}$, et il reste ${{b}}~\\unit{kg}$.',
     '$$' + ev('1000*a+b') + '~\\unit{kg} = ' + col('{{a}}') + '~\\unit{t}~' + col('{{b}}')
     + '~\\unit{kg}$$'])

T_PLUS_KG = variation(
    'Complète.\n\n${{a}}~\\unit{t} + {{b}}~\\unit{kg} = ?~\\text{kg}$', [ev('1000*a+b')],
    [var('a', '1..30'), var('b', '1..999')],
    ['On écrit d\'abord les tonnes en kilogrammes : ${{a}}~\\unit{t} = ' + ev('1000*a')
     + '~\\unit{kg}$.', 'Puis on ajoute les kilogrammes :',
     '$$' + ev('1000*a') + ' + {{b}} = ' + col(ev('1000*a+b')) + '$$',
     '${{a}}~\\unit{t} + {{b}}~\\unit{kg} = ' + ev('1000*a+b') + '~\\unit{kg}$.'])

SPECS_REL_M = [
    spec('1 kg = 1 000 g', 0, {'s': 1}, '1000', 'correct'),
    spec('Erreur : 1 kg = 100 g', 0, {'s': 1}, '100', 'incorrect'),
    spec('1 t = 1 000 kg', 0, {'s': 2}, '1000', 'correct'),
    spec('5 kg = 5 000 g', 1, {'a': 5}, '5000', 'correct'),
    spec('Erreur : 5 kg = 500 g', 1, {'a': 5}, '500', 'incorrect'),
    spec('3 t = 3 000 kg', 2, {'a': 3}, '3000', 'correct'),
    spec('Erreur : 3 t = 300 kg', 2, {'a': 3}, '300', 'incorrect'),
    spec('7 000 g = 7 kg', 3, {'a': 7}, '7', 'correct'),
    spec('Erreur : 7 000 g = 700 kg', 3, {'a': 7}, '700', 'incorrect'),
    spec('BO : 5 462 g = 5 kg 462 g', 4, {'a': 5, 'b': 462}, ['5', '462'], 'correct'),
    spec('Erreur : 5 462 g = 54 kg 62 g', 4, {'a': 5, 'b': 462}, ['54', '62'], 'incorrect'),
    spec('2 040 g = 2 kg 40 g', 4, {'a': 2, 'b': 40}, ['2', '40'], 'correct'),
    spec('5 kg + 462 g = 5 462 g', 5, {'a': 5, 'b': 462}, '5462', 'correct'),
    spec('Erreur : 5 kg + 40 g = 5 400 g (zéro oublié)', 5, {'a': 5, 'b': 40}, '5400',
         'incorrect'),
    spec('BO : 5 350 kg = 5 t 350 kg', 6, {'a': 5, 'b': 350}, ['5', '350'], 'correct'),
    spec('Erreur : 5 350 kg = 53 t 50 kg', 6, {'a': 5, 'b': 350}, ['53', '50'], 'incorrect'),
    spec('5 t + 350 kg = 5 350 kg', 7, {'a': 5, 'b': 350}, '5350', 'correct'),
    spec('Erreur : 5 t + 350 kg = 355 kg', 7, {'a': 5, 'b': 350}, '355', 'incorrect'),
]

# ---- 09. Comparer des masses (CE2-048) ----

COMPARER_M = 'Compare ces deux masses.\n\n$$'

KG_ET_G = variation(
    COMPARER_M + '{{a}}~\\unit{kg} \\quad \\ldots \\quad {{b}}~\\unit{g}$$' + SIGNES,
    ['{{r}}'],
    [var('a', '1..9'), var('k', '0..18'), var('b', 'eval:1000*a+50*(k-9)'),
     var('r', 'eval:sign(1000*a-b)+1')],
    ['On écrit les deux masses dans la même unité : ${{a}}~\\unit{kg} = ' + ev('1000*a')
     + '~\\unit{g}$.', '$$' + ev('1000*a') + '~\\unit{g} ' + SIGNE + ' {{b}}~\\unit{g}$$',
     '$${{a}}~\\unit{kg} ' + col(SIGNE) + ' {{b}}~\\unit{g}$$'])

T_ET_KG = variation(
    COMPARER_M + '{{a}}~\\unit{t} \\quad \\ldots \\quad {{b}}~\\unit{kg}$$' + SIGNES,
    ['{{r}}'],
    [var('a', '1..9'), var('k', '0..18'), var('b', 'eval:1000*a+50*(k-9)'),
     var('r', 'eval:sign(1000*a-b)+1')],
    ['On écrit les deux masses dans la même unité : ${{a}}~\\unit{t} = ' + ev('1000*a')
     + '~\\unit{kg}$.', '$$' + ev('1000*a') + '~\\unit{kg} ' + SIGNE + ' {{b}}~\\unit{kg}$$',
     '$${{a}}~\\unit{t} ' + col(SIGNE) + ' {{b}}~\\unit{kg}$$'])

KG_G_ET_G = variation(
    COMPARER_M + '{{a}}~\\unit{kg}~{{b}}~\\unit{g} \\quad \\ldots \\quad {{c}}~\\unit{g}$$'
    + SIGNES, ['{{r}}'],
    [var('a', '1..8'), var('b', '1..999'), var('k', '0..40'),
     var('c', 'eval:1000*a+b+k-20'), var('r', 'eval:sign(1000*a+b-c)+1')],
    ['On écrit les deux masses dans la même unité : ${{a}}~\\unit{kg}~{{b}}~\\unit{g} = '
     + ev('1000*a') + '~\\unit{g} + {{b}}~\\unit{g} = ' + ev('1000*a+b') + '~\\unit{g}$.',
     '$$' + ev('1000*a+b') + '~\\unit{g} ' + SIGNE + ' {{c}}~\\unit{g}$$',
     '$${{a}}~\\unit{kg}~{{b}}~\\unit{g} ' + col(SIGNE) + ' {{c}}~\\unit{g}$$'])

# Quatre objets, masses en g, kg et t, déjà rangés par construction :
# (1000b - 300) g < b kg < (b + 1) kg ... < b t  (b de 2 à 9)
RANG_M = [var('b', '2..9')]
ETIQ_RANG_M = ['$' + ev('1000*b-300') + '~\\unit{g}$', '${{b}}~\\unit{kg}$',
               '$' + ev('1000*b+300') + '~\\unit{g}$', '${{b}}~\\unit{t}$']
ETAPES_RANG_M = [
    'On écrit les masses du même type dans la même unité : ${{b}}~\\unit{kg} = ' + ev('1000*b')
    + '~\\unit{g}$. Une tonne pèse $' + MILLE + '$ fois plus qu\'un kilogramme : '
    '${{b}}~\\unit{t} = ' + ev('1000*b') + '~\\unit{kg}$, bien plus que ${{b}}~\\unit{kg}$.']

RANGER_M = [
    variation('Range ces masses du plus léger au plus lourd.\n\n'
              + etiquettes('<', ETIQ_RANG_M), None, RANG_M,
              ETAPES_RANG_M + ['$$' + ev('1000*b-300') + '~\\unit{g} < {{b}}~\\unit{kg} < '
                               + ev('1000*b+300') + '~\\unit{g} < {{b}}~\\unit{t}$$']),
]

# Trois objets de masses en g, kg et t : le plus lourd / le plus léger est écrit en premier
# dans la liste (le choix est mélangé à l'affichage, la réponse est donc `0`)
OBJETS_MASSE = [
    # (objet, masse) dans l'ordre : le plus lourd, puis les deux autres
    [('un colis', U('2', 'kg')), ('un sac', U('1\\,800', 'g')), ('une valise', U('950', 'g'))],
    [('un sac', U('3\\,200', 'g')), ('un paquet', U('3', 'kg')), ('un colis', U('2\\,900', 'g'))],
    [('un camion', U('5', 't')), ('un tracteur', U('4\\,800', 'kg')),
     ('une voiture', U('1\\,200', 'kg'))],
    [('un taureau', U('1', 't')), ('un cheval', U('600', 'kg')), ('un veau', U('120', 'kg'))],
]
EN_MEME_UNITE = [
    '$2~\\unit{kg} = 2\\,000~\\unit{g}$ : $2\\,000~\\unit{g} > 1\\,800~\\unit{g} >'
    ' 950~\\unit{g}$.',
    '$3~\\unit{kg} = 3\\,000~\\unit{g}$ : $3\\,200~\\unit{g} > 3\\,000~\\unit{g} >'
    ' 2\\,900~\\unit{g}$.',
    '$5~\\unit{t} = 5\\,000~\\unit{kg}$ : $5\\,000~\\unit{kg} > 4\\,800~\\unit{kg} >'
    ' 1\\,200~\\unit{kg}$.',
    '$1~\\unit{t} = 1\\,000~\\unit{kg}$ : $1\\,000~\\unit{kg} > 600~\\unit{kg} >'
    ' 120~\\unit{kg}$.',
]
NOMS_LOURD = ['le colis de 2 kg', 'le sac de 3 200 g', 'le camion de 5 t',
              'le taureau de 1 t']
NOMS_LEGER = ['la valise de 950 g', 'le colis de 2 900 g', 'la voiture de 1 200 kg',
              'le veau de 120 kg']


def lignes_objets(rang):
    return [selon('k', [OBJETS_MASSE[i][rang][0] + ' de ' + OBJETS_MASSE[i][rang][1]
                        for i in range(4)])]


def liste_masse(ordre):
    """Les trois objets du triplet k, dans l'ordre `ordre` (indices 0 à 2)."""
    return [lignes_objets(j)[0] for j in ordre]


LOURD = variation(
    'Quel objet est le plus lourd ?' + choix(liste_masse((0, 1, 2))), ['0'],
    [var('k', '1..4')],
    [selon('k', EN_MEME_UNITE), 'Le plus lourd est **' + selon('k', NOMS_LOURD) + '**.'])

LEGER = variation(
    'Quel objet est le plus léger ?' + choix(liste_masse((2, 1, 0))), ['0'],
    [var('k', '1..4')],
    [selon('k', EN_MEME_UNITE), 'Le plus léger est **' + selon('k', NOMS_LEGER) + '**.'])

SPECS_COMPARER_L = [
    spec('2 m > 150 cm', 0, {'a': 2, 'k': 4, 'b': 150, 'r': 2}, '2', 'correct'),
    spec('Erreur : 2 m < 150 cm (nombres seuls)', 0, {'a': 2, 'k': 4, 'b': 150, 'r': 2}, '0',
         'incorrect'),
    spec('3 m = 300 cm', 0, {'a': 3, 'k': 9, 'b': 300, 'r': 1}, '1', 'correct'),
    spec('1 km > 600 m', 1, {'a': 1, 'k': 1, 'b': 600, 'r': 2}, '2', 'correct'),
    spec('Erreur : 1 km < 600 m', 1, {'a': 1, 'k': 1, 'b': 600, 'r': 2}, '0', 'incorrect'),
    spec('2 km = 2 000 m', 1, {'a': 2, 'k': 9, 'b': 2000, 'r': 1}, '1', 'correct'),
    spec('12 dm = 120 cm', 2, {'a': 12, 'k': 5, 'b': 120, 'r': 1}, '1', 'correct'),
    spec('12 dm < 122 cm', 2, {'a': 12, 'k': 6, 'b': 122, 'r': 0}, '0', 'correct'),
    spec('Erreur : 12 dm > 122 cm', 2, {'a': 12, 'k': 6, 'b': 122, 'r': 0}, '2', 'incorrect'),
    spec('30 cm > 280 mm', 3, {'a': 30, 'k': 0, 'b': 280, 'r': 2}, '2', 'correct'),
    spec('Erreur : 30 cm < 280 mm', 3, {'a': 30, 'k': 0, 'b': 280, 'r': 2}, '0',
         'incorrect'),
    # Positions AFFICHÉES (mélange fixé par la source, lues par essai des permutations) :
    # la réponse d'une place est la position de l'étiquette écrite à ce rang
    spec('croissant : 270 cm < 29 dm < 3 m < 31 dm', 4, {'b': 3}, ['3', '0', '1', '2'],
         'correct'),
    spec('Erreur : les nombres seuls (3 m < 29 dm < 31 dm < 270 cm)', 4, {'b': 3},
         ['1', '0', '2', '3'], 'incorrect'),
    spec('Erreur : ordre décroissant', 4, {'b': 3}, ['2', '1', '0', '3'], 'incorrect'),
    spec('décroissant : 31 dm > 3 m > 29 dm > 270 cm', 5, {'b': 3}, ['3', '0', '1', '2'],
         'correct'),
    spec('Erreur : ordre croissant', 5, {'b': 3}, ['2', '1', '0', '3'], 'incorrect'),
    spec('croissant : 2 900 m < 3 km < 3 100 m', 6, {'b': 3}, ['2', '0', '1'], 'correct'),
    spec('Erreur : les nombres seuls (3 km < 2 900 m < 3 100 m)', 6, {'b': 3},
         ['0', '2', '1'], 'incorrect'),
]

SPECS_COMPARER_M = [
    spec('2 kg > 1 750 g', 0, {'a': 2, 'k': 4, 'b': 1750, 'r': 2}, '2', 'correct'),
    spec('Erreur : 2 kg < 1 750 g (nombres seuls)', 0, {'a': 2, 'k': 4, 'b': 1750, 'r': 2},
         '0', 'incorrect'),
    spec('3 kg = 3 000 g', 0, {'a': 3, 'k': 9, 'b': 3000, 'r': 1}, '1', 'correct'),
    spec('1 t < 1 200 kg', 1, {'a': 1, 'k': 13, 'b': 1200, 'r': 0}, '0', 'correct'),
    spec('Erreur : 1 t > 1 200 kg', 1, {'a': 1, 'k': 13, 'b': 1200, 'r': 0}, '2',
         'incorrect'),
    spec('1 kg 250 g < 1 300 g', 2, {'a': 1, 'b': 250, 'k': 30, 'c': 1260, 'r': 0}, '0',
         'correct'),
    spec('Erreur : 1 kg 250 g > 1 260 g', 2, {'a': 1, 'b': 250, 'k': 30, 'c': 1260, 'r': 0},
         '2', 'incorrect'),
    spec('le plus lourd : le colis de 2 kg', 4, {'k': 1}, '0', 'correct'),
    spec('Erreur : le sac de 1 800 g', 4, {'k': 1}, '1', 'incorrect'),
    spec('le plus lourd : le camion de 5 t', 4, {'k': 3}, '0', 'correct'),
    spec('le plus léger : le veau de 120 kg', 5, {'k': 4}, '0', 'correct'),
    spec('Erreur : le cheval de 600 kg', 5, {'k': 4}, '1', 'incorrect'),
    spec('croissant : 2 700 g < 3 kg < 3 300 g < 3 t', 3, {'b': 3}, ['3', '0', '1', '2'],
         'correct'),
    spec('Erreur : ordre décroissant', 3, {'b': 3}, ['2', '1', '0', '3'], 'incorrect'),
    spec('Erreur : 3 t placée avant les grammes', 3, {'b': 3}, ['0', '1', '2', '3'],
         'incorrect'),
]

MODELES = {
    '01-unites-de-longueur': modele(
        'Les unités de longueur : km, m, dm, cm, mm',
        'Symbole et sens de km, m, dm, cm, mm ; la plus grande et la plus petite des unités ;'
        ' laquelle est la plus grande de deux unités',
        'Longueurs', 'Unités', 8, [SYMBOLE_L, SENS_L, EXTREME_L, DEUX_UNITES], SPECS_UNITES_L,
        delay=45),
    '02-relations-m-dm-cm-mm': modele(
        'Mètres, décimètres, centimètres et millimètres',
        '1 m = 10 dm = 100 cm = 1 000 mm ; 16 m = 1 600 cm = 160 dm ; 1 600 cm = 16 m ;'
        ' 25 cm = 250 mm', 'Longueurs', 'Unités', 10,
        [UN_EN_PETITE, M_EN_CM, M_EN_DM, CM_EN_MM, M_EN_CM_ET_DM, CM_EN_M, CM_EN_DM,
         MM_EN_CM], SPECS_REL_L, delay=90),
    '03-relations-km-m': modele(
        'Kilomètres et mètres',
        '5 km = 5 000 m ; 5 km + 750 m = 5 750 m ; 5 750 m = 5 km 750 m ; 5 km 40 m = 5 040 m',
        'Longueurs', 'Unités', 11, [KM_EN_M, M_EN_KM, KM_PLUS_M, M_EN_KM_ET_M],
        SPECS_REL_KM, delay=90),
    '04-choisir-l-unite-de-longueur': modele(
        'Quelle unité pour mesurer ?',
        'Choisir parmi mm, cm, dm, m et km : une pièce de 2 mm, un crayon de 15 cm, un bus de'
        ' 12 m, un trajet de 3 km', 'Longueurs', 'Unités', 9, [CHOISIR_L], SPECS_CHOISIR_L,
        delay=45),
    '05-comparer-des-longueurs': modele(
        'Comparer des longueurs',
        'Deux longueurs dans deux unités : 2 m et 150 cm ; 1 km et 900 m ; 12 dm et 125 cm ;'
        ' ranger trois ou quatre longueurs', 'Longueurs', 'Comparaison et mesure', 4,
        [M_ET_CM, KM_ET_M, DM_ET_CM, CM_ET_MM] + RANGER_L, SPECS_COMPARER_L),
    '06-unites-de-masse': modele(
        'Les unités de masse : g, kg, t',
        'Symbole et sens de g, kg, t ; la plus grande et la plus petite ; laquelle est la plus'
        ' grande de deux unités', 'Masses', 'Unités', 3,
        [SYMBOLE_M, SENS_M, EXTREME_M, DEUX_UNITES_M], SPECS_UNITES_M, delay=45),
    '07-choisir-l-unite-de-masse': modele(
        'Gramme, kilogramme ou tonne ?',
        'Choisir l\'unité qui convient : un stylo de 10 g, un élève de 30 kg, un camion de 12 t',
        'Masses', 'Unités', 4, [CHOISIR_M], SPECS_CHOISIR_M, delay=45),
    '08-relations-g-kg-t': modele(
        'Grammes, kilogrammes et tonnes',
        '1 kg = 1 000 g, 1 t = 1 000 kg ; 5 462 g = 5 kg 462 g ; 5 350 kg = 5 t 350 kg',
        'Masses', 'Unités', 5,
        [UN_KG_UNE_T, KG_EN_G, T_EN_KG, G_EN_KG, G_EN_KG_ET_G, KG_PLUS_G, KG_EN_T_ET_KG,
         T_PLUS_KG], SPECS_REL_M, delay=90),
    '09-comparer-des-masses': modele(
        'Comparer des masses',
        'Deux masses dans deux unités : 2 kg et 1 750 g ; 1 t et 1 200 kg ; trois ou quatre'
        ' objets : le plus lourd, le plus léger, ranger', 'Masses', 'Comparaison', 3,
        [KG_ET_G, T_ET_KG, KG_G_ET_G] + RANGER_M + [LOURD, LEGER], SPECS_COMPARER_M),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
