# Lot 1spe-b — questions à trancher

Analyse du 2026-10-23 (101 modèles de 1re spé). Chaque question se lit seule. Les verdicts complets sont dans `1spe-b.csv`.

## Q1 — Équations et inéquations eᵘ = eᵛ, eᵘ < eᵛ : quel point ?

**Modèles** : `6fe11613` « Résoudre une équation du type eᵘ = eᶜ », `7179a3b5` « … eᵘ = eᵛ », `6a5e58da` « Résoudre une inéquation du type eᵘ < eᶜ », `d73d7929` « … eᵘ ≤ eᵛ », et la variation 1 de `9a4592bf` (e^(ax+b) = 1). Tag actuel : 1SPE-292 « Signe de la fonction exponentielle ».

**Exemple** (relevé de `d73d7929`, V2) : « Résous dans ℝ l'inéquation e^(−5x−9) ⩽ e^(6x+8) » → S = [−17/11 ; +∞[.

**Ce qui coince** : la borne générale de 1re spé (déduite) admet ces équations : « seulement celles qui se ramènent à eᵘ = eᵛ ou eᵘ < eᵛ par la stricte croissance ». Mais aucun point de la rubrique « Fonction exponentielle » ne parle d'équation ou d'inéquation. Le tag actuel 1SPE-292 (eˣ > 0) ne décrit pas la tâche.

**Options** :

- **A** — 1SPE-405 « Sens de variation de la fonction exponentielle » : la stricte croissance est l'outil même de la résolution.
- **B** — Aucun point de 1re spé : le BO ne contient pas cette capacité ; les modèles restent sans tag pour ce programme.

**Reco** : A. La borne générale les déclare dans le programme, et 1SPE-405 est la propriété qu'on applique.

## Q2 — cos²x + sin²x = 1 en 1re spé ?

**Modèle** : `ee4e2ac6` « Calculer cos x connaissant sin x ». Tag actuel : 1SPE-305 « Cosinus et sinus d'un nombre réel ; lien avec le sinus et le cosinus dans un triangle rectangle ».

**Exemple** (V7) : « On sait que sin x = 1/3 et que x ∈ [π/2 ; π]. Calcule la valeur exacte de cos x » → −2√2/3. Les autres variations donnent sin x = 24/25, 2/9…, avec un intervalle pour le signe de cos x.

**Ce qui coince** : la relation cos²x + sin²x = 1 n'est écrite ni au BO de 1re spé (nouveau programme : cercle, radian, enroulement, cos et sin d'un réel, valeurs remarquables, angles associés), ni dans les bornes. Elle découle du cercle de rayon 1 et de Pythagore (« lien avec le triangle rectangle »), mais la décision l1s-3 limite aussi la trigonométrie à des valeurs lues sur le cercle.

**Options** :

- **A** — TAG 1SPE-305 : la relation découle de la définition sur le cercle trigonométrique et du lien avec le triangle rectangle.
- **B** — Aucun point de 1re spé : relation non écrite au BO, et sin x = 24/25 n'est pas une valeur remarquable.

**Reco** : A, si tu considères la relation comme une conséquence immédiate de la définition (comme les conséquences de l'exponentielle en l1s-5) ; sinon B. Je n'ai pas de préférence forte.

## Q3 — Cercle de diamètre [AB] : 1SPE-323 (démonstration) ou 1SPE-317 ?

**Modèle** : `044a3ae3` « Cercle de diamètre [AB] ». Tag actuel : 1SPE-323 « Ensemble des points M tels que MA·MB = 0 (démonstration avec le produit scalaire) ».

**Exemple** (V1) : « A(3 ; −3), B(5 ; −11). L'ensemble des points M tels que MA·MB = 0 est un cercle. Détermine son centre et son rayon » → I(4 ; −7), r = √17. V3 : « ensemble des M tels que AMB soit rectangle en M ».

**Ce qui coince** : 1SPE-323 est un point-démonstration (borne : « ce qui est démontré : … ; pas plus ») ; le modèle applique le résultat, il ne fait pas la démonstration.

**Options** :

- **A** — Garder 1SPE-323 : c'est l'énoncé du résultat utilisé.
- **B** — 1SPE-317 « Transformation de l'expression MA·MB » : cas k = 0 de MA·MB = MI² − AB²/4 (le modèle `a6f0ca3f`, cas k ≠ 0, y est tagué).
- **C** — 1SPE-436 « Utiliser le produit scalaire pour résoudre un problème géométrique » (point-compétence, sans borne propre).

**Reco** : B, pour rester cohérent avec `a6f0ca3f` et avec la règle des points-démonstration.

## Q4 — P(X ⩾ a), P(X < a), P(a ⩽ X ⩽ b) en 1re spé ?

**Modèle** : `570f91d5` « Probabilité d'un événement du type X ≥ a, X < a ou a ≤ X ≤ b ». Tag actuel : 1SPE-353 « Interpréter en situation les notations {X = a}, {X ⩽ a}, P(X = a), P(X ⩽ a) ». Concerne aussi la V2 de `d683e906` (P(X ⩾ 1)).

**Exemple** (V3) : tableau de loi sur {−2 ; −1 ; 1 ; 4 ; 6}, « P(−1 ⩽ X ⩽ 4) = ? » → 9/20.

**Ce qui coince** : le BO et le point ne nomment que {X = a} et {X ⩽ a}. La 1re techno a la même phrase et tu as tranché (l1t-6) : {X > a}, {X ⩾ a}, {X < a} admis comme contraires, écritures d'intervalle {a ⩽ X ⩽ b} hors point. Rien n'est tranché pour la 1re spé.

**Options** :

- **A** — Comme en techno : V1-V2 (X ⩾ a, X < a) et V4 dans 1SPE-353, V3 (a ⩽ X ⩽ b) à retirer.
- **B** — Plus large en spé : toutes les écritures, intervalle compris (les intervalles sont connus depuis la 2de).
- **C** — Strict : {X = a} et {X ⩽ a} seulement.

**Reco** : B. En spé, {a ⩽ X ⩽ b} n'est qu'une réunion de {X = xₖ} lue sur le tableau, et rien dans le BO de spé n'exclut cette écriture. A si tu préfères aligner les deux voies.

## Q5 — Réunion, intersection, complémentaire : un seul point pour les trois ?

**Modèles** : `9724dc3d` « Intersection, réunion et complémentaire d'ensembles finis » (tag actuel 2-202 « Notion d'ensemble vide ») et `8c31675a` « Réunion, intersection et complémentaire d'intervalles » (tag actuel 2-244 « Intervalles de ℝ ; représentation graphique, notations… »). Ce sont des modèles de grade 1_SPE, mais aucun point de 1re spé ne les décrit : la question se pose en 2de.

**Exemple** (`9724dc3d`, V1) : E = {1 ; 4 ; 7 ; … ; 24}, A = {1 ; 7 ; 10 ; 18 ; 21}, B = {4 ; 7 ; 16 ; 21} : « A ∩ B = ? A ∪ B = ? Ā = ? ». Chaque variation demande les trois. `8c31675a` : V1, V2, V4 demandent I ∩ J et I ∪ J, V3 deux complémentaires dans ℝ.

**Ce qui coince** : la 2de a trois points distincts, 2-404 « Notion de réunion », 2-405 « Notion d'intersection », 2-406 « Notion de complémentaire ». Un modèle n'en porte qu'un. 2-203 « Symboles de base correspondants : Ø, ∈, ⊂, ∩, ∪, {…} » couvre ∩ et ∪, pas le complémentaire.

**Options** :

- **A** — Scinder chaque modèle (une variation ou un modèle par opération), puis taguer 2-404, 2-405 et 2-406.
- **B** — Taguer 2-203 (symboles) et accepter que le complémentaire n'y soit pas.
- **C** — Pour `8c31675a`, garder 2-244 (intervalles) : la tâche est d'écrire le résultat en notation d'intervalle ; pour `9724dc3d`, A ou B.

**Reco** : C pour `8c31675a`, A pour `9724dc3d` (les trois opérations sont des points distincts du BO).

## Q6 — Cartes de cours sur la méthode d'étude d'une fonction

**Modèles** : `318ea542` « Étude de fonction : par quoi commencer » (verso : « Déterminer son ensemble de définition ») et `bb554c62` « Étude de fonction : ce qu'on cherche » (verso : « ses variations ; ses extremums ; ses limites aux bornes de son ensemble de définition ; son signe »). Tag actuel des deux : 1SPE-283 « Étudier les variations d'une fonction ». Le relevé ne contient pas les versos ; je les ai lus dans `templates.json`.

**Ce qui coince** : la borne de 1SPE-283 est « variations par le signe de la dérivée ». L'ensemble de définition n'y est pas (c'est 2-326 en 2de), et les limites de fonctions sont exclues de la 1re spé (borne générale).

**Options** :

- **A** — Garder 1SPE-283 pour les deux cartes, en retirant « limites aux bornes » de `bb554c62`.
- **B** — `318ea542` sans point (méthode générale) ; `bb554c62` corrigée (sans les limites) et taguée 1SPE-283.
- **C** — Les deux sans point de 1re spé ; `bb554c62` telle quelle relève plutôt de la Tle spé (limites).

**Reco** : B. La carte « ce que donne la dérivée » (`03b3d9b3`) reste taguée 1SPE-283 sans difficulté.

## Q7 — Produit cartésien : la notation A × B au point 2-205 ?

**Modèles** : `db8b5dc8` « Un couple appartient-il à A × B ? » (tag actuel 2-205 « Notion de couple et de produit cartésien de deux ensembles ») et la V4 de `0a1ff14f` (« Card(A × B) = ? Card(B × B) = ? »).

**Exemple** (`db8b5dc8`, V2) : « A = {3 ; 6 ; 9} et B = {13 ; 16}. Quels couples appartiennent à A × B ? » → (6 ; 13), (9 ; 13), (3 ; 16).

**Ce qui coince** : la borne de 2-205 (force déduite) dit : notion « rencontrée » seulement, aucune notation E × F citée au BO. Or la borne générale de 1re spé liste « couple, produit cartésien » parmi les notations ensemblistes. Le texte du BO est le même en 2de et en 1re spé : « Ils rencontrent également la notion de couple et celle de produit cartésien de deux ensembles. »

**Options** :

- **A** — Accepter la notation A × B dans 2-205 : la notion est au BO, et l'énoncé de `db8b5dc8` V1 la définit sur place.
- **B** — MODIFIER : écrire « l'ensemble des couples (a ; b) avec a ∈ A et b ∈ B » sans le symbole ×, et Card(A × B) en mots.

**Reco** : A. La borne est déduite, pas une décision, et une notion « rencontrée » sans aucun nom ne serait pas questionnable.
