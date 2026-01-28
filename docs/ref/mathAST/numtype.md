# Numeric Type System

Type inference and classification for mathematical expressions.

## Overview

The numeric type system (`numtype`) provides:

- **Type inference** for mathematical expressions
- **Type hierarchy** following mathematical set inclusion
- **Type algebra** with lattice operations (join, meet)
- **Pattern constraints** for type-based matching
- **French pedagogical feedback** for student responses

## Type Hierarchy

```
complex
   │
   └── real
         ├── transcendental (π, e, sin(1), ln(2))
         └── algebraic
               ├── rational
               │     └── integer
               └── irrational_algebraic (√2, ∛5)
```

Every type is a subtype of those above it:

- `integer ⊂ rational ⊂ algebraic ⊂ real ⊂ complex`
- `irrational_algebraic ⊂ algebraic ⊂ real ⊂ complex`
- `transcendental ⊂ real ⊂ complex`

## Quick Start

```typescript
import { inferType, isIntegerType, isSubtype, describeType, P } from '$lib/mathAST';
import { parseLatex } from '$lib/mathAST';

// Infer type of expressions
inferType(parseLatex('5')); // { base: 'integer', sign: 'positive' }
inferType(parseLatex('1/2')); // { base: 'rational' }
inferType(parseLatex('\\sqrt{2}')); // { base: 'irrational_algebraic' }
inferType(parseLatex('\\pi')); // { base: 'transcendental' }

// Type predicates
isIntegerType(parseLatex('5')); // true
isIntegerType(parseLatex('5.5')); // false

// Type algebra
isSubtype('integer', 'rational'); // true
isSubtype('real', 'integer'); // false

// Pattern matching with type constraints
const pattern = P._('n', P.isIntegerType());
matches(pattern, parseLatex('5')); // true
matches(pattern, parseLatex('5.5')); // false

// French pedagogical feedback
describeType({ base: 'integer', sign: 'positive' });
// "un nombre entier positif"
```

## Core Types

### NumericType

Base type classification:

```typescript
type NumericType =
	| 'integer' // 0, 1, -5, 42
	| 'rational' // 1/2, 3/4, 0.5
	| 'irrational_algebraic' // √2, ∛5, (1+√5)/2
	| 'algebraic' // rational ∪ irrational_algebraic
	| 'transcendental' // π, e, sin(1), ln(2)
	| 'real' // all real numbers
	| 'complex' // a + bi
	| 'unknown'; // type cannot be determined
```

### MathType

Full type information with metadata:

```typescript
interface MathType {
	readonly base: NumericType;
	readonly sign?: 'positive' | 'negative' | 'zero' | 'nonzero' | 'unknown';
	readonly finite?: boolean;
}
```

### TypeContext

Context for variable type bindings:

```typescript
interface TypeContext {
	readonly variables?: ReadonlyMap<string, NumericType>;
	readonly strict?: boolean; // unknown vs real default
}

// Example: declare n as integer
const ctx = { variables: new Map([['n', 'integer']]) };
inferType(parseLatex('2n + 1'), ctx); // { base: 'integer' }
```

## Type Inference

### inferType(node, ctx?)

Infers the numeric type of an expression:

```typescript
import { inferType, parseLatex } from '$lib/mathAST';

// Literals
inferType(parseLatex('5')); // integer, positive
inferType(parseLatex('-3')); // integer, negative
inferType(parseLatex('0')); // integer, zero
inferType(parseLatex('3.14')); // real

// Constants
inferType(parseLatex('\\pi')); // transcendental, positive
inferType(parseLatex('e')); // transcendental, positive

// Arithmetic
inferType(parseLatex('2 + 3')); // integer
inferType(parseLatex('1/2 + 1/3')); // rational
inferType(parseLatex('1/2')); // rational

// Roots
inferType(parseLatex('\\sqrt{4}')); // integer (perfect square)
inferType(parseLatex('\\sqrt{2}')); // irrational_algebraic
inferType(parseLatex('\\sqrt{-1}')); // complex

// Functions
inferType(parseLatex('\\sin(1)')); // transcendental
inferType(parseLatex('\\floor{3.7}')); // integer
inferType(parseLatex('\\abs{-5}')); // integer, positive
```

### Inference Rules

| Expression                   | Type                                         |
| ---------------------------- | -------------------------------------------- |
| Integer literals (`5`, `-3`) | integer                                      |
| Decimal numbers (`3.14`)     | real                                         |
| `π`, `e`                     | transcendental                               |
| `integer + integer`          | integer                                      |
| `integer + rational`         | rational                                     |
| `integer / integer`          | rational                                     |
| `integer ^ positive_integer` | integer                                      |
| `integer ^ negative_integer` | rational                                     |
| `√(positive_integer)`        | integer (if perfect) or irrational_algebraic |
| `√(negative)`                | complex                                      |
| `sin`, `cos`, `exp`, `ln`    | transcendental                               |
| `floor`, `ceil`, `round`     | integer                                      |
| `abs(x)`                     | same base, sign = nonnegative                |

## Type Algebra

### isSubtype(t1, t2)

Tests if t1 is a subtype of t2:

```typescript
import { numTypeIsSubtype } from '$lib/mathAST';

numTypeIsSubtype('integer', 'rational'); // true
numTypeIsSubtype('integer', 'real'); // true
numTypeIsSubtype('rational', 'integer'); // false
numTypeIsSubtype('transcendental', 'algebraic'); // false
```

### join(t1, t2)

Least upper bound (smallest common supertype):

```typescript
import { numTypeJoin } from '$lib/mathAST';

numTypeJoin('integer', 'rational'); // 'rational'
numTypeJoin('integer', 'transcendental'); // 'real'
numTypeJoin('algebraic', 'transcendental'); // 'real'
```

### meet(t1, t2)

Greatest lower bound (largest common subtype):

```typescript
import { numTypeMeet } from '$lib/mathAST';

numTypeMeet('rational', 'real'); // 'rational'
numTypeMeet('algebraic', 'rational'); // 'rational'
numTypeMeet('transcendental', 'algebraic'); // 'unknown' (no common subtype)
```

## Type Predicates

Convenience functions that combine inference and checking:

```typescript
import {
	isIntegerType,
	isRationalType,
	isAlgebraicType,
	isRealType,
	isTranscendentalType,
	isComplexType,
	isPositiveType,
	isNegativeType,
	isZeroType,
	isNonzeroType
} from '$lib/mathAST';

const five = parseLatex('5');
const sqrt2 = parseLatex('\\sqrt{2}');
const pi = parseLatex('\\pi');

isIntegerType(five); // true
isRationalType(five); // true (integer ⊂ rational)
isAlgebraicType(sqrt2); // true
isTranscendentalType(pi); // true
isPositiveType(five); // true
isNonzeroType(parseLatex('0')); // false
```

## Pattern Integration

### NumericTypeConstraint

Use type constraints in pattern matching:

```typescript
import { P, matches, parseLatex } from '$lib/mathAST';

// Match only integers
const intPattern = P._('n', P.isIntegerType());
matches(intPattern, parseLatex('5')); // true
matches(intPattern, parseLatex('5.5')); // false
matches(intPattern, parseLatex('\\pi')); // false

// Match rationals (includes integers)
const ratPattern = P._('q', P.isRationalType());
matches(ratPattern, parseLatex('5')); // true
matches(ratPattern, parseLatex('1/2')); // true
matches(ratPattern, parseLatex('\\sqrt{2}')); // false

// Match transcendentals
const transcPattern = P._('t', P.isTranscendentalType());
matches(transcPattern, parseLatex('\\pi')); // true
matches(transcPattern, parseLatex('\\sin(1)')); // true
matches(transcPattern, parseLatex('2')); // false
```

### Available Constraint Builders

```typescript
P.isIntegerType(); // integer only
P.isRationalType(); // rational (includes integer)
P.isAlgebraicType(); // algebraic (includes rational, irrational_algebraic)
P.isRealType(); // real (includes all above + transcendental)
P.isTranscendentalType(); // transcendental only
P.isComplexType(); // complex (includes all)

// With strict mode (exact match, no subtypes)
P.isIntegerType(true); // integer only, not "rational that happens to be integer"
```

### Pattern String Syntax

```typescript
import { parseRule } from '$lib/mathAST';

// Numeric type constraints in pattern strings
parseRule('_n:integerType => _n + 1'); // n must be integer type
parseRule('_q:rationalType => _q * 2'); // q must be rational type
parseRule('_t:transcendentalType => 0'); // t must be transcendental
```

## French Pedagogical Feedback

### describeType(type)

Simple French description:

```typescript
import { describeType } from '$lib/mathAST';

describeType({ base: 'integer' });
// "un nombre entier"

describeType({ base: 'integer', sign: 'positive' });
// "un nombre entier positif"

describeType({ base: 'transcendental', sign: 'positive' });
// "un nombre transcendant positif"

describeType({ base: 'real', finite: false });
// "un nombre réel (infini)"
```

### describeTypeDetailed(type)

Full description with examples:

```typescript
import { describeTypeDetailed } from '$lib/mathAST';

const desc = describeTypeDetailed({ base: 'rational' });
// {
//   id: 'rational',
//   nameFr: 'Rationnel',
//   descriptionFr: "Un nombre rationnel peut s'écrire comme...",
//   examples: ['1/2', '3/4', '-2/3', '0.5', '0.333...'],
//   parents: ['algebraic', 'real', 'complex'],
//   children: ['integer']
// }
```

### getTypeMismatchMessage(actual, expected)

Error message for type validation:

```typescript
import { getTypeMismatchMessage } from '$lib/mathAST';

getTypeMismatchMessage({ base: 'transcendental' }, 'integer');
// "Attendu : un nombre entier. Obtenu : un nombre transcendant (π, e, sin(1)...)."

getTypeMismatchMessage({ base: 'rational', sign: 'negative' }, 'integer');
// "Attendu : un nombre entier. Obtenu : un nombre rationnel négatif (1/2, 3/4, -2/3...)."
```

### getTypeHint(actual, expected)

Pedagogical hints for common mistakes:

```typescript
import { getTypeHint } from '$lib/mathAST';

getTypeHint('rational', 'integer');
// "Astuce : une fraction comme 1/2 est rationnelle, pas entière."

getTypeHint('irrational_algebraic', 'integer');
// "Astuce : √2 est irrationnel, donc pas entier."

getTypeHint('transcendental', 'rational');
// "Astuce : π ne peut pas s'écrire comme fraction."
```

### Other Feedback Functions

```typescript
import {
	getTypeName,
	getTypeNameWithArticle,
	describeTypeRelation,
	getTypeExamples,
	formatTypeExamples
} from '$lib/mathAST';

getTypeName('integer'); // "Entier"
getTypeNameWithArticle('integer'); // "un entier"

describeTypeRelation('integer', 'rational');
// "Un entier est un cas particulier de rationnel."

getTypeExamples('transcendental');
// ['π', 'e', 'sin(1)', 'ln(2)', 'e^π']

formatTypeExamples('integer', 3);
// "Exemples : 0, 1, -5"
```

## Variable Context

Declare variable types for accurate inference:

```typescript
import { inferType, EMPTY_CONTEXT } from '$lib/mathAST';

// Without context: n defaults to 'real'
inferType(parseLatex('2n + 1'));
// { base: 'real' }

// With context: n is integer
const ctx = { variables: new Map([['n', 'integer']]) };
inferType(parseLatex('2n + 1'), ctx);
// { base: 'integer' }

// Strict mode: unknown variables → 'unknown'
const strictCtx = { strict: true };
inferType(parseLatex('x + 1'), strictCtx);
// { base: 'unknown' }
```

## Caching

Type inference uses WeakMap caching per context:

```typescript
import { clearTypeCache, clearAllTypeCache } from '$lib/mathAST';

// Clear cache for specific context
clearTypeCache(myContext);

// Clear all caches
clearAllTypeCache();
```

## API Reference

### Constants

```typescript
import {
	EMPTY_CONTEXT, // Default empty context
	UNKNOWN_TYPE, // { base: 'unknown' }
	INTEGER_TYPE, // { base: 'integer' }
	RATIONAL_TYPE, // { base: 'rational' }
	REAL_TYPE, // { base: 'real' }
	COMPLEX_TYPE, // { base: 'complex' }
	TRANSCENDENTAL_TYPE, // { base: 'transcendental' }
	IRRATIONAL_ALGEBRAIC_TYPE,
	ALGEBRAIC_TYPE
} from '$lib/mathAST';
```

### Type Algebra Functions

| Function                   | Description                |
| -------------------------- | -------------------------- |
| `numTypeIsSubtype(t1, t2)` | Is t1 a subtype of t2?     |
| `areCompatible(t1, t2)`    | Can t1 and t2 be combined? |
| `numTypeJoin(t1, t2)`      | Least upper bound          |
| `numTypeMeet(t1, t2)`      | Greatest lower bound       |
| `joinAll(types)`           | Join multiple types        |
| `meetAll(types)`           | Meet multiple types        |
| `getParents(type)`         | Direct supertypes          |
| `getAncestors(type)`       | All supertypes             |
| `getLevel(type)`           | Depth in hierarchy         |
| `isLeafType(type)`         | Has no subtypes?           |

### Inference Functions

| Function                | Description              |
| ----------------------- | ------------------------ |
| `inferType(node, ctx?)` | Infer type of expression |
| `clearTypeCache(ctx?)`  | Clear inference cache    |
| `clearAllTypeCache()`   | Clear all caches         |

### Predicate Functions

| Function                           | Description                   |
| ---------------------------------- | ----------------------------- |
| `isIntegerType(node, ctx?)`        | Is expression integer?        |
| `isRationalType(node, ctx?)`       | Is expression rational?       |
| `isAlgebraicType(node, ctx?)`      | Is expression algebraic?      |
| `isRealType(node, ctx?)`           | Is expression real?           |
| `isTranscendentalType(node, ctx?)` | Is expression transcendental? |
| `isComplexType(node, ctx?)`        | Is expression complex?        |
| `isPositiveType(node, ctx?)`       | Is expression positive?       |
| `isNegativeType(node, ctx?)`       | Is expression negative?       |
| `isZeroType(node, ctx?)`           | Is expression zero?           |
| `isNonzeroType(node, ctx?)`        | Is expression nonzero?        |
| `isFiniteType(node, ctx?)`         | Is expression finite?         |
| `hasType(node, type, ctx?)`        | Has specific type?            |
| `isSubtypeOf(node, type, ctx?)`    | Is subtype of type?           |
| `getType(node, ctx?)`              | Get full MathType             |
| `getBaseType(node, ctx?)`          | Get base NumericType          |

### French Feedback Functions

| Function                                   | Description              |
| ------------------------------------------ | ------------------------ |
| `describeType(type)`                       | Simple description       |
| `describeTypeDetailed(type)`               | Full TypeDescription     |
| `getTypeName(type)`                        | French name              |
| `getTypeNameWithArticle(type)`             | Name with article        |
| `describeTypeRelation(t1, t2)`             | Relationship description |
| `getTypeMismatchMessage(actual, expected)` | Error message            |
| `getTypeHint(actual, expected)`            | Pedagogical hint         |
| `getTypeExamples(type)`                    | Example expressions      |
| `formatTypeExamples(type, max?)`           | Formatted examples       |

## See Also

- [Pattern Matching](./patterns.md) - Using type constraints in patterns
- [Evaluation](./evaluation.md) - Numeric evaluation
- [Domain of Definition](./domain.md) - Domain constraints
