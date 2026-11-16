"""Écrit les 2 modèles du lot « Blockly » de la 6e dans scripts/questions/6-blockly/.

Lot porté par le chantier `blockly` (journal docs/archive/wip/blockly-progress.md § Premiers modèles,
David le 2026-11-14 : « je te suis ») ; un point par modèle (ADR 0020) :

| #  | Point | Titre | Geste | Niveau |
| 01 | 6-197 | Programmer un chemin sur quadrillage | tortue, montrer | 1 |
| 02 | 6-210 | Programme pour un résultat donné | calcul, un seul essai | 1 |

Règles du lot (celles du lot 11 de la 5e, lot-5-11-blockly.py) :
- les gestes `calcul` et ```tortue portent LEUR case : ni `blanks` ni `?` ; la réponse d'une spec
  est le programme de l'élève en notation texte ;
- tortue : `montrer: oui` (l'élève recouvre le chemin gris, même endroit) ; sans boucle ;
  quadrillage 20 × 20, tortue au centre, tournée vers la droite : chaque chemin tient dans
  8 carreaux de chaque côté ;
- 6-210 : `essais:` d'un seul nombre (le nombre de l'énoncé) : tout programme qui affiche le
  résultat demandé pour ce nombre est juste, s'il dépend du nombre choisi (`afficher 10` est
  faux : règle du jugement des cases calcul, David le 2026-11-15) ;
- variables : jamais `e` ni `i`.

    python3 docs/wip/questions/lot-6-blockly.py scripts/questions/6-blockly
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
    return nom, {'title': title, 'description': description, 'grades': ['6'], 'level': level,
                 'delay': delay, 'status': 'draft', 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, steps, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': [], 'correction': {'steps': steps}}


def bloc(nom, *lignes):
    return '```' + nom + '\n' + '\n'.join(lignes) + '\n```'


def remplir(texte, valeurs):
    for k, v in valeurs.items():
        texte = texte.replace('{{' + k + '}}', str(v))
    return texte


MODELES = []

# --- 01. 6-197 : programmer un chemin sur quadrillage (tortue, sans boucle) --------------------

CHEMIN_INTRO = ('Fais tracer à la tortue le chemin dessiné en gris. Au départ, elle regarde vers'
                ' la droite.\n\n')

C3_REF = 'avancer {{a}} ; tourner à gauche 90 ; avancer {{b}} ; tourner à droite 90 ; avancer {{c}}'
C4_REF = ('avancer {{a}} ; tourner à droite 90 ; avancer {{b}} ; tourner à gauche 90 ; '
          'avancer {{c}} ; tourner à gauche 90 ; avancer {{d}}')
C5_REF = ('avancer {{a}} ; tourner à gauche 90 ; avancer {{b}} ; tourner à droite 90 ; '
          'avancer {{c}} ; tourner à droite 90 ; avancer {{b}} ; tourner à gauche 90 ; avancer {{a}}')
C6_REF = ('avancer {{a}} ; tourner à gauche 90 ; avancer {{b}} ; tourner à droite 90 ; '
          'avancer {{a}} ; tourner à droite 90 ; avancer {{d}} ; tourner à gauche 90 ; '
          'avancer {{a}} ; tourner à gauche 90 ; avancer {{b}}')

CH3 = variation(
    CHEMIN_INTRO + 'Le chemin a $3$ traits : ${{a}}$ carreaux vers la droite, ${{b}}$ vers le'
    ' haut, puis ${{c}}$ vers la droite.\n\n' + bloc('tortue', 'attendu: ' + C3_REF, 'montrer: oui'),
    [var('a', '2..4'), var('b', '2..4'), var('c', '2..4')],
    ['La tortue avance de ${{a}}$ vers la droite.',
     'Pour monter, elle tourne d\'un quart de tour **à gauche**, puis avance de ${{b}}$.',
     'Pour repartir vers la droite, elle tourne d\'un quart de tour **à droite**, puis avance de'
     ' ${{c}}$.'])
CH4 = variation(
    CHEMIN_INTRO + 'Le chemin a $4$ traits : ${{a}}$ carreaux vers la droite, ${{b}}$ vers le'
    ' bas, ${{c}}$ vers la droite, puis ${{d}}$ vers le haut.\n\n'
    + bloc('tortue', 'attendu: ' + C4_REF, 'montrer: oui'),
    [var('a', '2..3'), var('b', '2..4'), var('c', '2..3'), var('d', '2..5')],
    ['La tortue avance de ${{a}}$, puis tourne **à droite** pour descendre de ${{b}}$.',
     'Elle tourne **à gauche** : elle regarde de nouveau vers la droite, et avance de ${{c}}$.',
     'Elle tourne encore **à gauche** pour monter, et avance de ${{d}}$.',
     'Pour savoir de quel côté tourner, on se met à la place de la tortue : à gauche, c\'est sa'
     ' gauche à elle.'])
CH5 = variation(
    CHEMIN_INTRO + 'Le chemin a $5$ traits et fait le tour d\'un obstacle par le haut :'
    ' ${{a}}$ carreaux vers la droite, ${{b}}$ vers le haut, ${{c}}$ vers la droite, ${{b}}$ vers'
    ' le bas, puis ${{a}}$ vers la droite.\n\n'
    + bloc('tortue', 'attendu: ' + C5_REF, 'montrer: oui'),
    [var('a', '1..3'), var('b', '2..4'), var('c', '2..3')],
    ['La tortue avance de ${{a}}$, tourne à gauche et monte de ${{b}}$.',
     'Elle tourne à droite et avance de ${{c}}$ au-dessus de l\'obstacle.',
     'Elle tourne à droite pour redescendre de ${{b}}$, puis à gauche pour finir par ${{a}}$ vers'
     ' la droite.',
     'Monter de ${{b}}$ puis redescendre de ${{b}}$ ramène la tortue à sa hauteur de départ.'],
    ['2*a+c <= 8'])
CH6 = variation(
    CHEMIN_INTRO + 'Le chemin a $6$ traits : ${{a}}$ carreaux vers la droite, ${{b}}$ vers le'
    ' haut, ${{a}}$ vers la droite, ${{d}}$ vers le bas, ${{a}}$ vers la droite, puis ${{b}}$ vers'
    ' le haut.\n\n' + bloc('tortue', 'attendu: ' + C6_REF, 'montrer: oui'),
    [var('a', '1..2'), var('b', '1..3'), var('d', 'eval:2*b')],
    ['Chaque trait se trace en deux instructions : tourner (sauf au premier), puis avancer.',
     'Pour monter : tourner à gauche quand la tortue regarde vers la droite ; pour descendre :'
     ' tourner à droite.',
     'Après chaque trait vertical, elle tourne de l\'autre côté pour regarder de nouveau vers la'
     ' droite.',
     'Le $4$e trait descend de ${{d}}$ : ${{b}}$ pour revenir à la hauteur de départ, et ${{b}}$'
     ' de plus.'])

V3 = {'a': 3, 'b': 2, 'c': 4}
V4 = {'a': 2, 'b': 3, 'c': 3, 'd': 4}
V5 = {'a': 2, 'b': 3, 'c': 2}
V6 = {'a': 2, 'b': 2, 'd': 4}

MODELES.append(modele(
    '01-programmer-un-chemin', 'Programmer un chemin sur quadrillage',
    'Faire tracer à la tortue un chemin de 3 à 6 traits montré sur le quadrillage, sans boucle.', 1,
    [CH3, CH4, CH5, CH6],
    [spec('3 traits : programme de référence', 0, V3, remplir(C3_REF, V3), 'correct'),
     spec('3 traits : en reculant (tortue retournée)', 0, V3,
          'tourner à droite 180 ; reculer 3 ; tourner à droite 90 ; avancer 2 ; '
          'tourner à gauche 90 ; reculer 4', 'correct'),
     spec('Erreur : tourne à droite au lieu de gauche (chemin vers le bas)', 0, V3,
          'avancer 3 ; tourner à droite 90 ; avancer 2 ; tourner à gauche 90 ; avancer 4',
          'incorrect'),
     spec('Erreur : oublie de tourner avant le dernier trait', 0, V3,
          'avancer 3 ; tourner à gauche 90 ; avancer 2 ; avancer 4', 'incorrect'),
     spec('4 traits : programme de référence', 1, V4, remplir(C4_REF, V4), 'correct'),
     spec('Erreur : dernier trait vers le bas', 1, V4,
          'avancer 2 ; tourner à droite 90 ; avancer 3 ; tourner à gauche 90 ; avancer 3 ; '
          'tourner à droite 90 ; avancer 4', 'incorrect'),
     spec('Erreur : un trait trop court', 1, V4,
          'avancer 2 ; tourner à droite 90 ; avancer 2 ; tourner à gauche 90 ; avancer 3 ; '
          'tourner à gauche 90 ; avancer 4', 'incorrect'),
     spec('5 traits : programme de référence', 2, V5, remplir(C5_REF, V5), 'correct'),
     spec('Erreur : contourne par le bas', 2, V5,
          'avancer 2 ; tourner à droite 90 ; avancer 3 ; tourner à gauche 90 ; avancer 2 ; '
          'tourner à gauche 90 ; avancer 3 ; tourner à droite 90 ; avancer 2', 'incorrect'),
     spec('Erreur : dernier trait oublié', 2, V5,
          'avancer 2 ; tourner à gauche 90 ; avancer 3 ; tourner à droite 90 ; avancer 2 ; '
          'tourner à droite 90 ; avancer 3', 'incorrect'),
     spec('6 traits : programme de référence', 3, V6, remplir(C6_REF, V6), 'correct'),
     spec('Erreur : 4e trait de 2 au lieu de 4', 3, V6,
          'avancer 2 ; tourner à gauche 90 ; avancer 2 ; tourner à droite 90 ; avancer 2 ; '
          'tourner à droite 90 ; avancer 2 ; tourner à gauche 90 ; avancer 2 ; '
          'tourner à gauche 90 ; avancer 2', 'incorrect')]))

# --- 02. 6-210 : produire un programme pour un résultat donné (calcul, un seul essai) ----------

RESULTAT_INTRO = ('Écris un programme qui **affiche ${{r}}$** quand on choisit le nombre'
                  ' ${{n}}$. Utilise le bloc « nombre choisi »{OPS}.\n\n')

RES_ADD = variation(
    RESULTAT_INTRO.replace('{OPS}', ' et une addition')
    + bloc('calcul', 'attendu: afficher nombre + {{a}}', 'essais: {{n}}'),
    [var('n', '2..9'), var('a', '2..9'), var('r', 'eval:n+a')],
    ['On cherche ce qu\'il faut ajouter à ${{n}}$ pour obtenir ${{r}}$ : ${{r}} - {{n}} = {{a}}$.',
     'Un programme juste : afficher nombre $+\\ {{a}}$. Avec ${{n}}$, il affiche'
     ' ${{n}} + {{a}} = {{r}}$.',
     'D\'autres programmes sont justes aussi, pourvu qu\'ils utilisent le nombre choisi et affichent ${{r}}$ avec ${{n}}$.'])
RES_MUL = variation(
    RESULTAT_INTRO.replace('{OPS}', ' et une multiplication')
    + bloc('calcul', 'attendu: afficher nombre × {{a}}', 'essais: {{n}}'),
    [var('n', '2..6'), var('a', '2..5'), var('r', 'eval:n*a')],
    ['On cherche par combien multiplier ${{n}}$ pour obtenir ${{r}}$ : ${{r}} \\div {{n}} ='
     ' {{a}}$.',
     'Un programme juste : afficher nombre $\\times {{a}}$. Avec ${{n}}$, il affiche'
     ' ${{n}} \\times {{a}} = {{r}}$.',
     'D\'autres programmes sont justes aussi, pourvu qu\'ils utilisent le nombre choisi et affichent ${{r}}$ avec ${{n}}$.'])
RES_DEUX = variation(
    RESULTAT_INTRO.replace('{OPS}', ', une multiplication puis une addition')
    + bloc('calcul', 'attendu: mettre résultat à nombre × {{a}} ; '
           'mettre résultat à résultat + {{b}} ; afficher résultat', 'essais: {{n}}'),
    [var('n', '2..5'), var('a', '2..4'), var('b', '1..9'), var('p', 'eval:n*a'), var('r', 'eval:p+b')],
    ['Une façon de chercher : multiplier ${{n}}$ par ${{a}}$ donne ${{n}} \\times {{a}} ='
     ' {{p}}$ ; il manque ${{r}} - {{p}} = {{b}}$.',
     'Un programme juste : résultat prend la valeur nombre $\\times {{a}}$, puis résultat'
     ' $+\\ {{b}}$, et on affiche résultat.',
     'D\'autres programmes sont justes aussi, pourvu qu\'ils utilisent le nombre choisi et affichent ${{r}}$ avec ${{n}}$.'])

MODELES.append(modele(
    '02-programme-pour-un-resultat-donne', 'Programme pour un résultat donné',
    'Écrire en blocs un programme qui affiche un résultat donné pour un nombre choisi donné.', 1,
    [RES_ADD, RES_MUL, RES_DEUX],
    [spec('Pour 3, affiche 10 : nombre + 7', 0, {'n': 3, 'a': 7, 'r': 10},
          'afficher nombre + 7', 'correct'),
     spec('Pour 3, affiche 10 : autre programme juste (3 × 3 + 1)', 0, {'n': 3, 'a': 7, 'r': 10},
          'afficher nombre × 3 + 1', 'correct'),
     spec('Pour 3, affiche 10 : afficher 10 (faux : ne dépend pas du nombre choisi)', 0,
          {'n': 3, 'a': 7, 'r': 10}, 'afficher 10', 'incorrect'),
     spec('Erreur : ajoute 10', 0, {'n': 3, 'a': 7, 'r': 10}, 'afficher nombre + 10',
          'incorrect'),
     spec('Erreur : rien d\'affiché', 0, {'n': 3, 'a': 7, 'r': 10},
          'mettre résultat à nombre + 7', 'incorrect'),
     spec('Pour 4, affiche 12 : nombre × 3', 1, {'n': 4, 'a': 3, 'r': 12},
          'afficher nombre × 3', 'correct'),
     spec('Pour 4, affiche 12 : nombre + 8 (juste aussi)', 1, {'n': 4, 'a': 3, 'r': 12},
          'afficher nombre + 8', 'correct'),
     spec('Erreur : multiplie par 12', 1, {'n': 4, 'a': 3, 'r': 12}, 'afficher nombre × 12',
          'incorrect'),
     spec('Pour 3, affiche 11 : × 2 puis + 5', 2, {'n': 3, 'a': 2, 'b': 5, 'p': 6, 'r': 11},
          'mettre résultat à nombre × 2 ; mettre résultat à résultat + 5 ; afficher résultat',
          'correct'),
     spec('Pour 3, affiche 11 : en une ligne', 2, {'n': 3, 'a': 2, 'b': 5, 'p': 6, 'r': 11},
          'afficher nombre × 2 + 5', 'correct'),
     spec('Erreur : additionne avant de multiplier', 2, {'n': 3, 'a': 2, 'b': 5, 'p': 6, 'r': 11},
          'afficher (nombre + 5) × 2', 'incorrect'),
     spec('Erreur : affiche deux nombres', 2, {'n': 3, 'a': 2, 'b': 5, 'p': 6, 'r': 11},
          'afficher nombre × 2 ; afficher nombre × 2 + 5', 'incorrect')]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    chemin = os.path.join(DOSSIER, nom + '.json')
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(chemin)
