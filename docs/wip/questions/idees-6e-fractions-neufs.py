"""Écrit les modèles neufs du chantier idees-6e-fractions dans scripts/questions/idees-6e-fractions-neufs/.

Phase 0 validée par David le 2026-11-25 (« je suis tes recos », journal
docs/archive/wip/idees-6e-fractions/idees-6e-fractions-progress.md) : N1 à N6. On reprend l'idée de l'autre plateforme, pas sa
forme : le geste « placer » sur la droite, les étiquettes à associer, le labyrinthe ; le dénominateur
commun imposé pour que chaque case ait une seule réponse.

Ni theme, ni domain, ni subdomain, ni id : le rangement (nœud du point + tag) se fera par migration,
après la création en brouillon. Points visés : N1 → 6-126 (définition), N2 → 6-128 (droite
graduée), N3 → 6-132 (égalité de fractions), N4 → 6-133 (ordre), N5 → 6-141 (calculs de
pourcentages), N6 → CM2-130 (multiples et diviseurs ; la 6e n'a pas de point pour les multiples).
Niveaux : le premier libre de chaque sous-notion en prod le 2026-11-25 (N1 16, N2 14, N3 10,
N4 18, N5 9, N6 18), à relever de nouveau avant la migration de rangement.

Règles suivies (couvrir-un-niveau.md § 5) : erreurs prévues par case d'écriture ordinaire (de
vraies erreurs d'élèves, sans en inventer pour atteindre trois), chacune avec sa spec `incorrect`
qui nomme son message ; un coup de pouce par variation, qui ne donne jamais la réponse. Les
gestes (placer, associer, labyrinthe) n'ont pas d'erreurs prévues.

Réponses des étiquettes à associer : positions AFFICHÉES, lues par
scripts/questions/ranger-attendus.ts ; chemins du labyrinthe : `A_CALCULER`, remplis par
scripts/questions/labyrinthe-chemins.ts --ecrire.

Usage : python3 docs/wip/questions/idees-6e-fractions-neufs.py scripts/questions/idees-6e-fractions-neufs
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
SECOND = '\\textcolor{{{color:primary.1}}}'
FRACTIONS_LIBRES = {'constraints': {'reducedFractions': 'off'}}
FRACTION = {'pattern': 'u:integer / w:integer'}


def spec(desc, vi, variables_, status, answers, message=None, violations=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = message
    if violations is not None:
        expected['constraintViolations'] = violations
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': expected, 'answers': answers}


FR = 'Nombres et calculs > Fractions : sens et écritures > '


def modele(title, description, level, delay, variations, specs, options=None, grades=None,
           rangement=None):
    m = {'rangement': rangement, 'title': title, 'description': description, 'grades': grades or ['6'], 'level': level,
         'delay': delay, 'status': 'draft'}
    if options:
        m['options'] = options
    m['variations'] = variations
    m['testSpecs'] = specs
    return m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def case(attendue, erreurs=None, forme=None):
    c = {'expectedAnswer': attendue}
    if forme:
        c['requiredForm'] = forme
    if erreurs:
        c['expectedErrors'] = erreurs
    return c


def variation(statement, variables, blanks, steps, hint, conditions=None):
    v = {'statement': statement, 'variables': variables, 'conditions': conditions or []}
    if blanks is not None:
        v['blanks'] = blanks
    v['correction'] = {'steps': steps}
    v['hint'] = hint
    return v


def couleur(contenu, c=PRIMAIRE):
    return c + '{' + contenu + '}'


def fr(n, d):
    return '\\frac{' + n + '}{' + d + '}'


def bloc(nom, *lignes):
    return '```' + nom + '\n' + '\n'.join(lignes) + '\n```'


def ecrire(nom, m):
    os.makedirs(DOSSIER, exist_ok=True)
    chemin = os.path.join(DOSSIER, nom + '.json')
    # Garder l'id écrit en tête par create-questions --publier, et les chemins calculés du
    # labyrinthe, s'ils existent
    if os.path.exists(chemin):
        with open(chemin, encoding='utf-8') as f:
            ancien = json.load(f)
        if 'id' in ancien:
            m = {'id': ancien['id'], **m}
        anciennes = {s['description']: s['answers'] for s in ancien.get('testSpecs', [])}
        for s in m['testSpecs']:
            if s['answers'] and s['answers'][0].startswith('A_CALCULER') \
                    and s['description'] in anciennes \
                    and not anciennes[s['description']][0].startswith('A_CALCULER'):
                s['answers'] = anciennes[s['description']]
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write('\n')


def parts(v):
    """Nom des parts d'une unité partagée en v (2 à 12)."""
    noms = {2: 'demis', 3: 'tiers', 4: 'quarts', 5: 'cinquièmes', 6: 'sixièmes',
            7: 'septièmes', 8: 'huitièmes', 9: 'neuvièmes', 10: 'dixièmes', 11: 'onzièmes',
            12: 'douzièmes'}
    texte = noms[12]
    for k in range(11, 1, -1):
        texte = '{{if:' + v + '==' + str(k) + '|' + noms[k] + '|' + texte + '}}'
    return texte


# =============================================================================================
# N1 — 6-126 : lire une fraction par la définition du quotient. Seuls 0 et n (ou 2n) sont
# écrits ; entre eux, d (ou 2d) intervalles égaux ; A est à la première graduation : d fois sa
# valeur donne n, donc A repère n/d.
# =============================================================================================

N1_ENONCE = ('Quel nombre repère le point $A$ ? Écris-le sous la forme d\'une fraction.\n\n'
             + bloc('line', 'start: 0', 'end: {{F}}', 'step: {{n}}/{{d}}', 'major: {{M}}',
                    'labels: 0, {{F}}', 'points: A={{n}}/{{d}}')
             + '\n\n$$A : ?$$')

N1_A = variation(
    N1_ENONCE,
    [var('d', '2..7'), var('n', '2..{{eval:2*d-1}}'), var('F', 'eval:n'), var('M', 'eval:d')],
    [case(fr('{{n}}', '{{d}}'), [
        erreur(fr('{{d}}', '{{n}}'), 'Numérateur et dénominateur sont inversés : ${{d}}$ fois '
               'la longueur de $0$ à $A$ donne ${{n}}$.', 'Fraction inversée'),
        erreur(fr('1', '{{d}}'), 'L\'unité n\'est pas de $0$ à ${{n}}$ : ici, $1$ n\'est pas '
               'écrit. Compte combien de fois la longueur de $0$ à $A$ tient de $0$ à ${{n}}$.',
               'Intervalle lu comme 1/d'),
        erreur('{{eval:n-1}}', 'Les nombres entre $0$ et ${{n}}$ ne sont pas des entiers : il y a '
               '${{d}}$ intervalles, pas ${{n}}$.', 'Graduations lues comme des entiers'),
    ], FRACTION)],
    [
        '**Définition du quotient.** De $0$ à ${{n}}$, il y a ${{d}}$ intervalles égaux. En '
        'reportant ${{d}}$ fois la longueur de $0$ à $A$, on arrive à ${{n}}$ : le nombre qui '
        'repère $A$, multiplié par ${{d}}$, donne ${{n}}$.',
        'Ce nombre, c\'est le quotient de ${{n}}$ par ${{d}}$ : $A$ repère $'
        + couleur(fr('{{n}}', '{{d}}')) + '$.',
    ],
    'Combien de fois faut-il reporter la longueur de $0$ à $A$ pour arriver à ${{n}}$ ?',
    ['mod(n,d)!=0', 'd!=n*(n-1)'],
)

N1_B = variation(
    N1_ENONCE,
    [var('d', '2..6'), var('n', '2..{{eval:2*d-1}}'), var('F', 'eval:2*n'), var('M', 'eval:2*d')],
    [case(fr('{{n}}', '{{d}}'), [
        erreur(fr('{{d}}', '{{n}}'), 'Numérateur et dénominateur sont inversés : ${{d}}$ fois '
               'la longueur de $0$ à $A$ donne ${{n}}$.', 'Fraction inversée'),
        erreur(fr('1', '{{d}}'), 'Il y a ${{eval:2*d}}$ intervalles de $0$ à ${{F}}$ : compte '
               'combien de fois la longueur de $0$ à $A$ tient de $0$ à ${{F}}$.',
               'Intervalle lu comme 1/d'),
        erreur(fr('1', '{{eval:2*d}}'), 'L\'unité n\'est pas de $0$ à ${{F}}$ : ici, $1$ n\'est '
               'pas écrit. Compte combien de fois la longueur de $0$ à $A$ tient de $0$ à '
               '${{F}}$.', 'Intervalle lu comme 1 sur le nombre d\'intervalles'),
    ], FRACTION)],
    [
        '**Définition du quotient.** De $0$ à ${{F}}$, il y a ${{eval:2*d}}$ intervalles égaux. '
        'En reportant ${{eval:2*d}}$ fois la longueur de $0$ à $A$, on arrive à ${{F}}$ : $A$ '
        'repère le quotient de ${{F}}$ par ${{eval:2*d}}$, soit $\\frac{{{F}}}{{{eval:2*d}}}$.',
        'On peut simplifier par $2$ : $\\frac{{{F}}}{{{eval:2*d}}} = '
        + couleur(fr('{{n}}', '{{d}}')) + '$. Les deux écritures sont justes.',
    ],
    'Combien de fois faut-il reporter la longueur de $0$ à $A$ pour arriver à ${{F}}$ ?',
    ['mod(n,d)!=0'],
)

V_N1 = {'d': '4', 'n': '3', 'F': '3', 'M': '4'}
V_N1b = {'d': '3', 'n': '2', 'F': '4', 'M': '6'}
SPECS_N1 = [
    spec('A : 0 et 3, 4 intervalles → 3/4', 0, V_N1, 'correct', ['\\frac{3}{4}']),
    spec('A : écriture décimale refusée (0,75)', 0, V_N1, 'bad_form', ['0{,}75'],
         violations=['form']),
    spec('A : inversée (4/3)', 0, V_N1, 'incorrect', ['\\frac{4}{3}'],
         'Numérateur et dénominateur sont inversés : $4$ fois la longueur de $0$ à $A$ donne $3$.'),
    spec('A : 1/4', 0, V_N1, 'incorrect', ['\\frac{1}{4}'],
         'L\'unité n\'est pas de $0$ à $3$ : ici, $1$ n\'est pas écrit. Compte combien de fois '
         'la longueur de $0$ à $A$ tient de $0$ à $3$.'),
    spec('A : 2 (graduations comptées)', 0, V_N1, 'incorrect', ['2'],
         'Les nombres entre $0$ et $3$ ne sont pas des entiers : il y a $4$ intervalles, pas $3$.'),
    spec('A : 0 et 7, 5 intervalles → 7/5', 0, {'d': '5', 'n': '7', 'F': '7', 'M': '5'},
         'correct', ['\\frac{7}{5}']),
    spec('B : 0 et 4, 6 intervalles → 2/3', 1, V_N1b, 'correct', ['\\frac{2}{3}']),
    spec('B : 4/6 accepté', 1, V_N1b, 'correct', ['\\frac{4}{6}']),
    spec('B : inversée (3/2)', 1, V_N1b, 'incorrect', ['\\frac{3}{2}'],
         'Numérateur et dénominateur sont inversés : $3$ fois la longueur de $0$ à $A$ donne $2$.'),
    spec('B : 1/3', 1, V_N1b, 'incorrect', ['\\frac{1}{3}'],
         'Il y a $6$ intervalles de $0$ à $4$ : compte combien de fois la longueur de $0$ à $A$ '
         'tient de $0$ à $4$.'),
    spec('B : 1/6', 1, V_N1b, 'incorrect', ['\\frac{1}{6}'],
         'L\'unité n\'est pas de $0$ à $4$ : ici, $1$ n\'est pas écrit. Compte combien de fois '
         'la longueur de $0$ à $A$ tient de $0$ à $4$.'),
]

N1 = modele(
    'Lire une fraction par la définition du quotient',
    'Seuls 0 et un entier n sont écrits sur la droite, avec d intervalles égaux entre eux : le '
    'point de la première graduation repère n/d, car d fois sa valeur donne n (3/4 entre 0 et 3) ; '
    'puis 0 et 2n avec 2d intervalles',
    16, 60, [N1_A, N1_B], SPECS_N1, FRACTIONS_LIBRES,
    rangement={'noeud': FR + 'définition', 'point': '6-126'})


# =============================================================================================
# N2 — 6-128 : placer une fraction sur une demi-droite graduée en 1/d (geste « placer »).
# =============================================================================================

def n2_enonce(pas, major):
    return ('Place le nombre $\\frac{{{a}}}{{{d}}}$ sur la demi-droite graduée.\n\n'
            + bloc('line', 'start: 0', 'end: {{u}}', 'step: ' + pas, 'major: ' + major,
                   'placer: {{a}}/{{d}}'))


N2_UNITE = ('**L\'unité.** De $0$ à $1$, l\'unité est partagée en ${{d}}$ parts égales : chaque '
            'petit intervalle vaut $\\frac{1}{{{d}}}$.')

N2_A = variation(
    n2_enonce('1/{{d}}', '{{d}}'),
    [var('d', '2..10'), var('u', 'eval:min(3,floor(30/d))'), var('a', '1..{{eval:d-1}}')],
    None,
    [N2_UNITE, '$\\frac{{{a}}}{{{d}}}$, c\'est ${{a}}$ petits intervalles à partir de $0$.'],
    'Compte les intervalles dans une unité.',
)

N2_B = variation(
    n2_enonce('1/{{d}}', '{{d}}'),
    [var('d', '2..10'), var('u', '3'), var('a', '{{eval:d+1}}..{{eval:3*d-1}}')],
    None,
    [N2_UNITE, '$\\frac{{{a}}}{{{d}}}$, c\'est ${{a}}$ petits intervalles à partir de $0$ : '
     '${{eval:floor(a/d)}}$ unité{{if:a>=2*d|s|}} entière{{if:a>=2*d|s|}} '
     '(${{eval:d*floor(a/d)}}$ intervalles), et encore ${{eval:mod(a,d)}}$.'],
    'Compte les intervalles dans une unité : combien d\'unités entières y a-t-il dans '
    '$\\frac{{{a}}}{{{d}}}$ ?',
    ['mod(a,d)!=0'],
)

N2_C = variation(
    n2_enonce('1/{{eval:2*d}}', '{{eval:2*d}}'),
    [var('d', '2..5'), var('u', '3'), var('a', '1..{{eval:3*d-1}}')],
    None,
    [
        '**L\'unité.** De $0$ à $1$, l\'unité est partagée en ${{eval:2*d}}$ parts égales : '
        'chaque petit intervalle vaut $\\frac{1}{{{eval:2*d}}}$, pas $\\frac{1}{{{d}}}$.',
        '**Fraction égale.** $\\frac{{{a}}}{{{d}}} = \\frac{{{a}} \\times 2}{{{d}} \\times 2} = '
        '\\frac{{{eval:2*a}}}{{{eval:2*d}}}$ : c\'est ${{eval:2*a}}$ petits intervalles à partir '
        'de $0$.',
    ],
    'Compte les intervalles dans une unité : chacun ne vaut pas $\\frac{1}{{{d}}}$.',
    ['mod(a,d)!=0'],
)

SPECS_N2 = [
    spec('A : 3/4 placé', 0, {'d': '4', 'u': '3', 'a': '3'}, 'correct', ['0.75']),
    spec('A : 3 (unités comptées)', 0, {'d': '4', 'u': '3', 'a': '3'}, 'incorrect', ['3']),
    spec('A : 1/4 de trop (1)', 0, {'d': '4', 'u': '3', 'a': '3'}, 'incorrect', ['1']),
    spec('A : 7/10 placé', 0, {'d': '10', 'u': '3', 'a': '7'}, 'correct', ['0.7']),
    spec('B : 7/3 placé', 1, {'d': '3', 'u': '3', 'a': '7'}, 'correct', ['\\frac{7}{3}']),
    spec('B : 7 intervalles comptés depuis 1 (8/3)', 1, {'d': '3', 'u': '3', 'a': '7'},
         'incorrect', ['\\frac{8}{3}']),
    spec('C : 2/3 placé (4/6)', 2, {'d': '3', 'u': '3', 'a': '2'}, 'correct', ['\\frac{2}{3}']),
    spec('C : petits intervalles lus 1/3 (2/6)', 2, {'d': '3', 'u': '3', 'a': '2'}, 'incorrect',
         ['\\frac{1}{3}']),
    spec('C : 5/4 placé (10/8)', 2, {'d': '4', 'u': '3', 'a': '5'}, 'correct', ['1.25']),
]

N2 = modele(
    'Placer une fraction sur une demi-droite graduée en 1/d',
    'Placer a/d sur une demi-droite graduée de 0 à 3 dont l\'unité est partagée en d parts (d de '
    '2 à 10) : fraction plus petite que 1, entre 1 et 3, ou graduation en 1/2d (passer par une '
    'fraction égale)',
    14, 45, [N2_A, N2_B, N2_C], SPECS_N2, FRACTIONS_LIBRES,
    rangement={'noeud': FR + 'droite graduée', 'point': '6-128'})


# =============================================================================================
# N3 — 6-132 : mettre deux fractions au même dénominateur, imposé (deux cases, les numérateurs).
# A : a/b et c/D avec D = k·b. B : paires (2, 3) → 6, (3, 4) → 12, (4, 6) → 12, (2, 5) → 10,
# choisies par t1, t2 ∈ {0, 1}.
# =============================================================================================

def n3_erreurs(num, den, k):
    """Numérateur inchangé, et la même chose ajoutée en haut et en bas."""
    return [
        erreur(num, 'Le dénominateur a été multiplié par ${{' + k + '}}$ : multiplie aussi le '
               'numérateur.', 'Numérateur inchangé'),
        erreur('{{eval:' + num.strip('{}') + '+D-' + den + '}}',
               'On ne rajoute pas le même nombre en haut et en bas : on multiplie le numérateur et '
               'le dénominateur par le même nombre.', 'Addition au lieu de multiplication'),
    ]


N3_A = variation(
    'Écris ces deux fractions avec le même dénominateur, ${{D}}$.\n\n'
    '$$\\frac{{{a}}}{{{b}}} = \\frac{?}{{{D}}} \\qquad \\frac{{{c}}}{{{D}}} = \\frac{?}{{{D}}}$$',
    [var('b', '2..6'), var('k', '2..4'), var('D', 'eval:k*b'), var('a', '1..{{eval:2*b-1}}'),
     var('c', '1..{{eval:D-1}}')],
    [case('{{eval:a*k}}', [
        erreur('{{a}}', 'Le dénominateur a été multiplié par ${{k}}$ : multiplie aussi le '
               'numérateur.', 'Numérateur inchangé'),
        erreur('{{eval:a+D-b}}', 'On ne rajoute pas le même nombre en haut et en bas : on '
               'multiplie le numérateur et le dénominateur par le même nombre.',
               'Addition au lieu de multiplication'),
    ]), case('{{c}}')],
    [
        '**Fraction égale.** ${{b}} \\times ' + couleur('{{k}}', SECOND) + ' = {{D}}$ : on '
        'multiplie le numérateur et le dénominateur de $\\frac{{{a}}}{{{b}}}$ par ${{k}}$.',
        '$$\\frac{{{a}}}{{{b}}} = \\frac{{{a}} \\times ' + couleur('{{k}}', SECOND) + '}{{{b}} '
        '\\times ' + couleur('{{k}}', SECOND) + '} = \\frac{' + couleur('{{eval:a*k}}')
        + '}{{{D}}}$$',
        '$\\frac{{{c}}}{{{D}}}$ a déjà le dénominateur ${{D}}$ : elle ne change pas, $\\frac{'
        + couleur('{{c}}') + '}{{{D}}}$.',
    ],
    'Par quel nombre faut-il multiplier ${{b}}$ pour obtenir ${{D}}$ ? Fais de même au '
    'numérateur.',
    ['gcd(a,b)==1', 'gcd(c,D)==1'],
)

N3_B = variation(
    'Écris ces deux fractions avec le même dénominateur, ${{D}}$.\n\n'
    '$$\\frac{{{a}}}{{{b}}} = \\frac{?}{{{D}}} \\qquad \\frac{{{c}}}{{{m}}} = \\frac{?}{{{D}}}$$',
    [var('t1', '0..1'), var('t2', '0..1'), var('b', 'eval:2+t2+2*t1-3*t1*t2'),
     var('m', 'eval:3+t2+3*t1-2*t1*t2'), var('D', 'eval:b*m/gcd(b,m)'),
     var('a', '1..{{eval:2*b-1}}'), var('c', '1..{{eval:2*m-1}}')],
    [
        case('{{eval:a*D/b}}', [
            erreur('{{a}}', 'Le dénominateur a été multiplié par ${{eval:D/b}}$ : multiplie '
                   'aussi le numérateur.', 'Numérateur inchangé'),
            erreur('{{eval:a+D-b}}', 'On ne rajoute pas le même nombre en haut et en bas : on '
                   'multiplie le numérateur et le dénominateur par le même nombre.',
                   'Addition au lieu de multiplication'),
        ]),
        case('{{eval:c*D/m}}', [
            erreur('{{c}}', 'Le dénominateur a été multiplié par ${{eval:D/m}}$ : multiplie '
                   'aussi le numérateur.', 'Numérateur inchangé'),
            erreur('{{eval:c+D-m}}', 'On ne rajoute pas le même nombre en haut et en bas : on '
                   'multiplie le numérateur et le dénominateur par le même nombre.',
                   'Addition au lieu de multiplication'),
        ]),
    ],
    [
        '**Fractions égales.** ${{b}} \\times {{eval:D/b}} = {{D}}$ et ${{m}} \\times {{eval:D/m}} '
        '= {{D}}$ : on multiplie le numérateur et le dénominateur de chaque fraction par le même '
        'nombre.',
        '$$\\frac{{{a}}}{{{b}}} = \\frac{{{a}} \\times {{eval:D/b}}}{{{b}} \\times {{eval:D/b}}} '
        '= \\frac{' + couleur('{{eval:a*D/b}}') + '}{{{D}}} \\qquad \\frac{{{c}}}{{{m}}} = '
        '\\frac{{{c}} \\times {{eval:D/m}}}{{{m}} \\times {{eval:D/m}}} = \\frac{'
        + couleur('{{eval:c*D/m}}') + '}{{{D}}}$$',
    ],
    'Pour chaque fraction, cherche par quel nombre multiplier le dénominateur pour obtenir '
    '${{D}}$, et fais de même au numérateur.',
    ['gcd(a,b)==1', 'gcd(c,m)==1'],
)

V_N3 = {'b': '3', 'k': '4', 'D': '12', 'a': '2', 'c': '5'}
V_N3b = {'t1': '0', 't2': '1', 'b': '3', 'm': '4', 'D': '12', 'a': '2', 'c': '3'}
SPECS_N3 = [
    spec('A : 2/3 et 5/12 → 8/12 et 5/12', 0, V_N3, 'correct', ['8', '5']),
    spec('A : numérateur inchangé (2)', 0, V_N3, 'incorrect', ['2', '5'],
         'Le dénominateur a été multiplié par $4$ : multiplie aussi le numérateur.'),
    spec('A : addition (11)', 0, V_N3, 'incorrect', ['11', '5'],
         'On ne rajoute pas le même nombre en haut et en bas : on multiplie le numérateur et le '
         'dénominateur par le même nombre.'),
    spec('B : 2/3 et 3/4 → 8/12 et 9/12', 1, V_N3b, 'correct', ['8', '9']),
    spec('B : numérateurs inchangés', 1, V_N3b, 'incorrect', ['2', '9'],
         'Le dénominateur a été multiplié par $4$ : multiplie aussi le numérateur.'),
    spec('B : addition sur la seconde (11)', 1, V_N3b, 'incorrect', ['8', '11'],
         'On ne rajoute pas le même nombre en haut et en bas : on multiplie le numérateur et le '
         'dénominateur par le même nombre.'),
    spec('B : 1/2 et 4/5 → 5/10 et 8/10', 1,
         {'t1': '1', 't2': '1', 'b': '2', 'm': '5', 'D': '10', 'a': '1', 'c': '4'}, 'correct',
         ['5', '8']),
]

N3 = modele(
    'Mettre deux fractions au même dénominateur',
    'Écrire deux fractions avec un dénominateur commun donné : un dénominateur multiple de '
    'l\'autre (2/3 et 5/12 sur 12), ou des cas simples (2/3 et 3/4 sur 12, 1/2 et 4/5 sur 10) ; '
    'pièges : numérateur inchangé, même nombre ajouté en haut et en bas',
    10, 60, [N3_A, N3_B], SPECS_N3,
    rangement={'noeud': FR + 'égalité de fractions', 'point': '6-132'})


# =============================================================================================
# N4 — 6-133 : situer une fraction par rapport à 1/2 et à 1 (étiquettes à associer). Six
# fractions : n/2n (= 1/2), m/m (= 1), une < 1/2, deux entre 1/2 et 1, une > 1.
# =============================================================================================

ETIQ_MOINS = 'plus petite que $\\frac{1}{2}$'
ETIQ_DEMI = 'égale à $\\frac{1}{2}$'
ETIQ_ENTRE = 'entre $\\frac{1}{2}$ et $1$'
ETIQ_UN = 'égale à $1$'
ETIQ_PLUS = 'plus grande que $1$'
ETIQ_MOINS_UN = 'plus petite que $1$'

N4_VARS = [
    var('h', '2..6'),                                              # h/2h = 1/2
    var('m', '2..12'),                                             # m/m = 1
    var('b1', '3..12'), var('a1', '1..{{eval:floor((b1-1)/2)}}'),     # < 1/2
    var('b2', '3..12'), var('a2', '{{eval:floor(b2/2)+1}}..{{eval:b2-1}}'),   # entre
    var('b3', '3..12'), var('a3', '{{eval:floor(b3/2)+1}}..{{eval:b3-1}}'),   # entre
    var('b4', '2..12'), var('a4', '{{eval:b4+1}}..{{eval:2*b4-1}}'),          # > 1
]
N4_COND = ['gcd(a1,b1)==1', 'gcd(a2,b2)==1', 'gcd(a3,b3)==1', 'gcd(a4,b4)==1', 'b2!=b3']


def f(n, d):
    return '$\\frac{{{' + n + '}}}{{{' + d + '}}}$'


N4_CINQ = variation(
    'Associe chaque fraction à ce qu\'on peut dire d\'elle.\n\n'
    + bloc('associer', 'geste: étiquettes',
           '- ' + f('a1', 'b1') + ' -> ' + ETIQ_MOINS,
           '- $\\frac{{{h}}}{{{eval:2*h}}}$ -> ' + ETIQ_DEMI,
           '- ' + f('a2', 'b2') + ' -> ' + ETIQ_ENTRE,
           '- ' + f('a3', 'b3') + ' -> ' + ETIQ_ENTRE,
           '- ' + f('m', 'm') + ' -> ' + ETIQ_UN,
           '- ' + f('a4', 'b4') + ' -> ' + ETIQ_PLUS),
    N4_VARS, None,
    [
        '**Comparer à $\\frac{1}{2}$ et à $1$.** On compare le numérateur à la moitié du '
        'dénominateur, puis au dénominateur.',
        '$\\frac{{{a1}}}{{{b1}}}$ : ${{a1}}$ est plus petit que la moitié de ${{b1}}$, donc '
        '$\\frac{{{a1}}}{{{b1}}} < \\frac{1}{2}$. $\\frac{{{h}}}{{{eval:2*h}}}$ : ${{h}}$ est la '
        'moitié de ${{eval:2*h}}$, donc $\\frac{{{h}}}{{{eval:2*h}}} = \\frac{1}{2}$.',
        '$\\frac{{{a2}}}{{{b2}}}$ et $\\frac{{{a3}}}{{{b3}}}$ : le numérateur dépasse la moitié du '
        'dénominateur sans l\'atteindre, donc elles sont entre $\\frac{1}{2}$ et $1$.',
        '$\\frac{{{m}}}{{{m}}} = 1$ (numérateur égal au dénominateur) et $\\frac{{{a4}}}{{{b4}}} '
        '> 1$ car ${{a4}} > {{b4}}$.',
    ],
    'Pour chaque fraction, compare le numérateur à la moitié du dénominateur, puis au '
    'dénominateur.',
    N4_COND,
)

N4_TROIS = variation(
    'Associe chaque fraction à ce qu\'on peut dire d\'elle.\n\n'
    + bloc('associer', 'geste: étiquettes',
           '- ' + f('a1', 'b1') + ' -> ' + ETIQ_MOINS_UN,
           '- ' + f('a2', 'b2') + ' -> ' + ETIQ_MOINS_UN,
           '- ' + f('m', 'm') + ' -> ' + ETIQ_UN,
           '- $\\frac{{{eval:2*h}}}{{{eval:2*h}}}$ -> ' + ETIQ_UN,
           '- ' + f('a4', 'b4') + ' -> ' + ETIQ_PLUS,
           '- ' + f('a3', 'b3') + ' -> ' + ETIQ_PLUS),
    [var('h', '2..6'), var('m', '2..12'),
     var('b1', '2..12'), var('a1', '1..{{eval:b1-1}}'),
     var('b2', '2..12'), var('a2', '1..{{eval:b2-1}}'),
     var('b3', '2..12'), var('a3', '{{eval:b3+1}}..{{eval:2*b3+3}}'),
     var('b4', '2..12'), var('a4', '{{eval:b4+1}}..{{eval:2*b4-1}}')],
    None,
    [
        '**Comparer à $1$.** Une fraction est plus petite que $1$ quand son numérateur est plus '
        'petit que son dénominateur, égale à $1$ quand ils sont égaux, plus grande que $1$ '
        'quand il est plus grand.',
        '$\\frac{{{a1}}}{{{b1}}} < 1$ et $\\frac{{{a2}}}{{{b2}}} < 1$ ; $\\frac{{{m}}}{{{m}}} = '
        '\\frac{{{eval:2*h}}}{{{eval:2*h}}} = 1$ ; $\\frac{{{a4}}}{{{b4}}} > 1$ et '
        '$\\frac{{{a3}}}{{{b3}}} > 1$.',
    ],
    'Compare le numérateur de chaque fraction à son dénominateur.',
    ['gcd(a1,b1)==1', 'gcd(a2,b2)==1', 'gcd(a3,b3)==1', 'gcd(a4,b4)==1', 'm!=2*h', 'b1!=b2',
     'b3!=b4'],
)

V_N4 = {'h': '3', 'm': '5', 'b1': '7', 'a1': '2', 'b2': '8', 'a2': '5', 'b3': '9', 'a3': '7',
        'b4': '4', 'a4': '5'}
V_N4b = {'h': '2', 'm': '7', 'b1': '9', 'a1': '4', 'b2': '5', 'a2': '3', 'b3': '3', 'a3': '8',
         'b4': '6', 'a4': '7'}
# Réponses : positions affichées des étiquettes, une par élément (ranger-attendus.ts)
SPECS_N4 = [
    spec('Cinq étiquettes : le bon classement', 0, V_N4, 'correct',
         ['4', '0', '1', '1', '2', '3']),
    spec('Cinq étiquettes : 3/6 et 5/8 échangées', 0, V_N4, 'incorrect',
         ['4', '1', '0', '1', '2', '3']),
    spec('Trois étiquettes : le bon classement', 1, V_N4b, 'correct',
         ['2', '2', '0', '0', '1', '1']),
    spec('Trois étiquettes : 8/3 dite plus petite que 1', 1, V_N4b, 'incorrect',
         ['2', '2', '0', '0', '1', '2']),
]

N4 = modele(
    'Situer une fraction par rapport à 1/2 et à 1',
    'Associer six fractions à leur place : plus petite que 1/2, égale à 1/2, entre 1/2 et 1, '
    'égale à 1, plus grande que 1 (comparer le numérateur à la moitié du dénominateur) ; puis '
    'seulement par rapport à 1',
    18, 90, [N4_CINQ, N4_TROIS], SPECS_N4,
    rangement={'noeud': FR + 'ordre', 'point': '6-133'})


# =============================================================================================
# N5 — 6-141 : 60 % = 50 % + 10 %, 90 % = 100 % − 10 %, montant d'une réduction.
# =============================================================================================

N5_60 = variation(
    'Calcule.\n\n$$60\\,\\% \\text{ de } {{n}} = ?$$',
    [var('k', '7..40'), var('n', 'eval:10*k')],
    [case('{{eval:6*k}}', [
        erreur('{{k}}', 'Tu as calculé $10\\,\\%$ de ${{n}}$ : il en faut $60\\,\\%$, six fois '
               'plus.', '10 % seulement'),
        erreur('{{eval:n/2}}', 'Tu as calculé $50\\,\\%$ de ${{n}}$ : il faut encore ajouter '
               '$10\\,\\%$.', '50 % seulement'),
        erreur('{{eval:n-60}}', 'On n\'enlève pas $60$ : $60\\,\\%$ de ${{n}}$, c\'est $60$ sur '
               '$100$, soit $\\frac{60}{100} \\times {{n}}$.', 'Soustraction de 60'),
    ])],
    [
        '**Décomposer.** $60\\,\\% = 50\\,\\% + 10\\,\\%$. $50\\,\\%$ de ${{n}}$, c\'est la '
        'moitié : ${{eval:n/2}}$. $10\\,\\%$ de ${{n}}$, c\'est le dixième : ${{k}}$.',
        '$$60\\,\\% \\text{ de } {{n}} = {{eval:n/2}} + {{k}} = ' + couleur('{{solution}}') + '$$',
    ],
    '$60\\,\\% = 50\\,\\% + 10\\,\\%$ : calcule la moitié, puis le dixième.',
    ['n!=150', 'n!=120'],
)

N5_90 = variation(
    'Calcule.\n\n$$90\\,\\% \\text{ de } {{n}} = ?$$',
    [var('k', '11..50'), var('n', 'eval:10*k')],
    [case('{{eval:9*k}}', [
        erreur('{{k}}', 'Tu as calculé $10\\,\\%$ de ${{n}}$ : $90\\,\\%$, c\'est tout, moins ces '
               '$10\\,\\%$.', '10 % seulement'),
        erreur('{{eval:n-90}}', 'On n\'enlève pas $90$ : $90\\,\\%$ de ${{n}}$, c\'est ${{n}}$ '
               'moins $10\\,\\%$ de ${{n}}$.', 'Soustraction de 90'),
        erreur('{{eval:n-10}}', 'On n\'enlève pas $10$, mais $10\\,\\%$ de ${{n}}$, c\'est-à-dire '
               'son dixième.', 'Soustraction de 10'),
    ])],
    [
        '**Décomposer.** $90\\,\\% = 100\\,\\% - 10\\,\\%$. $100\\,\\%$ de ${{n}}$, c\'est '
        '${{n}}$ ; $10\\,\\%$ de ${{n}}$, c\'est le dixième : ${{k}}$.',
        '$$90\\,\\% \\text{ de } {{n}} = {{n}} - {{k}} = ' + couleur('{{solution}}') + '$$',
    ],
    '$90\\,\\% = 100\\,\\% - 10\\,\\%$ : enlève le dixième.',
)

N5_REDUC = variation(
    'Un article coûte ${{P}}~\\unit{€}$. Il est soldé avec une réduction de ${{p}}\\,\\%$.\n\n'
    'Quel est le montant de la réduction ?\n\n$$?~\\text{€}$$',
    [var('p', '10|20|25|50'), var('P', '15..60'), var('r', 'eval:p*P/100')],
    [case('{{r}}', [
        erreur('{{eval:P-r}}', 'C\'est le prix après la réduction : la question demande le '
               'montant de la réduction.', 'Prix final'),
        erreur('{{p}}', 'Une réduction de ${{p}}\\,\\%$ n\'est pas de ${{p}}~\\unit{€}$ : c\'est '
               '${{p}}~\\unit{€}$ pour $100~\\unit{€}$.', 'Pourcentage recopié'),
    ])],
    [
        '**Appliquer un pourcentage.** ${{p}}\\,\\%$ de ${{P}}$, c\'est $\\frac{{{p}}}{100} '
        '\\times {{P}}$. {{if:p==50|$50\\,\\%$, c\'est la moitié.|{{if:p==25|$25\\,\\%$, c\'est '
        'le quart.|{{if:p==10|$10\\,\\%$, c\'est le dixième.|$20\\,\\%$, c\'est deux fois '
        '$10\\,\\%$.}}}}}}',
        '$$\\frac{{{p}}}{100} \\times {{P}} = ' + couleur('{{r}}') + '$$',
        'La réduction est de ${{r}}~\\unit{€}$.',
    ],
    '${{p}}\\,\\%$ de ${{P}}~\\unit{€}$, c\'est $\\frac{{{p}}}{100} \\times {{P}}$.',
    ['mod(p*P,100)==0', 'P-r!=p'],
)

SPECS_N5 = [
    spec('60 % de 70 = 42', 0, {'k': '7', 'n': '70'}, 'correct', ['42']),
    spec('60 % de 140 = 84', 0, {'k': '14', 'n': '140'}, 'correct', ['84']),
    spec('60 % de 140 : 10 % seulement', 0, {'k': '14', 'n': '140'}, 'incorrect', ['14'],
         'Tu as calculé $10\\,\\%$ de $140$ : il en faut $60\\,\\%$, six fois plus.'),
    spec('60 % de 140 : 50 % seulement', 0, {'k': '14', 'n': '140'}, 'incorrect', ['70'],
         'Tu as calculé $50\\,\\%$ de $140$ : il faut encore ajouter $10\\,\\%$.'),
    spec('60 % de 140 : 140 − 60', 0, {'k': '14', 'n': '140'}, 'incorrect', ['80'],
         'On n\'enlève pas $60$ : $60\\,\\%$ de $140$, c\'est $60$ sur $100$, soit '
         '$\\frac{60}{100} \\times 140$.'),
    spec('90 % de 250 = 225', 1, {'k': '25', 'n': '250'}, 'correct', ['225']),
    spec('90 % de 250 : 10 % seulement', 1, {'k': '25', 'n': '250'}, 'incorrect', ['25'],
         'Tu as calculé $10\\,\\%$ de $250$ : $90\\,\\%$, c\'est tout, moins ces $10\\,\\%$.'),
    spec('90 % de 250 : 250 − 90', 1, {'k': '25', 'n': '250'}, 'incorrect', ['160'],
         'On n\'enlève pas $90$ : $90\\,\\%$ de $250$, c\'est $250$ moins $10\\,\\%$ de $250$.'),
    spec('90 % de 250 : 250 − 10', 1, {'k': '25', 'n': '250'}, 'incorrect', ['240'],
         'On n\'enlève pas $10$, mais $10\\,\\%$ de $250$, c\'est-à-dire son dixième.'),
    spec('Réduction de 25 % sur 48 € = 12 €', 2, {'p': '25', 'P': '48', 'r': '12'}, 'correct',
         ['12']),
    spec('Réduction : prix final (36)', 2, {'p': '25', 'P': '48', 'r': '12'}, 'incorrect',
         ['36'],
         'C\'est le prix après la réduction : la question demande le montant de la réduction.'),
    spec('Réduction : pourcentage recopié (25)', 2, {'p': '25', 'P': '48', 'r': '12'},
         'incorrect', ['25'],
         'Une réduction de $25\\,\\%$ n\'est pas de $25~\\unit{€}$ : c\'est $25~\\unit{€}$ pour '
         '$100~\\unit{€}$.'),
]

N5 = modele(
    'Appliquer un pourcentage en le décomposant',
    'Calculer 60 % d\'un nombre (50 % + 10 %), 90 % (100 % − 10 %), ou le montant d\'une '
    'réduction de 10, 20, 25 ou 50 % sur un prix de 15 à 60 € ; pièges : 10 % seulement, '
    'soustraire le pourcentage, donner le prix final',
    9, 60, [N5_60, N5_90, N5_REDUC], SPECS_N5,
    rangement={'noeud': 'Proportionnalité > Pourcentages > calculs de pourcentages',
               'point': '6-141'})


# =============================================================================================
# N6 — CM2-130 : labyrinthe des multiples (bloc ```labyrinthe, règle « multiple de n »).
# =============================================================================================

def n6(diviseurs, critere, hint):
    return variation(
        'Va de l\'entrée à une sortie en ne passant que par les multiples de ${{n}}$. Touche les '
        'cases une à une.\n\n'
        + bloc('labyrinthe', 'grille: 5 x 4', 'règle: multiple de {{n}}', 'parcourir: oui'),
        [var('n', diviseurs)], None,
        [
            '**Multiple de ${{n}}$.** Un multiple de ${{n}}$ est dans la table de ${{n}}$, ou '
            'au-delà : sa division par ${{n}}$ tombe juste, sans reste. ' + critere,
            '**Les pièges.** Les intrus sont juste à côté d\'un multiple de ${{n}}$ : $1$ ou $2$ '
            'de plus ou de moins.',
            '**Le chemin.** De l\'entrée, on avance de case en case (haut, bas, gauche, droite) : '
            'un seul chemin mène à une sortie, celui teinté sur la grille.',
        ],
        hint,
    )


N6_A = n6('2|5|10',
          '{{if:n==2|Un multiple de $2$ se termine par $0$, $2$, $4$, $6$ ou $8$.|{{if:n==5|Un '
          'multiple de $5$ se termine par $0$ ou $5$.|Un multiple de $10$ se termine par $0$.}}}}',
          '{{if:n==2|Regarde le dernier chiffre : un multiple de $2$ est un nombre pair.|'
          'Regarde le dernier chiffre de chaque nombre.}}')
N6_B = n6('3|4|6|7|8|9', '',
          'Pour chaque nombre, cherche s\'il est dans la table de ${{n}}$ : sa division par '
          '${{n}}$ doit tomber juste.')

SPECS_N6 = [
    spec('Multiples de 5 : le bon chemin', 0, {'n': '5'}, 'correct', ['A_CALCULER']),
    spec('Multiples de 5 : arrêté avant la sortie', 0, {'n': '5'}, 'incorrect',
         ['A_CALCULER:sans-fin']),
    spec('Multiples de 2 : le bon chemin', 0, {'n': '2'}, 'correct', ['A_CALCULER']),
    spec('Multiples de 7 : le bon chemin', 1, {'n': '7'}, 'correct', ['A_CALCULER']),
    spec('Multiples de 7 : ne part pas de l\'entrée', 1, {'n': '7'}, 'incorrect',
         ['A_CALCULER:sans-debut']),
    spec('Multiples de 9 : le bon chemin', 1, {'n': '9'}, 'correct', ['A_CALCULER']),
]

N6 = modele(
    'Le labyrinthe des multiples',
    'Tracer le chemin qui ne passe que par les multiples d\'un nombre : multiples de 2, 5 ou 10 '
    '(le dernier chiffre), puis de 3, 4, 6, 7, 8 ou 9 (les tables) ; les intrus sont à 1 ou 2 '
    'd\'un multiple',
    18, 120, [N6_A, N6_B], SPECS_N6, grades=['CM2'],
    rangement={'noeud': 'Arithmétique > Divisibilité > multiples et diviseurs',
               'point': 'CM2-130'})


ecrire('n1-lire-fraction-definition-quotient', N1)
ecrire('n2-placer-fraction-demi-droite', N2)
ecrire('n3-meme-denominateur', N3)
ecrire('n4-situer-fraction-demi-et-un', N4)
ecrire('n5-appliquer-pourcentage-decompose', N5)
ecrire('n6-labyrinthe-des-multiples', N6)
print('6 modèles écrits dans', DOSSIER)
