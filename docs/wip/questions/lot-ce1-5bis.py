"""Écrit les 9 modèles du lot 5 bis du CE1 (masses, monnaie, durées) dans scripts/questions/ce1-5bis/.

Phase 0 validée par David le 2026-10-30 (§ 11 du journal `docs/wip/questions-ce1-progress.md`).
Bornes `cycle2.json`, CE1-049 à 053, 058, 061, 062, 085 ; BO CE1 p.28-29 : g, kg ; 1 kg = 1 000 g ;
paquet de sucre 1 kg, sachet de levure 10 g ; ordonner « 1 kg et 300 g ; 1 000 g ; 50 kg ; 2 kg et
100 g » ; 100 centimes = 1 € ; 345 centimes = 3 € + 45 centimes ; 2,17 € ; 2,05 € et 2,50 € ;
0,85 € ; 1 € et 120 centimes = 2,20 € ; « trois heures de l'après-midi », « 14 : 15 » ; 1 h =
60 min, demi-heure, quarts d'heure ; « Je suis resté deux heures à la piscine ». Décisions :

1. Pas d'écriture à virgule en masses (BO) ; virgule en monnaie seulement ; nombres écrits ≤ 1 000.
2. Texte et case choix ; aucun outil neuf.
3. Ordonner quatre masses : la plus lourde et la plus légère en case choix (question 2 du § 11).
4. Catégories neuves « Masses · Unités », « Masses · Ordres de grandeur », « Monnaie · Euros et
   centimes », « Durées · Unités » ; « Masses · Comparaison » et « Durées · Moments de la
   journée » à la suite du CP (relevé MCP du 2026-10-30 : niveau 1 chacune).
5. Prix : en centimes dans les variables, écrits à deux décimales (`euros()`) ; `zeros: off`
   (2,20 € et 2,2 € justes tous deux, question 4 du § 11) ; le corrigé écrit toujours 2,20 €.
6. Indice de la bonne réponse d'une case choix : une variable `r` calculée ; les listes sont
   rangées par bonne réponse. Jamais de variable `e` ni `i`.

    python3 docs/wip/questions/lot-ce1-5bis.py scripts/questions/ce1-5bis
"""
import json
import sys

DOSSIER = sys.argv[1]
SANS_ZEROS = {'constraints': {'zeros': 'off'}}

# ---- Gabarits ----


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(x) for k, x in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(title, description, domain, subdomain, level, variations, specs, delay=60,
           options=None):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (sous-notion du point) est posé par la migration
    m = {'title': title, 'description': description, 'grades': ['CE1'], 'theme': 'Grandeurs',
         'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': delay,
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


def Q(n, u):
    """Grandeur en formule : $150~\\unit{g}$."""
    return '$' + str(n) + '~\\unit{' + u + '}$'


def euros(c):
    """Prix de `c` centimes, toujours à deux décimales (« 7.50 », « 1.05 »)."""
    return ('{{eval:floor((' + c + ')/100)}}.{{eval:floor(mod(' + c + ',100)/10)}}{{eval:mod('
            + c + ',10)}}')


def prix(c):
    """Prix de `c` centimes en formule : $7.50~\\unit{€}$."""
    return '$' + euros(c) + '~\\unit{€}$'


def en_euros(c):
    """Attendu d'une case en euros : `c` centimes, écriture décimale."""
    return '{{eval:(' + c + ')/100;d}}'


def centimes(x):
    """« 1 centime », « 45 centimes » : accord au singulier quand x vaut 1."""
    return '{{if:' + x + '==1|centime|centimes}}'


MILLE = '1\\,000'
EURO = '~\\text{€}'  # juste après une case : case de nombre
# Signe de comparaison selon r (0 : <, 1 : =, 2 : >)
SIGNE = '{{if:r==0|<|{{if:r==1|=|>}}}}'
SIGNES = choix(['$<$', '$=$', '$>$'], melanger=False)

# ---- 7. Unités de masse (CE1-049) ----

SYMBOLE = variation(
    'Quel est le symbole du {{if:k==1|kilogramme|gramme}} ?' + choix(['kg', 'g', 'km']),
    ['{{r}}'], [var('k', '1..2'), var('r', 'eval:k-1')],
    ['Le kilogramme s\'écrit kg, le gramme s\'écrit g ; km, c\'est le kilomètre, une unité de'
     ' longueur.',
     'Le {{if:k==1|kilogramme|gramme}} s\'écrit **{{if:k==1|kg|g}}**.'])

# Quatre objets pesés en grammes, puis quatre en kilogrammes : r = floor((k-1)/4)
PESES = ['une pomme', 'une lettre', 'une gomme', 'un crayon',
         'un sac de pommes de terre', 'un enfant', 'un vélo', 'un chien']

PESER = variation(
    'Pour peser ' + selon('k', PESES) + ', quelle unité convient ?'
    + choix(['le gramme (g)', 'le kilogramme (kg)'], melanger=False),
    ['{{r}}'], [var('k', '1..8'), var('r', 'eval:floor((k-1)/4)')],
    ['{{if:r==0|C\'est un objet léger, qu\'on tient dans la main : on le pèse en grammes.'
     '|C\'est lourd, plus lourd qu\'un paquet de sucre de $1~\\unit{kg}$ : on le pèse en'
     ' kilogrammes.}}',
     'On pèse ' + selon('k', PESES) + ' en **{{if:r==0|grammes|kilogrammes}}**.'])

SPECS_UNITES = [
    spec('symbole du kilogramme : kg', 0, {'k': 1, 'r': 0}, '0', 'correct'),
    spec('Erreur : kilogramme → km', 0, {'k': 1, 'r': 0}, '2', 'incorrect'),
    spec('symbole du gramme : g', 0, {'k': 2, 'r': 1}, '1', 'correct'),
    spec('Erreur : gramme → kg', 0, {'k': 2, 'r': 1}, '0', 'incorrect'),
    spec('pomme : g', 1, {'k': 1, 'r': 0}, '0', 'correct'),
    spec('Erreur : pomme en kg', 1, {'k': 1, 'r': 0}, '1', 'incorrect'),
    spec('vélo : kg', 1, {'k': 7, 'r': 1}, '1', 'correct'),
    spec('Erreur : vélo en g', 1, {'k': 7, 'r': 1}, '0', 'incorrect'),
]

# ---- 8. Un kilogramme, mille grammes (CE1-050) ----

UN_KG = variation(
    'Complète.\n\n${{if:s==1|1~\\unit{kg} = ?~\\text{g}|' + MILLE + '~\\unit{g} = ?~\\text{kg}}}$',
    [ev('1000-999*(s-1)')], [var('s', '1..2')],
    ['Dans un kilogramme, il y a mille grammes.',
     '$${{if:s==1|1~\\unit{kg} = ' + col(MILLE) + '~\\unit{g}|' + MILLE + '~\\unit{g} = '
     + col('1') + '~\\unit{kg}}}$$'])

VERS_UN_KG = variation(
    'Complète.\n\n${{a}}~\\unit{g} + ?~\\text{g} = 1~\\unit{kg}$', [ev('1000-a')],
    [var('k', '2..18'), var('a', 'eval:50*k')],
    ['$1~\\unit{kg} = ' + MILLE + '~\\unit{g}$ : on cherche ce qu\'il faut ajouter à ${{a}}$'
     ' pour arriver à $' + MILLE + '$.',
     '$${{a}} + ' + col(ev('1000-a')) + ' = ' + MILLE + '$$'])

# BO : 250 g + 250 g + 500 g = 1 kg. Trois masses de 250, 500 ou 750 g ; total 1 kg ou 2 kg
SOMME_KG = variation(
    'Complète.\n\n$' + ev('250*p') + '~\\unit{g} + ' + ev('250*q') + '~\\unit{g} + '
    + ev('250*(4*n-p-q)') + '~\\unit{g} = ?~\\text{kg}$', ['{{n}}'],
    [var('n', '1..2'), var('p', '1..3'), var('q', '1..3')],
    ['On ajoute les grammes :',
     '$$' + ev('250*p') + ' + ' + ev('250*q') + ' + ' + ev('250*(4*n-p-q)') + ' = '
     + '{{if:n==1|' + MILLE + '|2\\,000}}$$',
     '{{if:n==1|$' + MILLE + '~\\unit{g}$, c\'est $1~\\unit{kg}$.|$' + MILLE + '~\\unit{g} + '
     + MILLE + '~\\unit{g}$, c\'est $1~\\unit{kg} + 1~\\unit{kg}$.}}',
     '$$' + ev('250*p') + '~\\unit{g} + ' + ev('250*q') + '~\\unit{g} + ' + ev('250*(4*n-p-q)')
     + '~\\unit{g} = ' + col('{{n}}') + '~\\unit{kg}$$'],
    ['4*n-p-q>=1', '4*n-p-q<=3'])

SPECS_KG = [
    spec('1 kg = 1 000 g', 0, {'s': 1}, '1000', 'correct'),
    spec('Erreur : 1 kg = 100 g', 0, {'s': 1}, '100', 'incorrect'),
    spec('1 000 g = 1 kg', 0, {'s': 2}, '1', 'correct'),
    spec('Erreur : 1 000 g = 1 000 kg', 0, {'s': 2}, '1000', 'incorrect'),
    spec('400 g + 600 g = 1 kg', 1, {'k': 8, 'a': 400}, '600', 'correct'),
    spec('Erreur : 400 + 100 (vers 500)', 1, {'k': 8, 'a': 400}, '100', 'incorrect'),
    spec('Erreur : 650 + 450 (retenue oubliée)', 1, {'k': 13, 'a': 650}, '450', 'incorrect'),
    spec('BO : 250 g + 250 g + 500 g = 1 kg', 2, {'n': 1, 'p': 1, 'q': 1}, '1', 'correct'),
    spec('Erreur : 1 000 kg', 2, {'n': 1, 'p': 1, 'q': 1}, '1000', 'incorrect'),
    spec('750 g + 750 g + 500 g = 2 kg', 2, {'n': 2, 'p': 3, 'q': 3}, '2', 'correct'),
]

# ---- 9. Comparer des masses (CE1-051) ----

COMPARER = 'Compare ces deux masses.\n\n$$'

KG_ET_G = variation(
    COMPARER + '1~\\unit{kg} \\quad \\ldots \\quad {{b}}~\\unit{g}$$' + SIGNES, ['{{r}}'],
    [var('k', '2..20'), var('b', 'eval:50*k'), var('r', 'eval:sign(1000-b)+1')],
    ['On écrit les deux masses dans la même unité : $1~\\unit{kg} = ' + MILLE
     + '~\\unit{g}$.', '$$' + MILLE + '~\\unit{g} ' + SIGNE + ' {{b}}~\\unit{g}$$',
     '$$1~\\unit{kg} ' + col(SIGNE) + ' {{b}}~\\unit{g}$$'])

# BO : 2 kg et 100 g contre 950 g ; piège : 100 < 950, mais les kilogrammes l'emportent
KG_G_ET_G = variation(
    COMPARER + '{{a}}~\\unit{kg}~' + ev('50*p') + '~\\unit{g} \\quad \\ldots \\quad '
    + ev('50*q') + '~\\unit{g}$$' + SIGNES, ['2'],
    [var('a', '1..2'), var('p', '1..18'), var('q', '2..19')],
    ['${{a}}~\\unit{kg}$, c\'est déjà {{if:a==1|$' + MILLE + '~\\unit{g}$|deux fois $' + MILLE
     + '~\\unit{g}$}} : plus que $' + ev('50*q') + '~\\unit{g}$.',
     'On ne compare pas seulement $' + ev('50*p') + '$ et $' + ev('50*q') + '$ : il faut compter'
     ' les kilogrammes.',
     '$${{a}}~\\unit{kg}~' + ev('50*p') + '~\\unit{g} ' + col('>') + ' ' + ev('50*q')
     + '~\\unit{g}$$'],
    ['q>p'])

# BO : « 1 kg et 300 g ; 1 000 g ; 50 kg ; 2 kg et 100 g » ; la plus lourde (r = 0) ou la
# plus légère (r = 1), mélangées à l'affichage
QUATRE = [Q('{{n}}', 'kg'), Q(MILLE, 'g'), '$1~\\unit{kg}~' + ev('100*p') + '~\\unit{g}$',
          '$2~\\unit{kg}~' + ev('100*q') + '~\\unit{g}$']

LOURDE = variation(
    'Quelle est la masse la plus {{if:s==1|lourde|légère}} ?' + choix(QUATRE), ['{{r}}'],
    [var('s', '1..2'), var('r', 'eval:s-1'), var('n', '3..50'), var('p', '1..9'),
     var('q', '1..9')],
    ['On compare d\'abord les kilogrammes : $' + MILLE + '~\\unit{g} = 1~\\unit{kg}$.',
     '$' + MILLE + '~\\unit{g}$ fait $1~\\unit{kg}$ tout juste, $1~\\unit{kg}~' + ev('100*p')
     + '~\\unit{g}$ un peu plus, $2~\\unit{kg}~' + ev('100*q') + '~\\unit{g}$ plus de'
     ' $2~\\unit{kg}$, et ${{n}}~\\unit{kg}$ encore plus.',
     'La plus {{if:s==1|lourde est **${{n}}~\\unit{kg}$**|légère est **$' + MILLE
     + '~\\unit{g}$**}}.'])

SPECS_COMPARER = [
    spec('1 kg > 900 g', 0, {'k': 18, 'b': 900, 'r': 2}, '2', 'correct'),
    spec('Erreur : 1 kg < 900 g (nombres seuls)', 0, {'k': 18, 'b': 900, 'r': 2}, '0',
         'incorrect'),
    spec('1 kg = 1 000 g', 0, {'k': 20, 'b': 1000, 'r': 1}, '1', 'correct'),
    spec('1 kg > 500 g', 0, {'k': 10, 'b': 500, 'r': 2}, '2', 'correct'),
    spec('BO : 2 kg 100 g > 950 g', 1, {'a': 2, 'p': 2, 'q': 19}, '2', 'correct'),
    spec('Erreur : 2 kg 100 g < 950 g (100 < 950)', 1, {'a': 2, 'p': 2, 'q': 19}, '0',
         'incorrect'),
    spec('BO : la plus lourde, 50 kg', 2, {'s': 1, 'r': 0, 'n': 50, 'p': 3, 'q': 1}, '0',
         'correct'),
    spec('Erreur : la plus lourde, 2 kg 100 g', 2, {'s': 1, 'r': 0, 'n': 50, 'p': 3, 'q': 1}, '3',
         'incorrect'),
    spec('BO : la plus légère, 1 000 g', 2, {'s': 2, 'r': 1, 'n': 50, 'p': 3, 'q': 1}, '1',
         'correct'),
    spec('Erreur : la plus légère, 1 kg 300 g', 2, {'s': 2, 'r': 1, 'n': 50, 'p': 3, 'q': 1},
         '2', 'incorrect'),
]

# ---- 10. Masses de référence (CE1-052) ----

REFERENCES = ('Quelques masses à retenir : un trombone pèse environ $1~\\unit{g}$, un sachet de'
              ' levure environ $10~\\unit{g}$ ; un paquet de sucre pèse $1~\\unit{kg}$, comme'
              ' une bouteille d\'eau d\'un litre.')

# La bonne réponse en premier (mélangée à l'affichage) : r = 0
QUOI = [  # (masse, juste, leurre, leurre)
    (Q(1, 'g'), 'un trombone', 'un paquet de sucre', 'un cartable'),
    (Q(10, 'g'), 'un sachet de levure', 'un paquet de sucre', 'une pastèque'),
    (Q(1, 'kg'), 'un paquet de sucre', 'un sachet de levure', 'une voiture'),
]

QUI_PESE = variation(
    'Qu\'est-ce qui pèse environ ' + selon('k', [q[0] for q in QUOI]) + ' ?'
    + choix([selon('k', [q[j] for q in QUOI]) for j in (1, 2, 3)]), ['0'],
    [var('k', '1..3')],
    [REFERENCES, 'C\'est ' + selon('k', [q[1] for q in QUOI]) + ' qui pèse environ '
     + selon('k', [q[0] for q in QUOI]) + '.'])

# Deux en grammes, deux en kilogrammes : r = floor((k-1)/2)
ENVIRON = [('Un trombone', 1), ('Un sachet de levure', 10), ('Un paquet de sucre', 1),
           ('Une bouteille d\'eau d\'un litre', 1)]
NOMBRE_K = selon('k', [str(n) for _, n in ENVIRON])

PESE_ENVIRON = variation(
    selon('k', [o for o, _ in ENVIRON]) + ' pèse environ…'
    + choix(['$' + NOMBRE_K + '~\\unit{' + u + '}$' for u in ('g', 'kg')], melanger=False),
    ['{{r}}'], [var('k', '1..4'), var('r', 'eval:floor((k-1)/2)')],
    [REFERENCES, selon('k', [o for o, _ in ENVIRON]) + ' pèse environ $' + NOMBRE_K
     + '~\\unit{{{if:r==0|g|kg}}}$.'])

SPECS_REFERENCES = [
    spec('BO : environ 1 kg, le paquet de sucre', 0, {'k': 3}, '0', 'correct'),
    spec('Erreur : 1 kg, le sachet de levure', 0, {'k': 3}, '1', 'incorrect'),
    spec('BO : environ 10 g, le sachet de levure', 0, {'k': 2}, '0', 'correct'),
    spec('Erreur : 10 g, le paquet de sucre', 0, {'k': 2}, '1', 'incorrect'),
    spec('levure : 10 g', 1, {'k': 2, 'r': 0}, '0', 'correct'),
    spec('Erreur : levure de 10 kg', 1, {'k': 2, 'r': 0}, '1', 'incorrect'),
    spec('sucre : 1 kg', 1, {'k': 3, 'r': 1}, '1', 'correct'),
    spec('Erreur : sucre de 1 g', 1, {'k': 3, 'r': 1}, '0', 'incorrect'),
]

# ---- 11. Estimer une masse (CE1-085) ----
# BO : « une pomme, plutôt 15 g, 150 g ou 15 kg ». Trois réponses de plus en plus lourdes ;
# trois objets par bonne réponse : r = floor((k-1)/3)

ESTIMER = [  # (objet, légère, moyenne, lourde)
    ('Une gomme', Q(20, 'g'), Q(200, 'g'), Q(20, 'kg')),
    ('Un crayon', Q(5, 'g'), Q(50, 'g'), Q(5, 'kg')),
    ('Une lettre', Q(20, 'g'), Q(200, 'g'), Q(20, 'kg')),
    ('Une pomme', Q(15, 'g'), Q(150, 'g'), Q(15, 'kg')),
    ('Un livre', Q(30, 'g'), Q(300, 'g'), Q(30, 'kg')),
    ('Une baguette de pain', Q(25, 'g'), Q(250, 'g'), Q(25, 'kg')),
    ('Un chat', Q(4, 'g'), Q(40, 'g'), Q(4, 'kg')),
    ('Un vélo d\'enfant', Q(10, 'g'), Q(100, 'g'), Q(10, 'kg')),
    ('Un enfant de CE1', Q(25, 'g'), Q(250, 'g'), Q(25, 'kg')),
]
OBJET_K = selon('k', [o[0] for o in ESTIMER])

PLUTOT = variation(
    OBJET_K + ' pèse plutôt…'
    + choix([selon('k', [o[j] for o in ESTIMER]) for j in (1, 2, 3)], melanger=False),
    ['{{r}}'], [var('k', '1..9'), var('r', 'eval:floor((k-1)/3)')],
    ['On compare avec des masses connues : un sachet de levure pèse environ $10~\\unit{g}$, un'
     ' paquet de sucre $1~\\unit{kg}$.',
     OBJET_K + ' pèse plutôt ' + selon('k', [o[1 + (k // 3)] for k, o in enumerate(ESTIMER)])
     + '.'])

SPECS_ESTIMER = [
    spec('BO : pomme, 150 g', 0, {'k': 4, 'r': 1}, '1', 'correct'),
    spec('Erreur : pomme de 15 g', 0, {'k': 4, 'r': 1}, '0', 'incorrect'),
    spec('Erreur : pomme de 15 kg', 0, {'k': 4, 'r': 1}, '2', 'incorrect'),
    spec('crayon : 5 g', 0, {'k': 2, 'r': 0}, '0', 'correct'),
    spec('enfant : 25 kg', 0, {'k': 9, 'r': 2}, '2', 'correct'),
    spec('Erreur : enfant de 250 g', 0, {'k': 9, 'r': 2}, '1', 'incorrect'),
]

# ---- 12. Euros et centimes (CE1-053) ----

EUROS_EN_C = variation(
    'Complète.\n\n${{a}}~\\unit{€} = ?~\\text{centimes}$', [ev('100*a')], [var('a', '1..9')],
    ['Un euro, c\'est cent centimes : $1~\\unit{€} = 100$ centimes.',
     '{{if:a==1|$1~\\unit{€} = ' + col('100') + '$ centimes.|${{a}}~\\unit{€}$, c\'est ${{a}}$'
     ' fois $100$ centimes : ${{a}}~\\unit{€} = ' + col(ev('100*a')) + '$ centimes.}}'])

C_EN_EUROS = variation(
    'Complète.\n\n$' + ev('100*a') + '~\\text{centimes} = ?~\\text{€}$', ['{{a}}'],
    [var('a', '2..9')],
    ['$100$ centimes, c\'est $1~\\unit{€}$ : dans $' + ev('100*a') + '$ centimes, il y a'
     ' ${{a}}$ fois $100$ centimes.',
     '$$' + ev('100*a') + '~\\text{centimes} = ' + col('{{a}}') + '~\\unit{€}$$'])

# BO : 345 centimes = 300 centimes + 45 centimes = 3 € + 45 centimes
C_EN_EUROS_ET_C = variation(
    'Complète.\n\n$' + ev('100*a+b') + '~\\text{centimes} = ?~\\text{€}~\\text{et}~?~\\text{'
    + centimes('b') + '}$', ['{{a}}', '{{b}}'], [var('a', '1..9'), var('b', '1..99')],
    ['$$' + ev('100*a+b') + '~\\text{centimes} = ' + ev('100*a') + '~\\text{centimes} + {{b}}~'
     '\\text{' + centimes('b') + '}$$',
     '$' + ev('100*a') + '$ centimes, c\'est ${{a}}~\\unit{€}$.',
     '$$' + ev('100*a+b') + '~\\text{centimes} = ' + col('{{a}}') + '~\\unit{€}~\\text{et}~'
     + col('{{b}}') + '~\\text{' + centimes('b') + '}$$'])

VERS_UN_EURO = variation(
    'Complète.\n\n${{b}}~\\text{centimes} + ?~\\text{centimes} = 1~\\unit{€}$', [ev('100-b')],
    [var('k', '2..19'), var('b', 'eval:5*k')],
    ['$1~\\unit{€} = 100$ centimes : on cherche ce qu\'il faut ajouter à ${{b}}$ pour arriver à'
     ' $100$.',
     '$${{b}} + ' + col(ev('100-b')) + ' = 100$$'])

SPECS_EUROS = [
    spec('1 € = 100 centimes', 0, {'a': 1}, '100', 'correct'),
    spec('Erreur : 1 € = 10 centimes', 0, {'a': 1}, '10', 'incorrect'),
    spec('BO : 3 € = 300 centimes', 0, {'a': 3}, '300', 'correct'),
    spec('BO : 200 centimes = 2 €', 1, {'a': 2}, '2', 'correct'),
    spec('Erreur : 200 centimes = 200 €', 1, {'a': 2}, '200', 'incorrect'),
    spec('BO : 345 centimes = 3 € et 45 centimes', 2, {'a': 3, 'b': 45}, ['3', '45'], 'correct'),
    spec('Erreur : 345 centimes = 34 € et 5 centimes', 2, {'a': 3, 'b': 45}, ['34', '5'],
         'incorrect'),
    spec('305 centimes = 3 € et 5 centimes', 2, {'a': 3, 'b': 5}, ['3', '5'], 'correct'),
    spec('65 + 35 = 100 centimes', 3, {'k': 13, 'b': 65}, '35', 'correct'),
    spec('Erreur : 65 + 45 (retenue oubliée)', 3, {'k': 13, 'b': 65}, '45', 'incorrect'),
]

# ---- 13. Écriture à virgule (CE1-058) ----

VIRGULE = 'La virgule sépare les euros des centimes ; après la virgule, il y a toujours deux chiffres.'

# BO : 2 € et 17 centimes s'écrit 2,17 €
EUROS_ET_C = variation(
    'Complète.\n\n${{a}}~\\unit{€}~\\text{et}~{{b}}~\\text{' + centimes('b') + '} = ?' + EURO
    + '$', [en_euros('100*a+b')], [var('a', '1..9'), var('b', '10..99')],
    [VIRGULE, '$${{a}}~\\unit{€}~\\text{et}~{{b}}~\\text{centimes} = '
     + col(euros('100*a+b')) + '~\\unit{€}$$'])

# BO : 2 € et 5 centimes s'écrit 2,05 €, à distinguer de 2 € et 50 centimes (2,50 €)
PEU_DE_C = variation(
    'Complète.\n\n${{a}}~\\unit{€}~\\text{et}~{{b}}~\\text{' + centimes('b') + '} = ?' + EURO
    + '$', [en_euros('100*a+b')], [var('a', '1..9'), var('b', '1..9')],
    [VIRGULE, 'Avec ${{b}}$ ' + centimes('b') + ', on écrit $0{{b}}$ après la virgule : $'
     + euros('100*a+10*b') + '~\\unit{€}$, ce serait ${{a}}~\\unit{€}$ et $' + ev('10*b')
     + '$ centimes.',
     '$${{a}}~\\unit{€}~\\text{et}~{{b}}~\\text{' + centimes('b') + '} = '
     + col(euros('100*a+b')) + '~\\unit{€}$$'])

# BO : 85 centimes = 0,85 €
C_SEULS = variation(
    'Complète.\n\n${{b}}~\\text{centimes} = ?' + EURO + '$', [en_euros('b')],
    [var('b', '11..99')],
    [VIRGULE, 'Il n\'y a pas d\'euro : on écrit $0$ avant la virgule.',
     '$${{b}}~\\text{centimes} = ' + col(euros('b')) + '~\\unit{€}$$'],
    ['mod(b,10)!=0'])

# BO : 1 € et 120 centimes = 1 € + 1 € + 20 centimes = 2,20 €
PLUS_DE_100 = variation(
    'Complète.\n\n${{a}}~\\unit{€}~\\text{et}~' + ev('100+b') + '~\\text{centimes} = ?' + EURO
    + '$', [en_euros('100*a+100+b')], [var('a', '1..5'), var('b', '1..99')],
    ['$' + ev('100+b') + '$ centimes, c\'est $1~\\unit{€}$ et ${{b}}$ ' + centimes('b') + '.',
     '$${{a}}~\\unit{€} + 1~\\unit{€} + {{b}}~\\text{' + centimes('b') + '} = ' + ev('a+1')
     + '~\\unit{€}~\\text{et}~{{b}}~\\text{' + centimes('b') + '}$$', VIRGULE,
     '$${{a}}~\\unit{€}~\\text{et}~' + ev('100+b') + '~\\text{centimes} = '
     + col(euros('100*a+100+b')) + '~\\unit{€}$$'])

# BO : 3,45 € = 3 € + 45 centimes
VIRGULE_VERS_C = variation(
    'Complète.\n\n$' + euros('100*a+b') + '~\\unit{€} = ?~\\text{€}~\\text{et}~?~\\text{'
    + centimes('b') + '}$', ['{{a}}', '{{b}}'], [var('a', '1..9'), var('b', '1..99')],
    ['Avant la virgule, les euros ; après la virgule, les centimes.',
     '$$' + euros('100*a+b') + '~\\unit{€} = ' + col('{{a}}') + '~\\unit{€}~\\text{et}~'
     + col('{{b}}') + '~\\text{' + centimes('b') + '}$$'])

SPECS_VIRGULE = [
    spec('BO : 2 € et 17 centimes = 2,17 €', 0, {'a': 2, 'b': 17}, '2{,}17', 'correct'),
    spec('BO : 2 € et 50 centimes = 2,50 €', 0, {'a': 2, 'b': 50}, '2{,}50', 'correct'),
    spec('2,5 € accepté (zeros: off)', 0, {'a': 2, 'b': 50}, '2{,}5', 'correct'),
    spec('Erreur : 2 € et 17 centimes = 217 €', 0, {'a': 2, 'b': 17}, '217', 'incorrect'),
    spec('BO : 2 € et 5 centimes = 2,05 €', 1, {'a': 2, 'b': 5}, '2{,}05', 'correct'),
    spec('Erreur : 2 € et 5 centimes = 2,5 €', 1, {'a': 2, 'b': 5}, '2{,}5', 'incorrect'),
    spec('BO : 85 centimes = 0,85 €', 2, {'b': 85}, '0{,}85', 'correct'),
    spec('Erreur : 85 centimes = 85 €', 2, {'b': 85}, '85', 'incorrect'),
    spec('BO : 1 € et 120 centimes = 2,20 €', 3, {'a': 1, 'b': 20}, '2{,}20', 'correct'),
    spec('BO : 2,2 € accepté (zeros: off)', 3, {'a': 1, 'b': 20}, '2{,}2', 'correct'),
    spec('Erreur : 1 € et 120 centimes = 1,20 €', 3, {'a': 1, 'b': 20}, '1{,}2', 'incorrect'),
    spec('BO : 3,45 € = 3 € et 45 centimes', 4, {'a': 3, 'b': 45}, ['3', '45'], 'correct'),
    spec('Erreur : 3,45 € = 345 € et 0 centime', 4, {'a': 3, 'b': 45}, ['345', '0'],
         'incorrect'),
]

# ---- 14. Heures du matin et de l'après-midi (CE1-061) ----

APRES_MIDI = ('Après midi, on continue de compter : $13~\\unit{h}$, c\'est 1 heure de'
              ' l\'après-midi, $14~\\unit{h}$, 2 heures de l\'après-midi, et ainsi de suite'
              ' (on ajoute $12$).')

# BO : « trois heures de l'après-midi » ; de 1 à 5 heures de l'après-midi
VERS_24 = variation(
    'Complète.\n\n{{h}} {{if:h==1|heure|heures}} de l\'après-midi, c\'est $?~\\text{h}$.',
    [ev('h+12')], [var('h', '1..5')],
    [APRES_MIDI, '$${{h}} + 12 = ' + col(ev('h+12')) + '$$',
     '{{h}} {{if:h==1|heure|heures}} de l\'après-midi, c\'est $' + ev('h+12') + '~\\unit{h}$.'])

# BO : « 14 : 15 » sur une horloge digitale. Cinq heures du matin (7 h à 11 h), puis cinq de
# l'après-midi (13 h à 17 h) : r = floor((k-1)/5)
MINUTES = '{{if:q==0|00|' + ev('15*q') + '}}'
HEURE_K = ev('k+6+floor((k-1)/5)')

MATIN_OU = variation(
    'Une horloge digitale affiche :\n\n$$' + HEURE_K + '\\,:\\,' + MINUTES + '$$\n\nEst-ce le'
    ' matin ou l\'après-midi ?' + choix(['le matin', 'l\'après-midi'], melanger=False),
    ['{{r}}'], [var('k', '1..10'), var('q', '0..3'), var('r', 'eval:floor((k-1)/5)')],
    ['Le matin, les heures vont jusqu\'à midi ($12~\\unit{h}$). ' + APRES_MIDI,
     '$' + HEURE_K + '$ est {{if:r==0|plus petit|plus grand}} que $12$ : c\'est **{{if:r==0|le'
     ' matin|l\'après-midi}}**{{if:r==1|, ' + ev('k-5') + ' {{if:k==6|heure|heures}} de'
     ' l\'après-midi|}}.'])

# 18 h à 23 h : 6 à 11 heures du soir
DU_SOIR = variation(
    'Complète.\n\n$' + ev('h+12') + '~\\unit{h}$, c\'est $?$ heures du soir.', ['{{h}}'],
    [var('h', '6..11')],
    [APRES_MIDI, '$$' + ev('h+12') + ' - 12 = ' + col('{{h}}') + '$$',
     '$' + ev('h+12') + '~\\unit{h}$, c\'est {{h}} heures du soir.'])

SPECS_MATIN = [
    spec('BO : 3 heures de l\'après-midi = 15 h', 0, {'h': 3}, '15', 'correct'),
    spec('Erreur : 3 heures de l\'après-midi = 3 h', 0, {'h': 3}, '3', 'incorrect'),
    spec('1 heure de l\'après-midi = 13 h', 0, {'h': 1}, '13', 'correct'),
    spec('BO : 14 : 15, l\'après-midi', 1, {'k': 7, 'q': 1, 'r': 1}, '1', 'correct'),
    spec('Erreur : 14 : 15, le matin', 1, {'k': 7, 'q': 1, 'r': 1}, '0', 'incorrect'),
    spec('9 : 30, le matin', 1, {'k': 3, 'q': 2, 'r': 0}, '0', 'correct'),
    spec('20 h = 8 heures du soir', 2, {'h': 8}, '8', 'correct'),
    spec('Erreur : 20 h = 10 heures du soir', 2, {'h': 8}, '10', 'incorrect'),
]

# ---- 15. Heure et minute (CE1-062) ----

RELATIONS = ('$1~\\unit{h} = 60~\\unit{min}$ ; une demi-heure, c\'est la moitié : $30~\\unit{min}$ ;'
             ' un quart d\'heure, c\'est le quart : $15~\\unit{min}$.')

# BO : 1 heure = 60 minutes ; 1 demi-heure = 30 minutes ; 1 quart d'heure = 15 minutes ; trois
# quarts d'heure. Rangées de 15 en 15 : la réponse vaut 15·k
DUREES = ['Un quart d\'heure', 'Une demi-heure', 'Trois quarts d\'heure', 'Une heure']

EN_MINUTES = variation(
    'Complète.\n\n' + selon('k', DUREES) + ', c\'est $?~\\text{min}$.', [ev('15*k')],
    [var('k', '1..4')],
    [RELATIONS, '{{if:k==3|Trois quarts d\'heure, c\'est trois fois un quart d\'heure : $15 +'
     ' 15 + 15 = 45$.|}}',
     selon('k', DUREES) + ', c\'est $' + col(ev('15*k')) + '~\\unit{min}$.'])

H_EN_MIN = variation(
    'Complète.\n\n${{a}}~\\unit{h} = ?~\\text{min}$', [ev('60*a')], [var('a', '2..5')],
    ['$1~\\unit{h} = 60~\\unit{min}$ : ${{a}}~\\unit{h}$, c\'est ${{a}}$ fois'
     ' $60~\\unit{min}$.', '$${{a}}~\\unit{h} = ' + col(ev('60*a')) + '~\\unit{min}$$'])

H_PLUS_MIN = variation(
    'Complète.\n\n${{a}}~\\unit{h}~{{b}}~\\unit{min} = ?~\\text{min}$', [ev('60*a+b')],
    [var('a', '1..3'), var('k', '1..11'), var('b', 'eval:5*k')],
    ['On écrit d\'abord les heures en minutes : ${{a}}~\\unit{h} = ' + ev('60*a')
     + '~\\unit{min}$.', 'Puis on ajoute les minutes :',
     '$$' + ev('60*a') + ' + {{b}} = ' + col(ev('60*a+b')) + '$$'])

# BO : « J'ai mis cinq minutes pour réaliser cet exercice », « Je suis resté deux heures à la
# piscine ». Quatre durées en minutes, puis quatre en heures : r = floor((k-1)/4)
ACTIVITES = ['J\'ai mis $5$ … pour faire cet exercice.', 'Je me brosse les dents pendant $3$ …',
             'La récréation dure $15$ …', 'Pour aller à l\'école à pied, je mets $10$ …',
             'Je suis resté $2$ … à la piscine.', 'Nous sommes restés $4$ … au musée.',
             'La nuit, je dors $10$ …', 'Le voyage en train a duré $3$ …']

H_OU_MIN = variation(
    selon('k', ACTIVITES) + '\n\nQuelle unité convient ?'
    + choix(['minutes (min)', 'heures (h)'], melanger=False),
    ['{{r}}'], [var('k', '1..8'), var('r', 'eval:floor((k-1)/4)')],
    ['{{if:r==0|C\'est une action courte, finie bien avant une heure : on compte en minutes.'
     '|C\'est long, plus d\'une heure : on compte en heures.}}',
     'L\'unité qui convient : les **{{if:r==0|minutes|heures}}**.'])

SPECS_HEURES = [
    spec('BO : 1 h = 60 min', 0, {'k': 4}, '60', 'correct'),
    spec('Erreur : 1 h = 100 min', 0, {'k': 4}, '100', 'incorrect'),
    spec('BO : une demi-heure = 30 min', 0, {'k': 2}, '30', 'correct'),
    spec('Erreur : une demi-heure = 50 min', 0, {'k': 2}, '50', 'incorrect'),
    spec('BO : un quart d\'heure = 15 min', 0, {'k': 1}, '15', 'correct'),
    spec('Erreur : un quart d\'heure = 25 min', 0, {'k': 1}, '25', 'incorrect'),
    spec('BO : trois quarts d\'heure = 45 min', 0, {'k': 3}, '45', 'correct'),
    spec('2 h = 120 min', 1, {'a': 2}, '120', 'correct'),
    spec('Erreur : 2 h = 200 min', 1, {'a': 2}, '200', 'incorrect'),
    spec('1 h 15 min = 75 min', 2, {'a': 1, 'k': 3, 'b': 15}, '75', 'correct'),
    spec('Erreur : 1 h 15 min = 115 min', 2, {'a': 1, 'k': 3, 'b': 15}, '115', 'incorrect'),
    spec('BO : piscine, 2 heures', 3, {'k': 5, 'r': 1}, '1', 'correct'),
    spec('Erreur : piscine, 2 minutes', 3, {'k': 5, 'r': 1}, '0', 'incorrect'),
    spec('BO : exercice, 5 minutes', 3, {'k': 1, 'r': 0}, '0', 'correct'),
]

MODELES = {
    '07-unites-de-masse': modele(
        'Les unités de masse : g, kg',
        'Symbole du gramme et du kilogramme ; peser une pomme en grammes, un vélo en kilogrammes',
        'Masses', 'Unités', 1, [SYMBOLE, PESER], SPECS_UNITES, delay=45),
    '08-un-kilo-mille-grammes': modele(
        'Un kilogramme, mille grammes',
        '1 kg = 1 000 g ; ce qu\'il manque pour 1 kg ; 250 g + 250 g + 500 g = 1 kg',
        'Masses', 'Unités', 2, [UN_KG, VERS_UN_KG, SOMME_KG], SPECS_KG, delay=90),
    '09-comparer-des-masses': modele(
        'Comparer des masses',
        '1 kg et 900 g ; 2 kg 100 g et 950 g ; la plus lourde et la plus légère de quatre masses',
        'Masses', 'Comparaison', 2, [KG_ET_G, KG_G_ET_G, LOURDE], SPECS_COMPARER),
    '10-masses-de-reference': modele(
        'Des masses de référence',
        'Un paquet de sucre pèse 1 kg, un sachet de levure environ 10 g, un trombone environ 1 g',
        'Masses', 'Ordres de grandeur', 1, [QUI_PESE, PESE_ENVIRON], SPECS_REFERENCES, delay=45),
    '11-estimer-une-masse': modele(
        'Estimer une masse',
        'Une pomme pèse plutôt 15 g, 150 g ou 15 kg ?', 'Masses', 'Ordres de grandeur', 2,
        [PLUTOT], SPECS_ESTIMER, delay=45),
    '12-euros-et-centimes': modele(
        'Euros et centimes',
        '1 € = 100 centimes ; 300 centimes = 3 € ; 345 centimes = 3 € et 45 centimes ; ce qu\'il'
        ' manque pour 1 €', 'Monnaie', 'Euros et centimes', 1,
        [EUROS_EN_C, C_EN_EUROS, C_EN_EUROS_ET_C, VERS_UN_EURO], SPECS_EUROS, delay=90),
    '13-ecriture-a-virgule': modele(
        'L\'écriture à virgule des prix',
        '2 € et 17 centimes = 2,17 € ; 2,05 € et 2,50 € ; 0,85 € ; 1 € et 120 centimes = 2,20 € ;'
        ' 3,45 € = 3 € et 45 centimes', 'Monnaie', 'Euros et centimes', 2,
        [EUROS_ET_C, PEU_DE_C, C_SEULS, PLUS_DE_100, VIRGULE_VERS_C], SPECS_VIRGULE, delay=90,
        options=SANS_ZEROS),
    '14-matin-et-apres-midi': modele(
        'Les heures du matin et de l\'après-midi',
        '3 heures de l\'après-midi = 15 h ; 14 : 15, le matin ou l\'après-midi ? ; 20 h = 8 heures'
        ' du soir', 'Durées', 'Moments de la journée', 2, [VERS_24, MATIN_OU, DU_SOIR],
        SPECS_MATIN),
    '15-heure-et-minute': modele(
        'Heures et minutes',
        '1 h = 60 min ; demi-heure, quarts d\'heure ; 2 h = 120 min ; 1 h 15 min = 75 min ; heure'
        ' ou minute ?', 'Durées', 'Unités', 1, [EN_MINUTES, H_EN_MIN, H_PLUS_MIN, H_OU_MIN],
        SPECS_HEURES, delay=90),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
