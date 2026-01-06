# CAS Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              UbuMaths CAS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         User Interface Layer                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │ MathLive    │  │ ReplInput   │  │ AstDrawer   │  │ Calculator  │  │  │
│  │  │ (LaTeX)     │  │ (Terminal)  │  │ (Visual)    │  │ (Feature)   │  │  │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  │  │
│  └─────────┼────────────────┼────────────────┼────────────────┼─────────┘  │
│            │                │                │                │            │
│  ┌─────────▼────────────────▼────────────────▼────────────────▼─────────┐  │
│  │                         REPL Engine Layer                             │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │  │  WebReplEngine  ─────▶  CommandRegistry  ─────▶  Commands       │ │  │
│  │  │                        ┌──────────────────────────────────────┐ │ │  │
│  │  │                        │ parse, tree, latex, simplify, normal │ │ │  │
│  │  │                        │ eval, let, def, diff, taylor, etc.   │ │ │  │
│  │  │                        └──────────────────────────────────────┘ │ │  │
│  │  └─────────────────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│  ┌─────────────────────────────────▼─────────────────────────────────────┐  │
│  │                         MathAST Core Layer                             │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────┐  │  │
│  │  │  Parsing   │  │ Normal-    │  │ Differen-  │  │  Evaluation    │  │  │
│  │  │  (LaTeX,   │  │ ization    │  │ tiation    │  │  (Exact,       │  │  │
│  │  │   Custom)  │  │ (Canonical)│  │ (Symbolic) │  │   Decimal)     │  │  │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └───────┬────────┘  │  │
│  │        │               │               │                 │           │  │
│  │  ┌─────▼───────────────▼───────────────▼─────────────────▼───────┐  │  │
│  │  │                    MathNode (Immutable AST)                    │  │  │
│  │  │  ┌─────────────────────────────────────────────────────────┐  │  │  │
│  │  │  │  NumberNode | VariableNode | GreekLetterNode | HoleNode │  │  │  │
│  │  │  │  AdditionNode | SubtractionNode | MultiplicationNode    │  │  │  │
│  │  │  │  DivisionNode | SuperscriptNode | FunctionNode          │  │  │  │
│  │  │  │  RelationNode | UnitNode | CompositionNode | ...        │  │  │  │
│  │  │  └─────────────────────────────────────────────────────────┘  │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         TinyCAS (Legacy) Layer                         │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────┐  │  │
│  │  │  Lexer     │  │  Parser    │  │  Normal    │  │  Evaluate      │  │  │
│  │  │            │  │  (Pratt)   │  │  Form      │  │  (Decimal.js)  │  │  │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Relationships

### 1. MathAST (Primary System)

**Location**: `src/lib/mathAST/`

The modern CAS implementation with:

| Component           | Location           | Purpose                                          |
| ------------------- | ------------------ | ------------------------------------------------ |
| **Types**           | `types.ts`         | Immutable AST node definitions                   |
| **Factory**         | `factory.ts`       | Node creation functions                          |
| **Exp Wrapper**     | `exp.ts`           | Fluent API for building/manipulating expressions |
| **Parsing**         | `parser/`          | LaTeX and custom format parsers                  |
| **Normalization**   | `normal/`          | Canonical form algorithms                        |
| **Differentiation** | `differentiation/` | Symbolic calculus                                |
| **Evaluation**      | `eval/`            | Numeric and symbolic evaluation                  |
| **Units**           | `units/`           | Physical unit handling                           |
| **CLI**             | `cli/`             | REPL and command system                          |

### 2. TinyCAS (Legacy System)

**Location**: `extern/new-tinymath/packages/tinycas/`

The original CAS with:

| Component        | Location                | Purpose                    |
| ---------------- | ----------------------- | -------------------------- |
| **math.ts**      | `src/math/math.ts`      | Expression construction    |
| **lexer.ts**     | `src/math/lexer.ts`     | Tokenization               |
| **parser.ts**    | `src/math/parser.ts`    | Pratt parser               |
| **normal.ts**    | `src/math/normal.ts`    | Normal form                |
| **transform.ts** | `src/math/transform.ts` | Expression transformations |
| **evaluate.ts**  | `src/math/evaluate.ts`  | Numeric evaluation         |
| **compare.ts**   | `src/math/compare.ts`   | Expression ordering        |
| **unit.ts**      | `src/math/unit.ts`      | Physical units             |
| **fraction.ts**  | `src/math/fraction.ts`  | Rational arithmetic        |

## Data Flow

### Expression Processing Pipeline

```
Input (LaTeX/Custom)
        │
        ▼
┌───────────────┐
│    Lexer      │ ──▶ Token stream
└───────┬───────┘
        │
        ▼
┌───────────────┐
│    Parser     │ ──▶ MathNode AST
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ Simplify/     │ ──▶ Simplified AST (pattern-based)
│ Rules         │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│  Normalize    │ ──▶ NormalForm (canonical representation)
└───────┬───────┘
        │
        ├──────────────────────────────────┐
        ▼                                  ▼
┌───────────────┐                 ┌───────────────┐
│   Evaluate    │                 │  Differentiate│
│   (Numeric)   │                 │   (Symbolic)  │
└───────┬───────┘                 └───────┬───────┘
        │                                 │
        ▼                                 ▼
    Result                           MathNode
```

### Normal Form Structure

The normal form is a canonical representation for equivalence testing:

```
NormalForm = {
    numerator: NormalTerm[]      // Polynomial numerator
    denominator: NormalTerm[]    // Polynomial denominator
    hash: string                 // Canonical hash for quick comparison
}

NormalTerm = {
    coefficient: AlgebraicCoefficient  // Handles radicals
    monomial: SymbolicFactor[]         // Variable powers
}

AlgebraicCoefficient = {
    terms: RadicalTerm[]   // Sum of rational*radical products
}

RadicalTerm = {
    rational: Rational     // n/d (BigInt)
    radicals: Radical[]    // sqrt(n), cbrt(n), etc.
}
```

## Key Design Principles

### 1. Immutability

All MathNode types are `readonly`. Operations return new nodes:

```typescript
// Good - returns new node
const newNode = add(oldNode, number('5'));

// The AST is never mutated
```

### 2. Type Safety

Discriminated unions with exhaustive pattern matching:

```typescript
function process(node: MathNode): string {
	switch (node.type) {
		case 'number':
			return node.value;
		case 'variable':
			return node.name;
		// ... all cases handled
		default: {
			const _exhaustive: never = node;
			return _exhaustive;
		}
	}
}
```

### 3. Separation of Concerns

| Layer             | Responsibility              |
| ----------------- | --------------------------- |
| **Types**         | Define AST structure        |
| **Factory**       | Create valid nodes          |
| **Parser**        | Input → AST                 |
| **Generator**     | AST → Output (LaTeX)        |
| **Normalization** | Canonical form              |
| **Operations**    | Differentiation, evaluation |

### 4. Lazy Evaluation

Normal forms are computed on demand and cached:

```typescript
class Exp {
	#cachedNormal?: NormalForm;

	get normal(): NormalForm {
		if (!this.#cachedNormal) {
			this.#cachedNormal = normalize(this.#node);
		}
		return this.#cachedNormal;
	}
}
```

## Integration Points

### With UI Components

```svelte
<!-- ReplContainer.svelte -->
<script>
	import { replStore } from '$lib/stores/repl.svelte';
	import { WebReplEngine } from '$lib/mathAST/cli/web';
</script>

<ReplInput onSubmit={engine.execute} />
<ReplOutput history={replStore.history} />
```

### With MathLive

```svelte
<script>
	import { parseLatex } from '$lib/mathAST/parser';

	function handleInput(latex: string) {
		const ast = parseLatex(latex);
		// Process AST...
	}
</script>

<math-field onchange={(e) => handleInput(e.target.value)} />
```

### With Question System

```typescript
// Validate student answer
import { Exp } from '$lib/mathAST';

function checkAnswer(expected: string, student: string): boolean {
	const expectedExp = Exp.parse(expected);
	const studentExp = Exp.parse(student);
	return expectedExp.isEquivalent(studentExp);
}
```

## Performance Considerations

### Hashing for Equivalence

Canonical hashes enable O(1) equivalence checking:

```typescript
const a = Exp.parse('x + y');
const b = Exp.parse('y + x');

// Fast comparison via hash
a.hash === b.hash; // true
```

### BigInt for Exact Arithmetic

Rational arithmetic uses BigInt for arbitrary precision:

```typescript
type Rational = { n: bigint; d: bigint }; // numerator/denominator

// No floating-point errors
const third = rational(1n, 3n);
const result = mulRational(third, rational(3n, 1n));
// result = { n: 1n, d: 1n } (exactly 1)
```

### Polynomial Representation

Sparse representation for efficiency:

```typescript
// x^2 + 2x + 1 stored as:
[
	{ coefficient: 1, monomial: [{ base: 'x', exp: 2 }] },
	{ coefficient: 2, monomial: [{ base: 'x', exp: 1 }] },
	{ coefficient: 1, monomial: [] }
];
```

## File Organization

```
src/lib/mathAST/
├── types.ts              # Core AST types
├── factory.ts            # Node creation
├── exp.ts                # Fluent Exp wrapper
├── guards.ts             # Type guards
├── transforms.ts         # AST transformations
├── latex-generator.ts    # AST → LaTeX
├── pretty-print.ts       # AST → Tree visualization
│
├── parser/
│   ├── latex/            # LaTeX parser
│   │   ├── tokenizer.ts
│   │   ├── parser-pratt.ts
│   │   └── parser-rd.ts
│   ├── custom/           # Custom format parser
│   └── index.ts
│
├── normal/
│   ├── types.ts          # NormalForm types
│   ├── normalize.ts      # Main algorithm
│   ├── denormalize.ts    # NormalForm → MathNode
│   ├── hash.ts           # Canonical hashing
│   ├── polynomial.ts     # Polynomial operations
│   ├── algebraic.ts      # Algebraic coefficients
│   ├── rational.ts       # Rational arithmetic
│   ├── radical.ts        # Radical simplification
│   └── rules/            # Simplification rules
│
├── differentiation/
│   ├── differentiate.ts  # Main algorithm
│   ├── rules.ts          # Differentiation rules
│   └── types.ts
│
├── eval/
│   ├── evaluate.ts       # Numeric evaluation
│   ├── substitute.ts     # Variable substitution
│   └── function-bindings.ts
│
├── units/
│   ├── types.ts          # Unit types
│   ├── parser.ts         # Unit parsing
│   ├── conversion.ts     # Unit conversion
│   └── operations.ts     # Unit arithmetic
│
├── pattern/
│   ├── match.ts          # Pattern matching
│   ├── rules.ts          # Rewrite rules
│   └── types.ts
│
└── cli/
    ├── core/             # Core REPL infrastructure
    ├── web/              # Web-specific REPL
    ├── commands/         # All commands
    └── repl.ts           # Main REPL
```
