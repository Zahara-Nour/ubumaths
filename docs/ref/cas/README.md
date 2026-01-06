# UbuMaths CAS System - Technical Reference

> Comprehensive technical guide to the Computer Algebra System (CAS) powering UbuMaths

## Overview

UbuMaths implements a sophisticated Computer Algebra System with two complementary components:

1. **MathAST** (`src/lib/mathAST/`) - The primary, modern CAS system
2. **TinyCAS** (`extern/new-tinymath/packages/tinycas/`) - The legacy CAS library

Both systems share fundamental concepts but MathAST provides a cleaner, more modular architecture with TypeScript-first design.

## Documentation Structure

| Document                                   | Description                                     |
| ------------------------------------------ | ----------------------------------------------- |
| [architecture.md](./architecture.md)       | System architecture and component relationships |
| [mathast-types.md](./mathast-types.md)     | MathAST type system and node definitions        |
| [parsing.md](./parsing.md)                 | Expression parsing (LaTeX and custom formats)   |
| [normalization.md](./normalization.md)     | Canonical form and simplification algorithms    |
| [differentiation.md](./differentiation.md) | Symbolic differentiation engine                 |
| [evaluation.md](./evaluation.md)           | Numeric and symbolic evaluation                 |
| [cli-repl.md](./cli-repl.md)               | Interactive REPL and command system             |
| [tinycas-legacy.md](./tinycas-legacy.md)   | TinyCAS architecture reference                  |

## Quick Start

### Using the Exp Fluent API

```typescript
import { Exp } from '$lib/mathAST';

// Parse LaTeX
const expr = Exp.parse('x^2 + 3x - 5');

// Build expressions fluently
const polynomial = Exp.variable('x')
	.power(Exp.number('2'))
	.add(Exp.number('3').multiply(Exp.variable('x')))
	.subtract(Exp.number('5'));

// Get outputs
console.log(expr.latex); // "x^{2} + 3 x - 5"
console.log(expr.tree); // Pretty-printed AST

// Simplify and normalize
const simplified = Exp.parse('2x + 3x').simplify();
console.log(simplified.latex); // "5 x"

// Differentiate
const derivative = Exp.parse('x^3').differentiate();
console.log(derivative.latex); // "3 x^{2}"

// Check equivalence
const a = Exp.parse('(a+b)^2');
const b = Exp.parse('a^2 + 2ab + b^2');
console.log(a.isEquivalent(b)); // true
```
