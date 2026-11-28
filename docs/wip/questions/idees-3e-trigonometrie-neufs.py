"""Écrit les modèles neufs du chantier idees-3e-trigonometrie dans
scripts/questions/idees-3e-trigonometrie-neufs/ (N1 à N4).

Phase 0 validée par David le 2026-11-25 (« je te suis » : toutes les recommandations ; journal
docs/archive/wip/idees-3e-trigonometrie/idees-3e-trigonometrie-progress.md, § Phase 0) : Q1 non (pas de questions littérales),
Q3 oui (rangement ci-dessous), N4 sans la montagne, angles de N4 v6 loin du seuil de 8,5°.

Rangement (point 3-061 sur la notion, comme 57c73be1) :
- N1 : « Géométrie > Trigonométrie du triangle rectangle > calcul de longueurs » ;
- N3 : « Géométrie > Trigonométrie du triangle rectangle > calcul d'angles » ;
- N2, N4 : « Géométrie > Trigonométrie du triangle rectangle » (notion).

Ni theme, ni domain, ni subdomain, ni id : create-questions --publier écrit l'id.

Décisions d'écriture et écarts à la fiche :
- N1 : case choix à six calculs (× et ÷ de cos, sin, tan), mélangés. Une case choix ne porte pas
  d'erreurs prévues (couvrir-un-niveau.md § 5) : les messages des cinq mauvais choix que la fiche
  annonçait vont dans le corrigé (pourquoi multiplier ou diviser, pourquoi ce rapport).
- N1 : la figure est celle de 57c73be1 (noms tirés par `s`, orientation `o`, angle `b`).
- N2 : la fonction tirée (`f`) choisit cos, sin ou tan ; sa valeur est écrite par les
  polynômes de Lagrange en f (pas de `if` dans un `eval`). Pour l'angle, les trois mesures sont
  écrites par `{{if:}}` (acos d'un quotient > 1 n'existe pas).
- N3 : le troisième angle du triangle ABC est exact (case 1) ; AC est gardé exact pour l'angle
  ACD, l'arrondi trop tôt est une erreur prévue (la consigne le dit). AD tiré de 0,7 à 1,2 fois
  AC, jamais à moins de 0,3 cm de AC (triangle ACD jamais presque isocèle).
- N4 : réponses écrites en nombre, l'unité affichée après la case (comme 57c73be1), au lieu
  d'une case à grandeur : l'unité est imposée par l'énoncé, la taper n'apprend rien ici.
- N4 : chaque énoncé dit de garder les valeurs exactes jusqu'au dernier calcul ; l'arrondi trop
  tôt est une erreur prévue là où il change le résultat (v1, v2, v3, v4). En v5, on ne tire que
  des triangles où l'angle arrondi au dixième donne le même AB au millimètre (même règle que
  F1 v9 : l'élève qui réutilise sa réponse n'est pas puni).
- N4 v3 : angle d'élévation de 20 à 60°, figure à l'échelle sur l'horizontale (œil dessiné à
  hauteur fixe).
- N4 v6 : la case « Y a-t-il un surcoût ? » est un choix Oui / Non validé par David ; il suit le
  calcul de l'angle (case 1), qui porte la note.
- Messages des erreurs prévues sans formule (`$…$` réécrit à la résolution) : « cos⁻¹ » en texte.

Usage : python3 docs/wip/questions/idees-3e-trigonometrie-neufs.py scripts/questions/idees-3e-trigonometrie-neufs
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from idees_3e_trigonometrie_outils import (  # noqa: E402
    DEG, arrondi_net, case, couleur, erreur, lettre, resoudre, spec, tous_distincts, var,
    variation)

DOSSIER = sys.argv[1]
PUBLIES = os.path.join(os.path.dirname(os.path.abspath(DOSSIER)),
                       'idees-3e-trigonometrie-publies')

NOTION = 'Géométrie > Trigonométrie du triangle rectangle'
RANGEMENT = {
    'n1-quel-calcul-donne-la-longueur': (NOTION + ' > calcul de longueurs', '3-061'),
    'n2-resoudre-une-equation-trigonometrique': (NOTION, '3-061'),
    'n3-deux-triangles-accoles-tous-les-angles': (NOTION + ' > calcul d\'angles', '3-061'),
    'n4-problemes-concrets-de-trigonometrie': (NOTION, '3-061'),
}


# =============================================================================================
# Outils
# =============================================================================================

def modele(title, description, level, delay, variations, specs):
    return {'title': title, 'description': description, 'grades': ['3'], 'level': level,
            'delay': delay, 'status': 'draft', 'variations': variations, 'testSpecs': specs}


def ecrire(nom, m):
    os.makedirs(DOSSIER, exist_ok=True)
    chemin = os.path.join(DOSSIER, nom + '.json')
    # Garder l'id écrit en tête par create-questions --publier, s'il existe
    tete = {}
    if os.path.exists(chemin):
        with open(chemin, encoding='utf-8') as f:
            ancien = json.load(f)
        if 'id' in ancien:
            tete = {'id': ancien['id']}
    noeud, point = RANGEMENT[nom]
    m = {**tete, 'rangement': {'noeud': noeud, 'point': point}, **m}
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'{nom} : {len(m["variations"])} variations, {len(m["testSpecs"])} specs')


def rnd(x, nd=0):
    """Arrondi au plus proche, moitié vers le haut (comme `round` du gabarit)."""
    return math.floor(x * 10 ** nd + 0.5) / 10 ** nd


def fr(x, nd=0):
    """Réponse d'élève : l'arrondi écrit en LaTeX (virgule `{,}`)."""
    v = rnd(x, nd)
    if nd == 0 or v == int(v):
        texte = str(int(v))
    else:
        texte = f'{v:.{nd}f}'.rstrip('0').replace('.', '{,}')
    # Dès 4 chiffres, espaces de groupement (sinon `unoptimal_form`)
    entier, _, reste = texte.partition('{,}')
    signe = '-' if entier.startswith('-') else ''
    chiffres = entier.lstrip('-')
    if len(chiffres) >= 4:
        groupes = []
        while chiffres:
            groupes.insert(0, chiffres[-3:])
            chiffres = chiffres[:-3]
        entier = signe + '\\,'.join(groupes)
    return entier + ('{,}' + reste if reste else '')


def rad(deg):
    return deg * math.pi / 180


def deg(r):
    return r * 180 / math.pi


def r10(expr):
    return f'round(10*({expr}))/10'


def ev(expr, d=True):
    return '{{eval:' + expr + (';d' if d else '') + '}}'


def figure(fenetre, description, lignes):
    return ('```figure\nfenetre: ' + fenetre + '\ndescription: ' + description + '\n---\n'
            + '\n'.join(lignes) + '\n```')


def specs_erreurs(vi, v, base, i, erreurs, desc):
    """Une spec `incorrect` par erreur prévue de la case i : (réponse, message, nom)."""
    out = []
    for rep, msg, nom in erreurs:
        reponses = list(base)
        reponses[i] = rep
        out.append(spec(desc + ' : ' + nom, vi, v, 'incorrect', reponses, resoudre(msg, v)))
    return out


FONC = '{{if:f==0|\\cos|}}{{if:f==1|\\sin|}}{{if:f==2|\\tan|}}'
FONC_INV = '{{if:f==0|\\cos|}}{{if:f==1|\\sin|}}{{if:f==2|\\tan|}}^{-1}'
FONC_MOT = '{{if:f==0|cos|}}{{if:f==1|sin|}}{{if:f==2|tan|}}'
GARDE = ' Garde les valeurs exactes dans la calculatrice jusqu\'au dernier calcul.'
E_RAD = ('Ta calculatrice est réglée en radians : règle-la en **degrés** avant de calculer '
         'avec un angle en degrés.')

# Noms des sommets tirés (comme 57c73be1)
JEUX = [('A', 'B', 'C'), ('R', 'S', 'T'), ('E', 'F', 'G')]
A, B, C = (lettre(JEUX, i) for i in range(3))
ABC = A + B + C
HYP, ADJ, OPP = B + C, A + B, A + C          # pour l'angle en B
ANGLE_B = '\\widehat{' + ABC + '}'


def figure_de(statement):
    debut = statement.index('```figure')
    fin = statement.index('```', debut + 3) + 3
    return statement[debut:fin]


with open(os.path.join(PUBLIES, '57c73be1.json'), encoding='utf-8') as fichier:
    FIG_B = figure_de(json.load(fichier)['variations'][0]['statement'])   # angle `b`, `s`, `o`


# =============================================================================================
# N1 — 3-061 : quel calcul donne la longueur ? Case choix, six calculs.
# v0 : longueur cherchée au numérateur (on multiplie) ; v1 : au dénominateur (on divise).
# f = 0 cos, 1 sin, 2 tan. Choix d'origine : 0-2 = k × cos, sin, tan ; 3-5 = k ÷ cos, sin, tan.
# =============================================================================================

def choix_n1():
    lignes = []
    for op in ('x', '/'):
        for fn in ('cos', 'sin', 'tan'):
            arg = '\\' + fn + '({{b}}' + DEG + ')'
            lignes.append('- ${{k}} \\times ' + arg + '$' if op == 'x'
                          else '- $\\dfrac{ {{k}} }{' + arg + '}$')
    return '```choix\n' + '\n'.join(lignes) + '\n```'


# v0 : f=0 connu BC, cherché AB ; f=1 connu BC, cherché AC ; f=2 connu AB, cherché AC
CONNU0 = '{{if:f==2|' + ADJ + '|' + HYP + '}}'
CHERCHE0 = '{{if:f==0|' + ADJ + '|' + OPP + '}}'
# v1 : f=0 connu AB, cherché BC ; f=1 connu AC, cherché BC ; f=2 connu AC, cherché AB
CONNU1 = '{{if:f==0|' + ADJ + '|' + OPP + '}}'
CHERCHE1 = '{{if:f==2|' + ADJ + '|' + HYP + '}}'
VARS_N1 = [var('s', '0..2'), var('o', '0..1'), var('f', '0..2'), var('b', '20..70'),
           var('k', '3..15')]
POSITIONS = ('Pour l\'angle $' + ANGLE_B + '$ : l\'**hypoténuse** est $' + HYP + '$, le **côté '
             'adjacent** est $' + ADJ + '$, le **côté opposé** est $' + OPP + '$.')
HINT_N1 = ('Écris le rapport ({{if:f==0|cosinus|}}{{if:f==1|sinus|}}{{if:f==2|tangente|}} ou un '
           'autre) qui contient la longueur connue et la longueur cherchée. Si la longueur '
           'cherchée est en haut du quotient, on multiplie ; si elle est en bas, on divise.')


def n1(connu, cherche, numerateur):
    if numerateur:
        quotient = '\\dfrac{' + cherche + '}{' + connu + '}'
        resultat = cherche + ' = {{k}} \\times ' + FONC + '({{b}}' + DEG + ')'
        regle = ('La longueur cherchée $' + cherche + '$ est au **numérateur** : on '
                 '**multiplie** la longueur connue par $' + FONC + '({{b}}' + DEG + ')$.')
        autres = ('Les calculs qui divisent par $' + FONC + '({{b}}' + DEG + ')$ placent $'
                  + cherche + '$ au dénominateur ; les autres rapports ne contiennent pas les '
                  'deux longueurs $' + connu + '$ et $' + cherche + '$.')
    else:
        quotient = '\\dfrac{' + connu + '}{' + cherche + '}'
        resultat = cherche + ' = \\dfrac{ {{k}} }{' + FONC + '({{b}}' + DEG + ')}'
        regle = ('La longueur cherchée $' + cherche + '$ est au **dénominateur** : on '
                 '**divise** la longueur connue par $' + FONC + '({{b}}' + DEG + ')$.')
        autres = ('Les calculs qui multiplient par $' + FONC + '({{b}}' + DEG + ')$ placent $'
                  + cherche + '$ au numérateur ; les autres rapports ne contiennent pas les '
                  'deux longueurs $' + connu + '$ et $' + cherche + '$.')
    return variation(
        'Le triangle $' + ABC + '$ est rectangle en $' + A + '$. On donne $' + ANGLE_B
        + ' = {{b}}' + DEG + '$ et $' + connu + ' = {{k}}~\\unit{cm}$. Quel calcul donne la '
        'longueur $' + cherche + '$ ?\n\n' + FIG_B + '\n\n' + choix_n1(),
        VARS_N1,
        [case('{{f}}' if numerateur else '{{eval:f+3}}')],
        [POSITIONS,
         'Le rapport qui contient $' + connu + '$ et $' + cherche + '$ : $$' + FONC + ANGLE_B
         + ' = ' + quotient + '$$',
         regle + ' $$' + couleur(resultat) + '$$',
         autres],
        HINT_N1,
    )


N1_V0 = n1(CONNU0, CHERCHE0, True)
N1_V1 = n1(CONNU1, CHERCHE1, False)
W = {'s': 0, 'o': 0, 'b': 40, 'k': 12}
SPECS_N1 = [
    spec('v0 cos : AB = 12 × cos 40°', 0, {**W, 'f': 0}, 'correct', ['0']),
    spec('v0 cos : division au lieu de multiplication', 0, {**W, 'f': 0}, 'incorrect', ['3']),
    spec('v0 cos : sinus au lieu du cosinus', 0, {**W, 'f': 0}, 'incorrect', ['1']),
    spec('v0 tan : AC = 12 × tan 40°', 0, {**W, 's': 1, 'o': 1, 'f': 2}, 'correct', ['2']),
    spec('v0 tan : division par la tangente', 0, {**W, 's': 1, 'o': 1, 'f': 2}, 'incorrect',
         ['5']),
    spec('v1 sin : BC = 12 ÷ sin 40°', 1, {**W, 'f': 1}, 'correct', ['4']),
    spec('v1 sin : multiplication au lieu de division', 1, {**W, 'f': 1}, 'incorrect', ['1']),
    spec('v1 sin : cosinus au lieu du sinus', 1, {**W, 'f': 1}, 'incorrect', ['3']),
    spec('v1 tan : AB = 12 ÷ tan 40°', 1, {**W, 's': 2, 'f': 2}, 'correct', ['5']),
    spec('v1 cos : BC = 12 ÷ cos 40°', 1, {**W, 'f': 0}, 'correct', ['3']),
]

ecrire('n1-quel-calcul-donne-la-longueur', modele(
    'Quel calcul donne la longueur ? (trigonométrie)',
    'Choisir le calcul (× ou ÷ cos, sin, tan) qui donne une longueur d\'un triangle rectangle, '
    'sans calculer : longueur cherchée au numérateur ou au dénominateur du rapport',
    1, 60, [N1_V0, N1_V1], SPECS_N1))


# =============================================================================================
# N2 — 3-061 : résoudre une équation trigonométrique, sans figure.
# v0 : FONC(b°) = AC / k ; v1 : FONC(b°) = k / AC ; v2 : FONC(B) = p / q (angle).
# =============================================================================================

# Lagrange en f : 1 pour la fonction tirée, 0 pour les deux autres
L0, L1, L2 = '(f-1)*(f-2)/2', '(-f*(f-2))', 'f*(f-1)/2'


def selon_f(cos_, sin_, tan_):
    return f'{L0}*{cos_} + {L1}*{sin_} + {L2}*{tan_}'


RB = 'b*\\pi/180'
T = selon_f(f'cos({RB})', f'sin({RB})', f'tan({RB})')
TR = selon_f('cos(b)', 'sin(b)', 'tan(b)')
LONG = A + C
ANG = '\\widehat{' + B + '}'
VARS_N2 = [var('s', '0..2'), var('f', '0..2'), var('b', '25..75'), var('kk', '30..90'),
           var('k', 'eval:kk/10'), var('t', 'eval:' + T), var('tr', 'eval:' + TR)]
ARG = FONC + '({{b}}' + DEG + ')'
K = ev('k')


def n2_longueur(numerateur):
    if numerateur:
        juste, egalite = 'k*t', '\\dfrac{' + LONG + '}{' + K + '}'
        etape = LONG + ' = ' + K + ' \\times ' + ARG
        erreurs = [
            ('k/t', 'La longueur $' + LONG + '$ est au **numérateur** : on multiplie par '
             'la valeur du ' + FONC_MOT + ', on ne divise pas.', 'Division au lieu de '
             'multiplication'),
            ('k*tr', E_RAD, 'Calculatrice en radians'),
        ]
    else:
        juste, egalite = 'k/t', '\\dfrac{' + K + '}{' + LONG + '}'
        etape = LONG + ' = \\dfrac{' + K + '}{' + ARG + '}'
        erreurs = [
            ('k*t', 'La longueur $' + LONG + '$ est au **dénominateur** : on divise par la '
             'valeur du ' + FONC_MOT + ', on ne multiplie pas.', 'Multiplication au lieu de '
             'division'),
            ('t/k', 'Tu as renversé le quotient : $' + LONG + '$ est égale à la longueur '
             'connue **divisée par** la valeur du ' + FONC_MOT + '.', 'Quotient renversé'),
            ('k/tr', E_RAD, 'Calculatrice en radians'),
        ]
    valeurs = [juste] + [e[0] for e in erreurs]
    return variation(
        'On sait que $' + ARG + ' = ' + egalite + '$, où $' + LONG + '$ est une longueur en '
        'centimètres. Calcule $' + LONG + '$, arrondie au dixième.\n\n$' + LONG + ' \\approx '
        '?~\\unit{cm}$',
        VARS_N2,
        [case(ev(r10(juste)), [erreur(ev(r10(x)), msg, lab) for x, msg, lab in erreurs])],
        ['On isole $' + LONG + '$ : $$' + etape + '$$',
         'À la calculatrice, en degrés : $$' + LONG + ' \\approx ' + couleur(ev(r10(juste))
                                                                           + '~\\unit{cm}')
         + '$$ (arrondi au dixième).'],
        'Écris l\'égalité des produits en croix, ou demande-toi : la longueur cherchée est-elle '
        'en haut ou en bas du quotient ? En haut, on multiplie ; en bas, on divise.',
        [arrondi_net(juste, 10), 'round(10*(k*t)) >= 1']
        + tous_distincts([f'round(10*({x}))' for x in valeurs]),
    ), erreurs


N2_V0, E_N2_V0 = n2_longueur(True)
N2_V1, E_N2_V1 = n2_longueur(False)


def vars_n2(s, f, b, kk):
    k = kk / 10
    fn = [math.cos, math.sin, math.tan][f]
    return {'s': s, 'f': f, 'b': b, 'kk': kk, 'k': k, 't': repr(fn(rad(b))),
            'tr': repr(fn(b))}


def val_n2(v, expr):
    k, t, tr = float(v['k']), float(v['t']), float(v['tr'])
    return {'k*t': k * t, 'k/t': k / t, 'k*tr': k * tr, 't/k': t / k, 'k/tr': k / tr}[expr]


SPECS_N2 = []
for vi, (vv, juste, errs) in enumerate([
        (vars_n2(0, 0, 40, 42), 'k*t', E_N2_V0),     # AC = 4,2 cos 40° ≈ 3,2
        (vars_n2(1, 2, 35, 68), 'k/t', E_N2_V1),     # RT = 6,8 / tan 35° ≈ 9,7
]):
    SPECS_N2.append(spec(f'v{vi} : {juste} ≈ {fr(val_n2(vv, juste), 1)}', vi, vv, 'correct',
                         [fr(val_n2(vv, juste), 1)]))
    SPECS_N2.append(spec(f'v{vi} : non arrondi', vi, vv, 'incorrect',
                         [fr(val_n2(vv, juste), 3)]))
    for x, msg, lab in errs:
        SPECS_N2.append(spec(f'v{vi} : {lab}', vi, vv, 'incorrect', [fr(val_n2(vv, x), 1)],
                             resoudre(msg, vv)))
V1_SIN = vars_n2(2, 1, 50, 57)
SPECS_N2.append(spec('v1 sin : FG = 5,7 / sin 50°', 1, V1_SIN, 'correct',
                     [fr(val_n2(V1_SIN, 'k/t'), 1)]))

# v2 : l'angle. p < q pour cos et sin ; p ≠ q pour tan.
ANG_N2 = ('{{if:f==0|{{eval:acos(p/q)*180/\\pi}}|}}{{if:f==1|{{eval:asin(p/q)*180/\\pi}}|}}'
          '{{if:f==2|{{eval:atan(p/q)*180/\\pi}}|}}')
TOUCHE = '{{if:f==2|{{eval:round(ang)}}|{{eval:90-round(ang)}}}}'
E_QUOTIENT = ('Tu as donné la valeur du ' + FONC_MOT + ' de l\'angle, pas l\'angle : il faut '
              'encore la touche ' + FONC_MOT + '⁻¹ de la calculatrice.')
E_TOUCHE = ('Tu as utilisé la touche {{if:f==0|sin⁻¹|cos⁻¹}} : l\'égalité donne le '
            + FONC_MOT + ' de l\'angle, il faut la touche ' + FONC_MOT + '⁻¹.')
E_RAD_ANGLE = ('Ta calculatrice est réglée en radians : règle-la en **degrés** pour obtenir '
               'l\'angle en degrés.')
P, Q = ev('p'), ev('q')
N2_V2 = variation(
    'On sait que $' + FONC + ANG + ' = \\dfrac{' + P + '}{' + Q + '}$. Calcule la mesure de '
    'l\'angle $' + ANG + '$, arrondie au degré.\n\n$' + ANG + ' \\approx ?' + DEG + '$',
    [var('s', '0..2'), var('f', '0..2'), var('pp', '30..90'), var('qq', '30..90'),
     var('p', 'eval:pp/10'), var('q', 'eval:qq/10'), var('ang', ANG_N2)],
    [case('{{eval:round(ang)}}', [
        erreur('{{eval:round(100*p/q)/100;d}}', E_QUOTIENT, 'Quotient pris pour l\'angle'),
        erreur(TOUCHE, E_TOUCHE, 'Mauvaise touche inverse'),
        erreur('{{eval:round(100*ang*\\pi/180)/100;d}}', E_RAD_ANGLE, 'Calculatrice en radians'),
    ])],
    ['On cherche l\'angle dont le ' + FONC_MOT + ' vaut $\\dfrac{' + P + '}{' + Q + '}$ : '
     'c\'est la touche $' + FONC_INV + '$ de la calculatrice, en degrés.',
     '$$' + ANG + ' = ' + FONC_INV + '\\left(\\dfrac{' + P + '}{' + Q + '}\\right) \\approx '
     + couleur('{{eval:round(ang)}}' + DEG) + '$$ (arrondi au degré).'],
    'L\'égalité donne la valeur du ' + FONC_MOT + ' de l\'angle. Pour remonter à l\'angle, '
    'utilise la touche inverse ' + FONC_MOT + '⁻¹ (souvent `2nde` ou `shift`), en degrés.',
    ['pp != qq', '(f-2)*(pp-qq) >= 0', 'round(ang) >= 10', 'round(ang) <= 80',
     arrondi_net('ang', 1), 'round(ang) != 45',
     'round(100*p/q) != round(100*ang*\\pi/180)'],
)


def vars_n2_angle(s, f, pp, qq):
    p, q = pp / 10, qq / 10
    a = deg([math.acos, math.asin, math.atan][f](p / q))
    return {'s': s, 'f': f, 'pp': pp, 'qq': qq, 'p': p, 'q': q, 'ang': repr(a)}


V2_COS = vars_n2_angle(0, 0, 42, 75)     # cos B = 4,2/7,5 → 56°
V2_TAN = vars_n2_angle(1, 2, 81, 47)     # tan S = 8,1/4,7 → 60°
a_cos, a_tan = float(V2_COS['ang']), float(V2_TAN['ang'])
SPECS_N2 += [
    spec('v2 cos B = 4,2/7,5 : B ≈ 56°', 2, V2_COS, 'correct', [fr(a_cos)]),
    spec('v2 : quotient pris pour l\'angle', 2, V2_COS, 'incorrect', [fr(4.2 / 7.5, 2)],
         resoudre(E_QUOTIENT, V2_COS)),
    spec('v2 : sin⁻¹ au lieu de cos⁻¹', 2, V2_COS, 'incorrect', [str(90 - int(rnd(a_cos)))],
         resoudre(E_TOUCHE, V2_COS)),
    spec('v2 : radians', 2, V2_COS, 'incorrect', [fr(rad(a_cos), 2)],
         resoudre(E_RAD_ANGLE, V2_COS)),
    spec('v2 tan S = 8,1/4,7 : S ≈ 60°', 2, V2_TAN, 'correct', [fr(a_tan)]),
    spec('v2 tan : non arrondi', 2, V2_TAN, 'incorrect', [fr(a_tan, 1)]),
]

ecrire('n2-resoudre-une-equation-trigonometrique', modele(
    'Résoudre une équation trigonométrique',
    'Sans figure : trouver une longueur dans cos(40°) = AC/4,2 ou cos(40°) = 4,2/AC, ou un '
    'angle dans cos B = 4,2/7,5 (cos, sin ou tan ; touche inverse, calculatrice en degrés)',
    1, 90, [N2_V0, N2_V1, N2_V2], SPECS_N2))


# =============================================================================================
# N3 — 3-061 : deux triangles rectangles accolés, tous les angles.
# ABC rectangle en B, ACD rectangle en A, côté [AC] commun. On donne BA, AD et un angle :
# v0 BAC (en A), v1 BCA (en C). Trois cases au degré : le 3e angle de ABC, ACD, ADC.
# Figure : [AC] horizontal (dessiné 5), B dessous, D au-dessus.
# =============================================================================================

def fig_n3(marque):
    return figure(
        '0 ; 8 ; 0.5 ; ' + ev('round(10*(4.2+5*ad/ac))/10'),
        'Triangle ABC rectangle en B et triangle ACD rectangle en A, accolés par le côté [AC].',
        ['A = point(1.5, 3.5, etiquette="gauche")',
         'C = point(6.5, 3.5, etiquette="droite")',
         'B = point(A, longueur=5*cos({{al}}), angle=-{{al}}, etiquette="bas")',
         'D = point(A, longueur=' + ev('round(100*5*ad/ac)/100') + ', angle=90, '
         'etiquette="haut")',
         'segment(A, B)', 'segment(B, C)', 'segment(C, A)', 'segment(A, D)', 'segment(D, C)',
         'angle(C, B, A, marque="carre")', 'angle(C, A, D, marque="carre")', marque])


AC_EXACT = 'ba/cos(al*\\pi/180)'
EARLY = 'atan(ad/(round(10*ac)/10))*180/\\pi'
E_OUBLI_90 = ('La somme des angles d\'un triangle vaut 180° : n\'oublie pas l\'angle droit '
              '(90°) dans le calcul.')
E_TOT = ('Tu as arrondi AC avant de t\'en servir : garde la valeur exacte de AC dans la '
         'calculatrice.')
E_RENV_TAN = ('Tu as renversé la tangente : pour l\'angle en C, le côté opposé est [AD] et le '
              'côté adjacent est [AC], donc tan = AD ÷ AC.')
HINT_N3 = ('Commence par le triangle ABC : la somme de ses angles donne le troisième, et un '
           'rapport trigonométrique donne AC. Ensuite, dans le triangle ACD rectangle en A, tu '
           'connais les deux côtés de l\'angle droit.')


def n3(en_a):
    donne = '\\widehat{BAC}' if en_a else '\\widehat{BCA}'
    autre = '\\widehat{BCA}' if en_a else '\\widehat{BAC}'
    marque = 'angle(B, A, C)' if en_a else 'angle(A, C, B)'
    rapport_ac = ('\\cos\\widehat{BAC} = \\dfrac{BA}{AC}' if en_a
                  else '\\sin\\widehat{BCA} = \\dfrac{BA}{AC}')
    calcul_ac = ('AC = \\dfrac{ {{ba}} }{\\cos({{a}}' + DEG + ')}' if en_a
                 else 'AC = \\dfrac{ {{ba}} }{\\sin({{a}}' + DEG + ')}')
    return variation(
        'Le triangle $ABC$ est rectangle en $B$ et le triangle $ACD$ est rectangle en $A$. On '
        'donne $BA = {{ba}}~\\unit{cm}$, $AD = ' + ev('ad') + '~\\unit{cm}$ et $' + donne
        + ' = {{a}}' + DEG + '$. Calcule les angles ci-dessous, arrondis au degré.' + GARDE
        + '\n\n' + fig_n3(marque) + '\n\n$' + autre + ' = ?' + DEG + '$\n\n$\\widehat{ACD} '
        '\\approx ?' + DEG + '$\n\n$\\widehat{ADC} \\approx ?' + DEG + '$',
        [var('ba', '4..7'), var('a', '25..65'),
         var('al', 'eval:a' if en_a else 'eval:90-a'), var('ac', 'eval:' + AC_EXACT),
         var('r', '70..120'), var('ad', 'eval:round(r*ac/10)/10'),
         var('acd', 'eval:atan(ad/ac)*180/\\pi')],
        [case('{{eval:90-a}}', [erreur('{{eval:180-a}}', E_OUBLI_90, 'Angle droit oublié')]),
         case('{{eval:round(acd)}}', [
             erreur('{{eval:round(' + EARLY + ')}}', E_TOT, 'AC arrondi trop tôt'),
             erreur('{{eval:90-round(acd)}}', E_RENV_TAN, 'Tangente renversée'),
         ]),
         case('{{eval:90-round(acd)}}', [
             erreur('{{eval:180-round(acd)}}', E_OUBLI_90, 'Angle droit oublié')])],
        ['Dans le triangle $ABC$, la somme des angles vaut $180' + DEG + '$ : $$' + autre
         + ' = 180' + DEG + ' - 90' + DEG + ' - {{a}}' + DEG + ' = '
         + couleur('{{eval:90-a}}' + DEG) + '$$',
         'Dans le triangle $ABC$ rectangle en $B$, l\'hypoténuse est $[AC]$ : $$' + rapport_ac
         + ' \\quad\\text{donc}\\quad ' + calcul_ac + ' \\approx ' + ev('round(100*ac)/100')
         + '~\\unit{cm}$$ On garde cette valeur exacte dans la calculatrice.',
         'Dans le triangle $ACD$ rectangle en $A$ : $$\\tan\\widehat{ACD} = \\dfrac{AD}{AC} '
         '\\quad\\text{donc}\\quad \\widehat{ACD} \\approx ' + couleur('{{eval:round(acd)}}'
                                                                     + DEG) + '$$',
         'La somme des angles du triangle $ACD$ : $$\\widehat{ADC} \\approx 180' + DEG
         + ' - 90' + DEG + ' - {{eval:round(acd)}}' + DEG + ' = '
         + couleur('{{eval:90-round(acd)}}' + DEG) + '$$'],
        HINT_N3,
        ['abs(ad - ac) >= 0.3', arrondi_net('acd', 1), 'round(acd) != 45',
         f'round({EARLY}) != 90-round(acd)'],
    )


N3_V0, N3_V1 = n3(True), n3(False)


def vars_n3(en_a, ba, a, r):
    al = a if en_a else 90 - a
    ac = ba / math.cos(rad(al))
    ad = rnd(r * ac / 10) / 10
    acd = deg(math.atan(ad / ac))
    early = deg(math.atan(ad / rnd(ac, 1)))
    return ({'ba': ba, 'a': a, 'al': al, 'ac': repr(ac), 'r': r, 'ad': ad, 'acd': repr(acd)},
            acd, early)


SPECS_N3 = []
for vi, (en_a, ba, a, r) in enumerate([(True, 5, 40, 90), (False, 6, 35, 110)]):
    vv, acd, early = vars_n3(en_a, ba, a, r)
    juste = [str(90 - a), fr(acd), str(90 - int(rnd(acd)))]
    SPECS_N3.append(spec(f'v{vi} : BA = {ba}, angle {a}°, AD = {vv["ad"]} : {juste}', vi, vv,
                         'correct', juste))
    SPECS_N3 += specs_erreurs(vi, vv, juste, 0, [(str(180 - a), E_OUBLI_90, 'angle droit '
                                                  'oublié')], f'v{vi}')
    errs2 = [(str(90 - int(rnd(acd))), E_RENV_TAN, 'tangente renversée')]
    if fr(early) != fr(acd):
        errs2.append((fr(early), E_TOT, 'AC arrondi trop tôt'))
    SPECS_N3 += specs_erreurs(vi, vv, juste, 1, errs2, f'v{vi}')
    SPECS_N3 += specs_erreurs(vi, vv, juste, 2, [(str(180 - int(rnd(acd))), E_OUBLI_90,
                                                  'angle droit oublié')], f'v{vi}')

ecrire('n3-deux-triangles-accoles-tous-les-angles', modele(
    'Deux triangles rectangles accolés : tous les angles',
    'Triangles ABC rectangle en B et ACD rectangle en A accolés par [AC] : on donne BA, AD et '
    'un angle ; calculer les trois autres angles au degré (somme des angles, AC par cos ou '
    'sin gardé exact, puis tan)',
    2, 240, [N3_V0, N3_V1], SPECS_N3))


# =============================================================================================
# N4 — 3-061 : problèmes concrets. Une figure plane par variation.
# =============================================================================================

RA, RB_ = 'a*\\pi/180', 'b*\\pi/180'

# --- v0 : la rivière. A observateur, B sur la rive, (AB) ⟂ (BS) ; C sur la rive proche, S sur
# la rive d'en face. BC = d tan α, CS = d (tan β − tan α). Au mètre.
FIG_RIVIERE = figure(
    '0 ; 7 ; 0 ; ' + ev('round(10*(1.7+4*tan(b*\\pi/180)))/10'),
    'Vue de dessus : la rivière entre deux rives parallèles ; B, C, S alignés '
    'perpendiculairement aux rives ; A sur la rive, (AB) perpendiculaire à (BS).',
    ['B = point(1.5, 1, etiquette="bas-gauche")',
     'A = point(5.5, 1, etiquette="bas-droite")',
     'C = point(1.5, 1+4*tan({{a}}), etiquette="gauche")',
     'S = point(1.5, 1+4*tan({{b}}), etiquette="haut-gauche")',
     'R1 = point(0, 1+4*tan({{a}}), visible=faux)',
     'R2 = point(7, 1+4*tan({{a}}), visible=faux)',
     'R3 = point(0, 1+4*tan({{b}}), visible=faux)',
     'R4 = point(7, 1+4*tan({{b}}), visible=faux)',
     'segment(R1, R2, couleur="bleu")', 'segment(R3, R4, couleur="bleu")',
     'texte(5, 1+2*tan({{a}})+2*tan({{b}}), "rivière")',
     'segment(A, B)', 'segment(B, S)', 'segment(A, C)', 'segment(A, S)',
     'angle(A, B, S, marque="carre")', 'angle(C, A, B)', 'angle(S, A, B)'])
BC_ = 'd*tan(' + RA + ')'
BS_ = 'd*tan(' + RB_ + ')'
CS_ = f'{BS_} - {BC_}'
E_SIN = ('Dans le triangle rectangle, les deux côtés de l\'angle droit sont reliés par la '
         '**tangente** : le sinus fait intervenir l\'hypoténuse.')
E_DIV = ('La longueur cherchée est le côté **opposé** à l\'angle, au numérateur de la '
         'tangente : on multiplie, on ne divise pas.')
E_SOMME = ('BS et BC partent tous les deux de B : la largeur CS est leur **différence**, pas '
           'leur somme.')
E_BS = ('Tu as calculé BS, de B jusqu\'à l\'arbre : la largeur de la rivière est CS = BS − BC.')
E_TOT_M = ('Tu as arrondi un résultat intermédiaire : garde les valeurs exactes dans la '
           'calculatrice jusqu\'au dernier calcul.')
N4_V0 = variation(
    'Pour mesurer la largeur d\'une rivière, Inès se place en $A$, à {{d}} m du point $B$ de la '
    'rive. Les points $B$, $C$ et $S$ sont alignés, perpendiculairement aux rives : $C$ est au '
    'bord de la rive proche, $S$ est un arbre sur la rive d\'en face, et $(AB) \\perp (BS)$. '
    'Elle mesure $\\widehat{BAC} = {{a}}' + DEG + '$ et $\\widehat{BAS} = {{b}}' + DEG + '$.'
    + GARDE + '\n\n' + FIG_RIVIERE + '\n\nLa distance $BC$, arrondie au mètre : $BC \\approx '
    '?~\\unit{m}$\n\nLa largeur $CS$ de la rivière, arrondie au mètre : $CS \\approx '
    '?~\\unit{m}$',
    [var('d', '20..60'), var('a', '20..40'), var('ec', '10..25'), var('b', 'eval:a+ec')],
    [case(ev(f'round({BC_})', False), [
        erreur(ev(f'round(d*sin({RA}))', False), E_SIN, 'Sinus au lieu de la tangente'),
        erreur(ev(f'round(d/tan({RA}))', False), E_DIV, 'Division au lieu de multiplication'),
    ]),
     case(ev(f'round({CS_})', False), [
         erreur(ev(f'round({BS_} + {BC_})', False), E_SOMME, 'Somme au lieu de différence'),
         erreur(ev(f'round({BS_})', False), E_BS, 'BS au lieu de CS'),
         erreur(ev(f'round({BS_}) - round({BC_})', False), E_TOT_M, 'Arrondi trop tôt'),
     ])],
    ['Dans le triangle $ABC$ rectangle en $B$ : $$\\tan\\widehat{BAC} = \\dfrac{BC}{AB} '
     '\\quad\\text{donc}\\quad BC = {{d}} \\times \\tan({{a}}' + DEG + ') \\approx '
     + couleur(ev(f'round({BC_})', False) + '~\\unit{m}') + '$$',
     'De même, dans le triangle $ABS$ rectangle en $B$ : $$BS = {{d}} \\times \\tan({{b}}'
     + DEG + ')$$',
     'La largeur de la rivière : $$CS = BS - BC = {{d}} \\times \\tan({{b}}' + DEG + ') - '
     '{{d}} \\times \\tan({{a}}' + DEG + ') \\approx ' + couleur(ev(f'round({CS_})', False)
                                                                  + '~\\unit{m}') + '$$'],
    'Les triangles $ABC$ et $ABS$ sont rectangles en $B$ et ont le côté $[AB]$ en commun : la '
    'tangente de chaque angle en $A$ donne $BC$ et $BS$.',
    ['b <= 60', arrondi_net(BC_, 1), arrondi_net(CS_, 1)]
    + tous_distincts([f'round({BC_})', f'round(d*sin({RA}))', f'round(d/tan({RA}))'])
    + tous_distincts([f'round({CS_})', f'round({BS_} + {BC_})', f'round({BS_})'])
    + [f'round({BS_}) - round({BC_}) != round({BS_})',
       f'round({BS_}) - round({BC_}) != round({BS_} + {BC_})'],
)

# --- v1 : le parallèle terrestre. Coupe plane : cercle de centre O, rayon R = 6 371 km.
# P de latitude λ (angle EOP), H sur l'axe des pôles, (HP) ∥ (OE) donc OPH = λ.
# HP = R cos λ ; longueur du parallèle = 2π × HP. Au km.
FIG_TERRE = figure(
    '0 ; 8 ; 0 ; 8',
    'Coupe de la Terre : cercle de centre O, axe des pôles [NS], équateur, point P du cercle, '
    'H sur l\'axe des pôles avec (HP) perpendiculaire à l\'axe.',
    ['O = point(4, 4, etiquette="bas-gauche")',
     'cercle(O, rayon=3.2)',
     'N = point(O, longueur=3.2, angle=90, etiquette="haut")',
     'S = point(O, longueur=3.2, angle=-90, etiquette="bas")',
     'E = point(O, longueur=3.2, angle=0, etiquette="droite")',
     'W = point(O, longueur=3.2, angle=180, visible=faux)',
     'P = point(O, longueur=3.2, angle={{l}}, etiquette="haut-droite")',
     'H = point(O, longueur=3.2*sin({{l}}), angle=90, etiquette="gauche")',
     'segment(N, S)', 'segment(W, E, trait="tirets")', 'segment(O, P)', 'segment(H, P)',
     'angle(O, H, P, marque="carre")', 'angle(E, O, P)', 'angle(H, P, O)'])
R_T = 6371
HP_ = f'{R_T}*cos(l*\\pi/180)'
LP_ = f'2*\\pi*{HP_}'
E_SIN_HP = ('Dans le triangle OHP rectangle en H, [HP] est le côté **adjacent** à l\'angle '
            'OPH : c\'est le cosinus, pas le sinus.')
E_DIV_HP = ('HP est au **numérateur** du cosinus (HP ÷ OP) : on multiplie le rayon par le '
            'cosinus, on ne divise pas.')
E_RAYON = ('Le parallèle de P est un cercle de rayon **HP**, pas de rayon 6 371 km : ce serait '
           'la longueur de l\'équateur.')
E_PI = 'La longueur d\'un cercle de rayon r est 2 × π × r : tu as oublié le facteur 2.'
N4_V1 = variation(
    'On représente la Terre par une sphère de centre $O$ et de rayon $6\\,371~\\unit{km}$. '
    'Ci-dessous, sa coupe par le plan qui contient l\'axe des pôles $[NS]$ et une ville $P$. '
    'La latitude de $P$ est $\\widehat{EOP} = {{l}}' + DEG + '$. $H$ est le centre du '
    'parallèle de $P$ : $(HP)$ est perpendiculaire à l\'axe des pôles, donc parallèle à '
    '$(OE)$, et $\\widehat{OPH} = \\widehat{EOP}$.' + GARDE + '\n\n' + FIG_TERRE + '\n\nLe '
    'rayon $HP$ du parallèle, arrondi au kilomètre : $HP \\approx ?~\\unit{km}$\n\nLa '
    'longueur du parallèle de $P$, arrondie au kilomètre : $\\approx ?~\\unit{km}$',
    [var('l', '20..70')],
    [case(ev(f'round({HP_})', False), [
        erreur(ev(f'round({R_T}*sin(l*\\pi/180))', False), E_SIN_HP, 'Sinus au lieu du '
               'cosinus'),
        erreur(ev(f'round({R_T}/cos(l*\\pi/180))', False), E_DIV_HP, 'Division au lieu de '
               'multiplication'),
    ]),
     case(ev(f'round({LP_})', False), [
         erreur(ev(f'round(2*\\pi*{R_T})', False), E_RAYON, 'Rayon de la Terre'),
         erreur(ev(f'round(\\pi*{HP_})', False), E_PI, 'Facteur 2 oublié'),
         erreur(ev(f'round(2*\\pi*round({HP_}))', False), E_TOT_M, 'Arrondi trop tôt'),
     ])],
    ['Dans le triangle $OHP$ rectangle en $H$, l\'hypoténuse est $[OP]$ (un rayon de la '
     'Terre) : $$\\cos\\widehat{OPH} = \\dfrac{HP}{OP} \\quad\\text{donc}\\quad HP = 6\\,371 '
     '\\times \\cos({{l}}' + DEG + ') \\approx ' + couleur(ev(f'round({HP_})', False)
                                                       + '~\\unit{km}') + '$$',
     'Le parallèle est un cercle de rayon $HP$ : $$2 \\times \\pi \\times HP \\approx '
     + couleur(ev(f'round({LP_})', False) + '~\\unit{km}') + '$$'],
    'Repère le triangle rectangle $OHP$ : son hypoténuse est un rayon de la Terre, et $[HP]$ '
    'est le côté adjacent à l\'angle $\\widehat{OPH}$.',
    [arrondi_net(HP_, 1), arrondi_net(LP_, 1)],
)

# --- v2 : la hauteur d'un arbre. Œil à e m du sol, à d m de l'arbre, angle α du sommet.
# KS = d tan α (au-dessus de l'œil), hauteur = e + d tan α. Au dixième de mètre.
FIG_ARBRE = figure(
    '0 ; 7 ; 0 ; ' + ev('round(10*(2.7+4.5*tan(a*\\pi/180)))/10'),
    'Vue de côté : une personne debout (pieds F, œil O) face à un arbre [TS] ; K sur l\'arbre '
    'à la hauteur de l\'œil, angle KOS marqué.',
    ['G1 = point(0, 1, visible=faux)', 'G2 = point(7, 1, visible=faux)',
     'segment(G1, G2)',
     'F = point(1, 1, etiquette="bas")', 'O = point(1, 2, etiquette="gauche")',
     'T = point(5.5, 1, etiquette="bas")', 'K = point(5.5, 2, etiquette="droite")',
     'S = point(5.5, 2+4.5*tan({{a}}), etiquette="haut")',
     'segment(F, O, epaisseur=3)', 'segment(T, S, couleur="vert", epaisseur=3)',
     'segment(O, K, trait="tirets")', 'segment(O, S, trait="tirets")',
     'angle(S, K, O, marque="carre")', 'angle(K, O, S)'])
KS_ = f'd*tan({RA})'
HT_ = f'oe + {KS_}'
E_OEIL = ('C\'est la hauteur au-dessus de l\'œil : ajoute la hauteur de l\'œil pour avoir la '
          'hauteur de l\'arbre.')
E_SIN_K = ('Les côtés [OK] et [KS] sont les deux côtés de l\'angle droit : c\'est la '
           '**tangente** qui les relie.')
E_DIV_K = ('KS est le côté **opposé** à l\'angle, au numérateur de la tangente : on multiplie, '
           'on ne divise pas.')
N4_V2 = variation(
    'Pour estimer la hauteur d\'un arbre, Malo se place à {{d}} m de son pied. Ses yeux sont à '
    '$' + ev('oe') + '~\\unit{m}$ du sol, et il voit le sommet $S$ de l\'arbre sous un angle de '
    '${{a}}' + DEG + '$ au-dessus de l\'horizontale.' + GARDE + '\n\n' + FIG_ARBRE + '\n\nLa '
    'hauteur $KS$, au-dessus de l\'œil, arrondie au dixième : $KS \\approx ?~\\unit{m}$\n\nLa '
    'hauteur $TS$ de l\'arbre, arrondie au dixième : $TS \\approx ?~\\unit{m}$',
    [var('d', '10..80'), var('ee', '150..190'), var('oe', 'eval:ee/100'),
     var('a', '20..60')],
    [case(ev(r10(KS_)), [
        erreur(ev(r10(f'd*sin({RA})')), E_SIN_K, 'Sinus au lieu de la tangente'),
        erreur(ev(r10(f'd/tan({RA})')), E_DIV_K, 'Division au lieu de multiplication'),
    ]),
     case(ev(r10(HT_)), [
         erreur(ev(r10(KS_)), E_OEIL, 'Hauteur de l\'œil oubliée'),
         erreur(ev(r10(f'oe + {r10(KS_)}')), E_TOT_M, 'Arrondi trop tôt'),
     ])],
    ['Dans le triangle $OKS$ rectangle en $K$ : $$\\tan\\widehat{KOS} = \\dfrac{KS}{OK} '
     '\\quad\\text{donc}\\quad KS = {{d}} \\times \\tan({{a}}' + DEG + ') \\approx '
     + couleur(ev(r10(KS_)) + '~\\unit{m}') + '$$',
     'On ajoute la hauteur de l\'œil : $$TS = ' + ev('oe') + ' + {{d}} \\times \\tan({{a}}'
     + DEG + ') \\approx ' + couleur(ev(r10(HT_)) + '~\\unit{m}') + '$$'],
    'Le triangle rectangle part de l\'œil, pas du sol : calcule d\'abord la partie de l\'arbre '
    'au-dessus de l\'œil, puis ajoute la hauteur de l\'œil.',
    [arrondi_net(KS_, 10), arrondi_net(HT_, 10)]
    + tous_distincts([f'round(10*({x}))' for x in (KS_, f'd*sin({RA})', f'd/tan({RA})')])
    + tous_distincts([f'round(10*({x}))' for x in (HT_, KS_)])
    + [f'round(10*(oe + {r10(KS_)})) != round(10*({KS_}))'],
)

# --- v3 : la falaise vue de deux points. A, B, H alignés au sol, S sommet, H pied.
# α en A, β en B (plus près). BH = d tan α / (tan β − tan α), h = BH tan β. Au mètre.
FIG_FALAISE = figure(
    '0 ; 9 ; 0 ; ' + ev('round(10*(1.7+7*tan(a*\\pi/180)))/10'),
    'Vue de côté : une falaise [HS] verticale ; A et B au sol, alignés avec H ; angles HAS et '
    'HBS marqués.',
    ['A = point(1, 1, etiquette="bas")',
     'B = point(1+7*(1-tan({{a}})/tan({{b}})), 1, etiquette="bas")',
     'H = point(8, 1, etiquette="bas")',
     'S = point(8, 1+7*tan({{a}}), etiquette="haut")',
     'segment(A, H)', 'segment(H, S, epaisseur=3)', 'segment(A, S)', 'segment(B, S)',
     'angle(S, H, A, marque="carre")', 'angle(H, A, S)', 'angle(H, B, S)'])
TA, TB = f'tan({RA})', f'tan({RB_})'
X_ = f'd*{TA}/({TB} - {TA})'
H_ = f'{X_}*{TB}'
E_AH = ('Tu as calculé AH, depuis le point A : on demande BH, la distance depuis le point le '
        'plus proche.')
E_ANGLE_A = ('Depuis B, on voit le sommet sous l\'angle HBS = β : avec BH, c\'est tan β qu\'il '
             'faut utiliser.')
N4_V3 = variation(
    'Pour mesurer la hauteur d\'une falaise $[HS]$, on vise son sommet $S$ depuis deux points '
    '$A$ et $B$ alignés avec son pied $H$, avec $AB = {{d}}~\\unit{m}$. On mesure $\\widehat{HAS}'
    ' = {{a}}' + DEG + '$ et $\\widehat{HBS} = {{b}}' + DEG + '$. On note $x = BH$ : la hauteur '
    '$HS$ vaut à la fois $x \\times \\tan({{b}}' + DEG + ')$ et $(x + {{d}}) \\times \\tan({{a}}'
    + DEG + ')$.' + GARDE + '\n\n' + FIG_FALAISE + '\n\nLa distance $BH$, arrondie au mètre : '
    '$BH \\approx ?~\\unit{m}$\n\nLa hauteur $HS$ de la falaise, arrondie au mètre : $HS '
    '\\approx ?~\\unit{m}$',
    [var('d', '20..80'), var('a', '20..40'), var('ec', '10..25'), var('b', 'eval:a+ec')],
    [case(ev(f'round({X_})', False), [
        erreur(ev(f'round({X_} + d)', False), E_AH, 'AH au lieu de BH'),
    ]),
     case(ev(f'round({H_})', False), [
         erreur(ev(f'round({X_}*{TA})', False), E_ANGLE_A, 'Mauvais angle'),
         erreur(ev(f'round(round({X_})*{TB})', False), E_TOT_M, 'Arrondi trop tôt'),
     ])],
    ['On écrit la hauteur de deux façons, dans les triangles $BHS$ et $AHS$ rectangles en $H$ : '
     '$$x \\times \\tan({{b}}' + DEG + ') = (x + {{d}}) \\times \\tan({{a}}' + DEG + ')$$',
     'On regroupe les $x$ : $$x \\times \\big(\\tan({{b}}' + DEG + ') - \\tan({{a}}' + DEG
     + ')\\big) = {{d}} \\times \\tan({{a}}' + DEG + ') \\quad\\text{donc}\\quad x = '
     '\\dfrac{ {{d}} \\times \\tan({{a}}' + DEG + ')}{\\tan({{b}}' + DEG + ') - \\tan({{a}}'
     + DEG + ')} \\approx ' + couleur(ev(f'round({X_})', False) + '~\\unit{m}') + '$$',
     'Avec la valeur exacte de $x$ : $$HS = x \\times \\tan({{b}}' + DEG + ') \\approx '
     + couleur(ev(f'round({H_})', False) + '~\\unit{m}') + '$$'],
    'L\'égalité de l\'énoncé est une équation d\'inconnue $x$ : développe, regroupe les termes '
    'en $x$ d\'un côté, puis divise.',
    ['b <= 65', arrondi_net(X_, 1), arrondi_net(H_, 1),
     f'round({X_}*{TA}) != round({H_})',
     f'round({X_}*{TA}) != round(round({X_})*{TB})'],
)

# --- v4 : le triangle inscrit. A, B, D alignés ; A, C, E alignés ; ADE rectangle en D, ABC
# rectangle en B. Angle DAE = cos⁻¹(AD/AE) au dixième de degré ; AB = AC cos Â au mm.
AN_ = 'acos(ad/ae)*180/\\pi'
AB_ = 'ac*ad/ae'
FIG_INSCRIT = figure(
    '0 ; 9.5 ; 0 ; ' + ev('round(10*(1.7+8*sin(an*\\pi/180)))/10'),
    'Triangle ADE rectangle en D ; B sur [AD] et C sur [AE], triangle ABC rectangle en B ; '
    'angle en A marqué.',
    ['A = point(1, 1, etiquette="bas-gauche")',
     'E = point(A, longueur=8, angle=' + ev('round(100*an)/100') + ', etiquette="haut")',
     'D = point(1+8*{{ad}}/{{ae}}, 1, etiquette="bas-droite")',
     'C = point(A, longueur=8*{{ac}}/{{ae}}, angle=' + ev('round(100*an)/100')
     + ', etiquette="haut-gauche")',
     'B = point(1+8*{{ac}}*{{ad}}/({{ae}}*{{ae}}), 1, etiquette="bas")',
     'segment(A, D)', 'segment(D, E)', 'segment(E, A)', 'segment(B, C)',
     'angle(E, D, A, marque="carre")', 'angle(C, B, A, marque="carre")', 'angle(D, A, E)'])
E_ASIN = ('[AD] est le côté **adjacent** à l\'angle en A : c\'est la touche cos⁻¹, pas sin⁻¹.')
E_QUOT_A = ('Tu as donné la valeur du cosinus, pas l\'angle : il faut encore la touche cos⁻¹ '
            'de la calculatrice.')
E_DIV_AB = ('AB est le côté **adjacent**, au numérateur du cosinus (AB ÷ AC) : on multiplie, on '
            'ne divise pas.')
E_SIN_AB = ('[AB] est le côté **adjacent** à l\'angle en A : c\'est le cosinus qui le relie à '
            'l\'hypoténuse [AC], pas le sinus.')
N4_V4 = variation(
    'Sur la figure, les points $A$, $B$, $D$ sont alignés, ainsi que les points $A$, $C$, $E$. '
    'Le triangle $ADE$ est rectangle en $D$ et le triangle $ABC$ est rectangle en $B$. On donne '
    '$AD = {{ad}}~\\unit{cm}$, $AE = {{ae}}~\\unit{cm}$ et $AC = {{ac}}~\\unit{cm}$.\n\n'
    + FIG_INSCRIT + '\n\nL\'angle $\\widehat{DAE}$, arrondi au dixième de degré : '
    '$\\widehat{DAE} \\approx ?' + DEG + '$\n\nLa longueur $AB$, arrondie au millimètre : $AB '
    '\\approx ?~\\unit{cm}$',
    [var('ae', '6..12'), var('ad', '3..11'), var('ac', '3..11'), var('an', 'eval:' + AN_)],
    [case(ev(r10('an')), [
        erreur(ev(r10('90-an')), E_ASIN, 'sin⁻¹ au lieu de cos⁻¹'),
        erreur(ev('round(100*ad/ae)/100'), E_QUOT_A, 'Quotient pris pour l\'angle'),
    ]),
     case(ev(r10(AB_)), [
         erreur(ev(r10('ac*ae/ad')), E_DIV_AB, 'Division au lieu de multiplication'),
         erreur(ev(r10('ac*sqrt(1-(ad/ae)^2)')), E_SIN_AB, 'Sinus au lieu du cosinus'),
     ])],
    ['Dans le triangle $ADE$ rectangle en $D$ : $$\\cos\\widehat{DAE} = \\dfrac{AD}{AE} = '
     '\\dfrac{ {{ad}} }{ {{ae}} } \\quad\\text{donc}\\quad \\widehat{DAE} \\approx '
     + couleur(ev(r10('an')) + DEG) + '$$',
     'Les angles $\\widehat{BAC}$ et $\\widehat{DAE}$ sont le même angle. Dans le triangle $ABC$ '
     'rectangle en $B$ : $$\\cos\\widehat{BAC} = \\dfrac{AB}{AC} \\quad\\text{donc}\\quad AB = '
     '{{ac}} \\times \\cos\\widehat{DAE} \\approx ' + couleur(ev(r10(AB_)) + '~\\unit{cm}')
     + '$$'],
    'Le même angle en $A$ appartient aux deux triangles rectangles : calcule-le dans $ADE$, '
    'puis sers-t\'en dans $ABC$.',
    ['ad < ae', 'ac < ae', 'ac != ad', 'an >= 25', 'an <= 65', arrondi_net('an', 10),
     arrondi_net(AB_, 10),
     'round(10*ac*cos((round(10*an)/10)*\\pi/180)) == round(10*' + AB_ + ')']
    + tous_distincts([f'round(10*({x}))' for x in (AB_, 'ac*ae/ad', 'ac*sqrt(1-(ad/ae)^2)')])
    + ['round(10*an) != round(10*(90-an))'],
)

# --- v5 : le terrain en pente. Longueur L le long de la pente, dénivelé h ; angle par le sinus
# au dixième de degré ; surcoût si la pente dépasse 8,5° (angles tirés loin du seuil).
ANG_P = 'asin(h/L)*180/\\pi'
FIG_PENTE = figure(
    '0 ; 8.6 ; 0 ; 3.4',
    'Vue de côté d\'un terrain en pente : triangle ABC rectangle en C, [AB] le long de la '
    'pente, [BC] le dénivelé.',
    ['A = point(1, 1, etiquette="bas-gauche")',
     'B = point(A, longueur=7, angle=' + ev('round(100*ang)/100') + ', etiquette="haut")',
     'C = point(1+7*cos(' + ev('round(100*ang)/100') + '), 1, etiquette="bas-droite")',
     'segment(A, B, epaisseur=3)', 'segment(B, C)', 'segment(A, C, trait="tirets")',
     'angle(B, C, A, marque="carre")', 'angle(C, A, B)'])
E_ACOS = ('[BC] est le côté **opposé** à l\'angle en A : c\'est la touche sin⁻¹, pas cos⁻¹.')
E_ATAN = ('[AB] est mesuré le long de la pente : c\'est l\'**hypoténuse**, donc le sinus, pas '
          'la tangente.')
N4_V5 = variation(
    'Un terrain en pente mesure $AB = {{L}}~\\unit{m}$ le long de la pente, pour un dénivelé '
    '$BC = ' + ev('h') + '~\\unit{m}$. Le terrassement coûte plus cher (surcoût) si l\'angle '
    '$\\widehat{BAC}$ de la pente dépasse $8{,}5' + DEG + '$.\n\n' + FIG_PENTE + '\n\nL\'angle '
    '$\\widehat{BAC}$, arrondi au dixième de degré : $\\widehat{BAC} \\approx ?' + DEG + '$\n\n'
    'Y a-t-il un surcoût ?\n\n```choix\nmelanger: non\n- Oui\n- Non\n```',
    [var('L', '20..60'), var('hh', '15..150'), var('h', 'eval:hh/10'), var('ang', 'eval:' + ANG_P)],
    [case(ev(r10('ang')), [
        erreur(ev(r10('90-ang')), E_ACOS, 'cos⁻¹ au lieu de sin⁻¹'),
        erreur(ev(r10('atan(h/L)*180/\\pi')), E_ATAN, 'Tangente au lieu du sinus'),
    ]),
     case('{{eval:1-floor(ang/8.5)}}')],
    ['Dans le triangle $ABC$ rectangle en $C$, l\'hypoténuse est $[AB]$ : $$\\sin\\widehat{BAC} '
     '= \\dfrac{BC}{AB} = \\dfrac{' + ev('h') + '}{ {{L}} } \\quad\\text{donc}\\quad '
     '\\widehat{BAC} \\approx ' + couleur(ev(r10('ang')) + DEG) + '$$',
     'On compare à $8{,}5' + DEG + '$ : ' + '{{if:k==0|la pente dépasse $8{,}5' + DEG + '$, **il y a un surcoût**.|la pente ne '
     'dépasse pas $8{,}5' + DEG + '$, **il n\'y a pas de surcoût**.}}'],
    'La longueur mesurée le long de la pente est l\'hypoténuse : quel rapport relie le côté '
    'opposé à l\'angle et l\'hypoténuse ?',
    ['ang >= 3', 'ang <= 14', 'abs(ang - 8.5) >= 1.5', arrondi_net('ang', 10)],
)
# k (0 = surcoût) pour le corrigé
N4_V5['variables'].append(var('k', 'eval:1-floor(ang/8.5)'))


def vars_n4(vi, **v):
    """Variables complètes d'une spec de N4, et les valeurs utiles."""
    if vi in (0, 3):
        v['b'] = v['a'] + v['ec']
    if vi == 2:
        v['oe'] = v['ee'] / 100
    if vi == 4:
        v['an'] = repr(deg(math.acos(v['ad'] / v['ae'])))
    if vi == 5:
        v['h'] = v['hh'] / 10
        a = deg(math.asin(v['h'] / v['L']))
        v['ang'] = repr(a)
        v['k'] = 1 - math.floor(a / 8.5)
    return v


SPECS_N4 = []

# v0 rivière : d = 40, α = 30, β = 50
v = vars_n4(0, d=40, a=30, ec=20)
ta, tb = math.tan(rad(30)), math.tan(rad(50))
bc, bs = 40 * ta, 40 * tb
juste = [fr(bc), fr(bs - bc)]
SPECS_N4.append(spec('v0 : BC ≈ 23, CS ≈ 25', 0, v, 'correct', juste))
SPECS_N4 += specs_erreurs(0, v, juste, 0, [(fr(40 * math.sin(rad(30))), E_SIN, 'sinus'),
                                           (fr(40 / ta), E_DIV, 'division')], 'v0')
early = str(int(rnd(bs)) - int(rnd(bc)))
errs = [(fr(bs + bc), E_SOMME, 'somme'), (fr(bs), E_BS, 'BS')]
if early != juste[1]:
    errs.append((early, E_TOT_M, 'arrondi trop tôt'))
SPECS_N4 += specs_erreurs(0, v, juste, 1, errs, 'v0')

# v1 Terre : λ = 49
v = vars_n4(1, l=49)
hp = R_T * math.cos(rad(49))
juste = [fr(hp), fr(2 * math.pi * hp)]
SPECS_N4.append(spec('v1 : λ = 49°, HP ≈ 4180', 1, v, 'correct', juste))
SPECS_N4 += specs_erreurs(1, v, juste, 0, [(fr(R_T * math.sin(rad(49))), E_SIN_HP, 'sinus'),
                                           (fr(R_T / math.cos(rad(49))), E_DIV_HP, 'division')],
                          'v1')
errs = [(fr(2 * math.pi * R_T), E_RAYON, 'rayon de la Terre'), (fr(math.pi * hp), E_PI,
                                                                'facteur 2 oublié')]
if fr(2 * math.pi * rnd(hp)) != juste[1]:
    errs.append((fr(2 * math.pi * rnd(hp)), E_TOT_M, 'arrondi trop tôt'))
SPECS_N4 += specs_erreurs(1, v, juste, 1, errs, 'v1')

# v2 arbre : d = 25, œil 1,70, α = 35
v = vars_n4(2, d=25, ee=170, a=35)
ks = 25 * math.tan(rad(35))
juste = [fr(ks, 1), fr(1.7 + ks, 1)]
SPECS_N4.append(spec('v2 : KS ≈ 17,5, TS ≈ 19,2', 2, v, 'correct', juste))
SPECS_N4 += specs_erreurs(2, v, juste, 0, [(fr(25 * math.sin(rad(35)), 1), E_SIN_K, 'sinus'),
                                           (fr(25 / math.tan(rad(35)), 1), E_DIV_K,
                                            'division')], 'v2')
SPECS_N4 += specs_erreurs(2, v, juste, 1, [(fr(ks, 1), E_OEIL, 'œil oublié')], 'v2')

# v3 falaise : d = 50, α = 30, β = 45
v = vars_n4(3, d=50, a=30, ec=15)
ta, tb = math.tan(rad(30)), math.tan(rad(45))
x = 50 * ta / (tb - ta)
juste = [fr(x), fr(x * tb)]
SPECS_N4.append(spec('v3 : BH ≈ 68, HS ≈ 68', 3, v, 'correct', juste))
SPECS_N4 += specs_erreurs(3, v, juste, 0, [(fr(x + 50), E_AH, 'AH')], 'v3')
errs = [(fr(x * ta), E_ANGLE_A, 'mauvais angle')]
if fr(rnd(x) * tb) != juste[1]:
    errs.append((fr(rnd(x) * tb), E_TOT_M, 'arrondi trop tôt'))
SPECS_N4 += specs_erreurs(3, v, juste, 1, errs, 'v3')
# un tirage où l'arrondi trop tôt compte : d = 35, α = 25, β = 50
v = vars_n4(3, d=35, a=25, ec=25)
ta, tb = math.tan(rad(25)), math.tan(rad(50))
x = 35 * ta / (tb - ta)
juste = [fr(x), fr(x * tb)]
SPECS_N4.append(spec(f'v3 : BH ≈ {juste[0]}, HS ≈ {juste[1]}', 3, v, 'correct', juste))
if fr(rnd(x) * tb) != juste[1]:
    SPECS_N4 += specs_erreurs(3, v, juste, 1, [(fr(rnd(x) * tb), E_TOT_M, 'arrondi trop tôt')],
                              'v3')

# v4 triangle inscrit : AD = 6, AE = 9, AC = 7
v = vars_n4(4, ae=9, ad=6, ac=7)
an = float(v['an'])
juste = [fr(an, 1), fr(7 * 6 / 9, 1)]
SPECS_N4.append(spec('v4 : angle ≈ 48,2°, AB ≈ 4,7', 4, v, 'correct', juste))
SPECS_N4.append(spec('v4 : AB non arrondi', 4, v, 'incorrect', [juste[0], '4{,}667']))
SPECS_N4 += specs_erreurs(4, v, juste, 0, [(fr(90 - an, 1), E_ASIN, 'sin⁻¹'),
                                           (fr(6 / 9, 2), E_QUOT_A, 'quotient')], 'v4')
SPECS_N4 += specs_erreurs(4, v, juste, 1, [(fr(7 * 9 / 6, 1), E_DIV_AB, 'division'),
                                           (fr(7 * math.sqrt(1 - (6 / 9) ** 2), 1), E_SIN_AB,
                                            'sinus')], 'v4')

# v5 terrain : L = 20, h = 4,5 → 13,0° (surcoût) ; L = 40, h = 4,2 → 6,0° (pas de surcoût)
v = vars_n4(5, L=20, hh=45)
a = float(v['ang'])
juste = [fr(a, 1), '0']
SPECS_N4.append(spec('v5 : 13,0°, surcoût', 5, v, 'correct', juste))
SPECS_N4.append(spec('v5 : bon angle, mauvaise décision', 5, v, 'incorrect', [juste[0], '1']))
SPECS_N4 += specs_erreurs(5, v, juste, 0, [(fr(90 - a, 1), E_ACOS, 'cos⁻¹'),
                                           (fr(deg(math.atan(4.5 / 20)), 1), E_ATAN,
                                            'tangente')], 'v5')
v = vars_n4(5, L=40, hh=42)
SPECS_N4.append(spec('v5 : 6,0°, pas de surcoût', 5, v, 'correct',
                     [fr(float(v['ang']), 1), '1']))

ecrire('n4-problemes-concrets-de-trigonometrie', modele(
    'Problèmes concrets de trigonométrie',
    'Largeur d\'une rivière vue sous deux angles, rayon et longueur d\'un parallèle terrestre, '
    'hauteur d\'un arbre (avec la hauteur de l\'œil), falaise vue de deux points, triangle '
    'rectangle inscrit dans un autre, terrain en pente et surcoût',
    2, 300, [N4_V0, N4_V1, N4_V2, N4_V3, N4_V4, N4_V5], SPECS_N4))
