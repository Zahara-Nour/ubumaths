# MathAST Technical Reference

A comprehensive mathematical expression manipulation system for the UbuMaths educational platform.

## Overview

MathAST (Mathematical Abstract Syntax Tree) is a fully-featured computer algebra system designed as the computational backbone for mathematical expression handling. It provides:

- **Immutable AST representation** of mathematical expressions
- **Bidirectional parsing** between LaTeX and custom human-readable syntax
- **Symbolic computation** including evaluation, differentiation, and Taylor expansion
- **Pattern matching** with constraint-based rule transformations
- **Normalization** to canonical polynomial form for equivalence checking
- **Domain of definition** computation with French interval notation
- **Physical units** with dimensional analysis and conversion

## Quick Start

```typescript
import { MathAST, parseLatex, toLatex, evaluate, differentiate } from '$lib/mathAST';

// Parse LaTeX to AST
const ast = parseLatex('x^2 + 3x - 5');

// Create expressions programmatically
const quadratic = MathAST.add(
	MathAST.power(MathAST.variable('x'), MathAST.number('2')),
	MathAST.subtract(
		MathAST.implicitMultiply(MathAST.number('3'), MathAST.variable('x')),
		MathAST.number('5')
	)
);

// Evaluate with variable bindings
const result = evaluate(ast, { variables: { x: 2 } });
// result.value = 5 (2^2 + 3*2 - 5 = 5)

// Symbolic differentiation
const derivative = differentiate(ast, 'x');
// derivative => 2x + 3

// Generate LaTeX output
const latex = toLatex(derivative);
// latex => "2 x + 3"
```

## Architecture Overview

```
mathAST/
├── Core Types & Factory
│   ├── types.ts          # 18 node type definitions
│   ├── factory.ts        # Factory functions (MathAST namespace)
│   ├── guards.ts         # Type guards and predicates
│   └── transforms.ts     # Tree traversal and transformation
│
├── Parsing
│   ├── parser/           # Parser subsystem
│   │   ├── latex/        # LaTeX parser (Pratt + RD)
│   │   └── custom/       # Custom syntax parser
│   ├── latex-generator.ts
│   └── custom-generator.ts
│
├── Computation
│   ├── eval/             # Evaluation and substitution
│   ├── normal/           # Normalization (canonical form)
│   ├── differentiation/  # Symbolic derivatives
│   ├── taylor/           # Taylor series expansion
│   └── domain/           # Domain of definition
│
├── Pattern Matching
│   └── pattern/          # Pattern matching and rules
│
├── Physical Units
│   └── units/            # SI units and conversion
│
└── CLI
    └── cli/              # REPL and web interface
```

## Documentation Index

| Document                                        | Description                                     |
| ----------------------------------------------- | ----------------------------------------------- |
| [Types & Nodes](./types.md)                     | Node types, interfaces, and type system         |
| [Factory & Transforms](./factory-transforms.md) | Creating and manipulating AST nodes             |
| [Parsing](./parsing.md)                         | LaTeX and custom syntax parsing                 |
| [Evaluation](./evaluation.md)                   | Numeric evaluation and substitution             |
| [Pattern Matching](./patterns.md)               | Pattern matching and rule-based transformations |
| [Normalization](./normalization.md)             | Canonical forms and equivalence                 |
| [Differentiation & Taylor](./calculus.md)       | Symbolic differentiation and series             |
| [Domain of Definition](./domain.md)             | Domain computation and validation               |
| [Physical Units](./units.md)                    | Unit system with dimensional analysis           |
| [CLI & REPL](./cli.md)                          | Command-line interface and web REPL             |

## Design Principles

### 1. Immutability

All nodes are readonly. Transformations return new nodes:

```typescript
const original = MathAST.variable('x', { color: 'red' });
const modified = withMetadata(original, { color: 'blue' });
// original is unchanged, modified is a new node
```

### 2. Type Safety

Strong TypeScript types with discriminated unions:

```typescript
function processNode(node: MathNode) {
	if (isAddition(node)) {
		// TypeScript knows: node.left and node.right exist
		return processAddition(node.left, node.right);
	}
}
```

### 3. Pivot Architecture

AST serves as the central representation between formats:

```
LaTeX <──┐                  ┌──> LaTeX
         │    ┌─────────┐   │
Custom <─┼──> │ MathAST │ <─┼──> Custom
         │    └─────────┘   │
MathLive <──┘               └──> Display
```

### 4. Precision Preservation

Numbers are stored as strings to maintain exact formatting:

```typescript
MathAST.number('3.14'); // Preserved as "3.14"
MathAST.number('3.140'); // Preserved as "3.140" (different!)
```

## Integration Points

### MathLive Editor

TipTap extensions for interactive math editing:

```typescript
// src/lib/extensions/math-extension.ts
import { parseLatexSafe, toLatex } from '$lib/mathAST';

// Parse user input from MathLive
const ast = parseLatexSafe(mathLiveContent);

// Convert back for display
const latex = toLatex(ast);
```

### Graphing Calculator

Function evaluation for plotting:

```typescript
// src/lib/grapheur/evaluator.ts
import { parseLatex, evaluate } from '$lib/mathAST';

const ast = parseLatex('sin(x) + cos(2x)');
const points = xValues.map((x) => ({
	x,
	y: evaluate(ast, { variables: { x } }).value
}));
```

### Exercise System

Expression parsing for interactive exercises:

```typescript
// Student answer validation
const studentAST = parseLatex(studentAnswer);
const expectedAST = parseLatex(correctAnswer);

// Check equivalence using normalization
const equivalent = polynomialsEqual(normalize(studentAST), normalize(expectedAST));
```

## Test Coverage

The system has extensive test coverage with **78+ test files** and **2,400+ individual tests**:

```bash
# Run all mathAST tests
pnpm test:server src/lib/mathAST/

# Run specific subsystem tests
pnpm test:server src/lib/mathAST/parser/
pnpm test:server src/lib/mathAST/eval/
pnpm test:server src/lib/mathAST/pattern/
```

## Performance Characteristics

| Operation     | Complexity | Notes                          |
| ------------- | ---------- | ------------------------------ |
| Parse         | O(n)       | Single-pass Pratt parser       |
| Generate      | O(n)       | Recursive tree traversal       |
| Evaluate      | O(n)       | Bottom-up computation          |
| Match pattern | O(n\*m)    | n=expr size, m=pattern size    |
| Normalize     | O(n log n) | Polynomial coefficient merging |
| Differentiate | O(n)       | Single-pass with chain rule    |

## Version History

The system has evolved through several iterations:

1. **Initial version**: Basic AST with LaTeX parsing
2. **Pattern system**: Added pattern matching and rule engine
3. **Normalization**: Canonical polynomial forms with BigInt rationals
4. **Units**: Physical unit system with dimensional analysis
5. **Advanced calculus**: Differentiation and Taylor expansion
6. **Function composition**: Support for f o g notation
7. **Domain system**: Domain of definition with French interval notation

## See Also

- [Improvement Proposals](./improvements.md) - Suggested enhancements
- [Source Code](../../../src/lib/mathAST/) - Implementation details
- [Existing README](../../../src/lib/mathAST/README.md) - In-source documentation
