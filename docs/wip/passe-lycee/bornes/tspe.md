# Bornes des points de terminale spécialité

Objectif : pour chaque point actif du programme de spécialité de terminale (`grade` = `T_SPE`, 325 points lus dans `points-lycee.csv`), dire jusqu'où vont les questions qu'on peut y rattacher (« seulement »). Ces bornes servent à juger qu'un modèle de question reste entièrement dans le point. Le programme hérite de la 1re spécialité : ce qui y est déjà borné ne se recopie pas, sauf quand la terminale le change.

## Sources et façon de citer

| Abréviation    | Document                                                                                                                    | Page citée  |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **BO Tle spé** | Programme de spécialité de mathématiques de la classe terminale de la voie générale, BO n° 14 du 2026-04-02 (`bo/tspe.txt`) | page du PDF |

Aucun document d'accompagnement n'est disponible pour ce programme : aucune borne n'en vient.

**Force** : `BO` = écrit dans le programme ; `déduite` = ma lecture d'un texte implicite (toujours expliquée dans la remarque ⚠ du point, ou dans le texte même de la borne pour les bornes générales).

Les points « approfondissement » du BO (« en aucun cas obligatoires », p.3) sont bornés à leur contenu, comme les autres. Un point « démonstration » est borné à ce qui est démontré.

## Ce qui est le plus utile pour la vérification « seulement »

- **Fonctions** : celles de 1re, plus ln, sin et cos ; pas de tangente ni de xᵃ (a réel) hors approfondissement ; aucun autre logarithme que ln ; pas de réciproque d'une fonction continue autre que exp ↔ ln.
- **Continuité, dérivabilité** : jamais à justifier.
- **Limites** : asymptotes parallèles aux axes seulement (obliques : approfondissement) ; opérations admises, composition en contexte ; formalisme non exigé.
- **Trigonométrie** : équation cos(x) = a, inéquation cos(x) ⩽ a sur [−π, π] ; sinus, intervalle, valeurs de a et sens en question (lts-1 à lts-4).
- **Primitives** : xⁿ (n ∈ ℤ), 1/√x, exp, sin, cos et (v′ ∘ u) × u′ ; équations différentielles y′ = ay, y′ = ay + b, y′ = ay + f (solution particulière donnée) ; rien d'exigible sur les autres.
- **Intégrales** : intégration par parties au programme ; démonstration du théorème fondamental pour f positive croissante seulement.
- **Espace** : repère orthonormé ; représentation paramétrique pour les droites seulement, équation cartésienne pour les plans ; sphères, intersection de deux plans et vecteur orthogonal à deux vecteurs = approfondissements ; systèmes « dans des cas simples ».
- **Dénombrement** : ensembles finis ; k-uplets, k-uplets d'éléments distincts, permutations, combinaisons ; combinaisons avec répétitions = approfondissement.
- **Probabilités** : variables finies ; indépendance de variables seulement dans une succession d'épreuves indépendantes, jamais à justifier ; épreuves non indépendantes : deux ou trois au plus ; E(XY) = E(X)E(Y) hors attendus.

## Contradictions et tensions relevées dans le BO

1. **Intersection de deux plans** (p.7) : citée parmi les configurations à traduire par un système (capacité attendue) et, sous la forme « Déterminer l'intersection de deux plans », parmi les approfondissements. → lts-7.
2. **Vecteur orthogonal à deux vecteurs** (p.7) : approfondissement, alors que l'orthogonalité de plans se traduit par un système en capacité attendue. → lts-8.
3. **Fonctions de référence des limites** (p.9) : la section « Limites » cite les seules fonctions de 1re, alors que ln, sin et cos sont étudiés dans la même année et que le découpage n'est « pas un plan de cours ». → lts-5.
4. **x ↦ xⁿ pour n ∈ ℤ** (p.11) : la liste des primitives inclut n = −1, dont la primitive est ln, sans parler de ln|x|. → lts-9.

## Questions ouvertes

`questions-spe.json` : lts-1 (sinus), lts-2 (intervalle de cos(x) = a), lts-3 (valeurs de a), lts-4 (sens de l'inéquation), lts-5 (limites avec ln, sin, cos), lts-6 (taille des systèmes), lts-7 (intersection de deux plans), lts-8 (vecteur normal à (ABC)), lts-9 (primitive de 1/x).

## Libellés signalés

- **TSPE-444** : le BO dit « de l'exponentielle ou du logarithme pour transformer une écriture » ; le libellé ne garde que le logarithme, et la partie exponentielle n'a aucun point en terminale.

## Terminale spécialité (325 points, 318 avec une borne propre)

### Bornes générales (héritées par tous les points du niveau)

- Fonctions connues en terminale : celles de 1re (polynômes, x ↦ xⁿ pour n ∈ ℤ, racine carrée, valeur absolue, exponentielle), plus le logarithme népérien et les fonctions sinus et cosinus. La fonction tangente et x ↦ xᵃ (a réel) ne sont que des approfondissements. — _BO Tle spé p.9-11_ (BO)
- Seul le logarithme népérien est au programme : le BO ne nomme aucun autre logarithme (décimal, de base a). Lecture déduite du silence du texte, qui ne traite que de « la fonction logarithme népérien, notée ln ». — _BO Tle spé p.10_ (déduite)
- Composition de deux fonctions (notation v ∘ u), utilisée principalement pour les fonctions d'une variable réelle. — _BO Tle spé p.4 ; p.9_ (BO)
- Hormis pour la fonction exponentielle (dont la réciproque est ln), l'étude de la réciproque d'une fonction continue n'est pas au programme. — _BO Tle spé p.10_ (BO)
- La justification de la continuité ou de la dérivabilité d'une fonction sur un intervalle n'est pas un objectif du programme : aucune question ne la demande. — _BO Tle spé p.10_ (BO)
- Limites : notion présentée de manière intuitive ; les définitions sont explicitées mais la maîtrise complète du formalisme n'est pas un attendu. Les opérations sur les limites sont admises ; la composition des limites s'utilise en contexte. — _BO Tle spé p.8-9_ (BO)
- Symbole ∑ : peut être utilisé pour écrire certaines expressions de façon concise ; sa manipulation pour démontrer des égalités n'est pas un objectif. — _BO Tle spé p.4_ (BO)
- Vocabulaire ensembliste : n-uplets et produit cartésien de k ensembles (la 1re s'arrêtait au couple et au produit cartésien de deux ensembles) ; notion de bijection rencontrée en situation. — _BO Tle spé p.4-5_ (BO)
- Systèmes linéaires : leur étude générale n'est pas un objectif ; seulement des exemples dans le contexte de la géométrie repérée (décomposition de vecteurs, intersections de plans…). — _BO Tle spé p.5_ (BO)
- Probabilités : univers finis, variables aléatoires finies. — _BO Tle spé p.12_ (BO)
- Variables aléatoires indépendantes : toujours envisagées dans le cadre de la succession d'épreuves indépendantes (indépendance mutuelle) ; toute question visant à justifier l'indépendance de variables données a priori est hors programme. La relation E(XY) = E(X)E(Y) n'est pas un attendu. — _BO Tle spé p.12-13_ (BO)
- Algorithmique : aucune notion nouvelle par rapport à la 2de et à la 1re (langage naturel ou Python, affectation notée ←) ; on se limite aux listes, sans autre type de collection. — _BO Tle spé p.4_ (BO)

### Algèbre et géométrie > Combinatoire et dénombrement

- **TSPE-305** — Principe additif : nombre d'éléments d'une réunion d'ensembles deux à deux disjoints
  - Réunion d'ensembles finis deux à deux disjoints : le cardinal est la somme des cardinaux. — _BO Tle spé p.5_ (BO)
- **TSPE-306** — Principe multiplicatif : nombre d'éléments d'un produit cartésien
  - Cardinal d'un produit cartésien de deux, trois, k ensembles finis. — _BO Tle spé p.5_ (BO)
- **TSPE-307** — Nombre de $k$-uplets (ou $k$-listes) d'un ensemble à $n$ éléments
  - k-uplets (k-listes) quelconques d'un ensemble à n éléments. — _BO Tle spé p.5_ (BO)
  - Ensembles finis. — _BO Tle spé p.5_ (BO)
- **TSPE-308** — Nombre des parties d'un ensemble à $n$ éléments
  - Nombre des parties d'un ensemble à n éléments. — _BO Tle spé p.5_ (BO)
  - Ensembles finis. — _BO Tle spé p.5_ (BO)
- **TSPE-309** — Nombre des $k$-uplets d'éléments distincts d'un ensemble à $n$ éléments
  - k-uplets d'éléments distincts d'un ensemble à n éléments (0 ⩽ k ⩽ n). — _BO Tle spé p.5_ (BO)
  - Ensembles finis. — _BO Tle spé p.5_ (BO)
- **TSPE-310** — Définition de $n!$
  - n! pour n entier naturel. — _BO Tle spé p.5_ (BO)
- **TSPE-311** — Nombre de permutations d'un ensemble fini à $n$ éléments
  - Permutations d'un ensemble fini à n éléments. — _BO Tle spé p.5_ (BO)
- **TSPE-312** — Combinaisons de $k$ éléments d'un ensemble à $n$ éléments : parties à $k$ éléments de l'ensemble
  - Combinaison = partie à k éléments d'un ensemble à n éléments. — _BO Tle spé p.5_ (BO)
  - Ensembles finis. — _BO Tle spé p.5_ (BO)
- **TSPE-313** — Pour $0 \leqslant k \leqslant n$, formules : $\binom{n}{k} = \frac{n(n-1)\cdots(n-k+1)}{k!} = \frac{n!}{(n-k)!\,k!}$
  - Deux formules : n(n − 1)…(n − k + 1)/k! et n!/((n − k)! k!), pour 0 ⩽ k ⩽ n. — _BO Tle spé p.5_ (BO)
- **TSPE-314** — Explicitation pour $k = 0, 1, 2$
  - Explicitation pour k = 0, 1, 2 seulement. — _BO Tle spé p.5_ (BO)
- **TSPE-315** — Symétrie
  - Symétrie des coefficients binomiaux (k ↔ n − k). — _BO Tle spé p.5_ (BO)
- **TSPE-316** — Relation de Pascal
  - Relation de Pascal. — _BO Tle spé p.5_ (BO)
- **TSPE-317** — Dans le cadre d'un problème de dénombrement, utiliser une représentation adaptée (ensembles, arbres, tableaux, diagrammes)
  - Représentations : ensembles, arbres, tableaux, diagrammes. — _BO Tle spé p.6_ (BO)
- **TSPE-318** — Dans le cadre d'un problème de dénombrement, reconnaitre les objets à dénombrer
  - Objets combinatoires de base : listes (k-uplets), combinaisons, permutations, représentés comme parties d'un ensemble, mots, chemins dans un arbre. — _BO Tle spé p.5-6_ (BO)
- **TSPE-319** — Effectuer des dénombrements simples dans des situations issues de divers domaines scientifiques (informatique, génétique, théorie des jeux, probabilités, etc.)
  - Dénombrements simples, portant sur les objets de base (listes, combinaisons, permutations), en contexte : informatique, génétique, théorie des jeux, probabilités, etc. — _BO Tle spé p.5-6_ (BO)
- **TSPE-320** — Démonstration par dénombrement de la relation : $\sum_{k=0}^{n} \binom{n}{k} = 2^n$
  - Démontrer ∑ₖ₌₀ⁿ C(n, k) = 2ⁿ par dénombrement. — _BO Tle spé p.6_ (BO)
- **TSPE-321** — Démonstration de la relation de Pascal par le calcul
  - Démontrer la relation de Pascal par le calcul. — _BO Tle spé p.6_ (BO)
- **TSPE-322** — Combinaisons avec répétitions
  - Combinaisons avec répétitions (approfondissement possible, non obligatoire). — _BO Tle spé p.6_ (BO)
- **TSPE-323** — Pour un entier $n$ donné, génération de la liste des coefficients $\binom{n}{k}$ à l'aide de la relation de Pascal
  - Pour n donné, liste des coefficients C(n, k) générée par la relation de Pascal. — _BO Tle spé p.6_ (BO)
- **TSPE-324** — Génération des permutations d'un ensemble fini, ou tirage aléatoire d'une permutation
  - Génération des permutations d'un ensemble fini, ou tirage aléatoire d'une permutation. — _BO Tle spé p.6_ (BO)
- **TSPE-325** — Génération des parties à 2, 3 éléments d'un ensemble fini
  - Parties à 2 ou 3 éléments seulement. — _BO Tle spé p.6_ (BO)
- **TSPE-541** — Nombre des parties d'un ensemble à $n$ éléments : lien avec les $n$-uplets de $\{0, 1\}$
  - Lien parties ↔ n-uplets de {0, 1}. — _BO Tle spé p.5_ (BO)
- **TSPE-542** — Nombre des parties d'un ensemble à $n$ éléments : lien avec les mots de longueur $n$ sur un alphabet à deux éléments
  - Lien parties ↔ mots de longueur n sur un alphabet à deux éléments. — _BO Tle spé p.5_ (BO)
- **TSPE-543** — Nombre des parties d'un ensemble à $n$ éléments : lien avec les chemins dans un arbre
  - Lien parties ↔ chemins dans un arbre. — _BO Tle spé p.5_ (BO)
- **TSPE-544** — Nombre des parties d'un ensemble à $n$ éléments : lien avec les issues dans une succession de $n$ épreuves de Bernoulli
  - Lien parties ↔ issues d'une succession de n épreuves de Bernoulli. — _BO Tle spé p.5_ (BO)
- **TSPE-545** — Combinaisons de $k$ éléments d'un ensemble à $n$ éléments : représentation en termes de mots
  - Représentation des combinaisons en termes de mots. — _BO Tle spé p.5_ (BO)
- **TSPE-546** — Combinaisons de $k$ éléments d'un ensemble à $n$ éléments : représentation en termes de chemins
  - Représentation des combinaisons en termes de chemins. — _BO Tle spé p.5_ (BO)
- **TSPE-547** — Triangle de Pascal
  - Triangle de Pascal. — _BO Tle spé p.5_ (BO)
- **TSPE-548** — Démonstration de la relation de Pascal par une méthode combinatoire
  - Démontrer la relation de Pascal par une méthode combinatoire. — _BO Tle spé p.6_ (BO)

### Algèbre et géométrie > Manipulation des vecteurs, des droites et des plans de l'espace

- **TSPE-326** — Vecteurs de l'espace
  - Calcul vectoriel dans l'espace : vecteurs, translations, combinaisons linéaires, directions de droites et de plans. — _BO Tle spé p.6_ (BO)
- **TSPE-327** — Combinaisons linéaires de vecteurs de l'espace
  - Combinaisons linéaires de vecteurs de l'espace. — _BO Tle spé p.6_ (BO)
- **TSPE-328** — Droites de l'espace. Vecteurs directeurs d'une droite
  - Droite de l'espace ; un vecteur non nul engendre une direction de droites. — _BO Tle spé p.5-6_ (BO)
- **TSPE-329** — Caractérisation d'une droite par un point et un vecteur directeur
  - Droite caractérisée par un point et un vecteur directeur. — _BO Tle spé p.6_ (BO)
- **TSPE-330** — Plans de l'espace. Direction d'un plan de l'espace
  - Plan de l'espace ; direction engendrée par deux vecteurs non colinéaires. — _BO Tle spé p.5-6_ (BO)
- **TSPE-331** — Caractérisation d'un plan de l'espace par un point et un couple de vecteurs non colinéaires
  - Plan caractérisé par un point et un couple de vecteurs non colinéaires. — _BO Tle spé p.6_ (BO)
- **TSPE-332** — Bases et repères de l'espace
  - Base = trois vecteurs non coplanaires ; repère de l'espace. — _BO Tle spé p.5-6_ (BO)
- **TSPE-333** — Décomposition d'un vecteur sur une base
  - Décomposition d'un vecteur sur une base de l'espace (trois vecteurs non coplanaires) ou d'un plan (deux vecteurs non colinéaires). — _BO Tle spé p.5-6_ (BO)
- **TSPE-334** — Représenter des combinaisons linéaires de vecteurs donnés
  - Représenter des combinaisons linéaires de vecteurs donnés. — _BO Tle spé p.6_ (BO)
  - Supports privilégiés : figures formées à partir des solides usuels du collège (cube, pavé, tétraèdre). — _BO Tle spé p.6_ (BO)
- **TSPE-335** — Exploiter une figure pour exprimer un vecteur comme combinaison linéaire de vecteurs
  - Exprimer un vecteur comme combinaison linéaire en exploitant une figure (pas de coordonnées exigées). — _BO Tle spé p.6_ (déduite)
  - Supports privilégiés : figures formées à partir des solides usuels du collège (cube, pavé, tétraèdre). — _BO Tle spé p.6_ (BO)
  - ⚠ Lecture déduite : la capacité dit « exploiter une figure », par opposition à la section « Représentations paramétriques » où la même tâche est traduite en système ; la figure est donc le support, les coordonnées n'y sont pas requises.
- **TSPE-336** — Décrire la position relative de deux droites
  - Position relative de deux droites de l'espace. — _BO Tle spé p.6_ (BO)
  - Supports privilégiés : figures formées à partir des solides usuels du collège (cube, pavé, tétraèdre). — _BO Tle spé p.6_ (BO)
- **TSPE-337** — Lire sur une figure si deux vecteurs d'un plan forment une base
  - Deux vecteurs d'un plan, lus sur une figure. — _BO Tle spé p.6_ (BO)
  - Supports privilégiés : figures formées à partir des solides usuels du collège (cube, pavé, tétraèdre). — _BO Tle spé p.6_ (BO)
- **TSPE-338** — Lire sur une figure la décomposition d'un vecteur dans une base
  - Décomposition lue sur une figure. — _BO Tle spé p.6_ (BO)
  - Supports privilégiés : figures formées à partir des solides usuels du collège (cube, pavé, tétraèdre). — _BO Tle spé p.6_ (BO)
- **TSPE-339** — Étudier géométriquement des problèmes simples de configurations dans l'espace (alignement, colinéarité, parallélisme, coplanarité)
  - Problèmes simples de configuration traités géométriquement : alignement, colinéarité, parallélisme, coplanarité. — _BO Tle spé p.6_ (BO)
  - Supports privilégiés : figures formées à partir des solides usuels du collège (cube, pavé, tétraèdre). — _BO Tle spé p.6_ (BO)
- **TSPE-340** — Barycentre d'une famille d'un système pondéré de deux, trois ou quatre points
  - Barycentre de deux, trois ou quatre points pondérés. — _BO Tle spé p.6_ (BO)
- **TSPE-341** — Fonction vectorielle de Leibniz
  - Fonction vectorielle de Leibniz (approfondissement possible). — _BO Tle spé p.6_ (BO)
- **TSPE-549** — Translations
  - Translations de l'espace. — _BO Tle spé p.6_ (BO)
- **TSPE-550** — Vecteurs colinéaires
  - Colinéarité de deux vecteurs de l'espace. — _BO Tle spé p.6_ (BO)
- **TSPE-551** — Décrire la position relative d'une droite et d'un plan
  - Position relative d'une droite et d'un plan. — _BO Tle spé p.6_ (BO)
  - Supports privilégiés : figures formées à partir des solides usuels du collège (cube, pavé, tétraèdre). — _BO Tle spé p.6_ (BO)
- **TSPE-552** — Décrire la position relative de deux plans
  - Position relative de deux plans. — _BO Tle spé p.6_ (BO)
  - Supports privilégiés : figures formées à partir des solides usuels du collège (cube, pavé, tétraèdre). — _BO Tle spé p.6_ (BO)
- **TSPE-553** — Lire sur une figure si trois vecteurs de l'espace forment une base
  - Trois vecteurs de l'espace, lus sur une figure. — _BO Tle spé p.6_ (BO)
  - Supports privilégiés : figures formées à partir des solides usuels du collège (cube, pavé, tétraèdre). — _BO Tle spé p.6_ (BO)
- **TSPE-554** — Exemples d'utilisation des barycentres, en particulier de la propriété d'associativité, pour résoudre des problèmes de géométrie
  - Utilisation des barycentres (associativité notamment) pour résoudre des problèmes de géométrie. — _BO Tle spé p.6_ (BO)

### Algèbre et géométrie > Orthogonalité et distances dans l'espace

- **TSPE-342** — Produit scalaire de deux vecteurs de l'espace
  - Produit scalaire de deux vecteurs de l'espace (extension du produit scalaire du plan). — _BO Tle spé p.6_ (BO)
- **TSPE-343** — Orthogonalité de deux vecteurs. Caractérisation par le produit scalaire
  - Deux vecteurs sont orthogonaux si et seulement si leur produit scalaire est nul. — _BO Tle spé p.6_ (BO)
- **TSPE-344** — Base orthonormée, repère orthonormé
  - Base orthonormée, repère orthonormé de l'espace. — _BO Tle spé p.6_ (BO)
- **TSPE-345** — Coordonnées d'un vecteur dans une base orthonormée. Expression du produit scalaire
  - Produit scalaire en coordonnées dans une base orthonormée (xx′ + yy′ + zz′). — _BO Tle spé p.6_ (BO)
- **TSPE-346** — Expression de la distance entre deux points
  - Distance entre deux points en repère orthonormé. — _BO Tle spé p.6_ (BO)
- **TSPE-347** — Développement de $\lVert\vec{u} + \vec{v}\rVert^2$
  - Développement de ‖u + v‖² seulement. — _BO Tle spé p.6_ (BO)
- **TSPE-348** — Orthogonalité de deux droites
  - Orthogonalité de deux droites de l'espace. — _BO Tle spé p.7_ (BO)
- **TSPE-349** — Vecteur normal à un plan
  - Vecteur normal à un plan. — _BO Tle spé p.7_ (BO)
- **TSPE-350** — Projeté orthogonal d'un point sur une droite
  - Projeté orthogonal d'un point sur une droite de l'espace. — _BO Tle spé p.7_ (BO)
- **TSPE-351** — Plans perpendiculaires. Caractérisation par des vecteurs normaux
  - Plans perpendiculaires, caractérisés par leurs vecteurs normaux. — _BO Tle spé p.7_ (BO)
- **TSPE-352** — Utiliser le produit scalaire pour démontrer une orthogonalité
  - Démontrer une orthogonalité dans l'espace à l'aide du produit scalaire. — _BO Tle spé p.7_ (BO)
- **TSPE-353** — Utiliser le produit scalaire pour démontrer la perpendicularité de deux plans
  - Perpendicularité de deux plans à l'aide du produit scalaire (vecteurs normaux). — _BO Tle spé p.7_ (BO)
- **TSPE-354** — Utiliser le produit scalaire pour calculer un angle
  - Calcul d'un angle dans l'espace à l'aide du produit scalaire. — _BO Tle spé p.7_ (BO)
- **TSPE-355** — Utiliser le produit scalaire pour calculer une longueur dans l'espace
  - Calcul d'une longueur dans l'espace à l'aide du produit scalaire. — _BO Tle spé p.7_ (BO)
- **TSPE-356** — Utiliser la projection orthogonale pour déterminer la distance d'un point à une droite
  - Distance d'un point à une droite par la projection orthogonale. — _BO Tle spé p.7_ (BO)
- **TSPE-357** — Étudier des problèmes de configuration dans l'espace : orthogonalité de deux droites
  - Configuration : orthogonalité de deux droites. — _BO Tle spé p.7_ (BO)
- **TSPE-358** — Étudier des problèmes de configuration dans l'espace : lieux géométriques simples, par exemple plan médiateur de deux points
  - Lieux géométriques simples, par exemple plan médiateur de deux points. — _BO Tle spé p.7_ (BO)
- **TSPE-359** — Le projeté orthogonal d'un point $M$ sur un plan $\mathcal{P}$ est le point de $\mathcal{P}$ le plus proche de $M$
  - Démontrer que le projeté orthogonal de M sur un plan P est le point de P le plus proche de M. — _BO Tle spé p.7_ (BO)
- **TSPE-360** — Intersection d'une sphère et d'un plan
  - Intersection d'une sphère et d'un plan (approfondissement possible). — _BO Tle spé p.7_ (BO)
- **TSPE-361** — Sphère circonscrite à un tétraèdre
  - Sphère circonscrite à un tétraèdre (approfondissement possible). — _BO Tle spé p.7_ (BO)
- **TSPE-362** — Fonction scalaire de Leibniz
  - Fonction scalaire de Leibniz (approfondissement possible). — _BO Tle spé p.7_ (BO)
- **TSPE-555** — Produit scalaire de deux vecteurs de l'espace : bilinéarité
  - Bilinéarité. — _BO Tle spé p.6_ (BO)
- **TSPE-556** — Produit scalaire de deux vecteurs de l'espace : symétrie
  - Symétrie. — _BO Tle spé p.6_ (BO)
- **TSPE-557** — Coordonnées d'un vecteur dans une base orthonormée. Expression de la norme
  - Norme en coordonnées dans une base orthonormée. — _BO Tle spé p.6_ (BO)
- **TSPE-558** — Formules de polarisation
  - Formules de polarisation (produit scalaire exprimé par des normes). — _BO Tle spé p.6_ (BO)
- **TSPE-559** — Orthogonalité d'un plan et d'une droite
  - Orthogonalité d'une droite et d'un plan. — _BO Tle spé p.7_ (BO)
- **TSPE-560** — Étant donnés un point $A$ et un vecteur non nul $\vec{n}$, plan passant par $A$ et normal à $\vec{n}$
  - Plan passant par un point A et normal à un vecteur non nul n. — _BO Tle spé p.7_ (BO)
- **TSPE-561** — Projeté orthogonal d'un point sur un plan
  - Projeté orthogonal d'un point sur un plan. — _BO Tle spé p.7_ (BO)
- **TSPE-562** — Utiliser la projection orthogonale pour déterminer la distance d'un point à un plan
  - Distance d'un point à un plan par la projection orthogonale. — _BO Tle spé p.7_ (BO)
- **TSPE-563** — Étudier des problèmes de configuration dans l'espace : orthogonalité d'une droite et d'un plan
  - Configuration : orthogonalité d'une droite et d'un plan. — _BO Tle spé p.7_ (BO)
- **TSPE-564** — Plan tangent à une sphère en un point
  - Plan tangent à une sphère en un point (approfondissement possible). — _BO Tle spé p.7_ (BO)
- **TSPE-625** — Résoudre des problèmes impliquant des grandeurs et mesures : longueur, angle, aire, volume
  - Grandeurs : longueur, angle, aire, volume. — _BO Tle spé p.7_ (BO)

### Algèbre et géométrie > Représentations paramétriques et équations cartésiennes

- **TSPE-363** — Représentation paramétrique d'une droite
  - Représentation paramétrique d'une droite (paramètre réel). — _BO Tle spé p.7_ (BO)
  - Pas de représentation paramétrique de plan : un plan est donné par une équation cartésienne. — _BO Tle spé p.7_ (déduite)
  - Repère de l'espace supposé orthonormé. — _BO Tle spé p.7_ (BO)
  - ⚠ Lecture déduite : le BO ne prévoit de représentation paramétrique que pour les droites (« Représentation paramétrique d'une droite », « Équation cartésienne d'un plan ») ; un modèle demandant une représentation paramétrique de plan sort du point.
- **TSPE-364** — Équation cartésienne d'un plan
  - Équation cartésienne d'un plan (ax + by + cz + d = 0). — _BO Tle spé p.7_ (BO)
  - Repère de l'espace supposé orthonormé. — _BO Tle spé p.7_ (BO)
- **TSPE-365** — Déterminer une représentation paramétrique d'une droite
  - Déterminer une représentation paramétrique d'une droite (à partir d'un point et d'un vecteur directeur, ou de deux points). — _BO Tle spé p.7_ (déduite)
  - Repère de l'espace supposé orthonormé. — _BO Tle spé p.7_ (BO)
  - ⚠ Lecture déduite : les données (point + vecteur directeur, deux points) ne sont pas écrites ; elles viennent de la caractérisation d'une droite par un point et un vecteur directeur (BO p.6).
- **TSPE-366** — Reconnaitre une droite donnée par une représentation paramétrique
  - Reconnaître une droite donnée par une représentation paramétrique (point, vecteur directeur). — _BO Tle spé p.7_ (BO)
  - Repère de l'espace supposé orthonormé. — _BO Tle spé p.7_ (BO)
- **TSPE-367** — Déterminer l'équation cartésienne d'un plan dont on connait un vecteur normal et un point
  - Équation cartésienne d'un plan à partir d'un vecteur normal et d'un point. — _BO Tle spé p.7_ (BO)
  - Repère de l'espace supposé orthonormé. — _BO Tle spé p.7_ (BO)
- **TSPE-368** — Reconnaitre un plan donné par une équation cartésienne
  - Reconnaître un plan donné par une équation cartésienne. — _BO Tle spé p.7_ (BO)
  - Repère de l'espace supposé orthonormé. — _BO Tle spé p.7_ (BO)
- **TSPE-369** — Déterminer les coordonnées du projeté orthogonal d'un point sur un plan donné par une équation cartésienne
  - Projeté orthogonal d'un point sur un plan donné par une équation cartésienne. — _BO Tle spé p.7_ (BO)
  - Repère de l'espace supposé orthonormé. — _BO Tle spé p.7_ (BO)
- **TSPE-370** — Déterminer les coordonnées du projeté orthogonal d'un point sur une droite donnée par un point et un vecteur directeur
  - Projeté orthogonal d'un point sur une droite donnée par un point et un vecteur directeur. — _BO Tle spé p.7_ (BO)
  - Repère de l'espace supposé orthonormé. — _BO Tle spé p.7_ (BO)
- **TSPE-371** — Dans un cadre géométrique repéré, traduire par un système d'équations linéaires des problèmes de types suivants : décider si trois vecteurs forment une base
  - Traduire par un système d'équations linéaires : trois vecteurs forment-ils une base ? — _BO Tle spé p.7_ (BO)
  - Exemples de systèmes linéaires dans le seul contexte géométrique ; étude générale des systèmes hors programme. — _BO Tle spé p.5_ (BO)
  - Repère de l'espace supposé orthonormé. — _BO Tle spé p.7_ (BO)
- **TSPE-372** — Dans des cas simples, résoudre le système obtenu
  - Résolution dans des cas simples seulement. — _BO Tle spé p.7_ (BO)
  - Exemples de systèmes linéaires dans le seul contexte géométrique ; étude générale des systèmes hors programme. — _BO Tle spé p.5_ (BO)
  - ⚠ « Cas simples » non précisé : taille des systèmes en question (lts-6).
- **TSPE-373** — Équation cartésienne du plan normal au vecteur $\vec{n}$ et passant par le point $A$
  - Démontrer l'équation cartésienne du plan normal à n passant par A. — _BO Tle spé p.7_ (BO)
- **TSPE-374** — Déterminer l'intersection de deux plans
  - Intersection de deux plans (approfondissement possible). — _BO Tle spé p.7_ (BO)
- **TSPE-375** — Déterminer un vecteur orthogonal à deux vecteurs non colinéaires
  - Vecteur orthogonal à deux vecteurs non colinéaires (approfondissement possible). — _BO Tle spé p.7_ (BO)
- **TSPE-376** — Équation d'une sphère dont on connait le centre et le rayon
  - Équation d'une sphère de centre et rayon donnés (approfondissement possible). — _BO Tle spé p.7_ (BO)
- **TSPE-377** — Intersection d'une sphère et d'une droite
  - Intersection d'une sphère et d'une droite (approfondissement possible). — _BO Tle spé p.7_ (BO)
- **TSPE-565** — Préciser un vecteur normal à un plan donné par une équation cartésienne
  - Lire un vecteur normal (a, b, c) sur l'équation cartésienne. — _BO Tle spé p.7_ (BO)
  - Repère de l'espace supposé orthonormé. — _BO Tle spé p.7_ (BO)
- **TSPE-566** — Dans un cadre géométrique repéré, traduire par un système d'équations linéaires des problèmes de types suivants : déterminer les coordonnées d'un vecteur dans une base
  - Traduire par un système : coordonnées d'un vecteur dans une base. — _BO Tle spé p.7_ (BO)
  - Exemples de systèmes linéaires dans le seul contexte géométrique ; étude générale des systèmes hors programme. — _BO Tle spé p.5_ (BO)
  - Repère de l'espace supposé orthonormé. — _BO Tle spé p.7_ (BO)
- **TSPE-567** — Dans un cadre géométrique repéré, traduire par un système d'équations linéaires des problèmes de types suivants : étudier une configuration dans l'espace (alignement, colinéarité, parallélisme, coplanarité, intersection et orthogonalité de droites ou de plans), etc.
  - Traduire par un système : alignement, colinéarité, parallélisme, coplanarité, intersection et orthogonalité de droites ou de plans. — _BO Tle spé p.7_ (BO)
  - Exemples de systèmes linéaires dans le seul contexte géométrique ; étude générale des systèmes hors programme. — _BO Tle spé p.5_ (BO)
  - Repère de l'espace supposé orthonormé. — _BO Tle spé p.7_ (BO)
  - ⚠ Voir les questions lts-7 (intersection de deux plans, approfondissement) et lts-8 (vecteur orthogonal à deux vecteurs, approfondissement).
- **TSPE-568** — Dans des cas simples, interpréter géométriquement les solutions du système obtenu
  - Interprétation géométrique des solutions (point, droite, plan, aucun). — _BO Tle spé p.7_ (BO)
  - Exemples de systèmes linéaires dans le seul contexte géométrique ; étude générale des systèmes hors programme. — _BO Tle spé p.5_ (BO)

### Analyse > Calcul intégral

- **TSPE-475** — Définition de l'intégrale d'une fonction continue positive définie sur un segment $[a, b]$, comme aire sous la courbe représentative de $f$. Notation $\int_a^b f(x)\,\mathrm{d}x$
  - Fonction continue positive sur un segment [a, b] : intégrale = aire sous la courbe (notion intuitive d'aire, sans difficulté théorique). — _BO Tle spé p.8 ; p.11_ (BO)
- **TSPE-476** — Théorème : si $f$ est une fonction continue positive sur $[a, b]$, alors la fonction $F_a$ définie sur $[a, b]$ par $F_a(x) = \int_a^x f(t)\,\mathrm{d}t$ est la primitive de $f$ qui s'annule en $a$
  - f continue positive sur [a, b] : F_a(x) = ∫ₐˣ f(t) dt est la primitive de f qui s'annule en a. — _BO Tle spé p.11_ (BO)
- **TSPE-477** — Sous les hypothèses du théorème, relation $\int_a^b f(x)\,\mathrm{d}x = F(b) - F(a)$ où $F$ est une primitive quelconque de $f$. Notation $\left[F(x)\right]_a^b$
  - ∫ₐᵇ f(x) dx = F(b) − F(a), notation [F(x)]ₐᵇ. — _BO Tle spé p.12_ (BO)
- **TSPE-478** — Théorème : toute fonction continue sur un intervalle admet des primitives
  - Toute fonction continue sur un intervalle admet des primitives. — _BO Tle spé p.12_ (BO)
- **TSPE-479** — Définition par les primitives de $\int_a^b f(x)\,\mathrm{d}x$ lorsque $f$ est une fonction continue de signe quelconque sur un intervalle contenant $a$ et $b$
  - Intégrale d'une fonction continue de signe quelconque, définie par les primitives. — _BO Tle spé p.12_ (BO)
- **TSPE-480** — Linéarité de l'intégrale
  - Linéarité de l'intégrale. — _BO Tle spé p.12_ (BO)
- **TSPE-481** — Positivité et intégration des inégalités
  - Positivité et intégration des inégalités. — _BO Tle spé p.12_ (BO)
- **TSPE-482** — Relation de Chasles
  - Relation de Chasles. — _BO Tle spé p.12_ (BO)
- **TSPE-483** — Valeur moyenne d'une fonction
  - Valeur moyenne d'une fonction sur un intervalle. — _BO Tle spé p.12_ (BO)
- **TSPE-484** — Intégration par parties
  - Intégration par parties. — _BO Tle spé p.12_ (BO)
- **TSPE-485** — Estimer graphiquement une intégrale
  - Estimation graphique d'une intégrale. — _BO Tle spé p.12_ (BO)
- **TSPE-486** — Estimer graphiquement une valeur moyenne
  - Estimation graphique d'une valeur moyenne. — _BO Tle spé p.12_ (BO)
- **TSPE-487** — Calculer une intégrale à l'aide d'une primitive
  - Intégrale calculée par une primitive (primitives de référence et (v′ ∘ u) × u′). — _BO Tle spé p.11-12_ (BO)
- **TSPE-488** — Calculer une intégrale à l'aide d'une intégration par parties
  - Intégrale calculée par une intégration par parties. — _BO Tle spé p.12_ (BO)
- **TSPE-489** — Majorer (minorer) une intégrale à partir d'une majoration (minoration) d'une fonction par une autre fonction
  - Majorer (minorer) une intégrale à partir d'une majoration (minoration) de la fonction. — _BO Tle spé p.12_ (BO)
- **TSPE-490** — Calculer l'aire entre deux courbes
  - Aire entre deux courbes. — _BO Tle spé p.12_ (BO)
- **TSPE-491** — Étudier une suite d'intégrales, vérifiant éventuellement une relation de récurrence
  - Suite d'intégrales, éventuellement définie par une relation de récurrence. — _BO Tle spé p.12_ (BO)
- **TSPE-492** — Interpréter une intégrale dans un contexte issu d'une autre discipline
  - Interprétation d'une intégrale dans un contexte d'une autre discipline. — _BO Tle spé p.12_ (BO)
- **TSPE-493** — Interpréter une valeur moyenne dans un contexte issu d'une autre discipline
  - Interprétation d'une valeur moyenne dans un contexte d'une autre discipline. — _BO Tle spé p.12_ (BO)
- **TSPE-494** — Pour une fonction positive croissante $f$ sur $[a, b]$, la fonction $x \mapsto \int_a^x f(t)\,\mathrm{d}t$ est une primitive de $f$. Pour toute primitive $F$ de $f$, relation $\int_a^b f(x)\,\mathrm{d}x = F(b) - F(a)$
  - Démonstration pour f positive et croissante sur [a, b] seulement : x ↦ ∫ₐˣ f(t) dt est une primitive de f, puis ∫ₐᵇ f = F(b) − F(a). — _BO Tle spé p.12_ (BO)
- **TSPE-495** — Intégration par parties (démonstration)
  - Démontrer la formule d'intégration par parties. — _BO Tle spé p.12_ (BO)
- **TSPE-496** — Approximation d'une aire par l'utilisation de suites adjacentes
  - Approximation d'une aire par des suites adjacentes (approfondissement possible). — _BO Tle spé p.12_ (BO)
- **TSPE-497** — Encadrement de $H_n = \sum_{k=1}^{n} \frac{1}{k}$ par des intégrales
  - Encadrement de Hₙ = ∑ 1/k par des intégrales (approfondissement possible). — _BO Tle spé p.12_ (BO)
- **TSPE-498** — Méthode des rectangles
  - Méthode des rectangles. — _BO Tle spé p.12_ (BO)
- **TSPE-499** — Méthode de Monte-Carlo
  - Méthode de Monte-Carlo. — _BO Tle spé p.12_ (BO)
- **TSPE-500** — Algorithme de Brouncker pour le calcul de $\ln(2)$
  - Algorithme de Brouncker pour ln(2). — _BO Tle spé p.12_ (BO)
- **TSPE-608** — Encadrer une intégrale
  - Encadrement d'une intégrale (méthode des rectangles notamment). — _BO Tle spé p.8 ; p.12_ (BO)
- **TSPE-609** — Encadrer une valeur moyenne
  - Encadrement d'une valeur moyenne. — _BO Tle spé p.12_ (BO)
- **TSPE-610** — Méthode des milieux
  - Méthode des milieux. — _BO Tle spé p.12_ (BO)
- **TSPE-611** — Méthode des trapèzes
  - Méthode des trapèzes. — _BO Tle spé p.12_ (BO)

### Analyse > Compléments sur la dérivation

- **TSPE-407** — Composée de deux fonctions, notation $v \circ u$
  - Composée de deux fonctions, notation v ∘ u. — _BO Tle spé p.9_ (BO)
- **TSPE-408** — Relation $(v \circ u)' = (v' \circ u) \times u'$ pour la dérivée de la composée de deux fonctions dérivables
  - (v ∘ u)′ = (v′ ∘ u) × u′ pour u, v dérivables. — _BO Tle spé p.9_ (BO)
- **TSPE-409** — Dérivée seconde d'une fonction
  - Dérivée seconde (la dérivée n-ième n'est qu'un approfondissement). — _BO Tle spé p.9-10_ (BO)
- **TSPE-410** — Fonction convexe sur un intervalle : définition par la position relative de la courbe représentative et des sécantes
  - Convexité définie par la position de la courbe par rapport à ses sécantes. — _BO Tle spé p.9_ (BO)
- **TSPE-411** — Pour une fonction deux fois dérivable, équivalence admise avec la position par rapport aux tangentes
  - Pour f deux fois dérivable, équivalence admise : convexe ⇔ courbe au-dessus de ses tangentes. — _BO Tle spé p.9_ (BO)
- **TSPE-412** — Point d'inflexion
  - Point d'inflexion, repéré en lien avec la convexité (graphiques de f, f′ ou f″). — _BO Tle spé p.9-10_ (BO)
- **TSPE-413** — Calculer la dérivée d'une fonction donnée par une formule simple mettant en jeu opérations algébriques et composition
  - Formule simple mettant en jeu opérations algébriques et composition. — _BO Tle spé p.9_ (BO)
  - Fonctions construites simplement à partir des fonctions de référence (opérations algébriques et composition). — _BO Tle spé p.9_ (BO)
- **TSPE-414** — Calculer la fonction dérivée d'une fonction construite simplement à partir des fonctions de référence
  - Fonctions construites simplement à partir des fonctions de référence (opérations algébriques et composition). — _BO Tle spé p.9_ (BO)
- **TSPE-415** — Déterminer les limites d'une fonction construite simplement à partir des fonctions de référence
  - Fonctions construites simplement à partir des fonctions de référence (opérations algébriques et composition). — _BO Tle spé p.9_ (BO)
  - ⚠ Les fonctions admises au-delà de celles de 1re (ln, sin, cos) sont en question (lts-5).
- **TSPE-416** — Étudier les variations d'une fonction construite simplement à partir des fonctions de référence
  - Fonctions construites simplement à partir des fonctions de référence (opérations algébriques et composition). — _BO Tle spé p.9_ (BO)
- **TSPE-417** — Démontrer des inégalités en utilisant la convexité d'une fonction
  - Inégalités obtenues par la convexité (position par rapport aux tangentes ou aux sécantes). — _BO Tle spé p.9_ (BO)
- **TSPE-418** — Esquisser l'allure de la courbe représentative d'une fonction $f$ à partir de la donnée de tableaux de variations de $f$, de $f'$ ou de $f''$
  - Allure de la courbe à partir de tableaux de variations de f, de f′ ou de f″. — _BO Tle spé p.9-10_ (BO)
- **TSPE-419** — Lire sur une représentation graphique de $f$ les intervalles où $f$ est convexe, concave
  - Lecture sur la courbe de f : intervalles de convexité, de concavité. — _BO Tle spé p.10_ (BO)
- **TSPE-420** — Dans le cadre de la résolution de problème, étudier et utiliser la convexité d'une fonction
  - Convexité étudiée et utilisée dans le cadre d'une résolution de problème. — _BO Tle spé p.10_ (BO)
  - Fonctions construites simplement à partir des fonctions de référence (opérations algébriques et composition). — _BO Tle spé p.9_ (BO)
- **TSPE-421** — Si $f''$ est positive, alors la courbe représentative de $f$ est au-dessus de ses tangentes
  - Démontrer : si f″ est positive, la courbe de f est au-dessus de ses tangentes. — _BO Tle spé p.10_ (BO)
- **TSPE-422** — Courbe de Lorenz
  - Courbe de Lorenz (approfondissement possible). — _BO Tle spé p.10_ (BO)
- **TSPE-423** — Dérivée $n$-ième d'une fonction
  - Dérivée n-ième (approfondissement possible). — _BO Tle spé p.10_ (BO)
- **TSPE-424** — Inégalité arithmético-géométrique
  - Inégalité arithmético-géométrique (approfondissement possible). — _BO Tle spé p.10_ (BO)
- **TSPE-585** — Pour une fonction deux fois dérivable, équivalence admise avec la croissance de $f'$
  - Pour f deux fois dérivable, équivalence admise : convexe ⇔ f′ croissante. — _BO Tle spé p.9_ (BO)
- **TSPE-586** — Pour une fonction deux fois dérivable, équivalence admise avec la positivité de $f''$
  - Pour f deux fois dérivable, équivalence admise : convexe ⇔ f″ positive. — _BO Tle spé p.9_ (BO)
- **TSPE-587** — Lire sur une représentation graphique de $f$ les points d'inflexion
  - Lecture sur la courbe de f : points d'inflexion. — _BO Tle spé p.10_ (BO)
- **TSPE-588** — Lire sur une représentation graphique de $f'$ les intervalles où $f$ est convexe, concave
  - Lecture sur la courbe de f′ : intervalles de convexité, de concavité de f. — _BO Tle spé p.10_ (BO)
- **TSPE-589** — Lire sur une représentation graphique de $f'$ les points d'inflexion
  - Lecture sur la courbe de f′ : points d'inflexion de f. — _BO Tle spé p.10_ (BO)
- **TSPE-590** — Lire sur une représentation graphique de $f''$ les intervalles où $f$ est convexe, concave
  - Lecture sur la courbe de f″ : intervalles de convexité, de concavité de f. — _BO Tle spé p.10_ (BO)
- **TSPE-591** — Lire sur une représentation graphique de $f''$ les points d'inflexion
  - Lecture sur la courbe de f″ : points d'inflexion de f. — _BO Tle spé p.10_ (BO)

### Analyse > Continuité des fonctions d'une variable réelle

- **TSPE-425** — Fonction continue en un point (définition par les limites), sur un intervalle
  - Continuité en un point définie par les limites ; continuité sur un intervalle. Aucune justification de continuité demandée. — _BO Tle spé p.10_ (BO)
- **TSPE-426** — Toute fonction dérivable est continue
  - Toute fonction dérivable est continue. — _BO Tle spé p.10_ (BO)
- **TSPE-427** — Image d'une suite convergente par une fonction continue
  - Si uₙ → ℓ et f continue en ℓ, alors f(uₙ) → f(ℓ). — _BO Tle spé p.10_ (BO)
- **TSPE-428** — Théorème des valeurs intermédiaires
  - Théorème des valeurs intermédiaires (admis ; sa démonstration par dichotomie n'est qu'un approfondissement). — _BO Tle spé p.10_ (BO)
- **TSPE-429** — Cas des fonctions continues strictement monotones
  - Fonction continue strictement monotone sur un intervalle : unicité de la solution de f(x) = k. — _BO Tle spé p.10_ (BO)
- **TSPE-430** — Étudier les solutions d'une équation du type $f(x) = k$ : existence, unicité
  - Équation du type f(x) = k : existence, unicité. — _BO Tle spé p.10_ (BO)
- **TSPE-431** — Encadrer les solutions d'une équation du type $f(x) = k$
  - Équation du type f(x) = k : encadrement des solutions. — _BO Tle spé p.10_ (BO)
- **TSPE-432** — Pour une fonction continue $f$ d'un intervalle dans lui-même, étudier une suite définie par une relation de récurrence $u_{n+1} = f(u_n)$
  - uₙ₊₁ = f(uₙ) avec f continue d'un intervalle dans lui-même. — _BO Tle spé p.10_ (BO)
- **TSPE-433** — Méthode de dichotomie
  - Méthode de dichotomie. — _BO Tle spé p.10_ (BO)
- **TSPE-434** — Méthode de Newton
  - Méthode de Newton. — _BO Tle spé p.10_ (BO)
- **TSPE-435** — Démonstration par dichotomie du théorème des valeurs intermédiaires
  - Démonstration du TVI par dichotomie (approfondissement possible). — _BO Tle spé p.10_ (BO)
- **TSPE-436** — Fonctions continues de $\mathbb{R}$ dans $\mathbb{R}$ telles que $f(x + y) = f(x) + f(y)$, pour tous réels $x$, $y$
  - Fonctions continues de ℝ dans ℝ vérifiant f(x + y) = f(x) + f(y) (approfondissement possible). — _BO Tle spé p.10_ (BO)
- **TSPE-437** — Prolongement par continuité
  - Prolongement par continuité (approfondissement possible). — _BO Tle spé p.10_ (BO)
- **TSPE-592** — Méthode de la sécante
  - Méthode de la sécante. — _BO Tle spé p.10_ (BO)

### Analyse > Fonction logarithme

- **TSPE-438** — Fonction logarithme népérien, notée $\ln$, construite comme réciproque de la fonction exponentielle
  - ln, réciproque de exp : pour x > 0, e^(ln x) = x ; pour x réel, ln(eˣ) = x. — _BO Tle spé p.10_ (déduite)
  - ⚠ Lecture déduite : les deux égalités traduisent « construite comme réciproque de la fonction exponentielle » ; le BO ne les écrit pas.
- **TSPE-439** — Propriétés algébriques du logarithme
  - Propriétés algébriques du logarithme (équation fonctionnelle ln(ab) = ln a + ln b et ses conséquences). — _BO Tle spé p.10_ (BO)
- **TSPE-440** — Fonction dérivée du logarithme
  - ln′(x) = 1/x sur ]0 ; +∞[. — _BO Tle spé p.10_ (BO)
- **TSPE-441** — Limites en $0$ et en $+\infty$
  - Limites de ln en 0 et en +∞. — _BO Tle spé p.10_ (BO)
- **TSPE-442** — Lien entre les courbes représentatives des fonctions logarithme népérien et exponentielle
  - Courbes de ln et exp symétriques par rapport à la droite y = x. — _BO Tle spé p.10_ (déduite)
  - ⚠ Lecture déduite : le BO dit « lien entre les courbes représentatives » ; la symétrie par rapport à y = x est ce lien pour deux fonctions réciproques.
- **TSPE-443** — Croissance comparée du logarithme népérien et de $x \mapsto x^n$ en $0$ et en $+\infty$
  - Croissance comparée de ln et de x ↦ xⁿ, en 0 et en +∞. — _BO Tle spé p.10_ (BO)
- **TSPE-444** — Utiliser l'équation fonctionnelle du logarithme pour transformer une écriture
  - Transformer une écriture avec ln par l'équation fonctionnelle. — _BO Tle spé p.10_ (BO)
  - ⚠ libellé : le BO dit « Utiliser l'équation fonctionnelle de l'exponentielle ou du logarithme pour transformer une écriture » ; le libellé ne garde que le logarithme et aucun point de Tle spé ne porte la partie exponentielle (elle existe en 1re spé).
  - → David (2026-10-23) : **laisser**
  - → David (2026-10-23) : point neuf à créer à côté — « Utiliser l'équation fonctionnelle de l'exponentielle pour transformer une écriture »
- **TSPE-445** — Utiliser l'équation fonctionnelle de l'exponentielle pour résoudre une équation
  - Résoudre une équation par l'équation fonctionnelle de l'exponentielle. — _BO Tle spé p.10_ (BO)
  - Équations, inéquations et écritures où intervient exp ou ln, traitées par l'équation fonctionnelle. — _BO Tle spé p.10_ (BO)
- **TSPE-446** — Utiliser l'équation fonctionnelle du logarithme pour résoudre une équation
  - Résoudre une équation par l'équation fonctionnelle du logarithme. — _BO Tle spé p.10_ (BO)
  - Équations, inéquations et écritures où intervient exp ou ln, traitées par l'équation fonctionnelle. — _BO Tle spé p.10_ (BO)
- **TSPE-447** — Dans le cadre d'une résolution de problème, utiliser les propriétés des fonctions exponentielle et logarithme — _hérite des bornes générales_
  - ⚠ Point-compétence (raisonner, démontrer, modéliser) sans grain questionnable propre : aucune borne au-delà des bornes générales.
- **TSPE-448** — Calcul de la fonction dérivée de la fonction logarithme népérien, la dérivabilité étant admise
  - Démontrer ln′(x) = 1/x, la dérivabilité de ln étant admise. — _BO Tle spé p.10_ (BO)
- **TSPE-449** — Limite en $0$ de $x \mapsto x\ln(x)$
  - Démontrer lim x ln(x) = 0 en 0. — _BO Tle spé p.10_ (BO)
- **TSPE-450** — Algorithme de Briggs pour le calcul du logarithme
  - Algorithme de Briggs. — _BO Tle spé p.10_ (BO)
- **TSPE-451** — Pour $a$ dans $\mathbb{R}$, fonction $x \mapsto x^a$
  - x ↦ xᵃ pour a réel (approfondissement possible). — _BO Tle spé p.10_ (BO)
- **TSPE-452** — Pour $x$ dans $\mathbb{R}$, limite de $\left(1 + \frac{x}{n}\right)^n$
  - Limite de (1 + x/n)ⁿ pour x réel (approfondissement possible). — _BO Tle spé p.10_ (BO)
- **TSPE-593** — Variations de la fonction logarithme népérien
  - ln strictement croissante sur ]0 ; +∞[. — _BO Tle spé p.10_ (BO)
- **TSPE-594** — Courbe représentative
  - Courbe représentative de ln. — _BO Tle spé p.10_ (BO)
- **TSPE-595** — Utiliser l'équation fonctionnelle de l'exponentielle pour résoudre une inéquation
  - Résoudre une inéquation par l'équation fonctionnelle de l'exponentielle. — _BO Tle spé p.10_ (BO)
  - Équations, inéquations et écritures où intervient exp ou ln, traitées par l'équation fonctionnelle. — _BO Tle spé p.10_ (BO)
- **TSPE-596** — Utiliser l'équation fonctionnelle du logarithme pour résoudre une inéquation
  - Résoudre une inéquation par l'équation fonctionnelle du logarithme. — _BO Tle spé p.10_ (BO)
  - Équations, inéquations et écritures où intervient exp ou ln, traitées par l'équation fonctionnelle. — _BO Tle spé p.10_ (BO)

### Analyse > Fonctions sinus et cosinus

- **TSPE-453** — Fonctions trigonométriques sinus et cosinus
  - Sinus et cosinus comme fonctions de ℝ dans ℝ (tangente : approfondissement). — _BO Tle spé p.11_ (BO)
- **TSPE-454** — Dérivées des fonctions sinus et cosinus
  - sin′ = cos, cos′ = −sin. — _BO Tle spé p.11_ (BO)
- **TSPE-455** — Lier la représentation graphique des fonctions sinus et cosinus et le cercle trigonométrique
  - Lien courbes de sin, cos ↔ cercle trigonométrique. — _BO Tle spé p.11_ (BO)
- **TSPE-456** — Traduire graphiquement la parité des fonctions sinus et cosinus
  - Traduction graphique de la parité. — _BO Tle spé p.11_ (BO)
- **TSPE-457** — Résoudre une équation du type $\cos(x) = a$
  - Équation du type cos(x) = a. — _BO Tle spé p.11_ (BO)
  - ⚠ Sinus (lts-1), intervalle de résolution (lts-2) et valeurs de a (lts-3) en question.
- **TSPE-458** — Résoudre une inéquation de la forme $\cos(x) \leqslant a$ sur $[-\pi, \pi]$
  - Inéquation de la forme cos(x) ⩽ a, sur [−π, π]. — _BO Tle spé p.11_ (BO)
  - ⚠ Sinus (lts-1), valeurs de a (lts-3) et sens de l'inégalité (lts-4) en question.
- **TSPE-459** — Dans le cadre de la résolution de problème, notamment géométrique, étudier une fonction simple définie à partir de fonctions trigonométriques, pour déterminer des variations, un optimum
  - Fonction simple définie à partir des fonctions trigonométriques ; but : variations, optimum. — _BO Tle spé p.11_ (BO)
- **TSPE-460** — Fonction tangente
  - Fonction tangente (approfondissement possible). — _BO Tle spé p.11_ (BO)
- **TSPE-597** — Parité des fonctions sinus et cosinus
  - Parité : cos paire, sin impaire. — _BO Tle spé p.11_ (BO)
- **TSPE-598** — Périodicité des fonctions sinus et cosinus
  - Périodicité (2π). — _BO Tle spé p.11_ (BO)
- **TSPE-599** — Courbes représentatives des fonctions sinus et cosinus
  - Courbes représentatives de sin et cos. — _BO Tle spé p.11_ (BO)
- **TSPE-600** — Variations des fonctions sinus et cosinus
  - Variations de sin et cos. — _BO Tle spé p.11_ (BO)
- **TSPE-601** — Traduire graphiquement la périodicité des fonctions sinus et cosinus
  - Traduction graphique de la périodicité. — _BO Tle spé p.11_ (BO)

### Analyse > Limites des fonctions

- **TSPE-397** — Limite finie ou infinie d'une fonction en $+\infty$
  - Limite finie ou infinie en +∞. — _BO Tle spé p.9_ (BO)
- **TSPE-398** — Asymptote parallèle à un axe de coordonnées
  - Asymptotes parallèles à un axe seulement (asymptotes obliques : approfondissement). — _BO Tle spé p.9_ (BO)
- **TSPE-399** — Limites faisant intervenir les fonctions de référence étudiées en classe de première : puissances entières
  - Limites de x ↦ xⁿ, n ∈ ℤ. — _BO Tle spé p.9_ (BO)
- **TSPE-400** — Limites et comparaison
  - Théorèmes de comparaison (et encadrement) pour les limites de fonctions. — _BO Tle spé p.9_ (BO)
- **TSPE-401** — Opérations sur les limites
  - Opérations sur les limites, admises ; composition des limites utilisée en contexte. — _BO Tle spé p.9_ (BO)
- **TSPE-402** — Déterminer dans des cas simples la limite d'une suite, en utilisant les limites usuelles
  - Limite d'une suite, cas simples, par les limites usuelles. — _BO Tle spé p.9_ (BO)
  - Cas simples ; limites usuelles des fonctions de référence de 1re (puissances entières, racine carrée, exponentielle). — _BO Tle spé p.9_ (BO)
  - ⚠ Les fonctions admises au-delà de celles de 1re (ln, sin, cos) sont en question (lts-5).
- **TSPE-403** — Déterminer dans des cas simples la limite d'une fonction en un point, en $\pm\infty$, en utilisant les limites usuelles
  - Limite d'une fonction en un point ou en ±∞, cas simples, par les limites usuelles. — _BO Tle spé p.9_ (BO)
  - Cas simples ; limites usuelles des fonctions de référence de 1re (puissances entières, racine carrée, exponentielle). — _BO Tle spé p.9_ (BO)
  - ⚠ Les fonctions admises au-delà de celles de 1re (ln, sin, cos) sont en question (lts-5).
- **TSPE-404** — Faire le lien entre l'existence d'une asymptote parallèle à un axe et celle de la limite correspondante
  - Asymptotes parallèles à un axe seulement (horizontale ↔ limite finie en ±∞ ; verticale ↔ limite infinie en un point). — _BO Tle spé p.9_ (BO)
- **TSPE-405** — Croissance comparée de $x \mapsto x^n$ et $\exp$ en $+\infty$
  - Démontrer la croissance comparée de x ↦ xⁿ et exp en +∞. — _BO Tle spé p.9_ (BO)
- **TSPE-406** — Asymptotes obliques
  - Asymptotes obliques (approfondissement possible). — _BO Tle spé p.9_ (BO)
- **TSPE-572** — Limite finie ou infinie d'une fonction en $-\infty$
  - Limite finie ou infinie en −∞. — _BO Tle spé p.9_ (BO)
- **TSPE-573** — Limite finie ou infinie d'une fonction en un point
  - Limite finie ou infinie en un point. — _BO Tle spé p.9_ (BO)
- **TSPE-574** — Limites faisant intervenir les fonctions de référence étudiées en classe de première : racine carrée
  - Limites de la racine carrée. — _BO Tle spé p.9_ (BO)
- **TSPE-575** — Limites faisant intervenir les fonctions de référence étudiées en classe de première : fonction exponentielle
  - Limites de l'exponentielle. — _BO Tle spé p.9_ (BO)
- **TSPE-576** — Déterminer dans des cas simples la limite d'une suite, en utilisant les croissances comparées
  - Limite d'une suite, cas simples, par les croissances comparées. — _BO Tle spé p.9_ (BO)
  - Cas simples ; limites usuelles des fonctions de référence de 1re (puissances entières, racine carrée, exponentielle). — _BO Tle spé p.9_ (BO)
  - ⚠ Les fonctions admises au-delà de celles de 1re (ln, sin, cos) sont en question (lts-5).
- **TSPE-577** — Déterminer dans des cas simples la limite d'une suite, en utilisant les opérations sur les limites
  - Limite d'une suite, cas simples, par les opérations sur les limites. — _BO Tle spé p.9_ (BO)
  - Cas simples ; limites usuelles des fonctions de référence de 1re (puissances entières, racine carrée, exponentielle). — _BO Tle spé p.9_ (BO)
  - ⚠ Les fonctions admises au-delà de celles de 1re (ln, sin, cos) sont en question (lts-5).
- **TSPE-578** — Déterminer dans des cas simples la limite d'une suite, en utilisant des majorations, minorations ou encadrements
  - Limite d'une suite, cas simples, par majoration, minoration ou encadrement. — _BO Tle spé p.9_ (BO)
  - Cas simples ; limites usuelles des fonctions de référence de 1re (puissances entières, racine carrée, exponentielle). — _BO Tle spé p.9_ (BO)
  - ⚠ Les fonctions admises au-delà de celles de 1re (ln, sin, cos) sont en question (lts-5).
- **TSPE-579** — Déterminer dans des cas simples la limite d'une suite, en utilisant la factorisation du terme prépondérant dans une somme
  - Limite d'une suite, cas simples, par factorisation du terme prépondérant d'une somme. — _BO Tle spé p.9_ (BO)
  - Cas simples ; limites usuelles des fonctions de référence de 1re (puissances entières, racine carrée, exponentielle). — _BO Tle spé p.9_ (BO)
  - ⚠ Les fonctions admises au-delà de celles de 1re (ln, sin, cos) sont en question (lts-5).
- **TSPE-580** — Déterminer dans des cas simples la limite d'une fonction en un point, en $\pm\infty$, en utilisant les croissances comparées
  - Limite d'une fonction, cas simples, par les croissances comparées. — _BO Tle spé p.9_ (BO)
  - Cas simples ; limites usuelles des fonctions de référence de 1re (puissances entières, racine carrée, exponentielle). — _BO Tle spé p.9_ (BO)
  - ⚠ Les fonctions admises au-delà de celles de 1re (ln, sin, cos) sont en question (lts-5).
- **TSPE-581** — Déterminer dans des cas simples la limite d'une fonction en un point, en $\pm\infty$, en utilisant les opérations sur les limites
  - Limite d'une fonction, cas simples, par les opérations sur les limites (composition en contexte). — _BO Tle spé p.9_ (BO)
  - Cas simples ; limites usuelles des fonctions de référence de 1re (puissances entières, racine carrée, exponentielle). — _BO Tle spé p.9_ (BO)
  - ⚠ Les fonctions admises au-delà de celles de 1re (ln, sin, cos) sont en question (lts-5).
- **TSPE-582** — Déterminer dans des cas simples la limite d'une fonction en un point, en $\pm\infty$, en utilisant des majorations, minorations ou encadrements
  - Limite d'une fonction, cas simples, par majoration, minoration ou encadrement. — _BO Tle spé p.9_ (BO)
  - Cas simples ; limites usuelles des fonctions de référence de 1re (puissances entières, racine carrée, exponentielle). — _BO Tle spé p.9_ (BO)
  - ⚠ Les fonctions admises au-delà de celles de 1re (ln, sin, cos) sont en question (lts-5).
- **TSPE-583** — Déterminer dans des cas simples la limite d'une fonction en un point, en $\pm\infty$, en utilisant la factorisation du terme prépondérant dans une somme
  - Limite d'une fonction, cas simples, par factorisation du terme prépondérant d'une somme. — _BO Tle spé p.9_ (BO)
  - Cas simples ; limites usuelles des fonctions de référence de 1re (puissances entières, racine carrée, exponentielle). — _BO Tle spé p.9_ (BO)
  - ⚠ Les fonctions admises au-delà de celles de 1re (ln, sin, cos) sont en question (lts-5).
- **TSPE-584** — Branches infinies
  - Branches infinies (approfondissement possible). — _BO Tle spé p.9_ (BO)

### Analyse > Primitives, équations différentielles

- **TSPE-461** — Équation différentielle $y' = f$
  - Équation y′ = f, f continue sur un intervalle. — _BO Tle spé p.11_ (BO)
  - Autres équations différentielles (y′ = y², y″ + ω²y = 0) : des solutions peuvent être données, mais aucune connaissance n'est exigible. — _BO Tle spé p.11_ (BO)
- **TSPE-462** — Notion de primitive d'une fonction continue sur un intervalle
  - Primitive d'une fonction continue sur un intervalle (existence admise ici, démontrée en calcul intégral) ; pour certaines fonctions, pas de primitive explicite. — _BO Tle spé p.11_ (BO)
- **TSPE-463** — Primitives des fonctions de référence : $x \mapsto x^n$ pour $n \in \mathbb{Z}$
  - Primitives de x ↦ xⁿ, n ∈ ℤ. — _BO Tle spé p.11_ (BO)
  - ⚠ Cas n = −1 (primitive ln) en question (lts-9).
- **TSPE-464** — Équation différentielle $y' = ay$, où $a$ est un nombre réel
  - y′ = ay avec a réel. — _BO Tle spé p.11_ (BO)
- **TSPE-465** — Allure des courbes des solutions de l'équation différentielle $y' = ay$
  - Allure des courbes des solutions de y′ = ay. — _BO Tle spé p.11_ (BO)
- **TSPE-466** — Équation différentielle $y' = ay + b$
  - y′ = ay + b, a et b réels (a ≠ 0 pour la résolution). — _BO Tle spé p.11_ (BO)
- **TSPE-467** — Calculer une primitive en utilisant les primitives de référence
  - Primitives de référence : xⁿ (n ∈ ℤ), 1/√x, exp, sin, cos. — _BO Tle spé p.11_ (BO)
  - ⚠ Cas n = −1 en question (lts-9).
- **TSPE-468** — Calculer une primitive en utilisant les fonctions de la forme $(v' \circ u) \times u'$
  - Fonctions de la forme (v′ ∘ u) × u′, v primitive de référence. — _BO Tle spé p.11_ (BO)
  - Primitives de référence : xⁿ (n ∈ ℤ), 1/√x, exp, sin, cos. — _BO Tle spé p.11_ (BO)
- **TSPE-469** — Pour une équation différentielle $y' = ay + b$ ($a \neq 0$) : déterminer une solution particulière constante
  - y′ = ay + b avec a ≠ 0 : solution particulière constante. — _BO Tle spé p.11_ (BO)
- **TSPE-470** — Pour une équation différentielle $y' = ay + f$ : à partir de la donnée d'une solution particulière, déterminer toutes les solutions
  - y′ = ay + f : une solution particulière est donnée ; on en déduit toutes les solutions (pas de recherche de la solution particulière exigée). — _BO Tle spé p.11_ (BO)
- **TSPE-471** — Deux primitives d'une même fonction continue sur un intervalle diffèrent d'une constante
  - Démontrer que deux primitives d'une même fonction continue sur un intervalle diffèrent d'une constante. — _BO Tle spé p.11_ (BO)
- **TSPE-472** — Résolution de l'équation différentielle $y' = ay$ où $a$ est un nombre réel
  - Démontrer la résolution de y′ = ay, a réel. — _BO Tle spé p.11_ (BO)
- **TSPE-473** — Autres exemples d'équations différentielles, éventuellement en lien avec une modélisation, par exemple l'équation logistique
  - Autres équations différentielles, par exemple l'équation logistique (approfondissement possible). — _BO Tle spé p.11_ (BO)
  - Autres équations différentielles (y′ = y², y″ + ω²y = 0) : des solutions peuvent être données, mais aucune connaissance n'est exigible. — _BO Tle spé p.11_ (BO)
- **TSPE-474** — Résolution par la méthode d'Euler de $y' = f$, de $y' = ay + b$
  - Méthode d'Euler pour y′ = f et y′ = ay + b seulement. — _BO Tle spé p.11_ (BO)
- **TSPE-602** — Deux primitives d'une même fonction continue sur un intervalle diffèrent d'une constante
  - Deux primitives d'une même fonction continue sur un intervalle diffèrent d'une constante. — _BO Tle spé p.11_ (BO)
- **TSPE-603** — Primitives des fonctions de référence : $x \mapsto \frac{1}{\sqrt{x}}$
  - Primitive de x ↦ 1/√x. — _BO Tle spé p.11_ (BO)
- **TSPE-604** — Primitives des fonctions de référence : exponentielle
  - Primitive de l'exponentielle. — _BO Tle spé p.11_ (BO)
- **TSPE-605** — Primitives des fonctions de référence : sinus
  - Primitive de sinus. — _BO Tle spé p.11_ (BO)
- **TSPE-606** — Primitives des fonctions de référence : cosinus
  - Primitive de cosinus. — _BO Tle spé p.11_ (BO)
- **TSPE-607** — Pour une équation différentielle $y' = ay + b$ ($a \neq 0$) : utiliser une solution particulière constante pour déterminer toutes les solutions
  - y′ = ay + b avec a ≠ 0 : toutes les solutions, à partir de la solution constante. — _BO Tle spé p.11_ (BO)

### Analyse > Suites

- **TSPE-378** — La suite $(u_n)$ tend vers $+\infty$ si tout intervalle de la forme $[A\,;\,+\infty[$ contient toutes les valeurs $u_n$ à partir d'un certain rang
  - Définition de la divergence vers +∞ par les intervalles [A ; +∞[. — _BO Tle spé p.8_ (BO)
- **TSPE-379** — Suite tendant vers $-\infty$
  - Suite tendant vers −∞ (définition symétrique). — _BO Tle spé p.8_ (BO)
- **TSPE-380** — La suite $(u_n)$ converge vers le nombre réel $\ell$ si tout intervalle ouvert contenant $\ell$ contient toutes les valeurs $u_n$ à partir d'un certain rang
  - Convergence vers ℓ réel définie par les intervalles ouverts contenant ℓ. — _BO Tle spé p.8_ (BO)
- **TSPE-381** — Limites et comparaison
  - Théorèmes de comparaison pour les limites de suites. — _BO Tle spé p.8_ (BO)
- **TSPE-382** — Opérations sur les limites
  - Opérations sur les limites de suites (somme, produit, quotient). — _BO Tle spé p.8_ (déduite)
  - ⚠ Lecture déduite : le BO écrit seulement « Opérations sur les limites » ; la liste (somme, produit, quotient) est le contenu usuel de cette expression, la composition étant traitée « en contexte » (p.9).
- **TSPE-383** — Comportement d'une suite géométrique $(q^n)$ où $q$ est un nombre réel
  - Comportement de (qⁿ) pour q réel quelconque (q > 1, q = 1, −1 < q < 1, q ⩽ −1). — _BO Tle spé p.8_ (BO)
- **TSPE-384** — Théorème admis : toute suite croissante majorée (ou décroissante minorée) converge
  - Toute suite croissante majorée (décroissante minorée) converge, théorème admis : il donne l'existence, pas la valeur de la limite. — _BO Tle spé p.8_ (BO)
- **TSPE-385** — Établir la convergence d'une suite, ou sa divergence vers $+\infty$ ou $-\infty$
  - Établir convergence ou divergence vers ±∞ avec les outils de la section : définitions, comparaison, gendarmes, opérations, suites géométriques, monotonie et bornes. — _BO Tle spé p.8-9_ (BO)
- **TSPE-386** — Raisonner par récurrence pour établir une propriété d'une suite — _hérite des bornes générales_
  - ⚠ Point-compétence (raisonner, démontrer, modéliser) sans grain questionnable propre : aucune borne au-delà des bornes générales.
- **TSPE-387** — Étudier des phénomènes d'évolution modélisables par une suite — _hérite des bornes générales_
  - ⚠ Point-compétence (raisonner, démontrer, modéliser) sans grain questionnable propre : aucune borne au-delà des bornes générales.
- **TSPE-388** — Toute suite croissante non majorée tend vers $+\infty$
  - Démontrer : toute suite croissante non majorée tend vers +∞. — _BO Tle spé p.9_ (BO)
- **TSPE-389** — Limite de $(q^n)$, après démonstration par récurrence de l'inégalité de Bernoulli
  - Démontrer la limite de (qⁿ) pour q > 1 après l'inégalité de Bernoulli (1 + a)ⁿ ⩾ 1 + na, démontrée par récurrence. — _BO Tle spé p.9_ (déduite)
  - ⚠ Lecture déduite : le BO écrit « Limite de (qⁿ), après démonstration par récurrence de l'inégalité de Bernoulli » ; la forme (1 + a)ⁿ ⩾ 1 + na et le cas q > 1 sont ceux que cette inégalité permet de traiter.
- **TSPE-390** — Divergence vers $+\infty$ d'une suite minorée par une suite divergeant vers $+\infty$
  - Démontrer : une suite minorée par une suite divergeant vers +∞ diverge vers +∞. — _BO Tle spé p.9_ (BO)
- **TSPE-391** — Limite en $+\infty$ et en $-\infty$ de la fonction exponentielle
  - Démontrer les limites de exp en +∞ et en −∞. — _BO Tle spé p.9_ (BO)
- **TSPE-392** — Recherche de seuils
  - Recherche de seuils (algorithme). — _BO Tle spé p.9_ (BO)
- **TSPE-393** — Recherche de valeurs approchées de $\pi$, $e$, $\sqrt{2}$, $\frac{1 + \sqrt{5}}{2}$, $\ln(2)$, etc.
  - Valeurs approchées de π, e, √2, (1 + √5)/2, ln(2), etc. par des suites. — _BO Tle spé p.9_ (BO)
- **TSPE-394** — Propriétés et utilisation des suites adjacentes
  - Suites adjacentes (approfondissement possible). — _BO Tle spé p.9_ (BO)
- **TSPE-395** — Exemples de suites vérifiant une relation de récurrence linéaire d'ordre 2 à coefficients constants
  - Récurrence linéaire d'ordre 2 à coefficients constants : exemples seulement (approfondissement possible). — _BO Tle spé p.9_ (BO)
- **TSPE-396** — Exemples d'application de la méthode de Newton
  - Exemples d'application de la méthode de Newton (approfondissement possible). — _BO Tle spé p.9_ (BO)
- **TSPE-569** — Suite tendant vers $+\infty$ : cas des suites croissantes non majorées
  - Suite croissante non majorée ⇒ limite +∞. — _BO Tle spé p.8_ (BO)
- **TSPE-570** — Théorèmes des gendarmes
  - Théorème des gendarmes. — _BO Tle spé p.8_ (BO)
- **TSPE-571** — Étude de la convergence de la méthode de Héron
  - Convergence de la méthode de Héron (approfondissement possible). — _BO Tle spé p.9_ (BO)

### Probabilités > Concentration, loi des grands nombres

- **TSPE-530** — Inégalité de Bienaymé-Tchebychev. Pour une variable aléatoire $X$ d'espérance $\mu$ et de variance $V$, et quel que soit le réel strictement positif $\delta$ : $P(\lvert X - \mu \rvert \geqslant \delta) \leqslant \frac{V(X)}{\delta^2}$
  - P(|X − μ| ⩾ δ) ⩽ V(X)/δ² pour δ > 0. — _BO Tle spé p.14_ (BO)
- **TSPE-531** — Inégalité de concentration. Si $M_n$ est la variable aléatoire moyenne d'un échantillon de taille $n$ d'une variable aléatoire d'espérance $\mu$ et de variance $V$, alors pour tout $\delta > 0$, $P(\lvert M_n - \mu \rvert \geqslant \delta) \leqslant \frac{V}{n\delta^2}$
  - P(|Mₙ − μ| ⩾ δ) ⩽ V/(nδ²) pour δ > 0. — _BO Tle spé p.14_ (BO)
- **TSPE-532** — Loi des grands nombres
  - Loi des grands nombres. — _BO Tle spé p.14_ (BO)
- **TSPE-533** — Appliquer l'inégalité de Bienaymé-Tchebychev pour définir une taille d'échantillon, en fonction de la précision et du risque choisi
  - Taille d'échantillon déterminée par l'inégalité de Bienaymé-Tchebychev (ou de concentration), en fonction de la précision et du risque. — _BO Tle spé p.14_ (BO)
- **TSPE-534** — Calculer la probabilité de $(\lvert S_n - pn \rvert > \sqrt{n})$, où $S_n$ est une variable aléatoire qui suit une loi binomiale $\mathcal{B}(n, p)$
  - Calcul de P(|Sₙ − pn| > √n), Sₙ de loi B(n, p). — _BO Tle spé p.14_ (BO)
- **TSPE-535** — Simulation d'une marche aléatoire
  - Simulation d'une marche aléatoire. — _BO Tle spé p.14_ (BO)
- **TSPE-536** — Simuler $N$ échantillons de taille $n$ d'une variable aléatoire d'espérance $\mu$ et d'écart type $\sigma$. Calculer l'écart type $s$ de la série des moyennes des échantillons observés, à comparer à $\frac{\sigma}{\sqrt{n}}$. Calculer la proportion des échantillons pour lesquels l'écart entre la moyenne et $\mu$ est inférieur ou égal à $ks$, ou à $k\frac{\sigma}{\sqrt{n}}$, pour $k = 1, 2, 3$
  - k = 1, 2, 3. — _BO Tle spé p.14_ (BO)
- **TSPE-537** — Estimation — _hérite des bornes générales_
  - ⚠ Approfondissement nommé d'un seul mot (« Estimation ») sans contenu détaillé dans le BO : aucune borne textuelle au-delà des bornes générales.
- **TSPE-538** — Marche aléatoire — _hérite des bornes générales_
  - ⚠ Approfondissement nommé d'un seul mot (« Marche aléatoire ») sans contenu détaillé dans le BO : aucune borne textuelle au-delà des bornes générales.
- **TSPE-539** — Exemples d'application issus d'autres disciplines pour diverses valeurs de $n$ : sondage (par exemple $n = 1\,000$), étude du sex ratio (par exemple $n = 10^6$), demi-vie d'atomes radioactifs ($n = 10^{23}$)
  - Exemples : sondage (n = 1 000), sex ratio (n = 10⁶), demi-vie d'atomes radioactifs (n = 10²³) (approfondissement possible). — _BO Tle spé p.14_ (BO)
- **TSPE-624** — Comparer la probabilité de $(\lvert S_n - pn \rvert > \sqrt{n})$ avec l'inégalité de Bienaymé-Tchebychev
  - Comparaison de P(|Sₙ − pn| > √n) avec la majoration de Bienaymé-Tchebychev. — _BO Tle spé p.14_ (BO)

### Probabilités > Sommes de variables aléatoires

- **TSPE-518** — Somme de deux variables aléatoires
  - Somme de deux variables aléatoires (finies). — _BO Tle spé p.14_ (BO)
- **TSPE-519** — Linéarité de l'espérance : $E(X + Y) = E(X) + E(Y)$ et $E(aX) = aE(X)$
  - E(X + Y) = E(X) + E(Y) et E(aX) = aE(X), pour des variables quelconques. — _BO Tle spé p.13-14_ (BO)
- **TSPE-520** — Dans le cadre de la succession d'épreuves indépendantes, exemples de variables indépendantes $X$, $Y$ et relation d'additivité $V(X + Y) = V(X) + V(Y)$
  - V(X + Y) = V(X) + V(Y), admise, pour X, Y indépendantes issues d'une succession d'épreuves indépendantes. — _BO Tle spé p.13-14_ (BO)
- **TSPE-521** — Relation $V(aX) = a^2V(X)$
  - V(aX) = a²V(X). — _BO Tle spé p.14_ (BO)
- **TSPE-522** — Application à l'espérance de la loi binomiale
  - Espérance de la loi binomiale (np). — _BO Tle spé p.14_ (BO)
- **TSPE-523** — Échantillon de taille $n$ d'une loi de probabilité : liste $(X_1, \ldots, X_n)$ de variables indépendantes identiques suivant cette loi
  - Échantillon = liste de variables indépendantes de même loi. — _BO Tle spé p.14_ (BO)
- **TSPE-524** — Espérance de la somme $S_n = X_1 + \cdots + X_n$ et de la moyenne $M_n = \frac{S_n}{n}$
  - E(Sₙ) et E(Mₙ) pour un échantillon de taille n. — _BO Tle spé p.14_ (BO)
- **TSPE-525** — Représenter une variable comme somme de variables aléatoires plus simples
  - Décomposer une variable en somme de variables plus simples (ex. nombre de succès = somme de variables de Bernoulli). — _BO Tle spé p.13-14_ (BO)
- **TSPE-526** — Calculer l'espérance d'une variable aléatoire, notamment en utilisant la propriété de linéarité
  - Espérance, notamment par linéarité (sans déterminer la loi). — _BO Tle spé p.12 ; p.14_ (BO)
- **TSPE-527** — Calculer la variance d'une variable aléatoire, notamment en l'exprimant comme somme de variables aléatoires indépendantes
  - Variance, notamment par somme de variables indépendantes. — _BO Tle spé p.14_ (BO)
- **TSPE-528** — Espérance de la loi binomiale (démonstration)
  - Démontrer E(X) = np pour X de loi binomiale. — _BO Tle spé p.14_ (BO)
- **TSPE-529** — Relation $E(XY) = E(X)E(Y)$ pour des variables aléatoires indépendantes $X$, $Y$. Application à la variance de $X + Y$
  - E(XY) = E(X)E(Y) pour X, Y indépendantes et application à V(X + Y) (approfondissement possible, pas un attendu). — _BO Tle spé p.13-14_ (BO)
- **TSPE-621** — Application à la variance et l'écart type de la loi binomiale
  - Variance et écart type de la loi binomiale (np(1 − p), √(np(1 − p))). — _BO Tle spé p.14_ (BO)
- **TSPE-622** — Variance, écart type de la somme $S_n = X_1 + \cdots + X_n$ et de la moyenne $M_n = \frac{S_n}{n}$
  - V et σ de Sₙ et de Mₙ pour un échantillon de taille n. — _BO Tle spé p.14_ (BO)
- **TSPE-623** — Variance de la loi binomiale (démonstration)
  - Démontrer V(X) = np(1 − p) pour X de loi binomiale. — _BO Tle spé p.14_ (BO)

### Probabilités > Succession d'épreuves indépendantes, schéma de Bernoulli

- **TSPE-501** — Modèle de la succession d'épreuves indépendantes : la probabilité d'une issue $(x_1, \ldots, x_n)$ est égale au produit des probabilités des composantes $x_i$
  - Probabilité d'une issue (x₁, …, xₙ) = produit des probabilités des composantes (épreuves indépendantes). — _BO Tle spé p.13_ (BO)
- **TSPE-502** — Épreuve de Bernoulli, loi de Bernoulli
  - Épreuve à deux issues, loi de Bernoulli. — _BO Tle spé p.13_ (BO)
- **TSPE-503** — Schéma de Bernoulli : répétition de $n$ épreuves de Bernoulli indépendantes
  - n épreuves de Bernoulli identiques et indépendantes (n quelconque ; en 1re, n ⩽ 4). — _BO Tle spé p.12-13_ (BO)
- **TSPE-504** — Loi binomiale $\mathcal{B}(n, p)$ : loi du nombre de succès
  - Loi binomiale B(n, p) : loi du nombre de succès. — _BO Tle spé p.13_ (BO)
- **TSPE-505** — Modéliser une situation par une succession d'épreuves indépendantes
  - Succession d'épreuves indépendantes, en nombre quelconque. — _BO Tle spé p.12-13_ (BO)
- **TSPE-506** — Représenter la situation par un arbre
  - Arbre pondéré. — _BO Tle spé p.13_ (BO)
- **TSPE-507** — Calculer une probabilité en utilisant l'indépendance
  - Probabilité calculée par l'indépendance. — _BO Tle spé p.13_ (BO)
- **TSPE-508** — Modéliser une situation par un schéma de Bernoulli
  - Modélisation par un schéma de Bernoulli. — _BO Tle spé p.13_ (BO)
- **TSPE-509** — Utiliser l'expression de la loi binomiale pour résoudre un problème de seuil, de comparaison, d'optimisation relatif à des probabilités de nombre de succès
  - Problèmes de seuil, de comparaison, d'optimisation sur des probabilités de nombre de succès, par l'expression de la loi binomiale. — _BO Tle spé p.13_ (BO)
- **TSPE-510** — Dans le cadre d'une résolution de problème modélisé par une variable binomiale $X$, calculer numériquement une probabilité du type $P(X = k)$, en s'aidant au besoin d'un algorithme
  - P(X = k). — _BO Tle spé p.13_ (BO)
  - Calcul numérique (calculatrice ou algorithme au besoin). — _BO Tle spé p.13_ (BO)
- **TSPE-511** — Dans le cadre d'une résolution de problème modélisé par une variable binomiale $X$, chercher un intervalle $I$ pour lequel la probabilité $P(X \in I)$ est inférieure à une valeur donnée $\alpha$, ou supérieure à $1 - \alpha$
  - Intervalle I tel que P(X ∈ I) soit inférieure à α, ou supérieure à 1 − α. — _BO Tle spé p.13_ (BO)
  - Calcul numérique (calculatrice ou algorithme au besoin). — _BO Tle spé p.13_ (BO)
- **TSPE-512** — Expression de la probabilité de $k$ succès dans le schéma de Bernoulli
  - Démontrer P(X = k) = C(n, k) pᵏ (1 − p)ⁿ⁻ᵏ dans le schéma de Bernoulli. — _BO Tle spé p.13_ (BO)
- **TSPE-513** — Simulation de la planche de Galton
  - Simulation de la planche de Galton. — _BO Tle spé p.13_ (BO)
- **TSPE-514** — Problème de la surréservation. Étant donné une variable aléatoire binomiale $X$ et un réel strictement positif $\alpha$, détermination du plus petit entier $k$ tel que $P(X > k) \leqslant \alpha$
  - Plus petit entier k tel que P(X > k) ⩽ α, X binomiale, α > 0. — _BO Tle spé p.13_ (BO)
- **TSPE-515** — Simulation d'un échantillon d'une variable aléatoire
  - Simulation d'un échantillon d'une variable aléatoire. — _BO Tle spé p.13_ (BO)
- **TSPE-516** — Loi géométrique
  - Loi géométrique (approfondissement possible). — _BO Tle spé p.13_ (BO)
- **TSPE-517** — Introduction de la loi de Poisson comme limite de lois binomiales. Interprétation (évènements rares)
  - Loi de Poisson comme limite de lois binomiales, évènements rares (approfondissement possible). — _BO Tle spé p.13_ (BO)
- **TSPE-612** — Modèle de la succession d'épreuves indépendantes : représentation par un produit cartésien
  - Représentation par un produit cartésien (univers {0, 1}ⁿ ou {a, b}ⁿ pour Bernoulli). — _BO Tle spé p.12-13_ (BO)
- **TSPE-613** — Modèle de la succession d'épreuves indépendantes : représentation par un arbre
  - Représentation par un arbre. — _BO Tle spé p.13_ (BO)
- **TSPE-614** — Loi binomiale $\mathcal{B}(n, p)$ : expression à l'aide des coefficients binomiaux
  - P(X = k) exprimée avec les coefficients binomiaux. — _BO Tle spé p.13_ (BO)
- **TSPE-615** — Modéliser une situation par une succession de deux ou trois épreuves quelconques
  - Épreuves non indépendantes : deux ou trois épreuves seulement. — _BO Tle spé p.13_ (BO)
- **TSPE-616** — Calculer une probabilité en utilisant des probabilités conditionnelles
  - Probabilité calculée par des probabilités conditionnelles. — _BO Tle spé p.13_ (BO)
- **TSPE-617** — Calculer une probabilité en utilisant la formule des probabilités totales
  - Probabilité calculée par la formule des probabilités totales. — _BO Tle spé p.13_ (BO)
- **TSPE-618** — Modéliser une situation par une loi binomiale
  - Modélisation par une loi binomiale. — _BO Tle spé p.13_ (BO)
- **TSPE-619** — Dans le cadre d'une résolution de problème modélisé par une variable binomiale $X$, calculer numériquement une probabilité du type $P(X \leqslant k)$, en s'aidant au besoin d'un algorithme
  - P(X ⩽ k). — _BO Tle spé p.13_ (BO)
  - Calcul numérique (calculatrice ou algorithme au besoin). — _BO Tle spé p.13_ (BO)
- **TSPE-620** — Dans le cadre d'une résolution de problème modélisé par une variable binomiale $X$, calculer numériquement une probabilité du type $P(k \leqslant X \leqslant k')$, en s'aidant au besoin d'un algorithme
  - P(k ⩽ X ⩽ k′). — _BO Tle spé p.13_ (BO)
  - Calcul numérique (calculatrice ou algorithme au besoin). — _BO Tle spé p.13_ (BO)

### Vocabulaire ensembliste et logique

- **TSPE-301** — Notion de couple, de triplet et plus généralement de $n$-uplet
  - Couple, triplet, n-uplet (k-uplet ou k-liste), y compris pour des ensembles quelconques. — _BO Tle spé p.4-5_ (BO)
- **TSPE-302** — Formuler la négation de propositions simples, pouvant contenir un ou deux quantificateurs
  - Négation de propositions simples contenant au plus deux quantificateurs ; les symboles ∀ et ∃ ne sont pas exigibles. — _BO Tle spé p.4_ (BO)
- **TSPE-303** — Raisonner par équivalence, utiliser une propriété caractéristique — _hérite des bornes générales_
  - ⚠ Point-compétence (raisonner, démontrer, modéliser) sans grain questionnable propre : aucune borne au-delà des bornes générales.
- **TSPE-304** — Démontrer une propriété par récurrence — _hérite des bornes générales_
  - ⚠ Point-compétence (raisonner, démontrer, modéliser) sans grain questionnable propre : aucune borne au-delà des bornes générales.
- **TSPE-540** — Notion de produit cartésien
  - Produit cartésien de deux, trois, k ensembles ; ensemble Aᵏ des k-uplets d'éléments de A. — _BO Tle spé p.4-5_ (BO)
