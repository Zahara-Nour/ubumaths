/**
 * MathAST Flatten Utilities
 *
 * Provides utilities to flatten addition/subtraction chains into signed terms
 * and multiplication chains into factor lists.
 *
 * Delimiters act as INTANGIBLE boundaries - flattening stops at delimiter nodes.
 */

import type { MathNode, MultiplicationDisplayStyle, RelationNode, RelationType } from './types';
import { add, subtract, multiply, opposite, relation } from './factory';

// =============================================================================
// Types
// =============================================================================

/**
 * Sign for a term in a flattened sum
 */
export type Sign = '+' | '-';

/**
 * A signed term in a flattened sum
 */
export type SignedTerm = {
	readonly sign: Sign;
	readonly term: MathNode;
};

/**
 * A flattened sum as an array of signed terms
 */
export type FlatSum = readonly SignedTerm[];

/**
 * A flattened product as an array of factors
 */
export type FlatProduct = readonly MathNode[];

/**
 * Result of deep sum flattening with nested subLists
 */
export type DeepFlatSumResult = {
	readonly terms: FlatSum;
	readonly subLists: ReadonlyMap<MathNode, DeepFlatSumResult | DeepFlatProductResult>;
};

/**
 * Result of deep product flattening with nested subLists
 */
export type DeepFlatProductResult = {
	readonly factors: FlatProduct;
	readonly subLists: ReadonlyMap<MathNode, DeepFlatSumResult | DeepFlatProductResult>;
};

/**
 * A flattened relation chain as arrays of operands and relations.
 * Invariant: operands.length === relations.length + 1
 *
 * Example: a < b < c -> { operands: [a, b, c], relations: ['<', '<'] }
 */
export type FlatRelationChain = {
	readonly operands: readonly MathNode[];
	readonly relations: readonly RelationType[];
};

// =============================================================================
// Sign Helper
// =============================================================================

/**
 * Flips a sign: '+' becomes '-' and vice versa
 */
export function flipSign(sign: Sign): Sign {
	return sign === '+' ? '-' : '+';
}

// =============================================================================
// Shallow Sum Flattening
// =============================================================================

/**
 * Internal helper to flatten a sum/subtraction chain with a current sign
 *
 * @param node - The node to flatten
 * @param sign - The current sign to apply
 * @returns A flat sum array
 */
function flattenSumShallowInternal(node: MathNode, sign: Sign): FlatSum {
	switch (node.type) {
		case 'addition':
			// Flatten both sides with the current sign
			return [
				...flattenSumShallowInternal(node.left, sign),
				...flattenSumShallowInternal(node.right, sign)
			];

		case 'subtraction':
			// Flatten left with current sign, right with flipped sign
			return [
				...flattenSumShallowInternal(node.left, sign),
				...flattenSumShallowInternal(node.right, flipSign(sign))
			];

		case 'opposite':
			// Flip the sign and continue with the operand
			return flattenSumShallowInternal(node.operand, flipSign(sign));

		case 'positive':
			// Keep the same sign and continue with the operand
			return flattenSumShallowInternal(node.operand, sign);

		case 'delimiter':
			// STOP - delimiter is an intangible boundary
			return [{ sign, term: node }];

		default:
			// All other nodes are atomic terms
			return [{ sign, term: node }];
	}
}

/**
 * Flattens a sum/subtraction chain into an array of signed terms (shallow).
 *
 * Stops at delimiter boundaries (delimiters are intangible).
 *
 * Examples:
 * - `a + b - c` → `[{'+', a}, {'+', b}, {'-', c}]`
 * - `-(a + b)` → `[{'-', delimiter(a + b)}]` (stops at delimiter)
 * - `a - (b + c)` → `[{'+', a}, {'-', delimiter(b + c)}]`
 *
 * @param node - The node to flatten
 * @returns A flat sum array
 */
export function flattenSumShallow(node: MathNode): FlatSum {
	return flattenSumShallowInternal(node, '+');
}

// =============================================================================
// Shallow Product Flattening
// =============================================================================

/**
 * Flattens a multiplication chain into an array of factors (shallow).
 *
 * Stops at delimiter boundaries (delimiters are intangible).
 *
 * Examples:
 * - `a * b * c` → `[a, b, c]`
 * - `a * (b * c)` → `[a, delimiter(b * c)]` (stops at delimiter)
 * - `2 * x * y` → `[2, x, y]`
 *
 * @param node - The node to flatten
 * @returns A flat product array
 */
export function flattenProductShallow(node: MathNode): FlatProduct {
	switch (node.type) {
		case 'multiplication':
			// Recursively flatten both sides and concatenate
			return [...flattenProductShallow(node.left), ...flattenProductShallow(node.right)];

		case 'delimiter':
			// STOP - delimiter is an intangible boundary
			return [node];

		default:
			// All other nodes are atomic factors
			return [node];
	}
}

// =============================================================================
// Deep Sum Flattening
// =============================================================================

/**
 * Flattens a sum/subtraction chain deeply, recursively processing all nested structures.
 *
 * Unlike shallow flattening, this processes the CONTENT of delimiters and other complex nodes.
 * The shallow layer stops at delimiter boundaries, but deep flattening enters them to process
 * their contents.
 *
 * @param node - The node to flatten deeply
 * @returns A deep flat sum result with terms and subLists map
 */
export function flattenSumDeep(node: MathNode): DeepFlatSumResult {
	// Step 1: Get shallow flattened terms (stops at delimiters)
	const terms = flattenSumShallow(node);

	// Step 2: Create subLists map for nested structures
	const subLists = new Map<MathNode, DeepFlatSumResult | DeepFlatProductResult>();

	// Step 3: Process each term's content recursively
	for (const { term } of terms) {
		switch (term.type) {
			case 'delimiter':
				// Delimiter content should be processed deeply
				// The delimiter itself is a boundary for SHALLOW, but its CONTENT needs deep processing
				{
					const contentResult = flattenSumDeep(term.content);
					subLists.set(term, contentResult);
				}
				break;

			case 'multiplication':
				// Multiplication should be flattened as a product
				{
					const productResult = flattenProductDeep(term);
					subLists.set(term, productResult);
				}
				break;

			case 'function':
				// Process function arguments recursively
				// Only add to subLists if there's actual structure to preserve
				for (const arg of term.args) {
					const argResult = flattenSumDeep(arg);
					if (argResult.terms.length > 1 || argResult.subLists.size > 0) {
						subLists.set(arg, argResult);
					}
				}
				// Process power if present
				if (term.power) {
					const powerResult = flattenSumDeep(term.power);
					if (powerResult.terms.length > 1 || powerResult.subLists.size > 0) {
						subLists.set(term.power, powerResult);
					}
				}
				// Process base if present
				if (term.base) {
					const baseResult = flattenSumDeep(term.base);
					if (baseResult.terms.length > 1 || baseResult.subLists.size > 0) {
						subLists.set(term.base, baseResult);
					}
				}
				break;

			case 'division':
				// Process numerator and denominator
				{
					const numResult = flattenSumDeep(term.numerator);
					if (numResult.terms.length > 1 || numResult.subLists.size > 0) {
						subLists.set(term.numerator, numResult);
					}
					const denomResult = flattenSumDeep(term.denominator);
					if (denomResult.terms.length > 1 || denomResult.subLists.size > 0) {
						subLists.set(term.denominator, denomResult);
					}
				}
				break;

			case 'subscript':
				// Process base and subscript
				{
					const baseResult = flattenSumDeep(term.base);
					if (baseResult.terms.length > 1 || baseResult.subLists.size > 0) {
						subLists.set(term.base, baseResult);
					}
					const subResult = flattenSumDeep(term.subscript);
					if (subResult.terms.length > 1 || subResult.subLists.size > 0) {
						subLists.set(term.subscript, subResult);
					}
				}
				break;

			case 'superscript':
				// Process base and superscript
				{
					const baseResult = flattenSumDeep(term.base);
					if (baseResult.terms.length > 1 || baseResult.subLists.size > 0) {
						subLists.set(term.base, baseResult);
					}
					const superResult = flattenSumDeep(term.superscript);
					if (superResult.terms.length > 1 || superResult.subLists.size > 0) {
						subLists.set(term.superscript, superResult);
					}
				}
				break;

			case 'relation':
				// Process left and right sides
				{
					const leftResult = flattenSumDeep(term.left);
					if (leftResult.terms.length > 1 || leftResult.subLists.size > 0) {
						subLists.set(term.left, leftResult);
					}
					const rightResult = flattenSumDeep(term.right);
					if (rightResult.terms.length > 1 || rightResult.subLists.size > 0) {
						subLists.set(term.right, rightResult);
					}
				}
				break;

			case 'composition':
				// Process outer and inner functions
				{
					const outerResult = flattenSumDeep(term.outer);
					if (outerResult.terms.length > 1 || outerResult.subLists.size > 0) {
						subLists.set(term.outer, outerResult);
					}
					const innerResult = flattenSumDeep(term.inner);
					if (innerResult.terms.length > 1 || innerResult.subLists.size > 0) {
						subLists.set(term.inner, innerResult);
					}
				}
				break;

			// Literals have no further processing
			case 'number':
			case 'variable':
			case 'greek':
			case 'symbol':
				// These are atomic literals with no nested structure
				break;

			// Note: addition, subtraction, opposite, positive are NEVER present in terms
			// after flattenSumShallow - they are always flattened away
		}
	}

	return { terms, subLists };
}

// =============================================================================
// Deep Product Flattening
// =============================================================================

/**
 * Flattens a multiplication chain deeply, recursively processing all nested structures.
 *
 * Unlike shallow flattening, this processes the CONTENT of delimiters and other complex nodes.
 * The shallow layer stops at delimiter boundaries, but deep flattening enters them to process
 * their contents.
 *
 * @param node - The node to flatten deeply
 * @returns A deep flat product result with factors and subLists map
 */
export function flattenProductDeep(node: MathNode): DeepFlatProductResult {
	// Step 1: Get shallow flattened factors (stops at delimiters)
	const factors = flattenProductShallow(node);

	// Step 2: Create subLists map for nested structures
	const subLists = new Map<MathNode, DeepFlatSumResult | DeepFlatProductResult>();

	// Step 3: Process each factor's content recursively
	for (const factor of factors) {
		switch (factor.type) {
			case 'delimiter':
				// Delimiter content should be processed deeply
				// Determine if the content is a sum or product
				{
					const content = factor.content;
					if (
						content.type === 'addition' ||
						content.type === 'subtraction' ||
						content.type === 'opposite' ||
						content.type === 'positive'
					) {
						// Content is a sum-like structure
						const sumResult = flattenSumDeep(content);
						subLists.set(factor, sumResult);
					} else if (content.type === 'multiplication') {
						// Content is a product
						const productResult = flattenProductDeep(content);
						subLists.set(factor, productResult);
					} else {
						// For other types, try sum flattening (default)
						const result = flattenSumDeep(content);
						if (result.terms.length > 1 || result.subLists.size > 0) {
							subLists.set(factor, result);
						}
					}
				}
				break;

			case 'addition':
			case 'subtraction':
				// These should be flattened as sums
				{
					const sumResult = flattenSumDeep(factor);
					subLists.set(factor, sumResult);
				}
				break;

			case 'function':
				// Process function arguments recursively
				for (const arg of factor.args) {
					const argResult = flattenSumDeep(arg);
					if (argResult.terms.length > 1 || argResult.subLists.size > 0) {
						subLists.set(arg, argResult);
					}
				}
				// Process power if present
				if (factor.power) {
					const powerResult = flattenSumDeep(factor.power);
					if (powerResult.terms.length > 1 || powerResult.subLists.size > 0) {
						subLists.set(factor.power, powerResult);
					}
				}
				// Process base if present
				if (factor.base) {
					const baseResult = flattenSumDeep(factor.base);
					if (baseResult.terms.length > 1 || baseResult.subLists.size > 0) {
						subLists.set(factor.base, baseResult);
					}
				}
				break;

			case 'division':
				// Process numerator and denominator
				{
					const numResult = flattenSumDeep(factor.numerator);
					if (numResult.terms.length > 1 || numResult.subLists.size > 0) {
						subLists.set(factor.numerator, numResult);
					}
					const denomResult = flattenSumDeep(factor.denominator);
					if (denomResult.terms.length > 1 || denomResult.subLists.size > 0) {
						subLists.set(factor.denominator, denomResult);
					}
				}
				break;

			case 'subscript':
				// Process base and subscript
				{
					const baseResult = flattenSumDeep(factor.base);
					if (baseResult.terms.length > 1 || baseResult.subLists.size > 0) {
						subLists.set(factor.base, baseResult);
					}
					const subResult = flattenSumDeep(factor.subscript);
					if (subResult.terms.length > 1 || subResult.subLists.size > 0) {
						subLists.set(factor.subscript, subResult);
					}
				}
				break;

			case 'superscript':
				// Process base and superscript
				{
					const baseResult = flattenSumDeep(factor.base);
					if (baseResult.terms.length > 1 || baseResult.subLists.size > 0) {
						subLists.set(factor.base, baseResult);
					}
					const superResult = flattenSumDeep(factor.superscript);
					if (superResult.terms.length > 1 || superResult.subLists.size > 0) {
						subLists.set(factor.superscript, superResult);
					}
				}
				break;

			case 'relation':
				// Process left and right sides
				{
					const leftResult = flattenSumDeep(factor.left);
					if (leftResult.terms.length > 1 || leftResult.subLists.size > 0) {
						subLists.set(factor.left, leftResult);
					}
					const rightResult = flattenSumDeep(factor.right);
					if (rightResult.terms.length > 1 || rightResult.subLists.size > 0) {
						subLists.set(factor.right, rightResult);
					}
				}
				break;

			case 'composition':
				// Process outer and inner functions
				{
					const outerResult = flattenSumDeep(factor.outer);
					if (outerResult.terms.length > 1 || outerResult.subLists.size > 0) {
						subLists.set(factor.outer, outerResult);
					}
					const innerResult = flattenSumDeep(factor.inner);
					if (innerResult.terms.length > 1 || innerResult.subLists.size > 0) {
						subLists.set(factor.inner, innerResult);
					}
				}
				break;

			// Literals have no further processing
			case 'number':
			case 'variable':
			case 'greek':
			case 'symbol':
				// These are atomic literals with no nested structure
				break;

			// Note: multiplication is NEVER present in factors after flattenProductShallow
			// Note: opposite/positive could appear as factors (e.g., in `a * (-b)`)
			case 'opposite':
			case 'positive':
				// Unary operators can appear as factors, but have no nested structure to flatten
				break;
		}
	}

	return { factors, subLists };
}

// =============================================================================
// Unflatten Helpers
// =============================================================================

/**
 * Unflattens a flat sum back into a MathNode tree with LEFT associativity.
 *
 * Algorithm:
 * - If empty array, return null
 * - If single term:
 *   - If sign is '+': return the term
 *   - If sign is '-': return opposite(term)
 * - For multiple terms, build left-to-right:
 *   - Start with first term (considering its sign)
 *   - For each subsequent term:
 *     - If sign is '+': result = add(result, term)
 *     - If sign is '-': result = subtract(result, term)
 *
 * Examples:
 * - [{'+', a}, {'-', b}, {'+', c}] → ((a - b) + c)
 * - [{'-', a}] → -a
 * - [] → null
 *
 * @param terms - The flat sum array to unflatten
 * @returns A MathNode tree or null if empty
 */
export function unflattenSum(terms: FlatSum): MathNode | null {
	if (terms.length === 0) {
		return null;
	}

	if (terms.length === 1) {
		const { sign, term } = terms[0];
		return sign === '+' ? term : opposite(term);
	}

	// Multiple terms: build left-to-right
	const { sign: firstSign, term: firstTerm } = terms[0];
	let result: MathNode = firstSign === '+' ? firstTerm : opposite(firstTerm);

	for (let i = 1; i < terms.length; i++) {
		const { sign, term } = terms[i];
		result = sign === '+' ? add(result, term) : subtract(result, term);
	}

	return result;
}

/**
 * Unflattens a flat product back into a MathNode tree with LEFT associativity.
 *
 * Algorithm:
 * - If empty array, return null
 * - If single factor: return the factor
 * - For multiple factors, build left-to-right:
 *   - Start with first factor
 *   - For each subsequent factor: result = multiply(result, factor, style)
 *
 * Examples:
 * - [a, b, c] → ((a * b) * c)
 * - [a] → a
 * - [] → null
 *
 * @param factors - The flat product array to unflatten
 * @param style - The multiplication display style (defaults to 'implicit')
 * @returns A MathNode tree or null if empty
 */
export function unflattenProduct(
	factors: FlatProduct,
	style?: MultiplicationDisplayStyle
): MathNode | null {
	if (factors.length === 0) {
		return null;
	}

	if (factors.length === 1) {
		return factors[0];
	}

	// Multiple factors: build left-to-right
	let result: MathNode = factors[0];
	const displayStyle = style ?? 'implicit';

	for (let i = 1; i < factors.length; i++) {
		result = multiply(result, factors[i], displayStyle);
	}

	return result;
}

// =============================================================================
// Relation Chain Flattening
// =============================================================================

/**
 * Flattens a relation chain into arrays of operands and relations.
 *
 * Relations are nested with LEFT associativity:
 * - `a < b` -> relation('<', a, b)
 * - `a < b < c` -> relation('<', relation('<', a, b), c)
 *
 * This function extracts:
 * - operands: [a, b, c]
 * - relations: ['<', '<']
 *
 * For non-relation nodes, returns a single operand with empty relations.
 *
 * @param node - The node to flatten
 * @returns A FlatRelationChain with operands and relations arrays
 */
export function flattenRelationChain(node: MathNode): FlatRelationChain {
	if (node.type !== 'relation') {
		return { operands: [node], relations: [] };
	}

	// Recursively flatten the left side (where chained relations are nested)
	const leftFlat = flattenRelationChain(node.left);

	return {
		operands: [...leftFlat.operands, node.right],
		relations: [...leftFlat.relations, node.relation]
	};
}

/**
 * Unflattens a flat relation chain back into nested RelationNodes with LEFT associativity.
 *
 * Algorithm:
 * - If less than 2 operands or mismatched lengths, return null
 * - Build left-to-right: ((a < b) < c)
 *
 * Examples:
 * - { operands: [a, b], relations: ['='] } -> relation('=', a, b)
 * - { operands: [a, b, c], relations: ['<', '<'] } -> relation('<', relation('<', a, b), c)
 * - { operands: [a, b, c], relations: ['<=', '<'] } -> relation('<', relation('<=', a, b), c)
 *
 * @param operands - Array of operand nodes (at least 2)
 * @param relations - Array of relation types (length = operands.length - 1)
 * @returns A nested RelationNode or null if invalid input
 */
export function unflattenRelationChain(
	operands: readonly MathNode[],
	relations: readonly RelationType[]
): RelationNode | null {
	// Validate invariants
	if (operands.length < 2) {
		return null;
	}
	if (relations.length !== operands.length - 1) {
		return null;
	}

	// Build with left associativity: ((a op b) op c)
	let result = relation(relations[0], operands[0], operands[1]);

	for (let i = 1; i < relations.length; i++) {
		result = relation(relations[i], result, operands[i + 1]);
	}

	return result;
}
