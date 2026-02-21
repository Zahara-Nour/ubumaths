/**
 * Pattern Matching Algorithm for MathAST
 *
 * Implements the core pattern matching algorithm that matches Pattern objects
 * against MathNode expressions and returns bindings for wildcards.
 */

import type {
	Pattern,
	MatchResult,
	MatchBindings,
	SumPattern,
	ProductPattern,
	SumPatternElement,
	ProductPatternElement,
	SequencePattern,
	OptionalSequencePattern,
	SumSequenceBinding,
	ProductSequenceBinding,
	BindingValue
} from './types';
import {
	successMatch,
	failMatch,
	EMPTY_BINDINGS,
	isSequencePattern,
	isOptionalSequencePattern,
	isAnySequencePattern,
	isMathNodeBinding
} from './types';
import type { MathNode } from '../types';
import type { TypeContext } from '../numtype/types';
import type { SignedTerm } from '../flatten';
import { nodesEqual } from '../normal/hash';
import { checkConstraint } from './constraints';
import { flattenSumShallow, flattenProductShallow } from '../flatten';
import { opposite } from '../factory';
import {
	isAddition,
	isSubtraction,
	isMultiplication,
	isDivision,
	isSuperscript,
	isFunction,
	isOpposite,
	isPositive,
	isDelimiter,
	isSubscript,
	isRelation
} from '../guards';

// Re-export nodesEqual from canonical location
export { nodesEqual } from '../normal/hash';

// =============================================================================
// Binding Utilities
// =============================================================================

/**
 * Checks if two binding values are equal.
 * For MathNodes, uses structural equality.
 * For SequenceBindings, compares the underlying collections.
 */
function bindingsEqual(a: BindingValue, b: BindingValue): boolean {
	// Both must be the same type
	if (isMathNodeBinding(a) && isMathNodeBinding(b)) {
		return nodesEqual(a, b);
	}

	// Both are sequence bindings - compare by kind and content
	if (!isMathNodeBinding(a) && !isMathNodeBinding(b)) {
		if (a.kind !== b.kind) return false;

		if (a.kind === 'sum-sequence' && b.kind === 'sum-sequence') {
			if (a.terms.length !== b.terms.length) return false;
			return a.terms.every((t, i) => {
				const bt = b.terms[i];
				return t.sign === bt.sign && nodesEqual(t.term, bt.term);
			});
		}

		if (a.kind === 'product-sequence' && b.kind === 'product-sequence') {
			if (a.factors.length !== b.factors.length) return false;
			return a.factors.every((f, i) => nodesEqual(f, b.factors[i]));
		}
	}

	return false;
}

/**
 * Merges two binding maps into a new map.
 * Returns undefined if there's a conflict (same key, different values).
 */
function mergeBindings(a: MatchBindings, b: MatchBindings): MatchBindings | undefined {
	const result = new Map(a);

	for (const [key, value] of b) {
		const existing = result.get(key);
		if (existing !== undefined) {
			// Key exists - check for consistency
			if (!bindingsEqual(existing, value)) {
				return undefined; // Conflict
			}
		} else {
			result.set(key, value);
		}
	}

	return result;
}

/**
 * Creates a new binding map with a single entry.
 */
function singleBinding(name: string, value: BindingValue): MatchBindings {
	return new Map([[name, value]]);
}

// =============================================================================
// Main Match Function
// =============================================================================

/**
 * Matches a pattern against a MathNode.
 *
 * @param pattern - The pattern to match
 * @param node - The node to match against
 * @param bindings - Optional existing bindings (for recursive calls)
 * @returns MatchResult with success flag and bindings map
 *
 * @example
 * // Match a wildcard
 * const result = match(P._('x'), someNode);
 * if (result.success) {
 *   const x = result.bindings.get('x');
 * }
 *
 * // Match addition with commutative checking
 * const addPattern = P.add(P._('a'), P._('b'));
 * match(addPattern, additionNode);
 */
export function match(
	pattern: Pattern,
	node: MathNode,
	bindings: MatchBindings = EMPTY_BINDINGS,
	ctx?: TypeContext
): MatchResult {
	switch (pattern.type) {
		case 'wildcard':
			return matchWildcard(pattern, node, bindings, ctx);

		case 'literal':
			return matchLiteral(pattern, node, bindings);

		case 'addition-pattern':
			return matchAddition(pattern, node, bindings, ctx);

		case 'subtraction-pattern':
			return matchSubtraction(pattern, node, bindings, ctx);

		case 'multiplication-pattern':
			return matchMultiplication(pattern, node, bindings, ctx);

		case 'division-pattern':
			return matchDivision(pattern, node, bindings, ctx);

		case 'superscript-pattern':
			return matchSuperscript(pattern, node, bindings, ctx);

		case 'function-pattern':
			return matchFunction(pattern, node, bindings, ctx);

		case 'opposite-pattern':
			return matchOpposite(pattern, node, bindings, ctx);

		case 'positive-pattern':
			return matchPositive(pattern, node, bindings, ctx);

		case 'delimiter-pattern':
			return matchDelimiter(pattern, node, bindings, ctx);

		case 'subscript-pattern':
			return matchSubscript(pattern, node, bindings, ctx);

		case 'relation-pattern':
			return matchRelation(pattern, node, bindings, ctx);

		case 'sum-pattern':
			return matchSumPattern(pattern, node, bindings, ctx);

		case 'product-pattern':
			return matchProductPattern(pattern, node, bindings, ctx);

		default: {
			// Exhaustive check
			const _exhaustive: never = pattern;
			return _exhaustive;
		}
	}
}

// =============================================================================
// Pattern Matching Helpers
// =============================================================================

/**
 * Matches a wildcard pattern.
 * - If no constraint: always matches
 * - If constraint: must satisfy constraint
 * - If already bound: must match existing binding
 */
function matchWildcard(
	pattern: Extract<Pattern, { type: 'wildcard' }>,
	node: MathNode,
	bindings: MatchBindings,
	ctx?: TypeContext
): MatchResult {
	// Check constraint first if present
	if (pattern.constraint && !checkConstraint(pattern.constraint, node, ctx)) {
		return failMatch();
	}

	// Check if already bound
	const existingBinding = bindings.get(pattern.name);
	if (existingBinding !== undefined) {
		// Must match existing binding
		// Regular wildcards should only be bound to MathNodes
		if (!isMathNodeBinding(existingBinding)) {
			return failMatch(); // Conflict: sequence binding vs node
		}
		if (nodesEqual(existingBinding, node)) {
			return successMatch(bindings);
		}
		return failMatch();
	}

	// Create new binding
	const newBindings = mergeBindings(bindings, singleBinding(pattern.name, node));
	if (newBindings === undefined) {
		return failMatch();
	}

	return successMatch(newBindings);
}

/**
 * Matches a literal pattern using structural equality.
 */
function matchLiteral(
	pattern: Extract<Pattern, { type: 'literal' }>,
	node: MathNode,
	bindings: MatchBindings
): MatchResult {
	if (nodesEqual(pattern.node, node)) {
		return successMatch(bindings);
	}
	return failMatch();
}

/**
 * Matches an addition pattern.
 * Addition is commutative - tries both orders.
 */
function matchAddition(
	pattern: Extract<Pattern, { type: 'addition-pattern' }>,
	node: MathNode,
	bindings: MatchBindings,
	ctx?: TypeContext
): MatchResult {
	if (!isAddition(node)) {
		return failMatch();
	}

	// Try original order: left + right
	const result1 = matchPair(pattern.left, pattern.right, node.left, node.right, bindings, ctx);
	if (result1.success) {
		return result1;
	}

	// Try swapped order: right + left (commutative)
	return matchPair(pattern.left, pattern.right, node.right, node.left, bindings, ctx);
}

/**
 * Matches a subtraction pattern.
 * Subtraction is NOT commutative.
 */
function matchSubtraction(
	pattern: Extract<Pattern, { type: 'subtraction-pattern' }>,
	node: MathNode,
	bindings: MatchBindings,
	ctx?: TypeContext
): MatchResult {
	if (!isSubtraction(node)) {
		return failMatch();
	}

	return matchPair(pattern.left, pattern.right, node.left, node.right, bindings, ctx);
}

/**
 * Matches a multiplication pattern.
 * Multiplication is commutative - tries both orders.
 */
function matchMultiplication(
	pattern: Extract<Pattern, { type: 'multiplication-pattern' }>,
	node: MathNode,
	bindings: MatchBindings,
	ctx?: TypeContext
): MatchResult {
	if (!isMultiplication(node)) {
		return failMatch();
	}

	// Try original order
	const result1 = matchPair(pattern.left, pattern.right, node.left, node.right, bindings, ctx);
	if (result1.success) {
		return result1;
	}

	// Try swapped order (commutative)
	return matchPair(pattern.left, pattern.right, node.right, node.left, bindings, ctx);
}

/**
 * Matches a division pattern.
 * Division is NOT commutative.
 */
function matchDivision(
	pattern: Extract<Pattern, { type: 'division-pattern' }>,
	node: MathNode,
	bindings: MatchBindings,
	ctx?: TypeContext
): MatchResult {
	if (!isDivision(node)) {
		return failMatch();
	}

	return matchPair(
		pattern.numerator,
		pattern.denominator,
		node.numerator,
		node.denominator,
		bindings,
		ctx
	);
}

/**
 * Matches a superscript/power pattern.
 */
function matchSuperscript(
	pattern: Extract<Pattern, { type: 'superscript-pattern' }>,
	node: MathNode,
	bindings: MatchBindings,
	ctx?: TypeContext
): MatchResult {
	if (!isSuperscript(node)) {
		return failMatch();
	}

	return matchPair(pattern.base, pattern.exponent, node.base, node.superscript, bindings, ctx);
}

/**
 * Matches a function pattern.
 *
 * Supports optional power matching for expressions like sin²(x).
 * - If pattern has no power: matches functions without power (or ignores power)
 * - If pattern has power: matches only functions with matching power
 */
function matchFunction(
	pattern: Extract<Pattern, { type: 'function-pattern' }>,
	node: MathNode,
	bindings: MatchBindings,
	ctx?: TypeContext
): MatchResult {
	if (!isFunction(node)) {
		return failMatch();
	}

	// Check function name
	if (pattern.name !== node.name) {
		return failMatch();
	}

	// Check power constraint
	if (pattern.power !== undefined) {
		// Pattern requires a power - node must have one
		if (node.power === undefined) {
			return failMatch();
		}
		const powerResult = match(pattern.power, node.power, bindings, ctx);
		if (!powerResult.success) {
			return failMatch();
		}
		bindings = powerResult.bindings;
	} else {
		// Pattern has no power - node must not have one
		if (node.power !== undefined) {
			return failMatch();
		}
	}

	// Check argument count
	if (pattern.args.length !== node.args.length) {
		return failMatch();
	}

	// Match all arguments
	let currentBindings = bindings;
	for (let i = 0; i < pattern.args.length; i++) {
		const result = match(pattern.args[i], node.args[i], currentBindings, ctx);
		if (!result.success) {
			return failMatch();
		}
		currentBindings = result.bindings;
	}

	return successMatch(currentBindings);
}

/**
 * Matches an opposite/negation pattern.
 */
function matchOpposite(
	pattern: Extract<Pattern, { type: 'opposite-pattern' }>,
	node: MathNode,
	bindings: MatchBindings,
	ctx?: TypeContext
): MatchResult {
	if (!isOpposite(node)) {
		return failMatch();
	}

	return match(pattern.operand, node.operand, bindings, ctx);
}

/**
 * Matches a positive sign pattern.
 */
function matchPositive(
	pattern: Extract<Pattern, { type: 'positive-pattern' }>,
	node: MathNode,
	bindings: MatchBindings,
	ctx?: TypeContext
): MatchResult {
	if (!isPositive(node)) {
		return failMatch();
	}

	return match(pattern.operand, node.operand, bindings, ctx);
}

/**
 * Matches a delimiter pattern.
 */
function matchDelimiter(
	pattern: Extract<Pattern, { type: 'delimiter-pattern' }>,
	node: MathNode,
	bindings: MatchBindings,
	ctx?: TypeContext
): MatchResult {
	if (!isDelimiter(node)) {
		return failMatch();
	}

	return match(pattern.content, node.content, bindings, ctx);
}

/**
 * Matches a subscript pattern.
 */
function matchSubscript(
	pattern: Extract<Pattern, { type: 'subscript-pattern' }>,
	node: MathNode,
	bindings: MatchBindings,
	ctx?: TypeContext
): MatchResult {
	if (!isSubscript(node)) {
		return failMatch();
	}

	return matchPair(pattern.base, pattern.subscript, node.base, node.subscript, bindings, ctx);
}

/**
 * Matches a relation pattern.
 */
function matchRelation(
	pattern: Extract<Pattern, { type: 'relation-pattern' }>,
	node: MathNode,
	bindings: MatchBindings,
	ctx?: TypeContext
): MatchResult {
	if (!isRelation(node)) {
		return failMatch();
	}

	// Check relation type (unless 'any')
	if (pattern.relation !== 'any' && pattern.relation !== node.relation) {
		return failMatch();
	}

	return matchPair(pattern.left, pattern.right, node.left, node.right, bindings, ctx);
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Matches a pair of patterns against a pair of nodes.
 * Useful for binary operations.
 */
function matchPair(
	patternLeft: Pattern,
	patternRight: Pattern,
	nodeLeft: MathNode,
	nodeRight: MathNode,
	bindings: MatchBindings,
	ctx?: TypeContext
): MatchResult {
	// Match left first
	const leftResult = match(patternLeft, nodeLeft, bindings, ctx);
	if (!leftResult.success) {
		return failMatch();
	}

	// Match right with updated bindings
	return match(patternRight, nodeRight, leftResult.bindings, ctx);
}

// =============================================================================
// N-ary Pattern Matching
// =============================================================================

/**
 * Generates all k-combinations of indices from an array
 *
 * @param arr - Array to select from
 * @param k - Number of elements to select
 * @yields Arrays of k indices
 */
function* combinations<T>(arr: readonly T[], k: number): Generator<T[]> {
	if (k === 0) {
		yield [];
		return;
	}
	if (arr.length < k) return;

	const [first, ...rest] = arr;
	// Include first
	for (const combo of combinations(rest, k - 1)) {
		yield [first, ...combo];
	}
	// Exclude first
	yield* combinations(rest, k);
}

/**
 * Generates all permutations of an array
 *
 * @param arr - Array to permute
 * @yields All permutations
 */
function* permutations<T>(arr: readonly T[]): Generator<T[]> {
	if (arr.length <= 1) {
		yield [...arr];
		return;
	}

	for (let i = 0; i < arr.length; i++) {
		const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
		for (const perm of permutations(rest)) {
			yield [arr[i], ...perm];
		}
	}
}

/**
 * Categorizes pattern elements into single patterns and sequence pattern
 *
 * @param elements - Array of pattern elements
 * @returns Object with singles array and optional sequence pattern
 * @throws Error if more than one sequence pattern is found
 */
function categorizeElements(elements: readonly (SumPatternElement | ProductPatternElement)[]): {
	singles: Pattern[];
	sequence: SequencePattern | OptionalSequencePattern | undefined;
} {
	const singles: Pattern[] = [];
	let sequence: SequencePattern | OptionalSequencePattern | undefined;

	for (const elem of elements) {
		if (isAnySequencePattern(elem)) {
			if (sequence !== undefined) {
				throw new Error('Only one sequence pattern allowed per sum/product pattern');
			}
			sequence = elem;
		} else {
			singles.push(elem);
		}
	}

	return { singles, sequence };
}

/**
 * Matches a SumPattern against a MathNode
 *
 * Algorithm:
 * 1. Flatten the node into signed terms
 * 2. Separate pattern elements into single patterns and optional sequence
 * 3. Try all possible assignments of terms to single patterns (commutative)
 * 4. Remaining terms go to sequence if present
 */
function matchSumPattern(
	pattern: SumPattern,
	node: MathNode,
	bindings: MatchBindings,
	ctx?: TypeContext
): MatchResult {
	// Only match addition/subtraction chains (or single terms for edge cases)
	if (!isAddition(node) && !isSubtraction(node) && !isOpposite(node) && !isPositive(node)) {
		// Single term - can only match if pattern has exactly one single element and no required sequence
		const { singles, sequence } = categorizeElements(pattern.elements);
		if (singles.length === 1 && (!sequence || isOptionalSequencePattern(sequence))) {
			// Try matching the single element
			const result = match(singles[0], node, bindings, ctx);
			if (result.success && sequence) {
				// Bind empty sequence
				const seqBinding: SumSequenceBinding = { kind: 'sum-sequence', terms: [] };
				const newBindings = mergeBindings(
					result.bindings,
					singleBinding(sequence.name, seqBinding)
				);
				if (newBindings) {
					return successMatch(newBindings);
				}
			}
			return result;
		}
		return failMatch();
	}

	// Flatten the sum
	const flatTerms = flattenSumShallow(node);

	// Categorize pattern elements
	const { singles, sequence } = categorizeElements(pattern.elements);

	const n = flatTerms.length;
	const k = singles.length;
	const minSeq = sequence ? (isSequencePattern(sequence) ? 1 : 0) : 0;

	// Check we have enough terms
	if (n < k + minSeq) {
		return failMatch();
	}

	// If no sequence, need exact count
	if (!sequence && n !== k) {
		return failMatch();
	}

	// Try all ways to assign k terms to the single patterns
	const indices = Array.from({ length: n }, (_, i) => i);

	for (const assignment of combinations(indices, k)) {
		// Try all orderings of the assignment to patterns (due to commutativity)
		for (const perm of permutations(assignment)) {
			const result = tryAssignment(flatTerms, singles, perm, sequence, bindings, ctx);
			if (result.success) {
				return result;
			}
		}
	}

	return failMatch();
}

/**
 * Tries a specific assignment of terms to patterns
 */
function tryAssignment(
	terms: readonly SignedTerm[],
	patterns: readonly Pattern[],
	assignment: readonly number[],
	seqPattern: SequencePattern | OptionalSequencePattern | undefined,
	bindings: MatchBindings,
	ctx?: TypeContext
): MatchResult {
	let currentBindings = bindings;

	// Match each pattern to its assigned term
	for (let i = 0; i < patterns.length; i++) {
		const termIdx = assignment[i];
		const { sign, term } = terms[termIdx];

		// For matching, we need to consider the sign
		// If sign is '-', we match against opposite(term)
		const nodeToMatch = sign === '+' ? term : opposite(term);

		const result = match(patterns[i], nodeToMatch, currentBindings, ctx);
		if (!result.success) {
			return failMatch();
		}
		currentBindings = result.bindings;
	}

	// Collect remaining terms for sequence
	if (seqPattern) {
		const usedSet = new Set(assignment);
		const remaining = terms.filter((_, i) => !usedSet.has(i));

		// Check sequence constraint on each element
		if (seqPattern.constraint) {
			const allSatisfy = remaining.every((t) =>
				checkConstraint(seqPattern.constraint!, t.term, ctx)
			);
			if (!allSatisfy) {
				return failMatch();
			}
		}

		const seqBinding: SumSequenceBinding = { kind: 'sum-sequence', terms: remaining };
		const newBindings = mergeBindings(currentBindings, singleBinding(seqPattern.name, seqBinding));
		if (!newBindings) {
			return failMatch();
		}
		currentBindings = newBindings;
	}

	return successMatch(currentBindings);
}

/**
 * Matches a ProductPattern against a MathNode
 *
 * Similar to matchSumPattern but for multiplication chains.
 */
function matchProductPattern(
	pattern: ProductPattern,
	node: MathNode,
	bindings: MatchBindings,
	ctx?: TypeContext
): MatchResult {
	// Only match multiplication chains
	if (!isMultiplication(node)) {
		// Single factor - can only match if pattern has exactly one single element
		const { singles, sequence } = categorizeElements(pattern.elements);
		if (singles.length === 1 && (!sequence || isOptionalSequencePattern(sequence))) {
			const result = match(singles[0], node, bindings, ctx);
			if (result.success && sequence) {
				// Bind empty sequence
				const seqBinding: ProductSequenceBinding = { kind: 'product-sequence', factors: [] };
				const newBindings = mergeBindings(
					result.bindings,
					singleBinding(sequence.name, seqBinding)
				);
				if (newBindings) {
					return successMatch(newBindings);
				}
			}
			return result;
		}
		return failMatch();
	}

	// Flatten the product
	const flatFactors = flattenProductShallow(node);

	// Categorize pattern elements
	const { singles, sequence } = categorizeElements(pattern.elements);

	const n = flatFactors.length;
	const k = singles.length;
	const minSeq = sequence ? (isSequencePattern(sequence) ? 1 : 0) : 0;

	// Check we have enough factors
	if (n < k + minSeq) {
		return failMatch();
	}

	// If no sequence, need exact count
	if (!sequence && n !== k) {
		return failMatch();
	}

	// Try all ways to assign k factors to the single patterns
	const indices = Array.from({ length: n }, (_, i) => i);

	for (const assignment of combinations(indices, k)) {
		// Try all orderings due to commutativity
		for (const perm of permutations(assignment)) {
			const result = tryProductAssignment(flatFactors, singles, perm, sequence, bindings, ctx);
			if (result.success) {
				return result;
			}
		}
	}

	return failMatch();
}

/**
 * Tries a specific assignment of factors to patterns
 */
function tryProductAssignment(
	factors: ReturnType<typeof flattenProductShallow>,
	patterns: readonly Pattern[],
	assignment: readonly number[],
	seqPattern: SequencePattern | OptionalSequencePattern | undefined,
	bindings: MatchBindings,
	ctx?: TypeContext
): MatchResult {
	let currentBindings = bindings;

	// Match each pattern to its assigned factor
	for (let i = 0; i < patterns.length; i++) {
		const factorIdx = assignment[i];
		const { factor } = factors[factorIdx];

		const result = match(patterns[i], factor, currentBindings, ctx);
		if (!result.success) {
			return failMatch();
		}
		currentBindings = result.bindings;
	}

	// Collect remaining factors for sequence
	if (seqPattern) {
		const usedSet = new Set(assignment);
		const remaining = factors.filter((_, i) => !usedSet.has(i)).map((sf) => sf.factor);

		// Check sequence constraint on each element
		if (seqPattern.constraint) {
			const allSatisfy = remaining.every((f) => checkConstraint(seqPattern.constraint!, f, ctx));
			if (!allSatisfy) {
				return failMatch();
			}
		}

		const seqBinding: ProductSequenceBinding = { kind: 'product-sequence', factors: remaining };
		const newBindings = mergeBindings(currentBindings, singleBinding(seqPattern.name, seqBinding));
		if (!newBindings) {
			return failMatch();
		}
		currentBindings = newBindings;
	}

	return successMatch(currentBindings);
}

// =============================================================================
// Advanced Matching Utilities
// =============================================================================

/**
 * Attempts to match a pattern and returns the bindings if successful,
 * or undefined if the match fails.
 *
 * @param pattern - The pattern to match
 * @param node - The node to match against
 * @returns The bindings map if successful, undefined otherwise
 */
export function tryMatch(
	pattern: Pattern,
	node: MathNode,
	ctx?: TypeContext
): MatchBindings | undefined {
	const result = match(pattern, node, EMPTY_BINDINGS, ctx);
	return result.success ? result.bindings : undefined;
}

/**
 * Checks if a pattern matches a node without returning bindings.
 *
 * @param pattern - The pattern to match
 * @param node - The node to match against
 * @param ctx - Optional type context for assumption-aware matching
 * @returns true if the pattern matches
 */
export function matches(pattern: Pattern, node: MathNode, ctx?: TypeContext): boolean {
	return match(pattern, node, EMPTY_BINDINGS, ctx).success;
}
