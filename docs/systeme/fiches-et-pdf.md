---
couvre:
  - 'src/lib/worksheets/**'
  - 'src/lib/typst/**'
  - 'src/lib/server/worksheets/**'
  - src/lib/server/validation/worksheets.ts
  - 'src/lib/components/worksheets/**'
  - 'src/lib/components/student/worksheets/**'
  - src/lib/types/worksheets.ts
  - src/lib/types/locale.ts
  - src/lib/utils/worksheet-type-labels.ts
  - 'src/lib/exercises/typst/**'
  - src/lib/ubumark/generators/typst-generator.ts
  - 'src/routes/(protected)/dashboard/teacher/contenu/worksheets/**'
  - 'src/routes/(protected)/dashboard/student/worksheets/**'
  - 'src/routes/(public)/cahier/*/fiche/**'
  - 'src/routes/api/worksheets/**'
  - 'src/routes/api/student/worksheets/**'
  - 'src/routes/api/teacher/chapters/*/worksheets/**'
  - 'scripts/fiches/**'
---

# Fiches d'exercices et production PDF

> Première doc de référence du module ; le savoir était dans les journaux de
> [`archive/wip/`](../archive/wip/) (cités pour le **pourquoi**, jamais pour le code).
> Vérifié contre le code le 2026-10-11 ; écarts 4 à 6 le 2026-10-12 (K11) ; Réponses et Corrigé le 2026-10-13 ; espaces des séries d'automatismes le 2026-10-23.

## À quoi ça sert

Le professeur compose une **fiche** (`worksheets`) à partir d'**exercices** rédigés en ubumark
(`exercises`), rangés en **sections** ; il la **distribue** à des classes ou à des élèves
(**affectation**, `worksheet_assignments`) et règle quand la **correction** leur devient visible.
L'élève la lit à l'écran, la télécharge en PDF et peut **signaler une erreur**. Le professeur
imprime la fiche, son corrigé, ou un lot de PDF par élève (ZIP). Tout PDF est compilé **dans le
navigateur** par Typst (WASM).

Termes ([CONTEXT.md](../../CONTEXT.md), « Le cours » et « Les questions ») : fiche, distribuer /
affectation, chapitre, cahier de texte, instance, correction, correction concise / détaillée,
série figée. ⚠️ « Publier » a trois sens : pour une fiche, `worksheets.status` = rédaction
**terminée** ; la mise à disposition dans un chapitre est `chapter_worksheets.published_at`.

Ailleurs : **écrire** une fiche (démarche, conventions, pièges de notation) →
[pratiques/fiches-exercices.md](../pratiques/fiches-exercices.md) ; la **notation** et le Typst de
chaque bloc (`courbe`, `figure`, tableaux de variation…) → [ubumark.md](ubumark.md) ; les modèles
de question (dont tirent les fiches d'automatismes) → [questions.md](questions.md) ; tables et
policies → [base-de-donnees.md](base-de-donnees.md) § Fiches, colonnes →
[base-de-donnees-tables.md](base-de-donnees-tables.md).

## Carte du code

### `src/lib/worksheets/` — règles propres aux fiches

| Fichier                                         | Rôle                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/worksheets/worksheet-header.ts`        | **Le type décide de l'en-tête** ([ADR 0030](../adr/0030-type-de-fiche-decide-la-forme.md)) : `worksheetHeader(type, options)` dit ce que l'en-tête imprime (nom, classe, date à remplir, date de rendu, points, calculatrice, durée, cadres) ; `TYPE_OPTION_KEYS` (options proposées par type), `configForType`. Lue par le PDF du prof et celui de l'élève.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `src/lib/worksheets/exercise-numbering.ts`      | **La** règle du numéro affiché : `groupExercisesForDisplay`, `orderExercisesForDisplay`, `displayNumberOf`, `exerciseAtDisplayNumber`. Utilisée par la page élève, le générateur PDF et le serveur.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `src/lib/worksheets/student-worksheet-typst.ts` | `generateStudentWorksheetTypst` : le PDF **élève** (et l'aperçu « vue élève » du prof), par `WorksheetGenerator` et le gabarit du style de la fiche (lot 4b).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `src/lib/worksheets/student-copies.ts`          | **Copies par élève, nom pré-imprimé** (ADR 0030, lot 5) : `sortCopyRecipients` (tri français, nom puis prénom, sans doublon), `fetchStudentCopyViews` (copie de chaque élève par l'aperçu, une seule demande si l'affectation est commune), `studentCopyTypst` (le PDF de l'élève, son nom et sa classe en plus), `assembleStudentCopies` (un document, voir § La copie d'un élève).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `src/lib/worksheets/document/`                  | Le **document d'une fiche** ([ADR 0028](../adr/0028-pdf-de-fiche-un-generateur-des-styles-et-des-formes.md), lot 1) : `WorksheetDocument` (`types.ts`), rempli par `documentFromTeacherCopy` (copie du prof) ou `documentFromStudentView` (vue élève, correction non visible → `correction: null`) ; ordre et numéros (`numbering.ts`) ; **rendu d'exercice unique** `renderExercises` (`render-exercise.ts`) ; cadres de réponse (`answer-frames.ts`, lignes réglées : `answer-frame-lines.ts`) ; `MATH_LIMITS_SETUP`.                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `src/lib/worksheets/serie-automatismes.ts`      | `buildSerie` : une **série figée** d'instances de modèles de question devient un exercice ordinaire ([ADR 0011](../adr/0011-fiche-d-automatismes-figee-par-graine.md)). Toute anomalie lève une exception. Les formules maison sont figées avec les fonctions du modèle et le sens de `AB` de l'instance ; un modèle « Espaces dès 4 chiffres » reçoit ses espaces fines dans les formules (`withDigitGrouping`). Case choix : sa liste a) b) à la place du bloc ` ```choix ` ; un choix qui est un bloc (` ```horloge `, ` ```collection `, ` ```monnaie `) garde sa lettre seule sur sa ligne, et une horloge ou une collection sans `taille:` y est réduite à 3 cm, des pièces et billets à 10 cm (`withChoiceClockSize`, `withChoiceCollectionSize`, `withChoiceMonnaieSize`). Case « choix » (bloc ` ```choix `) : la même liste `**a)** …` à la place du bloc (ordre affiché), `Réponse : **b)** …` dessous au corrigé ; le bloc compte pour une case. |
| `src/lib/worksheets/exercise-anchor.ts`         | Ancre d'un exercice de fiche (`#exercice-<worksheet_exercises.id>`, jamais le numéro) : `exerciseAnchorId`, `exerciseAnchorHash`, `worksheetExerciseIdFromHash`, `scrollToAnchoredExercise`. Notifications de signalement, fiche de l'élève, aperçu « vue élève ».                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `src/lib/worksheets/exercise-edit-link.ts`      | `exerciseEditHref`, `worksheetReturnHref` : aller-retour fiche ↔ exercice par `?fiche=<uuid>` (Zod : UUID seulement).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

### `src/lib/typst/` — de la fiche au PDF

| Fichier                                                                           | Rôle                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/typst/index.ts`                                                          | Baril public (compilateur, service, générateurs, gabarits, ré-export du transpileur ubumark).                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `src/lib/typst/compiler/typst-compiler.ts`                                        | Singleton du compilateur : charge `all-in-one-lite.bundle.js` de typst.ts depuis jsDelivr, **version épinglée** `TYPST_VERSION = '0.6.1-rc5'` (bundle + deux WASM). `getTypstCompiler`, `compileToPdf`, `compileToSvg`.                                                                                                                                                                                                                                                                                                                                            |
| `src/lib/typst/service/typst-service.ts`                                          | `TypstService` / `getTypstService` : file à priorités (`PRIORITY` : `BATCH` < `NORMAL` < `PREVIEW` < `URGENT`), cache, délai maximal, état pour l'UI.                                                                                                                                                                                                                                                                                                                                                                                                              |
| `src/lib/typst/cache/typst-cache.ts`                                              | `TypstCache` (LRU + TTL) du service.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `src/lib/typst/generators/worksheet-generator.ts`                                 | `WorksheetGenerator` (classe) : tous les PDF de fiche, prof et élève, depuis `WorksheetRow` + `InstanceData` ou un document déjà construit (`document`), avec le gabarit du style. Fonction héritée `generateWorksheetTypst` (marquée `@deprecated`, mais c'est elle qu'appellent les écrans).                                                                                                                                                                                                                                                                     |
| `src/lib/typst/generators/base-generator.ts`                                      | `BaseTypstGenerator` : contexte (mode, nom d'élève, classe), config.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `src/lib/typst/generators/notebook-generator.ts`, `src/lib/typst/notebook-pdf.ts` | Même chaîne pour les **carnets** Python (`generateNotebookPdf`) — hors fiches, voir [python/](python/).                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `src/lib/typst/templates/default-templates.ts`                                    | 13 gabarits intégrés (ids `DEFAULT_TEMPLATE_IDS`), formes du style « Fiche élève » (`STUDENT_STYLE_FORMS`, `STUDENT_STYLE_COMMON`, et `STUDENT_LANDSCAPE_STYLE_COMMON` pour sa version paysage), `renderTemplate`.                                                                                                                                                                                                                                                                                                                                                 |
| `src/lib/typst/templates/styles.ts`                                               | Styles (`BUILT_IN_STYLES`, `BUILT_IN_STYLE_OPTIONS`, `DEFAULT_STYLE_ID`, `isBuiltInStyle`), style retenu (`styleIdOf`) et `resolveTemplate` : le gabarit d'une forme dans le style de la fiche.                                                                                                                                                                                                                                                                                                                                                                    |
| `src/lib/typst/text-size.ts`                                                      | **Taille du texte** (accessibilité) : `TEXT_SIZES` (`normal`, `large`, `x_large`), `TEXT_SIZE_OPTIONS` (menu), `textSizeOf` (inconnue → normale), `withTextSize` (gabarit transformé, voir « Taille du texte »).                                                                                                                                                                                                                                                                                                                                                   |
| `src/lib/typst/labels.ts`                                                         | Habillage traduit : `documentLabels(locale)`, `labelPlaceholders(locale)`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `src/lib/typst/worksheet-palette.ts`                                              | Charte commune prof / élève : `BADGE_FILL`, `SECTION_COLOR`, `exerciseBadge`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `src/lib/typst/image-loader.ts`                                                   | Le WASM ne lit pas d'URL : `fetchExternalImages`, `urlToVirtualPath` (→ `/virtual/images/…`, posé par `mapShadow`), conversion **WebP → PNG** par canvas. **Image introuvable** (2026-10-17) : cadre « Image indisponible » à sa place, au format de son chemin virtuel (`placeholderUrlFor` → `static/images/pdf/image-indisponible.{png,jpg,gif,svg}`, Typst décode d'après l'extension) — le PDF sort quand même ; avant, une seule image manquante faisait échouer tout le PDF (« failed to load file »). Test : `typst/__tests__/image-indisponible.test.ts`. |
| `src/lib/typst/pdf-generator.ts`                                                  | `generatePdfFromTypst`, `generateAndDownloadPdf` : images suivies → chargées → compilées via le service → téléchargement.                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `src/lib/typst/utils/typst-utils.ts`                                              | `formatNumber`, `toRoman`, `formatDateFR`, `getTypeLabel`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

Le Markdown → Typst lui-même vit dans ubumark : `src/lib/ubumark/generators/typst-generator.ts`
(`generateTypst`, `escapeTypst`, `clearTrackedExternalImages` / `getTrackedExternalImages`) et
`src/lib/ubumark/generators/figure-typst-setup.ts` → [ubumark.md](ubumark.md) § Le pipeline.

### Serveur — `src/lib/server/worksheets/` et validation

| Fichier                                              | Rôle                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/server/worksheets/instance-generator.ts`    | `generateWorksheetInstance`, `generatePreviewInstance` : `InstanceData` par élève, graine selon `variant_mode` (`none`, `individual`, `n_versions`, `group`).                                                                                                                   |
| `src/lib/server/worksheets/assignment-access.ts`     | `resolveAssignmentAccess` : RPC `can_access_assignment`, puis `can_read_assignment` (relecture d'un ancien membre).                                                                                                                                                             |
| `src/lib/server/worksheets/assignment-classes.ts`    | `fetchAssignmentClasses`, `fetchClassesByAssignment`, `formatClassNames` (jonction `worksheet_assignment_classes`).                                                                                                                                                             |
| `src/lib/server/worksheets/correction-release.ts`    | Libération de la correction : `canAccessCorrections`, `releaseCorrections`, `revokeCorrections`, `updateCorrectionSettings`, `getCorrectionReleaseStatus`.                                                                                                                      |
| `src/lib/server/worksheets/correction-visibility.ts` | `isCorrectionVisible`, `getCorrectionVisibilityMap`, `getCorrectionContext` (cascade, voir plus bas). Ne vérifie **pas** l'autorisation : à l'appelant.                                                                                                                         |
| `src/lib/server/worksheets/display-number.ts`        | `fetchCopyNumbering` : le numéro d'un exercice dans la copie de chaque élève (ordre mélangé compris, `copyDisplayNumbers`), pour les signalements ; `resolveExercisesAtDisplayNumbers` (`[[worksheet:…#3]]`).                                                                   |
| `src/lib/server/worksheets/assignment-recipients.ts` | `isStudentOfAssignment` : l'élève est-il destinataire (nommé ou membre actif d'une classe visée) ? Aperçu « vue élève » et corrigé d'après la copie d'un élève.                                                                                                                 |
| `src/lib/server/worksheets/citations.ts`             | `fetchWorksheetCitations` : où la fiche est citée (cahier de texte, chapitres).                                                                                                                                                                                                 |
| `src/lib/server/worksheets/worksheet-styles.ts`      | Styles d'une fiche (lot 3b), client du prof : `listWorksheetStyles` (menu « Style »), `loadStyleTemplate` (fiche d'un style du prof) ; gabarit et style liés (D10) : `insertTemplateWithStyle`, `syncTemplateStyle`, `countWorksheetsUsingTemplate`, `deleteTemplateWithStyle`. |
| `src/lib/server/worksheets/print-settings.ts`        | Taille du texte d'un élève (`student_print_settings`), client de l'appelant : `loadTextSize`, `loadTextSizes` (par paquets de 200 ; lecture en échec → normale, jamais une erreur), `saveTextSize` (relit la ligne écrite : zéro ligne = refus de la RLS → faux).               |
| `src/lib/server/validation/worksheets.ts`            | Zod des routes : `createWorksheetSchema`, `worksheetConfigSchema`, `createWorksheetExerciseSchema`, `reorderExercisesSchema`, `updateCorrectionSettingsSchema`…                                                                                                                 |
| `src/lib/types/worksheets.ts`                        | Types de lignes et JSONB (`WorksheetConfig`, `VariantConfig`, `ResolvedExercise`, `InstanceData`), gardes `asWorksheetConfig`, `asInstanceData`, `toWorksheetRow`, langue `worksheetLocale`, `localizedText`.                                                                   |

### Routes

- Professeur : `src/routes/(protected)/dashboard/teacher/contenu/worksheets/` — liste, `new/`,
  `[id]/` (édition + `PdfPreview`), `templates/` (gabarits perso), `[id]/assignments/[assignmentId]/`
  (`preview/` vue élève, `copies/` une copie par élève à son nom, `progress/`, `reports/`
  signalements).
- Élève : `src/routes/(protected)/dashboard/student/worksheets/` (liste, `[assignmentId]/`). La liste
  s'ouvre depuis « Mon travail » (« Toutes mes fiches ») et y revient par « Retour à Mon travail ».
- Public sans compte : `src/routes/(public)/cahier/[token]/fiche/[id]/` — une fiche **citée** dans
  une séance visible du cahier partagé (`resolveWorksheetByShareToken`, `security definer`) ; même
  404 pour tout refus.
- API : `src/routes/api/worksheets/` (CRUD, `sections/`, `exercises/`, `duplicate/`,
  `exercise-number/[number]/`, `assignments/`, `instances/`, `templates/`, `pdf/`,
  `print-settings/` : taille du texte d'un élève, GET / PUT),
  `src/routes/api/student/worksheets/` (vue résolue, signalements),
  `src/routes/api/teacher/chapters/[id]/worksheets/` (fiche dans un chapitre).

### Composants

`src/lib/components/worksheets/` : `PdfPreview.svelte` (aperçu, téléchargement, lot ZIP),
`PdfSvgView.svelte` (la vue SVG d'un PDF compilé, partagée par `PdfPreview` et les copies par élève),
`CorrectionManager.svelte` (libération par affectation),
`ExerciseList.svelte` (le plan de la fiche en édition, voir ci-dessous), `MetadataCards.svelte` (config, dont la langue),
`WorksheetTypeOptions.svelte` (options du type choisi, à la création et sur la fiche, ADR 0030),
`WorksheetAssignmentForm.svelte`, `UntranslatedExercisesNotice.svelte`, `StyleSelector.svelte` (style à la création),
`TypstEditor.svelte` ; côté élève `src/lib/components/student/worksheets/WorksheetHeader.svelte`
(bouton PDF ; en tête, « Quitter » vers la liste des fiches, ou « Retour aux fiches » quand la fiche
est en consultation seule, `read_only` — [composants-ui.md § BackLink](../pratiques/composants-ui.md#backlink--bouton-retour-obligatoire)).

## Le modèle d'une fiche

```
worksheets (type, status, config jsonb, translations, style_id, school_id)
 ├── worksheet_sections (title, instructions, position, translations)
 ├── worksheet_exercises (exercise_id → exercises, section_id?, position, points,
 │                        custom_instructions, variation_index?, variant_mode/config (plus lus),
 │                        correction_visible, is_essential, translations)
 ├── worksheet_templates (template_content Typst, placeholders, style_id, form)   ← via le style
 ├── worksheet_styles (name, description, owner_id vide = Chiphre, common_typst) ← via style_id
 ├── worksheet_assignments (status, available_from, closes_at, show_corrections,
 │    │                     correction_release_mode / _at, individualized, guidance_level)
 │    ├── worksheet_assignment_classes (class_id)        ← une ligne par classe
 │    ├── worksheet_assignment_students (student_id)     ← élève désigné, sans condition de classe
 │    └── worksheet_assignment_exercise_settings (show_correction par exercice)
 ├── worksheet_instances (… instance_data jsonb) ← vide, sans écrivain (ADR 0023 : copie recalculée)
 └── worksheet_error_reports (signalement d'un élève sur un exercice → gidouille si validé)
```

- **Types** ([ADR 0030](../adr/0030-type-de-fiche-decide-la-forme.md)) : `worksheet` « Fiche
  d'exercices », `assessment` « Évaluation écrite », `homework` « Devoir maison », `exam` « Examen
  blanc » (`WORKSHEET_TYPES` ; anglais : Worksheet, Written test, Homework, Mock exam). `quiz` est
  retiré du code et refusé par Zod (la contrainte CHECK de la base l'accepte encore ; aucune
  ligne). Statut `draft` / `published` / `archived` (garde des libellés :
  `src/lib/utils/__tests__/type-de-fiche-controle.test.ts`).
- **Config** (`WorksheetConfig`, JSONB validé par `worksheetConfigSchema`) : `language`,
  `shuffle_exercises` et les **options du type** (`TYPE_OPTION_KEYS`) : fiche d'exercices →
  `show_student_name` ; évaluation écrite → `show_points`, `calculator` (`allowed` | `forbidden`),
  `answers_on_sheet` ; devoir maison → `due_date` (`AAAA-MM-JJ`, `isIsoDate`) ; examen blanc →
  `calculator`, `answers_on_sheet`. Avec `answers_on_sheet` : `answer_frames` (`question` par
  défaut | `exercise`, `ANSWER_FRAME_MODES`), placement des cadres de réponse ; gardé par
  `configForType` avec « réponses sur le sujet ». Absente = non (calculatrice absente : rien d'imprimé). Les
  anciennes clés d'affichage (`show_title`, `show_date`, `show_class`, `numbering_style`,
  `page_layout`, `font_size`, `margins`, `correction_detail`) restent acceptées par Zod pour ne pas
  être effacées au prochain envoi, mais **plus aucun code ne les lit** ; les retirer des données
  est une étape à part, avec l'accord de David.
- **Numéro affiché** ≠ `worksheet_exercises.position` : `position` redémarre à 1 dans chaque
  section ; le numéro est un ordinal continu calculé par `exercise-numbering.ts`.
- **Édition : une seule liste** (`ExerciseList.svelte`, 2026-10-16) — la fiche telle qu'imprimée :
  toutes les sections dans leur ordre, **vides comprises** (on y dépose), chacune avec titre,
  instructions et nombre de corvées, puis « Sans section », toujours dernier et sans en-tête
  quand la fiche n'a aucune section. Les sections s'y créent, se modifient, se suppriment (leurs
  corvées passent dans « Sans section », APRÈS celles qui y sont déjà : l'API `DELETE sections/[sectionId]` leur donne les rangs suivants, sinon l'index unique `idx_worksheet_exercises_unique_position`, qui met tous les hors-section dans un même groupe, refusait la suppression) et se déplacent avec leurs corvées ; il
  n'y a plus de carte « Sections » à part. Glisser-déposer `svelte-dnd-action` ; ce qu'une dépose
  enregistre (rien si l'ordre de la zone n'a pas changé, sinon la zone renumérotée 1..n, et celle qu'une corvée a quittée) est
  décidé par `worksheet-outline.ts`, qui compare aux **props** et jamais à l'état du geste (l'ombre
  de la bibliothèque y porte déjà l'identifiant de l'élément tiré). Fiche publiée : même liste,
  en lecture seule.
- **Exercice ↔ variation** : le contenu vient de `exercises.variations` (énoncé, solution, indices),
  via `getExerciseContentSafe` / `generateExerciseInstance` (`src/lib/exercises/`) ;
  `worksheet_exercises.variation_index` force une variation. Les **fonctions déclarées**
  (`generic_functions`) suivent l'exercice jusqu'au PDF. Le **sens de `AB`** (longueur ou produit,
  `capital_pairs`) aussi : résolu depuis le thème de l'exercice (`exerciseCapitalPairs`,
  `Graphes et matrices` ou physique → produit, sinon longueur), à la génération de l'instance
  (`instance-generator`, `buildWorksheetCopy`) et par les API qui composent la vue élève
  (`StudentExerciseView.capital_pairs` : le sens, pas le thème). Une instance stockée sans le
  champ s'imprime comme avant (produit).
- **Instance par élève** : à l'ouverture, l'API élève prend la ligne `worksheet_instances` si elle
  existe, sinon résout à la volée avec une graine `hash(worksheet_id, student_id)` + position.
  L'élève ne peut pas écrire d'instance (`tests/integration/worksheet-instance-not-writable-by-student.test.ts`).
- **Affectation** : l'accès est **hérité** à chaque lecture (`student_has_worksheet_access` →
  jonction des classes / élèves désignés → `class_members`), jamais matérialisé ; un ancien membre
  garde la relecture (`had_class_access_to_assignment`). La colonne historique
  `worksheet_assignments.class_id` n'existe plus (« voie 1 » soldée,
  [journal](../archive/wip/voie1-affectations-fiches-progress.md)). Détails :
  [base-de-donnees.md](base-de-donnees.md) § Fiches.
- **Correction visible** si, dans l'ordre : interrupteur global `show_corrections` de l'affectation,
  surcharge par exercice (`worksheet_assignment_exercise_settings`), défaut de la fiche
  (`worksheet_exercises.correction_visible`), puis le moment (`correction_release_mode` :
  `manual`, `immediate`, `scheduled`, `after_due`). Libérer échoue plutôt que de libérer à un
  sous-ensemble silencieux d'élèves.
- **Fiche d'automatismes** : exercices ordinaires dont l'énoncé est une série figée (graine fixe,
  même copie pour la classe), créés par script (`scripts/create-automatismes-evolutions-1spe.ts`) —
  [ADR 0011](../adr/0011-fiche-d-automatismes-figee-par-graine.md),
  [pratiques § 2 bis](../pratiques/fiches-exercices.md).

## La copie d'un élève

[ADR 0023](../adr/0023-copie-d-une-fiche-niveau-de-guidage-par-affectation.md) : **une seule
fonction** calcule la copie, pour tous les chemins — écran et PDF de l'élève
(`api/student/worksheets/[assignmentId]`), aperçu d'affectation (`.../preview`), corrigé du prof
(`.../correction`, `CorrectionManager.svelte`), aperçu, lot ZIP et correction générale
(`PdfPreview.svelte`), cahier de texte public.

- **Version** d'un exercice = son **niveau de guidage**, choisi à l'affectation
  (`worksheet_assignments.guidance_level`, guidé par défaut), **jamais tiré** :
  `guidanceVariationIndex` (`src/lib/worksheets/student-copy.ts`) prend le niveau demandé, sinon le
  plus proche du côté le plus guidé. `worksheet_exercises.variation_index`, s'il est posé, prime.
- **Valeurs tirées** (exercices à variables) : `copySeed` — affectation (fiche hors affectation), +
  élève si l'affectation est individualisée (`individualized`, NULL = oui), + `worksheet_exercises.id`
  (réordonner la fiche ne change rien). Non individualisée : même copie pour toute la classe.
- **Ordre** (option de fiche « mélanger les exercices », `config.shuffle_exercises` ; décision de
  David du 2026-10-13) : `copyExerciseOrder` (`worksheet-copy.ts`), **seulement dans une
  affectation**. Même portée que les valeurs (la classe, ou l'élève si l'affectation est
  individualisée), mais une **graine dédiée par section**, `copyOrderSeed` (`…:ordre:<section>`
  au lieu de `…:exercice:<id>`) : l'ordre ne se corrèle pas aux valeurs, mélanger ne change ni les
  valeurs ni les versions, et ajouter un exercice à une section ne rebat pas les autres. Mélange **à
  l'intérieur** de chaque groupe d'affichage (sections dans leur ordre, puis les exercices hors
  section, eux aussi mélangés entre eux, toujours après) ; numérotation continue dans l'ordre
  affiché. La copie du prof le porte dans `exercise_order` (indices dans `exercises`, absent sans
  mélange : empreinte identique) ; l'API élève et l'aperçu d'affectation servent `exercises` dans
  l'ordre de la copie avec `shuffled: true` (ordre tiré sur toutes les lignes de la fiche, AVANT
  d'écarter un exercice orphelin, comme la copie du prof ; sections illisibles sur une fiche mélangée
  → 500 plutôt qu'un ordre faux), que suivent l'écran de l'élève
  (`groupExercisesForDisplay(…, { preserveExerciseOrder })`) et son PDF (`documentFromStudentView`).
  Hors affectation (page de la fiche, aperçu, lot ZIP, cahier ou cours publics) : ordre des
  positions. Réaffecter → autre tirage. La case « Mélanger dans les sections »
  (`shuffle_within_sections`) est retirée de l'interface (D6) : `asWorksheetConfig` ne la lit plus,
  le schéma serveur l'accepte encore pour ne pas l'effacer des fiches qui l'ont en base.
- `resolveCopyExercise` produit l'exercice ; `src/lib/worksheets/worksheet-copy.ts` l'applique à la
  fiche entière et lit le niveau (inconnu → guidé). Génération en échec : le texte brut de la MÊME
  version.
- Hors affectation : guidé par défaut ; l'aperçu du prof a un choix « Niveau à imprimer » (absent du
  cahier public). Le lot ZIP de la page de la fiche donne donc la même copie à chaque élève, à son nom.
- Le corrigé du prof est la copie commune, sauf si chaque élève a sa version
  (`hasPerStudentCopies` : affectation individualisée ET valeurs tirées ou mélange ; décision D6).
  Alors `.../correction` sans `studentId` répond `needs_student` ; `CorrectionManager` ouvre la
  liste des élèves de l'affectation (triée par nom, premier par défaut, `MySelect`) et redemande
  avec `studentId` (contrôlé par `isStudentOfAssignment`, sinon 400) : le corrigé est la copie de
  cet élève (valeurs et ordre), son nom n'est pas imprimé, et l'avertissement localisé
  `individualCopyNotice` (« Chaque élève a sa propre version : consulte ta correction
  personnelle. ») est imprimé en tête (`generateWorksheetTypst({ individualCopyNotice })`). Les
  exercices n'y ont ni numéro ni carré, le titre seul (`display.titleOnly`), « Exercice sans
  titre » s'il manque (`untitledExercise`) ; même règle pour le PDF de l'aperçu vue prof. La
  réponse porte `per_student_copies`.
- Signalements (D6) : la liste du prof (`api/worksheets/[id]/reports`, `.../assignments/[id]/reports`),
  la page du signalement et la notification de l'élève citent le numéro de l'exercice **dans la
  copie de l'élève** (`fetchCopyNumbering`, même calcul que la copie ; inconnu → aucun numéro dans
  la notification, « — » côté prof). La notification mène à
  `/dashboard/student/worksheets/<affectation>#exercice-<id>` : la fiche défile jusqu'à l'exercice
  et le met en évidence. La page du signalement offre « Voir la copie de <prénom> » (aperçu
  `.../preview?studentId=<élève>&depuis=signalement&signalement=<id>#exercice-<id>`,
  `assignmentPreviewHref` dans `src/lib/navigation/return-links.ts` ; `studentId` retenu seulement
  pour un élève de l'affectation ; le bouton retour de l'aperçu revient alors au signalement,
  `assignmentPreviewReturn` ; lien proposé seulement si l'auteur est encore destinataire,
  `context.student_is_recipient`, sinon « Copie de <prénom> indisponible : n'est plus dans la
  classe », ou « … pour le moment » si la lecture échoue ; un `studentId` écarté est signalé dans
  l'aperçu, `discardedStudent`, jamais remplacé en silence) et « Corriger l'exercice » (`/dashboard/teacher/contenu/exercices/<id>`).
  Côté élève, ses signalements (onglet de la fiche `api/student/worksheets/[assignmentId]/reports`,
  `api/student/reports`, réponse de `.../exercises/[exerciseId]/report`) portent le numéro de SA
  copie (`fetchCopyNumbering` avec son identifiant), `null` si la fiche lui est illisible (ancien
  membre) : `StudentReportCard` et `CancelReportDialog` n'affichent alors aucun numéro. Aucune
  règle d'accès ne change : chacun ne reçoit que le numéro de sa propre copie (le prof, ceux de ses
  élèves).
- Aperçu « vue prof » d'une affectation où chaque élève a sa version (D6) : même règle que le
  corrigé de classe. `.../preview` accepte `copyOf=<élève>` (contrôlé par `isStudentOfAssignment`,
  sinon 400 ; ignoré si la copie est commune) et sert `per_student_copies` ; l'écran redemande
  avec le premier élève de la liste, propose « Copie de référence » (`MySelect`), avertit, et le
  PDF (`generateStudentWorksheetTypst(…, { individualCopyNotice })`) imprime l'avertissement en tête,
  sans nom d'élève (vue prof : corrections toutes visibles).
- Le signalement d'erreur d'un élève enregistre la version et la graine de SA copie
  (`worksheetExerciseSeed`, 31 bits, tient dans `worksheet_error_reports.seed`).
  Seuls le prof et l'admin traitent le signalement (statut, relu par, date, réponse) : la base le
  refuse à l'élève (`20261016101700`).
- Groupes de niveau : la même fiche affectée plusieurs fois, chaque affectation visant ses élèves
  nommément ; un élève ne lit pas l'affectation d'un autre groupe.
- Le réglage par exercice « Mode de variante » (`variant_mode`) est retiré de l'interface et n'est
  plus lu par les chemins vivants.

Tests : `src/lib/worksheets/__tests__/student-copy.test.ts`, `worksheet-copy.test.ts`,
`worksheet-copy-ordre.test.ts` (mélange), `worksheet-copy-numeros.test.ts` (numéro dans la copie,
`hasPerStudentCopies`), `exercise-anchor.test.ts`, `copie.test.ts` des trois routes, `ordre.test.ts` de
l'aperçu d'affectation (API élève et aperçu), `ordre-melange.svelte.test.ts` (écran de l'élève), `PdfPreview-copie.svelte.test.ts`, `tests/integration/worksheet-assignment-guidance-level.test.ts`.

### Copies par élève, nom pré-imprimé (ADR 0030, lot 5)

Depuis une affectation (bouton « Imprimer une copie par élève » sur la fiche et sur l'aperçu), la page
`[id]/assignments/[assignmentId]/copies/` fabrique **dans le navigateur du prof** un PDF d'une copie
par élève visé, jamais stocké :

- **Élèves** : la liste de l'affectation, `GET /api/worksheets/assignments/[id]/students` (membres
  actifs des classes visées, l'archivé exclu, plus les élèves visés nommément ; réservée au créateur
  et à l'admin), triée en français, nom puis prénom, chacun une fois.
- **Copie** : celle de l'aperçu « copie d'un élève » (`…/preview?studentId=`), au niveau de guidage de
  l'affectation ; affectation commune (`per_student_copies` faux) : une seule demande, la même copie
  pour tous.
- **Rendu** : exactement le PDF de l'élève (énoncés seuls, mêmes cadres, même `worksheetHeader`) ;
  le nom (« Nom Prénom », jamais saisi) remplit la ligne « Nom » **toujours**, même sur une fiche
  d'exercices sans « Nom de l'élève » (décision de David, 2026-10-15 : l'option ne règle que la
  ligne à remplir du PDF commun) ; la classe, si elle est connue, sinon ligne
  à remplir (jamais les classes de toute l'affectation).
- **Nom et classe = texte, jamais code** : l'élève écrit lui-même son nom (profil). Le générateur
  les insère en chaîne Typst littérale (`typstTextLiteral` : `#"…";`, `\` et `"` échappés,
  caractères de contrôle remplacés), pour toutes les fiches ; `escapeTypst` laissait passer `]`,
  `//`, `<…>` (un nom pouvait fermer un bloc du gabarit et faire évaluer la suite, ou casser tout
  le paquet).
- **Compilations une à une** : elles partagent le compilateur et ses images (`resetShadow`) ;
  le dernier choix du sélecteur gagne. Retour : la fiche, ou l'aperçu si l'on en vient
  (`?depuis=apercu`, `assignmentCopiesReturn`) ; une affectation d'une autre fiche que celle de
  l'adresse est refusée.
- **Assemblage** (`assembleStudentCopies`) : un bloc `#[…]` par copie (ses réglages de page ne
  débordent pas), `#pagebreak(weak: true)` entre deux copies, `counter(page).update(1)` en tête ; le
  total « page / N » est lu à la fin de la copie : `counter(page).final()` et `display(…, both:
true)` sont réécrits en `counter(page).at(<chiphre-copie-fin-i>)`. Un gabarit du prof qui compte
  ses pages autrement afficherait le total du paquet.
- Mesure (2026-10-16, compilateur de prod) : 35 copies de 2 pages, 70 pages, compilées en moins
  d'une seconde. Le style Examen (retiré du menu) n'a pas de `{{student_name}}` : nom non imprimé.

## La production PDF

```
exercises.variations (ubumark, FR + translations.en)
  → InstanceData / StudentWorksheetView (contenu résolu dans la langue de la fiche)
  → WorksheetGenerator (prof : le gabarit de la forme ; fiche | réponses | corrigé | fiche + corrections)
    (élève : generateStudentWorksheetTypst → le même WorksheetGenerator, document de la vue)
      → generateTypst (ubumark) par énoncé / solution ; blocs figure via figure-typst-setup
  → source Typst (une chaîne)
  → images externes : getTrackedExternalImages → fetchExternalImages (WebP → PNG)
                      → mapShadow('/virtual/images/…')
  → typst.ts 0.6.1-rc5 (WASM, navigateur) → Uint8Array → Blob / ZIP (JSZip)
```

Trois chemins d'appel, qui n'empruntent pas le même compilateur :

| Écran                                                            | Générateur                      | Compilation                                                                                                      |
| ---------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Élève (`WorksheetHeader.svelte`), aperçu « vue élève » du prof   | `generateStudentWorksheetTypst` | `generateAndDownloadPdf` → `TypstService` (priorité `URGENT`) ; avec corrigé : `compileTypstDocument`            |
| Prof, fiche (`PdfPreview.svelte`, aussi page publique du cahier) | `generateWorksheetTypst`        | `compileTypstDocument` ; lot : une compilation par élève + réponses ou corrigé général + `00_SOMMAIRE.txt` (ZIP) |
| Prof, corrections (`CorrectionManager.svelte`)                   | — (Typst rendu par l'API)       | `compileTypstDocument` (compilateur du Corrigé, repli)                                                           |

**Styles et gabarits** (ADR 0028, lot 2 ; `src/lib/typst/templates/styles.ts`) : une **forme** = un
gabarit. Chaque gabarit intégré est un **style** (`BUILT_IN_STYLES`) ; le style par défaut,
**« Fiche élève »** (`DEFAULT_STYLE_ID`, D7), a ses quatre formes (`STUDENT_STYLE_FORMS` : fiche,
réponses, corrigé, fiche + corrections) et un code commun (`STUDENT_STYLE_COMMON`, inséré à la
place de `{{style_common}}`). **« 2 colonnes - paysage »** (`studentStyleLandscape`, David,
2026-10-16) reprend ces quatre formes avec un autre code commun
(`STUDENT_LANDSCAPE_STYLE_COMMON` : la même page, `flipped: true`) : tout le document, corrigé
compris, est en A4 paysage. Les onze autres n'ont que leur fiche et prennent les autres formes du
style par défaut. Le style ne décide plus des **points** : le type de la fiche s'en charge,
quel que soit le style (ADR 0030, qui remplace D8 : « Fiche élève » imprime les points d'une
évaluation écrite qui les demande). `resolveTemplate(style, forme, gabarit lu en base)` : le style
retenu est `styleIdOf(fiche)` = `style_id` (l'ancien `template_id` est retiré, #1529), inconnu
ou vide → « Fiche élève » ; le gabarit lu en base ne sert qu'à la forme « fiche » d'un style du
prof (ignoré pour un style de Chiphre : son Typst vient du code). **Plus de mise en page écrite dans le code** : une fiche sans
gabarit prend la fiche « Fiche élève ». Le bandeau vert des corrigés (« CORRECTION », « RÉPONSES »,
« SOLUTIONS » / « ANSWERS », placeholder `{{form_title}}`) et l'avertissement de la copie
individuelle (`{{individual_copy_notice}}`) sont **écrits dans le gabarit**, dans le bloc
d'en-tête pleine largeur, plus injectés. Fiche + corrections (`withCorrections: 'answers' |
'correction'`) : la fiche, puis `{{corrections}}` sur une nouvelle page, chaque correction dans
les polices du Corrigé (bandeau et titres dans la police du document ; `{{correction_fonts}}`, vide,
reste servi pour un gabarit enregistré qui le porterait). Les opérateurs à limites
(`MATH_LIMITS_SETUP`) sont posés en tête de tout document produit par un gabarit. Un gabarit qui
contient `{{exercises_badge}}` reçoit la numérotation en carré ambre (charte élève) ; sinon
`{{exercises}}` en titres gras. Format : A4 partout, même en anglais (ADR 0030).

**Taille du texte** (accessibilité, élèves malvoyants ; demande de David, 2026-10-16 ;
`src/lib/typst/text-size.ts`) : trois paliers, **Normale** (le gabarit tel quel, 10 pt pour « Fiche
élève »), **Grande** (× 1,4 : 14 pt) et **Très grande** (× 1,8 : 18 pt) — paliers confirmés par
David le 2026-10-19. Option `textSize` du
générateur (`WorksheetGeneratorOptions`, `GenerateTypstParams`, `StudentPdfOptions`). Le **gabarit**
est transformé avant d'y placer les exercices (`withTextSize`) : chaque `size: Npt` est multiplié
(titres, pied de page ; les tailles en `em` suivent seules). La **mise en page du style ne change
pas** : ses colonnes restent (David n'a pas voulu de passage à une colonne, 2026-10-16). Les exercices n'ont aucune taille fixe : ils
suivent le texte, maths comprises. Un gabarit écrit par un prof est transformé de la même façon.
**« Fiche élève » en Grande ou Très grande passe en paysage** (David, 2026-10-17), toutes formes
sauf Réponses (fiche, corrigé, fiche + réponses, fiche + corrigé) : `printedStyleId` (`styles.ts`)
imprime alors son jumeau « 2 colonnes - paysage » (mêmes gabarits, page retournée, deux colonnes).
Les autres styles, la taille normale et le style d'un prof ne changent pas d'orientation.
Où la taille est choisie :

- **réglage de l'élève** (`student_print_settings`, voir [base-de-donnees.md](base-de-donnees.md)) :
  son PDF (menu « Taille du texte » à côté du bouton PDF, qu'il peut changer : enregistré pour
  toutes ses fiches), sa copie nominative (`CopyRecipient.text_size`, lue par la page `copies/` ;
  un lot mélangé garde la taille de chacun), l'aperçu « vue élève » du prof (`preview/`, où changer
  la taille d'un élève prévisualisé **l'enregistre pour lui** ; c'est le seul endroit où le prof
  règle la taille d'un élève, choix confirmé par David le 2026-10-19) ;
- **au coup par coup** : `PdfPreview` (aperçu générique du prof, lecteur du cahier public compris)
  et l'aperçu `preview/` en vue prof — normale à chaque ouverture, jamais enregistrée.
  Tests : `typst/__tests__/text-size.test.ts`, `generators/__tests__/worksheet-generator.test.ts`
  (« taille du texte »), `worksheets/__tests__/copies-par-eleve.test.ts`,
  `server/worksheets/__tests__/print-settings.test.ts`, route `api/worksheets/print-settings/__tests__/`.

**L'en-tête selon le type** (ADR 0030, lot 1) : le générateur appelle `worksheetHeader` et pose les
conditions des gabarits : `show_title` (toujours), `show_identity` (bloc nom / classe / date),
`show_student_name`, `show_class`, `show_date` (ligne **à remplir**, plus la date du jour),
`show_due_date` (`{{due_date}}` dans la langue du document, ligne si absente), `show_points` (points
par exercice), `show_total` (total : `total_points` de la fiche, sinon somme des points des
exercices), `show_calculator` (`{{calculator}}` : « La calculatrice est autorisée / interdite. »),
`show_duration` (examen blanc avec durée), `show_header_notes` (ligne durée / calculatrice / total,
`HEADER_NOTES`). Nom, classe et date inconnus deviennent des lignes à remplir (`fillLine`). Les
douze styles de Chiphre lisent ces conditions ; un gabarit du prof qui ne connaît que les anciennes
(`show_date`, `show_points`…) reste juste. Les formes Réponses et Corrigé n'impriment que le titre (`TITLE_ONLY_HEADER`, décision de David
du 2026-10-15) ; la fiche + corrections garde l'en-tête du sujet.
Tests : `typst/generators/__tests__/en-tete-par-type.test.ts` (chaque type, FR et EN, « Fiche
élève » et « Standard », prof et élève), `worksheets/__tests__/worksheet-header.test.ts`.

**Styles en base** (lot 3a, migration `20261016103200_worksheet_styles`) : table
`worksheet_styles`, une ligne par style de Chiphre (mêmes identifiants que leur gabarit, propriétaire
vide ; leur Typst reste dans le code, D9) et une par style d'un prof. `worksheet_templates` porte
`style_id` et `form` (un gabarit par couple) ; `worksheets.style_id` (vide = « Fiche élève » ;
style supprimé → vide). L'ancienne colonne `worksheets.template_id` a été recopiée dans `style_id`
(`20261017090300`, #1529), puis retirée (`20261019221542`). Accès (D9) : le prof et l'admin lisent les
styles de Chiphre et les leurs, ne modifient que les leurs (l'admin, tous) ; ni élève ni visiteur
n'y accède (`tests/integration/styles-de-fiche.test.ts`).

**Choisir le style** (lot 3b) : menu « Style » de la fiche (`MetadataCards`) et de la création
(`StyleSelector`, « Fiche élève » présélectionné, pas d'option « Aucun ») : les styles de Chiphre
(`BUILT_IN_STYLE_OPTIONS` : sans « Contrôle », « Examen », « Devoirs », « Quiz », qui imitaient
un type ; retirés du menu, toujours résolus pour une fiche qui en désigne un — ADR 0030, lot 2)
dans l'ordre du code, puis ceux du prof (`listWorksheetStyles`, client du prof). Fiche sans style
→ « Fiche élève (par défaut) » ; style illisible → idem. Choisir écrit `style_id` (Zod uuid), et
lui seul : `POST`/`PUT /api/worksheets` refusent une clé `template_id` (400) ; un style d'un autre auteur est refusé par le trigger (`42501` → 403). Dupliquer recopie
le style (sauf l'admin qui duplique la fiche du prof avec un style du prof : vide). `GET /api/worksheets/[id]` rend dans `template`
la fiche d'un style du prof (`loadStyleTemplate`, avec son Typst) pour le PDF ; changer de style
recharge la page. Le panneau « Options d'affichage » n'existe plus (ADR 0030) : la carte
« Options » (`WorksheetTypeOptions`) ne montre que les options du type choisi, plus « Mélanger
les exercices » ; à la création, seules les options du type choisi partent (`configForType`). **Gabarit et style liés** (D10) : la page « Gabarits » ne change pas à l'écran,
mais créer un gabarit (nouveau, depuis un gabarit de Chiphre, duplication, API) crée son style au
même identifiant et au même nom ; le renommer le renomme ; le supprimer supprime le style (cascade
vers le gabarit), refusé tant qu'une fiche désigne son style (`style_id`)
(`tests/integration/fiche-choix-du-style.test.ts`). Liens partagés
(lot 4a, D11, migration `20261016103500_style_fiche_liens_partages`) : `get_worksheet_by_share_token`
et `get_course_worksheet_by_share_token` rendent aussi `style_id` et `template`, la fiche du style retenu **seulement si ce style appartient à l'auteur de la fiche** (style de
Chiphre : `null`, Typst dans le code ; style d'un autre compte : jamais)
(`tests/integration/style-fiche-liens-partages.test.ts`). Les pages publiques les passent au PDF
(`PdfPreview` → `generateWorksheetTypst`, lot 4b).

**PDF de l'élève par le générateur unique** (lot 4b) : `generateStudentWorksheetTypst` construit le
document de la vue (`documentFromStudentView`) et le donne à `WorksheetGenerator` (entrée
`document`), avec le gabarit du style retenu (`styleIdOf`). L'API élève et l'aperçu « vue élève »
renvoient `style_id`, `template` (le Typst seul de la fiche d'un style de
l'**auteur** de la fiche, lu en service-role après le contrôle d'accès,
`loadAuthorStyleTemplate`), `total_points`, `estimated_duration_minutes` et les options du type
(`viewTypeOptions` : `show_student_name`, `show_points`, `calculator`, `answers_on_sheet`,
`answer_frames`, `due_date`), que `worksheetHeader` lit comme pour le prof. Avec « réponses sur le
sujet », chaque exercice de la vue porte `printed_frame_lines` (lignes des cadres **résolues** par le
serveur : réglage du prof lu avec la ligne `worksheet_exercises.answer_frame_lines`, sinon estimation
sur le corrigé de la copie de l'élève, **même si la correction est masquée** : seules les lignes
partent, jamais le texte ni la colonne brute), pour que l'élève ait les mêmes cadres que le prof.
Seulement ce que le PDF imprime (`resolveAnswerFrames`, audit S1) : les lignes par question en mode
question, le cadre unique en mode exercice ou sans question ; entiers 0..25, au plus 200 (tronqué,
jamais d'erreur ; schéma de réponse `.strict()`). Tests : `copie.test.ts` (API élève) et `preview/__tests__/cadres-de-reponse.test.ts`, correction masquée. Partie de fin (réponses ou corrigé) : forme « fiche + corrections » ; un style qui
n'a que sa fiche garde sa fiche et reçoit après elle `CORRECTIONS_PART` (nouvelle page, bandeau
vert, polices du corrigé sur chaque correction ; décision de David). Seules les corrections visibles sont imprimées
(`renderExercises` écarte `correction === null` hors fiche). Ce que seul l'élève reçoit
(`renderDocumentPreamble`) : avertissement de la copie individuelle, consignes de l'affectation
(dans la case `{{instructions}}` d'un gabarit qui en a une), légende ★ ; ★ et filet orange des
exercices indispensables dans les habillages `heading` et `badge`. Points : comme le prof, selon
le type (ADR 0030). La description de la fiche n'est plus imprimée
(décision de David). Tests : `worksheets/__tests__/pdf-eleve-style.test.ts`,
`tests/integration/pdf-eleve-style.test.ts`.

**Fiche + corrigé du prof** (demande de David, 2026-10-14, comme avant le lot 2) : choix
« Fiche + corrigé » de `PdfPreview` (`WorksheetPdfKind` `worksheet_correction`, fichier « … - Fiche et
corrigé.pdf ») → `generateWorksheetTypst({ mode: 'worksheet', inlineCorrections: true })` : la fiche
du style, « — Correction » après le titre, et sous chaque énoncé sa correction (fond gris, police du
corrigé bornée au bloc `#[ … ]`, « Correction non écrite. » si absente), sans cadre de réponse.
Toutes les corrections (copie du prof) ; ZIP par élève : la version de chaque élève, sans corrigé
général. Aperçu markdown : `renderMarkdownPreview(doc, 'worksheet', { inlineCorrections })`. Test :
`typst/generators/__tests__/fiche-et-corrige.test.ts`.

**Un document, un rendu d'exercice** (ADR 0028, lot 1) : les deux générateurs construisent un
`WorksheetDocument` puis appellent `renderExercises(doc, forme, habillage)`. Les habillages
(`heading` : `{{exercises}}` ; `badge` : `{{exercises_badge}}`) ne changent que la présentation. L'aperçu markdown à l'écran de `PdfPreview` passe par le
même document (`renderMarkdownPreview`) : mêmes ordre, numéros, sections et « correction non
écrite » que le PDF. Communs aux deux
PDF : titre d'exercice avec ses formules (`processTableCellContent`), ordre et numérotation
(chiffres arabes, ADR 0030 ; `exercise_order` côté prof), points en « pt » / « pts » de
`documentLabels` (aussi en anglais) quand le type les imprime (`display.showPoints`), cadres de
réponse (ci-dessous), exercice hors section après des sections sous
« Autres exercices » ; **les Réponses n'impriment aucun titre de section** (forme seule et fin
de « fiche + réponses » de l'élève ; David, 2026-10-17 : de la place pour rien) — la fiche et le
corrigé les gardent ; correction non écrite → « Correction non écrite. » sous le numéro (Corrigé,
et Réponses quand il n'y a ni réponses ni corrigé), opérateurs à limites (`MATH_LIMITS_SETUP`). L'API élève (et celle d'aperçu de
l'affectation) transmet les options du type ; l'ordre de la copie de l'élève est celui des positions, sauf fiche
qui mélange ses exercices (voir « La copie d'un élève » : `shuffled`, suivi par
`documentFromStudentView`).

**Cadres de réponse** (ADR 0030, lot 3 ; `worksheets/document/answer-frames.ts`) : seulement avec
« réponses sur le sujet » (`display.answersOnSheet`), seulement sur la fiche (jamais en Réponses ni
en Corrigé, ni dans la partie de fin, ni avec les corrections en ligne). Une **question** = un
élément de premier niveau d'une liste numérotée de premier niveau de l'énoncé (`questionItems` ;
plusieurs listes séparées par des paragraphes comptent toutes ; les sous-questions restent dans le
cadre de leur question). Mode `question` (`display.answerFrames`, défaut) : un cadre à la fin de
chaque question, après ses sous-questions, posé par l'option `afterQuestion` du générateur Typst
(`typst-generator.ts`, aucun nouveau nœud d'AST) ; énoncé sans question : un seul cadre à la fin.
Mode `exercise` : un seul cadre à la fin de l'énoncé. **Hauteur** (`estimateAnswerFrames(énoncé,
corrigé)`, une seule fonction : adaptateur du prof, serveur pour l'élève) : le corrigé de la même
variante est découpé pareil ; autant d'éléments que de questions → taille de la réponse k pour la
question k, sinon (ou corrigé vide) moyen partout. Longueur d'une réponse (`answerLines`) : lignes
estimées — caractères visibles à 60 par ligne (formules sans leurs commandes LaTeX), une ligne par
ligne de formule centrée ou rangée de tableau, 6 par figure. ≤ 2 lignes : petit (2,5 cm) ; ≤ 5 :
moyen (4,5 cm) ; au-delà : grand (7 cm). Cadre unique : taille de tout le corrigé, puis 10 cm (≤ 14 lignes) et 14 cm au-delà — hauteurs fermées (`EXERCISE_FRAME_HEIGHTS_CM` : 2,5 / 4,5 / 7 / 10 / 14). Comptés aussi : le texte des mots-dièse, mentions et liens internes. **Un cadre n'est jamais seul en haut d'une
colonne** : question d'un seul bloc → insécable avec son cadre ; question à sous-questions → sa
dernière sous-question (ou son dernier bloc) est `sticky` ; cadre unique → le dernier bloc de
l'énoncé est `sticky` (option `keepEndWithNext` du générateur ; une liste : son dernier élément
seulement). Un énoncé long reste sécable.
Tests : `worksheets/document/__tests__/cadres-de-reponse.test.ts`,
`typst/generators/__tests__/cadres-de-reponse-pdf.test.ts` (prof et élève).

**Cadres en lignes, réglés par le prof** (ADR 0030, lot 4 ;
`worksheets/document/answer-frame-lines.ts`) : unité = la **ligne** de 0,8 cm
(`ANSWER_FRAME_LINE_CM`). L'estimation ci-dessus devient le départ « auto » : petit 3 lignes,
moyen 5, grand 8 ; cadre unique, sa hauteur fermée convertie et arrondie (2,5 / 4,5 / 7 / 10 / 14 cm
→ 3 / 6 / 9 / 13 / 18 lignes). Réglage dans `worksheet_exercises.answer_frame_lines` (jsonb,
`{ questions: (int|null)[], exercise: int|null }`, `null` = auto, 0 = pas de cadre, 0..25
(20 cm ; `ANSWER_FRAME_MAX_LINES`, partagé par le Zod du PUT, les schémas de réponse, la lecture de
la colonne et le stepper), ≤ 200 ; contraintes CHECK et Zod `answerFrameLinesSchema` `.strict()`).
La **duplication** d'une fiche (`POST /api/worksheets/[id]/duplicate`) recopie le réglage de chaque
exercice (voir « Duplication d'une fiche » ci-dessous). Le **lien de partage** (cahier de texte, cours partagé) le reçoit des RPC
`get_worksheet_by_share_token` / `get_course_worksheet_by_share_token` (`20261016104000`) : les
exercices passent tels quels par `resolve…ByShareToken`, puis `PdfPreview` (`buildWorksheetCopy`,
`toAnswerFrameLines`) imprime les mêmes cadres que le prof (tests
`server/__tests__/cadres-lignes-lien-partage.test.ts`, intégration `cadres-lignes-duplication`). **Résolution**
(`resolveAnswerFrames`, une seule pour tous les PDF) : valeur du prof si non nulle, sinon
l'estimation ; si la longueur de `questions` n'est plus le nombre de questions de l'énoncé (exercice
modifié, ou variante qui n'en a pas autant), toutes les valeurs par question repassent en auto (le
cadre unique garde la sienne). Le PDF du prof la reçoit par la copie (`buildWorksheetCopy` →
`ResolvedExercise.answer_frame_lines` → `documentFromTeacherCopy`) ; celui de l'élève par
`printed_frame_lines`. **Écran** : `AnswerFrameLinesEditor.svelte`, sous chaque exercice de
`ExerciseList` si la fiche a « réponses sur le sujet » — une ligne par question (« Question 1 [−]
3 lignes [+] auto »), ou « Cadre » en mode exercice ; « modifié ↺ » (↺ remet en auto) ; 0 ligne =
« (pas de cadre) » ; avertissement « Les questions de l'exercice ont changé : cadres remis en
automatique ». Estimation de départ : copie guidée hors affectation (celle de l'aperçu PDF).
Sauvegarde optimiste regroupée (600 ms) et en série (une requête à la fois ; envoyée aussitôt, `keepalive`, si l'éditeur est démonté avant) par `PUT /api/worksheets/[id]/exercises/[exerciseId]`
(brouillon seulement, comme les points ; écriture `.select()`, aucune ligne rendue → 404
explicite), retour arrière + `toaster.error` si elle échoue. Le schéma de mise à jour n'applique
plus les défauts de la création (`.partial()` seul remettait `is_essential` à faux). Nombre de
pages : `PdfPreview` affiche « Aperçu : N pages » (⚠ au-delà d'une) après compilation
(`typst/pdf-page-count.ts`, compte les objets `/Type /Page` du PDF de Typst).
Tests : `document/__tests__/cadres-lignes.test.ts`, `typst/generators/__tests__/cadres-lignes-pdf.test.ts`,
`validation/__tests__/cadres-lignes.test.ts`, `exercises/[exerciseId]/__tests__/cadres-lignes.test.ts`,
`components/worksheets/__tests__/cadres-lignes.svelte.test.ts`, `tests/integration/pdf-eleve-style.test.ts`
et `cadres-lignes-par-question.test.ts`.

**Duplication d'une fiche** (`POST /api/worksheets/[id]/duplicate`) : la copie reprend tout ce
qui définit le contenu — fiche (dont `translations`, `config`, `style_id`, `type`, durée, points,
niveaux), sections (dont `translations`) et exercices (dont `translations`, `is_essential`,
`variation_index`, `correction_visible`, `answer_frame_lines`), plus les étiquettes. Ne sont pas
recopiés : identifiants et horodatages, `status` (brouillon), `version` (1), `published_at`,
`archived_at`, `created_by` / `school_id` (qui duplique), le titre (suffixé « (copie) ») ;
`section_id` est remappé vers la section copiée. Tout est lu avant d'écrire ; chaque insertion
vérifie son erreur et ses lignes rendues (`.select`) ; au moindre échec la copie créée par la
requête est supprimée (nettoyage lui-même vérifié, journalisé sinon) et la route répond 500. Tests :
`duplicate/__tests__/echec-partiel.test.ts`, intégration `duplication-fiche-complete` (colonne par
colonne) et `cadres-lignes-duplication`.

**Trois PDF du prof** (`WorksheetPdfMode`, choix « Fiche · Réponses · Corrigé » de `PdfPreview` ;
la lecture publique `variant="reader"` reste sur la fiche) :

- `worksheet` : les énoncés, consignes du prof et, avec « réponses sur le sujet », les cadres de
  réponse (après chaque question ou après l'exercice) ;
- `answers` : pour chaque exercice, numéro et titre puis `answers` (champ `answers_md` de la
  variation, `{{var}}` résolues comme dans la correction, traduction `translations.en.answers_md`
  avec repli français) ; vide : « Réponses non rédigées : voir le corrigé. » en italique. Police
  standard ;
- `correction` : numéro et titre puis la correction, toujours détaillée (`correctionForPrint`,
  ADR 0017 et 0030) ; **la correction seule** en **Shantell Sans** (Light, Bold pour le gras) et
  **Chiphre Math** pour les formules — bandeau, titres d'exercice, titres de section, pied de page
  dans la police du document (David, 2026-10-18).

Réponses et Corrigé ne répètent **jamais l'énoncé** (ni consigne d'exercice, ni consigne de
section, ni consignes d'épreuve). Noms de fichier distincts : `worksheetPdfFileName`
(« … - Réponses.pdf », « … - Corrigé.pdf »). Côté élève, la boîte de téléchargement propose « avec
réponses » (partie « Réponses ») ou « avec corrigé » (partie « Corrections », dont seules les corrections sont en
Shantell / Chiphre Math), pour les seuls exercices dont la correction est visible : l'API élève sert
`answers` **exactement** sous la condition de `correction` (`correction_visible`).

**Polices du Corrigé** (`src/lib/typst/correction-fonts.ts`) : des règles Typst encadrées de
`// <polices-du-corrige>`, posées en tête de chaque correction dans un bloc `#[ … ]` qui les borne
(`correctionInFonts` de `render-exercise.ts`, pour le Corrigé, la partie corrigé d'une fiche et la
fiche + corrigé) ; aucun gabarit n'est réécrit. `withoutCorrectionFonts` les retire.
`withCorrectionFonts` (tout le document) ne sert plus qu'à `/dev/polices`.
Les trois fichiers (`static/fonts/chiphre-math-typst/`, 870 ko) ne sont chargés que par un
compilateur à part (`src/lib/typst/compiler/correction-fonts-compiler.ts`, construit au premier
Corrigé, partagé avec `/dev/polices`) : la fiche et les Réponses ne les téléchargent pas.
`compileTypstDocument` choisit le compilateur d'après le document et porte le **repli** : la
compilation avec ces polices lève une erreur → le même corrigé recompilé sans elles,
`console.error` du message Typst et `toaster.warning` (« Corrigé imprimé dans la police standard :
… »). `generateWorksheetTypst({ correctionFonts: false })` et
`generateStudentWorksheetTypst(…, { correctionFonts: false })` produisent ce corrigé sans polices.
Glyphes absents de Chiphre Math (`≠`, `·`, lettres calligraphiques, `″`, lettres accentuées en
mode math) et de Shantell Sans (grec en texte) : Typst prend une autre police pour ce glyphe, sans
erreur (inventaire du 2026-10-13 sur les 32 fiches en base).

**Noms de fichier** : tout PDF ou ZIP de fiche (fiche, corrigé, lot par élève, dossier et archive
du lot par classe) est nommé par `sanitizeForFileName` (`src/lib/worksheets/pdf-file-name.ts`) :
accents retirés (`NFKD`, « Équations » → `Equations`), tout autre caractère que lettres, chiffres,
`_` et `-` remplacé par `_`. Avant, `[^a-zA-Z0-9]` remplaçait chaque lettre accentuée
(`_quations.pdf`) et le nom de la classe entrait brut dans l'en-tête `Content-Disposition`.

**Polices** : les gabarits et le PDF élève demandent `"New Computer Modern"` ; aucun code
n'en charge côté navigateur — ce sont les polices fournies par le bundle typst.ts.
`scripts/fiches/compile-prod.mjs` charge en plus STIX Two Math (chemin macOS) pour les formules,
et, avec `--polices-corrige`, les trois polices du Corrigé (ci-dessus).
Une police sans un glyphe donne des carrés (cas de `n⃗`,
[journal figures-pdf](../archive/wip/figures-pdf-progress.md)).

**Figures** : courbes, figures géométriques et graphiques statistiques sont rendus en cetz depuis
la **même scène** que l'écran ; tout module qui appelle `generateTypst` pour un PDF importe
`src/lib/ubumark/generators/figure-typst-setup.ts` (c'est le cas des deux générateurs de fiche) →
[ubumark.md](ubumark.md) § Invariants. Un **QR code** placé par l'auteur (bloc ` ```qr `) est
dessiné par Typst lui-même, sans cetz ni registre, et compte pour une figure dans la hauteur des
cadres de réponse (`answer-frames.ts`) → [qr-codes.md](qr-codes.md). Une **horloge**
(` ```horloge `), une **opération posée** (` ```operation `, `table` Typst native, cases de
retenue non dessinées : l'élève écrit sur papier libre), une **collection** (` ```collection `),
des **pièces et billets** (` ```monnaie `) une **figure partagée en parts égales** (` ```partage `, parts coloriées grisées) et un **assemblage de cubes** (` ```cubes `, faces en trois gris) sont aussi du Typst natif et comptent chacune pour une figure dans ces cadres → [ubumark.md](ubumark.md).
Des **étiquettes à ranger** (` ```ranger `) : étiquettes encadrées puis places en pointillés, Typst
natif, deux lignes dans les cadres de réponse.

**Version anglaise** ([journal](../archive/wip/worksheet-english-progress.md)) : la langue est
`worksheets.config.language` (`fr` par défaut), lue par `worksheetLocale`. Elle pilote **tout** le
document : contenu (`variation.translations.en` → `variation` → `shared.translations.en` →
`shared`), titre et consignes (`translations` des lignes `worksheets`, `worksheet_sections`,
`worksheet_exercises`, lus par `localizedText`), habillage (`documentLabels`), `lang` Typst
(césure, guillemets, point décimal) et date (`DATE_LOCALES`, `en-US`). Tout ce qui manque retombe
sur le français **champ par champ**. `UntranslatedExercisesNotice.svelte` liste les exercices qui
sortiraient en français.

## `pnpm fiche:verifier`

`pnpm fiche:verifier <dossier> ["Titre"]` (`scripts/fiches/verifier-fiche.sh`) vérifie une fiche
**en rédaction** (dossier `md/`, `sol/`, `en/`, `sol-en/`, avant écriture en base) :

1. `scripts/fiches/rendu-fiche.ts` — Typst par le **vrai** `WorksheetGenerator` (gabarit
   `STUDENT_STYLE_TEMPLATE`), FR / EN × énoncé / corrigé ; signale les erreurs de formule rendues
   en texte et les mots découpés lettre par lettre ;
2. `scripts/fiches/compile-prod.mjs` — compilation par le compilateur **exact** de la production
   (`@myriaddreamin/typst-ts-web-compiler` en devDependency, même version que `TYPST_VERSION`) ;
   le Typst CLI local n'est pas un témoin fiable ;
3. `scripts/fiches/debord.py` — débords de colonne (texte et tracés) ;
4. `scripts/fiches/pages-png.py` — pages en PNG, **à relire à l'œil**.

Prérequis : PyMuPDF dans un environnement Python local `.venv` sous scripts/fiches, hors dépôt (le script dit comment le créer). Outils voisins :
`scripts/fiches/regen-depuis-base.ts` (régénère des fiches **en base**, lecture seule, toutes
variantes) et `scripts/fiches/empreinte-typst.ts` (empreinte Typst de tous les textes en base, à
comparer avant / après un correctif du générateur). Mode d'emploi :
[pratiques/fiches-exercices.md § 2.4–2.7](../pratiques/fiches-exercices.md).

## Invariants

1. **Une seule erreur Typst fait échouer tout le PDF** de la fiche
   ([ADR 0004](../adr/0004-pdf-typst-et-jspdf.md)). Un générateur n'émet jamais de Typst invalide ;
   un correctif du générateur se mesure sur le contenu réel (`empreinte-typst.ts`).
2. **La version de typst.ts est une seule valeur** : `TYPST_VERSION` de `typst-compiler.ts` (et, en dur, la page admin `debug/typst-preview`), la
   devDependency `@myriaddreamin/typst-ts-web-compiler` et `@myriaddreamin/typst.ts` dans
   `package.json` (`0.6.1-rc5`). Changer l'une sans les autres rend `fiche:verifier` mensonger.
3. **Le numéro d'exercice** se calcule par `exercise-numbering.ts`, jamais depuis `position`.
   Un exercice imprimé se rend par `worksheets/document/render-exercise.ts`, jamais dans un
   générateur : une évolution du rendu d'un exercice ne s'écrit qu'une fois (ADR 0028).
4. **La langue est celle de la fiche**, pour le contenu comme pour l'habillage : pas d'exercice
   anglais sous des libellés français. Une config illisible retombe sur le français, elle génère
   quand même.
5. **Les images passent par le système de fichiers virtuel** (`/virtual/images/…`) : le WASM ne
   télécharge rien.
6. **L'accès élève est hérité, jamais distribué** (pas de ligne par élève à la publication).
7. **`correction-visibility.ts` ne contrôle pas l'autorisation** : l'appelant passe d'abord par
   `resolveAssignmentAccess`.
8. **Une série figée ne suit plus son modèle** : corriger le modèle ne corrige pas la fiche ; la
   régénérer par le script.

9. **Le corrigé imprimé est toujours détaillé** ([ADR 0030](../adr/0030-type-de-fiche-decide-la-forme.md),
   qui retire le choix de la fiche de l'[ADR 0017](../adr/0017-correction-concise-et-detaillee.md),
   D11 ; `config.correction_detail` n'est plus lue). Les marqueurs de détail sont résolus **à
   l'impression**, juste avant Typst, par `correctionForPrint(…, 'detailed')`
   (`questions/correction-detail.ts`) : PDF du prof (`worksheet-generator.ts`, et l'aperçu
   markdown de `PdfPreview.svelte`) et PDF de l'élève (`student-worksheet-typst.ts`). Le PDF d'un
   exercice seul (`exercise-typst-generator.ts`, sans fiche) imprime la version détaillée. Une série d'automatismes **garde** ses marqueurs de détail ; les
   écrans qui affichent un corrigé d'exercice montrent la version détaillée (`detailedCorrection`).
   Aucun marqueur brut n'atteint Typst. Encadrés et détails en ligne mis en forme au PDF : voir
   [ubumark.md](ubumark.md) (« Détails d'une correction au PDF »). Tests : `src/lib/worksheets/__tests__/correction-imprimee.test.ts`.

10. **Un type de fiche a un seul libellé**, en langage courant (« Fiche d'exercices »,
    « Évaluation écrite », « Devoir maison », « Examen blanc » ; décision de David du 2026-10-12,
    libellés de l'ADR 0030, pas de lore dans les étiquettes de type) : la table `WORKSHEET_TYPE_LABELS` de
    `src/lib/utils/worksheet-type-labels.ts`, lue par l'écran (prof et élève) et par le PDF
    français. Garde : `src/lib/utils/__tests__/type-de-fiche-controle.test.ts`, qui refuse aussi
    toute table recopiée.

## Comment étendre

- **Un bloc ubumark de plus dans le PDF** : son générateur Typst dans
  `src/lib/ubumark/generators/` → [ubumark.md](ubumark.md). Rien à faire côté fiche.
- **Un champ de config** : `WorksheetConfig` (`src/lib/types/worksheets.ts`), Zod
  (`worksheetConfigObjectSchema` dans `src/lib/server/validation/worksheets.ts`), `asWorksheetConfig`,
  puis le générateur (placeholder `{{#if show_x}}` pour les gabarits).
- **Un libellé d'habillage** : `DocumentLabels` dans `src/lib/typst/labels.ts`, **dans les deux
  langues** (`src/lib/typst/templates/__tests__/template-localisation.test.ts`).
- **Un gabarit intégré** : `src/lib/typst/templates/default-templates.ts` (id fixe dans
  `DEFAULT_TEMPLATE_IDS`, `{{lang}}` dans `#set text`), puis `DEFAULT_TEMPLATES`.
- **Une langue** : `CONTENT_LOCALES` (`src/lib/types/locale.ts`), `DATE_LOCALES`, `TYPST_LANGS`,
  `documentLabels`.
- **Toucher l'accès ou la correction** : migration + tests d'intégration
  (CLAUDE.md § Base de données) ; poser d'abord la question d'accès.

## Tests

- `src/lib/typst/` : générateur (`generators/__tests__/worksheet-generator.test.ts`,
  `base-generator.test.ts`), gabarits (`templates/__tests__/render-template.test.ts`,
  `template-localisation.test.ts`), `__tests__/labels.test.ts`,
  `service/__tests__/typst-service.test.ts`, `cache/__tests__/typst-cache.test.ts`,
  `utils/__tests__/typst-utils.test.ts`.
- `src/lib/worksheets/document/__tests__/` : `worksheet-document.test.ts` (deux adaptateurs, même
  document, même Typst d'exercice ; garde des corrections non visibles),
  `deux-pdf-meme-exercice.test.ts` (les écarts corrigés au lot 1, des deux côtés).
- Suites du mélange (D6) : `server/worksheets/__tests__/copy-numbering.test.ts`,
  `server/__tests__/auto-notifications-signalement.test.ts`, `numero-copie.test.ts` des deux
  routes de signalements, `ancre-exercice.svelte.test.ts` (fiche de l'élève),
  `eleve-depuis-adresse.svelte.test.ts` et `page-server-eleve.test.ts` (aperçu),
  `liens-copie.svelte.test.ts` (page du signalement), `CorrectionManager-copie-eleve.svelte.test.ts`,
  `numero-copie-eleve.test.ts` et `onglet-signalements-numero.svelte.test.ts` (côté élève),
  `vue-prof-individualisee.test.ts` / `.svelte.test.ts` (aperçu), `student-worksheet-typst-avertissement.test.ts`,
  `avertissement-copie-individuelle.test.ts` (Typst), `melanger-sections-retire.svelte.test.ts`.
- Copies par élève (lot 5) : `src/lib/worksheets/__tests__/copies-par-eleve.test.ts`, la page
  (`copies/__tests__/page-server.test.ts`, `copies-par-eleve.svelte.test.ts`), le bouton
  (`preview/__tests__/bouton-copies-par-eleve.svelte.test.ts`), intégration
  `copies-par-eleve-destinataires` (archivé exclu, élève refusé).
- `src/lib/worksheets/__tests__/` : `exercise-numbering.test.ts`, `student-worksheet-typst.test.ts`,
  `serie-automatismes.test.ts`, `exercise-edit-link.test.ts`.
- Serveur : `src/lib/server/worksheets/__tests__/instance-generator.test.ts`,
  `assignment-access.test.ts` ; `src/lib/server/validation/__tests__/worksheet-language.test.ts` ;
  `src/lib/types/__tests__/worksheet-translations.test.ts` ;
  `src/routes/api/worksheets/[id]/assignments/__tests__/closed-class.test.ts`.
- Rendu Typst des blocs : `src/lib/ubumark/generators/__tests__/` et
  `src/lib/ubumark/__tests__/figure/` (voir [ubumark.md](ubumark.md)).
- Intégration (`tests/integration/`) : accès et distribution
  (`worksheet-access-distribution-paths`, `worksheet-assignment-voies`,
  `eleve-inscrit-apres-publication`, `archived-member-worksheet-access`,
  `archived-member-reads-past-worksheets`, `worksheet-seconde-classe`,
  `fiche-partagee-restreinte`), chapitres (`chapter-worksheets-rls`,
  `chapter-worksheet-publish-distributes`), cahier (`worksheet-by-share-token`), instances
  (`worksheet-instance-not-writable-by-student`), numéro (`worksheet-exercise-number`),
  signalements (`worksheet-report-bonus`).

Aucun test ne compile un vrai PDF dans la CI : la compilation se vérifie par `pnpm fiche:verifier`.

## Décisions

- [ADR 0004](../adr/0004-pdf-typst-et-jspdf.md) — Typst WASM dans le navigateur pour fiches et
  carnets, jsPDF pour le tableau blanc (`src/lib/whiteboard/core/pdf-export.ts`) ; WeasyPrint et
  print-CSS écartés.
- [ADR 0011](../adr/0011-fiche-d-automatismes-figee-par-graine.md) — fiche d'automatismes :
  instances figées par une graine, créée par script.
- [ADR 0005](../adr/0005-publication-par-element-acces-herite-de-la-classe.md) — publication par
  élément, accès hérité de la classe (fiches dans un chapitre).
- [ADR 0002](../adr/0002-mono-professeur-ecole-frontiere-sociale.md) — mono-professeur.
- [ADR 0017](../adr/0017-correction-concise-et-detaillee.md) — correction concise / détaillée.
- [ADR 0030](../adr/0030-type-de-fiche-decide-la-forme.md) — le type de fiche décide de l'en-tête ;
  options d'affichage retirées, corrigé PDF toujours détaillé.

## Écarts connus

1. **Plus de copie individuelle à imprimer pour une affectation individualisée** : le lot ZIP vit sur
   la page de la fiche, hors affectation (même copie pour tous). Sans effet aujourd'hui (aucun
   exercice à variables en prod, mesuré le 2026-10-11).
2. **Restes du tirage d'avant l'ADR 0023, sans appelant vivant** : `generateWorksheetInstance`
   (`src/lib/server/worksheets/instance-generator.ts`, lit `variant_mode`), routes
   `api/worksheets/[id]/instances`, `[id]/preview`, `VariantPreview.svelte`. Ménage à part.
3. **`worksheet_instances` vide (0 ligne) et sans écrivain**, encore lue par `correction-release.ts`
   (décompte, toujours 0). Sa suppression est destructive : décision de David.
4. ~~Routes PDF serveur mortes~~ : **corrigé** (K11, 2026-10-12), `api/worksheets/[id]/pdf` et
   `pdf/batch` retirées.
5. ~~`CorrectionManager.svelte` charge typst.ts sans version~~ : **corrigé** (K11) : il passe par
   `compileToPdf` du compilateur partagé. Garde : `src/lib/__tests__/cdn-versions-epinglees.test.ts`
   (toute URL jsDelivr ou unpkg de `src/` nomme une version).
6. ~~Ré-exports dépréciés encore importés~~ : **corrigé** (K11) : `$lib/worksheets/typst-compiler`,
   `typst-generator` et `default-templates` retirés, les appelants importent `$lib/typst`.
7. **`available_from` nul refusé par la réponse de l'API élève** :
   `studentWorksheetDetailResponseSchema` déclare `available_from` non nullable, alors que la
   colonne l'est (« disponible tout de suite ») ; une telle affectation ferait répondre
   `GET /api/student/worksheets/[assignmentId]` en 500. Mesuré le 2026-10-11 : 0 affectation
   concernée sur 11.
8. **Polices** : le rendu dépend des polices embarquées par le bundle typst.ts, non listées dans le
   dépôt ; `compile-prod.mjs` ajoute STIX Two Math depuis un chemin macOS — témoin local et
   production peuvent donc différer sur un glyphe.
9. ~~Option « mélanger les exercices » : trois restes~~ : **corrigé** (D6, 2026-10-14) : case
   « Mélanger dans les sections » retirée, numéro des signalements pris dans la copie de l'élève,
   corrigé de classe et aperçu « vue prof » d'une affectation individualisée d'après la copie d'un
   élève choisi, signalements de l'élève sur le numéro de sa copie.

Vérifié contre le code le 2026-10-15 (lot 1 de l'ADR 0030 : le type décide de l'en-tête).
