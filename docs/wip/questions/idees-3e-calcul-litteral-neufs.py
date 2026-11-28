"""Écrit les modèles neufs du chantier idees-3e-calcul-litteral dans
scripts/questions/idees-3e-calcul-litteral-neufs/.

Phase 0 validée par David le 2026-11-23 (« je suis tes recos » ; journal
docs/archive/wip/idees-3e-calcul-litteral/idees-3e-calcul-litteral-progress.md, § Phase 0 › Modèles neufs (3e)) : N1 à N6.
Q1 : pas de variation à deux lettres dans N1 ; Q2 : N2 sur le point 3-016.

Points prévus (rangement par migration, après la création en brouillon) :
N1 3-013, N2 3-016, N3 3-013, N4 3-058, N5 4-071 (grades 4 et 3), N6 3-016.

Ni theme, ni domain, ni subdomain, ni id : create-questions --publier écrit l'id.

Règles suivies (couvrir-un-niveau.md § 5) : erreurs prévues par case d'écriture ordinaire (de
vraies erreurs d'élèves, sans en inventer pour atteindre trois), chacune avec sa spec `incorrect`
qui nomme son message ; un coup de pouce par variation, qui ne donne jamais la réponse.

Choix d'écriture :
- Polynômes écrits par `{{eval:…}}` avec la variable x = 'x|x' (comme 2ab49a6f) : signes et
  coefficients 1 propres, sans `cleanCoefficients`.
- Forme réduite exigée = la contrainte `form` stricte par défaut (ADR 0013) : un développement
  non réduit est `bad_form`, l'ordre des termes est libre.
- Forme « carré » (N4) : `requiredForm` motif `(u*$x+v)^2` ; `(x+3)(x+3)` est accepté à ½
  (`acceptable`), la consigne demande un carré.
- Les specs sont calculées en Python à partir des mêmes formules que le modèle (`py`), pour
  éviter les fautes de recopie ; les erreurs prévues portent leur fonction Python.

Écarts à la fiche (dits dans le rapport) :
- N1 : coefficients de x de −5 à 5 (constantes de −9 à 9) : (−9x + 8)(7x − 6) − (9x + 5)(−8x + 3)
  est un calcul de force, pas de double distributivité.
- N4 v2 : b de 2 à 6, pgcd(a, b) = 1 (sinon 4(x + 2)² serait aussi juste, et refusé par le motif).
- N4 v3 : le signe du terme du milieu est écrit dans l'énoncé (sinon deux couples de réponses),
  la seconde case est le membre de droite entier, `(x + 3)²`.
- N6 : un tirage sur deux, le programme B est changé (t = 1) pour que la réponse « Non » existe ;
  sinon la case Oui / Non vaudrait toujours « Oui ».

Usage : python3 docs/wip/questions/idees-3e-calcul-litteral-neufs.py scripts/questions/idees-3e-calcul-litteral-neufs
"""
import json
import os
import re
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
ESPACES = {'constraints': {'spacesFromFourDigits': True}}
X = {'name': 'x', 'expression': 'x|x'}


# =============================================================================================
# Outils
# =============================================================================================

def spec(desc, vi, variables_, status, answers, message=None, violations=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = rw(message)
    if violations is not None:
        expected['constraintViolations'] = violations
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables_.items()},
            'expected': expected, 'answers': answers}


def modele(title, description, level, delay, variations, specs, grades=None, options=None):
    m = {'title': title, 'description': description, 'grades': grades or ['3'], 'level': level,
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


def case(attendue, erreurs=None, **reglages):
    c = {'expectedAnswer': attendue, **reglages}
    if erreurs:
        c['expectedErrors'] = erreurs
    return c


def variation(statement, variables, blanks, steps, hint, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': blanks, 'correction': {'steps': steps}, 'hint': hint}


def couleur(contenu):
    return PRIMAIRE + '{' + contenu + '}'


def choix(lignes, melanger=False):
    tete = [] if melanger else ['melanger: non']
    return '```choix\n' + '\n'.join(tete + ['- ' + l for l in lignes]) + '\n```'


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


def resoudre(texte, v):
    """Remplace les {{nom}} simples d'un message par leur valeur (pour les specs)."""
    return rw(re.sub(r'\{\{(\w+)\}\}', lambda mo: str(v[mo.group(1)]), texte))


# Le message est réécrit à la résolution (couvrir-un-niveau.md § 5) : la spec le nomme sous sa
# forme réécrite. Le modèle garde l'écriture lisible.
REECRITURES = [
    ('$(a-b)^2=a^2-2ab+b^2$', '$\\left( a - b \\right)^2 = a^2 - 2 a b + b^2$'),
    ('$(a+b)(a-b)=a^2-b^2$', '$\\left( a + b \\right) \\left( a - b \\right) = a^2 - b^2$'),
    ('$(x+a)(x-a)$', '$\\left( x + a \\right) \\left( x - a \\right)$'),
    ('$(a+b)^2$', '$\\left( a + b \\right)^2$'),
    ('$(a-b)^2$', '$\\left( a - b \\right)^2$'),
    ('$(x+a)^2$', '$\\left( x + a \\right)^2$'),
    ('$a^2+b^2$', '$a^2 + b^2$'),
    ('$a^2-b^2$', '$a^2 - b^2$'),
    ('$x^2+a^2$', '$x^2 + a^2$'),
    ('$x^2-a^2$', '$x^2 - a^2$'),
    ('$-2ab$', '$-2 a b$'),
    ('$2ab$', '$2 a b$'),
    ('$2x$', '$2 x$'),
]


def rw(texte):
    for avant, apres in REECRITURES:
        texte = texte.replace(avant, apres)
    return texte


def poly(c2, c1, c0, ordre=None):
    """Polynôme c2·x² + c1·x + c0 en LaTeX d'élève ; ordre = liste des degrés à écrire."""
    termes = {2: c2, 1: c1, 0: c0}
    morceaux = []
    for deg in (ordre or [2, 1, 0]):
        c = termes[deg]
        if c == 0:
            continue
        signe = '-' if c < 0 else '+'
        a = abs(c)
        if deg == 0:
            corps = str(a)
        else:
            corps = ('' if a == 1 else str(a)) + ('x^2' if deg == 2 else 'x')
        morceaux.append((signe, corps))
    if not morceaux:
        return '0'
    texte = ('-' if morceaux[0][0] == '-' else '') + morceaux[0][1]
    for signe, corps in morceaux[1:]:
        texte += signe + corps
    return texte


def lin(a, b):
    """ax + b en LaTeX."""
    return poly(0, a, b)


def specs_erreurs(vi, v, erreurs_py, desc):
    """Une spec `incorrect` par erreur prévue : (réponse LaTeX, message gabarit, nom)."""
    return [spec(desc + ' : ' + nom, vi, v, 'incorrect', [rep], resoudre(msg, v))
            for rep, msg, nom in erreurs_py]


def pas_seule(nombre_de_cases, i, reponse, autres):
    """Réponses d'une spec à plusieurs cases : `reponse` dans la case i, les autres justes."""
    r = list(autres)
    r[i] = reponse
    return r


# =============================================================================================
# N1 — 3-013 : développer et réduire une expression (double distributivité dans un calcul).
# Une case, forme réduite exigée. Coefficients de x de −5 à 5, constantes de −9 à 9, non nuls.
# =============================================================================================

CONSIGNE_REDUITE = ('Développe et réduis. Écris le résultat sous forme réduite : une expression '
                    'qu\'on peut encore réduire est refusée.')
COEF = '1..5;±'
CONST = '1..9;±'

# Messages communs
M_MOINS = ('Le signe « − » devant le produit change le signe de tous les termes du produit '
           'développé, pas seulement du premier.')
M_CROISES = ('Il manque le terme en $x$ : chaque terme de la première parenthèse multiplie chaque '
             'terme de la seconde, cela fait quatre produits.')
M_GAUCHE = ('La multiplication passe avant l\'addition et la soustraction : développe d\'abord le '
            'produit des deux parenthèses.')
M_MOINS_OUBLIE = 'Tu as ajouté le produit au lieu de le soustraire : regarde le signe devant lui.'


def p_n1v0(v):
    a, b, c, d, m, s = v['a'], v['b'], v['c'], v['d'], v['m'], v['s']
    return (s * a * c, s * (a * d + b * c), m + s * b * d)


N1_V0 = variation(
    CONSIGNE_REDUITE + '\n\n$${{m}}{{if:s==1|+|-}}({{eval:a*x+b}})({{eval:c*x+d}})$$\n\n$?$',
    [X, var('s', '1|-1'), var('m', CONST), var('a', COEF), var('b', CONST), var('c', COEF),
     var('d', CONST)],
    [case('{{eval:s*a*c*x^2+s*(a*d+b*c)*x+m+s*b*d}}', [
        erreur('{{eval:m+s*a*c*x^2+(a*d+b*c)*x+b*d}}', M_MOINS, 'Moins appliqué au seul premier terme'),
        erreur('{{eval:s*a*c*x^2+m+s*b*d}}', M_CROISES, 'Produits croisés oubliés'),
        erreur('{{eval:s*a*c*x^2+(m*c+s*(b*c+a*d))*x+(m+s*b)*d}}', M_GAUCHE,
               'Calcul de gauche à droite'),
    ])],
    [
        'On développe d\'abord le produit (double distributivité) :',
        '$$({{eval:a*x+b}})({{eval:c*x+d}}) = {{eval:a*c*x^2}}{{eval:a*d*x;+}}{{eval:b*c*x;+}}'
        '{{eval:b*d;+}} = {{eval:a*c*x^2+(a*d+b*c)*x+b*d}}$$',
        '{{if:s==1|On ajoute ce produit à ${{m}}$.|Le signe « − » devant le produit change le signe '
        'de chacun de ses termes.}}',
        '$${{m}}{{if:s==1|+|-}}\\left({{eval:a*c*x^2+(a*d+b*c)*x+b*d}}\\right) = '
        + couleur('{{solution}}') + '$$',
    ],
    'Développe d\'abord le produit entre parenthèses, puis ajoute ou soustrais ce produit.',
    ['a*d+b*c!=0', 'm+s*b*d!=0'],
)


def p_n1v1(v):
    a, b, c, d, k = v['a'], v['b'], v['c'], v['d'], v['k']
    return (k * a * c, k * (a * d + b * c), k * b * d)


N1_V1 = variation(
    CONSIGNE_REDUITE + '\n\n$${{k}}({{eval:a*x+b}})({{eval:c*x+d}})$$\n\n$?$',
    [X, var('k', '2..3;±'), var('a', COEF), var('b', CONST), var('c', COEF), var('d', CONST)],
    [case('{{eval:k*a*c*x^2+k*(a*d+b*c)*x+k*b*d}}', [
        erreur('{{eval:k^2*(a*c*x^2+(a*d+b*c)*x+b*d)}}',
               'Tu as multiplié les deux parenthèses par ${{k}}$ : le facteur ${{k}}$ ne compte '
               'qu\'une fois dans le produit.', 'Facteur appliqué aux deux parenthèses'),
        erreur('{{eval:k*a*c*x^2+k*b*d}}', M_CROISES, 'Produits croisés oubliés'),
        erreur('{{eval:k*a*c*x^2+(k*a*d+b*c)*x+b*d}}',
               'Tu n\'as multiplié par ${{k}}$ que le premier terme : ${{k}}$ multiplie tout le '
               'produit des deux parenthèses.', 'Facteur sur un seul terme'),
    ])],
    [
        'On développe d\'abord le produit des deux parenthèses :',
        '$$({{eval:a*x+b}})({{eval:c*x+d}}) = {{eval:a*c*x^2}}{{eval:a*d*x;+}}{{eval:b*c*x;+}}'
        '{{eval:b*d;+}} = {{eval:a*c*x^2+(a*d+b*c)*x+b*d}}$$',
        'Puis on multiplie chaque terme par ${{k}}$ :',
        '$${{k}}\\left({{eval:a*c*x^2+(a*d+b*c)*x+b*d}}\\right) = ' + couleur('{{solution}}') + '$$',
    ],
    'Développe d\'abord le produit des deux parenthèses, puis multiplie chaque terme par ${{k}}$.',
    ['a*d+b*c!=0'],
)


def p_n1v2(v):
    k, a, b, c, d, f, g = (v[n] for n in 'kabcdfg')
    return (-c * f, k * a - c * g - d * f, k * b - d * g)


N1_V2 = variation(
    CONSIGNE_REDUITE + '\n\n$${{k}}({{eval:a*x+b}})-({{eval:c*x+d}})({{eval:f*x+g}})$$\n\n$?$',
    [X, var('k', '2..9;±'), var('a', COEF), var('b', CONST), var('c', COEF), var('d', CONST),
     var('f', COEF), var('g', CONST)],
    [case('{{eval:-c*f*x^2+(k*a-c*g-d*f)*x+k*b-d*g}}', [
        erreur('{{eval:-c*f*x^2+(k*a+c*g+d*f)*x+k*b+d*g}}', M_MOINS,
               'Moins appliqué au seul premier terme'),
        erreur('{{eval:c*f*x^2+(k*a+c*g+d*f)*x+k*b+d*g}}', M_MOINS_OUBLIE, 'Moins oublié'),
        erreur('{{eval:-c*f*x^2+k*a*x+k*b-d*g}}', M_CROISES, 'Produits croisés oubliés'),
    ])],
    [
        'On développe chaque morceau. Distributivité simple :',
        '$${{k}}({{eval:a*x+b}}) = {{eval:k*a*x+k*b}}$$',
        'Double distributivité :',
        '$$({{eval:c*x+d}})({{eval:f*x+g}}) = {{eval:c*f*x^2}}{{eval:c*g*x;+}}{{eval:d*f*x;+}}'
        '{{eval:d*g;+}} = {{eval:c*f*x^2+(c*g+d*f)*x+d*g}}$$',
        'Le signe « − » devant le produit change le signe de chacun de ses termes :',
        '$${{eval:k*a*x+k*b}}-\\left({{eval:c*f*x^2+(c*g+d*f)*x+d*g}}\\right) = '
        + couleur('{{solution}}') + '$$',
    ],
    'Développe chaque morceau à part ; le signe « − » devant le produit change le signe de chacun '
    'de ses termes.',
    ['k*a-c*g-d*f!=0', 'k*b-d*g!=0', 'c*g+d*f!=0'],
)


def p_n1v3(v):
    a, b, c, d, f, g, h, j = (v[n] for n in 'abcdfghj')
    return (a * c - f * h, a * d + b * c - f * j - g * h, b * d - g * j)


N1_V3 = variation(
    CONSIGNE_REDUITE + '\n\n$$({{eval:a*x+b}})({{eval:c*x+d}})-({{eval:f*x+g}})({{eval:h*x+j}})$$'
    '\n\n$?$',
    [X, var('a', COEF), var('b', CONST), var('c', COEF), var('d', CONST), var('f', COEF),
     var('g', CONST), var('h', COEF), var('j', CONST)],
    [case('{{eval:(a*c-f*h)*x^2+(a*d+b*c-f*j-g*h)*x+b*d-g*j}}', [
        erreur('{{eval:(a*c-f*h)*x^2+(a*d+b*c+f*j+g*h)*x+b*d+g*j}}', M_MOINS,
               'Moins appliqué au seul premier terme'),
        erreur('{{eval:(a*c+f*h)*x^2+(a*d+b*c+f*j+g*h)*x+b*d+g*j}}', M_MOINS_OUBLIE,
               'Moins oublié'),
        erreur('{{eval:(a*c-f*h)*x^2+b*d-g*j}}', M_CROISES, 'Produits croisés oubliés'),
    ])],
    [
        'On développe chaque produit (double distributivité) :',
        '$$({{eval:a*x+b}})({{eval:c*x+d}}) = {{eval:a*c*x^2+(a*d+b*c)*x+b*d}}$$',
        '$$({{eval:f*x+g}})({{eval:h*x+j}}) = {{eval:f*h*x^2+(f*j+g*h)*x+g*j}}$$',
        'Le signe « − » devant le second produit change le signe de chacun de ses termes :',
        '$${{eval:a*c*x^2+(a*d+b*c)*x+b*d}}-\\left({{eval:f*h*x^2+(f*j+g*h)*x+g*j}}\\right) = '
        + couleur('{{solution}}') + '$$',
    ],
    'Développe d\'abord chaque produit, puis soustrais le second en faisant attention au signe '
    '« − ».',
    ['a*c!=f*h', 'a*d+b*c-f*j-g*h!=0', 'b*d!=g*j', 'f*j+g*h!=0', 'a*d+b*c!=0'],
)


def specs_n1():
    s = []
    # v0 : 5 − (2x + 3)(x − 4) = −2x² + 5x + 17
    v = {'s': -1, 'm': 5, 'a': 2, 'b': 3, 'c': 1, 'd': -4}
    c2, c1, c0 = p_n1v0(v)
    s += [
        spec('v0 : 5 − (2x + 3)(x − 4)', 0, v, 'correct', [poly(c2, c1, c0)]),
        spec('v0 : ordre libre', 0, v, 'correct', [poly(c2, c1, c0, [0, 1, 2])]),
        spec('v0 : non réduit', 0, v, 'bad_form', ['5-2x^2+5x+12'], violations=['form']),
    ]
    s += specs_erreurs(0, v, [
        (poly(-2, -5, -7), M_MOINS, 'moins au premier terme'),
        (poly(-2, 0, 17), M_CROISES, 'produits croisés'),
        (poly(-2, 10, -8), M_GAUCHE, 'gauche à droite'),
    ], 'v0')
    v = {'s': 1, 'm': -3, 'a': 1, 'b': 2, 'c': 3, 'd': -1}
    c2, c1, c0 = p_n1v0(v)
    s.append(spec('v0 : −3 + (x + 2)(3x − 1)', 0, v, 'correct', [poly(c2, c1, c0)]))
    # v1 : −2(x + 3)(2x − 5) = −4x² + 2x + 30
    v = {'k': -2, 'a': 1, 'b': 3, 'c': 2, 'd': -5}
    c2, c1, c0 = p_n1v1(v)
    m_k2 = ('Tu as multiplié les deux parenthèses par ${{k}}$ : le facteur ${{k}}$ ne compte '
            'qu\'une fois dans le produit.')
    m_k1 = ('Tu n\'as multiplié par ${{k}}$ que le premier terme : ${{k}}$ multiplie tout le '
            'produit des deux parenthèses.')
    s += [
        spec('v1 : −2(x + 3)(2x − 5)', 1, v, 'correct', [poly(c2, c1, c0)]),
        spec('v1 : ordre libre', 1, v, 'correct', [poly(c2, c1, c0, [0, 2, 1])]),
        spec('v1 : non réduit', 1, v, 'bad_form', ['-4x^2+10x-12x+30'], violations=['form']),
    ]
    s += specs_erreurs(1, v, [
        (poly(8, 4, -60), m_k2, 'facteur aux deux parenthèses'),
        (poly(-4, 0, 30), M_CROISES, 'produits croisés'),
        (poly(-4, 16, -15), m_k1, 'facteur sur un terme'),
    ], 'v1')
    # v2 : 3(2x − 1) − (x + 4)(x − 2) = −x² + 4x + 5
    v = {'k': 3, 'a': 2, 'b': -1, 'c': 1, 'd': 4, 'f': 1, 'g': -2}
    c2, c1, c0 = p_n1v2(v)
    s += [
        spec('v2 : 3(2x − 1) − (x + 4)(x − 2)', 2, v, 'correct', [poly(c2, c1, c0)]),
        spec('v2 : ordre libre', 2, v, 'correct', [poly(c2, c1, c0, [1, 0, 2])]),
        spec('v2 : non réduit', 2, v, 'bad_form', ['6x-3-x^2-2x+8'], violations=['form']),
    ]
    s += specs_erreurs(2, v, [
        (poly(-1, 8, -11), M_MOINS, 'moins au premier terme'),
        (poly(1, 8, -11), M_MOINS_OUBLIE, 'moins oublié'),
        (poly(-1, 6, 5), M_CROISES, 'produits croisés'),
    ], 'v2')
    # v3 : (2x + 1)(x − 3) − (x − 4)(x + 2) = x² − 3x + 5
    v = {'a': 2, 'b': 1, 'c': 1, 'd': -3, 'f': 1, 'g': -4, 'h': 1, 'j': 2}
    c2, c1, c0 = p_n1v3(v)
    s += [
        spec('v3 : (2x + 1)(x − 3) − (x − 4)(x + 2)', 3, v, 'correct', [poly(c2, c1, c0)]),
        spec('v3 : ordre libre', 3, v, 'correct', [poly(c2, c1, c0, [0, 1, 2])]),
        spec('v3 : non réduit', 3, v, 'bad_form', ['2x^2-5x-3-x^2+2x+8'], violations=['form']),
    ]
    s += specs_erreurs(3, v, [
        (poly(1, -7, -11), M_MOINS, 'moins au premier terme'),
        (poly(3, -7, -11), M_MOINS_OUBLIE, 'moins oublié'),
        (poly(1, 0, 5), M_CROISES, 'produits croisés'),
    ], 'v3')
    return s


N1 = modele(
    'Développer et réduire une expression',
    'Double distributivité dans un calcul, résultat sous forme réduite : 5 − (2x + 3)(x − 4), '
    '−2(x + 3)(2x − 5), 3(2x − 1) − (x + 4)(x − 2), (2x + 1)(x − 3) − (x − 4)(x + 2) (pièges : '
    'moins appliqué au seul premier terme, produits croisés oubliés, facteur appliqué aux deux '
    'parenthèses)',
    2, 120, [N1_V0, N1_V1, N1_V2, N1_V3], specs_n1())


# =============================================================================================
# N2 — 3-016 (Q2) : calculer astucieusement avec une identité remarquable. Case numérique.
# A = a × 10ⁿ ; v0 (A + b)², v1 (A − b)², v2 (A + b)(A − b).
# =============================================================================================

M_N2_DP = ('Tu as oublié le double produit : $(a+b)^2$ n\'est pas égal à $a^2+b^2$, il manque '
           '$2ab$.')
M_N2_2 = 'Dans le double produit $2ab$, n\'oublie pas le facteur $2$.'
M_N2_DOUBLE = ('Tu as calculé le double de ${{N}}$ : élever au carré, c\'est multiplier le nombre '
               'par lui-même.')
M_N2_MOINS_B2 = 'Dans $(a-b)^2=a^2-2ab+b^2$, le carré $b^2$ s\'ajoute : il ne se soustrait pas.'
M_N2_DP_MOINS = ('Tu as oublié le double produit : $(a-b)^2$ n\'est pas égal à $a^2-b^2$, il '
                 'manque $-2ab$.')
M_N2_2_MOINS = 'Dans le double produit $-2ab$, n\'oublie pas le facteur $2$.'
M_N2_PLUS = ('$(a+b)(a-b)=a^2-b^2$ : le carré de ${{b}}$ se soustrait.')
M_N2_SANS_B2 = 'Tu as oublié de soustraire le carré de ${{b}}$ : $(a+b)(a-b)=a^2-b^2$.'
M_N2_B = 'Dans $a^2-b^2$, c\'est le carré de ${{b}}$ qu\'on soustrait, pas ${{b}}$.'

VARS_N2 = [var('a', '1..5'), var('n', '2|3'), var('b', '1..4'), var('A', 'eval:a*10^n')]

N2_V0 = variation(
    'Sans calculatrice, calcule ${{N}}^2$ en écrivant ${{N}}={{A}}+{{b}}$.\n\n${{N}}^2=?$',
    VARS_N2 + [var('N', 'eval:A+b')],
    [case('{{eval:N^2}}', [
        erreur('{{eval:A^2+b^2}}', M_N2_DP, 'Double produit oublié'),
        erreur('{{eval:A^2+A*b+b^2}}', M_N2_2, 'Double produit sans le 2'),
        erreur('{{eval:2*N}}', M_N2_DOUBLE, 'Carré pris pour le double'),
    ])],
    [
        '**Carré d\'une somme** : $(a+b)^2=a^2+2ab+b^2$, avec $a={{A}}$ et $b={{b}}$.',
        '$${{N}}^2=({{A}}+{{b}})^2={{A}}^2+2\\times{{A}}\\times{{b}}+{{b}}^2'
        '={{eval:A^2}}+{{eval:2*A*b}}+{{eval:b^2}}=' + couleur('{{eval:N^2}}') + '$$',
    ],
    'Utilise l\'identité $(a+b)^2=a^2+2ab+b^2$ avec $a={{A}}$ et $b={{b}}$.',
)

N2_V1 = variation(
    'Sans calculatrice, calcule ${{N}}^2$ en écrivant ${{N}}={{A}}-{{b}}$.\n\n${{N}}^2=?$',
    VARS_N2 + [var('N', 'eval:A-b')],
    [case('{{eval:N^2}}', [
        erreur('{{eval:A^2-2*A*b-b^2}}', M_N2_MOINS_B2, 'b² soustrait'),
        erreur('{{eval:A^2-b^2}}', M_N2_DP_MOINS, 'Double produit oublié'),
        erreur('{{eval:A^2-A*b+b^2}}', M_N2_2_MOINS, 'Double produit sans le 2'),
    ])],
    [
        '**Carré d\'une différence** : $(a-b)^2=a^2-2ab+b^2$, avec $a={{A}}$ et $b={{b}}$.',
        '$${{N}}^2=({{A}}-{{b}})^2={{A}}^2-2\\times{{A}}\\times{{b}}+{{b}}^2'
        '={{eval:A^2}}-{{eval:2*A*b}}+{{eval:b^2}}=' + couleur('{{eval:N^2}}') + '$$',
    ],
    'Utilise l\'identité $(a-b)^2=a^2-2ab+b^2$ avec $a={{A}}$ et $b={{b}}$.',
)

N2_V2 = variation(
    'Sans calculatrice, calcule ${{P}}\\times{{M}}$ en écrivant ${{P}}={{A}}+{{b}}$ et '
    '${{M}}={{A}}-{{b}}$.\n\n${{P}}\\times{{M}}=?$',
    [var('a', '1..9'), var('n', '1|2'), var('b', '1..9'), var('A', 'eval:a*10^n'),
     var('P', 'eval:A+b'), var('M', 'eval:A-b')],
    [case('{{eval:A^2-b^2}}', [
        erreur('{{eval:A^2+b^2}}', M_N2_PLUS, 'b² ajouté'),
        erreur('{{eval:A^2}}', M_N2_SANS_B2, 'b² oublié'),
        erreur('{{eval:A^2-b}}', M_N2_B, 'b au lieu de b²'),
    ])],
    [
        '**Produit d\'une somme par une différence** : $(a+b)(a-b)=a^2-b^2$, avec $a={{A}}$ et '
        '$b={{b}}$.',
        '$${{P}}\\times{{M}}=({{A}}+{{b}})({{A}}-{{b}})={{A}}^2-{{b}}^2={{eval:A^2}}-{{eval:b^2}}='
        + couleur('{{eval:A^2-b^2}}') + '$$',
    ],
    'Utilise l\'identité $(a+b)(a-b)=a^2-b^2$ avec $a={{A}}$ et $b={{b}}$.',
    ['2*b<10^n', 'b>=2'],
)


def esp(n):
    """Nombre en LaTeX avec espaces dès 4 chiffres (1\\,003)."""
    t = str(n)
    neg = t.startswith('-')
    t = t.lstrip('-')
    groupes = []
    while len(t) > 3:
        groupes.insert(0, t[-3:])
        t = t[:-3]
    groupes.insert(0, t)
    return ('-' if neg else '') + ('\\,'.join(groupes) if len(str(abs(n))) >= 4 else str(abs(n)))


def specs_n2():
    s = []
    v = {'a': 1, 'n': 2, 'b': 3, 'A': 100, 'N': 103}
    s += [
        spec('v0 : 103² = 10 609', 0, v, 'correct', [esp(10609)]),
        spec('v0 : calcul laissé', 0, v, 'bad_form', ['10\\,000+600+9'], violations=['form']),
    ]
    s += specs_erreurs(0, v, [
        (esp(10009), M_N2_DP, 'double produit oublié'),
        (esp(10309), M_N2_2, 'sans le 2'),
        ('206', M_N2_DOUBLE, 'double'),
    ], 'v0')
    v = {'a': 1, 'n': 3, 'b': 3, 'A': 1000, 'N': 1003}
    s.append(spec('v0 : 1 003² = 1 006 009', 0, v, 'correct', [esp(1006009)]))
    v = {'a': 1, 'n': 2, 'b': 2, 'A': 100, 'N': 98}
    s += [spec('v1 : 98² = 9 604', 1, v, 'correct', [esp(9604)])]
    s += specs_erreurs(1, v, [
        (esp(9596), M_N2_MOINS_B2, 'b² soustrait'),
        (esp(9996), M_N2_DP_MOINS, 'double produit oublié'),
        (esp(9804), M_N2_2_MOINS, 'sans le 2'),
    ], 'v1')
    v = {'a': 3, 'n': 2, 'b': 2, 'A': 300, 'P': 302, 'M': 298}
    s += [spec('v2 : 302 × 298 = 89 996', 2, v, 'correct', [esp(89996)])]
    s += specs_erreurs(2, v, [
        (esp(90004), M_N2_PLUS, 'b² ajouté'),
        (esp(90000), M_N2_SANS_B2, 'b² oublié'),
        (esp(89998), M_N2_B, 'b au lieu de b²'),
    ], 'v2')
    v = {'a': 5, 'n': 1, 'b': 3, 'A': 50, 'P': 53, 'M': 47}
    s.append(spec('v2 : 53 × 47 = 2 491', 2, v, 'correct', [esp(2491)]))
    return s


N2 = modele(
    'Calculer astucieusement avec une identité remarquable',
    'Calcul mental avec les trois identités remarquables : 103² = (100 + 3)², 98² = (100 − 2)², '
    '302 × 298 = (300 + 2)(300 − 2) (pièges : double produit oublié, b² soustrait, b² ajouté '
    'au lieu d\'être soustrait)',
    1, 90, [N2_V0, N2_V1, N2_V2], specs_n2(), options=ESPACES)


# =============================================================================================
# N3 — 3-013 : développer avec un tableau. Tableau à trous (markdown, cases $?$) : en ligne ax
# et b, en colonne cx et d ; quatre produits, puis la forme réduite.
# v0 (x + b)(x + d), b, d de 2 à 9 ; v1 (ax ± b)(cx ± d), a, c de 2 à 9, b, d de ±2 à ±9.
# =============================================================================================

TABLEAU = ('Complète le tableau de multiplication, puis écris le développement sous forme '
           'réduite : une expression qu\'on peut encore réduire est refusée.\n\n'
           '| $\\times$ | ${{eval:c*x}}$ | ${{d}}$ |\n'
           '|---|---|---|\n'
           '| ${{eval:a*x}}$ | $?$ | $?$ |\n'
           '| ${{b}}$ | $?$ | $?$ |\n\n'
           '$({{eval:a*x+b}})({{eval:c*x+d}})=?$')

M_CARRE = ('${{eval:a*x}}\\times{{eval:c*x}}$ contient $x\\times x=x^2$ : n\'oublie pas le '
           'carré.')
M_ADD_X = 'Dans la case, il faut multiplier les deux termes, pas les additionner.'
M_SIGNE = ('Regarde le signe de chaque facteur : deux facteurs de même signe ont un produit '
           'positif, de signes contraires un produit négatif.')
M_SIGNE_BD = ('Regarde le signe de chaque facteur : deux nombres de même signe ont un produit '
              'positif, de signes contraires un produit négatif.')
M_X_OUBLIE = 'Tu as oublié la lettre $x$ : un nombre fois un terme en $x$ donne un terme en $x$.'
M_X_PLUS = 'Dans la case, il faut multiplier les deux termes, pas les additionner.'
M_RED_CROISES = ('Tu as oublié les deux cases du milieu : la somme des quatre cases donne le '
                 'développement.')
M_RED_X2 = ('Tu as additionné des termes en $x^2$ et des termes en $x$ : on ne peut réduire '
            'ensemble que les termes de même degré.')

ETAPES_N3 = [
    'Chaque case est le produit du terme de sa ligne par le terme de sa colonne :',
    '| $\\times$ | ${{eval:c*x}}$ | ${{d}}$ |\n'
    '|---|---|---|\n'
    '| ${{eval:a*x}}$ | ${{eval:a*c*x^2}}$ | ${{eval:a*d*x}}$ |\n'
    '| ${{b}}$ | ${{eval:b*c*x}}$ | ${{eval:b*d}}$ |',
    'On additionne les quatre cases, puis on réduit les termes en $x$ :',
    '$$({{eval:a*x+b}})({{eval:c*x+d}})={{eval:a*c*x^2}}{{eval:a*d*x;+}}{{eval:b*c*x;+}}'
    '{{eval:b*d;+}}=' + couleur('{{eval:a*c*x^2+(a*d+b*c)*x+b*d}}') + '$$',
]
HINT_N3 = ('Dans chaque case, multiplie le terme de sa ligne par le terme de sa colonne. Ensuite, '
           'additionne les quatre cases et regroupe les termes en $x$.')

CASE_REDUITE = case('{{eval:a*c*x^2+(a*d+b*c)*x+b*d}}', [
    erreur('{{eval:a*c*x^2+b*d}}', M_RED_CROISES, 'Produits croisés oubliés'),
    erreur('{{eval:(a*c+a*d+b*c)*x^2+b*d}}', M_RED_X2, 'x² et x additionnés'),
])

N3_V0 = variation(
    TABLEAU,
    [X, var('a', '1'), var('c', '1'), var('b', '2..9'), var('d', '2..9')],
    [
        case('{{eval:a*c*x^2}}', [
            erreur('{{eval:2*x}}', 'Tu as additionné : $x\\times x$ s\'écrit $x^2$, pas $2x$.',
                   'x × x = 2x'),
        ]),
        case('{{eval:a*d*x}}', [
            erreur('{{eval:a*d}}', M_X_OUBLIE, 'x oublié'),
            erreur('{{eval:a*x+d}}', M_X_PLUS, 'Addition au lieu du produit'),
        ]),
        case('{{eval:b*c*x}}', [
            erreur('{{eval:b*c}}', M_X_OUBLIE, 'x oublié'),
            erreur('{{eval:c*x+b}}', M_X_PLUS, 'Addition au lieu du produit'),
        ]),
        case('{{eval:b*d}}', [
            erreur('{{eval:b+d}}', M_X_PLUS, 'Addition au lieu du produit'),
        ]),
        CASE_REDUITE,
    ],
    ETAPES_N3, HINT_N3,
)

N3_V1 = variation(
    TABLEAU,
    [X, var('a', '2..9'), var('c', '2..9'), var('b', '2..9;±'), var('d', '2..9;±')],
    [
        case('{{eval:a*c*x^2}}', [
            erreur('{{eval:a*c*x}}', M_CARRE, 'Carré oublié'),
            erreur('{{eval:(a+c)*x^2}}', M_ADD_X, 'Coefficients additionnés'),
        ]),
        case('{{eval:a*d*x}}', [
            erreur('{{eval:-a*d*x}}', M_SIGNE, 'Signe du produit'),
            erreur('{{eval:a*d}}', M_X_OUBLIE, 'x oublié'),
        ]),
        case('{{eval:b*c*x}}', [
            erreur('{{eval:-b*c*x}}', M_SIGNE, 'Signe du produit'),
            erreur('{{eval:b*c}}', M_X_OUBLIE, 'x oublié'),
        ]),
        case('{{eval:b*d}}', [
            erreur('{{eval:-b*d}}', M_SIGNE_BD, 'Signe du produit'),
            erreur('{{eval:b+d}}', M_X_PLUS, 'Addition au lieu du produit'),
        ]),
        CASE_REDUITE,
    ],
    ETAPES_N3, HINT_N3,
    ['a*d+b*c!=0', 'a!=c || b!=d', 'b+d!=0', 'b+d!=b*d'],
)


def specs_n3():
    s = []
    # v0 : (x + 3)(x + 5)
    v = {'a': 1, 'c': 1, 'b': 3, 'd': 5}
    juste = ['x^2', '5x', '3x', '15', 'x^2+8x+15']
    s += [
        spec('v0 : (x + 3)(x + 5)', 0, v, 'correct', juste),
        spec('v0 : ordre libre', 0, v, 'correct', ['x^2', '5x', '3x', '15', '15+8x+x^2']),
        spec('v0 : non réduit', 0, v, 'bad_form', ['x^2', '5x', '3x', '15', 'x^2+5x+3x+15'],
             violations=['form']),
        spec('v0 : x × x = 2x', 0, v, 'incorrect', pas_seule(5, 0, '2x', juste),
             'Tu as additionné : $x\\times x$ s\'écrit $x^2$, pas $2x$.'),
        spec('v0 : x oublié', 0, v, 'incorrect', pas_seule(5, 1, '5', juste), M_X_OUBLIE),
        spec('v0 : x + 5', 0, v, 'incorrect', pas_seule(5, 1, 'x+5', juste), M_X_PLUS),
        spec('v0 : 3 + x', 0, v, 'incorrect', pas_seule(5, 2, 'x+3', juste), M_X_PLUS),
        spec('v0 : 3 + 5', 0, v, 'incorrect', pas_seule(5, 3, '8', juste), M_X_PLUS),
        spec('v0 : croisés oubliés', 0, v, 'incorrect', pas_seule(5, 4, 'x^2+15', juste),
             M_RED_CROISES),
        spec('v0 : x² et x additionnés', 0, v, 'incorrect', pas_seule(5, 4, '9x^2+15', juste),
             M_RED_X2),
    ]
    # v1 : (2x − 3)(5x + 4) = 10x² − 7x − 12
    v = {'a': 2, 'c': 5, 'b': -3, 'd': 4}
    juste = ['10x^2', '8x', '-15x', '-12', '10x^2-7x-12']
    m_carre = resoudre(M_CARRE.replace('{{eval:a*x}}', '2x').replace('{{eval:c*x}}', '5x'), v)
    s += [
        spec('v1 : (2x − 3)(5x + 4)', 1, v, 'correct', juste),
        spec('v1 : ordre libre', 1, v, 'correct',
             ['10x^2', '8x', '-15x', '-12', '-12-7x+10x^2']),
        spec('v1 : non réduit', 1, v, 'bad_form',
             ['10x^2', '8x', '-15x', '-12', '10x^2+8x-15x-12'], violations=['form']),
        spec('v1 : carré oublié', 1, v, 'incorrect', pas_seule(5, 0, '10x', juste), m_carre),
        spec('v1 : coefficients additionnés', 1, v, 'incorrect', pas_seule(5, 0, '7x^2', juste),
             M_ADD_X),
        spec('v1 : x oublié', 1, v, 'incorrect', pas_seule(5, 1, '8', juste), M_X_OUBLIE),
        spec('v1 : signe de −3 × 5x', 1, v, 'incorrect', pas_seule(5, 2, '15x', juste), M_SIGNE),
        spec('v1 : signe de −3 × 4', 1, v, 'incorrect', pas_seule(5, 3, '12', juste), M_SIGNE_BD),
        spec('v1 : −3 + 4', 1, v, 'incorrect', pas_seule(5, 3, '1', juste), M_X_PLUS),
        spec('v1 : croisés oubliés', 1, v, 'incorrect', pas_seule(5, 4, '10x^2-12', juste),
             M_RED_CROISES),
        spec('v1 : x² et x additionnés', 1, v, 'incorrect', pas_seule(5, 4, '3x^2-12', juste),
             M_RED_X2),
    ]
    # v1 : (3x − 2)(4x − 5) : signe de −2 × −5
    v = {'a': 3, 'c': 4, 'b': -2, 'd': -5}
    juste = ['12x^2', '-15x', '-8x', '10', '12x^2-23x+10']
    s += [
        spec('v1 : (3x − 2)(4x − 5)', 1, v, 'correct', juste),
        spec('v1 : signe de 3x × −5', 1, v, 'incorrect', pas_seule(5, 1, '15x', juste), M_SIGNE),
        spec('v1 : signe de −2 × −5', 1, v, 'incorrect', pas_seule(5, 3, '-10', juste),
             M_SIGNE_BD),
    ]
    return s


N3 = modele(
    'Développer avec un tableau',
    'Double distributivité dans un tableau de multiplication à compléter (quatre produits), puis '
    'le développement réduit : (x + 3)(x + 5), (2x − 3)(5x + 4) (pièges : x × x = 2x, carré '
    'oublié, signe d\'un produit, produits croisés oubliés)',
    1, 120, [N3_V0, N3_V1], specs_n3())


# =============================================================================================
# N4 — 3-058 : factoriser a² + 2ab + b² et a² − 2ab + b². Forme « carré » par requiredForm ;
# (x + 3)(x + 3) accepté à ½.
# =============================================================================================

FORME_CARRE = {'pattern': 'u^2', 'acceptable': 'u*v'}
CONSIGNE_CARRE = ('Factorise en écrivant le résultat sous la forme d\'un carré, comme $(x+1)^2$ : '
                  'une expression développée est refusée.')

M_N4_DIFF = ('Tu as factorisé comme $a^2-b^2$ : ici, il y a un terme en $x$, c\'est le carré '
             'd\'une somme ou d\'une différence.')
M_N4_2A = ('Tu as pris le coefficient du terme en $x$ : il vaut $2ab$, c\'est sa moitié qui va '
           'dans la parenthèse.')
M_N4_X2 = 'Dans la parenthèse, il faut la racine de $x^2$, c\'est-à-dire $x$.'
M_N4_SIGNE = 'Regarde le signe du terme en $x$ : il donne le signe dans la parenthèse.'
M_N4_RACINE = ('Il faut le nombre dont le carré est le coefficient de $x^2$ : prends la racine de '
               'ce coefficient.')


def n4_simple(signe):
    sg = '+' if signe > 0 else '-'
    if signe > 0:
        troisieme = erreur('(x^2+{{a}})^2', M_N4_X2, 'x² gardé dans la parenthèse')
    else:
        troisieme = erreur('(x+{{a}})^2', M_N4_SIGNE, 'Signe')
    return variation(
        CONSIGNE_CARRE + '\n\n$$x^2' + sg + '{{eval:2*a}}x+{{eval:a^2}}$$\n\n$?$',
        # a = 1 : x² + 2x + 1 serait l'exemple de la consigne
        [var('a', '2..9')],
        [case('(x' + sg + '{{a}})^2', [
            erreur('(x+{{a}})(x-{{a}})', M_N4_DIFF, 'Pris pour a² − b²'),
            erreur('(x' + sg + '{{eval:2*a}})^2', M_N4_2A, 'Coefficient de x au lieu de sa moitié'),
            troisieme,
        ], requiredForm=FORME_CARRE)],
        [
            '**Carré d\'une ' + ('somme' if signe > 0 else 'différence') + '** : $a^2' + sg
            + '2ab+b^2=(a' + sg + 'b)^2$.',
            '$x^2$ est le carré de $x$, ${{eval:a^2}}$ est le carré de ${{a}}$, et le terme du '
            'milieu vaut bien $2\\times x\\times {{a}}={{eval:2*a}}x$.',
            '$$x^2' + sg + '{{eval:2*a}}x+{{eval:a^2}}=' + couleur('(x' + sg + '{{a}})^2') + '$$',
        ],
        'Reconnais $a^2' + sg + '2ab+b^2$ : quel nombre a pour carré ${{eval:a^2}}$ ? Vérifie '
        'ensuite le terme du milieu.',
    )


N4_V0 = n4_simple(1)
N4_V1 = n4_simple(-1)

N4_V2 = variation(
    CONSIGNE_CARRE + '\n\n$${{eval:b^2*x^2+2*s*a*b*x+a^2}}$$\n\n$?$',
    [X, var('s', '1|-1'), var('b', '2..6'), var('a', '1..9')],
    [case('({{b}}x{{eval:s*a;+}})^2', [
        erreur('({{b}}x+{{a}})({{b}}x-{{a}})', M_N4_DIFF, 'Pris pour a² − b²'),
        erreur('({{eval:b^2}}x{{eval:s*a;+}})^2', M_N4_RACINE, 'Racine du coefficient oubliée'),
        erreur('({{b}}x{{eval:-s*a;+}})^2', M_N4_SIGNE, 'Signe'),
    ], requiredForm=FORME_CARRE)],
    [
        '{{if:s==1|**Carré d\'une somme** : $a^2+2ab+b^2=(a+b)^2$.|**Carré d\'une différence** : '
        '$a^2-2ab+b^2=(a-b)^2$.}}',
        '${{eval:b^2}}x^2=({{b}}x)^2$ et ${{eval:a^2}}={{a}}^2$ ; le terme du milieu vaut bien '
        '$2\\times {{b}}x\\times {{a}}={{eval:2*a*b}}x$.',
        '$${{eval:b^2*x^2+2*s*a*b*x+a^2}}=' + couleur('({{b}}x{{eval:s*a;+}})^2') + '$$',
    ],
    'Écris ${{eval:b^2}}x^2$ comme le carré d\'un terme, et ${{eval:a^2}}$ comme le carré d\'un '
    'nombre. Vérifie ensuite le terme du milieu.',
    ['gcd(a,b)==1'],
)

M_N4_MILIEU_2 = 'Le terme du milieu est le double produit $2ab$ : n\'oublie pas le facteur $2$.'
M_N4_MILIEU_X = 'Le terme du milieu est un terme en $x$ : n\'oublie pas la lettre.'
M_N4_A2 = ('Dans la parenthèse, il faut le nombre dont le carré est ${{eval:a^2}}$, pas '
           '${{eval:a^2}}$ lui-même.')

N4_V3 = variation(
    'Complète l\'égalité pour qu\'elle soit vraie pour tout nombre $x$ : écris le terme qui manque, '
    'puis le membre de droite sous la forme d\'un carré.\n\n'
    '$x^2{{if:s==1|+|-}}?+{{eval:a^2}}=?$',
    [X, var('s', '1|-1'), var('a', '2..9')],
    [
        case('{{eval:2*a*x}}', [
            erreur('{{eval:a*x}}', M_N4_MILIEU_2, 'Double produit sans le 2'),
            erreur('{{eval:2*a}}', M_N4_MILIEU_X, 'x oublié'),
        ]),
        case('(x{{eval:s*a;+}})^2', [
            erreur('(x{{eval:2*s*a;+}})^2', M_N4_2A, 'Coefficient de x au lieu de sa moitié'),
            erreur('(x{{eval:s*a^2;+}})^2', M_N4_A2, 'a² au lieu de a'),
            erreur('(x{{eval:-s*a;+}})^2', M_N4_SIGNE, 'Signe'),
        ], requiredForm=FORME_CARRE),
    ],
    [
        '${{eval:a^2}}$ est le carré de ${{a}}$ : on cherche le carré '
        'd\'une {{if:s==1|somme, $(x+{{a}})^2$|différence, $(x-{{a}})^2$}}.',
        'Le terme du milieu est le double produit : $2\\times x\\times {{a}}={{eval:2*a}}x$.',
        '$$x^2{{if:s==1|+|-}}' + couleur('{{eval:2*a}}x') + '+{{eval:a^2}}='
        + couleur('(x{{eval:s*a;+}})^2') + '$$',
    ],
    'Quel nombre a pour carré ${{eval:a^2}}$ ? Le terme du milieu est le double produit $2ab$.',
)


def specs_n4():
    s = []
    v = {'a': 3}
    s += [
        spec('v0 : x² + 6x + 9 = (x + 3)²', 0, v, 'correct', ['(x+3)^2']),
        spec('v0 : (3 + x)²', 0, v, 'correct', ['(3+x)^2']),
        spec('v0 : (x + 3)(x + 3) (½)', 0, v, 'unoptimal_form', ['(x+3)(x+3)'],
             violations=['form']),
        spec('v0 : développé', 0, v, 'bad_form', ['x^2+6x+9'], violations=['form']),
        spec('v0 : pris pour a² − b²', 0, v, 'incorrect', ['(x+3)(x-3)'], M_N4_DIFF),
        spec('v0 : (x + 6)²', 0, v, 'incorrect', ['(x+6)^2'], M_N4_2A),
        spec('v0 : (x² + 3)²', 0, v, 'incorrect', ['(x^2+3)^2'], M_N4_X2),
    ]
    v = {'a': 5}
    s += [
        spec('v1 : x² − 10x + 25 = (x − 5)²', 1, v, 'correct', ['(x-5)^2']),
        spec('v1 : (5 − x)²', 1, v, 'correct', ['(5-x)^2']),
        spec('v1 : développé', 1, v, 'bad_form', ['x^2-10x+25'], violations=['form']),
        spec('v1 : pris pour a² − b²', 1, v, 'incorrect', ['(x-5)(x+5)'], M_N4_DIFF),
        spec('v1 : (x − 10)²', 1, v, 'incorrect', ['(x-10)^2'], M_N4_2A),
        spec('v1 : signe', 1, v, 'incorrect', ['(x+5)^2'], M_N4_SIGNE),
    ]
    v = {'s': 1, 'b': 2, 'a': 3}
    s += [
        spec('v2 : 4x² + 12x + 9 = (2x + 3)²', 2, v, 'correct', ['(2x+3)^2']),
        spec('v2 : (3 + 2x)²', 2, v, 'correct', ['(3+2x)^2']),
        spec('v2 : développé', 2, v, 'bad_form', ['4x^2+12x+9'], violations=['form']),
        spec('v2 : pris pour a² − b²', 2, v, 'incorrect', ['(2x+3)(2x-3)'], M_N4_DIFF),
        spec('v2 : (4x + 3)²', 2, v, 'incorrect', ['(4x+3)^2'], M_N4_RACINE),
        spec('v2 : signe', 2, v, 'incorrect', ['(2x-3)^2'], M_N4_SIGNE),
    ]
    v = {'s': -1, 'b': 3, 'a': 4}
    s.append(spec('v2 : 9x² − 24x + 16 = (3x − 4)²', 2, v, 'correct', ['(3x-4)^2']))
    v = {'s': 1, 'a': 3}
    juste = ['6x', '(x+3)^2']
    s += [
        spec('v3 : x² + … + 9 = (x + 3)²', 3, v, 'correct', juste),
        spec('v3 : sans le 2', 3, v, 'incorrect', ['3x', '(x+3)^2'], M_N4_MILIEU_2),
        spec('v3 : x oublié', 3, v, 'incorrect', ['6', '(x+3)^2'], M_N4_MILIEU_X),
        spec('v3 : (x + 6)²', 3, v, 'incorrect', ['6x', '(x+6)^2'], M_N4_2A),
        spec('v3 : (x + 9)²', 3, v, 'incorrect', ['6x', '(x+9)^2'], resoudre(
            M_N4_A2.replace('{{eval:a^2}}', '9'), v)),
        spec('v3 : signe', 3, v, 'incorrect', ['6x', '(x-3)^2'], M_N4_SIGNE),
    ]
    v = {'s': -1, 'a': 7}
    s.append(spec('v3 : x² − … + 49 = (x − 7)²', 3, v, 'correct', ['14x', '(x-7)^2']))
    return s


N4 = modele(
    'Factoriser a² + 2ab + b² et a² − 2ab + b²',
    'Reconnaître le carré d\'une somme ou d\'une différence pour factoriser : x² + 6x + 9, '
    'x² − 10x + 25, 4x² + 12x + 9, puis une identité à trous x² + … + 9 = (…)² (pièges : '
    'factorisé comme a² − b², coefficient de x au lieu de sa moitié, signe)',
    2, 60, [N4_V0, N4_V1, N4_V2, N4_V3], specs_n4())


# =============================================================================================
# N5 — 4-071 (grades 4 et 3) : résoudre un problème par une équation, jusqu'au nombre.
# Contextes à nous, solutions entières.
# =============================================================================================

ETAPE_EQUATION = '**Mise en équation.** '

N5_V0 = variation(
    'Un père a ${{p}}$ ans et son fils ${{f}}$ ans. Dans combien d\'années le père aura-t-il '
    'exactement le double de l\'âge de son fils ?\n\nDans $?$ ans.',
    [var('f', '4..14'), var('k', '1..15'), var('p', 'eval:2*f+k')],
    [case('{{k}}', [
        erreur('{{eval:p-f}}',
               'Tu as calculé l\'écart d\'âge : il ne change pas avec les années. Écris l\'âge '
               'de chacun dans $x$ ans.', 'Écart d\'âge'),
        erreur('{{eval:p/2-f}}',
               'Dans $x$ ans, le père aussi aura vieilli : son âge sera ${{p}}+x$, pas ${{p}}$.',
               'Le père ne vieillit pas'),
    ])],
    [
        ETAPE_EQUATION + 'On appelle $x$ le nombre d\'années. Dans $x$ ans, le père aura '
        '${{p}}+x$ ans et le fils ${{f}}+x$ ans. Le père aura le double de l\'âge du fils :',
        '$$\\begin{align}{{p}}+x&=2({{f}}+x)\\\\{{p}}+x&={{eval:2*f}}+2x\\\\{{p}}-{{eval:2*f}}&=2x-x'
        '\\\\' + couleur('{{k}}') + '&=x\\end{align}$$',
        'Vérification : dans ${{k}}$ ans, le père aura ${{eval:p+k}}$ ans et le fils '
        '${{eval:f+k}}$ ans ; $2\\times{{eval:f+k}}={{eval:p+k}}$.',
    ],
    'Appelle $x$ le nombre d\'années cherché, puis écris l\'âge du père et celui du fils dans $x$ '
    'ans.',
    ['p-f>=20', 'p-f<=40', 'p<=50'],
)

N5_V1 = variation(
    'La somme de trois nombres entiers consécutifs est ${{S}}$. Quel est le plus petit de ces '
    'trois nombres ?\n\nLe plus petit est $?$.',
    [var('n', '8..80'), var('S', 'eval:3*n+3')],
    [case('{{n}}', [
        erreur('{{eval:n+1}}',
               '${{eval:n+1}}$ est le nombre du milieu : on demande le plus petit des trois.',
               'Le nombre du milieu'),
        erreur('{{eval:n+2}}',
               '${{eval:n+2}}$ est le plus grand des trois : on demande le plus petit.',
               'Le plus grand'),
    ])],
    [
        ETAPE_EQUATION + 'On appelle $x$ le plus petit nombre. Les deux suivants sont $x+1$ et '
        '$x+2$, et leur somme vaut ${{S}}$ :',
        '$$\\begin{align}x+(x+1)+(x+2)&={{S}}\\\\3x+3&={{S}}\\\\3x&={{eval:S-3}}\\\\x&='
        + couleur('{{n}}') + '\\end{align}$$',
        'Vérification : ${{n}}+{{eval:n+1}}+{{eval:n+2}}={{S}}$.',
    ],
    'Appelle $x$ le plus petit des trois nombres et écris les deux autres avec $x$.',
)

N5_V2 = variation(
    'Pendant un match de basket, Lina a réussi ${{T}}$ paniers, tous à $2$ points ou à $3$ '
    'points. Elle a marqué ${{P}}$ points en tout. Combien de paniers à $2$ points a-t-elle '
    'réussis ?\n\n$?$ paniers à $2$ points.',
    [var('T', '8..20'), var('d', '2..{{eval:T-2}}'), var('t', 'eval:T-d'), var('P', 'eval:2*d+3*t')],
    [case('{{d}}', [
        erreur('{{t}}', 'Tu as trouvé le nombre de paniers à $3$ points : on demande ceux à $2$ '
               'points.', 'Paniers à 3 points'),
    ])],
    [
        ETAPE_EQUATION + 'On appelle $x$ le nombre de paniers à $2$ points. Il y a alors '
        '${{T}}-x$ paniers à $3$ points, et le total des points vaut ${{P}}$ :',
        '$$\\begin{align}2x+3({{T}}-x)&={{P}}\\\\2x+{{eval:3*T}}-3x&={{P}}\\\\{{eval:3*T}}-{{P}}&=x'
        '\\\\' + couleur('{{d}}') + '&=x\\end{align}$$',
        'Vérification : ${{d}}$ paniers à $2$ points et ${{t}}$ à $3$ points, soit '
        '$2\\times{{d}}+3\\times{{t}}={{P}}$ points.',
    ],
    'Appelle $x$ le nombre de paniers à $2$ points : combien y a-t-il alors de paniers à $3$ '
    'points ?',
    ['d!=t'],
)

N5_V3 = variation(
    'Dans un parking, il y a ${{V}}$ véhicules : des deux-roues et des voitures (quatre roues). '
    'On compte ${{R}}$ roues en tout. Combien y a-t-il de deux-roues ?\n\n$?$ deux-roues.',
    [var('V', '12..40'), var('d', '3..{{eval:V-3}}'), var('q', 'eval:V-d'),
     var('R', 'eval:2*d+4*q')],
    [case('{{d}}', [
        erreur('{{q}}', 'Tu as trouvé le nombre de voitures : on demande le nombre de deux-roues.',
               'Les voitures'),
        erreur('{{eval:2*d}}', 'Tu as trouvé $2x$ : divise encore par $2$ pour trouver $x$.',
               'Division par 2 oubliée'),
    ])],
    [
        ETAPE_EQUATION + 'On appelle $x$ le nombre de deux-roues. Il y a alors ${{V}}-x$ voitures, '
        'et le nombre de roues vaut ${{R}}$ :',
        '$$\\begin{align}2x+4({{V}}-x)&={{R}}\\\\2x+{{eval:4*V}}-4x&={{R}}\\\\{{eval:4*V}}-{{R}}&=2x'
        '\\\\{{eval:2*d}}&=2x\\\\' + couleur('{{d}}') + '&=x\\end{align}$$',
        'Vérification : ${{d}}$ deux-roues et ${{q}}$ voitures, soit $2\\times{{d}}+4\\times{{q}}'
        '={{R}}$ roues.',
    ],
    'Appelle $x$ le nombre de deux-roues : combien y a-t-il alors de voitures, et combien de '
    'roues en tout ?',
    ['d!=q', 'd*2!=q'],
)

N5_V4 = variation(
    'Un triangle isocèle a un périmètre de ${{P}}~\\unit{cm}$. Sa base mesure ${{d}}~\\unit{cm}$ '
    'de plus que chacun des deux côtés égaux. Quelle est la longueur d\'un des côtés égaux ?\n\n'
    '$?~\\unit{cm}$',
    [var('c', '4..20'), var('d', '1..9'), var('P', 'eval:3*c+d')],
    [case('{{c}}', [
        erreur('{{eval:c+d}}', 'Tu as trouvé la longueur de la base : on demande celle d\'un des '
               'côtés égaux.', 'La base'),
        erreur('{{eval:(P-d)/2}}', 'Le triangle a deux côtés égaux et une base : le périmètre '
               'compte trois longueurs.', 'Un côté égal oublié'),
        erreur('{{eval:(P+d)/3}}', 'La base est plus longue que les côtés égaux : elle mesure '
               '$x+{{d}}$, pas $x-{{d}}$.', 'Base plus courte'),
    ])],
    [
        ETAPE_EQUATION + 'On appelle $x$ la longueur d\'un côté égal, en cm. La base mesure '
        '$x+{{d}}$, et le périmètre vaut ${{P}}$ :',
        '$$\\begin{align}x+x+(x+{{d}})&={{P}}\\\\3x+{{d}}&={{P}}\\\\3x&={{eval:P-d}}\\\\x&='
        + couleur('{{c}}') + '\\end{align}$$',
        'Vérification : ${{c}}+{{c}}+{{eval:c+d}}={{P}}$.',
    ],
    'Appelle $x$ la longueur d\'un côté égal : combien mesure alors la base ? Écris le périmètre '
    'avec $x$.',
    ['d<c'],
)

N5_V5 = variation(
    'Un rectangle a un périmètre de ${{P}}~\\unit{cm}$. Sa longueur mesure ${{d}}~\\unit{cm}$ de '
    'plus que sa largeur. Calcule son aire.\n\n$?~\\unit{cm^2}$',
    [var('l', '2..15'), var('d', '1..9'), var('P', 'eval:4*l+2*d'), var('L', 'eval:l+d')],
    [case('{{eval:l*L}}', [
        erreur('{{l}}', 'Tu as trouvé la largeur : il reste à calculer l\'aire, longueur fois '
               'largeur.', 'La largeur au lieu de l\'aire'),
        erreur('{{eval:((P-d)/2)*((P-d)/2+d)}}', 'Le périmètre compte deux largeurs et deux '
               'longueurs : $2x+2(x+{{d}})$.', 'Périmètre compté à moitié'),
    ])],
    [
        ETAPE_EQUATION + 'On appelle $x$ la largeur, en cm. La longueur mesure $x+{{d}}$ ; les '
        'côtés opposés sont égaux, donc le périmètre vaut :',
        '$$\\begin{align}2x+2(x+{{d}})&={{P}}\\\\4x+{{eval:2*d}}&={{P}}\\\\4x&={{eval:P-2*d}}\\\\x&={{l}}'
        '\\end{align}$$',
        'La largeur mesure ${{l}}~\\unit{cm}$, la longueur ${{L}}~\\unit{cm}$. Aire : '
        '${{l}}\\times{{L}}=' + couleur('{{eval:l*L}}') + '~\\unit{cm^2}$.',
    ],
    'Appelle $x$ la largeur : combien mesure la longueur ? Écris le périmètre avec $x$, trouve '
    '$x$, puis calcule l\'aire.',
    ['l*L<=300'],
)


def specs_n5():
    s = []
    v = {'f': 12, 'k': 16, 'p': 40}
    v = {'f': 12, 'k': 8, 'p': 32}
    s += [
        spec('v0 : père 32, fils 12 → 8 ans', 0, v, 'correct', ['8']),
        spec('v0 : écart d\'âge', 0, v, 'incorrect', ['20'],
             'Tu as calculé l\'écart d\'âge : il ne change pas avec les années. Écris l\'âge de '
             'chacun dans $x$ ans.'),
        spec('v0 : le père ne vieillit pas', 0, v, 'incorrect', ['4'],
             'Dans $x$ ans, le père aussi aura vieilli : son âge sera $32 + x$, pas $32$.'),
    ]
    v = {'n': 23, 'S': 72}
    s += [
        spec('v1 : somme 72 → 23', 1, v, 'correct', ['23']),
        spec('v1 : le milieu', 1, v, 'incorrect', ['24'],
             '$24$ est le nombre du milieu : on demande le plus petit des trois.'),
        spec('v1 : le plus grand', 1, v, 'incorrect', ['25'],
             '$25$ est le plus grand des trois : on demande le plus petit.'),
    ]
    v = {'T': 15, 'd': 9, 't': 6, 'P': 36}
    s += [
        spec('v2 : 15 paniers, 36 points → 9', 2, v, 'correct', ['9']),
        spec('v2 : paniers à 3 points', 2, v, 'incorrect', ['6'],
             'Tu as trouvé le nombre de paniers à $3$ points : on demande ceux à $2$ points.'),
    ]
    v = {'V': 25, 'd': 8, 'q': 17, 'R': 84}
    s += [
        spec('v3 : 25 véhicules, 84 roues → 8', 3, v, 'correct', ['8']),
        spec('v3 : les voitures', 3, v, 'incorrect', ['17'],
             'Tu as trouvé le nombre de voitures : on demande le nombre de deux-roues.'),
        spec('v3 : division par 2 oubliée', 3, v, 'incorrect', ['16'],
             'Tu as trouvé $2x$ : divise encore par $2$ pour trouver $x$.'),
    ]
    v = {'c': 11, 'd': 4, 'P': 37}
    s += [
        spec('v4 : périmètre 37, base + 4 → 11', 4, v, 'correct', ['11']),
        spec('v4 : la base', 4, v, 'incorrect', ['15'],
             'Tu as trouvé la longueur de la base : on demande celle d\'un des côtés égaux.'),
        spec('v4 : un côté oublié', 4, v, 'incorrect', ['16{,}5'],
             'Le triangle a deux côtés égaux et une base : le périmètre compte trois longueurs.'),
        spec('v4 : base plus courte', 4, v, 'incorrect', ['\\frac{41}{3}'],
             'La base est plus longue que les côtés égaux : elle mesure $x + 4$, pas $x - 4$.'),
    ]
    v = {'l': 7, 'd': 3, 'P': 34, 'L': 10}
    s += [
        spec('v5 : périmètre 34, longueur = largeur + 3 → 70', 5, v, 'correct', ['70']),
        spec('v5 : la largeur', 5, v, 'incorrect', ['7'],
             'Tu as trouvé la largeur : il reste à calculer l\'aire, longueur fois largeur.'),
        spec('v5 : périmètre à moitié', 5, v, 'incorrect', ['\\frac{1147}{4}'],
             'Le périmètre compte deux largeurs et deux longueurs : '
             '$2 x + 2 \\left( x + 3 \\right)$.'),
    ]
    return s


N5 = modele(
    'Résoudre un problème par une équation',
    'Mettre en équation et résoudre jusqu\'au nombre : âges (dans combien d\'années le double ?), '
    'trois entiers consécutifs, paniers à 2 et 3 points, deux-roues et voitures, triangle '
    'isocèle, aire d\'un rectangle (pièges : réponse à une autre question, écart d\'âge, une '
    'longueur oubliée dans le périmètre)',
    2, 180, [N5_V0, N5_V1, N5_V2, N5_V3, N5_V4, N5_V5], specs_n5(), grades=['4', '3'])


# =============================================================================================
# N6 — 3-016 : programmes de calcul équivalents. Trois cases : résultat de A pour x (forme
# réduite), de B, puis Oui / Non. Écart : t = 1 change le programme B (réponse « Non »).
# =============================================================================================

QUESTION_N6 = ('\n\nOn choisit $x$ comme nombre de départ. Écris le résultat de chaque programme '
               'sous forme réduite (une expression qu\'on peut encore réduire est refusée).\n\n'
               'Programme A : $?$\n\nProgramme B : $?$\n\nLes deux programmes donnent-ils '
               'toujours le même résultat ?\n\n' + choix(['Oui', 'Non']))
CONCLUSION_N6 = ('{{if:t==0|Les deux expressions sont égales : les deux programmes donnent '
                 'toujours le même résultat, $' + couleur('\\text{oui}') + '$.|Les deux '
                 'expressions ne sont pas égales : $' + couleur('\\text{non}') + '$, les deux '
                 'programmes ne donnent pas toujours le même résultat.}}')
HINT_N6 = ('Remplace « un nombre » par $x$ et écris chaque étape ; développe avec une identité '
           'remarquable, puis réduis.')

M_N6_DP = ('$(x+{{a}})^2$ n\'est pas égal à $x^2+{{eval:a^2}}$ : il manque le double produit.')
M_N6_MOINS_X2 = 'Tu as ajouté le carré du nombre de départ au lieu de le soustraire.'
M_N6_SANS_2 = 'Dans le double produit $2\\times x\\times{{a}}$, n\'oublie pas le facteur $2$.'

N6_V0 = variation(
    '**Programme A**\n\n- Choisir un nombre.\n- Lui ajouter ${{a}}$.\n- Élever le résultat au '
    'carré.\n- Soustraire le carré du nombre de départ.\n\n**Programme B**\n\n- Choisir un '
    'nombre.\n- Le multiplier par ${{m}}$.\n- Ajouter ${{eval:a^2}}$ au résultat.' + QUESTION_N6,
    [X, var('a', '2..9'), var('t', '0..1'), var('m', 'eval:(2-t)*a')],
    [
        case('{{eval:2*a*x+a^2}}', [
            erreur('{{eval:a^2}}', 'Tu as oublié le double produit : $(x+a)^2$ n\'est pas égal à '
                   '$x^2+a^2$.', 'Double produit oublié'),
            erreur('{{eval:2*x^2+2*a*x+a^2}}', M_N6_MOINS_X2, 'Carré ajouté au lieu de soustrait'),
            erreur('{{eval:a*x+a^2}}', M_N6_SANS_2, 'Double produit sans le 2'),
        ]),
        case('{{eval:m*x+a^2}}'),
        case('{{t}}'),
    ],
    [
        'Programme A : $(x+{{a}})^2-x^2=x^2+{{eval:2*a}}x+{{eval:a^2}}-x^2='
        + couleur('{{eval:2*a*x+a^2}}') + '$.',
        'Programme B : $' + couleur('{{eval:m*x+a^2}}') + '$.',
        CONCLUSION_N6,
    ],
    HINT_N6,
)

N6_V1 = variation(
    '**Programme A**\n\n- Choisir un nombre.\n- Calculer la somme de ce nombre et de ${{a}}$, '
    'puis la différence de ce nombre et de ${{a}}$.\n- Multiplier la somme par la différence.\n'
    '- {{if:t==0|Ajouter ${{eval:a^2}}$ au|Soustraire ${{eval:a^2}}$ du}} résultat.\n\n**Programme B**\n\n- Choisir '
    'un nombre.\n- L\'élever au carré.' + QUESTION_N6,
    [X, var('a', '2..9'), var('t', '0..1')],
    [
        case('{{eval:x^2-2*t*a^2}}', [
            erreur('{{eval:x^2+2*a^2-2*t*a^2}}', 'Le produit $(x+a)(x-a)$ vaut $x^2-a^2$ : le '
                   'carré de $a$ se soustrait.', 'Produit somme × différence : signe'),
            erreur('{{eval:x^2-a^2}}', 'Tu as oublié la dernière étape du programme.',
                   'Dernière étape oubliée'),
        ]),
        case('x^2', [
            erreur('{{eval:2*x}}', 'Élever au carré, c\'est multiplier le nombre par lui-même, '
                   'pas par $2$.', 'Carré pris pour le double'),
        ]),
        case('{{t}}'),
    ],
    [
        'Programme A : $(x+{{a}})(x-{{a}}){{if:t==0|+|-}}{{eval:a^2}}=x^2-{{eval:a^2}}'
        '{{if:t==0|+|-}}{{eval:a^2}}=' + couleur('{{eval:x^2-2*t*a^2}}') + '$.',
        'Programme B : $' + couleur('x^2') + '$.',
        CONCLUSION_N6,
    ],
    HINT_N6,
)

N6_V2 = variation(
    '**Programme A**\n\n- Choisir un nombre.\n- Lui ajouter ${{a}}$.\n- Élever le résultat au '
    'carré.\n- Soustraire ${{eval:a^2}}$.\n\n**Programme B**\n\n- Choisir un nombre.\n- Lui '
    'ajouter ${{m}}$.\n- Multiplier le résultat par le nombre de départ.' + QUESTION_N6,
    [X, var('a', '2..9'), var('t', '0..1'), var('m', 'eval:(2-t)*a')],
    [
        case('{{eval:x^2+2*a*x}}', [
            erreur('{{eval:x^2}}', 'Tu as oublié le double produit : $(x+a)^2$ n\'est pas égal à '
                   '$x^2+a^2$.', 'Double produit oublié'),
            erreur('{{eval:x^2+a*x}}', M_N6_SANS_2, 'Double produit sans le 2'),
        ]),
        case('{{eval:x^2+m*x}}', [
            erreur('{{eval:x+m*x}}', 'Le résultat entier, $x+{{m}}$, est multiplié par $x$ : '
                   'mets-le entre parenthèses.', 'Parenthèses oubliées'),
        ]),
        case('{{t}}'),
    ],
    [
        'Programme A : $(x+{{a}})^2-{{eval:a^2}}=x^2+{{eval:2*a}}x+{{eval:a^2}}-{{eval:a^2}}='
        + couleur('{{eval:x^2+2*a*x}}') + '$.',
        'Programme B : $(x+{{m}})\\times x=' + couleur('{{eval:x^2+m*x}}') + '$.',
        CONCLUSION_N6,
    ],
    HINT_N6,
)


def specs_n6():
    s = []
    v = {'a': 3, 't': 0, 'm': 6}
    s += [
        spec('v0 : équivalents', 0, v, 'correct', ['6x+9', '6x+9', '0']),
        spec('v0 : ordre libre', 0, v, 'correct', ['9+6x', '9+6x', '0']),
        spec('v0 : A non réduit', 0, v, 'bad_form', ['x^2+6x+9-x^2', '6x+9', '0'],
             violations=['form']),
        spec('v0 : réponse Non', 0, v, 'incorrect', ['6x+9', '6x+9', '1']),
        spec('v0 : double produit oublié', 0, v, 'incorrect', ['9', '6x+9', '0'],
             'Tu as oublié le double produit : $(x+a)^2$ n\'est pas égal à $x^2+a^2$.'),
        spec('v0 : carré ajouté', 0, v, 'incorrect', ['2x^2+6x+9', '6x+9', '0'], M_N6_MOINS_X2),
        spec('v0 : sans le 2', 0, v, 'incorrect', ['3x+9', '6x+9', '0'],
             resoudre(M_N6_SANS_2, v)),
    ]
    v = {'a': 3, 't': 1, 'm': 3}
    s.append(spec('v0 : non équivalents', 0, v, 'correct', ['6x+9', '3x+9', '1']))
    v = {'a': 4, 't': 0}
    s += [
        spec('v1 : équivalents', 1, v, 'correct', ['x^2', 'x^2', '0']),
        spec('v1 : signe', 1, v, 'incorrect', ['x^2+32', 'x^2', '0'],
             'Le produit $(x+a)(x-a)$ vaut $x^2-a^2$ : le carré de $a$ se soustrait.'),
        spec('v1 : dernière étape', 1, v, 'incorrect', ['x^2-16', 'x^2', '0'],
             'Tu as oublié la dernière étape du programme.'),
        spec('v1 : B en double', 1, v, 'incorrect', ['x^2', '2x', '0'],
             'Élever au carré, c\'est multiplier le nombre par lui-même, pas par $2$.'),
    ]
    v = {'a': 4, 't': 1}
    s.append(spec('v1 : non équivalents', 1, v, 'correct', ['x^2-32', 'x^2', '1']))
    v = {'a': 5, 't': 0, 'm': 10}
    s += [
        spec('v2 : équivalents', 2, v, 'correct', ['x^2+10x', 'x^2+10x', '0']),
        spec('v2 : B factorisé', 2, v, 'bad_form', ['x^2+10x', 'x(x+10)', '0'],
             violations=['form']),
        spec('v2 : double produit oublié', 2, v, 'incorrect', ['x^2', 'x^2+10x', '0'],
             'Tu as oublié le double produit : $(x+a)^2$ n\'est pas égal à $x^2+a^2$.'),
        spec('v2 : sans le 2', 2, v, 'incorrect', ['x^2+5x', 'x^2+10x', '0'],
             resoudre(M_N6_SANS_2, v)),
        spec('v2 : parenthèses oubliées', 2, v, 'incorrect', ['x^2+10x', '11x', '0'],
             'Le résultat entier, $x + 10$, est multiplié par $x$ : mets-le entre parenthèses.'),
    ]
    v = {'a': 5, 't': 1, 'm': 5}
    s.append(spec('v2 : non équivalents', 2, v, 'correct', ['x^2+10x', 'x^2+5x', '1']))
    return s


N6 = modele(
    'Programmes de calcul équivalents',
    'Exprimer deux programmes de calcul en fonction du nombre de départ x, sous forme réduite, '
    'puis dire s\'ils donnent toujours le même résultat : (x + a)² − x² et 2ax + a², '
    '(x + a)(x − a) + a² et x², (x + a)² − a² et x(x + 2a) (pièges : double produit oublié, '
    'signe de a² dans (x + a)(x − a))',
    2, 180, [N6_V0, N6_V1, N6_V2], specs_n6())


ecrire('n1-developper-et-reduire', N1)
ecrire('n2-calcul-astucieux-identites', N2)
ecrire('n3-developper-avec-un-tableau', N3)
ecrire('n4-factoriser-carre-somme-difference', N4)
ecrire('n5-probleme-par-une-equation', N5)
ecrire('n6-programmes-de-calcul-equivalents', N6)
print('6 modèles écrits dans', DOSSIER)
