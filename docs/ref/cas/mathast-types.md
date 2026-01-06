# MathAST Type System

## Overview

MathAST uses an immutable Abstract Syntax Tree (AST) to represent mathematical expressions. All node types are `readonly` and follow strict TypeScript typing.

## Node Categories

```
MathNode
├── Literal Nodes
│   ├── NumberNode        # Numeric literals
│   ├── VariableNode      # Variables (x, y, abc)
│   ├── GreekLetterNode   # Greek letters (pi, alpha, beta, gamma, theta)
│   ├── SymbolNode        # Mathematical symbols (infinity, partial, etc.)
│   └── HoleNode          # Placeholders for fill-in-the-blank
│
├── Binary Operation Nodes
│   ├── AdditionNode      # left + right
│   ├── SubtractionNode   # left - right
│   ├── MultiplicationNode# left * right (with display style)
│   └── DivisionNode      # numerator / denominator (with display style)
│
├── Unary Operation Nodes
│   ├── OppositeNode      # -operand
│   └── PositiveNode      # +operand
│
├── Structural Nodes
│   ├── DelimiterNode     # Parentheses, brackets, etc.
│   ├── SubscriptNode     # base_subscript
│   └── SuperscriptNode   # base^superscript (powers)
│
├── Function Nodes
│   └── FunctionNode      # f(args) with optional power, base, derivative
│
├── Relation Nodes
│   └── RelationNode      # left <relation> right (=, <, >, <=, >=, etc.)
│
├── Unit Nodes
│   └── UnitNode          # expression with physical unit
│
└── Composition Nodes
    └── CompositionNode   # f composed with g (f o g)
```

## Node Definitions

### Base Node Interface

All nodes share metadata capabilities:

```typescript
interface NodeMetadata {
	readonly color?: string;
	readonly style?: 'normal' | 'bold' | 'italic';
	readonly annotation?: string;
}

interface BaseNode {
	readonly type: string;
	readonly metadata?: NodeMetadata;
}
```

### Literal Nodes

#### NumberNode

```typescript
interface NumberNode extends BaseNode {
    readonly type: 'number';
    readonly value: string;  // Preserved as string for exact formatting
}

// Examples:
{ type: 'number', value: '42' }
{ type: 'number', value: '3.14159' }
{ type: 'number', value: '-273.15' }
```

#### VariableNode

```typescript
interface VariableNode extends BaseNode {
    readonly type: 'variable';
    readonly name: string;  // Single letter or multi-character
}

// Examples:
{ type: 'variable', name: 'x' }
{ type: 'variable', name: 'velocity' }
```

#### GreekLetterNode

```typescript
type GreekLetter = 'pi' | 'alpha' | 'beta' | 'gamma' | 'theta';

interface GreekLetterNode extends BaseNode {
    readonly type: 'greek';
    readonly letter: GreekLetter;
}

// Examples:
{ type: 'greek', letter: 'pi' }
{ type: 'greek', letter: 'theta' }
```

#### SymbolNode

```typescript
type MathSymbol =
    | 'infinity' | 'emptyset' | 'partial' | 'nabla'
    | 'forall' | 'exists' | 'nexists'
    | 'in' | 'notin' | 'subset' | 'supset'
    | 'union' | 'intersection'
    | 'degree' | 'prime' | 'dprime'
    | 'approx' | 'perp' | 'parallel'
    | 'times' | 'div' | 'pm' | 'mp'
    | /* ... more symbols */;

interface SymbolNode extends BaseNode {
    readonly type: 'symbol';
    readonly symbol: MathSymbol;
}
```

#### HoleNode

```typescript
interface HoleNode extends BaseNode {
    readonly type: 'hole';
    readonly index: number;
    readonly placeholder?: string;
}

// Example: Fill-in-the-blank question
{ type: 'hole', index: 1, placeholder: '?' }
```

### Binary Operation Nodes

#### AdditionNode

```typescript
interface AdditionNode extends BaseNode {
	readonly type: 'addition';
	readonly left: MathNode;
	readonly right: MathNode;
	readonly operatorMetadata?: NodeMetadata;
}
```

#### SubtractionNode

```typescript
interface SubtractionNode extends BaseNode {
	readonly type: 'subtraction';
	readonly left: MathNode;
	readonly right: MathNode;
	readonly operatorMetadata?: NodeMetadata;
}
```

#### MultiplicationNode

```typescript
type MultiplicationDisplayStyle = 'implicit' | 'dot' | 'cross' | 'star';

interface MultiplicationNode extends BaseNode {
	readonly type: 'multiplication';
	readonly left: MathNode;
	readonly right: MathNode;
	readonly displayStyle: MultiplicationDisplayStyle;
	readonly operatorMetadata?: NodeMetadata;
}

// Display styles:
// 'implicit' → xy (no symbol)
// 'dot'      → x · y
// 'cross'    → x × y
// 'star'     → x * y
```

#### DivisionNode

```typescript
type DivisionDisplayStyle = 'fraction' | 'inline' | 'ratio';

interface DivisionNode extends BaseNode {
	readonly type: 'division';
	readonly numerator: MathNode;
	readonly denominator: MathNode;
	readonly displayStyle: DivisionDisplayStyle;
	readonly operatorMetadata?: NodeMetadata;
}

// Display styles:
// 'fraction' → vertical fraction bar (frac{a}{b})
// 'inline'   → a / b
// 'ratio'    → a : b
```

### Unary Operation Nodes

#### OppositeNode

```typescript
interface OppositeNode extends BaseNode {
    readonly type: 'opposite';
    readonly operand: MathNode;
    readonly operatorMetadata?: NodeMetadata;
}

// Example: -x
{ type: 'opposite', operand: { type: 'variable', name: 'x' } }
```

#### PositiveNode

```typescript
interface PositiveNode extends BaseNode {
    readonly type: 'positive';
    readonly operand: MathNode;
    readonly operatorMetadata?: NodeMetadata;
}

// Example: +5
{ type: 'positive', operand: { type: 'number', value: '5' } }
```

### Structural Nodes

#### DelimiterNode

```typescript
type DelimiterType = 'parentheses';
type DelimiterSemantic = 'grouping' | 'interval' | 'set' | 'matrix' | 'vector';

interface DelimiterNode extends BaseNode {
	readonly type: 'delimiter';
	readonly delimiters: DelimiterType;
	readonly content: MathNode;
	readonly semantic?: DelimiterSemantic;
	readonly delimiterMetadata?: NodeMetadata;
	readonly leftDelimiterMetadata?: NodeMetadata;
	readonly rightDelimiterMetadata?: NodeMetadata;
}
```

#### SubscriptNode

```typescript
interface SubscriptNode extends BaseNode {
    readonly type: 'subscript';
    readonly base: MathNode;
    readonly subscript: MathNode;
}

// Example: x_1
{
    type: 'subscript',
    base: { type: 'variable', name: 'x' },
    subscript: { type: 'number', value: '1' }
}
```

#### SuperscriptNode

```typescript
interface SuperscriptNode extends BaseNode {
    readonly type: 'superscript';
    readonly base: MathNode;
    readonly superscript: MathNode;
}

// Example: x^2
{
    type: 'superscript',
    base: { type: 'variable', name: 'x' },
    superscript: { type: 'number', value: '2' }
}
```

### FunctionNode

```typescript
interface FunctionNode extends BaseNode {
    readonly type: 'function';
    readonly name: string;
    readonly args: readonly MathNode[];
    readonly power?: MathNode;           // sin^2(x)
    readonly base?: MathNode;            // log_2(x)
    readonly derivativeOrder?: number;   // f'(x), f''(x)
    readonly isInverse?: boolean;        // f^{-1}(x)
    readonly nameMetadata?: NodeMetadata;
    readonly delimiterMetadata?: NodeMetadata;
    readonly leftDelimiterMetadata?: NodeMetadata;
    readonly rightDelimiterMetadata?: NodeMetadata;
}

// Examples:
// sin(x)
{ type: 'function', name: 'sin', args: [varX] }

// log_2(8)
{ type: 'function', name: 'log', args: [num8], base: num2 }

// f'(x)
{ type: 'function', name: 'f', args: [varX], derivativeOrder: 1 }

// sin^2(x)
{ type: 'function', name: 'sin', args: [varX], power: num2 }

// f^{-1}(x)
{ type: 'function', name: 'f', args: [varX], isInverse: true }
```

### RelationNode

```typescript
type RelationType =
    | '=' | '<' | '>' | '<=' | '>=' | '!='
    | '≡' | '≢' | '≈' | '≃' | '∼'
    | '≺' | '≻' | '⊂' | '⊃' | '⊆' | '⊇'
    | '∈' | '∉'
    | '⟹' | '⟺' | '⟸';

interface RelationNode extends BaseNode {
    readonly type: 'relation';
    readonly relation: RelationType;
    readonly left: MathNode;
    readonly right: MathNode;
    readonly relationMetadata?: NodeMetadata;
}

// Example: x = 5
{
    type: 'relation',
    relation: '=',
    left: { type: 'variable', name: 'x' },
    right: { type: 'number', value: '5' }
}
```

### UnitNode

```typescript
interface UnitNode extends BaseNode {
    readonly type: 'unit';
    readonly expression: MathNode;
    readonly unit: Unit;  // From units module
    readonly unitMetadata?: NodeMetadata;
}

// Example: 5 km
{
    type: 'unit',
    expression: { type: 'number', value: '5' },
    unit: { /* unit structure */ }
}
```

### CompositionNode

```typescript
interface CompositionNode extends BaseNode {
    readonly type: 'composition';
    readonly outer: MathNode;  // f in f ∘ g
    readonly inner: MathNode;  // g in f ∘ g
    readonly operatorMetadata?: NodeMetadata;
}

// Example: f ∘ g (meaning f(g(x)))
{
    type: 'composition',
    outer: { type: 'variable', name: 'f' },
    inner: { type: 'variable', name: 'g' }
}
```

## Factory Functions

The `factory.ts` module provides type-safe node creation:

```typescript
import {
	// Literals
	number,
	variable,
	greek,
	symbol,
	hole,

	// Binary operations
	add,
	subtract,
	multiply,
	divide,
	fraction,

	// Unary operations
	opposite,
	positive,

	// Functions
	func,
	sin,
	cos,
	tan,
	ln,
	log,
	exp,
	sqrt,
	abs,
	derivativeFunc,
	inverseFunc,

	// Structural
	delimiter,
	parentheses,
	subscript,
	superscript,
	power,

	// Relations
	relation,
	equals,
	lessThan,
	greaterThan,
	lessThanOrEqual,
	greaterThanOrEqual,
	notEquals,
	relationChain,
	equalsChain,
	lessThanChain,

	// Units
	withUnit,
	quantity,
	quantityVar,

	// Composition
	compose
} from '$lib/mathAST/factory';

// Examples:
const x = variable('x');
const two = number('2');
const xSquared = power(x, two);
const equation = equals(xSquared, number('4'));
```

## Type Guards

Type guards enable safe pattern matching:

```typescript
import {
	isNumber,
	isVariable,
	isGreekLetter,
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
	isDelimiter,
	isSubscript,
	isSuperscript,
	isRelation,
	isUnit,
	isComposition,
	isLiteralNode,
	isBinaryOpNode,
	isUnaryOpNode
} from '$lib/mathAST/guards';

function process(node: MathNode): string {
	if (isNumber(node)) {
		return node.value;
	}
	if (isVariable(node)) {
		return node.name;
	}
	if (isAddition(node)) {
		return `${process(node.left)} + ${process(node.right)}`;
	}
	// ...
}
```

## The Exp Wrapper

The `Exp` class provides a fluent API:

```typescript
import { Exp } from '$lib/mathAST';

// Static factories
const x = Exp.variable('x');
const two = Exp.number('2');

// Fluent operations
const expr = x.power(two).add(Exp.number('1'));

// Output
console.log(expr.latex); // "x^{2} + 1"
console.log(expr.tree); // Pretty-printed AST

// Operations
const simplified = expr.simplify();
const derivative = expr.differentiate();
const evaluated = expr.evalWith({ x: 3 });

// Equivalence
const a = Exp.parse('x + y');
const b = Exp.parse('y + x');
console.log(a.isEquivalent(b)); // true
```

## AST Transformations

Transform utilities in `transforms.ts`:

```typescript
import {
	withMetadata, // Add metadata to node
	mapNode, // Transform all nodes (bottom-up)
	mapNodeTopDown, // Transform all nodes (top-down)
	findNodes, // Find nodes matching predicate
	findFirst, // Find first matching node
	replaceNode, // Replace matching nodes
	getChildren, // Get immediate children
	countNodes, // Count total nodes
	getDepth, // Get tree depth
	cloneNode // Deep clone
} from '$lib/mathAST/transforms';

// Example: Color all variables red
const colored = mapNode(ast, (node) =>
	isVariable(node) ? withMetadata(node, { color: 'red' }) : node
);
```
