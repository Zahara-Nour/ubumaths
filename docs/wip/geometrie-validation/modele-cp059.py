"""Écrit le modèle CP-059 (tracer une droite par deux points) dans scripts/questions/cp-figure/."""
import json
import sys

DOSSIER = sys.argv[1]

# Décisions de David le 2026-10-25 (journal docs/wip/geometrie-validation-progress.md § 3) :
# outil droite seul, feuille blanche, un point piège, trait en trop = faux, delay 60 s.

# Trois points nommés A, B, C ; k choisit le point piège (r), les deux autres (p, q) sont à relier.
# Les positions sont tirées par rôle (1 et 2 = la droite, 3 = le piège), puis données aux lettres.
# Les lettres ne peuvent pas être des valeurs de variables (une lettre seule est lue comme le nom
# d'une variable) : elles s'écrivent en `{{if:}}` dans le texte, et ce sont les positions qui
# passent aux lettres.
P = '{{if:k==3|B|A}}'
Q = '{{if:k==1|B|C}}'
R = '{{if:k==1|C|{{if:k==2|B|A}}}}'

# Position de chaque lettre selon son rôle : A est p sauf si k = 3 (piège) ; B est q si k = 1,
# piège si k = 2, p si k = 3 ; C est piège si k = 1, q sinon.
LETTRES = [
    {'name': 'xa', 'expression': '{{if:k==3|{{x3}}|{{x1}}}}'},
    {'name': 'ya', 'expression': '{{if:k==3|{{y3}}|{{y1}}}}'},
    {'name': 'xb', 'expression': '{{if:k==1|{{x2}}|{{if:k==2|{{x3}}|{{x1}}}}}}'},
    {'name': 'yb', 'expression': '{{if:k==1|{{y2}}|{{if:k==2|{{y3}}|{{y1}}}}}}'},
    {'name': 'xc', 'expression': '{{if:k==1|{{x3}}|{{x2}}}}'},
    {'name': 'yc', 'expression': '{{if:k==1|{{y3}}|{{y2}}}}'},
]


def bloc():
    return ('```figure-a-completer\n'
            'fenetre: 0 ; 10 ; 0 ; 6\n'
            'outils: droite\n'
            f'verifier: droite_par {P} ; {Q}\n'
            '---\n'
            'A = point({{xa}}, {{ya}})\n'
            'B = point({{xb}}, {{yb}})\n'
            'C = point({{xc}}, {{yc}})\n'
            '```')


CORRECTION = {'steps': [
    f'On pose la règle sur les points ${P}$ et ${Q}$, puis on trace le trait d\'un bord à '
    'l\'autre : une droite ne s\'arrête pas aux points.',
    f'Le point ${R}$ n\'est pas sur cette droite : il ne faut pas le prendre.',
]}


def variation(positions, conditions):
    return {
        'statement': f'Trace la droite qui passe par les points ${P}$ et ${Q}$.\n\n' + bloc(),
        'variables': [{'name': 'k', 'expression': '1..3'}] + positions + LETTRES,
        'conditions': conditions,
        'correction': CORRECTION,
    }


def v(name, expression):
    return {'name': name, 'expression': expression}


# Fenêtre 0..10 × 0..6 ; points entiers à au moins 1 du bord ; les deux points à relier écartés
# (4 au moins), le piège à 2 au moins de la droite et des deux points (l'aimantation ne doit
# jamais hésiter entre deux points).
HORIZONTALE = variation(
    [v('x1', '1..3'), v('x2', '7..9'), v('y1', '1..5'), v('y2', 'eval:y1'),
     v('x3', '2..8'), v('y3', '1..5')],
    ['abs(y3 - y1) >= 2'],
)

VERTICALE = variation(
    [v('x1', '2..8'), v('x2', 'eval:x1'), v('y1', '1..2'), v('y2', '4..5'),
     v('x3', '1..9'), v('y3', '1..5')],
    ['abs(x3 - x1) >= 2'],
)

# Oblique : montante ou descendante (s) ; distance du piège à la droite ≥ 1 environ
# (|produit vectoriel| / longueur, longueur ≤ 9).
OBLIQUE = variation(
    [v('s', '0..1'), v('x1', '1..3'), v('x2', '7..9'), v('yb1', '1..2'), v('yh1', '4..5'),
     v('y1', '{{if:s==0|{{yb1}}|{{yh1}}}}'), v('y2', '{{if:s==0|{{yh1}}|{{yb1}}}}'),
     v('x3', '1..9'), v('y3', '1..5')],
    ['abs((x2 - x1)*(y3 - y1) - (y2 - y1)*(x3 - x1)) >= 9',
     'abs(x3 - x1) + abs(y3 - y1) >= 3',
     'abs(x3 - x2) + abs(y3 - y2) >= 3'],
)


def spec(desc, vi, variables_, status, answer):
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': {'status': status}, 'answers': [answer]}


def d(a, b):
    return f'droite({a[0]};{a[1]};{b[0]};{b[1]})'


def specs(vi, extra, p1, p2, p3, k='1'):
    noms = {'1': ('A', 'B', 'C'), '2': ('A', 'C', 'B'), '3': ('B', 'C', 'A')}[k]
    lettres = dict(zip(noms, (p1, p2, p3)))
    variables_ = {'k': k, 'x1': str(p1[0]), 'y1': str(p1[1]), 'x2': str(p2[0]), 'y2': str(p2[1]),
                  'x3': str(p3[0]), 'y3': str(p3[1]), **extra,
                  **{f'{c}{l.lower()}': str(lettres[l][i]) for l in 'ABC'
                     for i, c in enumerate('xy')}}
    # Point voisin du second : décalé d'une unité hors de la droite
    pres = (p2[0] + 1, p2[1]) if p1[0] == p2[0] else (p2[0], p2[1] + 1)
    return [
        spec(f'droite par {noms[0]} et {noms[1]}', vi, variables_, 'correct', d(p1, p2)),
        spec(f'droite par {noms[1]} et {noms[0]} (sens inverse)', vi, variables_, 'correct',
             d(p2, p1)),
        spec('droite par deux autres points de la même droite', vi, variables_, 'correct',
             d((2 * p1[0] - p2[0], 2 * p1[1] - p2[1]), p1)),
        spec(f'Erreur : droite par {noms[0]} et le piège {noms[2]}', vi, variables_, 'incorrect',
             d(p1, p3)),
        spec(f'Erreur : droite par {noms[0]} et un point voisin de {noms[1]}', vi, variables_,
             'incorrect', d(p1, pres)),
        spec('Erreur : la bonne droite et un trait en trop', vi, variables_, 'incorrect',
             d(p1, p2) + '|' + d(p2, p3)),
    ]


SPECS = (
    specs(0, {}, (2, 3), (8, 3), (5, 5))
    + specs(1, {}, (4, 1), (4, 5), (7, 3), k='2')
    + specs(2, {'s': '0', 'yb1': '1', 'yh1': '5'}, (1, 1), (9, 5), (3, 5), k='3')
)

MODELE = {
    'title': 'Trace la droite qui passe par deux points',
    'description': 'Tracer à la règle la droite par deux points nommés (horizontale, verticale, '
                   'oblique) ; un troisième point à ne pas prendre',
    'grades': ['CP'],
    'theme': 'Géométrie',
    'domain': 'Tracés',
    'subdomain': 'Droites',
    'level': 1,
    'delay': 60,
    'status': 'draft',
    'variations': [HORIZONTALE, VERTICALE, OBLIQUE],
    'testSpecs': SPECS,
}

with open(f'{DOSSIER}/01-tracer-une-droite.json', 'w', encoding='utf-8') as f:
    json.dump(MODELE, f, ensure_ascii=False, indent='\t')
    f.write('\n')
