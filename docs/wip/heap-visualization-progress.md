# Visualisation Heap (Python Tutor) — Progression

Plan : `~/.claude/plans/virtual-soaring-fountain.md`

## Statut

| Phase | Description                            | Statut                                                 |
| ----- | -------------------------------------- | ------------------------------------------------------ |
| 0     | Spécification TDD (9 comportements)    | Validé                                                 |
| 1     | Tracer + types + schémas Zod           | **Terminé**                                            |
| 2     | FramesPanel + HeapPanel (sans flèches) | **Terminé**                                            |
| 3     | MemoryDiagramView + flèches SVG        | **Terminé**                                            |
| 4     | Intégration DebugPanel + test manuel   | **Intégration OK, test manuel utilisateur en attente** |
| 5     | Quality checks finaux                  | **Terminé**                                            |

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

## Phase 3 — Réalisé

### `MemoryDiagramView.svelte`

Composant orchestrant le diagramme complet :

- Layout : `<div>` racine `relative + overflow-auto`, grid 2 colonnes (`grid-cols-2 gap-12 p-4`).
- Frames à gauche, Heap à droite (références `framesEl` / `heapEl` via `bind:this`).
- État local `hoveredObjectId` partagé entre les deux panels via callbacks `onVariableHover` / `onObjectHover`.
- SVG overlay `pointer-events-none absolute inset-0 z-10` qui dessine des flèches Bézier cubiques :
  - `data-heap-ref="<id>"` côté frames → `data-heap-id="<id>"` côté heap.
  - Path : `M sx sy C cx1 sy, cx2 ty, tx ty` avec contrôles horizontaux pour des courbes propres.
  - Couleur via `colorForHeapId(objectId).stroke` (palette stable de 8 couleurs).
  - Marker arrowhead générique défini dans `<defs>`, tinté via `currentColor`.
  - Stroke-width 1.5 par défaut, 2.5 quand l'objet est survolé (highlight).
- Recalcul des positions via `requestAnimationFrame` (batchage) déclenché par :
  - `$effect` réactif sur `snapshotKey` (clé dérivée de la forme du callStack + heap) et `hoveredObjectId`.
  - `ResizeObserver` sur le conteneur racine.
  - Listener `scroll` sur le conteneur racine.
- Cleanup explicite : disconnect ResizeObserver + cancelAnimationFrame + removeEventListener au teardown.
- Fallback : message muet quand pas de variable et pas de heap.

### Décisions techniques

- **Pas de flèches internes au heap (entry → entry)** : les références internes sont déjà visibles via les short-id chips (`#a3f2`) dans HeapPanel. Limiter au frame→heap garde le diagramme lisible.
- **`Map` standard pour `heapAnchors`** : strictement local à `computeArrows()`, recréé à chaque appel — pas besoin de `SvelteMap`.
- **Suggestions du svelte-autofixer non appliquées** :
  - `$effect` → `$derived` : non, on a besoin de side-effects (mesurer le DOM après render).
  - `bind:this` → action/attachment : le pattern actuel reste plus lisible.
  - Toutes les "issues" sont vides ; ce sont seulement des suggestions stylistiques.

### Fichiers créés

```
src/lib/components/python/debug/MemoryDiagramView.svelte
```

## Phase 4 — Réalisé (intégration) / En attente (test manuel utilisateur)

### Intégration

`src/lib/components/python/debug/DebugPanel.svelte` :

- `viewMode = $state<'list' | 'table' | 'heap'>('list')`
- 3e bouton dans le toggle avec icône `Network` (lucide), label « Diagramme mémoire ».
- Branche `{:else if viewMode === 'heap'}` : `<MemoryDiagramView {callStack} {heap} />` dans un wrapper `min-h-[400px]`.
- `heap = $derived(debugStore.currentHeap)` exposé depuis le store.

`src/lib/components/python/debug/index.ts` : exporte `FramesPanel`, `HeapPanel`, `MemoryDiagramView`.

### Vérifications automatiques OK

- `pnpm check:incremental` : aucune erreur TS/Svelte dans les fichiers modifiés (les 9 erreurs résiduelles sont préexistantes dans `slides/demo` et `extern/`, filtrées par le script).
- `mcp__svelte__svelte-autofixer` sur `DebugPanel.svelte` : 0 issue, 0 suggestion.
- `pnpm dev -- --port 5175` : page `/python` sert HTTP 200, aucune erreur SSR.

### Test manuel utilisateur (à faire dans le navigateur)

L'environnement de Claude n'a pas de navigateur interactif. Test manuel à exécuter par l'utilisateur :

1. `pnpm dev -- --port 5173` (ou similaire utilisateur)
2. Aller sur `/python`
3. Activer le mode debug (toggle DebugToolbar)
4. Coller chacun des 9 cas de test et stepper :

```python
# Cas 1 — primitives seules : heap doit être vide
a = 1
b = "x"
c = None

# Cas 2 — container simple : 1 carte heap
a = [1, 2, 3]

# Cas 3 — alias (objectif principal) : 1 carte, 2 flèches même couleur
a = [1, 2, 3]
b = a
b.append(4)

# Cas 4 — imbrication : 3 cartes (liste externe + 2 internes)
a = [[1, 2], [3, 4]]

# Cas 5 — dict avec valeur container : 2 cartes
d = {"k": [1]}

# Cas 6 — cycle : 1 carte avec ref vers elle-même, pas d'infinite loop
a = []
a.append(a)

# Cas 7 — instance : 2 cartes (instance:Pt + liste)
class Pt:
    def __init__(s, x): s.x = x
p = Pt([1, 2])

# Cas 8 — tuple : 2 cartes (tuple + liste interne)
t = (1, [2, 3])

# Cas 9 — profondeur > 5 : entries au fond marquées '…' mais objet reste accessible
deep = [[[[[[1, 2]]]]]]
```

5. Basculer vue « Diagramme mémoire »
6. Vérifier :
   - Cas 3 : flèches `a` et `b` même couleur, même cible.
   - Cas 6 : carte `#xxxx` avec entrée `[0] → #xxxx` (même id).
   - Hover sur une variable : la carte cible et la flèche sont highlightées.
   - Hover sur une carte : les flèches y arrivant sont épaissies.
   - Resize de la fenêtre : les flèches se recalculent.
   - Step backward / forward : le diagramme suit l'historique.

Reporter tout problème détecté.

## Phase 5 — Réalisé

### Quality checks

- `npx eslint <14 fichiers modifiés>` : 0 erreur, 1 warning (faux-positif `prefer-svelte-reactivity` sur Map locale dans MemoryDiagramView, recréée à chaque appel — pas besoin de SvelteMap).
- `pnpm check:incremental` : 0 erreur dans les fichiers touchés (les 9 erreurs résiduelles préexistantes sont dans `slides/demo/` et `extern/`, filtrées par le script).
- `mcp__svelte__svelte-autofixer` lancé sur les 4 composants .svelte créés/modifiés : 0 issue. Toutes les suggestions restantes sont des faux-positifs (effects légitimes pour mesurer le DOM, etc.).
- `pnpm test:server` sur les 3 fichiers de tests heap : 137 tests passent (43 types + 70 schemas + 24 utils).
- Page `/python` sert HTTP 200 sans erreur SSR.

### Documentation

- `docs/ref/python/progress/python-debugger-progress.md` : Phase 6 marquée Terminée, résumé complet ajouté en bas du document.

## Documents produits (à la fin du plan)

- `~/.claude/plans/virtual-soaring-fountain.md` — plan original (5 phases + spécification TDD).
- `docs/wip/heap-visualization-progress.md` — ce document de progression (recovery-friendly, mis à jour à chaque phase).
- `docs/ref/python/progress/python-debugger-progress.md` — section Phase 6 ajoutée pour pérenniser la livraison dans la doc de référence.

## Statut final

Implémentation complète des 5 phases. Tests serveur passent. Reste : test manuel utilisateur sur les 9 cas TDD listés en Phase 4 ci-dessus (alias, cycle, instance, imbrication, etc.) — l'environnement Claude n'a pas de navigateur interactif.
