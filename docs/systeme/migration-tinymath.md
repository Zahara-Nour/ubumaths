---
couvre:
  - 'src/lib/migration/*.ts'
  - 'src/lib/migration/review/*.ts'
  - 'src/lib/server/migration/**'
  - 'src/lib/components/migration/**'
  - 'src/routes/api/migration/**'
  - 'src/routes/(protected)/dashboard/admin/migration/**'
  - 'src/lib/server/validation/migration*.ts'
  - src/lib/types/migration.ts
  - 'src/lib/transpilers/**'
---

# Migration des anciennes questions (TinyMath)

> Ce que fait le code qui transforme les questions de l'ancien site (TinyMath) en modèles de questions Chiphre, les fait relire, puis les importe en brouillon.
> Ce qui n'est **pas** recopié ici : le format d'un modèle et son cycle de vie ([questions.md](questions.md)), la notation des énoncés ([ubumark.md](ubumark.md)), les exercices de fiche ([exercices.md](exercices.md)), le vocabulaire ([CONTEXT.md](../../CONTEXT.md), entrée « Relecture »). Le circuit de relecture pas à pas est dans [`data/relecture/README.md`](../../data/relecture/README.md).
>
> Vérifié contre le code le 2026-10-13 (commit `4f3eb2b3e`) ; garde E1 de `checkTemplate` le 2026-10-24.

## À quoi ça sert

TinyMath était l'ancien site. Ses questions sont figées dans un fichier : `data/tinymath/old-questions.json`, **633 questions**, rangées par thème, domaine, sous-domaine et niveau. Chaque question porte un champ `_migration` avec son numéro global (`globalIndex`, de 0 à 632) et sa catégorie.

Le but : faire de chaque ancienne question un **modèle de question** Chiphre (`QuestionTemplate`, voir [questions.md](questions.md)), rangé dans la table `question_templates`. Le chemin compte trois étapes :

1. **Transformer** : réécrire l'ancienne syntaxe (variables `&1`, tirages, conditions `@@…@@`, grandeurs, réponses) dans la syntaxe du moteur actuel.
2. **Relire** : un humain dit si le résultat est bon (`approved`), à écarter (`rejected`), ou le corrige.
3. **Importer** : seules les questions approuvées entrent dans `question_templates`, **toujours en brouillon** (`status = 'draft'`). La publication reste un geste de David.

Les types de questions TinyMath (`numerical_exact`…) n'existent plus que dans ce code (voir CONTEXT.md).

## Carte du code

### 1. Lecture de l'ancien format

- `src/lib/migration/old-question-types.ts` : types de l'ancienne question (`QuestionBase`, `QuestionWithMigration`) et petits détecteurs (`hasChoices`, `hasImages`, `hasTestAnswers`, `detectQuestionType`…).
- `src/lib/migration/question-data-loader.ts` : lit `data/tinymath/old-questions.json` (`loadAllQuestions`, `loadQuestionByIndex`, `loadQuestionWithTransform`, `isValidGlobalIndex`). Utilisé par les routes d'API.
- `src/lib/migration/image-url-mapping.ts` : lit `scripts/image-url-mapping.json` (ancien chemin d'image → URL Supabase Storage), avec un cache en mémoire.
- `src/lib/server/migration/hash-utils.ts` : `generateStableQuestionHash` donne l'**empreinte** SHA-256 d'une question. C'est la clé de suivi en base (`old_question_hash`). L'empreinte ne prend que la description, les énoncés, les expressions, les variables et les solutions. Un commentaire du fichier explique pourquoi le contenu des variables n'y entre pas ; les jumelles distinctes connues (`DISTINCT_TWINS`) reçoivent un suffixe `#<globalIndex>`.

### 2. Transformation (les convertisseurs)

Le point d'entrée est `transformQuestion(oldQuestion, globalIndex, options)` dans `src/lib/migration/question-transformer.ts`. Il rend un `TransformResult` : `success`, `template`, `warnings`, `errors`, `stats`. Il ne lance pas d'exception sur une question ratée : il rend `success: false`.

Il s'appuie sur des convertisseurs spécialisés, tous dans `src/lib/migration/` :

| Fichier                    | Ce qu'il réécrit                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| `syntax-converter.ts`      | variables, tirages et évaluations TinyCAS (`convertTinyCASToNew`, `toSimplifiedSyntax`)    |
| `placeholder-converter.ts` | marqueurs de correction (`&sol`, `&answer`…) en `{{…}}` (`convertPlaceholders`)            |
| `conditional-converter.ts` | `@@condition ?? texte@@` en `{{if:condition\|texte}}` (`convertConditionals`)              |
| `quantity-converter.ts`    | grandeurs « nombre espace unité » vers la notation du moteur (`rewriteTinyMathQuantities`) |
| `answer-latex.ts`          | réponse attendue `p/q` en `\frac` (`slashFractionsToLatex`)                                |

Le modèle produit sort avec `status: 'draft'`.

Deux convertisseurs AsciiMath existent mais **ne sont pas branchés** : `src/lib/migration/ascii-math-converter.ts` et le transpileur `src/lib/transpilers/asciimath-to-latex/` (voir Écarts connus). Le transformateur le dit lui-même : « No AsciiMath→LaTeX conversion here ».

### 3. Validation

- **Zod des routes** : `src/lib/server/validation/migration-review.ts`. `globalIndexSchema` (entier de 0 à 632), `approveQuestionSchema` et `rejectQuestionSchema` (notes ou motif, 1 000 caractères au plus), `batchApproveSchema` (100 numéros au plus), `saveEditSchema` et `editedQuestionTemplateSchema` (modèle corrigé, champs bornés).
- **Zod du suivi** : `src/lib/server/validation/migration.ts`. `migrationTrackingInsertSchema` valide chaque ligne que `MigrationStateManager` écrit dans `migration_tracking` ; `migrationStateSchema` valide le fichier d'état.
- **Contrôle d'un modèle avant import** : `checkTemplate` dans `src/lib/migration/review/check-template.ts`. Un modèle passe seulement si : `validateTemplate` et le schéma strict passent, il a au moins une spec de test et toutes sont vertes (sauf carte de cours, qui doit avoir recto et verso non vides), et chaque variation se génère sur `instances` tirages sans échec (50 par défaut : `DEFAULT_INSTANCES_PER_VARIATION`). Quand une case exige une forme de l'élève (`requiredForm`), la réponse de la correction automatique d'une dérivée ou d'une primitive doit passer ce juge à chaque tirage, qu'elle demande une forme (`finalForm`) ou non (`correctionForm` du rapport, E1, chantier simplify-carte Q37, 2026-10-24) ; test : `check-template-forme-demandee.test.ts`.

### 4. Écran admin de relecture

Pages sous `/dashboard/admin/migration` (`src/routes/(protected)/dashboard/admin/migration/`) :

- `+page.svelte` : arbre thème › domaine › sous-domaine (`MigrationTree`) et avancement (`CategoryProgress`).
- `[theme]/[domain]/[subdomain]/+page.svelte` : cartes des questions (`QuestionCard`), comparaison ancien / nouveau (`QuestionCompareView`), boutons approuver / rejeter (`ReviewActions`), lancement des specs en lot (`TestSpecBatchRunner`).
- `[theme]/[domain]/[subdomain]/[globalIndex]/edit/+page.svelte` : édition du modèle avec `QuestionTemplateForm` (chargé à la demande).

Les trois `+page.server.ts` lisent le **dernier export** sous `data/migration-output/export-*/` (produit par `scripts/export-questions-for-review.ts`), puis `migration_tracking` et `migration_edits`. Ce dossier n'est pas versionné : sans export local, les pages répondent 404.

Routes d'API sous `src/routes/api/migration/` :

| Route                                        | Effet                                                                  |
| -------------------------------------------- | ---------------------------------------------------------------------- |
| `GET /api/migration/questions/[globalIndex]` | rend l'ancienne question et sa transformation                          |
| `POST …/[globalIndex]/approve`               | `review_status = 'approved'` via `MigrationStateManager`               |
| `POST …/[globalIndex]/reject`                | `review_status = 'rejected'` via `MigrationStateManager`               |
| `POST …/[globalIndex]/edit`                  | crée au besoin la ligne de suivi, puis `upsert` dans `migration_edits` |
| `POST /api/migration/batch/approve`          | vérifie des numéros, **n'écrit rien** (voir Écarts connus)             |

### 5. Écriture en base

Tables : `migration_tracking` (une ligne par empreinte), `migration_edits` (une version corrigée par empreinte, clé unique `old_question_hash`), `migration_images`, et la cible `question_templates`.

Deux chemins d'écriture vivent dans la zone :

- **`MigrationStateManager`** (`src/lib/server/migration/state-manager.ts`), utilisé par les routes approve / reject et par `scripts/migrate-questions-phase1.ts`. `recordQuestionProcessed` fait un `upsert` de toute la ligne de suivi, en reprenant les champs que la transition ne change pas. Il tient aussi un fichier d'état sur disque (`data/tinymath/migration-state.json`, verrouillé par `proper-lockfile`) et un rapport `data/tinymath/migration-progress.md`.
- **`review-db.ts`** (`src/lib/server/migration/review-db.ts`), utilisé par deux scripts lancés à la main :
  - `pnpm relecture:verdicts` (`scripts/record-review.ts`) → `recordReview` : reporte un fichier de verdict `data/relecture/<lot>/<n>.json` (lu par `parseReviewFile`, `src/lib/migration/review/review-file.ts`) dans `migration_tracking` et, s'il porte un modèle corrigé, dans `migration_edits` ;
  - `pnpm relecture:import` (`scripts/import-reviewed-questions.ts`) → `listImportCandidates` puis `importReviewedQuestion` : insère dans `question_templates` la version corrigée si elle existe, sinon la transformation du jour, via `toTemplateInsertRow` (`src/lib/migration/review/template-insert-row.ts`), puis relie le suivi (`new_template_id`, `migration_status = 'imported'`).

Le verdict humain (`review_status` : `pending`, `approved`, `rejected`) est séparé de l'avancement technique (`migration_status` : `pending`, `converted`, `imported`, `validated`, `failed`). Les commentaires de `src/lib/types/migration.ts` l'expliquent : avant, le mot `validated` portait les deux sens.

`src/lib/server/migration/publication.ts` (`motifDeNonPublication`) dit pourquoi une question n'est pas publiable : `jamais-relue`, `deja-publiee` (testé en premier), `non-approuvee`. Seul `scripts/migrate-questions-phase1.ts` l'appelle.

## Invariants

- **Rien n'est publié sans David.** `toTemplateInsertRow` écrit `status: 'draft'` quoi que dise le modèle (commentaire : « Jamais publié par l'import, quoi que dise le brouillon »). `transformQuestion` sort aussi des brouillons. Aucune route de la zone n'écrit dans `question_templates`. Approuver dans l'écran ne fait qu'écrire un verdict.
- **Simulation par défaut.** `recordReview` et `importReviewedQuestion` ne touchent pas la base tant que `dryRun` est vrai ; les deux scripts ne passent `dryRun = false` qu'avec `--publier`.
- **Seule une question approuvée s'importe.** `importReviewedQuestion` rend `skipped` si `review_status` n'est pas `approved`.
- **Idempotence de l'import.** `listImportCandidates` ne prend que `new_template_id IS NULL`. La liaison du suivi est un `update … .is('new_template_id', null)` : rejouer ne crée pas de doublon. Si l'insertion réussit mais pas la liaison, le code lève une erreur qui demande de relier à la main avant de relancer.
- **Chaque écriture de `review-db.ts` est relue** (`.select()` et nombre de lignes vérifié), parce qu'un refus RLS rend zéro ligne sans erreur ([rls-echecs-silencieux.md](../pratiques/rls-echecs-silencieux.md)).
- **Une correction ou un verdict existants ne sont pas écrasés** par `recordReview` sans `allowReplaceEdit` (option `--remplacer`). Une question déjà importée est refusée.
- **Doublons d'empreinte.** Si la ligne de suivi trouvée porte un autre `old_question_index`, `recordReview` et `importReviewedQuestion` refusent (« doublon TinyMath »).
- **Le modèle importé est celui qui a été relu.** Si le fichier de verdict porte un modèle, `importReviewedQuestion` refuse quand la version en base en diffère (comparaison à l'ordre des clés près, car jsonb les réordonne).
- **Accès : admin seulement.** Chaque route d'API teste `locals.profile.role !== 'admin'` (401 sans profil, 403 sinon). Les pages appellent `requireAdmin` en plus de la garde du layout `src/routes/(protected)/dashboard/admin/+layout.server.ts`. En base, les trois tables `migration_*` n'ont qu'une policy « Admin full access » (baseline `supabase/migrations/20260616220000_baseline_schema.sql`).
- **Zod sur toutes les entrées des routes** : numéro de question, corps de requête (voir §3).

## Comment étendre

- **Réécrire une nouvelle construction TinyMath** : ajouter la règle dans le convertisseur concerné (tableau du §2), avec un test dans `src/lib/migration/__tests__/`. Si la règle touche le modèle entier (options, variations), elle va dans `question-transformer.ts`, avec un test `transformer-<sujet>.test.ts` sur le modèle des fichiers existants.
- **Un nouveau type de question cible** : il naît dans le moteur ([questions.md](questions.md), §Comment étendre), pas ici. Le type d'une ligne importée n'est pas choisi par la migration : `toTemplateInsertRow` le déduit avec `getQuestionType`.
- **Un nouveau critère d'import** : il va dans `checkTemplate`. Il est alors rejoué sur tout le corpus relu par `corpus-relecture.test.ts`.
- **Un nouveau transpileur** : rien ne l'appellera tant que `question-transformer.ts` ne l'importe pas. Vérifier avec `git grep` qu'il est branché avant de le documenter comme actif.

## Tests

- `src/lib/migration/__tests__/` : un fichier par convertisseur (`syntax-converter*.test.ts`, `placeholder-converter.test.ts`, `conditional-converter.test.ts`, `ascii-math-converter.test.ts`…) et des tests du transformateur par sujet (`transformer-*.test.ts`, `question-transformer.test.ts`, `correction-integration.test.ts`).
- `src/lib/migration/review/__tests__/` : `review-modules.test.ts` (`checkTemplate`, `toTemplateInsertRow`, `parseReviewFile`, `buildTrackingReviewUpdate`, `draftTemplate`), `negative-warnings.test.ts`, et `corpus-relecture.test.ts` qui rejoue `checkTemplate` sur tous les fichiers de `data/relecture/`.
- `src/lib/server/migration/__tests__/` : `hash-utils.test.ts` (stabilité de l'empreinte, jumelles), `publication.test.ts`, `state-manager-preservation.test.ts` (l'`upsert` ne perd pas l'histoire de la ligne).
- `src/routes/api/migration/__tests__/migration-review.test.ts` : les routes, avec des mocks.
- `tests/integration/relecture-questions-import.test.ts` : `recordReview`, `importReviewedQuestion` et `listImportCandidates` contre la base locale (simulation, rejeu sans doublon, doublon d'empreinte, version relue différente…).
- `src/lib/transpilers/asciimath-to-latex/__tests__/` : tokenizer, parser, générateur.

## Décisions

Aucun ADR ne porte sur la migration elle-même. Deux la touchent :

- [ADR 0009](../adr/0009-carte-de-cours-type-explicite.md) : les questions « Flash » de TinyMath n'ont ni case ni choix ; d'où le type explicite carte de cours, que `checkTemplate` traite à part.
- [ADR 0013](../adr/0013-contrainte-de-forme-rebranchee-defaut-strict.md) : les contraintes de forme de TinyMath et le choix du défaut strict.

## Écarts connus

Constatés le 2026-10-13, **non corrigés, et à ne pas corriger** : la migration est terminée ; David garde les scripts en l'état, au cas où (décision du 2026-10-13). Ne pas les reproposer comme chantier.

- **`POST /api/migration/batch/approve` n'écrit rien.** Il vérifie les numéros et répond « approuvé » (`// TODO: Phase 4 - Store approval in database`). L'en-tête dit « updates in-memory state » : il n'y a pas d'état. Aucun écran ne l'appelle.
- **Approve laisse passer une transformation ratée.** La route teste `!questionData.transformed`, mais `transformQuestion` rend un objet `{ success: false }` sans lancer : la garde ne voit que les exceptions. Même garde dans `batch/approve`. Les tests mockent `transformed: { id: 'test' }`, une forme que le code réel ne rend jamais.
- **Approve / reject remettent `migration_status` à `pending`**, même pour une question déjà importée (`new_template_id` conservé, `imported` perdu). `recordReview`, lui, refuse une question déjà importée.
- **Approve annonce `usedEditedVersion`** et passe `editedJson` à `recordQuestionProcessed`, qui ne le lit pas : rien n'est enregistré de ce choix.
- **`recordQuestionProcessed` ne relit pas son `upsert`** (pas de `.select()`), contrairement à `review-db.ts` : un refus RLS passerait pour un succès. Une erreur de lecture préalable est seulement journalisée.
- **Les routes approve / reject écrivent sur disque** (`data/tinymath/migration-state.json`, `migration-progress.md`). Hors poste local, rien dans le code ne garantit que ce chemin soit inscriptible.
- **Écran inutilisable sans export local** : `data/migration-output/` n'est pas versionné (`/data/` dans `.gitignore`).
- **Code mort** : `src/lib/transpilers/asciimath-to-latex/` (seuls ses tests l'importent), `src/lib/migration/ascii-math-converter.ts` (idem), `src/lib/migration/test-transformer-examples.ts`, `src/lib/components/migration/MigrationQuestionEditForm.svelte`, `QuestionCompareView.example.svelte` et le barillet `src/lib/components/migration/index.ts` (personne ne les importe). Le compteur `stats.asciiMathConverted` reste toujours à 0.
- **README du transpileur périmé** : il annonce `lexer.ts` (le fichier s'appelle `tokenizer.ts`) et des `TODO` sur des fichiers écrits.
- **Bornes en dur** : `globalIndexSchema` et `batchApproveSchema` fixent 632 ; le fichier en compte 633 (0 à 632), juste aujourd'hui mais non relié au fichier.
- **Import circulaire** : `syntax-converter.ts`, `placeholder-converter.ts` et `conditional-converter.ts` importent `numberToLetterName` de `question-transformer.ts`, qui les importe.
- **Doublons de types** : `ReviewStatus`, `MigrationStatus`, `MigrationState`, `PhaseState` existent dans `src/lib/types/migration.ts` et dans `src/lib/server/validation/migration.ts` ; `phaseStatusSchema` accepte `failed`, que le type `PhaseStatus` ignore.
- **Plusieurs chemins d'import vers `question_templates`** hors de la zone : `scripts/import-questions-to-db.ts` (`pnpm migration:import`) et `scripts/migrate-questions-phase1.ts --publier`, en plus de `relecture:import`. L'en-tête de `import-reviewed-questions.ts` dit les remplacer « pour la relecture » ; seul ce dernier passe par `toTemplateInsertRow`, donc par le `draft` forcé.
- **Pas de test unitaire de `review-db.ts`** : il n'est couvert que par le test d'intégration, qui ne tourne pas sans Supabase local.
