"""Écrit les deux modèles neufs du chantier idees-1re-geometrie-reperee dans
scripts/questions/idees-1re-geometrie-reperee-neufs/.

Phase 0 : David, le 2026-11-27, « je valide tes recos » (page à cocher
https://claude.ai/artifact/KcQ3rQhyGqn2jhJFDjgcBJ, fiches
docs/wip/idees-1re-geometrie-reperee-fiches.md) : N1 et N2 comme décrits, point 1SPE-437 pour les
deux.

Rangement (migration générée après la création en brouillon), nœud « Géométrie > Géométrie
repérée > projeté orthogonal » (niveaux 2 et 3 pris, relevés en prod le 2026-11-27) :
- N1 synthèse droite, perpendiculaire, projeté et cercle : 1SPE-437, niveau 4 ;
- N2 synthèse carré, projeté et cercle avec le produit scalaire : 1SPE-437, niveau 5.
1SPE-437 est porté par la notion « Géométrie repérée », parente du nœud.

Règles suivies (couvrir-un-niveau.md § 5) : erreurs prévues par case (de vraies erreurs
d'élèves), un coup de pouce par variation, qui ne donne jamais la réponse ; corrigé sans terme nul
(conditions).

Usage : python3 docs/wip/questions/idees-1re-geometrie-reperee-neufs.py scripts/questions/idees-1re-geometrie-reperee-neufs
"""
import json
import os
import re
import sys

DOSSIER = sys.argv[1]
NOEUD = 'Géométrie > Géométrie repérée > projeté orthogonal'
POINT = '1SPE-437'
PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
REPERE = 'Le plan est muni d\'un repère orthonormé.'

# Messages tels que la résolution les réécrit : la spec compare le message résolu.
# Relevés par question:specs (rempli après le premier passage).
REECRIT = {}


def resolu(message):
    """Forme réécrite d'un message : (AB) et [AB] entre $ deviennent \\left( AB \\right) et
    \\left[ AB \\right] (relevé par question:specs, chantier idees-1re-produit-scalaire)."""
    if message in REECRIT:
        return REECRIT[message]
    morceaux = message.split('$')
    for i in range(1, len(morceaux), 2):
        m = re.sub(r'\(([A-Z]{1,3})\)', r'\\left( \1 \\right)', morceaux[i])
        morceaux[i] = re.sub(r'\[([A-Z]{1,3})\]', r'\\left[ \1 \\right]', m)
    return '$'.join(morceaux)


def spec(desc, vi, variables_, status, answers, message=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = resolu(message)
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables_.items()},
            'expected': expected, 'answers': answers}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def case(attendue, erreurs=None, extra=None):
    c = {'expectedAnswer': attendue}
    if extra:
        c.update(extra)
    if erreurs:
        c['expectedErrors'] = erreurs
    return c


def variation(statement, variables, blanks, steps, hint, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': blanks, 'correction': {'steps': steps}, 'hint': hint}


def bloc(nom, *lignes):
    return '```' + nom + '\n' + '\n'.join(lignes) + '\n```'


def P(texte):
    return PRIMAIRE + '{ ' + texte + ' }'


def vec(ab):
    return '\\overrightarrow{' + ab + '}'


def r2(expr):
    """Coordonnée de figure arrondie au centième, écrite en décimal."""
    return '{{eval:round(100*(' + expr + '))/100;d}}'


def coef(e, lettre, premier=False):
    """Terme « e·lettre » d'une équation, sans 1 ni signe doublé (e entier non nul)."""
    plus = '' if premier else '+'
    return ('{{if:' + e + '==1|' + plus + lettre + '}}{{if:' + e + '==-1|-' + lettre + '}}'
            '{{if:' + e + '>1|' + plus + '{{eval:' + e + '}}' + lettre + '}}'
            '{{if:' + e + '< -1|{{eval:' + e + '}}' + lettre + '}}')


def lin(a, b, c):
    """ax + by + c = 0 écrit proprement (a, b non nuls, c quelconque)."""
    return (coef(a, 'x', premier=True) + coef(b, 'y')
            + '{{if:' + c + '>0|+{{eval:' + c + '}}}}{{if:' + c + '< 0|{{eval:' + c + '}}}}=0')


def ecrire(nom, m):
    os.makedirs(DOSSIER, exist_ok=True)
    chemin = os.path.join(DOSSIER, nom + '.json')
    # Garder l'id écrit en tête par create-questions --publier, s'il existe
    if os.path.exists(chemin):
        with open(chemin, encoding='utf-8') as f:
            ancien = json.load(f)
        if 'id' in ancien:
            m = {'id': ancien['id'], **m}
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write('\n')


def modele(title, description, level, delay, variations, specs):
    return {'rangement': {'noeud': NOEUD, 'point': POINT}, 'title': title,
            'description': description, 'grades': ['1_SPE'], 'level': level, 'delay': delay,
            'status': 'draft', 'shared': {'blankDefaults': {'acceptDecimal': True}},
            'options': {'constraints': {'spaces': 'off'}},
            'variations': variations, 'testSpecs': specs}


# =============================================================================================
# N1 (F1) — Synthèse : droite, perpendiculaire, projeté et cercle (1G21-1). Point 1SPE-437.
# AB = (P ; Q), S = AB², (AB) : Qx − Py + c1 = 0, d ⊥ (AB) par C : Px + Qy + c2 = 0,
# H = A + (N/S)·AB avec N = AC·AB, Ω milieu de [AB], cercle de diamètre [AB] : r² = S/4.
# =============================================================================================

COMMUNES_N1 = [
    var('P', 'eval:xB-xA'), var('Q', 'eval:yB-yA'), var('mP', 'eval:-(xB-xA)'),
    var('S', 'eval:(xB-xA)^2+(yB-yA)^2'),
    var('c1', 'eval:(xB-xA)*yA-(yB-yA)*xA'),
    var('c2', 'eval:-((xB-xA)*xC+(yB-yA)*yC)'),
    var('N', 'eval:(xC-xA)*(xB-xA)+(yC-yA)*(yB-yA)'),
]
COND_N1 = ['c1 != 0', 'c2 != 0', 'xA+xB != 0', 'yA+yB != 0', 'N != 0', 'N != S']

XH = '{{eval:xA+N*P/S}}'
YH = '{{eval:yA+N*Q/S}}'
XO = '{{eval:(xA+xB)/2}}'
YO = '{{eval:(yA+yB)/2}}'
EQ_AB = '{{Q}}x{{mP;+}}y{{c1;+}}=0'
EQ_D = '{{P}}x{{Q;+}}y{{c2;+}}=0'
CERCLE_N1 = '(x{{eval:-(xA+xB)/2;+}})^2+(y{{eval:-(yA+yB)/2;+}})^2={{eval:S/4}}'

ENONCE_N1 = (
    REPERE + ' On considère les points $A({{xA}}\\,;{{yA}})$, $B({{xB}}\\,;{{yB}})$ et '
    '$C({{xC}}\\,;{{yC}})$.\n\n'
    '**1.** Donne une équation cartésienne de la droite $(AB)$.\n\n$?$\n\n'
    '**2.** Donne une équation cartésienne de la droite $d$ perpendiculaire à $(AB)$ passant par '
    '$C$.\n\n$?$\n\n'
    '**3.** Les droites $(AB)$ et $d$ se coupent en $H$. Donne les coordonnées de $H$.\n\n'
    '$H(?\\,;?)$\n\n'
    '**4.** Calcule la longueur $AB$ (valeur exacte).\n\n$AB=?$\n\n'
    '**5.** Donne les coordonnées du milieu $\\Omega$ du segment $[AB]$.\n\n$\\Omega(?\\,;?)$\n\n'
    '**6.** Donne une équation du cercle de diamètre $[AB]$.\n\n$?$')

ERR_N1_NORMAL = ('$' + vec('AB') + '$ est un vecteur directeur de $(AB)$, pas un vecteur normal : '
                 'ta droite est perpendiculaire à $(AB)$.')
ERR_N1_C1 = 'Vérifie la constante : les coordonnées de $A$ doivent vérifier l\'équation.'
ERR_N1_PARALLELE = ('Ta droite est parallèle à $(AB)$ : $d$ est perpendiculaire à $(AB)$, donc $'
                    + vec('AB') + '$ est un vecteur normal à $d$.')
ERR_N1_PAR_A = 'Ta droite passe par $A$ : $d$ passe par $C$.'
ERR_N1_C2 = 'Vérifie la constante : les coordonnées de $C$ doivent vérifier l\'équation.'
ERR_N1_MILIEU = ('$H$ n\'est pas le milieu de $[AB]$ : c\'est le pied de la perpendiculaire à '
                 '$(AB)$ passant par $C$.')
ERR_N1_C = '$C$ n\'est pas sur $(AB)$ : $H$ est le point de $(AB)$ le plus proche de $C$.'
ERR_N1_AB2 = 'Tu as donné $AB^2$ : il reste à prendre la racine carrée.'
ERR_N1_ABS = ('$AB$ se calcule avec la racine de la somme des carrés des écarts, pas avec la somme '
              'des écarts.')
ERR_N1_DEMI_DIFF = 'Le milieu a pour coordonnées la demi-somme des coordonnées, pas la demi-différence.'
ERR_N1_SOMME = 'N\'oublie pas de diviser par $2$ la somme des coordonnées.'
ERR_N1_R = 'Le second membre est le carré du rayon, $r^2$, pas $r$.'
ERR_N1_AB2_R = 'Le rayon est la moitié de $AB$ : le second membre vaut $\\dfrac{AB^2}{4}$.'
ERR_N1_SIGNES = ('Les signes du centre sont inversés : pour un centre d\'abscisse $a$, on écrit '
                 '$\\left( x - a \\right)^2$.')
HINT_N1 = ('$' + vec('AB') + '$ dirige $(AB)$ et il est normal à toute droite perpendiculaire à '
           '$(AB)$. Pour $H$, résous le système formé par les deux équations.')


def blanks_n1():
    return [
        case(EQ_AB, [erreur('{{P}}x{{Q;+}}y{{eval:-(P*xA+Q*yA);+}}=0', ERR_N1_NORMAL,
                            'AB pris comme vecteur normal'),
                     erreur('{{Q}}x{{mP;+}}y{{eval:-c1;+}}=0', ERR_N1_C1, 'Constante de signe faux')],
             {'answerKind': 'equation'}),
        case(EQ_D, [erreur('{{Q}}x{{mP;+}}y{{eval:P*yC-Q*xC;+}}=0', ERR_N1_PARALLELE,
                           'Parallèle au lieu de perpendiculaire'),
                    erreur('{{P}}x{{Q;+}}y{{eval:-(P*xA+Q*yA);+}}=0', ERR_N1_PAR_A, 'Passe par A'),
                    erreur('{{P}}x{{Q;+}}y{{eval:-c2;+}}=0', ERR_N1_C2, 'Constante de signe faux')],
             {'answerKind': 'equation'}),
        case(XH, [erreur(XO, ERR_N1_MILIEU, 'Milieu de [AB]'),
                  erreur('{{xC}}', ERR_N1_C, 'Point C')]),
        case(YH, [erreur(YO, ERR_N1_MILIEU, 'Milieu de [AB]'),
                  erreur('{{yC}}', ERR_N1_C, 'Point C')]),
        case('{{eval:sqrt(S)}}', [erreur('{{S}}', ERR_N1_AB2, 'AB² au lieu de AB'),
                                  erreur('{{eval:abs(P)+abs(Q)}}', ERR_N1_ABS, 'Somme des écarts')]),
        case(XO, [erreur('{{eval:(xB-xA)/2}}', ERR_N1_DEMI_DIFF, 'Demi-différence'),
                  erreur('{{eval:xA+xB}}', ERR_N1_SOMME, 'Pas divisé par 2')]),
        case(YO, [erreur('{{eval:(yB-yA)/2}}', ERR_N1_DEMI_DIFF, 'Demi-différence'),
                  erreur('{{eval:yA+yB}}', ERR_N1_SOMME, 'Pas divisé par 2')]),
        case(CERCLE_N1,
             [erreur('(x{{eval:-(xA+xB)/2;+}})^2+(y{{eval:-(yA+yB)/2;+}})^2={{eval:sqrt(S)/2}}',
                     ERR_N1_R, 'r au lieu de r²'),
              erreur('(x{{eval:-(xA+xB)/2;+}})^2+(y{{eval:-(yA+yB)/2;+}})^2={{S}}', ERR_N1_AB2_R,
                     'AB² au lieu de r²'),
              erreur('(x{{eval:(xA+xB)/2;+}})^2+(y{{eval:(yA+yB)/2;+}})^2={{eval:S/4}}',
                     ERR_N1_SIGNES, 'Signes du centre inversés')],
             {'answerKind': 'equation'}),
    ]


STEPS_N1 = [
    '$' + vec('AB') + '\\begin{pmatrix}{{P}}\\\\{{Q}}\\end{pmatrix}$ dirige $(AB)$, donc $\\vec n'
    '\\begin{pmatrix}{{Q}}\\\\{{mP}}\\end{pmatrix}$ est normal à $(AB)$ : $(AB)$ a une équation de la '
    'forme ' + '$' + coef('Q', 'x', True) + coef('mP', 'y') + '+c=0$. $A$ est sur $(AB)$ : '
    '${{Q}}\\times{{xA;()}}{{mP;+}}\\times{{yA;()}}+c=0$, donc $c={{c1}}$ et $(AB) : '
    + P(lin('Q', 'mP', 'c1')) + '$.',
    '$d$ est perpendiculaire à $(AB)$, donc $' + vec('AB') + '$ est normal à $d$ : $d$ a une '
    'équation de la forme $' + coef('P', 'x', True) + coef('Q', 'y') + '+c=0$. $C$ est sur $d$ : '
    '${{P}}\\times{{xC;()}}{{Q;+}}\\times{{yC;()}}+c=0$, donc $c={{c2}}$ et $d : '
    + P(lin('P', 'Q', 'c2')) + '$.',
    '$H$ est le projeté orthogonal de $C$ sur $(AB)$ : $' + vec('AH') + '=\\dfrac{' + vec('AC')
    + '\\cdot' + vec('AB') + '}{AB^2}\\,' + vec('AB') + '$, avec $' + vec('AC') + '\\cdot'
    + vec('AB') + '={{N}}$ et $AB^2={{S}}$. Donc $' + vec('AH') + '={{eval:N/S}}\\,' + vec('AB')
    + '$ et $H\\left(' + P(XH) + '\\,;' + P(YH) + '\\right)$. (On trouve la même chose en '
    'résolvant le système des deux équations.)',
    '$AB=\\sqrt{ {{P;()}}^2+{{Q;()}}^2 }=\\sqrt{ {{S}} }=' + P('{{eval:sqrt(S)}}') + '$.',
    '$\\Omega\\left(\\dfrac{ {{xA}}{{xB;+}} }{2}\\,;\\dfrac{ {{yA}}{{yB;+}} }{2}\\right)$, soit $\\Omega'
    '\\left(' + P(XO) + '\\,;' + P(YO) + '\\right)$.',
    'Le cercle de diamètre $[AB]$ a pour centre $\\Omega$ et pour rayon $r=\\dfrac{AB}{2}$, donc '
    '$r^2=\\dfrac{ {{S}} }{4}$. Une équation est $' + P(CERCLE_N1) + '$.',
]

n1, n1s = [], []
# V1 : B = A + 3u, C = A + k·u + s·(−q ; p) avec k = 1 ou 2 : H = A + k·u, à coordonnées entières.
n1.append(variation(
    ENONCE_N1,
    [var('xA', '-5..5'), var('yA', '-5..5'), var('p', '1..2;±'), var('q', '1..2;±'),
     var('k', '1|2'), var('s', '1..2;±'),
     var('xB', 'eval:xA+3*p'), var('yB', 'eval:yA+3*q'),
     var('xC', 'eval:xA+k*p-s*q'), var('yC', 'eval:yA+k*q+s*p')] + COMMUNES_N1,
    blanks_n1(), STEPS_N1, HINT_N1,
    ['abs(xB) <= 5', 'abs(yB) <= 5', 'abs(xC) <= 5', 'abs(yC) <= 5'] + COND_N1))
# V2 : A, B, C quelconques, H à au moins une coordonnée non entière.
n1.append(variation(
    ENONCE_N1,
    [var('xA', '-5..5'), var('yA', '-5..5'), var('xB', '-5..5'), var('yB', '-5..5'),
     var('xC', '-5..5'), var('yC', '-5..5')] + COMMUNES_N1,
    blanks_n1(), STEPS_N1, HINT_N1,
    ['P != 0', 'Q != 0', 'S >= 8', 'S <= 50',
     '(xB-xA)*(yC-yA)-(yB-yA)*(xC-xA) != 0',
     'mod(N*P, S) != 0 || mod(N*Q, S) != 0'] + COND_N1))

# V1 : A(−2 ; 1), u = (1 ; 2), k = 1, s = 1 : B(1 ; 7), C(−3 ; 4), H(−1 ; 3), AB = 3√5,
# Ω(−1/2 ; 4), r² = 45/4 ; (AB) : 2x − y + 5 = 0, d : x + 2y − 5 = 0.
V = {'xA': -2, 'yA': 1, 'p': 1, 'q': 2, 'k': 1, 's': 1}
JUSTE1 = ['2x-y+5=0', 'x+2y-5=0', '-1', '3', '3\\sqrt{5}', '-\\frac{1}{2}', '4',
          '\\left(x+\\frac{1}{2}\\right)^2+(y-4)^2=\\frac{45}{4}']


def avec(juste, i, rep):
    r = list(juste)
    r[i] = rep
    return r


n1s += [spec('H entier : A(−2 ; 1), B(1 ; 7), C(−3 ; 4)', 0, V, 'correct', JUSTE1),
        spec('Équations écrites avec les coefficients de AB', 0, V, 'correct',
             avec(avec(JUSTE1, 0, '6x-3y+15=0'), 1, '3x+6y-15=0')),
        spec('Cercle sous forme développée', 0, V, 'correct',
             avec(JUSTE1, 7, 'x^2+y^2+x-8y+5=0')),
        spec('AB normal à (AB)', 0, V, 'incorrect', avec(JUSTE1, 0, 'x+2y=0'), ERR_N1_NORMAL),
        spec('Parallèle à (AB) par C', 0, V, 'incorrect', avec(JUSTE1, 1, '2x-y+10=0'),
             ERR_N1_PARALLELE),
        spec('Perpendiculaire par A', 0, V, 'incorrect', avec(JUSTE1, 1, 'x+2y=0'), ERR_N1_PAR_A),
        spec('H au milieu de [AB]', 0, V, 'incorrect', avec(JUSTE1, 2, '-\\frac{1}{2}'),
             ERR_N1_MILIEU),
        spec('AB² au lieu de AB', 0, V, 'incorrect', avec(JUSTE1, 4, '45'), ERR_N1_AB2),
        spec('Ω : pas divisé par 2', 0, V, 'incorrect', avec(JUSTE1, 5, '-1'), ERR_N1_SOMME),
        spec('r au lieu de r²', 0, V, 'incorrect',
             avec(JUSTE1, 7, '\\left(x+\\frac{1}{2}\\right)^2+(y-4)^2=\\frac{3\\sqrt{5}}{2}'),
             ERR_N1_R),
        spec('Signes du centre inversés', 0, V, 'incorrect',
             avec(JUSTE1, 7, '\\left(x-\\frac{1}{2}\\right)^2+(y+4)^2=\\frac{45}{4}'),
             ERR_N1_SIGNES)]
# V2 : A(−1 ; 2), B(3 ; −1), C(2 ; 4) : AB = (4 ; −3), S = 25, N = 6, H(−1/25 ; 32/25),
# Ω(1 ; 1/2) ; (AB) : 3x + 4y − 5 = 0, d : 4x − 3y + 4 = 0.
V = {'xA': -1, 'yA': 2, 'xB': 3, 'yB': -1, 'xC': 2, 'yC': 4}
JUSTE2 = ['3x+4y-5=0', '4x-3y+4=0', '-\\frac{1}{25}', '\\frac{32}{25}', '5', '1', '\\frac{1}{2}',
          '(x-1)^2+\\left(y-\\frac{1}{2}\\right)^2=\\frac{25}{4}']
n1s += [spec('H fractionnaire : A(−1 ; 2), B(3 ; −1), C(2 ; 4)', 1, V, 'correct', JUSTE2),
        spec('H en décimaux', 1, V, 'correct', avec(avec(JUSTE2, 2, '-0,04'), 3, '1,28')),
        spec('Ω : demi-différence', 1, V, 'incorrect', avec(JUSTE2, 5, '2'), ERR_N1_DEMI_DIFF),
        spec('Cercle : AB² au second membre', 1, V, 'incorrect',
             avec(JUSTE2, 7, '(x-1)^2+\\left(y-\\frac{1}{2}\\right)^2=25'), ERR_N1_AB2_R)]

ecrire('n1-synthese-droite-projete-cercle', modele(
    'Synthèse : droite, perpendiculaire, projeté et cercle',
    'Dans un repère : équation de (AB), de la perpendiculaire à (AB) passant par C, coordonnées '
    'du projeté H de C sur (AB), longueur AB, milieu de [AB] et équation du cercle de diamètre '
    '[AB]',
    4, 480, n1, n1s))

# =============================================================================================
# N2 (F2) — Synthèse avec le produit scalaire : carré, projeté et cercle (1G21-2). Point 1SPE-437.
# Carré OABC de côté c, I(xI ; yI), H projeté de C sur (OI) : OI·OC = c·yI = OI × OH.
# (CH) : xI·x + yI·y − yI·c = 0. ε de centre D(xI/2 ; xI/2) passant par M0 = (yI ; c − xI),
# point entier de (CH) : x² + y² − xI·x − xI·y + K = 0. Le point M de la question 4 vaut, selon w :
# 0 → M0 (sur les deux) ; 1 → M0 + s·(−yI ; xI) (sur (CH) seulement) ; 2 → 2D − M0 (sur ε
# seulement) ; 3 → M0 + (1 ; −1) (sur aucun). Les conditions écartent les tirages qui tombent mal.
# =============================================================================================

COMMUNES_N2 = [
    var('S', 'eval:xI^2+yI^2'), var('PS', 'eval:c*yI'),
    var('x0', 'eval:yI'), var('y0', 'eval:c-xI'),
    var('N4', 'eval:(2*yI-xI)^2+(2*(c-xI)-xI)^2'),
    var('K', 'eval:-(yI^2+(c-xI)^2-xI*yI-xI*(c-xI))'),
    var('w', '0..3'), var('s', '-1'),
    # Indicatrices de w = 1, 2, 3 (polynômes de Lagrange sur 0..3)
    var('L1', 'eval:w*(w-2)*(w-3)/2'), var('L2', 'eval:-w*(w-1)*(w-3)/2'),
    var('L3', 'eval:w*(w-1)*(w-2)/6'),
    var('xM', 'eval:yI+L1*(-yI*s)+L2*(xI-2*yI)+L3'),
    var('yM', 'eval:c-xI+L1*(xI*s)+L2*(xI-2*(c-xI))-L3'),
    var('Fm', 'eval:xM^2+yM^2-xI*xM-xI*yM+K'),
    var('Lm', 'eval:xI*xM+yI*yM-yI*c'),
]
COND_N2 = ['yI < xI', 'K != 0', 'N4 != 0', 'w != 1 || Fm != 0', 'w != 2 || Lm != 0',
           'w != 3 || Fm != 0', 'w != 3 || Lm != 0']

XH2 = 'PS*xI/S'
YH2 = 'PS*yI/S'
EQ_CH = '{{xI}}x+{{yI}}y{{eval:-yI*c}}=0'
CERCLE_N2 = 'x^2+y^2-{{xI}}x-{{xI}}y{{K;+}}=0'
FIGURE_N2 = bloc(
    'figure',
    'fenetre: {{eval:floor(min(0,xI/2-sqrt(N4)/2))-1}} ; {{eval:ceil(max(c,xI/2+sqrt(N4)/2))+1}} ; '
    '{{eval:floor(min(0,xI/2-sqrt(N4)/2))-1}} ; {{eval:ceil(max(c,xI/2+sqrt(N4)/2))+1}}',
    'taille: moyenne',
    'axes: oui',
    'grille: oui',
    'description: Carré OABC dans un repère orthonormé quadrillé, droite (OI), point H sur (OI), '
    'segment [CH] et cercle ε de centre D.',
    '---',
    'O = point(0, 0, etiquette="bas-gauche")',
    'A = point({{c}}, 0, etiquette="bas-droite")',
    'B = point({{c}}, {{c}}, etiquette="haut-droite")',
    'C = point(0, {{c}}, etiquette="haut-gauche")',
    'polygone(O, A, B, C, couleur="bleu", epaisseur=2)',
    'I = point({{xI}}, {{yI}})',
    'droite(O, I)',
    'H = point(' + r2(XH2) + ', ' + r2(YH2) + ')',
    'segment(C, H)',
    'D = point(' + r2('xI/2') + ', ' + r2('xI/2') + ')',
    'M0 = point({{x0}}, {{y0}}, visible=faux)',
    'cercle(D, passant=M0, couleur="rouge")')
CHOIX_M = bloc('choix',
               'melanger: non',
               '- $M$ est sur $\\varepsilon$ et sur $(CH)$.',
               '- $M$ est sur $(CH)$, mais pas sur $\\varepsilon$.',
               '- $M$ est sur $\\varepsilon$, mais pas sur $(CH)$.',
               '- $M$ n\'est ni sur $\\varepsilon$, ni sur $(CH)$.')
ENONCE_N2 = (
    'Dans le repère orthonormé ci-dessous, $OABC$ est un carré de côté ${{c}}$ : $A({{c}}\\,;0)$, '
    '$B({{c}}\\,;{{c}})$ et $C(0\\,;{{c}})$. On place $I({{xI}}\\,;{{yI}})$, et $H$ est le projeté '
    'orthogonal de $C$ sur la droite $(OI)$. Le cercle $\\varepsilon$ a pour centre '
    '$D\\left({{eval:xI/2}}\\,;{{eval:xI/2}}\\right)$ et pour rayon ${{eval:sqrt(N4)/2}}$.\n\n'
    + FIGURE_N2 + '\n\n'
    '**1.** Donne les coordonnées des vecteurs $' + vec('OI') + '$ et $' + vec('OC') + '$, puis le '
    'produit scalaire $' + vec('OI') + '\\cdot' + vec('OC') + '$.\n\n'
    '$' + vec('OI') + '\\begin{pmatrix}?\\\\?\\end{pmatrix}$ et $' + vec('OC')
    + '\\begin{pmatrix}?\\\\?\\end{pmatrix}$\n\n'
    '$' + vec('OI') + '\\cdot' + vec('OC') + '=?$\n\n'
    '**2.** Comme $H$ est le projeté orthogonal de $C$ sur $(OI)$, $' + vec('OI') + '\\cdot'
    + vec('OC') + '=OI\\times OH$. Calcule $OI$, puis $OH$ (valeurs exactes).\n\n'
    '$OI=?$\n\n$OH=?$\n\n'
    '**3.** Donne une équation cartésienne de la droite $(CH)$.\n\n$?$\n\n'
    'Donne une équation de $\\varepsilon$ sous la forme développée $x^2+y^2+\\alpha x+\\beta y+'
    '\\gamma=0$.\n\n$?$\n\n'
    '**4.** On considère le point $M({{xM}}\\,;{{yM}})$. Que peut-on dire de $M$ ?\n\n' + CHOIX_M)

ERR_N2_LONGUEURS = ('Tu as multiplié les longueurs $OI$ et $OC$ : en coordonnées, le produit scalaire '
                    'vaut $xx\'+yy\'$.')
ERR_N2_CROISE = 'Tu as croisé les coordonnées : le produit scalaire vaut $xx\'+yy\'$.'
ERR_N2_OI2 = 'Tu as donné $OI^2$ : il reste à prendre la racine carrée.'
ERR_N2_SOMME = '$OI$ se calcule avec la racine de la somme des carrés des coordonnées.'
ERR_N2_OH_PS = ('Tu as donné le produit scalaire : $' + vec('OI') + '\\cdot' + vec('OC')
                + '=OI\\times OH$, il reste à diviser par $OI$.')
ERR_N2_OH_S = 'Tu as divisé par $OI^2$ : on divise le produit scalaire par $OI$.'
ERR_N2_PARALLELE = ('Ta droite est parallèle à $(OI)$ : $(CH)$ est perpendiculaire à $(OI)$, donc $'
                    + vec('OI') + '$ est un vecteur normal à $(CH)$.')
ERR_N2_PAR_O = 'Ta droite passe par $O$ : $(CH)$ passe par $C$.'
ERR_N2_SIGNES = ('Les signes du centre sont inversés : pour un centre d\'abscisse $a$, on développe '
                 '$\\left( x - a \\right)^2$, qui donne $-2 a x$.')
ERR_N2_CARRES = 'En développant, tu as oublié les carrés des coordonnées du centre.'
HINT_N2 = ('Le produit scalaire de deux vecteurs se calcule avec leurs coordonnées, $xx\'+yy\'$. '
           'Pour $(CH)$, $' + vec('OI') + '$ est un vecteur normal. Pour $M$, teste ses coordonnées '
           'dans les deux équations.')


def blanks_n2():
    return [
        case('{{xI}}'),
        case('{{yI}}'),
        case('0'),
        case('{{c}}'),
        case('{{PS}}', [erreur('{{eval:c*sqrt(S)}}', ERR_N2_LONGUEURS, 'Produit des longueurs'),
                        erreur('{{eval:c*xI}}', ERR_N2_CROISE, 'Coordonnées croisées')]),
        case('{{eval:sqrt(S)}}', [erreur('{{S}}', ERR_N2_OI2, 'OI² au lieu de OI'),
                                  erreur('{{eval:xI+yI}}', ERR_N2_SOMME, 'Somme des coordonnées')]),
        case('{{eval:PS/sqrt(S)}}', [erreur('{{PS}}', ERR_N2_OH_PS, 'Pas divisé par OI'),
                                     erreur('{{eval:PS/S}}', ERR_N2_OH_S, 'Divisé par OI²')]),
        case(EQ_CH, [erreur('{{yI}}x-{{xI}}y+{{eval:xI*c}}=0', ERR_N2_PARALLELE,
                            'OI pris comme vecteur directeur'),
                     erreur('{{xI}}x+{{yI}}y=0', ERR_N2_PAR_O, 'Passe par O')],
             {'answerKind': 'equation'}),
        case(CERCLE_N2, [erreur('x^2+y^2+{{xI}}x+{{xI}}y{{K;+}}=0', ERR_N2_SIGNES,
                                'Signes du centre inversés'),
                         erreur('x^2+y^2-{{xI}}x-{{xI}}y{{eval:-N4/4;+}}=0', ERR_N2_CARRES,
                                'Carrés du centre oubliés')],
             {'answerKind': 'equation', 'requiredForm': 'cartesienne'}),
        case('{{w}}'),
    ]


STEPS_N2 = [
    '$' + vec('OI') + '\\begin{pmatrix}' + P('{{xI}}') + '\\\\' + P('{{yI}}') + '\\end{pmatrix}$ et $'
    + vec('OC') + '\\begin{pmatrix}' + P('0') + '\\\\' + P('{{c}}') + '\\end{pmatrix}$, donc $'
    + vec('OI') + '\\cdot' + vec('OC') + '={{xI}}\\times 0+{{yI}}\\times {{c}}=' + P('{{PS}}') + '$.',
    '$OI=\\sqrt{ {{xI}}^2+{{yI}}^2 }=' + P('{{eval:sqrt(S)}}') + '$. Comme $' + vec('OI') + '$ et $'
    + vec('OH') + '$ ont le même sens, $' + vec('OI') + '\\cdot' + vec('OC') + '=OI\\times OH$, '
    'donc $OH=\\dfrac{ {{PS}} }{ {{eval:sqrt(S)}} }=' + P('{{eval:PS/sqrt(S)}}') + '$.',
    '$(CH)$ est perpendiculaire à $(OI)$, donc $' + vec('OI') + '$ est un vecteur normal à $(CH)$ : '
    '$(CH)$ a une équation de la forme ${{xI}}x+{{yI}}y+k=0$. $C$ est sur $(CH)$ : '
    '${{yI}}\\times {{c}}+k=0$, donc $k={{eval:-yI*c}}$ et $(CH) : ' + P(EQ_CH) + '$.',
    '$\\varepsilon : \\left(x-{{eval:xI/2}}\\right)^2+\\left(y-{{eval:xI/2}}\\right)^2='
    '{{eval:N4/4}}$. En développant : $x^2-{{xI}}x+{{eval:xI^2/4}}+y^2-{{xI}}y+{{eval:xI^2/4}}'
    '-{{eval:N4/4}}=0$, soit $' + P(CERCLE_N2) + '$.',
    'Avec $x={{xM}}$ et $y={{yM}}$ : dans l\'équation de $(CH)$, le premier membre vaut ${{Lm}}$ ; '
    'dans celle de $\\varepsilon$, il vaut ${{Fm}}$. $' + P(
        '{{if:w==0|\\text{M est sur les deux}}}{{if:w==1|\\text{M est sur (CH) seulement}}}'
        '{{if:w==2|\\text{M est sur ε seulement}}}{{if:w==3|\\text{M n\'est sur aucun des deux}}}')
    + '$ : un point est sur une courbe quand ses coordonnées en vérifient l\'équation.',
]

n2, n2s = [], []
# V1 : OI irrationnel.
n2.append(variation(
    ENONCE_N2,
    [var('xI', '3..6'), var('yI', '1..5'), var('j', '1..4'), var('c', 'eval:xI+j')] + COMMUNES_N2,
    blanks_n2(), STEPS_N2, HINT_N2,
    ['S != 25'] + COND_N2))
# V2 : I(4 ; 3), OI = 5.
n2.append(variation(
    ENONCE_N2,
    [var('xI', '4'), var('yI', '3'), var('j', '1..4'), var('c', 'eval:xI+j')] + COMMUNES_N2,
    blanks_n2(), STEPS_N2, HINT_N2,
    COND_N2))

# V1 : I(5 ; 2), c = 7, M0 = (2 ; 2), D(5/2 ; 5/2), N4 = 2, K = 12.
# ε : x² + y² − 5x − 5y + 12 = 0 ; (CH) : 5x + 2y − 14 = 0 ; OI·OC = 14, OI = √29.
V = {'xI': 5, 'yI': 2, 'j': 2, 'w': 0, 's': -1}
JUSTE_N2 = ['5', '2', '0', '7', '14', '\\sqrt{29}', '\\frac{14\\sqrt{29}}{29}', '5x+2y-14=0',
            'x^2+y^2-5x-5y+12=0', '0']
n2s += [spec('I(5 ; 2), c = 7, M(2 ; 2) sur les deux', 0, V, 'correct', JUSTE_N2),
        spec('Produit des longueurs', 0, V, 'incorrect', avec(JUSTE_N2, 4, '7\\sqrt{29}'),
             ERR_N2_LONGUEURS),
        spec('OI²', 0, V, 'incorrect', avec(JUSTE_N2, 5, '29'), ERR_N2_OI2),
        spec('OH : pas divisé par OI', 0, V, 'incorrect', avec(JUSTE_N2, 6, '14'), ERR_N2_OH_PS),
        spec('(CH) parallèle à (OI)', 0, V, 'incorrect', avec(JUSTE_N2, 7, '2x-5y+35=0'),
             ERR_N2_PARALLELE),
        spec('(CH) par O', 0, V, 'incorrect', avec(JUSTE_N2, 7, '5x+2y=0'), ERR_N2_PAR_O),
        spec('ε : signes inversés', 0, V, 'incorrect', avec(JUSTE_N2, 8, 'x^2+y^2+5x+5y+12=0'),
             ERR_N2_SIGNES),
        spec('M dit sur (CH) seulement', 0, V, 'incorrect', avec(JUSTE_N2, 9, '1'))]
V = {'xI': 5, 'yI': 2, 'j': 2, 'w': 1, 's': -1}
n2s += [spec('M(4 ; −3) sur (CH) seulement', 0, V, 'correct', avec(JUSTE_N2, 9, '1'))]
V = {'xI': 5, 'yI': 2, 'j': 2, 'w': 3, 's': -1}
n2s += [spec('M(3 ; 1) sur aucun', 0, V, 'correct', avec(JUSTE_N2, 9, '3'))]
# V2 : I(4 ; 3), c = 6, M0 = (3 ; 2), D(2 ; 2), N4 = 4, K = 7, w = 2 : M = (1 ; 2).
# ε : x² + y² − 4x − 4y + 7 = 0 ; (CH) : 4x + 3y − 18 = 0 ; OI·OC = 18, OI = 5, OH = 18/5.
V = {'j': 2, 'w': 2, 's': -1}
JUSTE_N2B = ['4', '3', '0', '6', '18', '5', '\\frac{18}{5}', '4x+3y-18=0', 'x^2+y^2-4x-4y+7=0', '2']
n2s += [spec('I(4 ; 3), c = 6, M(1 ; 2) sur ε seulement', 1, V, 'correct', JUSTE_N2B),
        spec('OH en décimal', 1, V, 'correct', avec(JUSTE_N2B, 6, '3,6')),
        spec('OH divisé par OI²', 1, V, 'incorrect', avec(JUSTE_N2B, 6, '\\frac{18}{25}'),
             ERR_N2_OH_S),
        spec('ε : carrés du centre oubliés', 1, V, 'incorrect',
             avec(JUSTE_N2B, 8, 'x^2+y^2-4x-4y-1=0'), ERR_N2_CARRES)]

ecrire('n2-synthese-carre-projete-cercle', modele(
    'Synthèse avec le produit scalaire : carré, projeté et cercle',
    'Carré OABC dans un repère, H projeté de C sur (OI) : coordonnées, produit scalaire OI·OC, '
    'longueurs OI et OH, équation de (CH), équation développée d\'un cercle, position d\'un point',
    5, 600, n2, n2s))

for nom, vs, ss in [('N1', n1, n1s), ('N2', n2, n2s)]:
    print(nom, ':', len(vs), 'variations,', len(ss), 'specs')
