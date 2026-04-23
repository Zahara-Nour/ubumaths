import { describe, it, expect } from 'vitest';
import { DependencyGraph, CycleError } from '../dependency-graph';

function createGraph(): DependencyGraph {
	return new DependencyGraph();
}

// =============================================================================
// Adding nodes
// =============================================================================

describe('addNode', () => {
	it('adds a root node (no parents)', () => {
		const g = createGraph();
		g.addNode('A', []);
		expect(g.hasNode('A')).toBe(true);
		expect(g.size).toBe(1);
	});

	it('adds a node with parents', () => {
		const g = createGraph();
		g.addNode('A', []);
		g.addNode('B', []);
		g.addNode('seg', ['A', 'B']);
		expect(g.hasNode('seg')).toBe(true);
		expect(g.size).toBe(3);
	});

	it('throws if node id already exists', () => {
		const g = createGraph();
		g.addNode('A', []);
		expect(() => g.addNode('A', [])).toThrow();
	});

	it('throws if parent does not exist', () => {
		const g = createGraph();
		expect(() => g.addNode('seg', ['A', 'B'])).toThrow();
	});

	it('throws on duplicate parent IDs', () => {
		const g = createGraph();
		g.addNode('A', []);
		expect(() => g.addNode('seg', ['A', 'A'])).toThrow('duplicate');
	});

	it('hasNode returns false for unknown id', () => {
		const g = createGraph();
		expect(g.hasNode('X')).toBe(false);
	});

	it('size starts at 0', () => {
		expect(createGraph().size).toBe(0);
	});
});

// =============================================================================
// Parents and children
// =============================================================================

describe('getParents / getChildren', () => {
	it('getParents returns parent ids', () => {
		const g = createGraph();
		g.addNode('A', []);
		g.addNode('B', []);
		g.addNode('seg', ['A', 'B']);
		expect(g.getParents('seg')).toEqual(['A', 'B']);
	});

	it('getParents of root returns empty array', () => {
		const g = createGraph();
		g.addNode('A', []);
		expect(g.getParents('A')).toEqual([]);
	});

	it('getChildren returns child ids', () => {
		const g = createGraph();
		g.addNode('A', []);
		g.addNode('B', []);
		g.addNode('seg', ['A', 'B']);
		expect(g.getChildren('A')).toContain('seg');
		expect(g.getChildren('B')).toContain('seg');
	});

	it('getChildren of leaf returns empty array', () => {
		const g = createGraph();
		g.addNode('A', []);
		g.addNode('seg', ['A']);
		expect(g.getChildren('seg')).toEqual([]);
	});

	it('a node can have multiple children', () => {
		const g = createGraph();
		g.addNode('A', []);
		g.addNode('B', []);
		g.addNode('seg1', ['A', 'B']);
		g.addNode('seg2', ['A', 'B']);
		const children = g.getChildren('A');
		expect(children).toContain('seg1');
		expect(children).toContain('seg2');
		expect(children.length).toBe(2);
	});
});

// =============================================================================
// Dirty flags and propagation
// =============================================================================

describe('markDirty', () => {
	it('marks a single node dirty', () => {
		const g = createGraph();
		g.addNode('A', []);
		g.markDirty('A');
		expect(g.getDirtyInOrder()).toEqual(['A']);
	});

	it('propagates dirty to all descendants', () => {
		const g = createGraph();
		g.addNode('A', []);
		g.addNode('B', []);
		g.addNode('seg', ['A', 'B']);
		g.addNode('mid', ['seg']);
		g.markDirty('A');
		const dirty = g.getDirtyInOrder();
		expect(dirty).toContain('A');
		expect(dirty).toContain('seg');
		expect(dirty).toContain('mid');
		// B is NOT dirty (not a descendant of A)
		expect(dirty).not.toContain('B');
	});

	it('does not duplicate when marking already-dirty node', () => {
		const g = createGraph();
		g.addNode('A', []);
		g.addNode('seg', ['A']);
		g.markDirty('A');
		g.markDirty('A'); // second mark
		const dirty = g.getDirtyInOrder();
		expect(dirty.filter((id) => id === 'A').length).toBe(1);
		expect(dirty.filter((id) => id === 'seg').length).toBe(1);
	});

	it('deduplicates when child has multiple dirty parents', () => {
		const g = createGraph();
		g.addNode('A', []);
		g.addNode('B', []);
		g.addNode('seg', ['A', 'B']);
		g.markDirty('A');
		g.markDirty('B');
		const dirty = g.getDirtyInOrder();
		// seg should appear only once even though both parents are dirty
		expect(dirty.filter((id) => id === 'seg').length).toBe(1);
	});

	it('getDirtyInOrder clears the dirty set', () => {
		const g = createGraph();
		g.addNode('A', []);
		g.markDirty('A');
		expect(g.getDirtyInOrder()).toEqual(['A']);
		// Second call: dirty set was cleared
		expect(g.getDirtyInOrder()).toEqual([]);
	});

	it('returns empty array if nothing is dirty', () => {
		const g = createGraph();
		g.addNode('A', []);
		expect(g.getDirtyInOrder()).toEqual([]);
	});

	it('throws if marking non-existent node', () => {
		const g = createGraph();
		expect(() => g.markDirty('X')).toThrow();
	});
});

// =============================================================================
// Topological order
// =============================================================================

describe('topological order', () => {
	it('parents come before children', () => {
		const g = createGraph();
		g.addNode('A', []);
		g.addNode('B', []);
		g.addNode('seg', ['A', 'B']);
		g.addNode('mid', ['seg']);
		g.markDirty('A');
		g.markDirty('B');
		const order = g.getDirtyInOrder();

		const idxA = order.indexOf('A');
		const idxB = order.indexOf('B');
		const idxSeg = order.indexOf('seg');
		const idxMid = order.indexOf('mid');

		expect(idxA).toBeLessThan(idxSeg);
		expect(idxB).toBeLessThan(idxSeg);
		expect(idxSeg).toBeLessThan(idxMid);
	});

	it('diamond dependency: C depends on both A->B and A->D', () => {
		const g = createGraph();
		g.addNode('A', []);
		g.addNode('B', ['A']);
		g.addNode('D', ['A']);
		g.addNode('C', ['B', 'D']);
		g.markDirty('A');
		const order = g.getDirtyInOrder();

		expect(order.indexOf('A')).toBeLessThan(order.indexOf('B'));
		expect(order.indexOf('A')).toBeLessThan(order.indexOf('D'));
		expect(order.indexOf('B')).toBeLessThan(order.indexOf('C'));
		expect(order.indexOf('D')).toBeLessThan(order.indexOf('C'));
		// C appears only once
		expect(order.filter((id) => id === 'C').length).toBe(1);
	});

	it('long chain: A -> B -> C -> D -> E', () => {
		const g = createGraph();
		g.addNode('A', []);
		g.addNode('B', ['A']);
		g.addNode('C', ['B']);
		g.addNode('D', ['C']);
		g.addNode('E', ['D']);
		g.markDirty('A');
		const order = g.getDirtyInOrder();
		expect(order).toEqual(['A', 'B', 'C', 'D', 'E']);
	});

	it('only dirty subtree is returned, not the whole graph', () => {
		const g = createGraph();
		g.addNode('A', []);
		g.addNode('B', []);
		g.addNode('segA', ['A']);
		g.addNode('segB', ['B']);
		g.markDirty('B');
		const order = g.getDirtyInOrder();
		expect(order).toContain('B');
		expect(order).toContain('segB');
		expect(order).not.toContain('A');
		expect(order).not.toContain('segA');
	});

	it('marking a leaf dirty returns only that leaf', () => {
		const g = createGraph();
		g.addNode('A', []);
		g.addNode('seg', ['A']);
		g.markDirty('seg');
		expect(g.getDirtyInOrder()).toEqual(['seg']);
	});
});

// =============================================================================
// Cycle detection
// =============================================================================

describe('cycle detection', () => {
	it('self-reference throws CycleError', () => {
		const g = createGraph();
		expect(() => g.addNode('A', ['A'])).toThrow(CycleError);
	});

	it('transitive cycle is impossible via addNode (new node has no children)', () => {
		// addNode only adds NEW nodes with no children yet,
		// so a new node cannot be an ancestor of any parent.
		const g = createGraph();
		g.addNode('A', []);
		g.addNode('B', ['A']);
		g.addNode('C', ['B']);
		expect(() => g.addNode('D', ['C'])).not.toThrow();
	});

	it('diamond DAG is not a cycle', () => {
		const g = createGraph();
		g.addNode('A', []);
		g.addNode('B', ['A']);
		g.addNode('C', ['A']);
		expect(() => g.addNode('D', ['B', 'C'])).not.toThrow();
		expect(g.size).toBe(4);
	});

	it('CycleError is an instance of Error', () => {
		const g = createGraph();
		try {
			g.addNode('A', ['A']);
		} catch (e) {
			expect(e).toBeInstanceOf(CycleError);
			expect(e).toBeInstanceOf(Error);
		}
	});
});

// =============================================================================
// Cascade delete
// =============================================================================

describe('removeNode', () => {
	it('removes a leaf node', () => {
		const g = createGraph();
		g.addNode('A', []);
		g.addNode('seg', ['A']);
		const removed = g.removeNode('seg');
		expect(removed).toEqual(['seg']);
		expect(g.hasNode('seg')).toBe(false);
		expect(g.hasNode('A')).toBe(true);
		expect(g.size).toBe(1);
	});

	it('cascade removes all descendants', () => {
		const g = createGraph();
		g.addNode('A', []);
		g.addNode('B', []);
		g.addNode('seg', ['A', 'B']);
		g.addNode('mid', ['seg']);
		const removed = g.removeNode('A');
		expect(removed).toContain('A');
		expect(removed).toContain('seg');
		expect(removed).toContain('mid');
		expect(g.hasNode('A')).toBe(false);
		expect(g.hasNode('seg')).toBe(false);
		expect(g.hasNode('mid')).toBe(false);
		// B survives (not a descendant of A)
		expect(g.hasNode('B')).toBe(true);
		expect(g.size).toBe(1);
	});

	it('cleans up parent references of removed nodes', () => {
		const g = createGraph();
		g.addNode('A', []);
		g.addNode('B', []);
		g.addNode('seg', ['A', 'B']);
		g.removeNode('seg');
		// A and B should no longer list seg as child
		expect(g.getChildren('A')).toEqual([]);
		expect(g.getChildren('B')).toEqual([]);
	});

	it('removes dirty flags of removed nodes', () => {
		const g = createGraph();
		g.addNode('A', []);
		g.addNode('seg', ['A']);
		g.markDirty('A');
		g.removeNode('A');
		expect(g.getDirtyInOrder()).toEqual([]);
	});

	it('throws if node does not exist', () => {
		const g = createGraph();
		expect(() => g.removeNode('X')).toThrow();
	});

	it('removes a root node and all its descendants', () => {
		const g = createGraph();
		g.addNode('A', []);
		const removed = g.removeNode('A');
		expect(removed).toEqual(['A']);
		expect(g.size).toBe(0);
	});

	it('deep cascade: A -> B -> C -> D', () => {
		const g = createGraph();
		g.addNode('A', []);
		g.addNode('B', ['A']);
		g.addNode('C', ['B']);
		g.addNode('D', ['C']);
		const removed = g.removeNode('A');
		expect(removed.length).toBe(4);
		expect(g.size).toBe(0);
	});

	it('partial cascade in diamond: remove B from A->B->D, A->C->D', () => {
		const g = createGraph();
		g.addNode('A', []);
		g.addNode('B', ['A']);
		g.addNode('C', ['A']);
		g.addNode('D', ['B', 'C']);
		// Removing B should cascade to D (D depends on B)
		const removed = g.removeNode('B');
		expect(removed).toContain('B');
		expect(removed).toContain('D');
		expect(g.hasNode('A')).toBe(true);
		expect(g.hasNode('C')).toBe(true);
		expect(g.size).toBe(2);
	});
});

// =============================================================================
// Edge cases
// =============================================================================

describe('edge cases', () => {
	it('empty graph has size 0 and empty dirty order', () => {
		const g = createGraph();
		expect(g.size).toBe(0);
		expect(g.getDirtyInOrder()).toEqual([]);
	});

	it('single node graph works correctly', () => {
		const g = createGraph();
		g.addNode('A', []);
		g.markDirty('A');
		expect(g.getDirtyInOrder()).toEqual(['A']);
		g.removeNode('A');
		expect(g.size).toBe(0);
	});

	it('many independent roots', () => {
		const g = createGraph();
		for (let i = 0; i < 100; i++) {
			g.addNode(`P${i}`, []);
		}
		expect(g.size).toBe(100);
		g.markDirty('P50');
		expect(g.getDirtyInOrder()).toEqual(['P50']);
	});

	it('wide fan: one parent, many children', () => {
		const g = createGraph();
		g.addNode('center', []);
		for (let i = 0; i < 20; i++) {
			g.addNode(`child${i}`, ['center']);
		}
		g.markDirty('center');
		const order = g.getDirtyInOrder();
		expect(order[0]).toBe('center');
		expect(order.length).toBe(21); // center + 20 children
	});

	it('nodeIds returns all node ids', () => {
		const g = createGraph();
		g.addNode('A', []);
		g.addNode('B', []);
		g.addNode('C', ['A']);
		const ids = g.nodeIds;
		expect(ids).toContain('A');
		expect(ids).toContain('B');
		expect(ids).toContain('C');
		expect(ids.length).toBe(3);
	});
});
