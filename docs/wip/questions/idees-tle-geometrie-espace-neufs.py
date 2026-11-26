"""Écrit les modèles neufs du chantier idees-tle-geometrie-espace dans
scripts/questions/idees-tle-geometrie-espace-neufs/.

Phase 0 validée par David le 2026-11-26 (« je valide » : toutes les fiches oui, Q1 oui ; fiches
docs/archive/wip/idees-tle-geometrie-espace/idees-tle-geometrie-espace-fiches.md) : N1, N2, N3, trois modèles neufs de Terminale spé.

Rangement (migration générée après la création en brouillon) :
- N1 : « Géométrie > Espace > représentation paramétrique », TSPE-365 (nœud de 0003deae) ;
- N2 : « Géométrie > Espace > positions relatives et intersections », TSPE-567 (point sur la
  notion « Espace », nœud de 3bace561) ;
- N3 : « Géométrie > Espace > coordonnées », TSPE-332. La fiche disait « nœud de 63669e60 », mais
  63669e60 est sur « coplanarité et décomposition » (TSPE-338) et le point validé, TSPE-332, est
  sur « coordonnées » : la règle du tag (point sur le nœud ou sur sa notion) range N3 sur
  « coordonnées », où vit déjà d6938108.

Écarts de détail aux fiches, consignés dans le journal :
- N1 v1 : l'erreur « B − A pris pour A − B » donnerait $\\overrightarrow{BA}$, qui dirige aussi
  la droite ; elle est remplacée par « coordonnées de B prises pour le vecteur ».
- N2 v0, v2 : une case choix ne porte pas d'erreur prévue (refus du générateur) ; les erreurs
  typiques sont dans les specs.
- N3 : dans les repères (B ; BC, BA, BF), (H ; HE, HG, HD), (E ; EA, EF, EH), toutes les
  coordonnées des sommets valent 0 ou 1 : l'erreur « 1 au lieu de −1 » ne se produit pas.

Ni theme, ni domain, ni subdomain, ni id : create-questions --publier écrit l'id.

Usage : python3 docs/wip/questions/idees-tle-geometrie-espace-neufs.py scripts/questions/idees-tle-geometrie-espace-neufs
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
REPERE = "Dans l'espace muni d'un repère, "

# Messages tels que la résolution les réécrit (rempli après le premier passage de question:specs)
REECRIT = {}


def spec(desc, vi, variables_, status, answers, message=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = REECRIT.get(message, message)
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables_.items()},
            'expected': expected, 'answers': answers}


def modele(title, description, level, variations, specs, noeud, point, shared=None):
    return {'rangement': {'noeud': noeud, 'point': point}, 'title': title,
            'description': description, 'grades': ['T_SPE'], 'level': level, 'delay': 180,
            'status': 'draft', 'shared': shared or {'cleanCoefficients': True},
            'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def case(attendue, erreurs=None):
    c = {'expectedAnswer': attendue}
    if erreurs:
        c['expectedErrors'] = erreurs
    return c


def variation(statement, variables, blanks, steps, hint, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': blanks, 'correction': {'steps': steps}, 'hint': hint}


def bloc(nom, *lignes):
    return '```' + nom + '\n' + '\n'.join(lignes) + '\n```'


def choix(lignes):
    return bloc('choix', *['- ' + l for l in lignes])


def ecrire(nom, m):
    os.makedirs(DOSSIER, exist_ok=True)
    chemin = os.path.join(DOSSIER, nom + '.json')
    # Garder l'id écrit en tête par create-questions --publier, s'il existe
    if os.path.exists(chemin):
        with open(chemin, encoding='utf-8') as f:
            ancien = json.load(f)
        if 'id' in ancien:
            m = {'id': ancien['id'], **m}
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write('\n')


def selon(v, cas, defaut):
    """{{if:v==k1|t1|{{if:v==k2|t2|…defaut}}}} à partir d'une liste [(k, texte)]."""
    texte = defaut
    for k, t in reversed(cas):
        texte = '{{if:' + v + '==' + str(k) + '|' + t + '|' + texte + '}}'
    return texte


def lin(c, u, p='t'):
    """« c + u·p » écrit proprement (variables nommées c et u) : 2+3t, -t, 4, 0."""
    return ('{{if:' + c + '!=0|{{' + c + '}}}}'
            '{{if:' + u + '==1|{{if:' + c + '!=0|+}}' + p + '}}'
            '{{if:' + u + '==-1|-' + p + '}}'
            '{{if:' + u + '>1|{{if:' + c + '!=0|+}}{{' + u + '}}' + p + '}}'
            '{{if:' + u + '< -1|{{' + u + '}}' + p + '}}'
            '{{if:' + u + '==0|{{if:' + c + '==0|0}}}}')


def systeme(c, u, p='t'):
    """Représentation paramétrique : c = (cx, cy, cz), u = (u1, u2, u3), noms de variables."""
    return ('$$\\begin{cases}x=' + lin(c[0], u[0], p) + '\\\\y=' + lin(c[1], u[1], p)
            + '\\\\z=' + lin(c[2], u[2], p) + '\\end{cases}\\quad(' + p + '\\in\\mathbb{R})$$')


def point(nom, c):
    return ('$' + nom + '({{' + c[0] + '}}\\,;\\,{{' + c[1] + '}}\\,;\\,{{' + c[2] + '}})$')


def vecteur(nom, u):
    return ('$' + nom + '\\begin{pmatrix}{{' + u[0] + '}}\\\\{{' + u[1] + '}}\\\\{{' + u[2]
            + '}}\\end{pmatrix}$')


def vec(nom):
    return '\\vec{' + nom + '}'


def fleche(nom):
    return '\\overrightarrow{' + nom + '}'


T = var('t', 't|t')
AXES = ('x', 'y', 'z')

# =============================================================================================
# N1 — Écrire une représentation paramétrique d'une droite (TSG2-30). Point TSPE-365.
# =============================================================================================

ERR_ROLES = ('Le point donne le terme constant et le vecteur le coefficient de $t$ : '
             '$x = x_A + a t$.')
ERR_SIGNE_POINT = 'Le terme constant est la coordonnée du point, avec son signe : $x = x_A + a t$.'
ERR_SIGNE_VECTEUR = ('Le coefficient de $t$ est la coordonnée du vecteur directeur, avec son '
                     'signe.')
HINT_REPR = ('La droite passant par $A(x_A\\,;\\,y_A\\,;\\,z_A)$ de vecteur directeur '
             '$\\vec{u}\\begin{pmatrix}a\\\\b\\\\c\\end{pmatrix}$ a pour représentation '
             '$x=x_A+at$, $y=y_A+bt$, $z=z_A+ct$.')
CASES_XYZ = '$x=?$, $y=?$ et $z=?$'


def cases_repr(c, u, erreurs_en_plus=()):
    """Trois cases x, y, z = c + u t, avec les erreurs prévues communes."""
    cases = []
    for i in range(3):
        ci, ui = c[i], u[i]
        errs = [
            erreur('{{' + ui + '}}+({{' + ci + '}})t', ERR_ROLES, 'Point et vecteur échangés'),
            erreur('{{eval:-' + ci + '}}+({{' + ui + '}})t', ERR_SIGNE_POINT,
                   'Signe de la coordonnée du point'),
        ]
        for faire in erreurs_en_plus:
            errs.append(faire(i))
        cases.append(case(lin(ci, ui), errs))
    return cases


def reponse_repr(c, u):
    return ('$' + PRIMAIRE + '{ \\begin{cases}x=' + lin(c[0], u[0]) + '\\\\y=' + lin(c[1], u[1])
            + '\\\\z=' + lin(c[2], u[2]) + '\\end{cases} }\\quad(t\\in\\mathbb{R})$')


PT_A = ('ax', 'ay', 'az')
VU = ('u1', 'u2', 'u3')

N1_V0 = variation(
    REPERE + 'on considère le point ' + point('A', PT_A) + ' et le vecteur '
    + vecteur('\\vec{u}', VU) + '.\n\n'
    'Écris la représentation paramétrique de la droite $d$ passant par $A$ et de vecteur '
    'directeur $\\vec{u}$, obtenue avec ce point et ce vecteur (paramètre $t\\in\\mathbb{R}$).'
    '\n\n' + CASES_XYZ,
    [T, var('ax', '-5..5'), var('ay', '-5..5'), var('az', '-5..5'), var('u1', '-4..4'),
     var('u2', '-4..4'), var('u3', '1..4;±')],
    cases_repr(PT_A, VU, [
        lambda i: erreur('{{' + PT_A[i] + '}}+({{eval:-' + VU[i] + '}})t', ERR_SIGNE_VECTEUR,
                         'Signe de la coordonnée du vecteur')]),
    [
        'Un point $M(x\\,;\\,y\\,;\\,z)$ est sur $d$ quand $\\overrightarrow{AM}=t\\,\\vec{u}$ '
        'pour un réel $t$ : $x-x_A=at$, $y-y_A=bt$, $z-z_A=ct$.',
        'Les coordonnées de $A$ donnent les termes constants, celles de $\\vec{u}$ les '
        'coefficients de $t$ : ' + reponse_repr(PT_A, VU) + '.',
    ],
    HINT_REPR,
    ['u1 != 0 || u2 != 0'],
)

# v1 : droite (AB), vecteur directeur AB à calculer
PT_B = ('bx', 'by', 'bz')
VW = ('w1', 'w2', 'w3')
ERR_B_VECTEUR = ('Les coordonnées de $B$ ne sont pas celles d\'un vecteur directeur : on prend '
                 '$\\overrightarrow{AB}$, de coordonnées $x_B - x_A$, $y_B - y_A$, $z_B - z_A$.')

N1_V1 = variation(
    REPERE + 'on considère les points ' + point('A', PT_A) + ' et ' + point('B', PT_B) + '.\n\n'
    'Écris la représentation paramétrique de la droite $(AB)$ obtenue avec le point $A$ et le '
    'vecteur directeur $\\overrightarrow{AB}$ (paramètre $t\\in\\mathbb{R}$).\n\n' + CASES_XYZ,
    [T, var('ax', '-5..5'), var('ay', '-5..5'), var('az', '-5..5'), var('bx', '-5..5'),
     var('by', '-5..5'), var('bz', '-5..5'), var('w1', '{{eval:bx-ax}}'),
     var('w2', '{{eval:by-ay}}'), var('w3', '{{eval:bz-az}}')],
    cases_repr(PT_A, VW, [
        lambda i: erreur('{{' + PT_A[i] + '}}+({{' + PT_B[i] + '}})t', ERR_B_VECTEUR,
                         'Coordonnées de B prises pour le vecteur')]),
    [
        '$\\overrightarrow{AB}$ dirige $(AB)$ : ' + vecteur(fleche('AB'), VW) + '.',
        'Avec le point $A$ : ' + reponse_repr(PT_A, VW) + '.',
    ],
    'Calcule d\'abord les coordonnées de $\\overrightarrow{AB}$ : $x_B-x_A$, $y_B-y_A$, '
    '$z_B-z_A$. ' + HINT_REPR,
    ['abs(w1)+abs(w2) > 0', 'abs(w3) > 0', 'abs(w1)+abs(w3) > 0'],
)

# v2 : parallèle à d′ (paramètre s) passant par A
PT_Q = ('qx', 'qy', 'qz')
ERR_POINT_DPRIME = ('C\'est le point de $d\'$ : la droite cherchée passe par $A$, le terme '
                    'constant est donc $x_A$.')

N1_V2 = variation(
    REPERE + 'on considère le point ' + point('A', PT_A) + ' et la droite $d\'$ de '
    'représentation paramétrique ' + systeme(PT_Q, VU, 's') + '\n\n'
    'Écris la représentation paramétrique de la droite $\\Delta$ passant par $A$ et parallèle à '
    '$d\'$, obtenue avec le point $A$ et le vecteur directeur lu sur $d\'$ (paramètre '
    '$t\\in\\mathbb{R}$).\n\n' + CASES_XYZ,
    [T, var('ax', '-5..5'), var('ay', '-5..5'), var('az', '-5..5'), var('qx', '-5..5'),
     var('qy', '-5..5'), var('qz', '-5..5'), var('u1', '-4..4'), var('u2', '-4..4'),
     var('u3', '1..4;±')],
    cases_repr(PT_A, VU, [
        lambda i: erreur('{{' + PT_Q[i] + '}}+({{' + VU[i] + '}})t', ERR_POINT_DPRIME,
                         'Point de d′ gardé')]),
    [
        'Deux droites parallèles ont les mêmes vecteurs directeurs : on lit les coefficients de '
        '$s$, ' + vecteur('\\vec{u}', VU) + ' dirige $d\'$, donc aussi $\\Delta$.',
        'Avec le point $A$ : ' + reponse_repr(PT_A, VU) + '.',
    ],
    'Une droite parallèle à $d\'$ a le même vecteur directeur que $d\'$ : lis-le sur sa '
    'représentation. ' + HINT_REPR,
    ['u1 != 0 || u2 != 0', 'abs(ax-qx)+abs(ay-qy)+abs(az-qz) > 0'],
)

V_N1 = {'ax': 2, 'ay': -1, 'az': 0, 'u1': 3, 'u2': 0, 'u3': -2}   # x = 2+3t, y = −1, z = −2t
V_N1B = {'ax': 1, 'ay': 0, 'az': -2, 'bx': 3, 'by': -1, 'bz': -2 + 4,
         'w1': 2, 'w2': -1, 'w3': 4}                                  # x = 1+2t, y = −t, z = −2+4t
V_N1C = {'ax': -1, 'ay': 2, 'az': 3, 'qx': 4, 'qy': 0, 'qz': -1, 'u1': 1, 'u2': -2, 'u3': 3}

N1_SPECS = [
    spec('v0 : 2+3t, −1, −2t', 0, V_N1, 'correct', ['2+3t', '-1', '-2t']),
    spec('v0 : autres écritures', 0, V_N1, 'correct', ['3t+2', '-1', '-2t']),
    spec('v0 : point et vecteur échangés', 0, V_N1, 'incorrect', ['3+2t', '-1', '-2t'],
         ERR_ROLES),
    spec('v0 : signe de x_A', 0, V_N1, 'incorrect', ['-2+3t', '-1', '-2t'], ERR_SIGNE_POINT),
    spec('v0 : signe de la coordonnée du vecteur', 0, V_N1, 'incorrect', ['2+3t', '-1', '2t'],
         ERR_SIGNE_VECTEUR),
    spec('v1 : 1+2t, −t, −2+4t', 1, V_N1B, 'correct', ['1+2t', '-t', '-2+4t']),
    spec('v1 : autres écritures', 1, V_N1B, 'correct', ['2t+1', '-t', '4t-2']),
    spec('v1 : coordonnées de B pour le vecteur', 1, V_N1B, 'incorrect', ['1+3t', '-t', '-2+4t'],
         ERR_B_VECTEUR),
    spec('v1 : rôles échangés', 1, V_N1B, 'incorrect', ['2+t', '-t', '-2+4t'], ERR_ROLES),
    spec('v2 : −1+t, 2−2t, 3+3t', 2, V_N1C, 'correct', ['-1+t', '2-2t', '3+3t']),
    spec('v2 : point de d′ gardé', 2, V_N1C, 'incorrect', ['4+t', '2-2t', '3+3t'],
         ERR_POINT_DPRIME),
    spec('v2 : signe de y_A', 2, V_N1C, 'incorrect',
         ['-1+t', '-2-2t', '3+3t'], ERR_SIGNE_POINT),
]

N1 = modele(
    'Espace : écrire une représentation paramétrique de droite',
    'Écrire la représentation paramétrique d\'une droite donnée par un point et un vecteur '
    'directeur, par deux points, ou par un point et une droite parallèle (pièges : point et '
    'vecteur échangés, signes, point de la droite parallèle gardé)',
    3, [N1_V0, N1_V1, N1_V2], N1_SPECS,
    'Géométrie > Espace > représentation paramétrique', 'TSPE-365')

# =============================================================================================
# N2 — Position relative de deux droites en repère (TSG2-33). Point TSPE-567.
# =============================================================================================

# Construction (d : P + t·u ; d′ : Q + s·w), sel = 0 sécantes, 1 strictement parallèles,
# 2 non coplanaires, 3 confondues. a, b et u sont indépendants (déterminant non nul) :
# - parallèles (1, 3) : w = r·u ; sinon w = a, non colinéaire à u ;
# - sécantes (0) : I = P + k·u = Q + m·w ; confondues (3) : Q = P + k·u ;
# - strictement parallèles (1) : Q = P + b, b non colinéaire à u ;
# - non coplanaires (2) : Q = P + b, (u, a, b) indépendants.
PT_P = ('px', 'py', 'pz')
VW2 = ('w1', 'w2', 'w3')


def vars_deux_droites(sel_expr):
    vs = [var('px', '-3..3'), var('py', '-3..3'), var('pz', '-3..3'), var('u1', '-2..2'),
          var('u2', '-2..2'), var('u3', '1..2;±'), var('a1', '-2..2'), var('a2', '-2..2'),
          var('a3', '-2..2'), var('b1', '-2..2'), var('b2', '-2..2'), var('b3', '-2..2'),
          var('sel', sel_expr), var('k', '1..2;±'), var('m', '1..2;±'), var('r', '1..2;±')]
    for j in range(4):
        vs.append(var('i' + str(j), '{{eval:1-min(abs(sel-' + str(j) + '),1)}}'))
    vs.append(var('par', '{{eval:i1+i3}}'))
    for c, u, a, w in zip(AXES, ('u1', 'u2', 'u3'), ('a1', 'a2', 'a3'), VW2):
        vs.append(var(w, '{{eval:par*r*' + u + '+(1-par)*' + a + '}}'))
    for p, u, w, b, q in zip(PT_P, ('u1', 'u2', 'u3'), VW2, ('b1', 'b2', 'b3'), PT_Q):
        vs.append(var(q, '{{eval:' + p + '+(i0+i3)*k*' + u + '-i0*m*' + w + '+(i1+i2)*' + b
                      + '}}'))
    for p, u, c in zip(PT_P, ('u1', 'u2', 'u3'), ('ix', 'iy', 'iz')):
        vs.append(var(c, '{{eval:' + p + '+k*' + u + '}}'))
    return vs


COND_DEUX_DROITES = ['u1*(a2*b3-a3*b2)-u2*(a1*b3-a3*b1)+u3*(a1*b2-a2*b1) != 0']

CHOIX_POSITIONS = choix([
    'Les droites $d$ et $d\'$ sont sécantes.',
    'Les droites $d$ et $d\'$ sont strictement parallèles.',
    'Les droites $d$ et $d\'$ sont non coplanaires.',
    'Les droites $d$ et $d\'$ sont confondues.',
])

PT_I = ('ix', 'iy', 'iz')


def correction_positions(nom_d):
    """Étapes de la correction, la droite d (ou (AB)) nommée nom_d."""
    sys_ = ('$' + nom_d + '$ et $d\'$ ont un point commun quand le système '
            '$\\begin{cases}' + lin('px', 'u1') + '=' + lin('qx', 'w1', 's') + '\\\\'
            + lin('py', 'u2') + '=' + lin('qy', 'w2', 's') + '\\\\' + lin('pz', 'u3') + '='
            + lin('qz', 'w3', 's') + '\\end{cases}$ a une solution $(t\\,;\\,s)$.')
    return [
        'Vecteurs directeurs : ' + vecteur('\\vec{u}', ('u1', 'u2', 'u3')) + ' pour $' + nom_d
        + '$ et ' + vecteur('\\vec{w}', VW2) + ' pour $d\'$.',
        '{{if:par==1|$\\vec{w}={{if:r==1||{{if:r==-1|-|{{r}}\\,}}}}\\vec{u}$ : les vecteurs sont colinéaires, les droites '
        'sont parallèles. On cherche si le point $Q({{qx}}\\,;\\,{{qy}}\\,;\\,{{qz}})$ de $d\'$ '
        'est sur $' + nom_d + '$.|Les coordonnées de $\\vec{u}$ et $\\vec{w}$ ne sont pas '
        'proportionnelles : les droites ne sont pas parallèles. ' + sys_ + '}}',
        selon('sel', [
            (0, 'Le système a pour solution $t={{k}}$ et $s={{m}}$ : les droites sont $'
                + PRIMAIRE + '{\\text{sécantes}}$ en $I({{ix}}\\,;\\,{{iy}}\\,;\\,{{iz}})$.'),
            (1, '$Q$ n\'est pas sur $' + nom_d + '$ (aucun $t$ ne vérifie les trois équations) : '
                'les droites sont $' + PRIMAIRE + '{\\text{strictement parallèles}}$.'),
            (2, 'Le système n\'a pas de solution : les deux premières équations donnent un couple '
                '$(t\\,;\\,s)$ qui ne vérifie pas la troisième. Les droites ne sont ni '
                'parallèles ni sécantes : elles sont $' + PRIMAIRE
                + '{\\text{non coplanaires}}$.'),
        ], '$Q$ est le point de $' + nom_d + '$ de paramètre $t={{k}}$ : les droites sont $'
           + PRIMAIRE + '{\\text{confondues}}$.'),
    ]


HINT_POSITIONS = ('Compare d\'abord les vecteurs directeurs : colinéaires ou non ? Puis cherche '
                  'un point commun en résolvant le système, avec un paramètre différent pour '
                  'chaque droite.')

N2_V0 = variation(
    REPERE + 'on considère les droites $d$ et $d\'$ de représentations paramétriques '
    + systeme(PT_P, ('u1', 'u2', 'u3')) + ' et ' + systeme(PT_Q, VW2, 's') + '\n\n'
    'Quelle est la position relative des droites $d$ et $d\'$ ?\n\n' + CHOIX_POSITIONS,
    vars_deux_droites('0..3'),
    [case('{{sel}}')],
    correction_positions('d'),
    HINT_POSITIONS,
    COND_DEUX_DROITES,
)

ERR_Q = ('C\'est le point de $d\'$ de paramètre $s = 0$ : il faut résoudre le système pour '
         'trouver $t$ et $s$.')
ERR_P = ('C\'est le point de $d$ de paramètre $t = 0$ : il faut résoudre le système pour '
         'trouver $t$ et $s$.')
ERR_MEME_PARAMETRE = ('Tu as pris pour $s$ la valeur trouvée pour $t$ : les deux droites ont '
                      'chacune leur paramètre, résous le système pour trouver $s$.')

N2_V1 = variation(
    REPERE + 'on considère les droites sécantes $d$ et $d\'$ de représentations paramétriques '
    + systeme(PT_P, ('u1', 'u2', 'u3')) + ' et ' + systeme(PT_Q, VW2, 's') + '\n\n'
    'Détermine les coordonnées de leur point d\'intersection $I$.\n\n'
    '$I(?\\,;\\,?\\,;\\,?)$',
    vars_deux_droites('0'),
    [case('{{' + PT_I[j] + '}}', [
        erreur('{{' + PT_Q[j] + '}}', ERR_Q, 'Point de d′ en s = 0'),
        erreur('{{' + PT_P[j] + '}}', ERR_P, 'Point de d en t = 0'),
        erreur('{{eval:' + PT_Q[j] + '+k*' + VW2[j] + '}}', ERR_MEME_PARAMETRE,
               'Même paramètre pour les deux droites'),
    ]) for j in range(3)],
    [
        '$I$ est sur les deux droites : on cherche $t$ et $s$ tels que '
        '$\\begin{cases}' + lin('px', 'u1') + '=' + lin('qx', 'w1', 's') + '\\\\'
        + lin('py', 'u2') + '=' + lin('qy', 'w2', 's') + '\\\\' + lin('pz', 'u3') + '='
        + lin('qz', 'w3', 's') + '\\end{cases}$',
        'Deux équations donnent $t={{k}}$ et $s={{m}}$, et la troisième est vérifiée.',
        'Avec $t={{k}}$ dans la représentation de $d$ : $' + PRIMAIRE
        + '{ I({{ix}}\\,;\\,{{iy}}\\,;\\,{{iz}}) }$.',
    ],
    'Écris l\'égalité des coordonnées d\'un point de $d$ (paramètre $t$) et d\'un point de '
    '$d\'$ (paramètre $s$), résous le système de deux équations, puis vérifie la troisième.',
    COND_DEUX_DROITES,
)

PT_B2 = ('bx', 'by', 'bz')
VARS_AB = vars_deux_droites('0..3') + [
    var('bx', '{{eval:px+u1}}'), var('by', '{{eval:py+u2}}'), var('bz', '{{eval:pz+u3}}')]

N2_V2 = variation(
    REPERE + 'on considère les points ' + point('A', PT_P) + ' et ' + point('B', PT_B2)
    + ', et la droite $d\'$ de représentation paramétrique ' + systeme(PT_Q, VW2, 's') + '\n\n'
    'Quelle est la position relative des droites $(AB)$ et $d\'$ ?\n\n'
    + choix([
        'Les droites $(AB)$ et $d\'$ sont sécantes.',
        'Les droites $(AB)$ et $d\'$ sont strictement parallèles.',
        'Les droites $(AB)$ et $d\'$ sont non coplanaires.',
        'Les droites $(AB)$ et $d\'$ sont confondues.',
    ]),
    VARS_AB,
    [case('{{sel}}')],
    ['$\\overrightarrow{AB}$ dirige $(AB)$, et $A$ en est un point : $(AB)$ a pour '
     'représentation ' + systeme(PT_P, ('u1', 'u2', 'u3'))] + correction_positions('(AB)'),
    'Calcule $\\overrightarrow{AB}$ et écris une représentation paramétrique de $(AB)$. '
    + HINT_POSITIONS,
    COND_DEUX_DROITES,
)


def vd(sel, **autres):
    """Variables d'un tirage de N2 : P(1 ; 0 ; −1), u(1 ; 2 ; −1), a(1 ; 1 ; 2), b(1 ; 0 ; 1)."""
    v = {'px': 1, 'py': 0, 'pz': -1, 'u1': 1, 'u2': 2, 'u3': -1, 'a1': 1, 'a2': 1, 'a3': 2,
         'b1': 1, 'b2': 0, 'b3': 1, 'sel': sel, 'k': 1, 'm': -1, 'r': 2}
    v.update(autres)
    return v


# sel 0 : I = P + u = (2 ; 2 ; −2), w = a = (1 ; 1 ; 2), Q = I + w = (3 ; 3 ; 0)
N2_SPECS = [
    spec('v0 : sécantes', 0, vd(0), 'correct', ['0']),
    spec('v0 : sécantes prises pour non coplanaires', 0, vd(0), 'incorrect', ['2']),
    spec('v0 : strictement parallèles', 0, vd(1), 'correct', ['1']),
    spec('v0 : strictement parallèles prises pour confondues', 0, vd(1), 'incorrect', ['3']),
    spec('v0 : non coplanaires', 0, vd(2), 'correct', ['2']),
    spec('v0 : non coplanaires prises pour strictement parallèles', 0, vd(2), 'incorrect', ['1']),
    spec('v0 : non coplanaires prises pour sécantes', 0, vd(2), 'incorrect', ['0']),
    spec('v0 : confondues', 0, vd(3), 'correct', ['3']),
    spec('v1 : I(2 ; 2 ; −2)', 1, vd(0), 'correct', ['2', '2', '-2']),
    spec('v1 : point de d′ en s = 0', 1, vd(0), 'incorrect', ['3', '3', '0'], ERR_Q),
    spec('v1 : point de d en t = 0', 1, vd(0), 'incorrect', ['1', '0', '-1'], ERR_P),
    spec('v1 : s = t = 1 dans d′', 1, vd(0), 'incorrect', ['4', '4', '2'], ERR_MEME_PARAMETRE),
    spec('v2 : sécantes', 2, vd(0), 'correct', ['0']),
    spec('v2 : confondues', 2, vd(3), 'correct', ['3']),
    spec('v2 : confondues prises pour strictement parallèles', 2, vd(3), 'incorrect', ['1']),
    spec('v2 : non coplanaires', 2, vd(2), 'correct', ['2']),
]

N2 = modele(
    'Espace : position relative de deux droites en repère',
    'Deux droites données par des représentations paramétriques (ou par deux points) : '
    'sécantes, strictement parallèles, non coplanaires ou confondues, et le point '
    'd\'intersection de deux droites sécantes (pièges : même paramètre pour les deux droites, '
    'non coplanaires prises pour parallèles)',
    3, [N2_V0, N2_V1, N2_V2], N2_SPECS,
    'Géométrie > Espace > positions relatives et intersections', 'TSPE-567')

# =============================================================================================
# N3 — Coordonnées d'un point dans un repère construit sur un cube (TSG2-10, TSG2-17).
# Point TSPE-332.
# =============================================================================================

SOMMETS = 'ABCDEFGH'
# Coordonnées dans le repère (A ; AB, AD, AE) : ABCD en bas (A devant à gauche, sens direct),
# EFGH au-dessus (E sur A)
COORD = {'A': (0, 0, 0), 'B': (1, 0, 0), 'C': (1, 1, 0), 'D': (0, 1, 0),
         'E': (0, 0, 1), 'F': (1, 0, 1), 'G': (1, 1, 1), 'H': (0, 1, 1)}

# Repères : (origine, trois vecteurs, arêtes à marquer, passage des coordonnées (A ; AB, AD, AE))
REPERES = [
    ('A', ('AB', 'AD', 'AE'), 'arete AB, arete AD, arete AE', lambda x, y, z: (x, y, z)),
    ('B', ('BC', 'BA', 'BF'), 'arete BC, arete AB, arete BF', lambda x, y, z: (y, 1 - x, z)),
    ('H', ('HE', 'HG', 'HD'), 'arete EH, arete GH, arete DH', lambda x, y, z: (1 - y, x, 1 - z)),
    ('E', ('EA', 'EF', 'EH'), 'arete AE, arete EF, arete EH', lambda x, y, z: (1 - z, x, y)),
]


def nom_repere(o, vs):
    return ('(' + o + '\\,;\\,' + fleche(vs[0]) + ',' + fleche(vs[1]) + ',' + fleche(vs[2])
            + ')')


def decomposition(o, vs, coords, lettre):
    """« OM = a·v1 + b·v2 + c·v3 » écrit sans les termes nuls."""
    termes = []
    for c, v in zip(coords, vs):
        if c == 0:
            continue
        coef = '' if c == 1 else ('-' if c == -1 else str(c))
        termes.append(coef + fleche(v))
    somme = '+'.join(termes).replace('+-', '-') if termes else '\\vec{0}'
    return fleche(o + lettre) + '=' + somme


CUBE_INTRO = ('$ABCDEFGH$ est un cube (face $ABCD$ en bas, $E$ au-dessus de $A$), les arêtes '
              'du repère sont marquées.\n\n')
COORDS_CASES = '(?\\,;\\,?\\,;\\,?)$'
HINT_CUBE = ('Va de l\'origine du repère au point en suivant les arêtes, et écris ce chemin à '
             'l\'aide des trois vecteurs du repère, dans leur ordre : les coefficients sont les '
             'coordonnées.')
ERR_REPERE_A = ('Tu as lu les coordonnées dans le repère $(A\\,;\\,\\overrightarrow{AB},'
                '\\overrightarrow{AD},\\overrightarrow{AE})$ : pars de l\'origine du repère '
                'donné, avec ses vecteurs.')
ERR_ORDRE = ('Les coordonnées suivent l\'ordre des vecteurs du repère : la première est le '
             'coefficient du premier vecteur.')


def coordonnees_dans(r, lettre):
    return REPERES[r][3](*COORD[lettre])


# v0 : repère (A ; AB, AD, AE), sommet k parmi B…H
def n3_v0():
    cas = list(range(1, 8))
    lettre = selon('k', [(k, SOMMETS[k]) for k in cas], 'A')
    coords = [var(c, selon('k', [(k, str(COORD[SOMMETS[k]][j])) for k in cas], '0'))
              for j, c in enumerate(('x', 'y', 'z'))]
    o, vs, aretes, _ = REPERES[0]
    corr = selon('k', [(k, '$' + decomposition(o, vs, COORD[SOMMETS[k]], SOMMETS[k]) + '$')
                       for k in cas], '')
    return variation(
        CUBE_INTRO + bloc('solide', 'forme: cube 4', 'sommets: A B C D E F G H',
                          'marquer: ' + aretes + ', sommet ' + lettre)
        + '\n\nDonne les coordonnées du sommet $' + lettre + '$ dans le repère $'
        + nom_repere(o, vs) + '$.\n\n$' + lettre + COORDS_CASES,
        [var('k', '1..7')] + coords,
        [case('{{x}}', [erreur('{{y}}', ERR_ORDRE, 'Deux coordonnées échangées')]),
         case('{{y}}', [erreur('{{x}}', ERR_ORDRE, 'Deux coordonnées échangées'),
                        erreur('{{z}}', ERR_ORDRE, 'Deux coordonnées échangées')]),
         case('{{z}}', [erreur('{{y}}', ERR_ORDRE, 'Deux coordonnées échangées')])],
        ['On va de $A$ à $' + lettre + '$ le long des arêtes ; les faces du cube sont des carrés, '
         'chaque arête est égale à $' + fleche('AB') + '$, $' + fleche('AD') + '$ ou $'
         + fleche('AE') + '$ : ' + corr + '.',
         'Les coefficients sont les coordonnées : $' + PRIMAIRE + '{ ' + lettre
         + '({{x}}\\,;\\,{{y}}\\,;\\,{{z}}) }$.'],
        HINT_CUBE,
    )


# v1 : repère d'une autre origine (r = 1, 2, 3), sommet k autre que l'origine
def n3_v1():
    combos = [(r, k) for r in (1, 2, 3) for k in range(8)]
    idx = lambda r, k: 8 * r + k
    lettre = selon('k', [(k, SOMMETS[k]) for k in range(1, 8)], 'A')
    origine = selon('r', [(1, 'B'), (2, 'H')], 'E')
    vars_ = [var('r', '1..3'), var('k', '0..7'),
             var('o', selon('r', [(1, '1'), (2, '7')], '4')),
             var('c', '{{eval:8*r+k}}')]
    for j, nom in enumerate(('x', 'y', 'z')):
        vars_.append(var(nom, selon('c', [(idx(r, k), str(coordonnees_dans(r, SOMMETS[k])[j]))
                                          for r, k in combos], '0')))
    for j, nom in enumerate(('xa', 'ya', 'za')):
        vars_.append(var(nom, selon('k', [(k, str(COORD[SOMMETS[k]][j])) for k in range(8)],
                                    '0')))
    nom_rep = selon('r', [(r, nom_repere(REPERES[r][0], REPERES[r][1])) for r in (1, 2)],
                    nom_repere(REPERES[3][0], REPERES[3][1]))
    aretes = selon('r', [(1, REPERES[1][2]), (2, REPERES[2][2])], REPERES[3][2])
    corr = selon('c', [(idx(r, k), '$' + decomposition(REPERES[r][0], REPERES[r][1],
                                                      coordonnees_dans(r, SOMMETS[k]),
                                                      SOMMETS[k]) + '$')
                       for r, k in combos if SOMMETS[k] != REPERES[r][0]], '')
    return variation(
        CUBE_INTRO + bloc('solide', 'forme: cube 4', 'sommets: A B C D E F G H',
                          'marquer: ' + aretes + ', sommet ' + lettre)
        + '\n\nDonne les coordonnées du sommet $' + lettre + '$ dans le repère $' + nom_rep
        + '$.\n\n$' + lettre + COORDS_CASES,
        vars_,
        [case('{{x}}', [erreur('{{xa}}', ERR_REPERE_A, 'Lu dans le repère (A ; AB, AD, AE)'),
                        erreur('{{y}}', ERR_ORDRE, 'Deux coordonnées échangées')]),
         case('{{y}}', [erreur('{{ya}}', ERR_REPERE_A, 'Lu dans le repère (A ; AB, AD, AE)'),
                        erreur('{{x}}', ERR_ORDRE, 'Deux coordonnées échangées')]),
         case('{{z}}', [erreur('{{za}}', ERR_REPERE_A, 'Lu dans le repère (A ; AB, AD, AE)')])],
        ['L\'origine est $' + origine + '$ : on va de $' + origine + '$ à $' + lettre
         + '$ le long des arêtes, et on écrit chaque arête avec les vecteurs du repère : '
         + corr + '.',
         'Les coefficients, dans l\'ordre des vecteurs du repère, sont les coordonnées : $'
         + PRIMAIRE + '{ ' + lettre + '({{x}}\\,;\\,{{y}}\\,;\\,{{z}}) }$.'],
        HINT_CUBE,
        ['k != o'],
    )


# v2 : milieu d'une arête ou centre d'une face, repère (A ; AB, AD, AE), coordonnées en demis
MILIEUX = [('milieu', 'BF'), ('milieu', 'CG'), ('milieu', 'EH'), ('milieu', 'FG'),
           ('milieu', 'GH'), ('milieu', 'DH'), ('milieu', 'BC'), ('milieu', 'EF'),
           ('centre', 'EFGH'), ('centre', 'BCGF'), ('centre', 'DCGH'), ('centre', 'ABFE'),
           ('centre', 'ADHE'), ('centre', 'ABCD')]


def demis(sorte, lettres):
    """Coordonnées ×2 (milieu) ou ×2 (centre : moyenne de deux sommets opposés)."""
    if sorte == 'milieu':
        p, q = COORD[lettres[0]], COORD[lettres[1]]
    else:
        p, q = COORD[lettres[0]], COORD[lettres[2]]
    return tuple(a + b for a, b in zip(p, q))


def texte_milieu(sorte, lettres):
    if sorte == 'milieu':
        return '$I$ est le milieu de l\'arête $[' + lettres + ']$'
    return '$I$ est le centre de la face $' + lettres + '$'


def n3_v2():
    cas = list(enumerate(MILIEUX))
    vars_ = [var('o', '0..' + str(len(MILIEUX) - 1))]
    for j, nom in enumerate(('hx', 'hy', 'hz')):
        vars_.append(var(nom, selon('o', [(i, str(demis(*m)[j])) for i, m in cas[:-1]],
                                    str(demis(*MILIEUX[-1])[j]))))
    decl = selon('o', [(i, 'I ' + s + ' ' + l) for i, (s, l) in cas[:-1]],
                 'I ' + MILIEUX[-1][0] + ' ' + MILIEUX[-1][1])
    phrase = selon('o', [(i, texte_milieu(*m)) for i, m in cas[:-1]], texte_milieu(*MILIEUX[-1]))
    extremites = selon('o', [(i, '$[' + (l if s == 'milieu' else l[0] + l[2]) + ']$')
                             for i, (s, l) in cas[:-1]], '$[AC]$')
    err_moitie = ('Le milieu a pour coordonnées les moyennes de celles des extrémités : '
                  'n\'oublie pas de diviser la somme par $2$.')
    o, vs, aretes, _ = REPERES[0]
    return variation(
        CUBE_INTRO + bloc('solide', 'forme: cube 4', 'sommets: A B C D E F G H',
                          'points: ' + decl, 'marquer: ' + aretes)
        + '\n\n' + phrase + '. Donne les coordonnées de $I$ dans le repère $'
        + nom_repere(o, vs) + '$.\n\n$I' + COORDS_CASES,
        vars_,
        [case('{{eval:hx/2}}', [erreur('{{hx}}', err_moitie, 'Somme non divisée par 2'),
                                erreur('{{eval:hy/2}}', ERR_ORDRE, 'Deux coordonnées échangées')]),
         case('{{eval:hy/2}}', [erreur('{{hy}}', err_moitie, 'Somme non divisée par 2'),
                                erreur('{{eval:hx/2}}', ERR_ORDRE, 'Deux coordonnées échangées')]),
         case('{{eval:hz/2}}', [erreur('{{hz}}', err_moitie, 'Somme non divisée par 2')])],
        ['Dans ce repère, $A(0\\,;\\,0\\,;\\,0)$, $B(1\\,;\\,0\\,;\\,0)$, $D(0\\,;\\,1\\,;\\,0)$, '
         '$E(0\\,;\\,0\\,;\\,1)$, et les autres sommets s\'en déduisent '
         '($G(1\\,;\\,1\\,;\\,1)$ par exemple).',
         '{{if:o<8|$I$ est le milieu de ' + extremites + '|Le centre d\'une face est le milieu '
         'd\'une de ses diagonales : $I$ est le milieu de ' + extremites + '}} : ses coordonnées '
         'sont les moyennes de celles des extrémités.',
         '$' + PRIMAIRE + '{ I\\left({{eval:hx/2}}\\,;\\,{{eval:hy/2}}\\,;\\,{{eval:hz/2}}'
         '\\right) }$.'],
        'Écris les coordonnées des sommets dans ce repère, puis celles du milieu : '
        '$\\left(\\dfrac{x_1+x_2}{2}\\,;\\,\\dfrac{y_1+y_2}{2}\\,;\\,\\dfrac{z_1+z_2}{2}\\right)$. '
        'Le centre d\'une face est le milieu d\'une de ses diagonales.',
    )


# v3 : point au quart d'une arête (J milieu de [XI], I milieu de [XY]), coordonnées en quarts
QUARTS = [('A', 'B'), ('B', 'A'), ('E', 'H'), ('H', 'E'), ('B', 'F'), ('F', 'B'),
          ('C', 'G'), ('G', 'C'), ('D', 'C'), ('H', 'G')]


def n3_v3():
    cas = list(enumerate(QUARTS))
    vars_ = [var('o', '0..' + str(len(QUARTS) - 1))]

    def table(nom, f):
        dernier = f(*QUARTS[-1])
        return [var(nom + c, selon('o', [(i, str(f(*q)[j])) for i, q in cas[:-1]],
                                   str(dernier[j])))
                for j, c in enumerate(('x', 'y', 'z'))]

    # J ×4 = 3X + Y ; I ×4 = 2X + 2Y ; J′ ×4 = X + 3Y (quart du côté de Y)
    vars_ += table('j', lambda x, y: tuple(3 * a + b for a, b in zip(COORD[x], COORD[y])))
    vars_ += table('m', lambda x, y: tuple(2 * a + 2 * b for a, b in zip(COORD[x], COORD[y])))
    vars_ += table('n', lambda x, y: tuple(a + 3 * b for a, b in zip(COORD[x], COORD[y])))
    decl = selon('o', [(i, 'I milieu ' + x + y + ', J milieu ' + x + 'I') for i, (x, y) in cas[:-1]],
                 'I milieu ' + QUARTS[-1][0] + QUARTS[-1][1] + ', J milieu ' + QUARTS[-1][0] + 'I')
    phrase = selon('o', [(i, '$I$ est le milieu de l\'arête $[' + x + y + ']$ et $J$ celui de $['
                          + x + 'I]$') for i, (x, y) in cas[:-1]],
                   '$I$ est le milieu de l\'arête $[' + QUARTS[-1][0] + QUARTS[-1][1]
                   + ']$ et $J$ celui de $[' + QUARTS[-1][0] + 'I]$')
    err_i = ('Ce sont les coordonnées de $I$, milieu de l\'arête : $J$ est le milieu de $[XI]$, '
             'au quart de l\'arête.')
    err_cote = ('$J$ est au quart de l\'arête du côté de son extrémité qui est aussi une '
                'extrémité de $[XI]$, pas de l\'autre côté.')
    # Le message ne peut pas nommer X sans variable : il est réécrit avec la lettre du tirage
    x_nom = selon('o', [(i, x) for i, (x, _) in cas[:-1]], QUARTS[-1][0])
    err_i = err_i.replace('$[XI]$', '$\\left[ ' + x_nom + 'I \\right]$')
    err_cote = ('$J$ est au quart de l\'arête du côté de $' + x_nom + '$, pas de l\'autre côté.')
    o, vs, aretes, _ = REPERES[0]
    cases = []
    for c in ('x', 'y', 'z'):
        cases.append(case('{{eval:j' + c + '/4}}', [
            erreur('{{eval:m' + c + '/4}}', err_i, 'Milieu de l\'arête'),
            erreur('{{eval:n' + c + '/4}}', err_cote, 'Quart pris de l\'autre côté'),
        ]))
    return variation(
        CUBE_INTRO + bloc('solide', 'forme: cube 4', 'sommets: A B C D E F G H',
                          'points: ' + decl, 'marquer: ' + aretes)
        + '\n\n' + phrase + '. Donne les coordonnées de $J$ dans le repère $'
        + nom_repere(o, vs) + '$.\n\n$J' + COORDS_CASES,
        vars_,
        cases,
        ['$I$ est le milieu de l\'arête : $I\\left({{eval:mx/4}}\\,;\\,{{eval:my/4}}\\,;\\,'
         '{{eval:mz/4}}\\right)$ (moyennes des coordonnées des extrémités).',
         '$J$ est le milieu de $[' + x_nom + 'I]$ : on fait de nouveau la moyenne des coordonnées, '
         '$' + PRIMAIRE + '{ J\\left({{eval:jx/4}}\\,;\\,{{eval:jy/4}}\\,;\\,{{eval:jz/4}}'
         '\\right) }$.'],
        'Calcule d\'abord les coordonnées de $I$, milieu de l\'arête, puis celles du milieu $J$ '
        'de $[' + x_nom + 'I]$.',
    )


def vk(**v):
    return v


N3_SPECS = [
    spec('v0 : G(1 ; 1 ; 1)', 0, {'k': 6, 'x': 1, 'y': 1, 'z': 1}, 'correct', ['1', '1', '1']),
    spec('v0 : D(0 ; 1 ; 0)', 0, {'k': 3, 'x': 0, 'y': 1, 'z': 0}, 'correct', ['0', '1', '0']),
    spec('v0 : D, x et y échangés', 0, {'k': 3, 'x': 0, 'y': 1, 'z': 0}, 'incorrect',
         ['1', '0', '0'], ERR_ORDRE),
    spec('v1 : G dans (B ; BC, BA, BF) = (1 ; 0 ; 1)', 1,
         {'r': 1, 'k': 6, 'o': 1, 'c': 14, 'x': 1, 'y': 0, 'z': 1, 'xa': 1, 'ya': 1, 'za': 1},
         'correct', ['1', '0', '1']),
    spec('v1 : G lu dans (A ; AB, AD, AE)', 1,
         {'r': 1, 'k': 6, 'o': 1, 'c': 14, 'x': 1, 'y': 0, 'z': 1, 'xa': 1, 'ya': 1, 'za': 1},
         'incorrect', ['1', '1', '1'], ERR_REPERE_A),
    spec('v1 : A dans (H ; HE, HG, HD) = (1 ; 0 ; 1)', 1,
         {'r': 2, 'k': 0, 'o': 7, 'c': 16, 'x': 1, 'y': 0, 'z': 1, 'xa': 0, 'ya': 0, 'za': 0},
         'correct', ['1', '0', '1']),
    spec('v1 : C dans (E ; EA, EF, EH) = (1 ; 1 ; 1)', 1,
         {'r': 3, 'k': 2, 'o': 4, 'c': 26, 'x': 1, 'y': 1, 'z': 1, 'xa': 1, 'ya': 1, 'za': 0},
         'correct', ['1', '1', '1']),
    spec('v2 : milieu de [BF] (1 ; 0 ; 1/2)', 2, {'o': 0, 'hx': 2, 'hy': 0, 'hz': 1},
         'correct', ['1', '0', '\\frac{1}{2}']),
    spec('v2 : milieu de [BF], décimal', 2, {'o': 0, 'hx': 2, 'hy': 0, 'hz': 1},
         'correct', ['1', '0', '0,5']),
    spec('v2 : somme non divisée par 2', 2, {'o': 0, 'hx': 2, 'hy': 0, 'hz': 1},
         'incorrect', ['1', '0', '1'],
         'Le milieu a pour coordonnées les moyennes de celles des extrémités : n\'oublie pas de '
         'diviser la somme par $2$.'),
    spec('v2 : centre de EFGH (1/2 ; 1/2 ; 1)', 2, {'o': 8, 'hx': 1, 'hy': 1, 'hz': 2},
         'correct', ['\\frac{1}{2}', '\\frac{1}{2}', '1']),
    spec('v3 : quart de [AB] côté A (1/4 ; 0 ; 0)', 3,
         {'o': 0, 'jx': 1, 'jy': 0, 'jz': 0, 'mx': 2, 'my': 0, 'mz': 0, 'nx': 3, 'ny': 0,
          'nz': 0}, 'correct', ['\\frac{1}{4}', '0', '0']),
    spec('v3 : quart de [AB], décimal', 3,
         {'o': 0, 'jx': 1, 'jy': 0, 'jz': 0, 'mx': 2, 'my': 0, 'mz': 0, 'nx': 3, 'ny': 0,
          'nz': 0}, 'correct', ['0,25', '0', '0']),
    spec('v3 : milieu I donné', 3,
         {'o': 0, 'jx': 1, 'jy': 0, 'jz': 0, 'mx': 2, 'my': 0, 'mz': 0, 'nx': 3, 'ny': 0,
          'nz': 0}, 'incorrect', ['\\frac{1}{2}', '0', '0'],
         'Ce sont les coordonnées de $I$, milieu de l\'arête : $J$ est le milieu de $\\left[ AI \\right]$, au '
         'quart de l\'arête.'),
    spec('v3 : quart pris du côté de B', 3,
         {'o': 0, 'jx': 1, 'jy': 0, 'jz': 0, 'mx': 2, 'my': 0, 'mz': 0, 'nx': 3, 'ny': 0,
          'nz': 0}, 'incorrect', ['\\frac{3}{4}', '0', '0'],
         '$J$ est au quart de l\'arête du côté de $A$, pas de l\'autre côté.'),
    spec('v3 : quart de [CG] côté C (1 ; 1 ; 1/4)', 3,
         {'o': 6, 'jx': 4, 'jy': 4, 'jz': 1, 'mx': 4, 'my': 4, 'mz': 2, 'nx': 4, 'ny': 4,
          'nz': 3}, 'correct', ['1', '1', '\\frac{1}{4}']),
]

N3 = modele(
    'Espace : coordonnées d\'un point dans un repère du cube',
    'Sur un cube nommé, coordonnées d\'un sommet dans le repère (A ; AB, AD, AE) ou dans un '
    'repère d\'une autre origine, puis du milieu d\'une arête, du centre d\'une face, d\'un point '
    'au quart d\'une arête (pièges : repère de A gardé, ordre des vecteurs, somme non divisée '
    'par 2)',
    2, [n3_v0(), n3_v1(), n3_v2(), n3_v3()], N3_SPECS,
    'Géométrie > Espace > coordonnées', 'TSPE-332',
    shared={'blankDefaults': {'acceptDecimal': True}})

ecrire('n1-ecrire-representation-parametrique', N1)
ecrire('n2-position-relative-deux-droites', N2)
ecrire('n3-coordonnees-point-repere-cube', N3)
print('3 modèles écrits dans', DOSSIER)
