"""Écrit les 6 modèles du lot A1 (calcul mental CP) dans scripts/questions/cp-a1/."""
import json
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables, answer, status, violations=None):
    s = {'description': desc, 'variationIndex': vi, 'variables': variables,
         'answers': [answer], 'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(title, description, domain, subdomain, level, variation, specs):
    return {'title': title, 'description': description, 'grades': ['CP'], 'theme': 'Entiers',
            'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': 20,
            'status': 'draft', 'variations': [variation], 'testSpecs': specs}


def calcul(variables, conditions, expression, answer, steps):
    # La case naît de la variable `expression1` (« = ? » ajouté au rendu), comme Somme/7 en prod
    v = {'statement': 'Calcule.\n\n$${{expression1}}$$',
         'variables': variables + [{'name': 'expression1', 'expression': expression}]}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [{'expectedAnswer': answer}]
    v['correction'] = {'steps': steps}
    return v


MODELES = {
    '01-ajouter-1-ou-2': modele(
        'Ajouter 1 ou 2', 'Nombre à deux chiffres, plus 1 ou 2', 'Additionner', 'Somme', 18,
        calcul([{'name': 'n', 'expression': '10..99'}, {'name': 'b', 'expression': '1..2'}],
               ['n+b <= 100'], '{{n}}+{{b}}', '{{eval:n+b}}',
               ['Ajouter ${{b}}$, c\'est avancer de ${{b}}$ dans la suite des nombres :'
                ' ${{n}}$, ${{eval:n+1}}${{if:b==2|, ${{eval:n+2}}$|}}.',
                '$${{n}}+{{b}}={{solution}}$$']),
        [spec('37 + 2 = 39', 0, {'n': '37', 'b': '2'}, '39', 'correct'),
         spec('passage de la dizaine : 39 + 2 = 41', 0, {'n': '39', 'b': '2'}, '41', 'correct'),
         spec('borne : 98 + 2 = 100', 0, {'n': '98', 'b': '2'}, '100', 'correct'),
         spec('Erreur : ajoute une dizaine (47)', 0, {'n': '37', 'b': '2'}, '47', 'incorrect'),
         spec('Erreur : passage de dizaine oublié (31)', 0, {'n': '39', 'b': '2'}, '31', 'incorrect'),
         spec('Zéro inutile 039', 0, {'n': '37', 'b': '2'}, '039', 'unoptimal_form', ['zeros'])]),
    '02-soustraire-1-ou-2': modele(
        'Soustraire 1 ou 2', 'Nombre à deux chiffres, moins 1 ou 2', 'Soustraire', 'Différence', 12,
        calcul([{'name': 'n', 'expression': '11..100'}, {'name': 'b', 'expression': '1..2'}],
               [], '{{n}}-{{b}}', '{{eval:n-b}}',
               ['Soustraire ${{b}}$, c\'est reculer de ${{b}}$ dans la suite des nombres :'
                ' ${{n}}$, ${{eval:n-1}}${{if:b==2|, ${{eval:n-2}}$|}}.',
                '$${{n}}-{{b}}={{solution}}$$']),
        [spec('37 − 2 = 35', 0, {'n': '37', 'b': '2'}, '35', 'correct'),
         spec('passage de la dizaine : 41 − 2 = 39', 0, {'n': '41', 'b': '2'}, '39', 'correct'),
         spec('borne : 100 − 1 = 99', 0, {'n': '100', 'b': '1'}, '99', 'correct'),
         spec('Erreur : ajoute au lieu de soustraire (39)', 0, {'n': '37', 'b': '2'}, '39', 'incorrect'),
         spec('Erreur : passage de dizaine oublié (49)', 0, {'n': '41', 'b': '2'}, '49', 'incorrect'),
         spec('Zéro inutile 035', 0, {'n': '37', 'b': '2'}, '035', 'unoptimal_form', ['zeros'])]),
    '03-ajouter-10': modele(
        'Ajouter 10', 'Ajouter une dizaine à un nombre', 'Additionner', 'Somme', 19,
        calcul([{'name': 'n', 'expression': '1..90'}], [], '{{n}}+10', '{{eval:n+10}}',
               ['Ajouter $10$, c\'est ajouter une dizaine : le chiffre des dizaines augmente de $1$,'
                ' le chiffre des unités ne change pas.',
                '$${{n}}+10={{solution}}$$']),
        [spec('34 + 10 = 44', 0, {'n': '34'}, '44', 'correct'),
         spec('nombre à un chiffre : 4 + 10 = 14', 0, {'n': '4'}, '14', 'correct'),
         spec('borne : 90 + 10 = 100', 0, {'n': '90'}, '100', 'correct'),
         spec('Erreur : ajoute 1 (35)', 0, {'n': '34'}, '35', 'incorrect'),
         spec('Zéro inutile 044', 0, {'n': '34'}, '044', 'unoptimal_form', ['zeros'])]),
    '04-soustraire-10': modele(
        'Soustraire 10', 'Retirer une dizaine à un nombre', 'Soustraire', 'Différence', 13,
        calcul([{'name': 'n', 'expression': '10..100'}], [], '{{n}}-10', '{{eval:n-10}}',
               ['Soustraire $10$, c\'est retirer une dizaine : le chiffre des dizaines diminue de $1$,'
                ' le chiffre des unités ne change pas.',
                '$${{n}}-10={{solution}}$$']),
        [spec('34 − 10 = 24', 0, {'n': '34'}, '24', 'correct'),
         spec('borne : 10 − 10 = 0', 0, {'n': '10'}, '0', 'correct'),
         spec('borne : 100 − 10 = 90', 0, {'n': '100'}, '90', 'correct'),
         spec('Erreur : retire 1 (33)', 0, {'n': '34'}, '33', 'incorrect'),
         spec('Zéro inutile 024', 0, {'n': '34'}, '024', 'unoptimal_form', ['zeros'])]),
    '05-dizaines-moins-un-chiffre': modele(
        'Soustraire un nombre à un chiffre à des dizaines entières', 'Exemple : 50 − 6',
        'Soustraire', 'Différence', 14,
        calcul([{'name': 'd', 'expression': '1..10'}, {'name': 'u', 'expression': '1..9'}],
               [], '{{eval:10*d}}-{{u}}', '{{eval:10*d-u}}',
               ["{{if:d==1|C'est un complément à $10$.|"
                'On casse une dizaine : ${{eval:10*d}}={{eval:10*d-10}}+10$, et $10-{{u}}={{eval:10-u}}$.}}',
                '$${{eval:10*d}}-{{u}}={{if:d==1||{{eval:10*d-10}}+{{eval:10-u}}=}}{{solution}}$$']),
        [spec('50 − 6 = 44', 0, {'d': '5', 'u': '6'}, '44', 'correct'),
         spec('borne : 10 − 3 = 7', 0, {'d': '1', 'u': '3'}, '7', 'correct'),
         spec('borne : 100 − 9 = 91', 0, {'d': '10', 'u': '9'}, '91', 'correct'),
         spec('Erreur : unités recopiées (56)', 0, {'d': '5', 'u': '6'}, '56', 'incorrect'),
         spec('Erreur : dizaine non cassée (54)', 0, {'d': '5', 'u': '6'}, '54', 'incorrect'),
         spec('Zéro inutile 044', 0, {'d': '5', 'u': '6'}, '044', 'unoptimal_form', ['zeros'])]),
    '06-moitie-par-decomposition': modele(
        'Moitié d\'un nombre pair', 'En décomposant en dizaines et unités (46 = 40 + 6)',
        'Additionner', 'Double et moitié', 8,
        {'statement': 'Quelle est la moitié de ${{eval:D+u}}$ ?\n\nLa moitié de ${{eval:D+u}}$ est $?$.',
         'variables': [{'name': 'D', 'expression': '20|40|60|80'},
                       {'name': 'u', 'expression': '2|4|6|8'}],
         'blanks': [{'expectedAnswer': '{{eval:(D+u)/2}}'}],
         'correction': {'steps': [
             'On décompose : ${{eval:D+u}}={{D}}+{{u}}$.',
             'La moitié de ${{D}}$ est ${{eval:D/2}}$ et la moitié de ${{u}}$ est ${{eval:u/2}}$.',
             'La moitié de ${{eval:D+u}}$ est donc ${{eval:D/2}}+{{eval:u/2}}={{solution}}$.']}},
        [spec('moitié de 46 = 23', 0, {'D': '40', 'u': '6'}, '23', 'correct'),
         spec('moitié de 82 = 41', 0, {'D': '80', 'u': '2'}, '41', 'correct'),
         spec('moitié de 28 = 14', 0, {'D': '20', 'u': '8'}, '14', 'correct'),
         spec('Erreur : le double (92)', 0, {'D': '40', 'u': '6'}, '92', 'incorrect'),
         spec('Erreur : unités non partagées (26)', 0, {'D': '40', 'u': '6'}, '26', 'incorrect'),
         spec('Zéro inutile 023', 0, {'D': '40', 'u': '6'}, '023', 'unoptimal_form', ['zeros'])]),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
