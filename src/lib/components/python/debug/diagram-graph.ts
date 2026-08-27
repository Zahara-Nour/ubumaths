/**
 * Memory-diagram graph builder.
 *
 * Turns a debug snapshot's call stack + heap into a layout-agnostic graph
 * (nodes + ports + edges) that is fed to elkjs for layout. Pure and
 * framework-free → unit-testable, and the same structure drives both the
 * layout and the SVG rendering.
 *
 * - Frame node: one per call-stack frame, with a **port** per variable that
 *   holds a heap reference (so edges attach at the right variable row).
 * - Heap node: one per `HeapObject`.
 * - Edge: frame-variable → heap object (from the port), and heap-entry → heap
 *   object. Aliases (two variables to the same object) naturally produce two
 *   edges to the same heap node. Dangling references (to an object absent from
 *   `heap`) are skipped.
 */

import type { DebugStackFrame, HeapObject } from '$lib/shared/python/debug/types';
import { parseVariableValue, isHeapRef, isEntryRef } from './heap-utils';

export const FRAME_NODE_PREFIX = 'frame:';
export const HEAP_NODE_PREFIX = 'heap:';

export function frameNodeId(index: number): string {
	return `${FRAME_NODE_PREFIX}${index}`;
}

export function heapNodeId(objectId: string): string {
	return `${HEAP_NODE_PREFIX}${objectId}`;
}

/** A port on a frame node — one per reference-holding variable. */
export interface DiagramPort {
	id: string;
	varName: string;
}

export interface DiagramNode {
	id: string;
	kind: 'frame' | 'heap';
	/** frame nodes only */
	frameIndex?: number;
	functionName?: string;
	/** heap nodes only */
	objectId?: string;
	ports: DiagramPort[];
}

export interface DiagramEdge {
	id: string;
	sourceNode: string;
	/** set for frame→heap edges (attaches to the variable's port) */
	sourcePort?: string;
	target: string;
	/** objectId of the pointed-to heap object (for stable arrow coloring) */
	toObjectId: string;
}

export interface DiagramGraph {
	nodes: DiagramNode[];
	edges: DiagramEdge[];
}

/**
 * Build the diagram graph from a snapshot's call stack and heap.
 */
export function buildDiagramGraph(callStack: DebugStackFrame[], heap: HeapObject[]): DiagramGraph {
	const heapIds = new Set(heap.map((o) => o.id));
	const nodes: DiagramNode[] = [];
	const edges: DiagramEdge[] = [];

	// Heap nodes.
	for (const obj of heap) {
		nodes.push({ id: heapNodeId(obj.id), kind: 'heap', objectId: obj.id, ports: [] });
	}

	// Frame nodes + frame→heap edges (via ports).
	callStack.forEach((frame, frameIndex) => {
		const ports: DiagramPort[] = [];
		const node: DiagramNode = {
			id: frameNodeId(frameIndex),
			kind: 'frame',
			frameIndex,
			functionName: frame.functionName,
			ports
		};

		for (const variable of frame.locals) {
			const parsed = parseVariableValue(variable.value);
			if (!parsed || !isHeapRef(parsed)) continue;
			if (!heapIds.has(parsed.objectId)) continue; // dangling reference → skip

			const portId = `${node.id}:${variable.name}`;
			ports.push({ id: portId, varName: variable.name });
			edges.push({
				id: `edge:${portId}`,
				sourceNode: node.id,
				sourcePort: portId,
				target: heapNodeId(parsed.objectId),
				toObjectId: parsed.objectId
			});
		}

		nodes.push(node);
	});

	// Heap→heap edges.
	for (const obj of heap) {
		obj.entries.forEach((entry, entryIndex) => {
			if (!isEntryRef(entry)) return;
			const targetId = entry.value.objectId;
			if (!heapIds.has(targetId)) return; // dangling reference → skip

			edges.push({
				id: `edge:${heapNodeId(obj.id)}:${entryIndex}`,
				sourceNode: heapNodeId(obj.id),
				target: heapNodeId(targetId),
				toObjectId: targetId
			});
		});
	}

	return { nodes, edges };
}
