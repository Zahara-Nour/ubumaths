# Comparaison Détaillée : Pattern Matching MathAST vs Compute Engine

Ce document compare en profondeur les systèmes de pattern matching de MathAST et de Compute Engine.

## 1. Architecture Globale

### MathAST

**Fichiers principaux** :

- `pattern/types.ts` (787 lignes) - Types discriminés TypeScript
- `pattern/match.ts` (853 lignes) - Algorithme de matching
- `pattern/constraints.ts` - Évaluation des contraintes
- `pattern/builder.ts` (997 lignes) - API fluent `P` namespace
- `pattern/rule.ts` (413 lignes) - Système de règles
- `parser/custom/pattern-parser.ts` (469 lignes) - Parser Pratt
- `parser/custom/rule-parser.ts` (250 lignes) - Parser de règles

**Modèle** : **Séparation stricte Pattern ≠ MathNode**. Les patterns sont des templates abstraits avec types discriminés.

### Compute Engine

**Fichiers principaux** :

- `boxed-expression/match.ts` (436 lignes) - Matching intégré
- `boxed-expression/rules.ts` (905 lignes) - Système de règles
- `symbolic/simplify-rules.ts` (1458 lignes) - Bibliothèque de règles

**Modèle** : **Pattern = Expression avec wildcards**. Les patterns sont des `BoxedExpression` avec symboles `_prefixed`.

---

## 2. Syntaxe Naturelle (Parsing)

### MathAST

**Lettres = wildcards par défaut** (comme Compute Engine) :

```typescript
// Syntaxe règle - lettres sont des wildcards par défaut
parseRule('x + 0 -> x');
parseRule('x / x -> 1 ; x:nonzero');
parseRule('a^n * a^m -> a^(n+m) ; n:integer, m:integer');

// Syntaxe pattern
parsePattern('x + y'); // wildcards
parsePattern('n:integer + m:integer'); // wildcards avec contraintes
parsePattern('sin(x)^2 + cos(x)^2'); // fonctions
parsePattern('$x + 0'); // $x = variable littérale (rare)

// Séquences (préfixe underscore requis)
parsePattern('a + __rest'); // __rest = 1+ éléments
parsePattern('___opt'); // ___opt = 0+ éléments

// Note: _x (single underscore) est DEPRECATED - utiliser x directement
```

**Parser** : Pratt parser avec précédence d'opérateurs, gestion explicite des tokens.

### Compute Engine

```typescript
// Syntaxe règle LaTeX
'\\pi + a -> 2a; a > 0'
'a:positive -> 2a'
'a_{positive} -> 2a'

// Syntaxe objet
{
  match: ['Tan', '__x'],
  replace: ['Divide', ['Sin', '__x'], ['Cos', '__x']],
  condition: ({ __x }) => __x.isPositive
}
```

**Parser** : Utilise le parser LaTeX existant avec extension dynamique du dictionnaire.

### Comparaison

| Aspect               | MathAST                        | Compute Engine                 |
| -------------------- | ------------------------------ | ------------------------------ |
| Format               | Syntaxe mathématique ASCII     | LaTeX ou MathJSON              |
| Wildcards            | `x`, `a` (lettres = wildcards) | `a`, `b` (lettres = wildcards) |
| Underscore simple    | DEPRECATED (`_x` non supporté) | `_a` préfixe interne           |
| Séquences            | `__x` (1+), `___x` (0+)        | `__a` (0+), `___a` (1+)        |
| Variables littérales | `$x` (rare)                    | N/A                            |
| Contraintes inline   | `n:integer`                    | `a:integer` ou `a_{integer}`   |
| Conditions séparées  | `; x:nonzero`                  | `; a > 0` (prédicat complet)   |
| Parser               | Pratt dédié                    | Extension du parser LaTeX      |

---

## 3. Types de Wildcards

### MathAST

| Syntaxe Pattern | Builder      | Capture     | Binding Type                                     |
| --------------- | ------------ | ----------- | ------------------------------------------------ |
| `x` (lettre)    | `P._('x')`   | 1 nœud      | `MathNode`                                       |
| `__x`           | `P.__('x')`  | 1+ éléments | `SumSequenceBinding` ou `ProductSequenceBinding` |
| `___x`          | `P.___('x')` | 0+ éléments | `SumSequenceBinding` ou `ProductSequenceBinding` |

**Note** : La syntaxe `_x` (single underscore) est dépréciée. Utiliser `x` directement pour les wildcards simples.

**Particularité** : Les séquences préservent les métadonnées (signes pour sommes via `SignedTerm`).

```typescript
interface SumSequenceBinding {
	readonly kind: 'sum-sequence';
	readonly terms: readonly SignedTerm[]; // Préserve + ou -
}

interface ProductSequenceBinding {
	readonly kind: 'product-sequence';
	readonly factors: readonly MathNode[];
}
```

### Compute Engine

| Wildcard | Notation             | Capture                  |
| -------- | -------------------- | ------------------------ |
| `_`      | Anonyme              | 1 opérande (non capturé) |
| `_x`     | Nommé                | 1 opérande               |
| `__x`    | Séquence optionnelle | 0+ opérandes             |
| `___x`   | Séquence requise     | 1+ opérandes             |

**Binding** : Toujours `BoxedExpression`. Pour les séquences multiples, crée une expression `Sequence` ou réutilise l'opérateur associatif.

```typescript
// Si séquence vide
if (expr.operator === 'Add') value = ce.Zero;
else if (expr.operator === 'Multiply') value = ce.One;

// Si séquence multiple
value = ce.function(expr.operator, args, { canonical: false });
```

---

## 4. Système de Contraintes

### MathAST

**12 types de contraintes** avec composition logique :

```typescript
type PatternConstraint =
	| TypeConstraint // P.isType('number', 'variable')
	| NumberConstraint // P.isNumber()
	| VariableConstraint // P.isVariable()
	| PositiveConstraint // P.isPositive()
	| NegativeConstraint // P.isNegative()
	| NonzeroConstraint // P.isNonzero()
	| IntegerConstraint // P.isInteger()
	| FreeOfConstraint // P.isFreeOf('x', 'y')
	| CustomConstraint // P.custom(predicate, label)
	| AndConstraint // P.and(c1, c2)
	| OrConstraint // P.or(c1, c2)
	| NotConstraint // P.not(c)
	| NumericTypeConstraint; // P.isIntegerType(), P.isRationalType(), etc.
```

**NumericType** (spécifique à MathAST pour la pédagogie) :

```typescript
P.isIntegerType(); // Entier inféré
P.isRationalType(); // Rationnel (inclut entiers)
P.isAlgebraicType(); // Algébrique (√2, ∛5)
P.isTranscendentalType(); // Transcendant (π, e, sin(1))
P.isRealType(); // Réel
P.isComplexType(); // Complexe
```

### Compute Engine

**40+ conditions prédéfinies** avec hiérarchie de types :

```typescript
const CONDITIONS = {
  // Types de base
  boolean, string, number, symbol, expression,

  // Numériques
  numeric, integer, rational, irrational, real, complex, imaginary,

  // Signes
  positive, negative, nonnegative, nonpositive, notzero, notone,

  // Propriétés entières
  even, odd, prime, composite,

  // Finitude
  finite, infinite,

  // Symbolique
  constant, variable, function,

  // Relations
  relation, equation, inequality,

  // Collections
  collection, list, set, tuple, single, pair, triple,

  // Tenseurs
  scalar, tensor, vector, matrix,

  // Autres
  unit, dimension, angle, polynomial
};
```

**Hiérarchie** définie dans `ConditionParent` :

```typescript
const ConditionParent = {
	integer: 'real',
	rational: 'real',
	real: 'complex',
	positive: 'real',
	even: 'integer',
	prime: 'integer'
	// ...
};
```

### Comparaison

| Aspect                   | MathAST                        | Compute Engine           |
| ------------------------ | ------------------------------ | ------------------------ |
| Nombre de conditions     | 12 types + composables         | 40+ prédéfinis           |
| Composition logique      | `P.and()`, `P.or()`, `P.not()` | Via expressions logiques |
| Types numériques inférés | `NumericType` complet          | Non                      |
| Custom                   | `P.custom(fn)`                 | Non                      |
| Hiérarchie               | Non                            | `ConditionParent`        |
| Raccourcis LaTeX         | Non                            | `:>0`, `\in\Z`, etc.     |

---

## 5. Algorithme de Matching

### MathAST

**Matching structurel par dispatch** (`match.ts`) :

```typescript
export function match(pattern: Pattern, node: MathNode, bindings): MatchResult {
	switch (pattern.type) {
		case 'wildcard':
			return matchWildcard(pattern, node, bindings);
		case 'literal':
			return matchLiteral(pattern, node, bindings);
		case 'addition-pattern':
			return matchAddition(pattern, node, bindings);
		case 'subtraction-pattern':
			return matchSubtraction(pattern, node, bindings);
		case 'multiplication-pattern':
			return matchMultiplication(pattern, node, bindings);
		case 'sum-pattern':
			return matchSumPattern(pattern, node, bindings);
		case 'product-pattern':
			return matchProductPattern(pattern, node, bindings);
		// ... 15 types de patterns
	}
}
```

**Commutatitivé binaire** : Dual-order (essaie les 2 ordres)

```typescript
function matchAddition(pattern, node, bindings): MatchResult {
	// Essai ordre original
	const result1 = matchPair(pattern.left, pattern.right, node.left, node.right, bindings);
	if (result1.success) return result1;

	// Essai ordre inversé (commutatif)
	return matchPair(pattern.left, pattern.right, node.right, node.left, bindings);
}
```

**N-ary (SumPattern/ProductPattern)** : Combinaisons + permutations

```typescript
function matchSumPattern(pattern, node, bindings): MatchResult {
	const flatTerms = flattenSumShallow(node); // Aplatit a+b+c → [+a, +b, +c]
	const { singles, sequence } = categorizeElements(pattern.elements);

	// Essaie toutes les combinaisons de k termes parmi n
	for (const assignment of combinations(indices, k)) {
		// Essaie toutes les permutations (commutatif)
		for (const perm of permutations(assignment)) {
			const result = tryAssignment(flatTerms, singles, perm, sequence, bindings);
			if (result.success) return result;
		}
	}
	return failMatch();
}
```

### Compute Engine

**Matching unifié** (`match.ts`) :

```typescript
function matchOnce(expr, pattern, substitution, options): BoxedSubstitution | null {
	// Wildcard
	if (isWildcard(pattern)) return captureWildcard(wildcardName(pattern), expr, substitution);

	// Number
	if (pattern.numericValue !== null) {
		if (expr.numericValue === null) return null;
		if (pattern.isEqual(expr)) return substitution;
		return matchVariations(expr, pattern, substitution, options); // Variations implicites
	}

	// Symbol
	if (pattern.symbol !== null) {
		if (pattern.symbol === expr.symbol) return substitution;
		return matchVariations(expr, pattern, substitution, options);
	}

	// Function
	if (pattern.ops) {
		if (operator.startsWith('_')) {
			// Wildcard opérateur
			result = captureWildcard(operator, ce.box(expr.operator), substitution);
			result = matchArguments(expr, pattern.ops, result, options);
		} else if (operator === expr.operator) {
			// Même opérateur
			result = pattern.operatorDefinition.commutative
				? matchPermutation(expr, pattern, substitution, options)
				: matchArguments(expr, pattern.ops, substitution, options);
		}
	}
}
```

**Permutations exhaustives** (commutativité) :

```typescript
function matchPermutation(expr, pattern, substitution, options): BoxedSubstitution | null {
	const patterns = permutations<BoxedExpression>(pattern.ops!); // Génère TOUTES les permutations
	for (const pat of patterns) {
		const result = matchArguments(expr, pat, substitution, options);
		if (result !== null) return result;
	}
	return null;
}
```

**Variations implicites** (feature unique) :

```typescript
function matchVariations(expr, pattern, substitution, options): BoxedSubstitution | null {
	// x -> 0+x
	if (operator === 'Add') {
		result = matchVariation('Add', [0, expr]);
		if (result) return result;
	}

	// x -> 1*x
	if (operator === 'Multiply') {
		result = matchVariation('Multiply', [1, expr]);
		if (result) return result;
		// -x -> -1*x
		if (expr.operator === 'Negate') {
			result = matchVariation('Multiply', [-1, expr.op1]);
		}
	}

	// Square(x) <-> Power(x, 2)
	if (operator === 'Square') {
		result = matchVariation('Power', [expr, 2]);
	}

	// Exp(x) <-> Power(E, x)
	if (operator === 'Exp') {
		result = matchVariation('Power', [ce.E, expr]);
	}
	// ...
}
```

### Complexité Algorithmique

| Opération                     | MathAST         | Compute Engine             |
| ----------------------------- | --------------- | -------------------------- |
| Wildcard simple               | O(1)            | O(1)                       |
| Littéral                      | O(n) hash       | O(n) compare               |
| Binaire commutatif            | O(2) tentatives | O(2) tentatives            |
| N-ary commutatif (n éléments) | O(C(n,k) × k!)  | O(n!) permutations         |
| Avec variations               | N/A             | O(variations × complexité) |

**Note** : MathAST utilise `combinations()` puis `permutations()` sur le sous-ensemble, CE génère toutes les permutations directement.

---

## 6. Système de Règles

### MathAST

**Types** :

```typescript
interface Rule {
	readonly name: string;
	readonly pattern: Pattern;
	readonly replacement: Pattern | ((bindings: MatchBindings) => MathNode);
	readonly condition?: (bindings: MatchBindings) => boolean;
	readonly priority?: number;
}
```

**Création** :

```typescript
// Via builder
P.rule(P.add(P._('x'), P.num(0)), P._('x'), { name: 'additive-identity', priority: 100 });

// Via parser (lettres = wildcards par défaut)
P.parseRule('x + 0 -> x');
P.parseRule('x / x -> 1 ; x:nonzero', { name: 'self-division' });
```

**Application** :

```typescript
applyRule(rule, node); // Une seule application top-level
applyRuleDeep(rule, node); // Application récursive (bottom-up)
applyRules(rules, node, maxIter); // Multiple règles jusqu'à point fixe
```

### Compute Engine

**Types** :

```typescript
interface BoxedRule {
	_tag: 'boxed-rule';
	match: BoxedExpression | undefined;
	replace: BoxedExpression | RuleReplaceFunction | RuleFunction;
	condition: RuleConditionFunction | undefined;
	useVariations?: boolean;
	id: string;
	onMatch?: (rule, expr, result) => void;
	onBeforeMatch?: (rule, expr) => void;
}

interface BoxedRuleSet {
	rules: BoxedRule[];
}
```

**Création** :

```typescript
// Via LaTeX
'\\pi + a -> 2a; a > 0'
'a:positive + b:negative -> c'

// Via objet
{
  match: ['Add', '_a', '_b'],
  replace: ['Multiply', 2, '_a'],
  condition: ({ _a, _b }) => _a.isPositive && _b.isNegative
}

// Via fonction pure
(x) => x.operator === 'Add' ? { value: add(...x.ops), because: 'addition' } : undefined
```

**Application** :

```typescript
expr.replace(rule); // Application unique
replace(expr, rules, { iterationLimit: 10 }); // Multiple avec limite
replace(expr, rules, { recursive: true }); // Récursif
replace(expr, rules, { once: true }); // Premier match seulement
```

### Comparaison

| Aspect               | MathAST                  | Compute Engine                   |
| -------------------- | ------------------------ | -------------------------------- |
| Priorités            | `priority: number`       | Non                              |
| Noms                 | `name: string`           | `id: string`                     |
| Hooks debug          | Non                      | `onMatch`, `onBeforeMatch`       |
| Variations           | Non                      | `useVariations: boolean`         |
| Limite itérations    | `maxIterations` param    | `iterationLimit` option          |
| Détection boucles    | Via `nodesEqual()`       | Via `isSame()`                   |
| Replacement fonction | `(bindings) => MathNode` | `(expr, sub) => BoxedExpression` |
| RuleStep tracking    | Non                      | `{ value, because }`             |

---

## 7. Bibliothèques de Règles Pré-construites

### MathAST

**Localisation** : `pattern/rule-sets/`

```typescript
// arithmetic.ts
arithmeticRules: [
	// Identités additives
	P.rule(P.add(P._('x'), P.num(0)), P._('x')),
	P.rule(P.sub(P._('x'), P.num(0)), P._('x')),
	// Identités multiplicatives
	P.rule(P.mul(P._('x'), P.num(1)), P._('x')),
	P.rule(P.mul(P._('x'), P.num(0)), P.num(0)),
	// Division
	P.rule(P.div(P._('x'), P.num(1)), P._('x'))
	// ...~20 règles
];

// powers.ts
powerRules: [
	P.rule(P.pow(P._('x'), P.num(0)), P.num(1)),
	P.rule(P.pow(P._('x'), P.num(1)), P._('x'))
	// ...~10 règles
];
```

### Compute Engine

**Localisation** : `symbolic/simplify-rules.ts` (~1000 lignes de règles)

```typescript
export const SIMPLIFY_RULES: Rule[] = [
	// Golden ratio
	'\\varphi -> \\frac{1+\\sqrt{5}}{2}',

	// Fonctions de simplification
	simplifyRelationalOperator,
	simplifySystemOfEquations,
	(x) => (expand(x) ? { value: expand(x), because: 'expand' } : undefined),

	// Trigonométrie (~50 règles)
	'\\sin(-x) -> -\\sin(x)',
	'\\cos(-x) -> \\cos(x)',
	'\\sin(x)^2 -> \\frac{1 - \\cos(2x)}{2}',
	'\\sin(x) * \\cos(x) -> \\frac{1}{2} \\sin(2x)',

	// Hyperboliques
	'\\arcsinh(x) -> \\ln(x+\\sqrt{x^2+1})',
	'\\arccosh(x) -> \\ln(x+\\sqrt{x^2-1})',

	// Infinity/NaN (~100 règles)
	'\\ln(\\infty) -> \\infty',
	'\\arctan(\\infty) -> \\frac{\\pi}{2}',
	{ match: '0^x', replace: 'NaN', condition: (ids) => ids._x.isNonPositive },

	// Absolute value (~30 règles)
	'|-x| -> |x|',
	{ match: '|x|', replace: 'x', condition: (ids) => ids._x.isNonNegative },

	// Logarithmes (~30 règles)
	'\\ln(x)+\\ln(y) -> \\ln(x*y)',
	'e^{\\ln(x)} -> x'

	// ...
];
```

### Comparaison

| Aspect               | MathAST                  | Compute Engine                      |
| -------------------- | ------------------------ | ----------------------------------- |
| Nombre de règles     | ~50                      | ~200+                               |
| Catégories           | Arithmétique, puissances | Trig, log, infinity, abs, relations |
| Format               | Builder `P.rule()`       | LaTeX ou objets                     |
| Fonctions règles     | Non                      | Oui (expand, factor, etc.)          |
| Gestion NaN/Infinity | Non                      | Extensive                           |

---

## 8. Features Uniques

### MathAST uniquement

1. **SignedTerm** pour sommes - préserve les signes dans les séquences :

   ```typescript
   interface SignedTerm {
   	sign: '+' | '-';
   	term: MathNode;
   }
   ```

2. **NumericType pédagogique** - inférence de type numérique :

   ```typescript
   P.isIntegerType(); // √4 → integer
   P.isTranscendentalType(); // sin(1) → transcendental
   ```

3. **Composition logique explicite** :

   ```typescript
   P.and(P.isInteger(), P.isPositive(), P.not(P.isType('variable')));
   ```

4. **Pattern/Expression séparation** - type-safety compile-time

5. **Pratt parser dédié** - syntaxe ASCII indépendante de LaTeX

### Compute Engine uniquement

1. **Variations implicites** - matching flexible :

   ```typescript
   x     matches    0 + x
   x     matches    1 * x
   -x    matches    -1 * x
   x^2   matches    Square(x)
   e^x   matches    Exp(x)
   ```

2. **Wildcard opérateur** - capture le nom de fonction :

   ```typescript
   ['_f', '__args']; // Capture n'importe quelle fonction
   ```

3. **Hooks de debug** :

   ```typescript
   { onMatch: (rule, expr, result) => console.log(...) }
   ```

4. **Shortcuts LaTeX** pour conditions :

   ```typescript
   ':>0', ':\\in\\Z', ':\\neq0', '_{positive}';
   ```

5. **Intégration native** avec `BoxedExpression.match()` et `BoxedExpression.replace()`

---

## 9. Résumé Comparatif

| Critère                    | MathAST                             | Compute Engine               |
| -------------------------- | ----------------------------------- | ---------------------------- |
| **Architecture**           | Patterns séparés, types discriminés | Patterns = expressions       |
| **Type-safety**            | Fort (TypeScript unions)            | Faible (conventions nommage) |
| **Syntaxe naturelle**      | `x + 0 -> x`                        | `a + 0 -> a` (LaTeX)         |
| **Contraintes**            | 12 types + composition logique      | 40+ prédéfinis + hiérarchie  |
| **NumericType**            | Complet (pédagogique)               | Non                          |
| **Variations implicites**  | Non                                 | Oui (x → 0+x, x → 1\*x)      |
| **Wildcard opérateur**     | Non                                 | Oui (`_f`)                   |
| **Séquences typées**       | Oui (SignedTerm)                    | Non (Sequence générique)     |
| **Règles pré-construites** | ~50                                 | ~200+                        |
| **Priorités règles**       | Oui                                 | Non                          |
| **Hooks debug**            | Non                                 | Oui                          |
| **Performance n-ary**      | O(C(n,k)×k!)                        | O(n!)                        |

---

## 10. Recommandations d'Usage

### Utiliser MathAST quand :

- Type-safety critique
- Feedback pédagogique (NumericType)
- Préservation des signes dans les sommes
- Contraintes composées complexes
- Priorités entre règles nécessaires

### Utiliser Compute Engine quand :

- Syntaxe LaTeX préférée
- Variations implicites souhaitées (matching flexible)
- Large bibliothèque de règles requise
- Intégration avec l'écosystème CE existant
- Wildcard sur les noms de fonction

---

## Fichiers de Référence

### MathAST

| Fichier                                           | Description                |
| ------------------------------------------------- | -------------------------- |
| `src/lib/mathAST/pattern/types.ts`                | Types et interfaces        |
| `src/lib/mathAST/pattern/match.ts`                | Algorithme de matching     |
| `src/lib/mathAST/pattern/constraints.ts`          | Évaluation des contraintes |
| `src/lib/mathAST/pattern/builder.ts`              | API `P` namespace          |
| `src/lib/mathAST/pattern/rule.ts`                 | Système de règles          |
| `src/lib/mathAST/parser/custom/pattern-parser.ts` | Parser Pratt               |
| `src/lib/mathAST/parser/custom/rule-parser.ts`    | Parser de règles           |

### Compute Engine

| Fichier                                                               | Description  |
| --------------------------------------------------------------------- | ------------ |
| `extern/compute-engine/src/compute-engine/boxed-expression/match.ts`  | Matching     |
| `extern/compute-engine/src/compute-engine/boxed-expression/rules.ts`  | Règles       |
| `extern/compute-engine/src/compute-engine/symbolic/simplify-rules.ts` | Bibliothèque |
