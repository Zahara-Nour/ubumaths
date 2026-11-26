"""Ajoute les variations validées (V1-V9) aux 9 modèles publiés exportés de prod dans
scripts/questions/idees-tle-geometrie-espace-publies/ (chantier idees-tle-geometrie-espace).

Phase 0 validée par David le 2026-11-26 (« je valide » : toutes les fiches oui ; fiches
docs/archive/wip/idees-tle-geometrie-espace/idees-tle-geometrie-espace-fiches.md). Les variations s'ajoutent À LA FIN (les réponses
des élèves gardent l'indice de leur variation) ; la migration de contenu est générée par
scripts/questions/migration-contenu.ts. Les options et `shared` des modèles ne changent pas.

Le script repart du contenu de prod (variations et specs d'origine, comptées dans ORIGINE) :
le relancer réécrit les ajouts sans les doubler.

Écarts de détail aux fiches, consignés dans le journal :
- V3, V4, V5 (choix multiples « coche les… ») : une case choix ne porte pas d'erreur prévue
  (refus du générateur) ; les erreurs typiques sont dans les specs.
- V5 : 2b240d8c règle ses cases en `vecteur` + `colineaire` (`shared.blankDefaults`) ; la case
  choix de V5 v3 n'en est pas gênée (specs vertes), le schéma refuse de surcharger `answerKind`.

Usage : python3 docs/wip/questions/idees-tle-geometrie-espace-publies.py scripts/questions/idees-tle-geometrie-espace-publies
"""
import itertools
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
REPERE_ON = "Dans l'espace muni d'un repère orthonormé, "
REPERE = "Dans l'espace muni d'un repère, "

# id court → (variations, specs) d'origine en prod (export du 2026-11-26)
ORIGINE = {'d192da3e': (6, 22), 'd6938108': (5, 17), 'ac94a453': (2, 5), '33be404b': (4, 12),
           '2b240d8c': (2, 7), 'eae25eba': (2, 7), '4f056eb3': (1, 3), 'aaa16821': (2, 6),
           '31b49cdf': (1, 4)}

# Messages tels que la résolution les réécrit (rempli après le premier passage de question:specs)
REECRIT = {}


def spec(desc, vi, variables_, status, answers, message=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = REECRIT.get(message, message)
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables_.items()},
            'expected': expected, 'answers': answers}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def case(attendue, erreurs=None, **autres):
    c = dict(autres)
    c['expectedAnswer'] = attendue
    if erreurs:
        c['expectedErrors'] = erreurs
    return c


def variation(statement, variables, blanks, steps, hint, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': blanks, 'correction': {'steps': steps}, 'hint': hint}


def bloc(nom, *lignes):
    return '```' + nom + '\n' + '\n'.join(lignes) + '\n```'


def choix_multiple(lignes):
    return bloc('choix', 'plusieurs: oui', *['- ' + l for l in lignes])


def ajouter(court, variations, specs):
    chemin = os.path.join(DOSSIER, court + '.json')
    with open(chemin, encoding='utf-8') as f:
        m = json.load(f)
    nv, ns = ORIGINE[court]
    assert len(m['variations']) >= nv and len(m['testSpecs']) >= ns, court
    m['variations'] = m['variations'][:nv]
    m['testSpecs'] = m['testSpecs'][:ns]
    for s in specs:
        s['variationIndex'] += nv
    m['variations'] += variations
    m['testSpecs'] += specs
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(court, ':', len(variations), 'variation(s) ajoutée(s)')


def lin(c, u, p='t'):
    """« c + u·p » écrit proprement (variables nommées c et u) : 2+3t, -t, 4, 0."""
    return ('{{if:' + c + '!=0|{{' + c + '}}}}'
            '{{if:' + u + '==1|{{if:' + c + '!=0|+}}' + p + '}}'
            '{{if:' + u + '==-1|-' + p + '}}'
            '{{if:' + u + '>1|{{if:' + c + '!=0|+}}{{' + u + '}}' + p + '}}'
            '{{if:' + u + '< -1|{{' + u + '}}' + p + '}}'
            '{{if:' + u + '==0|{{if:' + c + '==0|0}}}}')


def point(nom, c):
    return '$' + nom + '({{' + c[0] + '}}\\,;\\,{{' + c[1] + '}}\\,;\\,{{' + c[2] + '}})$'


def coords(c):
    return '({{' + c[0] + '}}\\,;\\,{{' + c[1] + '}}\\,;\\,{{' + c[2] + '}})'


def vecteur(nom, u):
    return ('$' + nom + '\\begin{pmatrix}{{' + u[0] + '}}\\\\{{' + u[1] + '}}\\\\{{' + u[2]
            + '}}\\end{pmatrix}$')


def fleche(nom):
    return '\\overrightarrow{' + nom + '}'


def plan(n, d):
    """Équation « a x + (b) y + (c) z + (d) = 0 » (cleanCoefficients nettoie les signes)."""
    return ('{{' + n[0] + '}}x+({{' + n[1] + '}})y+({{' + n[2] + '}})z+({{' + d + '}})=0')


def derives(prefixe, depart, vecteur_, coef='1'):
    """Variables prefixe+x/y/z = depart + coef·vecteur."""
    return [var(prefixe + c, '{{eval:' + d + '+(' + coef + ')*' + v + '}}')
            for c, d, v in zip('xyz', depart, vecteur_)]


def produit_vectoriel(nom, p, q):
    """Variables nom1, nom2, nom3 = p × q (calcul interne : la correction résout le système)."""
    return [var(nom + '1', '{{eval:' + p[1] + '*' + q[2] + '-' + p[2] + '*' + q[1] + '}}'),
            var(nom + '2', '{{eval:' + p[2] + '*' + q[0] + '-' + p[0] + '*' + q[2] + '}}'),
            var(nom + '3', '{{eval:' + p[0] + '*' + q[1] + '-' + p[1] + '*' + q[0] + '}}')]


def simplifie(nom, brut):
    """Variables g (pgcd) et nom1..3 = brut / pgcd."""
    return [var('g', '{{eval:gcd(gcd(abs(' + brut + '1),abs(' + brut + '2)),abs(' + brut
                + '3))}}'),
            var(nom + '1', '{{eval:' + brut + '1/g}}'), var(nom + '2', '{{eval:' + brut + '2/g}}'),
            var(nom + '3', '{{eval:' + brut + '3/g}}')]


def coef(v):
    """Coefficient en tête d'une combinaison : rien pour 1, « - » pour −1."""
    return '{{if:' + v + '==1||{{if:' + v + '==-1|-|{{' + v + '}}\\,}}}}'


def coefp(v):
    """Coefficient d'un terme suivant, avec son signe : « + », « - », « +2\\, », « -3\\, »."""
    return '{{if:' + v + '==1|+|{{if:' + v + '==-1|-|{{' + v + ';+}}\\,}}}}'


def equation_propre(n, d, prefixe='e'):
    """Équation « a x + b y + c z + d = 0 » écrite sans cleanCoefficients (termes nuls ôtés,
    signes et coefficients 1 nettoyés). Rend (texte, variables auxiliaires)."""
    termes = list(n) + [d]
    lettres = ['x', 'y', 'z', '']
    vs = []
    for j, t in enumerate(termes):
        vs.append(var(prefixe + 'a' + str(j), '{{eval:abs(' + t + ')}}'))
        avant = '+'.join('min(abs(' + u + '),1)' for u in termes[:j]) or '0'
        vs.append(var(prefixe + 'b' + str(j), '{{eval:min(' + avant + ',1)}}'))
    texte = ''
    for j, (t, l) in enumerate(zip(termes, lettres)):
        a, b = prefixe + 'a' + str(j), prefixe + 'b' + str(j)
        signe = '{{if:' + t + '<0|-|{{if:' + b + '==1|+|}}}}'
        valeur = ('{{if:' + a + '==1|' + ('' if l else '1') + '|{{' + a + '}}}}' + l)
        texte += '{{if:' + t + '==0||' + signe + valeur + '}}'
    return texte + '=0', vs


LETTRES = ('K', 'L', 'R', 'S')


def lettre(j, noms=LETTRES):
    """Nom du j-ième point proposé, tourné par la variable pm (0..3) : la bonne réponse
    n'a pas toujours le même nom."""
    return ('{{if:pm==0|' + noms[j] + '|{{if:pm==1|' + noms[(j + 1) % 4] + '|{{if:pm==2|'
            + noms[(j + 2) % 4] + '|' + noms[(j + 3) % 4] + '}}}}}}')


PT_A = ('ax', 'ay', 'az')
PT_B = ('bx', 'by', 'bz')
PT_C = ('cx', 'cy', 'cz')
VP = ('p1', 'p2', 'p3')
VQ = ('q1', 'q2', 'q3')
VN = ('n1', 'n2', 'n3')

# =============================================================================================
# V1 — d192da3e : équation du plan (ABC) ; plan passant par A dirigé par u et v (TSG2-41, 44)
# =============================================================================================

ERR_D_OUBLIE = ('Tu as oublié $d$ : le plan passe par $A$, on trouve $d$ en écrivant que les '
                'coordonnées de $A$ vérifient l\'équation.')
ERR_D_SIGNE = ('Vérifie le signe de $d$ : en remplaçant par les coordonnées de $A$, la somme '
               'doit valoir $0$.')
ERR_AB_NORMAL = ('$\\overrightarrow{AB}$ est dans le plan, il n\'est pas normal au plan : un '
                 'vecteur normal est orthogonal à $\\overrightarrow{AB}$ et à '
                 '$\\overrightarrow{AC}$.')
ERR_U_NORMAL = ('$\\vec{u}$ dirige le plan, il n\'est pas normal au plan : un vecteur normal est '
                'orthogonal à $\\vec{u}$ et à $\\vec{v}$.')


def vars_plan_abc():
    return ([var('ax', '-3..3'), var('ay', '-3..3'), var('az', '-3..3'), var('p1', '-2..2'),
             var('p2', '-2..2'), var('p3', '-2..2'), var('q1', '-2..2'), var('q2', '-2..2'),
             var('q3', '-2..2')]
            + produit_vectoriel('c', VP, VQ) + simplifie('n', 'c')
            + [var('dd', '{{eval:-(n1*ax+n2*ay+n3*az)}}'),
               var('dp', '{{eval:-(p1*ax+p2*ay+p3*az)}}')])


COND_PLAN = ['abs(c1)+abs(c2)+abs(c3) > 0', 'abs(c1/g) <= 4', 'abs(c2/g) <= 4', 'abs(c3/g) <= 4']

ETAPES_NORMAL = [
    'Un vecteur normal $\\vec{n}\\begin{pmatrix}a\\\\b\\\\c\\end{pmatrix}$ est orthogonal aux '
    'deux vecteurs %s : $\\vec{n}\\cdot%s=0$ et $\\vec{n}\\cdot%s=0$, soit '
    '${{p1}}a+({{p2}})b+({{p3}})c=0$ et ${{q1}}a+({{q2}})b+({{q3}})c=0$.',
    'En résolvant (une coordonnée fixée), on trouve par exemple '
    '$\\vec{n}\\begin{pmatrix}{{n1}}\\\\{{n2}}\\\\{{n3}}\\end{pmatrix}$ ; le plan a une '
    'équation ${{n1}}x+({{n2}})y+({{n3}})z+d=0$.',
    '$A$ est dans le plan : ${{n1}}\\times{{ax;()}}+{{n2;()}}\\times{{ay;()}}+{{n3;()}}\\times'
    '{{az;()}}+d=0$, donc $d=' + PRIMAIRE + '{ {{dd}} }$ : une équation est $' + plan(VN, 'dd')
    + '$ (toute équation proportionnelle convient).',
]

V1A = variation(
    REPERE_ON + 'on considère les points ' + point('A', PT_A) + ', ' + point('B', PT_B) + ' et '
    + point('C', PT_C) + ', qui ne sont pas alignés.\n\n'
    'Donne une équation cartésienne du plan $(ABC)$.\n\n$(ABC)$ : $?$',
    vars_plan_abc() + [var('bx', '{{eval:ax+p1}}'), var('by', '{{eval:ay+p2}}'),
                       var('bz', '{{eval:az+p3}}'), var('cx', '{{eval:ax+q1}}'),
                       var('cy', '{{eval:ay+q2}}'), var('cz', '{{eval:az+q3}}')],
    [case(plan(VN, 'dd'), [
        erreur('{{n1}}x+({{n2}})y+({{n3}})z=0', ERR_D_OUBLIE, 'd oublié'),
        erreur('{{n1}}x+({{n2}})y+({{n3}})z+({{eval:-dd}})=0', ERR_D_SIGNE, 'd de signe opposé'),
        erreur('{{p1}}x+({{p2}})y+({{p3}})z+({{dp}})=0', ERR_AB_NORMAL, 'AB pris pour normal'),
    ], answerKind='equation')],
    ['$' + fleche('AB') + '\\begin{pmatrix}{{p1}}\\\\{{p2}}\\\\{{p3}}\\end{pmatrix}$ et $'
     + fleche('AC') + '\\begin{pmatrix}{{q1}}\\\\{{q2}}\\\\{{q3}}\\end{pmatrix}$ dirigent le '
     'plan $(ABC)$.',
     ETAPES_NORMAL[0] % ('$' + fleche('AB') + '$ et $' + fleche('AC') + '$', fleche('AB'),
                         fleche('AC'))]
    + ETAPES_NORMAL[1:],
    'Cherche un vecteur normal $\\vec{n}$ orthogonal à $\\overrightarrow{AB}$ et à '
    '$\\overrightarrow{AC}$ (deux produits scalaires nuls), puis trouve $d$ avec le point $A$.',
    COND_PLAN,
)

V1B = variation(
    REPERE_ON + 'on considère le point ' + point('A', PT_A) + ' et les vecteurs non colinéaires '
    + vecteur('\\vec{u}', VP) + ' et ' + vecteur('\\vec{v}', VQ) + '.\n\n'
    'Donne une équation cartésienne du plan $\\mathcal{P}$ passant par $A$ et dirigé par '
    '$\\vec{u}$ et $\\vec{v}$.\n\n$\\mathcal{P}$ : $?$',
    [var('ax', '-3..3'), var('ay', '-3..3'), var('az', '-3..3'), var('p1', '-3..3'),
     var('p2', '-3..3'), var('p3', '-3..3'), var('q1', '-3..3'), var('q2', '-3..3'),
     var('q3', '-3..3')]
    + produit_vectoriel('c', VP, VQ) + simplifie('n', 'c')
    + [var('dd', '{{eval:-(n1*ax+n2*ay+n3*az)}}'), var('dp', '{{eval:-(p1*ax+p2*ay+p3*az)}}')],
    [case(plan(VN, 'dd'), [
        erreur('{{n1}}x+({{n2}})y+({{n3}})z=0', ERR_D_OUBLIE, 'd oublié'),
        erreur('{{n1}}x+({{n2}})y+({{n3}})z+({{eval:-dd}})=0', ERR_D_SIGNE, 'd de signe opposé'),
        erreur('{{p1}}x+({{p2}})y+({{p3}})z+({{dp}})=0', ERR_U_NORMAL, 'u pris pour normal'),
    ], answerKind='equation')],
    [ETAPES_NORMAL[0] % ('$\\vec{u}$ et $\\vec{v}$', '\\vec{u}', '\\vec{v}')] + ETAPES_NORMAL[1:],
    'Cherche un vecteur normal $\\vec{n}$ orthogonal à $\\vec{u}$ et à $\\vec{v}$ (deux produits '
    'scalaires nuls), puis trouve $d$ avec le point $A$.',
    COND_PLAN,
)

# A(1 ; 0 ; −1), AB(1 ; 1 ; 0), AC(0 ; 1 ; 1) : n = (1 ; −1 ; 1), d = 0 − (1 + 0 − 1) = 0 → on
# prend A(1 ; 2 ; −1) : d = −(1 − 2 − 1) = 2 ; plan x − y + z + 2 = 0
VA = {'ax': 1, 'ay': 2, 'az': -1, 'p1': 1, 'p2': 1, 'p3': 0, 'q1': 0, 'q2': 1, 'q3': 1}
V1_SPECS = [
    spec('v6 : x − y + z + 2 = 0', 0, VA, 'correct', ['x-y+z+2=0']),
    spec('v6 : multiple', 0, VA, 'correct', ['-2x+2y-2z-4=0']),
    spec('v6 : d oublié', 0, VA, 'incorrect', ['x-y+z=0'], ERR_D_OUBLIE),
    spec('v6 : signe de d', 0, VA, 'incorrect', ['x-y+z-2=0'], ERR_D_SIGNE),
    spec('v6 : AB pris pour normal', 0, VA, 'incorrect', ['x+y-3=0'], ERR_AB_NORMAL),
    spec('v7 : x − y + z + 2 = 0', 1, VA, 'correct', ['x-y+z+2=0']),
    spec('v7 : membre de droite', 1, VA, 'correct', ['x-y+z=-2']),
    spec('v7 : u pris pour normal', 1, VA, 'incorrect', ['x+y-3=0'], ERR_U_NORMAL),
    spec('v7 : d oublié', 1, VA, 'incorrect', ['x-y+z=0'], ERR_D_OUBLIE),
]

# =============================================================================================
# V2 — d6938108 : M tel que AM = k·AB + z·AC (TSG2-14)
# =============================================================================================

ERR_A_OUBLIE = ('Ce sont les coordonnées de $\\overrightarrow{AM}$ : pour celles de $M$, ajoute '
                'celles de $A$.')
ERR_SUR_POINTS = ('Les coefficients s\'appliquent aux vecteurs $\\overrightarrow{AB}$ et '
                  '$\\overrightarrow{AC}$, pas aux coordonnées des points $B$ et $C$.')
ERR_ECHANGE = ('Le premier coefficient va avec $\\overrightarrow{AB}$, le second avec '
               '$\\overrightarrow{AC}$.')

V2_VARS = [var('ax', '-4..4'), var('ay', '-4..4'), var('az', '-4..4'), var('bx', '-4..4'),
           var('by', '-4..4'), var('bz', '-4..4'), var('cx', '-4..4'), var('cy', '-4..4'),
           var('cz', '-4..4'), var('kp', '2..3;±'), var('kq', '2..3;±')]
for c, a, b, cc in zip('xyz', PT_A, PT_B, PT_C):
    V2_VARS += [var('v' + c, '{{eval:' + b + '-' + a + '}}'), var('w' + c, '{{eval:' + cc + '-' + a
                                                                       + '}}'),
                var('m' + c, '{{eval:' + a + '+kp*(' + b + '-' + a + ')+kq*(' + cc + '-' + a
                    + ')}}')]

V2 = variation(
    REPERE + 'on considère les points ' + point('A', PT_A) + ', ' + point('B', PT_B) + ' et '
    + point('C', PT_C) + '.\n\n'
    'Détermine les coordonnées du point $M$ tel que $\\overrightarrow{AM}={{kp}}\\,'
    '\\overrightarrow{AB}{{kq;+}}\\,\\overrightarrow{AC}$.\n\n$M(?\\,;\\,?\\,;\\,?)$',
    V2_VARS,
    [case('{{m' + c + '}}', [
        erreur('{{eval:m' + c + '-' + a + '}}', ERR_A_OUBLIE, 'A pas ajouté (AM donné)'),
        erreur('{{eval:kp*' + b + '+kq*' + cc + '}}', ERR_SUR_POINTS, 'Calcul sur les points'),
        erreur('{{eval:' + a + '+kq*(' + b + '-' + a + ')+kp*(' + cc + '-' + a + ')}}',
               ERR_ECHANGE, 'Coefficients échangés'),
    ]) for c, a, b, cc in zip('xyz', PT_A, PT_B, PT_C)],
    ['$\\overrightarrow{AB}\\begin{pmatrix}{{vx}}\\\\{{vy}}\\\\{{vz}}\\end{pmatrix}$ et '
     '$\\overrightarrow{AC}\\begin{pmatrix}{{wx}}\\\\{{wy}}\\\\{{wz}}\\end{pmatrix}$, donc '
     '$\\overrightarrow{AM}\\begin{pmatrix}{{eval:mx-ax}}\\\\{{eval:my-ay}}\\\\{{eval:mz-az}}'
     '\\end{pmatrix}$.',
     '$x_M=x_A+{{eval:mx-ax;()}}$, de même pour $y_M$ et $z_M$ : $' + PRIMAIRE
     + '{ M({{mx}}\\,;\\,{{my}}\\,;\\,{{mz}}) }$.'],
    'Calcule les coordonnées de $\\overrightarrow{AB}$ et $\\overrightarrow{AC}$, puis celles de '
    '$\\overrightarrow{AM}$ ; les coordonnées de $M$ s\'obtiennent en ajoutant celles de $A$.',
    ['abs(vy*wz-vz*wy)+abs(vz*wx-vx*wz)+abs(vx*wy-vy*wx) > 0', 'abs(mx)+abs(my)+abs(mz) > 0'],
)

# A(1 ; 0 ; 2), B(2 ; 1 ; 2), C(1 ; −1 ; 3) : AB(1 ; 1 ; 0), AC(0 ; −1 ; 1) ; AM = 2AB − 3AC
# = (2 ; 5 ; −3), M(3 ; 5 ; −1)
V2V = {'ax': 1, 'ay': 0, 'az': 2, 'bx': 2, 'by': 1, 'bz': 2, 'cx': 1, 'cy': -1, 'cz': 3,
       'kp': 2, 'kq': -3}
V2_SPECS = [
    spec('M(3 ; 5 ; −1)', 0, V2V, 'correct', ['3', '5', '-1']),
    spec('AM donné', 0, V2V, 'incorrect', ['2', '5', '-3'], ERR_A_OUBLIE),
    spec('2B − 3C', 0, V2V, 'incorrect', ['1', '5', '-5'], ERR_SUR_POINTS),
    spec('coefficients échangés', 0, V2V, 'incorrect', ['-2', '-5', '1'], ERR_ECHANGE),
]

# =============================================================================================
# V3 — ac94a453 : quels points sont dans le plan (ABC) ? (TSG2-16)
# =============================================================================================

# AB = p, AC = q, n = p × q à coordonnées toutes non nulles (calcul interne). Points proposés :
# K = A + l1·p + l2·q (dans le plan) ; L = A + m1·p + m2·q, décalé de 1 sur x si h = 0 ;
# R décalé de 1 sur z, S décalé de 1 sur y (hors du plan). Un décalage sur une coordonnée dont la
# composante de n est non nulle sort du plan ; les deux équations restantes (déterminant = cette
# composante, non nulle) donnent les coefficients, la troisième échoue.
V3_VARS = ([var('ax', '-3..3'), var('ay', '-3..3'), var('az', '-3..3'), var('p1', '-2..2'),
            var('p2', '-2..2'), var('p3', '-2..2'), var('q1', '-2..2'), var('q2', '-2..2'),
            var('q3', '-2..2'), var('h', '0..1')]
           + produit_vectoriel('c', VP, VQ)
           + [var('bx', '{{eval:ax+p1}}'), var('by', '{{eval:ay+p2}}'), var('bz', '{{eval:az+p3}}'),
              var('cx', '{{eval:ax+q1}}'), var('cy', '{{eval:ay+q2}}'), var('cz', '{{eval:az+q3}}')])
DECALAGES = {'k': (0, 0, 0), 'l': ('1-h', 0, 0), 'r': (0, 0, 1), 's': (0, 1, 0)}
for nom in ('k', 'l', 'r', 's'):
    V3_VARS += [var(nom + '1', '1..2;±'), var(nom + '2', '1..2;±')]
    for c, a, p, q, dec in zip('xyz', PT_A, VP, VQ, DECALAGES[nom]):
        V3_VARS.append(var(nom + c, '{{eval:' + a + '+' + nom + '1*' + p + '+' + nom + '2*' + q
                           + '+(' + str(dec) + ')}}'))


def pt3(nom, lettre_):
    return '$' + lettre_ + '({{' + nom + 'x}}\\,;\\,{{' + nom + 'y}}\\,;\\,{{' + nom + 'z}})$'


def vecteur_ax(nom, lettre):
    return ('$\\overrightarrow{A' + lettre + '}\\begin{pmatrix}{{eval:' + nom + 'x-ax}}\\\\'
            '{{eval:' + nom + 'y-ay}}\\\\{{eval:' + nom + 'z-az}}\\end{pmatrix}$')


def dans_le_plan(nom, lettre):
    return (vecteur_ax(nom, lettre)[:-1] + '=' + coef(nom + '1') + '\\overrightarrow{AB}'
            + coefp(nom + '2') + '\\overrightarrow{AC}$ : $' + lettre + '$ est dans le plan.')


def hors(nom, lettre, eqs, reste, a, p, q):
    attendu = '{{eval:' + nom + '1*' + p + '+' + nom + '2*' + q + '}}'
    vraie = '{{eval:' + nom + reste + '-' + a + '}}'
    return (vecteur_ax(nom, lettre) + ' : les coordonnées en $' + eqs[0] + '$ et en $' + eqs[1]
            + '$ donnent $a={{' + nom + '1}}$ et $b={{' + nom + '2}}$, mais alors la coordonnée '
            'en $' + reste + '$ vaudrait $' + attendu + '$, et non $' + vraie + '$ : $' + lettre
            + '$ n\'est pas dans le plan.')


V3 = variation(
    REPERE + 'on considère les points ' + point('A', PT_A) + ', ' + point('B', PT_B) + ' et '
    + point('C', PT_C) + ', qui ne sont pas alignés.\n\n'
    'Parmi les points suivants, lesquels appartiennent au plan $(ABC)$ ? Coche toutes les bonnes '
    'réponses.\n\n'
    + choix_multiple([pt3(n, lettre(j)) for j, n in enumerate('klrs')]),
    V3_VARS + [var('pm', '0..3')],
    [case('0{{if:h==1|;1|}}')],
    ['Un point $M$ est dans $(ABC)$ quand $\\overrightarrow{AM}=a\\,\\overrightarrow{AB}+b\\,'
     '\\overrightarrow{AC}$ pour des réels $a$ et $b$, avec $\\overrightarrow{AB}'
     '\\begin{pmatrix}{{p1}}\\\\{{p2}}\\\\{{p3}}\\end{pmatrix}$ et $\\overrightarrow{AC}'
     '\\begin{pmatrix}{{q1}}\\\\{{q2}}\\\\{{q3}}\\end{pmatrix}$ : on résout deux équations, '
     'puis on vérifie la troisième.',
     dans_le_plan('k', lettre(0)),
     '{{if:h==1|' + dans_le_plan('l', lettre(1)) + '|'
     + hors('l', lettre(1), ('y', 'z'), 'x', 'ax', 'p1', 'q1') + '}}',
     hors('r', lettre(2), ('x', 'y'), 'z', 'az', 'p3', 'q3'),
     hors('s', lettre(3), ('x', 'z'), 'y', 'ay', 'p2', 'q2'),
     'Les points du plan $(ABC)$ : $' + PRIMAIRE + '{ ' + lettre(0) + '{{if:h==1|\\text{ et }'
     + lettre(1) + '|}} }$.'],
    'Pour chaque point $M$, cherche $a$ et $b$ tels que $\\overrightarrow{AM}=a\\,'
    '\\overrightarrow{AB}+b\\,\\overrightarrow{AC}$ avec deux coordonnées, puis vérifie la '
    'troisième.',
    ['c1 != 0', 'c2 != 0', 'c3 != 0']
    # Coefficients différents d'un point à l'autre : un leurre n'est pas un point juste décalé de 1
    + ['abs(' + a + '1-' + b + '1)+abs(' + a + '2-' + b + '2) > 0'
       for a, b in itertools.combinations('klrs', 2)],
)

# A(0 ; 1 ; −1), AB(1 ; 1 ; 0), AC(0 ; 1 ; 2) : n = (2 ; −2 ; 1), toutes non nulles
V3V = {'ax': 0, 'ay': 1, 'az': -1, 'p1': 1, 'p2': 1, 'p3': 0, 'q1': 0, 'q2': 1, 'q3': 2,
       'k1': 1, 'k2': -1, 'l1': 2, 'l2': 1, 'r1': -1, 'r2': 1, 's1': 1, 's2': 2, 'pm': 1}
V3_SPECS = [
    spec('h = 1 : K et L', 0, {**V3V, 'h': 1}, 'correct', ['0;1']),
    spec('h = 0 : K seul', 0, {**V3V, 'h': 0}, 'correct', ['0']),
    spec('h = 1 : L oublié (½ point)', 0, {**V3V, 'h': 1}, 'unoptimal_form', ['0']),
    spec('h = 0 : point décalé coché', 0, {**V3V, 'h': 0}, 'incorrect', ['0;2']),
    spec('h = 0 : L décalé coché', 0, {**V3V, 'h': 0}, 'incorrect', ['0;1']),
]

# =============================================================================================
# V4 — 33be404b : quels points sont sur la droite d ? (TSG2-31)
# =============================================================================================

REPR = ('$$\\begin{cases}x=' + lin('x0', 'u1') + '\\\\y=' + lin('y0', 'u2') + '\\\\z='
        + lin('z0', 'u3') + '\\end{cases}\\quad(t\\in\\mathbb{R})$$')
# K sur d (t = tk) ; L sur d si h = 1, sinon décalé de 1 en x ; R décalé de 1 en x ; S décalé de
# 1 en y. L'équation en z (u3 ≠ 0) donne t, entier ; la coordonnée décalée échoue.
V4_VARS = [var('x0', '-5..5'), var('y0', '-5..5'), var('z0', '-5..5'), var('u1', '-4..4'),
           var('u2', '-4..4'), var('u3', '1..4;±'), var('h', '0..1')]
DEC4 = {'k': (0, 0), 'l': ('1-h', 0), 'r': (1, 0), 's': (0, 1)}
for nom in ('k', 'l', 'r', 's'):
    V4_VARS.append(var('t' + nom, '-3..3!0'))
    V4_VARS += [var(nom + 'x', '{{eval:x0+t' + nom + '*u1+(' + str(DEC4[nom][0]) + ')}}'),
                var(nom + 'y', '{{eval:y0+t' + nom + '*u2+(' + str(DEC4[nom][1]) + ')}}'),
                var(nom + 'z', '{{eval:z0+t' + nom + '*u3}}')]


def sur_d(nom, lettre):
    return ('$' + lettre + '$ : l\'équation en $z$ donne $t={{t' + nom + '}}$, et $x$, $y$ '
            'conviennent ($' + '{{x0}}+{{u1;()}}\\times{{t' + nom + ';()}}={{' + nom + 'x}}$, '
            '${{y0}}+{{u2;()}}\\times{{t' + nom + ';()}}={{' + nom + 'y}}$) : $' + lettre
            + '\\in d$.')


def pas_sur_d(nom, lettre, c, depart, u):
    return ('$' + lettre + '$ : l\'équation en $z$ donne $t={{t' + nom + '}}$, mais alors $' + c
            + '={{' + depart + '}}+{{' + u + ';()}}\\times{{t' + nom + ';()}}={{eval:' + depart
            + '+t' + nom + '*' + u + '}}$, et non ${{' + nom + c + '}}$ : $' + lettre
            + '\\notin d$.')


V4 = variation(
    REPERE_ON + 'on considère la droite $d$ de représentation paramétrique ' + REPR + '\n\n'
    'Parmi les points suivants, lesquels appartiennent à $d$ ? Coche toutes les bonnes '
    'réponses.\n\n' + choix_multiple([pt3(n, lettre(j)) for j, n in enumerate('klrs')]),
    V4_VARS + [var('pm', '0..3')],
    [case('0{{if:h==1|;1|}}')],
    ['Un point est sur $d$ quand un même réel $t$ vérifie les trois équations : on trouve $t$ '
     'avec une équation, puis on vérifie les deux autres.',
     sur_d('k', lettre(0)),
     '{{if:h==1|' + sur_d('l', lettre(1)) + '|' + pas_sur_d('l', lettre(1), 'x', 'x0', 'u1')
     + '}}',
     pas_sur_d('r', lettre(2), 'x', 'x0', 'u1'),
     pas_sur_d('s', lettre(3), 'y', 'y0', 'u2'),
     'Les points de $d$ : $' + PRIMAIRE + '{ ' + lettre(0) + '{{if:h==1|\\text{ et }'
     + lettre(1) + '|}} }$.'],
    'Pour chaque point, trouve $t$ avec une des équations, puis vérifie que ce même $t$ convient '
    'pour les deux autres coordonnées.',
    ['u1 != 0 || u2 != 0']
    # Paramètres tous différents : un leurre n'est pas un point juste décalé de 1
    + ['t' + a + ' != t' + b for a, b in itertools.combinations('klrs', 2)],
)

V4V = {'x0': 1, 'y0': -2, 'z0': 0, 'u1': 3, 'u2': 0, 'u3': -1, 'tk': 1, 'tl': -2, 'tr': 2,
       'ts': -1, 'pm': 2}
V4_SPECS = [
    spec('h = 1 : K et L', 0, {**V4V, 'h': 1}, 'correct', ['0;1']),
    spec('h = 0 : K seul', 0, {**V4V, 'h': 0}, 'correct', ['0']),
    spec('h = 0 : R (deux équations sur trois) coché', 0, {**V4V, 'h': 0}, 'incorrect', ['0;2']),
    spec('h = 1 : L oublié (½ point)', 0, {**V4V, 'h': 1}, 'unoptimal_form', ['0']),
]

# =============================================================================================
# V5 — 2b240d8c : vecteur orthogonal à deux vecteurs ; vecteurs normaux à (ABC) (TSG2-24, 43)
# =============================================================================================

ERR_UN_DONNE = ('C\'est un des vecteurs donnés : il n\'est pas orthogonal à lui-même. Cherche '
                '$\\vec{n}$ tel que $\\vec{n}\\cdot\\vec{u}=0$ et $\\vec{n}\\cdot\\vec{v}=0$.')
ERR_UN_SEUL = ('Ton vecteur est orthogonal à $\\vec{u}$, mais pas à $\\vec{v}$ : vérifie les '
               'deux produits scalaires.')

V5A = variation(
    REPERE_ON + 'on considère les vecteurs non colinéaires ' + vecteur('\\vec{u}', VP) + ' et '
    + vecteur('\\vec{v}', VQ) + '.\n\n'
    'Donne un vecteur non nul orthogonal à la fois à $\\vec{u}$ et à $\\vec{v}$ : $?$',
    [var('p1', '-3..3'), var('p2', '-3..3'), var('p3', '-3..3'), var('q1', '-3..3'),
     var('q2', '-3..3'), var('q3', '-3..3')]
    + produit_vectoriel('c', VP, VQ) + simplifie('n', 'c')
    + [var('o1', '{{eval:p2}}'), var('o2', '{{eval:-p1}}')],
    [case('({{n1}};{{n2}};{{n3}})', [
        erreur('({{p1}};{{p2}};{{p3}})', ERR_UN_DONNE, 'Vecteur u donné'),
        erreur('({{q1}};{{q2}};{{q3}})', ERR_UN_DONNE, 'Vecteur v donné'),
        erreur('({{o1}};{{o2}};0)', ERR_UN_SEUL, 'Orthogonal à u seulement'),
    ])],
    ['On cherche $\\vec{n}\\begin{pmatrix}a\\\\b\\\\c\\end{pmatrix}$ avec $\\vec{n}\\cdot\\vec{u}'
     '=0$ et $\\vec{n}\\cdot\\vec{v}=0$ : ${{p1}}a+({{p2}})b+({{p3}})c=0$ et ${{q1}}a'
     '+({{q2}})b+({{q3}})c=0$.',
     'En fixant une coordonnée et en résolvant, on trouve par exemple $' + PRIMAIRE
     + '{ \\vec{n}\\begin{pmatrix}{{n1}}\\\\{{n2}}\\\\{{n3}}\\end{pmatrix} }$ (tout vecteur '
     'colinéaire non nul convient).'],
    'Écris les deux conditions $\\vec{n}\\cdot\\vec{u}=0$ et $\\vec{n}\\cdot\\vec{v}=0$ avec '
    '$\\vec{n}(a\\,;\\,b\\,;\\,c)$, fixe une des inconnues et résous le système.',
    ['abs(c1)+abs(c2)+abs(c3) > 0', 'abs(c1/g) <= 6', 'abs(c2/g) <= 6', 'abs(c3/g) <= 6',
     'abs(p1)+abs(p2) > 0', 'o1*q1+o2*q2 != 0'],
)

# n = AB × AC simplifié, normal ; -2n normal ; AB dans le plan ; w = (p2 ; −p1 ; 0) orthogonal à
# AB seulement (w·AC ≠ 0)
V5B_VARS = ([var('ax', '-3..3'), var('ay', '-3..3'), var('az', '-3..3'), var('p1', '-2..2'),
             var('p2', '-2..2'), var('p3', '-2..2'), var('q1', '-2..2'), var('q2', '-2..2'),
             var('q3', '-2..2')]
            + produit_vectoriel('c', VP, VQ) + simplifie('n', 'c')
            + [var('bx', '{{eval:ax+p1}}'), var('by', '{{eval:ay+p2}}'),
               var('bz', '{{eval:az+p3}}'), var('cx', '{{eval:ax+q1}}'),
               var('cy', '{{eval:ay+q2}}'), var('cz', '{{eval:az+q3}}'),
               var('o1', '{{eval:p2}}'), var('o2', '{{eval:-p1}}')])


def vect_choix(nom, cs):
    return ('$\\vec{' + nom + '}\\begin{pmatrix}' + cs[0] + '\\\\' + cs[1] + '\\\\' + cs[2]
            + '\\end{pmatrix}$')


def test_normal(nom, cs, verdict):
    ab = '{{eval:' + '+'.join('(' + c + ')*' + p for c, p in zip(cs, VP)) + '}}'
    ac = '{{eval:' + '+'.join('(' + c + ')*' + q for c, q in zip(cs, VQ)) + '}}'
    return ('$\\vec{' + nom + '}\\cdot\\overrightarrow{AB}=' + ab + '$ et $\\vec{' + nom
            + '}\\cdot\\overrightarrow{AC}=' + ac + '$ : ' + verdict)


NOMS_V = ('n', 'm', 'r', 'w')
W_N = ('{{n1}}', '{{n2}}', '{{n3}}')
W_2N = ('{{eval:-2*n1}}', '{{eval:-2*n2}}', '{{eval:-2*n3}}')
W_AB = ('{{p1}}', '{{p2}}', '{{p3}}')
W_W = ('{{o1}}', '{{o2}}', '0')
CS_N, CS_2N, CS_AB, CS_W = (('n1', 'n2', 'n3'), ('-2*n1', '-2*n2', '-2*n3'), VP,
                            ('o1', 'o2', '0'))

V5B = variation(
    REPERE_ON + 'on considère les points ' + point('A', PT_A) + ', ' + point('B', PT_B) + ' et '
    + point('C', PT_C) + ', qui ne sont pas alignés.\n\n'
    'Parmi les vecteurs suivants, lesquels sont normaux au plan $(ABC)$ ? Coche toutes les '
    'bonnes réponses.\n\n'
    + choix_multiple([vect_choix(lettre(j, NOMS_V), w) for j, w in
                      enumerate((W_N, W_2N, W_AB, W_W))]),
    V5B_VARS + [var('pm', '0..3')],
    [case('0;1')],
    ['Un vecteur est normal à $(ABC)$ quand il est orthogonal à $\\overrightarrow{AB}'
     '\\begin{pmatrix}{{p1}}\\\\{{p2}}\\\\{{p3}}\\end{pmatrix}$ et à $\\overrightarrow{AC}'
     '\\begin{pmatrix}{{q1}}\\\\{{q2}}\\\\{{q3}}\\end{pmatrix}$, deux vecteurs non colinéaires '
     'du plan.',
     test_normal(lettre(0, NOMS_V), CS_N, 'normal.'),
     test_normal(lettre(1, NOMS_V), CS_2N, 'normal ($\\vec{' + lettre(1, NOMS_V) + '}=-2\\,\\vec{'
                 + lettre(0, NOMS_V) + '}$).'),
     test_normal(lettre(2, NOMS_V), CS_AB, 'pas normal (c\'est $\\overrightarrow{AB}$, un vecteur '
                 'du plan).'),
     test_normal(lettre(3, NOMS_V), CS_W, 'orthogonal à $\\overrightarrow{AB}$ seulement, pas '
                 'normal.'),
     'Les vecteurs normaux : $' + PRIMAIRE + '{ \\vec{' + lettre(0, NOMS_V) + '}\\text{ et }\\vec{'
     + lettre(1, NOMS_V) + '} }$.'],
    'Un vecteur normal au plan est orthogonal à deux vecteurs non colinéaires du plan, '
    '$\\overrightarrow{AB}$ et $\\overrightarrow{AC}$ : calcule les deux produits scalaires.',
    ['abs(c1)+abs(c2)+abs(c3) > 0', 'abs(c1/g) <= 4', 'abs(c2/g) <= 4', 'abs(c3/g) <= 4',
     'abs(p1)+abs(p2) > 0', 'o1*q1+o2*q2 != 0'],
)

# u(1 ; 1 ; 0), v(0 ; 1 ; 2) : n = (2 ; −2 ; 1) ; o = (1 ; −1 ; 0), o·v = −1 ≠ 0
V5V = {'p1': 1, 'p2': 1, 'p3': 0, 'q1': 0, 'q2': 1, 'q3': 2}
V5_SPECS = [
    spec('v2 : (2 ; −2 ; 1)', 0, V5V, 'correct', ['(2;-2;1)']),
    spec('v2 : multiple', 0, V5V, 'correct', ['(-4;4;-2)']),
    spec('v2 : u donné', 0, V5V, 'incorrect', ['(1;1;0)'], ERR_UN_DONNE),
    spec('v2 : orthogonal à u seulement', 0, V5V, 'incorrect', ['(1;-1;0)'], ERR_UN_SEUL),
    spec('v3 : n et −2n', 1, {**V5V, 'ax': 0, 'ay': 1, 'az': -1, 'pm': 3}, 'correct', ['0;1']),
    spec('v3 : −2n oublié (½ point)', 1, {**V5V, 'ax': 0, 'ay': 1, 'az': -1}, 'unoptimal_form',
         ['0']),
    spec('v3 : w orthogonal à AB coché', 1, {**V5V, 'ax': 0, 'ay': 1, 'az': -1}, 'incorrect',
         ['0;1;3']),
]

# =============================================================================================
# V6 — eae25eba : projeté orthogonal sur (AB) (TSG2-25)
# =============================================================================================

ERR_H_A = ('Ce sont les coordonnées de $A$ : le projeté $H$ est le point de $\\left( AB \\right)$ tel que '
           '$\\overrightarrow{MH}\\cdot\\overrightarrow{AB}=0$.')
ERR_H_K = ('Tu as donné le paramètre $k$ de $H$ : ses coordonnées sont celles de '
           '$A+k\\,\\overrightarrow{AB}$.')
ERR_H_M = 'Ce sont les coordonnées de $M$ : on cherche son projeté $H$ sur $\\left( AB \\right)$.'

V6_VARS = [var('ax', '-4..4'), var('ay', '-4..4'), var('az', '-4..4'), var('u1', '1..3;±'),
           var('u2', '-2..2'), var('u3', '-2..2'), var('s', '1..2;±'), var('r', '1..2;±'),
           var('sel', '0..1'), var('w1', '{{eval:r*(1-sel)*u2}}'),
           var('w2', '{{eval:r*((sel-1)*u1+sel*u3)}}'), var('w3', '{{eval:-r*sel*u2}}'),
           var('bx', '{{eval:ax+u1}}'), var('by', '{{eval:ay+u2}}'), var('bz', '{{eval:az+u3}}'),
           var('hx', '{{eval:ax+s*u1}}'), var('hy', '{{eval:ay+s*u2}}'),
           var('hz', '{{eval:az+s*u3}}'), var('mx', '{{eval:hx+w1}}'),
           var('my', '{{eval:hy+w2}}'), var('mz', '{{eval:hz+w3}}')]

V6 = variation(
    REPERE_ON + 'on considère les points ' + point('A', PT_A) + ', ' + point('B', PT_B) + ' et '
    + point('M', ('mx', 'my', 'mz')) + '.\n\n'
    'Détermine les coordonnées du projeté orthogonal $H$ de $M$ sur la droite $(AB)$.\n\n'
    '$H(?\\,;\\,?\\,;\\,?)$',
    V6_VARS,
    [case('{{h' + c + '}}', [erreur('{{a' + c + '}}', ERR_H_A, 'A donné'),
                             erreur('{{s}}', ERR_H_K, 'Paramètre donné'),
                             erreur('{{m' + c + '}}', ERR_H_M, 'M donné')])
     for c in 'xyz'],
    ['$\\overrightarrow{AB}\\begin{pmatrix}{{u1}}\\\\{{u2}}\\\\{{u3}}\\end{pmatrix}$ ; $H$ est '
     'sur $(AB)$ : $\\overrightarrow{AH}=k\\,\\overrightarrow{AB}$, et $\\overrightarrow{MH}\\cdot'
     '\\overrightarrow{AB}=0$.',
     'La condition s\'écrit $\\overrightarrow{AM}\\cdot\\overrightarrow{AB}-k\\,AB^2=0$ ; ici '
     '$\\overrightarrow{AM}\\cdot\\overrightarrow{AB}={{eval:(mx-ax)*u1+(my-ay)*u2+(mz-az)*u3}}$ '
     'et $AB^2={{eval:u1^2+u2^2+u3^2}}$, donc $k={{s}}$.',
     '$H=A' + coefp('s') + '\\overrightarrow{AB}$ : $' + PRIMAIRE
     + '{ H({{hx}}\\,;\\,{{hy}}\\,;\\,{{hz}}) }$.'],
    'Écris $H=A+k\\,\\overrightarrow{AB}$, puis traduis $\\overrightarrow{MH}\\cdot'
    '\\overrightarrow{AB}=0$ : c\'est une équation en $k$.',
    ['abs(w1)+abs(w2)+abs(w3) > 0'],
)

# A(1 ; 0 ; −1), AB(1 ; 2 ; −1), k = 2 : H(3 ; 4 ; −3) ; sel = 0, r = 1 : w = (2 ; −1 ; 0),
# M(5 ; 3 ; −3)
V6V = {'ax': 1, 'ay': 0, 'az': -1, 'u1': 1, 'u2': 2, 'u3': -1, 's': 2, 'r': 1, 'sel': 0}
V6_SPECS = [
    spec('H(3 ; 4 ; −3)', 0, V6V, 'correct', ['3', '4', '-3']),
    spec('A donné', 0, V6V, 'incorrect', ['1', '0', '-1'], ERR_H_A),
    spec('M donné', 0, V6V, 'incorrect', ['5', '3', '-3'], ERR_H_M),
]

# =============================================================================================
# V7 — 4f056eb3 : distance à une droite par le minimum de AM(t)² (TSG2-26)
# =============================================================================================

# d : P + t·u ; A = P + t0·u + w, w ⟂ u (même construction que v0) :
# AM(t)² = |u|²t² − 2t0|u|²t + t0²|u|² + |w|², minimum en t0, distance √|w|²
ERR_T_SIGNE = ('Le sommet d\'un trinôme $a t^2 + b t + c$ est en $t=-\\dfrac{b}{2a}$ : vérifie le '
               'signe.')
ERR_DIST_CARRE = 'C\'est le carré de la distance : prends sa racine carrée.'
ERR_AM0 = ('Tu as calculé $AM_{0}$ (en $t = 0$) : la distance est la valeur minimale de $AM_{t}$, '
           'atteinte au sommet.')

V7_VARS = [var('px', '-2..2'), var('py', '-2..2'), var('pz', '-2..2'), var('u1', '1..2;±'),
           var('u2', '-2..2'), var('u3', '-2..2'), var('t0', '1..2;±'), var('r', '1..2;±'),
           var('sel', '0..1'), var('w1', '{{eval:r*(1-sel)*u2}}'),
           var('w2', '{{eval:r*((sel-1)*u1+sel*u3)}}'), var('w3', '{{eval:-r*sel*u2}}'),
           var('nu', '{{eval:u1^2+u2^2+u3^2}}'), var('nw', '{{eval:w1^2+w2^2+w3^2}}'),
           var('ka', '{{eval:nu}}'), var('kb', '{{eval:-2*t0*nu}}'),
           var('kc', '{{eval:t0^2*nu+nw}}'),
           var('ax', '{{eval:px+t0*u1+w1}}'), var('ay', '{{eval:py+t0*u2+w2}}'),
           var('az', '{{eval:pz+t0*u3+w3}}')]

V7 = variation(
    REPERE_ON + 'on considère le point ' + point('A', PT_A) + ' et la droite $d$ de '
    'représentation paramétrique $$\\begin{cases}x=' + lin('px', 'u1') + '\\\\y='
    + lin('py', 'u2') + '\\\\z=' + lin('pz', 'u3') + '\\end{cases}\\quad(t\\in\\mathbb{R})$$\n\n'
    'Pour tout réel $t$, on note $M_t$ le point de $d$ de paramètre $t$. On admet que '
    '$AM_t^2={{ka}}t^2{{kb;+}}t{{kc;+}}$.\n\n'
    'Donne la valeur de $t$ pour laquelle $AM_t^2$ est minimal, puis la distance du point $A$ à '
    'la droite $d$ (valeur exacte).\n\n$t=?$ et distance : $?$',
    V7_VARS,
    [case('{{t0}}', [erreur('{{eval:-t0}}', ERR_T_SIGNE, 'Signe de −b/(2a)')]),
     case('{{eval:sqrt(nw)}}', [erreur('{{nw}}', ERR_DIST_CARRE, 'Distance au carré'),
                                erreur('{{eval:sqrt(kc)}}', ERR_AM0, 'AM en t = 0')])],
    ['$AM_t^2$ est un trinôme en $t$ de coefficient ${{ka}}>0$ devant $t^2$ : il est minimal au '
     'sommet, en $t=-\\dfrac{b}{2a}=-\\dfrac{{{kb}}}{2\\times{{ka}}}=' + PRIMAIRE + '{ {{t0}} }$.',
     'Le minimum vaut ${{ka}}\\times{{t0;()}}^2{{kb;+}}\\times{{t0;()}}{{kc;+}}={{nw}}$ : la '
     'distance de $A$ à $d$, plus petite distance $AM_t$, est sa racine carrée, $' + PRIMAIRE
     + '{ {{eval:sqrt(nw)}} }$.'],
    'La distance de $A$ à $d$ est la plus petite des distances $AM_t$ : cherche le minimum du '
    'trinôme $AM_t^2$, atteint à son sommet.',
    ['abs(w1)+abs(w2)+abs(w3) > 0'],
)

# d : P(0 ; 1 ; −1), u(1 ; 2 ; −1) ; t0 = 1 ; sel = 0, r = 1 : w = (2 ; −1 ; 0), |w|² = 5 ;
# |u|² = 6 : AM_t² = 6t² − 12t + 11, A(3 ; 2 ; −2)
V7V = {'px': 0, 'py': 1, 'pz': -1, 'u1': 1, 'u2': 2, 'u3': -1, 't0': 1, 'r': 1, 'sel': 0}
V7_SPECS = [
    spec('t = 1, distance √5', 0, V7V, 'correct', ['1', '\\sqrt{5}']),
    spec('t = −1 (signe)', 0, V7V, 'incorrect', ['-1', '\\sqrt{5}'], ERR_T_SIGNE),
    spec('distance au carré', 0, V7V, 'incorrect', ['1', '5'], ERR_DIST_CARRE),
    spec('AM en t = 0', 0, V7V, 'incorrect', ['1', '\\sqrt{11}'], ERR_AM0),
]

# =============================================================================================
# V8 — aaa16821 : volume d'un tétraèdre quelconque (TSG2-50)
# =============================================================================================

# ABC rectangle en A (AB = u, AC = w, w ⟂ u : construction de v0) ; n = (u × w)/g normal ;
# D = A + α·u + h·n. Hauteur |h|·‖n‖ = |h|·‖u‖‖w‖/g, aire ‖u‖‖w‖/2 :
# V = |h|·‖u‖²‖w‖²/(6g), rationnel.
ERR_TIERS = ('Le volume d\'un tétraèdre est $\\dfrac{1}{3}\\times\\text{aire de la base}\\times'
             '\\text{hauteur}$ : n\'oublie pas le $\\dfrac{1}{3}$.')
ERR_DEMI = ('L\'aire d\'un triangle rectangle est $\\dfrac{AB\\times AC}{2}$ : n\'oublie pas de '
            'diviser par $2$.')
ERR_HAUTEUR_CARRE = ('Tu as pris le carré de la distance de $D$ au plan : la hauteur est cette '
                     'distance elle-même.')

V8_VARS = [var('ax', '-2..2'), var('ay', '-2..2'), var('az', '-2..2'), var('u1', '1..2;±'),
           var('u2', '-1..1'), var('u3', '-1..1'), var('r', '1'), var('sel', '0..1'),
           var('w1', '{{eval:r*(1-sel)*u2}}'), var('w2', '{{eval:r*((sel-1)*u1+sel*u3)}}'),
           var('w3', '{{eval:-r*sel*u2}}')]
V8_VARS += produit_vectoriel('c', ('u1', 'u2', 'u3'), ('w1', 'w2', 'w3')) + simplifie('n', 'c')
V8_VARS += [var('al', '0..1'), var('h', '1..2;±'),
            var('dd', '{{eval:-(n1*ax+n2*ay+n3*az)}}'),
            var('nu', '{{eval:u1^2+u2^2+u3^2}}'), var('nw', '{{eval:w1^2+w2^2+w3^2}}'),
            var('nn', '{{eval:n1^2+n2^2+n3^2}}'),
            var('bx', '{{eval:ax+u1}}'), var('by', '{{eval:ay+u2}}'), var('bz', '{{eval:az+u3}}'),
            var('cx', '{{eval:ax+w1}}'), var('cy', '{{eval:ay+w2}}'), var('cz', '{{eval:az+w3}}'),
            var('dx', '{{eval:ax+al*u1+h*n1}}'), var('dy', '{{eval:ay+al*u2+h*n2}}'),
            var('dz', '{{eval:az+al*u3+h*n3}}')]

EQ_V8, VARS_EQ_V8 = equation_propre(VN, 'dd')
V8_VARS += VARS_EQ_V8

V8 = variation(
    REPERE_ON + 'on considère les points ' + point('A', PT_A) + ', ' + point('B', PT_B) + ', '
    + point('C', PT_C) + ' et ' + point('D', ('dx', 'dy', 'dz')) + '.\n\n'
    'On admet que le triangle $ABC$ est rectangle en $A$ et que le plan $(ABC)$ a pour équation '
    '$' + EQ_V8 + '$.\n\n'
    'Calcule le volume du tétraèdre $ABCD$ (valeur exacte).\n\nVolume : $?$',
    V8_VARS,
    [case('{{eval:abs(h)*nu*nw/(6*g)}}', [
        erreur('{{eval:abs(h)*nu*nw/(2*g)}}', ERR_TIERS, '1/3 oublié'),
        erreur('{{eval:abs(h)*nu*nw/(3*g)}}', ERR_DEMI, 'Aire sans le 1/2'),
        erreur('{{eval:sqrt(nu*nw)/6*h^2*nn}}', ERR_HAUTEUR_CARRE, 'Distance au carré'),
    ])],
    ['Aire de la base : $AB={{eval:sqrt(nu)}}$, $AC={{eval:sqrt(nw)}}$, donc '
     '$\\mathcal{A}=\\dfrac{AB\\times AC}{2}={{eval:sqrt(nu*nw)/2}}$.',
     'Hauteur : la distance de $D$ au plan $(ABC)$, '
     '$\\dfrac{\\lvert {{n1}}\\times{{dx;()}}+{{n2;()}}\\times{{dy;()}}+{{n3;()}}\\times{{dz;()}}'
     '{{dd;+}}\\rvert}{ {{eval:sqrt(nn)}} }={{eval:abs(h)*sqrt(nn)}}$.',
     '$V=\\dfrac{1}{3}\\times\\mathcal{A}\\times h=\\dfrac{1}{3}\\times{{eval:sqrt(nu*nw)/2}}'
     '\\times{{eval:abs(h)*sqrt(nn)}}=' + PRIMAIRE + '{ {{eval:abs(h)*nu*nw/(6*g)}} }$.'],
    'Le volume vaut $\\dfrac{1}{3}\\times\\text{aire de }ABC\\times\\text{hauteur}$, et la '
    'hauteur est la distance de $D$ au plan $(ABC)$ : utilise son équation.',
    ['abs(w1)+abs(w2)+abs(w3) > 0'],
)

# A(1 ; 0 ; −1), u(1 ; 1 ; 0), sel = 0 : w = (1 ; −1 ; 0) ; u × w = (0 ; 0 ; −2), g = 2,
# n = (0 ; 0 ; −1) ; d = −1 : plan −z − 1 = 0 ; α = 0, h = 2 : D(1 ; 0 ; −3)
# ‖u‖² = ‖w‖² = 2 : V = 2·2·2/(6·2) = 2/3
V8V = {'ax': 1, 'ay': 0, 'az': -1, 'u1': 1, 'u2': 1, 'u3': 0, 'r': 1, 'sel': 0, 'al': 0,
       'h': 2}
V8_SPECS = [
    spec('V = 2/3', 0, V8V, 'correct', ['\\frac{2}{3}']),
    spec('1/3 oublié', 0, V8V, 'incorrect', ['2'], ERR_TIERS),
    spec('aire sans le 1/2', 0, V8V, 'incorrect', ['\\frac{4}{3}'], ERR_DEMI),
]

# =============================================================================================
# V9 — 31b49cdf : distance à un plan, valeur approchée au centième (TSG2-27)
# =============================================================================================

ERR_ABS = 'Une distance est positive : la formule prend la valeur absolue du numérateur.'
ERR_SANS_NORME = ('Divise par la norme du vecteur normal, $\\sqrt{a^2+b^2+c^2}$ : '
                  '$\\dfrac{\\lvert ax_M+by_M+cz_M+d\\rvert}{\\sqrt{a^2+b^2+c^2}}$.')
ERR_NORME_CARRE = ('Tu as divisé par $a^2 + b^2 + c^2$ : on divise par la norme '
                   '$\\sqrt{a^2+b^2+c^2}$.')

ARRONDI = '{{eval:round(100*abs(sv)/sqrt(nn))/100;d}}'
V9 = variation(
    REPERE_ON + 'on considère le plan $\\mathcal{P}$ d\'équation ' + '$' + plan(('a', 'b', 'c'),
                                                                                  'd') + '$'
    + ' et le point ' + point('M', ('mx', 'my', 'mz')) + '.\n\n'
    'Calcule la distance du point $M$ au plan $\\mathcal{P}$, arrondie au centième.\n\n'
    'Distance : $\\approx ?$',
    [var('a', '1..5;±'), var('b', '1..5;±'), var('c', '1..5;±'), var('d', '-6..6'),
     var('mx', '-6..6'), var('my', '-6..6'), var('mz', '-6..6'),
     var('sv', '{{eval:a*mx+b*my+c*mz+d}}'), var('nn', '{{eval:a^2+b^2+c^2}}')],
    [case(ARRONDI, [
        erreur('{{eval:round(100*sv/sqrt(nn))/100;d}}', ERR_ABS, 'Valeur absolue oubliée'),
        erreur('{{eval:abs(sv)}}', ERR_SANS_NORME, 'Sans diviser par la norme'),
        erreur('{{eval:round(100*abs(sv)/nn)/100;d}}', ERR_NORME_CARRE, 'Divisé par la norme au carré'),
    ], precision={'type': 'decimal', 'digits': 2}, acceptDecimal=True)],
    ['La distance de $M$ au plan d\'équation $ax+by+cz+d=0$ est $\\dfrac{\\lvert ax_M+by_M+cz_M+d'
     '\\rvert}{\\sqrt{a^2+b^2+c^2}}$.',
     'Ici : $\\dfrac{\\lvert {{a}}\\times{{mx;()}}+{{b;()}}\\times{{my;()}}+{{c;()}}\\times'
     '{{mz;()}}{{d;+}}\\rvert}{\\sqrt{ {{nn}} }}=\\dfrac{ {{eval:abs(sv)}} }{\\sqrt{ {{nn}} }}'
     '\\approx' + PRIMAIRE + '{ ' + ARRONDI + ' }$.'],
    'Utilise la formule de la distance d\'un point à un plan : valeur absolue de '
    '$ax_M+by_M+cz_M+d$, divisée par la norme du vecteur normal.',
    ['sv < 0 || sv > 0', 'abs(sv) > 1'],
)

# 2x − y + 3z + 1 = 0, M(1 ; 4 ; −2) : 2 − 4 − 6 + 1 = −7, √14 ≈ 3,7417 : 7/√14 ≈ 1,87
V9V = {'a': 2, 'b': -1, 'c': 3, 'd': 1, 'mx': 1, 'my': 4, 'mz': -2}
V9_SPECS = [
    spec('≈ 1,87', 0, V9V, 'correct', ['1,87']),
    spec('valeur absolue oubliée', 0, V9V, 'incorrect', ['-1,87'], ERR_ABS),
    spec('sans diviser par la norme', 0, V9V, 'incorrect', ['7'], ERR_SANS_NORME),
    spec('divisé par 14', 0, V9V, 'incorrect', ['0,5'], ERR_NORME_CARRE),
]

ajouter('d192da3e', [V1A, V1B], V1_SPECS)
ajouter('d6938108', [V2], V2_SPECS)
ajouter('ac94a453', [V3], V3_SPECS)
ajouter('33be404b', [V4], V4_SPECS)
ajouter('2b240d8c', [V5A, V5B], V5_SPECS)
ajouter('eae25eba', [V6], V6_SPECS)
ajouter('4f056eb3', [V7], V7_SPECS)
ajouter('aaa16821', [V8], V8_SPECS)
ajouter('31b49cdf', [V9], V9_SPECS)
