"""Écrit les 3 modèles du lot 12 « Constructions » de la 6e dans scripts/questions/6-constructions/.

Phase 0 validée par David le 2026-11-12 (§ 27 du journal `docs/wip/questions-6-progress.md`) :
6-173 (construire un triangle : trois longueurs, deux côtés et l'angle compris, un côté et ses deux
angles adjacents, « si possible »), 6-180 (symétrique d'une figure : quadrillage à axe oblique,
papier uni à l'équerre, papier uni au compas), 6-207 (cercle circonscrit, niveau 2). Le nœud et le
tag sont posés par la migration de rangement, après le `--publier` de David.

Décisions et pièges :
- une longueur en cm n'est admise que dans le triangle rectangle (outils-manquants n° 29) : les
  longueurs du triangle quelconque sont des segments u et v tracés dans la figure, reportés ;
- papier pointé absent (outils-manquants n° 30) : quadrillage et papier uni ;
- rapporteur : rayon 0,35 × le plus petit côté de la fenêtre (12 × 9 → 3,15) ; il doit tenir en A et
  en B du même côté de (AB) : A(3,5 ; 2,5), B(8,5 ; 2,5) ;
- symétrique sur papier uni : seuls les segments sont jugés (traits de construction ignorés) ;
- réponses d'essai calculées ici en pleine précision, comme le juge (`repereAt`, intersections) ;
- `eval:` ne connaît ni `==` ni `>` : indicatrices de Lagrange (`lag`).

    python3 docs/wip/questions/lot-12-constructions.py scripts/questions
"""
import json
import math
import os
import subprocess
import sys

RACINE = sys.argv[1]
DOSSIER = os.path.join(RACINE, '6-constructions')


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(nom, title, description, level, variations, specs, delay=60):
    m = {'title': title, 'description': description, 'grades': ['6'], 'level': level,
         'delay': delay, 'status': 'draft', 'variations': variations, 'testSpecs': specs}
    return nom, m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    if answers:
        v['blanks'] = [{'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def colt(x):
    """Mot coloré dans une phrase (hors des $…$)."""
    return '$' + col(x) + '$'


def choix(lignes, plusieurs=False, melanger=True):
    tete = ''
    if plusieurs:
        tete += 'plusieurs: oui\n'
    if not melanger:
        tete += 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + l + '\n' for l in lignes) + '```'


def si(cond, oui, non):
    return '{{if:' + cond + '|' + oui + '|' + non + '}}'


def sik(textes, v='k'):
    """Texte selon v ∈ {1, …, len(textes)}."""
    if len(textes) == 1:
        return textes[0]
    return si(v + '==1', textes[0], sik_suite(textes, v, 2))


def sik_suite(textes, v, i):
    if i == len(textes):
        return textes[-1]
    return si(v + '==' + str(i), textes[i - 1], sik_suite(textes, v, i + 1))


def lag(v, valeurs):
    """Expression qui vaut valeurs[i - 1] quand v == i (v ∈ 1..n), par indicatrices de Lagrange."""
    n_ = len(valeurs)
    termes = []
    for i in range(1, n_ + 1):
        if valeurs[i - 1] == 0:
            continue
        num = '*'.join('(' + v + '-' + str(j) + ')' for j in range(1, n_ + 1) if j != i)
        den = 1
        for j in range(1, n_ + 1):
            if j != i:
                den *= (i - j)
        termes.append('(' + str(valeurs[i - 1]) + ')*' + num + '/(' + str(den) + ')')
    return '+'.join(termes) if termes else '0'


def a_completer(fenetre, verifier, lignes, tete=()):
    return ('\n\n```figure-a-completer\nfenetre: ' + fenetre + '\n' + ''.join(t + '\n' for t in tete)
            + 'verifier: ' + verifier + '\n---\n' + '\n'.join(lignes) + '\n```')


def deg(x):
    return x + '^\\circ'


def angle_hat(nom):
    return '\\widehat{' + nom + '}'


# --- Géométrie des réponses d'essai (même calcul que le juge) --------------------------------------

def n(x):
    """Nombre écrit dans une réponse de figure : pleine précision, sans « -0 »."""
    x = x + 0.0
    if abs(x - round(x)) < 1e-12:
        return str(int(round(x)))
    return repr(x)


def pt(nom, p, extra=''):
    return nom + ' = point(' + n(p[0]) + ', ' + n(p[1]) + extra + ')'


def repere_at(v, a, r, d, sens):
    base = math.atan2(a[1] - v[1], a[0] - v[0])
    t = base + sens * d * math.pi / 180
    return v[0] + r * math.cos(t), v[1] + r * math.sin(t)


def repere(v, a, r, d, sens):
    return 'repere(' + ';'.join(n(x) for x in (v[0], v[1], a[0], a[1], r, d, sens)) + ')'


def segment(p, q):
    return 'segment(' + ';'.join(n(x) for x in (p[0], p[1], q[0], q[1])) + ')'


def droite(p, q):
    return 'droite(' + ';'.join(n(x) for x in (p[0], p[1], q[0], q[1])) + ')'


def cercle(c, p):
    return 'cercle(' + ';'.join(n(x) for x in (c[0], c[1], p[0], p[1])) + ')'


def report(c, a, b):
    return 'report(' + ';'.join(n(x) for x in (c[0], c[1], a[0], a[1], b[0], b[1])) + ')'


def dist(p, q):
    return math.hypot(q[0] - p[0], q[1] - p[1])


def inter_cercles(c1, r1, c2, r2):
    """Les deux points communs, le plus haut (y le plus grand) en premier."""
    dx, dy = c2[0] - c1[0], c2[1] - c1[1]
    d = math.hypot(dx, dy)
    a = (r1 * r1 - r2 * r2 + d * d) / (2 * d)
    h = math.sqrt(r1 * r1 - a * a)
    mx, my = c1[0] + a * dx / d, c1[1] + a * dy / d
    p, q = (mx - h * dy / d, my + h * dx / d), (mx + h * dy / d, my - h * dx / d)
    return (p, q) if p[1] >= q[1] else (q, p)


def inter_droites(p1, p2, q1, q2):
    d1 = (p2[0] - p1[0], p2[1] - p1[1])
    d2 = (q2[0] - q1[0], q2[1] - q1[1])
    det = d1[0] * d2[1] - d1[1] * d2[0]
    t = ((q1[0] - p1[0]) * d2[1] - (q1[1] - p1[1]) * d2[0]) / det
    return p1[0] + t * d1[0], p1[1] + t * d1[1]


def reflet(p, m, q):
    """Symétrique de p par rapport à la droite (mq)."""
    dx, dy = q[0] - m[0], q[1] - m[1]
    t = ((p[0] - m[0]) * dx + (p[1] - m[1]) * dy) / (dx * dx + dy * dy)
    h = (m[0] + t * dx, m[1] + t * dy)
    return 2 * h[0] - p[0], 2 * h[1] - p[1]


def dans(p, l, h, marge=0.4):
    return marge <= p[0] <= l - marge and marge <= p[1] <= h - marge


def etiquette(p, pts):
    """Côté du nom d'un sommet : à l'opposé du centre de gravité du polygone (8 directions)."""
    gx = sum(q[0] for q in pts) / len(pts)
    gy = sum(q[1] for q in pts) / len(pts)
    a = math.degrees(math.atan2(p[1] - gy, p[0] - gx)) % 360
    noms = ['droite', 'haut-droite', 'haut', 'haut-gauche', 'gauche', 'bas-gauche', 'bas',
            'bas-droite']
    return ', etiquette="' + noms[int(((a + 22.5) % 360) // 45)] + '"'


MODELES = []
L, H = 12, 9
FEN = '0 ; 12 ; 0 ; 9'
R_RAPP = 0.35 * min(L, H)

# --- 14. 6-173 : construire un triangle ------------------------------------------------------------
# [AB] tracé (5 unités). v1 : trois longueurs (u, v tracés en haut) ; v2 : AC = u et CAB = a ;
# v3 : CAB = a et ABC = b ; v4 : « si possible », sans figure.

A173, B173 = (3.5, 2.5), (8.5, 2.5)
# (u, v) par cas ; u tracé de x = 0,5, v de x = 6,5, à y = 8,2
LONG_173 = {1: (4.5, 3.5), 2: (3, 4.5), 3: (4, 4)}
U_173 = {1: 4.5, 2: 3.5, 3: 4}  # v2 : longueur de u seule
Y_UV = 8.2


def corps_ab():
    return [pt('A', A173, ', etiquette="bas"'), pt('B', B173, ', etiquette="bas"'),
            'segment(A, B)']


def segments_uv(lu, lv=None):
    lignes = ['u = segment(point(0.5, ' + n(Y_UV) + ', visible=faux), point(' + n(0.5 + lu) + ', '
              + n(Y_UV) + ', visible=faux), couleur="gris")',
              'texte(' + n(0.5 + lu / 2) + ', ' + n(Y_UV - 0.45) + ', "u", dx=0, dy=0, ancre="centre")']
    if lv is not None:
        lignes += ['v = segment(point(6.5, ' + n(Y_UV) + ', visible=faux), point(' + n(6.5 + lv)
                   + ', ' + n(Y_UV) + ', visible=faux), couleur="gris")',
                   'texte(' + n(6.5 + lv / 2) + ', ' + n(Y_UV - 0.45)
                   + ', "v", dx=0, dy=0, ancre="centre")']
    return lignes


def u_pts(lu):
    return (0.5, Y_UV), (0.5 + lu, Y_UV)


def v_pts(lv):
    return (6.5, Y_UV), (6.5 + lv, Y_UV)


def sss_juste(k, dessous=False):
    lu, lv = LONG_173[k]
    c = inter_cercles(A173, lu, B173, lv)[1 if dessous else 0]
    return '|'.join([report(A173, *u_pts(lu)), report(B173, *v_pts(lv)), segment(A173, c),
                     segment(B173, c)])


def sss_echange(k):
    """Erreur : u reporté en B et v en A."""
    lu, lv = LONG_173[k]
    c = inter_cercles(A173, lv, B173, lu)[0]
    return '|'.join([report(A173, *v_pts(lv)), report(B173, *u_pts(lu)), segment(A173, c),
                     segment(B173, c)])


def sss_oeil(k):
    lu, lv = LONG_173[k]
    c = inter_cercles(A173, lu, B173, lv)[0]
    c = (c[0] + 0.3, c[1] - 0.2)
    return '|'.join([segment(A173, c), segment(B173, c)])


def sas(k, a, sens=1):
    lu = U_173[k]
    m = repere_at(A173, B173, R_RAPP, a, sens)
    t = math.atan2(m[1] - A173[1], m[0] - A173[0])
    c = (A173[0] + lu * math.cos(t), A173[1] + lu * math.sin(t))
    return '|'.join([repere(A173, B173, R_RAPP, a, sens), droite(A173, m), report(A173, *u_pts(lu)),
                     segment(A173, c), segment(B173, c)])


def asa(a, b, sens=1):
    ma = repere_at(A173, B173, R_RAPP, a, sens)
    mb = repere_at(B173, A173, R_RAPP, b, -sens)
    c = inter_droites(A173, ma, B173, mb)
    return '|'.join([repere(A173, B173, R_RAPP, a, sens), droite(A173, ma),
                     repere(B173, A173, R_RAPP, b, -sens), droite(B173, mb), segment(A173, c),
                     segment(B173, c)])


def asa_oeil(a, b):
    ma = repere_at(A173, B173, R_RAPP, a, 1)
    mb = repere_at(B173, A173, R_RAPP, b, -1)
    c = inter_droites(A173, ma, B173, mb)
    c = (c[0] + 0.4, c[1] + 0.3)
    return '|'.join([segment(A173, c), segment(B173, c)])


# Vérifications de la fenêtre : C au-dessous de y = 7,6 (u et v à 8,2) dans tous les cas
for k_, (lu_, lv_) in LONG_173.items():
    c_ = inter_cercles(A173, lu_, B173, lv_)[0]
    assert dans(c_, L, 7.6), ('173 v1', k_, c_)
for k_, lu_ in U_173.items():
    for a_ in (30, 120):
        c_ = (A173[0] + lu_ * math.cos(math.radians(a_)), A173[1] + lu_ * math.sin(math.radians(a_)))
        assert dans(c_, L, 7.6), ('173 v2', k_, a_, c_)
c_ = inter_droites(A173, repere_at(A173, B173, 1, 65, 1), B173, repere_at(B173, A173, 1, 65, -1))
assert dans(c_, L, H), ('173 v3', c_)

FIG_173_1 = a_completer(FEN, 'triangle ABC : AC = u ; BC = v',
                        corps_ab() + [sik([ '\n'.join(segments_uv(*LONG_173[i])) for i in (1, 2, 3)])])
FIG_173_2 = a_completer(FEN, 'triangle ABC : AC = u ; CAB = {{a}}',
                        corps_ab() + [sik(['\n'.join(segments_uv(U_173[i])) for i in (1, 2, 3)])])
FIG_173_3 = a_completer(FEN, 'triangle ABC : CAB = {{a}} ; ABC = {{b}}', corps_ab())

# v4 : trois longueurs en cm, constructible (oui) ou non
LONG_173_4 = {1: (5, 6, 9), 2: (3, 4, 8), 3: (4, 7, 10), 4: (2, 5, 9)}
J_173_4 = lag('k', [0, 1, 0, 1])


def cm(x):
    return str(x) + '\\,\\text{cm}'


TXT_173_4 = sik(['$' + cm(a) + '$, $' + cm(b) + '$ et $' + cm(c) + '$'
                 for a, b, c in LONG_173_4.values()])
COMPARE_173_4 = sik(['Les deux plus petits côtés : $' + cm(a) + ' + ' + cm(b) + ' = ' + cm(a + b)
                     + '$ ; le plus grand : $' + cm(c) + '$, et $' + str(c)
                     + (' < ' if c < a + b else ' > ') + str(a + b) + '$'
                     for a, b, c in LONG_173_4.values()])

MODELES.append(modele(
    '14-construire-un-triangle', 'Construire un triangle',
    'Construire un triangle à partir de trois longueurs (compas), de deux côtés et de l\'angle'
    ' compris, ou d\'un côté et de ses deux angles adjacents (rapporteur) ; savoir si trois'
    ' longueurs permettent de construire un triangle',
    1,
    [variation('Construis le triangle $ABC$ : le côté $[AB]$ est tracé. Le côté $[AC]$ doit être'
               ' aussi long que le segment $u$, et le côté $[BC]$ aussi long que le segment $v$.'
               ' Reporte les longueurs, puis trace les côtés $[AC]$ et $[BC]$.' + FIG_173_1,
               [var('k', '1..3')], [],
               ['**Reporter $u$ depuis $A$** : un arc de centre $A$, ouvert de la longueur de $u$.'
                ' Le point $C$ est sur cet arc.',
                '**Reporter $v$ depuis $B$** : un arc de centre $B$, ouvert de la longueur de $v$.'
                ' Les deux arcs se coupent en $' + col('C') + '$ ; on trace $[AC]$ et $[BC]$.']),
     variation('Construis le triangle $ABC$ : le côté $[AB]$ est tracé. L\'angle $'
               + angle_hat('CAB') + '$ doit mesurer $' + deg('{{a}}') + '$, et le côté $[AC]$ doit'
               ' être aussi long que le segment $u$.' + FIG_173_2,
               [var('k', '1..3'), var('a', '30..120')], [],
               ['**L\'angle en $A$** : rapporteur centré en $A$, base sur $[AB]$ ; un repère à $'
                + deg('{{a}}') + '$ (en partant du $0$ qui est sur $[AB]$), puis la demi-droite de $A$'
                ' au repère.',
                '**La longueur** : un arc de centre $A$, ouvert de la longueur de $u$, coupe cette'
                ' demi-droite en $' + col('C') + '$ ; on trace $[AC]$ et $[BC]$.'],
               conditions=['a!=90']),
     variation('Construis le triangle $ABC$ : le côté $[AB]$ est tracé. L\'angle $'
               + angle_hat('CAB') + '$ doit mesurer $' + deg('{{a}}') + '$ et l\'angle $'
               + angle_hat('ABC') + '$ doit mesurer $' + deg('{{b}}') + '$.' + FIG_173_3,
               [var('a', '30..65'), var('b', '30..65')], [],
               ['**L\'angle en $A$** : rapporteur centré en $A$, base sur $[AB]$, repère à $'
                + deg('{{a}}') + '$, demi-droite de $A$ au repère.',
                '**L\'angle en $B$**, du même côté de $[AB]$ : rapporteur centré en $B$, base sur'
                ' $[BA]$, repère à $' + deg('{{b}}') + '$, demi-droite de $B$ au repère.',
                'Les deux demi-droites se coupent en $' + col('C') + '$.']),
     variation('Peut-on construire un triangle dont les côtés mesurent ' + TXT_173_4 + ' ?'
               + choix(['oui', 'non'], melanger=False),
               [var('k', '1..4'), var('j', 'eval:' + J_173_4)], ['{{j}}'],
               ['**Le plus long côté** doit être plus court que la somme des deux autres : sinon,'
                ' les deux arcs ne se coupent pas.',
                COMPARE_173_4 + ' : '
                + si('j==0', colt('\\text{oui}') + ', on peut construire le triangle.',
                     colt('\\text{non}') + ', le plus grand côté est trop long.')])],
    [spec('Trois longueurs, cas 1 : reportées, C au-dessus', 0, {'k': 1}, sss_juste(1), 'correct'),
     spec('Trois longueurs, cas 2 : C au-dessous', 0, {'k': 2}, sss_juste(2, True), 'correct'),
     spec('Trois longueurs, cas 3 : isocèle', 0, {'k': 3}, sss_juste(3), 'correct'),
     spec('Erreur : u reporté en B et v en A', 0, {'k': 1}, sss_echange(1), 'incorrect'),
     spec('Erreur : C placé à l\'œil', 0, {'k': 2}, sss_oeil(2), 'incorrect'),
     spec('Deux côtés et l\'angle compris : 50°', 1, {'k': 1, 'a': 50}, sas(1, 50), 'correct'),
     spec('Deux côtés et l\'angle compris : 110°, au-dessous', 1, {'k': 2, 'a': 110},
          sas(2, 110, -1), 'correct'),
     spec('Erreur : 130° au lieu de 50° (mauvaise graduation)', 1, {'k': 1, 'a': 50},
          sas(1, 130), 'incorrect'),
     spec('Un côté et deux angles : 40° et 55°', 2, {'a': 40, 'b': 55}, asa(40, 55), 'correct'),
     spec('Un côté et deux angles : 65° et 30°, au-dessous', 2, {'a': 65, 'b': 30},
          asa(65, 30, -1), 'correct'),
     spec('Erreur : angles échangés', 2, {'a': 40, 'b': 55}, asa(55, 40), 'incorrect'),
     spec('Erreur : C placé à l\'œil', 2, {'a': 40, 'b': 55}, asa_oeil(40, 55), 'incorrect'),
     spec('5, 6, 9 : oui', 3, {'k': 1, 'j': 0}, '0', 'correct'),
     spec('3, 4, 8 : non', 3, {'k': 2, 'j': 1}, '1', 'correct'),
     spec('Erreur : oui pour 2, 5, 9', 3, {'k': 4, 'j': 1}, '0', 'incorrect')],
    delay=240))

# --- 15. 6-180 : construire le symétrique d'une figure ---------------------------------------------
# v1 : quadrillage, axe le long des diagonales des carreaux ; v2 : papier uni, équerre et compas ;
# v3 : papier uni, compas seul. Axe jamais horizontal ni vertical.

# (m, q) : deux points de l'axe (invisibles), sommets de la figure
SYM_1 = {1: ((1, 0), (10, 9), [(2, 3), (3, 7), (5, 6)]),
         2: ((1, 0), (10, 9), [(2, 4), (2, 7), (5, 8), (5, 5)]),
         3: ((1, 9), (10, 0), [(2, 2), (5, 3), (3, 6)])}
SYM_2 = {1: ((2, 0.5), (10, 8.5), [(2.5, 4), (4, 7.5), (5.5, 5)]),
         2: ((1, 7.5), (11, 2.5), [(3.5, 3.5), (6, 1.5), (5, 4.5)]),
         3: ((3, 0.5), (8, 8.5), [(2, 3.5), (4.5, 7), (1.5, 6.5)])}
SYM_3 = {1: ((1.5, 1.5), (10.5, 7.5), [(2.5, 4.5), (5, 6.5), (3.5, 7.5)]),
         2: ((2, 8.5), (10, 0.5), [(2, 1.5), (5, 2.5), (3, 4)]),
         3: ((4, 0.5), (8, 8.5), [(2, 3.5), (4.5, 4.5), (1.5, 7)])}

for nom_, jeu_ in (('v1', SYM_1), ('v2', SYM_2), ('v3', SYM_3)):
    for k_, (m_, q_, pts_) in jeu_.items():
        for p_ in pts_:
            assert dans(p_, L, H), ('180', nom_, k_, p_)
            im_ = reflet(p_, m_, q_)
            assert dans(im_, L, H), ('180', nom_, k_, p_, im_)
            if nom_ == 'v1':
                assert all(abs(c - round(c)) < 1e-9 for c in im_), ('180 nœud', k_, im_)


def corps_sym(jeu, k, noms):
    m, q, pts = jeu[k]
    lignes = [pt('m', m, ', visible=faux'), pt('q', q, ', visible=faux'),
              'd = droite(m, q, trait="tirets", couleur="rouge")']
    # nom de l'axe près de son bout haut, à l'intérieur
    haut = m if m[1] > q[1] else q
    bas = q if haut is m else m
    tx = haut[0] + 0.12 * (bas[0] - haut[0]) + 0.4
    ty = haut[1] + 0.12 * (bas[1] - haut[1])
    lignes.append('texte(' + n(round(tx, 2)) + ', ' + n(round(ty, 2)) + ', "d", dx=0, dy=0,'
                  ' ancre="centre")')
    if noms:
        lettres = 'ABCD'
        for i, p in enumerate(pts):
            lignes.append(pt(lettres[i], p, etiquette(p, pts)))
        lignes.append('polygone(' + ', '.join(lettres[:len(pts)]) + ')')
    else:
        for i, p in enumerate(pts):
            lignes.append(pt('p' + str(i), p, ', visible=faux'))
        for i in range(len(pts)):
            lignes.append('segment(p' + str(i) + ', p' + str((i + 1) % len(pts)) + ', epaisseur=3)')
    return '\n'.join(lignes)


def sym_juste(jeu, k, traits=False):
    m, q, pts = jeu[k]
    im = [reflet(p, m, q) for p in pts]
    rep = [segment(im[i], im[(i + 1) % len(im)]) for i in range(len(im))]
    if traits:
        # traits de construction : cercles centrés sur l'axe, passant par chaque sommet
        rep = [cercle(m, p) for p in pts] + rep
    return '|'.join(rep)


def sym_glisse(jeu, k):
    """Erreur : la figure glissée de l'autre côté (translation), pas retournée."""
    m, q, pts = jeu[k]
    im = [reflet(p, m, q) for p in pts]
    gx = sum(p[0] for p in im) / len(im) - sum(p[0] for p in pts) / len(pts)
    gy = sum(p[1] for p in im) / len(im) - sum(p[1] for p in pts) / len(pts)
    g = [(p[0] + gx, p[1] + gy) for p in pts]
    return '|'.join(segment(g[i], g[(i + 1) % len(g)]) for i in range(len(g)))


def sym_incomplet(jeu, k):
    return '|'.join(sym_juste(jeu, k).split('|')[:-1])


ETAPES_180_1 = ['**Chaque sommet et son symétrique** sont à la même distance de $d$, sur une'
                ' perpendiculaire à $d$. Ici, $d$ suit les diagonales des carreaux : on compte les'
                ' carreaux **en diagonale**, perpendiculairement à $d$.',
                'On relie les symétriques des sommets dans le même ordre : la figure est '
                + colt('\\text{retournée}') + ', pas glissée.']
ETAPES_180_2 = ['**Pour chaque sommet** : l\'équerre trace la perpendiculaire à $d$ qui passe par ce'
                ' sommet ; elle coupe $d$ en un point $H$.',
                'Le compas, pointe en $H$, ouvert jusqu\'au sommet, reporte la même distance de'
                ' l\'autre côté de $d$ : c\'est le ' + colt('\\text{symétrique}') + ' du sommet.',
                'On relie les symétriques dans le même ordre.']
ETAPES_180_3 = ['**Pour chaque sommet** : deux cercles centrés en deux points de $d$, qui passent par'
                ' ce sommet, se recoupent de l\'autre côté de $d$, en son '
                + colt('\\text{symétrique}') + '.',
                'On relie les symétriques dans le même ordre.']

MODELES.append(modele(
    '15-construire-le-symetrique', 'Construire le symétrique d\'une figure',
    'Construire le symétrique d\'une figure par rapport à une droite oblique : sur quadrillage, puis'
    ' sur papier uni avec l\'équerre et le compas, ou avec le compas seul',
    1,
    [variation('Construis le symétrique de la figure par rapport à la droite $d$.'
               + a_completer(FEN, 'symetrique par d',
                             [sik([corps_sym(SYM_1, i, False) for i in (1, 2, 3)])],
                             tete=['grille: 1']),
               [var('k', '1..3')], [], ETAPES_180_1),
     variation('Construis le symétrique du triangle $ABC$ par rapport à la droite $d$, avec'
               ' l\'**équerre** et le **compas**.'
               + a_completer(FEN, 'symetrique par d',
                             [sik([corps_sym(SYM_2, i, True) for i in (1, 2, 3)])],
                             tete=['outils: segment, equerre, compas']),
               [var('k', '1..3')], [], ETAPES_180_2),
     variation('Construis le symétrique du triangle $ABC$ par rapport à la droite $d$, avec le'
               ' **compas** seul (et la règle pour tracer les côtés).'
               + a_completer(FEN, 'symetrique par d',
                             [sik([corps_sym(SYM_3, i, True) for i in (1, 2, 3)])],
                             tete=['outils: segment, compas']),
               [var('k', '1..3')], [], ETAPES_180_3)],
    [spec('Quadrillage, triangle : juste', 0, {'k': 1}, sym_juste(SYM_1, 1), 'correct'),
     spec('Quadrillage, quadrilatère : juste', 0, {'k': 2}, sym_juste(SYM_1, 2), 'correct'),
     spec('Quadrillage, axe descendant : juste', 0, {'k': 3}, sym_juste(SYM_1, 3), 'correct'),
     spec('Erreur : figure glissée', 0, {'k': 1}, sym_glisse(SYM_1, 1), 'incorrect'),
     spec('Erreur : un côté manque', 0, {'k': 2}, sym_incomplet(SYM_1, 2), 'incorrect'),
     spec('Équerre et compas : juste', 1, {'k': 1}, sym_juste(SYM_2, 1), 'correct'),
     spec('Équerre et compas, cas 2 : juste', 1, {'k': 2}, sym_juste(SYM_2, 2), 'correct'),
     spec('Équerre et compas, cas 3 : juste', 1, {'k': 3}, sym_juste(SYM_2, 3), 'correct'),
     spec('Erreur : triangle glissé', 1, {'k': 2}, sym_glisse(SYM_2, 2), 'incorrect'),
     spec('Compas seul, avec les cercles : juste', 2, {'k': 1}, sym_juste(SYM_3, 1, True),
          'correct'),
     spec('Compas seul, cas 2 : juste', 2, {'k': 2}, sym_juste(SYM_3, 2), 'correct'),
     spec('Compas seul, cas 3 : juste', 2, {'k': 3}, sym_juste(SYM_3, 3), 'correct'),
     spec('Erreur : un côté manque', 2, {'k': 3}, sym_incomplet(SYM_3, 3), 'incorrect')],
    delay=240))

# --- 16. 6-207 : construire le cercle circonscrit --------------------------------------------------
# Papier uni, triangle tiré parmi trois : aux angles aigus (centre dedans), obtus (centre dehors),
# rectangle (centre au milieu de l'hypoténuse). Médiatrices de [AB] et [BC] au compas.

TRI_207 = {1: ((3, 2.5), (9.5, 2.5), (5.5, 8.5)),
           2: ((3, 3.5), (9, 3.5), (4.5, 2)),
           3: ((2, 4.5), (10, 4.5), (8.4, 7.7))}


def centre_circ(a, b, c):
    m1 = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
    m2 = ((b[0] + c[0]) / 2, (b[1] + c[1]) / 2)
    p1 = (m1[0] - (b[1] - a[1]), m1[1] + (b[0] - a[0]))
    p2 = (m2[0] - (c[1] - b[1]), m2[1] + (c[0] - b[0]))
    return inter_droites(m1, p1, m2, p2)


for k_, (a_, b_, c_) in TRI_207.items():
    o_ = centre_circ(a_, b_, c_)
    r_ = dist(o_, a_)
    assert r_ + 0.3 <= o_[0] <= L - r_ - 0.3 and r_ + 0.3 <= o_[1] <= H - r_ - 0.3, ('207', k_, o_, r_)


def corps_207(k):
    a, b, c = TRI_207[k]
    tri = (a, b, c)
    return '\n'.join([pt('A', a, etiquette(a, tri)), pt('B', b, etiquette(b, tri)),
                      pt('C', c, etiquette(c, tri)), 'triangle(A, B, C)'])


def mediatrice_traits(p, q, f=0.65):
    r = f * dist(p, q)
    u, v = inter_cercles(p, r, q, r)
    return [cercle(p, sur(p, q, r)), cercle(q, sur(q, p, r)), droite(u, v)]


def sur(o, p, r):
    d = dist(o, p)
    return o[0] + r * (p[0] - o[0]) / d, o[1] + r * (p[1] - o[1]) / d


def circ_juste(k):
    a, b, c = TRI_207[k]
    o = centre_circ(a, b, c)
    return '|'.join(mediatrice_traits(a, b) + mediatrice_traits(b, c) + [cercle(o, a)])


def circ_centre_gravite(k):
    """Erreur : compas piqué « au milieu » du triangle, à l'œil."""
    a, b, c = TRI_207[k]
    g = ((a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3)
    return cercle(g, a)


def circ_deux_sommets(k):
    """Erreur : une seule médiatrice, centre pris au milieu de [AB] : le cercle manque C."""
    a, b, c = TRI_207[k]
    m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
    return '|'.join(mediatrice_traits(a, b) + [cercle(m, a)])


MODELES.append(modele(
    '16-construire-le-cercle-circonscrit', 'Construire le cercle circonscrit à un triangle',
    'Au compas et à la règle : les médiatrices de deux côtés se coupent au centre du cercle qui passe'
    ' par les trois sommets',
    2,
    [variation('Construis le cercle circonscrit au triangle $ABC$ : le cercle qui passe par ses'
               ' trois sommets.'
               + a_completer(FEN, 'cercle c = cercle_circonscrit(A, B, C)',
                             [sik([corps_207(i) for i in (1, 2, 3)])]),
               [var('k', '1..3')], [],
               ['**Le centre** est à égale distance de $A$, $B$ et $C$ : il est sur la médiatrice de'
                ' $[AB]$ et sur celle de $[BC]$.',
                'On construit ces deux médiatrices au compas (deux arcs de même rayon centrés aux'
                ' extrémités de chaque côté) ; elles se coupent en $O$.',
                'Le cercle de centre $O$ passant par $A$ passe aussi par $B$ et $C$ : c\'est le '
                + colt('\\text{cercle circonscrit}') + '. '
                + sik(['Ici, le triangle a trois angles aigus : $O$ est **dans** le triangle.',
                       'Ici, le triangle a un angle obtus : $O$ est **hors** du triangle.',
                       'Ici, le triangle est rectangle en $C$ : $O$ est le **milieu** de'
                       ' l\'hypoténuse $[AB]$.'])])],
    [spec('Triangle aux angles aigus : juste', 0, {'k': 1}, circ_juste(1), 'correct'),
     spec('Triangle obtus : juste', 0, {'k': 2}, circ_juste(2), 'correct'),
     spec('Triangle rectangle : juste', 0, {'k': 3}, circ_juste(3), 'correct'),
     spec('Erreur : centre pris à l\'œil', 0, {'k': 1}, circ_centre_gravite(1), 'incorrect'),
     spec('Erreur : centre au milieu de [AB]', 0, {'k': 1}, circ_deux_sommets(1), 'incorrect'),
     spec('Erreur : rien de tracé', 0, {'k': 2}, '', 'empty')],
    delay=240))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
