/**
 * Recours quand l'intégrateur choisi refuse : primitives usuelles de Terminale
 * données par une IDENTITÉ exacte, u = ax + b affine (a constant non nul,
 * calculé comme u′) :
 *
 * - 1/cos²(u) → tan(u)/a ;
 * - tan²(u) = 1/cos²(u) − 1 (donc 1 + tan²(u) → tan(u)/a) ;
 * - 1/tan(u) = cos(u)/sin(u) → ln|sin u|/a (|·| : sin change de signe) ;
 * - |u| → u|u|/(2a) : dérivable sur ℝ, de dérivée |u| partout (u ≥ 0 :
 *   u²/(2a), u ≤ 0 : −u²/(2a)) ;
 * - N/xᵖ avec un ln ou un arctan dans N → N · x⁻ᵖ, que l'intégration par
 *   parties sait traiter (ln x / x² → −(ln x + 1)/x).
 *
 * @module mathAST/integration/integrators/identities
 */

import type { MathNode } from '../../types';
import type { IntegrateResult, IntegrateStepRecorder, ResolvedIntegrateOptions } from '../types';
import {
	isDelimiter,
	isDivision,
	isFunction,
	isNumber,
	isSuperscript,
	isVariable
} from '../../guards';
import { divide, func, multiply, number, opposite, power, subtract, variable } from '../../factory';
import { findNodes } from '../../transforms';
import { differentiate } from '../../differentiation';
import { extractExactRational } from '../../common/numeric';
import { containsVariable } from '../rules';
import { classifyIntegrand } from '../classify';
import { CONSTANT_OF_INTEGRATION_NOTE } from '../descriptions-fr';
import { integrate } from '../integrate';

// =============================================================================
// Types
// =============================================================================

/** Argument affine u = ax + b et sa pente a = u′ (constante non nulle) */
interface AffineArgument {
	readonly u: MathNode;
	readonly slope: MathNode;
}

// =============================================================================
// Outils
// =============================================================================

function unwrapGrouping(node: MathNode): MathNode {
	let current = node;
	while (isDelimiter(current) && current.semantic === 'grouping') current = current.content;
	return current;
}

function isTheVariable(node: MathNode, name: string): boolean {
	const inner = unwrapGrouping(node);
	return isVariable(inner) && inner.name === name;
}

function isOne(node: MathNode): boolean {
	const inner = unwrapGrouping(node);
	return isNumber(inner) && inner.value === '1';
}

/** u affine en x : sa pente u′, constante et non nulle, ou null */
function affineArgument(u: MathNode, variableName: string): AffineArgument | null {
	if (!containsVariable(u, variableName)) return null;
	if (isTheVariable(u, variableName)) return { u, slope: number('1') };
	let slope: MathNode;
	try {
		slope = differentiate(u, { variable: variableName });
	} catch {
		return null;
	}
	if (containsVariable(slope, variableName)) return null;
	// Pente numérique nulle : u constant déguisé. Pente littérale (a) : supposée
	// non nulle, convention générique
	const exactSlope = extractExactRational(slope);
	if (exactSlope !== null && exactSlope.n === 0n) return null;
	return { u, slope };
}

/** `name(u)` sans puissance, u affine */
function plainCall(node: MathNode, name: string, variableName: string): AffineArgument | null {
	const inner = unwrapGrouping(node);
	if (
		!isFunction(inner) ||
		inner.name !== name ||
		inner.power !== undefined ||
		inner.base !== undefined ||
		inner.args.length !== 1
	) {
		return null;
	}
	return affineArgument(inner.args[0], variableName);
}

/** `name²(u)` écrit `\name^2 u` ou `(\name u)^2`, u affine */
function squaredCall(node: MathNode, name: string, variableName: string): AffineArgument | null {
	const inner = unwrapGrouping(node);
	if (isFunction(inner)) {
		if (
			inner.name !== name ||
			inner.args.length !== 1 ||
			inner.base !== undefined ||
			inner.power === undefined ||
			!isNumber(inner.power) ||
			inner.power.value !== '2'
		) {
			return null;
		}
		return affineArgument(inner.args[0], variableName);
	}
	if (isSuperscript(inner) && isNumber(inner.superscript) && inner.superscript.value === '2') {
		return plainCall(inner.base, name, variableName);
	}
	return null;
}

/** F(u)/a, sans division quand a = 1 */
function overSlope(antiderivative: MathNode, slope: MathNode): MathNode {
	return isOne(slope) ? antiderivative : divide(antiderivative, slope, 'fraction');
}

function exactResult(
	expr: MathNode,
	antiderivative: MathNode,
	variableName: string,
	recorder: IntegrateStepRecorder
): IntegrateResult {
	return {
		variable: variableName,
		status: 'exact',
		antiderivative,
		integrandType: classifyIntegrand(expr, variableName),
		technique: 'basic-rule',
		steps: recorder.getSteps(),
		constantNote: CONSTANT_OF_INTEGRATION_NOTE
	};
}

/** Intègre la forme réécrite ; null si elle est refusée à son tour */
function integrateRewritten(
	expr: MathNode,
	rewritten: MathNode,
	description: string,
	variableName: string,
	options: ResolvedIntegrateOptions,
	recorder: IntegrateStepRecorder,
	depth: number
): IntegrateResult | null {
	const result = integrate(rewritten, { ...options, variable: variableName, _depth: depth + 1 });
	if (result.status !== 'exact' || result.antiderivative === null) return null;
	recorder.recordStep('rewrite-identity', description, expr, rewritten, 'detailed');
	return { ...result, steps: recorder.getSteps() };
}

/** xᵖ (p nombre positif) ou √x : l'exposant p, ou null */
function variablePowerExponent(node: MathNode, variableName: string): MathNode | null {
	const inner = unwrapGrouping(node);
	if (isTheVariable(inner, variableName)) return number('1');
	if (
		isFunction(inner) &&
		inner.name === 'sqrt' &&
		inner.base === undefined &&
		inner.power === undefined &&
		inner.args.length === 1 &&
		isTheVariable(inner.args[0], variableName)
	) {
		return divide(number('1'), number('2'), 'fraction');
	}
	if (isSuperscript(inner) && isTheVariable(inner.base, variableName)) {
		return isNumber(inner.superscript) ? inner.superscript : null;
	}
	return null;
}

function containsPartsFactor(node: MathNode): boolean {
	return (
		findNodes(node, (n) => isFunction(n) && (n.name === 'ln' || n.name === 'arctan')).length > 0
	);
}

// =============================================================================
// Point d'entrée
// =============================================================================

/**
 * Recours après un refus : rend une primitive EXACTE ou null (le refus
 * initial est alors conservé par l'appelant).
 */
export function integrateByIdentity(
	expr: MathNode,
	variableName: string,
	options: ResolvedIntegrateOptions,
	recorder: IntegrateStepRecorder,
	depth: number
): IntegrateResult | null {
	const node = unwrapGrouping(expr);

	// |u| → u|u|/(2a)
	const absArg = plainCall(node, 'abs', variableName);
	if (absArg !== null) {
		const { u, slope } = absArg;
		const antiderivative = divide(
			multiply(u, func('abs', [u]), 'implicit'),
			isOne(slope) ? number('2') : multiply(number('2'), slope, 'implicit'),
			'fraction'
		);
		recorder.recordStep(
			'abs-rule',
			'Primitive de |u| (u affine) : u|u|/(2a), dérivable sur ℝ',
			expr,
			antiderivative,
			'summarized'
		);
		return exactResult(expr, antiderivative, variableName, recorder);
	}

	// tan²(u) = 1/cos²(u) − 1
	const tanSquaredArg = squaredCall(node, 'tan', variableName);
	if (tanSquaredArg !== null) {
		const rewritten = subtract(
			divide(number('1'), func('cos', [tanSquaredArg.u], { power: number('2') }), 'fraction'),
			number('1')
		);
		return integrateRewritten(
			expr,
			rewritten,
			'tan²(u) = 1/cos²(u) − 1',
			variableName,
			options,
			recorder,
			depth
		);
	}

	if (!isDivision(node)) return null;
	const numerator = unwrapGrouping(node.numerator);

	// c/D (c constant ≠ 1) = c · 1/D : les identités ci-dessous voient 1/D
	if (!isOne(numerator) && !containsVariable(numerator, variableName)) {
		const unit = divide(number('1'), node.denominator, 'fraction');
		if (integrateByIdentity(unit, variableName, options, recorder, depth) === null) return null;
		return integrateRewritten(
			expr,
			multiply(node.numerator, unit, 'implicit'),
			'Factorisation de la constante du numérateur',
			variableName,
			options,
			recorder,
			depth
		);
	}

	if (isOne(numerator)) {
		// 1/cos²(u) → tan(u)/a
		const cosSquaredArg = squaredCall(node.denominator, 'cos', variableName);
		if (cosSquaredArg !== null) {
			const antiderivative = overSlope(func('tan', [cosSquaredArg.u]), cosSquaredArg.slope);
			recorder.recordStep(
				'sec2-rule',
				'Primitive de 1/cos²(u) (u affine) : tan(u)/a',
				expr,
				antiderivative,
				'summarized'
			);
			return exactResult(expr, antiderivative, variableName, recorder);
		}

		// 1/tan(u) = cos(u)/sin(u)
		const tanArg = plainCall(node.denominator, 'tan', variableName);
		if (tanArg !== null) {
			return integrateRewritten(
				expr,
				divide(func('cos', [tanArg.u]), func('sin', [tanArg.u]), 'fraction'),
				'1/tan(u) = cos(u)/sin(u)',
				variableName,
				options,
				recorder,
				depth
			);
		}
	}

	// N/xᵖ avec ln ou arctan dans N → N · x⁻ᵖ (intégration par parties)
	const exponent = variablePowerExponent(node.denominator, variableName);
	if (exponent !== null && containsPartsFactor(numerator)) {
		return integrateRewritten(
			expr,
			multiply(node.numerator, power(variable(variableName), opposite(exponent)), 'implicit'),
			`Division par ${variableName}ᵖ écrite comme produit par ${variableName}⁻ᵖ`,
			variableName,
			options,
			recorder,
			depth
		);
	}

	return null;
}
