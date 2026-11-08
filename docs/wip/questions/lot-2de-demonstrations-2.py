"""Écrit les 3 modèles du lot 2 « démonstrations : géométrie » de la seconde dans
scripts/questions/2de-demonstrations-2/.

Phase 0 validée par David le 2026-11-06 (« je valide », D1 du journal
« docs/wip/questions-2de-demonstrations-progress.md », § 2), un point par modèle :

| # | Point | Titre                                                    | Sous-notion du point (prod), niveau     |
| 1 | 2-304 | Démontrer : colinéaires ⟺ déterminant nul                | Vecteurs › colinéarité, 6                |
| 2 | 2-438 | Démontrer : colinéaires ⟺ coordonnées proportionnelles   | Vecteurs › colinéarité, 7                |
| 3 | 2-320 | Démontrer la forme générale d'une équation de droite     | Géométrie repérée › équations de droites, 10 |

Forme (D1, Q2) : comme le lot 1 (lot-2de-demonstrations-1.py). Valeurs tirées (Q3) : coordonnées
de u pour 304 et 438, de A et de u pour 320 ; les étapes à ranger restent en lettres.

Niveaux : après ceux déjà présents sur la sous-notion, tous niveaux scolaires (relevé prod du
2026-11-08 : colinéarité 1-5, équations de droites 1-9).

    python3 docs/wip/questions/lot-2de-demonstrations-2.py scripts/questions/2de-demonstrations-2
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


def v(x):
    return '{{' + x + '}}'


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


def colonne(a, b):
    return '\\begin{pmatrix}' + a + '\\\\' + b + '\\end{pmatrix}'


MODELES = []
REPERE = 'Dans une base orthonormée $(\\vec{i},\\vec{j})$, '

# Coordonnées de u tirées (304 et 438) ; v garde des lettres.
UX, UY = v('ux'), v('uy')
V_U = [var('ux', '2..6'), var('uy', '2..7')]
VU = {'ux': 2, 'uy': 3}
U = '\\vec{u}' + colonne(UX, UY)

# --- 1. 2-304 : colinéaires si et seulement si le déterminant est nul --------------------------

INTRO_304 = (REPERE + 'on considère le vecteur $' + U + '$ et un vecteur non nul'
             ' $\\vec{v}' + colonne('x', 'y') + '$. On démontre que $\\vec{u}$ et $\\vec{v}$ sont'
             ' colinéaires si et seulement si $\\det(\\vec{u},\\vec{v})=0$.\n\n')
RECIPROQUE_304 = ('Réciproquement, supposons $\\det(\\vec{u},\\vec{v})=0$, c\'est-à-dire'
                  ' $' + UX + 'y-' + UY + 'x=0$. On pose $k=\\dfrac{x}{' + UX + '}$ : ainsi'
                  ' $x=' + UX + 'k$.\n\n')

V304_DIRECT = case(
    INTRO_304 + 'Supposons $\\vec{u}$ et $\\vec{v}$ colinéaires : il existe un réel $k$ tel que'
    ' $\\vec{v}=k\\vec{u}$, donc $\\vec{v}' + colonne(UX + 'k', UY + 'k') + '$. Complète.\n\n'
    '$\\det(\\vec{u},\\vec{v})=\\begin{vmatrix}' + UX + '&' + UX + 'k\\\\' + UY + '&' + UY
    + 'k\\end{vmatrix}=' + UX + '\\times ' + UY + 'k-' + UX + 'k\\times ' + UY + '=?$',
    V_U, '0',
    ['$\\det(\\vec{u},\\vec{v})=' + UX + '\\times ' + UY + 'k-' + UY + '\\times ' + UX + 'k$ :'
     ' les deux produits sont égaux.',
     'Donc $\\det(\\vec{u},\\vec{v})=' + col('0') + '$.'])
V304_RECIPROQUE = case(
    INTRO_304 + RECIPROQUE_304 + 'De $' + UX + 'y=' + UY + 'x=' + UY + '\\times ' + UX + 'k$, on'
    ' tire $y$. Complète.\n\n$y=?$',
    V_U, UY + 'k',
    ['On divise les deux membres de $' + UX + 'y=' + UY + '\\times ' + UX + 'k$ par $' + UX
     + '$, qui n\'est pas nul.',
     'Donc $y=' + col(UY + 'k') + '$.'])
V304_CONCLURE = justification(
    INTRO_304 + RECIPROQUE_304 + 'On obtient $x=' + UX + 'k$ et $y=' + UY + 'k$. Pourquoi peut-on'
    ' conclure que $\\vec{u}$ et $\\vec{v}$ sont colinéaires ?',
    V_U,
    'Car $\\vec{v}=k\\vec{u}$ : les coordonnées de $\\vec{v}$ sont celles de $\\vec{u}$'
    ' multipliées par $k$.',
    ['Car $\\det(\\vec{u},\\vec{v})=0$.',
     'Car $x$ et $y$ sont égaux.',
     'Car $\\vec{u}$ et $\\vec{v}$ ont la même norme.'],
    ['$k\\vec{u}$ a pour coordonnées $' + colonne(UX + 'k', UY + 'k') + '$ : ce sont celles de'
     ' $\\vec{v}$.',
     'Donc $' + col('\\vec{v}=k\\vec{u}') + '$ : $\\vec{u}$ et $\\vec{v}$ sont'
     ' **colinéaires**.',
     '« $\\det(\\vec{u},\\vec{v})=0$ » est l\'hypothèse de départ : la redire ne démontre rien.'])
V304_RANGER = ranger(
    REPERE + 'soit $\\vec{u}' + colonne('x', 'y') + '$ et $\\vec{v}' + colonne("x'", "y'")
    + '$ deux vecteurs non nuls. On démontre que $\\vec{u}$ et $\\vec{v}$ sont colinéaires si et'
    ' seulement si $\\det(\\vec{u},\\vec{v})=xy\'-x\'y=0$.',
    ['Si $\\vec{v}=k\\vec{u}$, alors $x\'=kx$ et $y\'=ky$.',
     'Donc $\\det(\\vec{u},\\vec{v})=x\\times ky-kx\\times y=0$.',
     'Réciproquement, si $xy\'-x\'y=0$ et $x\\neq 0$, on pose $k=\\dfrac{x\'}{x}$ : $x\'=kx$.',
     'Alors $xy\'=x\'y=kxy$, donc $y\'=ky$.',
     'Donc $\\vec{v}=k\\vec{u}$ : $\\vec{u}$ et $\\vec{v}$ sont colinéaires.'],
    ['On démontre les deux sens : colinéaires $\\Rightarrow$ déterminant nul, puis déterminant'
     ' nul $\\Rightarrow$ colinéaires.',
     'Si $x=0$, alors $y\\neq 0$ ($\\vec{u}$ est non nul) et on raisonne de même avec'
     ' $k=\\dfrac{y\'}{y}$.',
     'Conclusion : $' + col('\\vec{u}') + '$ et $\\vec{v}$ sont colinéaires si et seulement si'
     ' $\\det(\\vec{u},\\vec{v})=0$.'])

MODELES.append(modele(
    '01-demontrer-colinearite-determinant',
    'Démontrer que deux vecteurs sont colinéaires si et seulement si leur déterminant est nul',
    'Démonstration à trous (coordonnées de u tirées) : déterminant nul si v = ku (case),'
    ' réciproque y = kb (case), conclusion v = ku (choix) ; étapes à ranger',
    6,
    [V304_DIRECT, V304_RECIPROQUE, V304_CONCLURE, V304_RANGER],
    [spec('0', 0, '0', 'correct', VU),
     spec('Erreur : 12k (somme des produits)', 0, '12k', 'incorrect', VU),
     spec('Erreur : 6k', 0, '6k', 'incorrect', VU),
     spec('3k', 1, '3k', 'correct', VU),
     spec('Erreur : 2k', 1, '2k', 'incorrect', VU),
     spec('Erreur : 6k (division oubliée)', 1, '6k', 'incorrect', VU),
     spec('Erreur : k', 1, 'k', 'incorrect', VU)]
    + specs_choix(2, 'v = ku', ['hypothèse redite', 'x = y', 'même norme'], VU)
    + ['RANGER:3']))

# --- 2. 2-438 : colinéaires si et seulement si coordonnées proportionnelles ---------------------

INTRO_438 = (REPERE + 'on considère le vecteur $' + U + '$ et un vecteur non nul'
             ' $\\vec{v}' + colonne('x', 'y') + '$. On démontre que $\\vec{u}$ et $\\vec{v}$ sont'
             ' colinéaires si et seulement si leurs coordonnées sont proportionnelles.\n\n')
KU_438 = ('Pour tout réel $k$, $k\\vec{u}=' + UX + 'k\\,\\vec{i}+' + UY + 'k\\,\\vec{j}$, donc'
          ' $k\\vec{u}' + colonne(UX + 'k', UY + 'k') + '$.\n\n')

V438_KU = case(
    INTRO_438 + 'On a $\\vec{u}=' + UX + '\\vec{i}+' + UY + '\\vec{j}$. Soit $k$ un réel.'
    ' Complète.\n\n$k\\vec{u}=(?)\\,\\vec{i}+' + UY + 'k\\,\\vec{j}$',
    V_U, UX + 'k',
    ['On distribue : $k\\vec{u}=k(' + UX + '\\vec{i}+' + UY + '\\vec{j})=' + UX + 'k\\,\\vec{i}+'
     + UY + 'k\\,\\vec{j}$.',
     'Donc $k\\vec{u}$ a pour abscisse $' + col(UX + 'k') + '$.'])
V438_EGALITE = justification(
    INTRO_438 + KU_438 + 'Pourquoi $\\vec{v}=k\\vec{u}$ équivaut-il à $x=' + UX + 'k$ et'
    ' $y=' + UY + 'k$ ?',
    V_U,
    'Car deux vecteurs sont égaux si et seulement s\'ils ont les mêmes coordonnées.',
    ['Car $\\det(\\vec{u},\\vec{v})=0$.',
     'Car $x$ et $y$ sont des multiples de $k$.',
     'Car $\\vec{u}$ et $\\vec{v}$ ont la même direction.'],
    ['Dans une base, un vecteur a des coordonnées uniques.',
     '$\\vec{v}=k\\vec{u}$ signifie donc que $\\vec{v}$ et $k\\vec{u}$ ont les **mêmes'
     ' coordonnées** : $' + col('x=' + UX + 'k') + '$ et $' + col('y=' + UY + 'k') + '$.',
     'Le déterminant donne un autre critère de colinéarité ; il ne justifie pas cette égalité.'])
V438_PRODUITS = case(
    INTRO_438 + KU_438 + 'Ainsi $\\vec{u}$ et $\\vec{v}$ sont colinéaires si et seulement si'
    ' les coordonnées $x$ et $y$ de $\\vec{v}$ sont proportionnelles à $' + UX + '$ et $' + UY
    + '$, c\'est-à-dire si les produits en croix sont égaux. Complète.\n\n$' + UX + 'y=?$',
    V_U, UY + 'x',
    ['Les couples $(' + UX + '\\,;\\,' + UY + ')$ et $(x\\,;\\,y)$ sont proportionnels si et'
     ' seulement si les produits en croix sont égaux.',
     'Donc $' + UX + 'y=' + col(UY + 'x') + '$ (c\'est la nullité du déterminant).'])
V438_RANGER = ranger(
    REPERE + 'soit $\\vec{u}' + colonne('x', 'y') + '$ et $\\vec{v}' + colonne("x'", "y'")
    + '$ deux vecteurs non nuls. On démontre que $\\vec{u}$ et $\\vec{v}$ sont colinéaires si et'
    ' seulement si leurs coordonnées sont proportionnelles.',
    ['$\\vec{u}=x\\vec{i}+y\\vec{j}$, donc pour tout réel $k$, $k\\vec{u}=kx\\,\\vec{i}+ky\\,'
     '\\vec{j}$.',
     'Donc $k\\vec{u}$ a pour coordonnées $' + colonne('kx', 'ky') + '$.',
     'Deux vecteurs égaux ont les mêmes coordonnées : $\\vec{v}=k\\vec{u}$ si et seulement si'
     ' $x\'=kx$ et $y\'=ky$.',
     'Donc $\\vec{u}$ et $\\vec{v}$ sont colinéaires si et seulement si leurs coordonnées sont'
     ' proportionnelles (de coefficient $k$).'],
    ['On calcule les coordonnées de $k\\vec{u}$, puis on les compare à celles de $\\vec{v}$.',
     'Conclusion : $' + col('\\vec{v}=k\\vec{u}') + '$ si et seulement si $x\'=kx$ et $y\'=ky$.'])

MODELES.append(modele(
    '02-demontrer-colinearite-proportionnalite',
    'Démontrer que deux vecteurs sont colinéaires si et seulement si leurs coordonnées sont'
    ' proportionnelles',
    'Démonstration à trous (coordonnées de u tirées) : coordonnées de ku (case), égalité de'
    ' deux vecteurs (choix), produits en croix (case) ; étapes à ranger',
    7,
    [V438_KU, V438_EGALITE, V438_PRODUITS, V438_RANGER],
    [spec('2k', 0, '2k', 'correct', VU),
     spec('Erreur : 2', 0, '2', 'incorrect', VU),
     spec('Erreur : 3k', 0, '3k', 'incorrect', VU),
     spec('Erreur : 2 + k', 0, '2+k', 'incorrect', VU)]
    + specs_choix(1, 'mêmes coordonnées', ['déterminant', 'multiples de k', 'même direction'],
                  VU)
    + [spec('3x', 2, '3x', 'correct', VU),
       spec('Erreur : 2x', 2, '2x', 'incorrect', VU),
       spec('Erreur : 3y', 2, '3y', 'incorrect', VU),
       spec('Erreur : x', 2, 'x', 'incorrect', VU)]
    + ['RANGER:3']))

# --- 3. 2-320 : forme générale d'une équation de droite ----------------------------------------

XA, YA, AL, BE, C = v('xa'), v('ya'), v('al'), v('be'), v('c')
V_D = [var('xa', '1..6'), var('ya', '1..6'), var('al', '2..5'), var('be', '2..5'),
       var('c', 'eval:(al)*(ya)-(be)*(xa)')]
VD = {'xa': 2, 'ya': 3, 'al': 2, 'be': 4, 'c': -2}
INTRO_320 = ('Dans un repère orthonormé, soit $d$ la droite passant par $A(' + XA + '\\,;\\,' + YA
             + ')$ et de vecteur directeur $\\vec{u}' + colonne(AL, BE) + '$. On démontre que $d$'
             ' a une équation de la forme $ax+by+c=0$.\n\nSoit $M(x\\,;\\,y)$ un point du'
             ' plan.\n\n')
AM_320 = '$\\overrightarrow{AM}' + colonne('x-' + XA, 'y-' + YA) + '$'

V320_AM = case(
    INTRO_320 + 'Complète les coordonnées du vecteur $\\overrightarrow{AM}$.\n\n'
    '$\\overrightarrow{AM}' + colonne('x-' + XA, '?') + '$',
    V_D, 'y-' + YA,
    ['$\\overrightarrow{AM}$ a pour coordonnées $\\begin{pmatrix}x_M-x_A\\\\y_M-y_A\\end{pmatrix}$.',
     'Donc $\\overrightarrow{AM}' + colonne('x-' + XA, col('y-' + YA)) + '$.'])
V320_COLINEAIRES = justification(
    INTRO_320 + 'Pourquoi $M$ appartient-il à $d$ si et seulement si'
    ' $\\det(\\overrightarrow{AM},\\vec{u})=0$ ?',
    V_D,
    'Car $M\\in d$ si et seulement si $\\overrightarrow{AM}$ et $\\vec{u}$ sont colinéaires.',
    ['Car $M\\in d$ si et seulement si $\\overrightarrow{AM}=\\vec{u}$.',
     'Car $M\\in d$ si et seulement si $\\overrightarrow{AM}$ et $\\vec{u}$ sont orthogonaux.',
     'Car la droite $d$ passe par l\'origine du repère.'],
    ['$d$ est la droite qui passe par $A$ et dirigée par $\\vec{u}$ : $M\\in d$ si et seulement'
     ' si $\\overrightarrow{AM}$ et $\\vec{u}$ sont **colinéaires**.',
     'Et deux vecteurs sont colinéaires si et seulement si leur déterminant est nul :'
     ' $' + col('\\det(\\overrightarrow{AM},\\vec{u})=0') + '$.',
     '$\\overrightarrow{AM}=\\vec{u}$ ne donne qu\'un seul point de $d$.'])
V320_DEVELOPPER = case(
    INTRO_320 + 'On a ' + AM_320 + '. On développe le déterminant. Complète.\n\n'
    '$\\det(\\overrightarrow{AM},\\vec{u})=(x-' + XA + ')\\times ' + BE + '-(y-' + YA + ')\\times '
    + AL + '=' + BE + 'x-' + AL + 'y+?$',
    V_D, C,
    ['$(x-' + XA + ')\\times ' + BE + '=' + BE + 'x-{{eval:(be)*(xa)}}$ et $(y-' + YA
     + ')\\times ' + AL + '=' + AL + 'y-{{eval:(al)*(ya)}}$.',
     'Donc $\\det(\\overrightarrow{AM},\\vec{u})=' + BE + 'x-' + AL + 'y-{{eval:(be)*(xa)}}'
     '+{{eval:(al)*(ya)}}=' + BE + 'x-' + AL + 'y+' + col('{{c;()}}') + '$.',
     '$M\\in d$ si et seulement si $' + BE + 'x-' + AL + 'y+{{c;()}}=0$ : c\'est une équation de'
     ' la forme $ax+by+c=0$.'])
V320_RANGER = ranger(
    'Dans un repère orthonormé, soit $d$ la droite passant par $A(x_A\\,;\\,y_A)$, de vecteur'
    ' directeur non nul $\\vec{u}' + colonne('\\alpha', '\\beta') + '$, et $M(x\\,;\\,y)$ un point'
    ' du plan. On démontre que $d$ a une équation de la forme $ax+by+c=0$.',
    ['$M\\in d$ si et seulement si $\\overrightarrow{AM}$ et $\\vec{u}$ sont colinéaires.',
     'Si et seulement si $\\det(\\overrightarrow{AM},\\vec{u})=0$, soit'
     ' $(x-x_A)\\beta-(y-y_A)\\alpha=0$.',
     'Si et seulement si $\\beta x-\\alpha y+(\\alpha y_A-\\beta x_A)=0$.',
     'On pose $a=\\beta$, $b=-\\alpha$ et $c=\\alpha y_A-\\beta x_A$ : $ax+by+c=0$, avec'
     ' $(a\\,;\\,b)\\neq(0\\,;\\,0)$ car $\\vec{u}$ est non nul.'],
    ['On traduit l\'appartenance de $M$ à $d$ par la colinéarité, puis par le déterminant, et on'
     ' développe.',
     'Conclusion : $d$ a une équation de la forme $' + col('ax+by+c=0') + '$.'])

MODELES.append(modele(
    '03-demontrer-equation-cartesienne-de-droite',
    'Démontrer qu\'une droite a une équation de la forme ax + by + c = 0',
    'Démonstration à trous (A et u tirés) : coordonnées de AM (case), M ∈ d ⟺ det(AM, u) = 0'
    ' (choix), constante c en développant le déterminant (case) ; étapes à ranger',
    10,
    [V320_AM, V320_COLINEAIRES, V320_DEVELOPPER, V320_RANGER],
    [spec('y − 3', 0, 'y-3', 'correct', VD),
     spec('Écriture −3 + y', 0, '-3+y', 'correct', VD),
     spec('Erreur : y + 3', 0, 'y+3', 'incorrect', VD),
     spec('Erreur : 3 − y', 0, '3-y', 'incorrect', VD),
     spec('Erreur : y', 0, 'y', 'incorrect', VD)]
    + specs_choix(1, 'colinéaires', ['AM = u', 'orthogonaux', 'origine'], VD)
    + [spec('−2', 2, '-2', 'correct', VD),
       spec('Erreur : 2 (signe)', 2, '2', 'incorrect', VD),
       spec('Erreur : −14 (deux signes moins)', 2, '-14', 'incorrect', VD),
       spec('Erreur : 14', 2, '14', 'incorrect', VD)]
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
