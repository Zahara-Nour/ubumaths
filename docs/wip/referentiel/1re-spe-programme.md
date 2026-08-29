# Programme de suivi 1ʳᵉ spécialité maths — Thème → Objectif → Point (à relire)

> **But** : source de vérité pour le **seed** du référentiel de programme (tables `curriculum_*`), grade `'1_SPE'`.
> **Source** : « Programme de spécialité de mathématiques de la classe de première de la voie générale » — PDF fourni par David le 2026-08-29 (`Annexe – Programme d'enseignement de spécialité… -515408 (1).pdf`).
> ⚠️ **Ce n'est PAS le programme de l'arrêté du 17 janvier 2019** que la spec Phase 0 mentionnait : c'est le programme en vigueur, qui introduit notamment une partie transversale **« Automatismes »**.
>
> **Statut** : rédaction complète, **en attente de relecture David** avant le seed.
> **6 thèmes · 14 objectifs · 153 points.**
>
> L'ordre suit celui du sommaire du BO (3 parties transversales, puis les 4 thématiques) et donne le `display_order`.

---

## Convention de tags

Les tags encodent directement les rubriques du BO — c'est le texte qui donne la
typologie, on ne l'invente pas.

| Tag     | `kind`          | `exigence`          | Rubrique du BO                                                 |
| ------- | --------------- | ------------------- | -------------------------------------------------------------- |
| `[C]`   | `connaissance`  | `attendu`           | **Contenus**                                                   |
| `[SF]`  | `savoir_faire`  | `attendu`           | **Capacités attendues**                                        |
| `[D]`   | `demonstration` | `attendu`           | **Démonstrations**                                             |
| `[SF+]` | `savoir_faire`  | `approfondissement` | **Approfondissements possibles** et **Exemples d'algorithmes** |

**Deux axes distincts, à ne pas confondre** (c'est la confusion que portait
l'ancien champ `knowledge_type`) :

- `regime_acquisition` — **ce qui prouve la maîtrise**. `fluence` (≥ 5 réussites
  dont ≥ 3 sur les 5 dernières : le geste doit être rapide, fiable, et le rester)
  ou `diversite` (≥ 2 templates distincts, aucun échec récent : la maîtrise se
  prouve sur des cas variés). C'est une décision de mesure, éditable point par
  point.
- `curriculum_point_automatismes` (table de liaison) — **de quel programme ce
  point est un automatisme attendu**. « Automatisme » n'est pas une propriété du
  point : c'est une liste publiée par un programme donné, et un même point peut
  figurer dans plusieurs listes (1ʳᵉ et terminale, par exemple). D'où une
  liaison `(point, niveau)` plutôt qu'un drapeau.

**La partie « Automatismes » du BO ne figure pas dans cet arbre.** Ses points
ne sont pas des contenus de 1ʳᵉ : ce sont des acquis des années antérieures
(seconde pour l'essentiel) que le programme demande d'entretenir. Les créer ici
en dupliquerait la définition — l'erreur même que la refonte du référentiel a
corrigée. Ils vivront dans l'arbre du niveau où ils sont introduits, marqués
une ligne dans `curriculum_point_automatismes` pour le niveau dont ils sont
un attendu d'examen — ce qui permet de les retrouver à travers les programmes
des différentes années.

Au seed, donc : aucune liste d'automatismes, et `regime_acquisition = diversite`
partout. Tu bascules en `fluence` les points que tu décides de travailler par
répétition — « déterminer l'équation de la tangente en un point », par exemple.

> ⏳ **Suite à prévoir** : la couverture du cahier de texte est filtrée sur le
> niveau de la classe (`getCurriculumTree(grade)`). Une fois l'arbre de seconde
> créé, cocher un automatisme de seconde depuis une classe de 1ʳᵉ demandera
> d'étendre cette vue aux points tagués des niveaux antérieurs.

`rang` reste **vide partout** : le programme ne propose aucune échelle de
difficulté. Les objectifs s'afficheront donc en liste avec un compteur `n/m`.
Une échelle 1-4 pourra être ajoutée plus tard, objectif par objectif, depuis la
page Programme.

> ⚠️ **Choix à confirmer** — les « **Exemples d'algorithmes** » du BO ne sont ni
> des attendus ni des approfondissements : ce sont des illustrations proposées à
> l'enseignant. Je les intègre en `[SF+]` parce que ce sont concrètement des
> choses que l'élève fait, et que tu voudras pouvoir cocher que tu les as
> traitées. **11 points** dans tout le programme. Dis-le si tu préfères les exclure.

> ⚠️ **Découpage des puces** — le point est le **grain de suivi** : plus il est
> fin, mieux on repère les trous. Quand une puce du BO enchaîne deux gestes
> qu'un élève peut réussir séparément, je la coupe. Écart assumé avec le texte,
> listé ici pour que tu le voies en relisant. **4 occurrences** :
>
> - §3.1 « Proposer, modéliser une situation… **Déterminer** une relation explicite ou de récurrence… » → 2 points
> - §4.1 « Déterminer graphiquement un nombre dérivé… **Construire** la tangente… » → 2 points
> - §6.2 « Interpréter en situation et utiliser les notations… **Passer** du registre de la langue naturelle au registre symbolique… » → 2 points
> - §5.1 les 4 méthodes de calcul du produit scalaire restent **un seul** point (c'est le choix de méthode qui est l'attendu, pas chaque méthode)

> ⚠️ **Thème 1 : typage interprétatif.** « Vocabulaire ensembliste et logique »
> est rédigé en prose continue dans le BO, **sans** les rubriques
> Contenus/Capacités attendues. Le partage `[C]` / `[SF]` y est donc mon
> interprétation, pas une lecture directe du texte. C'est le seul thème dans ce cas.

---

## 1. Vocabulaire ensembliste et logique

### 1.1 Ensembles

- [C] Notions d'élément d'un ensemble, de sous-ensemble, d'ensemble vide, d'appartenance et d'inclusion, de réunion, d'intersection et de complémentaire
- [C] Symboles de base correspondants : `Ø`, `∈`, `⊂`, `∩`, `∪`, `{ … }`
- [C] Notation des ensembles de nombres et des intervalles
- [C] Notion de couple et de produit cartésien de deux ensembles
- [C] Notation du complémentaire d'un sous-ensemble `A` de `E` : `Ā` (notation des probabilités) ou `E \ A`
- [C] Notation `Card(A)` pour le cardinal d'un ensemble fini

### 1.2 Logique et raisonnement

- [SF] Lire et écrire des propositions contenant les connecteurs logiques « et », « ou »
- [SF] Mobiliser un contre-exemple pour montrer qu'une proposition est fausse
- [SF] Formuler une implication, une équivalence logique, et les mobiliser dans un raisonnement simple
- [SF] Formuler la réciproque d'une implication, la contraposée
- [SF] Employer les expressions « condition nécessaire », « condition suffisante »
- [SF] Identifier le statut des égalités (identité, équation) et celui des lettres utilisées (variable, inconnue, paramètre)
- [SF] Utiliser les quantificateurs (les symboles `∀` et `∃` ne sont pas exigibles) et repérer les quantifications implicites, particulièrement dans les propositions conditionnelles
- [SF] Formuler la négation de propositions quantifiées
- [SF] Produire un raisonnement par disjonction des cas
- [SF] Produire un raisonnement par l'absurde
- [SF] Produire un raisonnement par contraposée

---

## 2. Algorithmique et programmation

### 2.1 Notion de liste

- [C] Génération des listes en extension et en compréhension, en lien avec la notion d'ensemble
- [SF] Générer une liste (en extension, par ajouts successifs ou en compréhension)
- [SF] Manipuler des éléments d'une liste (ajouter, supprimer, etc.) et leurs indices
- [SF] Parcourir une liste
- [SF] Itérer sur les éléments d'une liste

---

## 3. Algèbre

### 3.1 Suites numériques, modèles discrets

**Contenus**

- [C] Exemples de modes de génération d'une suite : explicite `uₙ = f(n)`, par une relation de récurrence `uₙ₊₁ = f(uₙ)`, par un algorithme, par des motifs géométriques
- [C] Notations : `u(n)`, `uₙ`, `(u(n))`, `(uₙ)`
- [C] Suites arithmétiques : exemples, définition, calcul du terme général ; lien avec l'étude d'évolutions successives à accroissements constants ; lien avec les fonctions affines ; calcul de `1 + 2 + … + n`
- [C] Suites géométriques : exemples, définition, calcul du terme général ; lien avec l'étude d'évolutions successives à taux constant ; lien avec la fonction exponentielle ; calcul de `1 + q + … + qⁿ`
- [C] Sens de variation d'une suite
- [C] Introduction intuitive, sur des exemples, de la notion de limite finie ou infinie, ou de l'absence de limite d'une suite

**Capacités attendues**

- [SF] Dans le cadre de l'étude d'une suite, utiliser le registre de la langue naturelle, le registre algébrique, le registre graphique, et passer de l'un à l'autre
- [SF] Proposer, modéliser une situation permettant de générer une suite de nombres
- [SF] Déterminer une relation explicite ou une relation de récurrence pour une suite définie par un motif géométrique, par une question de dénombrement
- [SF] Calculer des termes d'une suite définie explicitement, par récurrence ou par un algorithme
- [SF] Pour une suite arithmétique ou géométrique, calculer le terme général, la somme de termes consécutifs, déterminer le sens de variation
- [SF] Modéliser un phénomène discret à croissance linéaire par une suite arithmétique, un phénomène discret à croissance exponentielle par une suite géométrique
- [SF] Conjecturer, dans des cas simples, la limite éventuelle d'une suite

**Démonstrations**

- [D] Calcul du terme général d'une suite arithmétique, d'une suite géométrique
- [D] Calcul de `1 + 2 + … + n`
- [D] Calcul de `1 + q + … + qⁿ`

**Exemples d'algorithmes**

- [SF+] Calcul de termes d'une suite, de sommes de termes, de seuil
- [SF+] Calcul de factorielle
- [SF+] Liste des premiers termes d'une suite : suites de Syracuse, suite de Fibonacci

**Approfondissements possibles**

- [SF+] Tour de Hanoï
- [SF+] Somme des n premiers carrés, des n premiers cubes
- [SF+] Remboursement d'un emprunt par annuités constantes

### 3.2 Équations, fonctions polynômes du second degré

**Contenus**

- [C] Fonction polynôme du second degré donnée sous forme factorisée : racines, signe, expression de la somme et du produit des racines
- [C] Forme canonique d'une fonction polynôme du second degré ; discriminant ; factorisation éventuelle ; résolution d'une équation du second degré ; signe

**Capacités attendues**

- [SF] Étudier le signe d'une fonction polynôme du second degré donnée sous forme factorisée
- [SF] Déterminer les fonctions polynômes du second degré s'annulant en deux nombres réels distincts
- [SF] Factoriser une fonction polynôme du second degré en diversifiant les stratégies : racine évidente, détection des racines par leur somme et leur produit, identité remarquable, application des formules générales
- [SF] Choisir une forme adaptée (développée réduite, canonique, factorisée) d'une fonction polynôme du second degré dans le cadre de la résolution d'un problème (équation, inéquation, optimisation, variations)

**Démonstrations**

- [D] Résolution de l'équation du second degré

**Approfondissements possibles**

- [SF+] Factorisation d'un polynôme du troisième degré admettant une racine, et résolution de l'équation associée
- [SF+] Factorisation de `xⁿ − 1` par `x − 1`, de `xⁿ − aⁿ` par `x − a`
- [SF+] Déterminer deux nombres réels connaissant leur somme `s` et leur produit `p` comme racines de la fonction polynôme `x ↦ x² − sx + p`

---

## 4. Analyse

### 4.1 Dérivation

**Contenus — point de vue local**

- [C] Taux de variation ; sécantes à la courbe représentative d'une fonction en un point donné
- [C] Nombre dérivé d'une fonction en un point, comme limite du taux de variation ; notation `f'(a)`
- [C] Tangente à la courbe représentative d'une fonction en un point, comme « limite des sécantes » ; pente ; équation `y = f(a) + f'(a)(x − a)`
- [C] Approximation linéaire : fonction affine tangente `x ↦ f(a) + f'(a)(x − a)` et approximation de `f(a + h)` par `f(a) + f'(a)h`

**Contenus — point de vue global**

- [C] Fonction dérivable sur un intervalle ; fonction dérivée
- [C] Fonction dérivée des fonctions carré, cube, inverse, racine carrée
- [C] Opérations sur les fonctions dérivables : somme, produit, inverse, quotient
- [C] Pour `n` dans `ℤ`, fonction dérivée de la fonction `x ↦ xⁿ`
- [C] Fonction valeur absolue : étude de la dérivabilité en 0

**Capacités attendues**

- [SF] Calculer un taux de variation, la pente d'une sécante
- [SF] Interpréter le nombre dérivé en contexte : pente d'une tangente, vitesse instantanée, cout marginal, etc.
- [SF] Déterminer graphiquement un nombre dérivé par la pente de la tangente
- [SF] Construire la tangente en un point à une courbe représentative connaissant le nombre dérivé
- [SF] Déterminer l'équation de la tangente en un point à la courbe représentative d'une fonction
- [SF] Calculer une valeur approchée de `f(a + h)`
- [SF] Dans des cas simples, calculer une fonction dérivée en utilisant les propriétés des opérations sur les fonctions dérivables

**Démonstrations**

- [D] Équation de la tangente en un point à une courbe représentative
- [D] La fonction racine carrée n'est pas dérivable en 0
- [D] Fonction dérivée de la fonction carrée, de la fonction inverse
- [D] Fonction dérivée d'un produit

**Exemple d'algorithme**

- [SF+] Écrire la liste des coefficients directeurs des sécantes pour un pas donné

### 4.2 Variations et courbes représentatives des fonctions

**Contenus**

- [C] Représentation algébrique et graphique de fonctions paires, impaires ; traduction géométrique
- [C] Lien entre le sens de variation d'une fonction dérivable sur un intervalle et le signe de sa fonction dérivée ; caractérisation des fonctions constantes
- [C] Nombre dérivé en un extrémum, tangente à la courbe représentative

**Capacités attendues**

- [SF] Étudier les variations d'une fonction ; déterminer les extrémums
- [SF] Résoudre un problème d'optimisation
- [SF] Exploiter les variations d'une fonction pour établir une inégalité ; étudier la position relative de deux courbes représentatives
- [SF] Étudier, en lien avec la dérivation, une fonction polynôme du second degré : variations, extrémum, allure selon le signe du coefficient de `x²`

**Exemple d'algorithme**

- [SF+] Méthode de Newton, en se limitant à des cas favorables

### 4.3 Fonction exponentielle

**Contenus**

- [C] Définition de la fonction exponentielle comme unique fonction dérivable sur `ℝ` vérifiant `f' = f` et `f(0) = 1` (existence et unicité admises) ; notation `exp(x)`
- [C] Pour tous réels `x` et `y`, `exp(x + y) = exp(x)exp(y)` et `exp(x)exp(−x) = 1` ; nombre `e` ; notation `eˣ`
- [C] Signe, sens de variation et courbe représentative de la fonction exponentielle ; lien avec les suites géométriques

**Capacités attendues**

- [SF] Transformer une expression en utilisant les propriétés algébriques de la fonction exponentielle
- [SF] Pour `a` réel, dérivée de la fonction `t ↦ e^(at)`
- [SF] Pour une valeur numérique strictement positive de `k`, représenter graphiquement les fonctions `t ↦ e^(−kt)` et `t ↦ e^(kt)`
- [SF] Modéliser une situation par une croissance, une décroissance exponentielle (évolution d'un capital à taux fixe, décroissance radioactive)

**Exemples d'algorithmes**

- [SF+] Construction de l'exponentielle par la méthode d'Euler
- [SF+] Détermination d'une valeur approchée de `e` à l'aide de la suite `((1 + 1/n)ⁿ)`

**Approfondissements possibles**

- [SF+] Unicité d'une fonction `f` dérivable sur `ℝ` vérifiant `f' = f` et `f(0) = 1`
- [SF+] Pour tous réels `x` et `y`, `exp(x + y) = exp(x)exp(y)`
- [SF+] La fonction exponentielle est strictement positive et croissante

### 4.4 Trigonométrie

**Contenus**

- [C] Cercle trigonométrique ; longueur d'arc ; radian
- [C] Enroulement de la droite sur le cercle trigonométrique ; image d'un nombre réel
- [C] Cosinus et sinus d'un nombre réel ; lien avec le sinus et le cosinus dans un triangle rectangle ; valeurs remarquables

**Capacités attendues**

- [SF] Placer un point sur le cercle trigonométrique
- [SF] Par lecture du cercle trigonométrique, déterminer, pour des valeurs remarquables de `x`, les cosinus et sinus d'angles associés à `x`

**Démonstration**

- [D] Calcul de `cos(π/4)`, `sin(π/4)`, `cos(π/3)`, `sin(π/3)`

**Exemple d'algorithme**

- [SF+] Approximation de `π` par la méthode d'Archimède

---

## 5. Géométrie

### 5.1 Calcul vectoriel et produit scalaire

**Contenus**

- [C] Produit scalaire à partir de la projection orthogonale et de la formule avec le cosinus ; caractérisation de l'orthogonalité
- [C] Bilinéarité, symétrie ; en base orthonormée, expression du produit scalaire et de la norme, critère d'orthogonalité ; expression des coordonnées dans une base orthonormée en termes de produits scalaires avec les vecteurs de la base
- [C] Développement de `‖u⃗ + v⃗‖²` et `‖u⃗ − v⃗‖²` ; formule d'Al-Kashi
- [C] Transformation de l'expression `MA⃗ · MB⃗`

**Capacités attendues**

- [SF] Utiliser le produit scalaire pour démontrer une orthogonalité, pour calculer un angle, une longueur dans le plan
- [SF] En vue de la résolution d'un problème, calculer le produit scalaire de deux vecteurs en choisissant une méthode adaptée (projection orthogonale, coordonnées, normes et angle, normes)
- [SF] Utiliser le produit scalaire pour résoudre un problème géométrique

**Démonstrations**

- [D] Formule d'Al-Kashi (démonstration avec le produit scalaire)
- [D] Ensemble des points `M` tels que `MA⃗ · MB⃗ = 0` (démonstration avec le produit scalaire)

**Approfondissements possibles**

- [SF+] Loi des sinus
- [SF+] Concourance des hauteurs d'un triangle
- [SF+] Les médianes d'un triangle concourent au centre de gravité

### 5.2 Géométrie repérée

> Dans cette section, le plan est rapporté à un repère orthonormé.

**Contenus**

- [C] Vecteur normal à une droite ; le vecteur de coordonnées `(a, b)` est normal à la droite d'équation `ax + by + c = 0`
- [C] Projection orthogonale d'un point sur une droite
- [C] Équation de cercle

**Capacités attendues**

- [SF] Déterminer une équation cartésienne d'une droite connaissant un point et un vecteur normal
- [SF] Déterminer les coordonnées du projeté orthogonal d'un point sur une droite
- [SF] Déterminer et utiliser l'équation d'un cercle donné par son centre et son rayon
- [SF] Reconnaitre une équation de cercle, déterminer centre et rayon
- [SF] Utiliser un repère pour étudier une configuration

**Approfondissements possibles**

- [SF+] Recherche de l'ensemble des points équidistants de l'axe des abscisses et d'un point donné
- [SF+] Déterminer l'intersection d'un cercle ou d'une parabole d'équation `y = ax² + bx + c` avec une droite parallèle à un axe

---

## 6. Probabilités et statistiques

### 6.1 Probabilités conditionnelles et indépendance

**Contenus**

- [C] Indépendance de deux évènements
- [C] Partition de l'univers (systèmes complets d'évènements) ; formule des probabilités totales
- [C] Succession de deux épreuves indépendantes ; représentation par un arbre ou un tableau
- [C] Pour `n ≤ 4`, répétition de `n` épreuves de Bernoulli indépendantes et identiques

**Capacités attendues**

- [SF] Dans des cas simples, calculer une probabilité à l'aide de la formule des probabilités totales
- [SF] Savoir utiliser ou justifier l'indépendance de deux évènements
- [SF] Représenter la succession de deux épreuves indépendantes par un arbre ou un tableau
- [SF] Pour `n ≤ 4`, représenter l'arbre associé à la répétition de `n` épreuves de Bernoulli indépendantes et identiques afin de calculer des probabilités

**Exemple d'algorithme**

- [SF+] Méthode de Monte-Carlo : estimation de l'aire sous la parabole, estimation du nombre `π`

**Approfondissements possibles**

- [SF+] Exemples de succession de plusieurs épreuves indépendantes
- [SF+] Exemples de marches aléatoires

### 6.2 Variables aléatoires réelles

> Le programme ne considère que des univers finis et des variables aléatoires réelles.

**Contenus**

- [C] Variable aléatoire réelle : modélisation du résultat numérique d'une expérience aléatoire ; formalisation comme fonction définie sur l'univers et à valeurs réelles
- [C] Loi d'une variable aléatoire
- [C] Espérance, variance, écart type d'une variable aléatoire
- [C] Linéarité de l'espérance
- [C] Formule de König-Huygens

**Capacités attendues**

- [SF] Interpréter en situation et utiliser les notations `{X = a}`, `{X ≤ a}`, `P(X = a)`, `P(X ≤ a)`
- [SF] Passer du registre de la langue naturelle au registre symbolique et inversement
- [SF] Modéliser une situation à l'aide d'une variable aléatoire
- [SF] Déterminer la loi de probabilité d'une variable aléatoire
- [SF] Calculer une espérance, une variance, un écart type
- [SF] Utiliser la notion d'espérance dans une résolution de problème (mise pour un jeu équitable, etc.)

**Exemples d'algorithmes**

- [SF+] Algorithme renvoyant l'espérance, la variance ou l'écart type d'une variable aléatoire
- [SF+] Fréquence d'apparition des lettres d'un texte donné, en français, en anglais

**Approfondissements possibles**

- [SF+] Pour `X` variable aléatoire, étude de la fonction du second degré `x ↦ E((X − x)²)`

### 6.3 Expérimentations

- [SF] Simuler une variable aléatoire avec Python ou un tableur
- [SF] Lire, comprendre et écrire une fonction Python renvoyant la moyenne d'un échantillon de taille `n` d'une variable aléatoire
- [SF] Étudier sur des exemples la distance entre la moyenne d'un échantillon simulé de taille `n` d'une variable aléatoire et l'espérance de cette variable aléatoire
- [SF] Simuler, avec Python ou un tableur, `N` échantillons de taille `n` d'une variable aléatoire d'espérance `μ` et d'écart type `σ` ; si `m` désigne la moyenne d'un échantillon, calculer la proportion des cas où l'écart entre `m` et `μ` est inférieur ou égal à `2σ/√n`

---

## Récapitulatif

| #   | Thème                              | Objectifs | `[C]`  | `[SF]` | `[D]`  | `[SF+]` | Total   |
| --- | ---------------------------------- | --------- | ------ | ------ | ------ | ------- | ------- |
| 1   | Vocabulaire ensembliste et logique | 2         | 6      | 11     | 0      | 0       | 17      |
| 2   | Algorithmique et programmation     | 1         | 1      | 4      | 0      | 0       | 5       |
| 3   | Automatismes                       | 5         | 0      | 17     | 0      | 0       | 17      |
| 4   | Algèbre                            | 2         | 8      | 11     | 4      | 9       | 32      |
| 5   | Analyse                            | 4         | 18     | 17     | 5      | 8       | 48      |
| 6   | Géométrie                          | 2         | 7      | 8      | 2      | 5       | 22      |
| 7   | Probabilités et statistiques       | 3         | 9      | 14     | 0      | 6       | 29      |
|     | **Total**                          | **19**    | **49** | **82** | **11** | **28**  | **170** |

> Chiffres **comptés dans le fichier**, pas estimés.
>
> Les 2 sous-parties de la logique comptent chacune comme un objectif — d'où 14
> et non 6.
>
> Les **28 `[SF+]`** portent `exigence = approfondissement` ; les **125 autres** > `attendu`. `regime_acquisition = diversite` partout au seed, et aucune liste
> d'automatismes (cf. convention ci-dessus).
