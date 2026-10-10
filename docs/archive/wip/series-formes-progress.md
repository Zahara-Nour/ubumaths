# Séries et leurs formes d'usage — progression

Étude du 2026-09-30 (TinyMath, existant Chiphre, UbuSlides). Aucun code écrit à ce stade.

## Ce que David décrit (2026-09-30)

Une **série** (composition : catégories × répétitions × durée) s'utilise sous plusieurs formes :

- **En classe** : questions projetées une à une (les élèves répondent sur leur cahier), minuteur,
  navigation pour revenir en arrière ; à la fin, grille des questions (pour ceux qui n'ont pas fini),
  puis grille des corrections. C'est le mode « display » de TinyMath.
- **En autonomie** :
  - **flash-cards** : carte retournable, l'élève dit s'il avait trouvé, pas de chrono ;
  - **interactif** : l'élève répond, voit la correction de ses réponses à la fin, avec un score.
- **Course aux nombres** : toutes les questions affichées, espace de réponse, temps global, score.
- **Évaluation** (seulement après assignation) : forme interactive ou course aux nombres ; le score est
  enregistré comme **note**.
- Dès que l'élève donne une réponse, le **SRS est alimenté**.

## Décisions (David, 2026-09-30)

- **Q1 — Vocabulaire** : « série » = la composition ci-dessus ; l'exercice de fiche figé par une graine
  devient une **série figée** (ADR 0011). « Évaluation » = série assignée, réponses enregistrées,
  vérifiées, notées. → `CONTEXT.md`.
- **Q2 — Note** : les évaluations sont corrigées **par le serveur** ; ailleurs, correction dans le
  navigateur inchangée. → [ADR 0015](../../adr/0015-evaluation-notee-correction-serveur.md) (restreint
  l'ADR 0001).
- **Q3 — En classe, retour en arrière** : revenir sur une question déjà passée **met le minuteur en
  pause** ; on relance avec Espace.
- **Q4 — Flash-cards en autonomie** : deux boutons « J'avais trouvé » / « Je n'avais pas trouvé »
  (→ Good / Again pour FSRS), comme les cartes de cours du Quiz.

## État des lieux (mesuré le 2026-09-30)

| Forme              | TinyMath (`new-tinymath`, `automaths/assessment/+page.svelte`)                                                                                          | Chiphre aujourd'hui                                                                                                         | UbuSlides                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| En classe          | Une question à la fois, minuteur, ±5 s, Espace = pause, → = suivante ; **pas de retour arrière** (l. 281-301) ; fin : correction sur 2 colonnes + liste | Mode « Révision » (`TestDisplay`) : même principe, sans navigation manuelle ; fin « Revoir tout » / « Voir corrections »    | **Adapté** : diaporama, retour arrière, clavier, plein écran ; aucune saisie → pas de conflit MathLive |
| Flash-cards        | Retournement, ← →, **sans auto-évaluation**, sans fin, rien d'enregistré                                                                                | **Existe** dans la révision SRS (`ReviewSession` : `FlashCard` + retournement + boutons FSRS), pas branché sur une série    | Possible, intérêt faible (la révision SRS fonctionne)                                                  |
| Interactif         | Une question à la fois avec minuteur, correction + score à la fin (demi-point si forme non optimale)                                                    | Mode « Quiz » (`TestInteractive`) : enregistré et SRS si connecté ; 7 défauts vérifiés (ci-dessous)                         | **Peu adapté** : navigation à verrouiller, clavier en conflit avec la saisie MathLive                  |
| Course aux nombres | Toutes les questions, **7 min en dur**, expiration sans effet (bug)                                                                                     | `TestCourse` : temps réglable 1-60 min, fin automatique, score, SRS                                                         | **Non** : une grille, pas un diaporama                                                                 |
| Évaluation         | Panier enregistré puis assigné ; élève en interactif seulement ; **note écrite par le navigateur**                                                      | `assessments` + `assessment_assignments`, Quiz forcé ; limite de temps jamais appliquée. Prod : 1 évaluation, 0 assignation | Comme interactif / course                                                                              |

### UbuSlides (`src/lib/slides/`)

- Solide : store de navigation (52 tests verts), fragments, vue d'ensemble, transitions, pause (écran).
- Absent : défilement automatique (`autoSlide` déclaré, jamais lu), signal de fin, verrouillage de la
  navigation ; `hash: true` par défaut (URL modifiée) ; filtre clavier qui ignore `<math-field>`.
- `QuestionSlide` orphelin et en retard (QCM invalidable, correction QCM fausse, correction masquée par
  les fragments, pas de carte de cours) → à supprimer au profit de `FlashCard`.
- Créé le 2026-01-24 pour les **présentations du prof** (`docs/wip/ubuslides-progress.md`, supprimé le
  2026-02-21) ; aucune trace écrite d'un usage prévu pour les tests du panier.

### Défauts vérifiés du Quiz actuel (`TestInteractive` + page `automaths/test`)

1. Pas de seed (`generateInstance` sans graine).
2. Durées décalées quand une génération échoue ou qu'une catégorie est sautée (`instanceBaseDelays`
   reconstruit depuis le panier).
3. Limite de temps d'une évaluation (`session.timeLimit`) jamais appliquée ; `time_limit` enregistré à `null`.
4. Réponse saisie mais non validée perdue à l'expiration.
5. « Recommencer avec de nouvelles questions » rejoue les mêmes instances.
6. Visiteur non averti que rien n'est enregistré (401 silencieux).
7. Question sautée si le chrono expire dans les 300 ms qui suivent une validation.

## Décisions, tour 2 (David, 2026-09-30)

- **Q5 — Stockage** : deux tables, `series` (la composition) et `evaluations` (l'assignation d'une
  série : forme, réglages, dates, destinataires) ; le panier devient un brouillon de série. Migration à
  venir : question d'accès posée à David AVANT tout SQL.
- **Q6 — Tirage en évaluation** : propre à chaque élève, graine enregistrée (le serveur régénère la
  copie de l'élève pour la corriger, ADR 0015).
- **Q7 — Noms des formes** : **En classe**, **Flash-cards**, **Entraînement**, **Course aux nombres** ;
  « Mode Révision » et « Quiz » bannis pour ces formes. Automaths redéfini (catalogue où l'on compose une
  série) : « Entraînement » y avait un autre sens. → `CONTEXT.md`.
- **Q8 — Ordre des chantiers** :
  1. En classe sur UbuSlides ;
  2. Flash-cards d'une série (réutiliser la révision SRS) ;
  3. Entraînement : corriger les 7 défauts ;
  4. Séparation `series` / `evaluations` ;
  5. Évaluation notée, correction serveur.

## Chantier 1 — « En classe » sur UbuSlides (spécification validée par David, 2026-09-30)

- Une question par diapositive : `FlashCard` en lecture seule, en grand, **sans bouton de retournement**
  (Q9 : la réponse n'est pas montrée à la classe ; corrections dans la grille de fin).
- Minuteur par question = durée de sa catégorie (20 s par défaut) ; à zéro, diapositive suivante.
- Espace = pause / reprise ; ±5 s sur la question en cours et les suivantes de la même catégorie
  (minimum 5 s), sans remettre le compteur à zéro.
- Navigation ← / →, flèches à l'écran, geste. Revenir sur une question déjà passée = pause (Q3) ;
  revenir sur la question la plus avancée = reprise de son temps restant ; avancer vers une question
  jamais vue = son minuteur démarre.
- Fin : grille des questions, puis (bouton) grille des corrections ; aller-retour possible.
  « Recommencer » tire de nouvelles questions.
- Chaque question porte sa propre durée (plus de décalage si une génération échoue).
- **Plein écran** réel (Q10). Rien n'est enregistré, pas de SRS.
- **Minuteur dans UbuSlides** (Q11) : `config.autoSlide` (défaut du diaporama) et `Slide.autoSlide`
  (par diapositive, prioritaire), réactif ; pause (`store.paused`) qui gèle le compte ; signal de fin.

### Tâches

| #   | Tâche                                                                                                                                  | Qui                                     | État              |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ----------------- |
| 1   | UbuSlides : minuteur par diapositive, pause, durée modifiable fait (#550), signal de fin, `hash` désactivable, filtre clavier MathLive | `svelte-expert` (Opus)                  | fait (#550)       |
| 2   | Composant « En classe » : diaporama de flash-cards, règle de la question courante, grilles de fin                                      | `frontend-developer` (Opus)             | fait (#551)       |
| 3   | Branchement de la page, durée par question, suppression de `QuestionSlide`                                                             | session principale                      | fait (#551)       |
| 4   | Relecture + accessibilité                                                                                                              | `code-reviewer`, `accessibility-tester` | fait (#550, #551) |

### Tâche 1 livrée (#550, 2026-09-30)

API UbuSlides : `Slide.autoSlide` (ms, prioritaire sur `config.autoSlide`, réactive) ; `Deck` : `onend`,
`overlay` (snippet qui reçoit le `DeckContext`), `config.pauseOverlay` (false = pause sans écran noir) ;
`DeckContext` : `isPaused/pause/resume/togglePause`, `getAutoSlideRemaining/getAutoSlideDuration/
isAutoSlideRunning`, `toggleFullscreen/isFullscreen` ; touche `f`. Retour MANUEL sur une diapositive
terminée = pause ; avance AUTOMATIQUE sur une diapositive terminée = rejouée à durée complète (choix
de Claude, à confirmer par David). Touches combinées Cmd/Ctrl/Alt laissées au navigateur.

### Chantier 1 livré (#551, 2026-09-30)

`ClassroomSeries` (forme « En classe ») remplace `TestDisplay` ; `QuestionSlide` supprimé ;
`buildSeriesItems` (`src/lib/questions/series-items.ts`) donne à chaque question sa durée et sa
catégorie. Grilles de fin en flash-cards (verso pour les corrections), hauteur `TILE_CARD_HEIGHT`.
Raccourcir une question en cours lui laisse au moins 1 s. Choix de l'agent à confirmer par David :
les durées ajustées au ±5 s survivent à « Recommencer ».

### Faits en route (#552, 2026-09-30)

- `CorrectionCard` : la « Réponse correcte » montre la réponse attendue de chaque case (formule si
  mathématique) et le contenu des bons choix d'un QCM (fini l'« undefined »).
- Formes renommées dans l'interface : « En classe », « Entraînement » (fenêtre de choix, en-tête,
  résultats) ; descriptions conformes au comportement réel.

## Chantier 2 — Flash-cards d'une série (spécification validée par David, 2026-09-30)

- Nouvelle forme « Flash-cards » dans la fenêtre de choix du panier.
- Une carte à la fois (recto) ; le retournement montre le verso allégé ; après retournement
  seulement, « J'avais trouvé » / « Je n'avais pas trouvé » (→ Good / Again FSRS, Q4) ; clic = carte
  suivante. Carte de cours : même principe.
- Fin : « k cartes trouvées sur n », « Revoir celles que je n'avais pas trouvées », « Recommencer avec
  de nouvelles questions » (Q15).
- **Q12 — option A** : nouvelle valeur `flash` pour `test_sessions.mode` (migration additive) ; même
  sauvegarde que l'Entraînement (séance, réponses, FSRS, tentatives). Question d'accès posée à David le
  2026-09-30, réponse attendue avant tout SQL.
- **Q13** : sans UbuSlides (enchaînement simple réutilisant `FlashCard`, comme la révision SRS).
- **Q14** : visiteur non connecté → utilisable, message visible « Connecte-toi pour que tes réponses
  comptent dans tes révisions ».

### Chantier 2 — migration livrée (#553, appliquée en production le 2026-09-30)

- `test_sessions.mode` accepte `flash` ; contrainte `test_sessions_flash_sans_assignation` : une
  séance flash (score auto-évalué) n'est jamais rattachée à une évaluation. Vérifié en production
  (`pg_constraint`). `db:types` : aucun changement.
- Reste : PR du code (forme Flash-cards, sauvegarde `mode: 'flash'`, tentatives `student_self`).

### Risques existants relevés par l'audit (à fermer avec l'ADR 0015, évaluations notées)

- Policy UPDATE élève sur `test_sessions` sans `WITH CHECK` ni restriction de colonnes : l'élève peut
  réécrire `score`, `assignment_id`, `completed_at`, `mode` de ses propres séances (PostgREST direct).
- Policy INSERT élève : ne vérifie que `user_id` ; insertion directe possible avec n'importe quel
  score / `assignment_id`, sans passer par `/api/tests/save`.
- `GRANT ALL … TO anon` sur la table (fermé par la RLS, à révoquer par défense en profondeur).

### Chantier 2 — code (branche `feat/serie-flash-cards`, non poussée)

- API : `mode: 'flash'` accepté ; `flash` + `assignmentId` → 400 (refine Zod) ; tentatives
  `student_self` ; FSRS Good/Again par `isCorrect` ; pas d'XP.
- `FlashSeries.svelte` (carte, boutons après retournement, bilan, revoir les ratées sans
  resauvegarde, message visiteur) ; 4ᵉ forme dans `TestModeDialog` ; page branchée.
- À vérifier à la main : parcours réel sur le serveur de dev (non fait par l'agent).

### Chantier 2 livré (#554, 2026-09-30)

Forme « Flash-cards » en production : `FlashSeries`, sauvegarde `mode: 'flash'` (jamais d'évaluation,
tentatives `student_self`, pas d'XP), focus clavier, visiteur averti et pas d'appel de sauvegarde.
Décisions Q16-Q17 : « le meilleur résultat du jour » pour toute auto-évaluation (flash-cards ET cartes
de cours, dans `tests/save` et `skill-attempts`), FSRS seulement, traces intactes → ADR 0016.

### Suite (ordre Q8)

3. Entraînement : corriger les 7 défauts (liste plus haut).
4. Séparation `series` / `evaluations`.
5. Évaluation notée, correction serveur (ADR 0015) + fermer les policies INSERT/UPDATE élève.

## Chantier 3 — Entraînement (spécification validée par David, 2026-09-30)

- Durée par question portée par la question (comme « En classe ») ; plus de question sautée si le chrono
  expire dans les 300 ms après une validation ; « Recommencer » tire de nouvelles questions ; visiteur
  averti, pas d'appel de sauvegarde.
- **Q18** : à l'expiration du chrono d'une question, ce qui est tapé est validé automatiquement (rien
  tapé → fausse, comme avant).
- **Q19** : PAS de chrono global (refus de David). La limite de temps d'une évaluation reste sans effet.
- **Q20** : une graine tirée et enregistrée par question (prépare la correction serveur, ADR 0015).
- **Q21** (David, 2026-09-30) : la limite de temps ne concerne que la **Course aux nombres**. Une
  évaluation étant aujourd'hui toujours en Entraînement, le champ « Temps limite total » est retiré du
  formulaire (colonne gardée). Chantier 4 : il revient, affiché seulement pour une évaluation en Course
  aux nombres.

### Chantier 3 livré (#555, 2026-09-30)

Durée par question, une seule avance par question, Recommencer = nouvelles questions, visiteur averti,
réponse tapée validée à l'expiration (Q18, vérifié au vrai clavier MathLive), champ « Temps limite »
retiré du formulaire d'évaluation (Q21). **Q20 (graine par question) retirée** : voir ci-dessous.

### Générateur à graine : défauts mesurés (2026-09-30, étude en lecture seule)

- Le tirage avec graine est recalculé depuis la graine seule (`variable-resolver.ts:627`, et
  `frac(10000·sin(seed))` dans `src/lib/utils/random.ts:66`) : tous les tirages qui reçoivent la même
  graine sont égaux. Chaque variable reçoit `seed + i*7919` → 0 modèle relu dégénéré entre variables ;
  0 tirage en ligne multiple.
- **Défaut réel** : 22 modèles tirent dans une liste avec plages (`1..9|11..15|25|…`) ; avec graine,
  l'indice de branche et la valeur sont corrélés → 1/2 à 2/3 des valeurs n'apparaissent jamais (ex.
  entiers/77 « Trouver le double » : 9 valeurs au lieu de 19 ; entiers/142 : 9 au lieu de 22).
- **Touché en production** : révision SRS des élèves (graine aléatoire à chaque révision,
  `src/lib/srs/generator.ts:32`), aperçus à `PREVIEW_SEED` (Automaths, panier, création d'évaluation :
  en plus, tous les QCM de même taille ont la bonne réponse à la même place), aperçu admin.
- Graine 0 non reproductible (`seed ? … : undefined`, `random-generator.ts:258`).
- Fiches figées (ADR 0011) : texte figé en base, non touché ; seule une relance de
  `scripts/create-automatismes-evolutions-1spe.ts` changerait les valeurs.
- Correctif proposé : un seul générateur pseudo-aléatoire (mulberry32) initialisé par la graine et
  consommé dans l'ordre pendant toute l'instance ; `seed !== undefined`. Décision de David attendue.

### Pour le chantier 5 (audit sécurité de #555)

- `max_attempts` d'une évaluation non contrôlé côté serveur (`/api/tests/save` insère sans compter).
- La graine archivée viendrait du client : pour une évaluation notée, le serveur doit la tirer et la garder.

### Générateur corrigé (#557) et carte d'Entraînement allégée (#556), 2026-09-30

- `createRandomSource(seed?)` (`src/lib/utils/random.ts`, mulberry32) : UNE source par instance,
  consommée dans l'ordre (variation, variables, conditions, énoncé, cases, choix, corrigé, couleurs) ;
  graine 0 valide ; exercices alignés (variation tirée dans la source, plus de cycle `seed % n`).
  Corpus relu : reproductibilité à graine 486 échecs → 0. `floatToRational` : tout entier flottant reste
  un entier exact.
- Effet : pour une même graine, les valeurs changent (aperçus, 14 `worksheet_error_reports` rejoués) ;
  aucun exercice `per_student`/`per_group` en base (315 `on_demand`) ; fiches en base inchangées.
- `QuestionCard` allégée : ni titre, ni badge, ni « Énoncé » / « Votre réponse », ni encadré ; énoncé
  d'une question à trous affiché une seule fois.
- **Q20 rebranchée (#558)** : graine par question dans les séries, archivée dans
  `test_answers.question_instance.seed` ; encore tirée par le client (le serveur la tirera au chantier 5).

## Chantier 4 — séparation `series` / `evaluations` (décisions de David, 2026-09-30)

État mesuré en prod : 1 évaluation (`assessments`, publiée), 0 assignation, 1 session de test.

- **Q22 — Accès** (question d'accès tranchée) : aucun accès nouveau. Série : prof + admin ; un élève
  ne la lit que si une évaluation PUBLIÉE qui l'utilise lui est assignée. Évaluation : prof + admin ;
  l'élève ne lit que les siennes, publiées. Les élèves ne créent ni série ni évaluation (panier local).
- **Q22 bis — Série à travailler sans compte** : **(a)** lien qui porte la composition dans l'URL
  (`/automaths/test?categories=…`, comme TinyMath et comme aujourd'hui) ; bouton « Copier le lien »
  sur le panier et sur chaque série ; le lien ouvre le choix de la forme. Pas de lien court vers une
  série en base (aurait ouvert la lecture à quiconque a le lien).
- **Q23** : une série peut servir à plusieurs évaluations.
- **Q24** : une série est **verrouillée** dès qu'un élève a commencé une évaluation qui l'utilise ;
  pour la changer, on la duplique.
- **Q25** : série = titre, description, niveau, catégories ; évaluation = série, forme (Entraînement
  | Course aux nombres), temps limite (Course seulement), tentatives, date limite, ordre aléatoire,
  période, statut, destinataires. Pas de statut sur la série.
- **Q26** : l'élève peut passer une évaluation en Course aux nombres, temps limite appliqué. Note et
  correction serveur : chantier 5.
- **Q27** : page « Séries » (enregistrer le panier, modifier, dupliquer, « Créer une évaluation ») ;
  page « Évaluations » = les évaluations seules.
- **Q28** : étape 1 additive (nouvelles tables, recopie de l'existant, bascule du code) ; étape 2 =
  suppression des anciennes tables dans une PR à part, arrêt obligatoire et explication à David.
- **Q29** : cahier de texte (`journal_entry_activities`) et tâches d'évaluation (`evaluation_tasks`)
  pointent vers l'**évaluation**.
- **Q30** : Course aux nombres → temps limite obligatoire, 1 à 60 min, 7 min par défaut ; Entraînement
  → aucun temps limite.
- **Q31** : une série utilisée par une évaluation ne se supprime pas.
- **Spécification des tests validée** (A1-A10 base, B11-B16 serveur, C17-C21 écrans ; message du
  2026-09-30). Livraison : PR 1 migration + intégration (`supabase-expert`, `security-auditor`,
  `db:migrate`, `db:types`) → PR 2 code (`fullstack-developer`, `code-reviewer`) → PR 3 DROP (arrêt).

### Chantier 4 — PR 1 livrée (#559, 2026-09-30)

Migration `20260930130000_series_evaluations.sql` fusionnée et **appliquée en production** (`db:migrate`) ;
32 tests d'intégration (rouges sans la migration, clauses neutralisées une à une) ; `security-auditor` :
0 bloquant, 2 importants corrigés (recopie limitée aux destinataires ; suppression d'un profil prof
propriétaire d'une série verrouillée = refusée, assumé, procédure dans l'en-tête). Prod après recopie :
1 série, 1 évaluation (Entraînement, publiée, `legacy_assessment_id`), 0 assignation, aucun droit anon.
Types régénérés en tête de la branche de la PR 2 (`feat/series-evaluations-code`,
worktree `../ubumaths-wt-series-code`) ; PR 2 (bascule du code) en cours.

### Chantier 4, PR 2 — bascule du code (branche `feat/series-evaluations-code`)

- Code sur `series` / `evaluations` / `evaluation_assignments` ; plus aucune lecture ni écriture de
  `assessments` / `assessment_assignments` dans `src/` (hors `database.ts` généré).
- Page « Séries » (`/dashboard/teacher/series` : verrou, Modifier, Dupliquer, Supprimer, Copier le
  lien, Créer une évaluation) ; panier : « Enregistrer comme série » (prof/admin), « Copier le lien ».
- Évaluation créée depuis une série (`/dashboard/teacher/assessments/new?series=<id>`), forme
  Entraînement | Course aux nombres, temps limite 1-60 min (7 par défaut).
- `/api/tests/save` : `evaluation_id` (forme imposée, aperçu du prof jamais rattaché) ;
  `/api/evaluations/assignments/[id]/start` remplace `/api/assessments/**` (supprimées).
- Couverture du cahier : `assessment_curriculum_points()` remplacée par un calcul TypeScript
  (`evaluationCurriculumPoints`), qui accepte aussi un ancien id d'assessment cité dans un texte.
- Vue SQL `resources` migrée à part (#560, en production). Reste pour la PR 3 (DROP) : fonctions
  `assessment_curriculum_points`, `get_assessment_results_for_*`, vue `assessment_results`,
  statistiques admin (`total_assessments`), colonnes `assessment_id` / `assignment_id`.

### Chantier 4 — PR 2 livrée (#561) et recherche du cahier (#560), 2026-09-30

Code basculé sur `series` / `evaluations` / `evaluation_assignments` (fusionné) ; vue `resources`
migrée et appliquée en production (#560). Revues : `code-reviewer` (1 bloquant — « Recommencer » pendant
une évaluation — corrigé) et `security-auditor` (sauvegarde : destinataire, forme, composition, date
limite et tentatives vérifiés avant écriture). `svelte-autofixer` non passé (MCP indisponible).
Test statistique `vip-card-rarity-distribution` instable en CI (168 < 170), relancé : vert.
Reste : PR 3 (suppression des anciennes tables, arrêt et explication à David), puis chantier 5.

### Chantier 4 terminé (#562, #563, #564), 2026-09-30

- **#562** : anciennes tables `assessments` / `assessment_assignments`, vue `assessment_results`, 9
  fonctions et 3 colonnes supprimées ; garde-fous (la migration échoue si une donnée n'est pas
  recopiée, 6 cas testés). **Appliquée en production** et vérifiée. Leçon : le seed
  `dev_question_demo.sql` écrivait encore dans `assessments` — invisible sur une base locale jamais
  recréée, révélé par la CI sur base neuve (et reproduit sur une 2ᵉ pile locale, ports 553xx).
- **#563** : images Docker de Supabase gardées en cache dans la CI d'intégration (quota
  `toomanyrequests` des registres) ; le run planifié sur `main` remplit le cache.
- **#564** : types régénérés.
- Tests instables vus en route : `vip-card-rarity-distribution` (seuil statistique),
  `chapter-worksheet-publish-distributes` (1 échec sur 6 en local).

## Chantier 5 — évaluation notée, correction serveur (questions posées à David, 2026-09-30)

Q32 (le serveur tire les questions, énoncés sans réponse), Q33 (tentative comptée au démarrage),
Q34 (reprise de la même tentative), Q35 (barème, note sur 20), Q36 (meilleure note), Q37 (temps
limite + 30 s, date limite), Q38 (question d'accès en miroir : plus d'écriture directe élève sur les
séances d'évaluation), Q39 (verdict serveur → SRS). Réponses attendues.

**Décisions de David (2026-09-30)** : Q32, Q33, Q36, Q37, Q38, Q39 validées telles que recommandées :

- Q32 : le serveur tire les questions (modèle + graine) ; le navigateur reçoit les énoncés sans réponse
  attendue ni correction ; corrections renvoyées après l'envoi.
- Q33 : une tentative compte dès son démarrage (enregistrée par le serveur).
- Q36 : plusieurs tentatives → la **meilleure** note.
- Q37 : Course → réponses envoyées après temps limite + 30 s ignorées ; tentative commencée avant la date
  limite peut finir après.
- Q38 (question d'accès, miroir) : pour une évaluation, plus aucune écriture directe élève (séances,
  réponses) — tout passe par le serveur ; la modification directe de ses propres séances disparaît pour
  tous (à vérifier sur les données avant SQL) ; entraînement libre, course libre, flash-cards inchangés ;
  le prof voit toujours séances et réponses de ses élèves.
- Q39 : le verdict du serveur alimente le SRS pour une évaluation.
- Q34 (reprise de la même tentative) et Q35 (barème TinyMath : 1 point, ½ forme non optimale ou oubli
  partiel ≤ moitié des cases, 0 si une case fausse ; QCM incomplet sans erreur = ½ ; note /20 au
  demi-point) : **validées par David** (réponses déjà tapées non gardées au rechargement).
- **Spécification des tests du chantier 5 validée par David** (2026-09-30) : A1-A5 barème, B6-B9
  démarrage, C10-C14 envoi/correction, D15-D18 base (dont : graines illisibles par l'élève), E19-E21
  écrans. Livraison : PR A migration (`supabase-expert`, `security-auditor`, `db:migrate`, `db:types`)
  → PR B code (`fullstack-developer`, `code-reviewer`, `security-auditor`).

### Chantier 5 — PR A (base), branche `feat/evaluation-tentatives-db`

Migration `20260930160000_evaluation_tentatives.sql` (appliquée en LOCAL seulement) : table
`evaluation_attempt_questions` (service_role seul, D18), `test_sessions.grade` / `points_earned`,
`test_answers.points` / `status` ; Q38 : restrictives INSERT (`evaluation_id IS NULL` sur les séances,
séance parente libre sur les réponses), policy UPDATE « Users can update own test sessions » supprimée.
Tests `tests/integration/evaluation-tentatives.test.ts` (29) ; 4 fichiers de tests adaptés (séances
d'évaluation posées par le service). ⚠️ Tant que la PR B n'est pas livrée, `/api/tests/save` ne peut plus
enregistrer une séance d'évaluation (client de l'élève) : migrer la prod avec la PR B, ou accepter
l'intervalle (0 assignation en prod). Reste : `security-auditor`, `db:migrate`, `db:types`.

### Chantier 5 — PR B (code), branche `feat/evaluation-notee-serveur`

Livré (commits 83361daae → fin de branche), tests d'abord à chaque lot :

- **A (barème)** `src/lib/questions/grading.ts` : statut PAR CASE via `blankStatuses`
  (nouvel export de `answer-validator.ts`, même chaîne que `validateAnswer`, aucun verdict
  existant modifié ; `orderIndependent` : un statut par réponse après appariement) ; QCM par
  indices d'origine ; note /20 arrondie par le code (`roundToHalfPoint`).
- **B (démarrage)** `src/lib/server/evaluation-attempts.ts` + route `start` : tirage par
  `drawSeriesQuestions` (même règle que `buildSeriesItems`, cartes exclues), graines crypto,
  séance + graines en service_role après vérification sous RLS ; reprise de la tentative en
  cours (la plus ancienne si double démarrage) ; questions publiques en LISTE BLANCHE
  (`src/lib/questions/public-question.ts`) : ni `templateId`, ni graine, ni réponse.
- **C (envoi)** route `POST /api/evaluations/attempts/[id]/submit` (Zod borné) : régénère,
  corrige, écrit réponses (`is_correct` = tous les points) puis clôt la séance sous condition
  `completed_at IS NULL` (envoi concurrent → 409, réponses retirées) ; `score` = note/2 ;
  Course + 30 s → note 0 sans réponse ; SRS par `recordSeriesReviews` (extrait de
  `/api/tests/save`, révision ordinaire, pas de meilleur-du-jour). `/api/tests/save` refuse
  toute assignation (400) ; `evaluation-session.ts` supprimé.
- **Modèle déjà servi** : suppression → 409 (23503, et 23514 dès qu'une trace SRS existe :
  `skill_attempts.template_id` → NULL refusé par `chk_attempt_regime`, mesuré).
- **D** `tests/integration/evaluation-notee-serveur.test.ts` (21 tests, vrais modèles #314/#142).
- **E** page `/automaths/test` (aucun modèle chargé en évaluation, `collectOnly`, envoi +
  réessai), `EvaluationResults`, `EvaluationResultsTable` (prof), meilleure note dans « Mes
  évaluations », résultats élève et boîte de réception.

### Chantier 5 — PR A livrée (#565), 2026-10-01

Migration `20260930160000_evaluation_tentatives.sql` fusionnée et **appliquée en production** :
table `evaluation_attempt_questions` (graines, service_role seul), colonnes `grade`, `points_earned`,
`points`, `status` ; restrictives INSERT (séances et réponses d'évaluation, verdict/note client
interdits) ; policy UPDATE supprimée. Vérifié en prod : 7 policies attendues, graines illisibles
(authenticated/anon). ⚠️ L'envoi d'une évaluation échoue jusqu'au déploiement de la PR B (0
assignation en prod). PR B (code) en cours : branche `feat/evaluation-notee-serveur`, worktree
`../ubumaths-wt-eval-code`, types régénérés en premier commit.

- **Q40 (David, 2026-10-01)** — SRS après une évaluation : une réponse en forme non optimale (½ point
  dans la note) compte « Bien » pour la révision, comme en entraînement libre. La note juge la forme, la
  révision juge la connaissance.
  Précisée par David (choix a) : un ½ point dû à des cases en partie vides ou à un QCM coché en partie
  vaut « À revoir » pour le SRS ; seule une vraie forme non optimale vaut « Bien ».
- **Q41 (David, 2026-10-01)** — risque ACCEPTÉ : modèles publiés et générateur étant dans le navigateur
  (entraînement libre, ADR 0001), un élève qui programme peut retrouver par essais la graine qui redonne
  son énoncé, donc la réponse attendue d'une évaluation. Fermer ce risque imposerait la correction serveur
  partout (écartée par 0001 et 0015). Pas d'ADR (décision réversible) ; commentaire dans
  `public-question.ts`. À rouvrir si l'enjeu d'une note change.
- **Q42 (David, 2026-10-01)** — la question vue par l'élève est FIGÉE au démarrage : l'instance complète
  est enregistrée dans `evaluation_attempt_questions` (service_role seul) ; reprise et correction s'en
  servent, un modèle modifié entre-temps ne change rien à la tentative. Petite migration additive avant
  la PR B.

- QCM : correctif #567 (positions affichées ↔ indices d'origine, bug en prod sans donnée touchée) ;
  l'évaluation range et renvoie des indices d'origine.
- ⚠️ Vercel : quota quotidien de déploiements épuisé le 2026-09-30 (pushes sur `main`, docs compris, et
  aperçus de PR) — production restée sur #562 ; PR B à déployer dès que le quota se libère.

### Chantier 5 terminé (#565, #566, #567, #568, #569), en production le 2026-10-01

- **#568** : évaluation tirée, corrigée et notée par le serveur (Q32-Q42) ; revues `code-reviewer` ×2 et
  `security-auditor`, tous bloquants corrigés ; suite d'intégration complète verte (129 fichiers).
- **#567** : QCM mélangés corrigés sur la position affichée (bug en prod, aucune réponse d'élève touchée).
- **#569** : plus d'aperçu Vercel pour les branches (quota quotidien épuisé le 2026-09-30).
- Déploiement de production vérifié (`e46065486`) : `/automaths` 200, route de démarrage présente,
  ancienne API `/api/assessments` absente. L'envoi d'une évaluation refonctionne en production.
- Restes, sans urgence : page « Assigner » encore sur la case à cocher Shadcn directe ; doublon
  `src/lib/questions/generator/random-generator.ts` (suppression non tranchée par David) ; deux tests
  instables (`vip-card-rarity-distribution`, `chapter-worksheet-publish-distributes`) ;
  `svelte-autofixer` jamais passé sur les `.svelte` des chantiers 4-5 (MCP indisponible).

### Restes du chantier 5 traités (#570, #571), 2026-10-01

- **#570** : `MyCheckbox` sur la page « Assigner » (case Shadcn imbriquée dans un bouton) ;
  `svelte-autofixer` passé en CLI (`npx @sveltejs/mcp svelte-autofixer <fichier>`) sur les 28 `.svelte`
  des chantiers 4-5 — seul « goto() sans resolve() », règle désactivée par le projet ;
  `src/lib/questions/generator/random-generator.ts` supprimé (aucun import) ; test VIP à ±4,5 σ.
- **#571** (Q43 = A) : le test instable `chapter-worksheet-publish-distributes` révélait un défaut de
  prod — `published_at` écrit à l'horloge de Node, comparé à `now()` de Postgres. Trigger
  `published_at_horloge_base` sur 5 tables (appliqué en prod, vérifié) ; filtres `lte.now` / `gt.now`
  évalués par la base (fiches distribuées, boîte de réception, notifications). Déployé.

### Lien de série avec forme (Q44-Q46), branche `feat/lien-serie-forme`, 2026-10-01

Décisions de David (remplacent Q22 bis) :

- **Q44** — à côté de « Copier le lien », un menu (MySelect) choisit la forme du lien : « Sans forme
  (ouvre le panier) » (défaut), « En classe », « Entraînement », « Course aux nombres » (temps limite
  en minutes, 5 par défaut, 1 à 60 — les réglages de la fenêtre du panier), « Flash-cards ». Avec une
  forme → `/automaths/test?categories=…&mode=…[&time=…]` (démarrage direct) ; sans forme →
  `/automaths/panier?categories=…`.
- **Q45** — panier ouvert par un lien : panier vide → série chargée ; non vide → « Remplacer ton panier
  par cette série ? » Remplacer / Ajouter (fusion, 99 au plus par catégorie, la durée déjà en place est
  gardée) / Annuler (fermer = Annuler). Puis `categories` retiré de l'URL (`replaceState`). Lien abîmé →
  message, panier inchangé.
- **Q46** — même menu sur la page « Séries » ; `/automaths/test?categories=…` SANS `mode` redirige
  (307, dans le `load` serveur ; filet `goto` côté client) vers le panier, paramètre intact. Plus de
  fenêtre de choix de forme pour un lien.

Livré : `buildSeriesLink(origin, categories, form?)` (`$lib/validation/series`), `resolveTestLaunch`
(`kind: 'cart'` remplace `choose-form`), `questionCart.replaceWith` / `mergeItems`, composant partagé
`src/lib/components/series/SeriesLinkShare.svelte` (panier + page « Séries »). Tests rouges d'abord
(10 unitaires, 13 navigateur), puis verts.

- Écart : la fusion « Ajouter » ne plafonne pas le NOMBRE de catégories (le panier n'en a pas) ; un
  panier de plus de 50 catégories donne un lien que le destinataire verra refusé (« 50 au plus »).
