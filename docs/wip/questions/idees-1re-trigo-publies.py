"""Ajoute les variations validées aux 5 modèles publiés exportés de prod dans
scripts/questions/idees-1re-trigo-publies/ (chantier idees-1re-trigo).

Phase 0 : David, le 2026-11-25, « je valide les modèles » puis « tout le lot » : F1 (4b3c1d88),
F2 (f7194c9d, dénominateurs 5 et 12 seulement : la variation [0 ; 2π[ est devenue le modèle neuf
N1), F3 (aad6c700), F4 (679a2e3e), F6 (ee4e2ac6). Les variations s'ajoutent À LA FIN (les
réponses des élèves gardent l'indice de leur variation) ; la migration de contenu est générée par
scripts/questions/migration-contenu.ts.

Le script repart du contenu de prod (variations et specs d'origine, comptées dans ORIGINE) :
le relancer réécrit les ajouts sans les doubler. Les réponses sont calculées par `eval:` (π et
racines exactes).

Usage : python3 docs/wip/questions/idees-1re-trigo-publies.py scripts/questions/idees-1re-trigo-publies
"""
import importlib.util
import json
import os
import sys

_chemin = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'idees-1re-trigo-commun.py')
_spec = importlib.util.spec_from_file_location('commun', _chemin)
C = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(C)
spec, var, erreur, case, variation = C.spec, C.var, C.erreur, C.case, C.variation
PRIMAIRE, I_PRINC, I_02PI = C.PRIMAIRE, C.I_PRINC, C.I_02PI

DOSSIER = sys.argv[1]

# id court → (variations, specs) d'origine en prod (export du 2026-11-25)
ORIGINE = {'4b3c1d88': (3, 17), 'f7194c9d': (6, 21), 'aad6c700': (6, 22), '679a2e3e': (3, 45),
           'ee4e2ac6': (7, 27)}

# Description mise à jour (la migration de contenu l'écrit avec les variations)
DESCRIPTIONS = {
    'aad6c700': ('Mesure principale dans ]−π ; π] d\'un ou deux points nommés sur le cercle '
                 'trigonométrique (multiples de π/6 et de π/4), puis réel de [0 ; 2π[ associé à '
                 'un point'),
}


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
    if court in DESCRIPTIONS:
        m['description'] = DESCRIPTIONS[court]
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(court, ':', len(variations), 'variations,', len(specs), 'specs ajoutées')


# =============================================================================================
# F1 — 4b3c1d88 : radians ↔ degrés hors valeurs remarquables (1AN40-1). Point 1SPE-409.
# =============================================================================================

ERR_NUMERATEUR = ('Tu as divisé $180$ par le dénominateur : multiplie aussi par le numérateur.')
ERR_360 = '$\\pi$ radians correspondent à $180^\\circ$, pas à $360^\\circ$.'
ERR_RAPPORT = 'Le rapport est à l\'envers : remplace $\\pi$ par $180^\\circ$.'
ERR_SANS_PI = 'N\'oublie pas $\\pi$ : $1^\\circ=\\dfrac{\\pi}{180}$ rad.'
ERR_RAPPORT_RAD = 'Le rapport est à l\'envers : on multiplie par $\\dfrac{\\pi}{180}$.'

v4b, s4b = [], []
# V3 : radians non remarquables → degrés entiers (π/12 → 15°, 2π/5 → 72°, 4π/9 → 80°…)
v4b.append(variation(
    'Convertis en degrés un angle de ${{r}}$ radians.\n\n${{r}}\\text{ rad}=?\\,^\\circ$',
    [var('q', '5|9|10|12|18'), var('n', '1..17'), var('r', 'eval:n*\\pi/q'),
     var('d', 'eval:180*n/q')],
    [case('{{d}}', [
        erreur('{{eval:180/q}}', ERR_NUMERATEUR, 'Numérateur oublié'),
        erreur('{{eval:360*n/q}}', ERR_360, 'π lu 360°'),
        erreur('{{eval:180*q/n}}', ERR_RAPPORT, 'Rapport à l\'envers'),
    ])],
    ['$\\pi$ radians correspondent à $180^\\circ$ : on remplace $\\pi$ par $180^\\circ$.',
     '${{r}}\\text{ rad}=\\dfrac{ {{n}}\\times180^\\circ}{ {{q}} }=' + PRIMAIRE
     + '{ {{d}}^\\circ }$.'],
    '$\\pi$ rad $=180^\\circ$ : remplace $\\pi$ par $180$, puis calcule.',
    ['n<q', 'gcd(n,q)=1']))
v = {'q': 12, 'n': 5}  # 5π/12 → 75°
s4b += [spec('5π/12 rad = 75°', 0, v, 'correct', ['75']),
        spec('5π/12 : numérateur oublié 15', 0, v, 'incorrect', ['15'], ERR_NUMERATEUR),
        spec('5π/12 : π lu 360°, 150', 0, v, 'incorrect', ['150'], ERR_360),
        spec('5π/12 : rapport à l\'envers 432', 0, v, 'incorrect', ['432'], ERR_RAPPORT)]
v = {'q': 9, 'n': 2}  # 2π/9 → 40°
s4b += [spec('2π/9 rad = 40°', 0, v, 'correct', ['40'])]

# V4 : degrés entiers non remarquables → radians (fraction de π réduite)
v4b.append(variation(
    'Convertis en radians un angle de ${{d}}^\\circ$.\n\n${{d}}^\\circ=?$ rad',
    [var('d', '10|20|25|35|40|50|70|80|100|110|140|160|200|250|320'),
     var('r', 'eval:d*\\pi/180')],
    [case('{{r}}', [
        erreur('{{eval:d/180}}', ERR_SANS_PI, 'π oublié'),
        erreur('{{eval:180*\\pi/d}}', ERR_RAPPORT_RAD, 'Rapport à l\'envers'),
        erreur('{{eval:d*\\pi/360}}', ERR_360, 'π lu 360°'),
    ])],
    ['$180^\\circ$ correspondent à $\\pi$ radians : pour passer des degrés aux radians, on '
     'multiplie par $\\dfrac{\\pi}{180}$.',
     '${{d}}^\\circ=\\dfrac{ {{d}} }{180}\\times\\pi$ rad et $\\dfrac{ {{d}} }{180}={{eval:d/180}}$.',
     'Donc ${{d}}^\\circ=' + PRIMAIRE + '{ {{r}} }$ rad.'],
    '$1^\\circ=\\dfrac{\\pi}{180}$ rad : multiplie par $\\dfrac{\\pi}{180}$, puis simplifie la '
    'fraction.'))
v = {'d': 50}  # 5π/18
s4b += [spec('50° = 5π/18', 1, v, 'correct', ['\\frac{5\\pi}{18}']),
        spec('50° : non réduit 50π/180', 1, v, 'unoptimal_form', ['\\frac{50\\pi}{180}'],
             violations=['reducedFractions']),
        spec('50° : π oublié 5/18', 1, v, 'incorrect', ['\\frac{5}{18}'], ERR_SANS_PI),
        spec('50° : rapport à l\'envers 18π/5', 1, v, 'incorrect', ['\\frac{18\\pi}{5}'],
             ERR_RAPPORT_RAD),
        spec('50° : π lu 360°, 5π/36', 1, v, 'incorrect', ['\\frac{5\\pi}{36}'], ERR_360)]
v = {'d': 140}  # 7π/9
s4b += [spec('140° = 7π/9', 1, v, 'correct', ['\\frac{7\\pi}{9}'])]

ajouter('4b3c1d88', v4b, s4b)

# =============================================================================================
# F2 — f7194c9d : ramener dans ]−π ; π] avec un dénominateur 5 ou 12 (1AN40-2). 1SPE-304.
# r = pπ/q, |p| < q, réel donné (p + 2qk)π/q, k de 1 à 3.
# =============================================================================================

vf7, sf7 = [], []
vf7.append(variation(
    'Détermine le réel de l\'intervalle $' + I_PRINC + '$ associé au même point du cercle '
    'trigonométrique que le réel $\\frac{ {{a}}\\pi}{ {{q}} }$.\n\n$?$',
    [var('q', '5|12'), var('p', '1..11;±'), var('k', '1..3'), var('a', 'eval:p+2*q*k'),
     var('r', 'eval:p*\\pi/q')],
    [case('{{r}}', [
        erreur('{{eval:-p*\\pi/q}}', C.ERR_SYMETRIQUE, 'Symétrique'),
        erreur('{{eval:(p+2*q)*\\pi/q}}', C.ERR_DEPASSE_PI, 'Un tour de moins'),
        erreur('{{eval:(p-2*q)*\\pi/q}}', C.ERR_SOUS_MOINS_PI, 'Un tour de trop'),
    ])],
    ['On retire des tours complets ($2\\pi=\\frac{ {{eval:2*q}}\\pi}{ {{q}} }$) jusqu\'à tomber '
     'dans $' + I_PRINC + '$ :',
     '$$\\frac{ {{a}}\\pi}{ {{q}} }={{r}}+\\frac{ {{eval:2*q*k}}\\pi}{ {{q}} }={{r}}+{{eval:2*k}}\\pi$$',
     'Comme ${{r}}\\in' + I_PRINC + '$, le réel cherché est $' + PRIMAIRE + '{ {{r}} }$.',
     '```trig\npreset: custom\nangles: {{p}}*pi/{{q}}\n```'],
    'Retire des tours complets, avec $2\\pi=\\frac{ {{eval:2*q}}\\pi}{ {{q}} }$.',
    ['abs(p)<q', 'gcd(abs(p),q)=1']))
v = {'q': 12, 'p': -1, 'k': 1}  # 23π/12 → −π/12
sf7 += [spec('23π/12 → −π/12', 0, v, 'correct', ['-\\frac{\\pi}{12}']),
        spec('23π/12 : symétrique π/12', 0, v, 'incorrect', ['\\frac{\\pi}{12}'], C.ERR_SYMETRIQUE),
        spec('23π/12 : gardé tel quel', 0, v, 'incorrect', ['\\frac{23\\pi}{12}'], C.ERR_DEPASSE_PI),
        spec('23π/12 : −25π/12, un tour de trop', 0, v, 'incorrect', ['-\\frac{25\\pi}{12}'],
             C.ERR_SOUS_MOINS_PI)]
v = {'q': 5, 'p': -3, 'k': 2}  # 17π/5 → −3π/5
sf7 += [spec('17π/5 → −3π/5', 0, v, 'correct', ['-\\frac{3\\pi}{5}']),
        spec('17π/5 : 7π/5, un tour de moins', 0, v, 'incorrect', ['\\frac{7\\pi}{5}'],
             C.ERR_DEPASSE_PI)]

ajouter('f7194c9d', vf7, sf7)

# =============================================================================================
# F3 — aad6c700 : lire le réel d'un point dans [0 ; 2π[ (1AN40-3). 1SPE-304.
# M sur le demi-cercle inférieur (π < r < 2π), pour que la réponse diffère de la mesure principale.
# =============================================================================================

ERR_PRINC_LU = ('Le réel demandé est dans $\\left[0\\,;2\\pi\\right[$ : il est positif. Tourne '
                'dans le sens direct depuis $I$.')
ERR_SYM_AXE = ('Ce réel est celui du point symétrique par rapport à l\'axe des abscisses : '
               'compte les crans dans le sens direct.')
ERR_OPPOSE = 'Ce réel est celui du point diamétralement opposé : compte les crans depuis $I$.'

vaa, saa = [], []
vaa.append(variation(
    'Donne le réel de $' + I_02PI + '$ associé au point $M$ du cercle trigonométrique.\n\n'
    '```trig\npreset: all\nlabels: false\npoints: M = {{p}}*pi/{{q}}\n```\n\n$?$',
    [var('q', '2|3|4|6'), var('p', '1..11'), var('r', 'eval:p*\\pi/q')],
    [case('{{r}}', [
        erreur('{{eval:(p-2*q)*\\pi/q}}', ERR_PRINC_LU, 'Mesure principale'),
        erreur('{{eval:(2*q-p)*\\pi/q}}', ERR_SYM_AXE, 'Symétrique (axe des abscisses)'),
        erreur('{{eval:(p-q)*\\pi/q}}', ERR_OPPOSE, 'Point opposé'),
    ])],
    ['Les points marqués sur le cercle sont ceux des angles remarquables : deux points voisins sont '
     'séparés de $\\frac{\\pi}{6}$ ou de $\\frac{\\pi}{4}$. Dans $' + I_02PI + '$, on part de $I$ '
     'et on tourne dans le sens direct : un point du demi-cercle inférieur a un réel compris entre '
     '$\\pi$ et $2\\pi$.',
     '```trig\npreset: custom\nangles: {{p}}*pi/{{q}}\nmesures: 0-2pi\n```',
     'Le point $M$ est associé au réel $' + PRIMAIRE + '{ {{r}} }$, qui appartient bien à $'
     + I_02PI + '$.'],
    'Pars du point $I$ et tourne dans le sens direct (sens inverse des aiguilles d\'une montre) '
    'jusqu\'à $M$.',
    ['p>q', 'p<2*q', 'gcd(p,q)=1']))
v = {'q': 3, 'p': 5}  # 5π/3
saa += [spec('M en 5π/3', 0, v, 'correct', ['\\frac{5\\pi}{3}']),
        spec('M en 5π/3 : −π/3 (mesure principale)', 0, v, 'incorrect', ['-\\frac{\\pi}{3}'],
             ERR_PRINC_LU),
        spec('M en 5π/3 : π/3 (symétrique)', 0, v, 'incorrect', ['\\frac{\\pi}{3}'], ERR_SYM_AXE),
        spec('M en 5π/3 : 2π/3 (opposé)', 0, v, 'incorrect', ['\\frac{2\\pi}{3}'], ERR_OPPOSE)]
v = {'q': 2, 'p': 3}  # 3π/2
saa += [spec('M en 3π/2', 0, v, 'correct', ['\\frac{3\\pi}{2}']),
        spec('M en 3π/2 : −π/2', 0, v, 'incorrect', ['-\\frac{\\pi}{2}'], ERR_PRINC_LU)]

ajouter('aad6c700', vaa, saa)

# =============================================================================================
# F4 — 679a2e3e : cos et sin d'un réel à plusieurs tours, points des axes (1AN41-1). 1SPE-307.
# =============================================================================================

ERR_SIGNE_COS = 'Attention au signe : regarde dans quel quart du cercle se trouve le point.'
ERR_DONNE_SIN = 'Tu as donné le sinus : le cosinus est l\'abscisse du point.'
ERR_DONNE_COS = 'Tu as donné le cosinus : le sinus est l\'ordonnée du point.'
DEC = {'acceptDecimal': True}
ENONCE_CS = 'Donne les valeurs exactes.\n\n$\\cos\\left({{r}}\\right)=?$ et $\\sin\\left({{r}}\\right)=?$'
COS_N = 'cos(n*\\pi/12)'
SIN_N = 'sin(n*\\pi/12)'


def cases_cs():
    ec = [erreur('{{eval:-' + COS_N + '}}', ERR_SIGNE_COS, 'Signe du cosinus'),
          erreur('{{eval:' + SIN_N + '}}', ERR_DONNE_SIN, 'Sinus à la place')]
    es = [erreur('{{eval:-' + SIN_N + '}}', ERR_SIGNE_COS, 'Signe du sinus'),
          erreur('{{eval:' + COS_N + '}}', ERR_DONNE_COS, 'Cosinus à la place')]
    return [case('{{eval:' + COS_N + '}}', ec, DEC), case('{{eval:' + SIN_N + '}}', es, DEC)]


CONCLUSION_CS = ('Donc $\\cos\\left({{r}}\\right)=' + PRIMAIRE + '{ {{eval:' + COS_N + '}} }$ et '
                 '$\\sin\\left({{r}}\\right)=' + PRIMAIRE + '{ {{eval:' + SIN_N + '}} }$.')

v67, s67 = [], []
# V3 : réels remarquables ou associés + 2kπ (k de 1 à 4, signes ±) : 25π/6, −17π/4, 23π/3
v67.append(variation(
    ENONCE_CS,
    [var('m', '2|3|4|8|9|10|-2|-3|-4|-8|-9|-10'), var('k', '1..4;±'), var('n', 'eval:m+24*k'),
     var('r', 'eval:n*\\pi/12'), var('r0', 'eval:m*\\pi/12')],
    cases_cs(),
    ['On {{if:k>0|retire|ajoute}} des tours complets ($2\\pi$) : ${{r}}={{r0}}{{eval:2*k;+}}\\pi$. '
     'Les deux réels '
     'ont le même point sur le cercle, donc le même cosinus et le même sinus.',
     '```trig\npreset: custom\nangles: {{m}}*pi/12\nprojections: true\n```',
     CONCLUSION_CS],
    'Retire d\'abord des tours complets ($2\\pi$) pour te ramener entre $-\\pi$ et $\\pi$.',
    ['abs(n)>24']))
v = {'m': 2, 'k': 2}  # 50π/12 = 25π/6 → π/6
s67 += [spec('25π/6 : √3/2 et 1/2', 0, v, 'correct', ['\\frac{\\sqrt{3}}{2}', '\\frac{1}{2}']),
        spec('25π/6 : sin = 0,5', 0, v, 'correct', ['\\frac{\\sqrt{3}}{2}', '0{,}5']),
        spec('25π/6 : signe du cosinus', 0, v, 'incorrect', ['-\\frac{\\sqrt{3}}{2}', '\\frac{1}{2}'],
             ERR_SIGNE_COS),
        spec('25π/6 : cos et sin échangés', 0, v, 'incorrect', ['\\frac{1}{2}', '\\frac{\\sqrt{3}}{2}'],
             ERR_DONNE_SIN)]
v = {'m': -3, 'k': -2}  # −51π/12 = −17π/4 → −π/4
s67 += [spec('−17π/4 : √2/2 et −√2/2', 0, v, 'correct',
             ['\\frac{\\sqrt{2}}{2}', '-\\frac{\\sqrt{2}}{2}']),
        spec('−17π/4 : signe du sinus', 0, v, 'incorrect',
             ['\\frac{\\sqrt{2}}{2}', '\\frac{\\sqrt{2}}{2}'], ERR_SIGNE_COS)]
v = {'m': -4, 'k': 4}  # 92π/12 = 23π/3 → −π/3
s67 += [spec('23π/3 : 1/2 et −√3/2', 0, v, 'correct', ['\\frac{1}{2}', '-\\frac{\\sqrt{3}}{2}'])]

# V4 : points des axes (π, 3π/2, −π/2, 3π, −5π/2, 7π/2…) : cos et sin valent 0, 1 ou −1
v67.append(variation(
    ENONCE_CS,
    [var('n', '12|18|-6|-18|-12|30|36|-30|42|24'), var('r', 'eval:n*\\pi/12'),
     var('m', 'eval:mod(n,24)')],
    cases_cs(),
    ['Le point associé à ${{r}}$ est sur un axe : on retire des tours complets ($2\\pi$) pour '
     'le placer.',
     '```trig\npreset: custom\nangles: {{m}}*pi/12\nprojections: true\n```',
     'Ses coordonnées valent $0$, $1$ ou $-1$. ' + CONCLUSION_CS],
    'Place le point sur le cercle : le cosinus est son abscisse, le sinus son ordonnée.'))
v = {'n': 18}  # 3π/2 → 0 ; −1
s67 += [spec('3π/2 : 0 et −1', 1, v, 'correct', ['0', '-1']),
        spec('3π/2 : sin = 1, signe', 1, v, 'incorrect', ['0', '1'], ERR_SIGNE_COS),
        spec('3π/2 : cos et sin échangés', 1, v, 'incorrect', ['-1', '0'], ERR_DONNE_SIN)]
v = {'n': 36}  # 3π → −1 ; 0
s67 += [spec('3π : −1 et 0', 1, v, 'correct', ['-1', '0']),
        spec('3π : cos = 1, signe', 1, v, 'incorrect', ['1', '0'], ERR_SIGNE_COS)]

ajouter('679a2e3e', v67, s67)

# =============================================================================================
# F6 — ee4e2ac6 : cos x connaissant sin x décimal (1AN41-3). 1SPE-305.
# x ∈ [−π/2 ; π/2] (cos ≥ 0) ou [π/2 ; 3π/2] (cos ≤ 0).
# =============================================================================================

I_DROITE = '\\left[-\\frac{\\pi}{2}\\,;\\frac{\\pi}{2}\\right]'
I_GAUCHE = '\\left[\\frac{\\pi}{2}\\,;\\frac{3\\pi}{2}\\right]'
INTERV_C = '{{if:w==0|' + I_DROITE + '|' + I_GAUCHE + '}}'
SIN_DEC = '{{if:s<0|-|}}0{,}{{a}}'
ERR_SIGNE_COSX = 'Attention au signe : regarde de quel côté de l\'axe des ordonnées se trouve $x$.'
ERR_SANS_CARRES_C = 'Ce sont les carrés qui s\'ajoutent : $\\cos^2x+\\sin^2x=1$.'

attendu = '{{eval:(1-2*w)*sqrt(1-(a/10)^2)}}'
vee, see = [], []
vee.append(variation(
    'On sait que $\\sin x=' + SIN_DEC + '$ et que $x\\in' + INTERV_C + '$.\n\nCalcule la valeur '
    'exacte de $\\cos x$, sans racine d\'un nombre décimal ($\\frac{\\sqrt{91}}{10}$ plutôt que '
    '$\\sqrt{0{,}91}$).\n\n$\\cos x=?$',
    [var('w', '0|1'), var('s', '1|-1'), var('a', '3|6|7|8|9')],
    [case(attendu, [
        erreur('{{eval:-(1-2*w)*sqrt(1-(a/10)^2)}}', ERR_SIGNE_COSX, 'Mauvais signe'),
        erreur('{{eval:(1-2*w)*(1-(a/10)^2)}}', C.ERR_RACINE_OUBLIEE, 'Racine oubliée'),
        erreur('{{eval:(1-2*w)*(1-s*a/10)}}', ERR_SANS_CARRES_C, '1 − sin x'),
    ], DEC)],
    ['Pour tout réel $x$, $\\cos^2x+\\sin^2x=1$, donc $\\cos^2x=1-\\sin^2x$.',
     '$$\\cos^2x=1-\\left(' + SIN_DEC + '\\right)^2={{eval:1-(a/10)^2}}$$',
     'Donc $\\cos x=\\sqrt{ {{eval:1-(a/10)^2}} }$ ou $\\cos x=-\\sqrt{ {{eval:1-(a/10)^2}} }$.',
     'Comme $x\\in' + INTERV_C + '$, $\\cos x{{if:w==0|\\geqslant|\\leqslant}}0$ : '
     '$\\cos x=' + PRIMAIRE + '{ ' + attendu + ' }$.'],
    'Pour tout réel $x$, $\\cos^2x+\\sin^2x=1$. Le signe de $\\cos x$ se lit sur le demi-cercle où '
    'se trouve $x$.'))
v = {'w': 0, 's': 1, 'a': 6}  # sin x = 0,6, [−π/2 ; π/2] → 0,8
see += [spec('sin x = 0,6, x ∈ [−π/2 ; π/2] : cos x = 0,8', 0, v, 'correct', ['0{,}8']),
        spec('fraction 4/5', 0, v, 'correct', ['\\frac{4}{5}']),
        spec('mauvais signe −0,8', 0, v, 'incorrect', ['-0{,}8'], ERR_SIGNE_COSX),
        spec('racine oubliée 0,64', 0, v, 'incorrect', ['0{,}64'], C.ERR_RACINE_OUBLIEE),
        spec('1 − sin x : 0,4', 0, v, 'incorrect', ['0{,}4'], ERR_SANS_CARRES_C)]
v = {'w': 1, 's': -1, 'a': 7}  # sin x = −0,7, [π/2 ; 3π/2] → −√51/10
see += [spec('sin x = −0,7, x ∈ [π/2 ; 3π/2] : cos x = −√51/10', 0, v, 'correct',
             ['-\\frac{\\sqrt{51}}{10}']),
        spec('signe oublié √51/10', 0, v, 'incorrect', ['\\frac{\\sqrt{51}}{10}'], ERR_SIGNE_COSX),
        spec('−√0,51 refusé (forme, annoncé)', 0, v, 'bad_form', ['-\\sqrt{0{,}51}'])]

ajouter('ee4e2ac6', vee, see)
