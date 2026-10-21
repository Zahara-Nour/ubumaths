# tableur-chrono — limite de temps du test ECARTYPE

## Reprendre ici

_Mis à jour le 2026-10-21, avant la PR._

- **État** : limite du test `formules-tableur.test.ts` (ECARTYPE de 200 valeurs) passée de 150 à 400 ms · **Prochaine action** : PR, CI, merge, puis archiver ce journal · **En attente de David** : rien · **Pièges en cours** : aucun · **Worktree / branche** : `../ubumaths-wt-tableur-chrono` · `test/tableur-chrono`

## Historique

- Flake récurrent signalé par les triages #1511 et #1549 (168,99 ms > 150 ms sur un runner chargé).
- Mesures locales : 47-98 ms en temps normal ; 798-1 345 ms avec la régression simulée (moyenne recalculée pour chaque valeur). 400 ms sépare les deux avec une marge ≥ 2× de chaque côté.
