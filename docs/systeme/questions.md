---
couvre:
  - 'src/lib/questions/**'
  - 'src/lib/exercises/**'
  - src/lib/validation/series.ts
  - src/lib/srs/generator.ts
  - src/lib/utils/answer-validator.ts
  - src/lib/mathAST/cosmetic-transforms.ts
  - 'src/lib/questions/review/**'
  - 'src/lib/types/{question-display,question-template}.ts'
  - 'src/lib/server/{evaluation-attempts,questions-bulk-status,template-publication,template-fact-sheet,grading-budget,corrected-detail,template-review,point-bounds,classification-node-error,classification-nodes}.ts'
  - 'src/routes/(protected)/dev/modeles/**'
  - src/lib/components/MathKeyboardClose.svelte
  - 'src/lib/components/dev/**'
  - scripts/questions/reprise-verdicts.ts
  - src/lib/server/exercise-search-indexed.ts
  - src/lib/server/validation/questions.ts
  - 'src/lib/components/questions/**'
  - 'src/lib/components/question-inputs/**'
  - src/lib/components/markdown/nodes/BlankInput.svelte
  - 'src/lib/components/{QuestionTemplateForm,SharedFieldsEditor,ChoiceCaseEditor}.svelte'
  - 'src/lib/components/{QuestionTemplateCard,QuestionPreview*,QuestionCategoryFields,QuestionTemplateHelpDialogs,CategorySelector,CartFloatingButton,CartQuestionCard,DisplayOptionsEditor,ValidationOptionsEditor,PrecisionEditor,VariableEditor,AnswerEditor,CourseQuestionToggle}.svelte'
  - 'src/lib/stores/{questionCart,questionCategories,questionTemplates}.svelte.ts'
  - src/lib/components/exercises/VariationEditor.svelte
  - 'src/routes/api/questions/**'
  - 'src/routes/(protected)/dashboard/admin/questions/**'
  - 'src/routes/(protected)/dashboard/teacher/series/**'
  - 'src/routes/(public)/automaths/**'
---

# Questions, exercices de fiche, validation des réponses

> Première doc de référence du module ; le savoir était éparpillé dans les journaux de
> [`archive/wip/`](../archive/wip/) (cités ici pour le **pourquoi**, jamais pour le code).
> Vérifié contre le code le 2026-10-11 ; étape 4 des cases à unité le 2026-10-21, attendu en h-min-s et dans l'unité imposée le 2026-11-03 ; QCM et vecteurs le 2026-10-22 ; QCM retiré (case choix seule) le 2026-10-28 ; espaces de groupement le 2026-10-23 ; fiche du modèle le 2026-10-23 ; forme de la réponse finale demandée (`finalForm`) le 2026-10-24 ; étapes des équations écrites comme la réponse (lot 5f-4) le 2026-10-25 ; case d'un bloc `operation le 2026-10-25 (multiplication à remplir, PR 2b, et division à remplir, PR 3b, le même jour) ; étapes des inéquations (Q50) le 2026-10-25 ; case « figure » (bloc `construction, moteur) le 2026-10-25, symétrique le 2026-11-02, instruments sur papier uni le 2026-11-02, droite à construire (médiatrice) et milieu sur papier uni le 2026-11-02, bissectrice le 2026-11-06, cercle circonscrit le 2026-11-02, cercle de centre donné le 2026-11-08, triangle de trois longueurs, report et 4e sommet le 2026-11-03, point construit de proche en proche le 2026-11-03, angle à mesurer (`mesure AOB`) le 2026-11-03, rapporteur déjà posé le 2026-11-04, triangle par un côté et deux angles ou deux côtés et l'angle compris (côté d'angle) le 2026-11-03, triangle rectangle (équerre, quadrillage) le 2026-11-08, segment de longueur donnée à la règle graduée le 2026-11-08 ; copie corrigée d'une case « figure » le 2026-10-25 ; figure construite à chaque tirage (`checkTemplate`) le 2026-10-26 ; case d'un bloc `collection à construire le 2026-10-26 ; d'un bloc `monnaie à construire le 2026-10-26 ; figure de travail (bloc ``figure-de-travail, `graded-part.ts`) le 2026-10-26 ; droite à placer (``line, `placer:`) le 2026-10-26, à plusieurs points le 2026-10-27 ; horloge à placer (``horloge, `placer:`) le 2026-10-27, trotteuse le 2026-11-01 ; diagramme en barres à construire (``barres, `placer:`) le 2026-10-28, réponse d'une monnaie à centimes (`3,45`) le 2026-11-01, échelle à choisir le 2026-10-29 ; étiquettes à ranger (`ranger) le 2026-10-28 ; repère à placer (``courbe, `placer:`) le 2026-11-01, droite à tracer (``courbe, `tracer:`) le 2026-11-02, vecteur à tracer (``courbe, `tracer: vecteur`) le 2026-11-03, somme à tracer (`tracer: vecteur u + v`) le 2026-11-08 ; cercle trigonométrique à placer (``trig, `placer:`) le 2026-11-02 ; droite à représenter (``line, `representer:`) le 2026-11-03, réponse incomplète bloquée le 2026-11-03 ; assemblage de cubes dans un choix (`--espace-taille`) le 2026-10-30 ; figure à colorier (`partage, `colorier:`) le 2026-10-29, assemblage de cubes à geste (`cubes, `dessiner:`/`retrouver:`) le 2026-10-30, patron à geste (`patron, `designer:`/`completer:`) le 2026-10-30, solide à geste (`tracer: vecteur`) le 2026-11-03, plusieurs figures (`unites:`, attendue `7/4`) le 2026-10-29 ; texte d'aide des cases à écrire le 2026-10-26 ; boîte à moustaches à construire (``boite-a-moustaches, `placer:`) le 2026-11-01 ; tableau de signes à compléter (``variation à `?` : cases, juge, masquage) le 2026-11-03, sa saisie le 2026-11-03, son corrigé (ligne `sign-table`) le 2026-11-03 ; tableau de variations à compléter (valeur et flèche d'une ligne `variation:`, chantier `variations-a-completer`) le 2026-11-08.

## À quoi ça sert

Un professeur (ou l'admin) rédige des **modèles de question** paramétrés ; le moteur en tire des
**instances** (une par élève, par graine), les affiche, juge la réponse de l'élève (valeur **et**
écriture), puis montre une **correction**. Les instances alimentent les **séries** (Automaths, en
classe, flash-cards, entraînement, course aux nombres, évaluation), les paquets **SRS** et les
**fiches**.

Termes ([CONTEXT.md](../../CONTEXT.md), sections « Les questions » et « Les usages des questions ») :
modèle de question, variation, instance, case, case choix, QCM, question de cours, carte de cours, résultat
attendu, correction concise / détaillée, détail, motif de forme, série, série figée, relecture,
évaluation, tentative. ⚠️ « Publier » a trois sens (même fichier) : ici, c'est
`question_templates.status`.

Hors sujet : le moteur mathématique ([mathast/](mathast/README.md)), la notation ubumark
([notation-unites](../pratiques/notation-unites.md), [fiches-exercices](../pratiques/fiches-exercices.md)),
le SRS ([srs.md](srs.md)).

## Carte du code

### `src/lib/questions/` — le moteur des modèles (208 fichiers suivis, 118 fichiers de test)

| Fichier / dossier                                                | Rôle                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/questions/types.ts`                                     | **Le contrat** : `QuestionTemplate`, `QuestionVariation`, `SharedVariationDefaults`, `TemplateBlank`, `BlankDefaults`, `InstanceBlank`, `QuestionInstance`, `ValidationStatus`, `ConstraintId`, `RequiredForm`, `ValidationRule`, `GeneratedSteps`, `TestSpec`. Aussi `getQuestionType`, `isCourseCard`, `isCourseQuestion`, `mapDbTemplateToForm`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `src/lib/questions/template-schema.ts`                           | Schéma Zod **strict** `questionTemplateSchema` (éditeur JSON, `checkTemplate`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `src/lib/questions/index.ts`                                     | API publique (`generateInstance`, `resolveVariables`, `shuffleChoices`, `validateTemplate`, ré-export de `$lib/math`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `generator/`                                                     | Génération : `instance-generator.ts` (`generateInstance`), `variable-resolver.ts`, `condition-evaluator.ts`, `variable-conditionals.ts`, `content-resolver.ts`, `assign-blank-indices.ts`, `choice-shuffler.ts`, `correction-resolver.ts`, `correction-generator.ts` (`generateCorrection`, mode B), `test-instance-builder.ts` (variables fixées, pour les specs).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `validators/`                                                    | Structure d'un modèle : `template-validator.ts` (`validateTemplate`), `choice-answer-count.ts` (`choiceAnswerCountErrors`), `negative-substitution.ts` (`findUnparenthesizedNegatives`, avertissement).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `intervals/`, `equations/`, `vectors/`, `matrices/`, `calculus/` | Une chaîne de jugement par **nature de case** (`AnswerKind`) : `interval-answer.ts`, `equation-answer.ts`, `vector-answer.ts`, `matrix-answer.ts`, `primitive-answer.ts` + `differential-equation-answer.ts`. Les `keyboard-*.ts` sont les claviers MathLive de ces cases.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `units/`                                                         | Correction des cases à unité : `parser.ts`, `validator.ts` (`validateQuantityAnswer`), `quantity-comparison.ts` (`compareQuantities`), messages (`feedback.ts`), `student-input.ts`, calcul écrit par l'élève (`student-calculation.ts`), durées composées (`composite-duration.ts`, attendu en h-min-s de `{{eval}}` lu en une durée : `singleExpectedDuration`, 2026-11-03), touches du clavier par grandeur (`keyboard-units.ts`, octets compris depuis le 2026-10-13) — contrat : [grandeurs.md](grandeurs.md).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `combinatorics/`                                                 | Clavier du dénombrement ; la notation non calculée est jugée par `combinatorial-notation.ts`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `parser/color-parser.ts`, `colors.ts`                            | Couleurs dans les énoncés (palettes ; `colors.ts` sert aussi l'atelier).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `src/lib/questions/required-form-validator.ts`                   | `requiredForm` : `checkRequiredForm`, `requiredFormVerdict` (`ok` / `acceptable` / `violated`), `REQUIRED_FORM_FEEDBACK`. Formes complexes : `complex-forms.ts` (base de `re^{iθ}` : la constante `euler()` ; `i` : le nœud `complex(0, 1)`, lettre comme `\imaginaryI`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `src/lib/questions/validation-rule-evaluator.ts`                 | `validationRules` : `evaluateRule`, `evaluateRules`, `createEvaluationContext`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `src/lib/questions/constraint-validators.ts`                     | Ancien jeu de contrôles cosmétiques sur le LaTeX brut. **En service : `checkUnit` et `checkReducedFractions` seulement** (les anciens contrôles, morts, ont été retirés ; le jugement passe par `cosmetic-transforms.ts`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `src/lib/questions/feedback.ts`, `constraint-constants.ts`       | Messages français des contraintes (`CONSTRAINT_FEEDBACK`), libellés et modes proposés à l'éditeur (`CONSTRAINT_IDS`, `CONSTRAINT_LABELS`). Ceux des règles de superflu sont tirés de leur fiche (`mathAST/superflu/rules.ts`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Options de case                                                  | `rounding.ts` (arrondi), `rules-suffice.ts` (`rulesDecide`), `angle-modulo.ts`, `answer-variable-prefix.ts`, `answer-degree-suffix.ts`, `answer-assumptions.ts` (ADR 0012), `generic-functions.ts` (`templateGenericFunctions`), `clean-coefficients.ts` (`cleanCoefficientsAst`), `capital-pairs.ts` (sens de `AB`), `formula-reading.ts` (`readingOf`), `figure-name-check.ts` (garde auteur).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `graded-part.ts`                                                 | `gradedPart` : les cases **notées** d'une question — les figures de travail (bloc ```figure-de-travail) retirées, avec leur valeur, avant toute notation (serveur et élève) ; `spread` remet un résultat par case notée à la taille de l'instance ; `isWorkFigureBlank`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `work-figure-editor.ts`                                          | `readWorkFigureCases` : les figures de travail de l'énoncé (outil, erreurs) pour la carte en lecture seule de l'éditeur.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `construction/`                                                  | Case « figure » (bloc ```figure-a-completer) : `answer.ts` (`parseConstructionAnswer`, réponse bornée), `judge.ts` (`judgeConstruction`, positions, tout-ou-rien), `polygon.ts` (`judgePolygon`, carré / rectangle sur quadrillage), `symmetry.ts` (`judgeSymmetry`, symétrique sur quadrillage ou papier uni), `point.ts` (`judgePoints`, points à placer), `line.ts` (`judgeLines`, droites à construire), `circle.ts` (`judgeCircles`, cercles à construire), `triangle.ts` (`judgeTriangle`, triangle de trois longueurs, ou par des angles donnés, ou rectangle), `segment-length.ts` (`judgeSegmentLength`, segment de longueur donnée à la règle graduée), `instruments.ts` (équerre, compas, report, intersections, aimantation des instruments : `snapInstrument` ; graduations de la règle graduée : `rulerGraduation`, `rulerGraduationNear`), `drawing.ts` (tracé de l'écran, `snapToGrid`, `snapWithInstruments`, `solutionLines`), registre des positions `positions.ts` (`constructionPositions`, `constructionShapes`) et son inscription `positions-setup.ts` (geometry-core). |
| Sécurité de la réponse                                           | `answer-complexity.ts` (`isAnswerTooComplex`, garde Q58), `student-answer-safety.ts` (réponse rendue chez le prof).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Correction                                                       | `expected-result.ts` (`buildExpectedResult`, `fillMarkdown`), `expected-result-markdown.ts`, `correction-card-verdict.ts`, `correction-detail.ts` (`splitCorrectionDetail`, `detailedCorrection`, `correctionForPrint` pour les fiches PDF, ADR 0017), `correction-placeholders.ts`, `grade-level-to-school-level.ts` (`gradeLevelToSchoolLevel`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Case choix                                                       | `choice-case.ts` (réponse « 0;2 », positions affichées → indices d'origine), `choices.ts` (`statusFromChoices`, `choiceLetter`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Cours                                                            | `course-card.ts` (`excludeCourseCards`), `course-question.ts`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Séries et évaluations                                            | `series-items.ts` (`drawSeriesQuestions`, `buildSeriesItems`), `grading.ts` (`gradeQuestion`, `gradeOutOf20`), `public-question.ts` (`toPublicQuestion`, `toDisplayInstance`), `submission.ts`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Catalogue, éditeur, publication                                  | `catalogue.ts`, `classification-tree.ts` (chemin d'un nœud, cascade du sélecteur, filtre de liste), `cart-preview.ts`, `form-options.ts`, `template-put-body.ts`, `bulk-status.ts`, `test-spec-runner.ts` (`runAllTestSpecs`), `constants.ts` (bucket des images), `template-fact-sheet.ts` (fiche du modèle : types, réglages en mots, chemin dans l'arbre).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

### Hors du dossier

| Fichier                                                                             | Rôle                                                                                                                                                       |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/utils/answer-validator.ts`                                                 | **Le juge** : `validateAnswer`, `validateAnswerDetailed`, `validateBlanks`, `validateChoice`, `isBlankValueCorrect` (≈ 2 500 lignes).                      |
| `src/lib/mathAST/cosmetic-transforms.ts`                                            | Contrôle de forme unifié `checkForm` (importé sous le nom `checkFormUnified`) et `cosmeticViolations` : les contraintes cosmétiques réelles.               |
| `src/lib/math/index.ts`                                                             | `areEquivalent`, `evaluateExpression` : le décideur d'équivalence → [convention-equivalence](mathast/convention-equivalence.md).                           |
| `src/lib/mathAST/pedagogical-*/`                                                    | Étapes de correction générées (mode B) ; stratégies par niveau `STRATEGIES`, `STRATEGIES_QUADRATIC`, `STRATEGIES_RATIONAL` (`pedagogical-solve/types.ts`). |
| `src/lib/types/question-display.ts`, `src/lib/types/question-template.ts`           | `ValidationResult` ; `toQuestionTemplate` (ligne de base → modèle).                                                                                        |
| `src/lib/server/validation/questions.ts`                                            | Zod des routes : `createQuestionTemplateSchema`, `updateQuestionTemplateSchema`, `bulkTemplateStatusSchema`, `generateQuestionSchema`.                     |
| `src/lib/questions/review/check-template.ts`                                        | `checkTemplate` : le contrôle complet (structure, schéma strict, specs, 50 tirages par variation, figure de chaque case « figure » construite).            |
| `src/lib/server/template-publication.ts`                                            | `templatePublicationErrors` : **le** contrôle de publication, partagé par le `PUT` d'un modèle et la publication par lot.                                  |
| `src/lib/server/questions-bulk-status.ts`                                           | Publication par lot.                                                                                                                                       |
| `src/lib/server/evaluation-attempts.ts`, `grading-budget.ts`, `corrected-detail.ts` | Évaluations notées, corrigées par le serveur (ADR 0015).                                                                                                   |

### `src/lib/exercises/` — exercices de fiche (autre moteur)

Les **exercices** (table `exercises`) sont les exercices rédigés des fiches PDF, pas des modèles
de question. Ils ont leur propre générateur (`src/lib/exercises/generator/instance-generator.ts`,
syntaxe `{{}}` d'ubumark, résolue dans l'énoncé, la correction et les réponses `answers_md`), leur export Typst (`typst/exercise-typst-generator.ts`), leur import /
export validé par Zod (`validation.ts`, `markdown-frontmatter.ts` ; le format v2.0 porte aussi
`generic_functions`, `resources` et `distribution_mode`, pas le slug), la traduction
(`translation-status.ts`, `translation-draft.ts` : énoncé, correction et réponses `answers_md`), les images (`services/`) et l'avertissement
`bare-greek-warnings.ts` (`~2pi~` lu 2 × p × i). `isParameterized` (générateur) dit si un
exercice a des variables, où qu'elles soient (`shared`, niveaux de guidage, ancienne colonne
`variables`), y compris sur une ligne brute aux colonnes `null`. Démarche d'écriture : [fiches-exercices](../pratiques/fiches-exercices.md).

Visibilité (`Exercise.is_public`, `Exercise.search_indexed`) : un exercice public est lisible par
son lien (`/exercice/[slug]`) ; il n'est proposé à Google (sitemap, pas de `noindex`) que si le
professeur coche « Afficher sur Google » (`ExerciseVisibilityFields.svelte`, fenêtre d'alerte avant
de cocher). La case exige « public » : contrainte en base (23514), refine Zod, et toute écriture qui
rend un exercice privé écrit `search_indexed: false` dans la même requête
(`src/lib/server/exercise-search-indexed.ts` ; formulaire, restauration, import).

### `src/lib/validation/` — schémas partagés client / serveur

Seul `series.ts` concerne les questions : composition d'une série (`seriesItemSchema`,
`seriesItemsSchema`, `savedSeriesItemsSchema`, bornes `MAX_SERIES_ITEMS`, `MAX_ITEM_QUANTITY`,
`MAX_SERIES_QUESTIONS`, `MAX_QUESTION_DELAY_SECONDS`), relue aussi pour un lien
`/automaths/panier?modeles=…` (`buildSeriesLink`). L'ancienne forme (catégories) n'est plus relue
([evaluations.md § Les formes d'une série](evaluations.md#les-formes-dune-série)).
`shop.ts` et `marketplace.ts` relèvent de [jeux-et-economie](jeux-et-economie.md).

### Composants et routes

- Saisie : `src/lib/components/question-inputs/FillBlanksInput.svelte` (cases MathLive, claviers),
  `MultipleChoiceInput.svelte`, `src/lib/components/markdown/nodes/BlankInput.svelte` (case de texte `[_]`).
- Choix en bloc (case choix) : un choix peut être un ` ```horloge ` (« Quelle horloge indique 3 h ? ») ou
  une ` ```collection ` (« Quel dessin montre 42 ? ») ou une ` ```monnaie ` (« Quel porte-monnaie
  contient 48 € ? ») ;
  `MultipleChoiceInput` (saisie de la case choix) et `ChoiceList` (copie corrigée, bloc seul) posent
  `--horloge-taille: 3cm`, `--collection-taille: 3cm`, `--espace-taille: 3cm` (un ` ```cubes `, largeur plafonnée) et `--monnaie-taille` sur le contenu du choix (sauf `taille:` de
  l'auteur) ; la monnaie vaut 10 cm, réduits ensemble pour tous les choix si la colonne est trop étroite
  (`monnaieChoiceSize`, détail dans [ubumark.md](ubumark.md)). La
  correction (`ChoiceList`) rend un tel choix par `MarkdownRenderer` : `InlineMarkdown`
  n'en garderait que le texte brut.
- Affichage et correction : `src/lib/components/questions/` — `QuestionCard.svelte` et
  `FlashCard.svelte` (appellent `validateAnswer`), `CorrectionCard.svelte`, `CorrectionView.svelte`,
  `ExpectedResultView.svelte`, `GeneratedStepsCorrection.svelte` (étapes générées : titre et
  explication rendus par `InlineMarkdown`, formules entre `$…$` depuis V25), `CourseCardView.svelte`,
  `TestSpecEditor.svelte`.
- Éditeur : `src/lib/components/QuestionTemplateForm.svelte`, `SharedFieldsEditor.svelte`,
  `exercises/VariationEditor.svelte`. Ses sous-composants, à la racine de `src/lib/components/`
  (vérifié le 2026-10-13) : `questions/ClassificationNodePicker` (« Rangé dans » : branche →
  notion → sous-notion en cascade, trois `MySelect`, tout facultatif ; écrit
  `classification_node_id` ; l'arbre non archivé est lu par `server/classification-nodes.ts`, et
  un refus de rangement de la base devient un 400 en français par
  `server/classification-node-error.ts`), `VariableEditor`, `AnswerEditor` (cases ; une case choix a sa carte `ChoiceCaseEditor`, voir « Case choix dans l'éditeur »), `PrecisionEditor` (`none`, `decimal`, `significant`, `magnitude`, `tolerance`) — ces
  trois-là servent aussi à `SharedFieldsEditor` —, `DisplayOptionsEditor`,
  `ValidationOptionsEditor`, `CourseQuestionToggle` (`options.courseQuestion`, cochée et
  désactivée pour une carte de cours), `QuestionPreview` (instance générée, graine affichée, autre
  graine, choix de la variation, taille d'affichage) et `QuestionTemplateHelpDialogs` (sept fenêtres d'aide statiques).
- Liste admin (`dashboard/admin/questions/`) : une `QuestionTemplateCard` par modèle (badge de
  type, « Cours », niveaux ; aperçu, édition, duplication, suppression).
  Filtres par l'arbre des notions : branche, puis notion (une notion inclut ses sous-notions), ou
  « Non rangés » (`?branche=`, `?notion=`, `?nonRanges=1` ; les anciens `theme`/`domain`/`subdomain`
  sont ignorés). Chaque carte et chaque ligne dit son chemin « Branche › Notion › Sous-notion »
  (`nodePathLabel`), « Non rangé » sinon ; sans les nœuds sous la main, rien n'est affiché.
- Fiche du modèle (`components/questions/TemplateFactSheet.svelte`) : en tête de `[id]/preview`
  (complète) et de `[id]/edit` (courte : sans points ni réglages, qui s'éditent plus bas). Statut,
  type, classes, chemin dans l'arbre des notions (« (archivé) » signalé), points du programme
  posés, ou « aucun » en alerte avec sa raison (N points possibles à poser, ou aucun point de la
  plus basse classe du modèle ou d'une classe suivante sur le nœud ni sa notion), réglages de
  validation qui s'écartent du défaut, dans les mots de l'éditeur (`describeValidationSettings`).
  Lectures : `$lib/server/template-fact-sheet` (`loadTemplateFactSheet`, `buildTemplateFactSheet`),
  qui réutilise `loadNodesWithAncestors` et `loadTemplateProgrammeTags`. Sur l'aperçu, une lecture
  en échec affiche « Fiche illisible : … » et laisse l'aperçu utilisable, jamais « aucun » ;
  l'éditeur reste en 500.
- Revue des modèles (`/dev/modeles`, admin seul, chantier revue-modeles) : TOUS les modèles en base,
  rangés programme > branche > notion > sous-notion (`buildReviewTree`, `$lib/questions/template-review`).
  Le programme est le `grade` des points tagués (un modèle de deux programmes apparaît dans les deux ;
  sans point → « Hors programme » ; sans nœud → « Non rangé »). Chaque étage compte ✅ validé · 🔶 à
  revoir · ⚪ sans verdict ; filtres dans l'adresse (`verdict`, `statut`, `alertes`, `noeud`). Les fiches
  (`components/dev/TemplateReviewSheet.svelte`) ne se chargent que pour le nœud choisi, ou pour tout ce
  que les filtres retiennent, 80 au plus (`MAX_SHEETS`). Une fiche : statut, niveau, rangement, point
  et ses bornes (`docs/systeme/programmes/bornes/*.json`, intégrés au build par `$lib/server/point-bounds`),
  plages et conditions, specs, un aperçu par variation tiré dans le navigateur par `generateInstance`
  sur le modèle réduit à cette variation (`VariationPreview`, graine 7 + i, « ↻ » en tire une autre,
  rendu par `QuestionPreviewTabs`), et le verdict « validé / à revoir » + commentaire (actions
  `saveReview` / `deleteReview`, table `question_template_reviews`, admin seul, un verdict par modèle).
  Alertes : sans point, sans nœud, deux points d'un programme, point absent des bornes ou archivé,
  **modifié depuis le verdict** (`updated_at` du modèle postérieur au verdict — les migrations de
  rangement le font bouger aussi). Reprise des verdicts des anciennes pages à cocher :
  `scripts/questions/reprise-verdicts.ts` (simulation par défaut, `--ecrire`).
- Automaths : catalogue rangé dans le navigateur selon l'**arbre des notions**
  (`src/lib/questions/catalogue.ts` : `buildCatalogue`) — sélecteur de branche, onglets de notion,
  rubriques de sous-notion, dans l'ordre de l'arbre (`position`, puis nom), puis par niveau et titre.
  Les modèles posés sur la notion elle-même forment la rubrique « Général », en tête ; une branche,
  notion ou sous-notion sans modèle publié n'apparaît pas ; un modèle hors de l'arbre lu va dans
  « Non classés » (jamais perdu). La tuile ne montre plus l'ancien sous-domaine. Le panier et les
  séries désignent le **modèle** par son id (ADR 0035). Les aperçus (graine `PREVIEW_SEED`) ne sont calculés que pour la rubrique
  dépliée (`CatalogueGallery`, montée par un `{#if}` : l'accordéon et les onglets de bits-ui
  gardent le contenu fermé dans le DOM), une fois par modèle (`templatePreview`), et réutilisés par le
  panier. Avant (novembre 2026), le serveur calculait les 1 912 aperçus à chaque visite : 7 à 11 s.
  `QuestionPreviewCard` (tuile du catalogue = la flash-card, plus l'ajout au panier),
  `CartFloatingButton` (vers `/automaths/panier`), `CartQuestionCard` (tuile d'un modèle du
  panier, sous son titre : durée par pas de 5 s entre 5 et 300 s, nombre de questions ; modèle plus
  publié → « Modèle retiré », avec « Retirer du panier »).
- Stores (`src/lib/stores/`) :
  - `questionCart.svelte.ts` (`questionCart`) : le **panier**, des lignes `SeriesItem`
    (`templateId`, nombre de questions 1 à 99, durée par question) ; persistant en `localStorage`
    (`chiphre_question_cart`). `replaceWith` / `mergeItems` y chargent une série (lien de série).
    Un panier d'avant l'ADR 0035 (catégories) n'est plus relu : au chargement ses lignes sont
    retirées, le panier réécrit, et un message le dit.
  - `questionTemplates.svelte.ts` (`questionTemplatesCache`) : modèles publiés et arbre des
    notions (`nodes`, nœuds non archivés), **seule source des pages Automaths** (catalogue, panier, `test`) — leurs `load` n'en envoient aucun.
    `fetchTemplates()` lit `/api/questions/templates/all` une fois par onglet (lectures
    simultanées partagées) ; naviguer entre ces pages ne recharge rien. Les pages admin
    invalident les deux caches après écriture : la relecture passe par `?frais=…`, adresse que
    le cache de Vercel ne connaît pas.
- `/api/questions/templates/all` : liste publique (`{ templates, nodes }` : modèles publiés et
  nœuds non archivés de l'arbre, colonnes du rangement seulement) gardée **5 min par Vercel**
  (`s-maxage=300, stale-while-revalidate=300`) — un modèle publié ou dépublié l'est pour les
  élèves en 5 à 10 min. Servie à tous : lue par un client **anonyme** (`createAnonymousSupabase`),
  jamais par la session ; un échec répond 500, sans cache. Le hook passe en `private, no-store`
  toute réponse qui pose un cookie. Vercel retire `s-maxage` de l'en-tête rendu au client (on y lit
  `public, max-age=0`) : le cache se vérifie à `x-vercel-cache` (`MISS` puis `HIT`).
- Routes : `src/routes/api/questions/` (`templates`, `templates/[id]`, `templates/bulk-status`,
  `generate/[id]`), admin `src/routes/(protected)/dashboard/admin/questions/`
  (liste, `create`, `[id]/edit`, `[id]/preview`), Automaths `src/routes/(public)/automaths/`
  (catalogue, `panier`, `test`), séries du prof `src/routes/(protected)/dashboard/teacher/series/`.
- Lecture de **tous** les modèles (`templates/all`, brouillons et arbre des
  filtres de l'admin) : par `readAllRows`
  (`src/lib/server/read-all-rows.ts`), page par page, tri terminé par `.order('id')`.
  PostgREST tronque à 1 000 lignes sans erreur : en novembre 2026 (1 912 modèles publiés), des
  séries sautaient des catégories (« Série : aucun modèle pour … »). Voir
  [base-de-donnees.md](../pratiques/base-de-donnees.md#lire--toutes--les-lignes--le-plafond-de-1-000).

### Tables

`question_templates` (une ligne = un modèle ; `variations`, `shared`, `options`, `test_specs` en
jsonb ; `status`), `question_template_points`, `series`, `chapter_series`, `evaluations` & co,
`skill_attempts`, `exercises` & co → [base-de-donnees-tables.md](base-de-donnees-tables.md)
(sections « Questions et exercices », « Évaluations »). Lecture : les modèles **publiés** sont
lisibles par les élèves et par anon (Automaths) — réponses attendues comprises.

## Le cycle de vie d'une question

### 1. Le modèle

Un `QuestionTemplate` est **rangé dans l'arbre des notions** (`classification_node_id`, une notion ou une sous-notion, facultatif ; [ADR 0035](../adr/0035-une-serie-enregistre-des-modeles.md)) et porte un `level` ≥ 1 qui l'ordonne dans sa rubrique. L'ancien quadruplet (`theme`, `domain`, `subdomain`) n'est plus lu ni écrit par le code : types, schémas Zod, API et OpenAPI ne le portent plus (les colonnes ont été supprimées au lot 4b, migration `20261104224856_automaths_fin_ancienne_forme` ; un vieil onglet qui l'envoie le voit retiré par le schéma, sans erreur). Les fichiers de lot (`scripts/questions/**`, `create-questions.ts`, `toTemplateInsertRow`) ne les portent plus non plus : ils sont refusés à la lecture, et un fichier retrouve son modèle par l'`id` écrit en tête après la création ([couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md)). Un nœud refusé par le trigger de la base (branche, archivé) ou la clé étrangère répond 400 en français.
Il porte aussi
des `grades`, un `status` (`draft` | `published`), des `options` (contraintes,
`orderIndependent`, `courseCard`, `courseQuestion`, `answerAssumptions`), des `testSpecs`, un
`shared` (valeurs par défaut) et au moins une **variation**.

Le **type** n'est pas déclaré : `getQuestionType` le déduit — `options.courseCard` → `course_card`
(ADR 0009), sinon `fill_in_blanks`. Le type `multiple_choice` n'existe plus : un QCM est une
question réduite à une **case choix** ([ADR 0033](../adr/0033-le-qcm-est-une-case.md), lot 5 du
2026-10-28). Les champs du QCM de modèle (`choices`, `correctChoiceIndex`, `multipleAnswers`,
`options.shuffleChoices`, `testSpecs[].selectedChoices`) sont **refusés** à l'enregistrement
(400, « le QCM est une case… », `retiredQcmFieldSchema` ; `null` admis), jamais retirés en silence.

**Case choix dans l'éditeur** (`choice-case-editor.ts`, `ChoiceCaseEditor.svelte`, PR 1b du chantier
`figure-et-choix`). L'énoncé effectif de la variation (le sien, sinon le partagé) fait foi :
`AnswerEditor` y repère les cases comme le générateur (`statementCaseKinds` = `blankTypes` de
`assignBlankIndices` ; `findCaseChoiceBlocks`, mêmes blocs ```choix) et donne à chaque case choix
une carte « Case N : choix » : choix modifiables, bonne(s) réponse(s) cochée(s) → `expectedAnswer`
(`"1"`, `"0;2"`), « Plusieurs bonnes réponses », « Mélanger les choix ». Chaque modification
réécrit le bloc à sa place (`writeChoiceCase`), le reste du texte à l'octet près ; supprimer un
choix décale les bonnes réponses. « Ajouter une case choix » et « Vrai / Faux » (`melanger: non`,
rien coché) ajoutent un bloc en fin d'énoncé : sa case est la dernière, la liste des cases est
complétée jusqu'à elle. Réponse calculée (`{{eval:…}}`) ou hors des choix : champ de texte, « Cocher
à la main » revient aux ronds. Bloc mal écrit (réglage ou ligne illisible, non fermé) : messages du
parseur et champ de texte seul, jamais réécrit ; un `case: N` écrit à la main aussi. Énoncé
**partagé** (la variation n'a pas le sien, `statementShared`) : carte en lecture seule (on coche
seulement), pas d'ajout de case choix — le modifier d'une variation décalerait les réponses des
autres. `TestSpecEditor` : une case choix se coche (`answers[i]` = `"0;2"`), chaque choix rendu
comme dans l'aperçu, lettre devant (variable non résolue laissée telle qu'écrite) ; réponse calculée →
champ de texte. Garde : `TestSpecEditor-case-choix.svelte.test.ts`.

**Figure de travail dans l'éditeur** (`work-figure-editor.ts`, lot 2 du chantier `figure-et-choix`) :
chaque bloc ```figure-de-travail de l'énoncé a une carte en lecture seule « Figure de travail — non
notée » (`data-testid="carte-figure-de-travail"`), sans numéro ni champ, qui dit son outil et ses
erreurs (`verifier:`, outil inconnu…) ; il se modifie dans l'énoncé. `TestSpecEditor` n'y demande
rien (valeur vide). Garde : `AnswerEditor-figure-de-travail.svelte.test.ts`.

**Cases de blocs omises de `blanks[]`** : le générateur permet d'omettre l'entrée d'une case de bloc
(`operation, `figure-a-completer, `figure-de-travail, `collection / `monnaie à construire, `line / `horloge à placer, `barres à construire) ;
`AnswerEditor` remet alors la liste à une entrée par case (`withBlockCases`, `choice-case-editor.ts` :
entrée vide au rang de chaque bloc, les autres dans l'ordre, le sens que leur donne le générateur).
Sans cela, la carte d'une figure prenait l'entrée que le générateur donne à la case suivante (énoncé
collé dans un formulaire parti d'une entrée : pas de carte pour le choix, « aucune bonne réponse »). Seulement après une modification de l'énoncé (ouvrir un modèle ne le marque pas modifié), Énoncé à variables ou à expressions (`{{…}}`, `<<expr:…>>`) : le générateur compte les cases sur
l'énoncé résolu ; l'éditeur ne réaligne que si l'énoncé brut compte comme lui — aucune variable dans
un ``operation (une division `{{a}} ÷ 7`porte deux cases), et même genre de cases dans le même
ordre en comptant aussi l'énoncé où chaque`{{…}}`vaut`1`(un`{{if:k==1|[_]|…}}` qui porte une case
les fait différer). Une expression (`<<expr:…>>`) n'est jamais réalignée : son format de réponse peut porter des cases (`?/?`) que l'éditeur ne connaît pas. Forme de CP-058 (`{{if:}}` dans le texte, variables dans la figure) : réalignée.

### 2. Fusion `shared` ⊕ variation (`resolveVariationWithShared`)

- `variables` : **fusionnées** — celles de `shared` d'abord, une variable de la variation de même
  nom remplace celle de `shared` (`mergeVariables`).
- Tout le reste (`statement`, `correction`, `conditions`, `validationRules`,
  `requiredForm`, `blankDefaults`, `answerFormats`) : la variation **remplace en bloc** la valeur
  de `shared` (`??`), sans fusion champ par champ.
- `blanks` : par variation seulement.
- `shared.genericFunctions`, `shared.cleanCoefficients` et `shared.capitalPairs` valent pour tout
  le modèle (pas de surcharge par variation).

### 3. Génération (`generateInstance(template, seed?)`)

1. `validateTemplate` ; un modèle invalide ne génère rien (`success: false`).
2. **Une seule source de hasard** pour toute l'instance, consommée dans l'ordre : variation,
   variables (et nouveaux essais), énoncé, réponses, choix, corrigé. Même graine → même instance.
3. Fusion `shared` ⊕ variation, détection des dépendances circulaires.
4. Variables résolues **dans l'ordre de déclaration** (une variable peut citer les précédentes :
   `{{random:1..{{max}}}}`, `{{eval:…}}`). Les `conditions` sont des gardes : si l'une est fausse,
   on retire (`MAX_CONDITION_RETRIES = 100`) ; au-delà, échec de génération.
5. Énoncé résolu, puis **indexation des cases** (`assignBlankIndices`), de gauche à droite :
   `?` dans une formule → `\placeholder[N]{}` ; `[_]` dans le texte → `{{blank:N}}` ;
   `<<expr:NAME>>` réserve les cases de `answerFormats[NAME]`. `NAME` doit commencer par
   `expression` (sinon le marqueur passe en silence au `?` ordinaire) ; le lien case →
   `answerFormats` est porté par `InstanceBlank.expressionName`. **« En liste ou cité »**, pour
   tous les blocs à case ci-dessous (geste, opération, choix, figure à compléter ou de travail) :
   en retrait, derrière un `>`, ou ouvert sur la ligne même d'un item (`- ```cubes`) — une seule
   règle, `unnestedLine` / `NESTED_PREFIX` (`ubumark/parser/nested-line.ts`) ; test :
   `generator/__tests__/blocs-sur-ligne-item.test.ts`. Un bloc ``operation à remplir
(au premier niveau de l'énoncé ; en liste ou cité → échec de génération) compte pour **une**
case, son numéro écrit dans le bloc (`case: N`) ; une division euclidienne pour **deux** (quotient
N, reste N + 1, seul N écrit ; `operationBlanks` les liste toutes deux). Sa réponse attendue vient du calcul du bloc
(`operationExpectedAnswer` ; division : `divisionExpectedAnswers`, forme la plus simple), jamais du modèle : `blanks[]` peut l'omettre
(case insérée à son rang ; un modèle sans autre case n'a pas besoin de `blanks`), ou lui donner
une entrée de réglages avec `expectedAnswer` vide — une réponse écrite est refusée. Un bloc en
erreur fait échouer la génération (message situé). Une ligne `case:` écrite par l'auteur aussi. Dans une carte de cours, le bloc ne porte aucune case. La case est `type: 'math'`,
`operation: true`, jugée comme une case ordinaire. Un bloc ``construction (au premier niveau,
   sinon échec) compte aussi pour **une** case, `case: N` posé en tête du bloc ; son contenu est mis à
   l'abri (un `?` ou un `[_]` du bloc ne crée pas de case). `blanks[]` peut l'omettre ; une réponse
   écrite est refusée ; un bloc en erreur (vérification manquante, fenêtre…) fait échouer la
   génération, comme un point de `verifier:` que le script ne nomme pas (`Z = …`, lecture légère
   `namesAssignedIn`) ou `options.orderIndependent` (l'appariement ne sait pas lire une figure). La case est `type: 'graphical'`, `construction: { source, checks }` (texte du bloc,
   variables résolues), réponse attendue symbolique `droite(A;B)`. Un bloc ``figure-de-travail
(figure de **travail** : l'élève peut y tracer pour vérifier, la réponse est ailleurs) est numéroté
de même (`workFigureBlanks`, même mise à l'abri, même refus en liste ou cité) ; `verifier:` y est
refusé (`readConstructionHeader(…, { work: true })`), `options.orderIndependent` permis. Sa case est
`type: 'graphical'`, `construction: { source, checks: [], work: true }`, réponse attendue vide. Une
question dont les seules cases sont des figures de travail est refusée
(`WORK_FIGURE_ALONE_MESSAGE`, au générateur et dans `validateTemplate`). Un bloc `collection ou
`monnaie à construire (`construire: N`), une droite ou une horloge à placer (```line, ```horloge, `placer: N`), un
diagramme en barres à construire (```barres, `placer: Natation ; Danse`), une boîte à moustaches à
construire (```boite-a-moustaches, `placer: Notes`), au premier
niveau, sinon échec (`buildBlanks`, genre et texte du bloc), compte aussi pour
**une** case, `case: N` posé dans le bloc ; une droite à plusieurs points (`placer: A=3 ; B=7`) compte
une case par point, N, N + 1…, seul N posé (`buildBlanks[…].point`, rang du point) ; un repère à placer
(```courbe, `placer: A=(2 ; 3) ; B=(-1 ; 2)`) de même, une case par point ; un diagramme en
barres, une case par barre à construire, dans l'ordre des données (`point` : rang de la barre),
précédées d'une case pour l'échelle avec `axe: à choisir` (`barsCaseCount`) ; une boîte à moustaches,
cinq cases par boîte à construire (minimum, Q1, médiane, Q3, maximum, boîte après boîte ;
`boxPlotCaseCount`) ;
nombre de cases : `buildCaseCount`. Sa réponse attendue
est la valeur `N` du bloc (droite : la graduation du point, écrite par `placerAnswer` ; horloge : l'heure
sur le cadran de 12, `'2 h 25'` pour `placer: 14 h 25`, `'2 h 25 min 40 s'` avec des secondes, écrite par `timeText` ; barres : l'effectif de
la barre, `'8'`, et pour la case de l'échelle la plus petite où tout rentre, `'5'` (`adaptedScale`) ;
repère : les coordonnées du point en point décimal, `'1.5;-0.5'`, écrites par `pointAnswer` ; boîte : la
valeur du trait en point décimal, `'11'`, `'2.5'` (`boxValueAnswer`), calculée par `describeList` avec
`données:` ; lecture commune
`generator/build-answer.ts`, `buildAnswerOf(kind, source, point)`), jamais
du modèle (`blanks[]` peut l'omettre, une réponse écrite est refusée, `case:` écrite aussi, bloc en
erreur, non fermé ou avec `options.orderIndependent` → échec). Le bloc est délimité comme le parseur
(`findBuildCollections`, `findBuildMonnaies`, `findLinesToPlace`, `findHorlogesToPlace`, `findBarsToPlace`, `findBoxPlotsToPlace`, `findCourbesToPlace`, `findTrigCirclesToPlace` : une ligne vide suivie d'une clé reste dans un bloc
fermé) ; l'énoncé numéroté est relu par `parseMarkdown` : une case dont le bloc n'est pas lu à l'écran
(fence de fin en retrait, bloc montré dans un bloc de code) → échec. La case est `type: 'math'`, `construire: 'collection' | 'monnaie' | 'line' | 'horloge' | 'barres' | 'partage' | 'courbe' | 'trig'` (`BuildKind` ; messages
au prof par `buildKindName` : « droite graduée », « horloge », « diagramme en barres », « repère », « cercle trigonométrique »), jugée comme une case ordinaire : l'élève répond
par la valeur qu'il a posée (`'34'`, `'35'` €, graduation `'7'`, hauteur de barre `'8'`, `''` plan vide,
aucun point ou barre pas construite).
Horloge à placer : case `type: 'text'` (une heure n'est pas un calcul), réponse de l'élève = les crans
des deux aiguilles (`'47 25'`, `-` pour une aiguille pas posée ; trois avec la trotteuse, `'47 25 40'`), juge à part (`isPlacedTimeCorrect`,
`utils/horloge-placer.ts`, dans `validateSingleBlank` et `validateBlankValue`).
Repère à placer : case `type: 'text'`, réponse de l'élève `x;y` (`''` point pas posé), juge à part aux
deux mêmes endroits (`isPlacedPointCorrect`, `utils/courbe-placer.ts` : les nombres comparés, `2.0;3`
vaut `2;3`). Droite à tracer (``courbe, `tracer: y = 2x - 1`) : UNE case `type: 'text'`, réponse
   attendue = l'équation normalisée par le parseur (`'y = 2x - 1'`), réponse de l'élève `x1;y1/x2;y2` ;
   le juge des deux endroits est `isCourbeAnswerCorrect` (`utils/courbe-tracer.ts`) : une attendue qui
   commence par `vecteur` est un vecteur, une attendue avec `=` est une droite (deux points distincts
   sur elle, n'importe lesquels), sinon un point. Vecteur à tracer (``courbe, `tracer: vecteur (3 ; -2)`,
`… depuis A`) : UNE case `type: 'text'`, réponse attendue `vecteur 3;-2` (`vecteur 3;-2 depuis -1;2`
quand l'origine est imposée, `vectorExpected`, `utils/courbe-vecteur.ts`), réponse de l'élève
`x1;y1/x2;y2` (origine, extrémité) ; juste si l'extrémité moins l'origine donne le vecteur.
Somme à tracer (`tracer: vecteur u + v depuis A`, chantier `somme-vecteurs`) : la même case et le même juge,
l'attendue calculée de la combinaison ; la bonne réponse seule (`BuildAnswer`) dessine aussi la construction
en pointillés (`constructionTraces`, `utils/courbe-combinaison.ts`).
Cercle trigonométrique à placer (``trig, `placer: M = 2*pi/3 ; N = -pi/4`) : une case par point,
   `type: 'text'`, réponse attendue = la mesure principale du point en LaTeX (`\frac{2\pi}{3}`,
   `-\frac{\pi}{4}`), réponse de l'élève = le cran de π/12 où il a posé le point (`'8'`, `''` pas posé),
   juge à part aux deux mêmes endroits (`isPlacedAngleCorrect`, `utils/trig-placer.ts` : le même cran,
   modulo 2π). Masqué en évaluation notée (`placer: M=? ; N=?`).
   Droite à représenter (``line, `representer: [2, +inf[`) : UNE case `type: 'text'`, `construire: 'line'`,
réponse attendue = l'intervalle écrit par `representerAnswer` (`'[2 ; +∞['`, `']-∞ ; 2/3]'`), réponse
de l'élève de même (incomplète : `'2 comprise, côté ?'`) ; juge à part aux deux mêmes endroits,
choisi quand l'attendue est un intervalle (`isLineToRepresentBlank` → `isRepresentedIntervalCorrect`,
`utils/number-line-representer.ts`). Masquée en `representer: ?` ou `? ; ?`. Réponse incomplète
(`isIncompleteRepresentation`) = case vide : Valider grisé (`QuestionCard`), Entrée met le focus sur
la droite (`FillBlanksInput`) — même critère aux deux endroits (`isLineToRepresentBlank`) ; le flash l'accepte comme une case vide.
Étiquettes à ranger (``ranger, chantier `reponses-a-placer` § 21, 22 ; `ranger-parser.ts`,
   `findRangersToPlace`) : le prof écrit les étiquettes dans le **bon** ordre ; une case par place
   (`buildCaseCount` = nombre d'étiquettes, `point` = rang de la place), `type: 'text'`,
   `construire: 'ranger'` (« étiquettes à ranger »). Au tirage, `rangerOrder` (`utils/ranger.ts`) mélange
   les étiquettes sur la source de l'instance, jamais dans l'ordre écrit ni à l'envers (dès 3 ; à 2,
   l'envers est le seul désordre) ; le bloc de l'énoncé de l'instance est réécrit dans l'ordre **affiché**
   (`replaceRangerBlocks`, `serializeRangerBlock`) — l'ordre écrit trahirait la réponse, la version
   publique n'a donc rien à cacher ni à reconvertir. Réponse attendue d'une place = la position
   **affichée** de l'étiquette écrite à ce rang (`'2'`) ; l'élève répond la position de l'étiquette posée ;
   juge à part : égalité stricte (l'étiquette, jamais sa valeur : `1 + 3/4` n'est pas `7/4`). Refus :
   moins de 3 (`RANGER_MIN_LABELS_IN_QUESTION` : à 2, l'affichage serait toujours l'inverse, la réponse se
   devinerait) ou plus de 8 étiquettes, vide, `signe:` autre que `<` / `>`. Deux étiquettes identiques après
   tirage : condition implicite, le tirage des variables est refait (`rangerLabelsCollide`, résolution à part
   sur une source jetable) ; toujours identiques après 100 essais → échec, message au prof.
   Tableau de signes à compléter (``variation à `?`, chantier [tableau-signes](../archive/wip/tableau-signes-progress.md) ;
`findVariationsToFill`, `questions/sign-table-case.ts`) : au premier niveau, une case par cellule cachée,
N, N + 1… dans l'ordre de lecture du parseur (`cases` du nœud), seul N posé (`case: N`) ;
`variationBlanks` (texte du bloc, rang de la cellule). Réponse attendue tirée du bloc
(`readSignTableCases`), jamais écrite dans `blanks` (refusée : « sa réponse vient du tableau de signes ») ;
`cellule` sur la case (`valeur` / `signe` / `marque` / `fleche`). Valeur (de x, ou d'une ligne `variation:`,
`-2: ?4, top`) : `type: 'math'`, juge ordinaire avec `acceptDecimal` forcé (`1,5` vaut `\frac{3}{2}`) ;
signe, marque et flèche (`-2,2: ?flèche`, chantier [variations-a-completer](../archive/wip/variations-a-completer-progress.md)) :
`type: 'text'`, attendu `+` / `-` / `z` / `||` / `rien` / `↗` / `↘` (LaTeX du corrigé `\nearrow`, `\searrow`),
juge à part aux deux endroits (`isSignCellCorrect` : même jeton, `0` vaut `z`, case vide jamais juste). Refus : bloc en retrait, cité ou dans un choix, non fermé, refusé par le parseur
(son message « Ligne N : … »), `case:` écrit, `??n` ou `?` seul (formes de l'évaluation), « ordre
indifférent », bloc illisible à l'écran. Tableau sans `?` : aucune case, rien ne change.
Figure à colorier (``partage + `colorier: 3/8`, chantier `fractions-a-colorier` ; `partage-parser.ts`,
   `findPartagesToColorier`) : au premier niveau, une case, `case: N` posé dans le bloc ; `construire: 'partage'`
   (« figure à colorier »), `type: 'text'`. Réponse attendue (`buildAnswerOf`, `expectedColoringAnswer`) :
   `parts à colorier / parts d'une figure` (`'3/8'` ; `1/2` sur une bande de 4 : `'2/4'` ; `7/4` sur trois bandes de 4, `unites: 3` : `'7/4'`), jamais du modèle
   (`blanks[]` peut l'omettre, une réponse écrite est refusée). L'élève répond les rangs qu'il a coloriés
   (`'1, 4, 6'`, `''` = rien colorié) ; juge à part, `isColoringCorrect` (`utils/partage-colorier.ts`, dans
   `validateSingleBlank` et `validateBlankValue`) : le nombre de parts, pas lesquelles. Copie corrigée :
   `BuildAnswer` (`PartageColorier` verrouillé, phrase « Tu as colorié 2 parts sur 8 ; il fallait en colorier 3
   (3/8). », figure juste dessous ; vide : « Tu n'as rien colorié. »).
   Assemblage de cubes à geste (``cubes + `dessiner: face` ou `retrouver: face, droite`, chantier `solides`
§ 7 ; `espace-parser.ts`, `findCubesToBuild`) : au premier niveau, une case, `case: N` posé dans le bloc ;
`construire: 'cubes'` (« assemblage de cubes »), `type: 'text'`. Réponse attendue (`buildAnswerOf`,
`expectedCubesAnswer`) : la vue sans marge (`'100/111'`) ou `'face, droite : 2 1 / 1 2'`, jamais du modèle
(une réponse écrite est refusée, bloc en erreur → échec situé « Case 1 (assemblage de cubes) : … »).
L'élève répond le quadrillage colorié (`'00000/01000/01110/00000'`) ou les hauteurs (`'1 2 / 2 1'`, `-` case
vide) ; juge à part, `isCubesAnswerCorrect` (`utils/cubes-gestes.ts`, dans `validateSingleBlank` et
`validateBlankValue`) : la vue à une translation près, ou les mêmes vues. Copie corrigée : `BuildAnswer`
(`CubesGeste` verrouillé, phrases de la correction, solution dessous ; sans réponse : `solution`, la vue
coloriée ou les hauteurs du bloc) ; vide : « Tu n'as rien colorié. » / « Tu n'as pas rempli toutes les cases. »
(`emptyBuildText` lit le geste sur le bloc).
Patron à geste (``patron + `designer: opposee` ou `completer: 5`, chantier `solides` § 10 ;
   `espace-parser.ts`, `findPatronsToBuild`) : même chemin, `construire: 'patron'` (« patron à geste »),
   `type: 'text'`. Réponse attendue (`expectedPatronAnswer`) : les faces calculées par le pliage (`'6'`, `'1,2,4,6'`)
   ou le quadrillage du patron du prof (`'00000/00100/01112/00100/00000'`, `2` = face retirée). L'élève répond
   les faces touchées ou son quadrillage (`2` = face posée) ; juge à part, `isPatronAnswerCorrect`
   (`utils/patron-gestes.ts`) : mêmes faces, ou toute pose qui se plie en cube. Copie corrigée : `BuildAnswer`
   (`PatronGeste` verrouillé, phrase, réponse du prof dessous, « Il y a d'autres réponses justes. » pour
   `completer:`) ; vide : « Tu n'as touché aucune face. » / « Tu n'as posé aucune face. ».
   Solide à geste (``solide + `tracer: vecteur AB + AD depuis A`, chantier `solide-vecteur`, lot 2 ;
`espace-parser.ts`, `findSolidesToBuild`) : même chemin, `construire: 'solide'` (« solide à geste »),
`type: 'text'`. Réponse attendue (`expectedSolideAnswer`) : les couples de points justes, calculés en 3D,
séparés par `|`, celui de la correction d'abord (`'A/G'`, ou `'A/B|D/C|E/F|H/G'` quand l'origine est libre).
L'élève répond `A/G` (origine/extrémité) ; juge à part, `isSolideAnswerCorrect`
(`utils/solide-gestes.ts`) : l'un des couples. Vide : « Il faut placer l’origine et l’extrémité. ».
Un bloc ``choix (case « choix », chantier `figure-et-choix`, au premier niveau, sinon échec)
   compte pour **une** case, `case: N` posé en tête du bloc (`choix-parser.ts`, lu dans
   `assignBlankIndices`) : réglages en tête (`plusieurs: oui`, `melanger: non` ; défauts : une
   réponse, mélangé), puis un choix par ligne `- …` (suite en retrait de 2 espaces ; clôture ````
   si un choix contient un bloc). Les choix sont résolus avec l'énoncé (variables, `{{if}}`). Une
   case dans un choix (`?` en formule, `[_]`) est refusée, message situé. La case **est** dans
   `blanks[]` : sa bonne réponse `expectedAnswer` = indice(s) d'**origine** (« 1 », « 0;2 »,
   `{{eval:…}}`), contrôlée (≥ 2 choix ; exactement une bonne sans `plusieurs: oui`,
   au moins une avec ; hors des choix → échec ; une bonne réponse **calculée** (avec `{{…}}`) peut
   répéter un indice, qui compte une fois, comme `0;{{f1}};{{eval:2*f2}}` où un choix faux rend `0` — la réponse d'un élève
   qui répète un indice reste illisible). `type: 'choice'`, `choice: { choices, order,
multiple }` (choix dans l'ordre d'origine, `order[position]` = indice d'origine) ; mélange tiré
   à son rang (Fisher-Yates sur la source de l'instance) ; le bloc de l'énoncé de l'instance liste
   les choix dans l'ordre **affiché**, `melanger:` retiré. `orderIndependent` → échec. Contrôle
   statique à l'enregistrement : `choiceAnswerCountErrors` (« Variation 1, case 2 (bloc choix) : … »),
   bonne réponse dynamique vérifiée au tirage seulement.
6. Chaque case reçoit ses réglages fusionnés : **case ▸ `blankDefaults`** pour `precision`,
   `unit`, `answerKind`, `rulesSuffice`, `acceptDecimal`… ; `requiredForm` : case ▸
   `blankDefaults` ▸ `requiredForm` de la variation ; `validationRules` : case ▸ variation.
   ⚠️ Exception : une case de tableau de signes à compléter est construite à part, **sans** cet
   héritage (`answerKind: 'intervalles'` aurait jugé `-3` faux). Les cases ``operation et « à
construire » héritent encore (`answerKind`, unité, précision, `requiredForm`) ; aucun modèle
``operation de prod n'a de `blankDefaults` (relevé du 2026-11-03), donc pas corrigé.
7. Correction résolue, puis **mode B** : `generateCorrection` pré-rend les étapes si
   `correction.generatedSteps` est déclaré (voir § 7).

**Sens de deux majuscules collées** (`AB` : longueur du segment ou produit A × B) : résolu **une
fois** à la génération par `resolveCapitalPairs` (`capital-pairs.ts`), dans l'ordre : déclaration
`shared.capitalPairs` → contexte (branches `Matrices` et `Graphes` pour un modèle ; pour un exercice, son sujet
`Graphes et matrices` ou contenant « physique » → produit) → **longueur** par défaut. Un modèle n'a plus
de thème (ADR 0035) : l'éditeur prend le contexte dans la branche de
« Rangé dans », et à l'enregistrement écrit `shared.capitalPairs = 'product'` si le choix est
« selon le contexte » et que le contexte l'impose (`capitalPairsToWrite`) ; le générateur ne lit
jamais l'arbre. Les anciens modèles « Graphes et matrices » ont reçu cette déclaration par migration. Copié sur l'instance (`QuestionInstance.capitalPairs`, toujours
présent sur une instance neuve, et dans `toPublicQuestion`). Une instance sans le champ (servie
avant) est lue comme avant : produit, défaut du parseur. L'éditeur propose « Deux majuscules
collées (AB) désignent : » et signale une réponse attendue qui contient un nom de figure (`ABC`)
en mode longueur (`figureNameWarnings`) : elle ne pourrait jamais être acceptée.
Les **exercices rédigés** n'ont pas de déclaration (Q-J) : `exerciseCapitalPairs(topic)` applique la
même table de contexte à leur thème (écran : `ExerciseDisplay` prof et élève, `ExerciseModal`,
`ExerciseForm`, aperçu d'affectation, signalements ; PDF : `generateTypst({ capitalPairs })`).
Le même sens vaut pour l'**écriture** (lot 5) : formules `$…$` de l'énoncé, des choix et de la
correction relues en syntaxe maison (`resolveMarkdownContent`, `resolveCorrectionContent`),
`expectedAnswerLatex`, formats de réponse, coefficients nettoyés, correction rédigée
(`generateCorrection`, `readingOf(instance)`) et série figée — `AB^2` s'écrit `AB^2`, `ABC` reste
`ABC`. À l'écran, les cartes (`QuestionCard`, `FlashCard`, `CorrectionCard`, `CourseCardView`,
`QuestionPreviewBaseCard`) posent le sens par `provideCapitalPairs` pour les `~…~`. Le
préremplissage n'est pas relu par le parseur (texte LaTeX tel quel).

Qui génère : le navigateur (Automaths `test`, aperçus, `FlashCard`), le SRS (`src/lib/srs/generator.ts`,
une graine neuve à chaque révision), le serveur pour les évaluations (graine enregistrée par élève)
et pour une série figée (`src/lib/worksheets/serie-automatismes.ts`, ADR 0011).

### 4. Affichage et saisie

L'énoncé est du markdown ubumark ; les cases sont des `\placeholder[N]{}` d'un champ MathLive
(`FillBlanksInput.svelte`) ou des cases de texte (`BlankInput.svelte`, `pool` = autocomplétion
seulement, ne restreint pas la validation). Le clavier virtuel suit la nature de la case (unités,
intervalles, vecteurs, matrices, dénombrement). Instance en mode longueur : les raccourcis
MathLive qui transforment deux majuscules (`AA` → ∀, `EE`, `!EE`, `NN`, `ZZ`, `QQ`, `RR`, `CC`,
`TT`) sont retirés du champ au montage (`MathPrompt`, `withoutCapitalPairShortcuts`) : `AA'` reste
la longueur AA'. Ailleurs, ils restent.

Le clavier par défaut de MathLive (123, symboles, abc, grec) n'a aucune touche pour se fermer.
Tant qu'il est ouvert, un bouton « Fermer le clavier » est posé au-dessus de lui
(`src/lib/components/MathKeyboardClose.svelte`, monté dans le layout racine, pour tous les
champs MathLive du site). Il fait passer le focus sur lui-même, et MathLive referme alors le
clavier. ⚠️ Ni `blur()` sur le champ, ni `mathVirtualKeyboard.hide()` (MathLive 0.111) : avec
`blur()`, le champ se croit encore actif ; à la fermeture, il reprend le focus et rouvre le
clavier. Sous 500 px de haut (téléphone en paysage), les touches passent de 42 à 32 px
(`--keycap-height`, `src/app.css`) : le clavier passe de 242 à 202 px.

Natures de réponse :

| Nature                            | Déclaration                                                  | Jugée par                                                                                                                                                                                                                 |
| --------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Expression / nombre               | case ordinaire                                               | équivalence + forme (§ 5)                                                                                                                                                                                                 |
| Figure (tracé)                    | bloc ```figure-a-completer (`verifier:`)                     | `construction/judge.ts` (ci-dessous) ; réponse `droite(x1;y1;x2;y2)`, `segment(x1;y1;x2;y2)`, `point(x;y)`, `cercle(cx;cy;x;y)`, `report(cx;cy;ax;ay;bx;by)` ou `repere(vx;vy;ax;ay;r;deg;sens)`, objets séparés par `\|` |
| Figure de travail                 | bloc ```figure-de-travail (sans `verifier:`)                 | **jamais notée** : retirée avant toute notation (`gradedPart`) ; son tracé (même chaîne) reste dans la réponse, enregistré en évaluation                                                                                  |
| Opération posée                   | bloc ```operation (`cases: résultat`)                        | case ordinaire : chiffres de la grille lus comme un nombre (`operation-answer.ts` ; division : `operation-division-answer.ts`, quotient et reste)                                                                         |
| Collection à construire           | bloc ```collection (`construire: N`)                         | case ordinaire : la valeur posée, composition libre (`collection-construire.ts`)                                                                                                                                          |
| Monnaie à construire              | bloc ```monnaie (`construire: N`)                            | case ordinaire : la somme posée (`35`, ou `3,45` / `2,2` / `1 000` : `amountAnswer`, sans zéro final ni millier collé), coupures libres dans la réserve (`monnaie-construire.ts`)                                         |
| Droite à placer                   | bloc ```line (`placer: N`)                                   | case ordinaire : la graduation du point de l'élève (`number-line-placer.ts`), exacte, sans tolérance ; une case par point                                                                                                 |
| Droite à représenter              | bloc ```line (`representer: [2, +inf[`)                      | `isRepresentedIntervalCorrect` (`number-line-representer.ts`) : borne(s), côté et crochets, nombres comparés ; une case                                                                                                   |
| Repère à placer                   | bloc ```courbe (`placer: A=(2 ; 3)`)                         | `isPlacedPointCorrect` (`courbe-placer.ts`) : les deux coordonnées exactes, aimant aux nœuds de la grille ; une case par point                                                                                            |
| Droite à tracer                   | bloc ```courbe (`tracer: y = 2x - 1`)                        | `isTracedLineCorrect` (`courbe-tracer.ts`) : deux nœuds distincts de la droite, n'importe lesquels ; une case                                                                                                             |
| Vecteur à tracer                  | bloc ```courbe (`tracer: vecteur (3 ; -2)`)                  | `isTracedVectorCorrect` (`courbe-vecteur.ts`) : extrémité moins origine = le vecteur, où qu'il soit (origine imposée `depuis A` : depuis A) ; une case                                                                    |
| Barres à construire               | bloc ```barres (`placer: Danse`, `axe:`)                     | case ordinaire : la hauteur posée (`barres-placer.ts`), aimant à l'unité ; une case par barre                                                                                                                             |
| Boîte à moustaches à construire   | bloc ```boite-a-moustaches (`placer: Notes`, `axe:`)         | case ordinaire : la valeur du trait posé (`boxplot-placer.ts`), aimant à la graduation ; cinq cases par boîte (note partielle), traits dans le désordre faux                                                              |
| Étiquettes à ranger               | bloc ```ranger (`- …`, `signe: <`)                           | égalité stricte : la position affichée de l'étiquette posée ; une case par place                                                                                                                                          |
| Tableau de signes à compléter     | bloc ```variation (`?-3`, `?+`, `?z`, `?rien`)               | valeur de x : case ordinaire, décimal exact accepté ; signe, marque : `isSignCellCorrect` (`sign-table-case.ts`), même jeton (`0` = `z`) ; une case par cellule cachée                                                    |
| Tableau de variations à compléter | bloc ```variation, ligne `variation:` (`?4, top`, `?flèche`) | valeur : case ordinaire, décimal exact accepté ; flèche : `isSignCellCorrect`, jeton `↗` / `↘` lu sur les positions écrites ; une case par cellule cachée                                                                 |
| Cercle trigo à placer             | bloc ```trig (`placer: M = 2*pi/3`)                          | `isPlacedAngleCorrect` (`trig-placer.ts`) : le cran de π/12 de l'angle, modulo 2π, aimant à 24 crans ; une case par point                                                                                                 |
| Horloge à placer                  | bloc ```horloge (`placer: 9 h 25`)                           | `isPlacedTimeCorrect` (`horloge-placer.ts`) : grande aiguille sur la minute ; petite pile sur l'heure à minutes = 0, entre deux heures sinon, ou sur le cran de sa vraie place ; trotteuse sur la seconde exacte          |
| Texte                             | `[_]` hors formule                                           | casse et accents ignorés ; 1 lettre d'écart tolérée dès 5 lettres                                                                                                                                                         |
| Grandeur                          | `unit: { expected, required? }`                              | `validateQuantityAnswer` (conversion, unité imposée ; l'attendu est réécrit au tirage dans l'unité imposée, `expectedInRequiredUnit`)                                                                                     |
| Ensemble en intervalles           | `answerKind: 'intervalles'`                                  | `interval-answer.ts` ; option `openableBounds` ; contrainte `intervalForm` (morceaux non réunis, fraction ou racine simplifiable : ½ ; [détail](mathast/convention-equivalence.md))                                       |
| Équation de droite / cercle       | `answerKind: 'equation'`                                     | `equation-answer.ts` (même ensemble de points) ; formes `reduite`, `cartesienne`, `centre-rayon`                                                                                                                          |
| Vecteur dans une case             | `answerKind: 'vecteur'`                                      | `vector-answer.ts` ; `vectorMode` `exact` ou `colineaire`                                                                                                                                                                 |
| Matrice dans une case             | `answerKind: 'matrice'`                                      | `matrix-answer.ts` (dimensions, puis chaque coefficient)                                                                                                                                                                  |
| Primitive / solution d'ED         | `answerKind: 'primitive'` / `'solution-ed'`                  | `calculus/` (dérivation / substitution) ; `solutionMode`                                                                                                                                                                  |
| Case choix                        | bloc ```choix (`plusieurs:`, `melanger:`)                    | `statusFromChoices` (1 / ½ / 0) ; réponse = indices d'origine cochés, triés, séparés par `;` (`choice-case.ts`)                                                                                                           |
| Carte de cours                    | `options.courseCard`                                         | rien : auto-évaluation (`validateAnswer` rend un message)                                                                                                                                                                 |

Après « Valider », la `FlashCard` colore chaque case au recto avec le verdict par case du
validateur (`computeBlankColors`, `components/questions/blank-verdicts.ts` → `validateAnswerDetailed`,
le même que le verso) : verte si juste, **ambre** si juste mais perfectible (`unoptimal_form`, «
forme à améliorer », `InputState.unoptimal`), rouge sinon. Avant octobre 2026, une comparaison
textuelle avec l'attendu rendait rouge toute bonne réponse d'une case à unité (`6m` pour `6[m]`),
`3.1` pour `3{,}1` ou `\dfrac{1}{2}` pour `\frac{1}{2}`.

Case « choix » : le parseur ubumark lit le bloc ```choix en nœud `choice` (`parseChoiceBlock`,
choix gardés en markdown, formules non extraites) ; `FillBlanksInput` met à sa place un
`MultipleChoiceInput` (ronds ou carrés, lettres A, B, C, groupe `radiogroup` / `group` nommé
« Case N : choix », flèches) dont la valeur est `formatChoiceAnswer(...)` en indices d'origine ;
après validation, choix coché à tort et bons choix marqués (réponse connue seulement). Une case
choix vide compte comme une case vide (`QuestionCard` : Valider grisé). Le texte d'aide « Remplissez
les blancs avec vos réponses » n'apparaît que s'il y a une case à écrire (ni choix, ni figure, ni
collection ou monnaie à construire, ni droite ou horloge à placer, ni barres à construire : toute case
`construire`). Hors question
(`MarkdownRenderer`, cours, aperçu) : liste A, B, C non cliquable ; PDF (typst) : « A) … ».

Tableau de signes à compléter (chantier [tableau-signes](../archive/wip/tableau-signes-progress.md)) :
saisie dans `FillBlanksInput` — le tableau rendu par `VariationTable` (snippet `cell`), valeur =
petite case MathLive (`MathPrompt`, `\placeholder[N]{}`), signe / marque / flèche = `SignCellPicker` (case en
pointillés, un toucher ouvre dessous + / −, 0 / ‖ / rien, ou ↗ / ↘ ; au clavier `+` `-` `0` `z` `|` `r`,
`↑` `↓` `c` `d` pour une flèche, Retour arrière vide), jetons `+` `-` `z` `||` `rien` `↗` `↘`,
`data-construire-case` (Entrée → première case vide). Flash : cellules vides ; bonne réponse : remplies.
Énoncé masqué d'évaluation : même écran. Tableau de **variations** (chantier `variations-a-completer`) :
une flèche cachée n'est pas dessinée et les deux valeurs qui l'encadrent sont au milieu
(`variationRowForDisplay`) ; une valeur cachée est une case à sa hauteur.

Corrigé (résultat attendu, `expected-result.ts`) : le tableau sort de l'énoncé rempli et de la consigne
(`withoutSignTableCases`, aussi dans `instructionOf`) ; une ligne `sign-table` par tableau, à sa place :
tableau seul → la consigne à part, puis le tableau ; avec d'autres cases → l'énoncé rempli découpé autour
de chaque tableau (« Complète… », tableau, « En déduire… », chaque morceau avec ses cases et sa « Ta
réponse ») : `source` (bloc sans `case:`), `cells` (`ExpectedSignCell` : case, `cellule`, attendu lu
dans `blanks` — jamais dans le bloc, masqué en évaluation —, réponse de l'élève : jeton pour un signe ou
une marque ou une flèche, `0` ramené à `z`, sinon texte neutralisé ; LaTeX neutralisé pour une valeur), statut du
tableau (juste, forme à améliorer, faux ; `solution` sans réponse, R9), puis les remarques de ses cases.
Aucune cellule remplie : le tableau juste, sans verdict, et « Tu n'as rien rempli dans le tableau. ».
Cellule sans case de tableau (instance inattendue) : réponses attendues seules (R10). Écran : `SignTableAnswer.svelte` — cellule juste en vert, fausse barrée
en rouge avec la bonne valeur dessous, vide : la bonne valeur en pointillés ; libellé `sr-only` par
cellule (« Case 2, ta réponse : moins, faux, attendu : plus » ; une fraction lue « 3 sur 2 »), cellule
retrouvée par son numéro de case ; tableau illisible : les cellules en liste. Vue concise de la carte : rien (comme une
case à construire), la détaillée s'affiche.

### 5. Validation d'une case (`validateAnswer` → `validateBlanks` → `validateSingleBlank`)

Statuts (`ValidationStatus`) : `correct` (1), `unoptimal_form` (½), `bad_form` (0), `incorrect`
(0), `empty`. **Avant tout**, les figures de travail sont retirées avec leur valeur
(`gradedPart`, `graded-part.ts`), dans `gradeBlanks` (serveur) comme dans `validateBlanks` et
`detailBlanks` (élève, copie) : aucune règle ci-dessous ne les voit (cases vides, appariement libre,
« figure vide → 0 », « Tu n'as pas tout complété. ») ; `spread` remet ensuite messages et statuts à
leur case. Dans le verdict par case, une figure de travail est marquée `ungraded` (statut « vide »
sans valeur ; `corrected-detail.ts` l'écarte du statut recalculé). Une figure de travail vide ne
grise pas « Valider » (`FlashCard`, `QuestionCard` ; la version publique porte `workFigure`). Gardes :
`figure-de-travail.test.ts`, `figure-de-travail-ecran.svelte.test.ts`. Dans l'ordre :

0. Vide → `empty`. Nature `intervalles` → sa chaîne. Puis **garde de complexité**
   (`isAnswerTooComplex`) : une écriture démesurée est `incorrect` **avant** toute lecture.
   Puis `equation`, `vecteur`, `matrice`, `primitive` / `solution-ed` : chacune sa chaîne.
   Case « figure » (`blank.construction`), juste après le vide : `judgeConstruction`. Chaque
   vérification `droite_par P ; Q` prend **sa** droite parmi celles tracées (une droite qui passe par
   P et Q, quels que soient les deux points qui l'ont tracée) ; une droite qu'aucune ne prend est
   « de trop » (faux) ; message de la première vérification ratée (« Ta droite passe par A et C, pas
   par B. », « Ta droite ne passe pas par le point B. »…). Vérifications `carre A ; B` et
   `rectangle A ; B ; C` (outil segment, CP-060 ; `construction/polygon.ts`) : côtés donnés et
   segments de l'élève **fusionnés** par droite porteuse (côté en morceaux, trait repassé sur un côté
   donné : sans effet) ; un rectangle est présent si ses quatre côtés sont couverts ; le carré, d'un
   côté ou de l'autre de [AB]. Messages, dans l'ordre : trait hors des lignes du quadrillage (si les
   côtés donnés les suivent), figure non fermée (ou fermée sur un côté donné prolongé : « Le côté déjà tracé ne doit pas être
   prolongé… », « Les côtés déjà tracés ne doivent pas être prolongés… » pour le rectangle), pas un carré, trait de trop, trait qui dépasse.
   Rectangle sans angle droit en B : erreur de l'auteur. Vérification `symetrique par d` (outil segment,
   `construction/symmetry.ts`, chantier `controles-figure`) : l'élève trace l'image de tout ce que la
   figure trace (segments, côtés des polygones visibles) sauf l'axe — ou des seuls traits entre les points
   listés (`symetrique A ; B ; C par d`) ; `par O` (un point) : symétrie centrale. Même fusion par droite
   porteuse (image en morceaux, trait repassé sur la figure de départ ou sur l'axe : sans effet).
   Messages, dans l'ordre : trait hors de l'image (« Ta figure a glissé… » si TOUT ce qui est tracé est la
   figure de départ glissée ; « L'axe est oblique… » si tout est retourné par une verticale ou une
   horizontale alors que l'axe est oblique), image incomplète (« Il manque une partie du symétrique. »),
   trait qui dépasse. Le juge lit les traits de la figure dans le registre (`constructionShapes`, même
   calcul que `constructionPositions`). Erreurs de l'auteur : axe ou centre inconnu, rien à transformer,
   image hors de la fenêtre ou hors des nœuds (quadrillage), axe hors de la fenêtre (papier uni). Sur
   papier uni (lot 2b), seuls les segments sont jugés : droites de la règle et de l'équerre, cercles du
   compas (et reports, si l'auteur a mis le Report dans la palette) sont des traits de construction,
   ignorés. Vérification `point A' = <expression>`
   (outil point, réponse `point(x;y)`, `construction/point.ts`, lot 2a du chantier) : l'élève place des
   points, non nommés, jugés comme un ensemble (chaque point attendu touché, aucun de trop ; traits de
   construction ignorés). L'expression (langage des figures : `symetrie`, `milieu`…) est calculée par le
   registre (`constructionExpected`) sous un nom interne, dans une figure à part : le langage n'a pas de
   prime, `A'` ne sert qu'à la correction et aux messages ; le point attendu n'est jamais un point
   d'aimantation. Messages, dans l'ordre : point mal placé (symétrique par un axe nommé : « Le segment
   [AA'] doit être perpendiculaire à l'axe. » s'il est à la bonne distance, « A' doit être à la même
   distance de l'axe que A. » s'il est sur la perpendiculaire ; sinon « Ce point n'est pas le symétrique
   de A. », ou « Ce point n'est pas à sa place. » pour une autre expression), point manquant, point de
   trop ; sur papier uni, avant tout, un point qui n'est pas CONSTRUIT rend la réponse fausse, même posé
   pile au bon endroit : « Ton point est placé à l'œil : construis-le avec tes instruments. ».
   **Construit, de proche en proche** (`constructionOf`, `instruments.ts`, la même règle pour les points,
   les droites, les cercles et le sommet du triangle) : points de départ = points de la figure et bouts
   de ses segments ; un trait de l'élève est construit s'il tient sur des points construits (droite ou
   segment : deux bouts, ou le tracé exact de l'équerre le long d'un trait droit construit, partie d'un
   point construit ou posée SUR ce trait, la parallèle « à la 6e » ; cercle : point de passage, et
   centre construit ou piqué SUR un trait droit construit, le compas « sur l'axe » du symétrique ; report : centre et deux bouts de l'écartement ; côté d'angle, lot 7 : droite ou segment qui part du centre d'un repère construit et passe par ce repère, `isAngleSide`) ; un point est construit s'il est de
   départ ou l'intersection de deux traits construits ; on recommence jusqu'à ce que rien ne s'ajoute.
   Deux traits tracés à l'œil ne construisent donc rien. Exception : deux cercles (compas ou report) de
   même rayon, même pris à l'œil, centrés sur deux points construits, construisent leurs deux
   intersections (médiatrice à écartement quelconque), sans devenir des traits. Exception 4 (lot 9,
   option `arcsOnSides`, dans une figure qui vérifie une bissectrice) : un cercle à l'œil centré sur un point construit
   construit ses intersections avec les traits droits construits qui passent par son centre (l'arc
   piqué au sommet coupe les côtés), sans devenir un trait ; refait sur ces points (même centre, même
   rayon, appuyé sur l'un d'eux), il reste à l'œil ; bornée à la bissectrice, car ailleurs elle rendrait « construite » une
   longueur prise à l'œil (côté de triangle). Erreurs de l'auteur : expression qui ne se calcule pas ou ne donne pas un point, nom
   déjà pris, point déjà dans la figure, hors de la fenêtre, hors des nœuds (quadrillage) ; sans
   quadrillage, autre chose que `symetrie(A, axe=d)` / `symetrie(A, centre=O)` / `milieu(A, B)` (comme
   la médiatrice, ci-dessous) / `centre(cercle_circonscrit(A, B, C))` (comme le cercle, ci-dessous) /
   `sommet(parallelogramme(A, B, C), 4)` (A, B, C visibles ; lot 4), ou axe hors de la fenêtre ; deux
   points au même endroit. 4e sommet mal placé, à l'autre intersection des reports (cercle de centre A
   de rayon BC, cercle de centre C de rayon AB) : « Avec ce point, ABCD est croisé : prends l'autre
   intersection. » (`crossedParallelogramFeedback` ; jamais quand cette intersection est un sommet
   donné, losange). Correction du 4e sommet : D, [CD] et [DA] en pointillés, côtés opposés codés
   (`PointSolution.sides`, `marks`). Vérification
   `droite m = <expression>` (`construction/line.ts`, lot 3 du chantier) : une des droites de l'élève
   (règle, équerre) recouvre la droite que donne l'expression (calculée comme les points, `expected.lines`) ;
   ses autres droites et ses cercles sont des traits de construction, ignorés ; plusieurs vérifications
   `droite` : chacune prend sa droite. Sur papier uni, la droite doit être construite (règle ci-dessus :
   deux extrémités construites, ou le tracé exact de l'équerre, second point `perpendicularThrough` d'un
   trait droit construit, qu'un toucher à la règle n'atteint pas) ; sinon « Ta droite est tracée à l'œil : construis-la
   avec tes instruments. ». Messages : il manque la droite (« Trace la médiatrice de [AB]. », « Trace la
   droite m. »), puis, pour une médiatrice, la droite qui touche au but (perpendiculaire à [AB] ou par
   son milieu ; une droite qui repasse un trait de la figure, (AB) elle-même, n'est pas un essai) : « … perpendiculaire à [AB] mais ne passe pas par son milieu. », « … passe par le milieu
   de [AB] mais n'est pas perpendiculaire à [AB]. », « Ce n'est pas la médiatrice de [AB]. » ; autre
   expression : « Ta droite n'est pas à sa place. ». Un point ou un segment dans la réponse : faux, sans
   message. Erreurs de l'auteur : expression qui ne se calcule pas ou ne donne pas une droite, droite
   hors de la fenêtre, deux vérifications pour la même droite ; sur quadrillage, droite sans deux nœuds
   dans la fenêtre ; sur papier uni, autre chose qu'une médiatrice, A ou B invisible, ou médiatrice
   qui n'a pas 2 unités dans la fenêtre (`mediatriceSupportError`, aussi pour `milieu(A, B)` : l'élève y
   croise deux cercles de même rayon, quel qu'il soit ; avant le lot 9, les cercles de rayon AB devaient
   s'y couper). Une `droite` ne se mêle à aucune autre
   vérification, et sa palette ne prend que règle, équerre, compas, report (parseur : un point ou un segment
   tracé ferait une réponse forgée). Palette : règle, équerre, compas, avec ou sans quadrillage, et le report sur papier uni (lot 9 : il garde l'écartement des deux cercles égaux ; `LINE_GRID_TOOLS` sur quadrillage, où `outils: report` est refusé)
   (`PLAIN_PAPER_TOOLS.droite`) ; sur quadrillage, tous ses touchers vont aux nœuds (l'équerre choisit
   d'abord sa droite). Correction : la droite en pointillés ;
   médiatrice : angle droit au milieu et moitiés codés (`solutionCodages`). Bissectrice
   (`droite d = bissectrice(A, O, B)`, lot 9) : papier uni seulement ; O, A, B visibles, non alignés, les deux côtés tracés (un trait droit de la
   figure par O qui s'en va vers A, même plus court que OA, et de même vers B, `sideDrawn` : sinon l'arc
   en O n'a rien à couper ; le message nomme le côté manquant),
   au moins 2 unités de bissectrice (la demi-droite) dans la fenêtre (`bissectriceSupportError`).
   Juste : une droite construite qui la recouvre (au compas, grâce à l'exception 4), ou, au rapporteur
   (le prof l'ajoute à `outils:`, seule droite qui l'admet ; le juge, qui ne voit pas la palette, admet
   un repère pour toute bissectrice), un côté d'angle tiré de O à 1° près.
   Messages, première cause : pas de droite par O (« Trace la bissectrice de l'angle AOB, depuis son
   sommet O. », ou, si une droite entre dans l'angle, « Ta bissectrice doit partir du sommet O. ») ;
   un côté seulement repassé ou prolongé : le même message ; droite par O à l'œil (« Ta bissectrice est tracée à l'œil… ») ; perpendiculaire à la bissectrice
   (« Ta droite partage l'angle voisin, pas l'angle AOB : pique le compas sur [OA) et [OB). ») ; sinon
   « Les deux angles ne sont pas égaux… ». Correction : les deux demi-angles codés du même signe, l'arc
   en O et les deux arcs égaux en traits fins (`solutionBissectrices`). Vérification
   `cercle c = <expression>` (`construction/circle.ts`, lot 3b du chantier) : un des cercles de l'élève
   (compas, ou report depuis le lot 9 : même centre, rayon = l'écartement) recouvre le cercle que donne l'expression (même centre, même rayon ; `expected.circles`) ;
   ses autres cercles et ses droites sont des traits de construction. Le cercle doit être construit
   (règle ci-dessus) ; centre non construit : « Ton cercle est tracé à l'œil : construis son centre avec tes
   instruments. » ; le bon cercle, centre construit mais compas ouvert à l'œil (toucher libre pile au bon
   rayon) : « Ton compas est ouvert à l'œil : ouvre-le jusqu'à un sommet du triangle. ». Seul le centre
   décide du « à l'œil » pour le cercle essayé : bon centre construit et compas ouvert à la main → « bon
   centre ».
   Le cercle essayé, pour le message : parmi ceux qui ne sont pas centrés sur un sommet (arcs des
   médiatrices), celui qui a le bon centre, sinon celui qui passe par le plus de sommets (à égalité, le
   dernier) ; aucun → « Trace le cercle circonscrit au triangle ABC. ». Messages ensuite : « Ton cercle a
   le bon centre mais ne passe pas par les sommets du triangle. », « Ton cercle passe par A et B mais pas
   par C. », « Ce n'est pas le cercle circonscrit au triangle ABC. ». Erreurs de l'auteur : expression
   qui ne se calcule pas ou ne donne pas un cercle, autre chose que `cercle_circonscrit(A, B, C)` ou un cercle de centre donné (ci-dessous),
   quadrillage (aussi refusé par le parseur), centre hors de la fenêtre, cercle qui sort de la fenêtre,
   sommet invisible, moins de deux médiatrices constructibles dans la fenêtre (`circumcenterSupportError`,
   même règle que `mediatriceSupportError` côté par côté ; aussi pour le centre seul), deux vérifications
   pour le même cercle, centre déjà dans la figure (point nommé ou bout d'un trait : rien à construire).
   Mêmes règles de mélange et de palette que `droite`. Correction : le cercle et son
   centre en pointillés, les médiatrices de deux côtés constructibles en traits fins (`solutionCircles`).
   Cercle de centre donné (chantier `cercle-triangle-rectangle`, n° 19, 2026-11-08) : `cercle c =
cercle(O, passant=A)` (palette : le compas ; papier uni ou quadrillage, O et A sur des nœuds) et `cercle c
= cercle(O, rayon=distance(D, E))` (palette : compas, report ; papier uni seulement, refusé sur
   quadrillage par le parseur). Lecture des deux formes : `centeredCircleOf` (`ubumark/types/construction.ts`).
   Juste : un cercle de l'élève qui recouvre le cercle attendu, construit (sur quadrillage, tout cercle
   tracé l'est : les touchers vont aux nœuds). Sinon, dans l'ordre : bon cercle au point de passage non
   construit → « Ton compas est ouvert à l'œil : ouvre-le jusqu'à A. » (rayon : « … prends l'écartement DE
   avec le Report. ») ; aucun cercle → « Trace le cercle de centre O passant par A. » (« … et de rayon
   DE. ») ; aucun cercle centré en O → « Pique ton compas en O. » ; sinon « Ton cercle a le bon centre mais
   ne passe pas par A. » (« … mais pas le bon rayon : reporte la longueur DE. »). Erreurs de l'auteur :
   point nommé invisible, cercle qui sort de la fenêtre, centre ou point de passage hors des nœuds sur
   quadrillage. Correction : le cercle et son centre, sans médiatrice. Le cercle attendu de `rayon=` : la
   distance intérieure porte aussi le nom interne, `expectedPoints` prend l'élément qui est un cercle.
   **Rayon donné en cm** (chantier `regle-graduee`, PR 3, décision Q12) : `cercle c = cercle(O, rayon=4 cm)`
   (aussi `3,5 cm`, `3 cm 5 mm`, `35 mm`, au mm près ; `CenteredCircle.kind = 'longueur'`, lu par
   `readLengthText`, partagée avec le segment de longueur donnée). Palette Règle graduée · Compas
   (`centeredCircleTools`), rien d'autre ; la Règle graduée est l'outil de départ. Le cercle attendu : O de
   la figure, rayon = longueur / 10 (1 unité = 1 cm, ADR 0036 ; le langage des figures n'a pas d'unité,
   `expectedPoints` le calcule à part). La règle se pose comme pour le segment ; au compas, avec la règle
   posée, le 2e toucher (l'ouverture) s'aimante à la graduation du mm la plus proche avant tout point, ‹ ›
   décalent l'ouverture du dernier cercle piqué au 0 (`nudgeRulerEnd`, `shape: 'cercle'`). Juste : un cercle
   de centre O dont le point d'ouverture est sur une graduation (1 mm au moins) d'une règle posée avec son
   0 en O **posée avant le cercle** (revue de #2494 : sinon un compas aimanté à un point visible à 4 cm, puis une règle posée après, serait juste), égale au rayon demandé (`judgeRuled`). Messages, dans l'ordre : « Trace le cercle de centre O
   et de rayon 4 cm. », « Pique ton compas en O. », « Trace un seul cercle de centre O. » (plus de rayons
   distincts en O que de cercles attendus en O, comme Q9 ; « Trace seulement les 2 cercles de centre O demandés. » s'il y en a plusieurs ; le même cercle tracé deux fois n'en fait
   qu'un), « Ton compas est ouvert à l'œil : ouvre-le sur une graduation de la règle. », « Ton cercle a un
   rayon de 3,8 cm au lieu de 4 cm. » (unité de l'auteur). Cercles concentriques attendus (une ligne par
   cercle) : chacun juge le cercle de l'élève qui a son rayon, sinon celui qui n'a le rayon d'aucun cercle
   attendu. Les cercles d'un autre centre : traits de construction. Un segment, une droite, un point, un
   Report : faux, sans message. Erreurs de l'auteur : quadrillage, fenêtre absente, O absent ou invisible,
   rayon plus grand que la règle (`rulerLengthOf`), cercle qui sort de la fenêtre ; au parseur : longueur
   pas au mm près ou nulle, outil hors de la palette, règle graduée ou compas absents, mélange avec une
   autre vérification qu'un cercle. Correction (`solutionRulers` → `circleLengthRulers`, `solutionCircles`) :
   une règle par centre, posée en O, dans la direction de la dernière règle de l'élève posée en O, sinon vers la
   droite, et le cercle.
   Vérification `triangle ABC : AC = u ; BC = v` (`construction/triangle.ts`, lot 4 du chantier) : [AB]
   est tracé, les longueurs de [AC] et [BC] viennent d'un segment nommé de la figure ou de deux points
   visibles (`AC = AB`). L'élève trace [AC] et [BC] (segments partant de A et de B) ; C = leur bout
   commun, qui doit être l'intersection de deux cercles (compas ou report) CONSTRUITS (règle ci-dessus,
   de proche en proche). Les deux C, de
   part et d'autre de (AB), sont justes ; cercles et droites en trop ignorés ; un point dans la réponse :
   faux, sans message. Messages, dans l'ordre : « Trace les côtés [AC] et [BC] du triangle. », « Il
   manque le côté [BC]. », « Tes côtés [AC] et [BC] doivent se rejoindre en C. », « Ton sommet C est
   placé à l'œil : construis-le avec ton compas. » (même pile au bon endroit, ou compas ouvert à l'œil au
   bon rayon), « Ton côté [AC] n'a pas la bonne longueur. » (puis [BC]). Erreurs de l'auteur : A ou B
   absent, invisible ou hors de la fenêtre, C déjà dans la figure, longueur qui n'est ni un segment
   visible dans la fenêtre ni deux points visibles, longueurs qui ne font pas un triangle (cercles de
   centres A et B qui ne se coupent pas en deux points), les deux C hors de la fenêtre, quadrillage
   (aussi refusé par le parseur). Seul dans la figure ; palette Segment · Compas · Report · Règle
   (`PLAIN_PAPER_TOOLS.triangle`). Le générateur exige que A, B et les longueurs soient nommés dans la
   figure, pas C (à construire). Correction : [AC] et [BC] en pointillés vers le C le plus proche du
   tracé de l'élève (sinon le plus haut, aussi à égalité), arcs de report (centre A rayon AC, centre B
   rayon BC) en traits fins, longueurs codées (une marque sur [AC] et sa longueur donnée, deux sur [BC]
   et la sienne ; `solutionTriangle`).
   Angles donnés (lot 7) : `triangle ABC : CAB = 40 ; ABC = 65` (un côté et deux angles, `angles` de
   `TriangleCheck`, sommet A ou B, mesure entière 1..179, somme < 180, `BAC` admis pour `CAB`) ou
   `triangle ABC : AC = u ; CAB = 40` (deux côtés et l'angle compris : l'angle au bout du côté donné).
   Palette `triangleTools` : Rapporteur · Règle · Segment, plus Report · Compas avec une longueur. L'élève
   pose le rapporteur en A sur [AB), place un repère, trace à la règle la droite de A au repère (côté
   d'angle, construit), de même en B (ou reporte la longueur en A), puis [AC] et [BC]. C doit être au
   croisement de deux côtés d'angle, l'un parti de A, l'autre de B (`angleSideVertex`), ou du côté
   d'angle et d'un cercle construit centré au même sommet : un point construit par les exceptions de
   la règle ci-dessus ne suffit pas ; un cercle ou un report sans longueur donnée : faux, sans message.
   Messages, après ceux du lot 4 : « Ton sommet C est placé à l'œil : trace ses côtés avec le
   rapporteur. », « Tes deux angles sont tracés de part et d'autre de [AB] : trace-les du même côté. »
   (repères de côtés opposés ET un angle faux), « Ton angle ABC mesure 115° au lieu de 65° : tu as lu la
   mauvaise graduation du rapporteur. » (180 − a, repère du côté de C), « Ton angle CAB mesure 45° au
   lieu de 40°. », puis la longueur. Erreurs de l'auteur, en plus : fenêtre trop allongée
   (`protractorWindowError`), rapporteur qui ne tient en A ou en B d'aucun côté de (AB), ou pas du même
   côté aux deux sommets, A et B confondus. Correction : les côtés vers un C où le rapporteur tient, les
   angles codés (`TriangleCorrection.angles`, dessinés comme l'arc du lot 5).
   Triangle rectangle (chantier `cercle-triangle-rectangle`, n° 20, 2026-11-08) : un angle de 90°
   (`rightAngleOf`) se construit à l'équerre, pas au rapporteur, seul (`CAB = 90`) ou avec la longueur du
   côté qui le porte (`CAB = 90 ; AC = u`, `AC = AB`) ; jamais l'hypoténuse ni un autre angle (refus du
   parseur). Papier uni, palette Segment · Équerre (· Report) : C doit être sur une droite construite par
   le sommet de l'angle droit, puis (côté donné) au croisement de cette droite et d'un cercle construit
   centré au même sommet. Quadrillage (le seul triangle admis sur quadrillage), palette Segment : A et B
   sur des nœuds ; `AC = 3 carreaux` (`TriangleLength.squares`, `isSquaresLength`, 1..50) demande [AB]
   sur une ligne du quadrillage, `AC = AB` admet l'oblique, `CAB = 90` seul : C sur un nœud de la
   perpendiculaire ; `AC = u` y est refusé (le report se fait sur papier uni), les carreaux sans
   quadrillage aussi. Juste si un C convient ; sinon le message du C le plus avancé : côtés manquants
   (lot 4), « Ton côté [AC] est tracé à l'œil : utilise l'équerre. » (papier uni, C sur aucune droite
   construite par A), « Ton angle en A n'est pas droit : trace la perpendiculaire à (AB) avec
   l'équerre. » (quadrillage : « Ton angle en A n'est pas droit. »), « Ton sommet C est placé à l'œil :
   construis-le avec ton compas. » (hors du croisement du report), puis la longueur (« Ton côté [AC]
   mesure 4 carreaux au lieu de 3. » en carreaux). Hors palette (point, compas) : faux, sans message.
   Erreurs de l'auteur, en plus : A ou B hors d'un nœud, [AB] oblique avec des carreaux, C hors de la
   fenêtre ou hors d'un nœud, aucun nœud de la perpendiculaire dans la fenêtre. Correction : les côtés,
   l'angle droit codé d'un petit carré (`TriangleCorrection.rightAngles`) et, sur papier uni, la
   perpendiculaire (`guides`) et l'arc de report en traits fins ; angle droit seul : vers le C de
   l'élève ramené sur la perpendiculaire. Le générateur ne demande aucun nom pour une longueur en
   carreaux.
   **Côté coté en cm** (chantier `regle-graduee`, PR 4) : `triangle ABC : CAB = 90 ; AC = 4 cm` (aussi
   `3,5 cm`, `3 cm 5 mm`, `35 mm`, au mm près ; `TriangleLength` `{ length, unit }`, `isRuledLength`),
   papier uni, palette Segment · Équerre · Règle graduée exactement (`triangleTools`) ; les cm sans
   l'angle droit ou sur quadrillage sont refusés par le parseur, un côté plus long que la règle
   (`rulerLengthOf`) à la publication. Un seul triangle (Q17) : plusieurs C distincts (un de chaque côté
   de (AB) compte pour deux, un même C atteint deux fois pour un) → « Trace un seul triangle ABC. ».
   Même ordre que ci-dessus, le croisement du report remplacé par la graduation, lue au bout du trait
   vu depuis le sommet (`seenSegments` du segment de longueur donnée, Q18 : [AC] prolongé au-delà de C
   mesure ce qu'il montre) : C sur une graduation d'une règle posée avec son 0 au sommet de l'angle droit **avant le
   premier côté qui arrive en C** (`ruledGraduationOf`, comme le cercle de #2494), sinon « Ton point C
   est placé à l'œil : arrête [AC] sur une graduation de la règle. » ; puis « Ton côté [AC] mesure
   3,8 cm au lieu de 4 cm. » (dans l'unité de l'auteur). Report : hors palette, faux sans message.
   Correction : la règle posée au sommet le long de la perpendiculaire, vers le C de la correction
   (`triangleRuler`, par `solutionRulers`), sans arc ni codage de longueur.
   Vérification `angle AOy = 50` (`construction/angle.ts`, lot 5 du chantier) : [OA) est donné (A, O
   nommés et visibles, `points` = A puis O) ; y nomme le côté à tracer (messages seulement) ; mesure
   entière de 1 à 179 (parseur). L'élève pose le rapporteur (outil `rapporteur` : centre, puis un point
   de la base ; Retourner change de côté), place des repères (`repere(…)`, graduation entière 0..180
   comptée depuis la base, à `r` du centre : `repereAt`), puis trace au segment le côté de O au repère.
   Un repère est un point construit si le centre l'est et si le point de la base l'est ou est posé sur
   un trait droit construit qui passe par le centre (`constructionOf`, `isBuiltMark`). Juste : un segment
   partant de O, autre bout construit, à la mesure donnée (1e-6 degré), d'un côté ou de l'autre de (OA) ;
   le côté donné repassé ne compte pas ; un point, une droite ou un cercle : faux, sans message ; un
   repère dans une case qui n'est ni un angle ni un triangle à angle donné : faux, sans message (`judgeConstruction`). Messages, dans
   l'ordre : « Trace le côté [Oy) de l'angle, depuis le sommet O. », « Ton côté est tracé à l'œil : place
   un repère avec le rapporteur. », « Ton angle mesure 130° au lieu de 50° : tu as lu la mauvaise
   graduation du rapporteur. » (180 − a), « Ton angle mesure 45° au lieu de 50°. ». Erreurs de l'auteur :
   O ou A absent, invisible ou hors de la fenêtre, O et A confondus, y déjà un point de la figure,
   quadrillage, fenêtre plus de deux fois plus large que haute ou l'inverse (`protractorWindowError`,
   rapporteur illisible sur un petit écran), demi-rapporteur posé en O qui sort de la fenêtre d'un côté
   de (OA) comme de l'autre (rayon `protractorRadiusOf` : 0,35 du plus petit côté de la fenêtre ; seuls
   les côtés où il tient comptent pour la correction).
   Seul dans la figure ; palette Rapporteur · Segment (`PLAIN_PAPER_TOOLS.angle`) ; le rapporteur est
   refusé dans toute autre vérification que `mesure` et un triangle à angle donné (lot 7). Correction : [Oy) en
   pointillés du côté où l'élève a tracé (sinon le sens trigonométrique), l'arc de l'angle codé de sa
   mesure (`solutionAngle`). Écran : le rapporteur (`constructions-v2/.../Protractor.svelte`) a le même rayon (`protractorRadiusOf`) ; ‹ › décalent le dernier repère d'un degré (sans repère,
   en posent un) ; au clavier, le rapporteur a le focus (`role="slider"`), flèches ±1°, Maj ±10° ;
   « Effacer » retire ses repères, puis le lève.
   Vérification `mesure AOB` (`construction/measure.ts`, lot 6) : l'angle est tracé ; l'élève le mesure
   au rapporteur (le rapporteur seul, `PLAIN_PAPER_TOOLS.mesure` ; repères jamais notés) et tape la
   mesure sous la figure (case « Mesure de l'angle AOB », chiffres seulement, trois au plus). Réponse :
   les repères puis `mesure(50)` en dernier (`splitMeasuredAnswer`, `serializeMeasuredAnswer`) ; une
   mesure ailleurs, deux fois, ou un autre objet qu'un repère : faux, sans message ; une mesure dans une
   autre case figure : illisible, donc fausse. La mesure attendue est **calculée sur la figure** (angle
   AOB arrondi au degré) ; juste : exacte ; messages : « L'angle mesure 50°, pas 130° : tu as lu la
   mauvaise graduation du rapporteur. » (180 − a), « L'angle mesure 50°, pas 45°. », et sans mesure
   tapée (repères seuls) « Tape la mesure de l'angle AOB, en degrés. » ; rien du tout : vide. Erreurs de
   l'auteur : quadrillage, fenêtre trop allongée (même règle), point absent, O invisible ou hors de la
   fenêtre, A ou B confondu avec O, mesure à plus de 0,01° d'un entier (« placer B avec rotation(A,
   angle=…, centre=O) »), angle nul ou plat, côté [OA) ou [OB) non tracé (segment, demi-droite ou droite
   de la figure) ou arrêté avant le bord du rapporteur, rapporteur posé en O qui ne tient ni sur [OA)
   côté B ni sur [OB) côté A. Correction : l'arc de l'angle codé de sa mesure (`solutionAngle`), aucun
   trait. Énoncé masqué d'une évaluation : `verifier: mesure AOB` reste tel quel (l'écran en tire la
   case) ; chaque point nommé défini par un calcul est réécrit `B = point(x, y)` (6 décimales,
   `visible=faux` gardé, autres réglages d'affichage perdus), car `rotation(A, angle=50, …)`
   dirait la réponse ; une `rotation(` ou un `angle=` restés dans la figure → la garde refuse l'envoi.
   `verifier: mesure AOB, rapporteur posé` (lot 8, `MeasureCheck.posed`) : le rapporteur est déjà
   posé (`posedProtractorOf`) en O, base sur le **premier côté nommé** ([OA) pour `AOB`, [OB) pour
   `BOA`), corps du côté de l'autre, rayon du § 18 ; figé : ni palette, ni Effacer, ni zone de tracé
   (`drawable` faux dans `FigureACompleterView`), la consigne « Lis la mesure sur le rapporteur, puis
   tape-la sous la figure. » ; il reste dessiné à la correction et dans la réponse attendue, et il est
   imprimé dans l'énoncé PDF (`ubumark/generators/protractor-typst.ts`, appelé par `figure-typst.ts`
   avec la même pose ; option `overlay` de `exportToTypst` : au-dessus des objets, corps translucide
   comme à l'écran, pour qu'aucun côté ne cache le nombre à lire). Même juge,
   mêmes messages. En plus : `outils:` refusé ; la pose demandée qui sort de la figure, l'autre tenant →
   « écrire « mesure BOA, rapporteur posé » ». La garde du masquage admet le suffixe.
   Vérification `segment AB = 6 cm` (`construction/segment-length.ts`, chantier `regle-graduee`,
   CE2-039, [ADR 0036](../adr/0036-le-cm-de-la-figure.md)) : A est un point de la figure (nommé, visible,
   dans la fenêtre), B nomme l'autre bout (messages seulement, absent de la figure) ; la longueur
   s'écrit `6 cm`, `5,3 cm`, `5 cm 3 mm` ou `72 mm`, lue en millimètres entiers (`SegmentLengthCheck.length`,
   plus de 0 ; `unit` garde la forme de l'auteur pour les messages, `formatLength`). **1 unité de la
   figure = 1 cm** : la règle (`constructions-v2/.../Ruler.svelte`, une grande graduation par unité)
   est dessinée au `pixelsPerUnit` de la figure, pas en vrai centimètre. Sa longueur (`rulerLengthOf`) :
   le plus grand côté de la fenêtre, en cm entiers, 20 cm au plus (le double décimètre), la même à
   l'écran et au refus. L'élève pose la règle (outil `regle` : le 0, puis un point de la direction,
   aimantés comme le centre du rapporteur), qui entre dans la réponse (`regle(ox;oy;bx;by;sens)`,
   `DrawnRegle` : la dernière est la règle posée, `currentRuler` ; la reposer sans rien tracer depuis la
   remplace) ; au segment, le départ va à un point nommé (A, le 0), sinon à une graduation ; le bout, près
   du bord, va d'abord à la graduation du millimètre la plus proche (`rulerGraduationNear`, dans la
   fenêtre : les petites longueurs se tracent au toucher), sinon à un point, sinon à l'aimantation des
   instruments ;
   ‹ › (et les flèches, la règle ayant le focus, Maj ±1 cm) décalent d'1 mm le bout du dernier segment
   le long de la règle, entre 1 mm et la dernière graduation dans la fenêtre (sans segment, en tracent
   un depuis le 0, `nudgeRulerEnd`) ; Retourner change le bord (`flipRuler`, `sens`) ; « Effacer » retire
   le segment, puis la règle. Direction libre. On juge **le segment que l'élève voit** (`seenSegments`,
   revue de #2485) : les segments partant de A dans une même direction (à 2° près) et ceux qui les
   prolongent ou les recouvrent de proche en proche n'en font qu'un, jugé par son bout le plus loin (6 cm
   puis 7 cm superposés, ou une rafale de longueurs : le plus long ; A → 5 cm puis 5 → 6 cm : 6 cm) ; deux
   directions opposées ou un segment qui passe au-delà de A : A au milieu, pas un segment depuis A. Juste :
   ce bout sur une graduation (1 mm au moins, la règle entière au plus) d'une règle posée avec son 0 en A
   (`rulerGraduationOf`), égale à la longueur demandée en millimètres entiers ; plusieurs segments vus
   depuis A, dans des directions distinctes : faux (décision Q9 de David). Messages, dans l'ordre : « Trace
   le segment [AB] depuis le point A. », « Trace un seul segment [AB] depuis le point A. », « Ton segment est tracé à l'œil : arrête-le sur une graduation de la règle. », « Ton
   segment mesure 5,8 cm au lieu de 6 cm. » (dans l'unité de l'auteur : `58 mm`, `5 cm 8 mm`). Une droite,
   un point, un bout hors de la fenêtre : faux, sans message ; une règle dans une autre vérification :
   faux, sans message (`judgeConstruction`). Erreurs de l'auteur : quadrillage, fenêtre absente, A absent,
   invisible ou hors de la fenêtre, B déjà un point de la figure, un autre point visible déjà à la longueur
   demandée de A (l'élève n'aurait qu'à tracer [AC]), longueur plus grande que la règle, ou
   qui ne tient dans la fenêtre depuis A dans aucune direction (coin le plus loin). Seul dans la figure ;
   palette Règle graduée · Segment (`PLAIN_PAPER_TOOLS.segment`), la règle graduée refusée dans toute
   autre vérification, sauf le cercle de rayon donné en cm (PR 3, ci-dessus). Correction (`solutionRuler`, `solutionLines`) : la règle posée en A et le segment
   en pointillés, dans la direction de la dernière règle de l'élève posée en A, sinon de son segment,
   sinon vers la droite, la gauche, le haut, le bas, le coin le plus loin (la première où il tient).
   **Le long d'une demi-droite donnée** (décision Q7, PR 2 du chantier) : `segment AB = 6 cm sur [Ax)`,
   x le nom d'une demi-droite de la figure d'origine A (`x = demidroite(A, X)`, `SegmentLengthCheck.ray` ;
   `FigureLine.kind` dit droite, demi-droite ou segment). Au 2e toucher, la règle s'aimante à la
   demi-droite comme à tout trait (`snapWithInstruments`). Après « un seul segment », le bout du segment
   vu doit être sur [Ax), au-delà de A (à la tolérance près) : sinon « Trace ton segment sur la
   demi-droite [Ax). » (autre direction, prolongement derrière A, règle posée à l'œil) ; puis tracé à
   l'œil, longueur. Erreurs de l'auteur en plus : demi-droite absente, pas une demi-droite d'origine A,
   invisible, de longueur nulle (second point sur A), le segment qui n'y tient pas dans la fenêtre, ou
   un croisement (ou un bout) de traits de la figure sur [Ax) à la longueur demandée de A (revue). Correction : la règle le long de [Ax),
   quelle que soit celle de l'élève.
   **Papier uni (lot 2b)** : sans `grille:`, `point` et
   `symetrique` reçoivent une palette d'instruments (`PLAIN_PAPER_TOOLS`) ; équerre = perpendiculaire à
   une droite choisie par un point (écrite `droite(…)`), compas = cercle par son centre et un point
   (`cercle(…)`), report (lot 4) = deux touchers prennent l'écartement, chaque toucher suivant pique un
   cercle de ce rayon (`report(…)`, écartement gardé pour juger s'il est construit ; reprendre Report ou
   changer d'outil le lâche, « Effacer » sans cercle aussi) ; le Compas, lui, ne garde aucun écartement
   (chaque cercle se règle par son centre et un point) : deux cercles égaux à rayon libre se tracent au
   Report ; la palette de `point` le reçoit (4e
   sommet) ; chaque toucher s'aimante sur un point nommé, puis une intersection de deux traits ou un bout
   de segment (de la figure ou de l'élève, `SnapTargets.ends` : le plus proche du toucher l'emporte),
   puis un trait (`instruments.ts`), en pleine précision : une construction exacte arrive exacte au juge
   (1e-9 près). Les tests de juge tracent par de vrais touchers (`addTap`, `drawing.ts`) et ceux
   d'écran par des touchers sur la vue, jamais par une réponse écrite à la main : seul ce chemin passe
   par l'aimantation et le registre des traits construits. Correction (point) : chaque point en pointillés avec son
   nom ; symétrique : [AA'] codé (angle droit pour un axe, une marque sur chaque moitié). Réponse illisible ou démesurée
   (`CONSTRUCTION_ANSWER_LIMITS`) → faux sans message. Les positions des points viennent d'un
   **registre** (`constructionPositions`), comme le PDF des figures : le juge reste léger (sans lui,
   geometry-core ajoutait ~430 Ko minifiés à toutes les pages qui génèrent une question). Il est
   inscrit par `construction/positions-setup.ts`, importé par `test-spec-runner.ts`,
   `server/grading-budget.ts` et `server/corrected-detail.ts` (garde :
   `server/__tests__/construction-correction-serveur.test.ts`) et par la vue de saisie
   (`FigureACompleterView.svelte`). Sans inscription : exception, que `validateAnswer` rend dans
   `message` — et que `validateAnswerDetailed` rend en `incorrect`. Une page qui juge sans avoir
   monté la vue (copie corrigée rechargée, `CorrectionCard`) charge d'abord le calcul à la demande
   (`loadConstructionPositions`) : pendant le chargement, la consigne et un cadre `aria-busy` ;
   chargement impossible → la bonne droite seule, sans verdict (gardes :
   `figure-a-completer-correction.svelte.test.ts`, `…-correction-echec.svelte.test.ts`).
   Case « figure » **mêlée à d'autres cases** (une droite à tracer, puis une case texte ; CP-058 l'était avant de passer, au lot 3 de
   `figure-et-choix`, à une figure de travail et une case choix) :
   le message global est celui du juge si la figure est fausse (avant « Tu n'as pas tout complété. »),
   sinon aucun — jamais « Les blancs suivants sont incorrects » (`aggregateOrderedBlanks`) ; la liste
   « Blanc N : » sous l'énoncé ne le répète pas et numérote sans compter la figure. Valider reste grisé tant que la figure est vide, à l'entraînement (`FlashCard`,
   qui accepte sinon les cases vides) comme en évaluation (`QuestionCard`) ; le temps écoulé avec
   la figure vide donne « Tu n'as pas tout complété. » et **0 point, jamais ½** : « oui » tapé
   sans vérifier est un pari (décision de David, 2026-10-26 ; `aggregateOrderedBlanks` et
   `gradeBlanks`). Dans la copie corrigée, la figure vient d'abord, comme dans l'énoncé (gardes :
   `figure-a-completer-mixte.svelte.test.ts`, `expected-result-figure.test.ts`).
   Case « choix » (`blank.choice`), juste après la figure : `statusFromChoices` sur la réponse
   (« 0;2 », indices d'origine) — rien coché → `empty`, un mauvais coché → faux (« Le choix correct
   est: B », lettre **affichée**), tous les bons → juste, bons seulement mais pas tous → `unoptimal_form`
   (« Il manque des réponses. »). Réponse illisible, hors bornes ou répétée → fausse. Une case choix
   cochée en partie rend la question **non juste** (`isCorrect` faux) et, au barème, un ½ **partiel**
   (`gradeBlanks`, à revoir pour le SRS) : une question réduite à une case choix est notée
   exactement comme l'ancien QCM ; mêlée à d'autres cases, le barème des cases (`statusFromBlankStatuses`).
   Évaluation notée : la version publique (`PublicBlank.choice`) ne donne que les choix dans l'ordre
   affiché ; le navigateur envoie des positions affichées, que le serveur ramène aux indices
   d'origine avant de corriger et d'enregistrer (`toOriginalChoiceValues`, dans
   `submitEvaluationAttempt`) ; illisible → 400, rien d'écrit.
1. **`validationRules`** (précondition) : `divisor`, `multiple`, `range`, `equation_root`,
   `equivalent`, `predicate` (`isPrime`, `isEven`…), `custom`. Une règle violée → faux, avec son
   message français. `rulesSuffice` : les règles **décident seules**, `expectedAnswer` n'est plus
   qu'un exemple (« une réponse possible ») ; une case `rulesSuffice` sans règle est refusée
   (`rules-suffice.ts`).
2. **Valeur** : équivalence (`areEquivalent`, avec les hypothèses `answerAssumptions` du modèle,
   ADR 0012) ou valeur numérique (`precision` : `decimal`, `significant`, `magnitude`,
   `tolerance`), grandeur, `angleModulo: '2pi'`. Arrondi : plus de chiffres que demandé mais bon
   arrondi → `bad_form` (contrainte `rounding`, non réglable, message « Arrondis au … ») ; moins de
   décimales accepté si la valeur est exactement l'arrondi.
3. **`requiredForm`** : `product`, `sum`, `additionOnly`, `fraction`, `power`, formes d'équation,
   formes complexes (`exponentielle`, `algebrique`), ou motif `{ pattern, acceptable? }`
   (motifs `mathAST/pattern`). Violée → `bad_form` ; forme `acceptable` → `unoptimal_form`.
   Virgule nue (`0,5n`) décimale comme `0{,}5n`, sauf écriture à virgule séparatrice
   (`mathAST/decimal-comma`).
4. **Forme** selon la case : texte → rien ; `requiredForm` → seulement les violations cosmétiques ;
   grandeur → la partie numérique (`studentValueLatex`, la saisie sans ses unités : `2\times3`
   pour `2\times3\,m`) doit être un nombre simple, une fraction ou une notation scientifique ; `precision` / `rulesSuffice` →
   nombre simple (fraction admise en `rulesSuffice`) — `isSimpleNumberLatex` : un nombre, un signe ; entre
   parenthèses inutiles (`(-3)`), il reste juste mais perfectible (`brackets`) ; un séparateur décimal sans
   chiffre d'un côté (`.5`, `5{,}`) est `bad_form` (BIPM § 5.4.4), y compris dans une fraction ou une
   notation scientifique (décisions de David du 2026-10-21) ; `acceptCombinatorialNotation`,
   `acceptDecimal`, `angleModulo` → exceptions documentées dans `types.ts` ; sinon **mode exact** :
   `checkFormUnified` passe réponse et attendu dans le même pipeline de retouches cosmétiques
   (`cosmetic-transforms.ts`) puis les compare.

Contraintes réglables (`options.constraints`, `ConfigurableConstraintId`) : `spaces`, `products`,
`brackets`, `zeros`, `form`, `nullTerms`, `factorOne`, `factorZero`, `signs`, `reducedFractions`,
`reducedRadicals`, `percent`, `unit`, `intervalForm`. Mode `strict` → `bad_form`, `warn` →
`unoptimal_form`, `off` → ignorée. Défaut `warn` (`DEFAULT_CONSTRAINT_MODE`), **sauf `form`,
`strict`** (`DEFAULT_FORM_CONSTRAINT_MODE`, ADR 0013 : sinon `400+80` passait pour `480`).

**Espaces de groupement** (`spaces`) : règle du BIPM par défaut, l'espace est facultative jusqu'à
4 chiffres (`7900` et `7 900` justes) et exigée dès 5 (`30000` remarqué), chaque côté de la virgule
à part. Un modèle de numération garde la règle de l'école avec la case « Espaces dès 4 chiffres »
(`options.constraints.spacesFromFourDigits`, à côté de `allowBracketsInFirstNegativeTerm`) : le
juge exige alors `7 900`, et l'affichage de la question écrit `7 900` (contexte
`content-digit-grouping.ts` posé par `QuestionCard`, `FlashCard`, `CorrectionCard`,
`CourseCardView` ; valeurs préremplies ; séries d'automatismes figées). Décision E2,
`docs/archive/wip/simplify-carte-progress.md` § 15 et § 43.

**Case à construire ou à placer** (`blank.construire` : ` ```collection ` / ` ```monnaie `
`construire:`, ` ```line ` `placer:`, barres…) : seule la valeur est jugée, jamais la forme. La
réponse est écrite par le composant (`4635`), pas tapée par l'élève : ni espaces de groupement, ni
aucune autre contrainte d'écriture (`validateSingleBlank`, et `matchedAnswerForm` en ordre libre).
Les juges à part (horloge, repère, cubes…) rendaient déjà `correct` sans forme.

**Lecture des formules** : réponse de l'élève et réponse attendue sont lues par le parseur avec la
même configuration, `readingOf(instance)` (`formula-reading.ts`) : fonctions déclarées et sens de
`AB` (`capitalPairs`), transmis à `areEquivalent`, `checkForm`, `requiredForm` et à la règle
`equivalent`. Les chaînes `equation`, `vecteur`, `matrice`, `intervalles`, `calculus` ne le
reçoivent pas (aucune réponse attendue à majuscules collées en base).

Plusieurs cases : positionnelles par défaut ; `options.orderIndependent` → appariement maximal
réponses ↔ cases (pas glouton). `validateAnswerDetailed` rend le verdict par case qu'utilise la
correction.

Où la validation tourne : **dans le navigateur** partout (ADR 0001 : le serveur reçoit un verdict),
**sauf les évaluations notées**, corrigées par le serveur avec la même fonction (ADR 0015), sous un
budget de temps (`gradeWithinBudget`, 5 s par envoi) ; barème `gradeQuestion` / `gradeOutOf20`
(1, ½ ou 0 par question, note sur 20 au demi-point).

### 6. Résultat attendu (premier niveau de correction)

`buildExpectedResult` décrit, en données sans couleur, ce que l'élève voit d'abord : `3 + 5 ≠ 9`
puis `= 8` encadré, l'énoncé rempli par les solutions, « Ta réponse : » case par case, les choix
d'une case choix (bon / coché à tort / oublié, à leur place dans l'énoncé), les remarques de forme. Spécification R1–R10 :
[resultat-attendu-progress](../archive/wip/resultat-attendu-progress.md). Pur et sans exception
(R10). Rendu par `ExpectedResultView.svelte` ; la réponse de l'élève passe par
`student-answer-safety.ts` dès qu'elle s'affiche chez un autre (copie lue par le prof).

Case « figure » : une ligne `figure` (texte du bloc, réponse brute `droite(…)`, jamais rendue en
markdown, lue par le juge borné) au lieu de « Réponse attendue : `droite(A;B)` ». `FigureAnswer.svelte`
la dessine en lecture seule : droites de l'élève (vertes si juste ; sinon la bonne droite en
pointillés par-dessus), ou la bonne droite seule sans réponse (R9) ; suivent le message du juge
(remarque) ou « Tu n'as rien répondu. ». Le bloc est retiré de l'énoncé rempli (`withoutFigureCases`) ;
s'il n'y a pas d'énoncé rempli (la figure est la seule case), la consigne seule au-dessus
(`showsInstructionOnly`, `instructionOf`) : la figure n'apparaît qu'une fois, au verso de la `FlashCard`
comme dans la copie corrigée, case « figure » mêlée à d'autres cases comprise.

Case à construire (bloc `collection ou `monnaie, `construire:`), horloge à placer (``horloge, `placer:` :
le cadran verrouillé avec les aiguilles de l'élève, ou à l'heure juste) ou droite à placer (``line,
`placer:` : la droite verrouillée sans boutons, point de l'élève ou point juste ; vide : « Tu n'as rien
placé. » ; droite à représenter, `representer:` : `NumberLineRepresenter` verrouillé avec l'intervalle
de l'élève et les phrases, ou l'intervalle juste en vert ; plusieurs points : UNE ligne `build` pour la droite, à la place de sa première case, avec
`answers` (réponse et statut de chaque point), juste quand tous le sont, « rien placé » quand aucun ne
l'est ; diagramme en barres à construire, ``barres `placer:`, de même : UN diagramme, `answers` par
barre, « Tu n'as rien posé. » quand aucune n'est construite ; `BarresPlacer` verrouillé avec les barres
de l'élève (et son échelle écrite, « Une graduation vaut 5. »), ou `StatChart` avec toutes les
barres justes (`solvedSpec` : à la bonne échelle quand elle était à choisir) ; boîte à moustaches à
construire, ``boite-a-moustaches `placer:`, de même : UNE figure, `answers` par trait ; `BoxPlotPlacer`
verrouillé avec les traits de l'élève, ou `StatChart` avec la boîte juste (`solvedBoxPlotSpec`) ; étiquettes à ranger, ``ranger, de même : UNE
ligne `build`, `answers` par place, et `expected` (la bonne position de chaque place, que le bloc ne dit
pas) ; `RangerPlacer` verrouillé avec les places de l'élève, fausses marquées, et le rangement juste
dessous ; repère à placer, ``courbe `placer:`, de même : UN repère, `answers` par point, « Tu n'as rien
placé. » quand aucun n'est posé ; `CourbePlacer` verrouillé avec les points de l'élève et ses phrases
`placedPointMistake`, ou le repère avec les points justes, nommés ; droite à tracer, ``courbe
`tracer:` : UNE case, `answer` = `x1;y1/x2;y2`, la droite de l'élève et sa phrase `tracedLineMistake`, ou
la droite juste et deux de ses nœuds, `solutionLine` ; vecteur à tracer, ``courbe `tracer: vecteur` : de même,
la flèche de l'élève et sa phrase `tracedVectorMistake`, ou la flèche juste, `solutionVector`) : une ligne `build` (genre, texte
du bloc sans `case:`, valeur posée), sur le même patron que la figure. `BuildAnswer.svelte` dessine le
plan **verrouillé, sans réserve** : la construction de l'élève (cadre vert si juste ; faux : « Tu as
posé 32 €. » ou « Ta collection vaut 32. » et une construction juste à côté), ou la construction juste
seule sans réponse (R9, verso de la flash-card) ou réponse vide (suivie de « Tu n'as rien posé. », propre à la case). Le plan vient après l'énoncé rempli (la figure, avant).
Le bloc est retiré de l'énoncé (`withoutBuildCases`), la consigne seule au-dessus. Seule la valeur est
gardée : la construction de l'élève est redessinée « le moins d'objets » (3 × 10 € deviennent 20 + 10 €).

Figure de travail : une ligne `work-figure`, **après** toutes les autres, plan d'une case à construire compris (jamais parmi les réponses
attendues ; `blankViews` l'ignore, `build` l'ajoute à la fin) : la figure de départ et les traits de
l'élève en gris, sans verdict ni bonne droite (`FigureAnswer` avec `work`) ; « Ta figure de travail :
aucun tracé. » sans tracé ; la figure de départ seule sans réponse (R9). Son bloc sort de l'énoncé
rempli (`withoutFigureCases`). Même ligne à l'entraînement, à la Course et dans la copie (carte
commune). À l'écran, après « Valider », ses traits restent gris (`FigureACompleterView`, `droite-travail`).
Garde : `expected-result-figure-de-travail.test.ts`.

Case « choix » : le bloc reste **à sa place** dans l'énoncé rempli ; la ligne `filled-statement`
porte `choiceCases` (par case : ses choix, leurs statuts, ordre affiché). À l'écran,
`ExpectedResultView` les pose par `ChoiceCasesScope` (contexte `choice-case-results`) et le bloc
(`ChoiceBlock` → `ChoiceList`) les affiche. « Ta réponse » est
écrite sans les blocs choix (`withoutChoiceCases`), et omise s'il ne reste aucune autre case :
les choix ne sont jamais montrés deux fois. `CorrectionCard` pose aussi les bons choix de la
réponse attendue seule (vue concise). Correction : `{{solution}}` d'une case choix = le texte de
ses bons choix, séparés par « ; ». Série figée (PDF) : `**a)** …` à la place du bloc, `Réponse : **b)** …`
dessous au corrigé ; le bloc compte pour une case.

### 7. Correction (concise / détaillée, étapes)

`QuestionCorrection` : `feedback` (correct / incorrect / partial), **mode A** `steps` (markdown
écrit par l'auteur, avec `{{solution}}`, `{{answer}}`… de `correction-placeholders.ts`) et **mode B**
`generatedSteps` (déclaratif : `arithmetic`, `arithmetic-from-blank`, `linear-equation`,
`quadratic-equation`, `linear-inequality`, `quadratic-inequality`, `rational-inequality`,
`differentiate`, `integrate`, `simplify` + intention, `limit`, `domain`). Les deux peuvent coexister :
**le mode A l'emporte à l'affichage**. Pour `limit`, l'expression et le point passent par
`dispatchPedagogicalLimit`, qui lit la **syntaxe maison** (`parseCustomSafe` : `(x^2-4)/(x-2)`,
`e^x/x`, `ln(x)`) et non le LaTeX : `\frac{1}{x}` y est une erreur de lecture, donc un repli
silencieux sur le mode A (seul le point accepte aussi `\infty`, `+\infty`, `-\infty`).

Mode B : `generateCorrection` résout les variables, appelle le pipeline `pedagogical-*` et range
les étapes dans `correction._renderedSteps`. Les étapes de `linear-equation`,
`quadratic-equation`, `quadratic-inequality` et `rational-inequality` sont écrites comme la
réponse (`stepsAsShown`, lot 5f-4 et Q50 : décimaux tapés gardés, `S = {−√2/2 ; √2/2}`,
`x² − 0,3x − 0,1 < 0` → `b = −0,3`, `S = ]−0,2 ; 0,5[` ; détail dans `mathast/README.md`). Si le pipeline lève une erreur (expression
illisible, dénominateur nul du calcul numérique…), `generateCorrection` la journalise et rend
l'instance **sans** étapes : la question reste affichable, avec son mode A s'il existe. Le **niveau** (`options.schoolLevel`, défaut `auto`)
vient de `gradeLevelToSchoolLevel(grades)` : le plus haut niveau des `grades`, `lycee` par défaut.
La **stratégie** (pas atomiques au collège, combinés au lycée…) est choisie **au rendu** par niveau :
la même suite d'opérations se rédige différemment. `verbosity` : `summarized` | `detailed`.

Dans l'éditeur, le formulaire n'édite que le texte des étapes du mode A (un paragraphe = une étape) ;
`feedback` et `generatedSteps` s'écrivent en mode JSON. Enregistré en mode formulaire, le modèle
garde tel quel le reste de la correction chargée (`stringToCorrection`, variation et correction
partagée ; la duplication d'une variation le copie aussi) — il l'effaçait avant le 2026-10-24.
Tests : `QuestionTemplateForm-correction-gardee.svelte.test.ts`.

`simplify` avec `intent: 'developper'` ne montre **pas** la trace du pipeline (produits collés
« 2x1 », la même ligne répétée) : il montre la rédaction de `.développer` dans l'atelier,
`explainExpansion` (`mathAST/pedagogical-simplify/expand-explained.ts`) — une intention, une seule
rédaction (décision de David du 2026-10-14, option B). `summarized` en donne la version résumée ; un
décimal écrit dans l'expression donne des décimaux, sinon des fractions. Sans rédaction (équation,
rien à développer, somme sous une fonction, une racine, dans un exposant ou une fraction) : repli
silencieux sur le mode A, jamais sur la trace. Tests : `correction-developper.test.ts`.

`simplify` avec `intent: 'reduire'` ou `'auto'` ne passe plus par `normalize` (chantier
simplify-carte § 33, 2026-10-23) : `reduire` ne développe ni ne factorise (`2(x+3)` reste) ; `auto`
simplifie les fractions de polynômes en montrant la factorisation et la condition, et ne développe
que si c'est plus court. Aucun modèle en prod ne les emploie (mesuré le 2026-10-23).

**Forme de la réponse finale demandée** (D4, chantier simplify-carte lot 5e, 2026-10-24) :
`differentiate` et `integrate` acceptent `finalForm: 'developpee' | 'factorisee'` (`FinalForm`,
`FINAL_FORMS` de `types.ts`, schémas souple et strict ; mode JSON seulement). Absent : la forme par
défaut. Présent : une dernière étape « On factorise » / « On développe » (règles `factor-result` /
`expand-result`) part de la forme par défaut, seulement si l'écriture change ; pour une primitive,
elle vient avant « + C » (`mathAST/requested-form.ts`, décrit dans
[mathast/README.md](mathast/README.md)). Sur une intégrale à bornes, `validateTemplate` refuse le
réglage (Q36). La vérification du modèle (`checkTemplate`) juge, à chaque tirage, la réponse finale
de la correction (`calculusFinalAnswerLatex`) par la forme exigée de chaque case dont elle donne la
valeur (`isBlankValueCorrect`, puis `blank.requiredForm`, comme le juge de l'élève), avec ou sans `finalForm` : la forme par défaut doit aussi passer le juge
(E1, Q37, David 2026-10-24). Pas de réponse finale (repli sur le mode A, intégrale sans valeur) :
rien à juger. Aucun modèle de la prod n'emploie
le mode B (mesuré le 2026-10-24) : la bascule des modèles existants vers la correction automatique
est un chantier à venir (David). Tests : `correction-forme-demandee.test.ts`,
`check-template-forme-demandee.test.ts`.

Concise / détaillée (ADR 0017) : `splitCorrectionDetail` retire ou garde `\detail{…}`, les blocs
`> [!méthode]`, `> [!rappel]`, `> [!attention]` et les spans `{.rappel}`… ; un seul interrupteur
(`correction-view-preference.ts`). Rédaction : [corrections-redaction](../pratiques/corrections-redaction.md).

### 8. Publication

- Enregistrement (`POST` / `PUT /api/questions/templates`, admin ; lecture prof et admin) : Zod
  (`createQuestionTemplateSchema` / `updateQuestionTemplateSchema`) + collisions d'hypothèses ;
  en brouillon, une case choix sans `plusieurs: oui` ne peut pas avoir deux bonnes réponses ;
  les champs du QCM retiré → 400.
- **Un seul contrôle de publication** : `templatePublicationErrors`
  (`src/lib/server/template-publication.ts`) = `checkTemplate` (structure, schéma strict, specs
  vertes, une spec `correct` par variation, 50 tirages par variation) + dépendances circulaires.
  Les trois chemins qui publient l'appellent : création (`POST`), `PUT` d'un modèle, lot.
- **Plus de contrôle « catégorie occupée »** (ADR 0035) : plusieurs modèles cohabitent dans une
  notion. Ni l'éditeur, ni le `POST`, ni le `PUT`, ni le lot ne le font ; seul l'index unique des
  anciens quadruplets subsiste en base — s'il refuse un lot (23505), le paquet est signalé comme
  refus, pas comme plantage.
- `POST /api/questions/templates` (statut `published` **par défaut**) : `templatePublicationErrors`.
  Un brouillon n'est pas contrôlé.
- `PUT` d'un modèle dont le statut fusionné est `published` (publication, **ou toute modification
  d'un modèle déjà publié**) : `templatePublicationErrors`. Un modèle publié qui échoue ne se modifie plus qu'en
  le repassant en brouillon. Refus 400 : messages détaillés, puis raisons résumées ; l'éditeur
  (`questions/[id]/edit`, `questions/create`) les affiche dans le toast d'erreur (5 au plus) et
  toutes dans l'encadré « Erreurs à corriger » (prop `serverErrors`) ; si la publication est
  refusée, `QuestionTemplateForm` remet le statut d'avant.
- **Boutons de l'éditeur selon le statut** : brouillon → « Enregistrer brouillon », « Publier » ;
  publié → « Enregistrer » (reste publié, donc contrôle complet) et « Repasser en brouillon »
  (même confirmation que l'onglet « Publiés » de la liste ; on reste sur la page, refus → statut
  remis). Le contrôle côté client ne cherche plus de réponse dans `blanks` : les réponses écrites
  dans le texte (`?4`, `?flèche`) ne se lisent qu'au serveur, qui refuse une version sans réponse.
- **Publication par lot** (`POST /api/questions/templates/bulk-status`, 1 à 100 modèles par envoi, `MAX_BULK_TEMPLATE_IDS` ; l’en-tête de la route dit encore 700) : chaque
  modèle repasse `templatePublicationErrors` (le même contrôle que le `PUT`) ; un échec le laisse en brouillon avec sa raison, sans contrôle de catégorie. Seules les lignes **rendues** par
  `.update().select()` comptent (RLS silencieuse).
- Tags du programme (`[id]/edit`, `$lib/server/programme-tags`) : un point par programme, choisi
  parmi ceux du nœud du modèle et de sa notion ; un modèle sans nœud se range d'abord
  ([cours-et-chapitres.md](cours-et-chapitres.md)).
- Un modèle publié devient lisible par tous et, sauf question de cours, entre au paquet SRS Programme (`entersProgrammeDeck`, [srs.md](srs.md)).

## Invariants pédagogiques non évidents

1. **Juste en valeur ≠ bien écrit** : les deux sont jugés et rapportés (`constraintViolations`).
   `bad_form` vaut 0 comme `incorrect`, mais le message dit quoi réécrire.
2. **Réduire pour comparer, jamais pour écrire** (ADR 0006) : l'empreinte du décideur ne s'affiche
   pas ; l'écriture se juge sur ce que l'élève a tapé.
3. **Équivalence = même valeur là où les deux sont définies** ; les hypothèses de l'énoncé ne
   portent que sur des variables **libres** de la réponse, jamais sur une variable tirée
   (`findAssumptionCollisions`) — [convention-equivalence](mathast/convention-equivalence.md).
4. **Une variation = le même cas pédagogique** : tirée par élève, elle doit avoir une difficulté
   équivalente (CONTEXT.md).
5. **Le hasard ne se recalcule jamais** depuis la graine : un tirage dépend de tout ce qui précède
   (une source consommée en ordre). Ajouter un tirage avant un autre change les instances déjà vues.
6. **Indices d'origine vs positions affichées** (case choix) : `expectedAnswer`, la réponse
   enregistrée et `validateAnswer` parlent en ordre d'origine ; l'élève voit l'ordre mélangé
   (`choice.order`). En évaluation, le serveur ramène les positions affichées
   (`toOriginalChoiceValues`) ; la lettre d'un message est la position affichée.
7. **Une réponse hostile ne coûte rien** : garde d'écriture avant parse (`answer-complexity.ts`,
   limites ≥ 3 × le maximum du corpus), puis budget de temps par copie côté serveur. Statut
   `incorrect`, jamais `empty` (une case vide minoritaire vaut ½).
8. **Évaluation : rien de la réponse ne part au navigateur** — `toPublicQuestion` construit la
   question en liste blanche (ni attendu, ni correction, ni graine, ni identifiant de modèle), car
   les modèles publiés sont lisibles par tous. L'énoncé lui-même part sans la valeur à trouver de
   ses blocs à geste (`maskGestureAnswers`, `masked-statement.ts` : `placer: A=?`, `construire: ?`,
   `colorier: ?`, `tracer: ?` (vecteur : `tracer: vecteur u = ? depuis A`, nom et origine gardés),
   effectifs des barres à construire, cinq valeurs d'une boîte à moustaches à
   construire ; lot 2 : hauteurs d'un ` ```cubes `
   `retrouver:`, cases retirées d'un ` ```patron ` `completer:`, `verifier:` d'une
   ` ```figure-a-completer ` ; tableau à compléter : valeur de x cachée → `??1`, `??2`… dans
   `domain:` et dans les clés des lignes, signe, marque ou flèche cachés → `?` seul, valeur cachée
   d'une ligne `variation:` → `?, position` ; valeurs qui encadrent une flèche cachée passées en
   `center`, bornes implicites de leur ligne écrites (`-inf: , top`), `maskVariation`) ; la case
   garde le genre de son bloc (`cellule` pour une case de tableau) (`construire`, ou `figure`
   pour une figure à compléter, jamais `construction`), pour le même écran qu'hors évaluation
   (chantier [fuite-enonce](../archive/wip/fuite-enonce-progress.md)). Limite : un point invisible
   (`visible=faux`) d'une figure à compléter, posé sur la réponse, partirait tel quel ; une cellule
   cachée d'un tableau de signes se déduit d'un 2e tableau du même énoncé, d'une `||` d'une ligne
   `variation:` ou de l'étiquette (`sign: x+3`) — au modèle de l'éviter. `variationMasked` compte aussi
   comme fuite une hauteur (`top`, `bottom`) à côté d'une flèche masquée. Garde :
   `findUnmaskedAnswers` relit l'énoncé à envoyer (texte seul, sans les masques) ; au tirage, une
   question dont l'énoncé masqué dirait encore la réponse est écartée et journalisée comme une
   génération impossible (`gestureAnswerLeaks`, la tentative ne se perd pas) ; `toPublicQuestion`
   refuse de l'envoyer en dernier filet (reprise).
9. **Carte de cours** : jamais dans une évaluation notée (`excludeCourseCards`), pas de spec ;
   `checkTemplate` vérifie seulement un recto et un verso non vides. Une carte de cours est
   toujours une question de cours.
10. **Plusieurs bonnes réponses** : réglage de la case choix (`plusieurs: oui`), jamais du modèle.
11. **`cleanCoefficients`** nettoie `1x-1y+0=0` en `x-y=0` partout (énoncé, attendu, choix,
    étapes) sans jamais toucher une fonction ni un facteur non premier d'un produit. La
    formule nettoyée est réécrite en notation maison (`readableCustom`) : `toCustom` y écrit la
    constante d'Euler `e`, relue par le parseur LaTeX du validateur (le remplacement de `\euler`,
    `CUSTOM_EULER`, est retiré le 2026-10-10). Une formule `$…$` reliée par `\iff`,
    `\Leftrightarrow`, `\implies` ou `\Rightarrow` (et leurs variantes `\Long…`) ne se lit pas en entier : chaque morceau est
    nettoyé pour lui-même (`cleanLogicalPieces`, `content-resolver.ts`), seulement s'il contient
    un chiffre (`(E)\iff …` garde ses parenthèses) ; un morceau illisible ou sans rien à
    nettoyer reste à l'octet près. Avant le 2026-11-03, « −1x − 3 = 0 ⟺ x = −3 » s’affichait (corrigé de 2-330).
12. **Mode B échoue en silence** : une exception dans `generateCorrection` est journalisée
    (`console.warn`) et l'instance part sans `_renderedSteps` — l'élève voit la correction sans
    étapes plutôt qu'une erreur.
13. **Un nombre JS ne se réinjecte jamais par `String(n)` dans une expression relue** : le parseur
    LaTeX ne lit plus la notation scientifique (`3e-7` = 3e − 7, `e` constante d'Euler), alors que
    `String(3e-7)` vaut `'3e-7'`. La réponse numérique de l'élève et les variables substituées
    dans une règle de validation (`validation-rule-evaluator.ts`), comme une durée composée
    (`units/composite-duration.ts`), passent par `numberToLatexSafe` (`mathAST/common/numeric.ts`,
    décimal développé). Les règles d'écriture de `{{eval:…}}` : [ubumark.md](ubumark.md).

## Comment étendre

Règle commune : **TDD collaboratif** (comportements en français validés par David → tests rouges
→ code), et tout ce qui entre passe par Zod.

**Nouvelle nature de case (`AnswerKind`)** : l'ajouter à `AnswerKind` et `ANSWER_KINDS`
(`types.ts`, repris par `template-schema.ts`) ; ses réglages dans `TemplateBlank`, `BlankDefaults`,
`InstanceBlank` et la fusion de `instance-generator.ts` ; un module `src/lib/questions/<nature>/`
(jugement pur) ; une branche dans `validateSingleBlank` **après** la garde de complexité ; un
clavier branché dans `FillBlanksInput.svelte` ; le rendu dans `expected-result.ts` ; les champs
publics dans `public-question.ts` ; l'éditeur (`QuestionTemplateForm.svelte`,
`SharedFieldsEditor.svelte`). Modèles : les lots `reponse-*` archivés (intervalles, équation,
vecteur) et `case-primitive-ed-progress.md`.

**Nouvelle vérification de figure** (bloc ```figure-a-completer) : un membre de `ConstructionCheck` et
de `CONSTRUCTION_CHECK_KINDS` (`ubumark/types/construction.ts`), sa lecture dans `readCheck`
(`construction-parser.ts`), son jugement et son message dans `judgeConstruction`. Un nouvel outil :
`CONSTRUCTION_TOOLS`, `CHECK_TOOL` (l'outil de chaque vérification ; un seul pour `droite_par`, `carre`,
`rectangle` ; une palette `PLAIN_PAPER_TOOLS` pour `point` et `symetrique` sans quadrillage, et pour
`droite` toujours), et sa
forme dans `parseConstructionAnswer`. `checkTemplate` construit la figure de chaque case « figure » à
chaque tirage (`constructionPositions`, puis `assertConstructionChecks`) : une figure qui ne se
construit pas (coordonnée en fraction LaTeX rendue par `eval:`), un point de `verifier:` sans position
(intersection de droites parallèles), deux points de `droite_par` ou deux sommets donnés confondus font échouer le tirage — sans
cela, toute réponse de l'élève serait jugée fausse et les tirages diraient « réussis » (piège de CP-058).
Le premier échec (variation, tirage, raison) remonte à l'éditeur (`templatePublicationErrors`). Une nouvelle vérification ajoute ses erreurs d'auteur à `assertConstructionChecks`
(`check-template-figure.test.ts`). La case publique d'une évaluation
notée (`toPublicQuestion`) ne porte que `type: 'graphical'`, jamais les vérifications.

**Nouvelle règle de superflu** (écriture inutile qu'on signale à l'élève) : ajouter sa fiche
dans le registre `src/lib/mathAST/superflu/rules.ts` (identifiant, libellé, message, et sa
transformation, écrite dans `superflu/transforms.ts`, si la règle se juge sur l'arbre), puis
au moins un cas fautif dans `tidy/__tests__/tidy-passe-le-juge.test.ts` (sinon ce test échoue).
`ConfigurableConstraintId`, `ConstraintOptions`, `constraintIdSchema`, `constraintsSchema`,
`CONSTRAINT_IDS`, `CONSTRAINT_LABELS`, `CONSTRAINT_FEEDBACK`, `buildConstraintSeverities` et
le juge (`buildASTPipeline`) lisent le registre. Coordonner avec l'agent mathast. **Autre
contrainte** (pas du superflu : `form`, `percent`…) : l'ajouter à la main dans chacune de ces
listes — **pas** dans `constraint-validators.ts`.

**Nouvelle règle de validation** : un membre de l'union `ValidationRule`, son schéma dans
`validationRuleSchema`, son `case` dans `evaluateRule`, son message français (tests
`validation-rule-messages-fr.test.ts`).

**Nouvelle forme exigée** : `RequiredForm`, `requiredFormSchema`, `checkRequiredForm`,
`REQUIRED_FORM_FEEDBACK`, l'option d'éditeur dans `form-options.ts`. Préférer un motif
`{ pattern }` quand il suffit.

**Nouveau générateur d'étapes (mode B)** : un membre de `GeneratedSteps`, son schéma dans
`generatedStepsSchema`, un `case` dans `generateCorrection` vers un pipeline `pedagogical-*`
(invariants de l'agent mathast ; exemple le plus récent : `pedagogical-solve/quadratic-inequality.ts`).

**Nouvelle fonction de tirage** (`{{eval:…}}`, conditions) : `variable-resolver.ts` /
`condition-evaluator.ts` ; pièges connus dans [fiches-exercices](../pratiques/fiches-exercices.md)
(« Pièges de l'écriture d'un modèle ») et `generator/__tests__/pieges-generation-2.test.ts`.

## Tests

- Unitaires : `__tests__/` de chaque sous-dossier de `src/lib/questions/` (118 fichiers de test),
  `src/lib/utils/__tests__/answer-validator-*.test.ts` (le juge), `src/lib/exercises/` (15).
  Lancer : `pnpm test:server <chemin>`.
- **Specs de modèle** (`testSpecs`) : variables fixées, réponses, statut attendu ;
  `runAllTestSpecs`, `pnpm question:specs`. Une spec `correct` par variation est exigée pour publier
  (par lot comme modèle seul).
- **Garde de rendu de `question:specs`** (`review/textcolor-hors-maths.ts`) : un `\textcolor` hors `$`
  dans un tirage (énoncé, choix, corrigé, lus par `parseMarkdown`) fait échouer le script — ubumark n'a
  pas de texte coloré, l'élève lirait le LaTeX brut. Propre au script : `checkTemplate` et la
  publication dans l'appli ne l'appliquent pas (décision de David, 2026-11-02).
- **Corpus de la relecture** : `data/relecture/` (633 modèles TinyMath relus, 13 lots), rejoué à
  chaque PR par `src/lib/questions/review/__tests__/corpus-relecture.test.ts` (`checkTemplate`
  complet) ; il borne aussi la garde de complexité (`answer-complexity-corpus.test.ts`) et le rendu
  sûr (`student-answer-safety.render.test.ts`). Limite : instantané de la relecture, un modèle
  modifié ensuite dans l'éditeur n'est pas couvert.
- **Corrections rédigées** : `data/corrections/` (lots), outils `pnpm corrections:generate`,
  `pnpm corrections:check`, `pnpm corrections:import` ; rejoués par
  `scripts/corrections/__tests__/lots-ci.test.ts`.
- Aucun test ne lit `docs/` ([garde](../../src/lib/__tests__/tests-sans-lecture-de-docs.test.ts)).

## Décisions (ADR)

[0001](../adr/0001-correction-cote-client.md) correction côté client ·
[0006](../adr/0006-reduire-pour-comparer-pas-pour-ecrire.md) réduire pour comparer ·
[0009](../adr/0009-carte-de-cours-type-explicite.md) carte de cours, type explicite ·
[0011](../adr/0011-fiche-d-automatismes-figee-par-graine.md) série figée par graine ·
[0012](../adr/0012-hypotheses-de-l-enonce-restreignent-la-comparaison.md) hypothèses de l'énoncé ·
[0013](../adr/0013-contrainte-de-forme-rebranchee-defaut-strict.md) contrainte `form` en `strict` ·
[0015](../adr/0015-evaluation-notee-correction-serveur.md) évaluation notée corrigée par le serveur ·
[0016](../adr/0016-auto-evaluation-meilleur-resultat-du-jour.md) auto-évaluation ·
[0017](../adr/0017-correction-concise-et-detaillee.md) correction concise / détaillée.

Décisions de David sans ADR, consignées dans les journaux archivés :
[publication par lot, arrondi, réponses texte](../archive/wip/publication-lot-et-correction-progress.md) ·
[séries et leurs formes](../archive/wip/series-formes-progress.md) ·
[hypothèses de l'énoncé](../archive/wip/hypotheses-enonce-progress.md) ·
[pièges de génération](../archive/wip/pieges-generation-2-progress.md).

## Écarts connus

- **Sens de `AB` dans les exercices rédigés** : résolu par leur thème depuis le lot 6
  (`exerciseCapitalPairs`, voir [exercices.md](exercices.md)) ; une copie de fiche stockée avant
  garde le produit (Q-L).
- **Évaluations notées** : le serveur régénère l'instance depuis la graine au moment de corriger ;
  une copie commencée avant un changement de sens est corrigée avec le sens nouveau (aucune
  réponse attendue à majuscules collées en base au 2026-10-12 : aucun verdict ne change).
- **Case graphique (droite graduée)** : `InstanceBlank.type` admet `'graphical'` et
  `graphicalConfig`, mais aucun générateur ne la produit (la droite à placer passe par
  `NumberLinePlacer.svelte` et `construire: 'line'`) ; `NumberLineInput.svelte` a été retiré.
- **Réponses à placer, restes du chantier** (clos le 2026-10-29, journal
  `docs/archive/wip/reponses-a-placer-progress.md`) : au doigt, le
  glisser qui suit la pose d'un point absent sur une droite attend un peu (relâcher et reprendre) ;
  CP-058 (alignement à la règle) relève de la figure de travail (`figure-et-choix`), pas d'un geste à
  placer. Contenu à faire par les sessions « questions » : les modèles « ranger » encore en case (6e 06
  et 07, CP, CE1, CM2) à réécrire en ```ranger (au moins 3 étiquettes) ; aucun modèle n'utilise encore
  `axe: à choisir` (CE2-082).
- `question_templates.type` existe en base, mais le code déduit le type de la structure
  (`getQuestionType`). CONTEXT.md liste encore des types TinyMath (`numerical_exact`…) absents de
  `QuestionType`.
- **Durées du panier ≠ durées d'une série** : `questionCart.updateDelay` et `CartQuestionCard`
  bornent à 5..300 s, la série enregistrée accepte jusqu'à `MAX_QUESTION_DELAY_SECONDS` (600).
  Une série à 600 s chargée par `replaceWith` garde sa durée, mais le premier « − » la ramène à 300.
- **Contrôles natifs** malgré la règle MySelect / MyCheckbox : `<select>` dans
  `PrecisionEditor.svelte` et `QuestionPreview.svelte`, `<input type="checkbox">` dans
  `QuestionPreview.svelte`.
