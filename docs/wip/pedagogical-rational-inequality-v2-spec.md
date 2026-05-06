# Palier 3 V2 — Multi-fractions + fraction côté droit

**Statut** : V2 spec validée 2026-05-06. Suit V1.1 (`73bb9dbc2`).

## Objectif

Lever 2 limitations OUT de V1.1 :

- **Multi-fractions** : `1/x + 1/(x-1) < 0` rejeté en V1, supporté en V2 via une nouvelle étape `combine-fractions` (« réduction au même dénominateur »).
- **Fraction sur le côté droit** : `x < 1/(x-3)` rejeté en V1 ; V2 standardise (= subtract right) puis combine.

Pas une nouvelle palier — c'est un V2 qui étend palier 3 V1.

## Scope V2

### IN — 7 comportements

#### A. Somme / différence de 2 fractions linéaires (4 cas)

| #   | Inéquation          | Forme combinée       | Solution                |
| --- | ------------------- | -------------------- | ----------------------- |
| 1   | `1/x + 1/(x-1) < 0` | `(2x-1)/(x²-x) < 0`  | `]−∞ ; 0[ ∪ ]1/2 ; 1[`  |
| 2   | `1/x − 1/(x-1) > 0` | `−1/(x²-x) > 0`      | `]0 ; 1[`               |
| 3   | `2/x + 3/(x-2) < 0` | `(5x-4)/(x²-2x) < 0` | analysed via sign table |
| 4   | `1/x + 2/(x-1) > 0` | `(3x-1)/(x²-x) > 0`  | analysed                |

#### B. Fraction sur le côté droit (1 cas)

| #   | Inéquation    | Forme canonique après standardize | Solution |
| --- | ------------- | --------------------------------- | -------- |
| 5   | `x < 1/(x-3)` | `(x²-3x-1)/(x-3) < 0`             | analysed |

#### C. Polynôme + fraction (2 cas)

| #   | Inéquation        | Forme combinée       | Solution |
| --- | ----------------- | -------------------- | -------- |
| 6   | `x + 1/(x-1) < 0` | `(x²-x+1)/(x-1) < 0` | analysed |
| 7   | `x − 1/(x-1) > 0` | `(x²-x-1)/(x-1) > 0` | analysed |

### OUT (V3+)

- **3+ fractions** dans la même expression (ex: `1/x + 1/(x-1) + 1/(x-2)`)
- **Dénominateur quadratique** (ex: `1/x + 1/(x²-1)`)
- **PGCD polynomial non-trivial** : V2 suppose que les dénominateurs sont coprimes (LCM = produit). Ex: `1/(x-1) + 2/(x-1)` rejeté ou simplifié en V3.
- **Fractions imbriquées** (`1/(1/x + 1)`)
- Résultat de `combine` qui se simplifie en polynôme (déjà géré par le dispatcher V1)

## Architecture

### Nouvelle op kind

```ts
| { readonly kind: 'combine-fractions';
    /** Original terms before combining (parsed shape). */
    readonly originalTerms: readonly { readonly numerator: MathNode; readonly denominator: MathNode | null /* polynomial term has null */ }[];
    /** The common denominator chosen (product of distinct denominators in V2). */
    readonly commonDenominator: MathNode;
    /** The combined numerator after summing. */
    readonly combinedNumerator: MathNode;
    /** The final reduced form `combinedNumerator / commonDenominator`. */
    readonly combined: { readonly numerator: MathNode; readonly denominator: MathNode };
  }
```

### Pipeline étendu (8 étapes au max)

```
1. identify-equation                  (kind = 'rational')
2. standardize (si rhs ≠ 0)           (NEW — bring everything to lhs)
3. combine-fractions                  (NEW — réduction au même dénominateur)
4. identify-rational                  (sur la forme combinée P/Q)
5. rational-domain-restriction
6. rational-locate-roots
7. rational-sign-table
8. inequality-conclude-rational
```

Étapes 2 et 3 sont conditionnelles :

- 2 émis si `inequality.right ≠ 0`
- 3 émis si la forme post-standardize n'est pas déjà un single division

### Détection mise à jour

```
Old V1 :
  if (unwrap(inequality.left).type !== 'division') throw
  → rejected multi-fractions and rhs ≠ 0

V2 :
  // Standardize first
  standardForm = inequality.left - inequality.right (raw, pre-canon)
  // Detect multi-fraction structure
  fractions = collectFractionTerms(standardForm, variable)
  - 0 fractions: not rational, route to polynomial pipeline
  - 1 fraction term + 0+ polynomial terms: combine-fractions step needed
  - 2+ fraction terms: combine-fractions step needed
  // Compute combined form, validate
  combined = combineFractions(fractions, polynomialTerms)
  // V2 cap : both denominators degree ≤ 1, distinct (coprime)
  if (any denom degree > 1 OR more than 2 distinct denominators) throw V3
  // Continue with the rational pipeline on `combined`
```

### Helper `collectFractionTerms`

Walks the top-level sum/subtraction structure, classifies each term as either :

- `fraction term` (division node with variable in denominator)
- `polynomial term` (no variable-bearing denominator)

Returns `{ fractions: [{numerator, denominator, sign}], polynomialTerms: [{value, sign}] }`.

### Helper `combineFractions`

Given the classified terms :

1. Collect distinct denominators (modulo structural equality) ; V2 : max 2.
2. Common denominator = product of distinct denoms.
3. For each fraction term : multiply numerator by the « missing factor » so its denom matches the common one.
4. For each polynomial term : multiply by the common denom (turn it into a fraction).
5. Sum/subtract all adjusted numerators, then `canon` the result.
6. Return `{ commonDenominator, combinedNumerator, combined: { numerator, denominator } }`.

V2 simplification : if any denom equals another (e.g. `1/(x-1) + 1/(x-1)`), reject (palier OUT — would need polynomial gcd).

## Vérifications

- [ ] 7 V2 comportements testés
- [ ] V1 cas standard (`(x-1)/(x-3) < 0`) toujours via le chemin direct (pas de combine-fractions)
- [ ] Tests V1.1 inchangés (355 → ~362)
- [ ] mathAST 12731 → ~12745
- [ ] CLI demo + Mode B fixture pour multi-fraction
