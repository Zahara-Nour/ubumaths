"""Ajoute les variations validées aux 7 modèles publiés exportés de prod dans
scripts/questions/idees-1re-produit-scalaire-publies/ (chantier idees-1re-produit-scalaire).

Phase 0 : David, le 2026-11-26, « je valide tout » (page à cocher
https://claude.ai/artifact/Pq3pagc1h93TH99Lo5hgze) : F6 (b73923a1), F7 (9c7f7ef0), F8 (d787d8c0),
F9 (fe407c88, 3 variations), F10 (f2cc01fc), F11 (6058963e, 2 variations), F12 (bf5dadf6,
2 variations). Les variations s'ajoutent À LA FIN (les réponses des élèves gardent l'indice de leur
variation) ; la migration de contenu est générée par scripts/questions/migration-contenu.ts.

Le script repart du contenu de prod (variations et specs d'origine, comptées dans ORIGINE) :
le relancer réécrit les ajouts sans les doubler.

f2cc01fc a un écart ouvert (termes nuls dans le corrigé, docs/wip/ecarts-tri/pedagogie.md) : la
variation ajoutée n'en écrit pas (coordonnées non nulles).

Usage : python3 docs/wip/questions/idees-1re-produit-scalaire-publies.py scripts/questions/idees-1re-produit-scalaire-publies
"""
import importlib.util
import json
import os
import sys

_chemin = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       'idees-1re-produit-scalaire-commun.py')
_spec = importlib.util.spec_from_file_location('commun', _chemin)
C = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(C)
spec, var, erreur, case, variation = C.spec, C.var, C.erreur, C.case, C.variation
bloc, si, vec, ps, r2 = C.bloc, C.si, C.vec, C.ps, C.r2
PRIMAIRE, REPERE = C.PRIMAIRE, C.REPERE

DOSSIER = sys.argv[1]

# id court → (variations, specs) d'origine en prod (export du 2026-11-26)
ORIGINE = {'b73923a1': (4, 13), '9c7f7ef0': (4, 13), 'd787d8c0': (4, 15), 'fe407c88': (4, 13),
           'f2cc01fc': (4, 15), '6058963e': (4, 15), 'bf5dadf6': (6, 29)}


def P(texte):
    return PRIMAIRE + '{ ' + texte + ' }'


def ajouter(court, variations, specs):
    chemin = os.path.join(DOSSIER, court + '.json')
    with open(chemin, encoding='utf-8') as f:
        m = json.load(f)
    nv, ns = ORIGINE[court]
    assert len(m['variations']) >= nv and len(m['testSpecs']) >= ns, court
    m['variations'] = m['variations'][:nv]
    m['testSpecs'] = m['testSpecs'][:ns]
    for s in specs:
        s['variationIndex'] += nv
    m['variations'] += variations
    m['testSpecs'] += specs
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(court, ':', len(variations), 'variations,', len(specs), 'specs ajoutées')


def carre(*coords):
    """Demi-côté d'une fenêtre carrée centrée sur l'origine qui contient les coordonnées."""
    return '{{eval:max(' + ','.join('abs(' + c + ')' for c in coords) + ')+1}}'


# =============================================================================================
# F6 — b73923a1 : rectangle de centre O, I milieu de [AB] (1G10-2, cas 1). Point 1SPE-321.
# AB·AO = AB·AI = L²/2 ; CA·AI = −L²/2 ; ID·BC = (IA + AD)·AD = l².
# =============================================================================================

ERR_O_B = 'Le projeté de $O$ sur $(AB)$ est $I$, le milieu de $[AB]$, pas $B$.'
ERR_O_LONG = 'Tu as multiplié les longueurs $AB$ et $AO$ : projette d\'abord $O$ sur $(AB)$.'
ERR_CA_SIGNE = ('Projetés sur $(AB)$, $' + vec('CA') + '$ et $' + vec('AI') + '$ sont de sens '
                'contraires : le produit est négatif.')
ERR_CA_AB = 'Projeté sur $(AB)$, $' + vec('CA') + '$ devient $' + vec('BA') + '$, et $AI$ vaut la moitié de $AB$.'
ERR_ID_SIGNE = ('Projetés sur $(AD)$, $' + vec('ID') + '$ et $' + vec('BC') + '$ sont de même '
                'sens : le produit est positif.')
ERR_ID_NUL = 'Les droites $(ID)$ et $(BC)$ ne sont pas perpendiculaires : projette $I$ et $D$ sur $(AD)$.'
ERR_ID_LONG = 'Tu as multiplié les longueurs : projette d\'abord $' + vec('ID') + '$ sur $(AD)$.'

fig_rect = bloc('figure',
                'fenetre: -1.3 ; {{eval:L+1}} ; -1.2 ; {{eval:l+1}}',
                'taille: petite',
                'description: Rectangle ABCD de centre O ; I est le milieu de AB.',
                '---',
                'A = point(0, 0, etiquette="bas-gauche")',
                'B = point({{L}}, 0, etiquette="bas-droite")',
                'C = point({{L}}, {{l}}, etiquette="haut-droite")',
                'D = point(0, {{l}}, etiquette="haut-gauche")',
                'polygone(A, B, C, D)',
                'angle(A, B, C, marque="carre")',
                'O = milieu(A, C, etiquette="haut")',
                'I = milieu(A, B, etiquette="bas")',
                'segment(A, C)',
                'segment(B, D)',
                'segment(I, D)',
                'segment(O, I, trait="tirets")',
                'angle(B, I, O, marque="carre")',
                'marque_segment(A, I)',
                'marque_segment(I, B)')
vb, sb = [], []
vb.append(variation(
    '$ABCD$ est un rectangle de centre $O$ tel que $AB={{L}}$ et $AD={{l}}$ ; $I$ est le milieu '
    'de $[AB]$.\n\n' + fig_rect + '\n\nCalcule les produits scalaires suivants.\n\n$'
    + ps('AB', 'AO') + '=?$\n\n$' + ps('CA', 'AI') + '=?$\n\n$' + ps('ID', 'BC') + '=?$',
    [var('L', '6|8|10|12|14'), var('l', '3..8')],
    [case('{{eval:L*L/2}}', [erreur('{{eval:L*L}}', ERR_O_B, 'Projeté en B'),
                             erreur('{{eval:L*sqrt(L^2+l^2)/2}}', ERR_O_LONG, 'Produit des longueurs')]),
     case('{{eval:-L*L/2}}', [erreur('{{eval:L*L/2}}', ERR_CA_SIGNE, 'Signe faux'),
                              erreur('{{eval:-L*L}}', ERR_CA_AB, 'AB au lieu de AI')]),
     case('{{eval:l*l}}', [erreur('{{eval:-l*l}}', ERR_ID_SIGNE, 'Signe faux'),
                           erreur('0', ERR_ID_NUL, 'Pris nul'),
                           erreur('{{eval:l*sqrt(L^2/4+l^2)}}', ERR_ID_LONG, 'Produit des longueurs')])],
    ['Le projeté orthogonal de $O$ sur $(AB)$ est $I$ : $' + ps('AB', 'AO') + '=' + ps('AB', 'AI')
     + '=AB\\times AI={{L}}\\times {{eval:L/2}}=' + P('{{eval:L*L/2}}') + '$.',
     'Le projeté orthogonal de $C$ sur $(AB)$ est $B$ : $' + ps('CA', 'AI') + '=' + ps('BA', 'AI')
     + '$, vecteurs de sens contraires, donc $' + ps('CA', 'AI') + '=-BA\\times AI=-{{L}}\\times '
     '{{eval:L/2}}=' + P('{{eval:-L*L/2}}') + '$.',
     'Par Chasles, $' + vec('ID') + '=' + vec('IA') + '+' + vec('AD') + '$ et $' + vec('BC') + '='
     + vec('AD') + '$. Comme $' + ps('IA', 'AD') + '=0$ (côtés perpendiculaires), $'
     + ps('ID', 'BC') + '=AD^2={{l}}^2=' + P('{{eval:l*l}}') + '$.'],
    'Projette $O$ sur $(AB)$ : c\'est $I$. Pour $' + ps('ID', 'BC') + '$, décompose $' + vec('ID')
    + '$ avec la relation de Chasles en passant par $A$.',
    ['l < L']))
V = {'L': 8, 'l': 3}
sb += [spec('L = 8, l = 3 : 32, −32, 9', 0, V, 'correct', ['32', '-32', '9']),
       spec('AO projeté en B : 64', 0, V, 'incorrect', ['64', '-32', '9'], ERR_O_B),
       spec('CA·AI positif', 0, V, 'incorrect', ['32', '32', '9'], ERR_CA_SIGNE),
       spec('CA·AI avec AB : −64', 0, V, 'incorrect', ['32', '-64', '9'], ERR_CA_AB),
       spec('ID·BC négatif', 0, V, 'incorrect', ['32', '-32', '-9'], ERR_ID_SIGNE),
       spec('ID·BC pris nul', 0, V, 'incorrect', ['32', '-32', '0'], ERR_ID_NUL)]
V = {'L': 6, 'l': 5}
sb += [spec('L = 6, l = 5 : 18, −18, 25', 0, V, 'correct', ['18', '-18', '25'])]
ajouter('b73923a1', vb, sb)

# =============================================================================================
# F7 — 9c7f7ef0 : triangle et hauteur, vecteurs de sens opposés (1G10-2, cas 2). Point 1SPE-321.
# H entre A et B : BA·AC = −AB × AH ; HB·CA = HB·HA = −HB × HA.
# =============================================================================================

ERR_BA_SIGNE = ('Projetés sur $(AB)$, $' + vec('BA') + '$ et $' + vec('AH') + '$ sont de sens '
                'contraires : le produit est négatif.')
ERR_CH = 'La longueur $CH$ ne sert pas : c\'est le projeté de $C$ sur $(AB)$ qui compte.'
ERR_HB_SIGNE = ('Projeté sur $(AB)$, $' + vec('CA') + '$ devient $' + vec('HA') + '$, de sens '
                'contraire à $' + vec('HB') + '$.')
ERR_HB_AB = 'Projeté sur $(AB)$, $' + vec('CA') + '$ devient $' + vec('HA') + '$ : multiplie $HB$ par $HA$.'
fig_haut = bloc('figure',
                'fenetre: -1.5 ; {{eval:c+2}} ; -1.3 ; {{eval:h+1}}',
                'taille: moyenne',
                'description: Triangle ABC ; H, pied de la hauteur issue de C, est situé entre A et B.',
                '---',
                'A = point(0, 0, etiquette="bas-gauche")',
                'B = point({{c}}, 0, etiquette="bas-droite")',
                'C = point({{p}}, {{h}}, etiquette="haut")',
                'H = point({{p}}, 0, etiquette="bas")',
                'polygone(A, B, C)',
                'segment(C, H, trait="tirets")',
                'angle(C, H, B, marque="carre")')
v9, s9 = [], []
v9.append(variation(
    'Dans le triangle $ABC$ ci-dessous, $H$ est le pied de la hauteur issue de $C$. On donne '
    '$AB={{c}}$, $AH={{p}}$ et $CH={{h}}$.\n\n' + fig_haut + '\n\nCalcule les produits scalaires '
    'suivants.\n\n$' + ps('BA', 'AC') + '=?$\n\n$' + ps('HB', 'CA') + '=?$',
    [var('c', '5..8'), var('p', '1..{{eval:c-1}}'), var('h', '2..4')],
    [case('{{eval:-c*p}}', [erreur('{{eval:c*p}}', ERR_BA_SIGNE, 'Signe faux'),
                            erreur('{{eval:-c*h}}', ERR_CH, 'CH utilisé')]),
     case('{{eval:-(c-p)*p}}', [erreur('{{eval:(c-p)*p}}', ERR_HB_SIGNE, 'Signe faux'),
                                erreur('{{eval:-c*p}}', ERR_HB_AB, 'AB × AH'),
                                erreur('{{eval:-(c-p)*h}}', ERR_CH, 'CH utilisé')])],
    ['Le projeté orthogonal de $C$ sur $(AB)$ est $H$ : $' + ps('BA', 'AC') + '=' + ps('BA', 'AH')
     + '$. Les vecteurs $' + vec('BA') + '$ et $' + vec('AH') + '$ sont de sens contraires, donc $'
     + ps('BA', 'AC') + '=-BA\\times AH=-{{c}}\\times {{p}}=' + P('{{eval:-c*p}}') + '$.',
     'De même, $' + ps('HB', 'CA') + '=' + ps('HB', 'HA') + '$, et $' + vec('HB') + '$, $' + vec('HA')
     + '$ sont de sens contraires : $' + ps('HB', 'CA') + '=-HB\\times HA=-{{eval:c-p}}\\times {{p}}='
     + P('{{eval:-(c-p)*p}}') + '$.', 'La longueur $CH$ n\'intervient pas.'],
    'Remplace le vecteur qui part de $C$ par son projeté sur $(AB)$, puis regarde si les deux '
    'vecteurs sont de même sens.',
    ['p != h', 'c-p != h']))
V = {'c': 6, 'p': 2, 'h': 3}
s9 += [spec('c = 6, p = 2 : −12, −8', 0, V, 'correct', ['-12', '-8']),
       spec('BA·AC positif', 0, V, 'incorrect', ['12', '-8'], ERR_BA_SIGNE),
       spec('BA·AC avec CH : −18', 0, V, 'incorrect', ['-18', '-8'], ERR_CH),
       spec('HB·CA positif', 0, V, 'incorrect', ['-12', '8'], ERR_HB_SIGNE),
       spec('HB·CA = −AB × AH', 0, V, 'incorrect', ['-12', '-12'], ERR_HB_AB)]
V = {'c': 8, 'p': 5, 'h': 2}
s9 += [spec('c = 8, p = 5 : −40, −15', 0, V, 'correct', ['-40', '-15'])]
ajouter('9c7f7ef0', v9, s9)

# =============================================================================================
# F8 — d787d8c0 : normes, vecteurs d'origines différentes (1G10-4, cas 3). Point 1SPE-321.
# BA·AC = −AB·AC = −(AB² + AC² − BC²)/2.
# =============================================================================================

ERR_BA_MOINS = '$' + vec('BA') + '=-' + vec('AB') + '$ : le signe change.'
ERR_DEMI = 'N\'oublie pas le facteur $\\dfrac{1}{2}$.'
ERR_SOMMET_B = 'Tu as calculé $' + ps('BA', 'BC') + '$ : ici, les deux vecteurs ne partent pas du même point.'
vd, sd = [], []
vd.append(variation(
    '$ABC$ est un triangle tel que $AB={{a}}$, $AC={{b}}$ et $BC={{c}}$.\n\nCalcule le produit '
    'scalaire $' + ps('BA', 'AC') + '$. Donne sa valeur exacte.\n\n$' + ps('BA', 'AC') + '=?$',
    [var('a', '2..8'), var('b', '2..8'), var('c', '{{eval:abs(a-b)+1}}..{{eval:a+b-1}}'),
     var('N', '{{eval:a*a+b*b-c*c}}')],
    [case('{{eval:-N/2}}', [erreur('{{eval:N/2}}', ERR_BA_MOINS, 'Signe oublié'),
                            erreur('{{eval:-N}}', ERR_DEMI, 'Facteur 1/2 oublié'),
                            erreur('{{eval:(a*a+c*c-b*b)/2}}', ERR_SOMMET_B, 'BA·BC')])],
    ['$' + vec('BA') + '=-' + vec('AB') + '$, donc $' + ps('BA', 'AC') + '=-' + ps('AB', 'AC') + '$.',
     '$' + ps('AB', 'AC') + '=\\dfrac{1}{2}\\left(AB^2+AC^2-BC^2\\right)=\\dfrac{1}{2}\\left({{a}}^2'
     '+{{b}}^2-{{c}}^2\\right)={{eval:N/2}}$.',
     '$' + ps('BA', 'AC') + '=' + P('{{eval:-N/2}}') + '$.'],
    '$' + vec('BA') + '=-' + vec('AB') + '$ : calcule d\'abord $' + ps('AB', 'AC') + '$ avec les '
    'trois longueurs.',
    ['N != 0', 'a != b', 'b != c', 'a != c']))
V = {'a': 5, 'b': 6, 'c': 7}   # AB·AC = 6
sd += [spec('5, 6, 7 : −6', 0, V, 'correct', ['-6']),
       spec('signe oublié 6', 0, V, 'incorrect', ['6'], ERR_BA_MOINS),
       spec('1/2 oublié −12', 0, V, 'incorrect', ['-12'], ERR_DEMI),
       spec('BA·BC : (25 + 49 − 36)/2 = 19', 0, V, 'incorrect', ['19'], ERR_SOMMET_B)]
V = {'a': 3, 'b': 4, 'c': 6}   # N = −11, réponse 11/2
sd += [spec('3, 4, 6 : 11/2', 0, V, 'correct', ['\\frac{11}{2}']),
       spec('3, 4, 6 : 5,5', 0, V, 'correct', ['5{,}5'])]
ajouter('d787d8c0', vd, sd)

# =============================================================================================
# F9 — fe407c88 : combinaisons et vecteurs dessinés (1G10-5, cas 3 et 4). Point 1SPE-321.
# =============================================================================================

BASE = 'Dans une base orthonormée, on considère les vecteurs '
U = '$\\vec{u}\\begin{pmatrix}{{x1}}\\\\{{y1}}\\end{pmatrix}$'
V_ = '$\\vec{v}\\begin{pmatrix}{{x2}}\\\\{{y2}}\\end{pmatrix}$'
W_ = '$\\vec{w}\\begin{pmatrix}{{x3}}\\\\{{y3}}\\end{pmatrix}$'
COORDS = [var('x1', '-6..6!0'), var('y1', '-6..6!0'), var('x2', '-6..6!0'), var('y2', '-6..6!0')]
ERR_K2 = 'Le réel $k$ ne multiplie qu\'un des deux vecteurs : $(k\\vec{u})\\cdot\\vec{v}=k\\,(\\vec{u}\\cdot\\vec{v})$.'
ERR_K_OUBLIE = 'N\'oublie pas le facteur $k$.'
ERR_K_X = 'Le réel $k$ multiplie les deux coordonnées de $\\vec{u}$.'
ERR_W_SIGNE = 'Attention au signe devant $\\vec{w}$.'
ERR_W_OUBLIE = 'N\'oublie pas le produit $\\vec{u}\\cdot\\vec{w}$.'
ERR_POINTES = ('Les coordonnées d\'un vecteur se lisent de son origine à sa pointe, pas depuis '
               'l\'origine du repère.')
ERR_CROISE = 'On multiplie les abscisses entre elles et les ordonnées entre elles : $xx\'+yy\'$.'
ERR_ENVERS = 'Tu as lu un vecteur à l\'envers : on compte de l\'origine vers la pointe de la flèche.'

vf, sf = [], []
# V5 : (k u)·v
vf.append(variation(
    BASE + U + ' et ' + V_ + '.\n\nCalcule $({{k}}\\vec{u})\\cdot\\vec{v}$.\n\n$({{k}}\\vec{u})'
    '\\cdot\\vec{v}=?$',
    COORDS + [var('k', '-5..5!0,1'), var('D', 'eval:x1*x2+y1*y2')],
    [case('{{eval:k*D}}', [erreur('{{eval:k^2*D}}', ERR_K2, 'k appliqué aux deux vecteurs'),
                           erreur('{{D}}', ERR_K_OUBLIE, 'Facteur oublié'),
                           erreur('{{eval:k*x1*x2+y1*y2}}', ERR_K_X, 'k sur l\'abscisse seule')])],
    ['$({{k}}\\vec{u})\\cdot\\vec{v}={{k}}\\,(\\vec{u}\\cdot\\vec{v})$.',
     '$\\vec{u}\\cdot\\vec{v}={{x1}}\\times {{x2;()}}+{{y1;()}}\\times {{y2;()}}={{D}}$.',
     '$({{k}}\\vec{u})\\cdot\\vec{v}={{k}}\\times {{D;()}}=' + P('{{eval:k*D}}') + '$.'],
    'Le produit scalaire est bilinéaire : $(k\\vec{u})\\cdot\\vec{v}=k\\,(\\vec{u}\\cdot\\vec{v})$. '
    'Tu peux aussi calculer d\'abord les coordonnées de $k\\vec{u}$.',
    ['D != 0']))
V = {'x1': 2, 'y1': -3, 'x2': 4, 'y2': 1, 'k': -2}   # D = 5, réponse −10
sf += [spec('k = −2, u·v = 5 : −10', 0, V, 'correct', ['-10']),
       spec('k² : 20', 0, V, 'incorrect', ['20'], ERR_K2),
       spec('k oublié : 5', 0, V, 'incorrect', ['5'], ERR_K_OUBLIE),
       spec('k sur x seulement : −19', 0, V, 'incorrect', ['-19'], ERR_K_X)]

# V6 : u·(v + w) ou u·(v − w)
vf.append(variation(
    BASE + U + ', ' + V_ + ' et ' + W_ + '.\n\nCalcule $\\vec{u}\\cdot(\\vec{v}' + si('o==0', '+')
    + si('o==1', '-') + '\\vec{w})$.\n\n$\\vec{u}\\cdot(\\vec{v}' + si('o==0', '+') + si('o==1', '-')
    + '\\vec{w})=?$',
    COORDS + [var('x3', '-6..6!0'), var('y3', '-6..6!0'), var('o', '0..1'), var('sg', 'eval:1-2*o'),
              var('D1', 'eval:x1*x2+y1*y2'), var('D2', 'eval:x1*x3+y1*y3')],
    [case('{{eval:D1+sg*D2}}', [erreur('{{eval:D1-sg*D2}}', ERR_W_SIGNE, 'Signe de w'),
                                erreur('{{D1}}', ERR_W_OUBLIE, 'u·w oublié')])],
    ['$\\vec{u}\\cdot(\\vec{v}' + si('o==0', '+') + si('o==1', '-') + '\\vec{w})=\\vec{u}\\cdot\\vec{v}'
     + si('o==0', '+') + si('o==1', '-') + '\\vec{u}\\cdot\\vec{w}$.',
     '$\\vec{u}\\cdot\\vec{v}={{x1}}\\times {{x2;()}}+{{y1;()}}\\times {{y2;()}}={{D1}}$ et $\\vec{u}'
     '\\cdot\\vec{w}={{x1}}\\times {{x3;()}}+{{y1;()}}\\times {{y3;()}}={{D2}}$.',
     '$\\vec{u}\\cdot(\\vec{v}' + si('o==0', '+') + si('o==1', '-') + '\\vec{w})={{D1}}'
     + si('o==0', '+') + si('o==1', '-') + '{{D2;()}}=' + P('{{eval:D1+sg*D2}}') + '$.'],
    'Calcule d\'abord les coordonnées de $\\vec{v}' + si('o==0', '+') + si('o==1', '-')
    + '\\vec{w}$, ou développe : $\\vec{u}\\cdot(\\vec{v}+\\vec{w})=\\vec{u}\\cdot\\vec{v}+\\vec{u}'
    '\\cdot\\vec{w}$.',
    ['D2 != 0', 'D1+sg*D2 != 0']))
V = {'x1': 1, 'y1': 2, 'x2': 3, 'y2': -1, 'x3': 2, 'y3': 4, 'o': 0}   # D1 = 1, D2 = 10 → 11
sf += [spec('u·(v + w) = 11', 1, V, 'correct', ['11']),
       spec('signe de w : −9', 1, V, 'incorrect', ['-9'], ERR_W_SIGNE),
       spec('u·w oublié : 1', 1, V, 'incorrect', ['1'], ERR_W_OUBLIE)]
V = {'x1': 1, 'y1': 2, 'x2': 3, 'y2': -1, 'x3': 2, 'y3': 4, 'o': 1}   # 1 − 10 = −9
sf += [spec('u·(v − w) = −9', 1, V, 'correct', ['-9'])]

# V7 : vecteurs dessinés dans un repère quadrillé
FIG_VEC = bloc('figure',
               'fenetre: -M ; M ; -M ; M'.replace('M', carre('ax', 'ay', 'ax+x1', 'ay+y1', 'bx', 'by',
                                                            'bx+x2', 'by+y2')),
               'taille: moyenne',
               'axes: oui',
               'grille: oui',
               'description: Repère orthonormé quadrillé ; le vecteur u est en bleu, le vecteur v '
               'en rouge.',
               '---',
               'vecteur({{x1}}, {{y1}}, ancre=({{ax}}, {{ay}}), couleur="bleu")',
               'vecteur({{x2}}, {{y2}}, ancre=({{bx}}, {{by}}), couleur="rouge")')
vf.append(variation(
    'Dans le repère orthonormé ci-dessous, le vecteur $\\vec{u}$ est dessiné en bleu et le vecteur '
    '$\\vec{v}$ en rouge.\n\n' + FIG_VEC + '\n\nCalcule $\\vec{u}\\cdot\\vec{v}$.\n\n$\\vec{u}\\cdot'
    '\\vec{v}=?$',
    [var('x1', '-4..4!0'), var('y1', '-4..4!0'), var('x2', '-4..4!0'), var('y2', '-4..4!0'),
     var('ax', '-3..3'), var('ay', '-3..3'), var('bx', '-3..3'), var('by', '-3..3'),
     var('D', 'eval:x1*x2+y1*y2')],
    [case('{{D}}', [erreur('{{eval:(ax+x1)*(bx+x2)+(ay+y1)*(by+y2)}}', ERR_POINTES, 'Pointes lues'),
                    erreur('{{eval:x1*y2+y1*x2}}', ERR_CROISE, 'Coordonnées croisées'),
                    erreur('{{eval:-D}}', ERR_ENVERS, 'Vecteur lu à l\'envers')])],
    ['On lit les coordonnées en comptant les carreaux de l\'origine à la pointe de chaque flèche : '
     '$\\vec{u}\\begin{pmatrix}{{x1}}\\\\{{y1}}\\end{pmatrix}$ et $\\vec{v}\\begin{pmatrix}{{x2}}\\\\'
     '{{y2}}\\end{pmatrix}$.',
     '$\\vec{u}\\cdot\\vec{v}={{x1}}\\times {{x2;()}}+{{y1;()}}\\times {{y2;()}}=' + P('{{D}}') + '$.'],
    'Compte les carreaux de l\'origine à la pointe de chaque flèche : d\'abord horizontalement, '
    'puis verticalement.',
    ['D != 0', 'abs(ax+x1) <= 6', 'abs(ay+y1) <= 6', 'abs(bx+x2) <= 6', 'abs(by+y2) <= 6',
     'abs(ax-bx)+abs(ay-by) >= 3']))
V = {'x1': 3, 'y1': 1, 'x2': -1, 'y2': 2, 'ax': -2, 'ay': 0, 'bx': 1, 'by': -2}   # D = −1
sf += [spec('u(3 ; 1), v(−1 ; 2) : −1', 2, V, 'correct', ['-1']),
       spec('pointes lues : 1×0 + 1×0 = 0', 2, V, 'incorrect', ['0'], ERR_POINTES),
       spec('croisées : 3×2 + 1×(−1) = 5', 2, V, 'incorrect', ['5'], ERR_CROISE),
       spec('à l\'envers : 1', 2, V, 'incorrect', ['1'], ERR_ENVERS)]
ajouter('fe407c88', vf, sf)

# =============================================================================================
# F10 — f2cc01fc : quatre points, deux droites (1G11-1, cas 1). Point 1SPE-318.
# AB(p ; q), CD(x ; y) = k(−q ; p) + t(r ; s) : orthogonaux quand t = 0.
# =============================================================================================

CHOIX_PERP = bloc('choix', 'melanger: non',
                  '- Oui, les droites $(AB)$ et $(CD)$ sont perpendiculaires.',
                  '- Non, les droites $(AB)$ et $(CD)$ ne sont pas perpendiculaires.')
ERR_AC = 'Tu as pris $' + vec('AC') + '$ : la seconde droite est $(CD)$, de vecteur directeur $' + vec('CD') + '$.'
ERR_MOINS = 'Le produit scalaire s\'écrit $xx\'+yy\'$, avec un plus.'
ERR_DET = 'Tu as calculé $xy\'-yx\'$ : c\'est le critère de colinéarité, pas d\'orthogonalité.'
v2c, s2c = [], []
v2c.append(variation(
    REPERE + ' On considère les points $A({{xa}}\\,;{{ya}})$, $B({{xb}}\\,;{{yb}})$, $C({{xc}}\\,;'
    '{{yc}})$ et $D({{xd}}\\,;{{yd}})$.\n\nCalcule $' + ps('AB', 'CD') + '$.\n\n$' + ps('AB', 'CD')
    + '=?$\n\nLes droites $(AB)$ et $(CD)$ sont-elles perpendiculaires ?\n\n' + CHOIX_PERP,
    [var('xa', '-4..4'), var('ya', '-4..4'), var('xc', '-4..4'), var('yc', '-4..4'),
     var('p', '-6..6!0'), var('q', '-6..6!0'), var('k', '1..2'), var('w', '0..1'),
     var('r', '-2..2'), var('s', '-2..2'), var('t', 'eval:w'),
     var('x', 'eval:-k*q+t*r'), var('y', 'eval:k*p+t*s'), var('N', 'eval:p*x+q*y'),
     var('xb', 'eval:xa+p'), var('yb', 'eval:ya+q'), var('xd', 'eval:xc+x'), var('yd', 'eval:yc+y')],
    [case('{{N}}', [erreur('{{eval:p*(xc-xa)+q*(yc-ya)}}', ERR_AC, 'AC au lieu de CD'),
                    erreur('{{eval:p*x-q*y}}', ERR_MOINS, 'Moins au lieu de plus'),
                    erreur('{{eval:p*y-q*x}}', ERR_DET, 'Déterminant')]),
     case('{{eval:abs(sign(N))}}')],
    ['$' + vec('AB') + '\\begin{pmatrix}{{p}}\\\\{{q}}\\end{pmatrix}$ et $' + vec('CD')
     + '\\begin{pmatrix}{{x}}\\\\{{y}}\\end{pmatrix}$.',
     '$' + ps('AB', 'CD') + '={{p}}\\times {{x;()}}+{{q;()}}\\times {{y;()}}={{eval:p*x}}{{eval:q*y;+}}='
     + P('{{N}}') + '$.',
     si('N==0', 'Le produit scalaire est nul : $' + vec('AB') + '$ et $' + vec('CD') + '$ sont '
        'orthogonaux, donc les droites $(AB)$ et $(CD)$ **sont perpendiculaires**.')
     + si('N!=0', 'Le produit scalaire n\'est pas nul : les droites $(AB)$ et $(CD)$ **ne sont pas '
          'perpendiculaires**.')],
    'Deux droites sont perpendiculaires quand leurs vecteurs directeurs sont orthogonaux, '
    'c\'est-à-dire quand leur produit scalaire est nul.',
    ['abs(p) != abs(q)', 'x != 0', 'y != 0', 't*(abs(r)+abs(s)) != 1',
     't == 0 || r != 0 || s != 0', 'abs(xb) <= 9', 'abs(yb) <= 9', 'abs(xd) <= 9', 'abs(yd) <= 9',
     'xc != xa || yc != ya']))
V = {'xa': 1, 'ya': 1, 'xc': -2, 'yc': 0, 'p': 2, 'q': 3, 'k': 1, 'w': 0, 'r': 0, 's': 0}
# AB(2 ; 3), CD(−3 ; 2) : N = 0 ; AC(−3 ; −1) → −9 ; p·x − q·y = −12 ; p·y − q·x = 13
s2c += [spec('perpendiculaires : 0, oui', 0, V, 'correct', ['0', '0']),
        spec('AC au lieu de CD : −9', 0, V, 'incorrect', ['-9', '0'], ERR_AC),
        spec('moins : −12', 0, V, 'incorrect', ['-12', '0'], ERR_MOINS),
        spec('déterminant : 13', 0, V, 'incorrect', ['13', '0'], ERR_DET),
        spec('0 mais « non »', 0, V, 'incorrect', ['0', '1'])]
V = {'xa': 1, 'ya': 1, 'xc': -2, 'yc': 0, 'p': 2, 'q': 3, 'k': 1, 'w': 1, 'r': 1, 's': 1}
# CD(−2 ; 3) : N = −4 + 9 = 5
s2c += [spec('non perpendiculaires : 5, non', 0, V, 'correct', ['5', '1']),
        spec('5 mais « oui »', 0, V, 'incorrect', ['5', '0'])]
ajouter('f2cc01fc', v2c, s2c)

# =============================================================================================
# F11 — 6058963e : rectangle et points placés par une fraction (1G11-1, cas 3 et 4). 1SPE-436.
# AB = L, AD = l, AE = ee (sur [AD]), AF = ff (sur [AB]), avec L·ff = l·(l − ee) : (EC) ⊥ (DF).
# =============================================================================================

VARS_RECT = [var('l', '3..7'), var('ee', '1..{{eval:l-1}}'), var('ff', '1..3'),
             var('L', 'eval:l*(l-ee)/ff')]
COND_RECT = ['mod(l*(l-ee),ff) == 0', 'L > l', 'L <= 15']
FIG_EF = bloc('figure',
              'fenetre: -1.3 ; {{eval:L+1}} ; -1.2 ; {{eval:l+1}}',
              'taille: moyenne',
              'description: Rectangle ABCD ; E sur le côté AD, F sur le côté AB ; segments EC et DF.',
              '---',
              'A = point(0, 0, etiquette="bas-gauche")',
              'B = point({{L}}, 0, etiquette="bas-droite")',
              'C = point({{L}}, {{l}}, etiquette="haut-droite")',
              'D = point(0, {{l}}, etiquette="haut-gauche")',
              'E = point(0, {{ee}}, etiquette="gauche")',
              'F = point({{ff}}, 0, etiquette="bas")',
              'polygone(A, B, C, D)',
              'angle(B, A, D, marque="carre")',
              'segment(E, C)',
              'segment(D, F)')
ENONCE_EF = ('$ABCD$ est un rectangle tel que $AB={{L}}$ et $AD={{l}}$. Les points $E$ et $F$ '
             'vérifient $' + vec('AE') + '={{eval:ee/l}}\\,' + vec('AD') + '$ et $' + vec('AF')
             + '={{eval:ff/L}}\\,' + vec('AB') + '$. On veut montrer que les droites $(EC)$ et '
             '$(DF)$ sont perpendiculaires.\n\n' + FIG_EF + '\n\n')
ERR_ED_SIGNE = ('$' + vec('ED') + '$ et $' + vec('DA') + '$ sont colinéaires et de sens '
                'contraires : le produit est négatif.')
ERR_ED_AD = '$ED=AD-AE$ : ce n\'est pas toute la longueur $AD$.'
ERR_AF_AB = 'Multiplie $DC$ par $AF$, pas par $AB$.'
ERR_AF_SIGNE = '$' + vec('DC') + '$ et $' + vec('AF') + '$ ont le même sens : le produit est positif.'
ERR_SOMME = ('Additionne les deux produits avec leur signe : $' + ps('ED', 'DA') + '$ est '
             'négatif.')
ERR_EC_Y = '$' + vec('EC') + '$ : ordonnée de $C$ moins ordonnée de $E$.'
ERR_DF_Y = '$' + vec('DF') + '$ : ordonnée de $F$ moins ordonnée de $D$.'
ERR_DF_SIGNE = 'Attention au signe de l\'ordonnée de $' + vec('DF') + '$.'
v60, s60 = [], []
# V5 : sans repère (Chasles)
v60.append(variation(
    ENONCE_EF + 'Par la relation de Chasles, $' + vec('EC') + '=' + vec('ED') + '+' + vec('DC')
    + '$ et $' + vec('DF') + '=' + vec('DA') + '+' + vec('AF') + '$. Les produits $' + ps('ED', 'AF')
    + '$ et $' + ps('DC', 'DA') + '$ sont nuls (vecteurs orthogonaux).\n\nCalcule les produits '
    'scalaires suivants.\n\n$' + ps('ED', 'DA') + '=?$\n\n$' + ps('DC', 'AF') + '=?$\n\n$'
    + ps('EC', 'DF') + '=?$',
    VARS_RECT,
    [case('{{eval:-(l-ee)*l}}', [erreur('{{eval:(l-ee)*l}}', ERR_ED_SIGNE, 'Signe faux'),
                                 erreur('{{eval:-l*l}}', ERR_ED_AD, 'ED = AD')]),
     case('{{eval:L*ff}}', [erreur('{{eval:L*L}}', ERR_AF_AB, 'AB au lieu de AF'),
                            erreur('{{eval:-L*ff}}', ERR_AF_SIGNE, 'Signe faux')]),
     case('0', [erreur('{{eval:(l-ee)*l+L*ff}}', ERR_SOMME, 'Signe oublié dans la somme')])],
    ['$ED=AD-AE={{l}}-{{ee}}={{eval:l-ee}}$, et $' + vec('ED') + '$, $' + vec('DA') + '$ sont de sens '
     'contraires : $' + ps('ED', 'DA') + '=-ED\\times DA=-{{eval:l-ee}}\\times {{l}}='
     + P('{{eval:-(l-ee)*l}}') + '$.',
     '$AF={{ff}}$, et $' + vec('DC') + '$, $' + vec('AF') + '$ sont de même sens : $' + ps('DC', 'AF')
     + '=DC\\times AF={{L}}\\times {{ff}}=' + P('{{eval:L*ff}}') + '$.',
     '$' + ps('EC', 'DF') + '=' + ps('ED', 'DA') + '+' + ps('ED', 'AF') + '+' + ps('DC', 'DA') + '+'
     + ps('DC', 'AF') + '={{eval:-(l-ee)*l}}+0+0+{{eval:L*ff}}=' + P('0') + '$ : les droites '
     '$(EC)$ et $(DF)$ sont perpendiculaires.'],
    'Développe $(' + vec('ED') + '+' + vec('DC') + ')\\cdot(' + vec('DA') + '+' + vec('AF') + ')$ : '
    'deux des quatre produits sont nuls. $' + vec('ED') + '$ et $' + vec('DA') + '$ sont colinéaires.',
    COND_RECT))
V = {'l': 4, 'ee': 1, 'ff': 1}   # L = 12 : −12, 12, 0
s60 += [spec('12 × 4, AE = 1, AF = 1 : −12, 12, 0', 0, V, 'correct', ['-12', '12', '0']),
        spec('ED·DA positif', 0, V, 'incorrect', ['12', '12', '0'], ERR_ED_SIGNE),
        spec('ED = AD : −16', 0, V, 'incorrect', ['-16', '12', '0'], ERR_ED_AD),
        spec('DC·AB : 144', 0, V, 'incorrect', ['-12', '144', '0'], ERR_AF_AB),
        spec('somme sans signe : 24', 0, V, 'incorrect', ['-12', '12', '24'], ERR_SOMME)]
V = {'l': 5, 'ee': 2, 'ff': 1}   # L = 15 : −15, 15, 0
s60 += [spec('15 × 5, AE = 2, AF = 1 : −15, 15, 0', 0, V, 'correct', ['-15', '15', '0'])]

# V6 : dans le repère d'origine A (unité de longueur), B(L ; 0), D(0 ; l)
v60.append(variation(
    ENONCE_EF + 'On se place dans le repère orthonormé d\'origine $A$ où $B({{L}}\\,;0)$ et '
    '$D(0\\,;{{l}})$.\n\nDonne les coordonnées des vecteurs $' + vec('EC') + '$ et $' + vec('DF')
    + '$, puis calcule leur produit scalaire.\n\n$' + vec('EC') + '(?\\,;?)$\n\n$' + vec('DF')
    + '(?\\,;?)$\n\n$' + ps('EC', 'DF') + '=?$',
    VARS_RECT,
    [case('{{L}}'),
     case('{{eval:l-ee}}', [erreur('{{eval:ee-l}}', ERR_EC_Y, 'Ordonnée inversée')]),
     case('{{ff}}'),
     case('{{eval:-l}}', [erreur('{{l}}', ERR_DF_Y, 'Ordonnée inversée')]),
     case('0', [erreur('{{eval:L*ff+l*(l-ee)}}', ERR_DF_SIGNE, 'Signe de l\'ordonnée de DF')])],
    ['Dans ce repère, $E(0\\,;{{ee}})$, $C({{L}}\\,;{{l}})$, $D(0\\,;{{l}})$ et $F({{ff}}\\,;0)$.',
     '$' + vec('EC') + '\\left(' + P('{{L}}') + '\\,;' + P('{{eval:l-ee}}') + '\\right)$ et $'
     + vec('DF') + '\\left(' + P('{{ff}}') + '\\,;' + P('{{eval:-l}}') + '\\right)$.',
     '$' + ps('EC', 'DF') + '={{L}}\\times {{ff}}+{{eval:l-ee}}\\times({{eval:-l}})={{eval:L*ff}}'
     '-{{eval:l*(l-ee)}}=' + P('0') + '$ : les droites $(EC)$ et $(DF)$ sont perpendiculaires.'],
    'Dans ce repère, $A(0\\,;0)$, $B({{L}}\\,;0)$ et $D(0\\,;{{l}})$ : lis d\'abord les coordonnées '
    'de $E$, $F$ et $C$.',
    COND_RECT))
V = {'l': 4, 'ee': 1, 'ff': 1}
s60 += [spec('EC(12 ; 3), DF(1 ; −4), 0', 1, V, 'correct', ['12', '3', '1', '-4', '0']),
        spec('EC ordonnée inversée', 1, V, 'incorrect', ['12', '-3', '1', '-4', '0'], ERR_EC_Y),
        spec('DF ordonnée inversée', 1, V, 'incorrect', ['12', '3', '1', '4', '0'], ERR_DF_Y),
        spec('produit 24', 1, V, 'incorrect', ['12', '3', '1', '-4', '24'], ERR_DF_SIGNE)]
ajouter('6058963e', v60, s60)

# =============================================================================================
# F12 — bf5dadf6 : angle au dixième de degré à partir de trois points (1G11-2). Point 1SPE-319.
# =============================================================================================

VARS_ANGLE = [var('xa', '-2..2'), var('ya', '-2..2'), var('p', '-4..4!0'), var('q', '-4..4'),
              var('r', '-4..4'), var('s', '-4..4!0'),
              var('xb', 'eval:xa+p'), var('yb', 'eval:ya+q'), var('xc', 'eval:xa+r'),
              var('yc', 'eval:ya+s'), var('P', 'eval:p*r+q*s'), var('S1', 'eval:p^2+q^2'),
              var('S2', 'eval:r^2+s^2'),
              var('D', 'eval:arccos(P/sqrt(S1*S2))*180/\\pi'), var('R', 'eval:round(10*D)/10')]
COND_ANGLE = ['P != 0', 'p*s-q*r != 0', 'abs(abs(10*D-round(10*D))-0.5) > 0.1',
              'round(D) != round(10*D)/10']
DIXIEME = {'precision': {'type': 'decimal', 'digits': 1}}
ERR_AB2 = 'Tu as donné $AB^2$ : prends la racine carrée.'
ERR_ABS = '$AB=\\sqrt{x^2+y^2}$, pas $|x|+|y|$.'
ERR_AC2 = 'Tu as donné $AC^2$ : prends la racine carrée.'
ERR_RAD = 'L\'angle est demandé en degrés : mets la calculatrice en mode degrés.'
ERR_SUPPL = 'Attention au signe du produit scalaire : il donne le signe du cosinus.'
ERR_UNITE = 'Arrondis au dixième de degré, pas à l\'unité.'
ERR_PS_ANGLE = 'Le produit scalaire s\'écrit $xx\'+yy\'$ : abscisses entre elles, ordonnées entre elles.'


def case_angle():
    return case('{{R}}', [erreur('{{eval:round(10*D*\\pi/180)/10}}', ERR_RAD, 'Radians'),
                          erreur('{{eval:round(10*(180-D))/10}}', ERR_SUPPL, 'Angle supplémentaire'),
                          erreur('{{eval:round(D)}}', ERR_UNITE, 'Arrondi à l\'unité')], DIXIEME)


ETAPES_ANGLE = [
    '$' + vec('AB') + '\\begin{pmatrix}{{p}}\\\\{{q}}\\end{pmatrix}$ et $' + vec('AC')
    + '\\begin{pmatrix}{{r}}\\\\{{s}}\\end{pmatrix}$, donc $' + ps('AB', 'AC') + '={{p}}\\times {{r;()}}'
    '+{{q;()}}\\times {{s;()}}=' + P('{{P}}') + '$.',
    '$AB=\\sqrt{ {{p;()}}^2+{{q;()}}^2}=' + P('{{eval:sqrt(S1)}}') + '$ et $AC=\\sqrt{ {{r;()}}^2+'
    '{{s;()}}^2}=' + P('{{eval:sqrt(S2)}}') + '$.',
    '$' + ps('AB', 'AC') + '=AB\\times AC\\times\\cos\\widehat{BAC}$, donc $\\cos\\widehat{BAC}='
    '\\dfrac{ {{P}} }{ {{eval:sqrt(S1)}}\\times {{eval:sqrt(S2)}} }$.',
    'À la calculatrice (touche $\\cos^{-1}$, en mode degrés) : $\\widehat{BAC}\\approx ' + P('{{R}}^\\circ')
    + '$ (au dixième de degré).']
HINT_ANGLE = ('Écris $' + ps('AB', 'AC') + '$ de deux façons : avec les coordonnées, et avec '
              '$AB\\times AC\\times\\cos\\widehat{BAC}$.')
vbf, sbf = [], []
vbf.append(variation(
    REPERE + ' On considère les points $A({{xa}}\\,;{{ya}})$, $B({{xb}}\\,;{{yb}})$ et $C({{xc}}\\,;'
    '{{yc}})$.\n\nCalcule $' + ps('AB', 'AC') + '$, puis les longueurs $AB$ et $AC$ (valeurs '
    'exactes), et déduis-en la mesure de l\'angle $\\widehat{BAC}$ en degrés, arrondie au dixième.'
    '\n\n$' + ps('AB', 'AC') + '=?$\n\n$AB=?$\n\n$AC=?$\n\n$\\widehat{BAC}\\approx ?$',
    VARS_ANGLE,
    [case('{{P}}', [erreur('{{eval:p*s+q*r}}', ERR_PS_ANGLE, 'Coordonnées croisées')]),
     case('{{eval:sqrt(S1)}}', [erreur('{{S1}}', ERR_AB2, 'AB² donné'),
                                erreur('{{eval:abs(p)+abs(q)}}', ERR_ABS, '|x| + |y|')]),
     case('{{eval:sqrt(S2)}}', [erreur('{{S2}}', ERR_AC2, 'AC² donné')]),
     case_angle()],
    ETAPES_ANGLE, HINT_ANGLE, COND_ANGLE))
V = {'xa': 0, 'ya': 0, 'p': 3, 'q': 1, 'r': 1, 's': 4}   # P = 7, √10, √17 ; 57,5°
sbf += [spec('AB(3 ; 1), AC(1 ; 4) : 7, √10, √17, 57,5', 0, V, 'correct',
             ['7', '\\sqrt{10}', '\\sqrt{17}', '57{,}5']),
        spec('AB² donné', 0, V, 'incorrect', ['7', '10', '\\sqrt{17}', '57{,}5'], ERR_AB2),
        spec('|x| + |y|', 0, V, 'incorrect', ['7', '4', '\\sqrt{17}', '57{,}5'], ERR_ABS),
        spec('angle en radians', 0, V, 'incorrect', ['7', '\\sqrt{10}', '\\sqrt{17}', '1'], ERR_RAD),
        spec('arrondi à l\'unité', 0, V, 'incorrect', ['7', '\\sqrt{10}', '\\sqrt{17}', '58'],
             ERR_UNITE)]
V = {'xa': 1, 'ya': -1, 'p': 2, 'q': -3, 'r': -4, 's': 1}   # P = −11, √13, √17 ; 137,7°
sbf += [spec('AB(2 ; −3), AC(−4 ; 1) : angle obtus', 0, V, 'correct',
             ['-11', '\\sqrt{13}', '\\sqrt{17}', '137{,}7']),
        spec('angle supplémentaire', 0, V, 'incorrect',
             ['-11', '\\sqrt{13}', '\\sqrt{17}', '42{,}3'], ERR_SUPPL)]

FIG_PTS = bloc('figure',
               'fenetre: -M ; M ; -M ; M'.replace('M', carre('xa', 'ya', 'xb', 'yb', 'xc', 'yc')),
               'taille: moyenne',
               'axes: oui',
               'grille: oui',
               'description: Repère orthonormé quadrillé ; points A, B et C et l\'angle en A.',
               '---',
               'A = point({{xa}}, {{ya}}, etiquette="bas-gauche")',
               'B = point({{xb}}, {{yb}}, etiquette="haut-droite")',
               'C = point({{xc}}, {{yc}}, etiquette="haut-gauche")',
               'segment(A, B)',
               'segment(A, C)',
               'angle(B, A, C)')
vbf.append(variation(
    'Dans le repère orthonormé ci-dessous, on lit les coordonnées des points $A$, $B$ et $C$.\n\n'
    + FIG_PTS + '\n\nCalcule $' + ps('AB', 'AC') + '$, puis déduis-en la mesure de l\'angle '
    '$\\widehat{BAC}$ en degrés, arrondie au dixième.\n\n$' + ps('AB', 'AC') + '=?$\n\n'
    '$\\widehat{BAC}\\approx ?$',
    VARS_ANGLE,
    [case('{{P}}', [erreur('{{eval:p*s+q*r}}', ERR_PS_ANGLE, 'Coordonnées croisées'),
                    erreur('{{eval:xb*xc+yb*yc}}', ERR_POINTES, 'Coordonnées des points')]),
     case_angle()],
    ['On lit $A({{xa}}\\,;{{ya}})$, $B({{xb}}\\,;{{yb}})$ et $C({{xc}}\\,;{{yc}})$.'] + ETAPES_ANGLE,
    'Lis les coordonnées des trois points, puis écris $' + ps('AB', 'AC') + '$ de deux façons : '
    'avec les coordonnées, et avec $AB\\times AC\\times\\cos\\widehat{BAC}$.',
    COND_ANGLE + ['xa != 0 || ya != 0']))
V = {'xa': 1, 'ya': -1, 'p': 2, 'q': -3, 'r': -4, 's': 1}   # B(3 ; −4), C(−3 ; 0)
sbf += [spec('lu : −11 ; 137,7', 1, V, 'correct', ['-11', '137{,}7']),
        spec('coordonnées des points : −9', 1, V, 'incorrect', ['-9', '137{,}7'], ERR_POINTES),
        spec('angle supplémentaire', 1, V, 'incorrect', ['-11', '42{,}3'], ERR_SUPPL)]
ajouter('bf5dadf6', vbf, sbf)
