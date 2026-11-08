"""Écrit les 6 modèles du lot 12b du CE2 (constructions) dans scripts/questions/ce2-12b/.

Phase 0 validée par David le 2026-11-08 (§ 19 du journal `docs/wip/questions-ce2-progress.md`,
« je suis tes recos ») : CE2-070, plus deux modèles de niveau 2 pour CE1-072. Outils livrés par
le chantier `cercle-triangle-rectangle` (#2463, #2473) :

- `cercle c = cercle(O, passant=A)` : compas seul, quadrillage ou papier uni ;
- `cercle c = cercle(O, rayon=distance(M, N))` : compas + report, papier uni seulement ;
- `triangle ABC : CAB = 90 ; AC = n carreaux` ([AB] sur une ligne) ou `AC = AB` sur quadrillage
  (palette Segment) ; `CAB = 90 ; AC = u` sur papier uni (Segment · Équerre · Report).

Niveaux sur « Géométrie › Figures planes › constructions » : 2 = CE1 (quadrillage, côtés sur les
lignes), 3 = CE2 quadrillage ou compas seul, 4 = CE2 instruments enchaînés sur papier uni.
Variables à une lettre ; jamais `e` ni `i` ; aucun point nommé E.

    python3 docs/wip/questions/lot-ce2-12b.py scripts/questions/ce2-12b
"""
import json
import sys

DOSSIER = sys.argv[1]

# ---- Gabarits (repris du lot 12) ----


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(x) for k, x in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(title, description, grade, level, variations, specs, delay=240):
    # ni theme, ni domain, ni subdomain (ADR 0035) : le rangement est posé par la migration
    return {'title': title, 'description': description, 'grades': [grade], 'level': level,
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


def mul(v, k):
    return (v[0] * k, v[1] * k)


def fmt(x):
    return str(int(x)) if float(x).is_integer() else str(x)


def pt(nom, p, visible=True):
    return f'{nom} = point({fmt(p[0])}, {fmt(p[1])}' + ('' if visible else ', visible=faux') + ')'


def seg(p, q):
    return f'segment({fmt(p[0])};{fmt(p[1])};{fmt(q[0])};{fmt(q[1])})'


def droite(p, q):
    return f'droite({fmt(p[0])};{fmt(p[1])};{fmt(q[0])};{fmt(q[1])})'


def cercle(c, p):
    return f'cercle({fmt(c[0])};{fmt(c[1])};{fmt(p[0])};{fmt(p[1])})'


def report(centre, p, q):
    return (f'report({fmt(centre[0])};{fmt(centre[1])};{fmt(p[0])};{fmt(p[1])};'
            f'{fmt(q[0])};{fmt(q[1])})')


def dedans(pts, w, h):
    return all(0 <= x <= w and 0 <= y <= h for x, y in pts)


def rayon(v):
    return (v[0] ** 2 + v[1] ** 2) ** 0.5


def cercle_dedans(o, r, w, h):
    return o[0] - r >= 0 and o[0] + r <= w and o[1] - r >= 0 and o[1] + r <= h


def normale(v):
    return (-v[1], v[0])


# ---- Cercle de centre O passant par A (03 et 07) ----

WC, HC = 12, 10
O_C = (6, 5)
# quadrillage, A sur une ligne du quadrillage depuis O (CE1 et CE2)
CERCLES_LIGNE = [(3, 0), (0, 4), (-2, 0), (0, -3), (4, 0)]
# quadrillage, A en oblique (CE2) : un autre nœud à la même distance existe toujours (b ; a)
CERCLES_OBLIQUE = [(2, 1), (3, 2), (-1, 3), (3, -1), (-2, -2)]
# papier uni (CE2) : A hors des nœuds
CERCLES_UNI = [(2.5, 1.5), (-3, 2), (1, -3.5), (-2.5, -2), (3.5, 1)]

for v in CERCLES_LIGNE + CERCLES_OBLIQUE + CERCLES_UNI:
    assert cercle_dedans(O_C, rayon(v), WC, HC), v


def bloc_cercle(vecteurs, grille):
    tete = f'```figure-a-completer\nfenetre: 0 ; {WC} ; 0 ; {HC}\n'
    tete += 'grille: 1\n' if grille else ''
    tete += 'verifier: cercle c = cercle(O, passant=A)\n---\n' + pt('O', O_C) + '\n'
    return tete + selon('k', [pt('A', add(O_C, v)) for v in vecteurs]) + '\n```'


ENONCE_CERCLE = 'Trace le cercle de centre $O$ qui passe par le point $A$.\n\n'
ETAPES_CERCLE = [
    'On pique la pointe du compas sur le ' + colt('centre') + ' $O$.',
    'On ouvre le compas jusqu\'au point $A$ et on trace le cercle : il ' + colt('passe par')
    + ' $A$.']


def specs_cercle(vi, vecteurs, grille):
    out = []
    for k, v in enumerate(vecteurs, start=1):
        a = add(O_C, v)
        out.append(spec(f'Cercle {k} : centre O, ouvert jusqu\'à A', vi, {'k': k}, cercle(O_C, a),
                        'correct'))
        if k == 1:
            out.append(spec('Erreur : compas piqué en A', vi, {'k': k}, cercle(a, O_C), 'incorrect'))
            out.append(spec('Erreur : compas trop ouvert', vi, {'k': k},
                            cercle(O_C, add(a, (1 if v[0] >= 0 else -1, 0)) if v[0] != 0
                                   else add(a, (0, 1 if v[1] > 0 else -1))), 'incorrect'))
            out.append(spec('Erreur : rien de tracé', vi, {'k': k}, '', 'empty'))
            # un trait de construction en plus ne gêne pas
            out.append(spec('Cercle juste, plus un cercle d\'essai', vi, {'k': k},
                            '|'.join([cercle(a, O_C), cercle(O_C, a)]), 'correct'))
        if k == 2:
            # le même rayon pris sur un autre point
            autre = add(O_C, (-v[1], v[0]))
            out.append(spec(f'Cercle {k} : passe par un autre point à la même distance', vi, {'k': k},
                            cercle(O_C, autre), 'correct' if grille else 'incorrect'))
    return out


CERCLE_LIGNE = variation(ENONCE_CERCLE + bloc_cercle(CERCLES_LIGNE, True),
                         [var('k', '1..' + str(len(CERCLES_LIGNE)))], ETAPES_CERCLE)
CERCLE_OBLIQUE = variation(ENONCE_CERCLE + bloc_cercle(CERCLES_OBLIQUE, True),
                           [var('k', '1..' + str(len(CERCLES_OBLIQUE)))], ETAPES_CERCLE)
CERCLE_UNI = variation(ENONCE_CERCLE + bloc_cercle(CERCLES_UNI, False),
                       [var('k', '1..' + str(len(CERCLES_UNI)))], ETAPES_CERCLE)

SPECS_03 = (specs_cercle(0, CERCLES_OBLIQUE, True) + specs_cercle(1, CERCLES_UNI, False))
SPECS_07 = specs_cercle(0, CERCLES_LIGNE, True)

# ---- 04. Cercle de rayon donné (papier uni, report) ----

WR, HR = 12, 9
# centre O, segment [MN] posé en haut à droite
RAYONS = [((4, 4.5), (8, 8), (11, 8)), ((4.5, 4), (8, 1), (10.5, 1)), ((4, 4), (7.5, 8), (11, 8)),
          ((3.5, 4.5), (8.5, 1), (11, 2)), ((4, 5), (8, 1.5), (11, 1.5))]

for o, m, n in RAYONS:
    r = rayon((n[0] - m[0], n[1] - m[1]))
    assert cercle_dedans(o, r, WR, HR), (o, m, n)
    assert dedans([m, n], WR, HR)
    # le segment ne touche pas le cercle attendu (lisibilité)
    assert min(rayon((p[0] - o[0], p[1] - o[1])) for p in (m, n)) > r + 0.5, (o, m, n)


def bloc_rayon():
    blocs = ['\n'.join([pt('O', o), pt('M', m), pt('N', n)]) for o, m, n in RAYONS]
    return (f'```figure-a-completer\nfenetre: 0 ; {WR} ; 0 ; {HR}\n'
            'verifier: cercle c = cercle(O, rayon=distance(M, N))\n---\n' + selon('k', blocs)
            + '\nmn = segment(M, N)\n```')


RAYON = variation(
    'Trace le cercle de centre $O$ dont le rayon est aussi long que le segment $[MN]$.\n\n'
    + bloc_rayon(),
    [var('k', '1..' + str(len(RAYONS)))],
    ['On ' + colt('prend la longueur') + ' $MN$ avec le compas : une pointe sur $M$, l\'autre'
     ' sur $N$.',
     'Sans changer l\'écartement, on pique en $O$ et on trace le cercle : son '
     + colt('rayon') + ' est aussi long que $[MN]$.'])

SPECS_04 = []
for k, (o, m, n) in enumerate(RAYONS, start=1):
    SPECS_04.append(spec(f'Cercle {k} : longueur MN reportée en O', 0, {'k': k}, report(o, m, n),
                         'correct'))
    if k == 1:
        r = rayon((n[0] - m[0], n[1] - m[1]))
        SPECS_04.append(spec('Cercle 1 : longueur prise de N vers M', 0, {'k': k}, report(o, n, m),
                             'correct'))
        SPECS_04.append(spec('Erreur : compas ouvert à l\'œil, sans report', 0, {'k': k},
                             cercle(o, add(o, (r, 0))), 'incorrect'))
        SPECS_04.append(spec('Erreur : longueur reportée en M', 0, {'k': k}, report(m, m, n),
                             'incorrect'))
        SPECS_04.append(spec('Erreur : compas trop ouvert', 0, {'k': k}, cercle(o, add(o, (r + 1, 0))),
                             'incorrect'))

# ---- Triangle rectangle sur quadrillage (05 et 08) ----

WT, HT = 12, 10
# [AB] sur une ligne du quadrillage, AC en carreaux : A, B, n ; C = A + n·(normale unitaire)
CARREAUX = [((3, 2), (9, 2), 4), ((3, 3), (8, 3), 5), ((2, 2), (2, 7), 6), ((9, 2), (4, 2), 3),
            ((4, 8), (9, 8), 5)]
# [AB] oblique, AC = AB : C = A + normale(AB)
OBLIQUES = [((4, 3), (7, 4)), ((3, 2), (7, 3)), ((5, 2), (8, 4)), ((7, 3), (4, 4)), ((3, 3), (5, 6))]


def unitaire(v):
    r = rayon(v)
    return (v[0] / r, v[1] / r)


def sommets_carreaux(a, b, n):
    u = unitaire((b[0] - a[0], b[1] - a[1]))
    p = normale(u)
    return add(a, mul(p, n)), add(a, mul(p, -n))


def sommets_oblique(a, b):
    v = (b[0] - a[0], b[1] - a[1])
    return add(a, normale(v)), add(a, mul(normale(v), -1))


def premier_dedans(cs, w, h):
    return next(c for c in cs if dedans([c], w, h))


for a, b, n in CARREAUX:
    assert a[0] == b[0] or a[1] == b[1]
    assert any(dedans([c], WT, HT) for c in sommets_carreaux(a, b, n)), (a, b, n)
for a, b in OBLIQUES:
    assert a[0] != b[0] and a[1] != b[1]
    assert any(dedans([c], WT, HT) for c in sommets_oblique(a, b)), (a, b)


def bloc_tri_grille(verif, cas):
    blocs = []
    for c in cas:
        a, b = c[0], c[1]
        blocs.append(pt('A', a) + '\n' + pt('B', b))
    return (f'```figure-a-completer\nfenetre: 0 ; {WT} ; 0 ; {HT}\ngrille: 1\nverifier: '
            + verif + '\n---\n' + selon('k', blocs) + '\nab = segment(A, B, epaisseur=3)\n```')


def carreaux_txt(n):
    return f'{n} carreaux'


TRI_CARREAUX = variation(
    'Le côté $[AB]$ est déjà tracé. Termine le triangle $ABC$ qui a un ' + colt('angle droit')
    + ' en $A$ et dont le côté $[AC]$ mesure '
    + selon('k', [carreaux_txt(n) for _, _, n in CARREAUX]) + '. Trace les côtés $[AC]$ et'
    ' $[BC]$ en suivant le quadrillage.\n\n'
    + bloc_tri_grille('triangle ABC : CAB = 90 ; AC = '
                      + selon('k', [carreaux_txt(n) for _, _, n in CARREAUX]), CARREAUX),
    [var('k', '1..' + str(len(CARREAUX)))],
    ['Le côté $[AB]$ suit une ligne du quadrillage : le côté $[AC]$ part de $A$ sur la ligne qui'
     ' le ' + colt('coupe à angle droit') + '.',
     'On compte les carreaux depuis $A$ pour placer $C$, puis on trace $[AC]$ et $[BC]$.'])

TRI_OBLIQUE = variation(
    'Le côté $[AB]$ est déjà tracé. Termine le triangle $ABC$ qui a un ' + colt('angle droit')
    + ' en $A$ et dont les côtés $[AC]$ et $[AB]$ ont la ' + colt('même longueur')
    + '. Place $C$ sur un nœud du quadrillage, puis trace $[AC]$ et $[BC]$.\n\n'
    + bloc_tri_grille('triangle ABC : CAB = 90 ; AC = AB', OBLIQUES),
    [var('k', '1..' + str(len(OBLIQUES)))],
    ['Pour aller de $A$ à $B$, on compte les carreaux : par exemple « 3 vers la droite, 1 vers le'
     ' haut ».',
     'Le côté $[AC]$ ' + colt('tourne d\'un angle droit') + ' : on échange les deux nombres'
     ' (« 1 vers la gauche, 3 vers le haut ») et on place $C$ au bout, puis on trace $[BC]$.'])


def specs_carreaux(vi):
    out = []
    for k, (a, b, n) in enumerate(CARREAUX, start=1):
        cs = [c for c in sommets_carreaux(a, b, n) if dedans([c], WT, HT)]
        c = cs[0]
        out.append(spec(f'Triangle {k} : C à {n} carreaux', vi, {'k': k},
                        '|'.join([seg(a, c), seg(b, c)]), 'correct'))
        if k == 1:
            if len(cs) > 1:
                out.append(spec('Triangle 1 : C de l\'autre côté', vi, {'k': k},
                                '|'.join([seg(a, cs[1]), seg(b, cs[1])]), 'correct'))
            u = unitaire((c[0] - a[0], c[1] - a[1]))
            trop = add(c, u)
            out.append(spec('Erreur : [AC] trop long d\'un carreau', vi, {'k': k},
                            '|'.join([seg(a, trop), seg(b, trop)]), 'incorrect'))
            penche = add(c, unitaire((b[0] - a[0], b[1] - a[1])))
            out.append(spec('Erreur : angle en A non droit', vi, {'k': k},
                            '|'.join([seg(a, penche), seg(b, penche)]), 'incorrect'))
            out.append(spec('Erreur : le côté [BC] manque', vi, {'k': k}, seg(a, c), 'incorrect'))
    return out


SPECS_05 = specs_carreaux(0)
for k, (a, b) in enumerate(OBLIQUES, start=1):
    c = premier_dedans(sommets_oblique(a, b), WT, HT)
    SPECS_05.append(spec(f'Triangle oblique {k} : AC = AB', 1, {'k': k},
                         '|'.join([seg(a, c), seg(b, c)]), 'correct'))
    if k == 1:
        # erreur typique : les deux nombres échangés sans changer le sens → pas d'angle droit
        v = (b[0] - a[0], b[1] - a[1])
        faux = add(a, (v[1], v[0]))
        SPECS_05.append(spec('Erreur : nombres échangés, angle non droit', 1, {'k': k},
                             '|'.join([seg(a, faux), seg(b, faux)]), 'incorrect'))
        # angle droit mais [AC] doublé (aucun nœud plus proche sur la perpendiculaire)
        long_ = add(a, mul(normale(v), 2))
        assert dedans([long_], WT, HT)
        SPECS_05.append(spec('Erreur : [AC] deux fois plus long que [AB]', 1, {'k': k},
                             '|'.join([seg(a, long_), seg(b, long_)]), 'incorrect'))

SPECS_08 = specs_carreaux(0)

# ---- 06. Triangle rectangle à l'équerre (papier uni) ----

WQ, HQ = 12, 9
# A, B, M, N ; [AB] de direction (1 ; 0), (0 ; 1) ou (4 ; 3)/5 ; C = A + |MN|·normale
EQUERRES = [((3, 2), (9, 2), (7, 8), (10, 8)), ((2, 2), (8, 2), (8, 8), (11.5, 8)),
            ((9, 2), (9, 7), (1, 8), (5, 8)), ((2, 1), (6, 4), (8, 8), (11, 8)),
            ((4, 1), (10, 1), (7, 8), (11.5, 8))]


def sommet_equerre(a, b, m, n):
    u = unitaire((b[0] - a[0], b[1] - a[1]))
    lg = rayon((n[0] - m[0], n[1] - m[1]))
    return [add(a, mul(normale(u), lg)), add(a, mul(normale(u), -lg))], lg


for a, b, m, n in EQUERRES:
    cs, _ = sommet_equerre(a, b, m, n)
    assert any(dedans([c], WQ, HQ) for c in cs), (a, b)
    assert dedans([a, b, m, n], WQ, HQ)
    for c in cs:
        assert all(abs(x - round(x, 1)) < 1e-9 for x in c), c  # coordonnées propres


def bloc_equerre():
    blocs = ['\n'.join([pt('A', a), pt('B', b), pt('M', m), pt('N', n)]) for a, b, m, n in EQUERRES]
    return (f'```figure-a-completer\nfenetre: 0 ; {WQ} ; 0 ; {HQ}\n'
            'verifier: triangle ABC : CAB = 90 ; AC = u\n---\n' + selon('k', blocs)
            + '\nab = segment(A, B, epaisseur=3)\nu = segment(M, N)\n```')


EQUERRE = variation(
    'Le côté $[AB]$ est déjà tracé. Construis le triangle $ABC$ qui a un ' + colt('angle droit')
    + ' en $A$ et dont le côté $[AC]$ est aussi long que le segment $[MN]$ : trace l\'angle droit'
    ' avec l\'équerre, reporte la longueur $MN$ avec le compas, puis trace $[AC]$ et $[BC]$.\n\n'
    + bloc_equerre(),
    [var('k', '1..' + str(len(EQUERRES)))],
    ['On pose l\'équerre le long de $[AB]$, l\'angle droit en $A$, et on trace la droite qui '
     + colt('coupe') + ' $[AB]$ à angle droit.',
     'On prend la longueur $MN$ avec le compas, on pique en $A$ et on trace un arc : $C$ est là où'
     ' l\'arc ' + colt('croise') + ' la droite.',
     'On trace $[AC]$ et $[BC]$.'])


def perpendiculaire(a, b):
    # ce que rend l'équerre posée le long de [AB] en A (`perpendicularThrough`)
    return droite(a, add(a, normale((b[0] - a[0], b[1] - a[1]))))


SPECS_06 = []
for k, (a, b, m, n) in enumerate(EQUERRES, start=1):
    cs, lg = sommet_equerre(a, b, m, n)
    c = premier_dedans(cs, WQ, HQ)
    juste = [perpendiculaire(a, b), report(a, m, n), seg(a, c), seg(b, c)]
    SPECS_06.append(spec(f'Triangle {k} : équerre, report, côtés', 0, {'k': k}, '|'.join(juste),
                         'correct'))
    if k == 1:
        SPECS_06.append(spec('Erreur : sans équerre, [AC] tracé à l\'œil', 0, {'k': k},
                             '|'.join([report(a, m, n), seg(a, c), seg(b, c)]), 'incorrect'))
        SPECS_06.append(spec('Erreur : sans report, C placé à l\'œil', 0, {'k': k},
                             '|'.join([perpendiculaire(a, b), seg(a, c), seg(b, c)]), 'incorrect'))
        u = unitaire((c[0] - a[0], c[1] - a[1]))
        loin = add(c, u)
        SPECS_06.append(spec('Erreur : C au-delà de l\'arc', 0, {'k': k},
                             '|'.join(juste[:2] + [seg(a, loin), seg(b, loin)]), 'incorrect'))
        SPECS_06.append(spec('Erreur : le côté [BC] manque', 0, {'k': k}, '|'.join(juste[:3]),
                             'incorrect'))

# ---- Fichiers ----

MODELES = {
    '03-trace-le-cercle': modele(
        'Tracer un cercle de centre donné passant par un point',
        'Tracer au compas le cercle de centre O passant par A, sur quadrillage (A en oblique) ou'
        ' sur papier uni', 'CE2', 3, [CERCLE_OBLIQUE, CERCLE_UNI], SPECS_03),
    '04-cercle-de-rayon-donne': modele(
        'Tracer un cercle de rayon donné par un segment',
        'Papier uni : reporter la longueur du segment [MN] et tracer le cercle de centre O de ce'
        ' rayon', 'CE2', 4, [RAYON], SPECS_04),
    '05-triangle-rectangle-carreaux': modele(
        'Terminer un triangle rectangle sur quadrillage',
        'Le côté [AB] est tracé : placer C pour un angle droit en A, AC donné en carreaux ou égal'
        ' à AB (côté oblique)', 'CE2', 3, [TRI_CARREAUX, TRI_OBLIQUE], SPECS_05),
    '06-triangle-rectangle-equerre': modele(
        'Construire un triangle rectangle à l\'équerre et au compas',
        'Papier uni : angle droit en A à l\'équerre, longueur AC reportée au compas, puis les'
        ' côtés', 'CE2', 4, [EQUERRE], SPECS_06),
    '07-cercle-ce1': modele(
        'Tracer un cercle de centre donné sur quadrillage',
        'Quadrillage : tracer au compas le cercle de centre O passant par A, A sur une ligne du'
        ' quadrillage', 'CE1', 2, [CERCLE_LIGNE], SPECS_07),
    '08-triangle-rectangle-ce1': modele(
        'Terminer un triangle rectangle en comptant les carreaux',
        'Quadrillage : le côté [AB] suit une ligne, placer C pour un angle droit en A avec AC'
        ' donné en carreaux', 'CE1', 2, [TRI_CARREAUX], SPECS_08),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
