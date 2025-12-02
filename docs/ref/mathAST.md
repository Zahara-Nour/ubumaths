# MathAST - Technical Reference

Complete reference documentation for the MathAST library - an immutable Abstract Syntax Tree for mathematical expressions.

**Location**: `src/lib/mathAST/`
**Tests**: 1655 passing (644 core + 737 parser + 94 custom generator + 90 Exp + 90 CLI)
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
9. [Exp Fluent Wrapper](#exp-fluent-wrapper)
10. [LaTeX Generator](#latex-generator)
11. [LaTeX Parser](#latex-parser)
12. [Custom Syntax Generator](#custom-syntax-generator)
13. [Physical Units](#physical-units)
14. [Dimensional Analysis](#dimensional-analysis)
15. [Usage Patterns](#usage-patterns)
16. [API Summary](#api-summary)
17. [CLI](#cli)

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
├── exp.ts                # Exp fluent wrapper class
├── latex-generator.ts    # LaTeX output
├── pretty-print.ts       # Pretty-print tree output
├── parser/               # Parser infrastructure (737 tests)
│   ├── index.ts          # Public API (parseLatex, parseLatexSafe)
│   ├── types.ts          # Token types, ParserOptions, ParseError
│   └── latex/            # LaTeX parser implementation
│       ├── index.ts      # LaTeX parser exports
│       ├── tokenizer.ts  # LaTeX lexer
│       ├── color-stack.ts # Color context for nested \textcolor
│       ├── parser-pratt.ts # Pratt parser (transparent \textcolor support)
│       ├── parser-rd.ts  # Recursive Descent parser (transparent \textcolor support)
│       └── __tests__/    # LaTeX parser tests
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
    ├── exp.test.ts
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
type DelimiterType = 'parentheses'; // (...)
// Note: Absolute value |x| is represented as FunctionNode with name: 'abs'

type DelimiterSemantic =
	| 'grouping' // Default for parentheses
	| 'interval' // [a, b]
	| 'set' // {elements}
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

## Exp Fluent Wrapper

### Overview

The `Exp` class provides a fluent, chainable API for building and manipulating mathematical ASTs. It wraps `MathNode` with ergonomic methods while maintaining immutability - all operations return new `Exp` instances.

```typescript
import { Exp, isVariable } from '$lib/mathAST';

// Fluent construction: x^2 + 3x - 5 = 0
const expr = Exp.variable('x')
	.power(Exp.number('2'))
	.add(Exp.number('3').multiply(Exp.variable('x')))
	.subtract(Exp.number('5'))
	.equals(Exp.number('0'));

console.log(expr.latex); // x^2 + 3 x - 5 = 0
console.log(expr.tree); // Pretty-printed AST

// Functions: static and instance
Exp.sin(Exp.variable('x')); // sin(x)
Exp.variable('x').sin(); // sin(x) - equivalent

// Transformations
const colored = expr.map((node) =>
	isVariable(node) ? { ...node, metadata: { color: 'red' } } : node
);
```

### Design Principles

| Principle          | Implementation                                                                          |
| ------------------ | --------------------------------------------------------------------------------------- |
| **Immutability**   | All operations return new `Exp` instances                                               |
| **Interop**        | All methods accept both `Exp` and `MathNode` parameters                                 |
| **Thin Wrapper**   | Delegates to existing factory/transform functions (no code duplication)                 |
| **Dual Functions** | Math functions available as both static (`Exp.sin(x)`) and instance methods (`x.sin()`) |

### Output Getters

```typescript
class Exp {
	// Get the underlying MathNode
	get node(): MathNode;

	// Get the node type
	get type(): MathNode['type'];

	// Generate LaTeX output (default options)
	get latex(): string;

	// Generate pretty-print tree (default options)
	get tree(): string;

	// Generate LaTeX with custom options
	toLatex(options?: LatexGeneratorOptions): string;

	// Generate pretty-print tree with custom options
	toTree(options?: PrettyPrintOptions): string;
}
```

### Static Factories

#### Wrapping & Parsing

```typescript
// Wrap an existing MathNode
Exp.from(node: MathNode): Exp

// Parse LaTeX string into Exp
Exp.parse(latex: string, options?: LatexParserOptions): Exp
```

#### Literals

```typescript
Exp.number(value: string, metadata?: NodeMetadata): Exp
Exp.variable(name: string, metadata?: NodeMetadata): Exp
Exp.greek(letter: GreekLetter, metadata?: NodeMetadata): Exp
Exp.symbol(sym: MathSymbol, metadata?: NodeMetadata): Exp
```

#### Binary Operations

```typescript
Exp.add(left: Exp | MathNode, right: Exp | MathNode): Exp
Exp.subtract(left: Exp | MathNode, right: Exp | MathNode): Exp
Exp.multiply(left: Exp | MathNode, right: Exp | MathNode, style?: MultiplicationDisplayStyle): Exp
Exp.divide(numerator: Exp | MathNode, denominator: Exp | MathNode, style?: DivisionDisplayStyle): Exp
Exp.fraction(numerator: Exp | MathNode, denominator: Exp | MathNode): Exp
```

#### Unary Operations

```typescript
Exp.opposite(operand: Exp | MathNode): Exp
Exp.positive(operand: Exp | MathNode): Exp
```

#### Structural

```typescript
Exp.power(base: Exp | MathNode, exponent: Exp | MathNode): Exp
Exp.subscript(base: Exp | MathNode, sub: Exp | MathNode): Exp
Exp.parentheses(content: Exp | MathNode): Exp
```

#### Functions

```typescript
Exp.func(name: string, args: (Exp | MathNode)[], options?: FunctionOptions): Exp
Exp.sin(arg: Exp | MathNode, options?: FunctionOptions): Exp
Exp.cos(arg: Exp | MathNode, options?: FunctionOptions): Exp
Exp.tan(arg: Exp | MathNode, options?: FunctionOptions): Exp
Exp.ln(arg: Exp | MathNode, options?: FunctionOptions): Exp
Exp.log(arg: Exp | MathNode, base?: Exp | MathNode, options?: FunctionOptions): Exp
Exp.exp(arg: Exp | MathNode, options?: FunctionOptions): Exp
Exp.sqrt(arg: Exp | MathNode, options?: FunctionOptions): Exp
Exp.abs(arg: Exp | MathNode, options?: FunctionOptions): Exp
```

#### Relations

```typescript
Exp.equals(left: Exp | MathNode, right: Exp | MathNode): Exp
Exp.lessThan(left: Exp | MathNode, right: Exp | MathNode): Exp
Exp.greaterThan(left: Exp | MathNode, right: Exp | MathNode): Exp
Exp.lessThanOrEqual(left: Exp | MathNode, right: Exp | MathNode): Exp
Exp.greaterThanOrEqual(left: Exp | MathNode, right: Exp | MathNode): Exp
Exp.notEquals(left: Exp | MathNode, right: Exp | MathNode): Exp
Exp.approx(left: Exp | MathNode, right: Exp | MathNode): Exp
Exp.congruent(left: Exp | MathNode, right: Exp | MathNode): Exp
```

### Instance Methods (Fluent)

All instance methods accept `Exp | MathNode` parameters and return new `Exp` instances.

#### Binary Operations

```typescript
exp.add(other): Exp        // this + other
exp.subtract(other): Exp   // this - other
exp.multiply(other, style?): Exp  // this * other (default: 'implicit')
exp.divide(other, style?): Exp    // this / other (default: 'fraction')
exp.fraction(other): Exp   // this / other (fraction display)
```

#### Unary Operations

```typescript
exp.negate(): Exp    // -this
exp.positive(): Exp  // +this
```

#### Structural

```typescript
exp.power(exponent): Exp    // this^exponent
exp.subscript(sub): Exp     // this_sub
exp.parentheses(): Exp      // (this)
```

#### Functions (applies function to this)

```typescript
exp.sin(options?): Exp    // sin(this)
exp.cos(options?): Exp    // cos(this)
exp.tan(options?): Exp    // tan(this)
exp.ln(options?): Exp     // ln(this)
exp.log(base?, options?): Exp  // log(this) or log_base(this)
exp.exp(options?): Exp    // exp(this)
exp.sqrt(options?): Exp   // sqrt(this)
exp.abs(options?): Exp    // abs(this)
```

#### Relations

```typescript
exp.equals(other): Exp           // this = other
exp.lessThan(other): Exp         // this < other
exp.greaterThan(other): Exp      // this > other
exp.lessThanOrEqual(other): Exp  // this <= other
exp.greaterThanOrEqual(other): Exp // this >= other
exp.notEquals(other): Exp        // this != other
exp.approx(other): Exp           // this ≈ other
exp.congruent(other): Exp        // this ≡ other
```

### Transformations

```typescript
// Add/merge metadata to this node
exp.withMetadata(metadata: Partial<NodeMetadata>): Exp

// Transform all nodes recursively (bottom-up: children first)
exp.map(fn: (node: MathNode) => MathNode): Exp

// Transform all nodes recursively (top-down: parent first)
exp.mapTopDown(fn: (node: MathNode) => MathNode): Exp

// Find all nodes matching predicate
exp.find(predicate: (node: MathNode) => boolean): MathNode[]

// Find first node matching predicate
exp.findFirst(predicate: (node: MathNode) => boolean): MathNode | undefined

// Replace nodes matching predicate
exp.replace(
  predicate: (node: MathNode) => boolean,
  replacement: MathNode | ((node: MathNode) => MathNode)
): Exp

// Get immediate children as MathNode array
exp.children(): MathNode[]

// Count total nodes in tree
exp.count(): number

// Get maximum depth of tree
exp.depth(): number

// Deep clone this expression
exp.clone(): Exp
```

### Usage Examples

#### Building Expressions Fluently

```typescript
import { Exp } from '$lib/mathAST';

// x^2 + 2x + 1
const quadratic = Exp.variable('x')
	.power(Exp.number('2'))
	.add(Exp.number('2').multiply(Exp.variable('x')))
	.add(Exp.number('1'));

// sin^2(x) + cos^2(x)
const identity = Exp.variable('x')
	.sin()
	.power(Exp.number('2'))
	.add(Exp.variable('x').cos().power(Exp.number('2')));

// (a + b) / (a - b)
const frac = Exp.variable('a')
	.add(Exp.variable('b'))
	.parentheses()
	.fraction(Exp.variable('a').subtract(Exp.variable('b')).parentheses());
```

#### Parsing and Transforming

```typescript
// Parse LaTeX
const parsed = Exp.parse('\\sin(x)^2 + \\cos(x)^2');
console.log(parsed.tree);

// Color all variables red
const colored = parsed.map((node) =>
	node.type === 'variable' ? { ...node, metadata: { color: 'red' } } : node
);
console.log(colored.latex);
```

#### Interop with MathNode

```typescript
import { Exp, variable, number } from '$lib/mathAST';

// Mix Exp and MathNode freely
const x = variable('x'); // MathNode
const expr = Exp.from(x).power(number('2')); // MathNode param works

// Extract MathNode when needed
const node: MathNode = expr.node;
```

### Precedence Note

The fluent chaining is left-to-right, which may differ from mathematical precedence. Use nesting for correct mathematical grouping:

```typescript
// x + y * z (mathematical precedence)
// WRONG: Exp.variable('x').add(Exp.variable('y')).multiply(Exp.variable('z'))
//        → (x + y) * z

// CORRECT: Use static factory with proper structure
Exp.add(Exp.variable('x'), Exp.multiply(Exp.variable('y'), Exp.variable('z')));
// → x + y z
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

| Module              | Exports | Description             |
| ------------------- | ------- | ----------------------- |
| types.ts            | 27      | Type definitions        |
| factory.ts          | 61      | Node creation + options |
| transforms.ts       | 15      | Tree manipulation       |
| guards.ts           | 35      | Type checking           |
| flatten.ts          | 16      | Flatten/unflatten       |
| latex-generator.ts  | 3       | LaTeX output            |
| custom-generator.ts | 2       | Custom syntax output    |
| exp.ts              | 1       | Exp fluent wrapper      |
| **index.ts**        | **160** | **Public API**          |

**New in extended metadata**: 6 options types, 5 transform helpers, 6 guard functions
**New in custom generator**: `toCustom`, `CustomGenerator`, `CustomGeneratorOptions`

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
| **Custom Syntax**   | `toCustom`, `CustomGenerator`, `CustomGeneratorOptions`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Exp Wrapper**     | `Exp` (fluent wrapper class with static factories, instance methods, and transformations)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
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

## LaTeX Parser

### Overview

The LaTeX parser converts LaTeX mathematical expressions into MathAST nodes. Two parser implementations are provided for comparison and flexibility:

| Parser           | Style                        | Best For                         |
| ---------------- | ---------------------------- | -------------------------------- |
| **Pratt Parser** | Top-down operator precedence | Default, proven algorithm        |
| **RD Parser**    | Recursive descent grammar    | Educational, clear grammar rules |

Both parsers produce identical ASTs and support all features:

- All 16 MathNode types
- Nested `\textcolor{color}{content}` via color stack
- Units with `~\unit{}` syntax
- Implicit multiplication detection (2x, xy, 2\sin(x))
- Configurable error handling (strict/tolerant modes)

### Public API

```typescript
import { parseLatex, parseLatexSafe, validateLatex } from '$lib/mathAST';

// Parse LaTeX (throws on error in strict mode)
const ast = parseLatex('x^2 + 2x + 1');

// Parse safely with error collection
const result = parseLatexSafe('x^{2} + 2x + 1');
if (result.ast) {
	console.log(result.ast);
}
if (result.errors.length > 0) {
	console.warn('Parse errors:', result.errors);
}

// Validate syntax only
const errors = validateLatex('x^{'); // Returns array of ParseError
```

### Options

```typescript
interface LatexParserOptions {
	mode?: 'strict' | 'tolerant'; // Default: 'strict' for parseLatex, 'tolerant' for parseLatexSafe
	parser?: 'pratt' | 'rd'; // Default: 'pratt'
}

// Use RD parser with tolerant mode
const ast = parseLatex('x + y', { parser: 'rd', mode: 'tolerant' });
```

### Supported LaTeX Syntax

| Category      | Examples                                      |
| ------------- | --------------------------------------------- | -------- | --- |
| Numbers       | `42`, `3.14`, `.5`                            |
| Variables     | `x`, `y`, `velocity`                          |
| Greek letters | `\alpha`, `\beta`, `\Delta`, `\Omega`         |
| Symbols       | `\infty`, `\partial`, `\nabla`                |
| Operations    | `+`, `-`, `*`, `/`, `\cdot`, `\times`         |
| Powers        | `x^2`, `x^{n+1}`, `x^2^3` (right-associative) |
| Subscripts    | `x_1`, `x_{ij}`                               |
| Fractions     | `\frac{a}{b}`, `\frac{x+1}{x-1}`              |
| Functions     | `\sin(x)`, `\cos^2(x)`, `\log_2(8)`           |
| Square root   | `\sqrt{x}`, `\sqrt[3]{x}`                     |
| Delimiters    | `(x)`, `\left( x \right)`, `\left             | x \right | `   |
| Relations     | `=`, `<`, `>`, `\leq`, `\geq`, `\neq`         |
| Colors        | `\textcolor{red}{x}`, nested colors           |
| Units         | `5~\unit{m}`, `v~\unit{m/s}`                  |

### Transparent \textcolor Handling

The `\textcolor` command is **transparent** to the AST structure - it applies color metadata but does not affect operator parsing or precedence. This ensures expressions parse identically with or without color markup.

**Key behavior:**

- `5 \textcolor{red}{+3}` parses as `Addition(5, 3)` with the `+` operator marked red
- The color is applied to the operator via `operatorMetadata` (or `relationMetadata` for relations)
- Elements inside the textcolor block inherit the color
- Works for all operators: `+`, `-`, `*`, `/`, `^`, `_`, `=`, and relation commands

**Examples:**

| LaTeX                         | AST Structure                  | Metadata                  |
| ----------------------------- | ------------------------------ | ------------------------- |
| `5 \textcolor{red}{+3}`       | `Addition(5, 3)`               | `op:[red]`, right `[red]` |
| `5 \textcolor{red}{*3}`       | `Multiplication(5, 3)`         | `op:[red]`, right `[red]` |
| `a \textcolor{blue}{=} b`     | `Relation(=, a, b)`            | `rel:[blue]`              |
| `\textcolor{red}{x+y}`        | `Addition(x, y)`               | all nodes `[red]`         |
| `5 \textcolor{red}{\times 3}` | `Multiplication [cross](5, 3)` | `op:[red]`, right `[red]` |

**Nested colors:**

```latex
\textcolor{red}{x + \textcolor{blue}{y}}
```

Parses as `Addition(x [red], y [blue])` with the `+` operator inheriting red from the outer scope.

**Implementation notes:**

- Color is captured at the moment the operator token is seen, before parsing the right operand
- This ensures correct color attribution even when the color scope closes during right operand parsing
- Both Pratt and Recursive Descent parsers implement this behavior identically

### Operator Precedence

```
Level 1 (lowest): Relations (=, <, >, ≤, ≥)
Level 2: Addition (+), Subtraction (-)
Level 3: Multiplication (*, ·, ×, implicit)
Level 4: Unary (prefix -, +)
Level 5 (highest): Power (^), Subscript (_)
```

### Right-Associativity

Power operations are right-associative for chained exponents:

- `x^2^3` → `x^(2^3)` (not `(x^2)^3`)
- `x_a_b` → `x_(a_b)` (not `(x_a)_b`)

Mixed subscript/superscript uses left-to-right order:

- `x_1^2` → `(x_1)^2`
- `x^2_1` → `(x^2)_1`

### Error Handling

```typescript
// Strict mode: throws ParseException
try {
	parseLatex('x^{'); // Missing closing brace
} catch (e) {
	console.error(e.message, e.position, e.code);
}

// Tolerant mode: collects errors
const result = parseLatexSafe('x^{ + y');
// result.ast may be partial or null
// result.errors contains all parse errors

// ParseError structure
interface ParseError {
	message: string;
	position: number;
	length: number;
	code: ParseErrorCode; // 'UNEXPECTED_TOKEN', 'MISSING_DELIMITER', etc.
}
```

### Direct Parser Access

For advanced use cases, access parsers directly:

```typescript
import { parsePratt, parsePrattSafe, parseRD, parseRDSafe } from '$lib/mathAST';

const ast1 = parsePratt('x + y'); // Pratt parser
const ast2 = parseRD('x + y'); // RD parser
const result = parsePrattSafe('x^{'); // Safe Pratt parser
```

---

## Custom Syntax Generator

### Overview

The custom syntax generator converts MathAST nodes to custom ASCII Math-style syntax output. It mirrors the LaTeX generator architecture with support for metadata rendering (color/style). The generator produces output compatible with the custom syntax parser for round-trip safety.

```typescript
import { toCustom, CustomGenerator } from '$lib/mathAST';

// Using the convenience function
const expr = MathAST.power(MathAST.variable('x'), MathAST.number('2'));
const custom = toCustom(expr); // "x^2"

// Using the class
const generator = new CustomGenerator({ renderMetadata: true });
const custom = generator.generate(expr);
```

### Key Syntax Mappings

| AST Node                  | Custom Syntax                                | Notes                                           |
| ------------------------- | -------------------------------------------- | ----------------------------------------------- |
| Division (fraction)       | `/`                                          | Tight binding at primary level                  |
| Division (inline)         | `:/`                                         | Multiplicative level                            |
| Division (ratio)          | `:`                                          | Multiplicative level                            |
| Multiplication (implicit) | Juxtaposition                                | `2x`, `xy`                                      |
| Multiplication (explicit) | `*`                                          | All display styles map to `*`                   |
| Absolute value            | `\|x\|`                                      | Rendered from `abs(x)` function                 |
| nth root                  | `sqrt[n](x)`                                 | Index in brackets before parentheses            |
| Colors                    | `@red{...}` or `@#FF0000{...}`               | @ prefix for named or hex colors                |
| Units                     | `5[m/s]`                                     | Bracket notation                                |
| Greek letters             | `\pi`, `\alpha`, `\beta`, `\gamma`, `\theta` | Only 5 supported                                |
| Functions                 | `sin(x)`, `log_2(x)`, `sqrt(x)`              | No backslash, parentheses mandatory             |
| Grouping                  | `{a+b}`                                      | Transparent (no AST node for round-trip safety) |

### Options

```typescript
interface CustomGeneratorOptions {
	readonly renderMetadata?: boolean; // default: false
}
```

- `renderMetadata`: When `true`, renders color metadata using `@color{...}` syntax. Style (bold/italic) and annotation are not rendered in custom syntax output.

### Supported Greek Letters

Only 5 Greek letters are supported in custom syntax (matching the parser):

- `pi` (π)
- `alpha` (α)
- `beta` (β)
- `gamma` (γ)
- `theta` (θ)

Attempting to generate other Greek letters (e.g., `Delta`, `omega`) raises an error.

### Brace Insertion Rules

The generator automatically inserts braces to ensure round-trip safety:

#### For Exponents (Powers)

No braces needed for:

- Single digits: `x^2`
- Single letters: `x^n`
- Supported Greek letters: `x^\pi`
- Multi-digit numbers: `x^12`

Braces required for:

- Negative exponents: `x^{-2}`
- Multi-letter expressions: `x^{n+1}`, `x^{ab}`
- Complex expressions: `x^{2a+b}`

#### For Subscripts

No braces needed for:

- Single digits: `x_1`
- Single letters: `x_n`
- Multi-digit numbers: `x_12`

Braces required for:

- Multi-letter: `x_{ab}`
- Greek letters: `x_{\alpha}`
- Complex expressions: `x_{a+b}`

#### For Fractions (with `/`)

No wrapping needed for:

- Atoms (numbers, variables, Greek letters, symbols)
- Functions with parentheses: `sin(x)/2`
- Delimiters (parentheses): `(a+b)/c`

Braces required for:

- Addition/subtraction: `{a+b}/c`
- Multiplication: `{a*b}/c`
- Other divisions: `{a/b}/c`
- Subscripts/superscripts: `{x_1}/y`

### Output Examples

| Expression                                    | Custom Output | Notes                          |
| --------------------------------------------- | ------------- | ------------------------------ |
| `number('42')`                                | `42`          |                                |
| `variable('x')`                               | `x`           |                                |
| `greek('pi')`                                 | `\pi`         |                                |
| `power(x, 2)`                                 | `x^2`         |                                |
| `fraction(a, b)`                              | `a/b`         |                                |
| `divide(a, b, 'inline')`                      | `a:/b`        |                                |
| `divide(a, b, 'ratio')`                       | `a:b`         |                                |
| `multiply(2, x)` with implicit                | `2x`          |                                |
| `multiply(2, x)` with explicit                | `2*x`         |                                |
| `sin(x)`                                      | `sin(x)`      | No backslash                   |
| `sin(x)` with power=2                         | `sin^2(x)`    |                                |
| `log(x, 2)`                                   | `log_2(x)`    |                                |
| `sqrt(x, 3)`                                  | `sqrt[3](x)`  |                                |
| `abs(x)`                                      | `\|x\|`       |                                |
| `parentheses(x)`                              | `(x)`         |                                |
| `equals(x, 5)`                                | `x=5`         |                                |
| `lessThanChain(a, b, c)`                      | `a<b<c`       |                                |
| `quantity('5', 'm')`                          | `5[m]`        |                                |
| `number('5', { color: 'red' })` with metadata | `@red{5}`     | Only with renderMetadata: true |

### Round-Trip Guarantee

Custom syntax is designed for safe round-tripping:

```typescript
import { parseCustom, toCustom } from '$lib/mathAST';

const input = '2x^2+3x+1';
const ast = parseCustom(input);
const output = toCustom(ast);
// output === '2x^2+3x+1' (exact match with input)
```

The generator produces output that parses back to an equivalent AST. Brace insertion rules ensure unambiguous parsing.

### Metadata Rendering

When `renderMetadata: true`, color metadata is rendered using the `@color{...}` syntax:

```typescript
const expr = MathAST.add(MathAST.number('3'), MathAST.number('4'), {
	operatorMetadata: { color: 'red' }
});

toCustom(expr, { renderMetadata: true });
// Output: "3@red{+}4"
```

Adjacent spans with identical colors are merged (coalescence) to minimize output size:

```typescript
// All red: 3 + 4 (operator and right operand both red)
toCustom(expr, { renderMetadata: true });
// Output: "3@red{+4}"
```

### Comparison with LaTeX Generator

| Feature        | Custom Syntax           | LaTeX                             |
| -------------- | ----------------------- | --------------------------------- |
| Division       | `/`, `:/`, `:`          | `\frac{}{}`, inline               |
| Functions      | `sin(x)`                | `\sin\left( x \right)`            |
| Greek          | `\pi`, `\alpha`         | `\pi`, `\alpha`                   |
| Square root    | `sqrt(x)`, `sqrt[n](x)` | `\sqrt{x}`, `\sqrt[n]{x}`         |
| Absolute value | `\|x\|`                 | `\left\| x \right\|`              |
| Colors         | `@red{...}`             | `\textcolor{red}{...}`            |
| Grouping       | `{...}`                 | `\left( ... \right)` or `\{...\}` |

---

## Custom Syntax Parser

### Overview

The custom syntax parser provides an ASCII Math-style alternative to LaTeX for mathematical expressions. It's designed for easier keyboard input while maintaining full AST compatibility.

```typescript
import { parseCustom, parseCustomSafe } from '$lib/mathAST/parser/custom';

// Parse custom syntax (throws on error)
const ast = parseCustom('2x^2+3x+1');

// Parse safely with error collection
const result = parseCustomSafe('2+3/4+5');
```

### Key Syntax Features

| Feature         | Custom Syntax            | LaTeX Equivalent     | Notes                                |
| --------------- | ------------------------ | -------------------- | ------------------------------------ |
| Numbers         | `42`, `3.14`, `3,14`     | `42`, `3.14`         | Comma as decimal (French) → dot      |
| Fractions       | `a/b`                    | `\frac{a}{b}`        | Tight binding at primary level       |
| Inline division | `a:/b`                   | `a/b`                | At multiplicative level              |
| Ratio           | `a:b`                    | `a:b`                | At multiplicative level              |
| Multiplication  | `2x`, `xy`, `2*3`        | `2x`, `xy`, `2*3`    | Implicit or explicit                 |
| Powers          | `x^2`, `x^{-2}`          | `x^2`, `x^{-2}`      | Braces required for negative/complex |
| Subscripts      | `x_1`, `x_{ab}`          | `x_1`, `x_{ab}`      | Braces required for multi-letter     |
| Functions       | `sin(x)`                 | `\sin(x)`            | Parentheses mandatory                |
| nth Root        | `sqrt[n](x)`             | `\sqrt[n]{x}`        | Index in brackets before parens      |
| Absolute value  | `\|x\|`                  | `\left\| x \right\|` | Pipe delimiters                      |
| Greek letters   | `\pi`, `\alpha`          | `\pi`, `\alpha`      | Backslash prefix                     |
| Colors          | `@red{x}`, `@#FF0000{x}` | `\textcolor{red}{x}` | @ prefix                             |
| Units           | `5[m/s]`                 | `5~\unit{m/s}`       | Bracket syntax                       |
| Grouping        | `{a+b}`                  | N/A                  | Transparent (no AST node)            |

### Precedence (High to Low)

1. **Primary**: atoms, `()`, `|x|`, functions, `/` (fractions)
2. **Power**: `^`, `_` (right-associative)
3. **Unary**: `-x`, `+x`
4. **Multiplicative**: `*`, `:/`, `:`, implicit
5. **Additive**: `+`, `-`
6. **Relations**: `=`, `<`, `>`, `<=`, `>=`, `!=`, `<=>`, `=>`

### Division Operators

The custom syntax has three division operators with different behavior:

| Operator | Level          | Display Style | Example   | Result          |
| -------- | -------------- | ------------- | --------- | --------------- |
| `/`      | Primary        | `'fraction'`  | `2+3/4+5` | `2 + (3/4) + 5` |
| `:/`     | Multiplicative | `'inline'`    | `2*3:/4`  | `(2*3) / 4`     |
| `:`      | Multiplicative | `'ratio'`     | `a:b`     | `a : b`         |

### Implicit Multiplication Rules

**Allowed:**

- Number followed by variable: `2x`
- Variable followed by variable: `xy`
- Number followed by parentheses: `2(x+1)`
- Parentheses followed by parentheses: `(a)(b)`
- Function followed by function: `sin(x)cos(x)`

**Not allowed:**

- Variable followed by number: `x2` (error)
- Parentheses followed by number: `(a)2` (error)

### Subscript/Superscript Validation

```
x^2       → OK (single digit)
x^12      → OK (numbers are auto-grouped)
x^n       → OK (single letter)
x^{-2}    → OK (braces required for negative)
x^{ab}    → OK (braces required for multi-letter)
x^-2      → ERROR (negative needs braces)
x^ab      → ERROR (multi-letter needs braces)
x_12      → OK (numbers auto-grouped)
x_ab      → ERROR (letters need braces)
x_{ab}    → OK
```

### Functions

Functions require parentheses (unlike LaTeX where `\sin x` is valid):

```
sin(x)      → OK
sin x       → ERROR (parentheses required)
sin^2(x)    → FunctionNode with power=2
sin(x)^2    → SuperscriptNode(FunctionNode, 2)
log_2(8)    → FunctionNode with base=2
sqrt(x)     → OK
sqrt[3](x)  → FunctionNode with base=3 (cube root)
```

**Supported functions**: `sin`, `cos`, `tan`, `ln`, `log`, `exp`, `sqrt`

**Supported symbols**: `\pi`, `\alpha`, `\beta`, `\gamma`, `\theta`, `\infty`

### Colors

```
@red{x+y}           → x+y with red metadata
@#FF5500{a}         → a with hex color metadata
@red{a + @blue{b}}  → nested colors (a red, b blue)
```

### Units

```
5[m]        → UnitNode(5, m)
10[km/h]    → UnitNode(10, km/h)
{2+3}[kg]   → UnitNode(2+3, kg)
2+3[m]      → 2 + UnitNode(3, m)  (attaches to last atom)
```

### Error Handling

```typescript
// Strict mode (default): throws ParseException
try {
	parseCustom('x^ab'); // Multi-letter without braces
} catch (e) {
	console.error(e.message); // "Multiple letters in exponent require braces"
}

// Tolerant mode: collects errors
const result = parseCustomSafe('sin x', { mode: 'tolerant' });
// result.errors contains: "Function sin requires parentheses"
```

### Parser Implementations

Two parser implementations are available (produce identical ASTs):

| Parser | Import             | Description                            |
| ------ | ------------------ | -------------------------------------- |
| Pratt  | `parseCustomPratt` | Top-down operator precedence (default) |
| RD     | `parseCustomRD`    | Recursive descent grammar              |

```typescript
import {
	parseCustom, // Alias for parseCustomPratt
	parseCustomSafe, // Alias for parseCustomPrattSafe
	parseCustomPratt,
	parseCustomPrattSafe,
	parseCustomRD,
	parseCustomRDSafe
} from '$lib/mathAST/parser/custom';
```

### Round-Trip

Custom syntax produces ASTs compatible with the LaTeX generator:

```typescript
import { parseCustom } from '$lib/mathAST/parser/custom';
import { toLatex } from '$lib/mathAST';

const ast = parseCustom('2x^2+3x+1');
const latex = toLatex(ast); // "2 x^2 + 3 x + 1"
```

---

## Pretty Printer

### Overview

The `prettyPrint` function generates a human-readable tree representation of MathAST nodes. It's designed for debugging and testing, with optional ANSI color output for terminal display.

### Basic Usage

```typescript
import { prettyPrint, add, number, variable, implicitMultiply, power } from '$lib/mathAST';

// Create expression: x^2 + 2x
const ast = add(power(variable('x'), number('2')), implicitMultiply(number('2'), variable('x')));

console.log(prettyPrint(ast));
// Output:
// Addition
// ├─ left:
// │  └─ Superscript
// │     ├─ base:
// │     │  └─ Variable: x
// │     └─ exponent:
// │        └─ Number: 2
// └─ right:
//    └─ Multiplication [implicit]
//       ├─ left:
//       │  └─ Number: 2
//       └─ right:
//          └─ Variable: x
```

### Options

```typescript
interface PrettyPrintOptions {
	/** Enable ANSI color output (default: true) */
	readonly colors?: boolean;
}

// Disable colors (useful for tests)
prettyPrint(ast, { colors: false });
```

### Output Format

#### Node Types

Each node type is displayed with its key information:

| Node Type      | Output Format                          |
| -------------- | -------------------------------------- |
| Number         | `Number: 42`                           |
| Variable       | `Variable: x`                          |
| Greek          | `Greek: alpha`                         |
| Symbol         | `Symbol: infinity`                     |
| Addition       | `Addition`                             |
| Subtraction    | `Subtraction`                          |
| Multiplication | `Multiplication [dot]` or `[implicit]` |
| Division       | `Division [fraction]` or `[inline]`    |
| Opposite       | `Opposite`                             |
| Positive       | `Positive`                             |
| Function       | `Function: sin`                        |
| Delimiter      | `Delimiter [parentheses]`              |
| Subscript      | `Subscript`                            |
| Superscript    | `Superscript`                          |
| Relation       | `Relation: =`                          |
| Unit           | `Unit: m`                              |

#### Metadata Display

Metadata is shown as a suffix in square brackets:

```typescript
const colored = number('42', { color: 'red', style: 'bold' });
prettyPrint(colored, { colors: false });
// Output: Number: 42 [red, bold]

const annotated = variable('x', { annotation: 'unknown' });
prettyPrint(annotated, { colors: false });
// Output: Variable: x ["unknown"]
```

Extended metadata (operator, delimiter, relation) is also shown:

```typescript
const expr = add(number('3'), number('4'), { operatorMetadata: { color: 'red' } });
prettyPrint(expr, { colors: false });
// Output: Addition op:[red]
//         ├─ left:
//         │  └─ Number: 3
//         └─ right:
//            └─ Number: 4
```

#### ANSI Colors

When `colors: true` (default), the output includes ANSI escape codes:

- Named colors: `red`, `green`, `blue`, `yellow`, `cyan`, `magenta`, `purple`, `orange`, `pink`, `gray`/`grey`, `black`, `white`
- Hex colors: `#RGB` or `#RRGGBB` (uses 24-bit true color)
- Styles: `bold`, `italic`

The tree content is colorized based on node metadata for visual debugging.

### Testing Example

```typescript
import { describe, it, expect } from 'vitest';
import { prettyPrint, fraction, variable, number } from '$lib/mathAST';

describe('expression rendering', () => {
	it('creates fraction structure', () => {
		const expr = fraction(variable('x'), number('2'));
		const result = prettyPrint(expr, { colors: false });

		expect(result).toContain('Division [fraction]');
		expect(result).toContain('numerator:');
		expect(result).toContain('denominator:');
	});
});
```

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

---

## CLI

### Overview

MathAST includes a command-line interface for parsing and displaying mathematical expressions. It supports both LaTeX and custom syntax input, with automatic format detection. Provides both single-command execution and an interactive REPL mode.

**Location**: `src/lib/mathAST/cli/`
**Tests**: 90 passing
**Dependencies**: chalk, commander

**Key Features**:

- Auto-detection of input format (LaTeX vs custom syntax)
- Dual output: Both LaTeX and custom syntax representations
- Format-specific parsing with `--format` flag
- REPL mode with input format switching (.latex, .custom, .auto)

### Installation

```bash
# CLI is included with mathAST, just install dependencies
pnpm add -D chalk commander
```

### Usage

#### Single-Command Mode

```bash
# Parse expression (shows AST tree + LaTeX + custom syntax)
pnpm math "x^2 + 3x - 5"

# Parse with specific input format
pnpm math --format=latex "\frac{a}{b}"
pnpm math --format=custom "a/b"
pnpm math --format=auto "x^2"  # auto-detect (default)

# Show AST tree only
pnpm math tree "\frac{a}{b}"

# Show LaTeX output only
pnpm math latex "\sqrt{x}"

# Show custom syntax output only
pnpm math custom "x^2 + 3x"

# Get help
pnpm math --help
```

#### REPL Mode

```bash
# Start interactive REPL
pnpm math

# Or explicitly
pnpm math repl
```

**REPL Commands**:

| Command           | Action                                     |
| ----------------- | ------------------------------------------ |
| `.help`           | Show available commands                    |
| `.quit` / `.exit` | Exit REPL                                  |
| `.latex`          | Switch to LaTeX input mode                 |
| `.custom`         | Switch to custom syntax input mode         |
| `.auto`           | Switch to auto-detect input mode (default) |
| `.tree`           | Show AST of last expression                |
| `<expression>`    | Parse and display tree + LaTeX + custom    |

**Example Session**:

```
$ pnpm math
MathAST REPL
Enter expressions to parse (LaTeX or custom syntax).
Mode commands: .latex, .custom, .auto | Other: .help, .quit

math> x^2 + 3x
Addition
├─ left:
│  └─ Superscript
│     ├─ base:
│     │  └─ Variable: x
│     └─ exponent:
│        └─ Number: 2
└─ right:
   └─ Multiplication [implicit]
      ├─ left:
      │  └─ Number: 3
      └─ right:
         └─ Variable: x

LaTeX:  x^2 + 3 x
Custom: x^2+3x

math> \frac{a+b}{c}
Division
├─ numerator:
│  └─ Addition
│     ├─ left:
│     │  └─ Variable: a
│     └─ right:
│        └─ Variable: b
└─ denominator:
   └─ Variable: c

LaTeX:  \frac{a + b}{c}
Custom: {a+b}/c

math> .custom
Input mode: Custom syntax

math[custom]> 2x^2+3x+1
[AST tree...]
LaTeX:  2 x^2 + 3 x + 1
Custom: 2x^2+3x+1

math[custom]> .auto
Input mode: Auto-detect

math> .quit
Goodbye!
```

### Architecture

```
src/lib/mathAST/cli/
├── index.ts           # Public exports
├── types.ts           # CLI types
├── cli.ts             # Entry point (Commander)
├── repl.ts            # Interactive REPL
├── core/
│   ├── input-detector.ts   # Format detection (LaTeX/custom)
│   ├── pipeline.ts         # Parse pipeline (supports both formats)
│   ├── output-formatter.ts # Chalk formatting
│   └── command-registry.ts # Command registry
└── commands/
    ├── base-command.ts     # Abstract base
    ├── parse.command.ts    # Parse + display (dual output)
    ├── tree.command.ts     # AST tree
    ├── latex.command.ts    # LaTeX output
    ├── custom.command.ts   # Custom syntax output
    └── help.command.ts     # Help
```

### Extensibility

Adding a new command (e.g., future CAS operations):

```typescript
// 1. Create commands/simplify.command.ts
import { BaseCommand } from './base-command';
import type { CommandContext, CommandResult } from '../types';

export class SimplifyCommand extends BaseCommand {
	readonly name = 'simplify';
	readonly aliases = ['s'] as const;
	readonly description = 'Simplify expression';
	readonly usage = 'simplify <expression>';

	execute(ctx: CommandContext): CommandResult {
		// Implementation...
		return { success: true, output: '...' };
	}
}

// 2. Register in commands/index.ts createDefaultRegistry()
registry.register(new SimplifyCommand());
```

### Format Detection

The CLI automatically detects whether input is LaTeX or custom syntax based on pattern matching.

**Custom Syntax Indicators** (if any present, input is treated as custom):

- Color annotations: `@color{...}` or `@#hex{...}`
- Unit annotations: `[unit]`
- Inline division: `:/`
- Nth root notation: `sqrt[n](...)`
- Absolute value with pipes: `|x|`

**Examples**:

```typescript
// Detected as LaTeX (contains \frac)
"\\frac{a}{b}" → latex parser

// Detected as custom (contains @color)
"@red{x} + y" → custom parser

// Detected as custom (contains [unit])
"5[m/s]" → custom parser

// Detected as custom (contains :/)
"a:/b" → custom parser

// Detected as LaTeX (/ alone is valid in both, but no custom indicators)
"a/b" → latex parser

// Detected as custom (contains sqrt[n])
"sqrt[3](8)" → custom parser

// Detected as custom (contains |...|)
"|x-1|" → custom parser
```

**Override Detection**: Use `--format` flag to force a specific parser:

```bash
pnpm math --format=custom "a/b"  # Force custom parser
pnpm math --format=latex "a/b"   # Force LaTeX parser
```

### Programmatic API

```typescript
import { parse, createDefaultRegistry, startRepl } from '$lib/mathAST/cli';

// Parse expression (auto-detect format)
const result = parse('x^2 + y');
if (result.ast) {
	console.log('Parsed successfully');
	console.log('Format detected:', result.inputFormat); // 'latex' or 'custom'
}

// Parse with specific format
const latexResult = parse('\\frac{a}{b}', 'latex');
const customResult = parse('a/b', 'custom');

// Handle errors
if (result.errors.length > 0) {
	for (const err of result.errors) {
		console.error(`Error: ${err.message} at position ${err.position}`);
	}
}

// Create command registry
const registry = createDefaultRegistry();
const parseCmd = registry.get('parse');
const customCmd = registry.get('custom');

// Start REPL programmatically
startRepl();
```
