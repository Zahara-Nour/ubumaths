# Visualisation Heap (Python Tutor) — Progression

Plan : `~/.claude/plans/virtual-soaring-fountain.md`

## Statut

| Phase | Description                            | Statut      |
| ----- | -------------------------------------- | ----------- |
| 0     | Spécification TDD (9 comportements)    | Validé      |
| 1     | Tracer + types + schémas Zod           | **Terminé** |
| 2     | FramesPanel + HeapPanel (sans flèches) | À faire     |
| 3     | MemoryDiagramView + flèches SVG        | À faire     |
| 4     | Intégration DebugPanel + test manuel   | À faire     |
| 5     | Quality checks finaux                  | À faire     |

## Phase 0 — Spécifications validées

Style : Python Tutor (Frames à gauche / Heap à droite / flèches SVG).
Périmètre heap : containers (`list`, `dict`, `set`, `tuple`, `frozenset`) + instances de classes utilisateur. Primitives inline.

9 comportements TDD :

1. Heap vide pour primitives seules
2. Container simple → 1 entrée heap
3. Alias détecté (`b = a`) → 1 entrée, 2 vars même `objectId`
4. Imbrication `[[1,2],[3,4]]` → 3 entrées, refs imbriquées
5. Dict avec valeur container → 2 entrées
6. Cycle `a.append(a)` → 1 entrée, ref vers soi-même, pas d'infinite loop
7. Instance de classe utilisateur → type `instance:ClassName`
8. Tuple → heap object (peut contenir des refs)
9. Profondeur > 5 → entries `{type:'truncated', value:'depth'}`, l'objet reste référençable

Décisions complémentaires :

- Sets/frozensets triés par `repr` pour stabilité visuelle entre snapshots.
- Type `truncated` explicite (`{type:'truncated', value:'depth'|'items'}`) plutôt que magic strings.
- `objectId` = `str(id(value))` partout (cohérent avec l'existant).

## Phase 1 — Réalisé

### Types (`src/lib/shared/python/debug/types.ts`)

Remplacement complet de la section "Heap Visualization" :

- `InlineValue { type: 'int'|'float'|'str'|'bool'|'NoneType'|'complex'|'bytes', value: string }`
- `HeapRef { type: 'ref', objectId: string }`
- `TruncatedValue { type: 'truncated', value: string }`
- `HeapEntry { key?: string, value: InlineValue|HeapRef|TruncatedValue }`
- `HeapObjectType = 'list'|'dict'|'set'|'tuple'|'frozenset'|\`instance:${string}\``
- `HeapObject { id, type, length, entries }`

`DebugSnapshot` reçoit le champ `heap: HeapObject[]` (requis, vide si aucun objet heap).

Anciennes interfaces `DebugVisualization` / `VisualizationStackFrame` retirées (inutilisées).

### Schémas Zod (`src/lib/shared/python/worker/messages.ts`)

Nouvelles sections "Heap schemas" :

- `inlineValueSchema`, `heapRefSchema`, `truncatedValueSchema`
- `heapEntrySchema` (union sur les 3 ci-dessus)
- `heapObjectSchema` avec regex sur le champ `type`
- Extension de `debugSnapshotSchema` avec `heap: z.array(heapObjectSchema).max(2000)`

### Tracer Python (`src/lib/workers/pyodide.worker.ts`)

`_ubumaths_serialize_value` → remplacée par `_ubumaths_serialize_with_heap(value, heap, depth)` :

- Primitives inline (NoneType, bool, int, float, complex, str, bytes)
- Containers + instances utilisateur → ajoutés à `heap` dict, retournent un `HeapRef`
- Pre-insertion d'un placeholder dans `heap` AVANT récursion → cycles gérés naturellement
- Sets/frozensets triés par `repr`
- Profondeur dépassée → `{type:'truncated', value:'depth'}`
- Items > 50 → `{type:'truncated', value:'items'}`
- Helpers : `_ubumaths_truncate_key`, `_ubumaths_is_user_instance`
- Détection instance : `__dict__` ET pas dans `(type, ModuleType, FunctionType, MethodType, BuiltinFunctionType, BuiltinMethodType)`

`_ubumaths_get_variables(namespace, prev_namespace, heap)` accepte un heap dict externe pour partager l'état entre frames.

`create_snapshot` initialise un `heap = {}` au niveau snapshot, le passe à toutes les sérialisations, l'inclut dans le snapshot final via `'heap': list(heap.values())`.

3 sites de construction de snapshot mis à jour :

1. `create_snapshot()` (snapshot principal)
2. Yield exception en cours d'exécution
3. Yield SyntaxError (heap vide)

### Store (`src/lib/stores/pythonDebug.svelte.ts`)

Ajout d'un `currentHeap = $derived(this.currentSnapshot?.heap ?? [])` pour confort en Phase 2/3.

### Tests

- `types.test.ts` : 43 tests (anciens + nouveaux pour InlineValue, HeapRef, TruncatedValue, HeapEntry, HeapObject, DebugSnapshot.heap incluant cas alias)
- `messages.debug.test.ts` : 70 tests (anciens + nouveaux pour les 5 schémas heap, debugSnapshotSchema avec/sans heap)
- `pythonDebug.svelte.test.ts` : helper `createSnapshot` et 6 fixtures inline mises à jour avec `heap: []`

113 tests serveur passent.

### Tests non couverts

Le tracer Python embarqué dans pyodide.worker.ts ne peut pas être testé sans Pyodide (cf. en-tête de `pyodide.worker.debug.test.ts` qui le confirme). Validation par test manuel en Phase 4 sur les 9 comportements.

### Fichiers modifiés

```
src/lib/shared/python/debug/types.ts
src/lib/shared/python/debug/types.test.ts
src/lib/shared/python/worker/messages.ts
src/lib/shared/python/worker/messages.debug.test.ts
src/lib/workers/pyodide.worker.ts
src/lib/stores/pythonDebug.svelte.ts
src/lib/stores/pythonDebug.svelte.test.ts
```

## Phase 2 — Prochaine étape

Créer `FramesPanel.svelte` et `HeapPanel.svelte` côte à côte (sans flèches). Tests Vitest browser. Utiliser le snapshot fourni par `debugStore.currentSnapshot` + `debugStore.currentHeap`.
