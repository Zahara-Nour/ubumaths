import { describe, it, expect } from 'vitest';
import ELK from 'elkjs/lib/elk.bundled.js';
import { buildDiagramGraph, frameNodeId, heapNodeId } from '../diagram-graph';
import { toElkGraph, layoutDiagram, type SizeMap } from '../diagram-layout';
import type {
	DebugStackFrame,
	DebugVariable,
	HeapObject,
	HeapEntry
} from '$lib/shared/python/debug/types';

// --- helpers (same shapes as diagram-graph.test.ts) --------------------------

function variable(name: string, value: unknown): DebugVariable {
	return { name, value: JSON.stringify(value), type: 'x', isBuiltin: true, isChanged: false };
}
const refVar = (name: string, objectId: string) => variable(name, { type: 'ref', objectId });
const intEntry = (v: number): HeapEntry => ({ value: { type: 'int', value: String(v) } });
function frame(functionName: string, locals: DebugVariable[]): DebugStackFrame {
	return { functionName, filename: '<exec>', lineNumber: 1, locals, isCurrentFrame: false };
}
function heapObj(id: string, entries: HeapEntry[]): HeapObject {
	return { id, type: 'list', length: entries.length, entries };
}

// --- tests -------------------------------------------------------------------

describe('toElkGraph', () => {
	it('maps frame ports to the EAST side and edges to port sources', () => {
		const graph = buildDiagramGraph(
			[frame('<module>', [refVar('a', 'obj1')])],
			[heapObj('obj1', [intEntry(1)])]
		);
		const sizes: SizeMap = {
			[frameNodeId(0)]: { width: 120, height: 40 },
			[heapNodeId('obj1')]: { width: 100, height: 60 }
		};

		const elk = toElkGraph(graph, sizes);

		expect(elk.id).toBe('root');
		expect(elk.children).toHaveLength(2);
		const frameChild = elk.children!.find((c) => c.id === frameNodeId(0))!;
		expect(frameChild.width).toBe(120);
		expect(frameChild.ports).toHaveLength(1);
		expect(frameChild.ports![0].layoutOptions?.['elk.port.side']).toBe('EAST');

		expect(elk.edges).toHaveLength(1);
		// the edge source is the port, not the node
		expect(elk.edges![0].sources[0]).toBe(graph.edges[0].sourcePort);
		expect(elk.edges![0].targets[0]).toBe(heapNodeId('obj1'));
	});
});

describe('layoutDiagram (real ELK)', () => {
	const elk = new ELK();

	it('produces node positions and edge polylines; frame is left of the heap', async () => {
		const graph = buildDiagramGraph(
			[frame('<module>', [refVar('a', 'obj1')])],
			[heapObj('obj1', [intEntry(1)])]
		);
		const sizes: SizeMap = {
			[frameNodeId(0)]: { width: 120, height: 40 },
			[heapNodeId('obj1')]: { width: 100, height: 60 }
		};

		const layout = await layoutDiagram(graph, sizes, elk);

		expect(layout.nodes).toHaveLength(2);
		for (const n of layout.nodes) {
			expect(Number.isFinite(n.x)).toBe(true);
			expect(Number.isFinite(n.y)).toBe(true);
			expect(n.width).toBeGreaterThan(0);
			expect(n.height).toBeGreaterThan(0);
		}

		expect(layout.edges).toHaveLength(1);
		expect(layout.edges[0].points.length).toBeGreaterThanOrEqual(2);
		expect(layout.edges[0].toObjectId).toBe('obj1');

		// RIGHT direction → the frame sits to the left of the heap object.
		const f = layout.nodes.find((n) => n.kind === 'frame')!;
		const h = layout.nodes.find((n) => n.kind === 'heap')!;
		expect(f.x).toBeLessThan(h.x);

		expect(layout.width).toBeGreaterThan(0);
		expect(layout.height).toBeGreaterThan(0);
	});

	it('lays out a 3-node linked list without throwing (chain of edges)', async () => {
		const graph = buildDiagramGraph(
			[frame('<module>', [refVar('head', 'n1')])],
			[
				heapObj('n1', [intEntry(1), { value: { type: 'ref', objectId: 'n2' } }]),
				heapObj('n2', [intEntry(2), { value: { type: 'ref', objectId: 'n3' } }]),
				heapObj('n3', [intEntry(3)])
			]
		);
		const sizes: SizeMap = Object.fromEntries(
			graph.nodes.map((n) => [n.id, { width: 100, height: 50 }])
		);

		const layout = await layoutDiagram(graph, sizes, elk);

		expect(layout.nodes).toHaveLength(4); // 1 frame + 3 heap
		expect(layout.edges).toHaveLength(3);
		expect(layout.edges.every((e) => e.points.length >= 2)).toBe(true);
	});
});
