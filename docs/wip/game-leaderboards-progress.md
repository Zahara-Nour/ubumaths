# Game leaderboards — progress (crash-recovery)

> Branche : **`refactor/single-teacher`** (même branche, cf. décision David 2026-06-16).
> Spec + plan : `docs/wip/game-leaderboards.md` (§4 modèle, §6 décisions, §7 plan 5 phases).

## État global

| Phase                                     | Statut                | Notes                                                           |
| ----------------------------------------- | --------------------- | --------------------------------------------------------------- |
| 1. Couche DB (Migration A)                | ✅ poussée EU + typée | `game_scores_unified` + `game_leaderboard` live sur EU          |
| 1b. Couche DB (Migration A2 démineur)     | ✅ écrite             | **En attente de push David** (`db:migrate` + `db:types`)        |
| 2. Serveur / chargement                   | ✅ fait (game)        | schema Zod + type + load + 7 tests ; reste à câbler A2 démineur |
| 3. UI (3 onglets, retrait public)         | ⏳ à faire            | Démarre après push A2 (frontend-developer)                      |
| 4. Tests d'intégration                    | ⏳ à faire            | Respecter verrou mono-prof (`global-setup.ts`)                  |
| 5. Doc/AIPD + Migration B + checks finaux | ⏳ à faire            |                                                                 |

### Décision PO (David, 2026-06-16) — vue détaillée démineur

La vue détaillée démineur (`avg_top_10`) était **globale + nom complet** (faille mineurs). Retenu :
**école + prénom seul** → portée dans l'espace protégé, scopée comme l'unifié (classe/niveau/école),
prénom + avatar uniquement. D'où la **Migration A2** (`minesweeper_scoped_leaderboard`).

## Phase 1 — fait (2026-06-16)

**Fichier** : `supabase/migrations/20260616190000_game_leaderboards.sql` (additif, safe-to-push).

- Vue `game_scores_unified(game, user_id, score, updated_at)` — UNION ALL 2048/mathemo/minesweeper.
  `security_invoker=true`, **non grantée** aux clients (lue seulement par la fonction DEFINER).
  Source minesweeper `updated_at` = `max(completed_at)` des parties `won` (la vue n'a pas d'`updated_at`).
- Fonction `game_leaderboard(p_game, p_scope, p_limit)` `SECURITY DEFINER`, `search_path` pinné, grantée
  `authenticated`. Range par `auth.uid()`. `dense_rank` entre élèves ; prof = ligne `rank=NULL` (hors-classement,
  non bornée par limit) ; admin exclu ; `is_test` exclu (élèves **et** prof).
- Index `idx_profiles_school_grade` créé ; `idx_class_members_student_status` existait déjà (skip).

**Audit sécurité (security-auditor Opus)** — verdict net après vérif EU :

- Le BLOCKER « H1 : `my_school()` absent » était un **faux positif** : l'agent interrogeait le projet **US mort**
  (MCP claude.ai). Vérifié sur EU `cnevnzsvixxpnurautls` : `my_school()` + `same_school()` existent, historique
  contient 160000 + 180000 (dernier), `teacher_count=1`, **`teacher_null_school=0`** (le prof a bien un `school_id`).
- Hardenings appliqués : **F1** (scope `class` borné école par construction — 0 élève NULL-school en classe, donc
  aucune régression), **F9b** (`is_test` filtré sur la ligne prof), **F14** (tri déterministe `…, firstname`).
- `grade`/`school`/inputs/SECURITY DEFINER/`security_invoker`/identité-minimale : tous PASS.

> Note : la **code-review** générique a été fusionnée dans l'audit sécu (fichier SQL unique, RLS = la review).

## Phase 1b — Migration A2 démineur (2026-06-16)

**Fichier** : `supabase/migrations/20260616200000_minesweeper_scoped_leaderboard.sql` (additif, safe-to-push).

- Fonction `minesweeper_scoped_leaderboard(p_scope, p_limit)` `SECURITY DEFINER` — **réutilise le pattern de
  scoping de `game_leaderboard` déjà audité** (3 portées bornées école, `is_test` exclu, prof `rank=NULL`, admin
  exclu). Source = vue `minesweeper_leaderboard`. Renvoie `avg_top_10` / `top_games_count` / `total_points`.
- Classés = élèves ≥ 10 parties (`dense_rank` sur `avg_top_10`) ; provisoires = < 10 parties (`rank NULL`).
- Audit : pas de nouvel audit Opus — partie sécurité (le scoping) **identique** à A2 déjà auditée ; auto-revue OK.

## Phase 2 — fait (2026-06-16)

- `gameLeaderboardQuerySchema` (`$lib/server/validation/games.ts`) : `.catch()`/clamp, ne throw jamais ;
  consts `GAME_LEADERBOARD_GAMES`/`SCOPES`. **7 tests** (`games.test.ts`, 45 passent).
- Type `GameLeaderboardRow` (`database-helpers.ts`) — override `rank: number | null` (le gen dit `number`).
- Load `(protected)/games/leaderboards/+page.server.ts` : URL-driven, appelle `game_leaderboard`.
  **Reste à câbler** : 2ᵉ appel `minesweeper_scoped_leaderboard` quand `game='minesweeper'` (après push A2).
- Code-review Phase 2 fusionnée avec la revue Phase 3 (route incomplète sans `+page.svelte`).

## ⚠️ Action requise — David (avant Phase 3)

1. `pnpm db:migrate` (pousse **Migration A2** sur EU — additive, ne casse rien).
2. `pnpm db:types` (régénère `database.ts` : ajoute `minesweeper_scoped_leaderboard`), commit.

Sans ces types, le 2ᵉ appel RPC démineur n'est pas typé → câblage load + UI démineur bloqués.

## Contrainte de déploiement (rappel)

- **Migration A** (cette phase) : additive → poussable maintenant.
- **Migration B** (Phase 5, destructive : `DROP minesweeper_leaderboard_public`) : **à pousser au release
  uniquement**, en lockstep avec le retrait des routes `(public)/leaderboards/` (sinon la prod actuelle casse).

## Fichiers produits/modifiés

- `supabase/migrations/20260616190000_game_leaderboards.sql` (nouveau, **poussé EU**)
- `supabase/migrations/20260616200000_minesweeper_scoped_leaderboard.sql` (nouveau, à pousser)
- `src/lib/types/database.ts` (régénéré après A) + `database-helpers.ts` (`GameLeaderboardRow`)
- `src/lib/server/validation/games.ts` (schema + consts) + `__tests__/games.test.ts` (+7 tests)
- `src/routes/(protected)/games/leaderboards/+page.server.ts` (nouveau, load)
- `docs/wip/game-leaderboards.md` (§7 plan détaillé + ligne branche corrigée)
- `docs/wip/game-leaderboards-progress.md` (ce fichier)
