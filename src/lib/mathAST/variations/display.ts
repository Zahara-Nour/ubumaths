/**
 * La dérivée telle qu'on l'écrit au-dessus d'un tableau de variations
 * (décision D2, lot 5b du chantier simplify-carte, 2026-10-23).
 *
 * ⚠️ L'élève lit le SIGNE de f′ dans ce qui est affiché. Deux écritures :
 *
 * 1. **La forme finale** (`finalDerivative`, lot 5a) : celle de `.dériver`,
 *    quotient divisé par le facteur commun quand le domaine de f le permet
 *    (Q18), exponentielle commune en facteur. C'est l'étape « Dérivée ».
 * 2. **La forme factorisée** : la politique `factoriser` (ADR 0024, lycée)
 *    sur le numérateur d'un quotient (dénominateur tel quel, un carré la
 *    plupart du temps), sur l'expression entière sinon. `x² − 2` →
 *    `(x − √2)(x + √2)`, `(x² + 2x)/(x + 1)²` → `x(x + 2)/(x + 1)²`,
 *    `(2x − x²)e^{−x}` → `x(2 − x)e^{−x}`. Un − devant reste
 *    (`−2(x² + 9)/(x² − 9)²`). L'ordre des facteurs et l'ordre interne d'un
 *    facteur sont ceux du noyau. Rien ne se factorise (`x² + 1`,
 *    `x² − 2x + 5`), ou budget dépassé : la forme finale reste.
 *
 * Le calcul du signe ne lit ni l'une ni l'autre : il part de `result.derivative`.
 *
 * @module mathAST/variations/display
 */

import type { MathNode } from '../types';
import { isDivision, isMultiplication, isOpposite } from '../guards';
import { delimiter, divide, opposite } from '../factory';
import { mapNode } from '../transforms';
import { tidy } from '../tidy';
import { hashMathNode } from '../normal/hash';
import { generatePedagogicalSimplifySteps } from '../pedagogical-simplify/pipeline';
import { finalDerivative } from '../pedagogical-differentiation/final-form';
import { toCustom } from '../custom-generator';

/** Le budget de la politique `factoriser`, comme celui d'`auto` dans final-form. */
const FACTOR_TIMEOUT_MS = 1000;

/** Les deux écritures de f′ d'une étude de variations. */
export interface DisplayedDerivatives {
	/** La forme finale de `.dériver` (lot 5a) */
	readonly final: MathNode;
	/** La forme où se lit le signe : `final` factorisée, ou `final` elle-même */
	readonly factored: MathNode;
}

/**
 * La forme finale de f′ et sa forme factorisée. Ne lève jamais.
 *
 * @param derivative - La dérivée calculée (`result.derivative`)
 * @param f - La fonction dérivée : son domaine est acquis pour f′ (S3)
 */
export function displayedDerivatives(derivative: MathNode, f: MathNode): DisplayedDerivatives {
	const final = finalDerivative(derivative, f);
	try {
		return { final, factored: factoredForSign(final) };
	} catch {
		return { final, factored: final };
	}
}

/**
 * f′ écrite pour qu'on y lise le signe : la forme factorisée. Pour le CLI.
 *
 * @param f - La fonction dérivée : son domaine est acquis pour f′ (S3)
 */
export function reducedDerivative(derivative: MathNode, f: MathNode): MathNode {
	return displayedDerivatives(derivative, f).factored;
}

/** Quotient (sous un éventuel −) : numérateur seul ; sinon l'expression entière. */
function factoredForSign(node: MathNode): MathNode {
	if (isOpposite(node) && isDivision(node.operand)) {
		const quotient = node.operand;
		const top = factored(quotient.numerator);
		return top === quotient.numerator
			? node
			: opposite(divide(top, quotient.denominator, quotient.displayStyle));
	}
	if (isDivision(node)) {
		const top = factored(node.numerator);
		return top === node.numerator ? node : divide(top, node.denominator, node.displayStyle);
	}
	return factored(node);
}

/**
 * `node` factorisée par la politique `factoriser`, ou `node` elle-même (même
 * référence) si rien n'a changé, si le résultat est encore une somme, ou si le
 * budget est dépassé. L'ordre du noyau est gardé (`tidy` sans réordonner).
 */
function factored(node: MathNode): MathNode {
	const result = generatePedagogicalSimplifySteps(node, {
		intent: 'factoriser',
		schoolLevel: 'lycee',
		timeoutMs: FACTOR_TIMEOUT_MS
	});
	if (result.aborted === true) return node;
	const candidate = tidy(result.result, { order: 'kept' });
	const inner = isOpposite(candidate) ? candidate.operand : candidate;
	const stillSum = inner.type === 'addition' || inner.type === 'subtraction';
	if (stillSum || hashMathNode(candidate) === hashMathNode(node)) return node;
	return candidate;
}

/**
 * Une expression en notation de texte lisible : `-2/(2x-1)^2`, `(x^2-2x)/(x-1)^2`,
 * jamais les accolades de la notation maison (`{-2}/{(2x-1)^2}`).
 *
 * Les fractions deviennent des divisions EN LIGNE, qui groupent leurs sommes
 * d'elles-mêmes ; un produit ou un quotient au dénominateur est mis entre
 * parenthèses (`1/(2x)`, jamais `1/2x`, qui se lirait (1/2)x).
 */
export function readableText(node: MathNode): string {
	const inline = mapNode(node, (current) => {
		if (!isDivision(current)) return current;
		const { denominator } = current;
		const grouped =
			isMultiplication(denominator) || isDivision(denominator) || isOpposite(denominator)
				? delimiter('parentheses', denominator)
				: denominator;
		return { ...current, denominator: grouped, displayStyle: 'inline' as const };
	});
	return toCustom(inline).replace(/:\//g, '/');
}
