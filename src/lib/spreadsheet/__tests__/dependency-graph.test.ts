/**
 * Tests for the spreadsheet dependency graph
 *
 * @module spreadsheet/__tests__/dependency-graph.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DependencyGraph } from '../dependency-graph';

// =============================================================================
// Test Setup
// =============================================================================

let graph: DependencyGraph;

beforeEach(() => {
	graph = new DependencyGraph();
});

// =============================================================================
// Basic Operations Tests
// =============================================================================

describe('DependencyGraph - basic operations', () => {
	it('tracks direct dependencies for a formula', () => {
		graph.updateCell('C1', '=A1+B1');

		const deps = graph.getDependencies('C1');
		expect(deps).toEqual(new Set(['A1', 'B1']));
	});

	it('tracks dependents (reverse relationship)', () => {
		graph.updateCell('C1', '=A1+B1');

		expect(graph.getDependents('A1')).toEqual(new Set(['C1']));
		expect(graph.getDependents('B1')).toEqual(new Set(['C1']));
	});

	it('handles cells with no dependencies', () => {
		graph.updateCell('A1', '42');

		const deps = graph.getDependencies('A1');
		expect(deps.size).toBe(0);
	});

	it('handles cells that are not in the graph', () => {
		const deps = graph.getDependencies('Z99');
		expect(deps.size).toBe(0);

		const dependents = graph.getDependents('Z99');
		expect(dependents.size).toBe(0);
	});

	it('updates dependencies when formula changes', () => {
		// Initial formula
		graph.updateCell('C1', '=A1+B1');
		expect(graph.getDependencies('C1')).toEqual(new Set(['A1', 'B1']));
		expect(graph.getDependents('A1')).toContain('C1');
		expect(graph.getDependents('B1')).toContain('C1');

		// Update formula to reference different cells
		graph.updateCell('C1', '=D1+E1');
		expect(graph.getDependencies('C1')).toEqual(new Set(['D1', 'E1']));
		expect(graph.getDependents('D1')).toContain('C1');
		expect(graph.getDependents('E1')).toContain('C1');

		// Old dependencies should be removed
		expect(graph.getDependents('A1').has('C1')).toBe(false);
		expect(graph.getDependents('B1').has('C1')).toBe(false);
	});

	it('removes cell and its dependencies', () => {
		graph.updateCell('C1', '=A1+B1');
		graph.removeCell('C1');

		expect(graph.getDependencies('C1').size).toBe(0);
		expect(graph.getDependents('A1').has('C1')).toBe(false);
		expect(graph.getDependents('B1').has('C1')).toBe(false);
	});

	it('normalizes cell references to uppercase', () => {
		graph.updateCell('c1', '=a1+b1');

		expect(graph.getDependencies('C1')).toEqual(new Set(['A1', 'B1']));
		expect(graph.getDependents('a1')).toContain('C1');
	});

	it('handles multiple dependents for same cell', () => {
		graph.updateCell('C1', '=A1*2');
		graph.updateCell('D1', '=A1*3');
		graph.updateCell('E1', '=A1*4');

		const dependents = graph.getDependents('A1');
		expect(dependents).toEqual(new Set(['C1', 'D1', 'E1']));
	});
});

// =============================================================================
// Cycle Detection Tests
// =============================================================================

describe('DependencyGraph - cycle detection', () => {
	it('detects simple A1->A1 self-reference cycle', () => {
		graph.updateCell('A1', '=A1');

		const cycle = graph.detectCycle();
		expect(cycle).not.toBeNull();
		expect(cycle).toContain('A1');
	});

	it('detects A1->B1->A1 two-cell cycle', () => {
		graph.updateCell('A1', '=B1');
		graph.updateCell('B1', '=A1');

		const cycle = graph.detectCycle();
		expect(cycle).not.toBeNull();
		expect(cycle).toContain('A1');
		expect(cycle).toContain('B1');
	});

	it('detects longer cycles (A1->B1->C1->A1)', () => {
		graph.updateCell('A1', '=B1');
		graph.updateCell('B1', '=C1');
		graph.updateCell('C1', '=A1');

		const cycle = graph.detectCycle();
		expect(cycle).not.toBeNull();
		expect(cycle!.length).toBeGreaterThanOrEqual(3);
	});

	it('detects cycle in complex graph', () => {
		// D1 -> E1 -> F1 -> D1 (cycle)
		// A1 -> B1 -> C1 (no cycle)
		graph.updateCell('A1', '=B1');
		graph.updateCell('B1', '=C1');
		graph.updateCell('C1', '10');
		graph.updateCell('D1', '=E1');
		graph.updateCell('E1', '=F1');
		graph.updateCell('F1', '=D1');

		const cycle = graph.detectCycle();
		expect(cycle).not.toBeNull();
		expect(cycle!.some((c) => ['D1', 'E1', 'F1'].includes(c))).toBe(true);
	});

	it('returns null for acyclic graph', () => {
		graph.updateCell('A1', '10');
		graph.updateCell('B1', '20');
		graph.updateCell('C1', '=A1+B1');
		graph.updateCell('D1', '=C1*2');

		const cycle = graph.detectCycle();
		expect(cycle).toBeNull();
	});

	it('returns null for empty graph', () => {
		const cycle = graph.detectCycle();
		expect(cycle).toBeNull();
	});

	it('wouldCreateCycle prevents self-reference', () => {
		expect(graph.wouldCreateCycle('A1', 'A1')).toBe(true);
	});

	it('wouldCreateCycle detects potential two-cell cycle', () => {
		graph.updateCell('B1', '=A1');

		// Adding A1 = =B1 would create A1 -> B1 -> A1
		expect(graph.wouldCreateCycle('A1', 'B1')).toBe(true);
	});

	it('wouldCreateCycle returns false for safe dependency', () => {
		graph.updateCell('A1', '10');
		graph.updateCell('B1', '20');

		// C1 = =A1 would not create a cycle
		expect(graph.wouldCreateCycle('C1', 'A1')).toBe(false);
	});

	it('wouldCreateCycle detects longer potential cycles', () => {
		graph.updateCell('B1', '=A1');
		graph.updateCell('C1', '=B1');

		// Adding A1 = =C1 would create A1 -> C1 -> B1 -> A1
		expect(graph.wouldCreateCycle('A1', 'C1')).toBe(true);
	});
});

// =============================================================================
// Calculation Order Tests
// =============================================================================

describe('DependencyGraph - calculation order', () => {
	it('excludes cells with no dependencies (plain values)', () => {
		// Plain values don't need to be in calculation order
		graph.updateCell('A1', '10');
		graph.updateCell('B1', '20');
		graph.updateCell('C1', '30');

		const order = graph.getCalculationOrder();
		// Cells with no dependencies are not included in calculation order
		expect(order).toEqual([]);
	});

	it('respects simple dependency order', () => {
		graph.updateCell('A1', '10');
		graph.updateCell('B1', '=A1*2');

		const order = graph.getCalculationOrder();
		expect(order.indexOf('A1')).toBeLessThan(order.indexOf('B1'));
	});

	it('respects chain dependency order', () => {
		graph.updateCell('A1', '10');
		graph.updateCell('B1', '=A1*2');
		graph.updateCell('C1', '=B1*2');
		graph.updateCell('D1', '=C1*2');

		const order = graph.getCalculationOrder();
		expect(order.indexOf('A1')).toBeLessThan(order.indexOf('B1'));
		expect(order.indexOf('B1')).toBeLessThan(order.indexOf('C1'));
		expect(order.indexOf('C1')).toBeLessThan(order.indexOf('D1'));
	});

	it('handles diamond dependencies correctly', () => {
		// A1 is base
		// B1 and C1 both depend on A1
		// D1 depends on both B1 and C1
		graph.updateCell('A1', '10');
		graph.updateCell('B1', '=A1*2');
		graph.updateCell('C1', '=A1*3');
		graph.updateCell('D1', '=B1+C1');

		const order = graph.getCalculationOrder();
		expect(order.indexOf('A1')).toBeLessThan(order.indexOf('B1'));
		expect(order.indexOf('A1')).toBeLessThan(order.indexOf('C1'));
		expect(order.indexOf('B1')).toBeLessThan(order.indexOf('D1'));
		expect(order.indexOf('C1')).toBeLessThan(order.indexOf('D1'));
	});

	it('throws error for cyclic graph', () => {
		graph.updateCell('A1', '=B1');
		graph.updateCell('B1', '=A1');

		expect(() => graph.getCalculationOrder()).toThrow(/[Cc]ircular/);
	});

	it('caches calculation order', () => {
		graph.updateCell('A1', '10');
		graph.updateCell('B1', '=A1');

		const order1 = graph.getCalculationOrder();
		const order2 = graph.getCalculationOrder();

		expect(order1).toEqual(order2);
	});

	it('invalidates cache on update', () => {
		graph.updateCell('A1', '10');
		graph.updateCell('B1', '=A1');
		graph.getCalculationOrder();

		// Add new cell
		graph.updateCell('C1', '=B1');
		const order = graph.getCalculationOrder();

		expect(order).toContain('C1');
		expect(order.indexOf('B1')).toBeLessThan(order.indexOf('C1'));
	});
});

// =============================================================================
// Recalculation Order Tests
// =============================================================================

describe('DependencyGraph - recalculation order', () => {
	it('includes only affected cells', () => {
		graph.updateCell('A1', '10');
		graph.updateCell('B1', '=A1*2');
		graph.updateCell('C1', '100');
		graph.updateCell('D1', '=C1*2');

		// Only A1 changed, so only A1 and B1 need recalculation
		const order = graph.getRecalculationOrder(['A1']);
		expect(order).toContain('A1');
		expect(order).toContain('B1');
		expect(order).not.toContain('C1');
		expect(order).not.toContain('D1');
	});

	it('includes transitive dependents', () => {
		graph.updateCell('A1', '10');
		graph.updateCell('B1', '=A1*2');
		graph.updateCell('C1', '=B1*2');

		const order = graph.getRecalculationOrder(['A1']);
		expect(order).toEqual(['A1', 'B1', 'C1']);
	});

	it('handles multiple changed cells', () => {
		graph.updateCell('A1', '10');
		graph.updateCell('B1', '20');
		graph.updateCell('C1', '=A1+B1');

		const order = graph.getRecalculationOrder(['A1', 'B1']);
		expect(order).toContain('A1');
		expect(order).toContain('B1');
		expect(order).toContain('C1');
		expect(order.indexOf('A1')).toBeLessThan(order.indexOf('C1'));
		expect(order.indexOf('B1')).toBeLessThan(order.indexOf('C1'));
	});

	it('maintains correct order for diamond pattern', () => {
		graph.updateCell('A1', '10');
		graph.updateCell('B1', '=A1*2');
		graph.updateCell('C1', '=A1*3');
		graph.updateCell('D1', '=B1+C1');

		const order = graph.getRecalculationOrder(['A1']);
		expect(order.indexOf('A1')).toBeLessThan(order.indexOf('B1'));
		expect(order.indexOf('A1')).toBeLessThan(order.indexOf('C1'));
		expect(order.indexOf('B1')).toBeLessThan(order.indexOf('D1'));
		expect(order.indexOf('C1')).toBeLessThan(order.indexOf('D1'));
	});

	it('normalizes cell references', () => {
		graph.updateCell('A1', '10');
		graph.updateCell('B1', '=A1');

		const order = graph.getRecalculationOrder(['a1']);
		expect(order).toContain('A1');
		expect(order).toContain('B1');
	});
});

// =============================================================================
// getAllDependents Tests
// =============================================================================

describe('DependencyGraph - getAllDependents', () => {
	it('returns direct dependents', () => {
		graph.updateCell('A1', '10');
		graph.updateCell('B1', '=A1*2');

		const deps = graph.getAllDependents('A1');
		expect(deps).toEqual(new Set(['B1']));
	});

	it('returns transitive dependents', () => {
		graph.updateCell('A1', '10');
		graph.updateCell('B1', '=A1*2');
		graph.updateCell('C1', '=B1*2');
		graph.updateCell('D1', '=C1*2');

		const deps = graph.getAllDependents('A1');
		expect(deps).toEqual(new Set(['B1', 'C1', 'D1']));
	});

	it('handles diamond dependencies', () => {
		graph.updateCell('A1', '10');
		graph.updateCell('B1', '=A1*2');
		graph.updateCell('C1', '=A1*3');
		graph.updateCell('D1', '=B1+C1');

		const deps = graph.getAllDependents('A1');
		expect(deps).toEqual(new Set(['B1', 'C1', 'D1']));
	});

	it('returns empty set for cell with no dependents', () => {
		graph.updateCell('A1', '10');
		graph.updateCell('B1', '=A1');

		const deps = graph.getAllDependents('B1');
		expect(deps.size).toBe(0);
	});

	it('returns empty set for unknown cell', () => {
		const deps = graph.getAllDependents('Z99');
		expect(deps.size).toBe(0);
	});

	it('handles complex graph', () => {
		// A1 -> B1, C1
		// B1 -> D1
		// C1 -> D1, E1
		// D1 -> F1
		// E1 -> F1
		graph.updateCell('A1', '10');
		graph.updateCell('B1', '=A1');
		graph.updateCell('C1', '=A1');
		graph.updateCell('D1', '=B1+C1');
		graph.updateCell('E1', '=C1');
		graph.updateCell('F1', '=D1+E1');

		const deps = graph.getAllDependents('A1');
		expect(deps).toEqual(new Set(['B1', 'C1', 'D1', 'E1', 'F1']));
	});
});

// =============================================================================
// Edge Cases Tests
// =============================================================================

describe('DependencyGraph - edge cases', () => {
	it('handles empty graph', () => {
		expect(graph.isEmpty()).toBe(true);
		expect(graph.getCalculationOrder()).toEqual([]);
		expect(graph.detectCycle()).toBeNull();
		expect(graph.getStats().cellCount).toBe(0);
	});

	it('handles cell with no dependencies', () => {
		graph.updateCell('A1', '42');

		expect(graph.getDependencies('A1').size).toBe(0);
		// Cells with no dependencies (plain values) are not in calculation order
		expect(graph.getCalculationOrder()).toEqual([]);
	});

	it('handles ranges in formulas', () => {
		graph.updateCell('D1', '=SUM(A1:C1)');

		const deps = graph.getDependencies('D1');
		expect(deps).toContain('A1');
		expect(deps).toContain('B1');
		expect(deps).toContain('C1');
	});

	it('handles 2D ranges in formulas', () => {
		graph.updateCell('E1', '=SUM(A1:B2)');

		const deps = graph.getDependencies('E1');
		expect(deps).toContain('A1');
		expect(deps).toContain('A2');
		expect(deps).toContain('B1');
		expect(deps).toContain('B2');
		expect(deps.size).toBe(4);
	});

	it('clears the graph', () => {
		graph.updateCell('A1', '10');
		graph.updateCell('B1', '=A1');
		graph.clear();

		expect(graph.isEmpty()).toBe(true);
		expect(graph.getDependencies('B1').size).toBe(0);
		expect(graph.getDependents('A1').size).toBe(0);
	});

	it('handles formulas with multiple references to same cell', () => {
		graph.updateCell('B1', '=A1+A1+A1');

		const deps = graph.getDependencies('B1');
		expect(deps).toEqual(new Set(['A1']));
		expect(deps.size).toBe(1);
	});

	it('handles invalid formula gracefully', () => {
		graph.updateCell('A1', '=INVALID(');

		// Invalid formula has no dependencies
		const deps = graph.getDependencies('A1');
		expect(deps.size).toBe(0);
	});

	it('handles formula that becomes value', () => {
		graph.updateCell('B1', '=A1');
		expect(graph.getDependencies('B1')).toContain('A1');
		expect(graph.getDependents('A1')).toContain('B1');

		// Change to plain value
		graph.updateCell('B1', '42');
		expect(graph.getDependencies('B1').size).toBe(0);
		expect(graph.getDependents('A1').has('B1')).toBe(false);
	});
});

// =============================================================================
// Stats Tests
// =============================================================================

describe('DependencyGraph - getStats', () => {
	it('returns correct stats for simple graph', () => {
		// A1 is a plain value (not tracked unless referenced)
		// B1 has a formula referencing A1
		graph.updateCell('B1', '=A1');

		const stats = graph.getStats();
		// Only B1 and A1 (as dependency) are in the graph
		expect(stats.cellCount).toBe(2);
		expect(stats.edgeCount).toBe(1);
		expect(stats.maxDependencyDepth).toBe(1);
	});

	it('returns correct stats for chain', () => {
		// A1 is only known as a dependency of B1
		graph.updateCell('B1', '=A1');
		graph.updateCell('C1', '=B1');
		graph.updateCell('D1', '=C1');

		const stats = graph.getStats();
		expect(stats.cellCount).toBe(4); // A1, B1, C1, D1
		expect(stats.edgeCount).toBe(3);
		expect(stats.maxDependencyDepth).toBe(3);
	});

	it('returns correct stats for empty graph', () => {
		const stats = graph.getStats();
		expect(stats.cellCount).toBe(0);
		expect(stats.edgeCount).toBe(0);
		expect(stats.maxDependencyDepth).toBe(0);
	});

	it('returns correct stats for diamond pattern', () => {
		// A1 is only tracked as a dependency
		graph.updateCell('B1', '=A1');
		graph.updateCell('C1', '=A1');
		graph.updateCell('D1', '=B1+C1');

		const stats = graph.getStats();
		expect(stats.cellCount).toBe(4); // A1, B1, C1, D1
		expect(stats.edgeCount).toBe(4); // A1->B1, A1->C1, B1->D1, C1->D1
		expect(stats.maxDependencyDepth).toBe(2); // D1 -> B1/C1 -> A1
	});
});

// =============================================================================
// getAllCells Tests
// =============================================================================

describe('DependencyGraph - getAllCells', () => {
	it('returns all cells in graph', () => {
		graph.updateCell('A1', '10');
		graph.updateCell('B1', '=A1');
		graph.updateCell('C1', '=A1+B1');

		const cells = graph.getAllCells();
		expect(cells).toContain('A1');
		expect(cells).toContain('B1');
		expect(cells).toContain('C1');
		expect(cells.size).toBe(3);
	});

	it('returns empty set for empty graph', () => {
		const cells = graph.getAllCells();
		expect(cells.size).toBe(0);
	});

	it('includes cells that only appear as dependencies', () => {
		// Only C1 has a formula, but A1 and B1 should be tracked
		graph.updateCell('C1', '=A1+B1');

		const cells = graph.getAllCells();
		expect(cells).toContain('A1');
		expect(cells).toContain('B1');
		expect(cells).toContain('C1');
	});
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('DependencyGraph - integration', () => {
	it('handles realistic spreadsheet scenario', () => {
		// Price list
		graph.updateCell('A1', '100'); // Item 1 price
		graph.updateCell('A2', '200'); // Item 2 price
		graph.updateCell('A3', '150'); // Item 3 price

		// Quantities
		graph.updateCell('B1', '2');
		graph.updateCell('B2', '1');
		graph.updateCell('B3', '3');

		// Subtotals
		graph.updateCell('C1', '=A1*B1');
		graph.updateCell('C2', '=A2*B2');
		graph.updateCell('C3', '=A3*B3');

		// Total
		graph.updateCell('C4', '=SUM(C1:C3)');

		// Verify structure
		expect(graph.getDependencies('C1')).toEqual(new Set(['A1', 'B1']));
		expect(graph.getDependencies('C4')).toEqual(new Set(['C1', 'C2', 'C3']));

		// Verify transitive dependents
		const depsOfA1 = graph.getAllDependents('A1');
		expect(depsOfA1).toContain('C1');
		expect(depsOfA1).toContain('C4');

		// Verify calculation order
		const order = graph.getCalculationOrder();
		expect(order.indexOf('A1')).toBeLessThan(order.indexOf('C1'));
		expect(order.indexOf('C1')).toBeLessThan(order.indexOf('C4'));

		// Verify recalculation when A1 changes
		const recalcOrder = graph.getRecalculationOrder(['A1']);
		expect(recalcOrder).toContain('A1');
		expect(recalcOrder).toContain('C1');
		expect(recalcOrder).toContain('C4');
		expect(recalcOrder).not.toContain('C2');
		expect(recalcOrder).not.toContain('C3');

		// No cycles
		expect(graph.detectCycle()).toBeNull();
	});

	it('handles formula updates correctly', () => {
		graph.updateCell('A1', '10');
		graph.updateCell('B1', '=A1*2');
		graph.updateCell('C1', '=B1*2');

		// Verify initial state
		expect(graph.getAllDependents('A1')).toEqual(new Set(['B1', 'C1']));

		// Change B1 to not depend on A1
		graph.updateCell('B1', '20');

		// A1 should no longer affect C1 (through B1)
		expect(graph.getAllDependents('A1').size).toBe(0);

		// B1 should still affect C1
		expect(graph.getAllDependents('B1')).toEqual(new Set(['C1']));
	});

	it('prevents circular reference creation', () => {
		graph.updateCell('A1', '10');
		graph.updateCell('B1', '=A1');
		graph.updateCell('C1', '=B1');

		// Check if creating A1 = =C1 would cause a cycle
		expect(graph.wouldCreateCycle('A1', 'C1')).toBe(true);

		// But A1 = =D1 would be fine
		expect(graph.wouldCreateCycle('A1', 'D1')).toBe(false);
	});
});
