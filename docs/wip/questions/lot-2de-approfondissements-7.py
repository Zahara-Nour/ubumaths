"""Écrit les 5 modèles du lot 7 « approfondissements : nombres et algèbre » de la seconde dans
scripts/questions/2de-approfondissements-7/.

Phase 0 validée par David le 2026-11-09 (« je suis tes recos », D5 du journal
« docs/wip/questions-2de-demonstrations-progress.md », § 13), un point par modèle :

| # | Point | Titre                                                  | Sous-notion (prod), niveau                    |
| 1 | 2-258 | Développement décimal illimité d'un réel               | Ensembles de nombres › ℕ, ℤ, 𝔻, ℚ, ℝ, 7        |
| 2 | 2-259 | Développement décimal périodique d'un rationnel        | Ensembles de nombres › ℕ, ℤ, 𝔻, ℚ, ℝ, 8        |
| 3 | 2-284 | Développer (a + b + c)²                                | Calcul littéral › identités remarquables, 11  |
| 4 | 2-285 | Développer (a + b)³                                    | Calcul littéral › identités remarquables, 12  |
| 5 | 2-286 | Démontrer l'inégalité entre moyennes (a, b > 0)        | Inégalités › comparaison et encadrement, 7    |

Forme (D5, Q2) : 258, 259, 284, 285 en exercices d'application à valeurs tirées ; 286 est une
preuve : à trous (case, case choix à 4 propositions, la première est la bonne, l'affichage les
mélange) et une variation « étapes à ranger » (`signe: aucun`). Niveaux : après ceux déjà présents
sur la sous-notion (relevé prod du 2026-11-09 : 1-6, 1-10, 1-6).

    python3 docs/wip/questions/lot-2de-approfondissements-7.py scripts/questions/2de-approfondissements-7
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, answer, status, variables=None, violations=None):
    expected = {'status': status}
    if status in ('bad_form', 'unoptimal_form'):
        expected['constraintViolations'] = violations or ['form']
    answers = answer if isinstance(answer, list) else [answer]
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in (variables or {}).items()},
            'answers': answers, 'expected': expected}


def modele(nom, title, description, level, variations, specs):
    return nom, {'title': title, 'description': description, 'grades': ['2'],
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


def case(statement, variables, attendu, steps):
    """Variation à une case ouverte (`?` dans une formule de l'énoncé)."""
    return {'statement': statement, 'variables': variables,
            'blanks': [attendu if isinstance(attendu, dict) else {'expectedAnswer': attendu}],
            'correction': {'steps': steps}}


def justification(statement, variables, bonne, autres, steps):
    """Variation à une case choix : la première proposition est la bonne (index 0)."""
    return {'statement': statement + choix([bonne] + autres), 'variables': variables,
            'blanks': [{'expectedAnswer': '0'}], 'correction': {'steps': steps}}


def ranger(intro, etapes, steps):
    """Variation « étapes à ranger » : étapes données dans le bon ordre."""
    return {'statement': intro + '\n\nRemets les étapes de la démonstration dans l\'ordre.\n\n'
            '```ranger\nsigne: aucun\n' + ''.join('- ' + e + '\n' for e in etapes) + '```',
            'variables': [], 'correction': {'steps': steps}}


def specs_choix(vi, juste, erreurs, variables=None):
    out = [spec(juste, vi, '0', 'correct', variables)]
    for k, erreur in enumerate(erreurs, start=1):
        out.append(spec('Erreur : ' + erreur, vi, str(k), 'incorrect', variables))
    return out


MODELES = []

MODELES = []

# --- 1. 2-258 : développement décimal illimité d'un réel ---------------------------------------

D = ev('d')
V258_FRACTION = case(
    'Tout nombre réel a un développement décimal illimité. On cherche l\'écriture fractionnaire'
    ' de $x=0{,}' + D + D + D + D + '\\ldots$ (le chiffre $' + D + '$ se répète indéfiniment).\n\n'
    'On a $10x=' + D + '{,}' + D + D + D + '\\ldots$, donc $10x-x=' + D + '$.\n\n'
    'Complète.\n\n$x=?$',
    [var('d', '1..8')], '\\frac{' + D + '}{9}',
    ['$10x-x=9x$ : les décimales s\'annulent, il reste $9x=' + D + '$.',
     'Donc $x=' + col('\\frac{' + D + '}{9}') + '$.'])
V258_NEUF = justification(
    'On pose $x=0{,}999\\ldots$ (le chiffre $9$ se répète indéfiniment). Alors'
    ' $10x=9{,}999\\ldots$ et $10x-x=9$.\n\nQue vaut $x$ ?',
    [],
    '$x=1$ : $1$ a deux développements décimaux, $1{,}000\\ldots$ et $0{,}999\\ldots$',
    ['$x$ est le plus grand nombre strictement inférieur à $1$.',
     '$x=0{,}9$',
     '$x$ n\'existe pas : on ne peut pas écrire une infinité de chiffres.'],
    ['$10x-x=9x=9$, donc $' + col('x=1') + '$.',
     'Il n\'existe pas de plus grand nombre strictement inférieur à $1$ : entre un tel nombre et'
     ' $1$, on en trouverait toujours un autre.',
     'Un nombre décimal a deux développements : l\'un finit par des $0$, l\'autre par des $9$.'])
N = ev('n')
V258_TRONCATURE = case(
    'Le développement décimal de $\\pi$ commence par $\\pi=3{,}14159265\\ldots$\n\n'
    'Donne la troncature de $\\pi$ à $10^{-' + N + '}$ (on garde ' + N
    + ' chiffre(s) après la virgule, sans arrondir).\n\n$?$',
    [var('n', '1..6')], ev('floor(10^n*\\pi)/10^n;d'),
    ['On garde les $' + N + '$ premiers chiffres après la virgule et on supprime les suivants.',
     'La troncature de $\\pi$ à $10^{-' + N + '}$ est $' + col(ev('floor(10^n*\\pi)/10^n;d')) + '$,'
     ' et $' + ev('floor(10^n*\\pi)/10^n;d') + '\\leqslant \\pi<' + ev('(floor(10^n*\\pi)+1)/10^n;d')
     + '$.'])

MODELES.append(modele(
    '01-developpement-decimal-illimite', 'Développement décimal illimité d\'un nombre réel',
    'x = 0,ddd… = d/9 par 10x − x (case, d de 1 à 8) ; 0,999… = 1 (case choix) ; troncature de π'
    ' à 10⁻ⁿ (case, n de 1 à 6)',
    7,
    [V258_FRACTION, V258_NEUF, V258_TRONCATURE],
    [spec('4/9', 0, '\\frac{4}{9}', 'correct', {'d': 4}),
     spec('Erreur : 4/10', 0, '\\frac{4}{10}', 'incorrect', {'d': 4}),
     spec('Erreur : 0,4', 0, '0.4', 'incorrect', {'d': 4}),
     spec('Erreur : 9/4', 0, '\\frac{9}{4}', 'incorrect', {'d': 4}),
     spec('6/9 simplifié en 2/3', 0, '\\frac{2}{3}', 'correct', {'d': 6})]
    + specs_choix(1, 'x = 1', ['plus grand nombre < 1', '0,9', 'n\'existe pas'])
    + [spec('3,141', 2, '3.141', 'correct', {'n': 3}),
       spec('Erreur : arrondi 3,142', 2, '3.142', 'incorrect', {'n': 4}),
       spec('3,1415', 2, '3.1415', 'correct', {'n': 4}),
       spec('Erreur : 3,14 (deux chiffres)', 2, '3.14', 'incorrect', {'n': 3})]))

# --- 2. 2-259 : périodicité du développement décimal d'un rationnel ----------------------------

A = ev('a')
PERIODE = ev('floor(10^6*a/7)')
RANG = ev('mod(n-1,6)+1')
CHIFFRE = ev('mod(floor(10^(mod(n-1,6)+1)*a/7),10)')
V259_RANG = case(
    'Le développement décimal de $\\frac{' + A + '}{7}$ est périodique :\n\n'
    '$$\\frac{' + A + '}{7}=0{,}' + PERIODE + PERIODE + '\\ldots$$\n\n'
    'le bloc $' + PERIODE + '$ se répète indéfiniment.\n\n'
    'Quel est le $' + N + '^\\text{e}$ chiffre après la virgule ?\n\n$?$',
    [var('a', '1..6'), var('n', '20..60')], CHIFFRE,
    ['La période a $6$ chiffres : les chiffres de rang $1$ à $6$, puis de $7$ à $12$, etc. sont'
     ' les mêmes.',
     '$' + N + '=6\\times ' + ev('floor((n-1)/6)') + '+' + RANG + '$ : le $' + N
     + '^\\text{e}$ chiffre est le $' + RANG + '^\\text{e}$ chiffre du bloc $' + PERIODE + '$.',
     'C\'est $' + col(CHIFFRE) + '$.'])
U, V = ev('u'), ev('v')
AB = ev('10*u+v')
V259_FRACTION = case(
    'On pose $x=0{,}' + U + V + U + V + U + V + '\\ldots$ (le bloc $' + AB + '$ se répète'
    ' indéfiniment).\n\nOn a $100x=' + AB + '{,}' + U + V + U + V + '\\ldots$, donc'
    ' $100x-x=' + AB + '$.\n\nComplète.\n\n$x=?$',
    [var('u', '1..9'), var('v', '0..9')], '\\frac{' + AB + '}{99}',
    ['$100x-x=99x$ : les décimales s\'annulent, il reste $99x=' + AB + '$.',
     'Donc $x=' + col('\\frac{' + AB + '}{99}') + '$ : $x$ est un nombre rationnel.'],
)
V259_FRACTION['conditions'] = ['u != v']
V259_RESTES = justification(
    'On pose la division de $1$ par $7$ : à chaque étape, le reste est un entier compris entre'
    ' $0$ et $6$, et dès qu\'un reste revient, les chiffres du quotient se répètent.\n\n'
    'Pourquoi le développement décimal de $\\frac{1}{7}$ est-il forcément périodique ?',
    [],
    'Car il n\'y a que $7$ restes possibles : un reste finit par revenir.',
    ['Car $7$ est un nombre premier.',
     'Car la division ne s\'arrête jamais.',
     'Car $\\frac{1}{7}$ est plus petit que $1$.'],
    ['Les restes sont pris parmi $0$, $1$, …, $6$ : au bout de $7$ étapes au plus, un reste'
     ' revient.',
     'À partir de là, la division recommence de la même façon : les chiffres se répètent.',
     'C\'est vrai pour tout quotient d\'entiers : ' + '**le développement décimal d\'un rationnel'
     ' est périodique**' + '.'])

MODELES.append(modele(
    '02-developpement-decimal-periodique', 'Développement décimal périodique d\'un rationnel',
    'n-ième chiffre de a/7 par la période de 6 chiffres (case, a de 1 à 6, n de 20 à 60) ;'
    ' 0,uvuv… = uv/99 (case) ; périodicité par les restes de la division (case choix)',
    8,
    [V259_RANG, V259_FRACTION, V259_RESTES],
    # 3/7 = 0,428571… : rang 26 = 6×4 + 2 → 2
    [spec('3/7, rang 26 : 2', 0, '2', 'correct', {'a': 3, 'n': 26}),
     spec('Erreur : 26 mod 6 compté à partir de 0 (8)', 0, '8', 'incorrect', {'a': 3, 'n': 26}),
     spec('1/7, rang 30 : 7', 0, '7', 'correct', {'a': 1, 'n': 30}),
     spec('37/99', 1, '\\frac{37}{99}', 'correct', {'u': 3, 'v': 7}),
     spec('Erreur : 37/100', 1, '\\frac{37}{100}', 'incorrect', {'u': 3, 'v': 7}),
     spec('Erreur : 37/9', 1, '\\frac{37}{9}', 'incorrect', {'u': 3, 'v': 7}),
     spec('12/99 simplifié en 4/33', 1, '\\frac{4}{33}', 'correct', {'u': 1, 'v': 2})]
    + specs_choix(2, '7 restes possibles', ['7 premier', 'division infinie', 'plus petit que 1'])))

# --- 3. 2-284 : développement de (a + b + c)² --------------------------------------------------

K = ev('k')
V284_FORMULE = case(
    'On développe $(a+b+c)^2=(a+b+c)(a+b+c)$. Complète.\n\n'
    '$(a+b+c)^2=a^2+b^2+c^2+2ab+2ac+?$',
    [], '2bc',
    ['Chaque terme de la première parenthèse est multiplié par chaque terme de la seconde :'
     ' $9$ produits.',
     'Les produits croisés vont par deux : $ab+ba=2ab$, $ac+ca=2ac$, $bc+cb=' + col('2bc')
     + '$.'])
V284_DEVELOPPER = case(
    'Développe et réduis.\n\n$(x+y+' + K + ')^2=?$',
    [var('k', '2..6')],
    'x^2+y^2+' + ev('k^2') + '+2xy+' + ev('2*k') + 'x+' + ev('2*k') + 'y',
    ['On applique $(a+b+c)^2=a^2+b^2+c^2+2ab+2ac+2bc$ avec $a=x$, $b=y$ et $c=' + K + '$.',
     '$(x+y+' + K + ')^2=' + col('x^2+y^2+' + ev('k^2') + '+2xy+' + ev('2*k') + 'x+'
                               + ev('2*k') + 'y') + '$.'])
V284_ERREUR = justification(
    'Un élève écrit $(a+b+c)^2=a^2+b^2+c^2$.\n\nQu\'a-t-il oublié ?',
    [],
    'Les doubles produits $2ab+2ac+2bc$.',
    ['Rien : son égalité est juste.',
     'Le terme $2abc$.',
     'Le terme $3abc$.'],
    ['Pour $a=b=c=1$ : $(1+1+1)^2=9$, mais $1^2+1^2+1^2=3$.',
     'Il manque ' + '**les doubles produits $2ab+2ac+2bc$**' + ' : $3+2+2+2=9$.'])

MODELES.append(modele(
    '03-developper-carre-d-une-somme-de-trois-termes', 'Développer $(a+b+c)^2$',
    'Formule (a + b + c)² : double produit 2bc (case) ; (x + y + k)² développé et réduit (case,'
    ' k de 2 à 6) ; oubli des doubles produits (case choix)',
    11,
    [V284_FORMULE, V284_DEVELOPPER, V284_ERREUR],
    [spec('2bc', 0, '2bc', 'correct'),
     spec('Erreur : bc', 0, 'bc', 'incorrect'),
     spec('Erreur : 2abc', 0, '2abc', 'incorrect'),
     spec('k = 3', 1, 'x^2+y^2+9+2xy+6x+6y', 'correct', {'k': 3}),
     spec('k = 3, autre ordre', 1, 'x^2+2xy+y^2+6x+6y+9', 'correct', {'k': 3}),
     spec('Erreur : sans doubles produits', 1, 'x^2+y^2+9', 'incorrect', {'k': 3}),
     spec('Erreur : 3 au lieu de 9', 1, 'x^2+y^2+3+2xy+6x+6y', 'incorrect', {'k': 3}),
     spec('Non développé', 1, '(x+y+3)^2', 'bad_form', {'k': 3})]
    + specs_choix(2, 'doubles produits', ['rien', '2abc', '3abc'])))

# --- 4. 2-285 : développement de (a + b)³ ------------------------------------------------------

V285_FORMULE = case(
    'On développe $(a+b)^3=(a+b)(a+b)^2=(a+b)(a^2+2ab+b^2)$. Complète.\n\n'
    '$(a+b)^3=a^3+3a^2b+?+b^3$',
    [], '3ab^2',
    ['$a(a^2+2ab+b^2)=a^3+2a^2b+ab^2$ et $b(a^2+2ab+b^2)=a^2b+2ab^2+b^3$.',
     'On additionne : $a^3+3a^2b+' + col('3ab^2') + '+b^3$.'])
V285_DEVELOPPER = case(
    'Développe et réduis.\n\n$(x' + ev('k;+') + ')^3=?$',
    [var('k', '-4..4')],
    'x^3' + ev('3*k;+') + 'x^2' + ev('3*k^2;+') + 'x' + ev('k^3;+'),
    ['On applique $(a+b)^3=a^3+3a^2b+3ab^2+b^3$ avec $a=x$ et $b=' + K + '$.',
     '$3\\times ' + ev('k;()') + '=' + ev('3*k') + '$, $3\\times ' + ev('k;()') + '^2='
     + ev('3*k^2') + '$ et $' + ev('k;()') + '^3=' + ev('k^3') + '$.',
     '$(x' + ev('k;+') + ')^3=' + col('x^3' + ev('3*k;+') + 'x^2' + ev('3*k^2;+') + 'x'
                                  + ev('k^3;+')) + '$.'])
V285_DEVELOPPER['conditions'] = ['k != 0']
V285_MOINS = justification(
    'En remplaçant $b$ par $-b$ dans $(a+b)^3=a^3+3a^2b+3ab^2+b^3$, que vaut $(a-b)^3$ ?',
    [],
    '$a^3-3a^2b+3ab^2-b^3$',
    ['$a^3-b^3$',
     '$a^3-3a^2b-3ab^2-b^3$',
     '$a^3+3a^2b-3ab^2-b^3$'],
    ['$(-b)^2=b^2$ est positif, $(-b)^3=-b^3$ est négatif.',
     'Donc $(a-b)^3=' + col('a^3-3a^2b+3ab^2-b^3') + '$ : les signes alternent.'])

MODELES.append(modele(
    '04-developper-cube-d-une-somme', 'Développer $(a+b)^3$',
    'Formule (a + b)³ par (a + b)(a + b)² : terme 3ab² (case) ; (x + k)³ développé et réduit'
    ' (case, k de −4 à 4, non nul) ; (a − b)³ (case choix)',
    12,
    [V285_FORMULE, V285_DEVELOPPER, V285_MOINS],
    [spec('3ab²', 0, '3ab^2', 'correct'),
     spec('Erreur : 2ab²', 0, '2ab^2', 'incorrect'),
     spec('Erreur : 3a²b', 0, '3a^2b', 'incorrect'),
     spec('k = 2', 1, 'x^3+6x^2+12x+8', 'correct', {'k': 2}),
     spec('k = −2', 1, 'x^3-6x^2+12x-8', 'correct', {'k': -2}),
     spec('Erreur : x³ + 8', 1, 'x^3+8', 'incorrect', {'k': 2}),
     spec('Erreur : 3k² oublié (x³ + 6x² + 6x + 8)', 1, 'x^3+6x^2+6x+8', 'incorrect', {'k': 2}),
     spec('Non développé', 1, '(x+2)^3', 'bad_form', {'k': 2})]
    + specs_choix(2, 'signes alternés', ['a³ − b³', 'tout en moins', 'mauvais signes'])))

# --- 5. 2-286 : inégalité entre moyennes géométrique et arithmétique ---------------------------

INTRO_286 = ('Soit $a$ et $b$ deux réels strictement positifs. On démontre que leur moyenne'
             ' géométrique $\\sqrt{ab}$ est inférieure ou égale à leur moyenne arithmétique'
             ' $\\frac{a+b}{2}$.\n\n')
V286_CARRE = case(
    INTRO_286 + 'On développe $(\\sqrt{a}-\\sqrt{b})^2$, avec $(\\sqrt{a})^2=a$ et'
    ' $\\sqrt{a}\\sqrt{b}=\\sqrt{ab}$. Complète.\n\n$(\\sqrt{a}-\\sqrt{b})^2=a+b-?\\,\\sqrt{ab}$',
    [], '2',
    ['$(\\sqrt{a}-\\sqrt{b})^2=(\\sqrt{a})^2-2\\sqrt{a}\\sqrt{b}+(\\sqrt{b})^2$ : c\'est le double'
     ' produit de $(u-v)^2=u^2-2uv+v^2$.',
     'Donc $(\\sqrt{a}-\\sqrt{b})^2=a+b-' + col('2') + '\\sqrt{ab}$.'])
V286_POSITIF = justification(
    INTRO_286 + 'On a $(\\sqrt{a}-\\sqrt{b})^2=a+b-2\\sqrt{ab}$. Pourquoi a-t-on'
    ' $a+b-2\\sqrt{ab}\\geqslant 0$ ?',
    [],
    'Car un carré est positif ou nul.',
    ['Car $a$ et $b$ sont strictement positifs.',
     'Car $\\sqrt{a}\\geqslant\\sqrt{b}$.',
     'Car $a+b$ est positif.'],
    ['$a+b-2\\sqrt{ab}$ est le carré de $\\sqrt{a}-\\sqrt{b}$ : ' + '**un carré est positif ou'
     ' nul**' + '.',
     'On ne sait pas si $\\sqrt{a}\\geqslant\\sqrt{b}$, et le carré est positif même si'
     ' $\\sqrt{a}-\\sqrt{b}<0$.',
     'Que $a+b$ soit positif ne suffit pas : on lui retire $2\\sqrt{ab}$.'])
P, Q = ev('p'), ev('q')
V286_EXEMPLE = case(
    'Soit $a=' + ev('p^2') + '$ et $b=' + ev('q^2') + '$. Leur moyenne arithmétique est'
    ' $\\frac{a+b}{2}=' + ev('(p^2+q^2)/2;d') + '$.\n\n'
    'Calcule leur moyenne géométrique.\n\n$\\sqrt{ab}=?$',
    [var('p', '1..6'), var('q', '1..6')], ev('p*q'),
    ['$\\sqrt{ab}=\\sqrt{' + ev('p^2') + '}\\times\\sqrt{' + ev('q^2') + '}=' + P + '\\times '
     + Q + '=' + col(ev('p*q')) + '$.',
     'On vérifie : $' + ev('p*q') + '\\leqslant ' + ev('(p^2+q^2)/2;d') + '$, comme le dit'
     ' l\'inégalité.'])
V286_EXEMPLE['conditions'] = ['p < q']
V286_RANGER = ranger(
    'Soit $a$ et $b$ deux réels strictement positifs. On démontre que'
    ' $\\sqrt{ab}\\leqslant\\frac{a+b}{2}$.',
    ['On développe : $(\\sqrt{a}-\\sqrt{b})^2=a-2\\sqrt{ab}+b$.',
     'Un carré est positif ou nul, donc $a-2\\sqrt{ab}+b\\geqslant 0$.',
     'Donc $a+b\\geqslant 2\\sqrt{ab}$.',
     'On divise par $2$ : $\\frac{a+b}{2}\\geqslant\\sqrt{ab}$.'],
    ['On part du carré $(\\sqrt{a}-\\sqrt{b})^2$, positif, puis on isole $\\sqrt{ab}$.',
     'Conclusion : $' + col('\\sqrt{ab}\\leqslant\\frac{a+b}{2}') + '$.'])

MODELES.append(modele(
    '05-demontrer-inegalite-des-moyennes', 'Démontrer que $\\sqrt{ab}\\leqslant\\frac{a+b}{2}$',
    'Démonstration à trous pour a, b > 0 : coefficient 2 du double produit de (√a − √b)² (case), un carré est positif'
    ' (case choix), exemple a = p², b = q² (case) ; étapes à ranger',
    7,
    [V286_CARRE, V286_POSITIF, V286_EXEMPLE, V286_RANGER],
    [spec('2', 0, '2', 'correct'),
     spec('Erreur : 1 (double produit oublié)', 0, '1', 'incorrect'),
     spec('Erreur : 4', 0, '4', 'incorrect')]
    + specs_choix(1, 'carré positif', ['a, b positifs', '√a ≥ √b', 'a + b positif'])
    + [spec('a = 4, b = 25 : 10', 2, '10', 'correct', {'p': 2, 'q': 5}),
       spec('Erreur : ab = 100', 2, '100', 'incorrect', {'p': 2, 'q': 5}),
       spec('Erreur : moyenne arithmétique 14,5', 2, '14.5', 'incorrect', {'p': 2, 'q': 5})]
    + ['RANGER:3']))

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
