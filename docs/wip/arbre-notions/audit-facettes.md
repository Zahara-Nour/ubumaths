# Audit des facettes de l'arbre des notions

> **Sections A et B VALIDÉES par David le 2026-10-09** (« A et B validées »).
>
> - **Q1 = oui** : « optimisation » se fond dans « variations ».
> - **Q2 = oui** : « Décimaux : calculs » garde les opérations ; les techniques y sont versées, chaque point allant sur l'opération qu'il travaille (sur la notion s'il en couvre plusieurs).
> - **Q3, « double et moitié » = deux nœuds** : on garde le nœud sous l'addition ET celui sous la multiplication, comme le BO.
> - Q3 (« triple et tiers »), Q4 à Q7 et la section D (renommages) attendent encore sa réponse.
>
> Rien n'est écrit en base.
>
> Proposition initiale du 2026-10-09 : Principe décidé par David le 2026-10-09
> (ADR 0020 § 3 précisé) : **une notion n'a qu'un découpage, par contenu mathématique** — un objet, une propriété ou une
> technique de calcul —, jamais par activité (reconnaître, calculer, compléter), par registre (lecture graphique,
> problèmes en contexte) ou par outil (algorithmique). Ce que l'élève fait, ce sont les points du programme qui le disent.
> Les « facettes », sous-notions créées pour le filtre pendant les rangements, se fondent dans les sous-notions de contenu ;
> une facette **s'archive**, elle ne se supprime pas (ADR 0019).

## En bref

- **55 facettes archivées** (42 dans les 39 notions du symptôme, 13 trouvées par le balayage), **2 sous-notions de contenu créées** (« définition » pour les suites arithmétiques et géométriques).
- Par rapport à l'arbre d'aujourd'hui, tout compris (audit, lot et crible) : **192 modèles**, **84 points** et **35 exercices** changent de nœud. Par rapport au lot et au crible seuls, l'audit ajoute 138 déplacements de modèles et 71 de points.
- Les libellés des points ne changent pas : seul leur nœud bouge (rien n'est ajouté au BO).
- **Simulation** (arbre d'aujourd'hui → audit → lot de l'étape 2 → crible) : 495 couples (modèle, programme), 476 avec un point ; **aucune violation** de la règle (le point est sur le nœud du modèle ou sur sa notion), un seul point par programme partout, aucune destination absente ou archivée.
- **7 questions à trancher** (fin du document) ; elles ne sont pas simulées tant qu'elles ne sont pas tranchées.

## Ce qui change par rapport au lot et au crible

L'audit **reprend** les traitements de facettes du lot (fusions de « compléter une loi », « condition initiale », « solution particulière donnée », « formes u′eᵘ, 2uu′, u′/u », « réduire » ; remontées de 1SPE-213, 1SPE-216, 1SPE-253, 1SPE-287 et TSPE-453 à la notion) et les **prolonge** :

- **Dérivation** : « étude de fonction » se fond dans « variations ». Ses modèles (D13-D15, et D11, D12, A63 que le lot et le crible y avaient mis) vont sous « variations », avec leurs points (1SPE-283, TSPE-416, TCOMP-231 y vont aussi). **Les questions D16 et A78 se lisent désormais « Dérivation > variations » au lieu de « étude de fonction ».**
- **Suites arithmétiques et géométriques** : une sous-notion « définition » reçoit « reconnaître », « raison » et la partie « définition » de « calculer un terme » ; les modèles « Calculer un terme » restés sur la facette (D72-D73 et D82-D83) y vont, avec 1SPE-213 et 1SPE-216 toujours sur la notion.
- **Équations différentielles** : après les fusions du lot, « y′ = ay », « y′ = ay + b » et « y′ = ay + f » n'avaient plus qu'une sous-notion, « solution générale », identique à la notion : elle disparaît aussi, tout va sur la notion.
- **D36** : l'alignement calculé en coordonnées va sous « Espace : avec coordonnées > positions relatives par le calcul » avec TSPE-371 (piste du crible), au lieu de « sans coordonnées > colinéarité et alignement » avec TSPE-328.
- **Loi binomiale** : « reconnaître une loi » se fond dans « schéma de Bernoulli » ; C43 et son modèle frère y vont, avec TSPE-508, TCOMP-295 et TTECHNO-062.
- **Problèmes de dénombrement** : ses trois facettes disparaissent ; « Python : générer les paires, les triplets, les parties » suit son point TSPE-325 sous « Combinaisons > combinaisons ».
- Les autres déplacements touchent des modèles **sans tag** (primaire surtout) : ils ne changent aucun couple du lot.

## Section A — les 39 notions qui montrent le symptôme

Le symptôme : une sous-notion porte des modèles ou des exercices mais aucun point, ou le lot y trouvait un désaccord entre sous-notions sœurs.

### Nombres et calculs > Entiers : addition et soustraction

- **Avant** (🔸 = facette) — notion : points CP 2, CE2 1; 🔸 somme : 30 modèles; 🔸 différence : 20 modèles; complément : 10 modèles · points CP 1; tables : 9 modèles · points CP 1, CE1 1, CE2 1, CM1 1, CM2 1; double et moitié : 7 modèles · points CP 2, CE1 1; triple et tiers : 5 modèles; calcul astucieux : 12 modèles · points CP 7, CE1 5, CE2 2, CM1 1, CM2 1; calcul posé : points CP 1, CE1 1, CE2 1.
- **Après** — notion : points CP 2, CE2 1; complément : 13 modèles · points CP 1; tables : 21 modèles · points CP 1, CE1 1, CE2 1, CM1 1, CM2 1; double et moitié : 7 modèles · points CP 2, CE1 1; triple et tiers : 5 modèles; calcul astucieux : 47 modèles · points CP 7, CE1 5, CE2 2, CM1 1, CM2 1; calcul posé : points CP 1, CE1 1, CE2 1.
- **Ce qui bouge** :
  - archive « somme » → répartie selon le contenu de chaque modèle (ci-dessous) (30 modèle(s), 0 exercice(s)) — Répète la notion elle-même (une somme, c'est l'addition) ; chaque modèle va vers le fait ou la technique qu'il entraîne.
  - archive « différence » → répartie selon le contenu de chaque modèle (ci-dessous) (20 modèle(s), 0 exercice(s)) — Idem pour la soustraction.
  - 9 modèle(s) → « calcul astucieux » : « Compléter une addition à trou » ×8, « Compléter une addition » — addition à trou à plusieurs chiffres : un écart calculé mentalement
  - 4 modèle(s) → « tables » : « Compléter une addition à trou » ×4 — addition à trou à un chiffre : les tables « dans les deux sens »
  - 10 modèle(s) → « calcul astucieux » : « Calculer une somme » ×10 — somme calculée mentalement en s'appuyant sur la numération (ajouter des unités, des dizaines, deux nombres < 100…)
  - 4 modèle(s) → « tables » : « Calculer une somme » ×4 — somme de deux nombres à un chiffre : un fait des tables
  - 3 modèle(s) → « complément » : « Calculer une somme » ×3 — la somme vaut 10, 100 ou une dizaine ronde : les compléments
  - 7 modèle(s) → « calcul astucieux » : « Compléter une soustraction à trou » ×7 — soustraction à trou à plusieurs chiffres : un écart calculé mentalement
  - 4 modèle(s) → « tables » : « Calculer une différence (résultat positif) » ×2, « Compléter une soustraction à trou », « Compléter une soustraction à trou (résultat positif) » — différence de nombres à un chiffre : les tables « dans les deux sens »
  - 9 modèle(s) → « calcul astucieux » : « Calculer une différence (résultat positif) » ×9 — différence calculée mentalement (enlever des unités, des dizaines, des centaines…)

### Nombres et calculs > Entiers : multiplication

- **Avant** (🔸 = facette) — tables : 9 modèles · points CE1 1, CE2 1, CM1 1, CM2 1; 🔸 produit : 28 modèles · points CP 1, CE1 2, CE2 1; carrés : 1 modèle · points 5e 1; décomposition : 1 modèle · points CE2 1; distributivité : 20 modèles · points CE1 1, CE2 1, CM1 1, CM2 1, 5e 1; double et moitié : 7 modèles · points CE1 1, CE2 1; triple et tiers : 5 modèles; quadruple et quart : 5 modèles; puissances de 10 : 3 modèles · points CE1 1, CE2 1, CM1 1; produits particuliers : 4 modèles · points CE1 1, CE2 1; calcul astucieux : 2 modèles · points CE2 2, CM1 3, CM2 1; calcul posé : points CE2 1, CM1 1.
- **Après** — notion : 1 modèle · points CP 1, CE1 2, CE2 1; tables : 19 modèles · points CE1 1, CE2 1, CM1 1, CM2 1; carrés : 1 modèle · points 5e 1; décomposition : 1 modèle · points CE2 1; distributivité : 22 modèles · points CE1 1, CE2 1, CM1 1, CM2 1, 5e 1; double et moitié : 7 modèles · points CE1 1, CE2 1; triple et tiers : 5 modèles; quadruple et quart : 5 modèles; puissances de 10 : 3 modèles · points CE1 1, CE2 1, CM1 1; produits particuliers : 8 modèles · points CE1 1, CE2 1; calcul astucieux : 13 modèles · points CE2 2, CM1 3, CM2 1; calcul posé : points CE2 1, CM1 1.
- **Ce qui bouge** :
  - archive « produit » → répartie selon le contenu de chaque modèle (ci-dessous) (28 modèle(s), 0 exercice(s), points CP-017, CE1-023, CE1-024, CE2-017) — Répète la notion (un produit, c'est la multiplication) ; ses points (sens, symbole, commutativité, vocabulaire) vont sur la notion, comme pour l'addition ; les modèles vers le fait ou la technique qu'ils entraînent.
  - point CP-017 → (notion) — le sens de la multiplication vaut pour toute la notion (comme CP-014 pour l'addition)
  - point CE1-023 → (notion) — le symbole × : toute la notion
  - point CE1-024 → (notion) — la commutativité : toute la notion
  - point CE2-017 → (notion) — le vocabulaire facteur, produit, multiple : toute la notion
  - 4 modèle(s) → « produits particuliers » : « Compléter une multiplication à trou » ×4 — produits par 25 et par 50, 4 × 25 = 100 : les produits particuliers
  - 11 modèle(s) → « calcul astucieux » : « Compléter une multiplication à trou » ×6, « Multiplier par 20 » ×2, « Calculer un produit d'entiers », « Multiplier deux multiples de $10$ » … — multiplier par 20, par des dizaines ou des centaines : calcul mental (CE2-027, CM1-044, CM2-046)
  - 10 modèle(s) → « tables » : « Compléter une multiplication à trou » ×9, « Calculer un produit d'entiers » — produit ou multiplication à trou dans les tables
  - 2 modèle(s) → « distributivité » : « Calculer un produit d'entiers » ×2 — a × b calculé en décomposant b (la correction le fait) : la distributivité (CE2-028)
  - 1 modèle(s) → (notion) : « Chiffre des unités d'un produit » — chiffre des unités d'un produit : un raisonnement sur la multiplication, sans technique propre

### Nombres et calculs > Puissances : calculs

- **Avant** (🔸 = facette) — notion : points 2de 2; multiplier : 4 modèles · points 4e 2, 3e 1; diviser : 4 modèles · points 3e 1; puissance de puissance : 4 modèles; 🔸 mélange : 1 modèle · 2 exercices · points 5e 1, 4e 1.
- **Après** — notion : 1 modèle · 2 exercices · points 5e 1, 4e 1, 2de 2; multiplier : 4 modèles · points 4e 2, 3e 1; diviser : 4 modèles · points 3e 1; puissance de puissance : 4 modèles.
- **Ce qui bouge** :
  - archive « mélange » → (notion) (1 modèle(s), 2 exercice(s), points 5-032, 4-018) — « Mélange » est un format d'exercice, pas un contenu.

### Nombres et calculs > Racines carrées : sens et écritures

- **Avant** (🔸 = facette) — définition : 4 modèles · points 4e 2; 🔸 égalités : 1 modèle; 🔸 réduire : 2 modèles · 2 exercices.
- **Après** — définition : 4 modèles · points 4e 2.
- **Ce qui bouge** :
  - archive « égalités » → « Nombres et calculs > Racines carrées : calculs > propriétés » (1 modèle(s), 0 exercice(s)) — Vérifier une égalité, c'est appliquer les règles de calcul (son seul modèle y est déjà, par le lot).
  - archive « réduire » → « Nombres et calculs > Racines carrées : calculs > calculer » (2 modèle(s), 2 exercice(s)) — Réduire √50 en 5√2 est un calcul (fusion déjà proposée par le lot).

### Proportionnalité > Échelle d'une carte

- **Avant** (🔸 = facette) — notion : points 6e 1; 🔸 trouver l'échelle : 2 modèles; 🔸 utiliser l'échelle : 2 modèles.
- **Après** — notion : 4 modèles · points 6e 1.
- **Ce qui bouge** :
  - archive « trouver l'échelle » → (notion) (2 modèle(s), 0 exercice(s)) — Activité ; l'échelle est un seul contenu.
  - archive « utiliser l'échelle » → (notion) (2 modèle(s), 0 exercice(s)) — Activité ; l'échelle est un seul contenu.

### Proportionnalité > Vitesse

- **Avant** (🔸 = facette) — notion : points 4e 1; 🔸 calculer : 1 modèle; 🔸 convertir : 1 modèle.
- **Après** — notion : 2 modèles · points 4e 1.
- **Ce qui bouge** :
  - archive « calculer » → (notion) (1 modèle(s), 0 exercice(s)) — Activité ; la vitesse (grandeur quotient) est un seul contenu.
  - archive « convertir » → (notion) (1 modèle(s), 0 exercice(s)) — Activité ; la vitesse (grandeur quotient) est un seul contenu.

### Algèbre > Équations : premier degré

- **Avant** (🔸 = facette) — notion : 6 modèles · points 5e 2, 4e 1, 3e 1, 2de 1; ax = b : 10 modèles; ax + b = c : 9 modèles · points 4e 1, 2de 1; ax + b = cx + d : points 4e 1; 🔸 mettre en équation : points 5e 1, 4e 1.
- **Après** — notion : 6 modèles · points 5e 3, 4e 1, 3e 1, 2de 1; ax = b : 10 modèles; ax + b = c : 9 modèles · points 4e 1, 2de 1; ax + b = cx + d : points 4e 2.
- **Ce qui bouge** :
  - archive « mettre en équation » → (notion) (0 modèle(s), 0 exercice(s), points 5-044, 4-071) — Activité ; chaque point de mise en équation va sur le type d'équation qu'il vise.
  - point 4-071 → « ax + b = cx + d » — mettre en équation avec ax + b = cx + d : ce type d'équation

### Algèbre > Équations : second degré

- **Avant** (🔸 = facette) — notion : 1 exercice; discriminant : 2 modèles · 6 exercices · points 1re spé 2; équations incomplètes : vide; se ramener au second degré : 1 exercice; 🔸 mettre en équation : 1 exercice.
- **Après** — notion : 2 exercices; discriminant : 5 modèles · 6 exercices · points 1re spé 2; équations incomplètes : vide; se ramener au second degré : 1 exercice.
- **Ce qui bouge** :
  - archive « mettre en équation » → (notion) (0 modèle(s), 1 exercice(s)) — Activité.

### Algèbre > Inéquations : second degré

- **Avant** (🔸 = facette) — 🔸 inéquations du second degré : 1 modèle · 4 exercices · points 1re spé 1; 🔸 mettre en inéquation : 1 exercice.
- **Après** — notion : 1 modèle · 5 exercices · points 1re spé 1.
- **Ce qui bouge** :
  - archive « mettre en inéquation » → (notion) (0 modèle(s), 1 exercice(s)) — Activité.
  - archive « inéquations du second degré » → (notion) (1 modèle(s), 4 exercice(s), points 1SPE-250) — Seule sous-notion restante, identique à la notion : inutile.

### Algèbre > Inégalités

- **Avant** (🔸 = facette) — notion : points 2de 1; règles de calcul : points 2de 1; 🔸 signe d'une expression : 2 modèles; comparer et encadrer : points 2de 3.
- **Après** — notion : points 2de 1; règles de calcul : 2 modèles · points 2de 1; comparer et encadrer : points 2de 3.
- **Ce qui bouge** :
  - archive « signe d'une expression » → « règles de calcul » (2 modèle(s), 0 exercice(s)) — Ses deux modèles y sont déjà (lot) ; le signe d'une expression se travaille aussi sous les fonctions (« signe »).

### Fonctions > Fonction carré

- **Avant** (🔸 = facette) — définition et courbe : points 3e 1, 2de 2; variations : points 2de 2; 🔸 comparer des images : 1 exercice; x² = k, x² < k : 2 exercices · points 3e 1, 2de 1.
- **Après** — définition et courbe : points 3e 1, 2de 2; variations : 1 exercice · points 2de 2; x² = k, x² < k : 2 exercices · points 3e 1, 2de 1.
- **Ce qui bouge** :
  - archive « comparer des images » → « variations » (0 modèle(s), 1 exercice(s)) — Comparer des images, c'est utiliser les variations.

### Fonctions > Dérivation

- **Avant** (🔸 = facette) — notion : 1 exercice · points Tle spé 1; taux de variation : 1 exercice · points 1re spé 3, 1re techno 3; nombre dérivé : 3 modèles · 5 exercices · points 1re spé 3, 1re techno 2; tangente : 3 modèles · 8 exercices · points 1re spé 5, 1re techno 4; approximation affine : points 1re spé 2; fonctions dérivées : 8 modèles · 13 exercices · points 1re spé 4, 1re techno 2, Tle techno 1; opérations sur les dérivées : 2 exercices · points 1re spé 3, 1re techno 2, Tle spé 1, Tle comp. 1; dérivabilité en un point : points 1re spé 2; variations : 5 modèles · 8 exercices · points 1re spé 3, 1re techno 1; 🔸 étude de fonction : 4 modèles · 4 exercices · points 1re spé 1, 1re techno 2, Tle spé 1, Tle comp. 1, Tle techno 1; position relative de deux courbes : 2 exercices · points 1re spé 1; optimisation : 17 exercices · points 1re spé 1; fonctions composées : 3 modèles · 1 exercice · points Tle spé 3, Tle comp. 2.
- **Après** — notion : 1 exercice · points Tle spé 1; taux de variation : 1 exercice · points 1re spé 3, 1re techno 3; nombre dérivé : 2 modèles · 5 exercices · points 1re spé 3, 1re techno 2; tangente : 3 modèles · 8 exercices · points 1re spé 5, 1re techno 4; approximation affine : points 1re spé 2; fonctions dérivées : 4 modèles · 13 exercices · points 1re spé 4, 1re techno 2, Tle techno 1; opérations sur les dérivées : 5 modèles · 2 exercices · points 1re spé 3, 1re techno 2, Tle spé 1, Tle comp. 1; dérivabilité en un point : points 1re spé 2; variations : 9 modèles · 11 exercices · points 1re spé 4, 1re techno 3, Tle spé 1, Tle comp. 1, Tle techno 1; position relative de deux courbes : 2 exercices · points 1re spé 1; optimisation : 17 exercices · points 1re spé 1; fonctions composées : 3 modèles · 1 exercice · points Tle spé 3, Tle comp. 2.
- **Ce qui bouge** :
  - archive « étude de fonction » → « variations » (4 modèle(s), 4 exercice(s), points 1SPE-283, 1TECHNO-076, 1TECHNO-081, TSPE-416, TCOMP-231, TTECHNO-049) — « Étudier les variations, déterminer les extremums » : le même contenu que « variations » (lien signe de f′, tableau de variations, extremums).

### Fonctions > Continuité

- **Avant** (🔸 = facette) — notion : points Tle spé 1; continuité en un point : points Tle spé 3, Tle comp. 1; 🔸 lecture graphique : 1 modèle; valeurs intermédiaires : 2 modèles · 2 exercices · points Tle spé 4, Tle comp. 2; fonction réciproque : points Tle comp. 1; encadrement d'une solution : points Tle spé 3, Tle comp. 2.
- **Après** — notion : points Tle spé 1; continuité en un point : 1 modèle · points Tle spé 3, Tle comp. 1; valeurs intermédiaires : 1 modèle · 2 exercices · points Tle spé 4, Tle comp. 2; fonction réciproque : points Tle comp. 1; encadrement d'une solution : 1 modèle · points Tle spé 3, Tle comp. 2.
- **Ce qui bouge** :
  - archive « lecture graphique » → « continuité en un point » (1 modèle(s), 0 exercice(s)) — Registre (lecture graphique) ; son modèle y est déjà (lot).

### Équations différentielles > y′ = f

- **Avant** (🔸 = facette) — notion : points Tle spé 1; primitives : notion : 1 modèle · points Tle spé 3, Tle comp. 3; primitives des fonctions de référence : 2 modèles · 1 exercice · points Tle spé 2, Tle comp. 1; 🔸 formes u′eᵘ, 2uu′, u′/u : 2 modèles · 2 exercices · points Tle comp. 1; forme (v′∘u)×u′ : 1 modèle · 4 exercices · points Tle spé 1; 🔸 sinus et cosinus : 1 modèle.
- **Après** — notion : points Tle spé 1; primitives : notion : 1 modèle · points Tle spé 3, Tle comp. 3; primitives des fonctions de référence : 3 modèles · 1 exercice · points Tle spé 2, Tle comp. 1; forme (v′∘u)×u′ : 3 modèles · 6 exercices · points Tle spé 1, Tle comp. 1.
- **Ce qui bouge** :
  - archive « formes u′eᵘ, 2uu′, u′/u » → « forme (v′∘u)×u′ » (2 modèle(s), 2 exercice(s), points TCOMP-252) — Mêmes mathématiques (fusion déjà proposée par le lot).
  - archive « sinus et cosinus » → « primitives des fonctions de référence » (1 modèle(s), 0 exercice(s)) — Sinus et cosinus sont des fonctions de référence (son modèle y est déjà, par le lot).

### Équations différentielles > y′ = ay

- **Avant** (🔸 = facette) — 🔸 solution générale : points Tle spé 2, Tle comp. 2; 🔸 condition initiale : 1 modèle.
- **Après** — notion : 1 modèle · points Tle spé 2, Tle comp. 2.
- **Ce qui bouge** :
  - archive « solution générale » → (notion) (0 modèle(s), 0 exercice(s), points TSPE-464, TSPE-472, TCOMP-253, TCOMP-257) — Après la fusion de « condition initiale » (lot), seule sous-notion restante : identique à la notion.
  - archive « condition initiale » → (notion) (1 modèle(s), 0 exercice(s)) — Activité (fixer la constante) ; le BO la met dans la même puce que la résolution.

### Équations différentielles > y′ = ay + b

- **Avant** (🔸 = facette) — notion : points Tle spé 1, Tle comp. 2; 🔸 solution générale : 1 modèle · points Tle spé 1, Tle comp. 1; 🔸 condition initiale : 1 modèle.
- **Après** — notion : 2 modèles · points Tle spé 2, Tle comp. 3.
- **Ce qui bouge** :
  - archive « solution générale » → (notion) (1 modèle(s), 0 exercice(s), points TSPE-469, TCOMP-255) — Idem.
  - archive « condition initiale » → (notion) (1 modèle(s), 0 exercice(s)) — Idem.

### Équations différentielles > y′ = ay + f

- **Avant** (🔸 = facette) — 🔸 solution particulière donnée : 1 modèle; 🔸 solution générale : points Tle spé 1.
- **Après** — notion : 1 modèle · points Tle spé 1.
- **Ce qui bouge** :
  - archive « solution générale » → (notion) (0 modèle(s), 0 exercice(s), points TSPE-470) — Idem.
  - archive « solution particulière donnée » → (notion) (1 modèle(s), 0 exercice(s)) — Idem.

### Suites > Suites arithmétiques

- **Avant** (🔸 = facette) — notion : 4 exercices · points 1re spé 2, 1re ens. sci. 1, 1re techno 1, Tle techno 1; 🔸 reconnaître : 4 modèles · 1 exercice · points 1re ens. sci. 1, 1re techno 2, Tle techno 1; 🔸 raison : 2 modèles · points 1re techno 1, Tle techno 1; terme général : 2 modèles · 2 exercices · points 1re spé 3, 1re ens. sci. 1, 1re techno 1, Tle techno 1; 🔸 calculer un terme : 4 modèles · points 1re ens. sci. 1; somme des termes : 2 modèles · 3 exercices · points 1re spé 3, Tle techno 3.
- **Après** — notion : 1 modèle · 4 exercices · points 1re spé 3, 1re ens. sci. 2, 1re techno 2, Tle techno 1; terme général : 5 modèles · 2 exercices · points 1re spé 2, 1re ens. sci. 1, 1re techno 1, Tle techno 1; somme des termes : 2 modèles · 3 exercices · points 1re spé 3, Tle techno 3; 🆕 définition : 8 modèles · 1 exercice · points 1re ens. sci. 1, 1re techno 2, Tle techno 2.
- **Ce qui bouge** :
  - 🆕 crée « définition » — La définition par la relation de récurrence et la raison : y vont « reconnaître », « raison » et la partie « définition » de « calculer un terme ».
  - archive « reconnaître » → « définition » (4 modèle(s), 1 exercice(s), points 1GEN-013, 1TECHNO-035, 1TECHNO-046, TTECHNO-020) — Activité : reconnaître une suite arithmétique, c'est sa définition.
  - archive « raison » → « définition » (2 modèle(s), 0 exercice(s), points 1TECHNO-048, TTECHNO-022) — La raison fait partie de la définition (u(n+1) = u(n) + r).
  - archive « calculer un terme » → « définition » (4 modèle(s), 0 exercice(s), points 1GEN-018) — Activité : calculer un terme par la récurrence relève de la définition, par la formule explicite du terme général (le lot y a déjà mis deux modèles).
  - point 1GEN-018 → (notion) — calculer un terme par une relation fonctionnelle OU de récurrence : couvre définition et terme général
  - point 1TECHNO-048 → (notion) — le sens de variation à l'aide de la raison : les variations sont sur la notion (1SPE-228, 1GEN-015)

### Suites > Suites géométriques

- **Avant** (🔸 = facette) — notion : 6 exercices · points 1re spé 2, 1re ens. sci. 1, 1re techno 1, Tle techno 1; 🔸 reconnaître : 2 exercices · points 1re ens. sci. 1, 1re techno 2, Tle techno 1; 🔸 raison : 2 modèles · points 1re techno 1, Tle techno 1; terme général : 2 modèles · 1 exercice · points 1re spé 3, 1re ens. sci. 1, 1re techno 1, Tle techno 1; 🔸 calculer un terme : 4 modèles · points 1re ens. sci. 1; somme des termes : 2 modèles · 2 exercices · points 1re spé 3, Tle techno 3.
- **Après** — notion : 1 modèle · 6 exercices · points 1re spé 3, 1re ens. sci. 2, 1re techno 2, Tle techno 1; terme général : 6 modèles · 1 exercice · points 1re spé 2, 1re ens. sci. 1, 1re techno 1, Tle techno 1; somme des termes : 2 modèles · 2 exercices · points 1re spé 3, Tle techno 3; 🆕 définition : 4 modèles · 2 exercices · points 1re ens. sci. 1, 1re techno 2, Tle techno 2.
- **Ce qui bouge** :
  - 🆕 crée « définition » — Idem pour les suites géométriques.
  - archive « reconnaître » → « définition » (0 modèle(s), 2 exercice(s), points 1GEN-028, 1TECHNO-036, 1TECHNO-047, TTECHNO-021) — Idem.
  - archive « raison » → « définition » (2 modèle(s), 0 exercice(s), points 1TECHNO-049, TTECHNO-023) — Idem.
  - archive « calculer un terme » → « définition » (4 modèle(s), 0 exercice(s), points 1GEN-039) — Idem.
  - point 1GEN-039 → (notion) — idem, suites géométriques
  - point 1TECHNO-049 → (notion) — idem, suites géométriques

### Suites > Suites et modélisation

- **Avant** (🔸 = facette) — notion : 7 exercices · points 1re spé 1, 1re ens. sci. 1, 1re techno 1, Tle spé 1; 🔸 placements : 2 modèles · 1 exercice · points 1re spé 1; 🔸 pourcentages : 1 modèle · 2 exercices; seuil : 3 modèles · 1 exercice · points 1re spé 1, 1re ens. sci. 2, 1re techno 1, Tle spé 1, Tle comp. 2; 🔸 algorithmes : 2 modèles · 2 exercices · points 1re spé 2, 1re techno 2, Tle spé 1, Tle comp. 1, Tle techno 1.
- **Après** — notion : 3 modèles · 12 exercices · points 1re spé 2, 1re ens. sci. 1, 1re techno 1, Tle spé 1; seuil : 4 modèles · 1 exercice · points 1re spé 1, 1re ens. sci. 2, 1re techno 1, Tle spé 1, Tle comp. 2.
- **Ce qui bouge** :
  - archive « algorithmes » → (notion) (2 modèle(s), 2 exercice(s), points 1SPE-236, 1SPE-239, 1TECHNO-050, 1TECHNO-051, TSPE-393, TCOMP-218, TTECHNO-030) — Outil : le type « algorithme » des points le dit déjà ; chaque point va sur le contenu qu'il calcule.
  - archive « placements » → (notion) (2 modèle(s), 1 exercice(s), points 1SPE-242) — Un contexte (financier) de modélisation.
  - archive « pourcentages » → (notion) (1 modèle(s), 2 exercice(s)) — Un contexte de modélisation.
  - point 1SPE-236 → « Suites > Généralités sur les suites » — algorithme : calcul de termes et de sommes de termes d'une suite quelconque
  - point 1SPE-239 → « Suites > Généralités sur les suites » — algorithme : liste des premiers termes (Syracuse, Fibonacci)
  - point 1TECHNO-050 → « Suites > Généralités sur les suites » — algorithme : calculer un terme, une somme finie de termes
  - point 1TECHNO-051 → « Suites > Généralités sur les suites > représentation graphique » — algorithme : lister des termes et les représenter
  - point TSPE-393 → « Suites > Limites de suites » — algorithme : valeurs approchées de π, e, √2… par des suites
  - point TCOMP-218 → « Suites > Limites de suites » — idem
  - point TTECHNO-030 → « Suites > Généralités sur les suites » — algorithme : sommes des premiers carrés, cubes, termes (comme 1SPE-241, sur la notion)
  - 1 modèle(s) → « Suites > Généralités sur les suites » : « Valeur renvoyée par une fonction Python qui calcule un terme » — une fonction Python qui calcule un terme : le calcul des termes, avec son point 1SPE-236

### Matrices > Calcul matriciel

- **Avant** (🔸 = facette) — notion : points Expertes 2; opérations : 1 modèle · points Expertes 1; 🔸 produit : 1 modèle; inverse : 1 modèle · points Expertes 2; puissances de matrices : 1 modèle · points Expertes 3.
- **Après** — notion : points Expertes 2; opérations : 2 modèles · points Expertes 1; inverse : 1 modèle · points Expertes 2; puissances de matrices : 1 modèle · points Expertes 3.
- **Ce qui bouge** :
  - archive « produit » → « opérations » (1 modèle(s), 0 exercice(s)) — Le produit est une des opérations (TEXP-319) ; son modèle y est déjà (crible).

### Géométrie > Espace : avec coordonnées

- **Avant** (🔸 = facette) — coordonnées dans l'espace : 4 modèles · points Tle spé 2; représentation paramétrique d'une droite : 1 modèle · points Tle spé 3; intersections : 1 modèle · points Tle spé 2; positions relatives par le calcul : 1 modèle · points Tle spé 1.
- **Après** — coordonnées dans l'espace : 2 modèles · points Tle spé 2; représentation paramétrique d'une droite : 1 modèle · points Tle spé 3; intersections : 1 modèle · points Tle spé 2; positions relatives par le calcul : 3 modèles · points Tle spé 1.
- **Ce qui bouge** :
  - 1 modèle(s) → « positions relatives par le calcul » : « Espace : vecteurs colinéaires, points alignés » — D36 : l'alignement calculé en coordonnées a sa place avec TSPE-371 (trouvé par le crible), sans passer sous « sans coordonnées »

### Probabilités > Probabilités conditionnelles

- **Avant** (🔸 = facette) — notion : 1 exercice · points 2de 2, Tle spé 1, Tle comp. 1; arbres pondérés : 5 modèles · 9 exercices · points 2de 5; tableaux croisés : 3 modèles · 3 exercices · points 2de 2; indépendance : 3 modèles · 4 exercices · points 1re spé 2, 1re ens. sci. 2, 1re techno 2; probabilités totales : points 1re spé 2, 1re techno 2, Tle techno 2; inversion du conditionnement : points 2de 1; épreuves indépendantes successives : 3 exercices · points 1re spé 6, 1re ens. sci. 2, 1re techno 2, Tle spé 5, Tle comp. 1; 🔸 problèmes en contexte : 3 modèles · 3 exercices.
- **Après** — notion : 4 exercices · points 2de 2, Tle spé 1, Tle comp. 1; arbres pondérés : 3 modèles · 9 exercices · points 2de 5; tableaux croisés : 4 modèles · 3 exercices · points 2de 2; indépendance : 2 modèles · 4 exercices · points 1re spé 2, 1re ens. sci. 2, 1re techno 2; probabilités totales : 1 modèle · points 1re spé 2, 1re techno 2, Tle techno 2; inversion du conditionnement : 3 modèles · points 2de 1; épreuves indépendantes successives : 1 modèle · 3 exercices · points 1re spé 6, 1re ens. sci. 2, 1re techno 2, Tle spé 5, Tle comp. 1.
- **Ce qui bouge** :
  - archive « problèmes en contexte » → (notion) (3 modèle(s), 3 exercice(s)) — Registre (« en contexte ») ; chaque modèle va là où le met sa mathématique.
  - 1 modèle(s) → « tableaux croisés » : « Parmi les… : modéliser un tableau croisé ou un sondage » — modéliser par un tableau croisé (2-395 est sur la notion)

### Probabilités > Variables aléatoires

- **Avant** (🔸 = facette) — notion : points 1re spé 3; loi d'une variable aléatoire : 4 modèles · 3 exercices · points 1re spé 3, 1re techno 2; 🔸 compléter une loi : 3 modèles; espérance : 4 modèles · 9 exercices · points 1re spé 3, 1re techno 2, Tle comp. 1, Tle techno 1; variance et écart-type : 3 modèles · 3 exercices · points 1re spé 4; 🔸 jeux et gains : 3 modèles · 5 exercices · points 1re spé 1.
- **Après** — notion : points 1re spé 3; loi d'une variable aléatoire : 7 modèles · 3 exercices · points 1re spé 3, 1re techno 2; espérance : 7 modèles · 12 exercices · points 1re spé 4, 1re techno 2, Tle comp. 1, Tle techno 1; variance et écart-type : 3 modèles · 3 exercices · points 1re spé 4.
- **Ce qui bouge** :
  - archive « compléter une loi » → « loi d'une variable aléatoire » (3 modèle(s), 0 exercice(s)) — Fusion déjà proposée par le lot.
  - archive « jeux et gains » → « espérance » (3 modèle(s), 5 exercice(s), points 1SPE-358) — Un contexte (les jeux) : c'est l'espérance (1SPE-358 « utiliser la notion d'espérance… mise pour un jeu équitable »).

### Dénombrement > Problèmes de dénombrement

- **Avant** (🔸 = facette) — notion : points Tle spé 2; 🔸 dénombrer avec contraintes : 2 modèles; 🔸 reconnaître le modèle : 2 modèles · points Tle spé 1; 🔸 algorithmique : 1 modèle · points Tle spé 3.
- **Après** — notion : 4 modèles · points Tle spé 3.
- **Ce qui bouge** :
  - archive « dénombrer avec contraintes » → (notion) (2 modèle(s), 0 exercice(s)) — Activité.
  - archive « reconnaître le modèle » → (notion) (2 modèle(s), 0 exercice(s), points TSPE-318) — Activité ; TSPE-318 (« reconnaître les objets à dénombrer ») vaut pour toute la notion.
  - archive « algorithmique » → (notion) (1 modèle(s), 0 exercice(s), points TSPE-323, TSPE-324, TSPE-325) — Outil ; chaque algorithme va sur le contenu qu'il génère.
  - point TSPE-323 → « Dénombrement > Combinaisons > triangle de Pascal » — algorithme : les coefficients binomiaux par la relation de Pascal
  - point TSPE-324 → « Dénombrement > Arrangements et permutations > permutations » — algorithme : générer les permutations
  - point TSPE-325 → « Dénombrement > Combinaisons > combinaisons » — algorithme : générer les parties à 2, 3 éléments (combinaisons)
  - 1 modèle(s) → « Dénombrement > Combinaisons > combinaisons » : « Python : générer les paires, les triplets, les parties » — générer les parties à 2 ou 3 éléments, ce sont des combinaisons ; suit son point TSPE-325

### Les notions du symptôme sans facette

Pour celles-ci, le découpage est déjà par contenu : le symptôme venait d'ailleurs. Rien à changer dans l'arbre.

| Notion                                               | D'où venait le symptôme                                                                                                                                                          |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nombres et calculs > Entiers : priorités opératoires | « sans parenthèses » porte des modèles sans point propre : un contenu, couvert par les points de la notion (5-004, 5-007).                                                       |
| Nombres et calculs > Décimaux : calculs              | deux découpages de contenu se croisent (opérations / techniques) : question Q2.                                                                                                  |
| Nombres et calculs > Relatifs : calculs              | « carré » porte un modèle sans point : un contenu, hors programme assumé.                                                                                                        |
| Arithmétique > Congruences                           | désaccord entre sœurs réglé par le lot (D3 : le modèle va sous « équations ax ≡ b [n] », sous-notion de contenu).                                                                |
| Proportionnalité > Évolutions                        | désaccords réglés par le lot (D62, D63) ; découpage par contenu.                                                                                                                 |
| Fonctions > Second degré                             | désaccords réglés par le lot (remontées de 1SPE-253 et 1SPE-287 à la notion ; racines par Δ sous « discriminant ») ; découpage par contenu.                                      |
| Fonctions > Fonction exponentielle                   | désaccords réglés par le lot (D16, D17) ; découpage par contenu.                                                                                                                 |
| Fonctions > Fonctions trigonométriques               | désaccords réglés par le lot (angles associés, tags hors programme retirés) ; découpage par contenu.                                                                             |
| Fonctions > Limites de fonctions                     | « formes indéterminées » porte un modèle sans point propre : un contenu, le point de la notion (TSPE-403) le couvre.                                                             |
| Équations différentielles > Généralités              | désaccord du lot (D90 : tag de Tle spé retiré) ; découpage par contenu.                                                                                                          |
| Suites > Limites de suites                           | « suites majorées, minorées » : un contenu (D69 reste une question du lot).                                                                                                      |
| Géométrie > Produit scalaire                         | désaccord réglé par le lot (D39) ; « calculer un produit scalaire » est un nom d'activité pour un contenu (les expressions du produit scalaire) : renommage proposé (section D). |
| Grandeurs et mesures > Aires                         | « triangle rectangle » porte deux modèles sans point : un contenu (une figure), hors programme assumé.                                                                           |
| Grandeurs et mesures > Unités et conversions         | « unités simples » et « unités composées » portent des modèles sans point : des contenus, hors programme assumé.                                                                 |

## Section B — les autres facettes, trouvées par le balayage des 540 sous-notions

Le balayage a relevé 98 sous-notions dont le nom évoque une activité, un registre ou un outil. La plupart sont de faux positifs : un nom d'activité pour un contenu qui n'a pas de doublon (« Entiers : numération > comparer » = l'ordre ; « Calcul littéral > factoriser » = une technique) — elles ne bougent pas, un renommage est proposé en section D. Les vraies facettes, celles qui recouvrent un contenu voisin ou n'en ont pas, sont ci-dessous.

### Algèbre > Inéquations : premier degré

- **Avant** (🔸 = facette) — notion : 1 exercice · points 2de 1; ax + b < c : points 3e 1, 2de 1; ax + b < cx + d : vide; 🔸 mettre en inéquation : points 2de 1.
- **Après** — notion : 1 exercice · points 2de 2; ax + b < c : points 3e 1, 2de 1; ax + b < cx + d : vide.
- **Ce qui bouge** :
  - archive « mettre en inéquation » → (notion) (0 modèle(s), 0 exercice(s), points 2-278) — Activité.

### Fonctions > Convexité

- **Avant** (🔸 = facette) — notion : 3 exercices · points Tle spé 2, Tle comp. 1; caractérisations : 1 modèle · points Tle spé 2, Tle comp. 3; dérivée seconde : 2 modèles · points Tle spé 1, Tle comp. 1; point d'inflexion : 1 modèle · points Tle spé 1, Tle comp. 1; inégalités de convexité : 1 modèle · 1 exercice · points Tle spé 3; 🔸 lecture graphique : 2 modèles · points Tle spé 2, Tle comp. 1.
- **Après** — notion : 2 modèles · 3 exercices · points Tle spé 4, Tle comp. 2; caractérisations : 1 modèle · points Tle spé 2, Tle comp. 3; dérivée seconde : 2 modèles · points Tle spé 1, Tle comp. 1; point d'inflexion : 1 modèle · points Tle spé 1, Tle comp. 1; inégalités de convexité : 1 modèle · 1 exercice · points Tle spé 3.
- **Ce qui bouge** :
  - archive « lecture graphique » → (notion) (2 modèle(s), 0 exercice(s), points TSPE-418, TSPE-419, TCOMP-264) — Registre ; ses points lisent à la fois convexité, concavité et points d'inflexion : leur place est la notion.

### Fonctions > Fonction inverse

- **Avant** (🔸 = facette) — définition et courbe : points 2de 1, Tle techno 2; variations : points 2de 1, Tle techno 1; 🔸 comparer des images : vide; 1/x = k, 1/x < k : points 2de 1.
- **Après** — définition et courbe : points 2de 1, Tle techno 2; variations : points 2de 1, Tle techno 1; 1/x = k, 1/x < k : points 2de 1.
- **Ce qui bouge** :
  - archive « comparer des images » → « variations » (0 modèle(s), 0 exercice(s)) — Activité ; vide.

### Fonctions > Fonction racine carrée

- **Avant** (🔸 = facette) — définition et courbe : points 2de 1; variations : vide; 🔸 comparer des images : vide; √x = k, √x < k : points 2de 1.
- **Après** — définition et courbe : points 2de 1; variations : vide; √x = k, √x < k : points 2de 1.
- **Ce qui bouge** :
  - archive « comparer des images » → « variations » (0 modèle(s), 0 exercice(s)) — Activité ; vide.

### Graphes > Vocabulaire des graphes

- **Avant** (🔸 = facette) — sommets, arêtes, degré : 2 modèles · points Expertes 3; graphe orienté : vide; 🔸 modélisation par un graphe : 2 modèles · points Expertes 1.
- **Après** — notion : 2 modèles · points Expertes 1; sommets, arêtes, degré : 2 modèles · points Expertes 3; graphe orienté : vide.
- **Ce qui bouge** :
  - archive « modélisation par un graphe » → (notion) (2 modèle(s), 0 exercice(s), points TEXP-335) — Activité (modéliser).

### Intégration > Intégrale et aire

- **Avant** (🔸 = facette) — notion : 1 exercice · points Tle spé 2, Tle comp. 2; aire algébrique : 1 modèle · 1 exercice · points Tle spé 2, Tle comp. 3; aire entre deux courbes : 1 modèle · 2 exercices · points Tle spé 1, Tle comp. 1; 🔸 lecture graphique : 1 modèle · 1 exercice · points Tle spé 1, Tle comp. 1.
- **Après** — notion : 1 exercice · points Tle spé 2, Tle comp. 2; aire algébrique : 2 modèles · 2 exercices · points Tle spé 3, Tle comp. 4; aire entre deux courbes : 1 modèle · 2 exercices · points Tle spé 1, Tle comp. 1.
- **Ce qui bouge** :
  - archive « lecture graphique » → « aire algébrique » (1 modèle(s), 1 exercice(s), points TSPE-485, TCOMP-274) — Registre ; estimer une intégrale par une aire, c'est l'intégrale comme aire.

### Intégration > Valeur moyenne

- **Avant** (🔸 = facette) — 🔸 calcul : 1 modèle · points Tle spé 1, Tle comp. 2; 🔸 encadrement : 1 modèle · points Tle spé 1, Tle comp. 2; 🔸 interprétation : 1 modèle · points Tle spé 1, Tle comp. 1.
- **Après** — notion : 3 modèles · points Tle spé 3, Tle comp. 5.
- **Ce qui bouge** :
  - archive « calcul » → (notion) (1 modèle(s), 0 exercice(s), points TSPE-483, TCOMP-268, TCOMP-277) — Activité ; la valeur moyenne est un seul contenu.
  - archive « encadrement » → (notion) (1 modèle(s), 0 exercice(s), points TSPE-486, TCOMP-269, TCOMP-275) — Activité.
  - archive « interprétation » → (notion) (1 modèle(s), 0 exercice(s), points TSPE-493, TCOMP-281) — Activité (interpréter).

### Matrices > Suites et matrices

- **Avant** (🔸 = facette) — notion : points Expertes 1; suites couplées : 1 modèle · 1 exercice · points Expertes 3; 🔸 modélisation : 1 modèle · points Expertes 1.
- **Après** — notion : 1 modèle · points Expertes 2; suites couplées : 1 modèle · 1 exercice · points Expertes 3.
- **Ce qui bouge** :
  - archive « modélisation » → (notion) (1 modèle(s), 0 exercice(s), points TEXP-336) — Activité (modéliser).

### Probabilités > Loi binomiale

- **Avant** (🔸 = facette) — notion : points Tle spé 1, Tle comp. 2, Tle techno 2; schéma de Bernoulli : 1 modèle · points 1re techno 2, Tle spé 2, Tle comp. 3; 🔸 reconnaître une loi : 1 modèle · points Tle spé 1, Tle comp. 1, Tle techno 1; calcul de probabilités : 2 modèles · points Tle spé 2, Tle comp. 2, Tle techno 2; intervalle de fluctuation : points Tle spé 2, Tle comp. 1; coefficients binomiaux : 1 modèle · points Tle spé 2, Tle comp. 2, Tle techno 3; espérance et variance : 1 modèle · points Tle spé 2, Tle comp. 2, Tle techno 2.
- **Après** — notion : points Tle spé 1, Tle comp. 2, Tle techno 2; schéma de Bernoulli : 2 modèles · points 1re techno 2, Tle spé 3, Tle comp. 4, Tle techno 1; calcul de probabilités : 2 modèles · points Tle spé 4, Tle comp. 2, Tle techno 3; intervalle de fluctuation : points Tle spé 2, Tle comp. 1; coefficients binomiaux : vide; espérance et variance : 1 modèle · points Tle spé 2, Tle comp. 2, Tle techno 2.
- **Ce qui bouge** :
  - archive « reconnaître une loi » → « schéma de Bernoulli » (1 modèle(s), 0 exercice(s), points TSPE-508, TCOMP-295, TTECHNO-062) — Activité : reconnaître une loi binomiale, c'est reconnaître un schéma de Bernoulli et ses paramètres.

### Suites > Généralités sur les suites

- **Avant** (🔸 = facette) — notion : 1 exercice · points 1re spé 3; 🔸 calculer un terme : 5 modèles · 2 exercices · points 1re spé 1, 1re techno 1; explicite ou par récurrence : 1 modèle · 1 exercice · points 1re spé 1, 1re techno 1; 🔸 deviner le terme général : 3 modèles · points 1re spé 1; représentation graphique : 3 modèles · points 1re spé 1, 1re ens. sci. 4, 1re techno 4; sens de variation : 5 modèles · 2 exercices · points 1re spé 1, 1re techno 1.
- **Après** — notion : 1 modèle · 1 exercice · points 1re spé 5, 1re techno 1, Tle techno 1; explicite ou par récurrence : 6 modèles · 2 exercices · points 1re spé 3, 1re techno 2; représentation graphique : 3 modèles · points 1re spé 1, 1re ens. sci. 4, 1re techno 5; sens de variation : 3 modèles · 2 exercices · points 1re spé 1, 1re techno 1.
- **Ce qui bouge** :
  - archive « calculer un terme » → « explicite ou par récurrence » (5 modèle(s), 2 exercice(s), points 1SPE-223, 1TECHNO-043) — Activité : calculer un terme, c'est utiliser le mode de génération de la suite.
  - archive « deviner le terme général » → « explicite ou par récurrence » (3 modèle(s), 0 exercice(s), points 1SPE-222) — Activité : trouver une relation explicite ou de récurrence.
  - point 1SPE-236 → (notion) — algorithme : calcul de termes et de sommes de termes d'une suite quelconque
  - point 1SPE-239 → (notion) — algorithme : liste des premiers termes (Syracuse, Fibonacci)
  - point 1TECHNO-050 → (notion) — algorithme : calculer un terme, une somme finie de termes
  - point 1TECHNO-051 → « représentation graphique » — algorithme : lister des termes et les représenter
  - point TTECHNO-030 → (notion) — algorithme : sommes des premiers carrés, cubes, termes (comme 1SPE-241, sur la notion)
  - 1 modèle(s) → (notion) : « Valeur renvoyée par une fonction Python qui calcule un terme » — une fonction Python qui calcule un terme : le calcul des termes, avec son point 1SPE-236

Conservées comme contenus, malgré leur nom : « arbres pondérés » et « tableaux croisés » (des objets mathématiques), « représentation graphique » d'une suite et « courbe » d'une fonction (des objets), « méthode d'Euler » et « méthode des rectangles » (des techniques), « Suites et modélisation > seuil » (le rang de seuil).

## Section C — découpages par registre ou par activité au niveau des notions

Plus lourds (ils déplacent des notions entières) : présentés en questions, non simulés.

- **« avec / sans coordonnées »** : « Vecteurs », « Espace », « Orthogonalité » — question Q4.
- **Notions-activités** : « Problèmes de dénombrement », « Suites et modélisation », « Problèmes arithmétiques » — question Q5.
- Non concernés : les couples « X : sens et écritures » / « X : calculs » (Fractions, Décimaux, Relatifs, Racines carrées…) découpent par contenu (l'objet et ses écritures / les opérations) ; la branche « Algorithmique » est un contenu du programme.

## Section D — renommages proposés (rien ne bouge)

Des sous-notions de contenu portent un nom d'activité. Les renommer en nom de contenu respecte le principe sans rien déplacer. Facultatif ; à valider en bloc ou au cas par cas.

| Sous-notion                                                                        | Nom proposé                                                       |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Entiers : numération > comparer / décomposer / écrire / repérer / dénombrer        | ordre / décomposition / écritures / droite graduée / dénombrement |
| Décimaux : numération > comparer / décomposer / écrire / encadrer                  | ordre / décomposition / écritures / encadrement                   |
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

## Questions à trancher

- **Q1 — « Dérivation > optimisation » : la fondre dans « variations » ?**
  - « Résoudre un problème d'optimisation » (1SPE-284) et 17 exercices sont rangés sous « optimisation ». Un problème d'optimisation, c'est chercher un extremum en contexte : un type de problème, pas un contenu à part. La fondre dans « variations » (qui reçoit déjà « étude de fonction ») ou la garder comme sous-notion ?
  - Proposition : La fondre dans « variations » : même contenu (extremums), et l'audit vient d'y mettre « étude de fonction ». On perd le filtre « problèmes d'optimisation » sur les 17 exercices ; le point 1SPE-284 le garde.
- **Q2 — « Décimaux : calculs » : deux découpages de contenu se croisent**
  - Ses sous-notions mélangent les opérations (additionner, soustraire, multiplier, diviser) et les techniques (puissances de 10, double et moitié, distributivité, calcul astucieux, calcul posé) : un calcul posé d'addition décimale a deux places. Lequel garder ?
  - Proposition : Garder les opérations, comme « Fractions : calculs », et y verser les techniques : chaque point de calcul posé, de puissances de 10, de double et moitié, de calcul astucieux va sur l'opération qu'il travaille (sur la notion s'il en couvre plusieurs, ex. CM1-050 « additions et soustractions posées »). Variante : une notion par opération, comme pour les entiers (« Décimaux : multiplication »…), avec les techniques en sous-notions. Rien n'est simulé tant que ce n'est pas tranché.
- **Q3 — Au cycle 2, « double et moitié » et « triple et tiers » existent sous l'addition ET sous la multiplication**
  - Le BO met les doubles et moitiés dans les faits additifs au CP (CP-019) et dans les faits multiplicatifs au CE1-CE2 (CE1-028, CE2-022) ; les modèles sont les mêmes des deux côtés (« Trouver le double », « Trouver la moitié »). « Triple et tiers » n'a aucun point, sous aucune des deux notions. Un seul nœud par contenu ?
  - Proposition : « Triple et tiers » : un seul nœud, sous la multiplication (multiplier par 3), les 5 modèles de l'addition y vont. « Double et moitié » : un seul nœud aussi, sous la multiplication, les points du CP compris ; ou bien garder les deux, puisque le BO lui-même les met des deux côtés — à toi de dire.
- **Q4 — Section C — les notions coupées par registre : « avec / sans coordonnées »**
  - Trois paires de notions sont découpées par le registre, pas par le contenu : « Vecteurs : sans / avec coordonnées » (26 points, 0 modèle), « Espace : sans / avec coordonnées » (20 points, 7 modèles), « Orthogonalité : sans / avec coordonnées » (30 points, 13 modèles). D'où D36 et A171 : un alignement calculé en coordonnées hésitait entre deux notions. Les fusionner par contenu ?
  - Proposition : Une notion par paire, découpée par objet ; les coordonnées deviennent une méthode, que disent les points. Vecteurs du plan : vecteur et translation, égalité, somme et Chasles, produit par un réel, colinéarité (déterminant compris), coordonnées, norme. Espace : vecteurs de l'espace, colinéarité et alignement, coplanarité et bases, coordonnées, représentation paramétrique, positions relatives et intersections. Orthogonalité et distances dans l'espace : produit scalaire (norme et distance comprises), orthogonalité de droites et plans, vecteur normal et équation cartésienne, projeté orthogonal, angles, sphère. Changement lourd (points de Tle spé à re-rattacher) : à faire dans un second temps si tu le retiens ; non simulé.
- **Q5 — Section C — les notions-activités**
  - Trois notions sont nommées par une activité : « Problèmes de dénombrement » (elle porte les savoir-faire qui valent pour tout le dénombrement : TSPE-317, 318, 319 ; un point ne peut pas viser une branche), « Suites et modélisation » (après l'audit, il lui reste « seuil » et des points de modélisation) et « Problèmes arithmétiques » au primaire (typologie des problèmes du BO : parties-tout, comparaison… ; 30 points, aucun modèle). Les garder ?
  - Proposition : Les garder : la première est le seul endroit possible pour des savoir-faire transversaux ; la typologie des problèmes est un contenu didactique propre au primaire. Renommer « Suites et modélisation » en « Modèles d'évolution » (croissance linéaire ou exponentielle, seuils) dirait le contenu plutôt que l'activité.
- **Q6 — « Situations de proportionnalité » : « reconnaître » et « appliquer »**
  - Ces deux sous-notions (10 points, 5 modèles, primaire et collège) découpent par activité, à côté de « quatrième proportionnelle » et « ratio » (contenus). « Appliquer » recouvre les procédures, dont la quatrième proportionnelle.
  - Proposition : « reconnaître » → renommée « caractérisation » (définition, tableau, graphique : 6-189, 5-090, 5-091, 5-099…) ; « appliquer » → fondue sur la notion (6-191 « choisir une procédure adaptée » couvre toutes les procédures), sauf 5-088 (coefficient) qui pourrait fonder une sous-notion « coefficient de proportionnalité ». À trancher avant le balisage du cycle 3 et du cycle 4 ; non simulé.
- **Q7 — Sous-notions vidées par le lot, selon tes réponses à ses questions**
  - « Loi binomiale > coefficients binomiaux » se vide si tu retiens la fusion de D51 ; « Limites de suites > suites majorées, minorées » se vide si tu retiens le déplacement de D69 (ma recommandation était de l'y laisser, sans point). Les archiver dans ce cas ?
  - Proposition : Oui, les archiver si elles se vident (un archivage se défait).
