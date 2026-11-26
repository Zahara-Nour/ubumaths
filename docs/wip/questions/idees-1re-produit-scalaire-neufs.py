"""Écrit les cinq modèles neufs du chantier idees-1re-produit-scalaire dans
scripts/questions/idees-1re-produit-scalaire-neufs/.

Phase 0 : David, le 2026-11-26, « je valide tout » (page à cocher
https://claude.ai/artifact/Pq3pagc1h93TH99Lo5hgze, fiches
docs/wip/idees-1re-produit-scalaire-fiches.md) : N1 à N5 comme décrits, F5 avec l'étape
« AB·HC = 0 » gardée.

Rangement (migration générée après la création en brouillon), nœuds « Géométrie > Produit
scalaire > … » ; niveaux numérotés relevés en prod le 2026-11-26 (expressions : 1 à 5, 9, 10 ;
angles et longueurs : 1 à 8 ; propriétés : 1 à 7) :
- N1 parallélogramme : expressions du produit scalaire, 1SPE-412, niveau 6 ;
- N2 figure à points espacés : expressions du produit scalaire, 1SPE-310, niveau 7 ;
- N3 quadrillage : expressions du produit scalaire, 1SPE-310, niveau 8 ;
- N4 aire d'un triangle : angles et longueurs, 1SPE-320, niveau 9 ;
- N5 droite d'Euler : propriétés, 1SPE-436 (point sur la notion « Produit scalaire »), niveau 8.

Règles suivies (couvrir-un-niveau.md § 5) : erreurs prévues par case (de vraies erreurs d'élèves,
pas de valeur inventée), chacune avec sa spec `incorrect` qui nomme son message ; un coup de pouce
par variation, qui ne donne jamais la réponse. Valeurs exactes par `eval:` (cosinus remarquables et
racines exactes, vérifié par sonde le 2026-11-26).

Ni theme, ni domain, ni subdomain, ni id : create-questions --publier écrit l'id.

Usage : python3 docs/wip/questions/idees-1re-produit-scalaire-neufs.py scripts/questions/idees-1re-produit-scalaire-neufs
"""
import importlib.util
import json
import os
import sys

_chemin = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       'idees-1re-produit-scalaire-commun.py')
_spec = importlib.util.spec_from_file_location('commun', _chemin)
C = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(C)
spec, var, erreur, case, variation = C.spec, C.var, C.erreur, C.case, C.variation
bloc, si, choisir, vec, ps, r2 = C.bloc, C.si, C.choisir, C.vec, C.ps, C.r2
PRIMAIRE, REPERE = C.PRIMAIRE, C.REPERE

DOSSIER = sys.argv[1]
NOEUD = 'Géométrie > Produit scalaire > '


def modele(title, description, level, delay, variations, specs, noeud, point):
    return {'rangement': {'noeud': NOEUD + noeud, 'point': point}, 'title': title,
            'description': description, 'grades': ['1_SPE'], 'level': level, 'delay': delay,
            'status': 'draft', 'shared': {'blankDefaults': {'acceptDecimal': True}},
            'options': {'constraints': {'spaces': 'off'}},
            'variations': variations, 'testSpecs': specs}


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


def P(texte):
    return PRIMAIRE + '{ ' + texte + ' }'


# =============================================================================================
# N1 (F1) — Produit scalaire dans un parallélogramme (1G10-1, cas 2). Point 1SPE-412.
# u = AB, v = AD, u·v = AB × AD × cos(BAD) = R. Tous les produits de côtés valent R ou −R.
# =============================================================================================

COS_T = choisir('j', ['\\dfrac{\\sqrt{3}}{2}', '\\dfrac{\\sqrt{2}}{2}', '\\dfrac{1}{2}'])
DEG_T = '{{t}}^\\circ'
RAD_T = choisir('j', ['\\dfrac{\\pi}{6}', '\\dfrac{\\pi}{4}', '\\dfrac{\\pi}{3}'])
SUP_DEG = '{{eval:180-t}}^\\circ'
SUP_RAD = choisir('j', ['\\dfrac{5\\pi}{6}', '\\dfrac{3\\pi}{4}', '\\dfrac{2\\pi}{3}'])
VARS_PARA = [var('a', '3..6'), var('b', '4..8'), var('j', '0..2'), var('t', 'eval:30+15*j'),
             var('R', 'eval:a*b*cos(t*\\pi/180)'),
             var('Xd', '{{eval:round(1000*a*cos(t*\\pi/180))/1000}}'),
             var('Yd', '{{eval:round(1000*a*sin(t*\\pi/180))/1000}}')]
COND_PARA = ['a != b']


def enonce_para(angle_tex, question):
    figure = bloc('figure',
                  'fenetre: -1 ; ' + r2('b+Xd+1') + ' ; -1 ; ' + r2('Yd+1'),
                  'taille: moyenne',
                  'description: Parallélogramme ABCD ; l\'angle en A est marqué.',
                  '---',
                  'A = point(0, 0, etiquette="bas-gauche")',
                  'B = point({{b}}, 0, etiquette="bas-droite")',
                  'D = point(' + r2('Xd') + ', ' + r2('Yd') + ', etiquette="haut-gauche")',
                  'C = point(' + r2('b+Xd') + ', ' + r2('Yd') + ', etiquette="haut-droite")',
                  'polygone(A, B, C, D)',
                  'angle(B, A, D)')
    return ('$ABCD$ est un parallélogramme tel que $AB={{b}}$, $AD={{a}}$ et $\\widehat{BAD}='
            + angle_tex + '$.\n\n' + figure + '\n\n' + question)


ERR_SANS_COS = 'Tu as multiplié les longueurs : il manque le cosinus de l\'angle entre les vecteurs.'
ERR_SINUS = 'Le produit scalaire utilise le cosinus de l\'angle, pas son sinus.'
ERR_ANGLE_A = ('Les vecteurs partent de ce sommet : l\'angle à prendre est celui du sommet, '
               'supplémentaire de $\\widehat{BAD}$ (deux angles consécutifs d\'un parallélogramme).')
ERR_SIGNE_PARA = ('Remplace chaque vecteur par un vecteur égal qui part de $A$ : un vecteur dans '
                  'l\'autre sens change le signe.')
HINT_COS = ('$\\vec{u}\\cdot\\vec{v}=\\|\\vec{u}\\|\\times\\|\\vec{v}\\|\\times\\cos(\\vec{u},'
            '\\vec{v})$ : l\'angle est celui des deux vecteurs placés au même point.')
HINT_SUP = ('Dans un parallélogramme, deux angles consécutifs sont supplémentaires : '
            '$\\widehat{ABC}=180^\\circ-\\widehat{BAD}$.')
HINT_EGAUX = ('Dans le parallélogramme, $' + vec('BC') + '=' + vec('AD') + '$ et $' + vec('DC')
              + '=' + vec('AB') + '$ : remplace chaque vecteur par un vecteur égal qui part de $A$.')

n1, n1s = [], []

# V1 : même origine, AB·AD
n1.append(variation(
    enonce_para(DEG_T, 'Calcule le produit scalaire $' + ps('AB', 'AD') + '$. Donne sa valeur '
                'exacte.\n\n$' + ps('AB', 'AD') + '=?$'),
    VARS_PARA,
    [case('{{R}}', [
        erreur('{{eval:a*b}}', ERR_SANS_COS, 'Cosinus oublié'),
        erreur('{{eval:a*b*sin(t*\\pi/180)}}', ERR_SINUS, 'Sinus au lieu du cosinus'),
        erreur('{{eval:-R}}', 'Les deux vecteurs partent de $A$ : l\'angle est $\\widehat{BAD}$, '
               'aigu, et son cosinus est positif.', 'Signe faux'),
    ])],
    ['$' + ps('AB', 'AD') + '=AB\\times AD\\times\\cos\\widehat{BAD}={{b}}\\times {{a}}\\times\\cos '
     + DEG_T + '$.',
     '$\\cos ' + DEG_T + '=' + COS_T + '$, donc $' + ps('AB', 'AD') + '=' + P('{{R}}') + '$.'],
    HINT_COS, COND_PARA))
V = {'a': 3, 'b': 5, 'j': 0}   # 15√3/2
n1s += [spec('AB = 5, AD = 3, 30° : 15√3/2', 0, V, 'correct', ['\\frac{15\\sqrt{3}}{2}']),
        spec('cosinus oublié : 15', 0, V, 'incorrect', ['15'], ERR_SANS_COS),
        spec('sinus : 15/2', 0, V, 'incorrect', ['\\frac{15}{2}'], ERR_SINUS),
        spec('signe faux', 0, V, 'incorrect', ['-\\frac{15\\sqrt{3}}{2}'],
             'Les deux vecteurs partent de $A$ : l\'angle est $\\widehat{BAD}$, aigu, et son '
             'cosinus est positif.')]
V = {'a': 4, 'b': 6, 'j': 2}   # 12
n1s += [spec('AB = 6, AD = 4, 60° : 12', 0, V, 'correct', ['12'])]

# V2 : au sommet B ou D (angle obtus) : BA·BC ou DA·DC = −R
PROD_V2 = choisir('w', [ps('BA', 'BC'), ps('DA', 'DC')])
SOMMET_V2 = choisir('w', ['\\widehat{ABC}', '\\widehat{ADC}'])
n1.append(variation(
    enonce_para(DEG_T, 'Calcule le produit scalaire $' + PROD_V2 + '$. Donne sa valeur exacte.'
                '\n\n$' + PROD_V2 + '=?$'),
    VARS_PARA + [var('w', '0..1')],
    [case('{{eval:-R}}', [
        erreur('{{R}}', ERR_ANGLE_A, 'Angle en A pris'),
        erreur('{{eval:a*b}}', ERR_SANS_COS, 'Cosinus oublié'),
        erreur('{{eval:-a*b*sin(t*\\pi/180)}}', ERR_SINUS, 'Sinus au lieu du cosinus'),
    ])],
    ['Les deux vecteurs partent du même sommet : l\'angle est $' + SOMMET_V2 + '$.',
     'Deux angles consécutifs d\'un parallélogramme sont supplémentaires : $' + SOMMET_V2
     + '=180^\\circ-' + DEG_T + '=' + SUP_DEG + '$.',
     '$' + PROD_V2 + '={{b}}\\times {{a}}\\times\\cos ' + SUP_DEG + '={{b}}\\times {{a}}\\times'
     '\\left(-' + COS_T + '\\right)=' + P('{{eval:-R}}') + '$.'],
    HINT_SUP, COND_PARA))
V = {'a': 4, 'b': 6, 'j': 1, 'w': 0}   # −12√2
n1s += [spec('BA·BC, 45° : −12√2', 1, V, 'correct', ['-12\\sqrt{2}']),
        spec('angle en A : 12√2', 1, V, 'incorrect', ['12\\sqrt{2}'], ERR_ANGLE_A),
        spec('cosinus oublié : 24', 1, V, 'incorrect', ['24'], ERR_SANS_COS)]
V = {'a': 3, 'b': 5, 'j': 0, 'w': 1}   # −15√3/2 ; sinus : −15/2
n1s += [spec('DA·DC, 30° : −15√3/2', 1, V, 'correct', ['-\\frac{15\\sqrt{3}}{2}']),
        spec('sinus : −15/2', 1, V, 'incorrect', ['-\\frac{15}{2}'], ERR_SINUS)]

# V3 et V4 : vecteurs bout à bout ou de sens opposés (degrés, puis radians). Produit n° w,
# signe (−1)^w : AB·BC, AB·CB, AD·DC, CD·AD, DA·BA, BA·AD.
PROD_V3 = choisir('w', [ps('AB', 'BC'), ps('AB', 'CB'), ps('AD', 'DC'), ps('CD', 'AD'),
                        ps('DA', 'BA'), ps('BA', 'AD')])
EGAL_V3 = choisir('w', [
    vec('BC') + '=' + vec('AD') + '$, donc $' + ps('AB', 'BC') + '=' + ps('AB', 'AD'),
    vec('CB') + '=-' + vec('AD') + '$, donc $' + ps('AB', 'CB') + '=-' + ps('AB', 'AD'),
    vec('DC') + '=' + vec('AB') + '$, donc $' + ps('AD', 'DC') + '=' + ps('AB', 'AD'),
    vec('CD') + '=-' + vec('AB') + '$, donc $' + ps('CD', 'AD') + '=-' + ps('AB', 'AD'),
    vec('DA') + '=-' + vec('AD') + '$ et $' + vec('BA') + '=-' + vec('AB') + '$, donc $'
    + ps('DA', 'BA') + '=' + ps('AB', 'AD'),
    vec('BA') + '=-' + vec('AB') + '$, donc $' + ps('BA', 'AD') + '=-' + ps('AB', 'AD')])
for vi, angle_tex in ((2, DEG_T), (3, RAD_T)):
    n1.append(variation(
        enonce_para(angle_tex, 'Calcule le produit scalaire $' + PROD_V3 + '$. Donne sa valeur '
                    'exacte.\n\n$' + PROD_V3 + '=?$'),
        VARS_PARA + [var('w', '0..5'), var('s', 'eval:(-1)^w')],
        [case('{{eval:s*R}}', [
            erreur('{{eval:-s*R}}', ERR_SIGNE_PARA, 'Signe faux'),
            erreur('{{eval:s*a*b}}', ERR_SANS_COS, 'Cosinus oublié'),
            erreur('{{eval:s*a*b*sin(t*\\pi/180)}}', ERR_SINUS, 'Sinus au lieu du cosinus'),
        ])],
        ['Dans le parallélogramme, $' + EGAL_V3 + '$.',
         '$' + ps('AB', 'AD') + '=AB\\times AD\\times\\cos\\widehat{BAD}={{b}}\\times {{a}}\\times '
         + COS_T + '={{R}}$.',
         '$' + PROD_V3 + '=' + P('{{eval:s*R}}') + '$.'],
        HINT_EGAUX, COND_PARA))
V = {'a': 4, 'b': 6, 'j': 2, 'w': 1}   # AB·CB = −12
n1s += [spec('AB·CB, 60° : −12', 2, V, 'correct', ['-12']),
        spec('AB·CB : signe faux 12', 2, V, 'incorrect', ['12'], ERR_SIGNE_PARA),
        spec('AB·CB : cosinus oublié −24', 2, V, 'incorrect', ['-24'], ERR_SANS_COS)]
V = {'a': 3, 'b': 5, 'j': 0, 'w': 4}   # DA·BA = 15√3/2
n1s += [spec('DA·BA, 30° : 15√3/2', 2, V, 'correct', ['\\frac{15\\sqrt{3}}{2}']),
        spec('DA·BA : sinus 15/2', 2, V, 'incorrect', ['\\frac{15}{2}'], ERR_SINUS)]
V = {'a': 5, 'b': 4, 'j': 1, 'w': 3}   # CD·AD = −10√2
n1s += [spec('CD·AD, π/4 : −10√2', 3, V, 'correct', ['-10\\sqrt{2}']),
        spec('CD·AD : signe faux', 3, V, 'incorrect', ['10\\sqrt{2}'], ERR_SIGNE_PARA)]
V = {'a': 3, 'b': 8, 'j': 2, 'w': 0}   # AB·BC = 12
n1s += [spec('AB·BC, π/3 : 12', 3, V, 'correct', ['12']),
        spec('AB·BC : cosinus oublié 24', 3, V, 'incorrect', ['24'], ERR_SANS_COS)]

ecrire('n1-parallelogramme', modele(
    'Produit scalaire dans un parallélogramme',
    'Calculer le produit scalaire de deux côtés d\'un parallélogramme avec l\'angle en A (degrés '
    'ou radians) : même origine, angle supplémentaire, vecteurs égaux ou opposés',
    6, 120, n1, n1s, 'expressions du produit scalaire', '1SPE-412'))

# =============================================================================================
# N2 (F2) — Projection sur une figure à points régulièrement espacés (1G10-2, cas 3). 1SPE-310.
# [AB] partagé en 10 graduations de longueur g = L/10 ; C(0 ; 3) au-dessus de A ; D(d ; 0) ;
# E(h ; 4) et F(h ; −4), H(h ; 0). Un produit vaut (graduations) × g² ; o change un sens.
# =============================================================================================

FIG_GRAD = bloc(
    'figure',
    'fenetre: -1 ; 11 ; -5 ; 5',
    'taille: moyenne',
    'description: Segment AB partagé en dix parties égales ; C au-dessus de A, (AC) '
    'perpendiculaire à (AB) ; D sur [AB] ; E et F de part et d\'autre de H, (EF) perpendiculaire '
    'à (AB).',
    '---',
    'A = point(0, 0, etiquette="bas-gauche")',
    'B = point(10, 0, etiquette="bas-droite")',
    'pour i de 1 a 9:',
    '    T[i] = point(i, 0, forme="croix", etiquette="aucune")',
    'C = point(0, 3, etiquette="haut-gauche")',
    'D = point({{d}}, 0, etiquette="bas")',
    'H = point({{h}}, 0, etiquette="bas-droite")',
    'E = point({{h}}, 4, etiquette="haut")',
    'F = point({{h}}, -4, etiquette="bas")',
    'segment(A, B)',
    'segment(A, C)',
    'segment(C, D)',
    'segment(D, E)',
    'segment(C, E)',
    'segment(E, F)',
    'segment(F, B)',
    'segment(F, C)',
    'angle(B, A, C, marque="carre")',
    'angle(B, H, E, marque="carre")')
ENONCE_GRAD = ('Sur la figure, les points marqués partagent le segment $[AB]$ en $10$ parties '
               'égales, et $AB={{L}}$. Les droites $(AC)$ et $(EF)$ sont perpendiculaires à '
               '$(AB)$, et $H$ est le point d\'intersection de $(EF)$ et $(AB)$.\n\n' + FIG_GRAD
               + '\n\nCalcule le produit scalaire $PROD$.\n\n$PROD=?$')
VARS_GRAD = [var('L', '10|5|20'), var('g', 'eval:L/10'), var('d', '2..4'), var('h', '6..9'),
             var('o', '0..1'), var('s', 'eval:1-2*o')]
ERR_GRAD_SIGNE = ('Regarde le sens des deux vecteurs une fois projetés sur $(AB)$ : de sens '
                  'contraires, le produit scalaire est négatif.')
ERR_GRAD_LONGUEURS = 'Tu as multiplié les longueurs des deux vecteurs : projette d\'abord le second sur $(AB)$.'
ERR_GRAD_UNITE = 'Une graduation ne mesure pas $1$ : $[AB]$ en compte $10$.'
HINT_GRAD = ('Projette orthogonalement sur $(AB)$ les deux extrémités de l\'autre vecteur : le '
             'produit scalaire ne change pas, et il devient un produit de longueurs, avec un signe.')


def grad(prod_tex, base, longueurs, proj_txt):
    """base : produit en graduations (sens « o = 0 ») ; longueurs : produit des longueurs."""
    return variation(
        ENONCE_GRAD.replace('PROD', prod_tex),
        VARS_GRAD,
        [case('{{eval:s*(' + base + ')*g^2}}', [
            erreur('{{eval:-s*(' + base + ')*g^2}}', ERR_GRAD_SIGNE, 'Signe faux'),
            erreur('{{eval:(' + longueurs + ')*g^2}}', ERR_GRAD_LONGUEURS, 'Produit des longueurs'),
            erreur('{{eval:s*(' + base + ')}}', ERR_GRAD_UNITE, 'Graduation comptée pour 1'),
        ])],
        ['Une graduation mesure $\\dfrac{ {{L}} }{10}={{g}}$.', proj_txt,
         '$' + prod_tex + '=' + P('{{eval:s*(' + base + ')*g^2}}') + '$.'],
        HINT_GRAD)


n2, n2s = [], []
# V1 : AB·DE ou AB·ED → projeté DH ou HD ; base 10(h − d)
n2.append(grad(si('o==0', ps('AB', 'DE')) + si('o==1', ps('AB', 'ED')), '10*(h-d)',
               '10*sqrt((h-d)^2+16)',
               'Le projeté orthogonal de $E$ sur $(AB)$ est $H$, donc $' + si('o==0', ps('AB', 'DE')
               + '=' + ps('AB', 'DH')) + si('o==1', ps('AB', 'ED') + '=' + ps('AB', 'HD'))
               + '$, avec $AB={{L}}$ et $DH={{eval:(h-d)*g}}$, ' + si('o==0', 'de même sens')
               + si('o==1', 'de sens contraires') + '.'))
V = {'L': 10, 'd': 3, 'h': 8, 'o': 0}   # 10 × 5 = 50
n2s += [spec('AB = 10, AB·DE = 50', 0, V, 'correct', ['50']),
        spec('AB·DE : signe faux', 0, V, 'incorrect', ['-50'], ERR_GRAD_SIGNE),
        spec('AB·DE : produit des longueurs 10√41', 0, V, 'incorrect', ['10\\sqrt{41}'],
             ERR_GRAD_LONGUEURS)]
V = {'L': 5, 'd': 3, 'h': 8, 'o': 1}   # −50 × 0,25 = −12,5
n2s += [spec('AB = 5, AB·ED = −12,5', 0, V, 'correct', ['-12{,}5']),
        spec('AB·ED : graduation comptée 1, −50', 0, V, 'incorrect', ['-50'], ERR_GRAD_UNITE)]

# V2 : AD·CF ou AD·FC → C se projette en A, F en H : AD·AH ; base d·h
n2.append(grad(si('o==0', ps('AD', 'CF')) + si('o==1', ps('AD', 'FC')), 'd*h',
               'd*sqrt(h^2+49)',
               'Les projetés orthogonaux de $C$ et de $F$ sur $(AB)$ sont $A$ et $H$, donc $'
               + si('o==0', ps('AD', 'CF') + '=' + ps('AD', 'AH'))
               + si('o==1', ps('AD', 'FC') + '=' + ps('AD', 'HA')) + '$, avec $AD={{eval:d*g}}$ '
               'et $AH={{eval:h*g}}$.'))
V = {'L': 20, 'd': 2, 'h': 7, 'o': 0}   # 14 × 4 = 56
n2s += [spec('AB = 20, AD·CF = 56', 1, V, 'correct', ['56']),
        spec('AD·CF : graduation 1 → 14', 1, V, 'incorrect', ['14'], ERR_GRAD_UNITE),
        spec('AD·CF : signe faux', 1, V, 'incorrect', ['-56'], ERR_GRAD_SIGNE)]
V = {'L': 10, 'd': 4, 'h': 6, 'o': 1}   # −24
n2s += [spec('AB = 10, AD·FC = −24', 1, V, 'correct', ['-24'])]

# V3 : CE·DB ou EC·DB → CE se projette en AH ; base (10 − d)·h
n2.append(grad(si('o==0', ps('CE', 'DB')) + si('o==1', ps('EC', 'DB')), '(10-d)*h',
               '(10-d)*sqrt(h^2+1)',
               'Les projetés orthogonaux de $C$ et de $E$ sur $(AB)$ sont $A$ et $H$, donc $'
               + si('o==0', ps('CE', 'DB') + '=' + ps('AH', 'DB'))
               + si('o==1', ps('EC', 'DB') + '=' + ps('HA', 'DB')) + '$, avec $AH={{eval:h*g}}$ '
               'et $DB={{eval:(10-d)*g}}$.'))
V = {'L': 10, 'd': 2, 'h': 9, 'o': 0}   # 8 × 9 = 72
n2s += [spec('AB = 10, CE·DB = 72', 2, V, 'correct', ['72']),
        spec('CE·DB : produit des longueurs 8√82', 2, V, 'incorrect', ['8\\sqrt{82}'],
             ERR_GRAD_LONGUEURS)]
V = {'L': 5, 'd': 4, 'h': 6, 'o': 1}   # −36 × 0,25 = −9
n2s += [spec('AB = 5, EC·DB = −9', 2, V, 'correct', ['-9']),
        spec('EC·DB : signe faux', 2, V, 'incorrect', ['9'], ERR_GRAD_SIGNE)]

# V4 : DC·HB ou DC·BH → DC se projette en DA ; DA·HB = −d(10 − h)
n2.append(grad(si('o==0', ps('DC', 'HB')) + si('o==1', ps('DC', 'BH')), '-d*(10-h)',
               'sqrt(d^2+9)*(10-h)',
               'Le projeté orthogonal de $C$ sur $(AB)$ est $A$, donc $'
               + si('o==0', ps('DC', 'HB') + '=' + ps('DA', 'HB'))
               + si('o==1', ps('DC', 'BH') + '=' + ps('DA', 'BH')) + '$, avec $DA={{eval:d*g}}$ '
               'et $HB={{eval:(10-h)*g}}$, ' + si('o==0', 'de sens contraires')
               + si('o==1', 'de même sens') + '.'))
V = {'L': 10, 'd': 3, 'h': 7, 'o': 0}   # −9
n2s += [spec('AB = 10, DC·HB = −9', 3, V, 'correct', ['-9']),
        spec('DC·HB : signe faux', 3, V, 'incorrect', ['9'], ERR_GRAD_SIGNE)]
V = {'L': 20, 'd': 2, 'h': 8, 'o': 1}   # 4 × 4 = 16
n2s += [spec('AB = 20, DC·BH = 16', 3, V, 'correct', ['16']),
        spec('DC·BH : graduation 1 → 4', 3, V, 'incorrect', ['4'], ERR_GRAD_UNITE)]

ecrire('n2-figure-a-points-espaces', modele(
    'Produit scalaire par projection sur une figure graduée',
    'Calculer un produit scalaire en projetant sur une droite graduée en dix parties égales : '
    'projetés de même sens ou de sens contraires, graduation de 0,5, 1 ou 2',
    7, 120, n2, n2s, 'expressions du produit scalaire', '1SPE-310'))

# =============================================================================================
# N3 (F3) — Produit scalaire lu sur un quadrillage (1G10-3). Point 1SPE-310.
# A(0 ; 0). Sur un axe : B = m·e, C = k·e + c·e⊥, AB·AC = m·k (signés).
# Penché : AB = (p ; q), C = k·AB + n·(−q ; p), AB·AC = k(p² + q²).
# =============================================================================================


def fig_quadrillage(xb, yb, xc, yc):
    """Coordonnées données en expressions nues (sans accolades)."""
    M = ('{{eval:max(abs(' + xb + '),abs(' + yb + '),abs(' + xc + '),abs(' + yc + '))+1}}')
    xb, yb, xc, yc = ('{{eval:' + e + '}}' for e in (xb, yb, xc, yc))
    return bloc('figure',
                # fenêtre carrée centrée en A : jamais trop allongée (sonde-figures)
                'fenetre: -' + M + ' ; ' + M + ' ; -' + M + ' ; ' + M,
                'taille: moyenne',
                'grille: oui',
                'description: Quadrillage ; vecteurs AB et AC partant du même point A.',
                '---',
                'A = point(0, 0, etiquette="bas-gauche")',
                'B = point(' + xb + ', ' + yb + ', etiquette="droite")',
                'C = point(' + xc + ', ' + yc + ', etiquette="haut")',
                'vecteur(A, B, couleur="bleu")',
                'vecteur(A, C, couleur="rouge")')


ENONCE_QUAD = ('Sur le quadrillage ci-dessous, l\'unité est le côté d\'un carreau.\n\nFIG\n\n'
               'Calcule le produit scalaire $' + ps('AB', 'AC') + '$.\n\n$' + ps('AB', 'AC') + '=?$')
ERR_QUAD_LONG = 'Tu as multiplié les longueurs $AB$ et $AC$ : c\'est le projeté de $C$ sur $(AB)$ qui compte.'
ERR_QUAD_SIGNE = ('Regarde où tombe le projeté de $C$ : du côté opposé à $B$, le produit scalaire '
                  'est négatif.')
ERR_QUAD_HAUTEUR = ('Tu as utilisé la distance de $C$ à la droite $(AB)$ : il faut la position du '
                    'projeté de $C$ sur $(AB)$.')
HINT_QUAD = ('Trace la perpendiculaire à $(AB)$ qui passe par $C$ : son pied $H$ donne $'
             + ps('AB', 'AC') + '=' + ps('AB', 'AH') + '$.')

n3, n3s = [], []


def quad_axe(sens_k, axe, cond_sens):
    """axe 'x' : AB horizontal ; 'y' : AB vertical ; 'xy' : l'un ou l'autre (variable o).
    sens_k : expression du signe de k par rapport à B (1 même côté, −1 opposé, z au hasard)."""
    vs = [var('m', '3..6'), var('sb', '1|-1'), var('k0', '1..6'), var('c0', '1..4'),
          var('sc', '1|-1'), var('z', '1|-1'),
          var('k', 'eval:(' + sens_k + ')*sb*k0'), var('c', 'eval:sc*c0'),
          var('o', {'x': '0', 'y': '1', 'xy': '0..1'}[axe])]
    # o = 0 : B(sb·m ; 0), C(k ; c) ; o = 1 : B(0 ; sb·m), C(c ; k)
    xb, yb = '(1-o)*sb*m', 'o*sb*m'
    xc, yc = '(1-o)*k+o*c', 'o*k+(1-o)*c'
    attendu = '{{eval:sb*m*k}}'
    return variation(
        ENONCE_QUAD.replace('FIG', fig_quadrillage(xb, yb, xc, yc)),
        vs,
        [case(attendu, [
            erreur('{{eval:m*sqrt(k^2+c^2)}}', ERR_QUAD_LONG, 'Produit des longueurs'),
            erreur('{{eval:-sb*m*k}}', ERR_QUAD_SIGNE, 'Signe faux'),
            erreur('{{eval:m*c0}}', ERR_QUAD_HAUTEUR, 'Distance de C à (AB)'),
        ])],
        ['Le projeté orthogonal $H$ de $C$ sur $(AB)$ est sur la ligne du quadrillage qui porte '
         '$[AB]$, à $' + '{{eval:abs(k)}}' + '$ carreaux de $A$, ' + si('k*sb>0', 'du côté de $B$')
         + si('k*sb<0', 'du côté opposé à $B$') + '.',
         '$' + ps('AB', 'AC') + '=' + ps('AB', 'AH') + '=' + si('k*sb<0', '-')
         + 'AB\\times AH=' + si('k*sb<0', '-') + '{{m}}\\times {{eval:abs(k)}}=' + P(attendu)
         + '$.'],
        HINT_QUAD, cond_sens)


n3.append(quad_axe('1', 'x', []))
n3.append(quad_axe('-1', 'y', []))
n3.append(quad_axe('z', 'xy', []))
V = {'m': 4, 'sb': 1, 'k0': 3, 'c0': 2, 'sc': 1, 'z': 1}   # B(4 ; 0), C(3 ; 2) : 12
n3s += [spec('B(4 ; 0), C(3 ; 2) : 12', 0, V, 'correct', ['12']),
        spec('longueurs 4√13', 0, V, 'incorrect', ['4\\sqrt{13}'], ERR_QUAD_LONG),
        spec('signe faux', 0, V, 'incorrect', ['-12'], ERR_QUAD_SIGNE),
        spec('distance de C : 8', 0, V, 'incorrect', ['8'], ERR_QUAD_HAUTEUR)]
V = {'m': 5, 'sb': 1, 'k0': 2, 'c0': 3, 'sc': -1, 'z': 1}   # B(0 ; 5), C(−3 ; −2) : −10
n3s += [spec('B(0 ; 5), C(−3 ; −2) : −10', 1, V, 'correct', ['-10']),
        spec('signe faux 10', 1, V, 'incorrect', ['10'], ERR_QUAD_SIGNE)]
V = {'m': 3, 'sb': -1, 'k0': 4, 'c0': 1, 'sc': 1, 'z': -1, 'o': 0}   # B(−3 ; 0), k = 4 : −12
n3s += [spec('B(−3 ; 0), C(4 ; 1) : −12', 2, V, 'correct', ['-12']),
        spec('distance de C : 3', 2, V, 'incorrect', ['3'], ERR_QUAD_HAUTEUR)]
V = {'m': 6, 'sb': -1, 'k0': 2, 'c0': 2, 'sc': 1, 'z': 1, 'o': 1}   # B(0 ; −6), C(2 ; −2) : 12
n3s += [spec('B(0 ; −6), C(2 ; −2) : 12', 2, V, 'correct', ['12'])]

# V4 : AB penché
ERR_QUAD_SANS_AB2 = ('$AH=|k|\\times AB$ : le produit $AB\\times AH$ fait apparaître $AB^2$, '
                     'pas seulement le nombre de « pas » de $\\overrightarrow{AB}$.')
ERR_QUAD_AB = 'Tu as multiplié par $AB$ une seule fois : $AB\\times AH$, avec $AH$ multiple de $AB$, donne $AB^2$.'
n3.append(variation(
    ENONCE_QUAD.replace('FIG', fig_quadrillage('p', 'q', 'k*p-n*q', 'k*q+n*p')),
    [var('m', '2..3'), var('ec', '0..1'), var('sp', '1|-1'), var('sq', '1|-1'),
     var('p', 'eval:sp*(m+ec*(1-m))'), var('q', 'eval:sq*(1+ec*(m-1))'),
     var('k', '-2..3!0,1,-1'), var('n', '1..2;±'), var('S', 'eval:p^2+q^2')],
    [case('{{eval:k*S}}', [
        erreur('{{k}}', ERR_QUAD_SANS_AB2, 'AB² oublié'),
        erreur('{{eval:k*sqrt(S)}}', ERR_QUAD_AB, 'AB au lieu de AB²'),
        erreur('{{eval:-k*S}}', ERR_QUAD_SIGNE, 'Signe faux'),
    ])],
    ['La perpendiculaire à $(AB)$ passant par $C$ coupe $(AB)$ en $H$ tel que $' + vec('AH') + '='
     '{{k}}\\,' + vec('AB') + '$ : on le voit en comptant les carreaux le long de $(AB)$.',
     '$AB^2={{p;()}}^2+{{q;()}}^2={{S}}$, donc $' + ps('AB', 'AC') + '=' + ps('AB', 'AH') + '={{k}}'
     '\\times AB^2=' + P('{{eval:k*S}}') + '$.'],
    HINT_QUAD, ['abs(k*p-n*q) <= 7', 'abs(k*q+n*p) <= 7']))
V = {'m': 2, 'ec': 0, 'sp': 1, 'sq': 1, 'k': 2, 'n': 1}   # AB(2 ; 1), C(3 ; 4) : 10
n3s += [spec('AB(2 ; 1), k = 2 : 10', 3, V, 'correct', ['10']),
        spec('AB² oublié : 2', 3, V, 'incorrect', ['2'], ERR_QUAD_SANS_AB2),
        spec('AB une fois : 2√5', 3, V, 'incorrect', ['2\\sqrt{5}'], ERR_QUAD_AB),
        spec('signe faux', 3, V, 'incorrect', ['-10'], ERR_QUAD_SIGNE)]
V = {'m': 3, 'ec': 1, 'sp': 1, 'sq': 1, 'k': -2, 'n': -1}   # AB(1 ; 3), C(1 ; −7) : −20
n3s += [spec('AB(1 ; 3), k = −2 : −20', 3, V, 'correct', ['-20'])]

ecrire('n3-quadrillage', modele(
    'Produit scalaire sur un quadrillage',
    'Calculer AB·AC sur un quadrillage en projetant C sur (AB) : AB horizontal, vertical ou '
    'penché, projeté du côté de B ou du côté opposé',
    8, 90, n3, n3s, 'expressions du produit scalaire', '1SPE-310'))

# =============================================================================================
# N4 (F4) — Aire d'un triangle avec le produit scalaire (1G12-1). Point 1SPE-320.
# AB(p ; q), AC(r ; s), N = AB·AC > 0, S = AB², W = |ps − qr| :
# AD = N/√S, CD = W/√S, aire = W/2.
# =============================================================================================

ENONCE_AIRE = (REPERE + ' On considère les points $A({{xa}}\\,;{{ya}})$, $B({{xb}}\\,;{{yb}})$ '
               'et $C({{xc}}\\,;{{yc}})$. On note $D$ le projeté orthogonal de $C$ sur la droite '
               '$(AB)$.\n\nDonne les valeurs exactes.\n\n'
               '**1.** $' + ps('AB', 'AC') + '=?$\n\n'
               '**2.** $AD=?$\n\n'
               '**3.** $CD=?$\n\n'
               '**4.** L\'aire du triangle $ABC$ : $\\mathcal{A}=?$')
ERR_AIRE_PS = 'Le produit scalaire s\'écrit $xx\'+yy\'$ : abscisses entre elles, ordonnées entre elles.'
ERR_AIRE_AD_PS = ('Tu as donné $' + ps('AB', 'AC') + '$ : comme $' + ps('AB', 'AC') + '=AB\\times '
                  'AD$, il reste à diviser par $AB$.')
ERR_AIRE_AD_S = 'Tu as divisé par $AB^2$ : on divise par $AB$.'
ERR_AIRE_CD2 = 'Tu as donné $CD^2$ : prends la racine carrée.'
ERR_AIRE_CD_AD = 'Tu as donné $AD$ : la hauteur issue de $C$ est $CD$.'
ERR_AIRE_DEMI = 'L\'aire d\'un triangle est $\\dfrac{\\text{base}\\times\\text{hauteur}}{2}$ : n\'oublie pas de diviser par $2$.'
ERR_AIRE_AD = 'La hauteur issue de $C$ est $CD$, pas $AD$.'
HINT_AIRE = ('$D$ est le projeté orthogonal de $C$ sur $(AB)$ : $' + ps('AB', 'AC') + '='
             + ps('AB', 'AD') + '$. Le triangle $ACD$ est rectangle en $D$.')


def etapes_aire(ab_tex):
    return [
        '$' + vec('AB') + '\\begin{pmatrix}{{p}}\\\\{{q}}\\end{pmatrix}$ et $' + vec('AC')
        + '\\begin{pmatrix}{{r}}\\\\{{s}}\\end{pmatrix}$, donc $' + ps('AB', 'AC') + '={{p}}\\times '
        '{{r;()}}+{{q;()}}\\times {{s;()}}=' + P('{{N}}') + '$.',
        '$AB=\\sqrt{ {{p;()}}^2+{{q;()}}^2}=' + ab_tex + '$. Comme $' + ps('AB', 'AC') + '>0$, $D$ est '
        'sur la demi-droite $[AB)$ et $' + ps('AB', 'AC') + '=' + ps('AB', 'AD') + '=AB\\times AD$, '
        'donc $AD=\\dfrac{ {{N}} }{' + ab_tex + '}=' + P('{{eval:N/sqrt(S)}}') + '$.',
        'Le triangle $ACD$ est rectangle en $D$ : $CD^2=AC^2-AD^2={{eval:r^2+s^2}}-{{eval:N^2/S}}'
        '={{eval:W^2/S}}$, donc $CD=' + P('{{eval:W/sqrt(S)}}') + '$.',
        '$\\mathcal{A}=\\dfrac{AB\\times CD}{2}=' + P('{{eval:W/2}}') + '$.']


def blancs_aire():
    return [
        case('{{N}}', [erreur('{{eval:p*r-q*s}}', ERR_AIRE_PS, 'Signe moins au lieu de plus'),
                       erreur('{{eval:p*s+q*r}}', ERR_AIRE_PS, 'Coordonnées croisées')]),
        case('{{eval:N/sqrt(S)}}', [erreur('{{N}}', ERR_AIRE_AD_PS, 'Pas divisé par AB'),
                                    erreur('{{eval:N/S}}', ERR_AIRE_AD_S, 'Divisé par AB²')]),
        case('{{eval:W/sqrt(S)}}', [erreur('{{eval:W^2/S}}', ERR_AIRE_CD2, 'CD² donné'),
                                    erreur('{{eval:N/sqrt(S)}}', ERR_AIRE_CD_AD, 'AD donné')]),
        case('{{eval:W/2}}', [erreur('{{W}}', ERR_AIRE_DEMI, 'Division par 2 oubliée'),
                              erreur('{{eval:N/2}}', ERR_AIRE_AD, 'AD pris pour hauteur')])]


VARS_AIRE_FIN = [var('xb', 'eval:xa+p'), var('yb', 'eval:ya+q'), var('xc', 'eval:xa+r'),
                 var('yc', 'eval:ya+s'), var('N', 'eval:p*r+q*s'), var('S', 'eval:p^2+q^2'),
                 var('W', 'eval:abs(p*s-q*r)')]
COND_AIRE = ['N > 0', 'W != 0', 'abs(xb) <= 6', 'abs(yb) <= 6', 'abs(xc) <= 6', 'abs(yc) <= 6',
             'r != 0', 's != 0']

n4, n4s = [], []
# V1 : AB entier (3 ; 4), (4 ; 3)… → AB = 5
n4.append(variation(
    ENONCE_AIRE,
    [var('xa', '-2..2'), var('ya', '-2..2'), var('ec', '0..1'), var('sp', '1|-1'),
     var('sq', '1|-1'), var('p', 'eval:sp*(3+ec)'), var('q', 'eval:sq*(4-ec)'),
     var('r', '-5..5'), var('s', '-5..5')] + VARS_AIRE_FIN,
    blancs_aire(), etapes_aire('5'), HINT_AIRE, COND_AIRE))
V = {'xa': 0, 'ya': 0, 'ec': 0, 'sp': 1, 'sq': 1, 'r': 5, 's': 1}   # AB(3 ; 4), AC(5 ; 1) : N = 19, W = 17
n4s += [spec('AB(3 ; 4), AC(5 ; 1)', 0, V, 'correct',
             ['19', '\\frac{19}{5}', '\\frac{17}{5}', '\\frac{17}{2}']),
        spec('décimaux acceptés', 0, V, 'correct', ['19', '3{,}8', '3{,}4', '8{,}5']),
        spec('AB·AC : signe moins', 0, V, 'incorrect',
             ['11', '\\frac{19}{5}', '\\frac{17}{5}', '\\frac{17}{2}'], ERR_AIRE_PS),
        spec('AD = 19', 0, V, 'incorrect', ['19', '19', '\\frac{17}{5}', '\\frac{17}{2}'],
             ERR_AIRE_AD_PS),
        spec('AD = 19/25', 0, V, 'incorrect', ['19', '\\frac{19}{25}', '\\frac{17}{5}',
                                                '\\frac{17}{2}'], ERR_AIRE_AD_S),
        spec('CD² donné', 0, V, 'incorrect', ['19', '\\frac{19}{5}', '\\frac{289}{25}',
                                               '\\frac{17}{2}'], ERR_AIRE_CD2),
        spec('aire sans /2', 0, V, 'incorrect', ['19', '\\frac{19}{5}', '\\frac{17}{5}', '17'],
             ERR_AIRE_DEMI),
        spec('aire avec AD', 0, V, 'incorrect', ['19', '\\frac{19}{5}', '\\frac{17}{5}',
                                                  '\\frac{19}{2}'], ERR_AIRE_AD)]

# V2 : AB = √S irrationnel
n4.append(variation(
    ENONCE_AIRE.replace('Donne les valeurs exactes.', 'Donne les valeurs exactes, avec un '
                        'dénominateur sans racine.'),
    [var('xa', '-2..2'), var('ya', '-2..2'), var('p', '-4..4!0'), var('q', '-4..4!0'),
     var('r', '-5..5'), var('s', '-5..5')] + VARS_AIRE_FIN,
    blancs_aire(), etapes_aire('\\sqrt{ {{S}} }'), HINT_AIRE,
    COND_AIRE + ['round(sqrt(S))^2 != S']))
V = {'xa': 1, 'ya': -1, 'p': 2, 'q': 1, 'r': 1, 's': 3}   # N = 5, S = 5, W = 5 : AD = √5, CD = √5
n4s += [spec('AB(2 ; 1), AC(1 ; 3)', 1, V, 'correct', ['5', '\\sqrt{5}', '\\sqrt{5}', '\\frac{5}{2}']),
        spec('CD² = 5', 1, V, 'incorrect', ['5', '\\sqrt{5}', '5', '\\frac{5}{2}'], ERR_AIRE_CD2)]
V = {'xa': 0, 'ya': 0, 'p': 1, 'q': 2, 'r': 4, 's': 1}   # N = 6, S = 5, W = 7
n4s += [spec('AB(1 ; 2), AC(4 ; 1)', 1, V, 'correct',
             ['6', '\\frac{6\\sqrt{5}}{5}', '\\frac{7\\sqrt{5}}{5}', '\\frac{7}{2}']),
        spec('AD = 6/5', 1, V, 'incorrect', ['6', '\\frac{6}{5}', '\\frac{7\\sqrt{5}}{5}',
                                              '\\frac{7}{2}'], ERR_AIRE_AD_S)]

ecrire('n4-aire-d-un-triangle', modele(
    'Aire d\'un triangle avec le produit scalaire',
    'Dans un repère : AB·AC, puis la distance AD au projeté orthogonal D de C sur (AB), la hauteur '
    'CD et l\'aire du triangle ABC, en valeurs exactes',
    9, 300, n4, n4s, 'angles et longueurs', '1SPE-320'))

# =============================================================================================
# N5 (F5) — Droite d'Euler dans un repère (1G12-2). Point 1SPE-436.
# K(kx ; ky), A, B, C = K + (±a ou ±b ; ±b ou ±a), a = 3, b = 6 (R² = 45) ou 9 (R² = 90).
# H = A + B + C − 2K (orthocentre), G = (A + B + C)/3, KH = 3 KG.
# =============================================================================================


def sommet(n):
    """Variables d'un sommet : signes s?, t?, échange w? ; coordonnées relatives u?, v?."""
    return [var('s' + n, '1|-1'), var('t' + n, '1|-1'), var('w' + n, '0..1'),
            var('u' + n, 'eval:s' + n + '*(a+w' + n + '*(b-a))'),
            var('v' + n, 'eval:t' + n + '*(b+w' + n + '*(a-b))'),
            var('x' + n, 'eval:kx+u' + n), var('y' + n, 'eval:ky+v' + n)]


def distincts(m, n):
    """Deux sommets distincts et non diamétralement opposés (triangle non rectangle)."""
    return ['u' + m + ' != u' + n + ' || v' + m + ' != v' + n,
            'u' + m + ' != -u' + n + ' || v' + m + ' != -v' + n]


CHOIX_H = bloc('choix',
               '- l\'orthocentre du triangle $ABC$ (le point de concours des hauteurs)',
               '- le centre du cercle circonscrit au triangle $ABC$',
               '- le centre de gravité du triangle $ABC$',
               '- le milieu du segment $[BC]$')
ENONCE_EULER = (
    REPERE + ' On considère les points $A({{xA}}\\,;{{yA}})$, $B({{xB}}\\,;{{yB}})$, '
    '$C({{xC}}\\,;{{yC}})$, $K({{kx}}\\,;{{ky}})$ et $H({{xH}}\\,;{{yH}})$.\n\n'
    '**1.** Calcule les produits scalaires suivants.\n\n'
    '$' + ps('AB', 'HC') + '=?$\n\n$' + ps('AC', 'HB') + '=?$\n\n'
    '**2.** Que représente le point $H$ pour le triangle $ABC$ ?\n\n' + CHOIX_H + '\n\n'
    '**3.** Calcule $KA^2$. On trouve aussi $KB^2=KC^2=KA^2$ : $K$ est le centre du cercle '
    'circonscrit au triangle $ABC$.\n\n$KA^2=?$\n\n'
    '**4.** Le centre de gravité $G$ du triangle $ABC$ vérifie $' + vec('AG') + '=\\dfrac{2}{3}'
    + vec('AM') + '$, où $M$ est le milieu de $[BC]$. Donne ses coordonnées.\n\n$G(?\\,;?)$\n\n'
    '**5.** Détermine le réel $k$ tel que $' + vec('KH') + '=k\\,' + vec('KG') + '$. Les points '
    '$K$, $G$ et $H$ sont donc alignés, sur la droite d\'Euler du triangle.\n\n$k=?$')
ERR_EULER_MILIEU = ('Tu as donné le milieu $M$ de $[BC]$ : $G$ est aux deux tiers de $[AM]$ en '
                    'partant de $A$.')
ERR_EULER_TIERS = 'Tu as pris $' + vec('AG') + '=\\dfrac{1}{3}' + vec('AM') + '$ : c\'est $\\dfrac{2}{3}$.'
ERR_EULER_INVERSE = 'Le rapport est à l\'envers : c\'est $' + vec('KH') + '$ qui est le plus long.'
ERR_EULER_KA = 'On demande $KA^2$, pas $KA$.'
ERR_EULER_PS = 'Calcule d\'abord les coordonnées des deux vecteurs, puis $xx\'+yy\'$.'
HINT_EULER = ('Une hauteur passe par un sommet et est perpendiculaire au côté opposé : un produit '
              'scalaire nul le montre. Pour $G$, calcule d\'abord les coordonnées de $M$.')

GX = '{{eval:(xA+xB+xC)/3}}'
GY = '{{eval:(yA+yB+yC)/3}}'
n5, n5s = [], []
for vi, b in ((0, 6), (1, 9)):
    n5.append(variation(
        ENONCE_EULER,
        [var('a', '3'), var('b', str(b)), var('kx', '-2..2'), var('ky', '-2..2')]
        + sommet('A') + sommet('B') + sommet('C')
        + [var('xH', 'eval:xA+xB+xC-2*kx'), var('yH', 'eval:yA+yB+yC-2*ky'),
           var('R', 'eval:a^2+b^2')],
        [case('0', [erreur('{{eval:(xB-xA)*(xC+xH)+(yB-yA)*(yC+yH)}}', ERR_EULER_PS,
                           'Coordonnées additionnées')]),
         case('0'),
         case('0'),
         case('{{R}}', [erreur('{{eval:sqrt(R)}}', ERR_EULER_KA, 'KA au lieu de KA²')]),
         case(GX, [erreur('{{eval:(xB+xC)/2}}', ERR_EULER_MILIEU, 'Milieu de [BC]'),
                   erreur('{{eval:xA+((xB+xC)/2-xA)/3}}', ERR_EULER_TIERS, 'Un tiers')]),
         case(GY, [erreur('{{eval:(yB+yC)/2}}', ERR_EULER_MILIEU, 'Milieu de [BC]'),
                   erreur('{{eval:yA+((yB+yC)/2-yA)/3}}', ERR_EULER_TIERS, 'Un tiers')]),
         case('3', [erreur('\\frac{1}{3}', ERR_EULER_INVERSE, 'Rapport inversé')])],
        ['$' + vec('AB') + '\\begin{pmatrix}{{eval:xB-xA}}\\\\{{eval:yB-yA}}\\end{pmatrix}$ et $'
         + vec('HC') + '\\begin{pmatrix}{{eval:xC-xH}}\\\\{{eval:yC-yH}}\\end{pmatrix}$, donc $'
         + ps('AB', 'HC') + '={{eval:xB-xA}}\\times {{eval:xC-xH;()}}+{{eval:yB-yA;()}}\\times '
         '{{eval:yC-yH;()}}=' + P('0') + '$.',
         '$' + vec('AC') + '\\begin{pmatrix}{{eval:xC-xA}}\\\\{{eval:yC-yA}}\\end{pmatrix}$ et $'
         + vec('HB') + '\\begin{pmatrix}{{eval:xB-xH}}\\\\{{eval:yB-yH}}\\end{pmatrix}$, donc $'
         + ps('AC', 'HB') + '={{eval:xC-xA}}\\times {{eval:xB-xH;()}}+{{eval:yC-yA;()}}\\times '
         '{{eval:yB-yH;()}}=' + P('0') + '$.',
         '$H$ est donc sur la hauteur issue de $C$ (perpendiculaire à $(AB)$) et sur la hauteur '
         'issue de $B$ (perpendiculaire à $(AC)$) : c\'est $' + P('\\text{l\'orthocentre}') + '$ du '
         'triangle $ABC$.',
         '$KA^2=({{xA}}-{{kx;()}})^2+({{yA}}-{{ky;()}})^2={{eval:uA^2}}+{{eval:vA^2}}=' + P('{{R}}')
         + '$.',
         '$M\\left({{eval:(xB+xC)/2}}\\,;{{eval:(yB+yC)/2}}\\right)$ ; $' + vec('AG') + '=\\dfrac{2}{3}'
         + vec('AM') + '$ donne $G\\left(' + P(GX) + '\\,;' + P(GY) + '\\right)$.',
         '$' + vec('KG') + '\\begin{pmatrix}{{eval:(xA+xB+xC)/3-kx}}\\\\{{eval:(yA+yB+yC)/3-ky}}'
         '\\end{pmatrix}$ et $' + vec('KH') + '\\begin{pmatrix}{{eval:xH-kx}}\\\\{{eval:yH-ky}}'
         '\\end{pmatrix}$, donc $' + vec('KH') + '=' + P('3') + '\\,' + vec('KG') + '$ : ces '
         'vecteurs sont colinéaires, et $K$, $G$, $H$ sont alignés.'],
        HINT_EULER,
        distincts('A', 'B') + distincts('A', 'C') + distincts('B', 'C')
        + ['uA+uB+uC != 0 || vA+vB+vC != 0',
           # corrigé sans terme nul (écart « termes nuls », ecarts-tri/pedagogie.md)
           'xB != xA', 'yB != yA', 'xC != xA', 'yC != yA', 'xC != xH', 'yC != yH',
           'xB != xH', 'yB != yH']))

# V1 : K(1 ; −1), A = K + (3 ; 6), B = K + (6 ; −3), C = K + (−6 ; −3).
V = {'kx': 1, 'ky': -1,
     'sA': 1, 'tA': 1, 'wA': 0,     # (3 ; 6)
     'sB': 1, 'tB': -1, 'wB': 1,    # (6 ; −3)
     'sC': -1, 'tC': -1, 'wC': 1}   # (−6 ; −3)
# A(4 ; 5), B(7 ; −4), C(−5 ; −4) ; A + B + C = (6 ; −3), H = (6 − 2 ; −3 + 2) = (4 ; −1),
# G = (2 ; −1), KG = (1 ; 0), KH = (3 ; 0).
n5s += [spec('R² = 45 : A(4 ; 5), B(7 ; −4), C(−5 ; −4)', 0, V, 'correct',
             ['0', '0', '0', '45', '2', '-1', '3']),
        spec('KA au lieu de KA²', 0, V, 'incorrect', ['0', '0', '0', '3\\sqrt{5}', '2', '-1', '3'],
             ERR_EULER_KA),
        spec('G milieu de [BC]', 0, V, 'incorrect', ['0', '0', '0', '45', '1', '-1', '3'],
             ERR_EULER_MILIEU),
        spec('k = 1/3', 0, V, 'incorrect', ['0', '0', '0', '45', '2', '-1', '\\frac{1}{3}'],
             ERR_EULER_INVERSE),
        spec('H pris pour le centre du cercle', 0, V, 'incorrect',
             ['0', '0', '1', '45', '2', '-1', '3'])]
V = {'kx': 0, 'ky': 2,
     'sA': -1, 'tA': 1, 'wA': 0,    # (−3 ; 9)
     'sB': 1, 'tB': 1, 'wB': 1,     # (9 ; 3)
     'sC': 1, 'tC': -1, 'wC': 1}    # (9 ; −3)
# A(−3 ; 11), B(9 ; 5), C(9 ; −1) ; A + B + C = (15 ; 15), H = (15 ; 11), G = (5 ; 5).
# Un tiers : xA + ((xB + xC)/2 − xA)/3 = −3 + 12/3 = 1.
n5s += [spec('R² = 90 : A(−3 ; 11), B(9 ; 5), C(9 ; −1)', 1, V, 'correct',
             ['0', '0', '0', '90', '5', '5', '3']),
        spec('G avec un tiers (abscisse 1)', 1, V, 'incorrect',
             ['0', '0', '0', '90', '1', '5', '3'], ERR_EULER_TIERS)]

ecrire('n5-droite-d-euler', modele(
    'Droite d\'Euler dans un repère',
    'Dans un repère : montrer par le produit scalaire que H est l\'orthocentre, que K est le '
    'centre du cercle circonscrit, calculer le centre de gravité G et le réel k tel que '
    'KH = k·KG',
    8, 420, n5, n5s, 'propriétés', '1SPE-436'))

for nom, vs, ss in [('N1', n1, n1s), ('N2', n2, n2s), ('N3', n3, n3s), ('N4', n4, n4s),
                    ('N5', n5, n5s)]:
    print(nom, ':', len(vs), 'variations,', len(ss), 'specs')
