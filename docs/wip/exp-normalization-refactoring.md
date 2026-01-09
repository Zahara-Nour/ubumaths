# Refactoring: Normalisation des Exponentielles (exp)

> Document de suivi - Implementation terminee le 2026-01-09

## Statut: COMPLETE

Le bug critique a ete corrige en passant de l'approche **expansion** a l'approche **combinaison**.

### Bug Original (Corrige)

```typescript
// AVANT: Bug
normalize(exp(2) * exp(3)).hash !== normalize(exp(5)).hash; // ECHEC

// APRES: Corrige
normalize(exp(2) * exp(3)).hash === normalize(exp(5)).hash; // OK
```

## Solution Implementee: Approche Combinaison

### Forme Canonique

La forme canonique est maintenant `exp(polynomial)` au lieu d'un produit de `exp`.

```
exp(a) * exp(b)  →  exp(a + b)
exp(a)^n         →  exp(n * a)
1/exp(x)         →  exp(-x)
exp(a)/exp(b)    →  exp(a - b)
```

### Regles Preservees

Les regles suivantes continuent de fonctionner:

```typescript
exp(0) = 1
exp(1) = e
exp(ln(x)) = x
exp(Σ aᵢ·ln(xᵢ)) = Π xᵢ^aᵢ  // Combinaison lineaire COMPLETE de ln
```

### Comportement des Cas Mixtes

Quand l'argument de `exp` contient un melange de termes `ln` et non-`ln`, l'expression reste **opaque** (pas d'extraction partielle):

```typescript
exp(ln(x) + y)      →  reste opaque  // y n'est pas un ln
exp(ln(x) + 1)      →  reste opaque  // 1 n'est pas un ln
exp(2ln(x) + z)     →  reste opaque  // z n'est pas un ln

// MAIS si TOUS les termes sont des ln:
exp(ln(x) + ln(y))  →  x * y         // extraction complete
exp(ln(x) - ln(y))  →  x / y         // extraction complete
```

## Fichiers Modifies

| Fichier                                              | Modifications                                                                                                                                                                                                                        |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/mathAST/normal/normalize.ts`                | Supprime `expandExpSum`, `extractExpCoefficient`, `expandExpCoefficient`. Ajoute `combineExpInMonomial`, `combineExpInPolynomial`, `combineExpAcrossFraction`. Modifie `mulNormalForms`, `divNormalForms`, `normalFormFromFraction`. |
| `src/lib/mathAST/normal/__tests__/normalize.test.ts` | Mis a jour les tests pour attendre la forme combinee. Ajoute tests TDD pour la combinaison.                                                                                                                                          |

## Implementation Technique

### Fonctions Ajoutees

```typescript
// Detecte si un noeud est exp(...)
function isExpFunction(node: MathNode): boolean;

// Extrait l'argument de exp(arg)
function getExpArg(node: FunctionNode): MathNode;

// Multiplie un noeud par un rationnel: node * (n/d)
function scaleNodeByRational(node: MathNode, exp: Rational): MathNode;

// Combine exp(a)^m * exp(b)^n → exp(m*a + n*b) dans un monome
function combineExpInMonomial(monomial: SymbolicFactor[]): SymbolicFactor[];

// Applique combineExpInMonomial a tous les termes d'un polynome
function combineExpInPolynomial(terms: NormalTerm[]): NormalTerm[];

// Combine exp(a)/exp(b) → exp(a-b) dans une fraction
function combineExpAcrossFraction(num, den): { numerator; denominator };
```

### Points d'Integration

1. **`mulNormalForms`**: Appelle `combineExpInPolynomial` apres la multiplication
2. **`divNormalForms`**: Appelle `combineExpInPolynomial` apres la division
3. **`normalFormFromFraction`**: Appelle `combineExpAcrossFraction` avant la reduction
4. **`superscript` case**: Gere `exp(a)^n → exp(n*a)` directement

## Tests

Tous les 307 tests de normalisation passent, incluant:

- Tests de combinaison de produits: `exp(2)*exp(3) = exp(5)`
- Tests de combinaison de puissances: `exp(x)^2 = exp(2x)`
- Tests de combinaison de divisions: `exp(5)/exp(2) = exp(3)`
- Tests d'equivalence canonique: `exp(x)*exp(y) = exp(x+y)`
- Tests de cas opaques: expressions mixtes ln/non-ln

## Comparaison Avant/Apres

| Expression      | Avant (Expansion)     | Apres (Combinaison)    |
| --------------- | --------------------- | ---------------------- |
| `exp(x+y)`      | `exp(x)·exp(y)`       | `exp(x+y)` (canonique) |
| `exp(x)·exp(y)` | `exp(x)·exp(y)`       | `exp(x+y)` (canonique) |
| `exp(2)·exp(3)` | `exp(2)·exp(3)` (bug) | `exp(5)` (corrige)     |
| `1/exp(x)`      | `1/exp(x)`            | `exp(-x)`              |
| `exp(ln(x)+y)`  | `x·exp(y)`            | opaque                 |

## Limitations Connues

1. **Pas d'extraction partielle de ln**: `exp(ln(x) + y)` reste opaque au lieu de `x·exp(y)`
2. **`e` vs `exp(1)`**: La variable `e` n'est pas traitee comme `exp(1)` dans les monomes, donc `exp(x)·e` ne se combine pas en `exp(x+1)`

Ces limitations sont acceptables pour le cas d'usage actuel.
