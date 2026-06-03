# Notebook Checkpoints — Progress

Feature : cellules de validation (`checkpoint`) dans les notebooks Python, avec 3 modes (`assert`, `unit_test`, `variable_check`), persistance des runs par élève, et dashboard prof.

> Décision produit + design dans le thread de conversation. Périmètre V1 confirmé par l'utilisateur.

---

## Statut global

| Phase | Description                                        | Statut     | Commit    |
| ----- | -------------------------------------------------- | ---------- | --------- |
| 1     | Migration DB + types TS + Zod schemas              | ✅ Livrée  | _pending_ |
| 2     | Worker : nouveau mode `assert` + `contextId`       | ⏳ À faire | —         |
| 3     | Endpoints POST + GET checkpoint-runs               | ⏳ À faire | —         |
| 4     | Composant `CheckpointCell.svelte` (vue élève)      | ⏳ À faire | —         |
| 5     | UI teacher : éditeur de checkpoint dans notebook   | ⏳ À faire | —         |
| 6     | Dashboard prof `/python-notebook/[id]/results`     | ⏳ À faire | —         |
| 7     | Doc + autofixer + check:incremental + commit final | ⏳ À faire | —         |

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
