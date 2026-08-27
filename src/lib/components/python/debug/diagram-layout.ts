/**
 * Memory-diagram layout via elkjs.
 *
 * Converts a `DiagramGraph` (+ measured node sizes) into an ELK graph, runs the
 * layered layout (frames on the left, heap flowing right, orthogonal edges,
 * crossings minimised), and parses the result back into absolute node positions
 * and edge polylines the renderer can draw directly.
 *
 * The ELK engine is **injected** (`ElkLike`) so this module stays testable with
 * the bundled ELK in node, while the component passes a Web-Worker-backed
 * instance (lazy-loaded).
 */

import type { ElkNode } from 'elkjs/lib/elk-api';
import type { DiagramGraph } from './diagram-graph';

export interface NodeSize {
	width: number;
	height: number;
}
export type SizeMap = Record<string, NodeSize>;

export interface LaidOutNode {
	id: string;
	kind: 'frame' | 'heap';
	x: number;
	y: number;
	width: number;
	height: number;
	frameIndex?: number;
	objectId?: string;
}

export interface LaidOutEdge {
	id: string;
	/** Absolute polyline points (start → bends → end). */
	points: { x: number; y: number }[];
	toObjectId: string;
}

export interface DiagramLayout {
	nodes: LaidOutNode[];
	edges: LaidOutEdge[];
	width: number;
	height: number;
}

/** Minimal ELK surface we depend on (bundled instance or worker-backed). */
export interface ElkLike {
	layout(graph: ElkNode): Promise<ElkNode>;
}

/** Fallback size when a node hasn't been measured yet. */
const DEFAULT_NODE_SIZE: NodeSize = { width: 140, height: 48 };

const ROOT_LAYOUT_OPTIONS: Record<string, string> = {
	'elk.algorithm': 'layered',
	'elk.direction': 'RIGHT',
	'elk.edgeRouting': 'ORTHOGONAL',
	'elk.layered.spacing.nodeNodeBetweenLayers': '56',
	'elk.spacing.nodeNode': '24',
	'elk.spacing.edgeNode': '16',
	'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP'
};

/**
 * Build the ELK graph from a `DiagramGraph` and a measured size map.
 * Frame nodes expose their ports on the EAST side so edges leave rightward.
 */
export function toElkGraph(graph: DiagramGraph, sizes: SizeMap): ElkNode {
	const children = graph.nodes.map((node) => {
		const size = sizes[node.id] ?? DEFAULT_NODE_SIZE;
		const child: ElkNode = {
			id: node.id,
			width: size.width,
			height: size.height
		};
		if (node.ports.length > 0) {
			child.layoutOptions = { 'elk.portConstraints': 'FIXED_SIDE' };
			child.ports = node.ports.map((port) => ({
				id: port.id,
				layoutOptions: { 'elk.port.side': 'EAST' }
			}));
		}
		return child;
	});

	const edges = graph.edges.map((edge) => ({
		id: edge.id,
		sources: [edge.sourcePort ?? edge.sourceNode],
		targets: [edge.target]
	}));

	return {
		id: 'root',
		layoutOptions: ROOT_LAYOUT_OPTIONS,
		children,
		edges
	};
}

/**
 * Parse an ELK layout result back into absolute node positions + edge polylines.
 */
export function elkToLayout(result: ElkNode, graph: DiagramGraph): DiagramLayout {
	const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));

	const nodes: LaidOutNode[] = (result.children ?? []).map((child) => {
		const meta = nodeById.get(child.id);
		return {
			id: child.id,
			kind: meta?.kind ?? 'heap',
			x: child.x ?? 0,
			y: child.y ?? 0,
			width: child.width ?? DEFAULT_NODE_SIZE.width,
			height: child.height ?? DEFAULT_NODE_SIZE.height,
			frameIndex: meta?.frameIndex,
			objectId: meta?.objectId
		};
	});

	const edgeById = new Map(graph.edges.map((e) => [e.id, e]));
	const edges: LaidOutEdge[] = (result.edges ?? []).map((edge) => {
		const section = edge.sections?.[0];
		const points = section
			? [section.startPoint, ...(section.bendPoints ?? []), section.endPoint].map((p) => ({
					x: p.x,
					y: p.y
				}))
			: [];
		return {
			id: edge.id,
			points,
			toObjectId: edgeById.get(edge.id)?.toObjectId ?? ''
		};
	});

	return {
		nodes,
		edges,
		width: result.width ?? 0,
		height: result.height ?? 0
	};
}

/**
 * Lay out a diagram graph: convert → run ELK → parse geometry.
 */
export async function layoutDiagram(
	graph: DiagramGraph,
	sizes: SizeMap,
	elk: ElkLike
): Promise<DiagramLayout> {
	const elkGraph = toElkGraph(graph, sizes);
	const result = await elk.layout(elkGraph);
	return elkToLayout(result, graph);
}
