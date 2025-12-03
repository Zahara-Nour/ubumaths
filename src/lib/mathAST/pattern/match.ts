/**
 * Pattern Matching Algorithm for MathAST
 *
 * Implements the core pattern matching algorithm that matches Pattern objects
 * against MathNode expressions and returns bindings for wildcards.
 */

import type { Pattern, MatchResult, MatchBindings } from './types';
import { successMatch, failMatch, EMPTY_BINDINGS } from './types';
import type { MathNode } from '../types';
import { hashMathNode } from '../normal/hash';
import { checkConstraint } from './constraints';
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

// =============================================================================
// Structural Equality
// =============================================================================

/**
 * Checks if two MathNodes are structurally equal.
 * Uses hashMathNode for comparison.
 *
 * @param a - First node
 * @param b - Second node
 * @returns true if the nodes have identical structure
 */
export function nodesEqual(a: MathNode, b: MathNode): boolean {
	return hashMathNode(a) === hashMathNode(b);
}

// =============================================================================
// Binding Utilities
// =============================================================================

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
			if (!nodesEqual(existing, value)) {
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
function singleBinding(name: string, node: MathNode): MatchBindings {
	return new Map([[name, node]]);
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
	bindings: MatchBindings = EMPTY_BINDINGS
): MatchResult {
	switch (pattern.type) {
		case 'wildcard':
			return matchWildcard(pattern, node, bindings);

		case 'literal':
			return matchLiteral(pattern, node, bindings);

		case 'addition-pattern':
			return matchAddition(pattern, node, bindings);

		case 'subtraction-pattern':
			return matchSubtraction(pattern, node, bindings);

		case 'multiplication-pattern':
			return matchMultiplication(pattern, node, bindings);

		case 'division-pattern':
			return matchDivision(pattern, node, bindings);

		case 'superscript-pattern':
			return matchSuperscript(pattern, node, bindings);

		case 'function-pattern':
			return matchFunction(pattern, node, bindings);

		case 'opposite-pattern':
			return matchOpposite(pattern, node, bindings);

		case 'positive-pattern':
			return matchPositive(pattern, node, bindings);

		case 'delimiter-pattern':
			return matchDelimiter(pattern, node, bindings);

		case 'subscript-pattern':
			return matchSubscript(pattern, node, bindings);

		case 'relation-pattern':
			return matchRelation(pattern, node, bindings);

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
	bindings: MatchBindings
): MatchResult {
	// Check constraint first if present
	if (pattern.constraint && !checkConstraint(pattern.constraint, node)) {
		return failMatch();
	}

	// Check if already bound
	const existingBinding = bindings.get(pattern.name);
	if (existingBinding !== undefined) {
		// Must match existing binding
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
	bindings: MatchBindings
): MatchResult {
	if (!isAddition(node)) {
		return failMatch();
	}

	// Try original order: left + right
	const result1 = matchPair(pattern.left, pattern.right, node.left, node.right, bindings);
	if (result1.success) {
		return result1;
	}

	// Try swapped order: right + left (commutative)
	return matchPair(pattern.left, pattern.right, node.right, node.left, bindings);
}

/**
 * Matches a subtraction pattern.
 * Subtraction is NOT commutative.
 */
function matchSubtraction(
	pattern: Extract<Pattern, { type: 'subtraction-pattern' }>,
	node: MathNode,
	bindings: MatchBindings
): MatchResult {
	if (!isSubtraction(node)) {
		return failMatch();
	}

	return matchPair(pattern.left, pattern.right, node.left, node.right, bindings);
}

/**
 * Matches a multiplication pattern.
 * Multiplication is commutative - tries both orders.
 */
function matchMultiplication(
	pattern: Extract<Pattern, { type: 'multiplication-pattern' }>,
	node: MathNode,
	bindings: MatchBindings
): MatchResult {
	if (!isMultiplication(node)) {
		return failMatch();
	}

	// Try original order
	const result1 = matchPair(pattern.left, pattern.right, node.left, node.right, bindings);
	if (result1.success) {
		return result1;
	}

	// Try swapped order (commutative)
	return matchPair(pattern.left, pattern.right, node.right, node.left, bindings);
}

/**
 * Matches a division pattern.
 * Division is NOT commutative.
 */
function matchDivision(
	pattern: Extract<Pattern, { type: 'division-pattern' }>,
	node: MathNode,
	bindings: MatchBindings
): MatchResult {
	if (!isDivision(node)) {
		return failMatch();
	}

	return matchPair(
		pattern.numerator,
		pattern.denominator,
		node.numerator,
		node.denominator,
		bindings
	);
}

/**
 * Matches a superscript/power pattern.
 */
function matchSuperscript(
	pattern: Extract<Pattern, { type: 'superscript-pattern' }>,
	node: MathNode,
	bindings: MatchBindings
): MatchResult {
	if (!isSuperscript(node)) {
		return failMatch();
	}

	return matchPair(pattern.base, pattern.exponent, node.base, node.superscript, bindings);
}

/**
 * Matches a function pattern.
 */
function matchFunction(
	pattern: Extract<Pattern, { type: 'function-pattern' }>,
	node: MathNode,
	bindings: MatchBindings
): MatchResult {
	if (!isFunction(node)) {
		return failMatch();
	}

	// Check function name
	if (pattern.name !== node.name) {
		return failMatch();
	}

	// Check argument count
	if (pattern.args.length !== node.args.length) {
		return failMatch();
	}

	// Match all arguments
	let currentBindings = bindings;
	for (let i = 0; i < pattern.args.length; i++) {
		const result = match(pattern.args[i], node.args[i], currentBindings);
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
	bindings: MatchBindings
): MatchResult {
	if (!isOpposite(node)) {
		return failMatch();
	}

	return match(pattern.operand, node.operand, bindings);
}

/**
 * Matches a positive sign pattern.
 */
function matchPositive(
	pattern: Extract<Pattern, { type: 'positive-pattern' }>,
	node: MathNode,
	bindings: MatchBindings
): MatchResult {
	if (!isPositive(node)) {
		return failMatch();
	}

	return match(pattern.operand, node.operand, bindings);
}

/**
 * Matches a delimiter pattern.
 */
function matchDelimiter(
	pattern: Extract<Pattern, { type: 'delimiter-pattern' }>,
	node: MathNode,
	bindings: MatchBindings
): MatchResult {
	if (!isDelimiter(node)) {
		return failMatch();
	}

	return match(pattern.content, node.content, bindings);
}

/**
 * Matches a subscript pattern.
 */
function matchSubscript(
	pattern: Extract<Pattern, { type: 'subscript-pattern' }>,
	node: MathNode,
	bindings: MatchBindings
): MatchResult {
	if (!isSubscript(node)) {
		return failMatch();
	}

	return matchPair(pattern.base, pattern.subscript, node.base, node.subscript, bindings);
}

/**
 * Matches a relation pattern.
 */
function matchRelation(
	pattern: Extract<Pattern, { type: 'relation-pattern' }>,
	node: MathNode,
	bindings: MatchBindings
): MatchResult {
	if (!isRelation(node)) {
		return failMatch();
	}

	// Check relation type (unless 'any')
	if (pattern.relation !== 'any' && pattern.relation !== node.relation) {
		return failMatch();
	}

	return matchPair(pattern.left, pattern.right, node.left, node.right, bindings);
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
	bindings: MatchBindings
): MatchResult {
	// Match left first
	const leftResult = match(patternLeft, nodeLeft, bindings);
	if (!leftResult.success) {
		return failMatch();
	}

	// Match right with updated bindings
	return match(patternRight, nodeRight, leftResult.bindings);
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
export function tryMatch(pattern: Pattern, node: MathNode): MatchBindings | undefined {
	const result = match(pattern, node);
	return result.success ? result.bindings : undefined;
}

/**
 * Checks if a pattern matches a node without returning bindings.
 *
 * @param pattern - The pattern to match
 * @param node - The node to match against
 * @returns true if the pattern matches
 */
export function matches(pattern: Pattern, node: MathNode): boolean {
	return match(pattern, node).success;
}
