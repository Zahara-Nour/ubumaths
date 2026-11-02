"""Écrit les 4 modèles du lot 6b « plans, représentations paramétriques, équations cartésiennes » de la
terminale spécialité dans scripts/questions/tspe-6b-plans-systemes/.

Phase 0 validée par David le 2026-11-02 (« je valide », recos Q1-Q4, journal
« docs/wip/questions-tspe-espace-progress.md » § « Lot 6b »), un point par modèle :

| # | Point    | Titre                                  | Catégorie, niveau                                                    |
| 1 | TSPE-358 | Lieux géométriques dans l'espace       | Orthogonalité… › Lieux géométriques, 1                               |
| 2 | TSPE-368 | Reconnaître un plan par son équation   | Représentations… › Équation cartésienne d'un plan, 3                 |
| 3 | TSPE-566 | Coordonnées d'un vecteur dans une base | Vecteurs, droites et plans de l'espace › Coplanarité, décomposition, 3 |
| 4 | TSPE-568 | Interpréter les solutions d'un système | Représentations… › Positions relatives, 3                            |

Décisions : niveau `T_SPE` seul ; aucune sous-notion neuve ; repère orthonormé dès qu'il y a
produit scalaire ; réponse en case ou en case choix, jamais les deux. N1 porte sur le LIEU
(d192da3e v2, tagué 367, calcule déjà le `d` du plan médiateur) ; N4 donne le résultat du calcul,
l'élève l'interprète seulement (0808e518 et 3bace561 font le calcul).

Pièges (journal d'index) : signes écrits par `coef()` / `terme()` ; couleur dans `$…$` (`col()`) ;
pas de `|` littéral dans une branche de `{{if:…}}` ; relire les tirages (`question:specs --apercu`).

    python3 docs/wip/questions/lot-tspe-espace-6b.py scripts/questions/tspe-6b-plans-systemes
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]
GEO = 'Géométrie'
VDP = 'Vecteurs, droites et plans de l\'espace'
ORTHO = 'Orthogonalité et distances dans l\'espace'
REP = 'Représentations paramétriques et équations cartésiennes'
RON = 'Dans l\'espace muni d\'un repère orthonormé'


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(nom, title, description, domain, subdomain, level, variations, specs, delay=90):
    return nom, {'title': title, 'description': description, 'grades': ['T_SPE'],
                 'theme': GEO, 'domain': domain, 'subdomain': subdomain,
                 'level': level, 'delay': delay, 'status': 'draft',
                 'shared': {'blankDefaults': {'acceptDecimal': True}},
                 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None, blanks=None):
    v = {'statement': statement,
         'blanks': blanks if blanks is not None else [{'expectedAnswer': a} for a in answers],
         'correction': {'steps': steps}}
    if variables:
        v['variables'] = variables
    if conditions:
        v['conditions'] = conditions
    return v


def col(x):
    return '\\textcolor{{{color:primary.0}}}{ ' + x + ' }'


def choix(*items):
    """Bloc choix, dans l'ordre de la source : la réponse attendue est l'index de l'item."""
    return '```choix\n' + '\n'.join('- ' + i for i in items) + '\n```'


def coef(E, m):
    """Premier terme E·m : 1·m → m, −1·m → −m (E ≠ 0)."""
    return ('{{if:' + E + '==1|' + m + '}}{{if:' + E + '==-1|-' + m + '}}{{if:' + E + '!=1 && ' + E
            + '!=-1|{{eval:' + E + '}}' + m + '}}')


def terme(E, m):
    """Terme suivant, signe écrit : +m, −m, +3m, −3m ; rien si E = 0 ; constante signée si m est vide
    (E ≠ 0)."""
    if m == '':
        return '{{if:' + E + '>0|+}}{{eval:' + E + '}}'
    return ('{{if:' + E + '==1|+' + m + '}}{{if:' + E + '==-1|-' + m + '}}{{if:' + E + '>1|+{{eval:' + E
            + '}}' + m + '}}{{if:' + E + '< -1|{{eval:' + E + '}}' + m + '}}')


def pt(nom, x, y, z):
    return nom + '(' + x + '\\,;\\,' + y + '\\,;\\,' + z + ')'


def vcol(nom, x, y, z):
    return nom + '\\begin{pmatrix}' + x + '\\\\' + y + '\\\\' + z + '\\end{pmatrix}'


def ev(e):
    return '{{eval:' + e + '}}'


def pa(e):
    """Valeur entre parenthèses si négative."""
    return '{{eval:' + e + ';()}}'


def si(cond, texte):
    return '{{if:' + cond + '|' + texte + '}}'


U, V, W, T = '\\vec{u}', '\\vec{v}', '\\vec{w}', '\\vec{t}'
AB_ = '\\overrightarrow{AB}'

MODELES = []

# --- 1. TSPE-358 : lieux géométriques ------------------------------------------------------------
# B = A + 2w, milieu I = A + w (coordonnées entières). p orthogonal à w (construction de eae25eba) :
# M = I + p est sur le plan médiateur ; M = I + p + w ne l'est pas (MA² − MB² = 4 w·w ≠ 0).

VARS_MED = [var('ax', '-3..3'), var('ay', '-3..3'), var('az', '-3..3'), var('w1', '1..2;±'), var('w2', '-2..2'),
            var('w3', '-2..2'), var('bx', '{{eval:ax+2*w1}}'), var('by', '{{eval:ay+2*w2}}'),
            var('bz', '{{eval:az+2*w3}}'), var('ix', '{{eval:ax+w1}}'), var('iy', '{{eval:ay+w2}}'),
            var('iz', '{{eval:az+w3}}')]
DONNE_AB = (RON + ', on considère les points $' + pt('A', '{{ax}}', '{{ay}}', '{{az}}') + '$ et $'
            + pt('B', '{{bx}}', '{{by}}', '{{bz}}') + '$')
DEF_MED = ('Le **plan médiateur** de $[AB]$ est l\'ensemble des points $M$ équidistants de $A$ et de $B$ : '
           '$MA=MB$, soit $MA^2=MB^2$.')

V358_APPART = variation(
    DONNE_AB + ', et le point $' + pt('M', '{{mx}}', '{{my}}', '{{mz}}') + '$.\n\nLe point $M$ appartient-il au '
    'plan médiateur de $[AB]$ ?\n\n' + choix('Oui, $M$ est sur le plan médiateur de $[AB]$.',
                                              'Non, $M$ n\'est pas sur le plan médiateur de $[AB]$.'),
    VARS_MED + [var('r', '1..2;±'), var('sel', '0..1'), var('o', '0..1'), var('p1', '{{eval:r*(1-sel)*w2}}'),
                var('p2', '{{eval:r*((sel-1)*w1+sel*w3)}}'), var('p3', '{{eval:-r*sel*w2}}'),
                var('mx', '{{eval:ix+p1+o*w1}}'), var('my', '{{eval:iy+p2+o*w2}}'),
                var('mz', '{{eval:iz+p3+o*w3}}')],
    ['{{o}}'],
    [DEF_MED,
     '$MA^2=' + pa('ax-mx') + '^2+' + pa('ay-my') + '^2+' + pa('az-mz') + '^2='
     + ev('(ax-mx)^2+(ay-my)^2+(az-mz)^2') + '$ et $MB^2=' + pa('bx-mx') + '^2+' + pa('by-my') + '^2+'
     + pa('bz-mz') + '^2=' + ev('(bx-mx)^2+(by-my)^2+(bz-mz)^2') + '$.',
     si('o==0', '$MA^2=MB^2$ : $' + col('M\\text{ est sur le plan médiateur de }[AB]') + '$.')
     + si('o==1', '$MA^2\\neq MB^2$ : $' + col('M\\text{ n\'est pas sur le plan médiateur de }[AB]') + '$.')],
    ['abs(p1)+abs(p2)+abs(p3) > 0'])

N1, N2, N3 = '{{eval:2*w1}}', '{{eval:2*w2}}', '{{eval:2*w3}}'
V358_EQUATION = variation(
    DONNE_AB + '.\n\nDonne une équation cartésienne du plan médiateur de $[AB]$.\n\n$?$',
    VARS_MED, None,
    [DEF_MED + ' C\'est aussi le plan qui passe par le milieu $I$ de $[AB]$ et de vecteur normal $' + AB_ + '$.',
     '$' + pt('I', '{{ix}}', '{{iy}}', '{{iz}}') + '$ et $' + vcol(AB_, N1, N2, N3) + '$.',
     '$M(x\\,;\\,y\\,;\\,z)$ est sur ce plan si et seulement si $' + AB_ + '\\cdot\\overrightarrow{IM}=0$ : $'
     + coef('2*w1', '\\left(x' + si('ix!=0', terme('-ix', '')) + '\\right)')
     + terme('2*w2', '\\left(y' + si('iy!=0', terme('-iy', '')) + '\\right)')
     + terme('2*w3', '\\left(z' + si('iz!=0', terme('-iz', '')) + '\\right)') + '=0$.',
     'Une équation : $' + col(coef('2*w1', 'x') + terme('2*w2', 'y') + terme('2*w3', 'z')
                              + si('ix*w1+iy*w2+iz*w3!=0', terme('-2*(ix*w1+iy*w2+iz*w3)', '')) + '=0') + '$ '
     '(toute équation proportionnelle convient).'],
    blanks=[{'answerKind': 'equation',
             'expectedAnswer': N1 + 'x+(' + N2 + ')y+(' + N3 + ')z+({{eval:-2*(ix*w1+iy*w2+iz*w3)}})=0'}])

V358_SPHERE = variation(
    DONNE_AB + '.\n\nL\'ensemble des points $M$ de l\'espace tels que $\\overrightarrow{MA}\\cdot'
    '\\overrightarrow{MB}=0$ est une sphère. Donne son centre et son rayon (valeur exacte).\n\n'
    'Centre $\\Omega(?\\,;\\,?\\,;\\,?)$, rayon $?$',
    VARS_MED, ['{{ix}}', '{{iy}}', '{{iz}}', ev('sqrt(w1^2+w2^2+w3^2)')],
    ['Soit $\\Omega$ le milieu de $[AB]$ : $\\overrightarrow{\\Omega B}=-\\overrightarrow{\\Omega A}$.',
     '$\\overrightarrow{MA}\\cdot\\overrightarrow{MB}=\\left(\\overrightarrow{M\\Omega}+\\overrightarrow{\\Omega A}'
     '\\right)\\cdot\\left(\\overrightarrow{M\\Omega}-\\overrightarrow{\\Omega A}\\right)=M\\Omega^2-\\Omega A^2$. '
     'Donc $\\overrightarrow{MA}\\cdot\\overrightarrow{MB}=0$ si et seulement si $M\\Omega=\\Omega A$ : c\'est la '
     'sphère de diamètre $[AB]$.',
     'Centre : $' + col(pt('\\Omega', '{{ix}}', '{{iy}}', '{{iz}}')) + '$ ; rayon $\\Omega A=\\sqrt{' + pa('w1')
     + '^2+' + pa('w2') + '^2+' + pa('w3') + '^2}=' + col(ev('sqrt(w1^2+w2^2+w3^2)')) + '$ (la moitié de $AB$).'])

ESSAI1 = {'ax': 1, 'ay': 0, 'az': -1, 'w1': 1, 'w2': 2, 'w3': -1}
# B(3 ; 4 ; -3), I(2 ; 2 ; -2), AB = (2, 4, -2) ; p = (2, -1, 0) pour r = 1, sel = 0
MODELES.append(modele(
    '1-lieux-geometriques', 'Espace : lieux géométriques',
    'Point du plan médiateur de [AB] (MA² = MB²), équation du plan médiateur, ensemble des M tels que '
    'MA·MB = 0 (sphère de diamètre [AB]) (pièges : point A au lieu du milieu, rayon AB au lieu de AB/2)',
    ORTHO, 'Lieux géométriques', 1, [V358_APPART, V358_EQUATION, V358_SPHERE],
    [spec('v0 : M sur le plan médiateur', 0, dict(ESSAI1, r=1, sel=0, o=0), '0', 'correct'),
     spec('v0 : M sur le plan, répondu « non »', 0, dict(ESSAI1, r=1, sel=0, o=0), '1', 'incorrect'),
     spec('v0 : M hors du plan', 0, dict(ESSAI1, r=-1, sel=1, o=1), '1', 'correct'),
     spec('v1 : 2x + 4y - 2z - 16 = 0', 1, ESSAI1, '2x+4y-2z-16=0', 'correct'),
     spec('v1 : équation proportionnelle', 1, ESSAI1, 'x+2y-z-8=0', 'correct'),
     spec('v1 : plan passant par A (piège)', 1, ESSAI1, '2x+4y-2z-4=0', 'incorrect'),
     spec('v2 : Ω(2 ; 2 ; -2), r = √6', 2, ESSAI1, ['2', '2', '-2', '\\sqrt{6}'], 'correct'),
     spec('v2 : rayon AB (piège)', 2, ESSAI1, ['2', '2', '-2', '2\\sqrt{6}'], 'incorrect'),
     spec('v2 : centre A (piège)', 2, ESSAI1, ['1', '0', '-1', '\\sqrt{6}'], 'incorrect')],
    delay=180))

# --- 2. TSPE-368 : reconnaître un plan -----------------------------------------------------------

XP = '\\left(x' + terme('-p', '') + '\\right)'
YQ = '\\left(y' + terme('-q', '') + '\\right)'
ZS = '\\left(z' + terme('-s', '') + '\\right)'
CARRES = XP + '^2+' + YQ + '^2+' + ZS + '^2'
E368 = (si('k==0', coef('a', XP) + terme('b', 'y') + '=' + coef('c', 'z') + terme('q', ''))
        + si('k==1', CARRES + '=' + ev('R^2'))
        + si('k==2', '\\begin{cases} x' + terme('b', 'y') + '={{p}}\\\\ y' + terme('c', 'z') + '={{q}}\\end{cases}')
        + si('k==3', CARRES + '=0'))
CORR368 = (
    si('k==0', 'En développant, chaque membre est du premier degré en $x$, $y$, $z$ : l\'équation s\'écrit '
               '$ax+by+cz+d=0$ avec $(a\\,;\\,b\\,;\\,c)=({{a}}\\,;\\,{{b}}\\,;\\,' + ev('-c') + ')\\neq(0\\,;\\,0\\,;\\,0)$. '
               'C\'est donc $' + col('\\text{un plan}') + '$, de vecteur normal $'
               + vcol('\\vec{n}', '{{a}}', '{{b}}', ev('-c')) + '$.')
    + si('k==1', 'L\'équation s\'écrit $M\\Omega^2=' + ev('R^2') + '$ avec $' + pt('\\Omega', '{{p}}', '{{q}}', '{{s}}')
                 + '$ : c\'est $' + col('\\text{une sphère}') + '$, de centre $\\Omega$ et de rayon ${{R}}$.')
    + si('k==2', 'Chaque équation est celle d\'un plan, de vecteurs normaux $' + vcol('\\vec{n}', '1', '{{b}}', '0')
                 + '$ et $' + vcol('\\vec{n}\'', '0', '1', '{{c}}') + '$, non colinéaires : les deux plans sont '
                 'sécants, l\'ensemble est leur intersection, $' + col('\\text{une droite}') + '$.')
    + si('k==3', 'Une somme de carrés est nulle si et seulement si chaque carré est nul : $x={{p}}$, $y={{q}}$, '
                 '$z={{s}}$. L\'ensemble est $' + col('\\text{un point}') + '$, $'
                 + pt('\\Omega', '{{p}}', '{{q}}', '{{s}}') + '$ (ce n\'est ni une sphère ni un plan).'))

V368_NATURE = variation(
    RON + ', on considère l\'ensemble $\\mathcal{E}$ des points $M(x\\,;\\,y\\,;\\,z)$ dont les coordonnées '
    'vérifient\n\n$$' + E368 + '$$\n\nQuelle est la nature de $\\mathcal{E}$ ?\n\n'
    + choix('Un plan.', 'Une sphère.', 'Une droite.', 'Un point.'),
    [var('k', '0..3'), var('a', '1..4;±'), var('b', '1..4;±'), var('c', '1..4;±'), var('p', '1..3;±'),
     var('q', '1..3;±'), var('s', '1..3;±'), var('R', '1..4')],
    ['{{k}}'],
    ['Une équation du premier degré $ax+by+cz+d=0$, avec $a$, $b$, $c$ non tous nuls, caractérise un plan.',
     CORR368])

LETTRE = si('j==0', 'x') + si('j==1', 'y') + si('j==2', 'z')
V368_PARALLELE = variation(
    RON + ', on considère l\'ensemble $\\mathcal{P}$ des points $M(x\\,;\\,y\\,;\\,z)$ tels que $' + LETTRE
    + '={{k}}$.\n\nQue peut-on dire de $\\mathcal{P}$ ?\n\n'
    + choix('C\'est un plan parallèle au plan $(xOy)$.', 'C\'est un plan parallèle au plan $(xOz)$.',
            'C\'est un plan parallèle au plan $(yOz)$.', 'Ce n\'est pas un plan : c\'est une droite.'),
    [var('j', '0..2'), var('k', '1..5;±')], ['{{eval:2-j}}'],
    ['L\'équation $' + LETTRE + '={{k}}$ s\'écrit $' + si('j==0', '1x+0y+0z') + si('j==1', '0x+1y+0z')
     + si('j==2', '0x+0y+1z') + terme('-k', '') + '=0$ : c\'est l\'équation d\'un plan, de vecteur normal $'
     + si('j==0', '\\vec{\\imath}') + si('j==1', '\\vec{\\jmath}') + si('j==2', '\\vec{k}') + '$ (les deux autres '
     'coordonnées sont libres).',
     'Le plan ' + si('j==0', '$(yOz)$') + si('j==1', '$(xOz)$') + si('j==2', '$(xOy)$') + ' a pour équation $'
     + LETTRE + '=0$ : même vecteur normal. Donc $\\mathcal{P}$ est $' + col('\\text{parallèle au plan }'
                                                                          + si('j==0', '(yOz)') + si('j==1', '(xOz)')
                                                                          + si('j==2', '(xOy)')) + '$.'])

V368_REDUIRE = variation(
    RON + ', on considère l\'ensemble $\\mathcal{P}$ des points $M(x\\,;\\,y\\,;\\,z)$ tels que\n\n$$'
    + coef('a', XP) + terme('b', YQ) + '=z' + terme('s', '') + '$$\n\n$\\mathcal{P}$ est un plan : écrit sous '
    'la forme $' + coef('a', 'x') + terme('b', 'y') + '-z+d=0$, détermine $d$.\n\n$d=?$',
    [var('a', '1..4;±'), var('b', '1..4;±'), var('p', '1..3;±'), var('q', '1..3;±'), var('s', '1..4;±')],
    [ev('-a*p-b*q-s')],
    ['On développe et on passe tout dans le membre de gauche : $' + coef('a', 'x') + terme('-a*p', '')
     + terme('b', 'y') + terme('-b*q', '') + '-z' + terme('-s', '') + '=0$.',
     'L\'équation est du premier degré, avec des coefficients de $x$, $y$, $z$ non tous nuls : c\'est bien un '
     'plan, et $d=' + pa('-a*p') + '+' + pa('-b*q') + '+' + pa('-s') + '=' + col(ev('-a*p-b*q-s')) + '$.'])

MODELES.append(modele(
    '2-reconnaitre-plan', 'Espace : reconnaître un plan par son équation',
    'Nature d\'un ensemble de points par son équation (plan, sphère, droite, point), plans x = k, y = k, z = k, '
    'équation non développée d\'un plan à réduire (pièges : somme de carrés nulle, z = k pris pour une droite, '
    'signe de d)',
    REP, 'Équation cartésienne d\'un plan', 3, [V368_NATURE, V368_PARALLELE, V368_REDUIRE],
    [spec('v0 : plan', 0, {'k': 0, 'a': 2, 'b': -1, 'c': 3, 'p': 1, 'q': 2, 's': 1, 'R': 2}, '0', 'correct'),
     spec('v0 : sphère', 0, {'k': 1, 'a': 2, 'b': -1, 'c': 3, 'p': 1, 'q': 2, 's': -1, 'R': 2}, '1', 'correct'),
     spec('v0 : droite', 0, {'k': 2, 'a': 2, 'b': -1, 'c': 3, 'p': 1, 'q': 2, 's': -1, 'R': 2}, '2', 'correct'),
     spec('v0 : point', 0, {'k': 3, 'a': 2, 'b': -1, 'c': 3, 'p': 1, 'q': 2, 's': -1, 'R': 2}, '3', 'correct'),
     spec('v0 : somme de carrés nulle prise pour une sphère', 0,
          {'k': 3, 'a': 2, 'b': -1, 'c': 3, 'p': 1, 'q': 2, 's': -1, 'R': 2}, '1', 'incorrect'),
     spec('v1 : z = 3, parallèle à (xOy)', 1, {'j': 2, 'k': 3}, '0', 'correct'),
     spec('v1 : x = -2, parallèle à (yOz)', 1, {'j': 0, 'k': -2}, '2', 'correct'),
     spec('v1 : z = 3 pris pour une droite', 1, {'j': 2, 'k': 3}, '3', 'incorrect'),
     spec('v2 : 2(x - 1) + 3(y + 2) = z + 1, d = 3', 2, {'a': 2, 'b': 3, 'p': 1, 'q': -2, 's': 1}, '3', 'correct'),
     spec('v2 : s oublié', 2, {'a': 2, 'b': 3, 'p': 1, 'q': -2, 's': 1}, '4', 'incorrect'),
     spec('v2 : signe de d', 2, {'a': 2, 'b': 3, 'p': 1, 'q': -2, 's': 1}, '-3', 'incorrect')]))

# --- 3. TSPE-566 : coordonnées d'un vecteur dans une base ----------------------------------------
# v0 : base triangulaire u(u1, u2, u3), v(0, v2, v3), w(0, 0, w3), coefficients non nuls : le système se
# résout par substitution (lts-6). v1 : base quelconque, trois systèmes proposés (bon, transposé — lignes
# lues à la place des colonnes —, inconnues a et c échangées), placés selon `pos`.

V566_CALCUL = variation(
    'Dans l\'espace muni d\'un repère, on considère les vecteurs $' + vcol(U, '{{u1}}', '{{u2}}', '{{u3}}') + '$, $'
    + vcol(V, '0', '{{v2}}', '{{v3}}') + '$, $' + vcol(W, '0', '0', '{{w3}}') + '$ et $'
    + vcol(T, '{{t1}}', '{{t2}}', '{{t3}}') + '$. On admet que $(' + U + ',' + V + ',' + W + ')$ est une base de '
    'l\'espace.\n\nDétermine les coordonnées de $' + T + '$ dans cette base, c\'est-à-dire les réels $a$, $b$, $c$ '
    'tels que $' + T + '=a' + U + '+b' + V + '+c' + W + '$.\n\n$a=?$, $b=?$, $c=?$',
    [var('u1', '1..2;±'), var('u2', '1..2;±'), var('u3', '1..2;±'), var('v2', '1..2;±'), var('v3', '1..2;±'),
     var('w3', '1..2;±'), var('a', '-3..3'), var('b', '-3..3'), var('c', '-3..3'), var('t1', '{{eval:a*u1}}'),
     var('t2', '{{eval:a*u2+b*v2}}'), var('t3', '{{eval:a*u3+b*v3+c*w3}}')],
    ['{{a}}', '{{b}}', '{{c}}'],
    ['$' + T + '=a' + U + '+b' + V + '+c' + W + '$ s\'écrit coordonnée par coordonnée :\n\n$$\\begin{cases} '
     + coef('u1', 'a') + '={{t1}}\\\\ ' + coef('u2', 'a') + terme('v2', 'b') + '={{t2}}\\\\ ' + coef('u3', 'a')
     + terme('v3', 'b') + terme('w3', 'c') + '={{t3}}\\end{cases}$$',
     'La première équation donne $a={{a}}$. On remplace dans la deuxième : $' + coef('v2', 'b') + '={{t2}}'
     + si('u2*a!=0', terme('-u2*a', '') + '=' + ev('t2-u2*a')) + '$, donc $b={{b}}$. Puis dans la troisième : $'
     + coef('w3', 'c') + '={{t3}}' + si('u3*a+v3*b!=0', terme('-u3*a-v3*b', '') + '=' + ev('t3-u3*a-v3*b'))
     + '$, donc $c={{c}}$.',
     'Les coordonnées de $' + T + '$ dans la base $(' + U + ',' + V + ',' + W + ')$ sont $' + col('({{a}}\\,;\\,{{b}}'
                                                                                         '\\,;\\,{{c}})') + '$.'],
    ['abs(a)+abs(b)+abs(c) > 0'])


def ligne(x, y, z, t):
    return '$' + coef(x, 'a') + terme(y, 'b') + terme(z, 'c') + '=' + t + '$'


def systeme(lignes):
    return ' ; '.join(lignes)


BON = systeme([ligne('u1', 'v1', 'w1', '{{t1}}'), ligne('u2', 'v2', 'w2', '{{t2}}'), ligne('u3', 'v3', 'w3', '{{t3}}')])
TRANSPOSE = systeme([ligne('u1', 'u2', 'u3', '{{t1}}'), ligne('v1', 'v2', 'v3', '{{t2}}'),
                     ligne('w1', 'w2', 'w3', '{{t3}}')])
ECHANGE = systeme([ligne('w1', 'v1', 'u1', '{{t1}}'), ligne('w2', 'v2', 'u2', '{{t2}}'),
                   ligne('w3', 'v3', 'u3', '{{t3}}')])
OPTIONS = [BON, TRANSPOSE, ECHANGE]


def option(i):
    """Item i du choix : rotation de OPTIONS selon pos, le bon système est en position pos."""
    return ''.join(si('pos==' + str(p), OPTIONS[(i - p) % 3]) for p in range(3))


V566_TRADUIRE = variation(
    'Dans l\'espace muni d\'un repère, on considère les vecteurs $' + vcol(U, '{{u1}}', '{{u2}}', '{{u3}}') + '$, $'
    + vcol(V, '{{v1}}', '{{v2}}', '{{v3}}') + '$, $' + vcol(W, '{{w1}}', '{{w2}}', '{{w3}}') + '$ et $'
    + vcol(T, '{{t1}}', '{{t2}}', '{{t3}}') + '$, où $(' + U + ',' + V + ',' + W + ')$ est une base.\n\nQuel '
    'système traduit l\'égalité $' + T + '=a' + U + '+b' + V + '+c' + W + '$ ?\n\n' + choix(option(0), option(1),
                                                                                         option(2)),
    [var('u1', '1..3;±'), var('u2', '1..3;±'), var('u3', '1..3;±'), var('v1', '1..3;±'), var('v2', '1..3;±'),
     var('v3', '1..3;±'), var('w1', '1..3;±'), var('w2', '1..3;±'), var('w3', '1..3;±'), var('t1', '-5..5'),
     var('t2', '-5..5'), var('t3', '-5..5'), var('pos', '0..2')],
    ['{{pos}}'],
    ['On écrit l\'égalité coordonnée par coordonnée : pour les abscisses, $x_{' + T + '}=a\\,x_{' + U + '}+b\\,x_{'
     + V + '}+c\\,x_{' + W + '}$, de même pour $y$ et $z$. Les coefficients de $a$ sont donc les coordonnées de $'
     + U + '$ (sa colonne), ceux de $b$ celles de $' + V + '$, ceux de $c$ celles de $' + W + '$.',
     'Le bon système est donc : ' + BON + '.',
     'Les deux autres systèmes lisent les coordonnées en ligne au lieu de les lire en colonne, ou échangent '
     'les rôles de $a$ et de $c$.'],
    ['abs(u1*(v2*w3-v3*w2)-v1*(u2*w3-u3*w2)+w1*(u2*v3-u3*v2)) > 0',
     'abs(u2-v1)+abs(u3-w1)+abs(v3-w2) > 0',
     'abs(u1-w1)+abs(u2-w2)+abs(u3-w3) > 0',
     'abs(w1-u1)+abs(v1-u2)+abs(u1-u3)+abs(w2-v1)+abs(u2-v3)+abs(w3-w1)+abs(v3-w2)+abs(u3-w3) > 0'])

ESSAI3 = {'u1': 1, 'u2': 2, 'u3': -1, 'v2': 1, 'v3': 3, 'w3': 2, 'a': 2, 'b': -1, 'c': 1}
# t = (2 ; 4 - 1 ; -2 - 3 + 2) = (2 ; 3 ; -3)
ESSAI3B = {'u1': 1, 'u2': 2, 'u3': -1, 'v1': 3, 'v2': 1, 'v3': 1, 'w1': -2, 'w2': 1, 'w3': 2, 't1': 1, 't2': 0,
           't3': 4}
MODELES.append(modele(
    '3-coordonnees-base', 'Espace : coordonnées d\'un vecteur dans une base',
    'Traduire t = au + bv + cw par un système et le résoudre par substitution (base triangulaire), choisir le '
    'système qui traduit l\'égalité (pièges : coordonnées dans le repère à la place, lignes lues au lieu des '
    'colonnes)',
    VDP, 'Coplanarité, décomposition', 3, [V566_CALCUL, V566_TRADUIRE],
    [spec('v0 : (2 ; -1 ; 1)', 0, dict(ESSAI3, t1=2, t2=3, t3=-3), ['2', '-1', '1'], 'correct'),
     spec('v0 : coordonnées dans le repère (piège)', 0, dict(ESSAI3, t1=2, t2=3, t3=-3), ['2', '3', '-3'],
          'incorrect'),
     spec('v0 : b sans substitution', 0, dict(ESSAI3, t1=2, t2=3, t3=-3), ['2', '3', '1'], 'incorrect'),
     spec('v1 : bon système en 1', 1, dict(ESSAI3B, pos=0), '0', 'correct'),
     spec('v1 : bon système en 3', 1, dict(ESSAI3B, pos=2), '2', 'correct'),
     spec('v1 : système transposé (piège)', 1, dict(ESSAI3B, pos=0), '1', 'incorrect')],
    delay=180))

# --- 4. TSPE-568 : interpréter les solutions -----------------------------------------------------
# Le calcul est donné (Q4) : l'élève interprète. Le cas c (0, 1, 2) est la bonne réponse.

V568_DROITE_PLAN = variation(
    RON + ', on étudie l\'intersection d\'une droite $d$, donnée par une représentation paramétrique de '
    'paramètre $t$, et d\'un plan $\\mathcal{P}$, donné par une équation cartésienne. En remplaçant $x$, $y$, $z$ '
    'dans l\'équation de $\\mathcal{P}$, on obtient l\'équation d\'inconnue $t$ :\n\n$$'
    + si('c==0', coef('k', 't') + terme('m', '') + '=0') + si('c==1', '0\\times t' + terme('m', '') + '=0')
    + si('c==2', '0\\times t=0') + '$$\n\nQue peut-on en conclure ?\n\n'
    + choix('$d$ et $\\mathcal{P}$ sont sécants en un point.', '$d$ est strictement parallèle à $\\mathcal{P}$.',
            '$d$ est incluse dans $\\mathcal{P}$.', '$d$ est orthogonale à $\\mathcal{P}$.'),
    [var('c', '0..2'), var('k', '1..5;±'), var('m', '1..6;±')], ['{{c}}'],
    ['Chaque solution $t$ donne un point de $d$ qui est aussi sur $\\mathcal{P}$.',
     si('c==0', 'L\'équation a une seule solution, $t=' + ev('-m/k') + '$ : un seul point commun, $'
                + col('d\\text{ et }\\mathcal{P}\\text{ sont sécants en un point}') + '$.')
     + si('c==1', 'L\'équation s\'écrit $' + ev('m') + '=0$ : elle n\'a aucune solution, aucun point commun. $'
                  + col('d\\text{ est strictement parallèle à }\\mathcal{P}') + '$.')
     + si('c==2', 'Tout réel $t$ est solution : tous les points de $d$ sont sur $\\mathcal{P}$, $'
                  + col('d\\text{ est incluse dans }\\mathcal{P}') + '$.'),
     'L\'orthogonalité ne se lit pas sur cette équation : elle se décide avec un vecteur directeur de $d$ et un '
     'vecteur normal de $\\mathcal{P}$.'])

def comp(c, k):
    """Coordonnée c + k t, sans « 0 + » ni « + 0t »."""
    return (si(c + '!=0', '{{' + c + '}}' + terme(k, 't')) + si(c + '==0 && ' + k + '!=0', coef(k, 't'))
            + si(c + '==0 && ' + k + '==0', '0'))


TRIPLET = '\\left(' + comp('x0', 'al') + '\\,;\\,' + comp('y0', 'be') + '\\,;\\,' + comp('z0', 'ga') + '\\right)'
V568_DEUX_PLANS = variation(
    RON + ', on étudie l\'intersection de deux plans $\\mathcal{P}$ et $\\mathcal{Q}$ en résolvant le système '
    'formé par leurs équations cartésiennes. On trouve :\n\n'
    + si('c==0', 'les solutions sont les triplets $' + TRIPLET + '$, $t\\in\\mathbb{R}$.')
    + si('c==1', 'le système n\'a aucune solution.')
    + si('c==2', 'la seconde équation est la première multipliée par ${{k}}$ : le système se réduit à une seule '
                 'équation.')
    + '\n\nQue peut-on en conclure ?\n\n'
    + choix('$\\mathcal{P}$ et $\\mathcal{Q}$ sont sécants selon une droite.',
            '$\\mathcal{P}$ et $\\mathcal{Q}$ sont strictement parallèles.',
            '$\\mathcal{P}$ et $\\mathcal{Q}$ sont confondus.',
            '$\\mathcal{P}$ et $\\mathcal{Q}$ sont sécants en un point.'),
    [var('c', '0..2'), var('k', '2..4;±'), var('x0', '-3..3'), var('y0', '-3..3'), var('z0', '-3..3'),
     var('al', '1..3;±'), var('be', '-3..3'), var('ga', '-3..3')], ['{{c}}'],
    [si('c==0', 'Les solutions décrivent une représentation paramétrique : c\'est la droite passant par $'
                + pt('A', '{{x0}}', '{{y0}}', '{{z0}}') + '$ et de vecteur directeur $'
                + vcol(U, '{{al}}', '{{be}}', '{{ga}}') + '$. $'
                + col('\\mathcal{P}\\text{ et }\\mathcal{Q}\\text{ sont sécants selon une droite}') + '$.')
     + si('c==1', 'Aucun point n\'est sur les deux plans : $'
                  + col('\\mathcal{P}\\text{ et }\\mathcal{Q}\\text{ sont strictement parallèles}') + '$.')
     + si('c==2', 'Les deux équations ont les mêmes solutions : elles décrivent le même plan, $'
                  + col('\\mathcal{P}\\text{ et }\\mathcal{Q}\\text{ sont confondus}') + '$.'),
     'Deux plans ne peuvent pas avoir un seul point commun : s\'ils sont sécants, ils le sont selon une droite.'])

V568_TROIS_PLANS = variation(
    RON + ', on cherche les points communs à trois plans en résolvant le système formé par leurs trois '
    'équations cartésiennes. On trouve :\n\n'
    + si('c==0', 'une unique solution, $(x\\,;\\,y\\,;\\,z)=({{x0}}\\,;\\,{{y0}}\\,;\\,{{z0}})$.')
    + si('c==1', 'le système n\'a aucune solution.')
    + si('c==2', 'les solutions sont les triplets $' + TRIPLET + '$, $t\\in\\mathbb{R}$.')
    + '\n\nQue peut-on en conclure ?\n\n'
    + choix('Les trois plans ont un unique point commun.', 'Les trois plans n\'ont aucun point commun.',
            'Les trois plans ont une droite commune.', 'Les trois plans sont confondus.'),
    [var('c', '0..2'), var('x0', '-3..3'), var('y0', '-3..3'), var('z0', '-3..3'), var('al', '1..3;±'),
     var('be', '-3..3'), var('ga', '-3..3')], ['{{c}}'],
    ['Les solutions du système sont les coordonnées des points communs aux trois plans.',
     si('c==0', 'Une seule solution : $' + col('\\text{un unique point commun}') + '$, $'
                + pt('I', '{{x0}}', '{{y0}}', '{{z0}}') + '$.')
     + si('c==1', 'Aucune solution : $' + col('\\text{aucun point commun}') + '$ aux trois plans (deux d\'entre '
                  'eux peuvent pourtant être sécants).')
     + si('c==2', 'Les solutions décrivent une représentation paramétrique de droite : $'
                  + col('\\text{les trois plans ont une droite commune}') + '$, passant par $'
                  + pt('A', '{{x0}}', '{{y0}}', '{{z0}}') + '$ et dirigée par $' + vcol(U, '{{al}}', '{{be}}', '{{ga}}')
                  + '$.')])

ESSAI4 = {'x0': 1, 'y0': -2, 'z0': 0, 'al': 2, 'be': -1, 'ga': 3, 'k': 3, 'm': 4}
MODELES.append(modele(
    '4-interpreter-systeme', 'Espace : interpréter les solutions d\'un système',
    'Interpréter le résultat d\'une résolution : droite et plan (une solution, aucune, une infinité), deux plans, '
    'trois plans (pièges : deux plans sécants en un point, « 0 = 0 » pris pour « aucune solution »)',
    REP, 'Positions relatives', 3, [V568_DROITE_PLAN, V568_DEUX_PLANS, V568_TROIS_PLANS],
    [spec('v0 : sécants en un point', 0, {'c': 0, 'k': 2, 'm': -6}, '0', 'correct'),
     spec('v0 : strictement parallèle', 0, {'c': 1, 'k': 2, 'm': 4}, '1', 'correct'),
     spec('v0 : incluse', 0, {'c': 2, 'k': 2, 'm': 4}, '2', 'correct'),
     spec('v0 : 0 = 0 pris pour « aucune solution » (piège)', 0, {'c': 2, 'k': 2, 'm': 4}, '1', 'incorrect'),
     spec('v1 : droite', 1, dict(ESSAI4, c=0), '0', 'correct'),
     spec('v1 : droite prise pour un point (piège)', 1, dict(ESSAI4, c=0), '3', 'incorrect'),
     spec('v1 : parallèles', 1, dict(ESSAI4, c=1), '1', 'correct'),
     spec('v1 : confondus', 1, dict(ESSAI4, c=2), '2', 'correct'),
     spec('v2 : un point', 2, dict(ESSAI4, c=0), '0', 'correct'),
     spec('v2 : aucun', 2, dict(ESSAI4, c=1), '1', 'correct'),
     spec('v2 : droite commune', 2, dict(ESSAI4, c=2), '2', 'correct'),
     spec('v2 : droite prise pour un point', 2, dict(ESSAI4, c=2), '0', 'incorrect')]))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True, stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
