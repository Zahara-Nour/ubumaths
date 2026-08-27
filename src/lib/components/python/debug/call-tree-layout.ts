/**
 * Call-tree layout via elkjs.
 *
 * Flattens the call-tree forest into an ELK graph (one node per call, edges
 * parent → child) and runs a tidy top-down tree layout (`mrtree` = Reingold–
 * Tilford), returning absolute node positions + edge polylines. The ELK engine
 * is injected (`ElkLike`) so this stays testable with the bundled ELK in node.
 */

import type { ElkNode } from 'elkjs/lib/elk-api';
import type { CallTreeNode } from './call-tree';
import type { ElkLike, SizeMap, NodeSize } from './diagram-layout';

export interface TreeLaidOutNode {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
}
export interface TreeLaidOutEdge {
	id: string;
	points: { x: number; y: number }[];
}
export interface CallTreeLayout {
	nodes: TreeLaidOutNode[];
	edges: TreeLaidOutEdge[];
	width: number;
	height: number;
}

const DEFAULT_NODE_SIZE: NodeSize = { width: 120, height: 44 };

const ROOT_LAYOUT_OPTIONS: Record<string, string> = {
	'elk.algorithm': 'mrtree',
	'elk.direction': 'DOWN',
	'elk.spacing.nodeNode': '28',
	'elk.mrtree.spacing.nodeNode': '28'
};

/** Depth-first flatten of the forest into a flat node list. */
export function flattenTree(tree: CallTreeNode[]): CallTreeNode[] {
	const out: CallTreeNode[] = [];
	const walk = (n: CallTreeNode) => {
		out.push(n);
		n.children.forEach(walk);
	};
	tree.forEach(walk);
	return out;
}

/** Build the ELK graph (parent → child edges) from the call-tree forest. */
export function toElkTree(tree: CallTreeNode[], sizes: SizeMap): ElkNode {
	const nodes = flattenTree(tree);
	const children = nodes.map((n) => {
		const size = sizes[n.id] ?? DEFAULT_NODE_SIZE;
		return { id: n.id, width: size.width, height: size.height };
	});
	const edges = nodes.flatMap((n) =>
		n.children.map((c) => ({ id: `edge-${n.id}-${c.id}`, sources: [n.id], targets: [c.id] }))
	);
	return { id: 'root', layoutOptions: ROOT_LAYOUT_OPTIONS, children, edges };
}

/** Parse an ELK result into absolute node positions + edge polylines. */
export function elkTreeToLayout(result: ElkNode): CallTreeLayout {
	const nodes: TreeLaidOutNode[] = (result.children ?? []).map((child) => ({
		id: child.id,
		x: child.x ?? 0,
		y: child.y ?? 0,
		width: child.width ?? DEFAULT_NODE_SIZE.width,
		height: child.height ?? DEFAULT_NODE_SIZE.height
	}));
	const edges: TreeLaidOutEdge[] = (result.edges ?? []).map((edge) => {
		const section = edge.sections?.[0];
		const points = section
			? [section.startPoint, ...(section.bendPoints ?? []), section.endPoint].map((p) => ({
					x: p.x,
					y: p.y
				}))
			: [];
		return { id: edge.id, points };
	});
	return { nodes, edges, width: result.width ?? 0, height: result.height ?? 0 };
}

/** Lay out a call-tree forest: convert → run ELK → parse geometry. */
export async function layoutCallTree(
	tree: CallTreeNode[],
	sizes: SizeMap,
	elk: ElkLike
): Promise<CallTreeLayout> {
	if (tree.length === 0) return { nodes: [], edges: [], width: 0, height: 0 };
	const graph = toElkTree(tree, sizes);
	const result = await elk.layout(graph);
	return elkTreeToLayout(result);
}
