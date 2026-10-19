# Liens courts — journal de progression

## Reprendre ici

_Mis à jour le 2026-10-19, PR 1 en cours._

- **État** : phase 0 tranchée ([liens-courts-phase0.md](liens-courts-phase0.md)). PR 1 (migration `short_links`, `create_short_link`, `resolve_short_link`) écrite, 19 tests d'intégration verts, vérifiés rouges sans la migration.
- **Prochaine action** : revue `security-auditor` + `code-reviewer`, PR, merge, `db:migrate`, `db:types`. Ensuite PR 2 : route `/l/[code]`, endpoint de création, QR de série.
- **En attente de David** : rien.
- **Pièges** : une colonne générée exige une expression IMMUTABLE (`convert_to` et `textsend` ne le sont pas) : `target_hash` est une colonne simple recoupée par une contrainte. Index btree plafonné à ~2,7 Ko : l'unicité porte sur l'empreinte.
- **Worktree / branche** : `../ubumaths-wt-liens-courts` · `feat/liens-courts-migration`.

## Historique

### 2026-10-19 — PR 1, migration

- Tests d'abord : `tests/integration/liens-courts.test.ts`, 19 rouges (`PGRST202`/`PGRST205`) sans la migration, puis verts.
- Migration appliquée en local par `psql`, sans `db:reset`.
- Garde SECURITY DEFINER : deux entrées ajoutées. Vérifié que le garde échoue sans l'entrée `create_short_link`.
