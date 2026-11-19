"""Écrit les 4 modèles du lot 3 « démonstrations : trigonométrie, produit scalaire » de la 1re spé
dans scripts/questions/1spe-demonstrations-3/.

Phase 0 validée par David le 2026-11-03 (« je te suis » sur les recos, D1 du journal
« docs/archive/wip/questions-1spe-demonstrations-progress.md », § 3), un point par modèle. Contenu du lot
validé par David le 2026-11-03 (« oui » aux recos du lot 3) :

| # | Point    | Titre                                    | Catégorie, niveau                                         |
| 1 | 1SPE-308 | Démontrer les valeurs de cos et sin de π/4 | Fonctions › Fonctions trigonométriques › Démonstrations, 1 |
| 2 | 1SPE-411 | Démontrer les valeurs de cos et sin de π/3 | Fonctions › Fonctions trigonométriques › Démonstrations, 2 |
| 3 | 1SPE-322 | Démontrer la formule d'Al-Kashi          | Géométrie › Produit scalaire › Démonstrations, 1          |
| 4 | 1SPE-323 | Démontrer l'ensemble des M tels que MA·MB = 0 | Géométrie › Produit scalaire › Démonstrations, 2     |

300, 301 et 302 (exponentielle) ne sont PAS au lot : au BO, ils sont dans « Approfondissements
possibles », pas dans « Démonstrations » (transcription 1_SPE.md, l. 405-409). Hors chantier
(D1 Q1), tranché par David le 2026-11-03.

Forme (D1, Q2 a) : la démonstration est écrite, l'élève complète l'étape clé (case) ou choisit la
justification (case choix à 4 propositions, la première est la bonne, l'affichage les mélange).
Une variation par étape clé (Q3) ; valeurs tirées pour 322 (AB, AC) et 323 (AB = 2d).

Catégories « Démonstrations » neuves sous Fonctions trigonométriques et Produit scalaire (relevé
prod du 2026-11-03 : seules existent celles des lots 1 et 2). Nœuds des points (relevé du
2026-11-03) : Fonctions › Fonctions trigonométriques › cosinus et sinus d'un réel (308, 411),
Géométrie › Produit scalaire › angles et longueurs (322), lieux de points (323). Aucun jumeau.

Voisins à ne pas répéter : « Cosinus et sinus des angles remarquables », « Al-Kashi : calculer
une longueur », « Cercle de diamètre [AB] » : ils APPLIQUENT le résultat, ceux-ci le DÉMONTRENT.

Bornes : « lycee/1spe.json » (ce qui est démontré : cos(π/4) = sin(π/4) = √2/2 ; cos(π/3) = 1/2,
sin(π/3) = √3/2 ; Al-Kashi par le produit scalaire ; MA·MB = 0 ⇔ M sur le cercle de diamètre
[AB] ; pas plus). Aucune réponse attendue n'écrit un vecteur : ces étapes passent en case choix.

    python3 docs/wip/questions/lot-1spe-demonstrations-3.py scripts/questions/1spe-demonstrations-3
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, answer, status, variables=None):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in (variables or {}).items()},
            'answers': [answer],
            'expected': ({'status': status, 'constraintViolations': ['form']}
                         if status == 'bad_form' else {'status': status})}


def modele(nom, title, description, theme, domain, level, variations, specs):
    return nom, {'title': title, 'description': description, 'grades': ['1_SPE'],
                 'theme': theme, 'domain': domain, 'subdomain': 'Démonstrations',
                 'level': level, 'delay': 90, 'status': 'draft',
                 'shared': {},
                 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def ev(x):
    return '{{eval:' + x + '}}'


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def vec(x):
    return '\\overrightarrow{' + x + '}'


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


def specs_choix(vi, juste, erreurs, variables=None):
    out = [spec(juste, vi, '0', 'correct', variables)]
    for k, erreur in enumerate(erreurs, start=1):
        out.append(spec('Erreur : ' + erreur, vi, str(k), 'incorrect', variables))
    return out


MODELES = []
COS4 = '\\cos\\left(\\dfrac{\\pi}{4}\\right)'
SIN4 = '\\sin\\left(\\dfrac{\\pi}{4}\\right)'
COS3 = '\\cos\\left(\\dfrac{\\pi}{3}\\right)'
SIN3 = '\\sin\\left(\\dfrac{\\pi}{3}\\right)'

# --- 1. 1SPE-308 : cos(π/4) = sin(π/4) = √2/2 ---------------------------------------------------

INTRO_308 = ('Dans un repère orthonormé d\'origine $O$, soit $M$ le point du cercle trigonométrique'
             ' associé au réel $\\dfrac{\\pi}{4}$, et $H$ son projeté orthogonal sur l\'axe des'
             ' abscisses. Ainsi $OH=' + COS4 + '$, $HM=' + SIN4 + '$, et l\'angle'
             ' $\\widehat{HOM}$ mesure $45^\\circ$.\n\n')

V308_EGALITE = justification(
    INTRO_308 + 'On en déduit que $' + COS4 + '=' + SIN4 + '$. Pourquoi ?',
    [],
    'Car le triangle $OHM$ est rectangle isocèle en $H$.',
    ['Car $\\cos x=\\sin x$ pour tout réel $x$.',
     'Car le cercle trigonométrique a pour rayon $1$.',
     'Car $\\dfrac{\\pi}{4}$ est plus petit que $\\dfrac{\\pi}{2}$.'],
    ['Dans le triangle $OHM$ rectangle en $H$, les angles aigus sont complémentaires :'
     ' $\\widehat{OMH}=90^\\circ-45^\\circ=45^\\circ$.',
     'Deux angles égaux : le triangle est isocèle en $H$, donc $OH=HM$, c\'est-à-dire $'
     + col(COS4 + '=' + SIN4) + '$.',
     'En général, $\\cos x\\neq\\sin x$ : par exemple $\\cos(0)=1$ et $\\sin(0)=0$.'])
V308_CARRE = case(
    INTRO_308 + 'On sait que $' + COS4 + '=' + SIN4 + '$, et que $\\cos^2 x+\\sin^2 x=1$ pour tout'
    ' réel $x$. On note $c=' + COS4 + '$, donc $c^2+c^2=1$. Complète.\n\n$c^2=?$',
    [], {'expectedAnswer': '\\frac{1}{2}', 'acceptDecimal': True},
    ['$c^2+c^2=2c^2$, donc $2c^2=1$.',
     'Donc $c^2=' + col('\\dfrac{1}{2}') + '$.'])
V308_VALEUR = case(
    INTRO_308 + 'On a obtenu $' + COS4 + '^2=\\dfrac{1}{2}$. Comme $M$ a une abscisse positive,'
    ' $' + COS4 + '>0$. Complète par la valeur exacte.\n\n$' + COS4 + '=?$',
    [], '\\frac{\\sqrt{2}}{2}',
    ['Le nombre positif dont le carré vaut $\\dfrac{1}{2}$ est'
     ' $\\sqrt{\\dfrac{1}{2}}=\\dfrac{1}{\\sqrt{2}}=\\dfrac{\\sqrt{2}}{2}$.',
     'Donc $' + COS4 + '=' + SIN4 + '=' + col('\\dfrac{\\sqrt{2}}{2}') + '$.'])

MODELES.append(modele(
    '01-demontrer-cos-sin-pi-sur-4', 'Démontrer les valeurs de cos(π/4) et sin(π/4)',
    'Démonstration à trous de cos(π/4) = sin(π/4) = √2/2 : triangle OHM rectangle isocèle'
    ' (justification), cos²(π/4) = 1/2, valeur exacte positive',
    'Fonctions', 'Fonctions trigonométriques', 1,
    [V308_EGALITE, V308_CARRE, V308_VALEUR],
    specs_choix(0, 'triangle rectangle isocèle', ['cos = sin toujours', 'rayon 1', 'π/4 < π/2'])
    + [spec('1/2', 1, '\\frac{1}{2}', 'correct'),
       spec('Écriture décimale 0,5', 1, '0{,}5', 'correct'),
       spec('Erreur : 2', 1, '2', 'incorrect'),
       spec('Erreur : 1', 1, '1', 'incorrect'),
       spec('Erreur : √2/2 (la valeur au lieu du carré)', 1, '\\frac{\\sqrt{2}}{2}', 'incorrect'),
       spec('√2/2', 2, '\\frac{\\sqrt{2}}{2}', 'correct'),
       spec('Forme 1/√2 : dénominateur à rendre rationnel', 2, '\\frac{1}{\\sqrt{2}}', 'bad_form'),
       spec('Erreur : 1/2', 2, '\\frac{1}{2}', 'incorrect'),
       spec('Erreur : −√2/2', 2, '-\\frac{\\sqrt{2}}{2}', 'incorrect'),
       spec('Erreur : √3/2', 2, '\\frac{\\sqrt{3}}{2}', 'incorrect'),
       spec('Erreur : √2', 2, '\\sqrt{2}', 'incorrect')]))

# --- 2. 1SPE-411 : cos(π/3) = 1/2, sin(π/3) = √3/2 ----------------------------------------------

INTRO_411 = ('Dans un repère orthonormé d\'origine $O$, soit $A(1\\,;0)$ et $M$ le point du cercle'
             ' trigonométrique associé au réel $\\dfrac{\\pi}{3}$. On note $H$ le projeté'
             ' orthogonal de $M$ sur l\'axe des abscisses : $OH=' + COS3 + '$ et $HM=' + SIN3
             + '$. L\'angle $\\widehat{AOM}$ mesure $60^\\circ$.\n\n')

V411_EQUILATERAL = justification(
    INTRO_411 + 'Le triangle $OAM$ est équilatéral. Pourquoi ?',
    [],
    'Car il est isocèle en $O$, avec un angle de $60^\\circ$ en $O$.',
    ['Car $OA=OM=1$.',
     'Car tout triangle dont les sommets sont sur le cercle trigonométrique est équilatéral.',
     'Car l\'angle $\\widehat{AOM}$ est droit.'],
    ['$OA=OM=1$ (rayons du cercle) : le triangle est isocèle en $O$, ce qui ne suffit pas.',
     'Ses angles à la base sont égaux et valent $\\dfrac{180^\\circ-60^\\circ}{2}=60^\\circ$ :'
     ' les trois angles valent $60^\\circ$, le triangle est ' + '**équilatéral**' + '.'])
V411_COS = case(
    INTRO_411 + 'Le triangle $OAM$ est équilatéral : sa hauteur issue de $M$ est aussi une'
    ' médiane, donc $H$ est le milieu de $[OA]$. Complète.\n\n$' + COS3 + '=?$',
    [], {'expectedAnswer': '\\frac{1}{2}', 'acceptDecimal': True},
    ['$H$ est le milieu de $[OA]$ et $OA=1$.',
     'Donc $' + COS3 + '=OH=' + col('\\dfrac{1}{2}') + '$.'])
V411_SIN = case(
    INTRO_411 + 'On a obtenu $' + COS3 + '=\\dfrac{1}{2}$. On sait que $\\cos^2 x+\\sin^2 x=1$'
    ' pour tout réel $x$, et $' + SIN3 + '>0$ car $M$ a une ordonnée positive. Complète par la'
    ' valeur exacte.\n\n$' + SIN3 + '=?$',
    [], '\\frac{\\sqrt{3}}{2}',
    ['$' + SIN3 + '^2=1-\\left(\\dfrac{1}{2}\\right)^2=1-\\dfrac{1}{4}=\\dfrac{3}{4}$.',
     'Le sinus est positif : $' + SIN3 + '=\\sqrt{\\dfrac{3}{4}}=' + col('\\dfrac{\\sqrt{3}}{2}')
     + '$.'])

MODELES.append(modele(
    '02-demontrer-cos-sin-pi-sur-3', 'Démontrer les valeurs de cos(π/3) et sin(π/3)',
    'Démonstration à trous de cos(π/3) = 1/2 et sin(π/3) = √3/2 : triangle OAM équilatéral'
    ' (justification), H milieu de [OA], sinus par cos² + sin² = 1',
    'Fonctions', 'Fonctions trigonométriques', 2,
    [V411_EQUILATERAL, V411_COS, V411_SIN],
    specs_choix(0, 'isocèle avec un angle de 60°', ['isocèle seulement', 'tout triangle inscrit',
                                                     'angle droit'])
    + [spec('1/2', 1, '\\frac{1}{2}', 'correct'),
       spec('Écriture décimale 0,5', 1, '0{,}5', 'correct'),
       spec('Erreur : √3/2', 1, '\\frac{\\sqrt{3}}{2}', 'incorrect'),
       spec('Erreur : 1', 1, '1', 'incorrect'),
       spec('√3/2', 2, '\\frac{\\sqrt{3}}{2}', 'correct'),
       spec('Erreur : 3/4 (le carré)', 2, '\\frac{3}{4}', 'incorrect'),
       spec('Erreur : 1/2', 2, '\\frac{1}{2}', 'incorrect'),
       spec('Erreur : √2/2', 2, '\\frac{\\sqrt{2}}{2}', 'incorrect'),
       spec('Erreur : −√3/2', 2, '-\\frac{\\sqrt{3}}{2}', 'incorrect')]))

# --- 3. 1SPE-322 : Al-Kashi --------------------------------------------------------------------

INTRO_322 = ('Soit $ABC$ un triangle. On veut démontrer la formule d\'Al-Kashi :\n\n'
             '$$BC^2=AB^2+AC^2-2\\times AB\\times AC\\times\\cos\\widehat{BAC}$$\n\n')
CHASLES_322 = ('D\'après la relation de Chasles, $' + vec('BC') + '=' + vec('BA') + '+' + vec('AC')
               + '=' + vec('AC') + '-' + vec('AB') + '$, donc $BC^2=\\left\\|' + vec('AC') + '-'
               + vec('AB') + '\\right\\|^2$.\n\n')

V322_CHASLES = justification(
    INTRO_322 + 'On commence par écrire $' + vec('BC') + '$ à l\'aide de $' + vec('AB') + '$ et'
    ' de $' + vec('AC') + '$. Quelle égalité est juste ?',
    [],
    '$' + vec('BC') + '=' + vec('AC') + '-' + vec('AB') + '$',
    ['$' + vec('BC') + '=' + vec('AB') + '-' + vec('AC') + '$',
     '$' + vec('BC') + '=' + vec('AB') + '+' + vec('AC') + '$',
     '$' + vec('BC') + '=' + vec('AC') + '+' + vec('CB') + '$'],
    ['Relation de Chasles : $' + vec('BC') + '=' + vec('BA') + '+' + vec('AC') + '$.',
     'Comme $' + vec('BA') + '=-' + vec('AB') + '$ : $' + vec('BC') + '='
     + col(vec('AC') + '-' + vec('AB')) + '$.',
     '$' + vec('AB') + '-' + vec('AC') + '=' + vec('CB') + '$ : c\'est l\'opposé de $'
     + vec('BC') + '$.'])
V322_DEVELOPPE = justification(
    INTRO_322 + CHASLES_322 + 'On développe ce carré scalaire. Quelle égalité est juste ?',
    [],
    '$\\left\\|' + vec('AC') + '-' + vec('AB') + '\\right\\|^2=AC^2-2\\,' + vec('AC') + '\\cdot'
    + vec('AB') + '+AB^2$',
    ['$\\left\\|' + vec('AC') + '-' + vec('AB') + '\\right\\|^2=AC^2-AB^2$',
     '$\\left\\|' + vec('AC') + '-' + vec('AB') + '\\right\\|^2=AC^2+AB^2$',
     '$\\left\\|' + vec('AC') + '-' + vec('AB') + '\\right\\|^2=AC^2+2\\,' + vec('AC')
     + '\\cdot' + vec('AB') + '+AB^2$'],
    ['$\\|\\vec{u}-\\vec{v}\\|^2=\\|\\vec{u}\\|^2-2\\,\\vec{u}\\cdot\\vec{v}+\\|\\vec{v}\\|^2$,'
     ' comme $(a-b)^2=a^2-2ab+b^2$.',
     'Ici : $BC^2=AC^2-' + col('2\\,' + vec('AC') + '\\cdot' + vec('AB')) + '+AB^2$.',
     'Et $' + vec('AC') + '\\cdot' + vec('AB') + '=AC\\times AB\\times\\cos\\widehat{BAC}$ :'
     ' on obtient la formule d\'Al-Kashi.'])
V_KASHI = [var('b', '2..9'), var('c', '2..9')]
V322_VALEUR = case(
    INTRO_322 + CHASLES_322 + 'En développant, $BC^2=AC^2-2\\,' + vec('AC') + '\\cdot'
    + vec('AB') + '+AB^2$. On prend $AB=' + ev('c') + '$, $AC=' + ev('b') + '$ et'
    ' $\\widehat{BAC}=60^\\circ$, avec $\\cos 60^\\circ=\\dfrac{1}{2}$. Complète.\n\n$BC^2=?$',
    V_KASHI, ev('b^2+c^2-b*c'),
    ['$' + vec('AC') + '\\cdot' + vec('AB') + '=' + ev('b') + '\\times' + ev('c')
     + '\\times\\dfrac{1}{2}=' + ev('b*c/2') + '$.',
     'Donc $BC^2=' + ev('b^2') + '-2\\times' + ev('b*c/2') + '+' + ev('c^2') + '='
     + col(ev('b^2+c^2-b*c')) + '$.'])

VARS_322 = {'b': 5, 'c': 3}
MODELES.append(modele(
    '03-demontrer-al-kashi', 'Démontrer la formule d\'Al-Kashi',
    'Démonstration à trous de la formule d\'Al-Kashi par le produit scalaire : BC = AC − AB'
    ' (Chasles), développement du carré scalaire, BC² pour un angle de 60° (valeurs tirées)',
    'Géométrie', 'Produit scalaire', 1,
    [V322_CHASLES, V322_DEVELOPPE, V322_VALEUR],
    specs_choix(0, 'AC − AB', ['AB − AC', 'AB + AC', 'AC + CB'])
    + specs_choix(1, 'AC² − 2AC·AB + AB²', ['AC² − AB²', 'AC² + AB²', 'avec + 2AC·AB'])
    + [spec('19 (25 + 9 − 15)', 2, '19', 'correct', VARS_322),
       spec('Erreur : 34 (sans le produit scalaire)', 2, '34', 'incorrect', VARS_322),
       spec('Erreur : 4 (25 + 9 − 30, cosinus oublié)', 2, '4', 'incorrect', VARS_322),
       spec('Erreur : 49 (signe +)', 2, '49', 'incorrect', VARS_322),
       spec('Erreur : √19 (BC au lieu de BC²)', 2, '\\sqrt{19}', 'incorrect', VARS_322)]))

# --- 4. 1SPE-323 : MA·MB = 0 ⇔ M sur le cercle de diamètre [AB] --------------------------------

INTRO_323 = ('Soit $A$ et $B$ deux points distincts, et $I$ le milieu de $[AB]$. On cherche'
             ' l\'ensemble des points $M$ du plan tels que $' + vec('MA') + '\\cdot' + vec('MB')
             + '=0$.\n\n')
PRODUIT_323 = ('En introduisant $I$ par la relation de Chasles, et comme $' + vec('IB') + '=-'
               + vec('IA') + '$, on obtient $' + vec('MA') + '\\cdot' + vec('MB')
               + '=MI^2-IA^2$.\n\n')

V323_PRODUIT = justification(
    INTRO_323 + 'Par la relation de Chasles, $' + vec('MA') + '\\cdot' + vec('MB') + '=\\left('
    + vec('MI') + '+' + vec('IA') + '\\right)\\cdot\\left(' + vec('MI') + '+' + vec('IB')
    + '\\right)$. Comme $I$ est le milieu de $[AB]$, $' + vec('IB') + '=-' + vec('IA') + '$.'
    ' Que vaut ce produit scalaire ?',
    [],
    '$MI^2-IA^2$',
    ['$MI^2+IA^2$', '$\\left(MI-IA\\right)^2$', '$MI^2-2\\,' + vec('MI') + '\\cdot' + vec('IA')
     + '$'],
    ['$\\left(' + vec('MI') + '+' + vec('IA') + '\\right)\\cdot\\left(' + vec('MI') + '-'
     + vec('IA') + '\\right)$ se développe comme $(a+b)(a-b)=a^2-b^2$.',
     'Les termes $' + vec('MI') + '\\cdot' + vec('IA') + '$ se compensent : il reste $'
     + col('MI^2-IA^2') + '$.'])
V323_RAYON = case(
    INTRO_323 + PRODUIT_323 + 'On prend $AB=' + ev('2*d') + '$. Le point $M$ vérifie $'
    + vec('MA') + '\\cdot' + vec('MB') + '=0$ si et seulement si $MI^2=IA^2$, c\'est-à-dire'
    ' $MI=IA$ (des longueurs sont positives). Complète.\n\n$MI=?$',
    [var('d', '2..9')], ev('d'),
    ['$I$ est le milieu de $[AB]$ : $IA=\\dfrac{AB}{2}=\\dfrac{' + ev('2*d') + '}{2}=' + ev('d')
     + '$.',
     'Donc $MI=' + col(ev('d')) + '$ : $M$ est à la distance $' + ev('d') + '$ de $I$.'])
V323_CONCLUSION = justification(
    INTRO_323 + PRODUIT_323 + 'Donc $' + vec('MA') + '\\cdot' + vec('MB') + '=0$ si et seulement'
    ' si $MI=IA=\\dfrac{AB}{2}$. Quel est l\'ensemble des points $M$ cherché ?',
    [],
    'Le cercle de diamètre $[AB]$.',
    ['La médiatrice de $[AB]$.',
     'Le cercle de centre $A$ et de rayon $AB$.',
     'Le seul point $I$.'],
    ['Les points $M$ tels que $MI=\\dfrac{AB}{2}$ forment le cercle de centre $I$ et de rayon'
     ' $\\dfrac{AB}{2}$.',
     'Son centre est le milieu de $[AB]$ et son rayon la moitié de $AB$ : c\'est le'
     ' ' + '**cercle de diamètre $[AB]$**' + '.',
     'La médiatrice de $[AB]$ est l\'ensemble des points $M$ tels que $MA=MB$.'])

MODELES.append(modele(
    '04-demontrer-cercle-de-diametre', 'Démontrer l\'ensemble des points M tels que MA·MB = 0',
    'Démonstration à trous, par le milieu I de [AB] : MA·MB = MI² − IA², MI pour AB tiré,'
    ' conclusion (le cercle de diamètre [AB])',
    'Géométrie', 'Produit scalaire', 2,
    [V323_PRODUIT, V323_RAYON, V323_CONCLUSION],
    specs_choix(0, 'MI² − IA²', ['MI² + IA²', '(MI − IA)²', 'MI² − 2MI·IA'])
    + [spec('3 (AB = 6)', 1, '3', 'correct', {'d': 3}),
       spec('Erreur : 6 (AB)', 1, '6', 'incorrect', {'d': 3}),
       spec('Erreur : 9 (IA²)', 1, '9', 'incorrect', {'d': 3}),
       spec('Erreur : 0', 1, '0', 'incorrect', {'d': 3})]
    + specs_choix(2, 'cercle de diamètre [AB]', ['médiatrice', 'cercle de centre A', 'point I'])))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
