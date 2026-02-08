/**
 * Rule System for MathAST Pattern Matching
 *
 * Provides functions for creating and applying transformation rules
 * that match patterns and produce replacement expressions.
 */

import type {
	Rule,
	Pattern,
	MatchBindings,
	RuleOptions,
	SumPattern,
	ProductPattern,
	RuleStep,
	RuleApplicationResult
} from './types';
import { isSumSequenceBinding, isProductSequenceBinding, isAnySequencePattern } from './types';
import type { MathNode } from '../types';
import type { TypeContext } from '../numtype/types';
import { match } from './match';
import { mapNode } from '../transforms';
import {
	add,
	subtract,
	multiply,
	divide,
	superscript,
	func,
	opposite,
	positive,
	delimiter,
	subscript,
	relation
} from '../factory';
import { unflattenSum, unflattenProduct } from '../flatten';
import { nodesEqual } from './match';

// =============================================================================
// Rule Creation
// =============================================================================

/**
 * Creates a transformation rule.
 *
 * @param pattern - Pattern to match against expressions
 * @param replacement - Pattern to instantiate with bindings, or function to generate replacement
 * @param options - Optional name, condition, and priority
 * @returns A Rule object
 *
 * @example
 * // x + 0 -> x
 * createRule(
 *   P.add(P._('x'), P.num(0)),
 *   P._('x'),
 *   { name: 'additive-identity' }
 * )
 *
 * // With condition: x / x -> 1 (when x != 0)
 * createRule(
 *   P.div(P._('x'), P._('x')),
 *   P.num(1),
 *   {
 *     name: 'self-division',
 *     condition: (bindings) => {
 *       const x = bindings.get('x');
 *       return x?.type !== 'number' || x.value !== '0';
 *     }
 *   }
 * )
 */
export function createRule(
	pattern: Pattern,
	replacement: Pattern | ((bindings: MatchBindings) => MathNode),
	options?: RuleOptions
): Rule {
	return {
		name: options?.name ?? 'unnamed-rule',
		pattern,
		replacement,
		...(options?.condition !== undefined && { condition: options.condition }),
		...(options?.priority !== undefined && { priority: options.priority }),
		...(options?.group !== undefined && { group: options.group })
	};
}

// =============================================================================
// Pattern Instantiation
// =============================================================================

/**
 * Instantiates a pattern with bindings to create a MathNode.
 * Replaces wildcards with their bound values.
 *
 * @param pattern - The pattern to instantiate
 * @param bindings - Map of wildcard names to their matched values
 * @returns A MathNode with wildcards replaced by bound values
 * @throws Error if a wildcard is not found in bindings
 *
 * @example
 * // Given pattern P._('x') and bindings { x: number('5') }
 * // Returns number('5')
 */
export function instantiate(pattern: Pattern, bindings: MatchBindings): MathNode {
	switch (pattern.type) {
		case 'wildcard': {
			const boundValue = bindings.get(pattern.name);
			if (boundValue === undefined) {
				throw new Error(`Wildcard '${pattern.name}' not found in bindings`);
			}

			// Handle sequence bindings - convert back to MathNode
			if (isSumSequenceBinding(boundValue)) {
				const result = unflattenSum(boundValue.terms);
				if (!result) {
					throw new Error(`Cannot instantiate empty sum sequence '${pattern.name}'`);
				}
				return result;
			}
			if (isProductSequenceBinding(boundValue)) {
				const result = unflattenProduct(boundValue.factors);
				if (!result) {
					throw new Error(`Cannot instantiate empty product sequence '${pattern.name}'`);
				}
				return result;
			}

			return boundValue;
		}

		case 'literal':
			return pattern.node;

		case 'addition-pattern':
			return add(instantiate(pattern.left, bindings), instantiate(pattern.right, bindings));

		case 'subtraction-pattern':
			return subtract(instantiate(pattern.left, bindings), instantiate(pattern.right, bindings));

		case 'multiplication-pattern':
			return multiply(
				instantiate(pattern.left, bindings),
				instantiate(pattern.right, bindings),
				'implicit' // Default display style
			);

		case 'division-pattern':
			return divide(
				instantiate(pattern.numerator, bindings),
				instantiate(pattern.denominator, bindings),
				'fraction' // Default display style
			);

		case 'superscript-pattern':
			return superscript(
				instantiate(pattern.base, bindings),
				instantiate(pattern.exponent, bindings)
			);

		case 'function-pattern':
			return func(
				pattern.name,
				pattern.args.map((arg) => instantiate(arg, bindings))
			);

		case 'opposite-pattern':
			return opposite(instantiate(pattern.operand, bindings));

		case 'positive-pattern':
			return positive(instantiate(pattern.operand, bindings));

		case 'delimiter-pattern':
			return delimiter('parentheses', instantiate(pattern.content, bindings), 'grouping');

		case 'subscript-pattern':
			return subscript(
				instantiate(pattern.base, bindings),
				instantiate(pattern.subscript, bindings)
			);

		case 'relation-pattern': {
			const relationType = pattern.relation === 'any' ? '=' : pattern.relation;
			return relation(
				relationType,
				instantiate(pattern.left, bindings),
				instantiate(pattern.right, bindings)
			);
		}

		case 'sum-pattern': {
			return instantiateSumPattern(pattern, bindings);
		}

		case 'product-pattern': {
			return instantiateProductPattern(pattern, bindings);
		}

		default: {
			// Exhaustive check
			const _exhaustive: never = pattern;
			return _exhaustive;
		}
	}
}

// =============================================================================
// N-ary Pattern Instantiation Helpers
// =============================================================================

/**
 * Instantiates a SumPattern into a MathNode
 *
 * Combines all single element instantiations and sequence bindings into a sum.
 */
function instantiateSumPattern(pattern: SumPattern, bindings: MatchBindings): MathNode {
	const nodes: MathNode[] = [];

	for (const elem of pattern.elements) {
		if (isAnySequencePattern(elem)) {
			// Get the sequence binding and unflatten it
			const binding = bindings.get(elem.name);
			if (binding === undefined) {
				throw new Error(`Sequence '${elem.name}' not found in bindings`);
			}
			if (!isSumSequenceBinding(binding)) {
				throw new Error(`Expected sum sequence binding for '${elem.name}'`);
			}

			// Unflatten and add to nodes
			const unflattened = unflattenSum(binding.terms);
			if (unflattened) {
				nodes.push(unflattened);
			}
			// If empty, we just skip it (0 terms contribute nothing to sum)
		} else {
			// Regular pattern - instantiate it
			nodes.push(instantiate(elem, bindings));
		}
	}

	// Combine all nodes into a sum
	if (nodes.length === 0) {
		throw new Error('Cannot instantiate empty sum pattern');
	}
	if (nodes.length === 1) {
		return nodes[0];
	}

	// Build left-associative sum
	let result = nodes[0];
	for (let i = 1; i < nodes.length; i++) {
		result = add(result, nodes[i]);
	}
	return result;
}

/**
 * Instantiates a ProductPattern into a MathNode
 *
 * Combines all single element instantiations and sequence bindings into a product.
 */
function instantiateProductPattern(pattern: ProductPattern, bindings: MatchBindings): MathNode {
	const nodes: MathNode[] = [];

	for (const elem of pattern.elements) {
		if (isAnySequencePattern(elem)) {
			// Get the sequence binding and unflatten it
			const binding = bindings.get(elem.name);
			if (binding === undefined) {
				throw new Error(`Sequence '${elem.name}' not found in bindings`);
			}
			if (!isProductSequenceBinding(binding)) {
				throw new Error(`Expected product sequence binding for '${elem.name}'`);
			}

			// Wrap MathNodes as StyledFactors with implicit style for unflatten
			const styledFactors = binding.factors.map((f) => ({
				style: 'implicit' as const,
				factor: f
			}));
			const unflattened = unflattenProduct(styledFactors);
			if (unflattened) {
				nodes.push(unflattened);
			}
			// If empty, we just skip it (0 factors contribute nothing - but 1 would be identity)
		} else {
			// Regular pattern - instantiate it
			nodes.push(instantiate(elem, bindings));
		}
	}

	// Combine all nodes into a product
	if (nodes.length === 0) {
		throw new Error('Cannot instantiate empty product pattern');
	}
	if (nodes.length === 1) {
		return nodes[0];
	}

	// Build left-associative product
	let result = nodes[0];
	for (let i = 1; i < nodes.length; i++) {
		result = multiply(result, nodes[i], 'implicit');
	}
	return result;
}

// =============================================================================
// Rule Application
// =============================================================================

/**
 * Applies a rule to a single node (top-level only).
 * Does not recurse into children.
 *
 * @param rule - The rule to apply
 * @param node - The node to transform
 * @returns The transformed node, or null if the rule doesn't match
 *
 * @example
 * const rule = createRule(P.add(P._('x'), P.num(0)), P._('x'));
 * const node = add(variable('a'), number('0'));
 * const result = applyRule(rule, node); // Returns variable('a')
 */
export function applyRule(rule: Rule, node: MathNode, ctx?: TypeContext): MathNode | null {
	// Try to match the pattern
	const matchResult = match(rule.pattern, node, undefined, ctx);
	if (!matchResult.success) {
		return null;
	}

	// Check condition if present
	if (rule.condition && !rule.condition(matchResult.bindings)) {
		return null;
	}

	// Generate replacement
	if (typeof rule.replacement === 'function') {
		return rule.replacement(matchResult.bindings);
	}

	return instantiate(rule.replacement, matchResult.bindings);
}

/**
 * Applies a rule recursively using bottom-up traversal.
 * First transforms children, then tries to apply the rule to the current node.
 *
 * @param rule - The rule to apply
 * @param node - The root node to transform
 * @returns The transformed tree
 *
 * @example
 * const rule = createRule(P.add(P._('x'), P.num(0)), P._('x'));
 * // Given: (a + 0) + (b + 0)
 * // Returns: a + b (both inner additions simplified)
 */
export function applyRuleDeep(rule: Rule, node: MathNode, ctx?: TypeContext): MathNode {
	return mapNode(node, (n) => {
		const result = applyRule(rule, n, ctx);
		return result ?? n;
	});
}

/**
 * Applies multiple rules until no more changes occur (fixpoint).
 * Rules are sorted by priority (higher priority first) and applied in order.
 * When any rule produces a change, the process restarts from the beginning.
 *
 * @param rules - Array of rules to apply
 * @param node - The node to transform
 * @param maxIterations - Maximum iterations to prevent infinite loops (default 100)
 * @returns The fully transformed node
 *
 * @example
 * const rules = [
 *   createRule(P.add(P._('x'), P.num(0)), P._('x')),
 *   createRule(P.mul(P._('x'), P.num(1)), P._('x'))
 * ];
 * // Given: (a + 0) * 1
 * // First pass: a * 1
 * // Second pass: a
 */
export function applyRules(
	rules: readonly Rule[],
	node: MathNode,
	maxIterations: number = 100,
	ctx?: TypeContext
): MathNode {
	// Sort rules by priority (higher first, undefined treated as 0)
	const sortedRules = [...rules].sort((a, b) => {
		const priorityA = a.priority ?? 0;
		const priorityB = b.priority ?? 0;
		return priorityB - priorityA;
	});

	let current = node;
	let iterations = 0;

	while (iterations < maxIterations) {
		let changed = false;

		for (const rule of sortedRules) {
			const transformed = applyRuleDeep(rule, current, ctx);

			if (!nodesEqual(transformed, current)) {
				current = transformed;
				changed = true;
				break; // Restart from beginning with new tree
			}
		}

		if (!changed) {
			// No rule produced a change - we've reached fixpoint
			break;
		}

		iterations++;
	}

	return current;
}

// =============================================================================
// Sorted Rules Helper
// =============================================================================

/**
 * Sort rules by priority (higher first, undefined treated as 0).
 */
function sortByPriority(rules: readonly Rule[]): Rule[] {
	return [...rules].sort((a, b) => {
		const priorityA = a.priority ?? 0;
		const priorityB = b.priority ?? 0;
		return priorityB - priorityA;
	});
}

// =============================================================================
// Single-Pass Deep Application
// =============================================================================

/**
 * Applies rules in a single bottom-up traversal.
 * At each node, tries all rules in priority order; the first match wins.
 * Does NOT iterate to fixpoint — the caller (simplify) handles the outer loop.
 *
 * @param rules - Rules to try at each node
 * @param node - The expression tree to transform
 * @param ctx - Optional type context for conditional rules
 * @returns The transformed tree (same reference if nothing changed)
 */
export function applyRulesDeepOnce(
	rules: readonly Rule[],
	node: MathNode,
	ctx?: TypeContext
): MathNode {
	const sorted = sortByPriority(rules);
	return mapNode(node, (n) => {
		for (const rule of sorted) {
			const result = applyRule(rule, n, ctx);
			if (result !== null) return result;
		}
		return n;
	});
}

/**
 * Same as applyRulesDeepOnce but also collects which rules fired.
 *
 * @param rules - Rules to try at each node
 * @param node - The expression tree to transform
 * @param ctx - Optional type context for conditional rules
 * @returns Object with transformed tree and recorded steps
 */
export function applyRulesDeepOnceTracked(
	rules: readonly Rule[],
	node: MathNode,
	ctx?: TypeContext
): { result: MathNode; steps: RuleStep[] } {
	const sorted = sortByPriority(rules);
	const steps: RuleStep[] = [];
	const result = mapNode(node, (n) => {
		for (const rule of sorted) {
			const transformed = applyRule(rule, n, ctx);
			if (transformed !== null) {
				steps.push({ ruleName: rule.name, before: n, after: transformed });
				return transformed;
			}
		}
		return n;
	});
	return { result, steps };
}

// =============================================================================
// Fixpoint Application with Step Tracking
// =============================================================================

/**
 * Applies rules to fixpoint with step tracking.
 * Used by standalone API functions (pedagogical exercises) to return
 * which rules fired and on which sub-expressions.
 *
 * @param rules - Rules to apply
 * @param node - The expression to transform
 * @param maxIterations - Safety limit (default 100)
 * @param ctx - Optional type context
 * @returns Result with steps tracking
 */
export function applyRulesWithSteps(
	rules: readonly Rule[],
	node: MathNode,
	maxIterations: number = 100,
	ctx?: TypeContext
): RuleApplicationResult {
	const sorted = sortByPriority(rules);
	const steps: RuleStep[] = [];
	let current = node;

	for (let i = 0; i < maxIterations; i++) {
		const iterSteps: RuleStep[] = [];
		const result = mapNode(current, (n) => {
			for (const rule of sorted) {
				const transformed = applyRule(rule, n, ctx);
				if (transformed !== null) {
					iterSteps.push({ ruleName: rule.name, before: n, after: transformed });
					return transformed;
				}
			}
			return n;
		});

		if (iterSteps.length === 0) break;
		steps.push(...iterSteps);
		current = result;
	}

	return { result: current, changed: steps.length > 0, steps };
}
