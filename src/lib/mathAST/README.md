# MathAST - Mathematical Abstract Syntax Tree

A comprehensive library for representing mathematical expressions as an immutable abstract syntax tree (AST), designed as a pivot structure for transpilation between LaTeX and custom syntax formats.

## Table of Contents

- [Quick Start](#quick-start)
- [Node Types](#node-types)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Design Decisions](#design-decisions)

---

## Quick Start

### Basic Import

```typescript
import { MathAST, isVariable, mapNode, withMetadata } from '$lib/mathAST';
```

### Creating Expressions

Build expressions using factory functions:

```typescript
// Create: x^2 + 3x - 5 = 0
const ast = MathAST.equals(
	MathAST.subtract(
		MathAST.add(
			MathAST.power(MathAST.variable('x'), MathAST.number('2')),
			MathAST.implicitMultiply(MathAST.number('3'), MathAST.variable('x'))
		),
		MathAST.number('5')
	),
	MathAST.number('0')
);
```

### Transforming Expressions

Apply transformations to all nodes:

```typescript
// Color all variables red
const colored = mapNode(ast, (node) =>
	isVariable(node) ? withMetadata(node, { color: 'red' }) : node
);
```

---

## Node Types

MathAST supports 16 distinct node types organized into 5 categories:

| Category              | Nodes                                           | Purpose                                          |
| --------------------- | ----------------------------------------------- | ------------------------------------------------ |
| **Literals**          | Number, Variable, GreekLetter, Symbol           | Represent constant or symbolic values            |
| **Binary Operations** | Addition, Subtraction, Multiplication, Division | Operations between two operands                  |
| **Unary Operations**  | Opposite, Positive                              | Prefix operators (sign operations)               |
| **Structural**        | Delimiter, Subscript, Superscript               | Structure and layout (parentheses, superscripts) |
| **Function**          | Function                                        | Function application with optional power/base    |
| **Relation**          | Relation                                        | Equations and inequalities (=, <, >, etc.)       |
| **Complex**           | Complex                                         | Complex numbers with real and imaginary parts    |

### Literal Nodes

| Node                | Type         | Purpose                                            | Example                                                   |
| ------------------- | ------------ | -------------------------------------------------- | --------------------------------------------------------- |
| **NumberNode**      | `'number'`   | Numeric values (as strings to preserve formatting) | `MathAST.number('3.14')`                                  |
| **VariableNode**    | `'variable'` | Single-letter or multi-character variables         | `MathAST.variable('x')`, `MathAST.variable('alpha')`      |
| **GreekLetterNode** | `'greek'`    | Greek letter variables (α, β, π, etc.)             | `MathAST.greek('alpha')`, `MathAST.greek('Pi')`           |
| **SymbolNode**      | `'symbol'`   | Special mathematical symbols                       | `MathAST.symbol('infinity')`, `MathAST.symbol('partial')` |

### Binary Operation Nodes

| Node                   | Type               | Syntax                    | Display Styles                             |
| ---------------------- | ------------------ | ------------------------- | ------------------------------------------ |
| **AdditionNode**       | `'addition'`       | `left + right`            | —                                          |
| **SubtractionNode**    | `'subtraction'`    | `left - right`            | —                                          |
| **MultiplicationNode** | `'multiplication'` | `left * right`            | `'implicit'`, `'dot'`, `'cross'`, `'star'` |
| **DivisionNode**       | `'division'`       | `numerator / denominator` | `'fraction'`, `'inline'`, `'ratio'`        |

Display styles control how operations are rendered (e.g., `2x` for implicit, `2 × x` for cross).

### Unary Operation Nodes

| Node             | Type         | Syntax     | Purpose                   |
| ---------------- | ------------ | ---------- | ------------------------- |
| **OppositeNode** | `'opposite'` | `-operand` | Negation/additive inverse |
| **PositiveNode** | `'positive'` | `+operand` | Explicit positive sign    |

### Structural Nodes

| Node                | Type            | Purpose                                          | Options                                                |
| ------------------- | --------------- | ------------------------------------------------ | ------------------------------------------------------ |
| **DelimiterNode**   | `'delimiter'`   | Content surrounded by delimiters                 | Type: `'parentheses'` (use `abs()` for absolute value) |
| **SubscriptNode**   | `'subscript'`   | Subscript/index notation (base_subscript)        | —                                                      |
| **SuperscriptNode** | `'superscript'` | Superscript/exponent notation (base^superscript) | —                                                      |

### Function Node

| Node             | Type         | Purpose              | Structure                                                                 |
| ---------------- | ------------ | -------------------- | ------------------------------------------------------------------------- |
| **FunctionNode** | `'function'` | Function application | `name`, `args[]`, optional `power`, optional `base` (for log_base or f^2) |

### Relation Node

| Node             | Type         | Purpose                    | Relations                                                                                          |
| ---------------- | ------------ | -------------------------- | -------------------------------------------------------------------------------------------------- |
| **RelationNode** | `'relation'` | Equations and inequalities | `'='`, `'<'`, `'>'`, `'<='`, `'>='`, `'!='`, `'≈'`, `'≡'`, `'∈'`, `'⊂'`, `'⟹'`, `'⟺'`, and 10 more |

### Complex Node

| Node            | Type        | Purpose                         | Structure                                           |
| --------------- | ----------- | ------------------------------- | --------------------------------------------------- |
| **ComplexNode** | `'complex'` | Complex numbers (a + bi format) | `real: MathNode`, `imaginary: MathNode` (both ASTs) |

Complex numbers are represented structurally with `real` and `imaginary` parts as AST nodes.
This allows for symbolic complex expressions like `(x + yi)` where `x` and `y` are variables.

---

## API Reference

### Factory Functions - Literals

```typescript
number(value: string, metadata?: NodeMetadata): NumberNode
variable(name: string, metadata?: NodeMetadata): VariableNode
greek(letter: GreekLetter, metadata?: NodeMetadata): GreekLetterNode
symbol(sym: MathSymbol, metadata?: NodeMetadata): SymbolNode
```

### Factory Functions - Binary Operations

```typescript
// Explicit operators
add(left: MathNode, right: MathNode, metadata?: NodeMetadata): AdditionNode
subtract(left: MathNode, right: MathNode, metadata?: NodeMetadata): SubtractionNode
multiply(left: MathNode, right: MathNode, displayStyle: MultiplicationDisplayStyle, metadata?: NodeMetadata): MultiplicationNode
divide(numerator: MathNode, denominator: MathNode, displayStyle: DivisionDisplayStyle, metadata?: NodeMetadata): DivisionNode

// Convenience functions
implicitMultiply(left: MathNode, right: MathNode, metadata?: NodeMetadata): MultiplicationNode
fraction(numerator: MathNode, denominator: MathNode, metadata?: NodeMetadata): DivisionNode
```

### Factory Functions - Unary Operations

```typescript
opposite(operand: MathNode, metadata?: NodeMetadata): OppositeNode
positive(operand: MathNode, metadata?: NodeMetadata): PositiveNode
```

### Factory Functions - Functions

```typescript
// Generic function factory
func(name: string, args: readonly MathNode[], options?: { power?: MathNode; base?: MathNode }, metadata?: NodeMetadata): FunctionNode

// Common functions
sin(arg: MathNode, metadata?: NodeMetadata): FunctionNode
cos(arg: MathNode, metadata?: NodeMetadata): FunctionNode
tan(arg: MathNode, metadata?: NodeMetadata): FunctionNode
ln(arg: MathNode, metadata?: NodeMetadata): FunctionNode
log(arg: MathNode, base?: MathNode, metadata?: NodeMetadata): FunctionNode
exp(arg: MathNode, metadata?: NodeMetadata): FunctionNode
sqrt(arg: MathNode, metadata?: NodeMetadata): FunctionNode
abs(arg: MathNode, metadata?: NodeMetadata): FunctionNode
floor(arg: MathNode, metadata?: NodeMetadata): FunctionNode
ceil(arg: MathNode, metadata?: NodeMetadata): FunctionNode
round(arg: MathNode, metadata?: NodeMetadata): FunctionNode
```

### Factory Functions - Structural

```typescript
delimiter(type: DelimiterType, content: MathNode, semantic?: DelimiterSemantic, metadata?: NodeMetadata): DelimiterNode
parentheses(content: MathNode, metadata?: NodeMetadata): DelimiterNode

subscript(base: MathNode, subscript: MathNode, metadata?: NodeMetadata): SubscriptNode
superscript(base: MathNode, superscript: MathNode, metadata?: NodeMetadata): SuperscriptNode
power(base: MathNode, exponent: MathNode, metadata?: NodeMetadata): SuperscriptNode // Alias for superscript
```

### Factory Functions - Complex Numbers

```typescript
// Create complex number (a + bi)
complex(real: MathNode, imaginary: MathNode, metadata?: NodeMetadata): ComplexNode

// Convenience: create imaginary unit 'i' (equivalent to complex(0, 1))
imaginaryUnit(metadata?: NodeMetadata): ComplexNode
```

### Factory Functions - Relations

```typescript
// Generic relation
relation(type: RelationType, left: MathNode, right: MathNode, metadata?: NodeMetadata): RelationNode

// Common relations
equals(left: MathNode, right: MathNode, metadata?: NodeMetadata): RelationNode
lessThan(left: MathNode, right: MathNode, metadata?: NodeMetadata): RelationNode
greaterThan(left: MathNode, right: MathNode, metadata?: NodeMetadata): RelationNode
lessThanOrEqual(left: MathNode, right: MathNode, metadata?: NodeMetadata): RelationNode
greaterThanOrEqual(left: MathNode, right: MathNode, metadata?: NodeMetadata): RelationNode
notEquals(left: MathNode, right: MathNode, metadata?: NodeMetadata): RelationNode

// Special relations
approx(left: MathNode, right: MathNode, metadata?: NodeMetadata): RelationNode         // ≈
congruent(left: MathNode, right: MathNode, metadata?: NodeMetadata): RelationNode     // ≡
elementOf(left: MathNode, right: MathNode, metadata?: NodeMetadata): RelationNode     // ∈
notElementOf(left: MathNode, right: MathNode, metadata?: NodeMetadata): RelationNode  // ∉
subset(left: MathNode, right: MathNode, metadata?: NodeMetadata): RelationNode        // ⊂
subsetOrEqual(left: MathNode, right: MathNode, metadata?: NodeMetadata): RelationNode // ⊆
superset(left: MathNode, right: MathNode, metadata?: NodeMetadata): RelationNode      // ⊃
supersetOrEqual(left: MathNode, right: MathNode, metadata?: NodeMetadata): RelationNode // ⊇
implies(left: MathNode, right: MathNode, metadata?: NodeMetadata): RelationNode       // ⟹
iff(left: MathNode, right: MathNode, metadata?: NodeMetadata): RelationNode          // ⟺
```

### Transformation Functions

```typescript
// Metadata
withMetadata<T extends MathNode>(node: T, metadata: Partial<NodeMetadata>): T

// Traversal
getChildren(node: MathNode): MathNode[]

// Tree transformation (bottom-up)
mapNode(node: MathNode, fn: (node: MathNode) => MathNode): MathNode

// Tree transformation (top-down)
mapNodeTopDown(node: MathNode, fn: (node: MathNode) => MathNode): MathNode

// Search
findNodes(node: MathNode, predicate: (node: MathNode) => boolean): MathNode[]
findFirst(node: MathNode, predicate: (node: MathNode) => boolean): MathNode | undefined
replaceNode(root: MathNode, predicate: (node: MathNode) => boolean, replacement: MathNode | ((node: MathNode) => MathNode)): MathNode

// Cloning & Statistics
cloneNode<T extends MathNode>(node: T): T
countNodes(node: MathNode): number
getDepth(node: MathNode): number
```

### Type Guards - Categories

```typescript
isLiteralNode(node: MathNode): node is LiteralNode
isBinaryOperationNode(node: MathNode): node is BinaryOperationNode
isUnaryOperationNode(node: MathNode): node is UnaryOperationNode
isStructuralNode(node: MathNode): node is StructuralNode
```

### Type Guards - Individual Nodes

```typescript
// Literals
isNumber(node: MathNode): node is NumberNode
isVariable(node: MathNode): node is VariableNode
isGreek(node: MathNode): node is GreekLetterNode
isSymbol(node: MathNode): node is SymbolNode

// Operations
isAddition(node: MathNode): node is AdditionNode
isSubtraction(node: MathNode): node is SubtractionNode
isMultiplication(node: MathNode): node is MultiplicationNode
isDivision(node: MathNode): node is DivisionNode
isOpposite(node: MathNode): node is OppositeNode
isPositive(node: MathNode): node is PositiveNode

// Structural
isFunction(node: MathNode): node is FunctionNode
isDelimiter(node: MathNode): node is DelimiterNode
isSubscript(node: MathNode): node is SubscriptNode
isSuperscript(node: MathNode): node is SuperscriptNode

// Relations
isRelation(node: MathNode): node is RelationNode

// Complex
isComplex(node: MathNode): node is ComplexNode
```

### Type Guards - Utility & Specific

```typescript
// Structure
hasChildren(node: MathNode): boolean
isLeaf(node: MathNode): boolean
hasMetadata(node: MathNode): boolean

// Specific patterns
isFraction(node: MathNode): node is DivisionNode           // Division with 'fraction' style
isImplicitMultiplication(node: MathNode): node is MultiplicationNode
isComparison(node: MathNode): node is RelationNode        // <, >, <=, >=
isEquality(node: MathNode): node is RelationNode          // =
isInequality(node: MathNode): node is RelationNode        // !=
```

---

## Examples

### Building Common Expressions

#### Quadratic Equation: x² + 2x + 1 = 0

```typescript
const quadratic = MathAST.equals(
	MathAST.add(
		MathAST.add(
			MathAST.power(MathAST.variable('x'), MathAST.number('2')),
			MathAST.implicitMultiply(MathAST.number('2'), MathAST.variable('x'))
		),
		MathAST.number('1')
	),
	MathAST.number('0')
);
```

#### Fraction: (a + b) / (c + d)

```typescript
const fraction = MathAST.fraction(
	MathAST.parentheses(MathAST.add(MathAST.variable('a'), MathAST.variable('b'))),
	MathAST.parentheses(MathAST.add(MathAST.variable('c'), MathAST.variable('d')))
);
```

#### Square Root with Subscript: ∜8 (fourth root)

```typescript
const fourthRoot = MathAST.subscript(MathAST.sqrt(MathAST.number('8')), MathAST.number('4'));
```

#### Trigonometric Function: sin²(θ) + cos²(θ) = 1

```typescript
const pythagorean = MathAST.equals(
	MathAST.add(
		MathAST.power(MathAST.sin(MathAST.greek('theta')), MathAST.number('2')),
		MathAST.power(MathAST.cos(MathAST.greek('theta')), MathAST.number('2'))
	),
	MathAST.number('1')
);
```

#### Logarithm: log₂(x) = 3

```typescript
const logarithm = MathAST.equals(
	MathAST.log(MathAST.variable('x'), MathAST.number('2')),
	MathAST.number('3')
);
```

#### Complex Number: 3 + 4i

```typescript
const complexNum = MathAST.complex(MathAST.number('3'), MathAST.number('4'));
```

#### Imaginary Unit: i

```typescript
const i = MathAST.imaginaryUnit();
// or explicitly: MathAST.complex(MathAST.number('0'), MathAST.number('1'))
```

#### Symbolic Complex: x + yi

```typescript
const symbolicComplex = MathAST.complex(MathAST.variable('x'), MathAST.variable('y'));
```

### Transforming Nodes

#### Color All Variables Red

```typescript
const colored = mapNode(ast, (node) =>
	isVariable(node) ? withMetadata(node, { color: 'red' }) : node
);
```

#### Bold All Numbers

```typescript
const boldNumbers = mapNode(ast, (node) =>
	isNumber(node) ? withMetadata(node, { style: 'bold' }) : node
);
```

#### Replace x with y Everywhere

```typescript
const replaced = replaceNode(
	ast,
	(node) => isVariable(node) && node.name === 'x',
	MathAST.variable('y')
);
```

#### Convert All Implicit Multiplications to Explicit Dots

```typescript
const explicit = mapNode(ast, (node) =>
	isImplicitMultiplication(node)
		? MathAST.multiply(node.left, node.right, 'dot', node.metadata)
		: node
);
```

### Searching and Analyzing

#### Find All Variables

```typescript
const variables = findNodes(ast, isVariable);
console.log(`Found ${variables.length} variables`);
```

#### Find the First Fraction

```typescript
const firstFraction = findFirst(ast, isFraction);
if (firstFraction) {
	console.log('Numerator:', firstFraction.numerator);
	console.log('Denominator:', firstFraction.denominator);
}
```

#### Count Total Nodes and Depth

```typescript
const totalNodes = countNodes(ast);
const depth = getDepth(ast);
console.log(`Tree has ${totalNodes} nodes and depth ${depth}`);
```

#### Check if Expression is a Comparison

```typescript
if (isRelation(ast) && isComparison(ast)) {
	console.log('This is a comparison:', ast.relation);
}
```

### Working with Metadata

#### Annotate Parts of an Expression

```typescript
const annotated = mapNode(ast, (node) => {
	if (isVariable(node) && node.name === 'x') {
		return withMetadata(node, {
			color: 'blue',
			style: 'italic',
			annotation: 'the variable we solve for'
		});
	}
	return node;
});
```

#### Clone with Modified Styling

```typescript
const clone = cloneNode(ast);
const styled = withMetadata(clone, {
	color: 'green',
	style: 'bold'
});
```

### Flattening Operations

Flatten binary operation chains into lists for easier manipulation.

**Key rule**: Delimiters (parentheses) are **intangible boundaries** - flattening stops at them.

```typescript
// Types
type Sign = '+' | '-';
type SignedTerm = { sign: Sign; term: MathNode };
type FlatSum = readonly SignedTerm[];
type FlatProduct = readonly MathNode[];

// Shallow flattening - same level only
flattenSumShallow(node: MathNode): FlatSum
// a + b - c → [{'+', a}, {'+', b}, {'-', c}]
// a + (b + c) → [{'+', a}, {'+', (b+c)}]  // stops at delimiter

flattenProductShallow(node: MathNode): FlatProduct
// a * b * c → [a, b, c]

// Deep flattening - with subLists Map for nested structures
flattenSumDeep(node: MathNode): DeepFlatSumResult
flattenProductDeep(node: MathNode): DeepFlatProductResult

// Unflatten - reconstruct binary tree (left-associative)
unflattenSum(terms: FlatSum): MathNode | null
// [{'+', a}, {'-', b}, {'+', c}] → ((a - b) + c)

unflattenProduct(factors: FlatProduct, style?: MultiplicationDisplayStyle): MathNode | null
// [a, b, c] → ((a * b) * c)

// Utility
flipSign(sign: Sign): Sign  // '+' ↔ '-'
```

#### Example: Working with Flattened Sums

```typescript
import { flattenSumShallow, unflattenSum, isVariable } from '$lib/mathAST';

// Flatten: a + b - c + d
const flat = flattenSumShallow(expr);
// → [{'+', a}, {'+', b}, {'-', c}, {'+', d}]

// Filter only variables
const varsOnly = flat.filter(({ term }) => isVariable(term));

// Reconstruct
const result = unflattenSum(varsOnly);
```

---

## Design Decisions

### Immutability

All nodes are immutable (readonly properties). This ensures:

- **Predictability**: No accidental mutations
- **Caching**: Nodes can be safely reused and cached
- **Functional transformations**: Pure functions can reliably transform trees
- **History tracking**: Can easily implement undo/redo by maintaining node references

Transformations always return new nodes rather than modifying existing ones.

### String-Based Number Storage

Numbers are stored as strings (`value: string`) rather than numeric types. This preserves:

- **Exact formatting**: `"3.14"` vs `"3.140"` remains distinct
- **Precision**: Avoids floating-point rounding issues
- **Custom notations**: Supports scientific notation, hex, etc.

When numeric operations are needed, convert to number using `parseFloat(numberNode.value)`.

### Metadata at Render Time

Metadata (color, style, annotation) is optional and lightweight. Key benefits:

- **Separation of concerns**: Structure and rendering are decoupled
- **Flexibility**: Rendering can be changed without rebuilding the tree
- **Inheritance**: Metadata can be applied top-down or merged during transformal
- **No breaking changes**: Backward compatible when adding new metadata fields

### Display Styles for Operations

Multiplication and division have configurable display styles:

- **Multiplication**: `'implicit'` (2x), `'dot'` (2·x), `'cross'` (2×x), `'star'` (2⋆x)
- **Division**: `'fraction'` (vertical), `'inline'` (a/b), `'ratio'` (a:b)

This allows the same AST to be rendered differently without reparsing, supporting:

- Educational contexts (showing implicit multiplication as explicit)
- Different locales (preferred notation varies)
- Pedagogical progressions (hiding/revealing operations)

### Type Safety

All factory functions return specific node types with proper TypeScript inference:

```typescript
const v = MathAST.variable('x'); // VariableNode
const n = MathAST.number('5'); // NumberNode
const a = MathAST.add(v, n); // AdditionNode
```

Combined with type guards, this enables:

- **Compile-time safety**: Catch type errors before runtime
- **Editor autocomplete**: Know available properties on each node type
- **Confident refactoring**: Rename operations across the entire codebase

### Namespace vs Individual Exports

Both forms are available for optimal tree-shaking:

```typescript
// Use namespace for convenience
const expr = MathAST.add(x, y);

// Or import individual functions to minimize bundle
import { add } from '$lib/mathAST';
const expr = add(x, y);
```

---

## Analysis Module

The `analysis/` submodule provides tools for analyzing mathematical expressions.

### Continuity Analysis

Analyzes the continuity of mathematical expressions, detecting and classifying discontinuities.

```typescript
import {
	analyzeContinuity,
	findDiscontinuityCandidates,
	checkContinuityAtPoint
} from '$lib/mathAST/analysis';

// Analyze 1/x
const expr = fraction(number('1'), variable('x'));
const result = analyzeContinuity(expr, 'x');

console.log(result.discontinuities);
// [{ point: 0, type: 'infinite', source: 'division', ... }]

console.log(result.isContinuousOnDomain); // true (continuous on ℝ\{0})
```

#### Discontinuity Types

| Type        | Description                                      | Example                   |
| ----------- | ------------------------------------------------ | ------------------------- |
| `removable` | Limit exists but function undefined or different | (x²-1)/(x-1) at x=1       |
| `jump`      | Left and right limits differ                     | floor(x) at integers      |
| `infinite`  | Vertical asymptote                               | 1/x at x=0, tan(x) at π/2 |
| `essential` | Limit doesn't exist                              | sin(1/x) at x=0           |

#### Solver Integration

The continuity module uses the equation solver to find zeros of arguments in piecewise functions:

```typescript
// abs(x² - 4) has corners at x = ±2
const expr = func('abs', [subtract(power(variable('x'), number('2')), number('4'))]);
const result = analyzeContinuity(expr, 'x');
// Finds candidates at x = -2 and x = 2

// sign(2x + 3) has jump at x = -1.5
const expr2 = func('sign', [add(implicitMultiply(number('2'), variable('x')), number('3'))]);
const result2 = analyzeContinuity(expr2, 'x');
// Detects jump discontinuity at x = -1.5
```

#### Options

```typescript
interface ContinuityOptions {
	verbosity?: 'result' | 'summarized' | 'detailed'; // Step recording level
	standardInterval?: { min: number; max: number }; // Search interval for periodic functions
	maxPeriodicPoints?: number; // Max periodic points to enumerate
	computeFunctionValues?: boolean; // Compute f(a) at discontinuities
	timeout?: number; // Timeout in ms
}
```

### Other Analysis Tools

| Module                   | Purpose                                     |
| ------------------------ | ------------------------------------------- |
| `periodicity.ts`         | Detect periodic functions and their periods |
| `symmetry.ts`            | Analyze even/odd symmetry                   |
| `polynomial-analysis.ts` | Analyze polynomial structure                |
| `expression-classify.ts` | Classify expression types                   |
| `linear-combination.ts`  | Extract linear combinations                 |

---

## See Also

- **Transpilers**: ASCIIMath to LaTeX, LaTeX to MathAST
- **Rendering**: MathLive integration for display
- **Validation**: Type guards and predicates for safe transformations
