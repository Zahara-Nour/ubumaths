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

### 2. Operation-Specific Safety Checks

**Current State:**
No way to predict if an operation will be expensive before executing it.

**Problem with generic "complexity analysis":**
AST size ≠ computational cost. `x^{999999999}` is 3 nodes but expensive to evaluate numerically. `(x+1)^{100}` is 5 nodes but expands to 101 terms during normalization.

**Proposal:**
Add operation-specific pre-checks instead of generic metrics.

#### 2.1 Expansion Estimation (for normalization)

```typescript
interface ExpansionEstimate {
	upperBound: number; // Upper bound on term count (may over-estimate, safe)
	wouldExceed: boolean; // true if upperBound > maxTerms
	reason?: string; // e.g., "binomial (x+1)^100 → 101 terms"
}

interface ExpansionOptions {
	maxTerms?: number; // Default: 10000
}

function estimateExpansion(node: MathNode, options?: ExpansionOptions): ExpansionEstimate;
```

**Expansion cases handled:**

| Expression        | Type            | Estimation                         |
| ----------------- | --------------- | ---------------------------------- |
| `(x+1)^{100}`     | Binomial        | C(100,0..100) = 101 terms          |
| `(x+y+z)^{10}`    | Multinomial     | C(n+k-1, k-1) = C(12,2) = 66 terms |
| `((x+1)^2 + y)^3` | Nested          | Recursive estimation               |
| `(x+1)(x+2)(x+3)` | Product of sums | Product of term counts             |
| `x + x + x`       | Collection only | Low estimate (no expansion)        |

**Notes:**

- Over-estimation is acceptable for safety. We're being conservative.
- For symbolic exponents like `(x+1)^n`, return `wouldExceed: true` with reason "cannot estimate with symbolic exponent n"
- For non-integer/negative exponents like `(x+1)^{-2}` or `(x+1)^{0.5}`, return low estimate (no polynomial expansion)

```typescript
// Usage
const estimate = estimateExpansion(parseLatex('(x+1)^{100}'), { maxTerms: 1000 });
if (estimate.wouldExceed) {
	throw new ExpansionError(estimate.reason); // "binomial (x+1)^100 → 101 terms"
}
```

#### 2.2 Evaluation Safety Check

```typescript
type EvalDanger =
	| 'huge-exponent' // 2^{999999999}
	| 'huge-factorial' // 10000!
	| 'power-tower' // 2^{2^{2^{2}}} - exponential explosion
	| 'division-underflow'; // 1/10^{-400} → Infinity

interface EvalSafetyCheck {
	safe: boolean;
	dangers: EvalDanger[]; // All detected dangers (not just first)
	details: string[]; // Human-readable explanations
}

interface EvalSafetyOptions {
	mode?: 'numeric' | 'symbolic'; // Default: 'numeric'
	maxExponent?: number; // Default: 10000
	maxFactorialArg?: number; // Default: 170 (JS safe limit)
	maxPowerTowerDepth?: number; // Default: 4
}

function checkEvalSafety(node: MathNode, options?: EvalSafetyOptions): EvalSafetyCheck;
```

**Key insight on mode:**

- `numeric`: `x^{999999999}` is dangerous (actual computation)
- `symbolic`: `x^{999999999}` is safe (just 3-node storage)

```typescript
// Usage - numeric evaluation
const check = checkEvalSafety(parseLatex('2^{999999999}'), { mode: 'numeric' });
if (!check.safe) {
	// dangers: ['huge-exponent']
	// details: ['Exponent 999999999 exceeds safe limit 10000']
	throw new EvalSafetyError(check.details.join('; '));
}

// Usage - symbolic mode allows large exponents
const check2 = checkEvalSafety(parseLatex('x^{999999999}'), { mode: 'symbolic' });
// check2.safe === true (symbolic storage is fine)
```

#### 2.3 AST Depth Check (for traversal)

```typescript
function getASTDepth(node: MathNode): number;

// Usage - before any recursive operation
const depth = getASTDepth(ast);
if (depth > 500) {
	throw new DepthError(`Expression too deeply nested (${depth} levels)`);
}
```

**Why 500?** Conservative limit given:

- JS stack: ~10,000-20,000 frames
- Each recursive operation may use multiple frames
- Better safe than sorry

#### 2.4 Integration Points

These checks should be called at entry points of expensive operations:

```typescript
// In normalize.ts
export function normalize(node: MathNode, options?: NormalizeOptions): MathNode {
	// Pre-check expansion cost
	const estimate = estimateExpansion(node, { maxTerms: options?.maxTerms ?? 10000 });
	if (estimate.wouldExceed) {
		throw new ExpansionError(estimate.reason);
	}

	// Pre-check depth for recursion safety
	if (getASTDepth(node) > 500) {
		throw new DepthError('Expression too deeply nested for normalization');
	}

	// ... proceed with normalization
}

// In evaluate.ts
export function evaluate(node: MathNode, bindings: Bindings): number {
	// Pre-check evaluation safety
	const safety = checkEvalSafety(node, { mode: 'numeric' });
	if (!safety.safe) {
		throw new EvalSafetyError(safety.details.join('; '));
	}

	// ... proceed with evaluation
}
```

#### 2.5 Fallback Timeout (Last Line of Defense)

Even with pre-checks, add a general timeout wrapper for defense in depth:

```typescript
async function withTimeout<T>(fn: () => T, ms: number): Promise<T> {
	return Promise.race([
		Promise.resolve(fn()),
		new Promise<never>((_, reject) =>
			setTimeout(() => reject(new TimeoutError(`Operation timed out after ${ms}ms`)), ms)
		)
	]);
}

// Usage
const result = await withTimeout(() => normalize(ast), 5000);
```

**⚠️ Limitation:** This timeout pattern **cannot interrupt synchronous CPU-bound operations** in JavaScript's single-threaded model. The timeout callback won't fire until `fn()` returns.

**True timeout solutions:**

1. **Web Workers** - Run expensive operations in a separate thread (can be terminated)
2. **Cooperative yielding** - Check elapsed time periodically within the algorithm:

```typescript
function normalizeWithTimeout(node: MathNode, maxMs: number): MathNode {
	const start = performance.now();
	const checkTimeout = () => {
		if (performance.now() - start > maxMs) {
			throw new TimeoutError(`Normalization exceeded ${maxMs}ms`);
		}
	};
	// Call checkTimeout() periodically during normalization
	return normalizeInternal(node, { onStep: checkTimeout });
}
```

**Recommendation:** Pre-checks (2.1-2.3) are the primary defense. Timeout is secondary for async boundaries or Web Worker scenarios.

**Key insights:**

- Symbolic storage of `x^{999999999}` is fine (3 nodes)
- Numeric evaluation of `2^{999999999}` is dangerous
- Expansion of `(a+b)^{100}` creates 101 terms
- Each operation has its own cost model
- Over-estimation is acceptable for safety
- Defense in depth: pre-checks + timeout fallback

**Benefits:**

- Context-aware protection (not blanket rejection)
- Accurate predictions per operation type
- Clear error messages explaining why
- All dangers reported (not just first)
- Configurable thresholds per use case

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

### 1. Equation Solving - IMPLEMENTED

**Status:** IMPLEMENTED (2025-01-07)

See `src/lib/mathAST/solve/` module.

**Features:**

- Linear equations (ax + b = 0)
- Quadratic equations (ax² + bx + c = 0) with discriminant analysis
- Transcendental equations (exp, ln, log, sin, cos, tan)
- French pedagogical step-by-step output
- 3 verbosity levels: result, summarized, detailed
- REPL command: `.solve`
- Fluent API: `Exp.solve()`, `Exp.solutions()`

```typescript
import { solve, solveEquation, Exp } from '$lib/mathAST';

// Direct API
const result = solveEquation('2x + 6 = 0');
// { status: 'unique', solutions: [{ value: -3 }], steps: [...] }

// Fluent API
const solutions = Exp.from('x^2 - 5x + 6 = 0').solutions();
// [Exp(-3), Exp(-2)]

// With verbosity
const detailed = solve(parseLatex('x^2 + 1 = 0'), { verbosity: 'detailed' });
// { status: 'no-real-solution', steps: [...discriminant analysis...] }
```

**Tests:** 49 tests passing

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

### 5. Limits - DETAILED ROADMAP

**Current State:**
No limit notation or evaluation.

**Target Capabilities:**

| Feature               | Description                                                                     |
| --------------------- | ------------------------------------------------------------------------------- |
| **Parsing**           | `\lim_{x \to a}`, `\lim_{x \to a^+}`, `\lim_{x \to a^-}`, `\lim_{x \to \infty}` |
| **Known limits**      | Pattern-match standard limits (sin(x)/x, (1+1/x)^x, etc.)                       |
| **L'Hôpital**         | Detect 0/0, ∞/∞ and apply derivative rule                                       |
| **Algebraic**         | Factoring, rationalization, simplification                                      |
| **Squeeze theorem**   | Bound-based limit proofs                                                        |
| **One-sided**         | Left/right limits, discontinuity analysis                                       |
| **Infinity**          | x→∞, x→-∞, limits at infinity                                                   |
| **Pedagogical steps** | French step-by-step reasoning                                                   |

**New Node Types:**

```typescript
type LimitDirection = 'left' | 'right' | 'both';

interface LimitNode extends BaseNode {
	readonly type: 'limit';
	readonly expression: MathNode; // f(x)
	readonly variable: string; // 'x'
	readonly approach: MathNode; // a, ∞, -∞
	readonly direction: LimitDirection; // default 'both'
}

interface InfinityNode extends BaseNode {
	readonly type: 'infinity';
	readonly sign: 'positive' | 'negative';
}
```

**Implementation Phases:**

| Phase     | Description                             | Lines     | Files   |
| --------- | --------------------------------------- | --------- | ------- |
| 1         | Foundation (types, parsing, generation) | ~400      | 9       |
| 2         | Known limits table                      | ~300      | 3       |
| 3         | L'Hôpital's rule                        | ~400      | 3       |
| 4         | Algebraic manipulation                  | ~500      | 2       |
| 5         | Squeeze theorem                         | ~200      | 1       |
| 6         | Pedagogical steps                       | ~300      | 2       |
| 7         | One-sided limits                        | ~300      | 2       |
| -         | Tests                                   | ~600      | 5+      |
| **Total** |                                         | **~3000** | **~27** |

**Design Decisions:**

| Question                | Decision                                                   |
| ----------------------- | ---------------------------------------------------------- |
| Infinity representation | Dedicated `InfinityNode` (semantically correct, type-safe) |
| Numeric fallback        | Optional `{ allowNumeric: true/false }` parameter          |
| Multi-variable limits   | Single variable only                                       |
| Asymptotic notation     | Not needed                                                 |

**File Structure:**

```
src/lib/mathAST/limits/
├── index.ts              # Public API
├── types.ts              # LimitResult, LimitStep types
├── evaluate.ts           # Main evaluation entry point
├── known-limits.ts       # Standard limits database
├── indeterminate.ts      # Indeterminate form detection
├── lhopital.ts           # L'Hôpital's rule
├── algebraic.ts          # Algebraic manipulation strategies
├── squeeze.ts            # Squeeze theorem
├── one-sided.ts          # One-sided limit handling
└── step-recorder.ts      # Pedagogical step recording
```

**Integration with Intervals Module (`$lib/math/intervals/`):**

The intervals module provides infrastructure to reuse:

- `InfinityKind` for infinity representation (with converters to/from `InfinityNode`)
- `EndpointValue` / `AlgebraicCoefficient` for exact limit results (rationals, radicals)
- `intersect`, `union`, `complement`, `containsValue` for continuity analysis
- `positiveReals()`, `nonZeroReals()` for domain checking

**Effort:** Very High | **Impact:** High

---

### 5b. Summations and Products

**Current State:**
No summation or product notation.

**Proposal:**
Add sum and product nodes (after limits):

```typescript
interface SummationNode {
	readonly type: 'summation';
	readonly expression: MathNode;
	readonly variable: string;
	readonly lower: MathNode;
	readonly upper: MathNode;
}

interface ProductNode {
	readonly type: 'product';
	readonly expression: MathNode;
	readonly variable: string;
	readonly lower: MathNode;
	readonly upper: MathNode;
}

// Parsing
parseLatex('\\sum_{i=1}^{n} i^2');
parseLatex('\\prod_{k=1}^{n} k');

// Evaluation
evaluateSum(sumNode); // Closed form or numeric
evaluateProduct(prodNode); // Closed form or numeric
```

**Benefits:**

- Series analysis
- Factorial representation
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

| Improvement             | Effort    | Impact    | Priority | Status          |
| ----------------------- | --------- | --------- | -------- | --------------- |
| Input Size Limits       | Low       | High      | **P0**   | **IMPLEMENTED** |
| Rich Error Messages     | Medium    | High      | **P0**   | **IMPLEMENTED** |
| Expression Caching      | Medium    | High      | **P1**   | **IMPLEMENTED** |
| Validation with Zod     | Medium    | High      | **P1**   | **IMPLEMENTED** |
| Step-by-Step Transform  | Medium    | High      | **P1**   | **IMPLEMENTED** |
| Auto-Completion API     | Medium    | High      | **P1**   | **IMPLEMENTED** |
| Operation Safety Checks | Medium    | High      | **P1**   | Pending         |
| Plugin Architecture     | High      | High      | **P2**   | Pending         |
| Modular Builds          | High      | High      | **P2**   | Pending         |
| Equation Solving        | Very High | Very High | **P2**   | **IMPLEMENTED** |
| Worker Offloading       | Medium    | Medium    | **P2**   | Pending         |
| Visitor Enhancement     | Medium    | Medium    | **P3**   | **IMPLEMENTED** |
| Visitor Refactoring     | Low       | Medium    | **P3**   | Analysis Done   |
| Lazy Evaluation         | High      | Medium    | **P3**   | Pending         |
| Complex Numbers         | High      | Medium    | **P3**   | Pending         |
| Limits                  | Very High | High      | **P3**   | **ROADMAP**     |
| Summations              | Very High | High      | **P3**   | Pending         |
| Matrix Operations       | Very High | High      | **P3**   | Pending         |
| Symbolic Integration    | Very High | High      | **P3**   | Pending         |
| WASM Acceleration       | Very High | High      | **P4**   | Pending         |

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

### Visitor Pattern (P3) - IMPLEMENTED

```typescript
import { visitAST, transformAST, type ASTVisitor, type TransformVisitor } from '$lib/mathAST';

// Read-only traversal: collect all variables
const variables = new Set<string>();
visitAST(ast, {
	enterVariable: (node) => {
		variables.add(node.name);
	}
});

// Transformation: replace variables with numbers
const result = transformAST(ast, {
	leaveVariable: (node) => {
		if (node.name === 'x') return number('5');
	}
});

// Context information: parent, path, depth
visitAST(ast, {
	enterNode: (node, context) => {
		console.log(`Depth: ${context.depth}, Path: ${context.path.join('/')}`);
		if (context.parent?.type === 'division') {
			// Check if we're in a denominator
		}
	}
});

// Skip children
visitAST(ast, {
	enterParentheses: () => 'skip' // Don't visit content of parentheses
});
```

**Features:**

- `visitAST` - Read-only traversal with enter/leave callbacks
- `transformAST` - Immutable transformation with node replacement
- Type-specific callbacks: `enterNumber`, `leaveAddition`, etc. (18 node types)
- Context: `{ parent, path, depth }`
- Skip children with `'skip'` return value
- Transform with replacement: return `MathNode` or `{ node, skip: true }`

**Files:** `src/lib/mathAST/visitor.ts`

---

## Visitor Pattern Refactoring Opportunities

Analysis of which existing code could be refactored to use the visitor pattern (January 2025).

### Candidates Summary

| Priority | Module        | Functions                                  | Lines Saved | ROI      |
| -------- | ------------- | ------------------------------------------ | ----------- | -------- |
| **P1**   | transforms.ts | findNodes, findFirst, countNodes, getDepth | ~50         | High     |
| **P1**   | transforms.ts | cloneNode                                  | ~120        | High     |
| **P2**   | rules.ts      | containsVariable (deduplicate)             | ~58         | Medium   |
| **Skip** | substitute.ts | getVariables, hasVariable                  | N/A         | Low      |
| **Skip** | evaluate.ts   | evaluateNode                               | N/A         | Negative |
| **Skip** | flatten.ts    | flattenSum\*, flattenProduct\*             | N/A         | Negative |
| **Skip** | match.ts      | match, matchAddition                       | N/A         | Negative |

### P1: transforms.ts Utilities (RECOMMENDED)

**Current implementations** use manual recursion with `getChildren()`:

```typescript
// Current findNodes (15 lines)
export function findNodes(node: MathNode, predicate: (n: MathNode) => boolean): MathNode[] {
	const results: MathNode[] = [];
	function collect(n: MathNode) {
		if (predicate(n)) results.push(n);
		for (const child of getChildren(n)) collect(child);
	}
	collect(node);
	return results;
}

// With visitor (6 lines)
export function findNodes(node: MathNode, predicate: (n: MathNode) => boolean): MathNode[] {
	const results: MathNode[] = [];
	visitAST(node, {
		enterNode: (n) => {
			if (predicate(n)) results.push(n);
		}
	});
	return results;
}
```

**cloneNode** is currently 120 lines of switch statement:

```typescript
// With visitor (3 lines)
export function cloneNode(node: MathNode): MathNode {
	return transformAST(node, {}); // Identity transform = deep clone
}
```

### P2: Deduplicate containsVariable

`containsVariable` exists in **3 copies**:

- `differentiation/rules.ts:596` (58 lines) - exported
- `pattern/constraints.ts:34` (50 lines) - private
- `templates/templateEngine.ts:397` - different module (text templates)

**Solution**: Replace with `hasVariable` from substitute.ts:

```typescript
// In differentiation/rules.ts
import { hasVariable } from '../eval/substitute';
export { hasVariable as containsVariable };
```

### NOT Recommended for Refactoring

| Function                         | Reason                                                      |
| -------------------------------- | ----------------------------------------------------------- |
| `getVariables`                   | Works well with mapNode, 30+ usages across codebase         |
| `hasVariable`                    | Uses flag-based early-exit, efficient                       |
| `containsVariable` (constraints) | Internal function, early-exit via `\|\|` short-circuit      |
| `evaluateNode`                   | Returns complex IntermediateValue, type-specific logic      |
| `computeDomainNode`              | Complex step recording, restructuring not worth it          |
| `flattenSum*`, `flattenProduct*` | Specialized sign tracking, delimiter boundaries             |
| `match`, `matchAddition`         | Commutative matching, binding accumulation, domain-specific |

### Performance Analysis

| AST Size    | Direct Recursion | visitAST | Impact      |
| ----------- | ---------------- | -------- | ----------- |
| 10-100      | 2-20μs           | 8-80μs   | Negligible  |
| 1000+ nodes | 200μs            | 800μs    | Perceptible |

**Verdict**: Negligible for typical expressions (< 100 nodes).

**Exception**: `containsVariable` in differentiation uses `||` short-circuit for early-exit. Refactoring to visitor would **lose** this optimization.

### Dependencies

Functions with high usage (refactor carefully):

- `getVariables`: 30+ usages (solve, cli, eval, grapheur)
- `containsVariable`: 20+ usages (differentiation, pattern)

Functions with low usage (safe to refactor):

- `cloneNode`: 15 usages (mostly tests)
- `findNodes/findFirst`: 15 usages (tests, exp.ts)
- `countNodes/getDepth`: 17 usages (tests)

### Implementation Checklist

If proceeding with refactoring:

**Phase 1: transforms.ts**

- [ ] Import `visitAST`, `transformAST` from `./visitor`
- [ ] Refactor `findNodes` (15→6 lines)
- [ ] Refactor `findFirst` (18→8 lines, keep flag pattern)
- [ ] Refactor `countNodes` (8→5 lines)
- [ ] Refactor `getDepth` (12→6 lines)
- [ ] Refactor `cloneNode` (120→3 lines)
- [ ] Run `pnpm test:server transforms`

**Phase 2: Deduplication**

- [ ] In `differentiation/rules.ts`: import `hasVariable`, export as `containsVariable`
- [ ] Remove manual implementation (~58 lines)
- [ ] Run `pnpm test:server differentiation`

**Total savings**: ~230 lines

---

## Conclusion

The MathAST system is architecturally sound with room for growth in:

1. **Immediate wins** (P0): ~~Security hardening, error messages~~ **DONE**
2. **Near-term** (P1): ~~Caching, validation, UX improvements~~ **MOSTLY DONE** (operation safety checks pending)
3. **Medium-term** (P2): Plugin system, modular builds, equation solving
4. **Long-term** (P3-P4): Advanced math features, performance optimization

The recommended approach is to address P0/P1 items first while designing the plugin architecture to enable community contributions for P2+ features.
