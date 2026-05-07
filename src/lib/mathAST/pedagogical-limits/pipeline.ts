/**
 * Pedagogical Limits — Pipeline Orchestrator
 *
 * `generatePedagogicalLimitSteps(node, options)` is the public entry point.
 * It tries strategies in priority order, emitting top-level pedagogical steps
 * with sub-steps as needed. Each strategy returns either `null` (decline,
 * try next) or a list of top-level steps that should appear in the output.
 *
 * The pipeline is **independent** of `limits/evaluateLimit()` — empirical
 * testing in Phase 0 showed `evaluate()` does not produce pedagogical traces
 * (1–2 meta-steps describing the technique, never the sub-steps a teacher
 * would write at the board). Reuse from `limits/` is limited to detection
 * helpers (`matchKnownLimit`, `detectIndeterminateForm`, …).
 *
 * Strategy order :
 *
 * 1. **direct-substitution** — try `f(a)`. If finite, return the value.
 * 2. **known-limit** — pattern-match against `KNOWN_LIMITS` (sin x / x, …).
 * 3. **factorisation** (`0/0` form, division of polynomials) — synthetic
 *    division by `(x − a)` on numerator and denominator, then recurse on
 *    the simplified expression.
 * 4. **rationalisation** (`0/0` form, square roots in numerator) —
 *    multiply by conjugate, then recurse.
 * 5. **infinity-analysis** (approach is `±∞`, division of polynomials) —
 *    factor the dominant term in numerator and denominator, then conclude.
 * 6. **L'Hôpital** (sup only, `0/0` or `∞/∞`) — derivate numerator and
 *    denominator, then recurse. Locked behind `STRATEGIES_LIMITS.lycee.enableLhopital === false`.
 * 7. Throw `PedagogicalLimitNotImplemented` (caught by `correction-generator.ts`
 *    → silent fallback to Mode A).
 *
 * @module mathAST/pedagogical-limits/pipeline
 */

import type { MathNode } from '../types';
import type { LimitDirection, IndeterminateForm } from '../limits/types';
import { detectIndeterminateForm } from '../limits/indeterminate';
import { infinity } from '../factory';
import { matchKnownLimit, getKnownLimitValue } from '../limits/known-limits';
import {
	asPolynomial,
	buildLinearFactor,
	classifyApproach,
	divide,
	evaluateAtPoint,
	findConjugate,
	formatApproachShort,
	formatLinearFactor,
	isAtInfinity,
	isDivision,
	isNumber,
	multiply,
	normalizeDirection,
	number,
	numericNode,
	polyToNode,
	syntheticDivide
} from './helpers';
import type { PolynomialCoeffs } from './helpers';
import { PedagogicalLimitNotImplemented, STRATEGIES_LIMITS } from './types';
import type {
	LimitBindings,
	LimitGenerationStrategy,
	LimitsSchoolLevel,
	PedagogicalLimitOptions,
	PedagogicalLimitResult,
	PedagogicalLimitRule,
	PedagogicalLimitStatus,
	PedagogicalLimitStep
} from './types';

// =============================================================================
// Internal context
// =============================================================================

/**
 * Mutable id generator shared across the recursion.
 */
interface IdGen {
	next: number;
}

interface PipelineContext {
	readonly variable: string;
	readonly approach: MathNode;
	readonly direction: LimitDirection;
	readonly level: LimitsSchoolLevel;
	readonly strategy: LimitGenerationStrategy;
	readonly globalBefore: MathNode;
	readonly idGen: IdGen;
}

function buildContext(
	expression: MathNode,
	options: PedagogicalLimitOptions,
	level: LimitsSchoolLevel
): PipelineContext {
	// TODO(Phase 3) — `options.verbosity`, `options.signal`, `options.timeoutMs`
	// are accepted by the public API but not yet honoured here. Wire them in
	// when the renderer (Phase 3) starts filtering on `step.verbosityLevel`.
	return {
		variable: options.variable,
		approach: options.approach,
		direction: normalizeDirection(options.direction),
		level,
		strategy: STRATEGIES_LIMITS[level],
		globalBefore: expression,
		idGen: { next: 1 }
	};
}

// =============================================================================
// Step builder
// =============================================================================

interface StepInit {
	readonly rule: PedagogicalLimitRule;
	readonly description: string;
	readonly before: MathNode;
	readonly after: MathNode;
	readonly verbosityLevel?: PedagogicalLimitStep['verbosityLevel'];
	readonly bindings?: LimitBindings;
	readonly indeterminateForm?: IndeterminateForm;
	readonly subSteps?: readonly PedagogicalLimitStep[];
	readonly globalAfter?: MathNode;
}

function makeStep(ctx: PipelineContext, init: StepInit): PedagogicalLimitStep {
	return {
		id: ctx.idGen.next++,
		rule: init.rule,
		description: init.description,
		before: init.before,
		after: init.after,
		verbosityLevel: init.verbosityLevel ?? 'summarized',
		variable: ctx.variable,
		approach: ctx.approach,
		direction: ctx.direction,
		globalBefore: ctx.globalBefore,
		...(init.globalAfter && { globalAfter: init.globalAfter }),
		...(init.bindings && { bindings: init.bindings }),
		...(init.indeterminateForm && { indeterminateForm: init.indeterminateForm }),
		...(init.subSteps && init.subSteps.length > 0 && { subSteps: init.subSteps })
	};
}

// =============================================================================
// School-level guard
// =============================================================================

function ensureSupportedLevel(
	expression: MathNode,
	options: PedagogicalLimitOptions
): LimitsSchoolLevel {
	if (options.schoolLevel === 'primaire' || options.schoolLevel === 'college') {
		throw new PedagogicalLimitNotImplemented(
			expression,
			`limits not in syllabus before Terminale (got: ${options.schoolLevel})`
		);
	}
	return options.schoolLevel;
}

// =============================================================================
// Strategy result
// =============================================================================

/**
 * Output of a strategy attempt.
 *
 * - `null` : strategy declined (try next).
 * - object : strategy succeeded ; the pipeline returns these steps + value.
 */
type StrategyResult = {
	readonly steps: readonly PedagogicalLimitStep[];
	readonly value: MathNode | null;
	readonly status: PedagogicalLimitStatus;
	readonly indeterminateForm: IndeterminateForm;
} | null;

// =============================================================================
// Public entry point
// =============================================================================

/**
 * Generate pedagogical limit-evaluation steps.
 *
 * Throws `PedagogicalLimitNotImplemented` when:
 * - `schoolLevel === 'primaire' | 'college'`
 * - All strategies decline (no factorisation root, no known-limit pattern, …)
 * - L'Hôpital required at lycée (locked behind strategy table)
 *
 * Otherwise returns a `PedagogicalLimitResult` with the recorded steps, the
 * limit value (or `null` for `'does-not-exist'`), and the terminal status.
 */
export function generatePedagogicalLimitSteps(
	expression: MathNode,
	options: PedagogicalLimitOptions
): PedagogicalLimitResult {
	const level = ensureSupportedLevel(expression, options);
	const ctx = buildContext(expression, options, level);

	const headerSteps = ctx.strategy.includeIdentify ? [emitIdentifyLimit(ctx, expression)] : [];

	// Strategy 1 — direct substitution
	const direct = tryDirectSubstitution(expression, ctx);
	if (direct !== null) {
		return finalize(ctx, [...headerSteps, ...direct.steps], direct);
	}

	// Strategy 2 — known limit
	const known = tryKnownLimit(expression, ctx);
	if (known !== null) {
		return finalize(ctx, [...headerSteps, ...known.steps], known);
	}

	// Detect indeterminate form (drives the next strategies)
	const indForm = detectIndeterminateForm(expression, ctx.variable, ctx.approach, ctx.direction);

	// Strategy 3 — factorisation (0/0 with division of polynomials)
	if (ctx.strategy.enableFactorization && indForm === '0/0' && isDivision(expression)) {
		const factored = tryFactorisation(expression, ctx, indForm);
		if (factored !== null) {
			return finalize(ctx, [...headerSteps, ...factored.steps], factored);
		}
	}

	// Strategy 4 — rationalisation (0/0 with sqrt in numerator)
	if (ctx.strategy.enableRationalization && indForm === '0/0' && isDivision(expression)) {
		const rationalised = tryRationalisation(expression, ctx, indForm);
		if (rationalised !== null) {
			return finalize(ctx, [...headerSteps, ...rationalised.steps], rationalised);
		}
	}

	// Strategy 5 — infinity-analysis (approach = ±∞, division of polynomials)
	if (ctx.strategy.enableInfinityAnalysis && isAtInfinity(ctx.approach) && isDivision(expression)) {
		const infRes = tryInfinityAnalysis(expression, ctx);
		if (infRes !== null) {
			return finalize(ctx, [...headerSteps, ...infRes.steps], infRes);
		}
	}

	// Nothing worked. At lycée this routinely means a case that would have
	// required L'Hôpital ; surface the constraint in the error message.
	const reason =
		indForm === '0/0' && !ctx.strategy.enableLhopital
			? "0/0 form requires L'Hôpital (out of lycée syllabus) or a technique not yet implemented"
			: `no strategy applied for indeterminate form '${indForm}'`;
	throw new PedagogicalLimitNotImplemented(expression, reason);
}

// =============================================================================
// Identification
// =============================================================================

function emitIdentifyLimit(ctx: PipelineContext, expression: MathNode): PedagogicalLimitStep {
	const approachStr = formatApproachShort(ctx.approach);
	const description = `On veut calculer la limite de l'expression quand ${ctx.variable} tend vers ${approachStr}`;
	return makeStep(ctx, {
		rule: 'identify-limit',
		description,
		before: expression,
		after: expression,
		verbosityLevel: 'detailed'
	});
}

// =============================================================================
// Strategy: direct substitution
// =============================================================================

function tryDirectSubstitution(expression: MathNode, ctx: PipelineContext): StrategyResult {
	// Skip when approaching infinity — direct substitution makes no sense.
	if (isAtInfinity(ctx.approach)) return null;
	if (!isNumber(ctx.approach)) return null;

	const aValue = parseFloat(ctx.approach.value);
	if (!Number.isFinite(aValue)) return null;

	const value = evaluateAtPoint(expression, ctx.variable, aValue);
	if (value === null || !Number.isFinite(value)) return null;

	const valueNode = numericNode(value);

	const step = makeStep(ctx, {
		rule: 'apply-direct-substitution',
		description: `Substitution directe : on remplace ${ctx.variable} par ${ctx.approach.value}`,
		before: expression,
		after: valueNode,
		verbosityLevel: 'summarized',
		bindings: { a: ctx.approach },
		globalAfter: valueNode
	});

	const conclusion = makeConclusionStep(ctx, expression, valueNode);

	return {
		steps: [step, ...(conclusion ? [conclusion] : [])],
		value: valueNode,
		status: 'exact',
		indeterminateForm: 'none'
	};
}

// =============================================================================
// Strategy: known limit
// =============================================================================

function tryKnownLimit(expression: MathNode, ctx: PipelineContext): StrategyResult {
	const entry = matchKnownLimit(expression, ctx.approach, ctx.variable, ctx.direction);
	if (!entry) return null;

	const value = getKnownLimitValue(entry, ctx.variable);

	const step = makeStep(ctx, {
		rule: 'apply-known-limit',
		description: entry.descriptionFr,
		before: expression,
		after: value,
		verbosityLevel: 'summarized',
		bindings: { pattern: entry.pattern, value },
		globalAfter: value
	});

	const conclusion = makeConclusionStep(ctx, expression, value);

	const status = inferStatusFromValue(value);

	return {
		steps: [step, ...(conclusion ? [conclusion] : [])],
		value,
		status,
		indeterminateForm: 'none'
	};
}

// =============================================================================
// Strategy: factorisation (0/0 division of polynomials)
// =============================================================================

function tryFactorisation(
	expression: MathNode,
	ctx: PipelineContext,
	indForm: IndeterminateForm,
	depth = 0
): StrategyResult {
	if (!isDivision(expression)) return null;
	if (!isNumber(ctx.approach)) return null;
	const a = parseFloat(ctx.approach.value);
	if (!Number.isFinite(a)) return null;

	const numCoeffs = asPolynomial(expression.numerator, ctx.variable);
	const denCoeffs = asPolynomial(expression.denominator, ctx.variable);
	if (!numCoeffs || !denCoeffs) return null;

	// Both must have `a` as a root (consistent with 0/0 indForm).
	if (!isPolynomialRoot(numCoeffs, a) || !isPolynomialRoot(denCoeffs, a)) return null;

	const { quotient: numQuot } = syntheticDivide(numCoeffs, a);
	const { quotient: denQuot } = syntheticDivide(denCoeffs, a);

	const numAfter = polyToNode(numQuot, ctx.variable);
	const denAfter = polyToNode(denQuot, ctx.variable);
	const factor = buildLinearFactor(ctx.variable, a);

	// Sub-step: factor the numerator
	const factorNumStep = makeStep(ctx, {
		rule: 'factor-numerator',
		description: `Factorisation du numérateur : ${formatLinearFactor(ctx.variable, a)} est un facteur`,
		before: expression.numerator,
		after: multiply(factor, numAfter, 'implicit'),
		verbosityLevel: 'detailed',
		bindings: { factor }
	});

	// Sub-step: factor the denominator
	const factorDenStep = makeStep(ctx, {
		rule: 'factor-denominator',
		description: `Factorisation du dénominateur : ${formatLinearFactor(ctx.variable, a)} est un facteur`,
		before: expression.denominator,
		after: multiply(factor, denAfter, 'implicit'),
		verbosityLevel: 'detailed',
		bindings: { factor }
	});

	// Detect-indeterminate-form (sub-step decoration before factorisation)
	const detectStep = makeStep(ctx, {
		rule: 'detect-indeterminate-form',
		description: `Forme indéterminée ${indForm} reconnue`,
		before: expression,
		after: expression,
		verbosityLevel: 'detailed',
		indeterminateForm: indForm
	});

	// Parent: simplify-common-factor
	const simplified: MathNode = divide(numAfter, denAfter, 'fraction');
	const parentStep = makeStep(ctx, {
		rule: 'simplify-common-factor',
		description: `Simplification : on divise numérateur et dénominateur par ${formatLinearFactor(ctx.variable, a)}`,
		before: expression,
		after: simplified,
		verbosityLevel: 'summarized',
		bindings: { factor },
		subSteps: [factorNumStep, factorDenStep]
	});

	// Recurse on the simplified expression — usually direct substitution now works.
	const recursed = recurse(simplified, ctx, depth + 1);
	const allSteps = [detectStep, parentStep, ...recursed.steps];

	return {
		steps: allSteps,
		value: recursed.value,
		status: recursed.status,
		indeterminateForm: indForm
	};
}

function isPolynomialRoot(coeffs: PolynomialCoeffs, a: number): boolean {
	// Horner: evaluate the polynomial at `a` and check if the result is 0.
	let acc = 0;
	for (let i = coeffs.length - 1; i >= 0; i--) acc = acc * a + coeffs[i];
	return Math.abs(acc) < 1e-10;
}

// =============================================================================
// Strategy: rationalisation (0/0 with sqrt in numerator)
// =============================================================================

/**
 * Multiply numerator and denominator by the conjugate of the numerator to
 * lift a `0/0` indeterminate form involving square roots.
 *
 * Iconic Tle case : `(√(x+1) − 1) / x` at x → 0.
 *
 *   Step 1: detect 0/0
 *   Step 2 (parent): multiply by (√(x+1) + 1)/(√(x+1) + 1)
 *     → numerator becomes (x+1) − 1 = x
 *     → denominator becomes x · (√(x+1) + 1)
 *   Step 3: factor out the common (x − a) ; simplify-after-rationalization
 *     → 1 / (√(x+1) + 1)
 *   Step 4: substitute x = 0 → 1/2
 *
 * The simplified form is fed back to `recurse()` which closes the limit
 * via direct substitution (or a further factorisation pass if needed).
 *
 * The inline simplification of the `(x − a)` factor IS necessary :
 * without it, the rationalised form `x / (x · g(x))` retombe sur 0/0
 * and the polynomial-only `tryFactorisation` declines (denominator
 * contains a sqrt and is not a polynomial).
 */
function tryRationalisation(
	expression: MathNode,
	ctx: PipelineContext,
	indForm: IndeterminateForm,
	depth = 0
): StrategyResult {
	if (!isDivision(expression)) return null;
	if (!isNumber(ctx.approach)) return null;
	const a = parseFloat(ctx.approach.value);
	if (!Number.isFinite(a)) return null;

	const conjugateInfo = findConjugate(expression.numerator);
	if (!conjugateInfo) return null;

	const { conjugate, expanded } = conjugateInfo;

	// Simplify the common (x − a) factor between `expanded` and the original
	// denominator. Required because the rationalised form `expanded /
	// (originalDenom · conjugate)` is typically still 0/0 at x = a (both
	// `expanded(a)` and `originalDenom(a)` are 0), and the polynomial-only
	// factorisation strategy can't help (denominator contains a sqrt).
	const expandedCoeffs = asPolynomial(expanded, ctx.variable);
	const originalDenomCoeffs = asPolynomial(expression.denominator, ctx.variable);
	if (!expandedCoeffs || !originalDenomCoeffs) return null;
	if (!isPolynomialRoot(expandedCoeffs, a)) return null;
	if (!isPolynomialRoot(originalDenomCoeffs, a)) return null;

	const { quotient: expandedQuot } = syntheticDivide(expandedCoeffs, a);
	const { quotient: originalDenomQuot } = syntheticDivide(originalDenomCoeffs, a);

	const newNum = polyToNode(expandedQuot, ctx.variable);
	const newDen = multiply(polyToNode(originalDenomQuot, ctx.variable), conjugate, 'implicit');
	const simplified = divide(newNum, newDen, 'fraction');

	// detect-indeterminate-form (informational decoration)
	const detectStep = makeStep(ctx, {
		rule: 'detect-indeterminate-form',
		description: `Forme indéterminée ${indForm} reconnue (présence d'une racine carrée)`,
		before: expression,
		after: expression,
		verbosityLevel: 'detailed',
		indeterminateForm: indForm
	});

	// Sub-step: simplify-after-rationalization (factors out the (x − a) cancellation)
	const simplifyStep = makeStep(ctx, {
		rule: 'simplify-after-rationalization',
		description: `Simplification du facteur commun ${formatLinearFactor(ctx.variable, a)} après rationalisation`,
		before: divide(expanded, multiply(expression.denominator, conjugate, 'implicit'), 'fraction'),
		after: simplified,
		verbosityLevel: 'detailed'
	});

	// Parent: multiply-by-conjugate (with the simplification sub-step nested inside)
	const multiplyStep = makeStep(ctx, {
		rule: 'multiply-by-conjugate',
		description: 'Multiplication du numérateur et du dénominateur par le conjugué',
		before: expression,
		after: simplified,
		verbosityLevel: 'summarized',
		bindings: { conjugate },
		subSteps: [simplifyStep]
	});

	// Recurse on the simplified form — direct substitution is now the closer.
	const recursed = recurse(simplified, ctx, depth + 1);

	return {
		steps: [detectStep, multiplyStep, ...recursed.steps],
		value: recursed.value,
		status: recursed.status,
		indeterminateForm: indForm
	};
}

// =============================================================================
// Strategy: infinity-analysis
// =============================================================================

function tryInfinityAnalysis(expression: MathNode, ctx: PipelineContext): StrategyResult {
	if (!isDivision(expression)) return null;

	const numCoeffs = asPolynomial(expression.numerator, ctx.variable);
	const denCoeffs = asPolynomial(expression.denominator, ctx.variable);
	if (!numCoeffs || !denCoeffs) return null;
	if (numCoeffs.length === 0 || denCoeffs.length === 0) return null;

	const numDeg = numCoeffs.length - 1;
	const denDeg = denCoeffs.length - 1;
	const numLead = numCoeffs[numDeg];
	const denLead = denCoeffs[denDeg];

	// The dominant term node — informational binding.
	const dominantNode =
		numDeg >= denDeg
			? buildDominantTerm(numLead, numDeg, ctx.variable)
			: buildDominantTerm(denLead, denDeg, ctx.variable);

	const detectStep = makeStep(ctx, {
		rule: 'identify-dominant-term',
		description: `Étude du comportement à ${formatApproachShort(ctx.approach)} : on identifie les termes dominants au numérateur et au dénominateur`,
		before: expression,
		after: expression,
		verbosityLevel: 'detailed',
		bindings: { dominant: dominantNode }
	});

	let value: MathNode;
	let status: PedagogicalLimitStatus;
	let conclusionDesc: string;

	if (numDeg < denDeg) {
		// Goes to 0
		value = number('0');
		status = 'exact';
		conclusionDesc = `Le degré du numérateur (${numDeg}) est strictement inférieur à celui du dénominateur (${denDeg}) : la limite vaut 0`;
	} else if (numDeg > denDeg) {
		// Goes to ±∞ ; sign depends on coefficient ratio and approach sign
		const sign = signAtInfinity(numLead, denLead, numDeg - denDeg, ctx.approach);
		value = sign > 0 ? infinity('positive') : infinity('negative');
		status = 'infinite';
		conclusionDesc = `Le degré du numérateur (${numDeg}) dépasse celui du dénominateur (${denDeg}) : la limite est ${sign > 0 ? '+∞' : '−∞'}`;
	} else {
		// Same degree → ratio of leading coefficients
		const ratio = numLead / denLead;
		value = numericNode(ratio);
		status = 'exact';
		conclusionDesc = `Les degrés sont égaux (${numDeg}) : la limite est le quotient des coefficients dominants ${numLead} / ${denLead} = ${formatNumber(ratio)}`;
	}

	const conclusionStep = makeStep(ctx, {
		rule: status === 'infinite' ? 'conclude-infinite' : 'conclude',
		description: conclusionDesc,
		before: expression,
		after: value,
		verbosityLevel: 'summarized',
		globalAfter: value
	});

	return {
		steps: [detectStep, conclusionStep],
		value,
		status,
		// `∞/∞` is a *true* indeterminate form only when both num and den go to
		// infinity AND the resolution requires more than dominant-term sniffing.
		// For `numDeg < denDeg` the limit is trivially 0 (not indeterminate),
		// for `numDeg === denDeg` it is the ratio of leading coefficients (not
		// indeterminate). Only the `numDeg > denDeg` case is genuinely `∞/∞`
		// (the dominant term identification is what resolves it).
		indeterminateForm: numDeg > denDeg ? '∞/∞' : 'none'
	};
}

function signAtInfinity(
	numLead: number,
	denLead: number,
	degDelta: number,
	approach: MathNode
): number {
	const baseSign = Math.sign(numLead) * Math.sign(denLead);
	if (classifyApproach(approach) === 'positive-infinity') return baseSign;
	// Approaching −∞ : the dominant term `x^degDelta` flips sign iff degDelta is odd.
	const flip = degDelta % 2 === 1 ? -1 : 1;
	return baseSign * flip;
}

function buildDominantTerm(coeff: number, degree: number, varName: string): MathNode {
	const coeffs = new Array<number>(degree + 1).fill(0);
	coeffs[degree] = coeff;
	return polyToNode(coeffs, varName);
}

function formatNumber(x: number): string {
	if (Number.isInteger(x)) return String(x);
	return String(Number(x.toFixed(6)));
}

// =============================================================================
// Recursion + conclusion helpers
// =============================================================================

/**
 * Recursive sub-pipeline : invoked by composite strategies (factorisation,
 * rationalisation, …) to evaluate the simplified expression.
 *
 * Reuses the parent context (variable / approach / direction / level /
 * strategy / idGen) so step IDs remain unique and deductions stay coherent.
 *
 * Returns `{ steps, value, status }`.
 */
function recurse(
	expression: MathNode,
	ctx: PipelineContext,
	depth = 0
): {
	readonly steps: readonly PedagogicalLimitStep[];
	readonly value: MathNode | null;
	readonly status: PedagogicalLimitStatus;
} {
	// Hard depth cap to prevent infinite recursion on pathological inputs
	// (a strategy producing the same indeterminate form repeatedly).
	if (depth > 3) {
		throw new PedagogicalLimitNotImplemented(
			expression,
			`recursion depth exceeded (${depth}) — pipeline aborted to avoid infinite loop`
		);
	}

	// After a sub-strategy (factorisation, rationalisation), direct
	// substitution is the most common closer.
	const direct = tryDirectSubstitution(expression, ctx);
	if (direct !== null) {
		return { steps: direct.steps, value: direct.value, status: direct.status };
	}

	// Then known-limit pattern matching.
	const known = tryKnownLimit(expression, ctx);
	if (known !== null) {
		return { steps: known.steps, value: known.value, status: known.status };
	}

	// If the residual still has an indeterminate form, cascade : factorisation
	// after rationalisation is the standard closer for `(√a − b)/c` cases
	// (the rationalised numerator and denominator share a `(x − a)` factor).
	const indForm = detectIndeterminateForm(expression, ctx.variable, ctx.approach, ctx.direction);
	if (ctx.strategy.enableFactorization && indForm === '0/0' && isDivision(expression)) {
		const factored = tryFactorisation(expression, ctx, indForm, depth + 1);
		if (factored !== null) {
			return { steps: factored.steps, value: factored.value, status: factored.status };
		}
	}

	throw new PedagogicalLimitNotImplemented(
		expression,
		'no strategy applied after recursion (unexpected — file an issue if this fires on a Tle case)'
	);
}

function makeConclusionStep(
	ctx: PipelineContext,
	expression: MathNode,
	value: MathNode
): PedagogicalLimitStep | null {
	if (ctx.strategy.verbosityCompactConclusion) return null;

	if (value.type === 'infinity') {
		return makeStep(ctx, {
			rule: 'conclude-infinite',
			description: `La limite vaut ${formatApproachShort(value)}`,
			before: expression,
			after: value,
			verbosityLevel: 'summarized',
			globalAfter: value
		});
	}

	return makeStep(ctx, {
		rule: 'conclude',
		description: `La limite vaut ${formatNodeShort(value)}`,
		before: expression,
		after: value,
		verbosityLevel: 'summarized',
		globalAfter: value
	});
}

function formatNodeShort(node: MathNode): string {
	if (isNumber(node)) return node.value;
	if (node.type === 'opposite' && isNumber(node.operand)) return `−${node.operand.value}`;
	if (node.type === 'infinity') return formatApproachShort(node);
	return '…';
}

function inferStatusFromValue(value: MathNode | null): PedagogicalLimitStatus {
	if (value === null) return 'does-not-exist';
	if (value.type === 'infinity') return 'infinite';
	return 'exact';
}

// =============================================================================
// Finalize
// =============================================================================

function finalize(
	ctx: PipelineContext,
	steps: readonly PedagogicalLimitStep[],
	res: NonNullable<StrategyResult>
): PedagogicalLimitResult {
	return {
		steps,
		value: res.value,
		status: res.status,
		indeterminateForm: res.indeterminateForm,
		variable: ctx.variable,
		approach: ctx.approach,
		direction: ctx.direction
	};
}
