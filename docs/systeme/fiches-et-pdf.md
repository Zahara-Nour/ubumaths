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
> Vérifié contre le code le 2026-10-11 ; écarts 4 à 6 le 2026-10-12 (K11) ; Réponses et Corrigé le 2026-10-13.

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

| Fichier                                         | Rôle                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/worksheets/exercise-numbering.ts`      | **La** règle du numéro affiché : `groupExercisesForDisplay`, `orderExercisesForDisplay`, `displayNumberOf`, `exerciseAtDisplayNumber`. Utilisée par la page élève, le générateur PDF et le serveur.                                                                                                                                                                                                                                  |
| `src/lib/worksheets/student-worksheet-typst.ts` | `generateStudentWorksheetTypst` : le PDF **élève** (et l'aperçu « vue élève » du prof), enveloppe codée en dur (setup, en-tête, partie de fin) ; les exercices viennent du rendu commun.                                                                                                                                                                                                                                             |
| `src/lib/worksheets/document/`                  | Le **document d'une fiche** ([ADR 0028](../adr/0028-pdf-de-fiche-un-generateur-des-styles-et-des-formes.md), lot 1) : `WorksheetDocument` (`types.ts`), rempli par `documentFromTeacherCopy` (copie du prof) ou `documentFromStudentView` (vue élève, correction non visible → `correction: null`) ; ordre et numéros (`numbering.ts`) ; **rendu d'exercice unique** `renderExercises` (`render-exercise.ts`) ; `MATH_LIMITS_SETUP`. |
| `src/lib/worksheets/serie-automatismes.ts`      | `buildSerie` : une **série figée** d'instances de modèles de question devient un exercice ordinaire ([ADR 0011](../adr/0011-fiche-d-automatismes-figee-par-graine.md)). Toute anomalie lève une exception. Les formules maison sont figées avec les fonctions du modèle et le sens de `AB` de l'instance.                                                                                                                            |
| `src/lib/worksheets/exercise-edit-link.ts`      | `exerciseEditHref`, `worksheetReturnHref` : aller-retour fiche ↔ exercice par `?fiche=<uuid>` (Zod : UUID seulement).                                                                                                                                                                                                                                                                                                                |

### `src/lib/typst/` — de la fiche au PDF

| Fichier                                                                           | Rôle                                                                                                                                                                                                                                                                    |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/typst/index.ts`                                                          | Baril public (compilateur, service, générateurs, gabarits, ré-export du transpileur ubumark).                                                                                                                                                                           |
| `src/lib/typst/compiler/typst-compiler.ts`                                        | Singleton du compilateur : charge `all-in-one-lite.bundle.js` de typst.ts depuis jsDelivr, **version épinglée** `TYPST_VERSION = '0.6.1-rc5'` (bundle + deux WASM). `getTypstCompiler`, `compileToPdf`, `compileToSvg`.                                                 |
| `src/lib/typst/service/typst-service.ts`                                          | `TypstService` / `getTypstService` : file à priorités (`PRIORITY` : `BATCH` < `NORMAL` < `PREVIEW` < `URGENT`), cache, délai maximal, état pour l'UI.                                                                                                                   |
| `src/lib/typst/cache/typst-cache.ts`                                              | `TypstCache` (LRU + TTL) du service.                                                                                                                                                                                                                                    |
| `src/lib/typst/generators/worksheet-generator.ts`                                 | `WorksheetGenerator` (classe) : la fiche **professeur** (énoncé ou corrigé) depuis `WorksheetRow` + `InstanceData` (+ gabarit). Fonctions héritées `generateWorksheetTypst`, `generateBatchTypst` (marquées `@deprecated`, mais ce sont elles qu'appellent les écrans). |
| `src/lib/typst/generators/base-generator.ts`                                      | `BaseTypstGenerator` : contexte (mode, nom d'élève, classe), config.                                                                                                                                                                                                    |
| `src/lib/typst/generators/notebook-generator.ts`, `src/lib/typst/notebook-pdf.ts` | Même chaîne pour les **carnets** Python (`generateNotebookPdf`) — hors fiches, voir [python/](python/).                                                                                                                                                                 |
| `src/lib/typst/templates/default-templates.ts`                                    | 12 gabarits intégrés (`STANDARD_TEMPLATE` … `STUDENT_STYLE_TEMPLATE`, ids `DEFAULT_TEMPLATE_IDS`), `renderTemplate` (`{{clé}}`, `{{#if clé}}`), `COMMON_PLACEHOLDERS`.                                                                                                  |
| `src/lib/typst/labels.ts`                                                         | Habillage traduit : `documentLabels(locale)`, `labelPlaceholders(locale)`, `STUDENT_TYPE_LABELS`.                                                                                                                                                                       |
| `src/lib/typst/worksheet-palette.ts`                                              | Charte commune prof / élève : `BADGE_FILL`, `SECTION_COLOR`, `exerciseBadge`.                                                                                                                                                                                           |
| `src/lib/typst/image-loader.ts`                                                   | Le WASM ne lit pas d'URL : `fetchExternalImages`, `urlToVirtualPath` (→ `/virtual/images/…`, posé par `mapShadow`), conversion **WebP → PNG** par canvas.                                                                                                               |
| `src/lib/typst/pdf-generator.ts`                                                  | `generatePdfFromTypst`, `generateAndDownloadPdf` : images suivies → chargées → compilées via le service → téléchargement.                                                                                                                                               |
| `src/lib/typst/utils/typst-utils.ts`                                              | `formatNumber`, `toRoman`, `formatDateFR`, `getTypeLabel`.                                                                                                                                                                                                              |

Le Markdown → Typst lui-même vit dans ubumark : `src/lib/ubumark/generators/typst-generator.ts`
(`generateTypst`, `escapeTypst`, `clearTrackedExternalImages` / `getTrackedExternalImages`) et
`src/lib/ubumark/generators/figure-typst-setup.ts` → [ubumark.md](ubumark.md) § Le pipeline.

### Serveur — `src/lib/server/worksheets/` et validation

| Fichier                                              | Rôle                                                                                                                                                                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/server/worksheets/instance-generator.ts`    | `generateWorksheetInstance`, `generatePreviewInstance` : `InstanceData` par élève, graine selon `variant_mode` (`none`, `individual`, `n_versions`, `group`).                                                 |
| `src/lib/server/worksheets/assignment-access.ts`     | `resolveAssignmentAccess` : RPC `can_access_assignment`, puis `can_read_assignment` (relecture d'un ancien membre).                                                                                           |
| `src/lib/server/worksheets/assignment-classes.ts`    | `fetchAssignmentClasses`, `fetchClassesByAssignment`, `formatClassNames` (jonction `worksheet_assignment_classes`).                                                                                           |
| `src/lib/server/worksheets/correction-release.ts`    | Libération de la correction : `canAccessCorrections`, `releaseCorrections`, `revokeCorrections`, `updateCorrectionSettings`, `getCorrectionReleaseStatus`.                                                    |
| `src/lib/server/worksheets/correction-visibility.ts` | `isCorrectionVisible`, `getCorrectionVisibilityMap`, `getCorrectionContext` (cascade, voir plus bas). Ne vérifie **pas** l'autorisation : à l'appelant.                                                       |
| `src/lib/server/worksheets/display-number.ts`        | `fetchDisplayNumber(s)`, `resolveExercisesAtDisplayNumbers` : le numéro que lit l'élève, côté serveur (messages de signalement).                                                                              |
| `src/lib/server/worksheets/citations.ts`             | `fetchWorksheetCitations` : où la fiche est citée (cahier de texte, chapitres).                                                                                                                               |
| `src/lib/server/validation/worksheets.ts`            | Zod des routes : `createWorksheetSchema`, `worksheetConfigSchema`, `createWorksheetExerciseSchema`, `reorderExercisesSchema`, `updateCorrectionSettingsSchema`…                                               |
| `src/lib/types/worksheets.ts`                        | Types de lignes et JSONB (`WorksheetConfig`, `VariantConfig`, `ResolvedExercise`, `InstanceData`), gardes `asWorksheetConfig`, `asInstanceData`, `toWorksheetRow`, langue `worksheetLocale`, `localizedText`. |

### Routes

- Professeur : `src/routes/(protected)/dashboard/teacher/contenu/worksheets/` — liste, `new/`,
  `[id]/` (édition + `PdfPreview`), `templates/` (gabarits perso), `[id]/assignments/[assignmentId]/`
  (`preview/` vue élève, `progress/`, `reports/` signalements).
- Élève : `src/routes/(protected)/dashboard/student/worksheets/` (liste, `[assignmentId]/`). La liste
  s'ouvre depuis « Mon travail » (« Toutes mes fiches ») et y revient par « Retour à Mon travail ».
- Public sans compte : `src/routes/(public)/cahier/[token]/fiche/[id]/` — une fiche **citée** dans
  une séance visible du cahier partagé (`resolveWorksheetByShareToken`, `security definer`) ; même
  404 pour tout refus.
- API : `src/routes/api/worksheets/` (CRUD, `sections/`, `exercises/`, `duplicate/`,
  `exercise-number/[number]/`, `assignments/`, `instances/`, `templates/`, `pdf/`),
  `src/routes/api/student/worksheets/` (vue résolue, signalements),
  `src/routes/api/teacher/chapters/[id]/worksheets/` (fiche dans un chapitre).

### Composants

`src/lib/components/worksheets/` : `PdfPreview.svelte` (aperçu, téléchargement, lot ZIP),
`CorrectionManager.svelte` (libération par affectation), `SectionManager.svelte`,
`ExerciseList.svelte`, `MetadataCards.svelte` (config, dont la langue),
`WorksheetAssignmentForm.svelte`, `UntranslatedExercisesNotice.svelte`, `TemplateSelector.svelte`,
`TypstEditor.svelte` ; côté élève `src/lib/components/student/worksheets/WorksheetHeader.svelte`
(bouton PDF ; en tête, « Quitter » vers la liste des fiches, ou « Retour aux fiches » quand la fiche
est en consultation seule, `read_only` — [composants-ui.md § BackLink](../pratiques/composants-ui.md#backlink--bouton-retour-obligatoire)).

## Le modèle d'une fiche

```
worksheets (type, status, config jsonb, translations, template_id, school_id)
 ├── worksheet_sections (title, instructions, position, translations)
 ├── worksheet_exercises (exercise_id → exercises, section_id?, position, points,
 │                        custom_instructions, variation_index?, variant_mode/config (plus lus),
 │                        correction_visible, is_essential, translations)
 ├── worksheet_templates (template_content Typst, placeholders)   ← via template_id
 ├── worksheet_assignments (status, available_from, closes_at, show_corrections,
 │    │                     correction_release_mode / _at, individualized, guidance_level)
 │    ├── worksheet_assignment_classes (class_id)        ← une ligne par classe
 │    ├── worksheet_assignment_students (student_id)     ← élève désigné, sans condition de classe
 │    └── worksheet_assignment_exercise_settings (show_correction par exercice)
 ├── worksheet_instances (… instance_data jsonb) ← vide, sans écrivain (ADR 0023 : copie recalculée)
 └── worksheet_error_reports (signalement d'un élève sur un exercice → gidouille si validé)
```

- **Types** : `worksheet`, `assessment`, `exam`, `quiz`, `homework` (`WORKSHEET_TYPES`) ; statut
  `draft` / `published` / `archived`. `assessment` s'affiche **« Contrôle »**, à l'écran comme sur le PDF
  (garde : `src/lib/utils/__tests__/type-de-fiche-controle.test.ts`).
- **Config** (`WorksheetConfig`, JSONB validé par `worksheetConfigSchema`) : `language`, options
  d'affichage `show_*` (absentes = affichées), `numbering_style`, `shuffle_*`, `page_layout`,
  `font_size`, `margins`.
- **Numéro affiché** ≠ `worksheet_exercises.position` : `position` redémarre à 1 dans chaque
  section ; le numéro est un ordinal continu calculé par `exercise-numbering.ts`.
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
  l'ordre de la copie avec `shuffled: true`, que suivent l'écran de l'élève
  (`groupExercisesForDisplay(…, { preserveExerciseOrder })`) et son PDF (`documentFromStudentView`).
  Hors affectation (page de la fiche, aperçu, lot ZIP, cahier ou cours publics) : ordre des
  positions. Réaffecter → autre tirage. `shuffle_within_sections` n'est lu par aucun chemin
  vivant (voir Écarts connus).
- `resolveCopyExercise` produit l'exercice ; `src/lib/worksheets/worksheet-copy.ts` l'applique à la
  fiche entière et lit le niveau (inconnu → guidé). Génération en échec : le texte brut de la MÊME
  version.
- Hors affectation : guidé par défaut ; l'aperçu du prof a un choix « Niveau à imprimer » (absent du
  cahier public). Le lot ZIP de la page de la fiche donne donc la même copie à chaque élève, à son nom.
- Le corrigé du prof est la copie commune ; affectation individualisée avec variables : la réponse
  porte `per_student_values_notice`, affiché par `CorrectionManager`.
- Le signalement d'erreur d'un élève enregistre la version et la graine de SA copie
  (`worksheetExerciseSeed`, 31 bits, tient dans `worksheet_error_reports.seed`).
  Seuls le prof et l'admin traitent le signalement (statut, relu par, date, réponse) : la base le
  refuse à l'élève (`20261016101700`).
- Groupes de niveau : la même fiche affectée plusieurs fois, chaque affectation visant ses élèves
  nommément ; un élève ne lit pas l'affectation d'un autre groupe.
- Le réglage par exercice « Mode de variante » (`variant_mode`) est retiré de l'interface et n'est
  plus lu par les chemins vivants.

Tests : `src/lib/worksheets/__tests__/student-copy.test.ts`, `worksheet-copy.test.ts`,
`worksheet-copy-ordre.test.ts` (mélange), `copie.test.ts` des trois routes, `ordre.test.ts` de
l'aperçu d'affectation (API élève et aperçu), `PdfPreview-copie.svelte.test.ts`, `tests/integration/worksheet-assignment-guidance-level.test.ts`.

## La production PDF

```
exercises.variations (ubumark, FR + translations.en)
  → InstanceData / StudentWorksheetView (contenu résolu dans la langue de la fiche)
  → WorksheetGenerator (prof : gabarit ou mise en page par défaut ; fiche | réponses | corrigé)
    ou generateStudentWorksheetTypst (élève)
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

**Gabarits** : `WorksheetGenerator` prend le `template_content` de la ligne `worksheet_templates`
passée, sinon un gabarit intégré par `template_id`, sinon une mise en page par défaut
(`generateDefault`). Un gabarit qui contient `{{exercises_badge}}` reçoit la numérotation en carré
ambre (charte élève) ; sinon `{{exercises}}` en titres gras. Dans les corrigés, un bandeau
« CORRECTION » ou « RÉPONSES » (« SOLUTIONS » / « ANSWERS ») est inséré **après** le dernier
`#set page(…)` (`endOfLastPageSetup`, sinon il restait seul sur une page 1 vide) et après le dernier
`#set text(…)` de premier niveau (`endOfLastTextSetup`, pour prendre les polices du Corrigé).

**Un document, un rendu d'exercice** (ADR 0028, lot 1) : les deux générateurs construisent un
`WorksheetDocument` puis appellent `renderExercises(doc, forme, habillage)`. Les habillages
(`classic` : prof sans gabarit ; `heading` : `{{exercises}}` ; `badge` : `{{exercises_badge}}` ;
`student` : PDF élève) ne changent que la présentation ; ils disparaissent au lot 2. Communs aux deux
PDF : titre d'exercice avec ses formules (`processTableCellContent`), ordre et numérotation
(`numbering_style`, `exercise_order` côté prof), points en « pt » / « pts » de `documentLabels` (aussi en anglais, et
aussi dans le `points-badge` du prof sans gabarit, qui reçoit le libellé) masqués si `show_points` n'est pas coché, exercice hors section après des sections sous
« Autres exercices », correction non écrite → « Correction non écrite. » sous le numéro (Corrigé,
et Réponses quand il n'y a ni réponses ni corrigé), opérateurs à limites (`MATH_LIMITS_SETUP`, aussi
dans le setup du prof sans gabarit, dont `lang` suit la fiche). L'API élève (et celle d'aperçu de
l'affectation) transmet `numbering_style` et `show_points` (résolus comme pour le prof : absents,
chiffres et points masqués) ; l'ordre de la copie de l'élève est celui des positions, sauf fiche
qui mélange ses exercices (voir « La copie d'un élève » : `shuffled`, suivi par
`documentFromStudentView`).

**Trois PDF du prof** (`WorksheetPdfMode`, choix « Fiche · Réponses · Corrigé » de `PdfPreview` ;
la lecture publique `variant="reader"` reste sur la fiche) :

- `worksheet` : les énoncés, consignes du prof et cadres de réponse des évaluations ;
- `answers` : pour chaque exercice, numéro et titre puis `answers` (champ `answers_md` de la
  variation, `{{var}}` résolues comme dans la correction, traduction `translations.en.answers_md`
  avec repli français) ; vide : « Réponses non rédigées : voir le corrigé. » en italique. Police
  standard ;
- `correction` : numéro et titre puis la correction (`correctionForPrint`, ADR 0017), en
  **Shantell Sans** (Light, Bold pour le gras) et **Chiphre Math** pour les formules.

Réponses et Corrigé ne répètent **jamais l'énoncé** (ni consigne d'exercice, ni consigne de
section, ni consignes d'épreuve). Noms de fichier distincts : `worksheetPdfFileName`
(« … - Réponses.pdf », « … - Corrigé.pdf »). Côté élève, la boîte de téléchargement propose « avec
réponses » (partie « Réponses ») ou « avec corrigé » (partie « Corrections », seule en Shantell /
Chiphre Math), pour les seuls exercices dont la correction est visible : l'API élève sert
`answers` **exactement** sous la condition de `correction` (`correction_visible`).

**Polices du Corrigé** (`src/lib/typst/correction-fonts.ts`) : des règles Typst encadrées de
`// <polices-du-corrige>`, posées en tête (pied de page) et après le dernier `#set text(…)` du
document (`withCorrectionFonts`) ; aucun gabarit n'est réécrit. `withoutCorrectionFonts` les retire.
Les trois fichiers (`static/fonts/chiphre-math-typst/`, 870 ko) ne sont chargés que par un
compilateur à part (`src/lib/typst/compiler/correction-fonts-compiler.ts`, construit au premier
Corrigé, partagé avec `/test-font`) : la fiche et les Réponses ne les téléchargent pas.
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
[ubumark.md](ubumark.md) § Invariants.

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

9. **Le corrigé imprimé est concis ou détaillé selon la fiche** (`config.correction_detail`,
   détaillé par défaut ; [ADR 0017](../adr/0017-correction-concise-et-detaillee.md), D11, lot 3 du
   2026-10-11). Le choix se fait **à l'impression**, juste avant Typst, par `correctionForPrint`
   (`questions/correction-detail.ts`) : PDF du prof (`worksheet-generator.ts`, et l'aperçu
   markdown de `PdfPreview.svelte`) et PDF de l'élève (`student-worksheet-typst.ts`, réglage
   transmis par l'API élève, et par l'API d'aperçu de l'affectation pour le PDF du prof). Le PDF d'un
   exercice seul (`exercise-typst-generator.ts`, sans fiche) imprime la version détaillée. Une série d'automatismes **garde** ses marqueurs de détail ; les
   écrans qui affichent un corrigé d'exercice montrent la version détaillée (`detailedCorrection`).
   Aucun marqueur brut n'atteint Typst. Encadrés et détails en ligne mis en forme au PDF : voir
   [ubumark.md](ubumark.md) (« Détails d'une correction au PDF »). Tests : `src/lib/worksheets/__tests__/correction-imprimee.test.ts`.

10. **Un type de fiche a un seul libellé**, en langage courant (« Fiche d'exercices »,
    « Contrôle », « Examen », « Quiz », « Devoirs » ; décision de David du 2026-10-12, pas de lore
    dans les étiquettes de type) : la table `WORKSHEET_TYPE_LABELS` de
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
  `documentLabels`, `STUDENT_TYPE_LABELS`.
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
9. **Option « mélanger les exercices » : deux restes** (2026-10-13 ; aucune fiche n'a l'une ou
   l'autre case cochée en prod, mesuré le 2026-10-13). (a) La case « Mélanger dans les sections »
   (`shuffle_within_sections`) n'est lue par aucun chemin vivant : « mélanger les exercices » mélange
   déjà à l'intérieur des sections. (b) Le numéro d'exercice des messages à l'élève
   (`server/worksheets/display-number.ts`, signalements) est celui de l'ordre des positions, pas
   celui de sa copie mélangée. (c) Le corrigé de la classe d'une affectation individualisée et
   mélangée suit un ordre commun qui n'est celui d'aucun élève ; `per_student_values_notice` ne
   parle que des valeurs (et seulement s'il y a des variables). À trancher par David.

Vérifié contre le code le 2026-10-13 (lot 1 de l'ADR 0028, option « mélanger les exercices »).
