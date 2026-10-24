# Retrait de `/spreadsheet` (tableur V4)

## Reprendre ici

_Mis à jour le 2026-10-24, après #1692 (mergée) — chantier clos._

- **État** : #1692 mergée (page, API, module `src/lib/spreadsheet/`, composants, garde
  d'accès ; `/spreadsheet` et `/spreadsheet/<id>` → `/atelier` en 308).
- **Prochaine action** : aucune, sauf la table (ci-dessous).
- **En attente de David** : supprimer la table `spreadsheets` (1 ligne en prod, d'un seul compte,
  modifiée le 2025-12-05) — migration destructive, seulement après le `deploy:prod` qui livre ce
  retrait.
- **Worktree / branche** : `../ubumaths-wt-retrait-spreadsheet` · `chore/retrait-spreadsheet`.

## Décision

David, 2026-10-24 : « on enlève le spreadsheet ». La grille de l'atelier le remplace
(`atelier-tableur-progress.md`). Redirection vers `/atelier` comme pour `/cas`.
Le compteur localStorage `chiphre-spreadsheet-state` reste dans `work-data.ts` : il efface au
changement de compte ce que d'anciens navigateurs gardent encore.
