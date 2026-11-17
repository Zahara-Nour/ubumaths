"""Écrit les 2 modèles du lot 11 du CE1 (robot à produire, CE1-080) dans scripts/questions/ce1-11/.

Lot 2 du chantier `suite-fleches` (journal `docs/wip/suite-fleches-progress.md`, § « Lot 2 —
phase 0 ») : validé par David le 2026-11-15 (« tes recos ? » puis « oui » ; niveaux 4 et 5, les
niveaux 1 à 3 de la rubrique « coder un déplacement » étant pris). Bornes du BO (CE1-080) : au plus
15 instructions dont 4 virages ; « avancer de », « pivoter d'un quart de tour à droite / à gauche ».

Bloc ```robot avec `produire: oui` : l'élève compose le code avec des cartes ; tout code qui finit
sur la case verte est juste ; la réponse attendue (un code le plus court) est calculée par le
générateur, jamais écrite ici. Les codes des `testSpecs` sont calculés ici par un petit moteur qui
suit les règles de `src/lib/ubumark/utils/robot-moteur.ts` (le juge réel les rejoue en simulation).

Variation 1 : sans case grise, départ et arrivée tirés par des variables (conditions : au moins
5 cases d'écart, ni même ligne ni même colonne). Variation 2 : un mur parmi trois dispositions,
scènes précalculées et tirées par `k` (il faut 2 à 4 virages, 15 instructions au plus).

    python3 docs/wip/questions/lot-ce1-11.py scripts/questions/ce1-11
"""
import heapq
import json
import random
import sys

DOSSIER = sys.argv[1]
ALEA = random.Random(20261115)

L, H = 8, 5  # quadrillage : colonnes 1..8, lignes 1..5, (1, 1) = case en bas à gauche
SENS = ['haut', 'droite', 'bas', 'gauche']  # dans le sens des aiguilles d'une montre
PAS = {'haut': (0, 1), 'droite': (1, 0), 'bas': (0, -1), 'gauche': (-1, 0)}
FLECHE = {'haut': '↑', 'droite': '→', 'bas': '↓', 'gauche': '←'}
MAX_INSTRUCTIONS, MAX_VIRAGES = 15, 4

# ---- Gabarits ----


def spec(desc, vi, variables, answer, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(x) for k, x in variables.items()},
            'answers': [answer], 'expected': {'status': status}}


def modele(title, description, level, variations, specs, delay=120):
    # ni theme, ni domain, ni subdomain (ADR 0035) : rangement et point posés par la migration
    return {'title': title, 'description': description, 'grades': ['CE1'], 'level': level,
            'delay': delay, 'status': 'draft', 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, etapes, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['correction'] = {'steps': etapes}
    return v


def selon(k, textes, n=1):
    """`{{if:k==1|…|{{if:k==2|…|…}}}}` : le texte numéro k (à partir de 1)."""
    textes = [str(t) for t in textes]
    if len(textes) == 1:
        return textes[0]
    return ('{{if:' + k + '==' + str(n) + '|' + textes[0] + '|' + selon(k, textes[1:], n + 1)
            + '}}')


def bloc_robot(codage, depart, arrivee, interdites):
    lignes = ['quadrillage: 8 x 5']
    if codage == 'avance-pivote':
        lignes.append('codage: avance-pivote')
    lignes += ['départ: ' + depart, 'arrivée: ' + arrivee]
    if interdites:
        lignes.append('interdites: ' + interdites)
    lignes.append('produire: oui')
    return '```robot\n' + '\n'.join(lignes) + '\n```'


# ---- Petit moteur (mêmes règles que robot-moteur.ts) ----


def tourne(sens, cote):
    j = SENS.index(sens)
    return SENS[(j + (1 if cote == 'droite' else -1)) % 4]


def simuler(depart, sens, code, grises):
    """Rejoue un code ; rend la case où le robot finit, ou None s'il sort ou entre dans le gris.

    `code` : liste de ('f', sens) (flèche), ('a', n) (avance de n), ('p', 'gauche'|'droite').
    """
    x, y = depart
    for kind, val in code:
        if kind == 'p':
            sens = tourne(sens, val)
            continue
        d, n = (val, 1) if kind == 'f' else (sens, val)
        for _ in range(n):
            x, y = x + PAS[d][0], y + PAS[d][1]
            if not (1 <= x <= L and 1 <= y <= H) or (x, y) in grises:
                return None
    return (x, y)


def chemin_court(depart, arrivee, grises):
    """Directions case par case d'un chemin le plus court, le moins de virages parmi eux."""
    tas = [(0, 0, depart, None, [])]
    vu = set()
    while tas:
        n, v, c, d, chemin = heapq.heappop(tas)
        if c == arrivee:
            return chemin, v
        if (c, d) in vu:
            continue
        vu.add((c, d))
        for s in SENS:
            nc = (c[0] + PAS[s][0], c[1] + PAS[s][1])
            if not (1 <= nc[0] <= L and 1 <= nc[1] <= H) or nc in grises:
                continue
            heapq.heappush(tas, (n + 1, v + (d is not None and d != s), nc, s, chemin + [s]))
    return None, None


def troncons(chemin):
    out = []
    for s in chemin:
        if out and out[-1][0] == s:
            out[-1][1] += 1
        else:
            out.append([s, 1])
    return out


def en_fleches(chemin):
    return [('f', s) for s in chemin]


def en_avance_pivote(chemin, sens):
    code = []
    for s, n in troncons(chemin):
        if s == tourne(sens, 'droite'):
            code.append(('p', 'droite'))
        elif s == tourne(sens, 'gauche'):
            code.append(('p', 'gauche'))
        elif s != sens:
            code += [('p', 'droite'), ('p', 'droite')]
        sens = s
        code.append(('a', n))
    return code


def ecrire(code):
    if code and code[0][0] == 'f':
        return ' '.join(FLECHE[s] for _, s in code)
    mots = []
    for kind, val in code:
        mots.append(f'avance de {val}' if kind == 'a' else f'pivote à {val}')
    return ', '.join(mots)


def virages_ap(code):
    return sum(1 for kind, _ in code if kind == 'p')


def grises_de(texte):
    if not texte:
        return set()
    return {tuple(int(t) for t in c.split(',')) for c in texte.split(';')}


# ---- Variation 1 : sans case grise ----

V1_VARIABLES = [var('xd', '1..8'), var('yd', '1..5'), var('xa', '1..8'), var('ya', '1..5')]
V1_CONDITIONS = ['abs(xa-xd)+abs(ya-yd) >= 5', 'xa != xd', 'ya != yd']

# ---- Variation 2 : un mur (trois dispositions) ----

MURS = [
    # mur droit : colonne 4, lignes 1 à 4 ; on passe par le haut
    {'grises': '4, 1 ; 4, 2 ; 4, 3 ; 4, 4', 'depart': ((1, 3), (1, 5)), 'arrivee': ((5, 8), (1, 5))},
    # mur en L : colonne 4, lignes 2 à 5, et ligne 2, colonnes 5 et 6 ; la case verte dans le coin
    {'grises': '4, 2 ; 4, 3 ; 4, 4 ; 4, 5 ; 5, 2 ; 6, 2', 'depart': ((1, 3), (1, 5)),
     'arrivee': ((5, 6), (3, 5))},
    # deux murs : colonne 3 (lignes 1 à 4), colonne 6 (lignes 2 à 5) ; on serpente
    {'grises': '3, 1 ; 3, 2 ; 3, 3 ; 3, 4 ; 6, 2 ; 6, 3 ; 6, 4 ; 6, 5', 'depart': ((1, 2), (3, 5)),
     'arrivee': ((7, 8), (1, 5))},
]
PAR_MUR = 4


def tire_scene(mur):
    grises = grises_de(mur['grises'])
    while True:
        (x0, x1), (y0, y1) = mur['depart']
        dep = (ALEA.randint(x0, x1), ALEA.randint(y0, y1))
        (x0, x1), (y0, y1) = mur['arrivee']
        arr = (ALEA.randint(x0, x1), ALEA.randint(y0, y1))
        if dep in grises or arr in grises:
            continue
        chemin, v = chemin_court(dep, arr, grises)
        if chemin is None or len(chemin) > MAX_INSTRUCTIONS or not 2 <= v <= MAX_VIRAGES:
            continue
        sens = ALEA.choice(SENS)
        ap = en_avance_pivote(chemin, sens)
        if len(ap) > MAX_INSTRUCTIONS or virages_ap(ap) > MAX_VIRAGES or ap[0][0] != 'p':
            continue  # avance-pivote : on veut un pivot au départ (erreur « pas de pivot »)
        return {'grises': mur['grises'], 'g': grises, 'depart': dep, 'arrivee': arr,
                'sens': sens, 'chemin': chemin}


SCENES = []
for mur in MURS:
    vues = set()
    while sum(1 for s in SCENES if s['grises'] == mur['grises']) < PAR_MUR:
        s = tire_scene(mur)
        if (s['depart'], s['arrivee']) in vues:
            continue
        vues.add((s['depart'], s['arrivee']))
        SCENES.append(s)
N = len(SCENES)


def case(c):
    return f'{c[0]}, {c[1]}'


def scenes_v2(codage):
    deps = [case(s['depart']) + (', ' + s['sens'] if codage == 'avance-pivote' else '')
            for s in SCENES]
    return bloc_robot(codage, selon('k', deps), selon('k', [case(s['arrivee']) for s in SCENES]),
                      selon('k', [s['grises'] for s in SCENES]))


# ---- Énoncés et corrections ----

CONSIGNE = 'Écris le code qui mène le robot à la case verte.'
REGLE_FLECHES = 'Chaque flèche le fait avancer d\'une case dans son sens.'
REGLE_AP = ('Son nez montre où il regarde. **Avance de 3** : il avance de $3$ cases tout droit.'
            ' **Pivote à droite** (ou **à gauche**) : il tourne d\'un quart de tour sur place, vers'
            ' sa droite (ou sa gauche), sans changer de case.')
GRIS = 'Il ne peut pas entrer dans une case grise.'
SUIVRE = ('On suit le code case par case depuis le robot : il est juste s\'il finit sur la case'
          ' verte, sans sortir du quadrillage ni entrer dans une case grise. Un autre chemin que'
          ' celui du corrigé est juste aussi.')
COMPTER = ('On compte les cases à parcourir vers la droite ou la gauche, et vers le haut ou le'
           ' bas.')
CONTOURNER = 'Le chemin tout droit est barré par le gris : il faut le contourner.'
TOURNER = ('Avant d\'avancer, on fait pivoter le robot pour que son nez regarde là où il doit'
           ' aller. Sa droite et sa gauche sont celles du robot, pas les tiennes.')

FL_V1 = variation(
    CONSIGNE + ' ' + REGLE_FLECHES + '\n\n'
    + bloc_robot('flèches', '{{xd}}, {{yd}}', '{{xa}}, {{ya}}', None),
    V1_VARIABLES, [COMPTER, SUIVRE], V1_CONDITIONS)
FL_V2 = variation(
    CONSIGNE + ' ' + REGLE_FLECHES + ' ' + GRIS + '\n\n' + scenes_v2('flèches'),
    [var('k', f'1..{N}')], [CONTOURNER, SUIVRE])

AP_V1 = variation(
    CONSIGNE + ' ' + REGLE_AP + '\n\n'
    + bloc_robot('avance-pivote', '{{xd}}, {{yd}}, ' + selon('s', SENS), '{{xa}}, {{ya}}', None),
    V1_VARIABLES + [var('s', '1..4')], [TOURNER, SUIVRE], V1_CONDITIONS)
AP_V2 = variation(
    CONSIGNE + ' ' + REGLE_AP + ' ' + GRIS + '\n\n' + scenes_v2('avance-pivote'),
    [var('k', f'1..{N}')], [TOURNER, CONTOURNER, SUIVRE])

# ---- testSpecs (chaque code vérifié ici par le petit moteur) ----


def verifie(depart, sens, code, arrivee, grises, juste):
    fin = simuler(depart, sens, code, grises)
    assert (fin == arrivee) == juste, (ecrire(code), depart, arrivee, fin)
    assert len(code) <= MAX_INSTRUCTIONS
    return ecrire(code)


def ajoute_un(code):
    kind, val = code[-1]
    return code + [code[-1]] if kind == 'f' else code[:-1] + [('a', val + 1)]


def inverse_pivots(code):
    autre = {'gauche': 'droite', 'droite': 'gauche'}
    return [(k, autre[v]) if k == 'p' else (k, v) for k, v in code]


def sans_pivot_initial(code):
    j = 0
    while code[j][0] == 'p':
        j += 1
    return code[j:]


# V1 : départ (2, 1), arrivée (6, 4) ; avance-pivote : robot vers le haut (s = 1)
V1 = {'xd': 2, 'yd': 1, 'xa': 6, 'ya': 4}
D1, A1 = (2, 1), (6, 4)
H_PUIS_V = ['droite'] * 4 + ['haut'] * 3
V_PUIS_H = ['haut'] * 3 + ['droite'] * 4
DETOUR = ['haut'] + ['droite'] * 5 + ['haut'] * 2 + ['gauche']

SPECS_FL = [
    spec('Juste : à droite puis en haut', 0, V1, verifie(D1, None, en_fleches(H_PUIS_V), A1,
                                                          set(), True), 'correct'),
    spec('Juste : en haut puis à droite', 0, V1, verifie(D1, None, en_fleches(V_PUIS_H), A1,
                                                          set(), True), 'correct'),
    spec('Juste : un détour', 0, V1, verifie(D1, None, en_fleches(DETOUR), A1, set(), True),
         'correct'),
    spec('Erreur : une flèche de trop', 0, V1,
         verifie(D1, None, ajoute_un(en_fleches(H_PUIS_V)), A1, set(), False), 'incorrect'),
    spec('Erreur : une flèche de moins', 0, V1,
         verifie(D1, None, en_fleches(H_PUIS_V)[:-1], A1, set(), False), 'incorrect'),
    spec('Erreur : le robot sort par le bas', 0, V1, verifie(D1, None, [('f', 'bas')], A1, set(),
                                                             False), 'incorrect'),
]
SPECS_AP = [
    spec('Juste : pivote à droite d\'abord', 0, {**V1, 's': 1},
         verifie(D1, 'haut', en_avance_pivote(H_PUIS_V, 'haut'), A1, set(), True), 'correct'),
    spec('Juste : en haut d\'abord', 0, {**V1, 's': 1},
         verifie(D1, 'haut', en_avance_pivote(V_PUIS_H, 'haut'), A1, set(), True), 'correct'),
    spec('Erreur : gauche et droite du robot inversées', 0, {**V1, 's': 1},
         verifie(D1, 'haut', inverse_pivots(en_avance_pivote(H_PUIS_V, 'haut')), A1, set(),
                 False), 'incorrect'),
    spec('Erreur : avance comme une flèche, sans pivoter', 0, {**V1, 's': 1},
         verifie(D1, 'haut', sans_pivot_initial(en_avance_pivote(H_PUIS_V, 'haut')), A1, set(),
                 False), 'incorrect'),
    spec('Erreur : une case de trop', 0, {**V1, 's': 1},
         verifie(D1, 'haut', ajoute_un(en_avance_pivote(V_PUIS_H, 'haut')), A1, set(), False),
         'incorrect'),
    # robot vers la gauche (s = 4) : il faut faire demi-tour ou pivoter vers sa droite
    spec('Juste : robot vers la gauche', 0, {**V1, 's': 4},
         verifie(D1, 'gauche', en_avance_pivote(V_PUIS_H, 'gauche'), A1, set(), True),
         'correct'),
]

for k in (1, PAR_MUR + 1, 2 * PAR_MUR + 1):  # une scène de chaque mur
    s = SCENES[k - 1]
    d, a, g, ch = s['depart'], s['arrivee'], s['g'], s['chemin']
    # tout droit : d'abord à l'horizontale, puis à la verticale (traverse le gris)
    droit = (['droite' if a[0] > d[0] else 'gauche'] * abs(a[0] - d[0])
             + ['haut' if a[1] > d[1] else 'bas'] * abs(a[1] - d[1]))
    SPECS_FL += [
        spec(f'Mur : le plus court (k = {k})', 1, {'k': k},
             verifie(d, None, en_fleches(ch), a, g, True), 'correct'),
        spec(f'Erreur : tout droit à travers le gris (k = {k})', 1, {'k': k},
             verifie(d, None, en_fleches(droit), a, g, False), 'incorrect'),
        spec(f'Erreur : une flèche de moins (k = {k})', 1, {'k': k},
             verifie(d, None, en_fleches(ch)[:-1], a, g, False), 'incorrect'),
    ]
    ap = en_avance_pivote(ch, s['sens'])
    SPECS_AP += [
        spec(f'Mur : un code juste (k = {k})', 1, {'k': k},
             verifie(d, s['sens'], ap, a, g, True), 'correct'),
        spec(f'Erreur : gauche et droite inversées (k = {k})', 1, {'k': k},
             verifie(d, s['sens'], inverse_pivots(ap), a, g, False), 'incorrect'),
        spec(f'Erreur : sans le premier pivot (k = {k})', 1, {'k': k},
             verifie(d, s['sens'], sans_pivot_initial(ap), a, g, False), 'incorrect'),
    ]

# ---- Fichiers ----

MODELES = {
    '01-ecris-le-code-fleches': modele(
        'Écrire le code du robot avec des flèches',
        'Composer avec des flèches le code qui mène le robot à la case verte : sans obstacle, puis'
        ' en contournant des cases grises (au plus 15 instructions, 4 virages)', 4,
        [FL_V1, FL_V2], SPECS_FL),
    '02-ecris-le-code-avance-pivote': modele(
        'Écrire le code du robot : avance et pivote',
        'Composer avec « avance de », « pivote à droite / à gauche » le code qui mène le robot à la'
        ' case verte : sans obstacle, puis en contournant des cases grises', 5,
        [AP_V1, AP_V2], SPECS_AP),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits,', N, 'scènes à mur')
