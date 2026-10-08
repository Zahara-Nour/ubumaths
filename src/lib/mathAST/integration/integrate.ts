/**
 * Integration - Main Entry Point
 *
 * Provides the main integrate() and integrateDefinite() functions for symbolic integration.
 *
 * @module mathAST/integration/integrate
 */

import type { MathNode } from '../types';
import type {
	IntegrateResult,
	DefiniteIntegrateResult,
	IntegrateOptions,
	IntegrateStepRecorder,
	ResolvedIntegrateOptions
} from './types';
import { DEFAULT_INTEGRATE_OPTIONS } from './types';
import { detectVariable, classifyIntegrand } from './classify';
import { createStepRecorder } from './step-recorder';
import { selectIntegrator } from './integrators';
import { containsVariable } from './rules';
import { preprocess } from '../normal/rules';
import { normalize, denormalize } from '../normal';
import { number, subtract, power, euler } from '../factory';
import { numericNode, extractExactRational } from '../common/numeric';
import {
	isAddition,
	isSubtraction,
	isMultiplication,
	isNumber,
	isDelimiter,
	isVariable,
	isSuperscript,
	isFunction
} from '../guards';
import { mapNode, findNodes, getChildren } from '../transforms';
import {
	AbortError,
	getActiveAbortChecker,
	makeAbortChecker,
	withActiveAbortChecker,
	type AbortChecker
} from '../common/abort';
import { simplifiedAdd, simplifiedMultiply, simplifiedOpposite } from '../common/simplify';
import { isEulerBase } from '../differentiation/rules';
import { CONSTANT_OF_INTEGRATION_NOTE } from './descriptions-fr';
import { evaluate } from '../eval/evaluate';
import { substitute } from '../eval/substitute';
import { numericIntegrate } from './numeric';
import { expandFunctionPowers } from '../common/function-power';
import { toCustom } from '../custom-generator';
import { containsOddRoot, oddPowersAsRoots, oddRootsAsPowers } from './odd-roots';
import { integrateByChainRule } from './integrators/chain-rule';
import { integrateByIdentity } from './integrators/identities';
import { dropAbsOfPositive } from './positive-abs';
import { absorbLnConstantFactors } from './ln-constant';
import { asPowerSum, integratePowerSum, powerSumAsNode } from './power-sum';
import { laurentForm } from './laurent-form';
import { antiderivativeDiscontinuity } from './singularity';
import { compile } from '../eval/compile';
import {
	absProductForm,
	arctanClassForm,
	dropConstantTerms,
	groupLnTerms,
	lnOfEvenPowerAsAbs,
	powerOfSumForm
} from './class-form';

// =============================================================================
// Budget global
// =============================================================================

/** Exposant entier au-delà duquel une somme élevée à la puissance n'est pas développée */
const MAX_EXPANDED_SUM_POWER = 12;
/** Budget de la normalisation finale de la primitive */
const NORMALIZE_RESULT_TIMEOUT_MS = 300;

/** Une somme élevée à une puissance entière > MAX_EXPANDED_SUM_POWER */
function hasLargeSumPower(expr: MathNode): boolean {
	return (
		findNodes(expr, (node) => {
			if (!isSuperscript(node)) return false;
			const base = isDelimiter(node.base) ? node.base.content : node.base;
			if (!isAddition(base) && !isSubtraction(base)) return false;
			const exponent = extractExactRational(node.superscript);
			return (
				exponent !== null &&
				exponent.d === 1n &&
				(exponent.n > BigInt(MAX_EXPANDED_SUM_POWER) ||
					exponent.n < -BigInt(MAX_EXPANDED_SUM_POWER))
			);
		}).length > 0
	);
}

/**
 * Garde GLOBALE d'un calcul de primitive, en plus de `maxDepth` : la
 * profondeur borne une branche, pas l'arbre (parties et substitutions se
 * ramifient) ni la taille des expressions. Aucune entrée ne doit geler
 * l'onglet de l'élève : au-delà du budget, refus propre « non supporté ».
 */
const MAX_INTEGRATION_STEPS = 4000;
const MAX_INTEGRATION_MS = 1500;
/**
 * Taille maximale (en nœuds) d'une intégrande ou d'une primitive : le budget
 * n'est relu qu'entre deux appels, une expression qui enfle d'un facteur 10 à
 * chaque niveau suffirait à geler un seul appel.
 */
const MAX_INTEGRATION_NODES = 3000;

/**
 * Marge de la mise en forme finale (normalisation, écriture de classe) au-delà
 * de MAX_INTEGRATION_MS : passé ce délai, le signal ambiant (`common/abort.ts`)
 * interrompt toute normalisation en cours — aucune entrée ne peut geler, même
 * hors de la boucle budgétée (revue de #947 : 1/((x + 1)² + 3)).
 */
const FINISHING_MS = 500;

/** Appels `integrate` en cours (imbriqués via les intégrateurs) */
let activeIntegrations = 0;
let integrationSteps = 0;
let integrationDeadline = 0;

/** Plus de `max` nœuds (parcours interrompu dès le dépassement) */
function exceedsNodeCount(root: MathNode, max: number): boolean {
	let count = 0;
	const stack: MathNode[] = [root];
	while (stack.length > 0) {
		const node = stack.pop()!;
		count++;
		if (count > max) return true;
		stack.push(...getChildren(node));
	}
	return false;
}

function oversizedResult(variable: string, error: string): IntegrateResult {
	return {
		variable,
		status: 'unsupported',
		antiderivative: null,
		integrandType: 'unknown',
		technique: 'basic-rule',
		steps: [],
		error
	};
}

function budgetExceeded(): string | null {
	if (activeIntegrations === 0) return null;
	integrationSteps++;
	if (integrationSteps > MAX_INTEGRATION_STEPS) {
		return `Budget de calcul dépassé (${MAX_INTEGRATION_STEPS} étapes)`;
	}
	if (performance.now() > integrationDeadline) {
		return `Budget de calcul dépassé (${MAX_INTEGRATION_MS} ms)`;
	}
	return null;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract constant multiplier from an expression.
 * Returns { constant, rest } where expr = constant * rest.
 * If no constant multiplier, returns { constant: null, rest: expr }.
 */
function extractConstantMultiplier(
	expr: MathNode,
	variable: string
): { constant: MathNode | null; rest: MathNode } {
	if (isMultiplication(expr)) {
		// Check if left is constant
		if (!containsVariable(expr.left, variable)) {
			return { constant: expr.left, rest: expr.right };
		}
		// Check if right is constant
		if (!containsVariable(expr.right, variable)) {
			return { constant: expr.right, rest: expr.left };
		}
	}

	// Check for division by constant: f(x)/c = (1/c) * f(x)
	if (expr.type === 'division') {
		if (!containsVariable(expr.denominator, variable)) {
			// expr = numerator / denominator where denominator is constant
			// This is equivalent to (1/denominator) * numerator
			const constant: MathNode = {
				type: 'division',
				numerator: number('1'),
				denominator: expr.denominator,
				displayStyle: 'fraction'
			};
			return { constant, rest: expr.numerator };
		}
	}

	// No constant multiplier
	return { constant: null, rest: expr };
}

/**
 * Normalize an antiderivative using normalize/denormalize for algebraic simplification.
 * This applies comprehensive simplification including:
 * - Combining like terms
 * - Simplifying trigonometric values at remarkable angles
 * - Expanding/simplifying logarithms
 * - Combining exponential factors
 * - Rationalizing denominators
 *
 * @param expr - The antiderivative to normalize
 * @returns The normalized expression
 */
function normalizeAntiderivative(rawExpr: MathNode, variable?: string): MathNode {
	// ln(u²) = 2 ln|u| AVANT la normalisation, qui écrirait 2 ln u (u > 0 seulement)
	const expr = lnOfEvenPowerAsAbs(rawExpr);
	// Développer (1+9x²)^512 produirait un polynôme de degré 1024 : au-delà
	// de cette borne, la primitive est rendue telle quelle
	if (hasLargeSumPower(expr)) {
		return expr;
	}
	try {
		const normalForm = normalize(expr, {
			abortChecker: withAmbient(makeAbortChecker(undefined, NORMALIZE_RESULT_TIMEOUT_MS))
		});
		// x − 1/x, −2/√x : terme à terme, pas réduit au même dénominateur
		const termwise = variable === undefined ? null : laurentForm(normalForm, variable);
		return termwise ?? denormalize(normalForm);
	} catch {
		// If normalization fails, return the original expression
		return expr;
	}
}

/**
 * La lettre `e` → constante d'Euler, sauf si l'on intègre en `e`.
 *
 * Bornes ET intégrande : `parseLatex('e^{x}')` garde `e` en variable (usage
 * physique), mais pour une primitive la convention est celle de `evaluate`,
 * `compile` et `isEulerBase` — `e` est Euler. Sans cette promotion, `e^x`
 * tapé avec la lettre était refusé (« non supporté »), dans le LaTeX comme
 * dans l'atelier ; seuls `\exponentialE` et `\exp` passaient. Quand on
 * intègre PAR RAPPORT à `e`, elle reste la variable (même règle que
 * `promoteStandaloneEulerInRelation` pour une inconnue `e`).
 */
function promoteEulerLetter(node: MathNode, variable: string | undefined): MathNode {
	if (variable === 'e') return node;
	return mapNode(node, (n) => (isVariable(n) && n.name === 'e' ? euler() : n));
}

/** L'arbre contient-il une valeur absolue `|…|` ? */
function containsAbs(node: MathNode): boolean {
	return findNodes(node, (n) => isFunction(n) && n.name === 'abs').length > 0;
}

/** L'arbre contient-il un appel `exp(…)` ? */
function containsExpFunction(node: MathNode): boolean {
	return findNodes(node, (n) => isFunction(n) && n.name === 'exp').length > 0;
}

/**
 * `exp(u)` → `e^u` (constante d'Euler) : la normalisation finale écrit toute
 * exponentielle `\exp(…)`. L'élève qui a tapé `e^{…}` doit lire `e^{…}` ; celui
 * qui a tapé `\exp(…)` garde `\exp` (voir l'appelant).
 */
function expAsEulerPower(node: MathNode): MathNode {
	return mapNode(node, (n) =>
		isFunction(n) && n.name === 'exp' && n.args.length === 1 && n.power === undefined
			? power(euler(), n.args[0])
			: n
	);
}

/** `c / e^u` (c constant) → `c · e^(−u)` ; tout le reste inchangé */
function invertExponentialDenominator(expr: MathNode, variable: string): MathNode {
	if (expr.type !== 'division') return expr;
	const { numerator, denominator } = expr;
	if (containsVariable(numerator, variable)) return expr;
	if (denominator.type !== 'superscript' || !isEulerBase(denominator.base)) return expr;
	if (!containsVariable(denominator.superscript, variable)) return expr;
	const inverted = power(denominator.base, simplifiedOpposite(denominator.superscript));
	return simplifiedMultiply(numerator, inverted);
}

// =============================================================================
// Internal Integration Function (Recursive)
// =============================================================================

/**
 * Internal recursive integration function with decision tree.
 *
 * Decision tree:
 * 1. Simplify expression
 * 2. Check if constant → cx
 * 3. Check if sum → integrate each term (linearity)
 * 4. Check if constant multiple → factor out constant
 * 5. Try integrators in priority order (lowest first)
 * 6. Return unsupported if all fail
 */
function integrateInternal(
	expr: MathNode,
	variable: string,
	options: ResolvedIntegrateOptions,
	recorder: IntegrateStepRecorder,
	depth: number
): IntegrateResult {
	const budgetError = exceedsNodeCount(expr, MAX_INTEGRATION_NODES)
		? `Intégrande trop grande (plus de ${MAX_INTEGRATION_NODES} nœuds)`
		: budgetExceeded();
	if (budgetError !== null) {
		return {
			variable,
			status: 'unsupported',
			antiderivative: null,
			integrandType: 'unknown',
			technique: 'basic-rule',
			steps: recorder.getSteps(),
			error: budgetError
		};
	}

	// Check recursion depth
	if (depth > options.maxDepth) {
		return {
			variable,
			status: 'unsupported',
			antiderivative: null,
			integrandType: 'unknown',
			technique: 'basic-rule',
			steps: recorder.getSteps(),
			error: `Dépassement de la profondeur maximale de récursion (${options.maxDepth})`
		};
	}

	// Step 1: Simplify expression
	let simplified = options.simplify ? preprocess(expr) : expr;

	// Step 1b: Unwrap grouping delimiters
	// (ln(x)) should integrate the same as ln(x)
	while (isDelimiter(simplified) && simplified.semantic === 'grouping') {
		simplified = simplified.content;
	}

	// Step 1c: c / e^u = c · e^(−u) — sinon 1/eˣ passait par ∫ du/u avec
	// du = eˣ non constant (rendu ln|eˣ|)
	simplified = invertExponentialDenominator(simplified, variable);

	// Step 2: Check if constant (doesn't contain variable)
	if (!containsVariable(simplified, variable)) {
		// ∫ c dx = cx
		recorder.recordStepByRule(
			'constant-rule',
			simplified,
			simplified,
			'detailed',
			undefined,
			`La constante ${variable} est extraite`
		);

		const antiderivative = simplifiedMultiply(simplified, { type: 'variable', name: variable });

		recorder.recordStepByRule('constant-rule', simplified, antiderivative, 'summarized');

		return {
			variable,
			status: 'exact',
			antiderivative,
			integrandType: 'polynomial',
			technique: 'basic-rule',
			steps: recorder.getSteps(),
			constantNote: CONSTANT_OF_INTEGRATION_NOTE
		};
	}

	// Step 3: Check if sum (linearity: ∫(f+g) = ∫f + ∫g)
	if (isAddition(simplified)) {
		recorder.recordStepByRule(
			'linearity-sum',
			simplified,
			simplified,
			'detailed',
			undefined,
			'Application de la linéarité: ∫(f+g) = ∫f + ∫g'
		);

		// Integrate left term
		const leftRecorder = createStepRecorder();
		const leftResult = integrateInternal(
			simplified.left,
			variable,
			options,
			leftRecorder,
			depth + 1
		);

		if (leftResult.status === 'unsupported') {
			return leftResult;
		}

		// Integrate right term
		const rightRecorder = createStepRecorder();
		const rightResult = integrateInternal(
			simplified.right,
			variable,
			options,
			rightRecorder,
			depth + 1
		);

		if (rightResult.status === 'unsupported') {
			return rightResult;
		}

		// Merge steps from sub-integrations
		leftRecorder.getSteps().forEach((step) => {
			recorder.recordStep(
				step.rule,
				step.description,
				step.before,
				step.after,
				'detailed',
				step.operand,
				step.technicalNote
			);
		});

		rightRecorder.getSteps().forEach((step) => {
			recorder.recordStep(
				step.rule,
				step.description,
				step.before,
				step.after,
				'detailed',
				step.operand,
				step.technicalNote
			);
		});

		// Combine results
		const antiderivative = simplifiedAdd(leftResult.antiderivative!, rightResult.antiderivative!);

		recorder.recordStepByRule('linearity-sum', simplified, antiderivative, 'summarized');

		return {
			variable,
			status: 'exact',
			antiderivative,
			integrandType: classifyIntegrand(simplified, variable),
			technique: 'basic-rule',
			steps: recorder.getSteps(),
			constantNote: CONSTANT_OF_INTEGRATION_NOTE
		};
	}

	// Handle subtraction as addition with opposite
	if (isSubtraction(simplified)) {
		recorder.recordStepByRule(
			'linearity-sum',
			simplified,
			simplified,
			'detailed',
			undefined,
			'Application de la linéarité: ∫(f-g) = ∫f - ∫g'
		);

		// Integrate left term
		const leftRecorder = createStepRecorder();
		const leftResult = integrateInternal(
			simplified.left,
			variable,
			options,
			leftRecorder,
			depth + 1
		);

		if (leftResult.status === 'unsupported') {
			return leftResult;
		}

		// Integrate right term
		const rightRecorder = createStepRecorder();
		const rightResult = integrateInternal(
			simplified.right,
			variable,
			options,
			rightRecorder,
			depth + 1
		);

		if (rightResult.status === 'unsupported') {
			return rightResult;
		}

		// Merge steps
		leftRecorder.getSteps().forEach((step) => {
			recorder.recordStep(
				step.rule,
				step.description,
				step.before,
				step.after,
				'detailed',
				step.operand,
				step.technicalNote
			);
		});

		rightRecorder.getSteps().forEach((step) => {
			recorder.recordStep(
				step.rule,
				step.description,
				step.before,
				step.after,
				'detailed',
				step.operand,
				step.technicalNote
			);
		});

		// Combine results
		const antiderivative = subtract(leftResult.antiderivative!, rightResult.antiderivative!);

		recorder.recordStepByRule('linearity-sum', simplified, antiderivative, 'summarized');

		return {
			variable,
			status: 'exact',
			antiderivative,
			integrandType: classifyIntegrand(simplified, variable),
			technique: 'basic-rule',
			steps: recorder.getSteps(),
			constantNote: CONSTANT_OF_INTEGRATION_NOTE
		};
	}

	// Handle opposite (negation): ∫-f = -∫f
	if (simplified.type === 'opposite') {
		recorder.recordStepByRule(
			'linearity-opposite',
			simplified,
			simplified,
			'detailed',
			undefined,
			'Application de la linéarité: ∫(-f) = -∫f'
		);

		// Integrate the operand
		const innerRecorder = createStepRecorder();
		const innerResult = integrateInternal(
			simplified.operand,
			variable,
			options,
			innerRecorder,
			depth + 1
		);

		if (innerResult.status === 'unsupported') {
			return innerResult;
		}

		// Merge steps
		innerRecorder.getSteps().forEach((step) => {
			recorder.recordStep(
				step.rule,
				step.description,
				step.before,
				step.after,
				'detailed',
				step.operand,
				step.technicalNote
			);
		});

		// Negate the result
		const antiderivative = options.simplify
			? preprocess({ type: 'opposite', operand: innerResult.antiderivative! })
			: { type: 'opposite' as const, operand: innerResult.antiderivative! };

		recorder.recordStepByRule('linearity-opposite', simplified, antiderivative, 'summarized');

		return {
			variable,
			status: 'exact',
			antiderivative,
			integrandType: classifyIntegrand(simplified, variable),
			technique: 'basic-rule',
			steps: recorder.getSteps(),
			constantNote: CONSTANT_OF_INTEGRATION_NOTE
		};
	}

	// Step 4: Check if constant multiple (∫cf = c∫f)
	const { constant, rest } = extractConstantMultiplier(simplified, variable);

	if (constant) {
		recorder.recordStepByRule(
			'constant-multiple',
			simplified,
			simplified,
			'detailed',
			constant,
			'Factorisation de la constante multiplicative'
		);

		// Integrate the rest
		const restRecorder = createStepRecorder();
		const restResult = integrateInternal(rest, variable, options, restRecorder, depth + 1);

		if (restResult.status === 'unsupported') {
			return restResult;
		}

		// Merge steps
		restRecorder.getSteps().forEach((step) => {
			recorder.recordStep(
				step.rule,
				step.description,
				step.before,
				step.after,
				'detailed',
				step.operand,
				step.technicalNote
			);
		});

		// Multiply result by constant
		const antiderivative = simplifiedMultiply(constant, restResult.antiderivative!);

		recorder.recordStepByRule(
			'constant-multiple',
			simplified,
			antiderivative,
			'summarized',
			constant
		);

		return {
			variable,
			status: 'exact',
			antiderivative,
			integrandType: classifyIntegrand(simplified, variable),
			technique: 'basic-rule',
			steps: recorder.getSteps(),
			constantNote: CONSTANT_OF_INTEGRATION_NOTE
		};
	}

	// Step 4b: somme de c·xᵖ (c/xⁿ, √x, x√x, (x² + 1)/x, a/x…) → règle de la
	// puissance terme à terme ; x⁻¹ donne ln|x|
	const powerTerms = asPowerSum(simplified, variable);
	if (powerTerms !== null) {
		const rewritten = powerSumAsNode(powerTerms, variable);
		const antiderivative = integratePowerSum(powerTerms, variable);
		recorder.recordStep(
			'identify-integrand',
			`Écriture en somme de puissances de ${variable}`,
			simplified,
			rewritten,
			'detailed'
		);
		recorder.recordStepByRule('power-rule', rewritten, antiderivative, 'summarized');
		return {
			variable,
			status: 'exact',
			antiderivative,
			integrandType: classifyIntegrand(simplified, variable),
			technique: 'basic-rule',
			steps: recorder.getSteps(),
			constantNote: CONSTANT_OF_INTEGRATION_NOTE
		};
	}

	// Step 5: Try integrators in priority order
	const integrator = selectIntegrator(simplified, variable);
	const selected = integrator
		? integrator.integrate(simplified, variable, options, recorder, depth)
		: null;
	if (selected !== null && selected.status !== 'unsupported') {
		return selected;
	}

	// Step 5b: recours après un refus — u′·f(u) avec u non linéaire, sin²/cos²,
	// puis identités usuelles (1/cos², tan², 1/tan, |ax + b|, ln x / xᵖ)
	const chained = integrateByChainRule(simplified, variable, options, recorder, depth);
	if (chained !== null) {
		return chained;
	}
	const byIdentity = integrateByIdentity(simplified, variable, options, recorder, depth);
	if (byIdentity !== null) {
		return byIdentity;
	}
	if (selected !== null) {
		return selected;
	}

	// Step 6: Unsupported
	return {
		variable,
		status: 'unsupported',
		antiderivative: null,
		integrandType: classifyIntegrand(simplified, variable),
		technique: 'basic-rule',
		steps: recorder.getSteps(),
		error: `Impossible d'intégrer cette expression avec les techniques disponibles`
	};
}

// =============================================================================
// Main Integrate Function
// =============================================================================

/**
 * Integrate an expression for a specified variable.
 *
 * This is the main entry point for indefinite integration.
 *
 * @param expr - The expression to integrate
 * @param options - Integration options
 * @returns IntegrateResult with antiderivative and metadata
 *
 * @example
 * ```typescript
 * // Integrate x²
 * const result = integrate(power(variable('x'), number('2')));
 * // result.antiderivative = x³/3
 * ```
 *
 * @example
 * ```typescript
 * // Integrate with detailed steps
 * const result = integrate(expr, { verbosity: 'detailed' });
 * result.steps.forEach(step => console.log(step.description));
 * ```
 */
export function integrate(rawExpr: MathNode, options?: IntegrateOptions): IntegrateResult {
	// Premier appel (non imbriqué) : le budget repart de zéro, et TOUT le
	// calcul — mise en forme finale comprise — est placé sous le signal ambiant
	if (activeIntegrations === 0) {
		integrationSteps = 0;
		integrationDeadline = performance.now() + MAX_INTEGRATION_MS;
		const outer = getActiveAbortChecker();
		const hardDeadline = integrationDeadline + FINISHING_MS;
		const checker: AbortChecker = () => (outer?.() ?? false) || performance.now() > hardDeadline;
		try {
			return withActiveAbortChecker(checker, () => integrateCounted(rawExpr, options));
		} catch (error) {
			// Signal de l'appelant : il lui revient ; le nôtre : refus propre
			if (!(error instanceof AbortError) || outer?.()) throw error;
			return oversizedResult(
				options?.variable ?? 'x',
				`Budget de calcul dépassé (${MAX_INTEGRATION_MS + FINISHING_MS} ms)`
			);
		}
	}
	return integrateCounted(rawExpr, options);
}

/** Le signal ambiant (budget global) combiné à un délai local */
function withAmbient(local: AbortChecker | undefined): AbortChecker | undefined {
	const ambient = getActiveAbortChecker();
	if (ambient === undefined) return local;
	if (local === undefined) return ambient;
	return () => ambient() || local();
}

function integrateCounted(rawExpr: MathNode, options?: IntegrateOptions): IntegrateResult {
	activeIntegrations++;
	try {
		const result = integrateWithinBudget(rawExpr, options);
		if (
			result.antiderivative !== null &&
			exceedsNodeCount(result.antiderivative, MAX_INTEGRATION_NODES)
		) {
			return oversizedResult(
				result.variable,
				`Primitive trop grande (plus de ${MAX_INTEGRATION_NODES} nœuds)`
			);
		}
		return result;
	} finally {
		activeIntegrations--;
	}
}

function integrateWithinBudget(rawExpr: MathNode, options?: IntegrateOptions): IntegrateResult {
	// `sin^2(x)` : exposant porté par `power` du nœud fonction. Les intégrateurs
	// reconnaissent `sin(x)` par son nom et ignoraient l'exposant (∫sin²x
	// rendait −cos x) : on se ramène à `sin(x)^2` avant toute classification.
	const expandedExpr = expandFunctionPowers(rawExpr);

	// Merge options with defaults
	const opts = {
		...DEFAULT_INTEGRATE_OPTIONS,
		...options
	};

	// La lettre `e` tapée est la constante d'Euler (sauf si l'on intègre en `e`)
	const eulerExpr = promoteEulerLetter(expandedExpr, opts.variable);

	// ⁿ√u (n impair ≥ 3) → u^{1/n} : le moteur calcule en puissances ; la
	// primitive est réécrite en racines à la sortie (définie sur ℝ, comme ⁿ√)
	const hasOddRoot = containsOddRoot(eulerExpr);
	const expr = hasOddRoot ? oddRootsAsPowers(eulerExpr) : eulerExpr;

	// Detect variable if not specified
	const variable = opts.variable ?? detectVariable(expr);

	// Handle constant expressions (no variable)
	if (!variable) {
		const recorder = createStepRecorder();
		recorder.recordStepByRule('constant-rule', expr, expr, 'detailed');

		// ∫ c dx requires a variable name - use 'x' as default
		const defaultVar = 'x';
		let antiderivative = simplifiedMultiply(expr, { type: 'variable', name: defaultVar });

		// Apply normalization if enabled
		if (opts.normalizeResult) {
			antiderivative = normalizeAntiderivative(antiderivative);
		}

		recorder.recordStepByRule('constant-rule', expr, antiderivative, 'summarized');

		return {
			variable: defaultVar,
			status: 'exact',
			antiderivative,
			integrandType: 'polynomial',
			technique: 'basic-rule',
			steps: recorder.getStepsFiltered(opts.verbosity),
			constantNote: CONSTANT_OF_INTEGRATION_NOTE
		};
	}

	// Create step recorder
	const recorder = createStepRecorder();

	// Use _depth from options if provided (for recursive calls from integrators)
	const startDepth = opts._depth ?? 0;

	// Run the integration
	const result = integrateInternal(expr, variable, opts, recorder, startDepth);

	// Apply final normalization if enabled and integration was successful
	// IMPORTANT: Only normalize at the top level (startDepth === 0) to avoid
	// corrupting intermediate results during recursive integration
	let finalAntiderivative = result.antiderivative;
	// ln|u| → ln(u) AVANT la normalisation aussi : sinon ln|u|·ln(u) (parties
	// sur u′/u · ln u) ne se regroupe pas en (ln u)²
	if (result.status === 'exact' && finalAntiderivative && startDepth === 0) {
		finalAntiderivative = dropAbsOfPositive(finalAntiderivative, variable);
	}
	if (
		opts.normalizeResult &&
		result.status === 'exact' &&
		finalAntiderivative &&
		startDepth === 0
	) {
		// c·uⁿ⁺¹ gardée en puissance de u (⅓(x + 1)³) : écriture de classe, non développée
		// k·u|u| (primitive de |au + b|, |·| tapée par l'élève) gardée en produit
		const powerForm =
			powerOfSumForm(finalAntiderivative, variable) ??
			(containsAbs(rawExpr) ? absProductForm(finalAntiderivative, variable) : null);
		finalAntiderivative =
			powerForm ??
			dropConstantTerms(
				groupLnTerms(normalizeAntiderivative(finalAntiderivative, variable), variable),
				variable
			);
		// arctan((2x + 1)/√3) plutôt que arctan(⅔√3 x + ⅓√3)
		finalAntiderivative = arctanClassForm(finalAntiderivative, variable);
		// `\exp(…)` seulement si l'élève l'a tapé : sinon `e^{…}`, comme sa saisie
		if (!containsExpFunction(rawExpr)) {
			finalAntiderivative = expAsEulerPower(finalAntiderivative);
		}
	}
	// ln|c·u| → ln|u| (ln|c| absorbé dans la constante, cf. ln-constant.ts),
	// puis ln|u| → ln(u) quand u > 0 sur ℝ (ln(x² + 1), ln(eˣ + 1)) : écriture de classe
	if (result.status === 'exact' && finalAntiderivative && startDepth === 0) {
		finalAntiderivative = absorbLnConstantFactors(finalAntiderivative, variable);
		finalAntiderivative = dropAbsOfPositive(finalAntiderivative, variable);
	}
	// u^{p/n} (n impair) n'est définie que pour u > 0 : réécrite en racines,
	// la primitive est définie là où l'intégrande ⁿ√… l'est (∛(2x+1) sur ℝ)
	if (hasOddRoot && result.status === 'exact' && finalAntiderivative && startDepth === 0) {
		finalAntiderivative = oddPowersAsRoots(finalAntiderivative);
	}

	// ln|x² + 1| → ln(x² + 1) dans les étapes aussi (substitute-back, linéarité)
	const steps = recorder.getStepsFiltered(opts.verbosity);
	return {
		...result,
		antiderivative: finalAntiderivative,
		steps:
			result.status === 'exact' && startDepth === 0
				? steps.map((step) => ({
						...step,
						before: dropAbsOfPositive(step.before, variable),
						after: dropAbsOfPositive(step.after, variable)
					}))
				: steps
	};
}

// =============================================================================
// Definite Integral Function
// =============================================================================

/** Valeur numérique d'une borne (NaN si littérale : `a`, `b`) */
function numericBound(bound: MathNode): number {
	try {
		return compile(bound)({});
	} catch {
		return Number.NaN;
	}
}

/**
 * Compute a definite integral from lower to upper bound.
 *
 * Uses the fundamental theorem of calculus: ∫ₐᵇ f(x) dx = F(b) - F(a)
 * where F is an antiderivative of f.
 *
 * @param expr - The integrand
 * @param lower - Lower bound of integration
 * @param upper - Upper bound of integration
 * @param options - Integration options
 * @returns DefiniteIntegrateResult with value and bounds
 *
 * @example
 * ```typescript
 * // ∫₀¹ x² dx = [x³/3]₀¹ = 1/3
 * const result = integrateDefinite(
 *   power(variable('x'), number('2')),
 *   number('0'),
 *   number('1')
 * );
 * // result.value = 1/3
 * ```
 */
export function integrateDefinite(
	expr: MathNode,
	lower: MathNode,
	upper: MathNode,
	options?: IntegrateOptions
): DefiniteIntegrateResult {
	// Merge options with defaults
	const opts = {
		...DEFAULT_INTEGRATE_OPTIONS,
		...options
	};

	// First, find the indefinite integral
	const indefiniteResult = integrate(expr, options);

	if (indefiniteResult.status === 'unsupported' || !indefiniteResult.antiderivative) {
		// If symbolic integration failed and numeric fallback is enabled, try numeric integration
		if (opts.allowNumeric && isNumber(lower) && isNumber(upper)) {
			const variable = indefiniteResult.variable;

			try {
				const numericResult = numericIntegrate(
					expr,
					variable,
					parseFloat(lower.value),
					parseFloat(upper.value),
					{
						tolerance: 1e-6,
						maxDepth: 15,
						method: 'adaptive-simpson'
					}
				);

				const recorder = createStepRecorder();
				recorder.recordStep(
					'numeric-simpson',
					`Approximation numérique par la méthode de Simpson adaptative`,
					expr,
					numericNode(numericResult.value),
					'summarized',
					undefined,
					`Erreur estimée: ${numericResult.error.toExponential(2)}`
				);

				return {
					...indefiniteResult,
					status: 'approximate',
					technique: 'numeric',
					lowerBound: lower,
					upperBound: upper,
					value: numericNode(numericResult.value),
					approximate: numericResult.value,
					steps: recorder.getStepsFiltered(opts.verbosity)
				};
			} catch (error) {
				// Numeric integration also failed
				return {
					...indefiniteResult,
					lowerBound: lower,
					upperBound: upper,
					value: null,
					approximate: undefined,
					error: `Impossible d'intégrer symboliquement ou numériquement: ${error instanceof Error ? error.message : String(error)}`
				};
			}
		}

		// Numeric fallback disabled or bounds are not numeric
		return {
			...indefiniteResult,
			lowerBound: lower,
			upperBound: upper,
			value: null,
			approximate: undefined
		};
	}

	// Apply fundamental theorem: F(b) - F(a)
	const recorder = createStepRecorder();
	const variable = indefiniteResult.variable;
	// Une borne `e` (parseLatex : variable) est la constante d'Euler, comme
	// pour `evaluate` et `compile` — sinon ∫₁ᵉ dx/x restait `ln(e)`
	const lowerBound = promoteEulerLetter(lower, variable);
	const upperBound = promoteEulerLetter(upper, variable);

	// F(b) − F(a) n'a de sens que si F est continue sur [a ; b] : à travers un
	// pôle, refus explicite — jamais une valeur (revue de #947)
	const discontinuity = antiderivativeDiscontinuity(
		indefiniteResult.antiderivative,
		variable,
		numericBound(lowerBound),
		numericBound(upperBound)
	);
	if (discontinuity !== null) {
		return {
			...indefiniteResult,
			status: 'unsupported',
			lowerBound: lower,
			upperBound: upper,
			value: null,
			approximate: undefined,
			steps: [],
			error: `L'intégrale diverge ou n'est pas définie sur [${toCustom(lowerBound)} ; ${toCustom(upperBound)}] : ${discontinuity}`
		};
	}

	recorder.recordStep(
		'fundamental-theorem',
		'Application du théorème fondamental du calcul intégral',
		indefiniteResult.antiderivative,
		indefiniteResult.antiderivative,
		'detailed',
		undefined,
		`Évaluation de F(${variable}) aux bornes`
	);

	try {
		// Evaluate F(upper)
		const upperSubstituted = substitute(indefiniteResult.antiderivative, {
			[variable]: upperBound
		});
		const upperEval = evaluate(upperSubstituted, { mode: 'exact' });

		// Evaluate F(lower)
		const lowerSubstituted = substitute(indefiniteResult.antiderivative, {
			[variable]: lowerBound
		});
		const lowerEval = evaluate(lowerSubstituted, { mode: 'exact' });

		if (upperEval.status !== 'value' || lowerEval.status !== 'value') {
			// Bornes ou primitive littérales (`∫₀ᵃ x² dx`, `∫₀² ax dx`) : la valeur
			// reste symbolique, F(b) − F(a) simplifiée — jamais « exact » sans valeur
			const normalized = normalizeAntiderivative(subtract(upperSubstituted, lowerSubstituted));
			// `e^{…}` tapé → valeur écrite `e^{…}`, comme la primitive
			const symbolic = containsExpFunction(expr) ? normalized : expAsEulerPower(normalized);
			recorder.recordStep(
				'fundamental-theorem',
				`Valeur de l'intégrale définie`,
				indefiniteResult.antiderivative,
				symbolic,
				'summarized',
				undefined,
				`F(${toCustom(upperBound)}) - F(${toCustom(lowerBound)})`
			);
			return {
				...indefiniteResult,
				lowerBound: lower,
				upperBound: upper,
				value: symbolic,
				approximate: undefined,
				steps: recorder.getStepsFiltered(options?.verbosity ?? DEFAULT_INTEGRATE_OPTIONS.verbosity)
			};
		}

		// Compute F(upper) - F(lower)
		const difference = subtract(upperEval.node, lowerEval.node);
		const valueEval = evaluate(difference, { mode: 'exact' });

		if (valueEval.status !== 'value') {
			throw new Error("Impossible d'évaluer la différence F(upper) - F(lower)");
		}

		recorder.recordStep(
			'fundamental-theorem',
			`Valeur de l'intégrale définie`,
			indefiniteResult.antiderivative,
			valueEval.node,
			'summarized',
			undefined,
			`F(${upper}) - F(${lower})`
		);

		return {
			...indefiniteResult,
			lowerBound: lower,
			upperBound: upper,
			value: containsExpFunction(expr) ? valueEval.node : expAsEulerPower(valueEval.node),
			approximate: typeof valueEval.value === 'number' ? valueEval.value : undefined,
			steps: recorder.getStepsFiltered(options?.verbosity ?? DEFAULT_INTEGRATE_OPTIONS.verbosity)
		};
	} catch (error) {
		// If evaluation fails, return without value
		return {
			...indefiniteResult,
			lowerBound: lower,
			upperBound: upper,
			value: null,
			approximate: undefined,
			error: `Impossible d'évaluer l'intégrale aux bornes: ${error instanceof Error ? error.message : String(error)}`
		};
	}
}
