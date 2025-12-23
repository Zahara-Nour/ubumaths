# Python Debugger - Progression

## Statut actuel

**Phase** : 2 - Python Tracer (Worker) - Terminee
**Derniere mise a jour** : 2024-12-23

## Phases

| Phase  | Description                      | Statut     |
| ------ | -------------------------------- | ---------- |
| 1      | Types et Messages                | Termine    |
| 2      | Python Tracer (Worker)           | Termine    |
| 3      | Store et Executor                | En attente |
| 4      | Composants UI                    | En attente |
| 5      | Integration                      | En attente |
| 6      | Visualisation Heap (Optionnelle) | En attente |
| Finale | Quality Checks                   | En attente |

---

## Phase 1 : Types et Messages

### Fichiers crees

- [x] `src/lib/shared/python/debug/types.ts`
- [x] `src/lib/shared/python/debug/types.test.ts` (30 tests)
- [x] `messages.ts` modifie avec schemas debug
- [x] `messages.debug.test.ts` (53 tests)

### Decisions prises

- Types bases sur le plan approuve
- Schemas Zod suivent le pattern existant dans messages.ts
- DebugVariable avec serialisation JSON pour valeurs complexes

---

## Phase 2 : Python Tracer (Worker)

### Fichiers modifies/crees

- [x] `src/lib/workers/pyodide.worker.ts` - Tracer Python avec generateur
- [x] `src/lib/shared/python/types.ts` - Types messages debug (DebugSnapshotMessage, etc.)
- [x] `src/lib/workers/pyodide.worker.debug.test.ts` (41 tests)
- [x] `docs/wip/debug-tracer-testing-guide.md` - Guide de test

### Decisions prises

- **Approche generateur** au lieu de sys.settrace() :
  - sys.settrace() ne peut pas vraiment pauser l'execution
  - Le generateur `yield` avant chaque statement pause reellement Python
  - `generator.send(action)` reprend avec l'action choisie

- Serialisation des valeurs avec limites :
  - MAX_SERIALIZE_DEPTH = 5
  - MAX_SERIALIZE_ITEMS = 50
  - MAX_STRING_LENGTH = 200
  - Detection des references circulaires

- Execution statement-par-statement via AST :
  - Parse avec `ast.parse()`
  - Gere for, while, if, try/except, with
  - Tracking des iterations de boucle
  - Capture stdout pendant l'execution

### Tests

- 124 tests passent (30 + 53 + 41)
- Tests unitaires pour convertMapToObject
- Specification tests documentent le comportement attendu
- Tests E2E a ajouter en Phase 5

---

## Notes de reprise

En cas de crash, reprendre a partir de :

- Verifier quels fichiers ont ete crees
- Continuer la phase en cours
- Consulter ce document pour l'etat actuel

Phase suivante : Phase 3 - Store et Executor
