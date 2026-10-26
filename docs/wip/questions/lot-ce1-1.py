"""Écrit les 6 modèles du lot 1 du CE1 (calcul mental) dans scripts/questions/ce1-1/.

Phase 0 validée par David le 2026-10-26 (« je suis tes recos », § 6 du journal
`docs/wip/questions-ce1-progress.md`). Plages : bornes `cycle2.json`, CE1 (nombres ≤ 1 000 ;
dizaines entières 10 à 90, centaines entières 100 à 900 ; − dizaines sans retenue seulement ;
multiples de 25 : 1 × 25 à 4 × 25). Un point par modèle ; case seule, aucun QCM.

    python3 docs/wip/questions/lot-ce1-1.py scripts/questions/ce1-1
"""
import json
import sys

DOSSIER = sys.argv[1]
CONSIGNE = 'Calcule de manière astucieuse.\n\n$${{expression1}}$$'
COMPLETE = 'Complète.\n\n$${{expression1}}$$'
CALCULE = 'Calcule.\n\n$${{expression1}}$$'  # faits à connaître : rien d'astucieux


def spec(desc, vi, variables, answer, status, violations=None):
    s = {'description': desc, 'variationIndex': vi, 'variables': variables,
         'answers': [answer], 'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(title, description, domain, subdomain, level, variations, specs):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (nœud du point) est posé par la migration
    return {'title': title, 'description': description, 'grades': ['CE1'], 'theme': 'Entiers',
            'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': 20,
            'status': 'draft', 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, expression, answer, steps, conditions=None):
    # La case naît de la variable `expression1` (« = ? » ajouté au rendu, sauf s'il y a un `?`)
    v = {'statement': statement, 'variables': variables + [var('expression1', expression)]}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [{'expectedAnswer': answer}]
    v['correction'] = {'steps': steps}
    return v


def pluriel(n, singulier, pluriel_):
    return '{{if:' + n + '==1|' + singulier + '|' + pluriel_ + '}}'


# --- 1. CE1-084 : ajouter des centaines entières ------------------------------------------


def plus_centaines(variables):
    return variation(
        CONSIGNE, variables + [var('n', 'eval:100*a+r')], '{{n}}+{{eval:100*c}}',
        '{{eval:n+100*c}}',
        ['Ajouter ${{eval:100*c}}$, c\'est ajouter ${{c}}$ ' + pluriel('c', 'centaine', 'centaines')
         + ' : le chiffre des centaines passe de ${{a}}$ à ${{eval:a+c}}$, les dizaines et les'
         ' unités ne changent pas.',
         '$${{n}}+{{eval:100*c}}={{solution}}$$'])


SPECS_CENTAINES = [
    spec('354 + 500 = 854', 0, {'a': '3', 'r': '54', 'c': '5', 'n': '354'}, '854', 'correct'),
    spec('borne : 899 + 100 = 999', 0, {'a': '8', 'r': '99', 'c': '1', 'n': '899'}, '999',
         'correct'),
    spec('Erreur : ajouté aux unités (359)', 0, {'a': '3', 'r': '54', 'c': '5', 'n': '354'},
         '359', 'incorrect'),
    spec('Erreur : ajouté aux dizaines (404)', 0, {'a': '3', 'r': '54', 'c': '5', 'n': '354'},
         '404', 'incorrect'),
    spec('46 + 300 = 346', 1, {'a': '0', 'r': '46', 'c': '3', 'n': '46'}, '346', 'correct'),
    spec('Erreur : 46 + 30 (76)', 1, {'a': '0', 'r': '46', 'c': '3', 'n': '46'}, '76',
         'incorrect'),
    spec('Zéro inutile 0854', 0, {'a': '3', 'r': '54', 'c': '5', 'n': '354'}, '0854',
         'unoptimal_form', ['zeros']),
]

# --- 2. CE1-029 : ajouter des dizaines entières --------------------------------------------


def plus_dizaines(variables, conditions=None):
    return variation(
        CONSIGNE, variables + [var('n', 'eval:100*a+10*b+u')], '{{n}}+{{eval:10*d}}',
        '{{eval:n+10*d}}',
        ['${{n}}$, c\'est ${{eval:10*a+b}}$ dizaines'
         '{{if:u==0|.| et ${{u}}$ ' + pluriel('u', 'unité', 'unités') + '.}}'
         ' On ajoute ${{d}}$ ' + pluriel('d', 'dizaine', 'dizaines')
         + ' : ${{eval:10*a+b}}+{{d}}={{eval:10*a+b+d}}$ dizaines.',
         '$${{n}}+{{eval:10*d}}={{solution}}$$'],
        conditions)


SPECS_DIZAINES = [
    spec('234 + 60 = 294', 0, {'a': '2', 'b': '3', 'u': '4', 'd': '6', 'n': '234'}, '294',
         'correct'),
    spec('Erreur : ajouté aux unités (240)', 0,
         {'a': '2', 'b': '3', 'u': '4', 'd': '6', 'n': '234'}, '240', 'incorrect'),
    spec('Erreur : ajouté aux centaines (834)', 0,
         {'a': '2', 'b': '3', 'u': '4', 'd': '6', 'n': '234'}, '834', 'incorrect'),
    spec('746 + 80 = 826', 1, {'a': '7', 'b': '4', 'u': '6', 'd': '8', 'n': '746'}, '826',
         'correct'),
    spec('Erreur : retenue oubliée (726)', 1,
         {'a': '7', 'b': '4', 'u': '6', 'd': '8', 'n': '746'}, '726', 'incorrect'),
    spec('borne : 890 + 10 = 900', 1, {'a': '8', 'b': '9', 'u': '0', 'd': '1', 'n': '890'},
         '900', 'correct'),
    spec('Zéro inutile 0294', 0, {'a': '2', 'b': '3', 'u': '4', 'd': '6', 'n': '234'}, '0294',
         'unoptimal_form', ['zeros']),
]

# --- 3. CE1-102 : soustraire des dizaines entières (sans retenue) --------------------------

MOINS_DIZAINES = variation(
    CONSIGNE,
    [var('a', '1..9'), var('b', '1..9'), var('d', '1..{{b}}'), var('u', '0..9'),
     var('n', 'eval:100*a+10*b+u')],
    '{{n}}-{{eval:10*d}}', '{{eval:n-10*d}}',
    ['${{n}}$, c\'est ${{eval:10*a+b}}$ dizaines'
     '{{if:u==0|.| et ${{u}}$ ' + pluriel('u', 'unité', 'unités') + '.}}'
     ' On retire ${{d}}$ ' + pluriel('d', 'dizaine', 'dizaines')
     + ' : ${{eval:10*a+b}}-{{d}}={{eval:10*a+b-d}}$ dizaines.',
     '$${{n}}-{{eval:10*d}}={{solution}}$$'])

SPECS_MOINS_DIZAINES = [
    spec('541 − 20 = 521', 0, {'a': '5', 'b': '4', 'd': '2', 'u': '1', 'n': '541'}, '521',
         'correct'),
    spec('borne : 920 − 20 = 900', 0, {'a': '9', 'b': '2', 'd': '2', 'u': '0', 'n': '920'},
         '900', 'correct'),
    spec('Erreur : retiré aux unités (539)', 0,
         {'a': '5', 'b': '4', 'd': '2', 'u': '1', 'n': '541'}, '539', 'incorrect'),
    spec('Erreur : retiré aux centaines (341)', 0,
         {'a': '5', 'b': '4', 'd': '2', 'u': '1', 'n': '541'}, '341', 'incorrect'),
    spec('Zéro inutile 0521', 0, {'a': '5', 'b': '4', 'd': '2', 'u': '1', 'n': '541'}, '0521',
         'unoptimal_form', ['zeros']),
]

# --- 4. CE1-032 : soustraire 9 -------------------------------------------------------------


def moins_9(variables, nombre):
    return variation(
        CONSIGNE, variables + [var('n', nombre)], '{{n}}-9', '{{eval:n-9}}',
        ['Soustraire $9$, c\'est soustraire $10$, puis ajouter $1$.',
         '$$\\begin{align} {{n}}\\bold{\\textcolor{{{color:primary.0}}}{-9}} &= {{n}}'
         '\\bold{\\textcolor{{{color:primary.0}}}{-10+1}} \\\\ &= {{eval:n-10}}+1 \\\\ '
         '&= {{solution}} \\end{align}$$'])


SPECS_MOINS_9 = [
    spec('53 − 9 = 44', 0, {'d': '5', 'u': '3', 'n': '53'}, '44', 'correct'),
    spec('borne : 10 − 9 = 1', 0, {'d': '1', 'u': '0', 'n': '10'}, '1', 'correct'),
    spec('346 − 9 = 337', 1, {'a': '3', 'b': '4', 'u': '6', 'n': '346'}, '337', 'correct'),
    spec('Erreur : − 10 seulement (336)', 1, {'a': '3', 'b': '4', 'u': '6', 'n': '346'}, '336',
         'incorrect'),
    spec('Erreur : − 10 − 1 (335)', 1, {'a': '3', 'b': '4', 'u': '6', 'n': '346'}, '335',
         'incorrect'),
    spec('305 − 9 = 296', 2, {'a': '3', 'u': '5', 'n': '305'}, '296', 'correct'),
    spec('Erreur : centaine non cassée (396)', 2, {'a': '3', 'u': '5', 'n': '305'}, '396',
         'incorrect'),
    spec('borne : 100 − 9 = 91', 2, {'a': '1', 'u': '0', 'n': '100'}, '91', 'correct'),
]

# --- 5. CE1-083 : multiples de 25 ----------------------------------------------------------

ETAPES_25 = [
    '{{if:k==1|$1\\times 25=25$ : une fois $25$.|'
    '${{k}}\\times 25={{eval:k-1}}\\times 25+25={{eval:25*(k-1)}}+25={{eval:25*k}}$.}}',
    'Les multiples de $25$ à connaître : $25$, $50$, $75$, $100$.',
]


def fois_25(expression, answer, steps=None):
    return variation(CALCULE if '?' not in expression else COMPLETE, [var('k', '1..4')],
                     expression, answer, steps or ETAPES_25)


SPECS_25 = [
    spec('3 × 25 = 75', 0, {'k': '3'}, '75', 'correct'),
    spec('Erreur : 3 + 25 (28)', 0, {'k': '3'}, '28', 'incorrect'),
    spec('Erreur : 65', 0, {'k': '3'}, '65', 'incorrect'),
    spec('25 × 4 = 100', 1, {'k': '4'}, '100', 'correct'),
    spec('? × 25 = 75 : 3', 2, {'k': '3'}, '3', 'correct'),
    spec('Erreur : ? × 25 = 75, répond 50', 2, {'k': '3'}, '50', 'incorrect'),
]

# --- 6. CE1-024 : la multiplication est commutative ----------------------------------------

FACTEURS = [var('p', '2..5'), var('g', '6..9')]
ECHANGE = ('On peut échanger les deux nombres d\'une multiplication : ${{g}}$ paquets de ${{p}}$,'
           ' c\'est autant que ${{p}}$ paquets de ${{g}}$.')

COMMUTATIVE = [
    variation('On sait que ${{p}}\\times {{g}}={{eval:p*g}}$.\n\n' + CALCULE, FACTEURS,
              '{{g}}*{{p}}', '{{eval:p*g}}',
              [ECHANGE, '$${{g}}\\times {{p}}={{p}}\\times {{g}}={{solution}}$$']),
    variation(COMPLETE, FACTEURS, '{{g}}*{{p}}={{p}}*?', '{{g}}',
              [ECHANGE, '$${{g}}\\times {{p}}={{p}}\\times {{g}}$$']),
    variation(COMPLETE, FACTEURS, '?*{{g}}={{g}}*{{p}}', '{{p}}',
              [ECHANGE, '$${{p}}\\times {{g}}={{g}}\\times {{p}}$$']),
]

SPECS_COMMUTATIVE = [
    spec('4 × 8 = 32 donné : 8 × 4 = 32', 0, {'p': '4', 'g': '8'}, '32', 'correct'),
    spec('Erreur : 8 + 4 (12)', 0, {'p': '4', 'g': '8'}, '12', 'incorrect'),
    spec('8 × 4 = 4 × ? : 8', 1, {'p': '4', 'g': '8'}, '8', 'correct'),
    spec('Erreur : recopie 4', 1, {'p': '4', 'g': '8'}, '4', 'incorrect'),
    spec('Erreur : le produit (32)', 1, {'p': '4', 'g': '8'}, '32', 'incorrect'),
    spec('? × 7 = 7 × 3 : 3', 2, {'p': '3', 'g': '7'}, '3', 'correct'),
    spec('Erreur : recopie 7', 2, {'p': '3', 'g': '7'}, '7', 'incorrect'),
]

MODELES = {
    '01-ajouter-des-centaines': modele(
        'Ajouter des centaines entières', 'Exemple : 354 + 500 ; résultat ≤ 999',
        'Additionner', 'Somme astucieuse', 7,
        [plus_centaines([var('a', '1..8'), var('r', '1..99'), var('c', '1..{{eval:9-a}}')]),
         plus_centaines([var('a', '0'), var('r', '10..99'), var('c', '1..9')])],
        SPECS_CENTAINES),
    '02-ajouter-des-dizaines': modele(
        'Ajouter des dizaines entières', 'Exemple : 234 + 60, puis 746 + 80 (avec retenue)',
        'Additionner', 'Somme astucieuse', 8,
        [plus_dizaines([var('a', '1..9'), var('b', '0..8'), var('u', '0..9'),
                        var('d', '1..{{eval:9-b}}')]),
         plus_dizaines([var('a', '1..8'), var('b', '1..9'), var('u', '0..9'),
                        var('d', '{{eval:10-b}}..9')])],
        SPECS_DIZAINES),
    '03-soustraire-des-dizaines': modele(
        'Soustraire des dizaines entières', 'Exemple : 541 − 20 ; sans retenue',
        'Soustraire', 'Différence astucieuse', 8, [MOINS_DIZAINES], SPECS_MOINS_DIZAINES),
    '04-soustraire-9': modele(
        'Soustraire $9$ à un nombre', 'Soustraire 10 puis ajouter 1 (53 − 9, 346 − 9, 305 − 9)',
        'Soustraire', 'Différence astucieuse', 3,
        [moins_9([var('d', '1..9'), var('u', '0..8')], 'eval:10*d+u'),
         moins_9([var('a', '1..9'), var('b', '1..9'), var('u', '0..9')], 'eval:100*a+10*b+u'),
         moins_9([var('a', '1..9'), var('u', '0..8')], 'eval:100*a+u')],
        SPECS_MOINS_9),
    '05-multiples-de-25': modele(
        'Les multiples de $25$', '1 × 25, 2 × 25, 3 × 25, 4 × 25',
        'Multiplier', 'Produit', 1,
        [fois_25('{{k}}*25', '{{eval:25*k}}'), fois_25('25*{{k}}', '{{eval:25*k}}',
                 ['$25\\times {{k}}={{k}}\\times 25$ : on peut échanger les deux nombres.']
                 + ETAPES_25),
         fois_25('?*25={{eval:25*k}}', '{{k}}',
                 ['On cherche combien de fois $25$ font ${{eval:25*k}}$ : $25$, $50$, $75$,'
                  ' $100$ en comptant de $25$ en $25$.',
                  '$${{k}}\\times 25={{eval:25*k}}$$'])],
        SPECS_25),
    '06-multiplication-commutative': modele(
        'Échanger les nombres d\'une multiplication', 'Exemple : 8 × 4 = 4 × 8',
        'Multiplier', 'Produit', 3, COMMUTATIVE, SPECS_COMMUTATIVE),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
