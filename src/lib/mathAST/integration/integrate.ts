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
	IntegrateStepRecorder
} from './types';
import { DEFAULT_INTEGRATE_OPTIONS } from './types';
import { detectVariable, classifyIntegrand } from './classify';
import { createStepRecorder } from './step-recorder';
import { selectIntegrator } from './integrators';
import { containsVariable } from './rules';
import { simplify } from '../normal/rules';
import { number, add as addFactory, multiply as multiplyFactory, subtract } from '../factory';
import { isAddition, isSubtraction, isMultiplication, isNumber } from '../guards';
import { CONSTANT_OF_INTEGRATION_NOTE } from './descriptions-fr';
import { evaluate } from '../eval/evaluate';
import { substitute } from '../eval/substitute';
import { numericIntegrate } from './numeric';

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

	// No constant multiplier
	return { constant: null, rest: expr };
}

/**
 * Simplify addition to avoid redundant steps.
 */
function simplifiedAdd(left: MathNode, right: MathNode): MathNode {
	// 0 + x = x
	if (isNumber(left) && left.value === '0') return right;
	// x + 0 = x
	if (isNumber(right) && right.value === '0') return left;

	return addFactory(left, right);
}

/**
 * Simplify multiplication to avoid redundant steps.
 */
function simplifiedMultiply(left: MathNode, right: MathNode): MathNode {
	// 0 * x = 0
	if (isNumber(left) && left.value === '0') return number('0');
	if (isNumber(right) && right.value === '0') return number('0');

	// 1 * x = x
	if (isNumber(left) && left.value === '1') return right;
	// x * 1 = x
	if (isNumber(right) && right.value === '1') return left;

	return multiplyFactory(left, right, 'implicit');
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
	options: Required<Omit<IntegrateOptions, 'variable'>>,
	recorder: IntegrateStepRecorder,
	depth: number
): IntegrateResult {
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
	const simplified = options.simplify ? simplify(expr) : expr;

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

	// Step 5: Try integrators in priority order
	const integrator = selectIntegrator(simplified, variable);

	if (integrator) {
		return integrator.integrate(simplified, variable, options, recorder, depth);
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
export function integrate(expr: MathNode, options?: IntegrateOptions): IntegrateResult {
	// Merge options with defaults
	const opts = {
		...DEFAULT_INTEGRATE_OPTIONS,
		...options
	};

	// Detect variable if not specified
	const variable = opts.variable ?? detectVariable(expr);

	// Handle constant expressions (no variable)
	if (!variable) {
		const recorder = createStepRecorder();
		recorder.recordStepByRule('constant-rule', expr, expr, 'detailed');

		// ∫ c dx requires a variable name - use 'x' as default
		const defaultVar = 'x';
		const antiderivative = simplifiedMultiply(expr, { type: 'variable', name: defaultVar });

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

	// Run the integration
	const result = integrateInternal(expr, variable, opts, recorder, 0);

	// Filter steps by verbosity
	return {
		...result,
		steps: recorder.getStepsFiltered(opts.verbosity)
	};
}

// =============================================================================
// Definite Integral Function
// =============================================================================

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
					number(numericResult.value.toString()),
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
					value: number(numericResult.value.toString()),
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
			[variable]: upper
		});
		const upperEval = evaluate(upperSubstituted, { mode: 'exact' });

		// Evaluate F(lower)
		const lowerSubstituted = substitute(indefiniteResult.antiderivative, {
			[variable]: lower
		});
		const lowerEval = evaluate(lowerSubstituted, { mode: 'exact' });

		// Compute F(upper) - F(lower)
		const difference = subtract(upperEval.node, lowerEval.node);
		const valueEval = evaluate(difference, { mode: 'exact' });

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
			value: valueEval.node,
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
