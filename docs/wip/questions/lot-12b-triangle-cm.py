"""Ajoute au modèle publié f06e45e8 (6-173, « Construire un triangle ») deux variations en cm.

Chantier `triangle-cote-cm`, point 5 de la phase 0 (validée par David le 2026-11-14) : variations en cm
ajoutées, celles en segments à reporter gardées. L'outil est livré par #2658 et #2660.

- v5 : trois longueurs en cm (`triangle ABC : AC = l cm ; BC = m cm`), [AB] = 5 cm tracé ;
- v6 : deux côtés et l'angle compris (`triangle ABC : CAB = a ; AC = l cm`).

Le fichier lu est l'instantané de la base (`export-question-templates.ts`) ; le script y ajoute les
variations et les specs, et l'écrit à sa place (relançable : il repart des 4 variations d'origine).
Réponses d'essai calculées en pleine précision, comme le juge (`rulerGraduation`, `repereAt`).

    python3 docs/wip/questions/lot-12b-triangle-cm.py scripts/questions/6-triangle-existants/f06e45e8.json
"""
import json
import math
import sys

FICHIER = sys.argv[1]

A, B = (3.5, 2.5), (8.5, 2.5)  # [AB] = 5 cm, comme les variations d'origine
L, H = 12, 9
R_RAPP = 0.35 * min(L, H)
FEN = '0 ; 12 ; 0 ; 9'
N_ORIGINE = 4  # variations du lot 12, gardées telles quelles


def n(x):
    """Nombre écrit dans une réponse de figure : pleine précision, sans « -0 »."""
    x = x + 0.0
    if abs(x - round(x)) < 1e-12:
        return str(int(round(x)))
    return repr(x)


def pt(nom, p, extra=''):
    return nom + ' = point(' + n(p[0]) + ', ' + n(p[1]) + extra + ')'


def corps_ab():
    return [pt('A', A, ', etiquette="bas"'), pt('B', B, ', etiquette="bas"'), 'segment(A, B)']


def a_completer(verifier, lignes):
    return ('\n\n```figure-a-completer\nfenetre: ' + FEN + '\nverifier: ' + verifier + '\n---\n'
            + '\n'.join(lignes) + '\n```')


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def cm(x):
    return x + '\\,\\text{cm}'


def deg(x):
    return x + '^\\circ'


def spec(desc, vi, variables, objets, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': ['|'.join(objets)], 'expected': {'status': status}}


# --- objets tracés par l'élève (format de `serializeConstructionAnswer`) ---------------------------

def segment(p, q):
    return 'segment(' + ';'.join(n(x) for x in (p[0], p[1], q[0], q[1])) + ')'


def cercle(c, p):
    return 'cercle(' + ';'.join(n(x) for x in (c[0], c[1], p[0], p[1])) + ')'


def regle(o, vers):
    return 'regle(' + ';'.join(n(x) for x in (o[0], o[1], vers[0], vers[1], 1)) + ')'


def repere(v, a, r, d, sens):
    return 'repere(' + ';'.join(n(x) for x in (v[0], v[1], a[0], a[1], r, d, sens)) + ')'


def unitaire(o, vers):
    d = math.hypot(vers[0] - o[0], vers[1] - o[1])
    return (vers[0] - o[0]) / d, (vers[1] - o[1]) / d


def graduation(o, vers, mm):
    """Le point de la graduation `mm` d'une règle posée le 0 en o, vers `vers` (`rulerGraduation`)."""
    u = unitaire(o, vers)
    return o[0] + (mm / 10) * u[0], o[1] + (mm / 10) * u[1]


def repere_at(v, a, r, d, sens):
    base = math.atan2(a[1] - v[1], a[0] - v[0])
    t = base + sens * d * math.pi / 180
    return v[0] + r * math.cos(t), v[1] + r * math.sin(t)


def inter_cercles(c1, r1, c2, r2):
    """Les deux points communs, le plus haut (y le plus grand) en premier."""
    dx, dy = c2[0] - c1[0], c2[1] - c1[1]
    d = math.hypot(dx, dy)
    a = (r1 * r1 - r2 * r2 + d * d) / (2 * d)
    h = math.sqrt(r1 * r1 - a * a)
    mx, my = c1[0] + a * dx / d, c1[1] + a * dy / d
    p, q = (mx - h * dy / d, my + h * dx / d), (mx + h * dy / d, my - h * dx / d)
    return (p, q) if p[1] >= q[1] else (q, p)


def dans(p, marge=0.4):
    return marge <= p[0] <= L - marge and marge <= p[1] <= H - marge


# --- v5 : trois longueurs en cm ---------------------------------------------------------------------
# l, m de 3 à 6 cm : |l − m| < 5 < l + m toujours ; C (au-dessus) dans la fenêtre dans les 16 cas.

HAUT_A = (A[0], A[1] + 6)  # règle posée en A vers le haut
VERS_A = A  # règle posée en B le long de [BA]

for l_ in range(3, 7):
    for m_ in range(3, 7):
        assert dans(inter_cercles(A, l_, B, m_)[0]), ('v5', l_, m_)
        assert dans(graduation(A, HAUT_A, 10 * l_)) and dans(graduation(B, VERS_A, 10 * m_))


def sss(l, m, dessous=False, echange=False):
    la, lb = (m, l) if echange else (l, m)
    ga, gb = graduation(A, HAUT_A, 10 * la), graduation(B, VERS_A, 10 * lb)
    c = inter_cercles(A, la, B, lb)[1 if dessous else 0]
    return [regle(A, HAUT_A), cercle(A, ga), regle(B, VERS_A), cercle(B, gb), segment(A, c),
            segment(B, c)]


def sss_compas_oeil(l, m):
    """Erreur : les bons rayons, mais aucune règle posée (compas ouvert à l'œil)."""
    pa = (A[0] + 0.6 * l, A[1] + 0.8 * l)
    pb = (B[0] - 0.6 * m, B[1] + 0.8 * m)
    c = inter_cercles(A, l, B, m)[0]
    return [cercle(A, pa), cercle(B, pb), segment(A, c), segment(B, c)]


def sss_oeil(l, m):
    c = inter_cercles(A, l, B, m)[0]
    c = (c[0] + 0.3, c[1] - 0.2)
    return [segment(A, c), segment(B, c)]


V5 = {
    'statement': 'Construis le triangle $ABC$ : le côté $[AB]$, de $' + cm('5') + '$, est tracé. Le côté'
                 ' $[AC]$ doit mesurer $' + cm('{{l}}') + '$, et le côté $[BC]$ $' + cm('{{m}}') + '$.'
                 ' Prends les longueurs sur la règle graduée avec le compas, puis trace les côtés $[AC]$'
                 ' et $[BC]$.' + a_completer('triangle ABC : AC = {{l}} cm ; BC = {{m}} cm', corps_ab()),
    'variables': [{'name': 'l', 'expression': '3..6'}, {'name': 'm', 'expression': '3..6'}],
    'correction': {'steps': [
        '**$' + cm('{{l}}') + '$ depuis $A$** : la règle posée le $0$ en $A$, le compas piqué en $A$ et'
        ' ouvert sur la graduation $' + cm('{{l}}') + '$ ; un arc de centre $A$. Le point $C$ est sur cet'
        ' arc.',
        '**$' + cm('{{m}}') + '$ depuis $B$** : de même, le compas piqué en $B$ et ouvert à $'
        + cm('{{m}}') + '$. Les deux arcs se coupent en $' + col('C') + '$ ; on trace $[AC]$ et $[BC]$.']}
}

# --- v6 : deux côtés et l'angle compris --------------------------------------------------------------
# a de 30 à 120° (sauf 90 : c'est le triangle rectangle), l de 3 à 5 cm : C dans la fenêtre.

for a_ in range(30, 121):
    for l_ in range(3, 6):
        t_ = math.radians(a_)
        assert dans((A[0] + l_ * math.cos(t_), A[1] + l_ * math.sin(t_))), ('v6', a_, l_)


def sas_regle(a, l, mm=None):
    """C sur la graduation d'une règle posée en A le long du côté d'angle ; mm : graduation lue."""
    m = repere_at(A, B, R_RAPP, a, 1)
    c = graduation(A, m, 10 * l if mm is None else mm)
    return [repere(A, B, R_RAPP, a, 1), regle(A, m), segment(A, c), segment(B, c)]


def sas_compas(a, l):
    """C à l'arc du compas ouvert sur la règle ; le côté d'angle (6 cm) dépasse C (option A)."""
    m = repere_at(A, B, R_RAPP, a, 1)
    bout = graduation(A, m, 60)
    c = graduation(A, m, 10 * l)
    return [repere(A, B, R_RAPP, a, 1), segment(A, bout), regle(A, B),
            cercle(A, graduation(A, B, 10 * l)), segment(B, c)]


def sas_oeil(a, l):
    t = math.radians(a)
    c = (A[0] + l * math.cos(t) + 0.3, A[1] + l * math.sin(t) + 0.2)
    return [segment(A, c), segment(B, c)]


V6 = {
    'statement': 'Construis le triangle $ABC$ : le côté $[AB]$, de $' + cm('5') + '$, est tracé. L\'angle'
                 ' $\\widehat{CAB}$ doit mesurer $' + deg('{{a}}') + '$, et le côté $[AC]$ $'
                 + cm('{{l}}') + '$.' + a_completer('triangle ABC : CAB = {{a}} ; AC = {{l}} cm',
                                                    corps_ab()),
    'variables': [{'name': 'a', 'expression': '30..120'}, {'name': 'l', 'expression': '3..5'}],
    'conditions': ['a!=90'],
    'correction': {'steps': [
        '**L\'angle en $A$** : rapporteur centré en $A$, base sur $[AB]$ ; un repère à $'
        + deg('{{a}}') + '$ (en partant du $0$ qui est sur $[AB]$), puis le côté de $A$ au repère.',
        '**La longueur** : la règle posée le $0$ en $A$ le long de ce côté ; $' + col('C')
        + '$ est sur la graduation $' + cm('{{l}}') + '$ (ou à l\'arc du compas ouvert à $'
        + cm('{{l}}') + '$ sur la règle). On trace $[AC]$ et $[BC]$.']}
}

SPECS = [
    spec('Trois longueurs en cm : 4 et 3, C au-dessus', 4, {'l': 4, 'm': 3}, sss(4, 3), 'correct'),
    spec('Trois longueurs en cm : 3 et 3, C au-dessous', 4, {'l': 3, 'm': 3}, sss(3, 3, dessous=True),
         'correct'),
    spec('Trois longueurs en cm : 6 et 6', 4, {'l': 6, 'm': 6}, sss(6, 6), 'correct'),
    spec('Erreur (cm) : longueurs échangées', 4, {'l': 5, 'm': 3}, sss(5, 3, echange=True), 'incorrect'),
    spec('Erreur (cm) : compas ouvert à l\'œil', 4, {'l': 4, 'm': 5}, sss_compas_oeil(4, 5),
         'incorrect'),
    spec('Erreur (cm) : C placé à l\'œil', 4, {'l': 4, 'm': 5}, sss_oeil(4, 5), 'incorrect'),
    spec('Angle et côté en cm : 50°, 4 cm, C sur la graduation', 5, {'a': 50, 'l': 4},
         sas_regle(50, 4), 'correct'),
    spec('Angle et côté en cm : 110°, 5 cm, C à l\'arc du compas', 5, {'a': 110, 'l': 5},
         sas_compas(110, 5), 'correct'),
    spec('Erreur (cm) : 130° au lieu de 50°', 5, {'a': 50, 'l': 4}, sas_regle(130, 4), 'incorrect'),
    spec('Erreur (cm) : 3,8 cm au lieu de 4 cm', 5, {'a': 50, 'l': 4}, sas_regle(50, 4, mm=38),
         'incorrect'),
    spec('Erreur (cm) : C placé à l\'œil', 5, {'a': 70, 'l': 4}, sas_oeil(70, 4), 'incorrect'),
]

with open(FICHIER, encoding='utf-8') as f:
    modele = json.load(f)
assert modele['id'].startswith('f06e45e8'), modele['id']
modele['variations'] = modele['variations'][:N_ORIGINE] + [V5, V6]
modele['testSpecs'] = [s for s in modele['testSpecs'] if s['variationIndex'] < N_ORIGINE] + SPECS
modele['description'] = (
    'Construire un triangle à partir de trois longueurs (compas, segments à reporter ou longueurs en cm'
    ' à la règle graduée), de deux côtés et de l\'angle compris, ou d\'un côté et de ses deux angles'
    ' adjacents (rapporteur) ; savoir si trois longueurs permettent de construire un triangle')
with open(FICHIER, 'w', encoding='utf-8') as f:
    json.dump(modele, f, ensure_ascii=False, indent='\t')
    f.write('\n')
print(FICHIER, ':', len(modele['variations']), 'variations,', len(modele['testSpecs']), 'specs')
