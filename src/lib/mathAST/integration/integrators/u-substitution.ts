/**
 * U-Substitution Integrator
 *
 * Handles integration by u-substitution (chain rule in reverse).
 *
 * @module mathAST/integration/integrators/u-substitution
 */

import type { MathNode } from '../../types';
import type {
	Integrator,
	IntegrateResult,
	IntegrateOptions,
	IntegrateStepRecorder
} from '../types';
import { matchUSubstitution } from '../patterns';
import { differentiate } from '../../differentiation';
import { substitute } from '../../eval/substitute';
import { classifyIntegrand } from '../classify';
import { CONSTANT_OF_INTEGRATION_NOTE } from '../descriptions-fr';
import { createStepRecorder } from '../step-recorder';
import { selectIntegrator } from './select';
import { variable as variableFactory, number, divide, power, fraction } from '../../factory';
import { simplifiedMultiply } from '../../differentiation/rules';
import { toCustom } from '../../custom-generator';
import { hashMathNode } from '../../normal/hash';
import {
	isDivision,
	isMultiplication,
	isNumber as isNumberGuard,
	isFunction,
	isSuperscript
} from '../../guards';
import { findProportionalityConstant } from '../patterns';
import { isEulerConstant } from '../../guards';
import { mapNode } from '../../transforms';

// =============================================================================
// Structural Substitution Helper
// =============================================================================

/**
 * Replace all occurrences of a subexpression with another expression.
 * Uses hash comparison for structural matching.
 *
 * @param expr - The expression to transform
 * @param target - The subexpression to replace
 * @param replacement - The replacement expression
 * @returns New expression with all occurrences replaced
 */
function structuralSubstitute(expr: MathNode, target: MathNode, replacement: MathNode): MathNode {
	const targetHash = hashMathNode(target);

	return mapNode(expr, (node) => {
		if (hashMathNode(node) === targetHash) {
			return replacement;
		}
		return node;
	});
}

// =============================================================================
// Expression Normalization for Integration
// =============================================================================

/**
 * Normalize expressions for basic integrator compatibility:
 * - Convert sqrt(expr) to expr^(1/2)
 * - Convert 1/x^n to x^(-n)
 * - Convert 1/sqrt(x) to x^(-1/2)
 * The basic integrator handles x^n but not division forms.
 */
function normalizeForIntegration(expr: MathNode): MathNode {
	return mapNode(expr, (node) => {
		// sqrt(x) -> x^(1/2)
		if (isFunction(node) && node.name === 'sqrt' && node.args.length === 1) {
			return power(node.args[0], fraction(number('1'), number('2')));
		}

		// 1/x^n -> x^(-n)
		if (
			isDivision(node) &&
			isNumberGuard(node.numerator) &&
			node.numerator.value === '1' &&
			isSuperscript(node.denominator)
		) {
			const base = node.denominator.base;
			const exp = node.denominator.superscript;
			// Negate the exponent: x^n -> x^(-n)
			return power(base, { type: 'opposite', operand: exp } as MathNode);
		}

		return node;
	});
}

// =============================================================================
// Pattern Detection Helpers
// =============================================================================

/**
 * Check if expression is e^(ax)·trig(bx) pattern.
 * These should be handled by integration by parts (cyclic case), not u-substitution.
 */
function isExpTrigProduct(expr: MathNode): boolean {
	if (!isMultiplication(expr)) {
		return false;
	}

	const left = expr.left;
	const right = expr.right;

	// Check for exp * trig or trig * exp patterns
	const isExpPart = (node: MathNode): boolean =>
		(isFunction(node) && node.name === 'exp') ||
		(isSuperscript(node) && isEulerConstant(node.base));

	const isTrigPart = (node: MathNode): boolean =>
		isFunction(node) && (node.name === 'sin' || node.name === 'cos');

	return (isExpPart(left) && isTrigPart(right)) || (isTrigPart(left) && isExpPart(right));
}

// =============================================================================
// U-Substitution Integrator
// =============================================================================

/**
 * U-Substitution integrator for chain rule patterns.
 *
 * Handles integration by substitution: ∫ f(g(x)) * g'(x) dx = ∫ f(u) du
 *
 * Examples:
 * - ∫ 2x*cos(x²) dx → u = x², du = 2x dx → ∫ cos(u) du = sin(u) = sin(x²)
 * - ∫ e^(3x) dx → u = 3x, du = 3 dx → (1/3) ∫ e^u du = (1/3)e^(3x)
 * - ∫ x/(1+x²) dx → u = 1+x², du = 2x dx → (1/2) ∫ 1/u du = (1/2)ln|u|
 *
 * Priority: 10 (tries after basic rules, before integration by parts)
 */
export const uSubstitutionIntegrator: Integrator = {
	name: 'u-substitution',
	priority: 10,

	canIntegrate(expr: MathNode, variable: string): boolean {
		// Reject e^(ax)·trig(bx) patterns - these should go to parts (cyclic case)
		if (isExpTrigProduct(expr)) {
			return false;
		}

		// Check if u-substitution pattern is detected
		const match = matchUSubstitution(expr, variable);
		return match !== null;
	},

	integrate(
		expr: MathNode,
		variable: string,
		options: Required<Omit<IntegrateOptions, 'variable'>>,
		recorder: IntegrateStepRecorder,
		depth: number
	): IntegrateResult {
		// Find u-substitution match
		const match = matchUSubstitution(expr, variable);

		if (!match) {
			return {
				variable,
				status: 'unsupported',
				antiderivative: null,
				integrandType: classifyIntegrand(expr, variable),
				technique: 'u-substitution',
				steps: recorder.getSteps(),
				error: 'Aucune substitution valide trouvée'
			};
		}

		// Try u-substitution with this match
		return performUSubstitution(
			expr,
			match.u,
			variable,
			options,
			recorder,
			depth,
			match.constantFactor
		);
	}
};

// =============================================================================
// U-Substitution Implementation
// =============================================================================

/**
 * Perform u-substitution with a specific u.
 *
 * Steps:
 * 1. Let u = g(x)
 * 2. Compute du = g'(x) dx
 * 3. Substitute to get integrand in terms of u
 * 4. Integrate with respect to u
 * 5. Back-substitute u = g(x)
 *
 * @param integrand - The original integrand
 * @param u - The u substitution expression
 * @param variable - The original variable (x)
 * @param options - Integration options
 * @param recorder - Step recorder
 * @param depth - Current recursion depth
 * @param matchedConstantFactor - Constant factor detected by pattern matching (optional)
 * @returns Integration result
 */
function performUSubstitution(
	integrand: MathNode,
	u: MathNode,
	variable: string,
	options: Required<Omit<IntegrateOptions, 'variable'>>,
	recorder: IntegrateStepRecorder,
	depth: number,
	matchedConstantFactor?: number
): IntegrateResult {
	// Step 1: Identify the substitution
	recorder.recordStepByRule(
		'identify-substitution',
		integrand,
		integrand,
		'detailed',
		u,
		`On pose u = ${toCustom(u)}`
	);

	// Step 2: Compute du/dx
	let du: MathNode;
	try {
		du = differentiate(u, { variable });
	} catch (error) {
		return {
			variable,
			status: 'unsupported',
			antiderivative: null,
			integrandType: classifyIntegrand(integrand, variable),
			technique: 'u-substitution',
			steps: recorder.getSteps(),
			error: `Impossible de différentier u: ${error instanceof Error ? error.message : String(error)}`
		};
	}

	// Technical note about u and du
	const technicalNote = `u = ${toCustom(u)}, du = ${toCustom(du)} d${variable}`;
	recorder.recordStepByRule('identify-substitution', integrand, u, 'summarized', du, technicalNote);

	// Step 3: Perform the substitution
	// We need to replace the integrand with an expression in u
	// This is complex - we need to detect how du appears in the integrand

	// For now, we'll use a simplified approach:
	// 1. Replace all occurrences of u with a temporary variable 'u'
	// 2. Try to simplify the integrand by factoring out du

	const uVar = variableFactory('u');
	let transformedIntegrand: MathNode;
	let constantFactor: MathNode | null = null;

	try {
		const duHash = hashMathNode(du);
		const integrandHash = hashMathNode(integrand);

		// Simple case: integrand is exactly du
		if (duHash === integrandHash) {
			transformedIntegrand = uVar;
			constantFactor = null;
		} else {
			// More complex case: need to factor out du from integrand
			const result = tryFactorDu(integrand, u, du, variable, matchedConstantFactor);
			transformedIntegrand = result.transformedIntegrand;
			if (result.constantFactor !== null) {
				constantFactor = number(result.constantFactor.toString());
			}
		}
	} catch (error) {
		return {
			variable,
			status: 'unsupported',
			antiderivative: null,
			integrandType: classifyIntegrand(integrand, variable),
			technique: 'u-substitution',
			steps: recorder.getSteps(),
			error: `Impossible d'effectuer la substitution: ${error instanceof Error ? error.message : String(error)}`
		};
	}

	recorder.recordStepByRule(
		'apply-substitution',
		integrand,
		transformedIntegrand,
		'detailed',
		undefined,
		constantFactor ? `Facteur constant: ${toCustom(constantFactor)}` : undefined
	);

	// Step 4: Integrate with respect to u
	const uRecorder = createStepRecorder();
	const uVariable = 'u';

	// Normalize for integration: sqrt(u) -> u^(1/2), 1/u^n -> u^(-n)
	const normalizedIntegrand = normalizeForIntegration(transformedIntegrand);

	// Use the general integration function recursively
	// We need to import or call the integrator selection
	const uIntegrator = selectIntegrator(normalizedIntegrand, uVariable);

	if (!uIntegrator) {
		return {
			variable,
			status: 'unsupported',
			antiderivative: null,
			integrandType: classifyIntegrand(integrand, variable),
			technique: 'u-substitution',
			steps: recorder.getSteps(),
			error: "Impossible d'intégrer l'expression transformée en u"
		};
	}

	const uResult = uIntegrator.integrate(
		normalizedIntegrand,
		uVariable,
		options,
		uRecorder,
		depth + 1
	);

	if (uResult.status === 'unsupported' || !uResult.antiderivative) {
		return {
			variable,
			status: 'unsupported',
			antiderivative: null,
			integrandType: classifyIntegrand(integrand, variable),
			technique: 'u-substitution',
			steps: recorder.getSteps(),
			error: "L'intégration en u a échoué"
		};
	}

	// Merge u-integration steps
	uRecorder.getSteps().forEach((step) => {
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

	// Step 5: Back-substitute u = g(x)
	let finalAntiderivative: MathNode;
	try {
		finalAntiderivative = substitute(uResult.antiderivative, { u });
	} catch (error) {
		return {
			variable,
			status: 'unsupported',
			antiderivative: null,
			integrandType: classifyIntegrand(integrand, variable),
			technique: 'u-substitution',
			steps: recorder.getSteps(),
			error: `Impossible de substituer u: ${error instanceof Error ? error.message : String(error)}`
		};
	}

	// Apply constant factor if needed
	if (constantFactor) {
		finalAntiderivative = simplifiedMultiply(constantFactor, finalAntiderivative);
	}

	recorder.recordStepByRule(
		'substitute-back',
		uResult.antiderivative,
		finalAntiderivative,
		'summarized',
		u,
		`On remplace u par ${toCustom(u)}`
	);

	return {
		variable,
		status: 'exact',
		antiderivative: finalAntiderivative,
		integrandType: classifyIntegrand(integrand, variable),
		technique: 'u-substitution',
		steps: recorder.getSteps(),
		constantNote: CONSTANT_OF_INTEGRATION_NOTE
	};
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Result of tryFactorDu function.
 */
interface FactorDuResult {
	transformedIntegrand: MathNode;
	constantFactor: number | null;
}

/**
 * Try to factor du out of the integrand and express it in terms of u.
 *
 * Handles patterns:
 * - Division: f(x)/g(x) where g(x) = u and f(x) = c * du → c/u
 * - Multiplication: f(x) * g(x) where part is du
 *
 * @param integrand - Original integrand
 * @param u - The u expression
 * @param du - The du/dx expression
 * @param _variable - Original variable
 * @param matchedConstantFactor - Pre-computed constant factor from pattern matching
 * @returns Transformed integrand and constant factor
 */
function tryFactorDu(
	integrand: MathNode,
	u: MathNode,
	du: MathNode,
	_variable: string,
	matchedConstantFactor?: number
): FactorDuResult {
	const uVar = variableFactory('u');
	const uHash = hashMathNode(u);

	// Special case: Division patterns like x/(1+x²) or x/sqrt(1-x²)
	// If numerator is proportional to du, transform denominator
	if (isDivision(integrand)) {
		const denomHash = hashMathNode(integrand.denominator);
		if (denomHash === uHash) {
			// Denominator is exactly u
			// Check if numerator is proportional to du
			const propConst =
				matchedConstantFactor ?? findProportionalityConstant(integrand.numerator, du);
			if (propConst !== null) {
				// Transform to 1/u with constant factor
				return {
					transformedIntegrand: divide(number('1'), uVar, 'fraction'),
					constantFactor: propConst
				};
			}
		}

		// Check if numerator is proportional to du and denominator contains u
		// Example: x/sqrt(1-x²) with u = 1-x², du = -2x → -0.5 * 1/sqrt(u)
		const propConst = matchedConstantFactor ?? findProportionalityConstant(integrand.numerator, du);
		if (propConst !== null) {
			// Transform denominator by substituting u, result is 1/transformedDenom
			const denomTransformed = structuralSubstitute(integrand.denominator, u, uVar);
			return {
				transformedIntegrand: divide(number('1'), denomTransformed, 'fraction'),
				constantFactor: propConst
			};
		}
	}

	// Special case: Multiplication patterns like x * (1/(1+x²))
	// This is equivalent to x/(1+x²), so transform to 1/u with constant factor
	if (isMultiplication(integrand)) {
		// Check if right is 1/u and left is proportional to du
		if (
			isDivision(integrand.right) &&
			isNumberGuard(integrand.right.numerator) &&
			integrand.right.numerator.value === '1'
		) {
			const denomHash = hashMathNode(integrand.right.denominator);
			if (denomHash === uHash) {
				const propConst = matchedConstantFactor ?? findProportionalityConstant(integrand.left, du);
				if (propConst !== null) {
					return {
						transformedIntegrand: divide(number('1'), uVar, 'fraction'),
						constantFactor: propConst
					};
				}
			}
		}

		// Check if left is 1/u and right is proportional to du
		if (
			isDivision(integrand.left) &&
			isNumberGuard(integrand.left.numerator) &&
			integrand.left.numerator.value === '1'
		) {
			const denomHash = hashMathNode(integrand.left.denominator);
			if (denomHash === uHash) {
				const propConst = matchedConstantFactor ?? findProportionalityConstant(integrand.right, du);
				if (propConst !== null) {
					return {
						transformedIntegrand: divide(number('1'), uVar, 'fraction'),
						constantFactor: propConst
					};
				}
			}
		}

		// Check if one factor is proportional to du and other is f(u)
		// Example: x * e^(x²) with u = x², du = 2x
		// Left = x is proportional to du with factor 1/2
		// Right = e^(x²) transforms to e^u
		const leftProp = findProportionalityConstant(integrand.left, du);
		if (leftProp !== null) {
			// Transform the right factor by substituting u structurally
			const rightTransformed = structuralSubstitute(integrand.right, u, uVar);
			return {
				transformedIntegrand: rightTransformed,
				constantFactor: leftProp
			};
		}

		const rightProp = findProportionalityConstant(integrand.right, du);
		if (rightProp !== null) {
			// Transform the left factor by substituting u structurally
			const leftTransformed = structuralSubstitute(integrand.left, u, uVar);
			return {
				transformedIntegrand: leftTransformed,
				constantFactor: rightProp
			};
		}
	}

	// Default: structural substitution replacing u expression with u variable
	const result = structuralSubstitute(integrand, u, uVar);
	return {
		transformedIntegrand: result,
		constantFactor: matchedConstantFactor ?? null
	};
}

/**
 * Try u-substitution with a specific u candidate.
 *
 * This function is exported for testing purposes.
 *
 * @param expr - The expression to integrate
 * @param u - The u candidate
 * @param variable - The variable of integration
 * @returns Integration result or null if substitution doesn't work
 */
export function tryUSubstitution(
	expr: MathNode,
	u: MathNode,
	variable: string
): IntegrateResult | null {
	// Create a step recorder
	const recorder = createStepRecorder();

	// Try the substitution
	const result = performUSubstitution(
		expr,
		u,
		variable,
		{
			verbosity: 'summarized',
			maxDepth: 10,
			allowNumeric: true,
			simpsonIntervals: 100,
			simplify: true
		},
		recorder,
		0
	);

	// Return result if successful
	if (result.status === 'exact') {
		return result;
	}

	return null;
}
