---
couvre:
  - 'src/routes/(protected)/dashboard/teacher/{assessments,evaluation-tasks,presques-evaluations}/**'
  - 'src/routes/(protected)/dashboard/student/{assessments,competences,work,reports}/**'
  - 'src/routes/api/{evaluations,tests,test-mode,series}/**'
  - 'src/routes/api/student/reports/**'
  - 'src/routes/(public)/presques-evaluations/**'
  - 'src/lib/components/{test,assessments,series}/**'
  - src/lib/components/teacher/TestModeToggle.svelte
  - src/lib/stores/test-mode.svelte.ts
  - 'src/lib/server/{evaluations,evaluation-attempts,series,chapter-series,test-mode}.ts'
  - 'src/lib/server/validation/{evaluations,tests,parody-evaluations,grades,chapter-series}.ts'
  - 'src/lib/types/{evaluation,evaluation-attempt,test,grades,skills}.ts'
  - 'src/lib/utils/{test-launch,test-score,grades}.ts'
---

# Séries, évaluations, tâches d'évaluation

> Première doc de référence de cette zone. Le **pourquoi** est dans les journaux archivés :
> [series-formes-progress.md](../archive/wip/series-formes-progress.md) (décisions Q18-Q59, chantiers
> 4 et 5), [series-de-questions-dans-un-chapitre-spec.md](../archive/wip/series-de-questions-dans-un-chapitre-spec.md)
> (Q124-Q129), [skills-referentiel-design.md](../archive/wip/skills-referentiel-design.md) (tâches
> d'évaluation, observables), [progression-eleve-progress.md](../archive/wip/progression-eleve-progress.md).
> Ils décrivent l'histoire, pas le code actuel.

## À quoi ça sert

Le mot « évaluation » recouvre ici **quatre choses sans lien de code entre elles**, plus deux faux
amis. Vocabulaire : [CONTEXT.md](../../CONTEXT.md) (série, en classe, flash-cards, entraînement,
course aux nombres, évaluation, auto-évaluation, compétence mathématique, composante, indicateur).

| Chose                                | Ce que c'est                                                                                                    | Tables                                                                  |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Série** passée sous une **forme**  | Composition de questions lancée en classe, en flash-cards, en entraînement ou en course aux nombres. Non notée. | `series` (si enregistrée), `test_sessions`, `test_answers`              |
| **Évaluation** (notée)               | Une série + une forme (entraînement ou course) + réglages, assignée ; **corrigée et notée par le serveur**.     | `evaluations`, `evaluation_assignments`, `evaluation_attempt_questions` |
| **Tâche d'évaluation** (compétences) | Séance où le prof coche, élève par élève, les **observables** réussis d'une compétence mathématique.            | `evaluation_tasks`, `evaluation_task_perimeter`, `skill_attempts`       |
| **Presque-évaluation**               | PDF parodique déposé par le prof, lisible par tous, même sans compte.                                           | `parody_evaluations` + bucket Storage `parody-evaluations`              |
| _faux ami_ : **mode test** du prof   | Interrupteur « voir les élèves de test / les vrais ». Rien à voir avec `TestMode` (= forme de série).           | `user_preferences.test_mode_enabled`, `profiles.is_test`                |
| _faux ami_ : **reports** (élève)     | Signalements d'erreur sur un exercice de **fiche**, pas des bulletins.                                          | `worksheet_error_reports` → [fiches-et-pdf.md](fiches-et-pdf.md)        |

Dans le code et les URL, l'ancien nom subsiste : `assessments` = évaluations, `test` = séance de série.
Le moteur de questions (génération, validation, barème) est décrit dans [questions.md](questions.md) ;
les tables dans [base-de-donnees.md](base-de-donnees.md) (domaine « Évaluations ») ; le SRS nourri
par les séances dans [srs.md](srs.md).

## Carte du code

| Fichier                                                             | Rôle                                                                                                                                                              |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/types/test.ts`                                             | `TestMode` (`display` en classe, `flash`, `interactive` entraînement, `course`), `ClassroomItem`, `TestResult`.                                                   |
| `src/lib/utils/test-launch.ts`                                      | `resolveTestLaunch` : que faire d'une URL `/automaths/test?…` (assignation, panier, démarrage, erreur).                                                           |
| `src/lib/utils/test-score.ts`                                       | `computeTestScore` : score sur 10 d'une séance libre, cartes de cours hors score.                                                                                 |
| `src/lib/components/test/`                                          | Une forme = un composant : `ClassroomSeries`, `FlashSeries`, `TestInteractive`, `TestCourse` ; `TestResults`, `EvaluationResults`, `TestTimer`, `TestModeDialog`. |
| `src/lib/components/series/`                                        | `SaveSeriesDialog` (panier → série), `SeriesLinkShare` (lien de série, avec ou sans forme).                                                                       |
| `src/lib/types/evaluation.ts`                                       | `EvaluationForm`, bornes de la course (`COURSE_TIME_LIMIT_*`), statuts, `getStudentStatus`, `formatGrade`.                                                        |
| `src/lib/types/evaluation-attempt.ts`                               | Ce qu'échangent navigateur et serveur : `EvaluationStartResponse`, `EvaluationSubmitResponse`, `CorrectedQuestion`.                                               |
| `src/lib/server/series.ts`                                          | CRUD des séries ; traduit le verrou de la base (`SERIES_LOCKED_SQLSTATE` = `UBS01`).                                                                              |
| `src/lib/server/evaluations.ts`                                     | Évaluations : création, réglages, statut, assignation, destinataires, résultats, statistiques.                                                                    |
| `src/lib/server/evaluation-attempts.ts`                             | `startEvaluationAttempt`, `submitEvaluationAttempt`, `readSubmittedCopy` (ADR 0015).                                                                              |
| `src/lib/server/grading-budget.ts`                                  | Budget de temps de la correction d'un envoi → [questions.md](questions.md).                                                                                       |
| `src/lib/server/chapter-series.ts`                                  | Série rattachée à un chapitre de « Mon cours » (forme flash ou entraînement, sans note).                                                                          |
| `src/lib/server/validation/evaluations.ts`                          | Zod : `createSeriesSchema`, `evaluationSettingsSchema`, `submitAttemptSchema`, `classIdsFieldSchema`…                                                             |
| `src/lib/server/validation/tests.ts`                                | `validateSaveTest` : corps de `POST /api/tests/save`.                                                                                                             |
| `src/lib/types/skills.ts`                                           | Types famille B : `MathCompetenceCode`, `SubdimensionLetter`, `SkillAttemptCode` (`plus`/`minus`), `isCompetenceObserved`.                                        |
| `src/lib/server/test-mode.ts`, `src/lib/stores/test-mode.svelte.ts` | Mode test du prof : `getTeacherTestMode` / `setTeacherTestMode` (serveur), store `testMode` (navigateur).                                                         |
| `src/lib/server/validation/parody-evaluations.ts`                   | Zod du dépôt de presques-évaluations (PDF ≤ 10 Mo, `MAX_FILE_SIZE_BYTES`).                                                                                        |

Hors sujet mais rangés ici par la couverture : `src/lib/types/grades.ts`, `src/lib/utils/grades.ts` et
`src/lib/server/validation/grades.ts` décrivent les **niveaux scolaires** (`GradeCode` : `6`, `1_SPE`…),
pas des notes.

### Routes

| Route                                                                                  | Qui           | Quoi                                                                                   |
| -------------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------- |
| `/automaths/test` (couverte par [questions.md](questions.md))                          | tous          | Page unique qui joue toutes les formes, libres ou évaluation.                          |
| `POST /api/series`                                                                     | prof, admin   | Enregistrer le panier comme série. Liste et édition : `/dashboard/teacher/series`.     |
| `POST /api/tests/save`                                                                 | connecté      | Enregistrer une séance **libre** (entraînement, course, flash). Refuse une évaluation. |
| `/dashboard/teacher/assessments` (+ `new`, `[id]/edit`, `[id]/assign`, `[id]/results`) | prof, admin   | Créer depuis une série, régler (brouillon seulement), publier, assigner, résultats.    |
| `/dashboard/student/assessments` (+ `[id]/results`)                                    | élève         | Ses évaluations ; ses tentatives (`[id]` = identifiant de l'**assignation**).          |
| `POST /api/evaluations/assignments/[id]/start`                                         | élève, prof   | Démarrer / reprendre (élève) ou aperçu (propriétaire, admin). 20 appels/min.           |
| `POST /api/evaluations/attempts/[id]/submit`                                           | élève         | Envoyer la copie, recevoir la note et la correction. 10 appels/min.                    |
| `/dashboard/teacher/evaluation-tasks` (+ `new`, `[id]`, `[id]/saisie`)                 | prof          | Tâches d'évaluation famille B : périmètre, saisie en séance.                           |
| `/dashboard/student/competences/[code]`                                                | élève         | Détail d'une compétence mathématique (la liste redirige vers `progression`).           |
| `/presques-evaluations` · `/dashboard/teacher/presques-evaluations`                    | public · prof | Lecture publique · dépôt, édition, suppression.                                        |
| `POST /api/test-mode`                                                                  | prof          | Basculer le mode test.                                                                 |
| `/dashboard/student/work`                                                              | élève         | Boîte « travail à faire » (`getStudentWorkInbox`, quatre systèmes d'assignation).      |
| `/dashboard/student/reports`, `GET /api/student/reports`                               | élève         | Ses signalements d'erreur de fiche (RPC `get_my_error_reports`).                       |

## Les formes d'une série

Une série est tirée **à neuf à chaque usage** : `drawSeriesQuestions` (`src/lib/questions/series-items.ts`)
prend, pour chaque catégorie et chaque répétition, un modèle publié au hasard dans la catégorie et une
graine neuve. Une catégorie sans modèle est sautée ; chaque question porte la durée de **sa** catégorie
(`delay`, 20 s par défaut : `DEFAULT_QUESTION_DELAY_SECONDS`). Bornes de la composition : 1 à 50
catégories, 99 répétitions, 600 s (`src/lib/validation/series.ts`).

| Forme (`TestMode`)            | Composant         | Cartes de cours | Chrono                                                                              | Correction et score                                      | Enregistré                                        |
| ----------------------------- | ----------------- | --------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------- |
| En classe (`display`)         | `ClassroomSeries` | oui             | Par question ; ±5 s change toute la catégorie (min. 5 s) ; Espace = pause           | Aucune note ; grilles des questions puis des corrections | **Rien**                                          |
| Flash-cards (`flash`)         | `FlashSeries`     | oui             | Aucun                                                                               | L'élève dit s'il avait trouvé (auto-évaluation)          | `test_sessions` + traces `student_self`, pas d'XP |
| Entraînement (`interactive`)  | `TestInteractive` | oui, hors score | Par question ; à 0, ce qui est saisi est validé, rien = faux ; pas de chrono global | Navigateur (ADR 0001), score sur 10 (`computeTestScore`) | `test_sessions`, `test_answers`, SRS, XP          |
| Course aux nombres (`course`) | `TestCourse`      | **non**         | Global, toutes les questions à l'écran ; 1 à 60 min (5 min proposées)               | Navigateur, score sur 10                                 | Comme l'entraînement                              |

Lancement (`resolveTestLaunch`) : `?assignment=<id>` → évaluation (forme et temps viennent du serveur,
le `mode` de l'URL est ignoré) ; `?categories=…` sans `mode` → le panier ; `?categories=…&mode=…[&time=…]`
→ démarrage direct. `SeriesLinkShare` fabrique ces liens. Visiteur non connecté : la série se joue,
rien n'est enregistré.

Séance libre enregistrée : `POST /api/tests/save` écrit `test_sessions` puis `test_answers` et appelle
`recordSeriesReviews` (`src/lib/server/srs/record-series-reviews.ts`) avec le **verdict du navigateur**.
Le score envoyé par le client est gardé, sauf s'il y a des cartes de cours : il est alors recalculé
hors cartes.

**Série de chapitre** (`chapter_series`, `chapter-series.ts`) : un chapitre de « Mon cours » pointe une
série du prof sous la forme `flash` (défaut) ou `interactive` ; l'élève la lance comme une séance libre.
`findOngoingEvaluation` prévient le prof quand la même série sert une évaluation non terminée (Q129).

## L'évaluation notée

### Modèle

```
series (composition, du prof)
  └── evaluations         form 'interactive' | 'course', time_limit (s), max_attempts, deadline,
       │                  shuffle_questions, status 'draft' | 'published' | 'archived'
       ├── evaluation_assignments   une classe (class_id) OU un élève (student_id)
       └── test_sessions (evaluation_id)          = une TENTATIVE ; note sur 20, points
            ├── evaluation_attempt_questions      tirage figé : modèle, graine, instance — service_role seul
            └── test_answers                      réponses, statut, points (écrites à l'envoi)
```

Réglages (`evaluationSettingsSchema`) : course = temps limite obligatoire, 1 à 60 min, 7 par défaut
(`COURSE_TIME_LIMIT_DEFAULT_MINUTES`), saisi en minutes, stocké en secondes ; entraînement = pas de
temps limite global. `max_attempts` 1 à 10 ou illimité ; `deadline` facultative.

Cycle de vie (prof) : créer depuis une série (`/dashboard/teacher/assessments/new?series=<id>`) →
brouillon modifiable (`[id]/edit` refuse hors `draft`) → publier → assigner à des classes (`assignEvaluation`
refuse si non publiée). Le statut `archived` existe (lu par la liste et par
`isEvaluationUnfinished`) mais aucun écran ne le pose. Une **série** est verrouillée par la base dès qu'une séance est
rattachée à une évaluation qui l'utilise (trigger `series_lock_guard`, SQLSTATE `UBS01`) : il faut la
dupliquer (`duplicateSeries`). Même verrou sur le `series_id` d'une évaluation commencée
(`evaluation_series_lock_guard`).

### Démarrer (`startEvaluationAttempt`)

1. L'assignation est lue **sous RLS** avec le client de l'élève. Destinataire = élève nommé ou membre
   **actif** de la classe (`isAssignmentRecipient`). Sinon : propriétaire ou admin → **aperçu**
   (catégories renvoyées, le navigateur génère comme une séance libre, rien n'est rattaché) ; autre → 404.
2. Évaluation non publiée → 404.
3. **Tentative ouverte** (commencée, non envoyée) → reprise telle quelle, mêmes questions, même ordre,
   sans compter de tentative, **même après la date limite** ; les réponses tapées sont perdues (Q34).
4. Date limite passée → 403 ; tentatives épuisées → 403. Toute séance compte dès sa création,
   abandonnée comprise (Q33).
5. Tirage par `drawSeriesQuestions` avec `excludeCourseCards`, hasard `crypto`. Chaque instance
   **complète** est figée dans `evaluation_attempt_questions` (Q42) : un modèle modifié ensuite ne
   change ni la reprise ni la correction.
6. Le navigateur ne reçoit que `toPublicQuestion` : ni attendu, ni correction, ni graine
   ([questions.md](questions.md), invariant 8). Course : `remainingSeconds` calculé par le serveur.
7. Double démarrage (deux onglets) : la tentative la plus ancienne gagne, la nouvelle est supprimée.

### Envoyer (`submitEvaluationAttempt`)

1. Séance relue sous RLS ; déjà close → 409 `AttemptAlreadySubmittedError` qui **porte la copie déjà
   notée** (`readSubmittedCopy`), pour l'élève dont la réponse s'est perdue.
2. Course reçue après temps limite + 30 s (`COURSE_GRACE_SECONDS`) → `late` : note 0, aucune réponse
   enregistrée.
3. Correction par le serveur (`gradeWithinBudget` → `gradeQuestion`) : 1, ½ ou 0 par question, note
   sur 20 au demi-point (`gradeOutOf20`). Budget total 5 s ; au-delà, les questions restantes valent 0.
   Tout verdict envoyé par le navigateur est ignoré (le schéma Zod le retire).
4. Écritures par le client **service_role** (la base refuse à un compte connecté d'écrire une séance
   d'évaluation, policies restrictives `test_sessions_insert_not_evaluation` et
   `test_answers_insert_not_evaluation`) : réponses d'abord, puis clôture `completed_at` conditionnelle
   (`is('completed_at', null)`) — un envoi concurrent retire ses réponses et rend la copie existante.
5. Durée mesurée par le serveur (démarrage → envoi). `score` = note / 2 pour les anciens écrans.
6. Si pas en retard : SRS nourri par le **verdict serveur** (`srsReviewsOf`, « su » = juste ou forme
   non optimale non partielle, Q40), puis XP du compagnon (non bloquant).

`EvaluationResults` affiche la réponse telle quelle : rien n'est recalculé dans le navigateur.

### Résultats

Élève : `getStudentAssignments` (statut calculé par `getStudentStatus` : non commencé, en cours,
terminé, expiré ; meilleure note `bestGrade`, Q36). Prof : `getEvaluationResults` (un élève par ligne
même s'il est assigné deux fois, toutes ses tentatives) et `computeEvaluationStatistics` (moyenne,
min, max sur la meilleure note de chaque élève). Les résultats suivent le **mode test** : vrais
élèves ou élèves de test, jamais les deux.

## Les tâches d'évaluation (compétences, famille B)

Le prof évalue les six **compétences mathématiques** par leurs **observables** (table `observables`,
rattachés à une composante `math_competence_subdimensions`, lettres A à D). La famille A (capacités)
est abandonnée : [ADR 0008](../adr/0008-referentiel-famille-a-abandonne.md).

1. **Créer** une tâche (`evaluation-tasks/new`) : nom, niveau, classe, date.
2. **Périmètre** (`evaluation-tasks/[id]`) : cocher les observables à observer →
   `evaluation_task_perimeter`.
3. **Saisie en séance** (`evaluation-tasks/[id]/saisie`, action `save`) : grille élèves × observables
   du périmètre. Coché → `plus`, non coché → `minus`, hors périmètre → rien. L'enregistrement
   **efface** les `skill_attempts` de la tâche puis réinsère toute la grille (`source: 'teacher'`).
4. Le trigger `trg_skill_attempts_after_insert` recalcule les caches : `student_observable_state`
   (acquis ssi au moins 2 `plus` et plus de `plus` que de `minus`), puis `student_competence_level`
   via `compute_competence_level` — niveau `insuffisante` sous 2 tâches
   (`MIN_TASKS_FOR_COMPETENCE_LEVEL`), « très bonne » plafonnée à « satisfaisante » sous 3.
5. L'élève lit son niveau, les observables validés et ce qui manque pour le niveau suivant sur
   `/dashboard/student/competences/[code]`. Le prof : [analytique-prof.md](analytique-prof.md) ;
   l'export vers l'ENT : [export-competences.md](export-competences.md).

## Les presques-évaluations

PDF parodiques : le prof dépose (PDF seul, 10 Mo, titre, niveaux, thèmes via `resource_tags`) dans le
bucket public `parody-evaluations` et la table `parody_evaluations`. La page publique
`/presques-evaluations` est lisible **sans compte** ; elle ne joint pas `profiles` (fermée à `anon` :
la jointure faisait échouer toute la requête, page vide du 2026-09-05 au 2026-09-15) et **échoue en
500** plutôt que d'afficher une liste vide. Édition et suppression : propriétaire seulement (RLS +
vérification explicite).

## Le mode test du prof

Un prof `is_test` est toujours en mode test ; un autre bascule `user_preferences.test_mode_enabled`
par `TestModeToggle` (tableau de bord) → `POST /api/test-mode` → rechargement complet de la page.
`getTeacherTestMode` filtre ensuite élèves de classe, résultats d'évaluation, énigmes, paquets SRS
assignés (`src/lib/server/students.ts` et cinq pages prof).

## Invariants

1. **Une évaluation n'est corrigée que par le serveur** ; `/api/tests/save` refuse un
   `assignmentId` (400). Les séances libres restent corrigées par le navigateur (ADR 0001).
2. **La graine et l'attendu ne quittent jamais le serveur** pendant une tentative : seules les
   questions publiques partent ; la correction arrive avec la note.
3. **Une tentative compte dès son démarrage** ; une tentative ouverte se reprend sans en coûter une.
4. **Le verrou de série est tenu par la base**, pas par l'application : le drapeau `locked` de
   `getTeacherSeries` sert à l'affichage seulement.
5. **Pas de carte de cours** dans une évaluation ni dans une course aux nombres.
6. **Lire avec le client de l'utilisateur, écrire avec service_role** dans `evaluation-attempts.ts`,
   après vérification explicite de l'identité et des droits.
7. **Le mode test sépare** : un prof ne voit jamais vrais élèves et élèves de test ensemble.

## Comment étendre

- **Nouvelle forme de série** : ajouter la valeur à `TestMode` et à `TEST_MODES` (`test-launch.ts`),
  un composant dans `src/lib/components/test/`, le choix dans `TestModeDialog` et `SeriesLinkShare`,
  la contrainte `mode` de `test_sessions`. Pour qu'elle soit **notée**, il faut aussi
  `EvaluationForm`, `evaluationFormSchema` et la contrainte de `evaluations.form`.
- **Nouveau réglage d'évaluation** : colonne (migration additive), `evaluationSettingsSchema`,
  `EvaluationConfigForm`, `createEvaluation`/`updateEvaluation`, et **le lire** dans
  `startEvaluationAttempt` (voir l'écart `shuffle_questions`).
- **Toucher à la correction** : c'est [questions.md](questions.md) (`grading.ts`). La note d'une copie
  est stockée, mais le statut **par case** d'une copie relue est recalculé (`readSubmittedCopy`) : un
  validateur modifié change ce détail, pas la note.

## Tests

- Unitaires serveur : `src/lib/server/__tests__/` (`evaluations`, `series`, `chapter-series`,
  `grading-budget`, `evaluation-attempts-srs`, `evaluation-curriculum-points`) ;
  `src/lib/server/validation/__tests__/evaluations.test.ts`.
- Routes : `src/routes/api/evaluations/assignments/[id]/start/__tests__/start.test.ts`,
  `src/routes/api/evaluations/attempts/[id]/submit/__tests__/submit.test.ts`,
  `src/routes/api/tests/save/__tests__/`, `src/routes/api/series/__tests__/series-route.test.ts`,
  `src/routes/(public)/automaths/test/__tests__/evaluation-notee.svelte.test.ts`.
- Composants : `src/lib/components/test/__tests__/`, `src/lib/components/assessments/__tests__/` ;
  utilitaires : `src/lib/utils/__tests__/test-launch.test.ts`, `test-score.test.ts`.
- Intégration (Supabase local) : `tests/integration/evaluation-notee-serveur.test.ts`,
  `evaluation-tentatives.test.ts`, `series-evaluations.test.ts`, `series-evaluations-code.test.ts`,
  `acces-evaluation-eleve-archive.test.ts`, `series-de-chapitre.test.ts`,
  `presques-evaluations-visiteur.test.ts`, `test-sessions-mode-flash.test.ts`,
  `competence-referentiel.test.ts`.
- **Sans test** : la saisie des tâches d'évaluation, le dépôt de presques-évaluations, le mode test.

## Décisions (ADR)

[0001](../adr/0001-correction-cote-client.md) correction dans le navigateur (séances libres) ·
[0008](../adr/0008-referentiel-famille-a-abandonne.md) famille A abandonnée ·
[0009](../adr/0009-carte-de-cours-type-explicite.md) carte de cours ·
[0011](../adr/0011-fiche-d-automatismes-figee-par-graine.md) série figée par graine (fiches) ·
[0015](../adr/0015-evaluation-notee-correction-serveur.md) évaluation notée corrigée par le serveur ·
[0016](../adr/0016-auto-evaluation-meilleur-resultat-du-jour.md) auto-évaluation, meilleur du jour.

## Écarts connus

- **`shuffle_questions` sans effet** : réglé dans `EvaluationConfigForm` (« Mélanger l'ordre des
  questions », coché par défaut), stocké, mais jamais lu au tirage : l'ordre suit toujours la
  composition.
- **`validateAttempt` (`evaluations.ts`) n'est appelé que par les tests** : `startEvaluationAttempt`
  refait les mêmes contrôles à sa façon. Deux règles à tenir d'accord.
- **Archivage sans écran** : seule l'action `publish` existe sur `/dashboard/teacher/assessments` ;
  aucune route ne passe une évaluation en `archived`.
- **Assignation à un élève sans écran** : `assignEvaluation` accepte `student_ids`, la page
  `[id]/assign` n'envoie que des classes.
- **Saisie des tâches d'évaluation** : `DELETE` puis `INSERT` sans `.select()` ni transaction ; un
  refus RLS du `DELETE` rend 0 ligne sans erreur et la grille est **doublée**
  ([rls-echecs-silencieux.md](../pratiques/rls-echecs-silencieux.md)). Les caches ne se recalculent
  qu'à l'`INSERT` : un observable retiré du périmètre garde ses anciennes observations dans le cache.
- **Mode test, deux sources** : le store `testMode` part de `localStorage`, la vérité est
  `user_preferences`. Sur un nouvel appareil, l'interrupteur peut afficher l'inverse de l'état serveur
  et le premier clic renvoyer la valeur déjà enregistrée. Le store utilise `writable`, pas les runes.
- **Temps de course par défaut** : 5 min dans `TestModeDialog` (séance libre), 7 min pour une
  évaluation.
- **En-têtes de code anglais et anciens** : `test.ts`, `TestCourse`, `TestResults`, `test-mode.ts`
  parlent encore de « quiz », « Revision », « assessment ».
- **Vocabulaire absent de CONTEXT.md** : « presque-évaluation », « tâche d'évaluation »,
  « observable », « mode test » n'y ont pas d'entrée.
- **Couverture mal rangée** : `grades.ts` (niveaux scolaires) et les signalements de fiches
  (`student/reports`) relèveraient d'autres docs.

---

Vérifié contre le code le 2026-10-10.
