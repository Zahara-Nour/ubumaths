# Refactoring: Normalisation des Exponentielles (exp)

> Document de suivi - Implementation terminee le 2026-01-09

## Statut: COMPLETE (avec extraction partielle)

Le bug critique a ete corrige en passant de l'approche **expansion** a l'approche **combinaison**.
L'extraction partielle des termes ln a ete ajoutee le 2026-01-09.

### Bug Original (Corrige)

```typescript
// AVANT: Bug
normalize(exp(2) * exp(3)).hash !== normalize(exp(5)).hash; // ECHEC

// APRES: Corrige
normalize(exp(2) * exp(3)).hash === normalize(exp(5)).hash; // OK
```

## Solution Implementee: Approche Combinaison + Extraction Partielle

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

### Extraction Partielle des Termes ln

Quand l'argument de `exp` contient un melange de termes `ln` et non-`ln`,
l'extraction partielle separe les termes ln du reste:

```typescript
exp(ln(x) + y)       →  x · exp(y)       // extraction partielle
exp(ln(x) + 1)       →  x · e            // car exp(1) = e
exp(2·ln(x) + y)     →  x² · exp(y)      // extraction partielle
exp(ln(x) + ln(y) + z) → x·y · exp(z)    // extraction partielle
exp(ln(x) - ln(y) + z) → (x/y) · exp(z)  // extraction partielle
exp(-ln(x) + y)      →  exp(y) / x       // extraction partielle

// Si TOUS les termes sont des ln:
exp(ln(x) + ln(y))   →  x * y            // extraction complete
exp(ln(x) - ln(y))   →  x / y            // extraction complete
```

### Cas qui restent opaques

```typescript
exp(ln(x)·ln(y))     →  opaque  // produit de logs, pas somme
exp(ln(x)²)          →  opaque  // log au carre
exp(x·ln(y))         →  opaque  // coefficient variable (x)
exp(sqrt(2)·ln(x))   →  opaque  // coefficient irrationnel
```

## Fichiers Modifies

| Fichier                                              | Modifications                                                                                                                                                         |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/mathAST/normal/normalize.ts`                | Ajoute `tryExtractLnTerm`, `extractPartialLinearCombinationOfLn`. Modifie le handling de `exp` pour extraction partielle. Corrige `exp(0)=1` avec `isZeroNormalForm`. |
| `src/lib/mathAST/normal/__tests__/normalize.test.ts` | Mis a jour les tests pour attendre l'extraction partielle au lieu de la forme opaque.                                                                                 |

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

// (NOUVEAU) Extrait un seul terme ln d'un NormalTerm
function tryExtractLnTerm(term: NormalTerm): { base: MathNode; coeff: Rational } | null;

// (NOUVEAU) Extraction partielle: separe termes ln et reste
function extractPartialLinearCombinationOfLn(form: NormalForm): {
	lnTerms: { base: MathNode; coeff: Rational }[];
	remainder: NormalForm;
};
```

### Points d'Integration

1. **`mulNormalForms`**: Appelle `combineExpInPolynomial` apres la multiplication
2. **`divNormalForms`**: Appelle `combineExpInPolynomial` apres la division
3. **`normalFormFromFraction`**: Appelle `combineExpAcrossFraction` avant la reduction
4. **`superscript` case**: Gere `exp(a)^n → exp(n*a)` directement
5. **`normalizeFunction` (exp)**: Appelle `extractPartialLinearCombinationOfLn` pour extraction partielle

### Algorithme d'Extraction Partielle

```typescript
// Dans normalizeFunction pour exp(arg):
const { lnTerms, remainder } = extractPartialLinearCombinationOfLn(argForm);

if (lnTerms.length > 0) {
	// Build product: Π xᵢ^aᵢ
	let result = ONE_NORMAL_FORM;
	for (const { base, coeff } of lnTerms) {
		const powerNode = buildPowerNode(base, coeff);
		result = mulNormalForms(result, normalizeNode(powerNode));
	}

	// If remainder != 0, multiply by exp(remainder)
	if (!isZeroNormalForm(remainder)) {
		const expRemainder = normalizeNode({
			type: 'function',
			name: 'exp',
			args: [denormalize(remainder)]
		});
		result = mulNormalForms(result, expRemainder);
	}

	return result;
}
```

## Tests

Tous les 307 tests de normalisation passent, incluant:

- Tests de combinaison de produits: `exp(2)*exp(3) = exp(5)`
- Tests de combinaison de puissances: `exp(x)^2 = exp(2x)`
- Tests de combinaison de divisions: `exp(5)/exp(2) = exp(3)`
- Tests d'equivalence canonique: `exp(x)*exp(y) = exp(x+y)`
- Tests d'extraction partielle: `exp(ln(x) + y) = x·exp(y)`
- Tests de cas opaques: expressions non-lineaires en ln

## Comparaison Avant/Apres

| Expression      | Avant (Expansion) | Apres Combinaison | Apres Extraction Partielle |
| --------------- | ----------------- | ----------------- | -------------------------- |
| `exp(x+y)`      | `exp(x)·exp(y)`   | `exp(x+y)`        | `exp(x+y)`                 |
| `exp(x)·exp(y)` | `exp(x)·exp(y)`   | `exp(x+y)`        | `exp(x+y)`                 |
| `exp(2)·exp(3)` | bug               | `exp(5)`          | `exp(5)`                   |
| `1/exp(x)`      | `1/exp(x)`        | `exp(-x)`         | `exp(-x)`                  |
| `exp(ln(x)+y)`  | `x·exp(y)`        | opaque            | `x·exp(y)`                 |
| `exp(ln(x)+1)`  | `x·e`             | opaque            | `x·e`                      |

## Limitations Connues

1. **`e` vs `exp(1)`**: La variable `e` n'est pas traitee comme `exp(1)` dans les monomes, donc `exp(x)·e` ne se combine pas en `exp(x+1)`
2. **Coefficients non-rationnels**: `exp(sqrt(2)·ln(x))` reste opaque car le coefficient n'est pas rationnel

Ces limitations sont acceptables pour le cas d'usage actuel.
