"""Écrit les deux modèles du chantier labyrinthe dans scripts/questions/labyrinthe-modeles/.

Phase 0 validée par David le 2026-11-24 (journal docs/archive/wip/labyrinthe/labyrinthe-progress.md, § PR 2) :
- M1 (3e) « Le labyrinthe des nombres premiers », sans point (primalité hors programme de 3e,
  comme F4 d'idees-3e-arithmetique), 150 s, niveau 5 ; grilles 5 × 4 et 6 × 5 (7 × 5 déborde sur iPhone).
- M2 (6e, 6-101) « Le labyrinthe du chiffre d'un rang », 120 s, niveau 4 ; entiers (unités à
  unités de mille), décimaux (dixièmes à millièmes), mélange (dix-millièmes à dizaines de mille,
  grille 4 × 5 : 6 × 5 et 5 × 5 débordent sur iPhone avec les nombres longs) ; chiffre cherché de 1 à 9.
- Deux modèles neufs (pas de variation ajoutée à F4 ni à 4d825d44 : un modèle n'a qu'une durée).
- Pas de réglage de la forme des nombres (fixée par le rang).

Pièges :
- Le bloc tire son labyrinthe d'une graine qu'il pose lui-même dans l'énoncé ; les specs tournent
  à la graine 0 (`generateInstanceWithFixedVariables`) : les chemins des specs sont calculés par
  `scripts/questions/labyrinthe-chemins.ts` (`--ecrire` les remplace dans les JSON). Ne jamais
  changer le tirage (`tirerLabyrinthe`, `piocher`, `utils/random.ts`) sans le décider : test
  « golden ».
- Aucune case à déclarer : le bloc ` ```labyrinthe ` avec `parcourir: oui` porte sa case. Pas
  d'erreurs prévues : le juge dit lui-même pourquoi un chemin est faux.
- Le bloc doit rester au premier niveau (ni dans une liste, ni dans un choix).

Usage : python3 docs/archive/wip/labyrinthe/labyrinthe-modeles.py scripts/questions/labyrinthe-modeles
"""
import json
import os
import sys

DOSSIER = sys.argv[1]


# Les chemins des specs : écrits par labyrinthe-chemins.ts --ecrire (graine 0)
CHEMIN = 'A_CALCULER'


def spec(desc, vi, variables_, status, answers):
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': {'status': status}, 'answers': answers}


def specs_de(vi, variables_, quoi):
    """Un chemin juste, un chemin arrêté avant la sortie, un chemin qui ne part pas de l'entrée"""
    return [
        spec(f'{quoi} : le bon chemin', vi, variables_, 'correct', [CHEMIN]),
        spec(f'{quoi} : arrêté avant la sortie', vi, variables_, 'incorrect', [CHEMIN + ':sans-fin']),
        spec(f'{quoi} : ne part pas de l’entrée', vi, variables_, 'incorrect',
             [CHEMIN + ':sans-debut']),
    ]


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def labyrinthe(grille, regle):
    return f'```labyrinthe\ngrille: {grille}\nrègle: {regle}\nparcourir: oui\n```'


def variation(statement, steps, hint, variables=None):
    return {'statement': statement, 'variables': variables or [], 'conditions': [],
            'correction': {'steps': steps}, 'hint': hint}


def modele(title, description, grades, level, delay, variations, specs):
    return {'title': title, 'description': description, 'grades': grades, 'level': level,
            'delay': delay, 'status': 'draft', 'variations': variations, 'testSpecs': specs}


# ============================================================================
# M1 — 3e, nombres premiers
# ============================================================================

CONSIGNE_PREMIERS = ('Va de l’entrée à une sortie en ne passant que par des nombres premiers. '
                     'Touche les cases une à une.')

STEPS_PREMIERS = [
    '**Ce qu’on cherche.** Un nombre premier a exactement deux diviseurs : $1$ et lui-même. '
    'On garde une case seulement si son nombre n’a aucun autre diviseur.',
    '**Les pièges.** Un nombre pair (sauf $2$) ou qui finit par $5$ (sauf $5$) n’est pas premier. '
    'Mais un nombre impair qui ne finit pas par $5$ peut l’être… ou pas : '
    '$51 = 3 \\times 17$ et $91 = 7 \\times 13$. On essaie les divisions par $3$, $7$, $11$, $13$.',
    '**Le chemin.** De l’entrée, on avance de case en case (haut, bas, gauche, droite) en ne '
    'gardant que les nombres premiers : un seul chemin mène à une sortie, celui teinté sur la '
    'grille.',
]

HINT_PREMIERS = ('Un nombre premier a exactement deux diviseurs : $1$ et lui-même. Un nombre '
                 'impair qui ne finit pas par $5$ peut quand même se diviser par $3$ ou par $7$.')

m1 = modele(
    'Le labyrinthe des nombres premiers',
    'Tracer le chemin de l’entrée à une sortie en ne passant que par des nombres premiers '
    '(grilles 5 × 4 et 6 × 5)',
    ['3'], 5, 150,
    [
        variation(f'{CONSIGNE_PREMIERS}\n\n{labyrinthe("5 x 4", "premier")}',
                  STEPS_PREMIERS, HINT_PREMIERS),
        variation(f'{CONSIGNE_PREMIERS}\n\n{labyrinthe("6 x 5", "premier")}',
                  STEPS_PREMIERS, HINT_PREMIERS),
    ],
    specs_de(0, {}, 'Grille 5 × 4') + specs_de(1, {}, 'Grille 6 × 5'),
)

# ============================================================================
# M2 — 6e, 6-101, chiffre d'un rang
# ============================================================================

# r = indice dans les rangs, des dix-millièmes (0) aux dizaines de mille (8)
NOMS = ['dix-millièmes', 'millièmes', 'centièmes', 'dixièmes', 'unités', 'dizaines',
        'centaines', 'unités de mille', 'dizaines de mille']


def nom_du_rang():
    """{{if:r==0|…|{{if:r==1|…|…}}}} sur les neuf rangs"""
    texte = NOMS[-1]
    for i in range(len(NOMS) - 2, -1, -1):
        texte = '{{if:r==' + str(i) + '|' + NOMS[i] + '|' + texte + '}}'
    return texte


RANG = nom_du_rang()

CONSIGNE_RANG = ('Va de l’entrée à une sortie en ne passant que par les nombres dont le chiffre '
                 'des ' + RANG + ' est ${{c}}$. Touche les cases une à une.')

REGLE_RANG = 'chiffre des ' + RANG + ' = {{c}}'

STEPS_RANG = [
    '**Lire le rang.** Dans chaque nombre, on repère d’abord le chiffre des unités (juste avant la '
    'virgule, ou le dernier chiffre d’un entier), puis on compte les rangs : dizaines, centaines, '
    'unités de mille vers la gauche ; dixièmes, centièmes, millièmes, dix-millièmes vers la droite.',
    '**Les pièges.** Chaque intrus contient un ${{c}}$, mais à un autre rang : on ne garde une case '
    'que si son ${{c}}$ est au rang des ' + RANG + '.',
    '**Le chemin.** De l’entrée, on avance de case en case (haut, bas, gauche, droite) : un seul '
    'chemin mène à une sortie, celui teinté sur la grille.',
]

HINT_RANG = ('Repère d’abord le chiffre des unités (juste avant la virgule, ou le dernier '
             'chiffre d’un entier), puis compte les rangs à partir de lui.')


def variation_rang(rangs, grille):
    return variation(f'{CONSIGNE_RANG}\n\n{labyrinthe(grille, REGLE_RANG)}', STEPS_RANG,
                     HINT_RANG, [var('r', rangs), var('c', '1..9')])


m2 = modele(
    'Le labyrinthe du chiffre d’un rang',
    'Tracer le chemin qui ne passe que par les nombres dont le chiffre d’un rang donné est fixé : '
    'entiers (unités à unités de mille), décimaux (dixièmes à millièmes), puis tous les rangs',
    ['6'], 4, 120,
    [
        variation_rang('4..7', '5 x 4'),
        variation_rang('1..3', '5 x 4'),
        variation_rang('0..8', '4 x 5'),
    ],
    specs_de(0, {'r': '5', 'c': '4'}, 'Entiers, dizaines = 4')
    + specs_de(1, {'r': '2', 'c': '7'}, 'Décimaux, centièmes = 7')
    + specs_de(2, {'r': '0', 'c': '3'}, 'Mélange, dix-millièmes = 3')
    + specs_de(2, {'r': '8', 'c': '6'}, 'Mélange, dizaines de mille = 6'),
)

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in (('01-labyrinthe-nombres-premiers', m1), ('02-labyrinthe-chiffre-d-un-rang', m2)):
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print('écrit :', DOSSIER)
