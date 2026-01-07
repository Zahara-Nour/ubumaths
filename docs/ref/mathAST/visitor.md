# Visitor Pattern

Flexible AST traversal and transformation with enter/leave hooks.

## Overview

The visitor pattern provides two main functions for working with MathAST trees:

- **`visitAST`** - Read-only traversal with pre-order (enter) and post-order (leave) hooks
- **`transformAST`** - Immutable transformation with node replacement capabilities

Both functions provide context information (parent, path, depth) and support skipping subtrees.

## Quick Start

```typescript
import {
	visitAST,
	transformAST,
	type ASTVisitor,
	type TransformVisitor,
	type VisitorContext
} from '$lib/mathAST';
```

### Read-only Traversal

```typescript
// Collect all variable names in an expression
const variables = new Set<string>();
visitAST(ast, {
	enterVariable: (node) => {
		variables.add(node.name);
	}
});
```

### Transformation

```typescript
// Replace all occurrences of variable 'x' with number 5
const result = transformAST(ast, {
	leaveVariable: (node) => {
		if (node.name === 'x') return number('5');
	}
});
```

## API Reference

### visitAST

```typescript
function visitAST(node: MathNode, visitor: ASTVisitor): void;
```

Performs a read-only traversal of the AST. Visits each node in the following order:

1. `enterNode` (generic callback)
2. `enterX` (type-specific callback, e.g., `enterAddition`)
3. Visit children recursively (unless skipped)
4. `leaveX` (type-specific callback)
5. `leaveNode` (generic callback)

### transformAST

```typescript
function transformAST(node: MathNode, visitor: TransformVisitor): MathNode;
```

Transforms an AST immutably. Same traversal order as `visitAST`, but callbacks can return replacement nodes.

## Visitor Interfaces

### VisitorContext

```typescript
interface VisitorContext {
	readonly parent?: MathNode; // Parent node (undefined for root)
	readonly path: readonly (string | number)[]; // Path from root
	readonly depth: number; // Depth level (root = 0)
}
```

### ASTVisitor (Read-only)

```typescript
interface ASTVisitor {
	// Generic callbacks (called for all node types)
	enterNode?(node: MathNode, context: VisitorContext): EnterResult;
	leaveNode?(node: MathNode, context: VisitorContext): void;

	// Type-specific callbacks (18 node types)
	enterNumber?(node: NumberNode, context: VisitorContext): EnterResult;
	leaveNumber?(node: NumberNode, context: VisitorContext): void;
	enterVariable?(node: VariableNode, context: VisitorContext): EnterResult;
	leaveVariable?(node: VariableNode, context: VisitorContext): void;
	// ... etc for all 18 node types
}
```

### TransformVisitor

```typescript
interface TransformVisitor {
	// Generic callbacks
	enterNode?(node: MathNode, context: VisitorContext): TransformEnterResult;
	leaveNode?(node: MathNode, context: VisitorContext): TransformLeaveResult;

	// Type-specific callbacks
	enterNumber?(node: NumberNode, context: VisitorContext): TransformEnterResult;
	leaveNumber?(node: NumberNode, context: VisitorContext): TransformLeaveResult;
	// ... etc for all 18 node types
}
```

## Return Types

### EnterResult (for visitAST)

```typescript
type EnterResult = void | undefined | 'skip';
```

- `void` / `undefined`: Continue traversal normally
- `'skip'`: Skip children but still call leave callbacks

### TransformEnterResult (for transformAST enter)

```typescript
type TransformEnterResult = MathNode | { node: MathNode; skip: true } | void | 'skip';
```

- `MathNode`: Replace current node, continue traversal on replacement
- `{ node: MathNode; skip: true }`: Replace node AND skip children
- `void` / `undefined`: Keep current node, continue normally
- `'skip'`: Keep current node, skip children

### TransformLeaveResult (for transformAST leave)

```typescript
type TransformLeaveResult = MathNode | void | undefined;
```

- `MathNode`: Replace current node
- `void` / `undefined`: Keep current node unchanged

## Supported Node Types

The visitor pattern supports all 18 MathAST node types:

| Category   | Types                                         | Callback Names                                  |
| ---------- | --------------------------------------------- | ----------------------------------------------- |
| Leaf       | number, variable, greek, symbol, hole         | enterNumber, leaveVariable, etc.                |
| Binary     | addition, subtraction, multiplication         | enterAddition, leaveMultiplication, etc.        |
| Division   | division                                      | enterDivision, leaveDivision                    |
| Unary      | opposite, positive                            | enterOpposite, leavePositive                    |
| Function   | function                                      | enterFunction, leaveFunction                    |
| Structural | delimiter, subscript, superscript             | enterDelimiter, leaveSubscript, etc.            |
| Special    | relation, unit, composition                   | enterRelation, leaveUnit, etc.                  |
| Alias      | delimiter with `delimiters === 'parentheses'` | enterParentheses, leaveParentheses (calls both) |

## Path Segments

The `context.path` array contains segments describing how to reach the current node:

| Node Type   | Path Segments                          |
| ----------- | -------------------------------------- |
| Binary ops  | `'left'`, `'right'`                    |
| Division    | `'numerator'`, `'denominator'`         |
| Unary ops   | `'operand'`                            |
| Function    | `['args', index]`, `'power'`, `'base'` |
| Delimiter   | `'inner'`                              |
| Subscript   | `'base'`, `'subscript'`                |
| Superscript | `'base'`, `'inner'`                    |
| Relation    | `'left'`, `'right'`                    |
| Unit        | `'expression'`                         |
| Composition | `'outer'`, `'inner'`                   |

## Examples

### Counting Nodes by Type

```typescript
const counts = new Map<string, number>();

visitAST(ast, {
	enterNode: (node) => {
		counts.set(node.type, (counts.get(node.type) ?? 0) + 1);
	}
});

console.log(counts); // Map { 'addition' => 2, 'number' => 5, 'variable' => 3 }
```

### Finding Maximum Depth

```typescript
let maxDepth = 0;

visitAST(ast, {
	enterNode: (node, context) => {
		maxDepth = Math.max(maxDepth, context.depth);
	}
});

console.log(`Max depth: ${maxDepth}`);
```

### Checking Parent Context

```typescript
// Find variables that appear in denominators
const denominatorVariables = new Set<string>();

visitAST(ast, {
	enterVariable: (node, context) => {
		if (context.parent?.type === 'division') {
			const path = context.path;
			if (path[path.length - 1] === 'denominator') {
				denominatorVariables.add(node.name);
			}
		}
	}
});
```

### Skip Subtrees

```typescript
// Visit only top-level nodes, skip nested content
visitAST(ast, {
	enterNode: (node, context) => {
		console.log(`${node.type} at depth ${context.depth}`);
		if (context.depth > 0) {
			return 'skip'; // Don't recurse into children
		}
	}
});
```

### Replace Variables with Values

```typescript
const bindings = { x: 2, y: 3 };

const evaluated = transformAST(ast, {
	leaveVariable: (node) => {
		if (node.name in bindings) {
			return number(String(bindings[node.name]));
		}
	}
});
```

### Transform in Enter (Skip Original Children)

```typescript
// Replace sin^2(x) with (1 - cos^2(x))
const result = transformAST(ast, {
	enterFunction: (node) => {
		if (node.name === 'sin' && node.power?.type === 'superscript') {
			const exp = node.power.superscript;
			if (exp.type === 'number' && exp.value === '2') {
				// Return replacement and skip original children
				return {
					node: subtract(number('1'), func('cos', node.args, { power: node.power })),
					skip: true
				};
			}
		}
	}
});
```

### Preserve Metadata During Transformation

```typescript
import { withMetadata } from '$lib/mathAST';

// Transform while preserving any existing metadata
const result = transformAST(ast, {
	leaveNumber: (node) => {
		const doubled = number(String(parseFloat(node.value) * 2));
		// Preserve original metadata
		return node.metadata ? withMetadata(doubled, node.metadata) : doubled;
	}
});
```

### Collecting Transformation Path

```typescript
const visited: string[] = [];

transformAST(ast, {
	enterNode: (node, context) => {
		visited.push(`enter ${node.type} at ${context.path.join('/')}`);
	},
	leaveNode: (node, context) => {
		visited.push(`leave ${node.type} at ${context.path.join('/')}`);
	}
});

console.log(visited);
// ['enter addition at ', 'enter number at left', 'leave number at left', ...]
```

## Behavior Details

### Callback Order

For a node `A` with children `B` and `C`:

```
enterNode(A) → enterX(A) → [visit B] → [visit C] → leaveX(A) → leaveNode(A)
```

### Skip Behavior

- Returning `'skip'` from enter prevents visiting children
- Leave callbacks are still called for the skipped node
- Sibling nodes continue to be visited

### Transform Re-dispatch

When `enterX` returns a replacement node of a different type, the visitor calls the enter callback for the new type (single level only, to prevent infinite loops).

### Immutability

`transformAST` never modifies the original tree. If any transformation occurs, all ancestor nodes are reconstructed to create a new tree sharing unchanged subtrees (structural sharing).

## Files

- **Implementation**: `src/lib/mathAST/visitor.ts` (773 lines)
- **Tests**: `src/lib/mathAST/__tests__/visitor.test.ts` (40 tests)
- **Exports**: `src/lib/mathAST/index.ts`

## See Also

- [Factory & Transforms](./factory-transforms.md) - Creating and manipulating nodes
- [Types & Nodes](./types.md) - Node type definitions
- [Pattern Matching](./patterns.md) - Rule-based transformations
