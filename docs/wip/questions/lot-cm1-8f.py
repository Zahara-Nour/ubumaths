"""Écrit les 7 modèles du lot 8f du CM1 (patrons, déplacements, assemblages) dans scripts/questions/cm1-8f/.

Phase 0 validée par David le 2026-11-18 (§ 25, 25 bis du journal
`docs/archive/wip/questions-cm1-progress.md`, « je valide ») : modèles 8 à 14 ; 116 et 119 sortent du D ;
niveaux CM1 et CM2 sur tous (jumeaux 100, 101, 103, 104, 105).

Règles d'écriture :

1. Patrons de cube seulement (le CM1 ne demande que lui) ; faux patrons du catalogue (`faux 1` à
   `faux 8`, 6 carrés) ou grilles de 5 et 7 carrés (`faux: oui`).
2. Gestes `designer: opposee` et `completer:` : la réponse attendue est calculée par le pliage, pas
   de case écrite. Les combinaisons (patron, face retirée) qui laisseraient des faces séparées sont
   écartées par la sonde (`patron-sonde.ts`, à côté de ce script) : tables
   `COMPLETER_1`, `COMPLETER_2` ci-dessous.
3. Sens du robot : haut, droite, bas, gauche (sens de la feuille) ; sa droite et sa gauche sont
   les siennes.
4. Niveaux : à la suite de ceux du nœud en prod (MCP, 2026-11-19) — Solides › patrons : 1, 2 (CE2),
   3 (5e) → 4 à 6 ; Repérage et déplacements › coder un déplacement : 1 à 5 → 6 à 8 ; Solides ›
   constructions : 4, 5 (CE1) → 6.

Gabarit : `lot-cm1-8e.py`. Variables à une lettre ; jamais `e` ni `i`.

    python3 docs/wip/questions/lot-cm1-8f.py scripts/questions/cm1-8f
"""
import json
import random
import subprocess
import sys

DOSSIER = sys.argv[1]
SONDE = 'docs/wip/questions/patron-sonde.ts'  # lancé depuis la racine du dépôt

# ---- Gabarits ----


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(x) for k, x in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(title, description, grades, level, variations, specs, delay=60):
    # ni theme, ni domain, ni subdomain (ADR 0035) : le rangement est posé par la migration
    return {'title': title, 'description': description, 'grades': grades, 'level': level,
            'delay': delay, 'status': 'draft', 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, reponses, variables, etapes, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    if reponses is not None:
        v['blanks'] = [{'expectedAnswer': r} for r in reponses]
    v['correction'] = {'steps': etapes}
    return v


def bloc(nom, *lignes):
    return '\n\n```' + nom + '\n' + '\n'.join(x for x in lignes if x) + '\n```'


def choix(lignes, melanger=True):
    tete = '' if melanger else 'melanger: non\n'
    return '\n\n```choix\n' + tete + ''.join('- ' + c + '\n' for c in lignes) + '```'


def selon(k, textes, n=1):
    """`{{if:k==1|…|{{if:k==2|…|…}}}}` : le texte numéro k (à partir de 1)."""
    textes = [str(t) for t in textes]
    if len(textes) == 1:
        return textes[0]
    return ('{{if:' + k + '==' + str(n) + '|' + textes[0] + '|' + selon(k, textes[1:], n + 1)
            + '}}')


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def colt(x, k=0):
    return '$' + col('\\text{' + x + '}', k) + '$'


def nb(x, k=0):
    return '$' + col(str(x), k) + '$'


def sonde(items):
    sortie = subprocess.run(['pnpm', 'exec', 'tsx', SONDE], input=json.dumps(items),
                            capture_output=True, text=True, check=True)
    return json.loads(sortie.stdout)


CM = ['CM1', 'CM2']

# ---- 08. Est-ce un patron de cube ? Pourquoi ? (CM1-115, CM2-100) ----

OUI_NON = ['Oui, il se plie en cube.', 'Non, il ne se plie pas en cube.']
PLIER = 'On imagine une face posée au sol, puis on relève les autres autour d\'elle.'

EST_CE = variation(
    'On découpe cet assemblage de $6$ carrés et on le plie le long des traits. Obtient-on un'
    ' cube ?'
    + bloc('patron', 'solide: cube', 'forme: {{if:v==1|{{k}}|faux {{j}}}}',
           'tourner: {{eval:90*t}}', 'retourner: {{if:r==1|oui|non}}')
    + choix(OUI_NON, melanger=False),
    ['{{eval:1-v}}'],
    [var('v', '0..1'), var('k', '1..11'), var('j', '1..8'), var('t', '0..3'), var('r', '0..1')],
    [PLIER,
     '{{if:v==1|Chaque carré vient sur une face différente, sans trou ni carré en double : '
     + colt('oui') + ', c\'est un patron de cube.|Deux carrés arrivent au même endroit, et il'
     ' reste un trou : ' + colt('non') + ', ce n\'est pas un patron de cube.}}'])

POURQUOI = ['Il manque une face.', 'Il y a une face de trop.',
            'Deux faces viendraient l\'une sur l\'autre.']
Q_POURQUOI = 'Cet assemblage de carrés ne se plie pas en cube. Pourquoi ?'

# grilles de 5 carrés (reliés, un de moins qu'un cube) et de 7 carrés
G5 = [['X X X X', '. X . .'], ['. X .', 'X X X', '. X .'], ['X X .', '. X X', '. . X'],
      ['X X X .', '. . X X'], ['X . . .', 'X X X X']]
G7 = [['. X . .', 'X X X X', '. X X .'], ['X X . .', '. X X X', '. X X .'],
      ['. X . . .', 'X X X X X', '. X . . .'], ['X X X .', '. . X X', '. . X X'],
      ['X . .', 'X X X', 'X X X']]


def grille(g):
    return 'forme:\n' + '\n'.join('  ' + ligne for ligne in g) + '\nfaux: oui'


def pourquoi(forme, n, carres, reponse, explique):
    return variation(
        Q_POURQUOI + bloc('patron', 'solide: cube', forme, 'tourner: {{eval:90*t}}')
        + choix(POURQUOI),
        [str(reponse)],
        [var('k', '1..' + str(n)), var('t', '0..3')],
        ['Un cube a $6$ faces : son patron a $6$ carrés, chacun vient sur une face différente.',
         'Ici, on compte ' + carres + '. ' + explique])


TROP_PRES = pourquoi(
    'forme: faux {{k}}', 8, '$6$ carrés', 2,
    'En pliant, ' + colt('deux carrés arrivent au même endroit') + ', et il reste un trou.')
MANQUE = pourquoi(
    selon('k', [grille(g) for g in G5]), len(G5), '$5$ carrés', 0,
    'Même bien plié, il reste un trou : ' + colt('il manque une face') + '.')
TROP = pourquoi(
    selon('k', [grille(g) for g in G7]), len(G7), '$7$ carrés', 1,
    'Un carré ne trouve pas de place : ' + colt('il y a une face de trop') + '.')

SPECS_PATRON = [
    spec('La croix : oui', 0, {'v': 1, 'k': 1, 'j': 1, 't': 0, 'r': 0}, ['0'], 'correct'),
    spec('Patron 3-3 retourné : oui', 0, {'v': 1, 'k': 11, 'j': 2, 't': 1, 'r': 1}, ['0'],
         'correct'),
    spec('Faux patron : non', 0, {'v': 0, 'k': 3, 'j': 2, 't': 0, 'r': 0}, ['1'], 'correct'),
    spec('Erreur : 5 carrés en ligne pris pour un patron', 0,
         {'v': 0, 'k': 3, 'j': 1, 't': 2, 'r': 0}, ['0'], 'incorrect'),
    spec('Erreur : patron tourné refusé', 0, {'v': 1, 'k': 8, 'j': 1, 't': 3, 'r': 0}, ['1'],
         'incorrect'),
    spec('6 carrés : deux faces l\'une sur l\'autre', 1, {'k': 2, 't': 0}, ['2'], 'correct'),
    spec('Erreur : « il manque une face » avec 6 carrés', 1, {'k': 4, 't': 1}, ['0'],
         'incorrect'),
    spec('5 carrés : il manque une face', 2, {'k': 1, 't': 0}, ['0'], 'correct'),
    spec('Erreur : 5 carrés, « deux faces l\'une sur l\'autre »', 2, {'k': 3, 't': 2}, ['2'],
         'incorrect'),
    spec('7 carrés : une face de trop', 3, {'k': 5, 't': 0}, ['1'], 'correct'),
    spec('Erreur : 7 carrés, « il manque une face »', 3, {'k': 2, 't': 3}, ['0'], 'incorrect'),
]

# ---- 09. La face opposée (CM1-116, CM2-101) ----

OPPOSEE_CONSIGNE = ('On plie ce patron pour fabriquer un cube. Touche la face qui sera **en face**'
                    ' de la face grise, une fois le cube fermé.')
OPPOSEE_ETAPES = [
    'Une fois le cube fermé, la face opposée à la face grise ne la touche pas, même par un coin.',
    'Dans une rangée de carrés, deux carrés séparés par un seul carré deviennent des faces'
    ' opposées.',
]

OPP_CROIX = variation(
    OPPOSEE_CONSIGNE + bloc('patron', 'solide: cube', 'forme: 1', 'marquer: face {{m}}',
                            'designer: opposee', 'tourner: {{eval:90*t}}'),
    None, [var('m', '1..6'), var('t', '0..3')], OPPOSEE_ETAPES)
OPP_AUTRES = variation(
    OPPOSEE_CONSIGNE + bloc('patron', 'solide: cube', 'forme: {{k}}', 'marquer: face {{m}}',
                            'designer: opposee', 'tourner: {{eval:90*t}}',
                            'retourner: {{if:r==1|oui|non}}'),
    None, [var('k', '2..11'), var('m', '1..6'), var('t', '0..3'), var('r', '0..1')],
    OPPOSEE_ETAPES)


def opposee(k, m):
    r = sonde([{'src': f'solide: cube\nforme: {k}\nmarquer: face {m}\ndesigner: opposee'}])[0]
    return r['answer']


SPECS_OPPOSEE = []
for (vi, k, m, t, r, voisine) in [(0, 1, 2, 0, 0, '3'), (0, 1, 1, 1, 0, '2'),
                                  (1, 7, 2, 0, 0, '1'), (1, 11, 1, 2, 1, '2'),
                                  (1, 4, 3, 3, 0, '4')]:
    bon = opposee(k, m)
    variables = {'m': m, 't': t} if vi == 0 else {'k': k, 'm': m, 't': t, 'r': r}
    SPECS_OPPOSEE.append(spec(f'Patron {k}, face {m} : la face {bon}', vi, variables, [bon],
                              'correct'))
    if voisine != bon:
        SPECS_OPPOSEE.append(spec(f'Erreur : une face voisine ({voisine})', vi, variables,
                                  [voisine], 'incorrect'))
    SPECS_OPPOSEE.append(spec('Erreur : la face grise elle-même', vi, variables, [str(m)],
                              'incorrect'))

# ---- 10. Compléter un patron de cube (CM1-116, CM2-101) ----

# (patron, faces retirées) qui laissent des faces reliées (sonde du 2026-11-19)
COMPLETER_1 = [(1, '1'), (1, '2'), (1, '5'), (1, '6'), (2, '1'), (2, '5'), (2, '6'), (3, '1'),
               (3, '5'), (3, '6'), (4, '1'), (4, '5'), (4, '6'), (5, '1'), (5, '6'), (6, '1'),
               (6, '2'), (6, '5'), (6, '6'), (7, '1'), (7, '5'), (7, '6'), (8, '1'), (8, '5'),
               (8, '6'), (9, '1'), (9, '6'), (10, '1'), (10, '6'), (11, '1'), (11, '6')]
COMPLETER_2 = [(1, '1 2'), (1, '1 5'), (1, '1 6'), (1, '2 5'), (1, '2 6'), (1, '4 5'),
               (1, '5 6'), (2, '1 5'), (2, '1 6'), (2, '4 5'), (2, '5 6'), (3, '1 2'),
               (3, '1 5'), (3, '1 6'), (3, '4 5'), (3, '5 6'), (4, '1 2'), (4, '1 5'),
               (4, '1 6'), (4, '5 6'), (5, '1 2'), (5, '1 6'), (5, '5 6'), (6, '1 2'),
               (6, '1 5'), (6, '1 6'), (6, '2 5'), (6, '2 6'), (6, '5 6'), (7, '1 2'),
               (7, '1 5'), (7, '1 6'), (7, '4 5'), (7, '5 6'), (8, '1 2'), (8, '1 5'),
               (8, '1 6'), (8, '5 6'), (9, '1 2'), (9, '1 6'), (9, '5 6'), (10, '1 2'),
               (10, '1 6'), (10, '5 6'), (11, '1 2'), (11, '1 6'), (11, '5 6')]


def completer(table, consigne):
    return variation(
        consigne + bloc('patron', 'solide: cube', 'forme: ' + selon('q', [k for k, _ in table]),
                        'completer: ' + selon('q', [c for _, c in table]),
                        'tourner: {{eval:90*t}}', 'retourner: {{if:r==1|oui|non}}'),
        None, [var('q', '1..' + str(len(table))), var('t', '0..3'), var('r', '0..1')],
        ['On imagine le cube plié : chaque face posée doit boucher un trou, sans tomber sur une'
         ' face déjà là.',
         'Plusieurs places peuvent être justes : toute pose qui se plie en cube est juste.'])


COMPLETER_UN = completer(COMPLETER_1, 'Il manque **une face** à ce patron de cube. Pose-la pour'
                         ' que l\'assemblage se plie en cube.')
COMPLETER_DEUX = completer(COMPLETER_2, 'Il manque **deux faces** à ce patron de cube.'
                           ' Pose-les pour que l\'assemblage se plie en cube.')


def mauvaises_poses(attendu):
    """Grilles où les faces posées sont déplacées sur des cases vides voisines d'une face."""
    g = [list(x) for x in attendu.split('/')]
    h, w = len(g), len(g[0])
    posees = [(y, x) for y in range(h) for x in range(w) if g[y][x] == '2']
    vides = [(y, x) for y in range(h) for x in range(w) if g[y][x] == '0'
             and any(0 <= y + dy < h and 0 <= x + dx < w and g[y + dy][x + dx] == '1'
                     for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
    for y, x in posees:
        g[y][x] = '0'
    essais = []
    for case in vides:
        autre = [list(ligne) for ligne in g]
        reste = len(posees)
        for (y, x) in [case] + [p for p in vides if p != case]:
            if reste == 0:
                break
            if autre[y][x] == '0':
                autre[y][x] = '2'
                reste -= 1
        essais.append('/'.join(''.join(ligne) for ligne in autre))
    return essais


def specs_completer(vi, table, choisis):
    specs = []
    for q in choisis:
        k, c = table[q - 1]
        src = f'solide: cube\nforme: {k}\ncompleter: {c}'
        bon = sonde([{'src': src}])[0]['answer']
        essais = mauvaises_poses(bon)
        juges = sonde([{'src': src, 'essais': essais}])[0]['juges']
        faux = [x for x, j in zip(essais, juges) if not j]
        justes_ailleurs = [x for x, j in zip(essais, juges) if j and x != bon]
        variables = {'q': q, 't': 0, 'r': 0}
        specs.append(spec(f'Patron {k}, faces {c} reposées à leur place', vi, variables, [bon],
                          'correct'))
        if justes_ailleurs:
            specs.append(spec(f'Patron {k} : une autre pose qui se plie', vi, variables,
                              [justes_ailleurs[0]], 'correct'))
        specs.append(spec(f'Erreur : patron {k}, une face posée sur une face déjà là en pliant',
                          vi, variables, [faux[0]], 'incorrect'))
    return specs


SPECS_COMPLETER = specs_completer(0, COMPLETER_1, [1, 2, 20, 31]) + specs_completer(
    1, COMPLETER_2, [1, 4, 30, 47])

# ---- 11. Où regarde le robot ? (CM1-117, CM2-103) ----

SENS = ['haut', 'droite', 'bas', 'gauche']
VERS = ['Vers le haut.', 'Vers la droite.', 'Vers le bas.', 'Vers la gauche.']
CASE_VOISINE = ['Sur la case juste au-dessus.', 'Sur la case juste à droite.',
                'Sur la case juste en dessous.', 'Sur la case juste à gauche.']
VERS_TEXTE = ['vers le haut', 'vers la droite', 'vers le bas', 'vers la gauche']
NEZ = 'Le robot regarde dans le sens de son nez.'
ROBOT_SEUL = bloc('robot', 'quadrillage: 5 x 5', 'codage: avance-pivote',
                  'départ: 3, 3, ' + selon('s', SENS))
SA_DROITE = ('Sa droite et sa gauche sont celles du robot, pas les tiennes : on se met à sa place,'
             ' le nez dans son sens.')


FIN = selon('a', [colt(x) for x in VERS_TEXTE])  # sens d'arrivée a (1 à 4), en couleur


QUART = variation(
    NEZ + ROBOT_SEUL + '\n\nIl pivote d\'un **quart de tour à {{if:w==1|gauche|droite}}**. Où'
    ' regarde-t-il maintenant ?' + choix(VERS, melanger=False),
    ['{{eval:a-1}}'],
    [var('s', '1..4'), var('w', '0..1'), var('a', '{{eval:mod(s+2*w,4)+1}}')],
    [SA_DROITE,
     'Il regardait ' + selon('s', VERS_TEXTE) + ' ; après un quart de tour à'
     ' {{if:w==1|gauche|droite}}, il regarde ' + FIN + '.'])

DEMI = variation(
    NEZ + ROBOT_SEUL + '\n\nIl fait **demi-tour**. Où regarde-t-il maintenant ?'
    + choix(VERS, melanger=False),
    ['{{eval:a-1}}'],
    [var('s', '1..4'), var('a', '{{eval:mod(s+1,4)+1}}')],
    ['Un demi-tour, c\'est deux quarts de tour : le robot regarde dans le sens opposé.',
     'Il regardait ' + selon('s', VERS_TEXTE) + ' ; il regarde maintenant '
     + FIN + '.'])

# suites de pivots : (texte, décalage en quarts de tour vers la droite)
SUITES = [('pivote à droite, puis pivote à droite', 2),
          ('pivote à gauche, puis pivote à gauche', 2),
          ('pivote à droite, puis pivote à gauche', 0),
          ('pivote à gauche, puis fait demi-tour', 1),
          ('fait demi-tour, puis pivote à gauche', 1),
          ('pivote à droite, puis fait demi-tour', 3),
          ('pivote à droite, pivote à droite, puis pivote à droite', 3),
          ('pivote à gauche, pivote à gauche, puis pivote à gauche', 1),
          ('pivote à gauche, pivote à droite, puis pivote à gauche', 3),
          ('pivote à droite, fait demi-tour, puis pivote à droite', 0)]

PLUSIEURS = variation(
    NEZ + ROBOT_SEUL + '\n\nLe robot ' + selon('j', [x for x, _ in SUITES])
    + '. Où regarde-t-il à la fin ?' + choix(VERS, melanger=False),
    ['{{eval:a-1}}'],
    [var('s', '1..4'), var('j', '1..' + str(len(SUITES))),
     var('o', selon('j', [d for _, d in SUITES])), var('a', '{{eval:mod(s-1+o,4)+1}}')],
    [SA_DROITE + ' On le fait tourner une instruction après l\'autre.',
     'Il regardait ' + selon('s', VERS_TEXTE) + ' ; à la fin, il regarde '
     + FIN + '.'])

RECULE = variation(
    NEZ + ROBOT_SEUL + '\n\nIl **recule d\'une case**, sans tourner. Où arrive-t-il ?'
    + choix(CASE_VOISINE, melanger=False),
    ['{{eval:a-1}}'],
    [var('s', '1..4'), var('a', '{{eval:mod(s+1,4)+1}}')],
    ['Reculer, c\'est aller en arrière, dans le dos du robot, sans changer le sens où il'
     ' regarde.',
     'Il regarde ' + selon('s', VERS_TEXTE) + ' : il recule ' + FIN + '.'])

SPECS_REGARDE = [
    spec('Regarde en haut, quart à droite : droite', 0, {'s': 1, 'w': 0, 'a': 2}, ['1'], 'correct'),
    spec('Regarde en bas, quart à droite : gauche', 0, {'s': 3, 'w': 0, 'a': 4}, ['3'], 'correct'),
    spec('Erreur : sa droite prise pour la mienne', 0, {'s': 3, 'w': 0, 'a': 4}, ['1'], 'incorrect'),
    spec('Regarde à gauche, quart à gauche : bas', 0, {'s': 4, 'w': 1, 'a': 3}, ['2'], 'correct'),
    spec('Erreur : sens contraire', 0, {'s': 4, 'w': 1, 'a': 3}, ['0'], 'incorrect'),
    spec('Demi-tour depuis droite : gauche', 1, {'s': 2, 'a': 4}, ['3'], 'correct'),
    spec('Erreur : demi-tour pris pour un quart de tour', 1, {'s': 2, 'a': 4}, ['2'], 'incorrect'),
    spec('Droite puis droite, depuis haut : bas', 2, {'s': 1, 'j': 1, 'o': 2, 'a': 3}, ['2'], 'correct'),
    spec('Trois fois à gauche, depuis haut : droite', 2, {'s': 1, 'j': 8, 'o': 1, 'a': 2}, ['1'],
         'correct'),
    spec('Erreur : un seul pivot compté', 2, {'s': 1, 'j': 8, 'o': 1, 'a': 2}, ['3'], 'incorrect'),
    spec('Recule en regardant en haut : en dessous', 3, {'s': 1, 'a': 3}, ['2'], 'correct'),
    spec('Erreur : avance au lieu de reculer', 3, {'s': 1, 'a': 3}, ['0'], 'incorrect'),
]

# ---- 12. Où arrive le robot ? (CM1-118, CM2-104) ----

DIR = [(0, 1), (1, 0), (0, -1), (-1, 0)]
LARGEUR, HAUTEUR = 8, 6  # nœuds 0..8 × 0..6


def avancer(depart, code, inverse=False, sans_demi=False):
    """Position finale, ou None si le robot sort ; `inverse` : droite et gauche échangées."""
    (x, y, s) = depart
    for ins in code:
        if ins[0] == 'A':
            dx, dy = DIR[s]
            for _ in range(ins[1]):
                x, y = x + dx, y + dy
                if not (0 <= x <= LARGEUR and 0 <= y <= HAUTEUR):
                    return None
        elif ins[0] == 'D':
            s = (s + (3 if inverse else 1)) % 4
        elif ins[0] == 'G':
            s = (s + (1 if inverse else 3)) % 4
        elif ins[0] == 'T' and not sans_demi:
            s = (s + 2) % 4
    return (x, y)


def texte_code(code):
    mots = {'D': 'pivote à droite', 'G': 'pivote à gauche', 'T': 'demi-tour'}
    return ', '.join(f'avance de {ins[1]}' if ins[0] == 'A' else mots[ins[0]] for ins in code)


def tirer_scenes(n, graine):
    hasard = random.Random(graine)
    scenes = []
    while len(scenes) < n:
        depart = (hasard.randint(1, LARGEUR - 1), hasard.randint(1, HAUTEUR - 1),
                  hasard.randint(0, 3))
        code = [('A', hasard.randint(1, 3))]
        taille = hasard.randint(4, 7)
        while len(code) < taille:
            if code[-1][0] == 'A':
                code.append((hasard.choice('DDGGT'),))
            else:
                code.append(('A', hasard.randint(1, 3)))
        if code[-1][0] != 'A':
            code.append(('A', hasard.randint(1, 3)))
        if not any(c[0] in 'DG' for c in code) or len(code) > 7:
            continue
        # une scène sur deux avec un demi-tour (vocabulaire du CM1)
        if any(c[0] == 'T' for c in code) != (len(scenes) % 2 == 0):
            continue
        # « avance de 2, demi-tour, avance de 2 » ramène le robot sur ses pas : écarté
        if any(code[n][0] == 'T' and code[n - 1] == code[n + 1] for n in range(1, len(code) - 1)):
            continue
        juste = avancer(depart, code)
        if juste is None or juste == depart[:2]:
            continue
        pieges = [avancer(depart, code, inverse=True)]
        if any(c[0] == 'T' for c in code):
            pieges.append(avancer(depart, code, sans_demi=True))
        else:
            dernier = code[-1][1]
            pieges.append(avancer(depart, code[:-1] + [('A', dernier + 1)]))
        points = [juste] + pieges
        if None in points or len(set(points)) < 3 or depart[:2] in points:
            continue
        if any(abs(p[0] - depart[0]) + abs(p[1] - depart[1]) < 2 for p in pieges):
            continue
        ordre = hasard.sample(range(3), 3)  # numéro (0 à 2) de chaque point : juste, pièges
        scenes.append({'depart': depart, 'code': code, 'points': points, 'numeros': ordre})
    return scenes


def figure_robot(scene):
    (x, y, s) = scene['depart']
    dx, dy = DIR[s]
    px, py = -dy, dx
    nez = (x + 0.4 * dx, y + 0.4 * dy)
    b1 = (x - 0.25 * dx + 0.25 * px, y - 0.25 * dy + 0.25 * py)
    b2 = (x - 0.25 * dx - 0.25 * px, y - 0.25 * dy - 0.25 * py)

    def f(v):
        return ('%g' % round(v, 2))

    lignes = ['```figure', f'fenetre: -0.6 ; {LARGEUR + 0.9} ; -0.6 ; {HAUTEUR + 0.9}',
              'description: Un quadrillage, le robot au départ et trois points numérotés 1, 2'
              ' et 3.',
              'grille: oui', '---',
              f'rb0 = point({f(nez[0])}, {f(nez[1])}, visible=faux)',
              f'rb1 = point({f(b1[0])}, {f(b1[1])}, visible=faux)',
              f'rb2 = point({f(b2[0])}, {f(b2[1])}, visible=faux)',
              'rb = polygone(rb0, rb1, rb2, couleur="noir", remplissage="rouge", opacite_fond=1)']
    for (n, (qx, qy)) in sorted(zip(scene['numeros'], scene['points'])):
        lignes.append(f'P{n} = point({qx}, {qy}, couleur="noir", etiquette="aucune")')
        lignes.append(f'texte({f(qx + 0.3)}, {f(qy + 0.3)}, "{n + 1}")')
    lignes.append('```')
    return '\n'.join(lignes)


SCENES = tirer_scenes(12, 2026111918)

OU_ARRIVE = variation(
    'Le robot rouge regarde dans le sens de sa pointe. Chaque carreau du quadrillage compte'
    ' pour $1$.\n\n**Avance de 2** : il avance de $2$ carreaux tout droit. **Pivote à droite**'
    ' (ou **à gauche**) : il tourne sur place d\'un quart de tour vers sa droite (ou sa'
    ' gauche). **Demi-tour** : il tourne sur place pour regarder dans le sens opposé.\n\n'
    'Code : ' + selon('k', [texte_code(sc['code']) for sc in SCENES]) + '\n\n'
    + selon('k', [figure_robot(sc) for sc in SCENES])
    + '\n\nOù arrive le robot ?'
    + choix(['Au point 1.', 'Au point 2.', 'Au point 3.'], melanger=False),
    ['{{a}}'],
    [var('k', '1..' + str(len(SCENES))),
     var('a', selon('k', [sc['numeros'][0] for sc in SCENES]))],
    ['On suit le code une instruction après l\'autre, depuis le départ, en se mettant à la'
     ' place du robot : sa droite et sa gauche sont les siennes.',
     'Le robot arrive au ' + colt('point {{eval:a+1}}') + '.'])

SPECS_ARRIVE = []
for k in (1, 4, 9):
    sc = SCENES[k - 1]
    bon = sc['numeros'][0]
    SPECS_ARRIVE.append(spec(f'Où arrive-t-il ? (k = {k})', 0, {'k': k, 'a': bon}, [str(bon)],
                             'correct'))
    SPECS_ARRIVE.append(spec(f'Erreur : droite et gauche échangées (k = {k})', 0,
                             {'k': k, 'a': bon}, [str(sc['numeros'][1])], 'incorrect'))
    SPECS_ARRIVE.append(spec(f'Erreur : demi-tour oublié ou une case de trop (k = {k})', 0,
                             {'k': k, 'a': bon}, [str(sc['numeros'][2])], 'incorrect'))

# ---- 13. Écrire le code du robot (CM1-118, CM2-104) ----

# un mur gris dans la colonne c, une seule ouverture à la ligne g
MUR = selon('g', [' ; '.join(f'{{{{c}}}}, {r}' for r in range(1, 8) if r != g)
                  for g in range(1, 8)])
VARS_MUR = [var('c', '4..7'), var('g', '1..7'), var('xd', '1..{{eval:c-1}}'), var('yd', '1..7'),
            var('xa', '{{eval:c+1}}..10'), var('ya', '1..7')]
CONDS_MUR = ['abs(xa-xd)+abs(yd-g)+abs(ya-g) <= 15', 'abs(yd-g)+abs(ya-g) >= 1']
CORRIGE_CODE = ('On suit le code case par case depuis le robot : il est juste s\'il finit sur la'
                ' case verte, sans sortir du quadrillage ni entrer dans une case grise. Un autre'
                ' chemin que celui du corrigé est juste aussi.')

CODE_FLECHES = variation(
    'Écris le code qui mène le robot à la case verte. Chaque flèche le fait avancer d\'une case'
    ' dans son sens. Il ne peut pas entrer dans une case grise.'
    + bloc('robot', 'quadrillage: 10 x 7', 'départ: {{xd}}, {{yd}}', 'arrivée: {{xa}}, {{ya}}',
           'interdites: ' + MUR, 'produire: oui'),
    None, VARS_MUR,
    ['Le mur gris n\'a qu\'une ouverture : le robot doit passer par elle.', CORRIGE_CODE],
    CONDS_MUR)

CODE_PIVOTE = variation(
    'Écris le code qui mène le robot à la case verte. Son nez montre où il regarde. **Avance'
    ' de 3** : il avance de $3$ cases tout droit. **Pivote à droite** (ou **à gauche**) : il'
    ' tourne d\'un quart de tour sur place, vers sa droite (ou sa gauche). Il ne peut pas entrer'
    ' dans une case grise.'
    + bloc('robot', 'quadrillage: 10 x 7', 'codage: avance-pivote',
           'départ: {{xd}}, {{yd}}, ' + selon('s', SENS), 'arrivée: {{xa}}, {{ya}}',
           'interdites: ' + MUR, 'produire: oui'),
    None, VARS_MUR + [var('s', '1..4')],
    ['Avant d\'avancer, on fait pivoter le robot pour que son nez regarde là où il doit aller.'
     ' Sa droite et sa gauche sont celles du robot, pas les tiennes.',
     'Le mur gris n\'a qu\'une ouverture : le robot doit passer par elle.', CORRIGE_CODE],
    CONDS_MUR)

M1 = {'c': 5, 'g': 4, 'xd': 2, 'yd': 2, 'xa': 8, 'ya': 6}
SPECS_CODE = [
    spec('Juste : monter, passer l\'ouverture, monter', 0, M1,
         ['↑ ↑ → → → → → → ↑ ↑'], 'correct'),
    spec('Juste : un autre chemin par l\'ouverture', 0, M1,
         ['→ → ↑ ↑ → → → → ↑ ↑'], 'correct'),
    spec('Erreur : tout droit dans le mur', 0, M1, ['→ → → → → → ↑ ↑ ↑ ↑'], 'incorrect'),
    spec('Erreur : une case de trop', 0, M1, ['↑ ↑ → → → → → → ↑ ↑ ↑'], 'incorrect'),
    spec('Juste : regarde en haut, avance, pivote', 1, dict(M1, s=1),
         ['avance de 2, pivote à droite, avance de 6, pivote à gauche, avance de 2'], 'correct'),
    spec('Erreur : droite et gauche échangées', 1, dict(M1, s=1),
         ['avance de 2, pivote à gauche, avance de 6, pivote à droite, avance de 2'],
         'incorrect'),
    spec('Juste : regarde à gauche, demi-tour en deux pivots', 1, dict(M1, s=4),
         ['pivote à droite, avance de 2, pivote à droite, avance de 6, pivote à gauche,'
          ' avance de 2'], 'correct'),
    spec('Erreur : avance sans pivoter d\'abord', 1, dict(M1, s=4),
         ['avance de 2, pivote à droite, avance de 6, pivote à gauche, avance de 2'],
         'incorrect'),
]

# ---- 14. Combien de petits cubes ? (CM1-119, CM2-105) ----

COMPTE = 'Combien de petits cubes y a-t-il dans cet assemblage ?'
CACHES = ('**On compte pile par pile.** Un cube est toujours posé sur le sol ou sur un autre'
          ' cube : sous le dessus d\'une pile, il y a tous les cubes de la pile, même ceux qu\'on'
          ' ne voit pas.')

UNE_RANGEE = variation(
    COMPTE + bloc('cubes', 'hauteurs: {{a}} {{b}} {{c}} {{d}} {{f}}') + '\n\n$$?$$',
    ['{{eval:a+b+c+d+f}}'],
    [var('a', '1..4'), var('b', '1..4'), var('c', '1..4'), var('d', '1..4'), var('f', '1..4')],
    ['On compte les cubes de chaque pile, de gauche à droite.',
     '${{a}} + {{b}} + {{c}} + {{d}} + {{f}} = ' + col('{{eval:a+b+c+d+f}}') + '$ cubes.'])

DEUX_RANGEES = variation(
    COMPTE + bloc('cubes', 'hauteurs: {{a}} {{b}} {{c}} / {{d}} {{f}} {{g}}') + '\n\n$$?$$',
    ['{{eval:a+b+c+d+f+g}}'],
    [var('a', '2..4'), var('b', '2..4'), var('c', '2..4'), var('d', '1..2'), var('f', '1..2'),
     var('g', '1..2')],
    [CACHES,
     'Rangée du fond : ${{a}} + {{b}} + {{c}} = {{eval:a+b+c}}$. Rangée de devant : ${{d}} +'
     ' {{f}} + {{g}} = {{eval:d+f+g}}$.',
     'En tout : ${{eval:a+b+c}} + {{eval:d+f+g}} = ' + col('{{eval:a+b+c+d+f+g}}')
     + '$ cubes.'])

ESCALIERS = ['3 2 1 / 3 2 1', '4 3 2 1 / 4 3 2 1', '3 2 1 / 2 1 0 / 1 0 0', '1 2 3 / 1 2 3',
             '4 3 2 1 / 3 2 1 0', '3 3 2 / 2 2 1 / 1 1 0', '2 2 2 / 2 2 1 / 2 1 1']


def detail(h):
    rangs = [[int(x) for x in r.split()] for r in h.split('/')]
    noms = (['du fond', 'de devant'] if len(rangs) == 2
            else ['du fond', 'du milieu', 'de devant'])
    morceaux = [f'rangée {nom} : ${" + ".join(map(str, r))} = {sum(r)}$'
                for nom, r in zip(noms, rangs)]
    texte = ' ; '.join(morceaux)
    return texte[0].upper() + texte[1:], sum(sum(r) for r in rangs)


ESCALIER = variation(
    COMPTE + bloc('cubes', 'hauteurs: {{H}}') + '\n\n$$?$$',
    ['{{N}}'],
    [var('k', '1..' + str(len(ESCALIERS))), var('H', selon('k', ESCALIERS)),
     var('N', selon('k', [detail(h)[1] for h in ESCALIERS])),
     var('T', selon('k', [detail(h)[0] for h in ESCALIERS]))],
    [CACHES, '{{T}}.', 'En tout : ' + nb('{{N}}') + ' cubes.'])

SPECS_CUBES = [
    spec('Une rangée : 2 + 3 + 1 + 4 + 2 = 12', 0, {'a': 2, 'b': 3, 'c': 1, 'd': 4, 'f': 2},
         ['12'], 'correct'),
    spec('Erreur : une pile = un cube', 0, {'a': 2, 'b': 3, 'c': 1, 'd': 4, 'f': 2}, ['5'],
         'incorrect'),
    spec('Deux rangées : 9 + 4 = 13', 1, {'a': 3, 'b': 4, 'c': 2, 'd': 1, 'f': 2, 'g': 1},
         ['13'], 'correct'),
    spec('Erreur : seulement les cubes de devant', 1,
         {'a': 3, 'b': 4, 'c': 2, 'd': 1, 'f': 2, 'g': 1}, ['4'], 'incorrect'),
]
for k in (1, 3, 7):
    h = ESCALIERS[k - 1]
    t, n = detail(h)
    variables = {'k': k, 'H': h, 'N': n, 'T': t}
    SPECS_CUBES.append(spec(f'Escalier {h} : {n}', 2, variables, [str(n)], 'correct'))
    SPECS_CUBES.append(spec('Erreur : un cube de moins (un caché oublié)', 2, variables,
                            [str(n - 1)], 'incorrect'))

MODELES = {
    '08-est-ce-un-patron-de-cube-pourquoi': modele(
        'Est-ce un patron de cube ? Pourquoi ?',
        'Oui ou non (11 patrons, 8 faux patrons, tournés, retournés) ; pourquoi non : deux faces'
        ' l\'une sur l\'autre (6 carrés), il manque une face (5), une face de trop (7)',
        CM, 4, [EST_CE, TROP_PRES, MANQUE, TROP], SPECS_PATRON, delay=45),
    '09-la-face-opposee': modele(
        'La face opposée',
        'Toucher, sur un patron de cube, la face qui sera en face de la face grise : la croix,'
        ' puis les 10 autres patrons, tournés, retournés',
        CM, 5, [OPP_CROIX, OPP_AUTRES], SPECS_OPPOSEE, delay=60),
    '10-completer-un-patron-de-cube': modele(
        'Compléter un patron de cube',
        'Poser une, puis deux faces manquantes d\'un patron de cube ; toute pose qui se plie en'
        ' cube est juste',
        CM, 6, [COMPLETER_UN, COMPLETER_DEUX], SPECS_COMPLETER, delay=90),
    '11-ou-regarde-le-robot': modele(
        'Où regarde le robot ?',
        'Quart de tour à droite, à gauche (celles du robot), demi-tour, deux ou trois pivots de'
        ' suite ; reculer d\'une case',
        CM, 6, [QUART, DEMI, PLUSIEURS, RECULE], SPECS_REGARDE, delay=30),
    '12-ou-arrive-le-robot': modele(
        'Où arrive le robot ? (code en mots)',
        'Code « avance de… / pivote… / demi-tour » de 4 à 7 instructions sur un quadrillage ;'
        ' trois points, dont l\'arrivée si l\'on échange droite et gauche',
        CM, 7, [OU_ARRIVE], SPECS_ARRIVE, delay=90),
    '13-ecrire-le-code-du-robot-mur': modele(
        'Écrire le code du robot : passer par l\'ouverture',
        'Quadrillage 10 × 7, un mur gris à une seule ouverture : code en flèches, puis avance et'
        ' pivote avec un sens de départ tiré',
        CM, 8, [CODE_FLECHES, CODE_PIVOTE], SPECS_CODE, delay=120),
    '14-combien-de-petits-cubes': modele(
        'Combien de petits cubes ?',
        'Une rangée de piles, deux rangées avec des cubes cachés, escaliers (20 cubes au plus)',
        CM, 6, [UNE_RANGEE, DEUX_RANGEES, ESCALIER], SPECS_CUBES, delay=60),
}

for nom, m in MODELES.items():
    with open(f'{DOSSIER}/{nom}.json', 'w') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
print(len(MODELES), 'modèles écrits')
