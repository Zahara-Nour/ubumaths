/**
 * Required Form Validator
 *
 * Validates that student answers match a required structural form
 * (product, sum, fraction, power, or custom pattern).
 *
 * The validation is purely structural - it doesn't check mathematical
 * correctness. If the value is correct but form is wrong → bad_form (0 points).
 *
 * @module questions/required-form-validator
 */

import type { MathNode } from '$lib/mathAST/types';
import type { RequiredForm } from './types';
import {
	parseLatex,
	isMultiplication,
	isAddition,
	isDivision,
	isSuperscript,
	isNumber,
	isOpposite,
	isSubtraction,
	add,
	opposite,
	multiply,
	divide,
	number,
	mapNodeTopDown,
	flattenProductShallow,
	stripUnnecessaryBrackets,
	mapNode
} from '$lib/mathAST';
import { P } from '$lib/mathAST/pattern/builder';
import { matches, tryMatch } from '$lib/mathAST/pattern/match';
import { isMathNodeBinding } from '$lib/mathAST/pattern/types';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Feedback messages for required form violations (French)
 */
export const REQUIRED_FORM_FEEDBACK = {
	product: 'La réponse doit être écrite sous forme de produit.',
	sum: 'La réponse doit être écrite sous forme de somme.',
	additionOnly: 'La réponse doit être une addition, sans soustraction.',
	fraction: 'La réponse doit être écrite sous forme de fraction.',
	power: 'La réponse doit être écrite sous forme de puissance.',
	pattern: 'La réponse ne respecte pas la forme demandée.',
	acceptable: 'La réponse est juste, mais pas écrite sous la forme demandée.'
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Checks if a factor is "trivial" (1 or -1), making the product form invalid.
 *
 * A product like 1×7 is not considered a valid "product form" because
 * it's mathematically equivalent to just 7.
 *
 * @param factor - A factor from a flattened product
 * @returns true if the factor is 1 or -1
 */
function isTrivialFactor(factor: MathNode): boolean {
	// Direct 1
	if (isNumber(factor) && factor.value === '1') {
		return true;
	}

	// -1 as opposite of 1
	if (isOpposite(factor) && isNumber(factor.operand) && factor.operand.value === '1') {
		return true;
	}

	return false;
}

/**
 * Checks if a node represents a valid product form.
 *
 * A valid product must:
 * - Be a multiplication node at the top level
 * - Have at least 2 factors when flattened
 * - Not contain trivial factors (1 or -1)
 *
 * @param node - The MathAST node to check
 * @returns true if the node is a valid product form
 */
function isValidProduct(node: MathNode): boolean {
	if (!isMultiplication(node)) {
		return false;
	}

	const factors = flattenProductShallow(node);

	// Must have at least 2 factors
	if (factors.length < 2) {
		return false;
	}

	// No trivial factors allowed (1 or -1)
	for (const { factor } of factors) {
		if (isTrivialFactor(factor)) {
			return false;
		}
	}

	return true;
}

/**
 * Checks if a node represents a valid sum form.
 *
 * A valid sum must be an addition node at the top level.
 * Note: subtraction (a - b) is NOT considered a sum form.
 *
 * @param node - The MathAST node to check
 * @returns true if the node is a valid sum form
 */
function isValidSum(node: MathNode): boolean {
	return isAddition(node);
}

/**
 * Somme « sans soustraction » : addition au sommet, et aucun maillon de la
 * chaîne d'additions n'est une soustraction. On ne descend pas dans les
 * parenthèses : 2+(-9) est accepté, 2-12+3 et 5+(-3)-2 sont refusés.
 */
function isValidAdditionOnly(node: MathNode): boolean {
	if (!isAddition(node)) return false;
	const chain: MathNode[] = [node];
	while (chain.length > 0) {
		const current = chain.pop()!;
		if (current.type === 'subtraction') return false;
		if (isAddition(current)) chain.push(current.left, current.right);
	}
	return true;
}

/**
 * Checks if a node represents a valid fraction form.
 *
 * A valid fraction is any division node.
 *
 * @param node - The MathAST node to check
 * @returns true if the node is a valid fraction form
 */
function isValidFraction(node: MathNode): boolean {
	return isDivision(node);
}

/**
 * Checks if a node represents a valid power form.
 *
 * A valid power is any superscript node (a^b).
 *
 * @param node - The MathAST node to check
 * @returns true if the node is a valid power form
 */
function isValidPower(node: MathNode): boolean {
	return isSuperscript(node);
}

/**
 * Checks if a node matches a predefined form type.
 *
 * @param node - The MathAST node to check
 * @param formType - The predefined form type
 * @returns true if the node matches the form
 */
function matchesPredefinedForm(
	node: MathNode,
	formType: Exclude<RequiredForm, { pattern: string }>
): boolean {
	switch (formType) {
		case 'product':
			return isValidProduct(node);
		case 'sum':
			return isValidSum(node);
		case 'additionOnly':
			return isValidAdditionOnly(node);
		case 'fraction':
			return isValidFraction(node);
		case 'power':
			return isValidPower(node);
	}
}

/**
 * Parenthèses de regroupement retirées : la structure de l'arbre porte déjà le groupement.
 * `(9+2):4` et `\\frac{9+2}{4}` ont alors la même forme (la fraction n'a pas de parenthèses).
 * Les autres délimiteurs (valeur absolue…) sont gardés.
 */
function withoutGroupingParentheses(node: MathNode): MathNode {
	return mapNode(node, (n) =>
		n.type === 'delimiter' && n.delimiters === 'parentheses' && groupsAnOperation(n.content)
			? n.content
			: n
	);
}

/**
 * Parenthèses qui groupent une opération (`(9+2)`) : seulement du groupement. Celles d'un
 * nombre négatif (`0+(-15)`) portent un sens (addition de l'opposé ≠ soustraction) : gardées.
 */
function groupsAnOperation(content: MathNode): boolean {
	return ['addition', 'subtraction', 'multiplication', 'division', 'superscript'].includes(
		content.type
	);
}

/** Même chose dans un motif : `(a + b) / c` ; une séquence (`(__reste)`) garde ses parenthèses */
function patternWithoutParentheses(pattern: unknown): unknown {
	if (Array.isArray(pattern)) return pattern.map(patternWithoutParentheses);
	if (!pattern || typeof pattern !== 'object') return pattern;
	const node = pattern as Record<string, unknown>;
	if (node.type === 'delimiter-pattern') {
		const content = node.content as { type?: string } | undefined;
		const operation =
			/^(addition|subtraction|multiplication|division|superscript|sum|product)-pattern$/;
		if (content && operation.test(String(content.type))) {
			return patternWithoutParentheses(content);
		}
	}
	return Object.fromEntries(
		Object.entries(node).map(([key, value]) => [key, patternWithoutParentheses(value)])
	);
}

/**
 * Somme de 3 termes ou plus : motif « somme » (ordre indifférent). Lu `(5 + 8/10) + 1/100`,
 * le motif `5 + 8/10 + 1/100` n'essayait que les permutations d'un même niveau
 * (`\\frac{1}{100}+5+\\frac{8}{10}` refusé). Une somme de 2 termes l'est déjà.
 */
function asUnorderedSums(pattern: unknown): unknown {
	if (Array.isArray(pattern)) return pattern.map(asUnorderedSums);
	if (!pattern || typeof pattern !== 'object') return pattern;
	const node = pattern as Record<string, unknown>;
	if (node.type === 'addition-pattern') {
		const terms: unknown[] = [];
		const collect = (term: unknown) => {
			const t = term as Record<string, unknown>;
			if (t?.type === 'addition-pattern') {
				collect(t.left);
				collect(t.right);
			} else terms.push(asUnorderedSums(term));
		};
		collect(node);
		if (terms.length >= 3) return { type: 'sum-pattern', elements: terms };
	}
	return Object.fromEntries(
		Object.entries(node).map(([key, value]) => [key, asUnorderedSums(value)])
	);
}

/**
 * Opposé d'un terme, rangé comme le parseur range `-3y` (`(−3)·y`) : dans un produit, le
 * signe va sur le premier facteur. Sinon `a − 3y` donnerait `a + (−(3y))`, que le motif
 * `u*T` ne verrait pas.
 */
function negatedTerm(term: MathNode): MathNode {
	if (isMultiplication(term)) return { ...term, left: negatedTerm(term.left) };
	return opposite(term);
}

/**
 * Soustraction lue comme somme signée : `a − b` → `a + (−b)`, à tous les niveaux.
 * Côté motif, rien à faire : un `u - v` apparie déjà `a + (−b)` et `(−b) + a` (match.ts).
 */
function asSignedSums(node: MathNode): MathNode {
	return mapNode(node, (n) => (isSubtraction(n) ? add(n.left, negatedTerm(n.right)) : n));
}

/** Nombre écrit, éventuellement signé, non nul : `3`, `−3`, `1.5` */
function isSignedNonZeroNumber(node: MathNode): boolean {
	return isNonZeroNumber(isOpposite(node) ? node.operand : node);
}

/**
 * Coefficient écrit SOUS la fraction (décision de David) : `\\frac{c·T}{d}` → `\\frac{c}{d}·T`,
 * `\\frac{T}{d}` → `\\frac{1}{d}·T`, `\\frac{−T}{d}` → `(−\\frac{1}{d})·T`. c et d sont des
 * nombres écrits (d ≠ 0) ; un numérateur purement numérique (`\\frac{9}{3}`) n'est pas touché.
 */
function coefficientOutOfFraction(node: MathNode): MathNode | undefined {
	if (!isDivision(node) || !isNonZeroNumber(node.denominator)) return undefined;
	const { numerator, denominator } = node;
	if (isNumber(numerator) || isSignedNonZeroNumber(numerator)) return undefined;
	const over = (c: MathNode): MathNode => divide(c, denominator, 'fraction');
	const signedOver = (c: MathNode): MathNode =>
		isOpposite(c) ? opposite(over(c.operand)) : over(c);
	// Réservé à la forme canonique : la partie non numérique est une PUISSANCE (`(…)^k`) ;
	// `\\frac{x}{2}`, `\\frac{3x}{4}`, `\\frac{x+4}{2}` ne sont pas réécrits (resserrement #490)
	if (isMultiplication(numerator) && isSignedNonZeroNumber(numerator.left)) {
		const c = isOpposite(numerator.left) ? numerator.left.operand : numerator.left;
		// Coefficient 1 écrit (`\\frac{1(x+2)^2}{2}`) : pas une forme réduite
		if (isNumber(c) && Number(c.value) === 1) return undefined;
		if (!isSuperscript(numerator.right)) return undefined;
		return multiply(signedOver(numerator.left), numerator.right, 'implicit');
	}
	if (isOpposite(numerator)) {
		if (!isSuperscript(numerator.operand)) return undefined;
		return multiply(opposite(over(number('1'))), numerator.operand, 'implicit');
	}
	if (!isSuperscript(numerator)) return undefined;
	return multiply(over(number('1')), numerator, 'implicit');
}

/** Tous les termes `\\frac{c·T}{d}` (et leurs opposés) réécrits `\\frac{c}{d}·T` */
function withCoefficientsOutOfFractions(node: MathNode): MathNode {
	return mapNodeTopDown(node, (n) => {
		if (isOpposite(n)) {
			const rewritten = coefficientOutOfFraction(n.operand);
			return rewritten ? negatedTerm(rewritten) : n;
		}
		return coefficientOutOfFraction(n) ?? n;
	});
}

/** Nombre d'apparitions de chaque joker dans le motif */
function wildcardCounts(pattern: unknown, counts = new Map<string, number>()): Map<string, number> {
	if (Array.isArray(pattern)) pattern.forEach((p) => wildcardCounts(p, counts));
	else if (pattern && typeof pattern === 'object') {
		const node = pattern as Record<string, unknown>;
		if (node.type === 'wildcard') {
			const name = String(node.name);
			counts.set(name, (counts.get(name) ?? 0) + 1);
		}
		Object.values(node).forEach((value) => wildcardCounts(value, counts));
	}
	return counts;
}

/** Le motif contient-il une séquence (`__reste`) ? Alors pas de forme implicite. */
function hasSequence(pattern: unknown): boolean {
	if (Array.isArray(pattern)) return pattern.some(hasSequence);
	if (!pattern || typeof pattern !== 'object') return false;
	const node = pattern as Record<string, unknown>;
	if (node.type === 'sequence' || node.type === 'optional-sequence') return true;
	return Object.values(node).some(hasSequence);
}

/** Le motif fixe-t-il au moins un élément (`$x`, `2`…) ? `(a + b)` seul, non : il prendrait toute somme. */
function hasLiteral(pattern: unknown): boolean {
	if (Array.isArray(pattern)) return pattern.some(hasLiteral);
	if (!pattern || typeof pattern !== 'object') return false;
	const node = pattern as Record<string, unknown>;
	if (node.type === 'literal') return true;
	return Object.values(node).some(hasLiteral);
}

const MAX_IMPLICIT_VARIANTS = 64;

/** Entier ou décimal non nul (le zéro ajouté, `(x+0)^2`, n'est pas une forme réduite) */
function isNonZeroNumber(node: MathNode): boolean {
	return isNumber(node) && Number(node.value.replace(',', '.')) !== 0;
}

/**
 * Nombre simple : entier, décimal ou fraction de deux entiers, avec un signe éventuel.
 * Pas de `x`, pas de calcul non effectué, pas de `(-3)` entre parenthèses.
 */
function isSimpleNumber(node: MathNode): boolean {
	const unsigned = isOpposite(node) ? node.operand : node;
	if (isNonZeroNumber(unsigned)) return true;
	if (!isDivision(unsigned)) return false;
	// Fraction IRRÉDUCTIBLE d'entiers, dénominateur ≥ 2 : ni `\\frac{2}{2}`, ni `\\frac{1}{1}`,
	// ni `\\frac{1}{0.5}` (resserrement #490)
	const p = integerValue(unsigned.numerator);
	const q = integerValue(unsigned.denominator);
	return p !== undefined && q !== undefined && p >= 1 && q >= 2 && gcd(p, q) === 1;
}

/** Valeur d'un nombre écrit entier (`3`), sinon undefined (`2.5`, `x`, `−3`) */
function integerValue(node: MathNode): number | undefined {
	if (!isNumber(node)) return undefined;
	const value = Number(node.value);
	return Number.isInteger(value) ? value : undefined;
}

function gcd(a: number, b: number): number {
	return b === 0 ? a : gcd(b, a % b);
}

/**
 * Élément neutre implicite : dans `u*T`, un joker libre (sans contrainte, écrit une seule
 * fois) peut valoir 1 (`T`) ou −1 (`−T`) ; dans `T + w`, il peut valoir 0 (`T`). Seulement
 * devant une STRUCTURE `T` (opération sans séquence, avec au moins un élément fixé) :
 * `u*v`, `u*7`, `k*(__reste)` ou `(a + b)*c` n'acceptent pas n'importe quoi seul.
 */
function withImplicitNeutrals(pattern: unknown): unknown[] {
	const counts = wildcardCounts(pattern);
	const isFree = (p: unknown): boolean => {
		const node = p as Record<string, unknown>;
		return (
			node?.type === 'wildcard' &&
			node.constraint === undefined &&
			counts.get(String(node.name)) === 1
		);
	};
	const isStructure = (p: unknown): boolean =>
		!['wildcard', 'literal'].includes(String((p as Record<string, unknown>)?.type)) &&
		!hasSequence(p) &&
		hasLiteral(p);

	const variants = (p: unknown): unknown[] => {
		if (Array.isArray(p)) {
			return p.reduce<unknown[][]>(
				(acc, item) =>
					acc
						.flatMap((prefix) => variants(item).map((v) => [...prefix, v]))
						.slice(0, MAX_IMPLICIT_VARIANTS),
				[[]]
			);
		}
		if (!p || typeof p !== 'object') return [p];
		const node = p as Record<string, unknown>;
		const product = node.type === 'multiplication-pattern';
		if (product || node.type === 'addition-pattern') {
			for (const [free, other] of [
				[node.left, node.right],
				[node.right, node.left]
			]) {
				if (isFree(free) && isStructure(other)) {
					return variants(other).flatMap((t) => {
						const rebuilt = free === node.left ? { ...node, right: t } : { ...node, left: t };
						return product ? [rebuilt, t, { type: 'opposite-pattern', operand: t }] : [rebuilt, t];
					});
				}
			}
		}
		// Autres nœuds : produit cartésien des variantes de chaque enfant
		let results: Record<string, unknown>[] = [{}];
		for (const [key, value] of Object.entries(node)) {
			const childVariants = variants(value);
			results = results
				.flatMap((r) => childVariants.map((v) => ({ ...r, [key]: v })))
				.slice(0, MAX_IMPLICIT_VARIANTS);
		}
		return results;
	};
	return variants(pattern).slice(0, MAX_IMPLICIT_VARIANTS);
}

/**
 * Checks if a node matches a custom pattern.
 *
 * Uses the pattern matching system from mathAST.
 *
 * @param node - The MathAST node to check
 * @param patternStr - The pattern string (e.g., 'a:integer * b:integer')
 * @returns true if the node matches the pattern
 */
function matchesCustomPattern(node: MathNode, patternStr: string): boolean {
	try {
		const pattern = asUnorderedSums(P.parse(patternStr)) as ReturnType<typeof P.parse>;
		// Tel qu'écrit, OU sans parenthèses de regroupement : rien de ce qui était reconnu
		// ne cesse de l'être (`(a)^2`, `k*(__reste)`), et `(9+2):4` ≡ `\\frac{9+2}{4}` s'ajoute
		const loose = patternWithoutParentheses(pattern) as typeof pattern;
		if (matches(pattern, node)) return true;
		const looseNode = withoutGroupingParentheses(node);
		if (matches(loose, looseNode)) return true;
		// Puis en dernier recours (#609) : soustractions lues comme sommes signées, et éléments
		// neutres implicites (u = ±1, w = 0). Seulement ajouté : rien de reconnu ne cesse de l'être.
		// Chaque joker doit alors valoir un nombre simple : sinon `2(x+1)^2-3(x+1)^2` ou
		// `(x+1)^2-2\\times3` passeraient (calcul non effectué, relecture #489).
		const signedNode = withCoefficientsOutOfFractions(asSignedSums(looseNode));
		return withImplicitNeutrals(loose).some((variant) => {
			const bindings = tryMatch(variant as typeof pattern, signedNode);
			return (
				bindings !== undefined &&
				[...bindings.values()].every((value) => isMathNodeBinding(value) && isSimpleNumber(value))
			);
		});
	} catch {
		// Invalid pattern - treat as no match
		return false;
	}
}

/**
 * Checks if a single answer matches the required form.
 *
 * @param node - The parsed MathAST node (with unnecessary brackets stripped)
 * @param requiredForm - The required form specification
 * @returns true if the answer matches the required form
 */
function matchesRequiredForm(node: MathNode, requiredForm: RequiredForm): boolean {
	if (typeof requiredForm === 'string') {
		return matchesPredefinedForm(node, requiredForm);
	} else {
		return matchesCustomPattern(node, requiredForm.pattern);
	}
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Checks if student answers match the required structural form.
 *
 * Returns the indices of answers that violate the required form.
 * Empty array means all answers match.
 *
 * @param answersLatex - Array of LaTeX strings (student answers)
 * @param requiredForm - The required form specification
 * @returns Array of indices where the form is violated
 *
 * @example
 * // Check if answer is a product
 * checkRequiredForm(['2 \\times 3'], 'product')
 * // => [] (valid)
 *
 * checkRequiredForm(['1 \\times 7'], 'product')
 * // => [0] (invalid - trivial factor)
 *
 * checkRequiredForm(['6'], 'product')
 * // => [0] (invalid - not a product)
 *
 * @example
 * // Check custom pattern
 * checkRequiredForm(['2 \\times 3'], { pattern: 'a:integer * b:integer' })
 * // => [] (valid)
 */
export function checkRequiredForm(answersLatex: string[], requiredForm: RequiredForm): number[] {
	const violations: number[] = [];

	for (let i = 0; i < answersLatex.length; i++) {
		const latex = answersLatex[i];

		try {
			// Parse the LaTeX
			const node = parseLatex(latex);

			// Strip unnecessary brackets before checking form
			// This ensures (2×3) is treated the same as 2×3
			const strippedNode = stripUnnecessaryBrackets(node);

			// Check if the form matches
			if (!matchesRequiredForm(strippedNode, requiredForm)) {
				violations.push(i);
			}
		} catch {
			// Parse error - consider as form violation
			violations.push(i);
		}
	}

	return violations;
}

/** Verdict de forme d'UNE réponse : respectée, seulement acceptable (perfectible), ou non */
export type RequiredFormVerdict = 'ok' | 'acceptable' | 'violated';

/**
 * La forme exigée, puis le motif `acceptable` s'il existe : `(z-7)(z-7)` pour un carré
 * `(u-v)^2` est juste mais pas sous la forme demandée → perfectible, pas refusé.
 */
export function requiredFormVerdict(
	answerLatex: string,
	requiredForm: RequiredForm
): RequiredFormVerdict {
	if (checkRequiredForm([answerLatex], requiredForm).length === 0) return 'ok';
	if (typeof requiredForm !== 'string' && requiredForm.acceptable !== undefined) {
		const acceptable = { pattern: requiredForm.acceptable };
		if (checkRequiredForm([answerLatex], acceptable).length === 0) return 'acceptable';
	}
	return 'violated';
}

/**
 * Gets the appropriate feedback message for a required form violation.
 *
 * @param requiredForm - The required form specification
 * @param isMultiple - Whether there are multiple answers
 * @returns The feedback message in French
 */
export function getRequiredFormFeedback(requiredForm: RequiredForm, _isMultiple: boolean): string {
	if (typeof requiredForm === 'string') {
		return REQUIRED_FORM_FEEDBACK[requiredForm];
	} else {
		return REQUIRED_FORM_FEEDBACK.pattern;
	}
}
