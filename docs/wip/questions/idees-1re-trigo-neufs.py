"""Écrit les deux modèles neufs du chantier idees-1re-trigo dans
scripts/questions/idees-1re-trigo-neufs/.

Phase 0 : David, le 2026-11-25 (page à cocher https://claude.ai/artifact/5cDKurCkuAiosqCobrT1Qo,
journal docs/wip/idees-1re-trigo-progress.md) : « je valide les modèles », puis « tout le lot ».
- N1 « Ramener un réel dans [0 ; 2π[ » : la variation [0 ; 2π[ de F2 devient un modèle neuf, car
  le titre de f7194c9d (« … dans ]−π ; π] ») ne peut pas changer par la migration de contenu
  (choix de David, 2026-11-25). 1SPE-304, Fonctions > Fonctions trigonométriques > cercle et radians.
- N2 (F5) « Calculer sin x connaissant cos x ». 1SPE-305, … > cosinus et sinus d'un réel.

Bornes : décision l1s-3 (valeurs remarquables, réels associés à 2kπ près, valeurs numériques).

Règles suivies (couvrir-un-niveau.md § 5) : erreurs prévues par case (de vraies erreurs d'élèves),
chacune avec sa spec `incorrect` qui nomme son message ; un coup de pouce par variation, qui ne
donne jamais la réponse. Les réponses sont calculées par `eval:` (π et racines exactes).

Usage : python3 docs/wip/questions/idees-1re-trigo-neufs.py scripts/questions/idees-1re-trigo-neufs
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
PRIMAIRE, I_02PI = C.PRIMAIRE, C.I_02PI

DOSSIER = sys.argv[1]


def modele(title, description, level, variations, specs, rangement, delay, shared=None):
    m = {'rangement': rangement, 'title': title, 'description': description, 'grades': ['1_SPE'],
         'level': level, 'delay': delay, 'status': 'draft', 'variations': variations,
         'testSpecs': specs}
    if shared:
        m['shared'] = shared
    return m


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


# =============================================================================================
# N1 — Ramener un réel dans [0 ; 2π[ (1AN40-2, 1AN40-3). Point 1SPE-304.
# r = pπ/q dans [0 ; 2π[ ; le réel donné est r + 2kπ (positif) ou r − 2kπ (négatif).
# =============================================================================================

RAMENER = ('Détermine le réel de l\'intervalle $' + I_02PI + '$ associé au même point du cercle '
           'trigonométrique que le réel $DONNE$.\n\n$?$')
TRIG = '```trig\npreset: custom\nangles: {{p}}*pi/Q\n```'
CONCLUSION = ('Comme $0\\leqslant {{r}}<2\\pi$, le réel cherché est $' + PRIMAIRE + '{ {{r}} }$.')

n1, n1s = [], []

# V1 : π/6, réel positif de 1 à 3 tours (29π/6 → 5π/6)
n1.append(variation(
    RAMENER.replace('DONNE', '\\frac{ {{a}}\\pi}{6}'),
    [var('p', '1|5|7|11'), var('k', '1..3'), var('a', 'eval:p+12*k'), var('r', 'eval:p*\\pi/6')],
    [case('{{r}}', [
        erreur('{{eval:(p-12)*\\pi/6}}', C.ERR_NEGATIF_02PI, 'Réel de ]−π ; π]'),
        erreur('{{eval:(p+12)*\\pi/6}}', C.ERR_DEPASSE_2PI, 'Un tour de trop'),
        erreur('{{eval:(12-p)*\\pi/6}}', C.ERR_SYMETRIQUE, 'Symétrique'),
    ])],
    ['On retire des tours complets ($2\\pi=\\frac{12\\pi}{6}$) jusqu\'à tomber dans $' + I_02PI
     + '$ :',
     '$$\\frac{ {{a}}\\pi}{6}={{r}}+\\frac{ {{eval:12*k}}\\pi}{6}={{r}}+{{eval:2*k}}\\pi$$',
     CONCLUSION, TRIG.replace('Q', '6')],
    'Ajouter ou retirer $2\\pi$ ne change pas le point : écris $2\\pi=\\frac{12\\pi}{6}$.'))
v = {'p': 5, 'k': 2}  # 29π/6 → 5π/6
n1s += [spec('29π/6 → 5π/6', 0, v, 'correct', ['\\frac{5\\pi}{6}']),
        spec('29π/6 : un tour de trop, 17π/6', 0, v, 'incorrect', ['\\frac{17\\pi}{6}'],
             C.ERR_DEPASSE_2PI),
        spec('29π/6 : symétrique 7π/6', 0, v, 'incorrect', ['\\frac{7\\pi}{6}'], C.ERR_SYMETRIQUE),
        spec('29π/6 : non réduit 10π/12', 0, v, 'unoptimal_form', ['\\frac{10\\pi}{12}'],
             violations=['reducedFractions'])]
v = {'p': 7, 'k': 1}  # 19π/6 → 7π/6
n1s += [spec('19π/6 → 7π/6', 0, v, 'correct', ['\\frac{7\\pi}{6}']),
        spec('19π/6 : −5π/6 de ]−π ; π]', 0, v, 'incorrect', ['-\\frac{5\\pi}{6}'],
             C.ERR_NEGATIF_02PI)]

# V2 : π/4, réel négatif de 1 à 3 tours (−7π/4 → π/4, −11π/4 → 5π/4)
n1.append(variation(
    RAMENER.replace('DONNE', '-\\frac{ {{if:a==1||{{a}}}}\\pi}{4}'),
    [var('p', '1|3|5|7'), var('k', '1..3'), var('a', 'eval:8*k-p'), var('r', 'eval:p*\\pi/4')],
    [case('{{r}}', [
        erreur('{{eval:(p-8)*\\pi/4}}', C.ERR_NEGATIF_02PI, 'Un tour de moins'),
        erreur('{{eval:(p+8)*\\pi/4}}', C.ERR_DEPASSE_2PI, 'Un tour de trop'),
        erreur('{{eval:(8-p)*\\pi/4}}', C.ERR_SIGNE_OUBLIE, 'Signe oublié'),
    ])],
    ['On ajoute des tours complets ($2\\pi=\\frac{8\\pi}{4}$) jusqu\'à tomber dans $' + I_02PI
     + '$ :',
     '$$-\\frac{ {{a}}\\pi}{4}={{r}}-\\frac{ {{eval:8*k}}\\pi}{4}={{r}}-{{eval:2*k}}\\pi$$',
     CONCLUSION, TRIG.replace('Q', '4')],
    'Le réel est négatif : ajoute des tours complets, avec $2\\pi=\\frac{8\\pi}{4}$.'))
v = {'p': 5, 'k': 2}  # −11π/4 → 5π/4
n1s += [spec('−11π/4 → 5π/4', 1, v, 'correct', ['\\frac{5\\pi}{4}']),
        spec('−11π/4 : −3π/4, un tour de moins', 1, v, 'incorrect', ['-\\frac{3\\pi}{4}'],
             C.ERR_NEGATIF_02PI),
        spec('−11π/4 : 13π/4, un tour de trop', 1, v, 'incorrect', ['\\frac{13\\pi}{4}'],
             C.ERR_DEPASSE_2PI),
        spec('−11π/4 : signe oublié, 3π/4', 1, v, 'incorrect', ['\\frac{3\\pi}{4}'],
             C.ERR_SIGNE_OUBLIE)]
v = {'p': 1, 'k': 1}  # −7π/4 → π/4
n1s += [spec('−7π/4 → π/4', 1, v, 'correct', ['\\frac{\\pi}{4}'])]

# V3 : π/3, réel négatif de 1 à 3 tours (−7π/3 → 5π/3)
n1.append(variation(
    RAMENER.replace('DONNE', '-\\frac{ {{if:a==1||{{a}}}}\\pi}{3}'),
    [var('p', '1|2|4|5'), var('k', '1..3'), var('a', 'eval:6*k-p'), var('r', 'eval:p*\\pi/3')],
    [case('{{r}}', [
        erreur('{{eval:(p-6)*\\pi/3}}', C.ERR_NEGATIF_02PI, 'Un tour de moins'),
        erreur('{{eval:(p+6)*\\pi/3}}', C.ERR_DEPASSE_2PI, 'Un tour de trop'),
        erreur('{{eval:(6-p)*\\pi/3}}', C.ERR_SIGNE_OUBLIE, 'Signe oublié'),
    ])],
    ['On ajoute des tours complets ($2\\pi=\\frac{6\\pi}{3}$) jusqu\'à tomber dans $' + I_02PI
     + '$ :',
     '$$-\\frac{ {{a}}\\pi}{3}={{r}}-\\frac{ {{eval:6*k}}\\pi}{3}={{r}}-{{eval:2*k}}\\pi$$',
     CONCLUSION, TRIG.replace('Q', '3')],
    'Le réel est négatif : ajoute des tours complets, avec $2\\pi=\\frac{6\\pi}{3}$.'))
v = {'p': 5, 'k': 1}  # −π/3 → 5π/3
n1s += [spec('−π/3 → 5π/3', 2, v, 'correct', ['\\frac{5\\pi}{3}']),
        spec('−π/3 : signe oublié, π/3', 2, v, 'incorrect', ['\\frac{\\pi}{3}'], C.ERR_SIGNE_OUBLIE),
        spec('−π/3 : réel de départ gardé', 2, v, 'incorrect', ['-\\frac{\\pi}{3}'],
             C.ERR_NEGATIF_02PI)]
v = {'p': 2, 'k': 2}  # −22π/3 → 2π/3
n1s += [spec('−22π/3 → 2π/3', 2, v, 'correct', ['\\frac{2\\pi}{3}']),
        spec('−22π/3 : 8π/3, un tour de trop', 2, v, 'incorrect', ['\\frac{8\\pi}{3}'],
             C.ERR_DEPASSE_2PI)]

ecrire('n1-ramener-un-reel-dans-0-2pi', modele(
    'Ramener un réel dans [0 ; 2π[',
    'Trouver le réel de [0 ; 2π[ associé au même point du cercle trigonométrique qu\'un réel donné '
    '(29π/6, −11π/4, −22π/3…), en retirant ou en ajoutant des tours',
    2, n1, n1s, {'noeud': 'Fonctions > Fonctions trigonométriques > cercle et radians',
                 'point': '1SPE-304'}, delay=45))

# =============================================================================================
# N2 (F5) — Calculer sin x connaissant cos x (1AN41-3). Point 1SPE-305.
# sin²x = 1 − cos²x ; le signe se lit sur l'intervalle ([0 ; π] : sin ≥ 0 ; [−π ; 0] : sin ≤ 0).
# =============================================================================================

I_HAUT = '\\left[0\\,;\\pi\\right]'
I_BAS = '\\left[-\\pi\\,;0\\right]'
INTERVALLE = '{{if:w==0|' + I_HAUT + '|' + I_BAS + '}}'
SIN_ENONCE = ('On sait que $\\cos x=COS$ et que $x\\in' + INTERVALLE + '$.\n\nCalcule la valeur '
              'exacte de $\\sin x$.\n\n$\\sin x=?$')
DEC = {'acceptDecimal': True}


def etapes_sin(cos_tex, carre, attendu):
    """Corrigé : cos² + sin² = 1, sin² calculé, deux possibilités, signe lu sur l'intervalle."""
    return ['Pour tout réel $x$, $\\cos^2x+\\sin^2x=1$, donc $\\sin^2x=1-\\cos^2x$.',
            '$$\\sin^2x=1-\\left(' + cos_tex + '\\right)^2=' + carre + '$$',
            'Donc $\\sin x=\\sqrt{' + carre + '}$ ou $\\sin x=-\\sqrt{' + carre + '}$.',
            'Comme $x\\in' + INTERVALLE + '$, $\\sin x{{if:w==0|\\geqslant|\\leqslant}}0$ : '
            '$\\sin x=' + PRIMAIRE + '{ ' + attendu + ' }$.']


SIGNE_W = '(1-2*w)'
HINT_SIN = ('Pour tout réel $x$, $\\cos^2x+\\sin^2x=1$. Le signe de $\\sin x$ se lit sur le '
            'demi-cercle où se trouve $x$.')

n2, n2s = [], []

# V1 et V2 : fractions de triplets pythagoriciens (cos x = ±a/b → sin x = ±c/b)
for vi, w in ((0, 0), (1, 1)):
    attendu = '{{eval:' + SIGNE_W + '*sqrt(1-(a/b)^2)}}'
    n2.append(variation(
        SIN_ENONCE.replace('COS', '{{if:s<0|-|}}\\frac{ {{a}} }{ {{b}} }'),
        [var('w', str(w)), var('s', '1|-1'), var('b', '5|13|17|25'), var('a', '1..b!cd(b)')],
        [case(attendu, [
            erreur('{{eval:-' + SIGNE_W + '*sqrt(1-(a/b)^2)}}', C.ERR_SIGNE_SIN, 'Mauvais signe'),
            erreur('{{eval:' + SIGNE_W + '*(1-(a/b)^2)}}', C.ERR_RACINE_OUBLIEE, 'Racine oubliée'),
            erreur('{{eval:' + SIGNE_W + '*(1-s*a/b)}}', C.ERR_SANS_CARRES, '1 − cos x'),
        ], DEC)],
        etapes_sin('{{if:s<0|-|}}\\frac{ {{a}} }{ {{b}} }', '{{eval:1-(a/b)^2}}', attendu),
        HINT_SIN, ['round(sqrt(b^2-a^2))^2=b^2-a^2']))
v = {'w': 0, 's': 1, 'b': 5, 'a': 3}  # cos x = 3/5, [0 ; π] → 4/5
n2s += [spec('cos x = 3/5, x ∈ [0 ; π] : sin x = 4/5', 0, v, 'correct', ['\\frac{4}{5}']),
        spec('décimal 0,8', 0, v, 'correct', ['0{,}8']),
        spec('mauvais signe −4/5', 0, v, 'incorrect', ['-\\frac{4}{5}'], C.ERR_SIGNE_SIN),
        spec('racine oubliée 16/25', 0, v, 'incorrect', ['\\frac{16}{25}'], C.ERR_RACINE_OUBLIEE),
        spec('1 − cos x : 2/5', 0, v, 'incorrect', ['\\frac{2}{5}'], C.ERR_SANS_CARRES)]
v = {'w': 0, 's': -1, 'b': 13, 'a': 5}  # cos x = −5/13, [0 ; π] → 12/13
n2s += [spec('cos x = −5/13, x ∈ [0 ; π] : sin x = 12/13', 0, v, 'correct', ['\\frac{12}{13}'])]
v = {'w': 1, 's': 1, 'b': 17, 'a': 8}  # cos x = 8/17, [−π ; 0] → −15/17
n2s += [spec('cos x = 8/17, x ∈ [−π ; 0] : sin x = −15/17', 1, v, 'correct', ['-\\frac{15}{17}']),
        spec('signe oublié 15/17', 1, v, 'incorrect', ['\\frac{15}{17}'], C.ERR_SIGNE_SIN),
        spec('racine oubliée −225/289', 1, v, 'incorrect', ['-\\frac{225}{289}'],
             C.ERR_RACINE_OUBLIEE)]

# V3 : racine (cos x = ±a/b, b de 3 à 9) → ±√d/b, d sans facteur carré
attendu = '{{eval:' + SIGNE_W + '*sqrt(1-(a/b)^2)}}'
n2.append(variation(
    SIN_ENONCE.replace('COS', '{{if:s<0|-|}}\\frac{ {{a}} }{ {{b}} }'),
    [var('w', '0|1'), var('s', '1|-1'), var('b', '3..9'), var('a', '1..b!cd(b)'),
     var('d', 'eval:b^2-a^2')],
    [case(attendu, [
        erreur('{{eval:-' + SIGNE_W + '*sqrt(1-(a/b)^2)}}', C.ERR_SIGNE_SIN, 'Mauvais signe'),
        erreur('{{eval:' + SIGNE_W + '*(1-(a/b)^2)}}', C.ERR_RACINE_OUBLIEE, 'Racine oubliée'),
        erreur('{{eval:' + SIGNE_W + '*sqrt(1-s*a/b)}}', C.ERR_SANS_CARRES, '1 − cos x'),
    ], DEC)],
    etapes_sin('{{if:s<0|-|}}\\frac{ {{a}} }{ {{b}} }', '{{eval:1-(a/b)^2}}', attendu),
    HINT_SIN, ['mod(d,4)!=0', 'mod(d,9)!=0', 'mod(d,25)!=0', 'mod(d,49)!=0']))
v = {'w': 0, 's': 1, 'b': 3, 'a': 2, 'd': 5}  # cos x = 2/3, [0 ; π] → √5/3
n2s += [spec('cos x = 2/3, x ∈ [0 ; π] : sin x = √5/3', 2, v, 'correct', ['\\frac{\\sqrt{5}}{3}']),
        spec('mauvais signe −√5/3', 2, v, 'incorrect', ['-\\frac{\\sqrt{5}}{3}'], C.ERR_SIGNE_SIN),
        spec('racine oubliée 5/9', 2, v, 'incorrect', ['\\frac{5}{9}'], C.ERR_RACINE_OUBLIEE),
        spec('√(1 − cos x) : √3/3', 2, v, 'incorrect', ['\\frac{\\sqrt{3}}{3}'], C.ERR_SANS_CARRES),
        spec('√5/√9 non réduit', 2, v, 'unoptimal_form', ['\\frac{\\sqrt{5}}{\\sqrt{9}}'],
             violations=['reducedRadicals'])]
v = {'w': 1, 's': -1, 'b': 4, 'a': 1, 'd': 15}  # cos x = −1/4, [−π ; 0] → −√15/4
n2s += [spec('cos x = −1/4, x ∈ [−π ; 0] : sin x = −√15/4', 2, v, 'correct',
             ['-\\frac{\\sqrt{15}}{4}']),
        spec('signe oublié √15/4', 2, v, 'incorrect', ['\\frac{\\sqrt{15}}{4}'], C.ERR_SIGNE_SIN)]

# V4 : cos x décimal ±0,a → sin x = ±√(1 − 0,a²) (0,8 et 0,6 exacts ; √91/10, √51/10, √19/10)
attendu = '{{eval:' + SIGNE_W + '*sqrt(1-(a/10)^2)}}'
COS_DEC = '{{if:s<0|-|}}0{,}{{a}}'
n2.append(variation(
    SIN_ENONCE.replace('COS', COS_DEC).replace(
        'exacte de $\\sin x$.', 'exacte de $\\sin x$, sans racine d\'un nombre décimal '
        '($\\frac{\\sqrt{91}}{10}$ plutôt que $\\sqrt{0{,}91}$).'),
    [var('w', '0|1'), var('s', '1|-1'), var('a', '3|6|7|8|9')],
    [case(attendu, [
        erreur('{{eval:-' + SIGNE_W + '*sqrt(1-(a/10)^2)}}', C.ERR_SIGNE_SIN, 'Mauvais signe'),
        erreur('{{eval:' + SIGNE_W + '*(1-(a/10)^2)}}', C.ERR_RACINE_OUBLIEE, 'Racine oubliée'),
        erreur('{{eval:' + SIGNE_W + '*(1-s*a/10)}}', C.ERR_SANS_CARRES, '1 − cos x'),
    ], DEC)],
    etapes_sin(COS_DEC, '{{eval:1-(a/10)^2}}', attendu),
    HINT_SIN))
v = {'w': 0, 's': 1, 'a': 6}  # cos x = 0,6, [0 ; π] → 0,8
n2s += [spec('cos x = 0,6, x ∈ [0 ; π] : sin x = 0,8', 3, v, 'correct', ['0{,}8']),
        spec('fraction 4/5 acceptée', 3, v, 'correct', ['\\frac{4}{5}']),
        spec('mauvais signe −0,8', 3, v, 'incorrect', ['-0{,}8'], C.ERR_SIGNE_SIN),
        spec('racine oubliée 0,64', 3, v, 'incorrect', ['0{,}64'], C.ERR_RACINE_OUBLIEE),
        spec('1 − cos x : 0,4', 3, v, 'incorrect', ['0{,}4'], C.ERR_SANS_CARRES)]
v = {'w': 1, 's': -1, 'a': 3}  # cos x = −0,3, [−π ; 0] → −√91/10
n2s += [spec('cos x = −0,3, x ∈ [−π ; 0] : sin x = −√91/10', 3, v, 'correct',
             ['-\\frac{\\sqrt{91}}{10}']),
        spec('−√0,91 refusé (forme, annoncé)', 3, v, 'bad_form', ['-\\sqrt{0{,}91}']),
        spec('signe oublié √91/10', 3, v, 'incorrect', ['\\frac{\\sqrt{91}}{10}'], C.ERR_SIGNE_SIN),
        spec('racine oubliée −0,91', 3, v, 'incorrect', ['-0{,}91'], C.ERR_RACINE_OUBLIEE)]

ecrire('n2-calculer-sin-connaissant-cos', modele(
    'Calculer sin x connaissant cos x',
    'cos²x + sin²x = 1 : cos x donné (3/5, 2/3, 0,6…) et un demi-tour pour le signe de sin x ; '
    'fraction réduite, avec une racine si besoin',
    3, n2, n2s, {'noeud': 'Fonctions > Fonctions trigonométriques > cosinus et sinus d\'un réel',
                 'point': '1SPE-305'}, delay=60))

for nom, vs, ss in [('N1', n1, n1s), ('N2', n2, n2s)]:
    print(nom, ':', len(vs), 'variations,', len(ss), 'specs')
