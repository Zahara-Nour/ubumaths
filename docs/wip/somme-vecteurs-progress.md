# Chantier `somme-vecteurs` — somme de deux vecteurs à tracer

## Reprendre ici

_Mis à jour le 2026-11-08, ouverture du chantier (aucune PR)._

- **État** : phase 0 proposée (§ 2), **à valider par David** · **Prochaine action** : réponses aux questions SV1 à SV5, puis tests rouges · **En attente de David** : SV1 à SV5 · **Pièges en cours** : 2-297 a déjà un modèle publié (`51192dc4`) qui détourne le geste « vecteur seul » (§ 1) · **Worktree / branche** : `../ubumaths-wt-somme-vecteurs`, `feat/somme-vecteurs`

## 0. Origine

Ligne 3 du § 1 de [`outils-manquants.md`](outils-manquants.md) (point 2-297 « Représenter la somme de deux
vecteurs à partir de représentants de même origine »). Ordre du 2026-11-06 : après le n° 14 (livré, #2456).

## 1. Constat (2026-11-08)

- **2-297 est déjà couvert en prod** : modèle `51192dc4` « Représenter la somme de deux vecteurs » (lot 12 b-1
  de `questions-2de`, § 78, publié le 2026-11-04), fichier `scripts/questions/2de-vecteurs-c1/05-representer-la-somme.json`.
  Il se sert du geste existant : ` ```courbe ` avec `points: A, B, C` et `tracer: vecteur (a+c ; b+d) depuis A`.
- Ce qui manque à ce modèle (et donc à l'outil) :
  1. **u⃗ et v⃗ ne sont pas dessinés** : ` ```courbe ` n'a pas de flèche d'affichage ; l'élève voit trois points
     et lit « u⃗ = AB⃗, v⃗ = AC⃗ » dans la phrase.
  2. **La tâche est écrite en coordonnées** : la phrase d'erreur dit « Ta flèche représente le vecteur
     (0 ; −3), pas (4 ; 4). » — elle ne reconnaît ni u⃗ − v⃗, ni u⃗ seul, ni la diagonale BC.
  3. La correction ne montre que la flèche verte ; le parallélogramme vit dans une étape ` ```figure ` à part.
- Le bloc ` ```solide ` a déjà le modèle à suivre : `vecteurs: AB, u = AI` (flèches données) et
  `tracer: vecteur 2 u - v depuis A` (combinaison, `SolideTask`, phrases `solideVectorMistake`).
- Voisin : 3-026 (3e, `787cc937`, somme de deux vecteurs en case choix) — session `questions-3`.

## 2. Phase 0 proposée (2026-11-08, à valider)

Outil : dans ` ```courbe `, la même écriture que ` ```solide `.

- `vecteurs: u = AB, v = AC` : flèches données, dessinées (nom u⃗ près du milieu), écran et PDF ; points pris
  dans `points:`.
- `tracer: vecteur u + v depuis A` : combinaison de vecteurs nommés (ou de couples de points, `AB + AC`) ;
  l'attendu est calculé (plus de coordonnées écrites à la main) ; `depuis A` facultatif comme aujourd'hui.
- Juge inchangé (extrémité − origine = la combinaison) ; case `x1;y1/x2;y2` inchangée.
- Phrases reconnues (en plus des actuelles) : « Ta flèche représente u⃗, pas u⃗ + v⃗. », idem v⃗, u⃗ − v⃗,
  v⃗ − u⃗, −(u⃗ + v⃗) (sens) ; sinon « Ta flèche représente le vecteur (0 ; −3), pas u⃗ + v⃗. »
- Correction : flèche verte + construction en pointillés (parallélogramme si même origine).
- Refusé au prof : nom absent de `vecteurs:`, point absent de `points:`, combinaison nulle, extrémité hors
  fenêtre, `tracer: vecteur (3 ; -2)` inchangé (toujours accepté).
- Ensuite : `51192dc4` réécrit avec l'outil (PR de contenu à part).

Questions à David :

- **SV1 — Représentants** : seulement de même origine (2-297), ou aussi bout à bout / ailleurs sur la grille
  (Chasles, 3-026 enchaînements) ? → Je recommande **n'importe où** : le juge ne regarde que les
  coordonnées ; seule la correction change (parallélogramme si même origine, sinon v⃗ mis au bout de u⃗).
- **SV2 — Coefficients** : somme et différence seules, ou entiers (`2u - v`) ? → Je recommande **entiers de −3
  à 3** (pas de fractions : la grille), comme `solide` sans les fractions.
- **SV3 — Phrases d'erreur** : la liste ci-dessus (u⃗ seul, v⃗ seul, u⃗ − v⃗, v⃗ − u⃗, sens) ? → Je recommande
  **oui**, pour une combinaison de deux vecteurs seulement ; au-delà, la phrase générale.
- **SV4 — Correction** : pointillés de construction sur le repère de l'élève, ou laisser l'étape ` ```figure `
  du modèle ? → Je recommande **sur le repère** (l'étape ` ```figure ` disparaît du modèle réécrit).
- **SV5 — Contenu** : réécrire `51192dc4` dans ce chantier (PR de contenu à part, page à cocher) ;
  3-026 reste à la session `questions-3` ? → Je recommande **oui aux deux**.

Question d'accès : personne (aucune migration, outil d'affichage et de geste).
