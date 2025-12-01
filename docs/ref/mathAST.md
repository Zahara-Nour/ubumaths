# MathAST - Technical Reference

Complete reference documentation for the MathAST library - an immutable Abstract Syntax Tree for mathematical expressions.

**Location**: `src/lib/mathAST/`
**Tests**: 644 passing (423 core + 75 unit-node + 146 dimensional)
**Purpose**: Pivot structure for transpilation between LaTeX and custom syntax

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Type System](#type-system)
4. [Factory Functions](#factory-functions)
5. [Extended Metadata System](#extended-metadata-system)
6. [Transformation Helpers](#transformation-helpers)
7. [Type Guards](#type-guards)
8. [Flatten/Unflatten Helpers](#flattenunflatten-helpers)
9. [LaTeX Generator](#latex-generator)
10. [Physical Units](#physical-units)
11. [Dimensional Analysis](#dimensional-analysis)
12. [Usage Patterns](#usage-patterns)
13. [API Summary](#api-summary)

---

## Overview

### Design Principles

| Principle         | Implementation                                                         |
| ----------------- | ---------------------------------------------------------------------- |
| **Immutability**  | All nodes have `readonly` properties, transformations return new nodes |
| **Type Safety**   | Discriminated unions via `type` field, comprehensive type guards       |
| **Ergonomics**    | Convenience factories, `MathAST` namespace, optional metadata          |
| **Extensibility** | 16 node types covering all common mathematical constructs              |

### File Structure

```
src/lib/mathAST/
├── index.ts              # Public exports
├── types.ts              # Type definitions
├── factory.ts            # Factory functions (includes unit factories)
├── transforms.ts         # Tree manipulation
├── guards.ts             # Type guards (includes unit guards)
├── flatten.ts            # Flatten helpers
├── latex-generator.ts    # LaTeX output
├── units/                # Physical unit system (Unit AST)
│   ├── types.ts          # Unit type definitions
│   ├── factory.ts        # Unit creation functions
│   ├── parser.ts         # Parse unit strings
│   ├── formatter.ts      # Format units to strings/LaTeX
│   ├── operations.ts     # Unit arithmetic (multiply, divide, power)
│   ├── conversion.ts     # Unit compatibility checking
│   └── definitions.ts    # SI and common unit definitions
├── dimensional/          # Dimensional analysis
│   ├── types.ts          # Analysis types and errors
│   ├── rules.ts          # Function dimensional rules
│   ├── analyzer.ts       # Main analysis logic
│   └── index.ts          # Public exports
└── __tests__/
    ├── factory.test.ts
    ├── transforms.test.ts
    ├── guards.test.ts
    ├── flatten.test.ts
    ├── latex-generator.test.ts
    └── unit-node.test.ts
```

---

## Architecture

### Node Type Hierarchy

```
MathNode (union of 16 types)
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
├── FunctionNode         # sin(x), log_2(x), f^2(x)
│
├── RelationNode         # x = 5, a < b, A ⊂ B
│
└── UnitNode             # 5 m, velocity m/s (expression with physical unit)
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
	// Constants
	| 'infinity'
	| 'emptyset'
	| 'aleph'
	| 'beth'
	| 'ell'
	| 'wp'
	| 'hbar'
	// Calculus
	| 'partial'
	| 'nabla'
	// Logic
	| 'forall'
	| 'exists'
	| 'nexists'
	| 'therefore'
	| 'because'
	| 'qed'
	// Sets
	| 'in'
	| 'notin'
	| 'subset'
	| 'supset'
	| 'subseteq'
	| 'supseteq'
	| 'union'
	| 'intersection'
	| 'setminus'
	// Complex
	| 'Re'
	| 'Im'
	// Relations
	| 'approx'
	| 'simeq'
	| 'cong'
	| 'propto'
	// Geometry
	| 'perp'
	| 'parallel'
	| 'angle'
	| 'measuredangle'
	| 'triangle'
	| 'square'
	| 'diamond'
	// Operators
	| 'cdot'
	| 'times'
	| 'div'
	| 'pm'
	| 'mp'
	| 'ast'
	| 'oplus'
	| 'ominus'
	| 'otimes'
	| 'odot'
	| 'circ'
	// Misc
	| 'degree'
	| 'prime'
	| 'dprime'
	| 'star'
	| 'bullet';

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
	| 'absolute'; // |...|

type DelimiterSemantic =
	| 'grouping' // Default for parentheses
	| 'interval' // [a, b]
	| 'set' // {elements}
	| 'absolute' // |x|
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

## Extended Metadata System

The extended metadata system allows fine-grained styling control over specific parts of expressions. Beyond the base `metadata` field (which colors the entire node), you can now target operators, delimiters, function names, relations, and units with independent metadata.

### Overview

Extended metadata fields are available on specific node types:

- **Binary Operations** (`AdditionNode`, `SubtractionNode`, `MultiplicationNode`, `DivisionNode`): `operatorMetadata`
- **Unary Operations** (`OppositeNode`, `PositiveNode`): `operatorMetadata`
- **Delimiters** (`DelimiterNode`, `FunctionNode`): `delimiterMetadata`, `leftDelimiterMetadata`, `rightDelimiterMetadata`
- **Functions** (`FunctionNode`): `nameMetadata` (for the function name itself)
- **Relations** (`RelationNode`): `relationMetadata`
- **Units** (`UnitNode`): `unitMetadata`

Each extended metadata field accepts a standard `NodeMetadata` object with optional `color`, `style`, and `annotation` properties.

### Factory Options Types

#### BinaryOpOptions

Used by `add()`, `subtract()`, `multiply()`, `divide()`, `fraction()`:

```typescript
interface BinaryOpOptions {
	operatorMetadata?: NodeMetadata; // Metadata for the operator symbol (+, -, *, /)
	metadata?: NodeMetadata; // Metadata for the entire node
}
```

**Backward compatibility**: Factories also accept plain `NodeMetadata` as a shorthand for `{ metadata: NodeMetadata }`.

#### UnaryOpOptions

Used by `opposite()`, `positive()`:

```typescript
interface UnaryOpOptions {
	operatorMetadata?: NodeMetadata; // Metadata for the operator (-, +)
	metadata?: NodeMetadata; // Metadata for the entire node
}
```

#### DelimiterOptions

Used by `delimiter()`, `parentheses()`:

```typescript
interface DelimiterOptions {
	delimiterMetadata?: NodeMetadata; // Metadata applied to both delimiters (default)
	leftDelimiterMetadata?: NodeMetadata; // Metadata for opening delimiter only
	rightDelimiterMetadata?: NodeMetadata; // Metadata for closing delimiter only
	metadata?: NodeMetadata; // Metadata for the entire node
}
```

**Note**: When specific left/right metadata is provided, it takes precedence over the generic `delimiterMetadata`.

#### FunctionMetadataOptions

Used by `func()`, `sin()`, `cos()`, `tan()`, `ln()`, `log()`, `exp()`, `sqrt()`, `abs()`:

```typescript
interface FunctionMetadataOptions {
	nameMetadata?: NodeMetadata; // Metadata for the function name (sin, cos, f, etc.)
	delimiterMetadata?: NodeMetadata; // Metadata applied to both delimiters
	leftDelimiterMetadata?: NodeMetadata; // Metadata for opening parenthesis only
	rightDelimiterMetadata?: NodeMetadata; // Metadata for closing parenthesis only
	metadata?: NodeMetadata; // Metadata for the entire node
}
```

#### RelationOptions

Used by `relation()`, `equals()`, `lessThan()`, and all relation factory functions:

```typescript
interface RelationOptions {
	relationMetadata?: NodeMetadata; // Metadata for the relation symbol (=, <, etc.)
	metadata?: NodeMetadata; // Metadata for the entire node
}
```

#### UnitOptions

Used by `withUnit()`, `quantity()`, `quantityVar()`:

```typescript
interface UnitOptions {
	unitMetadata?: NodeMetadata; // Metadata for the unit part
	metadata?: NodeMetadata; // Metadata for the entire node (expression + unit)
}
```

### Usage Examples

#### Coloring Binary Operators

```typescript
import { MathAST, toLatex } from '$lib/mathAST';

// Color the + operator red: 3 (red +) 4
const expr = MathAST.add(MathAST.number('3'), MathAST.number('4'), {
	operatorMetadata: { color: 'red' }
});
// LaTeX with renderMetadata: true → "3\textcolor{red}{+}4"

// Color just the subtraction operator in blue: 5 (blue -) 2
const sub = MathAST.subtract(MathAST.number('5'), MathAST.number('2'), {
	operatorMetadata: { color: 'blue', style: 'bold' }
});
// LaTeX with renderMetadata: true → "5\mathbf{\textcolor{blue}{-}}2"
```

#### Coloring Function Names and Delimiters

```typescript
// Color the function name red, delimiters blue
const fn = MathAST.sin(MathAST.variable('x'), {
	nameMetadata: { color: 'red' },
	delimiterMetadata: { color: 'blue' }
});
// LaTeX with renderMetadata: true → "\textcolor{red}{\sin}\textcolor{blue}{\left( x \right)}"

// Color left and right delimiters differently
const paren = MathAST.parentheses(MathAST.number('42'), {
	leftDelimiterMetadata: { color: 'blue' },
	rightDelimiterMetadata: { color: 'green' }
});
// LaTeX with renderMetadata: true → "\textcolor{blue}{\left(}42\textcolor{green}{\right)}"
```

#### Coloring Relation Symbols

```typescript
// Color the equals sign in green
const eq = MathAST.equals(MathAST.variable('x'), MathAST.number('5'), {
	relationMetadata: { color: 'green' }
});
// LaTeX with renderMetadata: true → "x\textcolor{green}{=}5"
```

#### Coloring Units

```typescript
// Color the unit red, keep the number black
const qty = MathAST.quantity('5', 'm', {
	unitMetadata: { color: 'red' }
});
// LaTeX with renderMetadata: true → "5~\textcolor{red}{\unit{m}}"
```

---

## Transformation Helpers

### Metadata

#### Standard Metadata

```typescript
withMetadata<T extends MathNode>(node: T, metadata: Partial<NodeMetadata>): T
```

Merges metadata into a node, returning a new node.

#### Extended Metadata Helpers

```typescript
// Add/merge operator metadata to binary or unary operations
withOperatorMetadata<T extends MathNode>(
	node: T,
	operatorMetadata: Partial<NodeMetadata>
): T

// Add/merge delimiter metadata to DelimiterNode or FunctionNode
// side: 'left' | 'right' | 'both' (default: 'both')
withDelimiterMetadata<T extends MathNode>(
	node: T,
	delimiterMetadata: Partial<NodeMetadata>,
	side?: 'left' | 'right' | 'both'
): T

// Add/merge function name metadata to FunctionNode
withNameMetadata<T extends MathNode>(
	node: T,
	nameMetadata: Partial<NodeMetadata>
): T

// Add/merge relation metadata to RelationNode
withRelationMetadata<T extends MathNode>(
	node: T,
	relationMetadata: Partial<NodeMetadata>
): T

// Add/merge unit metadata to UnitNode
withUnitMetadata<T extends MathNode>(
	node: T,
	unitMetadata: Partial<NodeMetadata>
): T
```

**Behavior**: These helpers safely return the node unchanged if it doesn't support the extended metadata field. For example, calling `withOperatorMetadata()` on a `NumberNode` returns it unchanged.

**Example**:

```typescript
import { MathAST, withOperatorMetadata, withNameMetadata } from '$lib/mathAST';

// Add operator metadata to existing node
let expr = MathAST.add(MathAST.number('3'), MathAST.number('4'));
expr = withOperatorMetadata(expr, { color: 'red' });

// Add function name metadata
let fn = MathAST.sin(MathAST.variable('x'));
fn = withNameMetadata(fn, { color: 'blue', style: 'bold' });

// Delimiter metadata with side specificity
let paren = MathAST.parentheses(MathAST.variable('y'));
paren = withDelimiterMetadata(paren, { color: 'green' }, 'left'); // Only left delimiter
```

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

### Extended Metadata Predicates

```typescript
// Check for specific extended metadata fields
hasOperatorMetadata(node: MathNode): boolean       // Check if node has operator metadata
hasDelimiterMetadata(node: MathNode): boolean      // Check if node has any delimiter metadata
hasNameMetadata(node: MathNode): boolean           // Check if node has function name metadata
hasRelationMetadata(node: MathNode): boolean       // Check if node has relation metadata
hasUnitMetadata(node: MathNode): boolean           // Check if node has unit metadata

// Check for any metadata (standard or extended)
hasAnyMetadata(node: MathNode): boolean            // true if node has any metadata type
```

**Example**:

```typescript
import { hasOperatorMetadata, hasDelimiterMetadata, hasAnyMetadata } from '$lib/mathAST';

const add = MathAST.add(MathAST.number('3'), MathAST.number('4'), {
	operatorMetadata: { color: 'red' }
});

hasOperatorMetadata(add); // true
hasMetadata(add); // false (no standard metadata)
hasAnyMetadata(add); // true

const num = MathAST.number('42');
hasAnyMetadata(num); // false
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

| Module             | Exports | Description             |
| ------------------ | ------- | ----------------------- |
| types.ts           | 27      | Type definitions        |
| factory.ts         | 61      | Node creation + options |
| transforms.ts      | 15      | Tree manipulation       |
| guards.ts          | 35      | Type checking           |
| flatten.ts         | 16      | Flatten/unflatten       |
| latex-generator.ts | 3       | LaTeX output            |
| **index.ts**       | **157** | **Public API**          |

**New in extended metadata**: 6 options types, 5 transform helpers, 6 guard functions

### Quick Reference

| Category            | Functions                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Literals**        | `number`, `variable`, `greek`, `symbol`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Binary Ops**      | `add`, `subtract`, `multiply`, `implicitMultiply`, `divide`, `fraction`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Unary Ops**       | `opposite`, `positive`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Functions**       | `func`, `sin`, `cos`, `tan`, `ln`, `log`, `exp`, `sqrt`, `abs`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Structural**      | `delimiter`, `parentheses`, `subscript`, `superscript`, `power`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Relations**       | `relation`, `equals`, `lessThan`, `greaterThan`, `lessThanOrEqual`, `greaterThanOrEqual`, `notEquals`, `approx`, `congruent`, `elementOf`, `notElementOf`, `subset`, `subsetOrEqual`, `superset`, `supersetOrEqual`, `implies`, `iff`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Relation Chains** | `relationChain`, `equalsChain`, `lessThanChain`, `lessThanOrEqualChain`, `greaterThanChain`, `greaterThanOrEqualChain`, `impliesChain`, `iffChain`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Transforms**      | `withMetadata`, `withOperatorMetadata`, `withDelimiterMetadata`, `withNameMetadata`, `withRelationMetadata`, `withUnitMetadata`, `getChildren`, `mapNode`, `mapNodeTopDown`, `findNodes`, `findFirst`, `replaceNode`, `cloneNode`, `countNodes`, `getDepth`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Guards**          | `isNumber`, `isVariable`, `isGreek`, `isSymbol`, `isAddition`, `isSubtraction`, `isMultiplication`, `isDivision`, `isOpposite`, `isPositive`, `isFunction`, `isDelimiter`, `isSubscript`, `isSuperscript`, `isRelation`, `isUnit`, `isLiteralNode`, `isBinaryOperationNode`, `isUnaryOperationNode`, `isStructuralNode`, `hasChildren`, `isLeaf`, `hasMetadata`, `hasOperatorMetadata`, `hasDelimiterMetadata`, `hasNameMetadata`, `hasRelationMetadata`, `hasUnitMetadata`, `hasAnyMetadata`, `isFraction`, `isImplicitMultiplication`, `isComparison`, `isEquality`, `isInequality`, `isRelationChain`, `isComparisonChain`, `isEqualityChain`, `isImplicationChain`, `isEquivalenceChain`, `getRelationChainLength`, `hasUnitDescendant`, `isDimensionlessUnit` |
| **Flatten**         | `flipSign`, `flattenSumShallow`, `flattenProductShallow`, `flattenSumDeep`, `flattenProductDeep`, `unflattenSum`, `unflattenProduct`, `flattenRelationChain`, `unflattenRelationChain`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **LaTeX**           | `toLatex`, `LatexGenerator`, `LatexGeneratorOptions`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Options Types**   | `BinaryOpOptions`, `UnaryOpOptions`, `DelimiterOptions`, `FunctionMetadataOptions`, `RelationOptions`, `UnitOptions`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

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
- Absolute: `\left| ... \right|`

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

### Coalescence (Merging Adjacent Same-Color Spans)

The LaTeX generator optimizes metadata rendering by merging adjacent spans with the same color. This reduces LaTeX output size and improves rendering efficiency.

**How it works**:

Adjacent spans with identical color values are merged into a single `\textcolor{}` block. Style (bold/italic) is applied per-span independently since different spans can have different styles.

**Examples**:

```
Input (with operatorMetadata and number colorized red):
  3 (red) + (red) 4

Output without coalescence:
  \textcolor{red}{3}\textcolor{red}{+}\textcolor{red}{4}

Output with coalescence:
  \textcolor{red}{3+4}
```

**Edge cases**:

- Different colors: `\textcolor{red}{3}\textcolor{blue}{+}\textcolor{red}{4}` - no merging (colors differ)
- Different styles: `\textcolor{red}{\mathbf{3}}\textcolor{red}{+}` - no merging (styles differ)
- Same color, no style: `\textcolor{red}{3}\textcolor{red}{+}` → `\textcolor{red}{3+}` (merged)

### Precedence

The generator **trusts the AST structure** for precedence. It does not insert smart parentheses. If you want parentheses, include `DelimiterNode` in the AST.

Example: `add(x, multiply(y, z))` → `x + y z` (no extra parentheses around `y z`)

### Type Safety

The generator uses exhaustive type checking with `never` to ensure all node types are handled.

---

## Physical Units

### Overview

MathAST supports physical units through the `UnitNode` type and the Unit AST system. This enables representing quantities like "5 meters" or "10 m/s" and performing dimensional analysis.

### UnitNode

```typescript
interface UnitNode {
	readonly type: 'unit';
	readonly expression: MathNode; // The numeric/symbolic part
	readonly unit: Unit; // The physical unit
	readonly metadata?: NodeMetadata;
}
```

### Unit Type

```typescript
interface Unit {
	readonly components: ReadonlyMap<string, number>; // symbol -> exponent
	readonly coefficient: number; // scaling factor
	readonly original?: string; // original string representation
}

// Examples:
// meters: { components: Map([['m', 1]]), coefficient: 1 }
// m/s: { components: Map([['m', 1], ['s', -1]]), coefficient: 1 }
// km: { components: Map([['m', 1]]), coefficient: 1000 }
```

### Factory Functions

```typescript
// Wrap any expression with a unit
withUnit(expression: MathNode, unit: Unit, metadata?): UnitNode

// Create quantity with parsed unit string
quantity(value: string, unitStr: string, metadata?): UnitNode
// Example: quantity('5', 'm') → 5 m
// Example: quantity('10', 'm/s') → 10 m/s

// Create variable with unit
quantityVar(name: string, unitStr: string, metadata?): UnitNode
// Example: quantityVar('v', 'm/s') → v m/s
```

### Type Guards

```typescript
isUnit(node: MathNode): node is UnitNode

// Check if any descendant has a unit
hasUnitDescendant(node: MathNode): boolean

// Check if unit is dimensionless (all exponents are 0)
isDimensionlessUnit(node: MathNode): boolean
```

### LaTeX Output

Units are rendered using the `\unit{}` macro:

```typescript
quantity('5', 'm'); // → "5~\unit{m}"
quantity('10', 'm/s'); // → "10~\unit{m.s^{-1}}"
```

---

## Dimensional Analysis

### Overview

The dimensional analysis module validates unit compatibility in mathematical expressions and computes resulting units. It catches errors like adding meters to seconds.

```typescript
import { analyzeDimensions, isDimensionallyValid } from '$lib/mathAST/dimensional';

// Valid: adding meters
const valid = add(quantity('5', 'm'), quantity('3', 'm'));
const result = analyzeDimensions(valid);
// { valid: true, resultUnit: { m: 1 }, errors: [] }

// Invalid: adding meters and seconds
const invalid = add(quantity('5', 'm'), quantity('3', 's'));
const result2 = analyzeDimensions(invalid);
// { valid: false, resultUnit: null, errors: [{ code: 'INCOMPATIBLE_UNITS', ... }] }
```

### Analysis Result

```typescript
interface DimensionalAnalysisResult {
	readonly valid: boolean;
	readonly resultUnit: Unit | null;
	readonly errors: readonly DimensionalError[];
	readonly warnings?: readonly DimensionalWarning[];
}
```

### Error Codes

| Code                         | Description                              |
| ---------------------------- | ---------------------------------------- |
| `INCOMPATIBLE_UNITS`         | Cannot add/subtract different unit types |
| `INVALID_FUNCTION_INPUT`     | Function received wrong unit type        |
| `UNDEFINED_VARIABLE`         | Variable not found in context            |
| `NON_INTEGER_EXPONENT`       | Fractional exponent when not allowed     |
| `NESTED_UNITS`               | Expression already has units             |
| `INCONSISTENT_FUNCTION_ARGS` | Function args have different units       |
| `INVALID_RELATION`           | Comparing incompatible units             |

### Context

Provide variable units and options via context:

```typescript
const context: DimensionalContext = {
	variables: new Map([
		['v', parseUnit('m/s')],
		['t', parseUnit('s')]
	]),
	options: {
		strictMode: true, // Error on unknown variables (default: true)
		allowDimensionlessMix: false, // Allow mixing units with dimensionless (default: false)
		allowFractionalExponents: true // Allow sqrt(m) → m^0.5 (default: true)
	}
};

const result = analyzeDimensions(expr, context);
```

### Function Rules

Built-in functions have dimensional rules:

| Function Category    | Input Requirement   | Output        |
| -------------------- | ------------------- | ------------- |
| Trig (sin, cos, tan) | angle/dimensionless | dimensionless |
| Inverse trig         | dimensionless       | angle         |
| Hyperbolic           | dimensionless       | dimensionless |
| Logarithms           | dimensionless       | dimensionless |
| sqrt                 | any                 | input^0.5     |
| cbrt                 | any                 | input^(1/3)   |
| abs, floor, ceil     | any                 | preserve      |
| min, max             | same units          | preserve      |
| sign                 | any                 | dimensionless |

### Convenience Functions

```typescript
// Quick validity check
isDimensionallyValid(node: MathNode, context?): boolean

// Get resulting unit (null if invalid)
getResultingUnit(node: MathNode, context?): Unit | null
```

### Namespace

```typescript
import { DimensionalAnalysis } from '$lib/mathAST/dimensional';

DimensionalAnalysis.analyze(expr); // Full analysis
DimensionalAnalysis.isValid(expr); // Quick check
DimensionalAnalysis.getUnit(expr); // Get unit
```

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
