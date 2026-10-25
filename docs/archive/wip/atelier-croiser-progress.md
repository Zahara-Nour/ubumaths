# v2 lot 2, PR (b) — `.croiser`

Branche `feat/atelier-croiser`. Décisions Q88-Q89 (`outils-statistiques-v2-progress.md`).

- `.croiser L M [lignes | colonnes | fréquences]` (atelier/cross.ts) : tableau croisé de deux listes
  qualitatives de même longueur, modalités dans l'ordre d'apparition, totaux ; tableau de la v1
  construit par spec directe, sous la ligne de l'historique ; aucune liste créée.
- Action « Tableau croisé avec M » (seule action à deux listes d'une liste qualitative), même raison
  que la commande quand elle est refusée ; prépare `.croiser L M`.
- Revue : une liste REFUSÉE était croisée avec ses modalités brutes (et son bouton restait actif
  depuis l'autre liste) → refusée avec son message ; modalité `Total` en collision avec les totaux
  → réservée comme dans un bloc de la v1 ; message propre pour `.croiser L L`.
- Ouvert pour David (Q93) : plafond de largeur — la v1 limite un bloc à 8 noms par côté (Q34),
  l'atelier accepte 20 modalités par liste (tableau défilant à l'écran).
