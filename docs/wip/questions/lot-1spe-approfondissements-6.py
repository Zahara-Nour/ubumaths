"""Écrit les 4 modèles du lot 6 « approfondissements : algèbre » de la 1re spé
dans scripts/questions/1spe-approfondissements-6/.

Phase 0 validée par David le 2026-11-04 (D3 du journal
« docs/wip/questions-1spe-demonstrations-progress.md », § 9), un point par modèle :

| # | Point    | Titre                                               | Catégorie, niveau                                         | Sous-notion (rangement)                                    |
| 1 | 1SPE-256 | Factoriser un polynôme de degré 3                   | Fonctions › Polynôme du second degré › Approfondissements, 1 | Nombres complexes › Équations polynomiales › degré 3 et factorisation |
| 2 | 1SPE-387 | Résoudre une équation de degré 3                    | Fonctions › Polynôme du second degré › Approfondissements, 2 | Nombres complexes › Équations polynomiales › degré 3 et factorisation |
| 3 | 1SPE-257 | Factoriser xⁿ − 1 et xⁿ − aⁿ                        | Fonctions › Polynôme du second degré › Approfondissements, 1 | Algèbre › Calcul littéral › factorisation                  |
| 4 | 1SPE-258 | Deux réels de somme et de produit donnés            | Fonctions › Polynôme du second degré › Approfondissements, 1 | Fonctions › Second degré › somme et produit des racines    |

Forme (D3, Q2) : exercices d'application à valeurs tirées, 3 variations ; 257 en partie preuve
(variation « étapes à ranger » en dernier, comme le lot 4 ; positions des specs calculées par le
générateur, graine 0). Les 4 sous-notions existent déjà en prod : aucune neuve.

Approfondissements « en aucun cas obligatoires » (BO 1re spé p.3).

    python3 docs/wip/questions/lot-1spe-approfondissements-6.py scripts/questions/1spe-approfondissements-6
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, answer, status, variables=None):
    expected = {'status': status}
    if status == 'bad_form':
        expected['constraintViolations'] = ['form']
    answers = answer if isinstance(answer, list) else [answer]
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in (variables or {}).items()},
            'answers': answers, 'expected': expected}


def modele(nom, title, description, level, variations, specs):
    return nom, {'title': title, 'description': description, 'grades': ['1_SPE'],
                 'theme': 'Fonctions', 'domain': 'Polynôme du second degré',
                 'subdomain': 'Approfondissements',
                 'level': level, 'delay': 90, 'status': 'draft',
                 'shared': {},
                 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def ev(x):
    return '{{eval:' + x + '}}'


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def choix(lignes):
    return '\n\n```choix\n' + ''.join('- ' + l + '\n' for l in lignes) + '```'


def case(statement, variables, attendu, steps, conditions=None):
    """Variation à une case ouverte (`?` dans une formule de l'énoncé)."""
    v = {'statement': statement, 'variables': variables,
         'blanks': [attendu if isinstance(attendu, dict) else {'expectedAnswer': attendu}],
         'correction': {'steps': steps}}
    if conditions:
        v['conditions'] = conditions
    return v


def justification(statement, variables, bonne, autres, steps, conditions=None):
    """Variation à une case choix : la première proposition est la bonne (index 0)."""
    v = {'statement': statement + choix([bonne] + autres), 'variables': variables,
         'blanks': [{'expectedAnswer': '0'}], 'correction': {'steps': steps}}
    if conditions:
        v['conditions'] = conditions
    return v


def ranger(intro, etapes, steps):
    """Variation « étapes à ranger » (lot 4) : étapes données dans le bon ordre."""
    return {'statement': intro + '\n\nRemets les étapes de la démonstration dans l\'ordre.\n\n'
            '```ranger\nsigne: aucun\n' + ''.join('- ' + e + '\n' for e in etapes) + '```',
            'variables': [], 'correction': {'steps': steps}}


def specs_choix(vi, juste, erreurs, variables=None):
    out = [spec(juste, vi, '0', 'correct', variables)]
    for k, erreur in enumerate(erreurs, start=1):
        out.append(spec('Erreur : ' + erreur, vi, str(k), 'incorrect', variables))
    return out


# Variable symbolique `x` (astuce des modèles de 1spe-analyse-a : `x|x`), pour écrire un
# polynôme développé avec {{eval:…}} (coefficients nuls et signes gérés par le moteur).
X = var('x', 'x|x')

MODELES = []

# --- 1. 1SPE-256 : P(x) = (x − r)(x² + bx + c) ------------------------------------------------
# P(x) = x³ + (b − r)x² + (c − rb)x − rc

P_256 = ev('x^3+(b-r)*x^2+(c-r*b)*x-r*c')
V_256 = [X, var('r', '-3..3'), var('b', '-5..5'), var('c', '-6..6')]
C_256 = ['r != 0', 'b != 0', 'c != 0']
INTRO_256 = ('Soit $P(x)=' + P_256 + '$. On vérifie que $P(' + ev('r') + ')=0$ : $'
             + ev('r') + '$ est une racine de $P$, donc il existe deux réels $b$ et $c$ tels que,'
             ' pour tout réel $x$ :\n\n$$P(x)=(x' + ev('-r;+') + ')(x^2+bx+c)$$\n\n')
DEV_256 = ('En développant, $(x' + ev('-r;+') + ')(x^2+bx+c)=x^3+(b' + ev('-r;+')
           + ')x^2+(c' + ev('-r*b;+') + ')x' + ev('-r*c;+') + '$ : on identifie avec $P(x)$.')

V256_CONSTANTE = case(
    INTRO_256 + 'Complète.\n\n$P(x)=(x' + ev('-r;+') + ')(x^2' + ev('b*x;+') + '+?)$',
    V_256, ev('c'),
    ['En développant $(x' + ev('-r;+') + ')(x^2+bx+c)$, le terme constant est $' + ev('-r;()')
     + '\\times c$ ; celui de $P(x)$ est $' + ev('-r*c') + '$.',
     'Les termes constants : $' + ev('-r;()') + '\\times c=' + ev('-r*c') + '$, donc $c='
     + col(ev('c')) + '$.',
     'Attention au signe : le terme constant du produit est $' + ev('-r;()') + '\\times c$.'],
    C_256)
V256_COEFFICIENT = case(
    INTRO_256 + 'Complète.\n\n$P(x)=(x' + ev('-r;+') + ')(x^2+?x' + ev('c;+') + ')$',
    V_256, ev('b'),
    [DEV_256,
     'Les coefficients de $x^2$ : $b' + ev('-r;+') + '=' + ev('b-r') + '$, donc $b='
     + col(ev('b')) + '$.',
     'Vérification sur les coefficients de $x$ : $c' + ev('-r*b;+') + '=' + ev('c-r*b') + '$.'],
    C_256)
V256_FACTORISEE = justification(
    'Soit $P(x)=' + P_256 + '$. On vérifie que $P(' + ev('r') + ')=0$.\n\n'
    'Quelle est une factorisation de $P(x)$ ?',
    V_256,
    '$P(x)=(x' + ev('-r;+') + ')(' + ev('x^2+b*x+c') + ')$',
    ['$P(x)=(x' + ev('r;+') + ')(' + ev('x^2+b*x+c') + ')$',
     '$P(x)=(x' + ev('-r;+') + ')(' + ev('x^2+(b-r)*x+c') + ')$',
     '$P(x)=(x' + ev('-r;+') + ')(' + ev('x^2+b*x-c') + ')$'],
    ['$' + ev('r') + '$ est racine de $P$ : $P(x)$ se factorise par $x' + ev('-r;+')
     + '$ (et non par $x' + ev('r;+') + '$).',
     'On cherche $P(x)=(x' + ev('-r;+') + ')(x^2+bx+c)$. ' + DEV_256,
     'Coefficient de $x^2$ : $b=' + ev('b-r') + ev('r;+') + '=' + ev('b') + '$ ; terme constant :'
     ' $c=' + ev('c') + '$.',
     'Donc $P(x)=' + col('(x' + ev('-r;+') + ')(' + ev('x^2+b*x+c') + ')') + '$.'],
    C_256)

VARS_256 = {'r': 2, 'b': -1, 'c': -6}  # P(x) = x³ − 3x² − 4x + 12 = (x − 2)(x² − x − 6)
MODELES.append(modele(
    '01-factoriser-un-polynome-de-degre-3', 'Factoriser un polynôme de degré 3',
    'Polynôme P de degré 3 dont une racine r est donnée : P(x) = (x − r)(x² + bx + c), terme'
    ' constant c puis coefficient b par identification, factorisation à choisir',
    1,
    [V256_CONSTANTE, V256_COEFFICIENT, V256_FACTORISEE],
    [spec('c = −6', 0, '-6', 'correct', VARS_256),
     spec('Erreur : 6 (signe)', 0, '6', 'incorrect', VARS_256),
     spec('Erreur : 12 (terme constant de P)', 0, '12', 'incorrect', VARS_256),
     spec('b = −1', 1, '-1', 'correct', VARS_256),
     spec('Erreur : −3 (coefficient de x² dans P)', 1, '-3', 'incorrect', VARS_256),
     spec('Erreur : −5 (−3 − 2)', 1, '-5', 'incorrect', VARS_256)]
    + specs_choix(2, '(x − 2)(x² − x − 6)',
                  ['facteur x + 2', 'b pris dans P', 'signe de c'], VARS_256)))

# --- 2. 1SPE-387 : résoudre P(x) = 0, une racine r connue ---------------------------------------

V_387_TROIS = [X, var('r', '-4..4'), var('s', '-5..5'), var('u', '-5..5')]
C_387_TROIS = ['s < u', 's != 0', 'u != 0', 'r != 0', 'r != s', 'r != u']
P_387 = ev('x^3-(r+s+u)*x^2+(r*s+r*u+s*u)*x-r*s*u')

V387_TROIS = case(
    'Soit $P(x)=' + P_387 + '$. On vérifie que $P(' + ev('r') + ')=0$.\n\n'
    'L\'équation $P(x)=0$ a, en plus de $' + ev('r') + '$, deux autres solutions. Quelle est la'
    ' plus grande des deux ?\n\n$?$',
    V_387_TROIS, ev('u'),
    ['$' + ev('r') + '$ est racine : $P(x)=(x' + ev('-r;+') + ')(x^2+bx+c)$. Par identification,'
     ' $P(x)=(x' + ev('-r;+') + ')(' + ev('x^2-(s+u)*x+s*u') + ')$.',
     'Le produit est nul si et seulement si $x=' + ev('r') + '$ ou $' + ev('x^2-(s+u)*x+s*u')
     + '=0$.',
     'Pour ce trinôme, $\\Delta=' + ev('(s+u)^2-4*s*u') + '>0$ : deux racines, $' + ev('s')
     + '$ et $' + ev('u') + '$.',
     'Les solutions de $P(x)=0$ sont $' + ev('r') + '$, $' + ev('s') + '$ et $' + ev('u')
     + '$ : la plus grande des deux autres est $' + col(ev('u')) + '$.'],
    C_387_TROIS)
V_387_UNE = [X, var('r', '-4..4'), var('b', '-3..3'), var('c', '1..9')]
V387_UNE = case(
    'Soit $P(x)=(x' + ev('-r;+') + ')(' + ev('x^2+b*x+c') + ')$.\n\n'
    'Combien l\'équation $P(x)=0$ a-t-elle de solutions réelles ?\n\n$?$',
    V_387_UNE, '1',
    ['Un produit est nul si et seulement si l\'un de ses facteurs est nul : $x=' + ev('r')
     + '$ ou $' + ev('x^2+b*x+c') + '=0$.',
     'Pour le trinôme, $\\Delta=' + ev('b;()') + '^2-4\\times' + ev('c;()') + '='
     + ev('b^2-4*c') + '<0$ : il n\'a pas de racine réelle.',
     'L\'équation a donc $' + col('1') + '$ seule solution réelle, $' + ev('r') + '$.'],
    ['r != 0', 'b^2 - 4*c < 0'])
V_387_DOUBLE = [X, var('r', '-4..4'), var('s', '-5..5')]
V387_DOUBLE = case(
    'Soit $P(x)=(x' + ev('-r;+') + ')(' + ev('x^2-2*s*x+s^2') + ')$.\n\n'
    'Combien l\'équation $P(x)=0$ a-t-elle de solutions réelles ?\n\n$?$',
    V_387_DOUBLE, '2',
    ['Un produit est nul si et seulement si l\'un de ses facteurs est nul : $x=' + ev('r')
     + '$ ou $' + ev('x^2-2*s*x+s^2') + '=0$.',
     'Pour le trinôme, $\\Delta=' + ev('(2*s)^2-4*s^2') + '$ : une racine double, $'
     + ev('s') + '$ (c\'est $(x' + ev('-s;+') + ')^2$).',
     'L\'équation a donc $' + col('2') + '$ solutions réelles, $' + ev('r') + '$ et $' + ev('s')
     + '$ : une racine double ne compte qu\'une fois.'],
    ['r != 0', 'r != s', 's != 0'])

VARS_387 = {'r': 1, 's': -2, 'u': 3}  # P(x) = x³ − 2x² − 5x + 6
VARS_387_UNE = {'r': 2, 'b': 1, 'c': 3}
VARS_387_DOUBLE = {'r': -1, 's': 2}
MODELES.append(modele(
    '02-resoudre-une-equation-de-degre-3', 'Résoudre une équation de degré 3',
    'Équation P(x) = 0 de degré 3 dont une racine est donnée : autres solutions (factorisation,'
    ' discriminant du facteur du second degré), nombre de solutions quand Δ < 0 ou Δ = 0',
    2,
    [V387_TROIS, V387_UNE, V387_DOUBLE],
    [spec('3', 0, '3', 'correct', VARS_387),
     spec('Erreur : −2 (la plus petite)', 0, '-2', 'incorrect', VARS_387),
     spec('Erreur : 1 (la racine donnée)', 0, '1', 'incorrect', VARS_387),
     spec('Une solution', 1, '1', 'correct', VARS_387_UNE),
     spec('Erreur : 3 (degré 3)', 1, '3', 'incorrect', VARS_387_UNE),
     spec('Erreur : 0', 1, '0', 'incorrect', VARS_387_UNE),
     spec('Deux solutions', 2, '2', 'correct', VARS_387_DOUBLE),
     spec('Erreur : 3 (racine double comptée deux fois)', 2, '3', 'incorrect', VARS_387_DOUBLE),
     spec('Erreur : 1', 2, '1', 'incorrect', VARS_387_DOUBLE)]))

# --- 3. 1SPE-257 : xⁿ − 1 = (x − 1)(xⁿ⁻¹ + ⋯ + x + 1), x³ − a³ = (x − a)(x² + ax + a²) ----------

V257_EXPOSANT = case(
    'Pour tout entier $n\\geqslant 2$ et tout réel $x$, $x^n-1$ se factorise par $x-1$. Complète.'
    '\n\n$x^{' + ev('n') + '}-1=(x-1)(x^{?}+x^{' + ev('n-2') + '}+\\cdots+x+1)$',
    [var('n', '5..9')], ev('n-1'),
    ['Le second facteur est la somme $1+x+\\cdots+x^{' + ev('n-1') + '}$ : elle compte $'
     + ev('n') + '$ termes, de $x^0$ à $x^{' + ev('n-1') + '}$.',
     'En développant, $x\\times x^{' + ev('n-1') + '}=x^{' + ev('n') + '}$ : l\'exposant cherché'
     ' est $' + col(ev('n-1')) + '$.',
     'Attention : ce n\'est pas $' + ev('n') + '$, sinon le produit commencerait par $x^{'
     + ev('n+1') + '}$.'])
V257_CUBES = case(
    'Pour tout réel $a$, $x^3-a^3=(x-a)(x^2+ax+a^2)$. Complète.\n\n'
    '$x^3-' + ev('a^3') + '=(x-' + ev('a') + ')(x^2+' + ev('a') + 'x+?)$',
    [var('a', '2..6')], ev('a^2'),
    ['$' + ev('a^3') + '=' + ev('a') + '^3$ : on applique la formule avec $a=' + ev('a') + '$.',
     'Le terme constant du second facteur est $a^2=' + ev('a') + '^2=' + col(ev('a^2')) + '$.',
     'Vérification : le terme constant du produit vaut $-' + ev('a') + '\\times' + ev('a^2')
     + '=-' + ev('a^3') + '$.'])
V257_PREUVE = ranger(
    'Soit $n$ un entier, $n\\geqslant 2$, et $x$ un réel. On démontre que'
    ' $x^n-1=(x-1)(1+x+\\cdots+x^{n-1})$.',
    ['On développe : $(x-1)(1+x+\\cdots+x^{n-1})=x(1+x+\\cdots+x^{n-1})-(1+x+\\cdots+x^{n-1})$.',
     'Or $x(1+x+\\cdots+x^{n-1})=x+x^2+\\cdots+x^n$.',
     'On soustrait : les termes $x$, …, $x^{n-1}$ se compensent, il reste $x^n-1$.',
     'Donc $x^n-1=(x-1)(1+x+\\cdots+x^{n-1})$.'],
    ['On distribue $x-1$, puis on multiplie chaque terme de la somme par $x$ : les exposants'
     ' avancent de $1$.',
     'Les deux sommes ont les mêmes termes sauf $x^n$ et $1$ : $'
     + col('x^n-1=(x-1)(1+x+\\cdots+x^{n-1})') + '$.'])

VARS_257_N = {'n': 6}
VARS_257_A = {'a': 3}
MODELES.append(modele(
    '03-factoriser-x-puissance-n-moins-a-puissance-n', 'Factoriser xⁿ − 1 et xⁿ − aⁿ',
    'xⁿ − 1 = (x − 1)(xⁿ⁻¹ + ⋯ + x + 1) : exposant du premier terme, x³ − a³ = (x − a)(x² + ax'
    ' + a²) avec a tiré, démonstration de la factorisation de xⁿ − 1 (étapes à ranger)',
    1,
    [V257_EXPOSANT, V257_CUBES, V257_PREUVE],
    [spec('Exposant 5 pour n = 6', 0, '5', 'correct', VARS_257_N),
     spec('Erreur : 6 (n)', 0, '6', 'incorrect', VARS_257_N),
     spec('Erreur : 4', 0, '4', 'incorrect', VARS_257_N),
     spec('a² = 9', 1, '9', 'correct', VARS_257_A),
     spec('Erreur : 3 (a)', 1, '3', 'incorrect', VARS_257_A),
     spec('Erreur : 27 (a³)', 1, '27', 'incorrect', VARS_257_A),
     spec('Erreur : 6 (2a)', 1, '6', 'incorrect', VARS_257_A)]
    + ['RANGER:2']))

# --- 4. 1SPE-258 : deux réels de somme s et de produit p ----------------------------------------

V_258 = [X, var('r', '-6..6'), var('t', '-6..7'), var('s', 'eval:r+t'), var('p', 'eval:r*t')]
C_258 = ['r < t', 'r != 0', 't != 0', 'r + t != 0']
INTRO_258 = ('On cherche deux réels dont la somme vaut $' + ev('s') + '$ et le produit $'
             + ev('p') + '$.\n\n')

V258_TRINOME = case(
    INTRO_258 + 'Ces deux réels sont les racines d\'un trinôme. Complète.\n\n'
    '$x^2-?x' + ev('p;+') + '$',
    V_258, ev('s'),
    ['Si $x_1+x_2=s$ et $x_1x_2=p$, alors $(x-x_1)(x-x_2)=x^2-(x_1+x_2)x+x_1x_2=x^2-sx+p$.',
     'Les deux réels sont donc les racines de $x^2-sx+p$, avec $s=' + col(ev('s')) + '$ : $'
     + ev('x^2-s*x+p') + '$.',
     'Attention au signe : le coefficient de $x$ est $-s$.'],
    C_258)
V258_PLUS_GRAND = case(
    INTRO_258 + 'Quel est le plus grand des deux ?\n\n$?$',
    V_258, ev('t'),
    ['Les deux réels sont les racines de $x^2-sx+p$, ici $' + ev('x^2-s*x+p') + '$.',
     '$\\Delta=' + ev('s;()') + '^2-4\\times' + ev('p;()') + '=' + ev('s^2-4*p') + '$, d\'où'
     ' deux racines : $' + ev('r') + '$ et $' + ev('t') + '$.',
     'Vérification : $' + ev('r') + ev('t;+') + '=' + ev('s') + '$ et $' + ev('r') + '\\times'
     + ev('t;()') + '=' + ev('p') + '$. Le plus grand est $' + col(ev('t')) + '$.'],
    C_258)
V258_AUCUN = justification(
    'On cherche deux réels dont la somme vaut $' + ev('s') + '$ et le produit $' + ev('p')
    + '$. Que peut-on dire ?',
    [var('x', 'x|x'), var('s', '-6..6'), var('p', '2..12')],
    'Il n\'existe pas deux tels réels.',
    ['Ce sont deux réels égaux à $' + ev('s/2') + '$.',
     'Il en existe deux, de signes contraires.',
     'Il en existe deux, puisque leur produit est positif.'],
    ['Deux tels réels seraient les racines de $x^2-sx+p$, ici $' + ev('x^2-s*x+p') + '$.',
     '$\\Delta=' + ev('s;()') + '^2-4\\times' + ev('p') + '=' + ev('s^2-4*p') + '<0$ : ce trinôme'
     ' n\'a pas de racine réelle.',
     'Donc ' + '**il n\'existe pas deux réels**' + ' de somme $' + ev('s') + '$ et de produit $'
     + ev('p') + '$.'],
    ['s != 0', 's^2 - 4*p < 0'])

VARS_258 = {'r': 2, 't': 5}  # s = 7, p = 10
VARS_258_AUCUN = {'s': 4, 'p': 5}
MODELES.append(modele(
    '04-deux-reels-de-somme-et-produit-donnes', 'Deux réels de somme et de produit donnés',
    'Deux réels de somme s et de produit p, racines de x² − sx + p : coefficient du trinôme, plus'
    ' grand des deux réels, cas Δ < 0 (case choix)',
    1,
    [V258_TRINOME, V258_PLUS_GRAND, V258_AUCUN],
    [spec('s = 7', 0, '7', 'correct', VARS_258),
     spec('Erreur : −7 (signe)', 0, '-7', 'incorrect', VARS_258),
     spec('Erreur : 10 (le produit)', 0, '10', 'incorrect', VARS_258),
     spec('5', 1, '5', 'correct', VARS_258),
     spec('Erreur : 2 (le plus petit)', 1, '2', 'incorrect', VARS_258),
     spec('Erreur : 7 (la somme)', 1, '7', 'incorrect', VARS_258)]
    + specs_choix(2, 'aucun réel', ['s/2', 'signes contraires', 'produit positif'],
                  VARS_258_AUCUN)))


# --- Specs « ranger » : positions affichées calculées par le générateur (graine 0) -------------

def positions(chemin, vi):
    out = subprocess.run(['pnpm', 'exec', 'tsx', 'docs/wip/questions/positions-ranger.ts', chemin, str(vi)],
                         check=True, capture_output=True, text=True).stdout.strip().splitlines()
    return json.loads(out[-1])


os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    chemin = os.path.join(DOSSIER, nom + '.json')
    a_ranger = [s for s in m['testSpecs'] if isinstance(s, str)]
    m['testSpecs'] = [s for s in m['testSpecs'] if not isinstance(s, str)]
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
    for marque in a_ranger:
        vi = int(marque.split(':')[1])
        juste = positions(chemin, vi)
        faux = juste[:]
        faux[1], faux[2] = faux[2], faux[1]
        m['testSpecs'] += [spec('Étapes dans l’ordre', vi, juste, 'correct'),
                           spec('Erreur : deuxième et troisième étapes échangées', vi, faux,
                                'incorrect')]
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
