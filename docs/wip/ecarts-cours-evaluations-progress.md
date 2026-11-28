---
title: Écarts — lot cours-evaluations
date: 2026-11-28
status: en cours — PR 1 (#3291) et PR 2 (#3300) mergées, clôture à faire
---

# Écarts — lot `cours-evaluations`

## Reprendre ici

_Mis à jour le 2026-11-28, après #3300._

- **État** : les 7 écarts du lot sont corrigés. PR 1 #3291 (V72, L37, L38, L40, L112, L113) et PR 2 #3300 (L39) mergées ; migrations `20261128072151` et `20261128135334` en prod, vérifiées par le MCP en lecture (policy, trigger, fonction, clés en NO ACTION).
- **Prochaine action** : clôture du chantier (recompter le découpage, versement du durable dans `docs/systeme/`, archivage du journal, ligne de `ecarts-lots.md`), après la réponse de David ci-dessous.
- **En attente de David** : les liens des familles doivent-ils suivre les dates de l'école (aujourd'hui toujours le 31 août, `endOfSchoolYear`) ?
- **Pièges** : le cache des cases effacées de `skill_attempts` passe par `trg_skill_attempts_after_delete`, qui saute un élève supprimé (sinon la suppression d'un compte échoue). La saisie n'efface que les élèves de sa grille.
- **Worktree / branche** : aucun (retirés par `pr:merger`).

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
