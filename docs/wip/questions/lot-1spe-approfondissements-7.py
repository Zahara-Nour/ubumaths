"""Écrit les 3 modèles du lot 7 « approfondissements : exponentielle » de la 1re spé
dans scripts/questions/1spe-approfondissements-7/.

Phase 0 validée par David le 2026-11-04 (D3 du journal
« docs/wip/questions-1spe-demonstrations-progress.md », § 9), un point par modèle :

| # | Point    | Titre                                                 | Niveau | Point en prod (relevé 2026-11-05)            |
| 1 | 1SPE-300 | Démontrer l'unicité de l'exponentielle                | 1      | notion Fonction exponentielle                |
| 2 | 1SPE-301 | Démontrer que exp(x + y) = exp(x) exp(y)              | 2      | Fonction exponentielle › propriétés algébriques |
| 3 | 1SPE-302 | Démontrer que exp est strictement positive et croissante | 3   | Fonction exponentielle › variations          |

Niveaux dans l'ordre des démonstrations : 301 s'appuie sur l'unicité (300), 302 sur 301.

Forme (D3, Q2) : preuves comme les démonstrations (lots 1 à 4) : la preuve est écrite, l'élève
complète l'étape clé (case) ou choisit la justification (case choix à 4 propositions, la première
est la bonne, l'affichage les mélange) ; dernière variation « étapes à ranger » (positions des
specs calculées par le générateur, graine 0).

Chaîne suivie (celle des manuels) :
  lemme      exp(x)·exp(−x) = 1 (dérivée nulle, valeur en 0), donc exp ne s'annule pas ;
  300        g′ = g, g(0) = 1 ⇒ (g/exp)′ = 0 et g/exp = 1 en 0 ⇒ g = exp ;
  301        y fixé, h(x) = exp(x + y)/exp(y) vérifie h′ = h, h(0) = 1 ⇒ h = exp (unicité) ;
  302        exp(x) = exp(x/2)² (301) et exp(x/2) ≠ 0 (lemme) ⇒ exp(x) > 0 ; exp′ = exp > 0.
Les distracteurs n'invoquent pas un résultat démontré PLUS LOIN dans la chaîne comme s'il était
faux : ils sont faux, ou ils ne justifient pas l'étape.

Bornes (« lycee/1spe.json ») : ce qui est démontré est l'unicité, exp(x + y) = exp(x) exp(y),
exp > 0 et croissante ; pas plus. L'existence de exp reste admise (BO, définition).

Voisins à ne pas répéter : « Exponentielle d'une somme » (290), « Signe de l'exponentielle »
(292), « Valeur de e⁰ » (289) : ils APPLIQUENT le résultat, ceux-ci le DÉMONTRENT.

Aucune réponse attendue n'écrit une fonction appliquée (le juge lirait un produit, cf. lot 2 des
démonstrations) : réponses 0, 1, x/2 ou case choix.

Approfondissements « en aucun cas obligatoires » (BO 1re spé p.3).

    python3 docs/wip/questions/lot-1spe-approfondissements-7.py scripts/questions/1spe-approfondissements-7
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
                 'level': level, 'delay': 90, 'status': 'draft',
                 'shared': {},
                 'variations': variations, 'testSpecs': specs}


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def choix(lignes):
    return '\n\n```choix\n' + ''.join('- ' + l + '\n' for l in lignes) + '```'


def case(statement, attendu, steps):
    """Variation à une case ouverte (`?` dans une formule de l'énoncé)."""
    return {'statement': statement, 'variables': [],
            'blanks': [attendu if isinstance(attendu, dict) else {'expectedAnswer': attendu}],
            'correction': {'steps': steps}}


def justification(statement, bonne, autres, steps):
    """Variation à une case choix : la première proposition est la bonne (index 0)."""
    return {'statement': statement + choix([bonne] + autres), 'variables': [],
            'blanks': [{'expectedAnswer': '0'}], 'correction': {'steps': steps}}


def ranger(intro, etapes, steps):
    """Variation « étapes à ranger » (lot 4) : étapes données dans le bon ordre."""
    return {'statement': intro + '\n\nRemets les étapes de la démonstration dans l\'ordre.\n\n'
            '```ranger\nsigne: aucun\n' + ''.join('- ' + e + '\n' for e in etapes) + '```',
            'variables': [], 'correction': {'steps': steps}}


def specs_choix(vi, juste, erreurs):
    out = [spec(juste, vi, '0', 'correct')]
    for k, erreur in enumerate(erreurs, start=1):
        out.append(spec('Erreur : ' + erreur, vi, str(k), 'incorrect'))
    return out


MODELES = []

DEF_EXP = ('On rappelle que la fonction exponentielle est dérivable sur $\\mathbb{R}$, avec'
           ' $\\exp\'=\\exp$ et $\\exp(0)=1$.')

# --- 1. 1SPE-300 : unicité de f dérivable avec f′ = f et f(0) = 1 ------------------------------

V300_LEMME = case(
    DEF_EXP + ' Pour tout réel $x$, on pose $\\varphi(x)=\\exp(x)\\exp(-x)$.\n\n'
    '$\\varphi$ est dérivable et $\\varphi\'(x)=\\exp(x)\\exp(-x)+\\exp(x)\\times\\left(-\\exp(-x)'
    '\\right)=0$ : $\\varphi$ est constante sur $\\mathbb{R}$. Complète.\n\n'
    'Pour tout réel $x$, $\\exp(x)\\exp(-x)=?$',
    '1',
    ['$\\varphi$ est constante : elle garde partout sa valeur en $0$.',
     '$\\varphi(0)=\\exp(0)\\exp(0)=1\\times 1=1$.',
     'Donc, pour tout réel $x$, $\\exp(x)\\exp(-x)=' + col('1') + '$ : en particulier,'
     ' $\\exp(x)\\neq 0$.'])
INTRO_300 = (DEF_EXP + ' Soit $g$ une fonction dérivable sur $\\mathbb{R}$ telle que $g\'=g$ et'
             ' $g(0)=1$. On veut démontrer que $g=\\exp$. Pour tout réel $x$, on pose'
             ' $h(x)=\\dfrac{g(x)}{\\exp(x)}$.\n\n')
V300_DIVISION = justification(
    INTRO_300 + 'Pourquoi $h$ est-elle définie sur $\\mathbb{R}$ ?',
    'Car $\\exp(x)\\exp(-x)=1$ pour tout réel $x$ : $\\exp$ ne s\'annule pas.',
    ['Car $\\exp(0)=1$.',
     'Car $g(0)=1$.',
     'Car $g\'=g$.'],
    ['$h(x)$ a un sens dès que son dénominateur $\\exp(x)$ n\'est pas nul.',
     'Or $\\exp(x)\\exp(-x)=1$ : un produit qui vaut $1$ n\'a aucun facteur nul, donc'
     ' $\\exp(x)\\neq 0$ pour tout réel $x$.',
     '$\\exp(0)=1$ ne dit rien de $\\exp(x)$ quand $x\\neq 0$.'])
V300_DERIVEE = case(
    INTRO_300 + '$h$ est dérivable et, pour tout réel $x$,'
    ' $h\'(x)=\\dfrac{g\'(x)\\exp(x)-g(x)\\exp(x)}{\\exp(x)^2}$. Comme $g\'=g$, complète.\n\n'
    '$h\'(x)=?$',
    '0',
    ['Dérivée d\'un quotient, avec $\\exp\'=\\exp$ : $h\'(x)=\\dfrac{g\'(x)\\exp(x)-g(x)'
     '\\exp(x)}{\\exp(x)^2}$.',
     'Comme $g\'(x)=g(x)$, le numérateur vaut $g(x)\\exp(x)-g(x)\\exp(x)=0$ : $h\'(x)='
     + col('0') + '$.',
     'Donc $h$ est constante, égale à $h(0)=\\dfrac{g(0)}{\\exp(0)}=1$ : $g(x)=\\exp(x)$ pour'
     ' tout réel $x$.'])
V300_PREUVE = ranger(
    DEF_EXP + ' Soit $g$ une fonction dérivable sur $\\mathbb{R}$ telle que $g\'=g$ et $g(0)=1$.'
    ' On démontre que $g=\\exp$, sachant que $\\exp$ ne s\'annule pas.',
    ['On pose $h(x)=\\dfrac{g(x)}{\\exp(x)}$, définie car $\\exp(x)\\neq 0$.',
     '$h\'(x)=\\dfrac{g\'(x)\\exp(x)-g(x)\\exp(x)}{\\exp(x)^2}=0$, car $g\'=g$.',
     '$h$ est donc constante, égale à $h(0)=\\dfrac{g(0)}{\\exp(0)}=1$.',
     'Donc $g(x)=\\exp(x)$ pour tout réel $x$ : $g=\\exp$.'],
    ['On divise par $\\exp$, qui ne s\'annule pas, puis on dérive le quotient.',
     'Une dérivée nulle sur $\\mathbb{R}$ donne une fonction constante : sa valeur en $0$ conclut,'
     ' $' + col('g=\\exp') + '$.'])

MODELES.append(modele(
    '01-unicite-de-l-exponentielle', 'Démontrer l\'unicité de l\'exponentielle',
    'Unicité d\'une fonction g dérivable sur ℝ avec g′ = g et g(0) = 1 : exp(x)exp(−x) = 1,'
    ' quotient g/exp défini (case choix), de dérivée nulle, démonstration (étapes à ranger)',
    1,
    [V300_LEMME, V300_DIVISION, V300_DERIVEE, V300_PREUVE],
    [spec('1', 0, '1', 'correct'),
     spec('Erreur : 0 (la dérivée)', 0, '0', 'incorrect'),
     spec('Erreur : −1', 0, '-1', 'incorrect')]
    + specs_choix(1, 'exp ne s\'annule pas', ['exp(0) = 1', 'g(0) = 1', 'g′ = g'])
    + [spec('0', 2, '0', 'correct'),
       spec('Erreur : 1 (la valeur de h)', 2, '1', 'incorrect')]
    + ['RANGER:3']))

# --- 2. 1SPE-301 : exp(x + y) = exp(x) exp(y) ---------------------------------------------------

INTRO_301 = (DEF_EXP + ' On admet aussi que $\\exp$ ne s\'annule pas, et que c\'est la seule'
             ' fonction $f$ dérivable sur $\\mathbb{R}$ telle que $f\'=f$ et $f(0)=1$.\n\n'
             'Soit $y$ un réel fixé. Pour tout réel $x$, on pose'
             ' $h(x)=\\dfrac{\\exp(x+y)}{\\exp(y)}$.\n\n')
V301_DEFINIE = justification(
    INTRO_301 + 'Pourquoi $h$ est-elle définie sur $\\mathbb{R}$ ?',
    'Car $\\exp(y)\\neq 0$.',
    ['Car $\\exp(0)=1$.',
     'Car $x+y\\neq 0$.',
     'Car $h(0)=1$.'],
    ['Le dénominateur $\\exp(y)$ ne dépend pas de $x$ : c\'est un nombre.',
     '$\\exp$ ne s\'annule pas, donc $\\exp(y)\\neq 0$ et $h(x)$ a un sens pour tout réel'
     ' $x$.',
     '$x+y$ peut être nul ; ce n\'est pas un problème, puisque $\\exp(0)=1$.'])
V301_VALEUR = case(
    INTRO_301 + 'Complète.\n\n$h(0)=?$',
    '1',
    ['$h(0)=\\dfrac{\\exp(0+y)}{\\exp(y)}=\\dfrac{\\exp(y)}{\\exp(y)}$.',
     'Donc $h(0)=' + col('1') + '$ : $h$ a la même valeur en $0$ que $\\exp$.'])
V301_DERIVEE = justification(
    INTRO_301 + 'Que vaut $h\'(x)$, pour tout réel $x$ ?',
    '$h\'(x)=\\dfrac{\\exp(x+y)}{\\exp(y)}=h(x)$',
    ['$h\'(x)=0$, car $\\exp(y)$ est une constante.',
     '$h\'(x)=\\dfrac{(x+y)\\exp(x+y)}{\\exp(y)}$',
     '$h\'(x)=\\dfrac{\\exp(x+y)}{\\exp(y)^2}$'],
    ['$\\dfrac{1}{\\exp(y)}$ est un nombre : on dérive seulement $x\\mapsto\\exp(x+y)$.',
     'La dérivée de $x\\mapsto\\exp(x+y)$ est $x\\mapsto 1\\times\\exp(x+y)$ (dérivée de'
     ' $x\\mapsto f(ax+b)$ avec $a=1$).',
     'Donc $' + col('h\'(x)=\\dfrac{\\exp(x+y)}{\\exp(y)}=h(x)') + '$ : $h\'=h$.'])
V301_PREUVE = ranger(
    DEF_EXP + ' On admet que $\\exp$ ne s\'annule pas et qu\'elle est la seule fonction $f$'
    ' dérivable sur $\\mathbb{R}$ telle que $f\'=f$ et $f(0)=1$. On démontre que, pour tous réels'
    ' $x$ et $y$, $\\exp(x+y)=\\exp(x)\\exp(y)$.',
    ['Soit $y$ un réel fixé ; on pose $h(x)=\\dfrac{\\exp(x+y)}{\\exp(y)}$, définie car'
     ' $\\exp(y)\\neq 0$.',
     '$h\'(x)=\\dfrac{\\exp(x+y)}{\\exp(y)}=h(x)$ et $h(0)=\\dfrac{\\exp(y)}{\\exp(y)}=1$.',
     'Par unicité, $h=\\exp$ : $\\dfrac{\\exp(x+y)}{\\exp(y)}=\\exp(x)$.',
     'Donc $\\exp(x+y)=\\exp(x)\\exp(y)$.'],
    ['$h$ vérifie $h\'=h$ et $h(0)=1$, comme $\\exp$ : par unicité, $h=\\exp$.',
     'On multiplie par $\\exp(y)$ : $' + col('\\exp(x+y)=\\exp(x)\\exp(y)') + '$.'])

MODELES.append(modele(
    '02-exponentielle-d-une-somme', 'Démontrer que exp(x + y) = exp(x) exp(y)',
    'y fixé, h(x) = exp(x + y)/exp(y) : définie (case choix), h(0), h′ = h (case choix),'
    ' conclusion par l\'unicité, démonstration (étapes à ranger)',
    2,
    [V301_DEFINIE, V301_VALEUR, V301_DERIVEE, V301_PREUVE],
    specs_choix(0, 'exp(y) ≠ 0', ['exp(0) = 1', 'x + y ≠ 0', 'h(0) = 1'])
    + [spec('1', 1, '1', 'correct'),
       spec('Erreur : 0', 1, '0', 'incorrect')]
    + specs_choix(2, 'h′ = h', ['dérivée nulle', 'facteur x + y', 'exp(y)²'])
    + ['RANGER:3']))

# --- 3. 1SPE-302 : exp strictement positive et croissante ---------------------------------------

INTRO_302 = (DEF_EXP + ' On a démontré que, pour tous réels $a$ et $b$,'
             ' $\\exp(a+b)=\\exp(a)\\exp(b)$, et que $\\exp(t)\\exp(-t)=1$ pour tout réel $t$.'
             '\n\n')
V302_MOITIE = case(
    INTRO_302 + 'Soit $x$ un réel. En écrivant $x$ comme la somme de deux réels égaux, complète.'
    '\n\n$\\exp(x)=\\left(\\exp(?)\\right)^2$',
    '\\frac{x}{2}',
    ['$x=\\dfrac{x}{2}+\\dfrac{x}{2}$, donc $\\exp(x)=\\exp\\left(\\dfrac{x}{2}\\right)'
     '\\exp\\left(\\dfrac{x}{2}\\right)$.',
     'Donc $\\exp(x)=\\left(\\exp\\left(' + col('\\dfrac{x}{2}') + '\\right)\\right)^2$ : un'
     ' carré, donc $\\exp(x)\\geqslant 0$.'])
V302_STRICT = justification(
    INTRO_302 + 'Soit $x$ un réel. On sait que $\\exp(x)=\\left(\\exp\\left(\\dfrac{x}{2}'
    '\\right)\\right)^2$. Pourquoi $\\exp(x)>0$, et pas seulement $\\exp(x)\\geqslant 0$ ?',
    'Car $\\exp\\left(\\dfrac{x}{2}\\right)\\neq 0$, puisque'
    ' $\\exp\\left(\\dfrac{x}{2}\\right)\\exp\\left(-\\dfrac{x}{2}\\right)=1$.',
    ['Car un carré est toujours strictement positif.',
     'Car $\\exp(0)=1>0$.',
     'Car $\\exp\'=\\exp$.'],
    ['Un carré est positif ou nul ; il est nul seulement si le nombre élevé au carré est nul.',
     'Or $\\exp\\left(\\dfrac{x}{2}\\right)\\exp\\left(-\\dfrac{x}{2}\\right)=1$, donc'
     ' $\\exp\\left(\\dfrac{x}{2}\\right)\\neq 0$.',
     'Donc $' + col('\\exp(x)>0') + '$ pour tout réel $x$ ; $\\exp(0)=1$ ne parle que de $x=0$.'])
V302_CROISSANTE = justification(
    INTRO_302 + 'On sait que $\\exp(x)>0$ pour tout réel $x$. Pourquoi $\\exp$ est-elle'
    ' strictement croissante sur $\\mathbb{R}$ ?',
    'Car $\\exp\'(x)=\\exp(x)>0$ pour tout réel $x$.',
    ['Car $\\exp(1)>\\exp(0)$.',
     'Car $\\exp(0)=1>0$.',
     'Car $\\exp(x+y)=\\exp(x)\\exp(y)$.'],
    ['Une fonction dont la dérivée est strictement positive sur $\\mathbb{R}$ y est strictement'
     ' croissante.',
     'Ici $\\exp\'=\\exp$, et $\\exp(x)>0$ pour tout réel $x$ : $' + col('\\exp\'(x)>0') + '$.',
     'Comparer deux valeurs, comme $\\exp(0)$ et $\\exp(1)$, ne suffit pas.'])
V302_PREUVE = ranger(
    INTRO_302 + 'On démontre que $\\exp$ est strictement positive et strictement croissante sur'
    ' $\\mathbb{R}$.',
    ['Soit $x$ un réel : $\\exp(x)=\\exp\\left(\\dfrac{x}{2}+\\dfrac{x}{2}\\right)'
     '=\\left(\\exp\\left(\\dfrac{x}{2}\\right)\\right)^2\\geqslant 0$.',
     'Or $\\exp\\left(\\dfrac{x}{2}\\right)\\neq 0$, donc $\\exp(x)>0$.',
     'Pour tout réel $x$, $\\exp\'(x)=\\exp(x)>0$.',
     'Donc $\\exp$ est strictement croissante sur $\\mathbb{R}$.'],
    ['Le signe vient d\'abord : $\\exp(x)$ est un carré non nul.',
     'Le sens de variation ensuite : la dérivée $\\exp\'=\\exp$ est strictement positive, donc'
     ' $' + col('\\exp') + '$ est strictement croissante.'])

MODELES.append(modele(
    '03-exponentielle-positive-et-croissante',
    'Démontrer que exp est strictement positive et croissante',
    'exp(x) = (exp(x/2))² (case), exp(x/2) ≠ 0 donc exp(x) > 0 (case choix), exp′ = exp > 0'
    ' donc exp strictement croissante (case choix), démonstration (étapes à ranger)',
    3,
    [V302_MOITIE, V302_STRICT, V302_CROISSANTE, V302_PREUVE],
    [spec('x/2', 0, '\\frac{x}{2}', 'correct'),
     spec('½x', 0, '\\frac{1}{2}x', 'correct'),
     spec('0,5x : forme refusée', 0, '0.5x', 'bad_form'),
     spec('Erreur : x', 0, 'x', 'incorrect'),
     spec('Erreur : 2x', 0, '2x', 'incorrect'),
     spec('Erreur : √x', 0, '\\sqrt{x}', 'incorrect')]
    + specs_choix(1, 'exp(x/2) ≠ 0', ['carré strictement positif', 'exp(0) = 1', 'exp′ = exp'])
    + specs_choix(2, 'exp′ = exp > 0', ['deux valeurs', 'exp(0) = 1', 'propriété de la somme'])
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
