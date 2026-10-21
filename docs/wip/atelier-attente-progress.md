# atelier-attente — tests de chargement de l'atelier sans délai fixe

## Reprendre ici

_Mis à jour le 2026-10-21, avant la PR._

- **État** : `barre-icones` et `rejeu` attendent le résultat (`vi.waitFor`) au lieu de 50 ms fixes · **Prochaine action** : PR, CI, merge, archiver ce journal · **En attente de David** : rien · **Pièges en cours** : aucun · **Worktree / branche** : `../ubumaths-wt-atelier-attente` · `test/atelier-chargement-attente`

## Historique

- Flakes des triages #1511 (`barre-icones.svelte.test.ts:273`, « charger > atelier vide ») et #1549 (`rejeu.svelte.test.ts:114` et `:129`) : la lecture du fichier est asynchrone, `settle()` (50 ms) ne suffit pas sur un runner chargé.
- Contre-preuve : `choose()` sans attente → anciens tests 11 échecs / 21, nouveaux 0.
