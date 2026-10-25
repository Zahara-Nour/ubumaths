---
title: Atelier — tableur intégré, lot 3 : Tabuler (phase 0)
date: 2026-10-15
status: phase 0 VALIDÉE (2026-10-15, « ok ») ; Q-L3-1 à Q-L3-5 décidées (les cinq recos)
---

# Atelier — tableur intégré, lot 3 : Tabuler

Lots 1 et 2 livrés (#1410 → #1424, pas encore en prod) : la grille, puis les formules et leur
recopie. Phase 0 du tableur : [atelier-tableur-phase0.md](atelier-tableur-phase0.md) ; lot 2 :
[atelier-tableur-lot2-phase0.md](atelier-tableur-lot2-phase0.md). Journal :
[atelier-tableur-progress.md](atelier-tableur-progress.md).

Ce lot rend son sens au bouton **« Tabuler »** de la carte d'une fonction, grisé depuis la v1
(« Cette action arrive dans un prochain lot. »), et ajoute la commande **`.tabuler`**. Le
tableau de valeurs est écrit **dans la grille, en formules** : il reste vivant. Hors de ce lot :
`SOMME`, `MOYENNE`… (lot 4), ALEA (lot 5).

## Déjà décidé (rappel)

- **Phase 0 du tableur** (rappel des lots) : « Tabuler vivant (`=A2+0,5`, `=f(A2)`), depuis la
  carte et par `.tabuler` ».
- **Q1** — Dans une formule, lettre + chiffre = cellule, lettre seule = objet : `=f(A2)` lit la
  `f` de l'atelier.
- **Q2** — Une cellule montre sa valeur exacte courte (`13/3`, `√2`), sinon `≈ 4,3333`.
- **Q-L2-3** — Un refus dit comment créer l'objet qui manque.
- **T4** — Une colonne a un titre facultatif. **T6** — Annuler, dans la grille, défait un geste
  entier. **T7** — Un atelier reçu va dans les colonnes libres.
- **Lot 2** — `=f(A2)` hors de l'ensemble de f donne le refus de Calcul ; supprimer f demande
  confirmation quand des cellules la citent ; la recopie (Ctrl+D) écrit `=f(A3)`, `=f(A4)`…
- **Avant le tableur** (phase 0 du grapheur, 2026, A2) : « Tabuler » ne devait écrire qu'une
  ligne dans Calcul, sans changer de vue. La grille n'existait pas : **Q-L3-1 revient dessus**,
  et le dit.

## Ce que l'analyse a mesuré (2026-10-15)

- Un tableau de 9 lignes (`x`, `=f(A1)`, `=g(A1)`, `=h(A1)`) se calcule en **13 ms**.
- Les refus de Calcul arrivent bien dans la case : `1/x` en 0 → « Division par zéro. » ;
  `√x` en −2 → « Le résultat n'est pas un nombre réel. ».
- ⚠️ **Les abscisses s'écrivent en fractions** : `-2` puis `=A1+0,5` donne `-2, -3/2, -1,
-1/2…`, et un pas de 0,1 donne `0, 1/10, 1/5, 3/10…`. Les images aussi : `f(-1,5)` → `27/4`.
  C'est la règle Q2, et c'est **ce que répond Calcul** (`-2+0,5` → `-3/2`, avec « Valeur
  approchée −1,5 » en second). Un tableau de valeurs de 4ᵉ ne se lit pas ainsi → **Q-L3-2**.
- La grille **ignore `.mode décimal`** : elle calcule toujours en exact.
- Le calcul exact, lui, protège d'une dérive : `0,1 + 0,1 + 0,1` vaut exactement `3/10`, jamais
  `0,30000000000000004`.

---

## Comportements proposés

### 1. Tabuler depuis la carte

- **Nominal** — « Tabuler » ouvre, dans la carte, un petit formulaire : **de** `[ ]` **à**
  `[ ]` **pas** `[ ]`, et un bouton « Tabuler ». Il a la forme du champ « image » de la carte.
  Les cases sont pré-remplies (Q-L3-3).
- **Nominal** — Valider écrit deux colonnes dans les **premières colonnes libres** de la grille
  (Q-L3-4). Puis la vue passe sur Données, comme « Diagramme » (Q-L3-1), avec les deux colonnes
  sélectionnées.
- **Nominal** — La colonne des abscisses : la première case vaut le début (`-2`), les suivantes
  `=A1+0,5`, `=A2+0,5`… La colonne des images : `=f(A1)`, `=f(A2)`… Les titres (T4) sont `x` et
  `f(x)`, ou `t` et `f(t)` pour une fonction en t.
- **Nominal** — **Vivant** :
  - redéfinir f recalcule la colonne des images ;
  - changer la première case (`-2` → `0`) décale toutes les abscisses ;
  - bouger un curseur `a` dont f dépend recalcule les images.
- **Nominal** — Les colonnes écrites ne sont **pas nommées** : ce sont des cellules, pas des
  listes. Pour en faire des listes (statistiques, nuage), on les nomme comme toute colonne
  (lot 1). C'était le geste séparé « garder comme listes » de la recherche élève (N5).
- **Nominal** — Tabuler est un seul geste : Ctrl+Z l'annule en entier (T6).
- **Limite** — Un pas qui ne tombe pas juste (`de -2 à 3 pas 0,7`) : la dernière ligne est la
  dernière abscisse ≤ 3 (2,9). Une note le dit sous le formulaire.
- **Limite** — Une abscisse hors de l'ensemble de f : la case dit le refus de Calcul (lot 2). Le
  tableau est écrit quand même : c'est une information pour l'élève.
- **Erreur** — Pas nul ou négatif, fin avant le début, case vide ou illisible : refus sous le
  formulaire (« Le pas doit être positif. »), rien n'est écrit.
- **Erreur** — Plus de 200 lignes : refusé entier. Le message dit le nombre de lignes et quoi
  faire : « Ce tableau aurait 401 lignes, la grille en a 200 : agrandis le pas. »
- **Erreur** — Moins de deux colonnes libres : « Il faut deux colonnes libres dans la grille. »
  Rien n'est écrit, jamais d'écrasement.

### 2. Tabuler par `.tabuler`

- **Nominal** — `.tabuler f de -2 à 3 pas 0,5`, dans la forme de `.intégrer … de 0 à 1`. Mêmes
  colonnes, même bascule que la carte. La ligne de Calcul dit ce qui a été fait : « Tableau de f
  écrit dans la grille, colonnes C et D (11 lignes). »
- **Nominal** — `.tabuler f` sans bornes prend les valeurs par défaut (Q-L3-3).
- **Erreur** — `.tabuler x^2 de 0 à 5` : une expression sans nom est refusée, avec la façon de
  faire (Q-L2-3) : « Définis d'abord la fonction, par exemple f(x) = x^2, puis
  .tabuler f de 0 à 5. ». Le tableau doit citer f pour rester vivant.
- **Erreur** — `.tabuler L` (une liste), `.tabuler a` (une valeur) : « On tabule une fonction. ».
- **Nominal** — L'aide (`.aide`) et la complétion connaissent `.tabuler`.

### 3. Deux fonctions côte à côte

- **Nominal** — Rien de neuf à construire : on tape `=g(A1)` dans la colonne voisine, puis
  Ctrl+D. C'est le geste du tableur, que ce lot montre plutôt qu'il ne le cache. L'aide de
  `.tabuler` le cite en exemple.

### 4. Ce qui ne change pas

- Le lien, la sauvegarde et un atelier reçu : les cellules y sont déjà, avec leurs formules en
  relatif (lot 2).
- « Premiers termes » d'une suite reste une ligne de Calcul (Q-L3-5).

---

## Questions du lot 3 — tranchées par David (2026-10-15, « ok » : les cinq recos)

Décidé : **Q-L3-1 (a)** grille + bascule vers Données · **Q-L3-2 (b)** décimal fini en décimal
dans toute la grille · **Q-L3-3 (a)** de −5 à 5 pas 1, bornes d'un intervalle fermé · **Q-L3-4 (a)**
deux nouvelles colonnes à chaque fois · **Q-L3-5 (a)** suites hors de ce lot.

**Q-L3-1 — Où va le tableau ?**

- **(a)** Dans la grille, et la vue passe sur Données (comme « Diagramme »).
- **(b)** Dans la grille, sans changer de vue : une ligne de Calcul dit « écrit dans la grille ».
- **(c)** Seulement une ligne de Calcul, sans grille (décision A2 d'avant le tableur).

**Reco (a).** Le tableau vit dans la grille, et l'élève doit le voir se remplir. (c) n'est pas
« vivant » : redéfinir f ne le changerait pas.

**Q-L3-2 — Abscisses et images en décimal ?** Aujourd'hui : `-3/2`, `1/10`, `27/4`.

- **(a)** Garder la règle Q2 : fractions dans la case, « Valeur approchée » à la sélection.
- **(b)** Dans **toute la grille**, un nombre décimal fini s'écrit en décimal (`-1,5`, `0,1`,
  `6,75`). Une fraction qui n'en est pas un garde son écriture (`1/3`, `√2`). La fraction se
  voit à la sélection, sous la barre. C'est ce que fait un tableur.
- **(c)** En décimal seulement si la formule, ou une case qu'elle cite, contient un décimal
  tapé. C'est la règle « la réponse s'écrit comme l'élève a écrit », celle de `.limite` et
  `.développer` (2026-10-06).

**Reco (b).** Elle est simple à dire, et on l'attend d'un tableur : `=1/4` y affiche 0,25. (c)
est fidèle à l'élève, mais un tableau mélangerait `-3/2` (abscisse tapée `-2`, pas `0,5` dans la
formule) et `6,75`. ⚠️ (b) change l'affichage du lot 2 pour `=1/4` (0,25 au lieu de 1/4), d'où la
question.

**Q-L3-3 — Les valeurs par défaut du formulaire.**

- **(a)** De −5 à 5, pas 1 (11 lignes). Pour une fonction définie sur un intervalle fermé
  `[a ; b]` : de a à b, pas 1 si b − a ≤ 20, sinon (b − a)/10.
- **(b)** Toujours de 0 à 10, pas 1, comme la NumWorks.

**Reco (a).** −5 à 5 montre les deux côtés de 0, et une fonction sur `[0 ; 3]` ne commence pas
hors de son ensemble.

**Q-L3-4 — Tabuler deux fois la même fonction.**

- **(a)** Deux nouvelles colonnes à chaque fois. L'ancien tableau reste, rien n'est écrasé.
- **(b)** Réécrire le premier tableau de f, s'il est reconnu.

**Reco (a).** C'est la règle « jamais d'écrasement silencieux », et (b) devrait deviner
qu'une colonne est « le tableau de f » alors que l'élève a pu la modifier. On efface un vieux
tableau en vidant ses colonnes.

**Q-L3-5 — Et les suites ?** « Premiers termes » existe déjà, en ligne de Calcul.

- **(a)** Hors de ce lot : Tabuler ne vaut que pour les fonctions.
- **(b)** Tabuler une suite aussi : `n` de 0 à 10, puis `=u(A1)`.

**Reco (a) pour ce lot.** Une suite par récurrence `u(n+1) = √(u(n)+2)` coûte trois fois plus à
chaque ligne en exact (884 ms à la 13ᵉ, mesuré pour le lot 1) : il faut d'abord régler le
plafond de temps. Noté pour un lot suivant.

---

## Découpage en PR (lot 3)

1. **Le modèle et la commande** : `Atelier.tabulate(f, de, à, pas)` (un seul `editCells`,
   titres, colonnes libres, refus), `.tabuler`, aide et complétion. Tests en node. Si (b) est
   retenue à Q-L3-2 : la règle d'affichage décimal ici, avec ses tests sur les cases du lot 2.
2. **La carte** : le formulaire « de / à / pas », la bascule vers Données, la sélection des
   colonnes, « Tabuler » retiré de `NOT_YET`. Tests dans un vrai navigateur, capture.

Doc : [atelier.md](../../systeme/atelier.md) à chaque PR (section « La grille »).
