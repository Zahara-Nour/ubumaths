/**
 * French Descriptions for Integration Steps
 *
 * Human-readable descriptions in French for each integration step type.
 *
 * @module mathAST/integration/descriptions-fr
 */

import type { MathNode } from '../types';
import { toCustom } from '../custom-generator';

// =============================================================================
// Integration Rule Types
// =============================================================================

/**
 * Rule keys for integration steps.
 */
export type IntegrationRule =
	// Basic rules
	| 'identify-integrand'
	| 'power-rule'
	| 'constant-rule'
	| 'constant-multiple'
	| 'sum-rule'
	| 'linearity-sum'
	| 'exp-rule'
	| 'ln-rule'
	| 'sin-rule'
	| 'cos-rule'
	| 'tan-rule'
	| 'sec-squared-rule'
	| 'csc-squared-rule'
	| 'fundamental-theorem'
	// U-substitution
	| 'identify-substitution'
	| 'apply-substitution'
	| 'substitute-back'
	// Integration by parts
	| 'identify-parts'
	| 'choose-u-dv'
	| 'apply-parts-formula'
	| 'tabular-method'
	| 'cyclic-solve'
	// Partial fractions
	| 'identify-rational'
	| 'factor-denominator'
	| 'decompose-fractions'
	| 'integrate-partial'
	// Trigonometric substitution
	| 'identify-trig-sub'
	| 'apply-trig-sub'
	| 'simplify-trig'
	| 'back-substitute-trig'
	// Numeric
	| 'numeric-fallback'
	| 'simpson-rule'
	// General
	| 'simplify-result'
	| 'add-constant'
	| 'evaluate-bounds';

// =============================================================================
// Rule Descriptions
// =============================================================================

/**
 * French descriptions for each integration rule.
 */
const RULE_DESCRIPTIONS: Record<IntegrationRule, string> = {
	// Basic rules
	'identify-integrand': "On identifie le type d'intégrande",
	'power-rule': 'On applique la règle des puissances: intégrale de x^n = x^(n+1)/(n+1)',
	'constant-rule': "L'intégrale d'une constante c est cx",
	'constant-multiple': "On sort la constante de l'intégrale",
	'sum-rule': "L'intégrale d'une somme est la somme des intégrales",
	'linearity-sum': "On applique la linéarité de l'intégrale pour les sommes",
	'exp-rule': "L'intégrale de e^x est e^x",
	'ln-rule': "L'intégrale de 1/x est ln|x|",
	'sin-rule': "L'intégrale de sin(x) est -cos(x)",
	'cos-rule': "L'intégrale de cos(x) est sin(x)",
	'tan-rule': "L'intégrale de tan(x) est -ln|cos(x)|",
	'sec-squared-rule': "L'intégrale de 1/cos²(x) est tan(x)",
	'csc-squared-rule': "L'intégrale de 1/sin²(x) est -cot(x)",
	'fundamental-theorem': 'On applique le théorème fondamental du calcul intégral',

	// U-substitution
	'identify-substitution': 'On identifie une substitution appropriée',
	'apply-substitution': 'On effectue le changement de variable',
	'substitute-back': 'On remplace u par sa valeur en fonction de x',

	// Integration by parts
	'identify-parts': 'On reconnaît une intégrale du type ∫u dv',
	'choose-u-dv': 'On choisit u et dv selon la règle LIATE',
	'apply-parts-formula': 'On applique la formule: ∫u dv = uv - ∫v du',
	'tabular-method': 'On utilise la méthode tabulaire pour les intégrations par parties répétées',
	'cyclic-solve': "On résout le système cyclique pour trouver l'intégrale",

	// Partial fractions
	'identify-rational': 'On identifie une fraction rationnelle',
	'factor-denominator': 'On factorise le dénominateur',
	'decompose-fractions': 'On décompose en fractions partielles',
	'integrate-partial': 'On intègre chaque fraction partielle',

	// Trigonometric substitution
	'identify-trig-sub': 'On identifie une substitution trigonométrique appropriée',
	'apply-trig-sub': 'On effectue la substitution trigonométrique',
	'simplify-trig': "On simplifie l'expression trigonométrique",
	'back-substitute-trig': 'On revient à la variable originale',

	// Numeric
	'numeric-fallback': "L'intégrale n'a pas de forme élémentaire, on calcule une approximation",
	'simpson-rule': 'On applique la méthode de Simpson pour une approximation numérique',

	// General
	'simplify-result': 'On simplifie le résultat',
	'add-constant': "On ajoute la constante d'intégration C",
	'evaluate-bounds': "On évalue l'intégrale aux bornes: F(b) - F(a)"
};

/**
 * Gets the description for a rule.
 * @param rule - The integration rule key
 * @returns French description of the rule
 */
export function getRuleDescription(rule: IntegrationRule): string {
	return RULE_DESCRIPTIONS[rule];
}

/**
 * Gets a description for an unknown/custom rule.
 * @param rule - Custom rule name
 * @returns Fallback French description
 */
export function describeCustomRule(rule: string): string {
	return `Règle: ${rule}`;
}

// =============================================================================
// Parameterized Descriptions
// =============================================================================

/**
 * Create a description for identifying the integrand type.
 */
export function describeIdentifyIntegrand(type: string): string {
	const typeNames: Record<string, string> = {
		polynomial: 'polynomiale',
		rational: 'rationnelle',
		trigonometric: 'trigonométrique',
		exponential: 'exponentielle',
		logarithmic: 'logarithmique',
		'inverse-trig': 'trigonométrique inverse',
		radical: 'radicale',
		product: 'produit de fonctions',
		composite: 'fonction composée',
		mixed: 'mixte'
	};
	const typeName = typeNames[type] ?? type;
	return `L'intégrande est de nature ${typeName}`;
}

/**
 * Create a description for applying the power rule.
 */
export function describePowerRule(n: MathNode): string {
	return `On applique la règle des puissances avec n = ${toCustom(n)}`;
}

/**
 * Create a description for factoring out a constant.
 */
export function describeConstantMultiple(constant: MathNode): string {
	return `On sort la constante ${toCustom(constant)} de l'intégrale`;
}

/**
 * Create a description for u-substitution.
 */
export function describeUSubstitution(u: MathNode, du: MathNode): string {
	return `On pose u = ${toCustom(u)}, donc du = ${toCustom(du)} dx`;
}

/**
 * Create a description for choosing u and dv in integration by parts.
 */
export function describeChooseUDv(u: MathNode, dv: MathNode): string {
	return `On pose u = ${toCustom(u)} et dv = ${toCustom(dv)} dx`;
}

/**
 * Create a description for computing u and v in integration by parts.
 */
export function describeComputeUV(du: MathNode, v: MathNode): string {
	return `On a du = ${toCustom(du)} dx et v = ${toCustom(v)}`;
}

/**
 * Create a description for applying the parts formula.
 */
export function describeApplyPartsFormula(uv: MathNode, vdu: MathNode): string {
	return `On applique: ${toCustom(uv)} - ∫${toCustom(vdu)}`;
}

/**
 * Create a description for partial fraction decomposition.
 */
export function describePartialFractions(original: MathNode, decomposed: string): string {
	return `On décompose ${toCustom(original)} en ${decomposed}`;
}

/**
 * Create a description for trigonometric substitution.
 */
export function describeTrigSubstitution(x: string, subst: string): string {
	return `On pose ${x} = ${subst}`;
}

/**
 * Create a description for evaluating definite integral bounds.
 */
export function describeEvaluateBounds(
	a: MathNode,
	b: MathNode,
	Fa: MathNode,
	Fb: MathNode
): string {
	return `F(${toCustom(b)}) - F(${toCustom(a)}) = ${toCustom(Fb)} - ${toCustom(Fa)}`;
}

/**
 * Create a description for the final result with constant.
 */
export function describeFinalResult(antiderivative: MathNode): string {
	return `L'intégrale indéfinie est ${toCustom(antiderivative)} + C`;
}

/**
 * Create a description for numeric approximation.
 */
export function describeNumericApproximation(value: number, intervals: number): string {
	return `Approximation numérique (méthode de Simpson, ${intervals} intervalles): ${value}`;
}

// =============================================================================
// Constant Note
// =============================================================================

/**
 * Standard note about the constant of integration.
 */
export const CONSTANT_OF_INTEGRATION_NOTE =
	"N'oubliez pas la constante d'intégration C pour les intégrales indéfinies";

// =============================================================================
// LIATE Rule
// =============================================================================

/**
 * Description of the LIATE rule for integration by parts.
 */
export const LIATE_RULE_DESCRIPTION = `Règle LIATE pour choisir u (dans l'ordre de priorité):
L - Logarithmique (ln x, log x)
I - Inverse trigonométrique (arcsin, arctan, ...)
A - Algébrique (x^n, polynômes)
T - Trigonométrique (sin, cos, tan)
E - Exponentielle (e^x, a^x)`;
