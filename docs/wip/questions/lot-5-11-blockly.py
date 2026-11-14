"""Écrit les 6 modèles du lot 11 « Blockly » de la 5e dans scripts/questions/5-lot11/.

Lot porté par le chantier `blockly` (journal docs/wip/blockly-progress.md § Premiers modèles,
David le 2026-11-14 : « je te suis ») ; un point par modèle (ADR 0020) :

| #  | Point | Titre | Geste | Nœud, niveau |
| 01 | 5-100 | Séquencer des instructions (tortue) | tortue, montrer | Variables et instructions, 1 |
| 02 | 5-102 | Écrire une formule en blocs | calcul | Variables et instructions, 1 |
| 03 | 5-103 | Programme de calcul en étapes | calcul | Variables et instructions, 2 |
| 04 | 5-105 | Modifier un programme de calcul | calcul, départ | Variables et instructions, 2 |
| 05 | 5-105 | Modifier un tracé | tortue, départ | Variables et instructions, 2 |
| 06 | 5-106 | Répéter des instructions | tortue, montrer | Boucles › boucle bornée, 1 |

Règles du lot :
- les gestes `calcul` et ```tortue portent LEUR case (posée par le générateur) : ni `blanks` ni
  `?` ; la réponse d'une spec est le programme de l'élève en notation texte ;
- jugement par ce que le programme affiche (calcul) ou trace (tortue), pas par son écriture : les
  specs `correct` montrent des écritures différentes de la référence ;
- tortue : `montrer: oui` → `comparer: position` (l'élève recouvre la figure grise) ;
  figure décrite en mots ou départ donné → `comparer: forme` (même figure n'importe où, tournée ou
  retournée : un rectangle 3 × 6 est juste pour 6 × 3) ;
- quadrillage 20 × 20, tortue au centre : chaque figure tient dans 8 carreaux de chaque côté ;
- 5-106 : la correction n'impose pas la boucle (décision (a)) ; les créneaux la rendent presque
  nécessaire ;
- variables : jamais `e` ni `i` ; `départ` différent de la cible (conditions).

    python3 docs/wip/questions/lot-5-11-blockly.py scripts/questions/5-lot11
"""
import json
import os
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(nom, title, description, level, variations, specs, delay=300):
    # Ni theme, ni domain, ni subdomain (ADR 0035) ; nœud et tag posés par la migration.
    return nom, {'title': title, 'description': description, 'grades': ['5'], 'level': level,
                 'delay': delay, 'status': 'draft', 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, steps, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': [], 'correction': {'steps': steps}}


def bloc(nom, *lignes):
    return '```' + nom + '\n' + '\n'.join(lignes) + '\n```'


def different(a, b):
    return f'({a}-{b})*({a}-{b}) > 0'


MODELES = []

# --- 01. 5-100 : séquencer des instructions (tortue, sans boucle) ------------------------------

L_REF = 'tourner à droite 90 ; avancer {{a}} ; tourner à gauche 90 ; avancer {{b}}'
T_REF = ('avancer {{a}} ; tourner à droite 90 ; avancer {{h}} ; reculer {{h}} ; '
         'tourner à gauche 90 ; avancer {{a}}')
Z_REF = ('tourner à gauche 45 ; avancer {{a}} ; tourner à droite 90 ; avancer {{a}} ; '
         'tourner à gauche 90 ; avancer {{a}} ; tourner à droite 90 ; avancer {{a}}')

SEQ_L = variation(
    'Fais tracer à la tortue la lettre **L** dessinée en gris : elle descend de ${{a}}$ carreaux,'
    ' puis va vers la droite sur ${{b}}$ carreaux.\n\n'
    + bloc('tortue', 'attendu: ' + L_REF, 'montrer: oui'),
    [var('a', '3..6'), var('b', '2..4')],
    ['La tortue regarde vers la droite : elle tourne d\'abord d\'un quart de tour à droite pour'
     ' regarder vers le bas.',
     'Elle avance de ${{a}}$, tourne d\'un quart de tour à gauche (elle regarde de nouveau vers la'
     ' droite), puis avance de ${{b}}$.',
     'L\'ordre compte : en avançant avant de tourner, la tortue tracerait un autre L.'],
    [different('a', 'b')])
SEQ_T = variation(
    'Fais tracer à la tortue la lettre **T** dessinée en gris : une barre de ${{d}}$ carreaux,'
    ' et une jambe de ${{h}}$ carreaux qui descend du milieu de la barre.\n\n'
    + bloc('tortue', 'attendu: ' + T_REF, 'montrer: oui'),
    [var('a', '2..4'), var('h', '3..5'), var('d', 'eval:2*a')],
    ['La tortue avance de ${{a}}$ jusqu\'au milieu de la barre.',
     'Elle tourne à droite, descend de ${{h}}$ pour tracer la jambe, puis **recule** de ${{h}}$'
     ' pour remonter au milieu de la barre.',
     'Elle tourne à gauche et avance encore de ${{a}}$ pour finir la barre.'])
SEQ_Z = variation(
    'Fais tracer à la tortue le zigzag dessiné en gris. Elle commence par tourner de $45°$ vers la'
    ' gauche ; chaque trait mesure ${{a}}$ carreaux et chaque coin est un angle droit.\n\n'
    + bloc('tortue', 'attendu: ' + Z_REF, 'montrer: oui'),
    [var('a', '2..3')],
    ['La tortue tourne de $45°$ à gauche et avance de ${{a}}$ : premier trait, qui monte.',
     'Pour redescendre, elle tourne de $90°$ **à droite** ; pour remonter, de $90°$ **à gauche**.',
     'Le zigzag a $4$ traits : avancer, droite, avancer, gauche, avancer, droite, avancer.'])

MODELES.append(modele(
    '01-sequencer-des-instructions', 'Séquencer des instructions (tortue)',
    'Faire tracer à la tortue une lettre L, une lettre T ou un zigzag, sans boucle.', 1,
    [SEQ_L, SEQ_T, SEQ_Z],
    [spec('L : programme de référence', 0, {'a': 4, 'b': 3},
          L_REF.replace('{{a}}', '4').replace('{{b}}', '3'), 'correct'),
     spec('L tracé dans l\'autre sens (du bout de la barre vers le haut)', 0, {'a': 4, 'b': 3},
          'lever le stylo ; tourner à droite 90 ; avancer 4 ; tourner à gauche 90 ; avancer 3 ; '
          'baisser le stylo ; reculer 3 ; tourner à gauche 90 ; avancer 4', 'correct'),
     spec('Erreur : avance avant de tourner', 0, {'a': 4, 'b': 3},
          'avancer 4 ; tourner à droite 90 ; avancer 3', 'incorrect'),
     spec('Erreur : tourne à gauche (L vers le haut)', 0, {'a': 4, 'b': 3},
          'tourner à gauche 90 ; avancer 4 ; tourner à droite 90 ; avancer 3', 'incorrect'),
     spec('T : programme de référence', 1, {'a': 3, 'h': 4, 'd': 6},
          'avancer 3 ; tourner à droite 90 ; avancer 4 ; reculer 4 ; tourner à gauche 90 ; '
          'avancer 3', 'correct'),
     spec('T : la barre d\'abord, puis la jambe', 1, {'a': 3, 'h': 4, 'd': 6},
          'avancer 6 ; reculer 3 ; tourner à droite 90 ; avancer 4', 'correct'),
     spec('Erreur : jambe au bout de la barre', 1, {'a': 3, 'h': 4, 'd': 6},
          'avancer 6 ; tourner à droite 90 ; avancer 4', 'incorrect'),
     spec('Zigzag : programme de référence', 2, {'a': 2},
          Z_REF.replace('{{a}}', '2'), 'correct'),
     spec('Erreur : tourne toujours à droite (escalier fermé)', 2, {'a': 2},
          'tourner à gauche 45 ; avancer 2 ; tourner à droite 90 ; avancer 2 ; '
          'tourner à droite 90 ; avancer 2 ; tourner à droite 90 ; avancer 2', 'incorrect')]))

# --- 02. 5-102 : écrire une formule en blocs (calcul) ------------------------------------------

F_AFFINE = 'afficher {{a}} × nombre + {{b}}'
F_FACTEUR = 'afficher (nombre + {{a}}) × {{b}}'
F_CARRE = 'afficher nombre × nombre − {{a}}'

FORMULE_INTRO = ('Écris un programme qui affiche la valeur de ${F}$, où $x$ est le **nombre'
                 ' choisi**.\n\n')

FORM_AFFINE = variation(
    FORMULE_INTRO.replace('{F}', '{{a}}x + {{b}}') + bloc('calcul', 'attendu: ' + F_AFFINE),
    [var('a', '2..9'), var('b', '1..12')],
    ['${{a}}x$, c\'est ${{a}} \\times x$ : en blocs, ${{a}}$ × nombre choisi.',
     'On ajoute ${{b}}$ : la multiplication se fait d\'abord, sans parenthèses.',
     'Un programme juste : afficher ${{a}}$ × nombre $+\\ {{b}}$.'])
FORM_FACTEUR = variation(
    FORMULE_INTRO.replace('{F}', '{{b}}(x + {{a}})') + bloc('calcul', 'attendu: ' + F_FACTEUR),
    [var('a', '1..9'), var('b', '2..9')],
    ['${{b}}(x + {{a}})$, c\'est ${{b}} \\times (x + {{a}})$ : on calcule d\'abord $x + {{a}}$.',
     'En blocs, le bloc « nombre $+\\ {{a}}$ » se place **dans** le bloc de multiplication : il'
     ' joue le rôle des parenthèses.',
     'Sans cela, nombre $+\\ {{a}} \\times {{b}}$ multiplierait seulement ${{a}}$ par ${{b}}$.'])
FORM_CARRE = variation(
    FORMULE_INTRO.replace('{F}', 'x^2 - {{a}}') + bloc('calcul', 'attendu: ' + F_CARRE),
    [var('a', '1..12')],
    ['$x^2$, c\'est $x \\times x$ : le nombre choisi multiplié par lui-même (et non $2 \\times x$).',
     'On soustrait ensuite ${{a}}$.',
     'Un programme juste : afficher nombre × nombre $-\\ {{a}}$.'])

MODELES.append(modele(
    '02-ecrire-une-formule-en-blocs', 'Écrire une formule en blocs',
    'Traduire une formule (ax + b, b(x + a), x² − a) en programme de calcul par blocs.', 1,
    [FORM_AFFINE, FORM_FACTEUR, FORM_CARRE],
    [spec('3x + 5 : référence', 0, {'a': 3, 'b': 5}, 'afficher 3 × nombre + 5', 'correct'),
     spec('3x + 5 : écrit nombre × 3 + 5', 0, {'a': 3, 'b': 5}, 'afficher nombre × 3 + 5',
          'correct'),
     spec('3x + 5 : en deux étapes avec résultat', 0, {'a': 3, 'b': 5},
          'mettre résultat à nombre × 3 ; mettre résultat à résultat + 5 ; afficher résultat',
          'correct'),
     spec('Erreur : 3 + 5x (coefficients inversés)', 0, {'a': 3, 'b': 5},
          'afficher 3 + nombre × 5', 'incorrect'),
     spec('Erreur : (nombre + 5) × 3', 0, {'a': 3, 'b': 5}, 'afficher (nombre + 5) × 3',
          'incorrect'),
     spec('4(x + 2) : référence', 1, {'a': 2, 'b': 4}, 'afficher (nombre + 2) × 4', 'correct'),
     spec('4(x + 2) : développé', 1, {'a': 2, 'b': 4}, 'afficher nombre × 4 + 8', 'correct'),
     spec('Erreur : parenthèses oubliées', 1, {'a': 2, 'b': 4}, 'afficher nombre + 2 × 4',
          'incorrect'),
     spec('x² − 7 : référence', 2, {'a': 7}, 'afficher nombre × nombre − 7', 'correct'),
     spec('Erreur : x² lu 2x', 2, {'a': 7}, 'afficher nombre × 2 − 7', 'incorrect'),
     spec('Erreur : x × (x − 7)', 2, {'a': 7}, 'afficher nombre × (nombre − 7)', 'incorrect')]))

# --- 03. 5-103 : programme de calcul donné en étapes (calcul) ----------------------------------


def etapes(*lignes):
    return '\n'.join(f'{k}. {l}' for k, l in enumerate(lignes, 1))


ETAPES_INTRO = 'Écris en blocs le programme de calcul suivant.\n\n'

E2 = variation(
    ETAPES_INTRO + etapes('Choisir un nombre.', 'Le multiplier par ${{a}}$.',
                          'Soustraire ${{b}}$.', 'Afficher le résultat.') + '\n\n'
    + bloc('calcul', 'attendu: mettre résultat à nombre × {{a}} ; '
           'mettre résultat à résultat − {{b}} ; afficher résultat'),
    [var('a', '2..9'), var('b', '1..9')],
    ['On range chaque étape dans **résultat** : d\'abord nombre × ${{a}}$.',
     'Puis résultat $-\\ {{b}}$, que l\'on range de nouveau dans résultat, et on l\'affiche.',
     'Afficher directement nombre × ${{a}} - {{b}}$ est juste aussi.'])
E3 = variation(
    ETAPES_INTRO + etapes('Choisir un nombre.', 'Lui ajouter ${{a}}$.',
                          'Multiplier le résultat par ${{b}}$.', 'Soustraire ${{c}}$.',
                          'Afficher le résultat.') + '\n\n'
    + bloc('calcul', 'attendu: mettre résultat à nombre + {{a}} ; '
           'mettre résultat à résultat × {{b}} ; mettre résultat à résultat − {{c}} ; '
           'afficher résultat'),
    [var('a', '1..9'), var('b', '2..9'), var('c', '1..9')],
    ['Étape par étape : résultat prend la valeur nombre $+\\ {{a}}$, puis résultat × ${{b}}$,'
     ' puis résultat $-\\ {{c}}$.',
     'L\'ordre des étapes compte : multiplier avant d\'ajouter donnerait un autre programme.',
     'En une ligne : afficher $($nombre $+\\ {{a}}) \\times {{b}} - {{c}}$.'])
E4 = variation(
    ETAPES_INTRO + etapes('Choisir un nombre.', 'Lui soustraire ${{a}}$.',
                          'Multiplier le résultat par le nombre choisi.', 'Ajouter ${{b}}$.',
                          'Afficher le résultat.') + '\n\n'
    + bloc('calcul', 'attendu: mettre résultat à nombre − {{a}} ; '
           'mettre résultat à résultat × nombre ; mettre résultat à résultat + {{b}} ; '
           'afficher résultat'),
    [var('a', '1..9'), var('b', '1..9')],
    ['Résultat prend la valeur nombre $-\\ {{a}}$.',
     'On le multiplie par le **nombre choisi** (le bloc « nombre choisi », pas un nombre écrit).',
     'On ajoute ${{b}}$ et on affiche : en une ligne, $($nombre $-\\ {{a}}) \\times$ nombre'
     ' $+\\ {{b}}$.'])

MODELES.append(modele(
    '03-programme-de-calcul-en-etapes', 'Programme de calcul en étapes',
    'Écrire en blocs un programme de calcul donné étape par étape (2 à 4 étapes).', 2,
    [E2, E3, E4],
    [spec('×4 puis −3 : avec résultat', 0, {'a': 4, 'b': 3},
          'mettre résultat à nombre × 4 ; mettre résultat à résultat − 3 ; afficher résultat',
          'correct'),
     spec('×4 puis −3 : en une ligne', 0, {'a': 4, 'b': 3}, 'afficher nombre × 4 − 3', 'correct'),
     spec('Erreur : étapes inversées', 0, {'a': 4, 'b': 3}, 'afficher (nombre − 3) × 4',
          'incorrect'),
     spec('Erreur : rien d\'affiché', 0, {'a': 4, 'b': 3},
          'mettre résultat à nombre × 4 ; mettre résultat à résultat − 3', 'incorrect'),
     spec('+2, ×5, −1 : avec résultat', 1, {'a': 2, 'b': 5, 'c': 1},
          'mettre résultat à nombre + 2 ; mettre résultat à résultat × 5 ; '
          'mettre résultat à résultat − 1 ; afficher résultat', 'correct'),
     spec('+2, ×5, −1 : développé', 1, {'a': 2, 'b': 5, 'c': 1}, 'afficher nombre × 5 + 9',
          'correct'),
     spec('Erreur : parenthèses oubliées', 1, {'a': 2, 'b': 5, 'c': 1},
          'afficher nombre + 2 × 5 − 1', 'incorrect'),
     spec('Erreur : chaque étape repart du nombre choisi', 1, {'a': 2, 'b': 5, 'c': 1},
          'mettre résultat à nombre + 2 ; mettre résultat à nombre × 5 ; '
          'mettre résultat à nombre − 1 ; afficher résultat', 'incorrect'),
     spec('−3, × nombre, +6 : avec résultat', 2, {'a': 3, 'b': 6},
          'mettre résultat à nombre − 3 ; mettre résultat à résultat × nombre ; '
          'mettre résultat à résultat + 6 ; afficher résultat', 'correct'),
     spec('−3, × nombre, +6 : en une ligne', 2, {'a': 3, 'b': 6},
          'afficher (nombre − 3) × nombre + 6', 'correct'),
     spec('Erreur : multiplie par le résultat (au carré)', 2, {'a': 3, 'b': 6},
          'mettre résultat à nombre − 3 ; mettre résultat à résultat × résultat ; '
          'mettre résultat à résultat + 6 ; afficher résultat', 'incorrect')]))

# --- 04. 5-105 : modifier un programme de calcul (départ) --------------------------------------

M_UN = variation(
    'Le programme posé dans l\'espace de travail multiplie le nombre choisi par ${{p}}$, puis'
    ' ajoute ${{q}}$.\n\nModifie-le pour qu\'il multiplie par ${{a}}$, puis ajoute ${{b}}$.\n\n'
    + bloc('calcul', 'attendu: afficher nombre × {{a}} + {{b}}',
           'départ: afficher nombre × {{p}} + {{q}}'),
    [var('p', '2..5'), var('q', '1..9'), var('a', '6..9'), var('b', '1..9')],
    ['Il suffit de changer les deux nombres écrits dans les blocs : ${{p}}$ devient ${{a}}$ et'
     ' ${{q}}$ devient ${{b}}$.',
     'Le reste du programme (nombre choisi, × , +, afficher) ne change pas.'],
    [different('q', 'b')])
M_OP = variation(
    'Le programme posé dans l\'espace de travail ajoute ${{p}}$ au nombre choisi, multiplie le'
    ' résultat par ${{q}}$, puis l\'affiche.\n\nModifie-le pour qu\'il **soustraie** ${{a}}$ au'
    ' nombre choisi au lieu d\'ajouter ${{p}}$ ; la multiplication par ${{q}}$ ne change pas.\n\n'
    + bloc('calcul', 'attendu: mettre résultat à nombre − {{a}} ; '
           'mettre résultat à résultat × {{q}} ; afficher résultat',
           'départ: mettre résultat à nombre + {{p}} ; mettre résultat à résultat × {{q}} ; '
           'afficher résultat'),
    [var('p', '1..9'), var('q', '2..9'), var('a', '1..9')],
    ['Dans le premier bloc, on remplace l\'opération $+$ par $-$, et ${{p}}$ par ${{a}}$.',
     'Les deux autres blocs ne changent pas : résultat × ${{q}}$, puis afficher résultat.'])

MODELES.append(modele(
    '04-modifier-un-programme-de-calcul', 'Modifier un programme de calcul',
    'Changer les nombres ou une opération d\'un programme de calcul donné en blocs.', 2,
    [M_UN, M_OP],
    [spec('Nombres changés', 0, {'p': 3, 'q': 4, 'a': 7, 'b': 2}, 'afficher nombre × 7 + 2',
          'correct'),
     spec('Erreur : programme de départ laissé tel quel', 0, {'p': 3, 'q': 4, 'a': 7, 'b': 2},
          'afficher nombre × 3 + 4', 'incorrect'),
     spec('Erreur : un seul nombre changé', 0, {'p': 3, 'q': 4, 'a': 7, 'b': 2},
          'afficher nombre × 7 + 4', 'incorrect'),
     spec('Erreur : nombres échangés', 0, {'p': 3, 'q': 4, 'a': 7, 'b': 2},
          'afficher nombre × 2 + 7', 'incorrect'),
     spec('Opération changée', 1, {'p': 5, 'q': 3, 'a': 2},
          'mettre résultat à nombre − 2 ; mettre résultat à résultat × 3 ; afficher résultat',
          'correct'),
     spec('Opération changée, en une ligne', 1, {'p': 5, 'q': 3, 'a': 2},
          'afficher (nombre − 2) × 3', 'correct'),
     spec('Erreur : soustrait après la multiplication', 1, {'p': 5, 'q': 3, 'a': 2},
          'mettre résultat à nombre × 3 ; mettre résultat à résultat − 2 ; afficher résultat',
          'incorrect'),
     spec('Erreur : nombre changé mais pas l\'opération', 1, {'p': 5, 'q': 3, 'a': 2},
          'mettre résultat à nombre + 2 ; mettre résultat à résultat × 3 ; afficher résultat',
          'incorrect')]))

# --- 05. 5-105 : modifier un tracé (tortue, départ) --------------------------------------------

MT_CARRE = variation(
    'Le programme posé dans l\'espace de travail fait tracer à la tortue un carré de côté $3$.'
    '\n\nModifie-le pour qu\'elle trace un carré de côté ${{c}}$.\n\n'
    + bloc('tortue', 'attendu: répéter 4 [ avancer {{c}} ; tourner à gauche 90 ]',
           'comparer: forme', 'départ: répéter 4 [ avancer 3 ; tourner à gauche 90 ]'),
    [var('c', '4..7')],
    ['Le côté du carré, c\'est la longueur dont la tortue avance : on change $3$ en ${{c}}$.',
     'On ne touche ni à « répéter $4$ » (un carré a $4$ côtés) ni à l\'angle de $90°$.'])
MT_RECT = variation(
    'Le programme posé dans l\'espace de travail fait tracer à la tortue un rectangle de $4$'
    ' carreaux sur $2$.\n\nModifie-le pour qu\'elle trace un rectangle de ${{l}}$ carreaux sur'
    ' ${{h}}$.\n\n'
    + bloc('tortue',
           'attendu: répéter 2 [ avancer {{l}} ; tourner à gauche 90 ; avancer {{h}} ; '
           'tourner à gauche 90 ]',
           'comparer: forme',
           'départ: répéter 2 [ avancer 4 ; tourner à gauche 90 ; avancer 2 ; '
           'tourner à gauche 90 ]'),
    [var('l', '5..8'), var('h', '3..4')],
    ['Dans la boucle, la tortue trace une longueur puis une largeur : $4$ devient ${{l}}$ et'
     ' $2$ devient ${{h}}$.',
     'La boucle est répétée $2$ fois : chaque côté est tracé deux fois, comme il se doit dans un'
     ' rectangle.'])

MODELES.append(modele(
    '05-modifier-un-trace', 'Modifier un tracé',
    'Changer les longueurs d\'un programme tortue donné (carré, rectangle).', 2,
    [MT_CARRE, MT_RECT],
    [spec('Carré de côté 5', 0, {'c': 5}, 'répéter 4 [ avancer 5 ; tourner à gauche 90 ]',
          'correct'),
     spec('Carré de côté 5 tourné à droite (même forme)', 0, {'c': 5},
          'répéter 4 [ avancer 5 ; tourner à droite 90 ]', 'correct'),
     spec('Erreur : départ laissé tel quel', 0, {'c': 5},
          'répéter 4 [ avancer 3 ; tourner à gauche 90 ]', 'incorrect'),
     spec('Erreur : répète 5 au lieu d\'avancer de 5', 0, {'c': 5},
          'répéter 5 [ avancer 3 ; tourner à gauche 90 ]', 'incorrect'),
     spec('Rectangle 6 × 3', 1, {'l': 6, 'h': 3},
          'répéter 2 [ avancer 6 ; tourner à gauche 90 ; avancer 3 ; tourner à gauche 90 ]',
          'correct'),
     spec('Rectangle 3 × 6 (même rectangle, debout)', 1, {'l': 6, 'h': 3},
          'répéter 2 [ avancer 3 ; tourner à gauche 90 ; avancer 6 ; tourner à gauche 90 ]',
          'correct'),
     spec('Erreur : une seule longueur changée', 1, {'l': 6, 'h': 3},
          'répéter 2 [ avancer 6 ; tourner à gauche 90 ; avancer 2 ; tourner à gauche 90 ]',
          'incorrect'),
     spec('Erreur : boucle répétée une seule fois', 1, {'l': 6, 'h': 3},
          'avancer 6 ; tourner à gauche 90 ; avancer 3 ; tourner à gauche 90', 'incorrect')]))

# --- 06. 5-106 : répéter des instructions (tortue, boucle) -------------------------------------

R_CARRE = 'répéter 4 [ avancer {{c}} ; tourner à gauche 90 ]'
R_ESCALIER = 'répéter {{n}} [ tourner à gauche 90 ; avancer {{s}} ; tourner à droite 90 ; avancer {{s}} ]'
R_CRENEAUX = ('répéter {{n}} [ tourner à gauche 90 ; avancer {{h}} ; tourner à droite 90 ; '
              'avancer 1 ; tourner à droite 90 ; avancer {{h}} ; tourner à gauche 90 ; avancer 1 ]')

REP_CARRE = variation(
    'Fais tracer à la tortue le carré dessiné en gris, de côté ${{c}}$, en utilisant le bloc'
    ' **répéter**.\n\n' + bloc('tortue', 'attendu: ' + R_CARRE, 'montrer: oui'),
    [var('c', '2..6')],
    ['Un côté se trace en deux instructions : avancer ${{c}}$, puis tourner d\'un quart de tour à'
     ' gauche.',
     'Le carré a $4$ côtés : on répète ces deux instructions $4$ fois.',
     'Un programme juste : répéter $4$ [ avancer ${{c}}$ ; tourner à gauche $90$ ].'])
REP_ESCALIER = variation(
    'Fais tracer à la tortue l\'escalier dessiné en gris : ${{n}}$ marches de ${{s}}$'
    ' {{if:s==1|carreau|carreaux}} de haut et de large. Utilise le bloc **répéter**.\n\n'
    + bloc('tortue', 'attendu: ' + R_ESCALIER, 'montrer: oui'),
    [var('n', '3..5'), var('s', '1..2')],
    ['Une marche : monter (tourner à gauche, avancer ${{s}}$), puis aller vers la droite (tourner'
     ' à droite, avancer ${{s}}$).',
     'On répète cette marche ${{n}}$ fois.',
     'Un programme juste : répéter ${{n}}$ [ tourner à gauche $90$ ; avancer ${{s}}$ ; tourner à'
     ' droite $90$ ; avancer ${{s}}$ ].'],
    ['n*s <= 8'])
REP_CRENEAUX = variation(
    'Fais tracer à la tortue les créneaux dessinés en gris : ${{n}}$ créneaux de ${{h}}$'
    ' {{if:h==1|carreau|carreaux}} de haut, chacun suivi d\'un creux de $1$ carreau. Utilise le'
    ' bloc **répéter**.\n\n' + bloc('tortue', 'attendu: ' + R_CRENEAUX, 'montrer: oui'),
    [var('n', '3..4'), var('h', '1..3')],
    ['Un créneau : monter de ${{h}}$, avancer de $1$, redescendre de ${{h}}$, avancer de $1$ (le'
     ' creux).',
     'Les angles : à gauche pour monter, à droite deux fois (en haut puis pour redescendre), à'
     ' gauche pour repartir vers la droite.',
     'On répète ce motif ${{n}}$ fois.'])

MODELES.append(modele(
    '06-repeter-des-instructions', 'Répéter des instructions (tortue)',
    'Faire tracer un carré, un escalier ou des créneaux avec le bloc répéter.', 1,
    [REP_CARRE, REP_ESCALIER, REP_CRENEAUX],
    [spec('Carré : avec répéter', 0, {'c': 4}, R_CARRE.replace('{{c}}', '4'), 'correct'),
     spec('Carré : sans répéter (8 blocs, juste aussi)', 0, {'c': 4},
          'avancer 4 ; tourner à gauche 90 ; avancer 4 ; tourner à gauche 90 ; avancer 4 ; '
          'tourner à gauche 90 ; avancer 4', 'correct'),
     spec('Erreur : répète 3 fois', 0, {'c': 4}, 'répéter 3 [ avancer 4 ; tourner à gauche 90 ]',
          'incorrect'),
     spec('Erreur : tourne à droite (carré en dessous)', 0, {'c': 4},
          'répéter 4 [ avancer 4 ; tourner à droite 90 ]', 'incorrect'),
     spec('Escalier : avec répéter', 1, {'n': 4, 's': 2},
          R_ESCALIER.replace('{{n}}', '4').replace('{{s}}', '2'), 'correct'),
     spec('Erreur : une marche de trop', 1, {'n': 4, 's': 2},
          R_ESCALIER.replace('{{n}}', '5').replace('{{s}}', '2'), 'incorrect'),
     spec('Erreur : avance avant de monter (marches décalées)', 1, {'n': 4, 's': 2},
          'répéter 4 [ avancer 2 ; tourner à gauche 90 ; avancer 2 ; tourner à droite 90 ]',
          'incorrect'),
     spec('Créneaux : avec répéter', 2, {'n': 3, 'h': 2},
          R_CRENEAUX.replace('{{n}}', '3').replace('{{h}}', '2'), 'correct'),
     spec('Erreur : creux oublié', 2, {'n': 3, 'h': 2},
          'répéter 3 [ tourner à gauche 90 ; avancer 2 ; tourner à droite 90 ; avancer 1 ; '
          'tourner à droite 90 ; avancer 2 ; tourner à gauche 90 ]', 'incorrect')]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    chemin = os.path.join(DOSSIER, nom + '.json')
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(chemin)
