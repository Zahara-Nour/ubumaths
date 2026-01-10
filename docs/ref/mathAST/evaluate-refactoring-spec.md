# Refactoring de la fonction `evaluate` - Spécification

> **Status: COMPLETED** (January 2026)
>
> This refactoring has been implemented. Key changes:
>
> - Mode exact now returns `MathNode` (simplified via normalize/denormalize)
> - Mode decimal returns `number` for numeric evaluation
> - Complex number arithmetic works symbolically in exact mode
> - Tests updated to verify MathNode results instead of Rational values

## Contexte et Motivation

### Problème identifié

La fonction `evaluate` actuelle dans `src/lib/mathAST/eval/evaluate.ts` a un **défaut de conception majeur** :

1. **Le mode "exact" ne retourne pas de valeurs exactes** pour les irrationnels :

   ```typescript
   evaluate(parseLatex('\\sqrt{2}'), { mode: 'exact' });
   // Retourne : { value: 1.4142135623730951, exact: false }
   //                                          ^^^^^^^^^^^
   // Le système SAIT que c'est approximatif !
   ```

2. **Redondance architecturale** : La vraie valeur exacte existe déjà dans `NormalForm` :

   - `NormalForm` peut représenter exactement `√2`, `√2 + √3`, `cos(π/6) = √3/2`, etc.
   - `evaluate` tente de refaire ce travail mais de manière incomplète

3. **Deux systèmes parallèles qui ne communiquent pas** :
   | Système | Représente exactement | Limitation |
   |---------|----------------------|------------|
   | `Rational` dans `evaluate` | Fractions (1/3, 5/7) | Pas d'irrationnels |
   | `AlgebraicCoefficient` dans `NormalForm` | Fractions + Radicaux (√2, √3) | Complet |

### Insight clé

**La forme normale d'une expression numérique EST sa valeur exacte.**

```typescript
// √2 + √3 en NormalForm :
{
  numerator: [{
    coefficient: {
      terms: [
        { rational: {n: 1n, d: 1n}, radicals: [{radicand: 2n, index: 2n}] },  // √2
        { rational: {n: 1n, d: 1n}, radicals: [{radicand: 3n, index: 2n}] }   // √3
      ]
    },
    monomial: []
  }],
  // ...
}
```

---

## Décisions de design prises

### 1. Nouvelle architecture de `evaluate`

```typescript
export function evaluate(node: MathNode, options?: EvalOptions): EvalResult {
	// 1. Vérifier que l'expression est numérique
	// 2. Calculer la forme normale (simplification symbolique)
	// 3. Dénormaliser pour obtenir le MathNode simplifié
	// 4. Mode exact : retourner ce MathNode
	// 5. Mode décimal : évaluer numériquement ce MathNode
}
```

### 2. Vérification "expression numérique"

Une expression est numérique si elle ne contient **aucune variable libre**.

**Constantes mathématiques à traiter comme numériques** (pas des variables) :

- `π` (pi) - type `greek: 'pi'`
- `e` - type `variable: 'e'` (constante d'Euler)
- `i` - type `complex: {real: 0, imag: 1}` (unité imaginaire)

**Implémentation** :

```typescript
const vars = getVariables(node);
const freeVars = [...vars].filter((v) => !['pi', 'e', 'i'].includes(v));
if (freeVars.length > 0) {
	throw new Error(`Cannot evaluate: free variables: ${freeVars.join(', ')}`);
}
```

### 3. Mode exact

**Retourne** : `MathNode` via `denormalize(normalForm)`

**Exemple** :

```typescript
evaluate(parseLatex('\\sqrt{2} + \\sqrt{3}'), { mode: 'exact' });
// Retourne le MathNode : √2 + √3 (exact, pas d'approximation)

evaluate(parseLatex('\\cos(\\frac{\\pi}{6})'), { mode: 'exact' });
// Retourne le MathNode : √3/2 (simplifié via les règles transcendentales)

evaluate(parseLatex('\\cos(3)'), { mode: 'exact' });
// Retourne le MathNode : cos(3) (opaque, non simplifiable)
```

### 4. Mode décimal

**Retourne** : Évaluation numérique du MathNode simplifié.

**Modes de précision disponibles** (type `PrecisionType` existant) :

| Type                                                                  | Description                       | Exemple                 |
| --------------------------------------------------------------------- | --------------------------------- | ----------------------- |
| `{ type: 'none' }`                                                    | Valeur exacte (full precision JS) | `1.4142135623730951`    |
| `{ type: 'decimal', digits: n }`                                      | n décimales                       | `1.41` pour n=2         |
| `{ type: 'significant', digits: n }`                                  | n chiffres significatifs          | `1.4` pour n=2          |
| `{ type: 'magnitude', digits: n }`                                    | Ordre de grandeur 10^n            | Arrondi à 10, 100, etc. |
| `{ type: 'tolerance', tolerance: x, mode: 'absolute' \| 'relative' }` | Tolérance                         | ±0.01 ou ±1%            |

---

## Fonctions opaques (à évaluer numériquement)

Certaines fonctions ne peuvent pas être simplifiées symboliquement et doivent être évaluées via les fonctions JavaScript natives.

### Trigonométriques

| Fonction                | JavaScript     |
| ----------------------- | -------------- |
| `sin(x)`                | `Math.sin(x)`  |
| `cos(x)`                | `Math.cos(x)`  |
| `tan(x)`                | `Math.tan(x)`  |
| `asin(x)` / `arcsin(x)` | `Math.asin(x)` |
| `acos(x)` / `arccos(x)` | `Math.acos(x)` |
| `atan(x)` / `arctan(x)` | `Math.atan(x)` |

**Note** : Les valeurs remarquables (`sin(π/6)`, `cos(π/4)`, etc.) sont simplifiées AVANT via `simplifyTranscendental()` dans le pipeline de normalisation.

### Exponentielles / Logarithmiques

| Fonction              | JavaScript      |
| --------------------- | --------------- |
| `exp(x)`              | `Math.exp(x)`   |
| `ln(x)`               | `Math.log(x)`   |
| `log(x)` / `log10(x)` | `Math.log10(x)` |

**Note** : `ln(1)=0`, `ln(e)=1`, `exp(0)=1`, `exp(1)=e` sont simplifiés symboliquement.

### Racines (si non simplifiables)

| Fonction     | JavaScript         |
| ------------ | ------------------ |
| `sqrt(x)`    | `Math.sqrt(x)`     |
| `cbrt(x)`    | `Math.cbrt(x)`     |
| `root[n](x)` | `Math.pow(x, 1/n)` |

**Note** : `sqrt(4)=2`, `sqrt(18)=3√2` sont simplifiés symboliquement dans la normalisation.

### Autres fonctions

| Fonction   | JavaScript      |
| ---------- | --------------- |
| `abs(x)`   | `Math.abs(x)`   |
| `floor(x)` | `Math.floor(x)` |
| `ceil(x)`  | `Math.ceil(x)`  |
| `round(x)` | `Math.round(x)` |
| `min(...)` | `Math.min(...)` |
| `max(...)` | `Math.max(...)` |

### Fonctions complexes

| Fonction                | Calcul                    |
| ----------------------- | ------------------------- |
| `modulus(z)` / `abs(z)` | `√(re² + im²)`            |
| `arg(z)`                | `Math.atan2(im, re)`      |
| `cis(θ)`                | `cos(θ) + i·sin(θ)`       |
| `fromPolar(r, θ)`       | `r·cis(θ)`                |
| `nthRoot(z, n)`         | Racines n-ièmes complexes |
| `principalRoot(z, n)`   | Racine principale         |

### Statistiques

- `mean(...)`, `median(...)`, `stddev(...)`

---

## Pipeline de simplification existant

La normalisation utilise déjà un pipeline de simplification :

```
normalize(node)
    │
    ├─→ simplify(node)                    // rules/index.ts
    │       │
    │       ├─→ simplifyArithmetic()      // x+0=x, x*1=x, etc.
    │       ├─→ simplifyPowers()          // x^0=1, x^1=x, etc.
    │       ├─→ simplifyRadicals()        // √4=2, √18=3√2, etc.
    │       └─→ simplifyTranscendental()  // sin(π/6)=1/2, cos(π/4)=√2/2, etc.
    │
    └─→ normalizeNode(simplified)          // Conversion en NormalForm
```

---

## Fonctions existantes à réutiliser

### Dans `src/lib/mathAST/normal/`

| Fonction                  | Fichier          | Description                          |
| ------------------------- | ---------------- | ------------------------------------ |
| `normalize(node)`         | `normalize.ts`   | Calcule la NormalForm                |
| `denormalize(form)`       | `denormalize.ts` | Convertit NormalForm → MathNode      |
| `isConstantPolynomial(p)` | `polynomial.ts`  | Vérifie si polynomial sans variables |
| `algebraicToNumber(coef)` | `algebraic.ts`   | Évalue AlgebraicCoefficient → number |
| `rationalToNumber(r)`     | `rational.ts`    | Évalue Rational → number             |
| `radicalToNumber(r)`      | `radical.ts`     | Évalue SimplifiedRadical → number    |

### Dans `src/lib/mathAST/eval/`

| Fonction                     | Fichier         | Description                                                |
| ---------------------------- | --------------- | ---------------------------------------------------------- |
| `getVariables(node)`         | `substitute.ts` | Liste les variables d'une expression                       |
| `substitute(node, bindings)` | `substitute.ts` | Substitue les variables                                    |
| Handlers de fonctions        | `evaluate.ts`   | Code existant pour évaluer `sin`, `cos`, etc. via `Math.*` |

### Dans `src/lib/questions/types.ts`

```typescript
type PrecisionType =
	| { type: 'none' }
	| { type: 'decimal'; digits: number }
	| { type: 'significant'; digits: number }
	| { type: 'magnitude'; digits: number }
	| { type: 'tolerance'; tolerance: number; mode: 'absolute' | 'relative' };
```

---

## Points à clarifier / implémenter

### 1. Fonction `evaluateNodeNumeric`

Créer une fonction qui évalue numériquement un MathNode simplifié (après denormalize).

**Options** :

- Réutiliser le code existant dans `evaluate.ts` (les handlers de fonctions)
- Ou créer une nouvelle implémentation plus simple

### 2. Fonction `normalFormToNumber`

Alternative : évaluer directement la NormalForm sans passer par denormalize.

```typescript
function normalFormToNumber(form: NormalForm): number {
	// Évaluer numérateur
	const numValue = polynomialToNumber(form.numerator);
	// Évaluer dénominateur
	const denValue = polynomialToNumber(form.denominator);
	return numValue / denValue;
}

function polynomialToNumber(terms: NormalTerm[]): number {
	return terms.reduce((sum, term) => {
		const coefValue = algebraicToNumber(term.coefficient);
		const monomialValue = monomialToNumber(term.monomial); // À créer
		return sum + coefValue * monomialValue;
	}, 0);
}

function monomialToNumber(monomial: SymbolicFactor[]): number {
	return monomial.reduce((product, factor) => {
		const baseValue = evaluateNodeNumeric(factor.base); // Récursif
		const expValue = rationalToNumber(factor.exponent);
		return product * Math.pow(baseValue, expValue);
	}, 1);
}
```

### 3. Gestion des complexes

Le système actuel gère les complexes via `ComplexValueResult`.

- Comment intégrer avec NormalForm ?
- `AlgebraicTerm` a un flag `hasImaginaryUnit`

### 4. Gestion des erreurs

- Division par zéro
- Racine d'un nombre négatif (en mode réel)
- Logarithme d'un nombre négatif (en mode réel)
- Overflow numérique

### 5. Rétrocompatibilité

L'API de `evaluate` doit rester compatible avec les usages existants :

- `evaluate(node, { mode: 'exact' })` → maintenant retourne vraiment exact
- `evaluate(node, { mode: 'decimal' })` → comportement similaire

### 6. Type de retour

```typescript
interface EvalResult {
	value: NormalForm | number | ComplexValueResult; // Selon le mode
	node: MathNode; // Toujours le MathNode simplifié
	exact: boolean; // true si mode exact, false sinon
}
```

---

## Tests à écrire

```typescript
describe('evaluate refactored', () => {
	describe('mode exact', () => {
		it('returns exact √2', () => {
			const result = evaluate(parseLatex('\\sqrt{2}'), { mode: 'exact' });
			expect(result.exact).toBe(true);
			expect(toLatex(result.node)).toBe('\\sqrt{2}');
		});

		it('simplifies √4 to 2', () => {
			const result = evaluate(parseLatex('\\sqrt{4}'), { mode: 'exact' });
			expect(toLatex(result.node)).toBe('2');
		});

		it('simplifies cos(π/6) to √3/2', () => {
			const result = evaluate(parseLatex('\\cos(\\frac{\\pi}{6})'), { mode: 'exact' });
			expect(toLatex(result.node)).toBe('\\frac{\\sqrt{3}}{2}');
		});

		it('keeps cos(3) as opaque', () => {
			const result = evaluate(parseLatex('\\cos(3)'), { mode: 'exact' });
			expect(toLatex(result.node)).toBe('\\cos(3)');
		});

		it('combines like terms: cos(3)+cos(3) = 2cos(3)', () => {
			const result = evaluate(parseLatex('\\cos(3)+\\cos(3)'), { mode: 'exact' });
			expect(toLatex(result.node)).toBe('2\\cos(3)');
		});

		it('throws on free variables', () => {
			expect(() => evaluate(parseLatex('x + 1'), { mode: 'exact' })).toThrow(/free variables.*x/);
		});
	});

	describe('mode decimal', () => {
		it('evaluates √2 numerically', () => {
			const result = evaluate(parseLatex('\\sqrt{2}'), { mode: 'decimal' });
			expect(result.value).toBeCloseTo(Math.SQRT2, 10);
		});

		it('evaluates cos(3) numerically', () => {
			const result = evaluate(parseLatex('\\cos(3)'), { mode: 'decimal' });
			expect(result.value).toBeCloseTo(Math.cos(3), 10);
		});

		it('respects precision decimal places', () => {
			const result = evaluate(parseLatex('\\sqrt{2}'), {
				mode: 'decimal',
				precision: { type: 'decimal', digits: 2 }
			});
			expect(result.node.value).toBe('1.41');
		});
	});
});
```

---

## Fichiers à modifier/créer

| Fichier                                                      | Action                                      |
| ------------------------------------------------------------ | ------------------------------------------- |
| `src/lib/mathAST/eval/evaluate.ts`                           | Refactorer la fonction principale           |
| `src/lib/mathAST/eval/types.ts`                              | Ajouter `PrecisionType` si pas déjà importé |
| `src/lib/mathAST/eval/numeric.ts`                            | Créer `evaluateNodeNumeric` et helpers      |
| `src/lib/mathAST/eval/__tests__/evaluate-refactored.test.ts` | Tests                                       |
| `src/lib/mathAST/normal/index.ts`                            | Exporter les fonctions nécessaires          |

---

## Résumé

**Avant** : `evaluate` avec mode "exact" qui ne l'est pas vraiment.

**Après** :

1. Mode exact → `normalize()` + `denormalize()` → MathNode simplifié exact
2. Mode décimal → même chose + évaluation numérique via `Math.*`

**Bénéfice** : Une seule source de vérité pour les valeurs exactes (NormalForm), et un système cohérent.
