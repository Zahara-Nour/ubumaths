---
couvre:
  - 'src/routes/(protected)/dashboard/teacher/{assessments,evaluation-tasks,presques-evaluations}/**'
  - 'src/routes/(protected)/dashboard/student/{assessments,competences,work}/**'
  - 'src/routes/api/{evaluations,tests,test-mode,series}/**'
  - 'src/routes/(public)/presques-evaluations/**'
  - 'src/lib/components/{test,assessments,series}/**'
  - src/lib/components/teacher/TestModeToggle.svelte
  - src/lib/stores/test-mode.svelte.ts
  - src/lib/stores/classroomSettings.svelte.ts
  - src/lib/utils/chime.ts
  - 'src/lib/server/{evaluations,evaluation-attempts,evaluation-breakdown,evaluation-question-errors,evaluation-trace,series,series-lines,chapter-series,test-mode}.ts'
  - 'src/lib/server/validation/{evaluations,tests,parody-evaluations,chapter-series}.ts'
  - 'src/lib/types/{evaluation,evaluation-attempt,evaluation-breakdown,duration-signals,test,skills}.ts'
  - 'src/lib/utils/{test-launch,test-score,duration-signals}.ts'
---

# Séries, contrôles, observations

> Première doc de référence de cette zone. Le **pourquoi** est dans les journaux archivés :
> [series-formes-progress.md](../archive/wip/series-formes-progress.md) (décisions Q18-Q59, chantiers
> 4 et 5), [series-de-questions-dans-un-chapitre-spec.md](../archive/wip/series-de-questions-dans-un-chapitre-spec.md)
> (Q124-Q129), [skills-referentiel-design.md](../archive/wip/skills-referentiel-design.md) (observations,
> alors « tâches d'évaluation », observables), [progression-eleve-progress.md](../archive/wip/progression-eleve-progress.md).
> Ils décrivent l'histoire, pas le code actuel.

## À quoi ça sert

Le code nomme `evaluation*` **quatre choses sans lien de code entre elles**, plus deux faux amis ;
le glossaire leur donne des noms distincts (« évaluation » seule est bannie). Vocabulaire :
[CONTEXT.md](../../CONTEXT.md) (série, en classe, flash-cards, contrôle blanc, course aux nombres,
contrôle, observation, presque évaluation, auto-évaluation, compétence mathématique, composante,
observable, mode test).

| Chose                               | Ce que c'est                                                                                                      | Tables                                                                  |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Série** passée sous une **forme** | Composition de questions lancée en classe, en flash-cards, en contrôle blanc ou en course aux nombres. Non notée. | `series` (si enregistrée), traces `skill_attempts` (ADR 0038)           |
| **Contrôle** (noté)                 | Une série + une forme (contrôle blanc ou course) + réglages, assignée ; **corrigée et notée par le serveur**.     | `evaluations`, `evaluation_assignments`, `evaluation_attempt_questions` |
| **Observation** (compétences)       | Séance où le prof coche, élève par élève, les **observables** réussis d'une compétence mathématique.              | `evaluation_tasks`, `evaluation_task_perimeter`, `skill_attempts`       |
| **Presque évaluation**              | PDF parodique déposé par le prof, lisible par tous, même sans compte.                                             | `parody_evaluations` + bucket Storage `parody-evaluations`              |
| _faux ami_ : **mode test** du prof  | Interrupteur « voir les élèves de test / les vrais ». Rien à voir avec `TestMode` (= forme de série).             | `user_preferences.test_mode_enabled`, `profiles.is_test`                |
| _faux ami_ : **reports** (élève)    | Signalements d'erreur sur un exercice de **fiche**, pas des bulletins.                                            | `worksheet_error_reports` → [fiches-et-pdf.md](fiches-et-pdf.md)        |

Dans le code et les URL, l'ancien nom subsiste : `assessments` et `evaluations` = contrôles, `evaluation_tasks` = observations, `test` = séance de série.
Le moteur de questions (génération, validation, barème) est décrit dans [questions.md](questions.md) ;
les tables dans [base-de-donnees.md](base-de-donnees.md) (domaine « Évaluations » du schéma) ; le SRS nourri
par les séances dans [srs.md](srs.md).

## Carte du code

| Fichier                                                             | Rôle                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/types/test.ts`                                             | `TestMode` (`display` en classe, `flash`, `typing` saisie, `interactive` contrôle blanc, `course`), `ClassroomItem`, `TestResult`.                                                                                                                                                                                          |
| `src/lib/utils/test-launch.ts`                                      | `resolveTestLaunch` : que faire d'une URL `/automaths/test?…` (assignation, panier, démarrage, erreur).                                                                                                                                                                                                                     |
| `src/lib/utils/test-score.ts`                                       | `computeTestScore` : score sur 10 d'une séance libre, cartes de cours hors score.                                                                                                                                                                                                                                           |
| `src/lib/components/test/`                                          | Une forme = un composant : `ClassroomSeries`, `FlashSeries`, `TypingSeries`, `TestInteractive`, `TestCourse` ; `TestResults`, `EvaluationResults`, `TestTimer`, `TestModeDialog`.                                                                                                                                           |
| `src/lib/components/series/`                                        | `SaveSeriesDialog` (panier → série), `SeriesLinkShare` (lien de série, avec ou sans forme ; son QR par lien court, [qr-codes.md](qr-codes.md)), `MySeriesPreview` / `MySeriesDock` (aperçu du panier dans le catalogue, [questions.md](questions.md)). À l'écran, le panier s'appelle « Ma série » (« Retour à ma série »). |
| `src/lib/types/evaluation.ts`                                       | `EvaluationForm`, bornes de la course (`COURSE_TIME_LIMIT_*`), statuts, `getStudentStatus`, `formatGrade`.                                                                                                                                                                                                                  |
| `src/lib/types/evaluation-attempt.ts`                               | Ce qu'échangent navigateur et serveur : `EvaluationStartResponse`, `EvaluationSubmitResponse`, `CorrectedQuestion`.                                                                                                                                                                                                         |
| `src/lib/server/series.ts`                                          | CRUD des séries ; traduit le verrou de la base (`SERIES_LOCKED_SQLSTATE` = `UBS01`).                                                                                                                                                                                                                                        |
| `src/lib/server/evaluations.ts`                                     | Contrôles : création, réglages, statut, assignation, destinataires, résultats, statistiques.                                                                                                                                                                                                                                |
| `src/lib/server/evaluation-breakdown.ts`                            | Bilan d'un contrôle par question et par notion (`getEvaluationBreakdown`, calcul pur `computeEvaluationBreakdown`) ; types dans `src/lib/types/evaluation-breakdown.ts`.                                                                                                                                                    |
| `src/lib/server/evaluation-attempts.ts`                             | `startEvaluationAttempt`, `readEvaluationOverview` (page d'attente), `submitEvaluationAttempt`, `readSubmittedCopy` (ADR 0015).                                                                                                                                                                                             |
| `src/lib/server/grading-budget.ts`                                  | Budget de temps de la correction d'un envoi → [questions.md](questions.md).                                                                                                                                                                                                                                                 |
| `src/lib/server/chapter-series.ts`                                  | Série rattachée à un chapitre de « Mon cours » (forme flash ou entraînement, sans note).                                                                                                                                                                                                                                    |
| `src/lib/server/validation/evaluations.ts`                          | Zod : `createSeriesSchema`, `evaluationSettingsSchema`, `submitAttemptSchema`, `classIdsFieldSchema`…                                                                                                                                                                                                                       |
| `src/lib/server/validation/tests.ts`                                | `validateSaveTest` : corps de `POST /api/tests/save` (fin de série, gain du Palotin).                                                                                                                                                                                                                                       |
| `src/lib/types/skills.ts`                                           | Types famille B : `MathCompetenceCode`, `SubdimensionLetter`, `SkillAttemptCode` (`plus`/`minus`), `isCompetenceObserved` ; aussi `notionLevel` (niveau d'une notion, progression élève).                                                                                                                                   |
| `src/lib/server/test-mode.ts`, `src/lib/stores/test-mode.svelte.ts` | Mode test du prof : `getTeacherTestMode` / `setTeacherTestMode` (serveur), store `testMode` (navigateur).                                                                                                                                                                                                                   |
| `src/lib/server/validation/parody-evaluations.ts`                   | Zod du dépôt de presques évaluations (PDF ≤ 10 Mo, `MAX_FILE_SIZE_BYTES`).                                                                                                                                                                                                                                                  |

Hors sujet mais rangés ici par la couverture : `src/lib/types/grades.ts`, `src/lib/utils/grades.ts` et
`src/lib/server/validation/grades.ts` décrivent les **niveaux scolaires** (`GradeCode` : `6`, `1_SPE`…),
pas des notes.

### Routes

| Route                                                                                  | Qui           | Quoi                                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/automaths/test` (couverte par [questions.md](questions.md))                          | tous          | Page unique qui joue toutes les formes, libres ou contrôle.                                                                                                                                                |
| `POST /api/series`                                                                     | prof, admin   | Enregistrer le panier comme série. Liste et édition : `/dashboard/teacher/series`.                                                                                                                         |
| `GET /api/series/duration-signals?templates=<uuid,…>`                                  | prof, admin   | `{ signals, observed }` : durées sans doute trop courtes et durées observées des modèles du panier (1 à 100 UUID, Zod) ; des comptes, aucun nom.                                                           |
| `POST /api/tests/save`                                                                 | connecté      | Fin d'une série **libre** : gain du Palotin seulement, rien d'écrit. Refuse un contrôle.                                                                                                                   |
| `/dashboard/teacher/assessments` (+ `new`, `[id]/edit`, `[id]/assign`, `[id]/results`) | prof, admin   | Créer depuis une série, régler (brouillon seulement), publier, assigner, résultats.                                                                                                                        |
| `/dashboard/student/assessments` (+ `[id]/results`)                                    | élève         | Ses contrôles ; ses tentatives (`[id]` = identifiant de l'**assignation**). S'ouvre depuis « Mon travail » (« Tous mes contrôles »), y revient (`BackLink`).                                               |
| `GET /api/evaluations/assignments/[id]`                                                | élève, prof   | Page d'attente, lecture seule : titre, forme, questions, durée, reprise ; mêmes refus que `start`. 30 appels/min.                                                                                          |
| `POST /api/evaluations/assignments/[id]/start`                                         | élève, prof   | Démarrer / reprendre (élève) ou aperçu (propriétaire, admin). 20 appels/min.                                                                                                                               |
| `POST /api/evaluations/attempts/[id]/submit`                                           | élève         | Envoyer la copie, recevoir la note et la correction. 10 appels/min.                                                                                                                                        |
| `/dashboard/teacher/evaluation-tasks` (+ `new`, `[id]`, `[id]/saisie`)                 | prof          | Observations famille B : périmètre, saisie en séance.                                                                                                                                                      |
| `/dashboard/student/competences/[code]`                                                | élève         | Détail d'une compétence mathématique (la liste redirige vers `progression`).                                                                                                                               |
| `/presques-evaluations` · `/dashboard/teacher/presques-evaluations`                    | public · prof | Lecture publique · dépôt, édition, suppression.                                                                                                                                                            |
| `POST /api/test-mode`                                                                  | prof          | Basculer le mode test.                                                                                                                                                                                     |
| `/dashboard/student/work`                                                              | élève         | Boîte « travail à faire » (`getStudentWorkInbox`, quatre systèmes d'assignation) ; seule entrée vers les listes complètes des fiches et des contrôles ; écran vide : un seul bouton, les exercices Python. |
| `/dashboard/student/reports`, `GET /api/student/reports`                               | élève         | Ses signalements d'erreur de fiche (RPC `get_my_error_reports`) ; numéro de l'exercice dans sa copie, `null` si la fiche lui est illisible ([fiches-et-pdf.md](fiches-et-pdf.md)).                         |

## Les formes d'une série

Une série est une liste de lignes `{ templateId, quantity, delay, variations?, choiceVariations? }` : tel **modèle**,
tant de fois, tant de secondes ([ADR 0035](../adr/0035-une-serie-enregistre-des-modeles.md)),
dans les **variations choisies** par le prof (numéros rangés ; absent = toutes ; idée 2 du chantier
`idees-format`). Un numéro qui n'existe plus dans le modèle est ignoré ; s'il n'en reste aucun, la
ligne tire dans toutes (`allowedVariations`). La variation se lit dans la graine : une évaluation
régénérée retombe sur la même question sans rien enregistrer de plus. La révision espacée ne lit
que le modèle de la ligne (le choix ne la restreint pas). Variations **« en QCM »**
(`choiceVariations`, idée 4) : leur case se répond en choisissant parmi la bonne réponse et les
erreurs prévues ([questions.md](questions.md), `choice-from-errors.ts`), sur la même graine ; le
tirage le fait pour toutes les formes sauf les flash-cards (`choiceCases`), et pour l'évaluation,
dont l'instance figée au démarrage garde la forme QCM (la régénération depuis la graine seule, repli
des tentatives d'avant Q42, la redonnerait en saisie). Le prof les coche : dans le panier (Ma série),
sur la carte même (`TileCard`, case « En QCM » de la variation affichée, chantier `automaths`) ; dans
l'éditeur de série, dans la fenêtre des variations (`VariationPicker`, case sous chaque variation qui
le permet) ; prof seulement ; retirer une variation retire son QCM ; le panier garde
le choix à la fusion et par un lien, comme les variations choisies. Elle est tirée **à
neuf à chaque usage** : `drawSeriesQuestions` (`src/lib/questions/series-items.ts`) donne à
chaque ligne une graine neuve (sauf lien « Mêmes nombres pour tous », ci-dessous), d'où sortent les
graines de ses questions. Une ligne qui répète un modèle **répartit ses variations à parts égales**
(10 questions, 3 variations → 4 + 3 + 3, ordre mélangé) et **refuse les doublons** dans toute la
série (`src/lib/questions/series-draw.ts`, chantier `idees-format`) :

- **on choisit la graine, on n'impose pas la variation** : la variation est le premier tirage de
  l'instance, `variationOfSeed` la lit sans générer ; une graine redonne donc toujours la même
  question (copie d'évaluation, erreurs rejouées dans les statistiques), sans rien enregistrer de
  plus ;
- **doublon** = mêmes nombres tirés (variation + variables), **ou** même énoncé affiché (choix d'un
  QCM triés). Deux calculs de même réponse (« 12 × 5 », « 15 × 4 ») ne sont pas des doublons.
  L'empreinte des nombres n'est pas utilisée quand l'énoncé tire lui-même (`{{carré|rectangle}}`) ;
- **jamais de répétition** : un modèle qui n'a plus de question neuve (50 essais par variation)
  raccourcit sa ligne. `distinctQuestionCount` compte les questions différentes d'un modèle, pour
  que le panier propose d'abaisser une quantité trop élevée.

Un modèle retiré (plus
publié) est sauté, et signalé au prof dans le panier et l'éditeur de série (« Modèle retiré ») ;
chaque question porte la durée de **sa** ligne (`delay`, 20 s par défaut :
`DEFAULT_QUESTION_DELAY_SECONDS`). Bornes de la composition : 1 à 50 modèles, 99 répétitions, 600 s
(`src/lib/validation/series.ts`).

**Ancienne forme** (avant l'ADR 0035 : une ligne désignait une catégorie, thème · domaine ·
sous-domaine · niveau) : **plus relue**. Les séries en base ont été converties (lot 2b) ; une
composition qui n'a pas la forme actuelle est illisible : `src/lib/server/series-lines.ts`
(`readStoredSeriesMany(rows)`, synchrone, rend une `Map` id → lignes ; l'illisible est absent et
tracé) la saute. Un ancien lien `?categories=…` (et son QR) est reconnu par `resolveTestLaunch` mais
non relu : le panier dit qu'il est d'une ancienne version ; un panier du navigateur qui porte des
catégories en est vidé de ces lignes au chargement, réécrit, avec un message. Les lignes vivent dans
`series.items` (et `test_sessions.items` pour une séance), ex-`categories`, renommées au lot 4b du
chantier `automaths-arbre`.

| Forme (`TestMode`)             | Composant         | Cartes de cours     | Chrono                                                                                                          | Correction et score                                                                                             | Enregistré                                |
| ------------------------------ | ----------------- | ------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| En classe (`display`)          | `ClassroomSeries` | oui                 | Par question ; ±5 s change tout le modèle (min. 5 s) ; Espace = pause ; page d'attente et réglages (ci-dessous) | Aucune note ; correction après chaque question en option ; grilles des questions puis des corrections           | **Rien** (réglages : navigateur)          |
| Flash-cards (`flash`)          | `FlashSeries`     | oui                 | Aucun                                                                                                           | « Pas réussi / Réussi » (auto-évaluation)                                                                       | Trace `student_self` par carte, pas d'XP  |
| Saisie (`typing`)              | `TypingSeries`    | oui (auto-évaluées) | Aucun                                                                                                           | Navigateur ; « Valider » retourne la carte (sa réponse face à la bonne, puis la correction) ; bilan « k sur n » | Trace `auto` par question, SRS, XP en fin |
| Contrôle blanc (`interactive`) | `TestInteractive` | **non**             | Par question ; à 0, ce qui est saisi est validé, rien = faux ; pas de chrono global                             | Navigateur (ADR 0001), score sur 10 (`computeTestScore`)                                                        | Trace `auto` par question, SRS, XP en fin |
| Course aux nombres (`course`)  | `TestCourse`      | **non**             | Global, toutes les questions à l'écran ; 1 à 60 min (5 min proposées)                                           | Navigateur, score sur 10                                                                                        | Comme le Contrôle blanc                   |

**Coup de pouce** (chantier `idees-format`, idée 5) : Flash-cards et Saisie montrent le bouton
« Coup de pouce » sous l'énoncé quand la variation a un indice (`FlashCard`, `showHint`) ; indice
ouvert → trace « avec indice » (`with_help`), réussite = « Difficile » pour la révision espacée
([srs.md](srs.md), [questions.md](questions.md)). Jamais en En classe, Contrôle blanc, Course aux
nombres ni en contrôle.

**En classe : page d'attente et réglages** (chantier `diaporama-reglages`). La forme s'ouvre sur une page d'attente (`SeriesStartScreen`, cadre commun prévu pour les autres formes) : résumé (« 10 questions · environ 4 min »), réglages, indications clavier, bouton « C'est parti ! » (geste qui débloque le son et le plein écran). Les réglages (`classroomSettings`, gardés dans le navigateur sous `classroomSettings`, rien en base) se changent aussi pendant la série (⚙, diaporama en pause tant que le panneau est ouvert) : plein écran au lancement (allumé par défaut), correction après chaque question (verso de la carte, 5 à 60 s, 10 s par défaut ; une diapositive de correction suit chaque question, cartes de cours comprises), pause à la fin du temps (`holdOnExpire` du Deck : Espace passe à la suite), son entre deux questions (`src/lib/utils/chime.ts`, Web Audio, pas pour une correction). Changer la correction en cours de route remonte le Deck sur la question affichée. Pièges : un `onkeydown` Svelte est délégué à la racine, donc pour arrêter une touche avant le `Deck` (panneau ⚙ ouvert), il faut un écouteur natif (action `settingsPanel`) ; `Slide` prend son index par ordre de montage (`claimNextH`), donc changer la liste des diapositives oblige à remonter le `Deck`.

**Contrôle blanc et Course aux nombres : page d'attente** (même chantier, PR 2a). En entraînement libre, ces deux formes s'ouvrent aussi sur `SeriesStartScreen`, sans réglages ni indications : « 10 questions · environ 4 min » (somme des chronos, Contrôle blanc) ou « 20 questions · 5 min » (temps imparti exact, Course aux nombres ; il reste choisi dans la fenêtre de choix de la forme ou porté par le lien). Rien ne démarre avant « C'est parti ! » : chrono, durée tracée et temps passé partent du clic (le composant prévient la page par `onStart`, qui y remet `startTime` : la durée de série envoyée à `/api/tests/save` part aussi du clic). « Recommencer » ramène à la page d'attente (composant remonté, ou remise à zéro sur place pour une course sans `onRestart`). Résumé : `src/lib/components/test/series-summary.ts`, commun aux trois formes. Contrôle assigné (PR 2b) : la page `automaths/test` lit d'abord `GET /api/evaluations/assignments/[id]` (lecture seule, aucune séance créée) et affiche `SeriesStartScreen` : titre du contrôle, puis « Course aux nombres · 15 questions · 10 min » ou « Contrôle blanc · 10 questions · environ 4 min » (`evaluationSummary`) ; tentative déjà commencée → « Tu reprends ton contrôle : il te reste 6 min » (Course) ou « … : 10 questions, réponses à retaper » (Contrôle blanc), bouton « Reprendre ». Un refus (date limite, tentatives épuisées, non destinataire) s'affiche dès cette page. Le clic seul appelle `POST …/start` (bouton désactivé pendant l'appel : pas de double démarrage ; un échec revient à la page d'attente avec un message, le bouton réessaie) ; le chrono d'une Course part donc du clic. Les composants `TestInteractive` / `TestCourse` n'ont pas de page d'attente en contrôle. Flash-cards et Saisie, sans chrono : pas de page d'attente.

Lancement (`resolveTestLaunch`) : `?assignment=<id>` → contrôle (forme et temps viennent du serveur,
le `mode` de l'URL est ignoré) ; `?modeles=…` (ou un ancien `?categories=…`, signalé sans être relu) sans `mode` → le panier ;
`?modeles=…&mode=…[&time=…][&graine=…]` → démarrage direct. `SeriesLinkShare` fabrique ces liens. Visiteur non connecté : la série se joue,
rien n'est enregistré.

**Recommencer** (hors contrôle) : dans les cinq formes, la page tire de nouvelles questions (Course aux
nombres comprise depuis le 2026-11-20 : `onRestart` de `TestCourse`, composant remonté, chrono à neuf).

**« Mêmes nombres pour tous »** (chantier `memes-nombres`) : case de `SeriesLinkShare`, proposée avec une
forme seulement, décochée par défaut. Cochée, elle tire une graine de série (`graine=<n>`,
`SERIES_SEED_PARAM`), gardée par le lien court du QR ; décocher puis recocher en tire une autre. La page
de test en tire la suite des graines des lignes (`seriesSeedSequence`, `series-items.ts`) : tous
ceux qui ouvrent le lien ont les mêmes questions, dans le même ordre, et « Recommencer » les redonne
(libellé « Recommencer les mêmes questions », prop `sameQuestions`). Une graine abîmée est ignorée
sans message (nombres au hasard). Un modèle modifié entre l'envoi et l'ouverture peut changer ses nombres.

**Quitter** ([composants-ui.md § BackLink](../pratiques/composants-ui.md#backlink--bouton-retour-obligatoire)) : pendant la série, l'en-tête porte un lien « Quitter »
(`BackLink kind="quit"`). Contrôle blanc et course y mènent au panier, ou à « Mes contrôles »
(`/dashboard/student/assessments`) en contrôle : `automathsQuitLink` (`src/lib/navigation/return-links.ts`).
En contrôle **avec une tentative ouverte**, le lien demande confirmation : les réponses tapées seront
perdues (voir « Démarrer », étape 3) et, en course, le temps continue de courir (`remainingSeconds`).
Pas de confirmation en Contrôle blanc libre ni dans l'aperçu du prof. « En classe », les flash-cards et la Saisie (jamais
en contrôle) quittent vers le panier. Les boutons de l'écran de fin gardent `onBack`.

**Traces d'une série libre** (ADR 0038, chantier `formes-de-serie`, PR 4) : chaque question laisse
sa trace **dès la réponse**, avec le **verdict du navigateur** : `buildSeriesTrace` et
`createTraceRecorder` (`src/lib/questions/series-trace.ts`) postent à `api/skill-attempts`
(voir [srs.md](srs.md#note--réussite)). Flash-cards : au clic « Réussi / Pas réussi » du premier tour
(lieu `flash_cards`, « Revoir » n'écrit rien). Saisie (PR 5) : à « Valider » du premier tour (lieu
`typing`, réponse et verdict par case, **aucune durée** : N11) ; carte de cours au clic « Réussi / Pas
réussi » (trace `student_self`, la route lit la nature « carte » en base) ; « Revoir » n'écrit rien. La
carte ne se retourne qu'après « Valider » (`FlashCard` `flipOnSubmit`, `flippable` faux avant) : valider
à vide montre la réponse. `FlashCard` n'envoie plus de trace elle-même. Contrôle blanc : à « Valider » ou au chrono écoulé
(lieu `mock_test`, durée de réponse depuis l'affichage, plafonnée à la durée de la question, fin
`validated` / `timeout`, réponse et verdict par case — `computeBlankColors`, figure sans son tracé).
Course : à « Valider » (lieu `number_race`, durée depuis le début de la course, durée allouée = celle
de la course) ; en fin de course, une question jamais validée est ratée, fin `timeout` au chrono,
**sans durée ni fin** après « Terminer » (décision du 2026-11-11). Les traces partent **une à la fois, dans l'ordre** (deux révisions FSRS
parallèles sur un même modèle perdraient une mise à jour) ; une trace que le serveur dit en panne
(5xx, 429, 408) est réessayée deux fois en silence ; une coupure réseau ne l'est **pas** (la trace a pu
être écrite avant : la renvoyer ferait un doublon, deux révisions FSRS ; mieux vaut en perdre une,
décision du 2026-11-11), ni une trace refusée (400 : au-delà des bornes, L3) ; en fin
de série, la page attend les dernières (`settle`) et affiche au plus un message « Certaines réponses
n'ont pas été enregistrées ». Jamais en contrôle, ni pour un
visiteur (`traceRecorder` nul) ; un prof n'écrit rien (la route l'ignore).

**Fin de série** : `POST /api/tests/save` n'écrit **plus rien** — ni `test_sessions`, ni `test_answers`
(les séances libres anciennes restent lues par l'export RGPD), ni trace : il calcule seulement le gain
du Palotin (Contrôle blanc, Course, Saisie — décision de David du 2026-11-11 ; jamais pour les flash-cards, que la page n'envoie plus). Hors cartes de cours, chaque réponse rapporte au Palotin
(`addBuddyXpFromTest`, réponse `buddy_xp`) ; son thème, pour le bonus « nouveau thème », est la branche
de l'arbre des notions où se range le point que valide la question (`fetchTemplateThemeIds`,
`src/lib/server/buddy-themes.ts`, deux lectures pour la séance). Le corps porte aussi la durée de la
série (`seriesElapsedMs`, 0 à 24 h) : le serveur en tire le début de la série pour fêter une question
longtemps ratée enfin réussie (`buddy_xp.longStruggleWon`, voir `buddy-palotins.md`). Une fois le gain reçu (Contrôle blanc, Course, Saisie ; ni flash, ni
évaluation, ni aperçu du prof), la page demande les nouveautés de la Chatterie
(`fetchMathouNews`) et `TestResults` (`TypingSeries` en Saisie) les affiche sous le gain du Palotin (`MathouNewsCard`, jamais
en évaluation) : voir [mathoux.md](mathoux.md#annonce-des-nouveautés-en-fin-de-séance-v12).
Pendant un Contrôle blanc libre d'un élève connecté (jamais en contrôle), le Palotin peut réagir une
fois (5 réussites d'affilée, 3 erreurs sur une même notion) : `TestInteractive` reçoit
`palotinReactions` de la page, et la question suivante attend son départ. Voir
[buddy-palotins.md § Réactions en séance](buddy-palotins.md#reactions-en-seance-2026-11-11).

**Série de chapitre** (`chapter_series`, `chapter-series.ts`) : un chapitre de « Mon cours » pointe une
série du prof sous la forme `flash` (défaut) ou `interactive` ; l'élève la lance comme une séance libre.
`findOngoingEvaluation` prévient le prof quand la même série sert un contrôle non terminé (Q129).

## Le contrôle (noté)

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
rattachée à un contrôle qui l'utilise (trigger `series_lock_guard`, SQLSTATE `UBS01`) : il faut la
dupliquer (`duplicateSeries`). Même verrou sur le `series_id` d'un contrôle commencé
(`evaluation_series_lock_guard`).

### Démarrer (`startEvaluationAttempt`)

Les étapes 1 à 4 (droits, refus, tentative ouverte) sont communes avec la page d'attente
(`resolveAssignmentAccess`) : `readEvaluationOverview` les joue sans rien écrire, puis compte les
questions (tentative ouverte : ses lignes de `evaluation_attempt_questions`, lues en service_role, durées
seules ; sinon : un tirage À BLANC par `drawSeriesQuestions`, mêmes options qu'à l'étape 5, rien n'est
gardé : un modèle aux questions épuisées en rend moins que demandé ; aucune question → 409 dès la page
d'attente).

1. L'assignation est lue **sous RLS** avec le client de l'élève. Destinataire = élève nommé ou membre
   **actif** de la classe (`isAssignmentRecipient`). Sinon : propriétaire ou admin → **aperçu**
   (lignes de la série renvoyées, le navigateur génère comme une séance libre, rien n'est rattaché) ; autre → 404.
2. Contrôle non publié → 404.
3. **Tentative ouverte** (commencée, non envoyée) → reprise telle quelle, mêmes questions, même ordre,
   sans compter de tentative, **même après la date limite** ; les réponses tapées sont perdues (Q34).
4. Date limite passée → 403 ; tentatives épuisées → 403. Toute séance compte dès sa création,
   abandonnée comprise (Q33).
5. Tirage par `drawSeriesQuestions` avec `excludeCourseCards`, hasard `crypto`. Chaque instance
   **complète** est figée dans `evaluation_attempt_questions` (Q42) : un modèle modifié ensuite ne
   change ni la reprise ni la correction. Une question impossible à générer, ou dont l'énoncé masqué
   dirait encore la réponse d'un bloc à geste (`gestureAnswerLeaks`, chantier `fuite-enonce`), est
   écartée et journalisée AVANT d'enregistrer la tentative ; toutes écartées → 409, aucune tentative
   comptée.
6. Le navigateur ne reçoit que `toPublicQuestion` : ni attendu, ni correction, ni graine
   ([questions.md](questions.md), invariant 8). Course : `remainingSeconds` calculé par le serveur.
7. Double démarrage (deux onglets) : la tentative la plus ancienne gagne, la nouvelle est supprimée.

### Envoyer (`submitEvaluationAttempt`)

1. Séance relue sous RLS ; déjà close → 409 `AttemptAlreadySubmittedError` qui **porte la copie déjà
   notée** (`readSubmittedCopy`), pour l'élève dont la réponse s'est perdue.
2. Course reçue après temps limite + 30 s (`COURSE_GRACE_SECONDS`) → `late` : note 0, aucune réponse
   enregistrée.
3. Case « choix » : les positions AFFICHÉES reçues sont ramenées aux indices d'origine
   (`toOriginalChoiceValues`) avant la correction et l'enregistrement (`test_answers.user_answer`
   en indices d'origine, « 0;2 ») ; une valeur illisible, hors bornes ou répétée → **400**, rien
   d'écrit, la tentative reste ouverte (garde : `evaluation-notee-serveur.test.ts`).
   Correction par le serveur (`gradeWithinBudget` → `gradeQuestion`) : 1, ½ ou 0 par question, note
   sur 20 au demi-point (`gradeOutOf20`). Budget total 5 s ; au-delà, les questions restantes valent 0.
   Tout verdict envoyé par le navigateur est ignoré (le schéma Zod le retire), comme les positions
   cochées d'un ancien QCM (`choices`, retiré le 2026-10-28 : le QCM est une case choix, ADR 0033).
4. Écritures par le client **service_role** (la base refuse à un compte connecté d'écrire une séance
   de contrôle, policies restrictives `test_sessions_insert_not_evaluation` et
   `test_answers_insert_not_evaluation`) : réponses d'abord, puis clôture `completed_at` conditionnelle
   (`is('completed_at', null)`) — un envoi concurrent retire ses réponses et rend la copie existante.
5. Durée mesurée par le serveur (démarrage → envoi). `score` = note / 2 pour les anciens écrans.
6. Si pas en retard : SRS nourri par le **verdict serveur** (`srsReviewsOf`, « su » = juste ou forme
   non optimale non partielle, Q40 ; question posée en QCM depuis ses erreurs prévues, lue sur la copie
   figée par `isAnsweredAsChoice` : réussite = demi-réussite, trace « en QCM », idée 4), puis XP du compagnon (non bloquant). Une trace `auto` par
   question, **lieu `evaluation`**, écrite au client **service** (la policy élève refuse ce lieu) ;
   FSRS et paquet Programme au client de l'élève. Colonnes (`evaluationTraceOf`,
   `src/lib/server/evaluation-trace.ts`) : durée allouée = délai de la question (Contrôle blanc) ou
   durée de la course (Course) ; fin `validated` / `timeout` et durée de réponse (plafonnée ; temps
   écoulé → la durée allouée) **déclarées par la page** (`endReason`, `timeSpent`, envoyés même pour
   une question vide) ; fin absente (laissée par « Terminer », ancien onglet) → ni durée ni fin. Ni
   graine (D18), ni réponse ni verdict par case (dans `test_answers`). Copie en retard : aucune trace.

`EvaluationResults` affiche la réponse telle quelle : rien n'est recalculé dans le navigateur.

### Résultats

Élève : `getStudentAssignments` (statut calculé par `getStudentStatus` : non commencé, en cours,
terminé, expiré ; meilleure note `bestGrade`, Q36) ; la même fonction, appelée avec le client du prof,
nourrit le bloc « Contrôles » du suivi d'un élève ([analytique-prof.md](analytique-prof.md#suivi-dun-élève-page-à-part)).
La page des résultats a deux parents : la liste des contrôles, ou ce suivi (`?depuis=suivi&eleve=<uuid>`,
`evaluationResultsReturn`). Prof : `getEvaluationResults` (un élève par ligne
même s'il est assigné deux fois, toutes ses tentatives) et `computeEvaluationStatistics` (moyenne,
min, max sur la meilleure note de chaque élève). Les résultats suivent le **mode test** : vrais
élèves ou élèves de test, jamais les deux.

**Bilan par question et par notion** (`getEvaluationBreakdown`, `EvaluationBreakdown.svelte`, sous
les cartes de la page résultats) :

- **Copie comptée** : la meilleure de chaque élève du tableau (même règle que `bestGrade` ; à note
  égale, une copie avec réponses puis la plus récente), copies rendues seulement. Le mode test vient
  des élèves passés par le loader (ceux de `getEvaluationResults`).
- **Par question** : une ligne par modèle, dans l'ordre de la composition ; les tirages d'un même
  modèle s'additionnent. Taux de réussite = points obtenus / réponses (1, ½ ou 0 par réponse) ;
  répartition juste (1) / partiel (forme non optimale, ½) / faux (mauvaise forme comprise, 0) / sans réponse. Une
  réponse d'un modèle sorti de la série reste comptée sous son modèle, en fin de liste.
- **Par notion** : modèle → `question_template_points` → `curriculum_points.node_id`, remonté
  jusqu'au nœud `notion` (branche › notion). Un modèle à plusieurs notions compte dans **chacune** ;
  sans point (ou point posé sur une branche) → « Sans notion », en dernier. Tri du taux le plus
  faible au plus fort.
- **Copie en retard** (note 0, aucune réponse écrite) : hors du bilan, dite à part.
- **Durée sans doute trop courte** (chantier `durees-trop-courtes`, besoin P7 ; `timingsOf`, champ
  `timing` de chaque question) : sur les mêmes copies, un élève « n'a rien répondu dans le temps
  imparti » quand sa réponse est « sans réponse » (règle `columnOf`) **et** que son `time_spent`
  atteint la durée − 1 s (secondes entières déclarées ; un vide validé tôt ou sans durée déclarée ne
  compte pas). Tiré plusieurs fois, il compte une fois, seulement s'il a manqué tous ses
  tirages. La question porte la marque « Durée sans doute trop courte » et la phrase « 7 élèves sur
  10 n'ont rien répondu dans les 20 s » à partir de **5 élèves**, **plus de la moitié** ; aucun nom.
  Durée = celle de la ligne dans la composition (0 → 20 s, comme au tirage ; la série est verrouillée
  dès la première séance). `timing` nul : Course aux nombres (chrono global), modèle hors de la série
  ou supprimé, modèle sur **deux lignes à durées différentes** (durée de chaque élève non lisible
  ici).
- **En QCM** (chantier `idees-format`, idée 4, PR 3 ; champ `choiceAnswers`) : réponses comptées dont la
  copie figée porte le repère « posée en QCM » (`fromExpectedErrors` de la case, lu seul par PostgREST :
  `question_instance->blanks->0->>fromExpectedErrors`, jamais l'énoncé entier). La ligne dit « en QCM »
  quand toutes l'ont été, « dont 2 en QCM » sinon (`choiceAnswersLabel`) : le taux n'est pas celui d'une
  saisie. Dans les erreurs de la question, chaque groupe posé en QCM porte la mention « en QCM »
  (`QuestionErrorGroup.asChoice`).
- **Lecture** : client du prof, RLS existante (`test_answers_select_teacher`), réponses par pages de
  1 000 (`max_rows`). Une lecture en échec rend `{ status: 'error' }` : la section le dit, la page
  garde cartes et tableau.

**Durée trop courte dans le panier et l'éditeur de série** (chantier `durees-trop-courtes`, PR 2 ;
`getDurationSignals` dans `src/lib/server/stats/duration-signals.ts`) : même marque, posée par
**modèle × durée**. Elle apparaît dans le panier (sous la durée d'une tuile, pour un prof ou un
admin, lue par `GET /api/series/duration-signals` quand les modèles du panier changent) et dans
l'éditeur de série (`/dashboard/teacher/series/[id]/edit`), qui affiche la durée de chaque ligne en
lecture (elle se règle dans le panier, ou par la durée observée ci-dessous). Le composant est commun : `TooShortMark.svelte`
(`src/lib/components/series/`), utilisé aussi par le bilan. Deux sources fusionnées par élève :

- les **traces de Contrôle blanc** (`skill_attempts`, lieu `mock_test`), avec durée =
  `allotted_ms` ; une trace est manquée si `end_reason = 'timeout'` et `part_verdicts` est nul (un
  choix coché est une case) ; fin inconnue (« Terminer ») écartée ;
- les **réponses des contrôles** de forme `interactive`, avec la règle du bilan.

Un élève compte une fois par modèle × durée, et seulement s'il a manqué **tous** ses tirages. Seuils
du bilan. Ne comptent que les traces et les copies **postérieures à la dernière modification du
modèle** (`question_templates.updated_at`). Carte de cours écartée. Mode test du prof respecté
(`profiles.is_test`). Lecture : client du prof, RLS existante (`skill_attempts_select_teacher`, aucun
accès nouveau). Un échec ne retire que la marque.

**Durée observée** (chantier `durees-ajustees`, besoin A1 ; `observedDurationsOf`, même lecture que la
marque) : sous la durée d'une ligne, dans le panier et l'éditeur de série, « Durée observée : 35 s »
et un bouton « Appliquer » (`ObservedDelayHint.svelte`, `src/lib/components/series/`). Rien ne change
sans ce geste ; dans l'éditeur, la durée appliquée s'écrit à l'enregistrement (une série verrouillée
n'y arrive pas : « Modifier » est masqué et la base refuse, UBS01). Règle, sur les mêmes tirages que
la marque (élèves du prof, mode test, postérieurs à la modification du modèle, carte écartée), chaque
tirage comptant, **durées allouées confondues** :

- un tirage validé avant la fin **avec une réponse** (juste ou fausse) donne sa durée de réponse
  (`response_ms` du Contrôle blanc, `time_spent` d'un contrôle) ; arrivé au bout du chrono (contrôle :
  à la dernière seconde près ; Contrôle blanc : `end_reason = 'timeout'`), réponse commencée ou non,
  il compte « au-delà » ; **passé à vide avant la fin** (passer ≠ avoir eu le temps) ou durée
  inconnue : écarté ;
- durée observée = la durée dans laquelle **80 %** des tirages ont été validés, **arrondie aux 5 s
  supérieures**, bornée à 5-300 s (le réglage du panier) ; si les temps écoulés dépassent 20 %, le
  chiffre n'est pas calculable (la marque « trop courte » prend le relais) ; au moins **5 élèves** ;
- affichée seulement si elle s'écarte de la durée de la ligne (0 → 20 s) d'au moins **5 s et 25 %**,
  dans un sens ou l'autre (`observedSuggestion`, `src/lib/types/duration-signals.ts`).

**Erreurs d'une question** (chantier `erreurs-frequentes`, besoin P4 ; `getEvaluationQuestionErrors` dans
`evaluation-question-errors.ts`, route `…/assessments/[id]/results/question-errors?template=<uuid>`) :
chaque ligne « par question » du bilan se déplie ; les erreurs sont lues au premier dépliage. Le panneau est `QuestionErrorsPanel.svelte`, partagé avec l'onglet « Erreurs » du widget E de
l'analytique ([analytique-prof.md](analytique-prof.md)), qui y fait passer aussi les traces de séries
(verdict par case fourni : `computeQuestionErrors` ne recalcule que les réponses sans verdict).

- **Mêmes copies que le bilan** (`bestCopies`, copies avec réponses tous modèles confondus), mêmes gardes
  que la page (rôle, auteur du contrôle, mode test), client du prof sous la RLS existante.
- **Réponses listées** : fausses, mauvaise forme, forme non optimale (une réponse fausse sans valeur
  enregistrée comprise) ; justes jamais listées ; sans réponse comptées à part, **selon le statut seul**,
  comme le bilan. Question non corrigée faute de temps : détail indisponible, jamais recalculé. Chacune rendue par `CorrectionCard` avec le verdict par case recalculé par le serveur
  (`detailsWithinBudget`, détail « indisponible » possible), énoncé tiré lu dans
  `test_answers.question_instance`, nom de l'élève en texte.
- **Regroupement** : même énoncé tiré (sans position ni `generatedAt` / `seed`) **et** même réponse → un
  groupe, avec les noms. Les tirages étant aléatoires, aucun regroupement entre énoncés différents.
- **Erreurs par case** : question à au moins deux cases jugées, hors QCM, sur les réponses au détail
  disponible (justes au dénominateur).
- **Types d'erreur** (chantier `type-erreur`, PR 2 ; `answerErrorKinds` dans
  `src/lib/questions/error-kinds.ts`, moteur `guessErrorKind` de mathAST) : chaque case **fausse** d'un
  groupe porte son type quand il est reconnu (erreur de signe, puissance de 10 avec son facteur, inverse,
  double, moitié, carré oublié, carré en trop), étiquette sous la liste des noms (« Case 2 : … » sur une
  question à plusieurs cases). La question compte les cases fausses par type, chaque élève d'un groupe
  compté une fois, d'un énoncé tiré à l'autre : « Types d'erreur : Erreur de signe : 4 · Non reconnue : 6 »,
  ligne montrée seulement si un type au moins est reconnu. Pas de type : mauvaise forme (bonne valeur),
  case déjà nommée par une remarque (%, unité, arrondi… ; le message global, agrégat ou phrase
  générique, n'est pas lu), case hors écriture
  mathématique (choix, geste, tableau de signes, figure), question à cases appariées librement
  (`orderIndependent`), case jugée par ses règles seules (`rulesSuffice` : l'attendu n'est qu'un
  exemple), ambiguïté ou attendu 0 / ±1 (règles du moteur). Côté élève (PR 3), le même
  type se dit en phrase sous la réponse, à la correction ([questions.md](questions.md), résultat
  attendu). Détail indisponible : seule une
  question à une case se lit, d'après la valeur saisie. Traces de séries : leur verdict par case
  (`part_verdicts`) ne garde aucune remarque, la règle « la remarque prime » n'y agit donc pas ; le
  % et l'unité restent écartés par le moteur lui-même (attendu en pourcentage ou non numérique). Calculé à la lecture, jamais stocké ; la note ne
  change pas.
- **Erreurs prévues** (chantier `idees-format`, idée 3, PR 7) : une case fausse qui fait une erreur
  prévue par l'auteur (`expectedErrorOf`, [questions.md](questions.md)) compte sous le **nom** de cette
  erreur, à la place du type deviné et même quand la case a une remarque : son nom court (`label`),
  sinon le message de l'élève (« Types d'erreur : Soustraction au lieu d'addition : 3 · Erreur de
  signe : 2 »). Les comptes se font par nom (`ErrorKindCount.label`) : deux tirages de la même erreur
  prévue nommée comptent ensemble ; sans nom court, un message qui dit les nombres du tirage fait un
  compte par tirage ; une erreur prévue nommée comme un type deviné partage son compte. À égalité,
  les erreurs prévues d'abord, puis les types devinés dans leur ordre. Formules `$…$` du nom rendues
  comme dans la remarque de l'élève (`remarkSegments`).

## Les observations (compétences, famille B)

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

## Les presques évaluations

PDF parodiques : le prof dépose (PDF seul, 10 Mo, titre, niveaux, thèmes via `resource_tags`) dans le
bucket public `parody-evaluations` et la table `parody_evaluations`. La page publique
`/presques-evaluations` est lisible **sans compte** ; elle ne joint pas `profiles` (fermée à `anon` :
la jointure faisait échouer toute la requête, page vide du 2026-09-05 au 2026-09-15) et **échoue en
500** plutôt que d'afficher une liste vide. Édition et suppression : propriétaire seulement (RLS +
vérification explicite).

## Le mode test du prof

Un prof `is_test` est toujours en mode test ; un autre bascule `user_preferences.test_mode_enabled`
par `TestModeToggle` (tableau de bord) → `POST /api/test-mode` → rechargement complet de la page.
`getTeacherTestMode` filtre ensuite élèves de classe, résultats de contrôle, énigmes, paquets SRS
assignés (`src/lib/server/students.ts` et cinq pages prof).

## Invariants

1. **Un contrôle n'est corrigé que par le serveur** ; `/api/tests/save` refuse un
   `assignmentId` (400). Les séries libres restent corrigées par le navigateur (ADR 0001).
2. **La graine et l'attendu ne quittent jamais le serveur** pendant une tentative : seules les
   questions publiques partent ; la correction arrive avec la note.
3. **Une tentative compte dès son démarrage** ; une tentative ouverte se reprend sans en coûter une.
4. **Le verrou de série est tenu par la base**, pas par l'application : le drapeau `locked` de
   `getTeacherSeries` sert à l'affichage seulement.
5. **Pas de carte de cours** (non évaluable) dans une forme qui corrige : contrôle, course aux
   nombres, contrôle blanc (`seriesFormExcludesCourseCards`, ADR 0009 précisée le 2026-11-09). Une
   série faite seulement de cartes, lancée sous l'une de ces formes, s'arrête sur un message. Une
   question de cours évaluable (QCM, vrai/faux…) n'est jamais retirée.
6. **Lire avec le client de l'utilisateur, écrire avec service_role** dans `evaluation-attempts.ts`,
   après vérification explicite de l'identité et des droits.
7. **Le mode test sépare** : un prof ne voit jamais vrais élèves et élèves de test ensemble.

## Comment étendre

- **Nouvelle forme de série** : ajouter la valeur à `TestMode` et à `TEST_MODES` (`test-launch.ts`),
  un composant dans `src/lib/components/test/`, le choix dans `TestModeDialog` et `SeriesLinkShare`,
  la contrainte `mode` de `test_sessions`. Pour qu'elle soit **notée**, il faut aussi
  `EvaluationForm`, `evaluationFormSchema` et la contrainte de `evaluations.form`.
- **Nouveau réglage de contrôle** : colonne (migration additive), `evaluationSettingsSchema`,
  `EvaluationConfigForm`, `createEvaluation`/`updateEvaluation`, et **le lire** dans
  `startEvaluationAttempt` (voir l'écart `shuffle_questions`).
- **Toucher à la correction** : c'est [questions.md](questions.md) (`grading.ts`). La note d'une copie
  est stockée, mais le statut **par case** d'une copie relue est recalculé (`readSubmittedCopy`) : un
  validateur modifié change ce détail, pas la note.

## Tests

- Unitaires serveur : `src/lib/server/__tests__/` (`evaluations`, `evaluation-breakdown`, `series`, `chapter-series`,
  `grading-budget`, `evaluation-attempts-srs`, `evaluation-curriculum-points`) ;
  `src/lib/server/validation/__tests__/evaluations.test.ts`.
- Routes : `src/routes/api/evaluations/assignments/[id]/start/__tests__/start.test.ts`,
  `src/routes/api/evaluations/assignments/[id]/__tests__/overview.test.ts` (page d'attente),
  `src/routes/api/evaluations/attempts/[id]/submit/__tests__/submit.test.ts`,
  `src/routes/api/tests/save/__tests__/`, `src/routes/api/series/__tests__/series-route.test.ts`,
  `src/routes/(protected)/dashboard/teacher/assessments/[id]/results/__tests__/page.server.test.ts`,
  `src/routes/(public)/automaths/test/__tests__/evaluation-notee.svelte.test.ts`.
- Composants : `src/lib/components/test/__tests__/`, `src/lib/components/assessments/__tests__/` ;
  utilitaires : `src/lib/utils/__tests__/test-launch.test.ts`, `test-score.test.ts`.
- Intégration (Supabase local) : `tests/integration/evaluation-notee-serveur.test.ts`,
  `evaluation-tentatives.test.ts`, `series-evaluations.test.ts`, `series-evaluations-code.test.ts`,
  `acces-evaluation-eleve-archive.test.ts`, `series-de-chapitre.test.ts`,
  `presques-evaluations-visiteur.test.ts`, `test-sessions-mode-flash.test.ts`,
  `competence-referentiel.test.ts`, `bilan-controle.test.ts`.
- **Sans test** : la saisie des observations, le dépôt de presques évaluations, le mode test.

## Décisions (ADR)

[0001](../adr/0001-correction-cote-client.md) correction dans le navigateur (séances libres) ·
[0008](../adr/0008-referentiel-famille-a-abandonne.md) famille A abandonnée ·
[0009](../adr/0009-carte-de-cours-type-explicite.md) carte de cours ·
[0011](../adr/0011-fiche-d-automatismes-figee-par-graine.md) série figée par graine (fiches) ·
[0015](../adr/0015-evaluation-notee-correction-serveur.md) contrôle (évaluation notée) corrigé par le serveur ·
[0016](../adr/0016-auto-evaluation-meilleur-resultat-du-jour.md) auto-évaluation, meilleur du jour.

## Écarts connus

Les écarts de cette zone sont au [registre des écarts](../ecarts/registre.md) : `pnpm ecarts`. Un écart s'écrit là-bas, jamais ici.

### À savoir (voulu)

- **Temps de course par défaut** : 5 min dans `TestModeDialog` (séance libre), 7 min pour un
  contrôle.
- **Le code garde les anciens noms** : les écrans disent **contrôle** et **observation** depuis le
  2026-10-11, mais les URL (`/assessments`, `/evaluation-tasks`), les tables et les identifiants
  (`evaluations`, `EvaluationCard`…) n'ont pas été renommés. Les notifications déjà envoyées
  gardent « évaluation ».

### Points non vérifiés

- **Fenêtre de choix du panier** (`TestModeDialog`) : un clic sur une carte lance la série ; seule la
  Course aux nombres affiche d'abord le temps imparti, puis « Commencer le test ». La fenêtre défile
  (`max-h-[90vh]`) : avec quatre cartes, elle dépasse un écran bas.

---

Vérifié contre le code le 2026-10-11 ; `GET /api/student/reports` le 2026-10-14 ; `notionLevel` le 2026-10-21 ; séries sans ancienne forme (lot 4a) le 2026-11-04 ; réactions du Palotin dans l'Entraînement le 2026-11-11 ; traces par question et fin de série réduite au gain (PR 4 `formes-de-serie`) le 2026-11-11 ; erreurs d'une question du bilan (`erreurs-frequentes`) le 2026-11-14 ; panneau partagé (PR 2) le 2026-11-14 ; durée sans doute trop courte (`durees-trop-courtes`, PR 1) le 2026-11-14, dans le panier et l'éditeur de série (PR 2) le 2026-11-14 ; durée observée (`durees-ajustees`) le 2026-11-15 ; « Mêmes nombres pour tous » (`memes-nombres`) le 2026-11-19 ; Recommencer de la Course aux nombres le 2026-11-20.
