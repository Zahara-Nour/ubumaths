# MathAST Types & Node System

Complete reference for all AST node types and their TypeScript interfaces.

## Node Type Hierarchy

```
MathNode (union of 18 types)
├── Literals (5 types)
│   ├── NumberNode       - Numeric values (string storage)
│   ├── VariableNode     - Variable identifiers
│   ├── GreekLetterNode  - Greek letters (pi, alpha, beta, gamma, theta)
│   ├── SymbolNode       - Special symbols (infinity, partial, etc.)
│   └── HoleNode         - Interactive placeholders
│
├── Binary Operations (4 types)
│   ├── AdditionNode       - left + right
│   ├── SubtractionNode    - left - right
│   ├── MultiplicationNode - left * right (4 display styles)
│   └── DivisionNode       - numerator / denominator (3 display styles)
│
├── Unary Operations (2 types)
│   ├── OppositeNode     - -operand (negation)
│   └── PositiveNode     - +operand (explicit positive)
│
├── Structural (3 types)
│   ├── DelimiterNode    - Parentheses/grouping
│   ├── SubscriptNode    - base_subscript
│   └── SuperscriptNode  - base^superscript
│
├── Function (1 type)
│   └── FunctionNode     - name(args) with power/base options
│
├── Relation (1 type)
│   └── RelationNode     - left = right (21 relation types)
│
├── Unit (1 type)
│   └── UnitNode         - expression with physical unit
│
└── Composition (1 type)
    └── CompositionNode  - f o g (function composition)
```

## Base Interface

All nodes extend a common base:

```typescript
interface BaseNode {
	readonly type: string;
	readonly metadata?: NodeMetadata;
}

interface NodeMetadata {
	readonly color?: string;
	readonly style?: 'normal' | 'bold' | 'italic';
	readonly annotation?: string;
}
```

## Literal Nodes

### NumberNode

Numeric values stored as strings for precision:

```typescript
interface NumberNode {
	readonly type: 'number';
	readonly value: string; // "3.14", "42", "-5.5e10"
	readonly metadata?: NodeMetadata;
}

// Examples
MathAST.number('3.14'); // pi approximation
MathAST.number('3.140'); // different formatting!
MathAST.number('-5'); // negative
MathAST.number('1.5e-10'); // scientific notation
```

**Why string storage?**

- Preserves exact user formatting ("3.14" vs "3.140")
- Avoids floating-point precision issues
- Supports arbitrary precision when needed
- Maintains original representation for display

### VariableNode

Variable identifiers (single or multi-character):

```typescript
interface VariableNode {
	readonly type: 'variable';
	readonly name: string;
	readonly metadata?: NodeMetadata;
}

// Examples
MathAST.variable('x'); // single letter
MathAST.variable('velocity'); // multi-character
```

### GreekLetterNode

Greek letters for mathematical constants and variables:

```typescript
type GreekLetter = 'pi' | 'alpha' | 'beta' | 'gamma' | 'theta';

interface GreekLetterNode {
	readonly type: 'greek';
	readonly letter: GreekLetter;
	readonly metadata?: NodeMetadata;
}

// Examples
MathAST.greek('pi'); // renders as pi
MathAST.greek('alpha'); // renders as alpha
MathAST.greek('theta'); // renders as theta
```

**Note**: Only 5 Greek letters are fully supported by both LaTeX and custom parsers.

### SymbolNode

Special mathematical symbols:

```typescript
type MathSymbol =
	// Constants
	| 'infinity'
	| 'emptyset'
	| 'partial'
	| 'nabla'
	// Quantifiers
	| 'forall'
	| 'exists'
	| 'nexists'
	// Set operations
	| 'in'
	| 'notin'
	| 'subset'
	| 'supset'
	| 'subseteq'
	| 'supseteq'
	| 'union'
	| 'intersection'
	| 'setminus'
	// Logic
	| 'therefore'
	| 'because'
	| 'qed'
	// Special sets
	| 'aleph'
	| 'beth'
	| 'ell'
	| 'wp'
	| 'Re'
	| 'Im'
	| 'hbar'
	// Markers
	| 'degree'
	| 'prime'
	| 'dprime'
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
	| 'star'
	| 'circ'
	| 'bullet'
	| 'cdot'
	| 'times'
	| 'div'
	| 'pm'
	| 'mp'
	| 'ast'
	| 'oplus'
	| 'ominus'
	| 'otimes'
	| 'odot';

interface SymbolNode {
	readonly type: 'symbol';
	readonly symbol: MathSymbol;
	readonly metadata?: NodeMetadata;
}

// Examples
MathAST.symbol('infinity'); // oo
MathAST.symbol('partial'); // partial derivative symbol
MathAST.symbol('pm'); // plus-minus
```

### HoleNode

Interactive placeholders for fill-in-the-blank exercises:

```typescript
interface HoleNode {
	readonly type: 'hole';
	readonly index: number; // Unique identifier
	readonly placeholder?: string; // Display hint
	readonly metadata?: NodeMetadata;
}

// Example: x + ___ = 5
MathAST.add(
	MathAST.variable('x'),
	MathAST.hole(0) // First hole, index 0
);
```

## Binary Operation Nodes

### AdditionNode

```typescript
interface AdditionNode {
	readonly type: 'addition';
	readonly left: MathNode;
	readonly right: MathNode;
	readonly operatorMetadata?: NodeMetadata;
	readonly metadata?: NodeMetadata;
}

// a + b
MathAST.add(MathAST.variable('a'), MathAST.variable('b'));
```

### SubtractionNode

```typescript
interface SubtractionNode {
	readonly type: 'subtraction';
	readonly left: MathNode;
	readonly right: MathNode;
	readonly operatorMetadata?: NodeMetadata;
	readonly metadata?: NodeMetadata;
}

// a - b
MathAST.subtract(MathAST.variable('a'), MathAST.variable('b'));
```

### MultiplicationNode

```typescript
type MultiplicationDisplayStyle = 'implicit' | 'dot' | 'cross' | 'star';

interface MultiplicationNode {
	readonly type: 'multiplication';
	readonly left: MathNode;
	readonly right: MathNode;
	readonly displayStyle: MultiplicationDisplayStyle;
	readonly operatorMetadata?: NodeMetadata;
	readonly metadata?: NodeMetadata;
}
```

**Display Styles:**

| Style        | Rendering | Use Case                   |
| ------------ | --------- | -------------------------- |
| `'implicit'` | `2x`      | Coefficient times variable |
| `'dot'`      | `2 . x`   | Explicit multiplication    |
| `'cross'`    | `2 x x`   | Cross product notation     |
| `'star'`     | `2 * x`   | Programming style          |

```typescript
// 2x (implicit)
MathAST.implicitMultiply(MathAST.number('2'), MathAST.variable('x'));

// 2 . x (dot)
MathAST.multiply(MathAST.number('2'), MathAST.variable('x'), 'dot');
```

### DivisionNode

```typescript
type DivisionDisplayStyle = 'fraction' | 'inline' | 'ratio';

interface DivisionNode {
	readonly type: 'division';
	readonly numerator: MathNode;
	readonly denominator: MathNode;
	readonly displayStyle: DivisionDisplayStyle;
	readonly operatorMetadata?: NodeMetadata;
	readonly metadata?: NodeMetadata;
}
```

**Display Styles:**

| Style        | Rendering          | Use Case           |
| ------------ | ------------------ | ------------------ |
| `'fraction'` | Stacked (a over b) | Standard fractions |
| `'inline'`   | `a / b`            | Inline division    |
| `'ratio'`    | `a : b`            | Ratio notation     |

```typescript
// a/b as fraction
MathAST.fraction(MathAST.variable('a'), MathAST.variable('b'));

// a / b inline
MathAST.divide(MathAST.variable('a'), MathAST.variable('b'), 'inline');
```

## Unary Operation Nodes

### OppositeNode

Negation (additive inverse):

```typescript
interface OppositeNode {
	readonly type: 'opposite';
	readonly operand: MathNode;
	readonly operatorMetadata?: NodeMetadata;
	readonly metadata?: NodeMetadata;
}

// -x
MathAST.opposite(MathAST.variable('x'));
```

### PositiveNode

Explicit positive sign:

```typescript
interface PositiveNode {
	readonly type: 'positive';
	readonly operand: MathNode;
	readonly operatorMetadata?: NodeMetadata;
	readonly metadata?: NodeMetadata;
}

// +x
MathAST.positive(MathAST.variable('x'));
```

## Structural Nodes

### DelimiterNode

Content surrounded by delimiters:

```typescript
type DelimiterType = 'parentheses';
type DelimiterSemantic = 'grouping' | 'interval' | 'set' | 'matrix' | 'vector';

interface DelimiterNode {
	readonly type: 'delimiter';
	readonly delimiters: DelimiterType;
	readonly content: MathNode;
	readonly semantic?: DelimiterSemantic;
	readonly delimiterMetadata?: NodeMetadata;
	readonly leftDelimiterMetadata?: NodeMetadata;
	readonly rightDelimiterMetadata?: NodeMetadata;
	readonly metadata?: NodeMetadata;
}

// (a + b)
MathAST.parentheses(MathAST.add(MathAST.variable('a'), MathAST.variable('b')));

// With semantic hint
MathAST.delimiter('parentheses', content, 'grouping');
```

### SubscriptNode

Subscript notation:

```typescript
interface SubscriptNode {
	readonly type: 'subscript';
	readonly base: MathNode;
	readonly subscript: MathNode;
	readonly metadata?: NodeMetadata;
}

// x_i
MathAST.subscript(MathAST.variable('x'), MathAST.variable('i'));

// a_{n+1}
MathAST.subscript(MathAST.variable('a'), MathAST.add(MathAST.variable('n'), MathAST.number('1')));
```

### SuperscriptNode

Superscript/exponent notation:

```typescript
interface SuperscriptNode {
	readonly type: 'superscript';
	readonly base: MathNode;
	readonly superscript: MathNode;
	readonly metadata?: NodeMetadata;
}

// x^2
MathAST.power(MathAST.variable('x'), MathAST.number('2'));

// Alias: superscript is same as power
MathAST.superscript(base, exponent);
```

## FunctionNode

Mathematical function application:

```typescript
interface FunctionNode {
	readonly type: 'function';
	readonly name: string;
	readonly args: readonly MathNode[];
	readonly power?: MathNode; // sin^2(x)
	readonly base?: MathNode; // log_2(x)
	readonly derivativeOrder?: number; // f'(x), f''(x)
	readonly isInverse?: boolean; // f^{-1}(x)
	readonly nameMetadata?: NodeMetadata;
	readonly delimiterMetadata?: NodeMetadata;
	readonly leftDelimiterMetadata?: NodeMetadata;
	readonly rightDelimiterMetadata?: NodeMetadata;
	readonly metadata?: NodeMetadata;
}
```

**Factory Functions:**

```typescript
// Standard functions
MathAST.sin(x); // sin(x)
MathAST.cos(x); // cos(x)
MathAST.tan(x); // tan(x)
MathAST.ln(x); // ln(x)
MathAST.log(x); // log(x)
MathAST.log(x, 2); // log_2(x)
MathAST.exp(x); // exp(x)
MathAST.sqrt(x); // sqrt(x)
MathAST.abs(x); // |x|

// Generic function with power/base
MathAST.func('f', [x], { power: MathAST.number('2') }); // f^2(x)
MathAST.func('log', [x], { base: MathAST.number('2') }); // log_2(x)

// Derivative function
MathAST.derivativeFunc('f', 1, [x]); // f'(x)
MathAST.derivativeFunc('f', 2, [x]); // f''(x)

// Inverse function
MathAST.inverseFunc('f', [x]); // f^{-1}(x)
```

## RelationNode

Mathematical relations:

```typescript
type RelationType =
	| '='
	| '<'
	| '>'
	| '<='
	| '>='
	| '!='
	| '≡'
	| '≢'
	| '≈'
	| '≃'
	| '∼'
	| '≺'
	| '≻'
	| '⊂'
	| '⊃'
	| '⊆'
	| '⊇'
	| '∈'
	| '∉'
	| '⟹'
	| '⟺'
	| '⟸';

interface RelationNode {
	readonly type: 'relation';
	readonly relation: RelationType;
	readonly left: MathNode;
	readonly right: MathNode;
	readonly relationMetadata?: NodeMetadata;
	readonly metadata?: NodeMetadata;
}
```

**Factory Functions:**

```typescript
// Basic relations
MathAST.equals(left, right); // =
MathAST.lessThan(left, right); // <
MathAST.greaterThan(left, right); // >
MathAST.lessThanOrEqual(left, right); // <=
MathAST.greaterThanOrEqual(left, right); // >=
MathAST.notEquals(left, right); // !=

// Special relations
MathAST.approx(left, right); // approx
MathAST.congruent(left, right); // identical to
MathAST.elementOf(left, right); // in
MathAST.subset(left, right); // subset
MathAST.implies(left, right); // =>
MathAST.iff(left, right); // <=>

// Relation chains: a < b < c
MathAST.lessThanChain([a, b, c]);
MathAST.equalsChain([a, b, c]); // a = b = c
```

## UnitNode

Expressions with physical units:

```typescript
interface UnitNode {
	readonly type: 'unit';
	readonly expression: MathNode;
	readonly unit: Unit;
	readonly unitMetadata?: NodeMetadata;
	readonly metadata?: NodeMetadata;
}

// 5 m
MathAST.withUnit(MathAST.number('5'), parseUnit('m'));

// velocity [m/s]
MathAST.quantity(MathAST.variable('v'), 'm/s');
```

## CompositionNode

Function composition:

```typescript
interface CompositionNode {
	readonly type: 'composition';
	readonly outer: MathNode; // f in f o g
	readonly inner: MathNode; // g in f o g
	readonly operatorMetadata?: NodeMetadata;
	readonly metadata?: NodeMetadata;
}

// f o g (f composed with g)
// (f o g)(x) = f(g(x))
MathAST.compose(MathAST.variable('f'), MathAST.variable('g'));
```

## Union Types

```typescript
// All literal nodes
type LiteralNode = NumberNode | VariableNode | GreekLetterNode | SymbolNode | HoleNode;

// All binary operations
type BinaryOperationNode = AdditionNode | SubtractionNode | MultiplicationNode | DivisionNode;

// All unary operations
type UnaryOperationNode = OppositeNode | PositiveNode;

// All structural nodes
type StructuralNode = DelimiterNode | SubscriptNode | SuperscriptNode;

// The master union (18 types)
type MathNode =
	| NumberNode
	| VariableNode
	| GreekLetterNode
	| SymbolNode
	| HoleNode
	| AdditionNode
	| SubtractionNode
	| MultiplicationNode
	| DivisionNode
	| OppositeNode
	| PositiveNode
	| FunctionNode
	| DelimiterNode
	| SubscriptNode
	| SuperscriptNode
	| RelationNode
	| UnitNode
	| CompositionNode;

// Extract type literal
type MathNodeType = MathNode['type'];
// = 'number' | 'variable' | 'greek' | ... (18 literals)
```

## See Also

- [Factory & Transforms](./factory-transforms.md) - Creating and manipulating nodes
- [Type Guards](./factory-transforms.md#type-guards) - Runtime type checking
