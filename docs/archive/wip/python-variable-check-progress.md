# Python exercises — Stratégie `variable_check` — Final state

> 4ème stratégie de validation pour les exercices Python : lire les variables du namespace après exécution du code de l'élève, sans imposer `print(...)`.

## Décisions de design (validées avec l'utilisateur)

- **Pas de stdin, pas de `setup_vars`, pas de `test_cases` multiples** — minimaliste. Si le teacher a besoin d'I/O ou de paramètres, il utilise `output` ou `unit_test`.
- **Types stricts pour les scalaires** : `True ≠ 1`, `"5" ≠ 5`. Tolérance numérique entre int/float (`eps_abs=1e-9`, `eps_rel=1e-6` par défaut).
- **Tuple ≡ list** (limitation pratique : JSON ne distingue pas). Cohérent avec `unit_test`.
- **Sets non supportés côté teacher** : si l'élève produit un set, message d'erreur clair (`Type différent : attendu list, obtenu set`).
- **Toutes les erreurs remontées** : un `TestCaseResult` par variable.
- **Libellé MySelect** : « Valeurs de variables ».

## Phases livrées

| Phase | Description                                                                                                            | Tests                                 |
| ----- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| 1     | `variable-compare.ts` — comparateur JS pur récursif                                                                    | 42 unit                               |
| 2     | Types & schémas Zod (`types.ts`, `python-exercises.ts`, `worker/messages.ts`, `server/validation/python-exercises.ts`) | 9 nouveaux Zod + 1 result schema = 10 |
| 3     | Worker `runVariableCheckBehavior()` dans `pyodide.worker.ts`                                                           | —                                     |
| 4     | UI éditeur (`ExerciseStrategyEditor.svelte`) — 3ème choix MySelect, drafts JSON, validation nom Python                 | —                                     |
| 5     | UI résultat (`ExerciseValidationResult.svelte`) — labels conditionnels « Variable {n} » / « Variable »                 | —                                     |
| 6     | Tests d'intégration Pyodide réel (`exercise-validation-real.svelte.test.ts`)                                           | 13                                    |
| 7     | Code review + quality checks + commit                                                                                  | ✅                                    |

**Total : 117 tests passants** (72 serveur + 45 client Pyodide réel).

## Quality

- `pnpm check:incremental` : 9 errors / 46 warnings (= baseline préexistante, inchangée).
- `npx eslint` sur tous les fichiers modifiés : 0 issue.
- `mcp__svelte__svelte-autofixer` sur les fichiers `.svelte` modifiés : 0 issue.

## Findings du code-reviewer adressés

- **#1 Namespace leak** (`_ubumaths_name`, `_ubumaths_lookup_result`) : ajouté `namespace.delete(...)` après la lookup et dans le `catch`, même pattern que l'AST checker.
- **#2 Nested dicts via `toJs({ dict_converter })`** : ajout d'un test qui prouve que la recursion fonctionne sur la version actuelle de Pyodide → pas de fix nécessaire (faux positif).
- **#3 `eval(name)` + builtins Python** : 2 tests ajoutés. `'list' in dir()` retourne `False` à top-level d'un namespace frais — donc une variable non-définie nommée comme un builtin est correctement détectée comme manquante, et une affectation par l'élève prime (LEGB rule).
- **#11 Test variable nommée comme builtin** : couverture ajoutée.

Findings nits / cosmétiques (#4, 5, 6, 7, 8, 9, 10) : non adressés (acceptables en l'état, risque/coût > bénéfice à court terme).

## Fichiers créés / modifiés

**Nouveaux** :

- `src/lib/shared/python/validation/variable-compare.ts`
- `src/lib/shared/python/validation/variable-compare.test.ts`
- `docs/wip/python-variable-check-progress.md` (ce fichier)

**Modifiés** :

- `src/lib/shared/python/types.ts`
- `src/lib/types/python-exercises.ts`
- `src/lib/shared/python/worker/messages.ts`
- `src/lib/server/validation/python-exercises.ts`
- `src/lib/server/validation/python-exercises.test.ts`
- `src/lib/workers/pyodide.worker.ts`
- `src/lib/components/python/exercises/ExerciseStrategyEditor.svelte`
- `src/lib/components/python/exercises/ExerciseValidationResult.svelte`
- `src/lib/shared/python/execution/exercise-validation-real.svelte.test.ts`

## Gotcha à retenir pour les tests Pyodide

Le `describe('variable_check behavior', ...)` est placé **AVANT** `describe('AST + behavior pipeline matrix', ...)` car le `case 8` (infinite-loop student code) du matrix laisse le worker Pyodide définitivement bloqué — tous les `validate-exercise` qui suivent timeout client-side à 10s. Tout nouveau bloc behavior à venir doit être inséré au-dessus de cette frontière.

## Notes secondaires

- Pyodide convertit `None` (Python) → `undefined` (JS) au passage du PyProxy. Le worker normalise `undefined` → `null` quand `exists === true` (ligne ~2755 de `pyodide.worker.ts`) pour s'aligner sur le JSON teacher (`null` = `None`).
- Pas de migration DB requise : `validation_config` est stocké en JSON dans `python_exercises`.
