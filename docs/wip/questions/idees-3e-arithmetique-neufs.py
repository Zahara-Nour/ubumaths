"""Écrit les modèles neufs du chantier idees-3e-arithmetique dans
scripts/questions/idees-3e-arithmetique-neufs/.

Phase 0 validée par David le 2026-11-23 (journal docs/archive/wip/idees-3e-arithmetique/idees-3e-arithmetique-progress.md) :
F3 (chiffre manquant), F4 (nombre premier), F5 (partage en lots), F6 (engrenages et évènements),
F7 (atteindre un multiple). Q1 : F4 à F7 hors programme de 3e, rangés SANS point ; Q2 : F3 sans
point (le point de 3e des critères de divisibilité manque au référentiel). On reprend l'idée de
l'autre plateforme, pas sa forme : cocher plutôt que taper une liste, donner un diviseur plutôt
qu'un Oui / Non.

F1 (décomposition en saisie libre) devait s'ajouter à 77ab770d ; elle est ici en modèle neuf,
point visé 3-010 : sa case demande `products: off` (sinon `2^3 × 3^2 × 5` est jugé « produit à
calculer » selon l'ordre des facteurs), et les options d'un modèle publié sont figées par la
migration de contenu.

Grades 3. Ni id, ni rangement : nœud et tag se poseront par migration, après la création en
brouillon.

Pièges :
- F1 : la case est jugée par la comparaison de forme ordinaire (`form: strict`, ADR 0013) :
  seule l'écriture de l'attendue est juste, à l'ordre des facteurs près. `8 × 45`,
  `2^3 × 9 × 5` et `2 × 2 × 2 × 3 × 3 × 5` sont `bad_form` (comme le brouillon 629c231b), d'où
  la consigne « avec des puissances ». Un exposant 1 s'écrit sans puissance. Une erreur prévue
  ne joue que sur la VALEUR : `4 × 15` reçoit le message de forme.
- Le corrigé ne sait pas décomposer un nombre quelconque : les nombres sont construits à partir
  de leurs facteurs premiers.
- Cases « choix » (F3, F4, F5 c) : pas d'erreurs prévues (réservées à l'écriture ordinaire) ;
  un bon choix oublié vaut ½ point (`unoptimal_form`).

Usage : python3 docs/wip/questions/idees-3e-arithmetique-neufs.py scripts/questions/idees-3e-arithmetique-neufs
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
SECOND = '\\textcolor{{{color:primary.1}}}'
ESPACES = {'constraints': {'spacesFromFourDigits': True}}


def spec(desc, vi, variables_, status, answers, message=None, violations=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = message
    if violations is not None:
        expected['constraintViolations'] = violations
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': expected, 'answers': answers}


def modele(title, description, level, delay, variations, specs, options=None):
    return {'title': title, 'description': description, 'grades': ['3'], 'level': level,
            'delay': delay, 'status': 'draft', 'options': options or ESPACES,
            'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def case(attendue, erreurs=None, **reglages):
    c = {'expectedAnswer': attendue, **reglages}
    if erreurs:
        c['expectedErrors'] = erreurs
    return c


def variation(statement, variables, blanks, steps, hint, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': blanks, 'correction': {'steps': steps}, 'hint': hint}


def couleur(contenu, c=PRIMAIRE):
    return c + '{' + contenu + '}'


def choix(lignes, plusieurs=False, melanger=False):
    tete = []
    if plusieurs:
        tete.append('plusieurs: oui')
    if not melanger:
        tete.append('melanger: non')
    return '```choix\n' + '\n'.join(tete + ['- ' + l for l in lignes]) + '\n```'


def selon(v, cas, defaut):
    """{{if:v==k1|t1|{{if:v==k2|t2|…defaut}}}} à partir d'une liste [(k, texte)]."""
    texte = defaut
    for k, t in reversed(cas):
        texte = '{{if:' + v + '==' + str(k) + '|' + t + '|' + texte + '}}'
    return texte


def puissance(base, exposant):
    """{{base}}^{{exposant}}, sans exposant quand il vaut 1 (variables nommées)."""
    return '{{if:' + exposant + '==1|{{' + base + '}}|{{' + base + '}}^{ {{' + exposant + '}} }}}'


def puissance_de(base, exposant):
    """base^{{exposant}} pour une base écrite en chiffres (2, 3)."""
    return '{{if:' + exposant + '==1|' + base + '|' + base + '^{ {{' + exposant + '}} }}}'


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


CHIFFRES = ['$' + str(i) + '$' for i in range(10)]


# =============================================================================================
# F1 — 3-010 : décomposer en facteurs premiers, saisie libre dans une case. Trois facteurs
# premiers f1 < f2 < f3, exposants e1, e2, e3 ; N = f1^e1 × f2^e2 × f3^e3.
# a) facteurs pris dans 2, 3, 5, 7 ; b) f3 de 11 à 19 (306 = 2 × 3² × 17, 572 = 2² × 11 × 13).
# =============================================================================================

DECOMP = (puissance('f1', 'e1') + '\\times ' + puissance('f2', 'e2') + '\\times '
          + puissance('f3', 'e3'))
N_F1 = 'eval:f1^e1*f2^e2*f3^e3'


def erreurs_f1():
    return [
        erreur('{{eval:N*f1}}',
               'Ton produit vaut ${{eval:N*f1}}$, pas ${{N}}$ : tu as compté le facteur ${{f1}}$ '
               'une fois de trop. Recompte combien de fois tu as divisé par ${{f1}}$.',
               'Un facteur de trop'),
        erreur('{{eval:N/f2}}',
               'Ton produit vaut ${{eval:N/f2}}$, pas ${{N}}$ : il manque un facteur ${{f2}}$. '
               'Recompte combien de fois tu as divisé par ${{f2}}$.',
               'Un facteur oublié'),
        erreur('{{eval:N/f3}}',
               'Ton produit vaut ${{eval:N/f3}}$, pas ${{N}}$ : il manque le dernier facteur, '
               '${{f3}}$. Multiplie tes facteurs pour vérifier.',
               'Dernier facteur oublié'),
    ]


def etapes_f1():
    return [
        '**Facteurs premiers.** On divise par ${{f1}}$ tant que c\'est possible, puis par les '
        'nombres premiers suivants : à la fin, il ne reste que des nombres premiers.',
        'On divise ${{e1}}$ fois par ${{f1}}$ : ${{N}} = ' + puissance('f1', 'e1')
        + '\\times {{eval:N/f1^e1}}$ ; puis ${{e2}}$ fois par ${{f2}}$ : ${{eval:N/f1^e1}} = '
        + puissance('f2', 'e2') + '\\times {{eval:f3^e3}}$ ; il reste ${{eval:f3^e3}}{{if:e3>1| = {{f3}}^{ {{e3}} }|}}$, '
        'et ${{f3}}$ est premier.',
        '$${{N}} = ' + couleur(DECOMP) + '$$',
    ]


CONSIGNE_F1 = ('Décompose ${{N}}$ en produit de facteurs premiers. Écris les facteurs répétés avec '
               'des puissances.\n\n$${{N}} = ?$$')
COUP_DE_POUCE_F1 = ('Divise ${{N}}$ par $2$ tant que c\'est possible, puis par $3$, par $5$, par '
                    '$7$… Un facteur qui revient s\'écrit avec une puissance.')

F1_A = variation(
    CONSIGNE_F1,
    [var('f1', '2|3|5'), var('f2', '3|5|7'), var('f3', '5|7'), var('e1', '1..3'),
     var('e2', '1..3'), var('e3', '1..2'), var('N', N_F1)],
    [case(DECOMP, erreurs_f1())],
    etapes_f1(),
    COUP_DE_POUCE_F1,
    ['f1<f2', 'f2<f3', 'N<=2500', 'e1+e2+e3>=4'],
)

F1_B = variation(
    CONSIGNE_F1,
    [var('f1', '2|3'), var('f2', '3|5|7|11|13'), var('f3', '11|13|17|19'), var('e1', '1..3'),
     var('e2', '1..2'), var('e3', '1'), var('N', N_F1)],
    [case(DECOMP, erreurs_f1())],
    etapes_f1(),
    COUP_DE_POUCE_F1,
    ['f1<f2', 'f2<f3', 'N<=2500', 'e1+e2>=3'],
)

V360 = {'f1': '2', 'f2': '3', 'f3': '5', 'e1': '3', 'e2': '2', 'e3': '1'}
V306 = {'f1': '2', 'f2': '3', 'f3': '17', 'e1': '1', 'e2': '2', 'e3': '1'}
V572 = {'f1': '2', 'f2': '11', 'f3': '13', 'e1': '2', 'e2': '1', 'e3': '1'}
SPECS_F1 = [
    spec('a : 360 = 2³ × 3² × 5', 0, V360, 'correct', ['2^3\\times3^2\\times5']),
    spec('a : ordre des facteurs libre', 0, V360, 'correct', ['5\\times3^2\\times2^3']),
    spec('a : avec \\cdot', 0, V360, 'correct', ['2^3\\cdot3^2\\cdot5']),
    spec('a : 8 × 45, pas des facteurs premiers', 0, V360, 'bad_form', ['8\\times45'],
         violations=['form']),
    spec('a : 9 n\'est pas premier', 0, V360, 'bad_form', ['2^3\\times9\\times5'],
         violations=['form']),
    spec('a : sans puissances', 0, V360, 'bad_form',
         ['2\\times2\\times2\\times3\\times3\\times5'], violations=['form']),
    spec('a : 360 recopié', 0, V360, 'bad_form', ['360'], violations=['form']),
    spec('a : un 2 de trop', 0, V360, 'incorrect', ['2^4\\times3^2\\times5'],
         'Ton produit vaut $720$, pas $360$ : tu as compté le facteur $2$ une fois de trop. '
         'Recompte combien de fois tu as divisé par $2$.'),
    spec('a : un 3 oublié', 0, V360, 'incorrect', ['2^3\\times3\\times5'],
         'Ton produit vaut $120$, pas $360$ : il manque un facteur $3$. Recompte combien de fois '
         'tu as divisé par $3$.'),
    spec('a : le 5 oublié', 0, V360, 'incorrect', ['2^3\\times3^2'],
         'Ton produit vaut $72$, pas $360$ : il manque le dernier facteur, $5$. Multiplie tes '
         'facteurs pour vérifier.'),
    spec('a : 1 500 = 2² × 3 × 5³', 0,
         {'f1': '2', 'f2': '3', 'f3': '5', 'e1': '2', 'e2': '1', 'e3': '3'}, 'correct',
         ['2^2\\times3\\times5^3']),
    spec('b : 306 = 2 × 3² × 17', 1, V306, 'correct', ['2\\times3^2\\times17']),
    spec('b : 51 n\'est pas premier', 1, V306, 'bad_form', ['2\\times3\\times51'],
         violations=['form']),
    spec('b : le 17 oublié', 1, V306, 'incorrect', ['2\\times3^2'],
         'Ton produit vaut $18$, pas $306$ : il manque le dernier facteur, $17$. Multiplie tes '
         'facteurs pour vérifier.'),
    spec('b : 572 = 2² × 11 × 13', 1, V572, 'correct', ['2^2\\times11\\times13']),
    spec('b : 572, 143 non décomposé', 1, V572, 'bad_form', ['2^2\\times143'],
         violations=['form']),
]

F1 = modele(
    'Décomposer un entier en facteurs premiers, sans aide',
    'Écrire la décomposition en facteurs premiers dans une seule case, avec des puissances : '
    '360 = 2³ × 3² × 5 ; 306 = 2 × 3² × 17 (pièges : facteur non premier, facteur compté une '
    'fois de trop ou oublié)',
    2, 90, [F1_A, F1_B], SPECS_F1,
    options={'constraints': {'products': 'off', 'spacesFromFourDigits': True}})


# =============================================================================================
# F3 — sans point (Q2) : chiffre manquant pour qu'un nombre soit divisible par 2, 3, 5, 9.
# Nombres de 4 chiffres, le chiffre caché noté □.
# =============================================================================================

CARRE = '\\square'
# a) par 9 : a b □ d, un seul chiffre convient (somme des chiffres connus non multiple de 9)
NOMBRE_9 = '{{a}}\\,{{b}}' + CARRE + '{{d}}'
F3_A = variation(
    'Quel chiffre faut-il écrire à la place de $' + CARRE + '$ pour que le nombre $' + NOMBRE_9
    + '$ soit divisible par $9$ ?\n\nLe chiffre manquant est $?$.',
    [var('a', '1..9'), var('b', '0..9'), var('d', '0..9'), var('S', 'eval:a+b+d'),
     var('x', 'eval:9-mod(S,9)')],
    [case('{{x}}', [
        erreur('{{eval:mod(S,9)}}',
               'Avec ${{eval:mod(S,9)}}$, la somme des chiffres vaut ${{eval:S+mod(S,9)}}$, qui '
               'n\'est pas un multiple de $9$ : il faut compléter ${{S}}$ jusqu\'au multiple de '
               '$9$ suivant.', 'Reste au lieu du complément'),
        erreur('{{eval:mod(x+3,9)}}',
               'Avec ce chiffre, la somme des chiffres vaut ${{eval:S+mod(x+3,9)}}$ : '
               'c\'est un multiple de $3$, mais pas de $9$. Le nombre serait divisible par $3$, '
               'pas par $9$.', 'Critère de 3 au lieu de 9'),
    ])],
    [
        '**Divisibilité par $9$.** Un nombre est divisible par $9$ si la somme de ses chiffres '
        'est divisible par $9$.',
        'Sans le chiffre manquant : ${{a}} + {{b}} + {{d}} = {{S}}$. Le multiple de $9$ suivant '
        'est ${{eval:S+x}}$ : il manque ${{eval:S+x}} - {{S}} = {{x}}$. Ajouter $9$ de plus '
        'donnerait ${{eval:x+9}}$, qui n\'est pas un chiffre.',
        '$$' + CARRE + ' = ' + couleur('{{x}}') + '$$',
    ],
    'Additionne les chiffres connus, puis cherche le multiple de $9$ qui suit.',
    # mod(S,9) = 6 : les deux erreurs prévues vaudraient 6 toutes les deux
    ['mod(S,9)!=0', 'mod(S,9)!=6'],
)

# b) par 3 : a et deux chiffres connus k1, k2, la place h du □ (1 = centaines, 3 = unités)
NOMBRE_3 = ('{{a}}\\,' + selon('h', [(1, CARRE + '{{k1}}{{k2}}'), (2, '{{k1}}' + CARRE + '{{k2}}')],
                               '{{k1}}{{k2}}' + CARRE))
REP_3 = '{{r}};{{eval:r+3}};{{eval:r+6}}{{if:r==0|;9|}}'
LISTE_3 = '${{r}}$, ${{eval:r+3}}$, ${{eval:r+6}}${{if:r==0|, $9$|}}'
F3_B = variation(
    'Quels chiffres peut-on écrire à la place de $' + CARRE + '$ pour que le nombre $' + NOMBRE_3
    + '$ soit divisible par $3$ ? Coche toutes les bonnes réponses.\n\n'
    + choix(CHIFFRES, plusieurs=True),
    [var('a', '1..9'), var('k1', '0..9'), var('k2', '0..9'), var('h', '1..3'),
     var('S', 'eval:a+k1+k2'), var('r', 'eval:mod(3-mod(S,3),3)')],
    [case(REP_3)],
    [
        '**Divisibilité par $3$.** Un nombre est divisible par $3$ si la somme de ses chiffres '
        'est divisible par $3$.',
        'Sans le chiffre manquant : ${{a}} + {{k1}} + {{k2}} = {{S}}$. Pour obtenir un multiple '
        'de $3$, on peut ajouter ' + LISTE_3 + '.',
        'Les chiffres qui conviennent : $' + couleur('{{r}}, {{eval:r+3}}, {{eval:r+6}}'
                                                     '{{if:r==0|, 9|}}') + '$.',
    ],
    'Additionne les chiffres connus. Quels chiffres, ajoutés à cette somme, donnent un multiple '
    'de $3$ ?',
)

# c) par 2 ou par 5 (k), chiffre des unités caché
NOMBRE_U = '{{a}}\\,{{b}}{{c}}' + CARRE
F3_C = variation(
    'Quels chiffres peut-on écrire à la place de $' + CARRE + '$ pour que le nombre $' + NOMBRE_U
    + '$ soit divisible par ${{k}}$ ? Coche toutes les bonnes réponses.\n\n'
    + choix(CHIFFRES, plusieurs=True),
    [var('k', '2|5'), var('a', '1..9'), var('b', '0..9'), var('c', '0..9')],
    [case('{{if:k==2|0;2;4;6;8|0;5}}')],
    [
        '{{if:k==2|**Divisibilité par $2$.** Un nombre est divisible par $2$ si son chiffre des '
        'unités est $0$, $2$, $4$, $6$ ou $8$.|**Divisibilité par $5$.** Un nombre est divisible '
        'par $5$ si son chiffre des unités est $0$ ou $5$.}}',
        'Le chiffre manquant est celui des unités : $' + couleur('{{if:k==2|0, 2, 4, 6, 8|0, 5}}')
        + '$. Les autres chiffres ne comptent pas.',
    ],
    'Pour la divisibilité par ${{k}}$, seul le chiffre des unités compte.',
)

# d) par 2 et par 3 à la fois, chiffre des unités caché
REP_6 = '{{if:r==0|0;6|{{if:r==1|4|2;8}}}}'
F3_D = variation(
    'Quels chiffres peut-on écrire à la place de $' + CARRE + '$ pour que le nombre $' + NOMBRE_U
    + '$ soit divisible à la fois par $2$ et par $3$ ? Coche toutes les bonnes réponses.\n\n'
    + choix(CHIFFRES, plusieurs=True),
    [var('a', '1..9'), var('b', '0..9'), var('c', '0..9'), var('S', 'eval:a+b+c'),
     var('r', 'eval:mod(3-mod(S,3),3)')],
    [case(REP_6)],
    [
        '**Par $3$** : la somme des chiffres connus vaut ${{a}} + {{b}} + {{c}} = {{S}}$ ; on peut '
        'ajouter ' + LISTE_3 + '.',
        '**Par $2$** : le chiffre des unités doit être pair.',
        'Les deux à la fois : $' + couleur('{{if:r==0|0, 6|{{if:r==1|4|2, 8}}}}') + '$.',
    ],
    'Cherche d\'abord les chiffres qui marchent pour $3$, puis garde ceux qui marchent aussi pour '
    '$2$.',
)

V9 = {'a': '1', 'b': '2', 'd': '4'}       # 12□4 : S = 7 → 2
V3 = {'a': '4', 'k1': '1', 'k2': '7', 'h': '2'}  # 41□7 : S = 12 → 0, 3, 6, 9
V3b = {'a': '2', 'k1': '5', 'k2': '0', 'h': '3'}  # 250□ : S = 7 → 2, 5, 8
V6 = {'a': '3', 'b': '5', 'c': '1'}       # 351□ : S = 9 → 0, 6
V6b = {'a': '2', 'b': '0', 'c': '6'}      # 206□ : S = 8 → 1, 4, 7 → 4
SPECS_F3 = [
    spec('a : 12□4 par 9 → 2', 0, V9, 'correct', ['2']),
    spec('a : reste au lieu du complément', 0, V9, 'incorrect', ['7'],
         'Avec $7$, la somme des chiffres vaut $14$, qui n\'est pas un multiple de $9$ : il faut '
         'compléter $7$ jusqu\'au multiple de $9$ suivant.'),
    spec('a : critère de 3', 0, V9, 'incorrect', ['5'],
         'Avec ce chiffre, la somme des chiffres vaut $12$ : c\'est un multiple de $3$, mais pas '
         'de $9$. Le nombre serait divisible par $3$, pas par $9$.'),
    spec('a : 5□38 par 9 → 2', 0, {'a': '5', 'b': '3', 'd': '8'}, 'correct', ['2']),
    spec('b : 41□7 par 3 → 0, 3, 6, 9', 1, V3, 'correct', ['0;3;6;9']),
    spec('b : 9 oublié (½)', 1, V3, 'unoptimal_form', ['0;3;6']),
    spec('b : 1 coché en trop', 1, V3, 'incorrect', ['0;1;3;6;9']),
    spec('b : 250□ par 3 → 2, 5, 8', 1, V3b, 'correct', ['2;5;8']),
    spec('c : 207□ par 2', 2, {'k': '2', 'a': '2', 'b': '0', 'c': '7'}, 'correct',
         ['0;2;4;6;8']),
    spec('c : par 2, le 7 du nombre coché', 2, {'k': '2', 'a': '2', 'b': '0', 'c': '7'},
         'incorrect', ['7']),
    spec('c : 207□ par 5', 2, {'k': '5', 'a': '2', 'b': '0', 'c': '7'}, 'correct', ['0;5']),
    spec('c : par 5, 0 oublié (½)', 2, {'k': '5', 'a': '2', 'b': '0', 'c': '7'}, 'unoptimal_form',
         ['5']),
    spec('d : 351□ par 2 et 3 → 0, 6', 3, V6, 'correct', ['0;6']),
    spec('d : par 3 seulement', 3, V6, 'incorrect', ['0;3;6;9']),
    spec('d : 206□ → 4', 3, V6b, 'correct', ['4']),
    spec('d : par 2 seulement', 3, V6b, 'incorrect', ['0;2;4;6;8']),
]

F3 = modele(
    'Trouver un chiffre pour que le nombre soit divisible',
    'Chiffre manquant d\'un nombre de 4 chiffres pour qu\'il soit divisible par 9 (une case), par '
    '3, par 2 ou 5, par 2 et 3 à la fois (cocher tous les chiffres qui conviennent) (pièges : '
    'reste au lieu du complément, critère de 3 au lieu de 9, un critère sur deux)',
    1, 45, [F3_A, F3_B, F3_C, F3_D], SPECS_F3)


# =============================================================================================
# F4 — sans point (Q1) : reconnaître un nombre premier. a) cocher les premiers ; b) donner un
# diviseur qui prouve qu'un nombre n'est pas premier ; c) choisir la bonne raison.
# =============================================================================================

DECOMP_PIEGES = {51: '3\\times 17', 57: '3\\times 19', 87: '3\\times 29', 91: '7\\times 13',
                 21: '3\\times 7', 27: '3\\times 9', 33: '3\\times 11', 39: '3\\times 13',
                 49: '7\\times 7', 63: '7\\times 9', 69: '3\\times 23', 77: '7\\times 11',
                 81: '9\\times 9', 93: '3\\times 31', 15: '3\\times 5', 25: '5\\times 5',
                 35: '5\\times 7', 45: '5\\times 9', 55: '5\\times 11', 65: '5\\times 13',
                 75: '5\\times 15', 85: '5\\times 17', 95: '5\\times 19'}


def piege(v, avec_un=False):
    """« $51 = 3 × 17$ » (ou « $1$, qui n'a qu'un seul diviseur ») selon la valeur de v."""
    cas = [(k, '${{' + v + '}} = ' + d + '$') for k, d in DECOMP_PIEGES.items()]
    if avec_un:
        cas = [(1, '$1$, qui n\'a qu\'un seul diviseur')] + cas
    return selon(v, cas, '${{' + v + '}}$')


F4_A = variation(
    'Coche tous les nombres premiers.\n\n'
    + choix(['${{p1}}$', '${{t1}}$', '${{p2}}$', '${{t2}}$', '${{if:z==1|{{p3}}|{{t3}}}}$'],
            plusieurs=True, melanger=True),
    [var('p1', '11|13|17|19|23|29|31|37|41|43|47'), var('t1', '1|51|57|87|91'),
     var('p2', '53|59|61|67|71|73|79|83|89|97'), var('t2', '21|27|33|39|49|63|69|77|81|93'),
     var('z', '0|1'), var('p3', '2|3|5|7'), var('t3', '15|25|35|45|55|65|75|85|95')],
    [case('0;2{{if:z==1|;4|}}')],
    [
        '**Nombre premier.** Un nombre entier est premier s\'il a exactement deux diviseurs : $1$ '
        'et lui-même. $1$ n\'est donc pas premier.',
        'Ne sont pas premiers : ' + piege('t1', avec_un=True) + ' ; ' + piege('t2')
        + '{{if:z==0| ; ' + piege('t3') + '|}}.',
        'Sont premiers : $' + couleur('{{p1}}') + '$, $' + couleur('{{p2}}') + '${{if:z==1|, $'
        + couleur('{{p3}}') + '$|}} : aucun nombre premier plus petit ne les divise.',
    ],
    'Pour chaque nombre, essaie de le diviser par $2$, $3$, $5$, $7$. N\'oublie pas que $1$ n\'a '
    'qu\'un seul diviseur.',
)

F4_B = variation(
    'Le nombre ${{N}}$ n\'est pas premier. Donne un diviseur de ${{N}}$, autre que $1$ et ${{N}}$, '
    'qui le prouve.\n\nUn diviseur de ${{N}}$ : $?$',
    [var('p', '2|3|5|7|11|13'), var('q', '{{p}}..199'), var('N', 'eval:p*q')],
    # Case jugée par ses règles seules : pas d'erreurs prévues (refusées par le générateur)
    [case('{{p}}', rulesSuffice=True, validationRules=[
        {'type': 'divisor', 'dividend': '{{N}}'},
        {'type': 'range', 'min': '1', 'max': '{{N}}', 'inclusive': False},
    ])],
    [
        'On essaie les nombres premiers dans l\'ordre : $2$, $3$, $5$, $7$, $11$, $13$…',
        '${{N}} = {{p}} \\times {{q}}$ : $' + couleur('{{p}}') + '$ et ${{q}}$ sont des diviseurs '
        'de ${{N}}$, autres que $1$ et ${{N}}$. ${{N}}$ n\'est donc pas premier.',
    ],
    'Essaie de diviser ${{N}}$ par $2$, $3$, $5$, $7$, $11$, $13$.',
    ['N>=100', 'N<=400'],
)

PREMIERS_101 = '101|103|107|109|113|127|131|137|139|149|151|157|163|167|173|179|181|191|193|197|199'
DIVISEUR_K = '{{if:k==1|7|{{if:k==2|11|13}}}}'
F4_C = variation(
    'Que peut-on dire du nombre ${{N}}$ ?\n\n'
    + choix(['${{N}}$ est premier.', '${{N}}$ est divisible par $7$.',
             '${{N}}$ est divisible par $11$.', '${{N}}$ est divisible par $13$.']),
    [var('k', '0..3'), var('n0', PREMIERS_101), var('n1', '119|133|161'), var('n2', '121|187'),
     var('N', '{{if:k==0|{{n0}}|{{if:k==1|{{n1}}|{{if:k==2|{{n2}}|169}}}}}}')],
    [case('{{k}}')],
    [
        'On essaie les nombres premiers dans l\'ordre : $2$, $3$, $5$, $7$, $11$, $13$. Inutile '
        'd\'aller plus loin : $17 \\times 17 = 289$ dépasse ${{N}}$.',
        '{{if:k==0|Aucun ne divise ${{N}}$ : $' + couleur('{{N}} \\text{ est premier}') + '$.|${{N}} = '
        + DIVISEUR_K + ' \\times {{eval:N/' + DIVISEUR_K + '}}$ : $' + couleur(
            '{{N}} \\text{ est divisible par } ' + DIVISEUR_K) + '$.}}',
    ],
    'Essaie de diviser ${{N}}$ par $7$, par $11$, par $13$.',
)

SPECS_F4 = [
    spec('a : 2 premiers (17, 89)', 0,
         {'p1': '17', 't1': '91', 'p2': '89', 't2': '57', 'z': '0', 'p3': '2', 't3': '85'},
         'correct', ['0;2']),
    spec('a : 91 coché', 0,
         {'p1': '17', 't1': '91', 'p2': '89', 't2': '57', 'z': '0', 'p3': '2', 't3': '85'},
         'incorrect', ['0;1;2']),
    spec('a : 89 oublié (½)', 0,
         {'p1': '17', 't1': '91', 'p2': '89', 't2': '57', 'z': '0', 'p3': '2', 't3': '85'},
         'unoptimal_form', ['0']),
    spec('a : 3 premiers, avec 2', 0,
         {'p1': '41', 't1': '1', 'p2': '53', 't2': '49', 'z': '1', 'p3': '2', 't3': '85'},
         'correct', ['0;2;4']),
    spec('a : 1 coché', 0,
         {'p1': '41', 't1': '1', 'p2': '53', 't2': '49', 'z': '1', 'p3': '2', 't3': '85'},
         'incorrect', ['0;1;2;4']),
    spec('b : 119 = 7 × 17, 7', 1, {'p': '7', 'q': '17'}, 'correct', ['7']),
    spec('b : 119, 17', 1, {'p': '7', 'q': '17'}, 'correct', ['17']),
    spec('b : 119, 1', 1, {'p': '7', 'q': '17'}, 'incorrect', ['1']),
    spec('b : 119, lui-même', 1, {'p': '7', 'q': '17'}, 'incorrect', ['119']),
    spec('b : 119, 3 ne divise pas', 1, {'p': '7', 'q': '17'}, 'incorrect', ['3']),
    spec('b : 342, 6 (pas premier mais diviseur)', 1, {'p': '2', 'q': '171'}, 'correct', ['6']),
    spec('c : 149 est premier', 2, {'k': '0', 'n0': '149'}, 'correct', ['0']),
    spec('c : 149 pris pour un multiple de 7', 2, {'k': '0', 'n0': '149'}, 'incorrect', ['1']),
    spec('c : 133 = 7 × 19', 2, {'k': '1', 'n1': '133'}, 'correct', ['1']),
    spec('c : 133 pris pour premier', 2, {'k': '1', 'n1': '133'}, 'incorrect', ['0']),
    spec('c : 187 = 11 × 17', 2, {'k': '2', 'n2': '187'}, 'correct', ['2']),
    spec('c : 169 = 13 × 13', 2, {'k': '3'}, 'correct', ['3']),
]

F4 = modele(
    'Reconnaître un nombre premier',
    'Cocher les nombres premiers d\'une liste (pièges : 1, 51, 57, 87, 91), donner un diviseur qui '
    'prouve qu\'un nombre de 100 à 400 n\'est pas premier, dire si un nombre de 101 à 199 est '
    'premier ou divisible par 7, 11 ou 13',
    1, 60, [F4_A, F4_B, F4_C], SPECS_F4)


# =============================================================================================
# F5 — sans point (Q1) : partage en lots identiques, comme au brevet. g = 2^x × 3^y,
# A = g × u, B = g × v, u et v premiers distincts de 5 à 13 : g lots de u et de v.
# c = contexte (0 fleuriste, 1 chocolatier, 2 professeur).
# =============================================================================================

CTX = [
    ('Un fleuriste a ${{A}}$ roses et ${{B}}$ tulipes.', 'bouquets', 'roses', 'tulipes',
     'toutes les fleurs'),
    ('Un chocolatier a ${{A}}$ chocolats noirs et ${{B}}$ chocolats au lait.', 'ballotins',
     'chocolats noirs', 'chocolats au lait', 'tous les chocolats'),
    ('Un professeur a ${{A}}$ crayons et ${{B}}$ gommes.', 'pochettes', 'crayons', 'gommes',
     'tous les crayons et toutes les gommes'),
]


def ctx(i):
    return selon('c', [(0, CTX[0][i]), (1, CTX[1][i])], CTX[2][i])


STOCK, LOTS, OBJ_A, OBJ_B, TOUT = ctx(0), ctx(1), ctx(2), ctx(3), ctx(4)
INTRO = (STOCK + ' Il veut faire le plus grand nombre possible de ' + LOTS + ' identiques, en '
         'utilisant ' + TOUT + '.')
VARS_F5 = [var('c', '0..2'), var('x', '1..2'), var('y', '1..2'), var('g', 'eval:2^x*3^y'),
           var('u', '5|7|11|13'), var('v', '5|7|11|13'), var('A', 'eval:g*u'),
           var('B', 'eval:g*v')]
COND_F5 = ['u!=v', 'A<=400', 'B<=400']
DEC_A = puissance_de('2', 'x') + '\\times ' + puissance_de('3', 'y') + '\\times {{u}}'
DEC_B = puissance_de('2', 'x') + '\\times ' + puissance_de('3', 'y') + '\\times {{v}}'
COMMUN = couleur(puissance_de('2', 'x') + '\\times ' + puissance_de('3', 'y'))
REPONSE_F5 = ('Il peut faire $?$ ' + LOTS + ', de $?$ ' + OBJ_A + ' et $?$ ' + OBJ_B
              + ' chacun.')

CASES_F5 = [
    case('{{g}}', [
        erreur('{{eval:g/2}}',
               'Avec ${{eval:g/2}}$ ' + LOTS + ', chacun aurait ${{eval:2*u}}$ ' + OBJ_A + ' et '
               '${{eval:2*v}}$ ' + OBJ_B + ' : on peut encore les partager en deux. Cherche le plus '
               'grand nombre de ' + LOTS + '.', 'Diviseur commun, pas le plus grand'),
        erreur('2',
               '$2$ ' + LOTS + ', c\'est possible, mais on demande le plus GRAND nombre de '
               + LOTS + '.', 'Plus petit diviseur commun'),
    ]),
    case('{{u}}', [
        erreur('{{v}}', 'Tu as échangé : ${{v}}$, ce sont les ' + OBJ_B + ' de chaque lot.',
               'Composition échangée'),
    ]),
    case('{{v}}', [
        erreur('{{u}}', 'Tu as échangé : ${{u}}$, ce sont les ' + OBJ_A + ' de chaque lot.',
               'Composition échangée'),
    ]),
]

ETAPES_F5 = [
    'Le nombre de ' + LOTS + ' doit diviser ${{A}}$ et ${{B}}$ : c\'est un diviseur commun, et on '
    'veut le plus grand.',
    '$${{A}} = ' + COMMUN + '\\times {{u}} \\quad\\text{et}\\quad {{B}} = ' + COMMUN
    + '\\times {{v}}$$',
    'Les facteurs communs donnent $' + puissance_de('2', 'x') + '\\times ' + puissance_de('3', 'y')
    + ' = ' + couleur('{{g}}') + '$ ' + LOTS + '. Chacun contient ${{A}} \\div {{g}} = '
    + couleur('{{u}}', SECOND) + '$ ' + OBJ_A + ' et ${{B}} \\div {{g}} = '
    + couleur('{{v}}', SECOND) + '$ ' + OBJ_B + '.',
]

F5_A = variation(
    INTRO + '\n\nOn donne : ${{A}} = ' + DEC_A + '$ et ${{B}} = ' + DEC_B + '$.\n\n' + REPONSE_F5,
    VARS_F5, CASES_F5, ETAPES_F5,
    'Repère les facteurs premiers qui sont dans les deux décompositions.',
    COND_F5,
)

F5_B = variation(
    INTRO + '\n\n' + REPONSE_F5,
    VARS_F5, CASES_F5, ETAPES_F5,
    'Décompose ${{A}}$ et ${{B}}$ en facteurs premiers, puis repère les facteurs communs.',
    COND_F5,
)

# c) « Peut-il faire N lots ? » : N = d (oui), d × v (ne divise pas A), d × u (ne divise pas B),
# avec d = g / s
N_F5 = '{{if:k==0|{{d}}|{{if:k==1|{{eval:d*v}}|{{eval:d*u}}}}}}'
F5_C = variation(
    STOCK + ' Il veut faire des ' + LOTS + ' identiques, en utilisant ' + TOUT + '.\n\nPeut-il '
    'faire exactement ${{N}}$ ' + LOTS + ' ?\n\n'
    + choix(['Oui.', 'Non, car ${{N}}$ ne divise pas ${{A}}$.',
             'Non, car ${{N}}$ ne divise pas ${{B}}$.']),
    VARS_F5 + [var('s', '2|3'), var('d', 'eval:g/s'), var('k', '0..2'), var('N', N_F5)],
    [case('{{k}}')],
    [
        'Faire ${{N}}$ ' + LOTS + ' identiques en utilisant tout, c\'est partager ${{A}}$ et '
        '${{B}}$ en ${{N}}$ parts égales : ${{N}}$ doit diviser ${{A}}$ ET ${{B}}$.',
        '{{if:k==0|${{A}} = {{N}} \\times {{eval:A/N}}$ et ${{B}} = {{N}} \\times {{eval:B/N}}$ : '
        + '**oui** : ${{N}}$ ' + LOTS + ' de ${{eval:A/N}}$ ' + OBJ_A + ' et ${{eval:B/N}}$ '
        + OBJ_B + '.|{{if:k==1|${{A}} = ({{N}} \\times {{eval:floor(A/N)}}) + {{eval:mod(A,N)}}$ : la '
        'division ne tombe pas juste, $' + couleur('{{N}} \\text{ ne divise pas } {{A}}') + '$.|'
        '${{B}} = ({{N}} \\times {{eval:floor(B/N)}}) + {{eval:mod(B,N)}}$ : la division ne tombe '
        'pas juste, $' + couleur('{{N}} \\text{ ne divise pas } {{B}}') + '$.}}}}',
    ],
    'Chaque lot doit avoir le même nombre de ' + OBJ_A + ' : ${{N}}$ doit diviser ${{A}}$. Et pour '
    'les ' + OBJ_B + ' ?',
    COND_F5,
)

V252 = {'c': '0', 'x': '2', 'y': '2', 'u': '7', 'v': '5'}  # 252 et 180 → 36 lots de 7 et 5
V84 = {'c': '1', 'x': '2', 'y': '1', 'u': '7', 'v': '5'}   # 84 et 60 → 12 lots de 7 et 5
SPECS_F5 = [
    spec('a : 252 et 180 → 36, 7, 5', 0, V252, 'correct', ['36', '7', '5']),
    spec('a : 18 lots seulement', 0, V252, 'incorrect', ['18', '14', '10'],
         'Avec $18$ bouquets, chacun aurait $14$ roses et $10$ tulipes : on peut encore les '
         'partager en deux. Cherche le plus grand nombre de bouquets.'),
    spec('a : 2 lots', 0, V252, 'incorrect', ['2', '7', '5'],
         '$2$ bouquets, c\'est possible, mais on demande le plus GRAND nombre de bouquets.'),
    spec('a : composition échangée', 0, V252, 'incorrect', ['36', '5', '7'],
         'Tu as échangé : $5$, ce sont les tulipes de chaque lot.'),
    spec('b : 84 et 60 → 12, 7, 5', 1, V84, 'correct', ['12', '7', '5']),
    spec('b : 6 lots', 1, V84, 'incorrect', ['6', '14', '10'],
         'Avec $6$ ballotins, chacun aurait $14$ chocolats noirs et $10$ chocolats au lait : on '
         'peut encore les partager en deux. Cherche le plus grand nombre de ballotins.'),
    spec('c : 84 et 60, 6 lots → oui', 2, {**V84, 's': '2', 'k': '0'}, 'correct', ['0']),
    spec('c : 84 et 60, 30 lots → ne divise pas 84', 2, {**V84, 's': '2', 'k': '1'}, 'correct',
         ['1']),
    spec('c : 30 lots, mauvaise raison', 2, {**V84, 's': '2', 'k': '1'}, 'incorrect', ['2']),
    spec('c : 84 et 60, 42 lots → ne divise pas 60', 2, {**V84, 's': '2', 'k': '2'}, 'correct',
         ['2']),
]

F5 = modele(
    'Problème de partage en lots identiques',
    'Comme au brevet : le plus grand nombre de lots identiques et leur composition, à partir des '
    'décompositions ou des nombres seuls (252 roses et 180 tulipes → 36 bouquets de 7 roses et 5 '
    'tulipes), et « peut-on faire N lots ? » (pièges : un diviseur commun qui n\'est pas le plus '
    'grand, composition échangée)',
    2, 120, [F5_A, F5_B, F5_C], SPECS_F5)


# =============================================================================================
# F6 — sans point (Q1) : évènements qui reviennent ensemble et engrenages. Périodes g × m et
# g × n, m et n premiers entre eux : premier retour commun g × m × n.
# =============================================================================================

VARS_GMN = [var('g', '2..15'), var('m', '2..9'), var('n', '2..9')]
COND_GMN = ['gcd(m,n)==1', 'm!=n']

INTRO_F6 = selon('c', [(0, 'Deux voitures télécommandées partent ensemble de la ligne de départ '
                           'd\'un circuit. La rouge fait un tour en ${{a}}$ secondes, la bleue en '
                           '${{b}}$ secondes.')],
                 'Deux bus partent ensemble du terminus. Le bus A fait sa boucle en ${{a}}$ '
                 'minutes, le bus B en ${{b}}$ minutes ; chacun repart aussitôt.')
UNITE_F6 = '{{if:c==0|secondes|minutes}}'
NOM_1 = '{{if:c==0|la rouge|le bus A}}'
NOM_2 = '{{if:c==0|la bleue|le bus B}}'

F6_A = variation(
    INTRO_F6 + '\n\nIls se retrouvent ensemble au départ, pour la première fois, au bout de $?$ '
    + UNITE_F6 + '.\n\nÀ ce moment, ' + NOM_1 + ' a fait $?$ tours et ' + NOM_2 + ' $?$ tours.',
    [var('c', '0..1')] + VARS_GMN + [var('a', 'eval:g*m'), var('b', 'eval:g*n'),
                                    var('L', 'eval:g*m*n')],
    [
        case('{{L}}', [
            erreur('{{eval:a*b}}',
                   '${{eval:a*b}}$ est bien un multiple de ${{a}}$ et de ${{b}}$, mais pas le '
                   'premier : cherche le plus petit multiple commun.', 'Produit des deux durées'),
            erreur('{{g}}',
                   'Tu as cherché un diviseur commun : ici, il faut une durée qui soit un multiple '
                   'de ${{a}}$ et de ${{b}}$.', 'Diviseur au lieu de multiple'),
        ]),
        case('{{n}}', [
            erreur('{{m}}', 'Tu as échangé : ' + NOM_1 + ' met moins de temps par tour, donc '
                   'fait plus de tours.', 'Tours échangés'),
        ]),
        case('{{m}}', [
            erreur('{{n}}', 'Tu as échangé : ' + NOM_2 + ' met plus de temps par tour, donc '
                   'fait moins de tours.', 'Tours échangés'),
        ]),
    ],
    [
        'Ils se retrouvent au départ au bout d\'une durée qui est un multiple de ${{a}}$ et de '
        '${{b}}$ : on cherche le plus petit multiple commun.',
        '${{a}} = {{g}} \\times {{m}}$ et ${{b}} = {{g}} \\times {{n}}$, et ${{m}}$ et ${{n}}$ '
        'n\'ont pas de diviseur commun : le plus petit multiple commun est ${{g}} \\times {{m}} '
        '\\times {{n}} = ' + couleur('{{L}}') + '$.',
        '${{L}} \\div {{a}} = ' + couleur('{{n}}', SECOND) + '$ tours pour ' + NOM_1 + ', ${{L}} '
        '\\div {{b}} = ' + couleur('{{m}}', SECOND) + '$ tours pour ' + NOM_2 + '.',
    ],
    'Écris les multiples de ${{b}}$ : quel est le premier qui est aussi un multiple de ${{a}}$ ?',
    COND_GMN + ['m<n', 'a>=12', 'b<=90'],
)

F6_B = variation(
    'Deux roues dentées s\'engrènent : la première a ${{d1}}$ dents, la seconde ${{d2}}$. On '
    'marque les deux dents qui se touchent. Combien de tours chaque roue doit-elle faire pour que '
    'les deux marques se retrouvent face à face, pour la première fois ?\n\n'
    'La première roue fait $?$ tours, la seconde $?$ tours.',
    VARS_GMN + [var('d1', 'eval:g*m'), var('d2', 'eval:g*n'), var('L', 'eval:g*m*n')],
    [
        case('{{n}}', [
            erreur('{{d2}}',
                   'Avec ${{d2}}$ tours, les marques se retrouvent bien, mais pas pour la première '
                   'fois : ${{d1}} \\times {{d2}}$ n\'est pas le plus petit multiple commun.',
                   'Produit des nombres de dents'),
            erreur('{{m}}', 'Tu as échangé : la roue qui a le moins de dents fait le plus de '
                   'tours.', 'Tours échangés'),
        ]),
        case('{{m}}', [
            erreur('{{d1}}',
                   'Avec ${{d1}}$ tours, les marques se retrouvent bien, mais pas pour la première '
                   'fois : ${{d1}} \\times {{d2}}$ n\'est pas le plus petit multiple commun.',
                   'Produit des nombres de dents'),
            erreur('{{n}}', 'Tu as échangé : la roue qui a le plus de dents fait le moins de '
                   'tours.', 'Tours échangés'),
        ]),
    ],
    [
        'À chaque instant, les deux roues ont fait passer le même nombre de dents. Les marques se '
        'retrouvent quand ce nombre est un multiple de ${{d1}}$ et de ${{d2}}$ : on cherche le '
        'plus petit.',
        '${{d1}} = {{g}} \\times {{m}}$ et ${{d2}} = {{g}} \\times {{n}}$ : le plus petit '
        'multiple commun est ${{g}} \\times {{m}} \\times {{n}} = {{L}}$ dents.',
        '${{L}} \\div {{d1}} = ' + couleur('{{n}}') + '$ tours pour la première, ${{L}} \\div '
        '{{d2}} = ' + couleur('{{m}}', SECOND) + '$ tours pour la seconde.',
    ],
    'Compte les dents qui passent : quel est le premier nombre qui est un multiple de ${{d1}}$ et '
    'de ${{d2}}$ ?',
    COND_GMN + ['d1>=8', 'd1<=25', 'd2>=8', 'd2<=25'],
)

F6_C = variation(
    'Deux roues dentées s\'engrènent. La première a ${{d1}}$ dents. Pendant qu\'elle fait ${{t1}}$ '
    'tours, la seconde en fait ${{t2}}$. Combien de dents a la seconde roue ?\n\n'
    'La seconde roue a $?$ dents.',
    [var('d1', '8..30'), var('t1', '2..9'), var('t2', '2..9'), var('D', 'eval:d1*t1'),
     var('d2', 'eval:D/t2')],
    [case('{{d2}}', [
        erreur('\\dfrac{ {{eval:d1*t2}} }{ {{t1}} }',
               'La roue qui fait le moins de tours a le plus de dents : regarde qui tourne le plus '
               'vite.', 'Rapport inversé'),
        erreur('{{D}}',
               '${{D}}$, c\'est le nombre de dents qui sont passées : la seconde roue les fait '
               'passer en ${{t2}}$ tours.', 'Dents passées'),
    ])],
    [
        'Les deux roues font passer le même nombre de dents : ${{d1}} \\times {{t1}} = {{D}}$ '
        'dents.',
        'La seconde fait passer ces ${{D}}$ dents en ${{t2}}$ tours : ${{D}} \\div {{t2}} = '
        + couleur('{{d2}}') + '$ dents.',
    ],
    'Combien de dents passent quand la première roue fait ${{t1}}$ tours ?',
    ['t1!=t2', 'mod(D,t2)==0', 'd2>=8', 'd2<=40', 'd2!=d1'],
)

V36 = {'c': '0', 'g': '6', 'm': '2', 'n': '3'}   # 12 s et 18 s → 36 s, 3 et 2 tours
SPECS_F6 = [
    spec('a : 12 s et 18 s → 36, 3, 2', 0, V36, 'correct', ['36', '3', '2']),
    spec('a : produit 216', 0, V36, 'incorrect', ['216', '18', '12'],
         '$216$ est bien un multiple de $12$ et de $18$, mais pas le premier : cherche le plus '
         'petit multiple commun.'),
    spec('a : diviseur commun 6', 0, V36, 'incorrect', ['6', '3', '2'],
         'Tu as cherché un diviseur commun : ici, il faut une durée qui soit un multiple de $12$ '
         'et de $18$.'),
    spec('a : tours échangés', 0, V36, 'incorrect', ['36', '2', '3'],
         'Tu as échangé : la rouge met moins de temps par tour, donc fait plus de tours.'),
    spec('a : bus 20 et 30 min → 60', 0, {'c': '1', 'g': '10', 'm': '2', 'n': '3'}, 'correct',
         ['60', '3', '2']),
    spec('b : 12 et 18 dents → 3 et 2 tours', 1, {'g': '6', 'm': '2', 'n': '3'}, 'correct',
         ['3', '2']),
    spec('b : produit des dents', 1, {'g': '6', 'm': '2', 'n': '3'}, 'incorrect', ['18', '12'],
         'Avec $18$ tours, les marques se retrouvent bien, mais pas pour la première fois : '
         '$12 \\times 18$ n\'est pas le plus petit multiple commun.'),
    spec('b : 15 et 25 dents → 5 et 3', 1, {'g': '5', 'm': '3', 'n': '5'}, 'correct', ['5', '3']),
    spec('c : 12 dents, 5 tours contre 4 → 15', 2, {'d1': '12', 't1': '5', 't2': '4'}, 'correct',
         ['15']),
    spec('c : rapport inversé', 2, {'d1': '12', 't1': '5', 't2': '4'}, 'incorrect', ['9{,}6'],
         'La roue qui fait le moins de tours a le plus de dents : regarde qui tourne le plus '
         'vite.'),
    spec('c : dents passées', 2, {'d1': '12', 't1': '5', 't2': '4'}, 'incorrect', ['60'],
         '$60$, c\'est le nombre de dents qui sont passées : la seconde roue les fait passer en '
         '$4$ tours.'),
]

F6 = modele(
    'Engrenages et évènements qui reviennent ensemble',
    'Plus petit multiple commun en situation : deux voitures ou deux bus qui se retrouvent au '
    'départ (durée et nombre de tours), deux roues dentées (tours pour que les marques se '
    'retrouvent, dents de l\'autre roue) (pièges : produit au lieu du plus petit multiple commun, '
    'diviseur au lieu de multiple, tours échangés)',
    2, 120, [F6_A, F6_B, F6_C], SPECS_F6)


# =============================================================================================
# F7 — sans point (Q1) : atteindre un multiple depuis l'égalité de la division euclidienne
# N = (d × q) + r, diviseur à deux chiffres, 1 ≤ r < d.
# =============================================================================================

VARS_F7 = [var('d', '11..99'), var('q', '8..120'), var('r', '1..{{eval:d-1}}'),
           var('N', 'eval:d*q+r')]
COND_F7 = ['N>=500', 'N<=2500', 'd!=2*r', 'r>=2', 'd-r>=2']
EGALITE = 'On sait que $${{N}} = ({{d}} \\times {{q}}) + {{r}}$$'

F7_A = variation(
    EGALITE + '\n\nQuel est le plus petit entier qu\'il faut ajouter à ${{N}}$ pour obtenir un '
    'multiple de ${{d}}$ ?\n\nIl faut ajouter $?$.',
    VARS_F7,
    [case('{{eval:d-r}}', [
        erreur('{{r}}',
               'En ajoutant ${{r}}$, on obtient ${{eval:N+r}}$ : le reste devient ${{eval:2*r}}$, '
               'pas $0$. Il faut compléter le reste ${{r}}$ jusqu\'à ${{d}}$.',
               'Le reste au lieu du complément'),
        erreur('{{d}}',
               'En ajoutant ${{d}}$, le reste ne change pas : il vaut toujours ${{r}}$. Il faut '
               'compléter le reste jusqu\'à ${{d}}$.', 'Le diviseur'),
        erreur('{{eval:N+d-r}}',
               '${{eval:N+d-r}}$ est bien le multiple de ${{d}}$ qu\'on atteint, mais on demande '
               'combien il faut ajouter.', 'Le multiple au lieu de l\'ajout'),
    ])],
    [
        '${{N}}$ contient ${{q}}$ fois ${{d}}$, et il reste ${{r}}$. Pour faire une fois de plus '
        '${{d}}$, il manque ${{d}} - {{r}} = ' + couleur('{{eval:d-r}}') + '$.',
        '$${{N}} + ' + couleur('{{eval:d-r}}') + ' = {{eval:N+d-r}} = {{d}} \\times {{eval:q+1}}$$',
    ],
    'Il reste ${{r}}$ : combien manque-t-il pour faire une fois de plus ${{d}}$ ?',
    COND_F7,
)

F7_B = variation(
    EGALITE + '\n\nQuel est le plus petit entier qu\'il faut soustraire à ${{N}}$ pour obtenir un '
    'multiple de ${{d}}$ ?\n\nIl faut soustraire $?$.',
    VARS_F7,
    [case('{{r}}', [
        erreur('{{eval:d-r}}',
               'En soustrayant ${{eval:d-r}}$, on obtient ${{eval:N-d+r}}$, qui n\'est pas un '
               'multiple de ${{d}}$. Ce qui dépasse le multiple, c\'est le reste.',
               'Le complément au lieu du reste'),
        erreur('{{eval:N-r}}',
               '${{eval:N-r}}$ est bien le multiple de ${{d}}$ qu\'on atteint, mais on demande '
               'combien il faut soustraire.', 'Le multiple au lieu du retrait'),
        erreur('{{q}}',
               '${{q}}$ est le quotient : il compte combien de fois ${{d}}$ tient dans ${{N}}$. '
               'Ce qui dépasse, c\'est le reste.', 'Le quotient'),
    ])],
    [
        '${{N}} = ({{d}} \\times {{q}}) + {{r}}$ : ${{N}}$ dépasse de ${{r}}$ le multiple ${{d}} '
        '\\times {{q}} = {{eval:d*q}}$.',
        '$${{N}} - ' + couleur('{{r}}') + ' = {{eval:N-r}} = {{d}} \\times {{q}}$$',
    ],
    'Dans l\'égalité, quel nombre dépasse le multiple ${{d}} \\times {{q}}$ ?',
    COND_F7 + ['q!=r', 'q!=d-r'],
)

V1000 = {'d': '23', 'q': '43', 'r': '11'}   # 1 000 = 23 × 43 + 11
SPECS_F7 = [
    spec('a : 1 000, ajouter 12', 0, V1000, 'correct', ['12']),
    spec('a : le reste', 0, V1000, 'incorrect', ['11'],
         'En ajoutant $11$, on obtient $1011$ : le reste devient $22$, pas $0$. Il faut compléter '
         'le reste $11$ jusqu\'à $23$.'),
    spec('a : le diviseur', 0, V1000, 'incorrect', ['23'],
         'En ajoutant $23$, le reste ne change pas : il vaut toujours $11$. Il faut compléter le '
         'reste jusqu\'à $23$.'),
    spec('a : le multiple', 0, V1000, 'incorrect', ['1\\,012'],
         '$1012$ est bien le multiple de $23$ qu\'on atteint, mais on demande combien il faut '
         'ajouter.'),
    spec('b : 1 000, soustraire 11', 1, V1000, 'correct', ['11']),
    spec('b : le complément', 1, V1000, 'incorrect', ['12'],
         'En soustrayant $12$, on obtient $988$, qui n\'est pas un multiple de $23$. Ce qui '
         'dépasse le multiple, c\'est le reste.'),
    spec('b : le multiple', 1, V1000, 'incorrect', ['989'],
         '$989$ est bien le multiple de $23$ qu\'on atteint, mais on demande combien il faut '
         'soustraire.'),
    spec('b : le quotient', 1, V1000, 'incorrect', ['43'],
         '$43$ est le quotient : il compte combien de fois $23$ tient dans $1000$. Ce qui dépasse, '
         'c\'est le reste.'),
]

F7 = modele(
    'Atteindre un multiple',
    'Depuis l\'égalité de la division euclidienne (1 000 = 23 × 43 + 11) : le plus petit entier à '
    'ajouter ou à soustraire pour obtenir un multiple du diviseur (pièges : reste et complément '
    'confondus, le diviseur, le multiple au lieu de l\'écart)',
    1, 60, [F7_A, F7_B], SPECS_F7)


ecrire('f01-decomposer-en-facteurs-premiers-sans-aide', F1)
ecrire('f03-chiffre-manquant-divisible', F3)
ecrire('f04-reconnaitre-un-nombre-premier', F4)
ecrire('f05-partage-en-lots-identiques', F5)
ecrire('f06-engrenages-evenements', F6)
ecrire('f07-atteindre-un-multiple', F7)
print('6 modèles écrits dans', DOSSIER)
