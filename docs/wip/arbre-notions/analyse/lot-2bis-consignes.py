"""Génère la migration du lot C des MODIFIER du lot 2 bis : « changer la consigne ou l'affichage »
(16 modèles).

Source : `lot-2bis-modifications.md` § 4 « Changer la consigne ou l'affichage », validé par David le
2026-10-20 ; formes tranchées le 2026-10-21 : comparaisons à trois choix avec égalité possible
(environ une fois sur six), tableaux habillés de trois contextes tirés au hasard, factorisation
par une constante, c9d6c5db sorti du lot. État de la prod relu le 2026-10-21 (clé anonyme, lecture
seule) : `etat-prod-2026-10-21/modeles-consignes.json` (nœuds et points : ceux du relevé du lot A).

Chaque modèle reçoit sa nouvelle consigne ou son nouvel affichage ; son corrigé et ses specs de test
suivent ; puis il reçoit le tag de son point. Les comparaisons changent aussi `options` (choix
< = > jamais mélangés).

    python3 docs/wip/arbre-notions/analyse/lot-2bis-consignes.py [dossier où écrire les modèles modifiés]
"""

from lot_2bis_outils import generer, remplacer, variable


# ============================================================================
# OUTILS
# ============================================================================

def changer(conteneur: dict, cle: str, avant, apres) -> None:
    assert conteneur[cle] == avant, (cle, conteneur[cle], avant)
    conteneur[cle] = apres


def etape(variation: dict, i: int, avant: str, apres: str) -> None:
    """Remplace un passage d'une étape du corrigé, après avoir vérifié qu'il y est une fois."""
    texte = variation['correction']['steps'][i]
    assert texte.count(avant) == 1, (avant, texte)
    variation['correction']['steps'][i] = texte.replace(avant, apres)


def decrire(t: dict, avant: str, apres: str) -> None:
    """Renomme la description d'une spec de test."""
    s = [s for s in t['test_specs'] if s['description'] == avant]
    assert len(s) == 1, avant
    s[0]['description'] = apres


def choix(variables: dict, choisi: int, statut: str, description: str, variation: int = 0) -> dict:
    return {
        'expected': {'status': statut},
        'variables': variables,
        'description': description,
        'variationIndex': variation,
        'selectedChoices': [choisi],
    }


def reponse(rep: str, statut: str, variables: dict, description: str, variation: int = 0,
            violations: list[str] | None = None) -> dict:
    attendu: dict = {'status': statut}
    if violations:
        attendu['constraintViolations'] = violations
    return {'answers': [rep], 'expected': attendu, 'variables': variables, 'description': description,
            'variationIndex': variation}


# ============================================================================
# 1. COMPARER : « a … b » avec les choix <, = et >
# ============================================================================

CONSIGNE_COMPARER = 'Complète avec le symbole qui convient.'
SYMBOLES = [{'content': '$$<$$'}, {'content': '$$=$$'}, {'content': '$$>$$'}]
EGALITE = {'name': 'egal', 'expression': '1..6'}  # egal = 1 (pas « e » : e est la constante d'Euler) : le second nombre est le premier (une fois sur six)


def bon_symbole(x: str, y: str) -> dict:
    """Variable `r` : indice du bon symbole (0 : <, 1 : =, 2 : >)."""
    return {'name': 'r', 'expression': f'{{{{if:{x}<{y}|0|{{{{if:{x}={y}|1|2}}}}}}}}'}


def corrige_comparer(v: dict, x: str, y: str) -> None:
    """Étape 2 : cas d'égalité ajouté devant le raisonnement ; étape 3 : le symbole, plus « le plus petit »."""
    steps = v['correction']['steps']
    assert len(steps) == 3 and steps[2] == 'Le plus petit des deux nombres est donc :\n\n{{solution}}', steps
    steps[1] = (f'{{{{if:{x}={y}|Les deux nombres ont les mêmes chiffres aux mêmes rangs : ils sont égaux.|'
                + steps[1] + '}}')
    steps[2] = f'On écrit donc :\n\n$${{{{{x}}}}} {{{{if:{x}<{y}|<|{{{{if:{x}={y}|=|>}}}}}}}} {{{{{y}}}}}$$'


def comparer(v: dict, x: str, y: str, affiche_x: str, affiche_y: str) -> None:
    """Variation de comparaison : consigne, choix, bon choix, corrigé ; sans condition « x ≠ y »."""
    assert v['statement'] == 'Quel est le plus petit de ces 2 nombres ?', v['statement']
    changer(v, 'choices', [{'content': f'$${affiche_x}$$'}, {'content': f'$${affiche_y}$$'}], SYMBOLES)
    changer(v, 'conditions', [f'{x}!={y}'], [])
    del v['conditions']
    changer(v, 'correctChoiceIndex', [f'{{{{if:{x}<{y}|0|1}}}}'], ['{{r}}'])
    v['statement'] = f'{CONSIGNE_COMPARER}\n\n$${affiche_x} \\ldots {affiche_y}$$'
    v['variables'].append(bon_symbole(x, y))
    corrige_comparer(v, x, y)


def egal_possible(v: dict, y: str, avant: str, x: str) -> None:
    """`y` vaut `x` quand egal = 1 ; egal est tiré juste avant `y`."""
    i = next(i for i, w in enumerate(v['variables']) if w['name'] == y)
    v['variables'].insert(i, dict(EGALITE))
    assert avant.startswith('eval:'), avant
    corps, _, format_ = avant[len('eval:'):].partition(';')
    variable(v, y, avant, f'eval:{{{{if:egal=1|{x}|{corps}}}}}' + (f';{format_}' if format_ else ''))


def sans_melange(t: dict) -> None:
    changer(t, 'options', None, {'shuffleChoices': False})


def m_943151d0(t):
    v = t['variations'][0]
    egal_possible(v, 'g', 'eval:c*10+d', 'f')
    comparer(v, 'f', 'g', '{{f}}', '{{g}}')
    sans_melange(t)
    t['test_specs'] = [
        choix({'a': '7', 'b': '9', 'c': '9', 'd': '6', 'egal': '2'}, 0, 'correct', '79 < 96'),
        choix({'a': '7', 'b': '9', 'c': '9', 'd': '6', 'egal': '2'}, 2, 'incorrect', '79 < 96 : > choisi'),
        choix({'a': '9', 'b': '1', 'c': '1', 'd': '5', 'egal': '2'}, 2, 'correct', '91 > 15'),
        choix({'a': '4', 'b': '7', 'c': '0', 'd': '0', 'egal': '1'}, 1, 'correct', 'égalité : 47 = 47'),
        choix({'a': '4', 'b': '7', 'c': '0', 'd': '0', 'egal': '1'}, 0, 'incorrect', 'égalité : < choisi'),
        choix({'a': '0', 'b': '0', 'c': '9', 'd': '9', 'egal': '2'}, 0, 'correct', 'borne : 0 < 99'),
    ]


def m_d4245f88(t):
    v = t['variations'][0]
    egal_possible(v, 'j', 'eval:d*100+f*10+g', 'h')
    comparer(v, 'h', 'j', '{{h}}', '{{j}}')
    sans_melange(t)
    grand = {'a': '7', 'b': '9', 'c': '9', 'd': '6', 'f': '2', 'g': '8', 'egal': '2'}
    petit = {'a': '2', 'b': '0', 'c': '5', 'd': '4', 'f': '3', 'g': '4', 'egal': '2'}
    t['test_specs'] = [
        choix(grand, 2, 'correct', '799 > 628'),
        choix(grand, 0, 'incorrect', '799 > 628 : < choisi'),
        choix(petit, 0, 'correct', '205 < 434'),
        choix({**petit, 'egal': '1'}, 1, 'correct', 'égalité : 205 = 205'),
        choix({**petit, 'egal': '1'}, 0, 'incorrect', 'égalité : < choisi'),
    ]


def m_68775a97(t):
    v = t['variations'][0]
    egal_possible(v, 'j', 'eval:d*1000+f*100+g*10+j1', 'h')
    comparer(v, 'h', 'j', '{{eval:h}}', '{{eval:j}}')
    sans_melange(t)
    grand = {'a': '7', 'b': '9', 'c': '9', 'd': '6', 'f': '2', 'g': '8', 'h1': '3', 'j1': '1', 'egal': '2'}
    petit = {'a': '2', 'b': '0', 'c': '5', 'd': '4', 'f': '3', 'g': '4', 'h1': '6', 'j1': '2', 'egal': '2'}
    t['test_specs'] = [
        choix(grand, 2, 'correct', '7993 > 6281'),
        choix(grand, 0, 'incorrect', '7993 > 6281 : < choisi'),
        choix(petit, 0, 'correct', '2056 < 4342'),
        choix({**petit, 'egal': '1'}, 1, 'correct', 'égalité : 2056 = 2056'),
        choix({**petit, 'egal': '1'}, 2, 'incorrect', 'égalité : > choisi'),
    ]


def m_0021eee7(t):
    v = t['variations'][0]
    egal_possible(v, 'h', 'eval:f+c*10^b', 'g')
    comparer(v, 'g', 'h', '{{eval:g}}', '{{eval:h}}')
    sans_melange(t)
    proches = {'a': '2', 'b': '4', 'c': '18', 'd': '4498', 'f': '7123', 'egal': '2'}
    t['test_specs'] = [
        choix(proches, 0, 'correct', '184498 < 187123'),
        choix(proches, 2, 'incorrect', '184498 < 187123 : > choisi'),
        choix({**proches, 'd': '7123', 'f': '4498'}, 2, 'correct', '187123 > 184498'),
        choix({**proches, 'egal': '1'}, 1, 'correct', 'égalité : 184498 = 184498'),
        choix({'a': '0', 'b': '4', 'c': '0', 'd': '2748', 'f': '5372', 'egal': '2'}, 0, 'correct',
              'a=0 : 2748 < 5372'),
    ]


def m_9c0c47ef(t):
    # Partie commune : consigne, choix, condition et bon choix des deux variations.
    s = t['shared']
    changer(s, 'statement', 'Quel est le plus petit de ces deux nombres ?', CONSIGNE_COMPARER + '\n\n$${{h}} \\ldots {{j}}$$')
    changer(s, 'choices', [{'content': '$${{h}}$$'}, {'content': '$${{j}}$$'}], SYMBOLES)
    changer(s, 'conditions', ['h!=j'], [])
    del s['conditions']
    changer(s, 'correctChoiceIndex', ['{{if:h<j|0|1}}'], ['{{r}}'])
    for i, v in enumerate(t['variations']):
        changer(v, 'statement', 'Quel est le plus petit de ces deux nombres ?', s['statement'])
        changer(v, 'correctChoiceIndex', ['{{if:h<j|0|1}}'], ['{{r}}'])
        # Égalité en variation 1 seulement (même écriture) : en variation 2, les deux nombres n'ont pas
        # le même nombre de décimales.
        if i == 0:
            egal_possible(v, 'j', 'eval:(f+c*10^b)/10^b;d', 'h')
        v['variables'].append(bon_symbole('h', 'j'))
        corrige_comparer(v, 'h', 'j')
    sans_melange(t)
    proches = {'a': '2', 'b': '2', 'c': '18', 'd': '44', 'f': '71', 'egal': '2'}
    piege = {'a': '1', 'b': '5', 'c': '9', 'd': '12'}
    t['test_specs'] = [
        choix(proches, 0, 'correct', '18,44 < 18,71'),
        choix(proches, 2, 'incorrect', '18,44 < 18,71 : > choisi'),
        choix({**proches, 'egal': '1'}, 1, 'correct', 'égalité : 18,44 = 18,44'),
        choix({'a': '2', 'b': '82', 'c': '1', 'd': '67'}, 0, 'correct', '82,1 < 82,67', 1),
        choix(piege, 2, 'correct', 'Piège : 5,9 > 5,12', 1),
        choix(piege, 0, 'incorrect', 'Piège : 5,9 < 5,12 (plus court) : refusé', 1),
    ]


# ============================================================================
# 2. SYMBOLE ÷
# ============================================================================

def m_e6ddf5d7(t):
    variable(t['variations'][0], 'expression1', '{{eval:a*b}}:{{b}}', '{{eval:a*b}}\\div{{b}}')
    decrire(t, '63:9 = 7', '63 ÷ 9 = 7')
    decrire(t, 'Bornes : 4:2 = 2', 'Bornes : 4 ÷ 2 = 2')


# ============================================================================
# 3. TABLEAUX HABILLÉS EN GRANDEURS (k : contexte tiré parmi trois)
# ============================================================================

CONTEXTE = {'name': 'k', 'expression': '1..3'}
GRANDEUR_1 = '\\text{{{if:k=1|Masse (kg)|{{if:k=2|Durée (h)|Nombre de cahiers}}}}}'
GRANDEUR_2 = '\\text{{{if:k=2|Distance (km)|Prix (€)}}}'


def en_lignes(haut: tuple[str, str], bas: tuple[str, str]) -> str:
    """Une grandeur par ligne, nommée à gauche. Traits verticaux seulement, comme les tableaux déjà en
    prod (13d52989) : MathLive ne connaît pas `\\hline`."""
    return ('\\begin{array}{|l|c|c|} ' + GRANDEUR_1 + f' & {haut[0]} & {haut[1]} \\\\ '
            + GRANDEUR_2 + f' & {bas[0]} & {bas[1]} \\end{{array}}')


def en_colonnes(haut: tuple[str, str], bas: tuple[str, str]) -> str:
    """Une grandeur par colonne, nommée en tête."""
    return ('\\begin{array}{|c|c|} ' + GRANDEUR_1 + ' & ' + GRANDEUR_2
            + f' \\\\ {haut[0]} & {haut[1]} \\\\ {bas[0]} & {bas[1]} \\end{{array}}')


def tableau_avant(texte: str) -> str:
    """Le tableau d'un énoncé ou d'un corrigé actuel (entre `\\begin{array}` et `\\end{array}`)."""
    debut = texte.index('\\begin{array}')
    fin = texte.index('\\end{array}') + len('\\end{array}')
    return texte[debut:fin]


def habiller(t: dict, tableaux: list[str]) -> None:
    """Remplace le tableau de chaque énoncé (et du corrigé, s'il en montre un) ; tire le contexte k."""
    t['shared']['variables'].append(dict(CONTEXTE))
    for v, neuf in zip(t['variations'], tableaux, strict=True):
        v['statement'] = v['statement'].replace(tableau_avant(v['statement']), neuf)
        premiere = v['correction']['steps'][0]
        if '\\begin{array}' in premiere:
            v['correction']['steps'][0] = premiere.replace(tableau_avant(premiere), neuf)
    for s in t['test_specs']:
        s['variables']['k'] = '1'


def m_496ac62e(t):
    # « En regardant les lignes » : une grandeur par ligne.
    habiller(t, [en_lignes(('{{a}}', '{{b}}'), ('{{eval:a*c}}', '{{eval:b*c}}')),
                 en_lignes(('{{a}}', '{{b}}'), ('{{eval:a*c}}', '{{eval:b*(c+1)}}'))])


def m_d01e97d6(t):
    # « En regardant les colonnes » : une grandeur par colonne.
    habiller(t, [en_colonnes(('{{a}}', '{{eval:a*c}}'), ('{{b}}', '{{eval:b*c}}')),
                 en_colonnes(('{{a}}', '{{eval:a*c}}'), ('{{b}}', '{{eval:b*(c+1)}}'))])


def m_447b5613(t):
    # Chaque ligne du tableau est un couple : une grandeur par colonne.
    habiller(t, [en_colonnes(('{{a}}', '?'), ('{{b}}', '{{eval:b*c}}')),
                 en_colonnes(('{{a}}', '{{eval:a*c}}'), ('{{b}}', '?')),
                 en_colonnes(('{{a}}', '{{eval:a*c}}'), ('?', '{{eval:b*c}}')),
                 en_colonnes(('?', '{{eval:a*c}}'), ('{{b}}', '{{eval:b*c}}'))])


def m_4b080eed(t):
    # Coefficient de proportionnalité entre les deux lignes : une grandeur par ligne.
    habiller(t, [en_lignes(('{{a}}', '{{b}}'), ('?', '{{eval:b*c}}')),
                 en_lignes(('{{a}}', '{{b}}'), ('{{eval:a*c}}', '?')),
                 en_lignes(('{{a}}', '?'), ('{{eval:a*c}}', '{{eval:b*c}}')),
                 en_lignes(('?', '{{b}}'), ('{{eval:a*c}}', '{{eval:b*c}}'))])


# ============================================================================
# 4. ÉCHELLE GRAPHIQUE : « 1 cm représente … »
# ============================================================================

# Par variation : a (dénominateur de l'échelle), unité de « 1 cm représente » (None : cm), ce que ça donne.
ECHELLES = [(10, None, '10 cm'), (100, 'm', '1 m'), (100, 'm', '1 m'), (1000, 'm', '10 m'),
            (100000, 'km', '1 km'), (1000000, 'km', '10 km')]


def representation(v: dict, i: int) -> None:
    """d : la longueur réelle que représente 1 cm, au lieu de la fraction 1/a."""
    a, unite, _ = ECHELLES[i]
    variable(v, 'a', str(a), str(a))
    variable(v, 'd', '1/a', 'eval:(a)[cm]' + (f';[{unite}]' if unite else ''))


def renommer_echelles(t: dict) -> None:
    """Les descriptions des specs disent « à 1/a » : elles disent maintenant « 1 cm pour … »."""
    for s in t['test_specs']:
        for a, _, texte in ECHELLES:
            s['description'] = s['description'].replace(f'à 1/{a} ', f'(1 cm pour {texte}) ')


def m_52bf3fb9(t):
    consigne = ("Sur une carte, $1$ cm représente ${{d}}$ dans la réalité. On mesure sur la carte une longueur "
                "de ${{c}}$. Calcule la longueur réelle.\n\nLa longueur réelle est de $?$.")
    t['shared']['statement'] = consigne
    for i, v in enumerate(t['variations']):
        representation(v, i)
        v['statement'] = consigne
        # Le résultat est demandé en dm (v1) ou en dam (v4) : une conversion de plus.
        produit = '{{b}} \\times {{d}} = ' + ('{{eval:b*d}} = ' if i in (0, 3) else '') + '{{solution:0}}'
        v['correction'] = {'steps': [
            'Sur la carte, $1$ cm représente ${{d}}$ dans la réalité. ${{c}}$ représentent donc ${{b}}$ fois plus :',
            f'$${produit}$$',
        ]}
    renommer_echelles(t)


def m_5e4e5e9d(t):
    consigne = ("Sur une carte, $1$ cm représente ${{d}}$ dans la réalité. On veut représenter une longueur "
                "réelle de ${{c}}$. Calcule cette longueur sur la carte, en centimètres.\n\n"
                "La longueur sur la carte est $?$ cm.")
    t['shared']['statement'] = consigne
    for i, v in enumerate(t['variations']):
        representation(v, i)
        v['statement'] = consigne
        # c est en dm aux variations 1-2 : converti dans l'unité de d.
        conversion = {0: '{{eval:c;[cm]}} = ', 1: '{{eval:c;[m]}} = '}.get(i, '')
        v['correction'] = {'steps': [
            'Sur la carte, $1$ cm représente ${{d}}$ dans la réalité. On cherche combien de fois ${{d}}$ il y a '
            'dans ${{c}}$ :',
            f'$${{{{c}}}} = {conversion}{{{{solution:0}}}} \\times {{{{d}}}}$$',
            'La longueur sur la carte est donc de ${{solution:0}}$ cm.',
        ]}
    renommer_echelles(t)


# ============================================================================
# 5. ÉCRITURE SIMPLIFIÉE (variation 1 : −a + b au lieu de (−a) + b)
# ============================================================================

def ecriture_simplifiee(t: dict, avant: str, apres: str, a: str, renommages: dict[str, str]) -> None:
    variable(t['variations'][0], 'expression1', avant, apres)
    etape(t['variations'][0], 4,
          f'\\left( \\textcolor{{{{{{color:primary.0}}}}}}{{-}}{a} \\right) + {{{{b}}}}',
          f'\\textcolor{{{{{{color:primary.0}}}}}}{{-}}{a} + {{{{b}}}}')
    for avant_d, apres_d in renommages.items():
        decrire(t, avant_d, apres_d)


def m_347eb0d0(t):
    ecriture_simplifiee(t, '(-a)+b', '-a+b', '{{a}}', {'(-3)+1 = -2': '-3+1 = -2', 'borne : (-7)+8': 'borne : -7+8'})


def m_db4f1dde(t):
    ecriture_simplifiee(t, '(-a)+b', '-a+b', '{{a}}', {'(-3)+1 = -2': '-3+1 = -2', 'borne : (-4)+4': 'borne : -4+4'})


def m_5b53b1be(t):
    # Virgule décimale → point dans les trois variations : le parseur maison ne lit plus `a,5`
    # depuis #1565 (lecture-grandeurs PR 6). Ce sont les trois réécritures prévues pour ce modèle par
    # scripts/reecrire-virgule-decimale-base.ts, qui le saute ensuite (« déjà réécrit »).
    variable(t['variations'][1], 'expression2', '(-a,5)-b', '(-a.5)-b')
    variable(t['variations'][2], 'expression3', 'a,5-b', 'a.5-b')
    ecriture_simplifiee(t, '(-a,5)+b', '-a.5+b', '{{eval:a+0.5;d}}',
                        {'(-2,5)+1 = -1,5': '-2,5+1 = -1,5', 'borne : (-3,5)+4 = 0,5': 'borne : -3,5+4 = 0,5'})


# ============================================================================
# 6. FACTORISER : second terme constant (7x + 63 = 7(x + 9))
# ============================================================================

# Par variation : expression d'avant, expression nouvelle, réponse attendue, et le corrigé :
# ce qui suit « a × » dans la décomposition, puis la parenthèse.
A = '\\textcolor{{{color:primary.0}}}{{{a}}}'
FACTORISER = [
    ('{{a}}{{c}}+{{eval:a*b}}{{d}}', '{{a}}{{c}}+{{eval:a*b}}', '{{a}}({{c}}+{{b}})',
     f'{A} \\times {{{{c}}}} + {A} \\times {{{{b}}}}', '({{c}} + {{b}})'),
    ('{{eval:a*b}}{{d}}+{{a}}{{c}}', '{{eval:a*b}}+{{a}}{{c}}', '{{a}}({{b}}+{{c}})',
     f'{A} \\times {{{{b}}}} + {A} \\times {{{{c}}}}', '({{b}} + {{c}})'),
    ('{{a}}{{c}}-{{eval:a*b}}{{d}}', '{{a}}{{c}}-{{eval:a*b}}', '{{a}}({{c}}-{{b}})',
     f'{A} \\times {{{{c}}}} - {A} \\times {{{{b}}}}', '({{c}} - {{b}})'),
    ('{{eval:a*b}}{{d}}-{{a}}{{c}}', '{{eval:a*b}}-{{a}}{{c}}', '{{a}}({{b}}-{{c}})',
     f'{A} \\times {{{{b}}}} - {A} \\times {{{{c}}}}', '({{b}} - {{c}})'),
]


def m_d7f2568a(t):
    t['shared']['variables'] = [w for w in t['shared']['variables'] if w['name'] != 'd']
    assert [w['name'] for w in t['shared']['variables']] == ['a', 'b', 'c']
    for i, (v, (avant, apres, attendu, decompose, parenthese)) in enumerate(zip(t['variations'], FACTORISER, strict=True)):
        variable(v, f'expression{i + 1}', avant, apres)
        v['blanks'][0]['expectedAnswer'] = attendu
        v['correction'] = {'steps': [
            f'$$\\begin{{align}} {apres} &= {decompose} \\\\ &= {A} \\times {parenthese} \\\\ '
            f'&= {{{{solution}}}} \\end{{align}}$$'
        ]}
    z = {'a': '5', 'b': '9', 'c': 'z|z'}
    t['test_specs'] = [
        reponse('5(z+9)', 'correct', z, 'v0 bonne réponse', 0),
        reponse('5(9+z)', 'correct', z, 'v1 bonne réponse', 1),
        reponse('5(z-9)', 'correct', z, 'v2 bonne réponse', 2),
        reponse('5(9-z)', 'correct', z, 'v3 bonne réponse', 3),
        reponse('5z+45', 'bad_form', z, 'forme développée', 0, ['form']),
        reponse('5(9+z)', 'correct', z, '5(9+z) ordre inversé', 0),
        reponse('5(z+8)', 'incorrect', z, 'mauvais quotient', 0),
    ]


MODIFS = {
    '943151d0': m_943151d0, 'd4245f88': m_d4245f88, '68775a97': m_68775a97, '0021eee7': m_0021eee7,
    '9c0c47ef': m_9c0c47ef, 'e6ddf5d7': m_e6ddf5d7, '496ac62e': m_496ac62e, 'd01e97d6': m_d01e97d6,
    '447b5613': m_447b5613, '4b080eed': m_4b080eed, '52bf3fb9': m_52bf3fb9, '5e4e5e9d': m_5e4e5e9d,
    '347eb0d0': m_347eb0d0, 'db4f1dde': m_db4f1dde, '5b53b1be': m_5b53b1be, 'd7f2568a': m_d7f2568a,
}


ENTETE = """-- ============================================================================
-- Lot 2 bis, modèles à modifier — lot C « changer la consigne ou l'affichage » : {n} modèles du
-- CP à la 4e changent de consigne ou d'affichage (comparaisons « a … b » avec <, = et >, symbole ÷,
-- tableaux habillés en grandeurs, échelle « 1 cm représente … », écriture simplifiée des relatifs,
-- factorisation par une constante) ; corrigés et specs de test suivent ; les comparaisons ne
-- mélangent plus leurs choix (`options`). Puis chacun reçoit le tag de son point (ADR 0020 § 7).
-- ============================================================================
-- Source de vérité : docs/wip/arbre-notions/analyse/lot-2bis-modifications.md § 4 « Changer la
-- consigne ou l'affichage », VALIDÉ par David (2026-10-20, formes tranchées le 2026-10-21). Fichier
-- GÉNÉRÉ par docs/wip/arbre-notions/analyse/lot-2bis-consignes.py — ne pas éditer à la main.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN ({n} modèles). Elle est prouvée
-- par tests/integration/lot-2bis-consignes.test.ts, qui fabrique des copies des identifiants de la
-- prod (contenu, options, nœud et niveaux d'avant) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit avoir EXACTEMENT le contenu relevé le 2026-10-21 (titre, sous-titre,
-- variations, partie commune, specs, options), être au nœud et aux niveaux relevés, et ne porter
-- aucun tag du CP à la 3e (sinon une modification faite depuis serait écrasée).
--
-- Données d'élèves : aucune ne tient à ces modèles (relevé du 2026-10-21, lecture seule : 0 tentative
-- d'évaluation, 0 tentative de compétence, 0 carte SRS, 0 réponse de test, 0 activité de journal,
-- aucun exercice, chapitre, modèle de fiche ni favori) : le passage des comparaisons de 2 à 3 choix
-- ne rend aucun indice de choix enregistré faux. `updated_at` avance : le contenu change.
--
-- Accès : QUESTION À POSER À DAVID avant la PR.
--"""

generer(MODIFS, modeles='modeles-consignes.json', section="Changer la consigne ou l'affichage",
        migration='supabase/migrations/20261021120000_lot_2bis_consignes.sql',
        fixture='tests/integration/fixtures/lot-2bis-consignes.json', prefixe='l2c', entete=ENTETE,
        options=True)
