/**
 * Periodicity Detection
 *
 * Detects whether mathematical expressions are periodic and computes their period.
 * A function f(x) is periodic with period T if f(x + T) = f(x) for all x in domain.
 *
 * @module mathAST/analysis/periodicity
 */

import type { MathNode } from '../types';
import type { Verbosity } from '../common/verbosity';
import { isNumber } from '../guards';
import { number, multiply, divide, PI, TWO_PI } from '../factory';
import { getVariables } from '../eval/substitute';
import { evaluateNodeToApproximatedNumber } from '../eval/evaluate';
import { extractLinearForm } from './coefficient-utils';
import { toLatex } from '../latex-generator';

// =============================================================================
// Types
// =============================================================================

/**
 * Rules applied during periodicity detection.
 */
export type PeriodicityRule =
	| 'base_period' // sin(x) has period 2π
	| 'user_function' // User-defined periodic function
	| 'scaling' // sin(2x) has period π (2π/2)
	| 'translation' // sin(x + a) has same period as sin(x)
	| 'even_power' // sin²(x) has period π (halved by antisymmetry)
	| 'odd_power' // sin³(x) has period 2π (unchanged)
	| 'product_antisymmetry' // sin(x)·cos(x) has period π
	| 'quotient_antisymmetry' // sin(x)/cos(x) has period π
	| 'absolute_value' // |sin(x)| has period π
	| 'step_function' // floor(x) has period 1
	| 'composition' // sin(sin(x)) inherits period from inner
	| 'exponential' // a^{sin(x)} inherits period
	| 'sum_lcm' // sin(x) + cos(x) → LCM of periods
	| 'constant_offset' // sin(x) + 1 has same period
	| 'constant_factor' // 2·sin(x) has same period
	| 'not_periodic'; // Expression is not periodic

/**
 * A pedagogical step explaining periodicity reasoning.
 */
export interface PeriodicityStep {
	/** Unique step identifier */
	readonly id: number;

	/** Rule applied in this step */
	readonly rule: PeriodicityRule;

	/** Human-readable description in French */
	readonly description: string;

	/** Mathematical detail (LaTeX) */
	readonly detail?: string;

	/** Minimum verbosity level to include this step */
	readonly verbosityLevel: Verbosity;
}

/**
 * Result of periodicity detection
 */
export interface PeriodicityResult {
	/** Whether the expression is periodic */
	readonly isPeriodic: boolean;

	/** The period as a MathNode (e.g., π, 2π, π/2) */
	readonly period: MathNode | null;

	/** Numeric approximation of the period */
	readonly periodNumeric: number | null;

	/** The variable analyzed */
	readonly variable: string;

	/** Confidence level */
	readonly confidence: 'proven' | 'heuristic';

	/** Reason for the result */
	readonly reason?: string;

	/** Pedagogical explanation steps */
	readonly steps?: readonly PeriodicityStep[];
}

// =============================================================================
// Rule Descriptions (French)
// =============================================================================

/**
 * French descriptions for periodicity rules.
 */
const RULE_DESCRIPTIONS: Record<PeriodicityRule, string> = {
	base_period: 'Période de base de la fonction',
	user_function: 'Fonction utilisateur définie avec période personnalisée',
	scaling: "Dilatation de l'argument",
	translation: "Translation de l'argument (période inchangée)",
	even_power: 'Puissance paire : la période est divisée par 2',
	odd_power: 'Puissance impaire : la période est inchangée',
	product_antisymmetry: 'Produit de fonctions antisymétriques : période divisée par 2',
	quotient_antisymmetry: 'Quotient de fonctions antisymétriques : période divisée par 2',
	absolute_value: "Valeur absolue d'une fonction antisymétrique : période divisée par 2",
	step_function: 'Fonction en escalier : période 1',
	composition: 'Composition : la période est héritée de la fonction intérieure',
	exponential: "Exponentielle d'une fonction périodique : même période",
	sum_lcm: 'Somme de fonctions périodiques : PPCM des périodes',
	constant_offset: 'Addition de constante : période inchangée',
	constant_factor: 'Multiplication par constante : période inchangée',
	not_periodic: "L'expression n'est pas périodique"
};

// =============================================================================
// Step Accumulator
// =============================================================================

/**
 * Accumulates pedagogical steps during detection.
 */
class StepAccumulator {
	private steps: PeriodicityStep[] = [];
	private nextId = 1;

	/**
	 * Add a step to the accumulator.
	 */
	add(rule: PeriodicityRule, detail?: string, verbosityLevel: Verbosity = 'summarized'): void {
		this.steps.push({
			id: this.nextId++,
			rule,
			description: RULE_DESCRIPTIONS[rule],
			detail,
			verbosityLevel
		});
	}

	/**
	 * Get all accumulated steps.
	 */
	getSteps(): readonly PeriodicityStep[] {
		return this.steps;
	}

	/**
	 * Get steps filtered by verbosity level.
	 */
	getStepsFiltered(verbosity: Verbosity): readonly PeriodicityStep[] {
		if (verbosity === 'result') return [];
		const order = { result: 0, summarized: 1, detailed: 2 };
		return this.steps.filter((s) => order[s.verbosityLevel] <= order[verbosity]);
	}
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Known mathematical constants that should not be treated as variables.
 * These are represented as MathConstantNode in the AST.
 */
const MATH_CONSTANTS = new Set(['pi', 'euler']);

/**
 * Filter out known mathematical constants from a set of variables.
 */
function filterVariables(vars: Set<string>): Set<string> {
	const result = new Set<string>();
	for (const v of vars) {
		if (!MATH_CONSTANTS.has(v)) {
			result.add(v);
		}
	}
	return result;
}

// =============================================================================
// Known Periodic Functions
// =============================================================================

/**
 * Map of function names to their base periods (as MathNode).
 * Period is for f(x), not f(kx).
 */
const FUNCTION_PERIODS: Map<string, MathNode> = new Map([
	// Primary trig functions
	['sin', TWO_PI],
	['cos', TWO_PI],
	['tan', PI],
	['cot', PI],
	['sec', TWO_PI],
	['csc', TWO_PI]
	// Note: hyperbolic functions are NOT periodic on ℝ
]);

/**
 * Step functions with period 1.
 * floor(x+1) = floor(x) + 1, ceil(x+1) = ceil(x) + 1
 * These are "quasi-periodic" - the pattern repeats with offset.
 * frac(x) = x - floor(x) is truly periodic with period 1.
 */
const STEP_FUNCTION_PERIOD = number('1');
const STEP_FUNCTIONS = new Set(['floor', 'ceil', 'frac']);

// =============================================================================
// User-Defined Periodic Functions Registry
// =============================================================================

/**
 * Configuration for a user-defined periodic function.
 */
export interface UserPeriodicFunction {
	/** The base period of the function (as MathNode) */
	readonly period: MathNode;

	/** Whether the function has half-period antisymmetry: f(x + T/2) = -f(x) */
	readonly hasHalfPeriodAntisymmetry: boolean;

	/** Optional description for pedagogical output */
	readonly description?: string;
}

/**
 * Options for registering a periodic function.
 */
export interface RegisterFunctionOptions {
	/** Whether f(x + T/2) = -f(x), default: false */
	hasHalfPeriodAntisymmetry?: boolean;

	/** Optional description for steps */
	description?: string;
}

/**
 * Registry for user-defined periodic functions.
 * Key is the function name, value is the function configuration.
 */
const userFunctionRegistry = new Map<string, UserPeriodicFunction>();

/**
 * Register a user-defined periodic function.
 *
 * @param name - The function name (e.g., 'myFunc')
 * @param period - The period as a MathNode or number
 * @param options - Optional configuration (antisymmetry, description)
 *
 * @example
 * // Register a simple periodic function with period 1
 * registerPeriodicFunction('sawtooth', 1);
 *
 * // Register a function with symbolic period π
 * registerPeriodicFunction('myTrig', PI);
 *
 * // Register with antisymmetry (like sin)
 * registerPeriodicFunction('wave', TWO_PI, { hasHalfPeriodAntisymmetry: true });
 *
 * // Register with description for pedagogical output
 * registerPeriodicFunction('heartbeat', 1, {
 *   description: 'Fonction de battement cardiaque'
 * });
 */
export function registerPeriodicFunction(
	name: string,
	period: MathNode | number,
	options: RegisterFunctionOptions = {}
): void {
	const periodNode = typeof period === 'number' ? number(String(period)) : period;

	userFunctionRegistry.set(name, {
		period: periodNode,
		hasHalfPeriodAntisymmetry: options.hasHalfPeriodAntisymmetry ?? false,
		description: options.description
	});
}

/**
 * Unregister a user-defined periodic function.
 *
 * @param name - The function name to unregister
 * @returns true if the function was registered, false otherwise
 *
 * @example
 * unregisterPeriodicFunction('myFunc');
 */
export function unregisterPeriodicFunction(name: string): boolean {
	return userFunctionRegistry.delete(name);
}

/**
 * Clear all user-defined periodic functions.
 * Useful for testing or resetting state.
 */
export function clearPeriodicFunctionRegistry(): void {
	userFunctionRegistry.clear();
}

/**
 * Get all registered user-defined periodic functions.
 *
 * @returns Map of function names to their configurations
 *
 * @example
 * const registered = getRegisteredPeriodicFunctions();
 * for (const [name, config] of registered) {
 *   console.log(`${name}: period = ${config.period}`);
 * }
 */
export function getRegisteredPeriodicFunctions(): ReadonlyMap<string, UserPeriodicFunction> {
	return userFunctionRegistry;
}

/**
 * Check if a function is registered as user-defined.
 *
 * @param name - The function name to check
 * @returns true if registered, false otherwise
 */
export function isRegisteredPeriodicFunction(name: string): boolean {
	return userFunctionRegistry.has(name);
}

/**
 * Get a user-defined periodic function by name.
 *
 * @param name - The function name
 * @returns The function configuration, or undefined if not registered
 */
function getUserPeriodicFunction(name: string): UserPeriodicFunction | undefined {
	return userFunctionRegistry.get(name);
}

/**
 * Get the base period of a known periodic function.
 * Checks user registry first, then built-in functions.
 */
function getBasePeriod(funcName: string): MathNode | null {
	// Check user registry first
	const userFunc = getUserPeriodicFunction(funcName);
	if (userFunc) {
		return userFunc.period;
	}
	// Fall back to built-in functions
	return FUNCTION_PERIODS.get(funcName) ?? null;
}

/**
 * Built-in functions with half-period antisymmetry: f(x + T/2) = -f(x)
 * sin(x + π) = -sin(x), cos(x + π) = -cos(x), etc.
 */
const FUNCTIONS_WITH_ANTISYMMETRY = new Set(['sin', 'cos', 'sec', 'csc']);

/**
 * Check if a function has half-period antisymmetry.
 * Checks user registry first, then built-in set.
 */
function hasAntisymmetry(funcName: string): boolean {
	const userFunc = getUserPeriodicFunction(funcName);
	if (userFunc) {
		return userFunc.hasHalfPeriodAntisymmetry;
	}
	return FUNCTIONS_WITH_ANTISYMMETRY.has(funcName);
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Divide a period by a coefficient.
 * period / |coefficient|
 */
function dividePeriod(period: MathNode, coefficient: MathNode): MathNode {
	// If coefficient is 1, return period unchanged
	if (isNumber(coefficient) && coefficient.value === '1') {
		return period;
	}

	// Take absolute value of coefficient for period calculation
	let absCoeff = coefficient;
	if (isNumber(coefficient)) {
		const val = parseFloat(coefficient.value);
		if (val < 0) {
			absCoeff = number(String(Math.abs(val)));
		}
	}

	return divide(period, absCoeff, 'fraction');
}

/**
 * Compute numeric value of a period node.
 */
function periodToNumeric(period: MathNode): number | null {
	try {
		const value = evaluateNodeToApproximatedNumber(period);
		return isFinite(value) && value > 0 ? value : null;
	} catch {
		return null;
	}
}

/**
 * Compute GCD of two positive numbers.
 */
function gcd(a: number, b: number): number {
	const epsilon = 1e-10;
	while (b > epsilon) {
		const t = b;
		b = a % b;
		a = t;
	}
	return a;
}

/**
 * Compute LCM of two positive numbers.
 */
function lcm(a: number, b: number): number {
	return (a * b) / gcd(a, b);
}

/**
 * Check if two periods are commensurable (have a common period).
 * Returns the LCM if they are, null otherwise.
 */
function combinePeriods(p1: number, p2: number): number | null {
	// Check if ratio is rational (approximately)
	const ratio = p1 / p2;
	const tolerance = 1e-9;

	// Try to find small integer ratio
	for (let d = 1; d <= 100; d++) {
		const n = Math.round(ratio * d);
		if (Math.abs(ratio - n / d) < tolerance) {
			// Found rational ratio n/d
			return lcm(p1, p2);
		}
	}

	// Periods are likely incommensurable
	return null;
}

/**
 * Combine two symbolic periods, returning the LCM as a symbolic MathNode.
 * Tries to preserve symbolic representation when possible.
 */
function combineSymbolicPeriods(
	period1: MathNode,
	numeric1: number,
	period2: MathNode,
	numeric2: number
): MathNode {
	const combinedNumeric = lcm(numeric1, numeric2);
	const tolerance = 1e-9;

	// If periods are equal, return either one (prefer first)
	if (Math.abs(numeric1 - numeric2) < tolerance) {
		return period1;
	}

	// If combinedNumeric equals one of them, return that symbolic period
	if (Math.abs(combinedNumeric - numeric1) < tolerance) {
		return period1;
	}
	if (Math.abs(combinedNumeric - numeric2) < tolerance) {
		return period2;
	}

	// LCM is a multiple of period1: try to express as n * period1
	const ratio1 = combinedNumeric / numeric1;
	if (Math.abs(ratio1 - Math.round(ratio1)) < tolerance) {
		const n = Math.round(ratio1);
		return multiply(number(String(n)), period1, 'implicit');
	}

	// LCM is a multiple of period2: try to express as n * period2
	const ratio2 = combinedNumeric / numeric2;
	if (Math.abs(ratio2 - Math.round(ratio2)) < tolerance) {
		const n = Math.round(ratio2);
		return multiply(number(String(n)), period2, 'implicit');
	}

	// Fallback to numeric
	return number(String(combinedNumeric));
}

/**
 * Halve a symbolic period: period / 2
 */
function halveSymbolicPeriod(period: MathNode, periodNumeric: number): MathNode {
	// Check if period is 2π (common case)
	const twoPiNumeric = 2 * Math.PI;
	if (Math.abs(periodNumeric - twoPiNumeric) < 1e-9) {
		return PI; // 2π / 2 = π
	}

	// General case: divide by 2
	return divide(period, number('2'), 'fraction');
}

// =============================================================================
// Main Detection Functions
// =============================================================================

/**
 * Internal result type with antisymmetry tracking for minimal period computation.
 * If hasHalfPeriodAntisymmetry is true, f(x + T/2) = -f(x), meaning:
 * - f²(x) has period T/2
 * - f(x) · g(x) has period T/2 if both have this property
 */
interface InternalPeriodResult {
	period: MathNode;
	periodNumeric: number;
	/** Whether f(x + period/2) = -f(x) */
	hasHalfPeriodAntisymmetry: boolean;
}

/**
 * Format a period as LaTeX string for step details.
 */
function formatPeriod(period: MathNode): string {
	try {
		return toLatex(period);
	} catch {
		return '?';
	}
}

/**
 * Detect periodicity of a function node.
 * Returns the period if found, null otherwise.
 *
 * @param node - The node to analyze
 * @param variable - The variable to check periodicity for
 * @param steps - Step accumulator for pedagogical explanations
 */
function detectPeriodForNode(
	node: MathNode,
	variable: string,
	steps: StepAccumulator
): InternalPeriodResult | null {
	// Check if expression contains the variable
	const vars = getVariables(node);
	if (!vars.has(variable)) {
		// Constant - not periodic in the traditional sense
		// (or you could say period is any positive number)
		return null;
	}

	switch (node.type) {
		case 'function': {
			const basePeriod = getBasePeriod(node.name);
			const arg = node.args.length > 0 ? node.args[0] : null;

			if (!arg) {
				return null;
			}

			// Handle absolute value: |f(x)|
			// If f has half-period antisymmetry, |f| has half the period
			// |sin(x)| has period π because |sin(x + π)| = |-sin(x)| = |sin(x)|
			if (node.name === 'abs') {
				const argResult = detectPeriodForNode(arg, variable, steps);
				if (argResult) {
					if (argResult.hasHalfPeriodAntisymmetry) {
						// Period halves for absolute value of antisymmetric function
						const minimalPeriodNumeric = argResult.periodNumeric / 2;
						const newPeriod = halveSymbolicPeriod(argResult.period, argResult.periodNumeric);
						steps.add(
							'absolute_value',
							`|f(${variable})| où f est antisymétrique en ${formatPeriod(argResult.period)}/2 → période ${formatPeriod(newPeriod)}`
						);
						return {
							period: newPeriod,
							periodNumeric: minimalPeriodNumeric,
							hasHalfPeriodAntisymmetry: false // |f| is always non-negative, no antisymmetry
						};
					}
					// No antisymmetry: period unchanged
					return {
						...argResult,
						hasHalfPeriodAntisymmetry: false
					};
				}
				return null;
			}

			// Handle step functions: floor, ceil, frac
			// floor(x), ceil(x): quasi-periodic with period 1
			// frac(x) = x - floor(x): truly periodic with period 1
			if (STEP_FUNCTIONS.has(node.name)) {
				const linearForm = extractLinearForm(arg, variable);
				if (linearForm) {
					// floor(ax + b) has period 1/|a|
					const period = dividePeriod(STEP_FUNCTION_PERIOD, linearForm.coefficient);
					const periodNumeric = periodToNumeric(period);
					if (periodNumeric !== null) {
						steps.add(
							'step_function',
							`\\${node.name}(${variable}) a pour période ${formatPeriod(period)}`
						);
						return {
							period,
							periodNumeric,
							hasHalfPeriodAntisymmetry: false // step functions have no antisymmetry
						};
					}
				}
				// Non-linear argument: check if argument is periodic
				const argResult = detectPeriodForNode(arg, variable, steps);
				if (argResult) {
					steps.add(
						'composition',
						`\\${node.name}(g(${variable})) hérite la période de g`,
						'detailed'
					);
					return {
						...argResult,
						hasHalfPeriodAntisymmetry: false
					};
				}
				return null;
			}

			// Check if argument is linear in variable: f(ax + b)
			const linearForm = extractLinearForm(arg, variable);

			if (linearForm && basePeriod) {
				// Linear argument: f(ax + b) has period = basePeriod / |a|
				let period = dividePeriod(basePeriod, linearForm.coefficient);
				let periodNumeric = periodToNumeric(period);

				if (periodNumeric === null) {
					return null;
				}

				// Check if this is a user-defined function
				const userFunc = getUserPeriodicFunction(node.name);
				const isUserDefined = userFunc !== undefined;

				// Record base period step
				if (isUserDefined) {
					const desc = userFunc.description ?? `fonction utilisateur ${node.name}`;
					steps.add('user_function', `${desc} : période de base ${formatPeriod(basePeriod)}`);
				} else {
					steps.add(
						'base_period',
						`\\${node.name}(${variable}) a pour période de base ${formatPeriod(basePeriod)}`
					);
				}

				// Record scaling if coefficient ≠ 1
				if (!isNumber(linearForm.coefficient) || linearForm.coefficient.value !== '1') {
					steps.add(
						'scaling',
						`Coefficient ${formatPeriod(linearForm.coefficient)} → période ${formatPeriod(period)}`
					);
				}

				// Record translation if offset exists
				if (linearForm.offset !== null) {
					steps.add(
						'translation',
						`Translation par ${formatPeriod(linearForm.offset)} : période inchangée`,
						'detailed'
					);
				}

				// Track antisymmetry for minimal period computation
				// Use hasAntisymmetry() which checks both user and built-in functions
				let hasHalfPeriodAntisymmetry = hasAntisymmetry(node.name);

				// Handle function with power: sin^n(x), cos^n(x), etc.
				// FunctionNode has optional power field for \sin^2(x) syntax
				if (node.power !== undefined) {
					const powerValue = evaluateNodeToApproximatedNumber(node.power);
					const isPositiveInteger =
						isFinite(powerValue) &&
						powerValue > 0 &&
						Math.abs(powerValue - Math.round(powerValue)) < 1e-10;

					if (isPositiveInteger) {
						const n = Math.round(powerValue);

						// If function has antisymmetry and power is even, period halves
						// sin²(x + π) = (-sin(x))² = sin²(x), so period is π
						if (hasHalfPeriodAntisymmetry && n % 2 === 0) {
							const oldPeriod = period;
							period = halveSymbolicPeriod(period, periodNumeric);
							periodNumeric = periodNumeric / 2;
							hasHalfPeriodAntisymmetry = false; // antisymmetry lost for even powers
							steps.add(
								'even_power',
								`Puissance ${n} (paire) : f(${variable} + T/2) = -f(${variable}) donc f^${n}(${variable} + T/2) = f^${n}(${variable}). Période ${formatPeriod(oldPeriod)} → ${formatPeriod(period)}`
							);
						} else if (n % 2 === 1) {
							// Odd power: antisymmetry preserved
							// sin³(x + π) = (-sin(x))³ = -sin³(x)
							steps.add(
								'odd_power',
								`Puissance ${n} (impaire) : l'antisymétrie est préservée, période inchangée`,
								'detailed'
							);
						}
					} else {
						// Non-integer power: antisymmetry lost
						hasHalfPeriodAntisymmetry = false;
					}
				}

				return { period, periodNumeric, hasHalfPeriodAntisymmetry };
			}

			// Non-linear argument: check if argument is itself periodic
			// f(g(x)) where g(x) has period T → f(g(x)) also has period T
			// Example: sin(sin(x)) has period 2π because sin(x) has period 2π
			const argResult = detectPeriodForNode(arg, variable, steps);
			if (argResult) {
				// Composition: f(g(x)) inherits period from g(x)
				// Note: antisymmetry is generally lost in composition
				// sin(sin(x + π)) = sin(-sin(x)) ≠ -sin(sin(x)) in general
				let { period, periodNumeric } = argResult;
				const hasHalfPeriodAntisymmetry = false;

				steps.add(
					'composition',
					`\\${node.name}(g(${variable})) : la période ${formatPeriod(period)} est héritée de l'argument`
				);

				// Handle power on function
				if (node.power !== undefined) {
					const powerValue = evaluateNodeToApproximatedNumber(node.power);
					const isEvenInteger =
						isFinite(powerValue) &&
						powerValue > 0 &&
						Math.abs(powerValue - Math.round(powerValue)) < 1e-10 &&
						Math.round(powerValue) % 2 === 0;

					// For even powers: if inner function has antisymmetry, period might halve
					// But this is complex for compositions, keep simple for now
					if (isEvenInteger && argResult.hasHalfPeriodAntisymmetry) {
						// sin²(g(x)) where g has antisymmetry - period halves
						period = halveSymbolicPeriod(period, periodNumeric);
						periodNumeric = periodNumeric / 2;
						steps.add(
							'even_power',
							`Puissance paire sur composition antisymétrique → période divisée par 2`,
							'detailed'
						);
					}
				}

				return { period, periodNumeric, hasHalfPeriodAntisymmetry };
			}

			return null;
		}

		case 'addition':
		case 'subtraction': {
			// For sum/difference, find LCM of periods
			const leftResult = detectPeriodForNode(node.left, variable, steps);
			const rightResult = detectPeriodForNode(node.right, variable, steps);

			if (leftResult && rightResult) {
				const combinedNumeric = combinePeriods(leftResult.periodNumeric, rightResult.periodNumeric);
				if (combinedNumeric !== null) {
					// Both antisymmetric with same period → result is antisymmetric
					// sin(x) + cos(x): both have period 2π and antisymmetry at π
					// (sin + cos)(x + π) = -sin(x) - cos(x) = -(sin + cos)(x)
					const bothAntisymmetric =
						leftResult.hasHalfPeriodAntisymmetry &&
						rightResult.hasHalfPeriodAntisymmetry &&
						Math.abs(leftResult.periodNumeric - rightResult.periodNumeric) < 1e-10;

					// Preserve symbolic period
					const symbolicPeriod = combineSymbolicPeriods(
						leftResult.period,
						leftResult.periodNumeric,
						rightResult.period,
						rightResult.periodNumeric
					);

					steps.add(
						'sum_lcm',
						`Somme de fonctions périodiques : PPCM(${formatPeriod(leftResult.period)}, ${formatPeriod(rightResult.period)}) = ${formatPeriod(symbolicPeriod)}`
					);

					return {
						period: symbolicPeriod,
						periodNumeric: combinedNumeric,
						hasHalfPeriodAntisymmetry: bothAntisymmetric
					};
				}
				// Incommensurable periods - not periodic
				steps.add(
					'not_periodic',
					`Périodes ${formatPeriod(leftResult.period)} et ${formatPeriod(rightResult.period)} incommensurables`
				);
				return null;
			}

			if (leftResult && !getVariables(node.right).has(variable)) {
				// f(x) + c has same period as f(x), but loses antisymmetry (unless c = 0)
				// sin(x) + 1: (sin + 1)(x + π) = -sin(x) + 1 ≠ -(sin(x) + 1)
				steps.add('constant_offset', `f(${variable}) + c : période inchangée`, 'detailed');
				return {
					...leftResult,
					hasHalfPeriodAntisymmetry: false
				};
			}

			if (rightResult && !getVariables(node.left).has(variable)) {
				// c + f(x) or c - f(x) has same period as f(x), but loses antisymmetry
				steps.add(
					'constant_offset',
					`c ${node.type === 'subtraction' ? '-' : '+'} f(${variable}) : période inchangée`,
					'detailed'
				);
				return {
					...rightResult,
					hasHalfPeriodAntisymmetry: false
				};
			}

			return null;
		}

		case 'multiplication': {
			// c * f(x) has same period as f(x)
			const leftVars = getVariables(node.left);
			const rightVars = getVariables(node.right);

			if (!leftVars.has(variable) && rightVars.has(variable)) {
				// c * f(x): antisymmetry preserved (if c ≠ 0)
				const result = detectPeriodForNode(node.right, variable, steps);
				if (result) {
					steps.add('constant_factor', `c \\cdot f(${variable}) : période inchangée`, 'detailed');
				}
				return result;
			}

			if (leftVars.has(variable) && !rightVars.has(variable)) {
				// f(x) * c: antisymmetry preserved (if c ≠ 0)
				const result = detectPeriodForNode(node.left, variable, steps);
				if (result) {
					steps.add('constant_factor', `f(${variable}) \\cdot c : période inchangée`, 'detailed');
				}
				return result;
			}

			// Both sides have variable - product of periodic functions
			const leftResult = detectPeriodForNode(node.left, variable, steps);
			const rightResult = detectPeriodForNode(node.right, variable, steps);

			if (leftResult && rightResult) {
				// Product of periodic functions with periods T1 and T2
				const combinedNumeric = combinePeriods(leftResult.periodNumeric, rightResult.periodNumeric);
				if (combinedNumeric !== null) {
					// KEY: If both have half-period antisymmetry with same period,
					// the product has HALF the period:
					// (f·g)(x + T/2) = f(x + T/2)·g(x + T/2) = (-f(x))·(-g(x)) = f(x)·g(x)
					// Example: sin(x)·cos(x) has period π, not 2π
					const samePeriod = Math.abs(leftResult.periodNumeric - rightResult.periodNumeric) < 1e-10;
					const bothAntisymmetric =
						leftResult.hasHalfPeriodAntisymmetry && rightResult.hasHalfPeriodAntisymmetry;

					if (samePeriod && bothAntisymmetric) {
						const minimalPeriodNumeric = combinedNumeric / 2;
						const symbolicPeriod = halveSymbolicPeriod(leftResult.period, leftResult.periodNumeric);
						steps.add(
							'product_antisymmetry',
							`f(${variable}) \\cdot g(${variable}) : les deux sont antisymétriques en T/2, donc (f \\cdot g)(${variable} + T/2) = (-f)(−g) = fg. Période ${formatPeriod(leftResult.period)} → ${formatPeriod(symbolicPeriod)}`
						);
						return {
							period: symbolicPeriod,
							periodNumeric: minimalPeriodNumeric,
							hasHalfPeriodAntisymmetry: false // (-1)·(-1) = 1, antisymmetry lost
						};
					}

					// Preserve symbolic period
					const symbolicPeriod = combineSymbolicPeriods(
						leftResult.period,
						leftResult.periodNumeric,
						rightResult.period,
						rightResult.periodNumeric
					);

					steps.add(
						'sum_lcm',
						`Produit de fonctions périodiques : PPCM = ${formatPeriod(symbolicPeriod)}`,
						'detailed'
					);

					return {
						period: symbolicPeriod,
						periodNumeric: combinedNumeric,
						hasHalfPeriodAntisymmetry: false
					};
				}
				return null;
			}

			return null;
		}

		case 'division': {
			// f(x) / c has same period as f(x)
			const numVars = getVariables(node.numerator);
			const denVars = getVariables(node.denominator);

			if (numVars.has(variable) && !denVars.has(variable)) {
				// f(x) / c: antisymmetry preserved
				const result = detectPeriodForNode(node.numerator, variable, steps);
				if (result) {
					steps.add('constant_factor', `f(${variable}) / c : période inchangée`, 'detailed');
				}
				return result;
			}

			// c / f(x): antisymmetry preserved
			// 1/f(x + T/2) = 1/(-f(x)) = -1/f(x) when f is antisymmetric
			if (!numVars.has(variable) && denVars.has(variable)) {
				const result = detectPeriodForNode(node.denominator, variable, steps);
				if (result) {
					steps.add('constant_factor', `c / f(${variable}) : période inchangée`, 'detailed');
				}
				return result;
			}

			// f(x) / g(x): similar to multiplication
			if (numVars.has(variable) && denVars.has(variable)) {
				const numResult = detectPeriodForNode(node.numerator, variable, steps);
				const denResult = detectPeriodForNode(node.denominator, variable, steps);

				if (numResult && denResult) {
					const combinedNumeric = combinePeriods(numResult.periodNumeric, denResult.periodNumeric);
					if (combinedNumeric !== null) {
						// If both antisymmetric with same period, period halves
						// f(x+T/2)/g(x+T/2) = (-f(x))/(-g(x)) = f(x)/g(x)
						const samePeriod = Math.abs(numResult.periodNumeric - denResult.periodNumeric) < 1e-10;
						const bothAntisymmetric =
							numResult.hasHalfPeriodAntisymmetry && denResult.hasHalfPeriodAntisymmetry;

						if (samePeriod && bothAntisymmetric) {
							const minimalPeriodNumeric = combinedNumeric / 2;
							const symbolicPeriod = halveSymbolicPeriod(numResult.period, numResult.periodNumeric);
							steps.add(
								'quotient_antisymmetry',
								`f(${variable}) / g(${variable}) : les deux sont antisymétriques, donc (f/g)(${variable} + T/2) = (-f)/(-g) = f/g. Période → ${formatPeriod(symbolicPeriod)}`
							);
							return {
								period: symbolicPeriod,
								periodNumeric: minimalPeriodNumeric,
								hasHalfPeriodAntisymmetry: false
							};
						}

						// Preserve symbolic period
						const symbolicPeriod = combineSymbolicPeriods(
							numResult.period,
							numResult.periodNumeric,
							denResult.period,
							denResult.periodNumeric
						);

						return {
							period: symbolicPeriod,
							periodNumeric: combinedNumeric,
							hasHalfPeriodAntisymmetry: false
						};
					}
				}
			}

			return null;
		}

		case 'superscript': {
			// Two cases:
			// 1. f(x)^n for constant n (base has variable, exponent doesn't)
			// 2. a^{f(x)} for constant a (base doesn't have variable, exponent does)
			const baseVars = getVariables(node.base);
			const expVars = getVariables(node.superscript);

			// Case 1: f(x)^n - base is periodic, exponent is constant
			if (baseVars.has(variable) && !expVars.has(variable)) {
				const baseResult = detectPeriodForNode(node.base, variable, steps);
				if (!baseResult) return null;

				// Check if exponent is a positive integer
				const expValue = evaluateNodeToApproximatedNumber(node.superscript);
				const isPositiveInteger =
					isFinite(expValue) && expValue > 0 && Math.abs(expValue - Math.round(expValue)) < 1e-10;

				if (isPositiveInteger) {
					const n = Math.round(expValue);

					// KEY: If base has half-period antisymmetry and n is even,
					// the period halves: f(x + T/2)^n = (-f(x))^n = f(x)^n when n is even
					// Example: sin²(x) has period π, not 2π
					if (baseResult.hasHalfPeriodAntisymmetry && n % 2 === 0) {
						const minimalPeriodNumeric = baseResult.periodNumeric / 2;
						const newPeriod = halveSymbolicPeriod(baseResult.period, baseResult.periodNumeric);
						steps.add(
							'even_power',
							`f(${variable})^{${n}} : puissance paire, f(${variable} + T/2) = -f(${variable}), donc f^{${n}}(${variable} + T/2) = f^{${n}}(${variable}). Période ${formatPeriod(baseResult.period)} → ${formatPeriod(newPeriod)}`
						);
						return {
							period: newPeriod,
							periodNumeric: minimalPeriodNumeric,
							hasHalfPeriodAntisymmetry: false // antisymmetry lost for even powers
						};
					}

					// Odd power: antisymmetry preserved
					// f(x + T/2)^n = (-f(x))^n = -f(x)^n when n is odd
					if (n % 2 === 1) {
						steps.add(
							'odd_power',
							`f(${variable})^{${n}} : puissance impaire, antisymétrie préservée`,
							'detailed'
						);
					}
					return {
						...baseResult,
						hasHalfPeriodAntisymmetry: baseResult.hasHalfPeriodAntisymmetry && n % 2 === 1
					};
				}

				// Non-integer exponent: period preserved, antisymmetry lost
				return {
					...baseResult,
					hasHalfPeriodAntisymmetry: false
				};
			}

			// Case 2: a^{f(x)} - base is constant, exponent is periodic
			// Example: e^{sin(x)}, 2^{cos(x)}
			// If f(x) has period T, then a^{f(x)} also has period T
			if (!baseVars.has(variable) && expVars.has(variable)) {
				const expResult = detectPeriodForNode(node.superscript, variable, steps);
				if (expResult) {
					// a^{f(x)} inherits period from f(x), but loses antisymmetry
					// a^{f(x + T/2)} = a^{-f(x)} ≠ -a^{f(x)} in general
					steps.add(
						'exponential',
						`a^{f(${variable})} : hérite la période ${formatPeriod(expResult.period)} de l'exposant`
					);
					return {
						...expResult,
						hasHalfPeriodAntisymmetry: false
					};
				}
			}

			return null;
		}

		case 'opposite':
		case 'positive':
			// -f(x) and +f(x) preserve both period and antisymmetry
			return detectPeriodForNode(node.operand, variable, steps);

		case 'delimiter':
			// (f(x)) preserves everything
			return detectPeriodForNode(node.content, variable, steps);

		default:
			return null;
	}
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Options for periodicity detection.
 */
export interface PeriodicityOptions {
	/** The variable to check (auto-detected if single variable) */
	variable?: string;
	/** Verbosity level for pedagogical steps (default: 'summarized') */
	verbosity?: Verbosity;
}

/**
 * Detect whether an expression is periodic and compute its period.
 *
 * @param node - The expression to analyze
 * @param options - Detection options (variable, verbosity)
 * @returns PeriodicityResult with period information and pedagogical steps
 *
 * @example
 * detectPeriodicity(parseLatex('\\sin(x)'))
 * // → { isPeriodic: true, period: 2π, periodNumeric: 6.283..., steps: [...] }
 *
 * detectPeriodicity(parseLatex('\\sin(2x)'))
 * // → { isPeriodic: true, period: π, periodNumeric: 3.141..., steps: [...] }
 *
 * detectPeriodicity(parseLatex('\\tan(x)'))
 * // → { isPeriodic: true, period: π, periodNumeric: 3.141..., steps: [...] }
 *
 * detectPeriodicity(parseLatex('x^2'))
 * // → { isPeriodic: false, period: null, steps: [] }
 */
export function detectPeriodicity(
	node: MathNode,
	options?: PeriodicityOptions | string
): PeriodicityResult {
	// Handle legacy string argument for backwards compatibility
	const opts: PeriodicityOptions =
		typeof options === 'string' ? { variable: options } : (options ?? {});
	const { variable, verbosity = 'summarized' } = opts;

	// Create step accumulator
	const steps = new StepAccumulator();

	// Auto-detect variable (filter out known constants like π)
	const vars = filterVariables(getVariables(node));

	if (vars.size === 0) {
		return {
			isPeriodic: false,
			period: null,
			periodNumeric: null,
			variable: variable ?? 'x',
			confidence: 'proven',
			reason: 'Expression constante',
			steps: []
		};
	}

	const targetVar = variable ?? (vars.size === 1 ? Array.from(vars)[0] : undefined);

	if (!targetVar) {
		return {
			isPeriodic: false,
			period: null,
			periodNumeric: null,
			variable: '',
			confidence: 'heuristic',
			reason: 'Plusieurs variables, aucune spécifiée',
			steps: []
		};
	}

	if (!vars.has(targetVar)) {
		return {
			isPeriodic: false,
			period: null,
			periodNumeric: null,
			variable: targetVar,
			confidence: 'proven',
			reason: `Expression constante en ${targetVar}`,
			steps: []
		};
	}

	const result = detectPeriodForNode(node, targetVar, steps);

	if (result) {
		return {
			isPeriodic: true,
			period: result.period,
			periodNumeric: result.periodNumeric,
			variable: targetVar,
			confidence: 'proven',
			reason: 'Fonction périodique détectée',
			steps: steps.getStepsFiltered(verbosity)
		};
	}

	return {
		isPeriodic: false,
		period: null,
		periodNumeric: null,
		variable: targetVar,
		confidence: 'heuristic',
		reason: 'Aucune structure périodique détectée',
		steps: steps.getStepsFiltered(verbosity)
	};
}

/**
 * Check if an expression is periodic.
 *
 * @param node - The expression to check
 * @param variable - The variable to check (auto-detected if single variable)
 * @returns true if the expression is periodic
 *
 * @example
 * isPeriodic(parseLatex('\\sin(x)'))  // true
 * isPeriodic(parseLatex('x^2'))       // false
 */
export function isPeriodic(node: MathNode, variable?: string): boolean {
	return detectPeriodicity(node, variable).isPeriodic;
}

/**
 * Get the period of an expression, or null if not periodic.
 *
 * @param node - The expression to analyze
 * @param variable - The variable to check (auto-detected if single variable)
 * @returns The period as a MathNode, or null if not periodic
 *
 * @example
 * getPeriod(parseLatex('\\sin(x)'))   // 2π (as MathNode)
 * getPeriod(parseLatex('\\sin(2x)'))  // π (as MathNode)
 * getPeriod(parseLatex('x^2'))        // null
 */
export function getPeriod(node: MathNode, variable?: string): MathNode | null {
	return detectPeriodicity(node, variable).period;
}

/**
 * Get the numeric value of the period, or null if not periodic.
 *
 * @param node - The expression to analyze
 * @param variable - The variable to check (auto-detected if single variable)
 * @returns The period as a number, or null if not periodic
 *
 * @example
 * getPeriodNumeric(parseLatex('\\sin(x)'))  // 6.283185...
 * getPeriodNumeric(parseLatex('\\tan(x)'))  // 3.141592...
 */
export function getPeriodNumeric(node: MathNode, variable?: string): number | null {
	return detectPeriodicity(node, variable).periodNumeric;
}
