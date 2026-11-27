"""Écrit les modèles neufs du chantier idees-3e-thales dans scripts/questions/idees-3e-thales-neufs/
(N1, H1, H2).

Phase 0 validée par David le 2026-11-27 (« je valide tes recos, en gardant les modèles qui seraient
hors programme, comme d'habitude » ; journal docs/archive/wip/idees-3e-thales/idees-3e-thales-progress.md, § Décisions).

Rangement :
- N1 : « Géométrie > Théorème de Thalès > calcul de longueurs », point 3-060, niveau 2 (les trois
  modèles de la sous-notion sont au niveau 1) ;
- H1 : « Géométrie > Agrandissement et réduction » (notion neuve, Q2), SANS point :
  l'agrandissement et la réduction ne figurent pas dans le BO de cycle 4 ;
- H2 : « Géométrie > Triangles semblables » (notion existante, vide), SANS point : les bornes
  (n° 13) excluent les triangles semblables, « aucun point ne doit les générer ».

Ni theme, ni domain, ni subdomain, ni id : create-questions --publier écrit l'id.

Décisions d'écriture et écarts à la fiche :
- Lettres fixes (A, B, C…) dans les modèles neufs : pas de jeu de lettres tiré.
- Réponses exactes au dixième (N1) ou au centième (H1, H2), par conditions ; erreurs prévues
  arrondies au centième (l'élève écrit 2,67 pour 8/3), toutes distinctes de la réponse et entre
  elles.
- N1 v1 (rectangle) : AB plus long que BC (figure lisible, et AB ≠ AD pour l'erreur « AB au
  lieu de AD »). Troisième erreur : le rapport mal écrit AM/AD = AN/AB (ND peut alors être négatif :
  on ne l'interdit pas, la condition rendait le tirage trop rare).
- N1 v2 : l'erreur « même différence » de la fiche est MB = NC (AB − AC = AM − AN).
- H1 : k = n/10, n de 2 à 9 (réduction) ou de 11 à 30 (agrandissement), k ≠ 2 (k² = 2k). Résultats
  sous 1 000 (pas d'espace de groupement à taper) ; volume exact au centième (k³ a trois
  décimales). H1 v2 (k depuis deux longueurs) n'a que deux
  erreurs prévues : rapport renversé et différence ; je n'en invente pas une troisième.
- H2 : sans figure, les angles égaux sont écrits dans l'énoncé. v2 : case choix à trois côtés
  ([DE], [EF], [DF]), mélangés ; B a pour homologue E ou F (p), le côté demandé est tiré (q).

Usage : python3 docs/wip/questions/idees-3e-thales-neufs.py scripts/questions/idees-3e-thales-neufs
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from idees_3e_thales_outils import (  # noqa: E402
    case, couleur, erreur, resoudre, spec, tous_distincts, var, variation)

DOSSIER = sys.argv[1]

RANGEMENT = {
    'n1-resoudre-un-probleme-avec-thales':
        ('Géométrie > Théorème de Thalès > calcul de longueurs', '3-060'),
    'h1-agrandissement-reduction-aires-volumes': ('Géométrie > Agrandissement et réduction', None),
    'h2-triangles-semblables': ('Géométrie > Triangles semblables', None),
}


# =============================================================================================
# Outils
# =============================================================================================

def modele(title, description, level, delay, variations, specs):
    return {'title': title, 'description': description, 'grades': ['3'], 'level': level,
            'delay': delay, 'status': 'draft', 'variations': variations, 'testSpecs': specs}


def ecrire(nom, m):
    os.makedirs(DOSSIER, exist_ok=True)
    chemin = os.path.join(DOSSIER, nom + '.json')
    # Garder l'id écrit en tête par create-questions --publier, s'il existe
    tete = {}
    if os.path.exists(chemin):
        with open(chemin, encoding='utf-8') as f:
            ancien = json.load(f)
        if 'id' in ancien:
            tete = {'id': ancien['id']}
    noeud, point = RANGEMENT[nom]
    m = {**tete, 'rangement': {'noeud': noeud, 'point': point}, **m}
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
    print(f'{nom} : {len(m["variations"])} variations, {len(m["testSpecs"])} specs')


def fr(x):
    """Réponse d'élève : arrondi au centième, virgule `{,}`."""
    t = f'{round(x + 1e-9, 2):.2f}'.rstrip('0').rstrip('.')
    return t.replace('.', '{,}')


def lisible(x):
    return fr(x).replace('{,}', ',')


def cent(expr):
    return '{{eval:round(100*(' + expr + '))/100;d}}'


def exact(expr):
    return '{{eval:' + expr + ';d}}'


def figure(fenetre, description, lignes):
    return ('```figure\nfenetre: ' + fenetre + '\ndescription: ' + description + '\n---\n'
            + '\n'.join(lignes) + '\n```')


def cases_et_specs(vi, juste, erreurs, valeurs, desc):
    """Case à erreurs prévues (arrondies au centième) et ses specs, pour un tirage `valeurs`.
    erreurs : (expression, message, label) ; `calc` évalue une expression sur le tirage."""
    blank = case(exact(juste), [erreur(cent(x), msg, lab) for x, msg, lab in erreurs])
    v = valeurs
    specs = [spec(f'v{vi} {desc} : {lisible(calc(juste, v))}', vi, v, 'correct',
                  [fr(calc(juste, v))])]
    for x, msg, lab in erreurs:
        specs.append(spec(f'v{vi} : {lab} ({lisible(calc(x, v))})', vi, v, 'incorrect',
                          [fr(calc(x, v))], resoudre(msg, v)))
    return blank, specs


def calc(expr, v):
    env = {k: float(x) for k, x in v.items()}
    return eval(expr, {'__builtins__': {}, 'abs': abs}, env)


def distincts(juste, erreurs, facteur=100):
    return tous_distincts([f'round({facteur}*({x}))' for x in [juste] + [e[0] for e in erreurs]])


def exact_au(expr, facteur):
    return f'round({facteur}*({expr})) == {facteur}*({expr})'


E_DIFF = ('Dans une configuration de Thalès, les longueurs sont proportionnelles : on les '
          'multiplie par un même rapport, on n\'ajoute pas la même différence.')
THALES_EGALITE = '$$\\dfrac{AM}{AB} = \\dfrac{AN}{AC} = \\dfrac{MN}{BC}$$'


# =============================================================================================
# N1 — 3-060 : résoudre un problème avec Thalès (deux temps).
# =============================================================================================

# --- v0 : triangles rectangles imbriqués. A, E, D alignés ; A, B, C alignés ;
# (EB) ⟂ (AD) et (DC) ⟂ (AD), donc (EB) ∥ (DC). DC = EB × AD ÷ AE.
FIG_N1_V0 = figure(
    '0 ; 10 ; 0 ; 6.6',
    'Triangle ADC rectangle en D, E sur [AD], B sur [AC], (EB) perpendiculaire à (AD).',
    ['A = point(1, 1, etiquette="gauche")',
     'D = point(9, 1, etiquette="bas")',
     'C = point(9, 5.6, etiquette="haut")',
     'E = point(1 + 8*{{ae}}/{{ad}}, 1, etiquette="bas")',
     'B = point(1 + 8*{{ae}}/{{ad}}, 1 + 4.6*{{ae}}/{{ad}}, etiquette="haut-gauche")',
     'segment(A, D)', 'segment(A, C)', 'segment(E, B)', 'segment(D, C)',
     'angle(A, E, B, marque="carre")', 'angle(A, D, C, marque="carre")'])
J_V0 = 'eb*ad/ae'
E_V0 = [
    ('eb*ae/ad', 'Tu as renversé le rapport : DC est un côté du grand triangle, il est plus long '
     'que EB.', 'Rapport renversé'),
    ('eb+ad-ae', E_DIFF, 'Même différence ajoutée'),
    ('eb*ad', 'Tu as oublié de diviser par AE : on multiplie EB par AD, puis on divise par AE.',
     'Division oubliée'),
]
B_V0, S_V0 = cases_et_specs(0, J_V0, E_V0, {'ae': 4, 'ad': 10, 'eb': 3}, 'AE = 4, AD = 10, '
                            'EB = 3')
N1_V0 = variation(
    'Les points $A$, $E$, $D$ sont alignés, ainsi que $A$, $B$, $C$. Les droites $(EB)$ et '
    '$(DC)$ sont perpendiculaires à la droite $(AD)$. On donne $AE = {{ae}}~\\unit{cm}$, '
    '$AD = {{ad}}~\\unit{cm}$ et $EB = {{eb}}~\\unit{cm}$. Calcule $DC$.\n\n' + FIG_N1_V0
    + '\n\n$DC = ?~\\unit{cm}$',
    [var('ae', '2..8'), var('ad', '4..12'), var('eb', '2..10')],
    [B_V0],
    ['Les droites $(EB)$ et $(DC)$ sont toutes les deux perpendiculaires à la droite $(AD)$. '
     'Deux droites perpendiculaires à une même droite sont **parallèles** : $(EB) \\parallel '
     '(DC)$.',
     'Les points $A$, $E$, $D$ sont alignés, ainsi que $A$, $B$, $C$, et $(EB) \\parallel (DC)$. '
     'D\'après le **théorème de Thalès** : $$\\dfrac{AE}{AD} = \\dfrac{AB}{AC} = '
     '\\dfrac{EB}{DC}$$',
     'On garde les deux rapports utiles : $$\\dfrac{ {{ae}} }{ {{ad}} } = \\dfrac{ {{eb}} }{DC} '
     '\\quad\\text{donc}\\quad DC = \\dfrac{ {{eb}} \\times {{ad}} }{ {{ae}} } = '
     + couleur(exact(J_V0) + '~\\unit{cm}') + '$$'],
    'Que peux-tu dire de deux droites perpendiculaires à une même droite ? Cherche ensuite les '
    'deux triangles de la configuration de Thalès.',
    ['ae < ad', exact_au(J_V0, 10)] + distincts(J_V0, E_V0),
)

# --- v1 : rectangle ABCD, M sur [AB], N sur [AD], (MN) ∥ (BD). AD = BC.
# AN = AM × AD ÷ AB ; ND = AD − AN.
H_RECT = '8*{{bc}}/{{ab}}'
FIG_N1_V1 = figure(
    '0 ; 10 ; 0 ; {{eval:round(10*(2+8*bc/ab))/10;d}}',
    'Rectangle ABCD, diagonale [BD], M sur [AB], N sur [AD], segment [MN].',
    ['A = point(1, 1, etiquette="bas-gauche")',
     'B = point(9, 1, etiquette="bas-droite")',
     'C = point(9, 1 + ' + H_RECT + ', etiquette="haut-droite")',
     'D = point(1, 1 + ' + H_RECT + ', etiquette="haut-gauche")',
     'M = point(1 + 8*{{am}}/{{ab}}, 1, etiquette="bas")',
     'N = point(1, 1 + ' + H_RECT + '*{{am}}/{{ab}}, etiquette="gauche")',
     'segment(A, B)', 'segment(B, C)', 'segment(C, D)', 'segment(D, A)', 'segment(B, D)',
     'segment(M, N)', 'angle(B, A, D, marque="carre")'])
J_V1 = 'bc-am*bc/ab'
E_V1 = [
    ('am*bc/ab', 'Tu as calculé AN : la longueur demandée est ND = AD − AN.',
     'AN au lieu de ND'),
    ('ab-am*bc/ab', 'Le côté [AD] du rectangle mesure BC, pas AB : ND = AD − AN avec AD = BC.',
     'AB au lieu de AD'),
    ('bc-am*ab/bc', 'Tu as mélangé les rapports : chaque rapport compare deux longueurs portées '
     'par la même droite, AM/AB = AN/AD.', 'Rapports mélangés'),
]
B_V1, S_V1 = cases_et_specs(1, J_V1, E_V1, {'ab': 10, 'bc': 6, 'am': 3}, 'AB = 10, BC = 6, '
                            'AM = 3')
N1_V1 = variation(
    '$ABCD$ est un rectangle tel que $AB = {{ab}}~\\unit{cm}$ et $BC = {{bc}}~\\unit{cm}$. '
    '$M$ est le point du segment $[AB]$ tel que $AM = {{am}}~\\unit{cm}$, et $N$ est le point du '
    'segment $[AD]$ tel que les droites $(MN)$ et $(BD)$ sont parallèles. Calcule $ND$.\n\n'
    + FIG_N1_V1 + '\n\n$ND = ?~\\unit{cm}$',
    [var('ab', '5..12'), var('bc', '3..11'), var('am', '2..11')],
    [B_V1],
    ['$ABCD$ est un rectangle : ses côtés opposés ont la même longueur, donc $AD = BC = {{bc}}'
     '~\\unit{cm}$.',
     'Dans le triangle $ABD$ : $M$ est sur $[AB]$, $N$ sur $[AD]$, et $(MN) \\parallel (BD)$. '
     'D\'après le **théorème de Thalès** : $$\\dfrac{AM}{AB} = \\dfrac{AN}{AD} = '
     '\\dfrac{MN}{BD}$$',
     '$$\\dfrac{ {{am}} }{ {{ab}} } = \\dfrac{AN}{ {{bc}} } \\quad\\text{donc}\\quad AN = '
     '\\dfrac{ {{am}} \\times {{bc}} }{ {{ab}} } = ' + exact('am*bc/ab') + '~\\unit{cm}$$',
     '$N$ est sur le segment $[AD]$ : $$ND = AD - AN = {{bc}} - ' + exact('am*bc/ab') + ' = '
     + couleur(exact(J_V1) + '~\\unit{cm}') + '$$'],
    'Repère le triangle qui contient la configuration de Thalès. La longueur du côté $[AD]$ '
    'n\'est pas donnée : que dit le rectangle sur ses côtés ?',
    ['bc < ab', 'am < ab', exact_au('am*bc/ab', 10)]
    + distincts(J_V1, E_V1),
)

# --- v2 : emboîtés, AM, AN, NC donnés. AB = AM × AC ÷ AN, MB = AB − AM (= AM × NC ÷ AN).
R_V2 = '{{an}}/({{an}}+{{nc}})'
FIG_N1_V2 = figure(
    '0 ; 10 ; 0 ; 6.6',
    'Triangle ABC, M sur [AB], N sur [AC], segment [MN].',
    ['A = point(1, 1, etiquette="gauche")',
     'B = point(9, 1.6, etiquette="droite")',
     'C = point(6.2, 5.6, etiquette="haut")',
     f'M = point(A.x + ({R_V2})*(B.x - A.x), A.y + ({R_V2})*(B.y - A.y), etiquette="bas")',
     f'N = point(A.x + ({R_V2})*(C.x - A.x), A.y + ({R_V2})*(C.y - A.y), '
     'etiquette="haut-gauche")',
     'segment(A, B)', 'segment(A, C)', 'segment(B, C)', 'segment(M, N)'])
J_V2 = 'am*nc/an'
E_V2 = [
    ('am*(an+nc)/an', 'Tu as calculé AB : la longueur demandée est MB = AB − AM.',
     'AB au lieu de MB'),
    ('nc', 'MB n\'est pas égale à NC : les longueurs sont proportionnelles, elles ne diffèrent '
     'pas d\'une même quantité.', 'MB = NC'),
    ('an*nc/am', 'Tu as renversé un rapport : écris AM/AB = AN/AC, avec AC = AN + NC, avant de '
     'remplacer.', 'Rapport renversé'),
]
B_V2, S_V2 = cases_et_specs(2, J_V2, E_V2, {'am': 3, 'an': 4, 'nc': 6}, 'AM = 3, AN = 4, '
                            'NC = 6')
N1_V2 = variation(
    'Les points $A$, $M$, $B$ sont alignés, ainsi que $A$, $N$, $C$, et les droites $(MN)$ et '
    '$(BC)$ sont parallèles. On donne $AM = {{am}}~\\unit{cm}$, $AN = {{an}}~\\unit{cm}$ et '
    '$NC = {{nc}}~\\unit{cm}$. Calcule $MB$.\n\n' + FIG_N1_V2 + '\n\n$MB = ?~\\unit{cm}$',
    [var('am', '2..8'), var('an', '2..8'), var('nc', '2..10')],
    [B_V2],
    ['$N$ est sur le segment $[AC]$ : $AC = AN + NC = {{an}} + {{nc}} = {{eval:an+nc}}'
     '~\\unit{cm}$.',
     'Les points $A$, $M$, $B$ sont alignés, ainsi que $A$, $N$, $C$, et $(MN) \\parallel (BC)$. '
     'D\'après le **théorème de Thalès** : ' + THALES_EGALITE,
     '$$\\dfrac{ {{am}} }{AB} = \\dfrac{ {{an}} }{ {{eval:an+nc}} } \\quad\\text{donc}\\quad '
     'AB = \\dfrac{ {{am}} \\times {{eval:an+nc}} }{ {{an}} } = ' + exact('am*(an+nc)/an')
     + '~\\unit{cm}$$',
     '$M$ est sur le segment $[AB]$ : $$MB = AB - AM = ' + exact('am*(an+nc)/an') + ' - {{am}} '
     '= ' + couleur(exact(J_V2) + '~\\unit{cm}') + '$$'],
    'Le théorème de Thalès donne d\'abord un côté du grand triangle ; la longueur demandée s\'en '
    'déduit ensuite.',
    ['am != an', exact_au(J_V2, 10)] + distincts(J_V2, E_V2),
)

ecrire('n1-resoudre-un-probleme-avec-thales', modele(
    'Résoudre un problème avec Thalès',
    'Problèmes en deux temps : parallélisme déduit de deux perpendiculaires à une même droite, '
    'rectangle et parallèle à sa diagonale (ND = AD − AN), MB à déduire de AB',
    2, 180, [N1_V0, N1_V1, N1_V2], S_V0 + S_V1 + S_V2))


# =============================================================================================
# H1 — sans point : agrandissement et réduction, aires et volumes.
# g = 0 agrandissement (n de 11 à 30), g = 1 réduction (n de 2 à 9) ; k = n/10, k ≠ 2.
# =============================================================================================

VARS_K = [var('g', '0..1'), var('na', '11..30'), var('nr', '2..9'),
          var('n', 'eval:(1-g)*na+g*nr'), var('k', 'eval:n/10')]
K = exact('k')
TRANSFO = '{{if:g==0|un agrandissement|une réduction}}'
TRANSFO_DE = '{{if:g==0|l\'agrandissement|la réduction}}'
C_K = ['n != 20']


def vk(g, n, **autres):
    v = {'g': g, 'na': n if g == 0 else 15, 'nr': n if g == 1 else 5, 'n': n, 'k': n / 10}
    v.update(autres)
    return {c: (f'{x:g}' if isinstance(x, float) else x) for c, x in v.items()}


E_K_AIRE = ('Les longueurs sont multipliées par k, mais les aires sont multipliées par k² '
            '(k × k).')
E_2K = 'k² veut dire k × k, pas 2 × k.'
E_K3_AIRE = 'Pour une aire, c\'est k² ; k³ sert pour les volumes.'

# --- v0 : aire de l'image = k² × A
J_H0 = 'k*k*a'
E_H0 = [('k*a', E_K_AIRE, 'k au lieu de k²'), ('2*k*a', E_2K, '2k au lieu de k²'),
        ('k*k*k*a', E_K3_AIRE, 'k³ au lieu de k²')]
B_H0, S_H0 = cases_et_specs(0, J_H0, E_H0, vk(0, 15, a=20), 'k = 1,5, A = 20')
_, S_H0b = cases_et_specs(0, J_H0, E_H0[:1], vk(1, 5, a=36), 'réduction k = 0,5, A = 36')
H1_V0 = variation(
    'Une figure a une aire de ${{a}}~\\unit{cm^2}$. On en fait ' + TRANSFO + ' de rapport '
    '$k = ' + K + '$. Quelle est l\'aire de la figure obtenue ?\n\n$\\mathcal{A} = '
    '?~\\unit{cm^2}$',
    VARS_K + [var('a', '5..60')],
    [B_H0],
    ['Dans ' + TRANSFO_DE + ' de rapport $k$, les longueurs sont multipliées par $k$ et les '
     '**aires** par $k^2$.',
     '$$\\mathcal{A} = ' + K + '^2 \\times {{a}} = ' + exact('k*k') + ' \\times {{a}} = '
     + couleur(exact(J_H0) + '~\\unit{cm^2}') + '$$'],
    'Quand les longueurs sont multipliées par $k$, par quoi les aires sont-elles multipliées ?',
    C_K + [f'{J_H0} < 1000', 'k*k*k*a < 1000'] + distincts(J_H0, E_H0),
)

# --- v1 : volume de l'image = k³ × V
J_H1 = 'k*k*k*v'
E_K_VOL = ('Les longueurs sont multipliées par k, mais les volumes sont multipliés par k³ '
           '(k × k × k).')
E_H1 = [('k*v', E_K_VOL, 'k au lieu de k³'),
        ('k*k*v', 'Pour un volume, c\'est k³ ; k² sert pour les aires.', 'k² au lieu de k³'),
        ('3*k*v', 'k³ veut dire k × k × k, pas 3 × k.', '3k au lieu de k³')]
B_H1, S_H1 = cases_et_specs(1, J_H1, E_H1, vk(1, 5, v=200), 'réduction k = 0,5, V = 200')
_, S_H1b = cases_et_specs(1, J_H1, [], vk(0, 12, v=50), 'k = 1,2, V = 50')
H1_V1 = variation(
    'Un solide a un volume de ${{v}}~\\unit{cm^3}$. On en fait ' + TRANSFO + ' de rapport '
    '$k = ' + K + '$. Quel est le volume du solide obtenu ?\n\n$\\mathcal{V} = ?~\\unit{cm^3}$',
    VARS_K + [var('v', '2..400')],
    [B_H1],
    ['Dans ' + TRANSFO_DE + ' de rapport $k$, les longueurs sont multipliées par $k$ et les '
     '**volumes** par $k^3$.',
     '$$\\mathcal{V} = ' + K + '^3 \\times {{v}} = ' + exact('k*k*k') + ' \\times {{v}} = '
     + couleur(exact(J_H1) + '~\\unit{cm^3}') + '$$'],
    'Quand les longueurs sont multipliées par $k$, par quoi les volumes sont-ils multipliés ?',
    C_K + [exact_au(J_H1, 100), f'{J_H1} < 1000', 'k*v < 1000', '3*k*v < 1000']
    + distincts(J_H1, E_H1),
)

# --- v2 : k depuis deux longueurs homologues
J_H2 = 'k'
E_H2 = [('1/k', 'Tu as divisé la longueur de départ par la longueur d\'arrivée : k = longueur '
         'd\'arrivée ÷ longueur de départ.', 'Rapport renversé'),
        ('abs(k*l-l)', 'Le rapport k est un quotient, pas une différence : on divise la longueur '
         'd\'arrivée par la longueur de départ.', 'Différence au lieu du quotient')]
B_H2, S_H2 = cases_et_specs(2, J_H2, E_H2, vk(0, 25, l=4), 'L = 4, L\' = 10')
_, S_H2b = cases_et_specs(2, J_H2, E_H2, vk(1, 4, l=15), 'réduction L = 15, L\' = 6')
H1_V2 = variation(
    'Un côté d\'une figure mesure ${{l}}~\\unit{cm}$. Après ' + TRANSFO_DE + ' de la figure, ce '
    'côté mesure $' + exact('k*l') + '~\\unit{cm}$. Quel est le rapport $k$ de '
    + TRANSFO_DE + ' ?\n\n$k = ?$',
    VARS_K + [var('l', '2..15')],
    [B_H2],
    ['Le rapport $k$ est le nombre par lequel on multiplie les longueurs de départ : '
     '$$k = \\dfrac{\\text{longueur d\'arrivée}}{\\text{longueur de départ}} = \\dfrac{'
     + exact('k*l') + '}{ {{l}} } = ' + couleur(K) + '$$',
     '{{if:g==0|$k > 1$ : c\'est bien un agrandissement.|$k < 1$ : c\'est bien une réduction.}}'],
    'Par quel nombre faut-il multiplier la longueur de départ pour obtenir la longueur '
    'd\'arrivée ?',
    C_K + distincts(J_H2, E_H2),
)

# --- v3 : aire de départ = A' ÷ k²
J_H3 = 'a'
E_H3 = [('k*k*k*k*a', 'Tu as multiplié par k² : pour revenir à l\'aire de départ, on divise par '
         'k².', 'Multiplication au lieu de division'),
        ('k*a', 'Les aires sont multipliées par k², pas par k : on divise donc par k².',
         'Division par k au lieu de k²'),
        ('k*k*a/(2*k)', 'k² veut dire k × k, pas 2 × k : on divise par k × k.',
         'Division par 2k')]
B_H3, S_H3 = cases_et_specs(3, J_H3, E_H3, vk(0, 15, a=16), 'k = 1,5, A\' = 36')
H1_V3 = variation(
    'Après ' + TRANSFO + ' de rapport $k = ' + K + '$, une figure a une aire de $'
    + exact('k*k*a') + '~\\unit{cm^2}$. Quelle était l\'aire de la figure de départ ?\n\n'
    '$\\mathcal{A} = ?~\\unit{cm^2}$',
    VARS_K + [var('a', '5..60')],
    [B_H3],
    ['Dans ' + TRANSFO_DE + ', l\'aire de départ est multipliée par $k^2 = ' + exact('k*k')
     + '$ : $$\\mathcal{A} \\times ' + exact('k*k') + ' = ' + exact('k*k*a') + '$$',
     'On divise donc par $k^2$ : $$\\mathcal{A} = \\dfrac{' + exact('k*k*a') + '}{'
     + exact('k*k') + '} = ' + couleur('{{a}}~\\unit{cm^2}') + '$$'],
    'L\'aire d\'arrivée est l\'aire de départ multipliée par $k^2$ : quelle opération fait le '
    'chemin inverse ?',
    C_K + ['k*k*a < 1000', 'k*k*k*k*a < 1000'] + distincts(J_H3, E_H3),
)

ecrire('h1-agrandissement-reduction-aires-volumes', modele(
    'Agrandissement et réduction : aires et volumes',
    'Rapport k d\'un agrandissement ou d\'une réduction : aire de l\'image (k²), volume de '
    'l\'image (k³), k depuis deux longueurs, aire de départ (hors programme de cycle 4)',
    1, 90, [H1_V0, H1_V1, H1_V2, H1_V3], S_H0 + S_H0b + S_H1 + S_H1b + S_H2 + S_H2b + S_H3))


# =============================================================================================
# H2 — sans point : triangles semblables. ABC et DEF, Â = D̂, B̂ = Ê, Ĉ = F̂ (v0, v1).
# =============================================================================================

SEMBLABLES = ('Les triangles $ABC$ et $DEF$ sont semblables : $\\widehat{A} = \\widehat{D}$, '
              '$\\widehat{B} = \\widehat{E}$ et $\\widehat{C} = \\widehat{F}$. ')
E_DIFF_S = ('Les longueurs de deux triangles semblables sont proportionnelles : on les multiplie '
            'par un même rapport, on n\'ajoute pas la même différence.')
HOMOLOGUES = ('Les sommets homologues sont ceux des angles égaux : $A$ et $D$, $B$ et $E$, $C$ '
              'et $F$. Les longueurs des côtés homologues sont proportionnelles : '
              '$$\\dfrac{DE}{AB} = \\dfrac{EF}{BC} = \\dfrac{DF}{AC}$$')
HINT_S = ('Associe chaque côté de $ABC$ à son homologue dans $DEF$ (celui qui relie les sommets '
          'homologues), puis écris l\'égalité des rapports.')


def h2_longueur(vi, connu, cherche, nom, valeurs):
    juste = f'{nom}*de/ab'
    erreurs = [
        (f'{nom}*ab/de', 'Tu as renversé le rapport : écris DE/AB = ' + cherche + '/' + connu
         + ', puis isole ' + cherche + '.', 'Rapport renversé'),
        (f'{nom}+de-ab', E_DIFF_S, 'Même différence ajoutée'),
        (f'{nom}*de', 'Tu as oublié de diviser par AB : on multiplie ' + connu + ' par DE, puis '
         'on divise par AB.', 'Division oubliée'),
    ]
    blank, specs = cases_et_specs(vi, juste, erreurs, valeurs, 'AB = {ab}, {c} = {x}, DE = {de}'
                                  .format(c=connu, x=valeurs[nom], **valeurs))
    v = variation(
        SEMBLABLES + 'On donne $AB = {{ab}}~\\unit{cm}$, $' + connu + ' = {{' + nom + '}}~'
        '\\unit{cm}$ et $DE = {{de}}~\\unit{cm}$. Calcule $' + cherche + '$.\n\n$' + cherche
        + ' = ?~\\unit{cm}$',
        [var('ab', '3..10'), var(nom, '3..12'), var('de', '2..15')],
        [blank],
        [HOMOLOGUES,
         '$$\\dfrac{DE}{AB} = \\dfrac{' + cherche + '}{' + connu + '} \\quad\\text{donc}\\quad '
         '\\dfrac{ {{de}} }{ {{ab}} } = \\dfrac{' + cherche + '}{ {{' + nom + '}} }$$',
         '$$' + cherche + ' = \\dfrac{ {{' + nom + '}} \\times {{de}} }{ {{ab}} } = '
         + couleur(exact(juste) + '~\\unit{cm}') + '$$'],
        HINT_S,
        ['de != ab', f'{nom} != ab', exact_au(juste, 100)] + distincts(juste, erreurs),
    )
    return v, specs


H2_V0, S_S0 = h2_longueur(0, 'BC', 'EF', 'bc', {'ab': 4, 'bc': 6, 'de': 10})   # 15
H2_V1, S_S1 = h2_longueur(1, 'AC', 'DF', 'ac', {'ab': 5, 'ac': 7, 'de': 4})    # 5,6

# --- v2 : côté homologue. p = 0 : B ↔ E, C ↔ F ; p = 1 : B ↔ F, C ↔ E.
# q : côté demandé (0 [AB], 1 [BC], 2 [AC]). Choix d'origine : 0 [DE], 1 [EF], 2 [DF].
IMG_B = '{{if:p==0|E|F}}'
IMG_C = '{{if:p==0|F|E}}'
COTE = '{{if:q==0|[AB]|}}{{if:q==1|[BC]|}}{{if:q==2|[AC]|}}'
IMG_COTE = ('{{if:q==0|[D' + IMG_B + ']|}}{{if:q==1|[EF]|}}'
            '{{if:q==2|[D' + IMG_C + ']|}}')
H2_V2 = variation(
    'Les triangles $ABC$ et $DEF$ sont semblables : $\\widehat{A} = \\widehat{D} = {{a}}^{\\circ}$, '
    '$\\widehat{B} = \\widehat{' + IMG_B + '} = {{b}}^{\\circ}$ et $\\widehat{C} = \\widehat{'
    + IMG_C + '} = {{eval:180-a-b}}^{\\circ}$. Quel côté du triangle $DEF$ est l\'homologue du '
    'côté $' + COTE + '$ ?\n\n```choix\n- $[DE]$\n- $[EF]$\n- $[DF]$\n```',
    [var('p', '0..1'), var('q', '0..2'), var('a', '30..70'), var('b', '40..80')],
    [case('{{eval:q+p*(2-2*q)}}')],
    ['Les sommets homologues sont ceux des angles égaux : $A$ et $D$, $B$ et $' + IMG_B + '$, '
     '$C$ et $' + IMG_C + '$.',
     'Le côté $' + COTE + '$ a pour homologue le côté qui relie les homologues de ses deux '
     'extrémités : $' + couleur(IMG_COTE) + '$.',
     'Attention : l\'ordre des lettres dans le nom $DEF$ ne dit pas quels sommets sont '
     'homologues ; ce sont les angles égaux qui le disent.'],
    'Deux sommets homologues ont le même angle. Un côté a pour homologue le côté qui relie les '
    'homologues de ses deux extrémités.',
    ['a != b', 'a + b <= 140', '180 - a - b != a', '180 - a - b != b'],
)
VS = {'a': 50, 'b': 60}
S_S2 = [
    spec('v2 B ↔ E, côté [AB] : [DE]', 2, {**VS, 'p': 0, 'q': 0}, 'correct', ['0']),
    spec('v2 B ↔ E, côté [AB] : [DF] faux', 2, {**VS, 'p': 0, 'q': 0}, 'incorrect', ['2']),
    spec('v2 B ↔ F, côté [AB] : [DF]', 2, {**VS, 'p': 1, 'q': 0}, 'correct', ['2']),
    spec('v2 B ↔ F, côté [AB] : [DE] faux (ordre des lettres)', 2, {**VS, 'p': 1, 'q': 0},
         'incorrect', ['0']),
    spec('v2 B ↔ F, côté [BC] : [EF]', 2, {**VS, 'p': 1, 'q': 1}, 'correct', ['1']),
    spec('v2 B ↔ F, côté [AC] : [DE]', 2, {**VS, 'p': 1, 'q': 2}, 'correct', ['0']),
    spec('v2 B ↔ F, côté [AC] : [DF] faux (ordre des lettres)', 2, {**VS, 'p': 1, 'q': 2},
         'incorrect', ['2']),
]

ecrire('h2-triangles-semblables', modele(
    'Triangles semblables : côtés homologues et longueurs',
    'Triangles semblables (angles égaux) : calculer une longueur par l\'égalité des rapports des '
    'côtés homologues, trouver le côté homologue d\'un côté (hors programme de cycle 4)',
    1, 90, [H2_V0, H2_V1, H2_V2], S_S0 + S_S1 + S_S2))
