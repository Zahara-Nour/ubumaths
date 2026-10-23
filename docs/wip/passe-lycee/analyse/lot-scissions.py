"""Génère la migration du lot des SCISSIONS de la passe lycée : 50 modèles taguables par variation
(TAG_PAR_VARIATION) sont partagés en un modèle par point ou groupe de points ; l'origine garde son
identifiant et le groupe le plus fourni, chaque autre groupe part dans un modèle neuf.

Source : `scissions-plan.csv` et `scissions-notes.md`, validés en bloc par David le 2026-10-23 (« je
valide tout ») avec les réponses S7 (a, 4 modèles), S8 (b, V5 relue en TSPE-316, 4 modèles), S9 (a, 4),
S10 (a, 4), X1 (a, TSPE-445 / TSPE-595 pour les neufs en exp), X2 (a, TEXP-223 pour l'affixe du
milieu), X3 (a, variance acceptée sous TCOMP-363 / TCOMP-359). `95ee8348` porte aussi sa modification
du lot A (`lot-modifier.md` : V2, intégrande √(t² + c) → 1/(t² + c), F′(2) exact). Hors de ce lot :
E3 (5 modèles à dédoubler et réécrire), S6 (`0dee4515`, scission par case), S11 (`30b597c3`, V2 à
enrichir), les 2 SANS_TAG, et `efb12f4b` (conflit 2 ci-dessous).

Nœuds (règle de l'ADR 0020 § 7, appliquée comme en #1632) : R2, un modèle passe sur le nœud de ses
points (6 origines déplacées, les neufs rangés sur le nœud de leur point) ; « retrait forcé » quand
les points de Tle spé et de Tle compl. vivent sur des nœuds incompatibles, le modèle garde son point
le plus précis (David, 2026-10-23, recos suivies) : 806c10f4 neuf V5 TSPE-441 seul ; efb12f4b non
scindé (ses trois parts n'auraient que TCOMP-250, déjà posé) ; 95ee8348 neuf TCOMP-272 seul ;
dd0ee69a origine TSPE-481 seul, neuf TCOMP-269 seul ; ef3c495c origine TCOMP-296 seul, neuf V1
TCOMP-288 seul ; 13e2d419 neuf V5 TCOMP-301 seul.

Contenu relevé dans `../releves/templates.json` : empreintes md5 du contenu, nœuds et tags des 51
modèles (efb12f4b compris) identiques à la prod le 2026-10-23 (MCP, lecture seule). Nœuds et points :
`etat-prod-2026-10-23b/` (inchangés depuis). Niveaux pris dans les catégories : relevés en prod le
même jour (`NIVEAUX_PRIS`).

    python3 docs/wip/passe-lycee/analyse/lot-scissions.py [dossier où écrire les modèles]
"""

import json
import sys

sys.path.insert(0, 'docs/wip/passe-lycee/analyse')
from scissions_outils import generer  # noqa: E402

ANALYSE = 'docs/wip/passe-lycee/analyse/'
ETAT = ANALYSE + 'etat-prod-2026-10-23b/'


def V(*numeros: int) -> list[int]:
    """Variations V1, V2… (numérotation des notes) → indices base 0."""
    return [i - 1 for i in numeros]


# ============================================================================
# RETOUCHES
# ============================================================================

def retirer_variable_commune_a(t: dict) -> None:
    # a86442c1 : `a` (3..5) ne sert qu'à V3 et V6, restées sur l'origine.
    assert t['shared']['variables'] == [{'name': 'a', 'expression': '3..5'}], t['shared']
    del t['shared']['variables']


def m_95ee8348(t: dict) -> None:
    # Lot A (TCOMP-272) : √ n'est pas une fonction de la Tle compl. ; l'intégrande devient 1/(t² + c),
    # F′(2) = 1/(4 + c) exact.
    v = t['variations'][1]
    assert v['blanks'] == [{'expectedAnswer': '{{eval:sqrt(4+c)}}'}], v['blanks']
    v['blanks'] = [{'expectedAnswer': '\\frac{1}{ {{eval:4+c}} }'}]
    avant = '\\sqrt{t^{2}+{{c}}}'
    assert v['statement'].count(avant) == 1
    v['statement'] = v['statement'].replace(avant, '\\dfrac{1}{t^{2}+{{c}}}')
    v['correction']['steps'] = [
        "La fonction $g:t\\mapsto\\dfrac{1}{t^{2}+{{c}}}$ est continue sur $\\mathbb{R}$ (son dénominateur ne "
        "s'annule pas), donc $F$ est dérivable et $F'(x)=g(x)=\\dfrac{1}{x^{2}+{{c}}}$.",
        "$F'(2)=\\dfrac{1}{2^{2}+{{c}}}=\\textcolor{{{color:primary.0}}}{\\dfrac{1}{ {{eval:4+c}} }}$.",
        "Inutile (et ici impossible avec les fonctions du programme) de calculer l'intégrale : on ne calcule "
        "pas $F(2)$, ni $g(2)-g(1)$.",
    ]
    anciennes = [s for s in t['test_specs'] if s['variationIndex'] == 1]
    assert [s['description'] for s in anciennes] == [
        'v1 : c=5 → 3', 'v1 : √9 non simplifié', 'v1 : g(2) − g(1)', 'v1 : F′ = g′ : g′(2) = 2/3',
        'v1 : c=32 → 6'], anciennes
    i = t['test_specs'].index(anciennes[0])
    t['test_specs'][i:i + len(anciennes)] = [
        {'answers': ['\\frac{1}{9}'], 'expected': {'status': 'correct'}, 'variables': {'c': '5'},
         'description': 'v1 : c=5 → 1/9', 'variationIndex': 1},
        {'answers': ['\\frac{2}{18}'], 'expected': {'status': 'unoptimal_form', 'constraintViolations': ['reducedFractions']},
         'variables': {'c': '5'}, 'description': 'v1 : 2/18 non simplifié', 'variationIndex': 1},
        {'answers': ['-\\frac{1}{18}'], 'expected': {'status': 'incorrect'}, 'variables': {'c': '5'},
         'description': 'v1 : g(2) − g(1)', 'variationIndex': 1},
        {'answers': ['-\\frac{4}{81}'], 'expected': {'status': 'incorrect'}, 'variables': {'c': '5'},
         'description': 'v1 : F′ = g′ : g′(2) = −4/81', 'variationIndex': 1},
        {'answers': ['\\frac{1}{36}'], 'expected': {'status': 'correct'}, 'variables': {'c': '32'},
         'description': 'v1 : c=32 → 1/36', 'variationIndex': 1},
    ]


# ============================================================================
# LE LOT
# ============================================================================

# Court → parts : l'origine (variations, points, titre, sous-titre), puis ses modèles neufs
# (UUID fixé, variations, points, titre, sous-titre[, retouche]).
LOT = {
    # ---- 1re spé ----------------------------------------------------------------------------
    '536c01bb': [
        (V(1), ['1SPE-202'], 'Identité ou équation : reconnaître une identité',
         "Reconnaître une identité (égalité vraie pour tout x) : la développer, ou la réfuter par un contre-exemple"),
        ('fb3b536c-1ead-4863-85b2-a6104d949d50', V(2), ['1SPE-366'], "Statut d'une lettre : variable, inconnue ou paramètre",
         "Dans une définition, une équation ou une famille d'expressions, dire si une lettre est une variable, "
         "une inconnue ou un paramètre"),
    ],
    '27d77564': [
        (V(2, 3), ['1SPE-379'], "Valeur d'un placement à intérêts composés",
         "Capital au bout de n années à intérêts composés, arrondi au centime ou à l'euro"),
        ('103cf8d9-a014-44d0-a4a0-08d94749a60e', V(1), ['1SPE-230'], "Valeur d'un placement à intérêts simples",
         "Capital au bout de n années à intérêts simples, valeur exacte"),
    ],
    'a86442c1': [
        (V(1, 2, 3, 4, 6), ['1SPE-266'], 'Calculer une dérivée',
         'Fonctions usuelles : constante, x, x², xⁿ, 1/x'),
        ('ff36ebdf-b40d-4a1a-9eae-abe61c05cc80', V(5), ['1SPE-393'], 'Dérivée de la fonction racine carrée', '(√x)′ = 1/(2√x)',
         retirer_variable_commune_a),
    ],
    '68166a11': [
        (V(2, 3, 4), ['1SPE-292'], "Signe de l'exponentielle",
         "Vrai ou faux : eˣ > 0 pour tout réel x (pièges : eᵃ négatif pour a < 0, eˣ ⩾ 1)"),
        ('ac3e6395-2d00-4ef5-a23e-50819afd7e50', V(1), ['1SPE-289'], 'Valeur de e⁰', 'QCM : e⁰ = 1'),
        ('09432575-000f-41be-b50a-99b9e938d136', V(5), ['1SPE-291'], 'Valeur approchée du nombre e', 'QCM : e = e¹ ≈ 2,718'),
    ],
    '9a4592bf': [
        (V(2, 3, 4), ['1SPE-292'], "Équations particulières avec l'exponentielle",
         "(x − k)eˣ = 0 (eˣ ne s'annule pas), e^u = k ⩽ 0 (aucune solution)"),
        ('e572933c-bf5c-42fb-a3e5-412f53531acf', V(1), ['1SPE-405'], 'Résoudre e^(ax+b) = 1', 'e^u = 1 équivaut à u = 0'),
    ],
    '74363137': [
        (V(1, 2, 4), ['1SPE-320'], "Norme d'une somme ou d'une différence",
         "Développer ‖u + v‖² et ‖u − v‖² pour calculer une norme"),
        ('affe59f7-3de6-4f30-89ce-33486ed01fcf', V(3), ['1SPE-321'], 'Produit scalaire à partir de trois normes',
         "u·v à partir de ‖u‖, ‖v‖ et ‖u + v‖, par le développement de ‖u + v‖²"),
    ],
    # ---- Tle spé ----------------------------------------------------------------------------
    'dfb727cd': [
        (V(1, 3, 4), ['TSPE-308'], "Nombre de parties d'un ensemble : 2 puissance n",
         "Parties d'un ensemble à n éléments, garnitures (avec ou sans partie vide) (pièges : 2n, n², oubli ou "
         "ajout à tort de la partie vide)"),
        ('c0b45c61-a141-4ef5-8ec6-4a319f7bd75c', V(2), ['TSPE-542'], 'Nombre de mots binaires de longueur n',
         '2ⁿ mots binaires de longueur n (pièges : 2n, n²)'),
        ('6a9a3d5b-cc46-4be3-83dd-f3e5490d2794', V(5), ['TSPE-543'], "Nombre de chemins d'un arbre à n niveaux",
         "2ⁿ chemins dans l'arbre de n lancers d'une pièce (pièges : 2n, n²)"),
    ],
    '0bde6091': [
        (V(1, 2), ['TSPE-546'], 'Chemins sur un quadrillage : combinaisons',
         "Chemins monotones de (0 ; 0) à (p ; q) comptés par C(p + q, p), passage imposé par un point "
         "(produit) (pièges : 2^(p+q), (p + q)!, additionner les deux morceaux)"),
        ('74604a26-fd67-45ae-bff7-1d095bea3e0c', V(3), ['TSPE-545'], 'Mots à deux lettres : combinaisons',
         'Mots formés de k lettres A et n − k lettres B, comptés par C(n, k) (pièges : 2ⁿ, n!)'),
    ],
    '7d9d9b81': [
        (V(1, 2), ['TSPE-313'], 'Formule des coefficients binomiaux',
         'C(n, 2) = n(n − 1)/2 et C(n, 3) par la formule (piège : n(n − 1) sans diviser par 2)'),
        ('dd23bf2d-2c62-4441-9b3d-fa73c1130107', V(3), ['TSPE-311'], 'Permutations : ranger n objets', 'n! façons de ranger n objets distincts'),
        ('e76a43eb-2a92-4480-a596-0fe9a22fa6a4', V(4), ['TSPE-309'], 'Arrangements : nombre de podiums',
         'Nombre de triplets ordonnés d\'éléments distincts : n(n − 1)(n − 2) (piège : C(n, 3) pour un podium '
         'ordonné)'),
    ],
    '119b9148': [
        (V(1), ['TSPE-557'], "Espace : norme d'un vecteur",
         "Norme d'un vecteur en repère orthonormé, valeur exacte (pièges : racine oubliée, z oublié, racine non "
         "simplifiée)"),
        ('62e446cb-624a-46ef-a627-c62636b7628a', V(2), ['TSPE-346'], 'Espace : distance entre deux points',
         'Distance AB en repère orthonormé, valeur exacte (pièges : racine oubliée, z oublié, racine non simplifiée)'),
    ],
    '1277a5b6': [
        (V(1, 2), ['TSPE-345'], 'Espace : calculer un produit scalaire',
         'Produit scalaire en repère orthonormé, à partir des coordonnées de deux vecteurs ou de trois points '
         '(AB·AC) (pièges : z oublié, OB·OC)'),
        ('7c8bd127-d67e-47ba-a4ad-1277833ab12f', V(3), ['TSPE-558'], 'Espace : produit scalaire par polarisation',
         'u·v à partir de ‖u‖, ‖v‖ et ‖u + v‖ (piège : division par 2 oubliée)'),
    ],
    '536db399': [
        (V(1), ['TSPE-353'], 'Espace : plans perpendiculaires ?',
         'Décider (QCM) si deux plans sont perpendiculaires (vecteurs normaux orthogonaux)'),
        ('23644a9c-6900-4c27-9f9c-5e91379309e1', V(2), ['TSPE-563'], 'Espace : droite orthogonale à un plan ?',
         'Décider (QCM) si une droite est orthogonale à un plan (vecteur directeur colinéaire au vecteur normal)'),
    ],
    '95f04c3e': [
        (V(1, 3), ['TSPE-369'], 'Espace : projeté orthogonal sur un plan',
         "Coordonnées du projeté orthogonal H d'un point sur un plan d'équation donnée (pièges : M recopié, "
         "symétrique)"),
        ('31b49cdf-3d54-44e2-a01d-c4597f335758', V(2), ['TSPE-562'], "Espace : distance d'un point à un plan",
         'Distance du point au plan, par son projeté orthogonal (pièges : MH², racine non simplifiée)'),
    ],
    '68b13d33': [
        (V(2), ['TSPE-371'], 'Espace : trois vecteurs forment-ils une base ?',
         "Décider (QCM) si trois vecteurs forment une base de l'espace (coplanarité par un système)"),
        ('40ddef82-52e9-4e2a-8073-e87c7b8918ed', V(1), ['TSPE-550'], 'Espace : trois points alignés ?',
         'Décider (QCM) si trois points sont alignés (colinéarité de deux vecteurs)'),
    ],
    '2b240d8c': [
        (V(3, 4), ['TSPE-375'], 'Espace : trouver un vecteur directeur ou un vecteur normal',
         "Vecteur normal au plan (ABC), vecteur directeur de l'intersection de deux plans — tout vecteur "
         "colinéaire non nul est juste (piège : vecteur directeur pris pour normal)"),
        ('0003deae-9017-4d16-b22c-19f08129e9d7', V(1), ['TSPE-365'], 'Espace : vecteur directeur de la droite (AB)',
         'Vecteur directeur de (AB) à partir de deux points — tout vecteur colinéaire non nul est juste (piège : '
         'point pris pour vecteur)'),
        ('c22cea08-0d69-41fc-b205-786dd6f2c062', V(2), ['TSPE-559'], "Espace : direction d'une droite orthogonale à un plan",
         'Un vecteur normal au plan dirige toute droite orthogonale à ce plan — tout vecteur colinéaire non nul '
         'est juste (piège : point pris pour vecteur)'),
    ],
    '34b03dee': [
        (V(2, 3), ['TSPE-360'], "Espace : intersection d'une sphère et d'un plan",
         "Cercle d'intersection d'une sphère et d'un plan : centre et rayon, par Pythagore avec la distance du "
         "centre au plan (pièges : ρ² au lieu de ρ, centre Ω au lieu de H)"),
        ('bf13ac32-b462-4f19-bb11-4f281e1c21e0', V(1), ['TSPE-376'], "Espace : point d'une sphère d'équation donnée",
         "Coordonnée manquante d'un point d'une sphère donnée par son équation centre-rayon (piège : solution "
         "négative)"),
    ],
    'c0f49b76': [
        (V(1), ['TSPE-378'], 'Définition de la limite : un rang à partir duquel tous les termes conviennent',
         "Suite tendant vers +∞ : donner UN entier N tel que tous les uₙ pour n ⩾ N sont dans [A ; +∞[ (toute "
         "réponse qui convient est juste ; pièges : rang trop petit, rang non entier)"),
        ('ddaa7529-61c0-48cf-93d0-9bd97b88cb2a', V(2), ['TSPE-380'], 'Définition de la convergence : un rang à partir duquel tous les termes conviennent',
         "Suite convergente : donner UN entier N tel que tous les uₙ pour n ⩾ N sont dans ]ℓ − ε ; ℓ + ε[ "
         "(toute réponse qui convient est juste ; pièges : rang trop petit, rang non entier)"),
        ('edb636bf-514e-4d8e-9893-5edb655f2c44', V(3), ['TSPE-379'], 'Suite tendant vers −∞ : un rang à partir duquel tous les termes conviennent',
         "Suite tendant vers −∞ : donner UN entier N tel que tous les uₙ pour n ⩾ N sont dans ]−∞ ; −A] (toute "
         "réponse qui convient est juste ; pièges : rang trop petit, rang non entier)"),
    ],
    'b97dabe1': [
        (V(1, 2, 3), ['TSPE-580'], 'Croissances comparées : exponentielle et puissances',
         'Limites de eˣ − kxⁿ et xⁿe⁻ˣ en +∞, de xⁿeˣ en −∞ (pièges : x e⁻ˣ → +∞, ∞ × 0 = 1, limite d\'un seul '
         'facteur)'),
        ('2cef3442-e79c-4be5-b139-dce2d32a9fb0', V(4, 5), ['TSPE-443'], 'Croissances comparées : logarithme et puissances',
         "Limites de ln x / xⁿ en +∞ et de xⁿ ln x en 0 (pièges : ∞ × 0 = 1, limite d'un seul facteur)"),
    ],
    '7d552757': [
        (V(1, 2), ['TSPE-458'], 'Reconnaître une inéquation sur le cercle trigonométrique',
         'Arc du cercle (mesures principales) : retrouver cos x ⩾ a ou sin x ⩾ a (pièges : cosinus = abscisse et '
         'sinus = ordonnée confondus, sens)'),
        ('32696595-493b-4d81-bee2-d611e1abf84f', V(3), ['TSPE-457'], 'Reconnaître une équation sur le cercle trigonométrique',
         'Points du cercle (mesures principales) : retrouver sin x = a (pièges : cosinus et sinus confondus, signe)'),
    ],
    '23402520': [
        (V(1, 2, 5, 6), ['TSPE-467'], 'Primitive de sinus et cosinus vérifiant une condition',
         'Primitives de a·cos x et a·sin x, quelconques ou rendues uniques par F(0) = y₀ (spécialité seulement)'),
        ('264b9c11-e171-4a2c-9b6e-d5151b309e99', V(3, 4, 7), ['TSPE-468'], 'Primitive de cos(ωx) et sin(ωx)',
         'Primitives de cos(ωx) et sin(ωx), quelconques ou nulles en 0 (pièges : facteur 1/ω oublié ou multiplié, '
         'signe)'),
    ],
    'aced2e6c': [
        (V(2, 3, 4), ['TSPE-622'], 'Échantillon de taille n : variance et écart type de Sₙ et Mₙ',
         'V(Sₙ) = nV, V(Mₙ) = V/n, σ(Mₙ) = σ/√n (pièges : V/n² ou n²V, σ/n)'),
        ('de8fa591-56a6-4766-8799-0cb72b9f0073', V(1), ['TSPE-524'], 'Échantillon de taille n : espérance de Sₙ', 'E(Sₙ) = nμ'),
    ],
    '71cb8ab7': [
        (V(2, 3, 4, 5), ['TSPE-527'], 'Somme de variables aléatoires indépendantes : variance',
         'X et Y indépendantes : V(X + Y) = V(X − Y) = V(X) + V(Y), V(aX + bY) = a²V(X) + b²V(Y), écart type de '
         'la somme (pièges : V(X) − V(Y), aV(X), σ(X) + σ(Y))'),
        ('7974722d-6328-4388-a4fd-418cc0e25600', V(1), ['TSPE-526'], 'Espérance de aX + bY : linéarité', 'E(aX + bY) = aE(X) + bE(Y)'),
    ],
    '91db0034': [
        (V(2, 3), ['TSPE-533'], "Inégalité de concentration : taille d'échantillon",
         'P(|Mₙ − μ| ⩾ δ) ⩽ V/(nδ²) : plus petit n pour un risque donné (pièges : V/(nδ), arrondi par défaut)'),
        ('95f73515-63c1-45e2-9b99-242335d8ad03', V(1), ['TSPE-531'], 'Inégalité de concentration : majorant',
         'Majorant V/(nδ²) de P(|M − μ| ⩾ δ) pour n donné (pièges : V/(nδ), oubli de n)'),
    ],
    # ---- Tle spé et Tle compl. -----------------------------------------------------------------
    '9ad36217': [
        (V(2, 3), ['TSPE-442', 'TCOMP-225'], 'Courbes de ln et exp : symétrie par rapport à y = x',
         'Symétrie des courbes de exp et ln par rapport à y = x, point symétrique (piège : mauvaise symétrie)'),
        ('74b103a8-2b7e-4647-b056-65a97e598659', V(1), ['TSPE-594', 'TCOMP-225'], 'Reconnaître la courbe de ln',
         'Reconnaître la courbe de ln parmi quatre (pièges : courbe de exp, −ln x, ln(x + 1))'),
    ],
    '806c10f4': [
        (V(1, 2, 3, 4), ['TSPE-415', 'TCOMP-230'], 'Limite d\'une fonction par opérations, sans forme indéterminée',
         'Limites en ±∞ ou en 0 de sommes simples de fonctions de référence (1/x, 1/x², √x, x³, eˣ) sans forme '
         'indéterminée (pièges : signe du coefficient, eˣ → 0 en −∞)'),
        ('a6b6db45-3c42-42a3-b697-5a31f3e7f0cc', V(5), ['TSPE-441'], 'Limite de b + a ln x en 0',
         'ln x → −∞ en 0, donc b + a ln x tend vers −∞ ou +∞ selon le signe de a (piège : ln 0 « = 0 »)'),
    ],
    '14036c68': [
        (V(1, 2, 4), ['TSPE-596', 'TCOMP-345'], 'Résoudre une inéquation avec ln',
         'ln x < a, ln x ⩾ a, ln(ax + b) ⩽ 0 ; ensemble de solutions en intervalle (pièges : domaine x > 0 '
         'oublié, sens de l\'inégalité, crochets)'),
        ('f0a6ec4e-ca55-4f43-8c4f-d7847e21578c', V(3, 5), ['TSPE-595', 'TCOMP-344'], 'Résoudre une inéquation avec exp',
         "eˣ > b, e⁻ˣ ⩾ k ; ensemble de solutions en intervalle (pièges : sens de l'inégalité, crochets)"),
    ],
    'd3301f2d': [
        (V(1, 3, 5), ['TSPE-446', 'TCOMP-238'], 'Résoudre une équation avec ln',
         'ln x = a, ln(ax + b) = c, 2 ln x = ln a ; valeur exacte (pièges : domaine x > 0 oublié, signe)'),
        ('66f033c1-32f2-4517-a38c-819fb9b32abe', V(2, 4), ['TSPE-445', 'TCOMP-237'], 'Résoudre une équation avec exp',
         'eˣ = b, e^(ax + b) = k ; valeur exacte (pièges : ln et exp confondus, signe)'),
    ],
    '2d480f3d': [
        (V(1, 4, 5), ['TSPE-468', 'TCOMP-350'], 'Primitive de la forme u′eᵘ',
         'Reconnaître u′eᵘ (à un facteur constant près), primitive quelconque ou fixée par F(x₀) = y₀'),
        ('0cbbbe91-9898-4c47-bc12-85766ed3de9e', V(2, 6), ['TSPE-468', 'TCOMP-252'], 'Primitive de la forme 2uu′',
         'Reconnaître 2uu′ (à un facteur constant près), primitive quelconque ou fixée par F(x₀) = y₀'),
        ('194a7c10-455e-4b96-b7ae-684909392fb3', V(3, 7), ['TSPE-468', 'TCOMP-351'], 'Primitive de la forme u′/u',
         'Reconnaître u′/u (à un facteur constant près), primitive quelconque ou fixée par F(x₀) = y₀'),
    ],
    'f01270c2': [
        (V(1, 2), ['TSPE-468', 'TCOMP-350'], "Coefficient d'une primitive de la forme u′eᵘ",
         'Trouver k pour que k·eᵘ soit une primitive de f : diviser par le facteur manquant de u′ (piège : '
         'multiplier)'),
        ('5439aae4-4660-42ba-9ba8-7271c4ee4fcd', V(3), ['TSPE-468', 'TCOMP-252'], "Coefficient d'une primitive de la forme 2uu′",
         'Trouver k pour que k·u² soit une primitive de f : diviser par le facteur manquant de u′ (piège : '
         'multiplier)'),
        ('11eac96b-ee1d-4a42-ac8f-1dfc48e0e7a6', V(4), ['TSPE-468', 'TCOMP-351'], "Coefficient d'une primitive de la forme u′/u",
         'Trouver k pour que k·ln(u) soit une primitive de f : diviser par le facteur manquant de u′ (piège : '
         'multiplier)'),
    ],
    '37ce7759': [
        (V(1), ['TSPE-419', 'TCOMP-264'], 'Convexité : lecture sur la courbe de f',
         "Lire l'intervalle où f est convexe sur sa courbe (courbe au-dessus de ses tangentes)"),
        ('e3e19d28-b41b-48f3-9aaa-bc8bfeeacea7', V(2), ['TSPE-588', 'TCOMP-264'], 'Convexité : lecture sur la courbe de f′',
         "Lire l'intervalle où f est convexe sur la courbe de f′ (f′ croissante)"),
        ('225c8682-ad81-44c1-b821-e94af0530958', V(3), ['TSPE-590', 'TCOMP-264'], 'Convexité : lecture sur la courbe de f″',
         "Lire l'intervalle où f est convexe sur la courbe de f″ (f″ ⩾ 0)"),
        ('98f9d4b2-ebdd-4ed9-81a4-deb2e5b58c07', V(4), ['TSPE-587', 'TCOMP-353'], "Point d'inflexion : lecture graphique",
         "Lire sur la courbe de f l'abscisse de son point d'inflexion (changement de convexité)"),
    ],
    '95ee8348': [
        (V(1, 2), ['TSPE-476', 'TCOMP-272'], 'Dérivée de x ↦ ∫ₐˣ f(t) dt',
         'F(x) = ∫ₐˣ g(t) dt est la primitive de g qui s\'annule en a : F′ = g, F′(2) = g(2) (pièges : F′ = g′, '
         'F′(x) = g(x) − g(a))'),
        ('5e702745-c4ba-4d75-9188-902ac7373531', V(3, 4), ['TCOMP-272'], 'Fonction x ↦ ∫ₐˣ f(t) dt : sens de variation et valeur en a',
         'F(x) = ∫ₐˣ g(t) dt : sens de variation par le signe de g, F(a) = 0 (pièges : F′ = g′, F(a) ≠ 0)'),
    ],
    'dd0ee69a': [
        (V(1, 3), ['TSPE-481'], 'Encadrer une intégrale',
         'm ⩽ f ⩽ M sur [a ; b] donne m(b − a) ⩽ ∫ₐᵇ f ⩽ M(b − a) ; lecture sur une courbe (piège : oubli de la '
         'longueur b − a)'),
        ('7a0b795c-b802-44c2-b06c-e3631610908c', V(2), ['TCOMP-269'], 'Encadrer une valeur moyenne',
         'f croissante sur [a ; b] : f(a) ⩽ μ ⩽ f(b) pour sa valeur moyenne μ'),
    ],
    'f26151ff': [
        (V(1, 2), ['TSPE-492', 'TCOMP-280'], 'Interpréter une intégrale en contexte',
         '∫ v(t) dt = distance parcourue, ∫ débit = volume écoulé'),
        ('298e2335-130a-4121-ab16-51c800b2edb0', V(3), ['TSPE-493', 'TCOMP-281'], 'Interpréter une valeur moyenne en contexte : vitesse moyenne',
         '(1/T) ∫ v(t) dt = vitesse moyenne (piège : confondre distance et vitesse moyenne)'),
    ],
    'dbee4649': [
        (V(1, 5), ['TSPE-522', 'TCOMP-291'], 'Loi binomiale : espérance',
         'E(X) = np, nombre moyen de succès (piège : np(1 − p) au lieu de np)'),
        ('38001c3f-f4e9-46ec-beb7-0d2a373f54d4', V(2, 3), ['TSPE-621', 'TCOMP-363'], 'Loi binomiale : variance et écart type',
         'V(X) = np(1 − p), σ(X) = √(np(1 − p)) (pièges : np, variance et écart type confondus)'),
        ('1043c29e-4d7c-4128-a5d8-f35ec390900e', V(4), ['TSPE-502', 'TCOMP-359'], 'Loi de Bernoulli : variance', 'V(X) = p(1 − p) (piège : p)'),
    ],
    'ef3c495c': [
        (V(3, 5), ['TCOMP-296'], 'Relation et triangle de Pascal',
         "Déduire un coefficient binomial de deux voisins par la relation de Pascal, ou d'une ligne du triangle "
         "la ligne suivante"),
        ('07ebdcbe-dc7c-45cf-ad81-df70231719a2', V(1), ['TCOMP-288'], 'Coefficients binomiaux : chemins à k succès',
         "Nombre de chemins à k succès dans l'arbre d'un schéma de Bernoulli de n épreuves : C(n, k)"),
        ('970dab52-4ded-45f7-988f-0ddf6e68c554', V(2), ['TSPE-315', 'TCOMP-362'], 'Symétrie des coefficients binomiaux',
         'C(n, n − k) = C(n, k), sans calcul'),
        ('4dcbae71-f935-4792-93fe-0357b18e3511', V(4), ['TSPE-314', 'TCOMP-288'], 'Coefficients binomiaux particuliers',
         'C(n, 0) = C(n, n) = 1 et C(n, 1) = n, sans formule'),
    ],
    '6c80b4ec': [
        (V(4, 5), ['TSPE-511', 'TCOMP-299'], 'Loi binomiale : seuil et intervalle avec une table',
         'Extrait de table des probabilités cumulées fourni : plus petit k tel que P(X ⩽ k) ⩾ s, intervalle '
         '[a ; b] (piège : inégalité large ou stricte)'),
        ('f0c8c1fc-d499-4358-aee2-3becbc099f37', V(1), ['TSPE-619', 'TCOMP-297'], 'Loi binomiale : P(X > k) avec une table',
         'Extrait de table des probabilités cumulées fourni : P(X > k) = 1 − P(X ⩽ k) (piège : 1 − P(X ⩽ k − 1))'),
        ('4943ca05-f96a-43cf-ab60-a89f56e88ea7', V(2), ['TSPE-510', 'TCOMP-297'], 'Loi binomiale : P(X = k) avec une table',
         'Extrait de table des probabilités cumulées fourni : P(X = k) = P(X ⩽ k) − P(X ⩽ k − 1)'),
        ('7a58b19e-e3bf-4803-884c-0e0918b8cb6a', V(3), ['TSPE-620', 'TCOMP-297'], 'Loi binomiale : P(a ⩽ X ⩽ b) avec une table',
         'Extrait de table des probabilités cumulées fourni : P(a ⩽ X ⩽ b) = P(X ⩽ b) − P(X ⩽ a − 1) (piège : '
         'P(X ⩽ b) − P(X ⩽ a))'),
    ],
    '13e2d419': [
        (V(1, 2, 3), ['TSPE-516', 'TCOMP-298'], 'Loi géométrique : P(X = k), P(X ⩽ k), P(X > k)',
         'X ~ G(p) : P(X = k) = (1 − p)ᵏ⁻¹p, P(X > k) = (1 − p)ᵏ, P(X ⩽ k) = 1 − (1 − p)ᵏ (piège : exposant k au '
         'lieu de k − 1)'),
        ('76b4061b-1b1a-4513-9aeb-c991ca3d5334', V(4), ['TSPE-516', 'TCOMP-365'], 'Loi géométrique : nombre moyen de tentatives',
         'Rang moyen du premier succès : E(X) = 1/p (piège : E = p)'),
        ('7d3632bb-f590-446f-8a4e-26e1e5fdcdbf', V(5), ['TCOMP-301'], 'Loi géométrique : absence de mémoire',
         'P(X > m + n | X > m) = P(X > n) (piège : mémoire non utilisée)'),
    ],
    # ---- Tle compl. -------------------------------------------------------------------------
    '3cb90b97': [
        (V(2, 3), ['TCOMP-285'], 'Loi uniforme sur {1, …, n} : probabilités',
         'X uniforme sur {1, …, n} : P(X ⩽ k) = k/n, P(a ⩽ X ⩽ b) = (b − a + 1)/n (piège : b − a au lieu de '
         'b − a + 1)'),
        ('b71b4874-4a12-4655-b306-e56b502414e1', V(1, 4), ['TCOMP-357'], 'Loi uniforme sur {1, …, n} : espérance',
         "E(X) = (n + 1)/2, gain moyen d'un dé à n faces (piège : n/2)"),
    ],
    '89e16891': [
        (V(1, 2, 4), ['TCOMP-315'], 'Loi uniforme sur [a ; b] : probabilités',
         'X uniforme sur [a ; b] : P(c ⩽ X ⩽ d) = (d − c)/(b − a), P(X ⩾ c) = (b − c)/(b − a), P(X = c) = 0 '
         '(pièges : longueur non divisée, 1/(b − a) pour P(X = c))'),
        ('441d7ed2-54b2-4100-a26c-25ff1913fc33', V(3), ['TCOMP-373'], "Loi uniforme sur [a ; b] : temps d'attente moyen",
         'E(X) = (a + b)/2 (piège : (b − a)/2)'),
    ],
    'c6b5894c': [
        (V(1, 2, 3), ['TCOMP-315'], 'Loi exponentielle : probabilités',
         'X ~ E(λ) : P(X ⩽ t) = 1 − e^(−λt), P(X ⩾ t) = e^(−λt), P(s ⩽ X ⩽ t) = e^(−λs) − e^(−λt) (piège : '
         'P(X ⩾ t) et P(X ⩽ t) confondues)'),
        ('63ee5d66-5623-4020-9be4-babbe6df97e6', V(4), ['TCOMP-376'], 'Loi exponentielle : durée moyenne', 'E(X) = 1/λ (piège : E = λ)'),
        ('88202a40-9bce-48f8-8c2c-6e1266e92a26', V(5), ['TCOMP-313'], 'Loi exponentielle : absence de mémoire',
         'P(X > s + t | X > s) = P(X > t) = e^(−λt) (piège : mémoire non utilisée)'),
    ],
    '3cfcc718': [
        (V(3, 4), ['TCOMP-314'], 'Loi à densité : constante de normalisation',
         'Constante k pour que f soit une densité (aire totale 1) (piège : b − a au lieu de 1/(b − a))'),
        ('6b26aba3-ed27-43e3-97b9-3c6716b09975', V(1), ['TCOMP-370'], 'Loi à densité : probabilité = aire sous la courbe',
         'Lire une probabilité comme une aire sous la densité (figure) (piège : t/a au lieu de t²/a²)'),
        ('d9ac0141-321b-47a0-abf4-8be4f710b0e1', V(2), ['TCOMP-372'], 'Loi uniforme sur [0 ; b] : fonction de répartition',
         'F(x) = P(X ⩽ x) = x/b pour la loi uniforme sur [0 ; b] (figure)'),
    ],
    '49fac266': [
        (V(1, 2), ['TCOMP-321'], "Ajustement affine : interpréter le coefficient directeur et l'ordonnée à l'origine",
         'Droite donnée par la calculatrice : interpréter a (variation moyenne de y par unité de x) et b '
         '(estimation en x = 0)'),
        ('860f59fc-a82c-47d8-8639-6bdfdeadfa45', V(3, 4), ['TCOMP-322'], 'Coefficient de corrélation : interpréter r',
         "Valeur de r affichée par la calculatrice : pertinence d'un ajustement affine"),
    ],
    # ---- Tle expertes -----------------------------------------------------------------------
    '8b435b9d': [
        (V(1, 2), ['TEXP-207'], 'Résoudre une équation az = b dans ℂ',
         'az = b avec a complexe, iz + b = c ; solution sous forme algébrique (pièges : diviser par a sans '
         'conjugué, 1/i = i)'),
        ('b06551b4-8d51-4427-a317-33f62ab0869f', V(3), ['TEXP-208'], 'Résoudre une équation en z et son conjugué',
         'αz + βz̄ = c en posant z = x + iy (piège : traiter z̄ comme z)'),
    ],
    '7690e290': [
        (V(1, 4), ['TEXP-358'], "Affixe d'un vecteur, quatrième sommet d'un parallélogramme",
         "z_B − z_A, quatrième sommet d'un parallélogramme (pièges : z_A − z_B, mauvais sommet)"),
        ('182885a2-d674-4fa8-81e5-81d91657e4ed', V(2), ['TEXP-359'], 'Distance entre deux points par le module',
         'AB = |z_B − z_A| (piège : |z_B| − |z_A|)'),
        ('f2ecb17c-3301-413a-86dd-a337dc3d9e60', V(3), ['TEXP-223'], "Affixe du milieu d'un segment", 'z_I = (z_A + z_B)/2 (piège : (z_B − z_A)/2)'),
    ],
    '45d1cdd6': [
        (V(1, 2), ['TEXP-240'], "Formules d'Euler : linéariser",
         "Linéariser cos³x et sin²x à l'aide des formules d'Euler (pièges : coefficients, signe)"),
        ('166a4e09-ab60-458f-99b1-2e2c7cd04b0d', V(3), ['TEXP-363'], 'Formule de Moivre : exprimer cos 3x',
         'cos 3x en fonction de cos x par la formule de Moivre (pièges : coefficients, sin et cos confondus)'),
        ('ec45a864-6ac3-4b10-96e9-10fb91c29828', V(4), ['TEXP-230'], "Formule d'addition : cos(π/12)",
         'cos(π/3 − π/4) par la formule d\'addition, valeur exacte (piège : signe)'),
        ('3aed1a09-45ce-4178-8b52-ed1fdeef21ce', V(5), ['TEXP-231'], 'Formule de duplication : sin 2a',
         'sin 2a = 2 sin a cos a, cos a déduit de sin a (pièges : signe de cos a, 2 sin a)'),
    ],
    'acd9104c': [
        (V(2, 3), ['TEXP-249'], 'Factoriser un polynôme dont une racine est connue',
         'P(z) = (z − r)Q(z) : trouver Q, factoriser z³ − a³ (piège : signe de la racine)'),
        ('0f4d5d46-1898-4afd-9ac4-45301637650c', V(1, 4), ['TEXP-248'], 'Équation de degré 3 dont une racine est connue',
         'Résoudre P(z) = 0 de degré 3 avec une racine réelle ou imaginaire pure connue (pièges : solution '
         'conjuguée oubliée, racine connue oubliée)'),
    ],
    '2bf66851': [
        (V(1, 2, 4, 6, 7), ['TEXP-257'], "Racines n-ièmes de l'unité",
         "Racines 4es et cubiques de l'unité, argument de ωᵏ (pièges : racine oubliée, signe, argument non "
         "ramené)"),
        ('68c2275c-625a-4465-a7f9-8c86b697e9c5', V(3), ['TEXP-268'], "Somme des racines n-ièmes de l'unité",
         '1 + ω + … + ωⁿ⁻¹ = 0 pour ω = e^(2iπ/n) (pièges : n, 1)'),
        ('3636659f-0ee2-4147-8511-faf1af424856', V(5), ['TEXP-265'], "Polygones réguliers inscrits : longueur d'un côté",
         "Côté A₀A₁ = |ω − 1| d'un polygone régulier inscrit dans le cercle unité (piège : côté confondu avec le "
         "rayon)"),
    ],
    '44a4236b': [
        (V(1, 2), ['TEXP-279'], 'Théorème de Gauss : quelle conclusion ?',
         "Choisir la conclusion correcte du théorème de Gauss (pièges : conclure sur le mauvais facteur, oublier "
         "l'hypothèse « premiers entre eux »)"),
        ('551aa1c5-ebaa-4fa1-82d7-e68944ffc45a', V(4), ['TEXP-278'], 'Théorème de Bézout : premiers entre eux ?',
         'sa − tb = 1 entraîne que a et b sont premiers entre eux (théorème de Bézout)'),
        ('2869336b-d07d-4418-9eb1-1e2fa123dbce', V(3), ['TEXP-275'], 'PGCD et combinaison linéaire : quelle conclusion ?',
         'sa + tb = d entraîne seulement que PGCD(a, b) divise d (piège : croire que PGCD(a, b) = d)'),
    ],
    '629c231b': [
        (V(1, 3), ['TEXP-282'], 'Décomposition en facteurs premiers',
         'Décomposer un entier en produit de facteurs premiers (écriture avec puissances), plus petit facteur qui '
         'en fait un carré parfait (pièges : facteur non premier comme 9 ou 4, produit non décomposé)'),
        ('392551f9-38d9-40b6-901c-b7f33f373980', V(2), ['TEXP-284'], "Nombre de diviseurs d'un entier",
         'Nombre de diviseurs de 2ᵃ3ᵇ5ᶜ : (a + 1)(b + 1)(c + 1) (piège : abc)'),
    ],
    '5a53d098': [
        (V(1, 2, 4), ['TEXP-313'], 'Graphe complet : arêtes et degré',
         "Nombre d'arêtes du graphe complet d'ordre n (tournoi), degré de chaque sommet (pièges : n(n − 1) sans "
         "diviser par 2, degré n au lieu de n − 1)"),
        ('bccddd9e-bcf6-4809-80ed-42241fcd0581', V(3), ['TEXP-314'], 'Somme des degrés : nombre d\'arêtes',
         "Nombre d'arêtes d'un graphe dont on connaît les degrés : la somme des degrés en vaut le double "
         "(piège : ne pas diviser par 2)"),
    ],
}

# Niveau le plus haut pris dans chaque catégorie de ce lot, brouillons compris (prod, 2026-10-23).
NIVEAUX_PRIS = {
    ('Arithmétique', 'Nombres premiers', 'Nombres premiers'): 2,
    ('Arithmétique', 'PGCD, Bézout et Gauss', 'PGCD, Bézout et Gauss'): 2,
    ('Fonctions', 'Dérivation', 'Apprivoiser'): 2,
    ('Fonctions', 'Fonction exponentielle', 'Équations et inéquations'): 5,
    ('Fonctions', 'Fonction exponentielle', 'Propriétés algébriques'): 5,
    ('Fonctions', 'Fonction logarithme', 'Courbe représentative'): 1,
    ('Fonctions', 'Fonction logarithme', 'Équations et inéquations'): 3,
    ('Fonctions', 'Fonctions trigonométriques', 'Équations et inéquations'): 3,
    ('Fonctions', 'Limites de fonctions', 'Croissances comparées'): 3,
    ('Fonctions', 'Limites de fonctions', 'Opérations sur les limites'): 1,
    ('Fonctions convexes', 'Convexité', 'Lecture graphique'): 2,
    ('Géométrie', "Orthogonalité et distances dans l'espace", 'Norme et distance'): 1,
    ('Géométrie', "Orthogonalité et distances dans l'espace", 'Orthogonalité droites et plans'): 2,
    ('Géométrie', "Orthogonalité et distances dans l'espace", 'Produit scalaire'): 1,
    ('Géométrie', "Orthogonalité et distances dans l'espace", 'Projeté orthogonal'): 3,
    ('Géométrie', "Orthogonalité et distances dans l'espace", 'Sphère'): 3,
    ('Géométrie', 'Produit scalaire', 'Propriétés'): 2,
    ('Géométrie', 'Représentations paramétriques et équations cartésiennes', 'Vecteurs directeurs et normaux'): 2,
    ('Géométrie', "Vecteurs, droites et plans de l'espace", 'Colinéarité et coplanarité'): 2,
    ('Graphes et matrices', 'Graphes', 'Vocabulaire des graphes'): 2,
    ('Intégration', 'Fonction intégrale', 'Dérivée'): 2,
    ('Intégration', 'Valeur moyenne', 'Encadrement'): 2,
    ('Intégration', 'Valeur moyenne', 'Interprétation'): 2,
    ('Logique', 'Logique et raisonnement', 'Quantificateurs et négation'): 2,
    ('Nombres complexes', 'Équations polynomiales', 'Degré 3 et factorisation'): 2,
    ('Nombres complexes', 'Forme algébrique', 'Équations'): 2,
    ('Nombres complexes', 'Formes trigonométrique et exponentielle', "Formules d'Euler et de Moivre"): 2,
    ('Nombres complexes', 'Géométrie et nombres complexes', 'Affixes et distances'): 2,
    ('Nombres complexes', 'Géométrie et nombres complexes', "Racines de l'unité"): 2,
    ('Primitives et équations différentielles', 'Équations différentielles', 'Notion de solution'): 1,
    ('Primitives et équations différentielles', 'Primitives', 'Formes u′eᵘ, 2uu′, u′/u'): 3,
    ('Primitives et équations différentielles', 'Primitives', 'Primitives de sinus et cosinus'): 2,
    ('Probabilités', 'Concentration et loi des grands nombres', 'Inégalité de concentration'): 2,
    ('Probabilités', 'Dénombrement', 'Coefficients binomiaux'): 2,
    ('Probabilités', 'Dénombrement', 'Combinaisons'): 3,
    ('Probabilités', 'Dénombrement', "Parties d'un ensemble"): 2,
    ('Probabilités', 'Loi binomiale', 'Calcul de probabilités'): 2,
    ('Probabilités', 'Loi binomiale', 'Coefficients binomiaux'): 1,
    ('Probabilités', 'Loi binomiale', 'Espérance et variance'): 1,
    ('Probabilités', 'Loi géométrique', 'Calcul de probabilités'): 2,
    ('Probabilités', 'Lois à densité', 'Densité et aire'): 2,
    ('Probabilités', 'Lois à densité', 'Loi exponentielle'): 2,
    ('Probabilités', 'Lois à densité', 'Loi uniforme'): 1,
    ('Probabilités', 'Lois discrètes', 'Loi uniforme'): 1,
    ('Probabilités', 'Sommes de variables aléatoires', 'Échantillons'): 2,
    ('Probabilités', 'Sommes de variables aléatoires', 'Espérance et variance'): 2,
    ('Statistiques', 'Statistique à deux variables', 'Ajustement affine'): 1,
    ('Suites', 'Limites de suites', 'Définition de la limite'): 2,
    ('Suites', 'Modélisation', 'Placements'): 2,
}


ENTETE = """-- ============================================================================
-- Passe lycée, lot des SCISSIONS : {n} modèles du lycée qui relèvent de plusieurs points, une
-- variation ou un groupe de variations par point, sont partagés. L'origine garde son identifiant,
-- le groupe le plus fourni et ses tags ; chaque autre groupe part dans un modèle neuf ({k} en tout),
-- rangé et tagué sur ses propres points (ADR 0020 § 7). 95ee8348 reçoit aussi la modification de sa
-- V2 (lot A : intégrande 1/(t² + c)). Règle R2 : 6 origines passent sur le nœud de leurs points, et
-- les neufs se rangent sur le nœud du leur. Points de Tle spé et de Tle compl. sur des nœuds
-- incompatibles : le modèle garde le plus précis (« retrait forcé », David, 2026-10-23).
-- ============================================================================
-- Source de vérité : docs/wip/passe-lycee/analyse/scissions-plan.csv et scissions-notes.md, VALIDÉS
-- par David (2026-10-23 : S7-S10, X1-X3 = recommandations). Fichier GÉNÉRÉ par
-- docs/wip/passe-lycee/analyse/lot-scissions.py — ne pas éditer à la main.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN ({n} modèles). Elle est prouvée
-- par tests/integration/passe-lycee-scissions.test.ts, qui fabrique des copies des identifiants de
-- la prod (contenu, nœud, niveaux et tags d'avant) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit avoir EXACTEMENT le contenu relevé le 2026-10-23 (titre, sous-titre,
-- variations, partie commune, specs), être au nœud et aux niveaux relevés, et porter EXACTEMENT ses
-- tags relevés (8 modèles en portent un : gardé), à tout niveau.
--
-- Données d'élèves : aucune (relevé du 2026-10-23 sur le seul modèle publié, a86442c1 : 0 carte
-- SRS, 0 tentative de compétence ou d'évaluation, 0 réponse de test, 0 activité de journal ; les 49
-- autres sont des brouillons). Les modèles neufs copient le statut de leur origine : le neuf de
-- a86442c1 (dérivée de √x) est PUBLIÉ, les autres sont des brouillons. `updated_at` avance sur les
-- origines : leur contenu change.
--
-- Accès (question tranchée par David le 2026-10-23) : personne ne gagne d'accès. Aucune règle ne
-- change ; le neuf publié reprend une variation déjà visible dans a86442c1 ; les tags sont lisibles
-- par tout utilisateur connecté (policy question_template_points_read_authenticated), comme ceux
-- de #1632.
--"""


if __name__ == '__main__':
    releve = []
    noeuds = {t['id']: t['node'] for t in json.load(open(ETAT + 'templates.json'))}
    for t in json.load(open('docs/wip/passe-lycee/releves/templates.json')):
        if t['id'][:8] in LOT:
            releve.append({**t, 'classification_node_id': noeuds[t['id']]})
    assert len(releve) == len(LOT) == 50, len(releve)
    generer(LOT, releve=releve, etat=ETAT, niveaux_pris=NIVEAUX_PRIS, retouches_avant={'95ee8348': m_95ee8348},
            migration='supabase/migrations/20261024003000_passe_lycee_scissions.sql',
            fixture='tests/integration/fixtures/passe-lycee-scissions.json', prefixe='plsc', entete=ENTETE)
