# MathAST Improvement Proposals

Analysis of potential improvements across architecture, security, performance, UX, and features.

---

## Executive Summary

The MathAST system is a well-architected, comprehensive mathematical expression library. This document identifies opportunities for enhancement in five categories:

| Category         | Priority Items                                   |
| ---------------- | ------------------------------------------------ |
| **Architecture** | Stricter typing, modular builds, plugin system   |
| **Security**     | Input bounds, sanitization, DoS prevention       |
| **Performance**  | Lazy evaluation, caching, WASM acceleration      |
| **UX**           | Better errors, auto-completion, visual debugging |
| **Features**     | Equation solving, complex numbers, matrices      |

---

## Architecture Improvements

### 1. Stricter Type Discrimination

**Current State:**
Node types use string literals (`type: 'addition'`), which is good but could be stricter.

**Proposal:**
Add branded types for enhanced compile-time safety:

```typescript
// Current
interface NumberNode {
	readonly type: 'number';
	readonly value: string;
}

// Proposed: branded type
declare const NumberNodeBrand: unique symbol;
interface NumberNode {
	readonly type: 'number';
	readonly value: string;
	readonly [NumberNodeBrand]: never;
}
```

**Benefits:**

- Prevents accidental node creation outside factories
- Enables exhaustive type checking
- Better IDE support

**Effort:** Medium | **Impact:** Medium

---

### 2. Modular Build System

**Current State:**
All mathAST code is bundled together. Tree-shaking helps but isn't optimal.

**Proposal:**
Split into independently publishable modules:

```
@ubumaths/mathast-core     # Types, factory, guards, transforms
@ubumaths/mathast-parser   # LaTeX and custom parsers
@ubumaths/mathast-eval     # Evaluation and substitution
@ubumaths/mathast-pattern  # Pattern matching
@ubumaths/mathast-normal   # Normalization
@ubumaths/mathast-calculus # Differentiation, Taylor
@ubumaths/mathast-units    # Physical units
```

**Benefits:**

- Smaller bundles for consumers using only part of the system
- Independent versioning
- Clearer dependency graph

**Effort:** High | **Impact:** High

---

### 3. Plugin Architecture

**Current State:**
Extending functionality requires modifying core code.

**Proposal:**
Implement a plugin system:

```typescript
interface MathASTPlugin {
	name: string;

	// Extend parsing
	parseHooks?: {
		beforeParse?: (input: string) => string;
		afterParse?: (ast: MathNode) => MathNode;
	};

	// Extend evaluation
	functions?: Record<string, (args: MathNode[]) => MathNode>;

	// Extend normalization
	normalizeRules?: Rule[];

	// Extend output
	latexGenerators?: Record<string, (node: MathNode) => string>;
}

// Usage
registerPlugin({
	name: 'trigonometry-extended',
	functions: {
		cot: ([x]) => divide(cos(x), sin(x)),
		sec: ([x]) => divide(number('1'), cos(x))
	}
});
```

**Benefits:**

- Domain-specific extensions without core changes
- Community contributions
- Cleaner separation of concerns

**Effort:** High | **Impact:** High

---

### 4. Visitor Pattern Enhancement

**Current State:**
`mapNode` provides basic traversal. More complex visitors need manual implementation.

**Proposal:**
Add a full visitor pattern with enter/leave hooks:

```typescript
interface ASTVisitor {
	enterNode?(node: MathNode, parent?: MathNode): void | 'skip';
	leaveNode?(node: MathNode, parent?: MathNode): void;

	// Type-specific visitors
	enterNumber?(node: NumberNode, parent?: MathNode): void;
	leaveNumber?(node: NumberNode, parent?: MathNode): void;
	enterAddition?(node: AdditionNode, parent?: MathNode): void;
	// ... etc
}

function visitAST(node: MathNode, visitor: ASTVisitor): void;
```

**Benefits:**

- More flexible traversal patterns
- Parent context available
- Skip subtrees when needed

**Effort:** Medium | **Impact:** Medium

---

### 5. Immutable Operations Library

**Current State:**
Node operations create new nodes but don't leverage structural sharing.

**Proposal:**
Use Immer or implement structural sharing:

```typescript
import { produce } from 'immer';

// Current
const updated = withMetadata(node, { color: 'red' });

// Proposed: structural sharing
const updated = produce(node, (draft) => {
	draft.metadata = { ...draft.metadata, color: 'red' };
});
```

**Benefits:**

- Memory efficiency for large ASTs
- Better performance for incremental updates
- Undo/redo support

**Effort:** Medium | **Impact:** Medium

---

## Security Improvements

### 1. Input Size Limits

**Current State:**
No explicit limits on input size or AST depth.

**Proposal:**
Add configurable limits:

```typescript
interface ParserSecurityOptions {
	maxInputLength?: number; // Default: 10000 characters
	maxASTDepth?: number; // Default: 100 levels
	maxNodeCount?: number; // Default: 10000 nodes
	maxFunctionArgs?: number; // Default: 20
	timeout?: number; // Default: 5000ms
}

// Throws SecurityError if limits exceeded
parseLatex(input, { security: { maxInputLength: 5000 } });
```

**Benefits:**

- Prevents DoS attacks via complex inputs
- Protects against runaway recursion
- Configurable per use case

**Effort:** Low | **Impact:** High

---

### 2. Expression Complexity Analysis

**Current State:**
No way to assess expression complexity before processing.

**Proposal:**
Add complexity metrics:

```typescript
interface ComplexityMetrics {
	depth: number;
	nodeCount: number;
	operationCount: number;
	functionCount: number;
	variableCount: number;
	estimatedEvalCost: number;
}

function analyzeComplexity(node: MathNode): ComplexityMetrics;

// Reject overly complex expressions
const metrics = analyzeComplexity(ast);
if (metrics.estimatedEvalCost > THRESHOLD) {
	throw new ComplexityError('Expression too complex');
}
```

**Benefits:**

- Pre-evaluate resource requirements
- Reject malicious inputs early
- Inform UI about expected wait times

**Effort:** Medium | **Impact:** High

---

### 3. Sanitization for Output

**Current State:**
LaTeX output is generated without escaping considerations.

**Proposal:**
Add output sanitization options:

```typescript
interface SanitizationOptions {
	escapeHtml?: boolean; // For web display
	escapeLatex?: boolean; // For LaTeX compilation
	maxLength?: number; // Truncate long output
	stripAnnotations?: boolean; // Remove metadata
}

function toLatexSafe(node: MathNode, options: SanitizationOptions): string;
```

**Benefits:**

- Prevent XSS in variable names/annotations
- Safe for different output contexts
- Configurable sanitization levels

**Effort:** Low | **Impact:** Medium

---

### 4. Validation of External Input

**Current State:**
External data (variable bindings, function definitions) not rigorously validated.

**Proposal:**
Add Zod schemas for all external interfaces:

```typescript
import { z } from 'zod';

const EvalBindingsSchema = z.record(
	z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
	z.number().finite().safe()
);

const FunctionDefinitionSchema = z.object({
	expression: z.custom<MathNode>(isMathNode),
	parameters: z.array(z.string().min(1).max(20)).max(10)
});

// Validate before use
const bindings = EvalBindingsSchema.parse(userInput);
```

**Benefits:**

- Type-safe runtime validation
- Clear error messages
- Prevents injection via bindings

**Effort:** Medium | **Impact:** High

---

### 5. Audit Logging

**Current State:**
No tracking of operations for security auditing.

**Proposal:**
Add optional audit logging:

```typescript
interface AuditEntry {
	timestamp: number;
	operation: 'parse' | 'evaluate' | 'transform';
	input: string;
	result: 'success' | 'error';
	metrics: { duration: number; nodeCount: number };
}

// Enable auditing
const { result, audit } = evaluateWithAudit(ast, options);
```

**Benefits:**

- Track suspicious patterns
- Performance monitoring
- Debug production issues

**Effort:** Low | **Impact:** Medium

---

## Performance Improvements

### 1. Lazy Evaluation

**Current State:**
All nodes are fully constructed during parsing.

**Proposal:**
Implement lazy node construction for large expressions:

```typescript
interface LazyMathNode {
	readonly type: 'lazy';
	readonly compute: () => MathNode;
	readonly memoized?: MathNode;
}

// Only compute when needed
function getLazyValue(node: LazyMathNode): MathNode {
	if (!node.memoized) {
		node.memoized = node.compute();
	}
	return node.memoized;
}
```

**Benefits:**

- Faster initial parsing
- Memory savings for unused branches
- Better for conditional evaluation

**Effort:** High | **Impact:** Medium

---

### 2. Expression Caching

**Current State:**
No built-in caching for repeated operations.

**Proposal:**
Add memoization layer:

```typescript
class ExpressionCache {
	private parseCache = new LRUCache<string, MathNode>(1000);
	private normalCache = new WeakMap<MathNode, NormalForm>();
	private hashCache = new WeakMap<MathNode, string>();

	parse(input: string): MathNode {
		return this.parseCache.get(input) ?? this.parseCache.set(input, parseLatex(input));
	}

	normalize(node: MathNode): NormalForm {
		return this.normalCache.get(node) ?? this.normalCache.set(node, normalize(node));
	}
}
```

**Benefits:**

- Avoid reparsing same expressions
- Faster equivalence checking
- Configurable cache size

**Effort:** Medium | **Impact:** High

---

### 3. Streaming Parser

**Current State:**
Parser processes entire input before returning.

**Proposal:**
Add streaming/incremental parsing:

```typescript
interface IncrementalParser {
	feed(chunk: string): void;
	getPartialAST(): MathNode | null;
	isComplete(): boolean;
	finish(): MathNode;
}

// Use case: real-time parsing as user types
const parser = createIncrementalParser();
input.addEventListener('input', (e) => {
	parser.feed(e.data);
	previewNode = parser.getPartialAST();
});
```

**Benefits:**

- Real-time feedback during input
- Better for long expressions
- Early error detection

**Effort:** High | **Impact:** Medium

---

### 4. WASM Acceleration

**Current State:**
All computation in JavaScript.

**Proposal:**
Implement performance-critical operations in Rust/WASM:

```rust
// Rust implementation
#[wasm_bindgen]
pub fn normalize_polynomial(json: &str) -> String {
    let ast: MathNode = serde_json::from_str(json)?;
    let normalized = normalize(&ast);
    serde_json::to_string(&normalized)?
}
```

**Benefits:**

- 10-100x speedup for normalization
- Faster evaluation for complex expressions
- Parallelization opportunities

**Effort:** Very High | **Impact:** High

---

### 5. Worker Thread Offloading

**Current State:**
All computation on main thread.

**Proposal:**
Offload heavy operations to Web Workers:

```typescript
// Main thread
const worker = new MathASTWorker();
const result = await worker.normalize(expression);

// Worker
self.onmessage = async (e) => {
	const { operation, data } = e.data;
	if (operation === 'normalize') {
		const result = normalize(data);
		self.postMessage(result);
	}
};
```

**Benefits:**

- Non-blocking UI
- Parallel processing
- Timeout/cancellation support

**Effort:** Medium | **Impact:** Medium

---

### 6. Optimized Pattern Matching

**Current State:**
Pattern matching tests each rule sequentially.

**Proposal:**
Build decision tree for rule sets:

```typescript
interface OptimizedRuleSet {
	// Pre-compiled decision tree
	readonly decisionTree: DecisionNode;

	// Fast matching
	match(node: MathNode): Rule | null;
}

function compileRules(rules: Rule[]): OptimizedRuleSet {
	// Build discrimination tree based on node types
	// Group rules by root node type
	// Enable O(log n) matching instead of O(n)
}
```

**Benefits:**

- Faster simplification
- Scales better with rule count
- Memory-efficient rule storage

**Effort:** High | **Impact:** Medium

---

## UX Improvements

### 1. Rich Error Messages

**Current State:**
Parse errors show position but limited context.

**Proposal:**
Implement comprehensive error reporting:

```typescript
interface ParseError {
  message: string;
  code: 'UNEXPECTED_TOKEN' | 'MISSING_OPERAND' | 'UNBALANCED_PARENS' | ...;
  position: { line: number; column: number; offset: number };
  context: {
    before: string;    // "x + "
    error: string;     // "^"
    after: string;     // " + 1"
  };
  suggestions?: string[];  // ["Did you mean 'x^2'?"]
  severity: 'error' | 'warning';
}

// Visualized error
parseLatexSafe('x + ^ + 1');
// Error at position 5: Unexpected '^'
// x + ^ + 1
//     ^
// Suggestion: Remove '^' or add an operand before it
```

**Benefits:**

- Clearer error diagnosis
- Faster correction
- Educational feedback

**Effort:** Medium | **Impact:** High

---

### 2. Auto-Completion API

**Current State:**
No support for suggesting completions.

**Proposal:**
Add completion provider:

```typescript
interface CompletionItem {
	label: string; // "sin"
	kind: 'function' | 'variable' | 'constant' | 'operator';
	insertText: string; // "\\sin("
	documentation?: string; // "Sine function"
}

function getCompletions(
	input: string,
	position: number,
	context: { variables?: string[]; functions?: string[] }
): CompletionItem[];

// Usage
getCompletions('si', 2);
// [{ label: 'sin', kind: 'function', insertText: '\\sin(' }, ...]
```

**Benefits:**

- IDE-like experience
- Faster input
- Discoverability

**Effort:** Medium | **Impact:** High

---

### 3. Visual AST Editor

**Current State:**
AST manipulation is code-only.

**Proposal:**
Add visual tree editor component:

```svelte
<MathASTEditor
	bind:ast
	on:nodeSelect={handleSelect}
	on:nodeChange={handleChange}
	highlightNode={selectedNode}
	readOnly={false}
/>
```

**Benefits:**

- Direct manipulation of expressions
- Educational tool
- Debugging aid

**Effort:** High | **Impact:** High

---

### 4. Step-by-Step Transformation

**Current State:**
Transformations show only final result.

**Proposal:**
Record transformation steps:

```typescript
interface TransformationStep {
	rule: string; // "additive-identity"
	before: MathNode; // (x + 0) * 1
	after: MathNode; // x * 1
	location: NodePath; // Path to transformed node
}

function simplifyWithSteps(
	node: MathNode,
	rules: Rule[]
): {
	result: MathNode;
	steps: TransformationStep[];
};

// Usage
const { result, steps } = simplifyWithSteps(expr, allRules);
steps.forEach((step) => {
	console.log(`Applied ${step.rule}:`);
	console.log(`  ${toLatex(step.before)} -> ${toLatex(step.after)}`);
});
```

**Benefits:**

- Educational: show work
- Debugging transformations
- Verify correctness

**Effort:** Medium | **Impact:** High

---

### 5. Internationalization

**Current State:**
Limited to English function names and French decimal formatting.

**Proposal:**
Full i18n support:

```typescript
interface MathLocale {
  decimalSeparator: '.' | ',';
  thousandsSeparator: ',' | ' ' | '.';
  functionNames: {
    sin: string;    // "sin" | "seno" | ...
    cos: string;
    // ...
  };
  relationSymbols: {
    lessThanOrEqual: string;  // "≤" | "⩽" | "≦"
    // ...
  };
}

// Usage
const frLocale: MathLocale = {
  decimalSeparator: ',',
  thousandsSeparator: ' ',
  functionNames: { sin: 'sin', cos: 'cos', ... }
};

toLatex(expr, { locale: frLocale });
```

**Benefits:**

- Regional number formatting
- Localized output
- Cultural math conventions

**Effort:** Medium | **Impact:** Medium

---

## Feature Improvements

### 1. Equation Solving

**Current State:**
No symbolic equation solving.

**Proposal:**
Add algebraic equation solver:

```typescript
interface Solution {
	variable: string;
	value: MathNode;
	conditions?: MathNode[]; // e.g., "x ≠ 0"
}

function solveEquation(
	equation: RelationNode,
	variable: string
): Solution[] | 'no-solution' | 'infinite-solutions';

// Examples
solve(parseLatex('x + 3 = 5'), 'x');
// [{ variable: 'x', value: number('2') }]

solve(parseLatex('x^2 = 4'), 'x');
// [{ variable: 'x', value: number('2') },
//  { variable: 'x', value: number('-2') }]

solve(parseLatex('ax + b = 0'), 'x');
// [{ variable: 'x', value: fraction(-b, a), conditions: ['a ≠ 0'] }]
```

**Benefits:**

- Core educational feature
- Automatic problem solving
- Step-by-step solutions

**Effort:** Very High | **Impact:** Very High

---

### 2. Complex Numbers

**Current State:**
No native complex number support.

**Proposal:**
Add complex number type:

```typescript
interface ComplexNode {
	readonly type: 'complex';
	readonly real: MathNode;
	readonly imaginary: MathNode;
}

// Factory
MathAST.complex(MathAST.number('3'), MathAST.number('4'));
// 3 + 4i

// Parsing
parseLatex('3 + 4i'); // ComplexNode
parseLatex('e^{i\\pi}'); // Evaluates to -1

// Operations
evaluate(parseLatex('(1+i)(1-i)')); // 2
```

**Benefits:**

- Complete number system
- Euler's formula support
- Electrical engineering applications

**Effort:** High | **Impact:** Medium

---

### 3. Matrix Operations

**Current State:**
No matrix/vector support.

**Proposal:**
Add matrix type and operations:

```typescript
interface MatrixNode {
	readonly type: 'matrix';
	readonly rows: number;
	readonly cols: number;
	readonly elements: readonly (readonly MathNode[])[];
}

// Factory
MathAST.matrix([
	[MathAST.number('1'), MathAST.number('2')],
	[MathAST.number('3'), MathAST.number('4')]
]);

// Parsing
parseLatex('\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}');

// Operations
matrixMultiply(A, B);
determinant(A);
inverse(A);
eigenvalues(A);
```

**Benefits:**

- Linear algebra support
- Physics/engineering applications
- Educational value

**Effort:** Very High | **Impact:** High

---

### 4. Sets and Intervals

**Current State:**
Set notation parsed but not evaluated.

**Proposal:**
Add set operations:

```typescript
interface SetNode {
	readonly type: 'set';
	readonly notation: 'extension' | 'comprehension' | 'interval';
	readonly elements?: readonly MathNode[]; // For extension
	readonly condition?: MathNode; // For comprehension
	readonly interval?: { start: MathNode; end: MathNode; openStart: boolean; openEnd: boolean };
}

// Factory
MathAST.set([1, 2, 3]); // {1, 2, 3}
MathAST.interval(0, 1, false, true); // [0, 1)
MathAST.comprehension('x', 'x > 0'); // {x | x > 0}

// Operations
setUnion(A, B);
setIntersection(A, B);
setDifference(A, B);
isElementOf(x, A);
```

**Benefits:**

- Full set theory support
- Domain/range specification
- Solution set representation

**Effort:** High | **Impact:** Medium

---

### 5. Limits and Summations

**Current State:**
No limit or summation notation.

**Proposal:**
Add limit, sum, and product nodes:

```typescript
interface LimitNode {
	readonly type: 'limit';
	readonly expression: MathNode;
	readonly variable: string;
	readonly approach: MathNode;
	readonly direction?: 'left' | 'right' | 'both';
}

interface SummationNode {
	readonly type: 'summation';
	readonly expression: MathNode;
	readonly variable: string;
	readonly lower: MathNode;
	readonly upper: MathNode;
}

// Parsing
parseLatex('\\lim_{x \\to 0} \\frac{\\sin x}{x}');
parseLatex('\\sum_{i=1}^{n} i^2');
parseLatex('\\prod_{k=1}^{n} k');

// Evaluation
evaluateLimit(limitNode); // Symbolic or numeric
evaluateSum(sumNode); // Closed form or numeric
```

**Benefits:**

- Calculus completeness
- Series analysis
- Mathematical notation fidelity

**Effort:** Very High | **Impact:** High

---

### 6. Symbolic Integration

**Current State:**
Only differentiation is supported.

**Proposal:**
Add symbolic integration:

```typescript
interface IntegrationResult {
	antiderivative: MathNode;
	constant?: string; // "+ C"
	conditions?: string[];
}

function integrate(
	expr: MathNode,
	variable: string,
	options?: { definite?: { lower: number; upper: number } }
): IntegrationResult | 'no-closed-form';

// Examples
integrate(parseLatex('x^2'), 'x');
// { antiderivative: x^3/3 + C }

integrate(parseLatex('\\sin(x)'), 'x');
// { antiderivative: -cos(x) + C }

integrate(parseLatex('x^2'), 'x', { definite: { lower: 0, upper: 1 } });
// { antiderivative: 1/3 }
```

**Benefits:**

- Full calculus support
- Area calculations
- Physics applications

**Effort:** Very High | **Impact:** High

---

### 7. LaTeX Environments

**Current State:**
Limited LaTeX environment support.

**Proposal:**
Support common math environments:

```typescript
// Arrays and matrices
parseLatex('\\begin{array}{cc} a & b \\\\ c & d \\end{array}');
parseLatex('\\begin{cases} x & \\text{if } x > 0 \\\\ -x & \\text{otherwise} \\end{cases}');

// Aligned equations
parseLatex('\\begin{align} x + y &= 5 \\\\ x - y &= 1 \\end{align}');

// System of equations node
interface SystemNode {
	readonly type: 'system';
	readonly equations: readonly RelationNode[];
}
```

**Benefits:**

- Full LaTeX compatibility
- Piecewise functions
- Equation systems

**Effort:** High | **Impact:** High

---

## Implementation Priority Matrix

| Improvement            | Effort    | Impact    | Priority | Status          |
| ---------------------- | --------- | --------- | -------- | --------------- |
| Input Size Limits      | Low       | High      | **P0**   | **IMPLEMENTED** |
| Rich Error Messages    | Medium    | High      | **P0**   | **IMPLEMENTED** |
| Expression Caching     | Medium    | High      | **P1**   | **IMPLEMENTED** |
| Validation with Zod    | Medium    | High      | **P1**   | **IMPLEMENTED** |
| Step-by-Step Transform | Medium    | High      | **P1**   | **IMPLEMENTED** |
| Auto-Completion API    | Medium    | High      | **P1**   | **IMPLEMENTED** |
| Complexity Analysis    | Medium    | High      | **P1**   | Pending         |
| Plugin Architecture    | High      | High      | **P2**   | Pending         |
| Modular Builds         | High      | High      | **P2**   | Pending         |
| Equation Solving       | Very High | Very High | **P2**   | Pending         |
| Worker Offloading      | Medium    | Medium    | **P2**   | Pending         |
| Visitor Enhancement    | Medium    | Medium    | **P3**   | Pending         |
| Lazy Evaluation        | High      | Medium    | **P3**   | Pending         |
| Complex Numbers        | High      | Medium    | **P3**   | Pending         |
| Limits/Summations      | Very High | High      | **P3**   | Pending         |
| Matrix Operations      | Very High | High      | **P3**   | Pending         |
| Symbolic Integration   | Very High | High      | **P3**   | Pending         |
| WASM Acceleration      | Very High | High      | **P4**   | Pending         |

---

## Implemented Features (P0/P1)

### Security (P0) - IMPLEMENTED

```typescript
import { parseLatex, SecurityError } from '$lib/mathAST';

// Security options
parseLatex(input, {
	security: {
		maxInputLength: 10000, // characters
		maxASTDepth: 100, // nesting levels
		maxNodeCount: 10000 // total nodes
	}
});
```

**Files:** `src/lib/mathAST/parser/security.ts`

### Rich Error Messages (P0) - IMPLEMENTED

```typescript
import { createErrorContext, computeLineAndColumn, getSuggestions } from '$lib/mathAST';

const ctx = createErrorContext(input, position, length);
const { line, column } = computeLineAndColumn(input, position);
const hints = getSuggestions(errorCode, message);
```

**Files:** `src/lib/mathAST/parser/error-context.ts`

### Parse Cache (P1) - IMPLEMENTED

```typescript
import { ParseCache } from '$lib/mathAST';

const cache = new ParseCache(100); // LRU cache, 100 entries
cache.set('x^2', ast);
const cached = cache.get('x^2'); // Returns AST or null
const stats = cache.getStats(); // { hits, misses, evictions, size }
```

**Files:** `src/lib/mathAST/cache/parse-cache.ts`

### Zod Validation (P1) - IMPLEMENTED

```typescript
import {
	validateVariableName,
	validateEvalBindings,
	VariableNameSchema,
	EvalBindingsSchema
} from '$lib/mathAST';

// Validate variable names
const result = validateVariableName('x'); // { success: true, data: 'x' }

// Validate eval bindings
const bindings = validateEvalBindings({ x: 1, y: NaN }); // fails for NaN
```

**Files:** `src/lib/mathAST/eval/validation.ts`

### Step-by-Step Transform (P1) - IMPLEMENTED

```typescript
import { simplifyWithSteps, StepRecorder } from '$lib/mathAST';

const { result, steps } = simplifyWithSteps(ast);

steps.forEach((step) => {
	console.log(`${step.rule}: ${step.description}`);
	console.log(`  Before: ${toLatex(step.before)}`);
	console.log(`  After: ${toLatex(step.after)}`);
});
```

**Files:** `src/lib/mathAST/normal/step-recorder.ts`

### Auto-Completion API (P1) - IMPLEMENTED

```typescript
import { CompletionProvider } from '$lib/mathAST';

const provider = new CompletionProvider();
const completions = provider.getCompletions('sin', {
	variables: ['x', 'y'],
	functions: ['f', 'g']
});

// Returns: [{ label: 'sin', kind: 'function', insertText: 'sin(', ... }, ...]
```

**Files:** `src/lib/mathAST/cli/completion/provider.ts`

---

## Conclusion

The MathAST system is architecturally sound with room for growth in:

1. **Immediate wins** (P0): ~~Security hardening, error messages~~ **DONE**
2. **Near-term** (P1): ~~Caching, validation, UX improvements~~ **MOSTLY DONE** (complexity analysis pending)
3. **Medium-term** (P2): Plugin system, modular builds, equation solving
4. **Long-term** (P3-P4): Advanced math features, performance optimization

The recommended approach is to address P0/P1 items first while designing the plugin architecture to enable community contributions for P2+ features.
