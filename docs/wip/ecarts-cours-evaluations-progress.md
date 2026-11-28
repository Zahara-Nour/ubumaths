---
title: Écarts — lot cours-evaluations
date: 2026-11-28
status: en cours — PR 1 mergée (#3291), PR 2 (L39) en cours
---

# Écarts — lot `cours-evaluations`

## Reprendre ici

_Mis à jour le 2026-11-28, PR 2 (L39) #3300 ouverte._

- **État** : PR 1 #3291 mergée ; sa migration `20261128072151` **en prod** (2026-11-28, `supabase db push --include-all` par David, avec `20261128132651` d'`idees-3e-algorithmique`). PR 2 (L39) #3300 : policy `skill_attempts_delete_teacher_task`, trigger `trg_skill_attempts_after_delete`, fonction `save_evaluation_task_grid` ; 9 tests d'intégration (5 rouges sans la migration).
- **Prochaine action** : merge de #3300, puis `db:migrate` de `20261128135334` (vérifier `migration list --linked` : elle seule en attente) ; vérifier les contraintes de PR 1 en prod (MCP en lecture).
- **En attente de David** : les liens des familles doivent-ils suivre les dates de l'école (aujourd'hui toujours le 31 août) ?
- **Pièges** : `update_student_observable_state` est fermée à `authenticated` : le cache des cases effacées passe par un trigger, qui saute un élève supprimé (sinon la suppression d'un compte échoue, FK du cache). La saisie n'efface que les élèves de la grille (archivés préservés). Supprimer un point travaillé est refusé depuis L112.
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
