---
couvre:
  - 'src/lib/whiteboard/**'
  - 'src/lib/slides/**'
  - 'src/lib/spreadsheet/**'
  - 'src/lib/constructions/**'
  - 'src/lib/components/spreadsheet/**'
  - 'src/lib/components/google/**'
  - 'src/lib/server/google/**'
  - src/lib/server/kanban.ts
  - 'src/lib/server/validation/{kanban,spreadsheet,google,whiteboard-drive,whiteboard-templates}.ts'
  - src/lib/types/google.ts
  - 'src/routes/(protected)/whiteboard/**'
  - 'src/routes/(protected)/spreadsheet/**'
  - 'src/routes/(protected)/organisation/kanban/**'
  - 'src/routes/slides/**'
  - 'src/routes/(protected)/dashboard/teacher/google/**'
  - 'src/routes/(protected)/dashboard/teacher/settings/google/**'
  - 'src/routes/(protected)/dashboard/student/{classroom,devoirs,materials}/**'
  - 'src/routes/api/whiteboard/**'
  - 'src/routes/api/spreadsheets/**'
  - 'src/routes/api/organisation/kanban/**'
  - 'src/routes/api/google/**'
  - 'src/routes/api/constructions/**'
  - 'src/routes/api/student/{shared-coursework,shared-materials}/**'
---

# Outils du prof : tableau blanc, diaporamas, tableur, kanban, anciennes constructions, Google Classroom

> Six outils périphériques, sans doc jusqu'ici. Écrit depuis le code, le schéma
> (`supabase/migrations/20260616220000_baseline_schema.sql` et suivantes) et un comptage
> en lecture seule de la prod. Vérifié contre le code le 2026-10-10.

## État d'un coup d'œil

| Outil                   | Route                                  | Lien dans l'interface                       | Données en prod (2026-10-10)                 | État                         |
| ----------------------- | -------------------------------------- | ------------------------------------------- | -------------------------------------------- | ---------------------------- |
| Tableau blanc           | `/whiteboard`                          | « Whiteboard » (Header, Sidebar), prof      | 11 modèles ; documents hors base             | **vivant**                   |
| Diaporamas (UbuSlides)  | aucune propre (bibliothèque)           | via le notebook Python et `ClassroomSeries` | aucune table                                 | **vivant** (bibliothèque)    |
| Tableur                 | `/spreadsheet`, `/spreadsheet/[id]`    | aucun                                       | 1 tableur, modifié le 2025-12-05             | **en sommeil**               |
| Kanban                  | `/organisation/kanban`                 | « Suivi du site », menu **admin** seul      | 2 tableaux, 3 cartes (mai 2026)              | vivant, usage interne        |
| Anciennes constructions | `/constructions/conversion`            | bouton depuis `/constructions`              | 0 construction au format `json` (sur 9)      | **résiduel**                 |
| Google Classroom        | `/dashboard/teacher/settings/google` … | masqués (`GOOGLE_CLASSROOM_ENABLED`)        | 1 intégration, 3 cours (derniers en 2025-12) | **éteint**, plomberie gardée |

---

## 1. Tableau blanc (`src/lib/whiteboard/`)

### À quoi ça sert

Un tableau interactif multipage pour écrire un cours : stylo, surligneur, gomme, formes
(style « dessiné main » via roughjs), flèches liées aux formes, blocs de texte avec LaTeX,
images, fond PDF importé, instruments (règle, rapporteur, équerre), pointeur laser,
annotations, export PNG / SVG / PDF, modèles de page.

### Carte du code

| Fichier                                                | Rôle                                                                                                                                                                                                                                                            |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/routes/(protected)/whiteboard/+page.svelte`       | Page : monte `<Whiteboard />` ; le `+page.server.ts` admet élève, prof et admin                                                                                                                                                                                 |
| `src/lib/whiteboard/index.ts`                          | Point d'entrée public du module                                                                                                                                                                                                                                 |
| `src/lib/whiteboard/components/Whiteboard.svelte`      | Composant racine (outils, calques, panneaux)                                                                                                                                                                                                                    |
| `src/lib/whiteboard/stores/whiteboard.svelte.ts`       | `whiteboardStore` (≈ 5 700 lignes, runes) : document, outils, sélection, historique, autosave                                                                                                                                                                   |
| `src/lib/whiteboard/types/document.ts`                 | Modèle : `WhiteboardDocument`, `Page`, `WhiteboardElement`, `UBW_FILE_VERSION`                                                                                                                                                                                  |
| `src/lib/whiteboard/types/file-format.ts`              | Schémas Zod du fichier (`whiteboardDocumentSchema`, `validateDocument`)                                                                                                                                                                                         |
| `src/lib/whiteboard/core/`                             | Géométrie pure : `hit-testing.ts`, `snapping.ts`, `binding*.ts`, `elbow-routing.ts`, `curved-path.ts`, `history.svelte.ts` (`createHistoryManager`, 50 pas), `stroke-smoothing.ts` (perfect-freehand), `rough-renderer.ts`, `pdf-export.ts`, `serialization.ts` |
| `src/lib/whiteboard/utils/`                            | `file-operations.ts` (`.ubw`), `pdf-loader.ts`, `image-loader.ts`, `sync-state.ts` (état Drive)                                                                                                                                                                 |
| `src/lib/whiteboard/services/`                         | `template-service.ts` (modèles), `drive-sync.ts` (Google Drive)                                                                                                                                                                                                 |
| `src/lib/whiteboard/components/InstrumentLayer.svelte` | Instruments — **importés de l'ancien `src/lib/constructions/`** (voir §5)                                                                                                                                                                                       |
| `src/lib/whiteboard/components/FileDrawer.svelte`      | Tiroir de fichiers : local, Drive, export Classroom (masqué par le drapeau)                                                                                                                                                                                     |
| `src/routes/api/whiteboard/`                           | `templates/` (modèles, favoris), `drive/` (list, load, save, folder, autosave, thumbnail), `classes-for-drawer`, `classes-with-course`, `export-to-classroom`                                                                                                   |

### Modèle et persistance

- Un **document** = `pages[]` + `currentPageIndex` + état des instruments + modèle par défaut.
  Une **page** porte ses `elements` (union `StrokeElement | ShapeElement | TextBlockElement |
ImageElement | GroupElement`), un fond uni, une surcouche optionnelle (image ou PDF) et ses
  `annotations`.
- **Aucune table ne stocke les documents.** Trois lieux :
  1. fichier local `.ubw` (JSON versionné, `UBW_FILE_VERSION = 1`) ;
  2. **autosave en localStorage** (clés `chiphre-whiteboard-autosave-<id>`, 60 s après la
     dernière modification, 10 documents au plus) ;
  3. Google Drive (`/api/whiteboard/drive/*`, prof seulement) — **inatteignable aujourd'hui** :
     la connexion passe par `/dashboard/teacher/settings/google`, qui redirige tant que
     `GOOGLE_CLASSROOM_ENABLED` est `false` (§6).
- Tables : `whiteboard_templates` (modèles de page, 11 en prod ; écriture prof/admin),
  `user_whiteboard_template_favorites`, `whiteboard_export_counters` (numéro du jour par
  classe, via la RPC `get_next_export_counter`, appelée seulement par `export-to-classroom`).

### Invariants

- Tout fichier lu (local ou Drive) passe par `validateDocument` / le schéma Zod avant d'entrer
  dans le store.
- Le document est immuable (`readonly`) : chaque geste produit un nouvel état, empilé dans
  l'historique (annuler / refaire).
- Les routes Drive et Classroom exigent `requireRole(locals, 'teacher')`.

### Tests

27 fichiers unitaires : `src/lib/whiteboard/__tests__/` (store, sélection, historique,
sérialisation, import PDF / image, export, formes, lissage…), `src/lib/whiteboard/core/__tests__/`
(liaisons, routage coudé, extension de page), `src/lib/whiteboard/types/__tests__/binding-schema.test.ts`.
Pas de test d'intégration (aucune RLS propre en jeu hors modèles).

---

## 2. Diaporamas — UbuSlides (`src/lib/slides/`)

### À quoi ça sert

Un moteur de présentation à la reveal.js, en Svelte 5 : diapositives en grille 2D
(horizontal / vertical), fragments, transitions, navigation clavier / balayage / ancre d'URL,
défilement automatique. ≠ le **Deck** de révision SRS (voir CONTEXT.md).

### Carte du code

| Fichier                                          | Rôle                                                                              |
| ------------------------------------------------ | --------------------------------------------------------------------------------- |
| `src/lib/slides/index.ts`                        | Exports : `Deck`, `Slide`, `UbuMarkSlide`, `AnnotatableSlide`, `WhiteboardSlide`… |
| `src/lib/slides/core/Deck.svelte`                | Conteneur : contexte, clavier, mise à l'échelle, transitions                      |
| `src/lib/slides/stores/deckStore.svelte.ts`      | `createDeckStore` : position `{ h, v, f }`, navigation                            |
| `src/lib/slides/stores/autoSlideTimer.svelte.ts` | `createAutoSlideTimer` : défilement automatique                                   |
| `src/lib/slides/navigation/hash.ts`              | `parseHash` / `formatHash` / `syncHashEffect` : position dans l'URL               |
| `src/lib/slides/actions/`                        | `keyboard.ts`, `swipe.ts`, `editableTarget.ts` (`isFromEditableField`)            |
| `src/lib/slides/core/config.ts`                  | `defaultConfig`, `mergeConfig`                                                    |
| `src/lib/slides/transitions/`                    | slide, fade, zoom, convex, concave                                                |

### Consommateurs (seuls points d'entrée)

- `src/lib/components/notebook/presentation/NotebookPresentation.svelte` — mode présentation
  du notebook Python (`/python-notebook/[id]/present`) : `Deck`, `Slide`, `UbuMarkSlide`.
- `src/lib/components/test/ClassroomSeries.svelte` — série de questions projetée en classe,
  montée par `QuestionPreviewTabs.svelte` et `/automaths/test`.
- `src/routes/slides/test-transitions/+page.svelte` — page de démonstration des transitions,
  sans lien.

`AnnotatableSlide`, `WhiteboardSlide` et `slideAnnotationStore` ne sont montés par **aucun**
consommateur hors du module.

### Invariants

- Une touche tapée dans un champ éditable ne déplace jamais le diaporama
  (`isFromEditableField`, testé par `inputFilter.svelte.test.ts`).
- Pas de persistance : la position vit dans le store et l'URL.

### Tests

`src/lib/slides/stores/__tests__/` (`deckStore`, `autoSlideTimer`),
`src/lib/slides/core/__tests__/Deck.autoSlide.svelte.test.ts`,
`src/lib/slides/actions/__tests__/inputFilter.svelte.test.ts`.

---

## 3. Tableur (`src/lib/spreadsheet/`)

### À quoi ça sert

Un tableur 20 × 20 (colonnes A–T, lignes 1–20) avec formules à noms français ou anglais,
mise en forme de cellule et import / export CSV. Moteur de formules **dédié**, séparé de
mathAST. **En sommeil** : aucune page ne mène à `/spreadsheet` ; un seul tableur en prod.
(L'atelier n'utilise pas ce module : son tableur intégré reste une question ouverte,
voir [atelier.md](atelier.md).)

### Carte du code

| Fichier                                    | Rôle                                                                                                                                          |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/spreadsheet/types.ts`             | `MAX_ROWS`, `MAX_COLS` (20), `MAX_CELL_VALUE_LENGTH` (5 000), `ERROR_CODES`, schémas Zod (`spreadsheetDataSchema`…), `createEmptySpreadsheet` |
| `src/lib/spreadsheet/store.svelte.ts`      | `spreadsheetStore` (runes) : cellules, sélection, navigation, `exportData` / `importData`                                                     |
| `src/lib/spreadsheet/parser/`              | `lexer.ts` → `parser.ts` (descente récursive) → `evaluator.ts` (`evaluateFormula`, plage ≤ 400 cellules)                                      |
| `src/lib/spreadsheet/dependency-graph.ts`  | `DependencyGraph` : recalcul en cascade, cycles → `#CIRC!`                                                                                    |
| `src/lib/spreadsheet/functions/`           | Registre (`executeFunction`, `hasFunction`) ; `math.ts`, `logic.ts`, `text.ts` ; `aliases.ts` (`FUNCTION_ALIASES` français → anglais)         |
| `src/lib/spreadsheet/cell-reference.ts`    | `colToLetter`, `parseCellRef`, `parseRange`, `expandRange`, `isValidCellRef`…                                                                 |
| `src/lib/spreadsheet/csv.ts`, `format.ts`  | `parseCsv` / `generateCsv` / `downloadCsv` ; affichage d'une valeur calculée                                                                  |
| `src/lib/components/spreadsheet/`          | `Spreadsheet.svelte`, grille, cellule, barre de formule, barre d'outils, import / export                                                      |
| `src/lib/server/validation/spreadsheet.ts` | Schémas des requêtes API                                                                                                                      |
| `src/routes/api/spreadsheets/`             | `GET`/`POST` liste ; `GET`/`PUT`/`DELETE` par id                                                                                              |

### Modèle

Table `spreadsheets` : `user_id`, `name`, `description`, `data` (jsonb : `cells`,
`version`, `metadata`). RLS : chacun ne lit et n'écrit que ses tableurs (`auth.uid() = user_id`).
Une valeur calculée est une union `number | string | boolean | error | empty` ; codes
d'erreur `#REF!`, `#DIV/0!`, `#VALUE!`, `#NAME?`, `#CIRC!`, `#NUM!`.

**Fonctions réellement implémentées** (59, noms canoniques anglais) — maths : SUM, AVERAGE,
MIN, MAX, COUNT, COUNTA, PRODUCT, ABS, ROUND, FLOOR, CEILING, INT, TRUNC, SIGN, MOD, POWER,
SQRT, LOG, LOG10, LN, EXP, SIN, COS, TAN, ASIN, ACOS, ATAN, PI, RAND, RANDBETWEEN ; logique :
IF, AND, OR, NOT, XOR, IFERROR, ISERROR, ISBLANK, ISNUMBER, ISTEXT, ISLOGICAL, TRUE, FALSE ;
texte : CONCAT, CONCATENATE, LEFT, RIGHT, MID, LEN, UPPER, LOWER, PROPER, TRIM, FIND, SEARCH,
SUBSTITUTE, REPLACE, TEXT, REPT. Noms français : table `FUNCTION_ALIASES` (SOMME, MOYENNE,
SI, ARRONDI, RESTE, ALEA_ENTRE_BORNES…).

Clavier : flèches, Entrée, Tab / Maj+Tab, Échap, F2, Suppr, Ctrl/Cmd+B et +I
(`Spreadsheet.svelte`).

### Invariants

- Toute cellule et tout document passent par les schémas Zod de `types.ts` (bornes 20 × 20,
  5 000 caractères) côté client comme côté API.
- Une fonction inconnue rend `#NAME?`, jamais une exception.

### Tests

`src/lib/spreadsheet/__tests__/` : lexer, parser, evaluator, functions, dependency-graph,
csv, types-import.

---

## 4. Kanban (`kanban_*`)

### À quoi ça sert

Des tableaux de cartes en colonnes. Deux sortes : **personnel** (`class_id` nul) ou **de
classe** (visible des membres actifs de la classe). Lien « Suivi du site » dans le menu
**admin** seulement (`src/lib/config/dashboard-nav.ts`) ; un prof ou un élève n'y arrive que
par l'URL. `/organisation` redirige vers `/organisation/kanban` (même section : pomodoro).

### Carte du code

| Fichier                                                 | Rôle                                                                                                                         |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `src/routes/(protected)/organisation/kanban/`           | Liste des tableaux, `CreateBoardDialog.svelte`                                                                               |
| `src/routes/(protected)/organisation/kanban/[boardId]/` | Tableau : colonnes, cartes (glisser-déposer), édition, étiquettes, assignés ; `api.ts` client                                |
| `src/lib/server/kanban.ts`                              | `getAccessibleBoards`, `getBoardWithContent`, `assertBoardOwner`, `assertBoardAccess`, `isClassTeacher`, `rateLimitResponse` |
| `src/lib/server/validation/kanban.ts`                   | Schémas Zod (`createBoardSchema`, `createCardSchema`, `tagColorSchema`…)                                                     |
| `src/routes/api/organisation/kanban/`                   | `boards`, `columns`, `cards`, `tags` (REST)                                                                                  |

### Modèle

`kanban_boards` (`owner_id`, `class_id`) → `kanban_columns` → `kanban_cards` (description en
ubumark ≤ 50 000 caractères, `due_date`) ; `kanban_tags` par tableau, jonctions
`kanban_card_tags` et `kanban_card_assignees`. `position` est un `double precision`
(indexation fractionnaire : déplacer une carte ne réécrit qu'une ligne).

### Invariants

- **RLS** : le propriétaire gère son tableau ; un tableau de classe est lisible par le prof et
  les **membres actifs** (`is_class_member`, actif seulement depuis
  `supabase/migrations/20260915400000_is_class_member_actif_seulement.sql`) ; on n'assigne
  qu'un membre actif (`supabase/migrations/20260915420000_assignation_kanban_membre_actif.sql`).
- La RLS échoue en silence : les routes appellent `assertBoardOwner` / `assertBoardAccess`
  d'abord pour rendre un 403 / 404 explicite.
- Mono-prof : `isClassTeacher` est un test de rôle (prof ou admin), plus d'appartenance.

### Tests

Intégration : `tests/integration/kanban-rls.test.ts`, `tests/integration/kanban-membre-archive.test.ts`,
`tests/integration/assignation-kanban-membre-actif.test.ts`. Unitaires :
`src/routes/api/organisation/kanban/__tests__/api-routes.test.ts`, glisser-déposer
`kanban-dnd.svelte.test.ts` (sous `[boardId]/__tests__/`).

---

## 5. Ancien moteur de constructions (`src/lib/constructions/`)

### Ce que c'est

Le moteur **d'avant le DSL** : des scripts de construction en **JSON plat**
(`{ "point": "A", "at": [100, 200] }`, `{ "move": "pencil", … }`), validés par
`constructionScriptSchema` (`schemas.ts`), joués par `core/engine.svelte.ts`,
`core/renderer.ts`, `core/timeline.svelte.ts`, avec un évaluateur d'expressions
(`core/evaluator.ts`). `converter.ts` (`convertInstrumenPoche`) traduit un XML InstrumenPoche
**vers ce JSON**. Le système actuel est `constructions-v2` + `geometry-core`
([geometrie/README.md](geometrie/README.md)), dont le propre `convertXmlToDsl` traduit le XML
**vers le DSL**.

### Frontière avec constructions-v2 — qui l'importe encore

| Consommateur                                                   | Ce qu'il prend                                                                  |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `src/lib/whiteboard/components/InstrumentLayer.svelte`         | `Ruler`, `Protractor`, `SetSquare` (.svelte) — les instruments du tableau blanc |
| `src/lib/components/QuestionTemplateForm.svelte`               | `JsonEditor.svelte` seul (éditeur JSON générique du formulaire de question)     |
| `src/routes/(protected)/constructions/conversion/+page.svelte` | lecteur, `convertInstrumenPoche` **et** `convertXmlToDsl` (comparaison)         |
| `src/routes/api/constructions/+server.ts`                      | `constructionScriptSchema` pour accepter `format: 'json'` à la création         |
| `src/routes/api/constructions/convert/+server.ts`              | `convertInstrumenPoche`                                                         |

La page `/constructions/[id]` ne joue **que** `dsl_script` (lecteur v2) ; une construction
`format = 'json'` y affiche « ancien format JSON qui n'est plus supporté ». Il n'en reste
aucune en prod (0 sur 9).

### Invariants

- Aucun code nouveau ne doit dépendre de ce module ; `constructions-v2` a ses propres
  instruments (`src/lib/constructions-v2/instruments/components/`).

### Tests

`src/lib/constructions/__tests__/converter.test.ts`, `src/lib/constructions/core/__tests__/evaluator.test.ts`.

---

## 6. Google Classroom (`src/lib/server/google/`)

### État : éteint

`GOOGLE_CLASSROOM_ENABLED = false` (`src/lib/config/google-classroom.ts`) depuis que l'école
a quitté le domaine Google Workspace. Le drapeau masque les entrées de l'interface
(bouton de `/dashboard/teacher/classes`, export Classroom du `FileDrawer`) et fait
rediriger vers `/dashboard` les pages `dashboard/teacher/settings/google`,
`dashboard/student/classroom`, `dashboard/student/devoirs`, `dashboard/student/materials`.
`/dashboard/teacher/google` redirige vers les réglages (`src/hooks.server.ts`). Tables,
routes `/api/google/**` et dialogues `src/lib/components/google/` sont conservés : remettre
le drapeau à `true` rallume tout. La connexion Google (`GOOGLE_LOGIN_ENABLED`, autre drapeau)
est décrite dans [auth.md](auth.md).

### Carte du code

| Fichier                                                     | Rôle                                                                                                                      |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/server/google/oauth.ts`                            | OAuth 2.0 + PKCE : `getAuthUrl`, `exchangeCodeForTokens`, `refreshAccessToken`, `revokeAccess`, `GOOGLE_CLASSROOM_SCOPES` |
| `src/lib/server/google/encryption.ts`                       | `encryptToken` / `decryptToken` (AES-256-GCM, clé `GOOGLE_TOKEN_ENCRYPTION_KEY`)                                          |
| `src/lib/server/google/sync.ts`                             | `getTeacherAccessToken`, `fullSync`, `syncTeacherCourses`, `syncTopics`, `syncCoursework`, `syncCourseWorkMaterials`      |
| `src/lib/server/google/classroom-api.ts`                    | `GoogleClassroomClient`                                                                                                   |
| `src/lib/server/google/drive-api.ts`                        | `GoogleDriveClient` (aussi utilisé par le Drive du tableau blanc)                                                         |
| `src/lib/server/google/schemas.ts`, `errors.ts`, `utils.ts` | Zod des réponses Google, erreurs typées, dates, backoff                                                                   |
| `src/lib/server/google/gmail.ts`                            | `sendWelcomeEmail`, `sendConsentEmail` — **plus appelés** : l'envoi passe par Brevo (`src/lib/server/email/brevo.ts`)     |
| `src/routes/api/google/`                                    | `auth/` (connect, callback, status, disconnect), `courses`, `topics`, `sync`, partage de devoirs et de supports           |

### Modèle

`google_integrations` (jetons chiffrés du prof), `google_classroom_courses`, `_topics`,
`_coursework`, `_materials`, `_material_attachments` (miroir synchronisé). En prod :
1 intégration, 3 cours, synchronisés pour la dernière fois en décembre 2025.

### Invariants

- Les jetons ne sont jamais stockés en clair (`encryptToken` avant écriture).
- Le `callback` vérifie le `state` et le vérificateur PKCE (cookies `httpOnly`) ; il ne crée
  **aucune session** — voir [auth.md](auth.md), « l'autorisation Google Classroom ».

### Tests

`src/lib/server/google/__tests__/` (drive-api, google-sync) ; routes :
`src/routes/api/google/topics/__tests__/google-topics.test.ts`,
`src/routes/api/google/shared-materials/__tests__/google-shared-materials.test.ts`, et les
dossiers `__tests__` de `coursework/bulk-share`, `materials/[id]/share`,
`shared-coursework` et `shared-coursework/[id]`.

---

## Comment étendre

- **Tableau blanc** : un nouvel élément = un membre de l'union `WhiteboardElement`
  (`types/document.ts`) **et** son schéma dans `types/file-format.ts` (sinon le fichier
  `.ubw` est refusé au rechargement), plus son rendu export (`core/pdf-export.ts`).
- **Tableur** : une fonction = une entrée dans `math.ts` / `logic.ts` / `text.ts` ; son nom
  français dans `FUNCTION_ALIASES`.
- **Diaporama** : un nouveau consommateur importe depuis `src/lib/slides/index.ts`.
- **Constructions** : jamais dans l'ancien module — voir [geometrie/README.md](geometrie/README.md).

## Décisions

Aucun ADR propre à ces outils. Google Classroom : drapeau décrit dans
`src/lib/config/google-classroom.ts`.

## Écarts connus

1. **Tableur — un prof ne peut rien faire** : les routes `/spreadsheet` et
   `/api/spreadsheets` appellent `requireRole(locals, 'student')`, qui exige le rôle
   **exact** ; un commentaire annonce « Both students and teachers », un prof reçoit 403.
2. **Tableur — alias sans fonction** : `FUNCTION_ALIASES` nomme COUNTBLANK, STDEV, VAR,
   MEDIAN, MODE, TODAY, NOW, YEAR, MONTH, DAY, VLOOKUP, HLOOKUP, INDEX, MATCH, qu'aucun
   fichier n'implémente → `#NAME?`.
3. **Tableau blanc** : la route admet les élèves, le lien n'est montré qu'au prof ; le
   panneau Drive reste visible alors que la connexion Google est éteinte.
4. **Google** : les routes `/api/google/**` ne testent pas le drapeau (seules les pages le
   font) ; `class_google_classroom_links` n'est lue nulle part dans `src/`.
5. **Kanban** : l'en-tête de `src/lib/server/kanban.ts` cite une migration d'avant le baseline.
6. **Diaporamas** : `AnnotatableSlide`, `WhiteboardSlide`, `slideAnnotationStore` exportés
   mais sans consommateur.
