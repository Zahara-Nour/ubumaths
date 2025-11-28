/**
 * Circular Dependency Detector
 * =============================
 *
 * Detects circular dependencies in variable definitions using
 * depth-first search (DFS) algorithm.
 *
 * A circular dependency occurs when:
 * - Variable A depends on B, B depends on C, C depends on A
 * - Variable A depends on itself
 *
 * @module shared/parameterization/validator/circular-dependency
 */

import type { Variable, ValidationResult, ValidationError } from '../types';
import { tokenize } from '../parser/tokenizer';
import { parseVariableReference } from '../parser/variable-parser';
import { parseRandomSpec } from '../parser/random-parser';
import { parseEvalExpression } from '../parser/eval-parser';

/**
 * Detect circular dependencies in variable definitions
 *
 * Uses DFS to build a dependency graph and detect cycles.
 * Returns detailed error with dependency path if cycle found.
 *
 * Algorithm:
 * 1. Build dependency graph from variable expressions
 * 2. For each unvisited variable, run DFS
 * 3. Track visiting/visited state to detect back edges
 * 4. If back edge found, reconstruct cycle path
 *
 * @param variables - Variable definitions to check
 * @returns Validation result with cycle path if found
 *
 * @example No circular dependencies
 * ```typescript
 * detectCircularDependencies([
 *   { name: 'a', expression: '5' },
 *   { name: 'b', expression: '{{a}}' },
 *   { name: 'c', expression: '{{b}}' }
 * ])
 * // → { valid: true, errors: [] }
 * ```
 *
 * @example Direct self-reference
 * ```typescript
 * detectCircularDependencies([
 *   { name: 'a', expression: '{{a}}' }
 * ])
 * // → {
 * //     valid: false,
 * //     errors: [{
 * //       type: 'circular-dependency',
 * //       message: 'Circular dependency detected: a → a',
 * //       variable: 'a',
 * //       path: ['a', 'a']
 * //     }]
 * //   }
 * ```
 *
 * @example Indirect circular dependency
 * ```typescript
 * detectCircularDependencies([
 *   { name: 'a', expression: '{{b}}' },
 *   { name: 'b', expression: '{{c}}' },
 *   { name: 'c', expression: '{{a}}' }
 * ])
 * // → {
 * //     valid: false,
 * //     errors: [{
 * //       type: 'circular-dependency',
 * //       message: 'Circular dependency detected: a → b → c → a',
 * //       variable: 'a',
 * //       path: ['a', 'b', 'c', 'a']
 * //     }]
 * //   }
 * ```
 *
 * @example Multiple variables, no cycle
 * ```typescript
 * detectCircularDependencies([
 *   { name: 'a', expression: '1' },
 *   { name: 'b', expression: '{{a}}' },
 *   { name: 'c', expression: '{{a}}' },
 *   { name: 'd', expression: '{{eval:b+c}}' }
 * ])
 * // → { valid: true, errors: [] }
 * ```
 *
 * @example Complex expressions with no cycle
 * ```typescript
 * detectCircularDependencies([
 *   { name: 'min', expression: '1' },
 *   { name: 'max', expression: '10' },
 *   { name: 'a', expression: '{{{{min}}-{{max}}}}' },
 *   { name: 'b', expression: '{{{{min}}-{{max}}!{{a}}}}' }
 * ])
 * // → { valid: true, errors: [] }
 * ```
 */
export function detectCircularDependencies(variables: Variable[]): ValidationResult {
	if (!variables || variables.length === 0) {
		return { valid: true, errors: [] };
	}

	// Build dependency graph: variable -> [dependencies]
	const graph = new Map<string, string[]>();

	for (const variable of variables) {
		const dependencies = getVariableNames(variable.expression);
		graph.set(variable.name, dependencies);
	}

	// Detect cycles using DFS
	const errors: ValidationError[] = [];
	const visited = new Set<string>();

	for (const variable of variables) {
		if (!visited.has(variable.name)) {
			const cycle = findCycle(variable.name, graph, visited, new Set(), []);
			if (cycle) {
				errors.push({
					type: 'circular-dependency',
					message: `Circular dependency detected: ${cycle.join(' → ')}`,
					variable: variable.name,
					path: cycle
				});
			}
		}
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Extract all variable names referenced in an expression
 *
 * Recursively extracts variables from inside {{eval:}} and {{random:}} expressions.
 */
function getVariableNames(expression: string): string[] {
	const tokens = tokenize(expression);
	const names: string[] = [];

	for (const token of tokens) {
		if (token.type === 'variable') {
			const varName = parseVariableReference(token.content);
			if (varName) {
				names.push(varName);
			}
		} else if (token.type === 'random') {
			// Extract variables from inside random specs: {{random:1-{{max}}}}
			const randomSpec = parseRandomSpec(token.content);
			if (randomSpec) {
				// Check min/max bounds for variable references
				if (randomSpec.type === 'integer' || randomSpec.type === 'decimal-range') {
					if (randomSpec.min.type === 'variable') names.push(randomSpec.min.name);
					if (randomSpec.max.type === 'variable') names.push(randomSpec.max.name);
				}
				// Check digit counts for variable references
				if (randomSpec.type === 'decimal-by-digits') {
					if (randomSpec.digitsBefore.type === 'variable') names.push(randomSpec.digitsBefore.name);
					if (randomSpec.digitsAfter.type === 'variable') names.push(randomSpec.digitsAfter.name);
				}
				// Check exclusions for variable references
				for (const exclusion of randomSpec.exclusions) {
					if (exclusion.type === 'value') {
						if (exclusion.value.type === 'variable') names.push(exclusion.value.name);
					} else if (exclusion.type === 'range') {
						if (exclusion.min.type === 'variable') names.push(exclusion.min.name);
						if (exclusion.max.type === 'variable') names.push(exclusion.max.name);
					}
				}
			}
		} else if (token.type === 'eval') {
			// Extract variables from inside eval expressions: {{eval:{{a}} + {{b}}}}
			const evalExpr = parseEvalExpression(token.content);
			if (evalExpr) {
				// Recursively extract variable names from the eval expression
				const innerNames = getVariableNames(evalExpr);
				names.push(...innerNames);
			}
		}
	}

	return names;
}

/**
 * Find a cycle starting from a node using DFS
 *
 * @param node - Starting node
 * @param graph - Dependency graph
 * @param visited - Globally visited nodes
 * @param recStack - Recursion stack for current path
 * @param path - Current path from root
 * @returns Cycle path if found, null otherwise
 */
function findCycle(
	node: string,
	graph: Map<string, string[]>,
	visited: Set<string>,
	recStack: Set<string>,
	path: string[]
): string[] | null {
	visited.add(node);
	recStack.add(node);
	path.push(node);

	const neighbors = graph.get(node) || [];

	for (const neighbor of neighbors) {
		if (!visited.has(neighbor)) {
			// Continue DFS
			const cycle = findCycle(neighbor, graph, visited, recStack, path);
			if (cycle) {
				return cycle;
			}
		} else if (recStack.has(neighbor)) {
			// Cycle detected
			const cycleStart = path.indexOf(neighbor);
			const cyclePath = path.slice(cycleStart);
			cyclePath.push(neighbor); // Complete the cycle
			return cyclePath;
		}
	}

	recStack.delete(node);
	path.pop();
	return null;
}
