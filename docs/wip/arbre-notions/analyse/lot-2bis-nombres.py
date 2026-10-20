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

import re

from lot_2bis_outils import garder_variations, generer, remplacer, retirer_variable, spec, variable


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


ENTETE = """-- ============================================================================
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
--"""

generer(MODIFS, modeles='modeles-nombres.json', section='Resserrer les nombres tirés',
        migration='supabase/migrations/20261021090000_lot_2bis_resserrer_nombres.sql',
        fixture='tests/integration/fixtures/lot-2bis-nombres.json', prefixe='l2n', entete=ENTETE)
