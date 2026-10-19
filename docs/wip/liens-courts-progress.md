# Liens courts — journal de progression

## Reprendre ici

_Mis à jour le 2026-10-19, après #1537._

- **État** : PR 1 mergée (#1537) et migration `20261019170000_liens_courts` jouée en prod (vérifié : RLS sans policy, aucun droit direct, création réservée à authenticated, lecture à anon). Rien côté code.
- **Prochaine action** : PR 2, dans un worktree `liens-courts` neuf : `pnpm db:types`, route `/l/[code]` (Zod sur `params.code`, même 404 pour un code inconnu ou mal formé, `noindex`), endpoint de création (Zod + borne de taille, prof/admin), QR de série par l'adresse courte (`SeriesLinkShare`, `QrCodeButton`), puis la doc. Revue `code-reviewer` + `security-auditor`.
- **En attente de David** : rien.
- **Pièges** : une colonne générée exige une expression IMMUTABLE : `target_hash` est une colonne simple recoupée par une contrainte. Cible en ASCII imprimable seulement (les liens du site sont encodés). `supabase db push` ne marche que depuis le dépôt principal (worktree non lié).
- **Worktree / branche** : aucun.

## Historique

### 2026-10-19 — PR 1, migration

- Tests d'abord : `tests/integration/liens-courts.test.ts`, 19 rouges (`PGRST202`/`PGRST205`) sans la migration, puis verts.
- Migration appliquée en local par `psql`, sans `db:reset`.
- Revues : cible restreinte à l'ASCII imprimable (l'Unicode ferait planter l'en-tête `Location` et permet `/∕hote`) ; tests renforcés (comptage par cible, 42501 pour l'anonyme, filet de la table au client service). Les trois cas Unicode vérifiés rouges avec l'ancienne regex.
- Garde SECURITY DEFINER : deux entrées ajoutées. Vérifié que le garde échoue sans l'entrée `create_short_link`.
- #1537 mergée, `db:migrate` joué depuis `main`, droits vérifiés en prod par le MCP.
