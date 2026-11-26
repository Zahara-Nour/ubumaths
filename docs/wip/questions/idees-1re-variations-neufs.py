"""Écrit les modèles neufs du chantier idees-1re-variations dans
scripts/questions/idees-1re-variations-neufs/.

Phase 0 validée par David le 2026-11-26 (« je valide » ; journal
docs/wip/idees-1re-variations-progress.md, page à cocher
https://claude.ai/artifact/Sz4fcFzPik8zJjPLHsrT7i) : N1, N2, N3, trois modèles neufs de 1re spé
(Q1 : N2 en 1 SPE seul).

Rangement (migration générée après la création en brouillon) : nœud
« Fonctions > Dérivation > variations et extremums » ; N1 1SPE-283, N2 et N3 1SPE-401.

Pas de limites en 1re (bornes 1spe.md) : les tableaux des fonctions rationnelles portent la double
barre sans limite (`||, , top, , bottom`) et des bornes sans valeur (`-inf: , bottom`).

Ni theme, ni domain, ni subdomain, ni id : create-questions --publier écrit l'id.

Usage : python3 docs/wip/questions/idees-1re-variations-neufs.py scripts/questions/idees-1re-variations-neufs
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
NOEUD = 'Fonctions > Dérivation > variations et extremums'

# Messages tels que la résolution les réécrit (rempli après le premier passage de question:specs)
REECRIT = {
    "Le numérateur de $f'(x)$ est $u'v-uv'$ : c'est une différence, pas une somme.":
        "Le numérateur de $f'\\left( x \\right)$ est $u' v - u v'$ : c'est une différence, pas une somme.",
    "Tu as calculé $uv'-u'v$ : la formule est $u'v-uv'$, dans cet ordre.":
        "Tu as calculé $u v' - u' v$ : la formule est $u' v - u v'$, dans cet ordre.",
}


def spec(desc, vi, variables_, status, answers, message=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = REECRIT.get(message, message)
    if status == 'unoptimal_form':
        expected['constraintViolations'] = ['form']
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables_.items()},
            'expected': expected, 'answers': answers}


def modele(title, description, level, delay, variations, specs, point):
    return {'rangement': {'noeud': NOEUD, 'point': point}, 'title': title,
            'description': description, 'grades': ['1_SPE'], 'level': level, 'delay': delay,
            'status': 'draft',
            'shared': {'cleanCoefficients': True, 'blankDefaults': {'acceptDecimal': True}},
            'options': {'constraints': {'form': 'warn'}},
            'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def case(attendue, erreurs=None):
    c = {'expectedAnswer': attendue}
    if erreurs:
        c['expectedErrors'] = erreurs
    return c


def cellule(erreurs=None):
    """Case d'un tableau à compléter : la réponse vient du bloc."""
    return case('', erreurs)


def variation(statement, variables, blanks, steps, hint, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': blanks, 'correction': {'steps': steps}, 'hint': hint}


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


X = var('x', 'x|x')
HAUT, BAS = 'top', 'bottom'


def si(cond, oui, non):
    return '{{if:' + cond + '|' + oui + '|' + non + '}}'


# =============================================================================================
# N1 — Variations d'une fonction rationnelle (1AN20-3, 1AN21-2). Point 1SPE-283.
# =============================================================================================

# Une flèche ne se cache pas à côté d'une double barre (refus du moteur) et une erreur prévue ne
# va pas dans une case de tableau : pour une homographique, la case du numérateur de f′ porte les
# erreurs prévues, le tableau de signes se complète, et les variations se choisissent (choix).
HINT_HOMO = ('Dérive avec $\\left(\\dfrac{u}{v}\\right)\'=\\dfrac{u\'v-uv\'}{v^2}$ : le numérateur '
             'de $f\'(x)$ est un nombre. Un carré est positif : le signe de $f\'(x)$ est celui de '
             'ce nombre, des deux côtés de la valeur interdite.')


def choix_variations():
    return bloc('choix',
                '- $f$ est croissante sur $\\left]-\\infty\\,;{{al}}\\right[$ et sur '
                '$\\left]{{al}}\\,;+\\infty\\right[$',
                '- $f$ est décroissante sur $\\left]-\\infty\\,;{{al}}\\right[$ et sur '
                '$\\left]{{al}}\\,;+\\infty\\right[$',
                '- $f$ est croissante sur $\\left]-\\infty\\,;{{al}}\\right[$ et décroissante sur '
                '$\\left]{{al}}\\,;+\\infty\\right[$',
                '- $f$ est décroissante sur $\\left]-\\infty\\,;{{al}}\\right[$ et croissante sur '
                '$\\left]{{al}}\\,;+\\infty\\right[$')


def tableau_corrige(signe_pos, cle='al'):
    s = si(signe_pos, '+', '-')
    d, f = si(signe_pos, BAS, HAUT), si(signe_pos, HAUT, BAS)
    return bloc('variation',
                'variable: x',
                'domain: -inf, {{' + cle + '}}, +inf',
                '',
                "sign: f'(x)",
                '  -inf,{{' + cle + '}}: ' + s,
                '  {{' + cle + '}}: ||',
                '  {{' + cle + '}},+inf: ' + s,
                '',
                'variation: f(x)',
                '  -inf: , ' + d,
                '  {{' + cle + '}}: ||, , ' + f + ', , ' + d,
                '  +inf: , ' + f)


# Choix et tableau à compléter dans la même variation : la bonne réponse du choix se perd
# (outils-manquants.md) ; le tableau est dans le corrigé.
SUITE_HOMO = 'Quelle phrase décrit les variations de $f$ ?\n\n' + choix_variations()
CONCLUSION_HOMO = ('$f$ est $' + PRIMAIRE + '{\\text{' + si('D>0', 'croissante', 'décroissante')
                   + '}}$ sur $\\left]-\\infty\\,;{{al}}\\right[$ et sur $\\left]{{al}}\\,;+\\infty'
                   '\\right[$ (pas sur leur réunion : la double barre coupe le tableau).')

ERR_AD_PLUS_BC = ('Le numérateur de $f\'(x)$ est $u\'v-uv\'$ : c\'est une différence, pas une '
                  'somme.')
ERR_ORDRE_UV = 'Tu as calculé $uv\'-u\'v$ : la formule est $u\'v-uv\'$, dans cet ordre.'

n1, n1s = [], []

# --- V0 : (ax + b)/(cx + d)
n1.append(variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}\\setminus\\left\\{ {{al}} \\right\\}$ par '
    '$f(x)=\\dfrac{ {{eval:a*x+b}} }{ {{eval:c*x+d}} }$.\n\n'
    'Pour tout $x\\neq{{al}}$, $f\'(x)=\\dfrac{?}{({{eval:c*x+d}})^2}$.\n\n' + SUITE_HOMO,
    [X, var('c', '1..2'), var('al', '-4..4'), var('d', 'eval:-c*al'), var('a', '1..5;±'),
     var('b', '-5..5'), var('D', 'eval:a*d-b*c')],
    [case('{{D}}', [erreur('{{eval:a*d+b*c}}', ERR_AD_PLUS_BC, 'Somme au lieu de différence'),
                    erreur('{{eval:b*c-a*d}}', ERR_ORDRE_UV, 'uv′ − u′v')]),
     case(si('D>0', '0', '1'))],
    ['$f=\\dfrac{u}{v}$ avec $u(x)={{eval:a*x+b}}$ et $v(x)={{eval:c*x+d}}$ : '
     '$f\'(x)=\\dfrac{ {{a}}({{eval:c*x+d}})-{{c}}({{eval:a*x+b}})}{({{eval:c*x+d}})^2}'
     '=\\dfrac{' + PRIMAIRE + '{ {{D}} }}{({{eval:c*x+d}})^2}$.',
     'Le dénominateur est un carré, strictement positif sur $\\mathbb{R}\\setminus\\left\\{ {{al}} '
     '\\right\\}$ : $f\'(x)$ a le signe de ${{D}}$, ' + si('D>0', 'positif', 'négatif')
     + ' des deux côtés de la valeur interdite.',
     CONCLUSION_HOMO, tableau_corrige('D>0')],
    HINT_HOMO,
    ['al != 0', 'D != 0', 'a*d+b*c != D']))
V = {'c': 1, 'al': 2, 'd': -2, 'a': 3, 'b': 1, 'D': -7}   # (3x + 1)/(x − 2), f′ = −7/(x − 2)²
n1s += [
    spec('(3x + 1)/(x − 2) : −7, −, −, décroissante', 0, V, 'correct', ['-7', '1']),
    spec('ad + bc (−5)', 0, V, 'incorrect', ['-5', '1'], ERR_AD_PLUS_BC),
    spec('uv′ − u′v (7)', 0, V, 'incorrect', ['7', '0'], ERR_ORDRE_UV),
    spec('Signes justes, variations inversées', 0, V, 'incorrect', ['-7', '0']),
]
V = {'c': 2, 'al': -1, 'd': 2, 'a': 3, 'b': -4, 'D': 14}   # (3x − 4)/(2x + 2), f′ = 14/(2x + 2)²
n1s += [spec('(3x − 4)/(2x + 2) : 14, +, +, croissante', 0, V, 'correct', ['14', '0'])]

# --- V1 : k/(cx + d)
ERR_K_SEUL = ('N\'oublie pas la dérivée du dénominateur : $\\left(\\dfrac{1}{v}\\right)\'='
              '-\\dfrac{v\'}{v^2}$.')
ERR_SIGNE_MOINS = 'Attention au signe moins de $\\left(\\dfrac{1}{v}\\right)\'=-\\dfrac{v\'}{v^2}$.'
n1.append(variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}\\setminus\\left\\{ {{al}} \\right\\}$ par '
    '$f(x)=\\dfrac{ {{k}} }{ {{eval:c*x+d}} }$.\n\n'
    'Pour tout $x\\neq{{al}}$, $f\'(x)=\\dfrac{?}{({{eval:c*x+d}})^2}$.\n\n' + SUITE_HOMO,
    [X, var('c', '2..3;±'), var('al', '-4..4'), var('d', 'eval:-c*al'), var('k', '1..10;±'),
     var('D', 'eval:-k*c')],
    [case('{{D}}', [erreur('{{eval:-k}}', ERR_K_SEUL, 'Dérivée du dénominateur oubliée'),
                    erreur('{{eval:k*c}}', ERR_SIGNE_MOINS, 'Signe moins oublié')]),
     case(si('D>0', '0', '1'))],
    ['$f={{k}}\\times\\dfrac{1}{v}$ avec $v(x)={{eval:c*x+d}}$ et $v\'(x)={{c}}$ : '
     '$f\'(x)={{k}}\\times\\left(-\\dfrac{ {{c}} }{({{eval:c*x+d}})^2}\\right)=\\dfrac{' + PRIMAIRE
     + '{ {{D}} }}{({{eval:c*x+d}})^2}$.',
     'Le dénominateur est un carré, strictement positif : $f\'(x)$ a le signe de ${{D}}$, '
     + si('D>0', 'positif', 'négatif') + ' des deux côtés de la valeur interdite.',
     CONCLUSION_HOMO, tableau_corrige('D>0')],
    'Écris $f(x)={{k}}\\times\\dfrac{1}{v(x)}$ et dérive avec $\\left(\\dfrac{1}{v}\\right)\'='
    '-\\dfrac{v\'}{v^2}$. Le signe de $f\'(x)$ dépend de celui de ${{k}}$ et de celui de ${{c}}$.',
    ['al != 0']))
V = {'c': -2, 'al': 3, 'd': 6, 'k': 5, 'D': 10}   # 5/(−2x + 6), f′ = 10/(−2x + 6)²
n1s += [
    spec('5/(−2x + 6) : 10, +, +, croissante (c négatif)', 1, V, 'correct', ['10', '0']),
    spec('k seul (−5)', 1, V, 'incorrect', ['-5', '1'], ERR_K_SEUL),
    spec('Signe moins oublié (−10)', 1, V, 'incorrect', ['-10', '1'], ERR_SIGNE_MOINS),
]
V = {'c': 2, 'al': -2, 'd': 4, 'k': 4, 'D': -8}   # 4/(2x + 4)
n1s += [spec('4/(2x + 4) : −8, −, −, décroissante', 1, V, 'correct', ['-8', '1'])]

# --- V2 : k/(x² + c), extremum en 0 (une case choix : nature et valeur)
n1.append(variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=\\dfrac{ {{k}} }{x^2+{{c}}}$.\n\n'
    'Étudie le signe de $f\'(x)$. En $0$, la fonction $f$ admet :\n\n'
    + bloc('choix',
           '- un maximum, égal à ${{eval:k/c}}$',
           '- un minimum, égal à ${{eval:k/c}}$',
           '- un maximum, égal à ${{eval:c/k}}$',
           '- un minimum, égal à ${{eval:c/k}}$'),
    [var('c', '1..9'), var('k', '1..10;±')],
    [case(si('k>0', '0', '1'))],
    ['$f={{k}}\\times\\dfrac{1}{v}$ avec $v(x)=x^2+{{c}}$ : '
     '$f\'(x)=\\dfrac{ {{eval:-2*k}}x}{(x^2+{{c}})^2}$.',
     'Le dénominateur est strictement positif : $f\'(x)$ a le signe de ${{eval:-2*k}}x$, '
     + si('k>0', 'positif avant $0$, négatif après', 'négatif avant $0$, positif après')
     + ' : $f$ est ' + si('k>0', 'croissante puis décroissante', 'décroissante puis croissante') + '.',
     '$f$ admet en $0$ un $' + PRIMAIRE + '{\\text{' + si('k>0', 'maximum', 'minimum')
     + '}}$, égal à $f(0)=\\dfrac{ {{k}} }{ {{c}} }=' + PRIMAIRE + '{ {{eval:k/c}} }$.'],
    'Calcule $f\'(x)$ : son signe est celui de son numérateur. Pour la valeur, calcule $f(0)$.',
    ['k != c', 'k != -c']))
n1s += [
    spec('6/(x² + 4) : maximum 3/2', 2, {'c': 4, 'k': 6}, 'correct', ['0']),
    spec('6/(x² + 4) : minimum coché', 2, {'c': 4, 'k': 6}, 'incorrect', ['1']),
    spec('6/(x² + 4) : valeur inversée', 2, {'c': 4, 'k': 6}, 'incorrect', ['2']),
    spec('−5/(x² + 2) : minimum −5/2', 2, {'c': 2, 'k': -5}, 'correct', ['1']),
]

# --- V3 et V4 : (x² + bx + c)/(x + a), f′(x) = (x − x₁)(x − x₂)/(x + a)²
VARS_Q = [X, var('a', '1..4;±'), var('k', '1..5'), var('b', '-3..3'), var('x1', 'eval:-a-k'),
          var('x2', 'eval:-a+k'), var('c', 'eval:a*b-x1*x2'), var('al', 'eval:-a')]
COND_Q = ['abs(c) <= 12', 'x1 != 0', 'x2 != 0']   # pas de facteur « (x) »
ENONCE_Q = ('Soit $f$ la fonction définie sur {ens} par '
            '$f(x)=\\dfrac{ {{eval:x^2+b*x+c}} }{ {{eval:x+a}} }$. On admet que '
            '$f\'(x)=\\dfrac{({{eval:x-x1}})({{eval:x-x2}})}{({{eval:x+a}})^2}$.\n\n')
ERR_NUM_SEUL = ('Tu as calculé le numérateur seul : divise-le par la valeur du dénominateur.')
HINT_Q = ('Un carré est positif : $f\'(x)$ a le signe du produit de son numérateur. Pour les '
          'valeurs, remplace $x$ dans l\'expression de $f(x)$.')

n1.append(variation(
    ENONCE_Q.replace('{ens}', '$\\mathbb{R}\\setminus\\left\\{ {{al}} \\right\\}$')
    + 'Complète le tableau de variations de $f$ (sans limites).\n\n'
    + bloc('variation',
           'variable: x',
           'domain: -inf, {{x1}}, {{al}}, {{x2}}, +inf',
           '',
           "sign: f'(x)",
           '  -inf,{{x1}}: ?+',
           '  {{x1}}: z',
           '  {{x1}},{{al}}: -',
           '  {{al}}: ||',
           '  {{al}},{{x2}}: -',
           '  {{x2}}: z',
           '  {{x2}},+inf: ?+',
           '',
           'variation: f(x)',
           '  -inf: , bottom',
           '  {{x1}}: ?{{eval:2*x1+b}}, top',
           '  {{al}}: ||, , bottom, , top',
           '  {{x2}}: ?{{eval:2*x2+b}}, bottom',
           '  +inf: , top',
           '  -inf,{{x1}}: ?flèche',
           '  {{x2}},+inf: ?flèche'),
    VARS_Q,
    [cellule() for _ in range(6)],
    ['$({{eval:x+a}})^2>0$ : $f\'(x)$ a le signe de $({{eval:x-x1}})({{eval:x-x2}})$, positif à '
     'l\'extérieur des racines ${{x1}}$ et ${{x2}}$, négatif entre elles (de part et d\'autre de '
     'la valeur interdite ${{al}}$).',
     '$f({{x1}})=\\dfrac{ {{eval:x1^2+b*x1+c}} }{ {{eval:x1+a}} }=' + PRIMAIRE + '{ {{eval:2*x1+b}} }$ '
     'et $f({{x2}})=\\dfrac{ {{eval:x2^2+b*x2+c}} }{ {{eval:x2+a}} }=' + PRIMAIRE
     + '{ {{eval:2*x2+b}} }$.',
     bloc('variation',
          'variable: x',
          'domain: -inf, {{x1}}, {{al}}, {{x2}}, +inf',
          '',
          "sign: f'(x)",
          '  -inf,{{x1}}: +',
          '  {{x1}}: z',
          '  {{x1}},{{al}}: -',
          '  {{al}}: ||',
          '  {{al}},{{x2}}: -',
          '  {{x2}}: z',
          '  {{x2}},+inf: +',
          '',
          'variation: f(x)',
          '  -inf: , bottom',
          '  {{x1}}: {{eval:2*x1+b}}, top',
          '  {{al}}: ||, , bottom, , top',
          '  {{x2}}: {{eval:2*x2+b}}, bottom',
          '  +inf: , top')],
    HINT_Q, COND_Q))
# a = 1, k = 2, b = 1 : x1 = −3, x2 = 1, c = 1·1 − (−3)(1) = 4 : (x² + x + 4)/(x + 1)
V = {'a': 1, 'k': 2, 'b': 1, 'x1': -3, 'x2': 1, 'c': 4, 'al': -1}
JUSTE = ['+', '+', '↗', '-5', '3', '↗']
n1s += [
    spec('(x² + x + 4)/(x + 1) : max −5 en −3, min 3 en 1', 3, V, 'correct', JUSTE),
    spec('f(−3) : numérateur seul (10)', 3, V, 'incorrect', ['+', '+', '↗', '10', '3', '↗']),
    spec('f(1) : abscisse (1)', 3, V, 'incorrect', ['+', '+', '↗', '-5', '1', '↗']),
    spec('Flèches extérieures inversées', 3, V, 'incorrect', ['+', '+', '↘', '-5', '3', '↘']),
]

ERR_HORS_INTERVALLE = ('${{x1}}$ n\'est pas dans l\'intervalle d\'étude : sur cet intervalle, '
                       '$f\'$ ne s\'annule qu\'une fois.')
n1.append(variation(
    ENONCE_Q.replace('{ens}', '$\\left]{{al}}\\,;+\\infty\\right[$')
    + 'La fonction $f$ admet un minimum sur $\\left]{{al}}\\,;+\\infty\\right[$.\n\n'
    'Ce minimum vaut $?$ ; il est atteint en $x=?$.',
    VARS_Q,
    [case('{{eval:2*x2+b}}', [
        erreur('{{eval:x2^2+b*x2+c}}', ERR_NUM_SEUL, 'Numérateur seul'),
        erreur('{{eval:2*x1+b}}', ERR_HORS_INTERVALLE, 'Extremum hors de l\'intervalle'),
        erreur('{{x2}}', 'C\'est l\'abscisse du minimum : sa valeur est l\'image par $f$.',
               'Abscisse au lieu de la valeur')]),
     case('{{x2}}', [
         erreur('{{x1}}', ERR_HORS_INTERVALLE, 'Racine hors de l\'intervalle'),
         erreur('{{al}}', '${{al}}$ est la valeur interdite : $f$ n\'y est pas définie.',
                'Valeur interdite')])],
    ['Sur $\\left]{{al}}\\,;+\\infty\\right[$, $({{eval:x+a}})^2>0$ et $x{{eval:-x1;+}}>0$ : '
     '$f\'(x)$ a le signe de ${{eval:x-x2}}$, négatif avant ${{x2}}$, positif après.',
     '$f$ est décroissante puis croissante : son minimum est atteint en $x=' + PRIMAIRE
     + '{ {{x2}} }$ et vaut $f({{x2}})=\\dfrac{ {{eval:x2^2+b*x2+c}} }{ {{eval:x2+a}} }='
     + PRIMAIRE + '{ {{eval:2*x2+b}} }$.'],
    'Sur cet intervalle, $x+{{a}}>0$ : regarde le signe de chaque facteur du numérateur de '
    '$f\'(x)$, puis calcule l\'image de la valeur qui l\'annule.', COND_Q))
n1s += [
    spec('(x² + x + 4)/(x + 1) sur ]−1 ; +∞[ : 3 en 1', 4, V, 'correct', ['3', '1']),
    spec('Numérateur seul (6)', 4, V, 'incorrect', ['6', '1'], ERR_NUM_SEUL),
    spec('Extremum de l\'autre côté (−5)', 4, V, 'incorrect', ['-5', '1'], ERR_HORS_INTERVALLE.replace('{{x1}}', '-3')),
    spec('Abscisse hors intervalle (−3)', 4, V, 'incorrect', ['3', '-3'], ERR_HORS_INTERVALLE.replace('{{x1}}', '-3')),
    spec('Valeur interdite (−1)', 4, V, 'incorrect', ['3', '-1'],
         '${{al}}$ est la valeur interdite : $f$ n\'y est pas définie.'.replace('{{al}}', '-1')),
]

ecrire('n1-variations-fonction-rationnelle', modele(
    'Variations d\'une fonction rationnelle',
    'Variations de (ax + b)/(cx + d), k/(cx + d), k/(x² + c) et (x² + bx + c)/(x + a) : signe de '
    'f′(x), tableau de variations sans limites, extremums.',
    5, 360, n1, n1s, '1SPE-283'))

# =============================================================================================
# N2 — Variations et extremums d'un polynôme de degré 3 sur un intervalle (1AN20-1, 1AN21-1).
# f(x) = A(2x³ − 3(p + q)x² + 6pqx) + k, f′(x) = 6A(x − p)(x − q). Point 1SPE-401.
# =============================================================================================


def F(t):
    return 'eval:A*(2*' + t + '^3-3*(p+q)*' + t + '^2+6*p*q*' + t + ')+k'


VARS_3 = [X, var('A', '1..1;±'), var('p', '-3..2'), var('dd', '1..3'), var('q', 'eval:p+dd'),
          var('k', '-5..5')]
ENONCE_3 = ('Soit $f$ la fonction définie sur $\\left[{{m}}\\,;{{n}}\\right]$ par '
            '$f(x)={{eval:2*A*x^3-3*A*(p+q)*x^2+6*A*p*q*x+k}}$. On admet que '
            '$f\'(x)={{eval:6*A}}({{eval:x-p}})({{eval:x-q}})$.\n\n')
ERR_LOCAL = ('C\'est un extremum local. Compare-le aux valeurs de $f$ aux bornes de '
             'l\'intervalle.')
ERR_ABSCISSE = 'Tu as donné l\'abscisse : la réponse est la valeur de $f$ en ce point.'

n2, n2s = [], []
sgn = si('A>0', '+', '-')
sgn_inv = si('A>0', '-', '+')
hb = si('A>0', BAS, HAUT)
bh = si('A>0', HAUT, BAS)

# --- V0 : tableau complet sur [p − e1 ; q + e2]
n2.append(variation(
    ENONCE_3 + 'Complète le tableau de variations de $f$.\n\n'
    + bloc('variation',
           'variable: x',
           'domain: {{m}}, {{p}}, {{q}}, {{n}}',
           '',
           "sign: f'(x)",
           '  {{m}},{{p}}: ?' + sgn,
           '  {{p}}: z',
           '  {{p}},{{q}}: ?' + sgn_inv,
           '  {{q}}: z',
           '  {{q}},{{n}}: ?' + sgn,
           '',
           'variation: f(x)',
           '  {{m}}: {{Fm}}, ' + hb,
           '  {{p}}: ?{{Fp}}, ' + bh,
           '  {{q}}: ?{{Fq}}, ' + hb,
           '  {{n}}: {{Fn}}, ' + bh,
           '  {{m}},{{p}}: ?flèche',
           '  {{p}},{{q}}: ?flèche',
           '  {{q}},{{n}}: ?flèche'),
    VARS_3 + [var('e1', '1..2'), var('e2', '1..2'), var('m', 'eval:p-e1'), var('n', 'eval:q+e2'),
              var('Fm', F('m')), var('Fp', F('p')), var('Fq', F('q')), var('Fn', F('n'))],
    [cellule() for _ in range(8)],
    ['$f\'(x)$ est un produit : ${{eval:6*A}}$ est ' + si('A>0', 'positif', 'négatif')
     + ', $x{{eval:-p;+}}$ et $x{{eval:-q;+}}$ changent de signe en ${{p}}$ et en ${{q}}$. '
     '$f\'(x)$ est ' + si('A>0', 'positif à l\'extérieur des racines, négatif entre elles',
                          'négatif à l\'extérieur des racines, positif entre elles') + '.',
     '$f({{p}})=' + PRIMAIRE + '{ {{Fp}} }$ et $f({{q}})=' + PRIMAIRE + '{ {{Fq}} }$.',
     bloc('variation',
          'variable: x',
          'domain: {{m}}, {{p}}, {{q}}, {{n}}',
          '',
          "sign: f'(x)",
          '  {{m}},{{p}}: ' + sgn,
          '  {{p}}: z',
          '  {{p}},{{q}}: ' + sgn_inv,
          '  {{q}}: z',
          '  {{q}},{{n}}: ' + sgn,
          '',
          'variation: f(x)',
          '  {{m}}: {{Fm}}, ' + hb,
          '  {{p}}: {{Fp}}, ' + bh,
          '  {{q}}: {{Fq}}, ' + hb,
          '  {{n}}: {{Fn}}, ' + bh)],
    'Étudie le signe de chaque facteur de $f\'(x)$ sur l\'intervalle. Pour les valeurs, '
    'remplace $x$ dans l\'expression de $f(x)$, sans oublier le terme constant.',
    ['q <= 3']))
# A = 1, p = −1, q = 1, k = 2 : f(x) = 2x³ − 6x + 2 ; m = −2, n = 2 :
# f(−2) = −16 + 12 + 2 = −2, f(−1) = −2 + 6 + 2 = 6, f(1) = 2 − 6 + 2 = −2, f(2) = 16 − 12 + 2 = 6
V = {'A': 1, 'p': -1, 'dd': 2, 'q': 1, 'k': 2, 'e1': 1, 'e2': 1, 'm': -2, 'n': 2,
     'Fm': -2, 'Fp': 6, 'Fq': -2, 'Fn': 6}
n2s += [
    spec('2x³ − 6x + 2 sur [−2 ; 2] : +, ↗, 6, −, ↘, −2, +, ↗', 0, V, 'correct',
         ['+', '-', '+', '↗', '6', '↘', '-2', '↗']),
    spec('f(−1) sans la constante (4)', 0, V, 'incorrect',
         ['+', '-', '+', '↗', '4', '↘', '-2', '↗']),
    spec('Signes inversés', 0, V, 'incorrect', ['-', '+', '-', '↘', '6', '↗', '-2', '↘']),
]
# A = −1, p = 0, q = 2, k = 1 : f(x) = −2x³ + 6x² + 1 ; m = −1, n = 3 :
# f(−1) = 2 + 6 + 1 = 9, f(0) = 1, f(2) = −16 + 24 + 1 = 9, f(3) = −54 + 54 + 1 = 1
V2 = {'A': -1, 'p': 0, 'dd': 2, 'q': 2, 'k': 1, 'e1': 1, 'e2': 1, 'm': -1, 'n': 3,
      'Fm': 9, 'Fp': 1, 'Fq': 9, 'Fn': 1}
n2s += [spec('−2x³ + 6x² + 1 sur [−1 ; 3] : −, ↘, 1, +, ↗, 9, −, ↘', 0, V2, 'correct',
             ['-', '+', '-', '↘', '1', '↗', '9', '↘'])]

# --- V1 : maximum et minimum sur [p − e1 ; q + e2]
MAXMIN = 'Sur $\\left[{{m}}\\,;{{n}}\\right]$, le maximum de $f$ est $?$ et son minimum est $?$.'
n2.append(variation(
    ENONCE_3 + MAXMIN,
    VARS_3 + [var('e1', '1..2'), var('e2', '1..2'), var('m', 'eval:p-e1'), var('n', 'eval:q+e2'),
              var('Fm', F('m')), var('Fp', F('p')), var('Fq', F('q')), var('Fn', F('n'))],
    [case('{{eval:max(Fm,Fp,Fq,Fn)}}', [
        erreur(si('A>0', '{{Fp}}', '{{Fq}}'), ERR_LOCAL, 'Maximum local pris pour le maximum'),
        erreur(si('A>0', '{{p}}', '{{q}}'), ERR_ABSCISSE, 'Abscisse au lieu de la valeur')]),
     case('{{eval:min(Fm,Fp,Fq,Fn)}}', [
         erreur(si('A>0', '{{Fq}}', '{{Fp}}'), ERR_LOCAL, 'Minimum local pris pour le minimum'),
         erreur(si('A>0', '{{q}}', '{{p}}'), ERR_ABSCISSE, 'Abscisse au lieu de la valeur')])],
    ['$f\'(x)$ s\'annule en ${{p}}$ et en ${{q}}$ : $f$ est '
     + si('A>0', 'croissante, décroissante puis croissante',
          'décroissante, croissante puis décroissante') + ' sur $\\left[{{m}}\\,;{{n}}\\right]$.',
     'On compare les valeurs aux bornes et aux extremums locaux : $f({{m}})={{Fm}}$, '
     '$f({{p}})={{Fp}}$, $f({{q}})={{Fq}}$, $f({{n}})={{Fn}}$.',
     'Maximum : $' + PRIMAIRE + '{ {{eval:max(Fm,Fp,Fq,Fn)}} }$ ; minimum : $' + PRIMAIRE
     + '{ {{eval:min(Fm,Fp,Fq,Fn)}} }$.'],
    'Dresse le tableau de variations : le maximum sur un intervalle fermé est soit un maximum '
    'local, soit la valeur à une borne. Compare-les.',
    ['q <= 3']))
# A = 1, p = −1, q = 1, k = 0, m = −2, n = 3 : f(x) = 2x³ − 6x :
# f(−2) = −4, f(−1) = 4, f(1) = −4, f(3) = 36 → max 36 (borne), min −4
V = {'A': 1, 'p': -1, 'dd': 2, 'q': 1, 'k': 0, 'e1': 1, 'e2': 2, 'm': -2, 'n': 3,
     'Fm': -4, 'Fp': 4, 'Fq': -4, 'Fn': 36}
n2s += [
    spec('2x³ − 6x sur [−2 ; 3] : max 36 (borne), min −4', 1, V, 'correct', ['36', '-4']),
    spec('Maximum local 4 pris pour le maximum', 1, V, 'incorrect', ['4', '-4'], ERR_LOCAL),
    spec('Abscisse −1 donnée', 1, V, 'incorrect', ['-1', '-4'], ERR_ABSCISSE),
    spec('Max et min échangés', 1, V, 'incorrect', ['-4', '36']),
]
# A = 1, p = 0, q = 1, k = 0, m = −1, n = 2 : f(x) = 2x³ − 3x² : f(−1) = −5, f(0) = 0,
# f(1) = −1, f(2) = 4 → max 4, min −5 (deux bornes)
V = {'A': 1, 'p': 0, 'dd': 1, 'q': 1, 'k': 0, 'e1': 1, 'e2': 1, 'm': -1, 'n': 2,
     'Fm': -5, 'Fp': 0, 'Fq': -1, 'Fn': 4}
n2s += [
    spec('2x³ − 3x² sur [−1 ; 2] : max 4, min −5', 1, V, 'correct', ['4', '-5']),
    spec('Minimum local −1 pris pour le minimum', 1, V, 'incorrect', ['4', '-1'], ERR_LOCAL),
]

# --- V2 : intervalle [p − e ; q − 1] qui ne contient que la racine p
n2.append(variation(
    ENONCE_3 + MAXMIN,
    [X, var('A', '1..1;±'), var('p', '-3..1'), var('dd', '2..3'), var('q', 'eval:p+dd'),
     var('k', '-5..5'), var('e1', '1..2'), var('m', 'eval:p-e1'), var('n', 'eval:q-1'),
     var('Fm', F('m')), var('Fp', F('p')), var('Fn', F('n'))],
    [case(si('A>0', '{{Fp}}', '{{eval:max(Fm,Fn)}}'), [
        erreur('{{p}}', ERR_ABSCISSE, 'Abscisse au lieu de la valeur'),
        erreur(si('A>0', '{{eval:max(Fm,Fn)}}', '{{Fp}}'),
               'Compare toutes les valeurs : celles aux bornes et celle de l\'extremum local.',
               'Comparaison incomplète')]),
     case(si('A>0', '{{eval:min(Fm,Fn)}}', '{{Fp}}'), [
         erreur('{{p}}', ERR_ABSCISSE, 'Abscisse au lieu de la valeur'),
         erreur(si('A>0', '{{eval:max(Fm,Fn)}}', '{{eval:min(Fm,Fn)}}'),
                'Le minimum est la plus petite des valeurs : compare $f({{m}})$ et $f({{n}})$.',
                'Mauvaise borne')])],
    ['Sur $\\left[{{m}}\\,;{{n}}\\right]$, seul ${{p}}$ annule $f\'(x)$ (${{q}}$ est hors de '
     'l\'intervalle) : $f$ est ' + si('A>0', 'croissante puis décroissante',
                                       'décroissante puis croissante') + '.',
     '$f({{m}})={{Fm}}$, $f({{p}})={{Fp}}$, $f({{n}})={{Fn}}$.',
     'Maximum : $' + PRIMAIRE + '{' + si('A>0', '{{Fp}}', '{{eval:max(Fm,Fn)}}')
     + '}$ ; minimum : $' + PRIMAIRE + '{' + si('A>0', '{{eval:min(Fm,Fn)}}', '{{Fp}}') + '}$.'],
    'Regarde quelles racines de $f\'(x)$ sont dans l\'intervalle, puis compare les valeurs de $f$ '
    'en ces points et aux bornes.',
    ['q <= 3', 'Fm != Fn']))
# A = 1, p = −1, q = 1, k = 0, m = −3, n = 0 : f(x) = 2x³ − 6x : f(−3) = −36, f(−1) = 4, f(0) = 0
V = {'A': 1, 'p': -1, 'dd': 2, 'q': 1, 'k': 0, 'e1': 2, 'm': -3, 'n': 0,
     'Fm': -36, 'Fp': 4, 'Fn': 0}
n2s += [
    spec('2x³ − 6x sur [−3 ; 0] : max 4, min −36', 2, V, 'correct', ['4', '-36']),
    spec('Abscisse −1', 2, V, 'incorrect', ['-1', '-36'], ERR_ABSCISSE),
    spec('Minimum : mauvaise borne (0)', 2, V, 'incorrect', ['4', '0'],
         'Le minimum est la plus petite des valeurs : compare $f\\left( -3 \\right)$ et $f\\left( 0 \\right)$.'),
]

ecrire('n2-degre-3-sur-un-intervalle', modele(
    'Variations et extremums d\'un polynôme de degré 3 sur un intervalle',
    'Polynôme de degré 3 sur un intervalle fermé, dérivée factorisée donnée : tableau de variations '
    'avec les valeurs, maximum et minimum (extremum local ou valeur à une borne).',
    4, 300, n2, n2s, '1SPE-401'))

# =============================================================================================
# N3 — Maximum et minimum de ax + b/x sur un intervalle (1AN21-1, cas 1). Point 1SPE-401.
# =============================================================================================

FM, FN = 'eval:(a*m^2+b)/m', 'eval:(a*n^2+b)/n'
ENONCE_X = ('Soit $f$ la fonction définie sur $\\left[{{m}}\\,;{{n}}\\right]$ par '
            '$f(x)={{eval:a*x}}{{if:b>0|+|-}}\\dfrac{ {{eval:abs(b)}} }{x}$.\n\n'
            'Sur $\\left[{{m}}\\,;{{n}}\\right]$, le minimum de $f$ est $?$ et son maximum est $?$.')
ERR_ABSC_R = 'Tu as donné l\'abscisse de l\'extremum : la réponse est son image par $f$.'
ERR_DERIVEE_NULLE = '$0$ est la valeur de $f\'$ en ce point : la réponse est la valeur de $f$.'
ERR_COMPARE = 'Compare les valeurs de $f$ aux deux bornes : il faut la plus grande.'
ERR_COMPARE_MIN = 'Compare les valeurs de $f$ aux deux bornes : il faut la plus petite.'
HINT_X = ('Écris $f\'(x)$ avec un seul dénominateur $x^2$ : son signe est celui du numérateur. '
          'Sur un intervalle fermé, compare l\'extremum local aux valeurs aux bornes.')
n3, n3s = [], []

DERIV = ('$f\'(x)={{a}}{{if:b>0|-|+}}\\dfrac{ {{eval:abs(b)}} }{x^2}=\\dfrac{ {{eval:a*x^2-b}} }{x^2}$, du signe de '
         '${{eval:a*x^2-b}}$ (car $x^2>0$).')

# --- V0 : a > 0, b > 0 : minimum en r intérieur, maximum à une borne
n3.append(variation(
    ENONCE_X,
    [X, var('a', '1..3'), var('r', '2..5'), var('b', 'eval:a*r^2'), var('u', '1..4'),
     var('m', 'eval:r-u'), var('w', '1..5'), var('n', 'eval:r+w')],
    [case('{{eval:2*a*r}}', [
        erreur('{{r}}', ERR_ABSC_R, 'Abscisse au lieu de la valeur'),
        erreur('0', ERR_DERIVEE_NULLE, 'f′(r) au lieu de f(r)'),
        erreur('{{' + FM + '}}', 'Le minimum n\'est pas à une borne : $f$ décroît puis croît, '
               'il est atteint là où $f\'$ s\'annule.', 'Valeur à une borne')]),
     case('{{eval:max((a*m^2+b)/m,(a*n^2+b)/n)}}', [
         erreur('{{eval:min((a*m^2+b)/m,(a*n^2+b)/n)}}', ERR_COMPARE, 'Plus petite des bornes'),
         erreur('{{eval:2*a*r}}', 'C\'est le minimum : ici $f$ n\'a pas de maximum local, le '
                'maximum est à une borne.', 'Minimum pris pour le maximum'),
         erreur('{{n}}', 'Tu as donné une borne de l\'intervalle : la réponse est la valeur de $f$.',
                'Abscisse au lieu de la valeur')])],
    [DERIV + ' Il s\'annule en $x={{r}}$ : $f$ est décroissante sur $\\left[{{m}}\\,;{{r}}\\right]$, '
     'croissante sur $\\left[{{r}}\\,;{{n}}\\right]$.',
     'Minimum : $f({{r}})=' + PRIMAIRE + '{ {{eval:2*a*r}} }$.',
     'Aux bornes : $f({{m}})={{' + FM + '}}$ et $f({{n}})={{' + FN + '}}$ ; maximum : $'
     + PRIMAIRE + '{ {{eval:max((a*m^2+b)/m,(a*n^2+b)/n)}} }$.'],
    HINT_X, ['m >= 1', 'm*n != r^2']))
# a = 1, r = 3, b = 9, m = 1, n = 5 : f(1) = 10, f(5) = 5 + 9/5 = 34/5, f(3) = 6
V = {'a': 1, 'r': 3, 'b': 9, 'u': 2, 'm': 1, 'w': 2, 'n': 5}
n3s += [
    spec('x + 9/x sur [1 ; 5] : min 6, max 10', 0, V, 'correct', ['6', '10']),
    spec('Abscisse 3', 0, V, 'incorrect', ['3', '10'], ERR_ABSC_R),
    spec('0 donné', 0, V, 'incorrect', ['0', '10'], ERR_DERIVEE_NULLE),
    spec('Plus petite borne 34/5', 0, V, 'incorrect', ['6', '\\frac{34}{5}'], ERR_COMPARE),
    spec('Minimum pris pour le maximum', 0, V, 'incorrect', ['6', '6'],
         'C\'est le minimum : ici $f$ n\'a pas de maximum local, le maximum est à une borne.'),
]
# a = 2, r = 2, b = 8, m = 1, n = 6 : f(1) = 10, f(6) = 12 + 4/3 = 40/3, f(2) = 8
V = {'a': 2, 'r': 2, 'b': 8, 'u': 1, 'm': 1, 'w': 4, 'n': 6}
n3s += [spec('2x + 8/x sur [1 ; 6] : min 8, max 40/3', 0, V, 'correct', ['8', '\\frac{40}{3}']),
        spec('max écrit 13,333 (arrondi)', 0, V, 'incorrect', ['8', '13{,}333'])]

# --- V1 : a < 0, b < 0 : maximum en r intérieur, minimum à une borne
n3.append(variation(
    ENONCE_X,
    [X, var('A', '1..3'), var('a', 'eval:-A'), var('r', '2..5'), var('b', 'eval:a*r^2'),
     var('u', '1..4'), var('m', 'eval:r-u'), var('w', '1..5'), var('n', 'eval:r+w')],
    [case('{{eval:min((a*m^2+b)/m,(a*n^2+b)/n)}}', [
        erreur('{{eval:max((a*m^2+b)/m,(a*n^2+b)/n)}}', ERR_COMPARE_MIN, 'Plus grande des bornes'),
        erreur('{{eval:2*a*r}}', 'C\'est le maximum : ici $f$ n\'a pas de minimum local, le '
               'minimum est à une borne.', 'Maximum pris pour le minimum'),
        erreur('{{n}}', 'Tu as donné une borne de l\'intervalle : la réponse est la valeur de $f$.',
               'Abscisse au lieu de la valeur')]),
     case('{{eval:2*a*r}}', [
         erreur('{{r}}', ERR_ABSC_R, 'Abscisse au lieu de la valeur'),
         erreur('0', ERR_DERIVEE_NULLE, 'f′(r) au lieu de f(r)'),
         erreur('{{eval:-2*a*r}}', 'Attention au signe : $a$ et $b$ sont négatifs, $f$ l\'est '
                'aussi sur l\'intervalle.', 'Signe')])],
    [DERIV + ' Il s\'annule en $x={{r}}$ : $f$ est croissante sur $\\left[{{m}}\\,;{{r}}\\right]$, '
     'décroissante sur $\\left[{{r}}\\,;{{n}}\\right]$.',
     'Maximum : $f({{r}})=' + PRIMAIRE + '{ {{eval:2*a*r}} }$.',
     'Aux bornes : $f({{m}})={{' + FM + '}}$ et $f({{n}})={{' + FN + '}}$ ; minimum : $'
     + PRIMAIRE + '{ {{eval:min((a*m^2+b)/m,(a*n^2+b)/n)}} }$.'],
    HINT_X, ['m >= 1', 'm*n != r^2']))
# a = −1, r = 2, b = −4, m = 1, n = 5 : f(1) = −5, f(5) = −5 − 4/5 = −29/5, f(2) = −4
V = {'A': 1, 'a': -1, 'r': 2, 'b': -4, 'u': 1, 'm': 1, 'w': 3, 'n': 5}
n3s += [
    spec('−x − 4/x sur [1 ; 5] : min −29/5, max −4', 1, V, 'correct', ['-\\frac{29}{5}', '-4']),
    spec('min décimal −5,8', 1, V, 'correct', ['-5{,}8', '-4']),
    spec('Plus grande borne −5', 1, V, 'incorrect', ['-5', '-4'], ERR_COMPARE_MIN),
    spec('Max : signe (4)', 1, V, 'incorrect', ['-\\frac{29}{5}', '4'],
         'Attention au signe : $a$ et $b$ sont négatifs, $f$ l\'est aussi sur l\'intervalle.'),
    spec('Max : abscisse 2', 1, V, 'incorrect', ['-\\frac{29}{5}', '2'], ERR_ABSC_R),
]

# --- V2 : a > 0, b < 0 : f croissante, extremums aux bornes
ERR_PAS_DE_RACINE = ('Ici $f\'(x)>0$ sur tout l\'intervalle : $f$ n\'a pas d\'extremum local, '
                     'ses extremums sont aux bornes.')
n3.append(variation(
    ENONCE_X,
    [X, var('a', '1..4'), var('B', '1..9'), var('b', 'eval:-B'), var('m', '1..3'),
     var('w', '2..5'), var('n', 'eval:m+w')],
    [case('{{' + FM + '}}', [
        erreur('{{' + FN + '}}', 'Les extremums sont échangés : $f$ est croissante, son minimum '
               'est à la borne de gauche.', 'Bornes échangées'),
        erreur('{{m}}', 'Tu as donné la borne : la réponse est la valeur de $f$ en cette borne.',
               'Abscisse au lieu de la valeur')]),
     case('{{' + FN + '}}', [
         erreur('{{' + FM + '}}', 'Les extremums sont échangés : $f$ est croissante, son maximum '
                'est à la borne de droite.', 'Bornes échangées'),
         erreur('{{n}}', 'Tu as donné la borne : la réponse est la valeur de $f$ en cette borne.',
                'Abscisse au lieu de la valeur')])],
    [DERIV + ' Or ${{a}}x^2>0$ et ${{eval:-b}}>0$ : $f\'(x)>0$, $f$ est croissante sur '
     '$\\left[{{m}}\\,;{{n}}\\right]$, sans extremum local.',
     'Minimum : $f({{m}})=' + PRIMAIRE + '{ {{' + FM + '}} }$ ; maximum : $f({{n}})=' + PRIMAIRE
     + '{ {{' + FN + '}} }$.'],
    'Écris $f\'(x)$ avec un seul dénominateur : le numérateur peut-il s\'annuler sur '
    'l\'intervalle ? Si non, le sens de variation suffit.'))
# a = 2, b = −3, m = 1, n = 4 : f(1) = −1, f(4) = 8 − 3/4 = 29/4
V = {'a': 2, 'B': 3, 'b': -3, 'm': 1, 'w': 3, 'n': 4}
n3s += [
    spec('2x − 3/x sur [1 ; 4] : min −1, max 29/4', 2, V, 'correct', ['-1', '\\frac{29}{4}']),
    spec('max décimal 7,25', 2, V, 'correct', ['-1', '7{,}25']),
    spec('Bornes échangées', 2, V, 'incorrect', ['\\frac{29}{4}', '-1'],
         'Les extremums sont échangés : $f$ est croissante, son minimum est à la borne de gauche.'),
    spec('Abscisses 1 et 4', 2, V, 'incorrect', ['1', '4'],
         'Tu as donné la borne : la réponse est la valeur de $f$ en cette borne.'),
]

ecrire('n3-ax-plus-b-sur-x-sur-un-intervalle', modele(
    'Maximum et minimum de ax + b/x sur un intervalle',
    'Fonction x ↦ ax + b/x sur un intervalle fermé : extremum local ou valeurs aux bornes, '
    'selon le signe de la dérivée.',
    4, 240, n3, n3s, '1SPE-401'))

print('3 modèles écrits dans', DOSSIER)
