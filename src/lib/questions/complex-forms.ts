/**
 * Formes exigeables d'un nombre complexe (`requiredForm`), décision de David du 2026-10-05
 * ==========================================================================================
 *
 * - `exponentielle` : `re^{iθ}` avec r > 0 constant (`e^{iθ}` : r = 1) et θ réel constant ;
 *   l'argument est libre (`2e^{i\frac{7\pi}{3}}` est de la bonne forme, la VALEUR décide
 *   s'il est juste). `-2e^{i\frac{4\pi}{3}}` (r < 0), une forme trigonométrique ou
 *   algébrique sont refusées.
 * - `algebrique` : `a+bi` (a, b réels constants), y compris `\frac{a+bi}{d}` (même forme,
 *   cf. `unifyComplexAlgebraicNotationAST`) ; refusées : exponentielle, trigonométrique,
 *   quotient non calculé (`\frac{1}{1+i}`), somme non réduite (`1+2+i`).
 *
 * Purement structurel : la valeur est jugée avant (formule d'Euler sur le chemin de
 * l'équivalence, `mathAST/normal/rules/euler-formula.ts`).
 *
 * @module questions/complex-forms
 */

import type { MathNode } from '$lib/mathAST/types';
import type { ComplexForm } from './types';
import {
	findNodes,
	flattenProductShallow,
	flattenSumShallow,
	unflattenProduct,
	isDivision,
	isEulerConstant,
	isFunction,
	isMultiplication,
	isNumber,
	isOpposite,
	isSuperscript,
	isVariable
} from '$lib/mathAST';
import {
	imaginaryProductRest,
	unifyComplexAlgebraicNotationAST,
	unifyEulerNotationAST
} from '$lib/mathAST/cosmetic-transforms';
import { evaluateNodeToApproximatedNumber } from '$lib/mathAST/eval/evaluate';

/** Messages d'une forme exigée non respectée */
export const COMPLEX_FORM_FEEDBACK: Record<ComplexForm, string> = {
	exponentielle: 'La réponse doit être écrite sous forme exponentielle : re^{iθ} avec r > 0.',
	algebrique: 'La réponse doit être écrite sous forme algébrique : a + ib.'
};

/** Radicaux : seules fonctions admises dans un coefficient (`\sqrt{3}`, `\sqrt[3]{2}`) */
const RADICAL_FUNCTIONS: ReadonlySet<string> = new Set(['sqrt', 'root', 'nthroot']);

/** Aucune lettre (ni `i`, ni `e`, ni variable) et aucune fonction hors radicaux (`cos`, `exp`…) */
function isPlainRealConstant(node: MathNode): boolean {
	return (
		findNodes(
			node,
			(n) =>
				isVariable(n) || isEulerConstant(n) || (isFunction(n) && !RADICAL_FUNCTIONS.has(n.name))
		).length === 0
	);
}

/** Constante réelle strictement positive (`2`, `\sqrt{2}`, `\frac{3}{2}`) */
function isPositiveConstant(node: MathNode): boolean {
	if (!isPlainRealConstant(node)) return false;
	try {
		return evaluateNodeToApproximatedNumber(node) > 0;
	} catch {
		return false;
	}
}

/** Exposant `iθ` : une seule fois `i`, aucune autre lettre, pas une somme (`1+i\pi` exclu) */
function isImaginaryExponent(exponent: MathNode): boolean {
	const letters = findNodes(exponent, isVariable);
	if (letters.length !== 1 || !isVariable(letters[0]) || letters[0].name !== 'i') return false;
	if (findNodes(exponent, (n) => isFunction(n) && !RADICAL_FUNCTIONS.has(n.name)).length > 0) {
		return false;
	}
	let core = exponent;
	while (isOpposite(core)) core = core.operand;
	if (flattenSumShallow(core).length !== 1) return false;
	// `\frac{i\pi}{3}`, `\frac{\pi}{3}i`, `i\frac{\pi}{3}` (déjà ramenés à `\frac{\pi}{3}i`)
	if (isDivision(core)) return flattenSumShallow(core.numerator).length === 1;
	return isMultiplication(core) || isVariable(core);
}

/** `e^{iθ}` (constante d'Euler : `\exp` y est déjà ramené) */
function isUnitExponential(node: MathNode): boolean {
	return isSuperscript(node) && isEulerConstant(node.base) && isImaginaryExponent(node.superscript);
}

function isExponentialForm(node: MathNode): boolean {
	if (isUnitExponential(node)) return true;
	if (!isMultiplication(node)) return false;
	const factors = flattenProductShallow(node);
	if (factors.filter((f) => isUnitExponential(f.factor)).length !== 1) return false;
	// Module : produit des autres facteurs (`2\sqrt{2}`), constant et strictement positif
	const modulus = unflattenProduct(
		factors
			.filter((f) => !isUnitExponential(f.factor))
			.map((f, k) => (k === 0 ? { ...f, style: 'implicit' as const } : f))
	);
	return modulus !== null && isPositiveConstant(modulus);
}

function isAlgebraicForm(node: MathNode): boolean {
	const terms = flattenSumShallow(node);
	let real = 0;
	let imaginary = 0;
	for (const { term } of terms) {
		const rest = imaginaryProductRest(term);
		if (rest !== undefined) {
			if (rest !== null && !isPlainRealConstant(rest)) return false;
			imaginary++;
		} else if (isPlainRealConstant(term)) {
			// Un quotient restant (`\frac{1}{1+i}`) contient `i` : il n'arrive pas ici
			real++;
		} else {
			return false;
		}
	}
	return real <= 1 && imaginary <= 1 && real + imaginary === terms.length;
}

/**
 * La réponse (arbre déjà débarrassé des parenthèses superflues) est-elle écrite sous
 * la forme complexe demandée ?
 */
export function matchesComplexForm(node: MathNode, form: ComplexForm): boolean {
	const unified = unifyComplexAlgebraicNotationAST(unifyEulerNotationAST(node));
	if (form === 'exponentielle') return isExponentialForm(unified);
	// `-3` (nombre opposé) ou `3` seul : forme algébrique de partie imaginaire nulle
	if (isNumber(unified)) return true;
	return isAlgebraicForm(unified);
}
