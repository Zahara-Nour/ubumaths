"""Modèles neufs de la rubrique « Cercles et disques » de 6e (chantier idees-6e-cercles).

Phase 0 du 2026-11-28 (« je valide », journal docs/wip/idees-6e-cercles-progress.md) :
- N1 « Construire des cercles d'après un programme » (6-162, nœud cercle) : case figure sur papier
  uni ; le cercle de diamètre [AB] et le programme de deux cercles sont des figures composées
  (outil n° 45 : une étape par `verifier:`) ;
- N2 « Retrouver le programme d'un cercle tracé » (6-162, nœud cercle) : case choix.

Une case choix ou figure ne porte pas d'erreurs prévues (questions.md) : les erreurs typiques sont
dans les specs (refusées), et le juge de la figure écrit son propre message.

Usage : python3 docs/wip/questions/idees-6e-cercles-neufs.py scripts/questions/idees-6e-cercles-neufs
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
CERCLE = 'Géométrie > Figures planes > cercle'


def modele(title, description, level, delay, variations, specs, rangement):
    return {'rangement': rangement, 'title': title, 'description': description,
            'grades': ['6'], 'level': level, 'delay': delay, 'status': 'draft',
            'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def case(attendue):
    return {'expectedAnswer': attendue}


def variation(statement, variables, blanks, steps, hint, conditions=None):
    v = {'statement': statement, 'variables': variables, 'conditions': conditions or []}
    if blanks is not None:
        v['blanks'] = blanks
    v['correction'] = {'steps': steps}
    v['hint'] = hint
    return v


def spec(desc, vi, variables_, status, answers):
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': {'status': status}, 'answers': answers}


def couleur(contenu):
    return PRIMAIRE + '{' + contenu + '}'


def texte_couleur(contenu):
    return '$' + couleur('\\text{' + contenu + '}') + '$'


def selon(v, textes, k=0):
    if k == len(textes) - 1:
        return textes[k]
    return '{{if:' + v + '==' + str(k) + '|' + textes[k] + '|' + selon(v, textes, k + 1) + '}}'


def bloc(nom, *lignes):
    return '```' + nom + '\n' + '\n'.join(lignes) + '\n```'


def choix(options, plusieurs=False, melanger=True):
    tete = []
    if plusieurs:
        tete.append('plusieurs: oui')
    if not melanger:
        tete.append('melanger: non')
    return bloc('choix', *tete, *['- ' + o for o in options])


def fmt(x):
    return ('%g' % x)


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
# N1 — 6-162 : construire des cercles d'après un programme (papier uni, règle graduée, compas)
# =============================================================================================

# (a) centre O et diamètre D cm : le compas s'ouvre du rayon, D ÷ 2
N1_A = variation(
    'Trace le cercle de centre $O$ et de **diamètre** ${{eval:2*k}}~\\unit{cm}$.\n\n'
    '```figure-a-completer\nfenetre: 0 ; 14 ; 0 ; 14\nverifier: cercle c = cercle(O, rayon={{k}} cm)\n---\n'
    'O = point(7, 7)\n```',
    [var('k', '3..6')],
    None,
    ['**Le rayon est la moitié du diamètre** : ${{eval:2*k}} \\div 2 = ' + couleur('{{k}}~\\unit{cm}') + '$.',
     'Poser le $0$ de la règle graduée sur $O$, ouvrir le compas jusqu\'à la graduation '
     '${{k}}~\\unit{cm}$, piquer en $O$ et tracer le cercle.'],
    'Le compas s\'ouvre du rayon, pas du diamètre : combien mesure le rayon ?',
)
SPECS_N1_A = [
    spec('Diamètre 8 cm : rayon 4 cm', 0, {'k': '4'}, 'correct', ['regle(7;7;8;7;1)|cercle(7;7;11;7)']),
    spec('Diamètre 12 cm : rayon 6 cm', 0, {'k': '6'}, 'correct', ['regle(7;7;8;7;1)|cercle(7;7;13;7)']),
    spec('Erreur : diamètre 6 cm pris pour le rayon', 0, {'k': '3'}, 'incorrect', ['regle(7;7;8;7;1)|cercle(7;7;13;7)']),
    spec('Erreur : compas ouvert sans la règle', 0, {'k': '4'}, 'incorrect', ['cercle(7;7;11;7)']),
]

# (b) cercle de diamètre [AB] : le milieu I marqué à la règle graduée, puis le compas en I
AX, AY = 3, 5
N1_B = variation(
    'Trace le cercle de **diamètre** $[AB]$.\n\n'
    '```figure-a-completer\nfenetre: 0 ; 14 ; 0 ; 11\noutils: regle, compas, point\n'
    'verifier: point I = milieu(A, B)\nverifier: cercle c = cercle(I, passant=A)\n---\n'
    f'A = point({AX}, {AY})\nB = point({{{{eval:{AX}+n}}}}, {AY})\nsegment(A, B)\n```',
    [var('n', '6..10')],
    None,
    ['**Le centre d\'un cercle de diamètre $[AB]$ est le milieu de $[AB]$.** $AB = {{n}}~\\unit{cm}$ : '
     'le milieu $I$ est à ${{eval:n/2;d}}~\\unit{cm}$ de $A$, on le marque à la règle graduée.',
     'Piquer le compas en $' + couleur('I') + '$, l\'ouvrir jusqu\'à $A$ et tracer le cercle : '
     'il passe aussi par $B$.'],
    'Où est le centre d\'un cercle dont $[AB]$ est un diamètre ?',
)
SPECS_N1_B = []
for n in (6, 9):
    i = AX + n / 2
    SPECS_N1_B.append(spec(f'AB = {n} cm : milieu puis cercle', 1, {'n': str(n)}, 'correct',
                           [f'regle({AX};{AY};{AX + n};{AY};1)|point({fmt(i)};{AY})|cercle({fmt(i)};{AY};{AX};{AY})']))
SPECS_N1_B += [
    spec('Erreur : compas piqué en A, rayon AB', 1, {'n': '8'}, 'incorrect',
         [f'regle({AX};{AY};{AX + 8};{AY};1)|point(7;{AY})|cercle({AX};{AY};{AX + 8};{AY})']),
    spec('Erreur : milieu pas marqué', 1, {'n': '8'}, 'incorrect', [f'cercle(7;{AY};{AX};{AY})']),
    spec('Erreur : milieu mal placé (3,5 cm au lieu de 4 cm)', 1, {'n': '8'}, 'incorrect',
         [f'regle({AX};{AY};{AX + 8};{AY};1)|point(6.5;{AY})|cercle(6.5;{AY};{AX};{AY})']),
]

# (c) le programme de leur exercice : [CD] de n cm, puis deux cercles (figure composée : le segment
# et les cercles sont de familles différentes, chaque `verifier:` est une étape)
CX, CY = 4, 5
N1_C = variation(
    'Réalise le programme de construction :\n\n'
    '1. Trace le segment $[CD]$ de ${{n}}~\\unit{cm}$.\n'
    '2. Trace le cercle de centre $C$ et de rayon ${{r}}~\\unit{cm}$.\n'
    '3. Trace le cercle de centre $D$ qui passe par $C$.\n\n'
    '```figure-a-completer\nfenetre: -2 ; 20 ; -3 ; 13\noutils: segment, regle, compas\n'
    'verifier: segment CD = {{n}} cm\nverifier: cercle c1 = cercle(C, rayon={{r}} cm)\n'
    'verifier: cercle c2 = cercle(D, passant=C)\n---\n'
    f'C = point({CX}, {CY})\n```',
    [var('n', '6..7'), var('r', '3..5')],
    None,
    ['**Le segment** : règle graduée posée avec son $0$ sur $C$, tracer jusqu\'à ${{n}}~\\unit{cm}$ et '
     'nommer $D$ le bout.',
     '**Cercle de centre $C$** : compas ouvert sur la règle jusqu\'à ${{r}}~\\unit{cm}$, piqué en $'
     + couleur('C') + '$.',
     '**Cercle de centre $D$** : compas piqué en $' + couleur('D') + '$ et ouvert jusqu\'à $C$ : son '
     'rayon est $DC = {{n}}~\\unit{cm}$.'],
    'Pour chaque cercle : où piques-tu le compas (le centre), et jusqu\'où l\'ouvres-tu (le rayon) ?',
)


def trace_n1c(n, r, cercle2=True, echange=False):
    d = CX + n
    objets = [f'regle({CX};{CY};{d};{CY};1)', f'segment({CX};{CY};{d};{CY})',
              f'cercle({CX};{CY};{CX + r};{CY})']
    if cercle2:
        objets.append(f'cercle({CX};{CY};{d};{CY})' if echange else f'cercle({d};{CY};{CX};{CY})')
    return '|'.join(objets)


SPECS_N1_C = [
    spec('n = 6, r = 4 : le segment et les deux cercles', 2, {'n': '6', 'r': '4'}, 'correct', [trace_n1c(6, 4)]),
    spec('n = 7, r = 3 : le segment et les deux cercles', 2, {'n': '7', 'r': '3'}, 'correct', [trace_n1c(7, 3)]),
    spec('Erreur : cercle 3 de centre C passant par D (centre et point échangés)', 2, {'n': '6', 'r': '4'},
         'incorrect', [trace_n1c(6, 4, echange=True)]),
    spec('Erreur : cercle 3 oublié', 2, {'n': '6', 'r': '4'}, 'incorrect', [trace_n1c(6, 4, cercle2=False)]),
    spec('Erreur : rayon 5 cm au lieu de 4 cm', 2, {'n': '6', 'r': '4'}, 'incorrect', [trace_n1c(6, 5)]),
]

N1 = modele(
    'Construire des cercles d\'après un programme',
    'Tracer au compas un cercle de centre et de diamètre donnés, le cercle de diamètre [AB] '
    '(milieu marqué à la règle graduée), et un programme de deux cercles ; pièges : le diamètre '
    'pris pour le rayon, le compas piqué au bout du diamètre, centre et point échangés',
    3, 180, [N1_A, N1_B, N1_C], SPECS_N1_A + SPECS_N1_B + SPECS_N1_C,
    {'noeud': CERCLE, 'point': '6-162'})


# =============================================================================================
# N2 — 6-162 : retrouver le programme d'un cercle tracé
# =============================================================================================

# (a) centre A passant par B (k = 0) ou centre B passant par A (k = 1) ; [AB] tracé
N2_A = variation(
    'Comment ce cercle a-t-il été tracé ?\n\n'
    + bloc('figure', 'fenetre: -4.5 ; 8.5 ; -4.5 ; 4.5',
           'description: Un cercle, son centre marqué, et un segment [AB] dont un bout est le centre.',
           '---',
           'A = point(0, 0, etiquette="bas-gauche")',
           'B = point(4, 0, etiquette="bas-droite")',
           'segment(A, B)',
           selon('k', ['cercle(A, rayon=4, couleur="bleu", epaisseur=2)',
                       'cercle(B, rayon=4, couleur="bleu", epaisseur=2)']))
    + '\n\n' + choix(['le cercle de centre $A$ qui passe par $B$', 'le cercle de centre $B$ qui passe par $A$',
                      'le cercle de diamètre $[AB]$'], melanger=False),
    [var('k', '0..1')],
    [case('{{k}}')],
    ['**Le centre** est le point où l\'on pique le compas : il est au milieu du cercle, à la même distance de tous ses points.',
     selon('k', ['Le centre est $A$ et le cercle passe par $B$ : ' + texte_couleur('le cercle de centre A qui passe par B') + '.',
                 'Le centre est $B$ et le cercle passe par $A$ : ' + texte_couleur('le cercle de centre B qui passe par A') + '.']),
     '$[AB]$ n\'est pas un diamètre : il ne traverse pas le cercle, c\'est un rayon.'],
    'Où est le centre du cercle : en $A$, en $B$, ou ailleurs ?',
)
SPECS_N2_A = [
    spec('Centre A passant par B', 0, {'k': '0'}, 'correct', ['0']),
    spec('Erreur : centre et point échangés', 0, {'k': '0'}, 'incorrect', ['1']),
    spec('Erreur : [AB] pris pour un diamètre', 0, {'k': '0'}, 'incorrect', ['2']),
    spec('Centre B passant par A', 0, {'k': '1'}, 'correct', ['1']),
    spec('Erreur : centre B, « centre A »', 0, {'k': '1'}, 'incorrect', ['0']),
]

# (b) cercle de diamètre [AB], milieu I marqué : deux bonnes descriptions
N2_B = variation(
    'Le point $I$ est le milieu de $[AB]$. Quelles phrases décrivent ce cercle ?\n\n'
    + bloc('figure', 'fenetre: -4 ; 4 ; -3.6 ; 3.6',
           'description: Un cercle, un segment [AB] qui le traverse en passant par son milieu I.',
           '---',
           'I = point(0, 0, etiquette="bas")',
           'A = point(I, longueur=3, angle={{t}}, etiquette="gauche")',
           'B = point(I, longueur=3, angle={{eval:t+180}}, etiquette="droite")',
           'cercle(I, rayon=3, couleur="bleu", epaisseur=2)',
           'segment(A, B)')
    + '\n\n' + choix(['le cercle de diamètre $[AB]$', 'le cercle de centre $A$ qui passe par $B$',
                      'le cercle de centre $I$ et de rayon $AB$', 'le cercle de centre $I$ qui passe par $B$'],
                     plusieurs=True),
    [var('t', '150..210')],
    [case('0;3')],
    ['$[AB]$ traverse le cercle en passant par son centre $I$ : c\'est ' + texte_couleur('un diamètre') + '.',
     'Le cercle a pour centre $I$ et passe par $A$ et par $B$ : c\'est aussi '
     + texte_couleur('le cercle de centre I qui passe par B') + '.',
     'Son rayon est $IA$, la **moitié** de $AB$, pas $AB$.'],
    'Où est le centre ? Et le rayon, est-ce $AB$ ou sa moitié ?',
)
SPECS_N2_B = [
    spec('Diamètre [AB] et centre I passant par B', 1, {'t': '180'}, 'correct', ['0;3']),
    spec('Le diamètre seulement : la moitié', 1, {'t': '180'}, 'unoptimal_form', ['0']),
    spec('Erreur : rayon AB au lieu de sa moitié', 1, {'t': '180'}, 'incorrect', ['0;2;3']),
    spec('Erreur : centre A', 1, {'t': '160'}, 'incorrect', ['1']),
]

# (c) cercle de centre O, un diamètre tracé et coté d cm : rayon d ÷ 2, diamètre d
N2_C = variation(
    'Quelles phrases décrivent ce cercle ?\n\n'
    + bloc('figure', 'fenetre: -4 ; 4 ; -3.6 ; 3.6',
           'description: Un cercle de centre O ; un diamètre [EF] tracé, sa longueur écrite.',
           '---',
           'O = point(0, 0, etiquette="bas")',
           'E = point(-3, 0, etiquette="gauche")',
           'F = point(3, 0, etiquette="droite")',
           'cercle(O, rayon=3, couleur="bleu", epaisseur=2)',
           'segment(E, F)',
           'texte(0, 0.45, "{{eval:2*k}} cm")')
    + '\n\n' + choix(['le cercle de centre $O$ et de rayon ${{k}}~\\unit{cm}$',
                      'le cercle de centre $O$ et de rayon ${{eval:2*k}}~\\unit{cm}$',
                      'le cercle de centre $O$ et de diamètre ${{k}}~\\unit{cm}$',
                      'le cercle de centre $O$ et de diamètre ${{eval:2*k}}~\\unit{cm}$'], plusieurs=True),
    [var('k', '2..6')],
    [case('0;3')],
    ['$[EF]$ passe par le centre $O$ : c\'est un diamètre, il mesure ' + texte_couleur('{{eval:2*k}} cm') + '.',
     'Le rayon est la moitié du diamètre : ${{eval:2*k}} \\div 2 = ' + couleur('{{k}}~\\unit{cm}') + '$.'],
    'La longueur écrite est celle de $[EF]$ : est-ce un rayon ou un diamètre ?',
)
SPECS_N2_C = [
    spec('Rayon 4 cm et diamètre 8 cm', 2, {'k': '4'}, 'correct', ['0;3']),
    spec('Erreur : le diamètre pris pour le rayon', 2, {'k': '4'}, 'incorrect', ['1']),
    spec('Erreur : rayon 4 cm et diamètre 4 cm', 2, {'k': '4'}, 'incorrect', ['0;2']),
    spec('Une seule des deux : la moitié', 2, {'k': '5'}, 'unoptimal_form', ['3']),
]

N2 = modele(
    'Retrouver le programme d\'un cercle tracé',
    'Décrire un cercle tracé par son centre et un point, son diamètre, ou son rayon : centre et '
    'point de passage, cercle de diamètre [AB] (centre au milieu), rayon moitié du diamètre ; '
    'pièges : centre et point échangés, rayon pris égal au diamètre',
    2, 60, [N2_A, N2_B, N2_C], SPECS_N2_A + SPECS_N2_B + SPECS_N2_C,
    {'noeud': CERCLE, 'point': '6-162'})


ecrire('n1-construire-des-cercles', N1)
ecrire('n2-retrouver-le-programme-d-un-cercle', N2)
print('2 modèles écrits dans', DOSSIER)
