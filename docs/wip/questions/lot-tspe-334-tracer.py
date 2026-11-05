"""Écrit le modèle de TSPE-334 « Représenter des combinaisons linéaires de vecteurs donnés » dans
scripts/questions/tspe-334-tracer/ (chantier solide-vecteur, lot 3).

Phase 0 validée par David le 2026-11-04 (« je suis tes reco », journal
« docs/archive/wip/solide-vecteur-progress.md », Lot 3) : un modèle, `T_SPE`, « Vecteurs, droites et plans de
l'espace › Sur une figure », niveau 6 ; réponse = le geste ` ```solide ` `tracer: vecteur …` (une case,
`A/G`, jugée en 3D par le bloc : aucune réponse écrite ici).

| Var. | Figure                                                        | Origine  |
| v0   | cube, vecteurs entre sommets, coefficients ±1                 | imposée  |
| v1   | cube, vecteurs entre sommets                                  | libre    |
| v2   | cube, u = AB, v = AD, w = AE dessinés, milieux I, J, K, L     | imposée  |
| v3   | pavé droit, u = AB, v = AD, w = AE dessinés, centres I, J, K, O | imposée |
| v4   | tétraèdre SABC, u = SA, v = SB, w = SC dessinés, I, J milieux de BC, AB, G centre de ABC | imposée |

v4 ajoutée le 2026-11-05 (chantier tetraedre-vue, B3), une fois le tétraèdre du bloc lisible (#2400).
Le fichier garde l'`id` du brouillon en base (`create-questions --publier --mettre-a-jour`).

L'extrémité de chaque cas est **calculée ici** (coordonnées) et vérifiée par une assertion ; le bloc la
recalcule de son côté. Un cas tiré = la variable `k`, les textes de cas en `{{if:k==…}}` à plat.

    python3 docs/wip/questions/lot-tspe-334-tracer.py scripts/questions/tspe-334-tracer
"""
import json
import os
import subprocess
import sys
from fractions import Fraction as Fr

DOSSIER = sys.argv[1]

# --- Figures ---------------------------------------------------------------------------------------

CUBE = {'A': (0, 0, 0), 'B': (1, 0, 0), 'C': (1, 1, 0), 'D': (0, 1, 0),
        'E': (0, 0, 1), 'F': (1, 0, 1), 'G': (1, 1, 1), 'H': (0, 1, 1)}


def milieu(p, q):
    return tuple(Fr(a + b, 2) for a, b in zip(p, q))


CUBE_MILIEUX = dict(CUBE)
CUBE_MILIEUX.update({'I': milieu(CUBE['B'], CUBE['F']), 'J': milieu(CUBE['C'], CUBE['G']),
                     'K': milieu(CUBE['D'], CUBE['H']), 'L': milieu(CUBE['A'], CUBE['E'])})
CUBE_NOMMES = {'u': 'AB', 'v': 'AD', 'w': 'AE'}

# Pavé droit dans la base (AB, AD, AE) : les combinaisons ne dépendent pas des longueurs
PAVE = dict(CUBE)
PAVE.update({'I': (Fr(1, 2), Fr(1, 2), 0), 'J': (Fr(1, 2), 0, Fr(1, 2)), 'K': (1, Fr(1, 2), Fr(1, 2)),
             'O': (Fr(1, 2), Fr(1, 2), Fr(1, 2))})


def add(p, q, c=1):
    return tuple(Fr(a) + Fr(c) * Fr(b) for a, b in zip(p, q))


def vec(pts, xy):
    return tuple(Fr(b) - Fr(a) for a, b in zip(pts[xy[0]], pts[xy[1]]))


def valeur(pts, nommes, terme):
    """Coordonnées d'un terme (vecteur entre points, ou nom de `vecteurs:`)."""
    return vec(pts, nommes.get(terme, terme))


def combinaison(pts, nommes, termes):
    s = (0, 0, 0)
    for c, t in termes:
        s = add(s, valeur(pts, nommes, t), c)
    return s


def point_en(pts, coords):
    for nom, p in pts.items():
        if tuple(Fr(x) for x in p) == coords:
            return nom
    return None


def extremite(pts, nommes, origine, termes):
    fin = point_en(pts, add(pts[origine], combinaison(pts, nommes, termes)))
    assert fin is not None, (origine, termes)
    return fin


def representants(pts, nommes, termes):
    w = combinaison(pts, nommes, termes)
    out = []
    for nom, p in pts.items():
        fin = point_en(pts, add(p, w))
        if fin is not None:
            out.append(nom + '/' + fin)
    assert out, termes
    return out


# --- Écriture --------------------------------------------------------------------------------------

def O(xy):
    return '\\overrightarrow{' + xy + '}'


def nom_latex(t):
    return '\\vec{' + t + '}' if len(t) == 1 else O(t)


def coef_latex(c):
    c = Fr(c)
    a = abs(c)
    if a == 1:
        return ''
    if a.denominator == 1:
        return str(a.numerator)
    return '\\dfrac{' + str(a.numerator) + '}{' + str(a.denominator) + '}'


def coef_tracer(c):
    a = abs(Fr(c))
    if a == 1:
        return ''
    return (str(a.numerator) if a.denominator == 1 else f'{a.numerator}/{a.denominator}') + ' '


def latex(termes):
    s = ''
    for i, (c, t) in enumerate(termes):
        signe = '-' if Fr(c) < 0 else ('' if i == 0 else '+')
        s += signe + coef_latex(c) + nom_latex(t)
    return s


def tracer(termes):
    s = ''
    for i, (c, t) in enumerate(termes):
        if i == 0:
            s += ('-' if Fr(c) < 0 else '') + coef_tracer(c) + t
        else:
            s += (' - ' if Fr(c) < 0 else ' + ') + coef_tracer(c) + t
    return s


def cas(textes, v='k'):
    """Un texte par cas, en ifs à plat."""
    return ''.join('{{if:' + v + '==' + str(i) + '|' + t + '}}' for i, t in enumerate(textes))


def col(x):
    return '\\textcolor{{{color:primary.0}}}{ ' + x + ' }'


def chaine(pts, nommes, origine, termes):
    """Chaque terme posé bout à bout depuis `origine` ; None si un point de passage n'est pas nommé.
    Essaie l'ordre donné, puis les termes tournés."""
    n = len(termes)
    for decal in range(n):
        ordre = termes[decal:] + termes[:decal]
        p, morceaux = origine, []
        for c, t in ordre:
            q = point_en(pts, add(pts[p], valeur(pts, nommes, t), c))
            if q is None:
                break
            morceaux.append((c, t, p + q))
            p = q
        else:
            return morceaux, p
    return None


def corrige_chasles(pts, nommes, origine, termes, legendes):
    r = chaine(pts, nommes, origine, termes)
    assert r is not None, (origine, termes)
    morceaux, fin = r
    egalites = []
    for c, t, pq in morceaux:
        gauche = ('-' if Fr(c) < 0 else '') + coef_latex(c) + nom_latex(t)
        if gauche != O(pq):
            egalites.append('$' + gauche + '=' + O(pq) + '$' + legendes.get((c, t), ''))
    e1 = ('On place les vecteurs bout à bout, en partant de $' + origine + '$ : '
          + ', '.join(egalites) + '.') if egalites else None
    e2 = ('Relation de Chasles : $' + latex(termes) + '=' + '+'.join(O(pq) for _, _, pq in morceaux) + '='
          + col(O(origine + fin)) + '$.')
    return [x for x in [e1, e2] if x], fin


def etapes_par_cas(details):
    """Corrigé par cas : chaque étape en ifs à plat (même nombre d'étapes : les plus courts sont
    complétés par la phrase finale)."""
    n = max(len(d) for d in details)
    pleins = [d[:-1] + [''] * (n - len(d)) + d[-1:] for d in details]
    out = []
    for i in range(n):
        t = cas([d[i] for d in pleins])
        if t.replace('{{if:k==', '').strip('|}0123456789'):
            out.append(t)
    return out


def spec(desc, vi, k, answer, status):
    return {'description': desc, 'variationIndex': vi, 'variables': {'k': str(k)},
            'answers': [answer], 'expected': {'status': status}}


def variation(statement, n, steps):
    return {'statement': statement, 'variables': [{'name': 'k', 'expression': '0..' + str(n - 1)}],
            'correction': {'steps': steps}}


def bloc(lignes):
    return '```solide\n' + '\n'.join(lignes) + '\n```'


CUBE_BLOC = ['forme: cube 4', 'sommets: A B C D E F G H']
CUBE_TEXTE = '$ABCDEFGH$ est un cube (face $ABCD$ en bas, $E$ au-dessus de $A$).'
CONSIGNE_IMPOSEE = 'Touche l\'extrémité de la flèche : son origine est déjà posée.'
CONSIGNE_LIBRE = ('Touche une origine, puis une extrémité : tu choisis l\'origine, tout représentant du '
                  'vecteur convient.')

VARIATIONS, SPECS = [], []

# --- v0 : cube, origine imposée, coefficients ±1 -------------------------------------------------

V0 = [('A', [(1, 'AB'), (1, 'AD')]),
      ('A', [(1, 'AB'), (1, 'AD'), (1, 'AE')]),
      ('D', [(1, 'AB'), (-1, 'AD'), (1, 'AE')]),
      ('B', [(1, 'AE'), (-1, 'AB')]),
      ('H', [(1, 'AB'), (-1, 'AE')]),
      ('F', [(-1, 'AB'), (1, 'AD')])]
LEG_CUBE = {}
d0 = []
for o, t in V0:
    pas, fin = corrige_chasles(CUBE, {}, o, t, LEG_CUBE)
    assert fin == extremite(CUBE, {}, o, t)
    d0.append(['Les faces du cube sont des carrés : deux arêtes parallèles de même sens donnent le même '
               'vecteur.'] + pas)
VARIATIONS.append(variation(
    CUBE_TEXTE + ' Représente le vecteur ' + cas(['$' + latex(t) + '$' for _, t in V0])
    + ' en partant du point ' + cas(['$' + o + '$' for o, _ in V0]) + '.\n\n' + CONSIGNE_IMPOSEE + '\n\n'
    + bloc(CUBE_BLOC + ['tracer: vecteur ' + cas([tracer(t) + ' depuis ' + o for o, t in V0])]),
    len(V0), etapes_par_cas(d0)))
SPECS += [spec('v0 : AB + AD depuis A → C', 0, 0, 'A/C', 'correct'),
          spec('v0 : sens inversé (C vers A)', 0, 0, 'C/A', 'incorrect'),
          spec('v0 : AB + AD + AE depuis A → G', 0, 1, 'A/G', 'correct'),
          spec('v0 : terme AE oublié (A → C)', 0, 1, 'A/C', 'incorrect'),
          spec('v0 : AB − AD + AE depuis D → F', 0, 2, 'D/F', 'correct'),
          spec('v0 : signe de AD ignoré (D → G)', 0, 2, 'D/G', 'incorrect'),
          spec('v0 : AE − AB depuis B → E', 0, 3, 'B/E', 'correct')]

# --- v1 : cube, origine libre --------------------------------------------------------------------

V1 = [[(1, 'AB'), (1, 'FG')],
      [(1, 'EF'), (1, 'BC'), (1, 'AE')],
      [(1, 'AB'), (-1, 'AD')],
      [(1, 'AD'), (1, 'GC')]]
d1 = []
for t in V1:
    reps = representants(CUBE, {}, t)
    o = reps[0].split('/')[0]
    pas, fin = corrige_chasles(CUBE, {}, o, t, LEG_CUBE)
    autres = [r for r in reps if r != o + '/' + fin]
    d1.append(['Deux arêtes parallèles de même sens donnent le même vecteur ; on choisit une origine '
               'commode, ici $' + o + '$.'] + pas
              + (['Les autres représentants sont aussi justes : '
                  + ', '.join('$' + O(r.replace('/', '')) + '$' for r in autres) + '.'] if autres else
                 ['C\'est le seul représentant dont les deux extrémités sont des sommets du cube.']))
VARIATIONS.append(variation(
    CUBE_TEXTE + ' Représente le vecteur ' + cas(['$' + latex(t) + '$' for t in V1]) + '.\n\n'
    + CONSIGNE_LIBRE + '\n\n' + bloc(CUBE_BLOC + ['tracer: vecteur ' + cas([tracer(t) for t in V1])]),
    len(V1), etapes_par_cas(d1)))
assert 'A/C' in representants(CUBE, {}, V1[0]) and 'E/G' in representants(CUBE, {}, V1[0])
assert representants(CUBE, {}, V1[2]) == ['D/B', 'H/F'], representants(CUBE, {}, V1[2])
SPECS += [spec('v1 : AB + FG, représentant A → C', 1, 0, 'A/C', 'correct'),
          spec('v1 : AB + FG, autre représentant E → G', 1, 0, 'E/G', 'correct'),
          spec('v1 : AB + FG, sens inversé (G → E)', 1, 0, 'G/E', 'incorrect'),
          spec('v1 : EF + BC + AE → A → G', 1, 1, 'A/G', 'correct'),
          spec('v1 : AB − AD, représentant H → F', 1, 2, 'H/F', 'correct'),
          spec('v1 : AB − AD, sens inversé (B → D)', 1, 2, 'B/D', 'incorrect')]

# --- v2 : cube, vecteurs donnés u, v, w, milieux déclarés ----------------------------------------

V2 = [('A', [(1, 'u'), (Fr(1, 2), 'w')]),
      ('A', [(1, 'u'), (1, 'v'), (Fr(1, 2), 'w')]),
      ('A', [(1, 'v'), (Fr(1, 2), 'w')]),
      ('B', [(Fr(1, 2), 'w'), (-1, 'u')])]
LEG_V2 = {(Fr(1, 2), 'w'): ' (milieu d\'une arête verticale)'}
d2 = []
for o, t in V2:
    pas, fin = corrige_chasles(CUBE_MILIEUX, CUBE_NOMMES, o, t, LEG_V2)
    assert fin == extremite(CUBE_MILIEUX, CUBE_NOMMES, o, t)
    d2.append(['$\\vec{u}=' + O('AB') + '$, $\\vec{v}=' + O('AD') + '$, $\\vec{w}=' + O('AE') + '$ ; $'
               + '\\dfrac{1}{2}\\vec{w}$ va d\'un sommet au milieu de l\'arête verticale qui en part.'] + pas)
VARIATIONS.append(variation(
    CUBE_TEXTE + ' Les vecteurs $\\vec{u}=' + O('AB') + '$, $\\vec{v}=' + O('AD') + '$ et $\\vec{w}=' + O('AE')
    + '$ sont dessinés ; $I$, $J$, $K$ et $L$ sont les milieux des arêtes $[BF]$, $[CG]$, $[DH]$ et $[AE]$.'
    + ' Représente le vecteur ' + cas(['$' + latex(t) + '$' for _, t in V2]) + ' en partant du point '
    + cas(['$' + o + '$' for o, _ in V2]) + '.\n\n' + CONSIGNE_IMPOSEE + '\n\n'
    + bloc(CUBE_BLOC + ['points: I milieu BF, J milieu CG, K milieu DH, L milieu AE',
                        'vecteurs: u = AB, v = AD, w = AE',
                        'tracer: vecteur ' + cas([tracer(t) + ' depuis ' + o for o, t in V2])]),
    len(V2), etapes_par_cas(d2)))
SPECS += [spec('v2 : u + ½ w depuis A → I', 2, 0, 'A/I', 'correct'),
          spec('v2 : ½ oublié (A → F)', 2, 0, 'A/F', 'incorrect'),
          spec('v2 : u + v + ½ w depuis A → J', 2, 1, 'A/J', 'correct'),
          spec('v2 : v + ½ w depuis A → K', 2, 2, 'A/K', 'correct'),
          spec('v2 : leurre, mauvais milieu (A → L)', 2, 2, 'A/L', 'incorrect'),
          spec('v2 : ½ w − u depuis B → L', 2, 3, 'B/L', 'correct'),
          spec('v2 : − u ignoré (B → I)', 2, 3, 'B/I', 'incorrect')]

# --- v3 : pavé droit, u = AB, v = AD, w = AE, centres de faces et centre du pavé -------------------
# (2026-11-04, David : le tétraèdre du bloc aligne presque trois sommets à l'écran — milieux et centre de
# gravité empilés — → pavé droit ; tétraèdre noté dans outils-manquants.md.)

V3 = [('A', [(Fr(1, 2), 'u'), (Fr(1, 2), 'v')], 'I'),
      ('A', [(Fr(1, 2), 'u'), (Fr(1, 2), 'w')], 'J'),
      ('A', [(Fr(1, 2), 'u'), (Fr(1, 2), 'v'), (Fr(1, 2), 'w')], 'O'),
      ('B', [(Fr(1, 2), 'v'), (Fr(1, 2), 'w')], 'K'),
      ('B', [(Fr(1, 2), 'w'), (Fr(-1, 2), 'u')], 'J')]
for o, t, fin in V3:
    assert extremite(PAVE, CUBE_NOMMES, o, t) == fin, (o, t)


def regle_face(c, face, diag, nx, ny, depart):
    """c centre de la face (parallélogramme) : milieu de la diagonale `diag` (qui part de `depart`)."""
    return ('$' + c + '$ est le centre du rectangle $' + face + '$, donc le milieu de sa diagonale $[' + diag
            + ']$ : $' + O(depart + c) + '=\\dfrac{1}{2}' + O(diag) + '$.')


D3 = [[regle_face('I', 'ABCD', 'AC', 'u', 'v', 'A'),
       'Or $' + O('AC') + '=' + O('AB') + '+' + O('BC') + '=\\vec{u}+\\vec{v}$, donc $' + latex(V3[0][1]) + '='
       + col(O('AI')) + '$.'],
      [regle_face('J', 'ABFE', 'AF', 'u', 'w', 'A'),
       'Or $' + O('AF') + '=' + O('AB') + '+' + O('BF') + '=\\vec{u}+\\vec{w}$, donc $' + latex(V3[1][1]) + '='
       + col(O('AJ')) + '$.'],
      ['$O$ est le centre du pavé, donc le milieu de la grande diagonale $[AG]$ : $' + O('AO') + '=\\dfrac{1}{2}'
       + O('AG') + '$.',
       'Or $' + O('AG') + '=' + O('AB') + '+' + O('BC') + '+' + O('CG') + '=\\vec{u}+\\vec{v}+\\vec{w}$, donc $'
       + latex(V3[2][1]) + '=' + col(O('AO')) + '$.'],
      [regle_face('K', 'BCGF', 'BG', 'v', 'w', 'B'),
       'Or $' + O('BG') + '=' + O('BC') + '+' + O('CG') + '=\\vec{v}+\\vec{w}$, donc $' + latex(V3[3][1]) + '='
       + col(O('BK')) + '$.'],
      [regle_face('J', 'ABFE', 'BE', 'w', 'u', 'B'),
       'Or $' + O('BE') + '=' + O('BF') + '+' + O('FE') + '=\\vec{w}-\\vec{u}$, donc $' + latex(V3[4][1]) + '='
       + col(O('BJ')) + '$.']]
# Les règles, vérifiées en coordonnées
for (o, _, fin), diag in zip(V3, ['AC', 'AF', 'AG', 'BG', 'BE']):
    assert vec(PAVE, o + fin) == tuple(x / 2 for x in vec(PAVE, diag)), (o, fin, diag)
VARIATIONS.append(variation(
    '$ABCDEFGH$ est un pavé droit (face $ABCD$ en bas, $E$ au-dessus de $A$). Les vecteurs $\\vec{u}=' + O('AB')
    + '$, $\\vec{v}=' + O('AD') + '$ et $\\vec{w}=' + O('AE') + '$ sont dessinés ; $I$, $J$ et $K$ sont les centres '
    'des faces $ABCD$, $ABFE$ et $BCGF$, $O$ est le centre du pavé. Représente le vecteur '
    + cas(['$' + latex(t) + '$' for _, t, _ in V3]) + ' en partant du point '
    + cas(['$' + o + '$' for o, _, _ in V3]) + '.\n\n' + CONSIGNE_IMPOSEE + '\n\n'
    + bloc(['forme: pave 6 6 7', 'sommets: A B C D E F G H',
            'points: I centre ABCD, J centre ABFE, K centre BCGF, O centre ABCDEFGH',
            'vecteurs: u = AB, v = AD, w = AE',
            'tracer: vecteur ' + cas([tracer(t) + ' depuis ' + o for o, t, _ in V3])]),
    len(V3), etapes_par_cas(D3)))
SPECS += [spec('v3 : ½ u + ½ v depuis A → I', 3, 0, 'A/I', 'correct'),
          spec('v3 : ½ oublié (A → C)', 3, 0, 'A/C', 'incorrect'),
          spec('v3 : ½ u + ½ w depuis A → J', 3, 1, 'A/J', 'correct'),
          spec('v3 : ½ (u + v + w) depuis A → O', 3, 2, 'A/O', 'correct'),
          spec('v3 : leurre, centre de face (A → I)', 3, 2, 'A/I', 'incorrect'),
          spec('v3 : ½ v + ½ w depuis B → K', 3, 3, 'B/K', 'correct'),
          spec('v3 : ½ w − ½ u depuis B → J', 3, 4, 'B/J', 'correct'),
          spec('v3 : signe de u ignoré (B vers K)', 3, 4, 'B/K', 'incorrect')]

# --- v4 : tétraèdre SABC, u = SA, v = SB, w = SC, milieux et centre de gravité ---------------------
# (2026-11-05, chantier tetraedre-vue : la vue du tétraèdre est lisible depuis #2400.) Aucun milieu de
# [SA], [SB], [SC] : il tomberait sur le nom de u, v ou w (écrit au milieu de la flèche). Repère affine
# (S ; SA, SB, SC) : les combinaisons ne dépendent pas de la forme du tétraèdre.

TETRA = {'S': (0, 0, 0), 'A': (1, 0, 0), 'B': (0, 1, 0), 'C': (0, 0, 1),
         'I': (0, Fr(1, 2), Fr(1, 2)), 'J': (Fr(1, 2), Fr(1, 2), 0), 'G': (Fr(1, 3), Fr(1, 3), Fr(1, 3))}
TETRA_NOMMES = {'u': 'SA', 'v': 'SB', 'w': 'SC'}
V4 = [('S', [(Fr(1, 2), 'v'), (Fr(1, 2), 'w')], 'I'),
      ('S', [(Fr(1, 3), 'u'), (Fr(1, 3), 'v'), (Fr(1, 3), 'w')], 'G'),
      ('A', [(Fr(1, 2), 'v'), (Fr(1, 2), 'w'), (-1, 'u')], 'I'),
      ('A', [(-1, 'u'), (1, 'v')], 'B'),
      ('C', [(Fr(1, 2), 'u'), (Fr(1, 2), 'v'), (-1, 'w')], 'J')]
for o, t, fin in V4:
    assert extremite(TETRA, TETRA_NOMMES, o, t) == fin, (o, t)
assert vec(TETRA, 'SI') == tuple((a + b) / 2 for a, b in zip(vec(TETRA, 'SB'), vec(TETRA, 'SC')))
assert vec(TETRA, 'SG') == tuple((a + b + c) / 3 for a, b, c in
                                 zip(vec(TETRA, 'SA'), vec(TETRA, 'SB'), vec(TETRA, 'SC')))
assert vec(TETRA, 'SJ') == tuple((a + b) / 2 for a, b in zip(vec(TETRA, 'SA'), vec(TETRA, 'SB')))
UVW_TETRA = ('$\\vec{u}=' + O('SA') + '$, $\\vec{v}=' + O('SB') + '$, $\\vec{w}=' + O('SC') + '$.')
REGLE_I = ('$I$ est le milieu de $[BC]$, donc $' + O('SI') + '=\\dfrac{1}{2}' + O('SB') + '+\\dfrac{1}{2}'
           + O('SC') + '=\\dfrac{1}{2}\\vec{v}+\\dfrac{1}{2}\\vec{w}$.')
D4 = [[REGLE_I, 'Donc $' + latex(V4[0][1]) + '=' + col(O('SI')) + '$.'],
      [
       '$G$ est le centre de gravité du triangle $ABC$ : $' + O('GA') + '+' + O('GB') + '+' + O('GC')
       + '=\\vec{0}$, donc $' + O('SA') + '+' + O('SB') + '+' + O('SC') + '=3' + O('SG') + '$.',
       'Donc $' + latex(V4[1][1]) + '=' + col(O('SG')) + '$.'],
      [REGLE_I,
       'Donc $' + latex(V4[2][1]) + '=' + O('SI') + '-' + O('SA') + '=' + O('AS') + '+' + O('SI') + '='
       + col(O('AI')) + '$ (relation de Chasles).'],
      [
       'Donc $' + latex(V4[3][1]) + '=-' + O('SA') + '+' + O('SB') + '=' + O('AS') + '+' + O('SB') + '='
       + col(O('AB')) + '$ (relation de Chasles).'],
      [
       '$J$ est le milieu de $[AB]$, donc $' + O('SJ') + '=\\dfrac{1}{2}' + O('SA') + '+\\dfrac{1}{2}' + O('SB')
       + '=\\dfrac{1}{2}\\vec{u}+\\dfrac{1}{2}\\vec{v}$.',
       'Donc $' + latex(V4[4][1]) + '=' + O('SJ') + '-' + O('SC') + '=' + O('CS') + '+' + O('SJ') + '='
       + col(O('CJ')) + '$ (relation de Chasles).']]
VARIATIONS.append(variation(
    '$SABC$ est un tétraèdre (sommet $S$, base $ABC$). Les vecteurs $\\vec{u}=' + O('SA') + '$, $\\vec{v}='
    + O('SB') + '$ et $\\vec{w}=' + O('SC') + '$ sont dessinés ; $I$ et $J$ sont les milieux des arêtes $[BC]$ '
    'et $[AB]$, $G$ est le centre de gravité du triangle $ABC$. Représente le vecteur '
    + cas(['$' + latex(t) + '$' for _, t, _ in V4]) + ' en partant du point '
    + cas(['$' + o + '$' for o, _, _ in V4]) + '.\n\n' + CONSIGNE_IMPOSEE + '\n\n'
    + bloc(['forme: pyramide triangle 4 3.27', 'sommets: S A B C',
            'points: I milieu BC, J milieu AB, G centre ABC',
            'vecteurs: u = SA, v = SB, w = SC',
            'tracer: vecteur ' + cas([tracer(t) + ' depuis ' + o for o, t, _ in V4])]),
    len(V4), [UVW_TETRA] + etapes_par_cas(D4)))
SPECS += [spec('v4 : ½ v + ½ w depuis S → I', 4, 0, 'S/I', 'correct'),
          spec('v4 : leurre, centre de gravité (S → G)', 4, 0, 'S/G', 'incorrect'),
          spec('v4 : ⅓ (u + v + w) depuis S → G', 4, 1, 'S/G', 'correct'),
          spec('v4 : leurre, milieu de [BC] (S → I)', 4, 1, 'S/I', 'incorrect'),
          spec('v4 : ½ v + ½ w − u depuis A → I', 4, 2, 'A/I', 'correct'),
          spec('v4 : leurre, centre de gravité (A → G)', 4, 2, 'A/G', 'incorrect'),
          spec('v4 : − u + v depuis A → B', 4, 3, 'A/B', 'correct'),
          spec('v4 : sens inversé (B vers A)', 4, 3, 'B/A', 'incorrect'),
          spec('v4 : ½ u + ½ v − w depuis C → J', 4, 4, 'C/J', 'correct'),
          spec('v4 : leurre, milieu de [BC] (C → I)', 4, 4, 'C/I', 'incorrect')]

MODELE = {'id': '7ce9936b-7835-4b99-9e2b-f3644f2956af',
          'title': 'Espace : tracer une combinaison linéaire de vecteurs',
          'description': 'Sur un cube, un pavé droit ou un tétraèdre nommé, représenter une combinaison linéaire de vecteurs '
                         'donnés (arêtes, ou u, v, w dessinés ; coefficients ±1, ½, ⅓) en touchant l\'origine et '
                         'l\'extrémité de la flèche (origine imposée ou libre ; pièges : sens, terme oublié, '
                         'milieu voisin)',
          'grades': ['T_SPE'], 'level': 6, 'delay': 120, 'status': 'draft',
          'variations': VARIATIONS, 'testSpecs': SPECS}

os.makedirs(DOSSIER, exist_ok=True)
chemin = os.path.join(DOSSIER, '1-tracer-combinaison.json')
with open(chemin, 'w', encoding='utf-8') as f:
    json.dump(MODELE, f, ensure_ascii=False, indent='\t')
    f.write('\n')
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True, stdout=subprocess.DEVNULL)
print(f'1 modèle écrit dans {chemin}')
