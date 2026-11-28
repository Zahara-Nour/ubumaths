"""Ajoute les variations validées à trois modèles publiés de 6e, exportés de prod dans
scripts/questions/idees-6e-aires-publies/ (chantier idees-6e-aires).

Phase 0 du 2026-11-27 (« je te suis », journal docs/archive/wip/idees-6e-aires/idees-6e-aires-progress.md) :
- N2 → 82748db8 « Convertir dans une autre unité » (6-150) : il ne tirait que a de 1 à 9 ; on
  ajoute 10 à 99, 101 à 999, les décimaux (3,7 dm², 0,07 m², 37,5 dm²) ;
- N7 → fdd849f5 « Calcul de l'aire d'un rectangle » (6-201) : rectangle dessiné et coté, et largeur
  décimale ; 01e205ed « Calcul de l'aire d'un carré » (6-152) : carré dessiné et coté, et côté
  décimal.

Les variations s'ajoutent À LA FIN (les réponses des élèves gardent l'indice de leur variation) ;
la migration de contenu est générée par scripts/questions/migration-contenu.ts. Seuls `variations`
et `testSpecs` changent : ni titre, ni niveaux, ni options, ni description, ni `shared`.

Pièges des modèles d'origine :
- 82748db8 partage `a` (1..9) : les variations ajoutées n'emploient pas ce nom ;
- fdd849f5 partage la condition `a>b` : ses variations ajoutées gardent `a` (longueur) et `b`
  (largeur, ou sa partie entière) avec a > b.

Le script repart du contenu de prod (variations et specs d'origine, comptées dans ORIGINE) : le
relancer réécrit l'ajout sans le doubler.

Usage : python3 docs/wip/questions/idees-6e-aires-publies.py scripts/questions/idees-6e-aires-publies
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'

# id court → (variations, specs) d'origine en prod (export du 2026-11-27)
ORIGINE = {'82748db8': (4, 5), 'fdd849f5': (7, 9), '01e205ed': (7, 9)}


def spec(desc, vi, variables_, status, answers, message=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = message
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': expected, 'answers': answers}


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
    if k == len(textes) - 1:
        return textes[k]
    return '{{if:' + v + '==' + str(k) + '|' + textes[k] + '|' + selon(v, textes, k + 1) + '}}'


def u(texte):
    return '\\unit{' + texte + '}'


def bloc(nom, *lignes):
    return '```' + nom + '\n' + '\n'.join(lignes) + '\n```'


# =============================================================================================
# N2 — 82748db8 : conversions avec des nombres variés. g choisit le couple d'unités.
# =============================================================================================

def msg_x10(depart, arrivee):
    return ('Entre $\\unit{' + depart + '}$ et $\\unit{' + arrivee + '}$, on passe par $100$, '
            'pas par $10$.')


MSG_SENS = 'Tu as converti dans le mauvais sens : l\'unité demandée est plus grande, le nombre ' \
           'doit diminuer.'
MSG_SENS_INV = 'Tu as converti dans le mauvais sens : l\'unité demandée est plus petite, le ' \
               'nombre doit augmenter.'
DIV = ['dm^2', 'cm^2']   # unité de départ quand on divise par 100
DIV_A = ['m^2', 'dm^2']  # unité d'arrivée
MUL = ['dm^2', 'm^2']    # unité de départ quand on multiplie par 100
MUL_A = ['cm^2', 'dm^2']


def etapes_div(n):
    return [
        '$1~' + u(selon('g', DIV_A)) + ' = 100~' + u(selon('g', DIV)) + '$ : pour passer en $'
        + u(selon('g', DIV_A)) + '$, on divise par $100$.',
        '$' + n + ' \\div 100 = ' + couleur('{{solution}}') + '$',
    ]


def etapes_mul(n):
    return [
        '$1~' + u(selon('g', MUL)) + ' = 100~' + u(selon('g', MUL_A)) + '$ : pour passer en $'
        + u(selon('g', MUL_A)) + '$, on multiplie par $100$.',
        '$' + n + ' \\times 100 = ' + couleur('{{solution}}') + '$',
    ]


# (e) n de 11 à 99 (dizaines comprises) : dm² → m², cm² → dm².
N2_E = variation(
    'Convertis dans l\'unité demandée.\n\n$${{n}}~' + u(selon('g', DIV)) + ' = ?~'
    + u(selon('g', DIV_A)) + '$$',
    [var('g', '0..1'), var('n', '11..99')],
    [case('{{eval:n/100;d}}', [
        erreur('{{eval:n/10;d}}', msg_x10(selon('g', DIV), selon('g', DIV_A)), 'Division par 10'),
        erreur('{{eval:n*100}}', MSG_SENS, 'Sens inversé'),
        erreur('{{eval:n/1000;d}}', 'Tu as divisé par $1\\,000$ : entre deux unités d\'aire '
               'voisines, on divise par $100$.', 'Division par 1 000'),
    ])],
    etapes_div('{{n}}'),
    'L\'unité demandée est plus grande : le nombre devient plus petit. Par combien divise-t-on ?',
)

# (f) x = d/10 (un chiffre après la virgule), d de 11 à 99 non multiple de 10 : dm² → cm², m² → dm².
N2_F = variation(
    'Convertis dans l\'unité demandée.\n\n$${{eval:d/10;d}}~' + u(selon('g', MUL)) + ' = ?~'
    + u(selon('g', MUL_A)) + '$$',
    [var('g', '0..1'), var('d', '11..99')],
    [case('{{eval:d*10}}', [
        erreur('{{d}}', msg_x10(selon('g', MUL), selon('g', MUL_A)), 'Multiplication par 10'),
        erreur('{{eval:d/1000;d}}', MSG_SENS_INV, 'Sens inversé'),
        erreur('{{eval:d/10;d}}00', 'On ne colle pas deux zéros derrière un nombre à virgule : '
               'décale la virgule de deux rangs.', 'Deux zéros collés'),
    ])],
    etapes_mul('{{eval:d/10;d}}'),
    'L\'unité demandée est plus petite : le nombre devient plus grand. Décale la virgule.',
    ['mod(d,10)!=0'],
)

# (g) n de 101 à 999, non multiple de 10 : cm² → dm², dm² → m².
N2_G = variation(
    'Convertis dans l\'unité demandée.\n\n$${{n}}~' + u(selon('g', ['cm^2', 'dm^2'])) + ' = ?~'
    + u(selon('g', ['dm^2', 'm^2'])) + '$$',
    [var('g', '0..1'), var('n', '101..999')],
    [case('{{eval:n/100;d}}', [
        erreur('{{eval:n/10;d}}', msg_x10(selon('g', ['cm^2', 'dm^2']),
                                          selon('g', ['dm^2', 'm^2'])), 'Division par 10'),
        erreur('{{eval:n*100}}', MSG_SENS, 'Sens inversé'),
    ])],
    [
        '$1~' + u(selon('g', ['dm^2', 'm^2'])) + ' = 100~' + u(selon('g', ['cm^2', 'dm^2']))
        + '$ : on divise par $100$.',
        '${{n}} \\div 100 = ' + couleur('{{solution}}') + '$',
    ],
    'L\'unité demandée est plus grande : par combien divise-t-on ?',
    ['mod(n,10)!=0'],
)

# (h) petits décimaux → × 100 : 0,0k ou 0,k (p = 0 ou 1), k de 1 à 9 ; m² → dm², dm² → cm².
N2_H = variation(
    'Convertis dans l\'unité demandée.\n\n$${{eval:k/10^(2-p);d}}~' + u(selon('g', MUL)) + ' = ?~'
    + u(selon('g', MUL_A)) + '$$',
    [var('g', '0..1'), var('p', '0..1'), var('k', '1..9')],
    [case('{{eval:k*10^p}}', [
        erreur('{{eval:k*10^(p-1);d}}', msg_x10(selon('g', MUL), selon('g', MUL_A)),
               'Multiplication par 10'),
        erreur('{{eval:k/10^(4-p);d}}', MSG_SENS_INV, 'Sens inversé'),
    ])],
    etapes_mul('{{eval:k/10^(2-p);d}}'),
    'Multiplier par $100$, c\'est décaler la virgule de deux rangs vers la droite.',
)

SPECS_N2 = [
    spec('73 dm² = 0,73 m²', 4, {'g': '0', 'n': '73'}, 'correct', ['0{,}73']),
    spec('70 dm² = 0,7 m²', 4, {'g': '0', 'n': '70'}, 'correct', ['0{,}7']),
    spec('73 dm² : 7,3', 4, {'g': '0', 'n': '73'}, 'incorrect', ['7{,}3'],
         'Entre $\\unit{dm^2}$ et $\\unit{m^2}$, on passe par $100$, pas par $10$.'),
    spec('73 dm² : 7 300', 4, {'g': '0', 'n': '73'}, 'incorrect', ['7300'], MSG_SENS),
    spec('73 dm² : 0,073', 4, {'g': '0', 'n': '73'}, 'incorrect', ['0{,}073'],
         'Tu as divisé par $1\\,000$ : entre deux unités d\'aire voisines, on divise par $100$.'),
    spec('45 cm² = 0,45 dm²', 4, {'g': '1', 'n': '45'}, 'correct', ['0{,}45']),
    spec('3,7 dm² = 370 cm²', 5, {'g': '0', 'd': '37'}, 'correct', ['370']),
    spec('3,7 dm² : 37', 5, {'g': '0', 'd': '37'}, 'incorrect', ['37'],
         'Entre $\\unit{dm^2}$ et $\\unit{cm^2}$, on passe par $100$, pas par $10$.'),
    spec('3,7 dm² : 0,037', 5, {'g': '0', 'd': '37'}, 'incorrect', ['0{,}037'], MSG_SENS_INV),
    spec('3,7 dm² : 3,700', 5, {'g': '0', 'd': '37'}, 'incorrect', ['3{,}700'],
         'On ne colle pas deux zéros derrière un nombre à virgule : décale la virgule de deux '
         'rangs.'),
    spec('4,5 m² = 450 dm²', 5, {'g': '1', 'd': '45'}, 'correct', ['450']),
    spec('457 cm² = 4,57 dm²', 6, {'g': '0', 'n': '457'}, 'correct', ['4{,}57']),
    spec('457 cm² : 45,7', 6, {'g': '0', 'n': '457'}, 'incorrect', ['45{,}7'],
         'Entre $\\unit{cm^2}$ et $\\unit{dm^2}$, on passe par $100$, pas par $10$.'),
    spec('375 dm² = 3,75 m²', 6, {'g': '1', 'n': '375'}, 'correct', ['3{,}75']),
    spec('0,07 m² = 7 dm²', 7, {'g': '1', 'p': '0', 'k': '7'}, 'correct', ['7']),
    spec('0,7 m² = 70 dm²', 7, {'g': '1', 'p': '1', 'k': '7'}, 'correct', ['70']),
    spec('0,7 m² : 7', 7, {'g': '1', 'p': '1', 'k': '7'}, 'incorrect', ['7'],
         'Entre $\\unit{m^2}$ et $\\unit{dm^2}$, on passe par $100$, pas par $10$.'),
    spec('0,07 m² : 0,7', 7, {'g': '1', 'p': '0', 'k': '7'}, 'incorrect', ['0{,}7'],
         'Entre $\\unit{m^2}$ et $\\unit{dm^2}$, on passe par $100$, pas par $10$.'),
    spec('0,3 dm² = 30 cm²', 7, {'g': '0', 'p': '1', 'k': '3'}, 'correct', ['30']),
]


# =============================================================================================
# N7 — fdd849f5 (rectangle) et 01e205ed (carré) : figure cotée, longueurs décimales.
# =============================================================================================

MSG_PERIM = 'Ça, c\'est le périmètre (le tour) ; l\'aire est la longueur multipliée par la largeur.'
MSG_UNITE_CM = 'Une aire s\'écrit en $\\unit{cm^2}$, pas en $\\unit{cm}$.'


def figure_rect(L, l, desc):
    return bloc(
        'figure',
        'fenetre: -1 ; {{eval:' + L + '+3}} ; -2 ; {{eval:' + l + '+1}}',
        'description: ' + desc,
        '---',
        'A = point(0, 0, visible=faux)',
        'B = point({{' + L + '}}, 0, visible=faux)',
        'C = point({{' + L + '}}, {{' + l + '}}, visible=faux)',
        'D = point(0, {{' + l + '}}, visible=faux)',
        'polygone(A, B, C, D, couleur="noir", epaisseur=2, remplissage="bleu", opacite_fond=0.2)',
        'M = milieu(A, B, visible=faux)',
        'N = milieu(B, C, visible=faux)',
        'texte(M, "{{' + L + '}} cm", dy=-0.4, ancre="haut")',
        'texte(N, "{{' + l + '}} cm", dx=0.3, ancre="gauche")',
    )


# fdd849f5 (h) : rectangle dessiné et coté, a de 3 à 11, b de 2 à 10 (a > b, condition partagée).
R_H = variation(
    'Quelle est l\'aire de ce **rectangle** ?\n\n'
    + figure_rect('a', 'b', 'Un rectangle de {{a}} cm de longueur et {{b}} cm de largeur.')
    + '\n\nL\'aire du rectangle est $?$.',
    [var('a', '3..11'), var('b', '2..10')],
    [case('{{eval:a*b}}' + u('cm^2'), [
        erreur('{{eval:2*(a+b)}}' + u('cm'), MSG_PERIM, 'Périmètre'),
        erreur('{{eval:a*b}}' + u('cm'), MSG_UNITE_CM, 'Aire en cm'),
        erreur('{{eval:a+b}}' + u('cm^2'), 'L\'aire n\'est pas une somme : multiplie la longueur '
               'par la largeur.', 'Somme'),
    ], unite=True)],
    ['On lit les deux côtés sur la figure : ${{a}}$ cm et ${{b}}$ cm.',
     '$${{a}}~\\unit{cm} \\times {{b}}~\\unit{cm} = ' + couleur('{{eval:a*b}}~\\unit{cm^2}') + '$$'],
    'Lis la longueur et la largeur sur la figure, puis applique la formule de l\'aire.',
)

# fdd849f5 (i) : longueur a de 5 à 9 cm, largeur b,q de 1,1 à 3,9 cm (b de 1 à 3, q de 1 à 9).
R_I = variation(
    'Quelle est l\'aire d\'un **rectangle** de longueur ${{a}}~\\unit{cm}$ et de largeur '
    '${{eval:b+q/10;d}}~\\unit{cm}$ ?\n\nL\'aire du rectangle est $?$.',
    [var('a', '5..9'), var('b', '1..3'), var('q', '1..9')],
    [case('{{eval:a*(10*b+q)/10;d}}' + u('cm^2'), [
        erreur('{{eval:2*(a+b+q/10);d}}' + u('cm'), MSG_PERIM, 'Périmètre'),
        erreur('{{eval:a*(10*b+q)/100;d}}' + u('cm^2'), 'La virgule est mal placée : le résultat '
               'a autant de chiffres après la virgule que la largeur, un seul.', 'Virgule décalée'),
        erreur('{{eval:a*b+q/10;d}}' + u('cm^2'), 'Il faut multiplier toute la largeur, la partie '
               'après la virgule aussi.', 'Partie décimale oubliée dans le produit'),
    ], unite=True)],
    ['$${{a}} \\times {{eval:b+q/10;d}} = ' + couleur('{{eval:a*(10*b+q)/10;d}}~\\unit{cm^2}')
     + '$$',
     'Pour calculer : ${{a}} \\times {{eval:10*b+q}} = {{eval:a*(10*b+q)}}$, puis un chiffre après '
     'la virgule, comme dans ${{eval:b+q/10;d}}$.'],
    'Calcule ${{a}} \\times {{eval:10*b+q}}$, puis place la virgule.',
)

SPECS_R = [
    spec('Figure 7 × 4 = 28 cm²', 7, {'a': '7', 'b': '4'}, 'correct', ['28' + u('cm^2')]),
    spec('Figure : périmètre 22 cm', 7, {'a': '7', 'b': '4'}, 'incorrect', ['22' + u('cm')],
         MSG_PERIM),
    spec('Figure : 28 cm', 7, {'a': '7', 'b': '4'}, 'incorrect', ['28' + u('cm')], MSG_UNITE_CM),
    spec('Figure : 11 cm²', 7, {'a': '7', 'b': '4'}, 'incorrect', ['11' + u('cm^2')],
         'L\'aire n\'est pas une somme : multiplie la longueur par la largeur.'),
    spec('6 × 2,4 = 14,4 cm²', 8, {'a': '6', 'b': '2', 'q': '4'}, 'correct',
         ['14{,}4' + u('cm^2')]),
    spec('6 × 2,4 : 1,44 cm²', 8, {'a': '6', 'b': '2', 'q': '4'}, 'incorrect',
         ['1{,}44' + u('cm^2')],
         'La virgule est mal placée : le résultat a autant de chiffres après la virgule que la '
         'largeur, un seul.'),
    spec('6 × 2,4 : 12,4 cm²', 8, {'a': '6', 'b': '2', 'q': '4'}, 'incorrect',
         ['12{,}4' + u('cm^2')],
         'Il faut multiplier toute la largeur, la partie après la virgule aussi.'),
    spec('6 × 2,4 : périmètre 16,8 cm', 8, {'a': '6', 'b': '2', 'q': '4'}, 'incorrect',
         ['16{,}8' + u('cm')], MSG_PERIM),
]

MSG_PERIM_C = 'Ça, c\'est le périmètre (le tour) ; l\'aire est le côté multiplié par lui-même.'
MSG_2C = 'L\'aire n\'est pas le double du côté : c\'est le côté multiplié par lui-même.'

# 01e205ed (h) : carré dessiné et coté, côté c de 2 à 9.
C_H = variation(
    'Quelle est l\'aire de ce **carré** ?\n\n'
    + bloc(
        'figure',
        'fenetre: -1 ; {{eval:c+3}} ; -2 ; {{eval:c+1}}',
        'description: Un carré de {{c}} cm de côté.',
        '---',
        'A = point(0, 0, visible=faux)',
        'B = point({{c}}, 0, visible=faux)',
        'C = point({{c}}, {{c}}, visible=faux)',
        'D = point(0, {{c}}, visible=faux)',
        'polygone(A, B, C, D, couleur="noir", epaisseur=2, remplissage="bleu", opacite_fond=0.2)',
        'M = milieu(A, B, visible=faux)',
        'texte(M, "{{c}} cm", dy=-0.4, ancre="haut")',
    )
    + '\n\nL\'aire du carré est $?$.',
    [var('c', '2..9')],
    [case('{{eval:c*c}}' + u('cm^2'), [
        erreur('{{eval:4*c}}' + u('cm'), MSG_PERIM_C, 'Périmètre'),
        erreur('{{eval:c*c}}' + u('cm'), MSG_UNITE_CM, 'Aire en cm'),
        erreur('{{eval:2*c}}' + u('cm^2'), MSG_2C, 'Double du côté'),
    ], unite=True)],
    ['Les quatre côtés du carré mesurent ${{c}}$ cm.',
     '$${{c}}~\\unit{cm} \\times {{c}}~\\unit{cm} = ' + couleur('{{eval:c*c}}~\\unit{cm^2}') + '$$'],
    'Un seul côté est écrit : les autres ont la même longueur.',
)

# 01e205ed (i) : côté décimal n,q de 1,1 à 5,9 cm (n de 1 à 5, q de 1 à 9).
C_I = variation(
    'Quelle est l\'aire d\'un **carré** de côté ${{eval:n+q/10;d}}~\\unit{cm}$ ?\n\nL\'aire du '
    'carré est $?$.',
    [var('n', '1..5'), var('q', '1..9')],
    [case('{{eval:(10*n+q)^2/100;d}}' + u('cm^2'), [
        erreur('{{eval:2*(n+q/10);d}}' + u('cm^2'), MSG_2C, 'Double du côté'),
        erreur('{{eval:(10*n+q)^2/10;d}}' + u('cm^2'), 'La virgule est mal placée : avec un '
               'chiffre après la virgule dans chaque facteur, le produit en a deux.',
               'Virgule décalée'),
        erreur('{{eval:(100*n*n+q*q)/100;d}}' + u('cm^2'), 'On ne multiplie pas la partie entière et la '
               'partie décimale chacune de son côté : multiplie le nombre entier par lui-même.',
               'Parties multipliées à part'),
    ], unite=True)],
    ['$${{eval:n+q/10;d}} \\times {{eval:n+q/10;d}} = '
     + couleur('{{eval:(10*n+q)^2/100;d}}~\\unit{cm^2}') + '$$',
     'Pour calculer : ${{eval:10*n+q}} \\times {{eval:10*n+q}} = {{eval:(10*n+q)^2}}$, puis deux '
     'chiffres après la virgule (un dans chaque facteur).'],
    'Calcule ${{eval:10*n+q}} \\times {{eval:10*n+q}}$, puis place la virgule.',
)

SPECS_C = [
    spec('Figure 6 cm : 36 cm²', 7, {'c': '6'}, 'correct', ['36' + u('cm^2')]),
    spec('Figure 6 cm : 24 cm', 7, {'c': '6'}, 'incorrect', ['24' + u('cm')], MSG_PERIM_C),
    spec('Figure 6 cm : 36 cm', 7, {'c': '6'}, 'incorrect', ['36' + u('cm')], MSG_UNITE_CM),
    spec('Figure 6 cm : 12 cm²', 7, {'c': '6'}, 'incorrect', ['12' + u('cm^2')], MSG_2C),
    spec('2,5 × 2,5 = 6,25 cm²', 8, {'n': '2', 'q': '5'}, 'correct', ['6{,}25' + u('cm^2')]),
    spec('2,5 : 5 cm²', 8, {'n': '2', 'q': '5'}, 'incorrect', ['5' + u('cm^2')], MSG_2C),
    spec('2,5 : 62,5 cm²', 8, {'n': '2', 'q': '5'}, 'incorrect', ['62{,}5' + u('cm^2')],
         'La virgule est mal placée : avec un chiffre après la virgule dans chaque facteur, le '
         'produit en a deux.'),
    spec('2,5 : 4,25 cm²', 8, {'n': '2', 'q': '5'}, 'incorrect', ['4{,}25' + u('cm^2')],
         'On ne multiplie pas la partie entière et la partie décimale chacune de son côté : '
         'multiplie le nombre entier par lui-même.'),
]

AJOUTS = {
    '82748db8': ([N2_E, N2_F, N2_G, N2_H], SPECS_N2),
    'fdd849f5': ([R_H, R_I], SPECS_R),
    '01e205ed': ([C_H, C_I], SPECS_C),
}

for court, (variations, specs) in AJOUTS.items():
    chemin = os.path.join(DOSSIER, court + '.json')
    with open(chemin, encoding='utf-8') as f:
        m = json.load(f)
    nv, ns = ORIGINE[court]
    m['variations'] = m['variations'][:nv] + variations
    m['testSpecs'] = m['testSpecs'][:ns] + specs
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(AJOUTS), 'modèle(s) complété(s) dans', DOSSIER)
