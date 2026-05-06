# Pedagogical Linear Inequality — Progression palier 2a

**Date** : 2026-05-05.
**Statut** : livré, prêt à commit.

## Livrable

API publique pour générer des étapes pédagogiques (`EquationStep[]`) résolvant
une inéquation linéaire à coefficients **numériques**, avec retournement
explicite de l'opérateur lors d'une division par scalaire négatif.

```ts
import {
	generateInequalitySteps,
	generateLinearInequalitySteps
} from '$lib/mathAST/pedagogical-solve';

const steps = generateInequalitySteps(parseLatex('-2x \\geq 6'), { level: 'college' });
// steps[1].operation = { kind: 'divide-both-sides', operand: -2, flipOperator: true }
// steps[1].after.relation = '<='   (retourné depuis '>=')
// steps[1].after.right = -3
```

## Fichiers

| Fichier                                                                 | Rôle                                                                                              |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/lib/mathAST/pedagogical-solve/linear-inequality.ts`                | Implémentation                                                                                    |
| `src/lib/mathAST/pedagogical-solve/__tests__/linear-inequality.test.ts` | 22 tests (couvre les 20 cas spec)                                                                 |
| `src/lib/mathAST/pedagogical-solve/_helpers.ts`                         | Étendu : `divideBothSidesWithFlip` + `flipRelation`                                               |
| `src/lib/mathAST/pedagogical-solve/types.ts`                            | Étendu : `flipOperator?` sur 3 ops + `inequality-conclude-truth` + `LinearInequalityStepsOptions` |
| `src/lib/mathAST/pedagogical-solve/index.ts`                            | Dispatcher `generateInequalitySteps` + re-exports                                                 |
| `src/lib/mathAST/pedagogical-solve/linear-renderer.ts`                  | Helper `relToLatex` (mapping `<=`/`>=`/`!=` → `\leq`/`\geq`/`\neq`)                               |
| `docs/wip/pedagogical-inequality-spec.md`                               | Spec validée                                                                                      |

## Pipeline

```
generateInequalitySteps(ineq, opts)
  → si '=' → throw PedagogicalInequalityError
  → si pas de variable → linear (cas constant)
  → si degré null → throw UnsupportedInequalityDegree(null)  (transcendant non-poly)
  → si degré ≥ 2 → throw UnsupportedInequalityDegree(degree) (palier 2b)
  → sinon → generateLinearInequalitySteps

generateLinearInequalitySteps(ineq, opts)
  1. Validation operator (rejet de '=', non-inégalités)
  2. Détection variable (null = cas constant)
  3. Sanity degré 0/1 + rejet paramétrique
  4. Étape identify-equation (selon STRATEGIES.includeIdentify)
  5. Cas constant (variable null) → conclude-truth
  6. Regroupement (atomic OU combined selon STRATEGIES) — preserve l'opérateur
  7. Division par coefficient :
     - a = 0 → conclude-truth (évalué numériquement)
     - a = 1 → pas d'étape
     - a ≠ 0,1 → divideBothSidesWithFlip → flipOperator true ssi a < 0
  8. Renumber + return
```

`divideBothSidesWithFlip` :

| op original | divisor < 0 ? | op résultat |
| ----------- | ------------- | ----------- |
| `<`         | oui           | `>`         |
| `>`         | oui           | `<`         |
| `<=`        | oui           | `>=`        |
| `>=`        | oui           | `<=`        |
| `<,>,<=,>=` | non           | inchangé    |
| `!=`        | quelconque    | inchangé    |
| `=`         | quelconque    | inchangé    |

## Décisions issues du code review

1. **Signature `UnsupportedInequalityDegree`** alignée sur `UnsupportedEquationDegree` : accepte maintenant `number | null`, avec branche dédiée pour le cas non-polynomial. Le dispatcher distingue explicitement « pas de variable détectée » (= constante, route vers linear) de « variable présente mais expression non-polynomiale » (= throw `UnsupportedInequalityDegree(null)`).
2. **`InequalityNotSolvable`** importé depuis `solve/inequality/types` directement dans le barrel `pedagogical-solve/index.ts` (pas de re-export depuis `linear-inequality.ts` — surface publique unique).
3. **Imports tests fusionnés** (un seul bloc d'import depuis `linear-inequality`).
4. **JSDoc `relToLatex`** clarifie qu'il ne couvre que les 5 opérateurs émis par les pipelines linéaires (pas le `RelationType` étendu).
5. **Imports inutilisés supprimés** dans `linear-inequality.ts` (`relation`) et le test (`lastRelationLatex`).

## Renderer pour inéquations — V2 livré (2026-05-06)

Les limitations V1 du renderer sont **levées**. Le `LinearEquationRenderer` est
maintenant polyvalent (équation/inéquation) sans duplication — l'extension est
faite par branchement sur `step.before.relation !== '='` et `op.flipOperator`,
plutôt que par création d'un `LinearInequalityRenderer` dédié.

### V1 → V2

| Limitation V1                                                                                             | Solution V2                                                                                  |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| TITLES sans note « (changement de sens) »                                                                 | Helper `flipNote(op)` ajoute la note quand `flipOperator: true`                              |
| EXPLANATIONS parlent de « l'égalité » même pour inéquations                                               | Helper `divideExplanation`/`multiplyExplanation` branchent sur `isInequalityStep`            |
| `inequality-conclude-truth` sans TITLE/EXPLANATION                                                        | `inequalityConcludeTruthTitle` + `inequalityConcludeTruthExplanation`, ajoutés aux 3 niveaux |
| `identify-equation` dit « Équation » pour les inéquations                                                 | `identifyEquationTitle` retourne « Inéquation du premier degré » via `isInequalityStep`      |
| `formatTransformationLines` rendait l'aligned block pour `inequality-conclude-truth` (rien à transformer) | Ajout au filtre info-only                                                                    |

### Helpers ajoutés

- `isInequalityStep(step)` — `true` si `step.before.relation !== '='`
- `preservedNoun(step)` — « l'inégalité » ou « l'égalité » avec élision
- `flipNote(op)` — chaîne « (changement de sens car X est négatif) » ou vide
- `inequalityConcludeTruthTitle` / `inequalityConcludeTruthExplanation`
- `divideExplanation` / `multiplyExplanation` — adaptés au type d'opérateur

### Tests renderer V2

Nouveau fichier `__tests__/linear-renderer-inequality.test.ts` (23 tests) :

- TITLES « changement de sens » présent ssi `flipOperator: true`
- EXPLANATIONS adaptées (inégalité vs égalité)
- `inequality-conclude-truth` rendu avec mention « S = ℝ » ou « contradiction »
- `formatTransformationLines` retourne `null` pour la conclude-truth (info-only)
- Régression équation : titres et explications inchangés (vérifiés via 13 tests existants `linear-renderer.test.ts`)

### Décisions issues du code review V2

1. **Lycée `add-both-sides` simplifié** : remplacement de la comparaison fragile
   `preservedNoun(step) === "l'inégalité"` par `isInequalityStep(step)` direct
   (résistant à un futur renommage de `preservedNoun`).

## Vérifications V1

| Étape                                       | Résultat                                                                                        |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Tests inéquation (`linear-inequality.test`) | **22 pass / 0 fail**                                                                            |
| Tests pedagogical-solve (régression)        | **239 pass / 0 fail**                                                                           |
| Tests mathAST entier (régression)           | **12582 pass / 19 skip / 3 todo / 0 fail**                                                      |
| ESLint (fichiers nouveaux et modifiés)      | **0 erreur**                                                                                    |
| `pnpm check:incremental`                    | **0 nouvelle erreur** (les 9 erreurs existantes sont pré-existantes en `slides/demo`/`extern/`) |

## Vérifications V2 (renderer)

| Étape                                                    | Résultat                                                  |
| -------------------------------------------------------- | --------------------------------------------------------- |
| Tests renderer V2 (`linear-renderer-inequality.test.ts`) | **23 pass / 0 fail**                                      |
| Régression renderer équation (`linear-renderer.test.ts`) | **13 pass / 0 fail**                                      |
| Régression pedagogical-solve total                       | **262 pass / 0 fail**                                     |
| Régression mathAST entier                                | **12605 pass / 19 skip / 3 todo / 0 fail** (+23 nouveaux) |
| ESLint                                                   | **0 erreur**                                              |
| `pnpm check:incremental`                                 | **0 nouvelle erreur**                                     |

## Documents produits

- `docs/wip/pedagogical-inequality-spec.md` — spec figée
- `docs/wip/pedagogical-inequality-progress.md` — ce document

## Suite

- **Palier 2b** : pédagogique quadratique numérique (Δ + tableau de signes + 6 sous-cas selon signe(a) × signe(Δ)). À spécifier avec une nouvelle Phase 0 TDD.
- **Reste palier 2c/d** : paramétrique (V2, scope ouvert).
