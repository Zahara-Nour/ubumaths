# Audit des facettes de l'arbre des notions

> **PROPOSITION du 2026-10-09, mise à jour avec les décisions de David.** Rien n'est écrit en base.
>
> - **Tranché par David (2026-10-09)** : les sections A et B ; **Q1** oui (« optimisation » se fond dans « variations ») ;
>   **Q2** oui (« Décimaux : calculs » garde ses opérations, les techniques y sont versées) ; **Q3 « double et moitié »** :
>   deux nœuds, rien ne bouge ; **Q4** : les trois paires « avec / sans coordonnées » sont refondues maintenant.
> - **Tranché ensuite par David (2026-10-09)** : **Q3 « triple et tiers »** : un seul nœud, sous la multiplication ;
>   **noms de Q4** gardés (« Vecteurs », « Espace », « Orthogonalité et distances dans l'espace », et les sous-notions
>   proposées) ; **Q5** : les notions-activités sont gardées, « Suites et modélisation » devient « Modèles d'évolution » ;
>   **Q7** : les sous-notions que le lot viderait s'archivent (selon les réponses à D51 et D69).
> - **Q6 validée par David (2026-10-09)** : dans « Situations de proportionnalité », « reconnaître » devient « caractérisation » ;
>   « appliquer » s'archive, ses points de résolution de problèmes (CM1-130, CM2-116, 6-191) et son modèle vont sur la notion ;
>   une sous-notion « coefficient de proportionnalité » reçoit 5-088 et les 2 modèles « Déterminer le coefficient de
>   proportionnalité » (aujourd'hui sous « reconnaître »). Place de 4-059 (partage proportionnel) : à confirmer.
> - **Reste à trancher** : la place de 4-059 et la section D (renommages).
>
> Principe (ADR 0020 § 3 précisé le 2026-10-09) : **une notion n'a qu'un découpage, par contenu mathématique** — un objet,
> une propriété ou une technique de calcul —, jamais par activité, par registre ou par outil ; ce que l'élève fait, ce sont
> les points du programme qui le disent. Une sous-notion ou une notion **s'archive**, elle ne se supprime pas (ADR 0019).

## En bref

- **56 facettes archivées** (55 de la première version, plus « optimisation » : Q1) et **5 techniques** de « Décimaux : calculs » versées dans les opérations (Q2).
- **Q4** : 3 notions renommées (« Vecteurs », « Espace », « Orthogonalité et distances dans l'espace »), les 3 notions « avec coordonnées » archivées ; leurs 13 sous-notions sont déplacées sous la notion refondue (5, dont 3 renommées) ou fusionnées dans une sous-notion de même contenu (8) ; « positions relatives de droites et plans » est renommée « positions relatives et intersections ».
- **Nouvelles sous-notions** : « définition » (suites arithmétiques, suites géométriques) et « vecteur normal et équation cartésienne ».
- Par rapport à l'arbre d'aujourd'hui, tout compris (audit, lot et crible) : **230 modèles**, **177 points** et **51 exercices** changent de nœud (un nœud renommé compte comme un changement). Les libellés des points ne changent pas.
- **Simulation** (arbre d'aujourd'hui → audit A, B, Q1, Q2, Q4 → lot de l'étape 2 → crible) : 495 couples (modèle, programme), 476 avec un point ; **aucune violation** de la règle (le point est sur le nœud du modèle ou sur sa notion), un seul point par programme partout, aucune destination absente ou archivée.
- **Couples du lot et du crible touchés par Q4** : 20 (géométrie de Tle spé) ; 3 changent de point (D36, D37, D38), les autres gardent leur point sous la notion refondue (table en section Q4).

## Ce qui change par rapport à la version précédente

- **Q1** : « Dérivation > optimisation » se fond dans « variations » ; 1SPE-284 et les 17 exercices suivent.
- **Q2** : « Décimaux : calculs » perd ses 5 sous-notions de technique ; 16 points et 22 modèles vont sur l'opération qu'ils travaillent (détail en section A).
- **Q4** : refonte des trois paires (section Q4). Pour D36, la proposition précédente (« positions relatives par le calcul ») est remplacée : le modèle va sous « Espace > colinéarité et alignement », avec TSPE-371 sur la notion (voir la table).
- Comptes : 192 → 230 modèles déplacés, 84 → 177 points, 35 → 51 exercices ; la simulation reste sans violation.
- Questions : Q1, Q2 et Q4 sont tranchées ; Q3 se réduit à « triple et tiers » ; s'ajoute « les noms de Q4 ».

### Rappel : ce que l'audit change par rapport au lot et au crible

- **Dérivation** : « étude de fonction » et « optimisation » se fondent dans « variations ». Les questions D16 et A78 se lisent « Dérivation > variations ».
- **Suites arithmétiques et géométriques** : une sous-notion « définition » reçoit « reconnaître », « raison » et la partie « définition » de « calculer un terme » (D72-D73 et D82-D83 y vont).
- **Équations différentielles** : « y′ = ay », « y′ = ay + b », « y′ = ay + f » n'ont plus de sous-notion, tout va sur la notion.
- **Loi binomiale** : « reconnaître une loi » se fond dans « schéma de Bernoulli » (C43 et son modèle frère, TSPE-508, TCOMP-295, TTECHNO-062).
- **Problèmes de dénombrement** : ses trois facettes disparaissent ; « Python : générer les paires… » suit TSPE-325 sous « Combinaisons > combinaisons ».
- **Géométrie de l'espace** : la refonte Q4 (section Q4) ; D36, D37, D38 changent de point.
- Les autres déplacements touchent des modèles **sans tag** (primaire surtout).

## Section A — les 39 notions qui montrent le symptôme

Le symptôme : une sous-notion porte des modèles ou des exercices mais aucun point, ou le lot y trouvait un désaccord entre sous-notions sœurs. « Espace : avec coordonnées » est traitée avec Q4.

### Nombres et calculs > Entiers : addition et soustraction

- **Avant** (🔸 = archivée) — notion : points CP 2, CE2 1; 🔸 somme : 30 modèles; 🔸 différence : 20 modèles; complément : 10 modèles · points CP 1; tables : 9 modèles · points CP 1, CE1 1, CE2 1, CM1 1, CM2 1; double et moitié : 7 modèles · points CP 2, CE1 1; triple et tiers : 5 modèles; calcul astucieux : 12 modèles · points CP 7, CE1 5, CE2 2, CM1 1, CM2 1; calcul posé : points CP 1, CE1 1, CE2 1.
- **Après** (🆕 = nouvelle ou venue d'ailleurs) — notion : points CP 2, CE2 1; complément : 13 modèles · points CP 1; tables : 21 modèles · points CP 1, CE1 1, CE2 1, CM1 1, CM2 1; double et moitié : 7 modèles · points CP 2, CE1 1; triple et tiers : 5 modèles; calcul astucieux : 47 modèles · points CP 7, CE1 5, CE2 2, CM1 1, CM2 1; calcul posé : points CP 1, CE1 1, CE2 1.
- **Ce qui bouge** :
  - « somme » archivée → répartie selon le contenu de chaque modèle (ci-dessous) (30 modèle(s), 0 exercice(s)) — Répète la notion elle-même (une somme, c'est l'addition) ; chaque modèle va vers le fait ou la technique qu'il entraîne.
  - « différence » archivée → répartie selon le contenu de chaque modèle (ci-dessous) (20 modèle(s), 0 exercice(s)) — Idem pour la soustraction.
  - 9 modèle(s) → « calcul astucieux » : « Compléter une addition à trou » ×8, « Compléter une addition » — addition à trou à plusieurs chiffres : un écart calculé mentalement
  - 4 modèle(s) → « tables » : « Compléter une addition à trou » ×4 — addition à trou à un chiffre : les tables « dans les deux sens »
  - 10 modèle(s) → « calcul astucieux » : « Calculer une somme » ×10 — somme calculée mentalement en s'appuyant sur la numération (ajouter des unités, des dizaines, deux nombres < 100…)
  - 4 modèle(s) → « tables » : « Calculer une somme » ×4 — somme de deux nombres à un chiffre : un fait des tables
  - 3 modèle(s) → « complément » : « Calculer une somme » ×3 — la somme vaut 10, 100 ou une dizaine ronde : les compléments
  - 7 modèle(s) → « calcul astucieux » : « Compléter une soustraction à trou » ×7 — soustraction à trou à plusieurs chiffres : un écart calculé mentalement
  - 4 modèle(s) → « tables » : « Calculer une différence (résultat positif) » ×2, « Compléter une soustraction à trou », « Compléter une soustraction à trou (résultat positif) » — différence de nombres à un chiffre : les tables « dans les deux sens »
  - 9 modèle(s) → « calcul astucieux » : « Calculer une différence (résultat positif) » ×9 — différence calculée mentalement (enlever des unités, des dizaines, des centaines…)

### Nombres et calculs > Entiers : multiplication

- **Avant** (🔸 = archivée) — tables : 9 modèles · points CE1 1, CE2 1, CM1 1, CM2 1; 🔸 produit : 28 modèles · points CP 1, CE1 2, CE2 1; carrés : 1 modèle · points 5e 1; décomposition : 1 modèle · points CE2 1; distributivité : 20 modèles · points CE1 1, CE2 1, CM1 1, CM2 1, 5e 1; double et moitié : 7 modèles · points CE1 1, CE2 1; triple et tiers : 5 modèles; quadruple et quart : 5 modèles; puissances de 10 : 3 modèles · points CE1 1, CE2 1, CM1 1; produits particuliers : 4 modèles · points CE1 1, CE2 1; calcul astucieux : 2 modèles · points CE2 2, CM1 3, CM2 1; calcul posé : points CE2 1, CM1 1.
- **Après** (🆕 = nouvelle ou venue d'ailleurs) — notion : 1 modèle · points CP 1, CE1 2, CE2 1; tables : 19 modèles · points CE1 1, CE2 1, CM1 1, CM2 1; carrés : 1 modèle · points 5e 1; décomposition : 1 modèle · points CE2 1; distributivité : 22 modèles · points CE1 1, CE2 1, CM1 1, CM2 1, 5e 1; double et moitié : 7 modèles · points CE1 1, CE2 1; triple et tiers : 5 modèles; quadruple et quart : 5 modèles; puissances de 10 : 3 modèles · points CE1 1, CE2 1, CM1 1; produits particuliers : 8 modèles · points CE1 1, CE2 1; calcul astucieux : 13 modèles · points CE2 2, CM1 3, CM2 1; calcul posé : points CE2 1, CM1 1.
- **Ce qui bouge** :
  - « produit » archivée → répartie selon le contenu de chaque modèle (ci-dessous) (28 modèle(s), 0 exercice(s), points CP-017, CE1-023, CE1-024, CE2-017) — Répète la notion (un produit, c'est la multiplication) ; ses points (sens, symbole, commutativité, vocabulaire) vont sur la notion, comme pour l'addition ; les modèles vers le fait ou la technique qu'ils entraînent.
  - point CP-017 → (notion) — le sens de la multiplication vaut pour toute la notion (comme CP-014 pour l'addition)
  - point CE1-023 → (notion) — le symbole × : toute la notion
  - point CE1-024 → (notion) — la commutativité : toute la notion
  - point CE2-017 → (notion) — le vocabulaire facteur, produit, multiple : toute la notion
  - 4 modèle(s) → « produits particuliers » : « Compléter une multiplication à trou » ×4 — produits par 25 et par 50, 4 × 25 = 100 : les produits particuliers
  - 11 modèle(s) → « calcul astucieux » : « Compléter une multiplication à trou » ×6, « Multiplier par 20 » ×2, « Calculer un produit d'entiers », « Multiplier deux multiples de $10$ » … — multiplier par 20, par des dizaines ou des centaines : calcul mental (CE2-027, CM1-044, CM2-046)
  - 10 modèle(s) → « tables » : « Compléter une multiplication à trou » ×9, « Calculer un produit d'entiers » — produit ou multiplication à trou dans les tables
  - 2 modèle(s) → « distributivité » : « Calculer un produit d'entiers » ×2 — a × b calculé en décomposant b (la correction le fait) : la distributivité (CE2-028)
  - 1 modèle(s) → (notion) : « Chiffre des unités d'un produit » — chiffre des unités d'un produit : un raisonnement sur la multiplication, sans technique propre

### Nombres et calculs > Décimaux : calculs

- **Avant** (🔸 = archivée) — notion : points 5e 2; additionner : 9 modèles · points CM1 1, CM2 3, 6e 1; soustraire : 4 modèles · points CM1 1, CM2 1, 6e 1; multiplier : 15 modèles · points 6e 3; diviser : 12 modèles · points 6e 2, 5e 1; 🔸 puissances de 10 : 9 modèles · points CM1 2, CM2 2, 6e 2; 🔸 distributivité : 3 modèles; 🔸 double et moitié : 3 modèles · points CM2 3; 🔸 calcul astucieux : 7 modèles · points CM2 2; 🔸 calcul posé : points CM1 2, CM2 3.
- **Après** (🆕 = nouvelle ou venue d'ailleurs) — notion : points CM1 1, 6e 1, 5e 2; additionner : 11 modèles · points CM1 1, CM2 3, 6e 1; soustraire : 4 modèles · points CM1 1, CM2 1, 6e 1; multiplier : 34 modèles · points CM1 2, CM2 5, 6e 4; diviser : 13 modèles · points CM1 1, CM2 5, 6e 2, 5e 1.
- **Ce qui bouge** :
  - « puissances de 10 » archivée → répartie selon le contenu de chaque modèle (ci-dessous) (9 modèle(s), 0 exercice(s), points CM1-041, CM1-042, CM2-042, CM2-043, 6-115, 6-116) — Q2 (David) : technique versée dans les opérations — multiplier ou diviser par 10, 100, 1 000, 0,1… : chaque point et chaque modèle va sur son opération.
  - « double et moitié » archivée → répartie selon le contenu de chaque modèle (ci-dessous) (3 modèle(s), 0 exercice(s), points CM2-037, CM2-048, CM2-049) — Q2 (David) : technique versée dans les opérations — le double est une multiplication, la moitié une division.
  - « distributivité » archivée → répartie selon le contenu de chaque modèle (ci-dessous) (3 modèle(s), 0 exercice(s)) — Q2 (David) : technique versée dans les opérations — la distributivité de la multiplication : ses modèles vont sous « multiplier ».
  - « calcul astucieux » archivée → répartie selon le contenu de chaque modèle (ci-dessous) (7 modèle(s), 0 exercice(s), points CM2-051, CM2-052) — Q2 (David) : technique versée dans les opérations — chaque procédure va sur l'opération qu'elle calcule.
  - « calcul posé » archivée → (notion) (0 modèle(s), 0 exercice(s), points CM1-050, CM1-052, CM2-055, CM2-056, CM2-057) — Q2 (David) : technique versée dans les opérations — chaque technique posée va sur son opération ; « additions et soustractions posées » (CM1-050) couvre deux opérations : sur la notion.
  - point CM1-041 → « multiplier » — multiplier par 10
  - point CM1-042 → « diviser » — diviser par 10
  - point CM1-050 → (notion) — additions ET soustractions posées : deux opérations, sur la notion
  - point CM1-052 → « multiplier » — multiplications posées
  - point CM2-037 → « diviser » — la moitié des impairs jusqu'à 15 : une division par 2
  - point CM2-042 → « multiplier » — multiplier par 10, 100, 1 000
  - point CM2-043 → « diviser » — diviser par 10, 100, 1 000
  - point CM2-048 → « multiplier » — le double : une multiplication par 2
  - point CM2-049 → « diviser » — la moitié : une division par 2
  - point CM2-051 → « multiplier » — multiplier par 5
  - point CM2-052 → « multiplier » — multiplier par 50
  - point CM2-055 → « multiplier » — multiplication posée
  - point CM2-056 → « diviser » — divisions décimales posées
  - point CM2-057 → « diviser » — divisions décimales posées
  - point 6-115 → « multiplier » — multiplier par 0,1, 0,01, 0,001
  - point 6-116 → (notion) — le lien entre multiplier par 0,1 et diviser par 10 : deux opérations, sur la notion
  - 1 modèle(s) → « diviser » : « Trouver la moitié » — la moitié d'un impair (lu en prod) : une division par 2
  - 2 modèle(s) → « additionner » : « Additionner par regroupements » ×2 — additionner par regroupements
  - 8 modèle(s) → « multiplier » : « Utiliser la distributivité » ×3, « Calculer astucieusement un produit » ×3, « Multiplier par $1.5$ », « Multiplier par $2.5$ » — distributivité ou produit astucieux : une multiplication
  - 6 modèle(s) → « multiplier » : « Multiplier par $0.5$ » ×2, « Multiplier par $0.1$ » ×2, « Multiplier par $0.001$ », « Multiplier par $0.01$ » — multiplier par 0,1, 0,01, 0,001 ou 0,5
  - 5 modèle(s) → « multiplier » : « Calculer un produit » ×5 — multiplier par 10, 100, 1 000 ou 0,1… (lu en prod)

### Nombres et calculs > Puissances : calculs

- **Avant** (🔸 = archivée) — notion : points 2de 2; multiplier : 4 modèles · points 4e 2, 3e 1; diviser : 4 modèles · points 3e 1; puissance de puissance : 4 modèles; 🔸 mélange : 1 modèle · 2 exercices · points 5e 1, 4e 1.
- **Après** (🆕 = nouvelle ou venue d'ailleurs) — notion : 1 modèle · 2 exercices · points 5e 1, 4e 1, 2de 2; multiplier : 4 modèles · points 4e 2, 3e 1; diviser : 4 modèles · points 3e 1; puissance de puissance : 4 modèles.
- **Ce qui bouge** :
  - « mélange » archivée → (notion) (1 modèle(s), 2 exercice(s), points 5-032, 4-018) — « Mélange » est un format d'exercice, pas un contenu.

### Nombres et calculs > Racines carrées : sens et écritures

- **Avant** (🔸 = archivée) — définition : 4 modèles · points 4e 2; 🔸 égalités : 1 modèle; 🔸 réduire : 2 modèles · 2 exercices.
- **Après** (🆕 = nouvelle ou venue d'ailleurs) — définition : 4 modèles · points 4e 2.
- **Ce qui bouge** :
  - « égalités » archivée → « Nombres et calculs > Racines carrées : calculs > propriétés » (1 modèle(s), 0 exercice(s)) — Vérifier une égalité, c'est appliquer les règles de calcul (son seul modèle y est déjà, par le lot).
  - « réduire » archivée → « Nombres et calculs > Racines carrées : calculs > calculer » (2 modèle(s), 2 exercice(s)) — Réduire √50 en 5√2 est un calcul (fusion déjà proposée par le lot).

### Proportionnalité > Échelle d'une carte

- **Avant** (🔸 = archivée) — notion : points 6e 1; 🔸 trouver l'échelle : 2 modèles; 🔸 utiliser l'échelle : 2 modèles.
- **Après** (🆕 = nouvelle ou venue d'ailleurs) — notion : 4 modèles · points 6e 1.
- **Ce qui bouge** :
  - « trouver l'échelle » archivée → (notion) (2 modèle(s), 0 exercice(s)) — Activité ; l'échelle est un seul contenu.
  - « utiliser l'échelle » archivée → (notion) (2 modèle(s), 0 exercice(s)) — Activité ; l'échelle est un seul contenu.

### Proportionnalité > Vitesse

- **Avant** (🔸 = archivée) — notion : points 4e 1; 🔸 calculer : 1 modèle; 🔸 convertir : 1 modèle.
- **Après** (🆕 = nouvelle ou venue d'ailleurs) — notion : 2 modèles · points 4e 1.
- **Ce qui bouge** :
  - « calculer » archivée → (notion) (1 modèle(s), 0 exercice(s)) — Activité ; la vitesse (grandeur quotient) est un seul contenu.
  - « convertir » archivée → (notion) (1 modèle(s), 0 exercice(s)) — Activité ; la vitesse (grandeur quotient) est un seul contenu.

### Algèbre > Équations : premier degré

- **Avant** (🔸 = archivée) — notion : 6 modèles · points 5e 2, 4e 1, 3e 1, 2de 1; ax = b : 10 modèles; ax + b = c : 9 modèles · points 4e 1, 2de 1; ax + b = cx + d : points 4e 1; 🔸 mettre en équation : points 5e 1, 4e 1.
- **Après** (🆕 = nouvelle ou venue d'ailleurs) — notion : 6 modèles · points 5e 3, 4e 1, 3e 1, 2de 1; ax = b : 10 modèles; ax + b = c : 9 modèles · points 4e 1, 2de 1; ax + b = cx + d : points 4e 2.
- **Ce qui bouge** :
  - « mettre en équation » archivée → (notion) (0 modèle(s), 0 exercice(s), points 5-044, 4-071) — Activité ; chaque point de mise en équation va sur le type d'équation qu'il vise.
  - point 4-071 → « ax + b = cx + d » — mettre en équation avec ax + b = cx + d : ce type d'équation

### Algèbre > Équations : second degré

- **Avant** (🔸 = archivée) — notion : 1 exercice; discriminant : 2 modèles · 6 exercices · points 1re spé 2; équations incomplètes : vide; se ramener au second degré : 1 exercice; 🔸 mettre en équation : 1 exercice.
- **Après** (🆕 = nouvelle ou venue d'ailleurs) — notion : 2 exercices; discriminant : 5 modèles · 6 exercices · points 1re spé 2; équations incomplètes : vide; se ramener au second degré : 1 exercice.
- **Ce qui bouge** :
  - « mettre en équation » archivée → (notion) (0 modèle(s), 1 exercice(s)) — Activité.

### Algèbre > Inéquations : second degré

- **Avant** (🔸 = archivée) — 🔸 inéquations du second degré : 1 modèle · 4 exercices · points 1re spé 1; 🔸 mettre en inéquation : 1 exercice.
- **Après** (🆕 = nouvelle ou venue d'ailleurs) — notion : 1 modèle · 5 exercices · points 1re spé 1.
- **Ce qui bouge** :
  - « mettre en inéquation » archivée → (notion) (0 modèle(s), 1 exercice(s)) — Activité.
  - « inéquations du second degré » archivée → (notion) (1 modèle(s), 4 exercice(s), points 1SPE-250) — Seule sous-notion restante, identique à la notion : inutile.

### Algèbre > Inégalités

- **Avant** (🔸 = archivée) — notion : points 2de 1; règles de calcul : points 2de 1; 🔸 signe d'une expression : 2 modèles; comparer et encadrer : points 2de 3.
- **Après** (🆕 = nouvelle ou venue d'ailleurs) — notion : points 2de 1; règles de calcul : 2 modèles · points 2de 1; comparer et encadrer : points 2de 3.
- **Ce qui bouge** :
  - « signe d'une expression » archivée → « règles de calcul » (2 modèle(s), 0 exercice(s)) — Ses deux modèles y sont déjà (lot) ; le signe d'une expression se travaille aussi sous les fonctions (« signe »).

### Fonctions > Fonction carré

- **Avant** (🔸 = archivée) — définition et courbe : points 3e 1, 2de 2; variations : points 2de 2; 🔸 comparer des images : 1 exercice; x² = k, x² < k : 2 exercices · points 3e 1, 2de 1.
- **Après** (🆕 = nouvelle ou venue d'ailleurs) — définition et courbe : points 3e 1, 2de 2; variations : 1 exercice · points 2de 2; x² = k, x² < k : 2 exercices · points 3e 1, 2de 1.
- **Ce qui bouge** :
  - « comparer des images » archivée → « variations » (0 modèle(s), 1 exercice(s)) — Comparer des images, c'est utiliser les variations.

### Fonctions > Dérivation

- **Avant** (🔸 = archivée) — notion : 1 exercice · points Tle spé 1; taux de variation : 1 exercice · points 1re spé 3, 1re techno 3; nombre dérivé : 3 modèles · 5 exercices · points 1re spé 3, 1re techno 2; tangente : 3 modèles · 8 exercices · points 1re spé 5, 1re techno 4; approximation affine : points 1re spé 2; fonctions dérivées : 8 modèles · 13 exercices · points 1re spé 4, 1re techno 2, Tle techno 1; opérations sur les dérivées : 2 exercices · points 1re spé 3, 1re techno 2, Tle spé 1, Tle comp. 1; dérivabilité en un point : points 1re spé 2; variations : 5 modèles · 8 exercices · points 1re spé 3, 1re techno 1; 🔸 étude de fonction : 4 modèles · 4 exercices · points 1re spé 1, 1re techno 2, Tle spé 1, Tle comp. 1, Tle techno 1; position relative de deux courbes : 2 exercices · points 1re spé 1; 🔸 optimisation : 17 exercices · points 1re spé 1; fonctions composées : 3 modèles · 1 exercice · points Tle spé 3, Tle comp. 2.
- **Après** (🆕 = nouvelle ou venue d'ailleurs) — notion : 1 exercice · points Tle spé 1; taux de variation : 1 exercice · points 1re spé 3, 1re techno 3; nombre dérivé : 2 modèles · 5 exercices · points 1re spé 3, 1re techno 2; tangente : 3 modèles · 8 exercices · points 1re spé 5, 1re techno 4; approximation affine : points 1re spé 2; fonctions dérivées : 4 modèles · 13 exercices · points 1re spé 4, 1re techno 2, Tle techno 1; opérations sur les dérivées : 5 modèles · 2 exercices · points 1re spé 3, 1re techno 2, Tle spé 1, Tle comp. 1; dérivabilité en un point : points 1re spé 2; variations : 9 modèles · 28 exercices · points 1re spé 5, 1re techno 3, Tle spé 1, Tle comp. 1, Tle techno 1; position relative de deux courbes : 2 exercices · points 1re spé 1; fonctions composées : 3 modèles · 1 exercice · points Tle spé 3, Tle comp. 2.
- **Ce qui bouge** :
  - « étude de fonction » archivée → « variations » (4 modèle(s), 4 exercice(s), points 1SPE-283, 1TECHNO-076, 1TECHNO-081, TSPE-416, TCOMP-231, TTECHNO-049) — « Étudier les variations, déterminer les extremums » : le même contenu que « variations » (lien signe de f′, tableau de variations, extremums).
  - « optimisation » archivée → « variations » (0 modèle(s), 17 exercice(s), points 1SPE-284) — Q1 (David) : un problème d'optimisation, c'est chercher un extremum ; 1SPE-284 et les 17 exercices suivent.

### Fonctions > Continuité

- **Avant** (🔸 = archivée) — notion : points Tle spé 1; continuité en un point : points Tle spé 3, Tle comp. 1; 🔸 lecture graphique : 1 modèle; valeurs intermédiaires : 2 modèles · 2 exercices · points Tle spé 4, Tle comp. 2; fonction réciproque : points Tle comp. 1; encadrement d'une solution : points Tle spé 3, Tle comp. 2.
- **Après** (🆕 = nouvelle ou venue d'ailleurs) — notion : points Tle spé 1; continuité en un point : 1 modèle · points Tle spé 3, Tle comp. 1; valeurs intermédiaires : 1 modèle · 2 exercices · points Tle spé 4, Tle comp. 2; fonction réciproque : points Tle comp. 1; encadrement d'une solution : 1 modèle · points Tle spé 3, Tle comp. 2.
- **Ce qui bouge** :
  - « lecture graphique » archivée → « continuité en un point » (1 modèle(s), 0 exercice(s)) — Registre (lecture graphique) ; son modèle y est déjà (lot).

### Équations différentielles > y′ = f

- **Avant** (🔸 = archivée) — notion : points Tle spé 1; primitives : notion : 1 modèle · points Tle spé 3, Tle comp. 3; primitives des fonctions de référence : 2 modèles · 1 exercice · points Tle spé 2, Tle comp. 1; 🔸 formes u′eᵘ, 2uu′, u′/u : 2 modèles · 2 exercices · points Tle comp. 1; forme (v′∘u)×u′ : 1 modèle · 4 exercices · points Tle spé 1; 🔸 sinus et cosinus : 1 modèle.
- **Après** (🆕 = nouvelle ou venue d'ailleurs) — notion : points Tle spé 1; primitives : notion : 1 modèle · points Tle spé 3, Tle comp. 3; primitives des fonctions de référence : 3 modèles · 1 exercice · points Tle spé 2, Tle comp. 1; forme (v′∘u)×u′ : 3 modèles · 6 exercices · points Tle spé 1, Tle comp. 1.
- **Ce qui bouge** :
  - « formes u′eᵘ, 2uu′, u′/u » archivée → « forme (v′∘u)×u′ » (2 modèle(s), 2 exercice(s), points TCOMP-252) — Mêmes mathématiques (fusion déjà proposée par le lot).
  - « sinus et cosinus » archivée → « primitives des fonctions de référence » (1 modèle(s), 0 exercice(s)) — Sinus et cosinus sont des fonctions de référence (son modèle y est déjà, par le lot).

### Équations différentielles > y′ = ay

- **Avant** (🔸 = archivée) — 🔸 solution générale : points Tle spé 2, Tle comp. 2; 🔸 condition initiale : 1 modèle.
- **Après** (🆕 = nouvelle ou venue d'ailleurs) — notion : 1 modèle · points Tle spé 2, Tle comp. 2.
- **Ce qui bouge** :
  - « solution générale » archivée → (notion) (0 modèle(s), 0 exercice(s), points TSPE-464, TSPE-472, TCOMP-253, TCOMP-257) — Après la fusion de « condition initiale » (lot), seule sous-notion restante : identique à la notion.
  - « condition initiale » archivée → (notion) (1 modèle(s), 0 exercice(s)) — Activité (fixer la constante) ; le BO la met dans la même puce que la résolution.

### Équations différentielles > y′ = ay + b

- **Avant** (🔸 = archivée) — notion : points Tle spé 1, Tle comp. 2; 🔸 solution générale : 1 modèle · points Tle spé 1, Tle comp. 1; 🔸 condition initiale : 1 modèle.
- **Après** (🆕 = nouvelle ou venue d'ailleurs) — notion : 2 modèles · points Tle spé 2, Tle comp. 3.
- **Ce qui bouge** :
  - « solution générale » archivée → (notion) (1 modèle(s), 0 exercice(s), points TSPE-469, TCOMP-255) — Idem.
  - « condition initiale » archivée → (notion) (1 modèle(s), 0 exercice(s)) — Idem.

### Équations différentielles > y′ = ay + f

- **Avant** (🔸 = archivée) — 🔸 solution particulière donnée : 1 modèle; 🔸 solution générale : points Tle spé 1.
- **Après** (🆕 = nouvelle ou venue d'ailleurs) — notion : 1 modèle · points Tle spé 1.
- **Ce qui bouge** :
  - « solution générale » archivée → (notion) (0 modèle(s), 0 exercice(s), points TSPE-470) — Idem.
  - « solution particulière donnée » archivée → (notion) (1 modèle(s), 0 exercice(s)) — Idem.

### Suites > Suites arithmétiques

- **Avant** (🔸 = archivée) — notion : 4 exercices · points 1re spé 2, 1re ens. sci. 1, 1re techno 1, Tle techno 1; 🔸 reconnaître : 4 modèles · 1 exercice · points 1re ens. sci. 1, 1re techno 2, Tle techno 1; 🔸 raison : 2 modèles · points 1re techno 1, Tle techno 1; terme général : 2 modèles · 2 exercices · points 1re spé 3, 1re ens. sci. 1, 1re techno 1, Tle techno 1; 🔸 calculer un terme : 4 modèles · points 1re ens. sci. 1; somme des termes : 2 modèles · 3 exercices · points 1re spé 3, Tle techno 3.
- **Après** (🆕 = nouvelle ou venue d'ailleurs) — notion : 1 modèle · 4 exercices · points 1re spé 3, 1re ens. sci. 2, 1re techno 2, Tle techno 1; terme général : 5 modèles · 2 exercices · points 1re spé 2, 1re ens. sci. 1, 1re techno 1, Tle techno 1; somme des termes : 2 modèles · 3 exercices · points 1re spé 3, Tle techno 3; 🆕 définition : 8 modèles · 1 exercice · points 1re ens. sci. 1, 1re techno 2, Tle techno 2.
- **Ce qui bouge** :
  - 🆕 « définition » — La définition par la relation de récurrence et la raison : y vont « reconnaître », « raison » et la partie « définition » de « calculer un terme ».
  - « reconnaître » archivée → « définition » (4 modèle(s), 1 exercice(s), points 1GEN-013, 1TECHNO-035, 1TECHNO-046, TTECHNO-020) — Activité : reconnaître une suite arithmétique, c'est sa définition.
  - « raison » archivée → « définition » (2 modèle(s), 0 exercice(s), points 1TECHNO-048, TTECHNO-022) — La raison fait partie de la définition (u(n+1) = u(n) + r).
  - « calculer un terme » archivée → « définition » (4 modèle(s), 0 exercice(s), points 1GEN-018) — Activité : calculer un terme par la récurrence relève de la définition, par la formule explicite du terme général (le lot y a déjà mis deux modèles).
  - point 1GEN-018 → (notion) — calculer un terme par une relation fonctionnelle OU de récurrence : couvre définition et terme général
  - point 1TECHNO-048 → (notion) — le sens de variation à l'aide de la raison : les variations sont sur la notion (1SPE-228, 1GEN-015)

### Suites > Suites géométriques

- **Avant** (🔸 = archivée) — notion : 6 exercices · points 1re spé 2, 1re ens. sci. 1, 1re techno 1, Tle techno 1; 🔸 reconnaître : 2 exercices · points 1re ens. sci. 1, 1re techno 2, Tle techno 1; 🔸 raison : 2 modèles · points 1re techno 1, Tle techno 1; terme général : 2 modèles · 1 exercice · points 1re spé 3, 1re ens. sci. 1, 1re techno 1, Tle techno 1; 🔸 calculer un terme : 4 modèles · points 1re ens. sci. 1; somme des termes : 2 modèles · 2 exercices · points 1re spé 3, Tle techno 3.
- **Après** (🆕 = nouvelle ou venue d'ailleurs) — notion : 1 modèle · 6 exercices · points 1re spé 3, 1re ens. sci. 2, 1re techno 2, Tle techno 1; terme général : 6 modèles · 1 exercice · points 1re spé 2, 1re ens. sci. 1, 1re techno 1, Tle techno 1; somme des termes : 2 modèles · 2 exercices · points 1re spé 3, Tle techno 3; 🆕 définition : 4 modèles · 2 exercices · points 1re ens. sci. 1, 1re techno 2, Tle techno 2.
- **Ce qui bouge** :
  - 🆕 « définition » — Idem pour les suites géométriques.
  - « reconnaître » archivée → « définition » (0 modèle(s), 2 exercice(s), points 1GEN-028, 1TECHNO-036, 1TECHNO-047, TTECHNO-021) — Idem.
  - « raison » archivée → « définition » (2 modèle(s), 0 exercice(s), points 1TECHNO-049, TTECHNO-023) — Idem.
  - « calculer un terme » archivée → « définition » (4 modèle(s), 0 exercice(s), points 1GEN-039) — Idem.
  - point 1GEN-039 → (notion) — idem, suites géométriques
  - point 1TECHNO-049 → (notion) — idem, suites géométriques

### Suites > Suites et modélisation

- **Avant** (🔸 = archivée) — notion : 7 exercices · points 1re spé 1, 1re ens. sci. 1, 1re techno 1, Tle spé 1; 🔸 placements : 2 modèles · 1 exercice · points 1re spé 1; 🔸 pourcentages : 1 modèle · 2 exercices; seuil : 3 modèles · 1 exercice · points 1re spé 1, 1re ens. sci. 2, 1re techno 1, Tle spé 1, Tle comp. 2; 🔸 algorithmes : 2 modèles · 2 exercices · points 1re spé 2, 1re techno 2, Tle spé 1, Tle comp. 1, Tle techno 1.
- **Après** (🆕 = nouvelle ou venue d'ailleurs) — notion : 3 modèles · 12 exercices · points 1re spé 2, 1re ens. sci. 1, 1re techno 1, Tle spé 1; seuil : 4 modèles · 1 exercice · points 1re spé 1, 1re ens. sci. 2, 1re techno 1, Tle spé 1, Tle comp. 2.
- **Ce qui bouge** :
  - « algorithmes » archivée → (notion) (2 modèle(s), 2 exercice(s), points 1SPE-236, 1SPE-239, 1TECHNO-050, 1TECHNO-051, TSPE-393, TCOMP-218, TTECHNO-030) — Outil : le type « algorithme » des points le dit déjà ; chaque point va sur le contenu qu'il calcule.
  - « placements » archivée → (notion) (2 modèle(s), 1 exercice(s), points 1SPE-242) — Un contexte (financier) de modélisation.
  - « pourcentages » archivée → (notion) (1 modèle(s), 2 exercice(s)) — Un contexte de modélisation.
  - point 1SPE-236 → « Suites > Généralités sur les suites » — algorithme : calcul de termes et de sommes de termes d'une suite quelconque
  - point 1SPE-239 → « Suites > Généralités sur les suites » — algorithme : liste des premiers termes (Syracuse, Fibonacci)
  - point 1TECHNO-050 → « Suites > Généralités sur les suites » — algorithme : calculer un terme, une somme finie de termes
  - point 1TECHNO-051 → « Suites > Généralités sur les suites > représentation graphique » — algorithme : lister des termes et les représenter
  - point TSPE-393 → « Suites > Limites de suites » — algorithme : valeurs approchées de π, e, √2… par des suites
  - point TCOMP-218 → « Suites > Limites de suites » — idem
  - point TTECHNO-030 → « Suites > Généralités sur les suites » — algorithme : sommes des premiers carrés, cubes, termes (comme 1SPE-241, sur la notion)
  - 1 modèle(s) → « Suites > Généralités sur les suites » : « Valeur renvoyée par une fonction Python qui calcule un terme » — une fonction Python qui calcule un terme : le calcul des termes, avec son point 1SPE-236

### Matrices > Calcul matriciel

- **Avant** (🔸 = archivée) — notion : points Expertes 2; opérations : 1 modèle · points Expertes 1; 🔸 produit : 1 modèle; inverse : 1 modèle · points Expertes 2; puissances de matrices : 1 modèle · points Expertes 3.
- **Après** (🆕 = nouvelle ou venue d'ailleurs) — notion : points Expertes 2; opérations : 2 modèles · points Expertes 1; inverse : 1 modèle · points Expertes 2; puissances de matrices : 1 modèle · points Expertes 3.
- **Ce qui bouge** :
  - « produit » archivée → « opérations » (1 modèle(s), 0 exercice(s)) — Le produit est une des opérations (TEXP-319) ; son modèle y est déjà (crible).

### Probabilités > Probabilités conditionnelles

- **Avant** (🔸 = archivée) — notion : 1 exercice · points 2de 2, Tle spé 1, Tle comp. 1; arbres pondérés : 5 modèles · 9 exercices · points 2de 5; tableaux croisés : 3 modèles · 3 exercices · points 2de 2; indépendance : 3 modèles · 4 exercices · points 1re spé 2, 1re ens. sci. 2, 1re techno 2; probabilités totales : points 1re spé 2, 1re techno 2, Tle techno 2; inversion du conditionnement : points 2de 1; épreuves indépendantes successives : 3 exercices · points 1re spé 6, 1re ens. sci. 2, 1re techno 2, Tle spé 5, Tle comp. 1; 🔸 problèmes en contexte : 3 modèles · 3 exercices.
- **Après** (🆕 = nouvelle ou venue d'ailleurs) — notion : 4 exercices · points 2de 2, Tle spé 1, Tle comp. 1; arbres pondérés : 3 modèles · 9 exercices · points 2de 5; tableaux croisés : 4 modèles · 3 exercices · points 2de 2; indépendance : 2 modèles · 4 exercices · points 1re spé 2, 1re ens. sci. 2, 1re techno 2; probabilités totales : 1 modèle · points 1re spé 2, 1re techno 2, Tle techno 2; inversion du conditionnement : 3 modèles · points 2de 1; épreuves indépendantes successives : 1 modèle · 3 exercices · points 1re spé 6, 1re ens. sci. 2, 1re techno 2, Tle spé 5, Tle comp. 1.
- **Ce qui bouge** :
  - « problèmes en contexte » archivée → (notion) (3 modèle(s), 3 exercice(s)) — Registre (« en contexte ») ; chaque modèle va là où le met sa mathématique.
  - 1 modèle(s) → « tableaux croisés » : « Parmi les… : modéliser un tableau croisé ou un sondage » — modéliser par un tableau croisé (2-395 est sur la notion)

### Probabilités > Variables aléatoires

- **Avant** (🔸 = archivée) — notion : points 1re spé 3; loi d'une variable aléatoire : 4 modèles · 3 exercices · points 1re spé 3, 1re techno 2; 🔸 compléter une loi : 3 modèles; espérance : 4 modèles · 9 exercices · points 1re spé 3, 1re techno 2, Tle comp. 1, Tle techno 1; variance et écart-type : 3 modèles · 3 exercices · points 1re spé 4; 🔸 jeux et gains : 3 modèles · 5 exercices · points 1re spé 1.
- **Après** (🆕 = nouvelle ou venue d'ailleurs) — notion : points 1re spé 3; loi d'une variable aléatoire : 7 modèles · 3 exercices · points 1re spé 3, 1re techno 2; espérance : 7 modèles · 12 exercices · points 1re spé 4, 1re techno 2, Tle comp. 1, Tle techno 1; variance et écart-type : 3 modèles · 3 exercices · points 1re spé 4.
- **Ce qui bouge** :
  - « compléter une loi » archivée → « loi d'une variable aléatoire » (3 modèle(s), 0 exercice(s)) — Fusion déjà proposée par le lot.
  - « jeux et gains » archivée → « espérance » (3 modèle(s), 5 exercice(s), points 1SPE-358) — Un contexte (les jeux) : c'est l'espérance (1SPE-358 « utiliser la notion d'espérance… mise pour un jeu équitable »).

### Dénombrement > Problèmes de dénombrement

- **Avant** (🔸 = archivée) — notion : points Tle spé 2; 🔸 dénombrer avec contraintes : 2 modèles; 🔸 reconnaître le modèle : 2 modèles · points Tle spé 1; 🔸 algorithmique : 1 modèle · points Tle spé 3.
- **Après** (🆕 = nouvelle ou venue d'ailleurs) — notion : 4 modèles · points Tle spé 3.
- **Ce qui bouge** :
  - « dénombrer avec contraintes » archivée → (notion) (2 modèle(s), 0 exercice(s)) — Activité.
  - « reconnaître le modèle » archivée → (notion) (2 modèle(s), 0 exercice(s), points TSPE-318) — Activité ; TSPE-318 (« reconnaître les objets à dénombrer ») vaut pour toute la notion.
  - « algorithmique » archivée → (notion) (1 modèle(s), 0 exercice(s), points TSPE-323, TSPE-324, TSPE-325) — Outil ; chaque algorithme va sur le contenu qu'il génère.
  - point TSPE-323 → « Dénombrement > Combinaisons > triangle de Pascal » — algorithme : les coefficients binomiaux par la relation de Pascal
  - point TSPE-324 → « Dénombrement > Arrangements et permutations > permutations » — algorithme : générer les permutations
  - point TSPE-325 → « Dénombrement > Combinaisons > combinaisons » — algorithme : générer les parties à 2, 3 éléments (combinaisons)
  - 1 modèle(s) → « Dénombrement > Combinaisons > combinaisons » : « Python : générer les paires, les triplets, les parties » — générer les parties à 2 ou 3 éléments, ce sont des combinaisons ; suit son point TSPE-325

### Les notions du symptôme sans facette

Le découpage y est déjà par contenu : le symptôme venait d'ailleurs. Rien à changer dans l'arbre.

| Notion                                               | D'où venait le symptôme                                                                                                                     |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Nombres et calculs > Entiers : priorités opératoires | « sans parenthèses » porte des modèles sans point propre : un contenu, couvert par les points de la notion (5-004, 5-007).                  |
| Nombres et calculs > Relatifs : calculs              | « carré » porte un modèle sans point : un contenu, hors programme assumé.                                                                   |
| Arithmétique > Congruences                           | désaccord entre sœurs réglé par le lot (D3 : le modèle va sous « équations ax ≡ b [n] », sous-notion de contenu).                           |
| Proportionnalité > Évolutions                        | désaccords réglés par le lot (D62, D63) ; découpage par contenu.                                                                            |
| Fonctions > Second degré                             | désaccords réglés par le lot (remontées de 1SPE-253 et 1SPE-287 à la notion ; racines par Δ sous « discriminant ») ; découpage par contenu. |
| Fonctions > Fonction exponentielle                   | désaccords réglés par le lot (D16, D17) ; découpage par contenu.                                                                            |
| Fonctions > Fonctions trigonométriques               | désaccords réglés par le lot (angles associés, tags hors programme retirés) ; découpage par contenu.                                        |
| Fonctions > Limites de fonctions                     | « formes indéterminées » porte un modèle sans point propre : un contenu, le point de la notion (TSPE-403) le couvre.                        |
| Équations différentielles > Généralités              | désaccord du lot (D90 : tag de Tle spé retiré) ; découpage par contenu.                                                                     |
| Suites > Limites de suites                           | « suites majorées, minorées » : un contenu (D69 reste une question du lot).                                                                 |
| Géométrie > Produit scalaire                         | désaccord réglé par le lot (D39) ; « calculer un produit scalaire » est un nom d'activité pour un contenu : renommage proposé (section D).  |
| Grandeurs et mesures > Aires                         | « triangle rectangle » porte deux modèles sans point : un contenu (une figure), hors programme assumé.                                      |
| Grandeurs et mesures > Unités et conversions         | « unités simples » et « unités composées » portent des modèles sans point : des contenus, hors programme assumé.                            |

## Section B — les autres facettes, trouvées par le balayage des 540 sous-notions

Le balayage a relevé 98 sous-notions dont le nom évoque une activité, un registre ou un outil. La plupart sont de faux positifs : un nom d'activité pour un contenu sans doublon (« Entiers : numération > comparer » = l'ordre ; « Calcul littéral > factoriser » = une technique) — elles ne bougent pas, un renommage est proposé en section D. Les vraies facettes sont ci-dessous.

### Algèbre > Inéquations : premier degré

- **Avant** (🔸 = archivée) — notion : 1 exercice · points 2de 1; ax + b < c : points 3e 1, 2de 1; ax + b < cx + d : vide; 🔸 mettre en inéquation : points 2de 1.
- **Après** (🆕 = nouvelle ou venue d'ailleurs) — notion : 1 exercice · points 2de 2; ax + b < c : points 3e 1, 2de 1; ax + b < cx + d : vide.
- **Ce qui bouge** :
  - « mettre en inéquation » archivée → (notion) (0 modèle(s), 0 exercice(s), points 2-278) — Activité.

### Fonctions > Convexité

- **Avant** (🔸 = archivée) — notion : 3 exercices · points Tle spé 2, Tle comp. 1; caractérisations : 1 modèle · points Tle spé 2, Tle comp. 3; dérivée seconde : 2 modèles · points Tle spé 1, Tle comp. 1; point d'inflexion : 1 modèle · points Tle spé 1, Tle comp. 1; inégalités de convexité : 1 modèle · 1 exercice · points Tle spé 3; 🔸 lecture graphique : 2 modèles · points Tle spé 2, Tle comp. 1.
- **Après** (🆕 = nouvelle ou venue d'ailleurs) — notion : 2 modèles · 3 exercices · points Tle spé 4, Tle comp. 2; caractérisations : 1 modèle · points Tle spé 2, Tle comp. 3; dérivée seconde : 2 modèles · points Tle spé 1, Tle comp. 1; point d'inflexion : 1 modèle · points Tle spé 1, Tle comp. 1; inégalités de convexité : 1 modèle · 1 exercice · points Tle spé 3.
- **Ce qui bouge** :
  - « lecture graphique » archivée → (notion) (2 modèle(s), 0 exercice(s), points TSPE-418, TSPE-419, TCOMP-264) — Registre ; ses points lisent à la fois convexité, concavité et points d'inflexion : leur place est la notion.

### Fonctions > Fonction inverse

- **Avant** (🔸 = archivée) — définition et courbe : points 2de 1, Tle techno 2; variations : points 2de 1, Tle techno 1; 🔸 comparer des images : vide; 1/x = k, 1/x < k : points 2de 1.
- **Après** (🆕 = nouvelle ou venue d'ailleurs) — définition et courbe : points 2de 1, Tle techno 2; variations : points 2de 1, Tle techno 1; 1/x = k, 1/x < k : points 2de 1.
- **Ce qui bouge** :
  - « comparer des images » archivée → « variations » (0 modèle(s), 0 exercice(s)) — Activité ; vide.

### Fonctions > Fonction racine carrée

- **Avant** (🔸 = archivée) — définition et courbe : points 2de 1; variations : vide; 🔸 comparer des images : vide; √x = k, √x < k : points 2de 1.
- **Après** (🆕 = nouvelle ou venue d'ailleurs) — définition et courbe : points 2de 1; variations : vide; √x = k, √x < k : points 2de 1.
- **Ce qui bouge** :
  - « comparer des images » archivée → « variations » (0 modèle(s), 0 exercice(s)) — Activité ; vide.

### Graphes > Vocabulaire des graphes

- **Avant** (🔸 = archivée) — sommets, arêtes, degré : 2 modèles · points Expertes 3; graphe orienté : vide; 🔸 modélisation par un graphe : 2 modèles · points Expertes 1.
- **Après** (🆕 = nouvelle ou venue d'ailleurs) — notion : 2 modèles · points Expertes 1; sommets, arêtes, degré : 2 modèles · points Expertes 3; graphe orienté : vide.
- **Ce qui bouge** :
  - « modélisation par un graphe » archivée → (notion) (2 modèle(s), 0 exercice(s), points TEXP-335) — Activité (modéliser).

### Intégration > Intégrale et aire

- **Avant** (🔸 = archivée) — notion : 1 exercice · points Tle spé 2, Tle comp. 2; aire algébrique : 1 modèle · 1 exercice · points Tle spé 2, Tle comp. 3; aire entre deux courbes : 1 modèle · 2 exercices · points Tle spé 1, Tle comp. 1; 🔸 lecture graphique : 1 modèle · 1 exercice · points Tle spé 1, Tle comp. 1.
- **Après** (🆕 = nouvelle ou venue d'ailleurs) — notion : 1 exercice · points Tle spé 2, Tle comp. 2; aire algébrique : 2 modèles · 2 exercices · points Tle spé 3, Tle comp. 4; aire entre deux courbes : 1 modèle · 2 exercices · points Tle spé 1, Tle comp. 1.
- **Ce qui bouge** :
  - « lecture graphique » archivée → « aire algébrique » (1 modèle(s), 1 exercice(s), points TSPE-485, TCOMP-274) — Registre ; estimer une intégrale par une aire, c'est l'intégrale comme aire.

### Intégration > Valeur moyenne

- **Avant** (🔸 = archivée) — 🔸 calcul : 1 modèle · points Tle spé 1, Tle comp. 2; 🔸 encadrement : 1 modèle · points Tle spé 1, Tle comp. 2; 🔸 interprétation : 1 modèle · points Tle spé 1, Tle comp. 1.
- **Après** (🆕 = nouvelle ou venue d'ailleurs) — notion : 3 modèles · points Tle spé 3, Tle comp. 5.
- **Ce qui bouge** :
  - « calcul » archivée → (notion) (1 modèle(s), 0 exercice(s), points TSPE-483, TCOMP-268, TCOMP-277) — Activité ; la valeur moyenne est un seul contenu.
  - « encadrement » archivée → (notion) (1 modèle(s), 0 exercice(s), points TSPE-486, TCOMP-269, TCOMP-275) — Activité.
  - « interprétation » archivée → (notion) (1 modèle(s), 0 exercice(s), points TSPE-493, TCOMP-281) — Activité (interpréter).

### Matrices > Suites et matrices

- **Avant** (🔸 = archivée) — notion : points Expertes 1; suites couplées : 1 modèle · 1 exercice · points Expertes 3; 🔸 modélisation : 1 modèle · points Expertes 1.
- **Après** (🆕 = nouvelle ou venue d'ailleurs) — notion : 1 modèle · points Expertes 2; suites couplées : 1 modèle · 1 exercice · points Expertes 3.
- **Ce qui bouge** :
  - « modélisation » archivée → (notion) (1 modèle(s), 0 exercice(s), points TEXP-336) — Activité (modéliser).

### Probabilités > Loi binomiale

- **Avant** (🔸 = archivée) — notion : points Tle spé 1, Tle comp. 2, Tle techno 2; schéma de Bernoulli : 1 modèle · points 1re techno 2, Tle spé 2, Tle comp. 3; 🔸 reconnaître une loi : 1 modèle · points Tle spé 1, Tle comp. 1, Tle techno 1; calcul de probabilités : 2 modèles · points Tle spé 2, Tle comp. 2, Tle techno 2; intervalle de fluctuation : points Tle spé 2, Tle comp. 1; coefficients binomiaux : 1 modèle · points Tle spé 2, Tle comp. 2, Tle techno 3; espérance et variance : 1 modèle · points Tle spé 2, Tle comp. 2, Tle techno 2.
- **Après** (🆕 = nouvelle ou venue d'ailleurs) — notion : points Tle spé 1, Tle comp. 2, Tle techno 2; schéma de Bernoulli : 2 modèles · points 1re techno 2, Tle spé 3, Tle comp. 4, Tle techno 1; calcul de probabilités : 2 modèles · points Tle spé 4, Tle comp. 2, Tle techno 3; intervalle de fluctuation : points Tle spé 2, Tle comp. 1; coefficients binomiaux : vide; espérance et variance : 1 modèle · points Tle spé 2, Tle comp. 2, Tle techno 2.
- **Ce qui bouge** :
  - « reconnaître une loi » archivée → « schéma de Bernoulli » (1 modèle(s), 0 exercice(s), points TSPE-508, TCOMP-295, TTECHNO-062) — Activité : reconnaître une loi binomiale, c'est reconnaître un schéma de Bernoulli et ses paramètres.

### Suites > Généralités sur les suites

- **Avant** (🔸 = archivée) — notion : 1 exercice · points 1re spé 3; 🔸 calculer un terme : 5 modèles · 2 exercices · points 1re spé 1, 1re techno 1; explicite ou par récurrence : 1 modèle · 1 exercice · points 1re spé 1, 1re techno 1; 🔸 deviner le terme général : 3 modèles · points 1re spé 1; représentation graphique : 3 modèles · points 1re spé 1, 1re ens. sci. 4, 1re techno 4; sens de variation : 5 modèles · 2 exercices · points 1re spé 1, 1re techno 1.
- **Après** (🆕 = nouvelle ou venue d'ailleurs) — notion : 1 modèle · 1 exercice · points 1re spé 5, 1re techno 1, Tle techno 1; explicite ou par récurrence : 6 modèles · 2 exercices · points 1re spé 3, 1re techno 2; représentation graphique : 3 modèles · points 1re spé 1, 1re ens. sci. 4, 1re techno 5; sens de variation : 3 modèles · 2 exercices · points 1re spé 1, 1re techno 1.
- **Ce qui bouge** :
  - « calculer un terme » archivée → « explicite ou par récurrence » (5 modèle(s), 2 exercice(s), points 1SPE-223, 1TECHNO-043) — Activité : calculer un terme, c'est utiliser le mode de génération de la suite.
  - « deviner le terme général » archivée → « explicite ou par récurrence » (3 modèle(s), 0 exercice(s), points 1SPE-222) — Activité : trouver une relation explicite ou de récurrence.
  - point 1SPE-236 → (notion) — algorithme : calcul de termes et de sommes de termes d'une suite quelconque
  - point 1SPE-239 → (notion) — algorithme : liste des premiers termes (Syracuse, Fibonacci)
  - point 1TECHNO-050 → (notion) — algorithme : calculer un terme, une somme finie de termes
  - point 1TECHNO-051 → « représentation graphique » — algorithme : lister des termes et les représenter
  - point TTECHNO-030 → (notion) — algorithme : sommes des premiers carrés, cubes, termes (comme 1SPE-241, sur la notion)
  - 1 modèle(s) → (notion) : « Valeur renvoyée par une fonction Python qui calcule un terme » — une fonction Python qui calcule un terme : le calcul des termes, avec son point 1SPE-236

Conservées comme contenus, malgré leur nom : « arbres pondérés » et « tableaux croisés » (des objets mathématiques), « représentation graphique » d'une suite et « courbe » d'une fonction (des objets), « méthode d'Euler » et « méthode des rectangles » (des techniques), « Suites et modélisation > seuil » (le rang de seuil).

## Section Q4 — les trois paires « avec / sans coordonnées », refondues par objet

Décision de David (2026-10-09). Les coordonnées deviennent une méthode, que disent les points ; chaque notion est découpée par objet. Les sous-notions « déplacées » gardent leur identité (rangements et rattachements suivent) ; les « fusionnées » s'archivent dans une sous-notion de même contenu. **Les noms restent à confirmer** (question en fin de document).

### Géométrie > Vecteurs

Notions d'aujourd'hui : « Géométrie > Vecteurs : sans coordonnées » et « Géométrie > Vecteurs : avec coordonnées » → **« Géométrie > Vecteurs »**.

- **Avant** (🔸 = archivée) — Géométrie > Vecteurs : sans coordonnées : points 3e 1, 2de 3, 1re spé 1, Tle spé 2; translation et vecteur : vide; égalité de vecteurs : points 2de 2; somme et relation de Chasles : points 3e 2, 2de 1; produit par un réel : points 2de 1; colinéarité : points 2de 1; combinaison linéaire : points 2de 1; Géométrie > Vecteurs : avec coordonnées : vide; 🔸 coordonnées d'un vecteur : points 2de 4; 🔸 somme et produit par un réel : points 2de 1; 🔸 norme : points 2de 1; 🔸 colinéarité et déterminant : points 2de 5.
- **Après** (🆕 = nouvelle ou venue d'ailleurs) — notion : points 3e 1, 2de 3, 1re spé 1, Tle spé 2; translation et vecteur : vide; égalité de vecteurs : points 2de 2; somme et relation de Chasles : points 3e 2, 2de 1; produit par un réel : points 2de 1; colinéarité : points 2de 6; combinaison linéaire : points 2de 1; 🆕 coordonnées : points 2de 5; 🆕 norme : points 2de 1.
- **Ce qui bouge** :
  - 🆕 « coordonnées » — Q4 : les coordonnées d'un vecteur, venues de « Vecteurs : avec coordonnées ».
  - 🆕 « norme » — Q4 : la norme, venue de « Vecteurs : avec coordonnées ».
  - « coordonnées d'un vecteur » déplacée (renommée « coordonnées ») → « coordonnées » (0 modèle(s), 0 exercice(s), points 2-292, 2-294, 2-298, 2-299) — Q4 (David) : un objet : les coordonnées
  - « somme et produit par un réel » fusionnée → « coordonnées » (0 modèle(s), 0 exercice(s), points 2-300) — Q4 (David) : calculer les coordonnées d'une somme, d'un produit (2-300) : un calcul de coordonnées
  - « norme » déplacée → « norme » (0 modèle(s), 0 exercice(s), points 2-293) — Q4 (David) : un objet : la norme
  - « colinéarité et déterminant » fusionnée → « colinéarité » (0 modèle(s), 0 exercice(s), points 2-295, 2-303, 2-304, 2-317, 2-321) — Q4 (David) : la colinéarité, critère du déterminant compris
  - « Géométrie > Vecteurs : avec coordonnées » notion archivée → (notion) (0 modèle(s), 0 exercice(s)) — Q4 (David) : la notion « avec coordonnées » disparaît dans « Vecteurs »

### Géométrie > Espace

Notions d'aujourd'hui : « Géométrie > Espace : sans coordonnées » et « Géométrie > Espace : avec coordonnées » → **« Géométrie > Espace »**.

- **Avant** (🔸 = archivée) — Géométrie > Espace : sans coordonnées : points Tle spé 1; vecteurs de l'espace : points Tle spé 3; colinéarité et alignement : points Tle spé 2; coplanarité et décomposition : points Tle spé 5; 🔸 positions relatives de droites et plans : points Tle spé 1; Géométrie > Espace : avec coordonnées : vide; 🔸 coordonnées dans l'espace : 4 modèles · points Tle spé 2; 🔸 représentation paramétrique d'une droite : 1 modèle · points Tle spé 3; 🔸 intersections : 1 modèle · points Tle spé 2; 🔸 positions relatives par le calcul : 1 modèle · points Tle spé 1.
- **Après** (🆕 = nouvelle ou venue d'ailleurs) — notion : 1 modèle · points Tle spé 2; vecteurs de l'espace : points Tle spé 3; colinéarité et alignement : 1 modèle · points Tle spé 2; coplanarité et décomposition : 1 modèle · points Tle spé 6; 🆕 coordonnées : 1 modèle · points Tle spé 1; 🆕 représentation paramétrique : 1 modèle · points Tle spé 3; 🆕 positions relatives et intersections : 2 modèles · points Tle spé 3.
- **Ce qui bouge** :
  - 🆕 « coordonnées » — Q4 : bases, repères et coordonnées de l'espace (TSPE-332).
  - 🆕 « représentation paramétrique » — Q4 : la représentation paramétrique d'une droite (TSPE-363, 365, 366).
  - 🆕 « positions relatives et intersections » — Q4 : positions relatives de droites et de plans, et intersections (TSPE-336, 372, 374).
  - « coordonnées dans l'espace » déplacée (renommée « coordonnées ») → « coordonnées » (4 modèle(s), 0 exercice(s), points TSPE-332, TSPE-333) — Q4 (David) : un objet : les coordonnées (TSPE-333, la décomposition sur une base, va sur « coplanarité et décomposition »)
  - « représentation paramétrique d'une droite » déplacée (renommée) → « représentation paramétrique » (1 modèle(s), 0 exercice(s), points TSPE-363, TSPE-365, TSPE-366) — Q4 (David) : un objet
  - « intersections » fusionnée → « positions relatives et intersections » (1 modèle(s), 0 exercice(s), points TSPE-372, TSPE-374) — Q4 (David) : un même contenu : positions relatives et intersections
  - « positions relatives par le calcul » fusionnée → « positions relatives et intersections » (1 modèle(s), 0 exercice(s), points TSPE-371) — Q4 (David) : « par le calcul » est un registre ; TSPE-371 couvre plusieurs sous-notions : sur la notion
  - « positions relatives de droites et plans » renommée → « positions relatives et intersections » (0 modèle(s), 0 exercice(s), points TSPE-336) — Q4 (David) : elle reçoit les intersections
  - « Géométrie > Espace : avec coordonnées » notion archivée → (notion) (0 modèle(s), 0 exercice(s)) — Q4 (David) : la notion « avec coordonnées » disparaît dans « Espace »
  - point TSPE-333 → « coplanarité et décomposition » — la décomposition d'un vecteur sur une base : la coplanarité et la décomposition
  - point TSPE-371 → (notion) — traduire par un système : base, coordonnées, colinéarité, coplanarité, intersections, positions relatives — plusieurs sous-notions : sur la notion
  - 1 modèle(s) → « colinéarité et alignement » : « Espace : vecteurs colinéaires, points alignés » — D36 : vecteurs colinéaires, points alignés — le contenu est la colinéarité et l'alignement
  - 1 modèle(s) → (notion) : « Espace : points alignés ? vecteurs formant une base ? » — points alignés ET vecteurs formant une base : deux sous-notions (modèle non atomique), avec TSPE-371 sur la notion
  - 1 modèle(s) → « coplanarité et décomposition » : « Espace : décomposer un vecteur, vecteurs coplanaires » — décomposer un vecteur, vecteurs coplanaires : suit son point TSPE-333

### Géométrie > Orthogonalité et distances dans l'espace

Notions d'aujourd'hui : « Géométrie > Orthogonalité : sans coordonnées » et « Géométrie > Orthogonalité : avec coordonnées » → **« Géométrie > Orthogonalité et distances dans l'espace »**.

- **Avant** (🔸 = archivée) — Géométrie > Orthogonalité : sans coordonnées : vide; produit scalaire dans l'espace : points Tle spé 4; orthogonalité de droites et plans : points Tle spé 5; projeté orthogonal : points Tle spé 3; angles : points Tle spé 2; Géométrie > Orthogonalité : avec coordonnées : vide; 🔸 norme et distance : 4 modèles · points Tle spé 3; 🔸 vecteur normal à un plan : 3 modèles · points Tle spé 3; 🔸 équation cartésienne d'un plan : 2 modèles · points Tle spé 4; 🔸 coordonnées du projeté orthogonal : 2 modèles · points Tle spé 2; 🔸 sphère : 2 modèles · points Tle spé 4.
- **Après** (🆕 = nouvelle ou venue d'ailleurs) — produit scalaire dans l'espace : 3 modèles · points Tle spé 7; orthogonalité de droites et plans : 1 modèle · points Tle spé 5; projeté orthogonal : 2 modèles · points Tle spé 5; angles : 1 modèle · points Tle spé 2; 🆕 vecteur normal et équation cartésienne : 4 modèles · points Tle spé 7; 🆕 sphère : 2 modèles · points Tle spé 4.
- **Ce qui bouge** :
  - 🆕 « vecteur normal et équation cartésienne » — Q4 : vecteur normal à un plan et équation cartésienne (TSPE-349, 358, 375 ; 364, 367, 368, 373).
  - 🆕 « sphère » — Q4 : la sphère (TSPE-360, 361, 376, 377).
  - « norme et distance » fusionnée → « produit scalaire dans l'espace » (4 modèle(s), 0 exercice(s), points TSPE-344, TSPE-345, TSPE-346) — Q4 (David) : norme et distance s'expriment par le produit scalaire (TSPE-344, 345, 346)
  - « vecteur normal à un plan » fusionnée → « vecteur normal et équation cartésienne » (3 modèle(s), 0 exercice(s), points TSPE-349, TSPE-358, TSPE-375) — Q4 (David) : le vecteur normal et l'équation cartésienne vont ensemble
  - « équation cartésienne d'un plan » fusionnée → « vecteur normal et équation cartésienne » (2 modèle(s), 0 exercice(s), points TSPE-364, TSPE-367, TSPE-368, TSPE-373) — Q4 (David) : idem
  - « coordonnées du projeté orthogonal » fusionnée → « projeté orthogonal » (2 modèle(s), 0 exercice(s), points TSPE-369, TSPE-370) — Q4 (David) : le projeté orthogonal, calculé ou non en coordonnées
  - « sphère » déplacée → « sphère » (2 modèle(s), 0 exercice(s), points TSPE-360, TSPE-361, TSPE-376, TSPE-377) — Q4 (David) : un objet : la sphère
  - « Géométrie > Orthogonalité : avec coordonnées » notion archivée → (notion) (0 modèle(s), 0 exercice(s)) — Q4 (David) : la notion « avec coordonnées » disparaît dans « Orthogonalité et distances dans l'espace »
  - 1 modèle(s) → « orthogonalité de droites et plans » : « Espace : plans perpendiculaires, droite orthogonale à un plan » — D38 : plans perpendiculaires, droite orthogonale à un plan : l'orthogonalité de droites et de plans

### Les couples du lot et du crible touchés par Q4

| Cas  | Modèle                                                                | Nœud (lot et crible) → nœud refondu                                                                                                                   | Point (lot et crible) → point |
| ---- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| A171 | Espace : calculer un angle avec le produit scalaire                   | Orthogonalité : sans coordonnées > angles → Orthogonalité et distances dans l'espace > angles                                                         | TSPE-354                      |
| C28  | Espace : calculer un produit scalaire                                 | Orthogonalité : avec coordonnées > norme et distance → Orthogonalité et distances dans l'espace > produit scalaire dans l'espace                      | TSPE-345                      |
| C27  | Espace : coordonnées de vecteurs et de points                         | Espace : avec coordonnées > coordonnées dans l'espace → Espace > coordonnées                                                                          | TSPE-332                      |
| A153 | Espace : décomposer un vecteur, vecteurs coplanaires                  | Espace : avec coordonnées > coordonnées dans l'espace → Espace > coplanarité et décomposition                                                         | TSPE-333                      |
| A154 | Espace : intersection d'une droite et d'un plan                       | Espace : avec coordonnées > intersections → Espace > positions relatives et intersections                                                             | TSPE-372                      |
| A156 | Espace : lire une représentation paramétrique de droite               | Espace : avec coordonnées > représentation paramétrique d'une droite → Espace > représentation paramétrique                                           | TSPE-366                      |
| C29  | Espace : norme d'un vecteur, distance entre deux points               | Orthogonalité : avec coordonnées > norme et distance → Orthogonalité et distances dans l'espace > produit scalaire dans l'espace                      | TSPE-345                      |
| D37  | Espace : orthogonalité, trouver le paramètre                          | Orthogonalité : avec coordonnées > norme et distance → Orthogonalité et distances dans l'espace > produit scalaire dans l'espace                      | **TSPE-345 → TSPE-343**       |
| D38  | Espace : plans perpendiculaires, droite orthogonale à un plan         | Orthogonalité : avec coordonnées > vecteur normal à un plan → Orthogonalité et distances dans l'espace > orthogonalité de droites et plans            | **TSPE-349 → TSPE-353**       |
| A176 | Espace : point d'un plan, coordonnée manquante                        | Orthogonalité : avec coordonnées > équation cartésienne d'un plan → Orthogonalité et distances dans l'espace > vecteur normal et équation cartésienne | TSPE-364                      |
| C30  | Espace : point d'une sphère, intersection d'une sphère et d'un plan   | Orthogonalité : avec coordonnées > sphère → Orthogonalité et distances dans l'espace > sphère                                                         | TSPE-376                      |
| A152 | Espace : points alignés ? vecteurs formant une base ?                 | Espace : avec coordonnées > positions relatives par le calcul → Espace                                                                                | TSPE-371                      |
| A155 | Espace : positions relatives d'une droite et d'un plan, de deux plans | Espace : avec coordonnées > positions relatives par le calcul → Espace > positions relatives et intersections                                         | TSPE-371                      |
| A170 | Espace : projeté orthogonal d'un point sur une droite                 | Orthogonalité : avec coordonnées > coordonnées du projeté orthogonal → Orthogonalité et distances dans l'espace > projeté orthogonal                  | TSPE-370                      |
| A169 | Espace : projeté orthogonal sur un plan, distance à un plan           | Orthogonalité : avec coordonnées > coordonnées du projeté orthogonal → Orthogonalité et distances dans l'espace > projeté orthogonal                  | TSPE-369                      |
| A174 | Espace : trouver un vecteur directeur ou un vecteur normal            | Orthogonalité : avec coordonnées > vecteur normal à un plan → Orthogonalité et distances dans l'espace > vecteur normal et équation cartésienne       | TSPE-375                      |
| A173 | Espace : vecteur normal lu sur une équation de plan                   | Orthogonalité : avec coordonnées > équation cartésienne d'un plan → Orthogonalité et distances dans l'espace > vecteur normal et équation cartésienne | TSPE-368                      |
| D36  | Espace : vecteurs colinéaires, points alignés                         | Espace : sans coordonnées > colinéarité et alignement → Espace > colinéarité et alignement                                                            | **TSPE-328 → TSPE-371**       |
| A175 | Espace : équation cartésienne d'un plan (calculer d)                  | Orthogonalité : avec coordonnées > équation cartésienne d'un plan → Orthogonalité et distances dans l'espace > vecteur normal et équation cartésienne | TSPE-367                      |
| A172 | Espace : équation d'une sphère, centre et rayon                       | Orthogonalité : avec coordonnées > sphère → Orthogonalité et distances dans l'espace > sphère                                                         | TSPE-376                      |

Pourquoi les trois changements de point :

- D36 : TSPE-371 (savoir-faire : « dans un cadre repéré… étudier une situation de colinéarité ») plutôt que TSPE-328 (connaissance : vecteurs colinéaires) — le modèle calcule la colinéarité en coordonnées.
- D37 : trouver m pour que u·v = 0, c'est la caractérisation de l'orthogonalité par le produit scalaire (TSPE-343), désormais sur la même sous-notion que le modèle.
- D38 : « utiliser le produit scalaire pour démontrer la perpendicularité de deux plans » (savoir-faire) ; la droite orthogonale à un plan (TSPE-352) est secondaire.

Correction de la proposition reçue : aucune ; trois précisions. TSPE-358 (« lieux géométriques simples, par exemple plan médiateur ») va bien avec le vecteur normal (le plan médiateur se définit par un vecteur normal) ; « Espace : points alignés ? vecteurs formant une base ? » couvre deux sous-notions (colinéarité et alignement, coplanarité et décomposition) : il va sur la notion « Espace », avec TSPE-371 ; c'est un modèle à scinder plus tard. TSPE-344 (« base orthonormée, repère orthonormé ») pourrait aussi aller sous « Espace > coordonnées » (bases et repères) ; il reste avec le produit scalaire, puisqu'une base orthonormée se définit par l'orthogonalité et la norme.

## Section C — notions nommées par une activité

- **Notions-activités** : « Problèmes de dénombrement », « Suites et modélisation », « Problèmes arithmétiques » — question Q5.
- Non concernés : les couples « X : sens et écritures » / « X : calculs » (Fractions, Décimaux, Relatifs, Racines carrées…) découpent par contenu ; la branche « Algorithmique » est un contenu du programme.

## Section D — renommages proposés (rien ne bouge)

Des sous-notions de contenu portent un nom d'activité. Les renommer en nom de contenu respecte le principe sans rien déplacer. Facultatif.

| Sous-notion                                                                        | Nom proposé                                                       |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Entiers : numération > comparer / décomposer / écrire / repérer / dénombrer        | ordre / décomposition / écritures / droite graduée / dénombrement |
| Décimaux : numération > comparer / décomposer / écrire / encadrer                  | ordre / décomposition / écritures / encadrement                   |
| Décimaux : calculs > additionner / soustraire / multiplier / diviser (après Q2)    | addition / soustraction / multiplication / division               |
| Fractions : sens et écritures > comparer / décomposer / simplifier                 | ordre / décomposition / simplification                            |
| Relatifs : sens et écritures > comparer                                            | ordre                                                             |
| Fractions : calculs > additionner et soustraire / multiplier / diviser             | addition et soustraction / multiplication / division              |
| Puissances : calculs > multiplier / diviser                                        | produit de puissances / quotient de puissances                    |
| Racines carrées : calculs > calculer                                               | techniques de calcul                                              |
| Calcul littéral > réduire / simplifier l'écriture / développer / factoriser        | réduction / écriture simplifiée / développement / factorisation   |
| Entiers : priorités opératoires > traduire une phrase                              | écriture d'une expression                                         |
| Inégalités > comparer et encadrer                                                  | comparaison et encadrement                                        |
| Nombres premiers > reconnaître un nombre premier                                   | primalité                                                         |
| Pourcentages > calculer                                                            | calculs de pourcentages                                           |
| Généralités sur les fonctions > résolution graphique                               | équations et inéquations f(x) = k                                 |
| Fonction exponentielle > suites et modélisation                                    | croissance et décroissance exponentielles                         |
| Dérivation > variations (après l'audit)                                            | variations et extremums                                           |
| Produit scalaire > calculer un produit scalaire                                    | expressions du produit scalaire                                   |
| Théorème de Pythagore, de Thalès, Trigonométrie > calculer une longueur / un angle | calcul de longueurs / calcul d'angles                             |
| Loi binomiale > calcul de probabilités                                             | expression de la loi                                              |
| Longueurs, Masses, Contenances > comparer et mesurer                               | comparaison et mesure                                             |
| Angles > comparer / mesurer en degrés / construire                                 | comparaison / mesure en degrés / construction                     |
| Durées > lire l'heure / calculer / convertir                                       | lecture de l'heure / calcul de durées / conversions               |
| Solides, Figures planes > reconnaître et décrire / (reproduire et) construire      | propriétés / constructions                                        |

## Questions restantes

- **Q3 — « Triple et tiers » existe sous l'addition ET sous la multiplication (cycle 2)**
  - « Double et moitié » est tranché (deux nœuds, rien ne bouge). Reste « triple et tiers » : 5 modèles sous chacune des deux notions, aucun point nulle part. Un seul nœud, sous la multiplication (multiplier par 3), ou deux comme pour « double et moitié » ?
  - Proposition : Un seul nœud, sous la multiplication : le BO ne range nulle part les triples et les tiers dans les faits additifs, contrairement aux doubles et moitiés.
- **Q4-noms — Les noms de la refonte Q4**
  - Noms proposés : « Vecteurs », « Espace », « Orthogonalité et distances dans l'espace » pour les notions ; « coordonnées », « norme », « représentation paramétrique », « positions relatives et intersections », « vecteur normal et équation cartésienne » pour les sous-notions. Les garder ?
  - Proposition : Oui. Seule hésitation : « Espace » seul pourrait s'appeler « Vecteurs, droites et plans de l'espace », pour le distinguer de « Orthogonalité et distances dans l'espace ».
- **Q5 — Les notions nommées par une activité**
  - « Problèmes de dénombrement » (elle porte les savoir-faire de tout le dénombrement : TSPE-317, 318, 319 ; un point ne peut pas viser une branche), « Suites et modélisation » (il lui reste « seuil » et des points de modélisation) et « Problèmes arithmétiques » au primaire (typologie des problèmes du BO : parties-tout, comparaison… ; 30 points, aucun modèle). Les garder ?
  - Proposition : Les garder : la première est le seul endroit possible pour des savoir-faire transversaux ; la typologie des problèmes est un contenu propre au primaire. Renommer « Suites et modélisation » en « Modèles d'évolution » (croissance linéaire ou exponentielle, seuils).
- **Q6 — « Situations de proportionnalité » : « reconnaître » et « appliquer »**
  - Ces deux sous-notions (10 points, 5 modèles, primaire et collège) découpent par activité, à côté de « quatrième proportionnelle » et « ratio » (contenus). « Appliquer » recouvre les procédures, dont la quatrième proportionnelle.
  - Proposition : « reconnaître » → renommée « caractérisation » (définition, tableau, graphique) ; « appliquer » → fondue sur la notion (6-191 « choisir une procédure adaptée » couvre toutes les procédures), sauf 5-088 (coefficient) qui pourrait fonder « coefficient de proportionnalité ». À trancher avant le balisage des cycles 3 et 4 ; non simulé.
- **Q7 — Sous-notions vidées par le lot, selon tes réponses à ses questions**
  - « Loi binomiale > coefficients binomiaux » se vide si tu retiens la fusion de D51 ; « Limites de suites > suites majorées, minorées » se vide si tu retiens le déplacement de D69 (ma recommandation était de l'y laisser, sans point). Les archiver dans ce cas ?
  - Proposition : Oui, les archiver si elles se vident (un archivage se défait).
- **D — Les renommages de la section D**
  - Les valider en bloc, au cas par cas, ou les laisser ?
  - Proposition : En bloc : ils ne déplacent rien et alignent les noms sur le principe.
