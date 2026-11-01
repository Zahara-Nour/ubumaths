"""Écrit les 6 modèles du lot 3 du CE2 (vocabulaire des opérations) dans scripts/questions/ce2-3/.

Phase 0 validée par David le 2026-10-29 (« je te suis », § 7 du journal
`docs/wip/questions-ce2-progress.md`) : réponses en nombres seulement ; les réponses par un mot
(« somme » ou « différence ? », « oui / non ») attendent le lot à QCM. Plages : bornes
`cycle2.json`, CE2 (« la somme de 12 et de 25 est 37 », « la différence entre 60 et 37 est 23 »,
« le produit de 3 et de 25 est 75 », « 3 et 25 sont les facteurs », « 75 est un multiple de 25 »,
pairs = multiples de 2). Un point par modèle ; case seule, aucun QCM. Corrigés : une étape par
ligne. Niveaux : places libres des catégories, relevées en prod le 2026-10-29.

    python3 docs/wip/questions/lot-ce2-3.py scripts/questions/ce2-3
"""
import json
import sys

DOSSIER = sys.argv[1]

# Termes d'une somme, facteurs d'un produit : dans n'importe quel ordre
SANS_ORDRE = {'orderIndependent': True}


def spec(desc, vi, variables, answers, status):
    answers = answers if isinstance(answers, list) else [answers]
    return {'description': desc, 'variationIndex': vi, 'variables': variables, 'answers': answers,
            'expected': {'status': status}}


def modele(title, description, domain, subdomain, level, variations, specs, options=None):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (nœud du point) est posé par la migration
    m = {'title': title, 'description': description, 'grades': ['CE2'], 'theme': 'Entiers',
         'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': 20,
         'status': 'draft', 'variations': variations, 'testSpecs': specs}
    if options:
        m['options'] = options
    return m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, blanks, steps, conditions=None):
    # Chaque `?` de l'énoncé est une case, dans l'ordre de `blanks`
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [b if isinstance(b, dict) else {'expectedAnswer': b} for b in blanks]
    v['correction'] = {'steps': steps}
    return v


def multiple_entre(base, mini, maxi, expected):
    # Tout multiple de `base` strictement compris entre mini et maxi est juste
    return {'expectedAnswer': expected, 'rulesSuffice': True,
            'validationRules': [{'type': 'multiple', 'base': base},
                                {'type': 'range', 'min': mini, 'max': maxi, 'inclusive': False}]}


SOMME_DEF = 'La **somme** de deux nombres, c\'est le résultat de leur addition.'
DIFF_DEF = ('La **différence** entre deux nombres, c\'est le résultat de la soustraction du plus'
            ' petit au plus grand.')
PRODUIT_DEF = 'Le **produit** de deux nombres, c\'est le résultat de leur multiplication.'

# --- 1. CE2-015 : la somme ------------------------------------------------------------------

SOMME = [
    variation('Quelle est la somme de ${{a}}$ et de ${{b}}$ ?\n\nLa somme est $?$.',
              [var('a', '11..89'), var('b', '11..89')], ['{{eval:a+b}}'],
              [SOMME_DEF,
               'La somme de ${{a}}$ et de ${{b}}$, c\'est ${{a}}+{{b}}={{solution}}$.']),
    variation('Quelle est la somme de ${{a}}$, de ${{b}}$ et de ${{c}}$ ?\n\nLa somme est $?$.',
              [var('a', '11..49'), var('b', '11..49'), var('c', '11..49')],
              ['{{eval:a+b+c}}'],
              ['La **somme** de plusieurs nombres, c\'est le résultat de leur addition.',
               'La somme, c\'est ${{a}}+{{b}}+{{c}}={{solution}}$.']),
    variation('La somme de ${{a}}$ et d\'un autre nombre est ${{eval:a+b}}$.\n\n'
              'Quel est cet autre nombre ?\n\nL\'autre nombre est $?$.',
              [var('a', '11..49'), var('b', '11..49')], ['{{b}}'],
              [SOMME_DEF,
               'On cherche le nombre qui complète ${{a}}$ jusqu\'à ${{eval:a+b}}$ :'
               ' ${{a}}+?={{eval:a+b}}$.',
               '${{eval:a+b}}-{{a}}={{solution}}$, donc l\'autre nombre est ${{solution}}$.']),
]

SPECS_SOMME = [
    spec('somme de 12 et de 25 : 37', 0, {'a': '12', 'b': '25'}, '37', 'correct'),
    spec('Erreur : différence (13)', 0, {'a': '12', 'b': '25'}, '13', 'incorrect'),
    spec('Erreur : produit (300)', 0, {'a': '12', 'b': '25'}, '300', 'incorrect'),
    spec('borne : 89 + 89 = 178', 0, {'a': '89', 'b': '89'}, '178', 'correct'),
    spec('somme de 15, de 23 et de 31 : 69', 1, {'a': '15', 'b': '23', 'c': '31'}, '69',
         'correct'),
    spec('Erreur : deux nombres seulement (38)', 1, {'a': '15', 'b': '23', 'c': '31'}, '38',
         'incorrect'),
    spec('12 et ? font 37 : 25', 2, {'a': '12', 'b': '25'}, '25', 'correct'),
    spec('Erreur : la somme elle-même (37)', 2, {'a': '12', 'b': '25'}, '37', 'incorrect'),
    spec('Erreur : 12 + 37 (49)', 2, {'a': '12', 'b': '25'}, '49', 'incorrect'),
]

# --- 2. CE2-015 : la différence -------------------------------------------------------------
# Le plus grand nombre vient toujours en premier : aucun résultat négatif

DIFFERENCE = [
    variation('Quelle est la différence entre ${{eval:b+d}}$ et ${{b}}$ ?\n\n'
              'La différence est $?$.',
              [var('b', '11..59'), var('d', '5..39')], ['{{d}}'],
              [DIFF_DEF,
               'La différence entre ${{eval:b+d}}$ et ${{b}}$, c\'est'
               ' ${{eval:b+d}}-{{b}}={{solution}}$.']),
    variation('Quelle est la différence entre ${{eval:10*(q+p)}}$ et ${{eval:10*q}}$ ?\n\n'
              'La différence est $?$.',
              [var('q', '5..49'), var('p', '2..40')], ['{{eval:10*p}}'],
              [DIFF_DEF,
               'La différence, c\'est ${{eval:10*(q+p)}}-{{eval:10*q}}={{solution}}$.'],
              conditions=['q + p <= 90']),
    variation('La différence entre ${{eval:b+d}}$ et un nombre plus petit est ${{d}}$.\n\n'
              'Quel est ce nombre ?\n\nCe nombre est $?$.',
              [var('b', '11..59'), var('d', '5..39')], ['{{b}}'],
              [DIFF_DEF,
               'On cherche le nombre qu\'on retire de ${{eval:b+d}}$ pour trouver ${{d}}$ :'
               ' ${{eval:b+d}}-?={{d}}$.',
               '${{eval:b+d}}-{{d}}={{solution}}$, donc ce nombre est ${{solution}}$.']),
]

SPECS_DIFFERENCE = [
    spec('différence entre 60 et 37 : 23', 0, {'b': '37', 'd': '23'}, '23', 'correct'),
    spec('Erreur : somme (97)', 0, {'b': '37', 'd': '23'}, '97', 'incorrect'),
    spec('Erreur : soustraction à l\'envers (-23)', 0, {'b': '37', 'd': '23'}, '-23', 'incorrect'),
    spec('différence entre 300 et 120 : 180', 1, {'q': '12', 'p': '18'}, '180', 'correct'),
    spec('Erreur : somme (420)', 1, {'q': '12', 'p': '18'}, '420', 'incorrect'),
    spec('60 − ? = 23 : 37', 2, {'b': '37', 'd': '23'}, '37', 'correct'),
    spec('Erreur : la différence elle-même (23)', 2, {'b': '37', 'd': '23'}, '23', 'incorrect'),
    spec('Erreur : 60 + 23 (83)', 2, {'b': '37', 'd': '23'}, '83', 'incorrect'),
]

# --- 3. CE2-015 : les termes, la somme, la différence dans une égalité ----------------------

TERMES = [
    variation('Dans l\'égalité ${{a}}+{{b}}={{eval:a+b}}$, quels sont les termes ?\n\n'
              'Les termes sont $?$ et $?$.',
              [var('a', '11..69'), var('b', '11..69')], ['{{a}}', '{{b}}'],
              ['Les **termes** sont les nombres qu\'on additionne.',
               'Dans ${{a}}+{{b}}={{eval:a+b}}$, les termes sont ${{a}}$ et ${{b}}$ ;'
               ' ${{eval:a+b}}$ est la somme.'],
              conditions=['a != b']),
    variation('Dans l\'égalité ${{eval:b+d}}-{{b}}={{d}}$, quels sont les termes ?\n\n'
              'Les termes sont $?$ et $?$.',
              [var('b', '11..59'), var('d', '5..39')], ['{{eval:b+d}}', '{{b}}'],
              ['Les **termes** d\'une soustraction sont les nombres de part et d\'autre du'
               ' signe $-$.',
               'Dans ${{eval:b+d}}-{{b}}={{d}}$, les termes sont ${{eval:b+d}}$ et ${{b}}$ ;'
               ' ${{d}}$ est la différence.'],
              conditions=['b != d']),
    variation('Dans l\'égalité ${{a}}+{{b}}={{eval:a+b}}$, quelle est la somme ?\n\n'
              'La somme est $?$.',
              [var('a', '11..69'), var('b', '11..69')], ['{{eval:a+b}}'],
              [SOMME_DEF,
               'Dans ${{a}}+{{b}}={{eval:a+b}}$, la somme est ${{solution}}$.']),
    variation('Dans l\'égalité ${{eval:b+d}}-{{b}}={{d}}$, quelle est la différence ?\n\n'
              'La différence est $?$.',
              [var('b', '11..59'), var('d', '5..39')], ['{{d}}'],
              [DIFF_DEF,
               'Dans ${{eval:b+d}}-{{b}}={{d}}$, la différence est ${{solution}}$.']),
]

SPECS_TERMES = [
    spec('termes de 12 + 25 = 37 : 12 et 25', 0, {'a': '12', 'b': '25'}, ['12', '25'], 'correct'),
    spec('termes dans l\'autre ordre : 25 et 12', 0, {'a': '12', 'b': '25'}, ['25', '12'],
         'correct'),
    spec('Erreur : la somme prise pour un terme', 0, {'a': '12', 'b': '25'}, ['12', '37'],
         'incorrect'),
    spec('termes de 60 − 37 = 23 : 60 et 37', 1, {'b': '37', 'd': '23'}, ['60', '37'], 'correct'),
    spec('Erreur : la différence prise pour un terme', 1, {'b': '37', 'd': '23'}, ['37', '23'],
         'incorrect'),
    spec('somme de 12 + 25 = 37 : 37', 2, {'a': '12', 'b': '25'}, '37', 'correct'),
    spec('Erreur : un terme (25)', 2, {'a': '12', 'b': '25'}, '25', 'incorrect'),
    spec('différence de 60 − 37 = 23 : 23', 3, {'b': '37', 'd': '23'}, '23', 'correct'),
    spec('Erreur : le premier terme (60)', 3, {'b': '37', 'd': '23'}, '60', 'incorrect'),
]

# --- 4. CE2-017 : le produit ----------------------------------------------------------------

PRODUIT = [
    variation('Quel est le produit de ${{a}}$ et de ${{b}}$ ?\n\nLe produit est $?$.',
              [var('a', '2..9'), var('b', '2..9')], ['{{eval:a*b}}'],
              [PRODUIT_DEF,
               'Le produit de ${{a}}$ et de ${{b}}$, c\'est ${{a}}\\times{{b}}={{solution}}$.'],
              conditions=['a != b']),
    variation('Quel est le produit de ${{a}}$ et de ${{eval:10*k}}$ ?\n\nLe produit est $?$.',
              [var('a', '2..9'), var('k', '2..9')], ['{{eval:10*a*k}}'],
              [PRODUIT_DEF,
               '${{a}}\\times{{k}}={{eval:a*k}}$, donc'
               ' ${{a}}\\times{{eval:10*k}}={{solution}}$.']),
    variation('Quel est le produit de ${{a}}$ et de $25$ ?\n\nLe produit est $?$.',
              [var('a', '2..8')], ['{{eval:25*a}}'],
              [PRODUIT_DEF,
               'Le produit de ${{a}}$ et de $25$, c\'est ${{a}}\\times 25={{solution}}$.']),
    variation('Le produit de ${{a}}$ et d\'un autre nombre est ${{eval:a*b}}$.\n\n'
              'Quel est cet autre nombre ?\n\nL\'autre nombre est $?$.',
              [var('a', '2..9'), var('b', '2..9')], ['{{b}}'],
              [PRODUIT_DEF,
               'On cherche le nombre qui complète ${{a}}\\times ?={{eval:a*b}}$.',
               '${{a}}\\times{{b}}={{eval:a*b}}$, donc l\'autre nombre est ${{solution}}$.']),
]

SPECS_PRODUIT = [
    spec('produit de 4 et de 6 : 24', 0, {'a': '4', 'b': '6'}, '24', 'correct'),
    spec('Erreur : somme (10)', 0, {'a': '4', 'b': '6'}, '10', 'incorrect'),
    spec('produit de 3 et de 40 : 120', 1, {'a': '3', 'k': '4'}, '120', 'correct'),
    spec('Erreur : 3 × 4 sans le zéro (12)', 1, {'a': '3', 'k': '4'}, '12', 'incorrect'),
    spec('produit de 3 et de 25 : 75', 2, {'a': '3'}, '75', 'correct'),
    spec('Erreur : somme (28)', 2, {'a': '3'}, '28', 'incorrect'),
    spec('4 × ? = 24 : 6', 3, {'a': '4', 'b': '6'}, '6', 'correct'),
    spec('Erreur : 24 − 4 (20)', 3, {'a': '4', 'b': '6'}, '20', 'incorrect'),
]

# --- 5. CE2-017 : les facteurs et le produit dans une égalité -------------------------------

FACTEURS = [
    variation('Dans l\'égalité ${{a}}\\times{{b}}={{eval:a*b}}$, quels sont les facteurs ?\n\n'
              'Les facteurs sont $?$ et $?$.',
              [var('a', '2..9'), var('b', '2..9')], ['{{a}}', '{{b}}'],
              ['Les **facteurs** sont les nombres qu\'on multiplie.',
               'Dans ${{a}}\\times{{b}}={{eval:a*b}}$, les facteurs sont ${{a}}$ et ${{b}}$ ;'
               ' ${{eval:a*b}}$ est le produit.'],
              conditions=['a != b']),
    variation('Dans l\'égalité ${{a}}\\times{{b}}={{eval:a*b}}$, quel est le produit ?\n\n'
              'Le produit est $?$.',
              [var('a', '2..9'), var('b', '2..9')], ['{{eval:a*b}}'],
              [PRODUIT_DEF,
               'Dans ${{a}}\\times{{b}}={{eval:a*b}}$, le produit est ${{solution}}$.']),
    variation('Dans l\'égalité ${{eval:a*b}}={{a}}\\times{{b}}$, quel est le produit ?\n\n'
              'Le produit est $?$.',
              [var('a', '2..9'), var('b', '2..9')], ['{{eval:a*b}}'],
              [PRODUIT_DEF,
               'Le résultat peut s\'écrire à gauche du signe $=$ :'
               ' ${{eval:a*b}}={{a}}\\times{{b}}$.',
               'Le produit est ${{solution}}$ ; les facteurs sont ${{a}}$ et ${{b}}$.']),
]

SPECS_FACTEURS = [
    spec('facteurs de 4 × 6 = 24 : 4 et 6', 0, {'a': '4', 'b': '6'}, ['4', '6'], 'correct'),
    spec('facteurs dans l\'autre ordre : 6 et 4', 0, {'a': '4', 'b': '6'}, ['6', '4'], 'correct'),
    spec('Erreur : le produit pris pour un facteur', 0, {'a': '4', 'b': '6'}, ['4', '24'],
         'incorrect'),
    spec('produit de 4 × 6 = 24 : 24', 1, {'a': '4', 'b': '6'}, '24', 'correct'),
    spec('Erreur : un facteur (6)', 1, {'a': '4', 'b': '6'}, '6', 'incorrect'),
    spec('produit de 24 = 4 × 6 : 24', 2, {'a': '4', 'b': '6'}, '24', 'correct'),
    spec('Erreur : le dernier nombre écrit (6)', 2, {'a': '4', 'b': '6'}, '6', 'incorrect'),
]

# --- 6. CE2-091 : les multiples -------------------------------------------------------------
# Un intervalle qui ne contient qu'un multiple (b ≥ 3, bornes à ±2), puis les multiples de 25

MULTIPLES = [
    variation('Écris un multiple de ${{b}}$ compris entre ${{eval:b*k-2}}$ et'
              ' ${{eval:b*k+2}}$.\n\n$?$',
              [var('b', '3..9'), var('k', '3..9')],
              [multiple_entre('{{b}}', '{{eval:b*k-2}}', '{{eval:b*k+2}}', '{{eval:b*k}}')],
              ['Les multiples de ${{b}}$ sont les résultats de la table de ${{b}}$ :'
               ' ${{eval:b*(k-1)}}$, ${{eval:b*k}}$, ${{eval:b*(k+1)}}$…',
               '${{b}}\\times{{k}}={{eval:b*k}}$, et ${{eval:b*k}}$ est compris entre'
               ' ${{eval:b*k-2}}$ et ${{eval:b*k+2}}$.']),
    variation('Écris un multiple de $25$ compris entre ${{eval:25*k-10}}$ et'
              ' ${{eval:25*k+10}}$.\n\n$?$',
              [var('k', '2..9')],
              [multiple_entre('25', '{{eval:25*k-10}}', '{{eval:25*k+10}}', '{{eval:25*k}}')],
              ['Les multiples de $25$ : $25$, $50$, $75$, $100$, $125$…',
               '$25\\times{{k}}={{eval:25*k}}$, et ${{eval:25*k}}$ est compris entre'
               ' ${{eval:25*k-10}}$ et ${{eval:25*k+10}}$.']),
    variation('${{eval:b*a}}$ est un multiple de ${{b}}$, car ${{eval:b*a}}={{b}}\\times ?$',
              [var('b', '2..9'), var('a', '2..9')], ['{{a}}'],
              ['${{eval:b*a}}$ est dans la table de ${{b}}$.',
               '${{b}}\\times{{a}}={{eval:b*a}}$.']),
]

SPECS_MULTIPLES = [
    spec('multiple de 6 entre 22 et 26 : 24', 0, {'b': '6', 'k': '4'}, '24', 'correct'),
    spec('Erreur : 23, pas un multiple', 0, {'b': '6', 'k': '4'}, '23', 'incorrect'),
    spec('Erreur : 30, hors de l\'intervalle', 0, {'b': '6', 'k': '4'}, '30', 'incorrect'),
    spec('multiple de 25 entre 65 et 85 : 75', 1, {'k': '3'}, '75', 'correct'),
    spec('Erreur : 70, pas un multiple de 25', 1, {'k': '3'}, '70', 'incorrect'),
    spec('Erreur : 100, hors de l\'intervalle', 1, {'k': '3'}, '100', 'incorrect'),
    spec('24 = 6 × 4', 2, {'b': '6', 'a': '4'}, '4', 'correct'),
    spec('Erreur : 24 − 6 (18)', 2, {'b': '6', 'a': '4'}, '18', 'incorrect'),
]

MODELES = {
    '01-la-somme': modele(
        'La somme de deux ou trois nombres',
        '« La somme de 12 et de 25 est 37 » ; terme manquant d\'une somme donnée',
        'Additionner', 'Sens', 6, SOMME, SPECS_SOMME),
    '02-la-difference': modele(
        'La différence entre deux nombres',
        '« La différence entre 60 et 37 est 23 » ; nombre retiré, différence donnée',
        'Soustraire', 'Différence', 16, DIFFERENCE, SPECS_DIFFERENCE),
    '03-termes-somme-difference': modele(
        'Termes, somme et différence dans une égalité',
        'Dans 12 + 25 = 37 : les termes, la somme ; dans 60 − 37 = 23 : les termes, la différence',
        'Additionner', 'Sens', 7, TERMES, SPECS_TERMES, options=SANS_ORDRE),
    '04-le-produit': modele(
        'Le produit de deux nombres',
        '« Le produit de 3 et de 25 est 75 » ; tables, dizaines entières ; facteur manquant',
        'Multiplier', 'Sens', 3, PRODUIT, SPECS_PRODUIT),
    '05-facteurs-et-produit': modele(
        'Facteurs et produit dans une égalité',
        'Dans 4 × 6 = 24 : les facteurs, le produit ; aussi écrit 24 = 4 × 6',
        'Multiplier', 'Sens', 4, FACTEURS, SPECS_FACTEURS, options=SANS_ORDRE),
    '06-les-multiples': modele(
        'Les multiples d\'un nombre',
        'Écrire un multiple de 6 entre 22 et 26, de 25 entre 65 et 85 ; 24 = 6 × ?',
        'Multiplier', 'Sens', 5, MULTIPLES, SPECS_MULTIPLES),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
