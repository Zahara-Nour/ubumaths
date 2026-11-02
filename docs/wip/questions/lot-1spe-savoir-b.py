"""Écrit les 7 modèles du lot 6b « à savoir » (produit scalaire, équation de cercle) de la 1re spé
dans scripts/questions/1spe-savoir-b/.

Phase 0 validée par David le 2026-11-02 (« je valide » sur les recos, § 23 du journal
« docs/wip/questions-1spe-progress.md », D29, lignes 8 à 14), un point par modèle :

| # | Point    | Titre                                         | Catégorie, niveau                  |
| 1 | 1SPE-412 | Produit scalaire et cosinus                   | Produit scalaire › À savoir, 1     |
| 2 | 1SPE-310 | Produit scalaire et projection orthogonale    | Produit scalaire › À savoir, 2     |
| 3 | 1SPE-313 | Produit scalaire en base orthonormée          | Produit scalaire › À savoir, 3     |
| 4 | 1SPE-311 | Caractérisation de l'orthogonalité            | Produit scalaire › À savoir, 4     |
| 5 | 1SPE-415 | Critère d'orthogonalité en base orthonormée   | Produit scalaire › À savoir, 5     |
| 6 | 1SPE-316 | Formule d'Al-Kashi                            | Produit scalaire › À savoir, 6     |
| 7 | 1SPE-329 | Équation de cercle                            | Géométrie repérée › À savoir, 1    |

Catégorie « À savoir » neuve dans les deux domaines (relevé prod du 2026-11-02 : aucune catégorie
de ce nom ; les 7 points sans modèle). Case choix à 4 propositions (la première est la bonne,
l'affichage les mélange), erreurs typiques en distracteurs, deux sens de lecture.

Voisins à ne pas répéter (calculs, déjà publiés) : ba8ae428 (normes et angle), 9c7f7ef0
(projection, figure), fe407c88 (coordonnées), f2cc01fc et 2bfbf2fc (orthogonalité par le calcul),
721324f9 et f7c15433 (Al-Kashi chiffré), 3a6583b5 et a6d7b414 (écrire l'équation d'un cercle).

Bornes : « lycee/1spe.json » (u·v = ‖u‖‖v‖cos(u, v) ; produit scalaire par projection
orthogonale ; en base orthonormée u·v = xx′ + yy′ ; u ⊥ v ⟺ u·v = 0 ; xx′ + yy′ = 0 ;
formule d'Al-Kashi ; (x − a)² + (y − b)² = r² en repère orthonormé).

Pas de `cleanCoefficients` (aucune variable à nettoyer, piège du lot 6a).

    python3 docs/wip/questions/lot-1spe-savoir-b.py scripts/questions/1spe-savoir-b
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


def colt(x, k=0):
    """Mot coloré dans une phrase (hors des $…$)."""
    return '$' + col(x, k) + '$'


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

U = '\\vec{u}'
V = '\\vec{v}'
UV = U + '\\cdot ' + V
NU = '\\|' + U + '\\|'
NV = '\\|' + V + '\\|'
COS = '\\cos(' + U + ',' + V + ')'
AB = '\\overrightarrow{AB}'
AC = '\\overrightarrow{AC}'
AH = '\\overrightarrow{AH}'
HC = '\\overrightarrow{HC}'
REPERE = 'Le plan est muni d\'un repère orthonormé. '
COORD = ('On considère les vecteurs $' + U + '\\begin{pmatrix}x\\\\y\\end{pmatrix}$ et $' + V
         + '\\begin{pmatrix}x\'\\\\y\'\\end{pmatrix}$.')


def vect(a, b):
    return '\\begin{pmatrix}' + a + '\\\\' + b + '\\end{pmatrix}'


# --- 1. 1SPE-412 : u·v = ‖u‖‖v‖cos(u, v) --------------------------------------------------------

V412_DIRECT = qcm(
    'Soit $' + U + '$ et $' + V + '$ deux vecteurs non nuls. Le produit scalaire $' + UV
    + '$ est égal à :',
    '$' + NU + '\\times' + NV + '\\times' + COS + '$',
    ['$' + NU + '\\times' + NV + '$',
     '$' + NU + '\\times' + NV + '\\times\\sin(' + U + ',' + V + ')$',
     '$\\left(' + NU + '+' + NV + '\\right)\\times' + COS + '$'],
    ['À connaître : si $' + U + '$ et $' + V + '$ sont non nuls, $' + UV + '='
     + col(NU + '\\times' + NV + '\\times' + COS) + '$.',
     'Sans le cosinus, on n\'obtient le produit scalaire que si les vecteurs sont colinéaires et'
     ' de même sens (angle nul).'])
V412_INVERSE = qcm(
    'Soit $' + U + '$ et $' + V + '$ deux vecteurs non nuls. Le cosinus $' + COS
    + '$ est égal à :',
    '$\\dfrac{' + UV + '}{' + NU + '\\times' + NV + '}$',
    ['$\\dfrac{' + NU + '\\times' + NV + '}{' + UV + '}$',
     '$' + UV + '\\times' + NU + '\\times' + NV + '$',
     '$\\dfrac{' + UV + '}{' + NU + '+' + NV + '}$'],
    ['À connaître : $' + UV + '=' + NU + '\\times' + NV + '\\times' + COS + '$.',
     'Les normes sont non nulles : on divise par leur produit, $' + COS + '='
     + col('\\dfrac{' + UV + '}{' + NU + '\\times' + NV + '}') + '$.'])

MODELES.append(modele(
    '01-produit-scalaire-et-cosinus', 'Produit scalaire et cosinus',
    'À savoir : u·v = ‖u‖‖v‖cos(u, v), et dans l\'autre sens cos(u, v) = u·v / (‖u‖‖v‖), parmi des'
    ' erreurs typiques (cosinus oublié, sinus, quotient renversé)',
    'Géométrie', 'Produit scalaire', 1,
    [V412_DIRECT, V412_INVERSE],
    specs_qcm([V412_DIRECT, V412_INVERSE],
              [('‖u‖‖v‖cos', ['cosinus oublié', 'sinus', 'somme des normes']),
               ('u·v / (‖u‖‖v‖)', ['quotient renversé', 'produit', 'somme des normes'])])))

# --- 2. 1SPE-310 : projection orthogonale -------------------------------------------------------

PROJ = ('Soit $A$, $B$ et $C$ trois points, avec $A\\neq B$, et $H$ le projeté orthogonal de $C$ sur'
        ' la droite $(AB)$.')
V310_DIRECT = qcm(
    PROJ + '\n\nLe produit scalaire $' + AB + '\\cdot' + AC + '$ est égal à :',
    '$' + AB + '\\cdot' + AH + '$',
    ['$' + AB + '\\cdot' + HC + '$', '$AB\\times AC$', '$' + AC + '\\cdot' + HC + '$'],
    ['À connaître : on peut remplacer $' + AC + '$ par son projeté orthogonal sur la droite'
     ' $(AB)$, donc $' + AB + '\\cdot' + AC + '=' + col(AB + '\\cdot' + AH) + '$.',
     'En effet $' + AC + '=' + AH + '+' + HC + '$ et $' + AB + '\\cdot' + HC + '=0$, car $' + HC
     + '$ est orthogonal à $(AB)$.'])
V310_SIGNE = qcm(
    PROJ + ' Le point $A$ est situé **entre** $H$ et $B$.\n\n'
    'Le produit scalaire $' + AB + '\\cdot' + AC + '$ est égal à :',
    '$-AB\\times AH$',
    ['$AB\\times AH$', '$AB\\times AC$', '$-AB\\times AC$'],
    ['À connaître : $' + AB + '\\cdot' + AC + '=' + AB + '\\cdot' + AH + '$, et $' + AB
     + '$, $' + AH + '$ sont colinéaires.',
     '$A$ est entre $H$ et $B$ : $' + AB + '$ et $' + AH + '$ sont de sens contraires, donc $'
     + AB + '\\cdot' + AC + '=' + col('-AB\\times AH') + '$.',
     'Avec $H$ du même côté que $B$ par rapport à $A$, le signe serait $+$.'])

MODELES.append(modele(
    '02-produit-scalaire-et-projection', 'Produit scalaire et projection orthogonale',
    'À savoir : AB·AC = AB·AH, H projeté de C sur (AB), et le signe de AB × AH selon le sens'
    ' (erreurs typiques : AB × AC, signe oublié)',
    'Géométrie', 'Produit scalaire', 2,
    [V310_DIRECT, V310_SIGNE],
    specs_qcm([V310_DIRECT, V310_SIGNE],
              [('AB·AH', ['AB·HC (nul)', 'AB × AC', 'AC·HC']),
               ('−AB × AH', ['signe oublié', 'AB × AC', '−AB × AC'])])))

# --- 3. 1SPE-313 : u·v = xx′ + yy′ --------------------------------------------------------------

V313_DIRECT = qcm(
    REPERE + COORD + '\n\nLe produit scalaire $' + UV + '$ est égal à :',
    '$xx\'+yy\'$', ['$xy\'-x\'y$', '$xy+x\'y\'$', '$xx\'\\times yy\'$'],
    ['À connaître : dans un repère orthonormé, $' + UV + '=' + col('xx\'+yy\'') + '$.',
     'Ne pas confondre avec $xy\'-x\'y$, le déterminant, qui sert à tester la colinéarité.'])
V313_CONDITION = qcm(
    'On considère les vecteurs $' + U + vect('x', 'y') + '$ et $' + V + vect('x\'', 'y\'')
    + '$, de coordonnées données dans une base du plan.\n\n'
    'L\'égalité $' + UV + '=xx\'+yy\'$ est vraie :',
    'lorsque la base est orthonormée',
    ['dans n\'importe quelle base', 'seulement si $' + U + '$ et $' + V + '$ sont orthogonaux',
     'seulement si $' + U + '$ et $' + V + '$ sont colinéaires'],
    ['À connaître : l\'expression $' + UV + '=xx\'+yy\'$ n\'est valable que dans une base'
     ' ' + colt('\\text{orthonormée}') + '.',
     'Dans une autre base, les produits scalaires des vecteurs de la base entre eux ne valent pas'
     ' $0$ ou $1$, et la formule change.'])

MODELES.append(modele(
    '03-produit-scalaire-base-orthonormee', 'Produit scalaire en base orthonormée',
    'À savoir : en base orthonormée u·v = xx′ + yy′, et la condition de validité de la formule'
    ' (erreurs typiques : déterminant, xy + x′y′, n\'importe quelle base)',
    'Géométrie', 'Produit scalaire', 3,
    [V313_DIRECT, V313_CONDITION],
    specs_qcm([V313_DIRECT, V313_CONDITION],
              [('xx′ + yy′', ['déterminant', 'xy + x′y′', 'xx′ × yy′']),
               ('base orthonormée', ['toute base', 'orthogonaux', 'colinéaires'])])))

# --- 4. 1SPE-311 : u ⊥ v ⟺ u·v = 0 --------------------------------------------------------------

V311_DIRECT = qcm(
    'Soit $' + U + '$ et $' + V + '$ deux vecteurs. Les vecteurs $' + U + '$ et $' + V
    + '$ sont **orthogonaux** si et seulement si :',
    '$' + UV + '=0$',
    ['$' + UV + '=1$', '$' + UV + '=' + NU + '\\times' + NV + '$', '$' + NU + '=' + NV + '$'],
    ['À connaître : $' + U + '$ et $' + V + '$ sont orthogonaux si et seulement si $'
     + col(UV + '=0') + '$.',
     '$' + UV + '=' + NU + '\\times' + NV + '$ correspond au contraire à deux vecteurs colinéaires'
     ' de même sens.'])
V311_INVERSE = qcm(
    'Soit $' + U + '$ et $' + V + '$ deux vecteurs tels que $' + UV + '=0$.\n\n'
    'On peut en conclure que :',
    'les vecteurs $' + U + '$ et $' + V + '$ sont orthogonaux',
    ['les vecteurs $' + U + '$ et $' + V + '$ sont colinéaires',
     '$' + U + '=\\vec{0}$ ou $' + V + '=\\vec{0}$', '$' + NU + '=' + NV + '$'],
    ['À connaître : $' + UV + '=0$ si et seulement si $' + U + '$ et $' + V + '$ sont '
     + colt('\\text{orthogonaux}') + '.',
     'Un produit scalaire nul n\'oblige pas un des vecteurs à être nul : $' + vect('1', '0')
     + '\\cdot' + vect('0', '1') + '=0$ en base orthonormée. Par convention, le vecteur nul est'
     ' orthogonal à tout vecteur.'])

MODELES.append(modele(
    '04-caracterisation-orthogonalite', 'Caractérisation de l\'orthogonalité',
    'À savoir : u et v orthogonaux ⟺ u·v = 0, dans les deux sens, parmi des erreurs typiques'
    ' (u·v = 1, colinéaires, « un des vecteurs est nul »)',
    'Géométrie', 'Produit scalaire', 4,
    [V311_DIRECT, V311_INVERSE],
    specs_qcm([V311_DIRECT, V311_INVERSE],
              [('u·v = 0', ['u·v = 1', 'u·v = ‖u‖‖v‖', 'normes égales']),
               ('orthogonaux', ['colinéaires', 'un vecteur nul', 'normes égales'])])))

# --- 5. 1SPE-415 : xx′ + yy′ = 0 ----------------------------------------------------------------

V415_DIRECT = qcm(
    REPERE + COORD + '\n\nLes vecteurs $' + U + '$ et $' + V
    + '$ sont **orthogonaux** si et seulement si :',
    '$xx\'+yy\'=0$', ['$xy\'-x\'y=0$', '$xy+x\'y\'=0$', '$xx\'+yy\'=1$'],
    ['À connaître : dans un repère orthonormé, $' + UV + '=xx\'+yy\'$, donc $' + U + '$ et $' + V
     + '$ sont orthogonaux si et seulement si $' + col('xx\'+yy\'=0') + '$.',
     'Attention : $xy\'-x\'y=0$ est le critère de **colinéarité**.'])
V415_INVERSE = qcm(
    REPERE + 'Soit $' + U + vect('x', 'y') + '$ un vecteur non nul.\n\n'
    'Lequel de ces vecteurs est orthogonal à $' + U + '$ ?',
    '$' + vect('-y', 'x') + '$',
    ['$' + vect('y', 'x') + '$', '$' + vect('-x', '-y') + '$', '$' + vect('-x', 'y') + '$'],
    ['À connaître : en repère orthonormé, deux vecteurs sont orthogonaux si et seulement si'
     ' $xx\'+yy\'=0$.',
     'Avec $' + vect('-y', 'x') + '$ : $x\\times(-y)+y\\times x=0$, donc $'
     + col(vect('-y', 'x')) + '$ est orthogonal à $' + U + '$.',
     '$' + vect('-x', '-y') + '$ est colinéaire à $' + U + '$ ; avec $' + vect('y', 'x')
     + '$ on obtient $2xy$, qui n\'est pas nul en général.'])

MODELES.append(modele(
    '05-critere-orthogonalite-base-orthonormee', 'Critère d\'orthogonalité en base orthonormée',
    'À savoir : en base orthonormée, u ⊥ v ⟺ xx′ + yy′ = 0, et un vecteur orthogonal à u(x ; y)'
    ' (erreurs typiques : critère de colinéarité, vecteur colinéaire, coordonnées échangées)',
    'Géométrie', 'Produit scalaire', 5,
    [V415_DIRECT, V415_INVERSE],
    specs_qcm([V415_DIRECT, V415_INVERSE],
              [('xx′ + yy′ = 0', ['colinéarité', 'xy + x′y′', '= 1']),
               ('(−y ; x)', ['(y ; x)', 'colinéaire', '(−x ; y)'])])))

# --- 6. 1SPE-316 : Al-Kashi ---------------------------------------------------------------------

V316_DIRECT = qcm(
    'Dans un triangle $ABC$, $BC^2$ est égal à :',
    '$AB^2+AC^2-2\\times AB\\times AC\\times\\cos\\widehat{BAC}$',
    ['$AB^2+AC^2+2\\times AB\\times AC\\times\\cos\\widehat{BAC}$', '$AB^2+AC^2$',
     '$AB^2+AC^2-2\\times AB\\times AC\\times\\cos\\widehat{ABC}$'],
    ['À connaître (formule d\'Al-Kashi) : $BC^2='
     + col('AB^2+AC^2-2\\times AB\\times AC\\times\\cos\\widehat{BAC}') + '$.',
     'L\'angle est celui compris entre les deux côtés connus, en face du côté cherché : ici l\'angle'
     ' en $A$.'])
V316_PYTHAGORE = qcm(
    'Dans un triangle $ABC$ rectangle en $A$, la formule d\'Al-Kashi'
    ' $BC^2=AB^2+AC^2-2\\times AB\\times AC\\times\\cos\\widehat{BAC}$ devient :',
    '$BC^2=AB^2+AC^2$',
    ['$BC^2=AB^2+AC^2-2\\times AB\\times AC$', '$BC=AB+AC$', '$BC^2=AB^2-AC^2$'],
    ['$\\widehat{BAC}=90^\\circ$ et $\\cos 90^\\circ=0$ : le dernier terme disparaît.',
     'On retrouve le théorème de Pythagore : $' + col('BC^2=AB^2+AC^2') + '$.'])

MODELES.append(modele(
    '06-formule-al-kashi', 'Formule d\'Al-Kashi',
    'À savoir : BC² = AB² + AC² − 2 AB × AC × cos BAC, et le cas de l\'angle droit (Pythagore) ;'
    ' erreurs typiques : signe, angle mal choisi, cosinus oublié',
    'Géométrie', 'Produit scalaire', 6,
    [V316_DIRECT, V316_PYTHAGORE],
    specs_qcm([V316_DIRECT, V316_PYTHAGORE],
              [('formule', ['signe +', 'Pythagore hors angle droit', 'angle en B']),
               ('Pythagore', ['cosinus remplacé par 1', 'sans carrés', 'différence'])])))

# --- 7. 1SPE-329 : (x − a)² + (y − b)² = r² -----------------------------------------------------

CERCLE = REPERE + 'Soit $a$, $b$ deux réels et $r$ un réel strictement positif.'
V329_DIRECT = qcm(
    CERCLE + '\n\nUne équation du cercle de centre $\\Omega(a\\,;b)$ et de rayon $r$ est :',
    '$(x-a)^2+(y-b)^2=r^2$',
    ['$(x+a)^2+(y+b)^2=r^2$', '$(x-a)^2+(y-b)^2=r$', '$x^2+y^2=r^2$'],
    ['À connaître : un point $M(x\\,;y)$ est sur le cercle si et seulement si $\\Omega M=r$,'
     ' c\'est-à-dire $\\Omega M^2=r^2$.',
     'En repère orthonormé, $\\Omega M^2=(x-a)^2+(y-b)^2$, d\'où l\'équation $'
     + col('(x-a)^2+(y-b)^2=r^2') + '$.'])
V329_INVERSE = qcm(
    CERCLE + '\n\nL\'ensemble des points $M(x\\,;y)$ tels que $(x-a)^2+(y-b)^2=r^2$ est :',
    'le cercle de centre $(a\\,;b)$ et de rayon $r$',
    ['le cercle de centre $(-a\\,;-b)$ et de rayon $r$',
     'le cercle de centre $(a\\,;b)$ et de rayon $r^2$',
     'le disque de centre $(a\\,;b)$ et de rayon $r$'],
    ['À connaître : $(x-a)^2+(y-b)^2=r^2$ équivaut à $\\Omega M=r$ avec $\\Omega(a\\,;b)$.',
     'C\'est donc ' + colt('\\text{le cercle de centre } (a\\,;b) \\text{ et de rayon } r') + ' :'
     ' le rayon est $r$, pas $r^2$, et le disque serait $(x-a)^2+(y-b)^2\\leqslant r^2$.'])

MODELES.append(modele(
    '07-equation-de-cercle', 'Équation de cercle',
    'À savoir : en repère orthonormé, (x − a)² + (y − b)² = r² est une équation du cercle de centre'
    ' (a ; b) et de rayon r, dans les deux sens (erreurs typiques : signes, r au lieu de r², disque)',
    'Géométrie', 'Géométrie repérée', 1,
    [V329_DIRECT, V329_INVERSE],
    specs_qcm([V329_DIRECT, V329_INVERSE],
              [('(x − a)² + (y − b)² = r²', ['signes', 'r non élevé au carré', 'centre oublié']),
               ('cercle (a ; b), r', ['centre opposé', 'rayon r²', 'disque'])])))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
