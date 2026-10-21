# deps-securite — correctifs de sécurité des dépendances (2026-10-21)

## Reprendre ici

_Mis à jour le 2026-10-21, avant la PR._

- **État** : axios 1.20.0, follow-redirects 1.16.1, source-map-js 1.2.2, vite 7.3.7 ; exception mathlive retirée · **Prochaine action** : PR, CI, merge, archiver ce journal ; fermer #1207, #1316, #1459, #1512 (remplacées) · **En attente de David** : fermeture des anciennes PR · **Pièges en cours** : aucun · **Worktree / branche** : `../ubumaths-wt-deps-securite` · `deps/correctifs-securite-2026-10-21`

## Historique

- `pnpm audit --prod` : 11 high / 7 moderate avant → 0 après.
- Remplace les PR de routines #1316 (2026-10-13), #1512 (2026-10-19) et #1207 (exception mathlive), restées ouvertes et en conflit sur le lockfile.
