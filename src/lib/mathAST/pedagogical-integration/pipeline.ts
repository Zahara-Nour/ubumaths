/**
 * Pedagogical Integration — Pipeline Orchestrator
 *
 * `generatePedagogicalIntegrationSteps(integrand, options)` is the high-level
 * entry point. It dispatches on the structure of the integrand in priority
 * order, announcing each pedagogical rule (as a top-level step) BEFORE
 * recursing into operands (sub-steps) — distinct from the algorithmic
 * `integrate.ts` whose step trace is implementation-driven.
 *
 * Strategy :
 *
 * 1. The PUBLIC entry point resolves the integration variable (auto-detected
 *    via `detectVariable()` if not given), builds a `DispatchContext`, and
 *    dispatches between the indefinite path (recursive `integrateNode`) and
 *    the definite path (which wraps the indefinite result with the
 *    fundamental-theorem step trio: `apply-fundamental-theorem`,
 *    `substitute-bounds`, `simplify-bounds-result`).
 *
 * 2. The indefinite path tries dispatchers in priority order :
 *    constant → power-rule → reciprocal (1/x) → known primitive →
 *    composite forms (u'·e^u, u'/u, u'·sin/cos(u), u'·u^n) →
 *    linearity (sums) → constant extraction → u-substitution (sup) →
 *    integration by parts (lycée Tle spé + sup) → throw NotImplemented.
 *
 *    The composite forms are detected BEFORE generic u-substitution because
 *    the lycée-style « reconnaissance de dérivée composée » is the standard
 *    pedagogical move in Tle spé maths. The « bare » variants (e.g.
 *    `sin(2x)` without the leading `2·`) are handled by the same composite
 *    detectors via an implicit `1/u'` rebalancing factor.
 *
 * 3. Underlying calculations (`powerRule`, `expRule`, `sinRule`, …) are
 *    delegated to `integration/rules.ts` — we don't reimplement primitive
 *    formulas, only their orchestration.
 *
 * @module mathAST/pedagogical-integration/pipeline
 */

import type { MathNode } from '../types';
import { cos, number, opposite, sin, subtract, variable as variableNode } from '../factory';
import { detectVariable } from '../integration/classify';
import { cosRule, expRule, lnAbsRule, powerRule, sinRule, tanRule } from '../integration/rules';
import { differentiate } from '../differentiation';
import { evaluate } from '../eval/evaluate';
import { isEvalValue } from '../eval/types';
import { denormalize, normalize } from '../normal';
import {
	simplifiedAdd,
	simplifiedDivide,
	simplifiedMultiply,
	simplifiedPower
} from '../common/simplify';
import { numericNode } from '../common/numeric';
import {
	buildStep,
	checkAbort,
	containsVariable,
	createContext,
	flattenSum,
	isCyclicIppPattern,
	isExactVariable,
	isReciprocalOfVariable,
	matchArcsinForm,
	matchArctanForm,
	matchKnownPrimitive,
	matchPowerOfVariable,
	pickExpFactor,
	pickTrigFactor,
	tryDetectComposite,
	tryDetectPartialFractions,
	tryDetectParts,
	tryExtractConstant,
	unwrapSign,
	withDeeperRecursion
} from './_helpers';
import type {
	CompositeMatch,
	DispatchContext,
	PartialFractionsMatch,
	PartsMatch
} from './_helpers';
import { abs, ln } from '../factory';
import { findProportionalityConstant } from '../integration/patterns';
import { arcsinRule, arctanRule } from '../integration/rules';
import { PedagogicalIntegrationNotImplemented } from './types';
import type {
	IntegrationBindings,
	PedagogicalIntegrationOptions,
	PedagogicalIntegrationResult,
	PedagogicalIntegrationStep
} from './types';

// =============================================================================
// Public entry point
// =============================================================================

/**
 * Generate pedagogical steps for integrating `integrand` with respect to
 * `options.variable` (or auto-detected if omitted).
 *
 * Indefinite by default ; pass `options.definite = { lower, upper }` to
 * compute the definite integral with the fundamental-theorem step trio.
 *
 * @example
 * ```typescript
 * // ∫(3x² + 2x + 1) dx
 * const integrand = parseLatex('3x^2 + 2x + 1');
 * const result = generatePedagogicalIntegrationSteps(integrand, {
 *   level: 'lycee'
 * });
 * console.log(result.antiderivative); // x^3 + x^2 + x
 * console.log(result.steps);          // [linearity, power-rule x3, +C]
 *
 * // ∫_0^1 e^x dx
 * const exp = parseLatex('e^x');
 * const definite = generatePedagogicalIntegrationSteps(exp, {
 *   level: 'lycee',
 *   definite: { lower: number('0'), upper: number('1') }
 * });
 * console.log(definite.value); // e - 1
 * ```
 */
export function generatePedagogicalIntegrationSteps(
	integrand: MathNode,
	options: PedagogicalIntegrationOptions
): PedagogicalIntegrationResult {
	const resolvedVariable = options.variable ?? resolveIntegrationVariable(integrand);
	const ctx = createContext(options, resolvedVariable);

	if (options.definite) {
		return generateDefiniteSteps(integrand, ctx, options.definite);
	}
	return generateIndefiniteSteps(integrand, ctx);
}

/**
 * Resolve the integration variable from the integrand. Wraps the algorithmic
 * `detectVariable` and adds a workaround for the « `e^x` parses as
 * `superscript(variable('e'), variable('x'))` » quirk : when detectVariable
 * throws « multiple variables » and one of them is the conventional Euler
 * constant `e`, treat `e` as a constant and pick the other variable.
 */
function resolveIntegrationVariable(integrand: MathNode): string {
	try {
		return detectVariable(integrand) ?? 'x';
	} catch {
		const names = collectVariableNames(integrand);
		const nonEuler = names.filter((n) => n !== 'e');
		if (nonEuler.length === 1) return nonEuler[0];
		if (nonEuler.length === 0) return 'x';
		throw new PedagogicalIntegrationNotImplemented(
			integrand,
			`Multiple integration variables (${names.join(', ')}) — please specify via options.variable`
		);
	}
}

function collectVariableNames(node: MathNode): readonly string[] {
	const out = new Set<string>();
	const walk = (n: MathNode): void => {
		switch (n.type) {
			case 'variable':
				out.add(n.name);
				return;
			case 'addition':
			case 'subtraction':
			case 'multiplication':
				walk(n.left);
				walk(n.right);
				return;
			case 'division':
				walk(n.numerator);
				walk(n.denominator);
				return;
			case 'opposite':
			case 'positive':
				walk(n.operand);
				return;
			case 'delimiter':
				walk(n.content);
				return;
			case 'superscript':
				walk(n.base);
				walk(n.superscript);
				return;
			case 'subscript':
				walk(n.base);
				walk(n.subscript);
				return;
			case 'function':
				n.args.forEach(walk);
				return;
			default:
				return;
		}
	};
	walk(node);
	return Array.from(out);
}

// =============================================================================
// Indefinite & definite top-level
// =============================================================================

function generateIndefiniteSteps(
	integrand: MathNode,
	ctx: DispatchContext
): PedagogicalIntegrationResult {
	const steps: PedagogicalIntegrationStep[] = [];

	if (ctx.strategy.includeIdentify) {
		steps.push(
			buildStep(ctx, {
				rule: 'identify-integrand',
				before: integrand,
				after: integrand,
				variable: ctx.variable
			})
		);
	}

	const { antiderivative, steps: coreSteps } = integrateNode(integrand, ctx);
	steps.push(...coreSteps);

	if (ctx.strategy.includeAddConstant) {
		steps.push(
			buildStep(ctx, {
				rule: 'add-constant',
				before: antiderivative,
				after: antiderivative,
				variable: ctx.variable
			})
		);
	}

	return { antiderivative, steps };
}

function generateDefiniteSteps(
	integrand: MathNode,
	ctx: DispatchContext,
	definite: { readonly lower: MathNode; readonly upper: MathNode }
): PedagogicalIntegrationResult {
	const steps: PedagogicalIntegrationStep[] = [];

	if (ctx.strategy.includeIdentify) {
		steps.push(
			buildStep(ctx, {
				rule: 'identify-definite-integral',
				before: integrand,
				after: integrand,
				variable: ctx.variable,
				definite
			})
		);
	}

	// Compute the antiderivative pedagogically — without `add-constant`
	// (the constant cancels in F(b) - F(a)).
	const { antiderivative, steps: coreSteps } = integrateNode(integrand, ctx);
	steps.push(...coreSteps);

	// Fundamental theorem : ∫_a^b f(x) dx = [F(x)]_a^b.
	steps.push(
		buildStep(ctx, {
			rule: 'apply-fundamental-theorem',
			before: integrand,
			after: antiderivative,
			variable: ctx.variable,
			definite,
			bindings: { primitive: antiderivative }
		})
	);

	// Substitute bounds : [F(x)]_a^b = F(b) - F(a).
	const fAtUpper = substituteVariable(antiderivative, ctx.variable, definite.upper);
	const fAtLower = substituteVariable(antiderivative, ctx.variable, definite.lower);
	const symbolicDifference = subtract(fAtUpper, fAtLower);
	if (ctx.strategy.formatBoundsExplicit) {
		steps.push(
			buildStep(ctx, {
				rule: 'substitute-bounds',
				before: antiderivative,
				after: symbolicDifference,
				variable: ctx.variable,
				definite,
				bindings: { primitive: antiderivative }
			})
		);
	}

	// Simplify F(b) - F(a) into a numeric / closed-form value.
	const value = tryEvaluateExact(symbolicDifference) ?? symbolicDifference;
	steps.push(
		buildStep(ctx, {
			rule: 'simplify-bounds-result',
			before: symbolicDifference,
			after: value,
			variable: ctx.variable,
			definite
		})
	);

	return { antiderivative, value, steps };
}

/**
 * Substitute every occurrence of `variable` in `expr` with `replacement`.
 * Pure structural substitution — no simplification, no evaluation.
 */
function substituteVariable(expr: MathNode, variable: string, replacement: MathNode): MathNode {
	switch (expr.type) {
		case 'variable':
			return expr.name === variable ? replacement : expr;
		case 'number':
		case 'greek':
		case 'symbol':
		case 'hole':
		case 'constant':
		case 'infinity':
			return expr;
		case 'addition':
			return {
				...expr,
				left: substituteVariable(expr.left, variable, replacement),
				right: substituteVariable(expr.right, variable, replacement)
			};
		case 'subtraction':
			return {
				...expr,
				left: substituteVariable(expr.left, variable, replacement),
				right: substituteVariable(expr.right, variable, replacement)
			};
		case 'multiplication':
			return {
				...expr,
				left: substituteVariable(expr.left, variable, replacement),
				right: substituteVariable(expr.right, variable, replacement)
			};
		case 'division':
			return {
				...expr,
				numerator: substituteVariable(expr.numerator, variable, replacement),
				denominator: substituteVariable(expr.denominator, variable, replacement)
			};
		case 'opposite':
			return { ...expr, operand: substituteVariable(expr.operand, variable, replacement) };
		case 'positive':
			return { ...expr, operand: substituteVariable(expr.operand, variable, replacement) };
		case 'delimiter':
			return { ...expr, content: substituteVariable(expr.content, variable, replacement) };
		case 'superscript':
			return {
				...expr,
				base: substituteVariable(expr.base, variable, replacement),
				superscript: substituteVariable(expr.superscript, variable, replacement)
			};
		case 'subscript':
			return {
				...expr,
				base: substituteVariable(expr.base, variable, replacement),
				subscript: substituteVariable(expr.subscript, variable, replacement)
			};
		case 'function':
			return {
				...expr,
				args: expr.args.map((a) => substituteVariable(a, variable, replacement)),
				power: expr.power ? substituteVariable(expr.power, variable, replacement) : undefined,
				base: expr.base ? substituteVariable(expr.base, variable, replacement) : undefined
			};
		default:
			return expr;
	}
}

/**
 * Best-effort exact evaluation. Returns null if the evaluation fails or the
 * result is not a closed-form value we can simplify.
 */
function tryEvaluateExact(expr: MathNode): MathNode | null {
	try {
		const result = evaluate(expr, { mode: 'exact' });
		if (isEvalValue(result)) return result.node;
	} catch {
		/* fall through */
	}
	return null;
}

// =============================================================================
// Recursive dispatcher
// =============================================================================

interface DispatchResult {
	readonly antiderivative: MathNode;
	readonly steps: readonly PedagogicalIntegrationStep[];
}

/**
 * Internal recursive dispatcher.
 *
 * Tries patterns in priority order. The first matching pattern wins. If none
 * match, throws `PedagogicalIntegrationNotImplemented`.
 */
function integrateNode(integrand: MathNode, ctx: DispatchContext): DispatchResult {
	checkAbort(ctx);

	if (ctx.currentDepth >= ctx.maxRecursionDepth) {
		throw new PedagogicalIntegrationNotImplemented(
			integrand,
			`Maximum recursion depth reached (${ctx.maxRecursionDepth}) — likely a cyclic IPP or pathological input.`
		);
	}

	// Strip transparent wrappers (`+x`, `(x)`, `((+x))`).
	const stripped = stripTransparent(integrand);
	if (stripped !== integrand) {
		return integrateNode(stripped, ctx);
	}

	// 1. Constant (no variable).
	if (!containsVariable(integrand, ctx.variable)) {
		return integrateConstant(integrand, ctx);
	}

	// 2. Power of variable: x, x^n.
	const powMatch = matchPowerOfVariable(integrand, ctx.variable);
	if (powMatch) {
		return integratePower(integrand, powMatch.base, powMatch.exp, ctx);
	}
	if (isExactVariable(integrand, ctx.variable)) {
		// `x` alone — apply power rule with n = 1.
		return integratePower(integrand, integrand, number('1'), ctx);
	}

	// 3. Reciprocal of variable: 1/x.
	if (isReciprocalOfVariable(integrand, ctx.variable)) {
		return integrateReciprocalVariable(integrand, ctx);
	}

	// 4. Known primitive applied to bare variable: e^x, sin(x), cos(x), tan(x).
	const knownFn = matchKnownPrimitive(integrand, ctx.variable);
	if (knownFn !== null) {
		return integrateKnownPrimitive(integrand, knownFn, ctx);
	}

	// 4b. Inverse-trig primitives (V1.1+V2, supérieur uniquement) :
	//     `1/(c+x²) → (1/a)·arctan(x/a)` and `1/√(c-x²) → arcsin(x/a)`,
	//     where `a = √c` (a=1 in V1.1 unit case, V2 generalises to any a > 0).
	if (ctx.strategy.enableInverseTrig) {
		const arctanForm = matchArctanForm(integrand, ctx.variable);
		if (arctanForm) {
			return integrateInverseTrig(integrand, 'arctan', arctanForm.a, ctx);
		}
		const arcsinForm = matchArcsinForm(integrand, ctx.variable);
		if (arcsinForm) {
			return integrateInverseTrig(integrand, 'arcsin', arcsinForm.a, ctx);
		}
	}

	// 5. Composite forms (u'·f(u)).
	if (ctx.strategy.enableComposite) {
		const composite = tryDetectComposite(integrand, ctx.variable);
		if (composite) {
			return integrateComposite(integrand, composite, ctx);
		}
	}

	// 6. Sum (linearity).
	if (integrand.type === 'addition' || integrand.type === 'subtraction') {
		return integrateLinearity(integrand, ctx);
	}

	// 6b. Opposite (-f(x)) — pedagogically equivalent to extract-constant with c=-1.
	if (integrand.type === 'opposite') {
		return integrateOpposite(integrand, ctx);
	}

	// 7. Constant × f(x) (extract-constant).
	const constantExtraction = tryExtractConstant(integrand, ctx.variable);
	if (constantExtraction) {
		return integrateExtractConstant(integrand, constantExtraction, ctx);
	}

	// 8. u-substitution explicit (sup).
	//
	// V1 limitation : the dispatcher reaches this branch only when the
	// composite-form detectors above all returned null. In that case the
	// integrand's antiderivative cannot be derived by the four narrative
	// u-sub steps without re-running the algorithmic integrator (out of
	// scope for V1). We therefore short-circuit straight to IPP / throw.
	// The four `identify-substitution` / `compute-du` / `apply-substitution` /
	// `substitute-back` rules remain in the type union for V2 reach.

	// 8b. Partial fractions (V2) — `∫P(x)/Q(x) dx` with Q quadratic, Δ > 0,
	//     deg(P) < 2. Tried after composite-ln (which catches the proportional
	//     case `u'/u`) so the rule firing order remains pedagogically clean :
	//     composite-ln for « u'/u » integrals, partial-fractions only for the
	//     genuinely 2-roots case `1/((x-a)(x-b))`.
	if (ctx.strategy.enablePartialFractions) {
		const partialFracs = tryDetectPartialFractions(integrand, ctx.variable);
		if (partialFracs) {
			return integratePartialFractions(integrand, partialFracs, ctx);
		}
	}

	// 9a. Cyclic IPP (V1.1) — `∫e^(αx)·sin(βx) dx`, `∫e^(αx)·cos(βx) dx`.
	//     MUST be tried BEFORE regular IPP : the LIATE template (Template B
	//     polynomial × transcendental) doesn't match exp×sin (neither factor
	//     is polynomial), so regular IPP would never fire ; but the cyclic
	//     pattern detector handles the case via algebraic resolution.
	if (ctx.strategy.enableCyclicParts && isCyclicIppPattern(integrand, ctx.variable)) {
		return integrateCyclicIPP(integrand, ctx);
	}

	// 9b. Integration by parts (lycée Tle spé + sup).
	if (ctx.strategy.enablePartsSimple) {
		const parts = tryDetectParts(integrand, ctx.variable);
		if (parts) {
			return integrateByParts(integrand, parts, ctx);
		}
	}

	// 10. No match → not implemented.
	throw new PedagogicalIntegrationNotImplemented(integrand);
}

function stripTransparent(node: MathNode): MathNode {
	let n = node;
	while (n.type === 'positive' || n.type === 'delimiter') {
		n = n.type === 'positive' ? n.operand : n.content;
	}
	return n;
}

// =============================================================================
// Branch dispatchers
// =============================================================================

function integrateConstant(integrand: MathNode, ctx: DispatchContext): DispatchResult {
	const antiderivative = simplifiedMultiply(integrand, variableNode(ctx.variable));
	const step = buildStep(ctx, {
		rule: 'apply-constant-rule',
		before: integrand,
		after: antiderivative,
		variable: ctx.variable,
		bindings: { c: integrand }
	});
	return { antiderivative, steps: [step] };
}

function integratePower(
	originalIntegrand: MathNode,
	base: MathNode,
	exp: MathNode,
	ctx: DispatchContext
): DispatchResult {
	const antiderivative = powerRule(base, exp, ctx.variable);
	const step = buildStep(ctx, {
		rule: 'apply-power-rule',
		before: originalIntegrand,
		after: antiderivative,
		variable: ctx.variable,
		bindings: { base, n: exp }
	});
	return { antiderivative, steps: [step] };
}

function integrateReciprocalVariable(integrand: MathNode, ctx: DispatchContext): DispatchResult {
	const antiderivative = lnAbsRule(variableNode(ctx.variable));
	const step = buildStep(ctx, {
		rule: 'apply-known-primitive',
		before: integrand,
		after: antiderivative,
		variable: ctx.variable
	});
	return { antiderivative, steps: [step] };
}

function integrateKnownPrimitive(
	integrand: MathNode,
	fnName: 'exp' | 'sin' | 'cos' | 'tan',
	ctx: DispatchContext
): DispatchResult {
	const arg = variableNode(ctx.variable);
	let antiderivative: MathNode;
	switch (fnName) {
		case 'exp':
			antiderivative = expRule(arg);
			break;
		case 'sin':
			antiderivative = sinRule(arg);
			break;
		case 'cos':
			antiderivative = cosRule(arg);
			break;
		case 'tan':
			antiderivative = tanRule(arg);
			break;
	}
	const step = buildStep(ctx, {
		rule: 'apply-known-primitive',
		before: integrand,
		after: antiderivative,
		variable: ctx.variable
	});
	return { antiderivative, steps: [step] };
}

function integrateComposite(
	integrand: MathNode,
	match: CompositeMatch,
	ctx: DispatchContext
): DispatchResult {
	const u = match.u;
	let baseAntiderivative: MathNode;
	let rule: PedagogicalIntegrationStep['rule'];
	const bindings: IntegrationBindings = { u };

	switch (match.kind) {
		case 'composite-exp':
			baseAntiderivative = expRule(u);
			rule = 'apply-composite-exp';
			break;
		case 'composite-ln':
			baseAntiderivative = lnAbsRule(u);
			rule = 'apply-composite-ln';
			break;
		case 'composite-sin':
			baseAntiderivative = opposite(cos(u));
			rule = 'apply-composite-sin';
			break;
		case 'composite-cos':
			baseAntiderivative = sin(u);
			rule = 'apply-composite-cos';
			break;
		case 'composite-power': {
			if (!match.n) {
				throw new PedagogicalIntegrationNotImplemented(
					integrand,
					'composite-power without exponent'
				);
			}
			const newExp = simplifiedAdd(match.n, number('1'));
			baseAntiderivative = simplifiedDivide(simplifiedPower(u, newExp), newExp);
			rule = 'apply-composite-power';
			bindings.n = match.n;
			break;
		}
	}

	let antiderivative = baseAntiderivative;
	if (match.constantFactor !== undefined && match.constantFactor !== 1) {
		// Expose the rebalancing factor as a multiplicative coefficient. For
		// `∫sin(2x) dx` this is 1/2 ; the renderer can frame this as a
		// composite-with-implicit-rebalancing.
		antiderivative = simplifiedMultiply(numericNode(match.constantFactor), antiderivative);
	}

	const step = buildStep(ctx, {
		rule,
		before: integrand,
		after: antiderivative,
		variable: ctx.variable,
		bindings
	});
	return { antiderivative, steps: [step] };
}

function integrateLinearity(integrand: MathNode, ctx: DispatchContext): DispatchResult {
	const terms = flattenSum(integrand);
	if (terms.length < 2) {
		throw new PedagogicalIntegrationNotImplemented(
			integrand,
			'linearity dispatcher invoked but integrand is not a sum'
		);
	}

	const subSteps: PedagogicalIntegrationStep[] = [];
	const recurCtx = withDeeperRecursion(ctx);
	const antiderivativeParts: { node: MathNode; sign: 1 | -1 }[] = [];

	for (const { term, sign } of terms) {
		const sub = integrateNode(term, recurCtx);
		subSteps.push(...sub.steps);
		antiderivativeParts.push({ node: sub.antiderivative, sign });
	}

	let combined =
		antiderivativeParts[0].sign === 1
			? antiderivativeParts[0].node
			: opposite(antiderivativeParts[0].node);
	for (let i = 1; i < antiderivativeParts.length; i++) {
		const part = antiderivativeParts[i];
		combined = part.sign === 1 ? simplifiedAdd(combined, part.node) : subtract(combined, part.node);
	}

	const step = buildStep(ctx, {
		rule: 'apply-linearity-sum',
		before: integrand,
		after: combined,
		variable: ctx.variable,
		subSteps
	});
	return { antiderivative: combined, steps: [step] };
}

/**
 * Integrate a unary opposite : `∫ -f(x) dx = -∫ f(x) dx`. Pedagogically
 * rendered as an `extract-constant` with c = -1.
 */
function integrateOpposite(
	integrand: MathNode & { type: 'opposite' },
	ctx: DispatchContext
): DispatchResult {
	const recurCtx = withDeeperRecursion(ctx);
	const sub = integrateNode(integrand.operand, recurCtx);
	const antiderivative = opposite(sub.antiderivative);
	const minusOne = opposite(number('1'));
	const step = buildStep(ctx, {
		rule: 'extract-constant',
		before: integrand,
		after: antiderivative,
		variable: ctx.variable,
		bindings: { c: minusOne, f: integrand.operand },
		subSteps: sub.steps
	});
	return { antiderivative, steps: [step] };
}

function integrateExtractConstant(
	integrand: MathNode,
	extraction: { c: MathNode; f: MathNode },
	ctx: DispatchContext
): DispatchResult {
	const recurCtx = withDeeperRecursion(ctx);
	const sub = integrateNode(extraction.f, recurCtx);
	const antiderivative = simplifiedMultiply(extraction.c, sub.antiderivative);

	const step = buildStep(ctx, {
		rule: 'extract-constant',
		before: integrand,
		after: antiderivative,
		variable: ctx.variable,
		bindings: { c: extraction.c, f: extraction.f },
		subSteps: sub.steps
	});
	return { antiderivative, steps: [step] };
}

function integrateByParts(
	integrand: MathNode,
	parts: PartsMatch,
	ctx: DispatchContext
): DispatchResult {
	const u = parts.u;
	const dv = parts.dv;

	// du/dx — if differentiation fails, refuse pedagogical IPP.
	let du: MathNode;
	try {
		du = differentiate(u, { variable: ctx.variable });
	} catch {
		throw new PedagogicalIntegrationNotImplemented(integrand, 'IPP: cannot compute du');
	}

	// v = ∫dv (recursive call) — we deliberately pass the sub-integration
	// through `integrateNode` so the antiderivative obeys the same pedagogical
	// rules as the top-level call.
	const recurCtx = withDeeperRecursion(ctx);
	let vSub: DispatchResult;
	try {
		vSub = integrateNode(dv, recurCtx);
	} catch {
		throw new PedagogicalIntegrationNotImplemented(
			integrand,
			'IPP: cannot integrate dv pedagogically'
		);
	}
	const v = vSub.antiderivative;

	// vDu = v · du, simplified before re-dispatch. The raw `simplifiedMultiply`
	// keeps degenerate products like `x · (1/x)` as a multiplication node ; we
	// run them through `normalize/denormalize` (which IS aggressive enough to
	// fold `x/x → 1`) so the inner integration can use the constant rule
	// instead of bailing. `preprocess` alone does NOT fold `x · (1/x)`.
	const vDuRaw = simplifiedMultiply(v, du);
	let vDu = vDuRaw;
	try {
		vDu = denormalize(normalize(vDuRaw));
	} catch {
		/* keep raw form */
	}
	let vduSub: DispatchResult;
	try {
		vduSub = integrateNode(vDu, recurCtx);
	} catch {
		throw new PedagogicalIntegrationNotImplemented(
			integrand,
			'IPP: cannot integrate v·du pedagogically'
		);
	}

	const uv = simplifiedMultiply(u, v);
	const antiderivative = subtract(uv, vduSub.antiderivative);

	const identify = buildStep(ctx, {
		rule: 'identify-parts',
		before: integrand,
		after: integrand,
		variable: ctx.variable,
		bindings: { u, dv }
	});
	const choose = buildStep(ctx, {
		rule: 'choose-u-dv',
		before: integrand,
		after: integrand,
		variable: ctx.variable,
		bindings: { u, dv, du, v }
	});
	const apply = buildStep(ctx, {
		rule: 'apply-parts-formula',
		before: integrand,
		after: antiderivative,
		variable: ctx.variable,
		bindings: { u, v, du },
		subSteps: vduSub.steps
	});
	return { antiderivative, steps: [identify, choose, apply] };
}

/**
 * V1.1+V2 — `∫1/(c+x²) dx = (1/a)·arctan(x/a)` and
 * `∫1/√(c-x²) dx = arcsin(x/a)`, where `a = √c`. Sup only. Single-step
 * `apply-known-primitive` with the inverse-trig antiderivative computed via
 * `arctanRule(x, a)` / `arcsinRule(x, a)` from `integration/rules.ts` (which
 * already handle both the unit case a=1 and the general a > 0).
 */
function integrateInverseTrig(
	integrand: MathNode,
	kind: 'arctan' | 'arcsin',
	a: MathNode,
	ctx: DispatchContext
): DispatchResult {
	const arg = variableNode(ctx.variable);
	const antiderivative = kind === 'arctan' ? arctanRule(arg, a) : arcsinRule(arg, a);
	const step = buildStep(ctx, {
		rule: 'apply-known-primitive',
		before: integrand,
		after: antiderivative,
		variable: ctx.variable
	});
	return { antiderivative, steps: [step] };
}

/**
 * V1.1 — Cyclic IPP for `∫e^(αx)·sin(βx) dx` and `∫e^(αx)·cos(βx) dx`.
 *
 * After two integration-by-parts steps, the integrand reappears (up to a
 * constant factor `k`). We resolve the algebraic equation directly :
 *
 *     I = u₀·v₀ - I₁
 *     I₁ = u₁·v₁ - I₂
 *     I₂ = k · I  (the cycle)
 *
 *   ⇒ I = u₀·v₀ - (u₁·v₁ - k·I) = u₀·v₀ - u₁·v₁ + k·I
 *   ⇒ I·(1 - k) = u₀·v₀ - u₁·v₁
 *   ⇒ I = (u₀·v₀ - u₁·v₁) / (1 - k)
 *
 * For the canonical `∫e^x·sin(x) dx` case : k = -1, denominator = 2,
 * I = e^x·(sin(x) - cos(x)) / 2.
 *
 * Pedagogical narrative (5 steps) :
 *   1. `identify-parts` — « On utilise l'IPP cyclique. »
 *   2. `choose-u-dv` — u₀, dv₀, du₀, v₀
 *   3. `apply-parts-formula` — IPP1 produces uv₀ + ∫f₁·dx
 *   4. `choose-u-dv` (2nd) — u₁, dv₁, du₁, v₁
 *   5. `apply-cyclic-ipp` — algebraic resolution
 */
function integrateCyclicIPP(integrand: MathNode, ctx: DispatchContext): DispatchResult {
	// Pick u₀ = exp factor, dv₀ = trig factor (LIATE-friendly).
	const u0 = pickExpFactor(integrand, ctx.variable);
	const dv0 = pickTrigFactor(integrand, ctx.variable);

	let du0: MathNode;
	try {
		du0 = differentiate(u0, { variable: ctx.variable });
	} catch {
		throw new PedagogicalIntegrationNotImplemented(integrand, 'cyclic IPP: cannot compute du₀');
	}
	const recurCtx = withDeeperRecursion(ctx);
	let v0Sub: DispatchResult;
	try {
		v0Sub = integrateNode(dv0, recurCtx);
	} catch {
		throw new PedagogicalIntegrationNotImplemented(integrand, 'cyclic IPP: cannot integrate dv₀');
	}
	const v0 = v0Sub.antiderivative;

	// Inner integrand f₁ = v₀ · du₀, simplified.
	const f1Raw = simplifiedMultiply(v0, du0);
	let f1 = f1Raw;
	try {
		f1 = denormalize(normalize(f1Raw));
	} catch {
		/* keep raw */
	}

	// f₁ may come back as `opposite(multiplication(...))` (because v₀ = -cos
	// has propagated its sign). Extract the sign factor c₁ and the clean
	// product g₁ for the second IPP.
	const { sign: c1, inner: g1 } = unwrapSign(f1);
	if (g1.type !== 'multiplication' || !isCyclicIppPattern(g1, ctx.variable)) {
		throw new PedagogicalIntegrationNotImplemented(
			integrand,
			'cyclic IPP: inner integrand f₁ is not a cyclic pattern'
		);
	}
	const u1 = pickExpFactor(g1, ctx.variable);
	const dv1 = pickTrigFactor(g1, ctx.variable);

	let du1: MathNode;
	try {
		du1 = differentiate(u1, { variable: ctx.variable });
	} catch {
		throw new PedagogicalIntegrationNotImplemented(integrand, 'cyclic IPP: cannot compute du₁');
	}
	let v1Sub: DispatchResult;
	try {
		v1Sub = integrateNode(dv1, recurCtx);
	} catch {
		throw new PedagogicalIntegrationNotImplemented(integrand, 'cyclic IPP: cannot integrate dv₁');
	}
	const v1 = v1Sub.antiderivative;

	// h = v₁ · du₁ (the integrand of the second-IPP's residual ∫ v₁·du₁ dx).
	// We compare h to the ORIGINAL integrand to detect the cycle.
	const hRaw = simplifiedMultiply(v1, du1);
	let h = hRaw;
	try {
		h = denormalize(normalize(hRaw));
	} catch {
		/* keep raw */
	}

	const k2 = findProportionalityConstant(h, integrand);
	if (k2 === null) {
		throw new PedagogicalIntegrationNotImplemented(
			integrand,
			'cyclic IPP: residual integrand is not proportional to the original'
		);
	}

	// Algebraic resolution :
	//     I = u₀v₀ - I₁
	//     I₁ = c₁·K₁ where K₁ = u₁v₁ - K₂  and  K₂ = k₂·I
	//   ⇒ I = u₀v₀ - c₁·(u₁v₁ - k₂·I) = u₀v₀ - c₁·u₁v₁ + c₁·k₂·I
	//   ⇒ I·(1 - c₁·k₂) = u₀v₀ - c₁·u₁v₁
	const denomValue = 1 - c1 * k2;
	if (Math.abs(denomValue) < 1e-12) {
		throw new PedagogicalIntegrationNotImplemented(
			integrand,
			'cyclic IPP: degenerate cycle (1 - c₁·k₂ ≈ 0)'
		);
	}
	const u0v0 = simplifiedMultiply(u0, v0);
	const u1v1Raw = simplifiedMultiply(u1, v1);
	const u1v1Signed = c1 === 1 ? u1v1Raw : opposite(u1v1Raw);
	const numerator = subtract(u0v0, u1v1Signed);
	const antiderivative = simplifiedDivide(numerator, numericNode(denomValue));

	const identify = buildStep(ctx, {
		rule: 'identify-parts',
		before: integrand,
		after: integrand,
		variable: ctx.variable,
		bindings: { u: u0, dv: dv0 }
	});
	const choose1 = buildStep(ctx, {
		rule: 'choose-u-dv',
		before: integrand,
		after: integrand,
		variable: ctx.variable,
		bindings: { u: u0, dv: dv0, du: du0, v: v0 }
	});
	const apply1 = buildStep(ctx, {
		rule: 'apply-parts-formula',
		before: integrand,
		after: subtract(u0v0, f1),
		variable: ctx.variable,
		bindings: { u: u0, v: v0, du: du0 }
	});
	const choose2 = buildStep(ctx, {
		rule: 'choose-u-dv',
		before: f1,
		after: f1,
		variable: ctx.variable,
		bindings: { u: u1, dv: dv1, du: du1, v: v1 }
	});
	const cyclic = buildStep(ctx, {
		rule: 'apply-cyclic-ipp',
		before: integrand,
		after: antiderivative,
		variable: ctx.variable,
		bindings: { u: u0, v: v0, u2: u1, v2: v1 }
	});
	return { antiderivative, steps: [identify, choose1, apply1, choose2, cyclic] };
}

/**
 * V2 — Partial fractions decomposition for `∫ P(x)/Q(x) dx` where Q is
 * quadratic with two distinct real roots and deg(P) < 2.
 *
 * The decomposition `P/Q = A/(x-r₁) + B/(x-r₂)` is computed via the « method
 * of roots » in `tryDetectPartialFractions` ; here we emit the two
 * pedagogical steps :
 *   1. `decompose-rational` — show the partial-fraction decomposition
 *   2. `apply-partial-fractions` — integrate each term as `A·ln|x-rᵢ|`
 */
function integratePartialFractions(
	integrand: MathNode,
	match: PartialFractionsMatch,
	ctx: DispatchContext
): DispatchResult {
	const variableNd = variableNode(ctx.variable);
	const r1Nd = numericNode(match.r1);
	const r2Nd = numericNode(match.r2);
	const ANd = numericNode(match.A);
	const BNd = numericNode(match.B);

	// `x - r₁` and `x - r₂` (kept structural for nice rendering ; if rᵢ is
	// negative, the renderer / latex layer prints `x + |rᵢ|`).
	const xMinusR1 = subtract(variableNd, r1Nd);
	const xMinusR2 = subtract(variableNd, r2Nd);

	// Decomposition `A/(x-r₁) + B/(x-r₂)` for the « before → after » of the
	// `decompose-rational` step. We use the unscaled coefficients here ; the
	// final antiderivative folds them into the logarithm coefficients.
	const term1 = simplifiedDivide(ANd, xMinusR1);
	const term2 = simplifiedDivide(BNd, xMinusR2);
	const decomposition = simplifiedAdd(term1, term2);

	// Antiderivative `A·ln|x-r₁| + B·ln|x-r₂|`.
	const ln1 = ln(abs(xMinusR1));
	const ln2 = ln(abs(xMinusR2));
	const result1 = simplifiedMultiply(ANd, ln1);
	const result2 = simplifiedMultiply(BNd, ln2);
	const antiderivative = simplifiedAdd(result1, result2);

	const decomposeStep = buildStep(ctx, {
		rule: 'decompose-rational',
		before: integrand,
		after: decomposition,
		variable: ctx.variable,
		bindings: {
			numerator: match.numerator,
			denominator: match.denominator,
			r1: r1Nd,
			r2: r2Nd,
			A: ANd,
			B: BNd
		}
	});

	const applyStep = buildStep(ctx, {
		rule: 'apply-partial-fractions',
		before: decomposition,
		after: antiderivative,
		variable: ctx.variable,
		bindings: { A: ANd, B: BNd, r1: r1Nd, r2: r2Nd }
	});

	return { antiderivative, steps: [decomposeStep, applyStep] };
}

// =============================================================================
// Re-exports for the renderer / demos
// =============================================================================

export { isExactVariable };
