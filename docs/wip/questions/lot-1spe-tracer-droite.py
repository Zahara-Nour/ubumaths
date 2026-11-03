"""Écrit le modèle « Tracer une droite donnée par un point et sa pente » (1SPE-433) dans
scripts/questions/1spe-tracer-droite/.

Phase 0 validée par David le 2026-11-03 (« je suis tes recos », journal
« docs/archive/wip/questions-1spe-tracer-droite-progress.md », § 2-3) :

| Point    | Titre                                            | Catégorie, niveau                                     |
| 1SPE-433 | Tracer une droite donnée par un point et sa pente | Géométrie › Droites du plan › Équations de droites, 8 |

Niveaux relevés en prod le 2026-11-03 (Équations de droites 1-7, tous niveaux scolaires).
Niveaux scolaires des automatismes de 1re (patron 33dffa7a, 7d6cf480) : 1_SPE, 1_GEN, 1_TECHNO ; tag du
seul point 1SPE (1GEN-063 et 1TECHNO-140 ont le même énoncé).

Décisions : A n'est PAS dessiné (l'élève le place d'après ses coordonnées) ; pente entière (V1) et
fractionnaire k/q (V2, « avancer de q, monter de k ») ; geste `tracer:` du bloc ```courbe (#2265, pas en
prod au 2026-11-03 : brouillon seulement).

Pièges :
- le bloc refuse une droite qui passe par moins de deux nœuds de la fenêtre : A et A + (1 ; m) ou
  A + (q ; k) restent dans la fenêtre (conditions) ;
- `tracer:` refuse `\\frac` : la pente fractionnaire s'écrit `k/qx` ;
- réponse de l'élève : `x1;y1/x2;y2` (`tracedAnswer`), un point pas posé = côté vide ;
- jamais de variable « e ».

    python3 docs/wip/questions/lot-1spe-tracer-droite.py scripts/questions/1spe-tracer-droite
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def colt(*a, **k):
    """Valeur colorée en plein texte : `\\textcolor` hors `$…$` s'afficherait en LaTeX brut."""
    return '$' + col(*a, **k) + '$'


def ev(x):
    return '{{eval:' + x + '}}'


FENETRE = 'x: -6 ; 6\ny: -6 ; 6\ngrille: 1 ; 1\n'
DESCRIPTION = 'description: Repère gradué de 1 en 1, de −6 à 6 sur les deux axes.\n'


def repere_a_tracer(equation):
    return '```courbe\n' + FENETRE + 'tracer: ' + equation + '\ntaille: moyenne\n' + DESCRIPTION + '```'


def repere_corrige(f, bx, by):
    return ('```courbe\n' + FENETRE + 'f(x) = ' + f + '   bleu   nom=d\n'
            'points: A({{xa}} ; {{ya}}), B(' + bx + ' ; ' + by + ')\ntaille: moyenne\n'
            'description: Droite d et deux de ses points, A et B.\n```')


def enonce(pente):
    return ('Dans un repère du plan, la droite $d$ passe par le point $A({{xa}}\\,;\\,{{ya}})$ et a'
            ' pour coefficient directeur $' + pente + '$.\n\nTrace la droite $d$ : place deux de ses'
            ' points.\n\n')


# --- V1 : pente entière ---------------------------------------------------------------------

V_ENTIERE = {
    'statement': enonce('m={{m}}') + repere_a_tracer('y = {{m}}x + {{p}}'),
    'variables': [var('m', '1..3;±'), var('xa', '-4..4'), var('ya', '-5..5'),
                  var('p', 'eval:(ya)-(m)*(xa)'),
                  var('xb', 'eval:(xa)+1'), var('yb', 'eval:(ya)+(m)')],
    'conditions': ['abs(yb) <= 6'],
    'correction': {'steps': [
        'On place d\'abord le point $A({{xa}}\\,;\\,{{ya}})$.',
        'Le coefficient directeur vaut ${{m}}$ : quand on avance de $1$ vers la droite, on'
        ' {{if:m>0|monte de ${{m}}$|descend de ${{eval:-(m)}}$}}.',
        'Depuis $A$, on avance de $1$ et on {{if:m>0|monte de ${{m}}$|descend de ${{eval:-(m)}}$}} :'
        ' on arrive en $B({{xb}}\\,;\\,{{yb}})$.',
        repere_corrige('({{m}})*x+({{p}})', '{{xb}}', '{{yb}}'),
        'La droite $d$ est ' + colt('\\text{la droite }(AB)') + '.']},
}

# --- V2 : pente fractionnaire k/q -----------------------------------------------------------

PENTE_FRAC = 'm={{if:k<0|-|}}\\dfrac{ {{ak}} }{ {{q}} }'
V_FRACTION = {
    'statement': enonce(PENTE_FRAC) + repere_a_tracer('y = {{k}}/{{q}}x + {{c}}/{{q}}'),
    'variables': [var('q', '2|3'), var('k', '1..3;±'), var('ak', 'eval:abs(k)'),
                  var('xa', '-4..3'), var('ya', '-5..5'),
                  var('c', 'eval:(q)*(ya)-(k)*(xa)'),
                  var('xb', 'eval:(xa)+(q)'), var('yb', 'eval:(ya)+(k)')],
    'conditions': ['ak != q', 'xb <= 6', 'abs(yb) <= 6'],
    'correction': {'steps': [
        'On place d\'abord le point $A({{xa}}\\,;\\,{{ya}})$.',
        'Le coefficient directeur vaut $' + PENTE_FRAC + '$ : quand on avance de ${{q}}$ vers la'
        ' droite, on {{if:k>0|monte de ${{k}}$|descend de ${{ak}}$}}.',
        'Depuis $A$, on avance de ${{q}}$ et on {{if:k>0|monte de ${{k}}$|descend de ${{ak}}$}} :'
        ' on arrive en $B({{xb}}\\,;\\,{{yb}})$.',
        repere_corrige('({{k}})/({{q}})*x+({{c}})/({{q}})', '{{xb}}', '{{yb}}'),
        'La droite $d$ est ' + colt('\\text{la droite }(AB)') + '.']},
}


def pt(x, y):
    return f'{x};{y}'


# Tirages des specs : V1, A(2 ; −1), m = 3 → B(3 ; 2) ; V2, A(−1 ; 2), k/q = −2/3 → B(2 ; 0)
V1 = {'m': 3, 'xa': 2, 'ya': -1}
V2 = {'q': 3, 'k': -2, 'xa': -1, 'ya': 2}
SPECS = [
    spec('Pente 3 : A et B = A + (1 ; 3)', 0, V1, pt(2, -1) + '/' + pt(3, 2), 'correct'),
    spec('Pente 3 : deux autres points de d', 0, V1, pt(1, -4) + '/' + pt(4, 5), 'correct'),
    spec('Erreur : pente opposée, A + (1 ; −3)', 0, V1, pt(2, -1) + '/' + pt(3, -4), 'incorrect'),
    spec('Erreur : pente inversée, A + (3 ; 1)', 0, V1, pt(2, -1) + '/' + pt(5, 0), 'incorrect'),
    spec('Erreur : A lu à l\'envers, (−1 ; 2)', 0, V1, pt(-1, 2) + '/' + pt(0, 5), 'incorrect'),
    spec('Erreur : un seul point posé', 0, V1, pt(2, -1) + '/', 'incorrect'),
    spec('Erreur : deux points confondus', 0, V1, pt(2, -1) + '/' + pt(2, -1), 'incorrect'),
    spec('Pente −2/3 : A et B = A + (3 ; −2)', 1, V2, pt(-1, 2) + '/' + pt(2, 0), 'correct'),
    spec('Pente −2/3 : deux autres points de d', 1, V2, pt(-4, 4) + '/' + pt(5, -2), 'correct'),
    spec('Erreur : avancer de 2, descendre de 3', 1, V2, pt(-1, 2) + '/' + pt(1, -1), 'incorrect'),
    spec('Erreur : pente opposée, A + (3 ; 2)', 1, V2, pt(-1, 2) + '/' + pt(2, 4), 'incorrect'),
]

MODELE = {
    'title': 'Tracer une droite donnée par un point et sa pente',
    'description': 'Droite donnée par un point A et son coefficient directeur, à tracer dans un repère'
                   ' (deux points posés) : pente entière, puis fractionnaire (avancer de q, monter de k)',
    'grades': ['1_SPE', '1_GEN', '1_TECHNO'],
    'theme': 'Géométrie', 'domain': 'Droites du plan', 'subdomain': 'Équations de droites',
    'level': 8, 'delay': 60, 'status': 'draft',
    'shared': {'cleanCoefficients': True},
    'variations': [V_ENTIERE, V_FRACTION],
    'testSpecs': SPECS,
}

os.makedirs(DOSSIER, exist_ok=True)
NOM = '01-tracer-une-droite-par-un-point-et-sa-pente'
with open(os.path.join(DOSSIER, NOM + '.json'), 'w', encoding='utf-8') as f:
    json.dump(MODELE, f, ensure_ascii=False, indent='\t')
    f.write('\n')
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'1 modèle écrit dans {DOSSIER}')
