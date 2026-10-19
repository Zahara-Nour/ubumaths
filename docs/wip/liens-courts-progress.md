# Liens courts — journal de progression

## Reprendre ici

_Mis à jour le 2026-10-19, PR 2 en cours._

- **État** : PR 2 en cours sur `feat/liens-courts-route`. Faits : `db:types`, `src/lib/validation/short-link.ts`, `src/lib/server/short-links.ts`, `POST /api/short-links`, route `/l/[code]` (302 + `X-Robots-Tag: noindex`, 404 « Ce lien n’existe pas »), tests serveur (28, mutations vérifiées rouges).
- **Prochaine action** : `QrCodeButton` (adresse résolue à l'ouverture) + `SeriesLinkShare` (prof/admin seulement), tests client, doc, revues `code-reviewer` + `security-auditor`, PR.
- **En attente de David** : rien.
- **Pièges** : une colonne générée exige une expression IMMUTABLE. Cible en ASCII imprimable seulement. `supabase db push` ne marche que depuis le dépôt principal.
- **Worktree / branche** : `../ubumaths-wt-liens-courts` · `feat/liens-courts-route`.

## Historique

### 2026-10-19 — PR 1, migration

- Tests d'abord : `tests/integration/liens-courts.test.ts`, 19 rouges (`PGRST202`/`PGRST205`) sans la migration, puis verts.
- Migration appliquée en local par `psql`, sans `db:reset`.
- Revues : cible restreinte à l'ASCII imprimable (l'Unicode ferait planter l'en-tête `Location` et permet `/∕hote`) ; tests renforcés (comptage par cible, 42501 pour l'anonyme, filet de la table au client service). Les trois cas Unicode vérifiés rouges avec l'ancienne regex.
- Garde SECURITY DEFINER : deux entrées ajoutées. Vérifié que le garde échoue sans l'entrée `create_short_link`.
- #1537 mergée, `db:migrate` joué depuis `main`, droits vérifiés en prod par le MCP.
