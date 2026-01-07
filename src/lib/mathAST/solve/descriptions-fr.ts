/**
 * French Descriptions for Equation Solving Steps
 *
 * Human-readable descriptions in French for each solving step type.
 *
 * @module mathAST/solve/descriptions-fr
 */

import type { MathNode } from '../types';
import { toLatex } from '../latex-generator';

// =============================================================================
// Solving Step Descriptions
// =============================================================================

/**
 * Rule keys for solving steps.
 */
export type SolvingRule =
	// Linear solving
	| 'identify-linear'
	| 'subtract-constant'
	| 'add-constant'
	| 'divide-coefficient'
	| 'multiply-coefficient'
	| 'isolate-variable'
	// Quadratic solving
	| 'identify-quadratic'
	| 'identify-coefficients'
	| 'compute-discriminant'
	| 'discriminant-positive'
	| 'discriminant-zero'
	| 'discriminant-negative'
	| 'apply-quadratic-formula'
	| 'simplify-solution'
	// Transcendental solving
	| 'apply-logarithm'
	| 'apply-exponential'
	| 'apply-arcsin'
	| 'apply-arccos'
	| 'apply-arctan'
	| 'domain-restriction'
	| 'periodicity-note'
	// Numeric solving
	| 'newton-iteration'
	| 'convergence-achieved'
	| 'convergence-failed'
	// General
	| 'to-standard-form'
	| 'simplify-expression'
	| 'verify-solution'
	| 'no-solution'
	| 'infinite-solutions';

/**
 * French descriptions for each solving rule.
 */
const RULE_DESCRIPTIONS: Record<SolvingRule, string> = {
	// Linear solving
	'identify-linear': "L'equation est lineaire (degre 1)",
	'subtract-constant': 'On soustrait la constante des deux membres',
	'add-constant': 'On ajoute la constante aux deux membres',
	'divide-coefficient': 'On divise les deux membres par le coefficient',
	'multiply-coefficient': 'On multiplie les deux membres par le coefficient',
	'isolate-variable': "On isole l'inconnue",

	// Quadratic solving
	'identify-quadratic': "L'equation est quadratique (degre 2)",
	'identify-coefficients': 'On identifie les coefficients a, b et c',
	'compute-discriminant': 'On calcule le discriminant: Delta = b^2 - 4ac',
	'discriminant-positive': "Delta > 0, l'equation a deux solutions distinctes",
	'discriminant-zero': "Delta = 0, l'equation a une solution double",
	'discriminant-negative': "Delta < 0, l'equation n'a pas de solution reelle",
	'apply-quadratic-formula': 'On applique la formule: x = (-b +/- sqrt(Delta)) / (2a)',
	'simplify-solution': 'On simplifie la solution',

	// Transcendental solving
	'apply-logarithm': 'On applique le logarithme neperien aux deux membres',
	'apply-exponential': "On applique l'exponentielle aux deux membres",
	'apply-arcsin': 'On applique la fonction arcsinus',
	'apply-arccos': 'On applique la fonction arccosinus',
	'apply-arctan': 'On applique la fonction arctangente',
	'domain-restriction': 'Restriction de domaine',
	'periodicity-note':
		'Note: les solutions trigonometriques sont periodiques (+ 2k*pi pour k entier)',

	// Numeric solving
	'newton-iteration': 'Iteration de Newton-Raphson',
	'convergence-achieved': 'Convergence atteinte',
	'convergence-failed': "La methode numerique n'a pas converge",

	// General
	'to-standard-form': "On met l'equation sous forme standard (... = 0)",
	'simplify-expression': "On simplifie l'expression",
	'verify-solution': 'On verifie la solution par substitution',
	'no-solution': "L'equation n'a pas de solution",
	'infinite-solutions': "L'equation a une infinite de solutions (identite)"
};

/**
 * Gets the description for a rule.
 */
export function getRuleDescription(rule: SolvingRule | string): string {
	return RULE_DESCRIPTIONS[rule as SolvingRule] ?? `Regle: ${rule}`;
}

// =============================================================================
// Parameterized Descriptions
// =============================================================================

/**
 * Create a description for subtracting a value from both sides.
 */
export function describeSubtract(value: MathNode): string {
	return `On soustrait ${toLatex(value)} aux deux membres`;
}

/**
 * Create a description for adding a value to both sides.
 */
export function describeAdd(value: MathNode): string {
	return `On ajoute ${toLatex(value)} aux deux membres`;
}

/**
 * Create a description for dividing both sides by a value.
 */
export function describeDivide(value: MathNode): string {
	return `On divise les deux membres par ${toLatex(value)}`;
}

/**
 * Create a description for multiplying both sides by a value.
 */
export function describeMultiply(value: MathNode): string {
	return `On multiplie les deux membres par ${toLatex(value)}`;
}

/**
 * Create a description for identifying coefficients.
 */
export function describeCoefficients(a: MathNode, b: MathNode, c?: MathNode): string {
	if (c !== undefined) {
		return `On identifie les coefficients: a = ${toLatex(a)}, b = ${toLatex(b)}, c = ${toLatex(c)}`;
	}
	return `On identifie les coefficients: a = ${toLatex(a)}, b = ${toLatex(b)}`;
}

/**
 * Create a description for discriminant computation.
 */
export function describeDiscriminant(value: MathNode): string {
	return `Le discriminant vaut Delta = ${toLatex(value)}`;
}

/**
 * Create a description for a solution.
 */
export function describeSolution(variable: string, value: MathNode, index?: number): string {
	if (index !== undefined) {
		return `Solution ${index}: ${variable} = ${toLatex(value)}`;
	}
	return `Solution: ${variable} = ${toLatex(value)}`;
}

/**
 * Create a description for Newton iteration.
 */
export function describeNewtonIteration(
	iteration: number,
	value: number,
	precision: number
): string {
	return `Iteration ${iteration}: x = ${value.toPrecision(precision)}`;
}

/**
 * Create a description for convergence.
 */
export function describeConvergence(value: number, precision: number, tolerance: number): string {
	return `Convergence atteinte: x = ${value.toPrecision(precision)} (erreur < ${tolerance.toExponential(1)})`;
}

/**
 * Create a description for verification.
 */
export function describeVerification(
	variable: string,
	value: MathNode,
	leftResult: string,
	rightResult: string,
	success: boolean
): string {
	const symbol = success ? '=' : '!=';
	return `Verification: en substituant ${variable} = ${toLatex(value)}, on obtient ${leftResult} ${symbol} ${rightResult}`;
}

// =============================================================================
// Domain Descriptions
// =============================================================================

/**
 * Domain restriction messages.
 */
export const DOMAIN_MESSAGES = {
	divisionByZero: (expr: string) => `Restriction: ${expr} != 0 (division par zero interdite)`,
	squareRoot: (expr: string) => `Restriction: ${expr} >= 0 (argument de la racine carree)`,
	logarithm: (expr: string) => `Restriction: ${expr} > 0 (argument du logarithme)`,
	arcsine: () => 'Restriction: -1 <= argument <= 1 (domaine de arcsinus)',
	arccosine: () => 'Restriction: -1 <= argument <= 1 (domaine de arccosinus)'
};

// =============================================================================
// Periodicity Notes
// =============================================================================

/**
 * Periodicity notes for trigonometric solutions.
 */
export const PERIODICITY_NOTES = {
	sine: 'x = valeur + 2k*pi ou x = pi - valeur + 2k*pi (k entier)',
	cosine: 'x = valeur + 2k*pi ou x = -valeur + 2k*pi (k entier)',
	tangent: 'x = valeur + k*pi (k entier)'
};
