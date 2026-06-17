# Python exercises — Stratégie `reference_solution` — Final state

> 5ème stratégie de validation : test différentiel contre une solution
> teacher cachée. Combine cas fixes (sentinelles à la `unit_test`) et
> générateur d'entrées aléatoires reproductibles.

## Décisions de design (validées avec l'utilisateur)

- **Cas fixes** : `expected` hardcodé par le teacher, **toutes les erreurs remontées** (cohérent avec `unit_test`).
- **Generator** : `expected = reference(*args)`, **stop au 1er échec** (Hypothesis-style, focus sur le contre-exemple).
- **Au moins un des deux** (`fixed` ou `generator`) requis, enforcé par Zod refine au niveau du discriminatedUnion.
- **Reproductibilité** : `seed` requis dans la config generator ; chaque cas utilise `seed + i`.
- **deepcopy obligatoire** des args avant chaque appel pour ne pas que la reference et le student se contaminent mutuellement.
- **Generator code via `def _gen_inputs(): return <code>`** injectée puis appelée (Q3).
- **Label MySelect** : « Solution de référence ».

## Schéma de config

```typescript
{
  kind: 'reference_solution';
  function_name: string;             // identifier Python
  reference_code: string;            // ≤ 5000 chars
  fixed?: { cases: { args, expected, hidden? }[] };  // ≤ 50 cases
  generator?: {
    code: string;                    // ≤ 1000 chars, expression Python → tuple
    count: number;                   // 1-200
    seed: number;                    // entier
  };
  tolerance?: { eps_abs, eps_rel };
}
```

## Phases livrées

| Phase | Description                                                  | Tests  |
| ----- | ------------------------------------------------------------ | ------ |
| A     | Types + Zod schemas (mirror types.ts ↔ python-exercises.ts) | 13 Zod |
| B     | Worker `runReferenceSolutionBehavior` + tests Pyodide réels  | 13     |
| C     | UI éditeur (panel à 3 sections, toggles fixed/generator)     | —      |
| D     | UI résultat (`failureSubline` étendu)                        | —      |
| E     | Code review + quality checks + commit                        | ✅     |

**Total : 26 tests nouveaux** (13 Zod + 13 client Pyodide).

- Tests serveur : 43 total (30 préexistants + 13 nouveaux pour `reference_solution`).
- Tests client : 57 total (44 préexistants dont 13 `variable_check` + 13 nouveaux `reference_solution`).

## Quality

- `pnpm check:incremental` : 9 errors / 46 warnings (baseline préexistante, inchangée).
- `npx eslint` sur tous les fichiers modifiés : 0 issue.
- `mcp__svelte__svelte-autofixer` sur les fichiers `.svelte` modifiés : 0 issue.

## Findings du code-reviewer adressés

**BLOCKERS** :

- **B1 — `_ubumaths_gen_inputs` leak** : la fonction injectée par `def` survivait dans le namespace student avec un closure sur `_ubumaths_ref_func`. Ajouté à la liste de `cleanupGenCaseScratch` (per-case + catch). Worker `pyodide.worker.ts:~3050`.
- **B2 — conséquence de B1** : résolu par le fix B1.
- **B3 — `fnName` interpolé sans sanitization** : le Zod regex `^[a-zA-Z_][a-zA-Z0-9_]*$` est appliqué côté schemas (worker + serveur). Non exploitable étant donné la sandbox Pyodide.

**IMPORTANT** :

- **I1 — PyProxy lifetime** : confirmé safe. `refNs.destroy()` ne tue pas l'objet Python ; le namespace student garde une référence via `_ubumaths_ref_func` jusqu'au cleanup.
- **I2 — cleanup per-case vs finally** : design correct, juste manquait `_ubumaths_gen_inputs` (B1).
- **I3 — generator code peut observer `_ubumaths_ref_func`** : teacher footgun, pas un risque student. Le code reviewer suggère de documenter dans le placeholder ; non adressé en l'état.
- **I4 — `toJs()` sans `dict_converter`** : pré-existant pattern, fonctionne en pratique avec Pyodide récents ; non adressé.
- **I5 — synthetic OK row double-compte si fixed + generator** : émis maintenant uniquement quand `!behavior.fixed` (cf. commentaire dans worker).

**NITS** :

- **N1 — typo "definie" → "définie"** dans message d'erreur student-facing : fixé.
- **N3 — toggle UX rough edge** : drafts préservés mais désynchronisés du config sur re-toggle. Non bloquant (Zod côté serveur catche), non adressé.
- N2, N4, N5 : cosmétiques, non adressés.

## Fichiers créés / modifiés

**Nouveau** : `docs/wip/python-reference-solution-progress.md` (ce fichier).

**Modifiés** :

- `src/lib/shared/python/types.ts` — variant `reference_solution` dans `BehaviorCheck`.
- `src/lib/types/python-exercises.ts` — mirror.
- `src/lib/shared/python/worker/messages.ts` — Zod schemas. **Note** : `behaviorCheckSchema` est devenu `discriminatedUnion(...).refine(...)` parce que `discriminatedUnion` n'accepte pas de sub-schemas refinés.
- `src/lib/server/validation/python-exercises.ts` — mirror server schemas.
- `src/lib/server/validation/python-exercises.test.ts` — 13 nouveaux tests Zod (+ 1 result schema).
- `src/lib/workers/pyodide.worker.ts` — `runReferenceSolutionBehavior`, `runOneFixedRefCase`, `runOneGeneratorRefCase`, `cleanupGenCaseScratch`.
- `src/lib/components/python/exercises/ExerciseStrategyEditor.svelte` — 4ème choix MySelect, panel à 3 sections.
- `src/lib/components/python/exercises/ExerciseValidationResult.svelte` — `failureSubline` étendu.
- `src/lib/shared/python/execution/exercise-validation-real.svelte.test.ts` — 13 tests Pyodide réels placés avant le matrix `describe` (case 8 infinite-loop bloque le worker).

## Gotchas

- **Pyodide `dict_converter` est récursif** sur les versions actuelles (validé par les tests `variable_check` antérieurs). Les `toJs()` sans `dict_converter` dans la nouvelle feature peuvent retourner des `Map` pour les dicts ; les `phaseA.toJs()` / `phaseB.toJs()` actuels ne touchent que des dicts à clés string + valeurs simples, donc OK en pratique.
- **PyProxy entre namespaces** : passer une fonction Python entre `refNs` et `namespace` via `refNs.get(fnName)` + `namespace.set('_ubumaths_ref_func', refFunc)` est safe — le namespace student maintient le refcount tant qu'il n'a pas `.delete()` la clé.
- **Helpers persistants vs scratch** : `_ubumaths_compare`, `_ubumaths_to_py`, `_ubumaths_copy`, `_ubumaths_random` sont injectés une fois et restent dans le namespace student jusqu'à la fin de `runReferenceSolutionBehavior`. Les variables scratch par cas (`_ubumaths_seed_value`, `_ubumaths_args`, etc., incluant `_ubumaths_gen_inputs`) sont supprimées entre chaque cas via `cleanupGenCaseScratch`.

## Cas d'usage typiques

- Algos de tri / recherche (médiane, dichotomie, tri par insertion).
- Math discret (PGCD, factorielle, premier, divisibilité).
- Manipulation de listes/strings (palindrome, anagramme, comptage).
- Tout exercice où la spec se définit naturellement par « ton code doit faire la même chose que ma solution pour toute entrée valide ».

**Pas adapté** :

- Exos avec graphique matplotlib.
- Exos d'I/O (stdin/stdout/fichier).
- Exos OOP avec état partagé.
