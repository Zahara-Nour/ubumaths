# Seed Tle spécialité — points du programme ET références (architecture points → nœuds)

> 2026-10-10 : nœuds mis à jour pour l'arbre .16 (nettoyage des facettes, #1002).

> **Statut : VALIDÉ INTÉGRALEMENT par David le 2026-10-08 (« je valide tout » : scissions,
> refusions, entretien, discutables, A1 = oui, P1 = oui). Livraison en cours.** ⚠️ Soin maximal (classes
> réelles). Source : « Programme de l'enseignement de spécialité de mathématiques de la
> classe terminale de la voie générale » (14 p., refourni par David le 2026-10-07), relu
> **puce par puce** — le texte fait foi. Ancien découpage
> (`docs/systeme/programmes/terminale-spe-programme.md`, `TSPE-001`…`TSPE-262`, en prod,
> relu par David le 2026-10-03) : repris pour les libellés et la **traçabilité « ex- »**
> (il porte **308 liens de modèles sur 162 points**). Mapping des nœuds :
> [programmes-ecarts-tle-spe.md](programmes-ecarts-tle-spe.md) (V1-V5 tranchées le
> 2026-10-07). Arbre `2026-10-07.15`, **aucun changement d'arbre**.
> Règles déjà tranchées, appliquées sans être redemandées : critère de scission du lycée ;
> contenu repris mot pour mot d'une année antérieure = **entretien** (références, U5/V1) ;
> puces trop larges non retenues ; point vague → spécifié sans rien ajouter au BO ;
> bloc Algorithmique en `algorithme` ; Approfondissements = savoir-faire
> `approfondissement` ; **Exemples d'algorithme = `algorithme` `approfondissement`** (E1).

## Attributs communs

| Attribut               | Valeur                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `grade`                | `T_SPE`                                                                                                                               |
| `code`                 | **`TSPE-301` à `TSPE-539`** (code = 300 + display_order) : l'ancien seed occupe `TSPE-001`…`TSPE-262`, la base 201 aurait collisionné |
| `objective_id`, `rang` | `NULL`                                                                                                                                |
| `rubrique`             | « thème > section » du BO ; le Vocabulaire ensembliste et logique → le thème seul                                                     |
| `kind`                 | conn. / s-f / dém. / algo. (Exemples d'algorithme) / s-f ⁺ (Approfondissements possibles)                                             |
| `exigence`             | `attendu` ; ⁺ et algo. → `approfondissement`                                                                                          |
| `regime_acquisition`   | `diversite` partout                                                                                                                   |

**239 points** et des **références** (entretien + question A1). Colonne « ex- » : ancien
code `TSPE-xxx` (✂ = issu d'une scission, `+` = anciens points fusionnés).

---

## ⚠️ Puces multi-parties : scindées, refusionnées ou gardées

> Critère : on scinde quand les parties visent des **notions ou sous-notions différentes**
> ou sont **traitées à des moments différents** ; on garde UN point pour les variantes d'un
> même geste. L'ancien découpage (validé par David le 2026-10-03, convention « deux gestes
> = deux points ») est repris ; les écarts ci-dessous.

### Scindées en plus de l'ancien découpage (7 puces → +8 points)

| Puce du BO                                                                                                                                         | Décision                                                                                                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| « Déterminer dans des cas simples la limite **d'une suite ou d'une fonction** en un point, en ±∞, en utilisant… »                                  | **×2** : deux notions (`Limites de suites` / `Limites de fonctions`) ; les techniques listées = gradation.                                                                                                         |
| « Étudier les solutions d'une équation f(x) = k : existence, unicité, **encadrement** »                                                            | **×2** : existence-unicité (`Continuité > valeurs intermédiaires`) / encadrement (`> encadrement d'une solution`, sous-notion créée pour ça, V3).                                                                  |
| « Utiliser l'équation fonctionnelle de l'exponentielle **ou** du logarithme pour transformer une écriture, résoudre une équation, une inéquation » | Ancien : ×2 (transformer / résoudre). Nouveau : **transformer avec ln** (point) · **résoudre avec exp** · **résoudre avec ln** (deux notions) ; « transformer avec exp » = **entretien** du point de 1re 1SPE-294. |
| « Équation différentielle y′ = ay ; **allure des courbes** »                                                                                       | **×2** : `y′ = ay > solution générale` / `Généralités > allure des courbes` (deux notions).                                                                                                                        |
| « Calculer une primitive en utilisant les **primitives de référence** et les fonctions de la **forme (v′∘u)×u′** »                                 | **×2** : deux sous-notions, deux étapes de l'apprentissage.                                                                                                                                                        |
| « **Linéarité, positivité et intégration des inégalités**. Relation de Chasles. »                                                                  | Ancien : ×2. Nouveau : **×3** — linéarité / positivité et inégalités / relation de Chasles (trois sous-notions).                                                                                                   |
| « Estimer graphiquement ou encadrer **une intégrale, une valeur moyenne** » ; « Interpréter **une intégrale, une valeur moyenne**… »               | **×2 chacune** : `Intégrale et aire` ≠ `Valeur moyenne` (deux notions).                                                                                                                                            |

### Refusionnées (l'ancien découpage coupait une puce dont les parties visent le même nœud)

| Anciens points                                                                       | Pourquoi UN point                                                     |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| 021 + 022 « Raisonner par équivalence » / « Utiliser une propriété caractéristique » | Une puce du BO, un nœud (`Raisonnements > par équivalence`) ; 0 lien. |
| 065 + 066 barycentre / exemples d'utilisation (approfondissement)                    | Une puce, un nœud ; 0 lien.                                           |
| 087 + 088 intersection sphère-plan / plan tangent (approfondissement)                | Une puce, `sphère` ; 1 lien (087), reporté.                           |
| 124 + 125 Newton / Héron (approfondissement)                                         | Une puce, `Suites récurrentes > point fixe` ; 0 lien.                 |
| 134 + 135 asymptotes obliques / branches infinies (approfondissement)                | Une puce, `asymptotes` ; 0 lien.                                      |
| 162 + 163 méthode de Newton / de la sécante (exemple d'algorithme)                   | Une puce, `encadrement d'une solution` ; 0 lien.                      |

### Gardées en un point (examinées)

« Modéliser une situation par une succession d'épreuves indépendantes, ou une succession de
deux ou trois épreuves quelconques » (un geste de modélisation) · « Calculer une probabilité
en utilisant l'indépendance, des probabilités conditionnelles, la formule des probabilités
totales » (un geste, les outils = gradation, sur la notion) · « Fonctions sinus et cosinus.
Parité, périodicité. Courbes » (→ `parité et périodicité`) · « Utiliser le produit scalaire
pour… » (déjà ×4 dans l'ancien) · « Dans un cadre repéré, traduire par un système… » (déjà ×2).

## ⚠️ Entretien : contenus repris mot pour mot d'une année antérieure

> Règle U5/V1 (1re spé) : « points seulement là où le programme dépasse l'année
> précédente, le reste est entretien » → **références** vers les points de 2de ou de 1re.
> Aucun de ces anciens points TSPE n'a de lien de modèle.

| Puce du BO de Tle (ancien code)                                                                                 | Entretien → référence                                |
| --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Notions d'ensembles ; symboles ; ensembles de nombres et intervalles ; complémentaire ; Card (001-003, 005-006) | 2-201 · 2-202 · 2-203 · 2-204 · 2-206 · 2-207        |
| Reconnaitre une proposition ; variables ; connecteurs (010-012)                                                 | 2-208 · 2-209 · 2-210                                |
| Contre-exemple ; implication-équivalence ; réciproque-contraposée ; quantification (014-017)                    | 2-212 · 2-213 · 2-214 · 2-215                        |
| Disjonction des cas ; absurde (018-019) ; raisonner par contraposée (020)                                       | 2-216 · 2-217 · 1SPE-205                             |
| Distinguer condition nécessaire et condition suffisante (023)                                                   | 1SPE-201                                             |
| Listes : générer, manipuler, parcourir, itérer (026-029)                                                        | 1SPE-206 · 1SPE-207 · 1SPE-208 · 1SPE-209 · 1SPE-210 |
| Transformer une écriture avec l'équation fonctionnelle de l'exponentielle (part de 173)                         | 1SPE-294                                             |

**Non repris, sans référence** : 007 (bijection, « rencontrée en situation » — [T] du doc
d'écarts), 009 (symbole ∑, « sa manipulation n'est pas un objectif » — [T]), 025 (phrase
de présentation des listes), 008 (composition de fonctions : portée par les points
d'Analyse TSPE-407/408). Aucun n'a de lien.

**Dépassent la 1re → points** : n-uplets (004), négation avec **deux** quantificateurs
(013), raisonnement par équivalence (021+022), démonstration par récurrence (024).

## ⚠️ Puces trop larges et points vagues

| Puce (ancien code, liens)                                                                                                  | Décision                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| « Résoudre des problèmes impliquant des grandeurs et mesures : longueur, angle, aire, volume » (083, 0)                    | ⛔ **non retenue (question P1)** — « résous comme tu veux », jumelle d'ex-2-100 ; les gestes précis (angle, longueur, distance) sont déjà des points. |
| « Dans le cadre d'une résolution de problème, utiliser les propriétés des fonctions exponentielle et logarithme » (175, 1) | ✅ gardée (P1) : son modèle teste un geste précis (seuil qⁿ > A par le logarithme) ; un outil, un geste.                                              |
| « Dans le cadre de la résolution de problème, étudier et utiliser la convexité d'une fonction » (149, 2)                   | ✅ gardée : ses modèles testent signe de f″ et point d'inflexion.                                                                                     |
| « Étudier des phénomènes d'évolution modélisables par une suite » (115, 2)                                                 | ✅ gardée : ses modèles (suites arithmético-géométriques) sont précis ; libellé du BO conservé (pas vague dans le contexte de la section Suites).     |
| « Effectuer des dénombrements simples dans des situations issues de divers domaines » (044, **10**)                        | ✅ gardée : 10 modèles, tous précis ; c'est le cœur questionnable de la section.                                                                      |

---

## Les 239 points

### Vocabulaire ensembliste et logique (rubrique = le thème)

| Code     | ex-     | Énoncé                                                                                       | kind  | nœud                                                               |
| -------- | ------- | -------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------ |
| TSPE-301 | 004     | Notion de couple, de triplet et plus généralement de $n$-uplet et celle de produit cartésien | conn. | `Ensembles` Cardinal et produit cartésien > produit cartésien      |
| TSPE-302 | 013     | Formuler la négation de propositions simples, pouvant contenir un ou deux quantificateurs    | s-f   | `Logique` Quantificateurs et négation > négation d'une proposition |
| TSPE-303 | 021+022 | Raisonner par équivalence, utiliser une propriété caractéristique                            | s-f   | `Logique` Raisonnements > par équivalence                          |
| TSPE-304 | 024     | Démontrer une propriété par récurrence                                                       | s-f   | `Suites` Raisonnement par récurrence > structure d'une récurrence  |

### Algèbre et géométrie > Combinatoire et dénombrement (branche `Dénombrement`)

| Code     | ex- | Énoncé                                                                                                                                                                                                                                    | kind  | nœud                                                           |
| -------- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | -------------------------------------------------------------- |
| TSPE-305 | 030 | Principe additif : nombre d'éléments d'une réunion d'ensembles deux à deux disjoints                                                                                                                                                      | conn. | Principes de dénombrement > principes additif et multiplicatif |
| TSPE-306 | 031 | Principe multiplicatif : nombre d'éléments d'un produit cartésien                                                                                                                                                                         | conn. | Principes de dénombrement > principes additif et multiplicatif |
| TSPE-307 | 032 | Nombre de $k$-uplets (ou $k$-listes) d'un ensemble à $n$ éléments                                                                                                                                                                         | conn. | Principes de dénombrement > k-uplets                           |
| TSPE-308 | 033 | Nombre des parties d'un ensemble à $n$ éléments. Lien avec les $n$-uplets de $\{0, 1\}$, les mots de longueur $n$ sur un alphabet à deux éléments, les chemins dans un arbre, les issues dans une succession de $n$ épreuves de Bernoulli | conn. | Principes de dénombrement > parties d'un ensemble              |
| TSPE-309 | 034 | Nombre des $k$-uplets d'éléments distincts d'un ensemble à $n$ éléments                                                                                                                                                                   | conn. | Arrangements et permutations > arrangements                    |
| TSPE-310 | 035 | Définition de $n!$                                                                                                                                                                                                                        | conn. | Arrangements et permutations > factorielle                     |
| TSPE-311 | 036 | Nombre de permutations d'un ensemble fini à $n$ éléments                                                                                                                                                                                  | conn. | Arrangements et permutations > permutations                    |
| TSPE-312 | 037 | Combinaisons de $k$ éléments d'un ensemble à $n$ éléments : parties à $k$ éléments de l'ensemble. Représentation en termes de mots ou de chemins                                                                                          | conn. | Combinaisons > combinaisons                                    |
| TSPE-313 | 038 | Pour $0 \leqslant k \leqslant n$, formules : $\binom{n}{k} = \frac{n(n-1)\cdots(n-k+1)}{k!} = \frac{n!}{(n-k)!\,k!}$                                                                                                                      | conn. | Combinaisons > coefficients binomiaux                          |
| TSPE-314 | 039 | Explicitation pour $k = 0, 1, 2$                                                                                                                                                                                                          | conn. | Combinaisons > coefficients binomiaux                          |
| TSPE-315 | 040 | Symétrie                                                                                                                                                                                                                                  | conn. | Combinaisons > coefficients binomiaux                          |
| TSPE-316 | 041 | Relation et triangle de Pascal                                                                                                                                                                                                            | conn. | Combinaisons > triangle de Pascal                              |
| TSPE-317 | 042 | Dans le cadre d'un problème de dénombrement, utiliser une représentation adaptée (ensembles, arbres, tableaux, diagrammes)                                                                                                                | s-f   | Problèmes de dénombrement (notion)                             |
| TSPE-318 | 043 | Dans le cadre d'un problème de dénombrement, reconnaitre les objets à dénombrer                                                                                                                                                           | s-f   | Problèmes de dénombrement (notion)                             |
| TSPE-319 | 044 | Effectuer des dénombrements simples dans des situations issues de divers domaines scientifiques (informatique, génétique, théorie des jeux, probabilités, etc.)                                                                           | s-f   | Problèmes de dénombrement (notion)                             |
| TSPE-320 | 045 | Démonstration par dénombrement de la relation : $\sum_{k=0}^{n} \binom{n}{k} = 2^n$                                                                                                                                                       | dém.  | Principes de dénombrement > parties d'un ensemble              |
| TSPE-321 | 046 | Démonstrations de la relation de Pascal (par le calcul, par une méthode combinatoire)                                                                                                                                                     | dém.  | Combinaisons > triangle de Pascal                              |
| TSPE-322 | 047 | Combinaisons avec répétitions                                                                                                                                                                                                             | s-f ⁺ | Combinaisons > combinaisons                                    |
| TSPE-323 | 048 | Pour un entier $n$ donné, génération de la liste des coefficients $\binom{n}{k}$ à l'aide de la relation de Pascal                                                                                                                        | algo. | Combinaisons > triangle de Pascal                              |
| TSPE-324 | 049 | Génération des permutations d'un ensemble fini, ou tirage aléatoire d'une permutation                                                                                                                                                     | algo. | Arrangements et permutations > permutations                    |
| TSPE-325 | 050 | Génération des parties à 2, 3 éléments d'un ensemble fini                                                                                                                                                                                 | algo. | Combinaisons > combinaisons                                    |

### Algèbre et géométrie > Manipulation des vecteurs, des droites et des plans de l'espace (branche `Géométrie`)

| Code     | ex-     | Énoncé                                                                                                                                                                                                           | kind  | nœud                                          |
| -------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | --------------------------------------------- |
| TSPE-326 | 051     | Vecteurs de l'espace. Translations                                                                                                                                                                               | conn. | Espace > vecteurs de l'espace                 |
| TSPE-327 | 052     | Combinaisons linéaires de vecteurs de l'espace                                                                                                                                                                   | conn. | Espace > vecteurs de l'espace                 |
| TSPE-328 | 053     | Droites de l'espace. Vecteurs directeurs d'une droite. Vecteurs colinéaires                                                                                                                                      | conn. | Espace > colinéarité et alignement            |
| TSPE-329 | 054     | Caractérisation d'une droite par un point et un vecteur directeur                                                                                                                                                | conn. | Espace > colinéarité et alignement            |
| TSPE-330 | 055     | Plans de l'espace. Direction d'un plan de l'espace                                                                                                                                                               | conn. | Espace > coplanarité et décomposition         |
| TSPE-331 | 056     | Caractérisation d'un plan de l'espace par un point et un couple de vecteurs non colinéaires                                                                                                                      | conn. | Espace > coplanarité et décomposition         |
| TSPE-332 | 057     | Bases et repères de l'espace                                                                                                                                                                                     | conn. | Espace > coordonnées                          |
| TSPE-333 | 058     | Décomposition d'un vecteur sur une base                                                                                                                                                                          | conn. | Espace > coplanarité et décomposition         |
| TSPE-334 | 059     | Représenter des combinaisons linéaires de vecteurs donnés                                                                                                                                                        | s-f   | Espace > vecteurs de l'espace                 |
| TSPE-335 | 060     | Exploiter une figure pour exprimer un vecteur comme combinaison linéaire de vecteurs                                                                                                                             | s-f   | Espace > coplanarité et décomposition         |
| TSPE-336 | 061     | Décrire la position relative de deux droites, d'une droite et d'un plan, de deux plans                                                                                                                           | s-f   | Espace > positions relatives et intersections |
| TSPE-337 | 062     | Lire sur une figure si deux vecteurs d'un plan, trois vecteurs de l'espace, forment une base                                                                                                                     | s-f   | Espace > coplanarité et décomposition         |
| TSPE-338 | 063     | Lire sur une figure la décomposition d'un vecteur dans une base                                                                                                                                                  | s-f   | Espace > coplanarité et décomposition         |
| TSPE-339 | 064     | Étudier géométriquement des problèmes simples de configurations dans l'espace (alignement, colinéarité, parallélisme, coplanarité)                                                                               | s-f   | Espace (notion)                               |
| TSPE-340 | 065+066 | Barycentre d'une famille d'un système pondéré de deux, trois ou quatre points ; exemples d'utilisation des barycentres, en particulier de la propriété d'associativité, pour résoudre des problèmes de géométrie | s-f ⁺ | Vecteurs (notion)                             |
| TSPE-341 | 067     | Fonction vectorielle de Leibniz                                                                                                                                                                                  | s-f ⁺ | Vecteurs (notion)                             |

### Algèbre et géométrie > Orthogonalité et distances dans l'espace (branche `Géométrie`)

| Code     | ex-     | Énoncé                                                                                                                          | kind  | nœud                                                                              |
| -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------- |
| TSPE-342 | 068     | Produit scalaire de deux vecteurs de l'espace. Bilinéarité, symétrie                                                            | conn. | Orthogonalité et distances dans l'espace > produit scalaire dans l'espace         |
| TSPE-343 | 069     | Orthogonalité de deux vecteurs. Caractérisation par le produit scalaire                                                         | conn. | Orthogonalité et distances dans l'espace > produit scalaire dans l'espace         |
| TSPE-344 | 070     | Base orthonormée, repère orthonormé                                                                                             | conn. | Orthogonalité et distances dans l'espace > produit scalaire dans l'espace         |
| TSPE-345 | 071     | Coordonnées d'un vecteur dans une base orthonormée. Expressions du produit scalaire et de la norme                              | conn. | Orthogonalité et distances dans l'espace > produit scalaire dans l'espace         |
| TSPE-346 | 072     | Expression de la distance entre deux points                                                                                     | conn. | Orthogonalité et distances dans l'espace > produit scalaire dans l'espace         |
| TSPE-347 | 073     | Développement de $\lVert\vec{u} + \vec{v}\rVert^2$, formules de polarisation                                                    | conn. | Orthogonalité et distances dans l'espace > produit scalaire dans l'espace         |
| TSPE-348 | 074     | Orthogonalité de deux droites, d'un plan et d'une droite                                                                        | conn. | Orthogonalité et distances dans l'espace > orthogonalité de droites et plans      |
| TSPE-349 | 075     | Vecteur normal à un plan. Étant donnés un point $A$ et un vecteur non nul $\vec{n}$, plan passant par $A$ et normal à $\vec{n}$ | conn. | Orthogonalité et distances dans l'espace > vecteur normal et équation cartésienne |
| TSPE-350 | 076     | Projeté orthogonal d'un point sur une droite, sur un plan                                                                       | conn. | Orthogonalité et distances dans l'espace > projeté orthogonal                     |
| TSPE-351 | 077     | Plans perpendiculaires. Caractérisation par des vecteurs normaux                                                                | conn. | Orthogonalité et distances dans l'espace > orthogonalité de droites et plans      |
| TSPE-352 | 078     | Utiliser le produit scalaire pour démontrer une orthogonalité                                                                   | s-f   | Orthogonalité et distances dans l'espace > orthogonalité de droites et plans      |
| TSPE-353 | 079     | Utiliser le produit scalaire pour démontrer la perpendicularité de deux plans                                                   | s-f   | Orthogonalité et distances dans l'espace > orthogonalité de droites et plans      |
| TSPE-354 | 080     | Utiliser le produit scalaire pour calculer un angle                                                                             | s-f   | Orthogonalité et distances dans l'espace > angles                                 |
| TSPE-355 | 081     | Utiliser le produit scalaire pour calculer une longueur dans l'espace                                                           | s-f   | Orthogonalité et distances dans l'espace > angles                                 |
| TSPE-356 | 082     | Utiliser la projection orthogonale pour déterminer la distance d'un point à une droite ou à un plan                             | s-f   | Orthogonalité et distances dans l'espace > projeté orthogonal                     |
| TSPE-357 | 084     | Étudier des problèmes de configuration dans l'espace : orthogonalité de deux droites, d'une droite et d'un plan                 | s-f   | Orthogonalité et distances dans l'espace > orthogonalité de droites et plans      |
| TSPE-358 | 085     | Étudier des problèmes de configuration dans l'espace : lieux géométriques simples, par exemple plan médiateur de deux points    | s-f   | Orthogonalité et distances dans l'espace > vecteur normal et équation cartésienne |
| TSPE-359 | 086     | Le projeté orthogonal d'un point $M$ sur un plan $\mathcal{P}$ est le point de $\mathcal{P}$ le plus proche de $M$              | dém.  | Orthogonalité et distances dans l'espace > projeté orthogonal                     |
| TSPE-360 | 087+088 | Intersection d'une sphère et d'un plan, plan tangent à une sphère en un point                                                   | s-f ⁺ | Orthogonalité et distances dans l'espace > sphère                                 |
| TSPE-361 | 089     | Sphère circonscrite à un tétraèdre                                                                                              | s-f ⁺ | Orthogonalité et distances dans l'espace > sphère                                 |
| TSPE-362 | 090     | Fonction scalaire de Leibniz                                                                                                    | s-f ⁺ | Orthogonalité et distances dans l'espace > produit scalaire dans l'espace         |

### Algèbre et géométrie > Représentations paramétriques et équations cartésiennes (branche `Géométrie`)

| Code     | ex- | Énoncé                                                                                                                                                                                                                                                                                                                                                                        | kind  | nœud                                                                              |
| -------- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------- |
| TSPE-363 | 091 | Représentation paramétrique d'une droite                                                                                                                                                                                                                                                                                                                                      | conn. | Espace > représentation paramétrique                                              |
| TSPE-364 | 092 | Équation cartésienne d'un plan                                                                                                                                                                                                                                                                                                                                                | conn. | Orthogonalité et distances dans l'espace > vecteur normal et équation cartésienne |
| TSPE-365 | 093 | Déterminer une représentation paramétrique d'une droite                                                                                                                                                                                                                                                                                                                       | s-f   | Espace > représentation paramétrique                                              |
| TSPE-366 | 094 | Reconnaitre une droite donnée par une représentation paramétrique                                                                                                                                                                                                                                                                                                             | s-f   | Espace > représentation paramétrique                                              |
| TSPE-367 | 095 | Déterminer l'équation cartésienne d'un plan dont on connait un vecteur normal et un point                                                                                                                                                                                                                                                                                     | s-f   | Orthogonalité et distances dans l'espace > vecteur normal et équation cartésienne |
| TSPE-368 | 096 | Reconnaitre un plan donné par une équation cartésienne et préciser un vecteur normal à ce plan                                                                                                                                                                                                                                                                                | s-f   | Orthogonalité et distances dans l'espace > vecteur normal et équation cartésienne |
| TSPE-369 | 097 | Déterminer les coordonnées du projeté orthogonal d'un point sur un plan donné par une équation cartésienne                                                                                                                                                                                                                                                                    | s-f   | Orthogonalité et distances dans l'espace > projeté orthogonal                     |
| TSPE-370 | 098 | Déterminer les coordonnées du projeté orthogonal d'un point sur une droite donnée par un point et un vecteur directeur                                                                                                                                                                                                                                                        | s-f   | Orthogonalité et distances dans l'espace > projeté orthogonal                     |
| TSPE-371 | 099 | Dans un cadre géométrique repéré, traduire par un système d'équations linéaires des problèmes de types suivants : décider si trois vecteurs forment une base, déterminer les coordonnées d'un vecteur dans une base, étudier une configuration dans l'espace (alignement, colinéarité, parallélisme, coplanarité, intersection et orthogonalité de droites ou de plans), etc. | s-f   | Espace (notion)                                                                   |
| TSPE-372 | 100 | Dans des cas simples, résoudre le système obtenu et interpréter géométriquement les solutions                                                                                                                                                                                                                                                                                 | s-f   | Espace > positions relatives et intersections                                     |
| TSPE-373 | 101 | Équation cartésienne du plan normal au vecteur $\vec{n}$ et passant par le point $A$                                                                                                                                                                                                                                                                                          | dém.  | Orthogonalité et distances dans l'espace > vecteur normal et équation cartésienne |
| TSPE-374 | 102 | Déterminer l'intersection de deux plans                                                                                                                                                                                                                                                                                                                                       | s-f ⁺ | Espace > positions relatives et intersections                                     |
| TSPE-375 | 103 | Déterminer un vecteur orthogonal à deux vecteurs non colinéaires                                                                                                                                                                                                                                                                                                              | s-f ⁺ | Orthogonalité et distances dans l'espace > vecteur normal et équation cartésienne |
| TSPE-376 | 104 | Équation d'une sphère dont on connait le centre et le rayon                                                                                                                                                                                                                                                                                                                   | s-f ⁺ | Orthogonalité et distances dans l'espace > sphère                                 |
| TSPE-377 | 105 | Intersection d'une sphère et d'une droite                                                                                                                                                                                                                                                                                                                                     | s-f ⁺ | Orthogonalité et distances dans l'espace > sphère                                 |

### Analyse > Suites (branche `Suites`)

| Code     | ex-     | Énoncé                                                                                                                                                                                      | kind  | nœud                                                     |
| -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | -------------------------------------------------------- |
| TSPE-378 | 106     | La suite $(u_n)$ tend vers $+\infty$ si tout intervalle de la forme $[A\,;\,+\infty[$ contient toutes les valeurs $u_n$ à partir d'un certain rang. Cas des suites croissantes non majorées | conn. | Limites de suites > définition                           |
| TSPE-379 | 107     | Suite tendant vers $-\infty$                                                                                                                                                                | conn. | Limites de suites > définition                           |
| TSPE-380 | 108     | La suite $(u_n)$ converge vers le nombre réel $\ell$ si tout intervalle ouvert contenant $\ell$ contient toutes les valeurs $u_n$ à partir d'un certain rang                                | conn. | Limites de suites > définition                           |
| TSPE-381 | 109     | Limites et comparaison. Théorèmes des gendarmes                                                                                                                                             | conn. | Limites de suites > comparaison et encadrement           |
| TSPE-382 | 110     | Opérations sur les limites                                                                                                                                                                  | conn. | Limites de suites > opérations                           |
| TSPE-383 | 111     | Comportement d'une suite géométrique $(q^n)$ où $q$ est un nombre réel                                                                                                                      | conn. | Limites de suites > suites géométriques                  |
| TSPE-384 | 112     | Théorème admis : toute suite croissante majorée (ou décroissante minorée) converge                                                                                                          | conn. | Limites de suites > convergence monotone                 |
| TSPE-385 | 113     | Établir la convergence d'une suite, ou sa divergence vers $+\infty$ ou $-\infty$                                                                                                            | s-f   | Limites de suites (notion)                               |
| TSPE-386 | 114     | Raisonner par récurrence pour établir une propriété d'une suite                                                                                                                             | s-f   | Raisonnement par récurrence > structure d'une récurrence |
| TSPE-387 | 115     | Étudier des phénomènes d'évolution modélisables par une suite                                                                                                                               | s-f   | Modèles d'évolution (notion)                             |
| TSPE-388 | 116     | Toute suite croissante non majorée tend vers $+\infty$                                                                                                                                      | dém.  | Limites de suites > convergence monotone                 |
| TSPE-389 | 117     | Limite de $(q^n)$, après démonstration par récurrence de l'inégalité de Bernoulli                                                                                                           | dém.  | Limites de suites > suites géométriques                  |
| TSPE-390 | 118     | Divergence vers $+\infty$ d'une suite minorée par une suite divergeant vers $+\infty$                                                                                                       | dém.  | Limites de suites > comparaison et encadrement           |
| TSPE-391 | 119     | Limite en $+\infty$ et en $-\infty$ de la fonction exponentielle                                                                                                                            | dém.  | `Fonctions` Limites de fonctions > croissances comparées |
| TSPE-392 | 120     | Recherche de seuils                                                                                                                                                                         | algo. | Modèles d'évolution > seuil                              |
| TSPE-393 | 121     | Recherche de valeurs approchées de $\pi$, $e$, $\sqrt{2}$, $\frac{1 + \sqrt{5}}{2}$, $\ln(2)$, etc.                                                                                         | algo. | Limites de suites (notion)                               |
| TSPE-394 | 122     | Propriétés et utilisation des suites adjacentes                                                                                                                                             | s-f ⁺ | Limites de suites > convergence monotone                 |
| TSPE-395 | 123     | Exemples de suites vérifiant une relation de récurrence linéaire d'ordre 2 à coefficients constants                                                                                         | s-f ⁺ | Suites récurrentes (notion)                              |
| TSPE-396 | 124+125 | Exemples d'application de la méthode de Newton ; étude de la convergence de la méthode de Héron                                                                                             | s-f ⁺ | Suites récurrentes > point fixe                          |

### Analyse > Limites des fonctions (branche `Fonctions`)

| Code     | ex-     | Énoncé                                                                                                                                                                                                                                                                                  | kind  | nœud                                              |
| -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------- |
| TSPE-397 | 126     | Limite finie ou infinie d'une fonction en $+\infty$, en $-\infty$, en un point                                                                                                                                                                                                          | conn. | Limites de fonctions > limite en un point         |
| TSPE-398 | 127     | Asymptote parallèle à un axe de coordonnées                                                                                                                                                                                                                                             | conn. | Limites de fonctions > asymptotes                 |
| TSPE-399 | 128     | Limites faisant intervenir les fonctions de référence étudiées en classe de première : puissances entières, racine carrée, fonction exponentielle                                                                                                                                       | conn. | Limites de fonctions > opérations                 |
| TSPE-400 | 129     | Limites et comparaison                                                                                                                                                                                                                                                                  | conn. | Limites de fonctions > comparaison et encadrement |
| TSPE-401 | 130     | Opérations sur les limites                                                                                                                                                                                                                                                              | conn. | Limites de fonctions > opérations                 |
| TSPE-402 | ✂131a  | Déterminer dans des cas simples la limite d'une suite, en utilisant les limites usuelles, les croissances comparées, les opérations sur les limites, des majorations, minorations ou encadrements, la factorisation du terme prépondérant dans une somme                                | s-f   | `Suites` Limites de suites (notion)               |
| TSPE-403 | ✂131b  | Déterminer dans des cas simples la limite d'une fonction en un point, en $\pm\infty$, en utilisant les limites usuelles, les croissances comparées, les opérations sur les limites, des majorations, minorations ou encadrements, la factorisation du terme prépondérant dans une somme | s-f   | Limites de fonctions (notion)                     |
| TSPE-404 | 132     | Faire le lien entre l'existence d'une asymptote parallèle à un axe et celle de la limite correspondante                                                                                                                                                                                 | s-f   | Limites de fonctions > asymptotes                 |
| TSPE-405 | 133     | Croissance comparée de $x \mapsto x^n$ et $\exp$ en $+\infty$                                                                                                                                                                                                                           | dém.  | Limites de fonctions > croissances comparées      |
| TSPE-406 | 134+135 | Asymptotes obliques ; branches infinies                                                                                                                                                                                                                                                 | s-f ⁺ | Limites de fonctions > asymptotes                 |

### Analyse > Compléments sur la dérivation (branche `Fonctions`)

| Code     | ex- | Énoncé                                                                                                                                              | kind  | nœud                                     |
| -------- | --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---------------------------------------- |
| TSPE-407 | 136 | Composée de deux fonctions, notation $v \circ u$                                                                                                    | conn. | Dérivation > fonctions composées         |
| TSPE-408 | 137 | Relation $(v \circ u)' = (v' \circ u) \times u'$ pour la dérivée de la composée de deux fonctions dérivables                                        | conn. | Dérivation > fonctions composées         |
| TSPE-409 | 138 | Dérivée seconde d'une fonction                                                                                                                      | conn. | Convexité > dérivée seconde              |
| TSPE-410 | 139 | Fonction convexe sur un intervalle : définition par la position relative de la courbe représentative et des sécantes                                | conn. | Convexité > caractérisations             |
| TSPE-411 | 140 | Pour une fonction deux fois dérivable, équivalence admise avec la position par rapport aux tangentes, la croissance de $f'$, la positivité de $f''$ | conn. | Convexité > caractérisations             |
| TSPE-412 | 141 | Point d'inflexion                                                                                                                                   | conn. | Convexité > point d'inflexion            |
| TSPE-413 | 142 | Calculer la dérivée d'une fonction donnée par une formule simple mettant en jeu opérations algébriques et composition                               | s-f   | Dérivation > fonctions composées         |
| TSPE-414 | 143 | Calculer la fonction dérivée d'une fonction construite simplement à partir des fonctions de référence                                               | s-f   | Dérivation > opérations sur les dérivées |
| TSPE-415 | 144 | Déterminer les limites d'une fonction construite simplement à partir des fonctions de référence                                                     | s-f   | Limites de fonctions (notion)            |
| TSPE-416 | 145 | Étudier les variations d'une fonction construite simplement à partir des fonctions de référence                                                     | s-f   | Dérivation > variations et extremums     |
| TSPE-417 | 146 | Démontrer des inégalités en utilisant la convexité d'une fonction                                                                                   | s-f   | Convexité > inégalités de convexité      |
| TSPE-418 | 147 | Esquisser l'allure de la courbe représentative d'une fonction $f$ à partir de la donnée de tableaux de variations de $f$, de $f'$ ou de $f''$       | s-f   | Convexité (notion)                       |
| TSPE-419 | 148 | Lire sur une représentation graphique de $f$, de $f'$ ou de $f''$ les intervalles où $f$ est convexe, concave, et les points d'inflexion            | s-f   | Convexité (notion)                       |
| TSPE-420 | 149 | Dans le cadre de la résolution de problème, étudier et utiliser la convexité d'une fonction                                                         | s-f   | Convexité (notion)                       |
| TSPE-421 | 150 | Si $f''$ est positive, alors la courbe représentative de $f$ est au-dessus de ses tangentes                                                         | dém.  | Convexité > inégalités de convexité      |
| TSPE-422 | 151 | Courbe de Lorenz                                                                                                                                    | s-f ⁺ | Convexité (notion)                       |
| TSPE-423 | 152 | Dérivée $n$-ième d'une fonction                                                                                                                     | s-f ⁺ | Dérivation (notion)                      |
| TSPE-424 | 153 | Inégalité arithmético-géométrique                                                                                                                   | s-f ⁺ | Convexité > inégalités de convexité      |

### Analyse > Continuité des fonctions d'une variable réelle (branche `Fonctions`)

| Code     | ex-     | Énoncé                                                                                                                                    | kind  | nœud                                     |
| -------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---------------------------------------- |
| TSPE-425 | 154     | Fonction continue en un point (définition par les limites), sur un intervalle                                                             | conn. | Continuité > continuité en un point      |
| TSPE-426 | 155     | Toute fonction dérivable est continue                                                                                                     | conn. | Continuité > continuité en un point      |
| TSPE-427 | 156     | Image d'une suite convergente par une fonction continue                                                                                   | conn. | `Suites` Suites récurrentes > point fixe |
| TSPE-428 | 157     | Théorème des valeurs intermédiaires                                                                                                       | conn. | Continuité > valeurs intermédiaires      |
| TSPE-429 | 158     | Cas des fonctions continues strictement monotones                                                                                         | conn. | Continuité > valeurs intermédiaires      |
| TSPE-430 | ✂159a  | Étudier les solutions d'une équation du type $f(x) = k$ : existence, unicité                                                              | s-f   | Continuité > valeurs intermédiaires      |
| TSPE-431 | ✂159b  | Encadrer les solutions d'une équation du type $f(x) = k$                                                                                  | s-f   | Continuité > encadrement d'une solution  |
| TSPE-432 | 160     | Pour une fonction continue $f$ d'un intervalle dans lui-même, étudier une suite définie par une relation de récurrence $u_{n+1} = f(u_n)$ | s-f   | `Suites` Suites récurrentes (notion)     |
| TSPE-433 | 161     | Méthode de dichotomie                                                                                                                     | algo. | Continuité > encadrement d'une solution  |
| TSPE-434 | 162+163 | Méthode de Newton, méthode de la sécante                                                                                                  | algo. | Continuité > encadrement d'une solution  |
| TSPE-435 | 164     | Démonstration par dichotomie du théorème des valeurs intermédiaires                                                                       | s-f ⁺ | Continuité > valeurs intermédiaires      |
| TSPE-436 | 165     | Fonctions continues de $\mathbb{R}$ dans $\mathbb{R}$ telles que $f(x + y) = f(x) + f(y)$, pour tous réels $x$, $y$                       | s-f ⁺ | Continuité (notion)                      |
| TSPE-437 | 166     | Prolongement par continuité                                                                                                               | s-f ⁺ | Continuité > continuité en un point      |

### Analyse > Fonction logarithme (branche `Fonctions`)

| Code     | ex-    | Énoncé                                                                                                        | kind  | nœud                                              |
| -------- | ------ | ------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------- |
| TSPE-438 | 167    | Fonction logarithme népérien, notée $\ln$, construite comme réciproque de la fonction exponentielle           | conn. | Logarithmes > réciproque de l'exponentielle       |
| TSPE-439 | 168    | Propriétés algébriques du logarithme                                                                          | conn. | Logarithmes > propriétés algébriques              |
| TSPE-440 | 169    | Fonction dérivée du logarithme, variations                                                                    | conn. | Logarithmes > dérivée                             |
| TSPE-441 | 170    | Limites en $0$ et en $+\infty$, courbe représentative                                                         | conn. | Logarithmes > courbe                              |
| TSPE-442 | 171    | Lien entre les courbes représentatives des fonctions logarithme népérien et exponentielle                     | conn. | Logarithmes > courbe                              |
| TSPE-443 | 172    | Croissance comparée du logarithme népérien et de $x \mapsto x^n$ en $0$ et en $+\infty$                       | conn. | Limites de fonctions > croissances comparées      |
| TSPE-444 | ✂173  | Utiliser l'équation fonctionnelle du logarithme pour transformer une écriture                                 | s-f   | Logarithmes > propriétés algébriques              |
| TSPE-445 | ✂174a | Utiliser l'équation fonctionnelle de l'exponentielle pour résoudre une équation, une inéquation               | s-f   | Fonction exponentielle > équations et inéquations |
| TSPE-446 | ✂174b | Utiliser l'équation fonctionnelle du logarithme pour résoudre une équation, une inéquation                    | s-f   | Logarithmes > équations et inéquations            |
| TSPE-447 | 175    | Dans le cadre d'une résolution de problème, utiliser les propriétés des fonctions exponentielle et logarithme | s-f   | Logarithmes (notion)                              |
| TSPE-448 | 176    | Calcul de la fonction dérivée de la fonction logarithme népérien, la dérivabilité étant admise                | dém.  | Logarithmes > dérivée                             |
| TSPE-449 | 177    | Limite en $0$ de $x \mapsto x\ln(x)$                                                                          | dém.  | Limites de fonctions > croissances comparées      |
| TSPE-450 | 178    | Algorithme de Briggs pour le calcul du logarithme                                                             | algo. | Logarithmes (notion)                              |
| TSPE-451 | 179    | Pour $a$ dans $\mathbb{R}$, fonction $x \mapsto x^a$                                                          | s-f ⁺ | Logarithmes (notion)                              |
| TSPE-452 | 180    | Pour $x$ dans $\mathbb{R}$, limite de $\left(1 + \frac{x}{n}\right)^n$                                        | s-f ⁺ | Fonction exponentielle (notion)                   |

### Analyse > Fonctions sinus et cosinus (branche `Fonctions`)

| Code     | ex- | Énoncé                                                                                                                                                                                    | kind  | nœud                                                    |
| -------- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------- |
| TSPE-453 | 181 | Fonctions trigonométriques sinus et cosinus. Parité, périodicité. Courbes représentatives                                                                                                 | conn. | Fonctions trigonométriques (notion)                     |
| TSPE-454 | 182 | Dérivées, variations                                                                                                                                                                      | conn. | Fonctions trigonométriques > dérivées et variations     |
| TSPE-455 | 183 | Lier la représentation graphique des fonctions sinus et cosinus et le cercle trigonométrique                                                                                              | s-f   | Fonctions trigonométriques > cosinus et sinus d'un réel |
| TSPE-456 | 184 | Traduire graphiquement la parité et la périodicité des fonctions sinus et cosinus                                                                                                         | s-f   | Fonctions trigonométriques > parité et périodicité      |
| TSPE-457 | 185 | Résoudre une équation du type $\cos(x) = a$                                                                                                                                               | s-f   | Fonctions trigonométriques > équations                  |
| TSPE-458 | 186 | Résoudre une inéquation de la forme $\cos(x) \leqslant a$ sur $[-\pi, \pi]$                                                                                                               | s-f   | Fonctions trigonométriques > inéquations                |
| TSPE-459 | 187 | Dans le cadre de la résolution de problème, notamment géométrique, étudier une fonction simple définie à partir de fonctions trigonométriques, pour déterminer des variations, un optimum | s-f   | Fonctions trigonométriques > dérivées et variations     |
| TSPE-460 | 188 | Fonction tangente                                                                                                                                                                         | s-f ⁺ | Fonctions trigonométriques (notion)                     |

### Analyse > Primitives, équations différentielles (branche `Équations différentielles`)

| Code     | ex-    | Énoncé                                                                                                                                                                      | kind  | nœud                                           |
| -------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------- |
| TSPE-461 | 189    | Équation différentielle $y' = f$                                                                                                                                            | conn. | y′ = f (notion)                                |
| TSPE-462 | 190    | Notion de primitive d'une fonction continue sur un intervalle. Deux primitives d'une même fonction continue sur un intervalle diffèrent d'une constante                     | conn. | y′ = f > primitives : notion                   |
| TSPE-463 | 191    | Primitives des fonctions de référence : $x \mapsto x^n$ pour $n \in \mathbb{Z}$, $x \mapsto \frac{1}{\sqrt{x}}$, exponentielle, sinus, cosinus                              | conn. | y′ = f > primitives des fonctions de référence |
| TSPE-464 | ✂192a | Équation différentielle $y' = ay$, où $a$ est un nombre réel                                                                                                                | conn. | y′ = ay (notion)                               |
| TSPE-465 | ✂192b | Allure des courbes des solutions de l'équation différentielle $y' = ay$                                                                                                     | conn. | Généralités > allure des courbes               |
| TSPE-466 | 193    | Équation différentielle $y' = ay + b$                                                                                                                                       | conn. | y′ = ay + b (notion)                           |
| TSPE-467 | ✂194a | Calculer une primitive en utilisant les primitives de référence                                                                                                             | s-f   | y′ = f > primitives des fonctions de référence |
| TSPE-468 | ✂194b | Calculer une primitive en utilisant les fonctions de la forme $(v' \circ u) \times u'$                                                                                      | s-f   | y′ = f > forme (v′∘u)×u′                       |
| TSPE-469 | 195    | Pour une équation différentielle $y' = ay + b$ ($a \neq 0$) : déterminer une solution particulière constante ; utiliser cette solution pour déterminer toutes les solutions | s-f   | y′ = ay + b (notion)                           |
| TSPE-470 | 196    | Pour une équation différentielle $y' = ay + f$ : à partir de la donnée d'une solution particulière, déterminer toutes les solutions                                         | s-f   | y′ = ay + f (notion)                           |
| TSPE-471 | 197    | Deux primitives d'une même fonction continue sur un intervalle diffèrent d'une constante                                                                                    | dém.  | y′ = f > primitives : notion                   |
| TSPE-472 | 198    | Résolution de l'équation différentielle $y' = ay$ où $a$ est un nombre réel                                                                                                 | dém.  | y′ = ay (notion)                               |
| TSPE-473 | 199    | Autres exemples d'équations différentielles, éventuellement en lien avec une modélisation, par exemple l'équation logistique                                                | s-f ⁺ | Généralités > notion de solution               |
| TSPE-474 | 200    | Résolution par la méthode d'Euler de $y' = f$, de $y' = ay + b$                                                                                                             | algo. | Généralités > méthode d'Euler                  |

### Analyse > Calcul intégral (branche `Intégration`)

| Code     | ex-    | Énoncé                                                                                                                                                                                                                    | kind  | nœud                                                     |
| -------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | -------------------------------------------------------- |
| TSPE-475 | 201    | Définition de l'intégrale d'une fonction continue positive définie sur un segment $[a, b]$, comme aire sous la courbe représentative de $f$. Notation $\int_a^b f(x)\,\mathrm{d}x$                                        | conn. | Intégrale et aire > aire algébrique                      |
| TSPE-476 | 202    | Théorème : si $f$ est une fonction continue positive sur $[a, b]$, alors la fonction $F_a$ définie sur $[a, b]$ par $F_a(x) = \int_a^x f(t)\,\mathrm{d}t$ est la primitive de $f$ qui s'annule en $a$                     | conn. | Fonction intégrale > dérivée d'une fonction intégrale    |
| TSPE-477 | 203    | Sous les hypothèses du théorème, relation $\int_a^b f(x)\,\mathrm{d}x = F(b) - F(a)$ où $F$ est une primitive quelconque de $f$. Notation $\left[F(x)\right]_a^b$                                                         | conn. | Calcul d'intégrales > par une primitive                  |
| TSPE-478 | 204    | Théorème : toute fonction continue sur un intervalle admet des primitives                                                                                                                                                 | conn. | `Équations différentielles` y′ = f > primitives : notion |
| TSPE-479 | 205    | Définition par les primitives de $\int_a^b f(x)\,\mathrm{d}x$ lorsque $f$ est une fonction continue de signe quelconque sur un intervalle contenant $a$ et $b$                                                            | conn. | Intégrale et aire > aire algébrique                      |
| TSPE-480 | ✂206a | Linéarité de l'intégrale                                                                                                                                                                                                  | conn. | Calcul d'intégrales > linéarité                          |
| TSPE-481 | ✂206b | Positivité et intégration des inégalités                                                                                                                                                                                  | conn. | Calcul d'intégrales > positivité et inégalités           |
| TSPE-482 | 207    | Relation de Chasles                                                                                                                                                                                                       | conn. | Calcul d'intégrales > relation de Chasles                |
| TSPE-483 | 208    | Valeur moyenne d'une fonction                                                                                                                                                                                             | conn. | Valeur moyenne (notion)                                  |
| TSPE-484 | 209    | Intégration par parties                                                                                                                                                                                                   | conn. | Calcul d'intégrales > intégration par parties            |
| TSPE-485 | ✂210a | Estimer graphiquement ou encadrer une intégrale                                                                                                                                                                           | s-f   | Intégrale et aire > aire algébrique                      |
| TSPE-486 | ✂210b | Estimer graphiquement ou encadrer une valeur moyenne                                                                                                                                                                      | s-f   | Valeur moyenne (notion)                                  |
| TSPE-487 | 211    | Calculer une intégrale à l'aide d'une primitive                                                                                                                                                                           | s-f   | Calcul d'intégrales > par une primitive                  |
| TSPE-488 | 212    | Calculer une intégrale à l'aide d'une intégration par parties                                                                                                                                                             | s-f   | Calcul d'intégrales > intégration par parties            |
| TSPE-489 | 213    | Majorer (minorer) une intégrale à partir d'une majoration (minoration) d'une fonction par une autre fonction                                                                                                              | s-f   | Calcul d'intégrales > positivité et inégalités           |
| TSPE-490 | 214    | Calculer l'aire entre deux courbes                                                                                                                                                                                        | s-f   | Intégrale et aire > aire entre deux courbes              |
| TSPE-491 | 215    | Étudier une suite d'intégrales, vérifiant éventuellement une relation de récurrence                                                                                                                                       | s-f   | Calcul d'intégrales > suites d'intégrales                |
| TSPE-492 | ✂216a | Interpréter une intégrale dans un contexte issu d'une autre discipline                                                                                                                                                    | s-f   | Intégrale et aire (notion)                               |
| TSPE-493 | ✂216b | Interpréter une valeur moyenne dans un contexte issu d'une autre discipline                                                                                                                                               | s-f   | Valeur moyenne (notion)                                  |
| TSPE-494 | 217    | Pour une fonction positive croissante $f$ sur $[a, b]$, la fonction $x \mapsto \int_a^x f(t)\,\mathrm{d}t$ est une primitive de $f$. Pour toute primitive $F$ de $f$, relation $\int_a^b f(x)\,\mathrm{d}x = F(b) - F(a)$ | dém.  | Fonction intégrale > dérivée d'une fonction intégrale    |
| TSPE-495 | 218    | Intégration par parties (démonstration)                                                                                                                                                                                   | dém.  | Calcul d'intégrales > intégration par parties            |
| TSPE-496 | 219    | Approximation d'une aire par l'utilisation de suites adjacentes                                                                                                                                                           | s-f ⁺ | Calcul d'intégrales > méthode des rectangles             |
| TSPE-497 | 220    | Encadrement de $H_n = \sum_{k=1}^{n} \frac{1}{k}$ par des intégrales                                                                                                                                                      | s-f ⁺ | Calcul d'intégrales > positivité et inégalités           |
| TSPE-498 | 221    | Méthodes des rectangles, des milieux, des trapèzes                                                                                                                                                                        | algo. | Calcul d'intégrales > méthode des rectangles             |
| TSPE-499 | 222    | Méthode de Monte-Carlo                                                                                                                                                                                                    | algo. | Intégrale et aire (notion)                               |
| TSPE-500 | 223    | Algorithme de Brouncker pour le calcul de $\ln(2)$                                                                                                                                                                        | algo. | Calcul d'intégrales > méthode des rectangles             |

### Probabilités > Succession d'épreuves indépendantes, schéma de Bernoulli (branche `Probabilités`)

| Code     | ex- | Énoncé                                                                                                                                                                                                                                    | kind  | nœud                                                              |
| -------- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------------------- |
| TSPE-501 | 224 | Modèle de la succession d'épreuves indépendantes : la probabilité d'une issue $(x_1, \ldots, x_n)$ est égale au produit des probabilités des composantes $x_i$. Représentation par un produit cartésien, par un arbre                     | conn. | Probabilités conditionnelles > épreuves indépendantes successives |
| TSPE-502 | 225 | Épreuve de Bernoulli, loi de Bernoulli                                                                                                                                                                                                    | conn. | Loi binomiale > schéma de Bernoulli                               |
| TSPE-503 | 226 | Schéma de Bernoulli : répétition de $n$ épreuves de Bernoulli indépendantes                                                                                                                                                               | conn. | Loi binomiale > schéma de Bernoulli                               |
| TSPE-504 | 227 | Loi binomiale $\mathcal{B}(n, p)$ : loi du nombre de succès. Expression à l'aide des coefficients binomiaux                                                                                                                               | conn. | Loi binomiale > expression de la loi                              |
| TSPE-505 | 228 | Modéliser une situation par une succession d'épreuves indépendantes, ou une succession de deux ou trois épreuves quelconques                                                                                                              | s-f   | Probabilités conditionnelles > épreuves indépendantes successives |
| TSPE-506 | 229 | Représenter la situation par un arbre                                                                                                                                                                                                     | s-f   | Probabilités conditionnelles > épreuves indépendantes successives |
| TSPE-507 | 230 | Calculer une probabilité en utilisant l'indépendance, des probabilités conditionnelles, la formule des probabilités totales                                                                                                               | s-f   | Probabilités conditionnelles (notion)                             |
| TSPE-508 | 231 | Modéliser une situation par un schéma de Bernoulli, par une loi binomiale                                                                                                                                                                 | s-f   | Loi binomiale > schéma de Bernoulli                               |
| TSPE-509 | 232 | Utiliser l'expression de la loi binomiale pour résoudre un problème de seuil, de comparaison, d'optimisation relatif à des probabilités de nombre de succès                                                                               | s-f   | Loi binomiale > expression de la loi                              |
| TSPE-510 | 233 | Dans le cadre d'une résolution de problème modélisé par une variable binomiale $X$, calculer numériquement une probabilité du type $P(X = k)$, $P(X \leqslant k)$, $P(k \leqslant X \leqslant k')$, en s'aidant au besoin d'un algorithme | s-f   | Loi binomiale > expression de la loi                              |
| TSPE-511 | 234 | Dans le cadre d'une résolution de problème modélisé par une variable binomiale $X$, chercher un intervalle $I$ pour lequel la probabilité $P(X \in I)$ est inférieure à une valeur donnée $\alpha$, ou supérieure à $1 - \alpha$          | s-f   | Loi binomiale > intervalle de fluctuation                         |
| TSPE-512 | 235 | Expression de la probabilité de $k$ succès dans le schéma de Bernoulli                                                                                                                                                                    | dém.  | Loi binomiale > expression de la loi                              |
| TSPE-513 | 236 | Simulation de la planche de Galton                                                                                                                                                                                                        | algo. | Loi binomiale (notion)                                            |
| TSPE-514 | 237 | Problème de la surréservation. Étant donné une variable aléatoire binomiale $X$ et un réel strictement positif $\alpha$, détermination du plus petit entier $k$ tel que $P(X > k) \leqslant \alpha$                                       | algo. | Loi binomiale > intervalle de fluctuation                         |
| TSPE-515 | 238 | Simulation d'un échantillon d'une variable aléatoire                                                                                                                                                                                      | algo. | Sommes et concentration > échantillons                            |
| TSPE-516 | 239 | Loi géométrique                                                                                                                                                                                                                           | s-f ⁺ | Autres lois > loi géométrique                                     |
| TSPE-517 | 240 | Introduction de la loi de Poisson comme limite de lois binomiales. Interprétation (évènements rares)                                                                                                                                      | s-f ⁺ | Autres lois (notion)                                              |

### Probabilités > Sommes de variables aléatoires (branche `Probabilités`)

| Code     | ex- | Énoncé                                                                                                                                                  | kind  | nœud                                                        |
| -------- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------------- |
| TSPE-518 | 241 | Somme de deux variables aléatoires                                                                                                                      | conn. | Sommes et concentration > espérance et variance d'une somme |
| TSPE-519 | 242 | Linéarité de l'espérance : $E(X + Y) = E(X) + E(Y)$ et $E(aX) = aE(X)$                                                                                  | conn. | Sommes et concentration > espérance et variance d'une somme |
| TSPE-520 | 243 | Dans le cadre de la succession d'épreuves indépendantes, exemples de variables indépendantes $X$, $Y$ et relation d'additivité $V(X + Y) = V(X) + V(Y)$ | conn. | Sommes et concentration > espérance et variance d'une somme |
| TSPE-521 | 244 | Relation $V(aX) = a^2V(X)$                                                                                                                              | conn. | Sommes et concentration > espérance et variance d'une somme |
| TSPE-522 | 245 | Application à l'espérance, la variance et l'écart type de la loi binomiale                                                                              | conn. | Loi binomiale > espérance et variance                       |
| TSPE-523 | 246 | Échantillon de taille $n$ d'une loi de probabilité : liste $(X_1, \ldots, X_n)$ de variables indépendantes identiques suivant cette loi                 | conn. | Sommes et concentration > échantillons                      |
| TSPE-524 | 247 | Espérance, variance, écart type de la somme $S_n = X_1 + \cdots + X_n$ et de la moyenne $M_n = \frac{S_n}{n}$                                           | conn. | Sommes et concentration > échantillons                      |
| TSPE-525 | 248 | Représenter une variable comme somme de variables aléatoires plus simples                                                                               | s-f   | Sommes et concentration > espérance et variance d'une somme |
| TSPE-526 | 249 | Calculer l'espérance d'une variable aléatoire, notamment en utilisant la propriété de linéarité                                                         | s-f   | Sommes et concentration > espérance et variance d'une somme |
| TSPE-527 | 250 | Calculer la variance d'une variable aléatoire, notamment en l'exprimant comme somme de variables aléatoires indépendantes                               | s-f   | Sommes et concentration > espérance et variance d'une somme |
| TSPE-528 | 251 | Espérance et variance de la loi binomiale                                                                                                               | dém.  | Loi binomiale > espérance et variance                       |
| TSPE-529 | 252 | Relation $E(XY) = E(X)E(Y)$ pour des variables aléatoires indépendantes $X$, $Y$. Application à la variance de $X + Y$                                  | s-f ⁺ | Sommes et concentration > espérance et variance d'une somme |

### Probabilités > Concentration, loi des grands nombres (branche `Probabilités`)

| Code     | ex- | Énoncé                                                                                                                                                                                                                                                                                                                                                                                                      | kind  | nœud                                                              |
| -------- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------------------- |
| TSPE-530 | 253 | Inégalité de Bienaymé-Tchebychev. Pour une variable aléatoire $X$ d'espérance $\mu$ et de variance $V$, et quel que soit le réel strictement positif $\delta$ : $P(\lvert X - \mu \rvert \geqslant \delta) \leqslant \frac{V(X)}{\delta^2}$                                                                                                                                                                 | conn. | Sommes et concentration > Bienaymé-Tchebychev                     |
| TSPE-531 | 254 | Inégalité de concentration. Si $M_n$ est la variable aléatoire moyenne d'un échantillon de taille $n$ d'une variable aléatoire d'espérance $\mu$ et de variance $V$, alors pour tout $\delta > 0$, $P(\lvert M_n - \mu \rvert \geqslant \delta) \leqslant \frac{V}{n\delta^2}$                                                                                                                              | conn. | Sommes et concentration > inégalité de concentration              |
| TSPE-532 | 255 | Loi des grands nombres                                                                                                                                                                                                                                                                                                                                                                                      | conn. | Sommes et concentration > loi des grands nombres                  |
| TSPE-533 | 256 | Appliquer l'inégalité de Bienaymé-Tchebychev pour définir une taille d'échantillon, en fonction de la précision et du risque choisi                                                                                                                                                                                                                                                                         | s-f   | Sommes et concentration > inégalité de concentration              |
| TSPE-534 | 257 | Calculer la probabilité de $(\lvert S_n - pn \rvert > \sqrt{n})$, où $S_n$ est une variable aléatoire qui suit une loi binomiale $\mathcal{B}(n, p)$. Comparer avec l'inégalité de Bienaymé-Tchebychev                                                                                                                                                                                                      | algo. | Sommes et concentration > Bienaymé-Tchebychev                     |
| TSPE-535 | 258 | Simulation d'une marche aléatoire                                                                                                                                                                                                                                                                                                                                                                           | algo. | Probabilités conditionnelles > épreuves indépendantes successives |
| TSPE-536 | 259 | Simuler $N$ échantillons de taille $n$ d'une variable aléatoire d'espérance $\mu$ et d'écart type $\sigma$. Calculer l'écart type $s$ de la série des moyennes des échantillons observés, à comparer à $\frac{\sigma}{\sqrt{n}}$. Calculer la proportion des échantillons pour lesquels l'écart entre la moyenne et $\mu$ est inférieur ou égal à $ks$, ou à $k\frac{\sigma}{\sqrt{n}}$, pour $k = 1, 2, 3$ | algo. | Sommes et concentration > loi des grands nombres                  |
| TSPE-537 | 260 | Estimation                                                                                                                                                                                                                                                                                                                                                                                                  | s-f ⁺ | `Statistiques` Échantillonnage > estimation d'une proportion      |
| TSPE-538 | 261 | Marche aléatoire                                                                                                                                                                                                                                                                                                                                                                                            | s-f ⁺ | Probabilités conditionnelles > épreuves indépendantes successives |
| TSPE-539 | 262 | Exemples d'application issus d'autres disciplines pour diverses valeurs de $n$ : sondage (par exemple $n = 1\,000$), étude du sex ratio (par exemple $n = 10^6$), demi-vie d'atomes radioactifs ($n = 10^{23}$)                                                                                                                                                                                             | s-f ⁺ | Sommes et concentration > loi des grands nombres                  |

---

## Les références (`curriculum_point_automatismes`, grade `T_SPE`)

### E. Entretien (règle U5/V1 appliquée) — 23 références

2-201 · 2-202 · 2-203 · 2-204 · 2-206 · 2-207 · 2-208 · 2-209 · 2-210 · 2-212 · 2-213 ·
2-214 · 2-215 · 2-216 · 2-217 · 1SPE-201 · 1SPE-205 · 1SPE-206 · 1SPE-207 · 1SPE-208 ·
1SPE-209 · 1SPE-210 · 1SPE-294

### A. Liste d'automatismes de la 1re reprise en Tle — question A1

La Tle n'a **pas** de partie « Automatismes ». Mais le BO de 1re dit que ses automatismes
« relèvent d'un entraînement régulier **sur l'ensemble du cycle terminal** » (1re + Tle).
Si A1 = oui : les **93 références** de la liste de 1re spé (qui contient déjà celle de
2de), reprises telles quelles avec le grade `T_SPE` (même mécanisme que C16).

---

## Rattachements discutables — TRANCHÉS (David, 2026-10-08 : « je valide les discutables », recos retenues)

1. **« Limite en ±∞ de la fonction exponentielle »** (démonstration de la section Suites,
   TSPE-391) → `Limites de fonctions > croissances comparées`, comme le doc d'écarts (V5,
   validé) ; c'est la limite d'une fonction, démontrée avec les outils des suites.
   Alternative : `Limites de fonctions > limite en un point` (sous-notion « limites aux
   bornes »).
2. **Barycentre et fonction vectorielle de Leibniz** (TSPE-340, 341) → `Vecteurs : sans
coordonnées` (notion), comme le barycentre de 2de (2-305) — c'est du calcul vectoriel,
   plan ou espace. Alternative : `Espace : sans coordonnées`.
3. **Méthode de Monte-Carlo** (exemple du calcul intégral, TSPE-499) → `Intégrale et aire`
   (notion) ; en 1re, la même méthode est sous `Échantillonnage > simulation` (son outil).
   Ici le BO la range dans l'intégration : c'est l'aire qu'on estime.
4. **Algorithme de Brouncker pour ln 2** (TSPE-500) → `Calcul d'intégrales > méthode des
rectangles` (approcher l'aire sous 1/x). Alternative : `Logarithmes` (notion).
5. **Marche aléatoire** (TSPE-535, 538) → `Probabilités conditionnelles > épreuves
indépendantes successives`, comme en 1re (1SPE-344).

## Questions — TOUTES TRANCHÉES (David, 2026-10-08 : « je valide tout »)

> **A1 = oui** : la liste de 1re spé (93 références) reprise avec le grade `T_SPE`.
> **P1 = oui** : « Résoudre des problèmes impliquant des grandeurs et mesures » retirée, les
> quatre autres gardées.

- **A1 — liste d'automatismes en Tle** : reprendre la liste de 1re spé (93 références) avec
  le grade `T_SPE` ? Reco : **oui** — le BO de 1re les attache à « l'ensemble du cycle
  terminal », et la page Programme de Tle doit montrer ce que l'élève doit garder
  automatisé ; même mécanisme que C16.
- **P1 — puces larges** : retirer « Résoudre des problèmes impliquant des grandeurs et mesures :
  longueur, angle, aire, volume » (0 lien), garder les quatre autres (chacune vise un outil
  précis et porte des modèles réels). Reco : **oui**.
- **Validation d'ensemble** : les 7 scissions (+8 points), les 6 refusions, l'entretien
  (23 références), les 4 non-repris sans référence, les 5 discutables.

## Après validation (plan de livraison)

Migration additive générée depuis ce document : 239 points (`TSPE-301`…`TSPE-539`),
références (entretien + A1) ; bloc DO auto-vérifiant (comptes, kinds, 0 sans nœud,
anciens `TSPE-001`…`262` et leurs liens INTACTS) ; test intégral, preuve rouge, mise au
diapason du test de l'ancien seed si besoin, audit, PR, CI, merge, `db:migrate`,
vérification prod.
