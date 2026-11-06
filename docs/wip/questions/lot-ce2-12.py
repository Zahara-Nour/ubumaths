"""Écrit les 2 modèles du lot 12 du CE2 (constructions) dans scripts/questions/ce2-12/.

Phase 0 validée par David le 2026-11-06 (§ 18 du journal `docs/wip/questions-ce2-progress.md`,
« je suis tes recos », puis « lot 12 sans cercle »). Bornes `cycle2.json` : CE2-070 (reproduire ou
construire carré, rectangle, triangle, triangle rectangle, cercle, sur tout support, règle graduée,
équerre, compas). Ce que la case « figure » vérifie aujourd'hui :

- `carre A ; B`, `rectangle A ; B ; C` : sur quadrillage, à terminer, côtés obliques admis ;
- `triangle ABC : AC = u ; BC = v` : papier uni, longueurs reportées au compas.

Cercle de centre donné, triangle rectangle et règle graduée : `outils-manquants.md` n° 18 à 20.

Niveaux sur « Géométrie › Figures planes › constructions » : 1 = brouillons du CP, 2 = laissé au
CE1-072 ; 01 → 3, 02 → 4. Variables à une lettre ; jamais `e` ni `i` ; aucun point nommé E.

    python3 docs/wip/questions/lot-ce2-12.py scripts/questions/ce2-12
"""
import json
import sys

DOSSIER = sys.argv[1]

# ---- Gabarits (repris du lot 8) ----


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(x) for k, x in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(title, description, level, variations, specs, delay=240):
    # ni theme, ni domain, ni subdomain (ADR 0035) : le rangement est posé par la migration
    return {'title': title, 'description': description, 'grades': ['CE2'], 'level': level,
            'delay': delay, 'status': 'draft', 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, etapes):
    return {'statement': statement, 'variables': variables, 'correction': {'steps': etapes}}


def selon(k, textes, n=1):
    """`{{if:k==1|…|{{if:k==2|…|…}}}}` : le texte numéro k (à partir de 1)."""
    textes = [str(t) for t in textes]
    if len(textes) == 1:
        return textes[0]
    return ('{{if:' + k + '==' + str(n) + '|' + textes[0] + '|' + selon(k, textes[1:], n + 1)
            + '}}')


def colt(x, k=0):
    """Mot coloré en plein texte : toujours dans une formule (`\\textcolor` hors `$…$` reste brut)."""
    return '$\\textcolor{{{color:primary.' + str(k) + '}}}{\\text{' + x + '}}$'


def add(p, q):
    return (p[0] + q[0], p[1] + q[1])


def fmt(x):
    return str(int(x)) if float(x).is_integer() else str(x)


def seg(p, q):
    return f'segment({fmt(p[0])};{fmt(p[1])};{fmt(q[0])};{fmt(q[1])})'


def dedans(pts, w, h):
    return all(0 <= x <= w and 0 <= y <= h for x, y in pts)


# ---- 01. Terminer un carré, un rectangle (quadrillage, côtés obliques) ----

W1, H1 = 14, 10

# carré : A et le vecteur AB (oblique) ; les deux carrés possibles tiennent dans la fenêtre
CARRES = [((6, 4), (3, 1)), ((6, 4), (3, 2)), ((5, 4), (4, 1)), ((6, 4), (2, 3)), ((5, 4), (4, 2))]
# rectangle : A, AB, BC (angle droit en B, longueurs différentes)
RECTS = [((2, 3), (4, 2), (-1, 2)), ((3, 1), (6, 2), (-1, 3)), ((4, 1), (3, 3), (-2, 2)),
         ((2, 2), (6, 3), (-1, 2)), ((7, 1), (2, 4), (-6, 3))]


def normale(v):
    return (-v[1], v[0])


def sommets_carre(a, v, cote=1):
    b = add(a, v)
    n = normale(v) if cote == 1 else (v[1], -v[0])
    return a, b, add(b, n), add(a, n)


def sommets_rect(a, v, w):
    b = add(a, v)
    c = add(b, w)
    return a, b, c, add(a, w)


for a, v in CARRES:
    assert dedans(sommets_carre(a, v, 1), W1, H1) and dedans(sommets_carre(a, v, -1), W1, H1)
for a, v, w in RECTS:
    assert v[0] * w[0] + v[1] * w[1] == 0, (a, v, w)  # angle droit en B
    assert v[0] ** 2 + v[1] ** 2 != w[0] ** 2 + w[1] ** 2  # pas un carré
    assert dedans(sommets_rect(a, v, w), W1, H1)


def entete(verif):
    return (f'```figure-a-completer\nfenetre: 0 ; {W1} ; 0 ; {H1}\ngrille: 1\noutils: segment\n'
            f'verifier: {verif}\n---\n')


def bloc_carre():
    blocs = []
    for a, v in CARRES:
        b = add(a, v)
        blocs.append(f'A = point({a[0]}, {a[1]}, visible=faux)\nB = point({b[0]}, {b[1]}, visible=faux)')
    return entete('carre A ; B') + selon('k', blocs) + '\nab = segment(A, B, epaisseur=3)\n```'


def bloc_rect():
    blocs = []
    for a, v, w in RECTS:
        b, c = add(a, v), add(add(a, v), w)
        blocs.append(f'A = point({a[0]}, {a[1]}, visible=faux)\nB = point({b[0]}, {b[1]}, visible=faux)'
                     f'\nC = point({c[0]}, {c[1]}, visible=faux)')
    return (entete('rectangle A ; B ; C') + selon('k', blocs)
            + '\nab = segment(A, B, epaisseur=3)\nbc = segment(B, C, epaisseur=3)\n```')


CARRE = variation(
    'Un côté du carré est déjà tracé. Termine le carré en suivant les nœuds du quadrillage.\n\n'
    + bloc_carre(),
    [var('k', '1..' + str(len(CARRES)))],
    ['Pour aller d\'un bout du côté à l\'autre, on compte les carreaux : par exemple « 3 vers la'
     ' droite, 1 vers le haut ».',
     'Le côté suivant ' + colt('tourne d\'un angle droit') + ' : on échange les deux nombres'
     ' (« 1 vers la gauche, 3 vers le haut »). Les quatre côtés ont la '
     + colt('même longueur') + '.'])

RECT = variation(
    'Deux côtés du rectangle sont déjà tracés. Termine le rectangle en suivant les nœuds du'
    ' quadrillage.\n\n' + bloc_rect(),
    [var('k', '1..' + str(len(RECTS)))],
    ['Dans un rectangle, les ' + colt('côtés opposés') + ' sont parallèles et ont la même'
     ' longueur.',
     'On part du bout de chaque côté tracé et on refait le même chemin de carreaux que le côté'
     ' d\'en face.'])

SPECS_01 = []
for k, (a, v) in enumerate(CARRES, start=1):
    _, b, c, d = sommets_carre(a, v, 1)
    SPECS_01.append(spec(f'Carré {k} : terminé d\'un côté', 0, {'k': k},
                         '|'.join([seg(b, c), seg(c, d), seg(d, a)]), 'correct'))
    if k == 1:
        _, b2, c2, d2 = sommets_carre(a, v, -1)
        SPECS_01.append(spec('Carré 1 : terminé de l\'autre côté', 0, {'k': k},
                             '|'.join([seg(b2, c2), seg(c2, d2), seg(d2, a)]), 'correct'))
        # erreur typique : côtés « tournés » de la moitié seulement → rectangle, pas carré
        n = (normale(v)[0] * 2, normale(v)[1] * 2)
        SPECS_01.append(spec('Erreur : rectangle au lieu d\'un carré', 0, {'k': k},
                             '|'.join([seg(b, add(b, n)), seg(add(b, n), add(a, n)),
                                       seg(add(a, n), a)]), 'incorrect'))
        SPECS_01.append(spec('Erreur : un côté manque', 0, {'k': k},
                             '|'.join([seg(b, c), seg(c, d)]), 'incorrect'))
        SPECS_01.append(spec('Erreur : un trait de trop', 0, {'k': k},
                             '|'.join([seg(b, c), seg(c, d), seg(d, a), seg(a, c)]), 'incorrect'))
    if k == 2:
        # erreur typique : le côté suivant tracé sur les lignes du quadrillage
        SPECS_01.append(spec('Erreur : côtés sur les lignes, figure non fermée', 0, {'k': k},
                             '|'.join([seg(b, add(b, (0, 3))), seg(add(b, (0, 3)), add(a, (0, 3))),
                                       seg(add(a, (0, 3)), a)]), 'incorrect'))
for k, (a, v, w) in enumerate(RECTS, start=1):
    _, b, c, d = sommets_rect(a, v, w)
    SPECS_01.append(spec(f'Rectangle {k} : terminé', 1, {'k': k},
                         '|'.join([seg(c, d), seg(d, a)]), 'correct'))
    if k == 1:
        SPECS_01.append(spec('Rectangle 1 : côtés en deux morceaux', 1, {'k': k},
                             '|'.join([seg(c, add(c, (-2, -1))), seg(add(c, (-2, -1)), d),
                                       seg(d, a)]), 'correct'))
        SPECS_01.append(spec('Erreur : rectangle non fermé', 1, {'k': k}, seg(c, d), 'incorrect'))
        # erreur typique : le 4e sommet pris au jugé, un carreau à côté
        faux = add(d, (1, 0))
        SPECS_01.append(spec('Erreur : quatrième sommet décalé', 1, {'k': k},
                             '|'.join([seg(c, faux), seg(faux, a)]), 'incorrect'))


# ---- 02. Reproduire un triangle au compas (papier uni) ----

W2, H2 = 15, 9
# triangle modèle RST à gauche (R en (1, 5)), triangle ABC à droite (A en (8, 2)) ;
# AB = RS, C = A + (T - R) : la copie exacte, du même côté
TRIANGLES = [(5, (2, 3)), (6, (4, 3)), (5, (4, 2)), (4, (1, 3)), (6, (-0.5, 3))]
R0, A0 = (1, 5), (8, 2)


def triangle_k(longueur, t):
    r, s, tt = R0, add(R0, (longueur, 0)), add(R0, t)
    a, b, c = A0, add(A0, (longueur, 0)), add(A0, t)
    return r, s, tt, a, b, c


for lg, t in TRIANGLES:
    r, s, tt, a, b, c = triangle_k(lg, t)
    assert dedans([r, s, tt], 7.5, H2) and dedans([a, b, c], W2, H2)
    assert r[0] >= 0.5 and a[0] > 7.5


def bloc_triangle():
    blocs = []
    for lg, t in TRIANGLES:
        r, s, tt, a, b, _ = triangle_k(lg, t)
        blocs.append('\n'.join([
            f'R = point({fmt(r[0])}, {fmt(r[1])})', f'S = point({fmt(s[0])}, {fmt(s[1])})',
            f'T = point({fmt(tt[0])}, {fmt(tt[1])})', f'A = point({fmt(a[0])}, {fmt(a[1])})',
            f'B = point({fmt(b[0])}, {fmt(b[1])})']))
    return (f'```figure-a-completer\nfenetre: 0 ; {W2} ; 0 ; {H2}\n'
            'verifier: triangle ABC : AC = u ; BC = v\n---\n' + selon('k', blocs)
            + '\nrs = segment(R, S, couleur="gris")\nu = segment(R, T, couleur="gris")'
            '\nv = segment(S, T, couleur="gris")\nab = segment(A, B, epaisseur=3)\n```')


TRIANGLE = variation(
    'Reproduis le triangle $RST$ : le côté $[AB]$ est déjà tracé, il est aussi long que $[RS]$.'
    ' Construis le point $C$ avec le compas pour que $[AC]$ soit aussi long que $[RT]$ et $[BC]$'
    ' aussi long que $[ST]$, puis trace les côtés $[AC]$ et $[BC]$.\n\n' + bloc_triangle(),
    [var('k', '1..' + str(len(TRIANGLES)))],
    ['On ' + colt('prend la longueur') + ' $RT$ avec le compas, on pique en $A$ et on trace un'
     ' arc.',
     'On prend la longueur $ST$, on pique en $B$ et on trace un autre arc.',
     'Le point $C$ est là où les deux arcs ' + colt('se croisent') + ' : on trace $[AC]$ et'
     ' $[BC]$.'])


def report(centre, p, q):
    return f'report({fmt(centre[0])};{fmt(centre[1])};{fmt(p[0])};{fmt(p[1])};{fmt(q[0])};{fmt(q[1])})'


SPECS_02 = []
for k, (lg, t) in enumerate(TRIANGLES, start=1):
    r, s, tt, a, b, c = triangle_k(lg, t)
    juste = [report(a, r, tt), report(b, s, tt), seg(a, c), seg(b, c)]
    SPECS_02.append(spec(f'Triangle {k} : construit au compas', 0, {'k': k}, '|'.join(juste),
                         'correct'))
    if k == 1:
        oeil = add(c, (0.4, 0.3))
        SPECS_02.append(spec('Erreur : C placé à l\'œil, sans compas', 0, {'k': k},
                             '|'.join([seg(a, c), seg(b, c)]), 'incorrect'))
        SPECS_02.append(spec('Erreur : arcs justes, C pris à côté du croisement', 0, {'k': k},
                             '|'.join(juste[:2] + [seg(a, oeil), seg(b, oeil)]), 'incorrect'))
        SPECS_02.append(spec('Erreur : le côté [BC] manque', 0, {'k': k}, '|'.join(juste[:3]),
                             'incorrect'))

# ---- Fichiers ----

MODELES = {
    '01-termine-carre-rectangle': modele(
        'Terminer un carré ou un rectangle aux côtés obliques sur quadrillage',
        'Un côté oblique du carré, deux côtés obliques du rectangle sont tracés : terminer la'
        ' figure', 3, [CARRE, RECT], SPECS_01),
    '02-reproduis-le-triangle': modele(
        'Reproduire un triangle au compas',
        'Le côté [AB] est tracé : construire le troisième sommet au compas, en reportant les'
        ' longueurs du triangle modèle', 4, [TRIANGLE], SPECS_02),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
