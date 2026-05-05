/**
 * Pedagogical Differentiation — Pipeline Orchestrator
 *
 * `generatePedagogicalDifferentiationSteps(node, options)` is the high-level
 * entry point. It dispatches recursively on `node.type`, announcing the
 * pedagogical rule BEFORE recursing into operands (pre-order) — distinct from
 * `differentiation/differentiate.ts` which evaluates post-order.
 *
 * Strategy :
 *
 * 1. The PUBLIC entry point checks whether the input expression is itself a
 *    trivial node (constant, variable, greek letter). If yes, a single
 *    top-level step is emitted (`(c)' = 0`, `(x)' = 1`, …) — this is the
 *    only place where trivial nodes produce visible steps.
 *
 * 2. Otherwise, the internal `differentiate()` recursion handles every
 *    non-trivial type, capturing structural bindings (u, v, n, …) and
 *    recursing on operands. Trivial operand derivations (`(c)' = 0`,
 *    `(x)' = 1` discovered while recursing) are computed inline and do NOT
 *    add steps — keeping the trace focused on rules that actually convey
 *    meaning to the student.
 *
 * 3. Pedagogical special cases (`linear-coefficient`, `sum-with-constant`,
 *    `power-natural`, `inverse`, `derivative-of-inverse`, …) are detected
 *    BEFORE the corresponding generic rule (`product`, `sum`, …) so the
 *    student sees the form most teachers would write at the board.
 *
 * 4. Underlying calculations (`productRule`, `sumRule`, `sinRule`, …) are
 *    delegated to `differentiation/rules.ts` — we don't reimplement the
 *    symbolic computation, only its orchestration.
 *
 * Phase status (see docs/wip/differentiation-stepper-progress.md) :
 *
 * - Phase 1 (current): infrastructure + triviae top-level only.
 * - Phase 2a-2f: incremental implementation of every non-trivial branch.
 *
 * @module mathAST/pedagogical-differentiation/pipeline
 */

import type {
	AdditionNode,
	DelimiterNode,
	DivisionNode,
	FunctionNode,
	MathNode,
	MultiplicationNode,
	OppositeNode,
	PositiveNode,
	SubtractionNode,
	SuperscriptNode
} from '../types';
import { containsVariable } from '../common/contains-variable';
import { isOne, isZero } from '../guards';
import {
	acoshRule,
	arccosRule,
	arcsinRule,
	arctanRule,
	asinhRule,
	atanhRule,
	constantRule,
	coshRule,
	cosRule,
	differenceRule,
	expRule,
	generalPowerRule,
	greekLetterRule,
	lnRule,
	logRule,
	negationRule,
	one,
	powerRuleConstantExp,
	productRule,
	quotientRule,
	simplifiedDivide,
	simplifiedMultiply,
	sinhRule,
	sinRule,
	sqrtRule,
	sumRule,
	tanhRule,
	tanRule,
	variableRule,
	zero
} from '../differentiation/rules';
import { number, power } from '../factory';
import { getDefaultDescription } from './descriptions-fr';
import type {
	DifferentiationBindings,
	PedagogicalDifferentiationOptions,
	PedagogicalDifferentiationResult,
	PedagogicalDifferentiationRule,
	PedagogicalDifferentiationStep
} from './types';

// =============================================================================
// Internal context (passed through recursive calls)
// =============================================================================

interface DispatchContext {
	readonly variable: string;
	readonly simplify: boolean;
	readonly signal?: AbortSignal;
	readonly startTime: number;
	readonly timeoutMs?: number;
	/** Mutable holder for the next step ID — shared across the recursion. */
	readonly idGen: { next: number };
}

function createContext(options: PedagogicalDifferentiationOptions): DispatchContext {
	return {
		variable: options.variable,
		simplify: true,
		signal: options.signal,
		startTime: Date.now(),
		timeoutMs: options.timeoutMs,
		idGen: { next: 1 }
	};
}

function checkAbort(ctx: DispatchContext): void {
	if (ctx.signal?.aborted) {
		throw new DOMException('Aborted', 'AbortError');
	}
	if (ctx.timeoutMs !== undefined && Date.now() - ctx.startTime > ctx.timeoutMs) {
		throw new DOMException('Timeout', 'TimeoutError');
	}
}

function nextId(ctx: DispatchContext): number {
	return ctx.idGen.next++;
}

// =============================================================================
// Step builder helpers
// =============================================================================

interface BuildStepInput {
	readonly rule: PedagogicalDifferentiationRule;
	readonly before: MathNode;
	readonly after: MathNode;
	readonly variable: string;
	readonly bindings?: DifferentiationBindings;
	readonly globalBefore?: MathNode;
	readonly globalAfter?: MathNode;
	readonly subSteps?: readonly PedagogicalDifferentiationStep[];
	readonly description?: string;
}

function buildStep(ctx: DispatchContext, input: BuildStepInput): PedagogicalDifferentiationStep {
	return {
		id: nextId(ctx),
		rule: input.rule,
		description: input.description ?? getDefaultDescription(input.rule),
		before: input.before,
		after: input.after,
		variable: input.variable,
		verbosityLevel: 'summarized',
		bindings: input.bindings,
		globalBefore: input.globalBefore,
		globalAfter: input.globalAfter,
		subSteps: input.subSteps && input.subSteps.length > 0 ? input.subSteps : undefined
	};
}

// =============================================================================
// Trivial node detection
// =============================================================================

/**
 * A node is "trivial-with-respect-to-variable" when its derivative is either
 * `0` (the node is constant w.r.t. the variable) or `1` (the node IS the
 * variable). Those derivations are computed inline by recursive callers and
 * never emit steps — except at the very top level (handled separately).
 */
export function isTrivialWrtVariable(node: MathNode, variable: string): boolean {
	if (node.type === 'number' || node.type === 'symbol' || node.type === 'hole') {
		return true;
	}
	if (node.type === 'variable') {
		return true; // Either matches (→ 1) or doesn't (→ 0); both trivial.
	}
	if (node.type === 'greek') {
		return true;
	}
	if (node.type === 'subscript') {
		return true; // Treated as constants (e.g. `x_1` is a parameter, not a variable).
	}
	if (node.type === 'constant') {
		return true;
	}
	return !containsVariable(node, variable);
}

/**
 * Pick the trivial rule name for a node when emitted at top-level. Caller
 * guarantees `isTrivialWrtVariable(node, variable)` is true.
 */
function trivialRuleFor(node: MathNode): PedagogicalDifferentiationRule {
	if (node.type === 'variable') return 'variable';
	if (node.type === 'greek') return 'greek-letter';
	return 'constant';
}

/**
 * Inline derivation for a trivial node. Returns the derivative directly with
 * no recorded steps — used by recursive callers for sub-expressions.
 */
function inlineDifferentiateTrivial(node: MathNode, variable: string): MathNode {
	if (node.type === 'variable') return variableRule(node.name, variable);
	if (node.type === 'greek') return greekLetterRule(node.letter, variable);
	return constantRule();
}

/**
 * Strip leading transparent wrappers (`positive`, `delimiter`) so the public
 * entry point can classify the underlying expression as trivial when it is
 * (e.g. `(x)`, `+x`, `((x))`). The dispatcher's recursive passes use these
 * wrappers as no-op passthroughs, but at the very top level we'd otherwise
 * emit zero steps for an obviously trivial input.
 */
function unwrapTransparent(node: MathNode): MathNode {
	let n = node;
	while (n.type === 'positive' || n.type === 'delimiter') {
		n = n.type === 'positive' ? n.operand : n.content;
	}
	return n;
}

/**
 * True iff differentiating `node` w.r.t. `variable` produces a non-zero
 * result. Used by the binary dispatchers (sum, product, …) to decide which
 * operand actually contributes to the derivative — distinct from
 * `containsVariable`, which over-reports for subscripted parameters
 * (`containsVariable(x_1, 'x') === true` even though `(x_1)' = 0`).
 *
 * Decision rule:
 * - Trivial atomic node: depends iff the node IS the differentiation variable
 *   (variable / greek-letter matching). Subscripts, numbers, constants etc.
 *   are atomic-but-non-dependent.
 * - Non-trivial compound node: defers to `containsVariable`. The remaining
 *   edge case (a non-trivial expression whose only occurrence of the variable
 *   is inside a subscript, e.g. `(x_1)^2`) over-reports here, but the worst
 *   outcome is a slightly less-tidy step label — the derivative still
 *   computes correctly via the underlying rules.
 */
function dependsOnDiffVariable(node: MathNode, variable: string): boolean {
	if (isTrivialWrtVariable(node, variable)) {
		if (node.type === 'variable') return node.name === variable;
		if (node.type === 'greek') return node.letter === variable;
		return false;
	}
	return containsVariable(node, variable);
}

// =============================================================================
// Internal recursive dispatcher
// =============================================================================

/**
 * Result of a sub-derivation: the symbolic derivative AND the recorded steps
 * for this branch of the recursion (one top-level step whose `subSteps`
 * capture sub-derivations, when applicable).
 *
 * Trivial operand sub-derivations do NOT push steps: they are computed
 * inline and absent from the returned `steps` array. Only meaningful rules
 * (sum, product, power, sin, …) emit steps.
 */
interface DispatchResult {
	readonly derivative: MathNode;
	readonly steps: readonly PedagogicalDifferentiationStep[];
}

/**
 * Internal recursive dispatcher.
 *
 * Phase status (see docs/wip/differentiation-stepper-progress.md):
 * - Phase 2a: triviae + linearity + linear-coefficient (this commit)
 * - Phase 2b–2f: powers, product/quotient, trig, exp/log, hyperbolic.
 * Branches not yet implemented throw `PedagogicalDifferentiationNotImplemented`.
 */
export function differentiateNode(node: MathNode, ctx: DispatchContext): DispatchResult {
	checkAbort(ctx);

	if (isTrivialWrtVariable(node, ctx.variable)) {
		return {
			derivative: inlineDifferentiateTrivial(node, ctx.variable),
			steps: []
		};
	}

	switch (node.type) {
		case 'addition':
			return dispatchAddition(node, ctx);
		case 'subtraction':
			return dispatchSubtraction(node, ctx);
		case 'multiplication':
			return dispatchMultiplication(node, ctx);
		case 'division':
			return dispatchDivision(node, ctx);
		case 'opposite':
			return dispatchOpposite(node, ctx);
		case 'positive':
			return dispatchPositive(node, ctx);
		case 'delimiter':
			return dispatchDelimiter(node, ctx);
		case 'superscript':
			return dispatchSuperscript(node, ctx);
		case 'function':
			return dispatchFunction(node, ctx);
		default:
			throw new PedagogicalDifferentiationNotImplemented(node.type);
	}
}

// =============================================================================
// Predicate helpers
// =============================================================================

/**
 * True iff `node` is exactly the differentiation variable (not a subscripted
 * or wrapped form). Used to detect the cleanest pedagogical special cases:
 * `x^n` with the same x, `√x`, `1/x`, etc.
 */
function isExactVariable(node: MathNode, variable: string): boolean {
	return node.type === 'variable' && node.name === variable;
}

/**
 * True iff `node` is a non-negative integer literal greater than or equal to
 * `min`. The classroom power rule `(x^n)' = n·x^(n-1)` is most legible when n
 * is a small natural number; we use this predicate to gate the
 * `power-natural` shortcut.
 */
function isNaturalIntegerAtLeast(node: MathNode, min: number): boolean {
	if (node.type !== 'number') return false;
	const v = parseFloat(node.value);
	return Number.isFinite(v) && Number.isInteger(v) && v >= min;
}

// =============================================================================
// Phase 2a — Linearity dispatchers
// =============================================================================

/**
 * Addition dispatcher: `(f + g)' = f' + g'`.
 *
 * Two pedagogical paths:
 * - **Both operands depend on the variable** → `sum` rule (regular).
 * - **Exactly one operand depends on the variable** → `sum-with-constant`
 *   special case: the constant has derivative 0 and is silently elided, so the
 *   student sees `(f + c)' = f'` directly without a noisy `+ 0` term.
 *
 * The trivial-everything case (`5 + 7`) is intercepted at the top of
 * `differentiateNode` (it qualifies as `isTrivialWrtVariable`) — we never
 * land here.
 */
function dispatchAddition(node: AdditionNode, ctx: DispatchContext): DispatchResult {
	const left = node.left;
	const right = node.right;
	const leftHasVar = dependsOnDiffVariable(left, ctx.variable);
	const rightHasVar = dependsOnDiffVariable(right, ctx.variable);

	if (leftHasVar && rightHasVar) {
		const fSub = differentiateNode(left, ctx);
		const gSub = differentiateNode(right, ctx);
		const derivative = sumRule(fSub.derivative, gSub.derivative, ctx.simplify);
		const subSteps = [...fSub.steps, ...gSub.steps];
		const step = buildStep(ctx, {
			rule: 'sum',
			before: node,
			after: derivative,
			variable: ctx.variable,
			bindings: { f: left, g: right },
			subSteps
		});
		return { derivative, steps: [step] };
	}

	// Only one operand carries the variable — the other is constant.
	const variablePart = leftHasVar ? left : right;
	const constantPart = leftHasVar ? right : left;
	const sub = differentiateNode(variablePart, ctx);
	const derivative = sub.derivative; // (f + c)' = f'
	const step = buildStep(ctx, {
		rule: 'sum-with-constant',
		before: node,
		after: derivative,
		variable: ctx.variable,
		bindings: { f: variablePart, c: constantPart },
		subSteps: sub.steps
	});
	return { derivative, steps: [step] };
}

/**
 * Subtraction dispatcher: `(f - g)' = f' - g'`.
 *
 * Pedagogical handling mirrors `dispatchAddition`. For `(c - f)'` we still
 * return a `diff-with-constant` step but the resulting derivative is `-f'`
 * rather than `f'`.
 */
function dispatchSubtraction(node: SubtractionNode, ctx: DispatchContext): DispatchResult {
	const left = node.left;
	const right = node.right;
	const leftHasVar = dependsOnDiffVariable(left, ctx.variable);
	const rightHasVar = dependsOnDiffVariable(right, ctx.variable);

	if (leftHasVar && rightHasVar) {
		const fSub = differentiateNode(left, ctx);
		const gSub = differentiateNode(right, ctx);
		const derivative = differenceRule(fSub.derivative, gSub.derivative, ctx.simplify);
		const subSteps = [...fSub.steps, ...gSub.steps];
		const step = buildStep(ctx, {
			rule: 'difference',
			before: node,
			after: derivative,
			variable: ctx.variable,
			bindings: { f: left, g: right },
			subSteps
		});
		return { derivative, steps: [step] };
	}

	if (leftHasVar) {
		// (f - c)' = f'
		const fSub = differentiateNode(left, ctx);
		const derivative = fSub.derivative;
		const step = buildStep(ctx, {
			rule: 'diff-with-constant',
			before: node,
			after: derivative,
			variable: ctx.variable,
			bindings: { f: left, c: right },
			subSteps: fSub.steps
		});
		return { derivative, steps: [step] };
	}

	// (c - f)' = -f'
	const fSub = differentiateNode(right, ctx);
	const derivative = negationRule(fSub.derivative, ctx.simplify);
	const step = buildStep(ctx, {
		rule: 'diff-with-constant',
		before: node,
		after: derivative,
		variable: ctx.variable,
		bindings: { f: right, c: left },
		subSteps: fSub.steps
	});
	return { derivative, steps: [step] };
}

/**
 * Multiplication dispatcher.
 *
 * Two pedagogical paths:
 * - **`linear-coefficient`** — when one operand is constant w.r.t. the
 *   variable, `(c · f)' = c · f'`. Cleaner for the student than running the
 *   product rule with a derivative-zero factor.
 * - **`product`** — both operands depend on the variable: `(uv)' = u'v + uv'`.
 */
function dispatchMultiplication(node: MultiplicationNode, ctx: DispatchContext): DispatchResult {
	const left = node.left;
	const right = node.right;
	const leftHasVar = dependsOnDiffVariable(left, ctx.variable);
	const rightHasVar = dependsOnDiffVariable(right, ctx.variable);

	if (leftHasVar && rightHasVar) {
		const uSub = differentiateNode(left, ctx);
		const vSub = differentiateNode(right, ctx);
		const derivative = productRule(left, right, uSub.derivative, vSub.derivative, ctx.simplify);
		const step = buildStep(ctx, {
			rule: 'product',
			before: node,
			after: derivative,
			variable: ctx.variable,
			bindings: { u: left, v: right },
			subSteps: [...uSub.steps, ...vSub.steps]
		});
		return { derivative, steps: [step] };
	}

	const variablePart = leftHasVar ? left : right;
	const constantPart = leftHasVar ? right : left;

	// Degenerate constants: `0 · f` derives to 0 (the whole thing is constant
	// w.r.t. the variable — caught by isTrivialWrtVariable for top-level, but
	// can survive here as a sub-expression). `1 · f` reduces to `f`, so the
	// pedagogical "On sort la constante 1" step is silly. In both cases, fall
	// through to a plain product step (subSteps unchanged) so the trace stays
	// faithful without an absurd label.
	if (isZero(constantPart) || isOne(constantPart)) {
		const sub = differentiateNode(variablePart, ctx);
		const derivative = simplifiedMultiply(constantPart, sub.derivative);
		const step = buildStep(ctx, {
			rule: 'product',
			before: node,
			after: derivative,
			variable: ctx.variable,
			bindings: { u: left, v: right },
			subSteps: sub.steps
		});
		return { derivative, steps: [step] };
	}

	const sub = differentiateNode(variablePart, ctx);
	const derivative = simplifiedMultiply(constantPart, sub.derivative);
	const step = buildStep(ctx, {
		rule: 'linear-coefficient',
		before: node,
		after: derivative,
		variable: ctx.variable,
		bindings: { c: constantPart, f: variablePart },
		subSteps: sub.steps
	});
	return { derivative, steps: [step] };
}

/**
 * Division dispatcher: `(u/v)'`.
 *
 * Pedagogical paths in order of priority:
 * 1. **`derivative-of-inverse`** — `1/x` (numerator is `1`, denominator is the
 *    differentiation variable exactly). Most common reciprocal at the lycée.
 * 2. **`inverse`** — `1/f(x)` (numerator is `1`, denominator is some compound
 *    function). Yields `-f'/f²` directly without dragging in the full
 *    quotient rule.
 * 3. **`linear-coefficient`** — `f(x)/c` with constant denominator. Reads the
 *    division as `(1/c) · f(x)` so the student sees `(f/c)' = f'/c` directly,
 *    rather than the verbose general quotient `(f'·c − f·0)/c²`.
 * 4. **`quotient`** — general `u/v` when both depend on the variable, or for
 *    a constant numerator ≠ 1 (e.g. `5/x` falls here).
 */
function dispatchDivision(node: DivisionNode, ctx: DispatchContext): DispatchResult {
	const num = node.numerator;
	const denom = node.denominator;
	const numHasVar = dependsOnDiffVariable(num, ctx.variable);
	const denomHasVar = dependsOnDiffVariable(denom, ctx.variable);

	if (!numHasVar && denomHasVar && isOne(num)) {
		// Reciprocal: numerator = 1.
		if (isExactVariable(denom, ctx.variable)) {
			// (1/x)' = -1/x²
			const derivative = quotientRule(num, denom, zero(), one(), ctx.simplify);
			const step = buildStep(ctx, {
				rule: 'derivative-of-inverse',
				before: node,
				after: derivative,
				variable: ctx.variable
			});
			return { derivative, steps: [step] };
		}
		// (1/f)' = -f'/f²
		const denomSub = differentiateNode(denom, ctx);
		const derivative = quotientRule(num, denom, zero(), denomSub.derivative, ctx.simplify);
		const step = buildStep(ctx, {
			rule: 'inverse',
			before: node,
			after: derivative,
			variable: ctx.variable,
			bindings: { f: denom },
			subSteps: denomSub.steps
		});
		return { derivative, steps: [step] };
	}

	if (numHasVar && !denomHasVar) {
		// (f/c)' = f'/c — pedagogically a constant multiplicative coefficient
		// `1/c` factored out of the differentiation. The binding reads as
		// `c = 1/<denom>` so descriptions render "On sort la constante 1/c".
		const numSub = differentiateNode(num, ctx);
		const inverseDenom = simplifiedDivide(one(), denom);
		const derivative = simplifiedDivide(numSub.derivative, denom);
		const step = buildStep(ctx, {
			rule: 'linear-coefficient',
			before: node,
			after: derivative,
			variable: ctx.variable,
			bindings: { c: inverseDenom, f: num },
			subSteps: numSub.steps
		});
		return { derivative, steps: [step] };
	}

	// General quotient (u/v)' = (u'v - uv') / v².
	const numSub = numHasVar ? differentiateNode(num, ctx) : { derivative: zero(), steps: [] };
	const denomSub = denomHasVar ? differentiateNode(denom, ctx) : { derivative: zero(), steps: [] };
	const derivative = quotientRule(num, denom, numSub.derivative, denomSub.derivative, ctx.simplify);
	const step = buildStep(ctx, {
		rule: 'quotient',
		before: node,
		after: derivative,
		variable: ctx.variable,
		bindings: { u: num, v: denom },
		subSteps: [...numSub.steps, ...denomSub.steps]
	});
	return { derivative, steps: [step] };
}

/**
 * Negation dispatcher: `(-f)' = -f'`.
 */
function dispatchOpposite(node: OppositeNode, ctx: DispatchContext): DispatchResult {
	const sub = differentiateNode(node.operand, ctx);
	const derivative = negationRule(sub.derivative, ctx.simplify);
	const step = buildStep(ctx, {
		rule: 'negation',
		before: node,
		after: derivative,
		variable: ctx.variable,
		bindings: { f: node.operand },
		subSteps: sub.steps
	});
	return { derivative, steps: [step] };
}

/**
 * Unary plus passthrough: `(+f)' = f'`. No step emitted — the unary plus
 * carries no pedagogical content of its own.
 */
function dispatchPositive(node: PositiveNode, ctx: DispatchContext): DispatchResult {
	return differentiateNode(node.operand, ctx);
}

/**
 * Parenthesis passthrough: `((f))' = f'`. No step emitted.
 */
function dispatchDelimiter(node: DelimiterNode, ctx: DispatchContext): DispatchResult {
	return differentiateNode(node.content, ctx);
}

// =============================================================================
// Phase 2b — Power dispatcher (and the sqrt subset of `function`)
// =============================================================================

/**
 * Superscript dispatcher: `f(x)^g(x)`.
 *
 * Four pedagogical paths, ordered by specificity:
 * 1. **`power-natural`** — base is exactly the differentiation variable AND
 *    exponent is a natural integer ≥ 2. Yields the classroom-friendly
 *    `(xⁿ)' = nxⁿ⁻¹` form without dragging the chain rule along.
 * 2. **`power-constant-exp`** — exponent is constant w.r.t. the variable but
 *    base is some compound function. Triggers chain rule via `dBase`.
 * 3. **`power-constant-base`** — base is constant, exponent depends on the
 *    variable: `(c^g)' = c^g · ln(c) · g'` (uses `generalPowerRule` with
 *    `dBase = 0`).
 * 4. **`general-power`** — both base and exponent depend on the variable.
 */
function dispatchSuperscript(node: SuperscriptNode, ctx: DispatchContext): DispatchResult {
	const base = node.base;
	const exp = node.superscript;
	const baseHasVar = dependsOnDiffVariable(base, ctx.variable);
	const expHasVar = dependsOnDiffVariable(exp, ctx.variable);

	// Constant base, constant exponent → caught by the trivial fast path.

	if (!expHasVar && baseHasVar) {
		// Path 1: clean (xⁿ)' shortcut.
		if (isExactVariable(base, ctx.variable) && isNaturalIntegerAtLeast(exp, 2)) {
			const derivative = powerRuleConstantExp(base, exp, one(), ctx.simplify);
			const step = buildStep(ctx, {
				rule: 'power-natural',
				before: node,
				after: derivative,
				variable: ctx.variable,
				bindings: { base, n: exp }
			});
			return { derivative, steps: [step] };
		}

		// Path 2: general (f^c)' with chain.
		const baseSub = differentiateNode(base, ctx);
		const derivative = powerRuleConstantExp(base, exp, baseSub.derivative, ctx.simplify);
		const step = buildStep(ctx, {
			rule: 'power-constant-exp',
			before: node,
			after: derivative,
			variable: ctx.variable,
			bindings: { base, exp },
			subSteps: baseSub.steps
		});
		return { derivative, steps: [step] };
	}

	if (!baseHasVar && expHasVar) {
		// Path 3: (c^g)' = c^g · ln(c) · g'.
		const expSub = differentiateNode(exp, ctx);
		const derivative = generalPowerRule(base, exp, zero(), expSub.derivative, ctx.simplify);
		const step = buildStep(ctx, {
			rule: 'power-constant-base',
			before: node,
			after: derivative,
			variable: ctx.variable,
			bindings: { base, exp },
			subSteps: expSub.steps
		});
		return { derivative, steps: [step] };
	}

	// Path 4: general power, both depend on variable.
	const baseSub = differentiateNode(base, ctx);
	const expSub = differentiateNode(exp, ctx);
	const derivative = generalPowerRule(
		base,
		exp,
		baseSub.derivative,
		expSub.derivative,
		ctx.simplify
	);
	const step = buildStep(ctx, {
		rule: 'general-power',
		before: node,
		after: derivative,
		variable: ctx.variable,
		bindings: { base, exp },
		subSteps: [...baseSub.steps, ...expSub.steps]
	});
	return { derivative, steps: [step] };
}

/**
 * Dispatcher for `function` nodes (sin, cos, exp, ln, sqrt, …).
 *
 * Each phase contributes its own family:
 * - Phase 2b: `sqrt` (this commit)
 * - Phase 2d: `sin`, `cos`, `tan`, `arcsin`, `arccos`, `arctan`
 * - Phase 2e: `exp`, `ln`, `log`
 * - Phase 2f: `sinh`, `cosh`, `tanh`, `asinh`, `acosh`, `atanh`
 *
 * Functions whose handler is not yet wired throw
 * `PedagogicalDifferentiationNotImplemented`.
 */
function dispatchFunction(node: FunctionNode, ctx: DispatchContext): DispatchResult {
	// `f^{-1}(x)` (functional inverse) is out of V1 scope — refuse explicitly so
	// the caller can fall back to Mode A rather than receive a wrong derivative.
	if (node.isInverse) {
		throw new PedagogicalDifferentiationNotImplemented(`inverse function "${node.name}^{-1}"`);
	}
	// `\sin^2(x)`, `\cos^3(x)`, … parse as a function with `power` set, NOT as
	// a superscript of the function. Pedagogically these are powers of a
	// function, so reroute through `dispatchSuperscript` with a power-less
	// inner function as the base.
	if (node.power !== undefined) {
		const innerFunction: FunctionNode = { ...node, power: undefined };
		const asPower: SuperscriptNode = power(innerFunction, node.power);
		return dispatchSuperscript(asPower, ctx);
	}

	// `f''(x)` (derivative-of-derivative) — also out of V1 scope.
	if (node.derivativeOrder !== undefined && node.derivativeOrder > 0) {
		throw new PedagogicalDifferentiationNotImplemented(
			`derivative function "${node.name}^(${node.derivativeOrder})"`
		);
	}

	const name = node.name.toLowerCase();
	switch (name) {
		case 'sqrt':
			return dispatchSqrt(node, ctx);
		// Phase 2d — trigonometric.
		case 'sin':
			return dispatchUnaryFunction(node, ctx, 'sin', sinRule);
		case 'cos':
			return dispatchUnaryFunction(node, ctx, 'cos', cosRule);
		case 'tan':
			return dispatchUnaryFunction(node, ctx, 'tan', tanRule);
		case 'arcsin':
		case 'asin':
			return dispatchUnaryFunction(node, ctx, 'arcsin', arcsinRule);
		case 'arccos':
		case 'acos':
			return dispatchUnaryFunction(node, ctx, 'arccos', arccosRule);
		case 'arctan':
		case 'atan':
			return dispatchUnaryFunction(node, ctx, 'arctan', arctanRule);
		// Phase 2e — exponential / logarithm.
		case 'exp':
			return dispatchUnaryFunction(node, ctx, 'exp', expRule);
		case 'ln':
			return dispatchUnaryFunction(node, ctx, 'ln', lnRule);
		case 'log':
			return dispatchLog(node, ctx);
		// Phase 2f — hyperbolic.
		case 'sinh':
			return dispatchUnaryFunction(node, ctx, 'sinh', sinhRule);
		case 'cosh':
			return dispatchUnaryFunction(node, ctx, 'cosh', coshRule);
		case 'tanh':
			return dispatchUnaryFunction(node, ctx, 'tanh', tanhRule);
		case 'arcsinh':
		case 'asinh':
			return dispatchUnaryFunction(node, ctx, 'asinh', asinhRule);
		case 'arccosh':
		case 'acosh':
			return dispatchUnaryFunction(node, ctx, 'acosh', acoshRule);
		case 'arctanh':
		case 'atanh':
			return dispatchUnaryFunction(node, ctx, 'atanh', atanhRule);
		default:
			throw new PedagogicalDifferentiationNotImplemented(`function "${node.name}"`);
	}
}

/**
 * `log` dispatcher — base-aware: `log_b(u)' = u' / (u · ln(b))`. The
 * underlying `logRule` takes the base as an extra argument; we read it from
 * `node.base` and default to base 10 (matching the algorithmic
 * `differentiate.ts` convention).
 */
function dispatchLog(node: FunctionNode, ctx: DispatchContext): DispatchResult {
	if (node.args.length !== 1) {
		throw new PedagogicalDifferentiationNotImplemented(`log with ${node.args.length} args`);
	}
	const u = node.args[0];
	const base = node.base ?? number('10');
	const sub = differentiateNode(u, ctx);
	const derivative = logRule(u, base, sub.derivative, ctx.simplify);
	const step = buildStep(ctx, {
		rule: 'log',
		before: node,
		after: derivative,
		variable: ctx.variable,
		bindings: { u, base },
		subSteps: sub.steps
	});
	return { derivative, steps: [step] };
}

/**
 * Generic dispatcher for a unary transcendental function whose pedagogical
 * step shape is uniform: emit a single step labelled by `rule`, recurse on
 * the argument, apply the underlying calculation rule.
 *
 * Used by every Phase 2d–2f function except `sqrt` (which has its own
 * `derivative-of-sqrt` shortcut and lives in Phase 2b).
 */
function dispatchUnaryFunction(
	node: FunctionNode,
	ctx: DispatchContext,
	rule: PedagogicalDifferentiationRule,
	ruleFn: (u: MathNode, du: MathNode, simplify: boolean) => MathNode
): DispatchResult {
	if (node.args.length !== 1) {
		throw new PedagogicalDifferentiationNotImplemented(
			`${node.name} with ${node.args.length} args`
		);
	}
	const arg = node.args[0];
	const sub = differentiateNode(arg, ctx);
	const derivative = ruleFn(arg, sub.derivative, ctx.simplify);
	const step = buildStep(ctx, {
		rule,
		before: node,
		after: derivative,
		variable: ctx.variable,
		bindings: { u: arg },
		subSteps: sub.steps
	});
	return { derivative, steps: [step] };
}

/**
 * `sqrt(u)'` — split into two pedagogical cases:
 * - Argument is exactly the differentiation variable (`√x`) → terminal
 *   shortcut `derivative-of-sqrt` with no inner step.
 * - Otherwise (`√(f(x))`) → `sqrt` rule with chain implicit via the
 *   recursive sub-derivation.
 */
function dispatchSqrt(node: FunctionNode, ctx: DispatchContext): DispatchResult {
	if (node.args.length !== 1) {
		throw new PedagogicalDifferentiationNotImplemented(`sqrt with ${node.args.length} args`);
	}
	const arg = node.args[0];

	if (isExactVariable(arg, ctx.variable)) {
		const derivative = sqrtRule(arg, one(), ctx.simplify);
		const step = buildStep(ctx, {
			rule: 'derivative-of-sqrt',
			before: node,
			after: derivative,
			variable: ctx.variable
		});
		return { derivative, steps: [step] };
	}

	const sub = differentiateNode(arg, ctx);
	const derivative = sqrtRule(arg, sub.derivative, ctx.simplify);
	const step = buildStep(ctx, {
		rule: 'sqrt',
		before: node,
		after: derivative,
		variable: ctx.variable,
		bindings: { u: arg },
		subSteps: sub.steps
	});
	return { derivative, steps: [step] };
}

// =============================================================================
// Errors
// =============================================================================

/**
 * Thrown when the dispatcher hits a node type whose pedagogical handler has
 * not yet been implemented. Surfaces during Phase 1 development; will be
 * eliminated by Phase 2f.
 */
export class PedagogicalDifferentiationNotImplemented extends Error {
	constructor(public readonly nodeType: string) {
		super(
			`Pedagogical differentiation not yet implemented for node type "${nodeType}". ` +
				`Implementation arrives in Phase 2 (see docs/wip/differentiation-stepper-progress.md).`
		);
		this.name = 'PedagogicalDifferentiationNotImplemented';
	}
}

// =============================================================================
// Public entry point
// =============================================================================

/**
 * Generate pedagogical steps for differentiating `node` with respect to
 * `options.variable`.
 *
 * @example
 * ```typescript
 * const node = parseLatex('x^3 + 2x^2');
 * const result = generatePedagogicalDifferentiationSteps(node, {
 *   variable: 'x',
 *   schoolLevel: 'lycee'
 * });
 * console.log(result.steps);  // tree of pedagogical steps
 * console.log(result.derivative);  // the symbolic derivative
 * ```
 */
export function generatePedagogicalDifferentiationSteps(
	node: MathNode,
	options: PedagogicalDifferentiationOptions
): PedagogicalDifferentiationResult {
	const ctx = createContext(options);

	// Top-level case: classify after stripping transparent wrappers
	// (`+x`, `(x)`, `((+x))` all collapse to a trivial step). The original
	// `node` is preserved on the step's `before`/`globalBefore` so the
	// rendered LaTeX shows what the author wrote.
	const unwrapped = unwrapTransparent(node);
	if (isTrivialWrtVariable(unwrapped, ctx.variable)) {
		const derivative = inlineDifferentiateTrivial(unwrapped, ctx.variable);
		const rule = trivialRuleFor(unwrapped);
		const step = buildStep(ctx, {
			rule,
			before: node,
			after: derivative,
			variable: ctx.variable,
			globalBefore: node,
			globalAfter: derivative
		});
		return { derivative, steps: [step] };
	}

	// Non-trivial: delegate to the recursive dispatcher.
	const { derivative, steps } = differentiateNode(node, ctx);
	return { derivative, steps };
}
