---
title: Écarts — lot cours-evaluations
date: 2026-11-28
status: en cours — PR 1 mergée (#3291), PR 2 (L39) en cours
---

# Écarts — lot `cours-evaluations`

## Reprendre ici

_Mis à jour le 2026-11-28, PR 2 (L39) en cours._

- **État** : PR 1 #3291 mergée. PR 2 (L39) codée sur `fix/ecarts-cours-evaluations-l39` : policy `skill_attempts_delete_teacher_task`, trigger `trg_skill_attempts_after_delete` (cache des cases effacées), fonction `save_evaluation_task_grid` ; 6 tests d'intégration, rouges sans la migration (5 ; le 6e est une garde).
- **Prochaine action** : revue (`code-reviewer` + `security-auditor`), PR, merge ; puis `db:migrate` des DEUX migrations du chantier (`20261128072151`, `20261128135334`) quand `migration list --linked` ne montre plus que les nôtres, ou sur l'accord de David (l'autre en attente : `20261128132651`, algorithmique 3e).
- **En attente de David** : pousser ou non avec la migration de l'autre session ; liens des familles sur les dates de l'école (aujourd'hui toujours le 31 août).
- **Pièges** : `update_student_observable_state` est fermée à `authenticated` (passe SECURITY DEFINER) : le cache des cases effacées passe par un trigger. `chk_attempt_regime` exclut déjà une observation sans tâche. Supprimer un point travaillé est refusé depuis L112.
- **Worktree / branche** : `ubumaths-wt-ecarts-cours-evaluations` · `fix/ecarts-cours-evaluations-l39`.

## Décisions (2026-11-28)

David, « je te suis » sur les quatre propositions de la phase 0 :

- **V72** : case cochée → ordre tiré au hasard par tentative, gardé à la reprise ; décochée → ordre de la série.
- **L38** : une règle, les dates de l'école sinon 1er sept. → 31 août. Mise en œuvre : `src/lib/server/school-year.ts` lit la fonction SQL `current_school_year` (celle des avertissements), mais écarte une année FINIE (la fonction rend « la plus récente déjà commencée » : une école sans année 2026-2027 saisie voyait 2025-2026, vu à l'écran le 2026-11-28). Les liens envoyés aux familles gardent le 31 août (`endOfSchoolYear`), même module : choix de Claude, signalé à David (un lien ne meurt pas avant la date annoncée).
- **L112** : supprimer un point travaillé par un élève est refusé. Étendu à la couverture du cahier de texte (`journal_entry_points`), que la ligne du registre cite aussi.
- **L113** : choix (b), refus avec un message qui compte les séances.

## Vérification des écarts (2026-11-28)

- **V72** : vrai. `startEvaluationAttempt` (`src/lib/server/evaluation-attempts.ts`) range les questions dans l'ordre de la série, sans lire `shuffle_questions`. La preuve vise la route : à réécrire vers `evaluation-attempts.ts`.
- **L37** : vrai. La route `api/classes/[classId]/students` valide son paramètre avec `getClassGidouillesSchema`. Même forme (`classId` uuid), mauvais nom.
- **L38** : vrai. Il y a trois calculs : Avancement (`getMonth() >= 8`, du 1er sept. au 1er sept.), `endOfSchoolYear` des liens (31 août), et `school_years` (dates saisies par école, lues par le calendrier des séances).
- **L39** : vrai. La saisie fait `delete` sans `.select()`, puis `insert`, et rien ne garantit l'atomicité.
- **L40** : vrai. `TestModeToggle` lit `localStorage` et jamais `user_preferences.test_mode_enabled`.
- **L112** : vrai. `student_point_state.point_id` est `on delete cascade` (preuve `it.fails`).
- **L113** : vrai. `journal_entry_activities.exercise_id` est `on delete set null`, et le CHECK `kind = 'exercise' → exercise_id not null` refuse la mise à NULL (preuve `it.fails`).
