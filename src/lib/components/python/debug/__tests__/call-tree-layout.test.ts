import { describe, it, expect } from 'vitest';
import ELK from 'elkjs/lib/elk.bundled.js';
import { toElkTree, layoutCallTree } from '../call-tree-layout';
import type { CallTreeNode } from '../call-tree';
import type { SizeMap } from '../diagram-layout';

// fact(3) → fact(2) → fact(1)
const tree: CallTreeNode[] = [
	{
		id: 'a',
		functionName: 'fact',
		args: [{ name: 'n', value: '3' }],
		callStepIndex: 0,
		children: [
			{
				id: 'b',
				functionName: 'fact',
				args: [{ name: 'n', value: '2' }],
				callStepIndex: 1,
				children: [
					{
						id: 'c',
						functionName: 'fact',
						args: [{ name: 'n', value: '1' }],
						callStepIndex: 2,
						children: []
					}
				]
			}
		]
	}
];
const sizes: SizeMap = {
	a: { width: 100, height: 40 },
	b: { width: 100, height: 40 },
	c: { width: 100, height: 40 }
};

describe('toElkTree', () => {
	it('flattens the forest into nodes + parent→child edges', () => {
		const g = toElkTree(tree, sizes);
		expect(g.children).toHaveLength(3);
		expect(g.edges).toHaveLength(2); // a→b, b→c
		expect(g.layoutOptions?.['elk.algorithm']).toBe('mrtree');
	});
});

describe('layoutCallTree (real ELK)', () => {
	const elk = new ELK();

	it('empty forest → empty layout', async () => {
		expect(await layoutCallTree([], {}, elk)).toEqual({
			nodes: [],
			edges: [],
			width: 0,
			height: 0
		});
	});

	it('lays out a chain top-down with edge polylines', async () => {
		const layout = await layoutCallTree(tree, sizes, elk);

		expect(layout.nodes).toHaveLength(3);
		for (const n of layout.nodes) {
			expect(Number.isFinite(n.x)).toBe(true);
			expect(Number.isFinite(n.y)).toBe(true);
			expect(n.width).toBeGreaterThan(0);
		}

		// Direction DOWN → the root sits above the deepest node.
		const a = layout.nodes.find((n) => n.id === 'a')!;
		const c = layout.nodes.find((n) => n.id === 'c')!;
		expect(a.y).toBeLessThan(c.y);

		expect(layout.edges).toHaveLength(2);
		expect(layout.edges.every((e) => e.points.length >= 2)).toBe(true);
		expect(layout.width).toBeGreaterThan(0);
		expect(layout.height).toBeGreaterThan(0);
	});
});
