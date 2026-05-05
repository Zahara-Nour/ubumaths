# solveInequality — Progression palier 1

**Date** : 2026-05-05.
**Statut** : livré, prêt à commit.

## Livrable

API publique pour résoudre les inéquations à coefficients **numériques**, avec
bornes du domaine solution en `MathNode` symbolique exact (radicaux,
fractions, π).

```ts
import { solveInequality } from '$lib/mathAST/solve';

const r = solveInequality(parseLatex('x^2 - 2 < 0'));
// r.solution.intervals[0].lower.value = opposite(sqrt(2))   ← exact
// r.solution.intervals[0].upper.value = sqrt(2)             ← exact
// r.status === 'complete'
```

## Fichiers

| Fichier                                                              | Rôle                       |
| -------------------------------------------------------------------- | -------------------------- |
| `src/lib/mathAST/solve/inequality/types.ts`                          | Types publics + erreurs    |
| `src/lib/mathAST/solve/inequality/index.ts`                          | Implémentation             |
| `src/lib/mathAST/solve/inequality/__tests__/solveInequality.test.ts` | 25 tests (24 pass, 1 skip) |
| `src/lib/mathAST/solve/index.ts`                                     | Re-exports publics         |
| `docs/wip/solve-inequality-spec.md`                                  | Spec validée               |

## Pipeline implémenté

```
solveInequality(rel, opts)
  → valider (relation ≠ '=')
  → expression = canon(left − right)
  → variable = opts.variable ?? detectVariable
  → constante (pas de variable)  → resolveConstantInequality
  → rejectIfParametric (variables libres ≠ variable)
  → expandExcludedPoints(Df)     ← workaround analyzeSign
  → analyzeSign
  → aggregateSolution (filter signedIntervals par opérateur)
  → computeStatus
  → strictMode → throw si 'partial'
  → return SolveInequalityResult
```

### Workaround `expandExcludedPoints`

`analyzeSign.splitDomainAtZeros` itère uniquement sur `domain.intervals` et
ignore `excludedPoints`. Pour `1/x > 0`, `computeDomain` renvoie
`{ intervals: [ℝ], excludedPoints: [0] }`, ce qui laisse `analyzeSign` produire
un seul intervalle `]−∞, +∞[` de signe `'unknown'`.

Le wrapper pré-normalise le domaine en éclatant les points exclus en bornes
ouvertes : `{ intervals: [ℝ], excludedPoints: [0] }` →
`{ intervals: [ ]−∞, 0[, ]0, +∞[ ], excludedPoints: [] }`.

Idempotent pour les domaines sans points exclus, no-op pour les domaines non
`interval_set` (`empty`, `universal`, `condition_domain`, `periodic_exclusion`).

## Décisions issues du code review

1. **Ordre des branches dans `computeStatus`** : `no-solution` avant `partial`,
   conforme à la spec — un résultat `'partial'` avec solution vide serait
   contradictoire pour le caller.
2. **Variable sentinel `'__const__'`** dans `resolveConstantInequality` (au
   lieu de `'x'` codé en dur) pour résister à un éventuel ajout de validation
   « la variable doit apparaître dans l'expression » dans `analyzeSign`.
3. **Imports `Endpoint` + `Interval` fusionnés** depuis le même module.
4. **JSDoc enrichie** sur le pass-through de `expandExcludedPoints` pour les
   domaines non-`interval_set`.
5. **Test 8 strict** : vérifie que `solution.intervals.length === 0` quand le
   kind est `interval_set`.
6. **`as never` → `as MathNode`** dans le helper de test.

## Limitation V1 documentée

Test 14 (`e^x − 1 > 0`) est `it.skip` : `solve(e^x − 1 = 0)` ne détecte pas
x=0 (gap dans le solveur transcendantal — il gère `e^x = c` mais pas
`a·e^x + b = 0` reformulé en `e^x = −b/a`). Conséquence : `analyzeSign`
renvoie le signe sur tout ℝ via sampling, qui à `±1e6` souffre d'overflow/
underflow d'`exp` et conclut à tort que tout ℝ est négatif.

Pour ré-activer ce test, il faudra fixer en amont :

- soit le solveur transcendantal (`solve/solvers/transcendental.ts`) pour
  reconnaître `a·e^x + b = 0`,
- soit la stratégie de sampling (`sign/helpers/sampling.ts`) pour utiliser des
  bornes adaptées au type de fonction.

## Vérifications

| Étape                                     | Résultat                                                                                        |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Tests inéquation (`solveInequality.test`) | **24 pass / 1 skip / 0 fail**                                                                   |
| Tests sign + solve + domain (régression)  | **1244 pass / 1 skip / 3 todo / 0 fail**                                                        |
| ESLint (fichiers nouveaux)                | **0 erreur**                                                                                    |
| `pnpm check:incremental`                  | **0 nouvelle erreur** (les 9 erreurs existantes sont pré-existantes en `slides/demo`/`extern/`) |

## Documents produits

- `docs/wip/solve-inequality-spec.md` — spec figée
- `docs/wip/solve-inequality-progress.md` — ce document

## Suite (palier 2 — à rediscuter)

Voir `docs/wip/solve-inequality-spec.md` § « PALIER 2 — esquisse » pour les
questions de périmètre Q-P2-A à Q-P2-D (linéaire numérique, quadratique
numérique, cas paramétriques, format de sortie pédagogique).
