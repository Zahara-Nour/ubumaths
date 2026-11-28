"""Ajoute les variations validées à trois modèles publiés de 6e, exportés de prod dans
scripts/questions/idees-6e-angles-publies/ (chantier idees-6e-angles).

Phase 0 du 2026-11-28 (« je te suis », journal docs/wip/idees-6e-angles-progress.md) :
- N3 → c8741112 « Le vocabulaire des angles » (6-168) : mesures des angles nul, droit, plat,
  plein ; encadrement de l'aigu et de l'obtus ; nom d'un angle d'après sa mesure (six noms) ;
- N4 → 3be08965 « Mesurer un angle au rapporteur » (6-169) : rapporteur posé sur un côté tourné
  vers la gauche (l'autre graduation) ; angle entre deux côtés dont aucun n'est sur le zéro ;
- N6 → 2291c83c « Construire un angle de mesure donnée » (6-170) : côté donné incliné.

Les variations s'ajoutent À LA FIN (les réponses des élèves gardent l'indice de leur variation) ;
la migration de contenu est générée par scripts/questions/migration-contenu.ts. Seuls `variations`
et `testSpecs` changent. Une case choix ou figure ne porte pas d'erreurs prévues (questions.md).

Le script repart du contenu de prod (variations et specs d'origine, comptées dans ORIGINE) : le
relancer réécrit l'ajout sans le doubler.

Usage : python3 docs/wip/questions/idees-6e-angles-publies.py scripts/questions/idees-6e-angles-publies
"""
import json
import math
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
DEG = '^\\circ'

# id court → (variations, specs) d'origine en prod (export du 2026-11-28)
ORIGINE = {'c8741112': (4, 14), '3be08965': (2, 7), '2291c83c': (2, 7)}


def spec(desc, vi, variables_, status, answers, message=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = message
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': expected, 'answers': answers}


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
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    if blanks is not None:
        v['blanks'] = blanks
    v['correction'] = {'steps': steps}
    v['hint'] = hint
    return v


def couleur(contenu):
    return PRIMAIRE + '{' + contenu + '}'


def selon(v, textes, k=0):
    if k == len(textes) - 1:
        return textes[k]
    return '{{if:' + v + '==' + str(k) + '|' + textes[k] + '|' + selon(v, textes, k + 1) + '}}'


def sel(v, valeurs):
    return '+'.join(f'({x})*(1-min(abs({v}-{k}),1))' for k, x in enumerate(valeurs))


def ajouter(court, variations, specs):
    chemin = os.path.join(DOSSIER, court + '.json')
    with open(chemin, encoding='utf-8') as f:
        m = json.load(f)
    nv, ns = ORIGINE[court]
    m['variations'] = m['variations'][:nv] + variations
    m['testSpecs'] = m['testSpecs'][:ns] + specs
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write('\n')


# =============================================================================================
# N3 — c8741112 (4 variations d'origine : indices 4, 5, 6 ajoutés)
# =============================================================================================

NOMS_PART = ['nul', 'droit', 'plat', 'plein']
MESURES_PART = [0, 90, 180, 360]
DEF_PART = [
    'ses deux côtés sont confondus : il ne s\'ouvre pas du tout',
    'c\'est un quart de tour, le coin d\'une feuille',
    'ses deux côtés forment une droite : un demi-tour',
    'il fait un tour complet',
]
E1 = ([360, 180, 90, 180], [
    'Un angle nul ne s\'ouvre pas du tout : ses côtés sont confondus. Il mesure $0^\\circ$ ; $360^\\circ$, c\'est l\'angle plein.',
    '$180^\\circ$, c\'est l\'angle plat (un demi-tour). L\'angle droit en est la moitié.',
    '$90^\\circ$, c\'est l\'angle droit. L\'angle plat en vaut deux.',
    '$180^\\circ$, c\'est l\'angle plat (un demi-tour). L\'angle plein fait un tour complet.',
])
E2 = ([180, 45, 360, 90], [
    '$180^\\circ$, c\'est l\'angle plat : ses côtés forment une droite. Ceux d\'un angle nul sont confondus.',
    '$45^\\circ$, c\'est la moitié d\'un angle droit.',
    '$360^\\circ$, c\'est l\'angle plein (un tour complet). L\'angle plat est un demi-tour.',
    '$90^\\circ$, c\'est un quart de tour ; l\'angle plein fait un tour complet.',
])
E3 = ([90, 100, 0, 0], [
    '$90^\\circ$, c\'est l\'angle droit. Un angle nul ne s\'ouvre pas du tout.',
    'Un angle droit mesure exactement $90^\\circ$ : c\'est la graduation du milieu du rapporteur.',
    '$0^\\circ$, c\'est l\'angle nul. L\'angle plat s\'ouvre jusqu\'à former une droite.',
    '$0^\\circ$, c\'est l\'angle nul : ses côtés sont confondus, sans tourner. L\'angle plein, lui, fait un tour complet.',
])


def err_part(e, label):
    valeurs, messages = e
    return erreur('{{eval:' + sel('m', valeurs) + '}}', selon('m', messages), label)


N3_E = variation(
    'Complète.\n\nUn angle **' + selon('m', NOMS_PART) + '** mesure $?' + DEG + '$.',
    [var('m', '0..3')],
    [case('{{eval:' + sel('m', MESURES_PART) + '}}', [
        err_part(E1, 'Confusion avec un autre angle'),
        err_part(E2, 'Confusion avec un autre angle'),
        err_part(E3, 'Confusion avec un autre angle'),
    ])],
    ['Un angle **' + selon('m', NOMS_PART) + '** : ' + selon('m', DEF_PART) + '.',
     'Il mesure $' + couleur(selon('m', ['0', '90', '180', '360']) + DEG) + '$.'],
    'Pense au rapporteur : un angle droit va jusqu\'au milieu, un angle plat jusqu\'au bout, et '
    'un tour complet en fait deux.',
)

MSG_F_OBTUS_0 = 'Un angle obtus est **plus grand** qu\'un angle droit : il commence après $90^\\circ$.'
MSG_F_AIGU_180 = 'Un angle aigu est **plus petit** qu\'un angle droit : il s\'arrête avant $90^\\circ$.'
MSG_F_OBTUS_360 = 'Un angle obtus est plus petit qu\'un angle plat : il s\'arrête avant $180^\\circ$.'
N3_F = variation(
    'Complète.\n\nUn angle **' + selon('m', ['aigu', 'obtus']) + '** mesure entre $?' + DEG
    + '$ et $?' + DEG + '$.',
    [var('m', '0..1')],
    [case('{{eval:' + sel('m', [0, 90]) + '}}', [
        erreur('{{eval:' + sel('m', [90, 0]) + '}}',
               selon('m', ['Un angle aigu est plus petit qu\'un angle droit : il part de $0^\\circ$.', MSG_F_OBTUS_0]),
               'Mauvaise borne'),
    ]),
     case('{{eval:' + sel('m', [90, 180]) + '}}', [
         erreur('{{eval:' + sel('m', [180, 360]) + '}}',
                selon('m', [MSG_F_AIGU_180, MSG_F_OBTUS_360]), 'Borne trop grande'),
         erreur('{{eval:' + sel('m', [45, 90]) + '}}',
                selon('m', ['Un angle aigu peut dépasser $45^\\circ$ : il va jusqu\'à l\'angle droit.',
                            MSG_F_OBTUS_0]), 'Borne trop petite'),
     ])],
    ['Un angle **' + selon('m', ['aigu', 'obtus']) + '** est '
     + selon('m', ['plus petit qu\'un angle droit', 'plus grand qu\'un angle droit et plus petit qu\'un angle plat']) + '.',
     'Il mesure entre $' + couleur(selon('m', ['0', '90']) + DEG) + '$ et $'
     + couleur(selon('m', ['90', '180']) + DEG) + '$.'],
    'Compare à l\'angle droit ($90' + DEG + '$) et à l\'angle plat ($180' + DEG + '$).',
)

NOMS_G = ['aigu', 'droit', 'obtus', 'plat', 'nul', 'plein']
N3_G = variation(
    'Un angle mesure ${{N}}' + DEG + '$.\n\nComment s\'appelle cet angle ?\n\n```choix\nmelanger: non\n'
    + '\n'.join('- un angle ' + n for n in NOMS_G) + '\n```',
    [var('c', '0..5'), var('r', '2..8'), var('N', 'eval:' + sel('c', ['10*r', '90', '90+10*r', '180', '0', '360']))],
    [case('{{c}}')],
    ['Aigu : moins de $90' + DEG + '$ ; droit : $90' + DEG + '$ ; obtus : entre $90' + DEG + '$ et $180' + DEG
     + '$ ; plat : $180' + DEG + '$ ; nul : $0' + DEG + '$ ; plein : $360' + DEG + '$.',
     '${{N}}' + DEG + '$ : c\'est un angle $' + couleur('\\text{' + selon('c', NOMS_G) + '}') + '$.'],
    'Compare la mesure à $90' + DEG + '$ (angle droit) et à $180' + DEG + '$ (angle plat).',
)

SPECS_N3 = [
    spec('Plat : 180', 4, {'m': '2'}, 'correct', ['180']),
    spec('Plat : 90', 4, {'m': '2'}, 'incorrect', ['90'], '$90^\\circ$, c\'est l\'angle droit. L\'angle plat en vaut deux.'),
    spec('Plein : 360', 4, {'m': '3'}, 'correct', ['360']),
    spec('Plein : 180', 4, {'m': '3'}, 'incorrect', ['180'],
         '$180^\\circ$, c\'est l\'angle plat (un demi-tour). L\'angle plein fait un tour complet.'),
    spec('Nul : 0', 4, {'m': '0'}, 'correct', ['0']),
    spec('Droit : 90', 4, {'m': '1'}, 'correct', ['90']),
    spec('Aigu : 0 et 90', 5, {'m': '0'}, 'correct', ['0', '90']),
    spec('Aigu : 0 et 180', 5, {'m': '0'}, 'incorrect', ['0', '180'], MSG_F_AIGU_180),
    spec('Obtus : 90 et 180', 5, {'m': '1'}, 'correct', ['90', '180']),
    spec('Obtus : 0 et 180', 5, {'m': '1'}, 'incorrect', ['0', '180'], MSG_F_OBTUS_0),
    spec('360 : plein', 6, {'c': '5', 'r': '3', 'N': '360'}, 'correct', ['5']),
    spec('0 : nul', 6, {'c': '4', 'r': '3', 'N': '0'}, 'correct', ['4']),
    spec('0 pris pour plat', 6, {'c': '4', 'r': '3', 'N': '0'}, 'incorrect', ['3']),
    spec('130 : obtus', 6, {'c': '2', 'r': '4', 'N': '130'}, 'correct', ['2']),
    spec('130 pris pour aigu', 6, {'c': '2', 'r': '4', 'N': '130'}, 'incorrect', ['0']),
]
ajouter('c8741112', [N3_E, N3_F, N3_G], SPECS_N3)


# =============================================================================================
# N4 — 3be08965 (2 variations d'origine : indices 2, 3 ajoutés)
# =============================================================================================

N4_C = variation(
    'Le rapporteur est posé sur l\'angle $\\widehat{AOB}$. Quelle est sa mesure, en degrés ?\n\n'
    '```figure-a-completer\nfenetre: 0 ; 10 ; 0 ; 8\nverifier: mesure AOB, rapporteur posé\n---\n'
    'O = point(5, 2.5)\nA = point(1, 2.5)\nP = point(1.4, 2.5, visible=faux)\n'
    'B = rotation(P, angle={{eval:-a}}, centre=O)\nx = demidroite(O, A)\ny = demidroite(O, B)\n```',
    [var('a', '15..165')],
    None,
    ['**Lire la bonne graduation.** Ici, le côté $[OA)$ part vers la **gauche** : on part du $0$ '
     'qui est à gauche, sur $[OA)$, et on suit cette graduation jusqu\'au côté $[OB)$.',
     'L\'angle est {{if:a<90|aigu|obtus}} : sa mesure est {{if:a<90|plus petite|plus grande}} que '
     '$90^\\circ$. $\\widehat{AOB} = ' + couleur('{{a}}' + DEG) + '$.'],
    'Le $0$ à suivre est celui qui est sur le côté $[OA)$ : ici, à gauche. Ton angle est-il aigu '
    'ou obtus ?',
    ['a!=90'],
)
N4_D = variation(
    'Mesure l\'angle $\\widehat{BOC}$ avec le rapporteur, puis écris sa mesure, en degrés.\n\n'
    '```figure-a-completer\nfenetre: 0 ; 10 ; 0 ; 8\nverifier: mesure BOC\n---\n'
    'O = point(5, 3)\nP = point(8.6, 3, visible=faux)\nA = rotation(P, angle={{t}}, centre=O)\n'
    'B = rotation(P, angle={{eval:t+b}}, centre=O)\nC = rotation(P, angle={{eval:t+b+c}}, centre=O)\n'
    'x = demidroite(O, A)\ny = demidroite(O, B)\nz = demidroite(O, C)\n```',
    [var('b', '20..50'), var('c', '35..120'), var('t', '0..15')],
    None,
    ['**Poser le rapporteur sur le bon côté.** L\'angle $\\widehat{BOC}$ a pour côtés $[OB)$ et $[OC)$ : '
     'le centre du rapporteur sur $O$, sa base le long de $[OB)$. Le côté $[OA)$ ne sert pas.',
     'On part du $0$ qui est sur $[OB)$ jusqu\'au côté $[OC)$ : $\\widehat{BOC} = '
     + couleur('{{c}}' + DEG) + '$.'],
    'Les côtés de $\\widehat{BOC}$ sont $[OB)$ et $[OC)$ : pose la base du rapporteur sur $[OB)$.',
    ['c!=90', 'b+c<=165'],
)
SPECS_N4 = [
    spec('Côté à gauche : 50', 2, {'a': '50'}, 'correct', ['mesure(50)']),
    spec('Erreur : 130 (graduation de droite)', 2, {'a': '50'}, 'incorrect', ['mesure(130)']),
    spec('Côté à gauche : 140', 2, {'a': '140'}, 'correct', ['mesure(140)']),
    spec('Erreur : 40 (graduation de droite)', 2, {'a': '140'}, 'incorrect', ['mesure(40)']),
    spec('BOC : 70', 3, {'b': '30', 'c': '70', 't': '10'}, 'correct', ['mesure(70)']),
    spec('Erreur : AOC = 100', 3, {'b': '30', 'c': '70', 't': '10'}, 'incorrect', ['mesure(100)']),
    spec('Erreur : 110 (mauvaise graduation)', 3, {'b': '30', 'c': '70', 't': '10'}, 'incorrect', ['mesure(110)']),
]
ajouter('3be08965', [N4_C, N4_D], SPECS_N4)


# =============================================================================================
# N6 — 2291c83c (2 variations d'origine : indice 2 ajouté). O = (5 ; 4), [OA) tournée de s.
# =============================================================================================

OX, OY, R = 5, 4, 3


def bout(angle):
    return (OX + R * math.cos(math.radians(angle)), OY + R * math.sin(math.radians(angle)))


def reponse(s, a, sens):
    ax, ay = OX + 3.6 * math.cos(math.radians(s)), OY + 3.6 * math.sin(math.radians(s))
    x, y = bout(s + sens * a)
    return f'repere({OX};{OY};{ax};{ay};{R};{a};{sens})|segment({OX};{OY};{x};{y})'


N6_C = variation(
    'Construis la demi-droite $[Oy)$ telle que $\\widehat{AOy} = {{a}}^\\circ$.\n\n'
    '```figure-a-completer\nfenetre: 0 ; 10 ; 0 ; 8\nverifier: angle AOy = {{a}}\n---\n'
    f'O = point({OX}, {OY})\nP = point(8.6, {OY}, visible=faux)\nA = rotation(P, angle={{{{s}}}}, centre=O)\n'
    'x = demidroite(O, A)\n```',
    [var('a', '15..165'), var('s', '20..50')],
    None,
    ['**Poser le rapporteur** : son centre sur le sommet $O$, sa base le long de $[OA)$, même si '
     '$[OA)$ est penchée : on tourne le rapporteur avec elle.',
     'Partir du $0$ qui est sur $[OA)$, marquer un repère à la graduation ${{a}}^\\circ$, puis '
     'tracer à la règle la demi-droite $' + couleur('[Oy)') + '$ de $O$ au repère.'],
    'Le côté $[OA)$ est penché : tourne le rapporteur pour que sa base suive $[OA)$.',
    ['a!=90'],
)
SPECS_N6 = [
    spec('40°, base à 30°', 2, {'a': '40', 's': '30'}, 'correct', [reponse(30, 40, 1)]),
    spec('40°, de l\'autre côté', 2, {'a': '40', 's': '30'}, 'correct', [reponse(30, 40, -1)]),
    spec('Erreur : 140° au lieu de 40°', 2, {'a': '40', 's': '30'}, 'incorrect', [reponse(30, 140, 1)]),
    spec('Erreur : mesuré depuis l\'horizontale', 2, {'a': '40', 's': '30'}, 'incorrect',
         [f'segment({OX};{OY};{bout(40)[0]};{bout(40)[1]})']),
    spec('125°, base à 45°', 2, {'a': '125', 's': '45'}, 'correct', [reponse(45, 125, -1)]),
]
ajouter('2291c83c', [N6_C], SPECS_N6)

print('Variations ajoutées : c8741112 +3, 3be08965 +2, 2291c83c +1')
