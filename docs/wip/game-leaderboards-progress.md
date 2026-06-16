# Game leaderboards — progress (crash-recovery)

> Branche : **`refactor/single-teacher`** (même branche, cf. décision David 2026-06-16).
> Spec + plan : `docs/wip/game-leaderboards.md` (§4 modèle, §6 décisions, §7 plan 5 phases).

## État global

| Phase                                     | Statut              | Notes                                                    |
| ----------------------------------------- | ------------------- | -------------------------------------------------------- |
| 1. Couche DB (Migration A)                | ✅ écrite + auditée | **En attente de push David** (`db:migrate` + `db:types`) |
| 2. Serveur / chargement                   | ⏳ à faire          | Dépend des types régénérés (RPC `game_leaderboard`)      |
| 3. UI (3 onglets, retrait public)         | ⏳ à faire          |                                                          |
| 4. Tests d'intégration                    | ⏳ à faire          | Respecter verrou mono-prof (`global-setup.ts`)           |
| 5. Doc/AIPD + Migration B + checks finaux | ⏳ à faire          |                                                          |

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

## ⚠️ Action requise — David (avant Phase 2)

1. `pnpm db:migrate` (pousse Migration A sur EU — additive, ne casse rien).
2. `pnpm db:types` (régénère `src/lib/types/database.ts` : ajoute la signature RPC `game_leaderboard`), commit.

Sans ces types, `supabase.rpc('game_leaderboard', …)` n'est pas typé → Phase 2 bloquée.

## Contrainte de déploiement (rappel)

- **Migration A** (cette phase) : additive → poussable maintenant.
- **Migration B** (Phase 5, destructive : `DROP minesweeper_leaderboard_public`) : **à pousser au release
  uniquement**, en lockstep avec le retrait des routes `(public)/leaderboards/` (sinon la prod actuelle casse).

## Fichiers produits/modifiés

- `supabase/migrations/20260616190000_game_leaderboards.sql` (nouveau)
- `docs/wip/game-leaderboards.md` (§7 plan détaillé + ligne branche corrigée)
- `docs/wip/game-leaderboards-progress.md` (ce fichier)
