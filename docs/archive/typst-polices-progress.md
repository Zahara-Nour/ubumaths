# typst-polices — test de compilation typst hors réseau

## Reprendre ici

_Mis à jour le 2026-10-21, après #1590 (mergée) — chantier clos._

- **État** : `qr-typst-compilation.test.ts` charge les polices du dépôt (`loadFonts(…, { assets: false })`) et bloque `fetch` · **Prochaine action** : aucune (clos) · **En attente de David** : rien · **Pièges en cours** : aucun · **Worktree / branche** : `../ubumaths-wt-typst-polices` · `test/typst-polices-locales`

## Historique

- Flake signalé par le triage #1571 : `ConnectTimeoutError` sur le téléchargement des polices par défaut de typst.ts (CDN jsdelivr).
- `compiler.mjs` (typst.ts 0.6.1-rc5) n'ajoute les polices CDN par défaut que si aucun `loadFonts` ne précise `assets` ; `assets: false` les coupe.
- Preuve rouge : `fetch` bloqué sans les polices locales → « réseau interdit dans ce test ».
