"""Écrit les modèles neufs du chantier idees-1re-exponentielle dans
scripts/questions/idees-1re-exponentielle-neufs/.

Phase 0 : David, le 2026-11-24, « je valide les modèles » (page à cocher
https://claude.ai/artifact/5VS9mynhKPTfaj5KeiCtTk, journal docs/archive/wip/idees-1re-exponentielle/idees-1re-exponentielle-progress.md) :
F1 à F6, six modèles neufs. Les variations de modèles publiés (F7 à F10) attendent sa réponse.

Rangement (migration, après la création en brouillon), nœuds et points vérifiés en base :
F1 1SPE-294, F2 et F3 1SPE-405 (point posé sur la sous-notion « variations »), F4 1SPE-394,
F5 1SPE-396, F6 1SPE-283. Grades 1_SPE seulement.

Bornes de 1re : pas de logarithme (zéros entiers ou rationnels), pas de calcul de limite (aucune
limite dans les tableaux), seule composée e^{ax+b}.

Règles suivies (couvrir-un-niveau.md § 5) : erreurs prévues par case (de vraies erreurs d'élèves),
chacune avec sa spec `incorrect` qui nomme son message ; un coup de pouce par variation, qui ne
donne jamais la réponse. Messages sans variable : la résolution réécrit les formules.

Usage : python3 docs/wip/questions/idees-1re-exponentielle-neufs.py scripts/questions/idees-1re-exponentielle-neufs
"""
import json
import os
import sys
from fractions import Fraction as Fr

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'


# Messages tels que la résolution les réécrit (e → \exponentialE, espaces) : la spec compare
# le message résolu. Relevés par question:specs le 2026-11-24.
REECRIT = {'Une somme $e^{u}+e^{v}$ ne se regroupe pas en une seule exponentielle : développe terme à terme.': 'Une somme $\\exponentialE^u + \\exponentialE^v$ ne se regroupe pas en une seule exponentielle : développe terme à terme.', "N'oublie pas le double produit : $(A+B)^2=A^2+2AB+B^2$.": "N'oublie pas le double produit : $\\left( A + B \\right)^2 = A^2 + 2 AB + B^2$.", "Le double produit est $2AB$ : n'oublie pas le facteur $2$.": "Le double produit est $2 AB$ : n'oublie pas le facteur $2$.", '$e^{u}=1$ équivaut à $u=0$, car $1=e^0$.': '$\\exponentialE^u = 1$ équivaut à $u = 0$, car $1 = \\exponentialE^0$.', "Une exponentielle est strictement positive : $e^{u}=-m$ avec $m>0$ n'a pas de solution.": "Une exponentielle est strictement positive : $\\exponentialE^u = -m$ avec $m > 0$ n'a pas de solution.", 'Attention au signe : $ax+b=0$ équivaut à $x=-\\dfrac{b}{a}$.': 'Attention au signe : $a x + b = 0$ équivaut à $x=-\\dfrac{b}{a}$.', "$e=e^1$ : l'équation $e^{u}=e$ équivaut à $u=1$.": "$\\exponentialE = \\exponentialE^1$ : l'équation $\\exponentialE^u = \\exponentialE$ équivaut à $u = 1$.", "$\\dfrac{1}{e}=e^{-1}$ : l'équation $e^{u}=\\dfrac{1}{e}$ équivaut à $u=-1$.": "$\\dfrac{1}{e}=e^{-1}$ : l'équation $e^{u}=\\dfrac{1}{e}$ équivaut à $u = -1$.", "Ce ne sont pas les exposants qui doivent être nuls, mais les facteurs : $e^{u}+n$ avec $n>0$ ne s'annule jamais.": "Ce ne sont pas les exposants qui doivent être nuls, mais les facteurs : $\\exponentialE^u + n$ avec $n > 0$ ne s'annule jamais.", 'Attention au sens : quand $a<0$, $ax+b$ est positif à gauche de sa racine.': 'Attention au sens : quand $a < 0$, $a x + b$ est positif à gauche de sa racine.', 'Attention au signe de la racine : $ax+b=0$ équivaut à $x=-\\dfrac{b}{a}$.': 'Attention au signe de la racine : $a x + b = 0$ équivaut à $x=-\\dfrac{b}{a}$.', '$e^{u}-1$ change de signe là où $u=0$ : ce facteur compte dans le tableau de signes.': '$\\exponentialE^u - 1$ change de signe là où $u = 0$ : ce facteur compte dans le tableau de signes.', "La dérivée de $ax^2$ est $2ax$ : n'oublie pas le facteur $2$.": "La dérivée de $a x^2$ est $2 a x$ : n'oublie pas le facteur $2$.", "La dérivée de $e^{kx}$ est $ke^{kx}$ : n'oublie pas le facteur $k$.": "La dérivée de $\\exponentialE^{k x}$ est $k \\exponentialE^{k x}$ : n'oublie pas le facteur $k$.", "Le numérateur est $u'v-uv'$, dans cet ordre.": "Le numérateur est $u' v - u v'$, dans cet ordre.", "Le numérateur est $u'v-uv'$, dans cet ordre. Le signe moins compte.": "Le numérateur est $u' v - u v'$, dans cet ordre. Le signe moins compte.", "C'est $f'(x)$ qu'il faut annuler, pas le facteur de $f(x)$ : calcule d'abord $f'(x)$.": "C'est $f'\\left( x \\right)$ qu'il faut annuler, pas le facteur de $f\\left( x \\right)$ : calcule d'abord $f'\\left( x \\right)$.", "Attention au signe : résous $f'(x)=0$.": "Attention au signe : résous $f'\\left( x \\right) = 0$.", "N'oublie pas le facteur exponentiel dans $f(x_0)$.": "N'oublie pas le facteur exponentiel dans $f\\left( x_0 \\right)$.", 'Attention au signe : calcule $f(x_0)$ en remplaçant $x$ par $x_0$.': 'Attention au signe : calcule $f\\left( x_0 \\right)$ en remplaçant $x$ par $x_0$.', "La dérivée de $e^{kx}$ est $ke^{kx}$ : vérifie ta dérivée avant de l'annuler.": "La dérivée de $\\exponentialE^{k x}$ est $k \\exponentialE^{k x}$ : vérifie ta dérivée avant de l'annuler.", "En $x_0$, l'exposant vaut $kx_0$ : remplace $x$ par $x_0$ dans tout l'exposant.": "En $x_0$, l'exposant vaut $k x_0$ : remplace $x$ par $x_0$ dans tout l'exposant.", '$e^{x}=1$ équivaut à $x=0$, car $1=e^0$.': '$\\exponentialE^x = 1$ équivaut à $x = 0$, car $1 = \\exponentialE^0$.', "Résous $f'(x)=0$ : $e^{x}=1$, et non $x$ égal au coefficient.": "Résous $f'\\left( x \\right) = 0$ : $\\exponentialE^x = 1$, et non $x$ égal au coefficient.", "$e^0=1$ : ce terme ne s'annule pas en $0$.": "$\\exponentialE^0 = 1$ : ce terme ne s'annule pas en $0$.", '$e^0=1$ : le terme en $e^{x}$ vaut le coefficient, pas $0$.': '$\\exponentialE^0 = 1$ : le terme en $\\exponentialE^x$ vaut le coefficient, pas $0$.'}


def spec(desc, vi, variables_, status, answers, message=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = REECRIT.get(message, message)
    if status in ('unoptimal_form', 'bad_form'):
        expected['constraintViolations'] = ['form']
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables_.items()},
            'expected': expected, 'answers': answers}


def modele(title, description, level, variations, specs, rangement, shared=None, delay=180,
           options=None):
    sh = {'cleanCoefficients': True}
    if shared:
        sh.update(shared)
    m = {'rangement': rangement, 'title': title, 'description': description, 'grades': ['1_SPE'],
         'level': level, 'delay': delay, 'status': 'draft', 'shared': sh,
         'variations': variations, 'testSpecs': specs}
    if options:
        m['options'] = options
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


def fr(x):
    """Nombre rationnel en LaTeX, comme l'élève le tape."""
    x = Fr(x)
    if x.denominator == 1:
        return str(x.numerator)
    signe = '-' if x < 0 else ''
    return signe + '\\frac{' + str(abs(x.numerator)) + '}{' + str(x.denominator) + '}'


def poly(*coefs):
    """Polynôme en x (coefficients du plus haut degré au plus bas) en LaTeX d'élève."""
    deg = len(coefs) - 1
    out = ''
    for i, c in enumerate(coefs):
        c = Fr(c)
        d = deg - i
        if c == 0:
            continue
        mono = {0: '', 1: 'x'}.get(d, 'x^' + str(d))
        if d == 0:
            t = fr(abs(c))
        elif abs(c) == 1:
            t = mono
        else:
            t = fr(abs(c)) + mono
        if out == '':
            out = ('-' if c < 0 else '') + t
        else:
            out += ('-' if c < 0 else '+') + t
    return out or '0'


def ex(k):
    """e^{kx} en LaTeX d'élève."""
    if k == 1:
        return 'e^{x}'
    if k == -1:
        return 'e^{-x}'
    return 'e^{' + str(k) + 'x}'


X = var('x', 'x|x')

# =============================================================================================
# F1 — Développer avec des exponentielles (1AN30-1, types 4 et 5). Point 1SPE-294.
# Une case ; le résultat est une somme de deux ou trois termes.
# =============================================================================================

HINT_PRODUIT = 'Rappel : $e^{u}\\times e^{v}=e^{u+v}$ et $\\left(e^{u}\\right)^n=e^{nu}$.'
ERR_EXP_MULT = 'Pour un produit, on additionne les exposants : $e^{u}\\times e^{v}=e^{u+v}$.'
ERR_UN_TERME = 'Le facteur devant la parenthèse multiplie les deux termes de la parenthèse.'
ERR_REGROUPE = ('Une somme $e^{u}+e^{v}$ ne se regroupe pas en une seule exponentielle : '
                'développe terme à terme.')
ERR_PUISS_ADD = 'Pour une puissance, on multiplie l\'exposant : $\\left(e^{u}\\right)^n=e^{nu}$.'
ERR_PUISS_PUISS = ('$\\left(e^{u}\\right)^n=e^{nu}$ : l\'exposant est multiplié par $n$, il '
                   'n\'est pas élevé à la puissance $n$.')
ERR_DOUBLE = 'N\'oublie pas le double produit : $(A+B)^2=A^2+2AB+B^2$.'
ERR_CARRE_EXP = ('$\\left(e^{x}\\right)^2=e^{2x}$ : l\'exposant est multiplié par $2$, il n\'est '
                 'pas mis au carré.')
ERR_DOUBLE_2 = 'Le double produit est $2AB$ : n\'oublie pas le facteur $2$.'

f1, f1s = [], []

# v0 — e^{ax}(e^{bx} + e^{cx})
f1.append(variation(
    'Développe et réduis $A=e^{ {{eval:a*x}} }\\left(e^{ {{eval:b*x}} }+e^{ {{eval:c*x}} }\\right)$. '
    'Écris chaque terme sous la forme $e^{\\cdots}$, l\'exposant étant réduit.\n\n$A=?$',
    [X, var('a', '1..5;±'), var('b', '1..5;±'), var('c', '1..5;±')],
    [case('e^{ {{eval:(a+b)*x}} }+e^{ {{eval:(a+c)*x}} }', [
        erreur('e^{ {{eval:a*b*x}} }+e^{ {{eval:a*c*x}} }', ERR_EXP_MULT, 'Exposants multipliés'),
        erreur('e^{ {{eval:(a+b)*x}} }+e^{ {{eval:c*x}} }', ERR_UN_TERME, 'Un seul terme multiplié'),
        erreur('e^{ {{eval:(a+b+c)*x}} }', ERR_REGROUPE, 'Somme regroupée'),
    ])],
    ['On développe : $A=e^{ {{eval:a*x}} }\\times e^{ {{eval:b*x}} }+e^{ {{eval:a*x}} }\\times e^{ {{eval:c*x}} }$.',
     'Pour chaque produit, on additionne les exposants : '
     '$A=' + PRIMAIRE + '{e^{ {{eval:(a+b)*x}} }+e^{ {{eval:(a+c)*x}} } }$.'],
    'Développe d\'abord, puis utilise $e^{u}\\times e^{v}=e^{u+v}$ pour chaque produit.',
    ['a+b != 0', 'a+c != 0', 'b < c', 'a*b != a+b', 'a*c != a+c']))
v = {'a': 2, 'b': -1, 'c': 3}  # e^{2x}(e^{-x} + e^{3x}) = e^{x} + e^{5x}
f1s += [spec('e^{2x}(e^{−x} + e^{3x}) = eˣ + e^{5x}', 0, v, 'correct', ['e^{x}+e^{5x}']),
        spec('Ordre inverse', 0, v, 'correct', ['e^{5x}+e^{x}']),
        spec('Exposants multipliés', 0, v, 'incorrect', ['e^{-2x}+e^{6x}'], ERR_EXP_MULT),
        spec('Un seul terme multiplié', 0, v, 'incorrect', ['e^{x}+e^{3x}'], ERR_UN_TERME),
        spec('Somme regroupée', 0, v, 'incorrect', ['e^{4x}'], ERR_REGROUPE)]

# v1 — (e^{mx})^p − e^{nx} × e^{ox}
f1.append(variation(
    'Réduis $A=\\left(e^{ {{eval:m*x}} }\\right)^{ {{p}} }-e^{ {{eval:n*x}} }\\times e^{ {{eval:o*x}} }$. '
    'Écris chaque terme sous la forme $e^{\\cdots}$, l\'exposant étant réduit.\n\n$A=?$',
    [X, var('m', '2..4'), var('p', '2..3'), var('n', '1..5'), var('o', '1..5')],
    [case('e^{ {{eval:m*p*x}} }-e^{ {{eval:(n+o)*x}} }', [
        erreur('e^{ {{eval:(m+p)*x}} }-e^{ {{eval:(n+o)*x}} }', ERR_PUISS_ADD,
               'Puissance : exposant et n additionnés'),
        erreur('e^{ {{eval:m*p*x}} }-e^{ {{eval:n*o*x}} }', ERR_EXP_MULT, 'Exposants multipliés'),
        erreur('e^{ {{eval:m^p*x}} }-e^{ {{eval:(n+o)*x}} }', ERR_PUISS_PUISS,
               'Exposant élevé à la puissance'),
    ])],
    ['Puissance : $\\left(e^{ {{eval:m*x}} }\\right)^{ {{p}} }=e^{ {{p}}\\times {{eval:m*x}} }=e^{ {{eval:m*p*x}} }$.',
     'Produit : $e^{ {{eval:n*x}} }\\times e^{ {{eval:o*x}} }=e^{ {{eval:(n+o)*x}} }$.',
     'Donc $A=' + PRIMAIRE + '{e^{ {{eval:m*p*x}} }-e^{ {{eval:(n+o)*x}} } }$.'],
    HINT_PRODUIT,
    ['m*p != n+o', 'm+p != m*p', 'n*o != n+o', 'n <= o']))
v = {'m': 4, 'p': 2, 'n': 1, 'o': 4}  # e^{8x} − e^{5x}
f1s += [spec('(e^{4x})² − eˣ·e^{4x} = e^{8x} − e^{5x}', 1, v, 'correct', ['e^{8x}-e^{5x}']),
        spec('Écrit −e^{5x} + e^{8x}', 1, v, 'correct', ['-e^{5x}+e^{8x}']),
        spec('Puissance additionnée', 1, v, 'incorrect', ['e^{6x}-e^{5x}'], ERR_PUISS_ADD),
        spec('Exposants multipliés', 1, v, 'incorrect', ['e^{8x}-e^{4x}'], ERR_EXP_MULT),
        spec('Exposant élevé à la puissance', 1, v, 'incorrect', ['e^{16x}-e^{5x}'], ERR_PUISS_PUISS)]

# v2 — (e^x + a)²
f1.append(variation(
    'Développe et réduis $A=\\left(e^{x}{{a;+}}\\right)^2$.\n\n$A=?$',
    [X, var('a', '1..5;±')],
    [case('e^{2x}{{eval:2*a;+}}e^{x}+{{eval:a^2}}', [
        erreur('e^{2x}+{{eval:a^2}}', ERR_DOUBLE, 'Double produit oublié'),
        erreur('e^{x^2}{{eval:2*a;+}}e^{x}+{{eval:a^2}}', ERR_CARRE_EXP, 'e^{x²} au lieu de e^{2x}'),
        erreur('e^{2x}{{a;+}}e^{x}+{{eval:a^2}}', ERR_DOUBLE_2, 'Facteur 2 oublié'),
    ])],
    ['Identité remarquable : $\\left(e^{x}{{a;+}}\\right)^2=\\left(e^{x}\\right)^2'
     '+2\\times e^{x}\\times{{a;()}}+{{a;()}}^2$.',
     'Or $\\left(e^{x}\\right)^2=e^{2x}$, donc $A=' + PRIMAIRE + '{e^{2x}{{eval:2*a;+}}e^{x}+{{eval:a^2}} }$.'],
    'Utilise l\'identité remarquable $(A+B)^2$ ou $(A-B)^2$, avec $A=e^{x}$, puis '
    '$\\left(e^{x}\\right)^2=e^{2x}$.'))
v = {'a': -3}
f1s += [spec('(eˣ − 3)² = e^{2x} − 6eˣ + 9', 2, v, 'correct', ['e^{2x}-6e^{x}+9']),
        spec('Ordre différent', 2, v, 'correct', ['9-6e^{x}+e^{2x}']),
        spec('Double produit oublié', 2, v, 'incorrect', ['e^{2x}+9'], ERR_DOUBLE),
        spec('e^{x²}', 2, v, 'incorrect', ['e^{x^2}-6e^{x}+9'], ERR_CARRE_EXP),
        spec('Facteur 2 oublié', 2, v, 'incorrect', ['e^{2x}-3e^{x}+9'], ERR_DOUBLE_2)]

ecrire('f1-developper-avec-des-exponentielles', modele(
    'Développer avec des exponentielles',
    'Développer e^{ax}(e^{bx} + e^{cx}), réduire (e^{mx})^p − e^{nx}e^{ox}, développer (eˣ + a)².',
    4, f1, f1s, {'noeud': 'Fonctions > Fonction exponentielle > propriétés algébriques',
                 'point': '1SPE-294'}))

# =============================================================================================
# F2 — Équation produit nul avec une exponentielle (1AN31-2). Point 1SPE-405.
# Case « intervalles » : ensemble fini ou ∅.
# =============================================================================================

INTERVALLES = {'blankDefaults': {'answerKind': 'intervalles'}}
ERR_EU_1 = '$e^{u}=1$ équivaut à $u=0$, car $1=e^0$.'
ERR_OUBLI_EXP = 'Le facteur exponentiel peut aussi s\'annuler : résous aussi cette équation.'
ERR_OUBLI_AFF = 'Le premier facteur s\'annule aussi : n\'oublie pas sa solution.'
ERR_NEG = ('Une exponentielle est strictement positive : $e^{u}=-m$ avec $m>0$ n\'a pas de '
           'solution.')
ERR_SIGNE_AFF = 'Attention au signe : $ax+b=0$ équivaut à $x=-\\dfrac{b}{a}$.'
ERR_E_E0 = '$e=e^1$ : l\'équation $e^{u}=e$ équivaut à $u=1$.'
ERR_1SURE = '$\\dfrac{1}{e}=e^{-1}$ : l\'équation $e^{u}=\\dfrac{1}{e}$ équivaut à $u=-1$.'
HINT_F2 = ('Un produit est nul si et seulement si l\'un de ses facteurs est nul. Pour un facteur '
           'exponentiel, écris le second membre sous la forme $e^{\\cdots}$, ou souviens-toi que '
           '$e^{u}>0$.')
STATEMENT_F2 = ('Résous dans $\\mathbb{R}$ l\'équation $EQ$.\n\nL\'ensemble des solutions est '
                '$S=?$.')

f2, f2s = [], []

# v0 — (ax + b)(e^{cx+d} − 1) = 0
f2.append(variation(
    STATEMENT_F2.replace('EQ', '({{eval:a*x+b}})\\left(e^{ {{eval:c*x+d}} }-1\\right)=0'),
    [X, var('a', '1..5;±'), var('b', '1..6;±'), var('c', '1..4;±'), var('d', '1..6;±')],
    [case('\\{ {{eval:-b/a}} ; {{eval:-d/c}} \\}', [
        erreur('\\{ {{eval:-b/a}} ; {{eval:(1-d)/c}} \\}', ERR_EU_1, 'e^u = 1 lu u = 1'),
        erreur('\\{ {{eval:-b/a}} \\}', ERR_OUBLI_EXP, 'Facteur exponentiel oublié'),
        erreur('\\{ {{eval:-d/c}} \\}', ERR_OUBLI_AFF, 'Facteur affine oublié'),
    ])],
    ['Un produit est nul si et seulement si l\'un de ses facteurs est nul.',
     '${{eval:a*x+b}}=0\\iff x={{eval:-b/a}}$.',
     '$e^{ {{eval:c*x+d}} }-1=0\\iff e^{ {{eval:c*x+d}} }=e^0\\iff {{eval:c*x+d}}=0\\iff x={{eval:-d/c}}$.',
     'Donc $S=' + PRIMAIRE + '{\\left\\{ {{eval:-b/a}}\\,;{{eval:-d/c}}\\right\\} }$.'],
    HINT_F2, ['b*c != a*d', '1-d != 0', '(1-d)*a != -b*c']))
v = {'a': 2, 'b': -6, 'c': 1, 'd': 4}  # (2x − 6)(e^{x+4} − 1) = 0 → {3 ; −4}
f2s += [spec('(2x − 6)(e^{x+4} − 1) = 0 : {3 ; −4}', 0, v, 'correct', ['\\{3;-4\\}']),
        spec('Ordre inverse', 0, v, 'correct', ['\\{-4;3\\}']),
        spec('e^u = 1 lu u = 1', 0, v, 'incorrect', ['\\{3;-3\\}'], ERR_EU_1),
        spec('Facteur exponentiel oublié', 0, v, 'incorrect', ['\\{3\\}'], ERR_OUBLI_EXP),
        spec('Facteur affine oublié', 0, v, 'incorrect', ['\\{-4\\}'], ERR_OUBLI_AFF)]
v = {'a': 3, 'b': 1, 'c': -2, 'd': 3}  # (3x + 1)(e^{-2x+3} − 1) = 0 → {−1/3 ; 3/2}
f2s += [spec('(3x + 1)(e^{−2x+3} − 1) = 0 : {−1/3 ; 3/2}', 0, v, 'correct',
             ['\\{-\\frac{1}{3};\\frac{3}{2}\\}'])]

# v1 — (ax + b)(e^{cx+d} + m) = 0
f2.append(variation(
    STATEMENT_F2.replace('EQ', '({{eval:a*x+b}})\\left(e^{ {{eval:c*x+d}} }+{{m}}\\right)=0'),
    [X, var('a', '1..5;±'), var('b', '1..6;±'), var('c', '1..4;±'), var('d', '-6..6'),
     var('m', '1..5')],
    [case('\\{ {{eval:-b/a}} \\}', [
        erreur('\\{ {{eval:-b/a}} ; {{eval:(-m-d)/c}} \\}', ERR_NEG, 'e^u = −m résolu'),
        erreur('\\{ {{eval:b/a}} \\}', ERR_SIGNE_AFF, 'Signe de la solution'),
    ])],
    ['Un produit est nul si et seulement si l\'un de ses facteurs est nul.',
     '${{eval:a*x+b}}=0\\iff x={{eval:-b/a}}$.',
     '$e^{ {{eval:c*x+d}} }+{{m}}=0\\iff e^{ {{eval:c*x+d}} }=-{{m}}$ : impossible, car une '
     'exponentielle est strictement positive.',
     'Donc $S=' + PRIMAIRE + '{\\left\\{ {{eval:-b/a}}\\right\\} }$.'],
    HINT_F2, ['(-m-d)*a != -b*c']))
v = {'a': 1, 'b': 5, 'c': 2, 'd': 1, 'm': 3}  # (x + 5)(e^{2x+1} + 3) = 0 → {−5}
f2s += [spec('(x + 5)(e^{2x+1} + 3) = 0 : {−5}', 1, v, 'correct', ['\\{-5\\}']),
        spec('e^u = −3 résolu', 1, v, 'incorrect', ['\\{-5;-2\\}'], ERR_NEG),
        spec('Signe de la solution', 1, v, 'incorrect', ['\\{5\\}'], ERR_SIGNE_AFF)]

# v2 — (e^{ax+b} − e)(e^{cx+d} − 1/e) = 0
f2.append(variation(
    STATEMENT_F2.replace('EQ', '\\left(e^{ {{eval:a*x+b}} }-e\\right)\\left(e^{ {{eval:c*x+d}} }'
                               '-\\dfrac{1}{e}\\right)=0'),
    [X, var('a', '1..4;±'), var('b', '-5..5'), var('c', '1..4;±'), var('d', '-5..5')],
    [case('\\{ {{eval:(1-b)/a}} ; {{eval:(-1-d)/c}} \\}', [
        erreur('\\{ {{eval:-b/a}} ; {{eval:(-1-d)/c}} \\}', ERR_E_E0, 'e lu e⁰'),
        erreur('\\{ {{eval:(1-b)/a}} ; {{eval:(1-d)/c}} \\}', ERR_1SURE, '1/e lu e¹'),
    ])],
    ['Un produit est nul si et seulement si l\'un de ses facteurs est nul.',
     '$e^{ {{eval:a*x+b}} }=e=e^1\\iff {{eval:a*x+b}}=1\\iff x={{eval:(1-b)/a}}$.',
     '$e^{ {{eval:c*x+d}} }=\\dfrac{1}{e}=e^{-1}\\iff {{eval:c*x+d}}=-1\\iff x={{eval:(-1-d)/c}}$.',
     'Donc $S=' + PRIMAIRE + '{\\left\\{ {{eval:(1-b)/a}}\\,;{{eval:(-1-d)/c}}\\right\\} }$.'],
    'Écris $e=e^1$ et $\\dfrac{1}{e}=e^{-1}$, puis utilise $e^{u}=e^{v}\\iff u=v$ pour chaque '
    'facteur.',
    ['(1-b)*c != (-1-d)*a', 'b != 0', 'd != 0', '-b*c != (-1-d)*a', '(1-b)*c != (1-d)*a']))
v = {'a': 2, 'b': 3, 'c': 1, 'd': 3}  # e^{2x+3} = e → x = −1 ; e^{x+3} = 1/e → x = −4
f2s += [spec('(e^{2x+3} − e)(e^{x+3} − 1/e) = 0 : {−1 ; −4}', 2, v, 'correct', ['\\{-1;-4\\}']),
        spec('e lu e⁰', 2, v, 'incorrect', ['\\{-\\frac{3}{2};-4\\}'], ERR_E_E0),
        spec('1/e lu e¹', 2, v, 'incorrect', ['\\{-1;-2\\}'], ERR_1SURE)]

# v3 — (e^{ax+b} + n)(e^{cx+d} + m) = 0 → ∅
f2.append(variation(
    STATEMENT_F2.replace('EQ', '\\left(e^{ {{eval:a*x+b}} }+{{n}}\\right)\\left(e^{ {{eval:c*x+d}} }'
                               '+{{m}}\\right)=0'),
    [X, var('a', '1..4;±'), var('b', '-5..5'), var('c', '1..4;±'), var('d', '-5..5'),
     var('n', '1..5'), var('m', '1..5')],
    [case('\\varnothing', [
        erreur('\\{ {{eval:(-n-b)/a}} ; {{eval:(-m-d)/c}} \\}', ERR_NEG, 'e^u = −n résolu'),
        erreur('\\{ {{eval:-b/a}} ; {{eval:-d/c}} \\}',
               'Ce ne sont pas les exposants qui doivent être nuls, mais les facteurs : '
               '$e^{u}+n$ avec $n>0$ ne s\'annule jamais.', 'Exposants annulés'),
    ])],
    ['Un produit est nul si et seulement si l\'un de ses facteurs est nul.',
     '$e^{ {{eval:a*x+b}} }+{{n}}=0\\iff e^{ {{eval:a*x+b}} }=-{{n}}$ : impossible, car une '
     'exponentielle est strictement positive. De même, $e^{ {{eval:c*x+d}} }=-{{m}}$ est impossible.',
     'Aucun facteur ne s\'annule : $S=' + PRIMAIRE + '{\\varnothing}$.'],
    HINT_F2, ['(-n-b)*c != (-m-d)*a', 'b*c != d*a']))
v = {'a': 1, 'b': 2, 'c': -1, 'd': 3, 'n': 4, 'm': 1}
f2s += [spec('(e^{x+2} + 4)(e^{−x+3} + 1) = 0 : ∅', 3, v, 'correct', ['\\varnothing']),
        spec('∅ écrit \\emptyset', 3, v, 'correct', ['\\emptyset']),
        spec('e^u = −4 résolu', 3, v, 'incorrect', ['\\{-6;4\\}'], ERR_NEG),
        spec('Exposants annulés', 3, v, 'incorrect', ['\\{-2;3\\}'],
             'Ce ne sont pas les exposants qui doivent être nuls, mais les facteurs : '
             '$e^{u}+n$ avec $n>0$ ne s\'annule jamais.')]

ecrire('f2-equation-produit-nul-exponentielle', modele(
    'Équation produit nul avec une exponentielle',
    'Résoudre (ax + b)(e^u − 1) = 0, (ax + b)(e^u + m) = 0, (e^u − e)(e^v − 1/e) = 0, '
    '(e^u + n)(e^v + m) = 0 ; réponse en ensemble.',
    4, f2, f2s, {'noeud': 'Fonctions > Fonction exponentielle > variations', 'point': '1SPE-405'},
    INTERVALLES))

# =============================================================================================
# F3 — Inéquation produit avec une exponentielle (1AN31-4). Point 1SPE-405.
# Case « intervalles » (réunion comprise). r = −b/a.
# =============================================================================================

ERR_SENS = 'Attention au sens : quand $a<0$, $ax+b$ est positif à gauche de sa racine.'
ERR_CROCHETS = ('Regarde si l\'inégalité est stricte ou large : la racine est solution '
                'seulement si l\'inégalité est large.')
ERR_SIGNE_RACINE = 'Attention au signe de la racine : $ax+b=0$ équivaut à $x=-\\dfrac{b}{a}$.'
ERR_EXT_INT = ('Dresse le tableau de signes : le produit est négatif là où ses deux facteurs '
               'sont de signes contraires.')
ERR_EXP_SIGNE = ('$e^{u}-1$ change de signe là où $u=0$ : ce facteur compte dans le tableau de '
                 'signes.')
HINT_F3 = ('Dresse le tableau de signes du produit. Une exponentielle seule est strictement '
           'positive.')

f3, f3s = [], []
POS = '[{{eval:-b/a}};+\\infty['
NEG = ']-\\infty;{{eval:-b/a}}]'

# v0 — (ax + b)e^{cx+d} ≥ 0
f3.append(variation(
    'Résous dans $\\mathbb{R}$ l\'inéquation $({{eval:a*x+b}})e^{ {{eval:c*x+d}} }\\geqslant 0$.'
    '\n\nL\'ensemble des solutions est $S=?$.',
    [X, var('a', '1..5;±'), var('b', '1..6;±'), var('c', '1..4;±'), var('d', '-6..6')],
    [case('{{if:a>0|' + POS + '|' + NEG + '}}', [
        erreur('{{if:a>0|' + NEG + '|' + POS + '}}', ERR_SENS, 'Sens inversé'),
        erreur('{{if:a>0|]{{eval:-b/a}};+\\infty[|]-\\infty;{{eval:-b/a}}[}}', ERR_CROCHETS,
               'Crochets ouverts'),
        erreur('{{if:a>0|[{{eval:b/a}};+\\infty[|]-\\infty;{{eval:b/a}}]}}', ERR_SIGNE_RACINE,
               'Signe de la racine'),
    ])],
    ['Pour tout réel $x$, $e^{ {{eval:c*x+d}} }>0$ : le produit a le signe de ${{eval:a*x+b}}$.',
     '${{eval:a*x+b}}\\geqslant 0\\iff x{{if:a>0|\\geqslant|\\leqslant}} {{eval:-b/a}}$'
     '{{if:a<0| (on divise par ${{a}}<0$ : le sens change)|}}.',
     'Donc $S=' + PRIMAIRE + '{ {{if:a>0|' + POS + '|' + NEG + '}} }$.'],
    HINT_F3))
v = {'a': -2, 'b': 6, 'c': 1, 'd': 0}  # (−2x + 6)eˣ ≥ 0 → ]−∞ ; 3]
f3s += [spec('(−2x + 6)eˣ ≥ 0 : ]−∞ ; 3]', 0, v, 'correct', [']-\\infty;3]']),
        spec('Sens inversé', 0, v, 'incorrect', ['[3;+\\infty['], ERR_SENS),
        spec('Crochet ouvert', 0, v, 'incorrect', [']-\\infty;3['], ERR_CROCHETS),
        spec('Signe de la racine', 0, v, 'incorrect', [']-\\infty;-3]'], ERR_SIGNE_RACINE)]
v = {'a': 3, 'b': 2, 'c': -2, 'd': 5}
f3s += [spec('(3x + 2)e^{−2x+5} ≥ 0 : [−2/3 ; +∞[', 0, v, 'correct', ['[-\\frac{2}{3};+\\infty['])]

# v1 — (ax + b)(e^{cx+d} + n) < 0
POS_S = ']{{eval:-b/a}};+\\infty['
NEG_S = ']-\\infty;{{eval:-b/a}}['
f3.append(variation(
    'Résous dans $\\mathbb{R}$ l\'inéquation $({{eval:a*x+b}})\\left(e^{ {{eval:c*x+d}} }+{{n}}\\right)<0$.'
    '\n\nL\'ensemble des solutions est $S=?$.',
    [X, var('a', '1..5;±'), var('b', '1..6;±'), var('c', '1..4;±'), var('d', '-6..6'),
     var('n', '1..5')],
    [case('{{if:a>0|' + NEG_S + '|' + POS_S + '}}', [
        erreur('{{if:a>0|' + POS_S + '|' + NEG_S + '}}', ERR_SENS, 'Sens inversé'),
        erreur('{{if:a>0|]-\\infty;{{eval:-b/a}}]|[{{eval:-b/a}};+\\infty[}}', ERR_CROCHETS,
               'Crochet fermé'),
        erreur('{{if:a>0|]-\\infty;{{eval:b/a}}[|]{{eval:b/a}};+\\infty[}}', ERR_SIGNE_RACINE,
               'Signe de la racine'),
    ])],
    ['Pour tout réel $x$, $e^{ {{eval:c*x+d}} }>0$, donc $e^{ {{eval:c*x+d}} }+{{n}}>0$ : le '
     'produit a le signe de ${{eval:a*x+b}}$.',
     '${{eval:a*x+b}}<0\\iff x{{if:a>0|<|>}}{{eval:-b/a}}$'
     '{{if:a<0| (on divise par ${{a}}<0$ : le sens change)|}}.',
     'Donc $S=' + PRIMAIRE + '{ {{if:a>0|' + NEG_S + '|' + POS_S + '}} }$.'],
    HINT_F3))
v = {'a': 4, 'b': -2, 'c': 1, 'd': -1, 'n': 2}  # (4x − 2)(e^{x−1} + 2) < 0 → ]−∞ ; 1/2[
f3s += [spec('(4x − 2)(e^{x−1} + 2) < 0 : ]−∞ ; 1/2[', 1, v, 'correct', [']-\\infty;\\frac{1}{2}[']),
        spec('Décimal 0,5', 1, v, 'correct', [']-\\infty;0{,}5[']),
        spec('Sens inversé', 1, v, 'incorrect', [']\\frac{1}{2};+\\infty['], ERR_SENS),
        spec('Crochet fermé', 1, v, 'incorrect', [']-\\infty;\\frac{1}{2}]'], ERR_CROCHETS),
        spec('Signe de la racine', 1, v, 'incorrect', [']-\\infty;-\\frac{1}{2}['],
             ERR_SIGNE_RACINE)]

# v2 — (ax + b)(e^{cx+d} − 1) ≤ 0, racines r1 = −b/a < r2 = −d/c
R1, R2 = '{{eval:-b/a}}', '{{eval:-d/c}}'
DEDANS = '[' + R1 + ';' + R2 + ']'
DEHORS = ']-\\infty;' + R1 + ']\\cup[' + R2 + ';+\\infty['
f3.append(variation(
    'Résous dans $\\mathbb{R}$ l\'inéquation $({{eval:a*x+b}})\\left(e^{ {{eval:c*x+d}} }-1\\right)\\leqslant 0$.'
    '\n\nL\'ensemble des solutions est $S=?$.',
    [X, var('a', '1..4;±'), var('b', '1..6;±'), var('c', '1..4;±'), var('d', '1..6;±')],
    [case('{{if:a*c>0|' + DEDANS + '|' + DEHORS + '}}', [
        erreur('{{if:a*c>0|' + DEHORS + '|' + DEDANS + '}}', ERR_EXT_INT, 'Intérieur et extérieur échangés'),
        erreur('{{if:a*c>0|]' + R1 + ';' + R2 + '[|]-\\infty;' + R1 + '[\\cup]' + R2 + ';+\\infty[}}',
               ERR_CROCHETS, 'Crochets ouverts'),
        erreur('{{if:a>0|]-\\infty;' + R1 + ']|[' + R1 + ';+\\infty[}}', ERR_EXP_SIGNE,
               'Facteur exponentiel traité comme positif'),
    ])],
    ['$e^{ {{eval:c*x+d}} }-1\\geqslant 0\\iff e^{ {{eval:c*x+d}} }\\geqslant e^0\\iff {{eval:c*x+d}}\\geqslant 0$ '
     '(l\'exponentielle est strictement croissante) : $e^{ {{eval:c*x+d}} }-1$ a le signe de '
     '${{eval:c*x+d}}$, qui s\'annule en ${{eval:-d/c}}$.',
     '${{eval:a*x+b}}$ s\'annule en ${{eval:-b/a}}$. Dans le tableau de signes, le produit est '
     '{{if:a*c>0|négatif entre les racines|négatif à l\'extérieur des racines}}.',
     'Donc $S=' + PRIMAIRE + '{ {{if:a*c>0|' + DEDANS + '|' + DEHORS + '}} }$.'],
    HINT_F3 + ' Compare $e^{u}$ à $1=e^0$.',
    ['-b*a*c^2 < -d*a^2*c']))  # −b/a < −d/c, multiplié par (ac)² > 0
v = {'a': 1, 'b': 1, 'c': 1, 'd': -2}  # (x + 1)(e^{x−2} − 1) ≤ 0 → [−1 ; 2]
f3s += [spec('(x + 1)(e^{x−2} − 1) ≤ 0 : [−1 ; 2]', 2, v, 'correct', ['[-1;2]']),
        spec('Extérieur au lieu de l\'intérieur', 2, v, 'incorrect',
             [']-\\infty;-1]\\cup[2;+\\infty['], ERR_EXT_INT),
        spec('Crochets ouverts', 2, v, 'incorrect', [']-1;2['], ERR_CROCHETS),
        spec('Facteur exponentiel traité comme positif', 2, v, 'incorrect',
             [']-\\infty;-1]'], ERR_EXP_SIGNE)]
v = {'a': -2, 'b': -2, 'c': 1, 'd': -3}  # (−2x − 2)(e^{x−3} − 1) ≤ 0 → ]−∞ ; −1] ∪ [3 ; +∞[
f3s += [spec('(−2x − 2)(e^{x−3} − 1) ≤ 0 : ]−∞ ; −1] ∪ [3 ; +∞[', 2, v, 'correct',
             [']-\\infty;-1]\\cup[3;+\\infty['])]

ecrire('f3-inequation-produit-exponentielle', modele(
    'Inéquation produit avec une exponentielle',
    'Résoudre (ax + b)e^u ≥ 0, (ax + b)(e^u + n) < 0, (ax + b)(e^u − 1) ≤ 0 ; réponse en '
    'intervalles.',
    5, f3, f3s, {'noeud': 'Fonctions > Fonction exponentielle > variations', 'point': '1SPE-405'},
    INTERVALLES))

# =============================================================================================
# F4 — Dériver un produit avec une exponentielle (1AN32-1 cas 5, 1AN32-2 cas 3 et 6).
# Point 1SPE-394. Réponse factorisée par l'exponentielle, comme 496f958d.
# =============================================================================================

ERR_UPVP = ('La dérivée d\'un produit n\'est pas le produit des dérivées : '
            '$(uv)\'=u\'v+uv\'$.')
ERR_UVP_OUBLI = 'Il manque un terme : $(uv)\'=u\'v+uv\'$.'
ERR_K_OUBLI = 'La dérivée de $e^{kx}$ est $ke^{kx}$ : n\'oublie pas le facteur $k$.'
ERR_SIGNE_PROD = 'Dans $(uv)\'=u\'v+uv\'$, les deux termes s\'additionnent.'
ERR_2A = 'La dérivée de $ax^2$ est $2ax$ : n\'oublie pas le facteur $2$.'
HINT_F4 = ('Écris $f=uv$ avec $u$ le polynôme et $v$ l\'exponentielle, utilise $(uv)\'=u\'v+uv\'$, '
           'puis factorise par l\'exponentielle.')
FORME = 'Calcule $f\'(x)$ et donne le résultat sous la forme FORME.\n\n$f\'(x)=?$'

f4, f4s = [], []

# v0 — (ax² + bx + c)eˣ
f4.append(variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=({{eval:a*x^2+b*x+c}})e^{x}$.\n\n'
    + FORME.replace('FORME', '$(\\ldots)e^{x}$'),
    [X, var('a', '1..4;±'), var('b', '-6..6'), var('c', '-6..6')],
    [case('({{eval:a*x^2+(2*a+b)*x+b+c}})e^{x}', [
        erreur('({{eval:2*a*x+b}})e^{x}', ERR_UPVP, 'u′v′ ou uv′ oublié'),
        erreur('({{eval:-a*x^2+(2*a-b)*x+b-c}})e^{x}', ERR_SIGNE_PROD, 'u′v − uv′'),
        erreur('({{eval:a*x^2+(a+b)*x+b+c}})e^{x}', ERR_2A, 'Dérivée de ax² sans le 2'),
    ])],
    ['$f=uv$ avec $u(x)={{eval:a*x^2+b*x+c}}$ et $v(x)=e^{x}$ : $u\'(x)={{eval:2*a*x+b}}$ et '
     '$v\'(x)=e^{x}$.',
     '$f\'(x)=({{eval:2*a*x+b}})e^{x}+({{eval:a*x^2+b*x+c}})e^{x}$.',
     'On factorise par $e^{x}$ : $f\'(x)=' + PRIMAIRE + '{({{eval:a*x^2+(2*a+b)*x+b+c}})e^{x} }$.'],
    HINT_F4))
v = {'a': 2, 'b': -1, 'c': 3}  # (2x² − x + 3)eˣ → (2x² + 3x + 2)eˣ
f4s += [spec('(2x² − x + 3)eˣ : (2x² + 3x + 2)eˣ', 0, v, 'correct', ['(2x^2+3x+2)e^{x}']),
        spec('eˣ devant', 0, v, 'correct', ['e^{x}(2x^2+3x+2)']),
        spec('Forme développée (forme)', 0, v, 'bad_form', ['2x^2e^{x}+3xe^{x}+2e^{x}']),
        spec('u′v′', 0, v, 'incorrect', ['(4x-1)e^{x}'], ERR_UPVP),
        spec('u′v − uv′', 0, v, 'incorrect', ['(-2x^2+5x-4)e^{x}'], ERR_SIGNE_PROD),
        spec('Dérivée de ax² sans le 2', 0, v, 'incorrect', ['(2x^2+x+2)e^{x}'], ERR_2A)]

# v1 — (ax + b)e^{kx}
f4.append(variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=({{eval:a*x+b}})e^{ {{eval:k*x}} }$.\n\n'
    + FORME.replace('FORME', '$(mx+p)e^{ {{eval:k*x}} }$'),
    [X, var('a', '1..5;±'), var('b', '1..6;±'), var('k', '2..5;±')],
    [case('({{eval:k*a*x+a+k*b}})e^{ {{eval:k*x}} }', [
        erreur('({{eval:a*x+a+b}})e^{ {{eval:k*x}} }', ERR_K_OUBLI, 'Facteur k oublié'),
        erreur('{{eval:k*a}}e^{ {{eval:k*x}} }', ERR_UPVP, 'u′v′'),
        erreur('{{a}}e^{ {{eval:k*x}} }', ERR_UVP_OUBLI, 'uv′ oublié'),
    ])],
    ['$f=uv$ avec $u(x)={{eval:a*x+b}}$ et $v(x)=e^{ {{eval:k*x}} }$ : $u\'(x)={{a}}$ et '
     '$v\'(x)={{k}}e^{ {{eval:k*x}} }$.',
     '$f\'(x)={{if:a==1||{{if:a==-1|-|{{a}}}}}}e^{ {{eval:k*x}} }+({{eval:a*x+b}})\\times{{k;()}}e^{ {{eval:k*x}} }$.',
     'On factorise par $e^{ {{eval:k*x}} }$ : $f\'(x)=' + PRIMAIRE
     + '{({{eval:k*a*x+a+k*b}})e^{ {{eval:k*x}} } }$.'],
    HINT_F4, ['a+k*b != 0']))
v = {'a': 3, 'b': -1, 'k': 2}  # (3x − 1)e^{2x} → (6x + 1)e^{2x}
f4s += [spec('(3x − 1)e^{2x} : (6x + 1)e^{2x}', 1, v, 'correct', ['(6x+1)e^{2x}']),
        spec('e^{2x} devant', 1, v, 'correct', ['e^{2x}(6x+1)']),
        spec('Facteur k oublié', 1, v, 'incorrect', ['(3x+2)e^{2x}'], ERR_K_OUBLI),
        spec('u′v′', 1, v, 'incorrect', ['6e^{2x}'], ERR_UPVP),
        spec('uv′ oublié', 1, v, 'incorrect', ['3e^{2x}'], ERR_UVP_OUBLI)]

# v2 — (ax² + bx + c)e^{kx}
f4.append(variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=({{eval:a*x^2+b*x+c}})e^{ {{eval:k*x}} }$.\n\n'
    + FORME.replace('FORME', '$(\\ldots)e^{ {{eval:k*x}} }$'),
    [X, var('a', '1..3;±'), var('b', '-5..5'), var('c', '-5..5'), var('k', '2..3;±')],
    [case('({{eval:k*a*x^2+(2*a+k*b)*x+b+k*c}})e^{ {{eval:k*x}} }', [
        erreur('({{eval:a*x^2+(2*a+b)*x+b+c}})e^{ {{eval:k*x}} }', ERR_K_OUBLI, 'Facteur k oublié'),
        erreur('({{eval:k*(2*a*x+b)}})e^{ {{eval:k*x}} }', ERR_UPVP, 'u′v′'),
        erreur('({{eval:2*a*x+b}})e^{ {{eval:k*x}} }', ERR_UVP_OUBLI, 'uv′ oublié'),
    ])],
    ['$f=uv$ avec $u(x)={{eval:a*x^2+b*x+c}}$ et $v(x)=e^{ {{eval:k*x}} }$ : '
     '$u\'(x)={{eval:2*a*x+b}}$ et $v\'(x)={{k}}e^{ {{eval:k*x}} }$.',
     '$f\'(x)=({{eval:2*a*x+b}})e^{ {{eval:k*x}} }+({{eval:a*x^2+b*x+c}})\\times{{k;()}}e^{ {{eval:k*x}} }$.',
     'On factorise par $e^{ {{eval:k*x}} }$ : $f\'(x)=' + PRIMAIRE
     + '{({{eval:k*a*x^2+(2*a+k*b)*x+b+k*c}})e^{ {{eval:k*x}} } }$.'],
    HINT_F4))
v = {'a': 1, 'b': 2, 'c': -3, 'k': -2}  # (x² + 2x − 3)e^{−2x} → (−2x² − 2x + 8)e^{−2x}
f4s += [spec('(x² + 2x − 3)e^{−2x} : (−2x² − 2x + 8)e^{−2x}', 2, v, 'correct',
             ['(-2x^2-2x+8)e^{-2x}']),
        spec('Facteur k oublié', 2, v, 'incorrect', ['(x^2+4x-1)e^{-2x}'], ERR_K_OUBLI),
        spec('u′v′', 2, v, 'incorrect', ['(-4x-4)e^{-2x}'], ERR_UPVP),
        spec('uv′ oublié', 2, v, 'incorrect', ['(2x+2)e^{-2x}'], ERR_UVP_OUBLI)]

ecrire('f4-deriver-produit-avec-exponentielle', modele(
    'Dériver un produit avec une exponentielle',
    'Dériver (ax² + bx + c)eˣ, (ax + b)e^{kx}, (ax² + bx + c)e^{kx} ; réponse factorisée par '
    'l\'exponentielle.',
    3, f4, f4s, {'noeud': 'Fonctions > Dérivation > opérations sur les dérivées',
                 'point': '1SPE-394'}))

# =============================================================================================
# F5 — Dériver un quotient avec une exponentielle (1AN32-1 cas 3, 4, 6, 7 ; 1AN32-2 cas 4).
# Point 1SPE-396.
# =============================================================================================

ERR_QUOT_SIGNE = 'Le numérateur est $u\'v-uv\'$, dans cet ordre.'
ERR_QUOT_DIV = ('La dérivée d\'un quotient n\'est pas le quotient des dérivées : '
                '$\\left(\\dfrac{u}{v}\\right)\'=\\dfrac{u\'v-uv\'}{v^2}$.')
ERR_QUOT_CARRE = 'Le dénominateur de la dérivée est $v^2$ : n\'oublie pas le carré.'
HINT_F5 = ('Écris $f=\\dfrac{u}{v}$, calcule $u\'$ et $v\'$, puis utilise '
           '$\\left(\\dfrac{u}{v}\\right)\'=\\dfrac{u\'v-uv\'}{v^2}$. Factorise le numérateur par '
           'l\'exponentielle.')
DERIVE = '\n\nCalcule $f\'(x)$.\n\n$f\'(x)=?$'

f5, f5s = [], []

# v0 — k eˣ/(ax + b)
f5.append(variation(
    'Soit $f$ la fonction définie pour $x\\neq{{eval:-b/a}}$ par '
    '$f(x)=\\dfrac{ {{k}}e^{x} }{ {{eval:a*x+b}} }$.' + DERIVE,
    [X, var('k', '2..5;±'), var('a', '1..4;±'), var('b', '1..6;±')],
    [case('\\frac{ {{k}}({{eval:a*x+b-a}})e^{x} }{({{eval:a*x+b}})^2}', [
        erreur('\\frac{ {{k}}({{eval:-a*x-b+a}})e^{x} }{({{eval:a*x+b}})^2}', ERR_QUOT_SIGNE,
               'uv′ − u′v'),
        erreur('\\frac{ {{k}}e^{x} }{ {{a}} }', ERR_QUOT_DIV, 'u′/v′'),
        erreur('\\frac{ {{k}}({{eval:a*x+b-a}})e^{x} }{ {{eval:a*x+b}} }', ERR_QUOT_CARRE,
               'Dénominateur sans carré'),
    ])],
    ['$f=\\dfrac{u}{v}$ avec $u(x)={{k}}e^{x}$, $v(x)={{eval:a*x+b}}$ : $u\'(x)={{k}}e^{x}$ et '
     '$v\'(x)={{a}}$.',
     '$f\'(x)=\\dfrac{ {{k}}e^{x}({{eval:a*x+b}}){{eval:-k*a;+}}e^{x} }{({{eval:a*x+b}})^2}$.',
     'On factorise le numérateur par ${{k}}e^{x}$ : $f\'(x)=' + PRIMAIRE
     + '{\\dfrac{ {{k}}({{eval:a*x+b-a}})e^{x} }{({{eval:a*x+b}})^2} }$.'],
    HINT_F5, ['b != a']))
v = {'k': 3, 'a': 2, 'b': 5}  # 3eˣ/(2x + 5) → 3(2x + 3)eˣ/(2x + 5)²
f5s += [spec('3eˣ/(2x + 5) : 3(2x + 3)eˣ/(2x + 5)²', 0, v, 'correct',
             ['\\frac{3(2x+3)e^{x}}{(2x+5)^2}']),
        spec('eˣ en tête', 0, v, 'correct', ['\\frac{3e^{x}(2x+3)}{(2x+5)^2}']),
        spec('uv′ − u′v', 0, v, 'incorrect', ['\\frac{3(-2x-3)e^{x}}{(2x+5)^2}'], ERR_QUOT_SIGNE),
        spec('u′/v′', 0, v, 'incorrect', ['\\frac{3e^{x}}{2}'], ERR_QUOT_DIV),
        spec('Dénominateur sans carré', 0, v, 'incorrect', ['\\frac{3(2x+3)e^{x}}{2x+5}'],
             ERR_QUOT_CARRE)]

# v1 — (ax + b)/eˣ
f5.append(variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=\\dfrac{ {{eval:a*x+b}} }{e^{x}}$.'
    + DERIVE,
    [X, var('a', '1..5;±'), var('b', '1..6;±')],
    [case('\\frac{ {{eval:-a*x+a-b}} }{e^{x}}', [
        erreur('\\frac{ {{eval:a*x-a+b}} }{e^{x}}', ERR_QUOT_SIGNE, 'uv′ − u′v'),
        erreur('\\frac{ {{a}} }{e^{x}}', ERR_QUOT_DIV, 'u′/v′'),
        erreur('\\frac{ {{eval:a*x+a+b}} }{e^{x}}', ERR_QUOT_SIGNE + ' Le signe moins compte.',
               'u′v + uv′'),
    ])],
    ['$f=\\dfrac{u}{v}$ avec $u(x)={{eval:a*x+b}}$, $v(x)=e^{x}$ : $u\'(x)={{a}}$ et '
     '$v\'(x)=e^{x}$.',
     '$f\'(x)=\\dfrac{ {{a}}e^{x}-({{eval:a*x+b}})e^{x} }{\\left(e^{x}\\right)^2}'
     '=\\dfrac{e^{x}({{eval:-a*x+a-b}})}{e^{2x}}$.',
     'On simplifie par $e^{x}$ : $f\'(x)=' + PRIMAIRE + '{\\dfrac{ {{eval:-a*x+a-b}} }{e^{x}} }$.'],
    HINT_F5, ['a != b']))
v = {'a': 2, 'b': 1}  # (2x + 1)/eˣ → (−2x + 1)/eˣ
f5s += [spec('(2x + 1)/eˣ : (−2x + 1)/eˣ', 1, v, 'correct', ['\\frac{-2x+1}{e^{x}}']),
        spec('Écrit (1 − 2x)e^{−x}', 1, v, 'unoptimal_form', ['(1-2x)e^{-x}']),
        spec('uv′ − u′v', 1, v, 'incorrect', ['\\frac{2x-1}{e^{x}}'], ERR_QUOT_SIGNE),
        spec('u′/v′', 1, v, 'incorrect', ['\\frac{2}{e^{x}}'], ERR_QUOT_DIV),
        spec('u′v + uv′', 1, v, 'incorrect', ['\\frac{2x+3}{e^{x}}'],
             ERR_QUOT_SIGNE + ' Le signe moins compte.')]

# v2 — k eˣ/(x² + c)
f5.append(variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par '
    '$f(x)=\\dfrac{ {{k}}e^{x} }{x^2+{{c}}}$.' + DERIVE,
    [X, var('k', '2..5;±'), var('c', '1..9')],
    [case('\\frac{ {{k}}({{eval:x^2-2*x+c}})e^{x} }{(x^2+{{c}})^2}', [
        erreur('\\frac{ {{k}}({{eval:-x^2+2*x-c}})e^{x} }{(x^2+{{c}})^2}', ERR_QUOT_SIGNE,
               'uv′ − u′v'),
        erreur('\\frac{ {{k}}e^{x} }{2x}', ERR_QUOT_DIV, 'u′/v′'),
        erreur('\\frac{ {{k}}({{eval:x^2-2*x+c}})e^{x} }{x^2+{{c}}}', ERR_QUOT_CARRE,
               'Dénominateur sans carré'),
    ])],
    ['$f=\\dfrac{u}{v}$ avec $u(x)={{k}}e^{x}$, $v(x)=x^2+{{c}}$ : $u\'(x)={{k}}e^{x}$ et '
     '$v\'(x)=2x$.',
     '$f\'(x)=\\dfrac{ {{k}}e^{x}(x^2+{{c}}){{eval:-2*k;+}}xe^{x} }{(x^2+{{c}})^2}$.',
     'On factorise le numérateur par ${{k}}e^{x}$ : $f\'(x)=' + PRIMAIRE
     + '{\\dfrac{ {{k}}({{eval:x^2-2*x+c}})e^{x} }{(x^2+{{c}})^2} }$.'],
    HINT_F5))
v = {'k': 2, 'c': 3}
f5s += [spec('2eˣ/(x² + 3) : 2(x² − 2x + 3)eˣ/(x² + 3)²', 2, v, 'correct',
             ['\\frac{2(x^2-2x+3)e^{x}}{(x^2+3)^2}']),
        spec('uv′ − u′v', 2, v, 'incorrect', ['\\frac{2(-x^2+2x-3)e^{x}}{(x^2+3)^2}'],
             ERR_QUOT_SIGNE),
        spec('u′/v′', 2, v, 'incorrect', ['\\frac{2e^{x}}{2x}'], ERR_QUOT_DIV),
        spec('Dénominateur sans carré', 2, v, 'incorrect', ['\\frac{2(x^2-2x+3)e^{x}}{x^2+3}'],
             ERR_QUOT_CARRE)]

# v3 — (ax² + bx + c)/eˣ
f5.append(variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par '
    '$f(x)=\\dfrac{ {{eval:a*x^2+b*x+c}} }{e^{x}}$.' + DERIVE,
    [X, var('a', '1..3;±'), var('b', '-5..5'), var('c', '-5..5')],
    [case('\\frac{ {{eval:-a*x^2+(2*a-b)*x+b-c}} }{e^{x}}', [
        erreur('\\frac{ {{eval:a*x^2+(b-2*a)*x+c-b}} }{e^{x}}', ERR_QUOT_SIGNE, 'uv′ − u′v'),
        erreur('\\frac{ {{eval:2*a*x+b}} }{e^{x}}', ERR_QUOT_DIV, 'u′/v′'),
        erreur('\\frac{ {{eval:a*x^2+(2*a+b)*x+b+c}} }{e^{x}}',
               ERR_QUOT_SIGNE + ' Le signe moins compte.', 'u′v + uv′'),
    ])],
    ['$f=\\dfrac{u}{v}$ avec $u(x)={{eval:a*x^2+b*x+c}}$, $v(x)=e^{x}$ : '
     '$u\'(x)={{eval:2*a*x+b}}$ et $v\'(x)=e^{x}$.',
     '$f\'(x)=\\dfrac{({{eval:2*a*x+b}})e^{x}-({{eval:a*x^2+b*x+c}})e^{x} }{\\left(e^{x}\\right)^2}'
     '=\\dfrac{e^{x}({{eval:-a*x^2+(2*a-b)*x+b-c}})}{e^{2x}}$.',
     'On simplifie par $e^{x}$ : $f\'(x)=' + PRIMAIRE
     + '{\\dfrac{ {{eval:-a*x^2+(2*a-b)*x+b-c}} }{e^{x}} }$.'],
    HINT_F5))
v = {'a': 1, 'b': -3, 'c': 2}  # (x² − 3x + 2)/eˣ → (−x² + 5x − 5)/eˣ
f5s += [spec('(x² − 3x + 2)/eˣ : (−x² + 5x − 5)/eˣ', 3, v, 'correct',
             ['\\frac{-x^2+5x-5}{e^{x}}']),
        spec('uv′ − u′v', 3, v, 'incorrect', ['\\frac{x^2-5x+5}{e^{x}}'], ERR_QUOT_SIGNE),
        spec('u′/v′', 3, v, 'incorrect', ['\\frac{2x-3}{e^{x}}'], ERR_QUOT_DIV),
        spec('u′v + uv′', 3, v, 'incorrect', ['\\frac{x^2-x-1}{e^{x}}'],
             ERR_QUOT_SIGNE + ' Le signe moins compte.')]

# v4 — m e^{kx}/(ax + b)
f5.append(variation(
    'Soit $f$ la fonction définie pour $x\\neq{{eval:-b/a}}$ par '
    '$f(x)=\\dfrac{ {{m}}e^{ {{eval:k*x}} } }{ {{eval:a*x+b}} }$.' + DERIVE,
    [X, var('m', '2..5'), var('k', '2..4;±'), var('a', '1..4;±'), var('b', '1..6;±')],
    [case('\\frac{ {{m}}({{eval:k*a*x+k*b-a}})e^{ {{eval:k*x}} } }{({{eval:a*x+b}})^2}', [
        erreur('\\frac{ {{m}}({{eval:a*x+b-a}})e^{ {{eval:k*x}} } }{({{eval:a*x+b}})^2}',
               ERR_K_OUBLI, 'Facteur k oublié'),
        erreur('\\frac{ {{m}}({{eval:-k*a*x-k*b+a}})e^{ {{eval:k*x}} } }{({{eval:a*x+b}})^2}',
               ERR_QUOT_SIGNE, 'uv′ − u′v'),
        erreur('\\frac{ {{m}}({{eval:k*a*x+k*b-a}})e^{ {{eval:k*x}} } }{ {{eval:a*x+b}} }',
               ERR_QUOT_CARRE, 'Dénominateur sans carré'),
    ])],
    ['$f=\\dfrac{u}{v}$ avec $u(x)={{m}}e^{ {{eval:k*x}} }$, $v(x)={{eval:a*x+b}}$ : '
     '$u\'(x)={{eval:m*k}}e^{ {{eval:k*x}} }$ et $v\'(x)={{a}}$.',
     '$f\'(x)=\\dfrac{ {{eval:m*k}}e^{ {{eval:k*x}} }({{eval:a*x+b}})-{{m}}e^{ {{eval:k*x}} }\\times{{a;()}} }'
     '{({{eval:a*x+b}})^2}$.',
     'On factorise le numérateur par ${{m}}e^{ {{eval:k*x}} }$ : $f\'(x)=' + PRIMAIRE
     + '{\\dfrac{ {{m}}({{eval:k*a*x+k*b-a}})e^{ {{eval:k*x}} } }{({{eval:a*x+b}})^2} }$.'],
    HINT_F5, ['k*b != a', 'b != a']))
v = {'m': 2, 'k': 3, 'a': 1, 'b': 2}  # 2e^{3x}/(x + 2) → 2(3x + 5)e^{3x}/(x + 2)²
f5s += [spec('2e^{3x}/(x + 2) : 2(3x + 5)e^{3x}/(x + 2)²', 4, v, 'correct',
             ['\\frac{2(3x+5)e^{3x}}{(x+2)^2}']),
        spec('Facteur k oublié', 4, v, 'incorrect', ['\\frac{2(x+1)e^{3x}}{(x+2)^2}'], ERR_K_OUBLI),
        spec('uv′ − u′v', 4, v, 'incorrect', ['\\frac{2(-3x-5)e^{3x}}{(x+2)^2}'], ERR_QUOT_SIGNE),
        spec('Dénominateur sans carré', 4, v, 'incorrect', ['\\frac{2(3x+5)e^{3x}}{x+2}'],
             ERR_QUOT_CARRE)]

ecrire('f5-deriver-quotient-avec-exponentielle', modele(
    'Dériver un quotient avec une exponentielle',
    'Dériver keˣ/(ax + b), (ax + b)/eˣ, keˣ/(x² + c), (ax² + bx + c)/eˣ, me^{kx}/(ax + b).',
    4, f5, f5s, {'noeud': 'Fonctions > Dérivation > opérations sur les dérivées',
                 'point': '1SPE-396'}, options={'constraints': {'form': 'warn'}}))

# =============================================================================================
# F6 — Tableau de variations d'une fonction avec exponentielle (1AN33-1 à 4). Point 1SPE-283.
# Tableau à compléter : x₀, signes de f′, flèches, valeur de l'extremum. Aucune limite (1re).
# Cases dans l'ordre de lecture : x₀, signe, signe, flèche, valeur, flèche.
# =============================================================================================

ERR_X0_U = ('C\'est $f\'(x)$ qu\'il faut annuler, pas le facteur de $f(x)$ : calcule d\'abord '
            '$f\'(x)$.')
ERR_X0_SIGNE = 'Attention au signe : résous $f\'(x)=0$.'
ERR_VAL_E = 'N\'oublie pas le facteur exponentiel dans $f(x_0)$.'
ERR_VAL_SIGNE = 'Attention au signe : calcule $f(x_0)$ en remplaçant $x$ par $x_0$.'
ERR_X0_K = 'La dérivée de $e^{kx}$ est $ke^{kx}$ : vérifie ta dérivée avant de l\'annuler.'
ERR_VAL_KX = 'En $x_0$, l\'exposant vaut $kx_0$ : remplace $x$ par $x_0$ dans tout l\'exposant.'
ERR_X0_1 = '$e^{x}=1$ équivaut à $x=0$, car $1=e^0$.'
ERR_VAL_E0 = '$e^0=1$ : ce terme ne s\'annule pas en $0$.'
HINT_F6 = ('Calcule $f\'(x)$ et factorise-la. Une exponentielle est strictement positive : le '
           'signe de $f\'(x)$ est celui de l\'autre facteur.')
VIDE = ''


def tableau(x0, s1, s2, valeur, pos, nom='f'):
    return ('```variation\nvariable: x\ndomain: -inf, ?' + x0 + ', +inf\n\n'
            'sign: ' + nom + '\'(x)\n  -inf,' + x0 + ': ?' + s1 + '\n  ' + x0 + ': z\n  '
            + x0 + ',+inf: ?' + s2 + '\n\n'
            'variation: ' + nom + '(x)\n  ' + x0 + ': ?' + valeur + ', ' + pos + '\n  -inf,' + x0
            + ': ?flèche\n  ' + x0 + ',+inf: ?flèche\n```')


def cases_tableau(err_x0, err_val):
    return [case(VIDE, err_x0), case(VIDE), case(VIDE), case(VIDE), case(VIDE, err_val), case(VIDE)]


f6, f6s = [], []

# v0 — (ax + b)eˣ, x₀ = −(a + b)/a entier ; f(x₀) = −a·e^{x₀}
EXP_X0 = '{{if:x0==1|e|e^{ {{x0}} }}}'
f6.append(variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=({{eval:a*x+b}})e^{x}$.\n\n'
    'Étudie le signe de $f\'(x)$, puis complète le tableau de variations de $f$.\n\n'
    + tableau('{{x0}}', '{{if:a>0|-|+}}', '{{if:a>0|+|-}}', '{{eval:-a}}' + EXP_X0,
              '{{if:a>0|bottom|top}}'),
    [X, var('a', '2..3;±'), var('x0', '-3|-2|-1|1|2|3'), var('b', 'eval:-a*x0-a')],
    cases_tableau(
        [erreur('{{eval:-b/a}}', ERR_X0_U, 'Racine de ax + b'),
         erreur('{{eval:-x0}}', ERR_X0_SIGNE, 'Signe de x₀')],
        [erreur('{{eval:-a}}', ERR_VAL_E, 'Facteur exponentiel oublié'),
         erreur('{{a}}' + EXP_X0, ERR_VAL_SIGNE, 'Signe de la valeur')]),
    ['$f=uv$ avec $u(x)={{eval:a*x+b}}$ et $v(x)=e^{x}$ : '
     '$f\'(x)={{a}}e^{x}+({{eval:a*x+b}})e^{x}=({{eval:a*x+a+b}})e^{x}$.',
     '$e^{x}>0$ : $f\'(x)$ a le signe de ${{eval:a*x+a+b}}$, qui s\'annule en '
     '$x_0=' + PRIMAIRE + '{ {{x0}} }$ ; {{if:a>0|négatif avant, positif après|positif avant, '
     'négatif après}}.',
     '$f$ est {{if:a>0|décroissante puis croissante|croissante puis décroissante}}, '
     'avec un {{if:a>0|minimum|maximum}} : $f({{x0}})=({{eval:a*x0+b}})' + EXP_X0 + '='
     + PRIMAIRE + '{ {{eval:-a}}' + EXP_X0 + '}$.'],
    HINT_F6, ['b != 0']))
v = {'a': 2, 'x0': -2, 'b': 2}  # (2x + 2)eˣ : f′ = (2x + 4)eˣ, x₀ = −2, f(−2) = −2e^{−2}
f6s += [spec('(2x + 2)eˣ : −2, −, +, ↘, −2e^{−2}, ↗', 0, v, 'correct',
             ['-2', '-', '+', '↘', '-2e^{-2}', '↗']),
        spec('Valeur écrite −2/e²', 0, v, 'correct',
             ['-2', '-', '+', '↘', '-\\frac{2}{e^2}', '↗']),
        spec('Racine de ax + b', 0, v, 'incorrect', ['-1', '-', '+', '↘', '-2e^{-2}', '↗'], ERR_X0_U),
        spec('Signe de x₀', 0, v, 'incorrect', ['2', '-', '+', '↘', '-2e^{-2}', '↗'], ERR_X0_SIGNE),
        spec('Flèches inversées', 0, v, 'incorrect', ['-2', '-', '+', '↗', '-2e^{-2}', '↘']),
        spec('Facteur exponentiel oublié', 0, v, 'incorrect', ['-2', '-', '+', '↘', '-2', '↗'],
             ERR_VAL_E),
        spec('Signe de la valeur', 0, v, 'incorrect', ['-2', '-', '+', '↘', '2e^{-2}', '↗'],
             ERR_VAL_SIGNE)]
v = {'a': -3, 'x0': 1, 'b': 6}  # (−3x + 6)eˣ : f′ = (−3x + 3)eˣ, x₀ = 1, max 3e
f6s += [spec('(−3x + 6)eˣ : 1, +, −, ↗, 3e, ↘', 0, v, 'correct',
             ['1', '+', '-', '↗', '3e', '↘'])]

# v1 — (px + q)e^{kx}, p = kr, q = −r(kx₀ + 1) ; f′ = kp(x − x₀)e^{kx}, f(x₀) = −r·e^{kx₀}
EXP_KX0 = 'e^{ {{eval:k*x0}} }'
VAL_R = '{{if:r==1|-|{{if:r==-1||{{eval:-r}}}}}}' + EXP_KX0
f6.append(variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par '
    '$f(x)=({{eval:p*x+q}})e^{ {{eval:k*x}} }$.\n\n'
    'Étudie le signe de $f\'(x)$, puis complète le tableau de variations de $f$.\n\n'
    + tableau('{{x0}}', '{{if:r>0|-|+}}', '{{if:r>0|+|-}}', VAL_R, '{{if:r>0|bottom|top}}'),
    [X, var('k', '2|3|-2|-3'), var('r', '1..2;±'), var('x0', '-2|-1|1|2'), var('p', 'eval:k*r'),
     var('q', 'eval:-r*(k*x0+1)')],
    cases_tableau(
        [erreur('{{eval:-x0}}', ERR_X0_SIGNE, 'Signe de x₀'),
         erreur('{{eval:-(p+q)/p}}', ERR_X0_K, 'Facteur k oublié dans la dérivée')],
        [erreur('{{eval:-r}}', ERR_VAL_E, 'Facteur exponentiel oublié'),
         erreur('{{if:r==1|-|{{if:r==-1||{{eval:-r}}}}}}e^{ {{x0}} }', ERR_VAL_KX,
                'Exposant x₀ au lieu de kx₀')]),
    ['$f=uv$ avec $u(x)={{eval:p*x+q}}$ et $v(x)=e^{ {{eval:k*x}} }$ : '
     '$f\'(x)={{p}}e^{ {{eval:k*x}} }+({{eval:p*x+q}})\\times{{k;()}}e^{ {{eval:k*x}} }'
     '=({{eval:k*p*x+p+k*q}})e^{ {{eval:k*x}} }$.',
     '$e^{ {{eval:k*x}} }>0$ : $f\'(x)$ a le signe de ${{eval:k*p*x+p+k*q}}$, qui s\'annule en '
     '$x_0=' + PRIMAIRE + '{ {{x0}} }$ ; {{if:r>0|négatif avant, positif après|positif avant, '
     'négatif après}}.',
     '$f$ est {{if:r>0|décroissante puis croissante|croissante puis décroissante}}, '
     'avec un {{if:r>0|minimum|maximum}} : $f({{x0}})=({{eval:p*x0+q}})' + EXP_KX0 + '='
     + PRIMAIRE + '{' + VAL_R + '}$.'],
    HINT_F6, ['q != 0', '-(p+q)*1 != x0*p']))
v = {'k': 2, 'r': 1, 'x0': 1, 'p': 2, 'q': -3}  # (2x − 3)e^{2x} : f′ = (4x − 4)e^{2x}, min −e²
f6s += [spec('(2x − 3)e^{2x} : 1, −, +, ↘, −e², ↗', 1, v, 'correct',
             ['1', '-', '+', '↘', '-e^{2}', '↗']),
        spec('Signe de x₀', 1, v, 'incorrect', ['-1', '-', '+', '↘', '-e^{2}', '↗'], ERR_X0_SIGNE),
        spec('Facteur k oublié', 1, v, 'incorrect', ['\\frac{1}{2}', '-', '+', '↘', '-e^{2}', '↗'],
             ERR_X0_K),
        spec('Facteur exponentiel oublié', 1, v, 'incorrect', ['1', '-', '+', '↘', '-1', '↗'],
             ERR_VAL_E),
        spec('Exposant x₀', 1, v, 'incorrect', ['1', '-', '+', '↘', '-e', '↗'], ERR_VAL_KX)]

# v2 — f(x) = ax − a·eˣ + c ; f′ = a(1 − eˣ), x₀ = 0, f(0) = c − a
f6.append(variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)={{eval:a*x+c}}{{eval:-a;+}}e^{x}$.\n\n'
    'Étudie le signe de $f\'(x)$, puis complète le tableau de variations de $f$.\n\n'
    + tableau('0', '{{if:a>0|+|-}}', '{{if:a>0|-|+}}', '{{eval:c-a}}', '{{if:a>0|top|bottom}}'),
    [X, var('a', '2..4;±'), var('c', '-5..5')],
    cases_tableau(
        [erreur('1', ERR_X0_1, 'eˣ = 1 lu x = 1'),
         erreur('{{a}}', 'Résous $f\'(x)=0$ : $e^{x}=1$, et non $x$ égal au coefficient.',
                'Coefficient au lieu de x₀')],
        [erreur('{{c}}', ERR_VAL_E0, 'e⁰ lu 0'),
         erreur('{{eval:c+a}}', ERR_VAL_SIGNE, 'Signe de la valeur')]),
    ['$f\'(x)={{a}}{{eval:-a;+}}e^{x}={{a}}\\left(1-e^{x}\\right)$.',
     '$1-e^{x}\\geqslant 0\\iff e^{x}\\leqslant e^0\\iff x\\leqslant 0$ (l\'exponentielle est '
     'strictement croissante) : $1-e^{x}$ est positif avant $0$, négatif après, et $f\'(x)$ a '
     'en plus le signe de ${{a}}$.',
     '$f$ est {{if:a>0|croissante puis décroissante|décroissante puis croissante}}, '
     'avec un {{if:a>0|maximum|minimum}} : $f(0)={{c}}{{eval:-a;+}}e^0=' + PRIMAIRE + '{ {{eval:c-a}} }$.'],
    'Calcule $f\'(x)$ et factorise-la. Pour son signe, compare $e^{x}$ à $1=e^0$.',
    ))
v = {'a': 3, 'c': 1}  # 3x + 1 − 3eˣ : f′ = 3(1 − eˣ), max f(0) = −2
f6s += [spec('3x + 1 − 3eˣ : 0, +, −, ↗, −2, ↘', 2, v, 'correct', ['0', '+', '-', '↗', '-2', '↘']),
        spec('eˣ = 1 lu x = 1', 2, v, 'incorrect', ['1', '+', '-', '↗', '-2', '↘'], ERR_X0_1),
        spec('Coefficient au lieu de x₀', 2, v, 'incorrect', ['3', '+', '-', '↗', '-2', '↘'],
             'Résous $f\'(x)=0$ : $e^{x}=1$, et non $x$ égal au coefficient.'),
        spec('e⁰ lu 0', 2, v, 'incorrect', ['0', '+', '-', '↗', '1', '↘'], ERR_VAL_E0),
        spec('Signe de la valeur', 2, v, 'incorrect', ['0', '+', '-', '↗', '4', '↘'], ERR_VAL_SIGNE),
        spec('Signes de f′ échangés', 2, v, 'incorrect', ['0', '-', '+', '↗', '-2', '↘'])]

# v3 — f′(x) = (eˣ − 1)(eˣ + b) donnée (1AN33-2) ; f(x) = e^{2x}/2 + (b − 1)eˣ − bx, min f(0) = b − 1/2
f6.append(variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par '
    '$f(x)=\\dfrac{e^{2x}}{2}+{{eval:b-1}}e^{x}-{{b}}x$. On admet que pour tout réel $x$, '
    '$f\'(x)=\\left(e^{x}-1\\right)\\left(e^{x}+{{b}}\\right)$.\n\n'
    'Étudie le signe de $f\'(x)$, puis complète le tableau de variations de $f$.\n\n'
    + tableau('0', '-', '+', '{{eval:b-1/2}}', 'bottom'),
    [var('b', '3..6')],
    cases_tableau(
        [erreur('1', ERR_X0_1, 'eˣ = 1 lu x = 1'),
         erreur('{{eval:-b}}', ERR_NEG, 'eˣ = −b résolu')],
        [erreur('{{eval:b-1}}', 'En $0$, $\\dfrac{e^{2x}}{2}$ vaut $\\dfrac{1}{2}$ : '
                'n\'oublie pas ce terme.', 'Terme e^{2x}/2 oublié'),
         erreur('{{eval:b+1/2}}', '$e^0=1$ : le terme en $e^{x}$ vaut le coefficient, pas $0$.',
                'Terme en eˣ oublié')]),
    ['Pour tout réel $x$, $e^{x}>0$, donc $e^{x}+{{b}}>0$ : $f\'(x)$ a le signe de $e^{x}-1$.',
     '$e^{x}-1\\geqslant 0\\iff e^{x}\\geqslant e^0\\iff x\\geqslant 0$ : $f\'(x)$ est négatif '
     'avant $' + PRIMAIRE + '{0}$, positif après.',
     '$f$ est décroissante puis croissante, avec un minimum : '
     '$f(0)=\\dfrac{1}{2}+{{eval:b-1}}=' + PRIMAIRE + '{ {{eval:b-1/2}} }$.'],
    'Le facteur $e^{x}+{{b}}$ est toujours positif : étudie le signe de $e^{x}-1$ en le comparant '
    'à $0$, avec $1=e^0$.'))
v = {'b': 3}  # min f(0) = 5/2
f6s += [spec('b = 3 : 0, −, +, ↘, 5/2, ↗', 3, v, 'correct', ['0', '-', '+', '↘', '\\frac{5}{2}', '↗']),
        spec('Décimal 2,5', 3, v, 'correct', ['0', '-', '+', '↘', '2{,}5', '↗']),
        spec('eˣ = 1 lu x = 1', 3, v, 'incorrect', ['1', '-', '+', '↘', '\\frac{5}{2}', '↗'], ERR_X0_1),
        spec('eˣ = −b résolu', 3, v, 'incorrect', ['-3', '-', '+', '↘', '\\frac{5}{2}', '↗'], ERR_NEG),
        spec('Terme e^{2x}/2 oublié', 3, v, 'incorrect', ['0', '-', '+', '↘', '2', '↗'],
             'En $0$, $\\dfrac{e^{2x}}{2}$ vaut $\\dfrac{1}{2}$ : n\'oublie pas ce terme.'),
        spec('Terme en eˣ oublié', 3, v, 'incorrect', ['0', '-', '+', '↘', '\\frac{7}{2}', '↗'],
             '$e^0=1$ : le terme en $e^{x}$ vaut le coefficient, pas $0$.')]

ecrire('f6-tableau-variations-avec-exponentielle', modele(
    'Tableau de variations d\'une fonction avec exponentielle',
    'Signe de f′ et tableau de variations à compléter pour (ax + b)eˣ, (px + q)e^{kx}, '
    'ax + c − aeˣ, et f′ = (eˣ − 1)(eˣ + b) donnée ; sans limites.',
    5, f6, f6s, {'noeud': 'Fonctions > Dérivation > variations et extremums', 'point': '1SPE-283'},
    {'blankDefaults': {'acceptDecimal': True}}, delay=300))

for nom, vs, ss in [('F1', f1, f1s), ('F2', f2, f2s), ('F3', f3, f3s), ('F4', f4, f4s),
                    ('F5', f5, f5s), ('F6', f6, f6s)]:
    print(nom, ':', len(vs), 'variations,', len(ss), 'specs')
