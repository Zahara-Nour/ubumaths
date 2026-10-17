---
title: Atelier — tableur intégré, lot 5 : ALEA et « Relancer » (phase 0)
date: 2026-10-15
status: phase 0 VALIDÉE (2026-10-15, « je valide ») ; Q-L5-1 à Q-L5-5 décidées (les cinq recos)
---

# Atelier — tableur intégré, lot 5 : ALEA et « Relancer »

Lots 1 à 4 livrés (#1410 → #1434, pas encore en prod). Phase 0 du tableur :
[atelier-tableur-phase0.md](atelier-tableur-phase0.md) ; lot 4 :
[atelier-tableur-lot4-phase0.md](atelier-tableur-lot4-phase0.md). Journal :
[atelier-tableur-progress.md](atelier-tableur-progress.md).

Ce lot ajoute le **hasard** à la grille : `ALEA()` et `ALEA.ENTRE.BORNES(a ; b)`, et un bouton
**« Relancer »**. C'est le geste des simulations du collège et du lycée : lancer un dé 200 fois
(`=ALEA.ENTRE.BORNES(1;6)` recopié), compter les 6 (`=NB.SI(A1:A200;6)`), relancer, comparer.

## Déjà décidé (rappel)

- **T8** — ALEA ne tire qu'au clic sur « Relancer » ; les mêmes tirages reviennent au
  rechargement.
- **T6** — Annuler (Ctrl+Z) défait un geste de la grille.
- **Q-L4-1** — Les fonctions du tableur sont une couche de la grille, avant mathAST.
- **Q-L4-7** — Les noms se tapent en minuscules ou majuscules, avec ou sans accent, et sont réécrits
  en capitales.
- **Existant** — `.simuler L M 100` tire déjà des effectifs avec une source à graine
  (`createRandomSource`, `src/lib/utils/random.ts`).

---

## Comportements proposés

### 1. Les fonctions

- **Nominal** — `=ALEA()` : un nombre au hasard dans [0 ; 1[. La case le montre approché
  (`≈ 0,4821`), comme toute valeur qui n'est pas exacte.
- **Nominal** — `=ALEA.ENTRE.BORNES(1;6)` : un entier au hasard de 1 à 6, bornes comprises.
  Il est exact (`4`).
- **Nominal** — Elles se recopient et se combinent : `=ALEA.ENTRE.BORNES(1;6)+ALEA.ENTRE.BORNES(1;6)`
  pour la somme de deux dés, `=SI(ALEA()<0,3;1;0)` pour une épreuve de Bernoulli.
- **Nominal** — L'aide sous la barre les connaît ; `=alea.entre.bornes(` s'écrit
  `=ALEA.ENTRE.BORNES(`.
- **Erreur** — Bornes non entières, ou a > b : « ALEA.ENTRE.BORNES attend deux entiers a ⩽ b :
  ALEA.ENTRE.BORNES(1 ; 6). ». `ALEA(2)` : « ALEA s'écrit sans argument : ALEA(). ».
- **Erreur** — Dans Calcul, `alea()` renvoie vers la grille, comme `somme(L)` (Q-L4-6).

### 2. Quand le hasard tire (T8)

- **Nominal** — Une case tire **une fois**, quand on l'écrit. Elle garde son tirage quand on
  écrit ailleurs, quand on recharge la page, et même quand on la réécrit à l'identique.
- **Nominal** — « Relancer » tire **toutes** les cases à hasard d'un coup ; les formules qui les
  citent (NB.SI, MOYENNE…) se recalculent.
- **Nominal** — Une recopie vers le bas tire une valeur différente par case.
- **Technique** — Le tirage d'une case ne dépend que d'une **graine** de l'atelier, de l'adresse de
  la case et de la place de l'appel dans la formule. Il ne dépend pas de l'ordre de calcul.
  « Relancer » change la graine. La graine est rangée avec la grille (un entier de 32 bits) dans la
  sauvegarde et dans le lien, seulement quand une case tire au hasard.

### 3. Le bouton « Relancer »

- **Nominal** — Le bouton « Relancer » est dans la vue Données, à côté de la barre, et
  n'apparaît que si une case contient ALEA (Q-L5-2). Il est atteignable au clavier, et F9 fait
  de même, comme dans LibreOffice et Excel.
- **Nominal** — Le bouton est annoncé aux lecteurs d'écran : « Nouveaux tirages : 200 cases. ».

### 4. Le lien et l'atelier reçu (Q-L5-4)

- **Nominal** — Le lien garde la graine : celui qui l'ouvre voit **les mêmes tirages** que celui
  qui l'a partagé. C'est indispensable pour discuter d'une simulation en classe.
- **Limite** — « Garder dans mon atelier » un atelier reçu : ses colonnes changent de place
  (T7). Ses tirages, qui dépendent de l'adresse, changent donc aussi. Une note le dit.

### 5. Annuler (Q-L5-3)

- **Nominal** — « Relancer » s'annule par Ctrl+Z, comme un geste de la grille : on retrouve les
  tirages d'avant.

---

## Questions du lot 5 — tranchées par David (2026-10-15, « je valide » : les cinq recos)

Décidé : **Q-L5-1 (a)** ALEA() et ALEA.ENTRE.BORNES · **Q-L5-2 (a)** « Relancer » à côté de la barre,
seulement s'il y a du hasard, et F9 · **Q-L5-3 (a)** Ctrl+Z annule un « Relancer » · **Q-L5-4 (a)**
le lien garde la graine · **Q-L5-5 (a)** un tirage ne dépend que de la graine et de sa place.

**Q-L5-1 — Quelles fonctions ?**

- **(a)** `ALEA()` et `ALEA.ENTRE.BORNES(a ; b)`, les deux de LibreOffice et Excel.
- **(b)** Seulement `ALEA.ENTRE.BORNES`, celle des exercices de collège.

**Reco (a).** ALEA() sert dès qu'on simule une probabilité qui n'est pas « 1 sur 6 »
(`=SI(ALEA()<0,3;1;0)`), ce qui est le cas au lycée.

**Q-L5-2 — Où mettre « Relancer » ?**

- **(a)** Dans la vue Données, à côté de la barre, visible seulement s'il y a une case à hasard,
  plus la touche F9.
- **(b)** Toujours visible, grisé avec sa raison quand il n'y a pas de hasard.

**Reco (a).** Un bouton inutile dans 95 % des grilles serait du bruit. F9 est le raccourci des
tableurs ; un élève qui le connaît le retrouve.

**Q-L5-3 — « Relancer » s'annule-t-il par Ctrl+Z ?**

- **(a)** Oui : on retrouve les tirages d'avant, par exemple pour revenir à une série
  remarquable.
- **(b)** Non : un tirage, c'est comme un dé qu'on a lancé.

**Reco (a).** C'est cohérent avec T6 (tout geste de la grille s'annule), et c'est peu coûteux :
la graine précédente suffit.

**Q-L5-4 — Le lien garde-t-il les tirages ?**

- **(a)** Oui : la graine voyage, et tout le monde voit les mêmes nombres.
- **(b)** Non : celui qui ouvre le lien tire ses propres valeurs.

**Reco (a).** C'est T8 étendu au partage. Un professeur qui projette « regardez, 38 six sur
200 » doit voir la même chose que l'élève.

**Q-L5-5 — Un tirage reste-t-il fixe quand on réécrit sa case ?**

- **(a)** Oui : il ne dépend que de la graine et de la place de la case. Réécrire
  `=ALEA.ENTRE.BORNES(1;6)` à l'identique redonne le même nombre ; seul « Relancer » change.
- **(b)** Non : réécrire une case la fait tirer de nouveau.

**Reco (a).** C'est la seule règle simple qui tienne T8 (« ne tire qu'au clic sur
Relancer »), et elle rend les tirages indépendants de l'ordre des calculs. Modifier `(1;6)` en
`(1;10)` change le nombre, parce que les bornes changent.

---

## Découpage en PR (lot 5)

1. **Le moteur** : ALEA, ALEA.ENTRE.BORNES, la graine (rangement, lien, fusion), le recalcul des
   cases à hasard quand elle change, le renvoi de Calcul. Tests en node : mêmes tirages au
   rechargement, distribution (sur 2 000 tirages, chaque face entre 280 et 390), indépendance
   de l'ordre de calcul.
2. **Le bouton** : « Relancer », F9, l'annonce, l'annulation (Q-L5-3), la note de la fusion.
   Tests dans un vrai navigateur, capture.

Doc : [atelier.md](../systeme/atelier.md) à chaque PR (section « La grille »).
