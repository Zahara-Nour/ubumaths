# Python Exercises — Étape 2a : Isolation namespace pour `validate-exercise`

## Statut : ✅ TERMINÉ — vérification manuelle requise après déploiement

Étape 2a du plan d'intégration du système d'exercices Python : isoler l'exécution de la validation dans un namespace Python frais, indépendant du namespace principal du playground et des autres validations.

## Bug corrigé

Avant ce fix, les 3 stratégies de validation (`output`, `unit_test`, `ast` avec `output_tests`) utilisaient `pyodide.runPythonAsync(code)` **sans argument `globals`**, donc elles écrivaient et lisaient dans le **namespace principal de Pyodide** — le même que celui du playground (`contextId === undefined`).

Conséquences avant fix :

- Élève exécute `def factorielle(n): ...` dans le playground
- Élève soumet un exo avec un AST requirement `defines_function: factorielle` mais **oublie** la fonction dans son code
- AST detection fait `'factorielle' in dir()` qui trouve la fonction du playground → **faux positif**
- Symétrique : `_ubumaths_test_args`, `_ubumaths_test_stdin`, `_actual` etc. restaient dans les globals après validation → fuites visibles depuis le playground

## Solution

### Approche

Création d'un dictionnaire Python frais (`pyodide.runPython('dict()')`) au début de `validateExercise`, passé en paramètre `namespace: PyProxy` aux 3 sous-fonctions, utilisé via l'option `{ globals: namespace }` de `runPythonAsync(code, options)`. Le PyProxy est `destroy()` en `finally`.

### Pourquoi un dict par appel et non un context Pyodide réutilisé

- **Pas de cross-pollution entre validations consécutives** : un élève qui valide un exo A puis un exo B repart de zéro
- **Pas de gestion de cycle de vie séparée** (pas de `createContext`/`destroyContext` dédiés)
- Coût négligeable (allocation d'un dict Python vide, ~µs)

### Pourquoi pas un `executionContext`

Le système de contextes existant (`createContext`/`getContextNamespace`) est conçu pour des espaces **persistants** (notebooks). Une validation est éphémère par nature.

## Fichiers modifiés

### `src/lib/shared/python/types.ts`

Le type `PyodideInterface.runPython`/`runPythonAsync` accepte désormais le paramètre `options?: { globals?, locals?, filename? }` (Pyodide v0.26 supporte cette signature mais le typing du projet ne l'exposait pas).

### `src/lib/workers/pyodide.worker.ts`

- `validateExercise()` crée le namespace au début et le détruit en `finally`
- `validateOutputComparison(code, config, namespace)` : tous les `runPythonAsync` reçoivent `{ globals: namespace }` ; sys.stdin/stdout swap reste global (state Python module-level), restauré sur tous les chemins (succès et erreur)
- `validateUnitTests(code, config, namespace)` : code élève + lookup de fonction + appel de test → tous dans `namespace`. Test args/expected injectés via `namespace.set(...)` au lieu de `pyodide.globals.set(...)`
- `validateAST(code, config, namespace)` : variables AST (`_ubumaths_ast_*`) injectées dans `namespace`. Quand `output_tests` est présent, le namespace est **réutilisé** pour la validation output → cohérence

## Garanties d'isolation

| Sens                                           | Avant fix                           | Après fix                |
| ---------------------------------------------- | ----------------------------------- | ------------------------ |
| Playground → Validation                        | Pollution (faux positifs possibles) | Isolation totale         |
| Validation → Playground                        | Fuites (`_ubumaths_*`, `_actual`)   | Isolation totale         |
| Validation N → Validation N+1                  | Fuites entre validations            | Isolation totale         |
| sys.stdin / sys.stdout (state global de `sys`) | Swap durant la validation           | Inchangé (swap restauré) |

## Vérifications

| Check                                           | Résultat                    |
| ----------------------------------------------- | --------------------------- |
| `pnpm test:client base-executor.svelte.test.ts` | 14/14 ✓ (pas de régression) |
| `pnpm test:server pyodide.worker.debug.test.ts` | 41/41 ✓ (pas de régression) |
| `npx svelte-check` sur fichiers modifiés        | 0 erreur                    |
| `npx eslint` sur fichiers modifiés              | 0 erreur, 0 warning         |

### Limite : pas de tests d'intégration Pyodide

Le projet n'a aucun test qui exécute Pyodide réellement (cf. `pyodide.worker.debug.test.ts` lignes 12-44 : les tests sont des spécifications, pas des exécutions). La couverture E2E est documentée comme TODO Playwright.

**Vérification manuelle requise après merge** (`pnpm dev -- --port 5175`) :

#### Test A — pas de pollution Playground → Validation (`unit_test`)

1. Au playground : exécuter `def factorielle(n): return 1 if n <= 0 else n * factorielle(n-1)`
2. Soumettre un exercice avec `validation_config = { type: 'unit_test', function_name: 'factorielle', test_cases: [{ args: [5], expected: 120 }] }` et **du code élève vide** (juste `pass` ou rien)
3. **Attendu** : `valid: false`, `error: "La fonction 'factorielle' n'est pas definie"` (avant fix : `valid: true` car la factorielle du playground était utilisée)

#### Test B — pas de fuite Validation → Playground

1. Au playground : exécuter `print('avant')`
2. Soumettre un exercice avec un code élève qui définit `_ubumaths_test_stdin = 'pollué'` et `result = 999`
3. Au playground (sans recharger) : exécuter `print(_ubumaths_test_stdin if '_ubumaths_test_stdin' in dir() else 'OK')`
4. **Attendu** : `OK` (la variable n'existe pas) (avant fix : `pollué`)

#### Test C — pas de fuite entre validations consécutives

1. Validation 1 : code élève qui définit `def f(): return 1`, exo `unit_test` cherchant `f` → passe
2. Validation 2 : code élève vide, exo `unit_test` cherchant `f` → doit échouer
3. **Attendu** : Validation 2 échoue (avant fix : passait à cause de la fuite de Validation 1)

#### Test D — comportement nominal toujours fonctionnel

Tester chaque stratégie sur un cas qui doit passer :

- `output` : code `print("hello")`, exo `output_tests=[{ input: '', expected_output: 'hello\n' }]` → `valid: true`
- `unit_test` : code `def add(a,b): return a+b`, exo `unit_test` `function_name: 'add'`, `test_cases=[{args:[1,2], expected:3}]` → `valid: true`
- `ast` : code `for i in range(3): print(i)`, exo `ast` `requirements=[{type:'uses_loop', message:'...'}]` → `valid: true`

## Prochaines étapes (du plan d'origine)

3. **Tests des 3 stratégies de validation** côté worker — désormais avec garantie d'isolation, on peut écrire des tests E2E Playwright (TODO indépendant)
4. **UI élève** `/python-exercises/[id]`
5. **UI enseignant** : création / liste / dashboard résultats

## Commit

`fix(python/exercises): isolate validation namespace from playground` — refactor `validateExercise` + 3 sous-fonctions, extension du type `PyodideInterface`, pas de changement d'API publique côté `BasePythonExecutor.validateExercise()`.
