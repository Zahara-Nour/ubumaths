# Chantier `durees-trop-courtes` — repérer les durées manifestement trop courtes (P7)

Ouvert le 2026-11-14, choisi par David après la clôture de `suivi-eleve`. Besoin P7 validé le
2026-11-11 ([`formes-de-serie-progress.md`](../archive/wip/formes-de-serie-progress.md) § « Besoins de
suivi validés ») : « repérer les questions où la majorité n'a rien répondu dans le temps imparti ».
Suite prévue : A1 (durées ajustées au temps observé), chantier à part.

## Reprendre ici

_Mis à jour le 2026-11-14, PR 2 en cours (plan technique écrit)._

- **État** : PR 1 mergée (#2652) ; PR 2 : phase 0 tranchée (Q6 à Q8, « je suis tes recos »), plan technique écrit (§ « PR 2 — plan technique ») · **Prochaine action** : tests rouges (pure `durationSignalsOf`), puis lecture, route, panier, éditeur · **En attente de David** : rien · **Pièges en cours** : prod presque vide, vérifier en local ; carte de cours = jamais de case, l'écarter ; `allotted_ms` en ms, durées en s · **Worktree / branche** : `../ubumaths-wt-durees-trop-courtes`, `feat/durees-trop-courtes-editeur`

## Ce qui existe (vérifié le 2026-11-14)

- **Une durée appartient à une ligne de série** `{ templateId, quantity, delay }` (20 s par défaut,
  5 à 600 s) : le même modèle peut avoir 10 s dans une série et 40 s dans une autre.
- **Formes chronométrées par question** : Contrôle blanc libre (lieu `mock_test`) et contrôle de forme
  `interactive` (lieu `evaluation`). À 0, ce qui est saisi est validé, rien = faux.
- **Course aux nombres** : un seul chrono global (toutes les questions à l'écran) ; pas de durée par
  question. Une question jamais validée finit `timeout` au chrono.
- **Ce que les traces gardent** (`skill_attempts`, ADR 0038) : `allotted_ms` (durée de la question),
  `response_ms`, `end_reason` (`validated` / `timeout`), `answer_parts` (`mock_test` seulement ; rien
  en contrôle, la réponse est dans `test_answers`). **Aucun lien vers la série** : une trace de Contrôle
  blanc libre dit le modèle et la durée, pas de quelle série elle vient.
- **Contrôles** : `test_answers` (statut, dont « sans réponse », `time_spent`) + traces `evaluation`
  avec `end_reason` ; le bilan d'un contrôle (P6, `getEvaluationBreakdown`) a déjà une ligne par modèle
  avec la répartition juste / partiel / faux / **sans réponse**.
- **Prod (MCP, 2026-11-14)** : 101 traces, aucune avec lieu ; 1 contrôle, 16 séances, 101 réponses.

## Phase 0 — comportements proposés (à valider)

- **Nominal** : une question est signalée **« durée sans doute trop courte »** quand, sur au moins
  **5 élèves** qui l'ont eue **à cette durée**, **plus de la moitié** ont laissé le chrono s'écouler
  **sans rien répondre** (Q1). Le signal dit « 7 élèves sur 10 n'ont rien répondu dans les 20 s » ;
  aucun nom.
  - **Bilan d'un contrôle** (PR 1) : la ligne du modèle porte la marque ; sous le seuil de 5 élèves,
    rien.
  - **Éditeur de série** (PR 2) : à côté de la durée d'une ligne (modèle × durée), la même marque, lue
    sur les Contrôles blancs et les contrôles de **ses** élèves à **cette durée** (Q2, Q3).
- **Limite** : moins de 5 élèves à cette durée → rien (pas de jugement sur 2 copies). Question
  répondue faux à temps → ce n'est pas une durée trop courte, elle ne compte pas. Course aux nombres →
  hors du signal (Q4).
- **Erreur** : lecture en échec → pas de marque, la page reste (le bilan et l'éditeur ne dépendent pas
  du signal).

## Décisions (David, 2026-11-14 : « je te suis » aux recommandations)

- **Q1** : « rien répondu » = temps écoulé **sans rien saisi** ; une réponse commencée ne compte pas.
  Seuils : au moins **5 élèves** à cette durée, **plus de la moitié**.
- **Q2** : grain **modèle × durée**.
- **Q3** : PR 1 = **bilan d'un contrôle** ; PR 2 = **éditeur de série** (à côté de la durée de chaque
  ligne). Pas l'analytique de classe.
- **Q4** : **Course aux nombres hors du signal** (chrono global).
- **Q5** : **aucune durée suggérée** (c'est A1).

## PR 1 — plan technique (2026-11-14)

Aucune migration. Contrôles de forme `interactive` seulement (Q4). Mêmes copies que le bilan
(`bestCopies` : la meilleure de chaque élève, copies rendues, mode test respecté).

- **Ce qu'on sait d'une réponse de contrôle** : `test_answers` garde le statut (« sans réponse » = statut
  nul ou inconnu, règle du bilan, `columnOf`) et `time_spent` (secondes déclarées par la page), **pas**
  la fin ni la durée de la question. La durée vient de la **composition de la série** du contrôle
  (`series.items`, lignes `{ templateId, delay }`), fiable : la série est verrouillée dès qu'une séance
  commence (`series_lock_guard`).
- **« Rien répondu à temps »** = réponse « sans réponse » **et** `time_spent ≥ délai − 1 s` (secondes
  entières déclarées). Une réponse vide validée tôt (« Valider » à vide) n'est pas un manque de temps.
- **D1 (défaut de Claude, non tranché)** : un modèle présent sur **deux lignes à durées différentes**
  dans la même série → pas de signal pour ce modèle dans ce contrôle (on ne sait pas quelle durée chaque
  élève a eue sans lire `evaluation_attempt_questions`, réservée au service). Cas rare.
- **Code** : `src/lib/server/evaluation-breakdown.ts` — la lecture des réponses gagne `time_spent` ; une
  fonction pure `tooShortOf(rows, delays)` rend, par modèle, `{ delaySeconds, students, unansweredInTime }`
  et `tooShort` (≥ 5 élèves **et** > moitié). Chaque élève compte une fois par modèle (plusieurs tirages
  du même modèle dans la copie : il compte s'il a manqué **au moins la moitié** de ses tirages — à
  vérifier contre le bilan, qui additionne les tirages).
- **Rendu** : `EvaluationBreakdown.svelte`, ligne du modèle : marque « Durée sans doute trop courte »
  et « 7 élèves sur 10 n'ont rien répondu dans les 20 s » ; aucun nom ; rien sous le seuil ; Course :
  rien.
- **Tests** (rouges d'abord) : pure (seuil 5, moitié stricte, vide validé tôt écarté, réponse commencée
  écartée, D1, plusieurs tirages) ; bilan (course sans signal, lecture `time_spent`) ; rendu (marque,
  phrase, absente sous le seuil).
- **Revue** : `code-reviewer` (données d'élèves agrégées, aucune nouvelle lecture d'accès) ;
  `security-auditor` seulement si une lecture nouvelle apparaît. **Doc** : `evaluations.md` § Résultats.

## PR 2 — état des lieux et phase 0 (2026-11-14)

**Constats (code lu)**

- **L'éditeur de série** (`dashboard/teacher/series/[id]/edit`) montre titre, niveau et nombre de
  questions de chaque ligne. Il **n'affiche pas la durée** et ne la modifie pas ; une série est
  verrouillée dès qu'une séance commence (il faut alors la dupliquer).
- **La durée se règle dans le panier** (`automaths/panier`, `CartQuestionCard`, ± par pas),
  avant « Enregistrer comme série » (prof ou admin).
- **Contrôle blanc libre** : la trace `mock_test` porte le modèle, `allotted_ms` (la durée de la
  question), `end_reason` et `answer_parts` (null si rien n'a été tapé). Le grain modèle × durée se
  lit donc **sans lien vers la série**. Lecture par le client du prof, sous la RLS existante
  (`skill_attempts_select_teacher` = `is_my_student`) : **aucune migration, aucun accès nouveau**.
- **Contrôles** : la règle de la PR 1 (`test_answers` + durée de la composition). Les traces
  `evaluation` ne suffisent pas : on n'y voit pas si l'élève a saisi quelque chose, et la Course y
  met la durée de la course.
- **Union des deux sources** : un élève compte une fois par modèle × durée ; il « n'a rien répondu »
  seulement si **tous** ses tirages (Contrôles blancs et contrôles) ont été manqués. Ce sont les
  seuils de la PR 1 (au moins 5 élèves, plus de la moitié).

**Comportements proposés**

- **Nominal** : à côté de la durée d'une ligne, la même marque que dans le bilan, « Durée sans doute
  trop courte », avec « 7 élèves sur 10 n'ont rien répondu dans les 20 s ». Aucun nom.
- **Limite** : moins de 5 élèves à cette durée → rien. Une autre durée du même modèle ne compte pas
  (10 s manquées ne disent rien de 40 s). Course aux nombres → rien.
- **Erreur** : lecture en échec → pas de marque, la page reste.

**Questions à David**

- **Q6 — Où ?** L'éditeur n'affiche pas les durées. Recommandé : **(a) le panier**, à côté du
  réglage ± de la durée, pour un prof connecté (c'est là qu'on choisit la durée), **et (b)
  l'éditeur**, qui affiche enfin la durée de chaque ligne (en lecture) avec la marque. Autres choix :
  le panier seul, ou l'éditeur seul.
- **Q7 — QCM en Contrôle blanc** : à vérifier dans le code. Si un choix coché n'est pas une « case
  tapée », la trace d'un QCM coché puis laissé au chrono ressemble à « rien saisi ». Recommandé : s'il
  y a ce doute, **exclure du signal** les traces sans cases tapées possibles (QCM, figure) plutôt
  que les compter comme manquées.
- **Q8 — Traces anciennes** : un modèle modifié depuis peut devenir plus court ou plus long à faire.
  Recommandé : **ne compter que les traces postérieures à la dernière modification du modèle**, la
  règle de « erreurs de la classe sur un point ». Autre choix : tout compter.

**Décisions (David, 2026-11-14 : « je suis tes recos »)**

- **Q6** : la marque va **dans le panier** (à côté des ± de la durée, pour un prof ou un admin
  connecté) **et dans l'éditeur**, qui affiche désormais la durée de chaque ligne (en lecture).
- **Q7** : le code a été vérifié et le doute ne tient pas. Une case « choix » coché est une case de la
  trace (`answer_parts`) : un QCM coché puis laissé au chrono compte comme une « réponse commencée ».
  Seule la **carte de cours** (`options.courseCard`, jamais de case) est écartée du signal.
- **Q8** : seules les traces et les copies **postérieures à la dernière modification du modèle**
  (`question_templates.updated_at`) comptent.

## PR 2 — plan technique (2026-11-14)

Aucune migration. Lectures avec le client du prof, sous la RLS existante (`is_my_student` ; l'admin
voit tout, par sa policy). Le mode test est respecté (`profiles.is_test` = le mode du prof,
`getTeacherTestMode`), comme dans le bilan.

- **Pur** : `durationSignalsOf(input)` dans `src/lib/server/stats/duration-signals.ts`. Pour chaque
  modèle, il rend la liste `{ delaySeconds, students, unansweredInTime, tooShort }`, une entrée par
  durée observée. Une **trace de Contrôle blanc** (`place = 'mock_test'`, `end_reason` non nul) est
  un tirage à `round(allotted_ms / 1000)` s ; elle est manquée si `end_reason = 'timeout'` et
  `answer_parts` est nul. Une **réponse de contrôle** compte avec la règle de la PR 1
  (`unansweredInTime`, durée de la composition, D1). L'élève est la clé et compte une fois par
  modèle × durée ; il est manqué si **tous** ses tirages le sont. Les seuils `TOO_SHORT_MIN_STUDENTS`
  et plus de la moitié sont repris de la PR 1.
- **Lecture** : `getDurationSignals(supabase, templateIds, isTestMode)`.
  1. Lire les modèles (`id, updated_at, options`) et écarter les cartes de cours.
  2. Lire les traces `mock_test` de ces modèles, depuis `updated_at`.
  3. Lire les contrôles de forme `interactive` dont la série contient l'un des modèles, leurs copies
     rendues après `updated_at`, la meilleure par élève et par contrôle (`bestCopies`), puis les
     réponses `test_answers` des modèles.
  4. Garder seulement les élèves dont `is_test` correspond au mode.

  Une lecture en échec → `{ status: 'error' }`, jamais une exception.

- **Route** : `GET /api/series/duration-signals?templates=<uuid,…>` (prof/admin, Zod : 1 à 100 UUID),
  pour le panier qui change ses durées en direct ; le client choisit l'entrée de la durée courante.
- **Panier** : `CartQuestionCard` reçoit l'entrée de sa durée et affiche la marque sous les ±.
- **Éditeur** : `+page.server.ts` charge les signaux (un échec ne bloque pas la page) ; chaque ligne
  affiche « 20 s » et, s'il y a lieu, la marque.
- **Rendu commun** : la marque et la phrase de la PR 1 (`EvaluationBreakdown`) passent dans un petit
  composant partagé.
- **Tests** (rouges d'abord) : pure (seuil, moitié stricte, une durée ne compte pas pour une autre,
  sources fusionnées par élève, `Terminer` écarté, vide validé tôt pas manqué, carte de cours
  écartée) ; route (rôle, Zod) ; rendu (panier, éditeur) ; intégration locale de la lecture (RLS, Q8,
  mode test).
- **Revue** : `code-reviewer` + `security-auditor` (nouvelle route API sur des données d'élèves).
  **Doc** : `evaluations.md` et la doc des séries (`couvre:`).

## Questions à David (phase 0, posées le 2026-11-14 — tranchées ci-dessus)

- **Q1 — « Rien répondu »** : seulement le chrono écoulé **sans rien saisi** (proposé) ? Ou aussi le
  chrono écoulé avec une réponse **commencée** (validée d'office à 0 s) ? Et les seuils : 5 élèves au
  moins, plus de la moitié (proposé) ?
- **Q2 — Grain** : le signal porte sur **modèle × durée** (proposé : le même modèle peut aller à 40 s et
  manquer à 10 s), pas sur le modèle seul ?
- **Q3 — Où** : PR 1 dans le **bilan d'un contrôle**, PR 2 dans l'**éditeur de série** (à côté de la
  durée de chaque ligne) — proposé. Ailleurs (analytique de classe, page du modèle) ?
- **Q4 — Course aux nombres** : hors du signal (pas de durée par question) — proposé ? Ou un signal à
  part au niveau de la course (« la plupart n'ont pas fini ») ?
- **Q5 — Une suggestion de durée ?** Le signal dit seulement « trop courte » (proposé ; proposer une
  durée, c'est A1) ? Ou il propose déjà une durée (par exemple le temps qu'ont mis ceux qui ont
  répondu) ?

## Journal

- 2026-11-14 : PR 2, worktree ouvert, état des lieux, phase 0 posée (Q6 à Q8).

- 2026-11-14 : PR 1 mergée (#2652) ; la revue a resserré la règle des tirages multiples (tous manqués).

- 2026-11-14 : PR 1 codée (`timingsOf` dans `evaluation-breakdown.ts`, champ `timing` de chaque
  question, marque dans `EvaluationBreakdown.svelte`, doc `evaluations.md`). Plusieurs tirages : un
  élève compte seulement s'il a manqué tous ses tirages (lecture littérale de Q1, après la revue).

- 2026-11-14 : phase 0 tranchée (« je te suis »), plan technique de la PR 1, défaut D1.
- 2026-11-14 : chantier ouvert, état des lieux, phase 0 posée (Q1 à Q5).
