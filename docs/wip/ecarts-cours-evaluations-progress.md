---
title: Écarts — lot cours-evaluations
date: 2026-11-28
status: en cours — PR 1 (#3291) et PR 2 (#3300) mergées, PR 3 (liens des familles) en cours
---

# Écarts — lot `cours-evaluations`

## Reprendre ici

_Mis à jour le 2026-11-28, PR 3 (liens des familles) en cours._

- **État** : les 7 écarts du lot sont corrigés (#3291, #3300), migrations en prod. David a répondu « oui » (2026-11-28) : les liens des familles (cahier, cours, carnet) expirent à la fin de l'année scolaire de l'école (31 août sans dates). PR 3 sur `fix/liens-familles-annee-ecole` : `schoolYearExpiry` / `classSchoolYearExpiry`, courriel du carnet qui annonce la date, page de confidentialité et registre des traitements reformulés.
- **Prochaine action** : merge de la PR 3, puis clôture du chantier (recompter le découpage, versement, archivage du journal, ligne de `ecarts-lots.md`).
- **En attente de David** : borner une fin d'année saisie par erreur (ex. 2099 → lien valable des années) ? Point mineur de la revue, non tranché.
- **Pièges** : les liens déjà émis gardent leur 31 août. Le carnet lit l'école par `profiles.school_id` (client service).
- **Worktree / branche** : `ubumaths-wt-ecarts-cours-evaluations` · `fix/liens-familles-annee-ecole`.

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
