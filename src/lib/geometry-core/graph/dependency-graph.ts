/**
 * Dependency graph for geometric constructions.
 *
 * Tracks parent-child relationships between elements (by string ID).
 * Provides:
 * - Dirty flag propagation (mark a node, all descendants become dirty)
 * - Topological sort of dirty nodes (Kahn's algorithm)
 * - Cycle detection on addNode (self-reference only — transitive cycles are
 *   structurally impossible since addNode only adds NEW nodes with no children)
 * - Cascade deletion (remove a node and all its descendants)
 */

export class CycleError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'CycleError';
	}
}

export class DependencyGraph {
	private parents = new Map<string, string[]>();
	private children = new Map<string, Set<string>>();
	private dirty = new Set<string>();

	/**
	 * Add a node with its parent dependencies.
	 * Throws if: node already exists, a parent doesn't exist, self-reference,
	 * or duplicate parent IDs.
	 */
	addNode(id: string, parentIds: readonly string[]): void {
		if (this.parents.has(id)) {
			throw new Error(`Node "${id}" already exists`);
		}

		if (parentIds.includes(id)) {
			throw new CycleError(`Adding "${id}" depending on itself would create a cycle`);
		}

		// Reject duplicate parent IDs (would corrupt in-degree counting in topo sort)
		const uniqueParents = new Set(parentIds);
		if (uniqueParents.size !== parentIds.length) {
			throw new Error(`addNode "${id}": duplicate parent IDs are not allowed`);
		}

		for (const pid of parentIds) {
			if (!this.parents.has(pid)) {
				throw new Error(`Parent "${pid}" does not exist`);
			}
		}

		this.parents.set(id, [...parentIds]);
		this.children.set(id, new Set());

		for (const pid of parentIds) {
			this.children.get(pid)!.add(id);
		}
	}

	/**
	 * Remove a node and cascade-delete all its descendants.
	 * Returns the list of removed node IDs.
	 */
	removeNode(id: string): string[] {
		if (!this.parents.has(id)) {
			throw new Error(`Node "${id}" does not exist`);
		}

		const removed: string[] = [];
		const seen = new Set<string>();
		this.collectDescendants(id, removed, seen);

		for (const rid of removed) {
			for (const pid of this.parents.get(rid) ?? []) {
				this.children.get(pid)?.delete(rid);
			}
			this.parents.delete(rid);
			this.children.delete(rid);
			this.dirty.delete(rid);
		}

		return removed;
	}

	/** Collect a node and all its descendants (depth-first, O(1) dedup via Set). */
	private collectDescendants(id: string, result: string[], seen: Set<string>): void {
		if (seen.has(id)) return;
		seen.add(id);
		result.push(id);
		for (const cid of this.children.get(id) ?? []) {
			this.collectDescendants(cid, result, seen);
		}
	}

	/**
	 * Mark a node and all its descendants as dirty.
	 * Throws if the node does not exist.
	 */
	markDirty(id: string): void {
		if (!this.parents.has(id)) {
			throw new Error(`Node "${id}" does not exist`);
		}
		this.markDirtyRecursive(id);
	}

	private markDirtyRecursive(id: string): void {
		if (this.dirty.has(id)) return;
		this.dirty.add(id);
		for (const cid of this.children.get(id) ?? []) {
			this.markDirtyRecursive(cid);
		}
	}

	/**
	 * Return dirty node IDs in topological order (parents before children).
	 * Clears the dirty set after returning.
	 * Uses Kahn's algorithm on the dirty subgraph.
	 */
	getDirtyInOrder(): string[] {
		if (this.dirty.size === 0) return [];

		// Snapshot the dirty set (defensive against mutation during iteration)
		const dirtyIds = new Set(this.dirty);

		const inDegree = new Map<string, number>();
		for (const id of dirtyIds) {
			let count = 0;
			for (const pid of this.parents.get(id) ?? []) {
				if (dirtyIds.has(pid)) count++;
			}
			inDegree.set(id, count);
		}

		const queue: string[] = [];
		for (const [id, deg] of inDegree) {
			if (deg === 0) queue.push(id);
		}

		const sorted: string[] = [];
		while (queue.length > 0) {
			const id = queue.shift()!;
			sorted.push(id);
			for (const cid of this.children.get(id) ?? []) {
				if (!dirtyIds.has(cid)) continue;
				const newDeg = inDegree.get(cid)! - 1;
				inDegree.set(cid, newDeg);
				if (newDeg === 0) queue.push(cid);
			}
		}

		this.dirty.clear();
		return sorted;
	}

	getParents(id: string): readonly string[] {
		return this.parents.get(id) ?? [];
	}

	getChildren(id: string): readonly string[] {
		return [...(this.children.get(id) ?? [])];
	}

	hasNode(id: string): boolean {
		return this.parents.has(id);
	}

	get size(): number {
		return this.parents.size;
	}

	get nodeIds(): string[] {
		return [...this.parents.keys()];
	}
}
