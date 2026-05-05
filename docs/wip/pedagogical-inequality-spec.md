# Pedagogical Inequality (linéaire) — Spécification V1 (palier 2a)

**Statut** : validée par l'utilisateur le 2026-05-05.
**Module cible** : extension de `src/lib/mathAST/pedagogical-solve/`.

## Objectif

Générer des étapes pédagogiques (`EquationStep[]`) pour résoudre une inéquation
linéaire à coefficients **numériques**. Symétrique à
`generateLinearEquationSteps` mais avec **retournement de l'opérateur** lors
de la division par un scalaire négatif (règle clé enseignée au collège).

Hors scope V1 :

- Quadratique (palier 2b)
- Coefficients paramétriques (palier 2c/d)

## Décisions verrouillées

| Q      | Décision                                                                                                                                                                                                                                      |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q-P2-B | Réutiliser `EquationStep`. Étendre les ops `divide-both-sides`, `multiply-both-sides`, `simplify-coefficient` avec un champ optionnel `flipOperator?: boolean`. Ajouter une nouvelle kind `inequality-conclude-truth` pour les cas dégénérés. |
| Q-P2-D | Niveaux scolaires `college` et `lycee` (mêmes `STRATEGIES` que linear-equation). Refuser `primaire` au type-level.                                                                                                                            |
| Q-P2-E | Oui, dispatcher polymorphe `generateInequalitySteps`. Routing : degré 0/1 → `generateLinearInequalitySteps` ; degré 2 → throw `UnsupportedInequalityDegree(2)` (palier 2b à venir).                                                           |
| Q-P2-F | Réutiliser `LinearEquationRenderer`. Si la note pédagogique « changement de sens » nécessite un rendu spécifique, l'ajouter dans le renderer existant via la branche `flipOperator`. Pas de renderer dédié si évitable.                       |

## API

```ts
// Nouveau
export function generateLinearInequalitySteps(
  inequality: RelationNode,
  options: LinearInequalityStepsOptions
): readonly EquationStep[];

// Dispatcher polymorphe
export function generateInequalitySteps(
  inequality: RelationNode,
  options: InequalityStepsOptions
): readonly EquationStep[];

// Erreurs
export class UnsupportedInequalityDegree extends Error {
  constructor(public readonly degree: number);
}
export class PedagogicalInequalityError extends Error {}
// + ré-export InequalityNotSolvable depuis solve/inequality
```

`LinearInequalityStepsOptions` mirrors `LinearEquationStepsOptions` (mêmes
champs `level`, `includeSubSteps`, `variable`).

## Algorithme

```
generateLinearInequalitySteps(ineq, opts):
  1. Valider :
     - relation ∈ {<, >, <=, >=, !=}  (≠ '=')
     - variable détectée (sinon : cas constant 0 ⊻ c → conclude-inequality-truth)
  2. Sanity check : degré 0 ou 1
  3. Rejet paramétrique : variables libres ≠ variable cible
  4. Étape identify-equation (si STRATEGIES.includeIdentify)
  5. Étape regroupement (mode atomic OU combined selon STRATEGIES)
     — mêmes opérations que linear-equation, opérateur préservé tel quel
  6. Étape division :
     - extraire coefficient `a` du côté gauche
     - si a == 0 : pas de division, le résultat est déjà constant ⊻ constant
       → étape inequality-conclude-truth selon truth
     - si a == 1 : pas de division
     - sinon :
        - flipOperator = (numericValue(a) < 0)
        - emit divide-both-sides ou simplify-coefficient avec flipOperator
        - équation résultante : `relation(flipped ? flip(op) : op, x, value)`
  7. (pas d'étape read-solution — l'inéquation finale est elle-même la solution
      sous forme `x ⊻ value`)
```

`flip` :

| op original | op retourné          |
| ----------- | -------------------- |
| `<`         | `>`                  |
| `>`         | `<`                  |
| `<=`        | `>=`                 |
| `>=`        | `<=`                 |
| `!=`        | `!=` (jamais flippé) |

## Comportements (20 cas)

### Linéaire simple (1-5)

1. `x + 3 < 5` → soustraire 3 → `x < 2`
2. `x − 4 ≥ 1` → ajouter 4 → `x ≥ 5`
3. `2x ≤ 6` → diviser par 2 → `x ≤ 3`
4. `2x + 3 < 7` → soustraire 3 → `2x < 4` → diviser par 2 → `x < 2`
5. `5x − 2 > 8` → ajouter 2 → `5x > 10` → diviser par 5 → `x > 2`

### Coefficient négatif (6-9) — **règle clé**

6. `−x < 3` → diviser par −1 (changement) → `x > −3`
7. `−2x ≥ 6` → diviser par −2 (changement) → `x ≤ −3`
8. `4 − x > 1` → soustraire 4 → `−x > −3` → diviser par −1 (changement) → `x < 3`
9. `3 − 2x ≤ 11` → soustraire 3 → `−2x ≤ 8` → diviser par −2 (changement) → `x ≥ −4`

### x des deux côtés (10-12)

10. `2x + 1 < x + 5` → −x → `x + 1 < 5` → −1 → `x < 4`
11. `3x − 2 ≥ x + 4` → −x → `2x − 2 ≥ 4` → +2 → `2x ≥ 6` → ÷2 → `x ≥ 3`
12. `5 − x > 2x + 8` → −2x → `5 − 3x > 8` → −5 → `−3x > 3` → ÷(−3) (changement) → `x < −1`

### Cas dégénérés `a = 0` (13-16)

13. `0 < 1` → conclude-inequality-truth (truth=true)
14. `0 > 1` → conclude-inequality-truth (truth=false)
15. `2x + 3 < 2x + 7` → après regroupement `0 < 4` → conclude-inequality-truth (truth=true)
16. `2x + 7 < 2x + 3` → après regroupement `0 < −4` → conclude-inequality-truth (truth=false)

### `!=` (17)

17. `2x + 3 ≠ 5` → −3 → `2x ≠ 2` → ÷2 (pas de changement) → `x ≠ 1`

### Erreurs (18-20)

18. Degré 2 (`x² < 1`) → throw `UnsupportedInequalityDegree(2)`
19. Coef paramétrique (`mx + 1 < 0` avec m libre) → throw `InequalityNotSolvable`
20. Relation `=` → throw `PedagogicalInequalityError` (suggérer `generateLinearEquationSteps`)

## Extension du type `EquationOperation`

Ajouts (rétro-compat — champs optionnels et nouvelle kind) :

```ts
// Champs optionnels ajoutés sur les kinds existantes :
| { readonly kind: 'multiply-both-sides'; readonly operand: MathNode; readonly flipOperator?: boolean }
| { readonly kind: 'divide-both-sides'; readonly operand: MathNode; readonly flipOperator?: boolean }
| { readonly kind: 'simplify-coefficient'; readonly coefficient: MathNode; readonly flipOperator?: boolean }

// Nouvelle kind :
| {
    readonly kind: 'inequality-conclude-truth';
    readonly truth: boolean;     // 3 < 7 → true ; 7 < 3 → false
  }
```

## Helper ajouté à `_helpers.ts`

```ts
/**
 * Like `divideBothSides`, but if `divisor` is numerically negative, ALSO flip
 * the inequality operator. Returns the new relation and a boolean indicating
 * whether the flip occurred.
 *
 * For `=` and `!=`, no flip is ever applied. For `<`, `>`, `<=`, `>=`, the
 * flip is applied iff the divisor is numerically < 0.
 */
export function divideBothSidesWithFlip(
	ineq: RelationNode,
	divisor: MathNode
): { result: RelationNode; flipped: boolean };
```

## Documents prévus

- `docs/wip/pedagogical-inequality-spec.md` (ce document)
- `docs/wip/pedagogical-inequality-progress.md` (état après chaque phase)

## Plan d'exécution

Voir tâches #11 à #20 dans le tracker.
