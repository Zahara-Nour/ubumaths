# MathAST - Technical Reference

Complete reference documentation for the MathAST library - an immutable Abstract Syntax Tree for mathematical expressions.

**Location**: `src/lib/mathAST/`
**Tests**: 423 passing
**Purpose**: Pivot structure for transpilation between LaTeX and custom syntax

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Type System](#type-system)
4. [Factory Functions](#factory-functions)
5. [Transformation Helpers](#transformation-helpers)
6. [Type Guards](#type-guards)
7. [Flatten/Unflatten Helpers](#flattenunflatten-helpers)
8. [LaTeX Generator](#latex-generator)
9. [Usage Patterns](#usage-patterns)
10. [API Summary](#api-summary)

---

## Overview

### Design Principles

| Principle         | Implementation                                                         |
| ----------------- | ---------------------------------------------------------------------- |
| **Immutability**  | All nodes have `readonly` properties, transformations return new nodes |
| **Type Safety**   | Discriminated unions via `type` field, comprehensive type guards       |
| **Ergonomics**    | Convenience factories, `MathAST` namespace, optional metadata          |
| **Extensibility** | 18 node types covering all common mathematical constructs              |

### File Structure

```
src/lib/mathAST/
├── index.ts              # Public exports (140 total)
├── types.ts              # Type definitions (27 exports)
├── factory.ts            # Factory functions (55 exports)
├── transforms.ts         # Tree manipulation (10 exports)
├── guards.ts             # Type guards (29 exports)
├── flatten.ts            # Flatten helpers (16 exports)
├── latex-generator.ts    # LaTeX output (3 exports)
└── __tests__/
    ├── factory.test.ts
    ├── transforms.test.ts
    ├── guards.test.ts
    ├── flatten.test.ts
    └── latex-generator.test.ts
```

---

## Architecture

### Node Type Hierarchy

```
MathNode (union of 18 types)
├── LiteralNode (4 types)
│   ├── NumberNode       # Numeric values: '42', '3.14'
│   ├── VariableNode     # Identifiers: 'x', 'velocity'
│   ├── GreekLetterNode  # Greek: 'alpha', 'Delta'
│   └── SymbolNode       # Mathematical: 'infinity', 'partial'
│
├── BinaryOperationNode (4 types)
│   ├── AdditionNode       # a + b
│   ├── SubtractionNode    # a - b
│   ├── MultiplicationNode # a * b (with display style)
│   └── DivisionNode       # a / b (with display style)
│
├── UnaryOperationNode (2 types)
│   ├── OppositeNode    # -x
│   └── PositiveNode    # +x
│
├── StructuralNode (3 types)
│   ├── DelimiterNode    # (x), [x], {x}, |x|
│   ├── SubscriptNode    # x_i
│   └── SuperscriptNode  # x^2
│
├── FunctionNode (1 type)
│   └── FunctionNode     # sin(x), log_2(x), f^2(x)
│
└── RelationNode (1 type)
    └── RelationNode     # x = 5, a < b, A ⊂ B
```

### Base Node Interface

All nodes extend a common base:

```typescript
interface BaseNode {
	readonly type: string; // Discriminant field
	readonly metadata?: NodeMetadata;
}

interface NodeMetadata {
	readonly color?: string; // 'red', '#FF0000'
	readonly style?: 'normal' | 'bold' | 'italic';
	readonly annotation?: string; // 'constant', 'given'
}
```

---

## Type System

### Literal Types

#### NumberNode

```typescript
interface NumberNode {
	readonly type: 'number';
	readonly value: string; // String to preserve precision ('3.140')
	readonly metadata?: NodeMetadata;
}
```

#### VariableNode

```typescript
interface VariableNode {
	readonly type: 'variable';
	readonly name: string; // 'x', 'velocity', etc.
	readonly metadata?: NodeMetadata;
}
```

#### GreekLetterNode

```typescript
type GreekLetterLowercase =
  | 'alpha' | 'beta' | 'gamma' | 'delta' | 'epsilon' | 'zeta'
  | 'eta' | 'theta' | 'iota' | 'kappa' | 'lambda' | 'mu'
  | 'nu' | 'xi' | 'omicron' | 'pi' | 'rho' | 'sigma'
  | 'tau' | 'upsilon' | 'phi' | 'chi' | 'psi' | 'omega';

type GreekLetterUppercase =
  | 'Alpha' | 'Beta' | 'Gamma' | 'Delta' | ... | 'Omega';

type GreekLetter = GreekLetterLowercase | GreekLetterUppercase;

interface GreekLetterNode {
  readonly type: 'greek';
  readonly letter: GreekLetter;
  readonly metadata?: NodeMetadata;
}
```

#### SymbolNode

```typescript
type MathSymbol =
	// Constants & Operators
	| 'infinity'
	| 'emptyset'
	| 'partial'
	| 'nabla'
	| 'forall'
	| 'exists'
	| 'nexists'
	// Set Operations
	| 'in'
	| 'notin'
	| 'subset'
	| 'supset'
	| 'union'
	| 'intersection'
	// Geometry
	| 'angle'
	| 'triangle'
	| 'square'
	| 'diamond'
	// Operators
	| 'cdot'
	| 'times'
	| 'div'
	| 'pm'
	| 'mp'
	| 'oplus'
	| 'ominus'
	| 'otimes'
	| 'odot';
// ... 54 symbols total

interface SymbolNode {
	readonly type: 'symbol';
	readonly symbol: MathSymbol;
	readonly metadata?: NodeMetadata;
}
```

### Binary Operations

#### AdditionNode / SubtractionNode

```typescript
interface AdditionNode {
	readonly type: 'addition';
	readonly left: MathNode;
	readonly right: MathNode;
	readonly metadata?: NodeMetadata;
}

interface SubtractionNode {
	readonly type: 'subtraction';
	readonly left: MathNode;
	readonly right: MathNode;
	readonly metadata?: NodeMetadata;
}
```

#### MultiplicationNode

```typescript
type MultiplicationDisplayStyle =
	| 'implicit' // 2x (no symbol)
	| 'dot' // 2·x
	| 'cross' // 2×x
	| 'star'; // 2*x

interface MultiplicationNode {
	readonly type: 'multiplication';
	readonly left: MathNode;
	readonly right: MathNode;
	readonly displayStyle: MultiplicationDisplayStyle;
	readonly metadata?: NodeMetadata;
}
```

#### DivisionNode

```typescript
type DivisionDisplayStyle =
	| 'fraction' // Vertical fraction
	| 'inline' // a/b
	| 'ratio'; // a:b

interface DivisionNode {
	readonly type: 'division';
	readonly numerator: MathNode;
	readonly denominator: MathNode;
	readonly displayStyle: DivisionDisplayStyle;
	readonly metadata?: NodeMetadata;
}
```

### Unary Operations

```typescript
interface OppositeNode {
	readonly type: 'opposite';
	readonly operand: MathNode;
	readonly metadata?: NodeMetadata;
}

interface PositiveNode {
	readonly type: 'positive';
	readonly operand: MathNode;
	readonly metadata?: NodeMetadata;
}
```

### Structural Nodes

#### DelimiterNode

```typescript
type DelimiterType =
	| 'parentheses' // (...)
	| 'brackets' // [...]
	| 'braces' // {...}
	| 'invisible' // Implicit grouping
	| 'absolute' // |...|
	| 'floor' // ⌊...⌋
	| 'ceiling'; // ⌈...⌉

type DelimiterSemantic =
	| 'grouping' // Default for parentheses
	| 'interval' // [a, b]
	| 'set' // {elements}
	| 'absolute' // |x|
	| 'floor'
	| 'ceiling'
	| 'matrix'
	| 'vector';

interface DelimiterNode {
	readonly type: 'delimiter';
	readonly delimiters: DelimiterType;
	readonly content: MathNode;
	readonly semantic?: DelimiterSemantic;
	readonly metadata?: NodeMetadata;
}
```

#### SubscriptNode / SuperscriptNode

```typescript
interface SubscriptNode {
	readonly type: 'subscript';
	readonly base: MathNode;
	readonly subscript: MathNode;
	readonly metadata?: NodeMetadata;
}

interface SuperscriptNode {
	readonly type: 'superscript';
	readonly base: MathNode;
	readonly superscript: MathNode;
	readonly metadata?: NodeMetadata;
}
```

### FunctionNode

```typescript
interface FunctionNode {
	readonly type: 'function';
	readonly name: string; // 'sin', 'log', 'f'
	readonly args: readonly MathNode[]; // Arguments
	readonly power?: MathNode; // sin^2(x)
	readonly base?: MathNode; // log_2(x)
	readonly metadata?: NodeMetadata;
}
```

### RelationNode

```typescript
type RelationType =
	// Basic comparisons
	| '='
	| '<'
	| '>'
	| '<='
	| '>='
	| '!='
	// Congruence & Approximation
	| '≡'
	| '≢'
	| '≈'
	| '≃'
	| '∼'
	// Order relations
	| '≺'
	| '≻'
	// Set relations
	| '⊂'
	| '⊃'
	| '⊆'
	| '⊇'
	| '∈'
	| '∉'
	// Logical implications
	| '⟹'
	| '⟺'
	| '⟸';

interface RelationNode {
	readonly type: 'relation';
	readonly relation: RelationType;
	readonly left: MathNode;
	readonly right: MathNode;
	readonly metadata?: NodeMetadata;
}
```

---

## Factory Functions

All factories accept optional `metadata` as their last parameter.

### MathAST Namespace

All factories are available via the `MathAST` namespace:

```typescript
import { MathAST } from '$lib/mathAST';

const expr = MathAST.equals(
	MathAST.power(MathAST.variable('x'), MathAST.number('2')),
	MathAST.number('4')
);
```

### Literal Factories

```typescript
number(value: string, metadata?): NumberNode
variable(name: string, metadata?): VariableNode
greek(letter: GreekLetter, metadata?): GreekLetterNode
symbol(sym: MathSymbol, metadata?): SymbolNode
```

### Binary Operation Factories

```typescript
add(left, right, metadata?): AdditionNode
subtract(left, right, metadata?): SubtractionNode
multiply(left, right, displayStyle, metadata?): MultiplicationNode
implicitMultiply(left, right, metadata?): MultiplicationNode  // displayStyle: 'implicit'
divide(numerator, denominator, displayStyle, metadata?): DivisionNode
fraction(numerator, denominator, metadata?): DivisionNode     // displayStyle: 'fraction'
```

### Unary Operation Factories

```typescript
opposite(operand, metadata?): OppositeNode
positive(operand, metadata?): PositiveNode
```

### Function Factories

```typescript
func(name, args, options?, metadata?): FunctionNode
  // options: { power?: MathNode, base?: MathNode }

// Convenience functions
sin(arg, metadata?): FunctionNode
cos(arg, metadata?): FunctionNode
tan(arg, metadata?): FunctionNode
ln(arg, metadata?): FunctionNode
log(arg, base?, metadata?): FunctionNode
exp(arg, metadata?): FunctionNode
sqrt(arg, metadata?): FunctionNode
abs(arg, metadata?): FunctionNode
```

### Structural Factories

```typescript
delimiter(type, content, semantic?, metadata?): DelimiterNode
parentheses(content, metadata?): DelimiterNode  // semantic: 'grouping'
brackets(content, metadata?): DelimiterNode
braces(content, metadata?): DelimiterNode       // semantic: 'set'
subscript(base, subscript, metadata?): SubscriptNode
superscript(base, superscript, metadata?): SuperscriptNode
power(base, exponent, metadata?): SuperscriptNode  // Alias for superscript
```

### Relation Factories

```typescript
relation(type, left, right, metadata?): RelationNode

// Comparison convenience
equals(left, right, metadata?): RelationNode        // =
lessThan(left, right, metadata?): RelationNode      // <
greaterThan(left, right, metadata?): RelationNode   // >
lessThanOrEqual(left, right, metadata?): RelationNode    // <=
greaterThanOrEqual(left, right, metadata?): RelationNode // >=
notEquals(left, right, metadata?): RelationNode     // !=
approx(left, right, metadata?): RelationNode        // ≈
congruent(left, right, metadata?): RelationNode     // ≡

// Set/Logic convenience
elementOf(left, right, metadata?): RelationNode         // ∈
notElementOf(left, right, metadata?): RelationNode      // ∉
subset(left, right, metadata?): RelationNode            // ⊂
subsetOrEqual(left, right, metadata?): RelationNode     // ⊆
superset(left, right, metadata?): RelationNode          // ⊃
supersetOrEqual(left, right, metadata?): RelationNode   // ⊇
implies(left, right, metadata?): RelationNode           // ⟹
iff(left, right, metadata?): RelationNode               // ⟺
```

---

## Transformation Helpers

### Metadata

```typescript
withMetadata<T extends MathNode>(node: T, metadata: Partial<NodeMetadata>): T
```

Merges metadata into a node, returning a new node.

### Tree Traversal

```typescript
getChildren(node: MathNode): MathNode[]
```

Returns immediate children of a node:

- Literals: `[]`
- Binary ops: `[left, right]`
- Division: `[numerator, denominator]`
- Unary ops: `[operand]`
- Function: `[...args, power?, base?]`
- Delimiter: `[content]`
- Subscript: `[base, subscript]`
- Superscript: `[base, superscript]`
- Relation: `[left, right]`

### Recursive Mapping

```typescript
// Bottom-up (post-order): children first, then parent
mapNode(node: MathNode, fn: (node: MathNode) => MathNode): MathNode

// Top-down (pre-order): parent first, then children
mapNodeTopDown(node: MathNode, fn: (node: MathNode) => MathNode): MathNode
```

### Search Functions

```typescript
findNodes(node: MathNode, predicate: (node: MathNode) => boolean): MathNode[]
findFirst(node: MathNode, predicate: (node: MathNode) => boolean): MathNode | undefined
```

### Replace

```typescript
replaceNode(
  root: MathNode,
  predicate: (node: MathNode) => boolean,
  replacement: MathNode | ((node: MathNode) => MathNode)
): MathNode
```

### Utilities

```typescript
cloneNode<T extends MathNode>(node: T): T
countNodes(node: MathNode): number
getDepth(node: MathNode): number  // Leaves have depth 1
```

---

## Type Guards

### Category Guards

```typescript
isLiteralNode(node): node is LiteralNode
isBinaryOperationNode(node): node is BinaryOperationNode
isUnaryOperationNode(node): node is UnaryOperationNode
isStructuralNode(node): node is StructuralNode
```

### Individual Guards (18 total)

```typescript
// Literals
isNumber(node): node is NumberNode
isVariable(node): node is VariableNode
isGreek(node): node is GreekLetterNode
isSymbol(node): node is SymbolNode

// Binary Operations
isAddition(node): node is AdditionNode
isSubtraction(node): node is SubtractionNode
isMultiplication(node): node is MultiplicationNode
isDivision(node): node is DivisionNode

// Unary Operations
isOpposite(node): node is OppositeNode
isPositive(node): node is PositiveNode

// Structural
isFunction(node): node is FunctionNode
isDelimiter(node): node is DelimiterNode
isSubscript(node): node is SubscriptNode
isSuperscript(node): node is SuperscriptNode

// Relations
isRelation(node): node is RelationNode
```

### Utility Predicates

```typescript
hasChildren(node: MathNode): boolean
isLeaf(node: MathNode): boolean
hasMetadata(node: MathNode): boolean
```

### Specific Predicates

```typescript
isFraction(node): node is DivisionNode          // displayStyle: 'fraction'
isImplicitMultiplication(node): node is MultiplicationNode  // displayStyle: 'implicit'
isComparison(node): node is RelationNode        // <, >, <=, >=
isEquality(node): node is RelationNode          // =
isInequality(node): node is RelationNode        // !=
```

---

## Flatten/Unflatten Helpers

### Purpose

Transforms associative operations (addition/multiplication) from tree form to flat form for algebraic manipulation.

### Types

```typescript
type Sign = '+' | '-';

type SignedTerm = {
	readonly sign: Sign;
	readonly term: MathNode;
};

type FlatSum = readonly SignedTerm[];
type FlatProduct = readonly MathNode[];

type DeepFlatSumResult = {
	readonly terms: FlatSum;
	readonly subLists: ReadonlyMap<MathNode, DeepFlatSumResult | DeepFlatProductResult>;
};

type DeepFlatProductResult = {
	readonly factors: FlatProduct;
	readonly subLists: ReadonlyMap<MathNode, DeepFlatSumResult | DeepFlatProductResult>;
};
```

### Shallow Flattening

```typescript
flattenSumShallow(node: MathNode): FlatSum
flattenProductShallow(node: MathNode): FlatProduct
```

**Key behavior**: Stops at delimiter boundaries (delimiters are intangible).

**Sum algorithm**:

- `addition(a, b)` → `[...flatten(a), ...flatten(b)]`
- `subtraction(a, b)` → `[...flatten(a), ...flatten(b, flipped)]`
- `opposite(a)` → `flatten(a, flipped)`
- `positive(a)` → `flatten(a, same)`
- `delimiter` → **STOP**, treat as atomic term
- Other → atomic term

**Product algorithm**:

- `multiplication(a, b)` → `[...flatten(a), ...flatten(b)]`
- `delimiter` → **STOP**, treat as atomic factor
- Other → atomic factor

### Deep Flattening

```typescript
flattenSumDeep(node: MathNode): DeepFlatSumResult
flattenProductDeep(node: MathNode): DeepFlatProductResult
```

Extends shallow flattening by recursively processing:

- Delimiter contents
- Function arguments, power, base
- Division numerator, denominator
- Subscript/Superscript components
- Relation sides

Results stored in `subLists` map.

### Unflattening

```typescript
unflattenSum(terms: FlatSum): MathNode | null
unflattenProduct(factors: FlatProduct, style?: MultiplicationDisplayStyle): MathNode | null
```

Reconstructs tree with **left associativity**:

- `[a, b, c]` → `((a op b) op c)`
- Empty array → `null`
- Single item → item (with sign handling for sums)

### Helper

```typescript
flipSign(sign: Sign): Sign  // '+' ↔ '-'
```

---

## Relation Chains

### Overview

Relation chains allow expressing multiple consecutive relations like `a < b < c` or `a = b = c = d`. They are implemented as **nested binary relations with left associativity**, reusing the existing `RelationNode` structure.

```typescript
// a < b < c is represented as:
relation('<', relation('<', a, b), c); // ((a < b) < c)
```

### Creating Chains

#### Explicit Factory (for mixed relations)

```typescript
// a <= b < c (mixed)
const mixed = relationChain([a, b, c], ['<=', '<']);
```

#### Convenience Factories (homogeneous chains)

```typescript
// a = b = c = d
const eq = equalsChain(a, b, c, d);

// 1 < x < 10
const comp = lessThanChain(number('1'), variable('x'), number('10'));

// P ⟹ Q ⟹ R
const impl = impliesChain(P, Q, R);

// P ⟺ Q ⟺ R
const equiv = iffChain(P, Q, R);
```

### Flatten/Unflatten

```typescript
// Flatten: extract operands and relations
const flat = flattenRelationChain(chain);
// { operands: [a, b, c], relations: ['<', '<'] }

// Unflatten: rebuild nested structure
const rebuilt = unflattenRelationChain([a, b, c], ['<', '<']);
// relation('<', relation('<', a, b), c)
```

### Type Guards

```typescript
isRelationChain(node); // true if nested (3+ operands)
isComparisonChain(node); // all relations are <, >, <=, >=
isEqualityChain(node); // all relations are =
isImplicationChain(node); // all relations are ⟹
isEquivalenceChain(node); // all relations are ⟺

getRelationChainLength(node); // number of operands (2 for binary, 3+ for chains)
```

### LaTeX Output

| Expression                           | LaTeX                     |
| ------------------------------------ | ------------------------- |
| `lessThanChain(a, b, c)`             | `a < b < c`               |
| `equalsChain(a, b, c, d)`            | `a = b = c = d`           |
| `relationChain([a,b,c], ['<=','<'])` | `a \leq b < c`            |
| `impliesChain(P, Q, R)`              | `P \implies Q \implies R` |
| `iffChain(P, Q, R)`                  | `P \iff Q \iff R`         |

---

## Usage Patterns

### Creating Expressions

```typescript
import { MathAST } from '$lib/mathAST';

// x^2 + 3x - 5 = 0
const equation = MathAST.equals(
	MathAST.subtract(
		MathAST.add(
			MathAST.power(MathAST.variable('x'), MathAST.number('2')),
			MathAST.implicitMultiply(MathAST.number('3'), MathAST.variable('x'))
		),
		MathAST.number('5')
	),
	MathAST.number('0')
);

// sin^2(x) + cos^2(x) = 1
const identity = MathAST.equals(
	MathAST.add(
		MathAST.power(MathAST.sin(MathAST.variable('x')), MathAST.number('2')),
		MathAST.power(MathAST.cos(MathAST.variable('x')), MathAST.number('2'))
	),
	MathAST.number('1')
);

// log_2(8) = 3
const logExpr = MathAST.equals(
	MathAST.log(MathAST.number('8'), MathAST.number('2')),
	MathAST.number('3')
);
```

### Variable Substitution

```typescript
import { replaceNode, isVariable, number } from '$lib/mathAST';

const substituted = replaceNode(expr, (node) => isVariable(node) && node.name === 'x', number('5'));
```

### Transforming All Numbers

```typescript
import { mapNode, isNumber, number } from '$lib/mathAST';

const doubled = mapNode(expr, (node) => {
	if (!isNumber(node)) return node;
	return number((parseFloat(node.value) * 2).toString());
});
```

### Adding Metadata

```typescript
import { mapNode, isVariable, withMetadata } from '$lib/mathAST';

const colored = mapNode(expr, (node) => {
	if (!isVariable(node)) return node;
	return withMetadata(node, { color: 'red', style: 'italic' });
});
```

### Tree Analysis

```typescript
import { findNodes, countNodes, getDepth, isFunction, isBinaryOperationNode } from '$lib/mathAST';

const functions = findNodes(expr, isFunction);
const operationCount = findNodes(expr, isBinaryOperationNode).length;
const totalNodes = countNodes(expr);
const maxDepth = getDepth(expr);
```

### Flattening for Algebra

```typescript
import { flattenSumShallow, unflattenSum, variable, add } from '$lib/mathAST';

// Flatten: a + b + c → [{+,a}, {+,b}, {+,c}]
const flat = flattenSumShallow(add(add(variable('a'), variable('b')), variable('c')));

// Reorder terms
const reordered = [flat[2], flat[0], flat[1]]; // c, a, b

// Reconstruct: c + a + b
const result = unflattenSum(reordered);
```

### Type-Safe Pattern Matching

```typescript
import {
	MathNode,
	isLiteralNode,
	isBinaryOperationNode,
	isNumber,
	isVariable,
	isAddition
} from '$lib/mathAST';

function evaluate(node: MathNode, vars: Map<string, number>): number {
	if (isNumber(node)) {
		return parseFloat(node.value);
	}
	if (isVariable(node)) {
		return vars.get(node.name) ?? 0;
	}
	if (isAddition(node)) {
		return evaluate(node.left, vars) + evaluate(node.right, vars);
	}
	// ... handle other cases
	throw new Error(`Unsupported node type: ${node.type}`);
}
```

---

## API Summary

### Export Counts

| Module             | Exports | Description       |
| ------------------ | ------- | ----------------- |
| types.ts           | 27      | Type definitions  |
| factory.ts         | 55      | Node creation     |
| transforms.ts      | 10      | Tree manipulation |
| guards.ts          | 29      | Type checking     |
| flatten.ts         | 16      | Flatten/unflatten |
| latex-generator.ts | 3       | LaTeX output      |
| **index.ts**       | **140** | **Public API**    |

### Quick Reference

| Category            | Functions                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Literals**        | `number`, `variable`, `greek`, `symbol`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Binary Ops**      | `add`, `subtract`, `multiply`, `implicitMultiply`, `divide`, `fraction`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Unary Ops**       | `opposite`, `positive`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Functions**       | `func`, `sin`, `cos`, `tan`, `ln`, `log`, `exp`, `sqrt`, `abs`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Structural**      | `delimiter`, `parentheses`, `brackets`, `braces`, `subscript`, `superscript`, `power`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Relations**       | `relation`, `equals`, `lessThan`, `greaterThan`, `lessThanOrEqual`, `greaterThanOrEqual`, `notEquals`, `approx`, `congruent`, `elementOf`, `notElementOf`, `subset`, `subsetOrEqual`, `superset`, `supersetOrEqual`, `implies`, `iff`                                                                                                                                                                                                                                                                                                                                          |
| **Relation Chains** | `relationChain`, `equalsChain`, `lessThanChain`, `lessThanOrEqualChain`, `greaterThanChain`, `greaterThanOrEqualChain`, `impliesChain`, `iffChain`                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Transforms**      | `withMetadata`, `getChildren`, `mapNode`, `mapNodeTopDown`, `findNodes`, `findFirst`, `replaceNode`, `cloneNode`, `countNodes`, `getDepth`                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Guards**          | `isNumber`, `isVariable`, `isGreek`, `isSymbol`, `isAddition`, `isSubtraction`, `isMultiplication`, `isDivision`, `isOpposite`, `isPositive`, `isFunction`, `isDelimiter`, `isSubscript`, `isSuperscript`, `isRelation`, `isLiteralNode`, `isBinaryOperationNode`, `isUnaryOperationNode`, `isStructuralNode`, `hasChildren`, `isLeaf`, `hasMetadata`, `isFraction`, `isImplicitMultiplication`, `isComparison`, `isEquality`, `isInequality`, `isRelationChain`, `isComparisonChain`, `isEqualityChain`, `isImplicationChain`, `isEquivalenceChain`, `getRelationChainLength` |
| **Flatten**         | `flipSign`, `flattenSumShallow`, `flattenProductShallow`, `flattenSumDeep`, `flattenProductDeep`, `unflattenSum`, `unflattenProduct`, `flattenRelationChain`, `unflattenRelationChain`                                                                                                                                                                                                                                                                                                                                                                                         |
| **LaTeX**           | `toLatex`, `LatexGenerator`, `LatexGeneratorOptions`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

---

## LaTeX Generator

### Overview

The LaTeX generator converts MathAST nodes to AMS-LaTeX output with auto-sizing delimiters.

```typescript
import { toLatex, LatexGenerator } from '$lib/mathAST';

// Using the convenience function
const expr = MathAST.power(MathAST.variable('x'), MathAST.number('2'));
const latex = toLatex(expr); // "x^2"

// Using the class
const generator = new LatexGenerator({ renderMetadata: true });
const latex = generator.generate(expr);
```

### Options

```typescript
interface LatexGeneratorOptions {
	readonly renderMetadata?: boolean; // default: false
}
```

- `renderMetadata`: When `true`, renders color and style metadata using `\textcolor{}` and `\mathbf{}`/`\mathit{}`

### Output Examples

| MathAST Expression     | LaTeX Output           |
| ---------------------- | ---------------------- |
| `number('42')`         | `42`                   |
| `variable('x')`        | `x`                    |
| `variable('velocity')` | `\mathit{velocity}`    |
| `greek('alpha')`       | `\alpha`               |
| `greek('Alpha')`       | `A` (roman)            |
| `symbol('infinity')`   | `\infty`               |
| `add(x, y)`            | `x + y`                |
| `fraction(a, b)`       | `\frac{a}{b}`          |
| `sin(x)`               | `\sin\left( x \right)` |
| `power(x, 2)`          | `x^2`                  |
| `parentheses(x)`       | `\left( x \right)`     |
| `equals(x, 5)`         | `x = 5`                |

### Variable Handling

- Single character: rendered as-is (`x` → `x`)
- Multi-character: wrapped in `\mathit{}` (`velocity` → `\mathit{velocity}`)

### Greek Letters

- Lowercase: `\alpha`, `\beta`, etc.
- Uppercase with LaTeX command: `\Gamma`, `\Delta`, `\Sigma`, etc.
- Uppercase roman: Alpha→A, Beta→B, Epsilon→E, Zeta→Z, Eta→H, Iota→I, Kappa→K, Mu→M, Nu→N, Omicron→O, Rho→P, Tau→T, Chi→X

### Delimiters

All delimiters use auto-sizing `\left` and `\right`:

- Parentheses: `\left( ... \right)`
- Brackets: `\left[ ... \right]`
- Braces: `\left\{ ... \right\}`
- Absolute: `\left| ... \right|`
- Floor: `\left\lfloor ... \right\rfloor`
- Ceiling: `\left\lceil ... \right\rceil`
- Invisible: no delimiters (just content)

### Functions

Known functions use `\name` syntax:

- Trigonometric: `sin`, `cos`, `tan`, `cot`, `sec`, `csc`, `arcsin`, `arccos`, `arctan`, `sinh`, `cosh`, `tanh`
- Logarithmic: `ln`, `log`, `exp`
- Calculus: `lim`
- Misc: `min`, `max`, `sup`, `inf`, `det`, `dim`, `ker`, `deg`, `gcd`, `lcm`, `arg`, `mod`

Custom functions (e.g., `f`) are rendered without backslash: `f\left( x \right)`

Function patterns:

- `sin(x)` → `\sin\left( x \right)`
- `sin^2(x)` → `\sin^2\left( x \right)`
- `log_2(8)` → `\log_2\left( 8 \right)`
- `f(x,y)` → `f\left( x, y \right)`

### Metadata Rendering

When `renderMetadata: true`:

- **Color**: `\textcolor{color}{content}`
- **Style bold**: `\mathbf{content}`
- **Style italic**: `\mathit{content}`
- **Style normal**: no wrapper
- **Annotation**: ignored (not rendered)

Metadata wrapping order: style → color

### Precedence

The generator **trusts the AST structure** for precedence. It does not insert smart parentheses. If you want parentheses, include `DelimiterNode` in the AST.

Example: `add(x, multiply(y, z))` → `x + y z` (no extra parentheses around `y z`)

### Type Safety

The generator uses exhaustive type checking with `never` to ensure all node types are handled.

---

## Edge Cases

| Scenario                 | Behavior                                                |
| ------------------------ | ------------------------------------------------------- |
| Empty array in unflatten | Returns `null`                                          |
| Single item unflatten    | Returns item directly (with sign for sums)              |
| Nested opposites         | `opposite(opposite(x))` flattens to `[{+, x}]`          |
| Delimiter boundaries     | Shallow stops; deep processes content                   |
| Function optional fields | `power` and `base` included in children only if present |
| Number precision         | String storage preserves `'3.140'`                      |
