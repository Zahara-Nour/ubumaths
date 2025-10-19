/**
 * Circular Dependency Detector
 * ============================
 *
 * Detects circular references in variable definitions using
 * depth-first search (DFS) algorithm.
 *
 * @module questions/validators/circular-dependency
 */

import type { QuestionVariable } from '../types';
import { getVariableNames } from '../parser/variable-parser';

/**
 * Detect circular dependencies in variables
 *
 * @param variables - Variable definitions
 * @returns Array of error messages (empty if no cycles)
 *
 * @example
 * ```typescript
 * // Valid: no cycles
 * const vars = [
 *   { name: 'a', expression: '{#:1-10}' },
 *   { name: 'b', expression: '{@:a} + 1' }
 * ];
 * detectCircularDependencies(vars);  // → []
 *
 * // Invalid: circular reference
 * const badVars = [
 *   { name: 'a', expression: '{@:b}' },
 *   { name: 'b', expression: '{@:a}' }
 * ];
 * detectCircularDependencies(badVars);  // → ["Circular reference detected: a -> b -> a"]
 * ```
 */
export function detectCircularDependencies(
  variables?: QuestionVariable[]
): string[] {
  if (!variables || variables.length === 0) {
    return [];
  }

  // Build dependency graph: variable -> [dependencies]
  const graph = new Map<string, string[]>();

  for (const variable of variables) {
    const dependencies = getVariableNames(variable.expression);
    graph.set(variable.name, dependencies);
  }

  // Detect cycles using DFS
  const errors: string[] = [];
  const visited = new Set<string>();

  for (const variable of variables) {
    if (!visited.has(variable.name)) {
      const cycle = findCycle(variable.name, graph, visited, new Set(), []);
      if (cycle) {
        errors.push(`Circular reference detected: ${cycle.join(' -> ')}`);
      }
    }
  }

  return errors;
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

/**
 * Check if a variable directly or indirectly references itself
 *
 * @param varName - Variable name to check
 * @param variables - All variable definitions
 * @returns True if variable has circular reference
 */
export function hasCircularReference(
  varName: string,
  variables: QuestionVariable[]
): boolean {
  const graph = new Map<string, string[]>();

  for (const variable of variables) {
    const dependencies = getVariableNames(variable.expression);
    graph.set(variable.name, dependencies);
  }

  const visited = new Set<string>();
  const recStack = new Set<string>();

  return hasCycleDFS(varName, graph, visited, recStack);
}

/**
 * DFS helper to check for cycles from a specific node
 */
function hasCycleDFS(
  node: string,
  graph: Map<string, string[]>,
  visited: Set<string>,
  recStack: Set<string>
): boolean {
  visited.add(node);
  recStack.add(node);

  const neighbors = graph.get(node) || [];

  for (const neighbor of neighbors) {
    if (!visited.has(neighbor)) {
      if (hasCycleDFS(neighbor, graph, visited, recStack)) {
        return true;
      }
    } else if (recStack.has(neighbor)) {
      return true;
    }
  }

  recStack.delete(node);
  return false;
}
