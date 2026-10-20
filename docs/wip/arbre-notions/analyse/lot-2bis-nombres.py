"""Génère la migration du lot A des MODIFIER du lot 2 bis : « resserrer les nombres tirés » (39 modèles).

Source : `lot-2bis-modifications.md` § 4 « Resserrer les nombres tirés », validé par David le
2026-10-20 ; méthode validée le 2026-10-21 (une migration par lot, comme #1563). État de la prod
relu le 2026-10-21 (clé anonyme, lecture seule) : `etat-prod-2026-10-21/`.

Chaque modèle reçoit son nouveau contenu (variables, variations, corrigés, specs de test, titre
ou sous-titre devenus faux) puis le tag de son point. Les modifications sont écrites une à une
ci-dessous (MODIFS), chacune vérifiant l'ancienne valeur avant de la remplacer.

    python3 docs/wip/arbre-notions/analyse/lot-2bis-nombres.py [dossier où écrire les modèles modifiés]

Le dossier optionnel reçoit un <id>.json par modèle modifié (pour `pnpm question:specs --file`
et `scripts/audit-question-draws.ts --dir`).
"""

import copy
import hashlib
import json
import os
import re
import sys

ETAT = 'docs/wip/arbre-notions/analyse/etat-prod-2026-10-21/'
LISTE = 'docs/wip/arbre-notions/analyse/lot-2bis-modifications.md'
MIGRATION = 'supabase/migrations/20261021090000_lot_2bis_resserrer_nombres.sql'
FIXTURE = 'tests/integration/fixtures/lot-2bis-nombres.json'
CHAMPS = ('title', 'description', 'variations', 'shared', 'test_specs')


# ============================================================================
# OUTILS
# ============================================================================

def variable(conteneur: dict, nom: str, avant: str, apres: str) -> None:
    """Remplace l'expression d'une variable, après avoir vérifié l'ancienne."""
    v = next(v for v in conteneur['variables'] if v['name'] == nom)
    assert v['expression'] == avant, (nom, v['expression'], avant)
    v['expression'] = apres


def retirer_variable(conteneur: dict, nom: str) -> None:
    n = len(conteneur['variables'])
    conteneur['variables'] = [v for v in conteneur['variables'] if v['name'] != nom]
    assert len(conteneur['variables']) == n - 1, nom


def garder_variations(t: dict, garder: list[int]) -> None:
    """Garde les variations d'indices `garder` (base 0) ; les specs suivent, réindexées."""
    t['variations'] = [t['variations'][i] for i in garder]
    nouveau = {ancien: i for i, ancien in enumerate(garder)}
    specs = []
    for s in t['test_specs']:
        if s['variationIndex'] in nouveau:
            i = nouveau[s['variationIndex']]
            description = re.sub(r'^v\d+\b', f'v{i}', s['description'])
            specs.append({**s, 'variationIndex': i, 'description': description})
    t['test_specs'] = specs


def spec(reponse: str, statut: str, variables: dict, description: str, variation: int = 0,
         violations: list[str] | None = None) -> dict:
    attendu: dict = {'status': statut}
    if violations:
        attendu['constraintViolations'] = violations
    return {
        'answers': [reponse],
        'expected': attendu,
        'variables': variables,
        'description': description,
        'variationIndex': variation,
    }


def remplacer(t: dict, champ: str, avant: str, apres: str) -> None:
    assert t[champ] == avant, (champ, t[champ])
    t[champ] = apres


# ============================================================================
# MODIFICATIONS (une fonction par modèle, clé = 8 premiers caractères de l'id)
# ============================================================================

def tables(facteur: int):
    """Tables de multiplication : a = 2..12 → a = 2..10 ; la spec « × 12 » devient « × 10 »."""
    def f(t: dict) -> None:
        variable(t['variations'][0], 'a', '2..12', '2..10')
        s = t['test_specs'][2]
        assert s['variables'] == {'a': '12'}
        t['test_specs'][2] = spec(str(10 * facteur), 'correct', {'a': '10'}, f'{facteur}×10 = {10 * facteur}')
    return f


def m_bcd7e907(t):
    variable(t['variations'][0], 'a', '0..9', '1..9')
    assert t['test_specs'][1]['variables'] == {'a': '0'}
    t['test_specs'][1] = {**t['test_specs'][1], 'variables': {'a': '1'}, 'answers': ['2'], 'description': 'double de 1 = 2'}


def m_54468151(t):
    v = t['variations'][0]
    variable(v, 'a', '2..8', '2..7')
    variable(v, 'c', '1..{{eval:9-a}}', '2..{{eval:9-a}}')


def m_5fea90e6(t):
    v = t['variations'][0]
    variable(v, 'b', '2..9', '3..9')
    variable(v, 'c', '{{eval:11-b}}..9', '{{eval:11-b}}..8')
    # Specs d'origine : 69 + 9 (deux fois) et 22 + 9, hors des nouvelles bornes.
    anciennes = [(s['variables'], s['answers'], s['expected']['status']) for s in t['test_specs']]
    assert [a[0] for a in anciennes] == [
        {'a': '6', 'b': '9', 'c': '9'}, {'a': '6', 'b': '9', 'c': '9'}, {'a': '2', 'b': '2', 'c': '9'}
    ], anciennes
    t['test_specs'] = [
        spec('77', 'correct', {'a': '6', 'b': '9', 'c': '8'}, '69 + 8 = 77'),
        spec('67', 'incorrect', {'a': '6', 'b': '9', 'c': '8'}, 'oubli de la retenue : 67'),
        spec('31', 'correct', {'a': '2', 'b': '3', 'c': '8'}, '23 + 8 = 31'),
    ]


def m_55b0f4b7(t):
    variable(t['variations'][0], 'a', '0..10', '1..10')
    assert t['test_specs'][1]['variables'] == {'a': '0'}
    t['test_specs'][1] = {**t['test_specs'][1], 'variables': {'a': '1'}, 'answers': ['1'], 'description': 'moitié de 2 = 1'}


def m_201b17f0(t):
    variable(t['variations'][0], 'a', '1..8', '2..8')


def m_869de343(t):
    sh = t['shared']
    variable(sh, 'a', '1..7', '1..2')
    remplacer(t, 'title', 'Ajouter $19$, $29$, $39$…', 'Ajouter $19$ ou $29$')
    t['test_specs'] = [
        spec('67', 'correct', {'a': '2', 'b': '3', 'c': '8', 'd': '38', 'f': '29'}, '38 + 29 → 67'),
        spec('31', 'correct', {'a': '1', 'b': '1', 'c': '2', 'd': '12', 'f': '19'}, '19 + 12 → 31', 1),
        spec('68', 'incorrect', {'a': '2', 'b': '3', 'c': '8', 'd': '38', 'f': '29'}, '38 + 29 : 68 refusé (+30 sans retirer 1)'),
    ]


def m_83aa2196(t):
    v = t['variations'][0]
    variable(v, 'b', '1..8', '1..7')
    variable(v, 'c', '{{eval:b+1}}..9', '{{eval:b+1}}..8')


def m_acf15102(t):
    variable(t['variations'][0], 'a', '2..9', '2..8')


def m_73258d60(t):
    sh = t['shared']
    retirer_variable(sh, 'a')
    retirer_variable(sh, 'b')
    variable(sh, 'f', 'eval:a*1000+b*100+c*10+d', 'eval:c*10+d')
    remplacer(t, 'description', 'Somme d’un nombre ayant au plus quatre chiffres et de $9$ ou $19$',
              'Somme d’un nombre inférieur à $100$ et de $9$ ou $19$')
    t['test_specs'] = [
        spec('105', 'correct', {'c': '9', 'd': '6', 'f': '96'}, '96 + 9 → 105'),
        spec('115', 'correct', {'c': '9', 'd': '6', 'f': '96'}, '96 + 19 → 115', 1),
        spec('42', 'correct', {'c': '2', 'd': '3', 'f': '23'}, 'petit nombre 23 + 19 → 42', 1),
        spec('106', 'incorrect', {'c': '9', 'd': '6', 'f': '96'}, '+10 sans retirer 1 : 106 refusé'),
    ]


def m_a565fa02(t):
    variable(t['variations'][0], 'a', '1..8', '1..3')
    remplacer(t, 'title', 'Soustraire $19$, $29$, …', 'Soustraire $19$, $29$ ou $39$')
    t['test_specs'] = [
        spec('59', 'correct', {'a': '3', 'b': '9', 'c': '8'}, '98-39 = 59'),
        spec('58', 'incorrect', {'a': '3', 'b': '9', 'c': '8'}, 'Erreur : -40 sans +1'),
        spec('57', 'incorrect', {'a': '3', 'b': '9', 'c': '8'}, 'Erreur : -40-1'),
    ]


def m_bd760867(t):
    variable(t['variations'][0], 'a', '4..7', '4..6')
    remplacer(t, 'description', "Jusqu'à 7 chiffres", "Jusqu'à 6 chiffres")
    t['test_specs'][0] = spec('123\\,456', 'correct', {'a': '6', 'expression': '123456'}, '6 chiffres bien espacés (borne haute)')
    t['test_specs'][1] = spec('123456', 'bad_form', {'a': '6', 'expression': '123456'}, '6 chiffres sans espace',
                             violations=['spaces', 'form'])


def m_0dd3de90(t):
    variable(t['variations'][0], 'a', '4..10', '4..9')
    remplacer(t, 'description', "Jusqu'à 10 chiffres", "Jusqu'à 9 chiffres")
    v = {'a': '9', 'expression': '123456789'}
    t['test_specs'][0] = spec('123\\,456\\,789', 'correct', v, '9 chiffres bien espacés (borne haute)')
    t['test_specs'][1] = spec('123456789', 'bad_form', v, '9 chiffres sans espace', violations=['spaces', 'form'])
    t['test_specs'][2] = spec('123\\,456\\,788', 'incorrect', v, 'chiffre modifié')


def m_0d4765d8(t):
    v = t['variations'][1]
    variable(v, 'b', '{{eval:a+1}}..{{eval:3*a-1}}!a', '{{eval:a+1}}..{{eval:min(3*a-1,20)}}!a')
    variable(v, 'c', '{{eval:a+1}}..{{eval:3*a-1}}!a,b', '{{eval:a+1}}..{{eval:min(3*a-1,20)}}!a,b')


# ---- Additions et soustractions de décimaux : un seul rang non nul dans le nombre ajouté/retiré

INTRO_ADD = ('**Additionner des décimaux.** On additionne rang par rang : les unités avec les unités, '
             'les dixièmes avec les dixièmes, les centièmes avec les centièmes. $10$ dixièmes font $1$ unité.')
INTRO_SOUS = ('**Soustraire des décimaux.** On soustrait rang par rang : les unités des unités, les dixièmes '
              'des dixièmes. Quand on ne peut pas retirer les dixièmes, on échange $1$ unité contre $10$ dixièmes.')
C0 = '\\textcolor{{{color:primary.0}}}'
C1 = '\\textcolor{{{color:primary.1}}}'


def variation_calcul(expr: str, nom: str, variables: list[tuple[str, str]], etapes: list[str]) -> dict:
    return {
        'blanks': [{'expectedAnswer': '{{eval:{{' + nom + '}};d}}'}],
        'statement': 'Calcule.\n\n$${{' + nom + '}}$$',
        'variables': [{'name': n, 'expression': e} for n, e in variables] + [{'name': nom, 'expression': expr}],
        'correction': {'steps': etapes},
    }


def m_3bbe92f2(t):
    """a,b + k unités  ou  a,b + k dixièmes (sans retenue), en deux variations."""
    v = t['variations'][0]
    assert [x['name'] for x in v['variables']] == ['a', 'b', 'c', 'd', 'f', 'g', 'expression1']
    base = [('a', '1..8'), ('b', '1..8'), ('c', 'a.b')]
    unites = variation_calcul('c+d', 'expression1', base + [('d', '1..{{eval:9-a}}')], [
        INTRO_ADD,
        f'Unités : ${C0}{{{{{{a}}}}}} + {C0}{{{{{{d}}}}}} = {{{{eval:a+d}}}}$. Dixièmes : ${{{{d}}}}$ n\'en a pas, '
        f'il reste les ${C0}{{{{{{b}}}}}}$ dixième{{{{if:b>1|s|}}}} de ${{{{c}}}}$.',
        f'$$\\begin{{align}} {{{{c}}}} + {{{{d}}}} &= \\left( {C0}{{{{{{a}}}}}} + {C0}{{{{{{d}}}}}} \\right) + {C0}{{{{{{eval:b/10;d}}}}}} '
        f'\\\\ &= {C1}{{{{{{eval:a+d}}}}}} + {{{{eval:b/10;d}}}} \\\\ &= {{{{solution}}}} \\end{{align}}$$',
    ])
    dixiemes = variation_calcul('c+g', 'expression2', base + [('f', '1..{{eval:9-b}}'), ('g', '0.f')], [
        INTRO_ADD,
        f'Dixièmes : ${C0}{{{{{{b}}}}}} + {C0}{{{{{{f}}}}}} = {{{{eval:b+f}}}}$ dixièmes. Unités : ${{{{g}}}}$ n\'en a pas, '
        f'il reste les ${C0}{{{{{{a}}}}}}$ unité{{{{if:a>1|s|}}}} de ${{{{c}}}}$.',
        f'$$\\begin{{align}} {{{{c}}}} + {{{{g}}}} &= {C0}{{{{{{a}}}}}} + \\left( {C0}{{{{{{eval:b/10;d}}}}}} + {C0}{{{{{{eval:f/10;d}}}}}} \\right) '
        f'\\\\ &= {{{{a}}}} + {C1}{{{{{{eval:(b+f)/10;d}}}}}} \\\\ &= {{{{solution}}}} \\end{{align}}$$',
    ])
    t['variations'] = [unites, dixiemes]
    t['test_specs'] = [
        spec('8{,}8', 'correct', {'a': '6', 'b': '8', 'd': '2'}, '6,8 + 2 = 8,8'),
        spec('8.8', 'correct', {'a': '6', 'b': '8', 'd': '2'}, '8.8 au point'),
        spec('6{,}10', 'incorrect', {'a': '6', 'b': '8', 'd': '2'}, 'ajout aux dixièmes : 6,10'),
        spec('6{,}9', 'correct', {'a': '6', 'b': '8', 'f': '1'}, '6,8 + 0,1 = 6,9', 1),
        spec('7{,}8', 'incorrect', {'a': '6', 'b': '8', 'f': '1'}, 'ajout aux unités : 7,8', 1),
    ]


def m_f1a392f5(t):
    """a,b + k unités, k dixièmes ou k centièmes (sans retenue), dans les deux ordres : six variations."""
    assert [x['name'] for x in t['shared']['variables']] == ['a', 'b', 'c', 'd', 'f', 'g', 'h']
    t['shared'] = {'variables': [{'name': 'a', 'expression': '1..8'}, {'name': 'b', 'expression': '1..8'},
                                 {'name': 'c', 'expression': 'a.b'}]}
    remplacer(t, 'description', 'Parties décimales à $1$ et $2$ chiffres (pas de retenue)',
              'Ajouter des unités, des dixièmes ou des centièmes (pas de retenue)')

    variations = []
    for inverse in (False, True):
        def paire(x: str, y: str) -> str:
            # Les termes dans l'ordre de l'énoncé : a,b d'abord, ou le nombre ajouté d'abord.
            return f'{y} + {x}' if inverse else f'{x} + {y}'

        for rang, var, variables in (
            ('unités', 'd', [('d', '1..{{eval:9-a}}')]),
            ('dixièmes', 'g', [('f', '1..{{eval:9-b}}'), ('g', '0.f')]),
            ('centièmes', 'h', [('k', '1..9'), ('h', '{{eval:k/100;d}}')]),
        ):
            somme = paire('{{c}}', '{{' + var + '}}')
            if rang == 'unités':
                etapes = [
                    INTRO_ADD,
                    'Unités : $' + paire(C0 + '{{{a}}}', C0 + '{{{d}}}') + ' = {{eval:a+d}}$. Dixièmes : ${{d}}$ n\'en a pas, '
                    'il reste les $' + C0 + '{{{b}}}$ dixième{{if:b>1|s|}} de ${{c}}$.',
                    '$$\\begin{align} ' + somme + ' &= \\left( ' + paire(C0 + '{{{a}}}', C0 + '{{{d}}}') + ' \\right) + '
                    + C0 + '{{{eval:b/10;d}}} \\\\ &= ' + C1 + '{{{eval:a+d}}} + {{eval:b/10;d}} \\\\ &= {{solution}} \\end{align}$$',
                ]
            elif rang == 'dixièmes':
                etapes = [
                    INTRO_ADD,
                    'Dixièmes : $' + paire(C0 + '{{{b}}}', C0 + '{{{f}}}') + ' = {{eval:b+f}}$ dixièmes. Unités : ${{g}}$ n\'en a pas, '
                    'il reste les $' + C0 + '{{{a}}}$ unité{{if:a>1|s|}} de ${{c}}$.',
                    '$$\\begin{align} ' + somme + ' &= ' + C0 + '{{{a}}} + \\left( '
                    + paire(C0 + '{{{eval:b/10;d}}}', C0 + '{{{eval:f/10;d}}}') + ' \\right) \\\\ &= {{a}} + '
                    + C1 + '{{{eval:(b+f)/10;d}}} \\\\ &= {{solution}} \\end{align}$$',
                ]
            else:
                etapes = [
                    INTRO_ADD,
                    'Centièmes : ${{c}}$ n\'en a pas, on écrit les $' + C0 + '{{{k}}}$ centième{{if:k>1|s|}} de ${{h}}$. '
                    'Les unités et les dixièmes de ${{c}}$ ne changent pas.',
                    '$$\\begin{align} ' + somme + ' &= ' + paire('{{a}} + {{eval:b/10;d}}', C0 + '{{{h}}}') + ' \\\\ &= {{solution}} \\end{align}$$',
                ]
            n = len(variations) + 1
            expr = paire('c', var).replace(' ', '')
            variations.append(variation_calcul(expr, f'expression{n}', variables, etapes))
    t['variations'] = variations
    t['test_specs'] = [
        spec('9{,}2', 'correct', {'a': '8', 'b': '2', 'd': '1'}, '8,2 + 1 = 9,2', 0),
        spec('9.2', 'correct', {'a': '8', 'b': '2', 'd': '1'}, '9.2 au point', 0),
        spec('8{,}7', 'correct', {'a': '8', 'b': '2', 'f': '5'}, '8,2 + 0,5 = 8,7', 1),
        spec('8{,}25', 'correct', {'a': '8', 'b': '2', 'k': '5'}, '8,2 + 0,05 = 8,25', 2),
        spec('8{,}7', 'incorrect', {'a': '8', 'b': '2', 'k': '5'}, 'alignement à droite : 8,7', 2),
        spec('9{,}2', 'correct', {'a': '8', 'b': '2', 'd': '1'}, '1 + 8,2 = 9,2', 3),
        spec('8{,}7', 'correct', {'a': '8', 'b': '2', 'f': '5'}, '0,5 + 8,2 = 8,7', 4),
        spec('8{,}25', 'correct', {'a': '8', 'b': '2', 'k': '5'}, '0,05 + 8,2 = 8,25', 5),
    ]


def m_b100ddb2(t):
    """a,b − k unités  ou  a,b − k dixièmes (sans retenue), en deux variations."""
    v = t['variations'][0]
    assert [x['name'] for x in v['variables']] == ['a', 'b', 'c', 'd', 'f', 'g', 'expression1']
    base = [('a', '2..8'), ('b', '2..8'), ('c', 'a.b')]
    unites = variation_calcul('c-d', 'expression1', base + [('d', '1..{{eval:a-1}}')], [
        INTRO_SOUS,
        f'Unités : ${C0}{{{{{{a}}}}}} - {C0}{{{{{{d}}}}}} = {{{{eval:a-d}}}}$. Dixièmes : ${{{{d}}}}$ n\'en a pas, '
        f'il reste les ${C0}{{{{{{b}}}}}}$ dixièmes de ${{{{c}}}}$.',
        f'$$\\begin{{align}} {{{{c}}}} - {{{{d}}}} &= \\left( {C0}{{{{{{a}}}}}} - {C0}{{{{{{d}}}}}} \\right) + {C0}{{{{{{eval:b/10;d}}}}}} '
        f'\\\\ &= {C1}{{{{{{eval:a-d}}}}}} + {{{{eval:b/10;d}}}} \\\\ &= {{{{solution}}}} \\end{{align}}$$',
    ])
    dixiemes = variation_calcul('c-g', 'expression2', base + [('f', '1..{{eval:b-1}}'), ('g', '0.f')], [
        INTRO_SOUS,
        f'Dixièmes : ${C0}{{{{{{b}}}}}} - {C0}{{{{{{f}}}}}} = {{{{eval:b-f}}}}$. Unités : ${{{{g}}}}$ n\'en a pas, '
        f'il reste les ${C0}{{{{{{a}}}}}}$ unités de ${{{{c}}}}$.',
        f'$$\\begin{{align}} {{{{c}}}} - {{{{g}}}} &= {C0}{{{{{{a}}}}}} + \\left( {C0}{{{{{{eval:b/10;d}}}}}} - {C0}{{{{{{eval:f/10;d}}}}}} \\right) '
        f'\\\\ &= {{{{a}}}} + {C1}{{{{{{eval:(b-f)/10;d}}}}}} \\\\ &= {{{{solution}}}} \\end{{align}}$$',
    ])
    t['variations'] = [unites, dixiemes]
    t['test_specs'] = [
        spec('2{,}8', 'correct', {'a': '6', 'b': '8', 'd': '4'}, '6,8 − 4 = 2,8'),
        spec('2.8', 'correct', {'a': '6', 'b': '8', 'd': '4'}, '2.8 au point'),
        spec('10{,}8', 'incorrect', {'a': '6', 'b': '8', 'd': '4'}, 'addition au lieu de soustraction : 10,8'),
        spec('6{,}6', 'correct', {'a': '6', 'b': '8', 'f': '2'}, '6,8 − 0,2 = 6,6', 1),
        spec('4{,}8', 'incorrect', {'a': '6', 'b': '8', 'f': '2'}, 'retrait aux unités : 4,8', 1),
    ]


def m_b9a9048a(t):
    """a,bc − k unités  ou  a,bc − k dixièmes (sans retenue), en deux variations."""
    v = t['variations'][0]
    assert [x['name'] for x in v['variables']] == ['a', 'b', 'c', 'd', 'f', 'g', 'h', 'expression1']
    base = [('a', '2..9'), ('b', '2..9'), ('c', '1..9'), ('d', '{{eval:a+b/10+c/100;d}}')]
    unites = variation_calcul('d-f', 'expression1', base + [('f', '1..{{eval:a-1}}')], [
        INTRO_SOUS,
        f'Unités : ${C0}{{{{{{a}}}}}} - {C0}{{{{{{f}}}}}} = {{{{eval:a-f}}}}$. Dixièmes et centièmes : ${{{{f}}}}$ n\'en a pas, '
        f'ceux de ${{{{d}}}}$ ne changent pas.',
        f'$$\\begin{{align}} {{{{d}}}} - {{{{f}}}} &= \\left( {C0}{{{{{{a}}}}}} - {C0}{{{{{{f}}}}}} \\right) + {C0}{{{{{{eval:b/10+c/100;d}}}}}} '
        f'\\\\ &= {C1}{{{{{{eval:a-f}}}}}} + {{{{eval:b/10+c/100;d}}}} \\\\ &= {{{{solution}}}} \\end{{align}}$$',
    ])
    dixiemes = variation_calcul('d-h', 'expression2', base + [('g', '1..{{eval:b-1}}'), ('h', '0.g')], [
        INTRO_SOUS,
        f'Dixièmes : ${C0}{{{{{{b}}}}}} - {C0}{{{{{{g}}}}}} = {{{{eval:b-g}}}}$. Unités et centièmes : ${{{{h}}}}$ n\'en a pas, '
        f'ceux de ${{{{d}}}}$ ne changent pas.',
        f'$$\\begin{{align}} {{{{d}}}} - {{{{h}}}} &= {C0}{{{{{{a}}}}}} + \\left( {C0}{{{{{{eval:b/10;d}}}}}} - {C0}{{{{{{eval:g/10;d}}}}}} \\right) + {C0}{{{{{{eval:c/100;d}}}}}} '
        f'\\\\ &= {{{{a}}}} + {C1}{{{{{{eval:(b-g)/10;d}}}}}} + {{{{eval:c/100;d}}}} \\\\ &= {{{{solution}}}} \\end{{align}}$$',
    ])
    t['variations'] = [unites, dixiemes]
    t['test_specs'] = [
        spec('5{,}99', 'correct', {'a': '7', 'b': '9', 'c': '9', 'f': '2'}, '7,99 − 2 = 5,99'),
        spec('5.99', 'correct', {'a': '7', 'b': '9', 'c': '9', 'f': '2'}, '5.99 au point'),
        spec('7{,}97', 'incorrect', {'a': '7', 'b': '9', 'c': '9', 'f': '2'}, 'alignement à droite : 7,97'),
        spec('7{,}29', 'correct', {'a': '7', 'b': '9', 'c': '9', 'g': '7'}, '7,99 − 0,7 = 7,29', 1),
        spec('7{,}92', 'incorrect', {'a': '7', 'b': '9', 'c': '9', 'g': '7'}, 'alignement à droite : 7,92', 1),
    ]


def m_59b781cc(t):
    garder_variations(t, [0])
    remplacer(t, 'description', 'Premiers multiples de $25$ et $50$', 'Premiers multiples de $50$')


def m_dd7db98e(t):
    variable(t['variations'][0], 'a', '1/2|1/4|3/1000|3/2|5/2|3/4|1/5|7/2|9/2',
             '1/2|1/4|1/10|1/100|1/1000|4/2|3/2|5/2|3/4')
    corrige_formes_decimales(t['variations'][0]['correction']['steps'])
    t['test_specs'] = [
        spec('0.5', 'correct', {'a': '1/2'}, 'un demi'),
        spec('2{,}5', 'correct', {'a': '5/2'}, 'cinq demis, virgule'),
        spec('1.5', 'correct', {'a': '3/2'}, 'trois demis'),
        spec('0.25', 'correct', {'a': '1/4'}, 'un quart'),
        spec('1.2', 'incorrect', {'a': '1/2'}, 'confusion 1/2 = 1,2'),
        spec('0.4', 'incorrect', {'a': '1/4'}, 'confusion 1/4 = 0,4'),
        spec('\\frac{1}{4}', 'bad_form', {'a': '1/4'}, 'recopie de la fraction', violations=['form']),
        spec('0.001', 'correct', {'a': '1/1000'}, 'un millième'),
        spec('0.75', 'correct', {'a': '3/4'}, 'trois quarts'),
        spec('0.1', 'correct', {'a': '1/10'}, 'un dixième'),
        spec('0.01', 'correct', {'a': '1/100'}, 'un centième'),
        spec('0.1', 'incorrect', {'a': '1/100'}, 'confusion 1/100 = 0,1'),
        spec('2', 'correct', {'a': '4/2'}, 'quatre demis = 2'),
    ]


def corrige_formes_decimales(steps: list[str]) -> None:
    """Le corrigé de dd7db98e a une branche `{{if:1000*a=…}}` par fraction tirée : celles des fractions
    retirées (3/1000, 1/5, 7/2, 9/2) partent, celles des fractions ajoutées sont écrites."""
    p1 = '\\textcolor{{{color:primary.1}}}'
    p0 = '\\textcolor{{{color:primary.0}}}'
    zero = f' Il n\'y a pas d\'unités : on écrit $0$ avant la virgule.'
    trous = f' Il manque des chiffres entre la virgule et ce rang : on les remplace par des ${p1}{{0}}$.'
    nouvelles = {
        '100': (f'Le dénominateur est ${p1}{{10}}$ : le chiffre ${p0}{{1}}$ se place au rang des '
                f'${p1}{{\\text{{dixièmes}}}}$.' + zero,
                '$$\\begin{align} \\dfrac{1}{10} &= {{solution}} \\end{align}$$'),
        '10': (f'Le dénominateur est ${p1}{{100}}$ : le chiffre ${p0}{{1}}$ se place au rang des '
               f'${p1}{{\\text{{centièmes}}}}$.' + zero + trous,
               '$$\\begin{align} \\dfrac{1}{100} &= {{solution}} \\end{align}$$'),
        '1': (f'Le dénominateur est ${p1}{{1000}}$ : le chiffre ${p0}{{1}}$ se place au rang des '
              f'${p1}{{\\text{{millièmes}}}}$.' + zero + trous,
              '$$\\begin{align} \\dfrac{1}{1000} &= {{solution}} \\end{align}$$'),
        '2000': (f'Le numérateur $4$ est un multiple du dénominateur : $4 = 2 \\times {p1}{{2}}$. La fraction '
                 f'est donc égale au nombre entier ${p0}{{2}}$.',
                 f'$$\\begin{{align}} \\dfrac{{4}}{{2}} &= \\dfrac{{2 \\times {p1}{{2}}}}{{2}} \\\\ &= {{{{solution}}}} \\end{{align}}$$'),
    }
    for etape in (1, 2):
        branches = re.findall(r'\{\{if:1000\*a=(\d+)\|(.*?)\|\}\}', steps[etape], flags=re.S)
        assert ''.join(f'{{{{if:1000*a={v}|{c}|}}}}' for v, c in branches) == steps[etape]
        assert [v for v, _ in branches] == ['500', '250', '3', '200', '1500', '2500', '750', '3500', '4500']
        gardees = [(v, c) for v, c in branches if v not in ('3', '200', '3500', '4500')]
        gardees += [(v, txt[etape - 1]) for v, txt in nouvelles.items()]
        steps[etape] = ''.join(f'{{{{if:1000*a={v}|{c}|}}}}' for v, c in gardees)


def division_10_100_1000(t):
    """Le quotient (ou le nombre donné) garde au plus trois décimales : q ≤ 3 − a."""
    sh = t['shared']
    assert sh['conditions'][0] == 'q<=4-a', sh['conditions']
    sh['conditions'][0] = 'q<=3-a'
    variable(t['variations'][0], 'q', '0..4-a', '0..3-a')


def m_a94ddf87(t):
    division_10_100_1000(t)
    v = {'a': '2', 'b': '4498.7', 'm': '4', 'q': '1'}
    t['test_specs'] = [
        spec('44{,}987', 'correct', v, '4 498,7 : 100'),
        spec('449{,}87', 'incorrect', v, 'mauvais décalage'),
        spec('1{,}838', 'correct', {'a': '1', 'b': '18.38', 'm': '2', 'q': '2'}, '18,38 : 10'),
    ]


def m_45e06ece(t):
    division_10_100_1000(t)
    v = {'a': '2', 'b': '4498.7', 'm': '4', 'q': '1'}
    t['test_specs'] = [
        spec('4\\,498{,}7', 'correct', v, '? : 100 = 44,987'),
        spec('4498{,}7', 'unoptimal_form', v, '4498,7 sans espace', violations=['spaces']),
        spec('4\\,498.7', 'correct', v, 'point'),
        spec('44{,}987', 'incorrect', v, 'mauvais sens'),
    ]


def m_5d7726eb(t):
    variable(t['variations'][0], 'a', '10|20|30|40|50|60|70|80|90|100|25|75|200|300|400',
             '10|20|30|40|50|60|70|80|90|100|25|75')
    specs = [s for s in t['test_specs'] if s['variables']['a'] != '200']
    assert len(specs) == len(t['test_specs']) - 2
    specs.insert(3, spec('\\frac{1}{2}', 'correct', {'a': '50', 'b': '50'}, '50 %'))
    t['test_specs'] = specs


def m_82748db8(t):
    # Variations 4, 9, 10, 13 et 14 de la liste (comptées à partir de 1).
    garder_variations(t, [3, 8, 9, 12, 13])


def m_2d8e7948(t):
    variable(t['variations'][0], 'a', '-5..5', '0..5')
    specs = [s for s in t['test_specs'] if s['variables']['a'] != '-5']
    assert len(specs) == 4
    specs.insert(2, spec('1\\,000', 'correct', {'a': '3'}, '10^3 = 1 000'))
    t['test_specs'] = specs


def m_99f5a54a(t):
    variable(t['variations'][0], 'a', '1..15', '1..12')
    remplacer(t, 'description', 'Entier de $1$ à $15$', 'Entier de $1$ à $12$')
    assert t['test_specs'][1]['variables'] == {'a': '15'}
    t['test_specs'][1] = spec('12', 'correct', {'a': '12'}, 'borne 12 : sqrt(144) = 12')


def une_lettre(t: dict, lettre_gardee: str, lettre_retiree: str) -> None:
    """La seconde lettre n'est plus tirée : la lettre restante est x, y ou z sans exclusion."""
    sh = t['shared']
    retirer_variable(sh, lettre_retiree)
    v = next(v for v in sh['variables'] if v['name'] == lettre_gardee)
    assert v['expression'] == f'x|y|z!{lettre_retiree}', v
    v['expression'] = 'x|y|z'
    for s in t['test_specs']:
        s['variables'].pop(lettre_retiree, None)


def m_11607586(t):
    garder_variations(t, [2, 3])
    une_lettre(t, 'f', 'd')
    # La spec « non factorisé » partait avec la variation 1 : la même sur la variation gardée.
    t['test_specs'].append(spec('63x+28', 'bad_form', {'a': '7', 'b': '9', 'c': '4', 'f': 'x|x'},
                                'non factorisé', violations=['form']))


def sans_expression_vide(steps: list[str]) -> None:
    """« Dans l'expression {{expression}} le plus grand… » : `expression` n'existe pas dans ces
    modèles (trou à l'affichage, déjà en prod) ; la phrase commence au facteur."""
    avant = "Dans l'expression {{expression}} le plus grand facteur commun aux 2 produits est {{solution:0}},"
    assert steps[0] == avant, steps[0]
    steps[0] = 'Le plus grand facteur commun aux 2 produits est ${{solution:0}}$,'


def m_39c5bcfa(t):
    une_lettre(t, 'f', 'd')
    steps = t['shared']['correction']['steps']
    sans_expression_vide(steps)
    avant = 'car ${{eval:a*b}}{{f}}={{solution:0}}\\times{{{b}}{{f}}}$ et ${{eval:a*c}}{{d}}={{solution:0}}\\times{{{c}}{{d}}}$'
    assert steps[1] == avant, steps[1]
    steps[1] = 'car ${{eval:a*b}}{{f}}={{solution:0}}\\times{{{b}}{{f}}}$ et ${{eval:a*c}}={{solution:0}}\\times{{c}}$'
    for v, signe in zip(t['variations'], '+-'):
        ancien = f'$${{{{eval:a*b}}}}{{{{f}}}}{signe}{{{{eval:a*c}}}}{{{{d}}}}$$'
        assert ancien in v['statement'], v['statement']
        v['statement'] = v['statement'].replace(ancien, f'$${{{{eval:a*b}}}}{{{{f}}}}{signe}{{{{eval:a*c}}}}$$')
    for s in t['test_specs']:
        if s['description'] == '14 ne divise pas 63':
            s['description'] = '14 ne divise pas 63'


def m_3abfcd7b(t):
    sh = t['shared']
    retirer_variable(sh, 'd')
    for s in t['test_specs']:
        s['variables'].pop('d', None)
    steps = sh['correction']['steps']
    sans_expression_vide(steps)
    avant = 'car ${{a}}{{c}}={{solution:0}}\\times{{{c}}}$ et ${{eval:a*b}}{{d}}={{solution:0}}\\times{{{b}}{{d}}}$'
    assert steps[1] == avant, steps[1]
    steps[1] = 'car ${{a}}{{c}}={{solution:0}}\\times{{{c}}}$ et ${{eval:a*b}}={{solution:0}}\\times{{b}}$'
    for v in t['variations']:
        assert v['statement'].count('{{eval:a*b}}{{d}}') == 1, v['statement']
        v['statement'] = v['statement'].replace('{{eval:a*b}}{{d}}', '{{eval:a*b}}')
    for s in t['test_specs']:
        if s['answers'] == ['63']:
            s['description'] = '63 : un terme, pas un facteur commun'


def m_9231b54b(t):
    # Variations 1-2 et 5-8 de la liste (comptées à partir de 1) : une seule lettre.
    garder_variations(t, [0, 1, 4, 5, 6, 7])
    retirer_variable(t['shared'], 'd')
    for s in t['test_specs']:
        s['variables'].pop('d', None)


def m_e66089e0(t):
    garder_variations(t, [0, 1, 4, 5, 6, 7])
    retirer_variable(t['shared'], 'd')
    for s in t['test_specs']:
        s['variables'].pop('d', None)


MODIFS = {
    'bcd7e907': m_bcd7e907, '54468151': m_54468151, '5fea90e6': m_5fea90e6, '55b0f4b7': m_55b0f4b7,
    '201b17f0': m_201b17f0,
    '3ba51eb3': tables(4), '5e316657': tables(3), '9d2df894': tables(5), 'c956b35f': tables(1),
    'cf28acc2': tables(2), '523f3f10': tables(6), '6c53e785': tables(7), 'b78363f9': tables(8),
    'c32bfeba': tables(9),
    '869de343': m_869de343, '83aa2196': m_83aa2196, 'acf15102': m_acf15102, '73258d60': m_73258d60,
    'a565fa02': m_a565fa02, 'bd760867': m_bd760867, '0d4765d8': m_0d4765d8, '3bbe92f2': m_3bbe92f2,
    'f1a392f5': m_f1a392f5, '59b781cc': m_59b781cc, 'b100ddb2': m_b100ddb2, 'b9a9048a': m_b9a9048a,
    '0dd3de90': m_0dd3de90, 'dd7db98e': m_dd7db98e, 'a94ddf87': m_a94ddf87, '45e06ece': m_45e06ece,
    '5d7726eb': m_5d7726eb, '82748db8': m_82748db8, '2d8e7948': m_2d8e7948, '99f5a54a': m_99f5a54a,
    '11607586': m_11607586, '39c5bcfa': m_39c5bcfa, '3abfcd7b': m_3abfcd7b, '9231b54b': m_9231b54b,
    'e66089e0': m_e66089e0,
}


# ============================================================================
# GÉNÉRATION
# ============================================================================

def lire_liste() -> dict[str, tuple[str, str]]:
    """Modèle → (niveau, point), lu dans la liste validée (§ 4, « Resserrer les nombres tirés »)."""
    section = open(LISTE).read().split('### Resserrer les nombres tirés')[1].split('### ')[0]
    lignes = {}
    for ligne in section.splitlines():
        m = re.match(r'\| `(\w+)` \| (\S+)\s*\| (\S+)\s*\|', ligne)
        if m:
            lignes[m.group(1)] = (m.group(2), m.group(3))
    return lignes


def main() -> None:
    sortie_modeles = sys.argv[1] if len(sys.argv) > 1 else None
    noeuds = {n['id']: n for n in json.load(open(ETAT + 'nodes.json'))}
    points = {(p['grade'], p['code']): p for p in json.load(open(ETAT + 'points.json')) if p['archived_at'] is None}
    modeles = {t['id'][:8]: t for t in json.load(open(ETAT + 'modeles-nombres.json'))}
    liste = lire_liste()
    assert set(liste) == set(MODIFS) == set(modeles), (set(liste) ^ set(MODIFS), set(modeles) ^ set(MODIFS))

    def chemin(i: str) -> list[str]:
        r = []
        while i:
            r.append(noeuds[i]['name'])
            i = noeuds[i]['parent_id']
        return list(reversed(r))

    def notion_de(i: str) -> str:
        n = noeuds[i]
        return n['parent_id'] if n['kind'] == 'subnotion' else n['id']

    lot = []
    for court in sorted(MODIFS, key=lambda c: modeles[c]['id']):
        t = modeles[court]
        grade, code = liste[court]
        assert grade in t['grades'], (court, grade, t['grades'])
        p = points[(grade, code)]
        assert p['node_id'] in (t['classification_node_id'], notion_de(t['classification_node_id'])), (court, code)
        avant = {k: t[k] for k in CHAMPS}
        neuf = copy.deepcopy(avant)
        MODIFS[court](neuf)
        assert neuf != avant, court
        lot.append({
            'id': t['id'],
            'noeud': chemin(t['classification_node_id']),
            'grades': t['grades'],
            'tag': {'grade': grade, 'code': code},
            'avant': avant,
            'apres': neuf,
        })
        if sortie_modeles:
            os.makedirs(sortie_modeles, exist_ok=True)
            json.dump({**t, **neuf}, open(f"{sortie_modeles}/{t['id']}.json", 'w'), ensure_ascii=False, indent='\t')

    json.dump({'modeles': lot}, open(FIXTURE, 'w'), ensure_ascii=False, indent='\t')
    open(FIXTURE, 'a').write('\n')
    ecrire_migration(lot)
    print(f'{len(lot)} modèles modifiés et tagués')


def texte_jsonb(v) -> str:
    """Le texte que Postgres donne à `v::jsonb::text` : clés triées par longueur puis octets,
    séparateurs « , » et « : ». Sert à l'empreinte md5 de la garde du rollback (le test
    d'intégration la vérifie : un écart ferait échouer le rollback)."""
    if isinstance(v, dict):
        cles = sorted(v, key=lambda k: (len(k.encode()), k.encode()))
        return '{' + ', '.join(json.dumps(k, ensure_ascii=False) + ': ' + texte_jsonb(v[k]) for k in cles) + '}'
    if isinstance(v, list):
        return '[' + ', '.join(texte_jsonb(x) for x in v) + ']'
    assert not isinstance(v, float), v
    return json.dumps(v, ensure_ascii=False)


def ecrire_migration(lot: list[dict]) -> None:
    def lit(s: str) -> str:
        assert '$l2n$' not in s
        return '$l2n$' + s + '$l2n$'

    def contenu(c: dict) -> str:
        return lit(json.dumps(c, ensure_ascii=False, separators=(',', ':'))) + '::jsonb'

    def ch(c: list[str]) -> str:
        return ', '.join(lit(v) for v in c) + (', null' if len(c) == 2 else '')

    def tableau(g: list[str]) -> str:
        return 'array[' + ', '.join("'" + v + "'" for v in g) + ']'

    n = len(lot)
    rb = [
        "-- Rollback (il rend aux modèles leur contenu d'avant et retire les tags posés ; aucune",
        "-- donnée d'élève). Garde : il refuse si un modèle n'a plus EXACTEMENT le contenu posé par",
        "-- la migration (empreinte md5), pour ne pas écraser une modification faite depuis dans",
        "-- l'éditeur. Bloc éprouvé par le test d'intégration, à jouer dans une transaction :",
        "-- ROLLBACK:BEGIN",
        "-- do $retour$",
        "-- declare v_intacts integer;",
        "-- begin",
        "-- \tperform 1 from public.question_templates where id in (",
    ]
    rb += [f"-- \t\t'{m['id']}'" + (',' if i < n - 1 else ') for update;') for i, m in enumerate(lot)]
    rb += [
        "-- \tselect count(*) into v_intacts from public.question_templates q join (values",
    ]
    rb += [f"-- \t\t('{m['id']}'::uuid, '{hashlib.md5(texte_jsonb(m['apres']).encode()).hexdigest()}')"
           + (',' if i < n - 1 else '') for i, m in enumerate(lot)]
    rb += [
        "-- \t) as r(id, h) on r.id = q.id",
        "-- \t where md5(jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations,",
        "-- \t                              'shared', q.shared, 'test_specs', q.test_specs)::text) = r.h;",
        f"-- \tif v_intacts <> {n} then",
        f"-- \t\traise exception 'rollback : % modèle(s) sur {n} portent encore le contenu de la migration', v_intacts;",
        "-- \tend if;",
        "-- end $retour$;",
        "-- delete from public.question_template_points q",
        "--  using public.curriculum_points p, (values",
    ]
    rb += [f"--   ('{m['id']}'::uuid, '{m['tag']['grade']}', '{m['tag']['code']}')" + (',' if i < n - 1 else '')
           for i, m in enumerate(lot)]
    rb += [
        "--  ) as r(template_id, grade, code)",
        "--  where q.template_id = r.template_id and p.id = q.point_id and p.grade = r.grade and p.code = r.code;",
        "-- update public.question_templates q",
        "--    set title = r.c->>'title', description = r.c->>'description', variations = r.c->'variations',",
        "--        shared = nullif(r.c->'shared', 'null'::jsonb), test_specs = nullif(r.c->'test_specs', 'null'::jsonb)",
        "--   from (values",
    ]
    rb += [f"--   ('{m['id']}'::uuid, {contenu(m['avant'])})" + (',' if i < n - 1 else '') for i, m in enumerate(lot)]
    rb += ["--   ) as r(id, c)", "--  where q.id = r.id;", "-- ROLLBACK:END"]
    rollback = '\n'.join(rb)

    o = [f'''-- ============================================================================
-- Lot 2 bis, modèles à modifier — lot A « resserrer les nombres tirés » : {n} modèles du CP à la
-- 4e reçoivent leurs nouvelles bornes (variables, variations retirées ou scindées, corrigés,
-- specs de test, titres ou sous-titres devenus faux), puis le tag de leur point (ADR 0020 § 7).
-- ============================================================================
-- Source de vérité : docs/wip/arbre-notions/analyse/lot-2bis-modifications.md § 4 « Resserrer les
-- nombres tirés », VALIDÉ par David (2026-10-20). Fichier GÉNÉRÉ par
-- docs/wip/arbre-notions/analyse/lot-2bis-nombres.py — ne pas éditer à la main.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN ({n} modèles). Elle est prouvée
-- par tests/integration/lot-2bis-nombres.test.ts, qui fabrique des copies des identifiants de la
-- prod (contenu, nœud et niveaux d'avant) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit avoir EXACTEMENT le contenu relevé le 2026-10-21 (titre, sous-titre,
-- variations, partie commune, specs), être au nœud et aux niveaux relevés, et ne porter aucun tag
-- du CP à la 3e (sinon une modification faite depuis serait écrasée).
--
-- Données d'élèves : aucune ligne ne dépend des variations de ces modèles (relevé du 2026-10-21 :
-- 0 tentative d'évaluation, 0 carte SRS ; `worksheet_exercises.variation_index` vise les exercices,
-- pas les modèles de question). `updated_at` avance : le contenu change.
--
-- Accès : aucune règle d'accès ne change. Les tags sont lisibles par tout utilisateur connecté
-- (policy question_template_points_read_authenticated), comme ceux de #1563.
--
{rollback}
-- ============================================================================

set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ---------------------------------------------------
drop table if exists pg_temp._l2n_modeles;
create temporary table _l2n_modeles (
	id uuid primary key,
	branche text not null, notion text not null, sous_notion text,
	grades text[] not null,
	tag_grade text not null, tag_code text not null,
	avant jsonb not null, apres jsonb not null
);''']
    for m in lot:
        o.append(f"insert into _l2n_modeles values ('{m['id']}', {ch(m['noeud'])}, {tableau(m['grades'])}, "
                 f"'{m['tag']['grade']}', '{m['tag']['code']}',\n  {contenu(m['avant'])},\n  {contenu(m['apres'])});")
    o.append(f'''
-- ---- 2. Résolution STRICTE des nœuds et des points --------------------------------------
create temporary table _l2n_resolus as
	select r.id,
	       case when r.sous_notion is null then nn.id else s.id end as noeud,
	       p.id as point_id
	  from _l2n_modeles r
	  left join public.classification_nodes b on b.kind = 'branch' and b.parent_id is null and b.name = r.branche
	  left join public.classification_nodes nn on nn.kind = 'notion' and nn.parent_id = b.id and nn.name = r.notion
	  left join public.classification_nodes s on s.kind = 'subnotion' and s.parent_id = nn.id and s.name = r.sous_notion
	  left join public.curriculum_points p on p.grade = r.tag_grade and p.code = r.tag_code and p.archived_at is null;
do $resolution$
begin
	if exists (select 1 from _l2n_resolus where noeud is null or point_id is null) then
		raise exception 'nœuds ou points introuvables : %',
			(select count(*) from _l2n_resolus where noeud is null or point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, contenu et rangement relevés, aucun tag posé -------
do $garde$
declare v_presents integer; v_contenus integer; v_ranges integer; v_tags integer;
begin
	-- Verrou : aucune sauvegarde de l'éditeur ne peut s'intercaler entre la garde et la mise à jour.
	perform 1 from public.question_templates q join _l2n_modeles r on r.id = q.id for update of q;
	select count(*) into v_presents from _l2n_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, {n}) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur {n}', v_presents;
	end if;
	select count(*) into v_contenus from _l2n_modeles r
	  join public.question_templates q on q.id = r.id
	 where jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations,
	                          'shared', q.shared, 'test_specs', q.test_specs) is distinct from r.avant;
	if v_contenus <> 0 then
		raise exception 'modèles modifiés depuis le relevé : %', v_contenus;
	end if;
	select count(*) into v_ranges from _l2n_modeles r
	  join _l2n_resolus x on x.id = r.id
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is distinct from x.noeud or q.grades is distinct from r.grades;
	if v_ranges <> 0 then
		raise exception 'modèles déplacés ou reclassés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _l2n_modeles r on r.id = q.template_id
	  join public.curriculum_points p on p.id = q.point_id
	 where p.grade in ('CP', 'CE1', 'CE2', 'CM1', 'CM2', '6', '5', '4', '3');
	if v_tags <> 0 then
		raise exception 'tags déjà posés sur ces modèles : %', v_tags;
	end if;
end $garde$;

-- ---- 4. Nouveau contenu, puis tags ------------------------------------------------------
update public.question_templates q
   set title = r.apres->>'title',
       description = r.apres->>'description',
       variations = r.apres->'variations',
       shared = nullif(r.apres->'shared', 'null'::jsonb),
       test_specs = nullif(r.apres->'test_specs', 'null'::jsonb)
  from _l2n_modeles r
 where q.id = r.id;

insert into public.question_template_points (template_id, point_id)
select x.id, x.point_id
  from _l2n_resolus x
  join public.question_templates q on q.id = x.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_ok integer; v_tags integer;
begin
	select count(*) into v_presents from _l2n_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_ok from _l2n_modeles r
	  join public.question_templates q on q.id = r.id
	 where jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations,
	                          'shared', q.shared, 'test_specs', q.test_specs) = r.apres;
	select count(*) into v_tags from _l2n_resolus x
	  join public.question_template_points q on q.template_id = x.id and q.point_id = x.point_id;
	if v_ok <> v_presents or v_tags <> v_presents then
		raise exception 'lot incohérent : contenus %/%, tags %/%', v_ok, v_presents, v_tags, v_presents;
	end if;
end $check$;

drop table pg_temp._l2n_resolus;
drop table pg_temp._l2n_modeles;
''')
    open(MIGRATION, 'w').write('\n'.join(o))


main()
