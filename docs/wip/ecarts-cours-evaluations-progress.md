---
title: Écarts — lot cours-evaluations
date: 2026-11-28
status: en cours — écarts vérifiés, phase 0 posée à David
---

# Écarts — lot `cours-evaluations`

## Reprendre ici

_Mis à jour le 2026-11-28, avant la première PR._

- **État** : les 7 écarts (V72, L37, L38, L39, L40, L112, L113) sont vérifiés et toujours vrais. Aucun code.
- **Prochaine action** : coder ce qui ne demande pas de choix (L37, L39, L40) ; V72, L38, L112, L113 attendent la phase 0.
- **En attente de David** : les réponses de la phase 0 (ci-dessous).
- **Pièges en cours** : L112 et L113 sont des migrations : la question d'accès d'abord, puis les tests d'intégration (`.fails` à retirer) et `security-auditor`.
- **Worktree / branche** : `../ubumaths-wt-ecarts-cours-evaluations` · `fix/ecarts-cours-evaluations`.

## Vérification des écarts (2026-11-28)

- **V72** : vrai. `startEvaluationAttempt` (`src/lib/server/evaluation-attempts.ts`) range les questions dans l'ordre de la série, sans lire `shuffle_questions`. La preuve vise la route : à réécrire vers `evaluation-attempts.ts`.
- **L37** : vrai. La route `api/classes/[classId]/students` valide son paramètre avec `getClassGidouillesSchema`. Même forme (`classId` uuid), mauvais nom.
- **L38** : vrai. Il y a trois calculs : Avancement (`getMonth() >= 8`, du 1er sept. au 1er sept.), `endOfSchoolYear` des liens (31 août), et `school_years` (dates saisies par école, lues par le calendrier des séances).
- **L39** : vrai. La saisie fait `delete` sans `.select()`, puis `insert`, et rien ne garantit l'atomicité.
- **L40** : vrai. `TestModeToggle` lit `localStorage` et jamais `user_preferences.test_mode_enabled`.
- **L112** : vrai. `student_point_state.point_id` est `on delete cascade` (preuve `it.fails`).
- **L113** : vrai. `journal_entry_activities.exercise_id` est `on delete set null`, et le CHECK `kind = 'exercise' → exercise_id not null` refuse la mise à NULL (preuve `it.fails`).
