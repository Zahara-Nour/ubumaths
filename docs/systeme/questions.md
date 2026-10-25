---
couvre:
  - 'src/lib/questions/**'
  - 'src/lib/exercises/**'
  - src/lib/validation/series.ts
  - src/lib/srs/generator.ts
  - src/lib/utils/answer-validator.ts
  - src/lib/mathAST/cosmetic-transforms.ts
  - 'src/lib/migration/review/**'
  - 'src/lib/types/{question-display,question-template}.ts'
  - 'src/lib/server/{evaluation-attempts,questions-bulk-status,template-publication,template-fact-sheet,grading-budget,corrected-detail}.ts'
  - src/lib/server/exercise-search-indexed.ts
  - src/lib/server/validation/questions.ts
  - 'src/lib/components/questions/**'
  - 'src/lib/components/question-inputs/**'
  - src/lib/components/markdown/nodes/BlankInput.svelte
  - 'src/lib/components/{QuestionTemplateForm,SharedFieldsEditor}.svelte'
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
> Vérifié contre le code le 2026-10-11 ; étape 4 des cases à unité le 2026-10-21 ; QCM et vecteurs le 2026-10-22 ; espaces de groupement le 2026-10-23 ; fiche du modèle le 2026-10-23 ; forme de la réponse finale demandée (`finalForm`) le 2026-10-24 ; étapes des équations écrites comme la réponse (lot 5f-4) le 2026-10-25 ; case d'un bloc `operation le 2026-10-25 (multiplication à remplir, PR 2b, et division à remplir, PR 3b, le même jour) ; étapes des inéquations (Q50) le 2026-10-25 ; case « figure » (bloc `construction, moteur) le 2026-10-25.

## À quoi ça sert

Un professeur (ou l'admin) rédige des **modèles de question** paramétrés ; le moteur en tire des
**instances** (une par élève, par graine), les affiche, juge la réponse de l'élève (valeur **et**
écriture), puis montre une **correction**. Les instances alimentent les **séries** (Automaths, en
classe, flash-cards, entraînement, course aux nombres, évaluation), les paquets **SRS** et les
**fiches**.

Termes ([CONTEXT.md](../../CONTEXT.md), sections « Les questions » et « Les usages des questions ») :
modèle de question, variation, instance, case, QCM, question de cours, carte de cours, résultat
attendu, correction concise / détaillée, détail, motif de forme, série, série figée, relecture,
évaluation, tentative. ⚠️ « Publier » a trois sens (même fichier) : ici, c'est
`question_templates.status`.

Hors sujet : le moteur mathématique ([mathast/](mathast/README.md)), la notation ubumark
([notation-unites](../pratiques/notation-unites.md), [fiches-exercices](../pratiques/fiches-exercices.md)),
le SRS ([srs.md](srs.md)).

## Carte du code

### `src/lib/questions/` — le moteur des modèles (208 fichiers suivis, 118 fichiers de test)

| Fichier / dossier                                                | Rôle                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/questions/types.ts`                                     | **Le contrat** : `QuestionTemplate`, `QuestionVariation`, `SharedVariationDefaults`, `TemplateBlank`, `BlankDefaults`, `InstanceBlank`, `QuestionInstance`, `ValidationStatus`, `ConstraintId`, `RequiredForm`, `ValidationRule`, `GeneratedSteps`, `TestSpec`. Aussi `getQuestionType`, `isCourseCard`, `isCourseQuestion`, `mapDbTemplateToForm`.                                                                        |
| `src/lib/questions/template-schema.ts`                           | Schéma Zod **strict** `questionTemplateSchema` (éditeur JSON, `checkTemplate`).                                                                                                                                                                                                                                                                                                                                            |
| `src/lib/questions/index.ts`                                     | API publique (`generateInstance`, `resolveVariables`, `shuffleChoices`, `validateTemplate`, ré-export de `$lib/math`).                                                                                                                                                                                                                                                                                                     |
| `generator/`                                                     | Génération : `instance-generator.ts` (`generateInstance`), `variable-resolver.ts`, `condition-evaluator.ts`, `variable-conditionals.ts`, `content-resolver.ts`, `assign-blank-indices.ts`, `choice-shuffler.ts`, `correction-resolver.ts`, `correction-generator.ts` (`generateCorrection`, mode B), `test-instance-builder.ts` (variables fixées, pour les specs).                                                        |
| `validators/`                                                    | Structure d'un modèle : `template-validator.ts` (`validateTemplate`), `choice-answer-count.ts` (`choiceAnswerCountErrors`), `negative-substitution.ts` (`findUnparenthesizedNegatives`, avertissement).                                                                                                                                                                                                                    |
| `intervals/`, `equations/`, `vectors/`, `matrices/`, `calculus/` | Une chaîne de jugement par **nature de case** (`AnswerKind`) : `interval-answer.ts`, `equation-answer.ts`, `vector-answer.ts`, `matrix-answer.ts`, `primitive-answer.ts` + `differential-equation-answer.ts`. Les `keyboard-*.ts` sont les claviers MathLive de ces cases.                                                                                                                                                 |
| `units/`                                                         | Correction des cases à unité : `parser.ts`, `validator.ts` (`validateQuantityAnswer`), `quantity-comparison.ts` (`compareQuantities`), messages (`feedback.ts`), `student-input.ts`, calcul écrit par l'élève (`student-calculation.ts`), durées composées (`composite-duration.ts`), touches du clavier par grandeur (`keyboard-units.ts`, octets compris depuis le 2026-10-13) — contrat : [grandeurs.md](grandeurs.md). |
| `combinatorics/`                                                 | Clavier du dénombrement ; la notation non calculée est jugée par `combinatorial-notation.ts`.                                                                                                                                                                                                                                                                                                                              |
| `parser/color-parser.ts`, `colors.ts`                            | Couleurs dans les énoncés (palettes ; `colors.ts` sert aussi l'atelier).                                                                                                                                                                                                                                                                                                                                                   |
| `src/lib/questions/required-form-validator.ts`                   | `requiredForm` : `checkRequiredForm`, `requiredFormVerdict` (`ok` / `acceptable` / `violated`), `REQUIRED_FORM_FEEDBACK`. Formes complexes : `complex-forms.ts` (base de `re^{iθ}` : la constante `euler()` ; `i` : le nœud `complex(0, 1)`, lettre comme `\imaginaryI`).                                                                                                                                                  |
| `src/lib/questions/validation-rule-evaluator.ts`                 | `validationRules` : `evaluateRule`, `evaluateRules`, `createEvaluationContext`.                                                                                                                                                                                                                                                                                                                                            |
| `src/lib/questions/constraint-validators.ts`                     | Ancien jeu de contrôles cosmétiques sur le LaTeX brut. **En service : `checkUnit` et `checkReducedFractions` seulement** (les anciens contrôles, morts, ont été retirés ; le jugement passe par `cosmetic-transforms.ts`).                                                                                                                                                                                                 |
| `src/lib/questions/feedback.ts`, `constraint-constants.ts`       | Messages français des contraintes (`CONSTRAINT_FEEDBACK`), libellés et modes proposés à l'éditeur (`CONSTRAINT_IDS`, `CONSTRAINT_LABELS`). Ceux des règles de superflu sont tirés de leur fiche (`mathAST/superflu/rules.ts`).                                                                                                                                                                                             |
| Options de case                                                  | `rounding.ts` (arrondi), `rules-suffice.ts` (`rulesDecide`), `angle-modulo.ts`, `answer-variable-prefix.ts`, `answer-degree-suffix.ts`, `answer-assumptions.ts` (ADR 0012), `generic-functions.ts` (`templateGenericFunctions`), `clean-coefficients.ts` (`cleanCoefficientsAst`), `capital-pairs.ts` (sens de `AB`), `formula-reading.ts` (`readingOf`), `figure-name-check.ts` (garde auteur).                           |
| `construction/`                                                  | Case « figure » (bloc ```figure-a-completer) : `answer.ts` (`parseConstructionAnswer`, réponse bornée), `judge.ts` (`judgeConstruction`, positions, tout-ou-rien), registre des positions `positions.ts` (`constructionPositions`) et son inscription `positions-setup.ts` (geometry-core).                                                                                                                                |
| Sécurité de la réponse                                           | `answer-complexity.ts` (`isAnswerTooComplex`, garde Q58), `student-answer-safety.ts` (réponse rendue chez le prof).                                                                                                                                                                                                                                                                                                        |
| Correction                                                       | `expected-result.ts` (`buildExpectedResult`, `fillMarkdown`), `expected-result-markdown.ts`, `correction-card-verdict.ts`, `correction-detail.ts` (`splitCorrectionDetail`, `detailedCorrection`, `correctionForPrint` pour les fiches PDF, ADR 0017), `correction-placeholders.ts`, `grade-level-to-school-level.ts` (`gradeLevelToSchoolLevel`).                                                                         |
| QCM                                                              | `choices.ts` (positions affichées ↔ indices d'origine), `single-answer.ts` (`keepFirstCorrectChoice`).                                                                                                                                                                                                                                                                                                                     |
| Cours                                                            | `course-card.ts` (`excludeCourseCards`), `course-question.ts`.                                                                                                                                                                                                                                                                                                                                                             |
| Séries et évaluations                                            | `series-items.ts` (`drawSeriesQuestions`, `buildSeriesItems`), `grading.ts` (`gradeQuestion`, `gradeOutOf20`), `public-question.ts` (`toPublicQuestion`, `toDisplayInstance`), `submission.ts`.                                                                                                                                                                                                                            |
| Catalogue, éditeur, publication                                  | `category-*.ts`, `cart-preview.ts`, `form-options.ts`, `template-put-body.ts`, `bulk-status.ts`, `test-spec-runner.ts` (`runAllTestSpecs`), `constants.ts` (bucket des images), `template-fact-sheet.ts` (fiche du modèle : types, réglages en mots, chemin dans l'arbre).                                                                                                                                                 |

### Hors du dossier

| Fichier                                                                             | Rôle                                                                                                                                                       |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/utils/answer-validator.ts`                                                 | **Le juge** : `validateAnswer`, `validateAnswerDetailed`, `validateBlanks`, `validateChoice`, `isBlankValueCorrect` (≈ 2 500 lignes).                      |
| `src/lib/mathAST/cosmetic-transforms.ts`                                            | Contrôle de forme unifié `checkForm` (importé sous le nom `checkFormUnified`) et `cosmeticViolations` : les contraintes cosmétiques réelles.               |
| `src/lib/math/index.ts`                                                             | `areEquivalent`, `evaluateExpression` : le décideur d'équivalence → [convention-equivalence](mathast/convention-equivalence.md).                           |
| `src/lib/mathAST/pedagogical-*/`                                                    | Étapes de correction générées (mode B) ; stratégies par niveau `STRATEGIES`, `STRATEGIES_QUADRATIC`, `STRATEGIES_RATIONAL` (`pedagogical-solve/types.ts`). |
| `src/lib/types/question-display.ts`, `src/lib/types/question-template.ts`           | `ValidationResult` ; `toQuestionTemplate` (ligne de base → modèle).                                                                                        |
| `src/lib/server/validation/questions.ts`                                            | Zod des routes : `createQuestionTemplateSchema`, `updateQuestionTemplateSchema`, `bulkTemplateStatusSchema`, `generateQuestionSchema`.                     |
| `src/lib/migration/review/check-template.ts`                                        | `checkTemplate` : le contrôle complet (structure, schéma strict, specs, 50 tirages par variation).                                                         |
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

Seul `series.ts` concerne les questions : composition d'une série (`cartItemSchema`,
`seriesCategoriesSchema`, bornes `MAX_SERIES_CATEGORIES`, `MAX_SERIES_QUESTIONS`,
`MAX_QUESTION_DELAY_SECONDS`), relue aussi pour un lien `/automaths/panier?categories=…`.
`shop.ts` et `marketplace.ts` relèvent de [jeux-et-economie](jeux-et-economie.md).

### Composants et routes

- Saisie : `src/lib/components/question-inputs/FillBlanksInput.svelte` (cases MathLive, claviers),
  `MultipleChoiceInput.svelte`, `src/lib/components/markdown/nodes/BlankInput.svelte` (case de texte `[_]`).
- Choix de QCM en bloc : un choix peut être un ` ```horloge ` (« Quelle horloge indique 3 h ? ») ou
  une ` ```collection ` (« Quel dessin montre 42 ? ») ou une ` ```monnaie ` (« Quel porte-monnaie
  contient 48 € ? ») ;
  `MultipleChoiceInput` et les aperçus (`QuestionPreview`, `QuestionPreviewBaseCard`) posent
  `--horloge-taille: 3cm`, `--collection-taille: 3cm` et `--monnaie-taille: 6cm` sur le contenu du choix (sauf `taille:` de
  l'auteur). La
  correction (`ExpectedResultView`) rend un tel choix par `MarkdownRenderer` : `InlineMarkdown`
  n'en garderait que le texte brut.
- Affichage et correction : `src/lib/components/questions/` — `QuestionCard.svelte` et
  `FlashCard.svelte` (appellent `validateAnswer`), `CorrectionCard.svelte`, `CorrectionView.svelte`,
  `ExpectedResultView.svelte`, `GeneratedStepsCorrection.svelte` (étapes générées : titre et
  explication rendus par `InlineMarkdown`, formules entre `$…$` depuis V25), `CourseCardView.svelte`,
  `TestSpecEditor.svelte`.
- Éditeur : `src/lib/components/QuestionTemplateForm.svelte`, `SharedFieldsEditor.svelte`,
  `exercises/VariationEditor.svelte`. Ses sous-composants, à la racine de `src/lib/components/`
  (vérifié le 2026-10-13) : `QuestionCategoryFields` (thème / domaine / sous-domaine, options
  filtrées par `$lib/questions/category-options`, chaque liste est un `CategorySelector` sur
  `MySelect` avec « Ajouter… »), `VariableEditor`, `AnswerEditor` (cases ou choix de QCM selon le
  type), `PrecisionEditor` (`none`, `decimal`, `significant`, `magnitude`, `tolerance`) — ces
  trois-là servent aussi à `SharedFieldsEditor` —, `DisplayOptionsEditor`,
  `ValidationOptionsEditor`, `CourseQuestionToggle` (`options.courseQuestion`, cochée et
  désactivée pour une carte de cours), `QuestionPreview` (instance générée, graine affichée, autre
  graine, choix de la variation, taille d'affichage) et `QuestionTemplateHelpDialogs` (sept fenêtres d'aide statiques).
- Liste admin (`dashboard/admin/questions/`) : une `QuestionTemplateCard` par modèle (badge de
  type, « Cours », niveaux ; aperçu, édition, duplication, suppression).
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
- Automaths : `QuestionPreviewCard` (tuile du catalogue = la flash-card, plus l'ajout au panier),
  `CartFloatingButton` (vers `/automaths/panier`), `CartQuestionCard` (tuile d'une catégorie du
  panier : durée par pas de 5 s entre 5 et 300 s, nombre de questions).
- Stores (`src/lib/stores/`) :
  - `questionCart.svelte.ts` (`questionCart`) : le **panier**, des catégories
    (`theme`, `domain`, `subdomain`, `level`) avec un nombre de questions (1 à 99,
    `MAX_QUANTITY`) et une durée par question ; persistant en `localStorage`
    (`chiphre_question_cart`). `replaceWith` / `mergeItems` y chargent une série (lien de série).
    Ses types `QuestionCategory` et `CartItem` sont repris par les séries, les évaluations et le SRS.
  - `questionCategories.svelte.ts` (`questionCategoriesCache`) : catégories des modèles
    (`/api/questions/categories/all`), pour refuser une catégorie déjà prise et proposer le
    prochain niveau libre dans `QuestionTemplateForm`.
  - `questionTemplates.svelte.ts` (`questionTemplatesCache`) : modèles publiés
    (`/api/questions/templates/all`, ou `initializeFromServer` depuis le `load`), sans durée de
    vie ; lu par les pages Automaths. Les pages admin invalident les deux caches après écriture.
- Routes : `src/routes/api/questions/` (`templates`, `templates/[id]`, `templates/bulk-status`,
  `generate/[id]`, `categories`), admin `src/routes/(protected)/dashboard/admin/questions/`
  (liste, `create`, `[id]/edit`, `[id]/preview`), Automaths `src/routes/(public)/automaths/`
  (catalogue, `panier`, `test`), séries du prof `src/routes/(protected)/dashboard/teacher/series/`.

### Tables

`question_templates` (une ligne = un modèle ; `variations`, `shared`, `options`, `test_specs` en
jsonb ; `status`), `question_template_points`, `series`, `chapter_series`, `evaluations` & co,
`skill_attempts`, `exercises` & co → [base-de-donnees-tables.md](base-de-donnees-tables.md)
(sections « Questions et exercices », « Évaluations »). Lecture : les modèles **publiés** sont
lisibles par les élèves et par anon (Automaths) — réponses attendues comprises.

## Le cycle de vie d'une question

### 1. Le modèle

Un `QuestionTemplate` porte des **catégories** (`theme`, `domain`, `subdomain`, `level` ≥ 1),
des `grades`, un `status` (`draft` | `published`), des `options` (contraintes, `shuffleChoices`,
`orderIndependent`, `courseCard`, `courseQuestion`, `answerAssumptions`), des `testSpecs`, un
`shared` (valeurs par défaut) et au moins une **variation**.

Le **type** n'est pas déclaré : `getQuestionType` le déduit — `options.courseCard` → `course_card`
(ADR 0009), des `choices` (variation ou `shared`) → `multiple_choice`, sinon `fill_in_blanks`.

### 2. Fusion `shared` ⊕ variation (`resolveVariationWithShared`)

- `variables` : **fusionnées** — celles de `shared` d'abord, une variable de la variation de même
  nom remplace celle de `shared` (`mergeVariables`).
- Tout le reste (`statement`, `choices`, `correction`, `conditions`, `validationRules`,
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
   `answerFormats` est porté par `InstanceBlank.expressionName`. Un bloc ``operation à remplir
(au premier niveau de l'énoncé ; en liste ou cité → échec de génération) compte pour **une**
case, son numéro écrit dans le bloc (`case: N`) ; une division euclidienne pour **deux** (quotient
N, reste N + 1, seul N écrit ; `operationBlanks` les liste toutes deux). Sa réponse attendue vient du calcul du bloc
(`operationExpectedAnswer` ; division : `divisionExpectedAnswers`, forme la plus simple), jamais du modèle : `blanks[]` peut l'omettre
(case insérée à son rang ; un modèle sans autre case n'a pas besoin de `blanks`), ou lui donner
une entrée de réglages avec `expectedAnswer` vide — une réponse écrite est refusée. Un bloc en
erreur fait échouer la génération (message situé). Une ligne `case:` écrite par l'auteur aussi. Dans un QCM ou une carte de cours, le bloc ne porte aucune case. La case est `type: 'math'`,
`operation: true`, jugée comme une case ordinaire. Un bloc ``construction (au premier niveau,
   sinon échec) compte aussi pour **une** case, `case: N` posé en tête du bloc ; son contenu est mis à
   l'abri (un `?` ou un `[_]` du bloc ne crée pas de case). `blanks[]` peut l'omettre ; une réponse
   écrite est refusée ; un bloc en erreur (vérification manquante, fenêtre…) fait échouer la
   génération, comme un point de `verifier:` que le script ne nomme pas (`Z = …`, lecture légère
   `namesAssignedIn`) ou `options.orderIndependent` (l'appariement ne sait pas lire une figure). La case est `type: 'graphical'`, `construction: { source, checks }` (texte du bloc,
   variables résolues), réponse attendue symbolique `droite(A;B)`.
6. Chaque case reçoit ses réglages fusionnés : **case ▸ `blankDefaults`** pour `precision`,
   `unit`, `answerKind`, `rulesSuffice`, `acceptDecimal`… ; `requiredForm` : case ▸
   `blankDefaults` ▸ `requiredForm` de la variation ; `validationRules` : case ▸ variation.
7. QCM : choix mélangés (`shuffledChoices`), sauf `options.shuffleChoices === false` (Vrai/Faux).
8. Correction résolue, puis **mode B** : `generateCorrection` pré-rend les étapes si
   `correction.generatedSteps` est déclaré (voir § 7).

**Sens de deux majuscules collées** (`AB` : longueur du segment ou produit A × B) : résolu **une
fois** à la génération par `resolveCapitalPairs` (`capital-pairs.ts`), dans l'ordre : déclaration
`shared.capitalPairs` → contexte (thème `Graphes et matrices`, thème contenant « physique » →
produit) → **longueur** par défaut. Copié sur l'instance (`QuestionInstance.capitalPairs`, toujours
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

Natures de réponse :

| Nature                      | Déclaration                                 | Jugée par                                                                                                                                         |
| --------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Expression / nombre         | case ordinaire                              | équivalence + forme (§ 5)                                                                                                                         |
| Figure (tracé)              | bloc ```figure-a-completer (`verifier:`)    | `construction/judge.ts` (ci-dessous) ; réponse `droite(x1;y1;x2;y2)`, objets séparés par `\|`                                                     |
| Opération posée             | bloc ```operation (`cases: résultat`)       | case ordinaire : chiffres de la grille lus comme un nombre (`operation-answer.ts` ; division : `operation-division-answer.ts`, quotient et reste) |
| Texte                       | `[_]` hors formule                          | casse et accents ignorés ; 1 lettre d'écart tolérée dès 5 lettres                                                                                 |
| Grandeur                    | `unit: { expected, required? }`             | `validateQuantityAnswer` (conversion, unité imposée)                                                                                              |
| Ensemble en intervalles     | `answerKind: 'intervalles'`                 | `interval-answer.ts` ; option `openableBounds` ; contrainte `intervalForm`                                                                        |
| Équation de droite / cercle | `answerKind: 'equation'`                    | `equation-answer.ts` (même ensemble de points) ; formes `reduite`, `cartesienne`, `centre-rayon`                                                  |
| Vecteur dans une case       | `answerKind: 'vecteur'`                     | `vector-answer.ts` ; `vectorMode` `exact` ou `colineaire`                                                                                         |
| Matrice dans une case       | `answerKind: 'matrice'`                     | `matrix-answer.ts` (dimensions, puis chaque coefficient)                                                                                          |
| Primitive / solution d'ED   | `answerKind: 'primitive'` / `'solution-ed'` | `calculus/` (dérivation / substitution) ; `solutionMode`                                                                                          |
| QCM                         | `choices` (+ `multipleAnswers`)             | `validateChoice` ; indices d'**origine** (voir invariants)                                                                                        |
| Carte de cours              | `options.courseCard`                        | rien : auto-évaluation (`validateAnswer` rend un message)                                                                                         |

Après « Valider », la `FlashCard` colore chaque case au recto avec le verdict par case du
validateur (`computeBlankColors`, `components/questions/blank-verdicts.ts` → `validateAnswerDetailed`,
le même que le verso) : verte si juste, **ambre** si juste mais perfectible (`unoptimal_form`, «
forme à améliorer », `InputState.unoptimal`), rouge sinon. Avant octobre 2026, une comparaison
textuelle avec l'attendu rendait rouge toute bonne réponse d'une case à unité (`6m` pour `6[m]`),
`3.1` pour `3{,}1` ou `\dfrac{1}{2}` pour `\frac{1}{2}`.

Il n'y a **pas** de case « tableau » (tableau de signes ou de variations) : le tableau de signes
n'existe que dans les corrections générées, rendu par le bloc ubumark `variation`
([journal archivé](../archive/wip/tableau-signes-affichable-progress.md)).

### 5. Validation d'une case (`validateAnswer` → `validateBlanks` → `validateSingleBlank`)

Statuts (`ValidationStatus`) : `correct` (1), `unoptimal_form` (½), `bad_form` (0), `incorrect`
(0), `empty`. Dans l'ordre :

0. Vide → `empty`. Nature `intervalles` → sa chaîne. Puis **garde de complexité**
   (`isAnswerTooComplex`) : une écriture démesurée est `incorrect` **avant** toute lecture.
   Puis `equation`, `vecteur`, `matrice`, `primitive` / `solution-ed` : chacune sa chaîne.
   Case « figure » (`blank.construction`), juste après le vide : `judgeConstruction`. Chaque
   vérification `droite_par P ; Q` prend **sa** droite parmi celles tracées (une droite qui passe par
   P et Q, quels que soient les deux points qui l'ont tracée) ; une droite qu'aucune ne prend est
   « de trop » (faux) ; message de la première vérification ratée (« Ta droite passe par A et C, pas
   par B. », « Ta droite ne passe pas par le point B. »…). Réponse illisible ou démesurée
   (`CONSTRUCTION_ANSWER_LIMITS`) → faux sans message. Les positions des points viennent d'un
   **registre** (`constructionPositions`), comme le PDF des figures : le juge reste léger (sans lui,
   geometry-core ajoutait ~430 Ko minifiés à toutes les pages qui génèrent une question). Il est
   inscrit par `construction/positions-setup.ts`, importé par `test-spec-runner.ts`,
   `server/grading-budget.ts` et `server/corrected-detail.ts` (garde :
   `server/__tests__/construction-correction-serveur.test.ts`) ; l'écran de l'élève l'importera
   (PR 2). Sans inscription : exception, que `validateAnswer` rend dans `message`.
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

**Lecture des formules** : réponse de l'élève et réponse attendue sont lues par le parseur avec la
même configuration, `readingOf(instance)` (`formula-reading.ts`) : fonctions déclarées et sens de
`AB` (`capitalPairs`), transmis à `areEquivalent`, `checkForm`, `requiredForm` et à la règle
`equivalent`. Les chaînes `equation`, `vecteur`, `matrice`, `intervalles`, `calculus` ne le
reçoivent pas (aucune réponse attendue à majuscules collées en base).

Plusieurs cases : positionnelles par défaut ; `options.orderIndependent` → appariement maximal
réponses ↔ cases (pas glouton). QCM : `validateChoice` seul — aucune forme jugée, l'élève coche
sans rien écrire (le jugement d'écriture des QCM, jamais atteint, est retiré le 2026-10-22). `validateAnswerDetailed` rend le verdict par case / par choix
qu'utilise la correction.

Où la validation tourne : **dans le navigateur** partout (ADR 0001 : le serveur reçoit un verdict),
**sauf les évaluations notées**, corrigées par le serveur avec la même fonction (ADR 0015), sous un
budget de temps (`gradeWithinBudget`, 5 s par envoi) ; barème `gradeQuestion` / `gradeOutOf20`
(1, ½ ou 0 par question, note sur 20 au demi-point).

### 6. Résultat attendu (premier niveau de correction)

`buildExpectedResult` décrit, en données sans couleur, ce que l'élève voit d'abord : `3 + 5 ≠ 9`
puis `= 8` encadré, l'énoncé rempli par les solutions, « Ta réponse : » case par case, les choix
d'un QCM (bon / coché à tort / oublié), les remarques de forme. Spécification R1–R10 :
[resultat-attendu-progress](../archive/wip/resultat-attendu-progress.md). Pur et sans exception
(R10). Rendu par `ExpectedResultView.svelte` ; la réponse de l'élève passe par
`student-answer-safety.ts` dès qu'elle s'affiche chez un autre (copie lue par le prof).

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
  en brouillon, un QCM sans « plusieurs réponses » ne peut pas avoir deux bonnes réponses.
- **Un seul contrôle de publication** : `templatePublicationErrors`
  (`src/lib/server/template-publication.ts`) = `checkTemplate` (structure, schéma strict, specs
  vertes, une spec `correct` par variation, 50 tirages par variation) + dépendances circulaires.
  Les trois chemins qui publient l'appellent : création (`POST`), `PUT` d'un modèle, lot.
- **Catégorie occupée = refus, sur les trois chemins**, jamais de décalage automatique du niveau
  (décision du 2026-09-29, étendue à la création le 2026-10-10). Création et `PUT` rendent le même
  message (`categoryTakenMessage`, `category-validation.ts`). Avant l'envoi, `QuestionTemplateForm`
  repère la collision et propose un niveau libre (`questionCategoriesCache.getNextAvailableLevel`),
  que l'auteur choisit lui-même.
- `POST /api/questions/templates` (statut `published` **par défaut**) : `templatePublicationErrors`,
  puis unicité de la catégorie. Un brouillon n'est pas contrôlé.
- `PUT` d'un modèle dont le statut fusionné est `published` (publication, **ou toute modification
  d'un modèle déjà publié**) : `templatePublicationErrors`, puis **unicité de la catégorie**
  (thème, domaine, sous-domaine, niveau). Un modèle publié qui échoue ne se modifie plus qu'en
  le repassant en brouillon. Refus 400 : messages détaillés, puis raisons résumées ; l'éditeur
  (`questions/[id]/edit`, `questions/create`) les affiche dans le toast d'erreur (5 au plus) et,
  si la publication est refusée, `QuestionTemplateForm` remet le statut d'avant.
- **Publication par lot** (`POST /api/questions/templates/bulk-status`, 1 à 100 modèles par envoi, `MAX_BULK_TEMPLATE_IDS` ; l’en-tête de la route dit encore 700) : chaque
  modèle repasse `templatePublicationErrors` (le même contrôle que le `PUT`) ; un échec le laisse en brouillon avec sa raison ; collision
  de catégorie = refus, jamais de décalage automatique du niveau. Seules les lignes **rendues** par
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
6. **Indices d'origine vs positions affichées** (QCM) : `correctChoiceIndex` et `validateAnswer`
   parlent en ordre d'origine ; l'élève voit l'ordre mélangé. Toute traduction passe par
   `choices.ts` (la lettre du message est la position affichée).
7. **Une réponse hostile ne coûte rien** : garde d'écriture avant parse (`answer-complexity.ts`,
   limites ≥ 3 × le maximum du corpus), puis budget de temps par copie côté serveur. Statut
   `incorrect`, jamais `empty` (une case vide minoritaire vaut ½).
8. **Évaluation : rien de la réponse ne part au navigateur** — `toPublicQuestion` construit la
   question en liste blanche (ni attendu, ni correction, ni graine, ni identifiant de modèle), car
   les modèles publiés sont lisibles par tous.
9. **Carte de cours** : jamais dans une évaluation notée (`excludeCourseCards`), pas de spec ;
   `checkTemplate` vérifie seulement un recto et un verso non vides. Une carte de cours est
   toujours une question de cours.
10. **Plusieurs bonnes réponses** : `multipleAnswers` est un réglage du modèle ; coupé, chaque
    liste de choix ne garde que sa première bonne réponse (`keepFirstCorrectChoice`).
11. **`cleanCoefficients`** nettoie `1x-1y+0=0` en `x-y=0` partout (énoncé, attendu, choix,
    étapes) sans jamais toucher une fonction ni un facteur non premier d'un produit. La
    formule nettoyée est réécrite en notation maison (`readableCustom`) : `toCustom` y écrit la
    constante d'Euler `e`, relue par le parseur LaTeX du validateur (le remplacement de `\euler`,
    `CUSTOM_EULER`, est retiré le 2026-10-10).
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
`CONSTRUCTION_TOOLS`, et sa forme dans `parseConstructionAnswer`. La case publique d'une évaluation
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
- **Corpus de la relecture** : `data/relecture/` (633 modèles TinyMath relus, 13 lots), rejoué à
  chaque PR par `src/lib/migration/review/__tests__/corpus-relecture.test.ts` (`checkTemplate`
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
  `graphicalConfig`, mais aucun générateur ne la produit et `NumberLineInput.svelte` n'est importé
  par aucun composant.
- Composants sans appelant : `question-inputs/MathInput.svelte`, `question-inputs/OrderingInput.svelte`,
  et `src/lib/questions/examples/color-demo.ts`.
- `question_templates.type` existe en base, mais le code déduit le type de la structure
  (`getQuestionType`). CONTEXT.md liste encore des types TinyMath (`numerical_exact`…) absents de
  `QuestionType`.
- **Durées du panier ≠ durées d'une série** : `questionCart.updateDelay` et `CartQuestionCard`
  bornent à 5..300 s, la série enregistrée accepte jusqu'à `MAX_QUESTION_DELAY_SECONDS` (600).
  Une série à 600 s chargée par `replaceWith` garde sa durée, mais le premier « − » la ramène à 300.
- **Contrôles natifs** malgré la règle MySelect / MyCheckbox : `<select>` dans
  `PrecisionEditor.svelte` et `QuestionPreview.svelte`, `<input type="checkbox">` dans
  `QuestionPreview.svelte`.
