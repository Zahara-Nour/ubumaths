"""Ajoute les variations validées à six modèles publiés de 6e, exportés de prod dans
scripts/questions/idees-6e-longueurs-publies/ (chantier idees-6e-longueurs).

Phase 0 du 2026-11-27 (« je te suis », journal docs/archive/wip/idees-6e-longueurs/idees-6e-longueurs-progress.md, fiches F1 à F6) :
- F1 → 060086c8 « Calcul du périmètre d'un carré » (6-144) : carré dessiné et codé, côté décimal ;
- F2 → 66f9abbf « Calcul du périmètre d'un rectangle » (6-199) : rectangle dessiné et codé, côtés
  décimaux ;
- F3 → cfb4c692 « Calculer le périmètre d'un disque » (6-147) : cercle dessiné, rayon ou diamètre
  tracé ;
- F4 → 4343af4c « Le périmètre d'un disque est proportionnel à son diamètre » (6-145) : ce qu'est π ;
- F5 → ccb4f5e5 « Connaître la formule du périmètre d'un disque » (6-146) : la formule écrite ;
- F6 → 60f165a8 « Périmètres de figures composées » (6-148) : côtés décimaux, triangle rectangle,
  demi-disque creusé.

Les variations s'ajoutent À LA FIN (les réponses des élèves gardent l'indice de leur variation) ;
la migration de contenu est générée par scripts/questions/migration-contenu.ts. Seuls `variations`
et `testSpecs` changent : ni titre, ni niveaux, ni options, ni description, ni `shared`.

Pièges des modèles d'origine :
- 66f9abbf partage les variables a (1..11), b (1..11!a), c = a[mm], d = b[mm] et la condition a>b.
  Une variation qui redéfinit a et b sans c et d garderait c = eval:a[mm] AVANT ses propres
  variables (fusion : partagées d'abord) : les variations ajoutées redéfinissent donc les quatre
  noms, et écrivent leurs conditions (une liste, même vide, remplace celle du partage) ;
- 60f165a8 partage `blankDefaults.acceptDecimal` : les variations ajoutées n'écrivent pas de
  `blankDefaults` et en héritent ;
- ccb4f5e5 n'a pas d'options : la saisie de la formule demande `constraints.products: off`
  (sinon $\\pi \\times D$ est « forme non optimale ») ; seul champ changé hors variations et specs ;
- les cases choix (4343af4c, ccb4f5e5) n'ont pas d'erreurs prévues (case à écriture ordinaire
  seulement) ;
- une erreur prévue ne doit jamais valoir la réponse, ni une autre erreur : tirages exclus par
  `conditions` (carré c = 4, rectangle 6 × 3, cercle r = 2 et r = 4).

Le script repart du contenu de prod (variations et specs d'origine, comptées dans ORIGINE) : le
relancer réécrit l'ajout sans le doubler.

Usage : python3 docs/wip/questions/idees-6e-longueurs-publies.py scripts/questions/idees-6e-longueurs-publies
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'

# id court → (variations, specs) d'origine en prod (export du 2026-11-27)
ORIGINE = {
    '060086c8': (7, 10),
    '66f9abbf': (7, 9),
    'cfb4c692': (2, 6),
    '4343af4c': (3, 8),
    'ccb4f5e5': (2, 6),
    '60f165a8': (3, 9),
}


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


def u(texte):
    return '\\unit{' + texte + '}'


def bloc(nom, *lignes):
    return '```' + nom + '\n' + '\n'.join(lignes) + '\n```'


def virgule(v10):
    """Texte d'une figure (hors formule) : v10 dixièmes, jamais un entier, écrits avec une virgule."""
    return '{{eval:floor(' + v10 + '/10)}},{{eval:mod(' + v10 + ',10)}}'


def arrondi(x100):
    """Valeur arrondie au dixième d'une longueur donnée en centièmes entiers (x100)."""
    return '{{eval:floor((' + x100 + '+5)/10)/10;d}}'


# =============================================================================================
# F1 — 060086c8 : carré dessiné et codé (h), côté décimal (i).
# =============================================================================================

MSG_AIRE_C = 'Tu as calculé côté × côté : c\'est l\'aire. Le périmètre est le tour du carré.'
MSG_2C = 'Un carré a quatre côtés, pas deux : le périmètre vaut $4$ fois le côté.'
MSG_C4 = 'On n\'ajoute pas $4$ au côté : on additionne les quatre côtés, soit $4$ fois le côté.'

# (h) carré dessiné, un côté coté (c de 2 à 9), les quatre côtés codés égaux, un angle droit.
# c = 4 exclu : 4 × 4 = 4 + 4 + … l'aire (16) vaudrait le périmètre, et 2 × 4 = 4 + 4.
F1_H = variation(
    'Quel est le périmètre de ce **carré** ?\n\n'
    + bloc(
        'figure',
        'fenetre: -1 ; {{eval:c+2}} ; -1.5 ; {{eval:c+1}}',
        'description: Un carré dont un côté mesure {{c}} cm ; ses quatre côtés sont codés de la '
        'même longueur.',
        '---',
        'A = point(0, 0, visible=faux)',
        'B = point({{c}}, 0, visible=faux)',
        'C = point({{c}}, {{c}}, visible=faux)',
        'D = point(0, {{c}}, visible=faux)',
        'polygone(A, B, C, D, couleur="noir", epaisseur=2, remplissage="bleu", opacite_fond=0.2)',
        'marque_segment(A, B)',
        'marque_segment(B, C)',
        'marque_segment(C, D)',
        'marque_segment(D, A)',
        'angle(B, A, D, marque="carre")',
        'M = milieu(A, B, visible=faux)',
        'texte(M, "{{c}} cm", dy=-0.4, ancre="haut")',
    )
    + '\n\nLe périmètre du carré est $?$.',
    [var('c', '2..9')],
    [case('{{eval:4*c}}' + u('cm'), [
        erreur('{{eval:c*c}}' + u('cm'), MSG_AIRE_C, 'Aire'),
        erreur('{{eval:2*c}}' + u('cm'), MSG_2C, 'Double du côté'),
        erreur('{{eval:c+4}}' + u('cm'), MSG_C4, 'Côté + 4'),
    ], unite=True)],
    ['Les quatre côtés sont codés de la même longueur : ils mesurent tous ${{c}}~\\unit{cm}$.',
     '$$4 \\times {{c}}~\\unit{cm} = ' + couleur('{{eval:4*c}}~\\unit{cm}') + '$$'],
    'Un seul côté est écrit : que disent les petits traits sur les autres côtés ?',
    ['c!=4'],
)

# (i) côté k/10 de 2,2 à 11,9 cm (k de 22 à 119, jamais un entier).
F1_I = variation(
    'Quel est le périmètre d\'un **carré** de côté ${{eval:k/10;d}}~\\unit{cm}$ ?\n\nLe périmètre '
    'du carré est $?$.',
    [var('k', '22..119')],
    [case('{{eval:4*k/10;d}}' + u('cm'), [
        erreur('{{eval:4*k/100;d}}' + u('cm'), 'La virgule est mal placée : le résultat a un '
               'chiffre après la virgule, comme le côté.', 'Virgule décalée'),
        erreur('{{eval:2*k/10;d}}' + u('cm'), MSG_2C, 'Double du côté'),
        erreur('{{eval:k*k/100;d}}' + u('cm'), MSG_AIRE_C, 'Aire'),
    ], unite=True)],
    ['Les quatre côtés du carré mesurent ${{eval:k/10;d}}~\\unit{cm}$.',
     '$$4 \\times {{eval:k/10;d}}~\\unit{cm} = ' + couleur('{{eval:4*k/10;d}}~\\unit{cm}') + '$$',
     'Pour calculer : $4 \\times {{k}} = {{eval:4*k}}$, puis un chiffre après la virgule, comme '
     'dans ${{eval:k/10;d}}$.'],
    'Le périmètre est le tour du carré : combien a-t-il de côtés, et que mesurent-ils ?',
    ['mod(k,10)!=0'],
)

SPECS_F1 = [
    spec('Figure 6 cm : 24 cm', 7, {'c': '6'}, 'correct', ['24' + u('cm')]),
    spec('Figure 6 cm : 240 mm accepté', 7, {'c': '6'}, 'correct', ['240' + u('mm')]),
    spec('Figure 6 cm : 2,4 dm accepté', 7, {'c': '6'}, 'correct', ['2{,}4' + u('dm')]),
    spec('Figure 6 cm : 24 sans unité', 7, {'c': '6'}, 'incorrect', ['24']),
    spec('Figure 6 cm : 36 cm (aire)', 7, {'c': '6'}, 'incorrect', ['36' + u('cm')], MSG_AIRE_C),
    spec('Figure 6 cm : 12 cm', 7, {'c': '6'}, 'incorrect', ['12' + u('cm')], MSG_2C),
    spec('Figure 6 cm : 10 cm', 7, {'c': '6'}, 'incorrect', ['10' + u('cm')], MSG_C4),
    spec('3,7 cm : 14,8 cm', 8, {'k': '37'}, 'correct', ['14{,}8' + u('cm')]),
    spec('3,7 cm : 148 mm accepté', 8, {'k': '37'}, 'correct', ['148' + u('mm')]),
    spec('3,7 cm : 1,48 cm', 8, {'k': '37'}, 'incorrect', ['1{,}48' + u('cm')],
         'La virgule est mal placée : le résultat a un chiffre après la virgule, comme le côté.'),
    spec('3,7 cm : 7,4 cm', 8, {'k': '37'}, 'incorrect', ['7{,}4' + u('cm')], MSG_2C),
    spec('3,7 cm : 13,69 cm (aire)', 8, {'k': '37'}, 'incorrect', ['13{,}69' + u('cm')],
         MSG_AIRE_C),
    spec('11,9 cm : 47,6 cm', 8, {'k': '119'}, 'correct', ['47{,}6' + u('cm')]),
]


# =============================================================================================
# F2 — 66f9abbf : rectangle dessiné et codé (h), côtés décimaux (i).
# Les quatre noms partagés (a, b, c, d) sont redéfinis, et la condition a>b réécrite.
# =============================================================================================

MSG_DEMI = 'Tu n\'as compté que deux côtés : le tour du rectangle passe par les quatre, soit ' \
           '$2 \\times (L + l)$.'
MSG_AIRE_R = 'Tu as multiplié la longueur par la largeur : c\'est l\'aire. Le périmètre est le tour.'
MSG_2LL = 'La largeur aussi compte deux fois : il y a deux largeurs, comme deux longueurs.'

# (h) longueur a de 3 à 11, largeur b de 2 à a − 1 ; c = a + b, d = 2 × (a + b).
# 6 × 3 exclu : l'aire (18) vaudrait le périmètre.
F2_H = variation(
    'Quel est le périmètre de ce **rectangle** ?\n\n'
    + bloc(
        'figure',
        'fenetre: -1 ; {{eval:a+3}} ; -1.5 ; {{eval:b+1}}',
        'description: Un rectangle de {{a}} cm de longueur et {{b}} cm de largeur ; ses côtés '
        'opposés sont codés de la même longueur.',
        '---',
        'A = point(0, 0, visible=faux)',
        'B = point({{a}}, 0, visible=faux)',
        'C = point({{a}}, {{b}}, visible=faux)',
        'D = point(0, {{b}}, visible=faux)',
        'polygone(A, B, C, D, couleur="noir", epaisseur=2, remplissage="bleu", opacite_fond=0.2)',
        'marque_segment(A, B)',
        'marque_segment(C, D)',
        'marque_segment(B, C, traits=2)',
        'marque_segment(D, A, traits=2)',
        'angle(B, A, D, marque="carre")',
        'M = milieu(A, B, visible=faux)',
        'N = milieu(B, C, visible=faux)',
        'texte(M, "{{a}} cm", dy=-0.4, ancre="haut")',
        'texte(N, "{{b}} cm", dx=0.3, ancre="gauche")',
    )
    + '\n\nLe périmètre du rectangle est $?$.',
    [var('a', '3..11'), var('b', '2..10'), var('c', 'eval:a+b'), var('d', 'eval:2*(a+b)')],
    [case('{{d}}' + u('cm'), [
        erreur('{{c}}' + u('cm'), MSG_DEMI, 'Demi-périmètre'),
        erreur('{{eval:a*b}}' + u('cm'), MSG_AIRE_R, 'Aire'),
        erreur('{{eval:2*a+b}}' + u('cm'), MSG_2LL, 'Une seule largeur'),
    ], unite=True)],
    ['Les côtés codés de la même façon ont la même longueur : deux côtés de ${{a}}~\\unit{cm}$ et deux de '
     '${{b}}~\\unit{cm}$.',
     '$$2 \\times ({{a}} + {{b}}) = 2 \\times {{c}} = ' + couleur('{{d}}~\\unit{cm}') + '$$'],
    'Une longueur et une largeur sont écrites : combien de fois chacune fait-elle partie du tour ?',
    ['a>b', 'a*b!=2*(a+b)'],
)

# (i) longueur a/10 de 5,1 à 9,4 cm, largeur b/10 de 1,1 à 3,4 cm (jamais un entier).
F2_I = variation(
    'Quel est le périmètre d\'un **rectangle** de longueur ${{eval:a/10;d}}~\\unit{cm}$ et de '
    'largeur ${{eval:b/10;d}}~\\unit{cm}$ ?\n\nLe périmètre du rectangle est $?$.',
    [var('a', '51..94'), var('b', '11..34'), var('c', 'eval:a+b'), var('d', 'eval:2*(a+b)')],
    [case('{{eval:d/10;d}}' + u('cm'), [
        erreur('{{eval:c/10;d}}' + u('cm'), MSG_DEMI, 'Demi-périmètre'),
        erreur('{{eval:a*b/100;d}}' + u('cm'), MSG_AIRE_R, 'Aire'),
        erreur('{{eval:(2*a+b)/10;d}}' + u('cm'), MSG_2LL, 'Une seule largeur'),
    ], unite=True)],
    ['$${{eval:a/10;d}} + {{eval:b/10;d}} = {{eval:c/10;d}}$$',
     '$$2 \\times {{eval:c/10;d}} = ' + couleur('{{eval:d/10;d}}~\\unit{cm}') + '$$'],
    'Additionne d\'abord la longueur et la largeur : c\'est la moitié du tour.',
    ['mod(a,10)!=0', 'mod(b,10)!=0'],
)

SPECS_F2 = [
    spec('Figure 8 × 5 : 26 cm', 7, {'a': '8', 'b': '5', 'c': '13', 'd': '26'}, 'correct',
         ['26' + u('cm')]),
    spec('Figure 8 × 5 : 260 mm accepté', 7, {'a': '8', 'b': '5', 'c': '13', 'd': '26'},
         'correct', ['260' + u('mm')]),
    spec('Figure 8 × 5 : 13 cm', 7, {'a': '8', 'b': '5', 'c': '13', 'd': '26'}, 'incorrect',
         ['13' + u('cm')], MSG_DEMI),
    spec('Figure 8 × 5 : 40 cm (aire)', 7, {'a': '8', 'b': '5', 'c': '13', 'd': '26'},
         'incorrect', ['40' + u('cm')], MSG_AIRE_R),
    spec('Figure 8 × 5 : 21 cm', 7, {'a': '8', 'b': '5', 'c': '13', 'd': '26'}, 'incorrect',
         ['21' + u('cm')], MSG_2LL),
    spec('Figure 8 × 5 : 26 sans unité', 7, {'a': '8', 'b': '5', 'c': '13', 'd': '26'},
         'incorrect', ['26']),
    spec('7,3 × 2,4 : 19,4 cm', 8, {'a': '73', 'b': '24', 'c': '97', 'd': '194'}, 'correct',
         ['19{,}4' + u('cm')]),
    spec('7,3 × 2,4 : 194 mm accepté', 8, {'a': '73', 'b': '24', 'c': '97', 'd': '194'},
         'correct', ['194' + u('mm')]),
    spec('7,3 × 2,4 : 9,7 cm', 8, {'a': '73', 'b': '24', 'c': '97', 'd': '194'}, 'incorrect',
         ['9{,}7' + u('cm')], MSG_DEMI),
    spec('7,3 × 2,4 : 17,52 cm (aire)', 8, {'a': '73', 'b': '24', 'c': '97', 'd': '194'},
         'incorrect', ['17{,}52' + u('cm')], MSG_AIRE_R),
    spec('7,3 × 2,4 : 17 cm', 8, {'a': '73', 'b': '24', 'c': '97', 'd': '194'}, 'incorrect',
         ['17' + u('cm')], MSG_2LL),
]


# =============================================================================================
# F3 — cfb4c692 : cercle dessiné, rayon (g = 0) ou diamètre (g = 1) tracé et coté.
# r = 2 exclu (π × r × r = 2 × π × r) et r = 4 (π × r × r = 2 × π × D).
# =============================================================================================

INTRO_DISQUE = ('**Périmètre d\'un disque.** Avec le diamètre $D$ : $P = \\pi \\times D$. Avec le '
                'rayon $R$ (la moitié du diamètre) : $P = 2 \\times \\pi \\times R$.')
MSG_2PID = 'Tu as pris le diamètre pour le rayon : avec le diamètre, $P = \\pi \\times D$.'
MSG_PIR = 'Tu as multiplié le rayon par $\\pi$ : c\'est le diamètre qu\'on multiplie par $\\pi$, ' \
          'soit $2 \\times \\pi \\times R$.'
MSG_PIRR = 'Tu as calculé $\\pi \\times R \\times R$ : c\'est l\'aire du disque, pas son périmètre.'

F3_C = variation(
    'On prend $3{,}14$ pour $\\pi$.\n\nCalcule le périmètre de ce disque de centre $O$.\n\n'
    + bloc(
        'figure',
        'fenetre: {{eval:-r-1}} ; {{eval:r+1}} ; {{eval:-r-1}} ; {{eval:r+1}}',
        'description: Un disque de centre O ; un segment tracé de longueur {{n}} cm '
        '{{if:g==0|va du centre au cercle|passe par le centre et joint deux points du cercle}}.',
        '---',
        'O = point(0, 0)',
        'cercle(O, rayon={{r}}, couleur="noir", epaisseur=2, remplissage="bleu", opacite_fond=0.2)',
        'G = point({{eval:-r*g}}, 0, visible=faux)',
        'H = point({{r}}, 0, visible=faux)',
        'segment(G, H, couleur="noir", epaisseur=2)',
        'texte({{eval:r/2;d}}, 0.5, "{{n}} cm")',
    )
    + '\n\n$$?~\\text{cm}$$',
    [var('g', '0..1'), var('r', '3..9'), var('d', 'eval:2*r'), var('n', 'eval:r*(1+g)')],
    [case('{{eval:314*d/100;d}}', [
        erreur('{{eval:1256*r/100;d}}', MSG_2PID, 'Diamètre pris pour le rayon'),
        erreur('{{eval:314*r/100;d}}', MSG_PIR, 'π × R'),
        erreur('{{eval:314*r*r/100;d}}', MSG_PIRR, 'Aire'),
    ])],
    [INTRO_DISQUE,
     'Le segment tracé {{if:g==0|va du centre au cercle : c\'est un rayon|passe par le centre : '
     'c\'est un diamètre}}. Le rayon mesure ${{r}}~\\unit{cm}$, le diamètre ${{d}}~\\unit{cm}$.',
     '$$P = 3{,}14 \\times {{d}} = ' + couleur('{{eval:314*d/100;d}}') + '$$',
     'Le périmètre vaut environ ${{eval:314*d/100;d}}~\\unit{cm}$.'],
    'Le segment tracé est-il un rayon ou un diamètre ? Choisis la formule qui va avec.',
    ['r!=4'],
)

SPECS_F3 = [
    spec('Rayon 5 tracé : 31,4', 2, {'g': '0', 'r': '5', 'd': '10', 'n': '5'}, 'correct',
         ['31{,}4']),
    spec('Rayon 5 tracé : 31.4 (point) accepté', 2, {'g': '0', 'r': '5', 'd': '10', 'n': '5'},
         'correct', ['31.4']),
    spec('Rayon 5 tracé : 15,7 (π × R)', 2, {'g': '0', 'r': '5', 'd': '10', 'n': '5'},
         'incorrect', ['15{,}7'], MSG_PIR),
    spec('Rayon 5 tracé : 78,5 (aire)', 2, {'g': '0', 'r': '5', 'd': '10', 'n': '5'},
         'incorrect', ['78{,}5'], MSG_PIRR),
    spec('Diamètre 14 tracé : 43,96', 2, {'g': '1', 'r': '7', 'd': '14', 'n': '14'}, 'correct',
         ['43{,}96']),
    spec('Diamètre 14 tracé : 87,92 (2 × π × D)', 2, {'g': '1', 'r': '7', 'd': '14', 'n': '14'},
         'incorrect', ['87{,}92'], MSG_2PID),
    spec('Diamètre 14 tracé : 153,86 (aire)', 2, {'g': '1', 'r': '7', 'd': '14', 'n': '14'},
         'incorrect', ['153{,}86'], MSG_PIRR),
]


# =============================================================================================
# F4 — 4343af4c : ce qu'est le nombre π (case choix, comme la variation 1).
# =============================================================================================

INTRO_PROP = ('**Périmètre d\'un disque.** Le périmètre d\'un disque est proportionnel à son '
              'diamètre : on l\'obtient en multipliant le diamètre par le nombre $\\pi$, qui vaut '
              'environ $3{,}14$.')

F4_D = variation(
    'Le nombre $\\pi$ est :\n\n```choix\n'
    '- le périmètre d\'un cercle de diamètre $1$\n'
    '- le périmètre d\'un cercle de rayon $1$\n'
    '- le diamètre d\'un cercle de périmètre $1$\n'
    '- exactement égal à $3{,}14$\n```',
    [],
    [case('0')],
    [INTRO_PROP,
     'Avec un diamètre de $1$ : $P = \\pi \\times 1 = \\pi$. Le nombre $\\pi$ est donc '
     '$' + couleur('\\text{le périmètre d\'un cercle de diamètre } 1') + '$.',
     'Il vaut environ $3{,}14$, mais pas exactement : ses chiffres après la virgule ne s\'arrêtent '
     'jamais ($3{,}14159\\ldots$).'],
    'Écris la formule $P = \\pi \\times D$ avec un diamètre bien choisi.',
)

SPECS_F4 = [
    spec('Diamètre 1 : juste', 3, {}, 'correct', ['0']),
    spec('Erreur : rayon 1 (ce serait 2π)', 3, {}, 'incorrect', ['1']),
    spec('Erreur : diamètre d\'un cercle de périmètre 1', 3, {}, 'incorrect', ['2']),
    spec('Erreur : exactement 3,14', 3, {}, 'incorrect', ['3']),
]


# =============================================================================================
# F5 — ccb4f5e5 : écrire la formule (saisie d'expression), avec D (c) puis R (d).
# =============================================================================================

OBJET = '{{if:c==0|d\'une roue|{{if:c==1|d\'une assiette|d\'un disque}}}}'
MSG_2PID_F = 'Avec le diamètre, on ne multiplie pas par $2$ : $P = \\pi \\times D$.'
MSG_PIDD = '$\\pi \\times D \\times D$ n\'est pas un périmètre : on multiplie le diamètre par ' \
           '$\\pi$, une seule fois.'
MSG_PIR_F = 'C\'est le diamètre qu\'on multiplie par $\\pi$, et le diamètre vaut $2 \\times R$.'
MSG_PIRR_F = '$\\pi \\times R \\times R$ est la formule de l\'aire du disque, pas de son périmètre.'

F5_C = variation(
    'On note $D$ le diamètre ' + OBJET + '.\n\nÉcris la formule de son périmètre $P$.\n\n$P = ?$',
    [var('c', '0..2')],
    [case('\\pi\\times D', [
        erreur('2\\times\\pi\\times D', MSG_2PID_F, '2 × π × D'),
        erreur('\\pi\\times D\\times D', MSG_PIDD, 'π × D × D'),
        erreur('\\pi\\times R', 'Le diamètre s\'appelle $D$ ici : $P = \\pi \\times D$.',
               'π × R'),
    ])],
    [INTRO_DISQUE,
     'Avec le diamètre : $P = ' + couleur('\\pi \\times D') + '$ (on peut écrire aussi '
     '$\\pi D$).'],
    'Le périmètre est proportionnel au diamètre : par quel nombre multiplie-t-on le diamètre ?',
)

F5_D = variation(
    'On note $R$ le rayon ' + OBJET + '.\n\nÉcris la formule de son périmètre $P$.\n\n$P = ?$',
    [var('c', '0..2')],
    [case('2\\times\\pi\\times R', [
        erreur('\\pi\\times R', MSG_PIR_F, 'π × R'),
        erreur('\\pi\\times R\\times R', MSG_PIRR_F, 'π × R × R'),
        erreur('2\\times\\pi\\times D', 'Le rayon s\'appelle $R$ ici : écris la formule avec '
               '$R$.', '2 × π × D'),
    ])],
    [INTRO_DISQUE,
     'Le diamètre vaut $2 \\times R$ : $P = \\pi \\times 2 \\times R$, qui s\'écrit $P = '
     + couleur('2 \\times \\pi \\times R') + '$ (ou $2\\pi R$).'],
    'Le diamètre vaut deux rayons : pars de la formule avec le diamètre.',
)

SPECS_F5 = [
    spec('Diamètre : π × D', 2, {'c': '0'}, 'correct', ['\\pi\\times D']),
    spec('Diamètre : D × π accepté', 2, {'c': '0'}, 'correct', ['D\\times\\pi']),
    spec('Diamètre : πD accepté', 2, {'c': '1'}, 'correct', ['\\pi D']),
    spec('Diamètre : 2 × π × D', 2, {'c': '0'}, 'incorrect', ['2\\times\\pi\\times D'],
         MSG_2PID_F),
    spec('Diamètre : π × D × D', 2, {'c': '0'}, 'incorrect', ['\\pi\\times D\\times D'],
         MSG_PIDD),
    spec('Diamètre : π × R', 2, {'c': '2'}, 'incorrect', ['\\pi\\times R'],
         'Le diamètre s\'appelle $D$ ici : $P = \\pi \\times D$.'),
    spec('Rayon : 2 × π × R', 3, {'c': '0'}, 'correct', ['2\\times\\pi\\times R']),
    spec('Rayon : 2πR accepté', 3, {'c': '1'}, 'correct', ['2\\pi R']),
    spec('Rayon : π × 2 × R accepté', 3, {'c': '2'}, 'correct', ['\\pi\\times2\\times R']),
    spec('Rayon : π × R', 3, {'c': '0'}, 'incorrect', ['\\pi\\times R'], MSG_PIR_F),
    spec('Rayon : π × R × R', 3, {'c': '0'}, 'incorrect', ['\\pi\\times R\\times R'], MSG_PIRR_F),
    spec('Rayon : 2 × π × D', 3, {'c': '0'}, 'incorrect', ['2\\times\\pi\\times D'],
         'Le rayon s\'appelle $R$ ici : écris la formule avec $R$.'),
]


# =============================================================================================
# F6 — 60f165a8 : côtés décimaux (d), triangle rectangle (e), demi-disque creusé (f).
# Les longueurs se calculent en centièmes entiers (X), arrondies au dixième par arrondi().
# =============================================================================================

ENONCE_F6 = ('Calcule le périmètre de cette figure. On prend $\\pi \\approx 3{,}14$ ; donne le '
             'résultat arrondi au dixième.\n\n')
FIN_F6 = '\n\nPérimètre $\\approx ?~\\unit{cm}$'
MSG_DIAM = 'Le trait en pointillé est à l\'intérieur de la figure : il n\'est pas sur le contour.'
MSG_DEUX_L = 'Il y a deux longueurs sur le contour : en haut et en bas.'
MSG_CERCLE = 'Il n\'y a qu\'un demi-cercle : sa longueur est la moitié de $3{,}14 \\times$ ' \
             'diamètre.'

# (d) rectangle de a/10 × b/10 cm (4,1..8,9 × 3,2..7,8), côté de droite remplacé par un
# demi-cercle de diamètre b/10. X = 100 × P = 20a + 25,7b, écrit (200a + 257b)/10.
X_D = '(200*a+257*b)/10'
F6_D = variation(
    ENONCE_F6
    + bloc(
        'figure',
        'fenetre: -1.8 ; {{eval:(2*a+b)/20+1;d}} ; -1.2 ; {{eval:b/10+1;d}}',
        'description: Un rectangle de ' + virgule('a') + ' cm sur ' + virgule('b') + ' cm dont le '
        'côté de droite est remplacé par un demi-cercle de diamètre ' + virgule('b') + ' cm.',
        '---',
        'P1 = point(0, 0, visible=faux)',
        'P2 = point({{eval:a/10;d}}, 0, visible=faux)',
        'P3 = point({{eval:a/10;d}}, {{eval:b/10;d}}, visible=faux)',
        'P4 = point(0, {{eval:b/10;d}}, visible=faux)',
        'segment(P1, P2, couleur="noir", epaisseur=2)',
        'segment(P4, P3, couleur="noir", epaisseur=2)',
        'segment(P1, P4, couleur="noir", epaisseur=2)',
        'O1 = point({{eval:a/10;d}}, {{eval:b/20;d}}, visible=faux)',
        'arc(O1, rayon={{eval:b/20;d}}, debut=-90, fin=90, couleur="noir", epaisseur=2)',
        'texte({{eval:a/20;d}}, -0.6, "' + virgule('a') + ' cm")',
        'texte(-0.9, {{eval:b/20;d}}, "' + virgule('b') + ' cm")',
    )
    + FIN_F6,
    [var('a', '41..89'), var('b', '32..78')],
    [case(arrondi(X_D), [
        erreur(arrondi('(200*a+357*b)/10'), 'Le côté de droite est remplacé par le demi-cercle : '
               'il n\'est plus sur le contour.', 'Côté de droite compté'),
        erreur(arrondi('(200*a+414*b)/10'), MSG_CERCLE, 'Cercle entier'),
        erreur(arrondi('(100*a+257*b)/10'), MSG_DEUX_L, 'Une longueur oubliée'),
    ])],
    ['**Le contour** : trois côtés du rectangle (${{eval:a/10;d}}~\\unit{cm}$, '
     '${{eval:b/10;d}}~\\unit{cm}$, ${{eval:a/10;d}}~\\unit{cm}$) et un **demi-cercle** de diamètre '
     '${{eval:b/10;d}}~\\unit{cm}$ (le côté de droite n\'est pas sur le contour).',
     'Demi-cercle : $3{,}14 \\times {{eval:b/10;d}} \\div 2 = {{eval:157*b/1000;d}}$.',
     'Périmètre : ${{eval:a/10;d}} + {{eval:b/10;d}} + {{eval:a/10;d}} + {{eval:157*b/1000;d}} = '
     '{{eval:(200*a+257*b)/1000;d}}$, soit environ $' + couleur(arrondi(X_D) + '~\\unit{cm}')
     + '$.'],
    'Fais le tour de la figure : le côté de droite est-il encore sur le contour ?',
    ['mod(a,10)!=0', 'mod(b,10)!=0'],
)

# (e) rectangle de L × l, demi-cercle de diamètre l à droite, triangle rectangle à gauche
# (côtés de l'angle droit l et t, hypoténuse h : 3-4-5 ou 6-8-10, s échelle, w sens).
# X = 100 × P = 100t + 200L + 100h + 157l.
X_E = '100*t+200*L+100*h+157*l'
F6_E = variation(
    ENONCE_F6
    + bloc(
        'figure',
        'fenetre: {{eval:-t-1.5;d}} ; {{eval:L+l/2+1;d}} ; -1.2 ; {{eval:l+1}}',
        'description: Une figure faite d\'un triangle rectangle à gauche (côtés {{t}} cm, {{l}} cm '
        'et {{h}} cm), d\'un rectangle de {{L}} cm sur {{l}} cm au milieu et d\'un demi-cercle de '
        'diamètre {{l}} cm à droite ; le côté commun au triangle et au rectangle est en '
        'pointillé.',
        '---',
        'T = point({{eval:-t}}, 0, visible=faux)',
        'P1 = point(0, 0, visible=faux)',
        'P2 = point({{L}}, 0, visible=faux)',
        'P3 = point({{L}}, {{l}}, visible=faux)',
        'P4 = point(0, {{l}}, visible=faux)',
        'segment(T, P2, couleur="noir", epaisseur=2)',
        'segment(P4, P3, couleur="noir", epaisseur=2)',
        'segment(T, P4, couleur="noir", epaisseur=2)',
        'segment(P1, P4, trait="tirets")',
        'angle(T, P1, P4, marque="carre")',
        'O1 = point({{L}}, {{eval:l/2;d}}, visible=faux)',
        'arc(O1, rayon={{eval:l/2;d}}, debut=-90, fin=90, couleur="noir", epaisseur=2)',
        'texte({{eval:-t/2;d}}, -0.6, "{{t}} cm")',
        'texte({{eval:L/2;d}}, -0.6, "{{L}} cm")',
        'texte({{eval:-t/2-0.4;d}}, {{eval:l/2+0.4;d}}, "{{h}} cm", ancre="droite")',
        'texte(0.25, {{eval:l/2;d}}, "{{l}} cm", ancre="gauche")',
    )
    + FIN_F6,
    [var('L', '4..9'), var('s', '1..2'), var('w', '0..1'), var('l', 'eval:s*(3+w)'),
     var('t', 'eval:s*(4-w)'), var('h', 'eval:5*s')],
    [case(arrondi(X_E), [
        erreur(arrondi(X_E + '+100*l'), MSG_DIAM, 'Diamètre compté'),
        erreur(arrondi(X_E + '+157*l'), MSG_CERCLE, 'Cercle entier'),
        erreur(arrondi(X_E + '-100*t'), 'Le bas du contour passe aussi sous le triangle : '
               'compte le côté de ${{t}}~\\unit{cm}$.', 'Côté du triangle oublié'),
    ])],
    ['**Le contour** : en bas, ${{t}}~\\unit{cm}$ et ${{L}}~\\unit{cm}$ ; le **demi-cercle** de '
     'diamètre ${{l}}~\\unit{cm}$ ; en haut, ${{L}}~\\unit{cm}$ ; le grand côté du triangle, '
     '${{h}}~\\unit{cm}$ (le pointillé n\'est pas sur le contour).',
     'Demi-cercle : $3{,}14 \\times {{l}} \\div 2 = {{eval:157*l/100;d}}$.',
     'Périmètre : ${{t}} + {{L}} + {{eval:157*l/100;d}} + {{L}} + {{h}} = '
     '{{eval:(' + X_E + ')/100;d}}$, soit environ $' + couleur(arrondi(X_E) + '~\\unit{cm}') + '$.'],
    'Fais le tour de la figure en comptant chaque morceau du contour une fois ; les traits '
    'intérieurs ne comptent pas.',
)

# (f) rectangle de L × l dont on a creusé, en haut, un demi-disque de diamètre d (= 2m), centré.
# L = 2n pair : les deux morceaux du haut, (L − d) / 2, sont entiers (pas de « 2.5 » dans la figure).
# X = 100 × P = 200L + 200l − 100d + 157d = 200L + 200l + 57d.
X_F = '200*L+200*l+57*d'
F6_F = variation(
    ENONCE_F6
    + bloc(
        'figure',
        'fenetre: -1.8 ; {{eval:L+1}} ; -1.2 ; {{eval:l+1.2;d}}',
        'description: Un rectangle de {{L}} cm sur {{l}} cm dont on a creusé, au milieu du côté du '
        'haut, un demi-disque de diamètre {{d}} cm ; il reste en haut deux segments de '
        '{{eval:(L-d)/2;d}} cm.',
        '---',
        'P1 = point(0, 0, visible=faux)',
        'P2 = point({{L}}, 0, visible=faux)',
        'P3 = point({{L}}, {{l}}, visible=faux)',
        'P4 = point(0, {{l}}, visible=faux)',
        'Q1 = point({{eval:(L-d)/2;d}}, {{l}}, visible=faux)',
        'Q2 = point({{eval:(L+d)/2;d}}, {{l}}, visible=faux)',
        'segment(P1, P2, couleur="noir", epaisseur=2)',
        'segment(P2, P3, couleur="noir", epaisseur=2)',
        'segment(P1, P4, couleur="noir", epaisseur=2)',
        'segment(P4, Q1, couleur="noir", epaisseur=2)',
        'segment(Q2, P3, couleur="noir", epaisseur=2)',
        'segment(Q1, Q2, trait="tirets")',
        'O1 = point({{eval:L/2;d}}, {{l}}, visible=faux)',
        'arc(O1, rayon={{m}}, debut=180, fin=360, couleur="noir", epaisseur=2)',
        'texte({{eval:L/2;d}}, -0.6, "{{L}} cm")',
        'texte(-0.9, {{eval:l/2;d}}, "{{l}} cm")',
        'texte({{eval:L/2;d}}, {{eval:l+0.5;d}}, "{{d}} cm")',
        'texte({{eval:(L-d)/4;d}}, {{eval:l+0.5;d}}, "{{eval:(L-d)/2;d}} cm")',
        'texte({{eval:(3*L+d)/4;d}}, {{eval:l+0.5;d}}, "{{eval:(L-d)/2;d}} cm")',
    )
    + FIN_F6,
    [var('n', '3..5'), var('L', 'eval:2*n'), var('l', '4..7'), var('m', '1..3'),
     var('d', 'eval:2*m')],
    [case(arrondi(X_F), [
        erreur(arrondi(X_F + '+100*d'), MSG_DIAM, 'Diamètre compté'),
        erreur(arrondi(X_F + '+157*d'), MSG_CERCLE, 'Cercle entier'),
        erreur(arrondi(X_F + '-100*l'), 'Il y a deux côtés de ${{l}}~\\unit{cm}$ sur le contour : '
               'à gauche et à droite.', 'Un côté oublié'),
    ])],
    ['**Le contour** : le côté du bas (${{L}}~\\unit{cm}$), les côtés de gauche et de droite '
     '(${{l}}~\\unit{cm}$ chacun), les deux morceaux du haut (${{eval:(L-d)/2;d}}~\\unit{cm}$ '
     'chacun) et le **demi-cercle** creusé, de diamètre ${{d}}~\\unit{cm}$ (le pointillé n\'est '
     'pas sur le contour).',
     'Demi-cercle : $3{,}14 \\times {{d}} \\div 2 = {{eval:157*d/100;d}}$.',
     'Périmètre : ${{L}} + {{l}} + {{l}} + {{eval:(L-d)/2;d}} + {{eval:(L-d)/2;d}} + '
     '{{eval:157*d/100;d}} = {{eval:(' + X_F + ')/100;d}}$, soit environ $'
     + couleur(arrondi(X_F) + '~\\unit{cm}') + '$.'],
    'Le demi-cercle creusé fait partie du contour ; le pointillé, non.',
    ['d<L-1', 'm<l'],
)

SPECS_F6 = [
    spec('Décimaux 6,3 × 4,6 : 24,4', 3, {'a': '63', 'b': '46'}, 'correct', ['24{,}4']),
    spec('Décimaux 6,3 × 4,6 : 24.4 (point) accepté', 3, {'a': '63', 'b': '46'}, 'correct',
         ['24.4']),
    spec('Décimaux : 29 (côté de droite compté)', 3, {'a': '63', 'b': '46'}, 'incorrect', ['29'],
         'Le côté de droite est remplacé par le demi-cercle : il n\'est plus sur le contour.'),
    spec('Décimaux : 31,6 (cercle entier)', 3, {'a': '63', 'b': '46'}, 'incorrect', ['31{,}6'],
         MSG_CERCLE),
    spec('Décimaux : 18,1 (une longueur oubliée)', 3, {'a': '63', 'b': '46'}, 'incorrect',
         ['18{,}1'], MSG_DEUX_L),
    spec('Triangle 4-3-5, L = 6 : 25,7', 4,
         {'L': '6', 's': '1', 'w': '0', 'l': '3', 't': '4', 'h': '5'}, 'correct', ['25{,}7']),
    spec('Triangle : 28,7 (diamètre compté)', 4,
         {'L': '6', 's': '1', 'w': '0', 'l': '3', 't': '4', 'h': '5'}, 'incorrect', ['28{,}7'],
         MSG_DIAM),
    spec('Triangle : 30,4 (cercle entier)', 4,
         {'L': '6', 's': '1', 'w': '0', 'l': '3', 't': '4', 'h': '5'}, 'incorrect', ['30{,}4'],
         MSG_CERCLE),
    spec('Triangle : 21,7 (côté du triangle oublié)', 4,
         {'L': '6', 's': '1', 'w': '0', 'l': '3', 't': '4', 'h': '5'}, 'incorrect', ['21{,}7'],
         'Le bas du contour passe aussi sous le triangle : compte le côté de $4~\\unit{cm}$.'),
    spec('Triangle 6-8-10, L = 5 : 38,6', 4,
         {'L': '5', 's': '2', 'w': '1', 'l': '8', 't': '6', 'h': '10'}, 'correct', ['38{,}6']),
    spec('Creusé 8 × 5, d = 4 : 28,3', 5, {'n': '4', 'L': '8', 'l': '5', 'm': '2', 'd': '4'}, 'correct',
         ['28{,}3']),
    spec('Creusé : 32,3 (diamètre compté)', 5, {'n': '4', 'L': '8', 'l': '5', 'm': '2', 'd': '4'},
         'incorrect', ['32{,}3'], MSG_DIAM),
    spec('Creusé : 34,6 (cercle entier)', 5, {'n': '4', 'L': '8', 'l': '5', 'm': '2', 'd': '4'},
         'incorrect', ['34{,}6'], MSG_CERCLE),
    spec('Creusé : 23,3 (un côté oublié)', 5, {'n': '4', 'L': '8', 'l': '5', 'm': '2', 'd': '4'},
         'incorrect', ['23{,}3'],
         'Il y a deux côtés de $5~\\unit{cm}$ sur le contour : à gauche et à droite.'),
]

# Seul écart à « variations et testSpecs seulement » : ccb4f5e5 n'avait que des cases choix, que la
# contrainte « products » ne juge pas ; la formule écrite P = π × D (celle du programme) serait
# « forme non optimale » sans elle (même réglage que 61ffb696, formules de 5e).
OPTIONS = {'ccb4f5e5': {'constraints': {'products': 'off'}}}

AJOUTS = {
    '060086c8': ([F1_H, F1_I], SPECS_F1),
    '66f9abbf': ([F2_H, F2_I], SPECS_F2),
    'cfb4c692': ([F3_C], SPECS_F3),
    '4343af4c': ([F4_D], SPECS_F4),
    'ccb4f5e5': ([F5_C, F5_D], SPECS_F5),
    '60f165a8': ([F6_D, F6_E, F6_F], SPECS_F6),
}

for court, (variations, specs) in AJOUTS.items():
    chemin = os.path.join(DOSSIER, court + '.json')
    with open(chemin, encoding='utf-8') as f:
        m = json.load(f)
    nv, ns = ORIGINE[court]
    if court in OPTIONS:
        # même ordre de clés que l'export (options avant variations)
        m = {k: (OPTIONS[court] if k == 'options' else m[k])
             for k in [*[c for c in m if c not in ('variations', 'testSpecs')], 'options',
                       'variations', 'testSpecs'] if k == 'options' or k in m}
    m['variations'] = m['variations'][:nv] + variations
    m['testSpecs'] = m['testSpecs'][:ns] + specs
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(AJOUTS), 'modèle(s) complété(s) dans', DOSSIER)
