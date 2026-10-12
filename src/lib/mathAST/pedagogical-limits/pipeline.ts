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
import { infinity, opposite, power, variable as makeVariable } from '../factory';
import { differentiate } from '../differentiation/differentiate';
import { matchKnownLimit, getKnownLimitValue } from '../limits/known-limits';
import { normalizeApproach } from '../limits/evaluate';
import { isInfinity as isInfinityNode } from '../guards';
import {
	classifyApproach,
	divide,
	divideByCommonRoot,
	evaluateAtPoint,
	findConjugate,
	formatApproachShort,
	formatLinearFactor,
	formatValueShort,
	isAtInfinity,
	isDivision,
	isNumber,
	multiply,
	normalizeDirection,
	number,
	numericNode
} from './helpers';
import { extractExactRational } from '../common/numeric';
import { tryEvaluateLimitExact, resultToNode } from '../limits/exact-evaluation';
import { compile } from '../eval/compile';
import { normalize, denormalize, hashNormalForm } from '../normal';
import type { NormalForm, NormalTerm, Rational } from '../normal';
import { divRational, mulRational, rational, rationalToNumber } from '../normal/rational';
import { rationalToNode } from '../common/numeric';
import {
	type Poly,
	divideOutCommonRoot,
	polynomialNode,
	primitivePart,
	rationalPolynomialNode,
	toPolynomial
} from '../factor';
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
		approach: infinityApproach(options.approach),
		direction: normalizeDirection(options.direction),
		level,
		strategy: STRATEGIES_LIMITS[level],
		globalBefore: expression,
		idGen: { next: 1 }
	};
}

/**
 * La borne `+\\infty` d'un `\\lim` parsé (`positive(symbole ∞)`) devient le nœud
 * `infinity` qu'attendent les stratégies ; sans quoi aucune ne la reconnaissait
 * (« no strategy », V26). Une borne finie est rendue telle quelle.
 */
function infinityApproach(approach: MathNode): MathNode {
	const normalized = normalizeApproach(approach);
	return isInfinityNode(normalized) ? normalized : approach;
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
	// (un polynôme aussi : P / 1, V26)
	if (ctx.strategy.enableInfinityAnalysis && isAtInfinity(ctx.approach)) {
		const infRes = tryInfinityAnalysis(expression, ctx);
		if (infRes !== null) {
			return finalize(ctx, [...headerSteps, ...infRes.steps], infRes);
		}
	}

	// Strategy 6 — L'Hôpital (sup uniquement, 0/0 or ∞/∞)
	if (
		ctx.strategy.enableLhopital &&
		(indForm === '0/0' || indForm === '∞/∞') &&
		isDivision(expression)
	) {
		const lhopital = tryLhopital(expression, ctx, indForm);
		if (lhopital !== null) {
			return finalize(ctx, [...headerSteps, ...lhopital.steps], lhopital);
		}
	}

	// Strategy 7 — one-sided / vertical asymptotes (singular point with finite
	// approach). Detected when direct substitution yielded null (singularity)
	// AND the residual is not 0/0 nor ∞/∞ (those cascaded through 3-4-5 above).
	if (!isAtInfinity(ctx.approach)) {
		const oneSided = tryOneSided(expression, ctx);
		if (oneSided !== null) {
			return finalize(ctx, [...headerSteps, ...oneSided.steps], oneSided);
		}
	}

	// Strategy 8 — squeeze / théorème des gendarmes (heuristique numérique :
	// expression bornée tendant vers 0 quand x → a). Activée pour les cas
	// type x·sin(1/x), x²·cos(1/x), …
	if (ctx.strategy.enableSqueeze && !isAtInfinity(ctx.approach)) {
		const squeezed = trySqueeze(expression, ctx);
		if (squeezed !== null) {
			return finalize(ctx, [...headerSteps, ...squeezed.steps], squeezed);
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
	const aValue = approachNumber(ctx.approach);
	if (aValue === null) return null;

	const value = evaluateAtPoint(expression, ctx.variable, aValue);
	if (value === null || !Number.isFinite(value)) return null;

	const valueNode = exactValueAt(expression, ctx, value) ?? numericNode(value);

	const step = makeStep(ctx, {
		rule: 'apply-direct-substitution',
		description: `Substitution directe : on remplace ${ctx.variable} par ${formatApproachShort(ctx.approach)}`,
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

/**
 * La valeur EXACTE de l'expression au point, par l'évaluation exacte de
 * `limits/` (`\\dfrac{3}{2}`, `\\sqrt{2}`), ou `null` si elle échoue ou ne
 * retombe pas sur la valeur flottante (V21 : « La limite vaut 1.5 »).
 */
function exactValueAt(expression: MathNode, ctx: PipelineContext, value: number): MathNode | null {
	const result = tryEvaluateLimitExact(expression, ctx.variable, ctx.approach, 'both');
	const raw = result === null ? null : resultToNode(result);
	if (raw === null || raw.type === 'infinity') return null;
	try {
		// Forme réduite : `\\dfrac{2}{6}` → `\\dfrac{1}{3}`, `\\dfrac{-1}{4}` → `-\\dfrac{1}{4}`
		const node = denormalize(normalize(raw));
		const exact = compile(node)({});
		const tolerance = 1e-9 * Math.max(1, Math.abs(value));
		return Math.abs(exact - value) <= tolerance ? node : null;
	} catch {
		return null;
	}
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
	const a = extractExactRational(ctx.approach);
	if (a === null) return null;

	// Both must have `a` as a root (consistent with 0/0 indForm). Le facteur
	// est le facteur ENTIER du noyau (`2x − 1` en 1/2, comme un élève) et la
	// fraction restante est réduite (`(2x + 2)/2` → `x + 1`) : V23.
	const num = toPolynomial(expression.numerator, ctx.variable);
	const den = toPolynomial(expression.denominator, ctx.variable);
	if (num === null || den === null) return null;
	const division = divideOutCommonRoot(num, den, a);
	if (division === null) return null;

	const x = makeVariable(ctx.variable);
	const factor = polynomialNode(division.factor, x);

	// Sub-step: factor the numerator
	const factorNumStep = makeStep(ctx, {
		rule: 'factor-numerator',
		description: `Factorisation du numérateur : ${formatLinearFactor(ctx.variable, a)} est un facteur`,
		before: expression.numerator,
		after: timesFactor(factor, division.numerator, x),
		verbosityLevel: 'detailed',
		bindings: { factor }
	});

	// Sub-step: factor the denominator
	const factorDenStep = makeStep(ctx, {
		rule: 'factor-denominator',
		description: `Factorisation du dénominateur : ${formatLinearFactor(ctx.variable, a)} est un facteur`,
		before: expression.denominator,
		after: timesFactor(factor, division.denominator, x),
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
	const simplified = overDenominator(
		rationalPolynomialNode(division.reducedNumerator, x),
		rationalPolynomialNode(division.reducedDenominator, x)
	);
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

/**
 * (q·x − p)·Q écrit comme un élève : la constante DEVANT (`3(2x − 1)`,
 * `\\dfrac{1}{2}(2x − 1)`), `-(2x − 1)` pour −1, jamais `(1)` ni `-1(…)` ; un
 * quotient à coefficients rationnels sort son contenu (`\\dfrac{1}{4}(2x − 1)(2x + 1)`).
 */
function timesFactor(factor: MathNode, quotient: Poly, x: MathNode): MathNode {
	const integer = quotient.every((c) => c.d === 1n);
	const { content, primitive } = integer
		? { content: rational(1n, 1n), primitive: quotient.map((c) => c.n) }
		: primitivePart(quotient);
	const isConstant = primitive.length === 1;
	// Le nombre total devant : le contenu × la constante entière éventuelle
	const lead = isConstant ? mulRational(content, rational(primitive[0], 1n)) : content;
	const body = isConstant ? factor : multiply(factor, polynomialNode(primitive, x), 'implicit');
	if (lead.n === 1n && lead.d === 1n) return body;
	if (lead.n === -1n && lead.d === 1n) return opposite(body);
	return multiply(rationalToNode(lead), body, 'implicit');
}

/** n/d, sans le dénominateur 1 */
function overDenominator(numerator: MathNode, denominator: MathNode): MathNode {
	return isOneNode(denominator) ? numerator : divide(numerator, denominator, 'fraction');
}

/** Valeur du point d'approche rationnel (négatif compris : un `opposite`, L26), ou null */
function approachNumber(approach: MathNode): number | null {
	const a = extractExactRational(approach);
	return a === null ? null : rationalToNumber(a);
}

function isOneNode(node: MathNode): boolean {
	return isNumber(node) && node.value === '1';
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
	const a = extractExactRational(ctx.approach);
	if (a === null) return null;

	const conjugateInfo = findConjugate(expression.numerator);
	if (!conjugateInfo) return null;

	const { conjugate, expanded } = conjugateInfo;

	// Simplify the common (x − a) factor between `expanded` and the original
	// denominator. Required because the rationalised form `expanded /
	// (originalDenom · conjugate)` is typically still 0/0 at x = a (both
	// `expanded(a)` and `originalDenom(a)` are 0), and the polynomial-only
	// factorisation strategy can't help (denominator contains a sqrt).
	const quotients = divideByCommonRoot(expanded, expression.denominator, ctx.variable, a);
	if (quotients === null) return null;

	const newNum = quotients.numerator;
	const newDen = isOneNode(quotients.denominator)
		? conjugate
		: multiply(quotients.denominator, conjugate, 'implicit');
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
// Strategy: L'Hôpital (sup uniquement)
// =============================================================================

/**
 * Apply L'Hôpital's rule for `0/0` or `∞/∞` indeterminate forms : derive
 * numerator and denominator with respect to the variable, then recurse on
 * the new quotient.
 *
 * **Sup uniquement** — locked behind `STRATEGIES_LIMITS.lycee.enableLhopital
 * === false`. The pipeline checks this gate before calling.
 *
 * Reuses the algorithmic `differentiate()` orchestrator from
 * `differentiation/`. Pedagogical sub-derivations (showing each step of
 * `f'(x)`) are **not** generated here — the L'Hôpital step focuses on the
 * limit logic and treats the derivatives as black-box symbols. Authors who
 * need the full derivative trace can invoke `kind: 'differentiate'` on
 * the same expression separately.
 *
 * Limitations V1.1.c :
 * - Single-pass : recurses once on `f'/g'`. If the residual is still 0/0
 *   or ∞/∞, the recursion will hit `tryLhopital` again via the depth-limited
 *   `recurse()` cascade (same depth budget as factorisation/rationalisation).
 * - No protection against the `f' = 0` AND `g' = 0` corner case (would
 *   require iterative L'Hôpital with derivative-of-derivative, deferred to V1.2).
 */
function tryLhopital(
	expression: MathNode,
	ctx: PipelineContext,
	indForm: IndeterminateForm,
	depth = 0
): StrategyResult {
	if (!isDivision(expression)) return null;

	let numDeriv: MathNode;
	let denDeriv: MathNode;
	try {
		numDeriv = differentiate(expression.numerator, { variable: ctx.variable, simplify: true });
		denDeriv = differentiate(expression.denominator, { variable: ctx.variable, simplify: true });
	} catch {
		// `differentiate` may throw on unsupported nodes ; decline silently
		// so the pipeline can fall through to other strategies.
		return null;
	}

	const newQuotient = divide(numDeriv, denDeriv, 'fraction');

	// detect-indeterminate-form (informational decoration)
	const detectStep = makeStep(ctx, {
		rule: 'detect-indeterminate-form',
		description: `Forme indéterminée ${indForm} reconnue`,
		before: expression,
		after: expression,
		verbosityLevel: 'detailed',
		indeterminateForm: indForm
	});

	// Parent: apply-lhopital
	const lhopitalStep = makeStep(ctx, {
		rule: 'apply-lhopital',
		description:
			indForm === '0/0'
				? "Application de la règle de L'Hôpital : (0/0) ⇒ lim f/g = lim f'/g'"
				: "Application de la règle de L'Hôpital : (∞/∞) ⇒ lim f/g = lim f'/g'",
		before: expression,
		after: newQuotient,
		verbosityLevel: 'summarized',
		bindings: { numeratorDerivative: numDeriv, denominatorDerivative: denDeriv }
	});

	// Recurse on f'/g' — direct substitution is the typical closer.
	const recursed = recurse(newQuotient, ctx, depth + 1);

	return {
		steps: [detectStep, lhopitalStep, ...recursed.steps],
		value: recursed.value,
		status: recursed.status,
		indeterminateForm: indForm
	};
}

// =============================================================================
// Strategy: infinity-analysis
// =============================================================================

function tryInfinityAnalysis(expression: MathNode, ctx: PipelineContext): StrategyResult {
	// Un polynôme se lit comme le quotient P / 1 : même terme dominant.
	const numerator = isDivision(expression) ? expression.numerator : expression;
	const numLead = dominantTerm(numerator, ctx.variable);
	const denLead = isDivision(expression)
		? dominantTerm(expression.denominator, ctx.variable)
		: CONSTANT_ONE_TERM;
	if (numLead === null || denLead === null) return null;

	const numDeg = numLead.degree;
	const denDeg = denLead.degree;
	const isPolynomial = !isDivision(expression);

	// The dominant term node — informational binding.
	const dominantNode = numDeg >= denDeg ? numLead.node : denLead.node;

	// Une constante (5, π, 5/2) : une seule étape, sans degrés ni coefficients dominants.
	if (numDeg === 0 && denDeg === 0) {
		const constant = exactQuotient(numLead, denLead, ctx);
		if (constant === null) return null;
		const step = makeStep(ctx, {
			rule: 'conclude',
			description: `La fonction est constante : sa limite vaut ${formatValueShort(constant)}.`,
			before: expression,
			after: constant,
			verbosityLevel: 'summarized',
			globalAfter: constant
		});
		return { steps: [step], value: constant, status: 'exact', indeterminateForm: 'none' };
	}

	let value: MathNode;
	let status: PedagogicalLimitStatus;
	let conclusionDesc: string;

	if (numDeg < denDeg) {
		// Degré du numérateur plus petit : la limite vaut 0
		value = number('0');
		status = 'exact';
		conclusionDesc = `Le degré du numérateur (${numDeg}) est strictement inférieur à celui du dénominateur (${denDeg}) : la limite vaut 0`;
	} else if (numDeg > denDeg) {
		// Limite infinie : son signe dépend des coefficients dominants et du côté (±∞).
		// Un signe qui ne se lit pas exactement ((π − 4)x) : on s'abstient.
		if (numLead.sign === null || denLead.sign === null) return null;
		const sign = signAtInfinity(numLead.sign * denLead.sign, numDeg - denDeg, ctx.approach);
		value = sign > 0 ? infinity('positive') : infinity('negative');
		status = 'infinite';
		const limitText = sign > 0 ? '+∞' : '−∞';
		conclusionDesc = isPolynomial
			? `Une fonction polynôme a la même limite à ${formatApproachShort(ctx.approach)} que son terme de plus haut degré (degré ${numDeg}) : la limite est ${limitText}`
			: `Le degré du numérateur (${numDeg}) dépasse celui du dénominateur (${denDeg}) : la limite est ${limitText}`;
	} else {
		// Degrés égaux : quotient EXACT des coefficients dominants (V26).
		const ratio = exactQuotient(numLead, denLead, ctx);
		if (ratio === null) return null;
		value = ratio;
		status = 'exact';
		conclusionDesc = `Les degrés sont égaux (${numDeg}) : la limite est le quotient des coefficients dominants ${formatValueShort(numLead.coefficient)} / ${formatValueShort(denLead.coefficient)} = ${formatValueShort(ratio)}`;
	}

	const detectStep = makeStep(ctx, {
		rule: 'identify-dominant-term',
		description: isPolynomial
			? `Étude du comportement à ${formatApproachShort(ctx.approach)} : on identifie le terme de plus haut degré`
			: `Étude du comportement à ${formatApproachShort(ctx.approach)} : on identifie les termes dominants au numérateur et au dénominateur`,
		before: expression,
		after: expression,
		verbosityLevel: 'detailed',
		bindings: { dominant: dominantNode }
	});

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
		// (the dominant term identification is what resolves it). Un polynôme
		// n'est pas un quotient : pas de forme `∞/∞`.
		indeterminateForm: numDeg > denDeg && !isPolynomial ? '∞/∞' : 'none'
	};
}

/**
 * Terme dominant c·x^d d'un polynôme, coefficient EXACT (V26) :
 * - `rational` : coefficient rationnel, lu par le noyau `factor/` (sur ℚ) ;
 * - sinon `coefficient` est une constante exacte (π, √2, π/2…) lue dans la
 *   forme normale, `rational` vaut `null`.
 * `sign` vaut `null` quand le signe ne se lit pas exactement (π − 4).
 */
interface DominantTerm {
	readonly degree: number;
	readonly coefficient: MathNode;
	readonly rational: Rational | null;
	readonly sign: 1 | -1 | null;
	/** c·x^d, pour la liaison `dominant` */
	readonly node: MathNode;
}

const CONSTANT_ONE_TERM: DominantTerm = {
	degree: 0,
	coefficient: number('1'),
	rational: rational(1n, 1n),
	sign: 1,
	node: number('1')
};

function dominantTerm(expr: MathNode, variable: string): DominantTerm | null {
	const poly = toPolynomial(expr, variable);
	if (poly !== null) {
		if (poly.length === 0) return null;
		const degree = poly.length - 1;
		const lead = poly[degree];
		const monomial: Rational[] = Array.from({ length: degree + 1 }, () => rational(0n, 1n));
		monomial[degree] = lead;
		return {
			degree,
			coefficient: rationalToNode(lead),
			rational: lead,
			sign: lead.n < 0n ? -1 : 1,
			node: rationalPolynomialNode(monomial, makeVariable(variable))
		};
	}
	return irrationalDominantTerm(expr, variable);
}

/**
 * Coefficients constants non rationnels (π x, √2 x³) : lecture dans la forme
 * normale. Refus (null) dès qu'un autre symbole que x et les constantes
 * apparaît, qu'un exposant de x n'est pas un entier naturel, ou que x reste au
 * dénominateur.
 */
function irrationalDominantTerm(expr: MathNode, variable: string): DominantTerm | null {
	let form: NormalForm;
	try {
		form = normalize(expr);
	} catch {
		return null;
	}
	const xDegree = (term: NormalTerm): number | null => {
		if (term.coefficient.terms.some((t) => t.hasImaginaryUnit)) return null;
		let degree = 0;
		for (const factor of term.monomial) {
			if (factor.base.type === 'constant') continue;
			if (factor.base.type !== 'variable' || factor.base.name !== variable) return null;
			if (factor.exponent.d !== 1n || factor.exponent.n < 0n) return null;
			degree = Number(factor.exponent.n);
		}
		return degree;
	};
	if (form.numerator.length === 0) return null;
	if (form.denominator.some((term) => xDegree(term) !== 0)) return null;
	const degrees = form.numerator.map(xDegree);
	const readDegrees = degrees.filter((d): d is number => d !== null);
	if (readDegrees.length !== degrees.length) return null;
	const degree = Math.max(...readDegrees);

	const leadTerms: NormalTerm[] = form.numerator
		.filter((_, k) => degrees[k] === degree)
		.map((term) => ({
			coefficient: term.coefficient,
			monomial: term.monomial.filter((f) => f.base.type !== 'variable')
		}));
	const leadForm: NormalForm = {
		numerator: leadTerms,
		denominator: form.denominator,
		hash: ''
	};
	const coefficient = denormalize({ ...leadForm, hash: hashNormalForm(leadForm) });
	const numSign = constantSign(leadTerms);
	const denSign = constantSign(form.denominator);
	const sign = numSign === null || denSign === null ? null : numSign === denSign ? 1 : -1;
	return {
		degree,
		coefficient,
		rational: null,
		sign,
		node: degree === 0 ? coefficient : multiply(coefficient, xPower(variable, degree), 'implicit')
	};
}

/**
 * Signe EXACT d'une somme de termes constants : un seul terme, un seul
 * rationnel (les radicaux, π et e sont positifs). Sinon null (π − 4).
 */
function constantSign(terms: readonly NormalTerm[]): 1 | -1 | null {
	if (terms.length !== 1 || terms[0].coefficient.terms.length !== 1) return null;
	return terms[0].coefficient.terms[0].rational.n < 0n ? -1 : 1;
}

function xPower(variable: string, degree: number): MathNode {
	const x = makeVariable(variable);
	return degree === 1 ? x : power(x, number(String(degree)));
}

/**
 * Quotient exact des coefficients dominants : sur ℚ (noyau `factor/`) quand
 * les deux sont rationnels ; sinon par l'évaluation exacte de `limits/`, qui
 * écrit la constante comme le moteur (`\\dfrac{\\pi}{2}`, `\\dfrac{1}{\\pi}`).
 */
function exactQuotient(
	num: DominantTerm,
	den: DominantTerm,
	ctx: PipelineContext
): MathNode | null {
	try {
		if (num.rational !== null && den.rational !== null) {
			// Forme réduite, comme la substitution directe : `\\dfrac{3}{2}`, `-2`
			return denormalize(normalize(rationalToNode(divRational(num.rational, den.rational))));
		}
		// Réduit d'abord par la forme normale (1/(−√2) → −½√2), puis réécrit par
		// l'évaluation exacte, comme le moteur : `\\dfrac{-\\sqrt{2}}{2}`, `2\\sqrt{2}`.
		const quotient = denormalize(normalize(divide(num.coefficient, den.coefficient, 'fraction')));
		const result = tryEvaluateLimitExact(quotient, ctx.variable, ctx.approach, 'both');
		const node = result === null ? null : resultToNode(result);
		return node === null || node.type === 'infinity' ? null : node;
	} catch {
		return null;
	}
}

function signAtInfinity(leadSign: number, degDelta: number, approach: MathNode): number {
	if (classifyApproach(approach) === 'positive-infinity') return leadSign;
	// Approaching −∞ : the dominant term `x^degDelta` flips sign iff degDelta is odd.
	const flip = degDelta % 2 === 1 ? -1 : 1;
	return leadSign * flip;
}

// =============================================================================
// Strategy: one-sided / vertical asymptotes
// =============================================================================

/** Magnitude beyond which we declare a numerical evaluation "divergent".
 *  Tuned for `1/x`-class poles probed with `ε = 1e−6` (gives `|val| ≈ 1e6`).
 *  10⁵ is large enough to skip numerical noise and small enough that
 *  `1/x`-class poles register, while finite-but-large limits (e.g. `e^{20} ≈ 5e8`)
 *  evaluated at smooth points stay below the bar at the probe distance. */
const DIVERGENCE_THRESHOLD = 1e5;

/** Numeric epsilon used to probe `a ± ε` and detect divergence by sign. */
const ONE_SIDED_EPSILON = 1e-6;

/**
 * Singular-point analysis : when the expression is undefined at the approach
 * point but defined on at least one side, classify the limit as `+∞`, `−∞`,
 * or `does-not-exist`.
 *
 * V1.1.b scope : numerical heuristic on `expression(a ± ε)`. Covers the
 * iconic Tle cases :
 *
 * - `1/x` à `0⁺`         → `+∞`
 * - `1/x` à `0⁻`         → `−∞`
 * - `1/x` à `0` (both)   → does-not-exist (signs opposés)
 * - `1/x²` à `0` (both)  → `+∞` (mêmes signes)
 * - `1/(x−1)²` à `1`     → `+∞`
 *
 * Limitations V1.1.b :
 * - Lent à diverger (e.g. `ln(x)` à `0⁺`) : peut être manqué selon le
 *   threshold. Acceptable pour V1.1.
 * - Faux positif théorique sur des fonctions à très forte croissance
 *   finie. Très improbable en pratique.
 */
function tryOneSided(expression: MathNode, ctx: PipelineContext): StrategyResult {
	const a = approachNumber(ctx.approach);
	if (a === null) return null;

	// Defined at the approach point ? Direct substitution would have caught
	// it ; declining lets the upstream throw NotImplemented for genuinely
	// unsupported cases.
	const valAtA = evaluateAtPoint(expression, ctx.variable, a);
	if (valAtA !== null && Number.isFinite(valAtA)) return null;

	// Probe each side numerically.
	const leftVal = evaluateAtPoint(expression, ctx.variable, a - ONE_SIDED_EPSILON);
	const rightVal = evaluateAtPoint(expression, ctx.variable, a + ONE_SIDED_EPSILON);

	const leftSign = classifyDivergence(leftVal);
	const rightSign = classifyDivergence(rightVal);

	const wantBoth = ctx.direction === 'both';
	const wantLeft = ctx.direction === 'left' || wantBoth;
	const wantRight = ctx.direction === 'right' || wantBoth;

	// At least one requested side must diverge for this strategy to apply.
	if (wantLeft && wantRight) {
		if (leftSign === 0 && rightSign === 0) return null;
	} else if (wantLeft && leftSign === 0) {
		return null;
	} else if (wantRight && rightSign === 0) {
		return null;
	}

	const steps: PedagogicalLimitStep[] = [];

	const leftStep = wantLeft
		? makeStep(ctx, {
				rule: 'analyze-left-limit',
				description: `Étude de la limite à gauche en ${a} : ${describeSide(leftSign, ctx.variable, a, '−')}`,
				before: expression,
				after: signNodeFromSign(leftSign),
				verbosityLevel: 'detailed',
				bindings: { side: { type: 'variable', name: 'left' } as MathNode }
			})
		: null;
	const rightStep = wantRight
		? makeStep(ctx, {
				rule: 'analyze-right-limit',
				description: `Étude de la limite à droite en ${a} : ${describeSide(rightSign, ctx.variable, a, '+')}`,
				before: expression,
				after: signNodeFromSign(rightSign),
				verbosityLevel: 'detailed',
				bindings: { side: { type: 'variable', name: 'right' } as MathNode }
			})
		: null;

	if (leftStep) steps.push(leftStep);
	if (rightStep) steps.push(rightStep);

	let value: MathNode;
	let status: PedagogicalLimitStatus;
	let conclusionRule: PedagogicalLimitRule;
	let conclusionDesc: string;

	if (wantBoth) {
		if (leftSign !== 0 && rightSign !== 0 && leftSign === rightSign) {
			// Same divergence on both sides → infinite limit.
			value = signNodeFromSign(leftSign);
			status = 'infinite';
			conclusionRule = 'conclude-infinite';
			conclusionDesc = `Les limites à gauche et à droite tendent vers la même infinité : la limite vaut ${leftSign > 0 ? '+∞' : '−∞'}`;
			steps.push(
				makeStep(ctx, {
					rule: 'compare-one-sided',
					description: 'Comparaison des limites unilatérales : signes identiques',
					before: expression,
					after: value,
					verbosityLevel: 'detailed',
					bindings: { left: signNodeFromSign(leftSign), right: signNodeFromSign(rightSign) }
				})
			);
		} else if (leftSign !== rightSign) {
			// Opposite signs (or one-sided defined finite) → does-not-exist.
			value = number('0');
			status = 'does-not-exist';
			conclusionRule = 'conclude-does-not-exist';
			conclusionDesc =
				'Les limites à gauche et à droite diffèrent : la limite n’existe pas en ce point';
			steps.push(
				makeStep(ctx, {
					rule: 'compare-one-sided',
					description: 'Comparaison des limites unilatérales : signes différents',
					before: expression,
					after: expression,
					verbosityLevel: 'detailed',
					bindings: {
						left: signNodeFromSign(leftSign),
						right: signNodeFromSign(rightSign)
					}
				})
			);
			// `does-not-exist` signals null value at the result level.
			return {
				steps,
				value: null,
				status,
				indeterminateForm: 'none'
			};
		} else {
			return null;
		}
	} else {
		// One-sided request : pick the matching side.
		const sign = ctx.direction === 'left' ? leftSign : rightSign;
		if (sign === 0) return null;
		value = signNodeFromSign(sign);
		status = 'infinite';
		conclusionRule = 'conclude-infinite';
		conclusionDesc = `La limite à ${ctx.direction === 'left' ? 'gauche' : 'droite'} vaut ${sign > 0 ? '+∞' : '−∞'}`;
	}

	steps.push(
		makeStep(ctx, {
			rule: conclusionRule,
			description: conclusionDesc,
			before: expression,
			after: value,
			verbosityLevel: 'summarized',
			globalAfter: value
		})
	);

	return { steps, value, status, indeterminateForm: 'none' };
}

/** Numeric divergence classifier. Returns +1, −1, or 0 (= not divergent). */
function classifyDivergence(val: number | null): number {
	if (val === null || !Number.isFinite(val)) return 0;
	if (Math.abs(val) < DIVERGENCE_THRESHOLD) return 0;
	return val > 0 ? 1 : -1;
}

/** Build the `±∞` MathNode (or `0` when `sign === 0`, defensive default). */
function signNodeFromSign(sign: number): MathNode {
	if (sign > 0) return infinity('positive');
	if (sign < 0) return infinity('negative');
	return number('0');
}

function describeSide(
	sign: number,
	_variable: string,
	_approach: number,
	sideMark: string
): string {
	if (sign === 0) return `valeur finie (${sideMark})`;
	return sign > 0 ? `+∞ (${sideMark})` : `−∞ (${sideMark})`;
}

// =============================================================================
// Strategy: squeeze / théorème des gendarmes
// =============================================================================

/** Probe distances for the squeeze numerical heuristic. Decreasing scales
 *  let us check both boundedness (max value at coarse) and convergence to 0
 *  (max value at fine). */
const SQUEEZE_PROBES: readonly number[] = [1e-2, 1e-3, 1e-4, 1e-5];

/** Maximum allowed magnitude across all probes (boundedness check). Tuned
 *  for `bounded(x) × x^k` patterns where bounded ≤ ~10 (covers sin/cos and
 *  small composite functions). */
const SQUEEZE_BOUNDED_THRESHOLD = 100;

/** Maximum allowed magnitude at the finest probe (convergence check). The
 *  expression must be at most this far from 0 at `ε = 1e-5`. */
const SQUEEZE_CONVERGENCE_THRESHOLD = 1e-2;

/**
 * Théorème des gendarmes (squeeze) — heuristique numérique restreinte.
 *
 * Cas iconiques Tle / sup :
 *
 * - `x · sin(1/x)` à x → 0 : `−|x| ≤ x sin(1/x) ≤ |x|`, donc → 0
 * - `x² · cos(1/x)` à x → 0 : `−|x²| ≤ x² cos(1/x) ≤ x²`, donc → 0
 *
 * Heuristique : si `evaluate(a)` est null (singularité ou indeterminée),
 * et que `evaluate(a ± ε)` reste borné (≤ 100) à toutes les échelles
 * probées, ET tend vers 0 (≤ 10⁻²) à la plus fine échelle, on conclut
 * que la limite est 0 par encadrement.
 *
 * Vocabulary adaptive : `'gendarmes'` au lycée, `'squeeze'` au sup.
 *
 * Limitations V1.1.d :
 * - Ne couvre que la limite `0` (pas les cas `f → ℓ ≠ 0` où l'encadrement
 *   serait `ℓ − ε ≤ g ≤ ℓ + ε`).
 * - Faux positif théorique sur fonctions à très petite oscillation
 *   (e.g. `sin(x)/x²` qui est NaN à 0 mais oscille avec magnitude `1/x²` —
 *   probe à `ε = 1e-5` donne `|sin(1e-5)/1e-10| ≈ 1e5` : rejeté par le
 *   threshold de boundedness).
 */
function trySqueeze(expression: MathNode, ctx: PipelineContext): StrategyResult {
	const a = approachNumber(ctx.approach);
	if (a === null) return null;

	// Direct-sub doit avoir échoué upstream (sinon on ne tombe pas ici).
	const valAtA = evaluateAtPoint(expression, ctx.variable, a);
	if (valAtA !== null && Number.isFinite(valAtA)) return null;

	// Restreindre aux cas pédagogiquement « gendarmes » : on exige la
	// présence d'une fonction bornée (sin/cos/tan) dont l'argument diverge
	// au point étudié. Sans ce garde, l'heuristique numérique attrape des
	// cas qui sont en réalité de la known-limit ou de la factorisation
	// (e.g. sin(x²)/x à 0, dont la limite vaut 0 mais ne se prouve pas
	// par encadrement au lycée).
	if (!hasBoundedFactorWithDivergentArg(expression, ctx.variable, a)) return null;

	// Probe à plusieurs distances décroissantes des deux côtés.
	const allProbes: number[] = [];
	for (const eps of SQUEEZE_PROBES) {
		const left = evaluateAtPoint(expression, ctx.variable, a - eps);
		const right = evaluateAtPoint(expression, ctx.variable, a + eps);
		if (left === null || !Number.isFinite(left)) return null;
		if (right === null || !Number.isFinite(right)) return null;
		allProbes.push(left, right);
	}

	// Boundedness : aucune valeur ne diverge.
	const maxAbs = Math.max(...allProbes.map(Math.abs));
	if (maxAbs > SQUEEZE_BOUNDED_THRESHOLD) return null;

	// Convergence : à la plus fine échelle (eps = 1e-5), |valeur| < 10⁻².
	const finestPair = allProbes.slice(-2).map(Math.abs);
	if (Math.max(...finestPair) > SQUEEZE_CONVERGENCE_THRESHOLD) return null;

	const value = number('0');
	const vocab = ctx.strategy.squeezeVocab;
	const theoremName = vocab === 'gendarmes' ? 'des gendarmes' : "d'encadrement (squeeze)";

	const identifyStep = makeStep(ctx, {
		rule: 'identify-bounds',
		description: "Encadrement de l'expression par deux fonctions tendant vers 0",
		before: expression,
		after: expression,
		verbosityLevel: 'detailed'
	});

	const squeezeStep = makeStep(ctx, {
		rule: 'apply-squeeze',
		description: `Application du théorème ${theoremName} : la limite vaut 0`,
		before: expression,
		after: value,
		verbosityLevel: 'summarized',
		bindings: { commonLimit: value },
		globalAfter: value
	});

	return {
		steps: [identifyStep, squeezeStep],
		value,
		status: 'exact',
		indeterminateForm: 'none'
	};
}

/**
 * `true` if `expr` contains at least one bounded-function call (`sin`,
 * `cos`, `tan`, `abs`) whose argument diverges or oscillates at the
 * approach point — i.e. `evaluateAtPoint(arg, varName, a)` returns null
 * or non-finite. This is the pedagogical signal that "encadrement" is
 * the right approach.
 */
function hasBoundedFactorWithDivergentArg(expr: MathNode, varName: string, a: number): boolean {
	if (expr.type === 'delimiter') return hasBoundedFactorWithDivergentArg(expr.content, varName, a);

	if (expr.type === 'function') {
		const name = expr.name.toLowerCase();
		if (name === 'sin' || name === 'cos' || name === 'tan' || name === 'abs') {
			const arg = expr.args[0];
			if (arg) {
				const argVal = evaluateAtPoint(arg, varName, a);
				if (argVal === null || !Number.isFinite(argVal)) return true;
			}
		}
	}

	if (expr.type === 'multiplication' || expr.type === 'addition' || expr.type === 'subtraction') {
		return (
			hasBoundedFactorWithDivergentArg(expr.left, varName, a) ||
			hasBoundedFactorWithDivergentArg(expr.right, varName, a)
		);
	}

	if (expr.type === 'division') {
		return (
			hasBoundedFactorWithDivergentArg(expr.numerator, varName, a) ||
			hasBoundedFactorWithDivergentArg(expr.denominator, varName, a)
		);
	}

	if (expr.type === 'superscript') {
		return hasBoundedFactorWithDivergentArg(expr.base, varName, a);
	}

	if (expr.type === 'opposite' || expr.type === 'positive') {
		return hasBoundedFactorWithDivergentArg(expr.operand, varName, a);
	}

	return false;
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

	// L'Hôpital cascade (sup) — for residual 0/0 or ∞/∞ that factorisation
	// can't lift (e.g. transcendental expressions).
	if (
		ctx.strategy.enableLhopital &&
		(indForm === '0/0' || indForm === '∞/∞') &&
		isDivision(expression)
	) {
		const lhopital = tryLhopital(expression, ctx, indForm, depth + 1);
		if (lhopital !== null) {
			return { steps: lhopital.steps, value: lhopital.value, status: lhopital.status };
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
	return formatValueShort(node);
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
