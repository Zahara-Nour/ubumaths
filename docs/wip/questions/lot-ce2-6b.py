"""Écrit les 4 modèles du lot 6b du CE2 (contenances et durées) dans scripts/questions/ce2-6b/.

Phase 0 validée par David le 2026-11-01 (§ 10 du journal `docs/wip/questions-ce2-progress.md`).
Bornes `cycle2.json` : CE2-052 : L, dL, cL (symboles compris) ; CE2-053 : 1 L = 10 dL = 100 cL
(780 cL = 7 L + 80 cL) ; CE2-060 : une ou deux étapes, axe chronologique (8 h 30 -> 12 h 30 ;
départ 7 h 10 + 1 h 30 + 40 min). L'axe chronologique est la suite de repères du corrigé
(8 h 30 -> 9 h -> 12 h -> 12 h 30), l'énoncé donne les heures en texte.
Catégories (relevé MCP du 2026-11-01, à relire avant la publication) : Contenances / Unités,
niveaux 1 et 2 (rien en base) ; Durées / Durée écoulée, niveaux 3 et 4 (CE1 : 1 et 2).

    python3 docs/wip/questions/lot-ce2-6b.py scripts/questions/ce2-6b
"""
import json
import sys

DOSSIER = sys.argv[1]

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

# =============================== CONTENANCES ===============================

NOMS_C = ['litre', 'décilitre', 'centilitre']
SYMBOLES_C = ['L', 'dL', 'cL']
LIGNES_C = ['le litre (L)', 'le décilitre (dL)', 'le centilitre (cL)']

# ---- 10. Unités de contenance (CE2-052) ----

SYMBOLE_C = variation(
    'Quel est le symbole du ' + selon('k', NOMS_C) + ' ?' + choix(SYMBOLES_C), ['{{r}}'],
    [var('k', '1..3'), var('r', 'eval:k-1')],
    ['L pour le litre, dL pour le décilitre et cL pour le centilitre.',
     'Le ' + selon('k', NOMS_C) + ' s\'écrit **' + selon('k', SYMBOLES_C) + '**.'])

SENS_C = variation(
    'Que veut dire le symbole **' + selon('k', SYMBOLES_C) + '** ?' + choix(NOMS_C), ['{{r}}'],
    [var('k', '1..3'), var('r', 'eval:k-1')],
    ['L veut dire litre, dL décilitre et cL centilitre.',
     '**' + selon('k', SYMBOLES_C) + '** veut dire **' + selon('k', NOMS_C) + '**.'])

EXTREME_C = variation(
    'Quelle est la plus {{if:s==1|grande|petite}} de ces unités de contenance ?'
    + choix(LIGNES_C, melanger=False), ['{{r}}'],
    [var('s', '1..2'), var('r', 'eval:2*(s-1)')],
    ['$1~\\unit{L} = 10~\\unit{dL}$ et $1~\\unit{dL} = 10~\\unit{cL}$.',
     'Du plus grand au plus petit : L, dL, cL. La plus'
     ' {{if:s==1|grande est le **litre**|petite est le **centilitre**}}.'])

GRANDES_C = ['le litre', 'le décilitre', 'le litre']
PETITES_C = ['le décilitre', 'le centilitre', 'le centilitre']
RELATIONS_C = ['$1~\\unit{L} = 10~\\unit{dL}$', '$1~\\unit{dL} = 10~\\unit{cL}$',
               '$1~\\unit{L} = 100~\\unit{cL}$']
GRANDE_KC = selon('k', GRANDES_C)
PETITE_KC = selon('k', PETITES_C)

DEUX_UNITES_C = variation(
    'Quelle est la plus grande de ces deux unités de contenance ?'
    + choix(['{{if:s==1|' + GRANDE_KC + '|' + PETITE_KC + '}}',
             '{{if:s==1|' + PETITE_KC + '|' + GRANDE_KC + '}}'], melanger=False),
    ['{{eval:s-1}}'], [var('k', '1..3'), var('s', '1..2')],
    ['Il faut plusieurs petites unités pour faire une grande : ' + selon('k', RELATIONS_C)
     + '.', 'La plus grande est **' + GRANDE_KC + '**.'])

# Trois récipients par unité, dans l'ordre L, dL, cL : r = floor((k-1)/3)
OBJETS_C = ['Un seau contient $10$', 'Une bouteille de lait contient $1$',
            'Un aquarium contient $60$',
            'Un bol de lait contient $3$', 'Un biberon contient $2$',
            'Une petite carafe contient $5$',
            'Un verre d\'eau contient $20$', 'Une tasse de café contient $10$',
            'Une canette contient $33$']
UNITE_PLURIEL_C = '{{if:r==0|litres|{{if:r==1|décilitres|centilitres}}}}'
SYMBOLE_R_C = '{{if:r==0|L|{{if:r==1|dL|cL}}}}'

CHOISIR_C = variation(
    selon('k', OBJETS_C) + ' …\n\nQuelle unité convient ?'
    + choix(SYMBOLES_C, melanger=False), ['{{r}}'],
    [var('k', '1..9'), var('r', 'eval:floor((k-1)/3)')],
    ['{{if:r==0|C\'est un grand récipient, qui contient beaucoup d\'eau : on mesure en litres.'
     '|{{if:r==1|C\'est un petit récipient : un décilitre, c\'est la dixième partie d\'un'
     ' litre.|C\'est un petit verre ou une tasse : un centilitre, c\'est la centième partie'
     ' d\'un litre.}}}}',
     selon('k', OBJETS_C) + ' ' + UNITE_PLURIEL_C + ' (**' + SYMBOLE_R_C + '**).'])

SPECS_UNITES_C = [
    spec('symbole du litre : L', 0, {'k': 1, 'r': 0}, '0', 'correct'),
    spec('Erreur : litre → cL', 0, {'k': 1, 'r': 0}, '2', 'incorrect'),
    spec('symbole du décilitre : dL', 0, {'k': 2, 'r': 1}, '1', 'correct'),
    spec('symbole du centilitre : cL', 0, {'k': 3, 'r': 2}, '2', 'correct'),
    spec('cL veut dire centilitre', 1, {'k': 3, 'r': 2}, '2', 'correct'),
    spec('Erreur : cL lu décilitre', 1, {'k': 3, 'r': 2}, '1', 'incorrect'),
    spec('la plus grande : L', 2, {'s': 1, 'r': 0}, '0', 'correct'),
    spec('la plus petite : cL', 2, {'s': 2, 'r': 2}, '2', 'correct'),
    spec('Erreur : la plus petite → L', 2, {'s': 2, 'r': 2}, '0', 'incorrect'),
    spec('L plus grand que dL (L en 1er)', 3, {'k': 1, 's': 1}, '0', 'correct'),
    spec('Erreur : dL plus grand que L', 3, {'k': 1, 's': 1}, '1', 'incorrect'),
    spec('dL plus grand que cL (dL en 2e)', 3, {'k': 2, 's': 2}, '1', 'correct'),
    spec('seau : L', 4, {'k': 1, 'r': 0}, '0', 'correct'),
    spec('Erreur : seau de 10 cL', 4, {'k': 1, 'r': 0}, '2', 'incorrect'),
    spec('bol de lait : dL', 4, {'k': 4, 'r': 1}, '1', 'correct'),
    spec('verre d\'eau : cL', 4, {'k': 7, 'r': 2}, '2', 'correct'),
    spec('Erreur : verre de 20 L', 4, {'k': 7, 'r': 2}, '0', 'incorrect'),
]

# ---- 11. Relations L · dL · cL (CE2-053) ----

UN_EN_PETITE_C = variation(
    'Complète.\n\n$1~\\unit{' + selon('s', ['L', 'L', 'dL']) + '} = ?~\\text{'
    + selon('s', ['dL', 'cL', 'cL']) + '}$', ['{{if:s==2|100|10}}'], [var('s', '1..3')],
    ['Entre ces deux unités, il faut multiplier par ' + selon('s', ['10', '100', '10'])
     + ' : un ' + selon('s', ['litre vaut 10 décilitres', 'litre vaut 100 centilitres',
                              'décilitre vaut 10 centilitres']) + '.',
     '$$1~\\unit{' + selon('s', ['L', 'L', 'dL']) + '} = ' + col(selon('s', ['10', '100', '10']))
     + '~\\unit{' + selon('s', ['dL', 'cL', 'cL']) + '}$$'])

L_EN_DL = variation(
    'Complète.\n\n${{a}}~\\unit{L} = ?~\\text{dL}$', [ev('10*a')], [var('a', '2..30')],
    ['Un litre, c\'est $10~\\unit{dL}$ : ${{a}}~\\unit{L}$, c\'est ${{a}}$ fois'
     ' $10~\\unit{dL}$.', '$${{a}}~\\unit{L} = ' + col(ev('10*a')) + '~\\unit{dL}$$'])

L_EN_CL = variation(
    'Complète.\n\n${{a}}~\\unit{L} = ?~\\text{cL}$', [ev('100*a')], [var('a', '2..30')],
    ['Un litre, c\'est $100~\\unit{cL}$ : ${{a}}~\\unit{L}$, c\'est ${{a}}$ fois'
     ' $100~\\unit{cL}$.', '$${{a}}~\\unit{L} = ' + col(ev('100*a')) + '~\\unit{cL}$$'])

DL_EN_CL = variation(
    'Complète.\n\n${{a}}~\\unit{dL} = ?~\\text{cL}$', [ev('10*a')], [var('a', '2..99')],
    ['Un décilitre, c\'est $10~\\unit{cL}$ : ${{a}}~\\unit{dL}$, c\'est ${{a}}$ fois'
     ' $10~\\unit{cL}$.', '$${{a}}~\\unit{dL} = ' + col(ev('10*a')) + '~\\unit{cL}$$'])

L_EN_DL_ET_CL = variation(
    'Complète.\n\n${{a}}~\\unit{L} = ?~\\text{dL} = ?~\\text{cL}$', [ev('10*a'), ev('100*a')],
    [var('a', '2..30')],
    ['Un litre, c\'est $10~\\unit{dL}$ et c\'est $100~\\unit{cL}$.',
     '$${{a}}~\\unit{L} = ' + col(ev('10*a')) + '~\\unit{dL} = ' + col(ev('100*a'))
     + '~\\unit{cL}$$'])

DL_EN_L = variation(
    'Complète.\n\n$' + ev('10*a') + '~\\unit{dL} = ?~\\text{L}$', ['{{a}}'],
    [var('a', '2..30')],
    ['Dix décilitres font un litre : dans $' + ev('10*a') + '~\\unit{dL}$, il y a ${{a}}$'
     ' fois dix décilitres.', '$$' + ev('10*a') + '~\\unit{dL} = ' + col('{{a}}')
     + '~\\unit{L}$$'])

CL_EN_L = variation(
    'Complète.\n\n$' + ev('100*a') + '~\\unit{cL} = ?~\\text{L}$', ['{{a}}'],
    [var('a', '2..30')],
    ['Cent centilitres font un litre : dans $' + ev('100*a') + '~\\unit{cL}$, il y a ${{a}}$'
     ' fois cent centilitres.', '$$' + ev('100*a') + '~\\unit{cL} = ' + col('{{a}}')
     + '~\\unit{L}$$'])

CL_EN_DL = variation(
    'Complète.\n\n$' + ev('10*a') + '~\\unit{cL} = ?~\\text{dL}$', ['{{a}}'],
    [var('a', '2..99')],
    ['Dix centilitres font un décilitre : dans $' + ev('10*a') + '~\\unit{cL}$, il y a ${{a}}$'
     ' fois dix centilitres.', '$$' + ev('10*a') + '~\\unit{cL} = ' + col('{{a}}')
     + '~\\unit{dL}$$'])

# BO : 780 cL = 7 L + 80 cL ; b < 100, avec des zéros (7 L 5 cL = 705 cL)
CL_EN_L_ET_CL = variation(
    'Complète.\n\n$' + ev('100*a+b') + '~\\unit{cL} = ?~\\text{L} + ?~\\text{cL}$',
    ['{{a}}', '{{b}}'], [var('a', '1..30'), var('b', '1..99')],
    ['Dans $' + ev('100*a+b') + '~\\unit{cL}$, il y a ${{a}}$ fois cent centilitres, c\'est-à-dire'
     ' ${{a}}~\\unit{L}$, et il reste ${{b}}~\\unit{cL}$.',
     '$$' + ev('100*a+b') + '~\\unit{cL} = ' + col('{{a}}') + '~\\unit{L} + ' + col('{{b}}')
     + '~\\unit{cL}$$'])

DL_EN_L_ET_DL = variation(
    'Complète.\n\n$' + ev('10*a+b') + '~\\unit{dL} = ?~\\text{L} + ?~\\text{dL}$',
    ['{{a}}', '{{b}}'], [var('a', '1..30'), var('b', '1..9')],
    ['Dans $' + ev('10*a+b') + '~\\unit{dL}$, il y a ${{a}}$ fois dix décilitres, c\'est-à-dire'
     ' ${{a}}~\\unit{L}$, et il reste ${{b}}~\\unit{dL}$.',
     '$$' + ev('10*a+b') + '~\\unit{dL} = ' + col('{{a}}') + '~\\unit{L} + ' + col('{{b}}')
     + '~\\unit{dL}$$'])

L_PLUS_CL = variation(
    'Complète.\n\n${{a}}~\\unit{L} + {{b}}~\\unit{cL} = ?~\\text{cL}$', [ev('100*a+b')],
    [var('a', '1..30'), var('b', '1..99')],
    ['On écrit d\'abord les litres en centilitres : ${{a}}~\\unit{L} = ' + ev('100*a')
     + '~\\unit{cL}$.', 'Puis on ajoute les centilitres :',
     '$$' + ev('100*a') + ' + {{b}} = ' + col(ev('100*a+b')) + '$$'])

SPECS_REL_C = [
    spec('1 L = 10 dL', 0, {'s': 1}, '10', 'correct'),
    spec('1 L = 100 cL', 0, {'s': 2}, '100', 'correct'),
    spec('Erreur : 1 L = 10 cL', 0, {'s': 2}, '10', 'incorrect'),
    spec('1 dL = 10 cL', 0, {'s': 3}, '10', 'correct'),
    spec('Erreur : 1 dL = 100 cL', 0, {'s': 3}, '100', 'incorrect'),
    spec('7 L = 70 dL', 1, {'a': 7}, '70', 'correct'),
    spec('Erreur : 7 L = 7 dL', 1, {'a': 7}, '7', 'incorrect'),
    spec('7 L = 700 cL', 2, {'a': 7}, '700', 'correct'),
    spec('Erreur : 7 L = 70 cL', 2, {'a': 7}, '70', 'incorrect'),
    spec('25 dL = 250 cL', 3, {'a': 25}, '250', 'correct'),
    spec('Erreur : 25 dL = 25 cL', 3, {'a': 25}, '25', 'incorrect'),
    spec('7 L = 70 dL = 700 cL', 4, {'a': 7}, ['70', '700'], 'correct'),
    spec('Erreur : dL et cL échangés', 4, {'a': 7}, ['700', '70'], 'incorrect'),
    spec('70 dL = 7 L', 5, {'a': 7}, '7', 'correct'),
    spec('Erreur : 70 dL = 700 L', 5, {'a': 7}, '700', 'incorrect'),
    spec('700 cL = 7 L', 6, {'a': 7}, '7', 'correct'),
    spec('Erreur : 700 cL = 70 L', 6, {'a': 7}, '70', 'incorrect'),
    spec('250 cL = 25 dL', 7, {'a': 25}, '25', 'correct'),
    spec('Erreur : 250 cL = 2 500 dL', 7, {'a': 25}, '2500', 'incorrect'),
    spec('BO : 780 cL = 7 L + 80 cL', 8, {'a': 7, 'b': 80}, ['7', '80'], 'correct'),
    spec('Erreur : 780 cL = 78 L + 0 cL', 8, {'a': 7, 'b': 80}, ['78', '0'], 'incorrect'),
    spec('705 cL = 7 L + 5 cL', 8, {'a': 7, 'b': 5}, ['7', '5'], 'correct'),
    spec('Erreur : 705 cL = 70 L + 5 cL', 8, {'a': 7, 'b': 5}, ['70', '5'], 'incorrect'),
    spec('35 dL = 3 L + 5 dL', 9, {'a': 3, 'b': 5}, ['3', '5'], 'correct'),
    spec('Erreur : 35 dL = 5 L + 3 dL', 9, {'a': 3, 'b': 5}, ['5', '3'], 'incorrect'),
    spec('7 L + 80 cL = 780 cL', 10, {'a': 7, 'b': 80}, '780', 'correct'),
    spec('Erreur : 7 L + 80 cL = 87 cL', 10, {'a': 7, 'b': 80}, '87', 'incorrect'),
    spec('7 L + 5 cL = 705 cL', 10, {'a': 7, 'b': 5}, '705', 'correct'),
    spec('Erreur : 7 L + 5 cL = 750 cL (zéro mal placé)', 10, {'a': 7, 'b': 5}, '750',
         'incorrect'),
]

# =============================== DURÉES ===============================


def T(h, m, cond):
    """Heure en formule : $8~\\text{h}~30$, ou $8~\\text{h}$ si la condition `cond` (minutes)
    vaut 0 ; h et m sont des textes ou des expressions `{{…}}`."""
    return ('{{if:' + cond + '==0|$' + h + '~\\text{h}$|$' + h + '~\\text{h}~' + m + '$}}')


def Tf(h, m):
    """Heure dont les minutes ne sont jamais nulles."""
    return '$' + h + '~\\text{h}~' + m + '$'


def D(h, m):
    """Durée en heures et minutes, minutes non nulles."""
    return '$' + h + '~\\text{h}~' + m + '~\\text{min}$'


QUI = ['Le spectacle', 'Le film', 'Le concert', 'Le tournoi']
QUI_K = selon('k', QUI)
BLANK_HM = '$?~\\text{h}~?~\\text{min}$'

# ---- 12. Durées à une étape (CE2-060) ----

H_PLEINES = variation(
    QUI_K + ' commence à ' + Tf('{{h}}', '{{eval:10*q}}') + ' et finit à '
    + Tf('{{eval:h+d}}', '{{eval:10*q}}') + '. Combien de temps dure-t-il ?\n\nIl dure'
    ' $?~\\text{h}$.', ['{{d}}'],
    [var('k', '1..4'), var('h', '6..11'), var('d', '2..6'), var('q', '1..5')],
    ['Les minutes sont les mêmes au début et à la fin : on compte les heures sur l\'axe.',
     Tf('{{h}}', '{{eval:10*q}}') + ' $\\to$ ' + Tf('{{eval:h+d}}', '{{eval:10*q}}')
     + ' : ${{d}}$ heures.',
     QUI_K + ' dure $' + col('{{d}}') + '~\\text{h}$.'])

MIN_SEULES = variation(
    QUI_K + ' commence à ' + Tf('{{h}}', '{{eval:10*p}}') + ' et finit à '
    + Tf('{{h}}', '{{eval:10*q}}') + '. Combien de temps dure-t-il ?\n\nIl dure'
    ' $?~\\text{min}$.', [ev('10*(q-p)')],
    [var('k', '1..4'), var('h', '6..11'), var('p', '1..4'), var('q', '2..5')],
    ['L\'heure ne change pas : seules les minutes avancent.',
     'De ${{eval:10*p}}$ à ${{eval:10*q}}$ minutes, il s\'est écoulé ${{eval:10*(q-p)}}$ minutes.',
     QUI_K + ' dure $' + col(ev('10*(q-p)')) + '~\\text{min}$.'],
    conditions=['q > p'])

H_ET_MIN = variation(
    QUI_K + ' commence à ' + Tf('{{h}}', '{{eval:10*p}}') + ' et finit à '
    + Tf('{{eval:h+d}}', '{{eval:10*q}}') + '. Combien de temps dure-t-il ?\n\nIl dure '
    + BLANK_HM + '.', ['{{d}}', ev('10*(q-p)')],
    [var('k', '1..4'), var('h', '6..11'), var('d', '1..4'), var('p', '1..4'),
     var('q', '2..5')],
    ['On compte d\'abord les heures pleines, puis les minutes.',
     Tf('{{h}}', '{{eval:10*p}}') + ' $\\to$ ' + Tf('{{eval:h+d}}', '{{eval:10*p}}')
     + ' : ${{d}}$ {{if:d==1|heure|heures}}, puis ' + Tf('{{eval:h+d}}', '{{eval:10*p}}')
     + ' $\\to$ ' + Tf('{{eval:h+d}}', '{{eval:10*q}}') + ' : ${{eval:10*(q-p)}}$ minutes.',
     QUI_K + ' dure ' + D(col('{{d}}'), col(ev('10*(q-p)'))) + '.'],
    conditions=['q > p'])

# Les minutes de la fin sont plus petites : on passe par l'heure ronde
H_ET_MIN_PASSE = variation(
    QUI_K + ' commence à ' + Tf('{{h}}', '{{eval:10*p}}') + ' et finit à '
    + Tf('{{eval:h+d}}', '{{eval:10*q}}') + '. Combien de temps dure-t-il ?\n\nIl dure '
    + BLANK_HM + '.', ['{{eval:d-1}}', ev('60-10*(p-q)')],
    [var('k', '1..4'), var('h', '6..11'), var('d', '2..4'), var('p', '2..5'),
     var('q', '1..4')],
    ['On avance de repère en repère sur l\'axe : jusqu\'à l\'heure ronde, puis les heures'
     ' pleines, puis les minutes qui restent.',
     Tf('{{h}}', '{{eval:10*p}}') + ' $\\to$ $' + '{{eval:h+1}}~\\text{h}$ : ${{eval:60-10*p}}$'
     ' minutes. Puis $' + '{{eval:h+1}}~\\text{h}$ $\\to$ $' + '{{eval:h+d}}~\\text{h}$ : '
     '${{eval:d-1}}$ {{if:d==2|heure|heures}}. Enfin $' + '{{eval:h+d}}~\\text{h}$ $\\to$ '
     + Tf('{{eval:h+d}}', '{{eval:10*q}}') + ' : ${{eval:10*q}}$ minutes.',
     '${{eval:60-10*p}} + {{eval:10*q}} = {{eval:60-10*p+10*q}}$ minutes, et ${{eval:d-1}}$'
     ' {{if:d==2|heure|heures}} pleines.',
     QUI_K + ' dure ' + D(col('{{eval:d-1}}'), col(ev('60-10*(p-q)'))) + '.'],
    conditions=['p > q'])

FIN = variation(
    QUI_K + ' commence à ' + Tf('{{h}}', '{{eval:10*p}}') + ' et dure ' + D('{{a}}',
                                                                         '{{eval:10*r}}')
    + '. À quelle heure finit-il ?\n\nIl finit à $?~\\text{h}~?$.',
    ['{{eval:h+a}}', ev('10*(p+r)')],
    [var('k', '1..4'), var('h', '6..14'), var('a', '1..4'), var('p', '1..4'),
     var('r', '1..4')],
    ['On ajoute les heures, puis les minutes.',
     Tf('{{h}}', '{{eval:10*p}}') + ' + ${{a}}~\\text{h}$ = ' + Tf('{{eval:h+a}}',
                                                                  '{{eval:10*p}}')
     + ' ; puis + ${{eval:10*r}}~\\text{min}$ : ${{eval:10*p}} + {{eval:10*r}} ='
     ' {{eval:10*(p+r)}}$.',
     QUI_K + ' finit à ' + Tf(col('{{eval:h+a}}'), col(ev('10*(p+r)'))) + '.'],
    conditions=['p + r < 6'])

DEBUT = variation(
    QUI_K + ' finit à ' + Tf('{{h}}', '{{eval:10*q}}') + ' et dure ${{d}}~\\text{h}$.'
    ' À quelle heure a-t-il commencé ?\n\nIl a commencé à $?~\\text{h}~{{eval:10*q}}$.',
    [ev('h-d')], [var('k', '1..4'), var('h', '12..20'), var('d', '2..6'), var('q', '1..5')],
    ['Pour trouver le début, on recule sur l\'axe : on enlève les heures, les minutes ne'
     ' changent pas.',
     '${{h}}~\\text{h} - {{d}}~\\text{h} = {{eval:h-d}}~\\text{h}$.',
     QUI_K + ' a commencé à ' + Tf(col(ev('h-d')), '{{eval:10*q}}') + '.'])

SPECS_UNE_ETAPE = [
    spec('8 h 30 -> 12 h 30 = 4 h', 0, {'k': 1, 'h': 8, 'd': 4, 'q': 3}, '4', 'correct'),
    spec('Erreur : 8 h 30 -> 12 h 30 = 5 h', 0, {'k': 1, 'h': 8, 'd': 4, 'q': 3}, '5',
         'incorrect'),
    spec('Erreur : 8 h 30 -> 12 h 30 = 12', 0, {'k': 1, 'h': 8, 'd': 4, 'q': 3}, '12',
         'incorrect'),
    spec('9 h 20 -> 9 h 50 = 30 min', 1, {'k': 2, 'h': 9, 'p': 2, 'q': 5}, '30', 'correct'),
    spec('Erreur : 9 h 20 -> 9 h 50 = 3 min', 1, {'k': 2, 'h': 9, 'p': 2, 'q': 5}, '3',
         'incorrect'),
    spec('Erreur : 9 h 20 -> 9 h 50 = 70 min', 1, {'k': 2, 'h': 9, 'p': 2, 'q': 5}, '70',
         'incorrect'),
    spec('14 h 10 -> 16 h 40 = 2 h 30', 2, {'k': 3, 'h': 14, 'd': 2, 'p': 1, 'q': 4},
         ['2', '30'], 'correct'),
    spec('Erreur : 14 h 10 -> 16 h 40 = 2 h 50', 2, {'k': 3, 'h': 14, 'd': 2, 'p': 1, 'q': 4},
         ['2', '50'], 'incorrect'),
    spec('Erreur : heures et minutes échangées', 2, {'k': 3, 'h': 14, 'd': 2, 'p': 1, 'q': 4},
         ['30', '2'], 'incorrect'),
    spec('14 h 40 -> 16 h 10 = 1 h 30', 3, {'k': 4, 'h': 14, 'd': 2, 'p': 4, 'q': 1},
         ['1', '30'], 'correct'),
    spec('Erreur : 14 h 40 -> 16 h 10 = 2 h 30', 3, {'k': 4, 'h': 14, 'd': 2, 'p': 4, 'q': 1},
         ['2', '30'], 'incorrect'),
    spec('Erreur : 14 h 40 -> 16 h 10 = 2 h 30 sans recul des minutes', 3,
         {'k': 4, 'h': 14, 'd': 2, 'p': 4, 'q': 1}, ['1', '70'], 'incorrect'),
    spec('7 h 20 + 2 h 30 = 9 h 50', 4, {'k': 1, 'h': 7, 'a': 2, 'p': 2, 'r': 3},
         ['9', '50'], 'correct'),
    spec('Erreur : 7 h 20 + 2 h 30 = 9 h 30', 4, {'k': 1, 'h': 7, 'a': 2, 'p': 2, 'r': 3},
         ['9', '30'], 'incorrect'),
    spec('fin à 16 h 30, durée 3 h : début 13 h', 5, {'k': 2, 'h': 16, 'd': 3, 'q': 3}, '13',
         'correct'),
    spec('Erreur : début 19 h (on avance au lieu de reculer)', 5,
         {'k': 2, 'h': 16, 'd': 3, 'q': 3}, '19', 'incorrect'),
]

# ---- 13. Durées à deux étapes (CE2-060) ----

DEUX_H = variation(
    'Léa part à ' + Tf('{{h}}', '{{eval:10*p}}') + '. Elle marche ${{a}}~\\text{h}$, se repose'
    ' puis marche encore ${{b}}~\\text{h}$. À quelle heure arrive-t-elle ?\n\nElle arrive à'
    ' $?~\\text{h}~{{eval:10*p}}$.', [ev('h+a+b')],
    [var('h', '6..10'), var('p', '1..5'), var('a', '1..3'), var('b', '1..3')],
    ['Les deux marches se suivent : on ajoute les deux durées.',
     '${{a}}~\\text{h} + {{b}}~\\text{h} = {{eval:a+b}}~\\text{h}$.',
     '${{h}}~\\text{h} + {{eval:a+b}}~\\text{h} = {{eval:h+a+b}}~\\text{h}$ : elle arrive à '
     + Tf(col(ev('h+a+b')), '{{eval:10*p}}') + '.'])

# BO : départ 7 h 10 + 1 h 30 + 40 min
DEPART_DEUX = variation(
    selon('k', ['Léa', 'Karim', 'Inès', 'Hugo']) + ' part à '
    + Tf('{{h}}', '{{eval:10*p}}') + '. ' + selon('k', ['Elle', 'Il', 'Elle', 'Il'])
    + ' roule ' + D('{{c}}', '{{eval:10*q}}') + ', puis s\'arrête {{eval:10*w}} minutes.'
    ' À quelle heure repart-' + selon('k', ['elle', 'il', 'elle', 'il']) + ' ?\n\n'
    + selon('k', ['Elle', 'Il', 'Elle', 'Il']) + ' repart à ' + BLANK_HM + '.',
    ['{{eval:h+c+floor(t/6)}}', ev('10*u')],
    [var('k', '1..4'), var('h', '6..10'), var('p', '1..5'), var('c', '1..3'),
     var('q', '1..5'), var('w', '1..5'),
     var('t', 'eval:p+q+w'), var('u', 'eval:t-6*floor(t/6)')],
    ['On ajoute les durées une par une, en comptant sur l\'axe.',
     Tf('{{h}}', '{{eval:10*p}}') + ' + ${{c}}~\\text{h}$ = ' + Tf('{{eval:h+c}}',
                                                                  '{{eval:10*p}}')
     + ' ; puis + ${{eval:10*q}}$ min, puis + ${{eval:10*w}}$ min.',
     'Les minutes : ${{eval:10*p}} + {{eval:10*q}} + {{eval:10*w}} = {{eval:10*(p+q+w)}}$.'
     ' {{if:t>=6|Cela fait plus de 60 minutes : on retient une heure.|}}',
     'Il repart à ' + Tf(col('{{eval:h+c+floor(t/6)}}'),
                         col(ev('10*u')), ) + '.'],
    conditions=['u > 0'])

TOTAL = variation(
    'Une séance de sport commence par ' + D('{{a}}', '{{eval:10*p}}') + ' d\'échauffement et de'
    ' jeu, puis ' + selon('k', ['un match', 'un cross']) + ' de ${{eval:10*q}}~\\text{min}$.'
    ' Combien de temps dure la séance ?\n\nLa séance dure ' + BLANK_HM + '.',
    ['{{eval:a+1}}', ev('10*(p+q-6)')],
    [var('k', '1..2'), var('a', '1..3'), var('p', '3..5'), var('q', '3..5')],
    ['On ajoute les minutes : ${{eval:10*p}} + {{eval:10*q}} = {{eval:10*(p+q)}}$ minutes.',
     '${{eval:10*(p+q)}}$ minutes, c\'est $1~\\text{h}~{{eval:10*(p+q-6)}}~\\text{min}$.',
     '${{a}}~\\text{h} + 1~\\text{h} = {{eval:a+1}}~\\text{h}$.',
     'La séance dure ' + D(col('{{eval:a+1}}'), col(ev('10*(p+q-6)'))) + '.'],
    conditions=['p + q > 6'])

# Pause enlevée : de h1 h 30 à h2 h 30, moins une pause de 15 t minutes
AVEC_PAUSE = variation(
    'Un marché ouvre à ' + Tf('{{h}}', '30') + ' et ferme à ' + Tf('{{eval:h+d}}', '30')
    + '. Le marchand fait une pause de {{eval:15*t}} minutes. Combien de temps'
    ' vend-il ?\n\nIl vend pendant ' + BLANK_HM + '.',
    ['{{eval:d-1}}', ev('60-15*t')],
    [var('h', '6..9'), var('d', '3..6'), var('t', '1..3')],
    ['**Étape 1.** Du matin à la fermeture : ' + Tf('{{h}}', '30') + ' $\\to$ '
     + Tf('{{eval:h+d}}', '30') + ' : ${{d}}~\\text{h}$.',
     '**Étape 2.** On enlève la pause : ${{d}}~\\text{h} - {{eval:15*t}}~\\text{min}$.',
     '${{d}}~\\text{h} = {{eval:d-1}}~\\text{h}~60~\\text{min}$, donc $60 -'
     ' {{eval:15*t}} = {{eval:60-15*t}}$ minutes.',
     'Il vend pendant ' + D(col('{{eval:d-1}}'), col(ev('60-15*t'))) + '.'])

SPECS_DEUX_ETAPES = [
    spec('7 h 10 + 1 h + 2 h = 10 h', 0, {'h': 7, 'p': 1, 'a': 1, 'b': 2}, '10', 'correct'),
    spec('Erreur : on n\'ajoute qu\'une durée', 0, {'h': 7, 'p': 1, 'a': 1, 'b': 2}, '8',
         'incorrect'),
    spec('7 h 10 + 1 h 30 + 40 min = 9 h 20', 1,
         {'k': 1, 'h': 7, 'p': 1, 'c': 1, 'q': 3, 'w': 4, 't': 8, 'u': 2}, ['9', '20'], 'correct'),
    spec('Erreur : 7 h 10 + 1 h 30 + 40 min = 9 h 80', 1,
         {'k': 1, 'h': 7, 'p': 1, 'c': 1, 'q': 3, 'w': 4, 't': 8, 'u': 2}, ['9', '80'], 'incorrect'),
    spec('Erreur : 7 h 10 + 1 h 30 + 40 min = 8 h 20 (heure retenue oubliée)', 1,
         {'k': 1, 'h': 7, 'p': 1, 'c': 1, 'q': 3, 'w': 4, 't': 8, 'u': 2}, ['8', '20'], 'incorrect'),
    spec('8 h 20 + 2 h 10 + 20 min = 10 h 50', 1,
         {'k': 2, 'h': 8, 'p': 2, 'c': 2, 'q': 1, 'w': 2, 't': 5, 'u': 5}, ['10', '50'], 'correct'),
    spec('1 h 30 + 40 min = 2 h 10', 2, {'k': 1, 'a': 1, 'p': 3, 'q': 4}, ['2', '10'],
         'correct'),
    spec('Erreur : 1 h 30 + 40 min = 1 h 70', 2, {'k': 1, 'a': 1, 'p': 3, 'q': 4},
         ['1', '70'], 'incorrect'),
    spec('Erreur : 1 h 30 + 40 min = 2 h 70', 2, {'k': 1, 'a': 1, 'p': 3, 'q': 4},
         ['2', '70'], 'incorrect'),
    spec('8 h 30 -> 12 h 30 moins 45 min = 3 h 15', 3, {'h': 8, 'd': 4, 't': 3},
         ['3', '15'], 'correct'),
    spec('Erreur : 4 h - 45 min = 3 h 45', 3, {'h': 8, 'd': 4, 't': 3}, ['3', '45'],
         'incorrect'),
    spec('Erreur : pause oubliée', 3, {'h': 8, 'd': 4, 't': 3}, ['4', '0'], 'incorrect'),
]

MODELES = {
    '10-unites-de-contenance': modele(
        'Les unités de contenance : L, dL, cL',
        'Symbole et sens de L, dL, cL ; la plus grande et la plus petite ; choisir l\'unité'
        ' qui convient : un seau en L, un bol en dL, un verre en cL',
        'Contenances', 'Unités', 1,
        [SYMBOLE_C, SENS_C, EXTREME_C, DEUX_UNITES_C, CHOISIR_C], SPECS_UNITES_C, delay=45),
    '11-litres-decilitres-et-centilitres': modele(
        'Litres, décilitres et centilitres',
        '1 L = 10 dL = 100 cL ; 1 dL = 10 cL ; 780 cL = 7 L + 80 cL ; 35 dL = 3 L + 5 dL',
        'Contenances', 'Unités', 2,
        [UN_EN_PETITE_C, L_EN_DL, L_EN_CL, DL_EN_CL, L_EN_DL_ET_CL, DL_EN_L, CL_EN_L, CL_EN_DL,
         CL_EN_L_ET_CL, DL_EN_L_ET_DL, L_PLUS_CL], SPECS_REL_C, delay=90),
    '12-durees-a-une-etape': modele(
        'Durées à une étape',
        'Durée entre deux heures (8 h 30 -> 12 h 30), heure de fin, heure de début',
        'Durées', 'Durée écoulée', 3,
        [H_PLEINES, MIN_SEULES, H_ET_MIN, H_ET_MIN_PASSE, FIN, DEBUT], SPECS_UNE_ETAPE,
        delay=120),
    '13-durees-a-deux-etapes': modele(
        'Durées à deux étapes',
        'Départ 7 h 10 + 1 h 30 + 40 min ; deux durées à ajouter ; une pause à enlever',
        'Durées', 'Durée écoulée', 4,
        [DEUX_H, DEPART_DEUX, TOTAL, AVEC_PAUSE], SPECS_DEUX_ETAPES, delay=150),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
