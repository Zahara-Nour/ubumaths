/**
 * Convention d'écriture des primitives en ln : ln|u| devient ln(u) quand u est
 * STRICTEMENT POSITIF sur ℝ, de façon prouvable sans hypothèse sur les
 * paramètres (décision de 2026-10-07, écriture de classe : ln(x² + 1)).
 *
 * Prouvé positif : nombre non nul, e^{…}, exp(…), carré + positif, produit ou
 * quotient de positifs, trinôme en x de coefficient dominant > 0 et de
 * discriminant < 0 (coefficients rationnels). Un paramètre littéral (x² + c)
 * n'est jamais supposé positif : la valeur absolue reste.
 *
 * @module mathAST/integration/positive-abs
 */

import type { MathNode } from '../types';
import { isNumber, isEulerConstant, isPiConstant, isFunction } from '../guards';
import { mapNode } from '../transforms';
import { extractExactRational } from '../common/numeric';
import { extractQuadraticCoefficients } from '../solve/solvers/quadratic';
import { getVariables } from '../eval/substitute';

// =============================================================================
// Positivité
// =============================================================================

/** Trinôme en `variable` seule, a > 0 et Δ < 0 */
function isPositiveTrinomial(node: MathNode, variable: string): boolean {
	const names = getVariables(node);
	if (names.size !== 1 || !names.has(variable)) return false;
	const coefficients = extractQuadraticCoefficients(node, variable);
	if (coefficients === null) return false;
	const a = extractExactRational(coefficients.a);
	const b = extractExactRational(coefficients.b);
	const c = extractExactRational(coefficients.c);
	if (a === null || b === null || c === null) return false;
	const aValue = Number(a.n) / Number(a.d);
	const bValue = Number(b.n) / Number(b.d);
	const cValue = Number(c.n) / Number(c.d);
	return aValue > 0 && bValue * bValue - 4 * aValue * cValue < 0;
}

function isEvenPower(node: MathNode): boolean {
	return (
		node.type === 'superscript' &&
		isNumber(node.superscript) &&
		/^\d*[02468]$/.test(node.superscript.value)
	);
}

function isNonNegative(node: MathNode, variable: string): boolean {
	if (isPositive(node, variable) || isEvenPower(node)) return true;
	if (node.type === 'delimiter') return isNonNegative(node.content, variable);
	return isFunction(node) && node.name === 'abs';
}

/** u > 0 pour tout x réel (prouvé, jamais supposé) */
export function isPositive(node: MathNode, variable: string): boolean {
	switch (node.type) {
		case 'number':
			return !/^0*\.?0*$/.test(node.value);
		case 'constant':
			return isEulerConstant(node) || isPiConstant(node);
		case 'delimiter':
			return isPositive(node.content, variable);
		case 'superscript':
			if (isEulerConstant(node.base)) return true;
			return isEvenPower(node) ? isPositive(node.base, variable) : false;
		case 'function':
			if (node.name === 'exp') return true;
			break;
		case 'addition':
			if (
				(isPositive(node.left, variable) && isNonNegative(node.right, variable)) ||
				(isNonNegative(node.left, variable) && isPositive(node.right, variable))
			) {
				return true;
			}
			break;
		case 'multiplication':
			if (isPositive(node.left, variable) && isPositive(node.right, variable)) return true;
			break;
		case 'division':
			return isPositive(node.numerator, variable) && isPositive(node.denominator, variable);
		default:
			break;
	}
	return isPositiveTrinomial(node, variable);
}

// =============================================================================
// Réécriture
// =============================================================================

/** |u| → u quand u > 0 sur ℝ (appliqué à la primitive finale) */
export function dropAbsOfPositive(expr: MathNode, variable: string): MathNode {
	return mapNode(expr, (node) =>
		isFunction(node) &&
		node.name === 'abs' &&
		node.args.length === 1 &&
		isPositive(node.args[0], variable)
			? node.args[0]
			: node
	);
}
