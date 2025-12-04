/**
 * Dependency Graph - Directed Acyclic Graph (DAG) for spreadsheet formula recalculation
 *
 * This module provides a dependency graph that tracks relationships between cells
 * for optimal formula recalculation. It handles:
 * - Tracking dependencies between cells (which cells a formula depends on)
 * - Tracking dependents (which cells depend on a given cell)
 * - Cycle detection (preventing circular references)
 * - Topological sorting for correct calculation order
 * - Cascade invalidation when cells change
 *
 * @module spreadsheet/dependency-graph
 */

import { getFormulaDependencies } from './parser/evaluator';

// =============================================================================
// Types
// =============================================================================

/**
 * Statistics about the dependency graph
 */
export interface GraphStats {
	/** Number of cells tracked in the graph */
	cellCount: number;
	/** Total number of dependency edges */
	edgeCount: number;
	/** Maximum depth of dependency chains */
	maxDependencyDepth: number;
}

// =============================================================================
// DependencyGraph Class
// =============================================================================

/**
 * Directed graph for tracking cell dependencies in a spreadsheet.
 *
 * The graph maintains two relationships:
 * - dependencies: cell -> cells it depends on (predecessors)
 * - dependents: cell -> cells that depend on it (successors)
 *
 * This dual tracking allows efficient:
 * - Forward propagation: when A changes, find all cells that need recalculation
 * - Backward analysis: determine what a formula depends on
 *
 * @example
 * const graph = new DependencyGraph();
 *
 * // A1 = 10, B1 = 20, C1 = =A1+B1
 * graph.updateCell('A1', '10');      // No dependencies
 * graph.updateCell('B1', '20');      // No dependencies
 * graph.updateCell('C1', '=A1+B1');  // Depends on A1 and B1
 *
 * // When A1 changes, which cells need recalculation?
 * graph.getAllDependents('A1'); // Set { 'C1' }
 *
 * // What order should we recalculate?
 * graph.getCalculationOrder(); // ['A1', 'B1', 'C1']
 */
export class DependencyGraph {
	/**
	 * Map cell -> cells it depends on (predecessors)
	 * Example: if C1 = =A1+B1, then dependencies.get('C1') = Set { 'A1', 'B1' }
	 */
	private dependencies = new Map<string, Set<string>>();

	/**
	 * Map cell -> cells that depend on it (successors)
	 * Example: if C1 = =A1+B1, then dependents.get('A1') includes 'C1'
	 */
	private dependents = new Map<string, Set<string>>();

	/**
	 * Cache for topological sort result (invalidated on modifications)
	 */
	private sortCache: string[] | null = null;

	// ===========================================================================
	// Cell Operations
	// ===========================================================================

	/**
	 * Update the dependencies for a cell based on its formula
	 *
	 * If the formula references other cells, those become dependencies.
	 * If the value is not a formula (no leading "="), the cell has no dependencies.
	 *
	 * @param cell - Cell reference (e.g., "A1")
	 * @param formula - Formula or value string
	 *
	 * @example
	 * graph.updateCell('C1', '=A1+B1'); // C1 depends on A1, B1
	 * graph.updateCell('A1', '42');     // A1 has no dependencies
	 */
	updateCell(cell: string, formula: string): void {
		// Invalidate cache on any modification
		this.sortCache = null;

		// Normalize cell reference to uppercase
		const normalizedCell = cell.toUpperCase();

		// Validate input - if formula is invalid, treat as no dependencies
		if (!formula || typeof formula !== 'string') {
			this.removeCell(normalizedCell);
			return;
		}

		// Extract dependencies from formula (safely)
		let newDeps: Set<string>;
		try {
			newDeps = new Set(getFormulaDependencies(formula).map((d) => d.toUpperCase()));
		} catch {
			// If formula parsing fails, treat as no dependencies
			newDeps = new Set<string>();
		}

		// Get current dependencies (if any)
		const oldDeps = this.dependencies.get(normalizedCell) || new Set<string>();

		// Remove this cell from old dependents that are no longer referenced
		for (const oldDep of oldDeps) {
			if (!newDeps.has(oldDep)) {
				const depSet = this.dependents.get(oldDep);
				if (depSet) {
					depSet.delete(normalizedCell);
					if (depSet.size === 0) {
						this.dependents.delete(oldDep);
					}
				}
			}
		}

		// Add this cell to new dependents
		for (const newDep of newDeps) {
			if (!oldDeps.has(newDep)) {
				if (!this.dependents.has(newDep)) {
					this.dependents.set(newDep, new Set());
				}
				this.dependents.get(newDep)!.add(normalizedCell);
			}
		}

		// Update dependencies map
		if (newDeps.size > 0) {
			this.dependencies.set(normalizedCell, newDeps);
		} else {
			this.dependencies.delete(normalizedCell);
		}

		// Ensure cell exists in dependents map if it has dependents
		// (even if it has no dependencies itself)
	}

	/**
	 * Remove a cell from the graph entirely
	 *
	 * This removes the cell's dependencies and clears it from all
	 * dependents lists where it appears.
	 *
	 * @param cell - Cell reference to remove
	 */
	removeCell(cell: string): void {
		// Invalidate cache
		this.sortCache = null;

		const normalizedCell = cell.toUpperCase();

		// Remove from dependencies of others (this cell no longer depends on anything)
		const deps = this.dependencies.get(normalizedCell);
		if (deps) {
			for (const dep of deps) {
				const depSet = this.dependents.get(dep);
				if (depSet) {
					depSet.delete(normalizedCell);
					if (depSet.size === 0) {
						this.dependents.delete(dep);
					}
				}
			}
			this.dependencies.delete(normalizedCell);
		}

		// Remove from dependents (other cells no longer depend on this cell)
		// Note: We don't remove dependents pointing TO this cell - they still reference it
		// (they will get #REF! errors, but the relationship is preserved for error reporting)
	}

	// ===========================================================================
	// Dependency Queries
	// ===========================================================================

	/**
	 * Get direct dependencies of a cell
	 *
	 * Returns the cells that this cell's formula references directly.
	 *
	 * @param cell - Cell reference
	 * @returns Set of cell references this cell depends on
	 */
	getDependencies(cell: string): Set<string> {
		const normalizedCell = cell.toUpperCase();
		return new Set(this.dependencies.get(normalizedCell) || []);
	}

	/**
	 * Get direct dependents of a cell
	 *
	 * Returns the cells that directly reference this cell in their formulas.
	 *
	 * @param cell - Cell reference
	 * @returns Set of cell references that depend on this cell
	 */
	getDependents(cell: string): Set<string> {
		const normalizedCell = cell.toUpperCase();
		return new Set(this.dependents.get(normalizedCell) || []);
	}

	/**
	 * Get all dependents (transitive closure) of a cell
	 *
	 * Returns all cells that need to be recalculated when this cell changes,
	 * including indirect dependents (dependents of dependents, etc.).
	 *
	 * Uses breadth-first search to find all reachable cells.
	 *
	 * @param cell - Cell reference that changed
	 * @returns Set of all cells that need recalculation
	 *
	 * @example
	 * // If A1 -> C1 -> D1 (C1 depends on A1, D1 depends on C1)
	 * graph.getAllDependents('A1'); // Set { 'C1', 'D1' }
	 */
	getAllDependents(cell: string): Set<string> {
		const normalizedCell = cell.toUpperCase();
		const allDependents = new Set<string>();
		const queue: string[] = [normalizedCell];
		const visited = new Set<string>();

		while (queue.length > 0) {
			const current = queue.shift()!;

			if (visited.has(current)) continue;
			visited.add(current);

			const directDependents = this.dependents.get(current);
			if (directDependents) {
				for (const dep of directDependents) {
					if (!visited.has(dep)) {
						allDependents.add(dep);
						queue.push(dep);
					}
				}
			}
		}

		return allDependents;
	}

	// ===========================================================================
	// Cycle Detection
	// ===========================================================================

	/**
	 * Detect if the graph contains a cycle
	 *
	 * Uses depth-first search with a recursion stack to detect back edges.
	 * A cycle means there's a circular reference (e.g., A1 -> B1 -> A1).
	 *
	 * @returns The cycle path if found (e.g., ['A1', 'B1', 'A1']), or null if no cycle
	 *
	 * @example
	 * graph.updateCell('A1', '=B1');
	 * graph.updateCell('B1', '=A1');
	 * graph.detectCycle(); // ['A1', 'B1', 'A1'] or ['B1', 'A1', 'B1']
	 */
	detectCycle(): string[] | null {
		const visited = new Set<string>();
		const recursionStack = new Set<string>();
		const path: string[] = [];

		// Check all cells that have dependencies (only they can be in a cycle)
		for (const cell of this.dependencies.keys()) {
			if (!visited.has(cell)) {
				const cycle = this.dfsDetectCycle(cell, visited, recursionStack, path);
				if (cycle) return cycle;
			}
		}

		return null;
	}

	/**
	 * DFS helper for cycle detection
	 */
	private dfsDetectCycle(
		cell: string,
		visited: Set<string>,
		recursionStack: Set<string>,
		path: string[]
	): string[] | null {
		// If cell is in recursion stack, we found a cycle
		if (recursionStack.has(cell)) {
			const cycleStart = path.indexOf(cell);
			return [...path.slice(cycleStart), cell];
		}

		// If already fully visited, no cycle through this path
		if (visited.has(cell)) return null;

		// Mark as in current recursion path
		visited.add(cell);
		recursionStack.add(cell);
		path.push(cell);

		// Check all dependencies (edges go from cell to its dependencies)
		const deps = this.dependencies.get(cell);
		if (deps) {
			for (const dep of deps) {
				const cycle = this.dfsDetectCycle(dep, visited, recursionStack, path);
				if (cycle) return cycle;
			}
		}

		// Remove from recursion stack (backtrack)
		path.pop();
		recursionStack.delete(cell);

		return null;
	}

	/**
	 * Check if adding a dependency would create a cycle
	 *
	 * This is useful for validating formulas before committing them.
	 * It checks if 'to' can reach 'from' in the current graph.
	 *
	 * @param from - Cell that would have the formula
	 * @param to - Cell that would be referenced
	 * @returns true if adding this dependency would create a cycle
	 *
	 * @example
	 * // If B1 = =A1, would A1 = =B1 create a cycle?
	 * graph.updateCell('B1', '=A1');
	 * graph.wouldCreateCycle('A1', 'B1'); // true (A1 -> B1 -> A1)
	 */
	wouldCreateCycle(from: string, to: string): boolean {
		const normalizedFrom = from.toUpperCase();
		const normalizedTo = to.toUpperCase();

		// Self-reference is always a cycle
		if (normalizedFrom === normalizedTo) return true;

		// Check if 'to' can reach 'from' through existing dependencies
		// If yes, adding from -> to would complete a cycle
		const visited = new Set<string>();
		const queue = [normalizedTo];

		while (queue.length > 0) {
			const current = queue.shift()!;

			if (current === normalizedFrom) return true;
			if (visited.has(current)) continue;
			visited.add(current);

			const deps = this.dependencies.get(current);
			if (deps) {
				for (const dep of deps) {
					if (!visited.has(dep)) {
						queue.push(dep);
					}
				}
			}
		}

		return false;
	}

	// ===========================================================================
	// Calculation Order
	// ===========================================================================

	/**
	 * Get the optimal calculation order for all cells (topological sort)
	 *
	 * Returns cells in an order where each cell comes after all cells it depends on.
	 * Uses Kahn's algorithm for topological sorting.
	 *
	 * Note: This only includes cells that have formulas (dependencies).
	 * Cells with plain values don't need to be in the calculation order.
	 *
	 * @returns Ordered array of cell references for calculation
	 * @throws Error if the graph contains a cycle
	 *
	 * @example
	 * // A1 = 10, B1 = 20, C1 = =A1+B1, D1 = =C1*2
	 * graph.getCalculationOrder(); // ['C1', 'D1'] (A1, B1 have no formulas)
	 */
	getCalculationOrder(): string[] {
		// Return cached result if available
		if (this.sortCache) return [...this.sortCache];

		// Get all cells involved (have dependencies or are depended on)
		const allCells = new Set<string>();
		for (const cell of this.dependencies.keys()) {
			allCells.add(cell);
			const deps = this.dependencies.get(cell)!;
			for (const dep of deps) {
				allCells.add(dep);
			}
		}

		// Calculate in-degree (number of unprocessed dependencies) for each cell
		const inDegree = new Map<string, number>();
		for (const cell of allCells) {
			inDegree.set(cell, 0);
		}

		// Count incoming edges (dependencies)
		for (const [cell, deps] of this.dependencies) {
			inDegree.set(cell, deps.size);
		}

		// Start with cells that have no dependencies (in-degree 0)
		const queue: string[] = [];
		for (const [cell, degree] of inDegree) {
			if (degree === 0) {
				queue.push(cell);
			}
		}

		// Sort queue for deterministic output
		queue.sort();

		const result: string[] = [];

		while (queue.length > 0) {
			// Sort to ensure deterministic order when multiple cells have same in-degree
			queue.sort();
			const cell = queue.shift()!;
			result.push(cell);

			// Reduce in-degree of dependents
			const cellDependents = this.dependents.get(cell);
			if (cellDependents) {
				for (const dependent of cellDependents) {
					const newDegree = inDegree.get(dependent)! - 1;
					inDegree.set(dependent, newDegree);
					if (newDegree === 0) {
						queue.push(dependent);
					}
				}
			}
		}

		// Check for cycle (not all cells processed)
		if (result.length < allCells.size) {
			// There's a cycle - find and report it
			const cycle = this.detectCycle();
			throw new Error(`Circular reference detected: ${cycle?.join(' -> ')}`);
		}

		// Cache the result
		this.sortCache = result;
		return [...result];
	}

	/**
	 * Get recalculation order for a subset of changed cells
	 *
	 * Given a set of cells that changed, returns all cells that need
	 * recalculation (including the changed cells and all their dependents)
	 * in the correct order.
	 *
	 * @param cells - Cells that were modified
	 * @returns Ordered array of cells to recalculate
	 *
	 * @example
	 * // If C1 = =A1+B1, D1 = =C1*2
	 * graph.getRecalculationOrder(['A1']); // ['A1', 'C1', 'D1']
	 */
	getRecalculationOrder(cells: string[]): string[] {
		// Normalize cell references
		const normalizedCells = cells.map((c) => c.toUpperCase());

		// Collect all affected cells (changed cells + all dependents)
		const affectedCells = new Set<string>(normalizedCells);
		for (const cell of normalizedCells) {
			const deps = this.getAllDependents(cell);
			for (const dep of deps) {
				affectedCells.add(dep);
			}
		}

		// Get full calculation order
		const fullOrder = this.getCalculationOrder();

		// Filter to only affected cells, maintaining order
		return fullOrder.filter((cell) => affectedCells.has(cell));
	}

	// ===========================================================================
	// Graph Management
	// ===========================================================================

	/**
	 * Clear all data from the graph
	 */
	clear(): void {
		this.dependencies.clear();
		this.dependents.clear();
		this.sortCache = null;
	}

	/**
	 * Get statistics about the graph
	 *
	 * @returns Graph statistics
	 */
	getStats(): GraphStats {
		// Count total edges
		let edgeCount = 0;
		for (const deps of this.dependencies.values()) {
			edgeCount += deps.size;
		}

		// Get all cells in the graph
		const allCells = this.getAllCells();

		// Calculate max dependency depth
		let maxDepth = 0;
		for (const cell of allCells) {
			const depth = this.calculateDepth(cell, new Set());
			if (depth > maxDepth) {
				maxDepth = depth;
			}
		}

		return {
			cellCount: allCells.size,
			edgeCount,
			maxDependencyDepth: maxDepth
		};
	}

	/**
	 * Calculate the dependency depth of a cell
	 */
	private calculateDepth(cell: string, visited: Set<string>): number {
		if (visited.has(cell)) return 0; // Cycle protection
		visited.add(cell);

		const deps = this.dependencies.get(cell);
		if (!deps || deps.size === 0) return 0;

		let maxChildDepth = 0;
		for (const dep of deps) {
			const childDepth = this.calculateDepth(dep, visited);
			if (childDepth > maxChildDepth) {
				maxChildDepth = childDepth;
			}
		}

		return 1 + maxChildDepth;
	}

	/**
	 * Check if the graph has any cells
	 */
	isEmpty(): boolean {
		return this.dependencies.size === 0 && this.dependents.size === 0;
	}

	/**
	 * Get all cells in the graph
	 */
	getAllCells(): Set<string> {
		const cells = new Set<string>();

		// Add cells that have formulas (have dependencies)
		for (const cell of this.dependencies.keys()) {
			cells.add(cell);
		}

		// Add cells that are referenced by formulas (are dependencies of others)
		for (const deps of this.dependencies.values()) {
			for (const dep of deps) {
				cells.add(dep);
			}
		}

		// Add cells that have dependents (are referenced but may not have formulas themselves)
		for (const cell of this.dependents.keys()) {
			cells.add(cell);
		}

		return cells;
	}
}

// =============================================================================
// Singleton Export
// =============================================================================

/**
 * Singleton dependency graph instance for simple usage
 *
 * @example
 * import { dependencyGraph } from './dependency-graph';
 * dependencyGraph.updateCell('C1', '=A1+B1');
 */
export const dependencyGraph = new DependencyGraph();
