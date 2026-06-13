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
	BindingValue,
	AdditionPattern,
	SubtractionPattern,
	MultiplicationPattern,
	DivisionPattern
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
import { getActiveAbortChecker } from '../common/abort';
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
	pattern: SumPatternElement,
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

		case 'sequence':
		case 'optional-sequence':
			// A bare sequence wildcard reaching match() directly (not via an
			// enclosing sum/product/binary pattern) has no surrounding context to
			// decide whether it captures sum terms or product factors. We treat it
			// as a single-element capture: bind it as a one-term sum sequence so the
			// binding round-trips through instantiate(). Required terms (`sequence`)
			// must capture at least the one node; optional sequences also accept it.
			return matchBareSequence(pattern, node, bindings, ctx);

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
	pattern: AdditionPattern,
	node: MathNode,
	bindings: MatchBindings,
	ctx?: TypeContext
): MatchResult {
	const left = pattern.left;
	const right = pattern.right;

	// If either operand is a sequence wildcard (e.g. `a + __rest`), the binary
	// pattern is semantically an n-ary sum. Delegate to matchSumPattern so the
	// sequence captures the remaining terms exactly like P.sum(...) would.
	if (isAnySequencePattern(left) || isAnySequencePattern(right)) {
		return matchSumPattern(toSumPattern(left, right), node, bindings, ctx);
	}

	if (!isAddition(node)) {
		return failMatch();
	}

	// Both operands are plain patterns from here on.
	// Try original order: left + right
	const result1 = matchPair(left, right, node.left, node.right, bindings, ctx);
	if (result1.success) {
		return result1;
	}

	// Try swapped order: right + left (commutative)
	return matchPair(left, right, node.right, node.left, bindings, ctx);
}

/**
 * Matches a subtraction pattern.
 * Subtraction is NOT commutative.
 */
function matchSubtraction(
	pattern: SubtractionPattern,
	node: MathNode,
	bindings: MatchBindings,
	ctx?: TypeContext
): MatchResult {
	const left = pattern.left;
	const right = pattern.right;

	// A sequence operand (e.g. `a - __rest`) makes this an n-ary sum over signed
	// terms. matchSumPattern flattens subtraction into signed terms, so delegate
	// to it for coherent sequence capture.
	if (isAnySequencePattern(left) || isAnySequencePattern(right)) {
		return matchSumPattern(toSumPattern(left, right), node, bindings, ctx);
	}

	if (!isSubtraction(node)) {
		return failMatch();
	}

	return matchPair(left, right, node.left, node.right, bindings, ctx);
}

/**
 * Matches a multiplication pattern.
 * Multiplication is commutative - tries both orders.
 */
function matchMultiplication(
	pattern: MultiplicationPattern,
	node: MathNode,
	bindings: MatchBindings,
	ctx?: TypeContext
): MatchResult {
	const left = pattern.left;
	const right = pattern.right;

	// A sequence operand (e.g. `a * __rest`) makes this an n-ary product.
	// Delegate to matchProductPattern so the sequence captures the remaining
	// factors exactly like P.prod(...) would.
	if (isAnySequencePattern(left) || isAnySequencePattern(right)) {
		return matchProductPattern(toProductPattern(left, right), node, bindings, ctx);
	}

	if (!isMultiplication(node)) {
		return failMatch();
	}

	// Try original order
	const result1 = matchPair(left, right, node.left, node.right, bindings, ctx);
	if (result1.success) {
		return result1;
	}

	// Try swapped order (commutative)
	return matchPair(left, right, node.right, node.left, bindings, ctx);
}

/**
 * Matches a division pattern.
 * Division is NOT commutative.
 */
function matchDivision(
	pattern: DivisionPattern,
	node: MathNode,
	bindings: MatchBindings,
	ctx?: TypeContext
): MatchResult {
	const numerator = pattern.numerator;
	const denominator = pattern.denominator;

	// There is no n-ary quotient pattern, so a sequence wildcard in numerator or
	// denominator position has no coherent capture semantics. Fail rather than
	// silently misbehave. (The pattern parser can construct such a shape, but it
	// is not a meaningful match target.)
	if (isAnySequencePattern(numerator) || isAnySequencePattern(denominator)) {
		return failMatch();
	}

	if (!isDivision(node)) {
		return failMatch();
	}

	return matchPair(numerator, denominator, node.numerator, node.denominator, bindings, ctx);
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
	const base = pattern.base;
	const exponent = pattern.exponent;

	// A sequence wildcard in base or exponent position has no coherent capture
	// semantics for a power node. Fail rather than misbehave.
	if (isAnySequencePattern(base) || isAnySequencePattern(exponent)) {
		return failMatch();
	}

	if (!isSuperscript(node)) {
		return failMatch();
	}

	return matchPair(base, exponent, node.base, node.superscript, bindings, ctx);
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
// Binary <-> N-ary Bridging
// =============================================================================

/**
 * Builds the n-ary SumPattern equivalent of a binary add/subtract pattern whose
 * operands may include a sequence wildcard.
 *
 * `a + __rest` is structurally an AdditionPattern, but its sequence operand only
 * has a coherent meaning as `P.sum(_('a'), __('rest'))`. This adapter lets the
 * binary matchers reuse matchSumPattern unchanged.
 */
function toSumPattern(left: SumPatternElement, right: SumPatternElement): SumPattern {
	return { type: 'sum-pattern', elements: [left, right] };
}

/**
 * Builds the n-ary ProductPattern equivalent of a binary multiply pattern whose
 * operands may include a sequence wildcard (e.g. `a * __rest`).
 */
function toProductPattern(
	left: ProductPatternElement,
	right: ProductPatternElement
): ProductPattern {
	return { type: 'product-pattern', elements: [left, right] };
}

/**
 * Matches a bare sequence wildcard that reached match() without an enclosing
 * sum/product context (e.g. top-level `__rest`, or a sequence handed directly to
 * match()).
 *
 * Semantics: capture the single node as a one-element sum sequence. This mirrors
 * the way matchSumPattern binds a lone term to a sequence, and round-trips
 * through instantiate() (which unflattens the captured terms). A required
 * sequence (`sequence`) and an optional one (`optional-sequence`) both accept a
 * single node here; the distinction (0 vs 1+ elements) only matters when there is
 * a surrounding chain to draw remaining terms from.
 */
function matchBareSequence(
	pattern: SequencePattern | OptionalSequencePattern,
	node: MathNode,
	bindings: MatchBindings,
	ctx?: TypeContext
): MatchResult {
	// Honour an element constraint if present.
	if (pattern.constraint && !checkConstraint(pattern.constraint, node, ctx)) {
		return failMatch();
	}

	const seqBinding: SumSequenceBinding = {
		kind: 'sum-sequence',
		terms: [{ sign: '+', term: node }]
	};
	const newBindings = mergeBindings(bindings, singleBinding(pattern.name, seqBinding));
	if (newBindings === undefined) {
		return failMatch();
	}
	return successMatch(newBindings);
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
	// Cooperative interruption: an active abort checker (installed by simplify()
	// or another entry point via withActiveAbortChecker) lets us bail out of
	// combinatorial enumeration before C(n,k) blows the wall-clock budget.
	// Note: we early-return silently (no AbortError thrown) — generators don't
	// play well with exceptions across yield boundaries. The caller's outer
	// loop in simplify.ts will observe the abort at its next inter-phase check
	// and set `aborted: true` accordingly.
	if (getActiveAbortChecker()?.()) return;
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
	// Same cooperative bail-out as combinations: O(n!) enumeration is the worst
	// offender for wall-clock blowup on large sums/products.
	if (getActiveAbortChecker()?.()) return;
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
	pattern: SumPatternElement,
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
export function matches(pattern: SumPatternElement, node: MathNode, ctx?: TypeContext): boolean {
	return match(pattern, node, EMPTY_BINDINGS, ctx).success;
}
