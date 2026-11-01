"""Écrit les 7 modèles du lot 6 « Translation, vecteurs, sphère » de la 3e dans
scripts/questions/3-lot-6/.

Phase 0 validée par David le 2026-11-01 (journal `questions-3-progress.md` § 13 et 13.6, un point
par modèle ; 3-024 couvert par le modèle de 4e c8306505, partagé par la migration de rangement) :

| # | Point | Titre | Catégorie, niveau |
| 1 | 3-025 | Vecteurs égaux, opposés, nul | Géométrie › Vecteurs › Égalité, 1 |
| 2 | 3-026 | Somme de deux vecteurs | Géométrie › Vecteurs › Somme, 1 |
| 3 | 3-027 | Relation de Chasles | Géométrie › Vecteurs › Chasles, 1 |
| 4 | 3-018 | Boule ou sphère ? | Géométrie › Solides › Sphère et boule, 1 |
| 5 | 3-019 | Grands cercles et diamètre d'une sphère | Géométrie › Solides › Sphère et boule, 1 |
| 6 | 3-021 | Volume d'une boule | Grandeurs › Volumes › Volume d'une boule, 1 |
| 7 | 3-020 | Sections de solides | Géométrie › Solides › Sections, 1 |

Le nœud et le tag sont posés par la migration de rangement, après le `--publier` de David.
3-019 (v2) et 3-020 dessinent un ` ```solide ` : pas en prod au 2026-11-01, ces deux modèles
restent en brouillon jusqu'au `deploy:prod` qui livre le bloc.

Décisions et pièges :
- vecteurs : toujours en case choix (jamais de vecteur saisi), la bonne réponse écrite en premier
  (indice 0), le bloc mélange ;
- quadrillage : quatre vecteurs nommés, posés dans quatre cases fixes (C D, E F, G H, K L) ; la
  variable p fait tourner les sortes de vecteurs (juste, opposé, symétriques) entre les cases, pour
  que la bonne réponse ne soit pas toujours le même nom ; les coefficients de chaque case sont des
  littéraux choisis par `{{if}}` (jamais un `eval` d'un `{{if}}`) ; `%` refusé dans l'`eval` d'une
  variable (admis dans les conditions) : k<s> = (s − p) mod 4 écrit en `{{if}}` ;
- choix à plusieurs réponses : une partie seulement des bonnes cases = `unoptimal_form` (incomplet) ;
- `texte` n'accepte pas de LaTeX : « u⃗ » s'écrit avec la flèche combinante U+20D7 ;
- coordonnées calculées dans une figure : arrondies au centième, `;d` (jamais une fraction) ;
- volume exact : `options.constraints.products: off` comme le cylindre de 5e (45 × π accepté) ;
  arrondi : `;d` dans la réponse, tirages loin d'un demi (pas d'arrondi ambigu) ;
- variables `e` et `i` interdites dans les `eval`.

    python3 docs/wip/questions/lot-3-6.py scripts/questions/3-lot-6
"""
import json
import math
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, variables, answers, status, violations=None):
    s = {'description': desc, 'variationIndex': vi,
         'variables': {k: str(v) for k, v in variables.items()},
         'answers': answers if isinstance(answers, list) else [answers],
         'expected': {'status': status}}
    if violations:
        s['expected']['constraintViolations'] = violations
    return s


def modele(nom, title, description, theme, domain, subdomain, level, variations, specs, delay=60,
           options=None):
    m = {'title': title, 'description': description, 'grades': ['3'], 'theme': theme,
         'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': delay,
         'status': 'draft'}
    if options:
        m['options'] = options
    m['variations'] = variations
    m['testSpecs'] = specs
    return nom, m


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [a if isinstance(a, dict) else {'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def ev(x):
    return '{{eval:' + x + '}}'


def num(x):
    """Coordonnée de figure : décimal au centième, jamais une fraction."""
    return ev('round(100*(' + x + '))/100;d')


def choix(lignes, plusieurs=False):
    tete = 'plusieurs: oui\n' if plusieurs else ''
    return '\n\n```choix\n' + tete + ''.join('- ' + l + '\n' for l in lignes) + '```'


def selon(nom, valeurs):
    """Texte ou nombre choisi par la variable nom ({{if}} mis bout à bout, jamais imbriqués)."""
    return ''.join('{{if:' + nom + '==' + str(j) + '|' + str(v) + '|}}' for j, v in enumerate(valeurs))


def vec(xy):
    return '\\overrightarrow{' + xy + '}'


U, V = '\\vec{u}', '\\vec{v}'
CM = '~\\unit{cm}'
CM3 = '~\\unit{cm^3}'
MODELES = []

# --- Quadrillage : vecteur(s) donné(s) et quatre vecteurs nommés dans quatre cases ------------

LARG, HAUT = 22, 15
# Cases (origine) : u, v (si besoin), puis les quatre candidats
BASE_U, BASE_V = (4, 11), (4, 4)
CASES = [(11, 11), (18, 11), (11, 4), (18, 4)]
NOMS = [('C', 'D'), ('E', 'F'), ('G', 'H'), ('K', 'L')]


def nom_de_sorte(k):
    """Nom du vecteur de la sorte k : il est dans la case (k + p) % 4."""
    return selon('p', [vec(''.join(NOMS[(k + q) % 4])) for q in range(4)])


def vars_cases(sortes):
    """sortes[k] = (cux, cvx, cuy, cvy) : la sorte k vaut (cux·ux + cvx·vx ; cuy·uy + cvy·vy).
    Case s : sorte (s − p) % 4, coefficients littéraux, puis déplacement d<s>x, d<s>y."""
    vs = [var('p', '0..3')]
    for s in range(4):
        k = 'k' + str(s)
        vs.append(var(k, selon('p', [str((s - q) % 4) for q in range(4)])))
        for j, c in enumerate(['ax', 'bx', 'ay', 'by']):
            vs.append(var(c + str(s), selon(k, [str(t[j]) for t in sortes])))
        vs.append(var('d' + str(s) + 'x', 'eval:ax' + str(s) + '*ux+bx' + str(s) + '*vx'))
        vs.append(var('d' + str(s) + 'y', 'eval:ay' + str(s) + '*uy+by' + str(s) + '*vy'))
    return vs


def etiquette_libre(nom, bx, by, dx, dy):
    """Nom d'un vecteur libre, à 0,7 carreau du milieu, du côté gauche de la flèche."""
    n = 'sqrt((' + dx + ')^2+(' + dy + ')^2)'
    x = str(bx) + '+(' + dx + ')/2-0.7*(' + dy + ')/' + n
    y = str(by) + '+(' + dy + ')/2+0.7*(' + dx + ')/' + n
    return 'texte(' + num(x) + ', ' + num(y) + ', "' + nom + '")\n'


def vecteur_libre(nom, base, dx, dy):
    return ('vecteur(' + ev(dx) + ', ' + ev(dy) + ', ancre=(' + str(base[0]) + ', ' + str(base[1])
            + '))\n' + etiquette_libre(nom, base[0], base[1], dx, dy))


def candidats_dsl():
    out = ''
    for s, ((bx, by), (o, x)) in enumerate(zip(CASES, NOMS)):
        dx, dy = 'd' + str(s) + 'x', 'd' + str(s) + 'y'
        out += (o + ' = point(' + str(bx) + ', ' + str(by) + ', etiquette="{{if:' + dy
                + '>0|bas|haut}}")\n' + x + ' = point(' + ev(str(bx) + '+' + dx) + ', '
                + ev(str(by) + '+' + dy) + ', etiquette="{{if:' + dy + '>0|haut|bas}}")\n'
                + 'vecteur(' + o + ', ' + x + ')\n')
    return out


def quadrillage(description, corps, largeur=LARG, hauteur=HAUT):
    return ('\n\n```figure\nfenetre: 0 ; ' + str(largeur) + ' ; 0 ; ' + str(hauteur)
            + '\ngrille: 1\ndescription: ' + description + '\n---\n' + corps + '```')


def deplacement(nom, x, y):
    """« u fait 2 carreaux vers la droite et 3 vers le bas » (x, y : noms de variables)."""
    return ('$' + nom + '$ fait ' + ev('abs(' + x + ')') + ' carreau(x) vers la {{if:' + x
            + '>0|droite|gauche}} et ' + ev('abs(' + y + ')') + ' vers le {{if:' + y
            + '>0|haut|bas}}')


def vars_spec_cases(sortes, p, u, v=(0, 0)):
    """Valeurs des variables d'une spec (mêmes définitions que vars_cases)."""
    d = {'p': p, 'ux': u[0], 'uy': u[1], 'vx': v[0], 'vy': v[1]}
    for s in range(4):
        k = (s - p + 4) % 4
        t = sortes[k]
        d['k' + str(s)] = k
        for j, c in enumerate(['ax', 'bx', 'ay', 'by']):
            d[c + str(s)] = t[j]
        d['d' + str(s) + 'x'] = t[0] * u[0] + t[1] * v[0]
        d['d' + str(s) + 'y'] = t[2] * u[1] + t[3] * v[1]
    return d


# --- 1. 3-025 : vecteurs égaux, opposés, nul ---------------------------------------------------

# Sortes : u, −u, et les deux symétriques (même longueur, autre direction)
SORTES_EGAL = [(1, 0, 1, 0), (-1, 0, -1, 0), (1, 0, -1, 0), (-1, 0, 1, 0)]
VARS_U = [var('a', '1..3'), var('sg', '0..1'), var('ux', 'eval:(2*sg-1)*a'), var('uy', '-3..3'),
          var('vx', '0'), var('vy', '0')]
CONDS_U = ['uy!=0', 'abs(ux)!=abs(uy)']
FIG_EGAL = quadrillage(
    'Quadrillage : le vecteur u et quatre vecteurs CD, EF, GH et KL, de même longueur.',
    vecteur_libre('u⃗', BASE_U, 'ux', 'uy') + candidats_dsl())
EGAUX = ('Deux vecteurs sont **égaux** quand ils ont la même direction, le même sens et la même'
         ' longueur : ils font le même déplacement sur le quadrillage.')

V_EGAL = variation(
    'Lequel de ces vecteurs est égal au vecteur $' + U + '$ ?' + FIG_EGAL
    + choix(['$' + nom_de_sorte(k) + '$' for k in range(4)]),
    VARS_U + vars_cases(SORTES_EGAL), ['0'],
    [EGAUX, deplacement(U, 'ux', 'uy') + '.',
     'Seul $' + nom_de_sorte(0) + '$ fait le même déplacement : $' + U + ' = '
     + col(nom_de_sorte(0)) + '$.',
     '$' + nom_de_sorte(1) + '$ a la même direction et la même longueur, mais pas le même sens :'
     ' c\'est l\'**opposé** de $' + U + '$.'],
    CONDS_U)

V_OPPOSE = variation(
    'Lequel de ces vecteurs est l\'opposé du vecteur $' + U + '$ ?' + FIG_EGAL
    + choix(['$' + nom_de_sorte(k) + '$' for k in [1, 0, 2, 3]]),
    VARS_U + vars_cases(SORTES_EGAL), ['0'],
    ['L\'**opposé** de $' + U + '$, noté $-' + U + '$, a la même direction et la même longueur'
     ' que $' + U + '$, mais le sens contraire.',
     deplacement(U, 'ux', 'uy') + ' : son opposé fait le déplacement inverse.',
     '$-' + U + ' = ' + col(nom_de_sorte(1)) + '$.'],
    CONDS_U)

# Parallélogramme ABCD : vecteur demandé, puis choix (juste en premier)
PARA = [('AB', ['DC', 'CD', 'AD', 'BC']), ('AD', ['BC', 'CB', 'AB', 'DC']),
        ('BA', ['CD', 'DC', 'BC', 'AD']), ('CB', ['DA', 'AD', 'AB', 'DC'])]
FIG_PARA = ('\n\n```figure\nfenetre: 0 ; 10 ; 0 ; 6\ndescription: Parallélogramme ABCD.\n---\n'
            'A = point(1, 1, etiquette="bas-gauche")\nB = point(6, 1, etiquette="bas-droite")\n'
            'C = point(8.5, 5, etiquette="haut-droite")\nD = point(3.5, 5, etiquette="haut-gauche")\n'
            'polygone(A, B, C, D)\n```')

V_PARA = variation(
    '$ABCD$ est un parallélogramme. Quel vecteur est égal au vecteur $'
    + vec(selon('q', [t[0] for t in PARA])) + '$ ?' + FIG_PARA
    + choix(['$' + vec(selon('q', [t[1][j] for t in PARA])) + '$' for j in range(4)]),
    [var('q', '0..3')], ['0'],
    ['$ABCD$ est un parallélogramme : $' + vec('AB') + ' = ' + vec('DC') + '$ et $' + vec('AD')
     + ' = ' + vec('BC') + '$ (côtés opposés parallèles, de même longueur, parcourus dans le même'
     ' sens).',
     '$' + vec(selon('q', [t[0] for t in PARA])) + ' = '
     + col(vec(selon('q', [t[1][0] for t in PARA]))) + '$.',
     'Attention à l\'ordre des lettres : $' + vec(selon('q', [t[1][1] for t in PARA]))
     + '$ est l\'opposé.']
)

V_NUL = variation(
    'On sait que $' + vec('AB') + ' = \\vec{0}$. Que peut-on dire des points $A$ et $B$ ?'
    + choix(['$A$ et $B$ sont confondus.', '$A$ et $B$ sont à $1$ unité l\'un de l\'autre.',
             'La droite $(AB)$ est horizontale.', 'On ne peut rien dire.']),
    [], ['0'],
    ['Le **vecteur nul** $\\vec{0}$ est le vecteur de longueur $0$ : il ne déplace aucun point.',
     '$' + vec('AB') + ' = \\vec{0}$ signifie que $AB = 0$ : ' + col('\\text{A et B sont confondus}')
     + '.'])

MODELES.append(modele(
    '01-vecteurs-egaux-opposes', 'Vecteurs égaux, opposés, nul',
    'Reconnaître sur un quadrillage un vecteur égal ou opposé à un vecteur donné ; égalités de'
    ' vecteurs dans un parallélogramme ; vecteur nul',
    'Géométrie', 'Vecteurs', 'Égalité', 1,
    [V_EGAL, V_OPPOSE, V_PARA, V_NUL],
    [spec('Égal : bonne case', 0, vars_spec_cases(SORTES_EGAL, 2, (2, -3)) | {'a': 2, 'sg': 1},
          '0', 'correct'),
     spec('Erreur : l\'opposé', 0, vars_spec_cases(SORTES_EGAL, 2, (2, -3)) | {'a': 2, 'sg': 1},
          '1', 'incorrect'),
     spec('Erreur : même longueur, autre direction', 0,
          vars_spec_cases(SORTES_EGAL, 2, (2, -3)) | {'a': 2, 'sg': 1}, '2', 'incorrect'),
     spec('Opposé : bonne case', 1, vars_spec_cases(SORTES_EGAL, 1, (-3, 1)) | {'a': 3, 'sg': 0},
          '0', 'correct'),
     spec('Erreur : le vecteur égal', 1,
          vars_spec_cases(SORTES_EGAL, 1, (-3, 1)) | {'a': 3, 'sg': 0}, '1', 'incorrect'),
     spec('AB = DC', 2, {'q': 0}, '0', 'correct'),
     spec('Erreur : CD (lettres inversées)', 2, {'q': 0}, '1', 'incorrect'),
     spec('CB = DA', 2, {'q': 3}, '0', 'correct'),
     spec('Vecteur nul : A et B confondus', 3, {}, '0', 'correct'),
     spec('Erreur : on ne peut rien dire', 3, {}, '3', 'incorrect')]))

# --- 2. 3-026 : somme de deux vecteurs ---------------------------------------------------------

# Image de A par la translation de vecteur u, puis celle de vecteur v : quatre points nommés.
# Sortes (coefficients de u et v) : u + v (juste), u − v, −u + v, u seul.
SORTES_POINT = [(1, 1), (1, -1), (-1, 1), (1, 0)]
NOMS_POINTS = ['M', 'N', 'P', 'R']
LARG_P, HAUT_P = 25, 14


def nom_point(k):
    return selon('p', [NOMS_POINTS[(k + q) % 4] for q in range(4)])


def vars_points():
    vs = [var('p', '0..3')]
    for s in range(4):
        k = 'k' + str(s)
        vs.append(var(k, selon('p', [str((s - q) % 4) for q in range(4)])))
        vs.append(var('cu' + str(s), selon(k, [str(t[0]) for t in SORTES_POINT])))
        vs.append(var('cv' + str(s), selon(k, [str(t[1]) for t in SORTES_POINT])))
        vs.append(var('x' + str(s), 'eval:ax+cu' + str(s) + '*ux+cv' + str(s) + '*vx'))
        vs.append(var('y' + str(s), 'eval:ay+cu' + str(s) + '*uy+cv' + str(s) + '*vy'))
    return vs


VARS_UV = [var('ux', '-3..3'), var('uy', '-3..3'), var('vx', '-3..3'), var('vy', '-3..3'),
           var('ax', '14..18'), var('ay', '5..9')]
CONDS_UV = ['ux*ux+uy*uy>=2', 'vx*vx+vy*vy>=2', 'ux*vy-uy*vx!=0']
CONDS_POINTS = []
for s in range(4):
    xs, ys = 'x' + str(s), 'y' + str(s)
    CONDS_POINTS += [xs + '>=9', xs + '<=24', ys + '>=1', ys + '<=13']
for s in range(4):
    for t in range(s + 1, 4):
        CONDS_POINTS.append('abs(x' + str(s) + '-x' + str(t) + ')+abs(y' + str(s) + '-y' + str(t)
                            + ')>=2')
# Pas de point sur A ni collé à lui (u − v ≠ 0 grâce à la non-colinéarité)

FIG_POINTS = quadrillage(
    'Quadrillage : les vecteurs u et v, le point A et quatre points M, N, P et R.',
    vecteur_libre('u⃗', (4, 10), 'ux', 'uy') + vecteur_libre('v⃗', (4, 4), 'vx', 'vy')
    + 'A = point({{ax}}, {{ay}}, etiquette="bas")\n'
    + ''.join(n + ' = point(' + ev('x' + str(s)) + ', ' + ev('y' + str(s)) + ', etiquette="haut")\n'
              for s, n in enumerate(NOMS_POINTS)),
    LARG_P, HAUT_P)

V_IMAGE = variation(
    'On applique au point $A$ la translation de vecteur $' + U + '$, puis la translation de'
    ' vecteur $' + V + '$. Quel point obtient-on ?' + FIG_POINTS
    + choix(['le point $' + nom_point(k) + '$' for k in range(4)]),
    VARS_UV + vars_points(), ['0'],
    ['Enchaîner la translation de vecteur $' + U + '$ et celle de vecteur $' + V + '$, c\'est'
     ' appliquer la translation de vecteur $' + U + ' + ' + V + '$.',
     'Depuis $A$ : ' + deplacement(U, 'ux', 'uy') + ', puis ' + deplacement(V, 'vx', 'vy') + '.',
     'On arrive au point ' + col(nom_point(0)) + '.'],
    CONDS_UV + CONDS_POINTS + ['ax+ux>=9', 'ax+ux<=24', 'ay+uy>=1', 'ay+uy<=13'])

# Quel vecteur est u + v : sortes u + v, u − v, −u + v, −u − v (dans les cases de 3-025)
SORTES_SOMME = [(1, 1, 1, 1), (1, -1, 1, -1), (-1, 1, -1, 1), (-1, -1, -1, -1)]
VARS_UV_PETITS = [var('ux', '-3..3'), var('uy', '-3..3'), var('vx', '-3..3'), var('vy', '-3..3')]
CONDS_PETITS = CONDS_UV + ['abs(ux+vx)<=3', 'abs(uy+vy)<=3', 'abs(ux-vx)<=3', 'abs(uy-vy)<=3',
                           'uy+vy!=0', 'uy-vy!=0']
LARG_S = 22
FIG_SOMME = quadrillage(
    'Quadrillage : les vecteurs u et v et quatre vecteurs CD, EF, GH et KL.',
    vecteur_libre('u⃗', (4, 11), 'ux', 'uy') + vecteur_libre('v⃗', (4, 4), 'vx', 'vy')
    + candidats_dsl(), LARG_S, HAUT)

V_SOMME = variation(
    'Lequel de ces vecteurs est égal à $' + U + ' + ' + V + '$ ?' + FIG_SOMME
    + choix(['$' + nom_de_sorte(k) + '$' for k in range(4)]),
    VARS_UV_PETITS + vars_cases(SORTES_SOMME), ['0'],
    ['$' + U + ' + ' + V + '$ est le vecteur de la translation qui enchaîne celle de vecteur $'
     + U + '$ et celle de vecteur $' + V + '$ : on met les deux déplacements bout à bout.',
     deplacement(U, 'ux', 'uy') + ' ; ' + deplacement(V, 'vx', 'vy') + '.',
     'Bout à bout : ' + deplacement(U + ' + ' + V, '(ux+vx)', '(uy+vy)') + ', comme $'
     + col(nom_de_sorte(0)) + '$.'],
    CONDS_PETITS + ['ux+vx!=0'])

CHAINES = [('A', 'B', 'C'), ('M', 'N', 'P'), ('E', 'F', 'G'), ('R', 'S', 'T')]


def lettre(j):
    return selon('j', [c[j] for c in CHAINES])


X1, X2, X3 = lettre(0), lettre(1), lettre(2)
V_ENCHAINER = variation(
    'On applique la translation de vecteur $' + vec(X1 + X2) + '$, puis la translation de'
    ' vecteur $' + vec(X2 + X3) + '$. Par quelle translation unique peut-on les remplacer ?'
    + choix(['la translation de vecteur $' + vec(X1 + X3) + '$',
             'la translation de vecteur $' + vec(X3 + X1) + '$',
             'la translation de vecteur $' + vec(X2 + X2) + '$',
             'la translation de vecteur $' + vec(X1 + X2) + '$']),
    [var('j', '0..3')], ['0'],
    ['La première translation envoie $' + X1 + '$ sur $' + X2 + '$, la seconde envoie $' + X2
     + '$ sur $' + X3 + '$.',
     'Les deux enchaînées envoient $' + X1 + '$ sur $' + X3 + '$ : c\'est la translation de'
     ' vecteur $' + col(vec(X1 + X3)) + '$, et $' + vec(X1 + X2) + ' + ' + vec(X2 + X3) + ' = '
     + vec(X1 + X3) + '$.'])

S_IMG = {'ux': 2, 'uy': 1, 'vx': 1, 'vy': -3, 'ax': 15, 'ay': 7, 'p': 1}
for _s in range(4):
    _k = (_s - 1 + 4) % 4
    cu, cv = SORTES_POINT[_k]
    S_IMG |= {'k' + str(_s): _k, 'cu' + str(_s): cu, 'cv' + str(_s): cv,
              'x' + str(_s): 15 + cu * 2 + cv * 1, 'y' + str(_s): 7 + cu * 1 + cv * -3}

MODELES.append(modele(
    '02-somme-de-vecteurs', 'Somme de deux vecteurs',
    'Construire la somme de deux vecteurs en enchaînant deux translations, sur un quadrillage',
    'Géométrie', 'Vecteurs', 'Somme', 1,
    [V_IMAGE, V_SOMME, V_ENCHAINER],
    [spec('Image par u puis v', 0, S_IMG, '0', 'correct'),
     spec('Erreur : u − v', 0, S_IMG, '1', 'incorrect'),
     spec('Erreur : u seul', 0, S_IMG, '3', 'incorrect'),
     spec('u + v : bonne case', 1, vars_spec_cases(SORTES_SOMME, 3, (1, 2), (2, -1)), '0',
          'correct'),
     spec('Erreur : u − v', 1, vars_spec_cases(SORTES_SOMME, 3, (1, 2), (2, -1)), '1',
          'incorrect'),
     spec('AB puis BC : AC', 2, {'j': 0}, '0', 'correct'),
     spec('Erreur : CA', 2, {'j': 0}, '1', 'incorrect')]))

# --- 3. 3-027 : relation de Chasles ------------------------------------------------------------

QUATRE = [('A', 'B', 'C', 'D'), ('M', 'N', 'P', 'Q'), ('E', 'F', 'G', 'H'), ('R', 'S', 'T', 'U')]


def l4(j):
    return selon('j', [c[j] for c in QUATRE])


L1, L2, L3, L4 = l4(0), l4(1), l4(2), l4(3)
CHASLES = ('**Relation de Chasles** : pour tous points $X$, $Y$, $Z$, $' + vec('XY') + ' + '
           + vec('YZ') + ' = ' + vec('XZ') + '$ (l\'extrémité du premier est l\'origine du'
           ' second).')
VARS_J = [var('j', '0..3')]

V_DEUX = variation(
    'Simplifie : $' + vec(L1 + L2) + ' + ' + vec(L2 + L3) + '$.'
    + choix(['$' + vec(L1 + L3) + '$', '$' + vec(L3 + L1) + '$', '$' + vec(L2 + L2) + '$',
             '$' + vec(L1 + L2) + '$']),
    VARS_J, ['0'],
    [CHASLES, '$' + vec(L1 + L2) + ' + ' + vec(L2 + L3) + ' = ' + col(vec(L1 + L3)) + '$.'])

V_TROIS = variation(
    'Simplifie : $' + vec(L1 + L2) + ' + ' + vec(L2 + L3) + ' + ' + vec(L3 + L4) + '$.'
    + choix(['$' + vec(L1 + L4) + '$', '$' + vec(L4 + L1) + '$', '$' + vec(L1 + L3) + '$',
             '$' + vec(L2 + L4) + '$']),
    VARS_J, ['0'],
    [CHASLES, '$' + vec(L1 + L2) + ' + ' + vec(L2 + L3) + ' = ' + vec(L1 + L3) + '$, donc la'
     ' somme vaut $' + vec(L1 + L3) + ' + ' + vec(L3 + L4) + ' = ' + col(vec(L1 + L4)) + '$.'])

V_RETOUR = variation(
    'Simplifie : $' + vec(L1 + L2) + ' + ' + vec(L2 + L1) + '$.'
    + choix(['$\\vec{0}$', '$2\\,' + vec(L1 + L2) + '$', '$' + vec(L1 + L2) + '$',
             '$' + vec(L2 + L1) + '$']),
    VARS_J, ['0'],
    [CHASLES, '$' + vec(L1 + L2) + ' + ' + vec(L2 + L1) + ' = ' + vec(L1 + L1) + ' = '
     + col('\\vec{0}') + '$ : aller de $' + L1 + '$ à $' + L2 + '$ puis revenir, c\'est ne pas'
     ' bouger. $' + vec(L2 + L1) + '$ est l\'opposé de $' + vec(L1 + L2) + '$.'])

V_DESORDRE = variation(
    'Simplifie : $' + vec(L2 + L3) + ' + ' + vec(L1 + L2) + '$.'
    + choix(['$' + vec(L1 + L3) + '$', '$' + vec(L3 + L1) + '$', '$' + vec(L2 + L2) + '$',
             '$' + vec(L2 + L3) + '$']),
    VARS_J, ['0'],
    ['On peut changer l\'ordre des termes d\'une somme : $' + vec(L2 + L3) + ' + ' + vec(L1 + L2)
     + ' = ' + vec(L1 + L2) + ' + ' + vec(L2 + L3) + '$.',
     CHASLES, 'Donc la somme vaut $' + col(vec(L1 + L3)) + '$.'])

MODELES.append(modele(
    '03-relation-de-chasles', 'Relation de Chasles',
    'Simplifier une somme de vecteurs avec la relation de Chasles (deux ou trois termes, aller et'
    ' retour, termes dans le désordre)',
    'Géométrie', 'Vecteurs', 'Chasles', 1,
    [V_DEUX, V_TROIS, V_RETOUR, V_DESORDRE],
    [spec('AB + BC = AC', 0, {'j': 0}, '0', 'correct'),
     spec('Erreur : CA', 0, {'j': 0}, '1', 'incorrect'),
     spec('MN + NP + PQ = MQ', 1, {'j': 1}, '0', 'correct'),
     spec('Erreur : MP (un terme oublié)', 1, {'j': 1}, '2', 'incorrect'),
     spec('EF + FE = 0', 2, {'j': 2}, '0', 'correct'),
     spec('Erreur : 2 EF', 2, {'j': 2}, '1', 'incorrect'),
     spec('ST + RS = RT', 3, {'j': 3}, '0', 'correct'),
     spec('Erreur : TR', 3, {'j': 3}, '1', 'incorrect')]))

# --- 4. 3-018 : boule ou sphère ----------------------------------------------------------------

SUR = 'sur la sphère'
DEDANS = 'à l\'intérieur de la boule, mais pas sur la sphère'
DEHORS = 'à l\'extérieur de la boule'
SPHERE = ('La **sphère** de centre $O$ et de rayon $r$ est formée des points $M$ de l\'espace tels'
          ' que $OM = r$ ; la **boule** de centre $O$ et de rayon $r$, des points tels que'
          ' $OM \\leqslant r$ (la sphère et son intérieur).')

V_POSITION = variation(
    'Une sphère a pour centre $O$ et pour rayon ${{r}}' + CM + '$. Un point $M$ de l\'espace est'
    ' tel que $OM = {{d}}' + CM + '$. Où se trouve le point $M$ ?'
    + choix([selon('t', [DEDANS, SUR, DEHORS]), selon('t', [SUR, DEDANS, DEDANS]),
             selon('t', [DEHORS, DEHORS, SUR])]),
    [var('r', '3..9'), var('k', '1..2'), var('t', '0..2'),
     var('d', 'eval:r+(t-1)*k')], ['0'],
    [SPHERE,
     'Ici $OM = {{d}}' + CM + '$ et $r = {{r}}' + CM + '$ : $OM '
     + selon('t', ['<', '=', '>']) + ' r$, donc $M$ est ' + col('\\text{' + selon('t', [
         'à l\'intérieur de la boule', 'sur la sphère', 'à l\'extérieur de la boule']) + '}')
     + '.'])

BOULE_O = 'la boule de centre $O$ et de rayon $r$'
SPHERE_O = 'la sphère de centre $O$ et de rayon $r$'
V_DEFINITION = variation(
    '$O$ est un point de l\'espace et $r$ un nombre positif. L\'ensemble des points $M$ de'
    ' l\'espace tels que $OM ' + selon('w', ['=', '\\leqslant']) + ' r$ est :'
    + choix([selon('w', [SPHERE_O, BOULE_O]), selon('w', [BOULE_O, SPHERE_O]),
             'le cercle de centre $O$ et de rayon $r$',
             'le disque de centre $O$ et de rayon $r$']),
    [var('w', '0..1')], ['0'],
    [SPHERE,
     'Dans l\'espace, $OM ' + selon('w', ['=', '\\leqslant']) + ' r$ décrit '
     + col('\\text{' + selon('w', ['la sphère', 'la boule']) + '}') + ' ; le cercle et le'
     ' disque sont des figures **planes**.'])

MODELES.append(modele(
    '04-boule-ou-sphere', 'Boule ou sphère ?',
    'Connaître la définition de la sphère (OM = r) et de la boule (OM ⩽ r) ; situer un point par'
    ' rapport à une sphère',
    'Géométrie', 'Solides', 'Sphère et boule', 1,
    [V_POSITION, V_DEFINITION],
    [spec('OM = 3 < 5 : à l\'intérieur', 0, {'r': 5, 'k': 2, 't': 0, 'd': 3}, '0', 'correct'),
     spec('Erreur : sur la sphère', 0, {'r': 5, 'k': 2, 't': 0, 'd': 3}, '1', 'incorrect'),
     spec('OM = r : sur la sphère', 0, {'r': 7, 'k': 1, 't': 1, 'd': 7}, '0', 'correct'),
     spec('OM > r : à l\'extérieur', 0, {'r': 4, 'k': 1, 't': 2, 'd': 5}, '0', 'correct'),
     spec('OM = r : la sphère', 1, {'w': 0}, '0', 'correct'),
     spec('Erreur : la boule', 1, {'w': 0}, '1', 'incorrect'),
     spec('Erreur : le cercle', 1, {'w': 0}, '2', 'incorrect'),
     spec('OM ⩽ r : la boule', 1, {'w': 1}, '0', 'correct')]))

# --- 5. 3-019 : grands cercles et diamètre -----------------------------------------------------

V_DIAMETRE = variation(
    'Une sphère a pour ' + selon('w', ['rayon', 'diamètre']) + ' $' + selon('w', ['{{r}}', '{{d}}'])
    + CM + '$. Quel est son ' + selon('w', ['diamètre', 'rayon']) + ' ?\n\n$?' + CM + '$',
    [var('r', '2..15'), var('d', 'eval:2*r'), var('w', '0..1')], [selon('w', ['{{d}}', '{{r}}'])],
    ['Un **diamètre** de la sphère est un segment qui joint deux de ses points en passant par le'
     ' centre : sa longueur est le double du rayon.',
     selon('w', ['Diamètre : $2 \\times {{r}} = ' + col('{{d}}' + CM) + '$.',
                 'Rayon : ${{d}} \\div 2 = ' + col('{{r}}' + CM) + '$.'])])

V_GRAND_CERCLE = variation(
    'Une boule de centre $O$ et de rayon ${{r}}' + CM + '$ est coupée par un plan qui passe par'
    ' son centre. Quel est le rayon du cercle obtenu ?\n\n```solide\nforme: boule 3\nsommets: O\n'
    'section: 0\n```\n\n$?' + CM + '$',
    [var('r', '2..12')], ['{{r}}'],
    ['Un plan qui passe par le centre de la sphère la coupe suivant un **grand cercle** : même'
     ' centre et même rayon que la sphère.',
     'Son rayon est donc ' + col('{{r}}' + CM) + '.'])

V_TERRE = variation(
    'On assimile la Terre à une sphère. Parmi ces cercles tracés sur sa surface, lesquels sont des'
    ' **grands cercles** ? Coche toutes les bonnes réponses.'
    + choix(['l\'équateur', 'un cercle qui passe par les deux pôles',
             'le parallèle de latitude $45^{\\circ}$ Nord', 'le cercle polaire arctique'],
            plusieurs=True),
    [], ['0;1'],
    ['Un **grand cercle** est un cercle de la sphère dont le centre est celui de la sphère : son'
     ' plan passe par le centre de la Terre.',
     'C\'est le cas de ' + col('\\text{l\'équateur}') + ' et d\'' + col(
         '\\text{un cercle qui passe par les deux pôles}') + ' (deux méridiens opposés).',
     'Les autres parallèles (le $45^{\\circ}$ Nord, le cercle polaire) ont leur centre sur l\'axe'
     ' des pôles, hors du centre : leur rayon est plus petit.'])

MODELES.append(modele(
    '05-grands-cercles-diametre', 'Grands cercles et diamètre d\'une sphère',
    'Relier rayon et diamètre d\'une sphère ; reconnaître un grand cercle (section par un plan'
    ' passant par le centre, équateur et méridiens)',
    'Géométrie', 'Solides', 'Grands cercles', 1,
    [V_DIAMETRE, V_GRAND_CERCLE, V_TERRE],
    [spec('Rayon 7 : diamètre 14', 0, {'r': 7, 'd': 14, 'w': 0}, '14', 'correct'),
     spec('Erreur : 3,5 (divisé)', 0, {'r': 7, 'd': 14, 'w': 0}, '3{,}5', 'incorrect'),
     spec('Diamètre 18 : rayon 9', 0, {'r': 9, 'd': 18, 'w': 1}, '9', 'correct'),
     spec('Erreur : 36 (doublé)', 0, {'r': 9, 'd': 18, 'w': 1}, '36', 'incorrect'),
     spec('Grand cercle : rayon 5', 1, {'r': 5}, '5', 'correct'),
     spec('Erreur : 10 (le diamètre)', 1, {'r': 5}, '10', 'incorrect'),
     spec('Équateur et méridiens', 2, {}, '0;1', 'correct'),
     spec('Erreur : le parallèle en plus', 2, {}, '0;1;2', 'incorrect'),
     spec('Incomplet : l\'équateur seul', 2, {}, '0', 'unoptimal_form')]))

# --- 6. 3-021 : volume d'une boule -------------------------------------------------------------

FORMULE_BOULE = ('**Volume d\'une boule** de rayon $r$ : $V = \\dfrac{4}{3} \\pi r^3$ (formule'
                 ' admise).')
PRODUITS_LIBRES = {'constraints': {'products': 'off'}}

V_EXACT = variation(
    'Donne la valeur **exacte** du volume d\'une boule de rayon ${{r}}' + CM + '$ (en fonction de'
    ' $\\pi$).\n\n$?' + CM3 + '$',
    [var('r', '3..9')], [ev('4*r^3/3') + '\\pi'],
    [FORMULE_BOULE,
     '$V = \\dfrac{4}{3} \\times \\pi \\times {{r}}^3 = \\dfrac{4 \\times ' + ev('r^3')
     + '}{3}\\pi = ' + col(ev('4*r^3/3') + '\\pi' + CM3) + '$.'],
    ['r%3==0'])

V_FRACTION = variation(
    'Donne la valeur **exacte** du volume d\'une boule de rayon ${{r}}' + CM + '$ (en fonction de'
    ' $\\pi$).\n\n$?' + CM3 + '$',
    [var('r', '1..8')], ['\\dfrac{' + ev('4*r^3') + '}{3}\\pi'],
    [FORMULE_BOULE,
     '$V = \\dfrac{4}{3} \\times \\pi \\times {{r}}^3 = \\dfrac{4 \\times ' + ev('r^3')
     + '}{3}\\pi = ' + col('\\dfrac{' + ev('4*r^3') + '}{3}\\pi' + CM3) + '$.',
     '$' + ev('4*r^3') + '$ n\'est pas divisible par $3$ : la fraction reste écrite.'],
    ['r%3!=0'])

V_ARRONDI = variation(
    'Un ballon a la forme d\'une boule de rayon ${{r}}' + CM + '$. Calcule son volume, arrondi au'
    ' $\\unit{cm^3}$.\n\n$V \\approx ?' + CM3 + '$',
    [var('r', '4..15')], [ev('round(4*\\pi*r^3/3);d')],
    [FORMULE_BOULE,
     '$V = \\dfrac{4}{3} \\times \\pi \\times {{r}}^3 \\approx '
     + col(ev('round(4*\\pi*r^3/3);d') + CM3) + '$ (à la calculatrice, arrondi à l\'unité).'],
    ['abs(4*\\pi*r^3/3 - round(4*\\pi*r^3/3)) < 0.4'])

V_DIAM_DONNE = variation(
    'Donne la valeur **exacte** du volume d\'une boule de diamètre ${{d}}' + CM + '$ (en fonction'
    ' de $\\pi$).\n\n$?' + CM3 + '$',
    [var('r', '3..9'), var('d', 'eval:2*r')], [ev('4*r^3/3') + '\\pi'],
    ['Le rayon est la moitié du diamètre : $r = {{d}} \\div 2 = {{r}}' + CM + '$.',
     FORMULE_BOULE,
     '$V = \\dfrac{4}{3} \\times \\pi \\times {{r}}^3 = ' + col(ev('4*r^3/3') + '\\pi' + CM3)
     + '$.'],
    ['r%3==0'])

V_DEMI = variation(
    'Un bol a la forme d\'une demi-boule de rayon ${{r}}' + CM + '$. Donne la valeur **exacte** de'
    ' son volume (en fonction de $\\pi$).\n\n$?' + CM3 + '$',
    [var('r', '3..9')], [ev('2*r^3/3') + '\\pi'],
    [FORMULE_BOULE,
     'Boule entière : $\\dfrac{4}{3} \\times \\pi \\times {{r}}^3 = ' + ev('4*r^3/3') + '\\pi'
     + CM3 + '$.',
     'Demi-boule : $' + ev('4*r^3/3') + '\\pi \\div 2 = ' + col(ev('2*r^3/3') + '\\pi' + CM3)
     + '$.'],
    ['r%3==0'])

MODELES.append(modele(
    '06-volume-boule', 'Volume d\'une boule',
    'Calculer le volume d\'une boule avec V = 4/3 π r³ : valeur exacte en fonction de π, valeur'
    ' arrondie, à partir du diamètre, demi-boule',
    'Grandeurs', 'Volumes', 'Volume d\'une boule', 1,
    [V_EXACT, V_FRACTION, V_ARRONDI, V_DIAM_DONNE, V_DEMI],
    [spec('Rayon 3 : 36π', 0, {'r': 3}, '36\\pi', 'correct'),
     spec('36 × π accepté', 0, {'r': 3}, '36\\times\\pi', 'correct'),
     spec('Erreur : 4/3 π r² = 12π', 0, {'r': 3}, '12\\pi', 'incorrect'),
     spec('Erreur : π r³ = 27π', 0, {'r': 3}, '27\\pi', 'incorrect'),
     spec('Rayon 2 : 32/3 π', 1, {'r': 2}, '\\frac{32}{3}\\pi', 'correct'),
     spec('32π/3 accepté', 1, {'r': 2}, '\\frac{32\\pi}{3}', 'correct'),
     spec('Erreur : 16/3 π (r²)', 1, {'r': 2}, '\\frac{16}{3}\\pi', 'incorrect'),
     spec('Rayon 10 : 4 189', 2, {'r': 10}, '4189', 'correct'),
     spec('Erreur : 4 188 (troncature)', 2, {'r': 10}, '4188', 'incorrect'),
     spec('Erreur : 419 (r²)', 2, {'r': 10}, '419', 'incorrect'),
     spec('Diamètre 12 : 288π', 3, {'r': 6, 'd': 12}, '288\\pi', 'correct'),
     spec('Erreur : le diamètre pris pour rayon (2 304π)', 3, {'r': 6, 'd': 12}, '2304\\pi',
          'incorrect'),
     spec('Demi-boule de rayon 3 : 18π', 4, {'r': 3}, '18\\pi', 'correct'),
     spec('Erreur : la boule entière', 4, {'r': 3}, '36\\pi', 'incorrect')],
    delay=90, options=PRODUITS_LIBRES))

# --- 7. 3-020 : sections de solides ------------------------------------------------------------

V_PAVE = variation(
    'Le pavé droit $ABCDEFGH$ ci-dessous ($AB = {{l}}' + CM + '$, $BC = {{p}}' + CM + '$,'
    ' $AE = {{h}}' + CM + '$) est coupé par un plan parallèle à la face $EFGH$. Quelle est la'
    ' section ?\n\n```solide\nforme: pave {{l}} {{p}} {{h}}\nsommets: A B C D E F G H\n'
    'section: parallele dessus {{k}}\n```'
    + choix(['un rectangle de ${{l}}' + CM + '$ sur ${{p}}' + CM + '$',
             'un rectangle de ${{l}}' + CM + '$ sur ${{h}}' + CM + '$',
             'un rectangle de ${{p}}' + CM + '$ sur ${{h}}' + CM + '$',
             'un triangle']),
    [var('l', '3..8'), var('p', '2..6'), var('h', '3..7'), var('k', '1..2')], ['0'],
    ['La section d\'un pavé droit par un plan parallèle à une face est un **rectangle** de mêmes'
     ' dimensions que cette face.',
     'La face $EFGH$ mesure $EF = AB = {{l}}' + CM + '$ sur $FG = BC = {{p}}' + CM + '$ : la'
     ' section est ' + col('\\text{un rectangle de {{l}} cm sur {{p}} cm}') + '.'],
    ['l!=p', 'l!=h', 'p!=h', 'k<h'])

DISQUE = 'un disque de rayon ${{r}}' + CM + '$, comme la base'
V_CYL_PERP = variation(
    'Un cylindre de révolution de rayon ${{r}}' + CM + '$ et de hauteur ${{h}}' + CM + '$ est'
    ' coupé par un plan perpendiculaire à son axe. Quelle est la section ?\n\n```solide\n'
    'forme: cylindre {{r}} {{h}}\nsommets: O O\'\nsection: perpendiculaire {{k}}\n```'
    + choix([DISQUE, 'une ellipse', 'un rectangle',
             'un disque plus petit que la base']),
    [var('r', '2..5'), var('h', '4..9'), var('k', '1..3')], ['0'],
    ['La section d\'un cylindre de révolution par un plan **perpendiculaire à son axe** est un'
     ' disque de même rayon que la base : ' + col('\\text{un disque de rayon {{r}} cm}') + '.',
     'Sur le dessin en perspective, ce disque est **vu** comme une ellipse, mais c\'est bien un'
     ' disque.'],
    ['k<h', 'r!=h'])

V_CYL_PARA = variation(
    'Un cylindre de révolution de rayon ${{r}}' + CM + '$ et de hauteur ${{h}}' + CM + '$ est'
    ' coupé par un plan parallèle à son axe. Quelle est la section ?\n\n```solide\n'
    'forme: cylindre {{r}} {{h}}\nsommets: O O\'\nsection: parallele {{k}}\n```'
    + choix(['un rectangle dont un côté mesure ${{h}}' + CM + '$ (la hauteur)',
             'un disque de rayon ${{r}}' + CM + '$', 'une ellipse',
             'un carré de côté ${{r}}' + CM + '$']),
    [var('r', '3..6'), var('h', '4..9'), var('k', '1..2')], ['0'],
    ['La section d\'un cylindre de révolution par un plan **parallèle à son axe** est un'
     ' rectangle.',
     'Deux de ses côtés sont des génératrices du cylindre : ils mesurent la hauteur. C\'est '
     + col('\\text{un rectangle dont un côté mesure {{h}} cm}') + '.'],
    ['k<r', 'r!=h'])

TRIPLETS = [(5, 3, 4), (5, 4, 3), (10, 6, 8), (10, 8, 6), (13, 5, 12), (13, 12, 5), (15, 9, 12),
            (17, 8, 15)]
V_BOULE = variation(
    'Une boule de centre $O$ et de rayon ${{R}}' + CM + '$ est coupée par un plan situé à ${{d}}'
    + CM + '$ de son centre. La section est un disque : quel est son rayon ?\n\n```solide\n'
    'forme: boule {{R}}\nsommets: O\nsection: {{d}}\n```\n\n$?' + CM + '$',
    [var('t', '0..7'), var('R', selon('t', [str(x[0]) for x in TRIPLETS])),
     var('d', selon('t', [str(x[1]) for x in TRIPLETS])),
     var('rho', selon('t', [str(x[2]) for x in TRIPLETS]))], ['{{rho}}'],
    ['On note $H$ le centre de la section et $M$ un point de son bord : $OH = {{d}}' + CM
     + '$ et $OM = {{R}}' + CM + '$ (rayon de la boule). Le triangle $OHM$ est rectangle en $H$.',
     'Théorème de Pythagore : $HM^2 = OM^2 - OH^2 = {{R}}^2 - {{d}}^2 = ' + ev('R^2-d^2') + '$.',
     'Donc $HM = \\sqrt{' + ev('R^2-d^2') + '} = ' + col('{{rho}}' + CM) + '$.'])

MODELES.append(modele(
    '07-sections-solides', 'Sections de solides',
    'Reconnaître la section d\'un pavé (parallèle à une face), d\'un cylindre (parallèle ou'
    ' perpendiculaire à l\'axe) ; rayon de la section d\'une boule par Pythagore',
    'Géométrie', 'Solides', 'Sections', 1,
    [V_PAVE, V_CYL_PERP, V_CYL_PARA, V_BOULE],
    [spec('Pavé : rectangle l × p', 0, {'l': 6, 'p': 4, 'h': 5, 'k': 2}, '0', 'correct'),
     spec('Erreur : l × h', 0, {'l': 6, 'p': 4, 'h': 5, 'k': 2}, '1', 'incorrect'),
     spec('Cylindre ⊥ : disque', 1, {'r': 3, 'h': 7, 'k': 2}, '0', 'correct'),
     spec('Erreur : une ellipse (le dessin)', 1, {'r': 3, 'h': 7, 'k': 2}, '1', 'incorrect'),
     spec('Cylindre ‖ : rectangle', 2, {'r': 4, 'h': 6, 'k': 1}, '0', 'correct'),
     spec('Erreur : un disque', 2, {'r': 4, 'h': 6, 'k': 1}, '1', 'incorrect'),
     spec('R = 5, d = 3 : 4', 3, {'t': 0, 'R': 5, 'd': 3, 'rho': 4}, '4', 'correct'),
     spec('Erreur : le rayon de la boule', 3, {'t': 0, 'R': 5, 'd': 3, 'rho': 4}, '5',
          'incorrect'),
     spec('Erreur : R − d', 3, {'t': 0, 'R': 5, 'd': 3, 'rho': 4}, '2', 'incorrect')]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
