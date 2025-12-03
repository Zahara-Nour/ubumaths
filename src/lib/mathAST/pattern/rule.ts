/**
 * Rule System for MathAST Pattern Matching
 *
 * Provides functions for creating and applying transformation rules
 * that match patterns and produce replacement expressions.
 */

import type { Rule, Pattern, MatchBindings, RuleOptions } from './types';
import type { MathNode } from '../types';
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
		...(options?.priority !== undefined && { priority: options.priority })
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

		default: {
			// Exhaustive check
			const _exhaustive: never = pattern;
			return _exhaustive;
		}
	}
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
export function applyRule(rule: Rule, node: MathNode): MathNode | null {
	// Try to match the pattern
	const matchResult = match(rule.pattern, node);
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
export function applyRuleDeep(rule: Rule, node: MathNode): MathNode {
	return mapNode(node, (n) => {
		const result = applyRule(rule, n);
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
	maxIterations: number = 100
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
			const transformed = applyRuleDeep(rule, current);

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
