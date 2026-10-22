# Construit docs/wip/passe-lycee/bornes/tspe.json (bornes du programme de Tle spé).
import json, csv
ROOT = '/Users/david/Coding/js/ubumaths-wt-passe-lycee/docs/wip/passe-lycee/bornes/'

def B(aspect, borne, page, force='BO', detail=None):
    b = {'aspect': aspect, 'borne': borne}
    if detail: b['detail'] = detail
    b['source'] = f'BO Tle spé p.{page}'
    b['force'] = force
    return b

COMPETENCE = "Point-compétence (raisonner, démontrer, modéliser) sans grain questionnable propre : aucune borne au-delà des bornes générales."

GENERAL = [
    B('fonctions', "Fonctions connues en terminale : celles de 1re (polynômes, x ↦ xⁿ pour n ∈ ℤ, racine carrée, valeur absolue, exponentielle), plus le logarithme népérien et les fonctions sinus et cosinus. La fonction tangente et x ↦ xᵃ (a réel) ne sont que des approfondissements.", '9-11',
      detail={'liste': ['polynômes', 'xⁿ (n ∈ ℤ)', '√x', '|x|', 'exp', 'ln', 'sin', 'cos'], 'exclus': ['tan (approfondissement)', 'xᵃ, a réel non entier (approfondissement)']}),
    B('fonctions', "Seul le logarithme népérien est au programme : le BO ne nomme aucun autre logarithme (décimal, de base a). Lecture déduite du silence du texte, qui ne traite que de « la fonction logarithme népérien, notée ln ».", '10', 'déduite',
      detail={'exclus': ['log décimal', 'logarithme de base a']}),
    B('fonctions', "Composition de deux fonctions (notation v ∘ u), utilisée principalement pour les fonctions d'une variable réelle.", '4 ; p.9'),
    B('fonctions', "Hormis pour la fonction exponentielle (dont la réciproque est ln), l'étude de la réciproque d'une fonction continue n'est pas au programme.", '10'),
    B('autre', "La justification de la continuité ou de la dérivabilité d'une fonction sur un intervalle n'est pas un objectif du programme : aucune question ne la demande.", '10'),
    B('autre', "Limites : notion présentée de manière intuitive ; les définitions sont explicitées mais la maîtrise complète du formalisme n'est pas un attendu. Les opérations sur les limites sont admises ; la composition des limites s'utilise en contexte.", '8-9'),
    B('format', "Symbole ∑ : peut être utilisé pour écrire certaines expressions de façon concise ; sa manipulation pour démontrer des égalités n'est pas un objectif.", '4'),
    B('autre', "Vocabulaire ensembliste : n-uplets et produit cartésien de k ensembles (la 1re s'arrêtait au couple et au produit cartésien de deux ensembles) ; notion de bijection rencontrée en situation.", '4-5'),
    B('autre', "Systèmes linéaires : leur étude générale n'est pas un objectif ; seulement des exemples dans le contexte de la géométrie repérée (décomposition de vecteurs, intersections de plans…).", '5'),
    B('autre', "Probabilités : univers finis, variables aléatoires finies.", '12'),
    B('autre', "Variables aléatoires indépendantes : toujours envisagées dans le cadre de la succession d'épreuves indépendantes (indépendance mutuelle) ; toute question visant à justifier l'indépendance de variables données a priori est hors programme. La relation E(XY) = E(X)E(Y) n'est pas un attendu.", '12-13'),
    B('autre', "Algorithmique : aucune notion nouvelle par rapport à la 2de et à la 1re (langage naturel ou Python, affectation notée ←) ; on se limite aux listes, sans autre type de collection.", '4'),
]

P = {}
def pt(code, bornes, remarque=None):
    assert code not in P, code
    P[code] = {'bornes': bornes}
    if remarque: P[code]['remarque'] = remarque

# ---------- Vocabulaire ensembliste et logique (p.4) ----------
pt('TSPE-301', [B('autre', "Couple, triplet, n-uplet (k-uplet ou k-liste), y compris pour des ensembles quelconques.", '4-5')])
pt('TSPE-540', [B('autre', "Produit cartésien de deux, trois, k ensembles ; ensemble Aᵏ des k-uplets d'éléments de A.", '4-5')])
pt('TSPE-302', [B('autre', "Négation de propositions simples contenant au plus deux quantificateurs ; les symboles ∀ et ∃ ne sont pas exigibles.", '4', detail={'max': 2})])
pt('TSPE-303', [], COMPETENCE)
pt('TSPE-304', [], COMPETENCE)

# ---------- Combinatoire et dénombrement (p.5-6) ----------
FINI = B('nombres', "Ensembles finis.", '5')
pt('TSPE-305', [B('autre', "Réunion d'ensembles finis deux à deux disjoints : le cardinal est la somme des cardinaux.", '5')])
pt('TSPE-306', [B('autre', "Cardinal d'un produit cartésien de deux, trois, k ensembles finis.", '5')])
pt('TSPE-307', [B('autre', "k-uplets (k-listes) quelconques d'un ensemble à n éléments.", '5'), FINI])
pt('TSPE-308', [B('autre', "Nombre des parties d'un ensemble à n éléments.", '5'), FINI])
pt('TSPE-541', [B('autre', "Lien parties ↔ n-uplets de {0, 1}.", '5')])
pt('TSPE-542', [B('autre', "Lien parties ↔ mots de longueur n sur un alphabet à deux éléments.", '5')])
pt('TSPE-543', [B('autre', "Lien parties ↔ chemins dans un arbre.", '5')])
pt('TSPE-544', [B('autre', "Lien parties ↔ issues d'une succession de n épreuves de Bernoulli.", '5')])
pt('TSPE-309', [B('autre', "k-uplets d'éléments distincts d'un ensemble à n éléments (0 ⩽ k ⩽ n).", '5'), FINI])
pt('TSPE-310', [B('nombres', "n! pour n entier naturel.", '5')])
pt('TSPE-311', [B('autre', "Permutations d'un ensemble fini à n éléments.", '5')])
pt('TSPE-312', [B('autre', "Combinaison = partie à k éléments d'un ensemble à n éléments.", '5'), FINI])
pt('TSPE-545', [B('autre', "Représentation des combinaisons en termes de mots.", '5')])
pt('TSPE-546', [B('autre', "Représentation des combinaisons en termes de chemins.", '5')])
pt('TSPE-313', [B('format', "Deux formules : n(n − 1)…(n − k + 1)/k! et n!/((n − k)! k!), pour 0 ⩽ k ⩽ n.", '5')])
pt('TSPE-314', [B('operandes', "Explicitation pour k = 0, 1, 2 seulement.", '5', detail={'liste': [0, 1, 2]})])
pt('TSPE-315', [B('faits', "Symétrie des coefficients binomiaux (k ↔ n − k).", '5')])
pt('TSPE-316', [B('faits', "Relation de Pascal.", '5')])
pt('TSPE-547', [B('figures', "Triangle de Pascal.", '5')])
pt('TSPE-317', [B('figures', "Représentations : ensembles, arbres, tableaux, diagrammes.", '6', detail={'liste': ['ensembles', 'arbres', 'tableaux', 'diagrammes']})])
pt('TSPE-318', [B('autre', "Objets combinatoires de base : listes (k-uplets), combinaisons, permutations, représentés comme parties d'un ensemble, mots, chemins dans un arbre.", '5-6')])
pt('TSPE-319', [B('autre', "Dénombrements simples, portant sur les objets de base (listes, combinaisons, permutations), en contexte : informatique, génétique, théorie des jeux, probabilités, etc.", '5-6')])
pt('TSPE-320', [B('autre', "Démontrer ∑ₖ₌₀ⁿ C(n, k) = 2ⁿ par dénombrement.", '6')])
pt('TSPE-321', [B('autre', "Démontrer la relation de Pascal par le calcul.", '6')])
pt('TSPE-548', [B('autre', "Démontrer la relation de Pascal par une méthode combinatoire.", '6')])
pt('TSPE-322', [B('autre', "Combinaisons avec répétitions (approfondissement possible, non obligatoire).", '6')])
pt('TSPE-323', [B('autre', "Pour n donné, liste des coefficients C(n, k) générée par la relation de Pascal.", '6')])
pt('TSPE-324', [B('autre', "Génération des permutations d'un ensemble fini, ou tirage aléatoire d'une permutation.", '6')])
pt('TSPE-325', [B('operandes', "Parties à 2 ou 3 éléments seulement.", '6', detail={'liste': [2, 3]})])

# ---------- Manipulation des vecteurs, des droites et des plans de l'espace (p.5-6) ----------
SOL = B('figures', "Supports privilégiés : figures formées à partir des solides usuels du collège (cube, pavé, tétraèdre).", '6', detail={'liste': ['cube', 'pavé', 'tétraèdre']})
pt('TSPE-326', [B('autre', "Calcul vectoriel dans l'espace : vecteurs, translations, combinaisons linéaires, directions de droites et de plans.", '6')])
pt('TSPE-549', [B('autre', "Translations de l'espace.", '6')])
pt('TSPE-327', [B('autre', "Combinaisons linéaires de vecteurs de l'espace.", '6')])
pt('TSPE-328', [B('autre', "Droite de l'espace ; un vecteur non nul engendre une direction de droites.", '5-6')])
pt('TSPE-550', [B('autre', "Colinéarité de deux vecteurs de l'espace.", '6')])
pt('TSPE-329', [B('autre', "Droite caractérisée par un point et un vecteur directeur.", '6')])
pt('TSPE-330', [B('autre', "Plan de l'espace ; direction engendrée par deux vecteurs non colinéaires.", '5-6')])
pt('TSPE-331', [B('autre', "Plan caractérisé par un point et un couple de vecteurs non colinéaires.", '6')])
pt('TSPE-332', [B('autre', "Base = trois vecteurs non coplanaires ; repère de l'espace.", '5-6')])
pt('TSPE-333', [B('autre', "Décomposition d'un vecteur sur une base de l'espace (trois vecteurs non coplanaires) ou d'un plan (deux vecteurs non colinéaires).", '5-6')])
pt('TSPE-334', [B('autre', "Représenter des combinaisons linéaires de vecteurs donnés.", '6'), SOL])
pt('TSPE-335', [B('autre', "Exprimer un vecteur comme combinaison linéaire en exploitant une figure (pas de coordonnées exigées).", '6', 'déduite'), SOL],
   "Lecture déduite : la capacité dit « exploiter une figure », par opposition à la section « Représentations paramétriques » où la même tâche est traduite en système ; la figure est donc le support, les coordonnées n'y sont pas requises.")
pt('TSPE-336', [B('autre', "Position relative de deux droites de l'espace.", '6'), SOL])
pt('TSPE-551', [B('autre', "Position relative d'une droite et d'un plan.", '6'), SOL])
pt('TSPE-552', [B('autre', "Position relative de deux plans.", '6'), SOL])
pt('TSPE-337', [B('autre', "Deux vecteurs d'un plan, lus sur une figure.", '6'), SOL])
pt('TSPE-553', [B('autre', "Trois vecteurs de l'espace, lus sur une figure.", '6'), SOL])
pt('TSPE-338', [B('autre', "Décomposition lue sur une figure.", '6'), SOL])
pt('TSPE-339', [B('autre', "Problèmes simples de configuration traités géométriquement : alignement, colinéarité, parallélisme, coplanarité.", '6', detail={'liste': ['alignement', 'colinéarité', 'parallélisme', 'coplanarité']}), SOL])
pt('TSPE-340', [B('operandes', "Barycentre de deux, trois ou quatre points pondérés.", '6', detail={'liste': [2, 3, 4]})])
pt('TSPE-554', [B('autre', "Utilisation des barycentres (associativité notamment) pour résoudre des problèmes de géométrie.", '6')])
pt('TSPE-341', [B('autre', "Fonction vectorielle de Leibniz (approfondissement possible).", '6')])

# ---------- Orthogonalité et distances dans l'espace (p.6-7) ----------
pt('TSPE-342', [B('autre', "Produit scalaire de deux vecteurs de l'espace (extension du produit scalaire du plan).", '6')])
pt('TSPE-555', [B('faits', "Bilinéarité.", '6')])
pt('TSPE-556', [B('faits', "Symétrie.", '6')])
pt('TSPE-343', [B('faits', "Deux vecteurs sont orthogonaux si et seulement si leur produit scalaire est nul.", '6')])
pt('TSPE-344', [B('autre', "Base orthonormée, repère orthonormé de l'espace.", '6')])
pt('TSPE-345', [B('format', "Produit scalaire en coordonnées dans une base orthonormée (xx′ + yy′ + zz′).", '6')])
pt('TSPE-557', [B('format', "Norme en coordonnées dans une base orthonormée.", '6')])
pt('TSPE-346', [B('format', "Distance entre deux points en repère orthonormé.", '6')])
pt('TSPE-347', [B('faits', "Développement de ‖u + v‖² seulement.", '6')])
pt('TSPE-558', [B('faits', "Formules de polarisation (produit scalaire exprimé par des normes).", '6')])
pt('TSPE-348', [B('autre', "Orthogonalité de deux droites de l'espace.", '7')])
pt('TSPE-559', [B('autre', "Orthogonalité d'une droite et d'un plan.", '7')])
pt('TSPE-349', [B('autre', "Vecteur normal à un plan.", '7')])
pt('TSPE-560', [B('autre', "Plan passant par un point A et normal à un vecteur non nul n.", '7')])
pt('TSPE-350', [B('autre', "Projeté orthogonal d'un point sur une droite de l'espace.", '7')])
pt('TSPE-561', [B('autre', "Projeté orthogonal d'un point sur un plan.", '7')])
pt('TSPE-351', [B('autre', "Plans perpendiculaires, caractérisés par leurs vecteurs normaux.", '7')])
pt('TSPE-352', [B('autre', "Démontrer une orthogonalité dans l'espace à l'aide du produit scalaire.", '7')])
pt('TSPE-353', [B('autre', "Perpendicularité de deux plans à l'aide du produit scalaire (vecteurs normaux).", '7')])
pt('TSPE-354', [B('autre', "Calcul d'un angle dans l'espace à l'aide du produit scalaire.", '7')])
pt('TSPE-355', [B('autre', "Calcul d'une longueur dans l'espace à l'aide du produit scalaire.", '7')])
pt('TSPE-356', [B('autre', "Distance d'un point à une droite par la projection orthogonale.", '7')])
pt('TSPE-562', [B('autre', "Distance d'un point à un plan par la projection orthogonale.", '7')])
pt('TSPE-625', [B('unites', "Grandeurs : longueur, angle, aire, volume.", '7', detail={'liste': ['longueur', 'angle', 'aire', 'volume']})])
pt('TSPE-357', [B('autre', "Configuration : orthogonalité de deux droites.", '7')])
pt('TSPE-563', [B('autre', "Configuration : orthogonalité d'une droite et d'un plan.", '7')])
pt('TSPE-358', [B('autre', "Lieux géométriques simples, par exemple plan médiateur de deux points.", '7')])
pt('TSPE-359', [B('autre', "Démontrer que le projeté orthogonal de M sur un plan P est le point de P le plus proche de M.", '7')])
pt('TSPE-360', [B('autre', "Intersection d'une sphère et d'un plan (approfondissement possible).", '7')])
pt('TSPE-564', [B('autre', "Plan tangent à une sphère en un point (approfondissement possible).", '7')])
pt('TSPE-361', [B('autre', "Sphère circonscrite à un tétraèdre (approfondissement possible).", '7')])
pt('TSPE-362', [B('autre', "Fonction scalaire de Leibniz (approfondissement possible).", '7')])

# ---------- Représentations paramétriques et équations cartésiennes (p.7) ----------
RON = B('autre', "Repère de l'espace supposé orthonormé.", '7')
pt('TSPE-363', [B('format', "Représentation paramétrique d'une droite (paramètre réel).", '7'),
                B('autre', "Pas de représentation paramétrique de plan : un plan est donné par une équation cartésienne.", '7', 'déduite'), RON],
   "Lecture déduite : le BO ne prévoit de représentation paramétrique que pour les droites (« Représentation paramétrique d'une droite », « Équation cartésienne d'un plan ») ; un modèle demandant une représentation paramétrique de plan sort du point.")
pt('TSPE-364', [B('format', "Équation cartésienne d'un plan (ax + by + cz + d = 0).", '7'), RON])
pt('TSPE-365', [B('autre', "Déterminer une représentation paramétrique d'une droite (à partir d'un point et d'un vecteur directeur, ou de deux points).", '7', 'déduite'), RON],
   "Lecture déduite : les données (point + vecteur directeur, deux points) ne sont pas écrites ; elles viennent de la caractérisation d'une droite par un point et un vecteur directeur (BO p.6).")
pt('TSPE-366', [B('autre', "Reconnaître une droite donnée par une représentation paramétrique (point, vecteur directeur).", '7'), RON])
pt('TSPE-367', [B('autre', "Équation cartésienne d'un plan à partir d'un vecteur normal et d'un point.", '7'), RON])
pt('TSPE-368', [B('autre', "Reconnaître un plan donné par une équation cartésienne.", '7'), RON])
pt('TSPE-565', [B('autre', "Lire un vecteur normal (a, b, c) sur l'équation cartésienne.", '7'), RON])
pt('TSPE-369', [B('autre', "Projeté orthogonal d'un point sur un plan donné par une équation cartésienne.", '7'), RON])
pt('TSPE-370', [B('autre', "Projeté orthogonal d'un point sur une droite donnée par un point et un vecteur directeur.", '7'), RON])
SYS = B('autre', "Exemples de systèmes linéaires dans le seul contexte géométrique ; étude générale des systèmes hors programme.", '5')
pt('TSPE-371', [B('autre', "Traduire par un système d'équations linéaires : trois vecteurs forment-ils une base ?", '7'), SYS, RON])
pt('TSPE-566', [B('autre', "Traduire par un système : coordonnées d'un vecteur dans une base.", '7'), SYS, RON])
pt('TSPE-567', [B('autre', "Traduire par un système : alignement, colinéarité, parallélisme, coplanarité, intersection et orthogonalité de droites ou de plans.", '7'), SYS, RON],
   "Voir les questions lts-7 (intersection de deux plans, approfondissement) et lts-8 (vecteur orthogonal à deux vecteurs, approfondissement).")
pt('TSPE-372', [B('autre', "Résolution dans des cas simples seulement.", '7'), SYS],
   "« Cas simples » non précisé : taille des systèmes en question (lts-6).")
pt('TSPE-568', [B('autre', "Interprétation géométrique des solutions (point, droite, plan, aucun).", '7'), SYS])
pt('TSPE-373', [B('autre', "Démontrer l'équation cartésienne du plan normal à n passant par A.", '7')])
pt('TSPE-374', [B('autre', "Intersection de deux plans (approfondissement possible).", '7')])
pt('TSPE-375', [B('autre', "Vecteur orthogonal à deux vecteurs non colinéaires (approfondissement possible).", '7')])
pt('TSPE-376', [B('autre', "Équation d'une sphère de centre et rayon donnés (approfondissement possible).", '7')])
pt('TSPE-377', [B('autre', "Intersection d'une sphère et d'une droite (approfondissement possible).", '7')])

# ---------- Suites (p.8-9) ----------
pt('TSPE-378', [B('autre', "Définition de la divergence vers +∞ par les intervalles [A ; +∞[.", '8')])
pt('TSPE-569', [B('faits', "Suite croissante non majorée ⇒ limite +∞.", '8')])
pt('TSPE-379', [B('autre', "Suite tendant vers −∞ (définition symétrique).", '8')])
pt('TSPE-380', [B('autre', "Convergence vers ℓ réel définie par les intervalles ouverts contenant ℓ.", '8')])
pt('TSPE-381', [B('faits', "Théorèmes de comparaison pour les limites de suites.", '8')])
pt('TSPE-570', [B('faits', "Théorème des gendarmes.", '8')])
pt('TSPE-382', [B('faits', "Opérations sur les limites de suites (somme, produit, quotient).", '8', 'déduite')],
   "Lecture déduite : le BO écrit seulement « Opérations sur les limites » ; la liste (somme, produit, quotient) est le contenu usuel de cette expression, la composition étant traitée « en contexte » (p.9).")
pt('TSPE-383', [B('nombres', "Comportement de (qⁿ) pour q réel quelconque (q > 1, q = 1, −1 < q < 1, q ⩽ −1).", '8', detail={'ensemble': 'q réel'})])
pt('TSPE-384', [B('faits', "Toute suite croissante majorée (décroissante minorée) converge, théorème admis : il donne l'existence, pas la valeur de la limite.", '8')])
pt('TSPE-385', [B('autre', "Établir convergence ou divergence vers ±∞ avec les outils de la section : définitions, comparaison, gendarmes, opérations, suites géométriques, monotonie et bornes.", '8-9')])
pt('TSPE-386', [], COMPETENCE)
pt('TSPE-387', [], COMPETENCE)
pt('TSPE-388', [B('autre', "Démontrer : toute suite croissante non majorée tend vers +∞.", '9')])
pt('TSPE-389', [B('autre', "Démontrer la limite de (qⁿ) pour q > 1 après l'inégalité de Bernoulli (1 + a)ⁿ ⩾ 1 + na, démontrée par récurrence.", '9', 'déduite')],
   "Lecture déduite : le BO écrit « Limite de (qⁿ), après démonstration par récurrence de l'inégalité de Bernoulli » ; la forme (1 + a)ⁿ ⩾ 1 + na et le cas q > 1 sont ceux que cette inégalité permet de traiter.")
pt('TSPE-390', [B('autre', "Démontrer : une suite minorée par une suite divergeant vers +∞ diverge vers +∞.", '9')])
pt('TSPE-391', [B('autre', "Démontrer les limites de exp en +∞ et en −∞.", '9')])
pt('TSPE-392', [B('autre', "Recherche de seuils (algorithme).", '9')])
pt('TSPE-393', [B('autre', "Valeurs approchées de π, e, √2, (1 + √5)/2, ln(2), etc. par des suites.", '9')])
pt('TSPE-394', [B('autre', "Suites adjacentes (approfondissement possible).", '9')])
pt('TSPE-395', [B('autre', "Récurrence linéaire d'ordre 2 à coefficients constants : exemples seulement (approfondissement possible).", '9')])
pt('TSPE-396', [B('autre', "Exemples d'application de la méthode de Newton (approfondissement possible).", '9')])
pt('TSPE-571', [B('autre', "Convergence de la méthode de Héron (approfondissement possible).", '9')])

# ---------- Limites des fonctions (p.9) ----------
LIMREF = B('fonctions', "Cas simples ; limites usuelles des fonctions de référence de 1re (puissances entières, racine carrée, exponentielle).", '9')
pt('TSPE-397', [B('autre', "Limite finie ou infinie en +∞.", '9')])
pt('TSPE-572', [B('autre', "Limite finie ou infinie en −∞.", '9')])
pt('TSPE-573', [B('autre', "Limite finie ou infinie en un point.", '9')])
pt('TSPE-398', [B('autre', "Asymptotes parallèles à un axe seulement (asymptotes obliques : approfondissement).", '9', detail={'exclus': ['asymptote oblique']})])
pt('TSPE-399', [B('fonctions', "Limites de x ↦ xⁿ, n ∈ ℤ.", '9')])
pt('TSPE-574', [B('fonctions', "Limites de la racine carrée.", '9')])
pt('TSPE-575', [B('fonctions', "Limites de l'exponentielle.", '9')])
pt('TSPE-400', [B('faits', "Théorèmes de comparaison (et encadrement) pour les limites de fonctions.", '9')])
pt('TSPE-401', [B('faits', "Opérations sur les limites, admises ; composition des limites utilisée en contexte.", '9')])
LIMQ = "Les fonctions admises au-delà de celles de 1re (ln, sin, cos) sont en question (lts-5)."
pt('TSPE-402', [B('autre', "Limite d'une suite, cas simples, par les limites usuelles.", '9'), LIMREF], LIMQ)
pt('TSPE-576', [B('autre', "Limite d'une suite, cas simples, par les croissances comparées.", '9'), LIMREF], LIMQ)
pt('TSPE-577', [B('autre', "Limite d'une suite, cas simples, par les opérations sur les limites.", '9'), LIMREF], LIMQ)
pt('TSPE-578', [B('autre', "Limite d'une suite, cas simples, par majoration, minoration ou encadrement.", '9'), LIMREF], LIMQ)
pt('TSPE-579', [B('autre', "Limite d'une suite, cas simples, par factorisation du terme prépondérant d'une somme.", '9'), LIMREF], LIMQ)
pt('TSPE-403', [B('autre', "Limite d'une fonction en un point ou en ±∞, cas simples, par les limites usuelles.", '9'), LIMREF], LIMQ)
pt('TSPE-580', [B('autre', "Limite d'une fonction, cas simples, par les croissances comparées.", '9'), LIMREF], LIMQ)
pt('TSPE-581', [B('autre', "Limite d'une fonction, cas simples, par les opérations sur les limites (composition en contexte).", '9'), LIMREF], LIMQ)
pt('TSPE-582', [B('autre', "Limite d'une fonction, cas simples, par majoration, minoration ou encadrement.", '9'), LIMREF], LIMQ)
pt('TSPE-583', [B('autre', "Limite d'une fonction, cas simples, par factorisation du terme prépondérant d'une somme.", '9'), LIMREF], LIMQ)
pt('TSPE-404', [B('autre', "Asymptotes parallèles à un axe seulement (horizontale ↔ limite finie en ±∞ ; verticale ↔ limite infinie en un point).", '9')])
pt('TSPE-405', [B('autre', "Démontrer la croissance comparée de x ↦ xⁿ et exp en +∞.", '9')])
pt('TSPE-406', [B('autre', "Asymptotes obliques (approfondissement possible).", '9')])
pt('TSPE-584', [B('autre', "Branches infinies (approfondissement possible).", '9')])

# ---------- Compléments sur la dérivation (p.9-10) ----------
REF = B('fonctions', "Fonctions construites simplement à partir des fonctions de référence (opérations algébriques et composition).", '9')
pt('TSPE-407', [B('fonctions', "Composée de deux fonctions, notation v ∘ u.", '9')])
pt('TSPE-408', [B('faits', "(v ∘ u)′ = (v′ ∘ u) × u′ pour u, v dérivables.", '9')])
pt('TSPE-409', [B('autre', "Dérivée seconde (la dérivée n-ième n'est qu'un approfondissement).", '9-10', detail={'exclus': ['dérivée n-ième']})])
pt('TSPE-410', [B('autre', "Convexité définie par la position de la courbe par rapport à ses sécantes.", '9')])
pt('TSPE-411', [B('faits', "Pour f deux fois dérivable, équivalence admise : convexe ⇔ courbe au-dessus de ses tangentes.", '9')])
pt('TSPE-585', [B('faits', "Pour f deux fois dérivable, équivalence admise : convexe ⇔ f′ croissante.", '9')])
pt('TSPE-586', [B('faits', "Pour f deux fois dérivable, équivalence admise : convexe ⇔ f″ positive.", '9')])
pt('TSPE-412', [B('autre', "Point d'inflexion, repéré en lien avec la convexité (graphiques de f, f′ ou f″).", '9-10')])
pt('TSPE-413', [B('fonctions', "Formule simple mettant en jeu opérations algébriques et composition.", '9'), REF])
pt('TSPE-414', [REF])
pt('TSPE-415', [REF], LIMQ)
pt('TSPE-416', [REF])
pt('TSPE-417', [B('autre', "Inégalités obtenues par la convexité (position par rapport aux tangentes ou aux sécantes).", '9')])
pt('TSPE-418', [B('figures', "Allure de la courbe à partir de tableaux de variations de f, de f′ ou de f″.", '9-10')])
pt('TSPE-419', [B('figures', "Lecture sur la courbe de f : intervalles de convexité, de concavité.", '10')])
pt('TSPE-587', [B('figures', "Lecture sur la courbe de f : points d'inflexion.", '10')])
pt('TSPE-588', [B('figures', "Lecture sur la courbe de f′ : intervalles de convexité, de concavité de f.", '10')])
pt('TSPE-589', [B('figures', "Lecture sur la courbe de f′ : points d'inflexion de f.", '10')])
pt('TSPE-590', [B('figures', "Lecture sur la courbe de f″ : intervalles de convexité, de concavité de f.", '10')])
pt('TSPE-591', [B('figures', "Lecture sur la courbe de f″ : points d'inflexion de f.", '10')])
pt('TSPE-420', [B('autre', "Convexité étudiée et utilisée dans le cadre d'une résolution de problème.", '10'), REF])
pt('TSPE-421', [B('autre', "Démontrer : si f″ est positive, la courbe de f est au-dessus de ses tangentes.", '10')])
pt('TSPE-422', [B('autre', "Courbe de Lorenz (approfondissement possible).", '10')])
pt('TSPE-423', [B('autre', "Dérivée n-ième (approfondissement possible).", '10')])
pt('TSPE-424', [B('autre', "Inégalité arithmético-géométrique (approfondissement possible).", '10')])

# ---------- Continuité (p.10) ----------
pt('TSPE-425', [B('autre', "Continuité en un point définie par les limites ; continuité sur un intervalle. Aucune justification de continuité demandée.", '10')])
pt('TSPE-426', [B('faits', "Toute fonction dérivable est continue.", '10')])
pt('TSPE-427', [B('faits', "Si uₙ → ℓ et f continue en ℓ, alors f(uₙ) → f(ℓ).", '10')])
pt('TSPE-428', [B('faits', "Théorème des valeurs intermédiaires (admis ; sa démonstration par dichotomie n'est qu'un approfondissement).", '10')])
pt('TSPE-429', [B('faits', "Fonction continue strictement monotone sur un intervalle : unicité de la solution de f(x) = k.", '10')])
pt('TSPE-430', [B('autre', "Équation du type f(x) = k : existence, unicité.", '10')])
pt('TSPE-431', [B('autre', "Équation du type f(x) = k : encadrement des solutions.", '10')])
pt('TSPE-432', [B('autre', "uₙ₊₁ = f(uₙ) avec f continue d'un intervalle dans lui-même.", '10')])
pt('TSPE-433', [B('autre', "Méthode de dichotomie.", '10')])
pt('TSPE-434', [B('autre', "Méthode de Newton.", '10')])
pt('TSPE-592', [B('autre', "Méthode de la sécante.", '10')])
pt('TSPE-435', [B('autre', "Démonstration du TVI par dichotomie (approfondissement possible).", '10')])
pt('TSPE-436', [B('autre', "Fonctions continues de ℝ dans ℝ vérifiant f(x + y) = f(x) + f(y) (approfondissement possible).", '10')])
pt('TSPE-437', [B('autre', "Prolongement par continuité (approfondissement possible).", '10')])

# ---------- Fonction logarithme (p.10) ----------
pt('TSPE-438', [B('fonctions', "ln, réciproque de exp : pour x > 0, e^(ln x) = x ; pour x réel, ln(eˣ) = x.", '10', 'déduite')],
   "Lecture déduite : les deux égalités traduisent « construite comme réciproque de la fonction exponentielle » ; le BO ne les écrit pas.")
pt('TSPE-439', [B('faits', "Propriétés algébriques du logarithme (équation fonctionnelle ln(ab) = ln a + ln b et ses conséquences).", '10')])
pt('TSPE-440', [B('faits', "ln′(x) = 1/x sur ]0 ; +∞[.", '10')])
pt('TSPE-593', [B('faits', "ln strictement croissante sur ]0 ; +∞[.", '10')])
pt('TSPE-441', [B('faits', "Limites de ln en 0 et en +∞.", '10')])
pt('TSPE-594', [B('figures', "Courbe représentative de ln.", '10')])
pt('TSPE-442', [B('figures', "Courbes de ln et exp symétriques par rapport à la droite y = x.", '10', 'déduite')],
   "Lecture déduite : le BO dit « lien entre les courbes représentatives » ; la symétrie par rapport à y = x est ce lien pour deux fonctions réciproques.")
pt('TSPE-443', [B('faits', "Croissance comparée de ln et de x ↦ xⁿ, en 0 et en +∞.", '10')])
EQF = B('fonctions', "Équations, inéquations et écritures où intervient exp ou ln, traitées par l'équation fonctionnelle.", '10')
pt('TSPE-444', [B('autre', "Transformer une écriture avec ln par l'équation fonctionnelle.", '10')],
   "⚠ libellé : le BO dit « Utiliser l'équation fonctionnelle de l'exponentielle ou du logarithme pour transformer une écriture » ; le libellé ne garde que le logarithme et aucun point de Tle spé ne porte la partie exponentielle (elle existe en 1re spé).")
pt('TSPE-445', [B('autre', "Résoudre une équation par l'équation fonctionnelle de l'exponentielle.", '10'), EQF])
pt('TSPE-595', [B('autre', "Résoudre une inéquation par l'équation fonctionnelle de l'exponentielle.", '10'), EQF])
pt('TSPE-446', [B('autre', "Résoudre une équation par l'équation fonctionnelle du logarithme.", '10'), EQF])
pt('TSPE-596', [B('autre', "Résoudre une inéquation par l'équation fonctionnelle du logarithme.", '10'), EQF])
pt('TSPE-447', [], COMPETENCE)
pt('TSPE-448', [B('autre', "Démontrer ln′(x) = 1/x, la dérivabilité de ln étant admise.", '10')])
pt('TSPE-449', [B('autre', "Démontrer lim x ln(x) = 0 en 0.", '10')])
pt('TSPE-450', [B('autre', "Algorithme de Briggs.", '10')])
pt('TSPE-451', [B('fonctions', "x ↦ xᵃ pour a réel (approfondissement possible).", '10')])
pt('TSPE-452', [B('autre', "Limite de (1 + x/n)ⁿ pour x réel (approfondissement possible).", '10')])

# ---------- Fonctions sinus et cosinus (p.11) ----------
pt('TSPE-453', [B('fonctions', "Sinus et cosinus comme fonctions de ℝ dans ℝ (tangente : approfondissement).", '11', detail={'exclus': ['tangente']})])
pt('TSPE-597', [B('faits', "Parité : cos paire, sin impaire.", '11')])
pt('TSPE-598', [B('faits', "Périodicité (2π).", '11')])
pt('TSPE-599', [B('figures', "Courbes représentatives de sin et cos.", '11')])
pt('TSPE-454', [B('faits', "sin′ = cos, cos′ = −sin.", '11')])
pt('TSPE-600', [B('faits', "Variations de sin et cos.", '11')])
pt('TSPE-455', [B('figures', "Lien courbes de sin, cos ↔ cercle trigonométrique.", '11')])
pt('TSPE-456', [B('figures', "Traduction graphique de la parité.", '11')])
pt('TSPE-601', [B('figures', "Traduction graphique de la périodicité.", '11')])
pt('TSPE-457', [B('fonctions', "Équation du type cos(x) = a.", '11')],
   "Sinus (lts-1), intervalle de résolution (lts-2) et valeurs de a (lts-3) en question.")
pt('TSPE-458', [B('fonctions', "Inéquation de la forme cos(x) ⩽ a, sur [−π, π].", '11', detail={'intervalle': '[−π, π]'})],
   "Sinus (lts-1), valeurs de a (lts-3) et sens de l'inégalité (lts-4) en question.")
pt('TSPE-459', [B('fonctions', "Fonction simple définie à partir des fonctions trigonométriques ; but : variations, optimum.", '11')])
pt('TSPE-460', [B('fonctions', "Fonction tangente (approfondissement possible).", '11')])

# ---------- Primitives, équations différentielles (p.11) ----------
AUTRESED = B('autre', "Autres équations différentielles (y′ = y², y″ + ω²y = 0) : des solutions peuvent être données, mais aucune connaissance n'est exigible.", '11')
pt('TSPE-461', [B('autre', "Équation y′ = f, f continue sur un intervalle.", '11'), AUTRESED])
pt('TSPE-462', [B('autre', "Primitive d'une fonction continue sur un intervalle (existence admise ici, démontrée en calcul intégral) ; pour certaines fonctions, pas de primitive explicite.", '11')])
pt('TSPE-602', [B('faits', "Deux primitives d'une même fonction continue sur un intervalle diffèrent d'une constante.", '11')])
pt('TSPE-463', [B('fonctions', "Primitives de x ↦ xⁿ, n ∈ ℤ.", '11', detail={'ensemble': 'n ∈ ℤ'})],
   "Cas n = −1 (primitive ln) en question (lts-9).")
pt('TSPE-603', [B('fonctions', "Primitive de x ↦ 1/√x.", '11')])
pt('TSPE-604', [B('fonctions', "Primitive de l'exponentielle.", '11')])
pt('TSPE-605', [B('fonctions', "Primitive de sinus.", '11')])
pt('TSPE-606', [B('fonctions', "Primitive de cosinus.", '11')])
pt('TSPE-464', [B('nombres', "y′ = ay avec a réel.", '11')])
pt('TSPE-465', [B('figures', "Allure des courbes des solutions de y′ = ay.", '11')])
pt('TSPE-466', [B('nombres', "y′ = ay + b, a et b réels (a ≠ 0 pour la résolution).", '11')])
PRIMREF = B('fonctions', "Primitives de référence : xⁿ (n ∈ ℤ), 1/√x, exp, sin, cos.", '11')
pt('TSPE-467', [PRIMREF], "Cas n = −1 en question (lts-9).")
pt('TSPE-468', [B('fonctions', "Fonctions de la forme (v′ ∘ u) × u′, v primitive de référence.", '11'), PRIMREF])
pt('TSPE-469', [B('nombres', "y′ = ay + b avec a ≠ 0 : solution particulière constante.", '11')])
pt('TSPE-607', [B('nombres', "y′ = ay + b avec a ≠ 0 : toutes les solutions, à partir de la solution constante.", '11')])
pt('TSPE-470', [B('autre', "y′ = ay + f : une solution particulière est donnée ; on en déduit toutes les solutions (pas de recherche de la solution particulière exigée).", '11')])
pt('TSPE-471', [B('autre', "Démontrer que deux primitives d'une même fonction continue sur un intervalle diffèrent d'une constante.", '11')])
pt('TSPE-472', [B('autre', "Démontrer la résolution de y′ = ay, a réel.", '11')])
pt('TSPE-473', [B('autre', "Autres équations différentielles, par exemple l'équation logistique (approfondissement possible).", '11'), AUTRESED])
pt('TSPE-474', [B('autre', "Méthode d'Euler pour y′ = f et y′ = ay + b seulement.", '11')])

# ---------- Calcul intégral (p.11-12) ----------
pt('TSPE-475', [B('autre', "Fonction continue positive sur un segment [a, b] : intégrale = aire sous la courbe (notion intuitive d'aire, sans difficulté théorique).", '8 ; p.11')])
pt('TSPE-476', [B('faits', "f continue positive sur [a, b] : F_a(x) = ∫ₐˣ f(t) dt est la primitive de f qui s'annule en a.", '11')])
pt('TSPE-477', [B('format', "∫ₐᵇ f(x) dx = F(b) − F(a), notation [F(x)]ₐᵇ.", '12')])
pt('TSPE-478', [B('faits', "Toute fonction continue sur un intervalle admet des primitives.", '12')])
pt('TSPE-479', [B('autre', "Intégrale d'une fonction continue de signe quelconque, définie par les primitives.", '12')])
pt('TSPE-480', [B('faits', "Linéarité de l'intégrale.", '12')])
pt('TSPE-481', [B('faits', "Positivité et intégration des inégalités.", '12')])
pt('TSPE-482', [B('faits', "Relation de Chasles.", '12')])
pt('TSPE-483', [B('autre', "Valeur moyenne d'une fonction sur un intervalle.", '12')])
pt('TSPE-484', [B('autre', "Intégration par parties.", '12')])
pt('TSPE-485', [B('figures', "Estimation graphique d'une intégrale.", '12')])
pt('TSPE-608', [B('autre', "Encadrement d'une intégrale (méthode des rectangles notamment).", '8 ; p.12')])
pt('TSPE-486', [B('figures', "Estimation graphique d'une valeur moyenne.", '12')])
pt('TSPE-609', [B('autre', "Encadrement d'une valeur moyenne.", '12')])
pt('TSPE-487', [B('fonctions', "Intégrale calculée par une primitive (primitives de référence et (v′ ∘ u) × u′).", '11-12')])
pt('TSPE-488', [B('autre', "Intégrale calculée par une intégration par parties.", '12')])
pt('TSPE-489', [B('autre', "Majorer (minorer) une intégrale à partir d'une majoration (minoration) de la fonction.", '12')])
pt('TSPE-490', [B('autre', "Aire entre deux courbes.", '12')])
pt('TSPE-491', [B('autre', "Suite d'intégrales, éventuellement définie par une relation de récurrence.", '12')])
pt('TSPE-492', [B('autre', "Interprétation d'une intégrale dans un contexte d'une autre discipline.", '12')])
pt('TSPE-493', [B('autre', "Interprétation d'une valeur moyenne dans un contexte d'une autre discipline.", '12')])
pt('TSPE-494', [B('autre', "Démonstration pour f positive et croissante sur [a, b] seulement : x ↦ ∫ₐˣ f(t) dt est une primitive de f, puis ∫ₐᵇ f = F(b) − F(a).", '12')])
pt('TSPE-495', [B('autre', "Démontrer la formule d'intégration par parties.", '12')])
pt('TSPE-496', [B('autre', "Approximation d'une aire par des suites adjacentes (approfondissement possible).", '12')])
pt('TSPE-497', [B('autre', "Encadrement de Hₙ = ∑ 1/k par des intégrales (approfondissement possible).", '12')])
pt('TSPE-498', [B('autre', "Méthode des rectangles.", '12')])
pt('TSPE-610', [B('autre', "Méthode des milieux.", '12')])
pt('TSPE-611', [B('autre', "Méthode des trapèzes.", '12')])
pt('TSPE-499', [B('autre', "Méthode de Monte-Carlo.", '12')])
pt('TSPE-500', [B('autre', "Algorithme de Brouncker pour ln(2).", '12')])

# ---------- Succession d'épreuves indépendantes, Bernoulli (p.12-13) ----------
pt('TSPE-501', [B('autre', "Probabilité d'une issue (x₁, …, xₙ) = produit des probabilités des composantes (épreuves indépendantes).", '13')])
pt('TSPE-612', [B('autre', "Représentation par un produit cartésien (univers {0, 1}ⁿ ou {a, b}ⁿ pour Bernoulli).", '12-13')])
pt('TSPE-613', [B('figures', "Représentation par un arbre.", '13')])
pt('TSPE-502', [B('autre', "Épreuve à deux issues, loi de Bernoulli.", '13')])
pt('TSPE-503', [B('autre', "n épreuves de Bernoulli identiques et indépendantes (n quelconque ; en 1re, n ⩽ 4).", '12-13')])
pt('TSPE-504', [B('autre', "Loi binomiale B(n, p) : loi du nombre de succès.", '13')])
pt('TSPE-614', [B('format', "P(X = k) exprimée avec les coefficients binomiaux.", '13')])
pt('TSPE-505', [B('autre', "Succession d'épreuves indépendantes, en nombre quelconque.", '12-13')])
pt('TSPE-615', [B('operandes', "Épreuves non indépendantes : deux ou trois épreuves seulement.", '13', detail={'max': 3})])
pt('TSPE-506', [B('figures', "Arbre pondéré.", '13')])
pt('TSPE-507', [B('autre', "Probabilité calculée par l'indépendance.", '13')])
pt('TSPE-616', [B('autre', "Probabilité calculée par des probabilités conditionnelles.", '13')])
pt('TSPE-617', [B('autre', "Probabilité calculée par la formule des probabilités totales.", '13')])
pt('TSPE-508', [B('autre', "Modélisation par un schéma de Bernoulli.", '13')])
pt('TSPE-618', [B('autre', "Modélisation par une loi binomiale.", '13')])
pt('TSPE-509', [B('autre', "Problèmes de seuil, de comparaison, d'optimisation sur des probabilités de nombre de succès, par l'expression de la loi binomiale.", '13')])
BINO = B('autre', "Calcul numérique (calculatrice ou algorithme au besoin).", '13')
pt('TSPE-510', [B('format', "P(X = k).", '13'), BINO])
pt('TSPE-619', [B('format', "P(X ⩽ k).", '13'), BINO])
pt('TSPE-620', [B('format', "P(k ⩽ X ⩽ k′).", '13'), BINO])
pt('TSPE-511', [B('autre', "Intervalle I tel que P(X ∈ I) soit inférieure à α, ou supérieure à 1 − α.", '13'), BINO])
pt('TSPE-512', [B('autre', "Démontrer P(X = k) = C(n, k) pᵏ (1 − p)ⁿ⁻ᵏ dans le schéma de Bernoulli.", '13')])
pt('TSPE-513', [B('autre', "Simulation de la planche de Galton.", '13')])
pt('TSPE-514', [B('autre', "Plus petit entier k tel que P(X > k) ⩽ α, X binomiale, α > 0.", '13')])
pt('TSPE-515', [B('autre', "Simulation d'un échantillon d'une variable aléatoire.", '13')])
pt('TSPE-516', [B('autre', "Loi géométrique (approfondissement possible).", '13')])
pt('TSPE-517', [B('autre', "Loi de Poisson comme limite de lois binomiales, évènements rares (approfondissement possible).", '13')])

# ---------- Sommes de variables aléatoires (p.13-14) ----------
pt('TSPE-518', [B('autre', "Somme de deux variables aléatoires (finies).", '14')])
pt('TSPE-519', [B('faits', "E(X + Y) = E(X) + E(Y) et E(aX) = aE(X), pour des variables quelconques.", '13-14')])
pt('TSPE-520', [B('faits', "V(X + Y) = V(X) + V(Y), admise, pour X, Y indépendantes issues d'une succession d'épreuves indépendantes.", '13-14')])
pt('TSPE-521', [B('faits', "V(aX) = a²V(X).", '14')])
pt('TSPE-522', [B('faits', "Espérance de la loi binomiale (np).", '14')])
pt('TSPE-621', [B('faits', "Variance et écart type de la loi binomiale (np(1 − p), √(np(1 − p))).", '14')])
pt('TSPE-523', [B('autre', "Échantillon = liste de variables indépendantes de même loi.", '14')])
pt('TSPE-524', [B('faits', "E(Sₙ) et E(Mₙ) pour un échantillon de taille n.", '14')])
pt('TSPE-622', [B('faits', "V et σ de Sₙ et de Mₙ pour un échantillon de taille n.", '14')])
pt('TSPE-525', [B('autre', "Décomposer une variable en somme de variables plus simples (ex. nombre de succès = somme de variables de Bernoulli).", '13-14')])
pt('TSPE-526', [B('autre', "Espérance, notamment par linéarité (sans déterminer la loi).", '12 ; p.14')])
pt('TSPE-527', [B('autre', "Variance, notamment par somme de variables indépendantes.", '14')])
pt('TSPE-528', [B('autre', "Démontrer E(X) = np pour X de loi binomiale.", '14')])
pt('TSPE-623', [B('autre', "Démontrer V(X) = np(1 − p) pour X de loi binomiale.", '14')])
pt('TSPE-529', [B('autre', "E(XY) = E(X)E(Y) pour X, Y indépendantes et application à V(X + Y) (approfondissement possible, pas un attendu).", '13-14')])

# ---------- Concentration, loi des grands nombres (p.14) ----------
pt('TSPE-530', [B('faits', "P(|X − μ| ⩾ δ) ⩽ V(X)/δ² pour δ > 0.", '14')])
pt('TSPE-531', [B('faits', "P(|Mₙ − μ| ⩾ δ) ⩽ V/(nδ²) pour δ > 0.", '14')])
pt('TSPE-532', [B('faits', "Loi des grands nombres.", '14')])
pt('TSPE-533', [B('autre', "Taille d'échantillon déterminée par l'inégalité de Bienaymé-Tchebychev (ou de concentration), en fonction de la précision et du risque.", '14')])
pt('TSPE-534', [B('autre', "Calcul de P(|Sₙ − pn| > √n), Sₙ de loi B(n, p).", '14')])
pt('TSPE-624', [B('autre', "Comparaison de P(|Sₙ − pn| > √n) avec la majoration de Bienaymé-Tchebychev.", '14')])
pt('TSPE-535', [B('autre', "Simulation d'une marche aléatoire.", '14')])
pt('TSPE-536', [B('operandes', "k = 1, 2, 3.", '14', detail={'liste': [1, 2, 3]})])
pt('TSPE-537', [], "Approfondissement nommé d'un seul mot (« Estimation ») sans contenu détaillé dans le BO : aucune borne textuelle au-delà des bornes générales.")
pt('TSPE-538', [], "Approfondissement nommé d'un seul mot (« Marche aléatoire ») sans contenu détaillé dans le BO : aucune borne textuelle au-delà des bornes générales.")
pt('TSPE-539', [B('autre', "Exemples : sondage (n = 1 000), sex ratio (n = 10⁶), demi-vie d'atomes radioactifs (n = 10²³) (approfondissement possible).", '14')])

# ---------- assemblage ----------
rows = [r for r in csv.DictReader(open(ROOT + 'points-lycee.csv')) if r['grade'] == 'T_SPE']
codes = [r['code'] for r in rows]
missing = set(codes) - set(P); extra = set(P) - set(codes)
assert not missing and not extra, (sorted(missing), sorted(extra))
pts = {}
for r in sorted(rows, key=lambda r: r['code']):
    p = P[r['code']]
    d = {'libelle': r['libelle'], 'rubrique': r['rubrique'], 'bornes': p['bornes']}
    if 'remarque' in p: d['remarque'] = p['remarque']
    pts[r['code']] = d
out = {'T_SPE': {'general': GENERAL, 'points': pts}}
with open(ROOT + 'tspe.json', 'w') as f:
    json.dump(out, f, ensure_ascii=False, indent='\t')
    f.write('\n')
print('ok', len(pts))
