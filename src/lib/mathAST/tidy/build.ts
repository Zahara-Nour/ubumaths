/**
 * Reconstruction d'un AST à partir des termes mis au propre.
 *
 * C'est ici que se décide l'écriture : quelles parenthèses sont nécessaires,
 * où passe la barre de fraction, quel signe porte le terme. Le générateur
 * `toCustom` ne rajoute aucune parenthèse de priorité : il s'appuie sur des
 * nœuds `delimiter` explicites. Tout ce qui manque ici manquera à l'écrit.
 *
 * @module mathAST/tidy/build
 */

import type { MathNode } from '../types';
import type { Rational } from '../normal/types';
import type { TidyFactor, TidyTerm } from './types';
import {
	add,
	divide,
	multiply,
	number,
	opposite,
	parentheses,
	subtract,
	superscript,
	withUnit
} from '../factory';
import { absBigInt, isNegative as isNegativeRational, negRational } from '../normal/rational';

// =============================================================================
// Parenthésage
// =============================================================================

/**
 * Cette base a-t-elle besoin de parenthèses quand elle devient un facteur
 * d'un produit ou la base d'une puissance ? `x(x+1)`, `(x+1)^2` : oui pour une
 * somme ; `x^2`, `sin(x)^2` : non pour une feuille ou une fonction.
 */
function needsParenthesesAsAtom(node: MathNode): boolean {
	switch (node.type) {
		case 'addition':
		case 'subtraction':
		case 'multiplication':
		case 'division':
		case 'opposite':
		case 'positive':
		case 'relation':
		case 'logical':
		case 'logical-not':
			return true;
		default:
			return false;
	}
}

// =============================================================================
// Rendu d'un facteur
// =============================================================================

/**
 * Écrit un exposant rationnel. Les exposants entiers positifs sont le cas
 * courant ; les autres restent possibles (`x^{1/2}`, `x^{-2}`).
 */
function buildExponent(exponent: Rational): MathNode {
	const magnitude =
		exponent.d === 1n
			? number(absBigInt(exponent.n).toString())
			: divide(number(absBigInt(exponent.n).toString()), number(exponent.d.toString()), 'fraction');
	return exponent.n < 0n ? opposite(magnitude) : magnitude;
}

/**
 * Écrit un facteur. `allowBareBase` n'est vrai que lorsque le facteur est à
 * lui seul toute l'expression : `(x+1)^2/(x+1)` rend `x+1`, sans parenthèses.
 */
export function buildFactor(factor: TidyFactor, allowBareBase = false): MathNode {
	const isExponentOne = factor.exponent.n === 1n && factor.exponent.d === 1n;
	const needsParentheses = needsParenthesesAsAtom(factor.base);

	if (isExponentOne) {
		return needsParentheses && !allowBareBase ? parentheses(factor.base) : factor.base;
	}

	const base = needsParentheses ? parentheses(factor.base) : factor.base;
	return superscript(base, buildExponent(factor.exponent));
}

// =============================================================================
// Rendu d'un terme
// =============================================================================

function buildProduct(atoms: readonly MathNode[]): MathNode {
	return atoms.reduce((left, right) => multiply(left, right, 'implicit'));
}

/**
 * Une somme seule au numérateur ou au dénominateur arrive parenthésée par
 * `buildFactor` (il le faut dans `2(x+1)` ou `(x+1)²`) ; de part et d'autre
 * d'une barre de fraction, ces parenthèses sont de trop.
 */
function withoutOuterParentheses(node: MathNode): MathNode {
	return node.type === 'delimiter' && node.delimiters === 'parentheses' ? node.content : node;
}

/**
 * Écrit la **valeur absolue** d'un terme — le signe est porté par la somme.
 *
 * `allowBare` autorise à ne pas parenthéser un facteur unique, ce qui n'est
 * légitime que si le terme est à lui seul toute l'expression.
 */
export function buildTermMagnitude(term: TidyTerm, allowBare: boolean): MathNode {
	const numeratorFactors = term.factors.filter((f) => !isNegativeRational(f.exponent));
	const denominatorFactors = term.factors
		.filter((f) => isNegativeRational(f.exponent))
		.map((f) => ({ ...f, exponent: negRational(f.exponent) }));

	const numeratorValue = absBigInt(term.coefficient.n);
	const denominatorValue = term.coefficient.d;

	const needsNumeratorNumber = numeratorValue !== 1n || numeratorFactors.length === 0;
	const numeratorAtomCount = (needsNumeratorNumber ? 1 : 0) + numeratorFactors.length;
	const denominatorAtomCount = (denominatorValue !== 1n ? 1 : 0) + denominatorFactors.length;

	// Un facteur seul, sans coefficient ni dénominateur ni unité : on peut
	// l'écrire nu.
	const bare =
		allowBare &&
		!needsNumeratorNumber &&
		numeratorAtomCount === 1 &&
		denominatorAtomCount === 0 &&
		term.unit === null;

	const numeratorAtoms: MathNode[] = [];
	if (needsNumeratorNumber) numeratorAtoms.push(number(numeratorValue.toString()));
	for (const factor of numeratorFactors) numeratorAtoms.push(buildFactor(factor, bare));

	let result = buildProduct(numeratorAtoms);

	if (denominatorAtomCount > 0) {
		const denominatorAtoms: MathNode[] = [];
		if (denominatorValue !== 1n) denominatorAtoms.push(number(denominatorValue.toString()));
		for (const factor of denominatorFactors) denominatorAtoms.push(buildFactor(factor));
		// Pas de délimiteur de part et d'autre de la barre : c'est la convention
		// de l'AST (celle de `denormalize`). En LaTeX, `\dfrac` n'en a pas
		// besoin — `\dfrac{\left( x+1 \right)}{2}` serait faux à l'écran — et
		// en linéaire, `toCustom` pose des accolades : `x/{2y}`.
		result = divide(
			withoutOuterParentheses(result),
			withoutOuterParentheses(buildProduct(denominatorAtoms)),
			'fraction'
		);
	}

	if (term.unit !== null) result = withUnit(result, term.unit);

	return result;
}

// =============================================================================
// Rendu d'une somme
// =============================================================================

/**
 * Assemble les termes ordonnés : le premier porte son signe, les suivants
 * deviennent une addition ou une soustraction. `x+(-3)` s'écrit `x-3`.
 */
export function buildSum(terms: readonly TidyTerm[]): MathNode {
	if (terms.length === 0) return number('0');

	const soleTerm = terms.length === 1;
	const first = terms[0];
	const firstIsNegative = isNegativeRational(first.coefficient);
	const firstMagnitude = buildTermMagnitude(first, soleTerm && !firstIsNegative);

	let result: MathNode = firstIsNegative ? opposite(firstMagnitude) : firstMagnitude;

	for (let i = 1; i < terms.length; i++) {
		const term = terms[i];
		const magnitude = buildTermMagnitude(term, false);
		result = isNegativeRational(term.coefficient)
			? subtract(result, magnitude)
			: add(result, magnitude);
	}

	return result;
}
