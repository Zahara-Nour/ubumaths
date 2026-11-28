---
title: Écarts — lot cours-evaluations
date: 2026-11-28
status: en cours — PR 1 mergée (#3291), L39 à faire
---

# Écarts — lot `cours-evaluations`

## Reprendre ici

_Mis à jour le 2026-11-28, après #3291._

- **État** : PR 1 #3291 mergée (V72, L37, L38, L40, L112, L113). Migration `20261128072151` **pas encore en prod** : `db:migrate` suspendu, car une autre migration attend aussi (`20261128132651`, questions de 3e en algorithmique, autre session).
- **Prochaine action** : (1) `db:migrate` quand `migration list --linked` ne montre plus que la nôtre, ou sur l'accord de David pour pousser les deux ; (2) L39 en PR 2, nouveau worktree `ubumaths-wt-ecarts-cours-evaluations` depuis `origin/main`, branche `fix/ecarts-cours-evaluations-l39`.
- **L39, accord de David (2026-11-28, « oui »)** : policy DELETE pour prof/admin sur `skill_attempts` limitée à `source = 'teacher'`, `task_id` non nul, élève de ses classes ; fonction SQL `security invoker` qui supprime puis réécrit la grille d'une tâche en une transaction et lève si des lignes restent.
- **En attente de David** : rien, sauf le choix ci-dessus sur `db:migrate` ; et s'il veut que les liens des familles suivent les dates de l'école (aujourd'hui toujours le 31 août).
- **Pièges** : supprimer un point travaillé est refusé depuis L112, donc un test qui supprime ses points efface d'abord `journal_entry_points` et `student_point_state` (corrigé dans 4 tests). `createEvaluation` des tests d'intégration est sans mélange par défaut.
- **Worktree / branche** : retirés par `pr:merger`.

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
