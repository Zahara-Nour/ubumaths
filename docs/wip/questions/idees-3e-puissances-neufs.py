"""Écrit les modèles neufs du chantier idees-3e-puissances dans
scripts/questions/idees-3e-puissances-neufs/ (N5, N6).

Phase 0 validée par David le 2026-11-25 (« je valide » : toutes les recommandations ; fiches
docs/wip/idees-3e-puissances-fiches.md) :
- N5 = F5 « Lire une puissance » (4e, 4-015, nœud « définition ») ; Q2 : on le fait ;
- N6 = F6 « Puissances : bases cachées » (3e, 3-052, nœud « quotient de puissances »).

Ni theme, ni domain, ni subdomain, ni id : create-questions --publier écrit l'id.

Décisions d'écriture et écarts à la fiche :
- N5 : texte à trous (```trous) ; un bloc à geste ne porte pas d'erreurs prévues
  (couvrir-un-niveau.md § 5) : base et exposant échangés, double / triple pour carré / cube sont
  des intrus du bloc, et le corrigé dit pourquoi. Base et exposant de 2 à 9, différents.
- N6 : la base est écrite, l'élève tape l'exposant (a^{?}), comme bb9cff7b. Base 2, 3, 5 ou 7
  (pas 4 ni 6 : 16 = 2⁴ = 4²). Le nombre caché est a² écrit en nombre ; jamais 25ᵐ (la puissance
  d'une puissance n'est pas citée en 3e). Résultat différent de 0 et de 1.

Usage : python3 docs/wip/questions/idees-3e-puissances-neufs.py scripts/questions/idees-3e-puissances-neufs
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
SECOND = '\\textcolor{{{color:primary.1}}}'

RANGEMENT = {
    'n5-lire-une-puissance': ('Nombres et calculs > Puissances : sens et écritures > définition',
                              '4-015'),
    'n6-puissances-bases-cachees': (
        'Nombres et calculs > Puissances : calculs > quotient de puissances', '3-052'),
}


def modele(title, description, grades, level, delay, options, variations, specs):
    m = {'title': title, 'description': description, 'grades': grades, 'level': level,
         'delay': delay, 'status': 'draft'}
    if options:
        m['options'] = options
    m['variations'] = variations
    m['testSpecs'] = specs
    return m


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


def spec(desc, vi, variables_, status, answers, message=None, violations=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = message
    if violations is not None:
        expected['constraintViolations'] = violations
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
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': blanks, 'correction': {'steps': steps}, 'hint': hint}


def couleur(contenu, c=PRIMAIRE):
    return c + '{' + contenu + '}'


# =============================================================================================
# N5 — Lire une puissance (4e, 4-015)
# =============================================================================================

MOTS = {2: 'deux', 3: 'trois', 4: 'quatre', 5: 'cinq', 6: 'six', 7: 'sept', 8: 'huit',
        9: 'neuf'}


def mot(v):
    """Le nombre (variable v, de 2 à 9) écrit en lettres."""
    out = MOTS[9]
    for k in range(8, 1, -1):
        out = '{{if:' + v + '==' + str(k) + '|' + MOTS[k] + '|' + out + '}}'
    return out


N5_V1 = variation(
    'Complète la lecture de cette puissance avec les étiquettes.\n\n'
    '```trous\n'
    '${{a}}^{ {{n}} }$ se lit : [' + mot('a') + '] exposant [' + mot('n') + '].\n'
    'intrus: ' + mot('x') + ' ; ' + mot('y') + '\n'
    '```',
    [var('a', '2..9'), var('n', '2..9'), var('x', '2..9'), var('y', '2..9')],
    [],
    [
        '**Lire une puissance.** On lit d’abord la base (le grand nombre), puis « exposant », puis '
        'l’exposant (le petit nombre écrit en haut).',
        'Dans ${{a}}^{ {{n}} }$, la base est ' + '$' + couleur('{{a}}') + '$ et l’exposant est $'
        + couleur('{{n}}', SECOND) + '$ : ${{a}}^{ {{n}} }$ se lit « ' + mot('a') + ' exposant '
        + mot('n') + ' ». Lu « ' + mot('n') + ' exposant ' + mot('a') + ' », ce serait '
        '${{n}}^{ {{a}} }$, un autre nombre.',
    ],
    'On lit d’abord le grand nombre (la base), puis le petit nombre écrit en haut (l’exposant).',
    ['a!=n', 'x!=a', 'x!=n', 'y!=a', 'y!=n', 'x!=y'],
)

N5_V2 = variation(
    'Complète la lecture de cette puissance avec les étiquettes.\n\n'
    '```trous\n'
    '${{a}}^{ {{n}} }$ se lit : ' + mot('a') + ' au [{{if:n==2|carré|cube}}].\n'
    'intrus: {{if:n==2|cube|carré}} ; double ; triple\n'
    '```',
    # Pas de base 2 : 2² = 2 × 2 est aussi le double de 2, le corrigé se contredirait.
    [var('a', '3..9'), var('n', '2|3')],
    [],
    [
        '**Carré et cube.** L’exposant $2$ se lit « au carré » (l’aire d’un carré de côté $a$ '
        'est $a^2$) ; l’exposant $3$ se lit « au cube » (le volume d’un cube d’arête $a$ est '
        '$a^3$).',
        '${{a}}^{ {{n}} } = {{if:n==2|{{a}} \\times {{a}}|{{a}} \\times {{a}} \\times {{a}}}}$ se '
        'lit « ' + mot('a') + ' au {{if:n==2|carré|cube}} ». Le double de ${{a}}$ serait '
        '$2 \\times {{a}}$, et le triple $3 \\times {{a}}$ : ce ne sont pas des puissances.',
    ],
    'Pense à l’aire d’un carré et au volume d’un cube.',
)

# Réponses d'un bloc à trous : la position AFFICHÉE de la bonne étiquette de chaque trou. La
# réserve est mélangée au tirage (hasard de la question) ; à variables fixées, le mélange des
# specs est toujours le même : V1 « cinq ; deux ; neuf ; sept » (7⁵, intrus 2 et 9),
# « huit ; quatre ; six ; trois » (3⁸, intrus 4 et 6) ; V2 « cube ; double ; triple ; carré »
# (n = 2), « carré ; double ; triple ; cube » (n = 3). Lu sur l'instance, le 2026-11-25.
N5_SPECS = [
    spec('V1 : 7^5 se lit sept exposant cinq', 0, {'a': '7', 'n': '5', 'x': '2', 'y': '9'},
         'correct', ['3', '0']),
    spec('V1 : base et exposant échangés', 0, {'a': '7', 'n': '5', 'x': '2', 'y': '9'},
         'incorrect', ['0', '3']),
    spec('V1 : 3^8 se lit trois exposant huit', 0, {'a': '3', 'n': '8', 'x': '4', 'y': '6'},
         'correct', ['3', '0']),
    spec('V1 : un intrus pour la base', 0, {'a': '3', 'n': '8', 'x': '4', 'y': '6'},
         'incorrect', ['2', '0']),
    spec('V2 : 6^2 se lit six au carré', 1, {'a': '6', 'n': '2'}, 'correct', ['3']),
    spec('V2 : 4^3 se lit quatre au cube', 1, {'a': '4', 'n': '3'}, 'correct', ['3']),
    spec('V2 : double au lieu de carré', 1, {'a': '6', 'n': '2'}, 'incorrect', ['1']),
    spec('V2 : carré au lieu de cube', 1, {'a': '4', 'n': '3'}, 'incorrect', ['0']),
]

ecrire('n5-lire-une-puissance', modele(
    'Lire une puissance',
    'Compléter la lecture d’une puissance avec des étiquettes : « sept exposant cinq », '
    '« six au carré », « quatre au cube » (pièges : base et exposant échangés, double ou triple '
    'pour carré ou cube)',
    ['4'], 1, 20, None, [N5_V1, N5_V2], N5_SPECS))


# =============================================================================================
# N6 — Puissances : bases cachées (3e, 3-052)
# =============================================================================================

BASES = '2|3|5|7'
MSG_SEUL = 'Le facteur ${{a}}$ écrit seul compte aussi : ${{a}} = {{a}}^1$.'


def msg_a1(base):
    return f'Tu as compté ${{{{A}}}}$ comme un seul facteur : ${{{{A}}}} = {base}^2$.'


def msg_oubli(base):
    return f'Tu as oublié ${{{{A}}}}$ : c’est une puissance cachée, ${{{{A}}}} = {base}^2$.'


MSG_SIGNE_DEN = ('Tous les exposants du dénominateur se retranchent : tu en as ajouté un.')

# V1 : aⁿ × A / (aᵐ × aᵖ)
N6_V1 = variation(
    'Écris ce nombre sous la forme d’une puissance de ${{a}}$.\n\n'
    '$$\\dfrac{ {{a}}^{ {{n}} } \\times {{A}} }{ {{a}}^{ {{m}} } \\times {{a}}^{ {{p}} } } = '
    '{{a}}^{?}$$',
    [var('a', BASES), var('A', 'eval:a*a'), var('n', '2..7'), var('m', '2..7'),
     var('p', '2..7'), var('r', 'eval:n+2-m-p')],
    [case('{{r}}', [
        erreur('{{eval:n+1-m-p}}', msg_a1('{{a}}'), 'Nombre caché compté comme a'),
        erreur('{{eval:n-m-p}}', msg_oubli('{{a}}'), 'Nombre caché oublié'),
        erreur('{{eval:n+2-m+p}}', MSG_SIGNE_DEN, 'Exposant du dénominateur ajouté'),
    ])],
    [
        'On écrit ${{A}}$ comme une puissance de ${{a}}$ : ${{A}} = {{a}} \\times {{a}} = '
        + couleur('{{a}}^2') + '$.',
        '$$\\dfrac{ {{a}}^{ {{n}} } \\times ' + couleur('{{a}}^2') + ' }{ {{a}}^{ {{m}} } '
        '\\times {{a}}^{ {{p}} } } = \\dfrac{ {{a}}^{ {{eval:n+2}} } }{ {{a}}^{ {{eval:m+p}} } } '
        '= {{a}}^{ {{eval:n+2}} - {{eval:m+p}} } = ' + couleur('{{a}}^{ {{r}} }', SECOND) + '$$',
    ],
    'Écris ${{A}}$ comme une puissance de ${{a}}$, puis regroupe le numérateur et le '
    'dénominateur.',
    ['r!=0', 'r!=1'],
)

# V2 : a × aⁿ / (A × A)
N6_V2 = variation(
    'Écris ce nombre sous la forme d’une puissance de ${{a}}$.\n\n'
    '$$\\dfrac{ {{a}} \\times {{a}}^{ {{n}} } }{ {{A}} \\times {{A}} } = {{a}}^{?}$$',
    [var('a', BASES), var('A', 'eval:a*a'), var('n', '2..9'), var('r', 'eval:n+1-4')],
    [case('{{r}}', [
        erreur('{{eval:n+1-2}}', 'Chaque ${{A}}$ vaut ${{a}}^2$ : le dénominateur est ${{a}}^4$.',
               'Nombres cachés comptés comme a'),
        erreur('{{eval:n-4}}', MSG_SEUL, 'Facteur a seul oublié'),
    ])],
    [
        'On écrit ${{A}}$ comme une puissance de ${{a}}$ : ${{A}} = ' + couleur('{{a}}^2')
        + '$, et ${{a}} = {{a}}^1$.',
        '$$\\dfrac{ {{a}}^1 \\times {{a}}^{ {{n}} } }{ ' + couleur('{{a}}^2') + ' \\times '
        + couleur('{{a}}^2') + ' } = \\dfrac{ {{a}}^{ {{eval:n+1}} } }{ {{a}}^4 } = '
        '{{a}}^{ {{eval:n+1}} - 4 } = ' + couleur('{{a}}^{ {{r}} }', SECOND) + '$$',
    ],
    'Écris ${{A}}$ comme une puissance de ${{a}}$, sans oublier le facteur ${{a}}$ écrit seul.',
    ['r!=0', 'r!=1'],
)

# V3 : base négative, (−a)ⁿ × A / (−a)ᵐ, A = (−a)²
N6_V3 = variation(
    'Écris ce nombre sous la forme d’une puissance de $(-{{a}})$.\n\n'
    '$$\\dfrac{ (-{{a}})^{ {{n}} } \\times {{A}} }{ (-{{a}})^{ {{m}} } } = (-{{a}})^{?}$$',
    [var('a', BASES), var('A', 'eval:a*a'), var('n', '2..7'), var('m', '2..7'),
     var('r', 'eval:n+2-m')],
    [case('{{r}}', [
        erreur('{{eval:n+1-m}}', msg_a1('\\left( -{{a}} \\right)'), 'Nombre caché compté comme un facteur'),
        erreur('{{eval:n-m}}', msg_oubli('\\left( -{{a}} \\right)'), 'Nombre caché oublié'),
        erreur('{{eval:n+2+m}}', MSG_SIGNE_DEN, 'Exposant du dénominateur ajouté'),
    ])],
    [
        'Un carré est positif : ${{A}} = (-{{a}}) \\times (-{{a}}) = ' + couleur('(-{{a}})^2')
        + '$.',
        '$$\\dfrac{ (-{{a}})^{ {{n}} } \\times ' + couleur('(-{{a}})^2') + ' }{ (-{{a}})^{ {{m}} } } '
        '= \\dfrac{ (-{{a}})^{ {{eval:n+2}} } }{ (-{{a}})^{ {{m}} } } = (-{{a}})^{ {{eval:n+2}} - '
        '{{m}} } = ' + couleur('(-{{a}})^{ {{r}} }', SECOND) + '$$',
    ],
    'Écris ${{A}}$ comme une puissance de $(-{{a}})$ : le produit de deux nombres négatifs est '
    'positif.',
    ['r!=0', 'r!=1'],
)

# V4 : exposants négatifs, a⁻ⁿ × A / aᵐ (m relatif)
N6_V4 = variation(
    'Écris ce nombre sous la forme d’une puissance de ${{a}}$.\n\n'
    '$$\\dfrac{ {{a}}^{-{{n}}} \\times {{A}} }{ {{a}}^{ {{m}} } } = {{a}}^{?}$$',
    [var('a', BASES), var('A', 'eval:a*a'), var('n', '2..6'), var('m', '2..6;±'),
     var('r', 'eval:-n+2-(m)')],
    [case('{{r}}', [
        erreur('{{eval:-n+1-(m)}}', msg_a1('{{a}}'), 'Nombre caché compté comme a'),
        erreur('{{eval:-n-(m)}}', msg_oubli('{{a}}'), 'Nombre caché oublié'),
        erreur('{{eval:n+2-(m)}}', 'L’exposant $-{{n}}$ est négatif : garde son signe dans le '
               'calcul.', 'Signe d’un exposant oublié'),
    ])],
    [
        'On écrit ${{A}}$ comme une puissance de ${{a}}$ : ${{A}} = ' + couleur('{{a}}^2') + '$.',
        '$$\\dfrac{ {{a}}^{-{{n}}} \\times ' + couleur('{{a}}^2') + ' }{ {{a}}^{ {{m}} } } = '
        '\\dfrac{ {{a}}^{ {{eval:2-n}} } }{ {{a}}^{ {{m}} } } = {{a}}^{ {{eval:2-n}} '
        '{{eval:-(m);+}} } = ' + couleur('{{a}}^{ {{r}} }', SECOND) + '$$',
    ],
    'Écris ${{A}}$ comme une puissance de ${{a}}$, puis garde le signe de chaque exposant.',
    ['r!=0', 'r!=1'],
)

N6_SPECS = [
    # V1 : 5^4 × 25 / (5^3 × 5^2) = 5^1 → exclu (r = 1) ; 5^6 × 25 / (5^3 × 5^2) = 5^3
    spec('V1 : 5^6 × 25 / (5^3 × 5^2) → 3', 0, {'a': '5', 'n': '6', 'm': '3', 'p': '2'},
         'correct', ['3']),
    spec('V1 : 25 compté comme 5', 0, {'a': '5', 'n': '6', 'm': '3', 'p': '2'}, 'incorrect',
         ['2'], 'Tu as compté $25$ comme un seul facteur : $25 = 5^2$.'),
    spec('V1 : 25 oublié', 0, {'a': '5', 'n': '6', 'm': '3', 'p': '2'}, 'incorrect', ['1'],
         'Tu as oublié $25$ : c’est une puissance cachée, $25 = 5^2$.'),
    spec('V1 : exposant du dénominateur ajouté', 0, {'a': '5', 'n': '6', 'm': '3', 'p': '2'},
         'incorrect', ['7'], MSG_SIGNE_DEN),
    spec('V1 : 2^2 × 4 / (2^5 × 2^4) → -5', 0, {'a': '2', 'n': '2', 'm': '5', 'p': '4'},
         'correct', ['-5']),
    spec('V2 : 3 × 3^8 / (9 × 9) → 5', 1, {'a': '3', 'n': '8'}, 'correct', ['5']),
    spec('V2 : 9 compté comme 3', 1, {'a': '3', 'n': '8'}, 'incorrect', ['7'],
         'Chaque $9$ vaut $3^2$ : le dénominateur est $3^4$.'),
    spec('V2 : facteur seul oublié', 1, {'a': '3', 'n': '8'}, 'incorrect', ['4'],
         'Le facteur $3$ écrit seul compte aussi : $3 = 3^1$.'),
    spec('V2 : 7 × 7^2 / (49 × 49) → -1', 1, {'a': '7', 'n': '2'}, 'correct', ['-1']),
    spec('V3 : (-5)^3 × 25 / (-5)^7 → -2', 2, {'a': '5', 'n': '3', 'm': '7'}, 'correct',
         ['-2']),
    spec('V3 : 25 compté comme -5', 2, {'a': '5', 'n': '3', 'm': '7'}, 'incorrect', ['-3'],
         'Tu as compté $25$ comme un seul facteur : $25 = \\left( -5 \\right)^2$.'),
    spec('V3 : 25 oublié', 2, {'a': '5', 'n': '3', 'm': '7'}, 'incorrect', ['-4'],
         'Tu as oublié $25$ : c’est une puissance cachée, $25 = \\left( -5 \\right)^2$.'),
    spec('V3 : exposant du dénominateur ajouté', 2, {'a': '5', 'n': '3', 'm': '7'}, 'incorrect',
         ['12'], MSG_SIGNE_DEN),
    spec('V4 : 3^-4 × 9 / 3^3 → -5', 3, {'a': '3', 'n': '4', 'm': '3'}, 'correct', ['-5']),
    spec('V4 : 2^-3 × 4 / 2^-5 → 4', 3, {'a': '2', 'n': '3', 'm': '-5'}, 'correct', ['4']),
    spec('V4 : 9 compté comme 3', 3, {'a': '3', 'n': '4', 'm': '3'}, 'incorrect', ['-6'],
         'Tu as compté $9$ comme un seul facteur : $9 = 3^2$.'),
    spec('V4 : 9 oublié', 3, {'a': '3', 'n': '4', 'm': '3'}, 'incorrect', ['-7'],
         'Tu as oublié $9$ : c’est une puissance cachée, $9 = 3^2$.'),
    spec('V4 : signe de l’exposant oublié', 3, {'a': '3', 'n': '4', 'm': '3'}, 'incorrect',
         ['3'], 'L’exposant $-4$ est négatif : garde son signe dans le calcul.'),
]

ecrire('n6-puissances-bases-cachees', modele(
    'Puissances : bases cachées',
    'Écrire sous la forme d’une puissance de a un quotient où une puissance de a est écrite en '
    'nombre (25 = 5², 49 = 7²) ; base positive ou négative, exposants relatifs (pièges : le '
    'nombre caché compté comme a ou oublié, exposant du dénominateur ajouté)',
    ['3'], 5, 60, {'constraints': {'brackets': 'off'}},
    [N6_V1, N6_V2, N6_V3, N6_V4], N6_SPECS))
