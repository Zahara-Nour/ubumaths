# Factory Functions & Transformations

Creating, modifying, and traversing MathAST nodes.

## Factory Functions

### The MathAST Namespace

All factory functions are available through the `MathAST` namespace or as individual exports:

```typescript
// Namespace usage (convenient)
import { MathAST } from '$lib/mathAST';
const expr = MathAST.add(MathAST.variable('x'), MathAST.number('5'));

// Individual imports (better tree-shaking)
import { add, variable, number } from '$lib/mathAST';
const expr = add(variable('x'), number('5'));
```

### Literal Factories

```typescript
// Numbers (stored as strings)
MathAST.number('3.14');
MathAST.number('-5');
MathAST.number('1.5e10');

// Variables
MathAST.variable('x');
MathAST.variable('velocity');

// Greek letters
MathAST.greek('pi'); // pi
MathAST.greek('alpha'); // alpha
MathAST.greek('beta'); // beta
MathAST.greek('gamma'); // gamma
MathAST.greek('theta'); // theta

// Symbols
MathAST.symbol('infinity');
MathAST.symbol('partial');
MathAST.symbol('pm');

// Holes (interactive placeholders)
MathAST.hole(0); // First hole
MathAST.hole(1); // Second hole
```

### Binary Operation Factories

```typescript
// Addition and subtraction
MathAST.add(left, right);
MathAST.subtract(left, right);

// Multiplication (with display style)
MathAST.multiply(left, right, 'dot'); // a . b
MathAST.multiply(left, right, 'cross'); // a x b
MathAST.multiply(left, right, 'star'); // a * b
MathAST.multiply(left, right, 'implicit'); // ab
MathAST.implicitMultiply(left, right); // Shorthand for implicit

// Division (with display style)
MathAST.divide(num, den, 'fraction'); // Stacked fraction
MathAST.divide(num, den, 'inline'); // a / b
MathAST.divide(num, den, 'ratio'); // a : b
MathAST.fraction(num, den); // Shorthand for fraction style
```

### Unary Operation Factories

```typescript
MathAST.opposite(operand); // -x
MathAST.positive(operand); // +x
```

### Function Factories

```typescript
// Standard mathematical functions
MathAST.sin(arg);
MathAST.cos(arg);
MathAST.tan(arg);
MathAST.ln(arg);
MathAST.log(arg);
MathAST.log(arg, base); // log with base
MathAST.exp(arg);
MathAST.sqrt(arg);
MathAST.abs(arg);

// Generic function
MathAST.func(name, args);
MathAST.func('f', [x]);
MathAST.func('max', [a, b]);

// Function with power: f^2(x)
MathAST.func('sin', [x], { power: MathAST.number('2') });

// Function with base: log_2(x)
MathAST.func('log', [x], { base: MathAST.number('2') });

// Derivative function: f'(x), f''(x)
MathAST.derivativeFunc('f', 1, [x]); // f'
MathAST.derivativeFunc('f', 2, [x]); // f''

// Inverse function: f^{-1}(x)
MathAST.inverseFunc('f', [x]);

// Function composition: f o g
MathAST.compose(f, g);
```

### Structural Factories

```typescript
// Parentheses
MathAST.parentheses(content)
MathAST.delimiter('parentheses', content, semantic?)

// Subscript: x_i
MathAST.subscript(base, subscript)

// Superscript/Power: x^n
MathAST.superscript(base, superscript)
MathAST.power(base, exponent)  // Alias for superscript
```

### Relation Factories

```typescript
// Basic relations
MathAST.equals(left, right); // =
MathAST.lessThan(left, right); // <
MathAST.greaterThan(left, right); // >
MathAST.lessThanOrEqual(left, right); // <=
MathAST.greaterThanOrEqual(left, right); // >=
MathAST.notEquals(left, right); // !=

// Generic relation
MathAST.relation(type, left, right);

// Special relations
MathAST.approx(left, right); // approx
MathAST.congruent(left, right); // identical to
MathAST.elementOf(left, right); // in
MathAST.notElementOf(left, right); // not in
MathAST.subset(left, right); // subset
MathAST.subsetOrEqual(left, right);
MathAST.superset(left, right);
MathAST.supersetOrEqual(left, right);
MathAST.implies(left, right); // =>
MathAST.iff(left, right); // <=>

// Relation chains
MathAST.relationChain(type, [a, b, c]); // a < b < c
MathAST.equalsChain([a, b, c]); // a = b = c
MathAST.lessThanChain([a, b, c]);
MathAST.lessThanOrEqualChain([a, b, c]);
MathAST.greaterThanChain([a, b, c]);
MathAST.greaterThanOrEqualChain([a, b, c]);
MathAST.impliesChain([a, b, c]);
MathAST.iffChain([a, b, c]);
```

### Unit Factories

```typescript
// Expression with unit
MathAST.withUnit(expression, unit);

// Parse unit from string
MathAST.quantity(expression, 'm/s');
MathAST.quantity(MathAST.number('10'), 'km/h');

// Variable with unit
MathAST.quantityVar(name, unitString);
MathAST.quantityVar('v', 'm/s'); // v [m/s]
```

### Metadata Options

Many factories accept extended options for metadata:

```typescript
// With node metadata
MathAST.variable('x', { color: 'red', style: 'bold' });

// Binary operations with operator metadata
const options: BinaryOpOptions = {
	metadata: { color: 'blue' },
	operatorMetadata: { color: 'red' }
};
MathAST.add(a, b, options);

// Functions with delimiter metadata
const funcOpts: FunctionMetadataOptions = {
	nameMetadata: { color: 'green' },
	delimiterMetadata: { color: 'gray' }
};
MathAST.func('f', [x], funcOpts);
```

## Tree Transformation

### Metadata Helpers

```typescript
import { withMetadata, withOperatorMetadata } from '$lib/mathAST';

// Add/update node metadata
const colored = withMetadata(node, { color: 'red' });

// Add operator metadata (for binary ops)
const highlightedOp = withOperatorMetadata(addNode, { color: 'blue' });

// Add delimiter metadata
withDelimiterMetadata(delimiterNode, { color: 'gray' });

// Add relation metadata
withRelationMetadata(relationNode, { style: 'bold' });

// Add function name metadata
withNameMetadata(funcNode, { color: 'green' });

// Add unit metadata
withUnitMetadata(unitNode, { color: 'purple' });
```

### Tree Traversal

```typescript
import { getChildren, mapNode, mapNodeTopDown } from '$lib/mathAST';

// Get immediate children of a node
const children = getChildren(addNode);
// [left, right]

// Bottom-up transformation (post-order)
// Children are processed first, then parent
const doubled = mapNode(ast, (node) =>
	isNumber(node) ? MathAST.number(String(parseFloat(node.value) * 2)) : node
);

// Top-down transformation (pre-order)
// Parent is processed first, then children
const transformed = mapNodeTopDown(ast, (node) => {
	if (someCondition(node)) {
		return replaceEntireSubtree(node);
	}
	return node;
});
```

### Node Search

```typescript
import { findNodes, findFirst, replaceNode } from '$lib/mathAST';

// Find all matching nodes
const allVariables = findNodes(ast, isVariable);
const allFunctions = findNodes(ast, isFunction);

// Find first matching node
const firstDivision = findFirst(ast, isDivision);

// Replace matching nodes
const replaced = replaceNode(
	ast,
	(node) => isVariable(node) && node.name === 'x',
	MathAST.variable('y')
);

// Replace with function
const negated = replaceNode(ast, isNumber, (node) => MathAST.opposite(node));
```

### Utility Functions

```typescript
import { cloneNode, countNodes, getDepth } from '$lib/mathAST';

// Deep clone a node (creates new references)
const copy = cloneNode(ast);

// Count total nodes in tree
const nodeCount = countNodes(ast); // e.g., 15

// Get maximum depth
const depth = getDepth(ast); // e.g., 4
```

## Flattening Operations

Flatten binary operation chains for easier manipulation:

```typescript
import {
	flattenSumShallow,
	flattenSumDeep,
	flattenProductShallow,
	flattenProductDeep,
	unflattenSum,
	unflattenProduct
} from '$lib/mathAST';

// Types
type Sign = '+' | '-';
type SignedTerm = { sign: Sign; term: MathNode };
type FlatSum = readonly SignedTerm[];
type FlatProduct = readonly MathNode[];
```

### Sum Flattening

```typescript
// a + b - c  =>  [{'+', a}, {'+', b}, {'-', c}]
const flat = flattenSumShallow(sumNode);

// Shallow: stops at parentheses
// a + (b + c)  =>  [{'+', a}, {'+', (b+c)}]

// Deep: includes nested operations info
const { terms, subLists } = flattenSumDeep(sumNode);

// Reconstruct from flat representation
const reconstructed = unflattenSum(flat);
// [{'+', a}, {'-', b}, {'+', c}] => ((a - b) + c)
```

### Product Flattening

```typescript
// a * b * c  =>  [a, b, c]
const factors = flattenProductShallow(productNode);

// Deep flattening
const { factors, subLists } = flattenProductDeep(productNode);

// Reconstruct
const product = unflattenProduct(factors, 'implicit');
// [a, b, c] => ((a * b) * c)
```

### Relation Chain Flattening

```typescript
import { flattenRelationChain, unflattenRelationChain } from '$lib/mathAST';

// a < b < c  =>  { relation: '<', terms: [a, b, c] }
const chain = flattenRelationChain(relationNode);

// Reconstruct
const relation = unflattenRelationChain(chain);
```

## Type Guards

### Category Guards

```typescript
import {
	isLiteralNode,
	isBinaryOperationNode,
	isUnaryOperationNode,
	isStructuralNode
} from '$lib/mathAST';

if (isLiteralNode(node)) {
	// node is NumberNode | VariableNode | GreekLetterNode | SymbolNode | HoleNode
}

if (isBinaryOperationNode(node)) {
	// node is AdditionNode | SubtractionNode | MultiplicationNode | DivisionNode
	console.log(node.left, node.right);
}

if (isUnaryOperationNode(node)) {
	// node is OppositeNode | PositiveNode
	console.log(node.operand);
}

if (isStructuralNode(node)) {
	// node is DelimiterNode | SubscriptNode | SuperscriptNode
}
```

### Individual Node Guards

```typescript
import {
	isNumber,
	isVariable,
	isGreek,
	isSymbol,
	isHole,
	isAddition,
	isSubtraction,
	isMultiplication,
	isDivision,
	isOpposite,
	isPositive,
	isFunction,
	isDerivativeFunction,
	isInverseFunction,
	isComposition,
	isDelimiter,
	isSubscript,
	isSuperscript,
	isRelation,
	isUnit
} from '$lib/mathAST';

// Example usage
function getNumberValue(node: MathNode): number | null {
	if (isNumber(node)) {
		return parseFloat(node.value);
	}
	return null;
}

function isSquared(node: MathNode): boolean {
	return isSuperscript(node) && isNumber(node.superscript) && node.superscript.value === '2';
}
```

### Utility Predicates

```typescript
import {
	hasChildren,
	isLeaf,
	hasMetadata,
	isFraction,
	isImplicitMultiplication,
	isComparison,
	isEquality,
	isInequality
} from '$lib/mathAST';

// Check structure
hasChildren(node); // true if node has child nodes
isLeaf(node); // true if no children (literals)
hasMetadata(node); // true if metadata is present

// Check specific patterns
isFraction(node); // Division with 'fraction' style
isImplicitMultiplication(node); // Multiplication with 'implicit' style

// Relation checks
isComparison(node); // <, >, <=, >=
isEquality(node); // =
isInequality(node); // !=
```

### Relation Chain Predicates

```typescript
import {
	isRelationChain,
	isComparisonChain,
	isEqualityChain,
	isImplicationChain,
	isEquivalenceChain,
	getRelationChainLength
} from '$lib/mathAST';

// a < b < c is a relation chain
if (isRelationChain(node)) {
	const length = getRelationChainLength(node); // 3 terms
}

isComparisonChain(node); // <, >, <=, >= chains
isEqualityChain(node); // = chains
isImplicationChain(node); // => chains
isEquivalenceChain(node); // <=> chains
```

### Extended Metadata Predicates

```typescript
import {
	hasOperatorMetadata,
	hasDelimiterMetadata,
	hasNameMetadata,
	hasRelationMetadata,
	hasUnitMetadata,
	hasAnyMetadata
} from '$lib/mathAST';

// Check for specific metadata types
hasOperatorMetadata(addNode); // operator color, etc.
hasDelimiterMetadata(parenNode); // delimiter styling
hasNameMetadata(funcNode); // function name styling
hasRelationMetadata(eqNode); // relation symbol styling
hasUnitMetadata(unitNode); // unit styling
hasAnyMetadata(node); // any metadata present
```

### Unit Predicates

```typescript
import { hasUnitDescendant, isDimensionlessUnit } from '$lib/mathAST';

// Check if any descendant has a unit
hasUnitDescendant(ast); // true if UnitNode exists in tree

// Check if unit is dimensionless
isDimensionlessUnit(unitNode);
```

## Complete Example

```typescript
import {
	MathAST,
	mapNode,
	findNodes,
	isVariable,
	isNumber,
	isMultiplication,
	withMetadata
} from '$lib/mathAST';

// Create expression: 2x^2 + 3x - 5
const expr = MathAST.add(
	MathAST.add(
		MathAST.implicitMultiply(
			MathAST.number('2'),
			MathAST.power(MathAST.variable('x'), MathAST.number('2'))
		),
		MathAST.implicitMultiply(MathAST.number('3'), MathAST.variable('x'))
	),
	MathAST.opposite(MathAST.number('5'))
);

// Find all variables
const variables = findNodes(expr, isVariable);
// [variable('x'), variable('x')]

// Color all variables blue
const colored = mapNode(expr, (node) =>
	isVariable(node) ? withMetadata(node, { color: 'blue' }) : node
);

// Double all coefficients
const doubled = mapNode(expr, (node) => {
	if (isMultiplication(node) && isNumber(node.left)) {
		return MathAST.multiply(
			MathAST.number(String(parseFloat(node.left.value) * 2)),
			node.right,
			node.displayStyle
		);
	}
	return node;
});
// Result: 4x^2 + 6x - 5
```

## See Also

- [Types & Nodes](./types.md) - Node type definitions
- [Parsing](./parsing.md) - Converting strings to AST
- [Pattern Matching](./patterns.md) - Advanced transformations
