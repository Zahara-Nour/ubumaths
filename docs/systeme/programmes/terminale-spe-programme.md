---
couvre:
  - 'supabase/migrations/*_seed_curriculum_terminale_spe.sql'
  - 'supabase/migrations/*_seed_curriculum_points_tspe.sql'
---

# Programme de suivi terminale spécialité maths — Thème → Objectif → Point (à relire)

> **But** : **amorçage** du référentiel de programme (tables `curriculum_*`), grade `'T_SPE'`.
> ⚠️ **Ce fichier ne fait plus foi une fois le niveau amorcé** : la page **Programme** (`/dashboard/teacher/programme`) prend le relais. Le corriger ici ne produit plus rien — cf. le référentiel de 1ʳᵉ, même règle.
> **Source** : « Programme de spécialité de mathématiques de la classe terminale de la voie générale » — PDF fourni par David le 2026-10-03.
>
> **Statut** : relu et validé par David le 2026-10-03, **amorcé en production** (#748, #749). La page Programme fait foi désormais.
>
> L'ordre suit celui du sommaire du BO. Les rubriques **« Objectifs »** et **« Histoire des mathématiques »** du BO sont des textes d'intention destinés au professeur : elles ne donnent **aucun point**. Le programme de terminale ne comporte pas de partie « Automatismes ».

---

## Convention de tags

Identique à celle de 1ʳᵉ spé — les tags encodent les rubriques du BO, on ne les invente pas.

| Tag     | `kind`          | `exigence`          | Rubrique du BO                                                |
| ------- | --------------- | ------------------- | ------------------------------------------------------------- |
| `[C]`   | `connaissance`  | `attendu`           | **Contenus**                                                  |
| `[SF]`  | `savoir_faire`  | `attendu`           | **Capacités attendues**                                       |
| `[D]`   | `demonstration` | `attendu`           | **Démonstrations**                                            |
| `[SF+]` | `savoir_faire`  | `approfondissement` | **Approfondissements possibles** et **Exemples d'algorithme** |

### Écriture des mathématiques

LaTeX entre `$…$`, rendu par MathLive. Trois règles :

- **Seules les commandes connues de MathLive.** Le générateur refuse le fichier sinon, en nommant les points fautifs — une commande inconnue s'afficherait en clair à l'élève. Notamment `\ldots` ou `\cdots`, jamais `\dots` ; `\vec{AB}` et non `\overrightarrow{AB}`.
- **Jamais deux formules collées** : `$x$$y$` est ambigu pour le parser ubumark.
- **Pas de maths d'affichage** (`$$…$$`) : un point est une ligne, pas un paragraphe.

Les backticks sont réservés au **code** du point.

### Grain de suivi

Quand une puce du BO enchaîne deux gestes qu'un élève peut réussir séparément, elle est **coupée** — convention établie par la relecture de 1ʳᵉ spé du 2026-08-30. « Calculer la distance entre deux points. Calculer les coordonnées du milieu d'un segment. » en fait deux.

Quand une même phrase du BO donnerait un contenu et une démonstration de libellé identique, la démonstration est suffixée « (démonstration) » — même règle que la formule d'Al-Kashi en 1ʳᵉ : deux points d'un même objectif ne peuvent pas porter le même libellé.

---

## 1. Vocabulaire ensembliste et logique

> Le BO rédige cette partie en prose continue, sans rubriques. Le découpage en points est donc **interprétatif** — écart assumé, identique à celui de 2de et de 1ʳᵉ spé.

### 1.1 Ensembles

- [C] `TSPE-001` Notions d'élément d'un ensemble, de sous-ensemble, d'ensemble vide, d'appartenance et d'inclusion, de réunion, d'intersection et de complémentaire
- [C] `TSPE-002` Symboles de base correspondants : $\varnothing$, $\in$, $\subset$, $\cap$, $\cup$, $\{\,\ldots\,\}$
- [C] `TSPE-003` Notation des ensembles de nombres et des intervalles
- [C] `TSPE-004` Notion de couple, de triplet et plus généralement de $n$-uplet et celle de produit cartésien
- [C] `TSPE-005` Notation du complémentaire d'un sous-ensemble $A$ de $E$ : $\bar{A}$ (notation des probabilités) ou $E \setminus A$
- [C] `TSPE-006` Notation $\operatorname{Card}(A)$ pour le cardinal (nombre d'éléments) d'un ensemble fini $A$
- [C] `TSPE-007` Notion de bijection, rencontrée en analyse, en géométrie (notamment bijection entre le plan et $\mathbb{R}^2$, l'espace et $\mathbb{R}^3$), en dénombrement
- [C] `TSPE-008` Composition de deux fonctions, utilisée principalement dans le cadre des fonctions d'une variable réelle
- [C] `TSPE-009` Symbole de somme $\sum$ pour écrire certaines expressions de façon concise (sa manipulation pour démontrer des égalités n'est pas un objectif du programme)

### 1.2 Logique et raisonnement

- [SF] `TSPE-010` Reconnaitre ce qu'est une proposition mathématique
- [SF] `TSPE-011` Utiliser des variables pour écrire des propositions mathématiques
- [SF] `TSPE-012` Lire et écrire des propositions contenant les connecteurs « et », « ou »
- [SF] `TSPE-013` Formuler la négation de propositions simples, pouvant contenir un ou deux quantificateurs
- [SF] `TSPE-014` Mobiliser un contre-exemple pour montrer qu'une proposition est fausse
- [SF] `TSPE-015` Formuler une implication, une équivalence logique, et les mobiliser dans un raisonnement simple
- [SF] `TSPE-016` Formuler la réciproque d'une implication, ou sa contraposée
- [SF] `TSPE-017` Lire et écrire des propositions contenant une quantification universelle ou existentielle (les symboles $\forall$ et $\exists$ ne sont pas exigibles)
- [SF] `TSPE-018` Raisonner par disjonctions des cas
- [SF] `TSPE-019` Raisonner par l'absurde
- [SF] `TSPE-020` Raisonner par contraposée
- [SF] `TSPE-021` Raisonner par équivalence
- [SF] `TSPE-022` Utiliser une propriété caractéristique
- [SF] `TSPE-023` Distinguer condition nécessaire et condition suffisante
- [SF] `TSPE-024` Démontrer une propriété par récurrence

---

## 2. Algorithmique et programmation

> Le BO de terminale reprend ceux de seconde et de première « sans introduire de notion nouvelle ». Seule la notion de liste y porte une rubrique « Capacités attendues » ; le reste est en prose et ne donne pas de point, comme en 1ʳᵉ.

### 2.1 Notion de liste

- [C] `TSPE-025` Génération des listes en compréhension et en extension, en lien avec la notion d'ensemble

- [SF] `TSPE-026` Générer une liste (en extension, par ajouts successifs ou en compréhension)
- [SF] `TSPE-027` Manipuler des éléments d'une liste (ajouter, supprimer, etc.) et leurs indices
- [SF] `TSPE-028` Parcourir une liste
- [SF] `TSPE-029` Itérer sur les éléments d'une liste

---

## 3. Algèbre et géométrie

### 3.1 Combinatoire et dénombrement

> Les ensembles considérés sont finis, mais on introduit dans le cas général les notions de couple, triplet, $k$-uplet (ou $k$-liste) ; produit cartésien de deux, trois, $k$ ensembles ; ensemble $A^k$ des $k$-uplets d'éléments d'un ensemble $A$.

- [C] `TSPE-030` Principe additif : nombre d'éléments d'une réunion d'ensembles deux à deux disjoints
- [C] `TSPE-031` Principe multiplicatif : nombre d'éléments d'un produit cartésien
- [C] `TSPE-032` Nombre de $k$-uplets (ou $k$-listes) d'un ensemble à $n$ éléments
- [C] `TSPE-033` Nombre des parties d'un ensemble à $n$ éléments. Lien avec les $n$-uplets de $\{0, 1\}$, les mots de longueur $n$ sur un alphabet à deux éléments, les chemins dans un arbre, les issues dans une succession de $n$ épreuves de Bernoulli
- [C] `TSPE-034` Nombre des $k$-uplets d'éléments distincts d'un ensemble à $n$ éléments
- [C] `TSPE-035` Définition de $n!$
- [C] `TSPE-036` Nombre de permutations d'un ensemble fini à $n$ éléments
- [C] `TSPE-037` Combinaisons de $k$ éléments d'un ensemble à $n$ éléments : parties à $k$ éléments de l'ensemble. Représentation en termes de mots ou de chemins
- [C] `TSPE-038` Pour $0 \leqslant k \leqslant n$, formules : $\binom{n}{k} = \frac{n(n-1)\cdots(n-k+1)}{k!} = \frac{n!}{(n-k)!\,k!}$
- [C] `TSPE-039` Explicitation pour $k = 0, 1, 2$
- [C] `TSPE-040` Symétrie
- [C] `TSPE-041` Relation et triangle de Pascal

- [SF] `TSPE-042` Dans le cadre d'un problème de dénombrement, utiliser une représentation adaptée (ensembles, arbres, tableaux, diagrammes)
- [SF] `TSPE-043` Dans le cadre d'un problème de dénombrement, reconnaitre les objets à dénombrer
- [SF] `TSPE-044` Effectuer des dénombrements simples dans des situations issues de divers domaines scientifiques (informatique, génétique, théorie des jeux, probabilités, etc.)

- [D] `TSPE-045` Démonstration par dénombrement de la relation : $\sum_{k=0}^{n} \binom{n}{k} = 2^n$
- [D] `TSPE-046` Démonstrations de la relation de Pascal (par le calcul, par une méthode combinatoire)

- [SF+] `TSPE-047` Combinaisons avec répétitions
- [SF+] `TSPE-048` Pour un entier $n$ donné, génération de la liste des coefficients $\binom{n}{k}$ à l'aide de la relation de Pascal
- [SF+] `TSPE-049` Génération des permutations d'un ensemble fini, ou tirage aléatoire d'une permutation
- [SF+] `TSPE-050` Génération des parties à 2, 3 éléments d'un ensemble fini

### 3.2 Manipulation des vecteurs, des droites et des plans de l'espace

- [C] `TSPE-051` Vecteurs de l'espace. Translations
- [C] `TSPE-052` Combinaisons linéaires de vecteurs de l'espace
- [C] `TSPE-053` Droites de l'espace. Vecteurs directeurs d'une droite. Vecteurs colinéaires
- [C] `TSPE-054` Caractérisation d'une droite par un point et un vecteur directeur
- [C] `TSPE-055` Plans de l'espace. Direction d'un plan de l'espace
- [C] `TSPE-056` Caractérisation d'un plan de l'espace par un point et un couple de vecteurs non colinéaires
- [C] `TSPE-057` Bases et repères de l'espace
- [C] `TSPE-058` Décomposition d'un vecteur sur une base

- [SF] `TSPE-059` Représenter des combinaisons linéaires de vecteurs donnés
- [SF] `TSPE-060` Exploiter une figure pour exprimer un vecteur comme combinaison linéaire de vecteurs
- [SF] `TSPE-061` Décrire la position relative de deux droites, d'une droite et d'un plan, de deux plans
- [SF] `TSPE-062` Lire sur une figure si deux vecteurs d'un plan, trois vecteurs de l'espace, forment une base
- [SF] `TSPE-063` Lire sur une figure la décomposition d'un vecteur dans une base
- [SF] `TSPE-064` Étudier géométriquement des problèmes simples de configurations dans l'espace (alignement, colinéarité, parallélisme, coplanarité)

- [SF+] `TSPE-065` Barycentre d'une famille d'un système pondéré de deux, trois ou quatre points
- [SF+] `TSPE-066` Exemples d'utilisation des barycentres, en particulier de la propriété d'associativité, pour résoudre des problèmes de géométrie
- [SF+] `TSPE-067` Fonction vectorielle de Leibniz

### 3.3 Orthogonalité et distances dans l'espace

- [C] `TSPE-068` Produit scalaire de deux vecteurs de l'espace. Bilinéarité, symétrie
- [C] `TSPE-069` Orthogonalité de deux vecteurs. Caractérisation par le produit scalaire
- [C] `TSPE-070` Base orthonormée, repère orthonormé
- [C] `TSPE-071` Coordonnées d'un vecteur dans une base orthonormée. Expressions du produit scalaire et de la norme
- [C] `TSPE-072` Expression de la distance entre deux points
- [C] `TSPE-073` Développement de $\|\vec{u} + \vec{v}\|^2$, formules de polarisation
- [C] `TSPE-074` Orthogonalité de deux droites, d'un plan et d'une droite
- [C] `TSPE-075` Vecteur normal à un plan. Étant donnés un point $A$ et un vecteur non nul $\vec{n}$, plan passant par $A$ et normal à $\vec{n}$
- [C] `TSPE-076` Projeté orthogonal d'un point sur une droite, sur un plan
- [C] `TSPE-077` Plans perpendiculaires. Caractérisation par des vecteurs normaux

- [SF] `TSPE-078` Utiliser le produit scalaire pour démontrer une orthogonalité
- [SF] `TSPE-079` Utiliser le produit scalaire pour démontrer la perpendicularité de deux plans
- [SF] `TSPE-080` Utiliser le produit scalaire pour calculer un angle
- [SF] `TSPE-081` Utiliser le produit scalaire pour calculer une longueur dans l'espace
- [SF] `TSPE-082` Utiliser la projection orthogonale pour déterminer la distance d'un point à une droite ou à un plan
- [SF] `TSPE-083` Résoudre des problèmes impliquant des grandeurs et mesures : longueur, angle, aire, volume
- [SF] `TSPE-084` Étudier des problèmes de configuration dans l'espace : orthogonalité de deux droites, d'une droite et d'un plan
- [SF] `TSPE-085` Étudier des problèmes de configuration dans l'espace : lieux géométriques simples, par exemple plan médiateur de deux points

- [D] `TSPE-086` Le projeté orthogonal d'un point $M$ sur un plan $\mathcal{P}$ est le point de $\mathcal{P}$ le plus proche de $M$

- [SF+] `TSPE-087` Intersection d'une sphère et d'un plan
- [SF+] `TSPE-088` Plan tangent à une sphère en un point
- [SF+] `TSPE-089` Sphère circonscrite à un tétraèdre
- [SF+] `TSPE-090` Fonction scalaire de Leibniz

### 3.4 Représentations paramétriques et équations cartésiennes

> Le repère est supposé orthonormé.

- [C] `TSPE-091` Représentation paramétrique d'une droite
- [C] `TSPE-092` Équation cartésienne d'un plan

- [SF] `TSPE-093` Déterminer une représentation paramétrique d'une droite
- [SF] `TSPE-094` Reconnaitre une droite donnée par une représentation paramétrique
- [SF] `TSPE-095` Déterminer l'équation cartésienne d'un plan dont on connait un vecteur normal et un point
- [SF] `TSPE-096` Reconnaitre un plan donné par une équation cartésienne et préciser un vecteur normal à ce plan
- [SF] `TSPE-097` Déterminer les coordonnées du projeté orthogonal d'un point sur un plan donné par une équation cartésienne
- [SF] `TSPE-098` Déterminer les coordonnées du projeté orthogonal d'un point sur une droite donnée par un point et un vecteur directeur
- [SF] `TSPE-099` Dans un cadre géométrique repéré, traduire par un système d'équations linéaires des problèmes de types suivants : décider si trois vecteurs forment une base, déterminer les coordonnées d'un vecteur dans une base, étudier une configuration dans l'espace (alignement, colinéarité, parallélisme, coplanarité, intersection et orthogonalité de droites ou de plans), etc.
- [SF] `TSPE-100` Dans des cas simples, résoudre le système obtenu et interpréter géométriquement les solutions

- [D] `TSPE-101` Équation cartésienne du plan normal au vecteur $\vec{n}$ et passant par le point $A$

- [SF+] `TSPE-102` Déterminer l'intersection de deux plans
- [SF+] `TSPE-103` Déterminer un vecteur orthogonal à deux vecteurs non colinéaires
- [SF+] `TSPE-104` Équation d'une sphère dont on connait le centre et le rayon
- [SF+] `TSPE-105` Intersection d'une sphère et d'une droite

---

## 4. Analyse

### 4.1 Suites

- [C] `TSPE-106` La suite $(u_n)$ tend vers $+\infty$ si tout intervalle de la forme $[A\,;\,+\infty[$ contient toutes les valeurs $u_n$ à partir d'un certain rang. Cas des suites croissantes non majorées
- [C] `TSPE-107` Suite tendant vers $-\infty$
- [C] `TSPE-108` La suite $(u_n)$ converge vers le nombre réel $\ell$ si tout intervalle ouvert contenant $\ell$ contient toutes les valeurs $u_n$ à partir d'un certain rang
- [C] `TSPE-109` Limites et comparaison. Théorèmes des gendarmes
- [C] `TSPE-110` Opérations sur les limites
- [C] `TSPE-111` Comportement d'une suite géométrique $(q^n)$ où $q$ est un nombre réel
- [C] `TSPE-112` Théorème admis : toute suite croissante majorée (ou décroissante minorée) converge

- [SF] `TSPE-113` Établir la convergence d'une suite, ou sa divergence vers $+\infty$ ou $-\infty$
- [SF] `TSPE-114` Raisonner par récurrence pour établir une propriété d'une suite
- [SF] `TSPE-115` Étudier des phénomènes d'évolution modélisables par une suite

- [D] `TSPE-116` Toute suite croissante non majorée tend vers $+\infty$
- [D] `TSPE-117` Limite de $(q^n)$, après démonstration par récurrence de l'inégalité de Bernoulli
- [D] `TSPE-118` Divergence vers $+\infty$ d'une suite minorée par une suite divergeant vers $+\infty$
- [D] `TSPE-119` Limite en $+\infty$ et en $-\infty$ de la fonction exponentielle

- [SF+] `TSPE-120` Recherche de seuils
- [SF+] `TSPE-121` Recherche de valeurs approchées de $\pi$, $e$, $\sqrt{2}$, $\frac{1 + \sqrt{5}}{2}$, $\ln(2)$, etc.
- [SF+] `TSPE-122` Propriétés et utilisation des suites adjacentes
- [SF+] `TSPE-123` Exemples de suites vérifiant une relation de récurrence linéaire d'ordre 2 à coefficients constants
- [SF+] `TSPE-124` Exemples d'application de la méthode de Newton
- [SF+] `TSPE-125` Étude de la convergence de la méthode de Héron

### 4.2 Limites des fonctions

> Les opérations sur les limites sont admises. L'utilisation de la composition des limites se fait en contexte.

- [C] `TSPE-126` Limite finie ou infinie d'une fonction en $+\infty$, en $-\infty$, en un point
- [C] `TSPE-127` Asymptote parallèle à un axe de coordonnées
- [C] `TSPE-128` Limites faisant intervenir les fonctions de référence étudiées en classe de première : puissances entières, racine carrée, fonction exponentielle
- [C] `TSPE-129` Limites et comparaison
- [C] `TSPE-130` Opérations sur les limites

- [SF] `TSPE-131` Déterminer dans des cas simples la limite d'une suite ou d'une fonction en un point, en $\pm\infty$, en utilisant les limites usuelles, les croissances comparées, les opérations sur les limites, des majorations, minorations ou encadrements, la factorisation du terme prépondérant dans une somme
- [SF] `TSPE-132` Faire le lien entre l'existence d'une asymptote parallèle à un axe et celle de la limite correspondante

- [D] `TSPE-133` Croissance comparée de $x \mapsto x^n$ et $\exp$ en $+\infty$

- [SF+] `TSPE-134` Asymptotes obliques
- [SF+] `TSPE-135` Branches infinies

### 4.3 Compléments sur la dérivation

- [C] `TSPE-136` Composée de deux fonctions, notation $v \circ u$
- [C] `TSPE-137` Relation $(v \circ u)' = (v' \circ u) \times u'$ pour la dérivée de la composée de deux fonctions dérivables
- [C] `TSPE-138` Dérivée seconde d'une fonction
- [C] `TSPE-139` Fonction convexe sur un intervalle : définition par la position relative de la courbe représentative et des sécantes
- [C] `TSPE-140` Pour une fonction deux fois dérivable, équivalence admise avec la position par rapport aux tangentes, la croissance de $f'$, la positivité de $f''$
- [C] `TSPE-141` Point d'inflexion

- [SF] `TSPE-142` Calculer la dérivée d'une fonction donnée par une formule simple mettant en jeu opérations algébriques et composition
- [SF] `TSPE-143` Calculer la fonction dérivée d'une fonction construite simplement à partir des fonctions de référence
- [SF] `TSPE-144` Déterminer les limites d'une fonction construite simplement à partir des fonctions de référence
- [SF] `TSPE-145` Étudier les variations d'une fonction construite simplement à partir des fonctions de référence
- [SF] `TSPE-146` Démontrer des inégalités en utilisant la convexité d'une fonction
- [SF] `TSPE-147` Esquisser l'allure de la courbe représentative d'une fonction $f$ à partir de la donnée de tableaux de variations de $f$, de $f'$ ou de $f''$
- [SF] `TSPE-148` Lire sur une représentation graphique de $f$, de $f'$ ou de $f''$ les intervalles où $f$ est convexe, concave, et les points d'inflexion
- [SF] `TSPE-149` Dans le cadre de la résolution de problème, étudier et utiliser la convexité d'une fonction

- [D] `TSPE-150` Si $f''$ est positive, alors la courbe représentative de $f$ est au-dessus de ses tangentes

- [SF+] `TSPE-151` Courbe de Lorenz
- [SF+] `TSPE-152` Dérivée $n$-ième d'une fonction
- [SF+] `TSPE-153` Inégalité arithmético-géométrique

### 4.4 Continuité des fonctions d'une variable réelle

> La justification de la continuité ou de la dérivabilité d'une fonction sur un intervalle n'est pas un objectif du programme. Hormis pour la fonction exponentielle, l'étude de la réciproque d'une fonction continue n'est pas au programme.

- [C] `TSPE-154` Fonction continue en un point (définition par les limites), sur un intervalle
- [C] `TSPE-155` Toute fonction dérivable est continue
- [C] `TSPE-156` Image d'une suite convergente par une fonction continue
- [C] `TSPE-157` Théorème des valeurs intermédiaires
- [C] `TSPE-158` Cas des fonctions continues strictement monotones

- [SF] `TSPE-159` Étudier les solutions d'une équation du type $f(x) = k$ : existence, unicité, encadrement
- [SF] `TSPE-160` Pour une fonction continue $f$ d'un intervalle dans lui-même, étudier une suite définie par une relation de récurrence $u_{n+1} = f(u_n)$

- [SF+] `TSPE-161` Méthode de dichotomie
- [SF+] `TSPE-162` Méthode de Newton
- [SF+] `TSPE-163` Méthode de la sécante
- [SF+] `TSPE-164` Démonstration par dichotomie du théorème des valeurs intermédiaires
- [SF+] `TSPE-165` Fonctions continues de $\mathbb{R}$ dans $\mathbb{R}$ telles que $f(x + y) = f(x) + f(y)$, pour tous réels $x$, $y$
- [SF+] `TSPE-166` Prolongement par continuité

### 4.5 Fonction logarithme

- [C] `TSPE-167` Fonction logarithme népérien, notée $\ln$, construite comme réciproque de la fonction exponentielle
- [C] `TSPE-168` Propriétés algébriques du logarithme
- [C] `TSPE-169` Fonction dérivée du logarithme, variations
- [C] `TSPE-170` Limites en $0$ et en $+\infty$, courbe représentative
- [C] `TSPE-171` Lien entre les courbes représentatives des fonctions logarithme népérien et exponentielle
- [C] `TSPE-172` Croissance comparée du logarithme népérien et de $x \mapsto x^n$ en $0$ et en $+\infty$

- [SF] `TSPE-173` Utiliser l'équation fonctionnelle de l'exponentielle ou du logarithme pour transformer une écriture
- [SF] `TSPE-174` Utiliser l'équation fonctionnelle de l'exponentielle ou du logarithme pour résoudre une équation, une inéquation
- [SF] `TSPE-175` Dans le cadre d'une résolution de problème, utiliser les propriétés des fonctions exponentielle et logarithme

- [D] `TSPE-176` Calcul de la fonction dérivée de la fonction logarithme népérien, la dérivabilité étant admise
- [D] `TSPE-177` Limite en $0$ de $x \mapsto x\ln(x)$

- [SF+] `TSPE-178` Algorithme de Briggs pour le calcul du logarithme
- [SF+] `TSPE-179` Pour $a$ dans $\mathbb{R}$, fonction $x \mapsto x^a$
- [SF+] `TSPE-180` Pour $x$ dans $\mathbb{R}$, limite de $\left(1 + \frac{x}{n}\right)^n$

### 4.6 Fonctions sinus et cosinus

- [C] `TSPE-181` Fonctions trigonométriques sinus et cosinus. Parité, périodicité. Courbes représentatives
- [C] `TSPE-182` Dérivées, variations

- [SF] `TSPE-183` Lier la représentation graphique des fonctions sinus et cosinus et le cercle trigonométrique
- [SF] `TSPE-184` Traduire graphiquement la parité et la périodicité des fonctions sinus et cosinus
- [SF] `TSPE-185` Résoudre une équation du type $\cos(x) = a$
- [SF] `TSPE-186` Résoudre une inéquation de la forme $\cos(x) \leqslant a$ sur $[-\pi, \pi]$
- [SF] `TSPE-187` Dans le cadre de la résolution de problème, notamment géométrique, étudier une fonction simple définie à partir de fonctions trigonométriques, pour déterminer des variations, un optimum

- [SF+] `TSPE-188` Fonction tangente

### 4.7 Primitives, équations différentielles

- [C] `TSPE-189` Équation différentielle $y' = f$
- [C] `TSPE-190` Notion de primitive d'une fonction continue sur un intervalle. Deux primitives d'une même fonction continue sur un intervalle diffèrent d'une constante
- [C] `TSPE-191` Primitives des fonctions de référence : $x \mapsto x^n$ pour $n \in \mathbb{Z}$, $x \mapsto \frac{1}{\sqrt{x}}$, exponentielle, sinus, cosinus
- [C] `TSPE-192` Équation différentielle $y' = ay$, où $a$ est un nombre réel ; allure des courbes
- [C] `TSPE-193` Équation différentielle $y' = ay + b$

- [SF] `TSPE-194` Calculer une primitive en utilisant les primitives de référence et les fonctions de la forme $(v' \circ u) \times u'$
- [SF] `TSPE-195` Pour une équation différentielle $y' = ay + b$ ($a \neq 0$) : déterminer une solution particulière constante ; utiliser cette solution pour déterminer toutes les solutions
- [SF] `TSPE-196` Pour une équation différentielle $y' = ay + f$ : à partir de la donnée d'une solution particulière, déterminer toutes les solutions

- [D] `TSPE-197` Deux primitives d'une même fonction continue sur un intervalle diffèrent d'une constante
- [D] `TSPE-198` Résolution de l'équation différentielle $y' = ay$ où $a$ est un nombre réel

- [SF+] `TSPE-199` Autres exemples d'équations différentielles, éventuellement en lien avec une modélisation, par exemple l'équation logistique
- [SF+] `TSPE-200` Résolution par la méthode d'Euler de $y' = f$, de $y' = ay + b$

### 4.8 Calcul intégral

> On met en regard les écritures $\int_a^b f(x)\,\mathrm{d}x$ et $\sum_{i=1}^{n} f(x_i)\Delta x$.

- [C] `TSPE-201` Définition de l'intégrale d'une fonction continue positive définie sur un segment $[a, b]$, comme aire sous la courbe représentative de $f$. Notation $\int_a^b f(x)\,\mathrm{d}x$
- [C] `TSPE-202` Théorème : si $f$ est une fonction continue positive sur $[a, b]$, alors la fonction $F_a$ définie sur $[a, b]$ par $F_a(x) = \int_a^x f(t)\,\mathrm{d}t$ est la primitive de $f$ qui s'annule en $a$
- [C] `TSPE-203` Sous les hypothèses du théorème, relation $\int_a^b f(x)\,\mathrm{d}x = F(b) - F(a)$ où $F$ est une primitive quelconque de $f$. Notation $\left[F(x)\right]_a^b$
- [C] `TSPE-204` Théorème : toute fonction continue sur un intervalle admet des primitives
- [C] `TSPE-205` Définition par les primitives de $\int_a^b f(x)\,\mathrm{d}x$ lorsque $f$ est une fonction continue de signe quelconque sur un intervalle contenant $a$ et $b$
- [C] `TSPE-206` Linéarité, positivité et intégration des inégalités
- [C] `TSPE-207` Relation de Chasles
- [C] `TSPE-208` Valeur moyenne d'une fonction
- [C] `TSPE-209` Intégration par parties

- [SF] `TSPE-210` Estimer graphiquement ou encadrer une intégrale, une valeur moyenne
- [SF] `TSPE-211` Calculer une intégrale à l'aide d'une primitive
- [SF] `TSPE-212` Calculer une intégrale à l'aide d'une intégration par parties
- [SF] `TSPE-213` Majorer (minorer) une intégrale à partir d'une majoration (minoration) d'une fonction par une autre fonction
- [SF] `TSPE-214` Calculer l'aire entre deux courbes
- [SF] `TSPE-215` Étudier une suite d'intégrales, vérifiant éventuellement une relation de récurrence
- [SF] `TSPE-216` Interpréter une intégrale, une valeur moyenne dans un contexte issu d'une autre discipline

- [D] `TSPE-217` Pour une fonction positive croissante $f$ sur $[a, b]$, la fonction $x \mapsto \int_a^x f(t)\,\mathrm{d}t$ est une primitive de $f$. Pour toute primitive $F$ de $f$, relation $\int_a^b f(x)\,\mathrm{d}x = F(b) - F(a)$
- [D] `TSPE-218` Intégration par parties (démonstration)

- [SF+] `TSPE-219` Approximation d'une aire par l'utilisation de suites adjacentes
- [SF+] `TSPE-220` Encadrement de $H_n = \sum_{k=1}^{n} \frac{1}{k}$ par des intégrales
- [SF+] `TSPE-221` Méthodes des rectangles, des milieux, des trapèzes
- [SF+] `TSPE-222` Méthode de Monte-Carlo
- [SF+] `TSPE-223` Algorithme de Brouncker pour le calcul de $\ln(2)$

---

## 5. Probabilités

### 5.1 Succession d'épreuves indépendantes, schéma de Bernoulli

- [C] `TSPE-224` Modèle de la succession d'épreuves indépendantes : la probabilité d'une issue $(x_1, \ldots, x_n)$ est égale au produit des probabilités des composantes $x_i$. Représentation par un produit cartésien, par un arbre
- [C] `TSPE-225` Épreuve de Bernoulli, loi de Bernoulli
- [C] `TSPE-226` Schéma de Bernoulli : répétition de $n$ épreuves de Bernoulli indépendantes
- [C] `TSPE-227` Loi binomiale $\mathcal{B}(n, p)$ : loi du nombre de succès. Expression à l'aide des coefficients binomiaux

- [SF] `TSPE-228` Modéliser une situation par une succession d'épreuves indépendantes, ou une succession de deux ou trois épreuves quelconques
- [SF] `TSPE-229` Représenter la situation par un arbre
- [SF] `TSPE-230` Calculer une probabilité en utilisant l'indépendance, des probabilités conditionnelles, la formule des probabilités totales
- [SF] `TSPE-231` Modéliser une situation par un schéma de Bernoulli, par une loi binomiale
- [SF] `TSPE-232` Utiliser l'expression de la loi binomiale pour résoudre un problème de seuil, de comparaison, d'optimisation relatif à des probabilités de nombre de succès
- [SF] `TSPE-233` Dans le cadre d'une résolution de problème modélisé par une variable binomiale $X$, calculer numériquement une probabilité du type $P(X = k)$, $P(X \leqslant k)$, $P(k \leqslant X \leqslant k')$, en s'aidant au besoin d'un algorithme
- [SF] `TSPE-234` Dans le cadre d'une résolution de problème modélisé par une variable binomiale $X$, chercher un intervalle $I$ pour lequel la probabilité $P(X \in I)$ est inférieure à une valeur donnée $\alpha$, ou supérieure à $1 - \alpha$

- [D] `TSPE-235` Expression de la probabilité de $k$ succès dans le schéma de Bernoulli

- [SF+] `TSPE-236` Simulation de la planche de Galton
- [SF+] `TSPE-237` Problème de la surréservation. Étant donné une variable aléatoire binomiale $X$ et un réel strictement positif $\alpha$, détermination du plus petit entier $k$ tel que $P(X > k) \leqslant \alpha$
- [SF+] `TSPE-238` Simulation d'un échantillon d'une variable aléatoire
- [SF+] `TSPE-239` Loi géométrique
- [SF+] `TSPE-240` Introduction de la loi de Poisson comme limite de lois binomiales. Interprétation (évènements rares)

### 5.2 Sommes de variables aléatoires

> L'additivité de la variance pour la somme de deux variables indépendantes est admise. La relation $E(XY) = E(X)E(Y)$ pour des variables indépendantes n'est pas un attendu du programme.

- [C] `TSPE-241` Somme de deux variables aléatoires
- [C] `TSPE-242` Linéarité de l'espérance : $E(X + Y) = E(X) + E(Y)$ et $E(aX) = aE(X)$
- [C] `TSPE-243` Dans le cadre de la succession d'épreuves indépendantes, exemples de variables indépendantes $X$, $Y$ et relation d'additivité $V(X + Y) = V(X) + V(Y)$
- [C] `TSPE-244` Relation $V(aX) = a^2V(X)$
- [C] `TSPE-245` Application à l'espérance, la variance et l'écart type de la loi binomiale
- [C] `TSPE-246` Échantillon de taille $n$ d'une loi de probabilité : liste $(X_1, \ldots, X_n)$ de variables indépendantes identiques suivant cette loi
- [C] `TSPE-247` Espérance, variance, écart type de la somme $S_n = X_1 + \cdots + X_n$ et de la moyenne $M_n = \frac{S_n}{n}$

- [SF] `TSPE-248` Représenter une variable comme somme de variables aléatoires plus simples
- [SF] `TSPE-249` Calculer l'espérance d'une variable aléatoire, notamment en utilisant la propriété de linéarité
- [SF] `TSPE-250` Calculer la variance d'une variable aléatoire, notamment en l'exprimant comme somme de variables aléatoires indépendantes

- [D] `TSPE-251` Espérance et variance de la loi binomiale

- [SF+] `TSPE-252` Relation $E(XY) = E(X)E(Y)$ pour des variables aléatoires indépendantes $X$, $Y$. Application à la variance de $X + Y$

### 5.3 Concentration, loi des grands nombres

- [C] `TSPE-253` Inégalité de Bienaymé-Tchebychev. Pour une variable aléatoire $X$ d'espérance $\mu$ et de variance $V$, et quel que soit le réel strictement positif $\delta$ : $P(|X - \mu| \geqslant \delta) \leqslant \frac{V(X)}{\delta^2}$
- [C] `TSPE-254` Inégalité de concentration. Si $M_n$ est la variable aléatoire moyenne d'un échantillon de taille $n$ d'une variable aléatoire d'espérance $\mu$ et de variance $V$, alors pour tout $\delta > 0$, $P(|M_n - \mu| \geqslant \delta) \leqslant \frac{V}{n\delta^2}$
- [C] `TSPE-255` Loi des grands nombres

- [SF] `TSPE-256` Appliquer l'inégalité de Bienaymé-Tchebychev pour définir une taille d'échantillon, en fonction de la précision et du risque choisi

- [SF+] `TSPE-257` Calculer la probabilité de $(|S_n - pn| > \sqrt{n})$, où $S_n$ est une variable aléatoire qui suit une loi binomiale $\mathcal{B}(n, p)$. Comparer avec l'inégalité de Bienaymé-Tchebychev
- [SF+] `TSPE-258` Simulation d'une marche aléatoire
- [SF+] `TSPE-259` Simuler $N$ échantillons de taille $n$ d'une variable aléatoire d'espérance $\mu$ et d'écart type $\sigma$. Calculer l'écart type $s$ de la série des moyennes des échantillons observés, à comparer à $\frac{\sigma}{\sqrt{n}}$. Calculer la proportion des échantillons pour lesquels l'écart entre la moyenne et $\mu$ est inférieur ou égal à $ks$, ou à $k\frac{\sigma}{\sqrt{n}}$, pour $k = 1, 2, 3$
- [SF+] `TSPE-260` Estimation
- [SF+] `TSPE-261` Marche aléatoire
- [SF+] `TSPE-262` Exemples d'application issus d'autres disciplines pour diverses valeurs de $n$ : sondage (par exemple $n = 1\,000$), étude du sex ratio (par exemple $n = 10^6$), demi-vie d'atomes radioactifs ($n = 10^{23}$)

---

## Récapitulatif

| #   | Thème                              | Objectifs | `[C]`   | `[SF]` | `[D]`  | `[SF+]` | Total   |
| --- | ---------------------------------- | --------- | ------- | ------ | ------ | ------- | ------- |
| 1   | Vocabulaire ensembliste et logique | 2         | 9       | 15     | 0      | 0       | 24      |
| 2   | Algorithmique et programmation     | 1         | 1       | 4      | 0      | 0       | 5       |
| 3   | Algèbre et géométrie               | 4         | 32      | 25     | 4      | 15      | 76      |
| 4   | Analyse                            | 8         | 45      | 33     | 12     | 28      | 118     |
| 5   | Probabilités                       | 3         | 14      | 11     | 2      | 12      | 39      |
|     | **Total**                          | **18**    | **101** | **88** | **18** | **55**  | **262** |

> Chiffres **comptés dans le fichier** et confirmés par le générateur
> (`5 thèmes · 18 objectifs · 262 points`), pas estimés.
>
> Les **55 `[SF+]`** portent `exigence = approfondissement` ; les **207 autres** > `attendu`. `regime_acquisition = diversite` partout au seed.
