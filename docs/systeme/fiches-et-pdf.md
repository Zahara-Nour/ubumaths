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
> Vérifié contre le code le 2026-10-11.

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

| Fichier                                                           | Rôle                                                                                                                                                                                                       |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/worksheets/exercise-numbering.ts`                        | **La** règle du numéro affiché : `groupExercisesForDisplay`, `orderExercisesForDisplay`, `displayNumberOf`, `exerciseAtDisplayNumber`. Utilisée par la page élève, le générateur PDF et le serveur.        |
| `src/lib/worksheets/student-worksheet-typst.ts`                   | `generateStudentWorksheetTypst` : le PDF **élève** (et l'aperçu « vue élève » du prof), mise en page codée en dur, depuis la vue déjà résolue (`StudentWorksheetView`).                                    |
| `src/lib/worksheets/serie-automatismes.ts`                        | `buildSerie` : une **série figée** d'instances de modèles de question devient un exercice ordinaire ([ADR 0011](../adr/0011-fiche-d-automatismes-figee-par-graine.md)). Toute anomalie lève une exception. |
| `src/lib/worksheets/exercise-edit-link.ts`                        | `exerciseEditHref`, `worksheetReturnHref` : aller-retour fiche ↔ exercice par `?fiche=<uuid>` (Zod : UUID seulement).                                                                                     |
| `typst-compiler.ts`, `typst-generator.ts`, `default-templates.ts` | **Ré-exports dépréciés** de `src/lib/typst/` (avertissement console en dev). `PdfPreview.svelte` et les routes `pdf/` les importent encore.                                                                |

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
- Élève : `src/routes/(protected)/dashboard/student/worksheets/` (liste, `[assignmentId]/`).
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
(bouton PDF).

## Le modèle d'une fiche

```
worksheets (type, status, config jsonb, translations, template_id, school_id)
 ├── worksheet_sections (title, instructions, position, translations)
 ├── worksheet_exercises (exercise_id → exercises, section_id?, position, points,
 │                        custom_instructions, variation_index?, variant_mode/config,
 │                        correction_visible, is_essential, translations)
 ├── worksheet_templates (template_content Typst, placeholders)   ← via template_id
 ├── worksheet_assignments (status, available_from, closes_at, show_corrections,
 │    │                     correction_release_mode / _at, individualized)
 │    ├── worksheet_assignment_classes (class_id)        ← une ligne par classe
 │    ├── worksheet_assignment_students (student_id)     ← élève désigné, sans condition de classe
 │    └── worksheet_assignment_exercise_settings (show_correction par exercice)
 ├── worksheet_instances (student_id, variant_seed, variant_version, instance_data jsonb)
 └── worksheet_error_reports (signalement d'un élève sur un exercice → gidouille si validé)
```

- **Types** : `worksheet`, `assessment`, `exam`, `quiz`, `homework` (`WORKSHEET_TYPES`) ; statut
  `draft` / `published` / `archived`.
- **Config** (`WorksheetConfig`, JSONB validé par `worksheetConfigSchema`) : `language`, options
  d'affichage `show_*` (absentes = affichées), `numbering_style`, `shuffle_*`, `page_layout`,
  `font_size`, `margins`.
- **Numéro affiché** ≠ `worksheet_exercises.position` : `position` redémarre à 1 dans chaque
  section ; le numéro est un ordinal continu calculé par `exercise-numbering.ts`.
- **Exercice ↔ variation** : le contenu vient de `exercises.variations` (énoncé, solution, indices),
  via `getExerciseContentSafe` / `generateExerciseInstance` (`src/lib/exercises/`) ;
  `worksheet_exercises.variation_index` force une variation. Les **fonctions déclarées**
  (`generic_functions`) suivent l'exercice jusqu'au PDF.
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

## La production PDF

```
exercises.variations (ubumark, FR + translations.en)
  → InstanceData / StudentWorksheetView (contenu résolu dans la langue de la fiche)
  → WorksheetGenerator (prof : gabarit ou mise en page par défaut, énoncé | corrigé)
    ou generateStudentWorksheetTypst (élève)
      → generateTypst (ubumark) par énoncé / solution ; blocs figure via figure-typst-setup
  → source Typst (une chaîne)
  → images externes : getTrackedExternalImages → fetchExternalImages (WebP → PNG)
                      → mapShadow('/virtual/images/…')
  → typst.ts 0.6.1-rc5 (WASM, navigateur) → Uint8Array → Blob / ZIP (JSZip)
```

Trois chemins d'appel, qui n'empruntent pas le même compilateur :

| Écran                                                            | Générateur                      | Compilation                                                                                                     |
| ---------------------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Élève (`WorksheetHeader.svelte`), aperçu « vue élève » du prof   | `generateStudentWorksheetTypst` | `generateAndDownloadPdf` → `TypstService` (priorité `URGENT`)                                                   |
| Prof, fiche (`PdfPreview.svelte`, aussi page publique du cahier) | `generateWorksheetTypst`        | `getTypstCompiler()` direct ; lot : une compilation par élève + corrigé général + `00_SOMMAIRE.txt` dans un ZIP |
| Prof, corrections (`CorrectionManager.svelte`)                   | —                               | charge **sa propre** copie de typst.ts, **non épinglée** (voir écarts)                                          |

**Gabarits** : `WorksheetGenerator` prend le `template_content` de la ligne `worksheet_templates`
passée, sinon un gabarit intégré par `template_id`, sinon une mise en page par défaut
(`generateDefault`). Un gabarit qui contient `{{exercises_badge}}` reçoit la numérotation en carré
ambre (charte élève) ; sinon `{{exercises}}` en titres gras. En mode corrigé, un bandeau
« CORRECTION » est inséré **après** le dernier `#set page(…)` (`endOfLastPageSetup`) : avant, il
restait seul sur une page 1 vide.

**Polices** : les gabarits et le PDF élève demandent `"New Computer Modern"` ; aucun code
n'en charge côté navigateur — ce sont les polices fournies par le bundle typst.ts.
`scripts/fiches/compile-prod.mjs` charge en plus STIX Two Math (chemin macOS) pour les formules.
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
2. **La version de typst.ts est une seule valeur** : `TYPST_VERSION` de `typst-compiler.ts`, la
   devDependency `@myriaddreamin/typst-ts-web-compiler` et `@myriaddreamin/typst.ts` dans
   `package.json` (`0.6.1-rc5`). Changer l'une sans les autres rend `fiche:verifier` mensonger.
3. **Le numéro d'exercice** se calcule par `exercise-numbering.ts`, jamais depuis `position`.
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
   transmis par l'API élève). Une série d'automatismes **garde** ses marqueurs de détail ; les
   écrans qui affichent un corrigé d'exercice montrent la version détaillée (`detailedCorrection`).
   Aucun marqueur brut n'atteint Typst. Les encadrés `> [!méthode]`… s'impriment encore comme une
   citation simple, sans titre. Tests : `src/lib/worksheets/__tests__/correction-imprimee.test.ts`.

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

1. **Le lot ZIP du professeur ne varie pas par élève.** `PdfPreview.svelte` construit chaque
   instance par sa fonction locale `generateSimpleInstance`, qui prend la **variation 0** de chaque
   exercice : la graine par élève n'est qu'une étiquette. Les copies ne diffèrent que par le nom
   (contrairement à ce que dit l'ADR 0004, « lot déterministe par élève »).
2. **Trois tirages différents** pour « l'instance d'un élève » : `generateWorksheetInstance`
   (respecte `variant_mode`), l'API élève (graine individuelle toujours, `variant_mode` ignoré) et
   `PdfPreview` (variation 0). Le PDF élève et la feuille imprimée par le prof peuvent donc différer.
3. **`worksheet_instances` n'a pas d'écrivain en service** : seul `POST /api/worksheets/[id]/instances`
   en crée, appelé par `VariantPreview.svelte`, qu'aucune page n'importe.
4. **Routes PDF serveur mortes** : `src/routes/api/worksheets/[id]/pdf/+server.ts` exige le Typst
   CLI (`exec`) et répond 501 en son absence ; `pdf/batch/+server.ts` importe typst.ts avec des WASM
   non épinglés. Aucun appelant dans `src/`.
5. **`CorrectionManager.svelte` charge typst.ts sans version** (jsDelivr « latest ») : il échappe à
   l'invariant 2.
6. **Ré-exports dépréciés encore importés** (`$lib/worksheets/typst-compiler`, `typst-generator`) par
   `PdfPreview.svelte` et les routes `pdf/` : avertissement console en dev à chaque chargement.
7. **`available_from` nul refusé par la réponse de l'API élève** :
   `studentWorksheetDetailResponseSchema` déclare `available_from` non nullable, alors que la
   colonne l'est (« disponible tout de suite ») ; une telle affectation ferait répondre
   `GET /api/student/worksheets/[assignmentId]` en 500. Mesuré le 2026-10-11 : 0 affectation
   concernée sur 11.
8. **Polices** : le rendu dépend des polices embarquées par le bundle typst.ts, non listées dans le
   dépôt ; `compile-prod.mjs` ajoute STIX Two Math depuis un chemin macOS — témoin local et
   production peuvent donc différer sur un glyphe.

Vérifié contre le code le 2026-10-11.
