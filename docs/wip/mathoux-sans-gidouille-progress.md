# Mathoux sans gidouille — journal

> Branche `feat/mathoux-sans-gidouille`, worktree `../ubumaths-wt-mathoux-sans-gidouille`. Démarré
> le 2026-10-24. Suite de [mathoux-reveil-progress.md](mathoux-reveil-progress.md).

## Reprendre ici

_Mis à jour le 2026-10-24, après #1681._

- **État** : **chantier clos.** #1681 mergée, pas en prod (au prochain `deploy:prod`, à la demande
  de David). Démo des Mathoux mise à jour avec ce code.
- **Prochaine action** : aucune.
- **En attente de David** : `deploy:prod`, puis la vérification manuelle #1681.
- **Pièges en cours** : aucun. Idée notée pour les accessoires : la panse libre accueillera la
  décoration achetée en gidouilles (`mathoux-conception.md`, étape 3).
- **Worktree / branche** : supprimés.

## Décisions de David (2026-10-24)

1. La gidouille sur la panse des Mathoux « est de trop » : **retirée partout**, y compris sur la
   silhouette (où elle était en pointillé).
2. Le Al Jabr Oriental, dont la gidouille rouge était le motif, reçoit des **arabesques rouges**
   (volutes sur les flancs et au front) et des **yeux vairons** (bleu et cuivre).
3. Le Lunaire de Patatovie garde son croissant de lune, désormais seul sur la panse.
4. Pas de page de comparaison : code direct, vérification sur la Chatterie après le merge.

## Journal

- Tests rouges d'abord (`MathouAvatar.svelte.test.ts`) : aucune `[data-part="gidouille"]` ni
  pointillé pour chaque race × stade, en sieste et en silhouette ; iris `[data-part="iris"]` pareils
  sauf le Al Jabr (`eyes`, `eyesRight`).
- `StageTemplate.gid` (rayon, tours) devient `moon` (rayon seul, mêmes valeurs) : le croissant du
  Lunaire garde exactement sa taille. `spiral()` supprimée.
- Rendu vérifié à l'œil par capture (chaton, matou, grand matou, sieste, silhouette du Al Jabr ;
  Lunaire matou et grand matou ; noir, tigré, tacheté).
