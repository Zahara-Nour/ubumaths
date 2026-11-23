"""Écrit les 7 modèles du sous-lot 8b « à savoir » (primitives de référence, y′ = ay + b,
intégration par parties) de la terminale spécialité dans scripts/questions/tspe-8b-savoir/.

Phase 0 validée par David le 2026-11-02 (« je valide » sur les recos, D-L8 du journal
« docs/archive/wip/questions-tspe-restes-progress.md »), un point par modèle :

| # | Point    | Fait                                 | Domaine › À savoir, niveau     |
| 1 | TSPE-463 | primitive de xⁿ, n ∈ ℤ, n ≠ −1       | Primitives, 1                  |
| 2 | TSPE-603 | primitive de 1/√x                    | Primitives, 2                  |
| 3 | TSPE-604 | primitive de exp                     | Primitives, 3                  |
| 4 | TSPE-605 | primitive de sin                     | Primitives, 4                  |
| 5 | TSPE-606 | primitive de cos                     | Primitives, 5                  |
| 6 | TSPE-466 | solutions de y′ = ay + b             | Équations différentielles, 1   |
| 7 | TSPE-484 | formule d'intégration par parties    | Calcul intégral, 1             |

Sous-domaine « À savoir » neuf dans chaque domaine (relevé prod du 2026-11-02 : aucun dans ces trois
domaines). Thèmes repris des voisins en prod : « Primitives et équations différentielles »
(Primitives, Équations différentielles), « Intégration » (Calcul intégral). Même forme que 8a
(lot-tspe-savoir-a.py) : case choix à 4 propositions (la première est la bonne, l'affichage les
mélange), erreurs typiques en distracteurs, deux sens de lecture. Aucune variable.

    python3 docs/wip/questions/lot-tspe-savoir-b.py scripts/questions/tspe-8b-savoir
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, answer, status):
    return {'description': desc, 'variationIndex': vi, 'variables': {},
            'answers': [answer], 'expected': {'status': status}}


def modele(nom, title, description, theme, domain, level, variations, libelles):
    assert len(libelles) == len(variations)
    specs = []
    for vi, (juste, erreurs) in enumerate(libelles):
        assert len(erreurs) == 3
        specs.append(spec(juste, vi, '0', 'correct'))
        for k, erreur in enumerate(erreurs, start=1):
            specs.append(spec('Erreur : ' + erreur, vi, str(k), 'incorrect'))
    return nom, {'title': title, 'description': description, 'grades': ['T_SPE'],
                 'theme': theme, 'domain': domain, 'subdomain': 'À savoir', 'level': level,
                 'delay': 30, 'status': 'draft', 'shared': {},
                 'variations': variations, 'testSpecs': specs}


def col(x):
    return '\\textcolor{{{color:primary.0}}}{' + x + '}'


def choix(lignes):
    return '\n\n```choix\n' + ''.join('- ' + l + '\n' for l in lignes) + '```'


def qcm(statement, bonne, autres, steps):
    """Variation sans variable : la première proposition est la bonne (index 0)."""
    assert len(autres) == 3
    return {'statement': statement + choix([bonne] + autres), 'variables': [],
            'blanks': [{'expectedAnswer': '0'}], 'correction': {'steps': steps}}


MODELES = []
PRIM = 'Primitives et équations différentielles'
R_PLUS = ']0\\,;+\\infty['

# --- 1. TSPE-463 : primitive de xⁿ --------------------------------------------------------------

V463_FORMULE = qcm(
    'Soit $n$ un entier relatif, $n\\neq -1$. Sur un intervalle où elle est définie, une primitive'
    ' de la fonction $x\\mapsto x^n$ est :',
    '$x\\mapsto\\dfrac{x^{n+1}}{n+1}$',
    ['$x\\mapsto nx^{n-1}$', '$x\\mapsto x^{n+1}$', '$x\\mapsto\\dfrac{x^{n+1}}{n}$'],
    ['À connaître : pour $n$ entier relatif, $n\\neq -1$, une primitive de $x\\mapsto x^n$ est $'
     + col('x\\mapsto\\dfrac{x^{n+1}}{n+1}') + '$ (sur $\\mathbb{R}$ si $n\\geqslant 0$, sur'
     ' $]0\\,;+\\infty[$ ou $]-\\infty\\,;0[$ si $n\\leqslant -2$).',
     'Vérification : la dérivée de $\\dfrac{x^{n+1}}{n+1}$ est $\\dfrac{(n+1)x^n}{n+1}=x^n$.'
     ' $nx^{n-1}$ est la DÉRIVÉE de $x^n$, pas une primitive.'])
V463_POSITIF = qcm(
    'Une primitive sur $\\mathbb{R}$ de la fonction $x\\mapsto x^3$ est :',
    '$x\\mapsto\\dfrac{x^4}{4}$',
    ['$x\\mapsto 3x^2$', '$x\\mapsto x^4$', '$x\\mapsto\\dfrac{x^4}{3}$'],
    ['À connaître : une primitive de $x\\mapsto x^n$ est $x\\mapsto\\dfrac{x^{n+1}}{n+1}$.',
     'Avec $n=3$ : $' + col('x\\mapsto\\dfrac{x^4}{4}') + '$. Vérification :'
     ' $\\left(\\dfrac{x^4}{4}\\right)\'=\\dfrac{4x^3}{4}=x^3$.'])
V463_NEGATIF = qcm(
    'Une primitive sur $' + R_PLUS + '$ de la fonction $x\\mapsto\\dfrac{1}{x^2}$ est :',
    '$x\\mapsto-\\dfrac{1}{x}$',
    ['$x\\mapsto\\dfrac{1}{x}$', '$x\\mapsto-\\dfrac{2}{x^3}$', '$x\\mapsto-\\dfrac{1}{3x^3}$'],
    ['À connaître : une primitive de $x\\mapsto x^n$ ($n\\neq -1$) est'
     ' $x\\mapsto\\dfrac{x^{n+1}}{n+1}$, aussi pour $n$ négatif.',
     'Ici $\\dfrac{1}{x^2}=x^{-2}$, donc $n=-2$ et $n+1=-1$ : une primitive est'
     ' $\\dfrac{x^{-1}}{-1}$, soit $' + col('x\\mapsto-\\dfrac{1}{x}') + '$.',
     '$-\\dfrac{2}{x^3}$ est la DÉRIVÉE de $\\dfrac{1}{x^2}$ ; $-\\dfrac{1}{3x^3}$ vient de'
     ' l\'exposant $n-1$ au lieu de $n+1$.'])

MODELES.append(modele(
    '01-primitive-puissance', 'Primitive de x ↦ xⁿ',
    'À savoir : une primitive de xⁿ (n ∈ ℤ, n ≠ −1) est xⁿ⁺¹/(n + 1) ; formule générale, cas'
    ' n = 3, cas n = −2 ; distracteurs : dérivée, oubli de la division, division par n',
    PRIM, 'Primitives', 1,
    [V463_FORMULE, V463_POSITIF, V463_NEGATIF],
    [('xⁿ⁺¹/(n + 1)', ['dérivée nxⁿ⁻¹', 'xⁿ⁺¹ sans diviser', 'division par n']),
     ('x⁴/4', ['dérivée 3x²', 'x⁴', 'x⁴/3']),
     ('−1/x', ['1/x (signe)', 'dérivée −2/x³', 'exposant n − 1'])]))

# --- 2. TSPE-603 : primitive de 1/√x ------------------------------------------------------------

V603_DIRECT = qcm(
    'Une primitive sur $' + R_PLUS + '$ de la fonction $x\\mapsto\\dfrac{1}{\\sqrt{x}}$ est :',
    '$x\\mapsto 2\\sqrt{x}$',
    ['$x\\mapsto\\sqrt{x}$', '$x\\mapsto\\dfrac{\\sqrt{x}}{2}$',
     '$x\\mapsto-\\dfrac{1}{2x\\sqrt{x}}$'],
    ['À connaître : une primitive sur $' + R_PLUS + '$ de $x\\mapsto\\dfrac{1}{\\sqrt{x}}$ est $'
     + col('x\\mapsto 2\\sqrt{x}') + '$.',
     'Vérification : $\\left(2\\sqrt{x}\\right)\'=2\\times\\dfrac{1}{2\\sqrt{x}}='
     '\\dfrac{1}{\\sqrt{x}}$. $\\sqrt{x}$ a pour dérivée $\\dfrac{1}{2\\sqrt{x}}$ : il manque le'
     ' facteur $2$.'])
V603_INVERSE = qcm(
    'La fonction $x\\mapsto 2\\sqrt{x}$ est une primitive sur $' + R_PLUS + '$ de la fonction :',
    '$x\\mapsto\\dfrac{1}{\\sqrt{x}}$',
    ['$x\\mapsto\\dfrac{1}{2\\sqrt{x}}$', '$x\\mapsto\\sqrt{x}$',
     '$x\\mapsto\\dfrac{4}{3}x\\sqrt{x}$'],
    ['À connaître : une primitive sur $' + R_PLUS + '$ de $x\\mapsto\\dfrac{1}{\\sqrt{x}}$ est'
     ' $x\\mapsto 2\\sqrt{x}$.',
     'Autrement dit, $\\left(2\\sqrt{x}\\right)\'=' + col('\\dfrac{1}{\\sqrt{x}}') + '$.'
     ' $\\dfrac{4}{3}x\\sqrt{x}$ est une primitive de $2\\sqrt{x}$ (sens inversé).'])

MODELES.append(modele(
    '02-primitive-inverse-racine', 'Primitive de x ↦ 1/√x',
    'À savoir : une primitive de 1/√x sur ]0 ; +∞[ est 2√x ; dans les deux sens ; distracteurs :'
    ' √x (facteur oublié), √x/2, dérivée',
    PRIM, 'Primitives', 2,
    [V603_DIRECT, V603_INVERSE],
    [('2√x', ['√x', '√x/2', 'dérivée']),
     ('1/√x', ['1/(2√x)', '√x', 'primitive (sens inversé)'])]))

# --- 3. TSPE-604 : primitive de exp -------------------------------------------------------------

V604_UNE = qcm(
    'Une primitive sur $\\mathbb{R}$ de la fonction exponentielle $x\\mapsto e^x$ est :',
    '$x\\mapsto e^x$',
    ['$x\\mapsto xe^{x-1}$', '$x\\mapsto\\dfrac{e^{x+1}}{x+1}$', '$x\\mapsto e^{-x}$'],
    ['À connaître : la fonction exponentielle est sa propre dérivée, donc $'
     + col('x\\mapsto e^x') + '$ est une primitive de $x\\mapsto e^x$ sur $\\mathbb{R}$.',
     'Les formules des puissances ($xe^{x-1}$, $\\dfrac{e^{x+1}}{x+1}$) ne s\'appliquent pas :'
     ' l\'inconnue est dans l\'EXPOSANT.'])
V604_TOUTES = qcm(
    'Les primitives sur $\\mathbb{R}$ de la fonction $x\\mapsto e^x$ sont les fonctions (où $C$'
    ' est un réel quelconque) :',
    '$x\\mapsto e^x+C$',
    ['$x\\mapsto Ce^x$', '$x\\mapsto e^x+Cx$', '$x\\mapsto xe^x+C$'],
    ['À connaître : $x\\mapsto e^x$ est une primitive de $x\\mapsto e^x$, et deux primitives'
     ' diffèrent d\'une constante.',
     'Les primitives sont donc les fonctions $' + col('x\\mapsto e^x+C') + '$, $C\\in\\mathbb{R}$.',
     '$Ce^x$ a pour dérivée $Ce^x$, égale à $e^x$ seulement si $C=1$.'])

MODELES.append(modele(
    '03-primitive-exponentielle', 'Primitive de la fonction exponentielle',
    'À savoir : exp est une primitive de exp sur ℝ ; les primitives sont eˣ + C ; distracteurs :'
    ' formules des puissances, Ceˣ, eˣ + Cx',
    PRIM, 'Primitives', 3,
    [V604_UNE, V604_TOUTES],
    [('eˣ', ['xeˣ⁻¹ (puissances)', 'eˣ⁺¹/(x + 1)', 'e⁻ˣ']),
     ('eˣ + C', ['Ceˣ', 'eˣ + Cx', 'xeˣ + C'])]))

# --- 4. TSPE-605 : primitive de sin -------------------------------------------------------------

V605_DIRECT = qcm(
    'Une primitive sur $\\mathbb{R}$ de la fonction $x\\mapsto\\sin x$ est :',
    '$x\\mapsto-\\cos x$',
    ['$x\\mapsto\\cos x$', '$x\\mapsto-\\sin x$', '$x\\mapsto\\sin x$'],
    ['À connaître : une primitive sur $\\mathbb{R}$ de $x\\mapsto\\sin x$ est $'
     + col('x\\mapsto-\\cos x') + '$.',
     'Vérification : $(-\\cos x)\'=-(-\\sin x)=\\sin x$. Avec $\\cos x$, le signe est faux :'
     ' $(\\cos x)\'=-\\sin x$.'])
V605_INVERSE = qcm(
    'La fonction $x\\mapsto-\\cos x$ est une primitive sur $\\mathbb{R}$ de la fonction :',
    '$x\\mapsto\\sin x$',
    ['$x\\mapsto-\\sin x$', '$x\\mapsto\\cos x$', '$x\\mapsto-\\cos x$'],
    ['À connaître : une primitive de $x\\mapsto\\sin x$ est $x\\mapsto-\\cos x$.',
     'Autrement dit, $(-\\cos x)\'=' + col('\\sin x') + '$.'])

MODELES.append(modele(
    '04-primitive-sinus', 'Primitive de la fonction sinus',
    'À savoir : une primitive de sin sur ℝ est −cos ; dans les deux sens ; distracteurs : cos'
    ' (signe), −sin, la fonction elle-même',
    PRIM, 'Primitives', 4,
    [V605_DIRECT, V605_INVERSE],
    [('−cos', ['cos (signe)', '−sin', 'sin']),
     ('sin', ['−sin (signe)', 'cos', '−cos'])]))

# --- 5. TSPE-606 : primitive de cos -------------------------------------------------------------

V606_DIRECT = qcm(
    'Une primitive sur $\\mathbb{R}$ de la fonction $x\\mapsto\\cos x$ est :',
    '$x\\mapsto\\sin x$',
    ['$x\\mapsto-\\sin x$', '$x\\mapsto-\\cos x$', '$x\\mapsto\\cos x$'],
    ['À connaître : une primitive sur $\\mathbb{R}$ de $x\\mapsto\\cos x$ est $'
     + col('x\\mapsto\\sin x') + '$.',
     'Vérification : $(\\sin x)\'=\\cos x$. Avec $-\\sin x$, le signe est faux :'
     ' $(-\\sin x)\'=-\\cos x$.'])
V606_INVERSE = qcm(
    'La fonction $x\\mapsto\\sin x$ est une primitive sur $\\mathbb{R}$ de la fonction :',
    '$x\\mapsto\\cos x$',
    ['$x\\mapsto-\\cos x$', '$x\\mapsto-\\sin x$', '$x\\mapsto\\sin x$'],
    ['À connaître : une primitive de $x\\mapsto\\cos x$ est $x\\mapsto\\sin x$.',
     'Autrement dit, $(\\sin x)\'=' + col('\\cos x') + '$.'])

MODELES.append(modele(
    '05-primitive-cosinus', 'Primitive de la fonction cosinus',
    'À savoir : une primitive de cos sur ℝ est sin ; dans les deux sens ; distracteurs : −sin'
    ' (signe), −cos, la fonction elle-même',
    PRIM, 'Primitives', 5,
    [V606_DIRECT, V606_INVERSE],
    [('sin', ['−sin (signe)', '−cos', 'cos']),
     ('cos', ['−cos (signe)', '−sin', 'sin'])]))

# --- 6. TSPE-466 : solutions de y′ = ay + b -----------------------------------------------------

V466_FORMULE = qcm(
    'Soit $a$ et $b$ deux réels, $a\\neq 0$. Les solutions sur $\\mathbb{R}$ de l\'équation'
    ' différentielle $y\'=ay+b$ sont les fonctions (où $C$ est un réel quelconque) :',
    '$x\\mapsto Ce^{ax}-\\dfrac{b}{a}$',
    ['$x\\mapsto Ce^{ax}+\\dfrac{b}{a}$', '$x\\mapsto Ce^{ax}-b$',
     '$x\\mapsto Ce^{-ax}-\\dfrac{b}{a}$'],
    ['À connaître : pour $a\\neq 0$, les solutions de $y\'=ay+b$ sont les fonctions $'
     + col('x\\mapsto Ce^{ax}-\\dfrac{b}{a}') + '$, $C\\in\\mathbb{R}$.',
     'Ce sont les solutions de $y\'=ay$, $x\\mapsto Ce^{ax}$, auxquelles on ajoute la solution'
     ' constante $-\\dfrac{b}{a}$ (elle vérifie $0=ay+b$).'])
V466_CONSTANTE = qcm(
    'Soit $a$ et $b$ deux réels, $a\\neq 0$. La solution constante de l\'équation'
    ' différentielle $y\'=ay+b$ est la fonction :',
    '$x\\mapsto-\\dfrac{b}{a}$',
    ['$x\\mapsto\\dfrac{b}{a}$', '$x\\mapsto-\\dfrac{a}{b}$', '$x\\mapsto b$'],
    ['À connaître : une fonction constante a une dérivée nulle ; elle est solution lorsque'
     ' $0=ay+b$.',
     'Donc $y=' + col('-\\dfrac{b}{a}') + '$. Les autres solutions s\'en déduisent :'
     ' $x\\mapsto Ce^{ax}-\\dfrac{b}{a}$.'])
V466_EXEMPLE = qcm(
    'Les solutions sur $\\mathbb{R}$ de l\'équation différentielle $y\'=-y+4$ sont les fonctions'
    ' (où $C$ est un réel quelconque) :',
    '$x\\mapsto Ce^{-x}+4$',
    ['$x\\mapsto Ce^{-x}-4$', '$x\\mapsto Ce^{x}+4$', '$x\\mapsto Ce^{-x}+\\dfrac{1}{4}$'],
    ['À connaître : les solutions de $y\'=ay+b$ ($a\\neq 0$) sont les fonctions'
     ' $x\\mapsto Ce^{ax}-\\dfrac{b}{a}$.',
     'Ici $a=-1$ et $b=4$, donc $-\\dfrac{b}{a}=-\\dfrac{4}{-1}=4$ : les solutions sont $'
     + col('x\\mapsto Ce^{-x}+4') + '$.'])

MODELES.append(modele(
    '06-solutions-y-prime-ay-plus-b', 'Solutions de l\'équation y′ = ay + b',
    'À savoir : pour a ≠ 0, les solutions de y′ = ay + b sont Ce^(ax) − b/a ; solution constante'
    ' −b/a ; exemple y′ = −y + 4 ; distracteurs : signe, oubli de diviser par a, e^(−ax)',
    PRIM, 'Équations différentielles', 1,
    [V466_FORMULE, V466_CONSTANTE, V466_EXEMPLE],
    [('Ce^(ax) − b/a', ['+ b/a (signe)', '− b', 'e^(−ax)']),
     ('−b/a', ['b/a (signe)', '−a/b', 'b']),
     ('Ce⁻ˣ + 4', ['− 4 (signe)', 'eˣ', '1/4'])]))

# --- 7. TSPE-484 : intégration par parties ------------------------------------------------------

INT_AB = '\\displaystyle\\int_a^b'

V484_FORMULE = qcm(
    'Soit $u$ et $v$ deux fonctions dérivables sur $[a\\,;b]$, de dérivées continues. La formule'
    ' d\'intégration par parties s\'écrit :',
    '$' + INT_AB + 'u(x)v\'(x)\\,\\mathrm{d}x=\\big[u(x)v(x)\\big]_a^b-' + INT_AB
    + 'u\'(x)v(x)\\,\\mathrm{d}x$',
    ['$' + INT_AB + 'u(x)v\'(x)\\,\\mathrm{d}x=\\big[u(x)v(x)\\big]_a^b+' + INT_AB
     + 'u\'(x)v(x)\\,\\mathrm{d}x$',
     '$' + INT_AB + 'u(x)v\'(x)\\,\\mathrm{d}x=\\big[u\'(x)v(x)\\big]_a^b-' + INT_AB
     + 'u(x)v(x)\\,\\mathrm{d}x$',
     '$' + INT_AB + 'u(x)v\'(x)\\,\\mathrm{d}x=' + INT_AB + 'u(x)\\,\\mathrm{d}x\\times' + INT_AB
     + 'v\'(x)\\,\\mathrm{d}x$'],
    ['À connaître : pour $u$ et $v$ dérivables sur $[a\\,;b]$, de dérivées continues, $'
     + col(INT_AB + 'u(x)v\'(x)\\,\\mathrm{d}x=\\big[u(x)v(x)\\big]_a^b-' + INT_AB
           + 'u\'(x)v(x)\\,\\mathrm{d}x') + '$.',
     'Elle vient de la dérivée d\'un produit : $(uv)\'=u\'v+uv\'$, donc $uv\'=(uv)\'-u\'v$, que'
     ' l\'on intègre entre $a$ et $b$. L\'intégrale d\'un produit n\'est PAS le produit des'
     ' intégrales.'])
V484_HYPOTHESE = qcm(
    'Pour appliquer la formule d\'intégration par parties sur $[a\\,;b]$ aux fonctions $u$ et $v$,'
    ' il faut que :',
    '$u$ et $v$ soient dérivables sur $[a\\,;b]$, de dérivées continues',
    ['$u$ et $v$ soient continues sur $[a\\,;b]$, sans plus',
     '$u$ et $v$ soient positives sur $[a\\,;b]$',
     '$u$ et $v$ soient strictement monotones sur $[a\\,;b]$'],
    ['À connaître : la formule demande que $' + col('u\\text{ et }v\\text{ soient dérivables,'
     ' de dérivées continues}') + '$ sur $[a\\,;b]$.',
     'Il faut en effet que $u\'v$ et $uv\'$ soient continues pour que leurs intégrales aient un'
     ' sens ; ni le signe ni le sens de variation n\'interviennent.'])
V484_EXEMPLE = qcm(
    'On pose $u(x)=x$ et $v\'(x)=e^x$, avec $v(x)=e^x$. L\'intégration par parties donne :',
    '$\\displaystyle\\int_0^1xe^x\\,\\mathrm{d}x=\\big[xe^x\\big]_0^1-\\int_0^1e^x\\,\\mathrm{d}x$',
    ['$\\displaystyle\\int_0^1xe^x\\,\\mathrm{d}x=\\big[xe^x\\big]_0^1+\\int_0^1e^x\\,\\mathrm{d}x$',
     '$\\displaystyle\\int_0^1xe^x\\,\\mathrm{d}x=\\big[e^x\\big]_0^1-\\int_0^1e^x\\,\\mathrm{d}x$',
     '$\\displaystyle\\int_0^1xe^x\\,\\mathrm{d}x=\\int_0^1x\\,\\mathrm{d}x\\times'
     '\\int_0^1e^x\\,\\mathrm{d}x$'],
    ['À connaître : $\\displaystyle\\int_a^bu(x)v\'(x)\\,\\mathrm{d}x=\\big[u(x)v(x)\\big]_a^b-'
     '\\int_a^bu\'(x)v(x)\\,\\mathrm{d}x$.',
     'Ici $u(x)v(x)=xe^x$ et $u\'(x)v(x)=1\\times e^x=e^x$, d\'où $' + col(
         '\\displaystyle\\int_0^1xe^x\\,\\mathrm{d}x=\\big[xe^x\\big]_0^1-\\int_0^1e^x\\,'
         '\\mathrm{d}x') + '$.'])

MODELES.append(modele(
    '07-integration-par-parties', 'Formule d\'intégration par parties',
    'À savoir : ∫ uv′ = [uv] − ∫ u′v, u et v dérivables de dérivées continues ; formule,'
    ' hypothèses, exemple x eˣ ; distracteurs : signe +, crochet u′v, produit des intégrales',
    'Intégration', 'Calcul intégral', 1,
    [V484_FORMULE, V484_HYPOTHESE, V484_EXEMPLE],
    [('[uv] − ∫ u′v', ['signe +', '[u′v] − ∫ uv', 'produit des intégrales']),
     ('dérivables, dérivées continues', ['continues', 'positives', 'strictement monotones']),
     ('[xeˣ] − ∫ eˣ', ['signe +', 'crochet [eˣ]', 'produit des intégrales'])]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
