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
	IntegrateStepRecorder,
	ResolvedIntegrateOptions
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
import { findProportionalityRatio } from '../patterns';
import type { Rational } from '../../normal/types';
import { reciprocal, isOne as isOneRational } from '../../normal/rational';
import { extractExactRational, rationalToNode } from '../../common/numeric';
import { containsVariable } from '../rules';
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
		// sqrt(x) -> x^(1/2) ; racine n-ième (indice dans `base`) -> x^(1/n)
		if (isFunction(node) && node.name === 'sqrt' && node.args.length === 1) {
			const index = node.base ?? number('2');
			return power(node.args[0], fraction(number('1'), index));
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
		options: ResolvedIntegrateOptions,
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
			match.constantRatio
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
 * @param matchedRatio - Constant factor detected by pattern matching (optional, exact)
 * @returns Integration result
 */
function performUSubstitution(
	integrand: MathNode,
	u: MathNode,
	variable: string,
	options: ResolvedIntegrateOptions,
	recorder: IntegrateStepRecorder,
	depth: number,
	matchedRatio?: Rational
): IntegrateResult {
	// Variable de substitution FRAÎCHE : si l'on intègre déjà en u (intégrale
	// en u issue d'une substitution précédente), poser « u = sin(u) » puis
	// substituer en retour emboîtait sin(sin(…(u))) — résultat faux et arbre
	// qui enfle à chaque niveau (boucle apparente sur ln(sin(2x+1)))
	const uVariable = pickSubstitutionVariable(integrand, variable);
	if (uVariable === null) {
		return {
			variable,
			status: 'unsupported',
			antiderivative: null,
			integrandType: classifyIntegrand(integrand, variable),
			technique: 'u-substitution',
			steps: recorder.getSteps(),
			error: 'Aucune variable de substitution libre'
		};
	}

	// Step 1: Identify the substitution
	recorder.recordStepByRule(
		'identify-substitution',
		integrand,
		integrand,
		'detailed',
		u,
		`On pose ${uVariable} = ${toCustom(u)}`
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
	const technicalNote = `${uVariable} = ${toCustom(u)}, d${uVariable} = ${toCustom(du)} d${variable}`;
	recorder.recordStepByRule('identify-substitution', integrand, u, 'summarized', du, technicalNote);

	// Step 3: Perform the substitution
	// We need to replace the integrand with an expression in u
	// This is complex - we need to detect how du appears in the integrand

	// For now, we'll use a simplified approach:
	// 1. Replace all occurrences of u with a temporary variable 'u'
	// 2. Try to simplify the integrand by factoring out du

	let transformedIntegrand: MathNode;
	let constantFactor: MathNode | null = null;

	try {
		const duHash = hashMathNode(du);
		const integrandHash = hashMathNode(integrand);

		// Simple case: integrand is exactly du → ∫ 1 du
		if (duHash === integrandHash) {
			transformedIntegrand = number('1');
			constantFactor = null;
		} else {
			// More complex case: need to factor out du from integrand
			const result = tryFactorDu(integrand, u, du, variable, uVariable, matchedRatio);
			transformedIntegrand = result.transformedIntegrand;
			if (result.constantNode !== undefined) {
				constantFactor = result.constantNode;
			} else if (result.constantFactor !== null && !isOneRational(result.constantFactor)) {
				constantFactor = rationalToNode(result.constantFactor);
			}
		}
		// La substitution doit faire disparaître la variable : sinon l'intégrale
		// « en u » mélangerait u et x, et sa primitive serait fausse
		if (containsVariable(transformedIntegrand, variable)) {
			throw new Error(`la variable ${variable} subsiste après la substitution`);
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

	// k/f(u) avec k constant (paramètre littéral) : k sort de l'intégrale en u
	if (
		isDivision(transformedIntegrand) &&
		!containsVariable(transformedIntegrand.numerator, uVariable) &&
		!(isNumberGuard(transformedIntegrand.numerator) && transformedIntegrand.numerator.value === '1')
	) {
		const numeratorFactor = transformedIntegrand.numerator;
		constantFactor = constantFactor
			? simplifiedMultiply(constantFactor, numeratorFactor)
			: numeratorFactor;
		transformedIntegrand = divide(number('1'), transformedIntegrand.denominator, 'fraction');
	}

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
		// Une seule passe : u = g(x) ne doit pas être re-substitué dans g
		finalAntiderivative = substitute(
			uResult.antiderivative,
			{ [uVariable]: u },
			{ maxIterations: 1 }
		);
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
		`On remplace ${uVariable} par ${toCustom(u)}`
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

/** Candidats pour la variable de substitution, par ordre de préférence */
const SUBSTITUTION_VARIABLES: readonly string[] = ['u', 'v', 'w', 't', 's', 'z'];

/**
 * Nom de la variable de substitution : `u` sauf si c'est la variable
 * d'intégration ou un paramètre déjà présent dans l'intégrande.
 */
function pickSubstitutionVariable(integrand: MathNode, variable: string): string | null {
	const free = SUBSTITUTION_VARIABLES.find(
		(name) => name !== variable && !containsVariable(integrand, name)
	);
	return free ?? null;
}

/**
 * Result of tryFactorDu function.
 */
interface FactorDuResult {
	transformedIntegrand: MathNode;
	/** k tel que integrand dx = k · f(u) du (exact) ; null = 1 */
	constantFactor: Rational | null;
	/** k non rationnel (1/π, 1/√2, 1/a) : prime sur `constantFactor` */
	constantNode?: MathNode;
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
 * @param matchedRatio - Pre-computed constant factor from pattern matching (exact)
 * @returns Transformed integrand and constant factor
 */
function tryFactorDu(
	integrand: MathNode,
	u: MathNode,
	du: MathNode,
	_variable: string,
	uName: string,
	matchedRatio?: Rational
): FactorDuResult {
	const uVar = variableFactory(uName);
	const uHash = hashMathNode(u);

	// Special case: Division patterns like x/(1+x²) or x/sqrt(1-x²)
	// If numerator is proportional to du, transform denominator
	if (isDivision(integrand)) {
		const denomHash = hashMathNode(integrand.denominator);
		if (denomHash === uHash) {
			// Denominator is exactly u
			// Check if numerator is proportional to du
			const propConst = matchedRatio ?? findProportionalityRatio(integrand.numerator, du);
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
		const propConst = matchedRatio ?? findProportionalityRatio(integrand.numerator, du);
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
				const propConst = matchedRatio ?? findProportionalityRatio(integrand.left, du);
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
				const propConst = matchedRatio ?? findProportionalityRatio(integrand.right, du);
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
		const leftProp = findProportionalityRatio(integrand.left, du);
		if (leftProp !== null) {
			// Transform the right factor by substituting u structurally
			const rightTransformed = structuralSubstitute(integrand.right, u, uVar);
			return {
				transformedIntegrand: rightTransformed,
				constantFactor: leftProp
			};
		}

		const rightProp = findProportionalityRatio(integrand.right, du);
		if (rightProp !== null) {
			// Transform the left factor by substituting u structurally
			const leftTransformed = structuralSubstitute(integrand.left, u, uVar);
			return {
				transformedIntegrand: leftTransformed,
				constantFactor: rightProp
			};
		}
	}

	// Default: structural substitution replacing u expression with u variable.
	// L'intégrande est alors f(u) SEUL : si u' = c est constant, dx = du / c,
	// donc ∫ f(ax+b) dx = F(ax+b) / a (le facteur 1/a était oublié)
	const result = structuralSubstitute(integrand, u, uVar);
	if (matchedRatio !== undefined) {
		return { transformedIntegrand: result, constantFactor: matchedRatio };
	}
	const duConstant = extractExactRational(du);
	if (duConstant === null && !containsVariable(du, _variable)) {
		// du = π, √2, a… : dx = du / u′
		return {
			transformedIntegrand: result,
			constantFactor: null,
			constantNode: divide(number('1'), du, 'fraction')
		};
	}
	return {
		transformedIntegrand: result,
		constantFactor: duConstant !== null && duConstant.n !== 0n ? reciprocal(duConstant) : null
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
			simplify: true,
			normalizeResult: true
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
