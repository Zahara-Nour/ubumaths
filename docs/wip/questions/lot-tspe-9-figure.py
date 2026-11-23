"""Écrit les 8 modèles du lot 9 « espace sur figure » de la terminale spécialité dans
scripts/questions/tspe-9-figure/.

Phase 0 validée par David le 2026-11-03 (D-L9, « je suis tes recos », journal
« docs/archive/wip/questions-tspe-lot9-progress.md »), un point par modèle :

| #  | Point    | Titre                                              | Catégorie, niveau                        |
| F1 | TSPE-335 | Exprimer un vecteur à l'aide des arêtes            | Vecteurs, droites et plans › Sur une figure, 1 |
| F2 | TSPE-338 | Coordonnées d'un vecteur dans une base             | … › Sur une figure, 2                    |
| F3 | TSPE-337 | Deux vecteurs d'un plan forment-ils une base ?     | … › Sur une figure, 3                    |
| F4 | TSPE-553 | Trois vecteurs forment-ils une base de l'espace ?  | … › Sur une figure, 4                    |
| F5 | TSPE-336 | Position relative de deux droites                  | … › Positions relatives, 1               |
| F6 | TSPE-551 | Position relative d'une droite et d'un plan        | … › Positions relatives, 2               |
| F7 | TSPE-552 | Position relative de deux plans                    | … › Positions relatives, 3               |
| F8 | TSPE-339 | Coplanarité et parallélisme sur un cube            | … › Sur une figure, 5                    |

Décisions : niveau `T_SPE` seul ; figure ```solide (cube, ou pavé droit si `p == 1` : rien ne dépend
des longueurs), vecteurs, droites et plans écrits dans l'énoncé entre sommets (le bloc ne dessine ni
flèche, ni diagonale, ni point hors sommet) ; faces et arêtes concernées marquées.

Les réponses et les corrigés sont **calculés ici** depuis les coordonnées des sommets dans la base
(AB, AD, AE) — A(0;0;0), B(1;0;0), C(1;1;0), D(0;1;0), E…H au-dessus —, jamais écrits à la main ; chaque
cas est vérifié par une assertion. Un cas tiré = la variable `k`, les textes de cas en `{{if:k==…}}` à
plat, les réponses de cas en variables (`{{if:}}` imbriqués, pas dans `expectedAnswer`).

Choix : quand les options dépendent du cas, la bonne est écrite en premier (réponse « 0 ») ; les choix
sont mélangés à l'affichage, le corrigé nomme la réponse, jamais son rang.

    python3 docs/wip/questions/lot-tspe-9-figure.py scripts/questions/tspe-9-figure
"""
import itertools
import json
import os
import subprocess
import sys
from fractions import Fraction as Fr

DOSSIER = sys.argv[1]
GEO = 'Géométrie'
VDP = 'Vecteurs, droites et plans de l\'espace'
FIG = 'Sur une figure'
POS = 'Positions relatives'

# --- Le cube --------------------------------------------------------------------------------------

S = {'A': (0, 0, 0), 'B': (1, 0, 0), 'C': (1, 1, 0), 'D': (0, 1, 0),
     'E': (0, 0, 1), 'F': (1, 0, 1), 'G': (1, 1, 1), 'H': (0, 1, 1)}
FACES = ['ABCD', 'EFGH', 'ABFE', 'BCGF', 'CDHG', 'ADHE']
BASE = ['AB', 'AD', 'AE']


def sub(p, q):
    return tuple(a - b for a, b in zip(p, q))


def vec(xy):
    """Coordonnées de XY dans la base (AB, AD, AE)."""
    return sub(S[xy[1]], S[xy[0]])


def cross(u, v):
    return (u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0])


def dot(u, v):
    return sum(a * b for a, b in zip(u, v))


def det(u, v, w):
    return dot(cross(u, v), w)


def colineaires(u, v):
    return cross(u, v) == (0, 0, 0)


def plan(xyz):
    """Plan par trois sommets : (normale, constante)."""
    n = cross(vec(xyz[0] + xyz[1]), vec(xyz[0] + xyz[2]))
    assert n != (0, 0, 0), xyz
    return n, dot(n, S[xyz[0]])


def dans(point, pl):
    return dot(pl[0], S[point]) == pl[1]


def sommets_du_plan(xyz):
    pl = plan(xyz)
    return ''.join(x for x in S if dans(x, pl))


def face_de(lettres):
    """La face qui contient tous ces sommets, ou None."""
    for f in FACES:
        if all(x in f for x in lettres):
            return f
    return None


def arete(xy):
    return sum(abs(c) for c in vec(xy)) == 1


def frac(c):
    c = Fr(c)
    if c.denominator == 1:
        return str(c.numerator)
    signe = '-' if c < 0 else ''
    return signe + '\\dfrac{' + str(abs(c.numerator)) + '}{' + str(c.denominator) + '}'


# --- Écriture -------------------------------------------------------------------------------------

def O(xy):
    return '\\overrightarrow{' + xy + '}'


def comb(c, base=BASE):
    """Combinaison a·u + b·v + c·w écrite, coefficients entiers ou fractions."""
    s = ''
    for coef, b in zip(c, base):
        coef = Fr(coef)
        if coef == 0:
            continue
        m = O(b)
        if coef == 1:
            t = m
        elif coef == -1:
            t = '-' + m
        else:
            t = frac(coef) + m
        s += t if s == '' or t.startswith('-') else '+' + t
    return s if s else '\\vec{0}'


def coords(c):
    return '(' + '\\,;\\,'.join(frac(x) for x in c) + ')'


def col(x):
    return '\\textcolor{{{color:primary.0}}}{ ' + x + ' }'


def cas(textes, v='k'):
    """Un texte par cas, en ifs à plat."""
    return ''.join('{{if:' + v + '==' + str(i) + '|' + t + '}}' for i, t in enumerate(textes))


def chaine(valeurs, v='k'):
    """Valeur d'une variable selon le cas, en ifs imbriqués."""
    if len(set(valeurs)) == 1:
        return str(valeurs[0])
    s = str(valeurs[-1])
    for i in range(len(valeurs) - 2, -1, -1):
        s = '{{if:' + v + '==' + str(i) + '|' + str(valeurs[i]) + '|' + s + '}}'
    return s


def choix(*items):
    return '```choix\n' + '\n'.join('- ' + i for i in items) + '\n```'


SOLIDE = 'un {{if:p==0|cube}}{{if:p==1|pavé droit}}'


def figure(marques):
    """Bloc ```solide ; `marques` : un texte par cas (jamais vide)."""
    assert all(marques), marques
    return ('```solide\nforme: {{if:p==0|cube 4}}{{if:p==1|pave 5 3 2}}\nsommets: A B C D E F G H\n'
            'marquer: ' + cas(marques) + '\n```')


def debut(marques):
    return '$ABCDEFGH$ est ' + SOLIDE + ' (face $ABCD$ en bas, $E$ au-dessus de $A$).\n\n' + figure(marques)


def marques_vecteurs(paires):
    """Arêtes marquées pour les vecteurs qui en sont, sinon les sommets."""
    m = []
    for xy in paires:
        if arete(xy):
            m.append('arete ' + xy)
        else:
            m += ['sommet ' + xy[0], 'sommet ' + xy[1]]
    out = []
    for x in m:
        if x not in out:
            out.append(x)
    return ', '.join(out)


def marque_plan(xyz):
    f = face_de(xyz)
    if f:
        return 'face ' + f
    return ', '.join('sommet ' + x for x in sommets_du_plan(xyz))


def chasles(xy):
    """Chemin de X à Y le long des arêtes (x, puis y, puis z) : étapes et égalités."""
    pos = list(S[xy[0]])
    nom = {v: k for k, v in S.items()}
    pts = [xy[0]]
    egal = []
    for axe in range(3):
        d = S[xy[1]][axe] - pos[axe]
        if d == 0:
            continue
        pos[axe] += d
        pts.append(nom[tuple(pos)])
        pas = pts[-2] + pts[-1]
        b = BASE[axe]
        if pas == b:
            continue
        if d == 1:
            egal.append('$' + O(pas) + '=' + O(b) + '$')
        elif pas == b[::-1]:
            egal.append('$' + O(pas) + '=-' + O(b) + '$')
        else:
            egal.append('$' + O(pas) + '=' + O(b[::-1]) + '=-' + O(b) + '$')
    etapes = [pts[i] + pts[i + 1] for i in range(len(pts) - 1)]
    return etapes, egal


def texte_chasles(xy):
    etapes, egal = chasles(xy)
    t = 'On va de $' + xy[0] + '$ à $' + xy[1] + '$ le long des arêtes (relation de Chasles) : $' + O(xy) + '='
    t += '+'.join(O(e) for e in etapes) + '$.'
    if egal:
        t += ' Les faces sont des parallélogrammes : ' + ', '.join(egal) + '.'
    return t


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(nom, title, description, subdomain, level, variations, specs, delay=120):
    return nom, {'title': title, 'description': description, 'grades': ['T_SPE'],
                 'theme': GEO, 'domain': VDP, 'subdomain': subdomain,
                 'level': level, 'delay': delay, 'status': 'draft',
                 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, n, answers, steps, extra_vars=None):
    vs = [var('p', '0..1'), var('k', '0..' + str(n - 1))] + (extra_vars or [])
    return {'statement': statement, 'variables': vs,
            'blanks': [{'expectedAnswer': a} for a in answers],
            'correction': {'steps': steps}}


def resoudre2(u, v, w):
    """x, y tels que w = x u + y v, lus sur deux coordonnées ; (i, j, x, y, ok)."""
    for i, j in [(0, 1), (0, 2), (1, 2)]:
        d = u[i] * v[j] - u[j] * v[i]
        if d != 0:
            x = Fr(w[i] * v[j] - w[j] * v[i], d)
            y = Fr(u[i] * w[j] - u[j] * w[i], d)
            ok = all(x * a + y * b == c for a, b, c in zip(u, v, w))
            return i, j, x, y, ok
    raise AssertionError((u, v, w))


RANG = ['première', 'deuxième', 'troisième']


def texte_resolution(nu, nv, nw):
    """Corrigé de « w = x u + y v ? » (u, v non colinéaires) : étapes et réponse."""
    u, v, w = vec(nu), vec(nv), vec(nw)
    i, j, x, y, ok = resoudre2(u, v, w)
    k = 3 - i - j
    e1 = ('Dans la base $(' + ','.join(O(b) for b in BASE) + ')$ : $' + O(nu) + coords(u) + '$, $' + O(nv)
          + coords(v) + '$, $' + O(nw) + coords(w) + '$.')
    e2 = ('On cherche $x$ et $y$ tels que $' + O(nw) + '=x' + O(nu) + '+y' + O(nv) + '$. Les ' + RANG[i]
          + ' et ' + RANG[j] + ' coordonnées donnent $x=' + frac(x) + '$ et $y=' + frac(y) + '$.')
    val = x * u[k] + y * v[k]
    e3 = ('Pour la ' + RANG[k] + ' coordonnée : $' + frac(x) + '\\times' + par(u[k]) + '+' + par(y) + '\\times'
          + par(v[k]) + '=' + frac(val) + '$, ' + ('et c\'est bien la ' + RANG[k] + ' coordonnée de $' + O(nw)
                                                   + '$ : $' + O(nw) + '=' + comb((x, y, 0), [nu, nv, 'X']) + '$.'
                                                   if ok else 'or la ' + RANG[k] + ' coordonnée de $' + O(nw)
                                                   + '$ vaut $' + frac(w[k]) + '$ : aucun couple ne convient.'))
    return [e1, e2, e3], ok


def par(c):
    t = frac(c)
    return '\\left(' + t + '\\right)' if Fr(c) < 0 else t


MODELES = []

# --- F1. TSPE-335 : exprimer un vecteur à l'aide des arêtes -----------------------------------------


def leurres(c):
    """Trois combinaisons fausses : signe changé, terme oublié, terme ajouté, tout positif."""
    out = []
    nz = [i for i in range(3) if c[i] != 0]
    cands = []
    for i in nz:
        d = list(c)
        d[i] = -d[i]
        cands.append(tuple(d))
    cands.append(tuple(abs(x) for x in c))
    cands.append(tuple(-x for x in c))
    for i in reversed(nz):
        d = list(c)
        d[i] = 0
        cands.append(tuple(d))
    for i in range(3):
        if c[i] == 0:
            d = list(c)
            d[i] = 1
            cands.append(tuple(d))
    for d in cands:
        if d != tuple(c) and d not in out and any(d):
            out.append(d)
    assert len(out) >= 3, c
    return out[:3]


def paires(filtre):
    return [x + y for x, y in itertools.permutations(S, 2) if filtre(vec(x + y))]


F1_CAS = [
    # diagonales de face, sans signe moins
    ['AC', 'AF', 'AH', 'BG', 'DG', 'EG'],
    # grandes diagonales
    ['AG', 'GA', 'BH', 'HB', 'CE', 'EC', 'DF', 'FD'],
    # diagonales de face avec un signe moins
    ['BD', 'CA', 'FH', 'GE', 'CF', 'BE', 'HA', 'GB'],
]
assert all(sorted(vec(xy)) == [0, 1, 1] for xy in F1_CAS[0])
assert all(0 not in vec(xy) for xy in F1_CAS[1])
assert all(sorted(abs(x) for x in vec(xy)) == [0, 1, 1] and min(vec(xy)) < 0 for xy in F1_CAS[2])


def v_f1(liste):
    enonce = (debut([marques_vecteurs(['AB', 'AD', 'AE'] + [xy]) for xy in liste])
              + '\n\nExprime ' + cas(['$' + O(xy) + '$' for xy in liste]) + ' en fonction de $' + O('AB')
              + '$, $' + O('AD') + '$ et $' + O('AE') + '$.\n\n'
              + choix(cas(['$' + comb(vec(xy)) + '$' for xy in liste]),
                      *[cas(['$' + comb(leurres(vec(xy))[r]) + '$' for xy in liste]) for r in range(3)]))
    return variation(enonce, len(liste), ['0'],
                     [cas([texte_chasles(xy) for xy in liste]),
                      cas(['Donc $' + col(O(xy) + '=' + comb(vec(xy))) + '$.' for xy in liste])])


MODELES.append(modele(
    '1-exprimer-vecteur', 'Espace : exprimer un vecteur à l\'aide des arêtes',
    'Sur un cube ou un pavé droit nommé, écrire un vecteur entre deux sommets (diagonale de face, '
    'grande diagonale, sens contraire aux arêtes) en fonction de AB, AD, AE (pièges : signe, terme '
    'oublié ou ajouté)',
    FIG, 1, [v_f1(liste) for liste in F1_CAS],
    [spec('v0 : AC = AB + AD', 0, {'p': 0, 'k': 0}, '0', 'correct'),
     spec('v0 : leurre', 0, {'p': 0, 'k': 0}, '1', 'incorrect'),
     spec('v1 : AG = AB + AD + AE (pavé)', 1, {'p': 1, 'k': 0}, '0', 'correct'),
     spec('v1 : CE, signe oublié', 1, {'p': 0, 'k': 4}, '2', 'incorrect'),
     spec('v2 : BD = -AB + AD', 2, {'p': 0, 'k': 0}, '0', 'correct'),
     spec('v2 : BD, leurre', 2, {'p': 1, 'k': 0}, '3', 'incorrect')]))

# --- F2. TSPE-338 : coordonnées d'un vecteur dans une base ------------------------------------------

F2_CAS = [
    ['BG', 'DG', 'EG', 'HG', 'AF', 'FG', 'AG', 'BF'],
    ['CE', 'GA', 'BD', 'FH', 'HB', 'GE', 'CF', 'FD'],
    ['AC', 'AG', 'BH', 'DF', 'AD', 'EH', 'CE', 'DB'],
]
assert all(min(vec(xy)) >= 0 for xy in F2_CAS[0])
assert all(min(vec(xy)) < 0 for xy in F2_CAS[1])
BASE2 = ['AB', 'AC', 'AE']


def dans_base2(c):
    """a AB + b AD + c AE avec AD = AC − AB : (a − b) AB + b AC + c AE."""
    return (c[0] - c[1], c[1], c[2])


for xy in F2_CAS[2]:
    a = dans_base2(vec(xy))
    assert tuple(a[0] * x + a[1] * y + a[2] * z for x, y, z in zip(vec('AB'), vec('AC'), vec('AE'))) == vec(xy)


def substitue(c):
    """a AB + b (AC − AB) + c AE, écrit avant réduction (b = ±1)."""
    assert c[1] in (1, -1), c
    t = comb((c[0], 0, 0))
    par_ = '\\left(' + O('AC') + '-' + O('AB') + '\\right)'
    t = (par_ if t == '\\vec{0}' else t + '+' + par_) if c[1] == 1 else ('' if t == '\\vec{0}' else t) + '-' + par_
    reste = comb((0, 0, c[2]))
    if reste != '\\vec{0}':
        t += reste if reste.startswith('-') else '+' + reste
    return t


def base_tex(base):
    return '$(' + ','.join(O(b) for b in base) + ')$'


def v_f2(liste, base):
    c = [vec(xy) if base == BASE else dans_base2(vec(xy)) for xy in liste]
    noms = ['x', 'y', 'z']
    extra = [var(noms[i], chaine([cc[i] for cc in c])) for i in range(3)]
    enonce = (debut([marques_vecteurs(base + [xy]) for xy in liste])
              + '\n\nDonne les coordonnées de ' + cas(['$' + O(xy) + '$' for xy in liste]) + ' dans la base '
              + base_tex(base) + '.\n\nCoordonnées : $(?\\,;\\,?\\,;\\,?)$')
    pas = [cas([texte_chasles(xy) for xy in liste]),
           cas(['Donc $' + O(xy) + '=' + comb(vec(xy)) + '$.' for xy in liste])]
    if base != BASE:
        pas.append('On remplace : $' + O('AD') + '=' + O('AC') + '-' + O('AB') + '$ (relation de Chasles, $'
                   + O('AD') + '=' + O('AC') + '+' + O('CD') + '$ et $' + O('CD') + '=-' + O('AB') + '$).')
        pas.append(cas(['$' + O(xy) + '=' + substitue(vec(xy)) + '=' + comb(cc, base) + '$, donc dans la base ' + base_tex(base) + ' : $'
                        + col(O(xy) + coords(cc)) + '$.' for xy, cc in zip(liste, c)]))
    else:
        pas.append(cas(['Les coefficients de $' + O('AB') + '$, $' + O('AD') + '$, $' + O('AE')
                        + '$ sont les coordonnées : $' + col(O(xy) + coords(cc)) + '$.'
                        for xy, cc in zip(liste, c)]))
    return variation(enonce, len(liste), ['{{x}}', '{{y}}', '{{z}}'], pas, extra)


MODELES.append(modele(
    '2-coordonnees-base', 'Espace : coordonnées d\'un vecteur dans une base',
    'Sur un cube ou un pavé droit nommé, coordonnées d\'un vecteur entre deux sommets dans la base '
    '(AB, AD, AE), puis dans la base (AB, AC, AE) (pièges : signe, coefficients de l\'ancienne base)',
    FIG, 2, [v_f2(F2_CAS[0], BASE), v_f2(F2_CAS[1], BASE), v_f2(F2_CAS[2], BASE2)],
    [spec('v0 : BG(0 ; 1 ; 1)', 0, {'p': 0, 'k': 0}, ['0', '1', '1'], 'correct'),
     spec('v0 : BG, ordre des coordonnées', 0, {'p': 0, 'k': 0}, ['1', '1', '0'], 'incorrect'),
     spec('v1 : CE(-1 ; -1 ; 1)', 1, {'p': 1, 'k': 0}, ['-1', '-1', '1'], 'correct'),
     spec('v1 : CE, signes oubliés', 1, {'p': 1, 'k': 0}, ['1', '1', '1'], 'incorrect'),
     spec('v2 : AC(0 ; 1 ; 0) dans (AB, AC, AE)', 2, {'p': 0, 'k': 0}, ['0', '1', '0'], 'correct'),
     spec('v2 : AC, coordonnées dans (AB, AD, AE)', 2, {'p': 0, 'k': 0}, ['1', '1', '0'], 'incorrect'),
     spec('v2 : BH(-2 ; 1 ; 1)', 2, {'p': 0, 'k': 2}, ['-2', '1', '1'], 'correct')]))

# --- F3. TSPE-337 : deux vecteurs d'un plan forment-ils une base ? ----------------------------------

F3_CAS = [
    # dans une face, non colinéaires (orthogonaux ou non)
    [('ABC', 'AB', 'AC'), ('BCG', 'BC', 'BG'), ('EFG', 'EG', 'FH'), ('ADH', 'AD', 'EH'), ('ABF', 'AF', 'BF'),
     ('CDH', 'DC', 'CH')],
    # dans une face, colinéaires
    [('ABC', 'AB', 'DC'), ('ABC', 'AD', 'CB'), ('EFG', 'EF', 'GH'), ('BCG', 'BF', 'CG'), ('ABF', 'AF', 'EB'),
     ('CDH', 'DH', 'GC')],
    # dans le plan diagonal ACGE ou BDHF
    [('ACG', 'AC', 'EG'), ('ACG', 'AC', 'AG'), ('ACG', 'AE', 'GC'), ('ACG', 'CE', 'AG'), ('BDH', 'BD', 'HF'),
     ('BDH', 'BH', 'DF')],
]
F3_CHOIX = ['Oui : ils ne sont pas colinéaires.', 'Non : ils sont colinéaires.',
            'Non : ils ne sont pas orthogonaux.']


def nom_plan(xyz):
    return '$(' + xyz + ')$'


def v_f3(liste):
    for pl, u, v in liste:
        assert all(x in sommets_du_plan(pl) for x in u + v), (pl, u, v)
    rep = [1 if colineaires(vec(u), vec(v)) else 0 for _, u, v in liste]
    enonce = (debut([marque_plan(pl) for pl, _, _ in liste])
              + '\n\nLes vecteurs ' + cas(['$' + O(u) + '$ et $' + O(v) + '$ sont deux vecteurs du plan '
                                          + nom_plan(pl) for pl, u, v in liste])
              + '. Forment-ils une base de ce plan ?\n\n' + choix(*F3_CHOIX))

    def detail(pl, u, v):
        cu, cv = vec(u), vec(v)
        if colineaires(cu, cv):
            k = 1 if cu == cv else -1
            return ('$' + O(v) + '=' + ('' if k == 1 else '-') + O(u) + '$ : les vecteurs sont colinéaires, $'
                    + col('\\text{ils ne forment pas une base}') + '$.')
        return ('$' + O(u) + '=' + comb(cu) + '$ et $' + O(v) + '=' + comb(cv) + '$ : aucun réel $k$ ne donne $'
                + O(v) + '=k' + O(u) + '$. Les vecteurs ne sont pas colinéaires, $'
                + col('\\text{ils forment une base du plan}') + '$'
                + (' (même s\'ils ne sont pas orthogonaux).' if dot(cu, cv) != 0 else '.'))

    return variation(enonce, len(liste), ['{{r}}'],
                     ['Deux vecteurs d\'un plan en forment une base si et seulement s\'ils ne sont **pas '
                      'colinéaires** ; ils n\'ont pas besoin d\'être orthogonaux.',
                      cas([detail(*c) for c in liste])],
                     [var('r', chaine(rep))])


MODELES.append(modele(
    '3-base-du-plan', 'Espace : deux vecteurs forment-ils une base d\'un plan ?',
    'Sur un cube ou un pavé droit nommé, deux vecteurs d\'une face ou d\'un plan diagonal : base du plan '
    'si et seulement s\'ils ne sont pas colinéaires (pièges : exiger l\'orthogonalité, vecteurs parallèles '
    'de sens contraire)',
    FIG, 3, [v_f3(liste) for liste in F3_CAS],
    [spec('v0 : AB, AC : oui', 0, {'p': 0, 'k': 0}, '0', 'correct'),
     spec('v0 : AB, AC : « pas orthogonaux » (piège)', 0, {'p': 0, 'k': 0}, '2', 'incorrect'),
     spec('v1 : AB, DC : non', 1, {'p': 1, 'k': 0}, '1', 'correct'),
     spec('v1 : AD, CB : « oui » (piège du sens)', 1, {'p': 0, 'k': 1}, '0', 'incorrect'),
     spec('v2 : AC, EG : non', 2, {'p': 0, 'k': 0}, '1', 'correct'),
     spec('v2 : AC, AG : oui', 2, {'p': 0, 'k': 1}, '0', 'correct')]))

# --- F4. TSPE-553 : trois vecteurs forment-ils une base de l'espace ? -------------------------------

F4_CAS = [
    # base : trois vecteurs d'une même origine, quatre points non coplanaires
    [('AB', 'AD', 'AE'), ('AB', 'AC', 'AG'), ('AC', 'AF', 'AH'), ('GH', 'GF', 'GC'), ('BA', 'BG', 'BD'),
     ('AB', 'AC', 'AE')],
    # coplanaires, deux à deux non colinéaires
    [('AB', 'AD', 'AC'), ('AB', 'AC', 'BD'), ('AF', 'AC', 'CF'), ('EG', 'AB', 'AD'), ('AE', 'AC', 'AG'),
     ('AH', 'AB', 'AG')],
    # deux colinéaires
    [('AB', 'HG', 'AE'), ('AE', 'CG', 'AD'), ('AC', 'EG', 'AB'), ('AB', 'AD', 'CB'), ('AF', 'DG', 'AE')],
]
F4_CHOIX = ['Oui, ils forment une base de l\'espace.',
            'Non : aucun n\'est colinéaire à un autre, mais ils sont coplanaires.',
            'Non : deux d\'entre eux sont colinéaires.']


def nature_f4(t):
    u, v, w = (vec(x) for x in t)
    if det(u, v, w) != 0:
        return 0
    if any(colineaires(a, b) for a, b in [(u, v), (u, w), (v, w)]):
        return 2
    return 1


for s_, liste in enumerate(F4_CAS):
    assert all(nature_f4(t) == s_ for t in liste), s_
assert all(t[0][0] == t[1][0] == t[2][0] for t in F4_CAS[0])


def detail_f4(t):
    s_ = nature_f4(t)
    if s_ == 0:
        x = t[0][0]
        pts = x + t[0][1] + t[1][1]
        dansp = sommets_du_plan(pts)
        f = face_de(pts)
        lieu = ('la face $' + f + '$' if f else 'le plan $(' + pts + ')$, qui ne passe que par les sommets '
                + ', '.join('$' + y + '$' for y in dansp))
        return ('Les trois vecteurs partent de $' + x + '$ : ils forment une base si et seulement si les points $'
                + x + '$, $' + t[0][1] + '$, $' + t[1][1] + '$, $' + t[2][1] + '$ ne sont pas coplanaires. Les '
                'trois premiers sont dans ' + lieu + ', et $' + t[2][1] + '$ n\'y est pas : $'
                + col('\\text{ils forment une base}') + '$.')
    if s_ == 2:
        for a, b in [(0, 1), (0, 2), (1, 2)]:
            ca, cb = vec(t[a]), vec(t[b])
            if colineaires(ca, cb):
                return ('$' + O(t[b]) + '=' + ('' if ca == cb else '-') + O(t[a]) + '$ : deux vecteurs sont '
                        'colinéaires, $' + col('\\text{ils ne forment pas une base}') + '$.')
    for w in range(3):
        u, v = [t[i] for i in range(3) if i != w]
        i, j, x, y, ok = resoudre2(vec(u), vec(v), vec(t[w]))
        if ok:
            return ('Aucun n\'est colinéaire à un autre, mais $' + O(t[w]) + '=' + comb((x, y, 0), [u, v, 'X'])
                    + '$ : les trois vecteurs sont coplanaires, $' + col('\\text{ils ne forment pas une base}')
                    + '$.')
    raise AssertionError(t)


def v_f4(liste, s_):
    enonce = (debut([marques_vecteurs(list(t)) for t in liste])
              + '\n\nLes vecteurs ' + cas(['$' + O(t[0]) + '$, $' + O(t[1]) + '$ et $' + O(t[2]) + '$'
                                          for t in liste])
              + ' forment-ils une base de l\'espace ?\n\n' + choix(*F4_CHOIX))
    return variation(enonce, len(liste), [str(s_)],
                     ['Trois vecteurs forment une base de l\'espace si et seulement s\'ils ne sont **pas '
                      'coplanaires** (aucun ne s\'écrit en fonction des deux autres).',
                      cas([detail_f4(t) for t in liste])])


MODELES.append(modele(
    '4-base-espace', 'Espace : trois vecteurs forment-ils une base ?',
    'Sur un cube ou un pavé droit nommé, trois vecteurs entre sommets : base, coplanaires sans être '
    'colinéaires deux à deux, ou deux colinéaires (pièges : coplanaires pris pour une base, vecteurs '
    'parallèles d\'origines différentes)',
    FIG, 4, [v_f4(liste, s_) for s_, liste in enumerate(F4_CAS)],
    [spec('v0 : AB, AD, AE : base', 0, {'p': 0, 'k': 0}, '0', 'correct'),
     spec('v0 : AC, AF, AH : « coplanaires »', 0, {'p': 1, 'k': 2}, '1', 'incorrect'),
     spec('v1 : AB, AD, AC : coplanaires', 1, {'p': 0, 'k': 0}, '1', 'correct'),
     spec('v1 : EG, AB, AD : « base » (piège)', 1, {'p': 0, 'k': 3}, '0', 'incorrect'),
     spec('v2 : AB, HG, AE : colinéaires', 2, {'p': 1, 'k': 0}, '2', 'correct'),
     spec('v2 : AB, HG, AE : « base » (piège)', 2, {'p': 0, 'k': 0}, '0', 'incorrect')],
    delay=150))

# --- F5. TSPE-336 : position relative de deux droites -----------------------------------------------

F5_CAS = [
    # sécantes
    [('AC', 'BD'), ('AG', 'CE'), ('AF', 'BE'), ('BH', 'DF'), ('AB', 'BG'), ('EC', 'AC')],
    # strictement parallèles
    [('AB', 'HG'), ('AD', 'FG'), ('AF', 'DG'), ('AC', 'EG'), ('BD', 'FH'), ('CF', 'DE')],
    # non coplanaires
    [('AB', 'CG'), ('AB', 'EH'), ('AC', 'BF'), ('AC', 'FH'), ('AG', 'BD'), ('EB', 'DG')],
]
F5_CHOIX = ['Sécantes.', 'Strictement parallèles.', 'Non coplanaires.', 'Confondues.']


def nature_f5(d1, d2):
    u, v = vec(d1), vec(d2)
    w = sub(S[d2[0]], S[d1[0]])
    if colineaires(u, v):
        return 3 if colineaires(u, w) else 1
    return 0 if det(u, v, w) == 0 else 2


for s_, liste in enumerate(F5_CAS):
    assert all(nature_f5(*c) == s_ for c in liste), s_


def detail_f5(d1, d2):
    s_ = nature_f5(d1, d2)
    u, v = vec(d1), vec(d2)
    if s_ == 1:
        return ('$' + O(d2) + '=' + ('' if u == v else '-') + O(d1) + '$ : les droites sont parallèles ; $' + d2[0]
                + '$ n\'est pas sur $(' + d1 + ')$ (trois sommets ne sont jamais alignés), donc elles sont $'
                + col('\\text{strictement parallèles}') + '$.')
    if s_ == 2:
        return ('Les points $' + d1[0] + '$, $' + d1[1] + '$, $' + d2[0] + '$ définissent un plan, qui ne contient '
                'pas $' + d2[1] + '$ : la droite $(' + d2 + ')$ ne coupe ce plan qu\'en $' + d2[0] + '$, qui n\'est '
                'pas sur $(' + d1 + ')$. Les droites ne se coupent pas, et elles ne sont pas parallèles ($' + O(d2)
                + '$ n\'est pas colinéaire à $' + O(d1) + '$) : elles sont $' + col('\\text{non coplanaires}')
                + '$.')
    commun = set(d1) & set(d2)
    if commun:
        x = commun.pop()
        return ('Les deux droites passent par $' + x + '$ et ne sont pas parallèles : elles sont $'
                + col('\\text{sécantes}') + '$ en $' + x + '$.')
    # diagonales d'un parallélogramme X Z Y T
    x, y, z, t = d1[0], d1[1], d2[0], d2[1]
    if vec(x + z) != vec(t + y):
        z, t = t, z
    assert vec(x + z) == vec(t + y), (d1, d2)
    quad = x + z + y + t
    f = face_de(quad)
    lieu = 'la face $' + f + '$' if f else 'le parallélogramme $' + quad + '$'
    return ('$' + O(x + z) + '=' + O(t + y) + '$ : $' + quad + '$ est un parallélogramme, de diagonales $[' + d1
            + ']$ et $[' + d2 + ']$. Elles se coupent en leur milieu (centre de ' + lieu + ') : les droites sont $'
            + col('\\text{sécantes}') + '$.')


def v_f5(liste, s_):
    enonce = (debut([marques_vecteurs([d1, d2]) for d1, d2 in liste])
              + '\n\nQuelle est la position relative des droites ' + cas(['$(' + d1 + ')$ et $(' + d2 + ')$'
                                                                         for d1, d2 in liste])
              + ' ?\n\n' + choix(*F5_CHOIX))
    return variation(enonce, len(liste), [str(s_)],
                     ['Deux droites de l\'espace sont soit **coplanaires** (sécantes ou parallèles), soit **non '
                      'coplanaires** : ni sécantes, ni parallèles.',
                      cas([detail_f5(*c) for c in liste])])


MODELES.append(modele(
    '5-droites', 'Espace : position relative de deux droites',
    'Sur un cube ou un pavé droit nommé, deux droites par deux sommets : sécantes (en un sommet ou au '
    'milieu de diagonales), strictement parallèles, non coplanaires (piège : ne pas se couper n\'est pas '
    'être parallèles)',
    POS, 1, [v_f5(liste, s_) for s_, liste in enumerate(F5_CAS)],
    [spec('v0 : (AC), (BD) sécantes', 0, {'p': 0, 'k': 0}, '0', 'correct'),
     spec('v0 : (AG), (CE) « non coplanaires »', 0, {'p': 1, 'k': 1}, '2', 'incorrect'),
     spec('v1 : (AB), (HG) parallèles', 1, {'p': 0, 'k': 0}, '1', 'correct'),
     spec('v1 : (CF), (DE) « confondues »', 1, {'p': 0, 'k': 5}, '3', 'incorrect'),
     spec('v2 : (AB), (CG) non coplanaires', 2, {'p': 1, 'k': 0}, '2', 'correct'),
     spec('v2 : (AB), (CG) « parallèles » (piège)', 2, {'p': 0, 'k': 0}, '1', 'incorrect'),
     spec('v2 : (AC), (FH) « sécantes » (piège)', 2, {'p': 0, 'k': 3}, '0', 'incorrect')]))

# --- F6. TSPE-551 : position relative d'une droite et d'un plan -------------------------------------

F6_CAS = [
    # sécants
    [('EC', 'ABD'), ('AG', 'BCF'), ('DF', 'EFG'), ('CE', 'ABF'), ('BG', 'ACG'), ('HB', 'ABC')],
    # strictement parallèles
    [('EG', 'ABC'), ('BF', 'ACG'), ('AF', 'DCG'), ('DE', 'BCG'), ('CH', 'ABF'), ('BD', 'EFG')],
    # contenue
    [('AG', 'ACE'), ('BH', 'ABG'), ('FH', 'EFG'), ('CE', 'ACG'), ('DF', 'BDH'), ('AH', 'ADE')],
]
F6_CHOIX = ['Sécants : la droite coupe le plan en un seul point.', 'Strictement parallèles.',
            'La droite est contenue dans le plan.']


def nature_f6(d, pl):
    p = plan(pl)
    a, b = dans(d[0], p), dans(d[1], p)
    if a and b:
        return 2
    return 1 if dot(p[0], vec(d)) == 0 else 0


for s_, liste in enumerate(F6_CAS):
    assert all(nature_f6(*c) == s_ for c in liste), s_


def detail_f6(d, pl):
    s_ = nature_f6(d, pl)
    p = plan(pl)
    if s_ == 2:
        return ('$' + d[0] + '$ et $' + d[1] + '$ sont tous deux dans le plan $(' + pl + ')$ : $'
                + col('\\text{la droite est contenue dans le plan}') + '$.')
    if s_ == 0:
        x, y = (d[0], d[1]) if dans(d[0], p) else (d[1], d[0])
        assert dans(x, p) and not dans(y, p)
        return ('$' + x + '$ est dans le plan $(' + pl + ')$ et $' + y + '$ n\'y est pas : la droite et le plan '
                'sont $' + col('\\text{sécants}') + '$, en $' + x + '$.')
    pts = sommets_du_plan(pl)
    zt = next(z + t for z, t in itertools.permutations(pts, 2) if vec(z + t) == vec(d))
    return ('$' + O(d) + '=' + O(zt) + '$, et $' + zt[0] + '$, $' + zt[1] + '$ sont dans le plan $(' + pl
            + ')$ : la droite est parallèle au plan. $' + d[0] + '$ n\'est pas dans le plan, donc elle est $'
            + col('\\text{strictement parallèle au plan}') + '$.')


def v_f6(liste, s_):
    enonce = (debut([marque_plan(pl) + (', arete ' + d if arete(d) else '') for d, pl in liste])
              + '\n\nQuelle est la position relative de la droite ' + cas(['$(' + d + ')$ et du plan $(' + pl
                                                                          + ')$' for d, pl in liste])
              + ' ?\n\n' + choix(*F6_CHOIX))
    return variation(enonce, len(liste), [str(s_)],
                     ['Une droite et un plan sont soit **sécants** (un seul point commun), soit **parallèles** '
                      '(la droite est dirigée par un vecteur du plan) : strictement parallèles, ou droite contenue '
                      'dans le plan.',
                      cas([detail_f6(*c) for c in liste])])


MODELES.append(modele(
    '6-droite-plan', 'Espace : position relative d\'une droite et d\'un plan',
    'Sur un cube ou un pavé droit nommé, une droite par deux sommets et un plan par trois sommets (face '
    'ou plan diagonal) : sécants, strictement parallèles, droite contenue (pièges : droite qui ne touche '
    'pas la face dessinée mais coupe le plan, contenue prise pour sécante)',
    POS, 2, [v_f6(liste, s_) for s_, liste in enumerate(F6_CAS)],
    [spec('v0 : (EC) et (ABD) sécants', 0, {'p': 0, 'k': 0}, '0', 'correct'),
     spec('v0 : (BG) et (ACG) « contenue »', 0, {'p': 1, 'k': 4}, '2', 'incorrect'),
     spec('v1 : (EG) et (ABC) parallèles', 1, {'p': 0, 'k': 0}, '1', 'correct'),
     spec('v1 : (BF) et (ACG) « sécants »', 1, {'p': 0, 'k': 1}, '0', 'incorrect'),
     spec('v2 : (AG) dans (ACE)', 2, {'p': 1, 'k': 0}, '2', 'correct'),
     spec('v2 : (BH) et (ABG) « sécants » (piège)', 2, {'p': 0, 'k': 1}, '0', 'incorrect')]))

# --- F7. TSPE-552 : position relative de deux plans -------------------------------------------------

F7_PAR = [('ABC', 'EFG'), ('ABF', 'DCG'), ('ADE', 'BCG'), ('BDE', 'CFH'), ('AFH', 'BDG'), ('ACF', 'DGE')]
F7_SEC = [('ABC', 'BCG'), ('ABG', 'ABC'), ('ACG', 'ABC'), ('ABG', 'DCG'), ('BDE', 'ABC'), ('AFH', 'EFG'),
          ('ACF', 'BCG')]
F7_CONF = [('ABC', 'BCD'), ('ACG', 'AEG'), ('ABG', 'BGH'), ('BCF', 'CGF'), ('ADH', 'DEH'), ('BDH', 'DFH')]
F7_CHOIX = ['Strictement parallèles.', 'Sécants.', 'Confondus.']


def nature_f7(p1, p2):
    a, b = plan(p1), plan(p2)
    if not colineaires(a[0], b[0]):
        return 1
    return 2 if all(dans(x, b) for x in p1) else 0


assert all(nature_f7(*c) == 0 for c in F7_PAR)
assert all(nature_f7(*c) == 1 for c in F7_SEC)
assert all(nature_f7(*c) == 2 for c in F7_CONF)


def inter(p1, p2):
    commun = [x for x in sommets_du_plan(p1) if x in sommets_du_plan(p2)]
    assert len(commun) == 2, (p1, p2, commun)
    return ''.join(commun)


def leurres_f7(p1, p2):
    """Droites par deux sommets de l'un des plans, qui ne sont pas l'intersection."""
    bonne = set(inter(p1, p2))
    out = []
    for pl in (p1, p2):
        for x, y in itertools.combinations(sommets_du_plan(pl), 2):
            if {x, y} != bonne and len({x, y} & bonne) == 1 and x + y not in out:
                out.append(x + y)
    assert len(out) >= 3, (p1, p2)
    return [out[0], out[len(out) // 2], out[-1]]


def detail_f7(p1, p2):
    s_ = nature_f7(p1, p2)
    if s_ == 2:
        tous = sommets_du_plan(p1)
        return ('$' + p2[0] + '$, $' + p2[1] + '$ et $' + p2[2] + '$ sont dans le plan $(' + p1 + ')$ : les deux '
                'noms désignent le même plan, celui qui passe par ' + ', '.join('$' + x + '$' for x in tous)
                + '. Les plans sont $' + col('\\text{confondus}') + '$.')
    if s_ == 1:
        d = inter(p1, p2)
        z = next(x for x in p1 + p2 if not (dans(x, plan(p1)) and dans(x, plan(p2))))
        autre = p2 if z in p1 else p1
        return ('$' + d[0] + '$ et $' + d[1] + '$ sont dans les deux plans, et les plans ne sont pas confondus ($'
                + z + '$ n\'est pas dans $(' + autre + ')$) : ils sont sécants selon la droite $'
                + col('(' + d + ')') + '$.')
    pts2 = sommets_du_plan(p2)
    egaux = []
    for a, b in itertools.permutations(p1, 2):
        for c, d in itertools.permutations(pts2, 2):
            if vec(a + b) == vec(c + d):
                egaux.append((a + b, c + d))
                break
    (u1, v1), (u2, v2) = next((e, f) for e, f in itertools.combinations(egaux, 2)
                              if not colineaires(vec(e[0]), vec(f[0])))
    return ('$' + O(u1) + '=' + O(v1) + '$ et $' + O(u2) + '=' + O(v2) + '$ : deux vecteurs non colinéaires du plan $('
            + p1 + ')$ sont des vecteurs du plan $(' + p2 + ')$, les plans sont parallèles. $' + p1[0]
            + '$ n\'est pas dans $(' + p2 + ')$ : ils sont $' + col('\\text{strictement parallèles}') + '$.')


RAPPEL_F7 = ('Deux plans sont **parallèles** (strictement, ou confondus) quand deux vecteurs non colinéaires de '
             'l\'un sont des vecteurs de l\'autre ; sinon ils sont **sécants**, selon une droite.')


def marques_plans(a, b):
    """Marques des deux plans, sans doublon (deux noms d'une même face)."""
    out = []
    for m in (marque_plan(a) + ', ' + marque_plan(b)).split(', '):
        if m not in out:
            out.append(m)
    return ', '.join(out)


def v_f7_position(liste, s_):
    enonce = (debut([marques_plans(a, b) for a, b in liste])
              + '\n\nQuelle est la position relative des plans ' + cas(['$(' + a + ')$ et $(' + b + ')$'
                                                                       for a, b in liste])
              + ' ?\n\n' + choix(*F7_CHOIX))
    return variation(enonce, len(liste), [str(s_)], [RAPPEL_F7, cas([detail_f7(*c) for c in liste])])


def v_f7_droite(liste):
    enonce = (debut([marques_plans(a, b) for a, b in liste])
              + '\n\nLes plans ' + cas(['$(' + a + ')$ et $(' + b + ')$' for a, b in liste])
              + ' sont sécants. Selon quelle droite ?\n\n'
              + choix(cas(['$(' + inter(a, b) + ')$' for a, b in liste]),
                      *[cas(['$(' + leurres_f7(a, b)[r] + ')$' for a, b in liste]) for r in range(3)]))
    return variation(enonce, len(liste), ['0'],
                     ['L\'intersection de deux plans sécants est une droite : elle passe par deux points communs '
                      'aux deux plans.', cas([detail_f7(*c) for c in liste])])


MODELES.append(modele(
    '7-deux-plans', 'Espace : position relative de deux plans',
    'Sur un cube ou un pavé droit nommé, deux plans par trois sommets : strictement parallèles (faces '
    'opposées, plans diagonaux), sécants et leur droite d\'intersection, confondus sous deux noms (pièges : '
    'plans diagonaux parallèles, un même plan nommé deux fois)',
    POS, 3, [v_f7_position(F7_PAR, 0), v_f7_droite(F7_SEC), v_f7_position(F7_CONF, 2)],
    [spec('v0 : (ABC), (EFG) parallèles', 0, {'p': 0, 'k': 0}, '0', 'correct'),
     spec('v0 : (BDE), (CFH) « sécants »', 0, {'p': 1, 'k': 3}, '1', 'incorrect'),
     spec('v1 : (ABC), (BCG) selon (BC)', 1, {'p': 0, 'k': 0}, '0', 'correct'),
     spec('v1 : leurre', 1, {'p': 0, 'k': 0}, '1', 'incorrect'),
     spec('v2 : (ABC), (BCD) confondus', 2, {'p': 0, 'k': 0}, '2', 'correct'),
     spec('v2 : (ACG), (AEG) « sécants » (piège)', 2, {'p': 1, 'k': 1}, '1', 'incorrect')],
    delay=150))

# --- F8. TSPE-339 : coplanarité et parallélisme -----------------------------------------------------

F8_COPL = ['ABGH', 'ACGE', 'ABCE', 'BDEG', 'ADGF', 'BCHE', 'ACFH', 'CEFH']
F8_PAR = [('EG', 'ABC'), ('BF', 'ACG'), ('DE', 'BCG'), ('CH', 'ABF'), ('AG', 'BCF'), ('EC', 'ABD'),
          ('BH', 'ACG'), ('DF', 'EFG')]
F8_CHOIX_COPL = ['Oui, ils sont coplanaires.', 'Non, ils ne sont pas coplanaires.']
F8_CHOIX_PAR = ['Oui, elle est parallèle au plan.', 'Non, elle n\'est pas parallèle au plan.']


def copl(q):
    return det(vec(q[0] + q[1]), vec(q[0] + q[2]), vec(q[0] + q[3])) == 0


assert [copl(q) for q in F8_COPL] == [True, True, False, False, True, True, False, False]
for d, pl in F8_PAR:
    assert not (dans(d[0], plan(pl)) and dans(d[1], plan(pl))), d


def detail_f8_copl(q):
    x = q[0]
    pas, ok = texte_resolution(x + q[1], x + q[2], x + q[3])
    assert ok == copl(q)
    fin = ('Donc $' + col('\\text{' + ('les quatre points sont coplanaires' if ok else 'ils ne sont pas '
                                       'coplanaires') + '}') + '$.')
    return pas + [fin]


def detail_f8_par(d, pl):
    pas, ok = texte_resolution(pl[0] + pl[1], pl[0] + pl[2], d)
    fin = ('Donc $' + col('\\text{' + ('la droite est parallèle au plan' if ok else 'la droite n\'est pas parallèle '
                                       'au plan') + '}') + '$' + (' (et pas contenue : $' + d[0] + '$ n\'est pas '
                                                                  'dans le plan).' if ok else '.'))
    return pas + [fin]


def etapes_par_cas(details):
    n = len(details[0])
    assert all(len(x) == n for x in details)
    return [cas([x[i] for x in details]) for i in range(n)]


V8_COPL = variation(
    debut([', '.join('sommet ' + x for x in q) for q in F8_COPL])
    + '\n\nLes points ' + cas(['$' + q[0] + '$, $' + q[1] + '$, $' + q[2] + '$ et $' + q[3] + '$' for q in F8_COPL])
    + ' sont-ils coplanaires ?\n\n' + choix(*F8_CHOIX_COPL), len(F8_COPL), ['{{r}}'],
    ['Quatre points $X$, $Y$, $Z$, $T$ ($X$, $Y$, $Z$ non alignés) sont coplanaires si et seulement si $'
     + O('XT') + '$ s\'écrit $x' + O('XY') + '+y' + O('XZ') + '$.']
    + etapes_par_cas([detail_f8_copl(q) for q in F8_COPL]),
    [var('r', chaine([0 if copl(q) else 1 for q in F8_COPL]))])

V8_PAR = variation(
    debut([marque_plan(pl) + (', arete ' + d if arete(d) else '') for d, pl in F8_PAR])
    + '\n\nLa droite ' + cas(['$(' + d + ')$ est-elle parallèle au plan $(' + pl + ')$' for d, pl in F8_PAR])
    + ' ?\n\n' + choix(*F8_CHOIX_PAR), len(F8_PAR), ['{{r}}'],
    ['Une droite $(MN)$ est parallèle au plan $(XYZ)$ si et seulement si $' + O('MN') + '$ s\'écrit $x'
     + O('XY') + '+y' + O('XZ') + '$.']
    + etapes_par_cas([detail_f8_par(*c) for c in F8_PAR]),
    [var('r', chaine([0 if resoudre2(vec(pl[0] + pl[1]), vec(pl[0] + pl[2]), vec(d))[4] else 1
                      for d, pl in F8_PAR]))])

MODELES.append(modele(
    '8-coplanarite-parallelisme', 'Espace : coplanarité et parallélisme sur un cube',
    'Sur un cube ou un pavé droit nommé, quatre sommets coplanaires ou non, droite parallèle à un plan ou '
    'non, en écrivant un vecteur en fonction de deux autres (pièges : quatre sommets « en rectangle » pris '
    'pour non coplanaires, droite qui ne touche pas la face mais coupe le plan)',
    FIG, 5, [V8_COPL, V8_PAR],
    [spec('v0 : ABGH coplanaires', 0, {'p': 0, 'k': 0}, '0', 'correct'),
     spec('v0 : ACGE « non » (piège)', 0, {'p': 1, 'k': 1}, '1', 'incorrect'),
     spec('v0 : ABCE non coplanaires', 0, {'p': 0, 'k': 2}, '1', 'correct'),
     spec('v1 : (EG) parallèle à (ABC)', 1, {'p': 0, 'k': 0}, '0', 'correct'),
     spec('v1 : (AG) et (BCF) : « oui » (piège)', 1, {'p': 1, 'k': 4}, '0', 'incorrect'),
     spec('v1 : (BH) et (ACG) : non', 1, {'p': 0, 'k': 6}, '1', 'correct')],
    delay=180))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True, stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
