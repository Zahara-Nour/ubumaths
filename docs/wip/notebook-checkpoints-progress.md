# Notebook Checkpoints — Progress

Feature : cellules de validation (`checkpoint`) dans les notebooks Python, avec 3 modes (`assert`, `unit_test`, `variable_check`), persistance des runs par élève, et dashboard prof.

> Décision produit + design dans le thread de conversation. Périmètre V1 confirmé par l'utilisateur.

---

## Statut global

| Phase | Description                                        | Statut     | Commit      |
| ----- | -------------------------------------------------- | ---------- | ----------- |
| 1     | Migration DB + types TS + Zod schemas              | ✅ Livrée  | `4c15d7c02` |
| 2     | Worker : nouveau mode `assert` + `contextId`       | ✅ Livrée  | `c40fb96bd` |
| 3     | Endpoints POST + GET checkpoint-runs               | ✅ Livrée  | `cf009a7b7` |
| 4     | Composant `CheckpointCell.svelte` (vue élève)      | ✅ Livrée  | `a53d2459a` |
| 5     | UI teacher : éditeur de checkpoint dans notebook   | ✅ Livrée  | _pending_   |
| 6     | Dashboard prof `/python-notebook/[id]/results`     | ⏳ À faire | —           |
| 7     | Doc + autofixer + check:incremental + commit final | ⏳ À faire | —           |

---

## Périmètre V1 confirmé

| Inclus                                                            | Exclu V1                             |
| ----------------------------------------------------------------- | ------------------------------------ |
| Cellule type `checkpoint` (3e type à côté de `code` / `markdown`) | `output` cell-targeting              |
| Mode `assert` (Python libre + AssertionError)                     | `reference_solution`                 |
| Mode `unit_test` (function + cases)                               | `ast_requirements`                   |
| Mode `variable_check` (expected_vars dans namespace persistant)   | Locked zones dans notebook           |
| Status `passed`/`failed`/`not_run` par checkpoint × élève         | Mastery sticky                       |
| Dashboard prof `/python-notebook/[id]/results`                    | Score global / pondération           |
| RLS : élève lit/écrit ses runs ; prof voit tout                   | Re-run auto au changement de cellule |

---

## Décisions architecturales

- **Stockage des runs** : nouvelle table `python_notebook_checkpoint_runs(notebook_id, user_id, cell_id, status, error_message?, ran_at)`. PK composite (notebook_id, user_id, cell_id) → 1 ligne par triplet, upsert à chaque run.
- **Cellule** : nouveau `cellType: 'checkpoint'` dans `NotebookCell`. Champs supplémentaires : `mode: 'assert' | 'unit_test' | 'variable_check'` + `config` discriminée.
- **Worker** : extension de `validate-exercise` avec `contextId` optionnel → la validation lit le namespace persistant au lieu d'exécuter le code dans un dict éphémère.
- **Nouveau mode worker** : `assert` (4e kind dans `BehaviorCheck`) — exec du code dans le namespace, capture `AssertionError`, status binaire.
- **API** : `POST /api/python-notebooks/[id]/checkpoint-runs` (UPSERT) + `GET /api/python-notebooks/[id]/checkpoint-runs` (filtré par RLS).
- **Dashboard prof** : route `/python-notebook/[id]/results`, accessible aux profs auteur OU ayant assigné, compose `assignments + class_members + checkpoint_runs`.

---

## Fichiers concernés (anticipé)

### DB

- `supabase/migrations/<timestamp>_create_notebook_checkpoint_runs.sql` (nouveau)

### Types & Zod

- `src/lib/types/notebook.ts` — ajout `'checkpoint'` à `CellType`, `CheckpointCell`, `CheckpointConfig`
- `src/lib/shared/python/types.ts` — extension `BehaviorCheck` avec `kind: 'assert'`, `ExecuteMessage` / `validate-exercise` avec `contextId`
- `src/lib/shared/python/index.ts` — re-exports
- `src/lib/server/validation/notebook-checkpoints.ts` — schemas Zod serveur (nouveau)

### Worker

- `src/lib/workers/pyodide.worker.ts` — `runAssertBehavior`, route `validate-exercise` vers `getContextNamespace(contextId)` quand fourni

### Stores

- `src/lib/stores/notebookStore.svelte.ts` — création/édition de cellules checkpoint, méthode `runCheckpoint(cellId)`

### Components

- `src/lib/components/notebook/CheckpointCell.svelte` (nouveau)
- `src/lib/components/notebook/NotebookCell.svelte` — route vers `CheckpointCell` si `type === 'checkpoint'`
- `src/lib/components/notebook/CheckpointEditor.svelte` (nouveau, mode teacher)

### API

- `src/routes/api/python-notebooks/[id]/checkpoint-runs/+server.ts` (nouveau)

### Pages

- `src/routes/(protected)/python-notebook/[id]/results/+page.server.ts` (nouveau)
- `src/routes/(protected)/python-notebook/[id]/results/+page.svelte` (nouveau)

---

## Tests prévus

| Couche       | Fichier                                                                  | Cible                           |
| ------------ | ------------------------------------------------------------------------ | ------------------------------- |
| Zod          | `notebook-checkpoints.test.ts`                                           | Schemas runs + cellules         |
| Worker       | `pyodide.worker.checkpoint.test.ts` ou append à `messages.debug.test.ts` | Protocole messages              |
| Pyodide réel | append à `exercise-validation-real.svelte.test.ts`                       | 3 modes en namespace persistant |
| API          | `+server.test.ts` à côté du endpoint                                     | POST/GET + RLS                  |
| Component    | `CheckpointCell.svelte.test.ts`                                          | Rendu badges + click Vérifier   |
| Page         | `results/page.server.test.ts`                                            | Auth + composition data         |

---

## Phase 1 — Livré ✅

**Fichiers créés/modifiés**

- `supabase/migrations/20260603103958_create_notebook_checkpoint_runs.sql` — nouvelle table + 4 RLS policies + 3 indexes
- `src/lib/types/notebook.ts` — `CellType` étendu, `CheckpointMode`, `CheckpointConfig` discriminée, `CheckpointStatus`, `BaseNotebookCell` + `CheckpointCell` → `NotebookCell` union
- `src/lib/shared/python/types.ts` — variant `kind: 'assert'` dans `BehaviorCheck`, `behavior_kind` étendu, `contextId?` sur `ValidateExerciseMessage`
- `src/lib/shared/python/worker/messages.ts` — `behaviorAssertSchema` (cap 5000 chars), ajout dans `behaviorCheckSchema` + `behaviorKindSchema`, réutilise `contextIdSchema` pour `validateExerciseMessageSchema.contextId`
- `src/lib/server/validation/notebook-checkpoints.ts` — `upsertCheckpointRunSchema` + refines cohérence `error_message ↔ status`
- `src/lib/server/validation/notebook-checkpoints.test.ts` — 15 tests
- `src/lib/shared/python/worker/messages.checkpoints.test.ts` — 14 tests

**Tests** : 29/29 verts.

**Code review** : 2 bloquants corrigés (behaviorKindSchema manquait `'assert'` → résultat worker aurait été silencieusement rejeté ; contextId ad-hoc → réutilisation de `contextIdSchema` partagé pour cohérence avec `execute`/`autocomplete`).

**Étapes manuelles à la charge de l'utilisateur** :

1. `pnpm db:migrate` pour appliquer la migration
2. `pnpm db:types` pour régénérer `src/lib/types/database.ts`
3. Ajouter dans `src/lib/types/database-helpers.ts` :
   ```ts
   export type CheckpointRun = Tables<'python_notebook_checkpoint_runs'>;
   ```

**Pour les phases suivantes** : `NotebookCell` est devenu une union discriminée. Les consommateurs suivants devront s'adapter (Phase 4+) :

- `src/lib/stores/notebookStore.svelte.ts` (créateurs L51-68, ajouter `createCheckpointCell`)
- `src/lib/components/notebook/NotebookCell.svelte:74` (router vers `CheckpointCell` quand `type === 'checkpoint'`)
- `src/lib/utils/notebook-import.ts` + `notebook-export.ts` (mapping Jupyter ↔ checkpoint via metadata custom — V1 : pas d'import/export des checkpoints, à confirmer)
- `src/lib/components/notebook/CodeCell.svelte` + `MarkdownCell.svelte` (props typés plus précisément si possible)

**Note dette technique HORS-SCOPE** : un autre type `NotebookCell` shadow existe dans `src/lib/shared/python/execution/types.ts` et `src/lib/shared/python/validation/schemas.ts`. Ne pas le toucher pour V1 mais s'assurer que les imports Phase 4+ ciblent bien `$lib/types/notebook`.

---

## Phase 2 — Livré ✅

**Fichiers modifiés**

- `src/lib/workers/pyodide.worker.ts` :
  - `validateExercise(code, config, id, contextId?)` — nouvelle signature
  - Namespace resolution : borrowed si `contextId`, owned (fresh dict) sinon
  - `isOwnedNamespace` flag → `finally` ne détruit que le namespace owned
  - **Rejets explicites en checkpoint mode** : `output`, `reference_solution`, `ast_requirements` retournent une `validation-exercise-result` avec `error` (V1 sécurise contre la pollution du namespace persistant)
  - Nouveau `runAssertBehavior(code, behavior, namespace, skipCodeExec)` — exec `behavior.code`, capture `AssertionError`, pass/fail
  - `runBehavior(code, behavior, namespace, skipCodeExec)` — propagation flag
  - `runUnitTestBehavior` / `runVariableCheckBehavior` — paramètre `skipCodeExec` pour skipper l'exec student code en checkpoint mode
- `src/lib/shared/python/execution/base-executor.svelte.ts` :
  - `validateExercise(code, config, contextId?)` — nouvelle signature, propage `contextId` au worker
- `src/lib/shared/python/execution/checkpoint-validation-real.svelte.test.ts` (nouveau) :
  - 16 tests Pyodide réel (chromium) : 5 assert (passe, fail, NameError, accumulation cellules, contextId inexistant), 3 variable_check (lecture namespace, var manquante, no-rexec canari), 3 unit_test (call function, function manquante, no-rexec canari), 2 lifecycle namespace (persistance entre validations + execute post-validation), 3 rejets explicites (output, reference_solution, ast_requirements)

**Tests** : 16/16 verts (≈ 4 s sous chromium). 57 tests `exercise-validation-real` existants restent verts → 0 régression.

**Code review** : 2 bloquants corrigés

1. `output` / `reference_solution` corrompaient le namespace persistant (ignorent `skipCodeExec` + injectent stdin/stdout) → rejet explicite avec message en français
2. `ast_requirements` aurait été appliqué au `code` top-level vide → rejet explicite

**Décision documentée** : en mode checkpoint, **seuls** `assert`, `unit_test`, `variable_check` sont supportés (V1 scope confirmé). Toute autre config retourne une `validation-exercise-result` avec `error` clair.

**Dette technique notée pour Phase 4** :

- `NotebookExecutor` n'envoie PAS `create-context` au boot — la persistance du namespace ne marche pas aujourd'hui pour les notebooks. À fixer en Phase 4 : `initPyodide()` → envoyer `create-context` après `pyodide-ready`, `destroy()` → envoyer `destroy-context`.
- Sans cette correction Phase 4, les checkpoints ne pourraient pas fonctionner end-to-end.

---

## Phase 3 — Livré ✅

**Fichiers créés**

- `src/routes/api/python-notebooks/[id]/checkpoint-runs/+server.ts` — POST (upsert) + GET (list, ordonné `ran_at DESC`)
- `src/routes/api/python-notebooks/[id]/checkpoint-runs/server.test.ts` — 17 tests (12 POST + 5 GET)

**Design**

- Auth gate (`user`) + `validateUuidParam` (avant auth pour défense en profondeur)
- POST : Zod (`upsertCheckpointRunSchema`) → UPSERT avec `onConflict: 'notebook_id,user_id,cell_id'`
- GET : SELECT filtré par RLS, ordonné `ran_at` desc
- Mapping erreurs : 401 (anon) / 400 (Zod ou UUID invalide ou JSON invalide) / 403 (`SQLSTATE 42501` RLS) / 500 (autres)
- Type `CheckpointRunRow` inline (V1 — à remplacer par `Tables<'python_notebook_checkpoint_runs'>` dès que `pnpm db:types` aura été exécuté)

**Tests** : 17/17 verts (~ 100 ms). Couvre :

- POST : passed/failed run, anon → 401, UUID invalide, body vide, refines Zod (passed+msg, failed-msg), error_message > 5000 chars, cell_id > 100 chars, JSON invalide, RLS reject → 403, DB error → 500
- GET : runs visibles, liste vide, anon → 401, UUID invalide, DB error → 500

**Code review** : APPROUVÉ avec 3 raffinements appliqués

1. Drop du matching string `'row-level security'` → on garde seulement `code === '42501'` (SQLSTATE stable)
2. GET ajoute `.order('ran_at', { ascending: false })` (évite tri client redondant)
3. 2 tests ajoutés pour les bornes Zod (`cell_id` 101 chars, `error_message` 5001 chars)

**Dette technique notée** :

- `CheckpointRunRow` inline → migrer vers le type généré dès que `database.ts` est régénéré
- Pas d'endpoint DELETE en V1 (pas besoin pour le scope ; à ajouter si le prof doit pouvoir reset un checkpoint élève)

---

## Phase 4 — Livré ✅

**Fix dette technique Phase 2** : `NotebookExecutor` envoie maintenant `create-context` au boot via nouveau hook `BasePythonExecutor.onPyodideReady()`. `destroy()` override envoie `destroy-context` avant `super.destroy()`. Le multi-context worker fonctionne enfin pour les notebooks (état partagé entre cellules effectif).

**Fichiers créés/modifiés**

- `src/lib/shared/python/execution/base-executor.svelte.ts` — hook `onPyodideReady()` (no-op default), appelé après `state = 'ready'`
- `src/lib/shared/python/execution/notebook-executor.svelte.ts` — override `onPyodideReady` (send `create-context`), override `destroy()` (send `destroy-context` puis super)
- `src/lib/stores/notebookStore.svelte.ts` :
  - Helpers : `createCheckpointCell()`, `checkpointConfigToValidationConfig()`, `extractCheckpointError()`
  - État réactif : `checkpointStatus`/`checkpointError`/`checkpointRunning` (records par cell_id)
  - Méthodes : `getCheckpointStatus()`, `loadCheckpointRuns()` (GET au mount), `runCheckpoint()` (executor → POST → update state)
  - `addCell()` étendu pour `type: 'checkpoint'`
  - **Garde re-entrant** dans `runCheckpoint` (anti double-clic) + refus silencieux si Pyodide pas prêt (suite code review)
- `src/lib/types/notebook.ts` — `AddCellOptions` étendu (`checkpoint?`, `title?`)
- `src/lib/components/notebook/CheckpointCell.svelte` (nouveau) — vue élève : header (titre + badge Réussi/Échec/Non vérifié), body 3 modes (assert/unit_test/variable_check), bloc erreur si failed, footer "Vérifier"
- `src/lib/components/notebook/NotebookCell.svelte` — route vers `CheckpointCell` quand `type === 'checkpoint'`
- `src/lib/components/notebook/NotebookView.svelte` — appel `loadCheckpointRuns()` après load notebook
- `src/lib/components/notebook/CheckpointCell.svelte.test.ts` (nouveau) — 15 tests : rendering (5) + status badge (4) + verify button (6)

**Tests** : 15/15 verts (4.99 s sous chromium). Régression vérifiée :

- Tests Phase 1-3 toujours verts (46 tests serveur)
- Tests Pyodide réel toujours verts (73 tests : 57 exercise + 16 checkpoint)

**Code review** : APPROUVÉ AVEC RÉSERVES — 3 corrections appliquées :

1. Re-entrant guard `runCheckpoint` (double-clic Svelte 5 → race POST)
2. Refus silencieux si executor pas ready (au lieu de marquer comme failed avec message technique)
3. `canRun` du composant inclut `!notebook.isExecutingAny` (évite interleaving cellule code + checkpoint)

**UX décisions**

- Le bouton "Vérifier" est read-only intentionnellement : pas de `bind:cell` vers le composant — l'élève ne mute pas la config (la consigne du teacher reste intacte)
- Persistance best-effort : si POST échoue, l'élève voit le verdict, le serveur ne reçoit pas. Acceptable V1.
- Pas de tooltip "Chargement Python..." sur bouton disabled — UX nice-to-have, V1.1 si feedback

**Pour Phase 5/6**

- Test unitaire de store pour `runCheckpoint` (mock fetch) — couvrir double-clic, échec réseau, executor not ready
- Exporter + tester `checkpointConfigToValidationConfig`
- `loadCheckpointRuns` peut écraser un verdict local plus récent : merger plutôt que remplacer si race observée
- Edge case live editing teacher pendant que l'élève a la cellule ouverte → realtime channel ou polling (hors V1)

---

## Phase 5 — Livré ✅

**Fichiers créés/modifiés**

- `src/lib/components/notebook/CheckpointEditor.svelte` (nouveau) — éditeur teacher : titre + sélecteur de mode + form spécifique par mode + preview live (réutilise `CheckpointCell` en readonly)
- `src/lib/components/notebook/NotebookToolbar.svelte` — prop `isTeacher`, prop `onAddCheckpointCell`, entrée DropdownMenu "Checkpoint" si teacher
- `src/lib/components/notebook/NotebookCell.svelte` — prop `isTeacher`, route vers `CheckpointEditor` si `isTeacher && !isReadonly`, sinon `CheckpointCell`
- `src/lib/components/notebook/NotebookView.svelte` — prop `isTeacher`, handler `handleAddCheckpointCell`, propagation `isTeacher` vers toolbar et cells
- `src/routes/(protected)/python-notebook/[id]/+page.svelte` — `isTeacher={data.isOwner && data.userRole === 'teacher'}` passé à `NotebookView`

**Architecture**

- `CheckpointEditor` réutilise `CheckpointCell` en mode readonly pour la preview live → 0 duplication
- 3 modes éditables :
  - **assert** : textarea Python pour les assertions
  - **unit_test** : input function_name + liste de cas (args/expected en JSON drafts, commit on blur)
  - **variable_check** : tableau (name, value JSON) modélisé via `varRows` local pour stable iteration
- Switch de mode reset la config + l'état UI local (`varRows`, `parseErrors`)
- Inputs JSON taggués `border-destructive` + message "JSON invalide" quand parse échoue (au lieu d'écraser silencieusement)

**Sécurité** : `isTeacher` dérivé côté serveur (`+page.server.ts → data.isOwner && data.userRole === 'teacher'`). Defense en profondeur côté UI uniquement ; la RLS DB (Phase 1) bloque toute écriture d'un non-teacher.

**Tests** : 15/15 CheckpointCell tests toujours verts. Pas de tests dédiés `CheckpointEditor` en V1 (couvre 3 modes × JSON drafts × $effect = grosse surface) — à ajouter Phase 6 si bug remonté.

**Code review** : APPROUVÉ AVEC RÉSERVES — 2 bloquants corrigés :

1. **`varRows` fuite entre modes** : reset explicite dans `handleModeChange` (sinon switch variable_check → assert → variable_check réinjecte les vieilles vars)
2. **Silent JSON errors** : ajout d'un état `parseErrors: Record<string, true>` + classe `border-destructive` + message "JSON invalide" sur les 3 inputs JSON (args, expected, var-value)

Bloquant #3 (`isTeacher` spoof via DevTools → autosave 403) reporté à Phase 6 — RLS bloque côté serveur, c'est juste un message d'erreur à durcir.

**Hors-scope V1 (notés)** :

- Confirm dialog avant reset de mode si la config courante est non-vide
- Tests dédiés `CheckpointEditor`
- a11y pass complet (Labels `for=` manquants sur quelques inputs)
