/**
 * Domain computation for mathematical expressions.
 *
 * Computes the domain of definition for an expression by:
 * 1. Traversing the AST recursively
 * 2. Getting domain requirements for builtin functions
 * 3. Solving preimage constraints for compositions (e.g., sqrt(x-2) → x >= 2)
 * 4. Combining domains via intersection
 * 5. Excluding zeros for division denominators
 */

import type { MathNode } from '../types';
import type { Domain, DomainResult, DomainStep, IntervalSet } from './types';
import type { DomainRule } from './enhanced-step-types';
import { getConstraintRuleForFunction } from './enhanced-step-types';
import type { DomainStepRecorder } from './domain-step-recorder';
import { createDomainStepRecorder, getNullRecorder } from './domain-step-recorder';
import { V1_MVP_FUNCTION_CONSTRAINT_RULES } from './mvp-rules';
import { toLatex } from '../latex-generator';
import type { Verbosity } from '../common/verbosity';
import {
	universalDomain,
	intervalDomain,
	greaterThanOrEqualInterval,
	tanDomain,
	cotDomain,
	secDomain,
	cscDomain,
	periodicExclusion,
	emptyDomain,
	greaterThanInterval,
	lessThanInterval,
	lessThanOrEqualInterval,
	interval,
	openEndpoint,
	closedEndpoint,
	negInfinityEndpoint as negInfinityEndpointOf,
	posInfinityEndpoint as posInfinityEndpointOf,
	realLine,
	excludedPoint
} from './factory';
import { extractLinearForm } from '../analysis/coefficient-utils';
import { evaluateNodeToApproximatedNumber } from '../eval/evaluate';
import { compile } from '../eval/compile';
import { isOddRootIndex, oddDenominatorExponent } from '../eval/real-root';
import { numericNode } from '../common/numeric';
import { intersect, excludePoints, union, isEmpty } from './algebra';
import {
	exactZeros,
	solveRationalInequality,
	constantRational,
	rationalNode,
	toRationalFunction
} from './exact-roots';
import type { Rational } from '../normal/types';
import {
	ZERO as RATIONAL_ZERO,
	ONE as RATIONAL_ONE,
	addRational,
	subRational,
	mulRational,
	divRational,
	negRational,
	isZero as isRationalZero,
	isNegative as isRationalNegative,
	rationalToNumber
} from '../normal/rational';
import { findNodes } from '../transforms';
import { number as numberNode, divide, multiply, add } from '../factory';
import { getBuiltinDomain, hasRestrictedDomain, getBuiltinRangeEntry } from './builtins';
import { isNegativeInfinity, isPositiveInfinity } from '$lib/mathAST/guards';
import { ZERO_TOLERANCE } from '../common';
import {
	solveLinearInequality,
	solveQuadraticInequality,
	solveCubicInequality,
	solveQuarticInequality,
	findZeros,
	classifyExpression
} from './preimage';

// =============================================================================
// Pedagogical Recorder Helpers
// =============================================================================

/**
 * Build the LaTeX constraint string for a function constraint rule.
 *
 * Returns the right-hand side of « expr ⟹ <constraint> ». Throws on a
 * rule that is in `V1_MVP_RULES` but missing from this switch — guards
 * against silent desync between `mvp-rules.ts` and this generator.
 *
 * Rules outside `V1_MVP_RULES` (e.g. composition, preimage_*) are
 * intentionally not handled and reach the throw branch — the dispatcher
 * is responsible for refusing them upstream before they reach a recorder
 * call site.
 */
function buildConstraintLatex(rule: DomainRule, argLatex: string): string {
	switch (rule) {
		case 'sqrt_constraint':
		case 'even_root_constraint':
			return `${argLatex} \\geq 0`;
		case 'ln_constraint':
		case 'log_constraint':
			return `${argLatex} > 0`;
		case 'arcsin_constraint':
		case 'arccos_constraint':
			return `-1 \\leq ${argLatex} \\leq 1`;
		case 'division_constraint':
		case 'power_constraint':
			return `${argLatex} \\neq 0`;
		case 'tan_constraint':
		case 'sec_constraint':
			return `${argLatex} \\neq \\dfrac{\\pi}{2} + k\\pi, \\; k \\in \\mathbb{Z}`;
		case 'cot_constraint':
		case 'csc_constraint':
			return `${argLatex} \\neq k\\pi, \\; k \\in \\mathbb{Z}`;
		case 'arccosh_constraint':
			return `${argLatex} \\geq 1`;
		case 'arctanh_constraint':
			return `-1 < ${argLatex} < 1`;
		default:
			throw new Error(`buildConstraintLatex: unsupported rule "${rule}" — sync with mvp-rules.ts`);
	}
}

// =============================================================================
// Range Helper Functions (use builtin range registry)
// =============================================================================

/**
 * Check if a function's output range has a finite lower bound at a specific value.
 */
function rangeHasLowerBound(
	funcName: string,
	bound: number
): { hasBound: boolean; inclusive: boolean } {
	const range = getBuiltinRangeEntry(funcName);
	if (!range || range.lower === null) return { hasBound: false, inclusive: false };

	if (Math.abs(range.lower - bound) < ZERO_TOLERANCE) {
		return { hasBound: true, inclusive: range.lowerInclusive };
	}
	return { hasBound: false, inclusive: false };
}

/**
 * Get the outer function's domain requirement (what it needs from its input).
 * Returns null if no specific requirement.
 */
function getOuterFunctionRequirement(
	funcName: string
): { needsPositive: boolean; needsNonNegative: boolean; lowerBound?: number } | null {
	switch (funcName) {
		case 'ln':
		case 'log':
		case 'log10':
		case 'log2':
			// Logarithms need input > 0
			return { needsPositive: true, needsNonNegative: false };
		case 'sqrt':
			// Square root needs input >= 0
			return { needsPositive: false, needsNonNegative: true, lowerBound: 0 };
		case 'arcsin':
		case 'arccos':
			// Inverse trig needs input in [-1 ; 1] - handled by preimage already
			return null;
		case 'arccosh':
			// arccosh needs input >= 1
			return { needsPositive: false, needsNonNegative: false, lowerBound: 1 };
		case 'arctanh':
			// arctanh needs input in ]-1 ; 1[ - handled by preimage already
			return null;
		default:
			return null;
	}
}

/**
 * Analyze a function composition and apply additional constraints.
 *
 * Generic approach:
 * 1. Determine what outer function needs (e.g., ln needs > 0, sqrt needs >= 0)
 * 2. Check inner function's range
 * 3. If inner's range boundary matches outer's requirement, apply stricter constraint
 *
 * Examples:
 * - ln(sqrt(x)): outer needs > 0, inner range [0,+∞[, so exclude where sqrt = 0 → x = 0
 * - sqrt(ln(x)): outer needs >= 0, inner range ]-∞,+∞[, so need ln(x) >= 0 → x >= 1
 * - ln(exp(x)): outer needs > 0, inner range ]0,+∞[, no additional constraint needed
 *
 * @param outerFunc - Name of outer function
 * @param innerNode - The inner function node
 * @param variable - Variable name
 * @param currentDomain - Domain computed so far
 * @param steps - Step recorder
 * @param options - Computation options
 * @returns Updated domain
 */
function analyzeComposition(
	outerFunc: string,
	innerNode: { name: string; args: readonly MathNode[]; base?: MathNode },
	variable: string,
	currentDomain: Domain,
	_steps: DomainStep[],
	_options: ComputeDomainOptions
): Domain {
	let domain = currentDomain;

	const outerReq = getOuterFunctionRequirement(outerFunc);
	if (!outerReq) {
		return domain;
	}

	const innerRange = getBuiltinRangeEntry(innerNode.name);
	const innerArg = innerNode.args[0];

	// Case 1: Outer needs positive (> 0), inner range has 0 as lower bound (inclusive)
	// e.g., ln(sqrt(x)), ln(abs(x))
	if (outerReq.needsPositive) {
		const lowerBoundCheck = rangeHasLowerBound(innerNode.name, 0);
		if (lowerBoundCheck.hasBound && lowerBoundCheck.inclusive) {
			// Inner function can output 0, but outer needs > 0
			// Exclude x values where inner function = 0
			const zeros = findZeros(innerArg, variable);
			if (zeros.length > 0) {
				domain = excludePoints(
					domain,
					zeros.map((z) => numericNode(z))
				);
			}
		}
	}

	// Case 2: Outer needs non-negative (>= 0), inner range is unbounded below
	// e.g., sqrt(ln(x)) - need ln(x) >= 0
	if (outerReq.needsNonNegative && outerReq.lowerBound !== undefined) {
		if (!innerRange || innerRange.lower === null || innerRange.lower < outerReq.lowerBound) {
			// Inner can produce values below the required bound
			// Need to compute preimage for inner(x) >= lowerBound

			// For ln/log, ln(x) >= 0 means x >= 1
			if (
				(innerNode.name === 'ln' || innerNode.name === 'log') &&
				Math.abs(outerReq.lowerBound) < ZERO_TOLERANCE
			) {
				// ln(expr) >= 0 means expr >= 1
				const constraintDomain = intervalDomain([greaterThanOrEqualInterval(numericNode(1))]);
				const preimage = computePreimage(innerArg, constraintDomain, variable);
				if (preimage) {
					domain = intersect(domain, preimage);
				}
			} else {
				// For other functions, construct the inner node and compute preimage
				const innerExpr: MathNode = { type: 'function', name: innerNode.name, args: [innerArg] };
				const constraintDomain = intervalDomain([
					greaterThanOrEqualInterval(numericNode(outerReq.lowerBound))
				]);
				const preimage = computePreimage(innerExpr, constraintDomain, variable);
				if (preimage) {
					domain = intersect(domain, preimage);
				}
			}
		}
	}

	// Case 3: Outer needs >= specific bound (like acosh needs >= 1)
	if (outerReq.lowerBound !== undefined && outerReq.lowerBound !== 0) {
		const constraintDomain = intervalDomain([
			greaterThanOrEqualInterval(numericNode(outerReq.lowerBound))
		]);
		const preimage = computePreimage(innerArg, constraintDomain, variable);
		if (preimage) {
			domain = intersect(domain, preimage);
		}
	}

	return domain;
}

// =============================================================================
// Options and Result Types
// =============================================================================

export interface ComputeDomainOptions {
	/** Show computation steps for pedagogical display */
	showSteps?: boolean;

	/**
	 * Verbosity level for the pedagogical recorder. Default: `'summarized'`.
	 *
	 * Only affects `EnhancedDomainStep` emission via the recorder — has no
	 * effect on the legacy `DomainStep[]` returned in `result.steps`.
	 */
	verbosity?: Verbosity;

	/**
	 * Optional pedagogical recorder for capturing `EnhancedDomainStep[]`.
	 *
	 * When `showSteps: true` and no recorder is provided, `computeDomain`
	 * instantiates a fresh one. Callers that need access to the recorded
	 * `EnhancedDomainStep[]` should provide their own recorder and read
	 * `recorder.getStepsFiltered(verbosity)` after the call.
	 *
	 * V1 MVP: only emits steps for the 5 MVP rules (sqrt, ln/log, division,
	 * arcsin/arccos) plus `intersection` for composite cases. All other
	 * function constraints (tan, arccosh, etc.) and operations (composition,
	 * preimage_*) are silent — the caller is responsible for refusing those
	 * cases via `PedagogicalDomainNotImplemented`.
	 */
	recorder?: DomainStepRecorder;

	/**
	 * Collecteur INTERNE des contraintes que le moteur n'a pas su résoudre
	 * (renseigné par `computeDomain`, lu dans `DomainResult.unresolved`).
	 * Une contrainte non résolue ne doit jamais être ignorée en silence :
	 * `1/(x-1/2)` rendait ℝ.
	 */
	unresolved?: string[];
}

// =============================================================================
// Main API
// =============================================================================

/**
 * Compute the domain of definition for an expression.
 *
 * @param expr - The mathematical expression
 * @param variable - The variable to compute domain for (default: 'x')
 * @param options - Optional configuration
 * @returns Domain result with the computed domain and optional steps
 *
 * @example
 * computeDomain(sqrt(x), 'x') // → [0 ; +∞[
 * computeDomain(ln(x-2), 'x') // → ]2 ; +∞[
 * computeDomain(1/x, 'x') // → ℝ \ {0}
 */
export function computeDomain(
	expr: MathNode,
	variable: string = 'x',
	options: ComputeDomainOptions = {}
): DomainResult {
	const steps: DomainStep[] = [];
	// Wire a recorder when showSteps is true so the pedagogical infrastructure
	// (DomainStepRecorder + EnhancedDomainStep) gets populated. Otherwise use
	// the singleton null recorder so internal code can call it unconditionally
	// without paying any cost.
	const recorder =
		options.recorder ?? (options.showSteps ? createDomainStepRecorder() : getNullRecorder());
	const unresolved: string[] = [];
	const internalOptions: ComputeDomainOptions = { ...options, recorder, unresolved };
	const constraintCountBefore = recorder.length;
	const domain = normalizeExcludedPoints(computeDomainNode(expr, variable, steps, internalOptions));

	// Top-level `intersection` step: if more than one constraint was emitted
	// for this expression and the final domain is constrained (not universal),
	// record an `intersection` step so the renderer can summarize the
	// combination of constraints.
	const constraintsEmitted = recorder.length - constraintCountBefore;
	if (
		options.showSteps &&
		constraintsEmitted > 1 &&
		domain.kind !== 'universal' &&
		domain.kind !== 'empty'
	) {
		recorder.record('intersection', toLatex(expr), '', {
			intermediateDomain: domain,
			verbosityLevel: 'summarized'
		});
	}

	return {
		domain,
		variable,
		...(options.showSteps && steps.length > 0 ? { steps } : {}),
		...(unresolved.length > 0 ? { unresolved } : {})
	};
}

// =============================================================================
// Core Computation
// =============================================================================

/**
 * Recursively compute domain for a node.
 */
function computeDomainNode(
	node: MathNode,
	variable: string,
	steps: DomainStep[],
	options: ComputeDomainOptions
): Domain {
	switch (node.type) {
		// Literals - universal domain
		case 'number':
		case 'greek':
		case 'symbol':
		case 'hole':
			return universalDomain();

		case 'variable':
			// Any variable has universal domain
			return universalDomain();

		// Binary operations - intersection of operand domains
		case 'addition':
		case 'subtraction':
		case 'multiplication':
			return safeIntersect(
				computeDomainNode(node.left, variable, steps, options),
				computeDomainNode(node.right, variable, steps, options),
				options,
				node
			);

		// Division - intersection + exclude zeros of denominator
		case 'division':
			return computeDivisionDomain(node, variable, steps, options);

		// Unary operations
		case 'opposite':
		case 'positive':
		case 'percentage':
			return computeDomainNode(node.operand, variable, steps, options);

		// Functions - main complexity
		case 'function':
			return computeFunctionDomain(node, variable, steps, options);

		// Power/superscript
		case 'superscript':
			return computePowerDomain(node, variable, steps, options);

		// Structural nodes
		case 'delimiter':
			return computeDomainNode(node.content, variable, steps, options);

		case 'subscript':
			return intersect(
				computeDomainNode(node.base, variable, steps, options),
				computeDomainNode(node.subscript, variable, steps, options)
			);

		// Relations - compute domain for both sides
		case 'relation':
			return intersect(
				computeDomainNode(node.left, variable, steps, options),
				computeDomainNode(node.right, variable, steps, options)
			);

		// Composition - special handling
		case 'composition':
			// For f ∘ g, need domain of g and then constraint from f
			return intersect(
				computeDomainNode(node.outer, variable, steps, options),
				computeDomainNode(node.inner, variable, steps, options)
			);

		// Unit nodes
		case 'unit':
			return computeDomainNode(node.expression, variable, steps, options);

		default:
			return universalDomain();
	}
}

/**
 * Compute domain for division, excluding zeros of denominator.
 */
function computeDivisionDomain(
	node: { numerator: MathNode; denominator: MathNode },
	variable: string,
	steps: DomainStep[],
	options: ComputeDomainOptions
): Domain {
	// Get domain from numerator and denominator
	const numDomain = computeDomainNode(node.numerator, variable, steps, options);
	const denDomain = computeDomainNode(node.denominator, variable, steps, options);

	// Combine domains
	let domain = safeIntersect(numDomain, denDomain, options, node.denominator);

	// Exclure les zéros du dénominateur (exacts : 1/2, √2…)
	const nonZero = nonZeroSet(node.denominator, variable);
	const hasZeros = nonZero === null || nonZero.kind !== 'universal';
	if (nonZero === null) {
		markUnresolved(options, `${toLatex(node.denominator)} \\neq 0`);
	} else {
		domain = restrictTo(domain, nonZero, options, node.denominator);
	}

	// Pedagogical recording (V1 MVP): emit a `division_constraint` step when
	// the denominator has zeros to exclude. The intermediateDomain captures
	// the post-exclusion state (i.e. what the renderer should display as the
	// "Domaine" line when this step is rendered in isolation).
	if (options.showSteps && options.recorder && hasZeros) {
		const denomLatex = toLatex(node.denominator);
		options.recorder.recordWithTemplate(
			'division_constraint',
			denomLatex,
			buildConstraintLatex('division_constraint', denomLatex),
			{ expr: denomLatex },
			{
				intermediateDomain: domain,
				verbosityLevel: 'summarized'
			}
		);
	}

	return domain;
}

/**
 * Compute domain for a function application.
 */
function computeFunctionDomain(
	node: { name: string; args: readonly MathNode[]; base?: MathNode },
	variable: string,
	steps: DomainStep[],
	options: ComputeDomainOptions
): Domain {
	if (node.args.length === 0) {
		return universalDomain();
	}

	// Start with domain of argument (recursively compute for nested functions)
	const arg = node.args[0];
	let domain = computeDomainNode(arg, variable, steps, options);

	// Handle functions with periodic exclusions (tan, cot, sec, csc)
	// For simple argument (just the variable), return PeriodicExclusion directly
	const periodicDomain = getPeriodicExclusionDomain(node.name, arg, variable);
	if (!periodicDomain && PERIODIC_FUNCTIONS.includes(node.name.toLowerCase())) {
		markUnresolved(options, `${node.name}(${toLatex(arg)})`);
		return domain;
	}
	if (periodicDomain) {
		const result = safeIntersect(domain, periodicDomain, options, arg);

		// Pedagogical recording (V1.1): emit tan/cot/sec/csc constraint step.
		if (options.showSteps && options.recorder) {
			const trigRule = getConstraintRuleForFunction(node.name);
			if (trigRule && V1_MVP_FUNCTION_CONSTRAINT_RULES.has(trigRule)) {
				const argLatex = toLatex(arg);
				options.recorder.recordWithTemplate(
					trigRule,
					argLatex,
					buildConstraintLatex(trigRule, argLatex),
					{ expr: argLatex },
					{
						intermediateDomain: result,
						verbosityLevel: 'summarized'
					}
				);
			}
		}

		return result;
	}

	// Odd-index roots (cbrt, sqrt[3], sqrt[5], ...) are defined on all of ℝ
	if (node.name === 'cbrt') {
		return domain;
	}
	if (node.name === 'sqrt' && node.base) {
		try {
			const rootIndex = evaluateNodeToApproximatedNumber(node.base);
			if (Number.isInteger(rootIndex) && rootIndex % 2 !== 0) {
				return domain; // Odd root: defined on ℝ
			}
		} catch {
			// Cannot evaluate root index — fall through to default sqrt domain
		}
	}

	// Check if this function has a restricted domain
	if (!hasRestrictedDomain(node.name)) {
		return domain;
	}

	// Get the function's domain requirement
	const funcDomain = getBuiltinDomain(node.name);
	if (!funcDomain || funcDomain.kind === 'universal') {
		return domain;
	}

	// Compute preimage: find values of variable such that arg is in funcDomain
	const preimage = computePreimage(arg, funcDomain, variable);
	if (preimage) {
		domain = safeIntersect(domain, preimage, options, arg);
	}

	// Pedagogical recording (V1 + V1.1.a): emit a constraint step for any
	// rule in `V1_MVP_FUNCTION_CONSTRAINT_RULES` — sqrt, ln, log, arcsin,
	// arccos (V1) plus arccosh, arctanh (V1.1.a, refused at lycée by the
	// dispatcher). The trigonometric V1.1.a rules (tan, cot, sec, csc) are
	// emitted earlier in the periodic_exclusion branch above. Rules outside
	// the MVP set are silent here; the upstream pedagogical dispatcher
	// refuses those cases via `assertOnlyMvpRules`.
	if (options.showSteps && options.recorder) {
		const constraintRule = getConstraintRuleForFunction(node.name);
		if (constraintRule && V1_MVP_FUNCTION_CONSTRAINT_RULES.has(constraintRule)) {
			const argLatex = toLatex(arg);
			// `computePreimage` returns `Domain | null`. When null (argument too
			// complex to invert), omit `intermediateDomain` so the renderer
			// falls back to the 2-line format.
			options.recorder.recordWithTemplate(
				constraintRule,
				argLatex,
				buildConstraintLatex(constraintRule, argLatex),
				{ expr: argLatex },
				{
					intermediateDomain: preimage === null ? undefined : preimage,
					verbosityLevel: 'summarized'
				}
			);
		}
	}

	// Contrainte non résolue : on le DIT (jamais ℝ en silence). L'analyse de
	// composition historique reste tentée, mais le résultat reste incomplet.
	if (!preimage) {
		markUnresolved(options, `${node.name}(${toLatex(arg)})`);
		if (arg.type === 'function' && arg.args.length > 0) {
			domain = analyzeComposition(node.name, arg, variable, domain, steps, options);
		}
	}

	return domain;
}

const PERIODIC_FUNCTIONS: readonly string[] = ['tan', 'cot', 'sec', 'csc'];

/**
 * Get periodic exclusion domain for trigonometric functions with periodic discontinuities.
 *
 * Returns PeriodicExclusion for tan, cot, sec, csc when the argument is simple enough
 * to compute the preimage of the periodic exclusion.
 *
 * For tan(x) and sec(x): undefined when x = π/2 + kπ
 * For cot(x) and csc(x): undefined when x = kπ
 *
 * For tan(ax + b): undefined when ax + b = π/2 + kπ
 *   → x = (π/2 - b)/a + kπ/|a|
 *   → basePoint = (π/2 - b)/a, period = π/|a|
 *
 * @param funcName - The function name
 * @param arg - The function argument
 * @param variable - The variable name
 * @returns PeriodicExclusion domain if applicable, null otherwise
 */
function getPeriodicExclusionDomain(
	funcName: string,
	arg: MathNode,
	variable: string
): Domain | null {
	const name = funcName.toLowerCase();

	// Only handle tan, cot, sec, csc
	if (!PERIODIC_FUNCTIONS.includes(name)) {
		return null;
	}

	// Case 1: Simple argument - just the variable (tan(x), cot(x), etc.)
	if (arg.type === 'variable' && arg.name === variable) {
		switch (name) {
			case 'tan':
				return tanDomain();
			case 'sec':
				return secDomain();
			case 'cot':
				return cotDomain();
			case 'csc':
				return cscDomain();
		}
	}

	// Case 2: Linear argument (tan(ax + b), cot(ax + b), etc.)
	const linearForm = extractLinearForm(arg, variable);
	if (linearForm) {
		return createLinearPeriodicExclusion(name, linearForm.coefficient, linearForm.offset);
	}

	return null;
}

/**
 * Create a periodic exclusion domain for a trigonometric function with linear argument.
 *
 * For f(ax + b) where f is tan, sec, cot, or csc:
 * - tan/sec: undefined when ax + b = π/2 + kπ → x = (π/2 - b)/a + kπ/|a|
 * - cot/csc: undefined when ax + b = kπ → x = -b/a + kπ/|a|
 *
 * @param funcName - The function name (tan, sec, cot, csc)
 * @param coeffNode - The coefficient 'a' as a MathNode
 * @param offsetNode - The offset 'b' as a MathNode (null if no offset)
 * @returns PeriodicExclusion or null if cannot compute
 */
function createLinearPeriodicExclusion(
	funcName: string,
	coeffNode: MathNode,
	offsetNode: MathNode | null
): Domain | null {
	// Coefficients rationnels exacts : base et période exactes (π/4, π/2)
	const aExact = constantRational(coeffNode);
	const bExact = offsetNode ? constantRational(offsetNode) : RATIONAL_ZERO;
	if (aExact && bExact && !isRationalZero(aExact)) {
		// a·x + b = s + kπ → x = (s − b)/a + kπ/a, s = π/2 (tan, sec) ou 0
		const piCoefficient = divRational(
			funcName === 'tan' || funcName === 'sec' ? { n: 1n, d: 2n } : RATIONAL_ZERO,
			aExact
		);
		const constantPart = divRational(negRational(bExact), aExact);
		const absA = isRationalNegative(aExact) ? negRational(aExact) : aExact;
		const period = piMultipleNode(divRational(RATIONAL_ONE, absA));
		const piPart = isRationalZero(piCoefficient) ? null : piMultipleNode(piCoefficient);
		const base: MathNode =
			piPart === null
				? rationalNode(constantPart)
				: isRationalZero(constantPart)
					? piPart
					: add(rationalNode(constantPart), piPart);
		return periodicExclusion(base, period);
	}

	// Evaluate coefficient 'a' to a number
	let a: number;
	try {
		a = evaluateNodeToApproximatedNumber(coeffNode);
	} catch {
		return null;
	}

	// Check for zero coefficient (not linear in variable)
	if (Math.abs(a) < ZERO_TOLERANCE) {
		return null;
	}

	// Evaluate offset 'b' to a number (default to 0 if no offset)
	let b = 0;
	if (offsetNode) {
		try {
			b = evaluateNodeToApproximatedNumber(offsetNode);
		} catch {
			return null;
		}
	}

	const baseSingularity = funcName === 'tan' || funcName === 'sec' ? Math.PI / 2 : 0;
	const newBasePoint = (baseSingularity - b) / a;
	const newPeriod = Math.PI / Math.abs(a);

	return periodicExclusion(numericNode(newBasePoint), numericNode(newPeriod));
}

/** q·π exact : `π`, `π/4`, `3π/2`, `−π/4`. */
function piMultipleNode(q: Rational): MathNode {
	const negative = isRationalNegative(q);
	const n = negative ? -q.n : q.n;
	const pi: MathNode = { type: 'constant', constant: 'pi' };
	const top: MathNode = n === 1n ? pi : multiply(numberNode(n.toString()), pi, 'implicit');
	const body: MathNode = q.d === 1n ? top : divide(top, numberNode(q.d.toString()), 'inline');
	return negative ? { type: 'opposite', operand: body } : body;
}

/**
 * Compute domain for power expressions (superscript).
 */
function computePowerDomain(
	node: { base: MathNode; superscript: MathNode },
	variable: string,
	steps: DomainStep[],
	options: ComputeDomainOptions
): Domain {
	const baseDomain = computeDomainNode(node.base, variable, steps, options);
	const expDomain = computeDomainNode(node.superscript, variable, steps, options);

	let domain = intersect(baseDomain, expDomain);

	const exponentHasVariable = containsVariable(node.superscript, variable);
	const baseHasVariable = containsVariable(node.base, variable);
	const expValue = exponentHasVariable ? null : tryConstantValue(node.superscript);
	// Exposant p/q irréductible, q impair (décision du 2026-10-08) : x^{p/q} =
	// (ᵠ√x)^p est défini sur ℝ si p > 0, sur ℝ* si p < 0, comme ∛x
	const oddRootExponent = exponentHasVariable ? null : oddDenominatorExponent(node.superscript);

	// Exposant entier négatif, ou p/q négatif de dénominateur impair : base ≠ 0
	const negativeIntegerExponent = expValue !== null && expValue < 0 && Number.isInteger(expValue);
	if (negativeIntegerExponent || (oddRootExponent !== null && oddRootExponent.n < 0n)) {
		const nonZero = nonZeroSet(node.base, variable);
		if (nonZero === null) {
			markUnresolved(options, `${toLatex(node.base)} \\neq 0`);
		} else if (nonZero.kind !== 'universal') {
			domain = restrictTo(domain, nonZero, options, node.base);

			// Pedagogical recording (V1.1): emit a `power_constraint` step.
			if (options.showSteps && options.recorder) {
				const baseLatex = toLatex(node.base);
				options.recorder.recordWithTemplate(
					'power_constraint',
					baseLatex,
					buildConstraintLatex('power_constraint', baseLatex),
					{ expr: baseLatex },
					{
						intermediateDomain: domain,
						verbosityLevel: 'summarized'
					}
				);
			}
		}
	}

	// Exposant NON entier hors du cas q impair (dénominateur pair, décimal,
	// irrationnel : convention du lycée, x^a = e^{a ln x}) : base ≥ 0 si a > 0,
	// base > 0 si a < 0. Exposant variable et base variable (x^x) : base > 0.
	const nonIntegerExponent =
		expValue !== null && !Number.isInteger(expValue) && oddRootExponent === null;
	const variableExponent = exponentHasVariable && baseHasVariable;
	if (baseHasVariable && (nonIntegerExponent || variableExponent)) {
		const strict = variableExponent || (expValue !== null && expValue < 0);
		const preimage = solveInequalityForPreimage(node.base, '>=', RATIONAL_ZERO, strict, variable);
		if (preimage) {
			domain = intersect(domain, preimage);
		} else {
			markUnresolved(options, `${toLatex(node.base)} ${strict ? '>' : '\\geq'} 0`);
		}

		// Pedagogical recording (V1.1): emit an `even_root_constraint` step.
		if (options.showSteps && options.recorder && !strict) {
			const baseLatex = toLatex(node.base);
			options.recorder.recordWithTemplate(
				'even_root_constraint',
				baseLatex,
				buildConstraintLatex('even_root_constraint', baseLatex),
				{ expr: baseLatex },
				{
					intermediateDomain: preimage === null ? undefined : preimage,
					verbosityLevel: 'summarized'
				}
			);
		}
	}

	return domain;
}

// =============================================================================
// Preimage Computation
// =============================================================================

/**
 * Compute the preimage of a domain under an expression.
 * Given expr and domain D, find {x : expr(x) ∈ D}
 *
 * @param expr - The expression (argument to a function)
 * @param targetDomain - The domain constraint (function's domain)
 * @param variable - The variable to solve for
 * @returns The preimage domain, or null if cannot compute
 */
function computePreimage(expr: MathNode, targetDomain: Domain, variable: string): Domain | null {
	if (targetDomain.kind === 'universal') {
		return universalDomain();
	}

	if (targetDomain.kind === 'empty') {
		return targetDomain;
	}

	if (targetDomain.kind !== 'interval_set') {
		return null;
	}

	const intDomain = targetDomain as IntervalSet;

	// Handle based on expression structure and interval type
	const intervals = intDomain.intervals;

	if (intervals.length === 0) {
		return { kind: 'empty' };
	}

	// For multiple intervals, compute preimage for each and union results
	if (intervals.length > 1) {
		let combinedDomain: Domain = { kind: 'empty' };
		for (const interval of intervals) {
			const singleDomain = intervalDomain([interval], intDomain.excludedPoints);
			const preimage = computePreimageForSingleInterval(expr, singleDomain, variable);
			if (preimage && !isEmpty(preimage)) {
				combinedDomain = union(combinedDomain, preimage);
			}
		}
		return isEmpty(combinedDomain) ? null : combinedDomain;
	}

	// Single interval - delegate to helper
	return computePreimageForSingleInterval(expr, intDomain, variable);
}

/**
 * Compute preimage for a single interval domain.
 * Helper for computePreimage that handles one interval at a time.
 */
function computePreimageForSingleInterval(
	expr: MathNode,
	targetDomain: IntervalSet,
	variable: string
): Domain | null {
	const intervals = targetDomain.intervals;
	if (intervals.length !== 1) {
		return null;
	}

	const interval = intervals[0];
	let resultDomain: Domain = universalDomain();

	// Check lower bound constraint
	const lowerValue = interval.lower.value;
	if (!isNegativeInfinity(lowerValue) && !isPositiveInfinity(lowerValue)) {
		const bound = constantRational(lowerValue);
		if (bound === null) return null;
		const strict = interval.lower.type === 'open';
		const ineqDomain = solveInequalityForPreimage(expr, '>=', bound, strict, variable);
		if (!ineqDomain) return null;
		resultDomain = intersect(resultDomain, ineqDomain);
	}

	// Check upper bound constraint
	const upperValue = interval.upper.value;
	if (!isPositiveInfinity(upperValue) && !isNegativeInfinity(upperValue)) {
		const bound = constantRational(upperValue);
		if (bound === null) return null;
		const strict = interval.upper.type === 'open';
		const ineqDomain = solveInequalityForPreimage(expr, '<=', bound, strict, variable);
		if (!ineqDomain) return null;
		resultDomain = intersect(resultDomain, ineqDomain);
	}

	// Handle excluded points
	for (const ep of targetDomain.excludedPoints) {
		const val = tryEvaluateConstant(ep.value);
		if (val === null) return null;
		const nonZero = nonZeroSet(subtractConstant(expr, val), variable);
		if (nonZero === null) return null;
		resultDomain = intersect(resultDomain, nonZero);
	}

	return resultDomain;
}

/**
 * Solve an inequality for preimage computation.
 * Handles >= and <= with strict/non-strict variants.
 */
function solveInequalityForPreimage(
	expr: MathNode,
	op: '>=' | '<=',
	bound: Rational,
	strict: boolean,
	variable: string
): Domain | null {
	// 0. Sans la variable : constante (vérifiée) ou paramètre (supposé admis :
	// `.domaine ln(t)` en x n'impose rien à x)
	if (!containsVariable(expr, variable)) {
		const value = tryConstantValue(expr);
		if (value === null) return universalDomain();
		return checkBound(value, op, rationalToNumber(bound), strict)
			? universalDomain()
			: emptyDomain();
	}

	// 1. Fraction rationnelle à coefficients rationnels : tableau de signes exact
	const exact = solveRationalInequality(expr, op, bound, strict, variable);
	if (exact) return exact;

	// 2. Composée monotone (ln u ≥ 0, √u − 1 > 0, |u| > 1, e^u ≥ 1…)
	const inverted = invertMonotone(expr, op, bound, strict, variable);
	if (inverted) return inverted;

	// 3. a·x ± K, K constante irrationnelle (x − √2, 2x + π) : racine exacte
	if (isRationalZero(bound)) {
		const shifted = shiftedLinearRoot(expr, variable);
		if (shifted) {
			const up = (op === '>=') === shifted.slope > 0;
			const point = shifted.root;
			return intervalDomain([
				up
					? strict
						? greaterThanInterval(point)
						: greaterThanOrEqualInterval(point)
					: strict
						? lessThanInterval(point)
						: lessThanOrEqualInterval(point)
			]);
		}
	}

	// 4. Chemin historique (coefficients flottants)
	return solveClassifiedInequality(expr, op, rationalToNumber(bound), strict, variable);
}

/**
 * `a·x ± K` (a rationnel non nul, K constante sans x, non rationnelle) :
 * racine exacte ∓K/a. Seulement a entier (√3/2, pas 3√3/2 à simplifier).
 */
function shiftedLinearRoot(
	expr: MathNode,
	variable: string
): { root: MathNode; slope: number } | null {
	if (expr.type !== 'addition' && expr.type !== 'subtraction') return null;
	const leftHasX = containsVariable(expr.left, variable);
	if (leftHasX === containsVariable(expr.right, variable)) return null;
	const linear = leftHasX ? expr.left : expr.right;
	const constant = leftHasX ? expr.right : expr.left;
	if (constantRational(constant) !== null || nodeNumber(constant) === null) return null;
	const rf = toRationalFunction(linear, variable);
	if (!rf || rf.den.length !== 1 || rf.num.length !== 2 || !isRationalZero(rf.num[0])) return null;
	const a = divRational(rf.num[1], rf.den[0]);
	if (a.d !== 1n) return null;
	// signe de K dans expr : + si addition ou K à gauche, − si soustrait à droite
	const kSign = expr.type === 'addition' || !leftHasX ? 1 : -1;
	// L de signe −1 si soustrait à droite (K − a·x)
	const lSign = expr.type === 'subtraction' && !leftHasX ? -1 : 1;
	const slope = lSign * rationalToNumber(a);
	// slope·x + kSign·K = 0 → x = −kSign·K/slope
	const negative = kSign * slope > 0;
	const absA = a.n < 0n ? -a.n : a.n;
	const body: MathNode =
		absA === 1n ? constant : divide(constant, numberNode(absA.toString()), 'inline');
	return { root: negative ? { type: 'opposite', operand: body } : body, slope };
}

/**
 * `expr ⊳ c` quand expr = f(u) (f monotone) ou A ± k, k·A, A/k, −A : on
 * ramène la contrainte sur u. Uniquement quand la nouvelle borne reste
 * rationnelle (ln u ≥ 0 → u ≥ 1, mais ln u ≥ 2 → refus plutôt que e² décimal).
 */
function invertMonotone(
	expr: MathNode,
	op: '>=' | '<=',
	c: Rational,
	strict: boolean,
	variable: string
): Domain | null {
	const flip = op === '>=' ? '<=' : '>=';
	if (!containsVariable(expr, variable)) {
		const value = tryConstantValue(expr);
		if (value === null) return null;
		return checkBound(value, op, rationalToNumber(c), strict) ? universalDomain() : emptyDomain();
	}
	switch (expr.type) {
		case 'delimiter':
			return solveInequalityForPreimage(expr.content, op, c, strict, variable);
		case 'positive':
			return solveInequalityForPreimage(expr.operand, op, c, strict, variable);
		case 'opposite':
			return solveInequalityForPreimage(expr.operand, flip, negRational(c), strict, variable);
		case 'addition':
		case 'subtraction': {
			const sign = expr.type === 'addition' ? 1 : -1;
			const k = constantRational(expr.right);
			if (k && !containsVariable(expr.right, variable)) {
				const shifted = sign === 1 ? subRational(c, k) : addRational(c, k);
				return solveInequalityForPreimage(expr.left, op, shifted, strict, variable);
			}
			const h = constantRational(expr.left);
			if (h && !containsVariable(expr.left, variable)) {
				// h + A ⊳ c → A ⊳ c − h ; h − A ⊳ c → A ⊲ h − c
				return sign === 1
					? solveInequalityForPreimage(expr.right, op, subRational(c, h), strict, variable)
					: solveInequalityForPreimage(expr.right, flip, subRational(h, c), strict, variable);
			}
			return null;
		}
		case 'multiplication': {
			const [k, a] = containsVariable(expr.left, variable)
				? [constantRational(expr.right), expr.left]
				: [constantRational(expr.left), expr.right];
			if (
				!k ||
				isRationalZero(k) ||
				containsVariable(expr.left, variable) === containsVariable(expr.right, variable)
			) {
				return null;
			}
			return solveInequalityForPreimage(
				a,
				isRationalNegative(k) ? flip : op,
				divRational(c, k),
				strict,
				variable
			);
		}
		case 'division': {
			const k = constantRational(expr.denominator);
			if (!k || isRationalZero(k) || containsVariable(expr.denominator, variable)) return null;
			return solveInequalityForPreimage(
				expr.numerator,
				isRationalNegative(k) ? flip : op,
				mulRational(c, k),
				strict,
				variable
			);
		}
		case 'superscript':
			if (isEulerBase(expr.base) && containsVariable(expr.superscript, variable)) {
				return invertExp(expr.superscript, op, c, strict, variable);
			}
			if (!containsVariable(expr.superscript, variable)) {
				const odd = oddDenominatorExponent(expr.superscript);
				if (odd !== null) return invertOddRootPower(expr.base, odd, op, c, strict, variable);
			}
			return null;
		case 'function': {
			if (expr.args.length !== 1) return null;
			const u = expr.args[0];
			const name = expr.name.toLowerCase();
			const cv = rationalToNumber(c);
			if (name === 'sqrt' && !expr.base) {
				if (op === '>=') {
					if (cv < 0 || (cv === 0 && !strict)) return universalDomain();
					return solveInequalityForPreimage(u, '>=', mulRational(c, c), strict, variable);
				}
				if (cv < 0 || (cv === 0 && strict)) return emptyDomain();
				return solveInequalityForPreimage(u, '<=', mulRational(c, c), strict, variable);
			}
			// ⁿ√u, n impair : croissante sur ℝ, comme cbrt
			const oddIndex =
				name === 'sqrt' && expr.base !== undefined ? tryConstantValue(expr.base) : null;
			if (name === 'cbrt' || (oddIndex !== null && isOddRootIndex(oddIndex))) {
				const n = name === 'cbrt' ? 3 : (oddIndex as number);
				return solveInequalityForPreimage(u, op, powRationalInt(c, n), strict, variable);
			}
			if (name === 'ln' || name === 'log' || name === 'log10' || name === 'log2') {
				if (!isRationalZero(c)) return null;
				return solveInequalityForPreimage(u, op, RATIONAL_ONE, strict, variable);
			}
			if (name === 'exp') return invertExp(u, op, c, strict, variable);
			if (name === 'abs') {
				if (op === '>=') {
					if (cv < 0 || (cv === 0 && !strict)) return universalDomain();
					if (cv === 0) return nonZeroSet(u, variable);
					const above = solveInequalityForPreimage(u, '>=', c, strict, variable);
					const below = solveInequalityForPreimage(u, '<=', negRational(c), strict, variable);
					return above && below ? union(above, below) : null;
				}
				if (cv < 0 || (cv === 0 && strict)) return emptyDomain();
				if (cv === 0) return null;
				const above = solveInequalityForPreimage(u, '>=', negRational(c), strict, variable);
				const below = solveInequalityForPreimage(u, '<=', c, strict, variable);
				return above && below ? intersect(above, below) : null;
			}
			return null;
		}
		default:
			return null;
	}
}

/**
 * `u^{p/q} ⊳ c`, q impair (décision du 2026-10-08) : u^{p/q} = ᵠ√(u^p).
 * - p = 1 : croissante, u ⊳ c^q ;
 * - c = 0, p impair : du signe de u ;
 * - c = 0, p pair : ≥ 0 partout, nul seulement en u = 0.
 * Les autres cas : `null` (refus).
 */
function invertOddRootPower(
	u: MathNode,
	exponent: { n: bigint; d: bigint },
	op: '>=' | '<=',
	c: Rational,
	strict: boolean,
	variable: string
): Domain | null {
	if (exponent.n === 1n) {
		return solveInequalityForPreimage(
			u,
			op,
			powRationalInt(c, Number(exponent.d)),
			strict,
			variable
		);
	}
	if (!isRationalZero(c)) return null;
	if (exponent.n % 2n !== 0n)
		return solveInequalityForPreimage(u, op, RATIONAL_ZERO, strict, variable);
	if (op === '>=') return strict ? nonZeroSet(u, variable) : universalDomain();
	// u^{p/q} ≤ 0, p pair : seulement u = 0 (exposant > 0), jamais (exposant < 0)
	return strict || exponent.n < 0n ? emptyDomain() : null;
}

/** c^n exact. */
function powRationalInt(c: Rational, n: number): Rational {
	let result = RATIONAL_ONE;
	for (let i = 0; i < n; i++) result = mulRational(result, c);
	return result;
}

function invertExp(
	u: MathNode,
	op: '>=' | '<=',
	c: Rational,
	strict: boolean,
	variable: string
): Domain | null {
	const cv = rationalToNumber(c);
	if (op === '>=') {
		if (cv <= 0) return universalDomain();
		if (cv === 1) return solveInequalityForPreimage(u, '>=', RATIONAL_ZERO, strict, variable);
		return null;
	}
	if (cv <= 0) return emptyDomain();
	if (cv === 1) return solveInequalityForPreimage(u, '<=', RATIONAL_ZERO, strict, variable);
	return null;
}

/**
 * Ensemble des x où `expr ≠ 0`, avec des points EXACTS ; `null` si inconnu.
 */
function nonZeroSet(expr: MathNode, variable: string): Domain | null {
	if (!containsVariable(expr, variable)) {
		// Paramètre non évaluable (1/a) : supposé non nul
		const value = tryConstantValue(expr);
		if (value === null) return universalDomain();
		return Math.abs(value) < ZERO_TOLERANCE ? emptyDomain() : universalDomain();
	}
	const exact = exactZeros(expr, variable);
	if (exact) {
		return exact.length === 0
			? universalDomain()
			: excludePoints(
					universalDomain(),
					exact.map((r) => r.node)
				);
	}
	switch (expr.type) {
		case 'delimiter':
			return nonZeroSet(expr.content, variable);
		case 'opposite':
		case 'positive':
			return nonZeroSet(expr.operand, variable);
		case 'multiplication': {
			const l = nonZeroSet(expr.left, variable);
			const r = nonZeroSet(expr.right, variable);
			return l && r ? intersect(l, r) : null;
		}
		case 'division':
			return nonZeroSet(expr.numerator, variable);
		case 'addition':
		case 'subtraction': {
			// u ≠ 0 ⟺ u > 0 ou u < 0 (e^x − 1, √x − 2, |x| − 1, x − √2)
			const positive = solveInequalityForPreimage(expr, '>=', RATIONAL_ZERO, true, variable);
			const negative = solveInequalityForPreimage(expr, '<=', RATIONAL_ZERO, true, variable);
			if (positive && negative) return union(positive, negative);
			break;
		}
		case 'superscript': {
			if (isEulerBase(expr.base)) return universalDomain();
			if (containsVariable(expr.superscript, variable)) {
				const baseValue = containsVariable(expr.base, variable)
					? null
					: tryConstantValue(expr.base);
				return baseValue !== null && baseValue > 0 ? universalDomain() : null;
			}
			return nonZeroSet(expr.base, variable);
		}
		case 'function': {
			if (expr.args.length !== 1) return null;
			const u = expr.args[0];
			const name = expr.name.toLowerCase();
			if (name === 'sqrt' || name === 'cbrt' || name === 'abs') return nonZeroSet(u, variable);
			if (name === 'exp') return universalDomain();
			if (name === 'ln' || name === 'log' || name === 'log10' || name === 'log2') {
				return nonZeroSet(subtractConstant(u, 1), variable);
			}
			if (name === 'sin') return getPeriodicExclusionDomain('csc', u, variable);
			if (name === 'cos') return getPeriodicExclusionDomain('sec', u, variable);
			if (name === 'tan') return getPeriodicExclusionDomain('cot', u, variable);
			return null;
		}
	}
	// Chemin historique (coefficients flottants)
	const classified = classifyExpression(expr, variable);
	if (classified.kind === 'complex') return null;
	const zeros = findZeros(expr, variable);
	return zeros.length === 0
		? universalDomain()
		: excludePoints(
				universalDomain(),
				zeros.map((z) => numericNode(z))
			);
}

/**
 * `domain ∩ nonZero`, sans perte silencieuse (voir `safeIntersect`).
 */
function restrictTo(
	domain: Domain,
	nonZero: Domain,
	options: ComputeDomainOptions,
	source: MathNode
): Domain {
	return safeIntersect(domain, nonZero, options, source);
}

/**
 * Intersection qui REFUSE ce qu'elle ne sait pas représenter : une exclusion
 * périodique combinée à autre chose (`tan x + 1/x`) perdait l'autre
 * contrainte en silence (`excludePoints` ignore un domaine périodique).
 */
function safeIntersect(
	a: Domain,
	b: Domain,
	options: ComputeDomainOptions,
	source: MathNode
): Domain {
	if (a.kind === 'universal') return b;
	if (b.kind === 'universal') return a;
	const periodicA = a.kind === 'periodic_exclusion';
	const periodicB = b.kind === 'periodic_exclusion';
	if (periodicA || periodicB) {
		if (periodicA && periodicB && samePeriodic(a, b)) return a;
		markUnresolved(options, toLatex(source));
		return periodicA ? a : b;
	}
	return intersect(a, b);
}

function samePeriodic(a: Domain, b: Domain): boolean {
	if (a.kind !== 'periodic_exclusion' || b.kind !== 'periodic_exclusion') return false;
	const pa = nodeNumber(a.period);
	const pb = nodeNumber(b.period);
	const ba = nodeNumber(a.basePoint);
	const bb = nodeNumber(b.basePoint);
	if (pa === null || pb === null || ba === null || bb === null) return false;
	if (Math.abs(pa - pb) > 1e-12) return false;
	const k = Math.round((ba - bb) / pa);
	return Math.abs(ba - bb - k * pa) < 1e-12;
}

/**
 * Forme canonique des points exclus :
 * - un point hors du domaine disparaît (`]0 ; +∞[ \ {0}` → `]0 ; +∞[`) ;
 * - un point sur une borne fermée l'ouvre (`[0 ; +∞[ \ {0}` → `]0 ; +∞[`) ;
 * - ℝ privé de points s'écrit `ℝ \ {a ; b}` (deux intervalles ouverts
 *   jointifs y sont recollés) ; sinon le point coupe l'intervalle
 *   (`]0 ; +∞[ \ {1}` → `]0 ; 1[ ∪ ]1 ; +∞[`).
 */
function normalizeExcludedPoints(domain: Domain): Domain {
	if (domain.kind !== 'interval_set') return domain;
	type Bound = { node: MathNode; value: number; closed: boolean };
	const toBound = (b: { value: MathNode; type: string }): Bound | null => {
		const value =
			b.value.type === 'infinity'
				? b.value.sign === 'positive'
					? Infinity
					: -Infinity
				: nodeNumber(b.value);
		return value === null ? null : { node: b.value, value, closed: b.type === 'closed' };
	};
	const pieces: { lo: Bound; hi: Bound }[] = [];
	for (const i of domain.intervals) {
		const lo = toBound(i.lower);
		const hi = toBound(i.upper);
		if (!lo || !hi) return domain;
		pieces.push({ lo, hi });
	}
	const points: { node: MathNode; value: number }[] = [];
	for (const p of domain.excludedPoints ?? []) {
		const value = nodeNumber(p.value);
		if (value === null) return domain;
		points.push({ node: p.value, value });
	}
	pieces.sort((a, b) => a.lo.value - b.lo.value);
	const near = (a: number, b: number) => Math.abs(a - b) < 1e-12 * Math.max(1, Math.abs(a));

	// 1. Points sur une borne / hors du domaine
	const interior: { node: MathNode; value: number }[] = [];
	for (const p of points) {
		let kept = false;
		for (const piece of pieces) {
			if (near(p.value, piece.lo.value)) piece.lo = { ...piece.lo, closed: false };
			else if (near(p.value, piece.hi.value)) piece.hi = { ...piece.hi, closed: false };
			else if (p.value > piece.lo.value && p.value < piece.hi.value) kept = true;
		}
		if (kept && !interior.some((q) => near(q.value, p.value))) interior.push(p);
	}
	const valid = pieces.filter(
		(piece) => piece.lo.value < piece.hi.value || (piece.lo.closed && piece.hi.closed)
	);
	if (valid.length === 0) return emptyDomain();

	// 2. ℝ privé de points ?
	const gaps: { node: MathNode; value: number }[] = [];
	let realLineMinusPoints =
		valid[0].lo.value === -Infinity && valid[valid.length - 1].hi.value === Infinity;
	for (let i = 0; realLineMinusPoints && i + 1 < valid.length; i++) {
		const a = valid[i].hi;
		const b = valid[i + 1].lo;
		if (near(a.value, b.value) && !a.closed && !b.closed)
			gaps.push({ node: a.node, value: a.value });
		else if (!(near(a.value, b.value) && (a.closed || b.closed))) realLineMinusPoints = false;
	}
	const endpoint = (b: Bound) =>
		b.value === -Infinity
			? negInfinityEndpointOf()
			: b.value === Infinity
				? posInfinityEndpointOf()
				: b.closed
					? closedEndpoint(b.node)
					: openEndpoint(b.node);
	if (realLineMinusPoints) {
		const all = [...gaps, ...interior].sort((a, b) => a.value - b.value);
		if (all.length === 0) return universalDomain();
		return intervalDomain(
			[realLine()],
			all.map((p) => excludedPoint(p.node))
		);
	}

	// 3. Points intérieurs gardés en points exclus (]0 ; +∞[ \\ {1}) : couper
	// l'intervalle ferait du point une borne, ce que les limites lisent
	// comme une frontière du domaine
	return intervalDomain(
		valid.map((piece) => interval(endpoint(piece.lo), endpoint(piece.hi))),
		interior.sort((a, b) => a.value - b.value).map((p) => excludedPoint(p.node))
	);
}

function markUnresolved(options: ComputeDomainOptions, constraint: string): void {
	options.unresolved?.push(constraint);
}

function containsVariable(node: MathNode, variable: string): boolean {
	return findNodes(node, (n) => n.type === 'variable' && n.name === variable).length > 0;
}

function isEulerBase(node: MathNode): boolean {
	return node.type === 'constant' && node.constant === 'euler';
}

/** Valeur numérique d'un nœud sans variable ; null si non évaluable. */
function tryConstantValue(node: MathNode): number | null {
	return nodeNumber(node);
}

/** Valeur numérique (via `compile`, seul générateur sûr) ; null si non finie. */
function nodeNumber(node: MathNode): number | null {
	try {
		const value = compile(node)({});
		return typeof value === 'number' && Number.isFinite(value) ? value : null;
	} catch {
		return null;
	}
}

/**
 * Chemin historique : classification en polynôme à coefficients flottants.
 */
function solveClassifiedInequality(
	expr: MathNode,
	op: '>=' | '<=',
	bound: number,
	strict: boolean,
	variable: string
): Domain | null {
	const exprType = classifyExpression(expr, variable);

	switch (exprType.kind) {
		case 'linear':
			return solveLinearInequality(exprType.a, exprType.b, op, bound, strict, variable);

		case 'quadratic':
			return solveQuadraticInequality(
				exprType.a,
				exprType.b,
				exprType.c,
				op,
				bound,
				strict,
				variable
			);

		case 'cubic':
			return solveCubicInequality(
				exprType.a,
				exprType.b,
				exprType.c,
				exprType.d,
				op,
				bound,
				strict,
				variable
			);

		case 'quartic':
			return solveQuarticInequality(
				exprType.a,
				exprType.b,
				exprType.c,
				exprType.d,
				exprType.e,
				op,
				bound,
				strict,
				variable
			);

		case 'constant': {
			const satisfied = checkBound(exprType.value, op, bound, strict);
			return satisfied ? universalDomain() : { kind: 'empty' };
		}

		case 'complex':
			return null;
	}
}

/**
 * Check if a value satisfies a bound constraint.
 */
function checkBound(value: number, op: '>=' | '<=', bound: number, strict: boolean): boolean {
	if (op === '>=') {
		return strict ? value > bound : value >= bound;
	} else {
		return strict ? value < bound : value <= bound;
	}
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Try to evaluate a constant MathNode to a number.
 */
function tryEvaluateConstant(node: MathNode): number | null {
	if (node.type === 'number') {
		return parseFloat(node.value);
	}
	if (node.type === 'opposite' && node.operand.type === 'number') {
		return -parseFloat(node.operand.value);
	}
	if (node.type === 'constant') {
		return node.constant === 'pi' ? Math.PI : Math.E;
	}
	return null;
}

/**
 * Create an expression representing (expr - constant).
 */
function subtractConstant(expr: MathNode, constant: number): MathNode {
	return {
		type: 'subtraction',
		left: expr,
		right: { type: 'number', value: String(constant) }
	};
}
