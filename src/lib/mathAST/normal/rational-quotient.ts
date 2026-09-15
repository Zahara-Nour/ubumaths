/**
 * Quotient de la division euclidienne d'une fraction rationnelle.
 *
 * Pour P/Q avec deg P ≥ deg Q, la division donne P/Q = D + R/Q où R/Q tend
 * vers 0 : **D est l'asymptote** de la courbe, exactement.
 *
 * C'est ce qu'un élève de lycée fait à la main, et c'est ce qu'aucun sondage
 * numérique ne peut égaler — l'extraction par interpolation plafonne au degré
 * 2, faute de pouvoir lire une unité sur x³ = 4e12 à l'échelle de sondage.
 *
 * @module mathAST/normal/rational-quotient
 */

import type { MathNode } from '../types';
import { isVariable } from '../guards';
import { compile } from '../eval/compile';
import {
	normalize,
	denormalize,
	checkUnivariate,
	toUnivariateView,
	fromUnivariateView,
	divideUnivariate,
	isOnePolynomial,
	ONE_POLYNOMIAL
} from './index';
import type { UnivariateView } from './univariate-gcd';

/**
 * Une asymptote polynomiale exacte : sa forme et ses valeurs.
 *
 * Les deux vont ensemble et sortent de la même division — l'appelant a besoin
 * de la forme pour l'étiquette (`y = x + 5`, pas `y = 1.0000000001x + 5`) et
 * des coefficients pour tracer le trait.
 */
export interface RationalAsymptote {
	/** Le polynôme exact, tel qu'on l'écrit au tableau. */
	readonly quotient: MathNode;
	/** Ses coefficients par degré croissant : `[5, 1]` pour `x + 5`. */
	readonly coefficients: readonly number[];
}

/**
 * Le polynôme dont la courbe de `expr` se rapproche à l'infini.
 *
 * @param expr - Expression à analyser
 * @param variable - Nom de la variable (« x » pour une courbe du grapheur)
 * @returns Le quotient et ses coefficients, ou `null` si `expr` n'est pas une
 *   fraction rationnelle en `variable` — auquel cas l'appelant se rabat sur une
 *   estimation numérique.
 *
 * @example
 * ```typescript
 * rationalQuotient(parseLatex('\\frac{x^2+3x}{x-2}'), 'x'); // x + 5, [5, 1]
 * rationalQuotient(parseLatex('\\sqrt{x^2+1}'), 'x');       // null
 * ```
 */
export function rationalQuotient(expr: MathNode, variable: string): RationalAsymptote | null {
	let normalForm;
	try {
		normalForm = normalize(expr);
	} catch {
		// Division par zéro, forme non normalisable : rien à conclure.
		return null;
	}

	// Un polynôme se normalise avec un dénominateur égal à 1 : il n'a pas
	// d'asymptote, il EST sa propre valeur.
	if (isOnePolynomial(normalForm.denominator)) return null;

	const numeratorCheck = checkUnivariate(normalForm.numerator);
	const denominatorCheck = checkUnivariate(normalForm.denominator);
	if (!numeratorCheck.isUnivariate || !denominatorCheck.isUnivariate) return null;

	// La variable portée par les vues doit être celle qu'on analyse : une
	// fraction en `t` n'a pas d'asymptote « en x ».
	const univariate = denominatorCheck.variable ?? numeratorCheck.variable;
	if (!univariate || !isVariable(univariate) || univariate.name !== variable) return null;

	try {
		const division = divideUnivariate(
			toUnivariateView(normalForm.numerator, univariate),
			toUnivariateView(normalForm.denominator, univariate)
		);
		if (!division) return null;

		const coefficients = viewCoefficients(division.quotient);
		if (coefficients === null) return null;

		return {
			quotient: denormalize({
				numerator: fromUnivariateView(division.quotient),
				denominator: ONE_POLYNOMIAL,
				hash: ''
			}),
			coefficients
		};
	} catch {
		return null;
	}
}

/**
 * Valeurs numériques des coefficients, par degré croissant.
 *
 * Un coefficient de forme normale n'est pas un nombre : c'est une somme de
 * termes algébriques, qui peut valoir √2 ou 1/3. On le dénormalise seul, puis
 * on l'évalue — c'est le seul endroit où l'exactitude se perd, et elle ne se
 * perd que pour le tracé, jamais pour l'étiquette.
 */
function viewCoefficients(view: UnivariateView): number[] | null {
	const values: number[] = [];

	for (let degree = 0; degree <= view.degree; degree++) {
		const node = denormalize({
			numerator: fromUnivariateView({
				variable: view.variable,
				coefficients: [view.coefficients[degree]],
				degree: 0
			}),
			denominator: ONE_POLYNOMIAL,
			hash: ''
		});
		const value = compile(node)({});
		if (!Number.isFinite(value)) return null;
		values.push(value);
	}

	return values;
}
