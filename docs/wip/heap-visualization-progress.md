# Visualisation Heap (Python Tutor) — Progression

Plan : `~/.claude/plans/virtual-soaring-fountain.md`

## Statut

| Phase | Description                            | Statut      |
| ----- | -------------------------------------- | ----------- |
| 0     | Spécification TDD (9 comportements)    | Validé      |
| 1     | Tracer + types + schémas Zod           | **Terminé** |
| 2     | FramesPanel + HeapPanel (sans flèches) | **Terminé** |
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

## Phase 2 — Réalisé

### Helpers (`heap-utils.ts`)

Module utilitaire partagé par les deux panneaux et le futur MemoryDiagramView :

- `parseVariableValue(raw)` : parse le JSON d'un `DebugVariable.value`, retourne `InlineValue | HeapRef | TruncatedValue | null`.
- `isHeapRef`, `isTruncated`, `isEntryRef` : type guards.
- `shortHeapId(id)` : suffixe base36 4-chars (bits de poids faible) → identifiants visuels stables et distincts pour ids voisins (`#a3f2`).
- `colorForHeapId(id)` : couleur stable Tailwind dans une palette de 8 (stroke + bg + text + dark variants), même couleur partout pour un même objet.
- `formatInline(value)` : rendu compact pour primitive ou troncature.
- `heapTypeLabel(obj)` : `"list[3]"`, `"dict[2]"`, `"Point"` (pour `instance:Point`).

### `FramesPanel.svelte`

- Accordéon par frame (auto-ouvert via `$effect` synchronisé sur `callStack`).
- Pour chaque variable : si `parseVariableValue` retourne un `HeapRef`, rendu en `<button>` avec `data-heap-ref="<objectId>"` (point d'ancrage pour les flèches SVG en Phase 3) ; sinon `<div>` simple avec valeur inline.
- Hover/focus → callback `onVariableHover` pour highlight cross-panel.
- Re-utilise le code couleur (vert nouveau, jaune modifié) de `VariablesPanel.svelte`.
- A11y : `aria-label` complet pour chaque variable, `<button type="button">` pour interactivité keyboard-friendly (correction issue `noninteractive_tabindex` détectée par svelte-autofixer).

### `HeapPanel.svelte`

- Une carte `<div data-heap-id="<id>">` par objet heap, couleur de fond depuis `colorForHeapId`.
- Header : type label (`heapTypeLabel`) + short id (`shortHeapId`).
- Entries selon type :
  - `list`/`tuple` : `[0]`, `[1]`, ...
  - `set`/`frozenset` : `•`
  - `dict`/`instance:*` : clé/attribut
- Si entry est un `HeapRef` → bullet coloré + short id (visualisation des refs internes au heap).
- Si entry est inline → valeur formatée.
- Hover → callback `onObjectHover`.

### Tests

- `heap-utils.test.ts` : 24 tests serveur passent. Couverture : parsing, type guards, hash stable, palette couleurs, formatage.
- Pas de tests `*.svelte.test.ts` créés : l'env Vitest browser est cassé localement (Playwright manquant). Validation visuelle reportée à Phase 4 (test manuel).

### Fichiers créés

```
src/lib/components/python/debug/heap-utils.ts
src/lib/components/python/debug/heap-utils.test.ts
src/lib/components/python/debug/FramesPanel.svelte
src/lib/components/python/debug/HeapPanel.svelte
```

## Phase 3 — Prochaine étape

Créer `MemoryDiagramView.svelte` qui assemble FramesPanel à gauche et HeapPanel à droite avec un overlay SVG calculant les flèches Bézier entre `data-heap-ref` (frames) et `data-heap-id` (heap). État hover propagé entre les deux panneaux via la nouvelle vue.
