"""Écrit les modèles neufs du chantier idees-tle-derivation dans scripts/questions/idees-tle-derivation-neufs/.

Phase 0 validée par David le 2026-11-23 (journal docs/archive/wip/idees-tle-derivation/idees-tle-derivation-progress.md, fiches
docs/archive/wip/idees-tle-derivation/idees-tle-derivation-fiches.md) : F5 (tangente à une composée), F6 (variations de uⁿ, eᵘ,
√u), F7 (fonction auxiliaire, homographique), F11 (signes de f′ et f″ lus sur la courbe), F12
(reconnaître une courbe à partir de celle de f″ ; Q1 : le sens « f donnée → f″ » va à 37ce7759).

Grades T_SPE. Ni theme, ni domain, ni subdomain, ni id : le rangement (nœud du point + tag) se fera
par migration, après la création en brouillon.

Règles suivies (couvrir-un-niveau.md § 5) : erreurs prévues par case d'écriture ordinaire (de
vraies erreurs d'élèves, sans en inventer pour atteindre trois) ; une erreur qui tombe sur la bonne
réponse d'un tirage est ignorée par le moteur ; un coup de pouce par variation, qui ne donne jamais
la réponse ; pas de Oui / Non nu. Variable `x` = 'x|x' : `{{eval:…}}` garde x en lettre.
⛔ Jamais de variable `e` (Euler).

Usage : python3 docs/wip/questions/idees-tle-derivation-neufs.py scripts/questions/idees-tle-derivation-neufs
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
X = {'name': 'x', 'expression': 'x|x'}


def spec(desc, vi, variables_, status, answers, message=None, violations=None):
    expected = {'status': status}
    if violations:
        expected['constraintViolations'] = violations
    if message is not None:
        expected['expectedErrorMessage'] = message
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': expected, 'answers': answers}


def modele(title, description, level, variations, specs, shared=None, options=None):
    m = {'title': title, 'description': description, 'grades': ['T_SPE'], 'level': level,
         'delay': 60, 'status': 'draft', 'shared': shared or {'cleanCoefficients': True}}
    if options:
        m['options'] = options
    m['variations'] = variations
    m['testSpecs'] = specs
    return m


def bloc(nom, *lignes):
    return '```' + nom + '\n' + '\n'.join(lignes) + '\n```'


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


RANGEMENT = {
    'f05-tangente-composee': ('Fonctions > Dérivation > fonctions composées', 'TSPE-413'),
    'f06-variations-composee': ('Fonctions > Dérivation > variations et extremums', 'TSPE-416'),
    'f07-variations-auxiliaire-homographique': ('Fonctions > Dérivation > variations et extremums', 'TSPE-416'),
    'f11-signe-derivees-sur-courbe': ('Fonctions > Convexité > caractérisations', 'TSPE-419'),
    'f12-reconnaitre-courbe-depuis-f-seconde': ('Fonctions > Convexité > dérivée seconde', 'TSPE-590'),
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
    # Rangement (nœud + point) relevé en prod le 2026-11-24, lu par migration-rangement.ts
    if nom in RANGEMENT:
        noeud, point = RANGEMENT[nom]
        tete = {k: m[k] for k in ('id',) if k in m}
        m = {**tete, 'rangement': {'noeud': noeud, 'point': point}, **{k: v for k, v in m.items() if k != 'id'}}
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write('\n')


# =============================================================================================
# F5 — TSPE-413 : équation réduite de la tangente à la courbe d'une composée. u(x) = x² + bx + c
# est construit à partir de u(a) et u′(a) (b = u′(a) − 2a, c = u(a) − a² − ab) : les valeurs à
# calculer restent simples. Case `y = ?` comme les tangentes de 1re (05387201) : une forme non
# réduite est refusée par la forme (bad_form), « y = » recopié est accepté.
# =============================================================================================

U_F5 = '{{eval:x^2+b*x+c}}'
CONSIGNE_F5 = ('Donne l\'équation réduite de la tangente $T$ à $\\mathcal{C}_f$ au point '
               'd\'abscisse ${{a}}$.\n\n$y=?$')
SIGNE_A = ('La tangente au point d\'abscisse $a$ a pour équation $y=f\'(a)(x-a)+f(a)$ : ici '
           '$x-a$ s\'écrit $x{{eval:-a;+}}$.')

F5_A = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=\\left(' + U_F5
    + '\\right)^{ {{n}} }$, de courbe $\\mathcal{C}_f$.\n\n' + CONSIGNE_F5,
    [X, var('a', '-3..3'), var('U', '1|-1|2'), var('D', '1..3;±'), var('n', '2..4'),
     var('b', 'eval:D-2*a'), var('c', 'eval:U-a^2-a*b'), var('m', 'eval:n*U^(n-1)*D'),
     var('p', 'eval:U^n-n*U^(n-1)*D*a')],
    [case('{{eval:m*x+p}}', [
        erreur('{{eval:n*U^(n-1)*x+U^n-n*U^(n-1)*a}}',
               'Tu as oublié de multiplier par $u\'({{a}})$ : $(u^{n})\'=n\\,u\'\\,u^{n-1}$.',
               'u′ oublié'),
        erreur('{{eval:m*x+U^n+m*a}}', SIGNE_A, 'Signe de a'),
    ])],
    [
        '$f=u^{ {{n}} }$ avec $u(x)=' + U_F5 + '$, donc $f\'={{n}}\\,u\'\\,u^{ {{eval:n-1}} }$, '
        'avec $u\'(x)={{eval:2*x+b}}$.',
        '$u({{a}})={{U}}$ et $u\'({{a}})={{D}}$, donc $f({{a}})={{U;()}}^{ {{n}} }={{eval:U^n}}$ et '
        '$f\'({{a}})={{n}}\\times{{D;()}}\\times{{U;()}}^{ {{eval:n-1}} }={{m}}$.',
        '$T$ : $y={{m}}(x{{eval:-a;+}}){{eval:U^n;+}}$, soit $y=' + PRIMAIRE + '{ {{eval:m*x+p}} }$.',
    ],
    'Calcule d\'abord $u({{a}})$ et $u\'({{a}})$, puis $f({{a}})$ et $f\'({{a}})$ avec la formule '
    'de la dérivée de $u^{ {{n}} }$.',
    ['abs(m) <= 32', 'a != 0'],
)

F5_B = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=e^{' + U_F5 + '}$, de courbe '
    '$\\mathcal{C}_f$.\n\n' + CONSIGNE_F5,
    [X, var('a', '-3..3'), var('q', '1..4;±'), var('b', 'eval:q-2*a'), var('c', 'eval:a^2-q*a')],
    [case('{{eval:q*x+1-q*a}}', [
        erreur('{{eval:q*x-q*a}}',
               '$f({{a}})=e^{u({{a}})}=e^{0}=1$ : tu as pris $u({{a}})=0$ pour $f({{a}})$.',
               'f(a) = u(a)'),
        erreur('{{eval:x+1-a}}',
               'Tu as oublié de multiplier par $u\'({{a}})$ : $(e^{u})\'=u\'e^{u}$.', 'u′ oublié'),
        erreur('{{eval:q*x+1+q*a}}', SIGNE_A, 'Signe de a'),
    ])],
    [
        '$f=e^{u}$ avec $u(x)=' + U_F5 + '$, donc $f\'=u\'e^{u}$, avec $u\'(x)={{eval:2*x+b}}$.',
        '$u({{a}})=0$ et $u\'({{a}})={{q}}$, donc $f({{a}})=e^{0}=1$ et $f\'({{a}})={{q}}\\times '
        'e^{0}={{q}}$.',
        '$T$ : $y={{q}}(x{{eval:-a;+}})+1$, soit $y=' + PRIMAIRE + '{ {{eval:q*x+1-q*a}} }$.',
    ],
    'Calcule $u({{a}})$ : la valeur de $f({{a}})$ en découle. Puis $f\'({{a}})$ avec la formule de '
    'la dérivée de $e^{u}$.',
    ['a != 0'],
)

# √u : u(a) = m², u′(a) = q → f(a) = m, f′(a) = q/(2m), q impair si m = 1 (fraction non entière
# possible). Ordonnée à l'origine m − qa/(2m).
F5_C = variation(
    'Soit $f$ la fonction définie par $f(x)=\\sqrt{' + U_F5 + '}$, de courbe $\\mathcal{C}_f$. On '
    'admet que $f$ est dérivable en ${{a}}$.\n\n' + CONSIGNE_F5.replace(
        '\n\n$y=?$', ' Écris ses coefficients sous forme de fractions irréductibles.\n\n$y=?$'),
    [X, var('a', '-3..3'), var('m', '1..3'), var('q', '1..4;±'), var('b', 'eval:q-2*a'),
     var('c', 'eval:m^2-a^2-a*b')],
    [case('{{eval:q/(2*m)*x+m-q*a/(2*m)}}', [
        erreur('{{eval:q/m*x+m-q*a/m}}',
               'La dérivée de $\\sqrt{u}$ est $\\dfrac{u\'}{2\\sqrt{u}}$ : tu as oublié le $2$ du '
               'dénominateur.', '2 oublié'),
        erreur('{{eval:1/(2*m)*x+m-a/(2*m)}}',
               'Tu as oublié de multiplier par $u\'({{a}})$ : $(\\sqrt{u})\'=\\dfrac{u\'}{2\\sqrt{u}}$.',
               'u′ oublié'),
        erreur('{{eval:q/(2*m)*x+m^2-q*a/(2*m)}}',
               '$f({{a}})=\\sqrt{u({{a}})}=\\sqrt{ {{eval:m^2}} }={{m}}$ : tu as oublié la racine '
               'carrée.', 'Racine oubliée'),
    ])],
    [
        '$f=\\sqrt{u}$ avec $u(x)=' + U_F5 + '$, donc $f\'=\\dfrac{u\'}{2\\sqrt{u}}$, avec '
        '$u\'(x)={{eval:2*x+b}}$.',
        '$u({{a}})={{eval:m^2}}$ et $u\'({{a}})={{q}}$, donc $f({{a}})=\\sqrt{ {{eval:m^2}} }={{m}}$ '
        'et $f\'({{a}})=\\dfrac{ {{q}} }{2\\times{{m}}}={{eval:q/(2*m)}}$.',
        '$T$ : $y={{eval:q/(2*m)}}\\left(x{{eval:-a;+}}\\right)+{{m}}$, soit $y=' + PRIMAIRE
        + '{ {{eval:q/(2*m)*x+m-q*a/(2*m)}} }$.',
    ],
    'Calcule $u({{a}})$ et $u\'({{a}})$, puis $f({{a}})$ et $f\'({{a}})$ avec la formule de la '
    'dérivée de $\\sqrt{u}$.',
    ['a != 0', 'q*q != 4*m*m'],
)

# a=1, U=2, D=−1, n=3 : u = x² − 3x + 4, f = u³, f(1) = 8, f′(1) = 3·(−1)·4 = −12 → y = −12x + 20
V5A = {'a': '1', 'U': '2', 'D': '-1', 'n': '3', 'b': '-3', 'c': '4', 'm': '-12',
       'p': '20'}
# a=2, q=3 : u = x² − x − 2, u(2) = 0, f = e^u → y = 3x − 5
V5B = {'a': '2', 'q': '3', 'b': '-1', 'c': '-2'}
# a=1, m=2, q=3 : u = x² + x + 2, u(1) = 4, f′(1) = 3/4 → y = 3/4 x + 5/4
V5C = {'a': '1', 'm': '2', 'q': '3', 'b': '1', 'c': '2'}
SPECS_F5 = [
    spec('a : (x² − 3x + 4)³ en 1', 0, V5A, 'correct', ['-12x+20']),
    spec('a : « y = » recopié', 0, V5A, 'correct', ['y=-12x+20']),
    spec('a : forme non réduite', 0, V5A, 'bad_form', ['-12(x-1)+8'], violations=['form']),
    spec('a : u′ oublié', 0, V5A, 'incorrect', ['12x-4'],
         'Tu as oublié de multiplier par $u\'\\left( 1 \\right)$ : $(u^{n})\'=n\\,u\'\\,u^{n-1}$.'),
    spec('a : signe de a', 0, V5A, 'incorrect', ['-12x-4']),
    spec('b : e^(x² − x − 2) en 2', 1, V5B, 'correct', ['3x-5']),
    spec('b : f(a) = u(a)', 1, V5B, 'incorrect', ['3x-6']),
    spec('b : u′ oublié', 1, V5B, 'incorrect', ['x-1']),
    spec('b : signe de a', 1, V5B, 'incorrect', ['3x+7']),
    spec('c : √(x² + x + 2) en 1', 2, V5C, 'correct', ['\\frac{3}{4}x+\\frac{5}{4}']),
    spec('c : décimaux refusés (fractions demandées)', 2, V5C, 'bad_form', ['0.75x+1.25'],
         violations=['form']),
    spec('c : 2 oublié', 2, V5C, 'incorrect', ['\\frac{3}{2}x+\\frac{1}{2}']),
    spec('c : u′ oublié', 2, V5C, 'incorrect', ['\\frac{1}{4}x+\\frac{7}{4}']),
    spec('c : racine oubliée', 2, V5C, 'incorrect', ['\\frac{3}{4}x+\\frac{13}{4}']),
]

F5 = modele(
    'Équation de la tangente à la courbe d\'une fonction composée',
    'Équation réduite de la tangente au point d\'abscisse a à la courbe de uⁿ, eᵘ ou √u (u du '
    'second degré) : calculer u(a), u′(a), puis f(a) et f′(a) (pièges : u′ oublié, signe de a, '
    'f(a) pris égal à u(a), 2 de 2√u oublié)',
    1, [F5_A, F5_B, F5_C], SPECS_F5)


# =============================================================================================
# F6 — TSPE-416 : variations de uⁿ, eᵘ, √u avec u(x) = α(x − x₀)² + k sans racine. Tableau à
# compléter : x₀, signes de f′, f(x₀), flèches (cases dans l'ordre de lecture : x₀, signe, signe,
# flèche, f(x₀), flèche). Bornes ±∞ laissées vides (pas de limite demandée, outil n° 50 inutile).
# u développé : x² − 2x₀x + x₀² + k.
# =============================================================================================

def tableau_f6(nom_derivee, nom, x0, valeur, minimum):
    """Tableau à compléter ; minimum = condition du gabarit (f′ négative puis positive)."""
    return bloc('variation', 'variable: x', 'domain: -inf, ?' + x0 + ', +inf', '',
                'sign: ' + nom_derivee,
                '  -inf,' + x0 + ': ?{{if:' + minimum + '|-|+}}',
                '  ' + x0 + ': z',
                '  ' + x0 + ',+inf: ?{{if:' + minimum + '|+|-}}', '',
                'variation: ' + nom,
                '  ' + x0 + ': ?' + valeur + ', {{if:' + minimum + '|bottom|top}}',
                '  -inf,' + x0 + ': ?flèche',
                '  ' + x0 + ',+inf: ?flèche')


CONSIGNE_F6 = ('Étudie le signe de $f\'(x)$, puis complète le tableau de variations de $f$.')
VIDE = case('')
X0_SIGNE = ('$x_0$ est la valeur qui annule ${{eval:x-x0}}$ : c\'est ${{x0}}$, pas son '
            'opposé.')


def x0_case():
    return case('', [erreur('{{eval:-x0}}', X0_SIGNE, 'Signe de x₀')])


U_F6 = '{{eval:x^2-2*x0*x+x0^2+k}}'

F6_A = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=\\left(' + U_F6
    + '\\right)^{ {{n}} }$.\n\n' + CONSIGNE_F6 + '\n\n'
    + tableau_f6("f'(x)", 'f(x)', '{{x0}}', '{{eval:k^n}}', '1>0'),
    [X, var('x0', '-3..3'), var('k', '1..2'), var('n', '2..4')],
    [x0_case(), VIDE, VIDE, VIDE,
     case('', [erreur('{{k}}',
                      'Tu as donné $u({{x0}})$ : la valeur de $f$ est $u({{x0}})^{ {{n}} }$.',
                      'u(x₀) au lieu de f(x₀)')]),
     VIDE],
    [
        '$f=u^{ {{n}} }$ avec $u(x)=' + U_F6 + '$ : $f\'(x)={{n}}\\times({{eval:2*x-2*x0}})\\times'
        '\\left(' + U_F6 + '\\right)^{ {{eval:n-1}} }$.',
        '$u(x)=({{eval:x-x0}})^{2}+{{k}}>0$ pour tout réel $x$ : $f\'(x)$ est du signe de '
        '${{eval:2*x-2*x0}}$, négatif avant ${{x0}}$, positif après.',
        '$f$ est décroissante puis croissante, de minimum $f({{x0}})={{k}}^{ {{n}} }=' + PRIMAIRE
        + '{ {{eval:k^n}} }$ en $x=' + PRIMAIRE + '{ {{x0}} }$.',
    ],
    'Écris $f\'(x)$ avec la formule de la dérivée de $u^{n}$ ; $u(x)$ est-il de signe constant ?',
)

F6_B = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=e^{ {{eval:s*(x^2-2*x0*x+x0^2)+k}} }$.'
    '\n\n' + CONSIGNE_F6 + '\n\n'
    + tableau_f6("f'(x)", 'f(x)', '{{x0}}', '{{if:k==0|1|{{if:k==1|e|e^{ {{k}} }}}}}', 's>0'),
    [X, var('x0', '-3..3'), var('s', '1|-1'), var('k', '-2..2')],
    [x0_case(), VIDE, VIDE, VIDE,
     case('', [erreur('{{k}}',
                      'Tu as donné la valeur de l\'exposant en ${{x0}}$ : $f({{x0}})=e^{ {{k}} }$.',
                      'Exposant au lieu de f(x₀)')]),
     VIDE],
    [
        '$f=e^{u}$ avec $u(x)={{eval:s*(x^2-2*x0*x+x0^2)+k}}$ : $f\'(x)=({{eval:2*s*x-2*s*x0}})'
        'e^{u(x)}$.',
        'Une exponentielle est strictement positive : $f\'(x)$ est du signe de '
        '${{eval:2*s*x-2*s*x0}}$, {{if:s>0|négatif avant ${{x0}}$, positif après|positif avant '
        '${{x0}}$, négatif après}}.',
        '$f$ est {{if:s>0|décroissante puis croissante, de minimum|croissante puis décroissante, '
        'de maximum}} $f({{x0}})=' + PRIMAIRE + '{ {{if:k==0|1|{{if:k==1|e|e^{ {{k}} }}}}} }$ en $x=' + PRIMAIRE
        + '{ {{x0}} }$.',
    ],
    'Écris $f\'(x)$ avec la formule de la dérivée de $e^{u}$ ; quel est le signe d\'une '
    'exponentielle ?',
)

F6_C = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}$ par $f(x)=\\sqrt{' + U_F6 + '}$.\n\n'
    + CONSIGNE_F6 + '\n\n' + tableau_f6("f'(x)", 'f(x)', '{{x0}}', '{{r}}', '1>0'),
    [X, var('x0', '-3..3'), var('r', '1..3'), var('k', 'eval:r^2')],
    [x0_case(), VIDE, VIDE, VIDE,
     case('', [erreur('{{k}}',
                      'Tu as donné $u({{x0}})$ : la valeur de $f$ est $\\sqrt{u({{x0}})}$.',
                      'Racine oubliée')]),
     VIDE],
    [
        '$f=\\sqrt{u}$ avec $u(x)=' + U_F6 + '$ : $f\'(x)=\\dfrac{{{eval:2*x-2*x0}}}{2\\sqrt{'
        + U_F6 + '}}=\\dfrac{{{eval:x-x0}}}{\\sqrt{' + U_F6 + '}}$.',
        'Le dénominateur est strictement positif : $f\'(x)$ est du signe de ${{eval:x-x0}}$, '
        'négatif avant ${{x0}}$, positif après.',
        '$f$ est décroissante puis croissante, de minimum $f({{x0}})=\\sqrt{ {{k}} }=' + PRIMAIRE
        + '{ {{r}} }$ en $x=' + PRIMAIRE + '{ {{x0}} }$.',
    ],
    'Écris $f\'(x)$ avec la formule de la dérivée de $\\sqrt{u}$ ; quel est le signe du '
    'dénominateur ?',
)

SPECS_F6 = [
    spec('a : (x² − 2x + 3)², x₀ = 1, min 4', 0, {'x0': '1', 'k': '2', 'n': '2'},
         'correct', ['1', '-', '+', '↘', '4', '↗']),
    spec('a : signe de x₀', 0, {'x0': '1', 'k': '2', 'n': '2'}, 'incorrect',
         ['-1', '-', '+', '↘', '4', '↗']),
    spec('a : u(x₀) au lieu de f(x₀)', 0, {'x0': '1', 'k': '2', 'n': '2'}, 'incorrect',
         ['1', '-', '+', '↘', '2', '↗']),
    spec('a : flèches inversées', 0, {'x0': '1', 'k': '2', 'n': '2'}, 'incorrect',
         ['1', '-', '+', '↗', '4', '↘']),
    spec('b : e^(−x² − 4x − 3), max e', 1, {'x0': '-2', 's': '-1', 'k': '1'}, 'correct',
         ['-2', '+', '-', '↗', 'e', '↘']),
    spec('b : e^(x² − 2x + 1), min 1', 1, {'x0': '1', 's': '1', 'k': '0'}, 'correct',
         ['1', '-', '+', '↘', '1', '↗']),
    spec('b : exposant au lieu de f(x₀)', 1, {'x0': '-2', 's': '-1', 'k': '1'},
         'incorrect', ['-2', '+', '-', '↗', '1', '↘']),
    spec('b : signes inversés', 1, {'x0': '-2', 's': '-1', 'k': '1'}, 'incorrect',
         ['-2', '-', '+', '↗', 'e', '↘']),
    spec('c : √(x² + 6x + 13), min 2', 2, {'x0': '-3', 'r': '2', 'k': '4'}, 'correct',
         ['-3', '-', '+', '↘', '2', '↗']),
    spec('c : racine oubliée', 2, {'x0': '-3', 'r': '2', 'k': '4'}, 'incorrect',
         ['-3', '-', '+', '↘', '4', '↗']),
]

F6 = modele(
    'Variations d\'une fonction uⁿ, eᵘ ou √u',
    'Dériver uⁿ, eᵘ ou √u (u du second degré sans racine), étudier le signe de f′ et compléter le '
    'tableau de variations : x₀, signes, extremum, flèches (pièges : signe de x₀, u(x₀) au lieu '
    'de f(x₀))',
    2, [F6_A, F6_B, F6_C], SPECS_F6)


# =============================================================================================
# F7 — TSPE-416. a : fonction auxiliaire g(x) = eˣ − ax − b, minimum en ln a (domaine écrit
# `\ln{a}` : le parseur du tableau refuse `\ln(a)` dans une clé). b : homographique.
# ⚠️ b ne suit pas la fiche : une flèche cachée autour d'une double barre est refusée par le
# parseur (« ni centrée, ni asymptote »). Outil n° 59 de docs/wip/outils-manquants.md. David a
# choisi le 2026-11-24 le choix de quatre tableaux, en attendant l'outil (on comparera ensuite).
# =============================================================================================

LN = '\\ln{ {{a}} }'

F7_A = variation(
    'Soit $g$ la fonction définie sur $\\mathbb{R}$ par $g(x)=e^{x}-{{a}}x{{eval:-b;+}}$.\n\n'
    'Étudie le signe de $g\'(x)$, puis complète le tableau de variations de $g$.\n\n'
    + bloc('variation', 'variable: x', 'domain: -inf, ?' + LN + ', +inf', '',
           "sign: g'(x)",
           '  -inf,' + LN + ': ?-',
           '  ' + LN + ': z',
           '  ' + LN + ',+inf: ?+', '',
           'variation: g(x)',
           '  ' + LN + ': ?{{eval:a-b}}-{{a}}\\ln{ {{a}} }, bottom',
           '  -inf,' + LN + ': ?flèche',
           '  ' + LN + ',+inf: ?flèche'),
    [var('a', '2..5'), var('b', '-3..3')],
    [case('', [erreur('e^{ {{a}} }',
                      '$e^{x}={{a}}$ équivaut à $x=\\ln {{a}}$ : la fonction réciproque de '
                      'l\'exponentielle est le logarithme.', 'e^a au lieu de ln a'),
               erreur('{{a}}',
                      '$g\'(x)=e^{x}-{{a}}$ s\'annule quand $e^{x}={{a}}$, c\'est-à-dire pour '
                      '$x=\\ln {{a}}$.', 'a au lieu de ln a')]),
     VIDE, VIDE, VIDE,
     case('', [erreur('{{eval:a+b}}-{{a}}\\ln{ {{a}} }',
                      'Attention au signe du terme constant : $g(\\ln {{a}})={{a}}-{{a}}\\ln {{a}}'
                      '{{eval:-b;+}}$.', 'Signe de b'),
               erreur('{{eval:-b}}',
                      'Tu as pris $e^{\\ln {{a}}}=1$ et oublié $-{{a}}\\ln {{a}}$ ; or '
                      '$e^{\\ln {{a}}}={{a}}$.', 'Valeur en 0')]),
     VIDE],
    [
        '$g\'(x)=e^{x}-{{a}}$. Or $e^{x}-{{a}}\\geqslant 0\\iff e^{x}\\geqslant {{a}}\\iff '
        'x\\geqslant\\ln {{a}}$ (la fonction exponentielle est strictement croissante).',
        '$g\'$ est négative avant $\\ln {{a}}$, positive après : $g$ est décroissante puis '
        'croissante, de minimum en $x=' + PRIMAIRE + '{\\ln {{a}} }$.',
        '$g(\\ln {{a}})=e^{\\ln {{a}}}-{{a}}\\ln {{a}}{{eval:-b;+}}=' + PRIMAIRE
        + '{ {{eval:a-b}}-{{a}}\\ln {{a}} }$.',
    ],
    'Résous $g\'(x)\\geqslant 0$ : quelle fonction « défait » l\'exponentielle ?',
)

# b : f(x) = (px + q)/(rx + t), r ≠ 0, α = −t/r entier, δ = pt − qr ≠ 0 : f′(x) = δ/(rx + t)².
# Limites a/c en ±∞ (écrites p/r, simplifiées par le moteur), ±∞ autour de α.
L_F7 = '{{eval:p/r}}'


def tableau_f7(decroit):
    """Tableau de l'homographique ; decroit = '1' (décroissante) ou '0' (croissante)."""
    d = decroit == '1'
    return bloc('variation', 'variable: x', 'domain: -inf, {{al}}, +inf', '',
                'variation: f(x)',
                '  -inf: ' + L_F7 + ', ' + ('top' if d else 'bottom'),
                '  {{al}}: ||, ' + ('-inf, +inf' if d else '+inf, -inf'),
                '  +inf: ' + L_F7 + ', ' + ('bottom' if d else 'top'))


def tableau_f7_mixte(creux):
    """Distracteur : décroissante puis croissante (creux) ou l'inverse, mêmes limites en ±∞."""
    return bloc('variation', 'variable: x', 'domain: -inf, {{al}}, +inf', '',
                'variation: f(x)',
                '  -inf: ' + L_F7 + ', ' + ('top' if creux else 'bottom'),
                '  {{al}}: ||, ' + ('-inf, -inf' if creux else '+inf, +inf'),
                '  +inf: ' + L_F7 + ', ' + ('top' if creux else 'bottom'))


def item(contenu):
    return '- ' + contenu.replace('\n', '\n  ')


F7_B = variation(
    'Soit $f$ la fonction définie sur $\\mathbb{R}\\setminus\\left\\{ {{al}} \\right\\}$ par '
    '$f(x)=\\dfrac{ {{eval:p*x+q}} }{ {{eval:r*x+t}} }$.\n\n'
    'Étudie le signe de $f\'(x)$. Quel est le tableau de variations de $f$ ?\n\n'
    '````choix\n'
    + item(tableau_f7('1')) + '\n'
    + item(tableau_f7('0')) + '\n'
    + item(tableau_f7_mixte(True)) + '\n'
    + item(tableau_f7_mixte(False)) + '\n````',
    [X, var('r', '1..3;±'), var('al', '-4..4'), var('t', 'eval:-r*al'), var('p', '1..5;±'),
     var('q', '-5..5'), var('d', 'eval:p*t-q*r')],
    [case('{{if:d<0|0|1}}')],
    [
        '$f=\\dfrac{u}{v}$ avec $u(x)={{eval:p*x+q}}$ et $v(x)={{eval:r*x+t}}$ : '
        '$f\'(x)=\\dfrac{ {{p}}({{eval:r*x+t}})-{{r;()}}({{eval:p*x+q}})}{({{eval:r*x+t}})^{2}}='
        '\\dfrac{ {{d}} }{({{eval:r*x+t}})^{2}}$.',
        'Le dénominateur est un carré, strictement positif sur $\\mathbb{R}\\setminus\\left\\{ '
        '{{al}} \\right\\}$ : $f\'(x)$ a le signe de ${{d}}$, {{if:d<0|négatif|positif}}.',
        '$f$ est $' + PRIMAIRE + '{\\text{ {{if:d<0|décroissante|croissante}} }}$ sur '
        '$\\left]-\\infty\\,;{{al}}\\right[$ et sur $\\left]{{al}}\\,;+\\infty\\right[$ : c\'est le '
        'tableau où $f$ est {{if:d<0|décroissante|croissante}} des deux côtés de la double '
        'barre.',
    ],
    'Dérive $f$ comme un quotient : le numérateur de $f\'(x)$ est un nombre. Quel est son signe ?',
    ['d != 0', 'al != 0'],
)

SPECS_F7 = [
    spec('a : eˣ − 3x − 1', 0, {'a': '3', 'b': '1'}, 'correct',
         ['\\ln(3)', '-', '+', '↘', '2-3\\ln(3)', '↗']),
    spec('a : ln 3 sans parenthèses', 0, {'a': '3', 'b': '1'}, 'correct',
         ['\\ln3', '-', '+', '↘', '2-3\\ln3', '↗']),
    spec('a : e^a au lieu de ln a', 0, {'a': '3', 'b': '1'}, 'incorrect',
         ['e^{3}', '-', '+', '↘', '2-3\\ln(3)', '↗']),
    spec('a : signe de b', 0, {'a': '3', 'b': '1'}, 'incorrect',
         ['\\ln(3)', '-', '+', '↘', '4-3\\ln(3)', '↗']),
    spec('a : flèches inversées', 0, {'a': '3', 'b': '1'}, 'incorrect',
         ['\\ln(3)', '-', '+', '↗', '2-3\\ln(3)', '↘']),
    # (2x + 1)/(x − 3) : α = 3, d = 2·(−3) − 1·1 = −7 < 0 → décroissante (choix 0)
    spec('b : (2x + 1)/(x − 3), décroissante', 1,
         {'r': '1', 'al': '3', 't': '-3', 'p': '2', 'q': '1', 'd': '-7'}, 'correct', ['0']),
    spec('b : croissante à tort', 1,
         {'r': '1', 'al': '3', 't': '-3', 'p': '2', 'q': '1', 'd': '-7'}, 'incorrect', ['1']),
    # (−x + 4)/(2x + 2) : α = −1, d = −1·2 − 4·2 = −10 → décroissante ; (x + 4)/(x + 1) : d = 1 − 4 = −3
    # (3x − 1)/(x + 2) : d = 3·2 − (−1)·1 = 7 > 0 → croissante (choix 1)
    spec('b : (3x − 1)/(x + 2), croissante', 1,
         {'r': '1', 'al': '-2', 't': '2', 'p': '3', 'q': '-1', 'd': '7'}, 'correct', ['1']),
    spec('b : creux à tort', 1,
         {'r': '1', 'al': '-2', 't': '2', 'p': '3', 'q': '-1', 'd': '7'}, 'incorrect', ['2']),
]

INCLURE_F7B = True
F7 = modele(
    'Variations d\'une fonction auxiliaire ou homographique',
    'Signe de la dérivée et variations de g(x) = eˣ − ax − b (minimum en ln a, tableau à '
    'compléter) et de (px + q)/(rx + t) (signe de pt − qr, choix du tableau) (pièges : e^a au lieu '
    'de ln a, signe de b, mêmes variations des deux côtés de la valeur interdite)',
    3, [F7_A, F7_B] if INCLURE_F7B else [F7_A],
    SPECS_F7 if INCLURE_F7B else [sp for sp in SPECS_F7 if sp['variationIndex'] == 0])


# =============================================================================================
# F11 — TSPE-419 : signe de f′(b) ou de f″(c) lu sur la courbe d'un polynôme de degré 3 (comme
# 37ce7759) : f(x) = s·0,5((x − h)³ − 3(x − h)) + k, extremums en h ± 1, inflexion en h.
# f′(h + t) = 1,5s(t² − 1), f″(h + t) = 3st. Tangente tracée au point A. Choix fixes :
# 0 = strictement positif, 1 = strictement négatif, 2 = nul.
# =============================================================================================

def courbe_cubique(abscisse):
    return bloc('courbe', 'x: {{eval:h-3.5}} ; {{eval:h+3.5}}', 'y: {{eval:k-4}} ; {{eval:k+4}}',
                'grille: 1 ; 1',
                'f(x) = {{s}}*0.5*((x-{{h}})^3-3*(x-{{h}}))+{{k}}   bleu   nom=C_f',
                'points: A(' + abscisse + ' ; f(' + abscisse + '))',
                'tangente: f ; ' + abscisse,
                'taille: moyenne',
                'description: Courbe d\'une fonction polynôme de degré 3 avec un maximum et un '
                'minimum locaux, et sa tangente au point A.')


SIGNES = bloc('choix', '- strictement positif', '- strictement négatif', '- nul')

F11_A = variation(
    'On a représenté ci-dessous la courbe $\\mathcal{C}_f$ d\'une fonction $f$ deux fois dérivable '
    'sur $\\mathbb{R}$, et sa tangente au point $A$ d\'abscisse $b={{eval:h+t}}$.\n\n'
    + courbe_cubique('{{eval:h+t}}') + '\n\nQuel est le signe de $f\'(b)$ ?\n\n' + SIGNES,
    [var('s', '1|-1'), var('h', '-1..1'), var('k', '-1..1'), var('t', '-2..2')],
    [case('{{if:t*t==1|2|{{if:s*(t*t-1)>0|0|1}}}}')],
    [
        '$f\'(b)$ est le coefficient directeur de la tangente en $A$.',
        '{{if:t*t==1|La tangente en $A$ est horizontale ($A$ est un sommet de la courbe) : '
        '$f\'(b)$ est $' + PRIMAIRE + '{\\text{nul}}$.|La tangente en $A$ {{if:s*(t*t-1)>0|monte|'
        'descend}} (la courbe {{if:s*(t*t-1)>0|monte|descend}} autour de $A$) : $f\'(b)$ est $'
        + PRIMAIRE + '{\\text{strictement {{if:s*(t*t-1)>0|positif|négatif}} }}$.}}',
    ],
    'Que représente $f\'(b)$ pour la tangente en $A$ ? Regarde si elle monte, descend ou est '
    'horizontale.',
)

F11_B = variation(
    'On a représenté ci-dessous la courbe $\\mathcal{C}_f$ d\'une fonction $f$ deux fois dérivable '
    'sur $\\mathbb{R}$, et sa tangente au point $A$ d\'abscisse $c={{eval:h+t}}$.\n\n'
    + courbe_cubique('{{eval:h+t}}') + '\n\nQuel est le signe de $f\'\'(c)$ ?\n\n' + SIGNES,
    [var('s', '1|-1'), var('h', '-1..1'), var('k', '-1..1'), var('t', '-2..2')],
    [case('{{if:t==0|2|{{if:s*t>0|0|1}}}}')],
    [
        '$f\'\'(c)\\geqslant 0$ quand $f$ est convexe au voisinage de $c$ (courbe au-dessus de ses '
        'tangentes), $f\'\'(c)\\leqslant 0$ quand elle est concave (courbe en dessous).',
        '{{if:t==0|En $A$, la courbe traverse sa tangente : c\'est un point d\'inflexion, où $f\'\'$ '
        's\'annule en changeant de signe. $f\'\'(c)$ est $' + PRIMAIRE + '{\\text{nul}}$.|Au '
        'voisinage de $A$, la courbe est {{if:s*t>0|au-dessus|en dessous}} de sa tangente : $f$ y '
        'est {{if:s*t>0|convexe|concave}}, et $f\'\'(c)$ est $' + PRIMAIRE
        + '{\\text{strictement {{if:s*t>0|positif|négatif}} }}$.}}',
    ],
    'Au voisinage de $A$, la courbe est-elle au-dessus de sa tangente, en dessous, ou la '
    'traverse-t-elle ? Relie cela à la convexité.',
)

V11 = {'s': '1', 'h': '0', 'k': '0'}
SPECS_F11 = [
    spec('a : montée (t = 2)', 0, {**V11, 't': '2'}, 'correct', ['0']),
    spec('a : descente (t = 0)', 0, {**V11, 't': '0'}, 'correct', ['1']),
    spec('a : sommet (t = −1)', 0, {**V11, 't': '-1'}, 'correct', ['2']),
    spec('a : sommet pris pour positif', 0, {**V11, 't': '-1'}, 'incorrect', ['0']),
    spec('a : s = −1, t = 2 → négatif', 0, {**V11, 's': '-1', 't': '2'}, 'correct', ['1']),
    spec('b : convexe (t = 1)', 1, {**V11, 't': '1'}, 'correct', ['0']),
    spec('b : concave (t = −2)', 1, {**V11, 't': '-2'}, 'correct', ['1']),
    spec('b : inflexion (t = 0)', 1, {**V11, 't': '0'}, 'correct', ['2']),
    spec('b : signe de f′ au lieu de f″ (t = 0)', 1, {**V11, 't': '0'}, 'incorrect', ['1']),
    spec('b : s = −1, t = 2 → négatif', 1, {**V11, 's': '-1', 't': '2'}, 'correct', ['1']),
]

F11 = modele(
    'Signe de f′(a) ou de f″(a) lu sur la courbe de f',
    'Lire sur la courbe de f et sa tangente le signe de f′(b) (pente de la tangente) ou de f″(c) '
    '(courbe au-dessus ou en dessous de la tangente, ou la traversant) (pièges : sommet, point '
    'd\'inflexion, signe de f′ confondu avec celui de f″)',
    4, [F11_A, F11_B], SPECS_F11)


# =============================================================================================
# F12 — TSPE-590 : courbe de f″ (droite s(x − h)) donnée, reconnaître celle de f (cubique) ou de
# f′ (parabole) parmi quatre. Distracteurs : l'opposée, la bonne décalée de 1, la mauvaise
# dérivée. Choix 0 = la bonne (ordre mélangé à l'affichage).
# =============================================================================================

COURBE_F2 = bloc('courbe', 'x: -5 ; 5', 'y: -5 ; 5', 'grille: 1 ; 1',
                 'g(x) = {{s}}*(x-{{h}})   violet',
                 'taille: moyenne',
                 'description: Courbe de la dérivée seconde f″ : une droite '
                 '{{if:s>0|croissante|décroissante}} qui coupe l\'axe des abscisses en x = {{h}}.')


def petite(formule, description):
    return bloc('courbe', 'x: {{eval:h-3.5}} ; {{eval:h+3.5}}', 'y: -4 ; 4', 'grille: 1 ; 1',
                'f(x) = ' + formule + '   bleu', 'taille: petite', 'description: ' + description)


def cubique(sg, dec):
    return '{{eval:' + sg + '}}*0.5*((x-{{eval:h+' + dec + '}})^3-3*(x-{{eval:h+' + dec + '}}))'


def parabole(sg, dec):
    return '{{eval:' + sg + '}}*(0.5*(x-{{eval:h+' + dec + '}})^2-2)'


def choix4(*items_):
    return '````choix\n' + '\n'.join(item(i) for i in items_) + '\n````'


D_CUB = ('Courbe d\'un polynôme de degré 3 avec deux sommets, qui change de courbure en '
         'x = {{eval:h+DEC}}.')
D_PAR = 'Parabole de sommet d\'abscisse {{eval:h+DEC}}.'


def desc(d, dec):
    return d.replace('DEC', dec)


F12_A = variation(
    'On a représenté ci-dessous la courbe de la fonction **dérivée seconde** $f\'\'$ d\'une fonction '
    '$f$ deux fois dérivable sur $\\mathbb{R}$.\n\n' + COURBE_F2
    + '\n\nLaquelle de ces courbes peut représenter la fonction $f$ ?\n\n'
    + choix4(petite(cubique('s', '0'), desc(D_CUB, '0')),
             petite(cubique('-s', '0'), desc(D_CUB, '0')),
             petite(cubique('s', '1'), desc(D_CUB, '1')),
             petite(parabole('s', '0'), desc(D_PAR, '0'))),
    [var('s', '1|-1'), var('h', '-2..2')],
    [case('0')],
    [
        '$f$ est convexe là où $f\'\'(x)\\geqslant 0$ (courbe de $f\'\'$ au-dessus de l\'axe des '
        'abscisses), concave là où $f\'\'(x)\\leqslant 0$.',
        'Ici $f\'\'$ est {{if:s>0|négative avant ${{h}}$ et positive après|positive avant ${{h}}$ et '
        'négative après}} : $f$ est {{if:s>0|concave puis convexe|convexe puis concave}}, avec un '
        'point d\'inflexion d\'abscisse ${{h}}$.',
        'C\'est $' + PRIMAIRE + '{\\text{la courbe qui change de courbure en } x={{h}} }$ en passant '
        'de « tournée vers le {{if:s>0|bas|haut}} » à « tournée vers le {{if:s>0|haut|bas}} ». La '
        'parabole serait plutôt celle de $f\'$.',
    ],
    'Lis sur la courbe de $f\'\'$ où elle est positive, où elle est négative : où $f$ est-elle '
    'convexe, où est-elle concave ?',
)

F12_B = variation(
    'On a représenté ci-dessous la courbe de la fonction **dérivée seconde** $f\'\'$ d\'une fonction '
    '$f$ deux fois dérivable sur $\\mathbb{R}$.\n\n' + COURBE_F2
    + '\n\nLaquelle de ces courbes peut représenter la fonction **dérivée** $f\'$ ?\n\n'
    + choix4(petite(parabole('s', '0'), desc(D_PAR, '0')),
             petite(parabole('-s', '0'), desc(D_PAR, '0')),
             petite(parabole('s', '1'), desc(D_PAR, '1')),
             petite(cubique('s', '0'), desc(D_CUB, '0'))),
    [var('s', '1|-1'), var('h', '-2..2')],
    [case('0')],
    [
        '$f\'\'$ est la dérivée de $f\'$ : $f\'$ est croissante là où $f\'\'(x)\\geqslant 0$, '
        'décroissante là où $f\'\'(x)\\leqslant 0$.',
        'Ici $f\'\'$ est {{if:s>0|négative avant ${{h}}$ et positive après|positive avant ${{h}}$ et '
        'négative après}} : $f\'$ est {{if:s>0|décroissante puis croissante|croissante puis '
        'décroissante}}, avec un {{if:s>0|minimum|maximum}} en $x={{h}}$.',
        'C\'est $' + PRIMAIRE + '{\\text{la parabole de sommet d\'abscisse } {{h}} }$, tournée vers le '
        '{{if:s>0|haut|bas}}.',
    ],
    'La courbe de $f\'\'$ donne le signe de la dérivée de $f\'$ : où $f\'$ croît-elle, où '
    'décroît-elle ?',
)

SPECS_F12 = [
    spec('a : s = 1, h = 0', 0, {'s': '1', 'h': '0'}, 'correct', ['0']),
    spec('a : opposée', 0, {'s': '1', 'h': '0'}, 'incorrect', ['1']),
    spec('a : décalée', 0, {'s': '-1', 'h': '1'}, 'incorrect', ['2']),
    spec('a : parabole (f′)', 0, {'s': '-1', 'h': '1'}, 'incorrect', ['3']),
    spec('b : s = −1, h = 2', 1, {'s': '-1', 'h': '2'}, 'correct', ['0']),
    spec('b : opposée', 1, {'s': '-1', 'h': '2'}, 'incorrect', ['1']),
    spec('b : cubique (f)', 1, {'s': '1', 'h': '-1'}, 'incorrect', ['3']),
]

F12 = modele(
    'Reconnaître une courbe à partir de celle de f″',
    'La courbe de f″ (droite) est donnée : reconnaître parmi quatre celle de f (convexité, point '
    'd\'inflexion) ou celle de f′ (variations) (pièges : courbe opposée, décalée, mauvaise dérivée)',
    5, [F12_A, F12_B], SPECS_F12)


MODELES = {
    'f05-tangente-composee': lambda: F5,
    'f06-variations-composee': lambda: F6,
    'f07-variations-auxiliaire-homographique': lambda: F7,
    'f11-signe-derivees-sur-courbe': lambda: F11,
    'f12-reconnaitre-courbe-depuis-f-seconde': lambda: F12,
}
choisis = sys.argv[2:] or list(MODELES)
for nom in choisis:
    ecrire(nom, MODELES[nom]())
print(len(choisis), 'modèle(s) écrit(s) dans', DOSSIER)
