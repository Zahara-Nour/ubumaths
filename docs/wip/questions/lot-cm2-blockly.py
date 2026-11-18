"""Écrit le modèle du lot « Blockly » du CM2 dans scripts/questions/CM2-blockly/.

Lot porté par le chantier `blockly` (journal docs/archive/wip/blockly-progress.md § Lot CM2, David le
2026-11-15 : « je te suis ») ; un point par modèle (ADR 0020) :

| #  | Point   | Titre                                      | Geste                 | Niveau |
| 01 | CM2-152 | Programme de calcul pour un résultat donné | calcul, un seul essai | 1      |

Calqué sur le 02 du lot de la 6e (lot-6-blockly.py, 6-210), avec des nombres plus petits et
l'énoncé d'un programme de calcul. Titre distinct de celui de 6-210 (« Programme pour un résultat
donné », même niveau) : create-questions refuse un homonyme.

Règles du lot :
- le geste `calcul` porte SA case : ni `blanks` ni `?` ; la réponse d'une spec est le programme
  de l'élève en notation texte ;
- `essais:` d'un seul nombre (le nombre de l'énoncé) : tout programme qui affiche le résultat
  demandé pour ce nombre est juste, s'il dépend du nombre choisi (`afficher 10` est faux : règle
  du jugement des cases calcul, David le 2026-11-15) ;
- variables : jamais `e` ni `i`.

    python3 docs/wip/questions/lot-cm2-blockly.py scripts/questions/CM2-blockly
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
    return nom, {'title': title, 'description': description, 'grades': ['CM2'], 'level': level,
                 'delay': delay, 'status': 'draft', 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, steps, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': [], 'correction': {'steps': steps}}


def bloc(nom, *lignes):
    return '```' + nom + '\n' + '\n'.join(lignes) + '\n```'


MODELES = []

# --- 01. CM2-152 : produire un programme de calcul pour un résultat donné ---------------------

INTRO = ('Écris un programme de calcul qui **donne ${{r}}$** quand on choisit le nombre'
         ' ${{n}}$. Utilise le bloc « nombre choisi »{OPS}, et affiche le résultat.\n\n')
AUTRES = ('D\'autres programmes sont justes aussi, pourvu qu\'ils utilisent le nombre choisi et'
          ' affichent ${{r}}$ avec ${{n}}$.')

ADD = variation(
    INTRO.replace('{OPS}', ' et une addition')
    + bloc('calcul', 'attendu: afficher nombre + {{a}}', 'essais: {{n}}'),
    [var('n', '2..9'), var('a', '2..9'), var('r', 'eval:n+a')],
    ['On cherche ce qu\'il faut ajouter à ${{n}}$ pour obtenir ${{r}}$ : ${{r}} - {{n}} = {{a}}$.',
     'Un programme juste : afficher nombre $+\\ {{a}}$. Avec ${{n}}$, il donne'
     ' ${{n}} + {{a}} = {{r}}$.',
     AUTRES])
MUL = variation(
    INTRO.replace('{OPS}', ' et une multiplication')
    + bloc('calcul', 'attendu: afficher nombre × {{a}}', 'essais: {{n}}'),
    [var('n', '2..5'), var('a', '2..5'), var('r', 'eval:n*a')],
    ['On cherche par combien multiplier ${{n}}$ pour obtenir ${{r}}$ : ${{n}} \\times {{a}} ='
     ' {{r}}$.',
     'Un programme juste : afficher nombre $\\times {{a}}$. Avec ${{n}}$, il donne'
     ' ${{n}} \\times {{a}} = {{r}}$.',
     AUTRES])
DEUX = variation(
    INTRO.replace('{OPS}', ', une multiplication puis une addition')
    + bloc('calcul', 'attendu: mettre résultat à nombre × {{a}} ; '
           'mettre résultat à résultat + {{b}} ; afficher résultat', 'essais: {{n}}'),
    [var('n', '2..5'), var('a', '2..3'), var('b', '1..5'), var('p', 'eval:n*a'),
     var('r', 'eval:p+b')],
    ['Une façon de chercher : multiplier ${{n}}$ par ${{a}}$ donne ${{n}} \\times {{a}} ='
     ' {{p}}$ ; il manque ${{r}} - {{p}} = {{b}}$.',
     'Un programme juste : résultat prend la valeur nombre $\\times {{a}}$, puis résultat'
     ' $+\\ {{b}}$, et on affiche résultat.',
     AUTRES])

MODELES.append(modele(
    '01-programme-de-calcul-pour-un-resultat-donne', 'Programme de calcul pour un résultat donné',
    'Écrire en blocs un programme de calcul qui donne un résultat donné pour un nombre choisi'
    ' donné.', 1,
    [ADD, MUL, DEUX],
    [spec('Pour 3, donne 10 : nombre + 7', 0, {'n': 3, 'a': 7, 'r': 10},
          'afficher nombre + 7', 'correct'),
     spec('Pour 3, donne 10 : autre programme juste (3 × 3 + 1)', 0, {'n': 3, 'a': 7, 'r': 10},
          'afficher nombre × 3 + 1', 'correct'),
     spec('Pour 3, donne 10 : afficher 10 (faux : ne dépend pas du nombre choisi)', 0,
          {'n': 3, 'a': 7, 'r': 10}, 'afficher 10', 'incorrect'),
     spec('Erreur : ajoute 10', 0, {'n': 3, 'a': 7, 'r': 10}, 'afficher nombre + 10',
          'incorrect'),
     spec('Erreur : rien d\'affiché', 0, {'n': 3, 'a': 7, 'r': 10},
          'mettre résultat à nombre + 7', 'incorrect'),
     spec('Pour 4, donne 12 : nombre × 3', 1, {'n': 4, 'a': 3, 'r': 12},
          'afficher nombre × 3', 'correct'),
     spec('Pour 4, donne 12 : nombre + 8 (juste aussi)', 1, {'n': 4, 'a': 3, 'r': 12},
          'afficher nombre + 8', 'correct'),
     spec('Erreur : multiplie par 12', 1, {'n': 4, 'a': 3, 'r': 12}, 'afficher nombre × 12',
          'incorrect'),
     spec('Pour 3, donne 11 : × 2 puis + 5', 2, {'n': 3, 'a': 2, 'b': 5, 'p': 6, 'r': 11},
          'mettre résultat à nombre × 2 ; mettre résultat à résultat + 5 ; afficher résultat',
          'correct'),
     spec('Pour 3, donne 11 : en une ligne', 2, {'n': 3, 'a': 2, 'b': 5, 'p': 6, 'r': 11},
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
