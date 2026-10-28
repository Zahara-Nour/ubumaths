"""Écrit les 5 modèles du lot 1 du CE2 (calcul mental) dans scripts/questions/ce2-1/.

Phase 0 validée par David le 2026-10-28 (« ok » aux recos, § 4 bis et § 5 du journal
`docs/wip/questions-ce2-progress.md`). Plages : bornes `cycle2.json`, CE2 (tables d'addition
A, B de 0 à 10 ; décompositions multiplicatives de 60 : 2 × 30 à 6 × 10, sans 1 × 60 ; n × 4 et n × 8 avec
n < 100). Un point par modèle ; case seule, aucun QCM. CE2-077 (multiples de 25) réutilise le
modèle du CE1 `03675b9b` : rien à écrire ici.

    python3 docs/wip/questions/lot-ce2-1.py scripts/questions/ce2-1
"""
import json
import sys

DOSSIER = sys.argv[1]
CALCULE = 'Calcule.\n\n$${{expression1}}$$'  # faits à connaître : rien d'astucieux
COMPLETE = 'Complète.\n\n$${{expression1}}$$'
ASTUCE = 'Calcule de manière astucieuse.\n\n$${{expression1}}$$'

# n < 100, jamais multiple de 10 (4 × 30 relève de CE2-027) ; 25 laissé de côté : 4 × 25 est un
# fait mémorisé (CE2-077)
PETITS = '11..19|21..24'
GRANDS = '26..29|31..39|41..49|51..59|61..69|71..79|81..89|91..99'


def spec(desc, vi, variables, answer, status, violations=None):
    s = {'description': desc, 'variationIndex': vi, 'variables': variables,
         'answers': [answer], 'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(title, description, domain, subdomain, level, variations, specs):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (nœud du point) est posé par la migration
    return {'title': title, 'description': description, 'grades': ['CE2'], 'theme': 'Entiers',
            'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': 20,
            'status': 'draft', 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, expression, answer, steps):
    # La case naît de la variable `expression1` (« = ? » ajouté au rendu, sauf s'il y a un `?`)
    return {'statement': statement,
            'variables': variables + [var('expression1', expression)],
            'blanks': [{'expectedAnswer': answer}],
            'correction': {'steps': steps}}


# --- 1. CE2-020 : tables d'addition ---------------------------------------------------------

TABLES = [variation(
    CALCULE, [var('a', '2..10'), var('b', '2..10')], '{{a}}+{{b}}', '{{eval:a+b}}',
    ['Table de ${{b}}$ : ${{a}}+{{b}}={{solution}}$.'])]

SPECS_TABLES = [
    spec('7 + 8 = 15', 0, {'a': '7', 'b': '8'}, '15', 'correct'),
    spec('borne : 10 + 10 = 20', 0, {'a': '10', 'b': '10'}, '20', 'correct'),
    spec('borne : 2 + 2 = 4', 0, {'a': '2', 'b': '2'}, '4', 'correct'),
    spec('Erreur : 7 + 8 → 14', 0, {'a': '7', 'b': '8'}, '14', 'incorrect'),
    spec('Erreur : 7 × 8 → 56', 0, {'a': '7', 'b': '8'}, '56', 'incorrect'),
]

# --- 2. CE2-084 : terme manquant -------------------------------------------------------------

TERMES = [var('a', '2..10'), var('b', '2..10')]
ETAPE_TERME = ('On cherche le nombre qu\'il faut ajouter à ${{a}}$ pour obtenir ${{eval:a+b}}$ :'
               ' ${{a}}+{{b}}={{eval:a+b}}$.')

TERME_MANQUANT = [
    variation(COMPLETE, TERMES, '{{a}}+?={{eval:a+b}}', '{{b}}',
              [ETAPE_TERME, '$${{a}}+{{solution}}={{eval:a+b}}$$']),
    variation(COMPLETE, TERMES, '?+{{a}}={{eval:a+b}}', '{{b}}',
              [ETAPE_TERME, '$${{solution}}+{{a}}={{eval:a+b}}$$']),
]

SPECS_TERME = [
    spec('7 + ? = 15 : 8', 0, {'a': '7', 'b': '8'}, '8', 'correct'),
    spec('Erreur : 7 + ? = 15 → 22 (on a ajouté)', 0, {'a': '7', 'b': '8'}, '22', 'incorrect'),
    spec('Erreur : 7 + ? = 15 → 15 (recopie)', 0, {'a': '7', 'b': '8'}, '15', 'incorrect'),
    spec('borne : 10 + ? = 20 : 10', 0, {'a': '10', 'b': '10'}, '10', 'correct'),
    spec('? + 6 = 13 : 7', 1, {'a': '6', 'b': '7'}, '7', 'correct'),
    spec('Erreur : ? + 6 = 13 → 6 (recopie)', 1, {'a': '6', 'b': '7'}, '6', 'incorrect'),
]

# --- 3. CE2-078 : décompositions multiplicatives de 60 ---------------------------------------

# Ni 1 ni 60 : 1 × 60 se lit sans calcul, elle n'apprend rien (David, 2026-10-28)
DIVISEURS = [var('k', '2|3|4|5|6|10|12|15|20|30')]
ETAPES_60 = [
    'Les décompositions de $60$ à connaître : $2\\times 30$, $3\\times 20$, $4\\times 15$,'
    ' $5\\times 12$, $6\\times 10$.',
    '$${{k}}\\times {{eval:60/k}}=60$$',
]

DECOMPOSITIONS_60 = [
    variation(COMPLETE, DIVISEURS, '{{k}}*?=60', '{{eval:60/k}}', ETAPES_60),
    variation(COMPLETE, DIVISEURS, '60=?*{{k}}', '{{eval:60/k}}', ETAPES_60),
]

SPECS_60 = [
    spec('4 × ? = 60 : 15', 0, {'k': '4'}, '15', 'correct'),
    spec('Erreur : 4 × ? = 60 → 14', 0, {'k': '4'}, '14', 'incorrect'),
    spec('Erreur : 4 × ? = 60 → 56 (on a soustrait)', 0, {'k': '4'}, '56', 'incorrect'),
    spec('12 × ? = 60 : 5', 0, {'k': '12'}, '5', 'correct'),
    spec('borne : 2 × ? = 60 : 30', 0, {'k': '2'}, '30', 'correct'),
    spec('60 = ? × 3 : 20', 1, {'k': '3'}, '20', 'correct'),
    spec('Erreur : 60 = ? × 3 → 30', 1, {'k': '3'}, '30', 'incorrect'),
]

# --- 4. CE2-026 : multiplier par 4 -------------------------------------------------------------


def double(etape, nombre, resultat, couleur):
    # Une étape par ligne : un élève de CE2 n'écrit pas encore une suite d'égalités (David, 2026-10-28)
    return (f'**Étape {etape}.** Le double de ${nombre}$ : $2\\times {nombre}='
            f'\\textcolor{{{{{{color:primary.{couleur}}}}}}}{{{resultat}}}$.')


def fois_4(nombres):
    return variation(
        ASTUCE, [var('n', nombres)], '4*{{n}}', '{{eval:4*n}}',
        ['Multiplier par $4$, c\'est prendre le double, puis encore le double.',
         double(1, '{{n}}', '{{eval:2*n}}', 0),
         double(2, '{{eval:2*n}}', '{{solution}}', 1),
         'Donc $4\\times {{n}}={{solution}}$.'])


SPECS_4 = [
    spec('4 × 13 = 52', 0, {'n': '13'}, '52', 'correct'),
    spec('borne : 4 × 11 = 44', 0, {'n': '11'}, '44', 'correct'),
    spec('Erreur : un seul double (26)', 0, {'n': '13'}, '26', 'incorrect'),
    spec('4 × 37 = 148', 1, {'n': '37'}, '148', 'correct'),
    spec('Erreur : un seul double (74)', 1, {'n': '37'}, '74', 'incorrect'),
    spec('Erreur : 4 × 3 et 4 × 7 accolés (1 228)', 1, {'n': '37'}, '1228', 'incorrect'),
    spec('Erreur : retenue oubliée (128)', 1, {'n': '37'}, '128', 'incorrect'),
    spec('borne : 4 × 99 = 396', 1, {'n': '99'}, '396', 'correct'),
]

# --- 5. CE2-093 : multiplier par 8 -------------------------------------------------------------


def fois_8(nombres):
    return variation(
        ASTUCE, [var('n', nombres)], '8*{{n}}', '{{eval:8*n}}',
        ['Multiplier par $8$, c\'est prendre le double, puis le double, puis encore le double.',
         double(1, '{{n}}', '{{eval:2*n}}', 0),
         double(2, '{{eval:2*n}}', '{{eval:4*n}}', 1),
         double(3, '{{eval:4*n}}', '{{solution}}', 2),
         'Donc $8\\times {{n}}={{solution}}$.'])


SPECS_8 = [
    spec('8 × 12 = 96', 0, {'n': '12'}, '96', 'correct'),
    spec('Erreur : double du double seulement (48)', 0, {'n': '12'}, '48', 'incorrect'),
    spec('8 × 27 = 216', 1, {'n': '27'}, '216', 'correct'),
    spec('Erreur : un double oublié (108)', 1, {'n': '27'}, '108', 'incorrect'),
    spec('Erreur : un seul double (54)', 1, {'n': '27'}, '54', 'incorrect'),
    spec('borne : 8 × 99 = 792', 1, {'n': '99'}, '792', 'correct'),
]

MODELES = {
    '01-tables-d-addition': modele(
        'Tables d\'addition', 'Toutes les tables mêlées : a + b, a et b de 2 à 10',
        'Additionner', 'Tables', 10, TABLES, SPECS_TABLES),
    '02-terme-manquant': modele(
        'Trouver le terme manquant', 'Tables d\'addition dans l\'autre sens : 7 + ? = 15',
        'Additionner', 'A trou', 14, TERME_MANQUANT, SPECS_TERME),
    '03-decompositions-de-60': modele(
        'Les décompositions de $60$', '2 × 30, 3 × 20, 4 × 15, 5 × 12, 6 × 10',
        'Multiplier', 'Décomposition', 2, DECOMPOSITIONS_60, SPECS_60),
    '04-multiplier-par-4': modele(
        'Multiplier par $4$', 'Le double du double : 4 × 13, puis 4 × 37',
        'Multiplier', 'Quadruple et quart', 6, [fois_4(PETITS), fois_4(GRANDS)], SPECS_4),
    '05-multiplier-par-8': modele(
        'Multiplier par $8$', 'Le double du double du double : 8 × 12, puis 8 × 27',
        'Multiplier', 'Produits astucieux', 3, [fois_8(PETITS), fois_8(GRANDS)], SPECS_8),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
