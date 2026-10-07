/**
 * Recours quand l'intégrateur choisi refuse : formes u′·f(u) avec u NON
 * linéaire, et linéarisation de sin²(u) / cos²(u).
 *
 * u′·f(u) : l'intégrande et u′ sont décomposés en produits de facteurs ;
 * chaque facteur de u′ doit se retrouver (à une constante rationnelle près)
 * dans l'intégrande. Ce qui reste, une fois u remplacé par une variable
 * fraîche U, ne doit plus contenir x : c'est f(U), intégrée en U puis
 * re-substituée. L'égalité intégrande = k · u′ · f(u) est EXACTE (facteurs
 * proportionnels au sens des formes normales) : pas de primitive approchée.
 *
 * Exemples : ln x / x (u = ln x, f(U) = U), 1/(x ln x) (f(U) = 1/U),
 * cos x · e^{sin x} (f(U) = e^U), (2x+1)(x²+x)³ (f(U) = U³).
 *
 * @module mathAST/integration/integrators/chain-rule
 */

import type { MathNode } from '../../types';
import type { IntegrateResult, IntegrateStepRecorder, ResolvedIntegrateOptions } from '../types';
import { findUCandidates, findProportionalityRatio } from '../patterns';
import { differentiate } from '../../differentiation';
import { substitute } from '../../eval/substitute';
import { hashMathNode } from '../../normal/hash';
import { mapNode } from '../../transforms';
import { containsVariable } from '../rules';
import { isNumber, isFunction, isSuperscript } from '../../guards';
import {
	number,
	variable as variableNode,
	divide,
	multiply,
	power,
	func,
	subtract,
	add
} from '../../factory';
import { rationalToNode, extractExactRational } from '../../common/numeric';
import { normalize, denormalize } from '../../normal';
import { divRational, mulRational, ONE } from '../../normal/rational';
import type { Rational } from '../../normal/types';
import { toCustom } from '../../custom-generator';
import { CONSTANT_OF_INTEGRATION_NOTE } from '../descriptions-fr';
import { integrate } from '../integrate';

// =============================================================================
// Types
// =============================================================================

/** Produit Π num / Π den, constantes séparées */
interface Factors {
	readonly num: MathNode[];
	readonly den: MathNode[];
	readonly constNum: MathNode[];
	readonly constDen: MathNode[];
}

// =============================================================================
// Constantes
// =============================================================================

/** Variable fraîche, si libre dans l'intégrande */
const FRESH_VARIABLES: readonly string[] = ['u', 'v', 'w', 's', 'z'];

/** Nombre maximal de candidats u essayés (budget) */
const MAX_CANDIDATES = 12;

// =============================================================================
// Décomposition en facteurs
// =============================================================================

function unwrapGrouping(node: MathNode): MathNode {
	let current = node;
	while (current.type === 'delimiter' && current.semantic === 'grouping') {
		current = current.content;
	}
	return current;
}

/** b^{−k} (k nombre) → facteur b^k au dénominateur */
function negativePowerBase(node: MathNode): MathNode | null {
	if (!isSuperscript(node)) return null;
	const exponent = node.superscript;
	if (exponent.type !== 'opposite' || !isNumber(exponent.operand)) return null;
	return exponent.operand.value === '1' ? node.base : power(node.base, exponent.operand);
}

function collectFactors(node: MathNode, variable: string, into: Factors, inverted: boolean): void {
	const current = unwrapGrouping(node);
	if (!containsVariable(current, variable)) {
		(inverted ? into.constDen : into.constNum).push(current);
		return;
	}
	if (current.type === 'multiplication') {
		collectFactors(current.left, variable, into, inverted);
		collectFactors(current.right, variable, into, inverted);
		return;
	}
	if (current.type === 'division') {
		collectFactors(current.numerator, variable, into, inverted);
		collectFactors(current.denominator, variable, into, !inverted);
		return;
	}
	if (current.type === 'opposite') {
		// −f = (−1)·f : constante portée par un nœud opposite, jamais un « -1 »
		(inverted ? into.constDen : into.constNum).push({ type: 'opposite', operand: number('1') });
		collectFactors(current.operand, variable, into, inverted);
		return;
	}
	const reciprocal = negativePowerBase(current);
	if (reciprocal !== null) {
		collectFactors(reciprocal, variable, into, !inverted);
		return;
	}
	(inverted ? into.den : into.num).push(current);
}

function factorsOf(node: MathNode, variable: string): Factors {
	const factors: Factors = { num: [], den: [], constNum: [], constDen: [] };
	collectFactors(node, variable, factors, false);
	return factors;
}

function productOf(nodes: readonly MathNode[]): MathNode {
	if (nodes.length === 0) return number('1');
	return nodes.slice(1).reduce<MathNode>((acc, n) => multiply(acc, n, 'implicit'), nodes[0]);
}

/**
 * Retire de `pool` un facteur proportionnel à `target` (f = r · target) ;
 * rend r, ou null.
 */
function proportionalityRatio(
	factor: MathNode,
	target: MathNode,
	variable: string
): Rational | null {
	const direct = findProportionalityRatio(factor, target);
	if (direct !== null) return direct;
	// Sommes (x − 1 contre 2x − 2) : le quotient normalisé doit être rationnel
	try {
		const quotient = denormalize(normalize(divide(factor, target, 'fraction')));
		return containsVariable(quotient, variable) ? null : extractExactRational(quotient);
	} catch {
		return null;
	}
}

function takeProportional(pool: MathNode[], target: MathNode, variable: string): Rational | null {
	for (let i = 0; i < pool.length; i++) {
		const ratio = proportionalityRatio(pool[i], target, variable);
		if (ratio !== null && ratio.n !== 0n) {
			pool.splice(i, 1);
			return ratio;
		}
	}
	return null;
}

// =============================================================================
// u′·f(u)
// =============================================================================

/**
 * f(U) telle que intégrande = f(u) · u′, ou null. Les constantes restent dans
 * f(U) (intégrées par linéarité).
 */
function quotientByDerivative(
	integrand: Factors,
	du: MathNode,
	u: MathNode,
	fresh: MathNode,
	variable: string
): MathNode | null {
	const derivative = factorsOf(du, variable);
	const num = [...integrand.num];
	const den = [...integrand.den];
	let ratio: Rational = ONE;
	for (const factor of derivative.num) {
		const r = takeProportional(num, factor, variable);
		if (r === null) return null;
		ratio = mulRational(ratio, r);
	}
	for (const factor of derivative.den) {
		const r = takeProportional(den, factor, variable);
		if (r === null) return null;
		ratio = divRational(ratio, r);
	}
	// intégrande = ratio · Πc_int / Πc_du · u′ · Π num / Π den
	const constantNum = [...integrand.constNum, ...derivative.constDen];
	const constantDen = [...integrand.constDen, ...derivative.constNum];
	const uHash = hashMathNode(u);
	const replaceU = (node: MathNode): MathNode =>
		mapNode(node, (n) => (hashMathNode(n) === uHash ? fresh : n));
	const rest = divide(
		multiply(rationalToNode(ratio), productOf([...constantNum, ...num.map(replaceU)]), 'implicit'),
		productOf([...constantDen, ...den.map(replaceU)]),
		'fraction'
	);
	return containsVariable(rest, variable) ? null : rest;
}

function pickFreshVariable(integrand: MathNode, variable: string): string | null {
	return (
		FRESH_VARIABLES.find((name) => name !== variable && !containsVariable(integrand, name)) ?? null
	);
}

/** Candidats u : ceux de la substitution classique, sans les affines (u′ constant) */
function chainRuleSubstitution(
	expr: MathNode,
	variable: string,
	options: ResolvedIntegrateOptions,
	recorder: IntegrateStepRecorder,
	depth: number
): IntegrateResult | null {
	const freshName = pickFreshVariable(expr, variable);
	if (freshName === null) return null;
	const fresh = variableNode(freshName);
	const integrand = factorsOf(expr, variable);
	const candidates = findUCandidates(expr, variable).slice(0, MAX_CANDIDATES);
	for (const u of candidates) {
		let du: MathNode;
		try {
			du = differentiate(u, { variable });
		} catch {
			continue;
		}
		if (!containsVariable(du, variable)) continue;
		const rest = quotientByDerivative(integrand, du, u, fresh, variable);
		if (rest === null) continue;
		const inner = integrate(rest, { ...options, variable: freshName, _depth: depth + 1 });
		if (inner.status !== 'exact' || inner.antiderivative === null) continue;
		const antiderivative = substitute(
			inner.antiderivative,
			{ [freshName]: u },
			{ maxIterations: 1 }
		);
		recorder.recordStepByRule(
			'identify-substitution',
			expr,
			u,
			'detailed',
			du,
			`On reconnaît u′·f(u) avec ${freshName} = ${toCustom(u)}, d${freshName} = ${toCustom(du)} d${variable}`
		);
		recorder.recordStepByRule(
			'substitute-back',
			inner.antiderivative,
			antiderivative,
			'summarized',
			u
		);
		return {
			variable,
			status: 'exact',
			antiderivative,
			integrandType: inner.integrandType,
			technique: 'u-substitution',
			steps: recorder.getSteps(),
			constantNote: CONSTANT_OF_INTEGRATION_NOTE
		};
	}
	return null;
}

// =============================================================================
// sin²(u), cos²(u)
// =============================================================================

/** sin²(u) = ½ − ½cos(2u) ; cos²(u) = ½ + ½cos(2u) */
function linearizeSquaredTrig(expr: MathNode): MathNode | null {
	const node = unwrapGrouping(expr);
	if (!isSuperscript(node) || !isNumber(node.superscript) || node.superscript.value !== '2') {
		return null;
	}
	const base = unwrapGrouping(node.base);
	if (!isFunction(base) || base.args.length !== 1 || base.power !== undefined) return null;
	if (base.name !== 'sin' && base.name !== 'cos') return null;
	const half = divide(number('1'), number('2'), 'fraction');
	const doubled = func('cos', [multiply(number('2'), base.args[0], 'implicit')]);
	const halfCos = divide(doubled, number('2'), 'fraction');
	return base.name === 'sin' ? subtract(half, halfCos) : add(half, halfCos);
}

// =============================================================================
// Point d'entrée
// =============================================================================

/**
 * Recours après un refus : rend une primitive EXACTE ou null (le refus
 * initial est alors conservé par l'appelant).
 */
export function integrateByChainRule(
	expr: MathNode,
	variable: string,
	options: ResolvedIntegrateOptions,
	recorder: IntegrateStepRecorder,
	depth: number
): IntegrateResult | null {
	const linearized = linearizeSquaredTrig(expr);
	if (linearized !== null) {
		const result = integrate(linearized, { ...options, variable, _depth: depth + 1 });
		if (result.status !== 'exact' || result.antiderivative === null) return null;
		recorder.recordStep(
			'linearize-trig',
			'Linéarisation : sin²(u) = ½ − ½cos(2u), cos²(u) = ½ + ½cos(2u)',
			expr,
			linearized,
			'detailed'
		);
		return { ...result, steps: recorder.getSteps() };
	}
	return chainRuleSubstitution(expr, variable, options, recorder, depth);
}
