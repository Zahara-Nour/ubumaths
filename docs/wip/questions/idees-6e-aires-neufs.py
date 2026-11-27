"""Écrit les modèles neufs du chantier idees-6e-aires dans scripts/questions/idees-6e-aires-neufs/.

Phase 0 du 2026-11-27 (journal docs/wip/idees-6e-aires-progress.md) : David a répondu « je te suis »
au message qui listait les fiches N1 à N8 et les questions Q1 à Q3 avec mes propositions. On reprend
l'idée de l'autre plateforme, pas sa forme ni son texte.

Ni theme, ni domain, ni subdomain, ni id : le rangement (nœud + tag) se fera par migration, après la
création en brouillon (champ `rangement`). Points : N1 → 6-150 ; N3 → 6-201 (Q1) ; N4 → CM2-071,
modèle de CM2 et de 6e (Q2) ; N5 → 6-151 (carré) et 6-200 (rectangle) ; N6 → 6-201 ; N8 → 6-200.
Le point d'un modèle est sur son nœud ou sur sa notion (`question_template_points_check_rules`) :
N3 va donc sous « rectangle », N4 sous la notion « Aires » (où CM2-071 est posé).
Niveaux relevés en prod le 2026-11-27 (à relever de nouveau avant la migration de rangement) :
« unités et conversions » 6e L1 ; « carré » 6e L1, L2 ; « rectangle » 6e L1, L2 (+ un brouillon L2).

Choix d'écriture :
- une aire ou une longueur demandée seule : case à unité (l'élève écrit l'unité ; « l'aire en cm »
  est une erreur prévue) ; une conversion : case nombre, l'unité écrite après la case ;
- N1 (c) : fraction ou décimal acceptés, donc `form: off` sur N1 (ses autres cases sont des entiers
  ou un choix) ;
- N1 (d), N4, N5 (b), N6 (c) : case choix (la réponse est un mot ou une comparaison) ; les choix
  n'ont pas d'erreurs prévues ;
- figures : bloc ```figure (grille: 1 pour le quadrillage), pas à l'échelle pour N8.

Règles suivies (couvrir-un-niveau.md § 5) : erreurs prévues de vraies erreurs d'élèves, chacune avec
sa spec `incorrect` qui nomme son message ; un coup de pouce par variation, qui ne donne jamais la
réponse.

Usage : python3 docs/wip/questions/idees-6e-aires-neufs.py scripts/questions/idees-6e-aires-neufs
"""
import json
import math
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
CONVERSIONS = {'noeud': 'Grandeurs et mesures > Aires > unités et conversions', 'point': '6-150'}
CARRE = {'noeud': 'Grandeurs et mesures > Aires > carré', 'point': '6-151'}
RECT = 'Grandeurs et mesures > Aires > rectangle'
AIRES = {'noeud': 'Grandeurs et mesures > Aires', 'point': 'CM2-071'}

CM = '~\\unit{cm}'
CM2 = '~\\unit{cm^2}'


def spec(desc, vi, variables_, status, answers, message=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = message
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': expected, 'answers': answers}


def modele(title, description, level, delay, variations, specs, rangement, options=None,
           grades=None):
    m = {'rangement': rangement, 'title': title, 'description': description,
         'grades': grades or ['6'], 'level': level, 'delay': delay, 'status': 'draft'}
    if options:
        m['options'] = options
    m['variations'] = variations
    m['testSpecs'] = specs
    return m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def case(attendue, erreurs=None, unite=False):
    c = {'expectedAnswer': attendue}
    if unite:
        c['unit'] = {'expected': True}
    if erreurs:
        c['expectedErrors'] = erreurs
    return c


def variation(statement, variables, blanks, steps, hint, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': blanks, 'correction': {'steps': steps}, 'hint': hint}


def couleur(contenu):
    return PRIMAIRE + '{' + contenu + '}'


def selon(v, textes, k=0):
    """`{{if:v==0|…|{{if:v==1|…|…}}}}` : le texte numéro v."""
    if k == len(textes) - 1:
        return textes[k]
    return '{{if:' + v + '==' + str(k) + '|' + textes[k] + '|' + selon(v, textes, k + 1) + '}}'


def sel(v, valeurs):
    """Expression qui vaut valeurs[k] quand v == k (indicatrices, pour une variable `eval:`)."""
    return '+'.join(f'({x})*(1-min(abs({v}-{k}),1))' for k, x in enumerate(valeurs))


def bloc(nom, *lignes):
    return '```' + nom + '\n' + '\n'.join(lignes) + '\n```'


def u(texte):
    """Unité en écriture LaTeX : `\\unit{cm^2}`."""
    return '\\unit{' + texte + '}'


def ecrire(nom, m):
    os.makedirs(DOSSIER, exist_ok=True)
    chemin = os.path.join(DOSSIER, nom + '.json')
    # Garder l'id écrit en tête par create-questions --publier, s'il existe
    if os.path.exists(chemin):
        with open(chemin, encoding='utf-8') as f:
            ancien = json.load(f)
        if 'id' in ancien:
            m = {'id': ancien['id'], **m}
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write('\n')


# =============================================================================================
# N1 — 6-150 : relations entre m², dm² et cm² (automatismes du BO de 6e).
# g = 0 : cm (sous-unité mm) ; g = 1 : dm (cm) ; g = 2 : m (dm).
# =============================================================================================

UL = ['cm', 'dm', 'm']
SOUS = ['mm', 'cm', 'dm']

MSG_COTE_AIRE = 'Le côté est une longueur : son unité n\'a pas de « carré ».'
MSG_COTE_100 = ('Le carré a $1$ ' + selon('g', ['cm', 'dm', 'm']) + ' de côté, soit $10$ '
                + selon('g', SOUS) + ' : c\'est son aire qui fait $100$ '
                + selon('g', ['mm', 'cm', 'dm']) + '$^2$.')

# (a) 1 U² est l'aire d'un carré de côté ?
N1_A = variation(
    'Complète.\n\n$1~' + u(selon('g', ['cm^2', 'dm^2', 'm^2'])) + '$ est l\'aire d\'un carré de '
    'côté $?$.',
    [var('g', '0..2')],
    [case('1' + u(selon('g', UL)), [
        erreur('1' + u(selon('g', ['cm^2', 'dm^2', 'm^2'])), MSG_COTE_AIRE, 'Unité d\'aire'),
        erreur('100' + u(selon('g', SOUS)), MSG_COTE_100, '100 sous-unités'),
    ], unite=True)],
    [
        '$1~' + u(selon('g', ['cm^2', 'dm^2', 'm^2'])) + '$, c\'est l\'aire d\'un carré de $'
        + couleur('1~' + u(selon('g', UL))) + '$ de côté.',
        'C\'est ainsi qu\'on définit les unités d\'aire : un carré dont le côté vaut une unité de '
        'longueur.',
    ],
    'Une unité d\'aire porte le nom d\'une unité de longueur : laquelle, et pour quelle figure ?',
)

# (b) 1 m = 10 dm, donc 1 m² = 10 dm × 10 dm = ? dm². h = 0 : m → dm ; h = 1 : dm → cm.
GR = ['m', 'dm']
PT = ['dm', 'cm']
MSG_B_10 = ('Le carré mesure $10$ ' + selon('h', PT) + ' de long **et** $10$ ' + selon('h', PT)
            + ' de large : il y a $10$ rangées de $10$ carrés.')
MSG_B_20 = 'On multiplie la longueur par la largeur : $10 \\times 10$, pas $10 + 10$.'
N1_B = variation(
    'Un carré de $1~' + u(selon('h', GR)) + '$ de côté mesure $10~' + u(selon('h', PT))
    + '$ de côté.\n\n$1~' + u(selon('h', ['m^2', 'dm^2'])) + ' = 10~' + u(selon('h', PT))
    + ' \\times 10~' + u(selon('h', PT)) + ' = ?~' + u(selon('h', ['dm^2', 'cm^2'])) + '$',
    [var('h', '0..1')],
    [case('100', [
        erreur('10', MSG_B_10, 'Une seule dimension'),
        erreur('20', MSG_B_20, 'Somme au lieu du produit'),
    ])],
    [
        'Le carré contient $10$ rangées de $10$ petits carrés de $1~' + u(selon('h', PT))
        + '$ de côté.',
        '$10 \\times 10 = 100$, donc $1~' + u(selon('h', ['m^2', 'dm^2'])) + ' = '
        + couleur('100~' + u(selon('h', ['dm^2', 'cm^2']))) + '$.',
    ],
    'Dessine le grand carré découpé en petits carrés : combien de rangées, et combien dans chaque '
    'rangée ?',
)

# (c) 1 cm² = ? dm², fraction ou décimal. h = 0 : cm² → dm² ; h = 1 : dm² → m².
MSG_C_10 = ('Il faut $100~' + u(selon('h', ['cm^2', 'dm^2'])) + '$ pour faire $1~'
            + u(selon('h', ['dm^2', 'm^2'])) + '$, pas $10$.')
MSG_C_100 = ('Le ' + selon('h', ['cm²', 'dm²']) + ' est plus petit que le '
             + selon('h', ['dm²', 'm²']) + ' : $1~' + u(selon('h', ['cm^2', 'dm^2']))
             + '$ n\'est qu\'une petite partie de $1~' + u(selon('h', ['dm^2', 'm^2'])) + '$.')
N1_C = variation(
    'Complète, en écriture fractionnaire ou décimale.\n\n$1~' + u(selon('h', ['cm^2', 'dm^2']))
    + ' = ?~' + u(selon('h', ['dm^2', 'm^2'])) + '$',
    [var('h', '0..1')],
    [case('\\frac{1}{100}', [
        erreur('0{,}1', MSG_C_10, 'Un dixième'),
        erreur('\\frac{1}{10}', MSG_C_10, 'Un dixième (fraction)'),
        erreur('100', MSG_C_100, 'Sens inversé'),
    ])],
    [
        '$1~' + u(selon('h', ['dm^2', 'm^2'])) + ' = 100~' + u(selon('h', ['cm^2', 'dm^2']))
        + '$ : il faut $100$ ' + selon('h', ['cm²', 'dm²']) + ' pour faire $1$ '
        + selon('h', ['dm²', 'm²']) + '.',
        'Donc $1~' + u(selon('h', ['cm^2', 'dm^2'])) + '$ est un centième de $1~'
        + u(selon('h', ['dm^2', 'm^2'])) + '$ : $1~' + u(selon('h', ['cm^2', 'dm^2'])) + ' = '
        + couleur('\\frac{1}{100}~' + u(selon('h', ['dm^2', 'm^2']))) + ' = 0{,}01~'
        + u(selon('h', ['dm^2', 'm^2'])) + '$.',
    ],
    'Combien de ' + selon('h', ['cm²', 'dm²']) + ' faut-il pour faire $1$ '
    + selon('h', ['dm²', 'm²']) + ' ? Un seul en est quelle part ?',
)

# (d) « 1 cm² est … de 1 dm² » : case choix. t = 0 : cm²/dm² ; 1 : dm²/m² ; 2 : dm²/cm² ; 3 : m²/dm².
PETIT = ['cm^2', 'dm^2', 'dm^2', 'm^2']
GRAND = ['dm^2', 'm^2', 'cm^2', 'dm^2']
N1_D = variation(
    'Complète la phrase.\n\n$1~' + u(selon('t', PETIT)) + '$ est … de $1~' + u(selon('t', GRAND))
    + '$.\n\n' + bloc('choix', 'melanger: non', '- une dizaine', '- une centaine', '- un dixième',
                     '- un centième'),
    [var('t', '0..3')],
    [case(selon('t', ['3', '3', '1', '1']))],
    [
        '$' + selon('t', ['1~\\unit{dm^2} = 100~\\unit{cm^2}', '1~\\unit{m^2} = 100~\\unit{dm^2}',
                          '1~\\unit{dm^2} = 100~\\unit{cm^2}', '1~\\unit{m^2} = 100~\\unit{dm^2}'])
        + '$.',
        '$1~' + u(selon('t', PETIT)) + '$ est $' + couleur(selon('t', [
            '\\text{un centième}', '\\text{un centième}', '\\text{une centaine}',
            '\\text{une centaine}'])) + '$ de $1~' + u(selon('t', GRAND)) + '$.',
    ],
    'Entre deux unités d\'aire voisines, on passe par $100$, pas par $10$.',
)

SPECS_N1 = [
    spec('1 cm² : carré de 1 cm', 0, {'g': '0'}, 'correct', ['1' + u('cm')]),
    spec('1 cm² : carré de 10 mm', 0, {'g': '0'}, 'correct', ['10' + u('mm')]),
    spec('1 dm² : carré de 1 dm', 0, {'g': '1'}, 'correct', ['1' + u('dm')]),
    spec('1 dm² : carré de 10 cm', 0, {'g': '1'}, 'correct', ['10' + u('cm')]),
    spec('1 dm² : unité d\'aire', 0, {'g': '1'}, 'incorrect', ['1' + u('dm^2')], MSG_COTE_AIRE),
    spec('1 m² : 100 dm', 0, {'g': '2'}, 'incorrect', ['100' + u('dm')],
         'Le carré a $1$ m de côté, soit $10$ dm : c\'est son aire qui fait $100$ dm$^2$.'),
    spec('1 m² = 100 dm²', 1, {'h': '0'}, 'correct', ['100']),
    spec('1 m² : 10', 1, {'h': '0'}, 'incorrect', ['10'],
         'Le carré mesure $10$ dm de long **et** $10$ dm de large : il y a $10$ rangées de $10$ '
         'carrés.'),
    spec('1 dm² : 20', 1, {'h': '1'}, 'incorrect', ['20'], MSG_B_20),
    spec('1 cm² = 1/100 dm²', 2, {'h': '0'}, 'correct', ['\\frac{1}{100}']),
    spec('1 cm² = 0,01 dm²', 2, {'h': '0'}, 'correct', ['0{,}01']),
    spec('1 dm² = 0,01 m²', 2, {'h': '1'}, 'correct', ['0{,}01']),
    spec('1 cm² : 0,1', 2, {'h': '0'}, 'incorrect', ['0{,}1'],
         'Il faut $100~\\unit{cm^2}$ pour faire $1~\\unit{dm^2}$, pas $10$.'),
    spec('1 cm² : 1/10', 2, {'h': '0'}, 'incorrect', ['\\frac{1}{10}'],
         'Il faut $100~\\unit{cm^2}$ pour faire $1~\\unit{dm^2}$, pas $10$.'),
    spec('1 dm² : 100', 2, {'h': '1'}, 'incorrect', ['100'],
         'Le dm² est plus petit que le m² : $1~\\unit{dm^2}$ n\'est qu\'une petite partie de '
         '$1~\\unit{m^2}$.'),
    spec('cm² de dm² : un centième', 3, {'t': '0'}, 'correct', ['3']),
    spec('cm² de dm² : un dixième refusé', 3, {'t': '0'}, 'incorrect', ['2']),
    spec('dm² de cm² : une centaine', 3, {'t': '2'}, 'correct', ['1']),
    spec('m² de dm² : une dizaine refusée', 3, {'t': '3'}, 'incorrect', ['0']),
]

N1 = modele(
    'Les relations entre m², dm² et cm²',
    'Le cm², le dm² et le m² comme aires de carrés ; 1 m² = 10 dm × 10 dm = 100 dm² ; '
    '1 cm² = 1/100 dm² = 0,01 dm² ; une centaine, un centième ; pièges : 10 au lieu de 100, '
    'un côté écrit en unité d\'aire',
    2, 20, [N1_A, N1_B, N1_C, N1_D], SPECS_N1, CONVERSIONS, {'constraints': {'form': 'off'}})


# =============================================================================================
# N3 — 6-201 (Q1) : aire en cm² d'un rectangle sur un quadrillage de 1 cm.
# =============================================================================================

QUADRILLAGE = 'Chaque carreau du quadrillage est un carré de $1$ cm de côté.'


def rectangle_grille(L, l, desc):
    return bloc(
        'figure',
        'fenetre: 0 ; {{eval:' + L + '+2}} ; 0 ; {{eval:' + l + '+2}}',
        'grille: 1',
        'description: ' + desc,
        '---',
        'A = point(1, 1, visible=faux)',
        'B = point({{eval:' + L + '+1}}, 1, visible=faux)',
        'C = point({{eval:' + L + '+1}}, {{eval:' + l + '+1}}, visible=faux)',
        'D = point(1, {{eval:' + l + '+1}}, visible=faux)',
        'polygone(A, B, C, D, couleur="noir", epaisseur=2, remplissage="bleu", opacite_fond=0.35)',
    )


MSG_PERIM = 'Ça, c\'est le périmètre (le tour) ; l\'aire compte les carreaux à l\'intérieur.'
MSG_UNITE_CM = 'Une aire s\'écrit en $\\unit{cm^2}$, pas en $\\unit{cm}$.'
MSG_SOMME = 'On ne compte pas les carreaux d\'un côté plus ceux de l\'autre : il y a $' \
            '{{l}}$ rangées de ${{L}}$ carreaux.'

N3_A = variation(
    QUADRILLAGE + ' Quelle est l\'aire du rectangle colorié ?\n\n'
    + rectangle_grille('L', 'l', 'Un rectangle colorié de {{L}} carreaux sur {{l}} carreaux.')
    + '\n\nAire : $?$',
    [var('L', '3..9'), var('l', '2..6')],
    [case('{{eval:L*l}}' + u('cm^2'), [
        erreur('{{eval:2*(L+l)}}' + u('cm'), MSG_PERIM, 'Périmètre'),
        erreur('{{eval:L*l}}' + u('cm'), MSG_UNITE_CM, 'Aire en cm'),
        erreur('{{eval:L+l}}' + u('cm^2'), MSG_SOMME, 'Somme des côtés'),
    ], unite=True)],
    [
        'Le rectangle a ${{l}}$ rangées de ${{L}}$ carreaux, chacun de $1~\\unit{cm^2}$.',
        '${{L}} \\times {{l}} = {{eval:L*l}}$ : l\'aire est de $'
        + couleur('{{eval:L*l}}~\\unit{cm^2}') + '$.',
    ],
    'Un carreau de $1$ cm de côté a une aire de $1~\\unit{cm^2}$. Combien de rangées, et combien '
    'de carreaux par rangée ?',
    ['L>l'],
)

N3_B = variation(
    QUADRILLAGE + ' Quelle est l\'aire du carré colorié ?\n\n'
    + rectangle_grille('c', 'c', 'Un carré colorié de {{c}} carreaux de côté.')
    + '\n\nAire : $?$',
    [var('c', '2..6')],
    [case('{{eval:c*c}}' + u('cm^2'), [
        erreur('{{eval:4*c}}' + u('cm'), MSG_PERIM, 'Périmètre'),
        erreur('{{eval:c*c}}' + u('cm'), MSG_UNITE_CM, 'Aire en cm'),
        erreur('{{eval:2*c}}' + u('cm^2'), 'Il y a ${{c}}$ rangées de ${{c}}$ carreaux : '
               '$c \\times c$, pas $2 \\times c$.', 'Double du côté'),
    ], unite=True)],
    [
        'Le carré a ${{c}}$ rangées de ${{c}}$ carreaux.',
        '${{c}} \\times {{c}} = {{eval:c*c}}$ : l\'aire est de $'
        + couleur('{{eval:c*c}}~\\unit{cm^2}') + '$.',
    ],
    'Compte les carreaux d\'une rangée, puis le nombre de rangées.',
)

# (c) un côté demi-entier : L = k + 0,5 cm (k de 3 à 7), l = 2 ou 4 (aire entière).
N3_C = variation(
    QUADRILLAGE + ' Quelle est l\'aire du rectangle colorié ?\n\n'
    + bloc(
        'figure',
        'fenetre: 0 ; {{eval:k+3}} ; 0 ; {{eval:l+2}}',
        'grille: 1',
        'description: Un rectangle colorié de {{k}} carreaux et demi sur {{l}} carreaux.',
        '---',
        'A = point(1, 1, visible=faux)',
        'B = point({{eval:k+1.5}}, 1, visible=faux)',
        'C = point({{eval:k+1.5}}, {{eval:l+1}}, visible=faux)',
        'D = point(1, {{eval:l+1}}, visible=faux)',
        'polygone(A, B, C, D, couleur="noir", epaisseur=2, remplissage="bleu", opacite_fond=0.35)',
    )
    + '\n\nAire : $?$',
    [var('k', '3..7'), var('m', '1..2'), var('l', 'eval:2*m')],
    [case('{{eval:(2*k+1)*m}}' + u('cm^2'), [
        erreur('{{eval:k*l}}' + u('cm^2'), 'Les demi-carreaux comptent aussi : deux demi-carreaux '
               'font un carreau.', 'Demi-carreaux oubliés'),
        erreur('{{eval:(k+1)*l}}' + u('cm^2'), 'La dernière colonne n\'a que des demi-carreaux : '
               'elle ne compte pas comme une colonne entière.', 'Demi-carreaux comptés entiers'),
        erreur('{{eval:(2*k+1)*m}}' + u('cm'), MSG_UNITE_CM, 'Aire en cm'),
    ], unite=True)],
    [
        'Le rectangle mesure ${{k}}{,}5~\\unit{cm}$ sur ${{l}}~\\unit{cm}$.',
        '${{k}}{,}5 \\times {{l}} = {{eval:(2*k+1)*m}}$ : l\'aire est de $'
        + couleur('{{eval:(2*k+1)*m}}~\\unit{cm^2}') + '$.',
        'En comptant : ${{l}}$ rangées de ${{k}}$ carreaux et un demi-carreau.',
    ],
    'Deux demi-carreaux font un carreau entier.',
)

V_N3A = {'L': '5', 'l': '3'}
V_N3C = {'k': '4', 'm': '1', 'l': '2'}
SPECS_N3 = [
    spec('5 × 3 = 15 cm²', 0, V_N3A, 'correct', ['15' + u('cm^2')]),
    spec('Périmètre 16 cm', 0, V_N3A, 'incorrect', ['16' + u('cm')], MSG_PERIM),
    spec('15 cm', 0, V_N3A, 'incorrect', ['15' + u('cm')], MSG_UNITE_CM),
    spec('5 + 3 = 8 cm²', 0, V_N3A, 'incorrect', ['8' + u('cm^2')],
         'On ne compte pas les carreaux d\'un côté plus ceux de l\'autre : il y a $3$ rangées de '
         '$5$ carreaux.'),
    spec('Carré de 4 : 16 cm²', 1, {'c': '4'}, 'correct', ['16' + u('cm^2')]),
    spec('Carré de 3 : 6 cm²', 1, {'c': '3'}, 'incorrect', ['6' + u('cm^2')],
         'Il y a $3$ rangées de $3$ carreaux : $c \\times c$, pas $2 \\times c$.'),
    spec('Carré de 3 : périmètre 12 cm', 1, {'c': '3'}, 'incorrect', ['12' + u('cm')], MSG_PERIM),
    spec('4,5 × 2 = 9 cm²', 2, V_N3C, 'correct', ['9' + u('cm^2')]),
    spec('Demi-carreaux oubliés : 8 cm²', 2, V_N3C, 'incorrect', ['8' + u('cm^2')],
         'Les demi-carreaux comptent aussi : deux demi-carreaux font un carreau.'),
    spec('Demi-carreaux comptés entiers : 10 cm²', 2, V_N3C, 'incorrect', ['10' + u('cm^2')],
         'La dernière colonne n\'a que des demi-carreaux : elle ne compte pas comme une colonne '
         'entière.'),
    spec('5,5 × 4 = 22 cm²', 2, {'k': '5', 'm': '2', 'l': '4'}, 'correct', ['22' + u('cm^2')]),
]

N3 = modele(
    'Aire en cm² sur un quadrillage',
    'Aire d\'un rectangle ou d\'un carré dessiné sur un quadrillage de carreaux de 1 cm, en cm², '
    'avec un côté demi-entier ; pièges : le périmètre, l\'aire en cm, la somme des côtés',
    3, 30, [N3_A, N3_B, N3_C], SPECS_N3, {'noeud': RECT, 'point': '6-201'})


# =============================================================================================
# N4 — CM2-071 (Q2) : comparer des aires sans mesurer. Modèle de CM2 et de 6e.
# Rectangle de référence 6 × 4 en tirets, superposé à une figure colorée.
# Réponses : 0 = le rectangle, 1 = la figure colorée, 2 = la même aire.
# =============================================================================================

CHOIX_N4 = bloc('choix', 'melanger: non', '- Le rectangle en pointillés a la plus grande aire.',
                '- La figure colorée a la plus grande aire.', '- Ils ont la même aire.')


def figure_n4(desc, lignes, fen='-1.5 ; 7.5 ; -2 ; 6.5'):
    return bloc(
        'figure', 'fenetre: ' + fen, 'description: ' + desc, '---',
        *lignes,
        'R1 = point(0, 0, visible=faux)', 'R2 = point(6, 0, visible=faux)',
        'R3 = point(6, 4, visible=faux)', 'R4 = point(0, 4, visible=faux)',
        'polygone(R1, R2, R3, R4, couleur="noir", trait="tirets", epaisseur=2)',
    )


def poly(nom, pts, couleur_='orange'):
    lignes = [f'{nom}{i + 1} = point({x}, {y}, visible=faux)' for i, (x, y) in enumerate(pts)]
    noms = ', '.join(f'{nom}{i + 1}' for i in range(len(pts)))
    lignes.append(f'polygone({noms}, couleur="{couleur_}", epaisseur=2, remplissage="{couleur_}", '
                  'opacite_fond=0.35)')
    return lignes


ENONCE_N4 = ('Le rectangle en pointillés et la figure colorée sont posés l\'un sur l\'autre. '
             'Sans mesurer, lequel a la plus grande aire ?\n\n')

# (a) une partie ajoutée ou retirée. t = 0 : triangle ajouté en haut ; 1 : triangle retiré en haut ;
# 2 : demi-disque ajouté en haut ; 3 : triangle retiré à droite. Base du triangle : 2, en x = p.
# Demi-disque de rayon 1 posé sur le haut du rectangle, centré en x = p + 1 (le bloc figure n'a pas
# de secteur : un polygone de 9 points sur l'arc, parcouru de droite à gauche).
DEMI_DISQUE = [('{{eval:p+1+' + f'{math.cos(math.pi * i / 8):.3f}' + '}}',
                '{{eval:4+' + f'{math.sin(math.pi * i / 8):.3f}' + '}}') for i in range(9)]

FIG_A = {
    0: poly('F', [(0, 0), (6, 0), (6, 4), ('{{eval:p+2}}', 4), ('{{eval:p+1}}', '{{eval:4+k}}'),
                  ('{{p}}', 4), (0, 4)]),
    1: poly('F', [(0, 0), (6, 0), (6, 4), ('{{eval:p+2}}', 4), ('{{eval:p+1}}', '{{eval:4-k}}'),
                  ('{{p}}', 4), (0, 4)]),
    2: poly('F', [(0, 0), (6, 0), (6, 4)] + DEMI_DISQUE + [(0, 4)]),
    3: poly('F', [(0, 0), (6, 0), (6, 1), ('{{eval:6-k}}', 2), (6, 3), (6, 4), (0, 4)]),
}


def selon_lignes(v, figures):
    """Une figure par valeur de v : même découpage que `selon`, sur des blocs de lignes."""
    return [selon(v, ['\n'.join(figures[i]) for i in sorted(figures)])]


N4_A = variation(
    ENONCE_N4 + figure_n4('Un rectangle en pointillés et une figure colorée posée dessus, avec une '
                          'partie en plus ou en moins.', selon_lignes('t', FIG_A))
    + '\n\n' + CHOIX_N4,
    [var('t', '0..3'), var('p', '1..3'), var('k', '1..2')],
    [case(selon('t', ['1', '0', '1', '0']))],
    [
        selon('t', [
            'La figure colorée, c\'est le rectangle **plus** un triangle qui dépasse en haut.',
            'La figure colorée, c\'est le rectangle **moins** un triangle découpé en haut.',
            'La figure colorée, c\'est le rectangle **plus** un demi-disque qui dépasse en haut.',
            'La figure colorée, c\'est le rectangle **moins** un triangle découpé à droite.',
        ]),
        selon('t', ['$' + couleur('\\text{La figure colorée}') + '$ a la plus grande aire.',
                    '$' + couleur('\\text{Le rectangle}') + '$ a la plus grande aire.',
                    '$' + couleur('\\text{La figure colorée}') + '$ a la plus grande aire.',
                    '$' + couleur('\\text{Le rectangle}') + '$ a la plus grande aire.']),
    ],
    'Regarde ce qui dépasse du rectangle, et ce qui manque à l\'intérieur.',
)

# (b) une partie découpée et recollée ailleurs : même aire. s = 0 : triangle du haut recollé en bas ;
# s = 1 : triangle de gauche recollé à droite.
FIG_B = {
    0: poly('F', [(0, 0), ('{{q}}', 0), ('{{eval:q+1}}', '{{eval:-k}}'), ('{{eval:q+2}}', 0), (6, 0),
                  (6, 4), ('{{eval:p+2}}', 4), ('{{eval:p+1}}', '{{eval:4-k}}'), ('{{p}}', 4),
                  (0, 4)]),
    1: poly('F', [(0, 0), (6, 0), (6, 1), ('{{eval:6+k}}', 2), (6, 3), (6, 4), (0, 4), (0, 3),
                  ('{{k}}', 2), (0, 1)]),
}
N4_B = variation(
    ENONCE_N4 + figure_n4('Un rectangle en pointillés et une figure colorée posée dessus : un '
                          'triangle découpé d\'un côté dépasse de l\'autre.', selon_lignes('s', FIG_B))
    + '\n\n' + CHOIX_N4,
    [var('s', '0..1'), var('p', '1..3'), var('q', '1..3'), var('k', '1..2')],
    [case('2')],
    [
        selon('s', ['On a découpé un triangle en haut du rectangle et on l\'a recollé en bas.',
                    'On a découpé un triangle à gauche du rectangle et on l\'a recollé à droite.']),
        'La partie a seulement changé de place : rien n\'a été ajouté, rien n\'a été enlevé.',
        '$' + couleur('\\text{Ils ont la même aire}') + '$, même si leurs tours sont différents.',
    ],
    'Ce qui manque d\'un côté se retrouve-t-il de l\'autre ?',
)

# (c) s = 0 : quadrilatère inscrit (un sommet sur chaque côté) ; s = 1 : rectangle inscrit dans un
# hexagone.
FIG_C = {
    0: poly('F', [('{{a}}', 0), (6, '{{b}}'), ('{{eval:6-a}}', 4), (0, '{{eval:4-b}}')]),
    1: poly('F', [(-1, '{{eval:-0.5*b}}'), (3, '{{eval:-1-0.5*b}}'), (7, '{{eval:-0.5*b}}'),
                  (7, '{{eval:4+0.5*b}}'), (3, '{{eval:5+0.5*b}}'), (-1, '{{eval:4+0.5*b}}')]),
}
N4_C = variation(
    ENONCE_N4 + figure_n4('Un rectangle en pointillés et une figure colorée : l\'une est '
                          'entièrement à l\'intérieur de l\'autre.', selon_lignes('s', FIG_C),
                          '-2 ; 8 ; -3 ; 7.5')
    + '\n\n' + CHOIX_N4,
    [var('s', '0..1'), var('a', '1..4'), var('b', '1..3')],
    [case(selon('s', ['0', '1']))],
    [
        selon('s', ['La figure colorée est tout entière à l\'intérieur du rectangle, et ne le '
                    'remplit pas.',
                    'Le rectangle est tout entier à l\'intérieur de la figure colorée, et ne la '
                    'remplit pas.']),
        selon('s', ['$' + couleur('\\text{Le rectangle}') + '$ a la plus grande aire.',
                    '$' + couleur('\\text{La figure colorée}') + '$ a la plus grande aire.']),
    ],
    'L\'une des deux figures est-elle tout entière à l\'intérieur de l\'autre ?',
)

SPECS_N4 = [
    spec('Triangle ajouté : la figure', 0, {'t': '0', 'p': '2', 'k': '1'}, 'correct', ['1']),
    spec('Triangle ajouté : la même aire refusée', 0, {'t': '0', 'p': '2', 'k': '1'}, 'incorrect',
         ['2']),
    spec('Triangle retiré : le rectangle', 0, {'t': '1', 'p': '2', 'k': '2'}, 'correct', ['0']),
    spec('Demi-disque ajouté : la figure', 0, {'t': '2', 'p': '1', 'k': '1'}, 'correct', ['1']),
    spec('Triangle retiré à droite : le rectangle', 0, {'t': '3', 'p': '1', 'k': '2'}, 'correct',
         ['0']),
    spec('Découpé et recollé : même aire', 1, {'s': '0', 'p': '1', 'q': '3', 'k': '1'}, 'correct',
         ['2']),
    spec('Découpé et recollé : la figure refusée', 1, {'s': '1', 'p': '1', 'q': '1', 'k': '2'},
         'incorrect', ['1']),
    spec('Quadrilatère inscrit : le rectangle', 2, {'s': '0', 'a': '2', 'b': '1'}, 'correct', ['0']),
    spec('Rectangle inscrit : la figure', 2, {'s': '1', 'a': '2', 'b': '2'}, 'correct', ['1']),
]

N4 = modele(
    'Comparer des aires sans mesurer',
    'Comparer l\'aire d\'un rectangle et d\'une figure posée dessus, sans quadrillage : partie '
    'ajoutée, retirée, ou découpée et recollée ailleurs (même aire), figure inscrite',
    3, 30, [N4_A, N4_B, N4_C], SPECS_N4, AIRES, grades=['CM2', '6'])


# =============================================================================================
# N5 — formules de l'aire du carré (6-151) et du rectangle (6-200).
# =============================================================================================

CHOIX_OPERATION = ['- la somme', '- le produit', '- la différence', '- le quotient']

# --- Carré ---
MSG_4C = 'Ça, c\'est le périmètre du carré (son tour) : $4 \\times c$.'
MSG_CPC = ('L\'aire n\'est pas une somme : $c + c = 2 \\times c$. C\'est le côté **multiplié** '
           'par le côté.')
MSG_2C = '$2 \\times c$, c\'est $c + c$ : l\'aire est le côté multiplié par lui-même.'
N5C_A = variation(
    'Un carré a des côtés de longueur $c$. Écris la formule de son aire $A$.\n\n$A = ?$',
    [],
    [case('c\\times c', [
        erreur('4\\times c', MSG_4C, 'Périmètre'),
        erreur('c+c', MSG_CPC, 'Somme (c + c ou 2 × c)'),
    ])],
    ['L\'aire d\'un carré est le produit de son côté par lui-même :',
     '$$A = ' + couleur('c \\times c') + '$$'],
    'Un carré, c\'est un rectangle dont la longueur et la largeur sont égales.',
)
N5C_B = variation(
    'Complète la phrase.\n\nL\'aire d\'un carré est égale à … de son côté par lui-même.\n\n'
    + bloc('choix', 'melanger: non', *CHOIX_OPERATION),
    [],
    [case('1')],
    ['L\'aire d\'un carré est égale au $' + couleur('\\text{produit}') + '$ de son côté par '
     'lui-même : $A = c \\times c$.'],
    'Pour un carré de $3$ cm de côté, on calcule $3 \\times 3$ : quelle opération est-ce ?',
)
N5C_C = variation(
    'L\'aire d\'un carré de côté $c$ est $A = c \\times c$.\n\nCalcule $A$ pour $c = {{c}}$ cm.'
    '\n\n$A = ?$',
    [var('c', '2..12')],
    [case('{{eval:c*c}}' + u('cm^2'), [
        erreur('{{eval:2*c}}' + u('cm^2'), MSG_2C, 'Double du côté'),
        erreur('{{eval:4*c}}' + u('cm'), MSG_4C, 'Périmètre'),
        erreur('{{eval:c*c}}' + u('cm'), MSG_UNITE_CM, 'Aire en cm'),
    ], unite=True)],
    ['On remplace $c$ par ${{c}}$ cm :',
     '$$A = {{c}}~\\unit{cm} \\times {{c}}~\\unit{cm} = ' + couleur('{{eval:c*c}}~\\unit{cm^2}')
     + '$$'],
    'Remplace la lettre $c$ par sa valeur dans la formule.',
)
SPECS_N5C = [
    spec('c × c', 0, {}, 'correct', ['c\\times c']),
    spec('c²', 0, {}, 'correct', ['c^2']),
    spec('4 × c', 0, {}, 'incorrect', ['4\\times c'], MSG_4C),
    spec('c + c', 0, {}, 'incorrect', ['c+c'], MSG_CPC),
    spec('2 × c', 0, {}, 'incorrect', ['2\\times c'], MSG_CPC),
    spec('Le produit', 1, {}, 'correct', ['1']),
    spec('La somme refusée', 1, {}, 'incorrect', ['0']),
    spec('c = 7 : 49 cm²', 2, {'c': '7'}, 'correct', ['49' + u('cm^2')]),
    spec('c = 7 : 14 cm²', 2, {'c': '7'}, 'incorrect', ['14' + u('cm^2')], MSG_2C),
    spec('c = 7 : 28 cm', 2, {'c': '7'}, 'incorrect', ['28' + u('cm')], MSG_4C),
    spec('c = 7 : 49 cm', 2, {'c': '7'}, 'incorrect', ['49' + u('cm')], MSG_UNITE_CM),
]
N5C = modele(
    'La formule de l\'aire du carré',
    'Écrire la formule A = c × c, la dire en mots (le produit du côté par lui-même), l\'utiliser '
    'pour une valeur de c ; pièges : 4 × c (le périmètre), c + c, 2 × c',
    3, 20, [N5C_A, N5C_B, N5C_C], SPECS_N5C, CARRE,
    {'constraints': {'products': 'off', 'form': 'off'}})

# --- Rectangle ---
MSG_LPL = 'L\'aire n\'est pas une somme : c\'est la longueur **multipliée** par la largeur.'
MSG_PERIM_R = 'Ça, c\'est le périmètre du rectangle (son tour).'
N5R_A = variation(
    'Un rectangle a pour longueur $L$ et pour largeur $l$. Écris la formule de son aire $A$.\n\n'
    '$A = ?$',
    [],
    [case('L\\times l', [
        erreur('L+l', MSG_LPL, 'Somme'),
        erreur('2\\times(L+l)', MSG_PERIM_R, 'Périmètre'),
        erreur('2\\times L\\times l', 'On multiplie la longueur par la largeur, une seule fois.',
               'Produit doublé'),
    ])],
    ['L\'aire d\'un rectangle est le produit de sa longueur par sa largeur :',
     '$$A = ' + couleur('L \\times l') + '$$'],
    'Pour un rectangle de $5$ cm sur $3$ cm, combien de carrés de $1$ cm de côté ? Quel calcul '
    'as-tu fait ?',
)
N5R_B = variation(
    'Complète la phrase.\n\nL\'aire d\'un rectangle est égale à … de sa longueur par sa largeur.'
    '\n\n' + bloc('choix', 'melanger: non', *CHOIX_OPERATION),
    [],
    [case('1')],
    ['L\'aire d\'un rectangle est égale au $' + couleur('\\text{produit}') + '$ de sa longueur '
     'par sa largeur : $A = L \\times l$.'],
    'Pour un rectangle de $5$ cm sur $3$ cm, on calcule $5 \\times 3$ : quelle opération est-ce ?',
)
N5R_C = variation(
    'L\'aire d\'un rectangle de longueur $L$ et de largeur $l$ est $A = L \\times l$.\n\n'
    'Calcule $A$ pour $L = {{L}}$ cm et $l = {{l}}$ cm.\n\n$A = ?$',
    [var('L', '4..12'), var('l', '2..9')],
    [case('{{eval:L*l}}' + u('cm^2'), [
        erreur('{{eval:L+l}}' + u('cm^2'), MSG_LPL, 'Somme'),
        erreur('{{eval:2*(L+l)}}' + u('cm'), MSG_PERIM_R, 'Périmètre'),
        erreur('{{eval:L*l}}' + u('cm'), MSG_UNITE_CM, 'Aire en cm'),
    ], unite=True)],
    ['On remplace $L$ par ${{L}}$ cm et $l$ par ${{l}}$ cm :',
     '$$A = {{L}}~\\unit{cm} \\times {{l}}~\\unit{cm} = ' + couleur('{{eval:L*l}}~\\unit{cm^2}')
     + '$$'],
    'Remplace chaque lettre par sa valeur dans la formule.',
    ['L>l'],
)
SPECS_N5R = [
    spec('L × l', 0, {}, 'correct', ['L\\times l']),
    spec('l × L', 0, {}, 'correct', ['l\\times L']),
    spec('L + l', 0, {}, 'incorrect', ['L+l'], MSG_LPL),
    spec('2 × (L + l)', 0, {}, 'incorrect', ['2\\times(L+l)'], MSG_PERIM_R),
    spec('2 × L × l', 0, {}, 'incorrect', ['2\\times L\\times l'],
         'On multiplie la longueur par la largeur, une seule fois.'),
    spec('Le produit', 1, {}, 'correct', ['1']),
    spec('La somme refusée', 1, {}, 'incorrect', ['0']),
    spec('8 × 3 = 24 cm²', 2, {'L': '8', 'l': '3'}, 'correct', ['24' + u('cm^2')]),
    spec('8 + 3 = 11 cm²', 2, {'L': '8', 'l': '3'}, 'incorrect', ['11' + u('cm^2')], MSG_LPL),
    spec('Périmètre 22 cm', 2, {'L': '8', 'l': '3'}, 'incorrect', ['22' + u('cm')], MSG_PERIM_R),
    spec('24 cm', 2, {'L': '8', 'l': '3'}, 'incorrect', ['24' + u('cm')], MSG_UNITE_CM),
]
N5R = modele(
    'La formule de l\'aire du rectangle',
    'Écrire la formule A = L × l, la dire en mots (le produit de la longueur par la largeur), '
    'l\'utiliser pour des valeurs de L et l ; pièges : L + l, le périmètre, le produit doublé',
    4, 20, [N5R_A, N5R_B, N5R_C], SPECS_N5R, {'noeud': RECT, 'point': '6-200'},
    {'constraints': {'products': 'off'}})


# =============================================================================================
# N6 — 6-201 : aire et périmètre d'un même rectangle.
# =============================================================================================

MSG_P_AIRE = 'Ça, c\'est l\'aire. Le périmètre est le tour : deux longueurs et deux largeurs.'
MSG_P_DEMI = 'Le tour compte deux longueurs **et** deux largeurs, pas une seule de chaque.'
MSG_A_PERIM = 'Ça, c\'est le périmètre. L\'aire est la longueur multipliée par la largeur.'
N6_A = variation(
    'Un rectangle mesure ${{L}}$ cm de longueur et ${{l}}$ cm de largeur.\n\nCalcule son périmètre '
    'et son aire.\n\nPérimètre : $?$\n\nAire : $?$',
    [var('L', '3..11'), var('l', '2..10')],
    [
        case('{{eval:2*(L+l)}}' + u('cm'), [
            erreur('{{eval:L*l}}' + u('cm'), MSG_P_AIRE, 'Aire au lieu du périmètre'),
            erreur('{{eval:L+l}}' + u('cm'), MSG_P_DEMI, 'Demi-périmètre'),
        ], unite=True),
        case('{{eval:L*l}}' + u('cm^2'), [
            erreur('{{eval:2*(L+l)}}' + u('cm^2'), MSG_A_PERIM, 'Périmètre au lieu de l\'aire'),
            erreur('{{eval:L*l}}' + u('cm'), MSG_UNITE_CM, 'Aire en cm'),
            erreur('{{eval:L+l}}' + u('cm^2'), 'L\'aire n\'est pas une somme : c\'est la longueur '
                   '**multipliée** par la largeur.', 'Somme'),
        ], unite=True),
    ],
    [
        '**Périmètre** (le tour) : $2 \\times ({{L}} + {{l}}) = '
        + couleur('{{eval:2*(L+l)}}~\\unit{cm}') + '$.',
        '**Aire** (la surface) : ${{L}} \\times {{l}} = ' + couleur('{{eval:L*l}}~\\unit{cm^2}')
        + '$.',
        'Le périmètre est une longueur (en cm), l\'aire une surface (en cm²).',
    ],
    'Le périmètre fait le tour de la figure ; l\'aire mesure ce qu\'il y a à l\'intérieur.',
    ['L>l'],
)
MSG_2C_N6 = '$2 \\times {{c}}$, c\'est ${{c}} + {{c}}$ : l\'aire est le côté multiplié par lui-même.'
N6_B = variation(
    'Un carré a des côtés de ${{c}}$ cm.\n\nCalcule son périmètre et son aire.\n\n'
    'Périmètre : $?$\n\nAire : $?$',
    [var('c', '2..8')],
    [
        case('{{eval:4*c}}' + u('cm'), [
            erreur('{{eval:c*c}}' + u('cm'), MSG_P_AIRE.replace('deux longueurs et deux largeurs',
                                                                 'quatre côtés'),
                   'Aire au lieu du périmètre'),
            erreur('{{eval:2*c}}' + u('cm'), 'Le carré a quatre côtés, pas deux.', 'Deux côtés'),
        ], unite=True),
        case('{{eval:c*c}}' + u('cm^2'), [
            erreur('{{eval:4*c}}' + u('cm^2'), 'Ça, c\'est le périmètre. L\'aire est le côté '
                   'multiplié par lui-même.', 'Périmètre au lieu de l\'aire'),
            erreur('{{eval:c*c}}' + u('cm'), MSG_UNITE_CM, 'Aire en cm'),
            erreur('{{eval:2*c}}' + u('cm^2'), MSG_2C_N6, 'Double du côté'),
        ], unite=True),
    ],
    [
        '**Périmètre** : $4 \\times {{c}} = ' + couleur('{{eval:4*c}}~\\unit{cm}') + '$.',
        '**Aire** : ${{c}} \\times {{c}} = ' + couleur('{{eval:c*c}}~\\unit{cm^2}') + '$.',
    ],
    'Le périmètre fait le tour des quatre côtés ; l\'aire multiplie le côté par lui-même.',
)

# (c) deux rectangles de même périmètre ; j choisit la paire, s l'ordre (A, B).
PAIRES = [(6, 2, 4, 4), (7, 1, 5, 3), (9, 3, 7, 5), (10, 2, 7, 5), (8, 4, 7, 5)]
N6_C = variation(
    'Le rectangle A mesure ${{La}}$ cm sur ${{la}}$ cm. Le rectangle B mesure ${{Lb}}$ cm sur '
    '${{lb}}$ cm.\n\nIls ont le même périmètre. Lequel a la plus grande aire ?\n\n'
    + bloc('choix', 'melanger: non', '- Le rectangle A.', '- Le rectangle B.',
           '- Ils ont la même aire.'),
    [var('j', '0..4'), var('s', '0..1'),
     var('L1', 'eval:' + sel('j', [p[0] for p in PAIRES])),
     var('l1', 'eval:' + sel('j', [p[1] for p in PAIRES])),
     var('L2', 'eval:' + sel('j', [p[2] for p in PAIRES])),
     var('l2', 'eval:' + sel('j', [p[3] for p in PAIRES])),
     var('La', 'eval:(1-s)*L1+s*L2'), var('la', 'eval:(1-s)*l1+s*l2'),
     var('Lb', 'eval:s*L1+(1-s)*L2'), var('lb', 'eval:s*l1+(1-s)*l2')],
    [case('{{eval:1-s}}')],
    [
        'Périmètres : $2 \\times ({{La}} + {{la}}) = {{eval:2*(La+la)}}$ cm et $2 \\times ({{Lb}} + '
        '{{lb}}) = {{eval:2*(Lb+lb)}}$ cm : ils sont égaux.',
        'Aires : ${{La}} \\times {{la}} = {{eval:La*la}}~\\unit{cm^2}$ et ${{Lb}} \\times {{lb}} = '
        '{{eval:Lb*lb}}~\\unit{cm^2}$.',
        '$' + couleur('\\text{Le rectangle ' + selon('s', ['B', 'A']) + '}')
        + '$ a la plus grande aire : un même périmètre ne donne pas la même aire.',
    ],
    'Calcule l\'aire de chacun.',
)

SPECS_N6 = [
    spec('7 × 4 : 22 cm et 28 cm²', 0, {'L': '7', 'l': '4'}, 'correct',
         ['22' + u('cm'), '28' + u('cm^2')]),
    spec('Périmètre : 28 cm (l\'aire)', 0, {'L': '7', 'l': '4'}, 'incorrect',
         ['28' + u('cm'), '28' + u('cm^2')], MSG_P_AIRE),
    spec('Périmètre : 11 cm', 0, {'L': '7', 'l': '4'}, 'incorrect',
         ['11' + u('cm'), '28' + u('cm^2')], MSG_P_DEMI),
    spec('Aire : 22 cm²', 0, {'L': '7', 'l': '4'}, 'incorrect',
         ['22' + u('cm'), '22' + u('cm^2')], MSG_A_PERIM),
    spec('Aire : 28 cm', 0, {'L': '7', 'l': '4'}, 'incorrect',
         ['22' + u('cm'), '28' + u('cm')], MSG_UNITE_CM),
    spec('Aire : 11 cm²', 0, {'L': '7', 'l': '4'}, 'incorrect',
         ['22' + u('cm'), '11' + u('cm^2')],
         'L\'aire n\'est pas une somme : c\'est la longueur **multipliée** par la largeur.'),
    spec('Carré de 5 : 20 cm et 25 cm²', 1, {'c': '5'}, 'correct',
         ['20' + u('cm'), '25' + u('cm^2')]),
    spec('Carré de 5 : périmètre 10 cm', 1, {'c': '5'}, 'incorrect',
         ['10' + u('cm'), '25' + u('cm^2')], 'Le carré a quatre côtés, pas deux.'),
    spec('Carré de 5 : aire 20 cm²', 1, {'c': '5'}, 'incorrect',
         ['20' + u('cm'), '20' + u('cm^2')],
         'Ça, c\'est le périmètre. L\'aire est le côté multiplié par lui-même.'),
    spec('6 × 2 et 4 × 4 : B', 2, {'j': '0', 's': '0', 'L1': '6', 'l1': '2', 'L2': '4', 'l2': '4',
                                   'La': '6', 'la': '2', 'Lb': '4', 'lb': '4'}, 'correct', ['1']),
    spec('6 × 2 et 4 × 4 : même aire refusée', 2,
         {'j': '0', 's': '0', 'L1': '6', 'l1': '2', 'L2': '4', 'l2': '4', 'La': '6', 'la': '2',
          'Lb': '4', 'lb': '4'}, 'incorrect', ['2']),
    spec('Ordre inversé : A', 2, {'j': '1', 's': '1', 'L1': '7', 'l1': '1', 'L2': '5', 'l2': '3',
                                  'La': '5', 'la': '3', 'Lb': '7', 'lb': '1'}, 'correct', ['0']),
]

N6 = modele(
    'Aire et périmètre d\'un rectangle',
    'Calculer le périmètre et l\'aire d\'un même rectangle ou carré ; deux rectangles de même '
    'périmètre n\'ont pas la même aire ; pièges : aire et périmètre échangés, aire en cm, '
    'demi-périmètre',
    5, 45, [N6_A, N6_B, N6_C], SPECS_N6, {'noeud': RECT, 'point': '6-201'})


# =============================================================================================
# N8 — 6-200 : rectangles accolés (retrouver une dimension par division). Figures pas à l'échelle.
# =============================================================================================


def rect(nom, x0, y0, x1, y1, couleur_='bleu'):
    return [f'{nom}1 = point({x0}, {y0}, visible=faux)', f'{nom}2 = point({x1}, {y0}, visible=faux)',
            f'{nom}3 = point({x1}, {y1}, visible=faux)', f'{nom}4 = point({x0}, {y1}, visible=faux)',
            f'polygone({nom}1, {nom}2, {nom}3, {nom}4, couleur="noir", epaisseur=2, '
            f'remplissage="{couleur_}", opacite_fond=0.2)']


def texte(x, y, contenu):
    return f'texte({x}, {y}, "{contenu}")'


PAS_ECHELLE = 'La figure n\'est pas à l\'échelle.'
MSG_SOUSTR = ('On ne soustrait pas : l\'aire est un produit. On cherche le nombre qui, multiplié '
              'par le côté connu, donne l\'aire.')
MSG_AIRE_LONG = 'C\'est l\'aire du rectangle, pas l\'un de ses côtés.'

# (a) deux rectangles côte à côte, de même hauteur h.
N8_A = variation(
    'Deux rectangles sont accolés : ils ont la même hauteur. ' + PAS_ECHELLE + '\n\n'
    + bloc('figure', 'fenetre: -1.5 ; 11 ; -1.5 ; 6', 'description: Deux rectangles accolés. Le '
           'premier a une largeur de {{w1}} cm et une aire de {{eval:w1*h}} cm carrés ; le second '
           'a une aire de {{eval:w2*h}} cm carrés et une largeur inconnue.', '---',
           *rect('R', 0, 0, 4, 4), *rect('S', 4, 0, 9.5, 4, 'orange'),
           texte(2, 2, '{{eval:w1*h}} cm²'), texte(6.75, 2, '{{eval:w2*h}} cm²'),
           texte(2, -0.6, '{{w1}} cm'), texte(6.75, -0.6, '?'))
    + '\n\nLargeur du second rectangle : $?$',
    [var('h', '2..9'), var('w1', '2..9'), var('w2', '2..9')],
    [case('{{w2}}' + u('cm'), [
        erreur('{{eval:w2*h-h}}' + u('cm'), MSG_SOUSTR, 'Soustraction'),
        erreur('{{eval:w2*h}}' + u('cm'), MSG_AIRE_LONG, 'Aire recopiée'),
        erreur('{{h}}' + u('cm'), 'Ça, c\'est la hauteur commune ; on demande la largeur du second '
               'rectangle.', 'Hauteur commune'),
    ], unite=True)],
    [
        '**Hauteur commune** : ${{eval:w1*h}} \\div {{w1}} = {{h}}$ cm.',
        '**Largeur du second** : ${{eval:w2*h}} \\div {{h}} = ' + couleur('{{w2}}~\\unit{cm}') + '$.',
    ],
    'Le premier rectangle te donne la hauteur commune : quel nombre multiplié par ${{w1}}$ donne '
    '${{eval:w1*h}}$ ?',
    ['w1!=w2', 'w1!=h', 'w2!=h'],
)

# (b) trois rectangles en L : R1 (w1 × h1) en bas, R2 (w1 × h2) au-dessus, R3 (w3 × h2) à droite de R2.
N8_B = variation(
    'Trois rectangles sont accolés. ' + PAS_ECHELLE + '\n\n'
    + bloc('figure', 'fenetre: -2 ; 10.5 ; -1 ; 8.5', 'description: Trois rectangles accolés en '
           'forme de L. En bas à gauche, un rectangle de hauteur {{h1}} cm et d\'aire '
           '{{eval:w1*h1}} cm carrés ; au-dessus, un rectangle d\'aire {{eval:w1*h2}} cm carrés ; à '
           'sa droite, un rectangle d\'aire {{eval:w3*h2}} cm carrés dont la largeur est '
           'inconnue.', '---',
           *rect('R', 0, 0, 4, 3), *rect('S', 0, 3, 4, 7), *rect('T', 4, 3, 9, 7, 'orange'),
           texte(2, 1.5, '{{eval:w1*h1}} cm²'), texte(2, 5, '{{eval:w1*h2}} cm²'),
           texte(6.5, 5, '{{eval:w3*h2}} cm²'), texte(-1, 1.5, '{{h1}} cm'),
           texte(6.5, 7.6, '?'))
    + '\n\nLargeur du rectangle orange : $?$',
    [var('h1', '2..9'), var('w1', '2..9'), var('h2', '2..9'), var('w3', '2..9')],
    [case('{{w3}}' + u('cm'), [
        erreur('{{h2}}' + u('cm'), 'Ça, c\'est la hauteur du rectangle orange ; on demande sa '
               'largeur.', 'Hauteur au lieu de la largeur'),
        erreur('{{eval:w3*h2}}' + u('cm'), MSG_AIRE_LONG, 'Aire recopiée'),
        erreur('{{eval:w3*h2-h2}}' + u('cm'), MSG_SOUSTR, 'Soustraction'),
    ], unite=True)],
    [
        '**En bas** : largeur ${{eval:w1*h1}} \\div {{h1}} = {{w1}}$ cm.',
        '**Au-dessus**, même largeur : hauteur ${{eval:w1*h2}} \\div {{w1}} = {{h2}}$ cm.',
        '**Le rectangle orange**, même hauteur : largeur ${{eval:w3*h2}} \\div {{h2}} = '
        + couleur('{{w3}}~\\unit{cm}') + '$.',
    ],
    'Pars du rectangle du bas, dont tu connais un côté : chaque rectangle donne un côté au suivant.',
    ['w1!=h1', 'w1!=h2', 'w3!=h2', 'h1!=h2'],
)

# (c) grille 2 × 2 : colonnes a, b ; lignes c (bas), d (haut). On connaît a, a × c, a × d, b × c.
N8_C = variation(
    'Quatre rectangles forment un grand rectangle. ' + PAS_ECHELLE + '\n\n'
    + bloc('figure', 'fenetre: -1.5 ; 10.5 ; -1.5 ; 8', 'description: Un grand rectangle partagé '
           'en quatre. En bas à gauche, largeur {{a}} cm et aire {{eval:a*c}} cm carrés ; en haut à '
           'gauche, aire {{eval:a*d}} cm carrés ; en bas à droite, aire {{eval:b*c}} cm carrés ; '
           'en haut à droite, aire inconnue.', '---',
           *rect('R', 0, 0, 4, 3), *rect('S', 0, 3, 4, 7), *rect('T', 4, 0, 9, 3),
           *rect('U', 4, 3, 9, 7, 'orange'),
           texte(2, 1.5, '{{eval:a*c}} cm²'), texte(2, 5, '{{eval:a*d}} cm²'),
           texte(6.5, 1.5, '{{eval:b*c}} cm²'), texte(6.5, 5, '?'), texte(2, -0.6, '{{a}} cm'))
    + '\n\nAire du rectangle orange : $?$',
    [var('a', '2..9'), var('b', '2..9'), var('c', '2..9'), var('d', '2..9')],
    [case('{{eval:b*d}}' + u('cm^2'), [
        erreur('{{eval:b*d}}' + u('cm'), MSG_UNITE_CM, 'Aire en cm'),
        erreur('{{eval:b+d}}' + u('cm^2'), 'L\'aire n\'est pas une somme : multiplie la largeur '
               'par la hauteur.', 'Somme des côtés'),
    ], unite=True)],
    [
        '**En bas à gauche** : hauteur ${{eval:a*c}} \\div {{a}} = {{c}}$ cm.',
        '**En haut à gauche** : hauteur ${{eval:a*d}} \\div {{a}} = {{d}}$ cm.',
        '**En bas à droite** : largeur ${{eval:b*c}} \\div {{c}} = {{b}}$ cm.',
        '**Le rectangle orange** : ${{b}} \\times {{d}} = ' + couleur('{{eval:b*d}}~\\unit{cm^2}')
        + '$.',
    ],
    'Il te faut la largeur et la hauteur du rectangle orange : chacune se lit sur un voisin.',
    ['a!=b', 'c!=d', 'a!=c', 'b!=d'],
)

V_N8A = {'h': '6', 'w1': '4', 'w2': '7'}
V_N8B = {'h1': '3', 'w1': '5', 'h2': '4', 'w3': '6'}
V_N8C = {'a': '3', 'b': '5', 'c': '4', 'd': '7'}
SPECS_N8 = [
    spec('24 cm² ÷ 4 = 6 ; 42 ÷ 6 = 7 cm', 0, V_N8A, 'correct', ['7' + u('cm')]),
    spec('Soustraction 42 − 6 = 36', 0, V_N8A, 'incorrect', ['36' + u('cm')], MSG_SOUSTR),
    spec('Aire recopiée 42 cm', 0, V_N8A, 'incorrect', ['42' + u('cm')], MSG_AIRE_LONG),
    spec('Hauteur commune 6 cm', 0, V_N8A, 'incorrect', ['6' + u('cm')],
         'Ça, c\'est la hauteur commune ; on demande la largeur du second rectangle.'),
    spec('15 ÷ 3 = 5 ; 20 ÷ 5 = 4 ; 24 ÷ 4 = 6 cm', 1, V_N8B, 'correct', ['6' + u('cm')]),
    spec('Hauteur 4 cm', 1, V_N8B, 'incorrect', ['4' + u('cm')],
         'Ça, c\'est la hauteur du rectangle orange ; on demande sa largeur.'),
    spec('Aire recopiée 24 cm', 1, V_N8B, 'incorrect', ['24' + u('cm')], MSG_AIRE_LONG),
    spec('5 × 7 = 35 cm²', 2, V_N8C, 'correct', ['35' + u('cm^2')]),
    spec('35 cm', 2, V_N8C, 'incorrect', ['35' + u('cm')], MSG_UNITE_CM),
    spec('5 + 7 = 12 cm²', 2, V_N8C, 'incorrect', ['12' + u('cm^2')],
         'L\'aire n\'est pas une somme : multiplie la largeur par la hauteur.'),
]

N8 = modele(
    'Rectangles accolés',
    'Retrouver un côté ou une aire dans des rectangles accolés dont on connaît les aires, de '
    'proche en proche, par divisions ; pièges : soustraire, recopier l\'aire, confondre les côtés',
    6, 60, [N8_A, N8_B, N8_C], SPECS_N8, {'noeud': RECT, 'point': '6-200'})


ecrire('n1-relations-unites-aire', N1)
ecrire('n3-aire-sur-quadrillage', N3)
ecrire('n4-comparer-aires-sans-mesurer', N4)
ecrire('n5-formule-aire-carre', N5C)
ecrire('n5-formule-aire-rectangle', N5R)
ecrire('n6-aire-et-perimetre-rectangle', N6)
ecrire('n8-rectangles-accoles', N8)
print('7 modèles écrits dans', DOSSIER)
