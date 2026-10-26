"""Écrit le modèle CP-058 (vérifier un alignement à la règle) dans scripts/questions/cp-figure/."""
import json
import sys

DOSSIER = sys.argv[1]

# Décisions de David le 2026-10-26 (journal docs/wip/geometrie-validation-progress.md § 8 et § 9) :
# figure à compléter (outil droite, feuille blanche) + case texte oui / non tapée ; Valider grisé
# tant que la droite manque (toute case vide grise Valider) ; écart 0,25 carreau ; delay 60 s.

# Trois points nommés A, B, C ; k choisit le point à vérifier (r), les deux autres (p, q) portent
# la droite à tracer. Comme CP-059, les positions sont tirées par rôle (1 et 2 = la droite,
# 3 = le point à vérifier) puis données aux lettres : une lettre ne peut pas être une valeur de
# variable.
P = '{{if:k==3|B|A}}'
Q = '{{if:k==1|B|C}}'
R = '{{if:k==1|C|{{if:k==2|B|A}}}}'

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


def v(name, expression):
    return {'name': name, 'expression': expression}


# Fenêtre 0..10 × 0..6, feuille blanche. Droite oblique, montante ou descendante (s) : x1 = 1 ou 2,
# écart horizontal 6 ou 8, écart vertical 2 ou 4 ; tous pairs, le milieu tombe sur un point entier.
# Le point à vérifier est au milieu (alignés), ou 0,25 carreau au-dessus ou au-dessous (h).
DROITE = [
    v('s', '0..1'), v('x1', '1..2'), v('dx', '3..4'), v('x2', 'eval:x1 + 2*dx'),
    v('yb1', '1..3'), v('dy', '1..2'), v('yh1', 'eval:yb1 + 2*dy'),
    v('y1', '{{if:s==0|{{yb1}}|{{yh1}}}}'), v('y2', '{{if:s==0|{{yh1}}|{{yb1}}}}'),
    v('x3', 'eval:(x1 + x2)/2'),
]
CONDITIONS = ['x2 <= 9', 'yh1 <= 5']


def variation(alignes):
    # Décalage écrit en décimal (« 3.25 ») : `eval:` rendrait une fraction LaTeX, illisible
    # par le script de la figure
    milieu = ([v('y3', 'eval:(y1 + y2)/2')] if alignes else
              [v('ym', 'eval:(y1 + y2)/2'), v('ymb', 'eval:ym - 1'),
               v('y3', '{{if:h==1|{{ym}}.25|{{ymb}}.75}}')])
    ecart = [] if alignes else [v('h', '1..1;±')]
    fin = (f'Elle passe par le point ${R}$ : les trois points sont alignés.' if alignes else
           f'Elle passe tout près du point ${R}$, mais pas dessus : les trois points ne sont pas '
           'alignés.')
    return {
        'statement': ('Les points $A$, $B$ et $C$ sont-ils alignés ? '
                      f'Trace la droite $({P}{Q})$ pour vérifier.\n\n' + bloc()
                      + '\n\nRéponds par oui ou par non : [_]'),
        'variables': [v('k', '1..3')] + ecart + DROITE + milieu + LETTRES,
        'conditions': CONDITIONS,
        'blanks': [{'expectedAnswer': 'oui' if alignes else 'non'}],
        'correction': {'steps': [
            f'On pose la règle sur les points ${P}$ et ${Q}$ et on trace la droite $({P}{Q})$.',
            fin,
        ]},
    }


def spec(desc, vi, variables_, status, answers):
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': {'status': status}, 'answers': answers}


def d(a, b):
    return f'droite({a[0]};{a[1]};{b[0]};{b[1]})'


def fixe(k, extra, p1, p2, p3):
    noms = {'1': ('A', 'B', 'C'), '2': ('A', 'C', 'B'), '3': ('B', 'C', 'A')}[k]
    lettres = dict(zip(noms, (p1, p2, p3)))
    return noms, {'k': k, 'x1': str(p1[0]), 'y1': str(p1[1]), 'x2': str(p2[0]),
                  'y2': str(p2[1]), 'x3': str(p3[0]), 'y3': str(p3[1]), **extra,
                  **{f'{c}{l.lower()}': str(lettres[l][i]) for l in 'ABC'
                     for i, c in enumerate('xy')}}


# Alignés : A(1;1), B(9;5), C(5;3) (k = 1, montante)
NA, VA = fixe('1', {'s': '0', 'dx': '4', 'yb1': '1', 'dy': '2', 'yh1': '5'},
              (1, 1), (9, 5), (5, 3))
# Pas alignés : A(2;5), C(8;3), B(5;4,25) (k = 2, descendante, B au-dessus)
NP, VP = fixe('2', {'s': '1', 'dx': '3', 'yb1': '3', 'dy': '1', 'yh1': '5', 'h': '1', 'ym': '4', 'ymb': '3'},
              (2, 5), (8, 3), (5, 4.25))

AB_A = d((1, 1), (9, 5))
AC_P = d((2, 5), (8, 3))
SPECS = [
    spec('alignés : droite (AB), « oui »', 0, VA, 'correct', [AB_A, 'oui']),
    spec('alignés : « Oui » avec majuscule', 0, VA, 'correct', [AB_A, 'Oui']),
    spec('alignés : « OUI » et espaces', 0, VA, 'correct', [AB_A, ' OUI ']),
    spec('alignés : droite (AC), qui passe aussi par B', 0, VA, 'correct',
         [d((1, 1), (5, 3)), 'oui']),
    spec('Erreur : alignés, réponse « non »', 0, VA, 'incorrect', [AB_A, 'non']),
    spec('temps écoulé sans la droite : « Tu n’as pas tout complété. »', 0, VA,
         'unoptimal_form', ['', 'oui']),
    spec('pas alignés : droite (AC), « non »', 1, VP, 'correct', [AC_P, 'non']),
    spec('pas alignés : « Non » avec majuscule', 1, VP, 'correct', [AC_P, 'Non']),
    spec('Erreur : pas alignés, réponse « oui »', 1, VP, 'incorrect', [AC_P, 'oui']),
    spec('Erreur : droite (AB) au lieu de (AC)', 1, VP, 'incorrect',
         [d((2, 5), (5, 4.25)), 'non']),
    spec('Erreur : la bonne droite et une droite de trop', 1, VP, 'incorrect',
         [AC_P + '|' + d((2, 5), (5, 4.25)), 'non']),
]

MODELE = {
    'title': 'Trois points alignés ? Vérifie à la règle',
    'description': 'Tracer la droite par deux points pour dire si un troisième, presque dessus, '
                   'est aligné avec eux (réponse oui / non)',
    'grades': ['CP'],
    'theme': 'Géométrie',
    'domain': 'Tracés',
    'subdomain': 'Droites',
    'level': 1,
    'delay': 60,
    'status': 'draft',
    'variations': [variation(True), variation(False)],
    'testSpecs': SPECS,
}

with open(f'{DOSSIER}/03-points-alignes.json', 'w', encoding='utf-8') as f:
    json.dump(MODELE, f, ensure_ascii=False, indent='\t')
    f.write('\n')
