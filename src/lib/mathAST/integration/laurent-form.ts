/**
 * Écriture de classe d'une primitive qui contient des puissances NÉGATIVES
 * de la variable : terme à terme, et non réduite au même dénominateur.
 *
 * `normalize` range une somme en UNE fraction (x − 1/x → (x² − 1)/x) et
 * rationalise les racines (−2/√x → −2√x/x). La classe écrit x − 1/x,
 * ½x² − 2 ln|x| − 1/x, −2/√x, −3/(2x²) : chaque terme du numérateur est divisé
 * par le dénominateur (un seul monôme), les exposants d'une même base sont
 * fusionnés, et les facteurs d'exposant négatif passent au dénominateur.
 *
 * @module mathAST/integration/laurent-form
 */

import type { MathNode } from '../types';
import type {
	AlgebraicTerm,
	NormalForm,
	NormalTerm,
	Rational,
	SymbolicFactor
} from '../normal/types';
import { denormalizeTerm } from '../normal';
import { hashMathNode } from '../normal/hash';
import { addRational, divRational, negRational } from '../normal/rational';
import { add, opposite, subtract } from '../factory';
import { containsVariable } from '../common/contains-variable';

// =============================================================================
// Types
// =============================================================================

interface SignedTerm {
	readonly negative: boolean;
	readonly node: MathNode;
}

// =============================================================================
// Outils
// =============================================================================

/** Coefficient rationnel d'un seul terme algébrique, sans i ; sinon null */
function singleCoefficient(term: NormalTerm): AlgebraicTerm | null {
	const terms = term.coefficient.terms;
	if (terms.length !== 1 || terms[0].hasImaginaryUnit === true) return null;
	return terms[0];
}

/** Exposants de numérateur − dénominateur, par base (ordre du numérateur) */
function mergeFactors(
	numerator: readonly SymbolicFactor[],
	denominator: readonly SymbolicFactor[]
): SymbolicFactor[] {
	const merged = new Map<string, SymbolicFactor>();
	const put = (factor: SymbolicFactor, exponent: Rational) => {
		const id = hashMathNode(factor.base);
		const previous = merged.get(id);
		merged.set(id, {
			base: factor.base,
			exponent: previous ? addRational(previous.exponent, exponent) : exponent
		});
	};
	for (const factor of numerator) put(factor, factor.exponent);
	for (const factor of denominator) put(factor, negRational(factor.exponent));
	return [...merged.values()].filter((factor) => factor.exponent.n !== 0n);
}

function termNode(
	rational: Rational,
	radicals: AlgebraicTerm['radicals'],
	monomial: readonly SymbolicFactor[]
): MathNode {
	return denormalizeTerm({ coefficient: { terms: [{ rational, radicals }] }, monomial });
}

/** c·∏ facteurs, les facteurs d'exposant négatif au dénominateur */
function signedTerm(coefficient: AlgebraicTerm, factors: readonly SymbolicFactor[]): SignedTerm {
	const { n, d } = coefficient.rational;
	const negative = n < 0n;
	const magnitude = negative ? -n : n;
	const above = factors.filter((factor) => factor.exponent.n > 0n);
	const below = factors
		.filter((factor) => factor.exponent.n < 0n)
		.map((factor) => ({ base: factor.base, exponent: negRational(factor.exponent) }));
	if (below.length === 0) {
		return { negative, node: termNode({ n: magnitude, d }, coefficient.radicals, above) };
	}
	const numerator = termNode({ n: magnitude, d: 1n }, coefficient.radicals, above);
	const denominator = termNode({ n: d, d: 1n }, [], below);
	return {
		negative,
		node: { type: 'division', numerator, denominator, displayStyle: 'fraction' }
	};
}

// =============================================================================
// API
// =============================================================================

/**
 * La primitive écrite terme à terme quand une puissance de `variable` y a un
 * exposant négatif ; null sinon (l'écriture de `denormalize` est gardée).
 */
export function laurentForm(form: NormalForm, variable: string): MathNode | null {
	if (form.denominator.length !== 1) return null;
	const below = form.denominator[0];
	const belowCoefficient = singleCoefficient(below);
	if (belowCoefficient === null || belowCoefficient.radicals.length > 0) return null;

	const pieces: { coefficient: AlgebraicTerm; factors: SymbolicFactor[] }[] = [];
	for (const term of form.numerator) {
		const coefficient = singleCoefficient(term);
		if (coefficient === null) return null;
		pieces.push({
			coefficient: {
				rational: divRational(coefficient.rational, belowCoefficient.rational),
				radicals: coefficient.radicals
			},
			factors: mergeFactors(term.monomial, below.monomial)
		});
	}
	const hasNegativePower = pieces.some(({ factors }) =>
		factors.some((factor) => factor.exponent.n < 0n && containsVariable(factor.base, variable))
	);
	if (!hasNegativePower || pieces.length === 0) return null;

	const terms = pieces.map(({ coefficient, factors }) => signedTerm(coefficient, factors));
	const [first, ...rest] = terms;
	return rest.reduce<MathNode>(
		(sum, term) => (term.negative ? subtract(sum, term.node) : add(sum, term.node)),
		first.negative ? opposite(first.node) : first.node
	);
}
