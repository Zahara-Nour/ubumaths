# Phase G — Différentiation symbolique du `PiecewiseNode`

## Objectif

Lever la limitation Phase C/D : `differentiate(piecewiseNode)` levait une `DifferentiationError`. Le builtin `createPiecewiseFunctionFromAst` stockait alors un placeholder (`derivative = ZERO_NODE`, `compiledDerivative = () => 0`), ce qui :

- faisait retourner une tangente horizontale fausse pour `tangente(f, x0)` sur piecewise ;
- dégradait le sampler adaptatif vers un sampling quasi-uniforme ;
- produisait `derivee(f) = 0` partout au lieu du vrai piecewise dérivé.

## État final

✅ Différentiation par branche implémentée (`case 'piecewise'` dans `differentiate.ts`)
✅ `createPiecewiseFunctionFromAst` calcule la vraie dérivée + compile, fallback `0` si exception
✅ Tests unitaires verts (6 nouveaux tests)
✅ Tests E2E geometry-core verts (3 nouveaux tests)
✅ 0 régression : 11648 tests mathAST + 2959 tests geometry-core

## Modèle mathématique

Pour `f(x) = { v_i(x) si c_i, ..., otherwise v_o(x) }` :
`f'(x) = { v_i'(x) si c_i, ..., otherwise v_o'(x) }`

Les conditions `c_i` sont des **prédicats** : on ne dérive pas un booléen. Elles restent inchangées (préservation par identité de référence).

## Hors scope

- **Continuité C¹ aux raccords** : analyser si la dérivée présente un saut au point de transition (ex: `|x|` a un coude à 0). Pour l'instant le piecewise dérivé est rendu tel quel, sans annotation de discontinuité. À ajouter si un usage pédagogique le demande.
- **Différentiation par rapport à autre chose que `x`** : `variable: 'x'` partout dans le pipeline geometry-core. Ce paramètre est néanmoins respecté dans `differentiate(piecewiseNode, { variable: 'y' })` si jamais il est utilisé ailleurs.

## Comportements vérifiés (tests)

### Unitaires (`piecewise-differentiation.test.ts`, 6 tests)

| Cas                 | Source                          | Résultat                                                    |
| ------------------- | ------------------------------- | ----------------------------------------------------------- |
| `\|x\|`             | `{ -x si x<0, x si x>=0 }`      | dérivée évalue à `-1` (x<0) et `1` (x>=0)                   |
| Polynomial          | `{ x^2 si x<1, 2x-1 si x>=1 }`  | dérivée évalue à `2x` (x<1) et `2` (x>=1)                   |
| `sign(x)`           | trois branches constantes       | dérivée évalue à `0` partout                                |
| `otherwise`         | `{ x^3 si x<0, otherwise x^2 }` | dérivée du `otherwise` calculée (`2x`)                      |
| Identité conditions | refs préservées                 | `result.pieces[i].condition === source.pieces[i].condition` |
| Métadonnées         | `metadata` propagée             | `result.metadata === source.metadata`                       |

### E2E (`courbe-piecewise.test.ts`, 3 nouveaux tests)

| Cas              | DSL                                                 | Vérif                                                    |
| ---------------- | --------------------------------------------------- | -------------------------------------------------------- |
| `\|x\|`          | `courbe("y = { -x si x < 0, x si x >= 0 }")`        | `compiledDerivative({x:-2}) === -1`, `({x:3}) === 1`     |
| Frontière fermée | idem                                                | `compiledDerivative({x:0}) === 1` (premier match `x>=0`) |
| Polynomial       | `courbe("y = { x^2 si x < 1, 2*x - 1 si x >= 1 }")` | `compiledDerivative({x:-2}) === -4`, `({x:3}) === 2`     |

## Modifications

| Fichier                                                                       | Change                                                                                                                  |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `src/lib/mathAST/differentiation/differentiate.ts`                            | Remplacer le `throw DifferentiationError` par dérivation par branche + import `piecewise`                               |
| `src/lib/mathAST/differentiation/__tests__/piecewise-differentiation.test.ts` | **NEW** — 6 tests unitaires                                                                                             |
| `src/lib/geometry-core/dsl/builtins.ts`                                       | `createPiecewiseFunctionFromAst` calcule la vraie dérivée via `differentiate(...)` + `compile(...)`, try/catch fallback |
| `src/lib/geometry-core/dsl/__tests__/courbe-piecewise.test.ts`                | +3 tests E2E (`describe('courbe() — piecewise differentiation')`)                                                       |
| `docs/wip/geometry/phase-d-geometry-piecewise-progress.md`                    | Limitation 2 et 3 marquées « Levée en Phase G »                                                                         |
| `docs/wip/geometry/phase-c-piecewise-node-progress.md`                        | Scope non livré 2 marqué « Levée en Phase G »                                                                           |

## Décisions techniques

1. **Récursivité via `differentiateNode`** : on appelle l'helper interne plutôt que `differentiate` (l'API publique) pour éviter de re-parser les options à chaque branche.
2. **Métadonnées propagées** : on passe `node.metadata` à la factory `piecewise(...)` — un consommateur en aval peut ainsi conserver des annotations (line numbers, etc.).
3. **Fallback silencieux dans `createPiecewiseFunctionFromAst`** : si `differentiate` lève (cas pathologique non couvert par les tests), on retombe sur le placeholder `0` plutôt que de faire planter le builtin entier. Conserve la résilience visuelle.
4. **Conditions par identité** : on réutilise `p.condition` tel quel sans clonage — sémantiquement, la condition n'est pas modifiée par la dérivation, et préserver l'identité aide les comparaisons structurelles en aval.

## Vérification visuelle (à faire par l'utilisateur)

- `pnpm dev -- --port 5175` puis `/geometry-demo/piecewise`
- Vérifier que les courbes piecewise non-constantes (`|x|`, polynomial par morceaux) ont un sampling adaptatif (densification dans les zones de forte pente).
- Si on ajoute `tangente(f, x0)` à un exemple, la tangente doit avoir la bonne pente (pas horizontale).

## Documents produits

- `docs/wip/geometry/phase-g-piecewise-differentiation-progress.md` (ce document)
- Modifications : `phase-d-geometry-piecewise-progress.md`, `phase-c-piecewise-node-progress.md`

## Commit

```
feat(mathAST): symbolic differentiation of PiecewiseNode
```
