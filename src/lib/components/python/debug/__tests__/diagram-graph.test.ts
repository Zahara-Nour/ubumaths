import { describe, it, expect } from 'vitest';
import { buildDiagramGraph, frameNodeId, heapNodeId } from '../diagram-graph';
import type {
	DebugStackFrame,
	DebugVariable,
	HeapObject,
	HeapEntry
} from '$lib/shared/python/debug/types';

// --- helpers -----------------------------------------------------------------

function variable(name: string, value: unknown): DebugVariable {
	return { name, value: JSON.stringify(value), type: 'x', isBuiltin: true, isChanged: false };
}
const refVar = (name: string, objectId: string) => variable(name, { type: 'ref', objectId });
const intVar = (name: string, v: number) => variable(name, { type: 'int', value: String(v) });

function frame(functionName: string, locals: DebugVariable[]): DebugStackFrame {
	return { functionName, filename: '<exec>', lineNumber: 1, locals, isCurrentFrame: false };
}

const refEntry = (objectId: string): HeapEntry => ({ value: { type: 'ref', objectId } });
const intEntry = (v: number): HeapEntry => ({ value: { type: 'int', value: String(v) } });
function heapObj(id: string, entries: HeapEntry[]): HeapObject {
	return { id, type: 'list', length: entries.length, entries };
}

// --- tests -------------------------------------------------------------------

describe('buildDiagramGraph', () => {
	it('empty snapshot → empty graph', () => {
		expect(buildDiagramGraph([], [])).toEqual({ nodes: [], edges: [] });
	});

	it('frame with only primitives → frame node, no ports/edges', () => {
		const g = buildDiagramGraph([frame('<module>', [intVar('x', 5)])], []);
		expect(g.nodes).toHaveLength(1);
		expect(g.nodes[0].kind).toBe('frame');
		expect(g.nodes[0].ports).toEqual([]);
		expect(g.edges).toEqual([]);
	});

	it('frame variable pointing to a heap object → 1 port + 1 edge', () => {
		const g = buildDiagramGraph(
			[frame('<module>', [refVar('a', 'obj1')])],
			[heapObj('obj1', [intEntry(1)])]
		);

		const frameN = g.nodes.find((n) => n.kind === 'frame')!;
		expect(frameN.ports).toHaveLength(1);
		expect(frameN.ports[0].varName).toBe('a');

		expect(g.edges).toHaveLength(1);
		expect(g.edges[0].sourceNode).toBe(frameNodeId(0));
		expect(g.edges[0].sourcePort).toBe(frameN.ports[0].id);
		expect(g.edges[0].target).toBe(heapNodeId('obj1'));
		expect(g.edges[0].toObjectId).toBe('obj1');
	});

	it('aliases: two variables to the same object → two edges, one heap node', () => {
		const g = buildDiagramGraph(
			[frame('<module>', [refVar('a', 'obj1'), refVar('b', 'obj1')])],
			[heapObj('obj1', [])]
		);

		expect(g.nodes.filter((n) => n.kind === 'heap')).toHaveLength(1);
		expect(g.edges).toHaveLength(2);
		expect(g.edges.every((e) => e.target === heapNodeId('obj1'))).toBe(true);
	});

	it('heap entry pointing to another object → heap→heap edge', () => {
		const g = buildDiagramGraph([], [heapObj('a', [refEntry('b')]), heapObj('b', [])]);

		expect(g.edges).toHaveLength(1);
		expect(g.edges[0].sourceNode).toBe(heapNodeId('a'));
		expect(g.edges[0].sourcePort).toBeUndefined();
		expect(g.edges[0].target).toBe(heapNodeId('b'));
	});

	it('dangling reference (object absent from heap) is skipped', () => {
		const g = buildDiagramGraph(
			[frame('<module>', [refVar('a', 'ghost')])],
			[heapObj('real', [refEntry('ghost')])]
		);
		expect(g.edges).toEqual([]);
		expect(g.nodes.find((n) => n.kind === 'frame')!.ports).toEqual([]);
	});

	it('linked list of 3 nodes → 1 frame edge + 2 heap→heap edges', () => {
		const g = buildDiagramGraph(
			[frame('<module>', [refVar('head', 'n1')])],
			[
				heapObj('n1', [intEntry(1), refEntry('n2')]),
				heapObj('n2', [intEntry(2), refEntry('n3')]),
				heapObj('n3', [intEntry(3)])
			]
		);

		expect(g.nodes.filter((n) => n.kind === 'heap')).toHaveLength(3);
		expect(g.edges).toHaveLength(3); // head→n1, n1→n2, n2→n3
		expect(g.edges.filter((e) => e.sourcePort !== undefined)).toHaveLength(1); // only the frame edge
	});
});
