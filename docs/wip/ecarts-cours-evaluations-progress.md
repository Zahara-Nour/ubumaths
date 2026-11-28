---
title: Écarts — lot cours-evaluations
date: 2026-11-28
status: en cours — PR 1 en revue, L39 en attente de David
---

# Écarts — lot `cours-evaluations`

## Reprendre ici

_Mis à jour le 2026-11-28, avant la première PR._

- **État** : PR 1 (V72, L37, L38, L40, L112, L113) codée, testée (unitaires et intégration ; L112/L113 vérifiés rouges sans la migration), revue faite (code-reviewer : rien ; security-auditor : RESTRICT → NO ACTION, appliqué). L39 n'est pas commencé.
- **Prochaine action** : ouvrir la PR 1, la merger au vert, puis `db:migrate` (migration additive `20261128072151`, 4 conditions). Ensuite L39 en PR 2.
- **En attente de David** : la question d'accès de L39 (aucune policy DELETE prof sur `skill_attempts`, donc chaque enregistrement de la saisie ajoute une grille).
- **Pièges en cours** : `createEvaluation` des tests d'intégration est maintenant SANS mélange par défaut (sinon l'ordre est tiré au hasard).
- **Worktree / branche** : `../ubumaths-wt-ecarts-cours-evaluations` · `fix/ecarts-cours-evaluations`.

## Décisions (2026-11-28)

David, « je te suis » sur les quatre propositions de la phase 0 :

- **V72** : case cochée → ordre tiré au hasard par tentative, gardé à la reprise ; décochée → ordre de la série.
- **L38** : une règle, les dates de l'école sinon 1er sept. → 31 août. Mise en œuvre : `src/lib/server/school-year.ts` réutilise la fonction SQL `current_school_year` (déjà celle des avertissements). Les liens envoyés aux familles gardent le 31 août (`endOfSchoolYear`), même module : choix de Claude, signalé à David (un lien ne meurt pas avant la date annoncée).
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
