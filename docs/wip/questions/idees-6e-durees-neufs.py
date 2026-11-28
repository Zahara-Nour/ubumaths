"""Écrit les modèles neufs du chantier idees-6e-durees dans scripts/questions/idees-6e-durees-neufs/.

Phase 0 validée par David le 2026-11-27 (« je valide les modèles », puis « je suis tes recos »,
journal docs/archive/wip/idees-6e-durees/idees-6e-durees-progress.md) : N1 à N6. On reprend l'idée de l'autre
plateforme, pas sa forme ni son texte : additions de durées avec les secondes, horaires de début
et de fin (minuit compris), conversions en jours, semaines, mois et ans, conversions avec les
secondes, heures décimales, unités de durée et fractions d'heure.

Ni theme, ni domain, ni subdomain, ni id : le rangement (nœud + tag) se fera par migration, après
la création en brouillon (champ `rangement`). Points : N1 → 6-206 (ajouter des durées) ; N2 →
6-157 (calculer une durée, un horaire) ; N3 à N6 → 6-159 (convertir des durées ; Q1 pour N6).
Niveaux relevés en prod le 2026-11-27 : « calcul de durées » va jusqu'à 8, « conversions »
jusqu'à 13 ; à relever de nouveau avant la migration de rangement.

Choix d'écriture :
- une case par unité, chaque case un entier (Q2 : notre case « durée composée » ne lit que h, min
  et s ; les jours, semaines, mois et ans ont leurs propres cases) ; les unités sont écrites dans
  l'énoncé, autour des cases ;
- h, min, s en `\\unit{…}` ; j, semaines, mois, ans en `\\text{…}` ;
- N2 : après minuit, l'attendu est « 0 h 35 » ; « 24 h 35 » est une erreur prévue (Q3, message
  « après minuit, on repart de 0 h ») ;
- N5 : une case nombre (heures décimales), l'unité donnée après la case ; « 2,45 h » pour
  2 h 45 min est l'erreur du chapitre ;
- N6 (b) : leur liste déroulante gardée (case choix), l'unité ne se tape pas ; les autres
  variations demandent le nombre ;
- N6 (d) : l'attendu est la fraction, et 0,75 est accepté : `form: off` sur le modèle (sinon le
  juge exige la forme de l'attendu). Ses autres cases sont des entiers.
- N2 (c, d) : minutes tirées en multiples de 5 (km, kM, kd), comme les horaires d'un programme.

Règles suivies (couvrir-un-niveau.md § 5) : erreurs prévues par case d'écriture ordinaire (de
vraies erreurs d'élèves, sans en inventer pour atteindre trois), chacune avec sa spec `incorrect`
qui nomme son message ; un coup de pouce par variation, qui ne donne jamais la réponse. Les choix
n'ont pas d'erreurs prévues.

Usage : python3 docs/wip/questions/idees-6e-durees-neufs.py scripts/questions/idees-6e-durees-neufs
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
CALCUL = {'noeud': 'Grandeurs et mesures > Durées > calcul de durées', 'point': None}
CONVERSIONS = {'noeud': 'Grandeurs et mesures > Durées > conversions', 'point': '6-159'}

H = '~\\unit{h}'
MIN = '~\\unit{min}'
S = '~\\unit{s}'
J = '~\\text{j}'


def spec(desc, vi, variables_, status, answers, message=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = message
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': expected, 'answers': answers}


def modele(title, description, level, delay, variations, specs, rangement, options=None):
    m = {'rangement': rangement, 'title': title, 'description': description,
         'grades': ['6'], 'level': level, 'delay': delay, 'status': 'draft'}
    if options:
        m['options'] = options
    m['variations'] = variations
    m['testSpecs'] = specs
    return m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def case(attendue, erreurs=None):
    c = {'expectedAnswer': attendue}
    if erreurs:
        c['expectedErrors'] = erreurs
    return c


def variation(statement, variables, blanks, steps, hint, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': blanks, 'correction': {'steps': steps}, 'hint': hint}


def couleur(contenu):
    return PRIMAIRE + '{' + contenu + '}'


def selon(v, textes, k=0):
    """`{{if:v==0|…|{{if:v==1|…|…}}}}` : le texte numéro v."""
    if k == len(textes) - 1:
        return textes[k]
    return '{{if:' + v + '==' + str(k) + '|' + textes[k] + '|' + selon(v, textes, k + 1) + '}}'


def sel(v, valeurs):
    """Expression qui vaut valeurs[k] quand v == k (indicatrices, pour une variable `eval:`)."""
    return '+'.join(f'({x})*(1-min(abs({v}-{k}),1))' for k, x in enumerate(valeurs))


def deux(x):
    """Minutes ou secondes d'un horaire sur deux chiffres : 05, 40."""
    return '{{if:' + x + '<10|0{{' + x + '}}|{{' + x + '}}}}'


def bloc(nom, *lignes):
    return '```' + nom + '\n' + '\n'.join(lignes) + '\n```'


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
# N1 — 6-206 : ajouter des durées avec les secondes.
# =============================================================================================

MSG_S_OUBLI = 'Plus de $60$ s : $60$ s font $1$ min, garde le reste en secondes.'
MSG_MIN_RETENUE = 'N\'oublie pas la minute de retenue des secondes.'
MSG_MIN_NON_CONV = 'Plus de $60$ min : $60$ min font $1$ h, garde le reste en minutes.'

# (a) min s + min s, une retenue (les secondes), résultat en min s.
N1_A = variation(
    'Calcule.\n\n${{m1}}' + MIN + '~{{s1}}' + S + ' + {{m2}}' + MIN + '~{{s2}}' + S + ' = ?' + MIN
    + '~?' + S + '$',
    [var('m1', '10..40'), var('s1', '15..59'), var('m2', '10..40'), var('s2', '15..59'),
     var('ss', 'eval:s1+s2'), var('mm', 'eval:m1+m2+1')],
    [
        case('{{mm}}', [
            erreur('{{eval:m1+m2}}', MSG_MIN_RETENUE, 'Retenue des secondes oubliée'),
        ]),
        case('{{eval:ss-60}}', [
            erreur('{{ss}}', MSG_S_OUBLI, 'Secondes non converties'),
        ]),
    ],
    [
        '**Les secondes.** ${{s1}} + {{s2}} = {{ss}}$ s, soit $1' + MIN + '~{{eval:ss-60}}' + S
        + '$ : on garde ${{eval:ss-60}}' + S + '$ et on retient $1' + MIN + '$.',
        '**Les minutes.** ${{m1}} + {{m2}} + 1 = {{mm}}$ min.',
        'Total : $' + couleur('{{mm}}' + MIN + '~{{eval:ss-60}}' + S) + '$.',
    ],
    'Ajoute les secondes entre elles, puis les minutes. $60$ s font $1$ min.',
    ['s1+s2>60', 'm1+m2+1<60'],
)

# (b) min s + min s, deux retenues, résultat en h min s.
N1_B = variation(
    'Calcule.\n\n${{m1}}' + MIN + '~{{s1}}' + S + ' + {{m2}}' + MIN + '~{{s2}}' + S + ' = ?' + H
    + '~?' + MIN + '~?' + S + '$',
    [var('m1', '20..59'), var('s1', '10..59'), var('m2', '20..59'), var('s2', '10..59'),
     var('ss', 'eval:s1+s2'), var('mm', 'eval:m1+m2+1')],
    [
        case('1', [
            erreur('0', MSG_MIN_NON_CONV, 'Minutes non converties'),
        ]),
        case('{{eval:mm-60}}', [
            erreur('{{mm}}', MSG_MIN_NON_CONV, 'Minutes non converties'),
            erreur('{{eval:mm-61}}', MSG_MIN_RETENUE, 'Retenue des secondes oubliée'),
        ]),
        case('{{eval:ss-60}}', [
            erreur('{{ss}}', MSG_S_OUBLI, 'Secondes non converties'),
        ]),
    ],
    [
        '**Les secondes.** ${{s1}} + {{s2}} = {{ss}}$ s, soit $1' + MIN + '~{{eval:ss-60}}' + S
        + '$ : on garde ${{eval:ss-60}}' + S + '$ et on retient $1' + MIN + '$.',
        '**Les minutes.** ${{m1}} + {{m2}} + 1 = {{mm}}$ min, soit $1' + H + '~{{eval:mm-60}}'
        + MIN + '$.',
        'Total : $' + couleur('1' + H + '~{{eval:mm-60}}' + MIN + '~{{eval:ss-60}}' + S) + '$.',
    ],
    'Commence par les secondes, puis les minutes. $60$ s font $1$ min, et $60$ min font $1$ h.',
    ['s1+s2>60', 'm1+m2+1>60'],
)

# (c) h min s + h min s, deux retenues.
N1_C = variation(
    'Calcule.\n\n${{h1}}' + H + '~{{m1}}' + MIN + '~{{s1}}' + S + ' + {{h2}}' + H + '~{{m2}}' + MIN
    + '~{{s2}}' + S + ' = ?' + H + '~?' + MIN + '~?' + S + '$',
    [var('h1', '1..5'), var('m1', '15..59'), var('s1', '10..59'), var('h2', '1..5'),
     var('m2', '15..59'), var('s2', '10..59'), var('ss', 'eval:s1+s2'),
     var('mm', 'eval:m1+m2+1'), var('hh', 'eval:h1+h2+1')],
    [
        case('{{hh}}', [
            erreur('{{eval:h1+h2}}', 'N\'oublie pas l\'heure de retenue des minutes.',
                   'Retenue des minutes oubliée'),
        ]),
        case('{{eval:mm-60}}', [
            erreur('{{mm}}', MSG_MIN_NON_CONV, 'Minutes non converties'),
            erreur('{{eval:mm-61}}', MSG_MIN_RETENUE, 'Retenue des secondes oubliée'),
        ]),
        case('{{eval:ss-60}}', [
            erreur('{{ss}}', MSG_S_OUBLI, 'Secondes non converties'),
        ]),
    ],
    [
        '**Les secondes.** ${{s1}} + {{s2}} = {{ss}}$ s, soit $1' + MIN + '~{{eval:ss-60}}' + S
        + '$.',
        '**Les minutes.** ${{m1}} + {{m2}} + 1 = {{mm}}$ min, soit $1' + H + '~{{eval:mm-60}}'
        + MIN + '$.',
        '**Les heures.** ${{h1}} + {{h2}} + 1 = {{hh}}$ h.',
        'Total : $' + couleur('{{hh}}' + H + '~{{eval:mm-60}}' + MIN + '~{{eval:ss-60}}' + S)
        + '$.',
    ],
    'Ajoute unité par unité, en commençant par les secondes ; $60$ d\'une unité en font $1$ de '
    'l\'unité suivante.',
    ['s1+s2>60', 'm1+m2+1>60'],
)

V_N1A = {'m1': '23', 's1': '45', 'm2': '14', 's2': '57', 'ss': '102', 'mm': '38'}
V_N1B = {'m1': '35', 's1': '40', 'm2': '36', 's2': '50', 'ss': '90', 'mm': '72'}
V_N1C = {'h1': '2', 'm1': '45', 's1': '30', 'h2': '1', 'm2': '38', 's2': '50', 'ss': '80',
         'mm': '84', 'hh': '4'}
SPECS_N1 = [
    spec('23 min 45 s + 14 min 57 s = 38 min 42 s', 0, V_N1A, 'correct', ['38', '42']),
    spec('Retenue des secondes oubliée (37 min)', 0, V_N1A, 'incorrect', ['37', '42'],
         MSG_MIN_RETENUE),
    spec('Secondes non converties (102 s)', 0, V_N1A, 'incorrect', ['38', '102'], MSG_S_OUBLI),
    spec('35 min 40 s + 36 min 50 s = 1 h 12 min 30 s', 1, V_N1B, 'correct', ['1', '12', '30']),
    spec('0 h 72 min 30 s', 1, V_N1B, 'incorrect', ['0', '72', '30'], MSG_MIN_NON_CONV),
    spec('Retenue des secondes oubliée (11 min)', 1, V_N1B, 'incorrect', ['1', '11', '30'],
         MSG_MIN_RETENUE),
    spec('Secondes non converties (90 s)', 1, V_N1B, 'incorrect', ['1', '12', '90'], MSG_S_OUBLI),
    spec('2 h 45 min 30 s + 1 h 38 min 50 s = 4 h 24 min 20 s', 2, V_N1C, 'correct',
         ['4', '24', '20']),
    spec('Retenue des minutes oubliée (3 h)', 2, V_N1C, 'incorrect', ['3', '24', '20'],
         'N\'oublie pas l\'heure de retenue des minutes.'),
    spec('Minutes non converties (84 min)', 2, V_N1C, 'incorrect', ['4', '84', '20'],
         MSG_MIN_NON_CONV),
    spec('Retenue des secondes oubliée (23 min)', 2, V_N1C, 'incorrect', ['4', '23', '20'],
         MSG_MIN_RETENUE),
    spec('Secondes non converties (80 s)', 2, V_N1C, 'incorrect', ['4', '24', '80'], MSG_S_OUBLI),
]

N1 = modele(
    'Ajouter des durées avec les secondes',
    'Additionner des durées en minutes et secondes, ou en heures, minutes et secondes, avec une '
    'ou deux retenues ; pièges : retenue oubliée, secondes ou minutes non converties',
    9, 60, [N1_A, N1_B, N1_C], SPECS_N1, {**CALCUL, 'point': '6-206'})


# =============================================================================================
# N2 — 6-157 : horaire de début ou de fin, minuit compris. Contextes selon c.
# =============================================================================================

N2_DEBUT = ['Un film commence', 'Un train part', 'Un match de rugby commence',
            'Une émission commence']
N2_FIN = ['Il se termine', 'Il arrive', 'Il se termine', 'Elle se termine']
N2_DUREE = ['Le film dure', 'Le trajet dure', 'Le match, mi-temps comprise, dure',
            'L\'émission dure']
N2_QFIN = ['À quelle heure se termine-t-il ?', 'À quelle heure arrive-t-il ?',
           'À quelle heure se termine-t-il ?', 'À quelle heure se termine-t-elle ?']
N2_QDEBUT = ['À quelle heure a-t-il commencé ?', 'À quelle heure est-il parti ?',
             'À quelle heure a-t-il commencé ?', 'À quelle heure a-t-elle commencé ?']
N2_QDUREE = ['Combien de temps dure le film ?', 'Combien de temps dure le trajet ?',
             'Combien de temps dure le match ?', 'Combien de temps dure l\'émission ?']
N2_REPONSE_HORAIRE = '\n\nRéponse : à $?' + H + '~?' + MIN + '$.'
N2_REPONSE_DUREE = '\n\nRéponse : $?' + H + '~?' + MIN + '$.'


def horaire(h, m):
    return '${{' + h + '}}' + H + '~' + deux(m) + MIN + '$'


def duree(h, m):
    return '{{if:' + h + '==0|${{' + m + '}}' + MIN + '$|${{' + h + '}}' + H + '~{{' + m + '}}' \
        + MIN + '$}}'


MSG_EMPRUNT_100 = 'Une heure fait $60$ min, pas $100$ : en empruntant $1$ h, ajoute $60$ min.'
MSG_MINUIT = 'Après minuit, on repart de $0$ h.'

# (a) horaire de fin = début + durée, retenue des minutes.
N2_A = variation(
    selon('c', N2_DEBUT) + ' à ' + horaire('h', 'm') + '. ' + selon('c', N2_DUREE) + ' '
    + duree('dh', 'dm') + '.\n\n' + selon('c', N2_QFIN) + N2_REPONSE_HORAIRE,
    [var('c', '0..3'), var('h', '9..19'), var('m', '20..55'), var('dh', '0..3'),
     var('dm', '25..55'), var('mm', 'eval:m+dm'), var('mf', 'eval:m+dm-60'),
     var('hf', 'eval:h+dh+1')],
    [
        case('{{hf}}', [
            erreur('{{eval:h+dh}}', 'Plus de $60$ min : n\'oublie pas l\'heure de retenue.',
                   'Retenue de l\'heure oubliée'),
        ]),
        case('{{mf}}', [
            erreur('{{mm}}', 'Plus de $60$ min : $60$ min font $1$ h, garde le reste en minutes.',
                   'Minutes non converties'),
        ]),
    ],
    [
        '**Les minutes.** ${{m}} + {{dm}} = {{mm}}$ min, soit $1' + H + '~{{eval:mm-60}}' + MIN
        + '$.',
        '**Les heures.** ${{h}} + {{dh}} + 1 = {{hf}}$ h.',
        'Fin : à $' + couleur('{{hf}}' + H + '~' + deux('mf') + MIN) + '$.',
    ],
    'Ajoute la durée à l\'horaire de début : les minutes d\'abord, puis les heures.',
    ['m+dm>60', 'dh*60+dm<=235', 'h+dh+1<=23'],
)

# (b) horaire de début = fin − durée, emprunt d'une heure.
N2_B = variation(
    selon('c', N2_DUREE) + ' ' + duree('dh', 'dm') + '. ' + selon('c', N2_FIN) + ' à '
    + horaire('H', 'M') + '.\n\n' + selon('c', N2_QDEBUT) + N2_REPONSE_HORAIRE,
    [var('c', '0..3'), var('H', '12..22'), var('M', '0..30'), var('dh', '0..3'),
     var('dm', '25..55'), var('hd', 'eval:H-dh-1'), var('md', 'eval:M+60-dm')],
    [
        case('{{hd}}', [
            erreur('{{eval:H-dh}}', 'Tu as emprunté $1$ h pour les minutes : retire-la aussi '
                   'des heures.', 'Emprunt non retiré des heures'),
        ]),
        case('{{md}}', [
            erreur('{{eval:M+100-dm}}', MSG_EMPRUNT_100, 'Emprunt de 100 au lieu de 60'),
            erreur('{{eval:dm-M}}', 'Tu as soustrait les minutes à l\'envers : on part de '
                   '${{M}}$ min, et on en retire ${{dm}}$.', 'Minutes soustraites à l\'envers'),
        ]),
    ],
    [
        '**Les minutes.** On ne peut pas retirer ${{dm}}$ min de ${{M}}$ min : on emprunte $1$ h. '
        '${{H}}' + H + '~' + deux('M') + MIN + ' = {{eval:H-1}}' + H + '~{{eval:M+60}}' + MIN
        + '$.',
        '**Soustraire.** ${{eval:M+60}} - {{dm}} = {{md}}$ min et ${{eval:H-1}} - {{dh}} = {{hd}}$'
        ' h.',
        'Début : à $' + couleur('{{hd}}' + H + '~' + deux('md') + MIN) + '$.',
    ],
    'Retire la durée à l\'horaire de fin. S\'il n\'y a pas assez de minutes, échange $1$ h '
    'contre $60$ min.',
    ['dm>M', 'H-dh-1>=8', 'dh*60+dm<=235', 'dm-M!=M+60-dm'],
)

# (c) durée entre un horaire du soir et un horaire après minuit.
N2_C = variation(
    selon('c', N2_DEBUT) + ' à ' + horaire('h', 'm') + '. ' + selon('c', N2_FIN) + ' à '
    + horaire('H', 'M') + ', après minuit.\n\n' + selon('c', N2_QDUREE) + N2_REPONSE_DUREE,
    [var('c', '0..3'), var('h', '21..23'), var('km', '1..11'), var('m', 'eval:5*km'),
     var('H', '0..1'), var('kM', '0..11'), var('M', 'eval:5*kM'),
     var('t', 'eval:(24*60+60*H+M)-(60*h+m)')],
    [
        case('{{eval:floor(t/60)}}', [
            erreur('{{eval:floor((60*h+m-60*H-M)/60)}}', 'Tu as soustrait l\'horaire de fin à '
                   'celui de début : compte d\'abord jusqu\'à minuit, puis après minuit.',
                   'Horaires soustraits à l\'envers'),
        ]),
        case('{{eval:mod(t,60)}}', [
            erreur('{{eval:mod(60*h+m-60*H-M,60)}}', 'Tu as soustrait l\'horaire de fin à celui '
                   'de début : compte d\'abord jusqu\'à minuit, puis après minuit.',
                   'Horaires soustraits à l\'envers'),
        ]),
    ],
    [
        '**Jusqu\'à minuit.** De ' + horaire('h', 'm') + ' à $24' + H + '$ : '
        '${{eval:floor((24*60-60*h-m)/60)}}' + H + '~{{eval:mod(24*60-60*h-m,60)}}' + MIN + '$.',
        '**Après minuit.** De $0' + H + '$ à ' + horaire('H', 'M') + ' : ${{H}}' + H + '~{{M}}'
        + MIN + '$.',
        '**Ajouter.** Durée : $' + couleur('{{eval:floor(t/60)}}' + H + '~{{eval:mod(t,60)}}' + MIN)
        + '$.',
    ],
    'Coupe la durée en deux : jusqu\'à minuit, puis après minuit.',
    ['t>=25', 't<=235', 'mod(t,60)!=0',
     'floor((60*h+m-60*H-M)/60)!=floor(t/60)'],
)

# (d) horaire de fin après minuit.
N2_D = variation(
    selon('c', N2_DEBUT) + ' à ' + horaire('h', 'm') + '. ' + selon('c', N2_DUREE) + ' '
    + duree('dh', 'dm') + '.\n\n' + selon('c', N2_QFIN) + N2_REPONSE_HORAIRE,
    [var('c', '0..3'), var('h', '21..23'), var('km', '1..11'), var('m', 'eval:5*km'),
     var('dh', '1..3'), var('kd', '1..11'), var('dm', 'eval:5*kd'),
     var('t', 'eval:60*h+m+60*dh+dm-24*60'),
     var('mf', 'eval:mod(t,60)')],
    [
        case('{{eval:floor(t/60)}}', [
            erreur('{{eval:floor(t/60)+24}}', MSG_MINUIT, 'Heure au-delà de 24 h'),
        ]),
        case('{{eval:mod(t,60)}}', [
            erreur('{{eval:m+dm}}', 'Plus de $60$ min : $60$ min font $1$ h, garde le reste en '
                   'minutes.', 'Minutes non converties'),
        ]),
    ],
    [
        '**Ajouter.** ${{h}}' + H + '~' + deux('m') + MIN + ' + {{dh}}' + H + '~{{dm}}' + MIN
        + ' = {{eval:floor(t/60)+24}}' + H + '~{{eval:mod(t,60)}}' + MIN + '$.',
        '**Après minuit, on repart de $0$ h.** $24' + H + '$, c\'est minuit : on retire $24' + H
        + '$.',
        'Fin : à $' + couleur('{{eval:floor(t/60)}}' + H + '~' + deux('mf') + MIN) + '$.',
    ],
    'Ajoute la durée comme d\'habitude, puis souviens-toi qu\'à minuit, l\'horloge repart de '
    '$0$ h.',
    ['t>=0', 't<120', 'm+dm>60'],
)

V_N2A = {'c': '0', 'h': '14', 'm': '40', 'dh': '1', 'dm': '35', 'mm': '75', 'mf': '15', 'hf': '16'}
V_N2B = {'c': '1', 'H': '11', 'M': '15', 'dh': '1', 'dm': '35', 'hd': '9', 'md': '40'}
V_N2C = {'c': '3', 'h': '21', 'km': '10', 'm': '50', 'H': '0', 'kM': '7', 'M': '35', 't': '165'}
V_N2D = {'c': '2', 'h': '22', 'km': '8', 'm': '40', 'dh': '1', 'kd': '11', 'dm': '55', 't': '35',
         'mf': '35'}
SPECS_N2 = [
    spec('14 h 40 + 1 h 35 = 16 h 15', 0, V_N2A, 'correct', ['16', '15']),
    spec('Retenue de l\'heure oubliée (15 h 15)', 0, V_N2A, 'incorrect', ['15', '15'],
         'Plus de $60$ min : n\'oublie pas l\'heure de retenue.'),
    spec('Minutes non converties (75)', 0, V_N2A, 'incorrect', ['16', '75'],
         'Plus de $60$ min : $60$ min font $1$ h, garde le reste en minutes.'),
    spec('11 h 15 − 1 h 35 = 9 h 40', 1, V_N2B, 'correct', ['9', '40']),
    spec('Emprunt de 100 (9 h 80)', 1, V_N2B, 'incorrect', ['9', '80'], MSG_EMPRUNT_100),
    spec('Emprunt non retiré (10 h 40)', 1, V_N2B, 'incorrect', ['10', '40'],
         'Tu as emprunté $1$ h pour les minutes : retire-la aussi des heures.'),
    spec('Minutes à l\'envers (20)', 1, V_N2B, 'incorrect', ['9', '20'],
         'Tu as soustrait les minutes à l\'envers : on part de $15$ min, et on en retire $35$.'),
    spec('21 h 50 → 0 h 35 : 2 h 45 min', 2, V_N2C, 'correct', ['2', '45']),
    spec('Soustraction à l\'envers (21 h 15)', 2, V_N2C, 'incorrect', ['21', '15'],
         'Tu as soustrait l\'horaire de fin à celui de début : compte d\'abord jusqu\'à minuit, '
         'puis après minuit.'),
    spec('22 h 40 + 1 h 55 = 0 h 35', 3, V_N2D, 'correct', ['0', '35']),
    spec('24 h 35 refusé (Q3)', 3, V_N2D, 'incorrect', ['24', '35'], MSG_MINUIT),
    spec('Minutes non converties (95)', 3, V_N2D, 'incorrect', ['0', '95'],
         'Plus de $60$ min : $60$ min font $1$ h, garde le reste en minutes.'),
]

N2 = modele(
    'Calculer un horaire de début ou de fin',
    'Horaire de fin (début + durée), horaire de début (fin − durée, emprunt d\'une heure), durée '
    'qui passe minuit, horaire de fin après minuit ; film, train, match, émission ; pièges : '
    'retenue ou emprunt de 100, heure au-delà de 24 h',
    10, 60, [N2_A, N2_B, N2_C, N2_D], SPECS_N2, {**CALCUL, 'point': '6-157'})


# =============================================================================================
# N3 — 6-159 : jours, semaines, mois, ans (une case par unité).
# =============================================================================================


def n3_vers_composee(grande, petite, k, q_plage, r_plage, nom_g, nom_p, unite_g, unite_p):
    """n petites = ? grandes ? petites (k petites dans une grande)."""
    return variation(
        'Convertis.\n\n${{n}}~\\text{' + nom_p + '} = ?~\\text{' + unite_g + '}~?~\\text{'
        + unite_p + '}$',
        [var('q', q_plage), var('r', r_plage), var('n', f'eval:{k}*q+r')],
        [
            case('{{q}}', [
                erreur('{{eval:floor(n/10)}}', f'Un{grande} n\'a pas $10$ {nom_p} : il en a '
                       f'${k}$.', 'Division par 10'),
                erreur('{{r}}', 'Tu as inversé : le quotient donne les ' + nom_g + ', le reste '
                       'les ' + nom_p + '.', 'Quotient et reste inversés'),
            ]),
            case('{{r}}', [
                erreur('{{eval:mod(n,10)}}', f'Un{grande} n\'a pas $10$ {nom_p} : il en a '
                       f'${k}$.', 'Division par 10'),
                erreur('{{q}}', 'Tu as inversé : le quotient donne les ' + nom_g + ', le reste '
                       'les ' + nom_p + '.', 'Quotient et reste inversés'),
            ]),
        ],
        [
            f'Un{grande} = ${k}$ {nom_p}. Dans ${{{{n}}}}$, combien de fois ${k}$ ?',
            f'${{{{q}}}} \\times {k} = {{{{eval:{k}*q}}}}$ et ${{{{n}}}} - {{{{eval:{k}*q}}}} = '
            '{{r}}$.',
            '${{n}}~\\text{' + nom_p + '} = ' + couleur('{{q}}~\\text{' + unite_g + '}~{{r}}~'
                                                        '\\text{' + unite_p + '}') + '$.',
        ],
        f'Combien de fois ${k}$ {nom_p} dans ${{{{n}}}}$ {nom_p} ? Ce qui reste, ce sont des '
        + nom_p + '.',
        ['floor(n/10)!=q', 'r!=q'],
    )


def n3_depuis_composee(grande, k, q_plage, r_plage, nom_g, nom_p, unite_g, unite_p):
    """q grandes r petites = ? petites."""
    return variation(
        'Convertis.\n\n${{q}}~\\text{' + unite_g + '}~{{r}}~\\text{' + unite_p + '} = ?~\\text{'
        + nom_p + '}$',
        [var('q', q_plage), var('r', r_plage)],
        [case(f'{{{{eval:{k}*q+r}}}}', [
            erreur('{{eval:10*q+r}}', f'Un{grande} n\'a pas $10$ {nom_p} : il en a ${k}$.',
                   'Un pour 10'),
            erreur(f'{{{{eval:{k}*q}}}}', 'N\'oublie pas d\'ajouter les ${{r}}$ ' + nom_p
                   + ' du départ.', 'Reste oublié'),
            erreur('{{eval:q+r}}', 'Tu as ajouté les nombres tels quels : convertis d\'abord les '
                   + nom_g + f' en {nom_p} ($\\times {k}$).', 'Nombres ajoutés sans conversion'),
        ])],
        [
            f'Un{grande} = ${k}$ {nom_p}, donc ${{{{q}}}}~\\text{{' + unite_g + '} = {{q}} \\times '
            f'{k} = {{{{eval:{k}*q}}}}~\\text{{' + nom_p + '}$.',
            f'${{{{eval:{k}*q}}}} + {{{{r}}}} = ' + couleur(f'{{{{eval:{k}*q+r}}}}~\\text{{' + nom_p
                                                             + '}') + '$.',
        ],
        f'Combien de {nom_p} dans un{grande} ? Convertis les {nom_g}, puis ajoute le reste.',
        ['10*q+r!=' + f'{k}*q+r'],
    )


N3_A = n3_vers_composee(' jour', 'heures', 24, '1..6', '1..23', 'jours', 'heures', 'j', 'h')
N3_B = n3_depuis_composee(' jour', 24, '1..6', '1..23', 'jours', 'heures', 'j', 'h')
N3_C = n3_vers_composee('e semaine', 'jours', 7, '2..9', '1..6', 'semaines', 'jours',
                        'semaines', 'j')
N3_D = n3_depuis_composee('e semaine', 7, '2..9', '1..6', 'semaines', 'jours', 'semaines', 'j')
N3_E = n3_vers_composee(' an', 'mois', 12, '2..9', '1..11', 'ans', 'mois', 'ans', 'mois')
N3_F = n3_depuis_composee(' an', 12, '2..9', '1..11', 'ans', 'mois', 'ans', 'mois')

# Messages résolus (spec) : « Un jour n'a pas $10$ heures : il en a $24$. »
SPECS_N3 = [
    spec('53 h = 2 j 5 h', 0, {'q': '2', 'r': '5', 'n': '53'}, 'correct', ['2', '5']),
    spec('53 h : division par 10 (5 j 3 h)', 0, {'q': '2', 'r': '5', 'n': '53'}, 'incorrect',
         ['5', '3'], 'Un jour n\'a pas $10$ heures : il en a $24$.'),
    spec('53 h : inversé (5 j 2 h)', 0, {'q': '2', 'r': '5', 'n': '53'}, 'incorrect', ['5', '2'],
         'Tu as inversé : le quotient donne les jours, le reste les heures.'),
    spec('2 j 5 h = 53 h', 1, {'q': '2', 'r': '5'}, 'correct', ['53']),
    spec('2 j 5 h : 25 h', 1, {'q': '2', 'r': '5'}, 'incorrect', ['25'],
         'Un jour n\'a pas $10$ heures : il en a $24$.'),
    spec('2 j 5 h : 48 h', 1, {'q': '2', 'r': '5'}, 'incorrect', ['48'],
         'N\'oublie pas d\'ajouter les $5$ heures du départ.'),
    spec('2 j 5 h : 7 h', 1, {'q': '2', 'r': '5'}, 'incorrect', ['7'],
         'Tu as ajouté les nombres tels quels : convertis d\'abord les jours en heures '
         '($\\times 24$).'),
    spec('45 j = 6 semaines 3 j', 2, {'q': '6', 'r': '3', 'n': '45'}, 'correct', ['6', '3']),
    spec('45 j : division par 10 (4 semaines 5 j)', 2, {'q': '6', 'r': '3', 'n': '45'},
         'incorrect', ['4', '5'], 'Une semaine n\'a pas $10$ jours : il en a $7$.'),
    spec('45 j : inversé (3 semaines 6 j)', 2, {'q': '6', 'r': '3', 'n': '45'}, 'incorrect',
         ['3', '6'], 'Tu as inversé : le quotient donne les semaines, le reste les jours.'),
    spec('6 semaines 3 j = 45 j', 3, {'q': '6', 'r': '3'}, 'correct', ['45']),
    spec('6 semaines 3 j : 63 j', 3, {'q': '6', 'r': '3'}, 'incorrect', ['63'],
         'Une semaine n\'a pas $10$ jours : il en a $7$.'),
    spec('6 semaines 3 j : 42 j', 3, {'q': '6', 'r': '3'}, 'incorrect', ['42'],
         'N\'oublie pas d\'ajouter les $3$ jours du départ.'),
    spec('41 mois = 3 ans 5 mois', 4, {'q': '3', 'r': '5', 'n': '41'}, 'correct', ['3', '5']),
    spec('41 mois : division par 10 (4 ans 1 mois)', 4, {'q': '3', 'r': '5', 'n': '41'},
         'incorrect', ['4', '1'], 'Un an n\'a pas $10$ mois : il en a $12$.'),
    spec('41 mois : inversé', 4, {'q': '3', 'r': '5', 'n': '41'}, 'incorrect', ['5', '3'],
         'Tu as inversé : le quotient donne les ans, le reste les mois.'),
    spec('3 ans 5 mois = 41 mois', 5, {'q': '3', 'r': '5'}, 'correct', ['41']),
    spec('3 ans 5 mois : 35 mois', 5, {'q': '3', 'r': '5'}, 'incorrect', ['35'],
         'Un an n\'a pas $10$ mois : il en a $12$.'),
    spec('3 ans 5 mois : 8 mois', 5, {'q': '3', 'r': '5'}, 'incorrect', ['8'],
         'Tu as ajouté les nombres tels quels : convertis d\'abord les ans en mois '
         '($\\times 12$).'),
]

N3 = modele(
    'Convertir des durées : jours, semaines, mois',
    'Heures en jours et heures, jours en semaines et jours, mois en années et mois, et les sens '
    'inverses ; pièges : diviser par 10, quotient et reste inversés, reste oublié',
    14, 40, [N3_A, N3_B, N3_C, N3_D, N3_E, N3_F], SPECS_N3, CONVERSIONS)


# =============================================================================================
# N4 — 6-159 : conversions avec les secondes.
# =============================================================================================

N4_A = variation(
    'Convertis.\n\n${{n}}' + S + ' = ?' + MIN + '~?' + S + '$',
    [var('q', '2..9'), var('r', '1..59'), var('n', 'eval:60*q+r')],
    [
        case('{{q}}', [
            erreur('{{eval:floor(n/100)}}', 'Une minute fait $60$ s, pas $100$.',
                   'Division par 100'),
        ]),
        case('{{r}}', [
            erreur('{{eval:mod(n,100)}}', 'Une minute fait $60$ s, pas $100$.',
                   'Division par 100'),
            erreur('{{eval:n-60}}', 'Il reste plus de $60$ s : il y a encore des minutes '
                   'dedans.', 'Une seule minute sortie'),
        ]),
    ],
    [
        '$1' + MIN + ' = 60' + S + '$. Dans ${{n}}$, combien de fois $60$ ?',
        '${{q}} \\times 60 = {{eval:60*q}}$ et ${{n}} - {{eval:60*q}} = {{r}}$.',
        '${{n}}' + S + ' = ' + couleur('{{q}}' + MIN + '~{{r}}' + S) + '$.',
    ],
    'Combien de fois $60$ s dans ${{n}}$ s ? Ce qui reste, ce sont des secondes.',
    ['floor(n/100)!=q', 'mod(n,100)!=r', 'n-60!=r'],
)

N4_B = variation(
    'Convertis.\n\n${{h}}' + H + '~{{m}}' + MIN + ' = ?' + S + '$',
    [var('h', '1..2'), var('m', '5..55')],
    [case('{{eval:3600*h+60*m}}', [
        erreur('{{eval:60*h+60*m}}', 'Une heure fait $60$ min, donc $3\\,600$ s, pas $60$ s.',
               'Une heure = 60 s'),
        erreur('{{eval:60*h+m}}', 'C\'est le nombre de minutes : multiplie-le encore par $60$ '
               'pour avoir des secondes.', 'Converti en minutes seulement'),
        erreur('{{eval:3600*h+m}}', 'Les ${{m}}$ min sont aussi à convertir en secondes.',
               'Minutes non converties'),
    ])],
    [
        '${{h}}' + H + '~{{m}}' + MIN + ' = {{eval:60*h}}' + MIN + ' + {{m}}' + MIN + ' = '
        '{{eval:60*h+m}}' + MIN + '$.',
        '${{eval:60*h+m}} \\times 60 = ' + couleur('{{eval:3600*h+60*m}}' + S) + '$.',
    ],
    'Convertis d\'abord tout en minutes, puis en secondes : $1$ min $= 60$ s.',
    ['mod(m,5)==0'],
)

N4_C = variation(
    'Convertis.\n\n${{n}}' + S + ' = ?' + H + '~?' + MIN + '~?' + S + '$',
    [var('h', '1..2'), var('m', '1..59'), var('s', '1..59'), var('n', 'eval:3600*h+60*m+s')],
    [
        case('{{h}}', [
            erreur('0', 'Il y a plus de $60$ min : forme d\'abord des heures.',
                   'Heures non formées'),
        ]),
        case('{{m}}', [
            erreur('{{eval:60*h+m}}', 'Plus de $60$ min : $60$ min font $1$ h.',
                   'Minutes non converties en heures'),
        ]),
        case('{{s}}', [
            erreur('{{eval:n-3600*h}}', 'C\'est ce qui reste après les heures : il y a encore '
                   'des minutes dedans.', 'Reste pris pour des secondes'),
        ]),
    ],
    [
        '$1' + H + ' = 3\\,600' + S + '$ : ${{n}} - {{eval:3600*h}} = {{eval:n-3600*h}}$, donc '
        '${{h}}' + H + '$ et ${{eval:n-3600*h}}' + S + '$.',
        '${{eval:n-3600*h}}' + S + ' = {{m}}' + MIN + '~{{s}}' + S + '$ (car ${{m}} \\times 60 = '
        '{{eval:60*m}}$).',
        '${{n}}' + S + ' = ' + couleur('{{h}}' + H + '~{{m}}' + MIN + '~{{s}}' + S) + '$.',
    ],
    'Une heure fait $3\\,600$ s. Sors d\'abord les heures, puis les minutes du reste.',
    [],
)

N4_D = variation(
    'Convertis.\n\n${{h}}' + H + '~{{m}}' + MIN + '~{{s}}' + S + ' = ?' + S + '$',
    [var('h', '1..2'), var('m', '1..59'), var('s', '1..59')],
    [case('{{eval:3600*h+60*m+s}}', [
        erreur('{{eval:60*h+60*m+s}}', 'Une heure fait $3\\,600$ s, pas $60$ s.',
               'Une heure = 60 s'),
        erreur('{{eval:3600*h+m+s}}', 'Les ${{m}}$ min sont aussi à convertir en secondes.',
               'Minutes non converties'),
        erreur('{{eval:3600*h+60*m}}', 'N\'oublie pas d\'ajouter les ${{s}}$ s.',
               'Secondes oubliées'),
    ])],
    [
        '${{h}}' + H + ' = {{eval:3600*h}}' + S + '$ et ${{m}}' + MIN + ' = {{eval:60*m}}' + S
        + '$.',
        '${{eval:3600*h}} + {{eval:60*m}} + {{s}} = ' + couleur('{{eval:3600*h+60*m+s}}' + S)
        + '$.',
    ],
    'Convertis chaque unité en secondes : $1$ min $= 60$ s et $1$ h $= 3\\,600$ s.',
)

SPECS_N4 = [
    spec('187 s = 3 min 7 s', 0, {'q': '3', 'r': '7', 'n': '187'}, 'correct', ['3', '7']),
    spec('187 s : division par 100 (1 min 87 s)', 0, {'q': '3', 'r': '7', 'n': '187'},
         'incorrect', ['1', '87'], 'Une minute fait $60$ s, pas $100$.'),
    spec('187 s : une seule minute (127 s)', 0, {'q': '3', 'r': '7', 'n': '187'}, 'incorrect',
         ['3', '127'], 'Il reste plus de $60$ s : il y a encore des minutes dedans.'),
    spec('1 h 25 min = 5 100 s', 1, {'h': '1', 'm': '25'}, 'correct', ['5100']),
    spec('1 h 25 min = 5 100 s, avec espace', 1, {'h': '1', 'm': '25'}, 'correct',
         ['5\\,100']),
    spec('1 h 25 min : 1 h = 60 s (1 560)', 1, {'h': '1', 'm': '25'}, 'incorrect', ['1560'],
         'Une heure fait $60$ min, donc $3\\,600$ s, pas $60$ s.'),
    spec('1 h 25 min : en minutes (85)', 1, {'h': '1', 'm': '25'}, 'incorrect', ['85'],
         'C\'est le nombre de minutes : multiplie-le encore par $60$ pour avoir des secondes.'),
    spec('1 h 25 min : minutes non converties (3 625)', 1, {'h': '1', 'm': '25'}, 'incorrect',
         ['3625'], 'Les $25$ min sont aussi à convertir en secondes.'),
    spec('4 523 s = 1 h 15 min 23 s', 2, {'h': '1', 'm': '15', 's': '23', 'n': '4523'}, 'correct',
         ['1', '15', '23']),
    spec('4 523 s : 0 h 75 min 23 s', 2, {'h': '1', 'm': '15', 's': '23', 'n': '4523'},
         'incorrect', ['0', '75', '23'], 'Il y a plus de $60$ min : forme d\'abord des heures.'),
    spec('4 523 s : reste en secondes (923)', 2, {'h': '1', 'm': '15', 's': '23', 'n': '4523'},
         'incorrect', ['1', '15', '923'],
         'C\'est ce qui reste après les heures : il y a encore des minutes dedans.'),
    spec('1 h 12 min 40 s = 4 360 s', 3, {'h': '1', 'm': '12', 's': '40'}, 'correct', ['4360']),
    spec('1 h 12 min 40 s : 1 h = 60 s (820)', 3, {'h': '1', 'm': '12', 's': '40'}, 'incorrect',
         ['820'], 'Une heure fait $3\\,600$ s, pas $60$ s.'),
    spec('1 h 12 min 40 s : minutes non converties (3 652)', 3, {'h': '1', 'm': '12', 's': '40'},
         'incorrect', ['3652'], 'Les $12$ min sont aussi à convertir en secondes.'),
    spec('1 h 12 min 40 s : secondes oubliées (4 320)', 3, {'h': '1', 'm': '12', 's': '40'},
         'incorrect', ['4320'], 'N\'oublie pas d\'ajouter les $40$ s.'),
]

N4 = modele(
    'Convertir des durées avec les secondes',
    'Secondes en minutes et secondes, heures et minutes en secondes, secondes en heures, minutes '
    'et secondes, et retour ; pièges : 1 min = 100 s, 1 h = 60 s, une unité non convertie',
    15, 45, [N4_A, N4_B, N4_C, N4_D], SPECS_N4, CONVERSIONS)


# =============================================================================================
# N5 — 6-159 : heures décimales (h min → h), et minutes décimales → min s.
# =============================================================================================

N5_A = variation(
    'Écris cette durée en heures, avec un nombre décimal.\n\n${{h}}' + H + '~{{m}}' + MIN + ' = ?'
    + H + '$',
    [var('h', '1..5'), var('m', '15|30|45')],
    [case('{{eval:h+m/60;d}}', [
        erreur('{{eval:h+m/100;d}}', 'Une heure fait $60$ min, pas $100$ : ${{m}}$ min, c\'est '
               '${{m}}$ soixantièmes d\'heure.', 'Minutes écrites après la virgule'),
        erreur('{{eval:h+m/10;d}}', 'Une heure fait $60$ min : ${{m}}$ min ne font pas '
               '${{m}}$ dixièmes d\'heure.', 'Minutes prises pour des dixièmes'),
    ])],
    [
        '${{m}}' + MIN + '$, c\'est {{if:m==15|un quart d\'heure|{{if:m==30|une demi-heure|trois '
        'quarts d\'heure}}}} : ${{m}}' + MIN + ' = {{eval:m/60;d}}' + H + '$.',
        '${{h}}' + H + '~{{m}}' + MIN + ' = ' + couleur('{{eval:h+m/60;d}}' + H) + '$.',
    ],
    'Quelle fraction d\'heure font ${{m}}$ min ? Écris-la ensuite en nombre décimal.',
    ['h+m/100!=h+m/60'],
)

N5_B = variation(
    'Écris cette durée en heures, avec un nombre décimal.\n\n${{n}}' + MIN + ' = ?' + H + '$',
    [var('n', '45..225'), var('q', 'eval:floor(n/60)'), var('r', 'eval:mod(n,60)')],
    [case('{{eval:n/60;d}}', [
        erreur('{{eval:q+r/100;d}}', 'Une heure fait $60$ min, pas $100$ : ${{r}}$ min ne '
               's\'écrivent pas ${{eval:r/100;d}}$ h.', 'Minutes écrites après la virgule'),
        erreur('{{eval:n/100;d}}', 'Une heure fait $60$ min, pas $100$ : divise par $60$.',
               'Division par 100'),
    ])],
    [
        '${{n}}' + MIN + ' = {{if:q==0|{{r}}' + MIN + '|{{q}}' + H + '{{if:r==0||~{{r}}' + MIN
        + '}}}}$.',
        '{{if:r==0|Il n\'y a pas de minutes en plus.|${{r}}' + MIN + ' = {{eval:r/60;d}}' + H
        + '$.}}',
        '${{n}}' + MIN + ' = ' + couleur('{{eval:n/60;d}}' + H) + '$.',
    ],
    'Combien d\'heures entières dans ${{n}}$ min ? Quelle fraction d\'heure reste-t-il ?',
    ['mod(n,15)==0', 'mod(n,60)!=0'],
)

N5_C = variation(
    'Écris cette durée en heures, avec un nombre décimal.\n\n${{h}}' + H + '~{{m}}' + MIN + ' = ?'
    + H + '$',
    [var('h', '1..4'), var('k', '1..9'), var('m', 'eval:6*k')],
    [case('{{eval:h+k/10;d}}', [
        erreur('{{eval:h+m/100;d}}', 'Une heure fait $60$ min, pas $100$ : ${{m}}$ min, c\'est '
               '${{m}}$ soixantièmes d\'heure.', 'Minutes écrites après la virgule'),
        erreur('{{eval:h+m/10;d}}', 'Une heure fait $60$ min : ${{m}}$ min ne font pas '
               '${{m}}$ dixièmes d\'heure.', 'Minutes prises pour des dixièmes'),
    ])],
    [
        'Un dixième d\'heure, c\'est $60 \\div 10 = 6$ min.',
        '${{m}}' + MIN + ' = {{k}} \\times 6' + MIN + '$, soit ${{k}}$ dixièmes d\'heure : '
        '${{eval:k/10;d}}' + H + '$.',
        '${{h}}' + H + '~{{m}}' + MIN + ' = ' + couleur('{{eval:h+k/10;d}}' + H) + '$.',
    ],
    'Combien de minutes dans un dixième d\'heure ? Combien de dixièmes dans ${{m}}$ min ?',
    [],
)

N5_D = variation(
    'Convertis en minutes et secondes.\n\n${{eval:a+p/100;d}}' + MIN + ' = ?' + MIN + '~?' + S
    + '$',
    [var('a', '1..9'), var('p', '10|25|50|75')],
    [
        case('{{a}}'),
        case('{{eval:60*p/100}}', [
            erreur('{{if:mod(p,10)==0|{{eval:p/10}}|{{p}}}}', 'Une minute fait $60$ s, pas '
                   '$100$ : ${{eval:p/100;d}}$ min, c\'est ${{eval:p/100;d}} \\times 60$ s.',
                   'Chiffres après la virgule pris pour des secondes'),
        ]),
    ],
    [
        '${{eval:a+p/100;d}}' + MIN + ' = {{a}}' + MIN + ' + {{eval:p/100;d}}' + MIN + '$.',
        '${{eval:p/100;d}} \\times 60 = {{eval:60*p/100}}$, donc ${{eval:p/100;d}}' + MIN + ' = '
        '{{eval:60*p/100}}' + S + '$.',
        '${{eval:a+p/100;d}}' + MIN + ' = ' + couleur('{{a}}' + MIN + '~{{eval:60*p/100}}' + S)
        + '$.',
    ],
    'Garde les minutes entières, puis convertis la partie décimale en secondes ($\\times 60$).',
)

SPECS_N5 = [
    spec('2 h 45 min = 2,75 h', 0, {'h': '2', 'm': '45'}, 'correct', ['2{,}75']),
    spec('2 h 45 min : 2,45 h (l\'erreur du chapitre)', 0, {'h': '2', 'm': '45'}, 'incorrect',
         ['2{,}45'], 'Une heure fait $60$ min, pas $100$ : $45$ min, c\'est $45$ soixantièmes '
         'd\'heure.'),
    spec('2 h 45 min : 6,5 h', 0, {'h': '2', 'm': '45'}, 'incorrect', ['6{,}5'],
         'Une heure fait $60$ min : $45$ min ne font pas $45$ dixièmes d\'heure.'),
    spec('2 h 30 min = 2,5 h', 0, {'h': '2', 'm': '30'}, 'correct', ['2{,}5']),
    spec('90 min = 1,5 h', 1, {'n': '90', 'q': '1', 'r': '30'}, 'correct', ['1{,}5']),
    spec('90 min : 1,30 h', 1, {'n': '90', 'q': '1', 'r': '30'}, 'incorrect', ['1{,}30'],
         'Une heure fait $60$ min, pas $100$ : $30$ min ne s\'écrivent pas $0.3$ h.'),
    spec('90 min : 0,9 h', 1, {'n': '90', 'q': '1', 'r': '30'}, 'incorrect', ['0{,}9'],
         'Une heure fait $60$ min, pas $100$ : divise par $60$.'),
    spec('1 h 12 min = 1,2 h', 2, {'h': '1', 'k': '2', 'm': '12'}, 'correct', ['1{,}2']),
    spec('1 h 12 min : 1,12 h', 2, {'h': '1', 'k': '2', 'm': '12'}, 'incorrect', ['1{,}12'],
         'Une heure fait $60$ min, pas $100$ : $12$ min, c\'est $12$ soixantièmes d\'heure.'),
    spec('3,5 min = 3 min 30 s', 3, {'a': '3', 'p': '50'}, 'correct', ['3', '30']),
    spec('3,5 min : 3 min 5 s', 3, {'a': '3', 'p': '50'}, 'incorrect', ['3', '5'],
         'Une minute fait $60$ s, pas $100$ : $0.5$ min, c\'est $0.5 \\times 60$ s.'),
    spec('4,25 min = 4 min 15 s', 3, {'a': '4', 'p': '25'}, 'correct', ['4', '15']),
]

N5 = modele(
    'Écrire une durée en heures décimales',
    'Heures et minutes en heures décimales (quarts, demies, dixièmes d\'heure), minutes en heures '
    'décimales, minutes décimales en minutes et secondes ; piège : 2 h 45 min écrit 2,45 h',
    16, 40, [N5_A, N5_B, N5_C, N5_D], SPECS_N5, CONVERSIONS)


# =============================================================================================
# N6 — 6-159 (Q1) : unités de durée et fractions d'heure.
# =============================================================================================

# (a) relations entre unités, selon t : 1 j = 24 h, 1 h = 60 min, 1 min = 60 s, 1 sem. = 7 j.
N6_GAUCHE = ['1~\\text{jour}', '1~\\text{heure}', '1~\\text{minute}', '1~\\text{semaine}']
N6_DROITE = ['\\text{heures}', '\\text{minutes}', '\\text{secondes}', '\\text{jours}']
N6_VAL = [24, 60, 60, 7]
N6_A = variation(
    'Complète.\n\n$' + selon('t', N6_GAUCHE) + ' = ?~' + selon('t', N6_DROITE) + '$',
    [var('t', '0..3'), var('v', 'eval:' + sel('t', N6_VAL))],
    [case('{{v}}', [
        erreur('100', 'Les durées ne se comptent pas par $100$ : retiens les nombres $24$, $60$ '
               'et $7$.', 'Comptage par 100'),
        erreur('{{if:t==0|12|{{if:t==3|5|10}}}}', '{{if:t==0|$12$ heures, c\'est une demi-'
               'journée.|{{if:t==3|Une semaine compte tous les jours, pas seulement les jours '
               'd\'école.|Les durées ne se comptent pas par $10$.}}}}', 'Nombre courant mais faux'),
    ])],
    ['$' + selon('t', N6_GAUCHE) + ' = ' + couleur('{{v}}~' + selon('t', N6_DROITE)) + '$.'],
    'Pense à une horloge, ou à un calendrier.',
)

# (b) « 1 … = 60 min » : retrouver l'unité (case choix ; leur forme gardée).
N6_B_DROITE = ['60~\\text{minutes}', '60~\\text{secondes}', '24~\\text{heures}', '7~\\text{jours}']
N6_B_REP = ['2', '3', '1', '0']  # indices : 0 semaine, 1 jour, 2 heure, 3 minute, 4 seconde
N6_B_NOM = ['heure', 'minute', 'jour', 'semaine']
N6_B = variation(
    'Quelle unité de durée complète l\'égalité ?\n\n$1~\\ldots = ' + selon('t', N6_B_DROITE)
    + '$\n\n' + bloc('choix', 'melanger: non', '- semaine', '- jour', '- heure', '- minute',
                     '- seconde'),
    [var('t', '0..3')],
    [case(selon('t', N6_B_REP))],
    ['$1~\\text{' + selon('t', N6_B_NOM) + '} = ' + selon('t', N6_B_DROITE) + '$ : c\'est '
     '$' + couleur('\\text{' + selon('t', ['l\'heure', 'la minute', 'le jour', 'la semaine'])
                   + '}') + '$.'],
    'Range les unités de la plus petite à la plus grande : seconde, minute, heure, jour, semaine.',
)

# (c) fraction d'heure en minutes.
N6_FRAC = ['\\frac{1}{4}', '\\frac{1}{2}', '\\frac{3}{4}']
N6_C = variation(
    'Complète.\n\n$' + selon('f', N6_FRAC) + '~\\text{d\'heure} = ?' + MIN + '$',
    [var('f', '0..2'), var('v', 'eval:' + sel('f', [15, 30, 45]))],
    [case('{{v}}', [
        erreur('{{if:f==0|25|{{if:f==1|50|75}}}}', 'Une heure fait $60$ min, pas $100$.',
               'Heure de 100 min'),
        erreur('{{if:f==2|34|{{if:f==1|12|14}}}}', 'Ce n\'est pas l\'écriture de la fraction : '
               'calcule ' + selon('f', N6_FRAC).replace('\\frac', '$\\frac') + '$ de $60$ min.',
               'Fraction recopiée'),
    ])],
    [
        'Une heure, c\'est $60$ min. ' + selon('f', [
            '$\\frac{1}{4}$ d\'heure : $60 \\div 4 = ' + couleur('15') + '$ min.',
            '$\\frac{1}{2}$ heure : $60 \\div 2 = ' + couleur('30') + '$ min.',
            '$\\frac{3}{4}$ d\'heure : $3 \\times 15 = ' + couleur('45') + '$ min.',
        ]),
    ],
    'Une heure fait $60$ min : partage-la en parts égales.',
)

# (d) minutes en fraction (ou décimal) d'heure.
N6_D = variation(
    'Écris cette durée en heure, avec une fraction ou un nombre décimal.\n\n${{v}}' + MIN + ' = ?'
    + H + '$',
    [var('f', '0..2'), var('v', 'eval:' + sel('f', [15, 30, 45]))],
    [case(selon('f', ['\\frac{1}{4}', '\\frac{1}{2}', '\\frac{3}{4}']), [
        erreur('{{eval:v/100;d}}', 'Une heure fait $60$ min, pas $100$ : ${{v}}$ min ne '
               's\'écrivent pas ${{eval:v/100;d}}$ h.', 'Minutes écrites après la virgule'),
        erreur('{{eval:v/10;d}}', 'Ce n\'est même pas une heure : la réponse est plus petite que '
               '$1$.', 'Minutes prises pour des dixièmes'),
    ])],
    [
        '${{v}}' + MIN + '$, c\'est ' + selon('f', ['un quart', 'la moitié', 'les trois quarts'])
        + ' de $60$ min.',
        '${{v}}' + MIN + ' = ' + couleur(selon('f', ['\\frac{1}{4}', '\\frac{1}{2}',
                                                     '\\frac{3}{4}']) + H) + ' = '
        + selon('f', ['0{,}25', '0{,}5', '0{,}75']) + H + '$.',
    ],
    'Une heure fait $60$ min : quelle part de l\'heure font ${{v}}$ min ?',
)

SPECS_N6 = [
    spec('1 jour = 24 heures', 0, {'t': '0', 'v': '24'}, 'correct', ['24']),
    spec('1 jour : 12', 0, {'t': '0', 'v': '24'}, 'incorrect', ['12'],
         '$12$ heures, c\'est une demi-journée.'),
    spec('1 heure = 60 minutes', 0, {'t': '1', 'v': '60'}, 'correct', ['60']),
    spec('1 heure : 100', 0, {'t': '1', 'v': '60'}, 'incorrect', ['100'],
         'Les durées ne se comptent pas par $100$ : retiens les nombres $24$, $60$ et $7$.'),
    spec('1 semaine : 5', 0, {'t': '3', 'v': '7'}, 'incorrect', ['5'],
         'Une semaine compte tous les jours, pas seulement les jours d\'école.'),
    spec('1 … = 60 minutes : heure', 1, {'t': '0'}, 'correct', ['2']),
    spec('1 … = 60 minutes : minute refusée', 1, {'t': '0'}, 'incorrect', ['3']),
    spec('1 … = 7 jours : semaine', 1, {'t': '3'}, 'correct', ['0']),
    spec('3/4 h = 45 min', 2, {'f': '2', 'v': '45'}, 'correct', ['45']),
    spec('3/4 h : 75 min', 2, {'f': '2', 'v': '45'}, 'incorrect', ['75'],
         'Une heure fait $60$ min, pas $100$.'),
    spec('3/4 h : 34 min', 2, {'f': '2', 'v': '45'}, 'incorrect', ['34'],
         'Ce n\'est pas l\'écriture de la fraction : calcule $\\frac{3}{4}$ de $60$ min.'),
    spec('45 min = 3/4 h', 3, {'f': '2', 'v': '45'}, 'correct', ['\\frac{3}{4}']),
    spec('45 min = 0,75 h', 3, {'f': '2', 'v': '45'}, 'correct', ['0{,}75']),
    spec('45 min : 0,45 h', 3, {'f': '2', 'v': '45'}, 'incorrect', ['0{,}45'],
         'Une heure fait $60$ min, pas $100$ : $45$ min ne s\'écrivent pas $0.45$ h.'),
    spec('30 min = 1/2 h', 3, {'f': '1', 'v': '30'}, 'correct', ['\\frac{1}{2}']),
]

N6 = modele(
    'Unités de durée et fractions d\'heure',
    'Relations entre jour, heure, minute, seconde et semaine ; retrouver l\'unité ; quart, demie '
    'et trois quarts d\'heure en minutes, et retour ; pièges : 100 min dans une heure, 0,45 h '
    'pour 45 min',
    17, 15, [N6_A, N6_B, N6_C, N6_D], SPECS_N6, CONVERSIONS, {'constraints': {'form': 'off'}})


ecrire('n1-ajouter-durees-secondes', N1)
ecrire('n2-horaire-debut-ou-fin', N2)
ecrire('n3-convertir-jours-semaines-mois', N3)
ecrire('n4-convertir-durees-secondes', N4)
ecrire('n5-heures-decimales', N5)
ecrire('n6-unites-de-duree-fractions-heure', N6)
print('6 modèles écrits dans', DOSSIER)
