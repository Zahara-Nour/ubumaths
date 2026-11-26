"""Écrit les modèles neufs du chantier idees-tle-continuite-combinatoire dans
scripts/questions/idees-tle-continuite-combinatoire-neufs/.

Phase 0 validée par David le 2026-11-25 (« je valide » : toutes les fiches oui, Q1 oui ; fiches
docs/wip/idees-tle-continuite-combinatoire-fiches.md) :
- N1 fonction définie par morceaux, continuité en a (TSPE-425) ;
- N2 théorème des valeurs intermédiaires sur une équation donnée (TSPE-430) ;
- N4 limite de f(uₙ) quand uₙ converge et f est continue (TSPE-427, Q1 : oui) ;
- N5 probabilité par dénombrement (TSPE-319).

Grades T_SPE. Ni theme, ni domain, ni subdomain, ni id : le rangement (nœud du point + tag) se fera
par migration, après la création en brouillon (champ `rangement`, lu par migration-rangement.ts).

Bornes (docs/systeme/programmes/bornes/lycee/tspe.md) : le BO exclut de faire justifier la
continuité sur un intervalle ; N1 ne travaille que la continuité EN a, par les limites.

Règles suivies (couvrir-un-niveau.md § 5) : erreurs prévues par case (de vraies erreurs d'élèves,
sans en inventer pour atteindre trois ; aucune sur une case choix) ; une erreur qui tombe sur la
bonne réponse d'un tirage est ignorée par le moteur ; un coup de pouce par variation, qui ne donne
jamais la réponse. ⛔ Jamais de variable `e` (Euler).

Usage : python3 docs/wip/questions/idees-tle-continuite-combinatoire-neufs.py \
          scripts/questions/idees-tle-continuite-combinatoire-neufs
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'


def spec(desc, vi, variables_, status, answers, message=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = message
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': expected, 'answers': answers}


def modele(title, description, level, variations, specs, options=None):
    m = {'title': title, 'description': description, 'grades': ['T_SPE'], 'level': level,
         'delay': 60, 'status': 'draft', 'shared': {'cleanCoefficients': True}}
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


def coef(v):
    """Coefficient devant une lettre : 1 → rien, −1 → −."""
    return '{{if:' + v + '==1||{{if:' + v + '==-1|-|{{' + v + '}}}}}}'


def terme(v):
    """Terme constant signé après un terme : +3, −3, rien si 0."""
    return '{{if:' + v + '==0||{{if:' + v + '>0|+{{' + v + '}}|{{' + v + '}}}}}}'


def affine(p, q):
    """px + q, coefficients nettoyés."""
    return coef(p) + 'x' + terme(q)


def choix(*lignes):
    return '```choix\n' + '\n'.join('- ' + l for l in lignes) + '\n```'


RANGEMENT = {
    'n1-continuite-fonction-par-morceaux': ('Fonctions > Continuité > continuité en un point', 'TSPE-425'),
    'n2-tvi-equation-donnee': ('Fonctions > Continuité > valeurs intermédiaires', 'TSPE-430'),
    'n4-limite-f-de-un': ('Suites > Suites récurrentes > point fixe', 'TSPE-427'),
    'n5-probabilite-par-denombrement': ('Dénombrement > Problèmes de dénombrement', 'TSPE-319'),
}


def ecrire(nom, m):
    os.makedirs(DOSSIER, exist_ok=True)
    chemin = os.path.join(DOSSIER, nom + '.json')
    # Garder l'id écrit en tête par create-questions --publier, s'il existe
    if os.path.exists(chemin):
        with open(chemin, encoding='utf-8') as f:
            ancien = json.load(f)
        if 'id' in ancien:
            m = {'id': ancien['id'], **m}
    # Rangement (nœud + point) relevé en prod le 2026-11-25, lu par migration-rangement.ts
    noeud, point = RANGEMENT[nom]
    tete = {k: m[k] for k in ('id',) if k in m}
    m = {**tete, 'rangement': {'noeud': noeud, 'point': point},
         **{k: v for k, v in m.items() if k != 'id'}}
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write('\n')


def lim(a, cote):
    """Limite en a, à gauche (x < a) ou à droite (x > a), notation des modèles publiés."""
    return '\\displaystyle\\lim_{x\\to ' + a + ',\\ x' + cote + a + '}f(x)'


# =============================================================================================
# N1 — TSPE-425 : continuité en a d'une fonction définie par morceaux (idée TSA4-11).
# =============================================================================================

# v0 : affine | affine. L1 = valeur de la branche gauche en a, L2 = celle de la droite ;
# c = 0 : continue (L2 = L1), c = 1 : saut de d. s = 0 : a dans la branche gauche (x ⩽ a), s = 1 :
# a dans la branche droite (x ⩾ a).
N1_A = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par\n\n'
    '$$f(x)=\\begin{cases}' + affine('p1', 'q1') + ' & \\text{si } x{{if:s==0|\\leqslant|<}}{{a}}\\\\'
    + affine('p2', 'q2') + ' & \\text{si } x{{if:s==0|>|\\geqslant}}{{a}}\\end{cases}$$\n\n'
    'Calcule les deux limites de $f$ en ${{a}}$, puis $f({{a}})$.\n\n'
    '$' + lim('{{a}}', '<') + '=?$\n\n'
    '$' + lim('{{a}}', '>') + '=?$\n\n'
    '$f({{a}})=?$\n\n'
    'Que peut-on en conclure ?\n\n'
    + choix('$f$ est continue en ${{a}}$.',
            '$f$ n\'est pas continue en ${{a}}$.',
            'On ne peut pas conclure sans tracer la courbe de $f$.'),
    [var('a', '-2..2'), var('p1', '1..2;±'), var('p2', '1..2;±'), var('L1', '-3..3'),
     var('c', '0|1'), var('d', '1..3;±'), var('L2', '{{eval:L1+c*d}}'),
     var('q1', '{{eval:L1-p1*a}}'), var('q2', '{{eval:L2-p2*a}}'), var('s', '0|1'),
     var('fa', '{{eval:L1+s*(L2-L1)}}')],
    [case('{{L1}}', [
        erreur('{{L2}}', 'Pour $x<{{a}}$, c\'est la première expression qu\'il faut utiliser.',
               'Branche de droite utilisée'),
        erreur('{{q1}}', 'Remplace $x$ par ${{a}}$ dans $' + affine('p1', 'q1') + '$, pas par $0$.',
               'x remplacé par 0'),
    ]),
     case('{{L2}}', [
         erreur('{{L1}}', 'Pour $x>{{a}}$, c\'est la deuxième expression qu\'il faut utiliser.',
                'Branche de gauche utilisée'),
         erreur('{{q2}}', 'Remplace $x$ par ${{a}}$ dans $' + affine('p2', 'q2') + '$, pas par $0$.',
                'x remplacé par 0'),
     ]),
     case('{{fa}}', [
         erreur('{{eval:L2-s*(L2-L1)}}', 'Regarde la ligne où l\'inégalité est large : c\'est elle '
                'qui contient $x={{a}}$.', 'Mauvaise branche pour f(a)'),
     ]),
     case('{{c}}')],
    [
        'Pour $x<{{a}}$, $f(x)=' + affine('p1', 'q1') + '$ : une fonction affine est continue, donc '
        '$' + lim('{{a}}', '<') + '={{p1}}\\times({{a}})' + terme('q1') + '={{L1}}$.',
        'Pour $x>{{a}}$, $f(x)=' + affine('p2', 'q2') + '$, donc $' + lim('{{a}}', '>')
        + '={{p2}}\\times({{a}})' + terme('q2') + '={{L2}}$.',
        '$x={{a}}$ relève de la {{if:s==0|première|deuxième}} ligne : $f({{a}})={{fa}}$.',
        '{{if:c==0|Les deux limites sont égales à $f({{a}})$ : $' + PRIMAIRE
        + '{f\\text{ est continue en }{{a}}}$.|Les deux limites sont différentes : $' + PRIMAIRE
        + '{f\\text{ n\'est pas continue en }{{a}}}$ (sa courbe fait un saut).}}',
    ],
    'Pour chaque limite, utilise l\'expression valable de ce côté de ${{a}}$ ; pour $f({{a}})$, '
    'cherche la ligne dont l\'inégalité contient l\'égalité.',
    ['p1 != p2'],
)

# v1 : x² + m si x ⩽ a, px + q si x > a. Continue en a ⇔ a² + m = pa + q.
N1_B = variation(
    'Soit $m$ un réel et $f$ la fonction définie sur $\\mathbb{R}$ par\n\n'
    '$$f(x)=\\begin{cases}x^2+m & \\text{si } x\\leqslant {{a}}\\\\' + affine('p', 'q')
    + ' & \\text{si } x>{{a}}\\end{cases}$$\n\n'
    'Détermine la valeur de $m$ pour laquelle $f$ est continue en ${{a}}$.\n\n$m=?$',
    [var('a', '1..2;±'), var('p', '1..3;±'), var('q', '1..4;±')],
    [case('{{eval:p*a+q-a^2}}', [
        erreur('{{eval:p*a+q+a^2}}', 'On veut ${{eval:a^2}}+m={{eval:p*a+q}}$ : on retire '
               '${{eval:a^2}}$ des deux côtés.', 'Signe de a²'),
        erreur('{{eval:p*a+q}}', 'En $x={{a}}$, la première expression vaut $({{a}})^2+m$, pas '
               '$m$.', 'Carré oublié'),
        erreur('{{eval:q-a^2}}', 'La limite à droite est ${{p}}\\times({{a}})'
               + terme('q') + '$ : n\'oublie pas le terme en $x$.', 'Terme en x oublié'),
    ])],
    [
        '$f$ est continue en ${{a}}$ si $\\displaystyle\\lim_{x\\to {{a}},\\ x>{{a}}}f(x)=f({{a}})$ '
        '(à gauche, $f(x)=x^2+m$ est continue et vaut $f({{a}})$ en ${{a}}$).',
        '$f({{a}})=({{a}})^2+m={{eval:a^2}}+m$ et $\\displaystyle\\lim_{x\\to {{a}},\\ x>{{a}}}f(x)='
        '{{p}}\\times({{a}})' + terme('q') + '={{eval:p*a+q}}$.',
        '${{eval:a^2}}+m={{eval:p*a+q}}\\iff m=' + PRIMAIRE + '{ {{eval:p*a+q-a^2}} }$.',
    ],
    'Écris que la limite à droite en ${{a}}$ est égale à $f({{a}})$, puis résous l\'équation '
    'en $m$.',
)

# v2 : e^(kx) + m si x < 0, x² + px + c si x ⩾ 0. Continue en 0 ⇔ 1 + m = c.
N1_C = variation(
    'Soit $m$ un réel et $f$ la fonction définie sur $\\mathbb{R}$ par\n\n'
    '$$f(x)=\\begin{cases}\\mathrm{e}^{' + coef('k') + 'x}+m & \\text{si } x<0\\\\x^2'
    + '{{if:p>0|+}}' + coef('p') + 'x' + terme('c') + ' & \\text{si } x\\geqslant 0\\end{cases}$$\n\n'
    'Détermine la valeur de $m$ pour laquelle $f$ est continue en $0$.\n\n$m=?$',
    [var('k', '1..3;±'), var('p', '1..4;±'), var('c', '-5..5')],
    [case('{{eval:c-1}}', [
        erreur('{{c}}', '$\\mathrm{e}^0=1$, pas $0$.', 'e⁰ = 0'),
        erreur('{{eval:c+1}}', 'On veut $1+m={{c}}$ : on retire $1$ des deux côtés.',
               'Signe'),
        erreur('{{eval:1-c}}', 'On veut $1+m={{c}}$, donc $m={{c}}-1$ : l\'ordre de la '
               'soustraction compte.', 'Soustraction à l\'envers'),
    ])],
    [
        '$f(0)=0^2+{{p;()}}\\times 0' + terme('c') + '={{c}}$.',
        'À gauche, $x\\mapsto \\mathrm{e}^{' + coef('k') + 'x}+m$ est continue, donc '
        '$\\displaystyle\\lim_{x\\to 0,\\ x<0}f(x)=\\mathrm{e}^{0}+m=1+m$.',
        '$f$ est continue en $0$ si $1+m={{c}}$, soit $m=' + PRIMAIRE + '{ {{eval:c-1}} }$.',
    ],
    'Calcule $f(0)$ et la limite de $f$ en $0$ par la gauche ; que vaut $\\mathrm{e}^0$ ?',
    ['c != 1'],
)

V_N1A = {'a': '1', 'p1': '2', 'p2': '-1', 'L1': '3', 'c': '1', 'd': '-2', 's': '0'}
# L2 = 1, q1 = 1, q2 = 2, f(1) = 3 (x ⩽ 1)
V_N1A_C = {'a': '-1', 'p1': '1', 'p2': '2', 'L1': '2', 'c': '0', 'd': '1', 's': '1'}
# L2 = 2, q1 = 3, q2 = 4, f(−1) = 2 : continue
SPECS_N1 = [
    spec('N1 a : saut, x ⩽ 1', 0, V_N1A, 'correct', ['3', '1', '3', '1']),
    spec('N1 a : branche de droite pour la limite à gauche', 0, V_N1A, 'incorrect',
         ['1', '1', '3', '1'], 'Pour $x < 1$, c\'est la première expression qu\'il faut utiliser.'),
    spec('N1 a : branche de gauche pour la limite à droite', 0, V_N1A, 'incorrect',
         ['3', '3', '3', '1'], 'Pour $x > 1$, c\'est la deuxième expression qu\'il faut utiliser.'),
    spec('N1 a : x remplacé par 0 à droite', 0, V_N1A, 'incorrect', ['3', '2', '3', '1'],
         'Remplace $x$ par $1$ dans $-x + 2$, pas par $0$.'),
    spec('N1 a : f(a) pris du côté exclu', 0, V_N1A, 'incorrect', ['3', '1', '1', '1'],
         'Regarde la ligne où l\'inégalité est large : c\'est elle qui contient $x = 1$.'),
    spec('N1 a : continue alors qu\'il y a un saut', 0, V_N1A, 'incorrect', ['3', '1', '3', '0']),
    spec('N1 a : on ne peut pas conclure', 0, V_N1A, 'incorrect', ['3', '1', '3', '2']),
    spec('N1 a : continue, x ⩾ −1', 0, V_N1A_C, 'correct', ['2', '2', '2', '0']),
    spec('N1 a : pas continue alors que tout est égal', 0, V_N1A_C, 'incorrect',
         ['2', '2', '2', '1']),
    spec('N1 b : a = 2, p = 3, q = −1 → m = 1', 1, {'a': '2', 'p': '3', 'q': '-1'}, 'correct', ['1']),
    spec('N1 b : signe de a²', 1, {'a': '2', 'p': '3', 'q': '-1'}, 'incorrect', ['9'],
         'On veut $4 + m = 5$ : on retire $4$ des deux côtés.'),
    spec('N1 b : carré oublié', 1, {'a': '2', 'p': '3', 'q': '-1'}, 'incorrect', ['5'],
         'En $x = 2$, la première expression vaut $2^2 + m$, pas $m$.'),
    spec('N1 b : terme en x oublié', 1, {'a': '2', 'p': '3', 'q': '-1'}, 'incorrect', ['-5']),
    spec('N1 b : a = −1, p = −2, q = 3 → m = 4', 1, {'a': '-1', 'p': '-2', 'q': '3'}, 'correct',
         ['4']),
    spec('N1 c : c = 4 → m = 3', 2, {'k': '2', 'p': '-3', 'c': '4'}, 'correct', ['3']),
    spec('N1 c : e⁰ = 0', 2, {'k': '2', 'p': '-3', 'c': '4'}, 'incorrect', ['4'],
         '$\\mathrm{e}^0=1$, pas $0$.'),
    spec('N1 c : signe', 2, {'k': '2', 'p': '-3', 'c': '4'}, 'incorrect', ['5'],
         'On veut $1 + m = 4$ : on retire $1$ des deux côtés.'),
    spec('N1 c : soustraction à l\'envers', 2, {'k': '2', 'p': '-3', 'c': '4'}, 'incorrect', ['-3']),
    spec('N1 c : c = −2 → m = −3', 2, {'k': '-1', 'p': '1', 'c': '-2'}, 'correct', ['-3']),
]

ecrire('n1-continuite-fonction-par-morceaux', modele(
    'Fonction définie par morceaux : continuité en a',
    'Calculer les limites à gauche et à droite et l\'image en a d\'une fonction définie par '
    'morceaux pour décider de sa continuité en a, ou trouver le paramètre qui la rend continue',
    2, [N1_A, N1_B, N1_C], SPECS_N1))

# =============================================================================================
# N2 — TSPE-430 : TVI sur une équation donnée (idées TSA4-31 et TSA4-32).
# h continue, h aux bornes de signes contraires ⇒ au moins une solution ; + monotone ⇒ une seule.
# =============================================================================================


def conclusion_tvi(intervalle):
    return choix(
        'L\'équation admet au moins une solution dans ' + intervalle + '.',
        'L\'équation admet exactement une solution dans ' + intervalle + '.',
        'L\'équation n\'admet aucune solution dans ' + intervalle + '.',
        'Le théorème ne permet pas de conclure.',
    )


I_M = '$\\left[{{m}}\\,;{{eval:m+1}}\\right]$'
H_CUBE = 'x^3' + '-' + coef('a') + 'x' + terme('nb')
ERREURS_CUBE = [
    # h(m) = m³ − am − b
    lambda x, v: erreur('{{eval:-(' + x + ')}}', 'On a posé $h(x)=' + H_CUBE + '$ : c\'est '
                        '$x^3$ moins le second membre, pas l\'inverse.', 'h écrit à l\'envers'),
    lambda x, v: erreur('{{eval:abs(' + v + ')^3-a*' + v + '-b}}', '$(' + '{{' + v + '}}'
                        + ')^3$ est négatif : le cube d\'un nombre négatif est négatif.',
                        'Cube d\'un négatif'),
    lambda x, v: erreur('{{eval:' + v + '^3-a*' + v + '}}', 'N\'oublie pas le terme constant de '
                        '$h$.', 'Terme constant oublié'),
]


def cases_cube():
    return [case('{{h0}}', [f('h0', 'm') for f in ERREURS_CUBE]),
            case('{{h1}}', [f('h1', 'm1') for f in ERREURS_CUBE])]


VARS_CUBE = [var('a', '2..6'), var('b', '1..4;±'), var('m', '-3..2'), var('m1', '{{eval:m+1}}'),
             var('nb', '{{eval:-b}}'), var('h0', '{{eval:m^3-a*m-b}}'),
             var('h1', '{{eval:m1^3-a*m1-b}}')]

ENONCE_CUBE = (
    'On s\'intéresse à l\'équation $x^3=' + coef('a') + 'x' + terme('b') + '$ sur l\'intervalle '
    + I_M + '. On pose, pour tout réel $x$, $h(x)=' + H_CUBE + '$ ; la fonction $h$ est continue '
    'sur $\\mathbb{R}$ (c\'est un polynôme).\n\n'
    '$h({{m}})=?$\n\n$h({{m1}})=?$\n\n'
)

N2_A = variation(
    ENONCE_CUBE + 'Que permet de conclure le théorème des valeurs intermédiaires ?\n\n'
    + conclusion_tvi(I_M),
    VARS_CUBE,
    cases_cube() + [case('0')],
    [
        '$h({{m}})=({{m}})^3-{{a}}\\times({{m}})' + terme('nb') + '={{h0}}$ et '
        '$h({{m1}})=({{m1}})^3-{{a}}\\times({{m1}})' + terme('nb') + '={{h1}}$.',
        '$h$ est continue sur ' + I_M + ' et $0$ est compris entre $h({{m}})$ et $h({{m1}})$ : '
        'd\'après le théorème des valeurs intermédiaires, $h(x)=0$, c\'est-à-dire l\'équation, '
        'admet $' + PRIMAIRE + '{\\text{au moins une solution}}$ dans ' + I_M + '.',
        'Le théorème ne dit rien du nombre exact de solutions : pour l\'unicité, il faut aussi que '
        '$h$ soit strictement monotone.',
    ],
    'Calcule $h$ aux deux bornes et regarde leurs signes : $0$ est-il entre les deux ?',
    ['h0*h1 < 0'],
)

I_A = '$\\left[-{{a}}\\,;0\\right]$'
N2_B = variation(
    'On s\'intéresse à l\'équation $\\mathrm{e}^x=x+{{a}}$ sur l\'intervalle ' + I_A + '. On pose, '
    'pour tout réel $x$, $h(x)=\\mathrm{e}^x-x-{{a}}$ ; la fonction $h$ est continue sur '
    '$\\mathbb{R}$.\n\n'
    'Donne les valeurs exactes.\n\n$h(-{{a}})=?$\n\n$h(0)=?$\n\n'
    'Que permet de conclure le théorème des valeurs intermédiaires ?\n\n' + conclusion_tvi(I_A),
    [var('a', '2..4')],
    [case('\\mathrm{e}^{-{{a}}}', [
        erreur('-\\mathrm{e}^{ {{a}} }', '$\\mathrm{e}^{-{{a}}}=\\dfrac{1}{\\mathrm{e}^{ {{a}} }}$ : '
               'c\'est un nombre positif.', 'e^(−a) pris pour −e^a'),
        erreur('\\mathrm{e}^{-{{a}}}-{{eval:2*a}}', '$-x$ vaut $+{{a}}$ quand $x=-{{a}}$.',
               'Signe de −x'),
    ]),
     case('{{eval:1-a}}', [
         erreur('{{eval:-a}}', '$\\mathrm{e}^0=1$, pas $0$.', 'e⁰ = 0'),
         erreur('{{eval:a-1}}', '$h(0)=\\mathrm{e}^0-0-{{a}}$ : attention au signe.', 'Signe'),
     ]),
     case('0')],
    [
        '$h(-{{a}})=\\mathrm{e}^{-{{a}}}-(-{{a}})-{{a}}=\\mathrm{e}^{-{{a}}}$, qui est positif, et '
        '$h(0)=\\mathrm{e}^0-0-{{a}}={{eval:1-a}}$, qui est négatif.',
        '$h$ est continue sur ' + I_A + ' et $0$ est compris entre $h(0)$ et $h(-{{a}})$ : d\'après '
        'le théorème des valeurs intermédiaires, l\'équation admet $' + PRIMAIRE
        + '{\\text{au moins une solution}}$ dans ' + I_A + '.',
    ],
    'Remplace $x$ par chaque borne dans $h(x)$, puis compare les signes obtenus.',
)

I_PI = '$\\left[0\\,;\\dfrac{\\pi}{2}\\right]$'
N2_C = variation(
    'On s\'intéresse à l\'équation $x-\\cos x={{k}}$ sur l\'intervalle ' + I_PI + '. On pose, pour '
    'tout réel $x$, $h(x)=x-\\cos x-{{k}}$ ; la fonction $h$ est continue sur $\\mathbb{R}$.\n\n'
    'Donne les valeurs exactes.\n\n$h(0)=?$\n\n$h\\left(\\dfrac{\\pi}{2}\\right)=?$\n\n'
    'Que permet de conclure le théorème des valeurs intermédiaires ?\n\n' + conclusion_tvi(I_PI),
    [var('kn', '1..4'), var('k', '{{eval:kn/4}}')],
    [case('{{eval:-1-kn/4}}', [
        erreur('{{eval:-kn/4}}', '$\\cos 0=1$, pas $0$.', 'cos 0 = 0'),
        erreur('{{eval:1-kn/4}}', '$h(0)=0-\\cos 0-{{k}}$ : on retire $\\cos 0$.', 'Signe de cos 0'),
        erreur('{{eval:-1+kn/4}}', 'On retire ${{k}}$ : $h(0)=-1-{{k}}$.', 'Signe de k'),
    ], acceptDecimal=True),
     case('\\frac{\\pi}{2}-{{k}}', [
         erreur('\\frac{\\pi}{2}-1-{{k}}', '$\\cos\\dfrac{\\pi}{2}=0$, pas $1$.', 'cos(π/2) = 1'),
         erreur('\\frac{\\pi}{2}+{{k}}', 'On retire ${{k}}$ : attention au signe.', 'Signe de k'),
     ], acceptDecimal=True),
     case('0')],
    [
        '$h(0)=0-\\cos 0-{{k}}={{eval:-1-kn/4}}$ et $h\\left(\\dfrac{\\pi}{2}\\right)=\\dfrac{\\pi}{2}'
        '-\\cos\\dfrac{\\pi}{2}-{{k}}=\\dfrac{\\pi}{2}-{{k}}$, qui est positif car '
        '$\\dfrac{\\pi}{2}\\approx 1{,}57$.',
        '$h$ est continue sur ' + I_PI + ' et $0$ est compris entre $h(0)$ et '
        '$h\\left(\\dfrac{\\pi}{2}\\right)$ : d\'après le théorème des valeurs intermédiaires, '
        'l\'équation admet $' + PRIMAIRE + '{\\text{au moins une solution}}$ dans ' + I_PI + '.',
    ],
    'Utilise $\\cos 0$ et $\\cos\\dfrac{\\pi}{2}$, puis compare les signes de $h$ aux bornes.',
)

# v3 : unicité. h′(x) = 3x² − a garde un signe sur [m ; m + 1] : 3x² − a > 0 partout si
# 3·min(x²) > a, < 0 partout si 3·max(x²) < a (m entier : min et max de x² aux bornes).
# sd = 0 : h strictement croissante, 1 : strictement décroissante.
N2_D = variation(
    ENONCE_CUBE + 'Quel est le sens de variation de $h$ sur ' + I_M + ' ?\n\n'
    + choix('$h$ est strictement croissante sur ' + I_M + '.',
            '$h$ est strictement décroissante sur ' + I_M + '.',
            '$h$ n\'est pas monotone sur ' + I_M + '.')
    + '\n\nCombien de solutions l\'équation admet-elle dans ' + I_M + ' ?\n\n'
    + choix('Exactement une.', 'Au moins deux.', 'Aucune.',
            'On ne peut pas savoir avec ces informations.'),
    VARS_CUBE + [var('lo', '{{eval:min(m^2,m1^2)}}'), var('hi', '{{eval:max(m^2,m1^2)}}'),
                 var('sd', '{{eval:(1-sign(3*lo-a))/2}}')],
    cases_cube() + [case('{{sd}}'), case('0')],
    [
        '$h({{m}})={{h0}}$ et $h({{m1}})={{h1}}$ : $0$ est compris entre les deux.',
        '$h\'(x)=3x^2-{{a}}$. Pour $x$ dans ' + I_M + ', $x^2$ est entre ${{lo}}$ et ${{hi}}$, donc '
        '$3x^2-{{a}}$ est entre ${{eval:3*lo-a}}$ et ${{eval:3*hi-a}}$ : $h\'(x){{if:sd==0|>|<}}0$, '
        '$h$ est $' + PRIMAIRE + '{\\text{strictement {{if:sd==0|croissante|décroissante}}}}$ sur '
        + I_M + '.',
        '$h$ est continue et strictement monotone sur ' + I_M + ', et $0$ est compris entre '
        '$h({{m}})$ et $h({{m1}})$ : l\'équation admet $' + PRIMAIRE
        + '{\\text{exactement une solution}}$ dans ' + I_M + ' (corollaire du théorème des '
        'valeurs intermédiaires).',
    ],
    'Calcule $h\'(x)$ et étudie son signe sur l\'intervalle ; combine avec les signes de $h$ aux '
    'bornes.',
    ['h0*h1 < 0', '(3*lo-a)*(3*hi-a) > 0'],
)

V_CUBE = {'a': '2', 'b': '1', 'm': '1'}  # h(x) = x³ − 2x − 1 ; h(1) = −2, h(2) = 3
V_CUBE_N = {'a': '3', 'b': '-1', 'm': '-2'}  # h(x) = x³ − 3x + 1 ; h(−2) = −1, h(−1) = 3
V_CUBE_D = {'a': '4', 'b': '-2', 'm': '0'}  # h(x) = x³ − 4x + 2 ; h(0) = 2, h(1) = −1, décroissante
SPECS_N2 = [
    spec('N2 a : x³ = 2x + 1 sur [1 ; 2]', 0, V_CUBE, 'correct', ['-2', '3', '0']),
    spec('N2 a : h écrit à l\'envers', 0, V_CUBE, 'incorrect', ['2', '3', '0'],
         'On a posé $h\\left( x \\right) = x^3 - 2 x - 1$ : c\'est $x^3$ moins le second membre, pas l\'inverse.'),
    spec('N2 a : terme constant oublié', 0, V_CUBE, 'incorrect', ['-1', '3', '0'],
         'N\'oublie pas le terme constant de $h$.'),
    spec('N2 a : exactement une (unicité non justifiée)', 0, V_CUBE, 'incorrect', ['-2', '3', '1']),
    spec('N2 a : on ne peut pas conclure', 0, V_CUBE, 'incorrect', ['-2', '3', '3']),
    spec('N2 a : x³ = 3x − 1 sur [−2 ; −1]', 0, V_CUBE_N, 'correct', ['-1', '3', '0']),
    spec('N2 a : cube d\'un négatif', 0, V_CUBE_N, 'incorrect', ['15', '3', '0'],
         '$\\left( -2 \\right)^3$ est négatif : le cube d\'un nombre négatif est négatif.'),
    spec('N2 b : a = 3', 1, {'a': '3'}, 'correct', ['\\mathrm{e}^{-3}', '-2', '0']),
    spec('N2 b : 1/e³', 1, {'a': '3'}, 'correct', ['\\frac{1}{e^{3}}', '-2', '0']),
    spec('N2 b : −e³', 1, {'a': '3'}, 'incorrect', ['-e^{3}', '-2', '0'],
         '$\\mathrm{e}^{-3}=\\dfrac{1}{\\mathrm{e}^{ 3 }}$ : c\'est un nombre positif.'),
    spec('N2 b : signe de −x', 1, {'a': '3'}, 'incorrect', ['e^{-3}-6', '-2', '0'],
         '$-x$ vaut $+3$ quand $x = -3$.'),
    spec('N2 b : e⁰ = 0', 1, {'a': '3'}, 'incorrect', ['e^{-3}', '-3', '0'],
         '$\\mathrm{e}^0=1$, pas $0$.'),
    spec('N2 b : aucune solution', 1, {'a': '2'}, 'incorrect', ['e^{-2}', '-1', '2']),
    spec('N2 c : k = 1/2', 2, {'kn': '2'}, 'correct', ['-\\frac{3}{2}', '\\frac{\\pi}{2}-\\frac{1}{2}', '0']),
    spec('N2 c : k = 1/2, h(0) décimal', 2, {'kn': '2'}, 'correct', ['-1{,}5', '\\frac{\\pi}{2}-\\frac{1}{2}', '0']),
    spec('N2 c : cos 0 = 0', 2, {'kn': '2'}, 'incorrect', ['-\\frac{1}{2}', '\\frac{\\pi}{2}-\\frac{1}{2}', '0'],
         '$\\cos 0=1$, pas $0$.'),
    spec('N2 c : cos(π/2) = 1', 2, {'kn': '1'}, 'incorrect',
         ['-\\frac{5}{4}', '\\frac{\\pi}{2}-\\frac{5}{4}', '0'], '$\\cos\\dfrac{\\pi}{2}=0$, pas $1$.'),
    spec('N2 c : exactement une', 2, {'kn': '4'}, 'incorrect', ['-2', '\\frac{\\pi}{2}-1', '1']),
    spec('N2 d : croissante, une solution', 3, V_CUBE, 'correct', ['-2', '3', '0', '0']),
    spec('N2 d : décroissante, une solution', 3, V_CUBE_D, 'correct', ['2', '-1', '1', '0']),
    spec('N2 d : sens de variation faux', 3, V_CUBE_D, 'incorrect', ['2', '-1', '0', '0']),
    spec('N2 d : au moins deux', 3, V_CUBE, 'incorrect', ['-2', '3', '0', '1']),
    spec('N2 d : on ne peut pas savoir', 3, V_CUBE, 'incorrect', ['-2', '3', '0', '3']),
]

ecrire('n2-tvi-equation-donnee', modele(
    'Théorème des valeurs intermédiaires sur une équation donnée',
    'Montrer qu\'une équation écrite a au moins une solution dans un intervalle (h aux bornes, '
    'théorème des valeurs intermédiaires), puis exactement une quand h est strictement monotone',
    2, [N2_A, N2_B, N2_C, N2_D], SPECS_N2))

# =============================================================================================
# N4 — TSPE-427 : uₙ → ℓ et f continue en ℓ ⇒ f(uₙ) → f(ℓ) (Q1 : oui).
# uₙ quotient de deux affines en n : limite = quotient des coefficients de n.
# =============================================================================================


def suite(num, den):
    return '$u_n=\\dfrac{' + num + '}{' + den + '}$'


ENONCE_N4 = 'La suite $(u_n)$ est définie pour tout entier naturel $n$ par {u}.\n\n' \
            'Détermine $\\displaystyle\\lim_{{n\\to+\\infty}}{f}$.\n\n' \
            '$\\displaystyle\\lim_{{n\\to+\\infty}}{f}=?$'


def enonce_n4(u, f):
    return ENONCE_N4.format(u=u, f=f)


U_AFF = suite(coef('a') + 'n' + terme('b'), 'n+{{c}}')
LIM_U = '$\\displaystyle\\lim_{n\\to+\\infty}u_n=\\lim_{n\\to+\\infty}\\dfrac{n\\left({{a}}+\\frac{ {{b}} }{n}\\right)}{n\\left(1+\\frac{ {{c}} }{n}\\right)}={{a}}$'

N4_A = variation(
    enonce_n4(U_AFF, '\\mathrm{e}^{u_n}'),
    [var('a', '1..3'), var('b', '1..5;±'), var('c', '1..4')],
    [case('{{if:a==1|\\mathrm{e}|\\mathrm{e}^{ {{a}} }}}', [
        erreur('{{a}}', 'C\'est la limite de $u_n$ ; on demande celle de $\\mathrm{e}^{u_n}$.',
               'Limite de uₙ'),
        erreur('\\mathrm{e}^{\\frac{ {{b}} }{ {{c}} }}', 'C\'est $\\mathrm{e}^{u_0}$ : on cherche '
               'la limite quand $n$ tend vers $+\\infty$.', 'e^(u₀)'),
        erreur('+\\infty', '$u_n$ converge : $\\mathrm{e}^{u_n}$ ne tend pas vers $+\\infty$.',
               '+∞'),
    ])],
    [
        LIM_U + '.',
        'La fonction exponentielle est continue en ${{a}}$, donc $\\displaystyle\\lim_{n\\to+\\infty}'
        '\\mathrm{e}^{u_n}=' + PRIMAIRE + '{\\mathrm{e}^{ {{a}} }}$.',
    ],
    'Cherche d\'abord la limite de $u_n$, puis utilise la continuité de la fonction exponentielle.',
    ['a*c != b'],
)

N4_B = variation(
    enonce_n4(suite('{{eval:p^2}}n+{{b}}', 'n+{{c}}'), '\\sqrt{u_n}'),
    [var('p', '2..4'), var('b', '1..5'), var('c', '1..4')],
    [case('{{p}}', [
        erreur('{{eval:p^2}}', 'C\'est la limite de $u_n$ ; on demande celle de $\\sqrt{u_n}$.',
               'Limite de uₙ'),
        erreur('+\\infty', '$u_n$ converge : $\\sqrt{u_n}$ ne tend pas vers $+\\infty$.', '+∞'),
    ])],
    [
        '$\\displaystyle\\lim_{n\\to+\\infty}u_n={{eval:p^2}}$ (quotient des termes de plus haut '
        'degré).',
        'La fonction racine carrée est continue en ${{eval:p^2}}$, donc '
        '$\\displaystyle\\lim_{n\\to+\\infty}\\sqrt{u_n}=\\sqrt{ {{eval:p^2}} }=' + PRIMAIRE
        + '{ {{p}} }$.',
    ],
    'Cherche d\'abord la limite de $u_n$, puis utilise la continuité de la fonction racine carrée.',
    ['p^2*c != b'],
)

N4_C = variation(
    enonce_n4(U_AFF, '\\ln\\left(u_n\\right)'),
    [var('a', '2..5'), var('b', '1..5'), var('c', '1..4')],
    [case('\\ln {{a}}', [
        erreur('{{a}}', 'C\'est la limite de $u_n$ ; on demande celle de $\\ln\\left(u_n\\right)$.',
               'Limite de uₙ'),
        erreur('+\\infty', '$u_n$ converge : $\\ln\\left(u_n\\right)$ ne tend pas vers $+\\infty$.',
               '+∞'),
        erreur('0', '$\\ln {{a}}$ n\'est pas nul : $\\ln x=0$ seulement pour $x=1$.', 'ln a = 0'),
    ])],
    [
        LIM_U + ', et ${{a}}>0$.',
        'La fonction $\\ln$ est continue en ${{a}}$, donc $\\displaystyle\\lim_{n\\to+\\infty}'
        '\\ln\\left(u_n\\right)=' + PRIMAIRE + '{\\ln {{a}}}$.',
    ],
    'Cherche d\'abord la limite de $u_n$, puis utilise la continuité de la fonction $\\ln$.',
    ['a*c != b'],
)

N4_D = variation(
    enonce_n4(suite('\\pi n', coef('w') + 'n+1'), '\\cos\\left(u_n\\right)'),
    [var('w', '1|2')],
    [case('{{if:w==1|-1|0}}', [
        erreur('{{if:w==1|\\pi|\\frac{\\pi}{2}}}', 'C\'est la limite de $u_n$ ; on demande celle de '
               '$\\cos\\left(u_n\\right)$.', 'Limite de uₙ'),
        erreur('1', 'C\'est $\\cos\\left(u_0\\right)$ : on cherche la limite quand $n$ tend vers '
               '$+\\infty$.', 'cos(u₀)'),
    ])],
    [
        '$\\displaystyle\\lim_{n\\to+\\infty}u_n={{if:w==1|\\pi|\\dfrac{\\pi}{2}}}$ (quotient des termes de '
        'plus haut degré).',
        'La fonction cosinus est continue en ${{if:w==1|\\pi|\\dfrac{\\pi}{2}}}$, donc '
        '$\\displaystyle\\lim_{n\\to+\\infty}\\cos\\left(u_n\\right)=\\cos {{if:w==1|\\pi|\\dfrac{\\pi}{2}}}='
        + PRIMAIRE + '{ {{if:w==1|-1|0}} }$.',
    ],
    'Cherche d\'abord la limite de $u_n$, puis utilise la continuité de la fonction cosinus.',
)

SPECS_N4 = [
    spec('N4 a : e²', 0, {'a': '2', 'b': '3', 'c': '1'}, 'correct', ['e^{2}']),
    spec('N4 a : e² en \\mathrm', 0, {'a': '2', 'b': '3', 'c': '1'}, 'correct', ['\\mathrm{e}^2']),
    spec('N4 a : limite de uₙ', 0, {'a': '2', 'b': '3', 'c': '1'}, 'incorrect', ['2'],
         'C\'est la limite de $u_n$ ; on demande celle de $\\mathrm{e}^{u_n}$.'),
    spec('N4 a : e^(u₀)', 0, {'a': '2', 'b': '3', 'c': '1'}, 'incorrect', ['e^{3}'],
         'C\'est $\\mathrm{e}^{u_0}$ : on cherche la limite quand $n$ tend vers $+\\infty$.'),
    spec('N4 a : +∞', 0, {'a': '2', 'b': '3', 'c': '1'}, 'incorrect', ['+\\infty'],
         '$u_n$ converge : $\\mathrm{e}^{u_n}$ ne tend pas vers $+\\infty$.'),
    spec('N4 a : a = 1 → e', 0, {'a': '1', 'b': '-3', 'c': '2'}, 'correct', ['e']),
    spec('N4 b : p = 3 → 3', 1, {'p': '3', 'b': '2', 'c': '1'}, 'correct', ['3']),
    spec('N4 b : 9', 1, {'p': '3', 'b': '2', 'c': '1'}, 'incorrect', ['9'],
         'C\'est la limite de $u_n$ ; on demande celle de $\\sqrt{u_n}$.'),
    spec('N4 b : +∞', 1, {'p': '3', 'b': '2', 'c': '1'}, 'incorrect', ['+\\infty']),
    spec('N4 c : ln 3', 2, {'a': '3', 'b': '1', 'c': '2'}, 'correct', ['\\ln3']),
    spec('N4 c : ln(3)', 2, {'a': '3', 'b': '1', 'c': '2'}, 'correct', ['\\ln(3)']),
    spec('N4 c : 3', 2, {'a': '3', 'b': '1', 'c': '2'}, 'incorrect', ['3'],
         'C\'est la limite de $u_n$ ; on demande celle de $\\ln\\left(u_n\\right)$.'),
    spec('N4 c : 0', 2, {'a': '3', 'b': '1', 'c': '2'}, 'incorrect', ['0'],
         '$\\ln 3$ n\'est pas nul : $\\ln x=0$ seulement pour $x = 1$.'),
    spec('N4 d : w = 1 → −1', 3, {'w': '1'}, 'correct', ['-1']),
    spec('N4 d : w = 2 → 0', 3, {'w': '2'}, 'correct', ['0']),
    spec('N4 d : π/2', 3, {'w': '2'}, 'incorrect', ['\\frac{\\pi}{2}'],
         'C\'est la limite de $u_n$ ; on demande celle de $\\cos\\left(u_n\\right)$.'),
    spec('N4 d : cos(u₀)', 3, {'w': '1'}, 'incorrect', ['1'],
         'C\'est $\\cos\\left(u_0\\right)$ : on cherche la limite quand $n$ tend vers $+\\infty$.'),
]

ecrire('n4-limite-f-de-un', modele(
    'Limite de f(uₙ) quand uₙ converge et f est continue',
    'Calculer la limite de f(uₙ) quand (uₙ) converge vers ℓ et que f est continue en ℓ '
    '(exponentielle, racine carrée, logarithme, cosinus)',
    2, [N4_A, N4_B, N4_C, N4_D], SPECS_N4))

# =============================================================================================
# N5 — TSPE-319 : probabilité par dénombrement (idée TSG1-04). Équiprobabilité :
# P = nombre de cas favorables / nombre de cas possibles. Notation combinatoire acceptée.
# =============================================================================================

PROBA = {'acceptCombinatorialNotation': True, 'acceptDecimal': True}

N5_A = variation(
    'Un sac contient ${{n}}$ jetons portant chacun une lettre différente : ${{v}}$ voyelles et '
    '${{eval:n-v}}$ consonnes. On tire au hasard et simultanément $2$ jetons du sac.\n\n'
    'Quelle est la probabilité d\'obtenir une voyelle et une consonne ?\n\n$?$',
    [var('n', '7..10'), var('v', '3..{{eval:n-3}}')],
    [case('{{eval:v*(n-v)/binom(n,2)}}', [
        erreur('{{eval:2*v*(n-v)/binom(n,2)}}', 'Le tirage est simultané : les cas possibles sont '
               'des paires, sans ordre ; ne compte pas l\'ordre dans les cas favorables seulement.',
               'Ordre compté au numérateur'),
        erreur('{{eval:v*(n-v)/n^2}}', 'On tire $2$ jetons différents, sans remise : il y a '
               '$\\dbinom{ {{n}} }{2}$ tirages possibles, pas ${{n}}^2$.', 'Tirage avec remise'),
        erreur('{{eval:v*(n-v)/(n*(n-1))}}', 'Au dénominateur, tu comptes les tirages ordonnés ; '
               'compte-les sans ordre, comme au numérateur.', 'Ordre compté au dénominateur'),
    ], **PROBA)],
    [
        'Les tirages possibles sont les paires de jetons : $\\dbinom{ {{n}} }{2}={{eval:binom(n,2)}}$, '
        'tous équiprobables.',
        'Une voyelle et une consonne : ${{v}}\\times{{eval:n-v}}={{eval:v*(n-v)}}$ paires.',
        '$P=\\dfrac{ {{eval:v*(n-v)}} }{ {{eval:binom(n,2)}} }=' + PRIMAIRE
        + '{ {{eval:v*(n-v)/binom(n,2)}} }$.',
    ],
    'Compte les paires de jetons possibles, puis celles qui contiennent une voyelle et une '
    'consonne.',
)

N5_B = variation(
    'Une urne contient ${{r}}$ boules rouges et ${{w}}$ boules blanches. On tire au hasard et '
    'simultanément $3$ boules de l\'urne.\n\n'
    'Quelle est la probabilité d\'obtenir exactement $2$ boules rouges ?\n\n$?$',
    [var('r', '3..6'), var('w', '3..6')],
    [case('{{eval:binom(r,2)*w/binom(r+w,3)}}', [
        erreur('{{eval:binom(r,2)/binom(r+w,3)}}', 'Avec les $2$ rouges, il faut aussi choisir '
               'la boule blanche : ${{w}}$ façons.', 'Boule blanche oubliée'),
        erreur('{{eval:(binom(r,2)*w+binom(r,3))/binom(r+w,3)}}', 'Exactement $2$ rouges : le '
               'tirage de $3$ rouges ne compte pas.', 'Au moins 2'),
        erreur('{{eval:3*binom(r,2)*w/binom(r+w,3)}}', 'Le tirage est simultané : la place de la '
               'boule blanche ne compte pas.', 'Ordre compté'),
    ], **PROBA)],
    [
        'Les tirages possibles : $\\dbinom{ {{eval:r+w}} }{3}={{eval:binom(r+w,3)}}$, tous '
        'équiprobables.',
        'Exactement $2$ rouges : $\\dbinom{ {{r}} }{2}\\times{{w}}={{eval:binom(r,2)*w}}$ tirages.',
        '$P=\\dfrac{ {{eval:binom(r,2)*w}} }{ {{eval:binom(r+w,3)}} }=' + PRIMAIRE
        + '{ {{eval:binom(r,2)*w/binom(r+w,3)}} }$.',
    ],
    'Compte les tirages de $3$ boules possibles, puis ceux qui ont $2$ rouges et $1$ blanche.',
)

N5_C = variation(
    'On tire au hasard une main de ${{k}}$ cartes dans un jeu de $32$ cartes, qui contient '
    '$4$ as.\n\nQuelle est la probabilité que la main contienne au moins un as ?\n\n$?$',
    [var('k', '2|3')],
    [case('{{eval:1-binom(28,k)/binom(32,k)}}', [
        erreur('{{eval:binom(28,k)/binom(32,k)}}', 'C\'est la probabilité de n\'avoir aucun as : '
               'il faut encore passer à l\'événement contraire.', 'Complémentaire non retiré'),
        erreur('{{eval:4*binom(28,k-1)/binom(32,k)}}', 'C\'est la probabilité d\'avoir exactement '
               'un as ; « au moins un » compte aussi les mains avec plusieurs as.', 'Exactement un'),
        erreur('{{eval:k/8}}', 'Les probabilités de chaque carte ne s\'ajoutent pas : passe par '
               'l\'événement contraire « aucun as ».', 'Probabilités ajoutées'),
    ], **PROBA)],
    [
        'Les mains possibles : $\\dbinom{32}{ {{k}} }={{eval:binom(32,k)}}$, toutes '
        'équiprobables.',
        'L\'événement contraire « aucun as » : $\\dbinom{28}{ {{k}} }={{eval:binom(28,k)}}$ mains.',
        '$P=1-\\dfrac{ {{eval:binom(28,k)}} }{ {{eval:binom(32,k)}} }=' + PRIMAIRE
        + '{ {{eval:1-binom(28,k)/binom(32,k)}} }$.',
    ],
    '« Au moins un » : pense à l\'événement contraire.',
)

N5_D = variation(
    'Un code de ${{k}}$ chiffres (de $0$ à $9$, chacun pouvant se répéter) est choisi au '
    'hasard.\n\nQuelle est la probabilité que ses chiffres soient tous différents ?\n\n$?$',
    [var('k', '2..4')],
    [case('{{eval:factorial(10)/factorial(10-k)/10^k}}', [
        erreur('{{eval:binom(10,k)/10^k}}', 'L\'ordre des chiffres compte dans un code : compte '
               'les ${{k}}$-uplets de chiffres distincts, pas les combinaisons.', 'Combinaisons'),
        erreur('{{eval:1-factorial(10)/factorial(10-k)/10^k}}', 'C\'est la probabilité qu\'au '
               'moins deux chiffres soient égaux.', 'Événement contraire'),
    ], **PROBA)],
    [
        'Les codes possibles : $10^{ {{k}} }={{eval:10^k}}$, tous équiprobables.',
        'Chiffres tous différents : $\\dfrac{10!}{ {{eval:10-k}}! }='
        '{{eval:factorial(10)/factorial(10-k)}}$ codes.',
        '$P=\\dfrac{ {{eval:factorial(10)/factorial(10-k)}} }{ {{eval:10^k}} }=' + PRIMAIRE
        + '{ {{eval:factorial(10)/factorial(10-k)/10^k}} }$.',
    ],
    'Compte tous les codes possibles, puis ceux dont les chiffres sont distincts.',
)

SPECS_N5 = [
    spec('N5 a : n = 8, v = 3 → 15/28', 0, {'n': '8', 'v': '3'}, 'correct', ['\\frac{15}{28}']),
    spec('N5 a : notation combinatoire', 0, {'n': '8', 'v': '3'}, 'correct',
         ['\\frac{15}{\\binom{8}{2}}']),
    spec('N5 a : ordre au numérateur', 0, {'n': '8', 'v': '3'}, 'incorrect', ['\\frac{15}{14}']),
    spec('N5 a : avec remise', 0, {'n': '8', 'v': '3'}, 'incorrect', ['\\frac{15}{64}'],
         'On tire $2$ jetons différents, sans remise : il y a $\\dbinom{ 8 }{2}$ tirages possibles, '
         'pas $8^2$.'),
    spec('N5 a : ordre au dénominateur', 0, {'n': '8', 'v': '3'}, 'incorrect', ['\\frac{15}{56}'],
         'Au dénominateur, tu comptes les tirages ordonnés ; compte-les sans ordre, comme au '
         'numérateur.'),
    spec('N5 b : r = 4, w = 3 → 18/35', 1, {'r': '4', 'w': '3'}, 'correct', ['\\frac{18}{35}']),
    spec('N5 b : blanche oubliée', 1, {'r': '4', 'w': '3'}, 'incorrect', ['\\frac{6}{35}'],
         'Avec les $2$ rouges, il faut aussi choisir la boule blanche : $3$ façons.'),
    spec('N5 b : au moins 2', 1, {'r': '4', 'w': '3'}, 'incorrect', ['\\frac{22}{35}'],
         'Exactement $2$ rouges : le tirage de $3$ rouges ne compte pas.'),
    spec('N5 b : ordre compté', 1, {'r': '4', 'w': '3'}, 'incorrect', ['\\frac{54}{35}']),
    spec('N5 c : k = 2 → 1 − 378/496 = 59/248', 2, {'k': '2'}, 'correct', ['\\frac{59}{248}']),
    spec('N5 c : écriture 1 − C/C', 2, {'k': '2'}, 'correct',
         ['1-\\frac{\\binom{28}{2}}{\\binom{32}{2}}']),
    spec('N5 c : complémentaire non retiré', 2, {'k': '2'}, 'incorrect', ['\\frac{189}{248}'],
         'C\'est la probabilité de n\'avoir aucun as : il faut encore passer à l\'événement '
         'contraire.'),
    spec('N5 c : exactement un', 2, {'k': '2'}, 'incorrect', ['\\frac{7}{31}']),
    spec('N5 c : k/8', 2, {'k': '2'}, 'incorrect', ['\\frac{1}{4}']),
    spec('N5 d : k = 3 → 0,72', 3, {'k': '3'}, 'correct', ['0{,}72']),
    spec('N5 d : k = 3 → 18/25', 3, {'k': '3'}, 'correct', ['\\frac{18}{25}']),
    spec('N5 d : combinaisons', 3, {'k': '3'}, 'incorrect', ['0{,}12']),
    spec('N5 d : événement contraire', 3, {'k': '3'}, 'incorrect', ['0{,}28'],
         'C\'est la probabilité qu\'au moins deux chiffres soient égaux.'),
]

ecrire('n5-probabilite-par-denombrement', modele(
    'Probabilité par dénombrement',
    'Calculer une probabilité en situation d\'équiprobabilité en dénombrant les cas favorables '
    'et les cas possibles (tirages simultanés, mains de cartes, codes)',
    3, [N5_A, N5_B, N5_C, N5_D], SPECS_N5))

print('4 modèles neufs écrits dans', DOSSIER)
