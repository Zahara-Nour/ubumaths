/**
 * French Descriptions for Equation Solving Steps
 *
 * Human-readable descriptions in French for each solving step type.
 *
 * @module mathAST/solve/descriptions-fr
 */

import type { MathNode } from '../types';
import { toCustom } from '../custom-generator';

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
	| 'quadratic-formula'
	| 'double-solution'
	| 'no-real-solution'
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
	// Polynomial (power equations)
	| 'identify-power-equation'
	| 'extract-nth-root'
	| 'extract-nth-root-both-signs'
	| 'even-negative-no-solution'
	// Cubic (Cardano)
	| 'identify-cubic'
	| 'compute-depressed-cubic'
	| 'compute-cubic-discriminant'
	| 'discriminant-one-real'
	| 'discriminant-triple-root'
	| 'discriminant-three-real'
	| 'apply-cardano-formula'
	| 'apply-trigonometric-form'
	| 'factor-common-root'
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
	'quadratic-formula': 'On applique la formule quadratique',
	'double-solution': 'Le discriminant est nul, il y a une solution double',
	'no-real-solution': "Le discriminant est negatif, il n'y a pas de solution reelle",
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

	// Polynomial (power equations)
	'identify-power-equation': "L'equation est de la forme x^n = k",
	'extract-nth-root': 'On extrait la racine n-ieme des deux membres',
	'extract-nth-root-both-signs':
		'On extrait la racine n-ieme des deux membres (deux solutions: + et -)',
	'even-negative-no-solution':
		"Un exposant pair avec une constante negative n'a pas de solution reelle",

	// Cubic (Cardano)
	'identify-cubic': "L'equation est cubique (degre 3)",
	'compute-depressed-cubic':
		'On effectue la substitution pour obtenir la forme deprimee t³ + pt + q = 0',
	'compute-cubic-discriminant': 'On calcule le discriminant cubique',
	'discriminant-one-real': 'Le discriminant indique une seule racine reelle',
	'discriminant-triple-root': 'Le discriminant est nul: racine(s) multiple(s)',
	'discriminant-three-real': 'Le discriminant indique trois racines reelles distinctes',
	'apply-cardano-formula': 'On applique la formule de Cardano',
	'apply-trigonometric-form': 'On utilise la forme trigonometrique',
	'factor-common-root': 'On factorise par la racine commune',

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
	return `On soustrait ${toCustom(value)} aux deux membres`;
}

/**
 * Create a description for adding a value to both sides.
 */
export function describeAdd(value: MathNode): string {
	return `On ajoute ${toCustom(value)} aux deux membres`;
}

/**
 * Create a description for dividing both sides by a value.
 */
export function describeDivide(value: MathNode): string {
	return `On divise les deux membres par ${toCustom(value)}`;
}

/**
 * Create a description for multiplying both sides by a value.
 */
export function describeMultiply(value: MathNode): string {
	return `On multiplie les deux membres par ${toCustom(value)}`;
}

/**
 * Create a description for identifying coefficients.
 */
export function describeCoefficients(a: MathNode, b: MathNode, c?: MathNode): string {
	if (c !== undefined) {
		return `On identifie les coefficients: a = ${toCustom(a)}, b = ${toCustom(b)}, c = ${toCustom(c)}`;
	}
	return `On identifie les coefficients: a = ${toCustom(a)}, b = ${toCustom(b)}`;
}

/**
 * Create a description for discriminant computation.
 */
export function describeDiscriminant(value: MathNode, numericValue?: number | null): string {
	const valueStr = toCustom(value);
	if (numericValue !== null && numericValue !== undefined) {
		if (numericValue > 0) {
			return `Le discriminant vaut Delta = ${valueStr} > 0, donc il y a deux solutions reelles distinctes`;
		} else if (numericValue === 0) {
			return `Le discriminant vaut Delta = ${valueStr} = 0, donc il y a une solution double`;
		} else {
			return `Le discriminant vaut Delta = ${valueStr} < 0, donc il n'y a pas de solution reelle`;
		}
	}
	return `Le discriminant vaut Delta = ${valueStr}`;
}

/**
 * Create a description for a solution.
 */
export function describeSolution(variable: string, value: MathNode, index?: number): string {
	if (index !== undefined) {
		return `Solution ${index}: ${variable} = ${toCustom(value)}`;
	}
	return `Solution: ${variable} = ${toCustom(value)}`;
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
	return `Verification: en substituant ${variable} = ${toCustom(value)}, on obtient ${leftResult} ${symbol} ${rightResult}`;
}

// =============================================================================
// Polynomial (Power) Descriptions
// =============================================================================

/**
 * Create a description for identifying a power equation x^n = k.
 */
export function describeIdentifyPowerEquation(variable: string, n: number, k: MathNode): string {
	return `L'equation est de la forme ${variable}^${n} = ${toCustom(k)}`;
}

/**
 * Create a description for extracting an nth root (odd exponent).
 */
export function describeExtractNthRoot(n: number): string {
	if (n === 3) {
		return 'On prend la racine cubique des deux membres';
	}
	return `On prend la racine ${n}-ieme des deux membres`;
}

/**
 * Create a description for extracting an nth root (even exponent, two solutions).
 */
export function describeExtractNthRootBothSigns(n: number): string {
	if (n === 2) {
		return 'On prend la racine carree des deux membres (deux solutions: + et -)';
	}
	if (n === 4) {
		return 'On prend la racine quatrieme des deux membres (deux solutions: + et -)';
	}
	return `On prend la racine ${n}-ieme des deux membres (deux solutions car ${n} est pair)`;
}

/**
 * Create a description for no real solution (even exponent, negative constant).
 */
export function describeNoRealSolutionEvenNegative(n: number): string {
	const rootName = n === 2 ? 'carree' : n === 4 ? 'quatrieme' : `${n}-ieme`;
	return `Il n'y a pas de solution reelle: on ne peut pas extraire une racine ${rootName} d'un nombre negatif`;
}

// =============================================================================
// Cubic (Cardano) Descriptions
// =============================================================================

/**
 * Create a description for identifying a cubic equation.
 */
export function describeIdentifyCubic(a: MathNode, b: MathNode, c: MathNode, d: MathNode): string {
	return `L'equation est cubique: ${toCustom(a)}x³ + ${toCustom(b)}x² + ${toCustom(c)}x + ${toCustom(d)} = 0`;
}

/**
 * Create a description for the depressed cubic form.
 */
export function describeDepressedCubic(p: MathNode, q: MathNode): string {
	return `Forme deprimee: t³ + (${toCustom(p)})t + (${toCustom(q)}) = 0`;
}

/**
 * Create a description for cubic discriminant.
 */
export function describeCubicDiscriminant(delta: MathNode, numericValue?: number | null): string {
	const deltaStr = toCustom(delta);
	if (numericValue !== null && numericValue !== undefined) {
		if (numericValue < 0) {
			return `Discriminant Δ = ${deltaStr} < 0: une seule racine reelle (deux complexes conjuguees)`;
		} else if (numericValue === 0) {
			return `Discriminant Δ = ${deltaStr} = 0: racines multiples`;
		} else {
			return `Discriminant Δ = ${deltaStr} > 0: trois racines reelles distinctes`;
		}
	}
	return `Discriminant Δ = ${deltaStr}`;
}

/**
 * Create a description for factoring out a common root (x = 0).
 */
export function describeFactorCommonRoot(variable: string): string {
	return `On factorise par ${variable} (racine evidente: ${variable} = 0)`;
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
