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
 *    Puis le **côté implicite** : sans côté demandé, une expression définie
 *    d'un seul côté du point (`\\ln x` en 0) est étudiée de ce côté.
 * 2. **known-limit** — pattern-match against `KNOWN_LIMITS` (sin x / x, …),
 *    `e^u` lu comme `\\exp(u)` (l'écriture de la table).
 * 3. **factorisation** (`0/0` form, division of polynomials) — synthetic
 *    division by `(x − a)` on numerator and denominator, then recurse on
 *    the simplified expression.
 * 4. **rationalisation** (`0/0` form, square roots in numerator) —
 *    multiply by conjugate, then recurse.
 * 5. **infinity-analysis** (approach is `±∞`, division of polynomials) —
 *    factor the dominant term in numerator and denominator, then conclude.
 * 5 bis. **composée** `e^u` — limite de u, puis de l'exponentielle (`e^{1/x}` en 0⁺).
 * 6. **L'Hôpital** (sup only, `0/0` or `∞/∞`) — derivate numerator and
 *    denominator, then recurse. Locked behind `STRATEGIES_LIMITS.lycee.enableLhopital === false`.
 * 7. **one-sided** — un pôle : limites à gauche et à droite, puis conclusion
 *    (égales : la valeur ; différentes : « la limite n'existe pas »).
 * 8. **squeeze** — théorème des gendarmes.
 * 9. Throw `PedagogicalLimitNotImplemented` (caught by `correction-generator.ts`
 *    → silent fallback to Mode A).
 *
 * Prose (descriptions) : formules entre `$…$`, en LaTeX (V25, 2026-10-14).
 *
 * @module mathAST/pedagogical-limits/pipeline
 */

import type { DivisionNode, MathNode } from '../types';
import type { LimitDirection, IndeterminateForm } from '../limits/types';
import { detectIndeterminateForm } from '../limits/indeterminate';
import {
	add,
	euler,
	infinity,
	opposite,
	parentheses,
	power,
	subtract,
	variable as makeVariable
} from '../factory';
import { toLatex } from '../latex-generator';
import { containsVariable } from '../common/contains-variable';
import { getChildren } from '../transforms';
import { differentiate } from '../differentiation/differentiate';
import { matchKnownLimit, getKnownLimitValue } from '../limits/known-limits';
import { normalizeApproach } from '../limits/evaluate';
import {
	isAddition,
	isDelimiter,
	isInfinity as isInfinityNode,
	isMultiplication,
	isOpposite,
	isPositive,
	isSubtraction,
	isSuperscript,
	isVariable
} from '../guards';
import {
	approachMath,
	classifyApproach,
	divide,
	divideByCommonRoot,
	evaluateAtPoint,
	findConjugate,
	formMath,
	inlineMath,
	isAtInfinity,
	isDivision,
	isNumber,
	multiply,
	normalizeDirection,
	number,
	numericNode,
	toKnownLimitShape,
	withEulerPowers
} from './helpers';
import { extractExactRational } from '../common/numeric';
import { tryEvaluateLimitExact, resultToNode, writeLimitValue } from '../limits/exact-evaluation';
import { compile } from '../eval/compile';
import { normalize, denormalize, hashNormalForm, canonicalForm } from '../normal';
import type { NormalForm, NormalTerm, Rational } from '../normal';
import {
	absRational,
	divRational,
	mulRational,
	rational,
	rationalToNumber
} from '../normal/rational';
import { rationalToNode } from '../common/numeric';
import {
	type Poly,
	divideOutCommonRoot,
	integerLinearFactorNode,
	polynomialNode,
	primitivePart,
	rationalPolynomialNode,
	toPolynomial
} from '../factor';
import { inDecimalRegister, stepsInRegister } from './decimal-register';
import { hasDecimalLiteral } from '../tidy/decimal';
import { PedagogicalLimitNotImplemented, STRATEGIES_LIMITS } from './types';
import type {
	LimitBindings,
	LimitGenerationStrategy,
	LimitLine,
	TermLimits,
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
	/** Côté étudié par l'étape, quand il diffère de celui de la limite (à gauche, à droite). */
	readonly direction?: LimitDirection;
	/** Limites des termes (étape `limits-of-terms`) */
	readonly termLimits?: TermLimits;
	/** Écritures intermédiaires entre `before` et `after` */
	readonly chain?: readonly MathNode[];
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
		direction: init.direction ?? ctx.direction,
		globalBefore: ctx.globalBefore,
		...(init.globalAfter && { globalAfter: init.globalAfter }),
		...(init.bindings && { bindings: init.bindings }),
		...(init.indeterminateForm && { indeterminateForm: init.indeterminateForm }),
		...(init.termLimits && { termLimits: init.termLimits }),
		...(init.chain && init.chain.length > 0 && { chain: init.chain }),
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
	const result = runStrategies(expression, ctx);
	return finalize(ctx, stepsInRegister([...headerSteps, ...result.steps], expression), result);
}

/**
 * Les stratégies, dans l'ordre ; la première qui aboutit donne les étapes.
 * Lève `PedagogicalLimitNotImplemented` quand aucune n'aboutit.
 */
function runStrategies(expression: MathNode, ctx: PipelineContext): NonNullable<StrategyResult> {
	// Strategy 1 — direct substitution
	const direct = tryDirectSubstitution(expression, ctx);
	if (direct !== null) return direct;

	// Côté implicite : `\\ln x` en 0 n'est définie qu'à droite, la limite en 0
	// est la limite à droite (le calcul de `limits/` dit −∞, les étapes aussi).
	const implicit = tryImplicitSide(expression, ctx);
	if (implicit !== null) return implicit;

	// Strategy 2 — known limit
	const known = tryKnownLimit(expression, ctx);
	if (known !== null) return known;

	// Detect indeterminate form (drives the next strategies)
	const indForm = detectIndeterminateForm(expression, ctx.variable, ctx.approach, ctx.direction);

	// Strategy 3 — factorisation (0/0 with division of polynomials)
	if (ctx.strategy.enableFactorization && indForm === '0/0' && isDivision(expression)) {
		const factored = tryFactorisation(expression, ctx, indForm);
		if (factored !== null) return factored;
	}

	// Strategy 4 — rationalisation (0/0 with sqrt in numerator)
	if (ctx.strategy.enableRationalization && indForm === '0/0' && isDivision(expression)) {
		const rationalised = tryRationalisation(expression, ctx, indForm);
		if (rationalised !== null) return rationalised;
	}

	// Strategy 5 — infinity-analysis (approach = ±∞, division of polynomials)
	// (un polynôme aussi : P / 1, V26)
	if (ctx.strategy.enableInfinityAnalysis && isAtInfinity(ctx.approach)) {
		const infRes = tryInfinityAnalysis(expression, ctx);
		if (infRes !== null) return infRes;
	}

	// Composée e^{u} : limite de u, puis celle de l'exponentielle (`e^{1/x}` en 0⁺)
	if (ctx.strategy.enableComposition) {
		const composed = tryExponentialComposition(expression, ctx);
		if (composed !== null) return composed;
	}

	// Strategy 6 — L'Hôpital (sup uniquement, 0/0 or ∞/∞)
	if (
		ctx.strategy.enableLhopital &&
		(indForm === '0/0' || indForm === '∞/∞') &&
		isDivision(expression)
	) {
		const lhopital = tryLhopital(expression, ctx, indForm);
		if (lhopital !== null) return lhopital;
	}

	// Strategy 7 — one-sided / vertical asymptotes (singular point with finite
	// approach). Detected when direct substitution yielded null (singularity)
	// AND the residual is not 0/0 nor ∞/∞ (those cascaded through 3-4-5 above).
	if (!isAtInfinity(ctx.approach)) {
		const oneSided = tryOneSided(expression, ctx);
		if (oneSided !== null) return oneSided;
	}

	// Strategy 8 — squeeze / théorème des gendarmes (heuristique numérique :
	// expression bornée tendant vers 0 quand x → a). Activée pour les cas
	// type x·sin(1/x), x²·cos(1/x), …
	if (ctx.strategy.enableSqueeze && !isAtInfinity(ctx.approach)) {
		const squeezed = trySqueeze(expression, ctx);
		if (squeezed !== null) return squeezed;
	}

	// Nothing worked. At lycée this routinely means a case that would have
	// required L'Hôpital ; surface the constraint in the error message.
	const reason =
		indForm === '0/0' && !ctx.strategy.enableLhopital
			? "0/0 form requires L'Hôpital (out of lycée syllabus) or a technique not yet implemented"
			: `no strategy applied for indeterminate form '${indForm}'`;
	throw new PedagogicalLimitNotImplemented(expression, reason);
}

/**
 * La limite d'un côté seul, calculée par le pipeline lui-même (même niveau,
 * mêmes identifiants), avec ses étapes — la conclusion ôtée : l'appelant
 * conclut lui-même. `null` quand elle ne se calcule pas ou n'existe pas.
 */
function sideLimit(
	expression: MathNode,
	ctx: PipelineContext,
	direction: LimitDirection
): { readonly value: MathNode; readonly steps: readonly PedagogicalLimitStep[] } | null {
	try {
		const side = runStrategies(expression, { ...ctx, direction, globalBefore: expression });
		if (side.status === 'does-not-exist' || side.value === null) return null;
		return { value: side.value, steps: side.steps.filter((s) => !CONCLUSION_RULES.has(s.rule)) };
	} catch (error) {
		if (error instanceof PedagogicalLimitNotImplemented) return null;
		throw error;
	}
}

const CONCLUSION_RULES: ReadonlySet<PedagogicalLimitRule> = new Set([
	'conclude',
	'conclude-infinite',
	'conclude-does-not-exist'
]);

// =============================================================================
// Côté implicite (domaine d'un seul côté du point)
// =============================================================================

/** Distances des sondes du côté implicite : le domaine s'arrête au point. */
const DOMAIN_PROBES: readonly number[] = [1e-2, 1e-4, 1e-6];

/**
 * Sans côté demandé, en un point fini : l'expression n'est définie (près du
 * point) que d'un côté — `\\ln x` en 0, `\\sqrt{x}` exclu (définie en 0, la
 * substitution directe l'a prise). La limite en ce point est celle de ce côté :
 * une étape le dit, puis les stratégies tournent sur ce côté.
 */
function tryImplicitSide(expression: MathNode, ctx: PipelineContext): StrategyResult {
	if (ctx.direction !== 'both' || isAtInfinity(ctx.approach)) return null;
	const a = approachNumber(ctx.approach);
	if (a === null) return null;
	const defined = (x: number): boolean => {
		const value = evaluateAtPoint(expression, ctx.variable, x);
		return value !== null && Number.isFinite(value);
	};
	const leftDefined = DOMAIN_PROBES.some((eps) => defined(a - eps));
	const rightDefined = DOMAIN_PROBES.every((eps) => defined(a + eps));
	const onlyRight = !leftDefined && rightDefined;
	const onlyLeft =
		!DOMAIN_PROBES.some((eps) => defined(a + eps)) &&
		DOMAIN_PROBES.every((eps) => defined(a - eps));
	if (!onlyRight && !onlyLeft) return null;

	const direction: LimitDirection = onlyRight ? 'right' : 'left';
	const sideCtx: PipelineContext = { ...ctx, direction };
	const sideName = onlyRight ? 'droite' : 'gauche';
	const step = makeStep(sideCtx, {
		rule: onlyRight ? 'analyze-right-limit' : 'analyze-left-limit',
		description: `L'expression n'est définie qu'à ${sideName} de ${inlineMath(ctx.approach)} : on étudie la limite à ${sideName}`,
		before: expression,
		after: expression,
		verbosityLevel: 'summarized',
		direction,
		bindings: { domainBoundary: ctx.approach }
	});
	const rest = runStrategies(expression, sideCtx);
	// Le côté étudié par un pôle (`\\ln x / x` en 0) : une seule étape « à
	// droite », qui porte les deux raisons (domaine, puis signe du dénominateur).
	const [first, ...others] = rest.steps;
	if (first?.rule === step.rule) {
		const merged: PedagogicalLimitStep = {
			...first,
			bindings: { ...first.bindings, domainBoundary: ctx.approach }
		};
		return { ...rest, steps: [merged, ...others] };
	}
	return { ...rest, steps: [step, ...rest.steps] };
}

// =============================================================================
// Identification
// =============================================================================

function emitIdentifyLimit(ctx: PipelineContext, expression: MathNode): PedagogicalLimitStep {
	const description = `On veut calculer la limite de l'expression quand $${ctx.variable}$ tend vers ${approachMath(ctx.approach, ctx.direction)}`;
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
	// `x^x` en 0 : JavaScript calcule 0⁰ = 1, mais l'expression n'est pas
	// définie au point (forme 0⁰) — pas de « continue au point étudié ».
	if (hasZeroPowerZero(expression, ctx.variable, aValue)) return null;

	const valueNode = exactValueAt(expression, ctx, value) ?? numericNode(value);

	const step = makeStep(ctx, {
		rule: 'apply-direct-substitution',
		description: `Substitution directe : on remplace $${ctx.variable}$ par ${inlineMath(ctx.approach)}`,
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

/** Une puissance dont la base et l'exposant valent 0 au point (forme 0⁰) */
function hasZeroPowerZero(expr: MathNode, variable: string, a: number): boolean {
	if (
		isSuperscript(expr) &&
		evaluateAtPoint(expr.base, variable, a) === 0 &&
		evaluateAtPoint(expr.superscript, variable, a) === 0
	) {
		return true;
	}
	return getChildren(expr).some((child) => hasZeroPowerZero(child, variable, a));
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
		const node = canonicalForm(raw);
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
	// La table écrit `\\exp(x)` ; l'élève écrit `e^x` (et des parenthèses)
	const entry = matchKnownLimit(
		toKnownLimitShape(expression),
		ctx.approach,
		ctx.variable,
		ctx.direction
	);
	if (!entry) return null;

	// `\\exp(1)` s'écrit e, `\\exp(u)` s'écrit `e^{u}`
	const value = withEulerPowers(getKnownLimitValue(entry, ctx.variable));

	const step = makeStep(ctx, {
		rule: 'apply-known-limit',
		// Le titre nomme la famille ; la formule est dans le bloc LaTeX de l'étape
		description: knownLimitKind(entry.descriptionFr),
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

/**
 * La famille d'une limite de référence, pour le titre : « Croissance
 * comparée », « Limite fondamentale », sinon « Limite de référence » (la
 * `descriptionFr` de la table est en Unicode, hors de la prose).
 */
function knownLimitKind(descriptionFr: string): string {
	if (descriptionFr.startsWith('Croissance comparée')) return 'Croissance comparée';
	if (descriptionFr.startsWith('Limite fondamentale')) return 'Limite fondamentale';
	return 'Limite de référence';
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

	// Sous-étapes : factoriser numérateur et dénominateur. Un côté qui EST déjà
	// le facteur (`x - 1` en 1) n'a rien à factoriser : pas de « x − 1 = x − 1 ».
	const factorSubSteps: PedagogicalLimitStep[] = [];
	const factoredNumerator = timesFactor(factor, division.numerator, x);
	const factoredDenominator = timesFactor(factor, division.denominator, x);
	const sides = [
		{
			rule: 'factor-numerator',
			name: 'numérateur',
			node: expression.numerator,
			factored: factoredNumerator
		},
		{
			rule: 'factor-denominator',
			name: 'dénominateur',
			node: expression.denominator,
			factored: factoredDenominator
		}
	] as const;
	for (const side of sides) {
		const factored = side.factored;
		if (sameShown(side.node, factored, ctx)) continue;
		factorSubSteps.push(
			makeStep(ctx, {
				rule: side.rule,
				description: `Factorisation du ${side.name} : ${inlineMath(factor)} est un facteur`,
				before: side.node,
				after: factored,
				verbosityLevel: 'detailed',
				bindings: { factor }
			})
		);
	}

	// Detect-indeterminate-form (sub-step decoration before factorisation)
	const detectStep = makeStep(ctx, {
		rule: 'detect-indeterminate-form',
		description: `Forme indéterminée ${formMath(indForm)} reconnue`,
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
		description: `Simplification : on divise numérateur et dénominateur par ${inlineMath(factor)}`,
		before: expression,
		after: simplified,
		verbosityLevel: 'summarized',
		bindings: { factor },
		subSteps: factorSubSteps,
		chain: factorisationChain(expression, factoredNumerator, factoredDenominator, ctx)
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

/**
 * Les lignes entre le quotient et sa simplification (Q45, David,
 * 2026-10-24) : développé, quand l'écriture tapée ne l'est pas
 * (`\dfrac{(x+1)^2 - 1}{x}` → `\dfrac{x^2 + 2x}{x}`), puis factorisé
 * (`\dfrac{x(x + 2)}{x}`) ; une ligne qui répéterait la précédente tombe.
 */
function factorisationChain(
	expression: DivisionNode,
	factoredNumerator: MathNode,
	factoredDenominator: MathNode,
	ctx: PipelineContext
): MathNode[] {
	const x = makeVariable(ctx.variable);
	const developedSide = (node: MathNode, factored: MathNode): MathNode => {
		// Déjà factorisé tapé (`x(x + 1)`) : rien à développer pour le refactoriser
		if (sameShown(node, factored, ctx)) return node;
		const side = readSide(node, ctx.variable);
		return side === null || side.expanded ? node : expandedNode(side, x);
	};
	const developed = overDenominator(
		developedSide(expression.numerator, factoredNumerator),
		developedSide(expression.denominator, factoredDenominator)
	);
	const factored = overDenominator(factoredNumerator, factoredDenominator);
	const chain: MathNode[] = [];
	if (!sameShown(developed, expression, ctx)) chain.push(developed);
	if (!sameShown(factored, chain.at(-1) ?? expression, ctx)) chain.push(factored);
	return chain;
}

/**
 * Même écriture À L'AFFICHAGE : quand l'expression tape un décimal, les
 * étapes passent en décimal (`decimal-register.ts`), `\dfrac{1}{2}x` et
 * `0,5x` s'affichent pareil.
 */
function sameShown(a: MathNode, b: MathNode, ctx: PipelineContext): boolean {
	if (!hasDecimalLiteral(ctx.globalBefore)) return sameWriting(a, b);
	return sameWriting(inDecimalRegister(a), inDecimalRegister(b));
}

/** Même écriture, aux parenthèses de la saisie près : `(x + 1)` et `x + 1` */
function sameWriting(a: MathNode, b: MathNode): boolean {
	return toLatex(withoutOuterDelimiters(a)) === toLatex(withoutOuterDelimiters(b));
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
		description: `Forme indéterminée ${formMath(indForm)} reconnue (présence d'une racine carrée)`,
		before: expression,
		after: expression,
		verbosityLevel: 'detailed',
		indeterminateForm: indForm
	});

	// Sub-step: simplify-after-rationalization (factors out the (x − a) cancellation)
	const simplifyStep = makeStep(ctx, {
		rule: 'simplify-after-rationalization',
		description: `Simplification du facteur commun ${inlineMath(integerLinearFactorNode(ctx.variable, a))} après rationalisation`,
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
// Strategy: composée e^{u}
// =============================================================================

/**
 * `e^{u}` (ou `\\exp(u)`) dont l'exposant dépend de x : limite de u (par le
 * pipeline, même côté), puis celle de l'exponentielle en cette limite —
 * `\\lim_{X \\to +\\infty} e^X = +\\infty`, `\\lim_{X \\to -\\infty} e^X = 0`,
 * `e^L` pour L fini. Cas iconique : `e^{1/x}` en 0⁺ (+∞) et en 0⁻ (0).
 * Refus (null) quand la limite de u ne se calcule pas ou n'existe pas.
 */
function tryExponentialComposition(expression: MathNode, ctx: PipelineContext): StrategyResult {
	const node = withoutOuterDelimiters(expression);
	const exponent =
		isSuperscript(node) && node.base.type === 'constant' && node.base.constant === 'euler'
			? node.superscript
			: node.type === 'function' && node.name === 'exp' && node.args.length === 1
				? node.args[0]
				: null;
	if (exponent === null || !containsVariable(exponent, ctx.variable)) return null;

	// Les étapes de la limite de l'exposant ne s'écrivent pas : la ligne
	// « \\lim u = L » de l'étape les résume.
	const innerLimit = sideLimit(exponent, ctx, ctx.direction)?.value ?? null;
	if (innerLimit === null) return null;
	const value = exponentialOf(innerLimit);

	const step = makeStep(ctx, {
		rule: 'apply-composition',
		description: `Limite d'une composée : ${inlineMath(value)}`,
		before: expression,
		after: value,
		verbosityLevel: 'summarized',
		bindings: { inner: exponent, innerLimit },
		termLimits: {
			premises: [{ expression: withoutOuterDelimiters(exponent), value: innerLimit }],
			conclusions: [{ expression, value }]
		},
		globalAfter: value
	});
	const conclusion = makeConclusionStep(ctx, expression, value);
	return {
		steps: [step, ...(conclusion ? [conclusion] : [])],
		value,
		status: inferStatusFromValue(value),
		indeterminateForm: 'none'
	};
}

/** La limite de e^X quand X tend vers L : +∞, 0, 1 (L = 0) ou e^L */
function exponentialOf(limit: MathNode): MathNode {
	if (limit.type === 'infinity') {
		return limit.sign === 'positive' ? infinity('positive') : number('0');
	}
	if (isNumber(limit) && limit.value === '0') return number('1');
	if (isNumber(limit) && limit.value === '1') return euler();
	return power(euler(), limit);
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
		description: `Forme indéterminée ${formMath(indForm)} reconnue`,
		before: expression,
		after: expression,
		verbosityLevel: 'detailed',
		indeterminateForm: indForm
	});

	// Parent: apply-lhopital
	const lhopitalStep = makeStep(ctx, {
		rule: 'apply-lhopital',
		description: `Application de la règle de L'Hôpital à la forme ${formMath(indForm)}`,
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
// Strategy: infinity-analysis — factorisation du terme prépondérant
// =============================================================================

/**
 * Limite en ±∞ d'un polynôme ou d'un quotient de polynômes, rédigée comme au
 * programme de Tle spé (BO 2019 : « la factorisation du terme prépondérant
 * dans une somme ») :
 *
 * 1. forme indéterminée (∞/∞, ou ∞ − ∞ dans une somme), quand il y en a une ;
 * 2. on développe, si l'expression ne l'est pas ;
 * 3. on factorise chaque somme par xⁿ (jamais par c·xⁿ) :
 *    `3x + 1 = x(3 + 1/x)` ;
 * 4. on simplifie par la plus petite puissance commune (quotient) ;
 * 5. limites des termes : `c/xᵏ → 0`, donc chaque parenthèse tend vers son
 *    premier terme ;
 * 6. limite d'un quotient ou d'un produit, puis conclusion.
 *
 * Au supérieur, la même factorisation sans les étapes 5 et 6. Une constante ou
 * un monôme seul : une seule étape. La VALEUR est calculée comme avant (quotient
 * exact des coefficients dominants, signe selon la parité) : les étapes ne font
 * que la rédiger.
 */
function tryInfinityAnalysis(expression: MathNode, ctx: PipelineContext): StrategyResult {
	const isQuotient = isDivision(expression);
	const num = readSide(isQuotient ? expression.numerator : expression, ctx.variable);
	const den = isQuotient ? readSide(expression.denominator, ctx.variable) : CONSTANT_ONE_SIDE;
	if (num === null || den === null) return null;

	const numLead = num.terms[0];
	const denLead = den.terms[0];
	const n = num.degree;
	const m = den.degree;

	// Une constante (5, π, 5/2) : une seule étape, sans factorisation.
	if (n === 0 && m === 0) {
		const constant = exactQuotient(numLead, denLead, ctx);
		if (constant === null) return null;
		// Écrite non développée (`(x+1)^2 - x^2 - 2x`) : la forme ∞ − ∞ s'annonce,
		// puis on développe, comme pour une somme non constante.
		const steps: PedagogicalLimitStep[] = [];
		const form: IndeterminateForm =
			hasOppositeInfinities(num, ctx) || hasOppositeInfinities(den, ctx) ? '∞-∞' : 'none';
		if (form !== 'none') {
			steps.push(
				makeStep(ctx, {
					rule: 'detect-indeterminate-form',
					description: `Forme indéterminée ${formMath(form)} reconnue`,
					before: expression,
					after: expression,
					verbosityLevel: 'detailed',
					indeterminateForm: form,
					// Rien à factoriser : le développement donne la constante
					bindings: { expandsTo: constant }
				})
			);
		}
		if (!num.expanded || !den.expanded) {
			const x = makeVariable(ctx.variable);
			const top = expandedNode(num, x);
			steps.push(
				makeStep(ctx, {
					rule: 'expand',
					description: 'On développe',
					before: expression,
					after: isQuotient ? overDenominator(top, expandedNode(den, x)) : top,
					verbosityLevel: 'detailed'
				})
			);
		}
		steps.push(
			makeStep(ctx, {
				rule: 'conclude',
				description: `La fonction est constante : sa limite vaut ${inlineMath(constant)}.`,
				before: expression,
				after: constant,
				verbosityLevel: 'summarized',
				globalAfter: constant
			})
		);
		return { steps, value: constant, status: 'exact', indeterminateForm: form };
	}

	// Valeur EXACTE (V26) : quotient des coefficients dominants, ou 0, ou ±∞.
	const value = limitValue(num, den, ctx);
	if (value === null) return null;
	const status: PedagogicalLimitStatus = value.type === 'infinity' ? 'infinite' : 'exact';

	// Créée en dernier : les identifiants suivent l'ordre des étapes.
	const conclusion = (): PedagogicalLimitStep =>
		makeStep(ctx, {
			rule: status === 'infinite' ? 'conclude-infinite' : 'conclude',
			description: `La limite vaut ${inlineMath(value)}`,
			before: expression,
			after: value,
			verbosityLevel: 'summarized',
			globalAfter: value
		});

	// Un monôme seul écrit tel quel (πx, −3x²) : une seule étape, sans factorisation.
	// Écrit autrement (`(x+1)^2 - x^2 - 1`), il faut d'abord développer.
	if (!isQuotient && num.terms.length === 1 && num.expanded) {
		return { steps: [conclusion()], value, status, indeterminateForm: 'none' };
	}

	// Un signe illisible (π − 4) ne compte que s'il décide du résultat (n > m,
	// refusé par `limitValue`) ; sinon il s'écrit tel quel, sans ligne de signe.
	const form: IndeterminateForm =
		isQuotient && n >= 1 && m >= 1
			? '∞/∞'
			: hasOppositeInfinities(num, ctx) || hasOppositeInfinities(den, ctx)
				? '∞-∞'
				: 'none';
	// Pas de forme indéterminée : on conclut par les opérations, sans factoriser
	// (décision de David, 2026-10-12) — `\\lim (x + 1) = +∞`, donc `\\lim \\frac{1}{x+1} = 0`.
	if (form === 'none') {
		const direct = operationSteps(expression, value, ctx);
		if (direct !== null) {
			return { steps: [...direct, conclusion()], value, status, indeterminateForm: form };
		}
	}

	// Deux monômes : rien à factoriser, on simplifie directement par x^min(n, m).
	const bothMonomials = isQuotient && n >= 1 && m >= 1 && !isSum(num) && !isSum(den);
	const x = makeVariable(ctx.variable);
	const compact = ctx.strategy.verbosityCompactConclusion;
	const steps: PedagogicalLimitStep[] = [];
	const rebuild = (top: MathNode, bottom: MathNode): MathNode =>
		isQuotient ? divide(top, bottom, 'fraction') : top;

	// 1. Forme indéterminée
	if (form !== 'none') {
		steps.push(
			makeStep(ctx, {
				rule: 'detect-indeterminate-form',
				description: `Forme indéterminée ${formMath(form)} reconnue`,
				before: expression,
				after: expression,
				verbosityLevel: 'detailed',
				indeterminateForm: form,
				bindings: {
					dominant: xPower(ctx.variable, Math.max(n, m)),
					...(bothMonomials && { simplifyBy: xPower(ctx.variable, Math.min(n, m)) })
				}
			})
		);
	}

	// 2. On développe
	let current = expression;
	if (!num.expanded || !den.expanded) {
		const expanded = rebuild(expandedNode(num, x), expandedNode(den, x));
		steps.push(
			makeStep(ctx, {
				rule: 'expand',
				description: 'On développe',
				before: current,
				after: expanded,
				verbosityLevel: 'detailed'
			})
		);
		current = expanded;
	}

	// 3. Factorisation du terme prépondérant
	const numFactored = isSum(num) ? timesPower(x, n, parentheses(bracketNode(num, x))) : num.node;
	const denFactored = isSum(den) ? timesPower(x, m, parentheses(bracketNode(den, x))) : den.node;
	if (isSum(num) || isSum(den)) {
		const factored = rebuild(numFactored, denFactored);
		steps.push(
			makeStep(ctx, {
				rule: 'factor-dominant-term',
				description: 'On factorise par le terme prépondérant',
				before: current,
				after: factored,
				verbosityLevel: 'summarized',
				bindings: { dominant: xPower(ctx.variable, Math.max(n, m)) }
			})
		);
		current = factored;
	}

	// 4. Simplification par x^k (quotient, les deux côtés de degré ≥ 1)
	const k = isQuotient && n >= 1 && m >= 1 ? Math.min(n, m) : 0;
	const numPart = k > 0 ? reducedPart(num, n - k, x) : numFactored;
	const denPart = k > 0 ? reducedPart(den, m - k, x) : denFactored;
	if (k > 0) {
		// Deux monômes de même degré : la simplification donne la valeur.
		const simplified =
			n === m && !isSum(num) && !isSum(den) ? value : overDenominator(numPart, denPart);
		steps.push(
			makeStep(ctx, {
				rule: 'simplify-common-factor',
				description: `Simplification par ${inlineMath(xPower(ctx.variable, k))}`,
				before: current,
				after: simplified,
				verbosityLevel: 'summarized',
				bindings: { dominant: xPower(ctx.variable, k) }
			})
		);
		current = simplified;
	}

	if (!compact && containsVariable(current, ctx.variable)) {
		// 5. Limites des termes
		const termLimits = limitsOfTerms([num, den], x);
		if (termLimits !== null) {
			steps.push(
				makeStep(ctx, {
					rule: 'limits-of-terms',
					description: 'Limites des termes',
					before: current,
					after: current,
					verbosityLevel: 'detailed',
					termLimits
				})
			);
		}

		// 6. Limite d'un produit ou d'un quotient
		steps.push(...closingSteps(ctx, { num, den, n, m, k, numPart, denPart, current, value }));
	}

	steps.push(conclusion());
	return { steps, value, status, indeterminateForm: form };
}

/**
 * Une somme (ou un monôme, une constante) lue comme Σ cᵢ·xⁱ, termes non nuls
 * par degré décroissant, coefficients EXACTS (V26) : rationnels lus par le
 * noyau `factor/` (sur ℚ), sinon constantes exactes (π, √2…) lues dans la
 * forme normale.
 */
interface Side {
	readonly node: MathNode;
	readonly degree: number;
	readonly terms: readonly SideTerm[];
	/** Écrite comme une somme de monômes de degrés distincts : rien à développer */
	readonly expanded: boolean;
}

interface SideTerm {
	readonly degree: number;
	/** Coefficient signé, exact */
	readonly coefficient: MathNode;
	/** Le même, quand il est rationnel (sinon `null`) */
	readonly rational: Rational | null;
	/** Signe exact du coefficient, `null` quand il ne se lit pas (π − 4) */
	readonly sign: 1 | -1 | null;
	/** Valeur absolue du coefficient (`null` quand le signe ne se lit pas) */
	readonly magnitude: MathNode | null;
}

const CONSTANT_ONE_SIDE: Side = {
	node: number('1'),
	degree: 0,
	terms: [
		{
			degree: 0,
			coefficient: number('1'),
			rational: rational(1n, 1n),
			sign: 1,
			magnitude: number('1')
		}
	],
	expanded: true
};

function readSide(expr: MathNode, variable: string): Side | null {
	const terms = sideTerms(expr, variable);
	if (terms === null || terms.length === 0) return null;
	return {
		// Les parenthèses de la saisie autour du tout (`(x^2)/(x+1)`) ne s'écrivent plus
		node: withoutOuterDelimiters(expr),
		degree: terms[0].degree,
		terms,
		expanded: isExpandedSum(expr, variable, terms.length)
	};
}

function sideTerms(expr: MathNode, variable: string): SideTerm[] | null {
	const poly = toPolynomial(expr, variable);
	if (poly === null) return irrationalSideTerms(expr, variable);
	const terms: SideTerm[] = [];
	for (let degree = poly.length - 1; degree >= 0; degree--) {
		const c = poly[degree];
		if (c.n === 0n) continue;
		terms.push({
			degree,
			coefficient: rationalToNode(c),
			rational: c,
			sign: c.n < 0n ? -1 : 1,
			magnitude: rationalToNode(absRational(c))
		});
	}
	return terms;
}

/**
 * Coefficients constants non rationnels (π x, √2 x³) : lecture dans la forme
 * normale. Refus (null) dès qu'un autre symbole que x et les constantes
 * apparaît, qu'un exposant de x n'est pas un entier naturel, ou que x reste au
 * dénominateur.
 */
function irrationalSideTerms(expr: MathNode, variable: string): SideTerm[] | null {
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

	const denSign = constantSign(form.denominator);
	const distinct = [...new Set(readDegrees)].sort((a, b) => b - a);
	return distinct.map((degree) => {
		const group: NormalTerm[] = form.numerator
			.filter((_, k) => degrees[k] === degree)
			.map((term) => ({
				coefficient: term.coefficient,
				monomial: term.monomial.filter((f) => f.base.type !== 'variable')
			}));
		const groupForm: NormalForm = { numerator: group, denominator: form.denominator, hash: '' };
		const coefficient = denormalize({ ...groupForm, hash: hashNormalForm(groupForm) });
		const numSign = constantSign(group);
		const exactSign = numSign === null || denSign === null ? null : numSign === denSign ? 1 : -1;
		const sign = exactSign ?? numericSign(coefficient);
		const magnitude =
			sign === null ? null : sign > 0 ? coefficient : canonicalForm(opposite(coefficient));
		return { degree, coefficient, rational: null, sign, magnitude };
	});
}

/**
 * Signe EXACT d'une somme de termes constants : un seul terme, un seul
 * rationnel (les radicaux, π et e sont positifs). Sinon null (π − 4).
 */
function constantSign(terms: readonly NormalTerm[]): 1 | -1 | null {
	if (terms.length !== 1 || terms[0].coefficient.terms.length !== 1) return null;
	return terms[0].coefficient.terms[0].rational.n < 0n ? -1 : 1;
}

/** Marge du signe numérique : en deçà, la constante est trop proche de 0 pour trancher. */
const SIGN_MARGIN = 1e-9;

/**
 * Signe d'une constante à plusieurs termes (π − 4, √2 − 1) par évaluation
 * numérique, retenu seulement si |valeur| > 1e-9 ; sinon (ou non évaluable) null.
 */
function numericSign(constant: MathNode): 1 | -1 | null {
	try {
		const value = compile(constant)({});
		if (!Number.isFinite(value) || Math.abs(value) <= SIGN_MARGIN) return null;
		return value > 0 ? 1 : -1;
	} catch {
		return null;
	}
}

/**
 * Déjà développée : une somme de monômes, autant que de termes (degrés
 * distincts). `(x + 1)^2`, `x(x + 1)`, `2x + 3x` sont à développer.
 */
function isExpandedSum(expr: MathNode, variable: string, termCount: number): boolean {
	const leaves = sumLeaves(expr);
	if (leaves.length !== termCount) return false;
	return leaves.every((leaf) => sideTerms(leaf, variable)?.length === 1);
}

function withoutOuterDelimiters(expr: MathNode): MathNode {
	return isDelimiter(expr) ? withoutOuterDelimiters(expr.content) : expr;
}

/** Termes d'une somme écrite, signes ôtés ; les parenthèses autour du tout ne comptent pas. */
function sumLeaves(expr: MathNode): MathNode[] {
	if (isDelimiter(expr)) return sumLeaves(expr.content);
	if (isAddition(expr) || isSubtraction(expr)) {
		return [...sumLeaves(expr.left), ...sumLeaves(expr.right)];
	}
	if (isOpposite(expr) || isPositive(expr)) return sumLeaves(expr.operand);
	return [expr];
}

/** Une somme d'au moins deux termes : c'est elle qu'on factorise. */
function isSum(side: Side): boolean {
	return side.terms.length >= 2;
}

/**
 * Des termes ÉCRITS de la somme qui tendent vers +∞ et d'autres vers −∞ :
 * forme ∞ − ∞, développés ou non (`(x+1)^2 - x^2`). Chaque terme écrit suit
 * son terme de plus haut degré ; `(x + 1)^2` seul n'est pas une différence.
 */
function hasOppositeInfinities(side: Side, ctx: PipelineContext): boolean {
	const negative = classifyApproach(ctx.approach) === 'negative-infinity';
	const signs: number[] = [];
	for (const { leaf, sign } of signedSumLeaves(side.node, 1)) {
		const lead = sideTerms(leaf, ctx.variable)?.[0];
		if (!lead || lead.degree === 0 || lead.sign === null) continue;
		signs.push(sign * lead.sign * (negative && lead.degree % 2 === 1 ? -1 : 1));
	}
	return signs.includes(1) && signs.includes(-1);
}

/**
 * Sans forme indéterminée : une étape « limite d'une somme / d'un produit /
 * d'un quotient » — limites des opérandes qui dépendent de x, donc celle du
 * tout. `null` quand un opérande cache lui-même une forme ∞ − ∞
 * (`3(x - x^2)`) ou que sa limite ne se lit pas : on factorise alors.
 */
function operationSteps(
	expression: MathNode,
	value: MathNode,
	ctx: PipelineContext
): PedagogicalLimitStep[] | null {
	const top = withoutOuterDelimiters(expression);
	let rule: PedagogicalLimitRule;
	let operands: MathNode[];
	if (isAddition(top) || isSubtraction(top)) {
		rule = 'apply-sum';
		operands = sumLeavesWritten(top);
	} else if (isDivision(top)) {
		rule = 'apply-quotient';
		operands = [top.numerator, top.denominator];
	} else if (isMultiplication(top)) {
		rule = 'apply-product';
		operands = [top.left, top.right];
	} else if (isSuperscript(top)) {
		rule = 'apply-product';
		operands = [top.base, top.superscript];
	} else {
		return null;
	}
	if (compactStrategy(ctx)) return [];

	const premises: LimitLine[] = [];
	for (const operand of operands) {
		if (!containsVariable(operand, ctx.variable)) continue;
		const side = readSide(operand, ctx.variable);
		if (side === null || hasOppositeInfinities(side, ctx)) return null;
		const limit = limitValue(side, CONSTANT_ONE_SIDE, ctx);
		if (limit === null) return null;
		premises.push({ expression: side.node, value: limit });
	}
	return [
		makeStep(ctx, {
			rule,
			description: `Pas de forme indéterminée : ${inlineMath(value)} par opérations sur les limites`,
			before: expression,
			after: value,
			verbosityLevel: 'detailed',
			termLimits: { premises, conclusions: [{ expression, value }] }
		})
	];
}

function compactStrategy(ctx: PipelineContext): boolean {
	return ctx.strategy.verbosityCompactConclusion;
}

/** Termes écrits d'une somme, signes compris (`-x^4 + x` → `-x^4`, `x`) */
function sumLeavesWritten(expr: MathNode): MathNode[] {
	if (isDelimiter(expr)) return sumLeavesWritten(expr.content);
	if (isAddition(expr) || isSubtraction(expr)) {
		return [...sumLeavesWritten(expr.left), ...sumLeavesWritten(expr.right)];
	}
	return [expr];
}

/** Termes écrits d'une somme avec leur signe (`a - (b)` : b compté négatif). */
function signedSumLeaves(expr: MathNode, sign: 1 | -1): { leaf: MathNode; sign: 1 | -1 }[] {
	if (isDelimiter(expr)) return signedSumLeaves(expr.content, sign);
	if (isAddition(expr)) {
		return [...signedSumLeaves(expr.left, sign), ...signedSumLeaves(expr.right, sign)];
	}
	if (isSubtraction(expr)) {
		const flipped = sign === 1 ? -1 : 1;
		return [...signedSumLeaves(expr.left, sign), ...signedSumLeaves(expr.right, flipped)];
	}
	if (isOpposite(expr)) return signedSumLeaves(expr.operand, sign === 1 ? -1 : 1);
	if (isPositive(expr)) return signedSumLeaves(expr.operand, sign);
	return [{ leaf: expr, sign }];
}

/** Valeur exacte : quotient des coefficients dominants, 0, ou ±∞ (signe et parité). */
function limitValue(num: Side, den: Side, ctx: PipelineContext): MathNode | null {
	const numLead = num.terms[0];
	const denLead = den.terms[0];
	if (num.degree < den.degree) return number('0');
	if (num.degree > den.degree) {
		// Un signe qui ne se lit pas exactement ((π − 4)x) : on s'abstient.
		if (numLead.sign === null || denLead.sign === null) return null;
		const sign = signAtInfinity(numLead.sign * denLead.sign, num.degree - den.degree, ctx.approach);
		return sign > 0 ? infinity('positive') : infinity('negative');
	}
	return exactQuotient(numLead, denLead, ctx);
}

function xPower(variable: string, degree: number): MathNode {
	return xPowerOf(makeVariable(variable), degree);
}

/** xᵈ · facteur, sans x⁰ */
function timesPower(x: MathNode, degree: number, factor: MathNode): MathNode {
	if (degree === 0) return factor;
	return multiply(xPowerOf(x, degree), factor, 'implicit');
}

function xPowerOf(x: MathNode, degree: number): MathNode {
	return degree === 1 ? x : power(x, number(String(degree)));
}

/** Le terme c·xⁱ écrit sans son signe : `x^2`, `2 x`, `\\dfrac{1}{2} x`, `5`. */
function monomialMagnitude(term: SideTerm, x: MathNode): MathNode {
	const magnitude = term.magnitude ?? term.coefficient;
	if (term.degree === 0) return magnitude;
	if (isOneNode(magnitude)) return xPowerOf(x, term.degree);
	return multiply(magnitude, xPowerOf(x, term.degree), 'implicit');
}

/** Σ des termes, les négatifs en soustractions, sans nœud négatif littéral. */
function signedSum(terms: readonly SideTerm[], write: (t: SideTerm) => MathNode): MathNode {
	const [first, ...rest] = terms;
	let sum = first.sign === -1 ? opposite(write(first)) : write(first);
	for (const term of rest) {
		sum = term.sign === -1 ? subtract(sum, write(term)) : add(sum, write(term));
	}
	return sum;
}

/** La forme développée : `x^2 + 2 x + 1` */
function expandedNode(side: Side, x: MathNode): MathNode {
	return side.expanded ? side.node : signedSum(side.terms, (t) => monomialMagnitude(t, x));
}

/** cᵢ/x^(n−i) : `\\dfrac{5}{x}`, `\\dfrac{1}{2x^2}` (le dénominateur du coefficient avec x). */
function vanishingTerm(term: SideTerm, gap: number, x: MathNode): MathNode {
	const magnitude = term.magnitude ?? term.coefficient;
	const xPart = xPowerOf(x, gap);
	if (isDivision(magnitude)) {
		return divide(
			magnitude.numerator,
			multiply(magnitude.denominator, xPart, 'implicit'),
			'fraction'
		);
	}
	return divide(magnitude, xPart, 'fraction');
}

/** La parenthèse après factorisation par xⁿ : `3 + \\dfrac{1}{x}`, `-2 + \\dfrac{1}{x^2}` */
function bracketNode(side: Side, x: MathNode): MathNode {
	return signedSum(side.terms, (t) =>
		t.degree === side.degree
			? (t.magnitude ?? t.coefficient)
			: vanishingTerm(t, side.degree - t.degree, x)
	);
}

/**
 * Un côté après simplification par x^k : il lui reste x^rest devant sa
 * parenthèse (une somme) ou son coefficient (un monôme).
 */
function reducedPart(side: Side, rest: number, x: MathNode): MathNode {
	if (isSum(side)) {
		const bracket = bracketNode(side, x);
		return rest === 0 ? bracket : timesPower(x, rest, parentheses(bracket));
	}
	const lead = side.terms[0];
	if (rest === 0) return lead.coefficient;
	const magnitude = lead.magnitude ?? lead.coefficient;
	const body = isOneNode(magnitude)
		? xPowerOf(x, rest)
		: multiply(magnitude, xPowerOf(x, rest), 'implicit');
	return lead.sign === -1 ? opposite(body) : body;
}

/**
 * Limites des termes : chaque c/xᵏ tend vers 0 (une fois chacun), donc chaque
 * parenthèse tend vers son premier terme. `null` sans parenthèse.
 */
function limitsOfTerms(sides: readonly Side[], x: MathNode): TermLimits | null {
	const premises: LimitLine[] = [];
	const seen = new Set<string>();
	const conclusions: LimitLine[] = [];
	for (const side of sides) {
		if (!isSum(side)) continue;
		for (const term of side.terms.slice(1)) {
			const expression = vanishingTerm(term, side.degree - term.degree, x);
			const key = toLatex(expression);
			if (seen.has(key)) continue;
			seen.add(key);
			premises.push({ expression, value: number('0') });
		}
		conclusions.push({ expression: bracketNode(side, x), value: side.terms[0].coefficient });
	}
	return conclusions.length === 0 ? null : { premises, conclusions };
}

interface ClosingInput {
	readonly num: Side;
	readonly den: Side;
	readonly n: number;
	readonly m: number;
	readonly k: number;
	readonly numPart: MathNode;
	readonly denPart: MathNode;
	readonly current: MathNode;
	readonly value: MathNode;
}

/**
 * Dernière étape avant la conclusion :
 * - n > m : limite d'un produit, x^(n−m) fois ce qui tend vers a/b ;
 * - n < m : le dénominateur tend vers ±∞ (produit), puis limite d'un quotient ;
 * - n = m : limite d'un quotient a/b (rien quand il ne reste qu'une parenthèse).
 */
function closingSteps(ctx: PipelineContext, input: ClosingInput): PedagogicalLimitStep[] {
	const { num, den, n, m, k, numPart, denPart, current, value } = input;
	const x = makeVariable(ctx.variable);
	const numLead = num.terms[0];
	const denLead = den.terms[0];

	if (n > m) {
		// Il ne reste que xᵈ (x²/x) : la conclusion suffit.
		if (isBarePower(current, ctx.variable)) return [];
		const restLimit = exactQuotient(numLead, denLead, ctx);
		if (restLimit === null) return [];
		const rest = overDenominator(reducedPart(num, 0, x), reducedPart(den, 0, x));
		return [productStep(ctx, current, n - m, rest, restLimit, value)];
	}

	if (n < m) {
		const gap = m - k;
		// Signe illisible ((π − 4)x²) : le dénominateur tend vers l'infini en
		// valeur absolue, la limite vaut 0 sans ligne de signe.
		if (denLead.sign === null) {
			return [quotientStep(ctx, current, numPart, numLead.coefficient, null, value)];
		}
		const steps: PedagogicalLimitStep[] = [];
		const denSign = signAtInfinity(denLead.sign, gap, ctx.approach);
		const denLimit = denSign > 0 ? infinity('positive') : infinity('negative');
		// x seul au dénominateur n'est pas un produit à étudier
		if (!isBarePower(denPart, ctx.variable)) {
			const rest = reducedPart(den, 0, x);
			steps.push(productStep(ctx, denPart, gap, rest, denLead.coefficient, denLimit));
		}
		steps.push(quotientStep(ctx, current, numPart, numLead.coefficient, denLimit, value));
		return steps;
	}

	// Mêmes degrés : il reste un quotient a/b, sauf si le dénominateur a disparu.
	if (!isDivision(current)) return [];
	return [quotientStep(ctx, current, numPart, numLead.coefficient, denLead.coefficient, value)];
}

function productStep(
	ctx: PipelineContext,
	before: MathNode,
	degree: number,
	rest: MathNode,
	restLimit: MathNode,
	value: MathNode
): PedagogicalLimitStep {
	const powerLimit =
		signAtInfinity(1, degree, ctx.approach) > 0 ? infinity('positive') : infinity('negative');
	return makeStep(ctx, {
		rule: 'apply-product',
		description: `Limite d'un produit : ${inlineMath(value)}`,
		before,
		after: value,
		verbosityLevel: 'detailed',
		bindings: { power: xPower(ctx.variable, degree), powerLimit, rest, restLimit }
	});
}

function quotientStep(
	ctx: PipelineContext,
	before: MathNode,
	numerator: MathNode,
	numeratorLimit: MathNode,
	/** `null` : le dénominateur tend vers l'infini en valeur absolue, signe illisible */
	denominatorLimit: MathNode | null,
	value: MathNode
): PedagogicalLimitStep {
	return makeStep(ctx, {
		rule: 'apply-quotient',
		description: `Limite d'un quotient : ${inlineMath(value)}`,
		before,
		after: value,
		verbosityLevel: 'detailed',
		bindings: denominatorLimit
			? { numerator, numeratorLimit, denominatorLimit }
			: { numerator, numeratorLimit, denominatorAbsLimit: infinity('positive') }
	});
}

function isBarePower(node: MathNode, variable: string): boolean {
	if (isVariable(node)) return node.name === variable;
	return isSuperscript(node) && isVariable(node.base) && node.base.name === variable;
}

/**
 * Quotient exact des coefficients dominants : sur ℚ (noyau `factor/`) quand
 * les deux sont rationnels ; sinon par l'évaluation exacte de `limits/`, qui
 * écrit la constante comme le moteur (`\\dfrac{\\pi}{2}`, `\\dfrac{1}{\\pi}`).
 */
function exactQuotient(
	num: Pick<SideTerm, 'coefficient' | 'rational'>,
	den: Pick<SideTerm, 'coefficient' | 'rational'>,
	ctx: PipelineContext
): MathNode | null {
	try {
		if (num.rational !== null && den.rational !== null) {
			// Forme réduite, comme la substitution directe : `\\dfrac{3}{2}`, `-2`
			return canonicalForm(rationalToNode(divRational(num.rational, den.rational)));
		}
		// Réduit d'abord par la forme normale (1/(−√2) → −½√2), puis réécrit par
		// l'évaluation exacte et écrit comme la valeur du moteur (`writeLimitValue`),
		// signe devant la fraction : `-\\dfrac{\\sqrt{2}}{2}`, `2\\sqrt{2}`.
		const quotient = canonicalForm(divide(num.coefficient, den.coefficient, 'fraction'));
		const result = tryEvaluateLimitExact(quotient, ctx.variable, ctx.approach, 'both');
		const node = result === null ? null : resultToNode(result);
		return node === null || node.type === 'infinity' ? null : writeLimitValue(node);
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
	const leftProbe = evaluateAtPoint(expression, ctx.variable, a - ONE_SIDED_EPSILON);
	const rightProbe = evaluateAtPoint(expression, ctx.variable, a + ONE_SIDED_EPSILON);
	const leftSign = classifyDivergence(leftProbe);
	const rightSign = classifyDivergence(rightProbe);

	const wantBoth = ctx.direction === 'both';
	const wantLeft = ctx.direction === 'left' || wantBoth;
	const wantRight = ctx.direction === 'right' || wantBoth;

	// At least one requested side must diverge for this strategy to apply.
	// Une sonde qui déborde (`e^{1/x}` en 0⁺ : e^{10⁶}) ne se lit pas : les
	// deux côtés sont alors calculés par le pipeline (`sideValue`).
	if (wantLeft && wantRight) {
		if (leftSign === 0 && rightSign === 0 && leftProbe !== null && rightProbe !== null) {
			return null;
		}
	} else if (wantLeft && leftSign === 0) {
		return null;
	} else if (wantRight && rightSign === 0) {
		return null;
	}

	// Limite d'un côté : ±∞ quand il diverge ; sinon calculée par le pipeline
	// sur ce côté (`e^{1/x}` en 0⁻ : 0), jamais lue sur un signe nul.
	// Ses étapes (la composée de `e^{1/x}` en 0⁻) deviennent les sous-étapes du côté.
	const sideValue = (
		sign: number,
		direction: LimitDirection
	): { readonly value: MathNode; readonly steps: readonly PedagogicalLimitStep[] } | null =>
		sign !== 0
			? { value: signNodeFromSign(sign), steps: [] }
			: sideLimit(expression, ctx, direction);
	const leftSide = wantLeft ? sideValue(leftSign, 'left') : null;
	const rightSide = wantRight ? sideValue(rightSign, 'right') : null;
	if ((wantLeft && leftSide === null) || (wantRight && rightSide === null)) return null;
	const leftValue = leftSide?.value ?? null;
	const rightValue = rightSide?.value ?? null;

	const steps: PedagogicalLimitStep[] = [];
	const sideStep = (direction: 'left' | 'right', sign: number, value: MathNode) => {
		const name = direction === 'left' ? 'gauche' : 'droite';
		const subSteps = (direction === 'left' ? leftSide : rightSide)?.steps ?? [];
		return makeStep(ctx, {
			subSteps,
			rule: direction === 'left' ? 'analyze-left-limit' : 'analyze-right-limit',
			description: `Étude de la limite à ${name} en ${inlineMath(ctx.approach)} : ${inlineMath(value)}`,
			before: expression,
			after: value,
			verbosityLevel: 'detailed',
			direction,
			bindings: sign !== 0 ? poleBindings(expression, ctx, a, direction) : {}
		});
	};
	if (leftValue) steps.push(sideStep('left', leftSign, leftValue));
	if (rightValue) steps.push(sideStep('right', rightSign, rightValue));

	if (!wantBoth) {
		const value = (leftValue ?? rightValue) as MathNode;
		const name = ctx.direction === 'left' ? 'gauche' : 'droite';
		steps.push(
			makeStep(ctx, {
				rule: inferStatusFromValue(value) === 'infinite' ? 'conclude-infinite' : 'conclude',
				description: `La limite à ${name} vaut ${inlineMath(value)}`,
				before: expression,
				after: value,
				verbosityLevel: 'summarized',
				globalAfter: value
			})
		);
		return { steps, value, status: inferStatusFromValue(value), indeterminateForm: 'none' };
	}

	const left = leftValue as MathNode;
	const right = rightValue as MathNode;
	const same = toLatex(left) === toLatex(right);
	steps.push(
		makeStep(ctx, {
			rule: 'compare-one-sided',
			description: same
				? `Les limites à gauche et à droite sont égales : ${inlineMath(left)}`
				: `Les limites à gauche et à droite diffèrent : ${inlineMath(left)} et ${inlineMath(right)}`,
			before: expression,
			// Égales : la limite commune ; différentes : rien à écrire après « = »
			after: same ? left : expression,
			verbosityLevel: 'detailed',
			bindings: { left, right }
		})
	);

	if (!same) {
		// La conclusion, à tous les niveaux : sans elle la rédaction s'arrêtait
		// sur la comparaison.
		steps.push(
			makeStep(ctx, {
				rule: 'conclude-does-not-exist',
				description:
					"Les limites à gauche et à droite diffèrent : la limite n'existe pas en ce point",
				before: expression,
				after: expression,
				verbosityLevel: 'summarized',
				bindings: { left, right }
			})
		);
		return { steps, value: null, status: 'does-not-exist', indeterminateForm: 'none' };
	}

	const status = inferStatusFromValue(left);
	steps.push(
		makeStep(ctx, {
			rule: status === 'infinite' ? 'conclude-infinite' : 'conclude',
			description: `La limite vaut ${inlineMath(left)}`,
			before: expression,
			after: left,
			verbosityLevel: 'summarized',
			globalAfter: left
		})
	);
	return { steps, value: left, status, indeterminateForm: 'none' };
}

/**
 * Un pôle d'un quotient N/D : N tend vers une limite non nulle, D vers 0 avec
 * le signe du côté étudié. Liaisons de l'explication (« le numérateur tend
 * vers 1 et $x - 2 \\to 0^+$ ») : `numeratorLimit`, `denominator`, et
 * `denominatorSign` (un infini qui ne porte que le signe de D de ce côté).
 * Vide quand l'expression n'est pas un tel quotient.
 */
function poleBindings(
	expression: MathNode,
	ctx: PipelineContext,
	a: number,
	direction: 'left' | 'right'
): LimitBindings {
	const node = withoutOuterDelimiters(expression);
	if (!isDivision(node)) return {};
	const numeratorAtA = evaluateAtPoint(node.numerator, ctx.variable, a);
	const denominatorAtA = evaluateAtPoint(node.denominator, ctx.variable, a);
	if (numeratorAtA === null || !Number.isFinite(numeratorAtA) || numeratorAtA === 0) return {};
	if (denominatorAtA === null || Math.abs(denominatorAtA) > 1e-12) return {};
	const near = a + (direction === 'left' ? -ONE_SIDED_EPSILON : ONE_SIDED_EPSILON);
	const denominatorNear = evaluateAtPoint(node.denominator, ctx.variable, near);
	if (denominatorNear === null || denominatorNear === 0) return {};
	return {
		numeratorLimit: exactValueAt(node.numerator, ctx, numeratorAtA) ?? numericNode(numeratorAtA),
		denominator: withoutOuterDelimiters(node.denominator),
		denominatorSign: infinity(denominatorNear > 0 ? 'positive' : 'negative')
	};
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
		description: "Encadrement de l'expression par deux fonctions tendant vers $0$",
		before: expression,
		after: expression,
		verbosityLevel: 'detailed'
	});

	const squeezeStep = makeStep(ctx, {
		rule: 'apply-squeeze',
		description: `Application du théorème ${theoremName} : la limite vaut $0$`,
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

	// Simplifiée en une constante (`(x + 1)/(x + 1)` → 1) : l'étape de
	// simplification l'écrit déjà ; pas de « \\lim 1 = 1 », la conclusion seule,
	// sur l'expression de départ.
	if (!containsVariable(expression, ctx.variable)) {
		const conclusion = makeConclusionStep(ctx, ctx.globalBefore, expression);
		return {
			steps: conclusion ? [conclusion] : [],
			value: expression,
			status: inferStatusFromValue(expression)
		};
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
			description: `La limite vaut ${inlineMath(value)}`,
			before: expression,
			after: value,
			verbosityLevel: 'summarized',
			globalAfter: value
		});
	}

	return makeStep(ctx, {
		rule: 'conclude',
		description: `La limite vaut ${inlineMath(value)}`,
		before: expression,
		after: value,
		verbosityLevel: 'summarized',
		globalAfter: value
	});
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
