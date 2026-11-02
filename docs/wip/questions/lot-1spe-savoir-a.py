"""Écrit les 7 modèles du lot 6a « à savoir » (analyse et probabilités) de la 1re spé
dans scripts/questions/1spe-savoir-a/.

Phase 0 validée par David le 2026-11-02 (« je valide » sur les recos, § 23 du journal
« docs/wip/questions-1spe-progress.md », D29), un point par modèle :

| # | Point    | Titre                              | Catégorie, niveau                                 |
| 1 | 1SPE-264 | Dérivée de la fonction carré       | Dérivation › À savoir, 1                          |
| 2 | 1SPE-391 | Dérivée de la fonction cube        | Dérivation › À savoir, 2                          |
| 3 | 1SPE-392 | Dérivée de la fonction inverse     | Dérivation › À savoir, 3                          |
| 4 | 1SPE-290 | Exponentielle d'une somme          | Fonction exponentielle › À savoir, 1              |
| 5 | 1SPE-404 | Exponentielle de l'opposé          | Fonction exponentielle › À savoir, 2              |
| 6 | 1SPE-336 | Indépendance de deux événements    | Probabilités conditionnelles › À savoir, 1        |
| 7 | 1SPE-350 | Variance et écart type             | Variables aléatoires › À savoir, 1                |

Catégorie « À savoir » neuve dans chaque domaine (relevé prod du 2026-11-02 : aucune catégorie
de ce nom, tous niveaux scolaires confondus). Case choix à 4 propositions (la première est la
bonne, l'affichage les mélange), erreurs typiques en distracteurs, deux sens de lecture.

Voisins à ne pas répéter : a86442c1 (dérivées de x², xᵃ, 1/x en case ouverte), d2bca2d8
(ensemble de dérivabilité), e6b429b4, bd45ed7f (calculs d'exponentielles), ebe7e788 (tester
l'indépendance), 2af6296f (variance depuis la loi), 58c55bba (König-Huygens, point 352).

Bornes : « lycee/1spe.json » ((x²)′ = 2x ; (x³)′ = 3x² ; (1/x)′ = −1/x² sur ]−∞ ; 0[ et
]0 ; +∞[ ; exp(x + y) = exp(x)exp(y) ; exp(x)exp(−x) = 1 ; P(A ∩ B) = P(A)P(B), P_B(A) = P(A) ;
V(X) = E((X − E(X))²), σ(X) = √V(X)).

Piège du lot : pas de `cleanCoefficients` (aucune variable à nettoyer). Avec l'option, `\\sigma(X)`
est lu comme le produit σ·(X) et rendu « σX », parenthèses perdues (V(X), f(x) ne bougent pas).

    python3 docs/wip/questions/lot-1spe-savoir-a.py scripts/questions/1spe-savoir-a
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, answer, status):
    return {'description': desc, 'variationIndex': vi, 'variables': {},
            'answers': [answer], 'expected': {'status': status}}


def modele(nom, title, description, theme, domain, level, variations, specs):
    return nom, {'title': title, 'description': description, 'grades': ['1_SPE'],
                 'theme': theme, 'domain': domain, 'subdomain': 'À savoir', 'level': level,
                 'delay': 30, 'status': 'draft',
                 'shared': {},
                 'variations': variations, 'testSpecs': specs}


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def choix(lignes):
    return '\n\n```choix\n' + ''.join('- ' + l + '\n' for l in lignes) + '```'


def qcm(statement, bonne, autres, steps):
    """Variation sans variable : la première proposition est la bonne (index 0)."""
    return {'statement': statement + choix([bonne] + autres), 'variables': [],
            'blanks': [{'expectedAnswer': '0'}], 'correction': {'steps': steps}}


def specs_qcm(variations, libelles):
    """Une spec juste (0) et une spec fausse par distracteur (1, 2, 3), pour chaque variation."""
    out = []
    for vi, (juste, erreurs) in enumerate(libelles):
        out.append(spec(juste, vi, '0', 'correct'))
        for k, erreur in enumerate(erreurs, start=1):
            out.append(spec('Erreur : ' + erreur, vi, str(k), 'incorrect'))
    assert len(libelles) == len(variations)
    return out


MODELES = []

# --- 1. 1SPE-264 : (x²)′ = 2x -------------------------------------------------------------------

V264_DIRECT = qcm(
    'Soit $f$ la fonction carré, définie sur $\\mathbb{R}$ par $f(x)=x^2$.\n\n'
    'Pour tout réel $x$, $f\'(x)$ est égal à :',
    '$2x$', ['$x$', '$2$', '$\\dfrac{x^2}{2}$'],
    ['À connaître : la fonction carré est dérivable sur $\\mathbb{R}$ et, pour tout réel $x$,'
     ' $(x^2)\'=2x$.',
     'Donc $f\'(x)=' + col('2x') + '$.'])
V264_INVERSE = qcm(
    'Parmi ces fonctions définies sur $\\mathbb{R}$, laquelle a pour dérivée la fonction'
    ' $x\\mapsto 2x$ ?',
    '$x\\mapsto x^2$', ['$x\\mapsto 2x^2$', '$x\\mapsto 2$', '$x\\mapsto \\dfrac{x^2}{2}$'],
    ['À connaître : pour tout réel $x$, $(x^2)\'=2x$.',
     'La fonction qui a pour dérivée $x\\mapsto 2x$ est donc $' + col('x\\mapsto x^2') + '$.',
     'Vérification des autres : $(2x^2)\'=4x$, $(2)\'=0$ et $\\left(\\dfrac{x^2}{2}\\right)\'=x$.'])

MODELES.append(modele(
    '01-derivee-fonction-carre', 'Dérivée de la fonction carré',
    'À savoir : (x²)′ = 2x, reconnue parmi des erreurs typiques, et dans l\'autre sens (quelle'
    ' fonction a pour dérivée 2x)',
    'Fonctions', 'Dérivation', 1,
    [V264_DIRECT, V264_INVERSE],
    specs_qcm([V264_DIRECT, V264_INVERSE],
              [('2x', ['x', '2', 'x²/2']),
               ('x²', ['2x² (dérivée 4x)', 'constante 2', 'x²/2 (dérivée x)'])])))

# --- 2. 1SPE-391 : (x³)′ = 3x² ------------------------------------------------------------------

V391_DIRECT = qcm(
    'Soit $f$ la fonction cube, définie sur $\\mathbb{R}$ par $f(x)=x^3$.\n\n'
    'Pour tout réel $x$, $f\'(x)$ est égal à :',
    '$3x^2$', ['$3x$', '$x^2$', '$\\dfrac{x^4}{4}$'],
    ['À connaître : la fonction cube est dérivable sur $\\mathbb{R}$ et, pour tout réel $x$,'
     ' $(x^3)\'=3x^2$.',
     'Donc $f\'(x)=' + col('3x^2') + '$.'])
V391_INVERSE = qcm(
    'Parmi ces fonctions définies sur $\\mathbb{R}$, laquelle a pour dérivée la fonction'
    ' $x\\mapsto 3x^2$ ?',
    '$x\\mapsto x^3$', ['$x\\mapsto 3x^3$', '$x\\mapsto 6x$', '$x\\mapsto \\dfrac{x^3}{3}$'],
    ['À connaître : pour tout réel $x$, $(x^3)\'=3x^2$.',
     'La fonction qui a pour dérivée $x\\mapsto 3x^2$ est donc $' + col('x\\mapsto x^3') + '$.',
     'Attention au sens : $6x$ est la dérivée de $3x^2$, pas une fonction dont $3x^2$ est la'
     ' dérivée.'])

MODELES.append(modele(
    '02-derivee-fonction-cube', 'Dérivée de la fonction cube',
    'À savoir : (x³)′ = 3x², reconnue parmi des erreurs typiques, et dans l\'autre sens (quelle'
    ' fonction a pour dérivée 3x²)',
    'Fonctions', 'Dérivation', 2,
    [V391_DIRECT, V391_INVERSE],
    specs_qcm([V391_DIRECT, V391_INVERSE],
              [('3x²', ['3x', 'x²', 'x⁴/4']),
               ('x³', ['3x³ (dérivée 9x²)', '6x (sens inversé)', 'x³/3 (dérivée x²)'])])))

# --- 3. 1SPE-392 : (1/x)′ = −1/x² ---------------------------------------------------------------

V392_DIRECT = qcm(
    'Soit $f$ la fonction inverse, définie et dérivable sur $]-\\infty\\,;0[$ et sur'
    ' $]0\\,;+\\infty[$ par $f(x)=\\dfrac{1}{x}$.\n\n'
    'Pour tout réel $x$ non nul, $f\'(x)$ est égal à :',
    '$-\\dfrac{1}{x^2}$', ['$\\dfrac{1}{x^2}$', '$-\\dfrac{1}{x}$', '$0$'],
    ['À connaître : la fonction inverse est dérivable sur $]-\\infty\\,;0[$ et sur'
     ' $]0\\,;+\\infty[$ et, pour tout réel $x$ non nul, $\\left(\\dfrac{1}{x}\\right)\'='
     '-\\dfrac{1}{x^2}$.',
     'Donc $f\'(x)=' + col('-\\dfrac{1}{x^2}') + '$ : le signe moins ne s\'oublie pas (la fonction'
     ' inverse est décroissante sur chacun de ces intervalles).'])
V392_INVERSE = qcm(
    'Parmi ces fonctions définies sur $]0\\,;+\\infty[$, laquelle a pour dérivée la fonction'
    ' $x\\mapsto -\\dfrac{1}{x^2}$ ?',
    '$x\\mapsto \\dfrac{1}{x}$',
    ['$x\\mapsto -\\dfrac{1}{x}$', '$x\\mapsto \\dfrac{1}{x^2}$', '$x\\mapsto x^2$'],
    ['À connaître : pour tout réel $x$ non nul, $\\left(\\dfrac{1}{x}\\right)\'=-\\dfrac{1}{x^2}$.',
     'La fonction qui a pour dérivée $x\\mapsto -\\dfrac{1}{x^2}$ est donc $'
     + col('x\\mapsto \\dfrac{1}{x}') + '$.',
     'Vérification : $\\left(-\\dfrac{1}{x}\\right)\'=\\dfrac{1}{x^2}$, le signe est contraire.'])

MODELES.append(modele(
    '03-derivee-fonction-inverse', 'Dérivée de la fonction inverse',
    'À savoir : (1/x)′ = −1/x² sur ]−∞ ; 0[ et ]0 ; +∞[, reconnue parmi des erreurs typiques'
    ' (signe oublié, −1/x, 0), et dans l\'autre sens',
    'Fonctions', 'Dérivation', 3,
    [V392_DIRECT, V392_INVERSE],
    specs_qcm([V392_DIRECT, V392_INVERSE],
              [('−1/x²', ['signe oublié', '−1/x', '0 (numérateur dérivé)']),
               ('1/x', ['−1/x (signe contraire)', '1/x²', 'x²'])])))

# --- 4. 1SPE-290 : exp(x + y) = exp(x)exp(y) ----------------------------------------------------

V290_DIRECT = qcm(
    'Pour tous réels $x$ et $y$, $\\exp(x+y)$ est égal à :',
    '$\\exp(x)\\times\\exp(y)$',
    ['$\\exp(x)+\\exp(y)$', '$\\exp(x\\times y)$', '$x\\times\\exp(y)$'],
    ['À connaître : l\'exponentielle transforme une somme en produit.',
     'Pour tous réels $x$ et $y$, $\\exp(x+y)=' + col('\\exp(x)\\times\\exp(y)') + '$.'])
V290_INVERSE = qcm(
    'Pour tous réels $x$ et $y$, $\\exp(x)\\times\\exp(y)$ est égal à :',
    '$\\exp(x+y)$', ['$\\exp(x\\times y)$', '$\\exp(x)+\\exp(y)$', '$2\\exp(x+y)$'],
    ['À connaître : pour tous réels $x$ et $y$, $\\exp(x+y)=\\exp(x)\\times\\exp(y)$.',
     'Lue de droite à gauche : $\\exp(x)\\times\\exp(y)=' + col('\\exp(x+y)') + '$ (les'
     ' exposants s\'ajoutent, ils ne se multiplient pas).'])

MODELES.append(modele(
    '04-exponentielle-d-une-somme', 'Exponentielle d\'une somme',
    'À savoir : exp(x + y) = exp(x)exp(y), dans les deux sens, parmi des erreurs typiques'
    ' (somme des exponentielles, exp(xy))',
    'Fonctions', 'Fonction exponentielle', 1,
    [V290_DIRECT, V290_INVERSE],
    specs_qcm([V290_DIRECT, V290_INVERSE],
              [('produit', ['somme', 'exp(xy)', 'x·exp(y)']),
               ('exp(x + y)', ['exp(xy)', 'somme', '2exp(x + y)'])])))

# --- 5. 1SPE-404 : exp(x)exp(−x) = 1 ------------------------------------------------------------

V404_PRODUIT = qcm(
    'Pour tout réel $x$, $\\exp(x)\\times\\exp(-x)$ est égal à :',
    '$1$', ['$0$', '$-1$', '$\\exp(-x^2)$'],
    ['À connaître : pour tout réel $x$, $\\exp(x)\\times\\exp(-x)=\\exp(x-x)=\\exp(0)$.',
     'Or $\\exp(0)=1$, donc $\\exp(x)\\times\\exp(-x)=' + col('1') + '$.'])
V404_OPPOSE = qcm(
    'Pour tout réel $x$, $\\exp(-x)$ est égal à :',
    '$\\dfrac{1}{\\exp(x)}$', ['$-\\exp(x)$', '$\\exp\\left(\\dfrac{1}{x}\\right)$',
                              '$1-\\exp(x)$'],
    ['À connaître : pour tout réel $x$, $\\exp(x)\\times\\exp(-x)=1$, et $\\exp(x)\\neq 0$.',
     'Donc $\\exp(-x)=' + col('\\dfrac{1}{\\exp(x)}') + '$ : c\'est un nombre strictement positif,'
     ' jamais $-\\exp(x)$.'])

MODELES.append(modele(
    '05-exponentielle-de-l-oppose', 'Exponentielle de l\'opposé',
    'À savoir : exp(x)exp(−x) = 1, donc exp(−x) = 1/exp(x), parmi des erreurs typiques'
    ' (−exp(x), exp(1/x), 1 − exp(x))',
    'Fonctions', 'Fonction exponentielle', 2,
    [V404_PRODUIT, V404_OPPOSE],
    specs_qcm([V404_PRODUIT, V404_OPPOSE],
              [('1', ['0', '−1', 'exp(−x²)']),
               ('1/exp(x)', ['−exp(x)', 'exp(1/x)', '1 − exp(x)'])])))

# --- 6. 1SPE-336 : indépendance -----------------------------------------------------------------

V336_DEFINITION = qcm(
    'Soit $A$ et $B$ deux événements. Les événements $A$ et $B$ sont **indépendants** lorsque :',
    '$P(A\\cap B)=P(A)\\times P(B)$',
    ['$P(A\\cap B)=0$', '$P(A\\cup B)=P(A)+P(B)$', '$P_A(B)=P(A)\\times P(B)$'],
    ['À connaître : $A$ et $B$ sont indépendants lorsque $' + col('P(A\\cap B)=P(A)\\times P(B)')
     + '$.',
     'Ne pas confondre avec des événements **incompatibles**, pour lesquels $P(A\\cap B)=0$ :'
     ' ils ne peuvent pas se produire en même temps.'])
V336_CONDITIONNELLE = qcm(
    'Soit $A$ et $B$ deux événements **indépendants**, avec $P(B)\\neq 0$.\n\n'
    'La probabilité conditionnelle $P_B(A)$ est égale à :',
    '$P(A)$', ['$P(B)$', '$P(A)\\times P(B)$', '$0$'],
    ['À connaître : si $P(B)\\neq 0$, $A$ et $B$ sont indépendants lorsque $P_B(A)=P(A)$.',
     'Savoir que $B$ est réalisé ne change pas la probabilité de $A$ : $P_B(A)=' + col('P(A)')
     + '$.'])

MODELES.append(modele(
    '06-independance-deux-evenements', 'Indépendance de deux événements',
    'À savoir : A et B indépendants ⟺ P(A ∩ B) = P(A)P(B), soit P_B(A) = P(A) si P(B) ≠ 0 ;'
    ' distracteur principal : incompatibles (P(A ∩ B) = 0)',
    'Probabilités', 'Probabilités conditionnelles', 1,
    [V336_DEFINITION, V336_CONDITIONNELLE],
    specs_qcm([V336_DEFINITION, V336_CONDITIONNELLE],
              [('produit', ['incompatibles', 'réunion', 'P_A(B) = produit']),
               ('P(A)', ['P(B)', 'P(A)P(B)', '0'])])))

# --- 7. 1SPE-350 : variance, écart type ---------------------------------------------------------

V350_VARIANCE = qcm(
    'Soit $X$ une variable aléatoire d\'espérance $E(X)$. La variance $V(X)$ est égale à :',
    '$E\\left(\\left(X-E(X)\\right)^2\\right)$',
    ['${E(X)}^2$', '$E\\left(X-E(X)\\right)$', '$E\\left(X^2\\right)$'],
    ['À connaître : la variance est la moyenne des carrés des écarts à l\'espérance,'
     ' $V(X)=' + col('E\\left(\\left(X-E(X)\\right)^2\\right)') + '$.',
     'Sans le carré, les écarts se compensent : $E\\left(X-E(X)\\right)=0$ pour toute variable'
     ' aléatoire.'])
V350_ECART_TYPE = qcm(
    'Soit $X$ une variable aléatoire de variance $V(X)$. L\'écart type $\\sigma(X)$ est égal à :',
    '$\\sqrt{V(X)}$', ['${V(X)}^2$', '$\\dfrac{V(X)}{2}$', '$\\sqrt{E(X)}$'],
    ['À connaître : l\'écart type est la racine carrée de la variance, $\\sigma(X)='
     + col('\\sqrt{V(X)}') + '$.',
     'Il s\'exprime dans la même unité que $X$, alors que la variance s\'exprime dans le carré'
     ' de cette unité.'])

MODELES.append(modele(
    '07-variance-ecart-type', 'Variance et écart type',
    'À savoir : V(X) = E((X − E(X))²) et σ(X) = √V(X), parmi des erreurs typiques (E(X)²,'
    ' E(X − E(X)), V(X)²) ; König-Huygens reste au point 352',
    'Probabilités', 'Variables aléatoires', 1,
    [V350_VARIANCE, V350_ECART_TYPE],
    specs_qcm([V350_VARIANCE, V350_ECART_TYPE],
              [('définition', ['E(X)²', 'sans le carré', 'E(X²)']),
               ('√V', ['V²', 'V/2', '√E(X)'])])))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
